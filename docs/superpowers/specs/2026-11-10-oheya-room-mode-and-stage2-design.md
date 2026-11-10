# おへやモード＋段階2（こいん・おみせ・もようがえ）設計書

状態：2026-11-10 オーナー承認済みの決定をもとに作成。作業ブランチ `feature/oheya`（開始時 HEAD a900bd1、v2.5.1）。`main` には入れない・プッシュしない。
構想は `docs/oheya/CONCEPT.md`、段階1は `docs/superpowers/specs/2026-11-10-oheya-stage0-1-design.md`（**その §2.4「ホーム画面を置き換える」は本書で撤回**。部屋の描画・行動・向きの仕様 §3・§4 は引き続き有効）。
公開リポジトリの文書なので、子どものなまえ・育成データは書かない。

## 0. 決定事項

| # | 項目 | 決定 |
|---|---|---|
| D1 | 普段の育成画面 | v2.4.0 と同じに戻す（`#pet` は SVG、背景は `sceneSVG`、CSS ポーズ、4:3 化なし）。足すのはヘッダーの こいん表示と「🏠 おへや」ボタンだけ |
| D2 | おへやモード | 別画面 `#roomView`（全画面）。見る＋なでるだけ。エサやり・報告は普段の画面だけ。開くとき `mount`、閉じるとき `unmount`。起動はいつも普段の画面 |
| D3 | 失敗時 | Canvas が使えない・画像が読めないときは、おへやを開かない（または閉じる）＋トースト |
| D4 | 保存形式 | `v:2` 据え置き。`coin`・`own`・`room` と `undo[].c` を足すだけ。旧データは初期値で読める。こいんは 0 から（遡って付けない） |
| D5 | こいんの入り方 | 報告時に `FOODS[food].pt` と同額。ぐんぐんたいむの倍率なし。付与は `report()` の 1 か所（`grantCoin` を通す）。取り消しで戻す（0 未満にしない） |
| D6 | 引き継ぎ | 世代交代で `coin`・`own`・`room` を引き継ぐ |
| D7 | おみせ | おへやモード内。かぐ／ゆか／かべ／ひろげる。品ぞろえは増える一方。足りないときは押せない見た目（罰なし）。ゆか・かべは買うと今の柄に切り替わる |
| D8 | ひろげる | 6→8（200）、8→10（400）。家具の座標はそのまま |
| D9 | もようがえ | 「タップで選んでマスをタップ」。ドラッグなし。「まわす」「しまう」。編集モードに入る・「おわり」で出る |
| D10 | 向き | `r` は 0〜3。奇数は絵を左右反転し、足あとの w/h を入れ替える |
| D11 | ぷにの歩き | 家具（`walk:false`）を避ける。家具が変わったら grid・home を作り直す。ぷにのいるマスにも置ける（近くの空きマスへ移す） |
| D12 | 表記 | UI はひらがなのみ。「こいん」と書く（カタカナにしない） |
| D13 | 進め方 | G1（試し遊び）の前に段階2まで実装する（リスクはオーナー承知）。実装 3＋レビュー 1 の並行、モデルは fable（使えないときは opus） |

### 範囲
やる：D1〜D11、アイテム 17 種＋ゆか 4＋かべ 4 の絵、テスト、仕様書の更新、v2.6.0、プレビュー用ページ（非公開 Artifact）。
やらない：ずかんのぷにを部屋に呼ぶ、家具を使う行動、ランプの明かり、部屋の回転、壁かけ、ドラッグ操作、報告以外のこいん入手、こいんを遡って付けること。

## 1. 構成とファイル

| ファイル | 役割 | 変更 |
|---|---|---|
| `js/room-data.js` | 型（`Room`・`Placed`・`Own`・`ItemDef`）、カタログ（`ITEMS`・`FLOORS`・`WALLS`・`EXPANDS`）、上限の定数、`defaultOwn()`・`defaultRoom()`。何も import しない | 新規 |
| `js/room-edit.js` | 配置の純ロジックと `cleanOwn`・`cleanRoom`（§5） | 新規 |
| `js/room-shop.js` | 買い物の純ロジック（§6） | 新規 |
| `js/room-art-kit.js` | 絵の共通部品（線・多角形・投影の補助） | 新規（`room-art.js` から切り出し） |
| `js/room-art-a.js`・`-b.js`・`-c.js` | アイテムの絵（グループ別の表 `ART_A`・`ART_B`・`ART_C`） | 新規 |
| `js/room-art.js` | `roomSVG(n,band,floorId,wallId)`・`itemSVG(id)`・`patternSVG(id)` | 変更（ラグ・家具の絵と `layout()` を外す） |
| `js/room.js` | Canvas 描画。`room` 状態から描く。`setRoom`・`setEdit`・`onCell` | 変更 |
| `js/room-ai.js` | `relocateBrain` を足す | 変更 |
| `js/room-ui.js` | おへやモードの画面（開閉・ゲージ・なでる） | 新規 |
| `js/room-ui-shop.js`・`js/room-ui-edit.js` | おみせ・もようがえの画面 | 新規 |
| `js/state.js` | `DEF()`・`sanitize()` に `coin`・`own`・`room`・`undo[].c` | 変更 |
| `js/rules.js` | `grantCoin`、`undoReport` のこいん戻し | 変更 |
| `js/app.js` | 段階1の組み込みを外す。こいん表示・おへやボタン・`bindPet`・`report()` の付与・引き継ぎ | 変更 |
| `index.html`・`css/style.css` | `#coin`・`#oheyaBtn`・`#roomView` の枠と見た目。段階1の `.screen.room` を消す | 変更 |
| `sw.js` | `VERSION`＝`v2.6.0`、`ASSETS` に新しい js 10 本 | 変更 |
| `dev/item-sheet.html`・`.js`・`.css` | 絵の確認用（4 つの向きを並べる）。`ASSETS` に入れない | 新規 |
| `js/data.js`・`js/art.js`・`js/sound.js` | 変更なし | — |

