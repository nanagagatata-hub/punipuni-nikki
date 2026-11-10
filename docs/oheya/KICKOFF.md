# KICKOFF — おへや（アイソメ風ぷに部屋）Claude Code への最初の指示

構想の元は `docs/oheya/CONCEPT.md`。まず「段階0（技術検証）＋段階1（見るだけのおへや）」までを進める。

## 事前（オーナー作業）：流用元を読み取り専用でマウントする
いまの devcontainer は、他のプロジェクトを参照できない。`.devcontainer/devcontainer.json` に次を足して、「Dev Containers: Rebuild and Reopen in Container」を実行する。
（`.devcontainer/` だけの変更なので、`sw.js` の `VERSION` は上げなくてよい。）

```jsonc
	// 流用元を「読み取り専用」で参照する（同じ親フォルダにある前提）
	"mounts": [
		"source=${localWorkspaceFolder}/../Oekaki_Suizokukan,target=/refs/oekaki,type=bind,readonly",
		"source=${localWorkspaceFolder}/../odori_tabi,target=/refs/odori,type=bind,readonly",
		"source=${localWorkspaceFolder}/../orbit_seq,target=/refs/orbit,type=bind,readonly"
	],
```

マウントしない場合は、Claude Code に「参照元はマウントなしで進める」と伝える（CONCEPT.md の考え方だけで進められるが、`/refs` を読めたほうが速い）。

## Claude Code に渡す文（ここから下をそのまま貼る）

---

CLAUDE.md、docs/spec-summary.md、docs/oheya/CONCEPT.md を読んでください。
superpowers の brainstorming で **段階0（技術検証）＋段階1（見るだけのおへや）** の設計書を `docs/superpowers/specs/` に作ってください。

範囲：
- **段階0**：`dev/room-spike.html`＋`dev/room-spike.js`（`sw.js` の `ASSETS` に含めない・アプリからリンクしない）で、アイソメの床＋ぷに1匹＋家具のダミーを Canvas 2D で描く。確かめること：
  - `petSVG` → `data:` 画像 → `Image` のキャッシュで描けるか（CSP が通るか）
  - 6匹＋家具30個を同時に動かしたときの負荷
  - ホーム画面に追加した状態、裏から戻ったあとに描画が消えないか
  - 実機で見る手順を依頼文にして私に渡す（Mac 上で直接サーバーを起動し、iPad から見る方式は決定済み。CONCEPT.md §2）
- **段階1**：`js/room.js`（描画・投影・深度ソート）、`js/room-ai.js`（主役のぷにの自律行動：たちどまり・歩く・きょろきょろ・ぴょん・ダンス・ねんね。DOM に触れない純粋ロジック、乱数は注入）、`js/room-art.js`（床・壁・窓・固定の家具の SVG）。ホーム画面の背景（`#scene`）をおへやに置き換え、既存のタッチ判定（`#pet`）はそのまま使う。窓の外は時間帯の空、夜はゆっくり暗くする（明滅なし）。固定の家具は見せるだけで、置き換えはできない。

範囲外（まだやらない）：コイン、おみせ、家具の配置と模様替え、ずかんのぷにを呼ぶこと、保存形式の変更、ライブラリの追加、`package.json` の作成。

参照元：`/refs/oekaki`（`src/tank/` の考え方）、`/refs/odori`（`src/core/puppet-motion.ts`）、`/refs/orbit`（`src/render/camera.ts`）。移すときは冒頭に出所と変更点を書く。`walk.ts` は1次元の歩きなので、マス目の経路探索（BFS）は新規に作ってください。

進め方：
- **最初に作業ブランチ `feature/oheya` を作る**。`docs/oheya/` はそのブランチでコミットする（`docs/superpowers/specs/2026-11-07-oseva-station-design.md` は別件なので含めない）。関門 G1 が済むまで `main` には入れず、`main` へのプッシュもしない。
- 部屋の雰囲気は「パステルの絵本風の洋室」で決定済み。家具・床・壁はその方向で描く。
- 純ロジックは DOM に触れない ES モジュール＋JSDoc の型で書く。テストは Node 標準の `node:test`（`tests/`）。`package.json` なしで動くか確認し、動かなければ私に相談する（勝手に `package.json` を作らない）。
- 質問は AskUserQuestion のカード形式で、選択肢と推奨を示す。
- 「設計上の約束」（CLAUDE.md）は変えない。変更時のワークフロー（security-reviewer → `/security-review` → 構文チェック＋Playwright MCP での確認 → `VERSION`／`APP_VERSION` を上げる）を毎回行う。新しい `js/*.js` は `sw.js` の `ASSETS` に足す。
- 実機（iPad）の滑らかさ・発熱は、コンテナでは測れない。測れたふりをせず、実機で見る手順を依頼文にして私に渡す。
- 並行できる作業（`room-ai` のロジックと `room` の描画）は、サブエージェントで並行してよい（2本まで。先に型を決めてから）。

完了基準：
- 段階0：検証項目の結果が記録され、段階1に進めるかの判断材料がそろう。**そこで止まり、結果を報告して私の判断を待つ**（続けて段階1に進まない）。
- 段階1：構文チェックとテストがすべて通る。Playwright で、起動・エサやり・設定画面・保存と復元・昼と夜の表示・主役のぷにが歩くことを確認し、コンソールエラー（特に CSP 違反）がない。縦横（820×1180 など）で崩れない。今の育成データがそのまま動く。

**関門 G1**：段階1ができたら、私が実機で見て、子どもと試して体験を判断します。そこで段階2に進むか、その前に TypeScript＋Vite へ移行するかを決めます。
設計書ができたら、私の確認を待ってから writing-plans に進んでください。

---
