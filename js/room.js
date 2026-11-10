// おへや：投影・深度ソート・夜の暗さ・当たり判定・絵のキャッシュ（DOM に触れない純関数。import しただけで Node でも読める）
// 設計書：docs/superpowers/specs/2026-11-10-oheya-stage0-1-design.md §3.1・§3.4・§3.5
import {TILE_W,TILE_H,WALL_H} from './room-art.js';
import {normDeg} from './room-ai.js';

/** マス座標 → 部屋の SVG と同じ座標系
 * @param {number} gx @param {number} gy @param {number} n
 * @returns {{x:number,y:number}} */
export function toScreen(gx,gy,n){
  return {x:n*TILE_W/2+(gx-gy)*TILE_W/2, y:WALL_H+(gx+gy)*TILE_H/2};
}

/** toScreen の逆変換
 * @param {number} x @param {number} y @param {number} n
 * @returns {{gx:number,gy:number}} */
export function fromScreen(x,y,n){
  const a=(x-n*TILE_W/2)/(TILE_W/2), b=(y-WALL_H)/(TILE_H/2); // a=gx-gy, b=gx+gy
  return {gx:(a+b)/2, gy:(b-a)/2};
}

/** 奥（x+y が小さい）から手前へ。同じなら x 昇順。新しい配列を返す
 * @template {{x:number,y:number}} T
 * @param {T[]} list @returns {T[]} */
export function sortByDepth(list){
  return list.slice().sort((p,q)=>(p.x+p.y)-(q.x+q.y)||p.x-q.x);
}

/** 時間帯ごとの夜の暗さ（0〜1） */
export const NIGHT={asa:0,hiru:0,yuu:0.10,yoru:0.42};
export const NIGHT_COLOR='#1E2350';

/** cur を target へなめらかに近づける（行き過ぎない）
 * @param {number} cur @param {number} target @param {number} dt 秒 @param {number} [tau] */
export function approach(cur,target,dt,tau=2){
  return target+(cur-target)*Math.exp(-dt/tau);
}

/** 部屋全体が w×h に収まる最大倍率
 * @param {number} w @param {number} h @param {number} n */
export function fitScale(w,h,n){
  return Math.min(w/(n*TILE_W), h/(n*TILE_H+WALL_H));
}

/** ぷにの当たり判定の箱（CSS px）。中心 cx・下端 bottom、箱 0..boxW×0..boxH に収める
 * @param {number} cx @param {number} bottom @param {number} sprite
 * @param {number} boxW @param {number} boxH
 * @returns {{left:number,top:number,size:number}} */
export function petBox(cx,bottom,sprite,boxW,boxH){
  const size=Math.min(Math.max(96,sprite*1.3),boxW,boxH);
  const left=Math.min(Math.max(cx-size/2,0),boxW-size);
  const top=Math.min(Math.max(bottom-size,0),boxH-size);
  return {left,top,size};
}

/** 向き（度）を 360/n 度ごとに丸める。-180 以上 180 未満
 * @param {number} deg @param {number} [n] */
export function yawBucket(deg,n=24){
  const step=360/n;
  return normDeg(Math.round(deg/step)*step);
}

/** SVG→画像のキャッシュ。読み込み中は前回 ready だった画像を返す。max 超過で最も古く使ったものを捨てる
 * @typedef {{complete:boolean, naturalWidth:number}} Img */
export class SpriteCache{
  /** @param {number} [max] @param {(svg:string)=>Img} [make] */
  constructor(max=120,make){
    this.max=max; this.make=make; this.map=new Map(); this.last=null;
  }
  /** @param {string} key @param {()=>string} svg 未登録のときだけ呼ぶ
   * @returns {Img|null} */
  get(key,svg){
    let img=this.map.get(key);
    if(img)this.map.delete(key); // 使った順に並べ直す
    else img=this.make(svg());
    this.map.set(key,img);
    if(this.map.size>this.max)this.map.delete(this.map.keys().next().value);
    if(img.complete&&img.naturalWidth>0){this.last=img;return img;}
    return this.last;
  }
}
