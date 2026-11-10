// room.js の純関数と SpriteCache のテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import {toScreen,fromScreen,sortByDepth,NIGHT,NIGHT_COLOR,approach,fitScale,petBox,yawBucket,SpriteCache,spriteMaker} from '../js/room.js';

test('toScreen と fromScreen は往復する',()=>{
  for(const n of [6,8,10])for(let i=0;i<100;i++){
    const gx=Math.random()*n,gy=Math.random()*n;
    const s=toScreen(gx,gy,n),b=fromScreen(s.x,s.y,n);
    assert.ok(Math.abs(b.gx-gx)<1e-9&&Math.abs(b.gy-gy)<1e-9);
  }
});
test('toScreen(0,0,6) は (192, 112)',()=>{assert.deepEqual(toScreen(0,0,6),{x:192,y:112});});
test('sortByDepth は奥から',()=>{
  const src=[{x:2,y:2},{x:0,y:1},{x:1,y:0},{x:3,y:0}];
  assert.deepEqual(sortByDepth(src),[{x:0,y:1},{x:1,y:0},{x:3,y:0},{x:2,y:2}]);
  assert.deepEqual(src[0],{x:2,y:2});
});
test('NIGHT の値',()=>{
  assert.deepEqual(NIGHT,{asa:0,hiru:0,yuu:0.10,yoru:0.42});
  assert.equal(NIGHT_COLOR,'#1E2350');
});
test('approach は行き過ぎず単調',()=>{
  let v=0,t=0.42;
  for(let i=0;i<600;i++){const p=v;v=approach(v,t,1/30);assert.ok(v>p&&v<=t);if(i===179)assert.ok(v>=t*0.95);}
  v=0.42;
  for(let i=0;i<600;i++){const p=v;v=approach(v,0,1/30);assert.ok(v<p&&v>=0);if(i===179)assert.ok(v<=0.42*0.05);}
});
test('fitScale は収まる',()=>{
  const s=fitScale(760,570,6);
  assert.ok(6*64*s<=760+1e-9&&(6*32+112)*s<=570+1e-9);
  assert.ok(Math.abs(6*64*s-760)<1e-6||Math.abs((6*32+112)*s-570)<1e-6);
});
test('petBox は最小 96',()=>{
  assert.equal(petBox(100,100,50,400,300).size,96);
  assert.equal(petBox(200,200,100,400,300).size,130);
});
test('petBox は箱の中',()=>{
  const b=petBox(10,5,100,400,300);
  assert.ok(b.left>=0&&b.top>=0&&b.left+b.size<=400&&b.top+b.size<=300);
  const c=petBox(390,299,100,400,300);
  assert.ok(c.left+c.size<=400&&c.top+c.size<=300);
  const d=petBox(50,50,500,200,100);
  assert.equal(d.size,100);
});
test('petBox は絵の真ん中に重なり、上 40% の線が頭のあたりに来る',()=>{
  const sprite=128,bottom=300,b=petBox(400,bottom,sprite,800,600);
  const sTop=bottom-sprite;
  assert.ok(Math.abs((b.top+b.size/2)-(sTop+sprite/2))<1e-9);
  const line=(b.top+b.size*0.4-sTop)/sprite; // 絵の上から何割か
  assert.ok(line>0.3&&line<0.5,'line='+line);
  assert.ok(b.top<=sTop&&b.top+b.size>=bottom);
});
test('yawBucket',()=>{
  assert.equal(yawBucket(7),0);
  assert.equal(yawBucket(8),15);
  assert.equal(yawBucket(-180),yawBucket(180));
});
test('SpriteCache は max 件まで',()=>{
  let calls=0;const make=()=>{calls++;return {complete:true,naturalWidth:1};};
  const c=new SpriteCache(3,make);
  for(const k of ['a','b','c','d'])c.get(k,()=>k);
  assert.equal(calls,4);
  c.get('d',()=>'d');assert.equal(calls,4);
  c.get('a',()=>'a');assert.equal(calls,5);
});
test('SpriteCache は読み込み中に前の絵を返す',()=>{
  const A={complete:true,naturalWidth:5},B={complete:false,naturalWidth:0};
  const c=new SpriteCache(5,svg=>svg==='A'?A:B);
  assert.equal(c.get('A',()=>'A'),A);
  assert.equal(c.get('B',()=>'B'),A);
  B.complete=true;B.naturalWidth=3;
  assert.equal(c.get('B',()=>'B'),B);
});
test('SpriteCache は最初から未完了なら null',()=>{
  const c=new SpriteCache(5,()=>({complete:false,naturalWidth:0}));
  assert.equal(c.get('X',()=>'X'),null);
});

test('import しても DOM に触れず、DOM 側の関数が export されている',async()=>{
  const m=await import('../js/room.js');
  for(const k of ['mount','update','hold','pauseFor','poke','unmount'])assert.equal(typeof m[k],'function',k);
  assert.doesNotThrow(()=>m.unmount());
  assert.doesNotThrow(()=>m.update({view:null,mode:'awake',band:'hiru',now:0}));
});

test('F5: 絵が作れない（空の SVG）ときは fail を呼び、使えない絵を返す',()=>{
  let fails=0,made=0;
  const mk=spriteMaker(()=>fails++,svg=>{made++;return {complete:true,naturalWidth:1};});
  const im=mk('');
  assert.equal(fails,1);assert.equal(made,0);
  assert.equal(im.naturalWidth,0);
  const ok=mk('<svg/>');
  assert.equal(fails,1);assert.equal(made,1);assert.equal(ok.naturalWidth,1);
});
