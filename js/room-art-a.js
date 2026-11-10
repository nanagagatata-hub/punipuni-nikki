// おへやの家具の絵・グループ A（DOM に触れない。import は room-art-kit.js だけ）
// 受け持ち：rug・rug_pink・rug_mint・shelf・plant・lamp・ball・plush（tests/helpers/art-check.js の GROUPS.A）
//
// 書き方（契約のくわしい説明と例は room-art-kit.js の先頭）：
//   1. 引数なしで {svg,w,h,ax,ay} を返す関数を 1 アイテムにつき 1 つ書く（svg は wrapSVG(w,h,body)）。
//   2. 下の ART_A に `アイテムid: 関数` を足す。キーは受け持ちの ID だけ。
//   3. node --test tests/*.test.js と dev/item-sheet.html?g=A で確かめる。
// room-art.js の itemSVG(id) が ART_A → ART_B → ART_C の順に引く（無い ID は予備の箱になる）。
import {OL,ST,SHADOW,pts,poly,polyN,roundPoly,isoPt,wrapSVG} from './room-art-kit.js';

/** @typedef {import('./room-art-kit.js').ItemArt} ItemArt */

// ほんだな（足あと 1×2）
function shelf(){
  const Hs=100, pad=6, ax=64+pad, ay=Hs+pad, w=64+32+pad*2, h=Hs+48+pad*2;
  // 足もとの格子点 (gx 0..1 奥行き, gy 0..2 はば) の高さ hh
  const Q=(gx,gy,hh=0)=>isoPt(ax,ay,gx,gy,hh);
  let s='';
  s+=`<ellipse cx="${ax-16}" cy="${ay+34}" rx="62" ry="20" fill="${SHADOW}"/>`;
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
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}

// かんようしょくぶつ（足あと 1×1）
function plant(){
  // h は 足あとの下の頂点（ay+32）まで入る大きさ。段階1 の 104 から 2 のばした（中身は同じ）
  const w=76, ax=38, h=106, ay=74, cx=ax, cy=ay+16; // cy＝マスの中心
  const leaf=(x,y,r)=>`<circle cx="${cx+x}" cy="${cy+y}" r="${r}" fill="#8FCB8A" ${ST}/><circle cx="${cx+x-r*.2}" cy="${cy+y-r*.22}" r="${r*.68}" fill="#B6E8A6"/><circle cx="${cx+x-r*.38}" cy="${cy+y-r*.4}" r="${r*.2}" fill="#E1F8D2"/>`;
  const L=[[0,-64,15],[-19,-49,13],[19,-51,13],[-7,-42,11]];
  let s=`<ellipse cx="${cx}" cy="${cy}" rx="27" ry="11" fill="${SHADOW}"/>`;
  s+=L.map(([x,y])=>`<path d="M${cx} ${cy-26}L${cx+x} ${cy+y}" stroke="#7DB98A" stroke-width="3.5" stroke-linecap="round"/>`).join('');
  s+=`<path d="M${cx-18} ${cy-26}L${cx-13} ${cy-4}Q${cx} ${cy+4} ${cx+13} ${cy-4}L${cx+18} ${cy-26}Z" fill="#FFB3C9" ${ST}/>`;
  s+=`<path d="M${cx+1} ${cy-26}L${cx+17} ${cy-26}L${cx+12.5} ${cy-4.5}Q${cx+6} ${cy-1} ${cx+1} ${cy-.6}Z" fill="#F596B4"/>`;
  s+=`<ellipse cx="${cx}" cy="${cy-26}" rx="20" ry="9" fill="#FFD3E1" ${ST}/><ellipse cx="${cx}" cy="${cy-26}" rx="14.5" ry="6" fill="#A87762"/>`;
  s+=`<circle cx="${cx-8}" cy="${cy-14}" r="2.3" fill="#FFF0F5"/><circle cx="${cx+1}" cy="${cy-9}" r="2.3" fill="#FFF0F5"/>`;
  s+=L.map(([x,y,r])=>leaf(x,y,r)).join('');
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}

/** グループ A の絵の表（凍結・プロトタイプなし。引くときは room-data.js の has(ART_A,id)）
 * @type {Readonly<{[id:string]:()=>ItemArt}>} */
export const ART_A=Object.freeze(Object.assign(Object.create(null),{
  shelf,
  plant,
}));
