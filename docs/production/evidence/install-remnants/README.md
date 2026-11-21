# dpoe-install-cleanup：清掉安裝版殘留證據

- 分支：`fix/install-remnants-1121`
- base（origin/main）：`3a80e88acd075252b264229ba1e79f7870c9aa3e`（#156 merge commit）

## 「更多」面板（390×844 觸控直式，新存檔 → proSkip → openPanel('more')）

| 模擬 | 截圖 | fsOK() | 全螢幕鈕 #tfs 顯示 | 「更多」全螢幕列 |
|---|---|---|---|---|
| fullscreenEnabled = false（如 iPhone Safari） | `more_fs_false_390x844.png` | false | 否 | 否 |
| fullscreenEnabled = true（桌機、Android） | `more_fs_true_390x844.png` | true | 是 | 是 |

產生方式：`shots.js`（先開 `python3 -m http.server 8000`；用 `addInitScript` 改 `Document.prototype.fullscreenEnabled`／`webkitFullscreenEnabled`）。
同一組條件也寫進 `tools/check.js`（「全螢幕 fullscreenEnabled=false／true」兩項）。
