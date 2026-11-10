// js/room-ai.js のテスト（Node 標準の node:test。package.json なしで `node --test tests/*.test.js`）
import test from 'node:test';
import assert from 'node:assert/strict';
import {mulberry32, makeGrid, passable, bfs, createBrain, stepBrain, holdBrain, pauseBrain,
  normDeg, dirYaw, turnToward, pickAct, motion, TURN_GATE, WEIGHTS, BAND_MUL, SPEED, DUR, relocateBrain} from '../js/room-ai.js';
import {blockedCells, homeFor} from '../js/room-edit.js';

const isStep=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;

test('mulberry32 は同じ種で同じ列', ()=>{
  const a=mulberry32(1),b=mulberry32(1);
  const xs=[a(),a(),a()],ys=[b(),b(),b()];
  assert.deepEqual(xs,ys);
  for(const v of xs){assert.ok(v>=0&&v<1);}
});

test('bfs は最短', ()=>{
  const p=bfs(makeGrid(6,[]),{x:0,y:0},{x:3,y:2});
  assert.equal(p.length,6);
  for(let i=1;i<p.length;i++)assert.ok(isStep(p[i-1],p[i]));
  assert.deepEqual(p[0],{x:0,y:0});assert.deepEqual(p[p.length-1],{x:3,y:2});
});

test('bfs は通れないマスを避ける', ()=>{
  const p=bfs(makeGrid(6,[{x:1,y:0},{x:1,y:1}]),{x:0,y:0},{x:2,y:0});
  assert.ok(p);
  assert.ok(!p.some(c=>c.x===1&&(c.y===0||c.y===1)));
});

test('bfs は届かないと null', ()=>{
  assert.equal(bfs(makeGrid(6,[{x:1,y:0},{x:0,y:1}]),{x:0,y:0},{x:5,y:5}),null);
  assert.equal(bfs(makeGrid(6,[{x:3,y:3}]),{x:0,y:0},{x:3,y:3}),null);
});

test('bfs は from===to で [from]', ()=>{
  assert.deepEqual(bfs(makeGrid(6,[]),{x:2,y:2},{x:2,y:2}),[{x:2,y:2}]);
});

test('bfs は n=6,8,10 で隅から隅へ届く', ()=>{
  for(const n of [6,8,10]){
    const p=bfs(makeGrid(n,[]),{x:0,y:0},{x:n-1,y:n-1});
    assert.equal(p.length,2*n-1);
  }
});

test('passable は範囲外で false', ()=>{
  const g=makeGrid(6,[{x:2,y:3}]);
  assert.equal(passable(g,-1,0),false);
  assert.equal(passable(g,6,0),false);
  assert.equal(passable(g,2,3),false);
  assert.equal(passable(g,0,0),true);
});

// ---- ぷにの行動（createBrain・stepBrain ほか） ----
const grid=makeGrid(6,[{x:0,y:2},{x:0,y:3},{x:5,y:0}]);
const home={x:3,y:3};
const ctx=(mode,extra)=>({mode,band:'hiru',reduced:false,home,...extra});
const run=(b,sec,c,rng=mulberry32(1),g=grid)=>{const k=Math.round(sec*30);for(let i=0;i<k;i++)stepBrain(b,1/30,c,g,rng);};
/** 歩いている状態になるまで回す */
const toWalk=(b,c,rng)=>{for(let i=0;i<30*600&&!(b.act==='walk'&&b.path.length);i++)stepBrain(b,1/30,c,grid,rng);};
const pos=b=>[b.x,b.y];

test('定数', ()=>{
  assert.equal(TURN_GATE,60);assert.equal(SPEED,1.2);
  assert.deepEqual(WEIGHTS,{idle:35,walk:30,look:15,hop:10,dance:10});
  assert.deepEqual(BAND_MUL,{asa:{look:1.5},hiru:{walk:1.3,hop:1.3},yuu:{idle:1.5},yoru:{}});
  assert.deepEqual(DUR,{idle:[3,6],look:2,hop:0.6,dance:3});
});

test('egg は home から動かない', ()=>{
  const b=createBrain(6,ctx('egg'));
  run(b,60,ctx('egg'));
  assert.equal(b.x,3.5);assert.equal(b.y,3.5);
});

