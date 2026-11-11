# おへや 段階4（家具であそぶ・らんぷのあかり・タップで呼ぶ）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** おへやで、ぷにが家具を使って遊び（自分から／タップで）、床タップで呼べ、タップに手ごたえがあり、夜は らんぷ のまわりが明るくなる（v2.7.0）。

**Architecture:** 家具ごとの使い方 `USES`（データ）→ 立ち位置などの純計算 `room-use.js` → 頭 `room-ai.js` に `use` 動作 → 描画とタップ `room.js`（演出の純計算と SVG は `room-fx.js`）→ 画面のきまり `room-ui.js`。保存形式は変えない。

**Tech Stack:** 素の ES モジュール、Canvas 2D、SVG 文字列、`node:test`（package.json なし）、Playwright MCP。

**Spec:** `docs/superpowers/specs/2026-11-11-oheya-stage4-furniture-play-design.md`

## Global Constraints
- `CLAUDE.md` の「設計上の約束」1〜10 を守る：ビルド・依存なし、外部通信なし、CSP `'self'` のみ、インライン script/style/onclick なし、`innerHTML` に利用者の値を入れない、保存データは `sanitize()`、保存形式 `v:2` を変えない、UI 文言はひらがな、キャラは死なない、オリジナルの絵だけ。
- 保存キーを足さない。`js/state.js` は触らない。
- `js/app.js` は `APP_VERSION` だけ変える。`sw.js` は `VERSION` を `'v2.7.0'` にし、`ASSETS` に `'./js/room-use.js'`・`'./js/room-fx.js'` を足す。
- テスト：`node --test tests/*.test.js` がすべて通る。構文：`for f in js/*.js; do node --check "$f"; done`。
- 家具 ID をロジックの分岐に書かない（`USES` の値で決める）。例外は `ball`・`slide`・`lamp`・`plant`・`tent` の専用演出を `act`（`kick`・`slide`・`lamp`・`water`・`peek`）で分けること。
- 新しい顔・手の絵は作らない。`petSVG` の今ある顔だけ。
- 1 コマの失敗で部屋を止めない。fx 絵の読み込み失敗で `r.fail()` を呼ばない。

## Review Focus
1. もようがえ・復元・世代交代で家具が消えた／番号がずれたのに、ぷにが古い家具の位置に乗ったまま・らんぷの点灯が別のらんぷに移る → `relocateBrain` で `use` を捨て、`setRoom` で `lampOff` を空にする（Task 3・Task 5 のテスト／確認）。
2. まわりを家具で囲まれた家具をタップ → 動かず「とどかないよ」（Task 2 `useSpot` が null、Task 6 確認）。
3. 寝ている・具合が悪い・おなかがすいた・たまご・踊り中のタップ → 歩かない、手ごたえは出る（Task 3 テスト、Task 6）。
4. 歩いている途中に別の家具・床を続けてタップ → 最後のタップ先へ行く（Task 3 テスト）。
5. 夜のもようがえ中（家具を別の板で暗くする経路）でも らんぷ の光が出て、エラーにならない（Task 5 確認）。

---

### Task 1: 使い方の表 `USES`

**Files:**
- Modify: `js/room-data.js`（`EXPANDS` のあと）
- Test: `tests/room-data.test.js`

**Interfaces:**
- Produces: `export const USES: Readonly<{[id:string]:UseDef}>`、`export const USE_ACTS`、`export const USE_FX`。`UseDef` は Spec §2 の型に `front?:'gx'|'gy'`（省略時 `'gy'`）を足したもの。

- [ ] **Step 1: 失敗するテストを書く**

