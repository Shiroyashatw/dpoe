# CSS 對齊色票（M2-36）：第三輪收尾報告（dpoe-css-palette3）

- 分支 `fix/css-palette-1121`，接 558add9；base main `812b428`（main 沒前進，不用 merge）。
- 這一輪改的檔：`js/hideout.js`（只改營地地圖台符文那一行的顏色＋註解）、`css/style.css`（`#hask` 三處 `rgba(` → `rgb(`、刪 `--el-chaos-rgb`）、`tools/check.js`（B2-CAT、M2-38 兩項收緊）、本資料夾證據。

## 測試數字
| 項目 | main 812b428（上一輪 log） | 本分支 |
| --- | --- | --- |
| `node tools/check.js` | 885 ✅／0 ❌ | **893 ✅／0 ❌**（`logs/check_branch.txt`） |
| `node tools/d1_saves.js --check` | 6/6 | **6/6** |
| touch_check 390×844 | 160／0 | **160／0** |
| touch_check 375×667 | 160／0 | **160／0** |
| touch_check 1280×720 | 16／0 | **16／0** |
| touch_check 1440×900 | 16／0 | **16／0** |
| `node tools/pro_check.js` | 35/0 | **35/0** |

- 測試總數不變（893）：這一輪是把兩項既有測試收緊，不是新增。沒有放寬其他斷言。
- 跑的過程照實寫：
  1. 第 1 次 check.js 是 878／2：(a) 我在 check.js 新註解裡寫了已刪掉的 token 名，被「刪掉的 token 沒有殘留引用」抓到；(b) `PW_CHROME` 路徑設錯，M2-06 實機量測開不了瀏覽器。改掉註解、改對路徑後 893／0（`logs/void/check_branch_1.txt`、`_2.txt`）。
  2. **我改 hideout.js 時把 `const d = A.props[0];` 那一行誤蓋掉**，營地每一幀都丟 `d is not defined`。check.js 沒抓到（它不畫營地），是 touch_check 375×667「頁面錯誤」和量測腳本抓到的。修好後整套重跑，上面的數字都是修好以後的。出錯那一輪的 log 留在 `logs/void/`。
  3. 沒有遇到偶發失敗，沒有重跑同一項來求過。
- 兩項收緊的測試都做了反向驗證：故意把 `#hask` 改回 `rgba(`、在別的選擇器加一個 `var(--cat-corr)`，兩項都失敗（`logs/check_mutation.txt`），改回後通過。

## 1. hideout.js 地圖台符文 → `--portal-rgb`（mumi 11/21 15:19 授權）
- `js/hideout.js:283`：`PAL.rgb.elChaos` → `PAL.rgb.portal`（ruling.csv `--el-chaos-rgb` 那一列、RULING-2.md：傳送門與地圖台符文同一族，定稿 204 188 254）。hideout.js 其他地方沒動（只改了上面那行註解的字）。
- 改完 grep `js/ css/ index.html tools/`：`--el-chaos-rgb`（PAL 鍵 `rgb.elChaos`）**0 引用**，已從 `:root` 刪掉。`--el-chaos-rgb-v2`、`--el-chaos`、`--el-chaos-v1` 是別的 token，還有引用，沒動。
- 截圖：`shots/cmp-1280x720-camp.jpg`、`cmp-390x844-camp.jpg`。符文從紫（main 最亮點 196,182,157／168,142,225）變成 `--portal` 淡紫（分支 189,177,227／186,175,224）。

