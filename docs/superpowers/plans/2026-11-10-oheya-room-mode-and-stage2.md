# おへやモード＋段階2（こいん・おみせ・もようがえ）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 普段の育成画面を v2.4.0 の姿に戻し（ヘッダーの こいん表示だけ足す）、別画面の「おへやモード」で部屋を見る・なでる・おみせで家具を買う・もようがえで置けるようにする（v2.6.0）。

**Architecture:** 純ロジック（`room-data`・`room-edit`・`room-shop`・`room-ai`・絵の `room-art*`）は DOM に触れない ES モジュールで `node:test` で固定する。`room.js` は Canvas の描画だけを持ち、`room-ui*.js` が おへやモードの DOM を持つ。`app.js` は `host` を渡すだけで、普段の画面の判定・文言は変えない。保存は `v:2` のまま `coin`・`own`・`room`・`undo[].c` を足し、すべて `sanitize()` を通す。

**Tech Stack:** 素の ES モジュール（ビルドなし・依存なし）、Canvas 2D、SVG 文字列 → `data:` 画像、JSDoc の型、Node v24 の `node:test`（`package.json` なし）、Playwright MCP（ヘッドレス Chromium）。

**Spec:** `docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md`（以下「設計書」。§ 番号はこれを指す）。構想は `docs/oheya/CONCEPT.md`。段階1の設計書 `2026-11-10-oheya-stage0-1-design.md` の §3・§4（投影・行動・向き）は引き続き有効。

## Global Constraints

