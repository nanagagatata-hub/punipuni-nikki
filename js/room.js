// おへや：投影・深度ソート・夜の暗さ・当たり判定・絵のキャッシュ（DOM に触れない純関数。import しただけで Node でも読める）
// 設計書：docs/superpowers/specs/2026-11-10-oheya-stage0-1-design.md §3.1・§3.4・§3.5、
//         docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md §7（部屋の状態から描く）
//         docs/superpowers/specs/2026-11-11-oheya-stage4-furniture-play-design.md §4.3・§5・§6（家具を使う・タップ・らんぷ）
import {TILE_W,TILE_H,WALL_H,roomSVG,itemSVG,lampOffSVG} from './room-art.js';
import {normDeg,mulberry32,between,makeGrid,createBrain,stepBrain,holdBrain,pauseBrain,relocateBrain,motion,goUse,goTo} from './room-ai.js';
import {ITEMS,USES,SIZES,has,defaultRoom} from './room-data.js';
import {footprint,blockedCells,nearestFree} from './room-edit.js';
import {useSpot,roomUses,homeWithBed,slideMotion,ballMotion} from './room-use.js';
import {fxSVG,wiggleScale,starBurst,addBurst,glowLevel,pickLights} from './room-fx.js';
import {petSVG} from './art.js';
import {FORMS} from './data.js';

/** マス座標 → 部屋の SVG と同じ座標系
 * @param {number} gx @param {number} gy @param {number} n
 * @returns {{x:number,y:number}} */
export function toScreen(gx,gy,n){
  return {x:n*TILE_W/2+(gx-gy)*TILE_W/2, y:WALL_H+(gx+gy)*TILE_H/2};
}

/** toScreen の逆変換
 * @param {number} x @param {number} y @param {number} n
 * @returns {{gx:number,gy:number}} */
export function fromScreen(x,y,n){
  const a=(x-n*TILE_W/2)/(TILE_W/2), b=(y-WALL_H)/(TILE_H/2); // a=gx-gy, b=gx+gy
  return {gx:(a+b)/2, gy:(b-a)/2};
}

/** 奥（x+y が小さい）から手前へ。同じなら x 昇順。新しい配列を返す
 * @template {{x:number,y:number}} T
 * @param {T[]} list @returns {T[]} */
export function sortByDepth(list){
  return list.slice().sort((p,q)=>(p.x+p.y)-(q.x+q.y)||p.x-q.x);
}

/** 画面の点（CSS px）→ マス。部屋の外・おかしな値は null
 * @param {number} px @param {number} py 点 @param {number} ox @param {number} oy 部屋の左上 @param {number} s 倍率 @param {number} n
 * @returns {{x:number,y:number}|null} */
export function cellAt(px,py,ox,oy,s,n){
  if(!(s>0))return null;
  const g=fromScreen((px-ox)/s,(py-oy)/s,n);
  const x=Math.floor(g.gx),y=Math.floor(g.gy);
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=n||y>=n)return null;
  return {x,y};
}

/** 描く順：平たいもの（ラグ）を奥から → 立っている家具とぷにを奥から（sortByDepth）。新しい配列を返す
 * 家具の位置は足あとの中心。足あとが 2×2 までなら中心の和でぷにとの前後が正しく決まる
 * @template {{x:number,y:number,flat?:boolean}} T
 * @param {T[]} list @returns {T[]} */
export function sortForDraw(list){
  return [...sortByDepth(list.filter(e=>e.flat)),...sortByDepth(list.filter(e=>!e.flat))];
}

/** sortForDraw の結果のうち、もようがえのマスを入れる位置（＝最初の立っているもの。なければ末尾）
 * @param {{flat?:boolean}[]} sorted @returns {number} */
export function maskSlot(sorted){
  const i=sorted.findIndex(e=>!e.flat);
  return i<0?sorted.length:i;
}

/** もようがえ：押した点（部屋の SVG と同じ座標）に見えている家具の番号。無ければ -1
 * 形は「足あとのひし形を、絵の高さ ay だけ上へのばした六角形」（平たいものは ひし形だけ）。重なれば手前（あとから描く方）
 * @param {number} px @param {number} py
 * @param {{i:number,x:number,y:number,w:number,h:number,ay:number,flat:boolean}[]} list
 * @param {number} n @returns {number} */
export function pickItem(px,py,list,n){
  if(!Number.isFinite(px)||!Number.isFinite(py)||!Array.isArray(list))return -1;
  const order=sortForDraw(list.map(e=>({x:e.x+e.w/2,y:e.y+e.h/2,flat:!!e.flat,e})));
  for(let k=order.length-1;k>=0;k--){
    const e=order[k].e,H=e.flat?0:Math.max(0,+e.ay||0);
    const T=toScreen(e.x,e.y,n),R=toScreen(e.x+e.w,e.y,n),B=toScreen(e.x+e.w,e.y+e.h,n),L=toScreen(e.x,e.y+e.h,n);
    if(inPoly(px,py,[[L.x,L.y-H],[T.x,T.y-H],[R.x,R.y-H],[R.x,R.y],[B.x,B.y],[L.x,L.y]]))return e.i;
  }
  return -1;
}
function inPoly(x,y,P){
  let inside=false;
  for(let a=0,b=P.length-1;a<P.length;b=a++){
    const [xa,ya]=P[a],[xb,yb]=P[b];
    if((ya>y)!==(yb>y)&&x<(xb-xa)*(y-ya)/(yb-ya)+xa)inside=!inside;
  }
  return inside;
}

/** 時間帯ごとの夜の暗さ（0〜1） */
export const NIGHT={asa:0,hiru:0,yuu:0.10,yoru:0.42};
export const NIGHT_COLOR='#1E2350';

/** cur を target へなめらかに近づける（行き過ぎない）
 * @param {number} cur @param {number} target @param {number} dt 秒 @param {number} [tau] */
export function approach(cur,target,dt,tau=2){
  return target+(cur-target)*Math.exp(-dt/tau);
}

/** 部屋全体が w×h に収まる最大倍率
 * @param {number} w @param {number} h @param {number} n */
export function fitScale(w,h,n){
  return Math.min(w/(n*TILE_W), h/(n*TILE_H+WALL_H));
}

/** 部屋の倍率と左上（CSS px）。縦も横も真ん中に置く（縦向きの iPad で上が空かないように）
 * @param {number} w @param {number} h @param {number} n @returns {{s:number,ox:number,oy:number}} */