依存の向き：`room-data` ← `room-edit` ← `state`／`room-shop`／`room`／`room-ui*`。`room-art-kit`・`room-art-a/b/c` は何にも依存しない（ID の文字列だけ）。`room-art.js` は予備の絵の大きさのためだけに `room-data` の `ITEMS` を読む。`TILE_W`・`TILE_H`・`WALL_H` は `room-art-kit.js` に移し、`room-art.js` が再 export する（`room.js` の import は変えない）。循環させない。

### 1.1 段階1の組み込みを外す（普段の画面を v2.4.0 に戻す）
基準は v2.4.0 のコミット `4261140`。
- `js/app.js`：`room.js` の import と `roomOn`、`feed()` の `pauseFor(3)`、`wobble()` の `poke()`、`render()` の `roomOn` 分岐（3 行を v2.4.0 の行に戻す）、`#pet` のハンドラ内の `roomHold`、`lostpointercapture`、`roomOff()` と起動時の `mount` を消す。
- `css/style.css`：末尾の「おへや（Canvas の部屋）」ブロック（`.screen.room` の 6 行）を消す。
- 確認：`git diff 4261140 -- css/style.css` に削除行が無い。`git diff 4261140 -- js/app.js` の差分は §1.2 に挙げたものだけ。`tests/revert.test.js` が `app.js`・`style.css` に `roomOn`・`.screen.room` が無いこと、`render()` の 3 行が v2.4.0 と同じ文字列であることを固定する。`tests/art.test.js`（既存）が「向きを渡さない `petSVG` は v2.4.0 と同じ」を固定している。
- 普段の画面で v2.4.0 と変わるのは、ヘッダーの「🪙 数字」と「🏠 おへや」ボタンだけ。文言・判定・タイマーは変えない（取り消しの確認文も変えない）。

### 1.2 `app.js` に足すもの（これ以外は触らない）
- `bindPet(el, hooks)`：今の `#pet` のポインター処理（なでなで 80px・ぎゅー 700ms・れんだ 2.5 秒に 5 回・あたま＝上 40%・`click` の `detail===0`）を関数にくくり、`#pet` と `#roomPet` の両方に付ける。`hooks.down()`／`hooks.up()` は `pointerdown`／`pointerup`・`pointercancel`・`lostpointercapture` で呼ぶ（おへや側だけが渡す）。`#pet` 側の動きは今と同じ。
- `fxBurst(icon, from)`：`from` を省いたときの対象を `isRoomOpen() ? #roomPet : #pet` にする。
- `wobble()`：おへやが開いていたら `roomPoke()` も呼ぶ。
- `renderBubble()`：`#roomBubbleText`・`#roomBubbleZh` にも同じ文を入れる（`textContent`）。
- `render()` の最後：`#coin` を更新し、`lastSnap={view,mode,band,now}` を作って `refreshRoom(lastSnap)`（おへやが閉じていれば何もしない）。`mode` は上から `stage===0`→`egg`／ねんね→`sleep`／`sick`／`now<danceUntil`→`dance`／`hunger===0`→`hungry`／`awake`。
- `report()`：`const c=grantCoin(S,FOODS[t.food].pt)` を呼び、`undo` の項目に `c` を入れる。増えたら `#coin` に `coinpop` を付け直す。
- `newGeneration()` の `keep` に `coin`・`own`・`room`。
- 起動時：`initRoomUI(host)`、`#oheyaBtn` の `click` で `openRoom()`。

## 2. データ

