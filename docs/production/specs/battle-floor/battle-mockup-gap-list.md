# 戰鬥場上指示：示意對實機差距清單

依據：mumi 2026-11-26 12:14（經幕僚長轉達）。只列場上指示與地板，**不列**面板 HUD、營地／倉庫面板。一份清單，不派修。

範圍：

1. 敵人呈現：外框、標記、敵方虛框＋危險圖示
2. 暴擊數字與暴擊特效
3. 預警圈（55%、合成 ≤ 0.55、teleCircle 0.30＋0.357）
4. 地板（實作見 `procedural-floor-impl.md`）；光影／道具只寫影響地板長相的部分

對照：

- 示意：`docs/production/specs/wireframes/W1-battle-hud/color/src/render_color.py` 與同目錄 1280 clean PNG（v1.3 定稿，#135）。顏色以戰鬥 HUD 顏色總表為準（`uiux/battle-hud-color-table-1126` @ `ef254d91`；M3／C24／C25）。晚於 PNG 的裁定以總表為準，並註明示意 PNG 還沒畫到。
- 實機碼：main `53e1bbad`；PR #210（`feat/m2-36-apply-1126` @ `474ff594`，M2-36 套值，不合併）；PR #211（`feat/battle-floor-shared-1126` @ `29615bea`，共用地板＋腳下陰影，不合併）。本清單由程式對示意來源推出，**沒有開遊戲、沒有跑實機**。實機畫面與碼不一致時標「未驗（需實機截圖）」。

參照裁切在 `docs/production/evidence/battle-floor/ref/`。

## 1. 一覽

| ID | 項 | 示意／總表 | main `53e1bbad` | #210／#211 | 負責人 |
|---|---|---|---|---|---|
| F1 | 地板算法 | 程序鋪磚，樣板 s1202 | 舊 temple s1103 單張平鋪 | #211 改單張 s5201，不翻、不變體 | 工程師 |
| F2 | 燈籠光暈色 | `--scene-lamp-glow` `#d9a774` 16% | `bGlow` 用 temple glow `255,179,90` α 0.16 | #210 已加 token，程式未接 | 工程師 |
| E1 | 敵人 1 px 外框 | 每隻 `rim(...,'enemy-rim')` | `spr()` 不加外框 | 未改 | 工程師 |
| E2 | 菁英／王腳圈 | 示意 PNG 沒有腳圈；C15 要王圈 3 px＋4 px #000 | 菁英 2 px `--enemy-rim` 70%；王 2 px `badHiV2` 60% | 未改 | 工程師 |
| E3 | 菁英名牌 | `--plate-world`＋`--tx-strong`＋16 px 標記 | 有名牌＋`eliteMark` | 未改 | 工程師（對圖） |
| E4 | 敵方地面虛框＋圖示 | C24／M3 要有；示意 PNG 沒畫地面異常 | 已有：36% 填、虛線 3 px、中央圖示 | 填色應改 55%；虛框與圖示保留 | 工程師 |
| T1 | 預警填色與合成 | 示意實心 55%；總表 ≤ 0.55、不疊加；teleCircle 外 0.30＋內 0.357 | `teleCircle` 外 0.08+0.12f、內 0.30，兩層相加；色是舊 `badV1` | 未改 | 工程師 |
| T2 | 預警線 | 3 px `--enemy-tel`＋外 1 px（實為 5 px）#000 | 2 px、`dmgHurtV1` α 0.7；無黑邊 | 未改 | 工程師 |
| T3 | 預警虛框＋危險圖示 | C24／M3 要有；示意 PNG 是實線、無圖示 | `teleCircle` 沒有；地面異常已有 | 預警圈要補到與地面異常同一套形狀規則 | 工程師（圖示若缺再交 AD） |
| T4 | 其他預警形狀的色 | 一律 `--enemy-tel` | 衝鋒／揮擊仍 `badV1`；遠程虛線 `elColdV3` | 未改 | 工程師 |
| C1 | 暴擊字色 | `--dmg-crit` `#f2cb9b` | `:root` `#ffd166`（`PAL.dmgCrit` 跟 CSS） | #210 已改 `#f2cb9b` | 工程師（隨 #210 或同等套值） |
| C2 | 暴擊字樣 | 「暴擊 4,812」，24 px，2 px `#000` 描邊 | 只寫數字；描邊 4 px、`scrim` 95% | 未改字樣／描邊 | 工程師 |
| C3 | 暴擊特效 | 示意 PNG 主要是數字，沒有另畫爆發 | `fxs('crit')` 可走 `sig_crit`；另有火花 | 未改 | 未驗（需實機截圖） |
| C4 | 元素傷害數字 | 總表 P1：一律 `--dmg-hit`（非暴擊） | `drawNums` 的 fire/cold/light/chaos 仍用 `ELC` | 未改 | 工程師 |

