# 戰鬥 HUD 顏色改動總表（第 2 步，對齊 battle-hud v1.3.6）

> **狀態：草案（UIUX 主筆，待 AD 共同定版）。** 基準 origin/main `53e1bbad`（2026-11-26 10:07 UTC+8 取）。只寫文件，不改程式。
> **對齊：** `specs/battle-hud/battle-hud.md` v1.3.6（含 battle-hud-4 §12 戰場訊號與顏色、-5 §17–18 格擋弧、-6 §23 危急紅邊／§28 能量護盾）；色值以 `S/M2-36-palette-tokens.md` 為準。
> **範圍：** 只限戰鬥 HUD 與戰鬥指示（血條與條上字、暴擊與傷害數字、敵人名牌、底部生命／魔力條、能量護盾、格擋弧、敵方預警與投射物、我方特效、主角腳圈、能量球、掉落牌與光柱、小地圖 D63）。桌機 1280×720 為準；390 只跑 touch_check，不做 390 顏色。戰場地面（AD 負責）、營地、倉庫、其他面板不列。名詞凍結，不改名。

## 0. 結論
- **第 3 步（整套套值 PR，:root 與伴生）**：23 列。戰鬥 HUD 的 CSS 已經由 #146 的 `--d2-*` 層給 M2-36 值，所以套值後 HUD 外觀不變；**畫面會變的是 canvas 戰鬥指示**（傷害數字 5 色、描邊、元素色、完美閃避藍邊、能量球新增 token）。
- **第 4 步（顏色改碼 PR）**：94 列（168 舊 token 裡在範圍內的 88 列，加上 #159 後續 6 項）。
- **待定 5 列**：不填新值，見 §4、§6。
- **範圍外 77 列**（168 舊 token 中），見 §5；產生器、民房、居民相關列：0 列（唯一相關的是 M2-36 `--scene-window` 角色文字「民房」，屬場景，不在本表）。
- (18)(19) 照 mumi 22:19 核准、製作人 23:07 確認：(18) 兩色列在第 3 步；(19) 籌碼與 4 處火光都在戰鬥 HUD 範圍外（地圖裝置、場景道具），本表不列，仍照原決定進套值 PR。

## 1. 寫法（照 #159 與 main 現行）
1. 半透明一律 `rgba(var(--x-rgb), α)`；`-rgb` 寫逗號格式（`149, 232, 134`），palette.js 會刪空白。JS 寫 `` rgba(${PAL.rgb.x},α) ``。
2. 「同 X」在 :root 寫實際值，不寫 `var()`（Node 檢查工具讀原文）。
3. `--scene-lamp-glow` 只寫 hex `#d9a774`，16% 寫在使用處。
4. 敵方環與點的黑邊不透明；我方環 `--fx-own` 9% 加同 α 黑邊。
5. 行號都是 `53e1bbad` 的；「步」欄：3＝整套套值 PR，4＝顏色改碼 PR。