## 2. 兩項規則性測試照 UIUX 15:16 裁定收緊（tools/check.js）
- **B2-CAT**（ruling.csv 第 130 列 legacy-19 → `--cat-corr`，原 CSS L1241）：`--cat-corr` 只准是 `.aff.cor`、`.fslot li.cw` 的文字色。現在逐條掃 `:root` 以外的每一條 CSS 規則，只要有 `--cat-corr`，選擇器必須剛好是這兩個、而且那一條宣告必須是 `color: var(--cat-corr)`；JS 和 index.html 出現 `--cat-corr`／`catCorr` 也失敗。
- **M2-38 顏色**（ruling.csv 第 33 列 scrim-v1：`#hask` 遮罩用 `rgb(var(--scrim-rgb)/α)`）：M2-38 的 CSS 段只准 `rgb(var(--x-rgb) / α)` 或 `rgb(var(--x-rgb), α)`；`--x-rgb` 必須是 `:root` 宣告的三元組、α 是 0–1 的數字常值。寫死數字的 `rgb(`、`rgba(`、hex 都失敗（每一個 `rgb(`／`rgba(` 都要對上合法形式，數量要相等）。
- `#hask` 三處（底色 0.6、卡片外框 0.6、陰影 0.5）從 `rgba(var(--scrim-rgb), α)` 改成 `rgb(var(--scrim-rgb), α)`。在真的 index.html 用 getComputedStyle 比改前改後（`hask_probe.js`，`logs/hask_before.txt`／`hask_after.txt`），完全一樣：背景 `rgba(10, 7, 4, 0.6)`；陰影 `rgba(10, 7, 4, 0.6) 0 0 0 3px, rgba(10, 7, 4, 0.5) 0 8px 24px`。

## 3. 保留的 token（判定表沒有 target，不猜）
- 完整清單：**`kept-tokens.csv`**（token、現值、PAL 鍵、JS 引用位置、狀態）。
- `work/risk_deleted_but_js.json` 的 169 個：2 個上一輪已刪（X3 遷完），**167 個保留**，狀態都是「判定表無 target，保留，待 UIUX 另給對照」。SIGNOFF-CHECKLIST 第 18 行允許「這次先不刪」。
- 另外兩個照實列理由（`--border-cap-v1` 其實也在上面 167 個裡，見下）：
  - `--sel-bd #a8927f`：只有 `tools/ui_mock.js:21` 用（授權範圍外的工具），判定表沒有 target。
  - `--border-cap-v1 #e8e2d6`：`js/mech.js:119` 劍陣地面 `GROUND.blades.col`。X1 的 target 只管 RCOL 掉落光圈；劍陣地面在判定表沒有 target，套稀有度色也違反「稀有度色只出現在掉落上」。
- `--el-chaos-rgb` 這一輪已刪，所以保留總數是 **168 個不重複 token**（風險清單 167＋`--sel-bd`）。`--border-cap-v1` 本來就在 169 個風險清單裡，原本 csv 列了兩次、寫成 169，是重複計算；dpoe-css-palette4（UIUX #159 簽核 M4）已刪重複列，`kept-tokens.csv` 現在 168 列。

## 4. 簽核清單：上一輪「未驗」的項目
量測腳本：`measure.js`（主量測）、`x4.js`（黑邊像素）、`x2_local.js`（區域變數的環）、`measure.py`（算對比、ΔE、色盲、並排）。全部數字在 `shots/measure.csv`。main 用 812b428 的 worktree 開另一個本機伺服器，同一組種子。