```js
import {USES,USE_ACTS,USE_FX,ITEMS,has} from '../js/room-data.js';
test('USES は ITEMS の 17 種すべてにあり、値が決まった範囲',()=>{
  assert.deepEqual(Object.keys(USES).sort(),Object.keys(ITEMS).sort());
  for(const [id,u] of Object.entries(USES)){
    assert.ok(['on','front','side','in'].includes(u.spot)||u.act==='slide',id);
    assert.ok(USE_ACTS.includes(u.act),id);
    assert.ok(USE_FX.includes(u.fx),id);
    assert.ok(u.dur[0]>0&&u.dur[1]>=u.dur[0],id);
    assert.ok(u.seat>=0&&u.w>=0,id);
    assert.match(u.say,/^[ぁ-ゟー〜…！？、。 ]+$/u,id); // ひらがな・記号だけ
    if(u.front!==undefined)assert.ok(u.front==='gx'||u.front==='gy',id);
  }
});
test('らんぷは自分では使わない（w=0）、USES は凍結',()=>{
  assert.equal(USES.lamp.w,0);assert.equal(USES.lamp.act,'lamp');
  assert.ok(Object.isFrozen(USES)&&Object.isFrozen(USES.bed));
  assert.equal(has(USES,'__proto__'),false);
});
```

- [ ] **Step 2:** `node --test tests/room-data.test.js` → FAIL（`USES` が無い）。
- [ ] **Step 3: 実装** — Spec §2 の表の値どおり。`slide` は `spot:'front'`（はしご側の決め方は Task 2）、`seat` は表の括弧の値（無い行は 0）。`USE_ACTS`＝`['sit','sleep','read','study','eat','play','hug','water','lamp','peek','kick','slide']`、`USE_FX`＝`['','z','book','pencil','snack','note','heart','drop','star']`。`dur` は配列も `Object.freeze`。
- [ ] **Step 4:** 同じコマンド → PASS。
- [ ] **Step 5:** commit `feat(oheya): 家具の使い方の表 USES`

### Task 2: 立ち位置と専用の動き `js/room-use.js`

**Files:**
- Create: `js/room-use.js`
- Test: `tests/room-use.test.js`

**Interfaces:**
- Consumes: `USES`（Task 1）、`footprint`・`blockedCells`・`homeFor`・`cellsOf`（`room-edit.js`）、`makeGrid`・`passable`（`room-ai.js`）。
- Produces:
  - `useSpot(room, index) → Spot|null`、`Spot={index,id,stand:{x,y},at:{x,y},lift:number,face:number,act:string,spot:string}`。`at` はマス座標の実数（描く位置）、`face` は度（`dirYaw` と同じ向きの決まり）。
  - `roomUses(room) → Spot[]`（`useSpot` が null でない全家具。置いた順）
  - `pickUse(uses, rng) → Spot|null`（`USES[id].w` の重み。全部 0 なら null）
  - `homeWithBed(room) → {home:{x,y}, bed:Spot|null}`
  - `slideMotion(spot, t) → {x,y,lift,done:boolean,end:{x,y}}`（4 秒）
  - `ballMotion(t, dir:{dx,dy}) → {dx,dy,rot,done}`（2.5 秒。ぼーるの絵のずれ。マス単位）
  - `SLIDE_T=4`、`BALL_T=2.5`

**決まり（Spec §3.1・§3.2・§3.5）：**
- 正面：`front` が `'gy'`（既定）なら足あとの +gy 側の辺に接するマス列、`'gx'` なら +gx 側。`r` が奇数なら gx/gy を入れ替える。その列の真ん中に近い順に、通れるマスを選ぶ。
- 正面がふさがれていたら、足あとの 4 辺に接するマスを「+gy 側 → +gx 側 → −gy 側 → −gx 側」の順に見て最初の通れるマス（決定的にするため、ぷにの位置は使わない）。
- `on`：`ITEMS[id].walk` なら足あとの中の通れるマスのうち `x+y` が最大のもの＝`stand`＝`at`（lift＝seat）。歩けない家具は上の規則で `stand`、`at`＝足あとの中心、`lift`＝`seat`。
- `in`：正面のマスが `stand`、`at` は `stand` から足あとの方へ 0.4 マス。
- `side`：4 辺のマスを上の順で、`face` は家具の中心へ向く。
- `face`：`front` と `in` は家具の方を向く（`dirYaw(家具中心−stand)`）。`on` は 0（正面）。
- 正面は Task の最初に `js/room-art-*.js` の各絵を見て決める。+gy 側に顔（本・引き出し・入口など）が描かれていないものは `USES` の `front:'gx'` にする（Task 1 のファイルを直してよい）。
- すべりだい：はしごは `r=0` で +gx 面（`room-art-c.js` の `slide()`）、すべる面は +gy へ。`stand`＝足あとの +gx 側に接するマス（台の側、gy=y）。`slideMotion`：0–1.5 秒 stand→台（gx 中心, gy=y+0.33）へ lift 0→62、1.5–2.0 秒そのまま、2.0–3.5 秒 gy y+0.62→y+1.95 で lift 62→6、3.5–4.0 秒 足あとの +gy 側に接するマス（`end`。通れなければ `stand`）へ着地。`r` 奇数は gx/gy を入れ替える。

