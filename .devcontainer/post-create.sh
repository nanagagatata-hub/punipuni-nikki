#!/usr/bin/env bash
# コンテナ作成時に 1 回だけ実行される。ブラウザテスト（Playwright MCP）の準備をする。
# アプリ本体には npm 依存を入れない方針なので、package.json は作らず npx でキャッシュに入れるだけにする。
set -euo pipefail

echo "== versions =="
python3 --version
node --version

echo "== Playwright: Chromium と依存ライブラリ =="
# arm64（Apple Silicon 上の Docker）では Google Chrome が無いので、Playwright 版 Chromium を使う。
npx -y playwright@latest install --with-deps chromium

echo "== 完了 =="
echo "Claude Code で /mcp を開き、playwright サーバーが connected になっていることを確認してください。"
