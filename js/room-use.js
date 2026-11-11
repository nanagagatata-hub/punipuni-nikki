// おへや：家具を使うときの立ち位置と、すべりだい・ぼーる の専用の動き（DOM に触れない純粋なロジック）
// 設計書：docs/superpowers/specs/2026-11-11-oheya-stage4-furniture-play-design.md §3.1・§3.2・§3.4・§3.5
// 座標は Brain と同じ（マスの中心は i+0.5）。stand は整数のマス、at と動きの x,y は実数。
// room-ai.js はこのモジュールを import しない（循環させない）。
import {ITEMS,USES,has} from './room-data.js';
import {footprint,blockedCells,homeFor} from './room-edit.js';
import {makeGrid,passable,dirYaw} from './room-ai.js';

/** @typedef {import('./room-data.js').Room} Room */
/** @typedef {import('./room-data.js').Placed} Placed */
/** 家具を使うときの場所。index＝room.items の番号、stand＝歩いて行くマス、at＝使っている間の位置（実数）、
 * lift＝持ち上げる高さ(px)、face＝向き（度。dirYaw と同じ決まり）、act・spot＝USES の値、
 * end＝すべりだい の着地マス（ほかは null）。すべりだい の at は台の上の点（slideMotion が家具の位置と向きを読む）
 * @typedef {{index:number,id:string,stand:{x:number,y:number},at:{x:number,y:number},lift:number,face:number,
 *   act:string,spot:string,end:{x:number,y:number}|null}} Spot */

/** すべりだい・ぼーる の動きの秒数 */
export const SLIDE_T=4, BALL_T=2.5;

/** すべりだい の形（room-art-c.js の slide() と同じ値）。台の上の gy・すべる面の始まりと終わりの gy・台の高さ(px)・下のはしの高さ(px) */
const SL={top:.33,from:.62,to:1.95,hi:62,lo:6,edge:.15}; // edge＝すべり始めのうち 台の上を進む割合
/** ぼーる：ころがす長さ（マス）と、絵の半径（マス。回転の量に使う） */
const BALL_GO=.6, BALL_R=.59;

/** 足あとの 4 辺に接するマス。辺ごとに、足あとへ向かう向き (nx,ny) をつける。
 * 順番は +gy 側 → +gx 側 → −gy 側 → −gx 側（ぷにの位置は使わず決定的にする）
 * @param {Placed} p @param {{w:number,h:number}} f */
function sides(p,f){
  const col=(len,cell,nx,ny)=>Array.from({length:len},(_,i)=>({...cell(i),nx,ny}));
  return {
    gy:col(f.w,i=>({x:p.x+i,y:p.y+f.h}),0,-1),
    gx:col(f.h,i=>({x:p.x+f.w,y:p.y+i}),-1,0),
    ngy:col(f.w,i=>({x:p.x+i,y:p.y-1}),0,1),
    ngx:col(f.h,i=>({x:p.x-1,y:p.y+i}),1,0),
  };
}

/** 列を「真ん中に近い順」に並べる（同じ近さなら番号の大きいほう＝画面の手前を先に） */
function middleFirst(cells){
  const c=(cells.length-1)/2;
  return cells.map((v,i)=>({v,i})).sort((a,b)=>Math.abs(a.i-c)-Math.abs(b.i-c)||b.i-a.i).map(o=>o.v);
}

/** 正面の列（front と r で決める）→ 4 辺の順、の中で最初の通れるマス。無ければ null */
function frontCell(grid,S,frontKey){
  const order=frontKey?[...middleFirst(S[frontKey]),...S.gy,...S.gx,...S.ngy,...S.ngx]:[...S.gy,...S.gx,...S.ngy,...S.ngx];
  return order.find(c=>passable(grid,c.x,c.y))||null;
}

/** 正面の辺。USES の front（省略時 gy）を、r が奇数なら入れ替える */
const frontSide=(u,r)=>((u.front==='gx')!==(r%2===1))?'gx':'gy';

const cell=c=>({x:c.x,y:c.y});
const mid=c=>({x:c.x+.5,y:c.y+.5});
/** a→b を u（0〜1）で。u=0 で a、u=1 で b ちょうど */
const lerp=(a,b,u)=>a*(1-u)+b*u;
const clamp01=v=>Math.min(1,Math.max(0,v));