export function fitOffset(w,h,n){
  const s=fitScale(w,h,n);
  return {s:s,ox:(w-n*TILE_W*s)/2,oy:(h-(n*TILE_H+WALL_H)*s)/2};
}

/** ぷにの当たり判定の箱（CSS px）。中心 cx・絵の下端 bottom（箱は絵の真ん中に重ねる）、箱 0..boxW×0..boxH に収める
 * @param {number} cx @param {number} bottom @param {number} sprite
 * @param {number} boxW @param {number} boxH
 * @returns {{left:number,top:number,size:number}} */
export function petBox(cx,bottom,sprite,boxW,boxH){
  const size=Math.min(Math.max(96,sprite*1.3),boxW,boxH);
  const left=Math.min(Math.max(cx-size/2,0),boxW-size);
  const top=Math.min(Math.max(bottom+(size-sprite)/2-size,0),boxH-size); // 箱の真ん中を絵の真ん中に合わせる
  return {left,top,size};
}

/** 向き（度）を 360/n 度ごとに丸める。-180 以上 180 未満
 * @param {number} deg @param {number} [n] */
export function yawBucket(deg,n=24){
  const step=360/n;
  return normDeg(Math.round(deg/step)*step);
}

/** Canvas を 0×0 にしてメモリを返す（iPad Safari は GC まで Canvas のメモリを数え、上限で getContext が null になる）。null は何もしない
 * @param {{width:number,height:number}|null|undefined} c */
export function freeCv(c){
  if(c){c.width=0;c.height=0;}
}

/** 家具の絵のうち keep に無い id を捨てる（読み込み失敗の通知 onerror を先に外す）
 * @param {Map<string,{img:{onerror:any}}>} arts @param {Set<string>} keep */
export function pruneArts(arts,keep){
  for(const [id,a] of arts){
    if(keep.has(id))continue;
    if(a&&a.img)a.img.onerror=null;
    arts.delete(id);
  }
}

/** SVG 文字列から画像を作る関数を返す。空（絵が作れない）なら fail を呼んで使えない絵を返す
 * @param {()=>void} fail @param {(svg:string)=>any} mk */
export function spriteMaker(fail,mk){
  return svg=>{if(!svg){fail();return {complete:true,naturalWidth:0};}return mk(svg);};
}

/** SVG→画像のキャッシュ。読み込み中は前回 ready だった画像を返す。max 超過で最も古く使ったものを捨てる
 * @typedef {{complete:boolean, naturalWidth:number}} Img */
export class SpriteCache{
  /** @param {number} [max] @param {(svg:string)=>Img} [make] */
  constructor(max=120,make){
    this.max=max; this.make=make; this.map=new Map(); this.last=null;
  }
  /** @param {string} key @param {()=>string} svg 未登録のときだけ呼ぶ
   * @returns {Img|null} */
  get(key,svg){
    let img=this.map.get(key);
    if(img)this.map.delete(key); // 使った順に並べ直す
    else img=this.make(svg());
    this.map.set(key,img);
    if(this.map.size>this.max)this.map.delete(this.map.keys().next().value);
    if(img.complete&&img.naturalWidth>0){this.last=img;return img;}
    return this.last;
  }
}


// ================= DOM 部分（mount 以降。import しただけでは DOM に触れない）=================
/** @typedef {import('./room-data.js').Room} Room */
/** @type {any} */
let R=null; // 動いているおへやの状態（無ければ null）

// もようがえの表示（設計書 §7 の setEdit）
const EDIT_FADE=0.55, EDIT_SEL='#FFD84D', EDIT_OK='#7BD8A0', EDIT_NG='#FF9AA8', EDIT_MASK=0.45;
// らんぷの光（部屋の SVG の px）：半径・昼の半径・かさの高さ（足もとから上へ）・点灯の速さ（approach の tau。約 1 秒）・数
const GLOW_R=80, GLOW_DAY_R=20, GLOW_UP=85, LAMP_TAU=0.3, LAMP_MAX=6, WARM='255,217,160';
// 頭の上の絵・★ の大きさ（px）
const FX_S=20, STAR_S=14;
const TAU=Math.PI*2;

const makeImg=svg=>{const im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);return im;};
const usable=im=>!!im&&im.complete&&im.naturalWidth>0;
/** petSVG は xmlns が無く属性が重複する顔があるので、HTML として読んで XML に書き出す（段階0）。失敗なら '' */
function toXML(svg){
  try{
    const el=new DOMParser().parseFromString(svg,'text/html').body.firstElementChild;
    return el?new XMLSerializer().serializeToString(el):'';
  }catch(e){return '';}
}
/** 描ける部屋か（中身は cleanRoom 済みの前提。形だけ確かめる） @returns {Room|null} */
const okRoom=room=>room&&typeof room==='object'&&SIZES.includes(room.n)&&Array.isArray(room.items)?room:null;

/** 部屋を sceneEl に出す。Canvas が使えなければ false。画像の読み込み失敗は opt.onFail（呼ぶ前に unmount する）
 * @param {HTMLElement} sceneEl @param {HTMLElement} petBtn
 * opt.onUse(id)＝ぷにが家具を使い始めたコマで 1 回
 * @param {{room:Room,reduced?:boolean,onFail?:()=>void,onUse?:(id:string)=>void}} opt @returns {boolean} */
