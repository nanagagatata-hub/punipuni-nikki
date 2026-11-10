// 保存データ（DEF・sanitize・バックアップコード）のテスト：こいん・持ちもの・部屋
import test from 'node:test';
import assert from 'node:assert/strict';
import {DEF,sanitize,encodeState,decodeState,loadState,KEY,LEGACY_KEY} from '../js/state.js';
import {ADULT_IDS,TASKS} from '../js/data.js';
import {ITEMS,FLOORS,WALLS,defaultOwn,defaultRoom} from '../js/room-data.js';

const json=x=>JSON.parse(JSON.stringify(x));
const viaCode=x=>decodeState(encodeState(x));
/* 時刻のキーは実行した瞬間で変わるので、比べる前にそろえる */
const still=s=>({...s,lastTick:0,adultAt:0,finalAt:0});
const UNDO={t:'jishu',k:'jishu',f:'kotoba',b:0,n:1};

test('DEF のキー',()=>{
  assert.equal(DEF().coin,0);
  assert.deepEqual(DEF().own,{rug:1,shelf:1,plant:1});
  assert.deepEqual(DEF().room,defaultRoom());
  assert.notEqual(DEF().own,DEF().own);
  assert.notEqual(DEF().room.items,DEF().room.items);
});

function oldSave(){
  const x=DEF();
  delete x.coin;delete x.own;delete x.room;
  Object.assign(x,{name:'てすと',stage:2,form:'hoshi',pts:123,
    history:[{f:ADULT_IDS[0],n:'まえ',g:1,s:false}],cnt:{jishu:1},inv:{kotoba:1},undo:[{...UNDO}]});
  return x;
}
test('旧データ：新しいキーの無い v2 はそのまま読めて、初期の こいん・持ちもの・部屋が付く',()=>{
  const x=oldSave();
  const before=JSON.stringify(x);
  const d=sanitize(json(x));
  assert.equal(JSON.stringify(x),before);
  assert.equal(d.v,2);
  assert.equal(d.name,'てすと');assert.equal(d.stage,2);assert.equal(d.form,'hoshi');assert.equal(d.pts,123);
  assert.deepEqual(d.history,[{f:ADULT_IDS[0],n:'まえ',g:1,s:false}]);
  assert.deepEqual(d.cnt,{jishu:1});assert.deepEqual(d.inv,{kotoba:1});
  assert.equal(d.coin,0);
  assert.deepEqual(d.room,defaultRoom());
  assert.deepEqual(d.own,defaultOwn());
  assert.deepEqual(d.undo,[{...UNDO,c:0}]);
  /* 新しいキーを除けば、入れた値がそのまま残る（既存の行は変えていない） */
  const {coin,own,room,undo,...rest}=d;
  const base=json(x);
  for(const k of Object.keys(rest)){
    if(k==='lastTick')continue;
    assert.deepEqual(rest[k],base[k],k);
  }
});
test('旧データ：v1 も移行できて、初期の こいん・持ちもの・部屋が付く',()=>{
  const d=sanitize({v:1,name:'てすと',stage:1,form:'puni',lessonDay:3,pts:10});
  assert.equal(d.v,2);assert.equal(d.name,'てすと');assert.equal(d.stage,1);assert.deepEqual(d.lessonDays,[3]);assert.equal(d.pts,10);
  assert.equal(d.coin,0);assert.deepEqual(d.own,defaultOwn());assert.deepEqual(d.room,defaultRoom());
});
test('旧データ：loadState（v2 のキー・v1 のキー）',()=>{
  const mk=m=>({getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=v;}});
  const a=loadState(mk({[KEY]:JSON.stringify(oldSave())}));
  assert.equal(a.name,'てすと');assert.equal(a.coin,0);assert.deepEqual(a.room,defaultRoom());
  const b=loadState(mk({[LEGACY_KEY]:JSON.stringify({v:1,name:'てすと',stage:1})}));
  assert.equal(b.name,'てすと');assert.deepEqual(b.own,defaultOwn());
});