- 作業はすべて `feature/oheya`。`main` に入れない・プッシュしない。
- 静的サイトのみ。`package.json`・ビルド・npm 依存を足さない。テストは `node --test tests/*.test.js`、構文チェックは `for f in js/*.js dev/*.js; do node --check "$f"; done`。
- CSP は変えない（`'self'` 以外を足さない。絵は `data:image/svg+xml`）。外部通信をしない。
- インライン `<script>`・`style=""`・`onclick=""` を書かない（SVG 文字列にも `style=` を書かない）。大きさ・位置は `el.style.x`。
- おへやの画面は `createElement`＋`textContent` で作る。`innerHTML` に利用者の入力（なまえ）を入れない。`data-id` を読み戻したら、カタログが**自分で持つ**キーか（`Object.prototype.hasOwnProperty.call`）を確かめる。
- 保存形式は `v:2` 据え置き。足すキーは `coin`（整数 0〜999999、初期 0）・`own`（`{id:個数}`、個数 0〜99、初期 `{rug:1,shelf:1,plant:1}`）・`room`（`{n:6|8|10,floor,wall,items:[{id,x,y,r}]}`、items 最大 60、r 0〜3、初期 `defaultRoom()`）・`undo[].c`（整数 0〜20）。`DEF()` と `sanitize()` の両方に入れる。旧データは初期値で読める。こいんは遡って付けない。
- 初期の部屋：`{n:6,floor:'f_honey',wall:'w_pink',items:[{id:'rug',x:2,y:2,r:0},{id:'shelf',x:0,y:2,r:0},{id:'plant',x:5,y:0,r:0}]}`。
- こいん：報告時に `FOODS[food].pt` と同額、ぐんぐんたいむの倍率なし、付与は `report()` から `grantCoin(S,amount)` の 1 か所、上限 999999、取り消しで戻す（0 未満にしない）。世代交代で `coin`・`own`・`room` を引き継ぐ。
- 表示の書式：`#coin`・`#roomCoin` の文字は `🪙 ${n}`、`aria-label` は `こいん ${n} まい`。
- UI の文言は ひらがなのみ（設定画面は漢字可）。「こいん」と書く（「コイン」と書かない）。文言は設計書 §4 の文をそのまま使う。
- キャラは死なない・罰なし（足りないときは押せないだけ）。オリジナルデザインのみ（設計書 §8.1）。
- バックアップコード（`PUNI2:`）は最大データでも 40,000 文字未満。
- 普段の画面で v2.4.0（コミット `4261140`）から変わるのは、ヘッダーの こいん表示・「🏠 おへや」ボタン と、設計書 §1.2 の追加だけ。
- 版：最後に `sw.js` の `VERSION` と `js/app.js` の `APP_VERSION` を `v2.6.0` にし、`ASSETS` に新しい js 10 本を足す。途中のタスクでは版を上げない。
- 公開リポジトリ：子どものなまえ・育成データ・オーナーのバックアップコードを、コード・テスト・文書・コミットに書かない。
- ブラウザ確認は `http://localhost:8000` のみ。実機（iPad）の滑らかさ・発熱は測れたふりをしない。
- コミットの末尾：`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. **v2.5.1 以前の保存データ・バックアップコードを読む**（`coin`・`own`・`room` が無い）→ 育成データ（なまえ・形・pts・history・cfg）がそのまま残り、こいん 0・初期の部屋で始まる。→ Task 4 `旧データ` テスト＋Task 16 の Playwright（今の育成データのコード）。
2. **壊れた・悪意のある復元コード**（`room.items` に範囲外・重なり・知らない ID・`__proto__`・巨大な配列・持っていない家具、`own` に文字列や 1e9）→ 落ちず、正しいものだけが残り、`Object.prototype` が汚れない。→ Task 2 `cleanRoom 敵対的` と Task 4 `敵対的なコード`。
3. **おへやを開いたまま閉じる経路が多い**（「← もどる」・おみせ／もようがえの途中で もどる・おわかれのモーダル・裏に回す・画像の読み込み失敗）→ 普段の画面に `inert` が残らない（子どもが何も押せなくなる）、Canvas と rAF が残らない。→ Task 12 の Playwright 手順（開閉 5 回・途中で閉じる・失敗の注入）。
4. **こいんを使ったあとに報告を取り消す**→ こいんは 0 で止まり、エサ・回数は今までどおり戻る。古い `undo`（`c` 無し）を取り消しても こいんは変わらない。→ Task 4 `coin.test.js`。
5. **家具でぷにを囲む・ぷにのいるマスに置く・部屋を広げる**→ ぷには家具の中に立たず、近くの空きマスへ移り、行き止まりでも固まらない（その場で休む）。→ Task 11 `relocateBrain` と `家具のある grid で 2000 ステップ`。

---

## 進め方（dispatch）

- **モデル**：実装・レビューのサブエージェントは `model: fable`。Fable がレート制限などで使えないときは `model: opus` に切り替える（台帳に `Ruling:` で記録）。いちばん力が要るのは **Task 2（room-edit）・Task 4（保存と sanitize）・Task 11（room.js）・Task 12（おへやモードの枠）**。この 4 つのレビューも同じく最上位で行う。
- **同時に動かすのは 4 本まで**（実装 3＋レビュー 1。`security-reviewer` と `/security-review` は数えない）。同じ波（Wave）のタスクは**ファイルが重ならない**（各タスクの Files が持ち分。ほかのファイルは読むだけ）。
- **worktree**：並行の実装者は、それぞれの worktree で始めにかならず
  `git reset --hard "$(git -C /workspaces/PuniPuni_Project rev-parse feature/oheya)"`
  を実行して最新の `feature/oheya` に合わせ、**自分の worktree の中だけ**で作業・コミットする（メインのチェックアウトや他の worktree に書かない）。統合はコントローラーが レビュー合格後に `feature/oheya` へ cherry-pick する。
- **各タスクの仕上げ**（CLAUDE.md のワークフロー）：構文チェック → `node --test tests/*.test.js` が全部通る → 画面に関わるタスクは Playwright の手順 → worktree の中でコミット。コントローラーは波ごとに、`feature/oheya` へ cherry-pick する**前に** その波の差分で `security-reviewer` と `/security-review` を行い、指摘を直してから取り込む。版（`VERSION`・`APP_VERSION`）は Task 16 でまとめて `v2.6.0` に上げる（`feature/oheya` は端末に配られないため。決定どおり）。
- 判断が要るときは `.superpowers/sdd/2026-11-10-oheya-room-mode-and-stage2/progress.md` に `Ruling:` で記録して進む。止まるのは、取り返しのつかない操作・セキュリティ上の判断・全体が破綻したときだけ。

| Wave | タスク（並行） | 前提 |
|---|---|---|
| 0a | Task 1 | — |
| 0b | Task 2 ‖ Task 3 | Task 1 |
| 1 | Task 4 ‖ Task 5 ‖ Task 6 | Wave 0 |
| 2 | Task 7 ‖ Task 8 ‖ Task 9 | Wave 0・1 |
| 3 | Task 10 ‖ Task 11 | Wave 1・2 |
| 4 | Task 12 | Wave 3 |
| 5 | Task 13 ‖ Task 14 ‖ Task 15 | Task 12 |
| 6 | Task 16 → Task 17 | Wave 5 |

## ファイルの持ち分

| ファイル | 作る／変える | タスク |
|---|---|---|
| `js/room-data.js`・`tests/room-data.test.js` | 新規 | 1 |
| `js/room-edit.js`・`tests/room-edit.test.js` | 新規 | 2 |
| `js/room-art-kit.js`・`tests/helpers/art-check.js`・`dev/item-sheet.{html,js,css}` | 新規 | 3 |
| `js/room-art-a.js`・`tests/room-art-a.test.js` | 新規 3 → 中身 5 | 3, 5 |
| `js/room-art-b.js`・`tests/room-art-b.test.js` | 新規 3 → 中身 6 | 3, 6 |
| `js/room-art-c.js`・`tests/room-art-c.test.js` | 新規 3 → 中身 7 | 3, 7 |
| `js/room-art.js`・`tests/room-art.test.js` | 3（`itemSVG` の振り分け）→ 8（ゆか・かべ）→ 11（`layout` を消す） | 3, 8, 11 |
| `js/state.js`・`js/rules.js`・`tests/state.test.js`・`tests/coin.test.js` | 変更・新規 | 4 |
| `js/room-shop.js`・`tests/room-shop.test.js` | 新規 | 9 |
| `js/app.js`・`index.html`・`css/style.css`・`tests/revert.test.js` | 10 → 12 | 10, 12 |
| `js/room.js`・`js/room-ai.js`・`tests/room.test.js`・`tests/room-ai.test.js` | 変更 | 11 |
| `js/room-ui.js` | 新規 | 12 |
| `js/room-ui-shop.js` | 12（空の口）→ 13 | 12, 13 |
| `js/room-ui-edit.js` | 12（空の口）→ 14 | 12, 14 |
| `css/style.css` の `/* おみせ */` ブロック | 13 だけ（ほかの行は触らない） | 13 |
| `css/style.css` の `/* もようがえ */` ブロック | 14 だけ | 14 |
| `docs/spec.md`・`docs/spec-summary.md`・`docs/oheya/g1-request.md` | 変更 | 15 |
| `sw.js`・`js/app.js` の `APP_VERSION` | 変更 | 16 |

---

# Wave 0：契約（データ・配置・絵の形式）

### Task 1: カタログと型 `js/room-data.js`

**Files:**
- Create: `js/room-data.js`
- Test: `tests/room-data.test.js`

**Interfaces:**
- Consumes: なし（何も import しない）
- Produces:
  ```js
  /** @typedef {{id:string,x:number,y:number,r:0|1|2|3}} Placed */
  /** @typedef {{n:6|8|10,floor:string,wall:string,items:Placed[]}} Room */
  /** @typedef {{[id:string]:number}} Own */
  /** @typedef {{id:string,name:string,price:number,w:number,h:number,walk:boolean,flat:boolean}} ItemDef */
  /** @typedef {{id:string,name:string,price:number}} PatternDef */
  /** @typedef {{id:string,name:string,price:number,from:6|8,to:8|10}} ExpandDef */
  export const ITEMS: Readonly<{[id:string]:ItemDef}>     // 設計書 §8 の表の順（挿入順＝カタログの順）
  export const FLOORS: Readonly<{[id:string]:PatternDef}>  // f_honey, f_mint, f_check, f_cloud
  export const WALLS: Readonly<{[id:string]:PatternDef}>   // w_pink, w_stripe, w_star, w_sky
  export const EXPANDS: Readonly<{[id:string]:ExpandDef}>  // x8 {from:6,to:8,price:200}, x10 {from:8,to:10,price:400}
  export const SIZES=[6,8,10], MAX_ITEMS=60, MAX_OWN=99, MAX_COIN=999999, MAX_GRANT=20;
  export const DEFAULT_FLOOR='f_honey', DEFAULT_WALL='w_pink';
  export function has(table: object, id: unknown): boolean   // typeof id==='string' && 自分で持つキー
  export function defaultOwn(): Own                          // 毎回新しい {rug:1,shelf:1,plant:1}
  export function defaultRoom(): Room                        // 毎回新しいオブジェクト（Global Constraints の値）
  ```

- [ ] **Step 1: 失敗するテストを書く**（`tests/room-data.test.js`）
  - `表の値`：設計書 §8 の 17 行を `[id,name,price,w,h,walk,flat]` の配列でテストに写し、`Object.values(ITEMS).map(d=>[d.id,d.name,d.price,d.w,d.h,d.walk,d.flat])` と `deepEqual`（順番も）。ゆか・かべ・ひろげるも同様（`f_honey`・`w_pink` は price 0、ほかは 30。`x8` 200・`x10` 400）。
  - `ID`：全カタログの ID が `/^[a-z][a-z0-9_]{0,15}$/` に合い、4 つの表を通して重複なし。各値の `id` がキーと同じ。
  - `なまえはひらがな`：全なまえが `/^[ぁ-ゟー ]+$/`（ひらがな・長音・半角空白）。
  - `足あと`：`w`・`h` は 1〜2。`flat` なら `walk` も真。
  - `初期`：`defaultRoom()` が Global Constraints の値と `deepEqual`、2 回呼ぶと別のオブジェクト（片方を変えてももう片方は同じ）。`defaultOwn()` が `{rug:1,shelf:1,plant:1}`。
  - `has`：`has(ITEMS,'bed')` 真、`has(ITEMS,'__proto__')`・`has(ITEMS,'toString')`・`has(ITEMS,1)` 偽。
  - `凍結`：`Object.isFrozen(ITEMS)` と `Object.isFrozen(ITEMS.bed)` が真。
- [ ] **Step 2: 失敗を確かめる** — Run: `node --test tests/room-data.test.js` / Expected: FAIL（`Cannot find module`）
- [ ] **Step 3: `js/room-data.js` を実装する** — 値は設計書 §8 から。表は `Object.freeze` で凍結（中身も）。冒頭に JSDoc の typedef を置く（ほかのモジュールは `@typedef {import('./room-data.js').Room} Room` で参照）。
- [ ] **Step 4: 通ることを確かめる** — Run: `node --test tests/room-data.test.js` / Expected: PASS
- [ ] **Step 5: コミット** — `git add js/room-data.js tests/room-data.test.js && git commit -m "feat(oheya): おへやのカタログと型（room-data）"`

### Task 2: 配置の純ロジック `js/room-edit.js`（最上位モデル）

**Files:**
- Create: `js/room-edit.js`
- Test: `tests/room-edit.test.js`

**Interfaces:**
- Consumes: Task 1 の `ITEMS`・`FLOORS`・`WALLS`・`SIZES`・`MAX_ITEMS`・`MAX_OWN`・`DEFAULT_FLOOR`・`DEFAULT_WALL`・`has`・`defaultRoom`
- Produces（設計書 §5 のとおり。`Room` を変えず新しいものを返す。失敗は `null`）：
  ```js
  footprint(id: string, r: number): {w:number,h:number}|null
  cellsOf(p: Placed): {x:number,y:number}[]
  itemAt(room: Room, x: number, y: number): number
  placedCount(room: Room, id: string): number
  canPlace(room: Room, id: string, x: number, y: number, r: number, ignoreIndex?: number): boolean
  place(room: Room, own: Own, id: string, x: number, y: number, r: number): Room|null
  move(room: Room, index: number, x: number, y: number): Room|null
  rotate(room: Room, index: number): Room|null
  remove(room: Room, index: number): Room|null
  stock(room: Room, own: Own): {id:string,left:number}[]
  placeMask(room: Room, id: string, r: number, ignoreIndex?: number): Uint8Array
  blockedCells(room: Room): {x:number,y:number}[]
  homeFor(room: Room): {x:number,y:number}
  nearestFree(room: Room, x: number, y: number): {x:number,y:number}
  setFloor(room: Room, own: Own, id: string): Room|null
  setWall(room: Room, own: Own, id: string): Room|null
  cleanOwn(raw: unknown): Own
  cleanRoom(raw: unknown, own: Own): Room
  ```

- [ ] **Step 1: 失敗するテストを書く**（`R=defaultRoom()`、`O=defaultOwn()`）
  - `footprint`：`('shelf',0)`→`{w:1,h:2}`、`('shelf',1)`→`{w:2,h:1}`、`('shelf',2)`→`{w:1,h:2}`、`('nope',0)`・`('__proto__',0)`→`null`。
  - `canPlace`：`(R,'bed',2,2,0)` 偽（ラグと重なる）、`(R,'bed',4,4,0)` 真、`(R,'bed',5,5,0)` 偽（はみ出す）、`(R,'plant',0,2,0)` 偽、`(R,'shelf',0,2,0,1)` 真（自分を除く）、`(R,'plant',1.5,0,0)`・`(R,'plant',1,0,4)`・`(R,'plant',1,0,-1)` 偽。
  - `60 件`：`n:10` に 1×1 を 60 個並べた部屋で `canPlace(…,'plant',9,9,0)` 偽。
  - `空きマス 1 つ`：`n:6` で (5,5) 以外の 35 マスに `plant` を置いた部屋で `canPlace(…,'plant',5,5,0)` 偽、`canPlace(…,'rug',…)` は場所が無いので偽。
  - `元を変えない`：`place`・`move`・`rotate`・`remove`・`setFloor` の前後で `R` の `JSON.stringify` が同じ。
  - `place`：`place(R,O,'bed',4,4,0)`→`null`（持っていない）。`place(R,{...O,bed:1},'bed',4,4,0).items.at(-1)` が `{id:'bed',x:4,y:4,r:0}`。同じ `own` で 2 個目は `null`。
  - `move`：`move(R,0,3,3)` の `items[0]` が `{id:'rug',x:3,y:3,r:0}`。`move(R,0,0,2)` と `move(R,9,1,1)` は `null`。
  - `rotate`：`rotate(R,1).items[1].r===1`（ほんだなが (0,2),(1,2) を占める）。`rotate` 4 回で `r` が 0 に戻る。足あとがふさがれる配置では `null`。
  - `remove`：`remove(R,1).items.length===2`、`stock(remove(R,1),O)` が `[{id:'shelf',left:1}]`。`stock(R,O)` は `[]`。`stock(R,{...O,bed:2,plush:1})` が `[{id:'plush',left:1},{id:'bed',left:2}]`（`ITEMS` の順）。
  - `placeMask(R,'bed',0)`：長さ 36、`[4*6+4]===1`、`[2*6+2]===2`、`[5*6+5]===2`。
  - `blockedCells(R)` を `x,y` で並べて `[{x:0,y:2},{x:0,y:3},{x:5,y:0}]`（ラグは通れる）。
  - `homeFor(R)`→`{x:3,y:3}`。`homeFor({...R,items:[]})`→`{x:2,y:2}`。`(2,2)` に plant だけの部屋→`{x:3,y:2}`。
  - `nearestFree(R,0,2)`→`{x:0,y:1}`、`nearestFree(R,3,3)`→`{x:3,y:3}`。
  - `setFloor(R,O,'f_mint')`→`null`、`setFloor(R,{f_mint:1},'f_mint').floor==='f_mint'`、`setFloor(R,{},'f_honey')` は成功、`setWall` も同様、知らない ID は `null`。
  - `ひろげたあと`：`canPlace({...R,n:8},'plant',7,7,0)` 真。
  - `cleanOwn 敵対的`：`cleanOwn(JSON.parse('{"__proto__":{"x":1},"bed":150,"rug":"3","plush":0,"sofa":2.9,"zzz":4,"f_mint":7,"f_honey":1,"x8":1}'))` が `{bed:99,sofa:2,f_mint:1}`、`({}).x===undefined`、`cleanOwn(null)`・`cleanOwn([])`・`cleanOwn('a')` は `{}`。
  - `cleanRoom 敵対的`：`cleanRoom(null,O)` が `defaultRoom()`。`n:7`→6、`floor:'f_mint'`（持っていない）→`'f_honey'`、`items` が配列でない→`[]`。items `[{id:'rug',x:2,y:2,r:0},{id:'rug',x:2,y:2,r:0}]`（own rug:2）→ 1 件（重なり）。範囲外 `{id:'plant',x:6,y:0,r:0}`・知らない `{id:'zzz',…}`・`r:5`・`x:'1'`・`null`・`{id:'__proto__'}` は捨てる。own を超えた 2 個目の plant は捨てる。300 件の配列（own 99）でも 60 件以下で、201 件目以降は見ない（先頭 200 件が全部はみ出し、201 件目が正しい配列 → items は `[]`）。返る items の各要素のキーは `['id','x','y','r']` だけ。
  - `冪等`：上の敵対的な入力 x で `cleanRoom(cleanRoom(x,O),O)` が `cleanRoom(x,O)` と `deepEqual`。
- [ ] **Step 2: 失敗を確かめる** — Run: `node --test tests/room-edit.test.js` / Expected: FAIL（`Cannot find module`）
- [ ] **Step 3: `js/room-edit.js` を実装する** — 判定は設計書 §5 の条件をそのまま。`homeFor`・`nearestFree` の同点は「距離の 2 乗 → y → x の小さい順」。`placeMask` は各マスで `canPlace(room,id,x,y,r,ignoreIndex)` を呼ぶだけでよい（10×10 で 100 回）。数の判定は `has()` を通す。
- [ ] **Step 4: 通ることを確かめる** — Run: `node --test tests/room-edit.test.js` / Expected: PASS
- [ ] **Step 5: コミット** — `git add js/room-edit.js tests/room-edit.test.js && git commit -m "feat(oheya): 家具の配置の純ロジック（room-edit）"`

### Task 3: 絵の契約（共通部品・グループの表・確認ページ）

**Files:**
- Create: `js/room-art-kit.js`、`js/room-art-a.js`、`js/room-art-b.js`、`js/room-art-c.js`、`tests/helpers/art-check.js`、`tests/room-art-a.test.js`、`dev/item-sheet.html`・`dev/item-sheet.js`・`dev/item-sheet.css`
- Modify: `js/room-art.js`（部品を kit へ移す・`itemSVG` を振り分けにする・ほんだな／しょくぶつを `room-art-a.js` へ移す）、`tests/room-art.test.js`（`itemSVG` の部分だけ）

**Interfaces:**
- Consumes: Task 1 の `ITEMS`・`has`（`room-art.js` だけ）
- Produces:
  ```js
  // js/room-art-kit.js（何も import しない）
  export const TILE_W=64, TILE_H=32, WALL_H=112, OL='#D2A99A', OW=3, ST /* 線の属性文字列 */, SHADOW='rgba(120,80,100,.14)';
  export function f1(v:number): number; export function pts(a:[number,number][]): string;
  export function poly(a, fill:string, extra?:string): string; export function polyN(a, fill:string): string;
  export function roundPoly(a, r:number, fill:string, extra?:string): string;
  export function isoPt(ax:number, ay:number, gx:number, gy:number, h?:number): [number,number]  // [ax+(gx-gy)*32, ay+(gx+gy)*16-h]
  export function isoBox(ax:number, ay:number, x0:number, y0:number, w:number, h:number, z0:number, z1:number,
                         col:{top:string,left:string,right:string}): string   // 上・左・右の 3 面（線つき）
  export function footShadow(ax:number, ay:number, w:number, h:number): string // 足あとのひし形の影 SHADOW
  export function wrapSVG(w:number, h:number, body:string): string            // <svg xmlns=… viewBox="0 0 w h" width height aria-hidden="true">
  /** @typedef {{svg:string,w:number,h:number,ax:number,ay:number}} ItemArt */
  // js/room-art-a.js / -b.js / -c.js
  export const ART_A: Readonly<{[id:string]:()=>ItemArt}>   // Task 3 では {shelf, plant}
  export const ART_B: Readonly<{[id:string]:()=>ItemArt}>   // Task 3 では {}
  export const ART_C: Readonly<{[id:string]:()=>ItemArt}>   // Task 3 では {}
  // js/room-art.js
  export {TILE_W,TILE_H,WALL_H} from './room-art-kit.js';
  export function itemSVG(id: string): ItemArt   // ART_A→B→C の順に has() で引き、無ければ予備の箱（ITEMS の w×h、知らない ID は 1×1）
  // tests/helpers/art-check.js
  export function checkSafe(svg: string, idPrefix?: string): void              // §8.1 の「安全」をすべて assert
  export function checkArt(art: ItemArt, id: string, fw: number, fh: number): void // checkSafe(art.svg,'ri-'+id+'-')＋§8.1 の「形式」（fw×fh＝足あと）
  export const GROUPS={A:['rug','rug_pink','rug_mint','shelf','plant','lamp','ball','plush'],B:['bed','sofa','table','chair','desk'],C:['toybox','cushion','tent','slide']};
  ```
  - `dev/item-sheet.html?g=A|B|C|all`：各アイテムを 4 つの向き（r 0〜3）で 1 行に並べ、マスの格子と足あとのひし形（うすい青）を下に描き、基準点に赤い点を打つ。`r` が奇数は基準点で `scale(-1,1)`。`?g=pat` は ゆか・かべの 8 柄（Task 8 の `patternSVG` があれば）。CSP の `<meta>` は `index.html` と同じ。`sw.js` の `ASSETS` に入れない。

- [ ] **Step 1: 失敗するテストを書く**
  - `tests/room-art-a.test.js`：`for(const id of Object.keys(ART_A)) checkArt(ART_A[id](),id,ITEMS[id].w,ITEMS[id].h)`、`Object.keys(ART_A).every(id=>GROUPS.A.includes(id))`、`ART_B`・`ART_C` のキーも各グループに含まれる（Task 3 時点では空でよい）。
  - `tests/room-art.test.js` に追記：`itemSVG('shelf')` の `svg` が Task 3 前と同じ文字列（先に現行の値をテスト内で計算してから移す：移す前に `node -e` で現行の `itemSVG('shelf').svg` の sha256 を取り、テストに定数で書く。plant も同様）。`itemSVG('bed')`（まだ絵が無い）が `checkArt(…,'bed',2,2)` に通る予備の箱。`itemSVG('zzz')` が 1×1 の箱。`TILE_W` などが `room-art.js` から今までどおり import できる。
  - `checkArt` の中身（§8.1）：`svg` が `<svg` で始まり `xmlns="http://www.w3.org/2000/svg"` を含む、`/<script|\son\w+=|\sstyle=|href/i` が無い、`http` が xmlns 以外に無い、同じタグに同じ属性が 2 回無い、`id="` があれば `idPrefix` で始まる、`svg.length<=20000`、`art.w,art.h,art.ax,art.ay` が有限の正の数、`art.ax>=fh*32`、`art.w-art.ax>=fw*32`、`art.h-art.ay>=(fw+fh)*16`、`art.ay<=150`。
