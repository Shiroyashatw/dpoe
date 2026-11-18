# M2-42 全頁 UI/UX 體檢截圖清單（上：規則、戰鬥、殼層）

負責：Game Art Director。照 `specs/visual-review-protocol.md` 跑（下稱「流程」）。下半是 `specs/M2-42-ux-audit-checklist-b.md`（面板與主流程）。只寫 token 名。這是體檢，不是 M2-34 實作驗收：要拍現行 main 每一個頁面、分頁、彈窗與主流程，問題記下來給後續 Page，不在這輪改遊戲。

## 0. 怎麼用
- 對準 **現行 main**（清單寫作時是 `2205bc5`，PR #84 已合併；雲端開工先記實際 HEAD）。M2-34 第 1、2、3b 批暫停，本清單獨立；3a 已拍過的戰鬥外觀可當對照，但 UX 列都要重拍。
- `<task>` 用 `m2-42`，證據根目錄 `docs/production/evidence/m2-42/`，檔名、csv、影片規格一律照流程 §2、§5、§7（mp4 30 fps、最長 6 秒、每支 ≤ 3 MB，連拍 ≤ 60 幀，整輪 ≤ 80 MB）。
- **第一輪**：每列截 390×844 與 1280×720。**第二輪**（第一輪 ★ 與主流程都有完整證據之後）：標 S 的列再加 375×667。一個畫面只在某一種尺寸存在時，另一種照樣記一列，結果寫 `n/a` 和原因。
- 不合併、不改遊戲行為。除錯掛鉤只在 `?test=` 或 `?dbg=1` 生效（`js/dbg.js`，`DBG.ver` 現為 1）。
- **預篩不藏體檢圖**：PF1、PF2 不過＝不截或不給看。PF3、PF5 與下方 PF10–PF15 的結果寫進 `checks` 與 `summary.md`「體檢問題」，**即使沒過，只要 PF1／PF2 過，★ 圖與主流程圖仍要給美術總監看**（本任務就是要看問題）。
- 補遺 `specs/M2-33-addendum-camp-zoom.md` §5（掛機卡收合／觀戰、掉落動態、開營地分頁不畫掛機卡）**尚未進遊戲碼**（main 只合了文件）。本輪截現行行為；沒有的控制不要標 `blocked`，在 `checks` 寫 `idle_shrink=none`、`drop_feed=dlog`、`camp_idle=hidden` 等。

## 1. 存檔、掛鉤、怎麼做狀態
- 載入：`?test=midgame&seed=42&dbg=1`（自己的存檔位、不連雲端）。進場後 `DBG.freeze()` 再截；動態先 `DBG.resume()` 或 `DBG.step(ms)`。同一份清單跑兩次，靜態圖要逐像素相同。
- 現有測試入口：`dualweap`、`nearDeath`、`midgame`、`chase`。開場不要用 `?test=`（測試存檔已看過開場），改 `?dbg=1&seed=42` 新局，或載入後 `introGate()`。
- 現有全域：`runNode`、`enterHideout`、`navGo`、`openPanel`、`closePanels`、`devChase`、`spawnBoss`、`hudWarn`、`showTip`、`idleBar`、`offShow`、`invPut`／`mkItem`／`dropItem`、`proSkip`、`revealOpen`。
- 掛鉤（名稱以 main 的 `js/dbg.js` 為準，不要用清單外的假名）：`?seed=`、`?freeze=1`、`DBG.freeze()`／`DBG.step(ms)`／`DBG.resume()`、`DBG.biome(k)`、`DBG.clear()`、`DBG.night(s)`、`DBG.fog(s)`、`DBG.boss(k)`、`DBG.fx(id,x,y)`、`DBG.num(kind,v,x,y)`、`DBG.fireAll()`、`DBG.hp(p)`、`DBG.mp(p)`、`DBG.hot(on)`、`DBG.beam(r)`（`rare`／`unique`；`chase` 會轉 `DBG.chaseDrop()`）、`DBG.chaseDrop()`、`DBG.wyApply(slot)`、`DBG.lvup()`、`DBG.flip(list)`、`DBG.toast(kind,text)`、`DBG.tileRect`、`DBG.safeArea(px)`、`DBG.save(preset)`。減少動態用 Playwright `emulateMedia({ reducedMotion: 'reduce' })`。
- 清單用到但做不出來的狀態，留言「卡住」，不准改 DOM 假裝。
- **AUDIT 補丁**（在 midgame 載入並 `TESTS.midgame.go()` 之後呼叫一次；各列若要改裝備或技能，在列內覆寫）：

