// おへやの家具の絵・グループ C（DOM に触れない。import は room-art-kit.js だけ）
// 受け持ち：toybox・cushion・tent・slide（tests/helpers/art-check.js の GROUPS.C）
//
// 書き方（契約のくわしい説明と例は room-art-kit.js の先頭。実例は room-art-a.js の shelf・plant）：
//   1. 引数なしで {svg,w,h,ax,ay} を返す関数を 1 アイテムにつき 1 つ書く（svg は wrapSVG(w,h,body)）。
//   2. 下の ART_C に `アイテムid: 関数` を足す。キーは受け持ちの ID だけ。
//   3. node --test tests/*.test.js と dev/item-sheet.html?g=C で確かめる。
// room-art.js の itemSVG(id) が ART_A → ART_B → ART_C の順に引く（無い ID は予備の箱になる）。
import {OL,ST,f1,pts,poly,polyN,roundPoly,isoPt,footShadow,wrapSVG} from './room-art-kit.js';

/** @typedef {import('./room-art-kit.js').ItemArt} ItemArt */

/** 線だけの多角形（fill="none"） @param {[number,number][]} a @returns {string} */
const outline=a=>`<polygon points="${pts(a)}" fill="none" ${ST}/>`;

/** 5 つの角の星（画面の座標・中心 (cx,cy)・外の半径 r）。sy はたての つぶれ（1＝まる） */
function starPts(cx,cy,r,sy=1,inner=.46){
  const a=[];
  for(let i=0;i<10;i++){const t=-Math.PI/2+i*Math.PI/5, rr=i%2?r*inner:r;a.push([cx+Math.cos(t)*rr,cy+Math.sin(t)*rr*sy]);}
  return a;
}

/** 箱の面の上の星。F(u,v)＝面の点（u＝辺にそったマス、v＝高さ px）。r は px */
function faceStar(F,cu,cv,r,fill){
  const a=[];
  for(let i=0;i<10;i++){const t=-Math.PI/2+i*Math.PI/5, rr=i%2?r*.46:r;a.push(F(cu+Math.cos(t)*rr/35.8,cv-Math.sin(t)*rr));}
  return `<polygon points="${pts(a)}" fill="${fill}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`;
}