### 2.1 追加するキー（`DEF()` と `sanitize()` の両方）
| キー | 型 | 初期値 | `sanitize()` |
|---|---|---|---|
| `coin` | 整数 | 0 | `int(o.coin,0,0,999999)` |
| `own` | `{id:個数}` | `{rug:1,shelf:1,plant:1}` | キーが無ければ初期値。あれば `cleanOwn(o.own)` |
| `room` | `{n,floor,wall,items}` | `defaultRoom()` | `cleanRoom(o.room===undefined?defaultRoom():o.room, d.own)` |
| `undo[].c` | 整数 | — | `int(u.c,0,0,20)`（無ければ 0） |

`defaultRoom()`＝`{n:6,floor:'f_honey',wall:'w_pink',items:[{id:'rug',x:2,y:2,r:0},{id:'shelf',x:0,y:2,r:0},{id:'plant',x:5,y:0,r:0}]}`（段階1と同じ位置）。まど・カーテンは壁の絵の一部で、データには持たない。

### 2.2 `cleanOwn(raw)`
- オブジェクトでなければ `{}`。カタログの順（`ITEMS`、次に値段が 0 でない `FLOORS`・`WALLS`）に、`raw` が**自分で持つ**キーだけを見る。
- かぐ：`Math.floor` した 1〜99 の数だけ残す（99 を超えたら 99、数でない・0 以下は捨てる）。ゆか・かべ：1 以上なら 1。
- 結果は新しい `{}`。カタログに無いキー（`__proto__` を含む）は入らない。初期のゆか・かべ（値段 0）は `own` に入れなくても常に使える。

### 2.3 `cleanRoom(raw, own)`
- `raw` がオブジェクトでなければ `defaultRoom()` を `raw` として続ける。
- `n`：6・8・10 以外は 6。`floor`：`FLOORS` にあって（値段 0 または `own[id]>0`）ならそのまま、ほかは `f_honey`。`wall` も同様（`w_pink`）。
- `items`：配列でなければ `[]`。**先頭 200 件だけ**を前から見て、次をすべて満たすものを `{id,x,y,r}` の新しいオブジェクトで足す。60 件になったら終わり。
  - `id` が文字列で `ITEMS` が自分で持つキー、`x`・`y`・`r` が整数、`r` は 0〜3
  - その `id` を置いた数が `own[id]` 未満
  - `canPlace(ここまでの部屋, id, x, y, r)` が真（範囲内・重ならない・空きマスが残る。§5）
- つまり範囲外・重なり・持っていない・多すぎるものは**後ろを捨てる**。`sanitize(sanitize(x))` は `sanitize(x)` と同じになる。

### 2.4 そのほか
- バックアップコード：`history` 200 件＋部屋 60 件＋`own` 全種でも 40,000 文字未満（実測：今の最大 約 17,400 文字＋部屋 約 3,000 文字）。テストで固定する。
- 取り消し：`undoReport` が `S.coin=Math.max(0,S.coin-(u.c||0))`。こいんを使ったあとの取り消しは 0 で止まる（借金にしない）。日付が変わると今までどおり取り消せない。
- リセット（最初からやり直す）は `DEF()` なので、こいん・家具も初期に戻る。復元は `sanitize()` を通る。

## 3. こいんの流れ
- `grantCoin(S, amount)`（`js/rules.js`）：`amount` を 0〜20 の整数に丸め、`S.coin` に足して 999999 で止める。**実際に増えた数**を返す。呼ぶのは `report()` だけ。
- 表示：`#coin`（普段の画面）と `#roomCoin`（おへや）に `🪙 12`。`aria-label` は `こいん 12 まい`。
- 使う：`buy(S,id)`（§6）だけが減らす。

## 4. 画面

### 4.1 普段の画面のヘッダー
`.topbtns` の並び：`<span class="coin" id="coin">`、`<button class="pill" id="zukanBtn">📚 ずかん</button>`、`<button class="pill" id="oheyaBtn">🏠 おへや</button>`、`#gear`。

