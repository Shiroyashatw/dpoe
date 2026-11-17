# dpoe 視覺量測 1117（只有數據）

## Build 與環境

- 遊戲版本（頁面上的 `VER`）：**0.5.4**；原始碼 commit `872e7f9`（= `origin/main` 量測當時的 HEAD）。
- **沒有量到線上版**：這個雲端工作階段的對外代理拒絕連到 `shiroyashatw.github.io`（CONNECT 403，`connect_rejected`），所以改在本機用 `python3 -m http.server 8000` 開同一個 commit 的檔案量測。GitHub Pages 部署的是 `main`，但線上實際部署的版本是否就是這個 commit，這裡沒辦法確認。
- 瀏覽器：Playwright 1.5x＋預裝 Chromium（`/opt/pw-browsers/chromium`，headless）。Supabase 請求全部擋掉（本機本來就不連雲端）。
- 字型：Google Fonts 連得到，量測時已載入 Noto Sans TC 400, Noto Sans TC 500, Noto Sans TC 700, Noto Serif TC 900。
- 尺寸 A `portrait`：390×844、deviceScaleFactor 3、isMobile＋hasTouch（截圖 1170×2532）。
- 尺寸 B `desktop`：1280×720、deviceScaleFactor 1、滑鼠。

## 走到的畫面

每個畫面都是新存檔（localStorage 清空）一路走下來；遊戲狀態用頁面上已有的全域函式推進（沒有改任何程式），每張怎麼到的寫在「怎麼到」。
進戰鬥前先塞了資料讓面板有東西：倉庫 24 件 `dropItem`、靈魂 12000、每種通貨 +7、木 800、`S.camp.forge=3`、`S.camp.altar=2`（天賦樹那張再設 4）、`S.auto=1`。

### portrait

| 畫面 | DOM 文字 | 被蓋住略過 | DOM 不合格 | canvas 字 | canvas 不合格 | 高彩度色數 | 平均飽和 | 平均明度 | 怎麼到 |
|---|---|---|---|---|---|---|---|---|---|
| 01_開場動畫 | 9 | 6 | 0 | 0 | 0 | 0 | 0.018 | 0.022 | 新存檔（localStorage 清空）重新整理後 2.5 秒，開場動畫播放中 |
| 02_藏身處 | 20 | 0 | 0 | 11 | 4 | 0 | 0.413 | 0.241 | introStop()＋proSkip() 跳過開場，落在藏身處 |
| 03_地點清單 | 20 | 0 | 0 | 12 | 8 | 0 | 0.391 | 0.247 | openPanel("node")（地點清單＝唯一入口） |
| 04_戰鬥中 | 23 | 0 | 1 | 4 | 4 | 0 | 0.377 | 0.246 | runNode(TRUNK_K[0]) 自動戰鬥 7 秒（含 canvas 傷害數字） |
| 05_戰鬥_橫幅 | 24 | 0 | 1 | 6 | 2 | 0 | 0.379 | 0.236 | 戰鬥中呼叫 banner("崇高石 ×1","cur")（稀有掉落橫幅） |
| 06_戰鬥_掉落紀錄 | 27 | 0 | 1 | 5 | 3 | 0 | 0.378 | 0.248 | 呼叫 dropLog() 四次，HUD 的掉落紀錄列 |
| 07_戰利品倉庫 | 21 | 0 | 1 | 8 | 4 | 0 | 0.352 | 0.233 | navGo("bag") |
| 08_物品說明_點擊 | 36 | 0 | 2 | 6 | 5 | 1 | 0.361 | 0.262 | 戰利品清單點第一件（手機 tap），出換裝卡／說明 |
| 09_角色 | 57 | 8 | 3 | 2 | 2 | 0 | 0.353 | 0.223 | navGo("char") |
| 10_技能總覽 | 28 | 0 | 2 | 5 | 2 | 1 | 0.348 | 0.249 | skill 面板 |
| 11_技能這一招 | 36 | 8 | 3 | 6 | 2 | 1 | 0.349 | 0.236 | 技能總覽點第一招 |
| 12_營地總覽 | 46 | 3 | 0 | 6 | 6 | 0 | 0.353 | 0.269 | CRAFT.tab="camp" 開營地面板 |
| 13_產生器_林場展開 | 46 | 3 | 0 | 3 | 3 | 0 | 0.353 | 0.262 | 營地總覽點林場卡標題 [data-fg="cc:wood"]（捲到看得到）；CAMPUI.open=wood |
| 14_營地設施_鍛造台展開 | 69 | 32 | 1 | 4 | 3 | 0 | 0.362 | 0.259 | 點鍛造台卡標題 [data-fg="cc:forge"]；CAMPUI.open=forge |
| 15_打造 | 40 | 6 | 1 | 4 | 2 | 1 | 0.355 | 0.257 | CRAFT.tab="make"（鍛造／打造頁） |
| 16_鍛造台_填 | 20 | 0 | 1 | 5 | 2 | 0 | 0.306 | 0.273 | CRAFT.tab="forge"（S.camp.forge=3 開的鍛造台分頁） |
| 17_通貨 | 41 | 2 | 0 | 6 | 3 | 1 | 0.338 | 0.247 | openPanel("stash")，PANEL.stab="cur" |
| 18_掉落紀錄面板 | 30 | 0 | 0 | 6 | 5 | 0 | 0.352 | 0.218 | openPanel("log") |
| 19_更多 | 28 | 0 | 0 | 5 | 4 | 1 | 0.343 | 0.247 | navGo("more") |
| 20_設定 | 29 | 1 | 0 | 4 | 2 | 0 | 0.344 | 0.28 | openPanel("set") |
| 21_名詞說明_點擊 | 40 | 11 | 1 | 3 | 2 | 0 | 0.341 | 0.247 | 技能這一招裡第一個名詞（tap） |
| 22_天賦樹 | 26 | 8 | 0 | 4 | 1 | 0 | 0.448 | 0.13 | S.camp.altar=4（祭壇夠了才開天賦樹）＋treeOpen() |
| 23_彈窗_打造翻牌 | 88 | 35 | 3 | 4 | 2 | 0 | 0.372 | 0.238 | 給材料、營地→打造頁、呼叫 craftGo()（同打造鈕），出 revealOpen 打造模式；結果：true |
| 24_彈窗_離線結算 | 40 | 3 | 1 | 3 | 2 | 0 | 0.364 | 0.257 | offShow(null,{wood:1234,iron:56},1 小時) |
| 25_彈窗_回家確認 | 16 | 12 | 0 | 1 | 0 | 0 | 0.439 | 0.125 | S.auto=0＋G.ask="home"（回藏身處確認卡） |
| 26_死亡卡 | 24 | 13 | 1 | 1 | 0 | 0 | 0.407 | 0.145 | S.auto=0、P.hp=0、die()（手動模式死亡卡） |

