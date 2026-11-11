// おへや：投影・深度ソート・夜の暗さ・当たり判定・絵のキャッシュ（DOM に触れない純関数。import しただけで Node でも読める）
// 設計書：docs/superpowers/specs/2026-11-10-oheya-stage0-1-design.md §3.1・§3.4・§3.5、
//         docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md §7（部屋の状態から描く）
import {TILE_W,TILE_H,WALL_H,roomSVG,itemSVG} from './room-art.js';
import {normDeg,mulberry32,makeGrid,createBrain,stepBrain,holdBrain,pauseBrain,relocateBrain,motion} from './room-ai.js';
import {ITEMS,SIZES,has,defaultRoom} from './room-data.js';
import {footprint,blockedCells,homeFor,nearestFree} from './room-edit.js';
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
 * @param {{room:Room,reduced?:boolean,onFail?:()=>void}} opt @returns {boolean} */
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
  r.cellCb=null;
  // Canvas のメモリをすぐ返す（開け閉めを くりかえしても 上限に届かないように）
  dropBg(r);
  if(r.layer){freeCv(r.layer.cv);r.layer=null;}
  if(r.cv.parentNode)r.cv.parentNode.removeChild(r.cv);
  freeCv(r.cv);
}

/** 部屋（家具・ゆか・かべ・広さ）を入れ替える。mount 前は何もしない
 * @param {Room} room */
export function setRoom(room){
  const r=R,ok=okRoom(room);
  if(!r||!ok)return;
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

/** 床のマスを押したときに呼ぶ関数（範囲外は呼ばない）。null で外す。mount 前は何もしない
 * @param {((x:number,y:number)=>void)|null} cb */
export function onCell(cb){
  if(R)R.cellCb=typeof cb==='function'?cb:null;
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

function bctx(r){
  return {mode:r.mode,band:r.band,reduced:!!(r.opt.reduced||(r.mq&&r.mq.matches)),home:r.home};
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
  r.home=homeFor(room);
  const b=r.brain;
  if(b){
    if(b.mode==='egg'||r.mode==='egg')relocateBrain(b,r.grid,r.home,true);
    else relocateBrain(b,r.grid,nearestFree(room,b.x-0.5,b.y-0.5));
  }
  if(grown)resize(r,true);
}

/** Canvas を押した点 → マス */
function tapCell(r,e){
  if(R!==r||!r.cellCb)return;
  const rect=r.cv.getBoundingClientRect();
  const kx=rect.width>0?r.cssW/rect.width:1,ky=rect.height>0?r.cssH/rect.height:1;
  const c=cellAt((e.clientX-rect.left)*kx,(e.clientY-rect.top)*ky,r.ox,r.oy,r.s,r.n);
  if(c)r.cellCb(c.x,c.y);
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
  const sleeping=r.brain&&r.brain.act==='sleep';
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
  r.dark=approach(r.dark,r.darkTarget,dt);
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
  list.push({x:b.x,y:b.y,pet:true});
  ctx.setTransform(r.k,0,0,r.k,r.ox*r.dpr,r.oy*r.dpr);
  let petX=0,petY=0;
  const one=e=>{
    if(e.pet){
      const p=toScreen(b.x,b.y,r.n);
      petX=p.x;petY=p.y;
      drawPet(r,v,p.x,p.y);
    }else drawItem(r,e.o,ed&&!e.flat&&e.o.i!==ed.sel?EDIT_FADE:1);
  };
  const sorted=sortForDraw(list),cut=maskSlot(sorted),night=r.dark>0.001;
  for(let i=0;i<cut;i++)one(sorted[i]);
  if(ed&&ed.mask&&night){
    // 夜のもようがえ：ゆか・ラグを暗くしてからマスを明るいまま描き、
    // 立っている家具とぷには別の板で暗くしてから重ねる（見た目の前後は昼と同じ）
    darken(ctx,cv,r.dark);
    ctx.setTransform(r.k,0,0,r.k,r.ox*r.dpr,r.oy*r.dpr);
    drawMask(r,ed.mask);
    if(cut<sorted.length){
      const lc=layerCtx(r);
      if(lc){
        lc.setTransform(1,0,0,1,0,0);lc.globalAlpha=1;lc.globalCompositeOperation='source-over';
        lc.clearRect(0,0,cv.width,cv.height);
        lc.setTransform(r.k,0,0,r.k,r.ox*r.dpr,r.oy*r.dpr);
        r.ctx=lc;
        try{for(let i=cut;i<sorted.length;i++)one(sorted[i]);}finally{r.ctx=ctx;}
        lc.globalCompositeOperation='source-atop'; // 描いたところだけ暗くする
        darken(lc,cv,r.dark);
        lc.globalCompositeOperation='source-over';
        ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(lc.canvas,0,0);
      }else{
        for(let i=cut;i<sorted.length;i++)one(sorted[i]);
      }
    }
  }else{
    if(ed&&ed.mask)drawMask(r,ed.mask);
    for(let i=cut;i<sorted.length;i++)one(sorted[i]);
    // 夜の暗さ
    if(night)darken(ctx,cv,r.dark);
  }
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

/** 夜のもようがえ用の重ね板（メインと同じ大きさ。作れなければ null） */
function layerCtx(r){
  const w=r.cv.width,h=r.cv.height;
  let L=r.layer;
  if(!L){
    try{const c=document.createElement('canvas');L=r.layer={cv:c,ctx:c.getContext('2d')};}catch(e){return null;}
    if(!L.ctx){r.layer=null;return null;}
  }
  if(L.cv.width!==w||L.cv.height!==h){L.cv.width=w;L.cv.height=h;}
  return L.ctx;
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

/** 家具 1 つ。基準点＝足あとの上の頂点。r が奇数なら基準点を軸に左右反転 */
function drawItem(r,o,alpha){
  const im=o.a.img,art=o.a.art;
  if(!usable(im))return;
  const ctx=r.ctx,P=toScreen(o.p.x,o.p.y,r.n);
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.translate(P.x,P.y);
  if(o.p.r%2)ctx.scale(-1,1);
  ctx.drawImage(im,-art.ax,-art.ay,art.w,art.h);
  ctx.restore();
}

function drawPet(r,v,sx,sy){
  const {ctx,brain:b}=r;
  const isEgg=v.form==='egg';
  // spin：idle に入るたびに 1 回だけ
  if(v.pose!=='spin')r.lastPose=v.pose;
  else if(r.lastPose!=='spin'||(r.lastAct!=='idle'&&b.act==='idle')){r.spinAt=r.clock;r.lastPose='spin';}
  r.lastAct=b.act;
  const m=motion(b,r.clock,isEgg?'none':v.pose,r.clock-r.pokeAt,r.clock-r.spinAt);
  // 足もとの影
  const sh=1-m.lift*0.5;
  ctx.fillStyle='rgba(60,40,70,.14)';
  ctx.beginPath();ctx.ellipse(sx,sy,20*sh,7*sh,0,0,Math.PI*2);ctx.fill();
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
  ctx.translate(sx,sy+4-m.lift*TILE_W);
  ctx.rotate(m.tilt);
  ctx.scale(m.scaleX,m.scaleY);
  ctx.drawImage(im,-TILE_W/2,-TILE_W+2,TILE_W,TILE_W);
  ctx.restore();
}
