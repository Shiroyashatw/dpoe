# M2-36 套值第 3 步截圖（1280×720，DPR 1）

- 瀏覽器：預裝 Playwright Chromium `/opt/pw-browsers/chromium`（Chrome for Testing 158），本機伺服器；`/usr/bin/google-chrome` 沒用。
- 三版：`-main`＝main `53e1bba`；`-before`＝改前（交辦 head `20f162b`）；`-after`＝本步。產生腳本 `shots.js`（`node shots.js <URL> <資料夾> <tag>`），種子 7、凍結後截。
- `zoom-*-main-before-after.png`：同一塊左→右 main／改前／改後並排放大（洋紅色是分隔）。
- 沒有對應的定稿示意可疊，沒做疊圖。

| 圖 | 內容 | 改前→改後 |
|---|---|---|
| fire-temple | 紅燈籠內光、石燈籠窗、香頭火點 | `--scene-detail-28/56/61-rgb` → `--scene-window`／`--scene-window`／`--scene-fire-outer`（α 不變） |
| fire-lava | 壁上火盆 | `--scene-detail-31-rgb` → `--scene-fire-flame` |
| chase | #chase 橫幅 | `--chase-bnr` 0.94 → 不透明 `#25211e`（取樣 (300,60)：35,31,28 → 37,33,30） |
| lvup-ring | 升級金圈（sig_lvup 圖沒載到時的退路） | 都是 `--dmg-crit` `#f2cb9b`，本步不變（main 是 `#ffd166`） |
| battle-charges | 耐力球 3、暴擊球 3 | 本步不變：`drawCharges` 還讀 `CHGC`（舊 token），改讀 `--chg-e`／`--chg-p` 是第 4 步（總表列 41、20） |
| roulette | 命運輪盤六籤（狀態列） | 畫面不變：狀態列（bhud.js）不畫 `col`；籤色在 `playerStates()` 資料裡（check.js 驗 `rou_red:#ff6066,rou_blue:#ade2f9`） |