### desktop

| 畫面 | DOM 文字 | 被蓋住略過 | DOM 不合格 | canvas 字 | canvas 不合格 | 高彩度色數 | 平均飽和 | 平均明度 | 怎麼到 |
|---|---|---|---|---|---|---|---|---|---|
| 01_開場動畫 | 3 | 0 | 0 | 0 | 0 | 0 | 0.007 | 0.011 | 新存檔（localStorage 清空）重新整理後 2.5 秒，開場動畫播放中 |
| 02_藏身處 | 29 | 0 | 1 | 12 | 9 | 0 | 0.308 | 0.198 | introStop()＋proSkip() 跳過開場，落在藏身處 |
| 03_地點清單 | 29 | 0 | 1 | 14 | 12 | 0 | 0.366 | 0.203 | openPanel("node")（地點清單＝唯一入口） |
| 04_戰鬥中 | 33 | 0 | 2 | 22 | 20 | 0 | 0.468 | 0.214 | runNode(TRUNK_K[0]) 自動戰鬥 7 秒（含 canvas 傷害數字） |
| 05_戰鬥_橫幅 | 34 | 0 | 2 | 20 | 9 | 0 | 0.473 | 0.2 | 戰鬥中呼叫 banner("崇高石 ×1","cur")（稀有掉落橫幅） |
| 06_戰鬥_掉落紀錄 | 37 | 0 | 2 | 17 | 11 | 0 | 0.473 | 0.211 | 呼叫 dropLog() 四次，HUD 的掉落紀錄列 |
| 07_戰利品倉庫 | 32 | 0 | 2 | 21 | 7 | 0 | 0.434 | 0.185 | openPanel("inv") |
| 08_物品說明_hover | 37 | 6 | 2 | 6 | 5 | 0 | 0.497 | 0.198 | 戰利品清單滑鼠移到第一件（hover） |
| 09_角色 | 96 | 34 | 2 | 5 | 4 | 0 | 0.417 | 0.178 | NAV.view="char"＋hudPanels() |
| 10_技能總覽 | 38 | 0 | 4 | 1 | 1 | 0 | 0.418 | 0.179 | skill 面板 |
| 11_技能這一招 | 48 | 9 | 3 | 1 | 0 | 0 | 0.419 | 0.181 | 技能總覽點第一招 |
| 12_營地總覽 | 69 | 10 | 2 | 1 | 0 | 0 | 0.399 | 0.194 | CRAFT.tab="camp" 開營地面板 |
| 13_產生器_林場展開 | 69 | 10 | 2 | 2 | 0 | 0 | 0.391 | 0.183 | 營地總覽點林場卡標題 [data-fg="cc:wood"]（捲到看得到）；CAMPUI.open=wood |
| 14_營地設施_鍛造台展開 | 77 | 25 | 3 | 6 | 5 | 0 | 0.468 | 0.198 | 點鍛造台卡標題 [data-fg="cc:forge"]；CAMPUI.open=forge |
| 15_打造 | 113 | 32 | 3 | 7 | 7 | 0 | 0.444 | 0.208 | CRAFT.tab="make"（鍛造／打造頁） |
| 16_鍛造台_填 | 91 | 28 | 2 | 6 | 5 | 0 | 0.452 | 0.175 | CRAFT.tab="forge"（S.camp.forge=3 開的鍛造台分頁） |
| 17_通貨 | 97 | 28 | 6 | 5 | 4 | 0 | 0.373 | 0.158 | openPanel("stash")，PANEL.stab="cur" |
| 18_掉落紀錄面板 | 41 | 1 | 3 | 3 | 0 | 0 | 0.394 | 0.143 | openPanel("log") |
| 20_設定 | 50 | 16 | 0 | 2 | 2 | 0 | 0.362 | 0.154 | openPanel("set") |
| 21_名詞說明_hover | 50 | 8 | 2 | 8 | 5 | 0 | 0.516 | 0.187 | 技能這一招裡第一個名詞（hover 後 click；只 hover 不會出說明） |
| 22_天賦樹 | 47 | 25 | 0 | 8 | 2 | 0 | 0.456 | 0.117 | S.camp.altar=4（祭壇夠了才開天賦樹）＋treeOpen() |
| 23_彈窗_打造翻牌 | 163 | 56 | 3 | 13 | 5 | 0 | 0.425 | 0.203 | 給材料、營地→打造頁、呼叫 craftGo()（同打造鈕），出 revealOpen 打造模式；結果：true |
| 24_彈窗_離線結算 | 51 | 4 | 1 | 15 | 9 | 0 | 0.368 | 0.148 | offShow(null,{wood:1234,iron:56},1 小時) |
| 25_彈窗_回家確認 | 31 | 25 | 1 | 1 | 0 | 0 | 0.414 | 0.072 | S.auto=0＋G.ask="home"（回藏身處確認卡） |
| 26_死亡卡 | 33 | 22 | 1 | 1 | 0 | 0 | 0.507 | 0.085 | S.auto=0、P.hp=0、die()（手動模式死亡卡） |

## 走不到／沒量的畫面

