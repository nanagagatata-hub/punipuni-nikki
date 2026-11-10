# おへや 段階0（技術検証）＋段階1（見るだけのおへや）設計書

- 日付：2026-11-10
- 作業ブランチ：`feature/oheya`（関門 G1 が済むまで `main` に入れない・`main` へプッシュしない）
- 元の構想：`docs/oheya/CONCEPT.md`（食い違ったらこの設計書を直してから CONCEPT に反映する）
- 公開リポジトリに入る文書なので、子どものなまえ・育成データは書かない

## 0. 目的と合意したこと

### 目的
ホーム画面の背景（`#scene`）を「パステルの絵本風の洋室」のアイソメ部屋にし、主役のぷにが部屋の中で勝手に動くようにする。段階1は**見るだけ**（コイン・おみせ・模様替え・ずかんのぷにを呼ぶ は段階2以降）。その前に段階0で、今の構成（ビルドなし・依存なし・CSP `'self'`）の Canvas 2D で実機に耐えるかを確かめる。

### オーナーと決めたこと（2026-11-10）
| 項目 | 決定 |
|---|---|
| 組み込み方 | `room.js` が自分の rAF ループを持ち、`app.js` は状態を渡すだけ |
| ぷにの大きさ | **小さめ**：約 1 マス幅（論理 64px、iPad 縦で CSS 約 115px） |
| 当たり判定 | 透明な `#pet` は絵の 1.3 倍・最小 96px（CSS） |
| 固定の家具 | **4 点**：まど・ラグ・ほんだな・しょくぶつ（見せるだけ・置き換え不可） |
| ねんねの場所 | **ラグの上**。見ている間に夜になったらラグまで歩いて寝る。夜に起動したら最初からラグの上 |
| 部屋の広さ | **6×6 で始める**。ただし広さ `n` は引数にし、6/8/10 のどれでも描けるように作る（段階2で「おへやを ひろげる」をぷにコインで買う：CONCEPT §2・§5） |
| 画面 | `.screen` を 4:3 に固定し、Canvas を全面に敷く |
| 夜 | 紺色の重ねを 0.42 まで約 6 秒でなじませる。まどの空は約 3 秒でクロスフェード。明滅なし |
| 失敗時 | Canvas やぷにの画像が使えないときは、今の `sceneSVG`＋`#pet` の SVG 表示に戻す |
| ぷにの向き | **B：2.5D**（2026-11-10、段階0.5の試作 `dev/turn-spike.*` を見てオーナー決定）。体の輪郭はそのまま、顔などを丸い体の表面で回し、横顔・後ろ姿も出す。進む方へ毎秒 360° でなめらかに向きを変える。§3.7 |
| 絵の変換 | 段階0で発見：`petSVG` は `xmlns` が無く、10 種類の顔で属性が重複していて、そのままでは `data:` 画像にできない。**`room.js` で HTML として読んで XML に書き出してから画像にする（案 A）**。既存の `faceSVG` の重複は直さない |
| シークレットのにじ色 | CSS で色が回る演出は `data:` 画像の中では動かないので、部屋の中では止まった にじ色にする（今のホーム以外の画面は今のまま） |
| VERSION | 段階0は `dev/`・`docs/` だけなので上げない（CLAUDE.md 補足）。段階1で `v2.5.0` に上げる |

### 範囲外（まだやらない）
コイン、おみせ、家具の配置と模様替え、部屋を広げる操作、ずかんのぷにを呼ぶ、家具を使う行動、部屋の回転、ランプの明かり、保存形式の変更、ライブラリの追加、`package.json` の作成。

### 確認済みの前提
- `node --test` は `package.json` なしで `js/*.js`（ES モジュール）を import できる（Node v24.21.0、警告なし。2026-11-10 にスクラッチで確認）。
- 参照元は `/refs/oekaki`（b1611f5）、`/refs/odori`（9cef958）、`/refs/orbit`（f2a74b1）に読み取り専用でマウント済み。

