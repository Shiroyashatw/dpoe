# CSS 對齊色票（M2-36）：#159 簽核必修第四輪（dpoe-css-palette4）

- 分支 `fix/css-palette-1121`，接 `91ca373`（簽核紀錄 commit）；base main `812b428`（main 沒前進，不用 merge）。
- 依據：`../ruling/SIGNOFF-159.md`（UIUX 16:10 有條件通過）。這一輪只做簽核「必修」M1–M6；M7（授權紀錄）是製作人／mumi 的事，沒動。
- 這一輪改的檔：`js/render.js`（王閃現線、小地圖王點）、`js/mech.js`（燃燒地面依陣營分色）、`tools/check.js`（加 2 項）、`run-1121c/kept-tokens.csv`、`run-1121c/REPORT.md`（保留數 168）、本資料夾。
- 沒做（UIUX 定為後續 PR）：teleCircle、小地圖一般／菁英點黑邊、地圖台符文墊底、`--asc` 值對齊、王腳下光圈、底部分頁小點、167 個保留 token。

## 測試數字
| 項目 | main 812b428（本輪重跑） | 本分支 |
| --- | --- | --- |
| `node tools/check.js` | **885 ✅／0 ❌**（`logs/check_main_812b428.txt`） | **895 ✅／0 ❌**（`logs/check_branch.txt`；上一輪 893，＋2 項） |
| `node tools/d1_saves.js --check` | — | **6/6**（`logs/d1_branch.txt`） |
| touch_check 390×844 | — | **160／0** |
| touch_check 375×667 | — | **160／0** |
| touch_check 1280×720 | — | **16／0** |
| touch_check 1440×900 | — | **16／0** |
| `node tools/pro_check.js` | — | **35／0**（`logs/pro_branch.txt`） |

- 每一項都只跑一次就過，**沒有偶發失敗、沒有重跑**。沒有放寬任何斷言。
- 新增 2 項 check.js（`#159 簽核 M1／M2`、`#159 簽核 M3`）做了反向驗證：暫時把填色改回 `C.col`、拿掉 7×7 黑邊、閃現黑邊改 3 px，兩項都 ❌（`logs/check_mutation.txt`）；改回後 895／0。
- 測試流程：本機 `python3 -m http.server 8000`（分支）＋ main 812b428 worktree 開 8001；不連線上。

## 逐項對 SIGNOFF-159.md「必修」
數字全在 `shots/measure.csv`（138 列）。截圖：`shots/cmp-*`＝左 main｜右分支。

### M1 王閃現預警線（`render.js:162`）— **已改；線對黑邊 α0.9 通過，α0.7 冰原未達 3，請 UIUX 裁定**
- 程式：`const a = 0.3 + 0.6 * f`；同一條 arc 先 `globalAlpha = a`、`lineWidth 5`、`PAL.ringEdge` stroke，再 `lineWidth 3`、`PAL.enemyTel` stroke；畫完把 globalAlpha、lineWidth 還原成 1／2（後面的預警照舊）。
- 量法：在遊戲裡擺一隻 `pat='blink'` 的王，攔 `draw()` 對閃現圓實際呼叫的 stroke（`shots/*-facts.json` 的 `rec`）：分支 = `#000000 5px α0.9` ＋ `#ff3d7f 3px α0.9`（f=1）／α0.7（f=2/3）。再把**同樣的筆畫**畫在 run-1121c 那五種淺磚（合成底，沒加燈籠光）上讀像素。main 用同一方法重量（main 實際筆畫是 `rgba(178,141,255,0.898)` 2 px），得 2.38／1.60／3.45／2.36／2.24，和簽核引用的 2.34／1.57／3.37／2.31／2.19 差 ≤0.08（取樣點與反鋸齒不同）。

| 淺磚 | main 線對磚 α0.9 | 分支 線對黑邊 α0.9 | 黑邊對磚 α0.9 | 分支 線對黑邊 α0.7 | 黑邊對磚 α0.7 |
| --- | --- | --- | --- | --- | --- |
| #615b56 | 2.38 | **4.89** | 2.98 | **3.07** | 2.57 |
| ice | 1.60 | **4.58** | 12.01 | **2.14 ❌** | 7.00 |
| lava | 3.45 | **4.98** | 2.02 | **3.26** | 1.85 |
| tomb | 2.36 | **4.91** | 3.01 | **3.03** | 2.59 |
| temple | 2.24 | **4.95** | 3.15 | **3.15** | 2.70 |