- **線上版本身**：代理擋住 github.io（見上）。
- **主選單**：遊戲沒有獨立的主選單；新存檔第一個畫面是開場動畫的標題（「dungeonPOE」＋「開始」），截在 `01_開場動畫`。
- **手機的 hover tooltip**：手機沒有 hover。物品說明在直立是「點一件 → 換裝卡（`.foot.sel`）」，不是 `#tip` 說明框，截在 `08_物品說明_點擊`；名詞說明點擊後出 `#ttip`（`21_名詞說明_點擊`）。遊戲沒有長按手勢，沒做長按。
- **桌機名詞說明**：只 hover 不會出 `#ttip`，要點；`21_名詞說明_hover` 是 hover 後再 click。
- **昇華石碑、山海寶盒**：`PANEL_LOCK`（`lockTxt("asc"/"box")`）要營地進度才開，這次沒有把存檔推到那裡，沒量。
- **世界地圖、商人、NPC、序章**：0.5.2 起已從遊戲刪除（CLAUDE.md），不存在。
- **手機橫向、其他尺寸**：不在本次要求的兩個尺寸內，沒量。
- **帳號（雲端登入）面板**：本機不連雲端，沒量。

## portrait 不合格數量

- DOM 文字：733 筆量測，最不利背景下不合格 **23** 筆；最常見背景下不合格 12 筆。
  - 去掉跨畫面重複（同 selector＋同文字）後：17 種。
- canvas 文字（`fillText`）：120 筆，不合格 **73** 筆（取樣方式不同，見限制）。
  - 另有 4 筆透明度 < 0.1（淡出中的跳數字）不計。

## desktop 不合格數量

- DOM 文字：1059 筆量測，最不利背景下不合格 **50** 筆；最常見背景下不合格 9 筆。
  - 去掉跨畫面重複（同 selector＋同文字）後：15 種。
- canvas 文字（`fillText`）：179 筆，不合格 **122** 筆（取樣方式不同，見限制）。
  - 另有 18 筆透明度 < 0.1（淡出中的跳數字）不計。

## 對比最差前 20 名（DOM 文字，照最不利背景排序；同 selector＋文字＋顏色跨畫面只列一次）

| # | 尺寸 | 畫面 | selector | 文字 | px | 粗 | 文字色 | 常見背景 | 最不利背景 | 比（常見） | 比（最不利） | 門檻 | CSS | 行 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | portrait | 06_戰鬥_掉落紀錄 | `div#banner` | 崇高石 ×1 | 20 | 900 | `#f1ebdc` | `#212f3d` | `#f7f7f8` | 11.48 | 1.11 | 3.0 | color:--gold / bg:rgba(13, 14, 17, 0.88) @div#banner | c:1387 bg:1383 |
| 2 | portrait | 10_技能總覽 | `div.paper.strip>div>div.big` | 38 | 28 | 700 | `#2a1a12` | `#e6d9bd` | `#332a23` | 11.97 | 1.19 | 3.0 | color:--ink / bg:--paper @div.paper.strip>div>div.big | c:1943 bg:1943 |
| 3 | desktop | 10_技能總覽 | `div.paper.strip>div>div.big` | 43 | 28 | 700 | `#2a1a12` | `#e6d9bd` | `#332a23` | 11.97 | 1.19 | 3.0 | color:--ink / bg:--paper @div.paper.strip>div>div.big | c:1943 bg:1943 |
| 4 | portrait | 21_名詞說明_點擊 | `div.sk-info>section.sk-sec>button.sk-more` | 算式與詳細 › | 12 | 500 | `#a6957e` | `#26201b` | `#907956` | 5.53 | 1.43 | 4.5 | color:--dim / bg:--s1 @div#pskill | c:1821 bg:1892 |
| 5 | desktop | 11_技能這一招 | `div#prog>b` | 首領進度 | 12 | 700 | `#a6957e` | `#332318` | `#90bec9` | 5.18 | 1.44 | 4.5 | color:--dim / bg:--bg @html>body.ai.gxs | c:542 bg:1881 |
| 6 | desktop | 18_掉落紀錄面板 | `div#prog>b` | 首領進度 | 12 | 700 | `#a6957e` | `#38291e` | `#d54347` | 4.8 | 1.53 | 4.5 | color:--dim / bg:--bg @html>body.ai | c:542 bg:1881 |
| 7 | desktop | 02_藏身處 | `div#bar>div.sk>kbd` | 左鍵 | 11 | 700 | `#d9cdb4` | `#1e1814` | `#8d9aa8` | 11.16 | 1.82 | 4.5 | color:--title / bg:--s0 @div#bar>div.sk | c:535 bg:804 |
| 8 | portrait | 11_技能這一招 | `div.sk-info>p.sk-p>button.term.kw` | 擊中 | 14 | 500 | `#9aa6ff` | `#26201b` | `#907956` | 7.11 | 1.83 | 4.5 | color:--affix / bg:--s1 @div#pskill | c:1818 bg:1892 |
| 9 | portrait | 07_戰利品倉庫 | `div#dlog>p.lg-cur` | 崇高石 | 12 | 500 | `#f1ebdc` | `#442832` | `#a5a7a7` | 11.07 | 2.03 | 4.5 | color:--gold / bg:--bg @html>body.touch.port | c:1396 bg:1881 |
| 10 | portrait | 08_物品說明_點擊 | `div>ul>li.none` | （空） | 13 | 500 | `#6a5a48` | `#332a23` | `#332a23` | 2.12 | 2.12 | 4.5 | color:rgb(106, 90, 72) / bg:--s2 @div.foot.sel>div.cmpc>div | c:2057 bg:2039 |
| 11 | desktop | 23_彈窗_打造翻牌 | `div>ul>li.none` | （空） | 13 | 500 | `#6a5a48` | `#332a23` | `#332a23` | 2.12 | 2.12 | 4.5 | color:rgb(106, 90, 72) / bg:--s2 @div.foot.sel>div.cmpc>div | c:2057 bg:2039 |
| 12 | desktop | 04_戰鬥中 | `div#mech>button.stc.bad>b` | 5 | 11 | 700 | `#d9cdb4` | `#2f2015` | `#e0553f` | 9.97 | 2.41 | 4.5 | color:--tx / bg:--s0 @div#mech>button.stc.bad | c:728 bg:724 |
| 13 | desktop | 11_技能這一招 | `div#mech>button.stc.bad>b` | 4 | 11 | 700 | `#d9cdb4` | `#1e1814` | `#e0553f` | 11.16 | 2.41 | 4.5 | color:--tx / bg:--s0 @div#mech>button.stc.bad | c:728 bg:724 |
| 14 | portrait | 05_戰鬥_橫幅 | `div#area` | 地層出口 · 1★ · 怪物 L | 14 | 500 | `#d9cdb4` | `#151f28` | `#7f7f7f` | 10.6 | 2.54 | 4.5 | color:--milk / bg:rgba(0, 0, 0, 0.5) @div#area | c:1919 bg:1919 |
| 15 | portrait | 11_技能這一招 | `div.sk-one>div.sk-info>p.sk-p` | 往前方扇形斬擊， 的敵人越多回復 | 14 | 500 | `#d9cdb4` | `#26201b` | `#907956` | 10.22 | 2.64 | 4.5 | color:--tx / bg:--s1 @div#pskill | c:1723 bg:1892 |
| 16 | portrait | 11_技能這一招 | `div.sk-info>p.sk-p>span.n` | 1 | 14 | 700 | `#d9cdb4` | `#26201b` | `#907956` | 10.22 | 2.64 | 4.5 | color:--tx / bg:--s1 @div#pskill | c:1723 bg:1892 |
| 17 | desktop | 17_通貨 | `div.cupg>button.cub>em` | 8 | 11 | 700 | `#d9cdb4` | `#1e1814` | `#907956` | 11.16 | 2.64 | 4.5 | color:--tx / bg:--s0 @div#pstash>div.cupg>button.cub | c:1367 bg:1363 |
| 18 | desktop | 17_通貨 | `div.cupg>button.cub>em` | 7 | 11 | 700 | `#d9cdb4` | `#1e1814` | `#907956` | 11.16 | 2.64 | 4.5 | color:--tx / bg:--s0 @div#pstash>div.cupg>button.cub | c:1367 bg:1363 |
| 19 | portrait | 04_戰鬥中 | `div#area` | 地層出口 · 1★ · 怪物 L | 14 | 500 | `#d9cdb4` | `#151f28` | `#6b7f7f` | 10.6 | 2.69 | 4.5 | color:--milk / bg:rgba(0, 0, 0, 0.5) @div#area | c:1919 bg:1919 |
| 20 | desktop | 12_營地總覽 | `div#mech>button.stc.bad>b` | 4 | 11 | 700 | `#d9cdb4` | `#322419` | `#d24f3b` | 9.52 | 2.71 | 4.5 | color:--tx / bg:--s0 @div#mech>button.stc.bad | c:728 bg:724 |

