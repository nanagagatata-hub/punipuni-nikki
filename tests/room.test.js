// room.js の純関数と SpriteCache のテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import {toScreen,fromScreen,sortByDepth,NIGHT,NIGHT_COLOR,approach,fitScale,fitOffset,petBox,yawBucket,SpriteCache,spriteMaker,cellAt,sortForDraw,maskSlot,freeCv,pruneArts} from '../js/room.js';
import {defaultRoom} from '../js/room-data.js';

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
test('fitOffset は部屋を縦横とも中央に置く',()=>{
  for(const [w,h] of [[814,900],[1174,560],[760,570]]){
    const f=fitOffset(w,h,6),rw=6*64*f.s,rh=(6*32+112)*f.s;
    assert.equal(f.s,fitScale(w,h,6));
    assert.ok(Math.abs(f.ox-(w-rw)/2)<1e-9&&Math.abs(f.oy-(h-rh)/2)<1e-9);
    assert.ok(f.ox>=-1e-9&&f.oy>=-1e-9);
  }
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
  for(const k of ['mount','update','hold','pauseFor','poke','unmount','setRoom','setEdit','onCell'])assert.equal(typeof m[k],'function',k);
  assert.doesNotThrow(()=>m.unmount());
  assert.doesNotThrow(()=>m.setRoom(defaultRoom()));
  assert.doesNotThrow(()=>m.setEdit(null));
  assert.doesNotThrow(()=>m.setEdit({mask:new Uint8Array(36),sel:0}));
  assert.doesNotThrow(()=>m.onCell(null));
  assert.doesNotThrow(()=>m.onCell(()=>{}));
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

// ---- 部屋の状態から描く（cellAt・sortForDraw） ----
test('cellAt：全マスの中心がそのマスになる（n=6,8,10）',()=>{
  const ox=10,oy=20,s=0.5;
  for(const n of [6,8,10])for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const P=toScreen(x+.5,y+.5,n);
    assert.deepEqual(cellAt(ox+P.x*s,oy+P.y*s,ox,oy,s,n),{x,y},`${n}: ${x},${y}`);
  }
});
test('cellAt：部屋の外は null',()=>{
  assert.equal(cellAt(0,0,10,20,0.5,6),null);
  for(const n of [6,8,10]){
    const far=toScreen(n+.5,n+.5,n),neg=toScreen(-.5,2,n);
    assert.equal(cellAt(10+far.x*.5,20+far.y*.5,10,20,.5,n),null);
    assert.equal(cellAt(10+neg.x*.5,20+neg.y*.5,10,20,.5,n),null);
  }
  assert.equal(cellAt(NaN,5,0,0,1,6),null);
  assert.equal(cellAt(5,5,0,0,0,6),null);
});
test('sortForDraw：平たいものが先、それぞれ奥から',()=>{
  const src=[{x:5,y:5,flat:true,k:'rug'},{x:.5,y:.5,k:'a'},{x:3,y:3,k:'b'}];
  assert.deepEqual(sortForDraw(src).map(e=>e.k),['rug','a','b']);
  const mix=[{x:4,y:4,k:'b'},{x:3,y:3,flat:true,k:'r2'},{x:1,y:1,flat:true,k:'r1'},{x:1,y:2,k:'a'}];
  assert.deepEqual(sortForDraw(mix).map(e=>e.k),['r1','r2','a','b']);
  assert.equal(src[0].k,'rug'); // 元の配列は変えない
});
test('sortForDraw：2×2 までの家具とぷにの前後（n=6 の全マス）',()=>{
  const n=6;
  for(const [w,h] of [[1,1],[1,2],[2,1],[2,2]])
  for(let fy=0;fy+h<=n;fy++)for(let fx=0;fx+w<=n;fx++){
    const item={x:fx+w/2,y:fy+h/2,k:'item'};
    for(let gy=0;gy<n;gy++)for(let gx=0;gx<n;gx++){
      if(gx>=fx&&gx<fx+w&&gy>=fy&&gy<fy+h)continue; // 足あとの中
      const front=gx>=fx&&gy>=fy;          // 手前（gx+gy が大きい側）
      const back=gx<fx+w&&gy<fy+h;         // 奥
      if(!front&&!back)continue;           // 横に並ぶマスは重ならない
      const pet={x:gx+.5,y:gy+.5,k:'pet'};
      const ks=sortForDraw([pet,item]).map(e=>e.k);
      assert.deepEqual(ks,front?['item','pet']:['pet','item'],`${w}x${h} at ${fx},${fy} pet ${gx},${gy}`);
    }
  }
});
test('maskSlot：もようがえのマスは平たいものの直後（立っているものの前）に入る',()=>{
  assert.equal(maskSlot([]),0);
  assert.equal(maskSlot([{flat:true},{flat:true}]),2);
  assert.equal(maskSlot([{flat:true},{pet:true},{flat:false}]),1);
  assert.equal(maskSlot([{pet:true}]),0);
});

test('freeCv：Canvas を 0×0 にして メモリを返す（null は何もしない）',()=>{
  const c={width:2048,height:1536};
  freeCv(c);
  assert.equal(c.width,0);assert.equal(c.height,0);
  assert.doesNotThrow(()=>freeCv(null));
  assert.doesNotThrow(()=>freeCv(undefined));
});
test('pruneArts：置いていない id の絵を捨てる（onerror を先に外す）',()=>{
  const fail=()=>{};
  const a={img:{onerror:fail,src:'x'}},b={img:{onerror:fail,src:'y'}};
  const m=new Map([['isu',a],['tana',b]]);
  pruneArts(m,new Set(['isu']));
  assert.deepEqual([...m.keys()],['isu']);
  assert.equal(a.img.onerror,fail);
  assert.equal(b.img.onerror,null);
  pruneArts(m,new Set());
  assert.equal(m.size,0);
  assert.equal(a.img.onerror,null);
});