### 4.2 おへやモード `#roomView`（`index.html` に枠を置く。`hidden` で始まる）
```
#roomView.roomview  （position:fixed; inset:0; z-index:10。モーダル 20・fx 30・トースト 40 より下）
├ .rtop      #roomBack「← もどる」 / #roomName（textContent） / #roomCoin
├ #roomStage （残りの高さいっぱい。position:relative）
│   ├ #roomScene （inset:0。Canvas が入る。タップを受ける）
│   └ #roomPet   （透明なボタン。aria-label「なでる」。room.js が位置を合わせる）
├ .rbar      #roomGauges（おなか・ごきげん：見るだけ） / #shopBtn「🛒 おみせ」 / #editBtn「🛠 もようがえ」 / #editDone「おわり」
├ .bubble.rbubble  #roomBubbleText / #roomBubbleZh
├ #roomTray  （もようがえの持ちもの。編集中だけ）
└ #roomShop  （おみせ。#roomView を覆うシート）
```
`js/room-ui.js` の口（`app.js` は `host` を渡すだけで、おへやの DOM には触れない）：
```js
/** @typedef {{getS:()=>any, save:()=>void, render:()=>void, say:(ja:string,zh?:string)=>void, sfx:(k:string,voice?:string)=>void,
 *   toast:(m:string)=>void, bindPet:(el:HTMLElement,hooks?:{down?:()=>void,up?:()=>void})=>void}} RoomHost */
/** @typedef {{host:RoomHost, commit:()=>void}} RoomCtx   // commit＝save()＋setRoom(S.room)＋こいん表示の更新 */
initRoomUI(host: RoomHost): void      openRoom(): boolean      closeRoom(): void      isRoomOpen(): boolean
refreshRoom(snap: {view:any,mode:string,band:string,now:number}): void      roomPoke(): void
// room-ui-shop.js：openShop(ctx: RoomCtx): void ／ closeShop(): void ／ isShopOpen(): boolean
// room-ui-edit.js：startEdit(ctx: RoomCtx): void ／ endEdit(): void ／ isEditing(): boolean
```
- 開く：`openRoom()` が `#roomView` を見せ、`.top` と `.layout` に `inert`、`body` に `inroom`（背面をスクロールさせない）。`mount(#roomScene,#roomPet,{room:S.room,onFail})`。`false`・例外・`onFail` のときは閉じて、トースト「おへや を ひらけなかったよ」。
- 閉じる：`closeRoom()` が もようがえ・おみせを終わらせ、`unmount()`、`#roomView` を隠し、`inert` と `inroom` を外す。閉じている間は rAF・Canvas・リスナーが無い。
- なでる：`host.bindPet(#roomPet,{down:()=>hold(true),up:()=>hold(false)})`。反応（セリフ・音・ごきげん）は普段の画面と同じ `petAct`。ねんね中・たまご・びょうき・おわかれの分岐も同じ。
- ゲージ：🍙×4・🌸×4（`.gi`／`.gi.on`）。たまごは「たまご を あたためよう」。
- 縦（820×1180）でも横（1180×820）でも、おへや全体が `#roomStage` に収まる（`fitScale`）。

### 4.3 おみせ `#roomShop`
- 見出し「おみせ」と こいん、タブ「かぐ」「ゆか」「かべ」「ひろげる」、カード（絵・なまえ・「🪙 60」）、「とじる」。
- カードの状態（§6 の `CardState`）：

| 状態 | 見た目 | ことば |
|---|---|---|
| `ok` | 押せる | 「🪙 60」。かぐを持っていれば「もってる 2」も出す |
| `short` | うすく・押せない | 「あと 🪙 15」（足りない数） |
| `owned` | 押せない | ゆか・かべ「もってる」／ひろげる「ひろげたよ」 |
| `max` | 押せない | 「いっぱい もってるよ」 |
| `locked` | うすく・押せない | 「さきに ひろい おへや を かってね」 |

- カードを押す →「これを かう？」＋絵・なまえ・ねだん＋「かう」「やめる」→「かう」で `buy()` → `save()` → 音と「かった！」。かぐは「かった！ もようがえ で おいてね」、ゆか・かべ・ひろげるは すぐ部屋に反映（`setRoom`）。
- 連打しても `buy()` が毎回 こいんを確かめるので、足りなくなったら買えない。

### 4.4 もようがえ（編集モード）
- 「🛠 もようがえ」で入り、「おわり」で出る。入ると `#shopBtn`・`#editBtn` を隠して `#editDone`・`#roomTray` を出し、`#roomPet` はタップを受けない（`.editing #roomPet{pointer-events:none}`）。ふきだし：「かぐ を えらんで、おきたい ます を おしてね」。
- `#roomTray`：タブ「かぐ」「ゆか」「かべ」。
  - かぐ：`stock(room,own)` のカード（絵・「×2」）。無ければ「もちもの は ないよ。おみせ で かえるよ」。右に「まわす」「しまう」。
  - ゆか・かべ：使える柄（初期＋買ったもの）。押すと `setFloor`／`setWall`。今の柄に印。
- 選択は 3 通り：なし／持ちもの（`{id,r}`）／置いた家具（`index`）。
- 床のマスを押したとき（`onCell`）：
  1. そのマスに置いた家具があれば、それを選ぶ（何を選んでいても）。
  2. 持ちものを選んでいて置けるなら `place`。残りがあれば選んだまま、無ければ選択なし。
  3. 置いた家具を選んでいて置けるなら `move`。
  4. 置けないマスなら「そこには おけないよ」（音は `pop`。何も変えない）。
- 「まわす」：持ちものなら `r` を進める。置いた家具なら `rotate`、できなければ「ここでは まわせないよ」。「しまう」：置いた家具を `remove`（持ちものに戻る）。
- マスの色：持ちもの・置いた家具を選んでいる間、`placeMask` を `setEdit` に渡す。置ける＝みどり（白い丸つき）、置けない＝あか。選んだ家具の足あとは きいろの線。
- 変えるたびに `S.room` を入れ替えて `save()`、`setRoom(S.room)`。「おわり」・「← もどる」・画面が裏に回ったときも状態は保存済み。