/** すべりだい の家具の中の点。u＝はば方向、v＝長さ方向（r が奇数なら gx と gy を入れ替える） */
const slideAxis=(p,r)=>(u,v)=>r%2?{x:p.x+v,y:p.y+u}:{x:p.x+u,y:p.y+v};

/** 家具を使うときの場所。index が範囲外・USES に無い ID・どこにも立てないなら null
 * @param {Room} room @param {number} index @returns {Spot|null} */
export function useSpot(room,index){
  if(!room||!Array.isArray(room.items)||!Number.isInteger(index)||index<0||index>=room.items.length)return null;
  const p=room.items[index];
  if(!p||!has(USES,p.id))return null;
  const f=footprint(p.id,p.r);
  if(!f)return null;
  const u=USES[p.id],grid=makeGrid(room.n,blockedCells(room)),S=sides(p,f);
  const center={x:p.x+f.w/2,y:p.y+f.h/2};
  const toward=c=>dirYaw(center.x-(c.x+.5),center.y-(c.y+.5));
  const base={index,id:p.id,act:u.act,spot:u.spot,end:null};

  if(u.act==='slide'){
    // はしご（r=0 で +gx 面・台の側 gy=y）のマスに立つ。ふさがれていれば 4 辺の順
    const L=slideAxis(p,p.r),lad=L(1,0);
    const s=passable(grid,lad.x,lad.y)?lad:frontCell(grid,S,null);
    if(!s)return null;
    const land=L(0,2);
    const end=passable(grid,land.x,land.y)?land:cell(s);
    return {...base,stand:cell(s),at:L(.5,SL.top),lift:SL.hi,face:toward(s),end};
  }
  if(u.spot==='on'&&ITEMS[p.id].walk){
    // 上を歩ける：足あとの中の通れるマスで x+y が最大（いちばん手前）
    let best=null;
    for(let dy=0;dy<f.h;dy++)for(let dx=0;dx<f.w;dx++){
      const x=p.x+dx,y=p.y+dy;
      if(passable(grid,x,y)&&(!best||x+y>best.x+best.y))best={x,y};
    }
    if(!best)return null;
    return {...base,stand:best,at:mid(best),lift:u.seat,face:0};
  }
  if(u.spot==='side'){
    const s=frontCell(grid,S,null);
    return s?{...base,stand:cell(s),at:mid(s),lift:0,face:toward(s)}:null;
  }
  const s=frontCell(grid,S,frontSide(u,p.r));
  if(!s)return null;
  if(u.spot==='on')return {...base,stand:cell(s),at:center,lift:u.seat,face:0};
  if(u.spot==='in'){
    // 入口から足あとの方へ 0.4 マス入る。のぞく ときは こちら（正面）を向く
    const m=mid(s);
    return {...base,stand:cell(s),at:{x:m.x+s.nx*.4,y:m.y+s.ny*.4},lift:u.seat,face:0};
  }
  return {...base,stand:cell(s),at:mid(s),lift:0,face:toward(s)};
}

/** 部屋の家具のうち、使える場所があるもの（置いた順）
 * @param {Room} room @returns {Spot[]} */
export function roomUses(room){
  if(!room||!Array.isArray(room.items))return [];
  const out=[];
  for(let i=0;i<room.items.length;i++){const s=useSpot(room,i);if(s)out.push(s);}
  return out;
}

/** USES の重み w で 1 つ選ぶ。重みの合計が 0 なら null
 * @param {Spot[]} uses @param {() => number} rng @returns {Spot|null} */
export function pickUse(uses,rng){
  const w=s=>has(USES,s.id)?USES[s.id].w:0;
  const total=uses.reduce((a,s)=>a+w(s),0);
  if(!(total>0))return null;
  let r=rng()*total;
  for(const s of uses){
    const k=w(s);
    if(k<=0)continue;
    if(r<k)return s;
    r-=k;
  }
  // 丸めのずれで抜けたときは、重みのある最後のもの
  for(let i=uses.length-1;i>=0;i--)if(w(uses[i])>0)return uses[i];
  return null;
}

