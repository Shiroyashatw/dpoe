# 視覺審查流程（截圖清單 → 雲端截圖量測 → 只看過關的關鍵圖）

負責：Game Art Director（寫清單、看圖）。執行：雲端 Claude Code（截圖、量測、預篩、推證據、PR 留言）。適用所有 dpoe 視覺審查（mumi 2026-11-17 定）。色只寫 token 名。

## 0. 規則
- 美術總監**不開遊戲**。每次審查先寫一份完整的截圖清單（`specs/<任務>-review-checklist.md`）；雲端照清單截、量、預篩，推到 repo，用 PR 留言回報；美術總監只看「過了預篩的關鍵圖」。
- **清單外的畫面不審**，所以清單要完整：每個畫面、每個狀態、要量的數字都寫進去。雲端看到清單外、但這次改動會影響的畫面，只列在留言的「清單外」，不截不審，由美術總監補進清單下次跑。
- **兩種尺寸一定都截**：直立 390×844、桌機 1280×720，同級。清單另外標的尺寸才加截。
- 不合併、不改遊戲行為；為了做出狀態加的除錯掛鉤只在測試入口生效（§4）。

## 1. 尺寸與環境
| 代號 | 資料夾名 | 視窗 | DPR | 其他 |
| --- | --- | --- | --- | --- |
| P（必截） | `390x844` | 390×844 | 2 | `isMobile`、`hasTouch` |
| D（必截） | `1280x720` | 1280×720 | 1 | 滑鼠，游標移出畫面 |
| S | `375x667` | 375×667 | 2 | 同 P |
| L | `844x390` | 844×390 | 2 | 手機橫向 |
| W | `1440x900` | 1440×900 | 1 | 同 D |
- DPR 照遊戲上限 2（main.js）。Playwright Chromium；擋掉雲端存檔連線（照 `tools/ui_shots.js` 的 route）；字型等 `document.fonts.ready`、圖等所有 `img.complete`，再多等 300 ms。
- 預設 `prefers-reduced-motion: no-preference`；狀態代號帶 `rm` 的才模擬減少動態。
- 一個畫面只在某一種尺寸存在（例：快捷列只有桌機），另一種尺寸照樣記一列，結果寫 `n/a` 和原因，不能空著。

## 2. 輸出資料夾與檔名
根目錄沿用 repo 現有的 `docs/production/evidence/`：
```text
docs/production/evidence/<task>/
  manifest.json                    # commit、分支、清單檔與它的 commit、執行時間（台北時間）、各尺寸參數、掛鉤版本
  measure.csv                      # §5，每張靜態圖、每個連拍幀一列
  prefilter.csv                    # §6，每個「清單列 × 尺寸」一列，結果與原因
  summary.md                       # §8 留言的完整版（留言放不下時連到這裡）
  <viewport>/<screen>-<state>.png        # 靜態截圖（整個視窗，不截整頁）
  <viewport>/<screen>-<state>.json       # 同一刻的 DOM 資料：區域矩形、計算後樣式、文字對比取樣、狀態驗證結果
  <viewport>/<screen>-<state>.mp4        # 影片（§7）
  <viewport>/<screen>-<state>-burst/NN.png   # 連拍幀，NN 從 00 起
  <viewport>/<screen>-<state>-sheet.png      # 連拍幀拼成的一張總覽
  <viewport>/crops/<screen>-<state>-<crop>.png   # 特寫（最近鄰放大，倍數寫在 crop 名，例 seam-floor-x4）
  compare/<viewport>/<screen>-<state>.png        # 新舊對照（comfort (g)）：左 main、右這次
  assets/<sheet>.png               # 不在遊戲裡、直接用素材檔拼的對照圖（例：2×2 拼、王印灰階），跟尺寸無關
```
- `<task>` 小寫，例 `m2-36`、`m2-34`。`<screen>`、`<state>` 用清單裡的英文代號（小寫、只有 a–z、0–9、連字號），不另取名字。
- 只保留現行一輪：重跑覆蓋同名檔、刪掉這輪沒產生的舊檔；歷史靠 git。

## 3. 截圖規則
- 靜態圖：先用掛鉤凍結時間（`DBG.freeze()`），再截；同一刻存 `.json`。不准為了好看改 DOM 或 CSS（捲動位置、焦點除外）。
- 狀態一定要驗：清單的「驗狀態」欄是一句可以用程式判斷的條件（選擇器存在、`G` 的欄位值、元素文字），截之前判斷，不成立 → 這列 `blocked`，不截。
- 每次載入固定亂數種子（§4 `seed`），同一份清單跑兩次，靜態圖要逐像素相同（不同就在留言標「不穩定」）。
- 量測區域由 DOM 矩形決定（面板、說明框、HUD、卡片），場景區＝畫布扣掉所有 DOM 元件；寫進 `.json` 的 `regions`，`tools/comfort.py` 讀它。

