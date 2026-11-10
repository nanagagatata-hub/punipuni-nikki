// おへやの絵の共通部品（DOM に触れない・何も import しない）。
// 背景（room-art.js）と家具の絵（room-art-a.js / -b.js / -c.js）が使う。
// 決まりの出どころ：docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md §8.1
//
// ■ 投影（2:1 アイソメ）
//   マス (gx,gy) の「上の頂点」は、基準点 (ax,ay) から  x=ax+(gx-gy)*32, y=ay+(gx+gy)*16。高さ h（px）は y から引く。
//   +gx は画面の右下へ、+gy は画面の左下へのびる。1 マスは 横 64×たて 32 のひし形。→ isoPt()
//
// ■ 家具の絵（ItemArt）の契約
//   絵の関数は引数なしで {svg,w,h,ax,ay} を返す（ID だけで決まる。乱数・時刻・入力値を使わない）。
//     svg   … wrapSVG(w,h,body) で作った 1 枚の SVG 文字列（20,000 文字以下）
//     w,h   … 絵の大きさ（px。viewBox と同じ）
//     ax,ay … 足あと（ITEMS の w×h マス）の「上の頂点」＝マス (0,0) の上の頂点が、絵の中のどこに来るか（px）
//   足あと fw×fh マス（fw＝ITEMS[id].w、fh＝ITEMS[id].h）のひし形の 4 頂点は
//     上 (ax,ay)  右 (ax+fw*32, ay+fw*16)  下 (ax+(fw-fh)*32, ay+(fw+fh)*16)  左 (ax-fh*32, ay+fh*16)
//   これが絵の中に収まること：  ax>=fh*32   w-ax>=fw*32   h-ay>=(fw+fh)*16
//   高さは ay<=150。線（太さ 3）や影が切れないよう、まわりに 4〜6px の余白を足す。
//   向き r が奇数のとき、部屋は基準点を軸に左右反転（scale(-1,1)）して描く。向きごとの絵は描かない。
//
// ■ 見た目
//   線は ST（色 OL・太さ OW）。上の面＝明るい、左の面（+gy 側）＝ふつう、右の面（+gx 側）＝暗い。足もとに SHADOW の影。
//
// ■ 安全（tests/helpers/art-check.js の checkArt が確かめる）
//   <script>・on…=・style=・href・外部 URL を書かない。同じタグに同じ属性を 2 回書かない
//   （poly()・roundPoly() の extra に fill・stroke 系を足さない）。id= を使うなら 'ri-<アイテムid>-' で始める。
//
// ■ 例（1×1 マスの箱）
//   function boxArt(){
//     const z=30, pad=5, ax=32+pad, ay=z+pad, w=64+pad*2, h=z+32+pad*2;
//     const body=footShadow(ax,ay,1,1)+isoBox(ax,ay,.1,.1,.8,.8,0,z,{top:'#FFF3DA',left:'#F4DDB4',right:'#E3C89E'});
//     return {svg:wrapSVG(w,h,body),w,h,ax,ay};
//   }
//   確認：node --test tests/*.test.js と dev/item-sheet.html?g=A|B|C|all

/** @typedef {{svg:string,w:number,h:number,ax:number,ay:number}} ItemArt */

/** 1 マスの横・たて（px）と、壁の高さ（px） */
export const TILE_W=64, TILE_H=32, WALL_H=112;

/** 線の色と太さ（art.js と同じ方針：太めのやわらかい色） */
export const OL='#D2A99A', OW=3;
/** 線の属性文字列（stroke・stroke-width・stroke-linejoin・stroke-linecap）。タグの中にそのまま入れる */
export const ST=`stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round" stroke-linecap="round"`;
/** 足もとの影の色 */
export const SHADOW='rgba(120,80,100,.14)';

/** 小数 1 けたに丸める（SVG を短くする） @param {number} v @returns {number} */
export const f1=v=>Math.round(v*10)/10;
/** 点の列 → `points` 用の文字列 "x,y x,y …" @param {[number,number][]} a @returns {string} */
export const pts=a=>a.map(p=>f1(p[0])+','+f1(p[1])).join(' ');
/** 線つきの多角形。extra は追加の属性（例 'opacity=".5"'。fill・stroke 系は足さない）
 * @param {[number,number][]} a @param {string} fill @param {string} [extra] @returns {string} */
export const poly=(a,fill,extra='')=>`<polygon points="${pts(a)}" fill="${fill}" ${ST} ${extra}/>`;
/** 線なしの多角形 @param {[number,number][]} a @param {string} fill @returns {string} */
export const polyN=(a,fill)=>`<polygon points="${pts(a)}" fill="${fill}"/>`;
/** 角をまるくした線つきの多角形（r はまるめの長さ px）
 * @param {[number,number][]} a @param {number} r @param {string} fill @param {string} [extra] @returns {string} */
export function roundPoly(a,r,fill,extra=''){
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
 * マス座標 → 絵の中の点。(gx,gy) は小数でもよい（マスの中心は +0.5）。
 * @param {number} ax 基準点 x @param {number} ay 基準点 y
 * @param {number} gx @param {number} gy @param {number} [h] 床からの高さ（px）
 * @returns {[number,number]} [ax+(gx-gy)*32, ay+(gx+gy)*16-h]
 */
export function isoPt(ax,ay,gx,gy,h=0){
  return [ax+(gx-gy)*32, ay+(gx+gy)*16-h];
}

/**
 * 箱の見える 3 面（左→右→上の順に重ねる。どれも線つき）。
 * 床の範囲は gx: x0〜x0+w、gy: y0〜y0+h（マス単位・小数可）、高さは z0〜z1（px）。
 * left＝+gy 側の面（画面の左下向き・ふつう）、right＝+gx 側の面（右下向き・暗い）、top＝上の面（明るい）。
 * @param {number} ax @param {number} ay
 * @param {number} x0 @param {number} y0 @param {number} w @param {number} h
 * @param {number} z0 @param {number} z1
 * @param {{top:string,left:string,right:string}} col 3 面の色
 * @returns {string}
 */
export function isoBox(ax,ay,x0,y0,w,h,z0,z1,col){
  const P=(gx,gy,z)=>isoPt(ax,ay,gx,gy,z), x1=x0+w, y1=y0+h;
  return poly([P(x0,y1,z1),P(x1,y1,z1),P(x1,y1,z0),P(x0,y1,z0)],col.left)
    +poly([P(x1,y0,z1),P(x1,y1,z1),P(x1,y1,z0),P(x1,y0,z0)],col.right)
    +poly([P(x0,y0,z1),P(x1,y0,z1),P(x1,y1,z1),P(x0,y1,z1)],col.top);
}

/**
 * 足あと（w×h マス）のひし形の影（色 SHADOW・線なし）。絵のいちばん下に置く。
 * @param {number} ax @param {number} ay @param {number} w @param {number} h @returns {string}
 */
export function footShadow(ax,ay,w,h){
  return polyN([isoPt(ax,ay,0,0),isoPt(ax,ay,w,0),isoPt(ax,ay,w,h),isoPt(ax,ay,0,h)],SHADOW);
}

/**
 * 中身を 1 枚の SVG にする（xmlns つき・viewBox="0 0 w h"・width/height・aria-hidden）。
 * @param {number} w @param {number} h @param {string} body @returns {string}
 */
export function wrapSVG(w,h,body){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${body}</svg>`;
}