test('sleep で起動すると最初から home で寝る', ()=>{
  const b=createBrain(6,ctx('sleep'));
  assert.equal(b.act,'sleep');assert.deepEqual(pos(b),[3.5,3.5]);
});

test('sleep になると home まで歩いて寝る', ()=>{
  const b=createBrain(6,ctx('awake'));
  b.x=0.5;b.y=0.5;
  run(b,20,ctx('sleep'));
  assert.equal(b.act,'sleep');assert.deepEqual(pos(b),[3.5,3.5]);
});

test('sick は止まって休む', ()=>{
  const rng=mulberry32(3),b=createBrain(6,ctx('awake'));
  toWalk(b,ctx('awake'),rng);run(b,0.5,ctx('awake'),rng);
  const c=ctx('sick');let t=0;
  while(b.act!=='rest'&&t<1){stepBrain(b,1/30,c,grid,rng);t+=1/30;}
  assert.equal(b.act,'rest');
  const p=pos(b);run(b,10,c,rng);
  assert.deepEqual(pos(b),p);
  assert.equal(b.x%1,0.5);assert.equal(b.y%1,0.5);
});

test('hungry は sad、dance は dance', ()=>{
  const b=createBrain(6,ctx('awake'));run(b,2,ctx('hungry'));assert.equal(b.act,'sad');
  const d=createBrain(6,ctx('awake'));run(d,2,ctx('dance'));assert.equal(d.act,'dance');
});

test('awake は 5 種類だけを選ぶ', ()=>{
  const c=ctx('awake'),b=createBrain(6,c),rng=mulberry32(7),seen=new Set();
  for(let i=0;i<600*30;i++){stepBrain(b,1/30,c,grid,rng);seen.add(b.act);}
  for(const a of seen)assert.ok(['idle','walk','look','hop','dance'].includes(a),a);
  assert.ok(seen.has('walk')&&seen.has('idle'));
});

test('reduced では hop と dance が出ない', ()=>{
  const c=ctx('awake',{reduced:true}),b=createBrain(6,c),rng=mulberry32(7),seen=new Set();
  for(let i=0;i<600*30;i++){stepBrain(b,1/30,c,grid,rng);seen.add(b.act);}
  assert.ok(!seen.has('hop')&&!seen.has('dance'));
  assert.ok(seen.has('walk'));
});

test('時間帯の倍率：あさは look が多い', ()=>{
  const ratio=band=>{const rng=mulberry32(5);let k=0;for(let i=0;i<2000;i++)if(pickAct(ctx('awake',{band}),rng)==='look')k++;return k/2000;};
  assert.ok(ratio('asa')>ratio('hiru'));
});

test('押さえている間と離して 3 秒は動かない', ()=>{
  const c=ctx('awake'),rng=mulberry32(2),b=createBrain(6,c);
  toWalk(b,c,rng);
  holdBrain(b,true);assert.equal(b.act,'idle');
  let p=pos(b);run(b,5,c,rng);assert.deepEqual(pos(b),p);
  holdBrain(b,false);p=pos(b);run(b,2.9,c,rng);assert.deepEqual(pos(b),p);
});

test('pauseBrain(b,3) は 3 秒止める', ()=>{
  const c=ctx('awake'),rng=mulberry32(2),b=createBrain(6,c);
  toWalk(b,c,rng);
  pauseBrain(b,3);
  const p=pos(b);run(b,2.9,c,rng);assert.deepEqual(pos(b),p);
  run(b,60,c,rng);assert.notDeepEqual(pos(b),p);
});

test('長く回しても部屋の外・通れないマスに出ない', ()=>{
  for(let seed=1;seed<=5;seed++){
    const c=ctx('awake'),b=createBrain(6,c),rng=mulberry32(seed);
    let moved=false,last=pos(b);
    for(let i=0;i<3600*30;i++){
      stepBrain(b,1/30,c,grid,rng);
      assert.ok(b.x>=0&&b.x<6&&b.y>=0&&b.y<6);
      assert.ok(passable(grid,Math.floor(b.x),Math.floor(b.y)),`${seed}: ${b.x},${b.y}`);
      if(i>=3000*30&&(b.x!==last[0]||b.y!==last[1]))moved=true;
      last=pos(b);
    }
    assert.ok(moved,`seed ${seed}`);
  }
});

