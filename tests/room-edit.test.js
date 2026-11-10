// room-edit.js（家具の配置の純ロジック）のテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,MAX_ITEMS,defaultOwn,defaultRoom} from '../js/room-data.js';
import {footprint,cellsOf,itemAt,placedCount,canPlace,place,move,rotate,remove,stock,placeMask,
  blockedCells,homeFor,nearestFree,setFloor,setWall,cleanOwn,cleanRoom} from '../js/room-edit.js';

const R=defaultRoom();
const O=defaultOwn();
const byXY=(a,b)=>a.x-b.x||a.y-b.y;
/** n×n の部屋に 1×1 の plant を、skip が真でないマスへ前から count 個まで並べる */
function filled(n,count,skip=()=>false){
  const items=[];
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    if(items.length<count&&!skip(x,y))items.push({id:'plant',x,y,r:0});
  }
  return {n,floor:'f_honey',wall:'w_pink',items};
}

test('footprint：奇数の向きで w と h が入れ替わる・知らない id は null',()=>{
  assert.deepEqual(footprint('shelf',0),{w:1,h:2});
  assert.deepEqual(footprint('shelf',1),{w:2,h:1});
  assert.deepEqual(footprint('shelf',2),{w:1,h:2});
  assert.deepEqual(footprint('shelf',3),{w:2,h:1});
  assert.equal(footprint('nope',0),null);
  assert.equal(footprint('__proto__',0),null);
  assert.equal(footprint('constructor',0),null);
  assert.equal(footprint(undefined,0),null);
});

test('cellsOf・itemAt・placedCount',()=>{
  assert.deepEqual(cellsOf({id:'shelf',x:0,y:2,r:0}),[{x:0,y:2},{x:0,y:3}]);
  assert.deepEqual(cellsOf({id:'shelf',x:0,y:2,r:1}).sort(byXY),[{x:0,y:2},{x:1,y:2}]);
  assert.equal(cellsOf({id:'rug',x:2,y:2,r:0}).length,4);
  assert.deepEqual(cellsOf({id:'nope',x:0,y:0,r:0}),[]);
  assert.equal(itemAt(R,3,3),0);
  assert.equal(itemAt(R,0,3),1);
  assert.equal(itemAt(R,5,0),2);
  assert.equal(itemAt(R,1,1),-1);
  assert.equal(itemAt(R,-1,0),-1);
  assert.equal(placedCount(R,'rug'),1);
  assert.equal(placedCount(R,'bed'),0);
  assert.equal(placedCount(R,'__proto__'),0);
});

test('canPlace：重なり・はみ出し・自分を除く・整数でない値',()=>{
  assert.equal(canPlace(R,'bed',2,2,0),false);   // ラグと重なる
  assert.equal(canPlace(R,'bed',4,4,0),true);
  assert.equal(canPlace(R,'bed',5,5,0),false);   // はみ出す
  assert.equal(canPlace(R,'plant',0,2,0),false);
  assert.equal(canPlace(R,'shelf',0,2,0,1),true); // 自分を除く
  assert.equal(canPlace(R,'plant',1.5,0,0),false);
  assert.equal(canPlace(R,'plant',1,0,4),false);
  assert.equal(canPlace(R,'plant',1,0,-1),false);
  assert.equal(canPlace(R,'plant',-1,0,0),false);
  assert.equal(canPlace(R,'plant',1,'0',0),false);
  assert.equal(canPlace(R,'plant',1,0,NaN),false);
  assert.equal(canPlace(R,'nope',1,0,0),false);
  assert.equal(canPlace(R,'__proto__',1,0,0),false);
  assert.equal(canPlace(R,'plant',3,3,0),false); // ラグの上にも置けない
});

test('canPlace：60 件で いっぱい',()=>{
  const full=filled(10,MAX_ITEMS);
  assert.equal(full.items.length,60);
  assert.equal(canPlace(full,'plant',9,9,0),false);
  assert.equal(canPlace(full,'plant',9,9,0,0),true); // 動かすときは自分を数えない
  assert.equal(canPlace(filled(10,59),'plant',9,9,0),true);
});

test('canPlace：空きマスを 1 つは残す',()=>{
  const room=filled(6,36,(x,y)=>x===5&&y===5);
  assert.equal(room.items.length,35);
  assert.equal(canPlace(room,'plant',5,5,0),false);
  for(let y=0;y<6;y++)for(let x=0;x<6;x++)assert.equal(canPlace(room,'rug',x,y,0),false);
  // 2 マス空いていれば 1 つは置ける
  const two=filled(6,36,(x,y)=>y===5&&x>=4);
  assert.equal(canPlace(two,'plant',5,5,0),true);
  // ラグ（通れる）は空きマスを減らさない
  const four=filled(6,36,(x,y)=>x>=4&&y>=4);
  assert.equal(canPlace(four,'rug',4,4,0),true);
  assert.equal(canPlace(four,'bed',4,4,0),false);
});