---

## 1. 段階0：技術検証（`dev/` の使い捨て試作）

### 1.1 ファイル
- `dev/room-spike.html`：CSP は `index.html` と同じ（`img-src 'self' data:` を含む・`'self'` 以外を足さない）。ホーム画面に追加して試せるよう、`apple-mobile-web-app-capable` 等の meta を付ける。`<script type="module" src="./room-spike.js">` のみ（インライン script・`style=""` なし）。
- `dev/room-spike.js`：`../js/art.js` の `petSVG` を import して使う。
- アプリからリンクしない。`sw.js` の `ASSETS` に入れない。`dev/` を `main` に入れるか（GitHub Pages に公開される）は G1 のときに決める。

### 1.2 試作の中身
- 6×6 の床（2:1 アイソメ・単色の板）を描く。
- ぷに N 匹：`petSVG(form, face, opt)` → `'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)` → `Image` を `Map` にキャッシュ。形と顔を変えてキャッシュの数も試す。動きは単純なランダム歩き（本番の AI ではない）。
- 家具のダミー F 個：面ごとに明暗をつけた SVG の箱を同じく `data:` 画像にして置く。
- ぷにと箱を足もとの `(gx+gy)` 順に描く（深度ソート）。
- URL で条件を変える：`?n=1|6`（匹数）、`f=0|30`（家具）、`fps=30|60`（上限）、`dpr=1|2`（解像度の上限）。

### 1.3 画面に出す記録（テキスト。DOM は `textContent` のみ）
- fps、フレーム時間の平均と p95（`performance.now()`）
- 画像の読み込み 成功／失敗 の数
- `securitypolicyviolation` の数
- `visibilitychange`・`pageshow`・`pagehide`・`resize`、Canvas の `contextlost`／`contextrestored` の時刻つき記録
- 前面に戻ったときの描き直し回数（戻ったら背景キャッシュと画像の `complete` を確かめ、必要なら作り直す）

### 1.4 確かめ方
| 項目 | コンテナ（Playwright MCP） | iPad（オーナー） |
|---|---|---|
| `data:` 画像が CSP を通るか | 違反 0・全画像 `naturalWidth>0` を確認 | 画面の記録で確認 |
| 6 匹＋家具 30 の負荷 | n=6・f=30 のフレーム時間を記録。**ヘッドレス Chromium の参考値であり iPad の値ではない**と明記 | 30fps を保てるか・p95・約 10 分の発熱 |
| ホーム画面に追加／裏から戻る | 記録の流れだけ（本物の裏回りはできない） | 追加して起動 → ホームに戻る → 数分後に戻る → 描画が残るか |

### 1.5 成果物と止まる場所
- `docs/oheya/stage0-results.md`：コンテナの結果、iPad で記入する表、判断の目安。
- **iPad で見る手順の依頼文**（オーナーに渡す）：Mac のリポジトリ直下で `python3 -m http.server 8000`（devcontainer の外）→ 同じ Wi-Fi の iPad Safari で `http://<MacのIP>:8000/dev/room-spike.html?n=6&f=30` → 条件を変えて約 10 分 → ホーム画面に追加 → 裏から戻す → 表に記入。Service Worker は https のみなので、オフラインは確認しない。
- 判断の目安（案）：n=6・f=30 で 30fps を保ち p95 ≦ 20ms、10 分で目立つ発熱なし、戻ったあとも描画が消えない。**判断はオーナーが行う。**
- **段階0のコミット後、結果を報告して止まる。段階1には進まない。**

---

## 2. 段階1：構成と境界

