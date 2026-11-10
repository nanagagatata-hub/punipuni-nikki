// おへやの家具の絵・グループ B（DOM に触れない。import は room-art-kit.js だけ）
// 受け持ち：bed・sofa・table・chair・desk（tests/helpers/art-check.js の GROUPS.B）
//
// 書き方（契約のくわしい説明と例は room-art-kit.js の先頭。実例は room-art-a.js の shelf・plant）：
//   1. 引数なしで {svg,w,h,ax,ay} を返す関数を 1 アイテムにつき 1 つ書く（svg は wrapSVG(w,h,body)）。
//   2. 下の ART_B に `アイテムid: 関数` を足す。キーは受け持ちの ID だけ。
//   3. node --test tests/*.test.js と dev/item-sheet.html?g=B で確かめる。
// room-art.js の itemSVG(id) が ART_A → ART_B → ART_C の順に引く（無い ID は予備の箱になる）。
//
// 向き：r=0 で「前」は +gx（画面の右下）。せもたれ・ヘッドボードは gx=0 の側（奥）に置く。
import {OL,ST,SHADOW,f1,pts,poly,polyN,roundPoly,isoPt,isoBox,wrapSVG} from './room-art-kit.js';

/** @typedef {import('./room-art-kit.js').ItemArt} ItemArt */
/** @typedef {{top:string,left:string,right:string}} Col */

// ---- 色（上＝明るい・左＝ふつう・右＝暗い） ----
/** @type {Col} */ const WOOD={top:'#FFF3DA',left:'#F4DDB4',right:'#E3C89E'};
/** @type {Col} */ const WOOD2={top:'#F6DDB6',left:'#E9C799',right:'#D6AF80'};
/** @type {Col} */ const SHEET={top:'#FFFFFF',left:'#F4EEF6',right:'#E4D9EA'};
/** @type {Col} */ const PINK={top:'#FFD9E6',left:'#FFBCD2',right:'#F2A2BE'};
/** @type {Col} */ const PEACH={top:'#FFE1D3',left:'#FFC6B0',right:'#F2AC95'};
/** @type {Col} */ const MINT={top:'#D9F5E8',left:'#B5E6CF',right:'#97D5BA'};
/** @type {Col} */ const LAV={top:'#ECE2FF',left:'#D6C6F7',right:'#BFAAEC'};

// ---- 小さな部品 ----
/** 線なしの角まる多角形 */
const roundN=(a,r,fill)=>roundPoly(a,r,fill).replace(ST,'');
/** 細い線つきの多角形（引き出しの前板など） */
const thin=(a,fill,sw=2)=>`<polygon points="${pts(a)}" fill="${fill}" stroke="${OL}" stroke-width="${sw}" stroke-linejoin="round"/>`;
/** 点 → 円（線つき） */
const dot=(p,r,fill,sw=2)=>`<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${r}" fill="${fill}" stroke="${OL}" stroke-width="${sw}"/>`;
/** 点 → 円（線なし） */
const dotN=(p,r,fill)=>`<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${r}" fill="${fill}"/>`;
/** 足もとの影（だ円）。(cx,cy) は中心 */
const shadowE=(cx,cy,rx,ry)=>`<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${rx}" ry="${ry}" fill="${SHADOW}"/>`;

/**
 * ふっくらした箱（クッション・マットレス・ひじかけ）。外形も上の面も角をまるくする。
 * Q は (gx,gy,z) → 点。範囲は gx:x0〜x1、gy:y0〜y1、高さ z0〜z1。
 * @param {(gx:number,gy:number,z?:number)=>[number,number]} Q
 */