## 4. 做出狀態：測試入口、全域函式、種子、掛鉤
照這個順序用，前面能做就不用後面：
1. 現有測試入口 `?test=`：`dualweap`、`nearDeath`、`midgame`、`chase`（js/main.js `TESTS`；自己的存檔位、不連雲端）。
2. 現有全域函式（`page.evaluate`）：`runNode`、`enterHideout`、`navGo`、`openPanel`、`closePanels`、`devChase`、`spawnBoss`、`hudWarn`、`showTip`、`idleBar`、`offShow`、`invPut`／`mkItem`／`dropItem`、`proSkip` 等（用法參考 `tools/ui_shots.js`、`tools/m2_38_shots.js`）。
3. 缺的由**開發工程師新增**，放 `js/dbg.js`，只有網址帶 `?test=` 或 `?dbg=1` 才載入；正式玩家不受影響。清單裡用到但還沒有的掛鉤，雲端在留言「卡住」一節列出，工程補了再跑；不准用改 DOM 的方式假裝狀態。

| 掛鉤 | 做什麼 |
| --- | --- |
| `?seed=<n>` | 遊戲所有亂數用固定種子（包含掉落、怪物位置、`bDecals`） |
| `DBG.freeze()`／`DBG.step(ms)`／`DBG.resume()` | 停住遊戲時間與動畫；一次往前走 ms（連拍用） |
| `DBG.biome(k)` | 直接進 temple／lava／tomb／ice 的一個地點，主角站房間中央、看得到上牆與側牆 |
| `DBG.night(s)`、`DBG.fog(s)` | 開天黑（燭龍閉眼）、大霧（蚩尤）s 秒 |
| `DBG.boss(k)` | 叫出指定的王（王血條、王名） |
| `DBG.fx(id, x, y)` | 在世界座標播一次指定特效（`sig_*` 和一般特效） |
| `DBG.num(kind, v, x, y)` | 跳一個指定種類的數字（hit、crit、hurt、gain、minor、miss、dodge、block、dot） |
| `DBG.fireAll()` | 火焰技能放滿（M2-33-3a §1.4 的戰鬥狀態） |
| `DBG.hp(p)`、`DBG.mp(p)`、`DBG.hot(1)` | 主角生命、魔力設成百分比；魔力過熱 |
| `DBG.beam(r)`、`DBG.chaseDrop()`、`DBG.wyApply(slot)` | 地上光柱（rare、unique、chase）、追逐物落地、套王印那一下 |
| `DBG.lvup()`、`DBG.flip(list)`、`DBG.toast(kind, text)` | 升級、打造翻牌（指定結果）、吐司 |
| `DBG.tileRect(tx, ty)` | 回傳某一格地磚在螢幕上的矩形（特寫裁切用） |
| `DBG.safeArea(px)` | 模擬底部 safe-area（把 `env(safe-area-inset-bottom)` 的替代變數設成 px） |
| `DBG.save(preset)` | 載入清單指定的存檔內容（物品數量、稀有度、解鎖） |
- 減少動態用 Playwright `emulateMedia({ reducedMotion: 'reduce' })`，不靠掛鉤。

## 5. 量測 csv（`measure.csv`）
每張靜態圖、每個連拍幀一列。欄位（順序固定，量不到的留空，不寫 0）：

| 欄 | 內容 |
| --- | --- |
| `task`、`id`、`viewport`、`screen`、`state`、`file`、`frame` | 清單列代號（例 `T-03`）、尺寸資料夾名、檔名；連拍幀號（靜態圖空白） |
| `commit`、`dpr`、`px_w`、`px_h` | 遊戲 commit、DPR、圖的像素寬高 |
| `a_scene_l`、`a_panel_l`、`a_key_l`、`a_panel_minus_scene`、`a_key_minus_layer` | comfort (a)：三層平均 L* 與兩個差 |
| `b_panel_scene` | comfort (b)：面板 ÷ 場景地面相對亮度 |
| `c_sat_pct`、`c_sat_where` | comfort (c)：C* > 40 的比例；落在哪些元素（元素名以 `|` 分隔） |
| `d_brown_pct` | comfort (d) |
| `e_text_min`、`e_text_max`、`e_text_fail`、`e_ui_colors` | comfort (e)：正文對比最小、最大、不合格筆數、介面字色種類數 |
| `f_bright_pct` | comfort (f) |
| `bar_contrast` | `#bhp`／`#bmp` 數字對條的最差對比 |
| `num_min_px` | 畫面上最小跳數字的螢幕字高（CSS px） |
| `icon_scale` | 所有 PNG 圖示 顯示寬 ÷ `naturalWidth`，不是整數的列出選擇器；全整數寫 `ok` |
| `hit_min` | 可按元件最小的寬×高與選擇器 |
| `fx_sat_pct`、`fx_black_pct` | 特效幀：C* > 40 比例、黑邊比例 |
| `checks` | 清單列自己的量測，`名=值` 以 `;` 分隔（例 `seam=1.08;grid=ok`） |
| `verdict`、`fail` | `pass`／`fail`／`blocked`／`n/a`；沒過的項目與數值 |

