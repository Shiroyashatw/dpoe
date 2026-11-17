#!/usr/bin/env bash
# 雲端 Claude Code 工作階段開始時跑（.claude/settings.json 的 SessionStart hook）。
# 本機不做事；雲端裝 playwright（不下載瀏覽器，用預裝的 Chrome），並把路徑寫進工作階段環境。
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
D=/tmp/pw
if [ ! -d "$D/node_modules/playwright" ]; then
  mkdir -p "$D" && cd "$D" && { [ -f package.json ] || echo "{}" > package.json; } && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --silent --no-audit --no-fund playwright >/dev/null 2>&1 || true
fi
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo "export NODE_PATH=$D/node_modules" >> "$CLAUDE_ENV_FILE"
  echo "export PW_CHROME=${CHROME_PATH:-/usr/bin/google-chrome}" >> "$CLAUDE_ENV_FILE"
fi
exit 0
