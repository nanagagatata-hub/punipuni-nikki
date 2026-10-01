# ぷにちゃんアップデート（v2） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ぷにぷに にっき を v2 にする。姿 19 種、さいごのすがた とおわかれ、新しいタスク 3 つ、ねんね 20 時、表情とタッチ、音、セリフ、パステル配色、設定の追加。

**Architecture:** `js/app.js` を ES モジュールに分ける。データ（`data.js`）、純粋なルール（`rules.js`）、保存形式（`state.js`）、絵（`art.js`）、音（`sound.js`）、画面と操作（`app.js`）。`rules.js` と `state.js` は DOM に触れないので、ブラウザ上で `import()` して検証できる。

**Tech Stack:** 素の HTML/CSS/JS（ES2020 モジュール）、SVG、Web Audio API、Web Speech API、Service Worker。ビルドなし・依存なし。

**Spec:** `docs/superpowers/specs/2026-10-01-punichan-update-design.md`（各タスクは該当する § 番号を参照する。値は spec が正）

## Global Constraints
- 静的サイトのみ。`package.json`・npm 依存・ビルド工程・テストランナーを追加しない（CLAUDE.md 約束 1、superpowers 運用ルール）。
- 外部通信なし。CSP（`index.html` の meta）を変えない。`'self'` 以外を足さない。
- インライン `<script>`・`style=""`・`onclick=""` を書かない。幅などは JS で `el.style.x`。
- 利用者入力（`name`・`you`・`history[].n`）を `innerHTML` に入れる時は必ず `esc()`。セリフの `{you}` 置換結果は `textContent` で出す。
- 保存データ・復元コードは必ず `sanitize()` を通す。キーを足したら `DEF()` と `sanitize()` の両方に足す。
- UI 文言はひらがなのみ（設定画面は漢字可）。数字は可。
- キャラは死なない。罰ではなく「お世話で回復」。
- オリジナルデザインのみ。
- 最後に `sw.js` の `VERSION = 'v2.0.0'`、`app.js` の `APP_VERSION = 'v2.0.0'`。
- 「テスト」は、CLAUDE.md の superpowers 運用ルールに従い Playwright MCP で行う。純粋関数は `browser_evaluate` で `await import('/js/rules.js?t='+Date.now())` して `console.assert` 相当の真偽配列を返し、すべて `true` であることを見る。画面は `browser_snapshot`／`browser_take_screenshot`、時刻は `browser_run_code_unsafe` の `page.clock`。
- 各タスクの終わりに `for f in js/*.js; do node --check "$f"; done` とコンソールエラー確認（`browser_console_messages`）を行う。
- サーバー：`python3 -m http.server 8000`（バックグラウンド）。対象は `http://localhost:8000` のみ。
- Service Worker のキャッシュが検証を邪魔するので、検証中は `browser_navigate` 前に `page.context().clearCookies()` ではなく、`navigator.serviceWorker.getRegistrations()` で unregister し `caches` を削除してから再読込する（`browser_evaluate`）。

## Review Focus
1. v1 の実データ（病気中・おとな・エサ在庫あり・`lessonDay`=3）を v2 で開くと、状態を保ったまま移行される（`lessonDays:[3]`、おとなは `adultAt`=読み込み時刻）。→ Task 2 のテスト `migrateV1Adult`。
2. 数日ぶりに開いた時：おとなのまま期日を過ぎていても、まず さいごのすがた を見せ、おわかれはその翌朝以降。いきなりおわかれにならない。→ Task 5 のテスト `longAbsence`。
3. 夜（20:00 以降）に開いた時：エサは減らない・なでても起きない・さいごのすがた への変化や おわかれは起きない。→ Task 3・Task 5 のテスト。
4. iPad で最初のタッチ前に音を鳴らそうとしても例外にならず、音オフ時は読み上げも鳴らない。→ Task 7 のテスト `soundOff`。
5. 改行・`<script>`・9 文字以上を含む なまえ／よびかた、改ざんした `history` を含む復元コードを入れても、表示が崩れず実行されない。→ Task 2 のテスト `hostileRestore` と Task 10 の画面確認。

---

## File Structure
| ファイル | 責務 |
|---|---|
| `js/data.js`（新規） | `TASKS`・`FOODS`・`PARAMS`・`FORMS`・`ZORDER`・`ADULT_IDS`・`WORDS`・`PHRASES`・`LINES` |
| `js/rules.js`（新規） | 時間帯・タスク受付・時間経過・分岐・期日・表情の決定（純粋関数、`data.js` のみ import） |
| `js/state.js`（新規） | `KEY`・`DEF`・`sanitize`・`encodeState`・`decodeState`（`data.js` のみ import） |
| `js/art.js`（新規） | SVG 生成（`data.js` のみ import） |
| `js/sound.js`（新規） | 効果音・鳴き声・読み上げ（import なし） |
| `js/app.js`（全面改修） | 状態の保持・保存・描画・イベント・モーダル・おわかれ |
| `index.html` | `type="module"`、`#nextEggBtn` 削除 |
| `css/style.css` | パステル配色、時間帯背景、ポーズのアニメーション |
| `sw.js` | `ASSETS` 追加、`VERSION` |
| `docs/spec.md`・`docs/spec-summary.md`・`CLAUDE.md` | v2 に合わせて更新 |

