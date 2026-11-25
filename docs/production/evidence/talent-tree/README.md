# 天賦樹 1280×720 實作證據（talent-tree v1.0.1）

依據：docs/production/specs/talent-tree.md v1.0.1（commit 75bed9a09486abbbb34395e7e59821bcf565fbff）

- 瀏覽器：雲端環境預裝的 Playwright Chromium（`/opt/pw-browsers/chromium` → chromium-1243）。`/usr/bin/google-chrome`（Chrome for Testing 158）這次沒用：環境的 playwright 1.65 套件找不到它自帶的 headless shell，所以所有測試都設 `PW_CHROME=/opt/pw-browsers/chromium`。
- `shot-*.jpg`：`tools/tree_check.js` 在 1280×720 的實機截圖（檔名對應示意圖 01–19）；`shot-390x844-tree.jpg` 是直立手機。
- `overlay-*.jpg`：左半＝示意圖遊戲區（2× 圖裁 40,40 起 2560×1440 縮成 1280×720）與實機各 50% 疊圖，紅框是規格座標、綠框是實機量到的位置；右半是實機原圖。`tools/tree_overlay.py` 產生。
- `diff.md`：逐項位置與尺寸差（px，實機 − 規格，容差 ±1）。不符的項目照實列出。
- `boxes.json`：`tree_check.js` 量到的 DOM 框。
- `test-output/base/`：main 039c3a56 的測試輸出；`test-output/head/`：本分支的測試輸出（原始輸出，沒有刪改）。

重現：

```bash
python3 -m http.server 8003 &
PW_CHROME=/opt/pw-browsers/chromium node tools/tree_check.js http://localhost:8003/ /tmp/tt
python3 tools/tree_overlay.py /tmp/tt docs/production/evidence/talent-tree
```

01–05、14、16、19 的樹本身是 main 現行樹形（規格寫明這幾頁除珠寶孔外是示意），所以疊圖只比殼（頂欄、樹視圖、底欄、重置、小地圖）的座標。
