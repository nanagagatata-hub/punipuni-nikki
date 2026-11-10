// おへやの絵（床・壁・まど・ラグ）と固定の配置、家具の絵の振り分け。DOM には触れない。
// 仕様：docs/superpowers/specs/2026-11-10-oheya-stage0-1-design.md §3.1〜3.3、
//       docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md §8.1
// 投影は 2:1 アイソメ。マス (gx,gy) の上の頂点は
//   x=原点x+(gx-gy)*32, y=原点y+(gx+gy)*16  （マス (0,0) がいちばん奥）
// 共通の部品（線・多角形・箱・影）は room-art-kit.js、家具の絵は room-art-a.js / -b.js / -c.js にある。
import {SCENE} from './art.js';
import {ITEMS,has} from './room-data.js';
import {WALL_H,ST,f1,pts,poly,polyN,isoBox,footShadow,wrapSVG} from './room-art-kit.js';
import {ART_A} from './room-art-a.js';
import {ART_B} from './room-art-b.js';
import {ART_C} from './room-art-c.js';

export {TILE_W,TILE_H,WALL_H} from './room-art-kit.js';

/** @typedef {import('./room-art-kit.js').ItemArt} ItemArt */

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

  return wrapSVG(n*64,n*32+H,s);
}

/** 家具の絵の表（引く順）。同じ ID が 2 つの表にあれば先の表が勝つ（テストで ID の重なりは無いと固定） */
const ART_TABLES=[ART_A,ART_B,ART_C];

/**
 * 家具の絵。基準点 (ax,ay) は足もとの占有範囲の「上の頂点」（マス (x,y) の上の頂点）が絵のどこに来るか。
 * 部屋では (ox+(x-y)*32, WALL_H+(x+y)*16) をこの点に合わせて重ねる（向き r が奇数なら、この点を軸に左右反転）。
 * ART_A → ART_B → ART_C の順に引き、絵が無い ID には足あとの大きさの予備の箱を返す（部屋を止めないため）。
 * @param {string} id ITEMS の ID（知らない ID・文字列でない値は 1×1 の箱）
 * @returns {ItemArt}
 */
export function itemSVG(id){
  for(const T of ART_TABLES)if(has(T,id))return T[id]();
  const d=has(ITEMS,id)?ITEMS[id]:null;
  return spareBox(d?d.w:1,d?d.h:1);
}

// 予備の絵：足あと fw×fh マスの低い箱（ID を絵に入れない。足あとが同じなら同じ文字列）
function spareBox(fw,fh){
  const z=24, pad=5, ax=fh*32+pad, ay=z+pad, w=(fw+fh)*32+pad*2, h=z+(fw+fh)*16+pad*2;
  const body=footShadow(ax,ay,fw,fh)+isoBox(ax,ay,.1,.1,fw-.2,fh-.2,0,z,{top:'#FFF3DA',left:'#F4DDB4',right:'#E3C89E'});
  return {svg:wrapSVG(w,h,body),w,h,ax,ay};
}