test('元の部屋を変えない',()=>{
  const before=JSON.stringify(R);
  const own={...O,bed:1,f_mint:1,w_star:1};
  assert.ok(place(R,own,'bed',4,4,0));
  assert.ok(move(R,0,3,3));
  assert.ok(rotate(R,1));
  assert.ok(remove(R,1));
  assert.ok(setFloor(R,own,'f_mint'));
  assert.ok(setWall(R,own,'w_star'));
  assert.equal(JSON.stringify(R),before);
  // 返った部屋を書きかえても元は変わらない
  const m=move(R,0,3,3);
  m.items[1].x=4;
  assert.equal(JSON.stringify(R),before);
});

test('place：持っている数まで',()=>{
  assert.equal(place(R,O,'bed',4,4,0),null); // 持っていない
  const own={...O,bed:1};
  const one=place(R,own,'bed',4,4,0);
  assert.deepEqual(one.items.at(-1),{id:'bed',x:4,y:4,r:0});
  assert.equal(one.items.length,4);
  assert.equal(place(one,own,'bed',0,0,0),null); // 2 個目
  assert.equal(place(R,own,'bed',2,2,0),null);   // 重なる
  assert.equal(place(R,O,'plant',1,1,0),null);   // もう置いてある
  assert.equal(place(R,Object.create({bed:1}),'bed',4,4,0),null); // 継いだキーは数えない
  assert.equal(place(R,{...O,bed:'1'},'bed',4,4,0),null);
  assert.equal(place(R,null,'bed',4,4,0),null);
});

test('move',()=>{
  assert.deepEqual(move(R,0,3,3).items[0],{id:'rug',x:3,y:3,r:0});
  assert.equal(move(R,0,0,2),null);
  assert.equal(move(R,9,1,1),null);
  assert.equal(move(R,-1,1,1),null);
  assert.equal(move(R,0.5,1,1),null);
  assert.equal(move(R,0,5,5),null);
  assert.deepEqual(move(R,2,5,0).items,R.items); // 同じ場所へは動かせる
});

test('rotate',()=>{
  const a=rotate(R,1);
  assert.equal(a.items[1].r,1);
  assert.deepEqual(cellsOf(a.items[1]).sort(byXY),[{x:0,y:2},{x:1,y:2}]);
  let room=R;
  for(let i=0;i<4;i++)room=rotate(room,1);
  assert.equal(room.items[1].r,0);
  assert.deepEqual(room,R);
  // 足あとがふさがれる
  const blocked={...R,items:[...R.items,{id:'lamp',x:1,y:2,r:0}]};
  assert.equal(rotate(blocked,1),null);
  // はみ出す
  const edge={...R,items:[{id:'shelf',x:5,y:0,r:0}]};
  assert.equal(rotate(edge,0),null);
  assert.equal(rotate(R,9),null);
});

test('remove と stock',()=>{
  assert.equal(remove(R,1).items.length,2);
  assert.deepEqual(stock(remove(R,1),O),[{id:'shelf',left:1}]);
  assert.deepEqual(stock(R,O),[]);
  assert.deepEqual(stock(R,{...O,bed:2,plush:1}),[{id:'plush',left:1},{id:'bed',left:2}]);
  assert.deepEqual(stock(R,{...O,f_mint:1,zzz:3}),[]); // 家具だけ
  assert.equal(remove(R,3),null);
  assert.equal(remove(R,-1),null);
  assert.equal(remove(R,'1'),null);
});

test('placeMask',()=>{
  const m=placeMask(R,'bed',0);
  assert.ok(m instanceof Uint8Array);
  assert.equal(m.length,36);
  assert.equal(m[4*6+4],1);
  assert.equal(m[2*6+2],2);
  assert.equal(m[5*6+5],2);
  assert.ok(m.every(v=>v===1||v===2));
  // 動かしている家具は自分を除いて見る
  assert.equal(placeMask(R,'rug',0)[2*6+2],2);
  assert.equal(placeMask(R,'rug',0,0)[2*6+2],1);
  assert.ok(placeMask(R,'nope',0).every(v=>v===2));
  assert.equal(placeMask({...R,n:10},'plant',0).length,100);
});

test('blockedCells：ラグは通れる',()=>{
  assert.deepEqual(blockedCells(R).sort(byXY),[{x:0,y:2},{x:0,y:3},{x:5,y:0}]);
  assert.deepEqual(blockedCells({...R,items:[]}),[]);
});