/** ねんねの場所。最初の べっど（act が sleep の家具）に立てれば その stand、無ければ homeFor
 * @param {Room} room @returns {{home:{x:number,y:number},bed:Spot|null}} */
export function homeWithBed(room){
  const i=room.items.findIndex(p=>has(USES,p.id)&&USES[p.id].act==='sleep');
  const bed=i<0?null:useSpot(room,i);
  return bed?{home:{...bed.stand},bed}:{home:homeFor(room),bed:null};
}

/** すべりだい の動き（経過秒 t → 位置・高さ）。0–1.5 秒 のぼる → 2.0 秒まで 台の上 → 3.5 秒まで すべる → 4.0 秒 着地
 * spot は useSpot の すべりだい（at から家具の位置と向きを読む）
 * @param {Spot} spot @param {number} t @returns {{x:number,y:number,lift:number,done:boolean,end:{x:number,y:number}}} */
export function slideMotion(spot,t){
  const L=slideFrom(spot.at), end=spot.end||spot.stand;
  const e=mid(end);
  if(!(t<SLIDE_T))return {x:e.x,y:e.y,lift:0,done:true,end:{...end}};
  const tt=Math.max(0,t)||0, s=mid(spot.stand);
  const top=L(.5,SL.top), a=L(.5,SL.from), b=L(.5,SL.to);
  const at=(P,Q,u)=>({x:lerp(P.x,Q.x,u),y:lerp(P.y,Q.y,u)});
  let pos,lift;
  if(tt<1.5){const u=tt/1.5;pos=at(s,top,u);lift=lerp(0,SL.hi,u);}
  else if(tt<2){pos=top;lift=SL.hi;}
  else if(tt<3.5){
    // はじめの 0.225 秒は 台の上を すべる面の始まりまで進み（とばないように）、
    // そのあと すべる面にそって降りる。高さは絵と同じ曲がり方（はじめ急・さいごは ほぼ平ら）
    const u=(tt-2)/1.5;
    if(u<SL.edge){pos=at(top,a,u/SL.edge);lift=SL.hi;}
    else{const v=(u-SL.edge)/(1-SL.edge);pos=at(a,b,v);lift=SL.lo+(SL.hi-SL.lo)*Math.pow(1-v,1.7);}
  }else{
    // 着地して ぴょん
    const u=(tt-3.5)/.5;pos=at(b,e,u);lift=lerp(SL.lo,0,u)+Math.sin(Math.PI*u)*10;
  }
  return {x:pos.x,y:pos.y,lift,done:false,end:{...end}};
}

/** すべりだい の at（台の上＝slideAxis(.5, SL.top)）から、家具の (x,y) と向きを読み戻して slideAxis を作る。
 * r が偶数なら at.x の端数が .5、奇数なら at.y の端数が .5 */
function slideFrom(at){
  const odd=Math.abs(at.y-Math.floor(at.y)-.5)<1e-6&&Math.abs(at.x-Math.floor(at.x)-.5)>1e-6;
  const p=odd?{x:Math.round(at.x-SL.top),y:Math.round(at.y-.5)}:{x:Math.round(at.x-.5),y:Math.round(at.y-SL.top)};
  return slideAxis(p,odd?1:0);
}

/** ぼーる の絵のずれ（経過秒 t。dir の向きへ BALL_GO マス ころがって戻る）。dx,dy はマス、rot はラジアン
 * @param {number} t @param {{dx:number,dy:number}} dir @returns {{dx:number,dy:number,rot:number,done:boolean}} */
export function ballMotion(t,dir){
  if(!(t<BALL_T))return {dx:0,dy:0,rot:0,done:true};
  const u=clamp01((Number.isFinite(t)?t:0)/BALL_T);
  const len=Math.hypot(dir.dx,dir.dy);
  if(!(len>0))return {dx:0,dy:0,rot:0,done:false};
  const d=BALL_GO*Math.sin(Math.PI*u);   // 0 → 0.6 → 0（行きも帰りも なめらか）
  const ux=dir.dx/len, uy=dir.dy/len;
  // 画面で右へ（gx−gy が増える）ころがるときは時計まわり
  const sgn=Math.sign(ux-uy)||1;
  return {dx:d*ux,dy:d*uy,rot:sgn*d/BALL_R,done:false};
}