export function mount(sceneEl,petBtn,opt){
  if(R)unmount();
  opt=opt||{};
  const room=okRoom(opt.room)||defaultRoom();
  let cv=null,ctx=null;
  try{
    cv=document.createElement('canvas');
    ctx=cv.getContext('2d');
  }catch(e){ctx=null;}
  if(!ctx){freeCv(cv);return false;}
  const mq=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
  const r=R={
    sceneEl,petBtn,opt,n:room.n,cv,ctx,mq,rng:mulberry32(Date.now()>>>0),
    room:null,grid:null,home:{x:0,y:0},placed:[],arts:new Map(),
    dpr:1,cssW:0,cssH:0,k:1,s:1,ox:0,oy:0,
    sprites:new SpriteCache(120,spriteMaker(()=>r.fail(),svg=>{const im=makeImg(svg);im.onerror=()=>r.fail();return im;})),
    bgImgs:{},bgKey:'',bgCur:null,bgOld:null,bgCurBand:null,fade:1,
    edit:null,cellCb:null,layer:null,
    // 家具であそぶ：使える家具・べっど・らんぷ（消えている番号・点灯 0..1）・ぶるんっ（番号→始めた時刻）・★・頭の上の絵
    tapCb:null,uses:[],bed:null,lampOff:new Set(),lampOn:new Map(),lampOffArt:null,lampOffImg:null,shade:null,
    wig:new Map(),bursts:[],fxImgs:new Map(),useNow:null,red:false,
    view:null,mode:'awake',band:'hiru',brain:null,dark:0,darkTarget:0,first:true,
    clock:0,lastDraw:0,lastT:0,raf:0,pokeAt:-9,spinAt:-9,lastAct:'',lastPose:'',
    box:{l:-1,t:-1,s:-1},failed:false,handlers:[],ro:null,fail:null
  };
  // 読み込み失敗：止めて Canvas を外し、今の表示に戻してもらう
  r.fail=()=>{if(R!==r||r.failed)return;r.failed=true;const f=opt.onFail;unmount();if(f)f();};
  applyRoom(r,room);
  sceneEl.appendChild(cv);
  const on=(t,type,fn)=>{t.addEventListener(type,fn);r.handlers.push([t,type,fn]);};
  if(typeof ResizeObserver==='function'){r.ro=new ResizeObserver(()=>resize(r));r.ro.observe(sceneEl);}
  else on(window,'resize',()=>resize(r));
  on(document,'visibilitychange',()=>{if(document.hidden)stop(r);else resume(r);});
  on(window,'pageshow',e=>{if(e.persisted)resume(r);});
  on(cv,'contextlost',e=>{e.preventDefault();stop(r);});
  on(cv,'contextrestored',()=>resume(r));
  on(cv,'click',e=>tapCell(r,e));
  resize(r);
  if(!document.hidden)r.raf=requestAnimationFrame(t=>frame(r,t));
  return true;
}

export function unmount(){
  const r=R;if(!r)return;
  R=null;
  cancelAnimationFrame(r.raf);
  if(r.ro)r.ro.disconnect();
  for(const [t,type,fn] of r.handlers)t.removeEventListener(type,fn);
  pruneArts(r.arts,new Set());
  for(const k in r.bgImgs)r.bgImgs[k].onerror=null;
  r.bgImgs={};
  r.sprites.make=svg=>svg?makeImg(svg):{complete:true,naturalWidth:0}; // 以後の失敗通知は不要
  r.cellCb=null;r.tapCb=null;
  // Canvas のメモリをすぐ返す（開け閉めを くりかえしても 上限に届かないように）
  dropBg(r);
  if(r.layer){freeCv(r.layer.cv);r.layer=null;}
  if(r.shade){freeCv(r.shade.cv);r.shade=null;}
  if(r.cv.parentNode)r.cv.parentNode.removeChild(r.cv);
  freeCv(r.cv);
}

/** 部屋（家具・ゆか・かべ・広さ）を入れ替える。mount 前は何もしない
 * @param {Room} room */
export function setRoom(room){
  const r=R,ok=okRoom(room);
  if(!r||!ok)return;
  // 家具の番号がずれるので、らんぷの点灯と ぶるんっ は はじめから
  r.lampOff.clear();r.lampOn.clear();r.wig.clear();
  applyRoom(r,ok);
}

/** もようがえの表示。mask＝placeMask の結果（長さ n*n。1 置ける・2 置けない）、sel＝選んだ家具の番号（無ければ -1）。
 * null で表示なし。mount 前は何もしない
 * @param {{mask:Uint8Array|null,sel:number}|null} edit */
export function setEdit(edit){
  const r=R;if(!r)return;
  if(!edit||typeof edit!=='object'){
    r.edit=null;
    if(r.layer){freeCv(r.layer.cv);r.layer=null;} // 夜の重ね板は もようがえ の間だけ
    return;
  }
  r.edit={mask:edit.mask instanceof Uint8Array?edit.mask:null,sel:Number.isInteger(edit.sel)?edit.sel:-1};
}

/** 部屋を押したときに呼ぶ関数。null で外す。mount 前は何もしない
 * (x,y)＝押した床のマス（床の外なら -1,-1）、hit＝そこに見えている家具の番号（room.items の添字。無ければ -1）。
 * 床の外で家具も無いときは呼ばない
 * @param {((x:number,y:number,hit:number)=>void)|null} cb */
export function onCell(cb){
  if(R)R.cellCb=typeof cb==='function'?cb:null;
}

/** ふだん（もようがえ中でないとき）に部屋を押したときに呼ぶ関数。null で外す。mount 前は何もしない
 * (x,y)・hit は onCell と同じ。(px,py)＝押した点（部屋の SVG の座標）。床の外で家具も無いときは呼ばない
 * @param {((x:number,y:number,hit:number,px:number,py:number)=>void)|null} cb */
export function onTap(cb){
  if(R)R.tapCb=typeof cb==='function'?cb:null;
}

/** ぷにを家具（room.items の番号）へ使いに行かせる。
 * 'none'＝範囲外・USES に無い、'busy'＝起きていない、'far'＝立つ場所・経路が無い
 * @param {number} index @returns {'go'|'busy'|'far'|'none'} */
export function useItem(index){
  const r=R;
  if(!r||!r.brain||!Number.isInteger(index)||index<0||index>=r.room.items.length)return 'none';
  const p=r.room.items[index];
  if(!p||!has(USES,p.id))return 'none';
  if(r.brain.mode!=='awake')return 'busy';
  const spot=r.uses.find(s=>s.index===index)||useSpot(r.room,index);
  if(!spot)return 'far';
  const d=USES[p.id].dur;
  return goUse(r.brain,r.grid,spot,between(r.rng,d[0],d[1]))?'go':'far';
}

/** ぷにを床のマスへ呼ぶ。'busy'＝起きていない、'far'＝通れない・届かない
 * @param {number} x @param {number} y @returns {'go'|'busy'|'far'} */
export function callTo(x,y){
  const r=R;
  if(!r||!r.brain||r.brain.mode!=='awake')return 'busy';
  return goTo(r.brain,r.grid,{x,y})?'go':'far';
}

/** 家具（room.items の番号）を ぶるんっ とゆらす
 * @param {number} index */