## 2. 逐項

### F1 地板

- 示意：`base_r2.py:33-61`、`render_final.py:119-134`；樣板 `art/tiles/lava/floor/tile_lava_floor-s1202.png`。不是 s5201。
- 實機：main `js/tiles.js:4` 單張 `temple-floor.274010e6.png`。#211 改 `temple-floor.7318bb46.png`（s5201 同檔），`BIO_ONE='temple'`，`bakeChunk` 仍 `T.floor[h(...) % length]` 且 length=1，不翻轉。
- 修法：照 `procedural-floor-impl.md` 載入時生成變體並接上。負責人：工程師。樣板已在 repo，不必新畫磚。
- 參照：`ref/floor-384x256.png`。另見 `preview-1280x720-示意.png`。

### F2 燈籠光暈（只影響地板長相）

- 示意：`render_color.py:175-180`，`--scene-lamp-glow` `#d9a774`，中心 16% 放射到 0。M2-36 第 39 行：`'lighter'` 疊加、不整片塗地面。
- 實機：`biome.js:612-633` `bGlow`，`rgba(${BIO().light},0.16)`（:623）；`BIO().light`＝`PAL.scene.temple.glow`（`biome.js:40`）；main `--scene-temple-glow-rgb: 255, 179, 90`（`css/style.css:258`）。#210 已加 `--scene-lamp-glow`／`-rgb`，`bGlow` 沒改接。
- 修法：戰場燈籠／火盆／香爐光暈改用 `--scene-lamp-glow` 16%，`'lighter'`，不要用舊的 `255,179,90`。負責人：工程師。
- 參照：暫用 `ref/floor-384x256.png`（此裁切光暈弱）與 HUD clean 牆邊燈籠附近。實機開燈後再疊。**未驗（需實機截圖）** 光暈半徑是否與示意一致（示意半徑 60、步進 6，`render_color.py:179`；實機 `d.l`：牆燈 190、香爐 120、火盆 150、石燈籠 110，`biome.js:412,416,422`，再乘畫出來的倍率）。

灰燼／紙錢（`prop_ash`、`prop_joss`，`render_color.py:183-185`）是示意場景道具；實機 temple 是香爐／石燈籠／甕（`biome.js:395,562+`）。只當場景佈置差異，不列阻擋；不要求把示意道具檔接到實機，除非 mumi 另定。

### E1 敵人 1 px `--enemy-rim` 外框

- 示意：`render_color.py:67-71` 的 `rim`（alpha 膨脹 1 px），每隻敵人與王都套（:225-232、:246）。色 `#fbbdbb`。
- 實機：`drawMob` 在 `render.js:600` 呼叫 `spr(...)` 之後沒有描邊（腳圈見 E2）。main 與 #210／#211 皆無。
- 修法：畫精靈後加 1 px `--enemy-rim` 外框（與 `rim()` 同等：不透明邊緣外一圈）。負責人：工程師。不必新圖。
- 參照：`ref/enemy-rim-1280.png`。

### E2 菁英／王腳圈

- 示意 PNG：沒有腳下彩色圈，只有陰影。顏色總表 C15：王腳下光圈 3 px `--enemy-tel`＋4 px 不透明 #000。
- 實機：`render.js:584-595`：菁英 2 px `PAL.enemyRim`、α 0.7；王 2 px `rgba(badHiV2, 0.6)`，皆為扁橢圓。
- 修法：王圈改先 4 px 不透明 #000，再 3 px `--enemy-tel-rgb` α 0.9（總表第 3.2 表「王腳下光圈」列；C15 寫 3 px＋4 px #000）。菁英腳圈示意沒有；若要留，對齊總表「非王目標：`PAL.enemyRim` α 0.9＋黑邊」，不要用 `badHiV2`。負責人：工程師。
- 參照：王圈暫無示意 PNG（C15 後於定稿圖）。對圖用實機截圖對總表 3.2／C15；菁英圈是否保留 **待 mumi**。截圖清單仍拍有菁英／王的畫面。

### E3 菁英名牌

- 示意：`render_color.py:236-242`，`--plate-world`、`--tx-strong`、16 px 多邊形標記，文案「菁英・…」。
- 實機：`render.js:1613` `drawPlates`、`:1669` `eliteMark`（角盔剪影），色 `--d2-tx-strong`，桌機字 16／高 22。
- 修法：對圖名牌位置、字級、標記是否可辨。標記形狀示意與實機不同（多邊形 vs 角盔），若只差造型、對比過，可留實機。負責人：工程師。
- 參照：`ref/elite-nameplate-1280.png`。**未驗（需實機截圖）** 疊圖誤差。

