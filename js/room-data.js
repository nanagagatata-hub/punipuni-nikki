// おへやのカタログと型（DOM に触れない・何も import しない）
// 値は docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md §8 のとおり。
// ほかのモジュールは `@typedef {import('./room-data.js').Room} Room` のように参照する。

/** 置いた家具 1 つ。(x,y)＝足あとの上の頂点のマス、r＝向き（奇数で w と h が入れ替わる） @typedef {{id:string,x:number,y:number,r:0|1|2|3}} Placed */
/** 部屋。n＝1 辺のマス数 @typedef {{n:6|8|10,floor:string,wall:string,items:Placed[]}} Room */
/** 持ちもの（id → 個数） @typedef {{[id:string]:number}} Own */
/** 家具。w は +gx（画面の右下）、h は +gy（左下）へのびる。walk＝上を歩ける、flat＝平ら（ゆかに敷く） @typedef {{id:string,name:string,price:number,w:number,h:number,walk:boolean,flat:boolean}} ItemDef */
/** ゆか・かべ のもよう @typedef {{id:string,name:string,price:number}} PatternDef */
/** 部屋をひろげる @typedef {{id:string,name:string,price:number,from:6|8,to:8|10}} ExpandDef */

/** 表を中身ごと凍結する。プロトタイプなしにして `__proto__` などを引けないようにする
 * @template T @param {T[]} rows @returns {Readonly<{[id:string]:T}>} */
function table(rows){
  const t=Object.create(null);
  for(const d of rows)t[d.id]=Object.freeze(d);
  return Object.freeze(t);
}
const item=(id,name,price,w,h,walk=false,flat=false)=>({id,name,price,w,h,walk,flat});
const pat=(id,name,price)=>({id,name,price});

/** 家具（挿入順＝カタログの順） @type {Readonly<{[id:string]:ItemDef}>} */
export const ITEMS=table([
  item('rug','むらさきの らぐ',12,2,2,true,true),
  item('rug_pink','ももいろの らぐ',12,2,2,true,true),
  item('rug_mint','みんといろの らぐ',12,2,2,true,true),
  item('shelf','ほんだな',20,1,2),
  item('plant','かんようしょくぶつ',8,1,1),
  item('lamp','らんぷ',10,1,1),
  item('ball','ぼーる',8,1,1),
  item('plush','ぬいぐるみ',5,1,1),
  item('bed','べっど',30,2,2),
  item('sofa','そふぁ',25,1,2),
  item('table','ちゃぶだい',15,1,1),
  item('chair','いす',10,1,1),
  item('desk','つくえ',20,1,2),
  item('toybox','おもちゃばこ',15,1,1),
  item('cushion','おほしさま くっしょん',8,1,1),
  item('tent','てんと',30,2,2),
  item('slide','すべりだい',35,1,2),
]);

/** ゆか @type {Readonly<{[id:string]:PatternDef}>} */
export const FLOORS=table([
  pat('f_honey','はちみついろの ゆか',0),
  pat('f_mint','みんといろの ゆか',15),
  pat('f_check','いちまつもようの ゆか',15),
  pat('f_cloud','くもの じゅうたん',15),
]);

/** かべ @type {Readonly<{[id:string]:PatternDef}>} */
export const WALLS=table([
  pat('w_pink','みずたまの かべ',0),
  pat('w_stripe','しましまの かべ',15),
  pat('w_star','おほしさまの かべ',15),
  pat('w_sky','そらいろの かべ',15),
]);

/** ひろげる @type {Readonly<{[id:string]:ExpandDef}>} */
export const EXPANDS=table([
  {id:'x8',name:'ひろい おへや',price:100,from:6,to:8},
  {id:'x10',name:'もっと ひろい おへや',price:200,from:8,to:10},
]);