---

### Task 1: モジュール分割（挙動は v1 のまま）

**Files:**
- Create: `js/data.js`, `js/rules.js`, `js/state.js`, `js/art.js`, `js/sound.js`
- Modify: `js/app.js`（全体）, `index.html:17`, `sw.js:6-9`

**Interfaces:**
- Produces（v1 相当、後続タスクで拡張）：
  - `data.js`: `export const TASKS, FOODS, PARAMS, FORMS, ZORDER, WORDS`、`export const H = 3600e3`、`export const TH = [0,3,10,25]`、`export const STAGE`、`export const WD`
  - `rules.js`: `export function isNight(d: Date): boolean`、`export function awakeMs(from: number, to: number): number`、`export function dayKey(d: Date): string`、`export function nextForm(S): string`
  - `state.js`: `export const KEY = 'punipuni-nikki-v1'`、`export function DEF(): State`、`export function sanitize(o: unknown): State`、`export function encodeState(S): string`、`export function decodeState(code: string): State`
  - `art.js`: `export function petSVG(form: string, face: string, opt?: {pts?: number, sil?: boolean}): string`
  - `sound.js`: `export function speak(text: string, lang: 'ja-JP'|'zh-CN'): void`
  - `app.js`: `const esc`、`let S`、`save()`、`render()`、`say(ja, zh)` はモジュール内に残す（export しない）

- [ ] **Step 1: 確認手順を書く（v1 の挙動の基準）。** v1 を `http://localhost:8000` で開き、エサやり 1 回・タスク報告 1 回・ずかん・設定（コード表示）を操作したスナップショットを取る。
- [ ] **Step 2: ファイルを分割する。** v1 のコードを上の Produces どおり移す。`app.js` の先頭で import。IIFE と `'use strict'` は外す（モジュールは常に strict）。`index.html` を `<script type="module" src="./js/app.js"></script>` に変える。`defer` は不要。`sw.js` の `ASSETS` に `./js/data.js`, `./js/rules.js`, `./js/state.js`, `./js/art.js`, `./js/sound.js` を追加する。
- [ ] **Step 3: 検証する。** `for f in js/*.js; do node --check "$f"; done` がすべて成功すること。Step 1 と同じ操作をして、同じ結果になること。CSP エラーを含め、コンソールエラーがないこと。`browser_evaluate` で `(await import('/js/rules.js')).isNight(new Date(2026,0,1,22))===true` になること。
- [ ] **Step 4: コミットする。** `refactor: app.js を ES モジュールに分割`

---

### Task 2: 保存形式 v2 と移行（spec §10）

**Files:**
- Modify: `js/state.js`, `js/data.js`（新しいエサ・タスク・姿の ID を先に追加。絵とセリフは後のタスク）

**Interfaces:**
- Consumes: `FORMS`（各要素に `stage: 1|2|3`）、`FOODS`、`ZORDER`、`ADULT_IDS`
- Produces:
  - `State` に spec §10 のキーをすべて持たせる（`v:2`, `you`, `shiny`, `zeroAcc`, `adultAt`, `finalAt`, `finalSeenAt`, `lessonDays`, `shinySeen`, `history`, `sound`）。`lastCare`・`lessonDay` は持たない。
  - `encodeState(S)` は `'PUNI2:'+base64` を返す。`decodeState(code)` は `PUNI1:`/`PUNI2:` を受け、40000 文字を超えるものは拒否する。
  - `data.js`: `FOODS` に `cookie`（ぴかぴかくっきー 🍪、pt2、ki、amt2）、`milk`（ほっとみるく 🥛、pt1、ho、amt1）、`pan`（おひさまぱん 🍞、pt2、ge、amt2）を追加する。`TASKS` に `katazuke`→cookie（limit1）、`hayane`→milk（limit1）、`hayaoki`→pan（limit1）を追加する。`FORMS` には spec §4.3 の 19 種の ID・`name`・`stage`・`hint`・`color`・`dark` を入れる。`ZORDER` はあかちゃん 4、こども 4、おとな 11 の順にする。`ADULT_IDS` はおとな 11 種の ID。

- [ ] **Step 1: 確認スクリプトを書く**（`browser_evaluate`。結果の配列がすべて `true` なら合格）

