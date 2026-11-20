# dpoe v0.5.4 測試證據：要放進 repo 的關鍵截圖

來源：遊戲測試員 2026-11-16 測 v0.5.4（https://shiroyashatw.github.io/dpoe/）。
用途：M1 重測時，跟報告裡「很糟糕（必須修）」的三項做修正前後對照。
路徑都在 `/workspace/dpoe_test/` 底下。`shots/` 是桌機 1280×720 附近的畫面，`shots2/` 是 Chrome 裝置模擬的手機直立／橫向畫面。

| # | 檔名 | 對應必須修 | 畫面內容 |
|---|------|-----------|---------|
| 1 | `shots2/m01_home_portrait.png` | 1. 開場後不知道第一步 | 手機直立（模擬）藏身處首頁，「繼續刷 地層出口」縮在左上角一顆小鈕 |
| 2 | `shots/02_intro.png` | 1. 開場後不知道第一步 | 開場畫面（桌機），看完之後沒有指引下一步 |
| 3 | `shots/03_hideout.png` | 1. 開場後不知道第一步 | 開場後進到藏身處（桌機），沒有明確的第一步 |
| 4 | `shots2/bug_m07_passive_tree_portrait_labels_clipped.png` | 2. 天賦樹路線名稱被中央圓蓋住 | 手機直立（模擬）的天賦樹，路線名稱被切掉 |
| 5 | `shots/07_passive_tree.png` | 2. 天賦樹路線名稱被中央圓蓋住 | 桌機天賦樹全景 |
| 6 | `shots2/bug_m27_desktop_passive_tree_path_labels_clipped.png` | 2. 天賦樹路線名稱被中央圓蓋住 | 桌機天賦樹的路線名稱被中央圓蓋住（放大看） |
| 7 | `shots2/m21_landscape_after_rotate.png` | 3. 手機橫放時戰鬥被蓋住 | 轉成橫向（模擬）後，「直立操作：把手機轉直」整片蓋住戰鬥畫面 |
| 8 | `shots2/m22_landscape_after_reload.png` | 3. 手機橫放時戰鬥被蓋住 | 橫向重新整理後還是被蓋住，看不到「改用橫向操作」按鈕 |

共 8 張，三項必須修每項都有手機和桌機的對照（第 3 項只有手機橫向）。
備註：手機畫面都是 Chrome 裝置模擬，沒有在真機上測過。