- [ ] **Step 2: 失敗を確かめる** — Run: `node --test tests/room-art-a.test.js tests/room-art.test.js` / Expected: FAIL（`room-art-a.js` が無い）
- [ ] **Step 3: 実装する** — `room-art.js` の部品（`OL`…`roundPoly`）を kit へ移し、`roomSVG`・`layout` は kit から import して今のまま動かす（`layout` は Task 11 まで残す）。`shelfSVG`・`plantSVG` を `room-art-a.js` に移して `ART_A={shelf,plant}`（出力の文字列を変えない）。`isoBox`・`footShadow`・`wrapSVG` は新規。`dev/item-sheet.*` を作る。
- [ ] **Step 4: 通ることを確かめる** — Run: `node --test tests/*.test.js` / Expected: PASS（既存テストも全部）。`python3 -m http.server 8000` を起動し、Playwright で `http://localhost:8000/dev/item-sheet.html?g=all` を開いてコンソールエラー 0、ほんだな・しょくぶつ が 4 つの向きで足あとの上に乗っていることをスクリーンショットで確かめる。
- [ ] **Step 5: コミット** — `git add js/room-art*.js tests/helpers/art-check.js tests/room-art*.test.js dev/item-sheet.* && git commit -m "refactor(oheya): 絵の共通部品とグループ表・確認ページ（家具の絵の契約）"`

