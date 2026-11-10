// js/room-art-c.js のテスト（node --test tests/room-art-c.test.js）
import test from 'node:test';
import assert from 'node:assert/strict';
import {ART_A} from '../js/room-art-a.js';
import {ART_B} from '../js/room-art-b.js';
import {ART_C} from '../js/room-art-c.js';
import {ITEMS,has} from '../js/room-data.js';
import {checkArt,GROUPS} from './helpers/art-check.js';

test('ART_C のキーは GROUPS.C の 4 つちょうど',()=>{
  assert.deepEqual(Object.keys(ART_C).sort(),[...GROUPS.C].sort());
});

test('ART_C の絵は §8.1 の形式と安全を守る',()=>{
  for(const id of GROUPS.C)checkArt(ART_C[id](),id,ITEMS[id].w,ITEMS[id].h);
});

test('ART_C は凍結済み・プロトタイプなし',()=>{
  assert.ok(Object.isFrozen(ART_C));
  assert.equal(Object.getPrototypeOf(ART_C),null);
});

test('ART_C の絵は呼ぶたびに同じ（ID だけで決まる）・たがいに違う',()=>{
  for(const id of GROUPS.C)assert.deepEqual(ART_C[id](),ART_C[id]());
  assert.equal(new Set(GROUPS.C.map(id=>ART_C[id]().svg)).size,GROUPS.C.length);
});

test('てんと は 2×2、すべりだい は 1×2 の足あと（高さ ay<=150）',()=>{
  assert.deepEqual([ITEMS.tent.w,ITEMS.tent.h],[2,2]);
  assert.deepEqual([ITEMS.slide.w,ITEMS.slide.h],[1,2]);
  for(const id of ['tent','slide'])assert.ok(ART_C[id]().ay<=150);
});

test('予備の箱はどの ID にも使われない（全 17 種に専用の絵）',()=>{
  for(const id of Object.keys(ITEMS))
    assert.ok(has(ART_A,id)||has(ART_B,id)||has(ART_C,id),`${id} に専用の絵が無い`);
});