## 2. 第 3 步：整套套值 PR（:root 與伴生）
| token | 舊值 | 新值 | 用途 | 使用處 | 步 | 決定 |
|---|---|---|---|---|---|---|
| `--dmg-hit` | `#fff3e0` | `#e8e5e1` | 一般擊中、物理數字 | render.js:652,658 | 3 | (16) |
| `--dmg-crit` | `#ffd166` | `#f2cb9b` | 暴擊字、豪賭底色、旗面等 | render.js:614,659；combat.js:645,2404；game.js:1271；mech.js:835,846；skills.js:1673 | 3 | (16) |
| `--dmg-hurt` | `#ff5a5a` | `#fbf9f6` | 受傷數字；地雷亮態 | render.js:662,1553 | 3 | (16) |
| `--dmg-gain` | `#ffd166` | `#95e886` | gold／lv 數字 | render.js:663 | 3 | (16) |
| `--dmg-minor` | `#9aa3ad` | `#aeaba7` | miss 數字 | render.js:666 | 3 | (16) |
| `--dmg-outline` | `rgba(0, 0, 0, 0.8)` | `#000000` | 數字 2 px 描邊 | render.js:552 | 3 | (16) |
| `--el-cold` | `#8fd6ff` | `#ade2f9` | 冰元素（環、地面、陷阱點） | data.js:6984（ELC.cold）；mech.js:96；render.js:654（數字，見待定 P1）,1526；skills.js:885,2194；ELC[el]：mech.js:240,316,803,827；render.js:368；skills.js:1677,1791 | 3 | (17)a |
| `--el-cold-rgb` | `143, 214, 255` | `173, 226, 249` | 我方冰投射物光暈 α0.3 | render.js:376 | 3 | (17)a |
| `--el-chaos` | `#c38bff` | `#e97ccf` | 混沌元素 | data.js:6984；render.js:656（數字，P1）；skills.js:930；ELC[el]：mech.js:240,316,803,827；render.js:368；skills.js:1677,1791 | 3 | (17)a |
| `--el-light` | `#ffe066` | `#f3f9a4` | 閃電元素 | game.js:1956；render.js:655（數字，P1）,971,1524；skills.js:2194；ELC[el]：mech.js:240,316,803,827；render.js:368；skills.js:1677,1791 | 3 | (16) |
| `--dodge-vignette-rgb` | `80, 180, 255` | `120, 200, 235` | 完美閃避藍邊 | render.js:482 | 3 | (16) |
| `--bad-hi` | `#f06a50` | `#ff9bba` | 目前目標光圈（cssv）；.bh-big 已由 d2 給值 | render.js:780（第 4 步 #159-6 改掉）；style.css:3165,3169 | 3 | (16) |
| `--good` | `#7fc95a` | `#95e886` | #pidle 增益字（d2 已給值）；能量球盛怒（第 4 步列 32） | style.css:3310,3323 | 3 | (16)(17)a |
| `--good-rgb` | `123, 211, 107` | `149, 232, 134` | 跟著 --good；戰鬥 HUD 無直接使用 | — | 3 | (17)a |
| `--warn` | `#e0614a` | `#a9ae68` | #pidle 警告字（d2 已給值） | style.css:3312,3325 | 3 | (16) |
| `--border-cap` | `#f1ebdc` | `#d9d3cd` | 焦點框（d2 已給值） | style.css:2744 | 3 | (16) |
| `--focus` | `#fbf9f5` | `#fbf9f6` | 焦點（d2 已給值） | style.css:3338（390 nav） | 3 | (16) |
| `--tx-off` | `#aa9a84` | `#9d9995` | 鎖住分頁字（d2 已給值） | style.css:3364 | 3 | (17)a |
| `--tx-empty` | `#6a5a48` | `#9d9995` | 戰鬥 HUD 無直接使用；第 4 步列 30 小地圖牆改用它 | — | 3 | (17)a |
| `--plate-world` | `rgba(11, 8, 6, 0.8)` | `rgba(var(--panel-rgb), 0.92)` | 王血條底（d2 已給值）；canvas 讀 --d2-plate-world | style.css:3160；render.js:1650 | 3 | (16) |
| `--panel-edge` | `（:root 沒有）` | `#a8927f` | 新增；HUD 由 d2 給值；canvas 鑄鐵框（第 4 步列 90） | style.css:3186,3232,3258,3297,3299 | 3 | (16) |
| `--chg-e` | `（沒有）` | `#b6889a` | 新增；能量球耐力（第 4 步列 41） | — | 3 | (18) |
| `--chg-p` | `（沒有）` | `#70b2f2` | 新增；能量球暴擊（第 4 步列 20） | — | 3 | (18) |
| `--el-phys` | `#fff3e0` | **待定（M2-36：同 --tx-strong）** | 物理元素環、火花 | data.js:6984；ELC[el]：mech.js:240,316,803,827；render.js:368；skills.js:1677,1791 | — | (16)，見 P2 |