```js
const st = await import('/js/state.js?t='+Date.now());
const v1 = {v:1,name:'たろう',gen:3,stage:3,form:'kirara',pts:40,p:{ka:5,ki:20,ge:3,ho:2},hunger:1,mood:0,hAcc:0,mAcc:0,sick:true,cure:1,lastCare:1,lastTick:Date.now(),inv:{ame:4},day:'',cnt:{},lessonDay:3,boostUntil:0,petAt:0,zukan:['puni','hoshi','kirara']};
const t0 = Date.now(); const m = st.sanitize(v1);                       // migrateV1Adult
const bad = st.sanitize({v:2,name:'<img src=x onerror=alert(1)>ながいながいなまえ',you:'\n<b>',stage:4,form:'__proto__',
  history:[{f:'niji',n:'<script>',g:2,s:true},{f:'nope',n:'x',g:1}], shinySeen:['egg','niji'], lessonDays:[1,1,9,2,3]}); // hostileRestore
[
  m.v===2, m.lessonDays.length===1&&m.lessonDays[0]===3, m.adultAt>=t0, m.sick===true&&m.cure===1,
  m.inv.ame===4, !('lastCare' in m), !('lessonDay' in m), m.zukan.join()==='puni,hoshi,kirara', m.sound===true, m.you==='',
  bad.name.length===8, bad.you.length<=8, bad.form==='hakase', bad.finalAt>0,
  bad.history.length===1&&bad.history[0].n==='<script>', bad.shinySeen.join()==='niji',
  bad.lessonDays.join()==='1,2',
  st.decodeState(st.encodeState(m)).gen===3, st.encodeState(m).startsWith('PUNI2:'),
  st.decodeState('PUNI1:'+btoa(unescape(encodeURIComponent(JSON.stringify(v1))))).stage===3,
  (()=>{try{st.decodeState('PUNI2:'+'A'.repeat(40001));return false}catch(e){return true}})(),
  (()=>{try{st.sanitize({v:3});return false}catch(e){return true}})(),
  st.sanitize({v:2,stage:1,form:'hakase'}).form==='puni', st.sanitize({v:2,stage:2,shiny:true}).shiny===false
]
```

`history[0].n` は文字列としてそのまま保持してよい（表示時に `esc()`）。`lessonDays` は不正な値と重複を除き、先頭から最大 2 個。

- [ ] **Step 2: 実行して失敗を確認する。** `m.v===2` などが `false` になる。
- [ ] **Step 3: `sanitize(o)` を v1/v2 両対応にし、`DEF()`・`encodeState`・`decodeState` を更新する。** 段階に合わない `form` は spec §10 の既定にする（1:`puni`、2:`hoshi`、3/4:`hakase`）。v1 で stage 3 のときは `adultAt = Date.now()`。stage 4 で `finalAt`=0 なら `Date.now()`。
- [ ] **Step 4: Step 1 のスクリプトを再実行し、すべて `true` になることを確認する。** あわせて `app.js` を新しいキーで動くように最小限直す（`lessonDay` 参照は `lessonDays.includes(day)` に、`lastCare` の更新は削除）。起動してコンソールエラーがないこと。
- [ ] **Step 5: コミットする。** `feat: 保存形式 v2 と v1 からの移行`

---

### Task 3: 時間帯・ねんね・タスク受付・びょうき（spec §2, §3, §5.1, §5.2）

**Files:**
- Modify: `js/rules.js`, `js/app.js`（タスク描画・`feed`・タッチのねんね分岐・バッジ）

**Interfaces:**
- Produces（`rules.js`）:
  - `band(d: Date): 'asa'|'hiru'|'yuu'|'yoru'`（6–9 / 10–15 / 16–19 / 20–5）
  - `isNight(d: Date): boolean` は `band(d)==='yoru'`
  - `taskState(t, S, d: Date): {ok: boolean, why?: 'day'|'early'|'late'|'weekday'|'done', slot?: 'am'|'pm', used?: number}`
  - `taskNote(t, S, st): string`：ボタン下の説明文（spec §3 の文言。例 `'18じ から'`、`'きょうは おしまい'`、`'へいじつ あさ 5じ〜7じ'`、`'すいようび と どようび だけ'`）
  - `decay(S, now: number): {becameSick: boolean}`：S を直接変更する。おなか 3h／ごきげん 4h ごとに −1。`zeroAcc` で 3h 経つとびょうき（spec §5.2 の積算方法：ループ中におなかが 0 になったら、残った `hAcc` を `zeroAcc` に足す。最初から 0 なら起きていた時間をすべて足す）。stage 0 では何もしない。
  - `afterFeed(S)`：`zeroAcc=0`。`feed` から呼ぶ。

- [ ] **Step 1: 確認スクリプトを書く**