```js
DBG.save(s => {
  s.mat.soul = 50000;
  s.mat.gold = 20000;
  s.auto = 1;
  /* 震地戰吼第 3 孔空著，對 4.jpg */
  s.skills[1] = { k: 'seiscry', so: [null, null, null], n: 3 };
  s.lib.sk = Object.assign(s.lib.sk || {}, { seiscry: 3, apshot: 1, grenade: 1, chargeslam: 1 });
  s.lib.sup = Object.assign(s.lib.sup || {}, { fireadd: 1, coldadd: 1, lightadd: 1, chaosadd: 1 });
  /* 倉庫與各裝備格都放有圖示的裝備（含稀有、至少一件 ★），用來抓米色方塊 */
  const put = (id, rar, slot) => {
    const it = mkItem(id, 40, rar);
    if (slot) s.eq[slot] = it;
    else invPut(s.inv, it);
    return it;
  };
  put('w_sword1_0', 2, 'weapon');
  /* 其餘部位從 BASES 各取一件放上；再丟 24 件進倉庫 */
});
ST = stats();
hudBar();
hudPanels();
```

武器切換：彈夾列改 `s.eq.weapon = mkItem('w_xbow_0', 40, 2)`，技能格放 `apshot`／`grenade`；蓄力列改 `mkItem('w_mace1_0', 40, 2)` 與 `chargeslam`。變完 `ST = stats(); hudBar();`。

## 2. UX 預篩與流程點擊紀錄
每張靜態圖預設做流程 PF1、PF2、PF3 (a)–(f)、PF5。下列加項寫進 `measure.csv` 的 `checks`（`名=值` 以 `;` 分隔）與 `prefilter.csv`，門檻來源寫在原因裡。

| 代號 | 檢查 | 門檻 |
| --- | --- | --- |
| PF10 熱區 | 直立可按 ≥ 44×44、主動作高 ≥ 48、相鄰 ≥ 8；桌機主動作高 ≥ 48、次要 ≥ 36、圖示鈕 ≥ 32 | F（`specs/M2-33-1-foundations.md`）§3、§12 |
| PF11 字級 | 正文計算後字高 ≥ 14（`--fs`）、標題 ≥ 18（`--fs-l`）、標籤 ≥ 12（`--fs-s`）；標籤不准承擔資訊句 | F §2 |
| PF12 截斷 | 可見文字列 `scrollWidth ≤ clientWidth+1`；`text-overflow: ellipsis` 或 line-clamp 切掉技能說明、推薦差、物品名、按鈕標籤時記 `trunc=…` | 本節 |
| PF13 重疊 | 回報 HUD、掛機卡、面板、#pnav、資源條兄弟列的交集 px²；技能鍵被擋面積；資源條列互相重疊＞0 記 `overlap=…` | 本節；mumi 回饋 |
| PF14 捲動層 | 同時可捲的 `overflow: auto|scroll` 祖先層數（含半版、面板、清單）；開營地分頁時記 `scroll_layers=n` | 本節；補遺 §5.3 是目標 |
| PF15 隱藏資訊 | 彈夾剩餘／裝填、蓄力段數、藥劑或榴彈次數是否在技能格或 HUD 上看得到；看不到記 `hidden=ammo` 等 | 本節；mumi 回饋 |
| PF16 色碼 | 本列相關 DOM／canvas 路徑有沒有色碼字面值（只記有無與選擇器，不寫色值） | F §12–13 |

`summary.md` 必有「流程點擊紀錄」表（兩種尺寸各寫一次）：

```text
| 流程 | 尺寸 | 步驟（動作 → 畫面） | 點擊或按鍵次數 | 層數或備註 |
```

步驟從玩家可見入口算到完成（例：技能分頁 → 選招 → 第 3 孔 → 選輔助 → 放上）。找不到的按鈕也要記「無此控制」。主流程清單見下半 §13。

