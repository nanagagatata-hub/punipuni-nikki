// おへやの演出の絵と計算（DOM に触れない。import は room-data.js と room-art-kit.js だけ）
// 仕様：docs/superpowers/specs/2026-11-11-oheya-stage4-furniture-play-design.md §4.3・§5.2・§6
// 頭の上の絵（fxSVG）、家具の ぶるんっ（wiggleScale）、床の ★（starBurst・addBurst）、
// らんぷの あかり（glowLevel・pickLights）。描くのは room.js。
import {has} from './room-data.js';
import {OL,wrapSVG} from './room-art-kit.js';

// 頭の上の絵の線（32×32 用に細め）
const L=`stroke="${OL}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
const W32=body=>wrapSVG(32,32,body);
// 5 つの とんがりの星（中心 cx,cy・外の半径 R・内の半径 r）
const starPts=(cx,cy,R,r)=>Array.from({length:10},(_,i)=>{
  const a=-Math.PI/2+i*Math.PI/5,d=i%2?r:R;
  return (Math.round((cx+Math.cos(a)*d)*10)/10)+','+(Math.round((cy+Math.sin(a)*d)*10)/10);
}).join(' ');

/** 頭の上の絵（32×32・オリジナルの簡単な形）。表はプロトタイプなし・凍結 */
const FX=Object.freeze(Object.assign(Object.create(null),{
  // Z（ねむい）：そらいろの Z
  z:W32(`<path d="M9 8H23L9 24H23" fill="none" stroke="${OL}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`
    +`<path d="M9 8H23L9 24H23" fill="none" stroke="#9FD3F5" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`),
  // 本：ひらいた本（そらいろの表紙）
  book:W32(`<polygon points="3,10 16,13 29,10 29,26 16,29 3,26" fill="#9FD3F5" ${L}/>`
    +`<polygon points="5,8 16,11 16,26 5,23" fill="#FFFFFF" ${L}/>`
    +`<polygon points="27,8 16,11 16,26 27,23" fill="#FFF5E4" ${L}/>`
    +`<path d="M8 13L13 14.5M8 17L13 18.5M24 13L19 14.5M24 17L19 18.5" stroke="#E3C89E" stroke-width="1.5" stroke-linecap="round" fill="none"/>`),
  // えんぴつ：ななめの きいろい えんぴつ（けしごむは ももいろ）
  pencil:W32(`<g transform="rotate(-45 16 16)">`
    +`<rect x="8" y="12" width="14" height="8" fill="#FFD84D" ${L}/>`
    +`<rect x="3" y="12" width="5" height="8" rx="1.5" fill="#FF7FA0" ${L}/>`
    +`<polygon points="22,12 29,16 22,20" fill="#F4DDB4" ${L}/>`
    +`<polygon points="26.5,14.6 29,16 26.5,17.4" fill="${OL}"/>`
    +`</g>`),
  // おやつ：まるい くっきー
  snack:W32(`<circle cx="16" cy="16" r="11" fill="#E9C79B" ${L}/>`
    +`<circle cx="12" cy="12" r="1.8" fill="#A9785A"/><circle cx="19" cy="14" r="1.8" fill="#A9785A"/>`
    +`<circle cx="14" cy="20" r="1.8" fill="#A9785A"/><circle cx="20" cy="20" r="1.4" fill="#A9785A"/>`
    +`<ellipse cx="11" cy="9.5" rx="3" ry="1.6" fill="#FFFFFF" opacity=".5"/>`),
  // おんぷ：ももいろの 8 分おんぷ
  note:W32(`<path d="M17 24V6Q22 8 25 13" fill="none" stroke="${OL}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`
    +`<path d="M17 24V6Q22 8 25 13" fill="none" stroke="#FF7FA0" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`
    +`<ellipse cx="12.5" cy="24" rx="5.5" ry="4.2" fill="#FF7FA0" ${L} transform="rotate(-20 12.5 24)"/>`),
  // ハート：ももいろ
  heart:W32(`<path d="M16 27C6 20 3 15 3 10.5C3 6.5 6 4 9.5 4C12.5 4 14.5 6 16 8.5C17.5 6 19.5 4 22.5 4C26 4 29 6.5 29 10.5C29 15 26 20 16 27Z" fill="#FF7FA0" ${L}/>`
    +`<ellipse cx="9" cy="10" rx="2.6" ry="1.8" fill="#FFFFFF" opacity=".6" transform="rotate(-30 9 10)"/>`),
  // しずく：そらいろ
  drop:W32(`<path d="M16 3C19 9 25 14 25 20A9 9 0 0 1 7 20C7 14 13 9 16 3Z" fill="#9FD3F5" ${L}/>`
    +`<ellipse cx="12.5" cy="20" rx="2" ry="3.4" fill="#FFFFFF" opacity=".7"/>`),
  // ほし：きいろ
  star:W32(`<polygon points="${starPts(16,17,13,5.6)}" fill="#FFD84D" ${L}/>`
    +`<circle cx="13" cy="14" r="1.8" fill="#FFFFFF" opacity=".7"/>`),
}));