```js
const r = await import('/js/rules.js?t='+Date.now()); const d = await import('/js/data.js');
const T = id => d.TASKS.find(t=>t.id===id); const at=(y,mo,da,h,mi=0)=>new Date(y,mo,da,h,mi); // 2026-10-05 は月曜
const S0 = {cnt:{}, lessonDays:[3,6]};
[
  r.band(at(2026,9,5,5,59))==='yoru', r.band(at(2026,9,5,6))==='asa', r.band(at(2026,9,5,19,59))==='yuu', r.band(at(2026,9,5,20))==='yoru',
  r.taskState(T('hayane'),S0,at(2026,9,5,17,59)).why==='early', r.taskState(T('hayane'),S0,at(2026,9,5,18)).ok,
  r.taskState(T('hayane'),S0,at(2026,9,5,20)).why==='late', r.taskState(T('hayane'),S0,at(2026,9,9,20,30)).ok /*金*/,
  r.taskState(T('hayane'),S0,at(2026,9,10,21)).why==='late' /*土*/,
  r.taskState(T('hayaoki'),S0,at(2026,9,5,5)).ok, r.taskState(T('hayaoki'),S0,at(2026,9,5,7)).why==='late',
  r.taskState(T('hayaoki'),S0,at(2026,9,5,4,59)).why==='early', r.taskState(T('hayaoki'),S0,at(2026,9,10,6)).why==='weekday',
  r.taskState(T('lesson'),S0,at(2026,9,7,12)).ok /*水*/, r.taskState(T('lesson'),S0,at(2026,9,5,12)).why==='day',
  r.taskState(T('katazuke'),{cnt:{katazuke:1},lessonDays:[6]},at(2026,9,5,12)).why==='done',
  (()=>{const S={stage:2,hunger:1,mood:3,hAcc:0,mAcc:0,zeroAcc:0,sick:false,cure:0,lastTick:+at(2026,9,5,8)};
        const o=r.decay(S,+at(2026,9,5,12)); return S.hunger===0&&!S.sick&&o.becameSick===false&&S.zeroAcc===3600e3;})(), // 11時におなか0、そこから1h
  (()=>{const S={stage:2,hunger:0,mood:3,hAcc:0,mAcc:0,zeroAcc:0,sick:false,cure:0,lastTick:+at(2026,9,5,8)};
        const o=r.decay(S,+at(2026,9,5,11)); return S.sick&&o.becameSick;})(),
  (()=>{const S={stage:2,hunger:0,mood:3,hAcc:0,mAcc:0,zeroAcc:0,sick:false,cure:0,lastTick:+at(2026,9,5,20)};
        r.decay(S,+at(2026,9,6,5,59)); return !S.sick&&S.zeroAcc===0;})()                                       // 夜は進まない
]
```

- [ ] **Step 2: 実行して失敗を確認する。**
- [ ] **Step 3: `rules.js` に上の関数を実装する。** `TASKS` の各要素に受付時間の宣言を足す。例：`hayane: {from:18, until:d=>d.getDay()>=5?21:20}`、`hayaoki: {from:5, until:7, weekdays:[1,2,3,4,5]}`。`taskState` はこの宣言を読む。はみがきの あさ／よる の区切り（15 時）は v1 のまま。
- [ ] **Step 4: `app.js` を組み込む。**
  - タスクボタンに `taskNote` を表示する。
  - `feed` は `isNight(new Date())` のときエサを減らさず「すやすや… あさ に たべるね」と言う。
  - 寝顔は `isNight` だけで決める（`lastInteract` 条件を削除）。
  - ねんね中のタッチは `LINES.sleepTap`（Task 8 で増やす。今は 2 文）。
  - びょうき発症時のセリフは v1 と同じ。
- [ ] **Step 5: 検証する。** Step 1 がすべて `true` になること。画面では `page.clock.setFixedTime(new Date(2026,9,5,20,0))` のあと再読込し、寝顔・💤・エサを押しても数が減らないことを確認する。18:30 で はやね が押せること。
- [ ] **Step 6: コミットする。** `feat: ねんね20時・新タスク3つ・れっすん週2・おなか0でびょうき`

---

### Task 4: 姿 19 種と分岐・ずかん（spec §4.3–4.5）

**Files:**
- Modify: `js/rules.js`, `js/art.js`, `js/data.js`, `js/app.js`（`checkEvolve`・`openZukan`）, `css/style.css`（ずかんの小見出し）

**Interfaces:**
- Produces:
  - `rules.js`: `chooseForm(S): {form: string, shiny: boolean}`。S.stage が 0→1、1→2、2→3 へ進むときの行き先。spec §4.3 のアルゴリズム（第1候補 → 相性スコア順 → ずかん未登録の最初 → 全部あれば第1候補の色違い）。
  - `art.js`: `petSVG(form, face, opt)` で 19 種すべてを描く。`opt.shiny`（虹グラデーションの体と ✨）、`opt.final`（Task 5 で使う。光の輪・羽・きらきら）。
  - `data.js`: `FORMS[id].acc` で絵のアクセサリを指定する。`ears: 'round'|'none'|'long'|'cat'` など、描き分けの種類。

- [ ] **Step 1: 確認スクリプトを書く**

```js
const r = await import('/js/rules.js?t='+Date.now()); const d = await import('/js/data.js');
const S=(stage,p,zukan=[])=>({stage,p,zukan});
[
  r.chooseForm(S(0,{ka:0,ki:2,ge:1,ho:0})).form==='shizuku', r.chooseForm(S(0,{ka:0,ki:0,ge:0,ho:0})).form==='puni',
  r.chooseForm(S(1,{ka:1,ki:1,ge:1,ho:5})).form==='kumo',
  r.chooseForm(S(2,{ka:10,ki:9,ge:8,ho:7})).form==='niji',
  r.chooseForm(S(2,{ka:10,ki:8,ge:0,ho:0})).form==='tsukimi', r.chooseForm(S(2,{ka:10,ki:7,ge:0,ho:0})).form==='hakase',
  r.chooseForm(S(2,{ka:0,ki:0,ge:6,ho:8})).form==='ohisama',
  r.chooseForm(S(2,{ka:10,ki:7,ge:0,ho:0},['hakase'])).form==='tsukimi',      // 次点は相性スコア (10+7)/2
  r.chooseForm(S(2,{ka:10,ki:0,ge:0,ho:0},d.ADULT_IDS.slice())).shiny===true,
  r.chooseForm(S(2,{ka:10,ki:0,ge:0,ho:0},d.ADULT_IDS.slice())).form==='hakase',
  d.ZORDER.length===19, d.ADULT_IDS.length===11
]
```