## 3. mumi 今日回饋（必截，★）
截圖要對得上 `/workspace/fb/1.jpg`–`4.jpg` 的問題，不是只截「理想狀態」。

| 回饋 | 來源 | 本清單列 |
| --- | --- | --- |
| 掛機卡不能縮小，擋住招式 | 1.jpg | A-C1、A-C2、F-id |
| 左上近期掉落不直覺、沒有稀有度顏色 | 1.jpg | A-H12、A-H13 |
| 營地分頁半版跟資源列搶位置、不好滑 | 2.jpg | B-P1、B-P2、F-cp |
| 資源列重疊（錯誤，已交工程師，仍要取證） | 1.jpg、2.jpg | A-C2、B-P1 |
| 裝備格變成米色方塊（錯誤，已交工程師，仍要取證） | 3.jpg | B-E1、B-E2 |
| 技能資訊難懂、操作痛苦；推薦列都是同一句「每秒 +14（21%）」；說明被截斷；I／II 與鎖頭不清楚；展開米色底；「技能 › 孔 › 寶石」層太深 | 4.jpg | B-S6、B-S7、F-sk |
| 換彈、充能要看得出剩餘次數、彈夾打了多少、填充中 | 製作人轉 | A-H3、A-H4、A-H5、F-cb |

## 4. 開場與第一次進遊戲
驗狀態寫在「怎麼做」末句。場景沒寫的戰鬥列一律 temple、自動模式。

| ID | screen－state | 怎麼做 | 量測 | 動態 | ★／S |
| --- | --- | --- | --- | --- | --- |
| A-I1 | `intro`－`gate` | `?dbg=1&seed=42` 新局（不要 `?test=`），停在開始鈕；驗 `#intro` 可見、`#ivg` 可見、`IV.gate` | 開始鈕熱區；標題對比；跳過鈕是否可點 | — | ★ |
| A-I2 | `intro`－`peace`、`omen`、`crack`、`fall`、`rain`、`march`、`you` | 按開始後把 `IV.t` 設到各鏡頭 `SHOTS[i].t0+0.8` 再凍結；七態都截；驗字幕 `#ivs` 對得上該鏡頭 | 字幕可讀、不溢出；跳過鈕不擋字 | 全程影片可裁成 ≤6 秒兩段（開頭、天裂） | S（`crack`、`you`） |
| A-I3 | `intro`－`skip`、`lid` | 開場中按跳過；再截 `#lid` 睜眼；驗進入藏身處、`S.story.intro` 已記 | 轉場後分頁列與場景都在 | 影片 | — |
| A-I4 | `intro`－`rm` | 減少動態再跑 gate＋第一鏡頭 | 相鄰幀無位移縮放 | 連拍 1 秒 | — |

## 5. 戰鬥 HUD、掛機卡、黑暗層決策
預設 `?test=midgame&seed=42&dbg=1`，在地圖、自動、沒開面板。直立此時會出掛機卡（`idleOn`：地圖、沒面板、沒死、沒確認、直立且自動）。

