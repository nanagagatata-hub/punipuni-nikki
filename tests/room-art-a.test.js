// js/room-art-a.js（と、まだ空の -b・-c）のテスト（node --test tests/room-art-a.test.js）
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ART_A} from '../js/room-art-a.js';
import {ART_B} from '../js/room-art-b.js';
import {ART_C} from '../js/room-art-c.js';
import {ITEMS} from '../js/room-data.js';
import {checkArt,checkSafe,GROUPS} from './helpers/art-check.js';

test('ART_A の絵は §8.1 の形式と安全を守る',()=>{
  assert.ok(Object.keys(ART_A).length>0);
  for(const id of Object.keys(ART_A))checkArt(ART_A[id](),id,ITEMS[id].w,ITEMS[id].h);
});

test('ART_A・B・C のキーは自分のグループの ID だけ',()=>{
  assert.ok(Object.keys(ART_A).every(id=>GROUPS.A.includes(id)));
  assert.ok(Object.keys(ART_B).every(id=>GROUPS.B.includes(id)));
  assert.ok(Object.keys(ART_C).every(id=>GROUPS.C.includes(id)));
  for(const id of ['shelf','plant'])assert.equal(typeof ART_A[id],'function');
});

test('表は凍結済み・プロトタイプなし',()=>{
  for(const T of [ART_A,ART_B,ART_C]){
    assert.ok(Object.isFrozen(T));
    assert.equal(Object.getPrototypeOf(T),null);
  }
});

test('GROUPS は ITEMS の 17 種をちょうど 1 回ずつ（順番も同じ）',()=>{
  assert.deepEqual([...GROUPS.A,...GROUPS.B,...GROUPS.C],Object.keys(ITEMS));
});

test('絵は呼ぶたびに同じ（ID だけで決まる）',()=>{
  for(const id of Object.keys(ART_A))assert.deepEqual(ART_A[id](),ART_A[id]());
});

test('checkSafe・checkArt は決まりを破った絵を落とす',()=>{
  const ok='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 80" width="76" height="80" aria-hidden="true"><circle cx="1" cy="1" r="1"/></svg>';
  const art=(svg=ok,o={})=>({svg,w:76,h:80,ax:38,ay:40,...o});
  checkSafe(ok);checkArt(art(),'plant',1,1);
  const bad=s=>ok.replace('<circle',s+'<circle');
  for(const s of [
    ok.slice(1),ok.replace(' xmlns="http://www.w3.org/2000/svg"',''),
    bad('<script>1</script>'),bad('<g onload="x"/>'),bad('<g style="fill:red"/>'),bad('<a href="#a"/>'),bad('<use xlink:href="#a"/>'),
    bad('<image src="http://example.invalid/a.png"/>'),bad('<g fill="a" fill="b"/>'),
  ])assert.throws(()=>checkSafe(s),s);
  assert.throws(()=>checkArt(art(bad('<g id="x"/>')),'plant',1,1));
  assert.throws(()=>checkArt(art(bad('<g fill="url(#x)"/>')),'plant',1,1));
  checkArt(art(bad('<g id="ri-plant-g"/><g fill="url(#ri-plant-g)"/>')),'plant',1,1);
  assert.throws(()=>checkArt(art(ok+' '.repeat(20001-ok.length)),'plant',1,1));
  for(const o of [{w:NaN},{h:Infinity},{ax:0},{ay:-1},{ax:31},{ax:45},{h:71},{ay:151,h:200}])assert.throws(()=>checkArt(art(ok,o),'plant',1,1),JSON.stringify(o));
  assert.throws(()=>checkArt(art(),'shelf',1,2)); // 1×2 の足あとには 小さすぎる
  assert.throws(()=>checkArt(null,'plant',1,1));
});

test('ART_A のキーは GROUPS.A の 8 つちょうど',()=>{
  assert.deepEqual(Object.keys(ART_A).sort(),[...GROUPS.A].sort());
});

test('ラグ 3 色はたがいに違う絵で、同じ形・平たい（床から上は 6px 以下＋線と余白）',()=>{
  const r=['rug','rug_pink','rug_mint'].map(id=>ART_A[id]());
  assert.equal(new Set(r.map(a=>a.svg)).size,3);
  for(const a of r){
    assert.deepEqual({w:a.w,h:a.h,ax:a.ax,ay:a.ay},{w:r[0].w,h:r[0].h,ax:r[0].ax,ay:r[0].ay});
    assert.ok(a.ay<=16,`ay=${a.ay}`);
  }
});

test('ほんだな は Task 3 のハッシュのまま',()=>{
  const sha=s=>createHash('sha256').update(s).digest('hex');
  const m=ART_A.shelf();
  assert.equal(sha(m.svg),'5b1c1812e9cb3acbe8e2d1ff63f31f41c59d7960817f1d66aa7b2598cd763d4e');
  assert.deepEqual({w:m.w,h:m.h,ax:m.ax,ay:m.ay},{w:108,h:160,ax:70,ay:106});
});
