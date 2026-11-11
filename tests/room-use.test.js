// js/room-use.js のテスト（Node 標準の node:test。package.json なしで `node --test tests/*.test.js`）
import test from 'node:test';
import assert from 'node:assert/strict';
import {useSpot, roomUses, pickUse, homeWithBed, slideMotion, ballMotion, SLIDE_T, BALL_T} from '../js/room-use.js';
import {ITEMS, USES} from '../js/room-data.js';
import {blockedCells, homeFor} from '../js/room-edit.js';
import {makeGrid, passable} from '../js/room-ai.js';

const room=(n,items)=>({n,floor:'f_honey',wall:'w_pink',items});

test('全家具×全向き×n=6/8/10 で stand は部屋の中の通れるマス',()=>{
  for(const n of [6,8,10])for(const id of Object.keys(ITEMS))for(const r of [0,1,2,3]){
    const R=room(n,[{id,x:2,y:2,r}]),s=useSpot(R,0);
    assert.ok(s,`${id} r${r} n${n}`);
    const g=makeGrid(n,blockedCells(R));
    assert.ok(passable(g,s.stand.x,s.stand.y),`${id} r${r} n${n}`);
  }
});
test('正面がふさがれると別の辺のマス、囲まれると null',()=>{
  const R=room(6,[{id:'table',x:2,y:2,r:0},{id:'toybox',x:2,y:3,r:0}]);
  const s=useSpot(R,0);assert.ok(s);assert.notDeepEqual(s.stand,{x:2,y:3});
  const box=room(6,[{id:'table',x:0,y:0,r:0},{id:'plant',x:1,y:0,r:0},{id:'plant',x:0,y:1,r:0}]);
  assert.equal(useSpot(box,0),null);
});
test('そふぁ は上に乗る（at＝足あとの中心、lift＝seat）',()=>{
  const s=useSpot(room(6,[{id:'sofa',x:2,y:2,r:0}]),0);
  assert.deepEqual(s.at,{x:2.5,y:3});assert.equal(s.lift,USES.sofa.seat);
});
test('pickUse は重み 0 を選ばない、家具なしは null',()=>{
  const R=room(6,[{id:'lamp',x:1,y:1,r:0}]);
  assert.equal(pickUse(roomUses(R),()=>0.5),null);
  assert.equal(pickUse([],()=>0.5),null);
});
test('homeWithBed：べっど があれば その stand、無ければ homeFor',()=>{
  const R=room(6,[{id:'bed',x:3,y:3,r:0}]),h=homeWithBed(R);
  assert.deepEqual(h.home,useSpot(R,0).stand);assert.equal(h.bed.id,'bed');
  const E=room(6,[]);assert.deepEqual(homeWithBed(E),{home:homeFor(E),bed:null});
});
test('slideMotion：始まりは stand・lift 0、終わりは done・end・lift 0',()=>{
  const s=useSpot(room(6,[{id:'slide',x:2,y:2,r:0}]),0);
  const a=slideMotion(s,0),z=slideMotion(s,SLIDE_T);
  assert.deepEqual([a.x,a.y,a.lift],[s.stand.x+.5,s.stand.y+.5,0]);
  assert.equal(z.done,true);assert.equal(z.lift,0);assert.deepEqual([z.x,z.y],[z.end.x+.5,z.end.y+.5]);
  assert.ok(Math.max(...[1.6,1.8].map(t=>slideMotion(s,t).lift))>=60);
});
test('ballMotion：始まりと終わりでずれ 0',()=>{
  const a=ballMotion(0,{dx:1,dy:0}),z=ballMotion(BALL_T,{dx:1,dy:0});
  assert.deepEqual([a.dx,a.dy],[0,0]);assert.deepEqual([z.dx,z.dy,z.done],[0,0,true]);
  assert.ok(Math.abs(ballMotion(1,{dx:1,dy:0}).dx)>0.3);
});

