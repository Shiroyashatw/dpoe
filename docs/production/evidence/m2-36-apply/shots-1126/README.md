# M2-36 套值（dpoe-m236-apply-1126）main 對照本分支截圖

- 尺寸 1280×720、DPR 1；Playwright 預裝 Chromium（`/opt/pw-browsers/chromium` → chromium-1243）。
- 網址 `?dbg=1&seed=7`，清 localStorage、擋 supabase；`proSkip()` 後：
  - `battle`：`S.auto = 1`、`runNode(TRUNK_K[16])`、`DBG.step(4000)`、`DBG.settle()`
  - `camp`：`S.auto = 0`、`DBG.step(1500)`、`DBG.settle()`
  - `camp-panel`：接著按 `H` 開營地面板
- `main_*`＝main `53e1bba`（埠 8004）；`branch_*`＝feat/m2-36-apply-1126（埠 8003）。
- 沒有疊定稿示意：本輪只改 `:root` 值，不動位置與尺寸；營地／倉庫框位置由 `tools/camp_stash_check.js` 量（兩邊皆 114／0）。
