// おへや：主役のぷにの自律行動（DOM に触れない純粋ロジック。乱数は引数で注入する）
// 設計書：docs/superpowers/specs/2026-11-10-oheya-stage0-1-design.md §2.2・§4
// 出所：
//  - mulberry32・between は oekaki `src/tank/random.ts`（b1611f5）からほぼそのまま。TS の型を JSDoc に変更。
//  - bfs（マス目の経路探索）は新規。

/** @typedef {() => number} Random  0以上1未満 */
/** @typedef {{n:number, block:Uint8Array}} Grid  block[gy*n+gx]=1 は通れない */
/** @typedef {'egg'|'sleep'|'sick'|'dance'|'hungry'|'awake'} Mode */
/** @typedef {'asa'|'hiru'|'yuu'|'yoru'} Band */
/** @typedef {'idle'|'walk'|'look'|'hop'|'dance'|'sleep'|'rest'|'sad'} Act */
/** @typedef {{x:number, y:number, act:Act, t:number, dur:number,
 *   path:{x:number,y:number}[], yaw:number, want:number, hold:number, held:boolean, n:number}} Brain
 *   x,y は足もとのマス座標（マスの中心は i+0.5）。yaw は今の向き・want は向きたい向き（度。0 が正面、+ で見ている人から見て右、±180 が後ろ）。
 *   hold はタッチ後に止まっている残り秒 */
/** @typedef {{mode:Mode, band:Band, reduced:boolean, home:{x:number,y:number}}} BrainCtx  home はねんねのマス */
/** @typedef {{scaleX:number, scaleY:number, lift:number, tilt:number, yaw:number}} Motion  yaw は絵を選ぶ向き（度。spin のときは一回転を足す） */
/** @typedef {{form:string, face:string, arms:string, think:string|null, pose:string,
 *   shiny:boolean, final:boolean, pts:number}} PetView  look() と S から作る、絵のキーになる値 */

/** 種を固定できる乱数
 * @param {number} seed
 * @returns {Random} */
export function mulberry32(seed){
  let a=seed>>>0;
  return ()=>{
    a=(a+0x6d2b79f5)>>>0;
    let t=a;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

/** @param {Random} rng @param {number} min @param {number} max @returns {number} */
export function between(rng,min,max){return min+rng()*(max-min);}

/** @param {number} n @param {{x:number,y:number}[]} blocked @returns {Grid} */
export function makeGrid(n,blocked){
  const block=new Uint8Array(n*n);
  for(const c of blocked){if(c.x>=0&&c.y>=0&&c.x<n&&c.y<n)block[c.y*n+c.x]=1;}
  return {n,block};
}

/** 範囲内で通れるマスか
 * @param {Grid} grid @param {number} x @param {number} y @returns {boolean} */
export function passable(grid,x,y){
  return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<grid.n&&y<grid.n&&!grid.block[y*grid.n+x];
}

const STEPS=[[1,0],[0,1],[-1,0],[0,-1]];
/** 4 方向の最短経路（from と to を含む）。届かない・to が通れないなら null
 * @param {Grid} grid @param {{x:number,y:number}} from @param {{x:number,y:number}} to
 * @returns {{x:number,y:number}[]|null} */
export function bfs(grid,from,to){
  if(!passable(grid,to.x,to.y))return null;
  if(from.x===to.x&&from.y===to.y)return [{x:from.x,y:from.y}];
  const n=grid.n,prev=new Int32Array(n*n).fill(-1),start=from.y*n+from.x,goal=to.y*n+to.x;
  if(from.x<0||from.y<0||from.x>=n||from.y>=n)return null;
  prev[start]=start;
  const q=[start];
  for(let h=0;h<q.length;h++){
    const cur=q[h];if(cur===goal)break;
    const cx=cur%n,cy=(cur-cx)/n;
    for(const [dx,dy] of STEPS){
      const nx=cx+dx,ny=cy+dy;
      if(!passable(grid,nx,ny))continue;
      const k=ny*n+nx;if(prev[k]>=0)continue;
      prev[k]=cur;q.push(k);
    }
  }
  if(prev[goal]<0)return null;
  const path=[];
  for(let k=goal;;k=prev[k]){path.push({x:k%n,y:Math.floor(k/n)});if(k===start)break;}
  return path.reverse();
}