// ---- ここから追加（ブリーフの外：決まりの細かいところ） ----
test('Spot.end：すべりだい は slideMotion の着地マス、ほかは null',()=>{
  for(const r of [0,1,2,3]){
    const s=useSpot(room(6,[{id:'slide',x:2,y:2,r}]),0);
    assert.deepEqual(s.end,slideMotion(s,SLIDE_T).end,`r${r}`);
  }
  assert.equal(useSpot(room(6,[{id:'table',x:2,y:2,r:0}]),0).end,null);
});
test('すべりだい：はしご側に立ち、すべる面の先に着地（r 奇数は gx/gy 入れ替え）',()=>{
  const s0=useSpot(room(6,[{id:'slide',x:2,y:2,r:0}]),0);
  assert.deepEqual(s0.stand,{x:3,y:2});assert.deepEqual(s0.end,{x:2,y:4});
  const s1=useSpot(room(6,[{id:'slide',x:2,y:2,r:1}]),0);
  assert.deepEqual(s1.stand,{x:2,y:3});assert.deepEqual(s1.end,{x:4,y:2});
  // 着地のマスがふさがれていれば stand に戻る
  const b=useSpot(room(6,[{id:'slide',x:2,y:2,r:0},{id:'plant',x:2,y:4,r:0}]),0);
  assert.deepEqual(b.end,b.stand);
  // 途中も部屋の中、台の上で lift 62
  const m=slideMotion(s0,1.75);assert.equal(m.lift,62);assert.equal(m.done,false);
  assert.deepEqual([m.x,m.y],[2.5,2.33]);
  const m1=slideMotion(s1,1.75);assert.deepEqual([m1.x,m1.y],[2.33,2.5]);
  const z1=slideMotion(s1,SLIDE_T);assert.deepEqual([z1.x,z1.y,z1.lift],[4.5,2.5,0]);
});
test('正面：既定は +gy 側、front:gx は +gx 側、r 奇数で入れ替え',()=>{
  assert.deepEqual(useSpot(room(6,[{id:'table',x:2,y:2,r:0}]),0).stand,{x:2,y:3});
  assert.deepEqual(useSpot(room(6,[{id:'table',x:2,y:2,r:1}]),0).stand,{x:3,y:2});
  // ほんだな（front:gx、1×2）：+gx 側の列 x=3
  assert.equal(USES.shelf.front,'gx');
  assert.equal(useSpot(room(6,[{id:'shelf',x:2,y:2,r:0}]),0).stand.x,3);
  assert.equal(useSpot(room(6,[{id:'shelf',x:2,y:2,r:1}]),0).stand.y,3);
});
test('face：front は家具の方、on は 0',()=>{
  const t=useSpot(room(6,[{id:'table',x:2,y:2,r:0}]),0);
  assert.equal(t.face,135);   // (2,3) から (2.5,2.5) へ＝ -gy 向き
  assert.equal(useSpot(room(6,[{id:'sofa',x:2,y:2,r:0}]),0).face,0);
});
test('ラグ（歩ける on）は足あとの中の x+y 最大のマス、at はその中心',()=>{
  const s=useSpot(room(6,[{id:'rug',x:2,y:2,r:0}]),0);
  assert.deepEqual(s.stand,{x:3,y:3});assert.deepEqual(s.at,{x:3.5,y:3.5});assert.equal(s.lift,0);
});
test('てんと（in）：at は stand から足あとへ 0.4 マス',()=>{
  const s=useSpot(room(6,[{id:'tent',x:2,y:2,r:0}]),0);
  assert.equal(s.stand.y,4);
  assert.ok(Math.abs(Math.hypot(s.at.x-(s.stand.x+.5),s.at.y-(s.stand.y+.5))-.4)<1e-9);
  assert.ok(s.at.y<s.stand.y+.5);
  assert.equal(s.face,0); // のぞく ときは こちらを向く
});
test('useSpot：範囲外・知らない ID は null、roomUses は置いた順',()=>{
  const R=room(6,[{id:'table',x:0,y:0,r:0},{id:'nope',x:3,y:3,r:0},{id:'plush',x:4,y:4,r:0}]);
  assert.equal(useSpot(R,-1),null);assert.equal(useSpot(R,3),null);assert.equal(useSpot(R,1.5),null);
  assert.equal(useSpot(R,1),null);
  assert.deepEqual(roomUses(R).map(s=>s.index),[0,2]);
});
test('pickUse：重みどおりに選ぶ',()=>{
  const R=room(6,[{id:'lamp',x:0,y:0,r:0},{id:'chair',x:2,y:2,r:0},{id:'table',x:4,y:4,r:0}]);
  const u=roomUses(R);   // 重み 0・2・3
  assert.equal(pickUse(u,()=>0).id,'chair');
  assert.equal(pickUse(u,()=>0.39).id,'chair');
  assert.equal(pickUse(u,()=>0.41).id,'table');
  assert.equal(pickUse(u,()=>0.999).id,'table');
});
test('homeWithBed：べっど の stand が無ければ homeFor',()=>{
  const R=room(6,[{id:'bed',x:0,y:0,r:0},{id:'shelf',x:2,y:0,r:0},{id:'shelf',x:0,y:2,r:1}]);
  assert.equal(useSpot(R,0),null);
  assert.deepEqual(homeWithBed(R),{home:homeFor(R),bed:null});
});
test('ballMotion：途中は向きにそって ずれて 回る、0 の向きは動かない',()=>{
  const m=ballMotion(BALL_T/2,{dx:0,dy:2});
  assert.ok(m.dy>0.3&&m.dx===0&&m.rot!==0&&m.done===false);
  assert.ok(m.dy<=0.6+1e-9);
  const z=ballMotion(1,{dx:0,dy:0});assert.deepEqual([z.dx,z.dy,z.rot],[0,0,0]);
  assert.equal(ballMotion(0,{dx:1,dy:0}).rot,0);assert.equal(ballMotion(BALL_T,{dx:1,dy:0}).rot,0);
});