| 項目 | 狀態 | 結果／證據 |
| --- | --- | --- |
| §1 PAL 實際開機掃描 | **通過** | JS 程式碼（不含註解）讀到的 233 個 PAL 鍵，開機後全都有值（`shots/pal-scan.csv`）。 |
| §1 PAL 對判定表 target／M2-36 定稿 | **通過（1 筆說明）** | 170 筆（判定表單一 target 的值＋分用途 target 有沒有定義＋§0 的 12 個定稿 token）全部相符（`shots/pal-target.csv`）。唯一「不符」是 X4 那列的 target 文字寫「`--dmg-outline`／`--beam-edge` 系的 #000」，`--beam-edge` 不在 `:root`；實作用 `--ring-edge #000000`，值一樣。 |
| §2 X2 RINGFX 逐一觸發 | **大致通過；1 處不同，待 UIUX 確認** | 每個 fx 環呼叫點×元素／地面變數共 87 組，在頁面裡用真的 `fx()` 觸發、攔 `fxs()` 看實際播哪張（`shots/rings-pair.csv`、`rings-main.jpg`／`rings-branch.jpg`）。王現身 `spawnBoss()`、獄火自爆 `hfBoom()` 實際觸發：main、分支都是 boom。**唯一不同**：`skills.js:2195`（用 `col`、`D.el` 區域變數那個爆炸環）**混沌**元素 main 不播、分支播 `dark`。這符合 X2 對應表的「混沌 → dark」，但跟「序列圖跟改前一樣」不同，沒有改程式，請 UIUX 決定。 |
| §2 X4 fx 環黑邊 alpha | **通過** | 攔 `stroke()`：每個環先畫 `#000000`、再畫本色，兩筆 globalAlpha 完全相等；`--fx-own` 0.09／0.063，其他 0.9／0.63，都 < 1。像素反推（`x4.js` 兩張相除）：火／敵方環黑邊中位 0.72、最大 0.98–1.00（最大值是 lineWidth 14 的黑邊跟本色重疊、或底太暗時的反推誤差，不是不透明）；`--fx-own` 中位 0.17（底很暗，反推誤差大）。我方 `--fx-own` 環黑邊對地面 1.02，比同畫面敵方預警填色 1.69 弱，符合硬規則。但**我方火焰環（`--el-fire`，0.9）黑邊對地面 1.13**，也比敵方預警弱，記錄。截圖 `shots/x4-branch.jpg`／`x4-main.jpg`。 |
| §3 王預警壓在淺磚 | **不通過（判定表範圍外）** | 遊戲找不到 `#615b56` 的淺磚（各地形淺磚 token 是另外的值），所以用遊戲本身的 `teleCircle()`＋王閃現畫法，畫在 `#615b56` 和五種 `--scene-*-light` 上量（合成底，不是地圖截圖；沒加燈籠光）。teleCircle 填色對淺磚 1.14–1.65、外框線 1.50–2.63、王閃現線 1.74–2.60，**都沒有外 1 px #000**。原因：一般預警還是 `--bad-rgb-v1`／`--dmg-hurt-rgb-v1`，這兩個判定表沒有 target；王閃現有換 `--enemy-tel` 但沒有黑邊。main 數字一樣。圖：`shots/cmp-tele-*.jpg`。要 UIUX 給 target 才能改。 |
| §3 紅／綠／藍黃色盲 | **通過** | 地獄火快爆光暈（條外 3 px）對 `--hf` 填色 ΔE2000：一般 36.4／35.6，紅色盲 32.2／32.2，綠色盲 37.4／36.3，藍黃色盲 33.5／32.2（1280／390），門檻 ≥ 10。模擬圖 `shots/cvd-*.png`。 |
| §3 營地傳送門 | **無法自動驗** | 營地場景沒有傳送門物件（`G.portal` 是 null，營地物件只有 device、asc、stash、forge、prac、box）。 |
| §3 地圖台符文（改完後） | **1280 通過、390 不通過（取樣限制）** | 符文最亮像素對旁邊地面：1280×720 4.13（main 4.11）；390×844 1.94（main 1.44），≥3 未過。390 的取樣點落在淺色石板路上，比「營地泥土」亮很多，請看 `cmp-390x844-camp.jpg` 目視。 |
| §3 其餘面板抽查 | **截圖完成，待 UIUX 目視** | 說明框（物品）、昇華、天賦樹、停用主鈕（在背包面板插一顆一般主鈕＋停用主鈕＋停用鈕對照）、分頁列：`shots/cmp-{390x844,1280x720}-panel-*.jpg`。分頁徽章 `.dot.n.pill`：這個存檔沒有可升級的東西，畫面上 0 個，**無法自動驗**。說明框標題帶：main 有暖金色底，分支沒有底色（`cmp-390x844-panel-tip.jpg`），請目視。 |
| §4 條上字 | **token 通過；像素不通過（反鋸齒）** | `--tx-strong` token 值對填色像素：`--hp` 6.41、`--mp` 6.38、`--hf` 4.65（≥4.5）。截圖上 10 px 字最亮像素只有 (232,229,225)，對 `--hf` 3.89、對 `--hp` 5.36、對 `--mp` 5.34——`--hf` 這一格用像素量不到 4.5。 |
| §4 條填色對空段 | 記錄 | `--hp` 對空段 2.93（兩種尺寸）。地獄火 92% 時空段太窄量不到。 |
| §4 ΔE `--hf` 對 `--hp`／`--act`／`--vig` | **通過（附註）** | 像素：對 `--hp` 18.5、對 `--act`（主鈕底）39.6、對 `--vig` 15.1（≥15）。`--vig` 畫面上**沒有任何元件在用**（危急紅邊是 canvas 的 `--hurt-vignette`），所以拿 token 值算。色盲低值：`--hf` 對 `--hp` 藍黃色盲 9.0；對 `--vig` 綠色盲 7.9、藍黃色盲 9.8，記錄（規格說靠位置、外框分）。 |
| §4 `--enemy-tel` 對黑邊 | **通過** | 王現身／獄火自爆環：環色像素 (226,54,113) 對黑邊 (0,0,1) 5.00（≥3；算出來 6.23，像素有 0.9 alpha 混底）。 |
| §4 小地圖點 | **不通過** | 點對周圍小地圖（取點外 4 px 的中位）：王點 `--enemy-tel` 1.83、菁英點 `--enemy-rim` 2.52–3.85、一般怪點 `--bad-v6` 1.08–1.40、玩家 4.60。小地圖底是半透明地圖圖，點周圍不是純底色。main 也一樣低（王 2.15、菁英 2.07、一般 1.10–1.38）。一般怪點 `--bad-v6` 判定表沒有 target。 |
| §4 `prefilter.csv` 重跑 | **無法自動驗** | 這個檔不在 repo 裡（M2-36 定稿包是外部的），沒有東西可以重跑。 |