---

# Wave 1

### Task 4: 保存データと こいん（`state.js`・`rules.js`）（最上位モデル）

**Files:**
- Modify: `js/state.js`（`DEF()`・`sanitize()`。中の小関数 `own` は `hasOwn` に名前を変えてよい）、`js/rules.js`（`grantCoin`・`undoReport`）
- Test: `tests/state.test.js`、`tests/coin.test.js`

**Interfaces:**
- Consumes: Task 1 の `defaultOwn`・`defaultRoom`・`MAX_COIN`・`MAX_GRANT`、Task 2 の `cleanOwn`・`cleanRoom`
- Produces:
  ```js
  // state.js：DEF() に coin:0, own:defaultOwn(), room:defaultRoom()。undo の要素に c:number
  // sanitize(o)：d.coin=int(o.coin,0,0,999999); d.own=hasOwn(o,'own')?cleanOwn(o.own):defaultOwn();
  //              d.room=cleanRoom(o.room===undefined?defaultRoom():o.room, d.own); undo の map に c:int(u.c,0,0,20)
  // rules.js
  export function grantCoin(S: {coin:number}, amount: number): number   // 0〜20 の整数に丸めて足し、999999 で止め、実際に増えた数を返す
  export function undoReport(S, tid): boolean                          // 今までの処理＋ S.coin=Math.max(0,S.coin-(u.c||0))
  ```

- [ ] **Step 1: 失敗するテストを書く**
  - `tests/coin.test.js`：
    - `grantCoin({coin:0},3)` が 3 を返し coin 3。`(…,25)`→20、`(…,-1)`→0、`(…,2.7)`→2、`(…,NaN)`→0、`({coin:999998},3)`→1 で coin 999999。
    - `取り消しで戻る`：`S=DEF()` に `cnt:{jishu:1}`・`inv:{kotoba:1}`・`undo:[{t:'jishu',k:'jishu',f:'kotoba',b:0,n:1,c:1}]`・`coin:1` → `undoReport(S,'jishu')` 真、`coin===0`、`inv.kotoba===undefined`。
    - `使ったあと`：同じで `coin:0` → 取り消しても `coin===0`。
    - `古い undo`：`c` の無い項目 → coin は変わらない。
  - `tests/state.test.js`：
    - `DEF のキー`：`DEF().coin===0`、`DEF().own` が `{rug:1,shelf:1,plant:1}`、`DEF().room` が `defaultRoom()`。
    - `旧データ`：`DEF()` から `coin`・`own`・`room` を消し、`name:'てすと'`・`stage:2`・`form:'hoshi'`・`pts:123`・`history:[{f:<ADULT_IDS[0]>,n:'まえ',g:1,s:false}]` にしたものを `sanitize(JSON.parse(JSON.stringify(x)))` → それらが残り、`coin===0`、`room` が `defaultRoom()`、`own` が `defaultOwn()`。`undo` の古い項目（`c` 無し）は `c:0` で残る。
    - `敵対的なコード`：`decodeState(encodeState(x))` の x に `coin:-5`→0、`coin:1e9`→999999、`coin:'12'`→12、`own:{"__proto__":…,"bed":150}`、`room:{n:10,items:[…重なり・範囲外・知らない ID・own を超える…]}` を入れても落ちず、`Object.prototype` に余計なキーが無い（`({}).x===undefined`）。`undo:[{…,c:50}]`→`c:20`。`room` キーが無く `own:"str"` のデータ → `own` は `{}`、部屋は初期の柄で `items:[]`（初期の家具を持っていないため）。
    - `冪等`：上の x で `sanitize(JSON.parse(JSON.stringify(sanitize(x))))` が `sanitize(x)` と `deepEqual`（`lastTick` など時刻のキーは比べる前にそろえる）。
    - `40,000 文字`：history 200 件（なまえ 8 文字のひらがな）、`n:10` の部屋に 60 件（1×1 を 6 種×10）、`own` は全かぐ 99・全柄 1、`undo` 30 件、`cfg` 既定 → `encodeState(S).length<40000` かつ `decodeState` で `room`・`own`・`coin` が往復する。
- [ ] **Step 2: 失敗を確かめる** — Run: `node --test tests/state.test.js tests/coin.test.js` / Expected: FAIL（`grantCoin` が無い・`coin` が undefined）
- [ ] **Step 3: 実装する** — 上の Produces のとおり。`sanitize()` の既存の行は変えない（キーを足すだけ）。
- [ ] **Step 4: 通ることを確かめる** — Run: `node --test tests/*.test.js` / Expected: PASS
- [ ] **Step 5: コミット** — `git add js/state.js js/rules.js tests/state.test.js tests/coin.test.js && git commit -m "feat(oheya): こいん・持ちもの・部屋を保存データに足す（v:2 のまま）"`

### Task 5: 家具の絵 A（ラグ 3 色・ほんだな・しょくぶつ・らんぷ・ぼーる・ぬいぐるみ）

**Files:**
- Modify: `js/room-art-a.js`
- Test: `tests/room-art-a.test.js`

**Interfaces:**
- Consumes: Task 3 の kit・`ItemArt`・`checkArt`・`GROUPS`、Task 1 の `ITEMS`
- Produces: `ART_A` のキーが `GROUPS.A` の 8 つ。`rug` は今の `roomSVG` のラグ（ラベンダー `#CDB8F0`・内側 `#E6DAFA`・スカラップのふち・中央の花）を 2×2 の家具として描き直したもの。`rug_pink`・`rug_mint` は同じ形で色だけ別（ID ごとに `id=` を使うなら `ri-<id>-`）。ラグは平たいので `ay` は小さく（高さ 6 以下）。

- [ ] **Step 1: 失敗するテストを書く** — `tests/room-art-a.test.js` に `Object.keys(ART_A).sort()` が `GROUPS.A` の並べ替えと `deepEqual`。`rug`・`rug_pink`・`rug_mint` の `svg` がたがいに違う。`ART_A.shelf().svg` は Task 3 のハッシュのまま。
- [ ] **Step 2: 失敗を確かめる** — Run: `node --test tests/room-art-a.test.js` / Expected: FAIL（キーが足りない）
- [ ] **Step 3: 6 つの絵を描く** — 設計書 §8.1（3 段の明暗・影・線 `ST`・丸み・オリジナル。ぬいぐるみは丸い体のどうぶつ、顔は点の目と小さな口だけ）。`isoBox`・`footShadow` を使う。
- [ ] **Step 4: 通ることを確かめる** — Run: `node --test tests/room-art-a.test.js` / Expected: PASS。Playwright で `http://localhost:8000/dev/item-sheet.html?g=A` を 1180×820 でスクリーンショット → 8 種×4 向きが足あとの上に乗り、はみ出し・欠けがない。画像を確認した旨を報告に書く。
- [ ] **Step 5: コミット** — `git add js/room-art-a.js tests/room-art-a.test.js && git commit -m "feat(oheya): 家具の絵 A（ラグ3色・らんぷ・ぼーる・ぬいぐるみ）"`

### Task 6: 家具の絵 B（べっど・そふぁ・ちゃぶだい・いす・つくえ）

**Files:**
- Modify: `js/room-art-b.js`
- Create: `tests/room-art-b.test.js`

**Interfaces:**
- Consumes: Task 5 と同じ
- Produces: `ART_B` のキーが `GROUPS.B` の 5 つ。