## 5. 配置の純ロジック `js/room-edit.js`
すべて DOM に触れない。`Room` は**変えずに新しいものを返す**。失敗は `null`。
```js
/** @typedef {{id:string,x:number,y:number,r:0|1|2|3}} Placed */
/** @typedef {{n:6|8|10,floor:string,wall:string,items:Placed[]}} Room */
/** @typedef {{[id:string]:number}} Own */
footprint(id: string, r: number): {w:number,h:number}|null   // r が奇数なら w と h を入れ替える。知らない id は null
cellsOf(p: Placed): {x:number,y:number}[]
itemAt(room: Room, x: number, y: number): number             // 置いた家具の番号。無ければ -1
placedCount(room: Room, id: string): number
canPlace(room: Room, id: string, x: number, y: number, r: number, ignoreIndex?: number): boolean
place(room: Room, own: Own, id: string, x: number, y: number, r: number): Room|null
move(room: Room, index: number, x: number, y: number): Room|null
rotate(room: Room, index: number): Room|null                 // r→(r+1)%4。場所は同じ
remove(room: Room, index: number): Room|null
stock(room: Room, own: Own): {id:string,left:number}[]       // own−置いた数>0。ITEMS の順
placeMask(room: Room, id: string, r: number, ignoreIndex?: number): Uint8Array  // 長さ n*n。[y*n+x]＝1 置ける・2 置けない
blockedCells(room: Room): {x:number,y:number}[]              // walk:false の足あと
homeFor(room: Room): {x:number,y:number}
nearestFree(room: Room, x: number, y: number): {x:number,y:number}
setFloor(room: Room, own: Own, id: string): Room|null
setWall(room: Room, own: Own, id: string): Room|null
cleanOwn(raw: unknown): Own
cleanRoom(raw: unknown, own: Own): Room
```
- `canPlace` が真になる条件（すべて）：`id` が `ITEMS` にある／`x`・`y` が整数、`r` が 0〜3 の整数／足あとが `0..n-1` に収まる／ほかの家具（`ignoreIndex` を除く）の足あとと 1 マスも重ならない（ラグの上にも置けない）／置いたあとの数が 60 以下／置いたあとも `walk:false` でないマスが 1 つ以上残る。
- `place` は さらに `placedCount(room,id) < (own[id]||0)` を求める。
- `homeFor`：`items` の前から最初の `flat` な家具の、足あとのいちばん手前のマス `(x+w-1, y+h-1)`。無ければ、部屋の中心 `((n-1)/2,(n-1)/2)` にいちばん近い（距離の 2 乗、同じなら y・x の小さい順）通れるマス。
- `nearestFree`：`(x,y)` にいちばん近い通れるマス（同じ決め方。自分が通れるならそのまま）。
- 絵の向き：`r` が奇数のとき、基準点（足あとの上の頂点）を軸に左右反転して描く。`r=2` は `r=0` と、`r=3` は `r=1` と同じ見た目（「まわす」を押すたびに向きが変わる）。

## 6. 買い物の純ロジック `js/room-shop.js`
```js
/** @typedef {'kagu'|'yuka'|'kabe'|'hiroge'} ShopCat */
/** @typedef {'ok'|'short'|'owned'|'max'|'locked'} CardState */
/** @typedef {{id:string,name:string,price:number,state:CardState,have:number,need:number}} Card */
export const SHOP_CATS: ShopCat[]                    // ['kagu','yuka','kabe','hiroge']
cardState(S: any, id: string): CardState|null         // 知らない id は null
shopCards(S: any, cat: ShopCat): Card[]               // カタログの順。need＝足りない こいん（足りていれば 0）
buy(S: any, id: string): boolean                      // S を書きかえる。状態が ok のときだけ買えて true
```
- かぐ：`have>=99`→`max`／`coin<price`→`short`／`ok`。買うと `coin-=price`、`own[id]=have+1`。
- ゆか・かべ：値段 0 または `own[id]>0`→`owned`／`short`／`ok`。買うと `own[id]=1`、`room.floor`（`room.wall`）をその柄にする。
- ひろげる（`EXPANDS`）：`room.n>=to`→`owned`／`room.n<from`→`locked`／`short`／`ok`。買うと `room.n=to`（`own` には入れない）。
- `room` は新しいオブジェクトに入れ替える（`S.room={...S.room,n:8}`）。