### 2.1 ファイル
| ファイル | 役目 | DOM |
|---|---|---|
| `js/room-ai.js`（新規） | ぷにの行動の状態機械、BFS の経路探索、つぶれて伸びる動きの計算、`mulberry32`。共有する JSDoc の型もここに置く | 触れない |
| `js/room.js`（新規） | Canvas の用意、rAF（約 30fps）、投影、深度ソート、背景のオフスクリーンキャッシュ、ぷにの絵のキャッシュ、夜の暗さ、`#pet` の位置合わせ、裏に回ったら止める。投影・ソート・暗さ・倍率は純関数で export | `mount()` 以降だけ |
| `js/room-art.js`（新規） | 床・壁・まど（中は時間帯の空）・ラグ・ほんだな・しょくぶつの SVG 文字列と、固定の配置 `layout(n)` | 触れない |
| `js/art.js`（変更） | 時間帯の空の色表 `SCENE` を export（まどの中の空に使う）。`petSVG` に向き `yaw`（度）のオプションを足す（§3.7）。**`yaw` を渡さないときの出力は今と 1 文字も変えない**（回帰テストで固定）。そのために 34 姿のかざり（`accSVG`）を「頭の上」「顔の表面」「まわりに浮く」に分けて持つ | 触れない |
| `js/app.js`（変更） | `room.mount()`、`render()` から `room.update()`、タッチで `room.hold()`、`wobble()` を `room.poke()` に。失敗したら今の表示 | — |
| `css/style.css`（変更） | `.screen` を 4:3、Canvas を全面、`.pet` を `position:absolute` の透明ボタンに（おへや表示のときだけ。クラス `.screen.room` で切り替え） | — |
| `sw.js` | `ASSETS` に `./js/room.js`・`./js/room-ai.js`・`./js/room-art.js` を足し、`VERSION` を `v2.5.0` | — |

### 2.2 共有する型（`js/room-ai.js` に JSDoc で定義し、最初に確定させる）
```js
/** @typedef {() => number} Random  0以上1未満 */
/** @typedef {{n:number, block:Uint8Array}} Grid  block[gy*n+gx]=1 は通れない */
/** @typedef {'egg'|'sleep'|'sick'|'dance'|'hungry'|'awake'} Mode */
/** @typedef {'asa'|'hiru'|'yuu'|'yoru'} Band */
/** @typedef {'idle'|'walk'|'look'|'hop'|'dance'|'sleep'|'rest'|'sad'} Act */
/** @typedef {{x:number, y:number, act:Act, t:number, dur:number,
 *   path:{x:number,y:number}[], yaw:number, want:number, hold:number, held:boolean, n:number}} Brain
 *   x,y は足もとのマス座標（マスの中心は i+0.5）。yaw は今の向き・want は向きたい向き（度。0 が正面、+ で見ている人から見て右、±180 が後ろ）。
 *   hold はタッチ後に止まっている残り秒 */
/** @typedef {{mode:Mode, band:Band, reduced:boolean, home:{x:number,y:number}}} BrainCtx  home はねんねのマス（3.1） */
/** @typedef {{scaleX:number, scaleY:number, lift:number, tilt:number, yaw:number}} Motion  yaw は絵を選ぶ向き（度。spin のときは一回転を足す） */
/** @typedef {{form:string, face:string, arms:string, think:string|null, pose:string,
 *   shiny:boolean, final:boolean, pts:number}} PetView  look() と S から作る、絵のキーになる値 */
```

### 2.3 関数（公開するもの）
`js/room-ai.js`
- `mulberry32(seed) → Random`、`between(rng,min,max)`
- `makeGrid(n, blocked:{x,y}[]) → Grid`
- `bfs(grid, from, to) → {x,y}[] | null`（4 方向・マス単位。from/to を含む）
- `createBrain(n, ctx) → Brain`（`sleep`／`egg` のときは最初から `home`）
- `stepBrain(brain, dt, ctx, grid, rng) → void`（`dt` は 0.1 秒で切り詰め）
- `holdBrain(brain, on:boolean) → void`（離したときに `hold=3`）、`pauseBrain(brain, sec) → void`（エサのあと）
- `motion(brain, timeSec, pose, pokeAge?) → Motion`
- `dirYaw(dx, dy) → number`（マス目の移動の向き → 向き。`+gx` は 45、`+gy` は -45、`-gx` は -135、`-gy` は 135）、`turnToward(cur, want, dt, rate=360) → number`（いちばん近い回り方で近づける）、`normDeg(d) → -180〜180`

