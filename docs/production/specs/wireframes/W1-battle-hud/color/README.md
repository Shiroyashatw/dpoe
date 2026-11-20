# battle-hud v1.3 上色示意圖（final，2026-11-20 mumi 16:32）

規格本文：[`../../../battle-hud/battle-hud.md`](../../../battle-hud/battle-hud.md)。座標、尺寸、熱區一律以規格表（產生器 `../src/gen_battle_hud.py`）為準；本資料夾的圖是「實機大概長這樣」的示意，色票只用 D2 定案 token。

## 檔案（5 狀態 × 2 尺寸 × 2 種）
- `battle-hud-v13-color-{state}-{size}.png`：主圖＝上色畫面（1x 實際解析度）＋元件 id 小標＋右側說明欄（每行「id｜功能名稱｜x,y w×h｜字級｜token｜熱區」）。
- `battle-hud-v13-color-{state}-{size}-clean.png`：乾淨的實機樣子，剛好 W×H。
- state：`normal`（光環 7）、`boss`（王「上尸」＋大招判決預警）、`lowhp`（生命 301 / 968）、`lootflood`（光環 9→6＋「+3」、狀態 10→7＋「+3」）、`collapsed`（收到最小）。size：`390x844`、`1280x720`。
- 右下角戳記「battle-hud v1.3（final，2026-11-20 mumi 16:32）・上色」。

## 產生與自檢
```
cd src
python3 render_color.py            # 輸出到 color/；也可給輸出資料夾參數
python3 check_overlay.py           # → ../check_report.md、../check/overlay-*.png
```
- 字型 Noto Sans CJK TC（`--font: 'Noto Sans TC'`）；規格寫「等寬」處用 Noto Sans Mono CJK TC。像素圖只做整數倍縮放。
- `render_meta.json`：每段文字的框與實際墨跡、每個 HUD 元件的實際畫素範圍、用到的素材、放不下的字。
- 自檢方法：每畫一個 HUD 元件就比對前後差異取實際畫素範圍，和元件表的框比，四邊 ≤1 px；疊圖用同資料夾上層的 `W1_battle-*_overlay.png`。文字對比用 WCAG 2.x，底色取字框內實際像素中位數。

## 色票來源（`src/tokens.py`）
`palette-D2-final-ui.md` v1.6、`palette-D2-panel-1plus.md` v1.1、`M2-36-palette-tokens.md`、`camp-mood-D2.md`（皆在 `docs/production/specs/`）。

## 素材（`assets/`，不用生圖）
- `assets/repo/`：dpoe main @51162c9a 的 `js/art.js`（技能、光環、怪物、裝備、通貨圖）、`img/`、`art/fx/`（fireball、frostbolt、sig_beam、sig_chase、void）。
- `assets/pick/`：PixelLab 挑選圖（M2-36-d2 各批、M2-40 icons），每張的 branch:path 在 `assets/pick/SOURCES.txt`。
- 借用／暫代與需要的正式素材規格：[`../../../battle-hud/assets-borrowed.md`](../../../battle-hud/assets-borrowed.md)。沒有「佔位」框。

## 已知（照規格處理，不是錯）
- 390 P43 放不下「・目標 62%」→ 照規則收掉；1280 D27 放不下目標名「長老屋 Lv7」→ 照 P43 規則先收。