**戰鬥 HUD CSS（1280）用到、這次不改的 token**（值＝套值後的值，跟 M2-36 一致；#146 的 `--d2-*` 層在 style.css:348–378 定值、3109–3142 換進 `#bh, #pidle, #pnav, #dnav, .bh-aul, .bh-xp`）：`--act` #7c5729（1977,2424,3321）；`--act-edge` #a8927f（3321）；`--bad` #ff9bba（3240,3311）；`--block` #a9b8c3（3271）；`--block-dim` #40484e（3270）；`--block-hi` #eaf2f8（3273）；`--block-regen` #758088（3272）；`--border` #817b75（3151,3239,3247,3258,3263,3300,3319,3342）；`--border-mid` #817b75（3298）；`--btn2` #524c47（3315,3319,3342）；`--d2-black` #000（3250,3261,3263,3269,3277）；`--d2-scrim` rgb(0 0 0 / 0.62)（3180）；`--es` #dfbf91（3253）；`--es-hi` #fcefde（3254）；`--hp` #934341（3164,3248）；`--hp-hi` #af6c64（3178,3277）；`--mp` #3a5b98（3249）；`--mp-hi` #6b7dad（3278）；`--on-act` #fcf9f3（2424,3321）；`--panel` #25211e（3151,3294）；`--panel-inset` #1d1a17（1977,2424,3163,3165,3228,3232,3239,3247,3252,3277,3278,3283,3345）；`--panel-raised` #2c2825（3186,3279,3300）；`--prog-hi` #b6b0a8（3259）；`--prog-lo` #3c3935（3258,3264）；`--rar-chase` #0cf6ee（3327,3331）；`--rar-magic` #9da7ff（3331）；`--rar-normal` #f1ebdb（3331）；`--rar-rare` #fbe53a（3331）；`--rar-unique` #fa8915（3331）；`--sel-bg` #463a2d（1985,3320,3343）；`--sel-edge` #a8927f（1985,3343）；`--sel-tx` #fbf9f6（1985）；`--sheet-bg` rgba(31, 25, 21, 0.92)（1983）；`--tx` #e8e5e1（3158,3180,3186,3294,3324,3342）；`--tx-dim` #aeaba7（1983,3156,3228,3283,3301,3305,3345）；`--tx-strong` #fbf9f6（3152,3157,3161,3191,3234,3243,3250,3302,3303,3315,3319,3320,3326,3343）；`--vig` #b01a14（3172,3173,3174,3175）。canvas 直接讀 `--d2-*` 的：`--d2-black`／`--d2-hero-ring`／`--d2-tx-strong`（主角 ▼ 與腳圈 render.js:794,797,806）、`--d2-panel`／`--d2-border`（小地圖 1052,1054）、`--d2-rar-rare`／`--d2-tx-strong`／`--d2-plate-world`（菁英名牌、掉落牌 1625,1628,1650）。不改。

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
| 26 | `--tx-off-v1`＝`#c9a27a` | render.js:953 | 震地扇形（我方） | --border-hi | `#b0aaa4` | 4 | (7a) |
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
| 42 | `--bad-hi-rgb-v1`＝`255, 107, 61` | render.js:263 | 隕石落點填色（我方） | --el-fire-rgb | `238, 153, 120` | 4 | (7a) |
| 43 | `--bad-hi-rgb-v2`＝`255, 100, 60` | render.js:587 | 王腳下光圈 α0.6 | --enemy-tel-rgb α0.9＋4 px #000（3.2） | `255, 61, 127` | 4 | #159-6 |
| 44 | `--bad-rgb-v1`＝`229, 72, 77` | render.js:178,194,196,205,227,504,508；touch.js:54 | 一般預警：彈幕、衝鋒、揮 | 預警 --enemy-tel-rgb；觸控取消 PAL.badHi | `255, 61, 127／255, 155, 186` | 4 | (4) |
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
| 64 | `--cat-frac-rgb-v2`＝`255, 240, 210` | render.js:943 | 斬擊漸層中段（我方） | --glint-rgb | `255, 255, 255` | 4 | (7a) |
| 65 | `--cat-mem-v2`＝`#8fe0ff` | render.js:1029 | 完美閃避環 | --dodge-vignette-rgb | `120, 200, 235` | 4 | (7a) |
| 66 | `--cat-mem-rgb-v1`＝`143, 224, 255` | render.js:897 | 完美閃避後下一擊的刀光圈 | --dodge-vignette-rgb | `120, 200, 235` | 4 | (7a) |
| 67 | `--el-fire-v1`＝`#ff8a5b` | game.js:1555,1564,2173；render.js:961 | 自爆環、七情王環（敵）； | 環 → --enemy-tel；大爪痕 → --enemy-rim | `#ff3d7f／#fbbdbb` | 4 | (7a) |
| 68 | `--el-fire-rgb-v2`＝`255, 120, 50` | render.js:623 | 怪身上的點燃光 α0.3 | --el-fire-rgb | `238, 153, 120` | 4 | (7a) |
| 69 | `--el-cold-v3`＝`#6fd3ff` | mech.js:109 | 鹹水地面（我方，冰緩） | --el-cold | `#ade2f9` | 4 | (7a) |
| 71 | `--el-cold-rgb`＝`143, 214, 255` | render.js:376 | 我方冰投射物光暈 α0. | --el-cold-rgb 改值成官方伴生 | `173, 226, 249` | 4 | (7a) |
| 72 | `--el-cold-rgb-v3`＝`122, 208, 255` | render.js:212,396 | 怪物遠程預警虛線；怪物投 | --enemy-tel-rgb | `255, 61, 127` | 4 | (4) |
| 73 | `--el-cold-rgb-v4`＝`170, 210, 255` | render.js:241 | 雷暴（我方）刀光 | --el-cold → 用 --el-cold-rgb | `173, 226, 249` | 4 | (7a) |
| 74 | `--el-cold-rgb-v5`＝`200, 230, 255` | render.js:408 | 我方投射物拖尾 α0.2 | --glint-rgb | `255, 255, 255` | 4 | (7a) |
| 75 | `--el-light-v1`＝`#ffe08a` | mech.js:125 | 奉獻地面（友方回血） | --good | `#95e886` | 4 | (7a) |
| 76 | `--el-light-v2`＝`#ffe14d` | mech.js:145 | 感電地面 | --el-light | `#f3f9a4` | 4 | (7a) |
| 77 | `--el-chaos-v1`＝`#b28dff` | game.js:1551,1904,1911,1913,1945,1966 | 王／怪的環 ×6（gam | --enemy-tel | `#ff3d7f` | 4 | (7a) |
| 78 | `--el-chaos-rgb-v2`＝`195, 139, 255` | render.js:241 | 毒刃雨（我方）刀光 | --el-chaos → 補 --el-chaos-rgb | `233, 124, 207` | 4 | (7a) |
| 79 | `--dmg-hit-v1`＝`#b4b9c2` | render.js:1523 | 物理陷阱圓環 | --dmg-minor | `#aeaba7` | 4 | (7a) |
| 80 | `--dmg-hit-v2`＝`#e4e7ec` | render.js:1523 | 物理陷阱小點 | --dmg-hit | `#e8e5e1` | 4 | (7a) |
| 81 | `--dmg-crit-v1`＝`#ffc21a` | render.js:661 | 豪賭大獎數字 | --dmg-crit | `#f2cb9b` | 4 | (7a) |
| 82 | `--dmg-crit-v2`＝`#ffcf6b` | skills.js:1139,1961 | 嘲諷環（執政官、魔像，我 | --fx-own 9% | `#c6c6c6` | 4 | (7a) |
| 84 | `--dmg-hurt-rgb-v1`＝`255, 120, 110` | render.js:512 | teleCircle 外 | --enemy-tel-rgb α0.9 3 px＋5 px 不透明 #000 | `255, 61, 127` | 4 | (6) |
| 86 | `--dmg-gain-v2`＝`#b8f0c8` | render.js:665 | 迴避數字 | --dmg-gain | `#95e886` | 4 | (7a) |
| 89 | `--dmg-minor-v3`＝`#c9a3a3` | render.js:669 | 持續傷害數字 | --dmg-minor | `#aeaba7` | 4 | (7a) |
| 90 | `--dmg-minor-v4`＝`#a7acb6` | render.js:500 | canvas 鑄鐵框內線 | --panel-edge | `#a8927f` | 4 | (7a) |
| 91 | `--dmg-minor-v5`＝`#979ba5` | render.js:849 | 蓄力條：部分 | --tx-dim | `#aeaba7` | 4 | (7a) |
| 93 | `--dmg-minor-v7`＝`#aaaaaa` | game.js:2153 | 連鎖火花 | --tx-dim | `#aeaba7` | 4 | (7a) |
| 94 | `--dmg-minor-v8`＝`#9aa0a8` | mech.js:139 | 煙霧地面 | --tx-off | `#9d9995` | 4 | (7a) |
| 158 | `--fx-render-1-rgb`＝`70, 130, 255` | render.js:237 | 雷暴（我方）範圍填色 α | --el-cold-rgb | `173, 226, 249` | 4 | (7a) |
| 159 | `--fx-render-2-rgb`＝`150, 80, 220` | render.js:237 | 毒刃雨（我方）範圍填色  | --el-chaos-rgb | `233, 124, 207` | 4 | (7a) |
| 160 | `--fx-render-3`＝`#ffc4d6` | render.js:410 | 粉紅投射物核（s.pin | 刪除 s.pink 分支 | `—` | 4 | (7a) 死碼 |
| 161 | `--fx-game-1`＝`#7dff9a` | game.js:1848 | 十二生肖陣的安全格環 | --good | `#95e886` | 4 | (7a) |
| 162 | `--fx-mech-1`＝`#7a3fa0` | mech.js:136 | 腐化地面 | --el-chaos | `#e97ccf` | 4 | (7a) |
| 163 | `--fx-mech-2`＝`#5fae7a` | mech.js:168 | 凋零地面 | --el-chaos | `#e97ccf` | 4 | (7a) |
| 164 | `--fx-mech-3`＝`#ff5a8a` | mech.js:180 | 怒號地面（友方） | --good | `#95e886` | 4 | (7a) |
| 167 | `--fx-combat-1`＝`#8a6cff` | combat.js:634 | 收割爆炸環（我方） | --fx-own 9% | `#c6c6c6` | 4 | (7a) |

