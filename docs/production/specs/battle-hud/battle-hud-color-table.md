# 戰鬥 HUD 顏色改動總表（第 2 步，對齊 battle-hud v1.3.6）

> **狀態：草案（UIUX 主筆，待 AD 共同定版）。** 基準 main `53e1bbad`。只寫文件。
> **對齊：** `specs/battle-hud/battle-hud.md` v1.3.6（含 -4 §12、-5 §17–18、-6 §23／§28）；色值以 `S/M2-36-palette-tokens.md` 為準。
> **範圍：** 只限戰鬥 HUD 與戰鬥指示（條與條上字、傷害數字、名牌、能量護盾、格擋弧、敵方預警與投射物、我方特效、腳圈、能量球、掉落牌、光柱、小地圖 D63）。1280×720 為準；390 只跑 touch_check。戰場地面（AD）、營地、倉庫、其他面板不列。名詞凍結。

## 0. 結論
- **第 3 步（整套套值 PR，:root 與伴生）**：27 列。HUD 的 CSS 已由 #146 的 `--d2-*` 層給 M2-36 值，外觀不變；**會變的是 canvas 戰鬥指示**。
- **第 4 步（顏色改碼 PR）**：100 列（168 舊 token 範圍內 91 列，加 3.2 的 9 項）。我方特效全部 `--fx-own` 9%，敵方填色合成 ≤ 0.55、重疊不疊加（AD 11/26 B1、B2、R1）。
- **待定 0 列**：原本 5 項已由 UIUX 裁定 11/26 定值（§4、§6）。
- **範圍外 77 列**（168 舊 token 中），見 §5；產生器、民房、居民相關列：0 列（只有 M2-36 `--scene-window` 角色文字有「民房」，屬場景）。
- (18)(19) 照 mumi 22:19 核准：(18) 在第 3 步；(19) 的程式改動（籌碼、火光）在範圍外，照原決定進套值 PR，M2-36 文字更正列在 §2。

## 1. 寫法（照 #159 與 main 現行）
1. 半透明一律 `rgba(var(--x-rgb), α)`；`-rgb` 寫逗號格式（`149, 232, 134`），palette.js 會刪空白。JS 寫 `` rgba(${PAL.rgb.x},α) ``。
2. 「同 X」在 :root 寫實際值，不寫 `var()`（Node 檢查工具讀原文）。
3. `--scene-lamp-glow` 只寫 hex `#d9a774`，16% 寫在使用處。
4. 敵方環與點的黑邊不透明；我方環 `--fx-own` 9% 加同 α 黑邊。
5. 行號都是 `53e1bbad` 的；「步」欄：3＝整套套值 PR，4＝顏色改碼 PR。
6. 敵方填色：任一點合成 ≤ 0.55，重疊取最大值不疊加（teleCircle 外圈＋內圈、敵方地面互疊、地面＋teleCircle）；可畫到離屏層再整層貼上。合成絕不超過 0.6（AD 量：0.6 時 `--enemy-rim` 對淺磚上的填色 2.96 < 3）。