export function wiggle(index){
  if(R&&Number.isInteger(index)&&index>=0)R.wig.set(index,R.clock);
}

/** 押した点（部屋の SVG の座標）から ★ を出す
 * @param {number} px @param {number} py */
export function burstAt(px,py){
  if(R&&Number.isFinite(px)&&Number.isFinite(py))R.bursts=addBurst(R.bursts,{x:px,y:py,t:R.clock});
}

/** 見た目の元を覚えるだけ（描くのはループ）
 * @param {{view:any,mode:string,band:string,now:number}} s */
export function update(s){
  const r=R;if(!r||!s)return;
  r.view=s.view||r.view;r.mode=s.mode||r.mode;
  if(NIGHT[s.band]!==undefined)r.band=s.band;
  r.darkTarget=NIGHT[r.band];
  if(r.first){r.first=false;r.dark=r.darkTarget;} // 最初は目標の暗さにそのまま合わせる
  if(!r.brain)r.brain=createBrain(r.n,bctx(r));
  if(!r.raf&&!document.hidden)r.raf=requestAnimationFrame(t=>frame(r,t));
}
/** @param {boolean} on */
export function hold(on){if(R&&R.brain)holdBrain(R.brain,!!on);}
/** @param {number} sec */
export function pauseFor(sec){if(R&&R.brain)pauseBrain(R.brain,sec);}
export function poke(){if(R)R.pokeAt=R.clock;}

const isReduced=r=>!!(r.opt.reduced||(r.mq&&r.mq.matches));
function bctx(r){
  return {mode:r.mode,band:r.band,reduced:isReduced(r),home:r.home,uses:r.uses};
}

/** 部屋の状態から、家具の絵・通れるマス・おうち を作り直し、ぷにを通れるマスへ移す */
function applyRoom(r,room){
  const n=room.n,grown=!!r.room&&r.n!==n;
  r.room=room;r.n=n;
  // 背景は 広さ・ゆか・かべ ごと（変わったら捨てる。新しい絵が読めるまでは前の背景を出しておく）
  const key=n+'|'+room.floor+'|'+room.wall;
  if(key!==r.bgKey){
    for(const k in r.bgImgs)r.bgImgs[k].onerror=null;
    r.bgImgs={};r.bgKey=key;r.bgCurBand=null;
    freeCv(r.bgOld);r.bgOld=null;r.fade=1;
  }
  // 家具の絵は ID ごとに 1 枚
  r.placed=[];
  room.items.forEach((p,i)=>{
    const f=p?footprint(p.id,p.r):null;
    if(!f)return;
    let a=r.arts.get(p.id);
    if(!a){
      const art=itemSVG(p.id),img=makeImg(art.svg);
      img.onerror=()=>r.fail();
      a={art,img};r.arts.set(p.id,a);
    }
    r.placed.push({p,f,a,i,flat:has(ITEMS,p.id)&&!!ITEMS[p.id].flat});
  });
  pruneArts(r.arts,new Set(r.placed.map(o=>o.p.id))); // しまった家具の絵は捨てる
  r.grid=makeGrid(n,blockedCells(room));
  // 使える家具と ねんねの場所（べっど があれば その前）。重いので部屋が変わったときだけ
  r.uses=roomUses(room);
  const hb=homeWithBed(room);
  r.home=hb.home;r.bed=hb.bed;
  const b=r.brain;
  if(b){
    if(b.mode==='egg'||r.mode==='egg')relocateBrain(b,r.grid,r.home,true);
    else relocateBrain(b,r.grid,nearestFree(room,b.x-0.5,b.y-0.5));
  }
  if(grown)resize(r,true);
}

/** Canvas を押した点 → マスと、そこに見えている家具（どちらも無ければ呼ばない） */
function tapCell(r,e){
  if(R!==r||!(r.cellCb||r.tapCb))return;
  const rect=r.cv.getBoundingClientRect();
  const kx=rect.width>0?r.cssW/rect.width:1,ky=rect.height>0?r.cssH/rect.height:1;
  const px=(e.clientX-rect.left)*kx,py=(e.clientY-rect.top)*ky;
  const c=cellAt(px,py,r.ox,r.oy,r.s,r.n);
  const hit=r.s>0?pickItem((px-r.ox)/r.s,(py-r.oy)/r.s,
    r.placed.map(o=>({i:o.i,x:o.p.x,y:o.p.y,w:o.f.w,h:o.f.h,ay:o.a.art.ay,flat:o.flat})),r.n):-1;
  if(!(c||hit>=0))return;
  if(r.cellCb)r.cellCb(c?c.x:-1,c?c.y:-1,hit); // もようがえ中
  else r.tapCb(c?c.x:-1,c?c.y:-1,hit,(px-r.ox)/r.s,(py-r.oy)/r.s);
}

function stop(r){
  cancelAnimationFrame(r.raf);r.raf=0;
  if(r.brain&&r.brain.held)holdBrain(r.brain,false); // 指を離した通知が来なくても固まらない
}
/** 裏から戻った・描画面が復活した：dt を捨て、暗さを目標に合わせ、背景と画像を確かめる（編集表示・onCell はそのまま） */
function resume(r){
  if(R!==r||document.hidden)return;
  stop(r);
  r.lastT=0;r.lastDraw=0;
  r.dark=r.darkTarget;
  dropBg(r);
  if(r.shade)r.shade.key=''; // 板の中身が消えていても描き直す
  const reload=im=>{if(im&&!usable(im)){const src=im.src;im.src='';im.src=src;}};
  for(const a of r.arts.values())reload(a.img);
  for(const k in r.bgImgs)reload(r.bgImgs[k]);
  resize(r,true);
  r.raf=requestAnimationFrame(t=>frame(r,t));
}

function resize(r,force){
  if(R!==r)return;
  const w=r.sceneEl.clientWidth,h=r.sceneEl.clientHeight;
  if(!(w>0&&h>0))return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  if(!force&&w===r.cssW&&h===r.cssH&&dpr===r.dpr)return; // 大きさが変わらないなら何もしない
  r.dpr=dpr;r.cssW=w;r.cssH=h;
  const f=fitOffset(w,h,r.n); // 縦横とも中央
  r.s=f.s;r.k=r.s*dpr;r.ox=f.ox;r.oy=f.oy;
  r.cv.width=Math.round(w*dpr);r.cv.height=Math.round(h*dpr);
  r.cv.style.width=w+'px';r.cv.style.height=h+'px';
  dropBg(r);
  r.box.l=-1; // #pet を置き直す
  if(r.brain&&!document.hidden)try{draw(r,0);}catch(e){} // キャンバスが空のまま 1 コマ待たない
}