- [ ] **Step 1: 失敗するテストを書く** — `tests/room-art-b.test.js`：各キーで `checkArt(ART_B[id](),id,ITEMS[id].w,ITEMS[id].h)`、`Object.keys(ART_B).sort()` が `GROUPS.B` の並べ替えと `deepEqual`、5 つの `svg` がたがいに違う。
- [ ] **Step 2: 失敗を確かめる** — Run: `node --test tests/room-art-b.test.js` / Expected: FAIL
- [ ] **Step 3: 5 つの絵を描く** — §8.1。べっど 2×2、そふぁ・つくえ 1×2、ちゃぶだい・いす 1×1。
- [ ] **Step 4: 通ることを確かめる** — Run: `node --test tests/room-art-b.test.js` / Expected: PASS。Playwright で `dev/item-sheet.html?g=B` のスクリーンショット（4 向き）。
- [ ] **Step 5: コミット** — `git add js/room-art-b.js tests/room-art-b.test.js && git commit -m "feat(oheya): 家具の絵 B（べっど・そふぁ・ちゃぶだい・いす・つくえ）"`

---

# Wave 2

### Task 7: 家具の絵 C（おもちゃばこ・おほしさま くっしょん・てんと・すべりだい）

**Files:**
- Modify: `js/room-art-c.js`
- Create: `tests/room-art-c.test.js`

**Interfaces:** Task 6 と同じ形で `ART_C` のキーが `GROUPS.C` の 4 つ。てんと 2×2、すべりだい 1×2（高さは `ay<=150` に収める）。

- [ ] **Step 1: 失敗するテストを書く** — Task 6 の Step 1 と同じ内容を `ART_C`・`GROUPS.C` で。さらに `itemSVG` の予備の箱が どの ID にも使われていない：`for id of Object.keys(ITEMS)`, `ART_A`・`ART_B`・`ART_C` のどれかが `has` で持つ（全 17 種に専用の絵）。
- [ ] **Step 2: 失敗を確かめる** — Run: `node --test tests/room-art-c.test.js` / Expected: FAIL
- [ ] **Step 3: 4 つの絵を描く** — §8.1。
- [ ] **Step 4: 通ることを確かめる** — Run: `node --test tests/*.test.js` / Expected: PASS（Wave 1 の統合後なので全 17 種がそろう）。Playwright で `dev/item-sheet.html?g=C` と `?g=all` のスクリーンショット。
- [ ] **Step 5: コミット** — `git add js/room-art-c.js tests/room-art-c.test.js && git commit -m "feat(oheya): 家具の絵 C（おもちゃばこ・くっしょん・てんと・すべりだい）"`

### Task 8: ゆか・かべの柄と見本（`room-art.js`）

**Files:**
- Modify: `js/room-art.js`（`roomSVG` の引数・ラグを消す・`patternSVG`）、`tests/room-art.test.js`

**Interfaces:**
- Consumes: Task 1 の `FLOORS`・`WALLS`・`DEFAULT_FLOOR`・`DEFAULT_WALL`・`has`
- Produces:
  ```js
  export function roomSVG(n: 6|8|10, band: string, floorId?: string, wallId?: string): string  // 省略・知らない ID は初期柄
  export function patternSVG(id: string): string   // FLOORS/WALLS の 96×64 の見本。知らない ID は ''
  ```
  かべの 4 柄すべてに まど・カーテン・幅木を描く（今の位置）。SVG の `id=` は時間帯・柄ごとに別（`rsky-<band>-<wall>` など）。

- [ ] **Step 1: 失敗するテストを書く**
  - `安全`：`n∈{6,8,10}`×`band∈4`×`floor∈4`×`wall∈4` の 192 枚すべてに `checkSafe`、viewBox が `0 0 ${n*64} ${n*32+WALL_H}`。
  - `ラグが背景に無い`：どの `roomSVG` にも `#CDB8F0`・`#E6DAFA` が無い。
  - `既定`：`roomSVG(6,'hiru')===roomSVG(6,'hiru','f_honey','w_pink')`、`roomSVG(6,'hiru','zzz','__proto__')` も同じ。
  - `柄が違う`：4 つの floor の `roomSVG(6,'hiru',f,'w_pink')` がたがいに違う。wall も同様。
  - `patternSVG`：8 柄が `checkSafe` に通り `viewBox="0 0 96 64"`、たがいに違う。`patternSVG('zzz')===''`。
  - 既存の「時間帯で空の色」「ID は時間帯ごとに別」のテストは残す（壁の柄が違っても ID が重ならない）。
- [ ] **Step 2: 失敗を確かめる** — Run: `node --test tests/room-art.test.js` / Expected: FAIL
- [ ] **Step 3: 実装する** — 今の床（はちみつの板張り）と かべ（うすピンク水玉）を `f_honey`・`w_pink` の描き方として残し、新しい 3 柄ずつを足す（パステル。`f_check` は 2 色の いちまつ、`f_cloud` は くもの形、`w_stripe` たてじま、`w_star` ほし、`w_sky` そらいろ に くも）。ラグの描画ブロックを消す（ラグは `ART_A.rug` が描く）。
- [ ] **Step 4: 通ることを確かめる** — Run: `node --test tests/*.test.js` / Expected: PASS。Playwright で `dev/item-sheet.html?g=pat` のスクリーンショット。
- [ ] **Step 5: コミット** — `git add js/room-art.js tests/room-art.test.js && git commit -m "feat(oheya): ゆか・かべの柄（各4種）と見本。ラグは家具へ"`

### Task 9: 買い物の純ロジック `js/room-shop.js`

**Files:**
- Create: `js/room-shop.js`、`tests/room-shop.test.js`

**Interfaces:**
- Consumes: Task 1 の表・`has`・`MAX_OWN`、Task 4 で `S` が持つ `coin`・`own`・`room`（テストでは `DEF()` を使う）
- Produces（設計書 §6）：
  ```js
  /** @typedef {'kagu'|'yuka'|'kabe'|'hiroge'} ShopCat */
  /** @typedef {'ok'|'short'|'owned'|'max'|'locked'} CardState */
  /** @typedef {{id:string,name:string,price:number,state:CardState,have:number,need:number}} Card */
  export const SHOP_CATS: ShopCat[]                 // ['kagu','yuka','kabe','hiroge']
  export function cardState(S, id: string): CardState|null
  export function shopCards(S, cat: ShopCat): Card[]
  export function buy(S, id: string): boolean
  ```

- [ ] **Step 1: 失敗するテストを書く**（`S=DEF()` から）
  - `ちょうど`：`coin:60` で `cardState(S,'bed')==='ok'`、`buy` 真 → `coin===0`・`own.bed===1`。もう一度 `buy` は偽。
  - `足りない`：`coin:59` → `'short'`、`shopCards(S,'kagu')` の bed の `need===1`、`buy` 偽で `S` が前と `deepEqual`。
  - `99 個`：`own.plush=99`・`coin:999` → `'max'`、`buy` 偽。
  - `連続`：`coin:30` で plush（10）を 3 回 `buy` → すべて真、`coin===0`・`own.plush===3`、4 回目は偽。
  - `ゆか`：`f_honey`→`'owned'`。`coin:30` で `buy(S,'f_mint')` → `own.f_mint===1`・`room.floor==='f_mint'`・`room` は別のオブジェクト、以後 `'owned'`。かべも同様。
  - `ひろげる`：n=6 で `x10`→`'locked'`、`coin:200` で `x8` `'ok'` → `buy` → `room.n===8`、`room.items` が前と `deepEqual`、`own.x8===undefined`、`x8`→`'owned'`。`coin:400` で `x10` → n=10。
  - `知らない ID`：`cardState(S,'zzz')`・`cardState(S,'__proto__')` が `null`、`buy(S,'toString')` 偽。
  - `カード`：`shopCards(S,'kagu').length===17`（`ITEMS` の順）、`'yuka'` 4・`'kabe'` 4・`'hiroge'` 2。かぐの `have` は `own[id]||0`。
- [ ] **Step 2: 失敗を確かめる** — Run: `node --test tests/room-shop.test.js` / Expected: FAIL
- [ ] **Step 3: 実装する** — 設計書 §6。`buy` は `cardState(S,id)!=='ok'` なら何もせず偽。`S.room` は新しいオブジェクトに入れ替える。
- [ ] **Step 4: 通ることを確かめる** — Run: `node --test tests/room-shop.test.js` / Expected: PASS
- [ ] **Step 5: コミット** — `git add js/room-shop.js tests/room-shop.test.js && git commit -m "feat(oheya): おみせの純ロジック（room-shop）"`

---

# Wave 3

### Task 10: 普段の画面を v2.4.0 に戻し、こいんを付ける（`app.js`・`index.html`・`css`）

**Files:**
- Modify: `js/app.js`、`index.html`（`.topbtns` に `#coin`）、`css/style.css`
- Create: `tests/revert.test.js`

**Interfaces:**
- Consumes: Task 4 の `grantCoin`・`S.coin`・`undo[].c`
- Produces（Task 12 が使う、`app.js` の中の関数）：`setCoin(n: number): void`（`#coin` の文字と `aria-label`、増えたら `coinpop` を付け直す）。`report()` の付与、`newGeneration()` の `keep` に `coin`・`own`・`room`。