## 2. 第 3 步：整套套值 PR（:root 與伴生）
| token | 舊值 | 新值 | 用途 | 使用處 | 步 | 決定 |
|---|---|---|---|---|---|---|
| `--dmg-hit` | `#fff3e0` | `#e8e5e1` | 一般擊中、物理數字 | render.js:652,658 | 3 | (16) |
| `--dmg-crit` | `#ffd166` | `#f2cb9b` | 暴擊字、豪賭底色、旗面等 | render.js:614,659；combat.js:645,2404；game.js:1271；mech.js:835,846；skills.js:1673 | 3 | (16) |
| `--dmg-hurt` | `#ff5a5a` | `#fbf9f6` | 受傷數字；地雷亮態 | render.js:662,1553 | 3 | (16) |
| `--dmg-gain` | `#ffd166` | `#95e886` | gold／lv 數字 | render.js:663 | 3 | (16) |
| `--dmg-minor` | `#9aa3ad` | `#aeaba7` | miss 數字 | render.js:666 | 3 | (16) |
| `--dmg-outline` | `rgba(0, 0, 0, 0.8)` | `#000000` | 數字 2 px 描邊 | render.js:552 | 3 | (16) |
| `--el-cold` | `#8fd6ff` | `#ade2f9` | 冰元素（環、地面、陷阱點） | data.js:6984（ELC.cold）；mech.js:96；render.js:654（數字，P1）,1526；skills.js:885,2194；ELC[el]（同 --el-phys 列） | 3 | (17)a |
| `--el-cold-rgb` | `143, 214, 255` | `173, 226, 249` | 我方冰投射物光暈 α0.3 | render.js:376 | 3 | (17)a |
| `--el-chaos` | `#c38bff` | `#e97ccf` | 混沌元素 | data.js:6984；render.js:656（數字，P1）；skills.js:930；ELC[el]（同 --el-phys 列） | 3 | (17)a |
| `--el-light` | `#ffe066` | `#f3f9a4` | 閃電元素 | game.js:1956；render.js:655（數字，P1）,971,1524；skills.js:2194；ELC[el]（同 --el-phys 列） | 3 | (16) |
| `--dodge-vignette-rgb` | `80, 180, 255` | `120, 200, 235` | 完美閃避藍邊 | render.js:482 | 3 | (16) |
| `--bad-hi` | `#f06a50` | `#ff9bba` | 目前目標光圈（cssv）；.bh-big 已由 d2 給值 | render.js:780（第 4 步 #159-6 改掉）；style.css:3165,3169 | 3 | (16) |
| `--good` | `#7fc95a` | `#95e886` | #pidle 增益字（d2 已給值）；能量球盛怒（第 4 步列 32） | style.css:3310,3323 | 3 | (16)(17)a |
| `--good-rgb` | `123, 211, 107` | `149, 232, 134` | 跟著 --good；戰鬥 HUD 無直接使用 | — | 3 | (17)a |
| `--warn` | `#e0614a` | `#a9ae68` | #pidle 警告字（d2 已給值） | style.css:3312,3325 | 3 | (16) |
| `--border-cap` | `#f1ebdc` | `#d9d3cd` | 焦點框（d2 已給值） | style.css:2744 | 3 | (16) |
| `--focus` | `#fbf9f5` | `#fbf9f6` | 焦點（d2 已給值） | style.css:3338（390 nav） | 3 | (16) |
| `--tx-off` | `#aa9a84` | `#9d9995` | 鎖住分頁字（d2 已給值） | style.css:3364 | 3 | (17)a |
| `--tx-empty` | `#6a5a48` | `#9d9995` | 戰鬥 HUD 無直接使用；第 4 步列 30 小地圖牆改用它 | — | 3 | (17)a |
| `--plate-world` | `rgba(11, 8, 6, 0.8)` | `rgba(37, 33, 30, 0.92)` | 王血條底（d2 已給值）；canvas 讀 --d2-plate-world | style.css:3160；render.js:1650 | 3 | (16) |
| `--panel-edge` | `（:root 沒有）` | `#a8927f` | 新增；HUD 由 d2 給值；canvas 鑄鐵框（第 4 步列 90） | style.css:3186,3232,3258,3297,3299 | 3 | (16) |
| `--chg-e` | `（沒有）` | `#b6889a` | 新增；能量球耐力（第 4 步列 41） | — | 3 | (18) |
| `--chg-p` | `（沒有）` | `#70b2f2` | 新增；能量球暴擊（第 4 步列 20） | — | 3 | (18) |
| M2-36 第 150 行（文件） | `#be88a4`／`#6fb0f0` | `#b6889a`／`#70b2f2` | `--chg-e`／`--chg-p` 定義列 | M2-36:150；引文見 CHANGELOG（mumi 11/21 22:19） | 3 | (18)、P4 |
| M2-36 角色文字（文件） | 照 main | 照 §2.1 原文 | 火光四處＋命運輪盤紅／紫籤 | M2-36:41,42,45,175,176,181 | 3 | (19)；引文見 CHANGELOG（mumi 11/21 22:19） |
| M2-36 `--dmg-crit` 角色（文件） | 照 main | 加「我方戰旗旗面」，值不變 | 列 19 | M2-36:160 | 3 | (7a)、I4 |
| `--el-phys` | `#fff3e0` | `#fbf9f6` | 物理火花（環改 `--fx-own` 9%，見 3.2） | data.js:6984；ELC[el]：mech.js:240,316,803,827；render.js:368；skills.js:1677,1791 | 3 | (16)、P2 |

**這次不改的 token**（戰鬥 HUD CSS 與 canvas 直接讀的 `--d2-*`）：見 [`UNCHANGED-TOKENS.md`](../../evidence/battle-hud-color/UNCHANGED-TOKENS.md)。

