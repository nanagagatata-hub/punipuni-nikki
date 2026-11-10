// おへやの家具の配置（DOM に触れない純粋なロジック）
// 判定は docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md §5、
// 保存データの洗い直し（cleanOwn・cleanRoom）は §2.2・§2.3 のとおり。
// Room は変えずに新しいものを返す。失敗は null。
import {ITEMS,FLOORS,WALLS,SIZES,MAX_ITEMS,MAX_OWN,DEFAULT_FLOOR,DEFAULT_WALL,has,defaultRoom} from './room-data.js';

/** @typedef {import('./room-data.js').Placed} Placed */
/** @typedef {import('./room-data.js').Room} Room */
/** @typedef {import('./room-data.js').Own} Own */

/** cleanRoom が items の前から見る件数（これより後ろは見ない） */
const MAX_SCAN=200;

const isInt=Number.isInteger;
const isDir=r=>isInt(r)&&r>=0&&r<=3;
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const copyItem=p=>({id:p.id,x:p.x,y:p.y,r:p.r});
/** 家具だけ入れ替えた新しい部屋（家具は 1 つずつ写す） */
const withItems=(room,items)=>({n:room.n,floor:room.floor,wall:room.wall,items:items.map(copyItem)});
const validIndex=(room,i)=>isInt(i)&&i>=0&&i<room.items.length;

/** own が自分で持つ個数（継いだキー・数でない値は 0） */
function ownCount(own,id){
  if(!has(own,id))return 0;
  const v=own[id];
  return typeof v==='number'&&v>0?v:0;
}

/** 足あとの大きさ。r が奇数なら w と h を入れ替える。知らない id は null
 * @param {string} id @param {number} r @returns {{w:number,h:number}|null} */
export function footprint(id,r){
  if(!has(ITEMS,id))return null;
  const d=ITEMS[id];
  return r%2?{w:d.h,h:d.w}:{w:d.w,h:d.h};
}

/** 置いた家具が占めるマス
 * @param {Placed} p @returns {{x:number,y:number}[]} */
export function cellsOf(p){
  const f=p?footprint(p.id,p.r):null;
  if(!f)return [];
  const out=[];
  for(let dy=0;dy<f.h;dy++)for(let dx=0;dx<f.w;dx++)out.push({x:p.x+dx,y:p.y+dy});
  return out;
}

/** 部屋のマスごとの様子。who[y*n+x]＝家具の番号+1（無ければ 0）、solid＝通れない（walk:false）
 * @param {Room} room @param {number} [ignoreIndex] */
function grid(room,ignoreIndex){
  const n=room.n,who=new Uint16Array(n*n),solid=new Uint8Array(n*n);
  room.items.forEach((p,i)=>{
    if(i===ignoreIndex)return;
    const walk=has(ITEMS,p.id)&&ITEMS[p.id].walk;
    for(const c of cellsOf(p)){
      if(c.x<0||c.y<0||c.x>=n||c.y>=n)continue;
      const k=c.y*n+c.x;
      if(!who[k])who[k]=i+1;
      if(!walk)solid[k]=1;
    }
  });
  return {n,who,solid};
}

/** (x,y) にある家具の番号。無ければ -1
 * @param {Room} room @param {number} x @param {number} y @returns {number} */
export function itemAt(room,x,y){
  const n=room.n;
  if(!isInt(x)||!isInt(y)||x<0||y<0||x>=n||y>=n)return -1;
  return grid(room).who[y*n+x]-1;
}

/** その id を置いた数
 * @param {Room} room @param {string} id @returns {number} */
export function placedCount(room,id){
  let c=0;
  for(const p of room.items)if(p.id===id)c++;
  return c;
}

/** そこに置けるか（§5 の条件すべて）。ignoreIndex＝動かしている家具（自分とは重ならない・数えない）
 * @param {Room} room @param {string} id @param {number} x @param {number} y @param {number} r @param {number} [ignoreIndex] @returns {boolean} */
