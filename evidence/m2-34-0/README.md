# M2-34 第 0 批 token 收斂：像素比對

- 截圖步驟照 PR #28 `evidence/visual-audit-1117/tools/capture.js`（直立 390×844 26 張＋桌機 1280×720 25 張），改成 `tools/capture_det.js`：Playwright clock 暫停時間只用 `runFor` 推進、`Math.random` 固定種子、截圖前把 CSS 動畫／轉場停在固定時間點，兩次截圖才能逐像素比。
- 用法：兩個資料夾各開 `python3 -m http.server`（改動前 main、分支），`bash tools/run_all.sh <main 網址> <分支網址> <輸出> 2`，再 `python3 tools/compare.py <輸出>`。
- 判定：同一張畫面，main 的 N 次 × 分支的 N 次兩兩比，至少有一對逐像素相同（差異 0）才算相同。同一份程式跑兩次也會有雜訊（戰鬥模擬偶爾走另一條路、canvas 抗鋸齒差 1 階），表上「改動前自己比的雜訊」那欄就是 main 自己跟自己比的最大差。
- `compare.md`：最後一次（main 984bdae）的結果，main 4 次 × 分支 4 次。`shots/`：分支的樣張。