## 對比最差前 20 名（canvas 文字，參考）

| # | 尺寸 | 畫面 | selector | 文字 | px | 粗 | 文字色 | 常見背景 | 最不利背景 | 比（常見） | 比（最不利） | 門檻 | CSS | 行 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | portrait | 03_地點清單 | `canvas#cv:fillText` | 1 | 17.0 | 700 | `#ff5a5a` | `#ff638f` | `#d67881` | 1.08 | 1.0 | 4.5 | (canvas，js/render.js 的 fillStyle) |  |
| 2 | portrait | 06_戰鬥_掉落紀錄 | `canvas#cv:fillText` | +4 金 | 14.0 | 700 | `#ffd166` | `#000000` | `#ffd166` | 14.56 | 1.0 | 4.5 | (canvas，js/render.js 的 fillStyle) |  |
| 3 | portrait | 07_戰利品倉庫 | `canvas#cv:fillText` | 22 | 24.0 | 700 | `#ffd166` | `#fffd74` | `#ffd166` | 1.34 | 1.0 | 3.0 | (canvas，js/render.js 的 fillStyle) |  |
| 4 | portrait | 07_戰利品倉庫 | `canvas#cv:fillText` | +7 金 | 21.0 | 700 | `#ffd166` | `#22303e` | `#ffd166` | 9.33 | 1.0 | 3.0 | (canvas，js/render.js 的 fillStyle) |  |
| 5 | portrait | 08_物品說明_點擊 | `canvas#cv:fillText` | 4 | 17.0 | 700 | `#ff5a5a@a0.42` | `#2d4355` | `#498396` | 1.55 | 1.0 | 4.5 | (canvas，js/render.js 的 fillStyle) |  |
| 6 | portrait | 19_更多 | `canvas#cv:fillText` | 14 | 24.0 | 700 | `#ffd166` | `#556871` | `#cedad3` | 4.04 | 1.0 | 3.0 | (canvas，js/render.js 的 fillStyle) |  |
| 7 | desktop | 03_地點清單 | `canvas#cv:fillText` | 8 | 15.0 | 700 | `#fff3e0@a0.42` | `#fdfcf6` | `#fdf8aa` | 1.03 | 1.0 | 4.5 | (canvas，js/render.js 的 fillStyle) |  |
| 8 | desktop | 04_戰鬥中 | `canvas#cv:fillText` | 16 | 24.0 | 700 | `#ffd166@a0.23` | `#f7ca62` | `#ffd066` | 1.02 | 1.0 | 3.0 | (canvas，js/render.js 的 fillStyle) |  |
| 9 | desktop | 04_戰鬥中 | `canvas#cv:fillText` | 17 | 24.0 | 700 | `#ffd166@a0.23` | `#fbcd64` | `#ffd266` | 1.01 | 1.0 | 3.0 | (canvas，js/render.js 的 fillStyle) |  |
| 10 | desktop | 04_戰鬥中 | `canvas#cv:fillText` | 21 | 36.0 | 700 | `#ffd166` | `#ffd869` | `#ffd166` | 1.05 | 1.0 | 3.0 | (canvas，js/render.js 的 fillStyle) |  |
| 11 | desktop | 05_戰鬥_橫幅 | `canvas#cv:fillText` | 11 | 15.0 | 700 | `#fff3e0` | `#0d0905` | `#fff3df` | 18.09 | 1.0 | 4.5 | (canvas，js/render.js 的 fillStyle) |  |
| 12 | desktop | 07_戰利品倉庫 | `canvas#cv:fillText` | 20 | 24.0 | 700 | `#ffd166@a0.74` | `#221e17` | `#c0d9ed` | 6.89 | 1.0 | 3.0 | (canvas，js/render.js 的 fillStyle) |  |
| 13 | desktop | 07_戰利品倉庫 | `canvas#cv:fillText` | +5 金 | 14.0 | 700 | `#ffd166` | `#ffd166` | `#ffd166` | 1.0 | 1.0 | 4.5 | (canvas，js/render.js 的 fillStyle) |  |
| 14 | desktop | 08_物品說明_hover | `canvas#cv:fillText` | 5 | 17.0 | 700 | `#ff5a5a` | `#090604` | `#ff5a59` | 6.6 | 1.0 | 4.5 | (canvas，js/render.js 的 fillStyle) |  |
| 15 | desktop | 15_打造 | `canvas#cv:fillText` | 7 | 15.0 | 700 | `#fff3e0` | `#6a372d` | `#fff3e0` | 8.71 | 1.0 | 4.5 | (canvas，js/render.js 的 fillStyle) |  |
| 16 | desktop | 15_打造 | `canvas#cv:fillText` | 5 | 15.0 | 700 | `#fff3e0` | `#fff3e0` | `#fff3e0` | 1.0 | 1.0 | 4.5 | (canvas，js/render.js 的 fillStyle) |  |
| 17 | desktop | 16_鍛造台_填 | `canvas#cv:fillText` | 7 | 15.0 | 700 | `#fff3e0@a0.37` | `#fff3e0` | `#fff3e0` | 1.0 | 1.0 | 4.5 | (canvas，js/render.js 的 fillStyle) |  |
| 18 | desktop | 17_通貨 | `canvas#cv:fillText` | 14 | 15.0 | 700 | `#fff3e0` | `#f2f5f5` | `#f2f5f5` | 1.0 | 1.0 | 4.5 | (canvas，js/render.js 的 fillStyle) |  |
| 19 | portrait | 03_地點清單 | `canvas#cv:fillText` | 19 | 24.0 | 700 | `#ffd166` | `#5d3c26` | `#ecd95e` | 6.81 | 1.01 | 3.0 | (canvas，js/render.js 的 fillStyle) |  |
| 20 | desktop | 03_地點清單 | `canvas#cv:fillText` | 10 | 15.0 | 700 | `#fff3e0@a0.42` | `#fefd8b` | `#fefd8b` | 1.01 | 1.01 | 4.5 | (canvas，js/render.js 的 fillStyle) |  |

