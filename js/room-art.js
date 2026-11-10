// おへやの絵（床・壁・まど とその柄）と、家具の絵の振り分け。DOM には触れない。
// 仕様：docs/superpowers/specs/2026-11-10-oheya-stage0-1-design.md §3.1〜3.3、
//       docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md §8.1
// 投影は 2:1 アイソメ。マス (gx,gy) の上の頂点は
//   x=原点x+(gx-gy)*32, y=原点y+(gx+gy)*16  （マス (0,0) がいちばん奥）
// 共通の部品（線・多角形・箱・影）は room-art-kit.js、家具の絵は room-art-a.js / -b.js / -c.js にある。
import {SCENE} from './art.js';
import {ITEMS,DEFAULT_FLOOR,DEFAULT_WALL,has} from './room-data.js';
import {WALL_H,ST,f1,pts,poly,polyN,isoBox,footShadow,wrapSVG} from './room-art-kit.js';
import {ART_A} from './room-art-a.js';
import {ART_B} from './room-art-b.js';
import {ART_C} from './room-art-c.js';

export {TILE_W,TILE_H,WALL_H} from './room-art-kit.js';

/** @typedef {import('./room-art-kit.js').ItemArt} ItemArt */

// ---- ゆか・かべの柄 ----
// 床の柄：(P,n) → SVG 片。P(gx,gy) は床の格子点。床のひし形 P(0,0)〜P(n,n) の中だけに描く。
const line2=(a,b,col,w)=>`<path d="M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}" stroke="${col}" stroke-width="${w}" fill="none"/>`;
const floorBase=(P,n,fill)=>poly([P(0,0),P(n,0),P(n,n),P(0,n)],fill);
// 床の上に寝かせた だ円（アイソメの平面：横 rx・たて rx/2）
const flatE=(p,dx,dy,rx,fill)=>`<ellipse cx="${f1(p[0]+dx)}" cy="${f1(p[1]+dy)}" rx="${rx}" ry="${f1(rx*.5)}" fill="${fill}"/>`;
const FLOOR_ART={
  // はちみついろの板張り（gx の向きに板。つなぎ目をずらす）
  f_honey(P,n){
    let s=floorBase(P,n,'#FFE9BD');
    for(let k=1;k<n;k++)s+=line2(P(0,k),P(n,k),'#F1D197',1.6);
    for(let j=0;j<n;j++){const g=(j*2.5+1)%n;s+=line2(P(g,j),P(g,j+1),'#F1D197',1.6);}
    return s;
  },
  // みんといろの板張り（gy の向きに板）
  f_mint(P,n){
    let s=floorBase(P,n,'#D8F3E5');
    for(let k=1;k<n;k++)s+=line2(P(k,0),P(k,n),'#B2E0C8',1.6);
    for(let j=0;j<n;j++){const g=(j*2.5+1.5)%n;s+=line2(P(j,g),P(j+1,g),'#B2E0C8',1.6);}
    return s;
  },
  // 2 色の いちまつ（クリームと ももいろ）
  f_check(P,n){
    let s=floorBase(P,n,'#FFF6E4');
    for(let i=0;i<n;i++)for(let j=0;j<n;j++)if((i+j)%2)s+=polyN([P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1)],'#FFDCE6');
    return s;
  },
  // そらいろの じゅうたんに、まっしろの くも
  f_cloud(P,n){
    let s=floorBase(P,n,'#DCEDFF');
    // くもを置くマスと ずらしは i,j だけで決める（乱数を使わない）。くもは となりのマスへ少しはみ出すので、
    // 手前の 2 辺（i=n-1・j=n-1）のマスには置かない（床のふちの外へ出ないように。奥の 2 辺は壁がかくす）
    for(let i=0;i<n-1;i++)for(let j=0;j<n-1;j++){
      const h=(i*5+j*3)%7;
      if(h!==0&&h!==3)continue;
      const c=P(i+.5,j+.5), dx=((i*13+j*7)%5-2)*2, z=h?1.1:1.3;
      const E=(x,y,rx,fill)=>flatE(c,dx+x*z,y*z,f1(rx*z),fill);
      s+=E(1,3,15,'#C6DDF6');                                         // くもの かげ
      s+=E(-9,1,9,'#FFFFFF')+E(10,1,10,'#FFFFFF')+E(2,-3,10,'#FFFFFF')+E(0,1,14,'#FFFFFF');
    }
    return s;
  },
};

