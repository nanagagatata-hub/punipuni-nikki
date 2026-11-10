// おへや 段階0（技術検証）の使い捨て試作。本番コードから import しない・sw.js の ASSETS に入れない。
// 確かめること（設計書 docs/superpowers/specs/2026-11-10-oheya-stage0-1-design.md §1）：
//  1) petSVG → data: 画像 → Image のキャッシュで描けるか（CSP img-src 'self' data: で通るか）
//  2) ぷに n 匹＋家具のダミー f 個を同時に動かしたときの負荷（フレーム時間）
//  3) ホーム画面に追加した状態・裏から戻ったあとに描画が消えないか
// 表示はすべて textContent（innerHTML は使わない）。
// 本番と同じオリジンで開かれうるので、保存データ（localStorage 等）には絶対に触らない。
import {petSVG} from '../js/art.js';
import {ZORDER} from '../js/data.js';

const q=new URLSearchParams(location.search);
const int=(k,d,ok)=>{const v=Number(q.get(k));return Number.isInteger(v)&&ok(v)?v:d;};
const N=int('n',6,v=>v>=1&&v<=6);
const F=int('f',30,v=>v>=0&&v<=30);
const FPS=int('fps',30,v=>v===30||v===60);
const DPR_MAX=int('dpr',2,v=>v===1||v===2);
const ROOM=6,TW=64,TH=32,WALL=112;
const W=ROOM*TW,H=ROOM*TH+WALL; // 部屋全体の論理サイズ

const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const hud=document.getElementById('hud'),logEl=document.getElementById('log');

/* ---------- 記録 ---------- */
const lines=[];const t0=performance.now();
function log(msg){lines.push(((performance.now()-t0)/1000).toFixed(1).padStart(7)+'s '+msg);if(lines.length>30)lines.shift();logEl.textContent=lines.join('\n');}
const st={ok:0,fail:0,csp:0,redraws:0,lost:0};
const work=[],gaps=[];let frames=0,fpsNow=0,fpsAt=performance.now(),last=0;
document.addEventListener('securitypolicyviolation',e=>{st.csp++;log('CSP違反 '+e.violatedDirective+' '+String(e.blockedURI).slice(0,40));});

/* 条件を切り替えるリンク（iPad でタップしやすいように） */
const links=document.getElementById('links');
[['n=1&f=0','1匹・家具0'],['n=6&f=30','6匹・家具30'],['n=6&f=30&fps=60','60fps'],['n=6&f=30&dpr=1','dpr1'],['n=6&f=30&xml=raw','変換なし']].forEach(([qs,label])=>{
  const a=document.createElement('a');a.href='?'+qs;a.textContent=label;links.appendChild(a);
});

/* ---------- data: 画像のキャッシュ ---------- */
const imgs=new Map();
function img(key,svg){
  let im=imgs.get(key);if(im)return im;
  im=new Image();
  im.onload=()=>{st.ok++;};
  im.onerror=()=>{st.fail++;log('画像の読み込み失敗 '+key);};
  im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  imgs.set(key,im);return im;
}
const usable=im=>im.complete&&im.naturalWidth>0;

/* ---------- 投影 ---------- */
const toS=(gx,gy)=>({x:W/2+(gx-gy)*TW/2,y:WALL+(gx+gy)*TH/2});

/* 家具のダミー：上・左・右の面で明暗をつけた箱 */
const BOX_COL=[['#FFE3EC','#F7C3D4','#E6A3BA'],['#E3F4EA','#BFE5CC','#9CCFAE'],['#FFF3CF','#F7DF9C','#E6C772'],['#E6E3FF','#C9C3F2','#A9A2DE'],['#DDF1FF','#B5DDF7','#8EC4E8']];
function boxSVG(i,h){
  const [t,l,r]=BOX_COL[i];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 ${32+h}">`+
    `<path d="M0 16 L32 32 L32 ${32+h} L0 ${16+h}Z" fill="${l}" stroke="#B48AA0" stroke-width="1.5"/>`+
    `<path d="M64 16 L32 32 L32 ${32+h} L64 ${16+h}Z" fill="${r}" stroke="#B48AA0" stroke-width="1.5"/>`+
    `<path d="M32 0 L64 16 L32 32 L0 16Z" fill="${t}" stroke="#B48AA0" stroke-width="1.5"/></svg>`;
}
/* petSVG は HTML に直接入れる前提の文字列で、xmlns が無く、顔によっては同じ属性が 2 回ある（例：stroke-width）。
   data: 画像は XML として厳しく読まれ、そのままだと読み込みに失敗する（段階0で発見）。
   ?xml=raw で「xmlns を足すだけ」、既定は「HTML として読んで XML に書き出す」（重複した属性は HTML と同じく最初を使う＝今の見た目と同じ） */
