# ぷにぷに にっき

娘向けのたまごっち風育成ゲーム（静的Webアプリ）。仕様は `docs/spec.md`、開発ルールは `CLAUDE.md`。

## 1. VS Code + Dev Container + Claude Code で開く
開発は Ubuntu コンテナ内で行う（詳細は `CLAUDE.md` の「開発環境（Dev Container）」）。
1. Docker と VS Code 拡張「Dev Containers」を入れておく。
2. このフォルダを VS Code で開き、「Dev Containers: Rebuild and Reopen in Container」を実行する。
   python3・Node.js・Playwright 用 Chromium が自動で入る（初回は数分かかる）。
3. コンテナ内で Claude Code を起動する。`CLAUDE.md` と `.claude/agents/security-reviewer.md` は自動で読み込まれる。
4. `.mcp.json` の `playwright` MCP サーバーの利用を許可し、`/mcp` で connected になっていることを確認する。
   これで Claude がヘッドレスブラウザでゲームを操作・スクリーンショット確認できる。

## 2. ローカルで確認（コンテナ内）
```
python3 -m http.server 8000
```
VS Code がポートを転送するので、ホストのブラウザで http://localhost:8000 を開く。

## 3. GitHub Pages で公開（ログイン不要で iPad から使う）
1. GitHub にリポジトリを作成してプッシュする。
   - 無料プランの GitHub Pages は **公開リポジトリ** が前提。コードに個人情報（娘の実名など）を入れないこと。育成データは iPad 内にのみ保存され、公開されない。
2. リポジトリの Settings → Pages → Source を「Deploy from a branch」、Branch を `main` / `/(root)` にして保存。
3. 数分後に `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される。

## 4. iPad での設定
1. Safari で公開URLを開く。
2. 共有ボタン →「ホーム画面に追加」。以後はホーム画面のアイコンから起動する。
3. claude.ai 版で育てていたデータを移す場合：旧版の設定（⚙️長押し）で「コードを表示・コピー」→ 新版の設定で「コードから復元」。
4. 週1回程度、バックアップコードをメモアプリ等に控えておく。

## 5. 更新の流れ
変更 → `security-reviewer` サブエージェント → `/security-review` → 動作確認 → `sw.js` の VERSION を上げる → コミット・プッシュ。
iPad 側はアプリを2回起動し直すと新しい版になる。

## 任意：PRごとの自動セキュリティレビュー
`docs/optional/security-review.yml` を参照（Claude API キーが必要）。