**第 4 步要補的 `-rgb` 伴生（決定 (7a)，值＝hex 換算）**：`--el-chaos-rgb: 233, 124, 207`（列 78、159）、`--tx-empty-rgb: 157, 153, 149`（列 30）、`--rar-magic-bg-rgb: 35, 35, 43`（列 52）、`--rar-rare-bg-rgb: 38, 36, 27`（列 55）。其餘 (7a) 伴生屬場景，不在本表。

### 3.2 #159 後續與 (1)–(6) 裡的戰鬥項（不在上表的改法）
| 項 | 使用處 | 現在 | 改成 | 步 | 決定 |
|---|---|---|---|---|---|
| teleCircle 填色＋外框 | render.js:503–515 | 填 `rgb.badV1` α0.08–0.38；外框 `rgb.dmgHurtV1` α0.7 2 px | 填 `--enemy-tel-rgb` α 不變（列 44）；外框先 5 px 不透明 `PAL.ringEdge`，再 3 px `--enemy-tel-rgb` α0.9（列 84） | 4 | #159-1、(6) |
| 小地圖一般怪點 | render.js:1095–1096 | `PAL.badV6` 2×2 | 先 4×4 不透明 `PAL.ringEdge`，再 2×2 `PAL.enemyTel`（列 40） | 4 | #159-2 |
| 小地圖菁英點 | render.js:1095–1096 | `PAL.enemyRim` 2×2 | 同上加 4×4 黑底，點用 `PAL.enemyRim` | 4 | #159-3 |
| 小地圖玩家點 | render.js:1098–1099 | `PAL.goodV2` 4×4 | 先 6×6 `PAL.ringEdge`，再 4×4 `PAL.good`（列 33） | 4 | #159-4 |
| 王腳下光圈／目前目標 | render.js:587、780 | 王 `rgb.badHiV2` α0.6；目標 `cssv('--bad-hi')` α0.6 | 王：4 px 不透明 #000＋2 px `--enemy-tel-rgb` α0.9（列 43）；非王目標：`PAL.enemyRim` α0.9＋黑邊；改走 PAL，不用 cssv | 4 | #159-6 |
| 王閃現線 α | render.js:168 | `globalAlpha = 0.3 + 0.6 * f` | `0.7 + 0.2 * f`；5 px 不透明 `PAL.ringEdge`（165–167）不變 | 4 | (5) |