const RAW=q.get('xml')==='raw';
const xs=new XMLSerializer();
function withNS(svg){
  if(RAW)return svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ');
  const el=new DOMParser().parseFromString(svg,'text/html').body.firstElementChild;
  return xs.serializeToString(el);
}
const FACES=['normal','happy','sleep'];
const forms=Array.from({length:N},(_,i)=>ZORDER[(i*5)%ZORDER.length]);
function petImg(form,face){return img('pet|'+form+'|'+face,withNS(petSVG(form,face,{})));}
forms.forEach(f=>FACES.forEach(face=>petImg(f,face)));

/* ---------- 物の配置 ---------- */
let seed=12345;const rnd=()=>{seed=(seed*1103515245+12345)>>>0;return seed/4294967296;};
const cells=[];for(let y=0;y<ROOM;y++)for(let x=0;x<ROOM;x++)cells.push({x,y});
for(let i=cells.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
const boxes=cells.slice(0,F).map((c,i)=>({kind:'box',x:c.x+.5,y:c.y+.5,h:20+(i%4)*14,im:null,ci:i%5}));
boxes.forEach(b=>{b.im=img('box|'+b.ci+'|'+b.h,boxSVG(b.ci,b.h));b.ih=32+b.h;});
const pets=forms.map((f,i)=>({kind:'pet',form:f,x:(i%ROOM)+.5,y:Math.floor(i/ROOM)*3+.5,tx:0,ty:0,face:0,dir:1}));
pets.forEach(p=>{p.tx=p.x;p.ty=p.y;});
function nextTarget(p){const c=cells[Math.floor(rnd()*cells.length)];p.tx=c.x+.5;p.ty=c.y+.5;}

/* ---------- 背景（床・壁）をオフスクリーンにキャッシュ ---------- */
let bg=null,scale=1,ox=0,oy=0;
function buildBg(){
  const dpr=Math.min(window.devicePixelRatio||1,DPR_MAX);
  const cw=cv.clientWidth,ch=cv.clientHeight;
  cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);
  scale=Math.min(cw/W,ch/H)*dpr;ox=(cv.width-W*scale)/2;oy=(cv.height-H*scale);
  bg=document.createElement('canvas');bg.width=cv.width;bg.height=cv.height;
  const g=bg.getContext('2d');g.setTransform(scale,0,0,scale,ox,oy);
  // 壁（左奥・右奥）
  const top=toS(0,0),L=toS(0,ROOM),R=toS(ROOM,0);
  g.fillStyle='#FCE4EC';g.beginPath();g.moveTo(L.x,L.y);g.lineTo(top.x,top.y);g.lineTo(top.x,top.y-WALL);g.lineTo(L.x,L.y-WALL);g.fill();
  g.fillStyle='#F8D5E0';g.beginPath();g.moveTo(R.x,R.y);g.lineTo(top.x,top.y);g.lineTo(top.x,top.y-WALL);g.lineTo(R.x,R.y-WALL);g.fill();
  // 床
  for(let y=0;y<ROOM;y++)for(let x=0;x<ROOM;x++){
    const a=toS(x,y);g.fillStyle=(x+y)%2?'#F6E3C6':'#F2DAB8';
    g.beginPath();g.moveTo(a.x,a.y);g.lineTo(a.x+TW/2,a.y+TH/2);g.lineTo(a.x,a.y+TH);g.lineTo(a.x-TW/2,a.y+TH/2);g.closePath();g.fill();
  }
  st.redraws++;
}
function checkImages(){
  let bad=0;for(const [k,im] of imgs){if(!usable(im)){bad++;const s=im.src;im.src='';im.src=s;}}
  if(bad)log('画像を読み直し '+bad+'件');
}