- [ ] **Step 2: 実行して失敗を確認する。**
- [ ] **Step 3: `chooseForm` を実装し、`checkEvolve` を差し替える。** 進化したら `S.shiny` を設定し、`zukan`（色違いのときは `shinySeen`）に追加する。おとな到達時に `S.adultAt=Date.now()` を記録する。
- [ ] **Step 4: 新しい 13 種の絵を `art.js` に描く。** v1 の体の形と `faceSVG` を土台に、耳の形・体色・アクセサリで区別する。
  - しずく：水滴の髪飾り
  - ころ：まるい小石とほっぺ
  - もこ：ふわふわ毛のふち
  - しゃぼん：シャボン玉
  - くも：雲の帽子
  - つきみ：三日月とリボン
  - ぼうけん：探検帽と地図
  - ゆめみ：ナイトキャップと星
  - まりん：セーラー帽
  - けーき：いちごケーキの帽子
  - おひさま：太陽の冠
  - 色違い：体を `<linearGradient>` のパステル虹にする（`id` は form ごとにずらす）
- [ ] **Step 5: ずかんを作り直す。** あかちゃん／こども／おとな の小見出しを付け、件数は「（N / 19）」と表示する。おとなの欄に 👼・なまえ・「◯ぴきめ」・「ほか ◯ひき」・✨ を出す。`history` のなまえは `esc()` を通す。
- [ ] **Step 6: 検証する。** Step 1 がすべて `true` になること。`browser_evaluate` で全種を `zukan` に入れた状態にして ずかん を開き、スクリーンショットで 19 種が描き分けられていることを目視する。重なり・はみ出しがないこと。
- [ ] **Step 7: コミットする。** `feat: 姿を19種に増やし、おとなの重複なしと色違い`

---

### Task 5: さいごのすがた と おわかれ（spec §4.1, §4.2, §4.4）

**Files:**
- Modify: `js/rules.js`, `js/app.js`, `js/art.js`, `index.html`（`#nextEggBtn` を削除）, `css/style.css`

**Interfaces:**
- Produces:
  - `rules.js`: `at6(ts: number, addDays: number): number`（`ts` のローカル日付 + `addDays` 日の 6:00）、`finalDue(S): number` = `at6(S.adultAt, 2)`、`farewellReady(S, now: number): boolean`（stage 4、`finalSeenAt`>0、`now ≥ at6(finalSeenAt,1)`、夜でない、病気でない）
  - `app.js`: `tickLife(now)`。`decay` の後に呼ぶ。stage 3・夜でない・`now ≥ finalDue(S)` なら stage 4 にし、`finalAt=now` として進化モーダルを出す。モーダルを閉じたときに `finalSeenAt=Date.now()`。
  - `app.js`: `startFarewell()`。3 ページのモーダル → たまごを渡す → `history.push({f:S.form,n:S.name,g:S.gen,s:S.shiny})`（200 件を超えたら古い順に削除）→ spec §4.2 の引き継ぎで新しいたまごにする。

- [ ] **Step 1: 確認スクリプトを書く**

```js
const r = await import('/js/rules.js?t='+Date.now()); const at=(mo,da,h,mi=0)=>+new Date(2026,mo,da,h,mi);
const S={stage:4,adultAt:at(9,5,15),finalSeenAt:at(9,7,6,30),sick:false};
[
  r.finalDue({adultAt:at(9,5,15)})===at(9,7,6), r.finalDue({adultAt:at(9,5,0,10)})===at(9,7,6),
  !r.farewellReady(S,at(9,7,23)), !r.farewellReady(S,at(9,8,5,59)), r.farewellReady(S,at(9,8,6)),
  !r.farewellReady({...S,sick:true},at(9,8,9)), !r.farewellReady({...S,finalSeenAt:0},at(9,20,9)),
  !r.farewellReady({...S},at(9,8,21))
]
```

- [ ] **Step 2: 実行して失敗を確認する。**
- [ ] **Step 3: `rules.js` の関数と、`app.js` の `tickLife`・`startFarewell` を実装する。**
  - おわかれの準備ができたら、バッジ「💌 ◯◯ が なにか いいたそう」を出す。なまえは `textContent` を通すか `esc()` する。
  - 準備中にキャラをタッチしたら `startFarewell()` を呼ぶ。
  - おわかれモーダルは背景タップで閉じない。
  - セリフは `LINES.farewell`（Task 8 で増やす。今は spec §4.2 の例文）。
  - さいごのすがた の名前は「かがやく ◯◯」。
  - `#nextEggBtn` と `nextEgg()` を削除する。
