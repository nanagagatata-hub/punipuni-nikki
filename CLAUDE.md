# ぷにぷに にっき — プロジェクトガイド

娘（ひらがなのみ読める）向けの、たまごっち風ブラウザ育成ゲーム。
現実の習慣（中国語レッスン・自習、歯みがき、野菜、お風呂）を報告するとエサがもらえ、エサの種類で進化先が分岐する。
主な利用端末は iPad（Safari、ホーム画面に追加して使用）。仕様の詳細は `docs/spec.md`。

## 構成
- `index.html` … 画面の骨組みと CSP（Content-Security-Policy）
- `css/style.css` … 見た目（ライト／ダークのカラートークン）
- `js/app.js` … ゲームロジック・描画（依存ライブラリなし）
- `sw.js` … オフライン用キャッシュ（Service Worker）
- `manifest.webmanifest`, `icons/` … ホーム画面追加用

## 設計上の約束（変更時も守ること）
1. 静的サイトのみ。サーバー、ビルド工程、npm 依存を増やさない。
2. 外部通信をしない。外部 CDN・フォント・解析タグ・広告を追加しない。CSP の `'self'` 以外の許可を足さない。
3. インライン `<script>` / `style=""` / `onclick=""` を書かない（CSP で動かなくなる）。幅などは JS から `el.style.x` で設定する。
4. `innerHTML` に入れる文字列で、利用者が入力した値（なまえ等）は必ず `esc()` を通す。できれば `textContent` を使う。
5. 保存データと復元コードは信頼しない。読み込みは必ず `sanitize()` を通し、キーを追加したら `sanitize()` にも追加する。
6. 保存形式（`v:1`）を変える場合は、旧データを読めるように移行処理を書く。娘の育成データを消さないことが最優先。
7. UI の文言はひらがなのみ（おうちの方向け設定画面は漢字可）。
8. 子ども向け配慮：キャラは死なない。罰ではなく「お世話で回復する」設計を維持する。
9. 既存キャラクター（サンリオ等）の模倣をしない。オリジナルデザインのみ。
10. `sw.js` 以外のファイルを変更したら、`sw.js` の `VERSION` を上げる。

## 開発環境（Dev Container）
開発は VS Code の Dev Container（Ubuntu 24.04 / arm64 あり）の中で行う。GUI ブラウザは無いので、ブラウザテストはヘッドレス Chromium を MCP 経由で操作する。
- `.devcontainer/devcontainer.json` … python3・Node.js（LTS）を Features で導入、ポート 8000 を転送、`/dev/shm` を 1GB に拡張
- `.devcontainer/post-create.sh` … 作成時に Playwright 版 Chromium と OS ライブラリを導入（arm64 では Google Chrome が使えないため Chromium 固定）
- `.mcp.json` … プロジェクト用 MCP サーバー `playwright`（`@playwright/mcp`、`--headless --browser chromium --no-sandbox --isolated`）

### 構築手順
1. VS Code で「Dev Containers: Rebuild and Reopen in Container」を実行する（初回は post-create.sh の完了まで待つ）。
2. コンテナ内で `claude` を起動し、`.mcp.json` の `playwright` サーバーの利用を許可する。`/mcp` で connected を確認。
3. MCP が「ブラウザが無い」と言う場合は、`browser_install` ツールを実行するか `npx -y playwright@latest install --with-deps chromium` を再実行する（MCP 側の Playwright と版がずれた場合に起こる）。

### 補足
- Playwright・Node.js は**開発用の道具**であり、アプリ本体の依存ではない。`package.json` は作らない（約束 1 を維持）。
- ブラウザテストは `http://localhost:8000` のみを対象にする。MCP のブラウザで外部サイトを開かない。
- `claude-in-chrome` はホスト側 Chrome 用のため、このコンテナでは使わない。
- `.devcontainer/`・`.mcp.json`・`CLAUDE.md` など、`sw.js` の `ASSETS` に含まれないファイルだけの変更では `VERSION` を上げなくてよい。

## 開発コマンド（コンテナ内で実行）
- ローカル確認: `python3 -m http.server 8000` → ホストのブラウザで http://localhost:8000（VS Code がポート転送する）
  - MCP のブラウザからも同じ `http://localhost:8000` で開ける（同じコンテナ内のため）。
  - iPad 実機で見る場合は同じ Wi-Fi で `http://<PCのIP>:8000`。VS Code の転送はホストの localhost にしか公開されないため、LAN から見るには Docker の `-p 8000:8000` 公開などが別途必要。Service Worker は https か localhost でのみ動作するので、実機でのオフライン確認は GitHub Pages で行う。
- 構文チェック: `node --check js/app.js`

## 変更時のワークフロー（必須）
1. 変更を実装する。
2. `security-reviewer` サブエージェントで変更内容をレビューする。
3. `/security-review` を実行し、指摘があれば修正する。
4. 動作確認：`node --check js/app.js` のあと、`python3 -m http.server 8000` をバックグラウンドで起動し、Playwright MCP で主要操作（起動・エサやり・設定画面・保存と復元）を確認する。コンソールエラー（特に CSP 違反）が無いことも見る。iPad 相当の表示確認には `browser_resize`（例: 820×1180）を使う。
5. `sw.js` の VERSION を上げてからコミット・プッシュする。