### 2.1 M2-36 角色文字更正原文（第 3 步套用；只改文字，色值不動；錨點在 main 53e1bbad 各只出現 1 次）
1. 第 41 行：`| 火舌中段 |` → `| 火舌中段、火盆火焰 |`
2. 第 42 行：`| 火舌外緣、炭火 |` → `| 火舌外緣、炭火、香頭火點 |`
3. 第 45 行：`| 民房、長老屋窗光；比篝火暗 |` → `| 民房、長老屋窗光、紅燈籠內光、石燈籠窗；比篝火暗 |`
4. 第 175 行：`腐化詞字色＋腐化圖示（M2-item-display v0.4 §9）` 後面加 `、命運輪盤「紅」籤`
5. 第 176 行：`災魘詞字色＋災魘徽章邊線` 後面加 `、命運輪盤「紫」籤`
6. 第 181 行（--mod 列）後面新增一行：`命運輪盤六籤（maps.js ROUL）：紅 --cat-corr、黑 --border-hi、金 --dmg-crit、綠 --good、藍 --el-cold、紫 --cat-cal；籤上一律有圖示＋名稱（金／綠綠色盲 2.7 靠圖示分）。`

另：第 150 行 `#be88a4`／`#6fb0f0` → `#b6889a`／`#70b2f2`；第 160 行 `--dmg-crit` 角色加「我方戰旗旗面」。

