// おみせ（買い物）の純粋なロジック（DOM に触れない）
// docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md §6 のとおり。
// id は data-id などから来るので信じない。表は必ず has() で引く。
import {ITEMS,FLOORS,WALLS,EXPANDS,MAX_OWN,has} from './room-data.js';

/** @typedef {'kagu'|'yuka'|'kabe'|'hiroge'} ShopCat */
/** @typedef {'ok'|'short'|'owned'|'max'|'locked'} CardState */
/** @typedef {{id:string,name:string,price:number,state:CardState,have:number,need:number}} Card */

/** おみせの たな（表示の順） @type {ReadonlyArray<ShopCat>} */
export const SHOP_CATS=Object.freeze(['kagu','yuka','kabe','hiroge']);

/** たな → 表（プロトタイプなし） */
const TABLES=Object.freeze(Object.assign(Object.create(null),{kagu:ITEMS,yuka:FLOORS,kabe:WALLS,hiroge:EXPANDS}));

/** id がどの たなのものか。知らない id は null
 * @param {unknown} id @returns {ShopCat|null} */
function catOf(id){
  for(const cat of SHOP_CATS)if(has(TABLES[cat],id))return cat;
  return null;
}

/** 持っている こいん（数でない・負の値は 0） */
function coinOf(S){
  const c=S?S.coin:0;
  return typeof c==='number'&&Number.isFinite(c)&&c>0?c:0;
}

/** own が自分で持つ個数（継いだキー・数でない値は 0） */
function ownCount(S,id){
  const own=S?S.own:null;
  if(!has(own,id))return 0;
  const v=own[id];
  return typeof v==='number'&&Number.isFinite(v)&&v>0?Math.floor(v):0;
}

/** 部屋の 1 辺のマス数（こわれていれば 0） */
function roomN(S){
  const n=S&&S.room?S.room.n:0;
  return typeof n==='number'&&Number.isFinite(n)?n:0;
}

/** いくつ持っているか。もよう・ひろげる は 0 か 1 */
function haveOf(S,cat,id){
  if(cat==='kagu')return ownCount(S,id);
  if(cat==='hiroge')return roomN(S)>=EXPANDS[id].to?1:0;
  return TABLES[cat][id].price===0||ownCount(S,id)>0?1:0;
}

/** 表にある id の状態 @returns {CardState} */
function stateOf(S,cat,id){
  const d=TABLES[cat][id];
  if(cat==='kagu'){
    if(ownCount(S,id)>=MAX_OWN)return 'max';
  }else if(cat==='hiroge'){
    const n=roomN(S);
    if(n>=d.to)return 'owned';
    if(n<d.from)return 'locked';
  }else if(haveOf(S,cat,id))return 'owned';
  return coinOf(S)<d.price?'short':'ok';
}

/** その商品の状態。知らない id は null
 * @param {any} S @param {string} id @returns {CardState|null} */
export function cardState(S,id){
  const cat=catOf(id);
  return cat?stateOf(S,cat,id):null;
}

/** たなに並べるカード（カタログの順）。need＝足りない こいん（足りていれば 0）
 * @param {any} S @param {ShopCat} cat @returns {Card[]} */
export function shopCards(S,cat){
  if(!has(TABLES,cat))return [];
  const table=TABLES[cat],coin=coinOf(S);
  return Object.keys(table).map(id=>{
    const d=table[id];
    return {id,name:d.name,price:d.price,state:stateOf(S,cat,id),have:haveOf(S,cat,id),need:Math.max(0,d.price-coin)};
  });
}

/** 買う。S を書きかえる。状態が ok のときだけ買えて true（それ以外は何も変えない）
 * @param {any} S @param {string} id @returns {boolean} */
export function buy(S,id){
  const cat=catOf(id);
  if(!cat||stateOf(S,cat,id)!=='ok')return false;
  const d=TABLES[cat][id];
  if(cat==='hiroge'){
    S.room={...S.room,n:d.to};
  }else{
    // own が無い・こわれているときは新しく作る（継いだキーを信じない）
    if(S.own===null||typeof S.own!=='object'||Array.isArray(S.own))S.own={};
    if(cat==='kagu')S.own[id]=ownCount(S,id)+1;
    else{
      S.own[id]=1;
      S.room=cat==='yuka'?{...S.room,floor:id}:{...S.room,wall:id};
    }
  }
  S.coin=coinOf(S)-d.price;
  return true;
}