- [ ] **Step 1: 失敗するテストを書く**（`tests/revert.test.js`。ファイルを文字列で読むだけ）
  - `app.js`・`style.css` に `roomOn`・`roomHold`・`roomOff`・`.screen.room`・`from './room.js'` が無い。
  - `app.js` の `render()` に v2.4.0 の 3 行がそのままある：`git show 4261140:js/app.js` から取った `$('#pet').innerHTML=petSVG(`… の行、`$('#screen').className='screen t-'+bd;` を含む行、`if(sceneBand!==bd)` の行（文字列をテストに定数で書く）。
  - `report()` が `grantCoin(S,FOODS[t.food].pt)` を 1 回だけ含み、`grantCoin(` は `app.js` 全体で 1 か所。`undo.push` の項目に `c:` がある。`newGeneration` の `keep` に `coin:S.coin`・`own:S.own`・`room:S.room`。
  - `index.html` の `.topbtns` の並びが `#coin`、`#zukanBtn`、`#gear`（Task 12 で `#oheyaBtn` が入る。テストは `indexOf` の順で見る）。
- [ ] **Step 2: 失敗を確かめる** — Run: `node --test tests/revert.test.js` / Expected: FAIL
- [ ] **Step 3: 実装する**
  - `git checkout 4261140 -- js/app.js css/style.css` で戻し、`APP_VERSION` を `'v2.5.1'` に直す（版は Task 16 で上げる）。`git diff a900bd1 -- js/app.js` が段階1の組み込みの削除と `APP_VERSION` 以外に無いことを確かめてから、次を足す。
  - `index.html`：`<span class="coin" id="coin" role="status"></span>` を `#zukanBtn` の前に。
  - `app.js`：`setCoin(n)`、`render()` の最後で `setCoin(S.coin)`、`report()` で `const c=grantCoin(S,FOODS[t.food].pt)`・`undo` に `c`、`newGeneration` の `keep`。文言・判定・タイマーは変えない。
  - `css`：`.coin`（ヘッダーの `.pill` と同じ高さの小さな表示）と `.coin.coinpop`（0.5 秒の拡大。`prefers-reduced-motion` では無し）。390px 幅でヘッダーが 1 行に収まる。
- [ ] **Step 4: 通ることを確かめる** — Run: `node --test tests/*.test.js` / Expected: PASS。Playwright：起動 → `#scene` に SVG・Canvas 無し・コンソールエラー 0 → 「じしゅう」を報告して こいんが `🪙 1` → 取り消して `🪙 0` → エサやり・設定・ずかんが今までどおり → 390×844 でヘッダーがはみ出さない。
- [ ] **Step 5: コミット** — `git add js/app.js index.html css/style.css tests/revert.test.js && git commit -m "feat(oheya): 普段の画面を v2.4.0 に戻し、ヘッダーに こいんを出す"`

### Task 11: 部屋の状態から描く（`room.js`・`room-ai.js`）（最上位モデル）

**Files:**
- Modify: `js/room.js`、`js/room-ai.js`、`js/room-art.js`（`layout()` を消すだけ）、`tests/room.test.js`、`tests/room-ai.test.js`、`tests/room-art.test.js`（`layout` のテストを消す）

**Interfaces:**
- Consumes: Task 2 の `footprint`・`blockedCells`・`homeFor`・`nearestFree`、Task 1 の `ITEMS`、Task 3/8 の `roomSVG(n,band,floor,wall)`・`itemSVG(id)`
- Produces（設計書 §7）：
  ```js
  mount(sceneEl: HTMLElement, petBtn: HTMLElement, opt: {room: Room, reduced?: boolean, onFail?: ()=>void}): boolean
  setRoom(room: Room): void
  setEdit(edit: {mask: Uint8Array|null, sel: number}|null): void
  onCell(cb: ((x:number,y:number)=>void)|null): void
  export function cellAt(px:number, py:number, ox:number, oy:number, s:number, n:number): {x:number,y:number}|null
  export function sortForDraw(list: {x:number,y:number,flat?:boolean}[]): typeof list
  // room-ai.js
  export function relocateBrain(b: Brain, grid: Grid, to: {x:number,y:number}, force?: boolean): void
  ```
  `update`・`hold`・`pauseFor`・`poke`・`unmount` は今のまま。`petBtn` の位置合わせは今のまま（`petBox`）。

- [ ] **Step 1: 失敗するテストを書く**
  - `room.test.js`：
    - `cellAt`：`n∈{6,8,10}` の全マスで、マスの中心 `toScreen(x+.5,y+.5,n)` を `px=ox+X*s` に写して `cellAt(px,py,10,20,0.5,n)` が `{x,y}`。部屋の外（`px=0,py=0`）は `null`。
    - `sortForDraw`：`[{x:5,y:5,flat:true,k:'rug'},{x:.5,y:.5,k:'a'},{x:3,y:3,k:'b'}]` → `k` の並びが `['rug','a','b']`。平たいもの同士・立っているもの同士は `x+y` の小さい順。
    - `2×2 までの並び`：2×2 の家具（足あとの中心 `x+1,y+1`）と、その足あとの外の各マスの中心にいるぷにとで、`sortForDraw` の順が「ぷにが家具より手前（`gx+gy` が大きい側）なら後」になる（n=6 の全マスで）。
    - 既存の export のテストに `setRoom`・`setEdit`・`onCell` を足し、mount 前に `setRoom(defaultRoom())`・`setEdit(null)`・`onCell(null)` が投げない。
  - `room-ai.test.js`：
    - `relocateBrain`：`grid=makeGrid(6,[{x:2,y:2}])`、ぷにを (2.5,2.5) で `walk` 中にして `relocateBrain(b,grid,{x:3,y:2})` → `b.x===3.5&&b.y===2.5`、`b.path` 空、`b.act==='idle'`。通れるマスにいるときは動かない。`force` なら動く。`grid.n=8` で `b.n===8`。
    - `家具のある grid で 2000 ステップ`：`blockedCells` に べっど・そふぁ・つくえ・ほんだな を置いた 6×6 の部屋の grid と `homeFor` で、`stepBrain` を `dt=0.05` で 2000 回（awake→sleep→awake を途中で切り替え）回して、`nearest` のマスが一度も通れないマスにならない。
    - `とじこめ`：通れるマスが 1 つだけの grid で 500 ステップ回して例外なし・NaN なし。
  - `room-art.test.js`：`layout` の 2 つのテストを消し、`import` から `layout` を外す。
- [ ] **Step 2: 失敗を確かめる** — Run: `node --test tests/room.test.js tests/room-ai.test.js` / Expected: FAIL（`cellAt`・`relocateBrain` が無い）
- [ ] **Step 3: 実装する** — 設計書 §7 のとおり。要点：`r.room`・`r.home`・`r.grid` を持ち、`bctx` の `home` は `r.home`。家具の画像は ID ごとに 1 枚（`Map`）。背景は時間帯×`n`・`floor`・`wall` ごとに作り直す（変わったら捨てる）。描く順は `sortForDraw`（家具の位置は足あとの中心、`flat` は `ITEMS[id].flat`）。`r` が奇数は基準点で `ctx.scale(-1,1)`。`setEdit` の表示（不透明度 0.55／きいろ `#FFD84D`／みどり `#7BD8A0`＋白い丸／あか `#FF9AA8` を 0.45）。`onCell` は Canvas の `click`（`clientX/Y` を Canvas の左上からの CSS px にして `cellAt`）。`setRoom` で `n` が変わったら `resize(r,true)`。`relocateBrain` は設計書 §7。`layout()` を `room-art.js` から消す。
- [ ] **Step 4: 通ることを確かめる** — Run: `node --test tests/*.test.js` / Expected: PASS。`for f in js/*.js dev/*.js; do node --check "$f"; done` が無言。（画面での確認は Task 12。）
- [ ] **Step 5: コミット** — `git add js/room.js js/room-ai.js js/room-art.js tests/room*.test.js && git commit -m "feat(oheya): 部屋の状態から描く・家具を避けて歩く（setRoom・setEdit・onCell）"`

---

# Wave 4

### Task 12: おへやモードの枠（`room-ui.js`・`app.js`・`index.html`・`css`）（最上位モデル）

**Files:**
- Create: `js/room-ui.js`、`js/room-ui-shop.js`・`js/room-ui-edit.js`（口だけ：何もしない関数と `isShopOpen`/`isEditing` が偽を返す）
- Modify: `js/app.js`（設計書 §1.2 の追加だけ）、`index.html`（`#oheyaBtn` と `#roomView` の枠一式）、`css/style.css`、`tests/revert.test.js`（`#oheyaBtn` の順）