test('homeFor',()=>{
  assert.deepEqual(homeFor(R),{x:3,y:3});
  assert.deepEqual(homeFor({...R,items:[]}),{x:2,y:2});
  assert.deepEqual(homeFor({...R,items:[{id:'plant',x:2,y:2,r:0}]}),{x:3,y:2});
  // 前から最初の平らな家具
  assert.deepEqual(homeFor({...R,items:[{id:'plant',x:2,y:2,r:0},{id:'rug_mint',x:0,y:0,r:1},{id:'rug',x:4,y:4,r:0}]}),{x:1,y:1});
  assert.deepEqual(homeFor({...R,n:10,items:[]}),{x:4,y:4});
});

test('nearestFree',()=>{
  assert.deepEqual(nearestFree(R,0,2),{x:0,y:1});
  assert.deepEqual(nearestFree(R,3,3),{x:3,y:3});
  assert.deepEqual(nearestFree(R,5,0),{x:4,y:0});
  // 部屋の外からでも中の通れるマスを返す
  assert.deepEqual(nearestFree(R,-3,-3),{x:0,y:0});
  assert.deepEqual(nearestFree(R,9,9),{x:5,y:5});
});

test('setFloor・setWall：持っているもようだけ',()=>{
  assert.equal(setFloor(R,O,'f_mint'),null);
  assert.equal(setFloor(R,{f_mint:1},'f_mint').floor,'f_mint');
  assert.equal(setFloor(R,{},'f_honey').floor,'f_honey');
  assert.equal(setFloor(R,{w_star:1},'w_star'),null); // かべは ゆかに使えない
  assert.equal(setFloor(R,O,'zzz'),null);
  assert.equal(setFloor(R,O,'__proto__'),null);
  assert.equal(setWall(R,O,'w_star'),null);
  assert.equal(setWall(R,{w_star:1},'w_star').wall,'w_star');
  assert.equal(setWall(R,{},'w_pink').wall,'w_pink');
  assert.equal(setWall(R,{f_mint:1},'f_mint'),null);
  assert.equal(setWall(R,O,'zzz'),null);
  assert.equal(setWall(R,Object.create({w_star:1}),'w_star'),null);
  const f=setFloor(R,{f_mint:1},'f_mint');
  assert.deepEqual(f.items,R.items);
  assert.notEqual(f.items,R.items);
});

test('ひろげたあとは外側にも置ける',()=>{
  assert.equal(canPlace(R,'plant',7,7,0),false);
  assert.equal(canPlace({...R,n:8},'plant',7,7,0),true);
});

test('cleanOwn：敵対的な入力',()=>{
  const got=cleanOwn(JSON.parse('{"__proto__":{"x":1},"bed":150,"rug":"3","plush":0,"sofa":2.9,"zzz":4,"f_mint":7,"f_honey":1,"x8":1}'));
  assert.deepEqual(got,{bed:99,sofa:2,f_mint:1});
  assert.equal(({}).x,undefined);
  assert.equal(got.x,undefined);
  assert.deepEqual(cleanOwn(null),{});
  assert.deepEqual(cleanOwn([]),{});
  assert.deepEqual(cleanOwn('a'),{});
  assert.deepEqual(cleanOwn(undefined),{});
  assert.deepEqual(cleanOwn({bed:-1,sofa:NaN,lamp:null,ball:[2],chair:true,w_star:0.5,w_sky:1,w_pink:1}),{w_sky:1});
  assert.deepEqual(cleanOwn(Object.create({bed:3})),{}); // 継いだキーは見ない
  // カタログの順（家具 → ゆか → かべ）
  assert.deepEqual(Object.keys(cleanOwn({w_sky:1,f_cloud:1,tent:1,rug:1})),['rug','tent','f_cloud','w_sky']);
  const o=defaultOwn();
  assert.deepEqual(cleanOwn(o),o);
  assert.notEqual(cleanOwn(o),o);
});

const HOSTILE=[
  null,undefined,'a',7,[],{},
  {n:7,floor:'f_mint',wall:'w_star',items:'x'},
  {n:'6',floor:5,wall:null,items:{length:3}},
  {n:6,floor:'__proto__',wall:'constructor',items:[
    {id:'rug',x:2,y:2,r:0},{id:'rug',x:2,y:2,r:0},
    {id:'plant',x:6,y:0,r:0},{id:'zzz',x:0,y:0,r:0},{id:'plant',x:0,y:0,r:5},{id:'plant',x:'1',y:0,r:0},
    null,{id:'__proto__'},'plant',[],7,
    {id:'plant',x:1,y:1,r:0,extra:1},{id:'plant',x:1,y:0,r:0},{id:'shelf',x:0,y:2,r:1},
  ]},
  {n:10,items:Array.from({length:300},(_,i)=>({id:'plant',x:i%10,y:Math.floor(i/10)%10,r:0}))},
];