### 需要人目視判斷（main／分支並排，**待 UIUX 目視**）
- 天賦樹底從藍黑變成暖棕：`shots/cmp-390x844-panel-tree.jpg`、`cmp-1280x720-panel-tree.jpg`。
- 「還沒有昇華」的字從淺橘變成青色：`shots/cmp-*-panel-asc.jpg`、`cmp-*-panel-tree.jpg`。
- 說明框標題帶的底色：`shots/cmp-*-panel-tip.jpg`。
- 營地符文、停用主鈕、分頁列：`shots/cmp-*-camp.jpg`、`cmp-*-panel-btn-disabled.jpg`、`cmp-*-panel-nav.jpg`。
- 最擠戰鬥／地獄火快爆＋危急：`shots/cmp-*-crowd.jpg`、`cmp-*-hellfire-crisis.jpg`（這一輪重截；上一輪的 `run-1121b/shots/` 還在）。

## 重跑方法
```
python3 -m http.server 8000                      # 分支
(cd <main 812b428 worktree> && python3 -m http.server 8001)
PW_CHROME=/opt/pw-browsers/chromium node measure.js http://localhost:8000/index.html <repo> shots branch
PW_CHROME=/opt/pw-browsers/chromium node measure.js http://localhost:8001/index.html <main> shots main
node x4.js ... ; node x2_local.js ...             # 同樣兩邊各跑一次
python3 -I measure.py shots ../ruling/ruling.csv <repo> <main>
```
（每個環的 160×160 小截圖只留拼好的 `rings-*.jpg`；重跑 measure.js 會重新產生。）

## 沒做的
- 沒改 `VER`、CHANGELOG（交辦限定可改的檔）；沒改經濟，不需要 AI 試玩回歸報告。
- 預警、小地圖一般怪點的顏色：判定表沒有 target，照「不猜」沒改，只量測記錄。