- [ ] **Step 1: 失敗するテスト**

```js
const room=(n,items)=>({n,floor:'f_honey',wall:'w_pink',items});
test('全家具×全向き×n=6/8/10 で stand は部屋の中の通れるマス',()=>{
  for(const n of [6,8,10])for(const id of Object.keys(ITEMS))for(const r of [0,1,2,3]){
    const R=room(n,[{id,x:2,y:2,r}]),s=useSpot(R,0);
    assert.ok(s,`${id} r${r} n${n}`);
    const g=makeGrid(n,blockedCells(R));
    assert.ok(passable(g,s.stand.x,s.stand.y),`${id} r${r} n${n}`);
  }
});
test('正面がふさがれると別の辺のマス、囲まれると null',()=>{
  const R=room(6,[{id:'table',x:2,y:2,r:0},{id:'toybox',x:2,y:3,r:0}]);
  const s=useSpot(R,0);assert.ok(s);assert.notDeepEqual(s.stand,{x:2,y:3});
  const box=room(6,[{id:'table',x:0,y:0,r:0},{id:'plant',x:1,y:0,r:0},{id:'plant',x:0,y:1,r:0}]);
  assert.equal(useSpot(box,0),null);
});
test('そふぁ は上に乗る（at＝足あとの中心、lift＝seat）',()=>{
  const s=useSpot(room(6,[{id:'sofa',x:2,y:2,r:0}]),0);
  assert.deepEqual(s.at,{x:2.5,y:3});assert.equal(s.lift,USES.sofa.seat);
});
test('pickUse は重み 0 を選ばない、家具なしは null',()=>{
  const R=room(6,[{id:'lamp',x:1,y:1,r:0}]);
  assert.equal(pickUse(roomUses(R),()=>0.5),null);
  assert.equal(pickUse([],()=>0.5),null);
});
test('homeWithBed：べっど があれば その stand、無ければ homeFor',()=>{
  const R=room(6,[{id:'bed',x:3,y:3,r:0}]),h=homeWithBed(R);
  assert.deepEqual(h.home,useSpot(R,0).stand);assert.equal(h.bed.id,'bed');
  const E=room(6,[]);assert.deepEqual(homeWithBed(E),{home:homeFor(E),bed:null});
});
test('slideMotion：始まりは stand・lift 0、終わりは done・end・lift 0',()=>{
  const s=useSpot(room(6,[{id:'slide',x:2,y:2,r:0}]),0);
  const a=slideMotion(s,0),z=slideMotion(s,SLIDE_T);
  assert.deepEqual([a.x,a.y,a.lift],[s.stand.x+.5,s.stand.y+.5,0]);
  assert.equal(z.done,true);assert.equal(z.lift,0);assert.deepEqual([z.x,z.y],[z.end.x+.5,z.end.y+.5]);
  assert.ok(Math.max(...[1.6,1.8].map(t=>slideMotion(s,t).lift))>=60);
});
test('ballMotion：始まりと終わりでずれ 0',()=>{
  const a=ballMotion(0,{dx:1,dy:0}),z=ballMotion(BALL_T,{dx:1,dy:0});
  assert.deepEqual([a.dx,a.dy],[0,0]);assert.deepEqual([z.dx,z.dy,z.done],[0,0,true]);
  assert.ok(Math.abs(ballMotion(1,{dx:1,dy:0}).dx)>0.3);
});
```