## 7. `room.js`・`room-ai.js` の変更
```js
mount(sceneEl: HTMLElement, petBtn: HTMLElement, opt: {room: Room, reduced?: boolean, onFail?: ()=>void}): boolean
setRoom(room: Room): void
setEdit(edit: {mask: Uint8Array|null, sel: number}|null): void   // sel＝選んだ家具の番号（無ければ -1）。null で編集表示なし
onCell(cb: ((x:number,y:number)=>void)|null): void
cellAt(px: number, py: number, ox: number, oy: number, s: number, n: number): {x:number,y:number}|null   // 純関数
sortForDraw<T extends {x:number,y:number,flat?:boolean}>(list: T[]): T[]                                  // 純関数
relocateBrain(b: Brain, grid: Grid, to: {x:number,y:number}, force?: boolean): void                      // room-ai.js
```
`update`・`hold`・`pauseFor`・`poke`・`unmount` は今のまま。`layout()` は使わない。
- **描く元**：`r.room`。背景は `roomSVG(n,band,floor,wall)`（時間帯ごとに作ってキャッシュ。`n`・`floor`・`wall` が変わったら捨てる）。家具の絵は ID ごとに 1 枚（同じ家具を何個置いても画像は 1 つ）。
- **描く順**：`sortForDraw`＝`flat` な家具を奥から → そのあと 立っている家具とぷにを奥から（`sortByDepth`。家具の位置は足あとの中心）。足あとが 2×2 までなら中心の和で正しく並ぶ（テストで固定）。
- **向き**：`r` が奇数なら基準点で `scale(-1,1)` して描く。
- **`setRoom`**：家具・背景を作り直し、`grid=makeGrid(n,blockedCells(room))`、`home=homeFor(room)`、`relocateBrain(brain, grid, nearestFree(room,今のマス))`（たまごは `home` へ `force`）。歩いていた経路は捨てる（次のコマで引き直す）。`n` が変わったら大きさを合わせ直す。mount 前に呼んでも何もしない。
- **`relocateBrain`**：`b.n=grid.n`。今のマスが通れない（または `force`）なら `to` の中心へ移す。経路を捨て、歩いていたら `idle` にする。
- **`setEdit`**：編集中は、立っている家具を不透明度 0.55 で描く（選んだ家具は 1.0＋足あとに きいろ `#FFD84D` の線）。`mask` があれば、平たい家具のあと・立っている家具の前に、マスを みどり `#7BD8A0`（中央に白い丸）／あか `#FF9AA8` を不透明度 0.45 で塗る。
- **`onCell`**：Canvas の `click` を `cellAt` でマスに変えて呼ぶ（範囲外は呼ばない）。`cellAt` は `fromScreen((px-ox)/s,(py-oy)/s,n)` を切り捨てる。
- **裏から戻る・描画面の復活（`resume`）**：今までどおり dt を捨て、暗さを目標に合わせ、背景を作り直し、読めていない画像を読み直す。押さえたままの状態は解く。編集表示（`setEdit`）と `onCell` はそのまま残る。大きさが変わっていれば合わせ直す（トレイの出し入れ・iPad の回転は `ResizeObserver`）。
- **失敗**：背景・家具・ぷにの絵のどれかが読めなければ `unmount` して `onFail`（→ おへやを閉じてトースト）。
- **ぷにの行動**：`room-ai.js` の行動・速さは変えない。部屋が家具でふさがれて `home` に届かないときは、その場で寝る（今の `planTo` のまま）。

## 8. アイテム一覧（`js/room-data.js`）

| id | なまえ | ねだん | 足あと w×h | walk | flat | 絵 |
|---|---|---|---|---|---|---|
| `rug` | むらさきの らぐ | 25 | 2×2 | ○ | ○ | A |
| `rug_pink` | ももいろの らぐ | 25 | 2×2 | ○ | ○ | A |
| `rug_mint` | みんといろの らぐ | 25 | 2×2 | ○ | ○ | A |
| `shelf` | ほんだな | 40 | 1×2 | × | × | A |
| `plant` | かんようしょくぶつ | 15 | 1×1 | × | × | A |
| `lamp` | らんぷ | 20 | 1×1 | × | × | A |
| `ball` | ぼーる | 15 | 1×1 | × | × | A |
| `plush` | ぬいぐるみ | 10 | 1×1 | × | × | A |
| `bed` | べっど | 60 | 2×2 | × | × | B |
| `sofa` | そふぁ | 50 | 1×2 | × | × | B |
| `table` | ちゃぶだい | 30 | 1×1 | × | × | B |
| `chair` | いす | 20 | 1×1 | × | × | B |
| `desk` | つくえ | 40 | 1×2 | × | × | B |
| `toybox` | おもちゃばこ | 30 | 1×1 | × | × | C |
| `cushion` | おほしさま くっしょん | 15 | 1×1 | × | × | C |
| `tent` | てんと | 60 | 2×2 | × | × | C |
| `slide` | すべりだい | 70 | 1×2 | × | × | C |

