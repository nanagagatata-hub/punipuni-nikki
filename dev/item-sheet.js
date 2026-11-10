// 家具の絵の確認ページ（開発用・アプリからはリンクしない・sw.js の ASSETS に入れない）
//   dev/item-sheet.html?g=A|B|C|all … 各アイテムを 4 つの向き（r=0〜3）で 1 行に並べる
//   dev/item-sheet.html?g=pat       … ゆか・かべの 8 柄の見本（room-art.js に patternSVG があれば）
// 見かた：
//   うすい青のひし形＝足あと（ITEMS の w×h マス。r が奇数は w と h が入れ替わる）、灰色の線＝マスの格子、
//   赤い点＝基準点 (ax,ay)＝足あとの上の頂点。r が奇数の絵は、部屋と同じく基準点を軸に scale(-1,1) で反転する。
//   絵は部屋と同じく <img src="data:image/svg+xml…"> で描く（XML として壊れていると赤わくになる）。
import {ITEMS,FLOORS,WALLS,has} from '../js/room-data.js';
import * as RA from '../js/room-art.js';
import {ART_A} from '../js/room-art-a.js';
import {ART_B} from '../js/room-art-b.js';
import {ART_C} from '../js/room-art-c.js';

// tests/helpers/art-check.js の GROUPS と同じ（あちらは Node 専用なので写してある。変えるときは両方）
const GROUPS={
  A:['rug','rug_pink','rug_mint','shelf','plant','lamp','ball','plush'],
  B:['bed','sofa','table','chair','desk'],
  C:['toybox','cushion','tent','slide'],
};
const TABLES={A:ART_A,B:ART_B,C:ART_C};
const MODES=['A','B','C','all','pat'];
const NS='http://www.w3.org/2000/svg';
const M=24; // 絵のまわりの余白（px）

const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const svgEl=(tag,attrs)=>{const e=document.createElementNS(NS,tag);for(const k of Object.keys(attrs))e.setAttribute(k,String(attrs[k]));return e;};
const dataURI=svg=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);

let bad=0;

/** §8.1 の「形式」（tests/helpers/art-check.js の checkArt と同じ式）。破っている項目の一覧を返す */
function formatNG(art,fw,fh){
  const ng=[];
  for(const k of ['w','h','ax','ay'])if(!(Number.isFinite(art[k])&&art[k]>0))ng.push(`${k} が正の数でない`);
  if(typeof art.svg!=='string'){ng.push('svg が文字列でない');return ng;}
  if(art.svg.length>20000)ng.push(`20,000 文字をこえる（${art.svg.length}）`);
  if(!(art.ax>=fh*32))ng.push(`ax>=${fh*32}`);
  if(!(art.w-art.ax>=fw*32))ng.push(`w-ax>=${fw*32}`);
  if(!(art.h-art.ay>=(fw+fh)*16))ng.push(`h-ay>=${(fw+fh)*16}`);
  if(!(art.ay<=150))ng.push('ay<=150');
  return ng;
}