// おもちゃばこ（足あと 1×1）。そら色の箱に ももいろの ふた（うしろに開いている）。中から ぼーる・つみき・星のぼう
function toybox(){
  const pad=6, ax=32+pad, ay=70, w=64+pad*2, h=ay+32+pad;
  const P=(gx,gy,z=0)=>isoPt(ax,ay,gx,gy,z);
  const x0=.1, y0=.1, x1=.9, y1=.9, Z=34, L=30, d=.07;
  let s=footShadow(ax,ay,1,1);
  // ふた（うしろの辺で立っている。内がわが見える）
  s+=roundPoly([P(x0,y0-.2,Z+L),P(x1,y0-.2,Z+L),P(x1,y0,Z),P(x0,y0,Z)],5,'#FFC1D6');
  s+=polyN([P(x0+.08,y0-.17,Z+L-4),P(x1-.08,y0-.17,Z+L-4),P(x1-.08,y0-.04,Z+6),P(x0+.08,y0-.04,Z+6)],'#FFD6E4');
  s+=`<polygon points="${pts(starPts(...P(.5,y0-.1,Z+L*.55),7,.9))}" fill="#FFE07A" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`;
  // ふちの上（明るい）と 中（くらい）
  s+=poly([P(x0,y0,Z),P(x1,y0,Z),P(x1,y1,Z),P(x0,y1,Z)],'#E2F5FC');
  s+=polyN([P(x0+d,y0+d,Z),P(x1-d,y0+d,Z),P(x1-d,y1-d,Z),P(x0+d,y1-d,Z)],'#7FB7D3');
  s+=polyN([P(x0+d,y0+d,Z),P(x1-d,y0+d,Z),P(x1-d,y0+d,Z-14),P(x0+d,y0+d,Z-14)],'#97C8E0');
  // 中のおもちゃ：星のぼう → つみき → ぼーる
  const [wx,wy]=P(.36,.4,Z-6);
  s+=`<path d="M${f1(wx)} ${f1(wy)}L${f1(wx-3)} ${f1(wy-26)}" stroke="${OL}" stroke-width="6" stroke-linecap="round"/>`
    +`<path d="M${f1(wx)} ${f1(wy)}L${f1(wx-3)} ${f1(wy-26)}" stroke="#C2A4EE" stroke-width="2.6" stroke-linecap="round"/>`
    +`<polygon points="${pts(starPts(wx-3,wy-30,8.5))}" fill="#FFE07A" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`;
  const B=(gx,gy,z)=>isoPt(ax,ay,gx,gy,z), bx0=.5, by0=.3, bw=.26, z0=Z-8, z1=Z+10;
  s+=poly([B(bx0,by0+bw,z1),B(bx0+bw,by0+bw,z1),B(bx0+bw,by0+bw,z0),B(bx0,by0+bw,z0)],'#9FD98A')
    +poly([B(bx0+bw,by0,z1),B(bx0+bw,by0+bw,z1),B(bx0+bw,by0+bw,z0),B(bx0+bw,by0,z0)],'#86C673')
    +poly([B(bx0,by0,z1),B(bx0+bw,by0,z1),B(bx0+bw,by0+bw,z1),B(bx0,by0+bw,z1)],'#C9EFB6');
  const [bx,by]=P(.42,.68,Z+1);
  s+=`<circle cx="${f1(bx)}" cy="${f1(by)}" r="10" fill="#FFB8CE" ${ST}/>`
    +`<path d="M${f1(bx-9.6)} ${f1(by+2)}Q${f1(bx)} ${f1(by-5)} ${f1(bx+9.6)} ${f1(by-2.6)}" stroke="#FFFFFF" stroke-width="3" fill="none"/>`
    +`<circle cx="${f1(bx-3.5)}" cy="${f1(by-4)}" r="2.2" fill="#FFFFFF" opacity=".8"/>`;
  // 手前の 2 面（左＝ふつう・右＝暗い）。おもちゃの下は この面にかくれる
  const FL=(u,v)=>P(x0+u,y1,v), FR=(u,v)=>P(x1,y0+u,v);
  s+=poly([P(x0,y1,Z),P(x1,y1,Z),P(x1,y1,0),P(x0,y1,0)],'#A9DCF0');
  s+=poly([P(x1,y0,Z),P(x1,y1,Z),P(x1,y1,0),P(x1,y0,0)],'#8EC8E3');
  // ふちの帯と 星・はーと
  s+=polyN([FL(0,Z-1.5),FL(.8,Z-1.5),FL(.8,Z-7),FL(0,Z-7)],'#D6F0FA')+polyN([FR(0,Z-1.5),FR(.8,Z-1.5),FR(.8,Z-7),FR(0,Z-7)],'#B5DDEF');
  s+=faceStar(FL,.4,14,9,'#FFE07A');
  const [hx,hy]=FR(.4,15);
  s+=`<path d="M${f1(hx)} ${f1(hy+6)}C${f1(hx-9)} ${f1(hy-1)} ${f1(hx-4)} ${f1(hy-9)} ${f1(hx)} ${f1(hy-3)}C${f1(hx+4)} ${f1(hy-11)} ${f1(hx+9)} ${f1(hy-5)} ${f1(hx)} ${f1(hy+6)}Z" fill="#FFB0C8" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`;
  s+=outline([P(x0,y1,Z),P(x1,y1,Z),P(x1,y0,Z)]);
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}