| id | なまえ | ねだん | | id | なまえ | ねだん |
|---|---|---|---|---|---|---|
| `f_honey` | はちみついろの ゆか | 0（初期） | | `w_pink` | みずたまの かべ | 0（初期） |
| `f_mint` | みんといろの ゆか | 30 | | `w_stripe` | しましまの かべ | 30 |
| `f_check` | いちまつもようの ゆか | 30 | | `w_star` | おほしさまの かべ | 30 |
| `f_cloud` | くもの じゅうたん | 30 | | `w_sky` | そらいろの かべ | 30 |

ひろげる（`EXPANDS`）：`x8`「ひろい おへや」200（6→8）、`x10`「もっと ひろい おへや」400（8→10）。
ID は `^[a-z][a-z0-9_]{0,15}$` で、全カタログを通して重ならない。足あとの `w` は +gx（画面の右下）、`h` は +gy（左下）へのびる。値段は案（全部で 1,330 こいん。1 日およそ 10〜15 こいん）。実機で遊んでから調整する。品ぞろえは減らさない。

### 8.1 絵の決まり
- **雰囲気**：パステルの絵本風。丸みのある形。線は `#D2A99A` の太さ 3（`room-art-kit.js` の `ST`）。今の ほんだな・しょくぶつ とそろえる。
- **3 段の明暗**：上の面＝明るい、左の面＝ふつう、右の面＝暗い。足もとに `rgba(120,80,100,.14)` の影。反転（`r` 奇数）で左右の明暗が入れ替わるのは受け入れる。
- **オリジナル**：既存のキャラクター・商品の形や配色をまねない。ぬいぐるみは 丸い体の どうぶつ（顔は点の目と小さな口だけ）。
- **形式**：`{svg,w,h,ax,ay}`。`(ax,ay)`＝足あとの上の頂点。足あとのひし形が絵の中に収まる（`ax>=h*32`、`w−ax>=w*32`、`h−ay>=(w+h)*16`、単位は絵の px・足あとのマス）。高さ `ay<=150`。1 枚 20,000 文字以下。
- **安全**：`<script>`・`on…=`・`style=`・`href`・外部 URL を書かない。同じタグに同じ属性を 2 回書かない。`id=` を使うなら `ri-<アイテムid>-` で始める。入力値は入れない（ID だけで決まる）。
- **ゆか・かべ**：`roomSVG` の中で描き分ける。まど・カーテン・幅木は全部の かべ に付く。`patternSVG(id)` は おみせ・もようがえ用の 96×64 の見本。
- **予備の絵**：`itemSVG(id)` は、表に絵が無い ID には足あとの大きさ（`ITEMS` の w×h、カタログに無い ID は 1×1）の箱を返す（部屋を止めないため）。出荷時は 17 種すべてに専用の絵がある（テストで固定）。

## 9. テスト（`node --test tests/*.test.js`。`package.json` なし）
| ファイル | 固定すること |
|---|---|
| `tests/room-data.test.js` | §8 の表（ID・値段・足あと・walk/flat）、なまえがひらがなだけ、ID の重複なし、初期の部屋と持ちもの |
| `tests/room-edit.test.js` | 足あとの入れ替え、範囲・重なり・60 件・空きマス 1 つ、`place`/`move`/`rotate`/`remove` が元を変えない、`stock`、`placeMask`、`homeFor`（段階1と同じ (3,3)）、`nearestFree`、`cleanOwn`・`cleanRoom`（敵対的な入力） |
| `tests/room-shop.test.js` | 5 つの状態、ちょうどの こいん、連続で買う、99 個、ゆか・かべの切り替え、ひろげるの順番、失敗で何も変わらない |
| `tests/state.test.js` | `DEF()` のキー、旧データ（キー無し）が初期値で読めて育成データが残る、敵対的なコード、`undo[].c`、冪等、最大データのコードが 40,000 文字未満で往復する |
| `tests/coin.test.js` | `grantCoin`（等倍・上限・丸め）、`undoReport` が こいんを戻し 0 で止まる |
| `tests/revert.test.js` | 段階1の組み込みが残っていない（§1.1） |
| `tests/room-art.test.js` | `roomSVG` の 4×4 柄×時間帯×広さが安全で viewBox が正しい、ラグが背景に無い、`patternSVG`、`itemSVG` が全 ID に専用の絵 |
| `tests/room-art-a/b/c.test.js` | グループの ID がそろう、§8.1 の形式と安全（共通の `tests/helpers/art-check.js`） |
| `tests/room.test.js` | `cellAt`（`toScreen` の逆・範囲外は null）、`sortForDraw`（平たいものが先・2×2 までの並びの性質）、export の一覧 |
| `tests/room-ai.test.js` | `relocateBrain`、家具のある grid で 2,000 ステップ歩いても通れないマスに入らない |

