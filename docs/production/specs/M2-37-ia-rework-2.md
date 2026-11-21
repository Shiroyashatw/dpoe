# M2-37 資訊架構重整規格 v1.3.1 續篇：§12 M2-38 實作交辦

> 接 [`M2-37-ia-rework.md`](M2-37-ia-rework.md)。本檔為 v1.3.1 自主檔整節移出的 §12，正文未改寫。

## 12. M2-38 實作交辦

token 收斂（M2-36a）合併後，從那時的 main 開分支做。只做版面與流程：不改 :root 的值、不新增 token；diff 不准有色碼字面值（hex、rgb()／rgba()）或舊 token 名（`--milk`、`--s0`、`--fr-o`、`--r4`…），canvas 用 `PAL.xxx`。顏色照 §2；缺角色先停下來回報 Game Art Director。行號是 main 0a9d3c3 的，收斂後以選擇器與函式名為準。不在 M2-38：桌機生命／魔力條數字疊到場景、C1 受傷跳數字 2 筆（M2-36／M2-33）。

| # | 工作 | 檔案與選擇器 |
| --- | --- | --- |
| 1 | 分頁加「鍛造」，順序改成 倉庫・角色・鍛造・技能・天賦・營地・更多 | hud.js `NAV_T`（L428）加 `['forge','hammer','鍛造']`；營地先借 `home` 圖示（新圖示在 M2-33）；`navOn`（L438）：鍛造的三段與通貨頁亮 `forge`、營地總覽亮 `craft`；`navGo`（L459）加 `forge`；style.css L1647 `body.touch.port #pnav:not([hidden])` 的 `repeat(6, …)` 改成依格數（6 或 7）；選中分頁 `--sel`／`--sel-ink`（M2-37.1） |
| 2 | 營地徽章只寫數字 | hud.js `navHTML`（L481，膠囊在 L487）字改 `${campReady()}`，aria-label 不變；徽章 `--act` 底＋`--on-act` 字（style.css L2391 `.dot.n.pill`）；掛機卡與王倒下的卡 `data-a="gocamp"`（L1981、L2052）按鈕字改「去營地・{n} 可升級」，n＝0 時只寫「去營地」；營地標題加「{n} 可升級」（D1） |
| 3 | 鍛造分頁：打造｜鍛造台（通貨在鍛造台裡） | hud.js `CSEG`／`craftSeg`（L609–620）拆成鍛造的兩段（打造、鍛造台；原通貨段併進鍛造台，鍛造台照舊 `campCan('tab:fill')`；選中段 `--sel`／`--sel-ink`）；`ctab:` 處理（L2664）跟著改；forge.js `forgeHTML`（L953）標題列在非總覽時寫「鍛造」；預設段規則照 M2-37.1；桌機左欄 `#pcraft` 照舊、右欄開倉庫（M2-37.1 鍛造分頁） |
| 4 | 營地縮成只剩總覽 | forge.js `forgeHTML` 的 camp 分支拿掉段切換，標題「營地」＋靈魂；桌機營地改開在右欄（`#pcraft` 在 camp 時用右欄位置，且 `openPanel` 不同時開 `PANEL.inv`）；`campOpenHTML` 鍛造台的「去打造」（L354）改「去鍛造」開鍛造 › 打造（M2-37.1 營地怎麼縮小） |
| 5 | 拆碎片頁 | hud.js `CSEG` 的 `frags`、`PANEL.stab` 的 frags、L2018 `act('ctab:frags')`；forge.js `fragPageHTML`（L705）的王印部分搬進追逐物品；首領碎片已在 `boxHTML`（L1735）列出數量，不動（D2） |
| 6 | 鍵位 | hud.js `FMENU`（L85）：鍛造 K、營地 H、追逐物品 Y；O 開鍛造 › 通貨；`KEYS_PC`（L673）同步；按鍵處理 L2535（D4） |
| 7 | 追逐物品面板 | index.html 加 `<div id="pchase" class="panel" role="dialog" aria-label="追逐物品" hidden>`；hud.js `PANEL`（L407）加 `chase`、`closePanels`（L641）、`anyPanel`（L660）；擁有數讀 `S.frags[k]`；拿過的種類數（用語 #8 的 k）＝`S.chase.got` 裡王印鍵的數量（`chaseOf()`，craft.js L1293）；名稱 `STR_T.wangyin`；保底 `chasePct()`（L1296）；這裡累不累積看 `chaseLine(G.mapT)` 有沒有值（L1298，沒有 `chaseHere()` 這個函式）；保底元件沿用掛機卡的 `.chs`＋`.pb`（hud.js `chaseHTML` L1987）；收集格外框 `.chf`；效果字讀 `WY_FX`，main 還沒有 M2-29（只有 craft.js L1350 `wangyinSet`），所以效果行、「套到裝備」、四印齊鳴先不畫；之後用語 #12 的 k＝裝備上 `it.wy` 的種類數，不可共用 #8 的值；直立半版、桌機右欄（M2-37.3、D6、D7） |
| 8 | 追逐物品的開放與提示 | 存檔加 `S.chase.seen`（開放過、看過的 key），存檔版本不變；第一次 `chaseLine(G.mapT)` 有值或第一次 `chaseGive`（craft.js L1328）時開放，`hudWarn('追逐物品開放了')`；`navDot` 的更多加這一條；`moreHTML`（L560）加一列與「新」膠囊；桌機 #dnav 開放後才畫按鈕（M2-37.3 開放、提示規則、D8） |
| 9 | 入口改接 | hud.js `chaseBnClick`（定義 L1901，L1343 呼叫）：王印 → 開追逐物品並選中；異寶基底照舊；掛機卡保底一行 `chaseHTML`（L1987）點了開追逐物品；L 照舊走 `chaseLog(sel)`；掛機卡保底一行的顯示條件不改（D3、D6） |
| 10 | 桌機分區 | style.css：`body:not(.touch) .top`（L1914）讓出分頁寬度，`#prog`／`#bossbar` 收進 y 16–56；`#dnav`（L1903）top 10；`.panel` 桌機 top 76、max-height calc(100vh − 234px) 維持，框 `--border-mid`；`#warn`（L80）桌機 bottom 172；render.js `drawMinimap`（L890，y0 在 L895）桌機 y0 改成畫布底 − mh − 16（右下）（M2-37.4） |
| 11 | 設定與掉落紀錄進右欄 | style.css L1913 `body:not(.touch) #pset, … #plog { top: 50% }` 改成 right 16、width 476、top 76、transform none、max-height calc(100vh − 234px)；L600、L1398 的置中只留給觸控（M2-37.5） |
| 12 | 桌機追逐橫幅進頂列 | style.css `body:not(.touch) #chase`（L2463–2475）：top 6、高 64、left 16、right＝分頁寬＋24；圖示格 56（圖示 40）、名稱 22 px；王血條顯示時加 class 改 top 76、高 64、right 避開右欄；直立規則不動（M2-37.5） |
| 13 | 快捷列只在手動＋模式切換 | hud.js `hudBar`（L139）只畫 `slot < campN('slots')` 的技能格，空格不用 `ICO.plus`；`HV.au`（L333）切 body class，桌機自動時藏 `#bar`；.bottom 加分段鈕，沿用現行 `data-a="auto:1"`／`"auto:0"`（處理 L2771，設定頁同一組 L717）；HP／MP 兩種模式同位置；鍵帽 `.sk kbd`（style.css L535）照 M2-31 T6（M2-37.4） |
| 14 | 角色頁空格 | hud.js 角色格（L887–930 `.eqs.emp`、神格 L925）：拿掉「空」字與虛線；剪影先用該部位現有圖示加 `filter: grayscale(1)` 與低透明，M2-33 再換；右上數字＝`slotCands(k).length`（L530），有 `itemUp` 用 `.c-good`（`--good`）；`slotPickHTML`（L540）沒候選時加「去鍛造打一件」，開鍛造 › 打造並設好部位；沒腰帶時護符列一行；神格沒開不畫；style.css `.eqs.emp`（L2083、L2310）的虛線改實心 `--border` 框＋`--panel-inset` 底（M2-37.6） |
| 15 | 字串 | 新字串全部進字串表（`STR_T` 旁），不在程式裡拼字；容器寬用 em（新畫面用語表、M2-37.7） |
| 16 | 檢查與截圖工具 | tools/check.js 加 M2-38 項（分頁格數、鍵位、沒開的格不畫、改過的檔案沒有色碼字面值）；截圖腳本照 tools/m2_19_shots.js，開發觸發不進正式版 |