- **和預期不一樣**：預期線對黑邊 α0.9 5.34–5.57、α0.7 3.51–4.21；實測 α0.9 **4.58–4.98**（都 ≥3）、α0.7 **2.14–3.26**（冰原 2.14 <3，其他 4 種 3.03–3.26）。黑邊對磚 α0.9 **2.02–12.01**，和預期 2.01–11.97 一致。
- 原因（照實算）：黑邊也是 α，不是純黑。黑邊像素＝(1−α)×磚，線像素＝α×`--enemy-tel`＋(1−α)×黑邊像素。冰原磚最亮，α0.7 時黑邊變成 (50,64,72)，線 (194,62,110)，對比只剩 2.14。
- 我沒有改畫法（簽核寫明「沿用同一個 alpha」）。供 UIUX 裁定的參考數字（算的，沒實作）：黑邊改不透明時線對黑邊 α0.9 5.14、α0.7 3.39，黑邊對磚 2.09–13.75。
- 圖：`shots/cmp-tele-*.jpg`（五種淺磚，左 main 紫 2 px｜右 分支），遊戲畫面裡的閃現圓 `shots/cmp-blink-ingame-a0.9.jpg`／`a0.7.jpg`（深色地圖，2 倍放大）。

### M2 小地圖王點（`render.js:1043`）— **通過**
- 程式：王點先畫 7×7 不透明 `PAL.ringEdge`，再畫 5×5 `PAL.enemyTel`。**另外做了一件簽核沒寫的事**：第一版照原本的小數座標畫，量出來黑邊被反鋸齒糊成半格（像素 (37,9,18)／(219,52,109)），所以王點改成 `Math.round` 對齊整數像素。一般、菁英點沒動（還是小數座標，屬後續）。
- 量法：攔 `drawMinimap` 的 `fillRect` 拿王點畫布座標，直接 `getImageData` 讀畫布像素（上下左右各量一次）。

| 尺寸 | main 王點對小地圖底 | 分支 王點對黑邊 | 分支 黑邊對小地圖底 |
| --- | --- | --- | --- |
| 1280×720 | 2.15 | **6.23**（四邊） | **3.40–3.45** |
| 390×844 | 2.18 | **6.23**（四邊） | **3.40**（四邊） |

- 預期 6.23／3.40，相符。圖：`shots/cmp-390x844-mini.png`、`cmp-1280x720-mini.png`（8 倍放大）。

### M3 燃燒地面依陣營分色（`mech.js:93`、`drawMech()`）— **已改**
- `GROUND.fire` 加 `colOwn: PAL.elFire`；drawMech 填色改 `(!foe && C.colOwn) || C.col`。怪物方維持 `--enemy-tel` 36%＋`--bad-v5` 虛線框＋點燃圖示（中央菱形也還是 `C.col`）。對比門檻項沒有改。
- check.js 新增 `#159 簽核 M3`：`GROUND.fire.colOwn === PAL.elFire`、`col === PAL.enemyTel`、drawMech 用 `(!foe && C.colOwn) || C.col`。
- 並排圖（左我方、右怪物方）：`shots/cmp-390x844-ground-fire.jpg`、`cmp-1280x720-ground-fire.jpg`（全畫面 `*-ground-fire-full.jpg`）。像素（填色中心下方一點）：

| 尺寸 | main 我方 | 分支 我方 | main 怪物方 | 分支 怪物方 |
| --- | --- | --- | --- | --- |
| 1280×720 | (44,35,33) 橘紅 | (42,42,41) 暖灰（`--el-fire` 14%） | (93,50,37) 橘 | (93,34,59) `--enemy-tel` 紫紅 |
| 390×844 | (44,35,34) | (42,41,40) | (93,50,37) | (93,34,60) |

- 對地板對比都是記錄值（我方 1.21–1.33、怪物方 1.47–1.60），規格沒有門檻；我方 14% 很淡，本來就是這個設計（M2-05.1）。

### M4 `kept-tokens.csv` 與保留數 — **已改**
- 刪掉 `--border-cap-v1` 重複的第 170 列（原第 26 列在 169 個風險清單裡，保留）。現在 168 列、token 不重複（`cut -d, -f1 | sort | uniq -d` 0 筆）。CRLF 行尾照原檔。
- `run-1121c/REPORT.md` §3、PR 說明都改成 **168**（167＋`--sel-bd`）。