// 壁の柄：L＝左奥の壁の色、R＝右奥の壁の色（左が少し濃い）、deco(A,n,k)＝壁の上の模様。
// A(g,h) は壁の点（g＝壁にそったマス、h＝床からの高さ px）。k は壁を横に 1px 進んだときの y の変化（右奥 +.5・左奥 -.5・見本 0）。
// 星や雲は k で壁の向きに傾ける。
const skew=(c,k,xy)=>xy.map(([u,v])=>[c[0]+u,c[1]+u*k+v]);
const STAR=Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?3.2:7.6;return [Math.cos(a)*r,Math.sin(a)*r];});
const CLOUD=(c,k,fill)=>{
  const e=(u,v,rx,ry)=>{const p=skew(c,k,[[u,v]])[0];return `<ellipse cx="${f1(p[0])}" cy="${f1(p[1])}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;};
  return e(-9,2,8,6)+e(9,2,9,6)+e(0,-3,9,8)+e(0,3,14,5.5);
};
const WALL_ART={
  // うすピンクに 白い みずたま
  w_pink:{L:'#FBC8DA',R:'#FFD5E3',dot:{L:'#FFEAF1',R:'#FFF0F5'},deco(A,n,k,side){
    let t='';
    for(let r=0;r<4;r++)for(let g=0.5+(r%2)*0.5;g<n;g+=1){const p=A(g,30+r*22);t+=`<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="3.2" fill="${this.dot[side]}"/>`;}
    return t;
  }},
  // クリームに ラベンダーの たてじま
  w_stripe:{L:'#F6EEDD',R:'#FFF7E8',dot:{L:'#DCCDF6',R:'#E6DAFB'},deco(A,n,k,side){
    let t='';
    for(let g=0.25;g<n;g+=0.5){
      t+=polyN([A(g,0),A(g+.2,0),A(g+.2,WALL_H),A(g,WALL_H)],this.dot[side]);
      t+=line2(A(g+.33,0),A(g+.33,WALL_H),'#FFFFFF',1.4);
    }
    return t;
  }},
  // ふじいろに きいろの おほしさま
  w_star:{L:'#D6D3F5',R:'#E2DFFA',dot:{L:'#FFF1A8',R:'#FFF5BC'},deco(A,n,k,side){
    let t='';
    for(let r=0;r<4;r++)for(let g=0.5+(r%2)*0.5,i=0;g<n;g+=1,i++){
      const p=A(g,30+r*22);
      if((i+r)%2===0)t+=`<polygon points="${pts(skew(p,k,STAR))}" fill="${this.dot[side]}" stroke="#F2D77A" stroke-width="1" stroke-linejoin="round"/>`;
      else t+=`<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="1.8" fill="#FFFFFF"/>`;
    }
    return t;
  }},
  // そらいろに 白い くも
  w_sky:{L:'#C3E2F8',R:'#D2EBFC',dot:{L:'#FFFFFF',R:'#FFFFFF'},deco(A,n,k,side){
    let t='';
    for(let r=0;r<2;r++)for(let g=0.8+r*1.1;g<n-.4;g+=2.2)t+=CLOUD(A(g,40+r*42),k,this.dot[side]);
    return t;
  }},
};

/**
 * 背景（床＋壁2面＋まど＋カーテン）の SVG 文字列。ラグは家具（ART_A.rug）が描く。
 * 原点：マス (0,0) の上の頂点が (n*32, WALL_H)。viewBox は 0 0 n*64 (n*32+WALL_H)。
 * SVG の id は 'rsky-<band>-<wall>'（時間帯・壁の柄ごとに別）。
 * @param {6|8|10} n
 * @param {'asa'|'hiru'|'yuu'|'yoru'} band
 * @param {string} [floorId] FLOORS の ID（省略・知らない ID は DEFAULT_FLOOR）
 * @param {string} [wallId] WALLS の ID（省略・知らない ID は DEFAULT_WALL）
 */
export function roomSVG(n,band,floorId,wallId){
  const fid=has(FLOOR_ART,floorId)?floorId:DEFAULT_FLOOR, wid=has(WALL_ART,wallId)?wallId:DEFAULT_WALL;
  const WA=WALL_ART[wid];
  const S=SCENE[band]||SCENE.hiru, H=WALL_H, ox=n*32, gid='rsky-'+band+'-'+wid;
  // 床の格子点 (gx,gy) の高さ h の位置
  const P=(gx,gy,h=0)=>[ox+(gx-gy)*32, H+(gx+gy)*16-h];
  const c=n/2;
  // 床
  let s=FLOOR_ART[fid](P,n);
  // 壁（右奥＝gy=0 の辺、左奥＝gx=0 の辺）
  const wallR=g=>P(g,0), wallL=g=>P(0,g);
  const wall=(W,side,k)=>{
    const A=(g,h)=>{const p=W(g);return [p[0],p[1]-h];};
    return poly([W(0),W(n),[W(n)[0],W(n)[1]-H],[W(0)[0],W(0)[1]-H]],WA[side])+WA.deco(A,n,k,side);
  };
  const strip=(W,h0,h1,fill,extra='')=>polyN([[W(0)[0],W(0)[1]-h0],[W(n)[0],W(n)[1]-h0],[W(n)[0],W(n)[1]-h1],[W(0)[0],W(0)[1]-h1]],fill)+extra;
  s+=wall(wallL,'L',-.5)+wall(wallR,'R',.5);
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

  return wrapSVG(n*64,n*32+H,s);
}

/**
 * ゆか・かべの見本（96×64）。おみせ・もようがえの ボタンに使う。知らない ID は ''。
 * ゆかは 8×8 の床の まんなかを 1/2 で、かべは まっすぐ前から見た壁（幅木・上の飾りつき）を 4/7 で切り取る。
 * @param {string} id FLOORS か WALLS の ID
 * @returns {string}
 */
export function patternSVG(id){
  if(has(FLOOR_ART,id)){
    const n=8,P=(gx,gy)=>[n*32+(gx-gy)*32,(gx+gy)*16];
    return wrapSVG(96,64,`<g transform="translate(48 32) scale(.5) translate(${-n*32} ${-n*16})">${FLOOR_ART[id](P,n)}</g>`);
  }
  if(has(WALL_ART,id)){
    const WA=WALL_ART[id],H=WALL_H,n=5,U=36,A=(g,h)=>[g*U,H-h],R=(h0,h1,fill)=>polyN([A(0,h0),A(n,h0),A(n,h1),A(0,h1)],fill);
    const body=R(0,H,WA.R)+WA.deco(A,n,0,'R')+R(0,10,'#B9EAD2')+line2(A(0,10),A(n,10),'#8FD1B4',2)+R(H-7,H,'#FFF5E4');
    return wrapSVG(96,64,`<g transform="scale(${f1(64/H*100)/100})">${body}</g>`);
  }
  return '';
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