/** 背景の Canvas を捨てる（メモリを返してから外す） */
function dropBg(r){
  if(r.bgOld!==r.bgCur)freeCv(r.bgOld);
  freeCv(r.bgCur);
  r.bgCur=null;r.bgOld=null;r.bgCurBand=null;r.fade=1;
}

/** 時間帯の背景を、部屋の大きさに合わせてオフスクリーンに描く。画像が未読込なら null */
function buildBg(r,band){
  let im=r.bgImgs[band];
  if(!im){im=makeImg(roomSVG(r.n,band,r.room.floor,r.room.wall));im.onerror=()=>r.fail();r.bgImgs[band]=im;}
  if(!usable(im))return null;
  const c=document.createElement('canvas');
  c.width=r.cv.width;c.height=r.cv.height;
  c.getContext('2d').drawImage(im,r.ox*r.dpr,r.oy*r.dpr,r.n*TILE_W*r.k,(r.n*TILE_H+WALL_H)*r.k);
  return c;
}

function frame(r,t){
  if(R!==r)return;
  r.raf=0;
  if(document.hidden)return;
  r.raf=requestAnimationFrame(t2=>frame(r,t2));
  const sleeping=r.brain&&r.brain.act==='sleep'&&!r.bursts.length&&!r.wig.size; // ★・ぶるんっ の間は 30fps
  if(r.lastDraw&&t-r.lastDraw<(sleeping?100:33)-2)return;
  const dt=r.lastT?Math.min(Math.max((t-r.lastT)/1000,0),0.1):0;
  r.lastT=t;r.lastDraw=t;
  r.clock+=dt;
  try{draw(r,dt);}catch(e){/* 1 コマ失敗しても止めない */}
}

function draw(r,dt){
  const {ctx,cv}=r;
  if(!r.brain||!(r.cssW>0))return;
  stepBrain(r.brain,dt,bctx(r),r.grid,r.rng);
  r.red=isReduced(r);
  const bu=r.brain.act==='use'?r.brain.use:null;
  if(bu&&bu!==r.useNow)startUse(r,bu.spot);
  r.useNow=bu;
  for(const [i,t0] of r.wig)if(!(r.clock-t0<0.4))r.wig.delete(i);
  r.bursts=r.bursts.filter(s=>r.clock-s.t<0.6);
  r.dark=approach(r.dark,r.darkTarget,dt);
  const lights=lampLights(r,dt);
  // 背景：時間帯が変わったら古い背景を 3 秒でフェードアウト（ゆか・かべ・広さが変わったときは すぐ入れ替える）
  if(r.bgCurBand!==r.band||!r.bgCur){
    const nb=buildBg(r,r.band);
    if(nb){
      if(r.bgCur&&r.bgCurBand!==null&&r.bgCurBand!==r.band){freeCv(r.bgOld);r.bgOld=r.bgCur;r.fade=0;}
      else freeCv(r.bgCur); // フェードしない入れ替え：前の背景は もう使わない
      r.bgCur=nb;r.bgCurBand=r.band;
    }
  }
  if(r.fade<1){r.fade=Math.min(1,r.fade+dt/3);if(r.fade>=1){freeCv(r.bgOld);r.bgOld=null;}}
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalAlpha=1;
  ctx.clearRect(0,0,cv.width,cv.height);
  if(r.bgCur)ctx.drawImage(r.bgCur,0,0);
  if(r.bgOld){ctx.globalAlpha=1-r.fade;ctx.drawImage(r.bgOld,0,0);ctx.globalAlpha=1;}
  // 物：平たい家具 →（もようがえのマス）→ 立っている家具とぷに を奥から手前へ
  const b=r.brain,ed=r.edit;
  const v=r.view||{form:'puni',face:'normal',arms:'',think:null,pose:'none',shiny:false,final:false,pts:0};
  const list=r.placed.map(o=>({x:o.p.x+o.f.w/2,y:o.p.y+o.f.h/2,flat:o.flat,o}));
  // ぷに：使っている家具の上（on・in・べっど）なら その家具と同じ深さで直後（同じ値は並べ替えで順が変わらない）
  const pp=petPlace(r,b),on=pp.after>=0?list.find(e=>e.o.i===pp.after&&!e.flat):null;
  list.push(on?{x:on.x,y:on.y,pet:true}:{x:pp.x,y:pp.y,pet:true});
  ctx.setTransform(r.k,0,0,r.k,r.ox*r.dpr,r.oy*r.dpr);
  let petX=0,petY=0;
  const one=e=>{
    if(e.pet){
      const p=toScreen(pp.x,pp.y,r.n);
      petX=p.x;petY=p.y-pp.lift;
      drawPet(r,v,p.x,p.y,pp.lift,pp.clip);
    }else drawItem(r,e.o,ed&&!e.flat&&e.o.i!==ed.sel?EDIT_FADE:1);
  };
  // 立っている家具とぷに（ぷには必ずこちら）→ 頭の上の絵
  const rest=()=>{for(let i=cut;i<sorted.length;i++)one(sorted[i]);if(bu)drawFx(r,bu,petX,petY);};
  const sorted=sortForDraw(list),cut=maskSlot(sorted),night=r.dark>0.001;
  for(let i=0;i<cut;i++)one(sorted[i]);
  if(ed&&ed.mask&&night){
    // 夜のもようがえ：ゆか・ラグを暗くしてからマスを明るいまま描き、
    // 立っている家具とぷには別の板で暗くしてから重ねる（見た目の前後は昼と同じ）
    shade(r,ctx,lights);
    ctx.setTransform(r.k,0,0,r.k,r.ox*r.dpr,r.oy*r.dpr);
    drawMask(r,ed.mask);
    if(cut<sorted.length){
      const lc=layerCtx(r,'layer');
      if(lc){
        lc.setTransform(1,0,0,1,0,0);lc.globalAlpha=1;lc.globalCompositeOperation='source-over';
        lc.clearRect(0,0,cv.width,cv.height);
        lc.setTransform(r.k,0,0,r.k,r.ox*r.dpr,r.oy*r.dpr);
        r.ctx=lc;
        try{rest();}finally{r.ctx=ctx;}
        lc.globalCompositeOperation='source-atop'; // 描いたところだけ暗くする
        shade(r,lc,lights);
        lc.globalCompositeOperation='source-over';
        ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(lc.canvas,0,0);
      }else rest();
    }
  }else{
    if(ed&&ed.mask)drawMask(r,ed.mask);
    rest();
    // 夜の暗さ（らんぷのまわりは抜く）
    if(night)shade(r,ctx,lights);
  }
  warmLights(r,lights);
  drawBursts(r);
  // 選んだ家具の足あと（暗くしたあとに、いちばん上へ）
  if(ed&&ed.sel>=0){
    const o=r.placed.find(q=>q.i===ed.sel);
    if(o){
      ctx.setTransform(r.k,0,0,r.k,r.ox*r.dpr,r.oy*r.dpr);
      ctx.lineJoin='round';
      diamond(r,o.p.x,o.p.y,o.f.w,o.f.h,0);
      ctx.strokeStyle='rgba(120,80,100,.45)';ctx.lineWidth=6;ctx.stroke();
      ctx.strokeStyle=EDIT_SEL;ctx.lineWidth=3.5;ctx.stroke();
    }
  }
  // #pet をぷにに重ねる（変わったときだけ）
  const bx=petBox(r.ox+petX*r.s,r.oy+(petY+6)*r.s,TILE_W*r.s,r.cssW,r.cssH);
  const L=Math.round(bx.left),T=Math.round(bx.top),S=Math.round(bx.size);
  if(L!==r.box.l||T!==r.box.t||S!==r.box.s){
    r.box.l=L;r.box.t=T;r.box.s=S;
    const st=r.petBtn.style;
    st.left=L+'px';st.top=T+'px';st.width=S+'px';st.height=S+'px';
  }
}

