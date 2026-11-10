// おへや 段階0.5「ぷにの向き」の使い捨て試作。本番コードから import しない・sw.js の ASSETS に入れない・保存データに触らない。
// 比べるもの：
//  A 紙めくり：今の petSVG をそのまま横に縮める（cos θ）。裏は鏡像の正面。
//  B 2.5D：体の輪郭はそのまま（ほぼ回転体）、顔・おなか・めがねは丸い体の表面に貼ったものとして回す（横へすべって細くなり、裏では隠れる）。
//          耳・腕・足は左右の位置を回し、奥側は体のうしろに描く。頭の上のかざりは横幅だけ変える。まわりに浮くものは回さない。
// B の部品の形は js/art.js（petSVG・faceSVG・accSVG）から、この試作に必要な 4 姿（puni・hoshi・hakase・shabon）の分だけ写した。
// θ：0 が正面、+ で見ている人から見て右を向く（顔が右へ動く）。±180 が後ろ姿。
import {petSVG} from '../js/art.js';
import {FORMS} from '../js/data.js';

const FORM_IDS=['puni','hoshi','hakase','shabon'];
const BODY='M100 40 C150 40 175 80 175 125 C175 165 145 180 100 180 C55 180 25 165 25 125 C25 80 50 40 100 40 Z';
const INK='#5B3A55';
const RAD=Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function starPts(cx,cy,R,r){let p=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r:R;p.push((cx+rr*Math.cos(a)).toFixed(1)+','+(cy+rr*Math.sin(a)).toFixed(1));}return p.join(' ');}

/* 丸い体の表面の点（正面図で中心からの横のずれ u、その高さの半径 R）を θ だけ回す → 画面の x と、こちらを向いている度合い c（cos） */
function turnPt(u,R,th){const p=Math.asin(clamp(u/R,-1,1))+th;return {x:100+R*Math.sin(p),c:Math.cos(p),s:Math.sin(p)};}
/* 表面に貼った部品：中心 x0 の部品を、回したあとの位置へ移して横に c だけ縮める。裏に回ったら描かない */
function onSurface(svg,x0,R,th,minC=.06){
  const t=turnPt(x0-100,R,th);if(t.c<=minC)return '';
  return `<g transform="translate(${t.x.toFixed(2)} 0) scale(${t.c.toFixed(3)} 1) translate(${-x0} 0)">${svg}</g>`;
}

function faceParts(face){
  const ey=108,st=`stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const eye=x=>face==='happy'?`<path d="M${x-8} ${ey+3} Q${x} ${ey-8} ${x+8} ${ey+3}" ${st}/>`:`<circle cx="${x}" cy="${ey}" r="7.5" fill="${INK}"/><circle cx="${x+2.5}" cy="${ey-3}" r="2.6" fill="#fff"/>`;
  const mouth=face==='happy'?`<path d="M89 124 Q100 142 111 124 Z" fill="#FF7FA0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`:`<path d="M92 127 Q100 135 108 127" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  const blush=x=>`<ellipse cx="${x}" cy="124" rx="10" ry="5.5" fill="#FF9EBB" opacity=".75"/>`;
  return {eye,mouth,blush};
}