## 對比最差前 20 名（DOM，照最常見背景排序）

| # | 尺寸 | 畫面 | selector | 文字 | px | 粗 | 文字色 | 常見背景 | 最不利背景 | 比（常見） | 比（最不利） | 門檻 | CSS | 行 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | portrait | 08_物品說明_點擊 | `div>ul>li.none` | （空） | 13 | 500 | `#6a5a48` | `#332a23` | `#332a23` | 2.12 | 2.12 | 4.5 | color:rgb(106, 90, 72) / bg:--s2 @div.foot.sel>div.cmpc>div | c:2057 bg:2039 |
| 2 | desktop | 23_彈窗_打造翻牌 | `div>ul>li.none` | （空） | 13 | 500 | `#6a5a48` | `#332a23` | `#332a23` | 2.12 | 2.12 | 4.5 | color:rgb(106, 90, 72) / bg:--s2 @div.foot.sel>div.cmpc>div | c:2057 bg:2039 |
| 3 | portrait | 09_角色 | `div.res>span.res-fire.neg>b` | −20% | 13 | 700 | `#e0553f` | `#26201b` | `#26201b` | 4.25 | 4.25 | 4.5 | color:--bad / bg:--s1 @div#pinv | c:2076 bg:1892 |
| 4 | portrait | 09_角色 | `div.res>span.res-cold.neg>b` | −20% | 13 | 700 | `#e0553f` | `#26201b` | `#26201b` | 4.25 | 4.25 | 4.5 | color:--bad / bg:--s1 @div#pinv | c:2076 bg:1892 |
| 5 | portrait | 09_角色 | `div.res>span.res-light.neg>b` | −20% | 13 | 700 | `#e0553f` | `#26201b` | `#26201b` | 4.25 | 4.25 | 4.5 | color:--bad / bg:--s1 @div#pinv | c:2076 bg:1892 |
| 6 | portrait | 26_死亡卡 | `div.card.dead>p.ddeath>b` | 紙人 | 14 | 700 | `#e0553f` | `#26201b` | `#26201b` | 4.25 | 4.25 | 4.5 | color:--bad / bg:--s1 @div#over>div.card.dead | c:734 bg:2133 |
| 7 | desktop | 26_死亡卡 | `div.card.dead>p.ddeath>b` | 熔岩魔像 | 14 | 700 | `#e0553f` | `#26201b` | `#26201b` | 4.25 | 4.25 | 4.5 | color:--bad / bg:--s1 @div#over>div.card.dead | c:734 bg:2133 |
| 8 | desktop | 24_彈窗_離線結算 | `div.sumh>button.btn.pri>small` | 產生器照最便宜的先買 | 11 | 500 | `#f3e4d2@a0.85` | `#993f2d` | `#9a402d` | 4.39 | 4.34 | 4.5 | color:rgba(243, 228, 210, 0.85) / bg:--act-hi,--act @div#preveal>div.s | c:1930 bg:2279 |
| 9 | desktop | 25_彈窗_回家確認 | `div.pbtns>button.btn.pri>small` | T | 11 | 500 | `#f3e4d2@a0.85` | `#993f2d` | `#9f422e` | 4.39 | 4.16 | 4.5 | color:rgba(243, 228, 210, 0.85) / bg:--act-hi,--act @div.card.ask>div. | c:1930 bg:2279 |
| 10 | portrait | 10_技能總覽 | `div.skr>div.skr-2>button.skr-up` | Lv 2 要角色 Lv 3 | 14 | 700 | `#a6957e` | `#3a3027` | `#3a3027` | 4.43 | 4.43 | 4.5 | color:--milk2 / bg:--s3 @div.skr>div.skr-2>button.skr-up | c:2348 bg:2348 |
| 11 | portrait | 14_營地設施_鍛造台展開 | `div#cc-hide>button.btn.wide` | 缺生皮 6 | 14 | 700 | `#a6957e` | `#3a3027` | `#3a3027` | 4.43 | 4.43 | 4.5 | color:--milk2 / bg:--s3 @div#cc-hide>button.btn.wide | c:2282 bg:2282 |
| 12 | portrait | 15_打造 | `div.fmake>div.mkgo>button.btn.pri` | 生鐵還差 7 | 16 | 700 | `#a6957e` | `#3a3027` | `#3a3027` | 4.43 | 4.43 | 4.5 | color:--milk2 / bg:--s3 @div.fmake>div.mkgo>button.btn.pri | c:2282 bg:2282 |
| 13 | desktop | 10_技能總覽 | `div.skr>div.skr-2>button.skr-up` | Lv 2 要角色 Lv 3 | 14 | 700 | `#a6957e` | `#3a3027` | `#3a3027` | 4.43 | 4.43 | 4.5 | color:--milk2 / bg:--s3 @div.skr>div.skr-2>button.skr-up | c:2348 bg:2348 |
| 14 | desktop | 14_營地設施_鍛造台展開 | `div#cc-watch>button.btn.wide` | 缺生鐵 9 | 14 | 700 | `#a6957e` | `#3a3027` | `#3a3027` | 4.43 | 4.43 | 4.5 | color:--milk2 / bg:--s3 @div#cc-watch>button.btn.wide | c:2282 bg:2282 |
| 15 | desktop | 15_打造 | `div.fmake>div.mkgo>button.btn.pri` | 生鐵還差 7 | 16 | 700 | `#a6957e` | `#3a3027` | `#3a3027` | 4.43 | 4.43 | 4.5 | color:--milk2 / bg:--s3 @div.fmake>div.mkgo>button.btn.pri | c:2282 bg:2282 |
| 16 | portrait | 26_死亡卡 | `div#over>div.card.dead>h2.c-bad` | 你倒下了 | 22 | 900 | `#e8574f` | `#26201b` | `#26201b` | 4.53 | 4.53 | 3.0 | color:--bad-hi / bg:--s1 @div#over>div.card.dead | c:1880 bg:2133 |
| 17 | desktop | 26_死亡卡 | `div#over>div.card.dead>h2.c-bad` | 你倒下了 | 22 | 900 | `#e8574f` | `#26201b` | `#26201b` | 4.53 | 4.53 | 3.0 | color:--bad-hi / bg:--s1 @div#over>div.card.dead | c:1880 bg:2133 |
| 18 | portrait | 24_彈窗_離線結算 | `div.sumh>button.btn.pri>small` | 產生器照最便宜的先買 | 11 | 500 | `#f3e4d2@a0.85` | `#953d2c` | `#9b402d` | 4.55 | 4.31 | 4.5 | color:rgba(243, 228, 210, 0.85) / bg:--act-hi,--act @div#preveal>div.s | c:1930 bg:2279 |
| 19 | desktop | 10_技能總覽 | `div#prog>b` | 首領進度 | 12 | 700 | `#a6957e` | `#38291e` | `#38291e` | 4.8 | 4.8 | 4.5 | color:--dim / bg:--bg @html>body.ai.gxs | c:542 bg:1881 |
| 20 | portrait | 02_藏身處 | `div.paper.idl>div.k.row2>span` | 本次掛機・0 分・0 輪 | 12 | 500 | `#a6957e` | `#332a23` | `#332a23` | 4.83 | 4.83 | 4.5 | color:--milk2 / bg:--s2 @div#pidle>div.paper.idl | c:1942 bg:1941 |