test('敵対的なコード：coin',()=>{
  const c=v=>viaCode({...DEF(),coin:v}).coin;
  assert.equal(c(-5),0);
  assert.equal(c(1e9),999999);
  assert.equal(c('12'),12);
  assert.equal(c(3.9),3);
  assert.equal(c(null),0);
  assert.equal(c({}),0);
  assert.equal(c([7]),7);
  assert.equal(sanitize({...DEF(),coin:NaN}).coin,0);
  assert.equal(sanitize({...DEF(),coin:Infinity}).coin,0);
});
/* JSON の文字列で書く：オブジェクトリテラルの __proto__ と違い、JSON.parse では「自分で持つキー」になる */
const HOSTILE='{"v":2,"coin":50,"cnt":{"jishu":1},"inv":{"kotoba":1},'+
  '"undo":[{"t":"jishu","k":"jishu","f":"kotoba","b":0,"n":1,"c":50,"__proto__":{"x":1}}],'+
  '"own":{"__proto__":{"x":1},"constructor":5,"bed":150,"rug":"3","plush":0,"sofa":2.9,"zzz":4,"f_mint":7,"f_honey":1,"x8":1,"plant":2},'+
  '"room":{"n":10,"floor":"f_mint","wall":"w_star","__proto__":{"x":1},"extra":1,"items":['+
    '{"id":"bed","x":0,"y":0,"r":0,"__proto__":{"x":1},"z":9},'+   /* 残る（余計なキーは落ちる） */
    '{"id":"sofa","x":1,"y":1,"r":0},'+                              /* べっどと重なる */
    '{"id":"sofa","x":9,"y":9,"r":0},'+                              /* はみ出す */
    '{"id":"sofa","x":-1,"y":0,"r":0},'+                             /* 範囲外 */
    '{"id":"zzz","x":5,"y":5,"r":0},'+                               /* 知らない ID */
    '{"id":"__proto__","x":5,"y":5,"r":0},'+
    '{"id":"constructor","x":5,"y":5,"r":0},'+
    '{"id":"lamp","x":5,"y":5,"r":0},'+                              /* 持っていない */
    '{"id":"plant","x":"5","y":5,"r":0},'+                           /* 数でない */
    '{"id":"plant","x":5.5,"y":5,"r":0},'+
    '{"id":"plant","x":5,"y":5,"r":4},'+
    'null,7,"a",[],'+
    '{"id":"plant","x":5,"y":5,"r":3},'+                             /* 残る */
    '{"id":"plant","x":6,"y":5,"r":0},'+                             /* 残る */
    '{"id":"plant","x":7,"y":5,"r":0},'+                             /* own を超える（2 個まで） */
    '{"id":"sofa","x":3,"y":0,"r":1}'+                               /* 残る（横向き (3,0)(4,0)） */
  ']}}';