test('cleanRoom：敵対的な入力',()=>{
  assert.deepEqual(cleanRoom(null,O),defaultRoom());
  assert.deepEqual(cleanRoom('a',O),defaultRoom());
  assert.deepEqual(cleanRoom(undefined,O),defaultRoom());
  // 何も持っていなければ、初期の部屋の家具も置けない
  assert.deepEqual(cleanRoom(null,{}),{n:6,floor:'f_honey',wall:'w_pink',items:[]});

  const a=cleanRoom({n:7,floor:'f_mint',wall:'w_star',items:'x'},O);
  assert.deepEqual(a,{n:6,floor:'f_honey',wall:'w_pink',items:[]});
  assert.equal(cleanRoom({n:8,floor:'f_mint',wall:'w_star',items:[]},{f_mint:1,w_star:1}).floor,'f_mint');
  assert.equal(cleanRoom({n:8,floor:'f_mint',wall:'w_star',items:[]},{f_mint:1,w_star:1}).wall,'w_star');
  assert.equal(cleanRoom({n:8},O).n,8);
  assert.equal(cleanRoom({n:10},O).n,10);
  assert.equal(cleanRoom({n:'8'},O).n,6);
  assert.equal(cleanRoom({floor:'w_pink',wall:'f_honey'},O).floor,'f_honey');
  assert.equal(cleanRoom({floor:'w_pink',wall:'f_honey'},O).wall,'w_pink');

  // 重なり
  const two=[{id:'rug',x:2,y:2,r:0},{id:'rug',x:2,y:2,r:0}];
  assert.deepEqual(cleanRoom({n:6,items:two},{rug:2}).items,[{id:'rug',x:2,y:2,r:0}]);
  // 範囲外・知らない・向き・型・null・__proto__
  const bad=[{id:'plant',x:6,y:0,r:0},{id:'zzz',x:0,y:0,r:0},{id:'plant',x:0,y:0,r:5},{id:'plant',x:'1',y:0,r:0},null,{id:'__proto__'},
    {id:'plant',x:0.5,y:0,r:0},{id:'plant',x:0,y:0},{id:7,x:0,y:0,r:0}];
  assert.deepEqual(cleanRoom({n:6,items:bad},{plant:9}).items,[]);
  // own を超えた 2 個目は捨てる（後ろを捨てる）
  const plants=[{id:'plant',x:0,y:0,r:0},{id:'plant',x:1,y:0,r:0},{id:'shelf',x:3,y:0,r:0}];
  assert.deepEqual(cleanRoom({n:6,items:plants},O).items,[{id:'plant',x:0,y:0,r:0},{id:'shelf',x:3,y:0,r:0}]);
  assert.deepEqual(cleanRoom({n:6,items:plants},{}).items,[]);
  assert.deepEqual(cleanRoom({n:6,items:plants},Object.create({plant:5})).items,[]);
  assert.deepEqual(cleanRoom({n:6,items:plants},null).items,[]);
});

test('cleanRoom：60 件まで・先頭 200 件だけ見る・キーは 4 つ',()=>{
  const many=Array.from({length:300},(_,i)=>({id:'plant',x:i%10,y:Math.floor(i/10)%10,r:0,extra:i}));
  const got=cleanRoom({n:10,items:many},{plant:99});
  assert.equal(got.items.length,60);
  for(const p of got.items)assert.deepEqual(Object.keys(p),['id','x','y','r']);
  assert.notEqual(got.items[0],many[0]);

  const late=Array.from({length:200},()=>({id:'plant',x:99,y:99,r:0}));
  late.push({id:'plant',x:0,y:0,r:0});
  assert.deepEqual(cleanRoom({n:10,items:late},{plant:99}).items,[]);
  late[199]={id:'plant',x:0,y:0,r:0};
  assert.deepEqual(cleanRoom({n:10,items:late},{plant:99}).items,[{id:'plant',x:0,y:0,r:0}]);

  // 空きマスを 1 つは残す
  const full=Array.from({length:36},(_,i)=>({id:'plant',x:i%6,y:Math.floor(i/6),r:0}));
  assert.equal(cleanRoom({n:6,items:full},{plant:99}).items.length,35);
  // 返る部屋のキー
  assert.deepEqual(Object.keys(cleanRoom({n:6,items:[],junk:1,__x:2},O)),['n','floor','wall','items']);
});

test('cleanRoom：冪等',()=>{
  const owns=[O,{},{plant:99,rug:2,shelf:1},{f_mint:1,w_star:1,plant:3}];
  for(const x of HOSTILE)for(const own of owns){
    const once=cleanRoom(x,own);
    assert.deepEqual(cleanRoom(once,own),once);
    // 洗った部屋の家具は、どれも いまの場所に置ける
    once.items.forEach((p,i)=>assert.equal(canPlace(once,p.id,p.x,p.y,p.r,i),true));
    assert.ok(once.items.length<=MAX_ITEMS);
    for(const p of once.items)assert.ok(Object.prototype.hasOwnProperty.call(ITEMS,p.id));
  }
});
