// おへやの家具の絵・グループ A（DOM に触れない。import は room-art-kit.js だけ）
// 受け持ち：rug・rug_pink・rug_mint・shelf・plant・lamp・ball・plush（tests/helpers/art-check.js の GROUPS.A）
//
// 書き方（契約のくわしい説明と例は room-art-kit.js の先頭）：
//   1. 引数なしで {svg,w,h,ax,ay} を返す関数を 1 アイテムにつき 1 つ書く（svg は wrapSVG(w,h,body)）。
//   2. 下の ART_A に `アイテムid: 関数` を足す。キーは受け持ちの ID だけ。
//   3. node --test tests/*.test.js と dev/item-sheet.html?g=A で確かめる。
// room-art.js の itemSVG(id) が ART_A → ART_B → ART_C の順に引く（無い ID は予備の箱になる）。
import {OL,ST,SHADOW,f1,pts,poly,polyN,roundPoly,isoPt,wrapSVG} from './room-art-kit.js';

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

// ラグ（足あと 2×2・平たい）。段階1 の roomSVG のラグ（スカラップのふち・点線のぬい目・まん中の花）を
// 家具として描き直したもの。厚み 3px：手前の 2 辺のふちを 1 段下に、左（+gy 側）＝ふつう・右（+gx 側）＝暗い で重ねる。
/** @param {{base:string,inner:string,mid:string,dark:string,petal:string,heart:string}} c */
function rugArt(c){
  const T=3, pad=9, ax=64+pad, ay=pad, w=128+pad*2, h=64+T+pad*2;
  const R=(gx,gy,z=0)=>isoPt(ax,ay,gx,gy,z);
  const cor=[R(0,0),R(2,0),R(2,2),R(0,2)];
  // 辺 i（cor[i]→cor[i+1]）に沿ったスカラップ。dy＝下へずらす量
  const scal=(i,fill,dy)=>{
    const p=cor[i],q=cor[(i+1)%4];let t='';
    for(let k=0;k<6;k++){const u=(k+.5)/6;t+=`<ellipse cx="${f1(p[0]+(q[0]-p[0])*u)}" cy="${f1(p[1]+(q[1]-p[1])*u+dy)}" rx="9" ry="5.6" fill="${fill}" ${ST}/>`;}
    return t;
  };
  let s='';
  // 厚み（下の段）：奥の 2 辺→手前の左（ふつう）→手前の右（暗い）
  s+=scal(0,c.mid,T)+scal(3,c.mid,T)+scal(2,c.mid,T)+scal(1,c.dark,T);
  s+=polyN(cor.map(p=>[p[0],p[1]+T]),c.mid);
  // 上の面
  for(let i=0;i<4;i++)s+=scal(i,c.base,0);
  s+=polyN(cor,c.base);
  const d=.2,inn=[R(d,d),R(2-d,d),R(2-d,2-d),R(d,2-d)];
  s+=`<polygon points="${pts(inn)}" fill="${c.inner}" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round"/>`;
  // まん中の花（花びら 4 まい＋しべ）と、すみの小さなハート
  const m=R(1,1);
  s+=[[0,-9],[10,0],[0,9],[-10,0]].map(([dx,dy])=>`<ellipse cx="${f1(m[0]+dx)}" cy="${f1(m[1]+dy)}" rx="6" ry="4.2" fill="${c.petal}"/>`).join('')
    +`<ellipse cx="${f1(m[0])}" cy="${f1(m[1])}" rx="5" ry="3.4" fill="#FFE89A"/>`;
  for(const [gx,gy] of [[.55,.55],[1.45,.55],[1.45,1.45],[.55,1.45]]){
    const [x,y]=R(gx,gy);
    s+=`<path d="M${f1(x)} ${f1(y+3)}C${f1(x-6)} ${f1(y-1)} ${f1(x-3)} ${f1(y-5)} ${f1(x)} ${f1(y-2.2)}C${f1(x+3)} ${f1(y-5)} ${f1(x+6)} ${f1(y-1)} ${f1(x)} ${f1(y+3)}Z" fill="${c.heart}"/>`;
  }
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}
const rug=()=>rugArt({base:'#CDB8F0',inner:'#E6DAFA',mid:'#B9A1E3',dark:'#A58BD3',petal:'#FFC1D8',heart:'#FFFFFF'});
const rug_pink=()=>rugArt({base:'#FFC4D8',inner:'#FFE4EE',mid:'#F2A9C3',dark:'#E290B0',petal:'#FFFFFF',heart:'#FFFFFF'});
const rug_mint=()=>rugArt({base:'#A9E2C8',inner:'#DDF5EA',mid:'#8DD0B2',dark:'#74BD9D',petal:'#FFC1D8',heart:'#FFFFFF'});