## 4. 待定（不填新值）
| 列 | 舊 token＝舊值 | 使用處 | 用途 | → 新 | 新值 | 步 | 決定 |
|---|---|---|---|---|---|---|---|
| 85 | `--dmg-gain-v1`＝`#8fe0ff` | render.js:664 | 完美閃避數字 | --dodge-vignette-rgb | **待定** | — | (7a) |
| 87 | `--dmg-gain-v3`＝`#d6b8ff` | render.js:667 | 材料數字 | --rar-normal | **待定** | — | (7a) |
| 88 | `--dmg-minor-v2`＝`#cfd8e3` | render.js:657 | 格擋數字 | --block | **待定** | — | (7a) |
另：`--el-phys`（§2 末列）、render.js:653–656 元素傷害數字（P1）。

## 5. 範圍外（168 舊 token 中 77 列，不列入本表）
- 地圖外（戰場地面）：1 列（1）
- 戰場地面外框：1 列（4）
- 營地稻草人：2 列（5,92）
- 世界地圖死碼：4 列（27,83,165,166）
- 天賦面板：1 列（28）
- 輪盤籌碼：4 列（37,53,70,95）
- 營地火盆：1 列（49）
- 場景（biome）：62 列（96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157）
- 工具 mock：1 列（168）
- 另外不列：#159 後續的地圖台符文（營地）、`--asc`（天賦）、`#pnav .dot`（390）；5 個「同 X」中的 `--tx-title`／`--tx-scene`／`--mod-mm`／`--mod-co` 在戰鬥 HUD 1280 沒有使用處（不列）。