`js/room.js`
- 純関数：`toScreen(gx,gy,n) → {x,y}`、`fromScreen(x,y,n) → {gx,gy}`、`sortByDepth(list)`、`approach(cur, target, dt, tau)`（暗さを近づける）、`fitScale(w,h,n)`、`petBox(cx, bottom, sprite, boxW, boxH)`（`#pet` の位置と大きさ。最小 96px・`.screen` の中に収める）、`SpriteCache`（最大 120 件・読み込み中は前の絵）、`yawBucket(deg, n=24) → number`（15° ごとに丸める）
- DOM：`mount(sceneEl, petBtn, opt) → boolean`（失敗で `false`）、`update({view, mode, band, now})`、`hold(on)`、`poke()`、`pauseFor(sec)`、`unmount()`

`js/room-art.js`
- `roomSVG(n, band)`（床・壁 2 面・まど（空）・カーテン・ラグをまとめた背景 1 枚）、`itemSVG(id)`（`shelf`／`plant`。足もとの基準点つき）
- `layout(n) → {items, rug, home, window}`（細かい形は実装計画 Task 6）

### 2.4 `app.js` とのつなぎ
- 起動時：`#scene` の中に Canvas を作る（`room.mount`）。`true` なら `.screen` に `room` クラスを付け、`#pet` には SVG を入れない（`aria-label` は残す）。`false` なら今のまま（`sceneSVG`＋`#pet` の SVG）。
- `render()`：`room.update({view, mode, band: band(new Date(), S.cfg), now})`。`view` は今の `look()` の結果と `S` から作る。
- `mode` の決め方（上から順に）：`S.stage===0`→`egg`／`sleeping`→`sleep`／`S.sick`→`sick`／`now<danceUntil`→`dance`／`S.hunger===0`→`hungry`／それ以外→`awake`。
- `#pet` の `pointerdown` で `room.hold(true)`、`pointerup`／`pointercancel` で `room.hold(false)`。`feed()` で `room.pauseFor(3)`。`wobble()` は `room.poke()`（Canvas 上で小さくつぶれる）。
- `fxBurst`・`flyFood` は今も `#pet` の矩形を使うので、変えずに動く（`#pet` がぷにを追いかけるため）。
- 保存データには触らない。保存形式は変えない。

---

## 3. 画面と見た目（`room.js`・`room-art.js`）

### 3.1 投影と配置
- 2:1 アイソメ、マス 64×32（論理 px）。`sx=(gx-gy)*32`、`sy=(gx+gy)*16`。マス (0,0) がいちばん奥。
- 奥の壁 2 面：右奥（`gy=0` の辺）と左奥（`gx=0` の辺）。高さ約 112 論理px。
- 固定の家具（`layout(n)`。位置は `n` に対して決める）
  - まど：右奥の壁の中央。中は時間帯の空（`SCENE` の色）、両わきにカーテン
  - ほんだな：左奥の壁ぎわ、足もと 1×2（`(0, ⌊n/2⌋-1)`〜`(0, ⌊n/2⌋)`）、通れない
  - しょくぶつ：右奥のすみ `(n-1, 0)`、通れない
  - ラグ：真ん中の 2×2（`n/2-1`〜`n/2`）、通れる。床と一緒に背景キャッシュに描く。`home`＝マス `(n/2, n/2)`（ラグの手前側のマス。BFS の目的地にするためマス単位で決める。`n` は 6・8・10 の偶数のみ）
- 部屋全体（6×6 で約 420×330 論理px）が収まる倍率 × `devicePixelRatio`（上限 2）で描く。`ResizeObserver` で描き直す。Canvas の幅・高さは JS から設定。