/* B：2.5D の petSVG（この試作の 4 姿だけ・腕は「よこ」だけ） */
function petSVG25(form,face,deg){
  const F=FORMS[form],col=F.color,dk=F.dark,baby=F.stage===1,th=deg*RAD;
  const R_FACE=62; // 顔を回す半径：体の輪郭（約 75）より小さくして、横を向いても顔が輪郭の内側に残るようにする
  const behind=[],front=[]; // front は今は使わない（腕を回さないため）
  // 耳（あかちゃん以外）：頭の円（半径 48）の上。いつも体のうしろに描く（正面図と同じ）。内側のピンクは前を向いているときだけ
  if(!baby)[58,142].forEach(x0=>{const t=turnPt(x0-100,48,th);
    behind.push(`<circle cx="${t.x.toFixed(2)}" cy="62" r="18" fill="${col}" stroke="${dk}" stroke-width="3"/>`+
      (t.c>.15?`<ellipse cx="${t.x.toFixed(2)}" cy="62" rx="${(8*t.c).toFixed(2)}" ry="8" fill="#FFB7CC"/>`:''));});
  // 腕：体の左右の端に置いたまま回さない（手前に回すと、おなかの前に輪が出て穴のように見えたため）
  behind.push(`<ellipse cx="33" cy="132" rx="11" ry="15" fill="${col}" stroke="${dk}" stroke-width="3" transform="rotate(25 33 132)"/><ellipse cx="167" cy="132" rx="11" ry="15" fill="${col}" stroke="${dk}" stroke-width="3" transform="rotate(-25 167 132)"/>`);
  // 足：いつも体のうしろ（正面図と同じ）
  const feet=[74,126].map(x0=>{const t=turnPt(x0-100,34,th);return `<ellipse cx="${t.x.toFixed(2)}" cy="180" rx="18" ry="9" fill="${dk}"/>`;}).join('');
  const body=`<path d="${BODY}" fill="${col}" stroke="${dk}" stroke-width="3.5"/>`+
    onSurface(`<ellipse cx="100" cy="150" rx="40" ry="24" fill="#fff" opacity=".5"/>`,100,62,th);
  const {eye,mouth,blush}=faceParts(face);
  let faceSvg=onSurface(blush(60),60,R_FACE,th,.2)+onSurface(blush(140),140,R_FACE,th,.2)+onSurface(eye(78),78,R_FACE,th)+onSurface(eye(122),122,R_FACE,th)+onSurface(mouth,100,R_FACE,th);
  // かざり
  const topK=(.55+.45*Math.abs(Math.cos(th))).toFixed(3);
  const top=svg=>`<g transform="translate(100 0) scale(${topK} 1) translate(-100 0)">${svg}</g>`;
  let topAcc='',floaters='';
  if(form==='puni')topAcc=top(`<path d="M100 42 q-9 -16 5 -21 q11 -2 7 9" fill="none" stroke="${dk}" stroke-width="4" stroke-linecap="round"/>`);
  if(form==='hoshi')topAcc=top(`<polygon points="${starPts(100,28,17,7.5)}" fill="#FFD84D" stroke="#E4B32E" stroke-width="2.5" stroke-linejoin="round"/>`);
  if(form==='hakase'){
    faceSvg+=onSurface(`<circle cx="78" cy="108" r="14" fill="none" stroke="${INK}" stroke-width="3"/>`,78,R_FACE,th)+
      onSurface(`<circle cx="122" cy="108" r="14" fill="none" stroke="${INK}" stroke-width="3"/>`,122,R_FACE,th)+
      onSurface(`<path d="M92 108 H108" stroke="${INK}" stroke-width="3"/>`,100,R_FACE,th);
    topAcc=top(`<rect x="80" y="34" width="40" height="12" rx="3" fill="#4B3B6B"/><polygon points="100,14 144,30 100,46 56,30" fill="#4B3B6B"/>`)+
      (()=>{const t=turnPt(38,44,th);return `<path d="M100 30 L${t.x.toFixed(2)} 34 L${t.x.toFixed(2)} 52" stroke="#FFD84D" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="${t.x.toFixed(2)}" cy="55" r="4.5" fill="#FFD84D"/>`;})();
  }
  if(form==='shabon')floaters=[[30,56,13],[170,48,10],[178,86,7],[22,94,6]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#E6FBFF" fill-opacity=".55" stroke="#8FD3D3" stroke-width="2"/><circle cx="${x-r*.35}" cy="${y-r*.35}" r="${r*.25}" fill="#fff"/>`).join('');
  const inner=behind.join('')+feet+body+faceSvg+front.join('')+topAcc;
  const g=baby?`<g transform="translate(100 118) scale(.84) translate(-100 -118)">${inner}</g>`:inner;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><ellipse cx="100" cy="190" rx="60" ry="7" fill="rgba(0,0,0,.08)"/>${g}${floaters}</svg>`;
}

/* ---------- data: 画像のキャッシュ ---------- */
const xs=new XMLSerializer();
const toXML=svg=>xs.serializeToString(new DOMParser().parseFromString(svg,'text/html').body.firstElementChild);
const cache=new Map();let made=0;
function image(key,make){
  let im=cache.get(key);if(im)return im;
  im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(make());made++;
  cache.set(key,im);
  if(cache.size>400){cache.delete(cache.keys().next().value);}
  return im;
}
const ready=im=>im.complete&&im.naturalWidth>0;
const norm=d=>((d+180)%360+360)%360-180;
function imgB(form,face,deg,buckets){
  const d=buckets?Math.round(norm(deg)/(360/buckets))*(360/buckets):Math.round(norm(deg));
  return image(`B|${form}|${face}|${d}`,()=>petSVG25(form,face,d));
}
const imgA=(form,face)=>image(`A|${form}|${face}`,()=>toXML(petSVG(form,face,{})));

/* ---------- 操作 ---------- */
const $=s=>document.querySelector(s);
let spinning=true,angle=0;
$('#spin').addEventListener('click',()=>{spinning=!spinning;$('#spin').textContent=spinning?'とめる':'まわす';});
$('#ang').addEventListener('input',e=>{angle=+e.target.value;spinning=false;$('#spin').textContent='まわす';});
const buckets=()=>+$('#buckets').value;
const face=()=>$('#face').value;

/* ---------- キャンバスの大きさ ---------- */
function fit(cv,w,h){const dpr=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(cv.clientWidth*dpr);cv.height=Math.round(cv.clientHeight*dpr);const k=Math.min(cv.width/w,cv.height/h);return {k,ox:(cv.width-w*k)/2,oy:(cv.height-h*k)/2};}
const turnCv=$('#turn'),walkCv=$('#walk'),tc=turnCv.getContext('2d'),wc=walkCv.getContext('2d');
let TF,WF;function resize(){TF=fit(turnCv,1000,500);WF=fit(walkCv,420,330);}
window.addEventListener('resize',resize);resize();

/* ---------- 上段：回して見比べる ---------- */
function drawTurn(){
  tc.setTransform(1,0,0,1,0,0);tc.clearRect(0,0,turnCv.width,turnCv.height);
  tc.setTransform(TF.k,0,0,TF.k,TF.ox,TF.oy);
  tc.fillStyle='#7A6274';tc.font='bold 16px sans-serif';
  tc.fillText('A',8,24);tc.fillText('B',8,274);
  FORM_IDS.forEach((f,i)=>{
    const cx=125+i*250;
    const a=imgA(f,face()),c=Math.cos(angle*RAD),sx=Math.abs(c)<.06?.06*Math.sign(c||1):c;
    if(ready(a)){tc.save();tc.translate(cx,20);tc.scale(sx,1);tc.drawImage(a,-100,0,200,200);tc.restore();}
    const b=imgB(f,face(),angle,buckets());
    if(ready(b))tc.drawImage(b,cx-100,270,200,200);
  });
}

/* ---------- 下段：おへやを歩いて向きを変える ---------- */
const N=6,W=N*64,H=N*32+112;
const toS=(gx,gy)=>({x:W/2+18+(gx-gy)*32,y:112+(gx+gy)*16});
const DIRS=[[1,0,45],[0,1,-45],[-1,0,-135],[0,-1,135]]; // gx+ は右手前・gy+ は左手前・gx- は左奥・gy- は右奥
let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)>>>0;return seed/4294967296;};
const walkers=[{form:'puni',x:2.5,y:2.5},{form:'hakase',x:4.5,y:1.5}].map(w=>({...w,tx:w.x,ty:w.y,face:0,want:0,pause:0,t:0,shown:null}));
function nextStep(w){
  if(rnd()<.3){w.pause=1.2+rnd();w.want=0;return;} // ときどき正面を向いて止まる
  const ok=DIRS.filter(([dx,dy])=>{const nx=w.x+dx,ny=w.y+dy;return nx>0&&ny>0&&nx<N&&ny<N;});
  const [dx,dy,ang]=ok[Math.floor(rnd()*ok.length)];w.tx=w.x+dx;w.ty=w.y+dy;w.want=ang;
}
function stepWalker(w,dt){
  // 向き：いちばん近い回り方で、毎秒 360° まで
  const diff=norm(w.want-w.face),turn=360*dt;
  w.face=norm(w.face+clamp(diff,-turn,turn));
  if(w.pause>0){w.pause-=dt;if(w.pause<=0)nextStep(w);return;}
  if(Math.abs(diff)>60)return; // 大きく向きを変えるときは、ほぼ向き終わってから歩き出す
  const dx=w.tx-w.x,dy=w.ty-w.y,d=Math.hypot(dx,dy),sp=1.2*dt;
  if(d<=sp){w.x=w.tx;w.y=w.ty;nextStep(w);}else{w.x+=dx/d*sp;w.y+=dy/d*sp;w.t+=dt;}
}
function drawWalk(now){
  wc.setTransform(1,0,0,1,0,0);wc.clearRect(0,0,walkCv.width,walkCv.height);
  wc.setTransform(WF.k,0,0,WF.k,WF.ox,WF.oy);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const a=toS(x,y);wc.fillStyle=(x+y)%2?'#F6E3C6':'#F2DAB8';
    wc.beginPath();wc.moveTo(a.x,a.y);wc.lineTo(a.x+32,a.y+16);wc.lineTo(a.x,a.y+32);wc.lineTo(a.x-32,a.y+16);wc.closePath();wc.fill();}
  walkers.slice().sort((a,b)=>(a.x+a.y)-(b.x+b.y)).forEach(w=>{
    const s=toS(w.x,w.y),want=imgB(w.form,face(),w.face,buckets());
    if(ready(want))w.shown=want; // 新しい向きの絵が読めるまでは、前に読めた絵を出す
    const im=w.shown||want;
    const bob=w.pause>0?0:Math.abs(Math.sin(w.t*Math.PI*2.4))*3; // 歩くときの小さな弾み
    const k=1+(w.pause>0?.02*Math.sin(now/640):-.04*Math.abs(Math.cos(w.t*Math.PI*2.4)));
    wc.fillStyle='rgba(0,0,0,.10)';wc.beginPath();wc.ellipse(s.x,s.y,20,7,0,0,Math.PI*2);wc.fill();
    if(im&&ready(im)){wc.save();wc.translate(s.x,s.y+4-bob);wc.scale(1/k,k);wc.drawImage(im,-36,-70,72,72);wc.restore();}
  });
}

/* ---------- ループ ---------- */
let last=0,frames=0,fpsAt=0,fps=0;
function loop(t){
  requestAnimationFrame(loop);
  if(last&&t-last<31)return;
  const dt=last?Math.min((t-last)/1000,.1):0;last=t;
  if(spinning){angle=norm(angle+60*dt);$('#ang').value=String(Math.round(angle));}
  $('#angOut').textContent=Math.round(angle)+'°';
  walkers.forEach(w=>stepWalker(w,dt));
  drawTurn();drawWalk(t);
  frames++;if(t-fpsAt>=1000){fps=frames*1000/(t-fpsAt||1);frames=0;fpsAt=t;
    $('#hud').textContent=`${fps.toFixed(0)}fps｜作った絵 ${made} 枚（キャッシュ ${cache.size}）`;}
}
walkers.forEach(nextStep);
requestAnimationFrame(loop);
window.__turn={petSVG25,stats:()=>({fps,made,cached:cache.size})};
