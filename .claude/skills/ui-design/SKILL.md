---
name: ui-design
description: dungeonPOE 任何動到介面（UI／UX）的工作都用這個，不分大小：HUD（生命球、魔力球、技能列、王血條、小地圖）、面板（背包、倉庫、裝備、技能寶石、天賦樹、地圖台、鍛造、設定）、說明框、canvas 上的 UI、版面、互動（點擊、拖曳、手勢、搖桿）、動畫、提示、說明文字的排版、CSS；使用者說「跑版」「字太小」「字太多」「資訊太多」「介面很亂」「面板超出畫面」「手機按不到」「直立／橫向」「桌機空間浪費」時也用。長相以 skill impeccable 為主（DESIGN.md），互動手感照 apple-design 清單，數值、元件、技術限制與測試尺寸照 docs/介面規範.md；改完在桌機與手機尺寸截圖，手機跑 tools/touch_check.js。
---

# dungeonPOE 介面設計流程

**Impeccable 為主。** 任何動到 UI／UX 的工作（再小的調整也一樣）都走這份。上層《塞令老師》的 CLAUDE.md 寫的「apple-design 為主」在這裡不適用。

## 誰說了算

| 管什麼 | 照誰 |
| --- | --- |
| 長相：顏色、字體、框、層級、版面、文案 | skill `impeccable:impeccable` 與 `DESIGN.md`、`PRODUCT.md`、`.impeccable/surfaces/index-html.md`（Mode: Operate）。`docs/介面規範.md` 的數值跟 `DESIGN.md` 不一致時，改規範 |
| 互動手感：回饋、可打斷、跟手、進出、減少動態 | 下面的 apple-design 清單 |
| 技術限制、測試尺寸、元件 | `docs/介面規範.md`（兩個 skill 都不能推翻）；操作規則在 `docs/企劃書.md` 第 9 節 |

## 依改動大小做到哪

1. **小調整**（改字、移一個按鈕、調間距）：啟動 `impeccable:impeccable`，照它的 Setup 跑 `context`（Windows 用 `impeccable.cmd`）、改之前讀 `reference/craft-floor.md`，改完截圖對照。
2. **改一個面板**：再加改前、改後各一次 Impeccable `critique` 或 `audit`，把分數或問題數附在回覆裡。
3. **新畫面或改版**：走 Impeccable `shape`／new-work，最後 `polish`，做完更新 `DESIGN.md`。
4. **動到互動、動畫、拖曳、手勢**（不分大小）：另外啟動 `apple-design`，有動畫再加 `animate`；手機才有的問題參考 `mobile-native`。

設計偵測 hook 開著：改 UI 檔後它會自動跑，誤報（例如不上線的草圖）用 `/impeccable hooks ignore-value` 排除並寫原因。

## apple-design 清單（實際操作，不要只看程式碼）

- 按下就有回饋（`:active` 縮小），放開才執行；拖曳跟手，抓哪裡就跟哪裡，放開從現在的位置過去。
- 動畫可以被打斷、不擋操作；從畫面上現在的值開始動，不跳。
- 面板、說明框從造成它的東西長出來，進出走同一條路。
- 系統「減少動態」時只淡入淡出。
- 點擊區至少 44px；手機主要按鈕在拇指搆得到的地方。

## 步驟

1. **找程式**：Grep `docs/CODEMAP.md`；面板開關是 `js/hud.js` 的 `openPanel('…')`／`hudPanels()`，HUD 文字用 `setT` 更新，canvas 上的框用 `render.js` 的 `bronzeRect`。
2. **改之前截圖**：在 `dpoe/` 底下開 `python3 -m http.server`（上一層 `.claude/launch.json` 的 `dungeonpoe` 也行，port 8003），網址加 `?p=2` 用測試存檔。最擠的情況也要試（背包滿、詞綴最多、名字最長）。
3. **改**：只用 `css/style.css` `:root` 的變數與 `docs/介面規範.md` 第 3 節的共用元件；JS 不寫死顏色、字級。
4. **檢查與改之後截圖**，跟改之前並排給使用者看：
   - 桌機 1440×900、1280×720：面板不能超出畫面。
   - 手機橫向 844×390、667×375，直立 390×844、375×667：`node tools/touch_check.js 寬 高 [網址]`（要先開本機伺服器）。
   - 字不小於 10px、按鈕不重疊、主要按鈕看得到。
   - 本機改了 CSS／JS 瀏覽器可能用快取：對每個 script／stylesheet `fetch(url, { cache: 'reload' })` 後 `location.reload()`。
5. 照 CLAUDE.md：prettier、codemap、CHANGELOG；新的元件寫進規範第 3 節，新的互動規則寫進第 4 節。
