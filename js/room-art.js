// おへやの絵（床・壁・まど・ラグ・ほんだな・しょくぶつ）と固定の配置。DOM には触れない。
// 仕様：docs/superpowers/specs/2026-11-10-oheya-stage0-1-design.md §3.1〜3.3
// 投影は 2:1 アイソメ。マス (gx,gy) の上の頂点は
//   x=原点x+(gx-gy)*32, y=原点y+(gx+gy)*16  （マス (0,0) がいちばん奥）
import {SCENE} from './art.js';

export const TILE_W=64, TILE_H=32, WALL_H=112;

// 線は太めのやわらかい色（art.js と同じ方針）
const OL='#D2A99A', OW=3;
const ST=`stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round" stroke-linecap="round"`;
const f1=v=>Math.round(v*10)/10;
const pts=a=>a.map(p=>f1(p[0])+','+f1(p[1])).join(' ');
const poly=(a,fill,extra='')=>`<polygon points="${pts(a)}" fill="${fill}" ${ST} ${extra}/>`;
const polyN=(a,fill)=>`<polygon points="${pts(a)}" fill="${fill}"/>`;
// 角をまるくした多角形（rはまるめの長さ）
function roundPoly(a,r,fill,extra=''){
  const n=a.length;let d='';
  for(let i=0;i<n;i++){
    const p=a[i],q=a[(i+n-1)%n],s=a[(i+1)%n];
    const mv=(t,k)=>{const dx=t[0]-p[0],dy=t[1]-p[1],l=Math.hypot(dx,dy)||1,m=Math.min(r,l/2);return [p[0]+dx/l*m,p[1]+dy/l*m];};
    const A=mv(q),B=mv(s);
    d+=(i?'L':'M')+f1(A[0])+' '+f1(A[1])+'Q'+f1(p[0])+' '+f1(p[1])+' '+f1(B[0])+' '+f1(B[1]);
  }
  return `<path d="${d}Z" fill="${fill}" ${ST} ${extra}/>`;
}

/**
 * 部屋の固定の配置。n は 6・8・10。マス単位。
 * @param {6|8|10} n
 * @returns {{items:{id:'shelf'|'plant',x:number,y:number,w:number,h:number,walk:false}[],rug:{x:number,y:number,w:2,h:2},home:{x:number,y:number},window:{wall:'right',at:number}}}
 */
export function layout(n){
  const m=n/2;
  return {
    items:[
      {id:'shelf',x:0,y:m-1,w:1,h:2,walk:false},
      {id:'plant',x:n-1,y:0,w:1,h:1,walk:false}
    ],
    rug:{x:m-1,y:m-1,w:2,h:2},
    home:{x:m,y:m},
    window:{wall:'right',at:m}
  };
}

/**
 * 背景（床＋壁2面＋まど＋カーテン＋ラグ）の SVG 文字列。
 * 原点：マス (0,0) の上の頂点が (n*32, WALL_H)。viewBox は 0 0 n*64 (n*32+WALL_H)。
 * @param {6|8|10} n
 * @param {'asa'|'hiru'|'yuu'|'yoru'} band
 */