test('dt は 0.1 で切る', ()=>{
  const c=ctx('awake'),rng=mulberry32(4),b=createBrain(6,c);
  toWalk(b,c,rng);run(b,1,c,rng);
  assert.equal(b.act,'walk');
  const [x,y]=pos(b);
  stepBrain(b,3600,c,grid,rng);
  assert.ok(Math.hypot(b.x-x,b.y-y)<=SPEED*0.1+1e-9);
});

test('歩く途中で egg になったら home に置き直す', ()=>{
  const c=ctx('awake'),rng=mulberry32(4),b=createBrain(6,c);
  toWalk(b,c,rng);
  stepBrain(b,1/30,ctx('egg'),grid,rng);
  assert.deepEqual(pos(b),[3.5,3.5]);assert.equal(b.act,'idle');
});

test('行き先が無いときは idle', ()=>{
  const blocked=[];for(let y=0;y<6;y++)for(let x=0;x<6;x++)if(x!==3||y!==3)blocked.push({x,y});
  const g=makeGrid(6,blocked),c=ctx('awake'),b=createBrain(6,c),rng=mulberry32(1);
  for(let i=0;i<300;i++){stepBrain(b,1/30,c,g,rng);assert.notEqual(b.act,'walk');}
});

test('dirYaw の 4 方向', ()=>{
  assert.equal(dirYaw(1,0),45);assert.equal(dirYaw(0,1),-45);
  assert.equal(dirYaw(-1,0),-135);assert.equal(dirYaw(0,-1),135);
});

test('normDeg は -180 以上 180 未満', ()=>{
  assert.equal(normDeg(190),-170);assert.equal(normDeg(-190),170);assert.equal(normDeg(180),-180);assert.equal(normDeg(720),0);
});

test('turnToward はいちばん近い回り方', ()=>{
  const r=turnToward(170,-170,1/30);
  assert.ok(Math.abs(normDeg(r-170)-12)<1e-9);   // 毎秒 360°×1/30 = 12° だけ 170 より大きい側へ
  assert.equal(turnToward(0,90,1),90);
  assert.equal(turnToward(0,-90,1/30),-12);
});

test('大きく向きを変える間は進まない', ()=>{
  const c=ctx('awake'),rng=mulberry32(4),b=createBrain(6,c);
  toWalk(b,c,rng);run(b,1,c,rng);
  // 進む向きと正反対（180°差）に向けて 0.1 秒：まだ動かない
  const t=b.path[0],dx=t.x+0.5-b.x,dy=t.y+0.5-b.y;
  b.yaw=normDeg(dirYaw(dx,dy)+180);
  const p=pos(b);run(b,0.1,c,rng);
  assert.deepEqual(pos(b),p);
  run(b,1,c,rng);assert.notDeepEqual(pos(b),p);
});

test('たちどまりで正面に戻る', ()=>{
  const c=ctx('awake'),b=createBrain(6,c);
  b.yaw=90;b.act='idle';b.t=0;b.dur=100;
  run(b,1,c);
  assert.equal(b.yaw,0);
});

test('dt=0 と目的地にいるときに NaN を出さない', ()=>{
  const c=ctx('awake'),rng=mulberry32(4),b=createBrain(6,c);
  stepBrain(b,0,c,grid,rng);
  for(const k of ['x','y','yaw'])assert.ok(Number.isFinite(b[k]),k);
  // 歩いている最中に dt=0、目的地ちょうどにいる状態でも
  toWalk(b,c,rng);
  b.x=b.path[0].x+0.5;b.y=b.path[0].y+0.5;
  stepBrain(b,0,c,grid,rng);stepBrain(b,0,ctx('sick'),grid,rng);
  for(const k of ['x','y','yaw'])assert.ok(Number.isFinite(b[k]),k);
});

// ---- 見た目の動き（motion） ----
const ACTS=['idle','walk','look','hop','dance','sleep','rest','sad'];
const POSES=['bob','sway','droop','bounce','tilt','squish','spin','none'];
const mb=(act,extra)=>({...createBrain(6,ctx('awake')),act,...extra});