## 6. 預篩（腳本，美術總監看之前）
門檻不在這裡重抄，一律照來源檔；來源改了，預篩跟著改。
| 代號 | 檢查 | 門檻來源 |
| --- | --- | --- |
| PF1 檔案 | 圖存在；像素寬高 = 視窗 × DPR；截圖不透明（任何 alpha < 255 就不過）；不是空白或全黑（L* 標準差 ≥ 2）；跟同一列的其他狀態不是同一張圖（雜湊不同）；頁面沒有 `pageerror` | 本節 |
| PF2 狀態 | 「驗狀態」條件成立 | 清單 |
| PF3 舒服 | (a)–(f) | `specs/M2-36-palette-tokens.md`「舒服」量測表；(c) 演出中的圖不算閒置（照 M2-23 §12-8） |
| PF4 素材 | 有用到新素材檔時，檔案本身過色票偏移、沒被放大、雜點、地板／牆頂／牆面、接縫、圖示雜點、王印飽和 | `specs/M2-36-pixellab-d2.md`（PR #119） §6 |
| PF5 介面 | 圖示整數倍、熱區、token 解析與沒有色碼、焦點框 | `specs/M2-33-1-foundations.md` §12–13；各批的驗收節 |
| PF6 特效 | 最大幀飽和面積、超過 8% 的時間、黑邊、戰鬥 5 秒平均 | `specs/M2-36-drawing-rules.md` §6、`specs/M2-33-3a-scene-assets.md` §4.2 |
| PF7 數字 | 跳數字螢幕字高下限、描邊、重疊 | `specs/M2-33-3a-scene-assets.md` §1.3、`specs/M2-23-feedback.md` §12-4 |
| PF8 條 | `#bhp`／`#bmp` 對比 | `specs/M2-36-palette-tokens.md`「樣張」 |
| PF9 清單專屬 | 清單「量測」欄寫的數字 | 清單 |
- 一列只要有一項沒過就是 `fail`，圖不給美術總監看，列在「沒過」；修好重跑。
- (g) 新舊對照不是預篩，產生了就給美術總監（和 mumi）看。

## 7. 影片與連拍
清單「動態」欄寫「影片」或「連拍」才做；手感、時間、順序要看的（特效播放、按鈕回饋、捲動、轉場、翻牌、升級）一定要有。
| | 規格 |
| --- | --- |
| 影片 | Playwright `recordVideo` 錄下再用 ffmpeg 轉 mp4（H.264、yuv420p、`-crf 28`、`-movflags +faststart`、沒有聲音）；30 fps；畫面 = 視窗 CSS 大小（390×844、1280×720，不乘 DPR）；長度 = 事件前 0.5 秒＋事件＋後 0.5 秒，最長 6 秒；每支 ≤ 3 MB |
| 連拍 | 用 `DBG.freeze()`＋`DBG.step(33)` 一幀一幀截（不是真時間截圖，結果可重現）；PNG；張數 = 事件長度 × 30，最多 60 張（事件較長時清單可以指定間隔，例：每 166 ms 一幀）；另拼一張總覽 `-sheet.png`（寬 ≤ 4096、≤ 2 MB，幀號寫在每格左上） |
- 特效：連拍拿來量（每幀進 `measure.csv`），影片拿來看；兩個都要。
- 減少動態狀態（`rm`）：連拍確認沒有位移與縮放（相鄰幀元件矩形相同）。
- 整個任務的證據 ≤ 80 MB；超過先砍不是關鍵的影片，留言註明。

## 8. PR 留言格式
每跑一輪留一則新留言（不改舊的），用繁體中文：
```text
## <task> 視覺審查證據（commit <hash>，<YYYY-MM-DD HH:MM> 台北時間）
清單：specs/<task>-review-checklist.md @ <hash>；共 <n> 列 × 2 尺寸：過 <a>、沒過 <b>、卡住 <c>、n/a <d>

| ID | 畫面－狀態 | 390×844 | 1280×720 | 重點數字 |
| T-01 | combat-temple－idle | ✅ | ❌ (b) 1.31 | b、d |
…（每列一行；加截的尺寸另加欄）

### 給美術總監看（只有過了預篩的關鍵圖）
- T-01 combat-temple－idle：[390](連結) · [1280](連結)
…（連結用 commit 固定的 raw 檔網址；影片、總覽圖同樣）

### 沒過
- T-01 1280×720：(b) 面板 ÷ 場景 1.31 < 1.4；面板區是 #pinv
### 卡住（缺掛鉤或狀態做不出來）
### 清單外（這次改動會影響、但清單沒有的畫面）
### 新舊對照 (g)
```
- 「給美術總監看」只放清單標 ★、而且兩個尺寸都過的圖；只過一個尺寸的整列算沒過。
- 留言超過 GitHub 長度上限就只放彙總數字、沒過、卡住，表格與連結放 `summary.md`。

## 9. 完整性檢查（腳本，跑完一定做）
- 清單每一列 × 每個要截的尺寸，在 `prefilter.csv` 都有一列結果；少一列＝這輪不完整，留言開頭寫「不完整」。
- 每個 `fail` 都寫得出是哪一項、數值多少、門檻多少、門檻來源。
- 美術總監看完回覆的結論（過／要改）由幕僚長記進 CHANGELOG；證據不刪。