## 量測方法

1. `tools/capture.js`：頁面一載入就包一層 `requestAnimationFrame`（可凍結）與 `CanvasRenderingContext2D.fillText`／`strokeText`（記下每一格畫的字、字型、fillStyle、globalAlpha、轉換後的外框、緊接著的描邊）。
2. 每個畫面：凍結 rAF＋暫停所有 CSS 動畫與 transition → 截圖（`shots/`）→ 在頁面裡列出所有非空白文字節點的父元素：
   - 外框：`Range.getClientRects()`，裁到視窗內；中心點 `elementFromPoint`（暫時把所有元素設 `pointer-events:auto`）不是自己或祖先／子孫的算「被蓋住」，不列入 CSV。
   - 文字色：computed `-webkit-text-fill-color`／`color` 的 alpha × 自己到 `<html>` 每一層的 `opacity`。
   - 字級、粗細；大字＝≥24px 或 ≥18.66px 且粗細 ≥700；門檻一般 4.5、大字 3.0。
   - CSS 對應：在 `css/style.css` 的規則（含符合目前 `@media` 的）裡，從元素往上找第一個有寫 `color` 的元素，取**原始碼順序最後一條**符合的規則（沒有算 specificity）；背景同理，往上找第一個背景不透明或有背景圖的元素。`css_token` 列出 `var(--x)`，沒有變數就寫原始值；`css_line` 是那條規則裡該屬性所在行（`c:` 文字色、`bg:` 背景）。行內 style 寫 `(inline style)`。
3. 再加一層樣式把所有 DOM 文字（含 ::before/::after、SVG text）設成透明、拿掉 text-shadow，重拍一張背景圖（沒有放進 repo，可重現）。
4. `tools/analyze.py`：每個文字外框（外擴 2 CSS px，乘 dpr）在背景圖裡取像素：
   - 最常見色＝出現最多次的像素色；最不利色＝佔外框面積 ≥2% 的顏色裡，跟文字對比最低的那個（去掉反鋸齒雜點）。
   - 文字色有 alpha 時先跟該背景色合成，再算 WCAG 2.x 相對亮度對比。
   - canvas 字：無法單獨隱藏，改取原截圖裡外框**外面一圈**（2 CSS px 寬）的像素；`note` 欄寫有沒有描邊（`strokeText` 的顏色與寬度），對比沒有把描邊算進去。
5. 配色：每張截圖縮成每個 CSS 像素一格（BOX 平均），Pillow median-cut 量化成 16 色，輸出 hex、面積%、HSV（`palette.csv`）。「高彩度色數」＝16 色裡 S≥0.5、V≥0.5、面積 ≥0.5% 的個數。飽和度與明度分布（0–0.2…0.8–1 五段、%）在下面。

