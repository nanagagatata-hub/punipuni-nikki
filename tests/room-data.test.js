// room-data.js（おへやのカタログと型）のテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,FLOORS,WALLS,EXPANDS,SIZES,MAX_ITEMS,MAX_OWN,MAX_COIN,MAX_GRANT,DEFAULT_FLOOR,DEFAULT_WALL,has,defaultOwn,defaultRoom} from '../js/room-data.js';

const TABLES=[ITEMS,FLOORS,WALLS,EXPANDS];
const ID_RE=/^[a-z][a-z0-9_]{0,15}$/;
const NAME_RE=/^[ぁ-ゟー ]+$/;

test('表の値：アイテム 17 種（設計書 §8 の順）',()=>{
  const want=[
    ['rug','むらさきの らぐ',12,2,2,true,true],
    ['rug_pink','ももいろの らぐ',12,2,2,true,true],
    ['rug_mint','みんといろの らぐ',12,2,2,true,true],
    ['shelf','ほんだな',20,1,2,false,false],
    ['plant','かんようしょくぶつ',8,1,1,false,false],
    ['lamp','らんぷ',10,1,1,false,false],
    ['ball','ぼーる',8,1,1,false,false],
    ['plush','ぬいぐるみ',5,1,1,false,false],
    ['bed','べっど',30,2,2,false,false],
    ['sofa','そふぁ',25,1,2,false,false],
    ['table','ちゃぶだい',15,1,1,false,false],
    ['chair','いす',10,1,1,false,false],
    ['desk','つくえ',20,1,2,false,false],
    ['toybox','おもちゃばこ',15,1,1,false,false],
    ['cushion','おほしさま くっしょん',8,1,1,false,false],
    ['tent','てんと',30,2,2,false,false],
    ['slide','すべりだい',35,1,2,false,false],
  ];
  assert.equal(want.length,17);
  assert.deepEqual(Object.values(ITEMS).map(d=>[d.id,d.name,d.price,d.w,d.h,d.walk,d.flat]),want);
  assert.deepEqual(Object.keys(ITEMS),want.map(r=>r[0]));
});

test('表の値：ゆか・かべ・ひろげる',()=>{
  const row=d=>[d.id,d.name,d.price];
  assert.deepEqual(Object.values(FLOORS).map(row),[
    ['f_honey','はちみついろの ゆか',0],
    ['f_mint','みんといろの ゆか',15],
    ['f_check','いちまつもようの ゆか',15],
    ['f_cloud','くもの じゅうたん',15],
  ]);
  assert.deepEqual(Object.values(WALLS).map(row),[
    ['w_pink','みずたまの かべ',0],
    ['w_stripe','しましまの かべ',15],
    ['w_star','おほしさまの かべ',15],
    ['w_sky','そらいろの かべ',15],
  ]);
  assert.deepEqual(Object.values(EXPANDS).map(d=>[d.id,d.name,d.price,d.from,d.to]),[
    ['x8','ひろい おへや',100,6,8],
    ['x10','もっと ひろい おへや',200,8,10],
  ]);
  // 値は 4 つの欄だけ（余計なキーを持たない）
  for(const d of [...Object.values(FLOORS),...Object.values(WALLS)])assert.deepEqual(Object.keys(d),['id','name','price']);
  for(const d of Object.values(EXPANDS))assert.deepEqual(Object.keys(d),['id','name','price','from','to']);
  for(const d of Object.values(ITEMS))assert.deepEqual(Object.keys(d),['id','name','price','w','h','walk','flat']);
});

test('表の値：全部で 665 こいん（設計書 §8）',()=>{
  const sum=TABLES.flatMap(t=>Object.values(t)).reduce((a,d)=>a+d.price,0);
  assert.equal(sum,665);
});

test('定数',()=>{
  assert.deepEqual(SIZES,[6,8,10]);
  assert.equal(MAX_ITEMS,60);
  assert.equal(MAX_OWN,99);
  assert.equal(MAX_COIN,999999);
  assert.equal(MAX_GRANT,20);
  assert.equal(DEFAULT_FLOOR,'f_honey');
  assert.equal(DEFAULT_WALL,'w_pink');
  assert.ok(has(FLOORS,DEFAULT_FLOOR)&&has(WALLS,DEFAULT_WALL));
});

test('ID：形が合い、4 つの表を通して重複なし、id はキーと同じ',()=>{
  const seen=new Set();
  for(const t of TABLES)for(const [k,d] of Object.entries(t)){
    assert.match(k,ID_RE);
    assert.equal(d.id,k);
    assert.ok(!seen.has(k),`重複: ${k}`);
    seen.add(k);
  }
  assert.equal(seen.size,17+4+4+2);
});

test('なまえはひらがな',()=>{
  for(const t of TABLES)for(const d of Object.values(t))assert.match(d.name,NAME_RE,d.id);
});

test('ねだんは 0 以上の整数',()=>{
  for(const t of TABLES)for(const d of Object.values(t))assert.ok(Number.isInteger(d.price)&&d.price>=0&&d.price<=MAX_COIN,d.id);
});

test('足あと：w・h は 1〜2、flat なら walk も真',()=>{
  for(const d of Object.values(ITEMS)){
    assert.ok([1,2].includes(d.w)&&[1,2].includes(d.h),d.id);
    assert.equal(typeof d.walk,'boolean');
    assert.equal(typeof d.flat,'boolean');
    if(d.flat)assert.equal(d.walk,true,d.id);
  }
});

test('初期：defaultRoom と defaultOwn',()=>{
  const want={n:6,floor:'f_honey',wall:'w_pink',items:[{id:'rug',x:2,y:2,r:0},{id:'shelf',x:0,y:2,r:0},{id:'plant',x:5,y:0,r:0}]};
  assert.deepEqual(defaultRoom(),want);
  const a=defaultRoom(),b=defaultRoom();
  assert.notEqual(a,b);
  assert.notEqual(a.items,b.items);
  assert.notEqual(a.items[0],b.items[0]);
  a.n=10;a.floor='f_mint';a.items[0].x=5;a.items.push({id:'bed',x:0,y:0,r:0});
  assert.deepEqual(b,want);
  assert.deepEqual(defaultRoom(),want);

  assert.deepEqual(defaultOwn(),{rug:1,shelf:1,plant:1});
  const o=defaultOwn();o.rug=99;o.bed=1;
  assert.deepEqual(defaultOwn(),{rug:1,shelf:1,plant:1});
});

test('has：自分で持つ文字列のキーだけ',()=>{
  assert.equal(has(ITEMS,'bed'),true);
  assert.equal(has(FLOORS,'f_honey'),true);
  assert.equal(has(ITEMS,'__proto__'),false);
  assert.equal(has(ITEMS,'toString'),false);
  assert.equal(has(ITEMS,'constructor'),false);
  assert.equal(has(ITEMS,1),false);
  assert.equal(has(ITEMS,null),false);
  assert.equal(has(ITEMS,undefined),false);
  assert.equal(has(ITEMS,['bed']),false);
  assert.equal(has(ITEMS,'f_honey'),false);
  assert.equal(has(null,'bed'),false);
});

test('凍結：表も中身も変えられない',()=>{
  assert.ok(Object.isFrozen(ITEMS));
  assert.ok(Object.isFrozen(ITEMS.bed));
  for(const t of TABLES){
    assert.ok(Object.isFrozen(t));
    for(const d of Object.values(t))assert.ok(Object.isFrozen(d),d.id);
  }
  assert.ok(Object.isFrozen(SIZES));
});
