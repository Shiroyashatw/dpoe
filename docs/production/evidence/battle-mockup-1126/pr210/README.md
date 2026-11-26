# dpoe-battle-mockup-1126：PR #210 第 4、5 步截圖與量測

- 依據：顏色總表 `uiux/battle-hud-color-table-1126` @ `6cf0691a` §3、§4；`specs/battle-floor/battle-mockup-gap-list.md`（`uiux/procedural-floor-1126` @ `ded337df`）。都只讀。
- 拍法：`node tools/battle_mockup_shots.js docs/production/evidence/battle-mockup-1126/pr210 http://localhost:8200/`（本機 `python3 -m http.server`；預裝 Playwright Chromium `/opt/pw-browsers/chromium`；deviceScaleFactor 1）。`?dbg=1&seed=7`、`DBG.biome('temple')`＋`DBG.clear()`，凍結時間後直接呼叫 `draw()`（不跑模擬）。
- 1280×720：S-F、S-E、S-B、S-T、S-TX、S-G、S-C、S-D、S6；390×844：S-E、S-T、S-C（只跑 touch_check，不做 390 設計驗收）。
- 本分支的地板仍是 main 的 temple 平鋪（程序地板在 PR #211）。

| 檔 | 狀態 | 驗 |
|---|---|---|
| S-F-1280x720.png | 空場 | F2 燈籠光暈改 `--scene-lamp-glow` 16% |
| S-E-1280x720.png | 菁英＋4 隻一般怪，未出手 | E1 1 px `--enemy-rim` 外框、E2 菁英圈（照舊，待裁）、E3 名牌、目前目標圈 `--enemy-rim` α0.9＋黑邊 |
| S-B-1280x720.png | 王＋一個 teleCircle | E2 王圈 4 px 黑＋3 px `--enemy-tel` α0.9、T1–T3 |
| S-T-1280x720.png | teleCircle 進度 50% | T1 外 0.30／內 0.357、T2 5 px 黑＋3 px α0.9、T3 虛線＋菱形 |
| S-TX-1280x720.png | 兩個 teleCircle 重疊＋teleCircle 疊敵方地面 | C25 合成 ≤ 0.55、不疊加（見下） |
| S-G-1280x720.png | 我方毒霧（`--el-chaos`）／鹹水（`--el-cold`）14%＋敵方腐化／煙霧 55% | E4、C24：敵方有虛框＋圖示，我方沒有 |
| S-C-1280x720.png | 對菁英暴擊 | C1 `--dmg-crit`、C2「暴擊 」前綴＋2 px 黑描邊 |
| S-D-1280x720.png | 稀有、完美通貨、追逐光柱 | 光柱（見待裁） |
| S6-1280x720.png | 王＋10 怪＋菁英＋我方環／斬擊＋敵方預警／地面＋暴擊 | 總覽 |

## 量測（measure.json）
敵方填色合成 α：在 `foeFlush` 貼完那一刻讀同一點有／沒有那一層的像素反推（之後的暗層、光暈不算）。

| 點 | 量到 | 應為 |
|---|---|---|
| 只有外圈 | 0.296 | 0.30（中間層 8 位元取整，差 0.004） |
| 兩個外圈重疊 | 0.296 | 0.30（取最大、不疊加） |
| 兩個內圈重疊 | 0.549 | 0.55 |
| 外圈＋敵方地面 | 0.549 | 0.55 |
| 只有敵方地面 | 0.549 | 0.55（舊 0.36） |

## 對示意疊圖（px，1280 畫面）
| 元素 | 示意 | 實機 | 差 |
|---|---|---|---|
| 暴擊字「暴擊 4,812」外框盒（`--dmg-crit` 色點） | 約 110×24（`ref/indicators-elite-tel-crit-1280.png`） | 155×33（S-C） | 寬 +45、高 +9：實機字級 24 是世界座標，畫面 ×ZOOM 1.35＝32.4 px；描邊 2 → 2.7 px。所有傷害數字都是這套，未改（待裁） |
| 敵人外框 | 1 px | 1 螢幕 px（剪影位移 1/ZOOM 世界單位） | 0 |
| 預警線 | 5 px 黑＋3 px（示意是實線） | 5 px 黑（實線）＋3 px `--enemy-tel` 虛線 [10, 6]（世界座標，畫面 ×1.35） | 線寬 ×1.35、彩色線改虛線（C24） |
| 預警圈、扇形位置大小 | 示意擺位是構圖 | 實機依怪物數值 | 不同源，不比 |