/** 画面全体に夜の色を重ねる */
function darken(c,cv,a){
  c.setTransform(1,0,0,1,0,0);
  c.globalAlpha=a;c.fillStyle=NIGHT_COLOR;c.fillRect(0,0,cv.width,cv.height);
  c.globalAlpha=1;
}

/** 重ね板（メインと同じ大きさ。作れなければ null）。key＝'layer'（夜のもようがえ）・'shade'（らんぷで抜いた暗さ） */
function layerCtx(r,key){
  const w=r.cv.width,h=r.cv.height;
  let L=r[key];
  if(!L){
    try{const c=document.createElement('canvas');L=r[key]={cv:c,ctx:c.getContext('2d')};}catch(e){return null;}
    if(!L.ctx){r[key]=null;return null;}
  }
  if(L.cv.width!==w||L.cv.height!==h){L.cv.width=w;L.cv.height=h;}
  return L.ctx;
}

// ---- 家具であそぶ・らんぷ・★ ----

/** ぷにが家具を使い始めたコマ：らんぷ なら点灯を切り替え、opt.onUse に知らせる */
function startUse(r,spot){
  if(spot.act==='lamp'){
    if(r.lampOff.has(spot.index))r.lampOff.delete(spot.index);else r.lampOff.add(spot.index);
  }
  const f=r.opt.onUse;
  if(typeof f==='function')try{f(spot.id);}catch(e){}
}

/** ぷにを描く位置（マス座標）・持ち上げ（px）・直後に描く家具の番号（無ければ -1）・てんと の clip */
function petPlace(r,b){
  const u=b.act==='use'?b.use:null;
  if(u){
    const s=u.spot;
    if(s.act==='slide'){const m=slideMotion(s,u.t);return {x:m.x,y:m.y,lift:m.lift,after:m.lift>0?s.index:-1,clip:false};}
    if(s.act==='kick')return {x:b.x,y:b.y,lift:0,after:-1,clip:false};
    const on=s.spot==='on'||s.spot==='in';
    return {x:s.at.x,y:s.at.y,lift:s.lift,after:on?s.index:-1,clip:s.spot==='in'};
  }
  const h=r.home,bed=r.bed;
  if(b.act==='sleep'&&bed&&Math.abs(b.x-h.x-0.5)<1e-6&&Math.abs(b.y-h.y-0.5)<1e-6)
    return {x:bed.at.x,y:bed.at.y,lift:bed.lift,after:bed.index,clip:false};
  return {x:b.x,y:b.y,lift:0,after:-1,clip:false};
}

/** 使っている間の小さな動き（すわる＝ゆらゆら、あそぶ＝ぴょん、ぎゅー＝家具のほうへ かたむく）。動きを減らすときは半分 */
function useMotion(m,u,red){
  const k=red?0.5:1,t=u.t;
  switch(u.spot.act){
    case 'sit': m.tilt=0.05*k*Math.sin(TAU*t/2.4);break;
    case 'play':{const p=(t%0.8)/0.8;m.lift=0.2*k*4*p*(1-p);break;}
    case 'hug': m.tilt=0.12*k*Math.sign(Math.sin(u.spot.face*Math.PI/180));break; // 向きの sin＞0 は画面の右
  }
}

/** 頭の上の絵（kind ごとに 1 枚。読めなければ描かない。r.fail は呼ばない） */
function fxImg(r,kind){
  let im=r.fxImgs.get(kind);
  if(!im){const svg=fxSVG(kind);if(!svg)return null;im=makeImg(svg);r.fxImgs.set(kind,im);}
  return usable(im)?im:null;
}

/** 頭の上の絵。sx,top＝ぷにの足もと（持ち上げ込み）。z は 3 つ順に浮かぶ、drop は植物の上から 3 つ落ちる */
function drawFx(r,u,sx,top){
  const kind=has(USES,u.spot.id)?USES[u.spot.id].fx:'';
  const im=kind?fxImg(r,kind):null;
  if(!im)return;
  const c=r.ctx,t=u.t;
  const put=(x,y,s,a)=>{c.globalAlpha=a;c.drawImage(im,x-s/2,y-s/2,s,s);};
  if(kind==='z'){
    for(let k=0;k<3;k++){
      if(t<k*0.5)continue;
      const p=((t-k*0.5)%1.5)/1.5;
      put(sx+14+p*8,top-TILE_W-p*20,FX_S*(0.6+0.4*p),Math.sin(Math.PI*p));
    }
  }else if(kind==='drop'){
    const o=r.placed.find(q=>q.i===u.spot.index);
    if(!o)return;
    const C=toScreen(o.p.x+o.f.w/2,o.p.y+o.f.h/2,r.n),y0=toScreen(o.p.x,o.p.y,r.n).y-o.a.art.ay;
    for(let k=0;k<3;k++){
      const p=((t+k/3)%1);
      put(C.x+(k-1)*8,y0-6+p*24,12,1-p);
    }
  }else{
    const bob=r.red?0:2*Math.sin(TAU*r.clock/1.5);
    put(sx+16,top-TILE_W-4+bob,FX_S,1);
  }
  c.globalAlpha=1;
}

