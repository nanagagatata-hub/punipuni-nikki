// おへや：投影・深度ソート・夜の暗さ・当たり判定・絵のキャッシュ（DOM に触れない純関数。import しただけで Node でも読める）
// 設計書：docs/superpowers/specs/2026-11-10-oheya-stage0-1-design.md §3.1・§3.4・§3.5
import {TILE_W,TILE_H,WALL_H,layout,roomSVG,itemSVG} from './room-art.js';
import {normDeg,mulberry32,makeGrid,createBrain,stepBrain,holdBrain,pauseBrain,motion} from './room-ai.js';
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
/** @type {any} */
let R=null; // 動いているおへやの状態（無ければ null）

const makeImg=svg=>{const im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);return im;};
const usable=im=>!!im&&im.complete&&im.naturalWidth>0;
/** petSVG は xmlns が無く属性が重複する顔があるので、HTML として読んで XML に書き出す（段階0）。失敗なら '' */
function toXML(svg){
  try{
    const el=new DOMParser().parseFromString(svg,'text/html').body.firstElementChild;
    return el?new XMLSerializer().serializeToString(el):'';
  }catch(e){return '';}
}

/** 部屋を sceneEl に出す。Canvas が使えなければ false。画像の読み込み失敗は opt.onFail（呼ぶ前に unmount する）
 * @param {HTMLElement} sceneEl @param {HTMLElement} petBtn
 * @param {{n?:6|8|10,reduced?:boolean,onFail?:()=>void}} [opt] @returns {boolean} */
export function mount(sceneEl,petBtn,opt){
  if(R)unmount();
  opt=opt||{};
  const n=opt.n||6;
  let cv=null,ctx=null;
  try{
    cv=document.createElement('canvas');
    ctx=cv.getContext('2d');
  }catch(e){ctx=null;}
  if(!ctx)return false;
  const lay=layout(n);
  const blocked=[];
  for(const it of lay.items)for(let dy=0;dy<it.h;dy++)for(let dx=0;dx<it.w;dx++)blocked.push({x:it.x+dx,y:it.y+dy});
  const mq=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
  const r=R={
    sceneEl,petBtn,opt,n,cv,ctx,lay,grid:makeGrid(n,blocked),rng:mulberry32(Date.now()>>>0),mq,
    dpr:1,cssW:0,cssH:0,k:1,s:1,ox:0,oy:0,
    sprites:new SpriteCache(120,spriteMaker(()=>r.fail(),svg=>{const im=makeImg(svg);im.onerror=()=>r.fail();return im;})),
    bgImgs:{},bgCur:null,bgOld:null,bgCurBand:null,fade:1,
    items:lay.items.map(it=>({it,art:itemSVG(it.id),img:null})),
    view:null,mode:'awake',band:'hiru',brain:null,dark:0,darkTarget:0,first:true,
    clock:0,lastDraw:0,lastT:0,raf:0,pokeAt:-9,spinAt:-9,lastAct:'',lastPose:'',
    box:{l:-1,t:-1,s:-1},failed:false,handlers:[],ro:null,fail:null
  };
  // 読み込み失敗：止めて Canvas を外し、今の表示に戻してもらう
  r.fail=()=>{if(R!==r||r.failed)return;r.failed=true;const f=opt.onFail;unmount();if(f)f();};
  for(const o of r.items){o.img=makeImg(o.art.svg);o.img.onerror=r.fail;}
  sceneEl.appendChild(cv);
  const on=(t,type,fn)=>{t.addEventListener(type,fn);r.handlers.push([t,type,fn]);};
  if(typeof ResizeObserver==='function'){r.ro=new ResizeObserver(()=>resize(r));r.ro.observe(sceneEl);}
  else on(window,'resize',()=>resize(r));
  on(document,'visibilitychange',()=>{if(document.hidden)stop(r);else resume(r);});
  on(window,'pageshow',e=>{if(e.persisted)resume(r);});
  on(cv,'contextlost',e=>{e.preventDefault();stop(r);});
  on(cv,'contextrestored',()=>resume(r));
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
  for(const o of r.items)if(o.img)o.img.onerror=null;
  for(const k in r.bgImgs)r.bgImgs[k].onerror=null;
  r.sprites.make=svg=>svg?makeImg(svg):{complete:true,naturalWidth:0}; // 以後の失敗通知は不要
  if(r.cv.parentNode)r.cv.parentNode.removeChild(r.cv);
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
  return {mode:r.mode,band:r.band,reduced:!!(r.opt.reduced||(r.mq&&r.mq.matches)),home:r.lay.home};
}