- [ ] **Step 2:** `node --test tests/room-use.test.js` → FAIL（モジュールが無い）。
- [ ] **Step 3:** 実装。`useSpot` は `index` が範囲外・`USES` に無い ID なら `null`。DOM に触れない、import は `room-data.js`・`room-edit.js`・`room-ai.js` だけ。
- [ ] **Step 4:** PASS。`node --test tests/*.test.js` も PASS。
- [ ] **Step 5:** commit `feat(oheya): 家具の立ち位置・すべりだい・ぼーる の動き（room-use.js）`

### Task 3: 頭に `use` 動作（`js/room-ai.js`）

**Files:**
- Modify: `js/room-ai.js`
- Test: `tests/room-ai.test.js`

**Interfaces:**
- Consumes: `Spot`（Task 2）。
- Produces:
  - `BrainCtx` に `uses:Spot[]`（自分で使う候補。無ければ `[]`）を足す。`pickUse` は呼び出し側から注入せず、`room-ai.js` の中で `w` を重みに選ぶ（`USES` を import してよい）。
  - `Brain` に `use:{spot:Spot,t:number,dur:number}|null`、`pending:{spot:Spot,dur:number}|null`。
  - `Act` に `'use'`。`WEIGHTS.use=15`（`ctx.uses` に `w>0` が無ければ 0）。
  - `goUse(b, grid, spot, dur) → boolean`（awake でなければ false。経路が無ければ false）
  - `goTo(b, grid, cell) → boolean`（同上。着いたら正面を向いて 1.5 秒 idle）
  - 既存の `relocateBrain` は `use`・`pending` を捨てる。`enter`（mode が変わる）も捨てる。`holdBrain(b,true)` も捨てる。
- 使い終わり：`b.t>=b.use.dur` で `use=null`、`act='idle'`、`dur=between(rng,1,2.5)`。すべりだいは `SLIDE_T`、ぼーるは `BALL_T`、らんぷは `USES.lamp.dur[0]`（呼ぶ側が `dur` を決める。自分で選んだときは `between(dur[0],dur[1])`）。
- すべりだいの終わりで `b.x,b.y` を `slideMotion(spot,SLIDE_T).end` の中心へ。それ以外は `stand` のまま（描画で `at`・`lift` に描く）。

- [ ] **Step 1: 失敗するテスト**（既存の書き方にそろえる）