export function canPlace(room,id,x,y,r,ignoreIndex){
  if(!has(ITEMS,id)||!isInt(x)||!isInt(y)||!isDir(r))return false;
  const n=room.n,f=footprint(id,r);
  if(x<0||y<0||x+f.w>n||y+f.h>n)return false;
  const ignoring=validIndex(room,ignoreIndex);
  if(room.items.length-(ignoring?1:0)+1>MAX_ITEMS)return false;
  const g=grid(room,ignoring?ignoreIndex:undefined);
  for(let dy=0;dy<f.h;dy++)for(let dx=0;dx<f.w;dx++){
    const k=(y+dy)*n+x+dx;
    if(g.who[k])return false;
    if(!ITEMS[id].walk)g.solid[k]=1;
  }
  // 置いたあとも、ぷにが立てるマスが 1 つは残る
  return g.solid.includes(0);
}

/** 持っている家具を置く
 * @param {Room} room @param {Own} own @param {string} id @param {number} x @param {number} y @param {number} r @returns {Room|null} */
export function place(room,own,id,x,y,r){
  if(!canPlace(room,id,x,y,r))return null;
  if(placedCount(room,id)>=ownCount(own,id))return null;
  return withItems(room,[...room.items,{id,x,y,r}]);
}

/** 置いた家具を動かす
 * @param {Room} room @param {number} index @param {number} x @param {number} y @returns {Room|null} */
export function move(room,index,x,y){
  if(!validIndex(room,index))return null;
  const p=room.items[index];
  if(!canPlace(room,p.id,x,y,p.r,index))return null;
  return withItems(room,room.items.map((q,i)=>i===index?{id:p.id,x,y,r:p.r}:q));
}

/** 置いた家具をまわす（r→(r+1)%4。場所は同じ）
 * @param {Room} room @param {number} index @returns {Room|null} */
export function rotate(room,index){
  if(!validIndex(room,index))return null;
  const p=room.items[index],r=(p.r+1)%4;
  if(!canPlace(room,p.id,p.x,p.y,r,index))return null;
  return withItems(room,room.items.map((q,i)=>i===index?{id:p.id,x:p.x,y:p.y,r}:q));
}

/** 置いた家具をしまう
 * @param {Room} room @param {number} index @returns {Room|null} */
export function remove(room,index){
  if(!validIndex(room,index))return null;
  return withItems(room,room.items.filter((_,i)=>i!==index));
}

/** まだ置いていない家具（持っている数−置いた数が 1 以上）。ITEMS の順
 * @param {Room} room @param {Own} own @returns {{id:string,left:number}[]} */
export function stock(room,own){
  const out=[];
  for(const id of Object.keys(ITEMS)){
    const left=Math.floor(ownCount(own,id))-placedCount(room,id);
    if(left>0)out.push({id,left});
  }
  return out;
}

/** マスごとの「置ける・置けない」。長さ n*n、[y*n+x]＝1 置ける・2 置けない
 * @param {Room} room @param {string} id @param {number} r @param {number} [ignoreIndex] @returns {Uint8Array} */
export function placeMask(room,id,r,ignoreIndex){
  const n=room.n,m=new Uint8Array(n*n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)m[y*n+x]=canPlace(room,id,x,y,r,ignoreIndex)?1:2;
  return m;
}

/** 通れないマス（walk:false の家具の足あと）
 * @param {Room} room @returns {{x:number,y:number}[]} */
export function blockedCells(room){
  const {n,solid}=grid(room),out=[];
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(solid[y*n+x])out.push({x,y});
  return out;
}

/** (cx,cy) にいちばん近い通れるマス（距離の 2 乗 → y → x の小さい順）。無ければ null */
function nearest(room,cx,cy){
  const {n,solid}=grid(room);
  let best=null,bd=Infinity;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    if(solid[y*n+x])continue;
    const d=(x-cx)*(x-cx)+(y-cy)*(y-cy);
    if(d<bd){bd=d;best={x,y};}   // y・x の小さい順に見るので、同点は先に見つけたほう
  }
  return best;
}