## 6. 待製作人（矛盾與超出範圍，集中一張，不自己定）
| # | 問題 | 選項 | 建議 |
|---|---|---|---|
| P1 | 元素傷害數字：render.js:653–656 用 `ELC.fire/cold/light/chaos`，但 M2-36 第 159 行與 battle-hud-4 §12 寫 hit、phys、fire、cold、light、chaos 都用 `--dmg-hit` | a 照 M2-36 改成 `PAL.dmgHit`（第 4 步）；b 保留元素色、改 M2-36 | a（v1.3.6 已定；元素靠圖示或文字分） |
| P2 | `--el-phys`＝`--tx-strong`（#fbf9f6）後，物理元素環（mech.js:316 在主角腳下 r30）跟主角腳圈 `--hero-ring` ΔE2000 只有 2.1 | a 照 M2-36；b 物理環改 `--fx-own` 9%；c 請 AD 另給值 | b（我方特效本來就該 ≤ #c6c6c6、9%） |
| P3 | 數字顏色三列跟 M2-36 不一致：列 85 完美閃避數字→`--dodge-vignette-rgb`、列 87 材料數字→`--rar-normal`、列 88 格擋數字→`--block`；M2-36 第 162–163 行寫 perfect、mat 用 `--dmg-gain`，block 用 `--dmg-minor` | a 照 M2-36；b 照舊裁定並改 M2-36 | a |
| P4 | (18) 已把 `--chg-e`／`--chg-p` 定為 #b6889a／#70b2f2，但 main 的 M2-36 第 150 行還是 #be88a4／#6fb0f0（(20) 文件 PR 沒帶這兩色） | a 第 3 步同時改 M2-36 這一行；b 另開文件 PR | a（套值驗收腳本才對得上） |
| P5 | #146 的 `--d2-*` 層：套值後跟 :root 重複；`--d2-scrim`（rgb(0 0 0 / 0.62)）、`--d2-black` 不是 M2-36 token，render.js 直接讀 `--d2-hero-ring` 等 | a 保留到 v1.3.6 驗收後另案收；b 第 3 步一起刪 | a（不在任何決定裡） |
| P6 | (5) 的倒數半徑 1.6r→1.0r、600 ms 屬戰鬥時間（render.js:164 已是 `1.6 − 0.6f`，問題在 wind） | a 照 mumi 22:29「戰鬥節奏移到預兆 PR」放預兆 PR；b 留在顏色 PR | a；本表只列 α |
| P7 | 寫法：派工寫 `rgb(var(--x-rgb)/α)`，但 `-rgb` 是逗號格式，這樣寫會壞；main 現行是 `rgba(var(--x-rgb), α)` | a 照 main；b 全改空白格式（palette.js 要改） | a（本表照 a） |
| P8 | 「每處使用處」：:root 值的改動，CSS 選擇器不改，只列行號；`ELC[el]` 是動態取色，只列呼叫行 | 接受／要求展開 | 接受 |

## 7. 要 AD 確認
1. §2 的 canvas 戰鬥指示套值後顏色：暴擊 #ffd166→#f2cb9b、受傷 #ff5a5a→#fbf9f6、gold／lv #ffd166→#95e886、描邊改不透明 #000。
2. P2 物理環、P3 三種數字顏色的建議。
3. 能量球 (18) 新值 #b6889a／#70b2f2 加 1 px #000；`--chg-p` 對 `--rar-magic` 綠色盲 1.8，靠位置分。
4. 我方特效列（7、12、13、24、33、35、62、82、167）都改 `--fx-own` 9%：亂鬥時敵方預警要比我方特效醒目。
5. 小地圖三種點全加黑底；列 60 屍體血漬（`--scene-X-dark-rgb`）算不算 AD 的地面範圍。

## 8. AD 簽名確認
| 角色 | 簽名 | 日期時間（UTC+8） | 意見 |
|---|---|---|---|
| Game Art Director |  |  |  |
| UIUX設計師 |  |  |  |