### E4 敵方地面（虛框＋危險圖示）

- 總表 C24／M3（mumi 11/26）：敵方地面／預警有虛框＋危險圖示，我方沒有；敵方填 55%，我方 14% 不動。示意 PNG 沒畫這類地面異常。
- 實機：`mech.js:764-790` 已有形狀：我方只 14% 填、無框；敵方 36% 填＋3 px 虛線 `[10, 6]`＋中央圖示（桌機 20、觸控 16 px）。色仍是舊地面色，不是全部 `--enemy-tel`。
- 修法：敵方填改 55%，重疊取最大值（C25）；虛框與圖示保留。色跟總表第 4 步（敵方地面 `--enemy-tel` 55%）。負責人：工程師。
- 參照：無示意裁切（PNG 沒畫）。對圖以 C24 形狀規則＋實機截圖。**未驗（需實機截圖）**。

### T1–T2 teleCircle 填色、合成、線

- 示意：`render_color.py:195-213`：填 `enemy-tel` 55% 畫在獨立層再貼上（自然不疊加）；線「3 px＋外 1 px #000」，實作先 5 px 不透明 #000 再 3 px `--enemy-tel`。
- 總表（`ef254d91` §1-6、第 3.2 表 teleCircle 列）：外圈填 0.30、進度內圈 0.357，合成 0.55，重疊取最大值；外框先 5 px 不透明 `PAL.ringEdge`，再 3 px `--enemy-tel-rgb` α 0.9。合成絕不可 > 0.6（0.6 時淺磚上 rim 對填色 2.96 < 3）。
- 實機：`render.js:503-515`：外 `rgba(badV1, 0.08+0.12*f)`（0.08–0.20）、內 `rgba(badV1, 0.3)`，兩次 `fill` **相加**；線 `rgba(dmgHurtV1, 0.7)`，函式內沒設 `lineWidth`（呼叫前 :151 是 2）。色不是 `--enemy-tel`。
- 修法：照總表改填色（0.30／0.357、max、色 `--enemy-tel-rgb`）與線（5 px #000＋3 px α 0.9）。可先畫到離屏再整層貼。負責人：工程師。
- 參照：`ref/telegraph-fan-1280.png`、`ref/telegraph-boss-circle-1280.png`、`ref/telegraph-ellipse-lowhp-1280.png`（示意是單一 55% 實心＋實線，沒有內圈進度；**進度內圈以總表為準**，示意 PNG 無此層）。

### T3 預警的虛框＋危險圖示

- 總表 C24：敵方預警也要虛框＋危險圖示。示意 PNG 是實線、沒有圖示（M3 在定稿圖之後）。
- 實機：`teleCircle` 無虛線、無圖示。地面異常已有一套（`mech.js:775-788`，虛線 `[10, 6]`、寬 3、中央圖示）。
- 修法：預警圈（含 teleCircle、扇形、橢圓）採用與敵方地面相同的虛框＋圖示規則；線寬與虛線間距先用地面那套當起點（待實測）。圖示：有對應異常用既有 `STATE`／`GROUND_IC`；沒有對應時用程式菱形（已有，`mech.js:783-787`）。若缺專用「危險」圖示，再交 Game Art Director。負責人：工程師。
- 參照：示意 PNG 尚未畫虛框／圖示。對圖以 C24 與實機形狀為準。**未驗（需實機截圖）**。

### T4 其他預警形狀的色

- 實機：`render.js:161-176` 王閃現已有 5 px `PAL.ringEdge`＋3 px `PAL.enemyTel`（α 0.3+0.6f，接近總表）；彈幕／衝鋒／揮擊（:178-208）仍 `PAL.rgb.badV1`；遠程／扇形虛線（:209-220）`elColdV3`。
- 修法：敵方預警一律 `--enemy-tel`／`--enemy-tel-rgb`，合成規則同 T1。負責人：工程師。
- 參照：無專用示意裁切（這些形狀示意沒全畫）。**未驗（需實機截圖）**。

### C1–C2 暴擊數字