### M5 停用主鈕 — **已補**
- 上一輪拍成天賦樹的原因有兩個：(1) 截圖順序在 `treeOpen()` 之後、`closePanels()` 不會關天賦樹；(2) 三顆鈕放在同一層，CSS `.btn.pri ~ .btn.pri` 會把第二顆主鈕降成次鈕，所以就算在背包也看不到停用主鈕。這次先 `treeClose()`，三顆鈕各包一層 span，等面板滑入完再量位置。
- 截圖：`shots/cmp-390x844-panel-btn-disabled.jpg`、`cmp-1280x720-panel-btn-disabled.jpg`（背包 `#pinv`，天賦樹關著）。
- 停用字對鈕底（像素，只取接近 computed 字色的像素）：

| 尺寸 | main 停用主鈕 | 分支 停用主鈕 | 分支 停用鈕 | 分支 一般主鈕 |
| --- | --- | --- | --- | --- |
| 1280×720 | 4.70（`#aa9a84` 對 (58,48,39)） | **4.86**（`#aa9a84` 對 `--panel-raised-2` (50,47,43)） | 4.86 | 5.84 |
| 390×844 | 4.70 | **4.86** | 4.86 | 5.88 |

- 停用主鈕是灰階底（`--panel-raised-2`）＋`--tx-off` 字，opacity 1；規格不設 4.5，記錄。

### M6 分頁徽章 `.dot.n.pill` — **已補，通過**
- 給足靈魂和木頭（`MAT().soul`、`wood`）讓營地有 2 件可升級，呼叫 `sheetSync()` 重畫分頁列。390×844 在底部 `#pnav`、1280×720 在右上 `#dnav`，兩邊都出現 1 個徽章「2」。
- 截圖：`shots/cmp-390x844-panel-nav.jpg`、`cmp-1280x720-panel-nav.jpg`。
- 徽章字 `--on-act` 對 `--act`：像素 **6.14**（兩尺寸；main 6.00），computed token 也是 6.14，≥4.5 通過。

### 天賦樹底、「還沒有昇華」像素對比（簽核「未驗清單」第 3 項）— **已量**
- 截圖：`shots/cmp-390x844-panel-tree.jpg`、`cmp-1280x720-panel-tree.jpg`（`S.asc = 0`）。

| 項目 | main 1280 | main 390 | 分支 1280 | 分支 390 |
| --- | --- | --- | --- | --- |
| 樹底實際像素 | (9,11,19) | (9,11,19) | (22,19,15) `--scene-void` | (22,19,15) |
| 連線中點對樹底（40 條中位；最小–最大） | 1.58（1.22–15.36） | 1.54（1.13–9.08） | **1.80**（1.16–14.47） | **1.75**（1.07–8.86） |
| 「還沒有昇華」字對圓底 | 12.94 | 12.94 | **11.37** | **11.37** |

- 「還沒有昇華」：分支 `--asc-hi` (140,225,207) 對圓底 (29,26,23)，像素 11.37，和簽核算的 token 值 11.37 相同。
- 連線：中位只有 1.75–1.80（暗的是還沒點的線，縮小後 1 px 反鋸齒）；分支比 main 高。簽核算的「0.62 對樹底 3.81」是 token 值，像素量不到這麼高，照實記。

### M7 授權紀錄 — **不在本輪範圍**（簽核寫明由製作人或 mumi 補）

## 簽核「未驗清單」
1. 停用主鈕 → M5 已補。
2. 分頁徽章 → M6 已補。
3. 天賦樹、昇華像素對比 → 已量（上表）。
4. 王預警真實地圖淺磚＋燈籠光：只截到深色地圖上的閃現圓（`cmp-blink-ingame-*.jpg`），淺磚仍是合成底。
5–8：沒動（prefilter.csv 外部檔、† 覆寫 cascade、營地傳送門、M7 授權）。

## 重跑方法
```
python3 -m http.server 8000                                   # 分支
(cd <main 812b428 worktree> && python3 -m http.server 8001)
PW_CHROME=/opt/pw-browsers/chromium node shots.js http://localhost:8000/index.html shots branch
PW_CHROME=/opt/pw-browsers/chromium node shots.js http://localhost:8001/index.html shots main
python3 -I measure.py shots
```

## 沒做的
- 沒改 `VER`、根目錄與 `docs/production/` 的 CHANGELOG（不在授權檔案內）；沒改經濟，不需要 AI 試玩回歸報告。
- `--enemy-tel-rgb`：王閃現改成 `globalAlpha`＋`PAL.enemyTel` 以後，JS 已不讀 `PAL.rgb.enemyTel`，但它是 §0 列的 M2-36 官方 token，留在 `:root`（check.js 的 PAL 官方值測試也還在驗它）。