## 飽和度與明度分布（% 像素，五段：0–.2／.2–.4／.4–.6／.6–.8／.8–1）

| 尺寸 | 畫面 | 飽和度 | 明度 |
|---|---|---|---|
| portrait | 01_開場動畫 | 97.4 / 0.4 / 0.0 / 2.2 / 0.0 | 96.5 / 0.1 / 1.1 / 1.7 / 0.6 |
| portrait | 02_藏身處 | 2.2 / 57.6 / 23.1 / 16.7 / 0.3 | 51.8 / 32.9 / 9.1 / 4.5 / 1.7 |
| portrait | 03_地點清單 | 4.3 / 63.0 / 15.4 / 16.8 / 0.5 | 54.8 / 30.3 / 9.2 / 2.6 / 3.1 |
| portrait | 04_戰鬥中 | 3.7 / 59.8 / 28.2 / 8.2 / 0.0 | 47.7 / 36.1 / 9.3 / 5.2 / 1.7 |
| portrait | 05_戰鬥_橫幅 | 3.7 / 59.3 / 28.3 / 8.5 / 0.1 | 51.2 / 33.3 / 9.5 / 4.8 / 1.3 |
| portrait | 06_戰鬥_掉落紀錄 | 4.1 / 60.6 / 25.6 / 9.6 / 0.1 | 50.7 / 31.7 / 9.6 / 6.1 / 1.8 |
| portrait | 07_戰利品倉庫 | 5.7 / 71.2 / 15.7 / 6.7 / 0.7 | 59.9 / 26.0 / 8.5 / 2.1 / 3.5 |
| portrait | 08_物品說明_點擊 | 5.8 / 62.8 / 26.4 / 4.8 / 0.1 | 30.2 / 54.9 / 7.6 / 3.3 / 4.0 |
| portrait | 09_角色 | 4.3 / 64.7 / 26.8 / 3.6 / 0.6 | 66.6 / 22.4 / 6.6 / 1.8 / 2.7 |
| portrait | 10_技能總覽 | 5.8 / 65.6 / 24.8 / 3.7 / 0.1 | 45.0 / 41.3 / 7.3 / 2.7 / 3.6 |
| portrait | 11_技能這一招 | 5.3 / 64.9 / 26.3 / 3.4 / 0.1 | 49.7 / 38.7 / 7.1 / 2.0 / 2.4 |
| portrait | 12_營地總覽 | 7.4 / 61.5 / 25.7 / 5.4 / 0.0 | 45.6 / 37.0 / 8.1 / 4.2 / 5.0 |
| portrait | 13_產生器_林場展開 | 6.7 / 63.1 / 24.5 / 5.6 / 0.0 | 46.9 / 36.5 / 8.5 / 3.9 / 4.3 |
| portrait | 14_營地設施_鍛造台展開 | 5.2 / 62.6 / 26.5 / 5.2 / 0.5 | 41.3 / 43.3 / 7.6 / 4.0 / 3.7 |
| portrait | 15_打造 | 6.7 / 61.7 / 27.9 / 3.5 / 0.2 | 36.8 / 49.1 / 7.7 / 2.1 / 4.2 |
| portrait | 16_鍛造台_填 | 13.8 / 70.6 / 11.7 / 3.8 / 0.0 | 61.9 / 19.1 / 7.7 / 2.8 / 8.3 |
| portrait | 17_通貨 | 6.5 / 71.2 / 16.7 / 5.5 / 0.2 | 45.4 / 40.6 / 8.1 / 2.4 / 3.4 |
| portrait | 18_掉落紀錄面板 | 4.7 / 63.3 / 28.9 / 3.0 / 0.0 | 65.8 / 24.1 / 6.5 / 1.3 / 2.3 |
| portrait | 19_更多 | 7.3 / 64.8 / 24.9 / 3.0 / 0.0 | 43.9 / 42.6 / 8.1 / 2.1 / 3.3 |
| portrait | 20_設定 | 11.9 / 56.8 / 28.4 / 3.0 / 0.0 | 55.9 / 25.9 / 6.3 / 2.0 / 9.9 |
| portrait | 21_名詞說明_點擊 | 9.1 / 63.2 / 24.3 / 3.3 / 0.0 | 58.7 / 23.4 / 11.6 / 3.3 / 3.0 |
| portrait | 22_天賦樹 | 6.8 / 27.6 / 63.8 / 1.8 / 0.0 | 91.5 / 2.8 / 1.7 / 1.2 / 2.7 |
| portrait | 23_彈窗_打造翻牌 | 3.6 / 66.6 / 19.7 / 9.3 / 0.8 | 43.5 / 42.9 / 7.6 / 4.1 / 2.0 |
| portrait | 24_彈窗_離線結算 | 7.2 / 60.6 / 24.3 / 7.8 / 0.1 | 39.9 / 43.3 / 8.5 / 5.4 / 2.8 |
| portrait | 25_彈窗_回家確認 | 8.1 / 34.5 / 42.0 / 12.0 / 3.5 | 87.6 / 6.9 / 2.6 / 2.6 / 0.4 |
| portrait | 26_死亡卡 | 4.5 / 52.9 / 23.7 / 18.6 / 0.3 | 85.8 / 6.5 / 3.3 / 3.8 / 0.6 |
| desktop | 01_開場動畫 | 99.1 / 0.1 / 0.0 / 0.8 / 0.0 | 98.4 / 0.1 / 0.4 / 0.6 / 0.5 |
| desktop | 02_藏身處 | 20.7 / 58.7 / 12.7 / 7.1 / 0.8 | 75.5 / 11.4 / 6.9 / 3.9 / 2.3 |
| desktop | 03_地點清單 | 15.4 / 53.1 / 13.7 / 14.6 / 3.1 | 71.3 / 17.7 / 6.0 / 2.0 / 2.9 |
| desktop | 04_戰鬥中 | 8.5 / 16.5 / 67.7 / 7.0 / 0.3 | 59.8 / 29.7 / 5.5 / 2.5 / 2.5 |
| desktop | 05_戰鬥_橫幅 | 7.8 / 15.7 / 69.5 / 6.7 / 0.3 | 60.9 / 30.6 / 5.4 / 2.2 / 0.9 |
| desktop | 06_戰鬥_掉落紀錄 | 8.0 / 15.8 / 68.6 / 7.2 / 0.3 | 58.5 / 31.8 / 6.1 / 2.3 / 1.3 |
| desktop | 07_戰利品倉庫 | 8.8 / 29.8 / 55.4 / 5.8 / 0.2 | 74.7 / 18.6 / 3.9 / 1.5 / 1.3 |
| desktop | 08_物品說明_hover | 3.8 / 26.7 / 42.6 / 25.5 / 1.3 | 68.4 / 25.9 / 2.8 / 1.0 / 1.9 |
| desktop | 09_角色 | 9.1 / 35.3 / 51.3 / 3.8 / 0.5 | 72.7 / 22.3 / 2.8 / 1.1 / 1.1 |
| desktop | 10_技能總覽 | 9.5 / 35.0 / 51.2 / 4.1 / 0.2 | 64.7 / 30.5 / 2.7 / 1.1 / 0.9 |
| desktop | 11_技能這一招 | 9.1 / 35.4 / 50.5 / 4.8 / 0.2 | 65.4 / 29.5 / 3.0 / 1.1 / 1.0 |
| desktop | 12_營地總覽 | 6.3 / 48.4 / 40.2 / 5.0 / 0.1 | 61.0 / 31.3 / 4.9 / 1.6 / 1.2 |
| desktop | 13_產生器_林場展開 | 6.2 / 51.8 / 37.4 / 4.6 / 0.1 | 64.8 / 28.2 / 4.3 / 1.6 / 1.2 |
| desktop | 14_營地設施_鍛造台展開 | 2.0 / 45.4 / 26.5 / 21.9 / 4.3 | 58.3 / 33.8 / 4.7 / 2.4 / 0.8 |
| desktop | 15_打造 | 3.9 / 52.8 / 20.0 / 13.4 / 9.9 | 65.0 / 26.3 / 4.6 / 1.8 / 2.3 |
| desktop | 16_鍛造台_填 | 5.0 / 43.6 / 27.5 / 18.1 / 5.8 | 80.8 / 13.3 / 3.0 / 1.1 / 1.8 |
| desktop | 17_通貨 | 5.4 / 59.1 / 32.1 / 3.1 / 0.4 | 82.7 / 12.6 / 2.5 / 0.9 / 1.3 |
| desktop | 18_掉落紀錄面板 | 10.3 / 42.0 / 44.8 / 2.9 / 0.1 | 79.1 / 15.8 / 3.8 / 0.5 / 0.7 |
| desktop | 20_設定 | 11.4 / 54.9 / 30.2 / 3.3 / 0.1 | 83.0 / 9.5 / 3.3 / 1.3 / 2.9 |
| desktop | 21_名詞說明_hover | 7.7 / 34.1 / 18.8 / 19.2 / 20.3 | 69.7 / 23.4 / 3.7 / 1.5 / 1.7 |
| desktop | 22_天賦樹 | 4.6 / 26.4 / 67.6 / 1.4 / 0.0 | 93.3 / 2.9 / 1.4 / 0.9 / 1.5 |
| desktop | 23_彈窗_打造翻牌 | 1.9 / 68.0 / 4.3 / 15.8 / 9.9 | 64.3 / 26.3 / 4.1 / 3.8 / 1.5 |
| desktop | 24_彈窗_離線結算 | 9.0 / 58.2 / 27.4 / 5.1 / 0.3 | 74.8 / 17.5 / 4.4 / 2.3 / 0.9 |
| desktop | 25_彈窗_回家確認 | 13.6 / 32.9 / 38.9 / 13.0 / 1.6 | 95.2 / 2.7 / 1.0 / 1.0 / 0.1 |
| desktop | 26_死亡卡 | 4.5 / 29.7 / 30.9 / 25.8 / 9.1 | 94.7 / 2.5 / 1.2 / 1.3 / 0.2 |