test('敵対的なコード：own・room・undo',()=>{
  const code='PUNI2:'+btoa(HOSTILE);
  for(const d of [sanitize(JSON.parse(HOSTILE)),decodeState(code),viaCode(JSON.parse(HOSTILE))]){
    assert.equal(d.coin,50);
    /* rug:"3" は数でないので捨てる。f_honey（値段 0）・x8（ひろげる）は own に入れない */
    assert.deepEqual(d.own,{plant:2,bed:99,sofa:2,f_mint:1});
    assert.deepEqual(Object.keys(d.own),['plant','bed','sofa','f_mint']);
    assert.equal(Object.getPrototypeOf(d.own),Object.prototype);
    assert.deepEqual(d.room,{n:10,floor:'f_mint',wall:'w_pink',items:[
      {id:'bed',x:0,y:0,r:0},{id:'plant',x:5,y:5,r:3},{id:'plant',x:6,y:5,r:0},{id:'sofa',x:3,y:0,r:1}]});
    assert.deepEqual(Object.keys(d.room),['n','floor','wall','items']);
    assert.equal(Object.getPrototypeOf(d.room),Object.prototype);
    for(const it of d.room.items){
      assert.deepEqual(Object.keys(it),['id','x','y','r']);
      assert.equal(Object.getPrototypeOf(it),Object.prototype);
    }
    assert.deepEqual(d.undo,[{t:'jishu',k:'jishu',f:'kotoba',b:0,n:1,c:20}]);
  }
  assert.equal(({}).x,undefined);
  assert.equal(Object.prototype.x,undefined);
  assert.equal(Object.prototype.bed,undefined);
});
test('敵対的なコード：undo の c',()=>{
  const c=v=>sanitize({...DEF(),cnt:{jishu:1},undo:[{...UNDO,c:v}]}).undo[0].c;
  assert.equal(c(50),20);assert.equal(c(-3),0);assert.equal(c('7'),7);assert.equal(c(2.9),2);
  assert.equal(c(NaN),0);assert.equal(c(null),0);assert.equal(c(undefined),0);assert.equal(c({}),0);
});
test('敵対的なコード：own・room の型がおかしい',()=>{
  /* room キーが無く own が文字列 → 持ちものは空、部屋は初期の柄で家具なし（初期の家具を持っていないため） */
  const x=DEF();delete x.room;x.own='str';
  const d=viaCode(x);
  assert.deepEqual(d.own,{});
  assert.deepEqual(d.room,{n:6,floor:'f_honey',wall:'w_pink',items:[]});
  for(const bad of [null,[],7,'a',true]){
    assert.deepEqual(sanitize({...DEF(),own:bad}).own,{});
    /* 持ちものが空なら、初期の家具も置けない */
    assert.deepEqual(sanitize({...DEF(),own:bad}).room.items,[]);
  }
  for(const bad of [null,7,'a',true])assert.deepEqual(sanitize({...DEF(),room:bad}).room,defaultRoom());
  /* 配列の部屋でも落ちず、正しい形になる */
  const arr=sanitize({...DEF(),room:[1,2]}).room;
  assert.equal(arr.n,6);assert.equal(arr.floor,'f_honey');assert.equal(arr.wall,'w_pink');assert.ok(Array.isArray(arr.items));
  assert.deepEqual(sanitize({...DEF(),own:[5,5]}).own,{});
  /* own が undefined でもキーがあれば「あるもの」として空にする */
  assert.deepEqual(sanitize({...DEF(),own:undefined}).own,{});
  const r=sanitize({...DEF(),room:{n:7,floor:'f_mint',wall:'zzz',items:'x'}}).room;
  assert.deepEqual(r,{n:6,floor:'f_honey',wall:'w_pink',items:[]});
  assert.equal(sanitize({...DEF(),room:{n:'8'}}).room.n,6);
  assert.equal(sanitize({...DEF(),room:{n:8}}).room.n,8);
  assert.equal(sanitize({...DEF(),room:{floor:'__proto__',wall:'constructor'}}).room.floor,'f_honey');
  assert.equal(sanitize({...DEF(),room:{floor:'w_pink',wall:'f_honey'}}).room.floor,'f_honey');
  assert.equal(sanitize({...DEF(),room:{floor:'w_pink',wall:'f_honey'}}).room.wall,'w_pink');
});
test('敵対的なコード：部屋の数の上限（先頭 200 件だけ見る・60 件まで・通れるマスを残す）',()=>{
  const own={plant:99};
  /* 先頭 200 件が全部はみ出し、201 件目が正しい → 見ない */
  const far=Array.from({length:200},()=>({id:'plant',x:99,y:0,r:0}));
  assert.deepEqual(sanitize({...DEF(),own,room:{n:10,items:[...far,{id:'plant',x:0,y:0,r:0}]}}).room.items,[]);
  /* 10×10 に 100 件 → 60 件 */
  const all=[];for(let y=0;y<10;y++)for(let x=0;x<10;x++)all.push({id:'plant',x,y,r:0});
  const r=sanitize({...DEF(),own,room:{n:10,items:all}}).room;
  assert.equal(r.items.length,60);
  assert.deepEqual(r.items,all.slice(0,60));
  /* 6×6 を全部ふさごうとしても 1 マス残る */
  const six=[];for(let y=0;y<6;y++)for(let x=0;x<6;x++)six.push({id:'plant',x,y,r:0});
  assert.equal(sanitize({...DEF(),own,room:{n:6,items:six}}).room.items.length,35);
  /* ラグは通れるので、ラグで埋められる */
  const rugs=sanitize({...DEF(),own:{rug:9},room:{n:6,items:[0,2,4].flatMap(y=>[0,2,4].map(x=>({id:'rug',x,y,r:0})))}}).room;
  assert.equal(rugs.items.length,9);
  /* 巨大な配列でも落ちない */
  const huge=Array.from({length:5000},(_,i)=>({id:'plant',x:i%10,y:0,r:0}));
  assert.equal(sanitize({...DEF(),own,room:{n:10,items:huge}}).room.items.length,10);
});