### 3.2 色（パステルの絵本風の洋室）
床ははちみつクリーム色の板張り（細い板の線）。壁はうすいピンクに小さな水玉、幅木はミント。ラグはラベンダーでふちがスカラップ。ほんだなは上が丸いクリーム＋ミントに色とりどりの本。しょくぶつはピンクの鉢に丸い葉。家具は「上の面が明るい・左の面がふつう・右の面が暗い」の 3 段で立体に見せる。線は `art.js` と同じく太めのやわらかい色。オリジナルデザインのみ。

### 3.3 描く順番
背景キャッシュ（床・壁・まど・ラグ）→ 物（ほんだな・しょくぶつ・ぷにと影）を足もとの `(gx+gy)` の小さい順（同じなら `gx` の小さい順）→ 夜の暗さの重ね。ゲージ・バッジ・成長バーは DOM のまま上に重なる（暗くならない）。

### 3.4 ぷにの絵
`petSVG(form, face, {pts, shiny, final, arms, think, yaw})` → HTML として読んで XML に書き出す（`DOMParser` `text/html` → `XMLSerializer`。結果が空なら使わない）→ `data:` 画像 → `Image`。キーは `form|face|arms|think|shiny|final|stage|yawBucket`（たまごは `pts>=2` のひび。たまごは向きを変えない）。キャッシュは最大 120 件で古いものから捨てる。読み込みが終わるまでは前に読めた絵を描く（向きを変えている途中で消えないように。段階0.5で確認）。読み込みに失敗したら `mount` の逃げ道と同じく今の表示に戻す。左右反転は使わない（向きは §3.7）。

### 3.5 夜と時間帯の変わり目（明滅なし）
- 暗さの目標：あさ 0、ひる 0、ゆうがた 0.10、よる 0.42（紺色 `#1E2350` を重ねる）。`approach()` で時定数約 2 秒の指数的な近づけ（約 6 秒でなじむ・行き過ぎない）。
- まどの空：時間帯が変わったら、古い背景と新しい背景を約 3 秒でクロスフェード。
- 起動時は最初から目標の暗さ（演出なし）。

### 3.6 更新とお休み
- rAF で、約 33ms ごとに 1 回だけ描く（30fps 目安）。
- `document.hidden` の間は止める。戻ったら `dt` を 0 から数え直し、背景キャッシュと画像を確かめて必要なら作り直す（段階0の結果を反映）。
- ねんね中は描画を 10fps に落とす（呼吸だけなので）。
- `prefers-reduced-motion` のときは `reduced:true`。

### 3.7 ぷにの向き（2.5D）
段階0.5の試作 `dev/turn-spike.js` の `petSVG25` を元にする（4 姿で確認済み）。`yaw` を θ（度）として、200×200 の絵の中心 `x=100` の縦の軸のまわりに回す。
- 表面の点の回し方：正面図で中心からのずれ `u`、半径 `R` の点を `φ=asin(u/R)+θ` に移し、`x=100+R·sinφ`、横幅を `cosφ` 倍にする。`cosφ` が小さい（裏に回った）部品は描かない。
| 部品 | 扱い |
|---|---|
| 体の輪郭・足 | 輪郭はそのまま。足は半径 34 で回し、いつも体のうしろ |
| 耳 | 半径 48 で回し、いつも体のうしろ。内側のピンクは前を向いているときだけ（横幅 `cos` 倍） |
| 腕 | 体の左右の端に置いたまま回さない（手前に回すと、おなかの前に輪が出て穴のように見えたため） |
| 顔（目・口・ほっぺ・顔の `extra`）・おなかの白・顔の表面のかざり（めがね・おなかの模様など） | 半径 62 で回す（体の輪郭 約 75 より小さくして、横を向いても輪郭の内側に残す） |
| 頭の上のかざり（ぼうし・かんむり・葉・ほし など）・`puni` の毛 | 中心のまま横幅を `0.55+0.45·|cosθ|` 倍。中心から外れた部分（はかせのふさ等）は半径 44 で回す |
| まわりに浮くもの（しゃぼん・きらきら・湯気・`think`・`final` のオーラ・`shiny` のきらきら） | 回さない |
- 後ろ姿（|θ|>90°）は顔が隠れ、つるんとした背中になる（しっぽ等は足さない。G1 で子どもの反応を見て決める）。
- 34 姿のかざりの分類は実装計画 Task 6b の表で決める。分類しにくいかざりは「頭の上」として扱い、見た目を Playwright のスクリーンショット（0°・45°・90°・135°・180°）で確かめる。
- 方向は 24（15° ごと）にまとめて絵をキャッシュする。