## 限制

- 量的是本機同 commit，不是線上部署（見上）。
- 遊戲在跑（自動戰鬥、亂數），每次重跑怪物位置、跳數字、掉落都不同；DOM 面板的數字穩定，戰鬥畫面 canvas 的數字會變。凍結 rAF 只保證「文字圖」與「背景圖」是同一格。
- 「最不利背景」包含外框內任何佔 ≥2% 的顏色，可能是相鄰的圖示、邊框或格子線，不一定是文字真正壓在上面的那塊；一律附上「最常見背景」對照。
- 文字的 text-shadow、-webkit-text-stroke 沒有算進對比（只在 `note` 標出）；canvas 的描邊同樣沒有算進對比。
- `css_token` 只照原始碼順序找最後一條符合的規則，沒有算 specificity 與 `!important`，少數元素可能對到被覆蓋的規則；背景 token 是 DOM 祖先的背景，若文字其實疊在 canvas 上（例如 HUD 的掉落紀錄 `#dlog`），像素背景是 canvas，token 是 body 的。
- 像素背景是 dpr 倍率的實際像素（直立 ×3），字型反鋸齒、次像素不影響（文字已隱藏）。
- 圖示字（emoji、像素圖 icon）若不是 DOM 文字就不在 CSV 裡；SVG 圖示沒量。
- `13_產生器_林場展開` 與 `14_營地設施_鍛造台展開` 的展開內容在面板裡可能要捲動，截圖只含視窗內看得到的部分。

## 檔案

- `shots/{portrait,desktop}/<畫面>.png`、`contrast.csv`、`palette.csv`
- `tools/capture.js`（截圖＋列文字）、`tools/analyze.py`（對比＋配色）、`tools/summary.py`（這份）
- 重現：repo 根目錄 `python3 -m http.server 8000`；`node evidence/visual-audit-1117/tools/capture.js portrait http://localhost:8000/ <RAW>`（desktop 同）；`python3 -I evidence/visual-audit-1117/tools/analyze.py <RAW> evidence/visual-audit-1117 .`；`python3 -I evidence/visual-audit-1117/tools/summary.py <RAW> evidence/visual-audit-1117 <sha>`