/** 家具の使い方。spot＝どこで使う（on 上に乗る／front 正面／side となり／in 入口で下半分を隠す）、seat＝on の高さ(px)、
 * act＝動き、face＝petSVG の顔、fx＝頭の上の小さな絵、dur＝使う秒数[最小,最大]、say＝ひとこと、w＝自分で使う重み（0 なら使わない）、
 * front＝正面が gx 側か gy 側か（省略時 gy）
 * @typedef {{id:string,spot:'on'|'front'|'side'|'in',seat:number,act:string,face:string,fx:string,dur:[number,number],say:string,w:number,front?:'gx'|'gy'}} UseDef */
export const USE_ACTS=Object.freeze(['sit','sleep','read','study','eat','play','hug','water','lamp','peek','kick','slide']);
export const USE_FX=Object.freeze(['','z','book','pencil','snack','note','heart','drop','star']);
const use=(id,spot,seat,act,face,fx,dur,say,w,front)=>({id,spot,seat,act,face,fx,dur:Object.freeze(dur),say,w,...(front?{front}:{})});

/** 家具の使い方（ITEMS と同じ id）。front:'gx' は絵の顔（本・引き出し・すわる側）が +gx 側のもの @type {Readonly<{[id:string]:UseDef}>} */
export const USES=table([
  use('rug','on',0,'sit','happy','note',[6,10],'ふかふか だね',3),
  use('rug_pink','on',0,'sit','happy','note',[6,10],'ふかふか だね',3),
  use('rug_mint','on',0,'sit','happy','note',[6,10],'ふかふか だね',3),
  use('cushion','on',6,'sit','happy','star',[6,10],'おほしさま すき',3),
  use('sofa','on',18,'sit','happy','note',[8,12],'そふぁ で ひとやすみ',3,'gx'),
  use('chair','on',20,'sit','normal','',[5,8],'よいしょ',2,'gx'),
  use('bed','on',22,'sleep','sleep','z',[10,15],'ちょっと おひるね',2,'gx'),
  use('tent','in',0,'peek','giggle','',[6,10],'ここ だよ〜',2),
  use('shelf','front',0,'read','normal','book',[8,12],'ごほん よもう',3,'gx'),
  use('desk','front',0,'study','sparkle','pencil',[8,12],'おべんきょう する！',3,'gx'),
  use('table','front',0,'eat','happy','snack',[6,9],'おやつ たべよ',3),
  use('toybox','front',0,'play','giggle','note',[6,9],'なに で あそぼう',3),
  use('plush','side',0,'hug','hug','heart',[5,8],'ぎゅー',3),
  use('plant','front',0,'water','happy','drop',[5,7],'おみず あげるね',2),
  use('lamp','front',0,'lamp','happy','',[1.5,1.5],'ぱちっ',0),
  use('ball','front',0,'kick','sparkle','',[2.5,2.5],'えいっ',3),
  use('slide','front',0,'slide','sparkle','',[4,4],'すべりだい だ〜',3),
]);

/** 部屋の 1 辺のマス数（小さい順） */
export const SIZES=Object.freeze([6,8,10]);
/** 部屋に置ける家具の最大数 */
export const MAX_ITEMS=60;
/** 1 種類あたりの持てる最大数 */
export const MAX_OWN=99;
/** こいんの上限 */
export const MAX_COIN=999999;
/** 1 回の報告でもらえる こいんの上限（undo[].c の上限） */
export const MAX_GRANT=20;
export const DEFAULT_FLOOR='f_honey';
export const DEFAULT_WALL='w_pink';

/** id がその表の「自分で持つ」キーか（保存データ・data-id を信じないための入口）
 * @param {object} table @param {unknown} id @returns {boolean} */
export function has(table,id){
  return typeof id==='string'&&table!=null&&Object.prototype.hasOwnProperty.call(table,id);
}

/** 初期の持ちもの（毎回新しいオブジェクト） @returns {Own} */
export function defaultOwn(){
  return {rug:1,shelf:1,plant:1};
}

/** 初期の部屋（毎回新しいオブジェクト） @returns {Room} */
export function defaultRoom(){
  return {n:6,floor:DEFAULT_FLOOR,wall:DEFAULT_WALL,items:[
    {id:'rug',x:2,y:2,r:0},
    {id:'shelf',x:0,y:2,r:0},
    {id:'plant',x:5,y:0,r:0},
  ]};
}