- [ ] **Step 4: `art.js` に `opt.final` を実装する。** 頭上の光の輪（楕円の線）、背中の小さな羽 2 枚（体の後ろに描く）、周りの `sparkle` 3 つ。
- [ ] **Step 5: 通しで検証する**（`browser_run_code_unsafe` の `page.clock`）。
  - **lifeFlow:** 10/5 15:00 に stage 2・pts 24 の状態を復元コードで入れる → エサでおとな → `clock.fastForward` で 10/7 5:59 まで進める（まだおとな）→ 6:00 で さいごのすがた のモーダル → 閉じる → 10/7 23:00（夜。タッチしても むにゃむにゃ）→ 10/8 6:00 で 💌 → タッチ → 3 ページ → たまご。`gen`+1、`history` 1 件、ずかん に 👼、なまえが同じであること。
  - **longAbsence:** おとなになって（10/5）から 10/12 10:00 に初めて開く → まず さいごのすがた のモーダル → 同じ日にタッチしても おわかれ しない → 10/13 6:00 以降に おわかれ できる。
- [ ] **Step 6: コミットする。** `feat: さいごのすがた と おわかれ・たまごの引き継ぎ`

---

### Task 6: 表情・ポーズ・タッチ（spec §5.3, §6）

**Files:**
- Modify: `js/rules.js`, `js/art.js`, `js/app.js`（`petTap` を置き換え）, `css/style.css`

**Interfaces:**
- Produces:
  - `rules.js`: `look(S, ctx: {night: boolean, react: string|null}): {face: string, pose: string}`。
    - 表情 `face` は `'sleep'|'sick'|'happy'|'normal'|'sad'|'pout'|'tears'|'hungry'|'drool'|'sparkle'|'shy'|'giggle'|'squint'|'hug'|'dizzy'` のいずれか。
    - ポーズ `pose` は `'bob'|'sway'|'bounce'|'droop'|'tilt'|'spin'|'squish'|'none'` のいずれか。
    - spec §5.3 の表どおりに決める。`react` があればそれを優先する。
  - `art.js`: `faceSVG(face)` で上の表情をすべて描く。`petSVG(..., {arms:'up'|'belly'|'side', think:'🍙'|null})` を追加。
  - `app.js`: `#pet` に `pointerdown`/`pointermove`/`pointerup`/`pointercancel` を付けて、操作を `tap-head`・`tap-belly`・`stroke`・`hug`・`mash` に分ける（しきい値は spec §6：80px、700ms、2.5 秒以内に 5 回、上 40%）。`#pet` に `touch-action:none` を付ける。

- [ ] **Step 1: 確認スクリプトを書く**

```js
const r = await import('/js/rules.js?t='+Date.now());
const L=(h,m,o={})=>r.look({stage:2,hunger:h,mood:m,sick:false,...o},{night:false,react:null,...o.ctx});
[
  L(4,4).pose==='bounce'&&L(4,4).face==='sparkle', L(3,1).face==='pout', L(2,2).face==='normal',
  L(1,0).pose==='droop', L(0,0).face==='tears', L(0,2).face==='hungry', L(0,4).face==='drool',
  L(4,4,{sick:true}).face==='sick', L(4,4,{ctx:{night:true}}).face==='sleep',
  L(4,4,{ctx:{react:'dizzy'}}).face==='dizzy', r.look({stage:0,hunger:0,mood:0},{night:false,react:null}).face==='normal'
]
```

- [ ] **Step 2: 実行して失敗を確認する。**
- [ ] **Step 3: `look` と表情・ポーズの絵を実装する。** ポーズは `#pet` に `pose-<名前>` の CSS クラスを付けて切り替える。アニメーションは `css/style.css` に定義する。`prefers-reduced-motion` では止める。
- [ ] **Step 4: タッチの判定を実装する。** 押したまま動かした距離を足し合わせて判定する。`click` イベントは使わない。キーボード（Enter/Space）で押したときは `tap-belly` として扱う。
- [ ] **Step 5: 検証する。** Step 1 がすべて `true` になること。画面では `browser_run_code_unsafe` の `page.mouse` で、頭タップ・なでなで（down → 100px move → up）・ぎゅー（down → 800ms → up）・5 連打を行う。それぞれのセリフとごきげん +1（30 分に 1 回）を確認する。おなか／ごきげん の 9 通りを復元コードで入れて、スクリーンショットを撮る。
- [ ] **Step 6: コミットする。** `feat: おなか×ごきげんの表情とポーズ、タッチの種類`

---

### Task 7: 効果音・鳴き声・読み上げ（spec §7）

**Files:**
- Modify: `js/sound.js`, `js/app.js`（各場面で呼ぶ・初回の pointerdown で `unlock()`）

**Interfaces:**
- Produces（`sound.js`）:
  - `setSound(on: boolean): void`
  - `unlock(): void`（`AudioContext` の作成と `resume()`。2 回目以降は何もしない）
  - `sfx(name: 'pop'|'chime'|'munch'|'fanfare'|'heal'|'cry'|'giggle'|'hug'|'dizzy'|'snore'|'egg'|'farewell'): void`。`cry` は呼ぶたびに 3 種からランダム。
  - `speak(ja: string, zh: string): void`（ja: pitch 1.7、rate 1.05／zh: pitch 1.3、rate 0.85）
  - どの関数も、音オフ・未 `unlock`・API が無い場合は何もせず、例外を投げない。

- [ ] **Step 1: 確認スクリプトを書く**（soundOff）