---

## 4. 主役のぷにの行動（`room-ai.js`）

### 4.1 mode ごとのふるまい
| mode | ふるまい |
|---|---|
| `egg` | `home` で動かない（呼吸だけ） |
| `sleep` | `home` まで BFS で歩き、着いたら `sleep`。起動時に `sleep` なら最初から `home` |
| `sick` | 次のマスの中心で止まり `rest`（しおれる動き） |
| `dance` | その場で `dance` |
| `hungry` | 立ち止まって正面を向き `sad` |
| `awake` | 4.2 から重みつきで選ぶ |

### 4.2 起きているときの行動
| 行動 | 重み | 長さ・動き |
|---|---|---|
| たちどまり `idle` | 35 | 3〜6 秒 |
| あるく `walk` | 30 | 2 マス以上離れた通れるマスを選んで BFS。1.2 マス/秒。マスの間は直線で補間 |
| きょろきょろ `look` | 15 | 約 2 秒、向きを 2〜3 回かえる |
| ぴょん `hop` | 10 | 1〜2 回（1 回 0.6 秒） |
| ダンス `dance` | 10 | 約 3 秒 |

- 時間帯の倍率：あさは `look`×1.5、ひるは `walk`・`hop`×1.3、ゆうがたは `idle`×1.5。
- `reduced`：`hop`・`dance` の重み 0、歩く速さ 0.6 倍、`idle` を 1.5 倍の長さ。
- 行き先が無い（BFS が `null`）ときは `idle`。部屋の外・通れないマスには出ない。
- 向き：歩くときは `want=dirYaw(進む向き)`。毎フレーム `yaw=turnToward(yaw, want, dt)`（毎秒 360°）。`|want-yaw|>60°` の間は歩き出さず、ほぼ向き終わってから進む。たちどまり・`held`・`hungry`・`sad`・`sleep`・`egg`・`dance` の間は `want=0`（正面）。`look` は `want` を -50 と +50 に 0.6〜0.8 秒ごとに切り替える。

### 4.3 さわっている間は逃げない
`held` の間は動かず正面を向く。離したら `hold=3` 秒止まる。エサのあとも `pauseFor(3)`。歩いている途中なら、今いる位置で止まる（次に動くときに最寄りのマスの中心から経路を引き直す）。

### 4.4 見た目の動き（`motion`）
odori `puppet-motion.ts` の考え方を移植（拍ではなく秒で動かす・横×縦＝1 を保つ）。
- 呼吸 ±2%・4 秒周期、ねんね ±3%・5 秒周期
- あるく：1 マスごとに小さくつぶれて弾む（lift 0.04）
- ぴょん：lift 0.35 の放物線、跳んでいる間 縦に 6% 伸びる
- ダンス：tilt 0.08 ラジアンの揺れ＋拍ごとに弾む
- `poke()`：0.5 秒の小さなつぶれ
- たちどまり中は `look()` の `pose` を数値に置き換える：`bob`（上下）、`sway`（tilt 揺れ）、`droop`（縦 0.96 でゆっくり）、`bounce`（小さく弾む）、`tilt`（傾けて止まる）、`squish`（2 回つぶれる）、`spin`（その場で 1 回転：`Motion.yaw` に 0.8 秒で 360° を足す）、`none`（呼吸のみ）

