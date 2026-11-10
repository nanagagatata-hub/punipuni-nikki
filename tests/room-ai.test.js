// js/room-ai.js のテスト（Node 標準の node:test。package.json なしで `node --test tests/*.test.js`）
import test from 'node:test';
import assert from 'node:assert/strict';
import {mulberry32, makeGrid, passable, bfs} from '../js/room-ai.js';

const isStep=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;

test('mulberry32 は同じ種で同じ列', ()=>{
  const a=mulberry32(1),b=mulberry32(1);
  const xs=[a(),a(),a()],ys=[b(),b(),b()];
  assert.deepEqual(xs,ys);
  for(const v of xs){assert.ok(v>=0&&v<1);}
});

test('bfs は最短', ()=>{
  const p=bfs(makeGrid(6,[]),{x:0,y:0},{x:3,y:2});
  assert.equal(p.length,6);
  for(let i=1;i<p.length;i++)assert.ok(isStep(p[i-1],p[i]));
  assert.deepEqual(p[0],{x:0,y:0});assert.deepEqual(p[p.length-1],{x:3,y:2});
});

test('bfs は通れないマスを避ける', ()=>{
  const p=bfs(makeGrid(6,[{x:1,y:0},{x:1,y:1}]),{x:0,y:0},{x:2,y:0});
  assert.ok(p);
  assert.ok(!p.some(c=>c.x===1&&(c.y===0||c.y===1)));
});

test('bfs は届かないと null', ()=>{
  assert.equal(bfs(makeGrid(6,[{x:1,y:0},{x:0,y:1}]),{x:0,y:0},{x:5,y:5}),null);
  assert.equal(bfs(makeGrid(6,[{x:3,y:3}]),{x:0,y:0},{x:3,y:3}),null);
});

test('bfs は from===to で [from]', ()=>{
  assert.deepEqual(bfs(makeGrid(6,[]),{x:2,y:2},{x:2,y:2}),[{x:2,y:2}]);
});

test('bfs は n=6,8,10 で隅から隅へ届く', ()=>{
  for(const n of [6,8,10]){
    const p=bfs(makeGrid(n,[]),{x:0,y:0},{x:n-1,y:n-1});
    assert.equal(p.length,2*n-1);
  }
});

test('passable は範囲外で false', ()=>{
  const g=makeGrid(6,[{x:2,y:3}]);
  assert.equal(passable(g,-1,0),false);
  assert.equal(passable(g,6,0),false);
  assert.equal(passable(g,2,3),false);
  assert.equal(passable(g,0,0),true);
});
