// おへや：主役のぷにの自律行動（DOM に触れない純粋ロジック。乱数は引数で注入する）
// 設計書：docs/superpowers/specs/2026-11-10-oheya-stage0-1-design.md §2.2・§4
// 出所：
//  - mulberry32・between は oekaki `src/tank/random.ts`（b1611f5）からほぼそのまま。TS の型を JSDoc に変更。
//  - bfs（マス目の経路探索）は新規。
//  - ときどき止まる・夜は決まった場所へ集まって眠る は oekaki `src/tank/walk.ts`・`sleep.ts`（b1611f5）の考え方。
//    1 次元の歩きをマス目＋BFS に変更。
//  - motion は odori `src/core/puppet-motion.ts`（9cef958）の移植。拍を秒に変え、act と pose の種類を増やした。横×縦＝1 を保つ。

/** @typedef {() => number} Random  0以上1未満 */
/** @typedef {{n:number, block:Uint8Array}} Grid  block[gy*n+gx]=1 は通れない */
/** @typedef {'egg'|'sleep'|'sick'|'dance'|'hungry'|'awake'} Mode */
/** @typedef {'asa'|'hiru'|'yuu'|'yoru'} Band */
/** @typedef {'idle'|'walk'|'look'|'hop'|'dance'|'sleep'|'rest'|'sad'} Act */
/** @typedef {{x:number, y:number, act:Act, t:number, dur:number,
 *   path:{x:number,y:number}[], yaw:number, want:number, hold:number, held:boolean, n:number,
 *   mode:Mode, then:Act|null, lookT:number}} Brain
 *   x,y は足もとのマス座標（マスの中心は i+0.5）。yaw は今の向き・want は向きたい向き（度。0 が正面、+ で見ている人から見て右、±180 が後ろ）。
 *   hold はタッチ後に止まっている残り秒。mode は前回の mode（切り替わりの検出用）・then は歩き終わったあとの行動・lookT は次に目線を変えるまでの秒 */
/** @typedef {{mode:Mode, band:Band, reduced:boolean, home:{x:number,y:number}}} BrainCtx  home はねんねのマス */
/** @typedef {{scaleX:number, scaleY:number, lift:number, tilt:number, yaw:number}} Motion  yaw は絵を選ぶ向き（度。spin のときは一回転を足す） */
/** @typedef {{form:string, face:string, arms:string, think:string|null, pose:string,
 *   shiny:boolean, final:boolean, pts:number}} PetView  look() と S から作る、絵のキーになる値 */

/** 種を固定できる乱数
 * @param {number} seed
 * @returns {Random} */