export function roomSVG(n,band){
  const S=SCENE[band]||SCENE.hiru, H=WALL_H, ox=n*32, gid='rsky-'+band;
  // 床の格子点 (gx,gy) の高さ h の位置
  const P=(gx,gy,h=0)=>[ox+(gx-gy)*32, H+(gx+gy)*16-h];
  const c=n/2;
  // 床
  let s=poly([P(0,0),P(n,0),P(n,n),P(0,n)],'#FFE9BD');
  for(let k=1;k<n;k++){const a=P(0,k),b=P(n,k);s+=`<path d="M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}" stroke="#F1D197" stroke-width="1.6" fill="none"/>`;}
  for(let j=0;j<n;j++){const g=(j*2.5+1)%n,a=P(g,j),b=P(g,j+1);s+=`<path d="M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}" stroke="#F1D197" stroke-width="1.6" fill="none"/>`;}
  // 壁（右奥＝gy=0 の辺、左奥＝gx=0 の辺）
  const wallR=g=>P(g,0), wallL=g=>P(0,g);
  const wall=(W,fill,dot)=>{
    let t=poly([W(0),W(n),[W(n)[0],W(n)[1]-H],[W(0)[0],W(0)[1]-H]],fill);
    for(let r=0;r<4;r++)for(let g=0.5+(r%2)*0.5;g<n;g+=1){const p=W(g);t+=`<circle cx="${f1(p[0])}" cy="${f1(p[1]-30-r*22)}" r="3.2" fill="${dot}"/>`;}
    return t;
  };
  const strip=(W,h0,h1,fill,extra='')=>polyN([[W(0)[0],W(0)[1]-h0],[W(n)[0],W(n)[1]-h0],[W(n)[0],W(n)[1]-h1],[W(0)[0],W(0)[1]-h1]],fill)+extra;
  s+=wall(wallL,'#FBC8DA','#FFEAF1')+wall(wallR,'#FFD5E3','#FFF0F5');
  // 幅木（ミント）と上の飾り（クリーム）
  for(const W of [wallL,wallR]){
    s+=strip(W,0,10,'#B9EAD2')+`<path d="M${f1(W(0)[0])} ${f1(W(0)[1]-10)}L${f1(W(n)[0])} ${f1(W(n)[1]-10)}" stroke="#8FD1B4" stroke-width="2" fill="none"/>`;
    s+=strip(W,H-7,H,'#FFF5E4');
  }
  // 壁のふち取り
  s+=`<path d="M${pts([P(0,n)])}L${pts([P(0,0)])}L${pts([P(n,0)])}" fill="none" ${ST}/>`;
  s+=`<path d="M${pts([P(0,n,0)])}L${pts([P(0,n,H)])}M${pts([P(0,0,0)])}L${pts([P(0,0,H)])}M${pts([P(n,0,0)])}L${pts([P(n,0,H)])}" fill="none" ${ST}/>`;
  s+=`<path d="M${pts([P(0,n,H)])}L${pts([P(0,0,H)])}L${pts([P(n,0,H)])}" fill="none" ${ST}/>`;
  s+=`<path d="M${pts([P(0,n)])}L${pts([P(n,n)])}L${pts([P(n,0)])}" fill="none" ${ST}/>`;

  // まど（右奥の壁の中央）
  const W=(g,h)=>P(g,0,h);
  s+=`<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">${S.sky.map((col,i)=>`<stop offset="${i/(S.sky.length-1)}" stop-color="${col}"/>`).join('')}</linearGradient></defs>`;
  s+=poly([W(c-1,32),W(c+1,32),W(c+1,96),W(c-1,96)],'#FFF5E4');
  const sky=[W(c-.88,40),W(c+.88,40),W(c+.88,88),W(c-.88,88)];
  s+=`<polygon points="${pts(sky)}" fill="url(#${gid})"/>`;
  const dot=(g,h,r,col)=>{const p=W(g,h);return `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${r}" fill="${col}"/>`;};
  if(band==='yoru'){
    s+=dot(c-.35,74,7.5,'#FFF3B0')+dot(c-.18,77,6,'#4A4690')+dot(c+.4,58,1.6,'#FFF8D6')+dot(c-.6,56,1.4,'#FFF8D6')+dot(c+.55,80,1.6,'#FFF8D6')+dot(c+.1,50,1.2,'#FFF8D6');
  }else if(band==='hiru'){
    s+=dot(c-.4,74,7,'#FFD84D')+dot(c+.35,62,5,'#FFFFFF')+dot(c+.5,60,4,'#FFFFFF')+dot(c+.2,60,4,'#FFFFFF');
  }else if(band==='yuu'){
    s+=dot(c+.3,52,9,'#FF7F50')+dot(c-.4,72,4,'#FFC9B0')+dot(c-.25,71,3.4,'#FFC9B0');
  }else{
    s+=dot(c-.45,50,9,'#FFB86B')+dot(c+.3,72,5,'#FFFFFF')+dot(c+.45,70,4,'#FFFFFF')+dot(c+.17,70,4,'#FFFFFF');
  }
  s+=`<path d="M${pts([W(c,40)])}L${pts([W(c,88)])}M${pts([W(c-.88,64)])}L${pts([W(c+.88,64)])}" stroke="#FFF5E4" stroke-width="4" fill="none"/>`;
  s+=poly([W(c-.88,40),W(c+.88,40),W(c+.88,88),W(c-.88,88)],'none');
  s+=poly([W(c-1.15,26),W(c+1.15,26),W(c+1.15,32),W(c-1.15,32)],'#FFF5E4');
  // カーテン
  const rod=[W(c-1.8,104),W(c+1.8,104)];
  s+=`<path d="M${pts([rod[0]])}L${pts([rod[1]])}" stroke="#C99A86" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  for(const e of rod)s+=`<circle cx="${f1(e[0])}" cy="${f1(e[1])}" r="4.2" fill="#FFD27A" ${ST}/>`;
  const curtain=(g0,g1,tie)=>{
    let t=`<path d="M${pts([W(g0,102)])}L${pts([W(g1,102)])}L${pts([W(g1,26)])}Q${pts([W((g0+g1)/2,34)])} ${pts([W(g0,24)])}Z" fill="#F7B4D0" ${ST}/>`;
    for(const g of [g0+(g1-g0)*.33,g0+(g1-g0)*.66])t+=`<path d="M${pts([W(g,98)])}L${pts([W(g,32)])}" stroke="#E995B8" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    const tp=W(tie,56);
    return t+`<ellipse cx="${f1(tp[0])}" cy="${f1(tp[1])}" rx="5" ry="6" fill="#FFF5E4" ${ST}/>`;
  };
  s+=curtain(c-1.6,c-1.05,c-1.32)+curtain(c+1.05,c+1.6,c+1.32);

  // ラグ（ラベンダー、スカラップのふち）
  const a=c-1, R=(gx,gy)=>P(gx,gy);
  const cor=[R(a,a),R(a+2,a),R(a+2,a+2),R(a,a+2)];
  for(let i=0;i<4;i++){
    const p=cor[i],q=cor[(i+1)%4];
    for(let k=0;k<6;k++){const t=(k+.5)/6,x=p[0]+(q[0]-p[0])*t,y=p[1]+(q[1]-p[1])*t;s+=`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="9" ry="5.6" fill="#CDB8F0" ${ST}/>`;}
  }
  s+=polyN(cor,'#CDB8F0');
  const d=.2,inn=[R(a+d,a+d),R(a+2-d,a+d),R(a+2-d,a+2-d),R(a+d,a+2-d)];
  s+=`<polygon points="${pts(inn)}" fill="#E6DAFA" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round"/>`;
  const mid=R(c,c);
  s+=[[0,-9],[10,0],[0,9],[-10,0]].map(([dx,dy])=>`<ellipse cx="${f1(mid[0]+dx)}" cy="${f1(mid[1]+dy)}" rx="6" ry="4.2" fill="#FFC1D8"/>`).join('')+`<ellipse cx="${f1(mid[0])}" cy="${f1(mid[1])}" rx="5" ry="3.4" fill="#FFE89A"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n*64} ${n*32+H}" width="${n*64}" height="${n*32+H}" aria-hidden="true">${s}</svg>`;
}