```js
const R6=items=>({n:6,floor:'f_honey',wall:'w_pink',items});
const awake={mode:'awake',band:'hiru',reduced:false,home:{x:0,y:0},uses:[]};
const run=(b,ctx,grid,sec,rng=mulberry32(1))=>{for(let t=0;t<sec;t+=0.05)stepBrain(b,0.05,ctx,grid,rng);};
test('goUse：歩いて stand に着くと use、dur 秒で idle に戻る',()=>{
  const room=R6([{id:'shelf',x:4,y:0,r:0}]),grid=makeGrid(6,blockedCells(room)),s=useSpot(room,0);
  const b=createBrain(6,awake);
  assert.equal(goUse(b,grid,s,2),true);
  run(b,awake,grid,8);           // 着くまで
  // 使い終わったあとは idle 系、use は null
  assert.equal(b.use,null);assert.notEqual(b.act,'use');
  assert.deepEqual([Math.floor(b.x),Math.floor(b.y)],[s.stand.x,s.stand.y]);
});
test('goUse の途中で goTo すると行き先が変わる',()=>{
  const room=R6([{id:'shelf',x:4,y:0,r:0}]),grid=makeGrid(6,blockedCells(room));
  const b=createBrain(6,awake);goUse(b,grid,useSpot(room,0),2);
  run(b,awake,grid,0.3);goTo(b,grid,{x:0,y:5});run(b,awake,grid,10);
  assert.deepEqual([Math.floor(b.x),Math.floor(b.y)],[0,5]);assert.equal(b.pending,null);
});
test('sleep に変わると use をやめる、awake 以外では goUse・goTo は false',()=>{
  const room=R6([{id:'rug',x:2,y:2,r:0}]),grid=makeGrid(6,blockedCells(room)),s=useSpot(room,0);
  const b=createBrain(6,awake);goUse(b,grid,s,30);run(b,awake,grid,6);
  assert.equal(b.act,'use');
  const night={...awake,mode:'sleep'};run(b,night,grid,0.1);
  assert.equal(b.use,null);
  assert.equal(goUse(b,grid,s,3),false);assert.equal(goTo(b,grid,{x:0,y:0}),false);
});
test('relocateBrain で use と pending が消える',()=>{
  const room=R6([{id:'rug',x:2,y:2,r:0}]),grid=makeGrid(6,blockedCells(room));
  const b=createBrain(6,awake);goUse(b,grid,useSpot(room,0),30);run(b,awake,grid,6);
  relocateBrain(b,grid,{x:0,y:0});assert.equal(b.use,null);assert.equal(b.pending,null);
});
test('uses が空、または w がすべて 0 なら pickAct は use を選ばない',()=>{
  const lamp=useSpot(R6([{id:'lamp',x:1,y:1,r:0}]),0);
  for(const uses of [[],[lamp]])for(let i=0;i<200;i++)assert.notEqual(pickAct({...awake,uses},mulberry32(i)),'use');
});
test('家具があれば いつか自分で use を選ぶ',()=>{
  const room=R6([{id:'rug',x:2,y:2,r:0}]),grid=makeGrid(6,blockedCells(room));
  const ctx={...awake,uses:roomUses(room)},b=createBrain(6,ctx);
  let seen=false;const rng=mulberry32(3);
  for(let t=0;t<300&&!seen;t+=0.05){stepBrain(b,0.05,ctx,grid,rng);seen=b.act==='use';}
  assert.ok(seen);
});
test('すべりだい の use が終わると end のマスへ',()=>{
  const room=R6([{id:'slide',x:2,y:1,r:0}]),grid=makeGrid(6,blockedCells(room)),s=useSpot(room,0);
  const b=createBrain(6,{...awake,home:s.stand});b.x=s.stand.x+.5;b.y=s.stand.y+.5;
  goUse(b,grid,s,SLIDE_T);run(b,awake,grid,SLIDE_T+0.5);
  const e=slideMotion(s,SLIDE_T).end;assert.deepEqual([b.x,b.y],[e.x+.5,e.y+.5]);
});
```

- [ ] **Step 2:** `node --test tests/room-ai.test.js` → FAIL。
- [ ] **Step 3:** 実装。歩いて着いたら `then==='use'` で `pending` から `use` を作る（`b.t=0`、`b.want=spot.face`）。`use` 中は `b.t+=dt` だけ（歩かない）。既存の `WEIGHTS` を見ているテストがあれば、`use` を足した値に合わせて直す（`pickAct` の既存の挙動：`uses` が空なら今と同じ確率になること）。
- [ ] **Step 4:** `node --test tests/*.test.js` → PASS。
- [ ] **Step 5:** commit `feat(oheya): ぷにが家具を使う・タップで呼ぶ（room-ai.js）`

### Task 4: 演出の絵と計算 `js/room-fx.js`、消えたらんぷ

**Files:**
- Create: `js/room-fx.js`
- Modify: `js/room-art-a.js`（`lampOffSVG` を export。`ART_A` には入れない）、`js/room-art.js`（`lampOffSVG` を再 export）
- Test: `tests/room-fx.test.js`

**Interfaces:**
- Produces:
  - `fxSVG(kind:'z'|'book'|'pencil'|'snack'|'note'|'heart'|'drop'|'star') → string`（32×32、`checkSafe` に通る。知らない kind は `''`）
  - `wiggleScale(age:number, reduced:boolean) → {sx,sy}`（0.4 秒。`age<0` か `>=0.4` で `{1,1}`。強さ 0.08、reduced は 0.04）
  - `starBurst(age:number, reduced:boolean) → {x,y,s,a}[]`（5 こ。0.6 秒。`age>=0.6` で `[]`。reduced は x,y がすべて 0）
  - `addBurst(list, burst, max=4) → list`（新しい配列。古いものから捨てて最大 4 組）
  - `glowLevel(dark:number, on:number) → {cut:number, warm:number, day:number}`（`dark` は 0..0.42、`on` は 0..1。`cut=0.85*on*dark/0.42`、`warm=0.18*on*dark/0.42`、`day=0.15*on*(1-dark/0.42)`。0..1 に切る）
  - `pickLights(lamps:{i,x,y}[], pet:{x,y}, max=6) → number[]`（近い順に `i` を最大 6 つ）
  - `lampOffSVG() → ItemArt`（`lamp` と同じ `w,h,ax,ay`）