// おほしさま くっしょん（足あと 1×1）。ゆかに ころんと置いた ふっくらした星。上の面に ねむそうな にこにこ顔
function cushion(){
  const pad=6, T=13, ax=32+pad, ay=28, w=64+pad*2, h=ay+32+pad;
  const P=(gx,gy,z=0)=>isoPt(ax,ay,gx,gy,z);
  // マスの中の星（角の 1 つが画面の上を向く）
  const G=[];
  for(let i=0;i<10;i++){const t=-3*Math.PI/4+i*Math.PI/5, rr=i%2?.28:.6;G.push([.5+Math.cos(t)*rr,.5+Math.sin(t)*rr]);}
  const top=G.map(([gx,gy])=>P(gx,gy,T)), bot=G.map(([gx,gy])=>P(gx,gy,0));
  let s=`<ellipse cx="${ax}" cy="${ay+16}" rx="30" ry="13" fill="rgba(120,80,100,.14)"/>`;
  s+=roundPoly(bot,3,'#EDB94A');
  // 横の面：見える向きのものを、奥から手前へ
  const sides=[];
  for(let i=0;i<10;i++){
    const a=G[i], b=G[(i+1)%10];
    let nx=b[1]-a[1], ny=-(b[0]-a[0]);
    const mx=(a[0]+b[0])/2-.5, my=(a[1]+b[1])/2-.5;
    if(nx*mx+ny*my<0){nx=-nx;ny=-ny;}
    if(nx+ny<=0)continue;
    sides.push({d:(a[0]+b[0]+a[1]+b[1])/2, q:[top[i],top[(i+1)%10],bot[(i+1)%10],bot[i]], c:ny>nx?'#F7CF5E':'#EDB94A'});
  }
  sides.sort((p,q)=>p.d-q.d);
  for(const t of sides)s+=polyN(t.q,t.c);
  s+=roundPoly(top,3,'#FFE48A');
  // ぬい目（白い点線）と光
  const c=P(.5,.5,T), inn=top.map(([x,y])=>[c[0]+(x-c[0])*.78,c[1]+(y-c[1])*.78]);
  s+=`<polygon points="${pts(inn)}" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="1 4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  s+=`<ellipse cx="${f1(c[0]-8)}" cy="${f1(c[1]-6)}" rx="5" ry="2.4" fill="#FFFFFF" opacity=".7" transform="rotate(-20 ${f1(c[0]-8)} ${f1(c[1]-6)})"/>`;
  // ねむそうな顔（とじた目・小さな口・ほっぺ）
  const [fx,fy]=[c[0],c[1]+1];
  s+=`<path d="M${f1(fx-8.5)} ${f1(fy-1)}Q${f1(fx-6)} ${f1(fy+1.6)} ${f1(fx-3.5)} ${f1(fy-1)}M${f1(fx+3.5)} ${f1(fy-1)}Q${f1(fx+6)} ${f1(fy+1.6)} ${f1(fx+8.5)} ${f1(fy-1)}" stroke="#8A5A4A" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  s+=`<path d="M${f1(fx-1.6)} ${f1(fy+2.6)}Q${f1(fx)} ${f1(fy+4.2)} ${f1(fx+1.6)} ${f1(fy+2.6)}" stroke="#8A5A4A" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  s+=`<ellipse cx="${f1(fx-11)}" cy="${f1(fy+2.4)}" rx="2.8" ry="1.5" fill="#FFAFC5" opacity=".8"/><ellipse cx="${f1(fx+11)}" cy="${f1(fy+2.4)}" rx="2.8" ry="1.5" fill="#FFAFC5" opacity=".8"/>`;
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}

// てんと（足あと 2×2）。三角の あそびてんと。むねは +gy 向き、やねは ももいろと くりーむの しま。入口の幕は りぼんで まとめる
function tent(){
  const pad=8, H=96, ax=64+pad, ay=H+24, w=128+pad*2, h=ay+64+pad;
  const P=(gx,gy,z=0)=>isoPt(ax,ay,gx,gy,z);
  const R0=P(1,0,H), R2=P(1,2,H);
  let s=footShadow(ax,ay,2,2);
  // うしろの やね（ほとんど かくれる）
  s+=poly([P(0,0),P(0,2),R2,R0],'#E99BB8');
  // 右の やね（+gx 向き・暗い）：しま
  const N=5;
  for(let k=0;k<N;k++){
    const g0=k*2/N, g1=(k+1)*2/N;
    s+=polyN([P(1,g0,H),P(1,g1,H),P(2,g1,0),P(2,g0,0)],k%2?'#EFDCCB':'#F2A3C0');
  }
  s+=outline([R0,R2,P(2,2),P(2,0)]);
  // やねの すその ふさ（まるい ぽんぽん）
  for(let k=0;k<5;k++){const [x,y]=P(2,(k+.5)*.4,2);s+=`<circle cx="${f1(x)}" cy="${f1(y)}" r="3.4" fill="${k%2?'#F2A3C0':'#FFE07A'}" ${ST}/>`;}
  // むね（+gy 向き・ふつう）
  const T1=P(0,2), T2=P(2,2);
  s+=poly([T1,T2,R2],'#FDEBDA');
  // 入口（中は くらい ふじいろ）と、りぼんで まとめた 幕
  const F=(u,v)=>P(u,2,v);
  const D0=F(.58,0), D1=F(1.42,0), DT=F(1,60);
  s+=`<path d="M${pts([D0])}Q${pts([F(.62,48)])} ${pts([DT])}Q${pts([F(1.38,48)])} ${pts([D1])}Z" fill="#B994B8" ${ST}/>`;
  s+=polyN([F(.75,0),F(1.25,0),F(1.12,14),F(.88,14)],'#A47FA6');
  s+=`<polygon points="${pts(starPts(...F(1,30),6))}" fill="#FFF3B0"/>`;
  for(const sd of [-1,1]){
    const a=F(1-sd*.02,66), b=F(1-sd*.62,0), c=F(1-sd*.4,0), k=F(1-sd*.5,28);
    s+=`<path d="M${pts([a])}Q${pts([F(1-sd*.38,38)])} ${pts([k])}L${pts([b])}L${pts([c])}L${pts([F(1-sd*.44,26)])}Q${pts([F(1-sd*.28,40)])} ${pts([a])}Z" fill="#FFC1D6" ${ST}/>`;
    s+=`<circle cx="${f1(k[0]+sd*1.5)}" cy="${f1(k[1])}" r="3.2" fill="#A9E2C8" stroke="${OL}" stroke-width="2"/>`;
  }
  // むねの ふち（ももいろの ふさ）
  for(let k=1;k<6;k++){
    const u=k/6;
    const L=[T1[0]+(R2[0]-T1[0])*u,T1[1]+(R2[1]-T1[1])*u], Rr=[T2[0]+(R2[0]-T2[0])*u,T2[1]+(R2[1]-T2[1])*u];
    s+=`<circle cx="${f1(L[0])}" cy="${f1(L[1]+3)}" r="2.6" fill="#F2A3C0"/><circle cx="${f1(Rr[0])}" cy="${f1(Rr[1]+3)}" r="2.6" fill="#F2A3C0"/>`;
  }
  s+=outline([T1,T2,R2]);
  // むなぎ と はた
  s+=`<path d="M${pts([R0])}L${pts([R2])}" stroke="${OL}" stroke-width="7" stroke-linecap="round"/><path d="M${pts([R0])}L${pts([R2])}" stroke="#F2A3C0" stroke-width="3" stroke-linecap="round"/>`;
  const [px,py]=R2;
  s+=`<path d="M${f1(px)} ${f1(py)}L${f1(px)} ${f1(py-22)}" stroke="${OL}" stroke-width="2.5" stroke-linecap="round"/>`;
  s+=`<path d="M${f1(px)} ${f1(py-22)}L${f1(px+15)} ${f1(py-17)}L${f1(px)} ${f1(py-12)}Z" fill="#FFE07A" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`;
  s+=`<circle cx="${f1(px)}" cy="${f1(py-23)}" r="2.6" fill="#FFB8CE" stroke="${OL}" stroke-width="1.6"/>`;
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}

// すべりだい（足あと 1×2）。うしろ（gy 0〜.6）に みんとの台と はしご、手前（+gy）へ 黄色い すべる面が のびる
function slide(){
  const pad=6, Ht=62, ax=64+pad, ay=Ht+30, w=ax+32+pad, h=ay+48+pad;
  const P=(gx,gy,z=0)=>isoPt(ax,ay,gx,gy,z);
  const x0=.08, x1=.92, y0=.05, y1=.62;
  let s=footShadow(ax,ay,1,2);
  // 台（左＝ふつう・右＝暗い・上＝明るい）
  s+=poly([P(x0,y1,Ht),P(x1,y1,Ht),P(x1,y1,0),P(x0,y1,0)],'#A9E2C8');
  s+=poly([P(x1,y0,Ht),P(x1,y1,Ht),P(x1,y1,0),P(x1,y0,0)],'#8DD0B2');
  s+=poly([P(x0,y0,Ht),P(x1,y0,Ht),P(x1,y1,Ht),P(x0,y1,Ht)],'#DDF5EA');
  // 右の面の はしご
  const FR=(u,v)=>P(x1,y0+u,v);
  for(const u of [.12,.45])s+=`<path d="M${pts([FR(u,2)])}L${pts([FR(u,Ht-2)])}" stroke="#FFF3DA" stroke-width="3.4" stroke-linecap="round"/>`;
  for(let v=10;v<Ht;v+=12)s+=`<path d="M${pts([FR(.12,v)])}L${pts([FR(.45,v)])}" stroke="#FFF3DA" stroke-width="3" stroke-linecap="round"/>`;
  // 上の手すり（ももいろ）
  const rail=[P(x0+.04,y1,Ht),P(x0+.04,y1,Ht+16),P(x0+.04,y0+.04,Ht+16),P(x1,y0+.04,Ht+16),P(x1,y1,Ht+16),P(x1,y1,Ht)];
  const rd='M'+rail.map(p=>pts([p])).join('L');
  s+=`<path d="${rd}" stroke="${OL}" stroke-width="7" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="${rd}" stroke="#FFB8CE" stroke-width="3.4" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
  // すべる面の高さ（台の手前 .62 から 1.95 へ、さいごは ほぼ平ら）
  const g0=y1, g1=1.95, Z=g=>{const t=(g-g0)/(g1-g0);return 6+(Ht-6)*Math.pow(1-t,1.7);};
  const G=[];for(let i=0;i<=12;i++)G.push(g0+(g1-g0)*i/12);
  const sL=.2, sR=.8, lip=6, th=6;
  // ささえの 柱
  const gs=1.2;
  s+=`<path d="M${pts([P(.5,gs,0)])}L${pts([P(.5,gs,Z(gs)-th)])}" stroke="${OL}" stroke-width="8" stroke-linecap="round"/><path d="M${pts([P(.5,gs,0)])}L${pts([P(.5,gs,Z(gs)-th)])}" stroke="#E3C89E" stroke-width="4" stroke-linecap="round"/>`;
  // 左の ふち（内がわ・+gx 向き）→ すべる面 → 右の外がわ → 手前のはし
  s+=poly([...G.map(g=>P(sL,g,Z(g)+lip)),...G.slice().reverse().map(g=>P(sL,g,Z(g)))],'#F2A3C0');
  s+=poly([...G.map(g=>P(sL,g,Z(g))),...G.slice().reverse().map(g=>P(sR,g,Z(g)))],'#FFE48A');
  s+=`<path d="M${G.map(g=>pts([P(.5,g,Z(g))])).join('L')}" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/>`;
  s+=poly([P(sR,g1,Z(g1)+lip),P(sR,g1,Z(g1)-th),P(sL,g1,Z(g1)-th),P(sL,g1,Z(g1)+lip),P(sL+.06,g1,Z(g1)+lip),P(sL+.06,g1,Z(g1)),P(sR,g1,Z(g1))],'#FFB8CE');
  s+=poly([...G.map(g=>P(sR,g,Z(g)+lip)),...G.slice().reverse().map(g=>P(sR,g,Z(g)-th))],'#F29BB9');
  s+=`<path d="M${G.map(g=>pts([P(sR,g,Z(g)+lip)])).join('L')}" stroke="#FFD6E4" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  return {svg:wrapSVG(w,h,s),w,h,ax,ay};
}

/** グループ C の絵の表（凍結・プロトタイプなし。引くときは room-data.js の has(ART_C,id)）
 * @type {Readonly<{[id:string]:()=>ItemArt}>} */
export const ART_C=Object.freeze(Object.assign(Object.create(null),{
  toybox,
  cushion,
  tent,
  slide,
}));