```js
const s = await import('/js/sound.js?t='+Date.now()); let spoke=0;
const orig = window.speechSynthesis && speechSynthesis.speak.bind(speechSynthesis);
if (window.speechSynthesis) speechSynthesis.speak = ()=>{spoke++};
const res=[];
try{ s.sfx('cry'); res.push(true);}catch(e){res.push(false);}            // unlock 前でも例外なし
s.setSound(false); s.speak('こんにちは','你好'); res.push(spoke===0);
s.setSound(true); s.unlock(); s.sfx('fanfare'); s.speak('こんにちは','你好'); res.push(spoke===2);
if (orig) speechSynthesis.speak = orig; res
```

- [ ] **Step 2: 実行して失敗を確認する。**
- [ ] **Step 3: 実装する。** 共通の `tone(freqStart, freqEnd, dur, type, gain, when)` を作り、エンベロープは `GainNode` の `setValueAtTime`／`exponentialRampToValueAtTime` で付ける。
  - 鳴き声は三角波で、ピッチを 700→1100→800Hz と上げ下げし、`OscillatorNode` の周波数に 7Hz・±40Hz のビブラートを掛ける。長さは 0.35〜0.5 秒。
  - 全体の音量は 0.25 以下にする。
- [ ] **Step 4: `app.js` の各場面に組み込む。** 割り当ては spec §7.1 の表どおり。🔊 ボタンは `speak(bubble.ja, bubble.zh)` を呼ぶ。`S.sound` を起動時と設定変更時に `setSound` に渡す。
- [ ] **Step 5: 検証する。** Step 1 がすべて `true` になること。コンソールエラーがないこと（Chromium の自動再生の警告は除く）。
- [ ] **Step 6: コミットする。** `feat: 効果音・なでなでの鳴き声・かわいい読み上げ`

---

### Task 8: セリフ・中国語・よびかた（spec §8）

**Files:**
- Modify: `js/data.js`（`WORDS`・`PHRASES`・`LINES`）, `js/rules.js`, `js/app.js`

**Interfaces:**
- Produces:
  - `data.js`: `LINES` は `{greet:{asa,hiru,yuu,yoru}, idle:{asa,hiru,yuu}, hungry, pout, happy, tapHead, tapBelly, stroke, hug, dizzy, eat, sleepTap, sleepFeed, sick, farewell: string[] (3ページ), give}`。各場面の合計は 10 文以上。`{you}` を含む文も混ぜる。
  - `WORDS` は 30 語以上、`PHRASES` は 25 文以上。どちらも `[簡体字, ひらがな読み, いみ]` の形。
  - `rules.js`: `pickLine(key: string, S, d: Date, rnd = Math.random): string`。時間帯とおなか／ごきげんで候補を絞る。`S.you` が空なら `{you}` を含む文を除き、空でなければ `{you}` を `S.you` に置き換える。

- [ ] **Step 1: 確認スクリプトを書く**

```js
const r = await import('/js/rules.js?t='+Date.now()); const d = await import('/js/data.js');
const all = Object.values(d.LINES).flatMap(v=>Array.isArray(v)?v:Object.values(v).flat());
const kanji = /[一-鿿]/;
[
  d.WORDS.length>=30, d.PHRASES.length>=25, [...d.WORDS,...d.PHRASES].every(w=>w.length===3&&!kanji.test(w[1]+w[2])),
  all.every(s=>!kanji.test(s)),                                     // ひらがな UI（約束 7）
  Array.from({length:50},()=>r.pickLine('greet',{you:''},new Date(2026,9,5,7))).every(s=>!s.includes('{you}')),
  Array.from({length:50},()=>r.pickLine('greet',{you:'〇〇ちゃん'},new Date(2026,9,5,7))).some(s=>s.includes('〇〇ちゃん'))
]
```

- [ ] **Step 2: 実行して失敗を確認する。**
- [ ] **Step 3: データを書く。** 中国語は簡体字とピンインを確かめ、読みは子どもが発音しやすいひらがなにする（例：`['我很开心','うぉー へん かいしん','とっても うれしい']`、`['今天天气很好','じんてぃえん てぃえんちー へん はお','きょうは いい てんき']`）。
- [ ] **Step 4: `pickLine` を実装し、`app.js` の固定のセリフを `pickLine` に置き換える。**
  - ひとりごと：起きている・モーダルが無い・90 秒操作がない、の 3 つを満たすときに 1 回だけ出す。操作すると次の 90 秒の計測が始まる。
  - あいさつ：起動時と、前面に戻ったとき（最後のあいさつから 30 分以上たっていれば）。
  - 中国語を話す確率は 30%。単語と短文は半々。
- [ ] **Step 5: 検証する。** Step 1 がすべて `true` になること。設定で よびかた を入れたあと、あいさつに名前が出ること。`page.clock` を 7:00 と 17:00 にして、あいさつが変わること。
- [ ] **Step 6: コミットする。** `feat: 時間帯のセリフ・中国語の短い文・よびかた`

---

### Task 9: パステル配色・時間帯の背景・ひきめ（spec §9）

**Files:**
- Modify: `css/style.css`, `js/app.js`（`#screen` のクラス、`genLabel`）, `manifest.webmanifest`（`theme_color` と `background_color` をパステルに）, `index.html`（`theme-color` の meta）