// らんぷ（足あと 1×1）。まるい台・ほそい柱・すそが波の かさ。かさは 上＝明るい・左＝ふつう・右＝暗い
function lamp(){
  const w=76, ax=38, ay=112, h=ay+32+6, cx=ax, cy=ay+16;
  const tY=cy-100, bY=cy-66, tw=15, bw=27; // かさの上・下の y と はば（半分）
  let s=`<ellipse cx="${cx}" cy="${cy}" rx="24" ry="10" fill="${SHADOW}"/>`;
  // 台（厚みつきの だ円）
  s+=`<ellipse cx="${cx}" cy="${cy-1}" rx="16" ry="7" fill="#E9C79B" ${ST}/>`;
  s+=`<path d="M${cx} ${cy-5}L${cx+16} ${cy-5}L${cx+16} ${cy-1}A16 7 0 0 1 ${cx} ${cy+6}Z" fill="#DDB585"/>`;
  s+=`<ellipse cx="${cx}" cy="${cy-5}" rx="16" ry="7" fill="#FFF0D6" ${ST}/>`;
  // 柱
  s+=`<path d="M${cx} ${cy-6}L${cx} ${bY+2}" stroke="${OL}" stroke-width="8" stroke-linecap="round"/>`
    +`<path d="M${cx} ${cy-6}L${cx} ${bY+2}" stroke="#F4DDB4" stroke-width="4" stroke-linecap="round"/>`
    +`<path d="M${cx+1} ${cy-6}L${cx+1} ${bY+2}" stroke="#E3C89E" stroke-width="1.5"/>`;
  s+=`<ellipse cx="${cx}" cy="${cy-30}" rx="5" ry="3.2" fill="#FFD27A" ${ST}/>`;
  // かさ：形（ふつう）→ 右の暗いところ → 線 → 上の明るい だ円 → すその波
  const shade=`M${cx-tw} ${tY}L${cx+tw} ${tY}L${cx+bw} ${bY}Q${cx} ${bY+7} ${cx-bw} ${bY}Z`;
  s+=`<path d="${shade}" fill="#FFC6D9"/>`;
  s+=`<path d="M${cx+5} ${tY}L${cx+tw} ${tY}L${cx+bw} ${bY}Q${cx+18} ${bY+4.6} ${cx+9} ${bY+5.6}Z" fill="#F5A6C2"/>`;
  s+=`<path d="M${cx-tw+4} ${tY+4}L${cx-bw+7} ${bY-1}" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
  for(let k=0;k<5;k++){const u=(k+.5)/5, x=cx-bw+u*bw*2, y=bY+7*(1-Math.pow(2*u-1,2))-.5;s+=`<circle cx="${f1(x)}" cy="${f1(y+2)}" r="4.4" fill="${k>=3?'#F5A6C2':'#FFC6D9'}" ${ST}/>`;}
  s+=`<path d="${shade}" fill="none" ${ST}/>`;
  s+=`<ellipse cx="${cx}" cy="${tY}" rx="${tw}" ry="5" fill="#FFE6EF" ${ST}/>`;
  // ひも と 玉
  s+=`<path d="M${cx+14} ${bY+4}L${cx+14} ${bY+16}" stroke="${OL}" stroke-width="1.6"/><circle cx="${cx+14}" cy="${bY+18}" r="3" fill="#FFE89A" ${ST}/>`;
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}

// ぼーる（足あと 1×1）。ピンクの玉に みんとの帯と黄色い星。左上が明るく、右下に暗いかげ
function ball(){
  const w=76, ax=38, ay=33, h=ay+32+6, cx=ax, cy=ay+16, r=21, by=cy-19;
  let s=`<ellipse cx="${cx}" cy="${cy}" rx="22" ry="8" fill="${SHADOW}"/>`;
  s+=`<circle cx="${cx}" cy="${by}" r="${r}" fill="#FFB8CE"/>`;
  // 帯（ななめの みんと）
  s+=`<path d="M${cx-r+1} ${by+6}Q${cx} ${by-6} ${cx+r-1} ${by-6}L${cx+r-.2} ${by+3}Q${cx} ${by+4} ${cx-r+4.5} ${by+13}Z" fill="#A9E2C8"/>`;
  // 右下の暗いかげ（三日月）
  s+=`<path d="M${cx+r*.98} ${by-4}A${r} ${r} 0 0 1 ${cx-8} ${by+r*.92}A${r*1.05} ${r*1.05} 0 0 0 ${cx+r*.98} ${by-4}Z" fill="rgba(170,80,120,.22)"/>`;
  s+=`<circle cx="${cx}" cy="${by}" r="${r}" fill="none" ${ST}/>`;
  // 星
  const star=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5, rr=i%2?3.4:7.4;star.push([cx-4+Math.cos(a)*rr,by-6+Math.sin(a)*rr]);}
  s+=`<polygon points="${pts(star)}" fill="#FFE07A" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`;
  // 光
  s+=`<ellipse cx="${cx-9}" cy="${by-10}" rx="4.5" ry="3" fill="#FFFFFF" opacity=".75" transform="rotate(-35 ${cx-9} ${by-10})"/>`;
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}

// ぬいぐるみ（足あと 1×1）。まるい体の くま。顔は点の目と小さな口だけ（ほっぺは うすく）
function plush(){
  const w=76, ax=38, ay=52, h=ay+32+6, cx=ax, cy=ay+16;
  const body='#F6D3B0', mid='#E9BE97', dark='#DCAA82', hx=cx, hy=cy-41;
  let s=`<ellipse cx="${cx}" cy="${cy}" rx="24" ry="9" fill="${SHADOW}"/>`;
  // 耳
  for(const sx of [-1,1])s+=`<circle cx="${hx+sx*12}" cy="${hy-11}" r="6.5" fill="${sx>0?mid:body}" ${ST}/><circle cx="${hx+sx*12}" cy="${hy-11}" r="3.2" fill="#FFC1D2"/>`;
  // 体（まるい）＋右のかげ
  s+=`<ellipse cx="${cx}" cy="${cy-15}" rx="19" ry="17" fill="${body}" ${ST}/>`;
  s+=`<path d="M${cx+8} ${cy-30.4}A19 17 0 0 1 ${cx+5} ${cy+1.3}A16 17 0 0 0 ${cx+8} ${cy-30.4}Z" fill="${mid}"/>`;
  s+=`<ellipse cx="${cx-1}" cy="${cy-12}" rx="10" ry="9" fill="#FFF0E0"/>`;
  // 足（前に出した まるい足）
  for(const sx of [-1,1])s+=`<ellipse cx="${cx+sx*10}" cy="${cy-2}" rx="7" ry="5.4" fill="${sx>0?mid:body}" ${ST}/><ellipse cx="${cx+sx*10}" cy="${cy-2}" rx="3.4" ry="2.6" fill="#FFC1D2"/>`;
  // 手
  for(const sx of [-1,1])s+=`<ellipse cx="${cx+sx*17}" cy="${cy-17}" rx="5" ry="6.5" fill="${sx>0?dark:body}" ${ST} transform="rotate(${sx*-20} ${cx+sx*17} ${cy-17})"/>`;
  // 頭
  s+=`<circle cx="${hx}" cy="${hy}" r="15" fill="${body}" ${ST}/>`;
  s+=`<path d="M${hx+7} ${hy-13.3}A15 15 0 0 1 ${hx+6} ${hy+13.7}A13 15 0 0 0 ${hx+7} ${hy-13.3}Z" fill="${mid}"/>`;
  s+=`<ellipse cx="${hx-5}" cy="${hy-7}" rx="4" ry="2.4" fill="#FFFFFF" opacity=".5"/>`;
  // 顔（点の目・小さな口・ほっぺ）
  s+=`<circle cx="${hx-5.5}" cy="${hy+1}" r="1.9" fill="#6B4A4A"/><circle cx="${hx+5.5}" cy="${hy+1}" r="1.9" fill="#6B4A4A"/>`;
  s+=`<path d="M${hx-2} ${hy+5.5}Q${hx} ${hy+7.5} ${hx+2} ${hy+5.5}" stroke="#6B4A4A" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  s+=`<ellipse cx="${hx-9.5}" cy="${hy+5}" rx="3" ry="1.8" fill="#FFAFC5" opacity=".7"/><ellipse cx="${hx+9.5}" cy="${hy+5}" rx="3" ry="1.8" fill="#FFAFC5" opacity=".7"/>`;
  // むねの りぼん（みんと）
  s+=`<path d="M${cx} ${hy+16}L${cx-8} ${hy+12}L${cx-8} ${hy+20}Z" fill="#A9E2C8" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`
    +`<path d="M${cx} ${hy+16}L${cx+8} ${hy+12}L${cx+8} ${hy+20}Z" fill="#8DD0B2" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`
    +`<circle cx="${cx}" cy="${hy+16}" r="2.6" fill="#DDF5EA" stroke="${OL}" stroke-width="2"/>`;
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}

/** グループ A の絵の表（凍結・プロトタイプなし。引くときは room-data.js の has(ART_A,id)）
 * @type {Readonly<{[id:string]:()=>ItemArt}>} */
export const ART_A=Object.freeze(Object.assign(Object.create(null),{
  rug,
  rug_pink,
  rug_mint,
  shelf,
  plant,
  lamp,
  ball,
  plush,
}));
