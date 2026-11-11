// js/room-fx.js と 消えたらんぷの絵のテスト（node --test tests/room-fx.test.js）
import test from 'node:test';
import assert from 'node:assert/strict';
import {fxSVG,wiggleScale,starBurst,addBurst,glowLevel,pickLights} from '../js/room-fx.js';
import {itemSVG,lampOffSVG} from '../js/room-art.js';
import {checkArt,checkSafe} from './helpers/art-check.js';

test('fxSVG は安全な SVG、知らない kind は空',()=>{
  for(const k of ['z','book','pencil','snack','note','heart','drop','star'])checkSafe(fxSVG(k),'fx-'+k+'-');
  assert.equal(fxSVG('nope'),'');assert.equal(fxSVG('__proto__'),'');
  for(const k of ['','constructor',undefined,null,7,{}])assert.equal(fxSVG(k),'');
});
test('fxSVG は 32×32 で、kind ごとにちがう絵',()=>{
  const K=['z','book','pencil','snack','note','heart','drop','star'];
  for(const k of K)assert.ok(fxSVG(k).includes('viewBox="0 0 32 32"'));
  assert.equal(new Set(K.map(fxSVG)).size,K.length);
});
test('wiggleScale は 0.4 秒で 1 に戻る、reduced は弱い',()=>{
  assert.deepEqual(wiggleScale(0.4,false),{sx:1,sy:1});assert.deepEqual(wiggleScale(-1,false),{sx:1,sy:1});
  const a=wiggleScale(0.1,false),b=wiggleScale(0.1,true);
  assert.ok(a.sx>1&&a.sy<1);assert.ok(b.sx-1<a.sx-1);
  // s=sin(π·t/0.4)·(1−t/0.4)、強さ 0.08（reduced 0.04）
  const s=Math.sin(Math.PI*0.1/0.4)*(1-0.1/0.4);
  assert.ok(Math.abs(a.sx-(1+0.08*s))<1e-9&&Math.abs(a.sy-(1-0.08*s))<1e-9);
  assert.ok(Math.abs(b.sx-(1+0.04*s))<1e-9);
  assert.deepEqual(wiggleScale(NaN,false),{sx:1,sy:1});
});
test('starBurst は 5 こ、0.6 秒で消える、reduced は広がらない',()=>{
  assert.equal(starBurst(0.1,false).length,5);assert.deepEqual(starBurst(0.6,false),[]);
  for(const s of starBurst(0.3,true))assert.deepEqual([s.x,s.y],[0,0]);
  // ひろがりながら小さく・薄く。半径は 18px まで
  const e=starBurst(0.1,false),l=starBurst(0.5,false);
  for(let i=0;i<5;i++){
    assert.ok(Math.hypot(l[i].x,l[i].y)>Math.hypot(e[i].x,e[i].y));
    assert.ok(Math.hypot(l[i].x,l[i].y)<=18+1e-9);
    assert.ok(l[i].s<e[i].s&&l[i].a<e[i].a);
    for(const v of [l[i].s,l[i].a])assert.ok(v>=0&&v<=1);
  }
  assert.ok(starBurst(0.5,true)[0].a<starBurst(0.1,true)[0].a);
  assert.deepEqual(starBurst(-0.1,false),[]);assert.deepEqual(starBurst(NaN,false),[]);
});
test('addBurst は 4 組まで',()=>{
  let L=[];for(let i=0;i<6;i++)L=addBurst(L,{id:i});
  assert.deepEqual(L.map(b=>b.id),[2,3,4,5]);
  const A=[{id:0}];assert.notEqual(addBurst(A,{id:1}),A);assert.equal(A.length,1);
  assert.deepEqual(addBurst([{id:0},{id:1}],{id:2},2).map(b=>b.id),[1,2]);
});
test('glowLevel：昼は day だけ、夜は cut と warm、消灯は 0',()=>{
  const d=glowLevel(0,1);assert.equal(d.cut,0);assert.ok(d.day>0);
  const n=glowLevel(0.42,1);assert.ok(Math.abs(n.cut-0.85)<1e-9);assert.ok(Math.abs(n.warm-0.18)<1e-9);assert.equal(n.day,0);
  assert.deepEqual(glowLevel(0.42,0),{cut:0,warm:0,day:0});
  assert.ok(Math.abs(d.day-0.15)<1e-9);
  // 範囲の外は切る
  const o=glowLevel(9,9);for(const k of ['cut','warm','day'])assert.ok(o[k]>=0&&o[k]<=1);
  assert.deepEqual(glowLevel(NaN,NaN),{cut:0,warm:0,day:0});
});
test('pickLights は近い順に 6 つまで',()=>{
  const lamps=Array.from({length:9},(_,i)=>({i,x:i,y:0}));
  assert.deepEqual(pickLights(lamps,{x:0,y:0}),[0,1,2,3,4,5]);
  assert.deepEqual(pickLights(lamps,{x:8,y:0},3),[8,7,6]);
  assert.deepEqual(pickLights([],{x:0,y:0}),[]);
});
test('lampOffSVG は lamp と同じ基準点で、安全',()=>{
  const on=itemSVG('lamp'),off=lampOffSVG();
  assert.deepEqual([off.w,off.h,off.ax,off.ay],[on.w,on.h,on.ax,on.ay]);
  checkArt(off,'lamp',1,1);assert.notEqual(off.svg,on.svg);
  // 電球（#FFD27A）は消え、#D8CFC0 になる。かさは #E6C3CF
  assert.ok(!off.svg.includes('#FFD27A')&&off.svg.includes('#D8CFC0')&&off.svg.includes('#E6C3CF'));
  assert.deepEqual(lampOffSVG(),off);
});
