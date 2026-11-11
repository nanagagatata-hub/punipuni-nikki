// room-shop.js（おみせの純ロジック）のテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,FLOORS,WALLS,EXPANDS} from '../js/room-data.js';
import {DEF} from '../js/state.js';
import {SHOP_CATS,cardState,shopCards,buy} from '../js/room-shop.js';

const snap=S=>JSON.parse(JSON.stringify(S));
const card=(S,cat,id)=>shopCards(S,cat).find(c=>c.id===id);

test('SHOP_CATS：かぐ・ゆか・かべ・ひろげる の順',()=>{
  assert.deepEqual(SHOP_CATS,['kagu','yuka','kabe','hiroge']);
});

test('ちょうど：こいんが値段と同じなら買えて 0 になる',()=>{
  const S=DEF();S.coin=30;
  assert.equal(cardState(S,'bed'),'ok');
  assert.equal(buy(S,'bed'),true);
  assert.equal(S.coin,0);
  assert.equal(S.own.bed,1);
  assert.equal(buy(S,'bed'),false);
  assert.equal(S.coin,0);
  assert.equal(S.own.bed,1);
});

test('足りない：short・need は足りない分・buy しても何も変わらない',()=>{
  const S=DEF();S.coin=29;
  assert.equal(cardState(S,'bed'),'short');
  const c=card(S,'kagu','bed');
  assert.equal(c.state,'short');
  assert.equal(c.need,1);
  const before=snap(S);
  assert.equal(buy(S,'bed'),false);
  assert.deepEqual(snap(S),before);
});

test('99 個：max で買えない',()=>{
  const S=DEF();S.own.plush=99;S.coin=999;
  assert.equal(cardState(S,'plush'),'max');
  assert.equal(buy(S,'plush'),false);
  assert.equal(S.coin,999);
  assert.equal(S.own.plush,99);
});

test('連続：同じ家具を続けて買える・こいんが尽きたら買えない',()=>{
  const S=DEF();S.coin=15;
  for(let i=0;i<3;i++)assert.equal(buy(S,'plush'),true);
  assert.equal(S.coin,0);
  assert.equal(S.own.plush,3);
  assert.equal(buy(S,'plush'),false);
  assert.equal(S.own.plush,3);
});

test('ゆか：ただの柄は owned・買うとその柄になり room は別のオブジェクト',()=>{
  const S=DEF();
  assert.equal(cardState(S,'f_honey'),'owned');
  assert.equal(buy(S,'f_honey'),false);
  assert.equal(cardState(S,'f_mint'),'short');
  S.coin=15;
  assert.equal(cardState(S,'f_mint'),'ok');
  const room=S.room,items=snap(room.items);
  assert.equal(buy(S,'f_mint'),true);
  assert.equal(S.coin,0);
  assert.equal(S.own.f_mint,1);
  assert.equal(S.room.floor,'f_mint');
  assert.notEqual(S.room,room);
  assert.equal(room.floor,'f_honey');
  assert.deepEqual(S.room.items,items);
  assert.equal(cardState(S,'f_mint'),'owned');
  S.coin=30;
  assert.equal(buy(S,'f_mint'),false);
  assert.equal(S.coin,30);
});

test('かべ：ただの柄は owned・買うとその柄になり room は別のオブジェクト',()=>{
  const S=DEF();
  assert.equal(cardState(S,'w_pink'),'owned');
  S.coin=15;
  assert.equal(cardState(S,'w_star'),'ok');
  const room=S.room;
  assert.equal(buy(S,'w_star'),true);
  assert.equal(S.coin,0);
  assert.equal(S.own.w_star,1);
  assert.equal(S.room.wall,'w_star');
  assert.equal(S.room.floor,'f_honey');
  assert.notEqual(S.room,room);
  assert.equal(cardState(S,'w_star'),'owned');
});

test('ひろげる：順番にしか買えず、家具はそのまま、own には入らない',()=>{
  const S=DEF();
  assert.equal(S.room.n,6);
  assert.equal(cardState(S,'x10'),'locked');
  assert.equal(cardState(S,'x8'),'short');
  S.coin=400;
  assert.equal(buy(S,'x10'),false);
  assert.equal(S.coin,400);
  S.coin=100;
  assert.equal(cardState(S,'x8'),'ok');
  const room=S.room,items=snap(room.items);
  assert.equal(buy(S,'x8'),true);
  assert.equal(S.coin,0);
  assert.equal(S.room.n,8);
  assert.notEqual(S.room,room);
  assert.deepEqual(S.room.items,items);
  assert.equal(S.own.x8,undefined);
  assert.equal(cardState(S,'x8'),'owned');
  assert.equal(cardState(S,'x10'),'short');
  S.coin=200;
  assert.equal(cardState(S,'x10'),'ok');
  assert.equal(buy(S,'x10'),true);
  assert.equal(S.room.n,10);
  assert.equal(S.coin,0);
  assert.equal(cardState(S,'x10'),'owned');
  assert.equal(cardState(S,'x8'),'owned');
});

test('知らない ID：null・買えない・何も変わらない',()=>{
  const S=DEF();S.coin=999;
  const before=snap(S);
  assert.equal(cardState(S,'zzz'),null);
  assert.equal(cardState(S,'__proto__'),null);
  assert.equal(cardState(S,'toString'),null);
  assert.equal(cardState(S,undefined),null);
  assert.equal(buy(S,'toString'),false);
  assert.equal(buy(S,'__proto__'),false);
  assert.equal(buy(S,'zzz'),false);
  assert.deepEqual(snap(S),before);
});

test('こわれた こいん：数でなければ買えない',()=>{
  for(const bad of [NaN,Infinity,'999',null,undefined,-5]){
    const S=DEF();S.coin=bad;
    assert.equal(cardState(S,'plush'),'short');
    assert.equal(buy(S,'plush'),false);
    assert.equal(S.own.plush,undefined);
  }
});

test('カード：カタログの順・数・have と need',()=>{
  const S=DEF();S.coin=10;
  const kagu=shopCards(S,'kagu');
  assert.equal(kagu.length,17);
  assert.deepEqual(kagu.map(c=>c.id),Object.keys(ITEMS));
  for(const c of kagu){
    assert.equal(c.name,ITEMS[c.id].name);
    assert.equal(c.price,ITEMS[c.id].price);
    assert.equal(c.have,S.own[c.id]||0);
    assert.equal(c.need,Math.max(0,c.price-10));
    assert.equal(c.state,cardState(S,c.id));
  }
  assert.equal(card(S,'kagu','rug').have,1);
  assert.equal(card(S,'kagu','bed').have,0);
  assert.equal(card(S,'kagu','plush').need,0);
  const yuka=shopCards(S,'yuka'),kabe=shopCards(S,'kabe'),hiroge=shopCards(S,'hiroge');
  assert.deepEqual(yuka.map(c=>c.id),Object.keys(FLOORS));
  assert.deepEqual(kabe.map(c=>c.id),Object.keys(WALLS));
  assert.deepEqual(hiroge.map(c=>c.id),Object.keys(EXPANDS));
  assert.equal(yuka.length,4);
  assert.equal(kabe.length,4);
  assert.equal(hiroge.length,2);
  assert.equal(yuka[0].state,'owned');
  assert.equal(yuka[0].need,0);
  assert.equal(yuka[1].need,5);
  assert.equal(hiroge[0].need,90);
  assert.equal(hiroge[1].state,'locked');
  assert.deepEqual(shopCards(S,'zzz'),[]);
});
