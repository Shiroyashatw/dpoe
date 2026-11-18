# dpoe-m2-25-main2：併 main dff5f12 後重跑驗收

- `check.txt`：`node tools/check.js`（✅872 ❌0）
- `quick_<寬>x<高>.txt`、`b2_offline_*.png`：`node tools/idle_check.js 寬 高 quick 120 12 evidence/dpoe-m2-25-main2`，五尺寸同時跑（各 ✅11 ❌0）
- `hide.txt`：`node tools/hide_check.js`（✅34 ❌0）
- `touch_<寬>x<高>.txt`：`node tools/touch_check.js 寬 高`，六尺寸每次三個並行（0 失敗、沒有重跑）
- `offline_390x844.png`、`offline_1280x720.png`、`offline_pos_*.txt`：離線摘要截圖與按鈕位置（`POS` 那行）。
  `idle_pos_tool.js.txt` 是 `tools/idle_check.js` 的暫時副本，只在截圖後多印按鈕的位置、是否在畫面內、`elementFromPoint` 點中心是否打到自己；repo 的工具沒改。