| ID | screen－state | 怎麼做 | 量測 | 動態 | ★／S |
| --- | --- | --- | --- | --- | --- |
| A-H1 | `combat`－`auto` | midgame 自動、沒開面板；驗 `S.auto`、`#pidle` 直立可見、桌機可見 | 戰鬥區與掛機卡矩形；技能鍵被掛機卡擋住的面積（直立）；F §10 各區；PF13 | — | ★ S |
| A-H2 | `combat`－`manual` | `S.auto=0` 或點模式鈕；驗掛機卡直立隱藏（`idleOn` 手動不開）、技能鍵可見 | 技能格尺寸；直立搖桿區不擋招式 | 影片：自動切手動 | ★ S |
| A-H3 | `combat`－`ammo-mid`、`ammo-last`、`ammo-reload` | 裝備 `w_xbow_0`，技能格放 `apshot`（`ammo: [6, 1.5]`）；`P.ammo.apshot` 分別設成剩 3、剩 1、`until>G.t` 裝填中；驗三態 | **PF15**：技能格有沒有寫剩餘發數、彈夾上限、裝填中；沒有就 `hidden=ammo`；熱區 | 裝填影片 | ★ S |
| A-H4 | `combat`－`gren-full`、`gren-cd` | 同十字弓，技能格放 `grenade`（可存 2 顆、各 4 秒冷卻）；滿與冷卻中 | PF15：次數與冷卻是否看得到 | — | — |
| A-H5 | `combat`－`charge-1`、`charge-2`、`charge-3` | 裝備 `w_mace1_0`，技能格放 `chargeslam`；按住蓄到 1／2／3 段再凍結；驗腳下蓄力條段數 | PF15：段數在腳下條與技能格是否都看得到；條對比 | 影片：蓄滿出手 | ★ S |
| A-H6 | `combat`－`flask-cd`、`flask-skill` | 生命／魔力藥劑冷卻中；另放一招藥劑技能，次數＞0 | 技能格次數與冷卻字；`--fs` | — | — |
| A-H7 | `combat`－`cooldown`、`invalid` | 放一招讓一格冷卻；再換不對的武器讓一格 `.sk.bad` | 冷卻遮罩不壓鍵帽；失效「!」可辨 | — | — |
| A-H8 | `combat`－`hp-mid`、`hp-low`、`es`、`block`、`hellfire` | `DBG.hp(70)`、`DBG.hp(15)`；有能量護盾；有格擋值；`DBG.hot(1)` | `#bhp`／`#bmp` 對比（PF8）；地獄火過熱可辨 | — | S（`hp-low`） |
| A-H9 | `combat`－`status-3` | 主角上三個異常狀態 | 圖示 16（直立，平滑縮）／32（桌機） | — | — |
| A-H10 | `combat`－`boss`、`prog` | `DBG.boss` 叫出王；另截首領進度 `#prog` | 王血條、王名不溢出；與橫幅、分頁列交集 0 | — | ★ |
| A-H11 | `combat`－`minimap` | 兩尺寸都有小地圖（直立在戰鬥區右上） | 矩形、不擋血條與掉落字 | — | — |
| A-H12 | `combat`－`dlog-cur`、`dlog-mix`、`dlog-chase` | 用 `dropLog` 或 `DBG.beam`／`DBG.chaseDrop` 讓 `#dlog` 分別出現一般通貨、混稀有度（通貨／完美／★／追逐）、只有追逐；驗 `#dlog p` 有對應 `lg-*` | **對 1.jpg**：位置（左上、小地圖關係）、有沒有圖示、名字能不能用稀有度色票分出來、對比、是否像「＋n 名」；色碼字面值記 PF16 | — | ★ S |
| A-H13 | `combat`－`banner-cur`、`banner-chase` | `rareShow`／`DBG.chaseDrop` 出 `#banner`／`#chase` | 橫幅矩形、字級、與 `#dnav`／`#prog` 交集 0 | 影片 | — |
| A-H14 | `combat`－`toast` | `DBG.toast(_, '測試警告')` | 位置照 F §9；對比 | — | — |
| A-H15 | `combat`－`lvup` | `DBG.lvup()` 後凍結在膠囊還在 | 膠囊不擋招式；字完整 | 影片 | — |
| A-H16 | `combat`－`paused` | 開設定或讓 `worldPaused()` 為真，`#paused` 可見 | 「已暫停」對比、不擋關閉 | — | — |
| A-H17 | `combat`－`area-run` | 預設地名 `#area`；再設 `S.world.note` 讓 `#run` 出現 | 字不截斷；關閉鈕熱區 | — | — |
| A-H18 | `mode`－`auto`、`manual` | 桌機 `.modesw` 兩態；直立若無此條寫 `n/a`（改在設定裡切） | 84×44、鍵帽 C | 影片（快捷列滑入，若有） | — |
| A-H19 | `nav`－`plain`、`dot`、`badge` | 沒提示；天賦或技能有點；營地可升級徽章 | `#pnav`／`#dnav` 每格尺寸（F §13-2）；徽章數字 | — | ★（`badge`） |
| A-H20 | `nav`－`hover`、`press` | 桌機停一格；直立按住一格 | hover 換底與框；直立按下不縮放 | 影片 | — |
| A-H21 | `tip`－`hover`、`edge` | 桌機停 300 ms；靠右緣的格子 | 寬 ≤ 300；不超出畫面 | — | — |
| A-H22 | `roll`－`rcd` | 桌機翻滾冷卻，`#rcd` 在游標旁；直立寫技能格旁的冷卻，桌機列仍要截 | 可見、不擋準星 | — | — |
| A-H23 | `combat`－`safe-0`、`safe-34` | `DBG.safeArea(0)` 與 `(34)` | 分頁列、技能鍵不被 home 條擋住 | — | S（`safe-34`） |