test('motion：横×縦はほぼ 1、値は有限', ()=>{
  for(const act of ACTS)for(const pose of POSES)for(let i=0;i<=100;i++){
    const t=i/10,b=mb(act,{t,yaw:45});
    for(const [pk,sp] of [[undefined,undefined],[0.1,0.3]]){
      const m=motion(b,t,pose,pk,sp);
      assert.ok(Math.abs(m.scaleX*m.scaleY-1)<1e-9,`${act} ${pose} ${t}`);
      for(const k of ['scaleX','scaleY','lift','tilt','yaw'])assert.ok(Number.isFinite(m[k]),`${act} ${pose} ${k}`);
    }
  }
});

test('motion：呼吸の幅', ()=>{
  let lo=9,hi=0,slo=9,shi=0;
  for(let i=0;i<=200;i++){
    const t=i/10,a=motion(mb('idle'),t,'none').scaleY,s=motion(mb('sleep'),t,'none').scaleY;
    lo=Math.min(lo,a);hi=Math.max(hi,a);slo=Math.min(slo,s);shi=Math.max(shi,s);
  }
  assert.ok(lo>=0.98-1e-9&&hi<=1.02+1e-9&&hi-lo>0.03);
  assert.ok(slo>=0.97-1e-9&&shi<=1.03+1e-9&&shi-slo>0.05);
});

test('motion：ぴょんは持ち上がる', ()=>{
  assert.ok(Math.abs(motion(mb('hop',{t:0.3}),0.3,'none').lift-0.35)<0.01);
  assert.equal(motion(mb('hop',{t:0}),0,'none').lift,0);
  assert.ok(motion(mb('hop',{t:0.3}),0.3,'none').scaleY>1);
});

test('motion：ダンスは傾く', ()=>{
  let mx=0;
  for(let i=0;i<=100;i++)mx=Math.max(mx,Math.abs(motion(mb('dance'),i/10,'none').tilt));
  assert.ok(mx<=0.08+1e-9&&mx>0.05);
});

test('motion：あるくは小さく弾む', ()=>{
  let mx=0;
  for(let i=0;i<=100;i++)mx=Math.max(mx,motion(mb('walk'),i/10,'none').lift);
  assert.ok(mx>0.02&&mx<=0.04+1e-9);
});

test('motion：poke はつぶれる', ()=>{
  const b=mb('idle');
  assert.ok(motion(b,0,'none',0.1).scaleY<1);
  assert.equal(motion(b,0,'none',0.6).scaleY,motion(b,0,'none').scaleY);
});

test('motion：yaw は向き、spin は一回転', ()=>{
  const b=mb('idle',{yaw:45});
  assert.equal(motion(b,0,'none').yaw,45);
  assert.equal(motion(b,0,'spin',undefined,0.4).yaw,normDeg(45+180));
  assert.equal(motion(b,0,'spin',undefined,0.8).yaw,45);
  assert.equal(motion(b,0,'spin',undefined,2).yaw,45);
  assert.equal(motion(b,0,'bob',undefined,0.4).yaw,45);
});

test('motion：NaN を渡しても有限', ()=>{
  const m=motion(mb('idle',{t:NaN,yaw:NaN}),NaN,'spin',NaN,NaN);
  for(const k of ['scaleX','scaleY','lift','tilt','yaw'])assert.ok(Number.isFinite(m[k]),k);
});

test('F2: 止めている最中に dance になっても 1 コマで踊り出す', ()=>{
  const c=ctx('awake'),rng=mulberry32(3),b=createBrain(6,c);
  run(b,1,c,rng);
  pauseBrain(b,3);
  stepBrain(b,1/30,ctx('dance'),grid,rng);
  assert.equal(b.act,'dance');
  assert.equal(b.hold,0);
  run(b,2,ctx('dance'),rng);assert.equal(b.act,'dance');
});
test('F2: 止めている最中に egg になるとすぐ home に戻る', ()=>{
  const c=ctx('awake'),rng=mulberry32(3),b=createBrain(6,c);
  b.x=1.5;b.y=1.5;pauseBrain(b,3);
  stepBrain(b,1/30,ctx('egg'),grid,rng);
  assert.deepEqual(pos(b),[home.x+0.5,home.y+0.5]);
});
test('F3: 歩き終わったあとは 1 秒以上 idle で休む', ()=>{
  const c=ctx('awake');
  for(let seed=1;seed<=8;seed++){
    const rng=mulberry32(seed),b=createBrain(6,c);
    toWalk(b,c,rng);
    for(let i=0;i<30*60&&b.act==='walk';i++)stepBrain(b,1/30,c,grid,rng);
    assert.equal(b.act,'idle');
    assert.ok(b.dur>=1&&b.dur<=2.5,'dur='+b.dur);
    run(b,0.9,c,rng);assert.equal(b.act,'idle');
  }
});