## 3. 第 4 步：顏色改碼 PR
### 3.1 168 個舊 token（範圍內）
| 列 | 舊 token＝舊值 | 使用處 | 用途 | → 新 | 新值 | 步 | 決定 |
|---|---|---|---|---|---|---|---|
| 2 | `--scene-void-rgb-v1`＝`21, 17, 13` | render.js:491 | 普通掉落名牌底 RBG[ | --panel-rgb α0.92 | `37, 33, 30` | 4 | (7a) |
| 3 | `--scene-void-rgb-v2`＝`8, 6, 5` | render.js:1065 | 小地圖底 α0.78 | --scrim-rgb α0.78 | `10, 7, 4` | 4 | (7a) |
| 6 | `--hl-v1`＝`#d6f3ff` | render.js:400 | 怪物投射物的實心核（s. | --enemy-rim | `#fbbdbb` | 4 | (4) |
| 7 | `--hl-v2`＝`#cfd8e3` | mech.js:827；render.js:576,1570；skills.js:1287,1387,2135,2182,2194 | 榴彈備用圓點、箭、圖騰計 | 環 → --fx-own 9%；箭／圓點／計時條 → --hl-rgb | `#c6c6c6／225, 220, 215` | 4 | (7a) |
| 8 | `--hl-v3`＝`#c3c7d0` | render.js:849 | 蓄力條：已滿一格 | --hl-rgb | `225, 220, 215` | 4 | (7a) |
| 9 | `--hl-v4`＝`#cfe9ff` | render.js:1526 | 冰霜陷阱旋轉小點 | --el-cold | `#ade2f9` | 4 | (7a) |
| 10 | `--hl-v5`＝`#cfe8ff` | game.js:1729 | 風伯風捲環（王） | --enemy-tel | `#ff3d7f` | 4 | (7a) |
| 11 | `--hl-v6`＝`#e8f4ff` | mech.js:852 | 飛劍（繞身） | --hl-rgb | `225, 220, 215` | 4 | (7a) |
| 12 | `--hl-v7`＝`#b8c4d4` | skills.js:1412 | 石膚環（我方） | --fx-own 9% | `#c6c6c6` | 4 | (7a) |
| 13 | `--hl-v8`＝`#c9d3e0` | combat.js:556 | 碎開衝擊環（我方） | --fx-own 9% | `#c6c6c6` | 4 | (7a) |
| 14 | `--glint-v3`＝`#e6f7ff` | render.js:380 | 我方冰投射物核 | --glint | `#ffffff` | 4 | (7a) |
| 15 | `--glint-v4`＝`#eef6ff` | render.js:410 | 我方一般投射物核 | --glint | `#ffffff` | 4 | (7a) |
| 16 | `--glint-v5`＝`#f4f5f7` | render.js:849 | 蓄力條全滿／閃 | --glint | `#ffffff` | 4 | (7a) |
| 17 | `--warm-glint-v1`＝`#ffd08a` | render.js:391 | 我方火投射物核 | --warm-glint-rgb | `255, 225, 170` | 4 | (7a) |
| 18 | `--warm-glint-v2`＝`#fff3b0` | render.js:1524 | 閃電陷阱旋轉小點 | --el-light | `#f3f9a4` | 4 | (7a) |
| 19 | `--hurt-vignette-v1`＝`#c0392b` | mech.js:841 | 戰旗的旗面（我方） | --dmg-crit | `#f2cb9b` | 4 | (7a) |
| 20 | `--dodge-vignette-v1`＝`#6cb8ff` | render.js:819 | 能量球：暴擊（藍） | --chg-p＋外 1 px #000 | `#70b2f2` | 4 | (3)(18) |
| 21 | `--dodge-vignette-v2`＝`#6fb7ff` | game.js:1747,2014 | 雨師驟雨環（王）；雨區  | --enemy-tel | `#ff3d7f` | 4 | (7a) |
| 22 | `--border-v2`＝`#4a3d33` | render.js:1549 | 地雷本體 | --border | `#817b75` | 4 | (7a) |
| 23 | `--border-mid-v3`＝`#5a4d43` | render.js:1561 | 圖騰柱身 | --border-mid | `#817b75` | 4 | (7a) |
| 24 | `--border-hi-v2`＝`#b08a5a` | mech.js:88,122；skills.js:1104 | 鋸齒地面、餘震地面（我方 | 地面 → --border-hi；環 → --fx-own 9% | `#b0aaa4／#c6c6c6` | 4 | (7a) |
| 25 | `--border-cap-v1`＝`#e8e2d6` | mech.js:120 | 劍陣地面（我方） | --border-cap | `#d9d3cd` | 4 | (7a) |
| 26 | `--tx-off-v1`＝`#c9a27a` | render.js:953 | 震地扇形（我方） | --fx-own 9%＋同 α 黑邊 | `#c6c6c6` | 4 | (7a)、B1 |
| 29 | `--tx-lock-v3`＝`#8a7a6a` | render.js:1002 | 腳下塵土（人物、怪） | --border | `#817b75` | 4 | (7a) |
| 30 | `--tx-empty-rgb-v1`＝`120, 105, 92` | render.js:1077 | 小地圖牆 α0.9 | --tx-empty → 補 --tx-empty-rgb | `157, 153, 149` | 4 | (7a) |
| 31 | `--on-act-rgb-v2`＝`255, 236, 214` | render.js:761 | 追逐掉落光柱的芯 | --on-act-rgb | `252, 249, 243` | 4 | (7a) |
| 32 | `--good-v1`＝`#7be08a` | render.js:819 | 能量球：盛怒（綠） | --good | `#95e886` | 4 | (3) |
| 33 | `--good-v2`＝`#9df29d` | render.js:1098；skills.js:957 | 小地圖玩家點；三連隕石環 | 點 → --good；環 → --fx-own 9% | `#95e886／#c6c6c6` | 4 | #159-4 |
| 34 | `--good-v3`＝`#7bd36b` | render.js:1516,1579 | 召喚物／圖騰血條 | --good | `#95e886` | 4 | (7a) |
| 35 | `--good-v4`＝`#8fd16b` | mech.js:89；skills.js:1402 | 毒霧地面（我方，混沌）； | 地面 → --el-chaos；環 → --fx-own 9% | `#e97ccf／#c6c6c6` | 4 | (7a) |
| 36 | `--good-v5`＝`#a8c24a` | mech.js:177 | 荊棘地面（物理） | --border-hi | `#b0aaa4` | 4 | (7a) |
| 38 | `--good-rgb-v1`＝`157, 242, 157` | render.js:1501 | 戰狼腳下圈 α0.6 | --good-rgb α0.6 | `149, 232, 134` | 4 | (7a) |
| 39 | `--bad-v5`＝`#ff3b3b` | mech.js:771；render.js:604 | 怪物地面紅虛線框；怪物蓄 | --enemy-tel | `#ff3d7f` | 4 | (7a) |
| 40 | `--bad-v6`＝`#c95050` | render.js:1095 | 小地圖一般怪點 | --enemy-tel，4×4 #000 底 | `#ff3d7f` | 4 | #159-2 |
| 41 | `--bad-hi-v3`＝`#ff6b5b` | render.js:819 | 能量球：耐力（灰玫瑰） | --chg-e＋外 1 px #000 | `#b6889a` | 4 | (3)(18) |
| 42 | `--bad-hi-rgb-v1`＝`255, 107, 61` | render.js:263（外框 258） | 隕石落點填色（我方） | --fx-own 9%（填色不加黑邊；外框是線，加同 α 黑邊） | `#c6c6c6` | 4 | (7a)、B1 |
| 43 | `--bad-hi-rgb-v2`＝`255, 100, 60` | render.js:587 | 王腳下光圈 α0.6 | --enemy-tel-rgb α0.9＋4 px #000（3.2） | `255, 61, 127` | 4 | #159-6 |
| 44 | `--bad-rgb-v1`＝`229, 72, 77` | render.js:178,194,196,205,227,504,508 | 一般預警：彈幕、衝鋒、揮 | --enemy-tel-rgb，合成 ≤ 0.55（§1-6） | `255, 61, 127` | 4 | (4)、B2 |
| 45 | `--hp-v3`＝`#7a1c1c` | render.js:1553 | 地雷閃點的暗態 | --prog-lo | `#3c3935` | 4 | (7a) |
| 46 | `--prog-lo-v1`＝`#6b4a2b` | render.js:1556 | 砲塔圖騰本體 | --border | `#817b75` | 4 | (7a) |
| 47 | `--prog-hi-v1`＝`#c9a46b` | render.js:1558,1563 | 砲塔橫桿；圖騰頂 | --border-hi | `#b0aaa4` | 4 | (7a) |
| 48 | `--prog-hi-v2`＝`#e3a14a` | game.js:1937 | 王「橫衝直撞」狀態環；W | 環 → --enemy-rim；.c 刪 | `#fbbdbb` | 4 | (7a) |
| 50 | `--rar-normal-v1`＝`#d9c7a3` | render.js:367 | 弩箭（我方投射物） | --hl-rgb | `225, 220, 215` | 4 | (7a) |
| 51 | `--rar-normal-v2`＝`#c9b8a8` | game.js:616,1104 | 怪物出現環；擊殺火花 | 環 → --enemy-rim；火花 → --tx-dim | `#fbbdbb／#aeaba7` | 4 | (7a) |
| 52 | `--rar-magic-bg-rgb-v1`＝`18, 24, 51` | render.js:492 | 魔法掉落名牌底 | --rar-magic-bg → 補 --rar-magic-bg-rgb α0.95 | `35, 35, 43` | 4 | (7a) |
| 54 | `--rar-rare-bg-v3`＝`#8a6a2a` | mech.js:91 | 油地面 | --border | `#817b75` | 4 | (7a) |
| 55 | `--rar-rare-bg-rgb-v1`＝`42, 33, 13` | render.js:493 | 稀有掉落名牌底 | --rar-rare-bg → 補 --rar-rare-bg-rgb α0.95 | `38, 36, 27` | 4 | (7a) |
| 56 | `--rar-unique-v2`＝`#7fd1c7` | game.js:1995 | 勾魂鎖鏈拉人環（王）；W | 環 → --enemy-rim；.c 刪 | `#fbbdbb` | 4 | (7a) |
| 57 | `--rar-chase-v2`＝`#ff8a2a` | mech.js:153 | 點燃地面 | --el-fire | `#ee9978` | 4 | (7a) |
| 58 | `--rar-chase-hi-v1`＝`#ffb36b` | render.js:267 | 隕石球（我方） | --warm-glint-rgb | `255, 225, 170` | 4 | (7a) |
| 59 | `--rar-chase-hi-v2`＝`#ffc9a0` | render.js:1525 | 火焰陷阱旋轉小點 | --el-fire | `#ee9978` | 4 | (7a) |
| 60 | `--rar-chase-bg-v3`＝`#3a1a14` | mech.js:793 | 屍體血漬 α0.4 | --scene-X-dark-rgb α0.4 | `10, 7, 4` | 4 | (7a) |
| 61 | `--asc-hi-v2`＝`#ffb3a0` | render.js:961 | 小爪痕（一般怪、狼、魔像 | --hl-rgb | `225, 220, 215` | 4 | (7a) |
| 62 | `--cat-frac-v4`＝`#fff3d6` | mech.js:240；render.js:995 | boomAt 預設環；f | --fx-own 9% | `#c6c6c6` | 4 | (7a) |
| 63 | `--cat-frac-rgb-v1`＝`255, 244, 214` | render.js:768 | 普通掉落光柱的芯 | --glint-rgb | `255, 255, 255` | 4 | (7a) |
| 64 | `--cat-frac-rgb-v2`＝`255, 240, 210` | render.js:943 | 斬擊漸層中段（我方） | --fx-own 9%（填色，不加黑邊） | `#c6c6c6` | 4 | (7a)、B1 |
| 65 | `--cat-mem-v2`＝`#8fe0ff` | render.js:1029 | 完美閃避環 | --fx-own 9%＋同 α 黑邊 | `#c6c6c6` | 4 | (7a)、B1 |
| 66 | `--cat-mem-rgb-v1`＝`143, 224, 255` | render.js:897 | 完美閃避後下一擊的刀光圈 | --fx-own 9%＋同 α 黑邊 | `#c6c6c6` | 4 | (7a)、B1 |
| 67 | `--el-fire-v1`＝`#ff8a5b` | game.js:1555,1564,2173；render.js:961 | 自爆環、七情王環（敵）； | 環 → --enemy-tel；大爪痕 → --enemy-rim | `#ff3d7f／#fbbdbb` | 4 | (7a) |
| 68 | `--el-fire-rgb-v2`＝`255, 120, 50` | render.js:623 | 怪身上的點燃光 α0.3 | --el-fire-rgb | `238, 153, 120` | 4 | (7a) |
| 69 | `--el-cold-v3`＝`#6fd3ff` | mech.js:109 | 鹹水地面（我方，冰緩） | --el-cold | `#ade2f9` | 4 | (7a) |
| 71 | `--el-cold-rgb`＝`143, 214, 255` | render.js:376 | 我方冰投射物光暈 α0. | --el-cold-rgb 改值成官方伴生 | `173, 226, 249` | 4 | (7a) |
| 72 | `--el-cold-rgb-v3`＝`122, 208, 255` | render.js:212,396 | 怪物遠程預警虛線；怪物投 | --enemy-tel-rgb | `255, 61, 127` | 4 | (4) |
| 73 | `--el-cold-rgb-v4`＝`170, 210, 255` | render.js:241 | 雷暴（我方）刀光 | --fx-own 9%＋同 α 黑邊 | `#c6c6c6` | 4 | (7a)、B1 |
| 74 | `--el-cold-rgb-v5`＝`200, 230, 255` | render.js:408 | 我方投射物拖尾 α0.2 | --glint-rgb | `255, 255, 255` | 4 | (7a) |
| 75 | `--el-light-v1`＝`#ffe08a` | mech.js:125 | 奉獻地面（友方回血） | --good | `#95e886` | 4 | (7a) |
| 76 | `--el-light-v2`＝`#ffe14d` | mech.js:145 | 感電地面 | --el-light | `#f3f9a4` | 4 | (7a) |
| 77 | `--el-chaos-v1`＝`#b28dff` | game.js:1551,1904,1911,1913,1945,1966 | 王／怪的環 ×6（gam | --enemy-tel | `#ff3d7f` | 4 | (7a) |
| 78 | `--el-chaos-rgb-v2`＝`195, 139, 255` | render.js:241 | 毒刃雨（我方）刀光 | --fx-own 9%＋同 α 黑邊 | `#c6c6c6` | 4 | (7a)、B1 |
| 79 | `--dmg-hit-v1`＝`#b4b9c2` | render.js:1523 | 物理陷阱圓環 | --dmg-minor | `#aeaba7` | 4 | (7a) |
| 80 | `--dmg-hit-v2`＝`#e4e7ec` | render.js:1523 | 物理陷阱小點 | --dmg-hit | `#e8e5e1` | 4 | (7a) |
| 81 | `--dmg-crit-v1`＝`#ffc21a` | render.js:661 | 豪賭大獎數字 | --dmg-crit | `#f2cb9b` | 4 | (7a) |
| 82 | `--dmg-crit-v2`＝`#ffcf6b` | skills.js:1139,1961 | 嘲諷環（執政官、魔像，我 | --fx-own 9% | `#c6c6c6` | 4 | (7a) |
| 84 | `--dmg-hurt-rgb-v1`＝`255, 120, 110` | render.js:512 | teleCircle 外 | --enemy-tel-rgb α0.9 3 px＋5 px 不透明 #000 | `255, 61, 127` | 4 | (6) |
| 86 | `--dmg-gain-v2`＝`#b8f0c8` | render.js:665 | 迴避數字 | --dmg-minor | `#aeaba7` | 4 | P3b |
| 89 | `--dmg-minor-v3`＝`#c9a3a3` | render.js:669 | 持續傷害數字 | --dmg-minor | `#aeaba7` | 4 | (7a) |
| 90 | `--dmg-minor-v4`＝`#a7acb6` | render.js:500 | canvas 鑄鐵框內線 | --panel-edge | `#a8927f` | 4 | (7a) |
| 91 | `--dmg-minor-v5`＝`#979ba5` | render.js:849 | 蓄力條：部分 | --tx-dim | `#aeaba7` | 4 | (7a) |
| 93 | `--dmg-minor-v7`＝`#aaaaaa` | game.js:2153 | 連鎖火花 | --tx-dim | `#aeaba7` | 4 | (7a) |
| 94 | `--dmg-minor-v8`＝`#9aa0a8` | mech.js:139 | 煙霧地面 | --tx-off | `#9d9995` | 4 | (7a) |
| 158 | `--fx-render-1-rgb`＝`70, 130, 255` | render.js:237 | 雷暴（我方）範圍填色 α | --fx-own 9%（填色，不加黑邊） | `#c6c6c6` | 4 | (7a)、B1 |
| 159 | `--fx-render-2-rgb`＝`150, 80, 220` | render.js:237 | 毒刃雨（我方）範圍填色  | --el-chaos-rgb | `233, 124, 207` | 4 | (7a) |
| 160 | `--fx-render-3`＝`#ffc4d6` | render.js:410 | 粉紅投射物核（s.pin | 刪除 s.pink 分支 | `—` | 4 | (7a) 死碼 |
| 161 | `--fx-game-1`＝`#7dff9a` | game.js:1848 | 十二生肖陣的安全格環 | --good | `#95e886` | 4 | (7a) |
| 162 | `--fx-mech-1`＝`#7a3fa0` | mech.js:136 | 腐化地面 | --el-chaos | `#e97ccf` | 4 | (7a) |
| 163 | `--fx-mech-2`＝`#5fae7a` | mech.js:168 | 凋零地面 | --el-chaos | `#e97ccf` | 4 | (7a) |
| 164 | `--fx-mech-3`＝`#ff5a8a` | mech.js:180 | 怒號地面（友方） | --good | `#95e886` | 4 | (7a) |
| 167 | `--fx-combat-1`＝`#8a6cff` | combat.js:634 | 收割爆炸環（我方） | --fx-own 9% | `#c6c6c6` | 4 | (7a) |

**第 4 步補的 `-rgb` 伴生（(7a)）**：`--el-chaos-rgb: 233, 124, 207`（列 78、159）、`--tx-empty-rgb: 157, 153, 149`（列 30）、`--rar-magic-bg-rgb: 35, 35, 43`（列 52）、`--rar-rare-bg-rgb: 38, 36, 27`（列 55）。其餘 (7a) 伴生屬場景，不在本表。

### 3.2 #159 後續與 (1)–(6) 裡的戰鬥項（不在上表的改法）
| 項 | 使用處 | 現在 | 改成 | 步 | 決定 |
|---|---|---|---|---|---|
| teleCircle 填色＋外框 | render.js:503–515 | 填 `rgb.badV1` α0.08–0.38；外框 `rgb.dmgHurtV1` α0.7 2 px | 填 `--enemy-tel-rgb`：外圈 0.30、進度內圈 0.357，合成 0.55（列 44；UIUX 裁定 11/26 選 b，進度靠填色差看得出）；外框先 5 px 不透明 `PAL.ringEdge`，再 3 px `--enemy-tel-rgb` α0.9（列 84） | 4 | #159-1、(6)、B2 |
| 小地圖一般怪點 | render.js:1095–1096 | `PAL.badV6` 2×2 | 先 4×4 不透明 `PAL.ringEdge`，再 2×2 `PAL.enemyTel`（列 40） | 4 | #159-2 |
| 小地圖菁英點 | render.js:1095–1096 | `PAL.enemyRim` 2×2 | 同上加 4×4 黑底，點用 `PAL.enemyRim` | 4 | #159-3 |
| 小地圖玩家點 | render.js:1098–1099 | `PAL.goodV2` 4×4 | 先 6×6 `PAL.ringEdge`，再 4×4 `PAL.good`（列 33） | 4 | #159-4 |
| 王腳下光圈／目前目標 | render.js:587、780 | 王 `rgb.badHiV2` α0.6；目標 `cssv('--bad-hi')` α0.6 | 王：4 px 不透明 #000＋3 px `--enemy-tel-rgb` α0.9（列 43）；非王目標：`PAL.enemyRim` α0.9＋黑邊；改走 PAL，不用 cssv | 4 | #159-6 |
| 元素傷害數字 | render.js:653–656 | `ELC.fire/cold/light/chaos` | 全部 `PAL.dmgHit`（元素靠圖示與殘留結晶分，不靠數字色） | 4 | P1 |
| 我方元素環（全部元素） | mech.js:240,316；skills.js:885,1723,1791,1810；render.js:985–987（非 fxOwn 時 α0.9） | `ELC[el]`，α0.9＋不透明黑邊 | `--fx-own` #c6c6c6 9%＋同 α 黑邊；元素靠圖示與殘留結晶分（mech.js:798 屬拾取物，照舊） | 4 | P1、P2、B1 |
| 敵方地面填色 | mech.js:764 | 敵方 0.36（我方 0.14） | 敵方 0.55，重疊不疊加（§1-6）；我方不動 | 4 | B2、M3 |
| 王閃現線 α | render.js:168 | `globalAlpha = 0.3 + 0.6 * f` | `0.7 + 0.2 * f`；5 px 不透明 `PAL.ringEdge`（165–167）不變 | 4 | (5) |

## 4. 原待定，UIUX 裁定 11/26 已定（P3）
| 列 | 舊 token＝舊值 | 使用處 | 用途 | → 新 | 新值 | 步 | 決定 |
|---|---|---|---|---|---|---|---|
| 85 | `--dmg-gain-v1`＝`#8fe0ff` | render.js:664 | 完美閃避數字 | --dmg-gain | `#95e886` | 4 | P3 |
| 87 | `--dmg-gain-v3`＝`#d6b8ff` | render.js:667 | 材料數字（#208 已拿掉戰場逐殺浮字，只用在還會畫材料字的地方） | --dmg-gain | `#95e886` | 4 | P3 |
| 88 | `--dmg-minor-v2`＝`#cfd8e3` | render.js:657 | 格擋數字 | --dmg-minor | `#aeaba7` | 4 | P3 |

## 5. 範圍外（168 舊 token 中 77 列，不列入本表）
- 地圖外（戰場地面）：1 列（1）
- 戰場地面外框：1 列（4）
- 營地稻草人：2 列（5,92）
- 世界地圖死碼：4 列（27,83,165,166）
- 天賦面板：1 列（28）
- 輪盤籌碼：4 列（37,53,70,95）
- 營地火盆：1 列（49）
- 場景（biome）：62 列（96–157）
- 工具 mock：1 列（168）
- 列 44 的觸控取消（touch.js:54，`PAL.badHi`）只有 390，移出本表。
- 另外不列：#159 後續的地圖台符文（營地）、`--asc`（天賦）、`#pnav .dot`（390）；5 個「同 X」中的 `--tx-title`／`--tx-scene`／`--mod-mm`／`--mod-co` 在戰鬥 HUD 1280 沒有使用處（不列）。

## 6. 矛盾與裁定（UIUX 裁定 11/26，UIUX設計師為畫面規格裁定人）
| # | 問題 | 裁定 |
|---|---|---|
| P1 | 元素傷害數字 render.js:653–656 用元素色；M2-36 第 159 行與 -4 §12 寫全用 `--dmg-hit` | 「UIUX 裁定 11/26」全部 `--dmg-hit`；元素靠圖示與殘留結晶區分，不靠彩色環（環也改 `--fx-own` 9%，B1；不申請例外） |
| P2 | `--el-phys`＝`--tx-strong` 後，物理環對 `--hero-ring` ΔE2000 2.1 | 「UIUX 裁定 11/26」物理環改 `--fx-own` 9%；`--el-phys` 照 M2-36 #fbf9f6 |
| P3 | 列 85／87／88 數字色跟 M2-36 第 162–163 行不一致 | 「UIUX 裁定 11/26」完美閃避、材料用 `--dmg-gain`，格擋用 `--dmg-minor`；列 87 只套還會畫材料字處（#208 已拿掉逐殺浮字） |
| P3b | 列 86 迴避數字 vs M2-36 第 163 行 | 「UIUX 裁定 11/26」`--dmg-minor`（迴避要安靜） |
| P4 | (18) 新色 vs main M2-36 第 150 行舊值 | 「UIUX 裁定 11/26」(18) 為準：第 3 步同時改第 150 行（§2） |
| M3 | 我方元素地面 14% 對敵方地面（色盲不過門檻） | 已定（mumi 11/26，引文見 CHANGELOG；(7a) 不變）：敵方有虛框＋危險圖示，我方沒有；我方 14% 不動，敵方合成 ≤ 0.55（同 B2）；形狀與圖示畫法另交形狀區分工作，無新色值 |
| P5 | `--d2-*` 層套值後重複，含非 M2-36 token | 「UIUX 裁定 11/26」v1.3.6 驗收後另開收尾工作；本表不改列 |
| P6 | (5) 倒數半徑 1.6r→1.0r、600 ms 屬戰鬥時間 | 「UIUX 裁定 11/26」放預兆 PR；本表只留 α |
| P7 | `rgb(var(--x-rgb)/α)` 跟逗號 `-rgb` 不相容 | 「UIUX 裁定 11/26」標準寫法 `rgba(var(--x-rgb), α)` |
| P8 | 只列行號；`ELC[el]` 只列呼叫行 | 「UIUX 裁定 11/26」可以 |

名詞紀錄（不改名，交本地化編輯）：(18) 原話「暗影球」，M2-36 與程式 `--chg-p` 叫「暴擊」球。

## 7. AD 意見
Game Art Director 11/26 簽核與複核意見B1–B3、I1–I5、N1、N4、N5 與 M3（mumi 11/26）已併入本版。列 60 屍體血漬歸 AD 地面範圍，值照本表。

## 8. AD 簽名確認
| 角色 | 簽名 | 日期時間（UTC+8） | 意見 |
|---|---|---|---|
| Game Art Director | Game Art Director | 2026-11-26 10:38 | 照 head `6fad35e3` 簽核：第 3 步 27 列、第 4 步 100 列的色值，跟 M2-36（main 53e1bbad）和 mumi 已核准的值一致；我方特效全部 `--fx-own` 9%；敵方填色合成 ≤ 0.55、重疊不疊加（teleCircle 0.30＋0.357＝0.55，淺磚上 enemy-rim 3.07）；M2-36 角色文字照 §2.1（套用後 25,005 B）。引文：mumi 2026-11-21 22:19 (18)(19)、11/26 M3，都是經幕僚長轉達，見 CHANGELOG。名詞「暗影球／暴擊球」交本地化編輯。 |
| UIUX設計師 |  |  |  |