/* ---------- 1 フレーム ---------- */
function draw(dt){
  for(const p of pets){
    const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy),sp=1.2*dt;
    if(d<=sp){p.x=p.tx;p.y=p.ty;nextTarget(p);}
    else{p.x+=dx/d*sp;p.y+=dy/d*sp;if(dx-dy!==0)p.dir=Math.sign(dx-dy);}
  }
  const now=performance.now(),faceIdx=Math.floor(now/3000)%FACES.length;
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
  ctx.drawImage(bg,0,0);
  ctx.setTransform(scale,0,0,scale,ox,oy);
  const list=boxes.concat(pets).sort((a,b)=>(a.x+a.y)-(b.x+b.y)||a.x-b.x);
  for(const o of list){
    const s=toS(o.x,o.y);
    if(o.kind==='box'){if(usable(o.im))ctx.drawImage(o.im,s.x-32,s.y-16-o.h+0,64,o.ih);continue;}
    const im=petImg(o.form,FACES[faceIdx]);
    ctx.fillStyle='rgba(0,0,0,.10)';ctx.beginPath();ctx.ellipse(s.x,s.y,20,7,0,0,Math.PI*2);ctx.fill();
    if(!usable(im))continue;
    const k=1+.02*Math.sin(now/640+o.x);
    ctx.save();ctx.translate(s.x,s.y+4);ctx.scale(o.dir*(1/k),k);ctx.drawImage(im,-32,-62,64,64);ctx.restore();
  }
  // 夜の重ね（負荷の上乗せ分も測る）
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=.25;ctx.fillStyle='#1E2350';ctx.fillRect(0,0,cv.width,cv.height);ctx.globalAlpha=1;
}

let raf=0;
function loop(t){
  raf=requestAnimationFrame(loop);
  if(last&&t-last<1000/FPS-2)return;
  const dt=last?Math.min((t-last)/1000,.1):0;
  if(last){gaps.push(t-last);if(gaps.length>300)gaps.shift();}
  last=t;
  const a=performance.now();draw(dt);work.push(performance.now()-a);if(work.length>300)work.shift();
  frames++;
  if(t-fpsAt>=1000){fpsNow=frames*1000/(t-fpsAt);frames=0;fpsAt=t;showHud();}
}
const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const p95=a=>{if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(s.length*.95))];};
function stats(){return {n:N,f:F,fpsCap:FPS,dprMax:DPR_MAX,dpr:window.devicePixelRatio||1,fps:+fpsNow.toFixed(1),
  avg:+avg(work).toFixed(2),p95:+p95(work).toFixed(2),gapP95:+p95(gaps).toFixed(1),ok:st.ok,fail:st.fail,images:imgs.size,csp:st.csp,redraws:st.redraws,lost:st.lost,
  standalone:!!navigator.standalone};}
function showHud(){const s=stats();
  hud.textContent=`n=${s.n} f=${s.f} 上限${s.fpsCap}fps dpr=${Math.min(s.dpr,s.dprMax)}｜${s.fps}fps 描画 平均${s.avg}ms p95 ${s.p95}ms 間隔p95 ${s.gapP95}ms｜画像 ${s.ok}/${s.images} 失敗${s.fail} CSP違反${s.csp}｜描き直し${s.redraws}${s.standalone?'｜ホーム画面':''}`;}

/* ---------- 裏に回る・戻る ---------- */
function resume(why){
  if(document.hidden)return;
  log('もどった（'+why+'）');buildBg();checkImages();last=0;
  cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
}
document.addEventListener('visibilitychange',()=>{log('visibilitychange '+(document.hidden?'hidden':'visible'));
  if(document.hidden){cancelAnimationFrame(raf);}else resume('visibilitychange');});
window.addEventListener('pageshow',e=>{log('pageshow persisted='+e.persisted);if(e.persisted)resume('pageshow');});
window.addEventListener('pagehide',e=>log('pagehide persisted='+e.persisted));
let rzT=0;window.addEventListener('resize',()=>{clearTimeout(rzT);rzT=setTimeout(()=>{log('resize '+innerWidth+'x'+innerHeight);buildBg();},150);});
cv.addEventListener('contextlost',()=>{st.lost++;log('contextlost');cancelAnimationFrame(raf);});
cv.addEventListener('contextrestored',()=>resume('contextrestored'));

window.__spike={stats};
log(`開始 n=${N} f=${F} fps=${FPS} dpr上限=${DPR_MAX} 画面 ${innerWidth}x${innerHeight} standalone=${!!navigator.standalone}`);
buildBg();raf=requestAnimationFrame(loop);