function soft(Q,x0,y0,x1,y1,z0,z1,col,r=6){
  const H=[Q(x0,y0,z1),Q(x1,y0,z1),Q(x1,y0,z0),Q(x1,y1,z0),Q(x0,y1,z0),Q(x0,y1,z1)];
  const R=[Q(x1,y0,z1),Q(x1,y1,z1),Q(x1,y1,z0),Q(x1,y0,z0)];
  const T=[Q(x0,y0,z1),Q(x1,y0,z1),Q(x1,y1,z1),Q(x0,y1,z1)];
  return roundN(H,r,col.left)+roundN(R,r,col.right)+roundPoly(H,r,'none')+roundPoly(T,r,col.top);
}
/** 上の面のつや（白くうすい角まる） */
function shine(Q,x0,y0,x1,y1,z,r=4){
  return roundN([Q(x0,y0,z),Q(x1,y0,z),Q(x1,y1,z),Q(x0,y1,z)],r,'rgba(255,255,255,.6)');
}
/** gx＝一定 の面の上に、(u＝gy, z) で書いた点の列をのせる（ヘッドボード・引き出しの前板） */
const onFaceX=(Q,gx)=>(u,z)=>Q(gx,u,z);

// べっど（足あと 2×2）。奥（gx=0）にアーチのヘッドボード、手前に ももいろの かけぶとん
function bed(){
  const Hm=80, pad=6, ax=64+pad, ay=Hm+pad, w=128+pad*2, h=Hm+64+pad*2;
  const Q=(gx,gy,z=0)=>isoPt(ax,ay,gx,gy,z);
  const Hh=u=>62+14*Math.sin(Math.PI*u/2); // ヘッドボードの高さ（まんなかが高い）
  let s=shadowE(ax,ay+34,74,30);
  // ヘッドボード（gx 0〜.16、gy 0〜2）
  const N=16, us=[...Array(N+1)].map((_,i)=>i*2/N);
  const F=onFaceX(Q,.16), B=onFaceX(Q,0);
  s+=poly([...us.map(u=>B(u,Hh(u))),...us.slice().reverse().map(u=>F(u,Hh(u)))],WOOD.top);
  s+=poly([F(0,0),...us.map(u=>F(u,Hh(u))),F(2,0)],WOOD.right);
  s+=poly([B(2,0),F(2,0),F(2,Hh(2)),B(2,Hh(2))],WOOD.left);
  // ヘッドボードの飾り：ほし と まるい点
  const star=(cu,cz,R)=>{const p=[];for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rr=k%2?R*.45:R;p.push(F(cu+Math.cos(a)*rr/35.8,cz-Math.sin(a)*rr));}return thin(p,'#FFE27A');};
  s+=star(1,54,11);
  s+=dotN(F(.45,48),3,'#FFB3C9')+dotN(F(1.55,48),3,'#B5E6CF');
  // あし（手前の 2 本）とわく
  s+=isoBox(ax,ay,1.82,0,.16,.14,0,10,WOOD2);
  s+=isoBox(ax,ay,1.82,1.84,.16,.16,0,10,WOOD2);
  s+=isoBox(ax,ay,.16,1.84,.16,.16,0,10,WOOD2);
  s+=isoBox(ax,ay,.16,0,1.84,2,9,22,WOOD);
  // マットレス・まくら
  s+=soft(Q,.2,.05,1.95,1.95,20,31,SHEET,7);
  s+=soft(Q,.3,.38,.78,1.62,30,40,{top:'#F2FAFF',left:'#DCEFFC',right:'#C6E2F6'},8);
  s+=shine(Q,.42,.55,.6,1.1,40,4);
  // かけぶとん（ふちを折り返した白い帯つき）
  s+=soft(Q,.86,-.02,2.02,2.02,14,34,PINK,8);
  s+=polyN([Q(.95,.06,34),Q(1.12,.06,34),Q(1.12,1.94,34),Q(.95,1.94,34)],'#FFFFFF');
  s+=`<path d="M${pts([Q(1.12,.06,34)])}L${pts([Q(1.12,1.94,34)])}" stroke="${OL}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  // みずたま（上の面）
  for(const [gx,gy] of [[1.4,.4],[1.4,1.15],[1.75,.75],[1.75,1.55],[1.4,1.8],[1.75,.1]])
    if(gy>.12&&gy<1.88)s+=`<ellipse cx="${f1(Q(gx,gy,34)[0])}" cy="${f1(Q(gx,gy,34)[1])}" rx="5" ry="2.6" fill="#FFF3F7"/>`;
  // みずたま（横の面）
  for(const u of [1.25,1.65])s+=dotN(Q(u,2.02,24),2.6,'#FFE6EE');
  for(const u of [.4,1.1])s+=dotN(Q(2.02,u+.1,24),2.4,'#FFD3E1');
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}

// そふぁ（足あと 1×2）。奥（gx=0）に せもたれ、gy の両はしに ひじかけ
function sofa(){
  const Hm=62, pad=6, ax=64+pad, ay=Hm+pad, w=96+pad*2, h=Hm+48+pad*2;
  const Q=(gx,gy,z=0)=>isoPt(ax,ay,gx,gy,z);
  let s=shadowE(ax-16,ay+25,54,22);
  // ちいさな あし
  s+=isoBox(ax,ay,.84,.06,.1,.1,0,7,WOOD2)+isoBox(ax,ay,.84,1.84,.1,.1,0,7,WOOD2)+isoBox(ax,ay,.06,1.84,.1,.1,0,7,WOOD2);
  // 土台
  s+=soft(Q,0,0,1,2,5,20,PEACH,5);
  // せもたれ
  s+=soft(Q,0,.02,.34,1.98,18,60,PEACH,10);
  // ボタン（せもたれの前の面）
  for(const u of [.55,1,1.45])s+=dotN(Q(.34,u,46),2.2,'#E8957E');
  // 奥の ひじかけ → ざぶとん 2 つ → 手前の ひじかけ
  s+=soft(Q,.02,0,1,.3,18,42,PEACH,9);
  s+=soft(Q,.3,.28,.98,1.01,18,29,{top:'#FFF0E8',left:'#FFDCCB',right:'#F5C3AE'},6);
  s+=soft(Q,.3,.99,.98,1.72,18,29,{top:'#FFF0E8',left:'#FFDCCB',right:'#F5C3AE'},6);
  s+=shine(Q,.45,.45,.7,.75,29,3)+shine(Q,.45,1.16,.7,1.46,29,3);
  // まるい クッション（ミント）
  const c=Q(.42,.5,38);
  s+=`<ellipse cx="${f1(c[0])}" cy="${f1(c[1])}" rx="9" ry="10" fill="${MINT.left}" ${ST}/>`+dotN([c[0]-2.5,c[1]-3.5],3,'#EFFFF7');
  s+=soft(Q,.02,1.7,1,2,18,42,PEACH,9);
  s+=shine(Q,.25,1.78,.75,1.9,42,2);
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}

// ちゃぶだい（足あと 1×1）。まるい ひくい テーブルに、おちゃと おかし
function table(){
  const Hm=34, pad=6, ax=32+pad, ay=Hm+pad, w=64+pad*2, h=Hm+32+pad*2;
  const Q=(gx,gy,z=0)=>isoPt(ax,ay,gx,gy,z);
  const cx=ax, R=.48, rx=f1(R*32*Math.SQRT2), ry=f1(R*16*Math.SQRT2);
  const zt=20, th=6, yT=ay+16-zt, yB=yT+th;
  let s=shadowE(cx,ay+17,rx+3,ry+2);
  // あし 4 本（奥から。奥の 2 本はほとんど天板にかくれる）
  for(const [gx,gy] of [[.2,.5],[.5,.2],[.8,.5],[.5,.8]])s+=isoBox(ax,ay,gx-.07,gy-.07,.14,.14,0,zt-th+1,WOOD2);
  // 天板のふち（左＝ふつう、右＝暗い）
  const band=`M${f1(cx-rx)} ${yT}L${f1(cx-rx)} ${yB}A${rx} ${ry} 0 0 0 ${f1(cx+rx)} ${yB}L${f1(cx+rx)} ${yT}Z`;
  s+=`<path d="${band}" fill="${WOOD2.left}"/>`;
  s+=`<path d="M${cx} ${yT+ry}L${cx} ${yB+ry}A${rx} ${ry} 0 0 0 ${f1(cx+rx)} ${yB}L${f1(cx+rx)} ${yT}Z" fill="${WOOD2.right}"/>`;
  s+=`<path d="${band}" fill="none" ${ST}/>`;
  // 天板
  s+=`<ellipse cx="${cx}" cy="${yT}" rx="${rx}" ry="${ry}" fill="${WOOD.top}" ${ST}/>`;
  s+=`<ellipse cx="${cx}" cy="${yT}" rx="${f1(rx-6)}" ry="${f1(ry-3)}" fill="none" stroke="#EBD3A9" stroke-width="1.6"/>`;
  // おさら と おだんご
  const pl=Q(.42,.62,zt);
  s+=`<ellipse cx="${f1(pl[0])}" cy="${f1(pl[1])}" rx="8" ry="4" fill="#FFFFFF" stroke="${OL}" stroke-width="1.6"/>`;
  s+=dot([pl[0]-3,pl[1]-3],3.2,'#FFC2D6',1.4)+dot([pl[0]+3,pl[1]-3.5],3.2,'#C9EFB9',1.4);
  // ゆのみ
  const cu=Q(.62,.32,zt);
  s+=`<path d="M${f1(cu[0]-4.5)} ${f1(cu[1]-9)}L${f1(cu[0]-3.8)} ${f1(cu[1]-1)}Q${f1(cu[0])} ${f1(cu[1]+1.5)} ${f1(cu[0]+3.8)} ${f1(cu[1]-1)}L${f1(cu[0]+4.5)} ${f1(cu[1]-9)}Z" fill="#BFE3FA" stroke="${OL}" stroke-width="1.6" stroke-linejoin="round"/>`;
  s+=`<ellipse cx="${f1(cu[0])}" cy="${f1(cu[1]-9)}" rx="4.5" ry="1.8" fill="#C9E7A7" stroke="${OL}" stroke-width="1.2"/>`;
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}

// いす（足あと 1×1）。奥（gx=0）に ハートの穴の せもたれ、ももいろの ざぶとん
function chair(){
  const Hm=74, pad=6, ax=32+pad, ay=Hm+pad, w=64+pad*2, h=Hm+32+pad*2;
  const Q=(gx,gy,z=0)=>isoPt(ax,ay,gx,gy,z);
  const zs=28, L=.14;
  let s=shadowE(ax,ay+17,26,12);
  // あし 4 本（奥から）
  for(const [gx,gy] of [[.16,.16],[.16,.7],[.7,.16],[.7,.7]])s+=isoBox(ax,ay,gx,gy,L,L,0,zs-4,WOOD2);
  // 座面
  s+=isoBox(ax,ay,.14,.14,.72,.72,zs-6,zs,WOOD);
  s+=soft(Q,.24,.2,.84,.8,zs,zs+6,PINK,5);
  // せもたれ（gx .14〜.26。上はまるい）
  const F=onFaceX(Q,.26), B=onFaceX(Q,.14);
  const N=12, us=[...Array(N+1)].map((_,i)=>.14+i*.72/N);
  const top=u=>zs+30+8*Math.sin(Math.PI*(u-.14)/.72);
  s+=poly([...us.map(u=>B(u,top(u))),...us.slice().reverse().map(u=>F(u,top(u)))],WOOD.top);
  s+=poly([B(.86,zs),F(.86,zs),F(.86,top(.86)),B(.86,top(.86))],WOOD.left);
  s+=poly([F(.14,zs),...us.map(u=>F(u,top(u))),F(.86,zs)],WOOD.right);
  // ハート
  const hc=.5, hz=zs+22, k=1/35.8;
  const hp=[[0,7],[-7,0],[-7,-3.5],[-3.5,-6],[0,-3],[3.5,-6],[7,-3.5],[7,0]].map(([du,dz])=>F(hc+du*k,hz-dz));
  s+=roundPoly(hp,2.5,'#FF9EBB').replace(`stroke-width="${3}"`,'stroke-width="1.6"');
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}

// つくえ（足あと 1×2）。手前（gy=2 の側）に ひきだし、上に ふでたて と ほん
function desk(){
  const Hm=84, pad=6, ax=64+pad, ay=Hm+pad, w=96+pad*2, h=Hm+48+pad*2;
  const Q=(gx,gy,z=0)=>isoPt(ax,ay,gx,gy,z);
  const zt=52, tt=8;
  let s=shadowE(ax-16,ay+25,54,22);
  // 奥の あし板・うしろの板
  s+=isoBox(ax,ay,.1,.08,.8,.14,0,zt,WOOD2);
  s+=isoBox(ax,ay,.1,.22,.1,1,18,zt,WOOD2);
  // ひきだしの箱
  s+=isoBox(ax,ay,.1,1.2,.8,.72,0,zt,WOOD);
  const F=onFaceX(Q,.9);
  for(const [z0,z1,col] of [[6,24,MINT.right],[29,47,LAV.right]]){
    s+=thin([F(1.28,z0),F(1.84,z0),F(1.84,z1),F(1.28,z1)],col);
    s+=dot(F(1.56,(z0+z1)/2),2.6,'#FFB3C9',1.4);
  }
  // 天板（すこし はみ出す・角まる）
  s+=soft(Q,0,0,1,2,zt,zt+tt,WOOD,4);
  // ほん（2 さつ）
  s+=isoBox(ax,ay,.3,1.15,.5,.55,zt+tt,zt+tt+5,{top:'#FFFFFF',left:'#8FBFF5',right:'#76A8E6'});
  s+=isoBox(ax,ay,.34,1.2,.42,.46,zt+tt+5,zt+tt+9,{top:'#FFFFFF',left:'#FFB3C9',right:'#F296B2'});
  // ふでたて と えんぴつ
  const c=Q(.45,.5,zt+tt);
  for(const [dx,ht,col] of [[-3,22,'#FFD84D'],[1,25,'#8FD0B3'],[4,20,'#FF9EBB']])
    s+=`<path d="M${f1(c[0]+dx)} ${f1(c[1]-8)}L${f1(c[0]+dx)} ${f1(c[1]-ht)}" stroke="${col}" stroke-width="3" stroke-linecap="round"/><circle cx="${f1(c[0]+dx)}" cy="${f1(c[1]-ht)}" r="1.2" fill="#8A6A5A"/>`;
  s+=`<path d="M${f1(c[0]-6)} ${f1(c[1]-12)}L${f1(c[0]-6)} ${f1(c[1])}A6 2.6 0 0 0 ${f1(c[0]+6)} ${f1(c[1])}L${f1(c[0]+6)} ${f1(c[1]-12)}Z" fill="${LAV.left}" ${ST}/>`;
  s+=`<ellipse cx="${f1(c[0])}" cy="${f1(c[1]-12)}" rx="6" ry="2.6" fill="${LAV.right}" stroke="${OL}" stroke-width="2"/>`;
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}

/** グループ B の絵の表（凍結・プロトタイプなし。引くときは room-data.js の has(ART_B,id)）
 * @type {Readonly<{[id:string]:()=>ItemArt}>} */
export const ART_B=Object.freeze(Object.assign(Object.create(null),{
  bed,
  sofa,
  table,
  chair,
  desk,
}));