**Interfaces:**
- Consumes: Task 11 の `mount`・`unmount`・`update`・`hold`・`poke`・`setRoom`、Task 10 の `setCoin`
- Produces（設計書 §4.2 の口。Task 13・14 が使う）：
  ```js
  /** @typedef {{getS:()=>any, save:()=>void, render:()=>void, say:(ja:string,zh?:string)=>void, sfx:(k:string,voice?:string)=>void,
   *   toast:(m:string)=>void, bindPet:(el:HTMLElement,hooks?:{down?:()=>void,up?:()=>void})=>void}} RoomHost */
  /** @typedef {{host:RoomHost, commit:()=>void}} RoomCtx */
  export function initRoomUI(host: RoomHost): void
  export function openRoom(): boolean
  export function closeRoom(): void
  export function isRoomOpen(): boolean
  export function refreshRoom(snap: {view:any,mode:string,band:string,now:number}): void
  export function roomPoke(): void
  // room-ui-shop.js: openShop(ctx: RoomCtx): void; closeShop(): void; isShopOpen(): boolean
  // room-ui-edit.js: startEdit(ctx: RoomCtx): void; endEdit(): void; isEditing(): boolean
  ```
  - `index.html` の枠（設計書 §4.2 の図。すべて静的、`#roomView` は `hidden`）：`#roomBack`・`#roomName`・`#roomCoin`・`#roomStage`>`#roomScene`＋`#roomPet`（`button`、`aria-label="なでる"`）・`.rbar`>`#roomGauges`・`#shopBtn`「🛒 おみせ」・`#editBtn`「🛠 もようがえ」・`#editDone`「おわり」（`hidden`）・`.bubble.rbubble`>`#roomBubbleText`・`#roomBubbleZh`・`#roomTray`（`hidden`）・`#roomShop`（`hidden`）。
  - `#roomShop` の中：`.shead`（`h2`「おみせ」・`#shopCoin`・`#shopClose`「とじる」）、`.stabs`（`button[data-cat]` ×4：かぐ／ゆか／かべ／ひろげる）、`#shopCards`、`#shopConfirm`（`hidden`。`#shopConfirmArt`・`#shopConfirmName`・`#shopConfirmPrice`・`#shopBuy`「かう」・`#shopCancel`「やめる」）。
  - `#roomTray` の中：`.ttabs`（`button[data-tab]` ×3：かぐ／ゆか／かべ）、`#trayList`、`#trayRotate`「まわす」、`#trayStore`「しまう」。
  - `css`：`.roomview`（`position:fixed;inset:0;z-index:10`）、`body.inroom`（スクロールしない）、`#roomStage` が残りの高さいっぱい、`.editing #roomPet{pointer-events:none}`、ボタンは指で押せる 44px 以上。末尾に空の `/* おみせ */` ブロックと `/* もようがえ */` ブロックを**間を 5 行以上あけて**置く（Task 13・14 はそれぞれ自分のブロックの中にだけ書く）。

- [ ] **Step 1: 失敗するテストを書く** — `tests/revert.test.js` に：`.topbtns` が `#coin`→`#zukanBtn`→`#oheyaBtn`→`#gear` の順。`app.js` の `fxBurst` の既定の対象が `isRoomOpen()` で分かれる。`index.html` の `#roomView` に `hidden` があり、`style=`・`onclick` が無い。`room-ui*.js` に `innerHTML` が無い（`textContent`・`createElement` だけ）。
- [ ] **Step 2: 失敗を確かめる** — Run: `node --test tests/revert.test.js` / Expected: FAIL
- [ ] **Step 3: 実装する**
  - `app.js`（設計書 §1.2）：`bindPet(el,hooks)`（今の `#pet` のポインター処理をくくる。`#pet` の動きは変えない）、`fxBurst` の既定の対象、`wobble` の `roomPoke`、`renderBubble` の `#roomBubbleText`・`#roomBubbleZh`、`render()` の最後で `lastSnap` と `refreshRoom(lastSnap)`、起動時に `initRoomUI(host)` と `#oheyaBtn` の `click`→`openRoom()`。
  - `room-ui.js`：設計書 §4.2 の 開く・閉じる・なでる・ゲージ・失敗時。`commit()`＝`host.save()`→`setRoom(S.room)`→`#roomCoin`・`#shopCoin` の更新。`closeRoom()` は `closeShop()`・`endEdit()` を先に呼ぶ。`#editBtn`→`startEdit(ctx)`、`#shopBtn`→`openShop(ctx)`。`openRoom` が `false`・例外・`onFail` のときは `closeRoom()`＋`host.toast('おへや を ひらけなかったよ')`。
- [ ] **Step 4: 通ることを確かめる** — Run: `node --test tests/*.test.js` / Expected: PASS。Playwright（820×1180 と 1180×820）：
  1. 起動は普段の画面、Canvas 無し、コンソールエラー 0。
  2. 「🏠 おへや」→ `#roomScene canvas` が 1 つ、部屋が `#roomStage` に収まる（スクリーンショット）、`.layout` に `inert`。
  3. `#roomPet` を タップ（あたま・おなか）・長押し（ぎゅー）・なでる（80px ドラッグ）・5 連打 → ふきだし（`#roomBubbleText`）が変わり、`.fx` が `#roomPet` の近くに出る。
  4. 「← もどる」→ `#roomScene canvas` が 0、`.layout`・`.top` に `inert` が無い、`body` に `inroom` が無い、普段の `#pet` をタップして反応する。これを 5 回くり返して同じ。
  5. 開いたまま 820×1180 ↔ 1180×820 を切り替えても部屋が収まる。
  6. 失敗の注入：`browser_evaluate` で `HTMLCanvasElement.prototype.getContext=()=>null` にしてから「🏠 おへや」→ トースト「おへや を ひらけなかったよ」、`inert` が残らない。
  7. ぷにが ラグ・家具を避けて歩き、ほんだなの後ろに回る（スクリーンショット 2 枚）。
- [ ] **Step 5: コミット** — `git add js/app.js js/room-ui*.js index.html css/style.css tests/revert.test.js && git commit -m "feat(oheya): おへやモード（別画面・見る＋なでる）"`

---

# Wave 5

### Task 13: おみせの画面 `js/room-ui-shop.js`

**Files:**
- Modify: `js/room-ui-shop.js`、`css/style.css` の `/* おみせ */` ブロックの中だけ

**Interfaces:**
- Consumes: Task 9 の `SHOP_CATS`・`shopCards`・`cardState`・`buy`、Task 3/8 の `itemSVG`・`patternSVG`、Task 12 の `RoomCtx` と `#roomShop` の枠
- Produces: `openShop(ctx)`・`closeShop()`・`isShopOpen()`（Task 12 の口のまま）

- [ ] **Step 1: 確認手順を書く**（Playwright。テストランナーの代わり。計画のこの手順で確かめる）
  - `localStorage` に `coin:100` の保存データを入れて再読み込み → おへや → 「🛒 おみせ」→ 「かぐ」に 17 枚、`べっど` は「🪙 60」で押せる、`すべりだい`（70）は押せる、`coin:50` にすると `べっど` が うすく「あと 🪙 10」で押せない（`disabled`）。
  - `ぬいぐるみ` →「これを かう？」→「かう」→「かった！ もようがえ で おいてね」、こいん 90、再読み込みしても `own.plush` が残る。「やめる」では何も変わらない。
  - 「ゆか」→ `みんといろの ゆか` を買う → 部屋の床がすぐ変わる。`はちみついろの ゆか` は「もってる」。
  - 「ひろげる」→ `もっと ひろい おへや` は「さきに ひろい おへや を かってね」。`coin:600` で `ひろい おへや` → 部屋が 8×8、家具の位置が同じ（スクリーンショット）→ 続けて 10×10。
  - 「かう」を素早く 2 回押しても 1 回分しか減らない。
  - おみせを開いたまま「← もどる」→ 普段の画面に `inert` が残らない。
- [ ] **Step 2: 手順が今は通らないことを確かめる** — Playwright で「🛒 おみせ」を押しても何も出ない（口だけ）。
- [ ] **Step 3: 実装する** — 設計書 §4.3。カードは `createElement`、絵は `<img src="data:image/svg+xml;charset=utf-8,…" alt="">`、`data-id` は読み戻したら `cardState()!==null` を確かめる。買ったら `ctx.commit()`、音は `host.sfx('chime')`。CSS は `/* おみせ */` ブロックの中だけ。
- [ ] **Step 4: 手順が通ることを確かめる** — Step 1 の手順をすべて実行（820×1180 と 1180×820）、コンソールエラー 0。`node --test tests/*.test.js` が PASS。
- [ ] **Step 5: コミット** — `git add js/room-ui-shop.js css/style.css && git commit -m "feat(oheya): おみせ（かぐ・ゆか・かべ・ひろげる）"`

### Task 14: もようがえの画面 `js/room-ui-edit.js`

**Files:**
- Modify: `js/room-ui-edit.js`、`css/style.css` の `/* もようがえ */` ブロックの中だけ

**Interfaces:**
- Consumes: Task 2 の `stock`・`place`・`move`・`rotate`・`remove`・`placeMask`・`itemAt`・`setFloor`・`setWall`・`footprint`、Task 11 の `setEdit`・`onCell`、Task 3/8 の `itemSVG`・`patternSVG`、Task 12 の `RoomCtx` と `#roomTray` の枠
- Produces: `startEdit(ctx)`・`endEdit()`・`isEditing()`（`endEdit` は `setEdit(null)`・`onCell(null)` を必ず呼ぶ）