function stop(r){
  cancelAnimationFrame(r.raf);r.raf=0;
  if(r.brain&&r.brain.held)holdBrain(r.brain,false); // 指を離した通知が来なくても固まらない
}
/** 裏から戻った・描画面が復活した：dt を捨て、暗さを目標に合わせ、背景と画像を確かめる */
function resume(r){
  if(R!==r||document.hidden)return;
  stop(r);
  r.lastT=0;r.lastDraw=0;
  r.dark=r.darkTarget;r.fade=1;r.bgOld=null;
  r.bgCur=null;r.bgCurBand=null;
  const reload=im=>{if(im&&!usable(im)){const src=im.src;im.src='';im.src=src;}};
  for(const o of r.items)reload(o.img);
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
  r.s=fitScale(w,h,r.n);r.k=r.s*dpr;
  const rw=r.n*TILE_W*r.s,rh=(r.n*TILE_H+WALL_H)*r.s;
  r.ox=(w-rw)/2;r.oy=h-rh; // 中央・下寄せ
  r.cv.width=Math.round(w*dpr);r.cv.height=Math.round(h*dpr);
  r.cv.style.width=w+'px';r.cv.style.height=h+'px';
  r.bgCur=null;r.bgCurBand=null;r.bgOld=null;r.fade=1;
  r.box.l=-1; // #pet を置き直す
  if(r.brain&&!document.hidden)try{draw(r,0);}catch(e){} // キャンバスが空のまま 1 コマ待たない
}

/** 時間帯の背景を、部屋の大きさに合わせてオフスクリーンに描く。画像が未読込なら null */
function buildBg(r,band){
  let im=r.bgImgs[band];
  if(!im){im=makeImg(roomSVG(r.n,band));im.onerror=r.fail;r.bgImgs[band]=im;}
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
  // 背景：時間帯が変わったら古い背景を 3 秒でフェードアウト
  if(r.bgCurBand!==r.band||!r.bgCur){
    const nb=buildBg(r,r.band);
    if(nb){
      if(r.bgCur&&r.bgCurBand!==r.band){r.bgOld=r.bgCur;r.fade=0;}
      r.bgCur=nb;r.bgCurBand=r.band;
    }
  }
  if(r.fade<1){r.fade=Math.min(1,r.fade+dt/3);if(r.fade>=1)r.bgOld=null;}
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalAlpha=1;
  ctx.clearRect(0,0,cv.width,cv.height);
  if(r.bgCur)ctx.drawImage(r.bgCur,0,0);
  if(r.bgOld){ctx.globalAlpha=1-r.fade;ctx.drawImage(r.bgOld,0,0);ctx.globalAlpha=1;}
  // 物：奥から手前へ
  const b=r.brain;
  const v=r.view||{form:'puni',face:'normal',arms:'',think:null,pose:'none',shiny:false,final:false,pts:0};
  const list=r.items.map(o=>({x:o.it.x+o.it.w/2,y:o.it.y+o.it.h/2,o}));
  list.push({x:b.x,y:b.y,pet:true});
  ctx.setTransform(r.k,0,0,r.k,r.ox*r.dpr,r.oy*r.dpr);
  let petX=0,petY=0;
  for(const e of sortByDepth(list)){
    if(e.pet){
      const p=toScreen(b.x,b.y,r.n);
      petX=p.x;petY=p.y;
      drawPet(r,v,p.x,p.y);
    }else{
      const o=e.o,p=toScreen(o.it.x,o.it.y,r.n);
      if(usable(o.img))ctx.drawImage(o.img,p.x-o.art.ax,p.y-o.art.ay,o.art.w,o.art.h);
    }
  }
  // 夜の暗さ
  if(r.dark>0.001){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.globalAlpha=r.dark;ctx.fillStyle=NIGHT_COLOR;ctx.fillRect(0,0,cv.width,cv.height);
    ctx.globalAlpha=1;
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