/**
 * 頭の上の絵（32×32 の SVG 文字列）。知らない kind は ''。
 * @param {'z'|'book'|'pencil'|'snack'|'note'|'heart'|'drop'|'star'} kind
 * @returns {string}
 */
export function fxSVG(kind){
  return has(FX,kind)?FX[kind]:'';
}

/** ぶるんっ の長さ（秒）と強さ */
const WIGGLE_T=0.4, WIGGLE_K=0.08, WIGGLE_K_REDUCED=0.04;

/**
 * 家具の ぶるんっ（足もとを軸にした拡大率）。s=sin(π·t/0.4)·(1−t/0.4)、sx=1+k·s、sy=1−k·s。
 * 0.4 秒で終わる。age<0・age>=0.4・数でない age は {sx:1,sy:1}。
 * @param {number} age 始まってからの秒 @param {boolean} reduced 動きを減らす（k=0.04）
 * @returns {{sx:number,sy:number}}
 */
export function wiggleScale(age,reduced){
  if(!(age>=0&&age<WIGGLE_T))return {sx:1,sy:1};
  const u=age/WIGGLE_T, s=Math.sin(Math.PI*u)*(1-u), k=reduced?WIGGLE_K_REDUCED:WIGGLE_K;
  return {sx:1+k*s,sy:1-k*s};
}

/** ★ の数・長さ（秒）・ひろがり（部屋の SVG の px） */
const STAR_N=5, STAR_T=0.6, STAR_R=18;

/**
 * 床の ★ 1 組（押した点からの位置。部屋の SVG の px）。0.6 秒で外へ 18px ひろがりながら小さく・薄くなる。
 * reduced は ひろがらず（x,y は 0）、大きさはそのままで薄くなるだけ。age<0・age>=0.6 は []。
 * @param {number} age 始まってからの秒 @param {boolean} reduced
 * @returns {{x:number,y:number,s:number,a:number}[]} s＝大きさ 0..1、a＝こさ 0..1
 */
export function starBurst(age,reduced){
  if(!(age>=0&&age<STAR_T))return [];
  const p=age/STAR_T, d=reduced?0:STAR_R*(1-(1-p)*(1-p)), a=1-p, s=reduced?1:1-p;
  return Array.from({length:STAR_N},(_,i)=>{
    const t=-Math.PI/2+i*2*Math.PI/STAR_N;
    return {x:reduced?0:Math.cos(t)*d,y:reduced?0:Math.sin(t)*d,s,a};
  });
}

/**
 * ★ の組を足す（新しい配列）。max 組をこえたら古いものから捨てる。
 * @template T @param {T[]} list @param {T} burst @param {number} [max] @returns {T[]}
 */
export function addBurst(list,burst,max=4){
  const L=[...list,burst];
  return L.slice(Math.max(0,L.length-max));
}

/** 夜の暗さのいちばん濃いところ（room.js の r.dark の最大） */
const DARK_MAX=0.42;
const clip01=v=>v>0?Math.min(1,v):0;

/**
 * らんぷ 1 こ の光の強さ。cut＝暗さを抜く強さ、warm＝あたたかい色、day＝昼の小さな光。
 * cut=0.85·on·dark/0.42、warm=0.18·on·dark/0.42、day=0.15·on·(1−dark/0.42)。どれも 0..1 に切る。
 * @param {number} dark 今の暗さ 0..0.42（外は切る） @param {number} on 点灯 0..1（外は切る）
 * @returns {{cut:number,warm:number,day:number}}
 */
export function glowLevel(dark,on){
  const d=clip01(dark/DARK_MAX), o=clip01(on);
  return {cut:clip01(0.85*o*d),warm:clip01(0.18*o*d),day:clip01(0.15*o*(1-d))};
}

/**
 * 光らせる らんぷ を選ぶ：ぷにに近い順に i を max こまで（同じ近さなら 先に並んだもの）。
 * @param {{i:number,x:number,y:number}[]} lamps @param {{x:number,y:number}} pet @param {number} [max]
 * @returns {number[]}
 */
export function pickLights(lamps,pet,max=6){
  const d=l=>(l.x-pet.x)**2+(l.y-pet.y)**2;
  return lamps.map((l,k)=>({i:l.i,d:d(l),k}))
    .sort((a,b)=>a.d-b.d||a.k-b.k)
    .slice(0,max).map(o=>o.i);
}