### 5.1 黑暗層決策（必截，★；給後續 Page 的三個選項用）
本節列標 **黑暗層決策**。3a 重拍缺「天黑／大霧＋光柱＋血條＋跳數字」，本輪補上。現行程式（3a 重拍後）把 `drawBeams`、`drawBars`、`drawNums` 畫在暗層**之後**，一般戰鬥與天黑／大霧都全亮——這是選項 2。規格 `specs/M2-33-3a-scene-assets.md` §6 仍待 mumi 決定，本輪只取證、不改繪製順序。

後續問題清單 Page 會把 §6 做成三個選項（此處只記，不替 mumi 定）：
1. **平常全亮；天黑／大霧時畫在暗層之前，資訊跟著變暗**（推薦；接近原提案）。
2. **一律畫在暗層之後，永遠全亮**（現行）。
3. **一律畫在暗層之前**（遠距數字在平常戰鬥也會被壓暗）。

**每一幀都要同時有：**（1）掉寶光柱 `DBG.beam('rare')` 或 `'unique'`，必要時再加 `DBG.chaseDrop()`；（2）至少一隻怪的頭上生命條（midgame 場上有怪；沒有就在身旁 `spawnMob`，不要 `DBG.clear()`）；（3）跳數字 `DBG.num('hit', …)`、`DBG.num('crit', …)`、`DBG.num('hurt', …)` 至少各一，座標要有近有遠（主角旁邊、與主角水平距離 ≥ 180 世界 px）。截之前凍結。

**驗狀態（不成立 → `blocked`，不截）：**
- 天黑：`G.night > G.t`，且 `G.fog ≤ G.t`（或沒有大霧）。
- 大霧：`G.fog > G.t`，且 `G.night ≤ G.t`（`DBG.fog` 會先把 `G.night` 清 0）。
- 正常對照：`G.night ≤ G.t` 且 `G.fog ≤ G.t`。
- 三種都要：`G.drops` 裡有帶光柱的掉落、`G.mobs` 有未死的怪、`G.nums` 長度 ≥ 3。

量測（寫進 `checks`）：光柱、每條怪物生命條、每個跳數字的螢幕矩形與平均 L*（相對腳下地面、相對暗層外的戰鬥區）；近距與遠距跳數字的 L* 差；光柱頂是否還認得出來；生命條是否還讀得到。不要改繪製順序。另存特寫裁切 `crops/…-beam-x4`、`…-bar-x4`、`…-num-near-x4`、`…-num-far-x4`（最近鄰）。

| ID | screen－state | 怎麼做 | 量測 | 動態 | ★／S |
| --- | --- | --- | --- | --- | --- |
| A-D1 | `combat`－`dark-normal` | midgame 戰鬥，確認無天黑無大霧；放光柱、跳數字、怪還在；驗上面三件與 `G.night≤G.t`、`G.fog≤G.t` | 本節量測（對照：現行應全亮） | — | ★ S |
| A-D2 | `combat`－`dark-night` | `DBG.night(30)`，確認 `G.night>G.t`；**同一幀**有光柱、怪物生命條、近與遠跳數字；天黑夠濃（鏡頭暗層有畫） | 本節量測；遠距數字／血條／光柱是否仍全亮（現行選項 2）還是被壓暗 | 連拍 1 秒（凍結步进，確認狀態不漂） | ★ S |
| A-D3 | `combat`－`dark-fog` | `DBG.fog(30)`，確認 `G.fog>G.t` 且 `G.night≤G.t`；其餘同 A-D2 | 同 A-D2 | 連拍 1 秒 | ★ S |
| A-D4 | `combat`－`dark-night-unique`、`dark-fog-chase` | 天黑＋`DBG.beam('unique')`；大霧＋`DBG.chaseDrop()`；仍要有血條與跳數字 | 高柱／追逐柱在暗層上是否可辨、色是否靠 token | — | — |

## 6. 掛機卡、死亡、離線、設定、更多、地點