### 完成條件（兩種尺寸）

- [ ] 雲端 Claude Code 無頭瀏覽器（github.io 被擋就本機 serve 同一個 commit），不用測試機器人；截圖、量測表、點擊紀錄推到分支並開 PR。
- [ ] 直立 375×667、390×844 與桌機 1280×720，每個改過的畫面各一張：分頁列（6 格、7 格）、鍛造三段、營地總覽、更多、追逐物品（開放前、開放後、王印 0／2／4 種、不累積地點）、掛機卡（有／沒有可升級）、角色頁（有／沒候選、沒腰帶）、「去鍛造打一件」、橫幅（一般、王血條時）；桌機另拍自動／手動快捷列、鍛造＋倉庫、右欄營地、設定、掉落紀錄。
- [ ] 桌機三個重疊用 getBoundingClientRect 量矩形，輸出表、交集面積都是 0：橫幅 vs 戰鬥區（y ≥ 72）與小地圖；右欄 vs 小地圖；#pset vs HP／MP 與技能列（小地圖畫在 canvas 上，用開發觸發輸出螢幕矩形）。
- [ ] 腳本實點並記錄點擊數，跟 §4 一致（M2-29 未實作的兩條記「待 M2-29」）。
- [ ] 保底數字跟掛機卡一致（pts＝0、185、499、505 → 0、37、99、100%）；1440×900 的非對話框面板都在 y 76–742。
- [ ] 顏色：diff 沒有色碼字面值、舊 token 名、新增 token；新元件照 §2；沒有虛線空狀態。
- [ ] tools/check.js 與 loot_check 全過；掉率、保底點數（`S.chase.pts`）與存檔版本不變。