### 4.5 出所の記録（各ファイルの冒頭に書く）
- `mulberry32`・`between`：oekaki `src/tank/random.ts`（b1611f5）からほぼそのまま。TS の型を JSDoc に変更。
- 「ときどき止まる」「夜は決まった場所へ集まって眠る」：oekaki `src/tank/walk.ts`・`sleep.ts`（b1611f5）の考え方。1 次元の歩きから、マス目＋BFS（新規）に変更。
- `motion`：odori `src/core/puppet-motion.ts`（9cef958）。拍を秒に変え、mode を増やした。
- `petSVG` の向き（2.5D）：段階0.5の試作 `dev/turn-spike.js`（このリポジトリ）の `petSVG25`。
- orbit `src/render/camera.ts`（f2a74b1）は Three.js 前提のため段階1では使わない（段階4の回転で参照）。

---

## 5. テスト（`node --test tests/*.test.js`、Node 標準のみ・`package.json` なし）

- `tests/room-ai.test.js`
  - `bfs`：最短経路、家具を避ける、行き止まりで `null`、n=6・8・10
  - 乱数を固定した行動の選び方、時間帯の倍率
  - `sleep` で `home` に着いて寝る、起動時 `sleep` なら最初から `home`
  - `egg` は動かない、`sick` は止まる、`hungry` は `sad`
  - `reduced` で `hop`・`dance` が出ない
  - `held` の間と離して 3 秒は動かない
  - 長い時間（例：1 万歩）回しても止まりきらず、範囲の外・通れないマスに出ない
  - `motion` の `scaleX*scaleY≈1`
  - 向き：`dirYaw` の 4 方向、`turnToward` はいちばん近い回り方で行き過ぎない（170°→-170° は 20° の回転）、大きく向きを変える間は進まない、たちどまりで正面に戻る、`dt=0`・目的地にいるときに NaN を出さない（段階0で見つけた不具合）
- `tests/art.test.js`
  - **回帰**：`yaw` を渡さないときの `petSVG` の出力が、変更前（v2.4.0）と全姿 × 全顔 × オプションの組み合わせで同じ（変更前の出力の SHA-256 を `tests/fixtures/petsvg-v2.4.0.json` に保存して比べる）
  - `yaw` を 15° ごとに回した出力に、同じ要素の中で重複する属性が無い・`http`・`<script`・`on…=` を含まない
  - `yaw=0` と `yaw` なしで、顔の部品の位置が同じ
  - 後ろ（180°）では目の部品が出ない、`shabon` の泡は回しても位置が変わらない
- `tests/room.test.js`：`toScreen`／`fromScreen` の往復、`sortByDepth` の順、`approach` が単調で行き過ぎない、`fitScale` が収まる倍率を返す、`yawBucket` が 15° ごと・-180 と 180 を同じに扱う
- `tests/room-art.test.js`：各 SVG が `<svg` で始まり、`http`・`<script`・`on…=` を含まない。`layout(n)` の足もとが n=6・8・10 で範囲内・重ならない、`home` が通れる
- 構文チェック：`for f in js/*.js dev/*.js; do node --check "$f"; done`