- [ ] **Step 1: 失敗するテスト**

```js
import {checkSafe} from './helpers/art-check.js';
test('fxSVG は安全な SVG、知らない kind は空',()=>{
  for(const k of ['z','book','pencil','snack','note','heart','drop','star'])checkSafe(fxSVG(k));
  assert.equal(fxSVG('nope'),'');assert.equal(fxSVG('__proto__'),'');
});
test('wiggleScale は 0.4 秒で 1 に戻る、reduced は弱い',()=>{
  assert.deepEqual(wiggleScale(0.4,false),{sx:1,sy:1});assert.deepEqual(wiggleScale(-1,false),{sx:1,sy:1});
  const a=wiggleScale(0.1,false),b=wiggleScale(0.1,true);
  assert.ok(a.sx>1&&a.sy<1);assert.ok(b.sx-1<a.sx-1);
});
test('starBurst は 5 こ、0.6 秒で消える、reduced は広がらない',()=>{
  assert.equal(starBurst(0.1,false).length,5);assert.deepEqual(starBurst(0.6,false),[]);
  for(const s of starBurst(0.3,true))assert.deepEqual([s.x,s.y],[0,0]);
});
test('addBurst は 4 組まで',()=>{
  let L=[];for(let i=0;i<6;i++)L=addBurst(L,{id:i});
  assert.deepEqual(L.map(b=>b.id),[2,3,4,5]);
});
test('glowLevel：昼は day だけ、夜は cut と warm、消灯は 0',()=>{
  const d=glowLevel(0,1);assert.equal(d.cut,0);assert.ok(d.day>0);
  const n=glowLevel(0.42,1);assert.ok(Math.abs(n.cut-0.85)<1e-9);assert.ok(Math.abs(n.warm-0.18)<1e-9);assert.equal(n.day,0);
  assert.deepEqual(glowLevel(0.42,0),{cut:0,warm:0,day:0});
});
test('pickLights は近い順に 6 つまで',()=>{
  const lamps=Array.from({length:9},(_,i)=>({i,x:i,y:0}));
  assert.deepEqual(pickLights(lamps,{x:0,y:0}),[0,1,2,3,4,5]);
});
test('lampOffSVG は lamp と同じ基準点で、安全',()=>{
  const on=itemSVG('lamp'),off=lampOffSVG();
  assert.deepEqual([off.w,off.h,off.ax,off.ay],[on.w,on.h,on.ax,on.ay]);
  checkArt(off,'lamp',1,1);assert.notEqual(off.svg,on.svg);
});
```

- [ ] **Step 2:** `node --test tests/room-fx.test.js` → FAIL。
- [ ] **Step 3:** 実装。絵はオリジナルの簡単な形（色は既存の `#FFD84D`・`#FF7FA0`・`#9FD3F5` など）。`fxSVG` の表は `Object.create(null)` で作り、`has` で引く。消えたらんぷ：かさ `#E6C3CF`、柱の電球（`#FFD27A` の だ円）を `#D8CFC0` に。
- [ ] **Step 4:** `node --test tests/*.test.js` → PASS（`room-art-a.test.js` の「ART_A のキー＝GROUPS.A」も通ること）。
- [ ] **Step 5:** commit `feat(oheya): 頭の上の絵・★・ぶるんっ・らんぷの光の計算（room-fx.js）と消えたらんぷの絵`

### Task 5: `room.js` に組み込む（描画とタップ）

**Files:**
- Modify: `js/room.js`

