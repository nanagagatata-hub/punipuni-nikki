// こいん（grantCoin・undoReport）のテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import {DEF} from '../js/state.js';
import {grantCoin,undoReport} from '../js/rules.js';

test('grantCoin：0〜20 の整数に丸めて足し、増えた数を返す',()=>{
  let S={coin:0};
  assert.equal(grantCoin(S,3),3);assert.equal(S.coin,3);
  S={coin:0};assert.equal(grantCoin(S,25),20);assert.equal(S.coin,20);
  S={coin:5};assert.equal(grantCoin(S,-1),0);assert.equal(S.coin,5);
  S={coin:0};assert.equal(grantCoin(S,2.7),2);assert.equal(S.coin,2);
  S={coin:7};assert.equal(grantCoin(S,NaN),0);assert.equal(S.coin,7);
  S={coin:0};assert.equal(grantCoin(S,'3'),3);assert.equal(S.coin,3);
  S={coin:0};assert.equal(grantCoin(S,Infinity),0);assert.equal(S.coin,0);
  S={coin:0};assert.equal(grantCoin(S,undefined),0);assert.equal(S.coin,0);
});
test('grantCoin：999999 で止まる',()=>{
  const S={coin:999998};
  assert.equal(grantCoin(S,3),1);assert.equal(S.coin,999999);
  assert.equal(grantCoin(S,3),0);assert.equal(S.coin,999999);
});
test('grantCoin：coin がおかしくても数に戻す',()=>{
  let S={};assert.equal(grantCoin(S,3),3);assert.equal(S.coin,3);
  S={coin:NaN};assert.equal(grantCoin(S,3),3);assert.equal(S.coin,3);
  S={coin:-4};assert.equal(grantCoin(S,3),3);assert.equal(S.coin,3);
});

function reported(coin,c){
  const S=DEF();
  S.cnt={jishu:1};S.inv={kotoba:1};S.coin=coin;
  const u={t:'jishu',k:'jishu',f:'kotoba',b:0,n:1};
  if(c!==undefined)u.c=c;
  S.undo=[u];
  return S;
}
test('取り消しで戻る',()=>{
  const S=reported(1,1);
  assert.equal(undoReport(S,'jishu'),true);
  assert.equal(S.coin,0);
  assert.equal(S.inv.kotoba,undefined);
  assert.equal(S.cnt.jishu,undefined);
  assert.equal(S.undo.length,0);
});
test('使ったあと：取り消しても 0 で止まる（借金にしない）',()=>{
  const S=reported(0,1);
  assert.equal(undoReport(S,'jishu'),true);
  assert.equal(S.coin,0);
});
test('古い undo：c の無い項目では coin は変わらない',()=>{
  const S=reported(5);
  assert.equal(undoReport(S,'jishu'),true);
  assert.equal(S.coin,5);
});
test('取り消せないときは coin も変わらない',()=>{
  const S=reported(5,1);S.inv={};
  assert.equal(undoReport(S,'jishu'),false);
  assert.equal(S.coin,5);
});