// ---- 部屋が変わったとき（relocateBrain）と 家具のある部屋 ----
test('relocateBrain：通れないマスにいたら to の中心へ移り、経路を捨てて idle',()=>{
  const g=makeGrid(6,[{x:2,y:2}]),c=ctx('awake'),b=createBrain(6,c);
  b.x=2.5;b.y=2.5;b.act='walk';b.path=[{x:2,y:2},{x:3,y:2}];b.then=null;
  relocateBrain(b,g,{x:3,y:2});
  assert.equal(b.x,3.5);assert.equal(b.y,2.5);
  assert.equal(b.path.length,0);assert.equal(b.act,'idle');
});
test('relocateBrain：通れるマスにいれば動かない（経路は捨てる）・force なら動く',()=>{
  const g=makeGrid(6,[{x:2,y:2}]),b=createBrain(6,ctx('awake'));
  b.x=1.5;b.y=4.5;b.act='walk';b.path=[{x:1,y:4},{x:1,y:3}];
  relocateBrain(b,g,{x:3,y:2});
  assert.deepEqual(pos(b),[1.5,4.5]);assert.equal(b.path.length,0);assert.equal(b.act,'idle');
  b.act='sleep';
  relocateBrain(b,g,{x:3,y:2});
  assert.equal(b.act,'sleep'); // 歩いていなければ行動はそのまま
  relocateBrain(b,g,{x:3,y:2},true);
  assert.deepEqual(pos(b),[3.5,2.5]);
});
test('relocateBrain：grid.n=8 なら b.n=8',()=>{
  const b=createBrain(6,ctx('awake'));
  relocateBrain(b,makeGrid(8,[]),{x:0,y:0});
  assert.equal(b.n,8);assert.deepEqual(pos(b),[3.5,3.5]);
});
test('家具のある grid で 2000 ステップ：通れないマスに入らない',()=>{
  const room={n:6,floor:'f_honey',wall:'w_pink',items:[
    {id:'bed',x:0,y:0,r:0},{id:'sofa',x:3,y:0,r:0},{id:'desk',x:5,y:2,r:0},{id:'shelf',x:0,y:3,r:1}]};
  const g=makeGrid(6,blockedCells(room)),home=homeFor(room);
  assert.ok(passable(g,home.x,home.y));
  for(let seed=1;seed<=6;seed++){
    const rng=mulberry32(seed),mk=mode=>({mode,band:'hiru',reduced:false,home});
    const b=createBrain(6,mk('awake'));
    for(let i=0;i<2000;i++){
      const mode=i<700?'awake':i<1300?'sleep':'awake';
      stepBrain(b,0.05,mk(mode),g,rng);
      const cx=Math.min(5,Math.max(0,Math.round(b.x-.5))),cy=Math.min(5,Math.max(0,Math.round(b.y-.5)));
      assert.ok(passable(g,cx,cy),`${seed}/${i}: ${b.x},${b.y}`);
      assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y));
    }
  }
});
test('とじこめ：通れるマスが 1 つだけでも例外・NaN なし',()=>{
  const blocked=[];for(let y=0;y<6;y++)for(let x=0;x<6;x++)if(x!==4||y!==1)blocked.push({x,y});
  const g=makeGrid(6,blocked),home={x:4,y:1},rng=mulberry32(7);
  const mk=mode=>({mode,band:'yoru',reduced:false,home});
  const b=createBrain(6,mk('awake'));
  const modes=['awake','sleep','sick','hungry','dance','egg','awake'];
  for(let i=0;i<500;i++){
    stepBrain(b,0.05,mk(modes[Math.floor(i/75)]),g,rng);
    assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.yaw));
    assert.deepEqual(pos(b),[4.5,1.5]);
  }
});