## 10. 動作確認（Playwright MCP、`http://localhost:8000` のみ）
1. 起動は普段の画面。`#pet` に SVG、`#scene` に `sceneSVG`、Canvas が無い。コンソールエラー（CSP 違反）なし。ヘッダーに「🪙 0」「📚 ずかん」「🏠 おへや」。
2. 報告 → こいんが `pt` だけ増える → 取り消しで戻る。エサやり・設定・ずかんは今までどおり。
3. 旧データ：v2.5.1 形式（`coin`・`own`・`room` 無し）を `localStorage` に入れて再読み込み → 育成データがそのまま、こいん 0、初期の部屋。**今の育成データのバックアップコード**（オーナーが渡したもの。文書・コミットに書かない）でも同じ。
4. おへやを開く → 部屋が画面に収まる（820×1180・1180×820・途中で向きを変える）。ぷにが歩き、家具を避け、家具の後ろに回る。なでる 5 種が反応する。もどる → Canvas が消え、普段の画面が元どおり。
5. 昼・夜（設定で寝る時刻を動かす）：夜は暗くなり、ぷにが ラグで寝る。
6. おみせ：足りないカードは押せない。買う → こいんが減る → 再読み込みしても残る。ゆか・かべが すぐ変わる。ひろげる 6→8→10 で家具の位置が同じ。
7. もようがえ：持ちものを置く・動かす・まわす・しまう。みどり／あかのマス。ぷにのいるマスに置くと ぷにが となりへ移る。おわり → なでられる。
8. 保存と復元：コードを表示 → リセット → 復元 → こいん・家具・配置が戻る。壊したコード（`room.items` に範囲外・重なり・知らない ID）を復元しても落ちず、正しいものだけ残る。
9. 進化・おわかれのモーダルが おへやの上に出る。世代交代のあとも こいん・家具が残る。
10. `prefers-reduced-motion`、裏に回して戻る、390×844（スマホ幅）でヘッダーがはみ出さない。
11. オフライン：`sw.js` の `ASSETS` に新しい js がすべてあり、キャッシュ後にオフラインで おへやが開く（localhost）。
実機（iPad）の滑らかさ・発熱はコンテナでは測れない。測れたふりをしない。

## 11. セキュリティと約束
| 約束 | 守り方 |
|---|---|
| 1 静的のみ | js ファイルを足すだけ。`package.json`・ビルドなし |
| 2 外部通信なし | CSP は変えない。絵は `data:image/svg+xml`（`img-src 'self' data:` は既存） |
| 3 インラインなし | `#roomView` は `index.html` の静的な枠。大きさ・位置は `el.style.x`。SVG にも `style=` を書かない |
| 4 入力値 | おへやの画面は `createElement`＋`textContent` で作る（なまえも）。カードの絵は `<img src="data:…">`。`data-id` を読み戻すときは カタログが自分で持つキーかを確かめる |
| 5 保存データを信頼しない | `coin`・`own`・`room`・`undo[].c` はすべて `sanitize()` で検証（§2）。おへやを開くたびに `S.room` を読む |
| 6 旧データ | `v:2` のまま。キーが無ければ初期値。育成データに触れない |
| 7 ひらがな | §4 の文言。カタログの なまえ はテストで ひらがなだけに固定 |
| 8 罰なし | 足りないときは押せないだけ。こいんは 0 未満にならない。家具は消えない・傷まない |
| 9 オリジナル | §8.1 |
| 10 VERSION | `sw.js`・`APP_VERSION` を `v2.6.0`、`ASSETS` に `room-data`・`room-edit`・`room-shop`・`room-art-kit`・`room-art-a/b/c`・`room-ui`・`room-ui-shop`・`room-ui-edit` |

## 12. リスク
- **G1 の前に段階2を作る**：試し遊びで おへや自体が合わなければ、段階2の作業が無駄になる（承知済み）。普段の画面を v2.4.0 に戻すので、本番の遊びは壊さない。
- **実機の負荷**：家具 60 個＋10×10 は段階0で測った範囲（家具 30 個）を超える。G1 で確かめる。
- **高い家具の後ろのマス**：タップは床のマスで決まるので、高い家具の絵に隠れたマスは押しにくい。編集中は家具を半透明にして和らげる。
- **6×6 は狭い**：2×2 の家具を 3 つ置くと歩ける場所が少ない。空きマス 1 つは必ず残る。行き止まりでも ぷには固まらない（その場で休む・寝る）。
- **反転した絵の明暗**：左右の影が入れ替わる。気になれば段階4（部屋の回転）で向きごとの絵にする。
- **取り消し**：こいんを使ったあとの取り消しは 0 で止まるので、少し得をすることがある。罰にしないことを優先する。取り消しの確認文は こいんに触れない（普段の画面を変えないため）。
- **値段**：案。全部そろえるのに およそ 3〜4 か月。実機で調整する（保存データに値段は入らないので、あとから変えられる）。
- **色の見分け**：みどり／あかのマスは色に加えて白い丸で区別する。キーボード・読み上げでの もようがえは対象外。