- [ ] **Step 1: 確認手順を書く**（Playwright）
  - 初期データ → おへや → 「🛠 もようがえ」→ ふきだし「かぐ を えらんで、おきたい ます を おしてね」、トレイの「かぐ」は「もちもの は ないよ。おみせ で かえるよ」。
  - ほんだなのマスをタップ → 選ばれ（きいろの線）、みどり／あかのマスが出る（スクリーンショット）→ 空いたマスをタップ → 動く → 再読み込みしても位置が残る。
  - 「まわす」→ 向きが変わる。ふさがれていれば「ここでは まわせないよ」。「しまう」→ トレイに `×1` で戻る → トレイから選んで置く。
  - 置けないマス（はみ出す・重なる）をタップ →「そこには おけないよ」、何も変わらない。
  - ぷにのいるマスに置く → ぷにが となりの空きマスへ移る（家具に重ならない）。
  - トレイの「ゆか」「かべ」で柄を選び直せる（今の柄に印）。
  - 「おわり」→ `#roomPet` をなでられる。もようがえの途中で「← もどる」→ 次に開くと編集表示が残っていない。
- [ ] **Step 2: 手順が今は通らないことを確かめる** — 「🛠 もようがえ」を押しても何も変わらない（口だけ）。
- [ ] **Step 3: 実装する** — 設計書 §4.4 の選択の 3 通りと `onCell` の 4 つの場合をそのまま。変えるたびに `S.room` を入れ替えて `ctx.commit()`、そのあと `setEdit({mask,sel})` を出し直す。
- [ ] **Step 4: 手順が通ることを確かめる** — Step 1 をすべて実行（820×1180 と 1180×820）、コンソールエラー 0、`node --test tests/*.test.js` が PASS。
- [ ] **Step 5: コミット** — `git add js/room-ui-edit.js css/style.css && git commit -m "feat(oheya): もようがえ（タップで選んでマスをタップ）"`

### Task 15: 文書（`spec.md`・`spec-summary.md`・`g1-request.md`）

**Files:**
- Modify: `docs/spec.md`、`docs/spec-summary.md`、`docs/oheya/g1-request.md`

**Interfaces:**
- Consumes: 設計書全体（文書の内容の元）
- Produces: なし

- [ ] **Step 1: 確かめる観点を書く** — `docs/spec.md`：保存データの表に `coin`・`own`・`room`・`undo[].c`（範囲・初期値・引き継ぎ・取り消し）、おへやモード・おみせ・もようがえの節、範囲外の項目。`spec-summary.md`：一段落で おへやモードと こいん。`g1-request.md`：版を v2.6.0、見る点に「🏠 おへや」から開く・おみせ・もようがえ・こいんの増え方を足し、ホーム画面が部屋になる記述を直す。
- [ ] **Step 2: 今の文書が古いことを確かめる** — Run: `grep -n "こいん\|おへやモード" docs/spec.md docs/spec-summary.md docs/oheya/g1-request.md` / Expected: 該当なし（または段階1の記述だけ）
- [ ] **Step 3: 書く** — 設計書の値をそのまま（値段は「案」と書く）。個人情報を書かない。「コイン」ではなく「こいん」（UI の表記として）。
- [ ] **Step 4: 確かめる** — Run: `grep -n "v2.6.0" docs/oheya/g1-request.md` と `grep -c "coin" docs/spec.md` / Expected: どちらも 1 以上。`grep -n "ホーム画面そのもの" docs/` が CONCEPT の取り消し線の行だけ。
- [ ] **Step 5: コミット** — `git add docs/spec.md docs/spec-summary.md docs/oheya/g1-request.md && git commit -m "docs(oheya): 仕様書と G1 の依頼文を おへやモード・段階2に合わせる"`

---

# Wave 6：仕上げ

### Task 16: 版・オフライン・最終確認

**Files:**
- Modify: `sw.js`（`VERSION`・`ASSETS`）、`js/app.js`（`APP_VERSION` の 1 行だけ）
- Test: `tests/revert.test.js` に追記

**Interfaces:**
- Consumes: すべて
- Produces: v2.6.0

- [ ] **Step 1: 失敗するテストを書く** — `sw.js` の `VERSION` と `app.js` の `APP_VERSION` がどちらも `'v2.6.0'`。`ASSETS` が `js/*.js` の全ファイル（`readdirSync('js')`）を `./js/<名前>` で含む（新しい 10 本：`room-data`・`room-edit`・`room-shop`・`room-art-kit`・`room-art-a`・`room-art-b`・`room-art-c`・`room-ui`・`room-ui-shop`・`room-ui-edit`）。`dev/` のファイルは含まない。
- [ ] **Step 2: 失敗を確かめる** — Run: `node --test tests/revert.test.js` / Expected: FAIL（`v2.5.1`）
- [ ] **Step 3: 版を上げて `ASSETS` に足す**
- [ ] **Step 4: 最終の関門をすべて通す**
  1. `security-reviewer` サブエージェントで `git diff a900bd1..HEAD` をレビュー → 指摘を直す。
  2. `/security-review` → 指摘を直す。
  3. `for f in js/*.js dev/*.js; do node --check "$f"; done` が無言。`node --test tests/*.test.js` が全部 PASS。
  4. Playwright（`python3 -m http.server 8000` をバックグラウンド。820×1180 と 1180×820、途中で向きを変える）：設計書 §10 の 1〜11 をすべて。特に
     - 起動・エサやり・設定・保存と復元（コード表示 → リセット → 復元で こいん・家具・配置が戻る）。
     - 旧データ：v2.5.1 形式（`coin`・`own`・`room` 無し）を `localStorage` に入れて再読み込み → 育成データが同じ、こいん 0、初期の部屋。**今の育成データのバックアップコード**（オーナーから受け取る。文書・コミット・ログに書かない）でも同じ。
     - 壊したコード（`room.items` に範囲外・重なり・知らない ID）の復元で落ちない。
     - 昼・夜（設定で寝る時刻を動かす）：夜に暗くなり、ぷにが ラグで寝る。
     - 進化・おわかれのモーダルが おへやの上に出る。世代交代のあとも こいん・家具が残る。
     - `prefers-reduced-motion`（`browser_emulate_media`）、裏に回して戻る、390×844 でヘッダーがはみ出さない。
     - オフライン：Service Worker のキャッシュに新しい js がすべて入り、オフラインで おへやが開く。
     - すべての場面でコンソールエラー（特に CSP 違反）が 0。
  5. 結果を台帳に書く（実機の滑らかさ・発熱は「未確認（G1 で見る）」と書く）。
- [ ] **Step 5: コミット** — `git add sw.js js/app.js tests/revert.test.js && git commit -m "chore(oheya): v2.6.0（おへやモードと段階2）"`。プッシュしない。

### Task 17: プレビュー用ページ（非公開 Artifact）

**Files:**
- 作業用ディレクトリだけ（`<scratchpad>/preview/` にリポジトリをコピー）。**リポジトリのファイルは変えない・コミットしない。**

**Interfaces:**
- Consumes: Task 16 の `feature/oheya`
- Produces: claude.ai の非公開 Artifact の URL（オーナーへ渡す）

- [ ] **Step 1: 確かめる観点を書く** — 公開したページで：起動して普段の画面が出る、「🏠 おへや」で部屋が開く、おみせ・もようがえが動く、コンソールエラー 0、外部への通信が無い。保存はプレビューの中だけ（本番の `localStorage` と無関係）。Service Worker は登録しない。
- [ ] **Step 2: コピーを作る** — `mkdir -p <scratchpad>/preview && git -C /workspaces/PuniPuni_Project archive feature/oheya index.html css js icons manifest.webmanifest | tar -x -C <scratchpad>/preview`。コピーの `js/app.js` だけで Service Worker の登録行を外す（プレビューでは使わない）。ほかは変えない。個人情報を入れない。
- [ ] **Step 3: 公開する** — `artifact-design` スキルを読み、Artifact ツールで `index.html` を `files`（`css/`・`js/`・`icons/`・`manifest.webmanifest`）とともに公開（`icon: "home"`）。
- [ ] **Step 4: 確かめる** — 公開したページを開き、Step 1 の観点を確かめる。リポジトリで `git status` がきれい（コピー以外に変更が無い）。
- [ ] **Step 5: 報告** — URL と確かめたことを台帳とオーナーへの報告に書く（コミットなし）。

---

## 自己点検の結果（計画を書いたあと）

- 設計書の対応：§1.1→Task 10、§1.2→Task 10・12、§2→Task 1・2・4、§3→Task 4・10・12、§4.1→Task 10・12、§4.2→Task 12、§4.3→Task 13、§4.4→Task 14、§5→Task 2、§6→Task 9、§7→Task 11、§8→Task 1・5〜8、§9→各タスクの Step 1、§10→Task 12〜14・16、§11→Global Constraints・Task 16、プレビュー→Task 17。
- 名前の一致：`grantCoin`・`cleanOwn`・`cleanRoom`・`defaultRoom`・`defaultOwn`・`itemSVG`・`patternSVG`・`roomSVG(n,band,floorId,wallId)`・`setRoom`・`setEdit({mask,sel})`・`onCell`・`relocateBrain`・`RoomHost`・`RoomCtx`・`openShop`/`startEdit` は設計書と各タスクで同じ。
- `layout()` は Task 3〜8 の間は残し、Task 11 が消す（Task 8 と Task 11 は波が違うので `room-art.js` の持ち分が重ならない）。