/** らんぷ ごとの点灯（0..1、1 秒で近づける）を進め、光らせる 6 こ（ぷにに近い順）の中心（部屋の SVG の px）と強さ */
function lampLights(r,dt){
  const lamps=[];
  for(const o of r.placed){
    if(!(has(USES,o.p.id)&&USES[o.p.id].act==='lamp'))continue;
    const want=r.lampOff.has(o.i)?0:1,cur=r.lampOn.has(o.i)?r.lampOn.get(o.i):want;
    const v=approach(cur,want,dt,LAMP_TAU);
    r.lampOn.set(o.i,Math.abs(v-want)<0.005?want:v); // 近づいたら ぴったりに（消えた らんぷ を描きつづけない）
    lamps.push({i:o.i,x:o.p.x+o.f.w/2,y:o.p.y+o.f.h/2});
  }
  if(!lamps.length)return [];
  const b=r.brain;
  return pickLights(lamps,{x:b.x,y:b.y},LAMP_MAX).map(i=>{
    const l=lamps.find(q=>q.i===i),p=toScreen(l.x,l.y,r.n);
    return {x:p.x,y:p.y-GLOW_UP,L:glowLevel(r.dark,r.lampOn.get(i))};
  });
}

/** 放射グラデーションの丸（rgb の色、中心 a → 外 0） */
function glow(c,x,y,rad,rgb,a){
  const g=c.createRadialGradient(x,y,0,x,y,rad);
  g.addColorStop(0,'rgba('+rgb+','+a.toFixed(3)+')');g.addColorStop(1,'rgba('+rgb+',0)');
  c.fillStyle=g;c.beginPath();c.arc(x,y,rad,0,TAU);c.fill();
}

/** 部屋の形（かべ＋ゆか）のパスを作る（部屋の SVG の座標）。らんぷの光をこの中だけにする */
function roomPath(c,n){
  const P=(gx,gy,h)=>{const p=toScreen(gx,gy,n);return [p.x,p.y-h];};
  const pts=[P(0,n,0),P(0,n,WALL_H),P(0,0,WALL_H),P(n,0,WALL_H),P(n,0,0),P(n,n,0)];
  c.beginPath();c.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);
  c.closePath();
}

/** 夜の暗さを c に重ねる。ついている らんぷ があれば、光のまわりを抜いた暗さの板（キャッシュ）を 1 回重ねる。
 * らんぷが無ければ今までどおり全体に塗る。c の合成のしかた（source-atop など）は呼ぶ側のまま */
function shade(r,c,lights){
  const d=lights.some(l=>l.L.cut>0)?shadeCv(r,lights):null;
  if(!d){
    if(r.shade&&!lights.some(l=>l.L.cut>0)){freeCv(r.shade.cv);r.shade=null;} // 光が無い間は板を返す
    darken(c,r.cv,r.dark);return;
  }
  c.setTransform(1,0,0,1,0,0);c.drawImage(d,0,0);
}

/** 抜いた暗さの板。暗さ（0.005 きざみ）・光の強さと位置・大きさ・倍率が変わったときだけ描き直す。作れなければ null */
function shadeCv(r,lights){
  const dq=Math.round(r.dark/0.005)*0.005;
  const cuts=lights.map(l=>({x:l.x,y:l.y,a:Math.round(l.L.cut*200)/200})).filter(l=>l.a>0)
    .sort((p,q)=>p.x-q.x||p.y-q.y); // ぷにが動いて近い順が変わっても描き直さない
  const key=[r.cv.width,r.cv.height,r.k,r.ox,r.oy,r.dpr,r.n,dq,...cuts.map(l=>l.x+','+l.y+','+l.a)].join('|');
  const d=layerCtx(r,'shade');
  if(!d)return null;
  if(r.shade.key===key)return d.canvas;
  r.shade.key=key;
  d.setTransform(1,0,0,1,0,0);d.globalCompositeOperation='source-over';
  d.clearRect(0,0,r.cv.width,r.cv.height);
  darken(d,r.cv,dq);
  d.save();
  d.setTransform(r.k,0,0,r.k,r.ox*r.dpr,r.oy*r.dpr);
  roomPath(d,r.n);d.clip(); // 部屋の外（余白）の暗さは抜かない
  d.globalCompositeOperation='destination-out';
  for(const l of cuts)glow(d,l.x,l.y,GLOW_R,'0,0,0',l.a);
  d.restore();
  return d.canvas;
}

/** らんぷの あたたかい色（夜）と小さな光（昼）を足す（lighter）。部屋の形の中だけ。
 * 光は小さな丸だけなので毎コマ描く（全面の板は使わない） */
function warmLights(r,lights){
  if(!lights.some(l=>l.L.warm>0||l.L.day>0))return;
  const c=r.ctx;
  c.save();
  c.setTransform(r.k,0,0,r.k,r.ox*r.dpr,r.oy*r.dpr);
  roomPath(c,r.n);c.clip();
  c.globalCompositeOperation='lighter';
  for(const l of lights){
    if(l.L.warm>0)glow(c,l.x,l.y,GLOW_R,WARM,l.L.warm);
    if(l.L.day>0)glow(c,l.x,l.y,GLOW_DAY_R,WARM,l.L.day);
  }
  c.restore();
}

/** 床の ★（いちばん上に描く） */
function drawBursts(r){
  if(!r.bursts.length)return;
  const im=fxImg(r,'star'),c=r.ctx;
  if(!im)return;
  c.setTransform(r.k,0,0,r.k,r.ox*r.dpr,r.oy*r.dpr);
  for(const s of r.bursts)for(const p of starBurst(r.clock-s.t,r.red)){
    const z=STAR_S*p.s;
    c.globalAlpha=p.a;c.drawImage(im,s.x+p.x-z/2,s.y+p.y-z/2,z,z);
  }
  c.globalAlpha=1;
}

