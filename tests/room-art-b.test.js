// js/room-art-b.js のテスト（node --test tests/room-art-b.test.js）
import test from 'node:test';
import assert from 'node:assert/strict';
import {ART_B} from '../js/room-art-b.js';
import {ITEMS} from '../js/room-data.js';
import {checkArt,GROUPS} from './helpers/art-check.js';

test('ART_B のキーは GROUPS.B の 5 つちょうど',()=>{
  assert.deepEqual(Object.keys(ART_B).sort(),[...GROUPS.B].sort());
});

test('ART_B の絵は §8.1 の形式と安全を守る',()=>{
  for(const id of GROUPS.B){
    assert.equal(typeof ART_B[id],'function',id);
    checkArt(ART_B[id](),id,ITEMS[id].w,ITEMS[id].h);
  }
});

test('5 つの絵は たがいに違い、呼ぶたびに同じ',()=>{
  const svgs=GROUPS.B.map(id=>ART_B[id]&&ART_B[id]().svg);
  assert.equal(new Set(svgs).size,GROUPS.B.length);
  for(const id of GROUPS.B)assert.deepEqual(ART_B[id](),ART_B[id]());
});