**Interfaces:**
- Consumes: Task 2〜4 のすべて。
- Produces（`room-ui.js` が使う）：
  - `onTap(cb:(x:number,y:number,hit:number)=>void|null)`（通常時のタップ。もようがえ中は今までどおり `cellCb`。`#roomPet` の上は届かない）
  - `useItem(index) → 'go'|'busy'|'far'|'none'`（`none`＝`USES` に無い／範囲外、`busy`＝awake でない、`far`＝`useSpot` null か経路なし）
  - `callTo(x,y) → 'go'|'busy'|'far'`
  - `wiggle(index)`、`burstAt(px,py)`（部屋の SVG 座標）
  - `mount` の `opt.onUse(id:string)`：ぷにが家具を使い始めた瞬間に 1 回（`b.act` が `'use'` に変わったコマ）
- 中で持つ状態：`r.uses`（`applyRoom` で `roomUses`）、`r.bed`・`r.home`（`homeWithBed`）、`r.lampOff:Set<number>`（`setRoom` で空に）、`r.lampOn:Map<number,number>`（0..1、`approach` で 1 秒）、`r.wig:Map<index,start>`、`r.bursts`、`r.fxImgs`（kind→Image。読めなければ描かない）、`r.lampOffImg`。
- 描き方（Spec §4.3・§5.2・§6）：
  - ぷにの描く位置：`act==='use'` なら `spot.at`＋`lift`（kick は stand、slide は `slideMotion`）。`act==='sleep'` で `r.bed` があり、ぷにが `r.home` にいれば べっど の `at`・`lift`。`drawPet` に `lift`（px）を渡し、影は床の位置に残す。
  - 並べ順：`on`・`in`・べっど の上 は、使っている家具のリスト項目の直後（家具と同じ深さで後ろに）。それ以外は今までどおり。
  - てんと：`peek` 中は `ctx.save(); ctx.beginPath(); ctx.rect(…入口の床の線より上…); ctx.clip()` してから `drawPet`（体の下 45% を隠す）。
  - 家具：`r.wig` があれば足もとを軸に `wiggleScale`。`water` 中の植物も同じ（1 秒ごとに wiggle を入れ直す）。ぼーるは `kick` 中 `ballMotion` のずれ（向き＝ぷにから ぼーる）。消えたらんぷは `lampOffImg`。
  - 頭の上の絵：`USES[id].fx`。ぷにの頭の右上（`sx+14, sy-TILE_W-…`）、1.5 秒周期 2px 上下。`z` は 3 つを 0.5 秒ずつずらして浮かべる、`drop` は植物の上から 3 つ落とす。
  - らんぷの光：`pickLights` の 6 つ。暗さを重ねたあと（通常の経路と、夜のもようがえの経路の両方）に、`glowLevel(r.dark, lampOn)` で `destination-out`（cut）→ `lighter` で `#FFD9A0`（warm）。昼は `day` で小さな光。半径 80（部屋の SVG の px）、中心は らんぷ のかさ（基準点から上へ 85px）。
  - ★：`burstAt` で `addBurst`。毎コマ `starBurst(age)` を描き、空になった組は捨てる。
  - らんぷの切り替え：`opt.onUse` を呼ぶのと同じコマで、`act==='lamp'` なら `lampOff` をトグル。
- `tapCell`：もようがえ中（`r.cellCb`）は今のまま。そうでなく `r.tapCb` があれば同じ `(x,y,hit)` を渡す。家具も床も無ければ呼ばない。
- 重さ：fx の絵は kind ごとに 1 枚、★ は 4 組×5、光は 6。寝ているときの 10fps はそのまま（★・wiggle がある間は 30fps）。

- [ ] **Step 1:** 実装（純関数は Task 2〜4 にあるので、ここは組み込みだけ）。`node --check js/room.js`。
- [ ] **Step 2:** `node --test tests/*.test.js` → PASS（`room.test.js` の既存テストが通る）。
- [ ] **Step 3:** commit `feat(oheya): 家具を使う・タップの手ごたえ・らんぷのあかりを部屋に描く（room.js）`

### Task 6: 画面のきまり・版・確認

**Files:**
- Modify: `js/room-ui.js`、`sw.js`、`js/app.js`（`APP_VERSION` のみ）、`tests/revert.test.js`、`docs/spec.md`
- Test: `tests/revert.test.js`