| ID | screen－state | 怎麼做 | 量測 | 動態 | ★／S |
| --- | --- | --- | --- | --- | --- |
| A-C1 | `idle`－`expand` | 直立自動刷圖、沒開面板；驗 `#pidle` 可見、半版上緣約 38% | **對 1.jpg**：掛機卡高、技能鍵被擋面積、有沒有收合／觀戰鈕（沒有記 `idle_shrink=none`）；「去營地」熱區 ≥ 44；PF13 | — | ★ S |
| A-C2 | `idle`－`resbar` | 同上，特寫 `#pidle .cmtop` 資源列（木／百煉鋼／生皮／蘭絲／靈魂） | **對 1.jpg 重疊錯誤**：各 `.rbar` 矩形交集、溢出半版、字截斷 | 作物圖 | ★ S |
| A-C3 | `idle`－`pity`、`stash80` | 怪物等級會出保底的地點（或把掛機卡追逐行做出來）；倉庫 ≥ 80% | 保底行熱區 44；滿倉提示對比 | — | — |
| A-C4 | `idle`－`loot` | 做成 `G.loot`（王倒下 30 秒清單）；驗掛機卡換成「這一輪掉的」 | 按鈕防誤觸區；清單可捲層數 | 影片 | ★ |
| A-C5 | `idle`－`desk` | 桌機掛機卡在左下；驗與快捷列、血條、小地圖交集 | 高 ≤ 300、x 範圍；PF13 | — | — |
| A-O1 | `death`－`manual` | `?test=nearDeath` 或手動模式把 `G.state='dead'` 再 `hudState()`；驗 `#over .card.dead` | 兩顆鈕熱區、死因與地圖詞可讀、卡片在最上層 | — | ★ |
| A-O2 | `death`－`auto-toast` | 直立自動、半版開著時死亡；驗沒有死亡卡、改 `#warn` | 通知不擋分頁列 | — | — |
| A-O3 | `death`－`upgrade` | 材料夠升營地，死亡卡有「現在可以升」 | 主鈕與「再試一次」層級、破壞性間隔 | — | — |
| A-O4 | `ask`－`home` | 地圖中觸發回藏身處確認（`G.ask==='home'`） | 主鈕／繼續刷；桌機 T、Esc 提示 | — | — |
| A-O5 | `offline`－`sum`、`chase` | `offShow` 做出離開摘要；第二態含追逐與「全部升級」 | 數字滾動（減少動態則直接換）；圖示整數倍 | 影片（滾數字） | ★（`sum`） |
| A-O6 | `rotate`－`prompt` | 觸控且方向與設定不符時 `#rot`；桌機 `n/a` | 按鈕熱區、文案完整 | — | — |
| A-M1 | `more`－`home` | `navGo('more')`；midgame 解鎖程度 | 每列熱區；「下一個」鎖著的說明；捲動層 | — | ★ |
| A-M2 | `set`－`main` | `openPanel('set')`；直立有方向切換，桌機沒有（仍截） | 分段鈕熱區；音效、傷害數字三態；快捷鍵表可讀；scrim 可關 | — | — |
| A-M3 | `set`－`acct-guest` | 設定帳號區訪客態（不要真的登入或送出） | 輸入框、註冊／登入熱區；不擋鍵位表 | — | — |
| A-M4 | `node`－`list`、`stars` | `openPanel('node')` 或點地名；第二態切星級 | 正在刷／下一座／鎖著可分；星級說明；捲到目前地點；捲動層 | — | ★ S |
| A-M5 | `hide`－`resume` | `enterHideout()` 且 `S.world.cur` 有值；`#run`「繼續刷」 | 鈕熱區、不擋場景互動 | — | — |

**本檔靜態列數（第一輪）：** 上表「screen－state」寫了幾個狀態就算幾列。開場 A-I1–I4＝11；戰鬥 A-H1–H23＝44；黑暗層 A-D1–D4＝5；掛機至選單 A-C1–C5、A-O1–O6、A-M1–M5＝6+7+6＝19。合計 **79 列 × 2 尺寸＝158**。`n/a` 也要有 `prefilter.csv` 列。影片見下半 §13，本檔另有：開場、自動切手動、裝填、蓄力、橫幅、升級、掛機卡王倒下、離線。