- 示意：`render_color.py:278-281`：24 px、`--dmg-crit` `#f2cb9b`、2 px `--dmg-outline` `#000`，文案「暴擊 4,812」。
- 實機：`render.js:644-696`：暴擊 24 px、`PAL.dmgCrit`（:659）；main CSS `--dmg-crit: #ffd166`（:205），#210 改為 `#f2cb9b`。文案是 `numT(v)`，沒有「暴擊」前綴（`game.js:773-782` 的 `num()`，`skills.js:1670` 暴擊走 `'crit'`、無 txt）。描邊 4 px、`rgba(scrim, 0.95)`，不是 2 px `#000`。
- 修法：套 #210（或同等）讓 `--dmg-crit`＝`#f2cb9b`；暴擊數字前加「暴擊 」（千分位格式可沿用 `numT`）；描邊改 2 px 不透明 `#000`。另：豪賭「大獎」數字現用 `PAL.dmgCritV1`（`render.js:661`，main `#ffc21a`）；總表第 4 步列 81 改 `--dmg-crit` `#f2cb9b`。負責人：工程師。
- 參照：`ref/crit-number-1280.png`。綜合：`ref/indicators-elite-tel-crit-1280.png`。

### C3 暴擊特效

- 示意 PNG 看不到獨立爆發，只有數字。
- 實機：`game.js:804` `fxs('crit')` 可換成 `sig_crit`；`skills.js:1673` 暴擊火花用 `PAL.dmgCrit`。
- 修法：先拍實機。若特效蓋字或過亮，再對總表（特效勿蓋過數字、我方特效規則不套在敵方暴擊火花上）。負責人：工程師。**未驗（需實機截圖）**。
- 參照：暫用 `ref/crit-number-1280.png`（只有數字）。

### C4 元素傷害數字（非暴擊；總表 P1 一併改）

- 總表 P1（寫 `render.js:653-656`；實列 `654-657`）：改全部 `PAL.dmgHit`，元素靠圖示與殘留結晶。
- 實機：仍用 `ELC.fire/cold/light/chaos`。
- 修法：非暴擊元素數字改 `--dmg-hit` `#e8e5e1`（#210 已套此值；main 仍是 `#fff3e0`）。負責人：工程師。
- 參照：示意一般數字是 `--dmg-hit` 15 px（`render_color.py:278,284`）。無單獨裁切。**未驗（需實機截圖）**。

## 3. 工程師雲端場次：截圖清單

全部桌機 **1280×720**。390×844 只跑 touch_check，不另訂通過條件。不要開面板。檔名建議對應參照。沒有開遊戲，下列狀態由工程師用測試／除錯開出來。

| 編號 | 狀態（1280×720） | 對應參照 | 用來驗 |
|---|---|---|---|
| S-F | 戰鬥空場：無敵人、無掉落、無預警／技能／光柱；可見地板與（若有）燈籠光暈 | `ref/floor-384x256.png`、`preview-1280x720-示意.png` | F1、F2；裁 384×256 或全寬條疊圖 |
| S-E | 至少 1 菁英＋若干一般怪，未出手（無預警），名牌可見 | `ref/enemy-rim-1280.png`、`ref/elite-nameplate-1280.png` | E1、E2 菁英圈、E3 |
| S-B | 王戰，王在畫面中（有腳圈／判決圈更好） | `ref/telegraph-boss-circle-1280.png` | E2 王圈、T1–T3 |
| S-T | 可見 teleCircle 進度（炸彈或 slam 蓄力中），盡量讓圈壓到淺磚 | `ref/telegraph-fan-1280.png`、`ref/telegraph-ellipse-lowhp-1280.png` | T1、T2、T3、C25 淺磚 |
| S-TX | 兩個敵方預警或預警＋敵方地面重疊 | （無示意裁切，驗合成） | T1、C25：重疊處 α ≤ 0.55 |
| S-G | 我方元素地面 14% 與敵方地面 55% 同時在；敵方有虛框＋圖示、我方沒有 | （無示意裁切，驗 C24） | E4、C24 |
| S-C | 對菁英或王打出暴擊，數字在畫面中 | `ref/crit-number-1280.png`、`ref/indicators-elite-tel-crit-1280.png` | C1、C2、C3 |
| S-D | 掉落稀有／傳奇／追逐光柱落在淺磚上（可與 S-C 分開） | 無專用裁切；柱身規則見地板規格 §4 | 傳奇柱 2.757 項、C21 黑邊 |
| S6 | 最亂戰鬥（對齊顏色總表清單 S6）：王＋≥ 8 怪＋菁英＋我方技能＋敵方預警 | `ref/indicators-elite-tel-crit-1280.png` | 總覽；C*>40 面積 |

390×844：對 S-E、S-T、S-C 各拍 1 張，只跑 `tools/touch_check.js`，不另訂色差通過線。

## 4. 待 mumi

- E2：菁英腳圈示意沒有、實機有，要留還是拿掉。
- C2：「暴擊」前綴是否必須（示意有、實機沒有）。
- T3：示意 PNG 尚未畫虛框／圖示，是否即以 C24 為準讓工程師補上（本清單已當要做）。
- 傳奇光柱色對淺磚 2.757 < 3，見地板規格 §5。
