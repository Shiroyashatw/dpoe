# dpoe-land-remove：拿掉手機橫向與安裝版（PWA）證據

- 分支：`chore/remove-landscape-pwa-1121`
- base（origin/main）：`8bae3f695fe01ac9b0f78106ffe8848103ed995f`
- 程式改動 commit：`479a5d1399cff1c27d019533630a1db4ce405049`

## 對照截圖（同一場景：新存檔 → proSkip → 自動刷第一個地點 4 秒，Math.random 固定種子）

| 尺寸 | main | 本分支 | 並排 |
|---|---|---|---|
| 390×844 觸控直式 | `main_390x844.png` | `branch_390x844.png` | `cmp_390x844.png` |
| 1280×720 桌機（滑鼠） | `main_1280x720.png` | `branch_1280x720.png` | `cmp_1280x720.png` |

產生方式：`shots.js`（main 開在 8001、本分支開在 8000）。

結論：HUD 與版面一致（頂列、地點名、資源列、小地圖、技能列、血藍條、掛機條、底部分頁／桌機功能列位置都相同）；不同處只有戰鬥中的怪物位置、特效與傷害數字。

兩邊量到的狀態（`shots.js` 印出）：

| | touch | body.port | PORT() | ZOOM | 格寬 C | #rot | .tmenu | manifest | apple-touch-icon |
|---|---|---|---|---|---|---|---|---|---|
| main 390×844 | true | true | true | 0.8125 | 50 | 有 | 有 | 有 | 有 |
| 分支 390×844 | true | true | true | 0.8125 | 50 | 無 | 無 | 無 | 無 |
| main 1280×720 | false | false | false | 1.35 | 36 | 有 | 有 | 有 | 有 |
| 分支 1280×720 | false | false | false | 1.35 | 36 | 無 | 無 | 無 | 無 |