**Interfaces:**
- Consumes: `band(d)`（Task 3）
- Produces: `#screen` に `t-asa`／`t-hiru`／`t-yuu`／`t-yoru` のいずれか 1 つを付ける。v1 の `.night` は削除する。

- [ ] **Step 1: 確認手順を書く。** `page.clock` を 7:00、12:00、17:00、21:00 にして、それぞれでスクリーンショットを撮る。820×1180 でライトとダーク（`browser_emulate_media` の `colorScheme`）の両方を撮る。390×844 は 1 枚。
- [ ] **Step 2: 配色を差し替える。**
  - `:root` のトークンをパステルにする（例：`--bg:#FFF5F9`、`--shell:#F9B8D3`、`--shell-dk:#E79BBE`、`--screen:#EAF7F1`、`--accent:#F48FB8`、`--lav:#ECE4FF`、`--lemon:#FFF3C4`、`--line:#F6D9E6`、`--mint:#D9F2E6`、`--sky:#DDEBFF`）。
  - ダークモードは夜空のくすみパステルにする（例：`--bg:#2E2A40`、`--card:#3A3550`、`--accent:#F2A7C6`）。
  - 本文の文字色と背景のコントラストは 4.5:1 以上にする。
- [ ] **Step 3: 時間帯の背景を作る。** グラデーションは `.screen.t-*` に書き、飾り（☀️ ☁️ 🌇 🌙⭐）は `::before`／`::after` に置く。キャラやゲージと重ならないよう上の端に寄せ、`pointer-events:none` にする。
- [ ] **Step 4: ヘッダーを `S.gen+'ぴきめ'` にする。**
- [ ] **Step 5: 検証する。** Step 1 のスクリーンショットを目視し、文字が読めること・飾りが重ならないこと・横スクロールが出ないことを確認する。コンソールエラーがないこと。
- [ ] **Step 6: コミットする。** `style: パステル配色と時間帯の背景、ひきめ表記`

---

### Task 10: 設定画面・更新ボタン・文書・版数（spec §9, §10, §12）

**Files:**
- Modify: `js/app.js`（`openSettings`）, `sw.js`（`VERSION='v2.0.0'`）, `docs/spec.md`, `docs/spec-summary.md`, `CLAUDE.md`（「構成」に新しいファイル、構文チェックのコマンド）

**Interfaces:**
- Produces:
  - `app.js`: `const APP_VERSION='v2.0.0'`
  - `app.js`: `async function updateApp(): Promise<void>`。`getRegistration()` → `update()` → `installing` があれば `statechange` で `activated` になるまで最大 8000ms 待つ → `location.reload()`。どこかで失敗しても、最後に必ず `reload()` する。
  - 設定画面の項目：なまえ、よびかた、レッスン曜日（1 つめ／2 つめ。2 つめは「なし」も選べる）、音（オン／オフ）、アプリを更新する、バージョン表示、バックアップ、リセット。

- [ ] **Step 1: 確認手順を書く。**
  - 設定で よびかた「<b>はな</b>」と入れて保存し、ヘッダー・セリフ・ずかん で文字列として表示されることを確認する（タグとして解釈されないこと）。
  - 曜日を 水・土 にして、両日に れっすん が押せること。
  - 音をオフにすると 🔊 を押しても `speechSynthesis.speak` が呼ばれないこと（Task 7 と同じ差し替えで確認）。
  - 「アプリを更新する」で再読み込みされること。
  - バックアップでは `PUNI2:` のコピーと復元ができ、v1 の `PUNI1:` コードも復元できること。
  - 「最初からやり直す」の 2 回タップで初期化されること。
- [ ] **Step 2: 設定画面を実装する。** 2 つめの曜日が 1 つめと同じ場合は 1 つにまとめる。`lessonDays` は sanitize と同じ規則で保存する。
- [ ] **Step 3: 文書を v2 に合わせて更新する。** `docs/spec.md` と `docs/spec-summary.md` は設計書の内容を反映させる（数値・段階・データ表）。`CLAUDE.md` は「構成」と構文チェックのコマンド `for f in js/*.js; do node --check "$f"; done` を書き換える。`sw.js` の `VERSION` を `'v2.0.0'` にする。
- [ ] **Step 4: 検証する。** Step 1 をすべて確認する。そのあと Review Focus の 1〜5 と Task 5 の **lifeFlow** を通しでもう一度確認する。コンソールエラーが 0 件であること。
- [ ] **Step 5: コミットする。** `feat: 設定（よびかた・曜日2つ・音・アプリ更新）と v2 の文書`

---

### Task 11: レビューと仕上げ（CLAUDE.md ワークフロー手順 2〜5）

- [ ] **Step 1:** `security-reviewer` サブエージェントで `main...HEAD` の差分をレビューし、指摘があれば修正してコミットする。
- [ ] **Step 2:** `/security-review` を実行し、指摘があれば修正してコミットする。
- [ ] **Step 3:** CLAUDE.md の手順 4 の動作確認を、820×1180 と 390×844 で行う（起動・エサやり・設定・保存と復元・コンソールエラー）。
- [ ] **Step 4:** `sw.js` の `VERSION` と `APP_VERSION` が両方 `v2.0.0` であることを確認する。そのうえで、main へのマージとプッシュをしてよいか、ユーザーに確認する。