/** 1 つの向きの絵（格子・足あと → 絵 → 足あとの線・基準点 の順に重ねる） */
function cell(id,art,fw,fh,r){
  const odd=r%2===1, dw=odd?fh:fw, dh=odd?fw:fh; // 画面に出る足あと
  const X=Math.ceil(Math.max(art.ax,art.w-art.ax,fw*32,fh*32))+M;      // 基準点の x（反転しても入る幅）
  const Y=Math.ceil(art.ay)+M;                                        // 基準点の y
  const W=X*2, H=Y+Math.ceil(Math.max(art.h-art.ay,(fw+fh)*16))+M;
  const P=(gx,gy)=>[X+(gx-gy)*32, Y+(gx+gy)*16];
  const line=(a,b,attrs)=>svgEl('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],...attrs});
  const diamond=attrs=>svgEl('polygon',{points:[P(0,0),P(dw,0),P(dw,dh),P(0,dh)].map(p=>p.join(',')).join(' '),...attrs});

  const fig=el('figure','cell'), stage=el('div','stage');
  stage.style.width=W+'px';stage.style.height=H+'px';

  const under=svgEl('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,'aria-hidden':'true'});
  for(let k=-8;k<=12;k++){
    under.appendChild(line(P(k,-8),P(k,12),{stroke:'#E3DCD6','stroke-width':1}));
    under.appendChild(line(P(-8,k),P(12,k),{stroke:'#E3DCD6','stroke-width':1}));
  }
  under.appendChild(diamond({fill:'#CFE6FF',stroke:'#7DB4F0','stroke-width':1.5}));
  stage.appendChild(under);

  const img=el('img');
  img.alt='';img.width=art.w;img.height=art.h;
  img.style.left=(X-art.ax)+'px';img.style.top=(Y-art.ay)+'px';
  img.style.width=art.w+'px';img.style.height=art.h+'px';
  if(odd){img.style.transformOrigin=`${art.ax}px ${art.ay}px`;img.style.transform='scale(-1,1)';}
  img.addEventListener('error',()=>{fig.classList.add('bad');bad++;console.error(`item-sheet: ${id} の絵が読めない（SVG が XML として壊れている？）`);report();});
  img.src=dataURI(art.svg);
  stage.appendChild(img);

  const over=svgEl('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,'aria-hidden':'true'});
  over.appendChild(diamond({fill:'none',stroke:'#4A90E2','stroke-width':1,'stroke-dasharray':'3 4',opacity:.7}));
  over.appendChild(svgEl('circle',{cx:X,cy:Y,r:3.5,fill:'#E53935',stroke:'#FFFFFF','stroke-width':1}));
  stage.appendChild(over);

  fig.appendChild(stage);
  fig.appendChild(el('figcaption','',`r=${r}${odd?'（反転）':''}　足あと ${dw}×${dh}`));
  return fig;
}

/** 1 アイテムの行（説明＋4 つの向き） */
function row(id,g){
  const d=has(ITEMS,id)?ITEMS[id]:null, fw=d?d.w:1, fh=d?d.h:1;
  const own=has(TABLES[g],id);
  const art=RA.itemSVG(id);
  const ng=formatNG(art,fw,fh);
  if(ng.length){bad++;console.error(`item-sheet: ${id} が形式を破っている: ${ng.join(' / ')}`);}

  const r=el('div','row'), info=el('div','info');
  r.dataset.id=id;
  info.appendChild(el('b','',id));
  info.appendChild(el('div','',d?d.name:'（カタログに無い ID）'));
  info.appendChild(el('span',own?'tag':'tag spare',own?`専用の絵（グループ ${g}）`:'予備の箱（まだ絵が無い）'));
  info.appendChild(el('div','',`足あと ${fw}×${fh}${d&&d.flat?'・平ら':''}${d&&d.walk?'・歩ける':''}`));
  info.appendChild(el('div','',`絵 ${art.w}×${art.h}　基準点 (${art.ax},${art.ay})`));
  info.appendChild(el('div','',`${typeof art.svg==='string'?art.svg.length:'?'} 文字`));
  info.appendChild(ng.length?el('div','ng','形式 NG: '+ng.join(' / ')):el('div','ok','形式 OK'));
  r.appendChild(info);
  if(typeof art.svg==='string')for(let k=0;k<4;k++)r.appendChild(cell(id,art,fw,fh,k));
  return r;
}

function drawItems(g){
  const sheet=$('sheet'), gs=g==='all'?['A','B','C']:[g];
  let n=0,spare=0;
  for(const k of gs){
    sheet.appendChild(el('h2','',`グループ ${k}`));
    for(const id of GROUPS[k]){sheet.appendChild(row(id,k));n++;if(!has(TABLES[k],id))spare++;}
  }
  return `${n} 種（専用の絵 ${n-spare}・予備の箱 ${spare}）`;
}

function drawPatterns(){
  const sheet=$('sheet');
  if(typeof RA.patternSVG!=='function')return 'patternSVG はまだ room-art.js にありません（ゆか・かべの柄を作る作業のあとで見られます）';
  let n=0;
  for(const [title,T] of [['ゆか',FLOORS],['かべ',WALLS]]){
    sheet.appendChild(el('h2','',title));
    const box=el('div','pats');
    for(const id of Object.keys(T)){
      const out=RA.patternSVG(id), svg=typeof out==='string'?out:(out&&out.svg);
      const fig=el('figure','pat'), img=el('img');
      img.alt='';
      img.addEventListener('error',()=>{fig.classList.add('bad');bad++;console.error(`item-sheet: ${id} の見本が読めない`);report();});
      if(typeof svg==='string')img.src=dataURI(svg);else{bad++;console.error(`item-sheet: patternSVG('${id}') が SVG を返さない`);}
      fig.appendChild(img);
      fig.appendChild(el('figcaption','',`${id}　${T[id].name}`));
      box.appendChild(fig);n++;
    }
    sheet.appendChild(box);
  }
  return `${n} 柄（見本は 96×64 を 2 倍で表示）`;
}

let summary='';
function report(){
  const note=$('note');
  note.textContent=summary+(bad?`　／　問題 ${bad} 件（コンソールを見る）`:'　／　問題なし');
  note.classList.toggle('bad',bad>0);
}

function main(){
  const q=new URLSearchParams(location.search).get('g');
  const g=MODES.includes(q)?q:'all';
  const nav=$('nav');
  for(const m of MODES){
    const a=el('a',m===g?'on':'',m==='pat'?'ゆか・かべ':m==='all'?'ぜんぶ':'グループ '+m);
    a.href='?g='+m;
    nav.appendChild(a);
  }
  summary=g==='pat'?drawPatterns():drawItems(g);
  report();
}
main();