/** 床のひし形（マス (x,y) から w×h。in だけ内側へ縮める）のパスを作る */
function diamond(r,x,y,w,h,inset){
  const n=r.n,c=[toScreen(x+inset,y+inset,n),toScreen(x+w-inset,y+inset,n),toScreen(x+w-inset,y+h-inset,n),toScreen(x+inset,y+h-inset,n)];
  const ctx=r.ctx;
  ctx.beginPath();ctx.moveTo(c[0].x,c[0].y);
  for(let i=1;i<4;i++)ctx.lineTo(c[i].x,c[i].y);
  ctx.closePath();
}

/** 置ける（みどり＋白い丸）・置けない（あか）のマス */
function drawMask(r,mask){
  const n=r.n,ctx=r.ctx;
  if(mask.length!==n*n)return;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const m=mask[y*n+x];
    if(m!==1&&m!==2)continue;
    ctx.globalAlpha=EDIT_MASK;ctx.fillStyle=m===1?EDIT_OK:EDIT_NG;
    diamond(r,x,y,1,1,0.04);ctx.fill();
    if(m===1){
      const c=toScreen(x+.5,y+.5,n);
      ctx.globalAlpha=0.9;ctx.fillStyle='#FFFFFF';
      ctx.beginPath();ctx.ellipse(c.x,c.y,6,3.5,0,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.globalAlpha=1;
}

/** 家具 1 つ。基準点＝足あとの上の頂点。r が奇数なら基準点を軸に左右反転。
 * 消えている らんぷ は消えた絵、ぶるんっ（タップ・おみず）は足もとを軸に、ぼーる は けられて ころがる */
function drawItem(r,o,alpha){
  let im=o.a.img,art=o.a.art;
  if(r.lampOff.has(o.i)){
    if(!r.lampOffImg){r.lampOffArt=lampOffSVG();r.lampOffImg=makeImg(r.lampOffArt.svg);} // 読めなければ ついている絵のまま
    if(usable(r.lampOffImg)){im=r.lampOffImg;art=r.lampOffArt;}
  }
  if(!usable(im))return;
  const ctx=r.ctx,P=toScreen(o.p.x,o.p.y,r.n),b=r.brain,u=b.act==='use'&&b.use&&b.use.spot.index===o.i?b.use:null;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.translate(P.x,P.y);
  let age=r.wig.has(o.i)?r.clock-r.wig.get(o.i):-1;
  if(u&&u.spot.act==='water'&&!(age>=0&&age<0.4))age=u.t%1; // おみず の間は 1 秒ごとに ゆれる
  const w=wiggleScale(age,r.red);
  if(w.sx!==1||w.sy!==1){
    const F=toScreen(o.p.x+o.f.w/2,o.p.y+o.f.h/2,r.n),fx=F.x-P.x,fy=F.y-P.y;
    ctx.translate(fx,fy);ctx.scale(w.sx,w.sy);ctx.translate(-fx,-fy);
  }
  if(u&&u.spot.act==='kick'){
    // ぷに → ぼーる の向きへ ころがす（マスのずれを画面へ。回転は玉の中心＝足もとの 3px 上）
    const m=ballMotion(u.t,{dx:o.p.x+o.f.w/2-b.x,dy:o.p.y+o.f.h/2-b.y});
    ctx.translate((m.dx-m.dy)*TILE_W/2,(m.dx+m.dy)*TILE_H/2-3);ctx.rotate(m.rot);ctx.translate(0,3);
  }
  if(o.p.r%2)ctx.scale(-1,1);
  ctx.drawImage(im,-art.ax,-art.ay,art.w,art.h);
  ctx.restore();
}

/** ぷに。lift＝家具の上に乗る高さ（px）、clip＝てんと の中（体の下 45% を隠す） */
function drawPet(r,v,sx,sy,lift,clip){
  const {ctx,brain:b}=r;
  const isEgg=v.form==='egg';
  const u=b.act==='use'?b.use:null;
  if(u&&has(USES,u.spot.id))v={...v,face:USES[u.spot.id].face}; // 使っている間は家具の顔
  // spin：idle に入るたびに 1 回だけ
  if(v.pose!=='spin')r.lastPose=v.pose;
  else if(r.lastPose!=='spin'||(r.lastAct!=='idle'&&b.act==='idle')){r.spinAt=r.clock;r.lastPose='spin';}
  r.lastAct=b.act;
  const m=motion(b,r.clock,isEgg?'none':v.pose,r.clock-r.pokeAt,r.clock-r.spinAt);
  if(u)useMotion(m,u,r.red);
  sy-=lift; // 家具の上に乗るときは、乗っている面が足もと
  // 足もとの影（てんと の中では見えない）
  const sh=1-m.lift*0.5;
  if(!clip){
    ctx.fillStyle='rgba(60,40,70,.14)';
    ctx.beginPath();ctx.ellipse(sx,sy,20*sh,7*sh,0,0,Math.PI*2);ctx.fill();
  }
  const yb=isEgg?0:yawBucket(m.yaw);
  const stage=(FORMS[v.form]||{}).stage||0;
  const key=[v.form,v.face,v.arms||'',v.think||'',v.shiny?1:0,v.final?1:0,stage,isEgg?'c'+(v.pts>=2?1:0):yb].join('|');
  const im=r.sprites.get(key,()=>{
    const o={pts:v.pts,shiny:!!v.shiny,final:!!v.final,arms:v.arms,think:v.think};
    if(!isEgg)o.yaw=yb;
    return toXML(petSVG(v.form,v.face,o));
  });
  if(!usable(im))return; // 最初の 1 枚が読めるまでは描かない（影だけ）
  ctx.save();
  if(clip){ctx.beginPath();ctx.rect(sx-TILE_W,sy-3*TILE_W,TILE_W*2,3*TILE_W+6-0.45*TILE_W);ctx.clip();} // 絵の下端は sy+6
  ctx.translate(sx,sy+4-m.lift*TILE_W);
  ctx.rotate(m.tilt);
  ctx.scale(m.scaleX,m.scaleY);
  ctx.drawImage(im,-TILE_W/2,-TILE_W+2,TILE_W,TILE_W);
  ctx.restore();
}