export function mulberry32(seed){
  let a=seed>>>0;
  return ()=>{
    a=(a+0x6d2b79f5)>>>0;
    let t=a;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

/** @param {Random} rng @param {number} min @param {number} max @returns {number} */
export function between(rng,min,max){return min+rng()*(max-min);}

/** @param {number} n @param {{x:number,y:number}[]} blocked @returns {Grid} */
export function makeGrid(n,blocked){
  const block=new Uint8Array(n*n);
  for(const c of blocked){if(c.x>=0&&c.y>=0&&c.x<n&&c.y<n)block[c.y*n+c.x]=1;}
  return {n,block};
}

/** 範囲内で通れるマスか
 * @param {Grid} grid @param {number} x @param {number} y @returns {boolean} */
export function passable(grid,x,y){
  return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<grid.n&&y<grid.n&&!grid.block[y*grid.n+x];
}

const STEPS=[[1,0],[0,1],[-1,0],[0,-1]];
/** 4 方向の最短経路（from と to を含む）。届かない・to が通れないなら null
 * @param {Grid} grid @param {{x:number,y:number}} from @param {{x:number,y:number}} to
 * @returns {{x:number,y:number}[]|null} */
export function bfs(grid,from,to){
  if(!passable(grid,to.x,to.y))return null;
  if(from.x===to.x&&from.y===to.y)return [{x:from.x,y:from.y}];
  const n=grid.n,prev=new Int32Array(n*n).fill(-1),start=from.y*n+from.x,goal=to.y*n+to.x;
  if(from.x<0||from.y<0||from.x>=n||from.y>=n)return null;
  prev[start]=start;
  const q=[start];
  for(let h=0;h<q.length;h++){
    const cur=q[h];if(cur===goal)break;
    const cx=cur%n,cy=(cur-cx)/n;
    for(const [dx,dy] of STEPS){
      const nx=cx+dx,ny=cy+dy;
      if(!passable(grid,nx,ny))continue;
      const k=ny*n+nx;if(prev[k]>=0)continue;
      prev[k]=cur;q.push(k);
    }
  }
  if(prev[goal]<0)return null;
  const path=[];
  for(let k=goal;;k=prev[k]){path.push({x:k%n,y:Math.floor(k/n)});if(k===start)break;}
  return path.reverse();
}


// ---- ぷにの行動 ----
export const TURN_GATE=60;
export const WEIGHTS={idle:35,walk:30,look:15,hop:10,dance:10};
export const BAND_MUL={asa:{look:1.5},hiru:{walk:1.3,hop:1.3},yuu:{idle:1.5},yoru:{}};
export const SPEED=1.2;
export const DUR={idle:[3,6],look:2,hop:0.6,dance:3};
const FIN={sleep:'sleep',sick:'rest',hungry:'sad'};

/** 角度を -180 以上 180 未満にする @param {number} d @returns {number} */
export function normDeg(d){return ((d+180)%360+360)%360-180;}

/** 進む向き（マス座標の差）に対応する絵の向き。(1,0)→45・(0,1)→-45・(-1,0)→-135・(0,-1)→135
 * @param {number} dx @param {number} dy @returns {number} */
export function dirYaw(dx,dy){return normDeg(45-Math.atan2(dy,dx)*180/Math.PI);}

/** 近いほうの回り方で、毎秒 rate 度まで向きを変える（行き過ぎない）
 * @param {number} cur @param {number} want @param {number} dt @param {number} [rate] @returns {number} */
export function turnToward(cur,want,dt,rate=360){
  const diff=normDeg(want-cur),step=rate*dt;
  if(Math.abs(diff)<=step)return normDeg(want);
  return normDeg(cur+Math.sign(diff)*step);
}

/** 起きているときの次の行動を重みつきで選ぶ
 * @param {BrainCtx} ctx @param {Random} rng @returns {Act} */
export function pickAct(ctx,rng){
  const mul=BAND_MUL[ctx.band]||{},keys=Object.keys(WEIGHTS);
  const w=keys.map(k=>(ctx.reduced&&(k==='hop'||k==='dance'))?0:WEIGHTS[k]*(mul[k]??1));
  let r=rng()*w.reduce((a,b)=>a+b,0);
  for(let i=0;i<keys.length;i++){r-=w[i];if(r<0)return /** @type {Act} */(keys[i]);}
  return 'idle';
}

/** @param {number} n @param {BrainCtx} ctx @returns {Brain} */
export function createBrain(n,ctx){
  return {x:ctx.home.x+0.5,y:ctx.home.y+0.5,act:ctx.mode==='sleep'?'sleep':'idle',t:0,dur:0,path:[],
    yaw:0,want:0,hold:0,held:false,n,mode:ctx.mode,then:null,lookT:0};
}

/** タッチで押さえている間は止まって正面を向く。離したら 3 秒止まる
 * @param {Brain} b @param {boolean} on */
export function holdBrain(b,on){
  if(on){b.held=true;b.act='idle';b.path=[];b.then=null;}
  else{b.held=false;b.hold=3;}
}

/** sec 秒だけ止める（エサのあとなど）。歩いていたらその場で止まる
 * @param {Brain} b @param {number} sec */
export function pauseBrain(b,sec){
  b.hold=Math.max(b.hold,sec);b.path=[];
  if(b.act==='walk'){b.act='idle';b.then=null;b.t=0;b.dur=0;}
}

/** いちばん近いマス */
function nearest(b){
  const c=v=>Math.min(b.n-1,Math.max(0,Math.round(v-0.5)));
  return {x:c(b.x),y:c(b.y)};
}
const walking=b=>b.act==='walk'&&b.path.length>0;

/** goal まで歩く経路を引く（歩いている最中なら次のマスの中心から）。届かなければ その場で then にする */
function planTo(b,grid,goal,then){
  const start=walking(b)?b.path[0]:nearest(b);
  const p=bfs(grid,start,goal);
  b.then=then;
  if(p){b.path=p;b.act='walk';}
  else{b.path=[];b.act=then||'idle';}
}

/** mode が変わった瞬間の切り替え */
function enter(b,ctx,grid){
  const m=ctx.mode;
  b.mode=m;b.t=0;b.dur=0;b.lookT=0;
  if(m==='egg'){b.x=ctx.home.x+0.5;b.y=ctx.home.y+0.5;b.act='idle';b.path=[];b.then=null;}
  else if(m==='awake'){b.act='idle';b.path=[];b.then=null;}
  else if(m==='dance'){b.act='dance';b.path=[];b.then=null;}
  else if(m==='sleep')planTo(b,grid,ctx.home,'sleep');
  else{ // sick・hungry：次のマスの中心まで
    b.path=walking(b)?[b.path[0]]:[nearest(b)];b.act='walk';b.then=FIN[m];
  }
}

/** 歩く：向き終わってから次のマスの中心へ進む。着いたら then の行動へ */
function walkStep(b,dt,ctx,rng){
  while(b.path.length&&Math.hypot(b.path[0].x+0.5-b.x,b.path[0].y+0.5-b.y)<=1e-9){
    b.x=b.path[0].x+0.5;b.y=b.path[0].y+0.5;b.path.shift();
  }
  if(!b.path.length){ // 着いた
    b.act=b.then||'idle';b.then=null;b.t=0;b.dur=0;b.want=0;
    if(b.mode==='awake')b.dur=between(rng,1,2.5); // 歩いたあとは少し休む
    return;
  }
  const c=b.path[0],dx=c.x+0.5-b.x,dy=c.y+0.5-b.y,d=Math.hypot(dx,dy); // d>1e-9
  b.want=dirYaw(dx,dy);
  b.yaw=turnToward(b.yaw,b.want,dt);
  const hurry=b.mode==='sick'||b.mode==='hungry'; // 休む場所へ向かう短い歩きは向き待ちをしない
  if(!hurry&&Math.abs(normDeg(b.want-b.yaw))>TURN_GATE)return;
  const step=Math.min(d,SPEED*(ctx.reduced?0.6:1)*dt);
  if(step>=d){b.x=c.x+0.5;b.y=c.y+0.5;}
  else{b.x+=dx/d*step;b.y+=dy/d*step;}
}

/** 次の行動を始める */
function startAct(b,ctx,grid,rng){
  const a=pickAct(ctx,rng);
  b.t=0;b.want=0;b.then=null;
  if(a==='walk'){
    const s=nearest(b),cand=[];
    for(let y=0;y<grid.n;y++)for(let x=0;x<grid.n;x++){
      if(Math.abs(x-s.x)+Math.abs(y-s.y)<2)continue;
      const p=bfs(grid,s,{x,y});if(p)cand.push(p);
    }
    if(cand.length){b.path=cand[Math.floor(rng()*cand.length)];b.act='walk';b.dur=0;return;}
    b.act='idle';b.dur=between(rng,DUR.idle[0],DUR.idle[1])*(ctx.reduced?1.5:1);return;
  }
  b.act=a;b.path=[];
  if(a==='idle')b.dur=between(rng,DUR.idle[0],DUR.idle[1])*(ctx.reduced?1.5:1);
  else if(a==='look'){b.dur=DUR.look;b.lookT=between(rng,0.6,0.8);b.want=rng()<0.5?-50:50;}
  else if(a==='hop')b.dur=DUR.hop*(1+Math.floor(rng()*2));
  else b.dur=DUR.dance;
}

/** 1 ステップ進める（dt は 0.1 秒で切る）
 * @param {Brain} b @param {number} dt @param {BrainCtx} ctx @param {Grid} grid @param {Random} rng */
export function stepBrain(b,dt,ctx,grid,rng){
  dt=dt>0?Math.min(dt,0.1):0;
  if(ctx.mode!==b.mode&&(ctx.mode==='dance'||ctx.mode==='egg')){ // 止めている最中でも踊り・たまごはすぐ始める
    enter(b,ctx,grid);
    if(ctx.mode==='dance')b.hold=0;
  }
  if(b.held||b.hold>0){ // さわっている間と離して数秒は動かず正面を向く
    if(!b.held)b.hold=Math.max(0,b.hold-dt);
    b.want=0;b.yaw=turnToward(b.yaw,0,dt);return;
  }
  if(ctx.mode!==b.mode)enter(b,ctx,grid);
  const m=b.mode;
  if(m==='sleep'||m==='sick'||m==='hungry'){
    if(b.act!==FIN[m]&&!walking(b)){
      b.act='walk';
      if(m==='sleep')planTo(b,grid,ctx.home,'sleep');
      else{b.path=[nearest(b)];b.then=FIN[m];}
    }
    if(walking(b))walkStep(b,dt,ctx,rng);
    else b.want=0;
  }else if(m==='awake'){
    b.t+=dt;
    if(b.act==='walk')walkStep(b,dt,ctx,rng);
    else{
      if(b.act==='look'){
        b.lookT-=dt;
        if(b.lookT<=0){b.want=-b.want;b.lookT=between(rng,0.6,0.8);}
      }else b.want=0;
      if(b.t>=b.dur)startAct(b,ctx,grid,rng);
    }
  }else{ // egg・dance
    if(m==='dance')b.act='dance';
    b.want=0;
  }
  if(!(b.act==='walk'&&b.path.length))b.yaw=turnToward(b.yaw,b.want,dt);
}


// ---- 見た目の動き ----
const TAU=Math.PI*2;
const fin=(v,d=0)=>Number.isFinite(v)?v:d;
/** @param {number} x 0..1 の位相 @returns {number} 放物線 0→1→0 */
const arc=x=>4*x*(1-x);

/** 今の act と pose から、つぶれ・持ち上がり・傾き・向きを返す（横×縦＝1 を保つ）
 * @param {Brain} b @param {number} t 秒 @param {string} pose look() の pose
 * @param {number} [pokeAge] poke() からの秒 @param {number} [spinAge] pose spin が始まってからの秒 @returns {Motion} */
export function motion(b,t,pose,pokeAge,spinAge){
  t=fin(t);
  let sy=1,lift=0,tilt=0,yaw=fin(b.yaw);
  const bt=fin(b.t);
  switch(b.act){
    case 'sleep': sy=1+0.03*Math.sin(TAU*t/5);break;
    case 'rest': sy=0.96+0.01*Math.sin(TAU*t/5);break; // しおれる
    case 'sad': sy=0.97+0.01*Math.sin(TAU*t/4);break;
    case 'walk':{ // 1 マスごとに小さくつぶれて弾む
      const s=Math.abs(Math.sin(Math.PI*t*SPEED));
      lift=0.04*s;sy=1-0.04*(1-s);break;
    }
    case 'hop':{
      const d=arc((bt%DUR.hop)/DUR.hop);
      lift=0.35*d;sy=1+0.06*d;break;
    }
    case 'dance':{
      tilt=0.08*Math.sin(TAU*t);
      const p=(t*2)%1;
      sy=1-0.07*(1-p)**3;lift=0.06*Math.sin(Math.PI*p);break;
    }
    default: // idle・look ほか：呼吸と pose
      sy=1+0.02*Math.sin(TAU*t/4);
      if(b.act==='idle')switch(pose){
        case 'bob': lift=0.03*(0.5+0.5*Math.sin(TAU*t/1.5));break;
        case 'sway': tilt=0.06*Math.sin(TAU*t/2);break;
        case 'droop': sy=1-0.04*(0.5+0.5*Math.sin(TAU*t/4));break;
        case 'bounce':{const s=Math.abs(Math.sin(TAU*t*0.75));lift=0.05*s;sy=1-0.03*(1-s);break;}
        case 'tilt': tilt=0.12;break;
        case 'squish': sy=1-0.08*Math.abs(Math.sin(TAU*t/1.2));break;
      }
  }
  if(Number.isFinite(pokeAge)&&pokeAge>=0&&pokeAge<0.5)sy*=1-0.1*Math.sin(Math.PI*pokeAge/0.5);
  if(pose==='spin'&&Number.isFinite(spinAge)&&spinAge>=0&&spinAge<0.8)yaw=normDeg(yaw+360*spinAge/0.8);
  return {scaleX:1/sy,scaleY:sy,lift,tilt,yaw};
}