/** ぷにの おうちのマス。最初の平らな家具のいちばん手前、無ければ部屋の中心にいちばん近い通れるマス
 * @param {Room} room @returns {{x:number,y:number}} */
export function homeFor(room){
  const n=room.n;
  for(const p of room.items){
    if(!has(ITEMS,p.id)||!ITEMS[p.id].flat)continue;
    const f=footprint(p.id,p.r);
    return {x:p.x+f.w-1,y:p.y+f.h-1};
  }
  const c=(n-1)/2;
  return nearest(room,c,c)||{x:Math.floor(c),y:Math.floor(c)};
}

/** (x,y) にいちばん近い通れるマス（自分が通れるならそのまま）
 * @param {Room} room @param {number} x @param {number} y @returns {{x:number,y:number}} */
export function nearestFree(room,x,y){
  const fx=Number.isFinite(x)?x:0,fy=Number.isFinite(y)?y:0;
  const clamp=v=>Math.min(room.n-1,Math.max(0,Math.round(v)));
  return nearest(room,fx,fy)||{x:clamp(fx),y:clamp(fy)};
}

/** もようを使えるか（表にあって、値段 0 か持っている） */
const usable=(table,own,id)=>has(table,id)&&(table[id].price===0||ownCount(own,id)>0);

/** ゆかを かえる
 * @param {Room} room @param {Own} own @param {string} id @returns {Room|null} */
export function setFloor(room,own,id){
  if(!usable(FLOORS,own,id))return null;
  return {...withItems(room,room.items),floor:id};
}

/** かべを かえる
 * @param {Room} room @param {Own} own @param {string} id @returns {Room|null} */
export function setWall(room,own,id){
  if(!usable(WALLS,own,id))return null;
  return {...withItems(room,room.items),wall:id};
}

/** 保存データの持ちものを洗う（§2.2）。カタログにあるキーだけを新しい {} に写す
 * @param {unknown} raw @returns {Own} */
export function cleanOwn(raw){
  /** @type {Own} */
  const out={};
  if(!isObj(raw))return out;
  for(const id of Object.keys(ITEMS)){
    if(!has(raw,id))continue;
    const v=raw[id];
    if(typeof v!=='number'||!Number.isFinite(v))continue;
    const c=Math.min(MAX_OWN,Math.floor(v));
    if(c>=1)out[id]=c;
  }
  for(const table of [FLOORS,WALLS]){
    for(const id of Object.keys(table)){
      if(table[id].price===0||!has(raw,id))continue;
      const v=raw[id];
      if(typeof v==='number'&&v>=1)out[id]=1;
    }
  }
  return out;
}

/** 保存データの部屋を洗う（§2.3）。範囲外・重なり・持っていない・多すぎるものは後ろを捨てる
 * @param {unknown} raw @param {Own} own @returns {Room} */
export function cleanRoom(raw,own){
  const src=isObj(raw)?raw:defaultRoom();
  const n=SIZES.includes(src.n)?src.n:SIZES[0];
  const floor=src.floor,wall=src.wall;
  /** @type {Room} */
  const room={
    n,
    floor:usable(FLOORS,own,floor)?floor:DEFAULT_FLOOR,
    wall:usable(WALLS,own,wall)?wall:DEFAULT_WALL,
    items:[],
  };
  const list=Array.isArray(src.items)?src.items:[];
  const end=Math.min(list.length,MAX_SCAN);
  for(let i=0;i<end&&room.items.length<MAX_ITEMS;i++){
    const p=list[i];
    if(!isObj(p))continue;
    const id=p.id,x=p.x,y=p.y,r=p.r;
    if(placedCount(room,id)>=Math.floor(ownCount(own,id)))continue;
    if(!canPlace(room,id,x,y,r))continue;
    room.items.push({id,x,y,r});
  }
  return room;
}