test('冪等：sanitize(sanitize(x)) は sanitize(x) と同じ',()=>{
  const xs=[JSON.parse(HOSTILE),oldSave(),DEF(),(()=>{const x=DEF();delete x.room;x.own='str';return x;})(),
    {v:1,name:'てすと',stage:3,form:ADULT_IDS[0]},
    {...DEF(),own:{bed:1},room:{n:8,floor:'f_check',wall:'w_sky',items:[{id:'bed',x:6,y:6,r:1}]}}];
  for(const x of xs){
    const a=sanitize(json(x));
    const b=sanitize(json(a));
    assert.deepEqual(still(b),still(a));
    const c=decodeState(encodeState(a));
    assert.deepEqual(still(c),still(a));
  }
});

test('40,000 文字：いちばん大きい保存データでもコードに収まり、往復する',()=>{
  const S=DEF();
  S.name='ぷにぷにぷにぷに';S.you='ぷにぷにぷにぷに';S.stage=4;S.form=ADULT_IDS[0];S.shiny=true;S.coin=999999;
  S.history=Array.from({length:200},(_,i)=>({f:ADULT_IDS[i%ADULT_IDS.length],n:'あいうえおかきく',g:9999,s:true}));
  S.own={};
  for(const id of Object.keys(ITEMS))S.own[id]=99;
  for(const t of [FLOORS,WALLS])for(const id of Object.keys(t))if(t[id].price>0)S.own[id]=1;
  const kinds=['plant','lamp','ball','plush','table','chair'];
  const items=[];
  for(let k=0;k<6;k++)for(let i=0;i<10;i++)items.push({id:kinds[k],x:i,y:k,r:3});
  S.room={n:10,floor:'f_cloud',wall:'w_stripe',items};
  const t=TASKS.find(x=>x.id==='jishu');
  S.cnt={jishu:9};S.inv={[t.food]:999};
  S.undo=Array.from({length:30},()=>({t:'jishu',k:'jishu',f:t.food,b:Date.now(),n:1000,c:20}));
  const code=encodeState(S);
  assert.ok(code.length<40000,'length '+code.length);
  const d=decodeState(code);
  assert.equal(d.history.length,200);assert.equal(d.undo.length,30);assert.equal(d.undo[0].c,20);
  assert.equal(d.room.items.length,60);
  assert.deepEqual(d.room,S.room);
  assert.deepEqual(d.own,S.own);
  assert.equal(d.coin,999999);
  /* sanitize を通したあと（実際に保存される形）でも収まる */
  assert.ok(encodeState(d).length<40000);
});