/**
 * 家具の絵。基準点 (ax,ay) は足もとの占有範囲の「上の頂点」（マス (x,y) の上の頂点）が絵のどこに来るか。
 * 部屋では (ox+(x-y)*32, WALL_H+(x+y)*16) をこの点に合わせて重ねる。
 * @param {'shelf'|'plant'} id
 * @returns {{svg:string,w:number,h:number,ax:number,ay:number}}
 */
export function itemSVG(id){
  return id==='shelf'?shelfSVG():plantSVG();
}

function shelfSVG(){
  const Hs=100, pad=6, ax=64+pad, ay=Hs+pad, w=64+32+pad*2, h=Hs+48+pad*2;
  // 足もとの格子点 (gx 0..1 奥行き, gy 0..2 はば) の高さ hh
  const Q=(gx,gy,hh=0)=>[ax+(gx-gy)*32, ay+(gx+gy)*16-hh];
  let s='';
  s+=`<ellipse cx="${ax-16}" cy="${ay+34}" rx="62" ry="20" fill="rgba(120,80,100,.14)"/>`;
  // 左の面（はしっこ）＝ふつう、右の面（本のある側）＝暗い、上＝明るい
  s+=poly([Q(0,2,Hs),Q(1,2,Hs),Q(1,2,0),Q(0,2,0)],'#F4DDB4');
  s+=polyN([Q(0,2,0),Q(1,2,0),Q(1,2,9),Q(0,2,9)],'#A9DEC6');
  s+=poly([Q(1,0,Hs),Q(1,2,Hs),Q(1,2,0),Q(1,0,0)],'#E3C89E');
  // くぼみ（ミント）と板と本
  const F=(u,hh)=>Q(1,u,hh);
  s+=polyN([F(.14,10),F(1.86,10),F(1.86,Hs-10),F(.14,Hs-10)],'#8FD0B3');
  const cols=['#FF9EBB','#8FBFF5','#FFD84D','#B6E39A','#C2A4EE','#FFAE8A','#7FD6D0'];
  let ci=0;
  for(let r=0;r<3;r++){
    const base=12+r*29;
    let u=.2;
    while(u<1.74){
      const bw=.1+((ci*37)%5)*.025, bh=17+((ci*53)%4)*3, col=cols[ci%cols.length];ci++;
      if(u+bw>1.8)break;
      s+=polyN([F(u,base),F(u+bw,base),F(u+bw,base+bh),F(u,base+bh)],col)+`<path d="M${pts([F(u,base+bh)])}L${pts([F(u+bw,base+bh)])}" stroke="rgba(255,255,255,.55)" stroke-width="2" fill="none"/>`;
      u+=bw+.025;
    }
    s+=polyN([F(.14,base-3),F(1.86,base-3),F(1.86,base+1),F(.14,base+1)],'#F6E3BE');
  }
  s+=polyN([F(.14,Hs-10),F(1.86,Hs-10),F(1.86,Hs-15),F(.14,Hs-15)],'#F6E3BE');
  s+=polyN([F(.14,10),F(1.86,10),F(1.86,Hs-10),F(.14,Hs-10)],'rgba(110,70,90,.10)');
  // 外わくの線
  s+=`<path d="M${pts([F(.14,10)])}L${pts([F(1.86,10)])}L${pts([F(1.86,Hs-10)])}L${pts([F(.14,Hs-10)])}Z" fill="none" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`;
  // 上のまるい天板
  s+=roundPoly([Q(0,0,Hs),Q(1,0,Hs),Q(1,2,Hs),Q(0,2,Hs)],9,'#FFF3DA');
  s+=roundPoly([Q(.22,.3,Hs),Q(.78,.3,Hs),Q(.78,1.7,Hs),Q(.22,1.7,Hs)],5,'#FFFFFF','opacity=".55"').replace(ST,'');
  return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${s}</svg>`,w,h,ax,ay};
}

function plantSVG(){
  const w=76, ax=38, h=104, ay=74, cx=ax, cy=ay+16; // cy＝マスの中心
  const leaf=(x,y,r)=>`<circle cx="${cx+x}" cy="${cy+y}" r="${r}" fill="#8FCB8A" ${ST}/><circle cx="${cx+x-r*.2}" cy="${cy+y-r*.22}" r="${r*.68}" fill="#B6E8A6"/><circle cx="${cx+x-r*.38}" cy="${cy+y-r*.4}" r="${r*.2}" fill="#E1F8D2"/>`;
  const L=[[0,-64,15],[-19,-49,13],[19,-51,13],[-7,-42,11]];
  let s=`<ellipse cx="${cx}" cy="${cy}" rx="27" ry="11" fill="rgba(120,80,100,.14)"/>`;
  s+=L.map(([x,y])=>`<path d="M${cx} ${cy-26}L${cx+x} ${cy+y}" stroke="#7DB98A" stroke-width="3.5" stroke-linecap="round"/>`).join('');
  s+=`<path d="M${cx-18} ${cy-26}L${cx-13} ${cy-4}Q${cx} ${cy+4} ${cx+13} ${cy-4}L${cx+18} ${cy-26}Z" fill="#FFB3C9" ${ST}/>`;
  s+=`<path d="M${cx+1} ${cy-26}L${cx+17} ${cy-26}L${cx+12.5} ${cy-4.5}Q${cx+6} ${cy-1} ${cx+1} ${cy-.6}Z" fill="#F596B4"/>`;
  s+=`<ellipse cx="${cx}" cy="${cy-26}" rx="20" ry="9" fill="#FFD3E1" ${ST}/><ellipse cx="${cx}" cy="${cy-26}" rx="14.5" ry="6" fill="#A87762"/>`;
  s+=`<circle cx="${cx-8}" cy="${cy-14}" r="2.3" fill="#FFF0F5"/><circle cx="${cx+1}" cy="${cy-9}" r="2.3" fill="#FFF0F5"/>`;
  s+=L.map(([x,y,r])=>leaf(x,y,r)).join('');
  return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${s}</svg>`,w,h,ax,ay};
}