## 6. 動作確認（Playwright MCP、`http://localhost:8000` のみ）
- 起動、エサやり（報告 → トレイ → ぷにに飛ぶ）、設定（⚙️ の長押し）、保存と復元（バックアップコードの出力 → 入力）
- 昼と夜：`page.clock` で時刻を固定して切り替え、まどの空と暗さを確認
- ぷにが歩く：`#pet` の位置を約 30 秒あけて比べる。タッチ中は動かない
- 向き：34 姿 × 0°・45°・90°・135°・180° の一覧画像をスクリーンショットで確かめる（かざりが不自然に浮く・ちぎれる姿が無いか）。ホーム以外の画面（ずかん・進化）の絵が今と同じ
- コンソールエラー・CSP 違反がない
- 820×1180（縦）と 1180×820（横）で崩れない（スクリーンショット）
- 今の育成データ：おとな・病気・ねんね中の v2 データを `localStorage` に入れて起動。v1 からの移行もそのまま動く
- 逃げ道：初期化スクリプトで `getContext` が `null` を返すようにして、今の表示に戻る
- 実機（iPad）の滑らかさ・発熱はコンテナでは測れない。測れたふりをせず、段階1の終わりにも iPad で見る手順の依頼文を渡す（G1 用）

## 7. ワークフローとコミット（すべて `feature/oheya`）
1. `docs/oheya/` とこの設計書をコミット（`docs/superpowers/specs/2026-11-07-oseva-station-design.md` と `.devcontainer/devcontainer.json` の変更は含めない）。
2. 段階0：実装 → `security-reviewer` → `/security-review` → 構文チェック＋Playwright → コミット → **結果と依頼文を報告して止まる**。
3. 段階1（オーナーの判断のあと）：
   - 先に 2.2 の型と 2.3 の関数の形を `room-ai.js` に確定させる。
   - 並行はサブエージェント同時 4 本まで（実装 3＋レビュー 1。2026-11-10 オーナー決定。`security-reviewer`・`/security-review` は数えない）：①`room-ai.js`＋テスト、②`art.js` の向き（2.5D）＋テスト、③`room-art.js`＋テスト、④`room.js` の純関数＋テスト（実装は同時 3 本までなので、先に終わった流れが ④ を受け持つ）。`room.js` の描画と `app.js`・`css` の組み込みは本体で行う。
   - 実装 → `security-reviewer` → `/security-review` → 構文チェック・テスト＋Playwright → `ASSETS` に 3 本を足し `VERSION`／`APP_VERSION` を `v2.5.0` → コミット。
4. `main` には入れない・`main` へプッシュしない。G1 で、段階2に進むか TS＋Vite に移行するか、`dev/` を残すかを決める。
5. 仕様が変わる部分（ホーム画面がおへやになる）は、段階1のコミットで `docs/spec.md` と `docs/spec-summary.md` に反映する。

## 8. セキュリティと約束の確認
- Canvas に描く `data:` 画像は、コード内の固定の SVG と `petSVG` からだけ作る。`petSVG` にはなまえ・よびかた等の入力値が入らない。
- CSP は変えない（`img-src 'self' data:` は既存）。外部通信・CDN・フォントを足さない。
- インライン script・`style=""`・`onclick=""` を書かない。大きさ・位置は `el.style.x` で設定。
- 段階0の記録表示は `textContent` のみ。
- キャラは死なない・罰なし（病気・空腹は今の仕組みのまま、部屋では休む・しょんぼりするだけ）。UI 文言は増やさない（増やすならひらがな）。

## 9. リスクと未決
- iPad の描画負荷・発熱・ホーム画面追加時の挙動は、段階0の実機結果でしか判断できない。結果次第では「ぷにの絵を事前に ImageBitmap にする」「背景を 1 枚の画像に固める」「dpr を 1.5 に下げる」などで調整する。
- 4:3 にすると縦向きでホーム画面が今より縦に長くなる可能性がある。820×1180 で、トレイとふきだしが画面内に収まるかを確認し、はみ出す場合は 16:11 などに調整する。
- `fromScreen` は段階1ではテストのためだけに使う（家具の配置は段階2）。
- 2.5D の向きは 4 姿でしか確かめていない。34 姿のかざりで見た目が崩れるものがあれば、その姿だけ「頭の上」扱いにするなど個別に調整する。
- 向きごとに絵を作るので、作る絵の数が増える（1 姿・1 顔で最大 24 枚）。iPad での絵を作る時間と記憶の量は G1 で見る。