**Interfaces:**
- Consumes: Task 5 の `onTap`・`useItem`・`callTo`・`wiggle`・`burstAt`・`opt.onUse`。
- `room-ui.js`：
  - `openRoom` の `mount` に `onUse:id=>{const u=USES[id];if(u&&u.say)host.say(u.say);}`（`has(USES,id)` で確かめる）。mount のあと `onTap(tap)`。`closeRoom` で `onTap(null)`（`unmount` で消えるなら不要）。
  - `tap(x,y,hit)`：もようがえ中なら何もしない。`hit>=0` → `wiggle(hit)`、`host.sfx('pop')`、`useItem(hit)`。床 → `burstAt`（マスの中心）、`host.sfx('pop')`、`callTo(x,y)`。結果が `busy` なら mode ごとのひとこと（Spec §4.2：`sleep`「いまは ねむいの…」、`sick`「ちょっと しんどいの…」、`hungry`「おなか すいて うごけないよ」、`egg`・`dance` は言わない）。`far` なら「とどかないよ」。mode は `refreshRoom` の `snap.mode` を覚えておく。
  - 床の ★ はタップした点そのもので出したいので、`onTap` の引数に部屋の SVG 座標 `(gx,gy)` 実数を足してよい（`tapCell` で計算済みの値を渡す）。その場合 Task 5 の `onTap` の型を `(x,y,hit,px,py)` にする。
- `sw.js`：`VERSION='v2.7.0'`、`ASSETS` に 2 ファイル。`app.js`：`APP_VERSION='v2.7.0'`。
- `tests/revert.test.js`：版のテストを v2.7.0 に。`sw.js` の `ASSETS` に `./js/room-use.js`・`./js/room-fx.js` があることのテストを足す。
- `docs/spec.md`：おへやの節に「家具であそぶ・タップで呼ぶ・らんぷ」を数行（v2.7.0）。

- [ ] **Step 1:** revert テストを先に直す → `node --test tests/revert.test.js` FAIL。
- [ ] **Step 2:** 実装 → `node --test tests/*.test.js` PASS、`for f in js/*.js; do node --check "$f"; done`。
- [ ] **Step 3:** `security-reviewer` サブエージェント → 指摘を直す。`/security-review` → 指摘を直す。
- [ ] **Step 4: Playwright MCP 確認**（`http://localhost:8000` のみ、820×1180。サーバーは起動済みなら再利用）
  1. 起動 → 🏠 おへや。ぷにが歩く。コンソールにエラーなし。
  2. ほんだな をタップ → 家具がゆれる → ぷにが正面へ歩き、📖 が出て「ごほん よもう」。
  3. 床をタップ → ★ が出る → ぷにがそのマスへ来る。歩いている途中に別の家具をタップすると行き先が変わる。
  4. らぐ（初期配置）をタップ → 上にすわる。
  5. 夜にする（設定の時刻テスト、または `S.cfg` の時間帯を変える既存の方法）→ らんぷ のまわりが明るい → らんぷ をタップ → ぷにが行って消える → もう一度で つく。
  6. 夜のまま もようがえ → タップは編集になる（ぷには歩かない）→ おわり。エラーなし。
  7. おみせで べっど・すべりだい・ぼーる を買って置く（こいんは設定画面の既存手段か `localStorage` の S を書き換えて用意）→ それぞれタップして動きを見る（すべりだい は登って すべる、ぼーる は転がって戻る、べっど は上でねんね）。
  8. 寝ている時間帯に家具をタップ → ゆれる・「いまは ねむいの…」・歩かない。
  9. もどる → エサやり・設定画面・保存と復元（バックアップコード）が今までどおり。
  10. スクリーンショットで、乗る高さ・頭の上の絵の位置が自然か見る（不自然なら `USES` の `seat` を直す）。
- [ ] **Step 5:** commit `feat(oheya): 家具をタップ・床をタップで呼ぶ（v2.7.0）`、push は `feature/oheya` のみ（main には入れない。G2 のあと）。
