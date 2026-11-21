# CSS 對齊色票：停在測試這一步（沒開 PR）

- 依據：`docs/production/specs/M2-36-palette-tokens.md`（main 812b428，#155）＋ `docs/production/evidence/css-palette/ruling/`（判定底版 982f07d8）。
- base：`812b428608aa955ea71df801443f3835a736ba7b`；分支 `fix/css-palette-1121`。
- 結果：**判定表已全部套用，但 check.js 有 6 項既有測試失敗**。這 6 項都把舊色值或舊行為寫死，跟判定表的目標衝突。交辦規定不能刪除或放寬既有測試，第 4 步也規定這時要停下，所以**沒開 PR、沒做截圖疊圖證據**。

## 測試數字（實際跑出來的）
| 項目 | main 812b428 | 本分支 |
| --- | --- | --- |
| `node tools/check.js`（main 自己的測試） | **885 passed／0 failed** | — |
| `node tools/check.js`（分支的測試＝既有 885＋新增 7） | 888 passed／5 failed（5 項都是新加的色票測試，main 本來就過不了） | **886 passed／6 failed** |
| `node tools/d1_saves.js --check` | 6/6 | 6/6 |
| touch_check 390×844 | 160 ✅／0 ❌ | 160 ✅／0 ❌ |
| touch_check 375×667 | 160／0 | 160／0 |
| touch_check 1280×720 | 16／0 | 16／0 |
| touch_check 1440×900 | 16／0 | 16／0 |
| `node tools/pro_check.js` | 35/0 | 35/0 |

另外 `M2-30 卡牆` 在分支上有一次失敗（`[true,true,true,true,false,true]`），重跑兩次都過，看起來是隨機性造成的偶發失敗，不是這次改動引起的。log 在 `logs/`。

## 6 項衝突（既有測試 ↔ 判定表）
| check.js 行 | 測試 | 判定表要求 | 為什麼過不了 |
| --- | --- | --- | --- |
| 11725 | M2-34 3a 修正 (4)：光柱 token「#ffcf5c／255, 209, 102」 | 簽核 §0、交辦：`--rar-rare #fbe53a`、`--rar-rare-rgb 251, 229, 58` | 測試寫死舊值，兩者不可能同時成立 |
| 11738 | B2-CAT：`--cat-corr`「還沒有元件用到」 | `--legacy-19` → `--cat-corr`（腐化詞字 `.fslot li.cw, .aff.cor`） | 照判定改了以後就有元件用到 |
| 11186 | M2-38 顏色：M2-38 段不准有 `rgb(` | `--scrim-v1` 在 `#hask` 的兩處改 `rgb(var(--scrim-rgb)/α)`（現寫 `rgba(var(--scrim-rgb), 0.6／0.5)`） | `--scrim-rgb` 是三元組，一定要包 `rgb()` |
| 11357 起 3 項 | M2-34 3a 繪製順序（白天、燭龍閉眼、蚩尤大霧）：用 `fillStyle === '#e5484d'` 認怪物生命條 | `--bad-v1`／`--rar-magic-v2`：render.js 怪物頭上血條改 `PAL.hp`（M2-33-3a） | 生命條的顏色變了，測試認不出來（`bar: [-1,-1]`） |

要怎麼處理請派工的人決定：例如授權把這 6 項的期望值改成新值（判斷規則不變，只換值），或是先不套對應的判定列。

## 已經改的（分支上）
- `:root`：簽核 §0 列的官方 token，加上 ruling.csv `target` 用到的官方 token，都寫成 M2-36 值；新增 `--hf`、`--portal`／`-rgb`、`--enemy-tel`／`-rgb`、`--enemy-rim`、`--fx-own`、`--vig`、`--es`、`--es-hi`、`--block`、`--block-regen`、`--sel-edge`、`--act-edge`、`--panel-grad-top`、`--hdr`。一併改的值：`--el-fire` 改成 `#ee9978`（跟 `--el-fire-rgb` 一致）、`--hurt-vignette-rgb` 改成 `176, 26, 20`。
- CSS：139 列照判定換成官方 token，漸層改平塗；地獄火快爆光暈改 `rgba(var(--hurt-vignette-rgb), ≤0.75)`，框用 `--border`（`.orb.mp.hot`、`.hb.mp.hot` 加 `0 0 0 1px var(--border)` 再加光暈）。
- 刪掉 130 個 0 引用的舊 token：判定表 128 個，加上 X3 的 `--rar-magic-rgb-v2`、`--dodge-vignette-rgb-v1`。對照表見 `token-map.csv`。
- JS（只動授權的檔）：render.js（X1 RCOL、X3 傳送門 `--portal-rgb`、X4 環外黑邊 `PAL.ringEdge`；alpha 跟環一樣，`--fx-own` 環 9%；喝藥環 `--fx-own` 9%；王閃現 `--enemy-tel-rgb`；小地圖王點／菁英點 `--enemy-tel`／`--enemy-rim`；菁英腳下圈 `--enemy-rim` 70%；印記菱形 `--tx-strong`；頭上血條 `--hp`；frameRect `--scene-void`；狀態圖示墊底、疊數字描邊）、game.js（拿掉 RINGFX，改成 `fx({k:'ring', sh})`；王現身、王暴怒 `--enemy-tel`；王死亡火花 `--fx-own`）、combat.js、skills.js、mech.js（`ELSH` 對照表＋燃燒地面 `--enemy-tel`）、touch.js（瞄準線 `--hl-rgb`）、maps.js（刪掉 `STARS.c`：已確認沒有任何地方讀它）。
- X4 黑邊用 `PAL.ringEdge`（`--ring-edge #000000`），不寫 `'#000'` 字面值。這樣既有測試「JS 不寫色碼」能過，黑邊也一樣是 #000。
- tools/check.js 只新增 7 項（沒有未定義的 var()、刪掉的 token 沒有殘留引用、PAL 解到 M2-36 值（含 5 個 hold 色）、JS 讀到的每個 PAL key 都有值、規則與 8 支 JS 沒寫死色碼、X1／X3、X2、X4），既有測試一行都沒改。

## 因為仍被引用而留下的舊 token
- `--sel-bd`：`tools/ui_mock.js:21`（tools 不在授權改的檔；遊戲 CSS 已全部改用 `--sel-edge`）。
- `--el-chaos-rgb`：`js/hideout.js:283`（範圍外，見下）。
- `--border-cap-v1`：`js/mech.js:119`（劍陣地面 `GROUND.blades.col`；不在判定表，RCOL 已改）。
- `work/risk_deleted_but_js.json` 列的 169 個只被 JS 讀的 token：這次刪了 2 個（X3 已遷完），其餘 **167 個這次先不刪**（判定表沒有它們的判定）。
- 不在本表、也不在 §0，值跟 M2-36 不一樣卻沒改的官方 token（例如 `--asc #ff9f43`、`--el-cold`、`--el-light`、`--el-chaos`、`--good`、`--warn`、`--act-hi`、`--btn2`、`--plate-world`、`--sheet-bg`、`--chase-bnr`、`--dodge-vignette-rgb`、`--dmg-*`、`--scene-<地形>-*`）：照交辦不整份重寫，留給之後處理。

## 範圍外殘留（待授權）
- `js/hideout.js:283` 營地地圖台符文 `PAL.rgb.elChaos` → `--portal-rgb`：**沒改**。
- 不在授權範圍的 JS 仍寫死色碼：`intro.js`、`sprites.js`、`data.js`、`biome.js`（main 本來就有）。

## 簽核清單逐項
- §0：官方 token 已就位（做到）；PR 沒開（未做）。
- §1：刪除前 grep 0 筆（做到，由新測試驗）；169 個 JS token 有交代（做到：2 個刪除，167 個先不刪）；開機掃 PAL（做到，靜態掃描）。
- §2：139 列＋X1–X4 已套用到程式（做到；`hideout.js` 那一處屬範圍外）；分用途 5 列已逐處對照判定改好（做到）；標 † 的覆寫宣告：已改成目標 token，`.tier.on` 的 background 和 `.eqs.r1` 的光暈已刪（做到）；X2 有沒有逐一實際觸發看序列圖（**未驗**，只做了程式碼核對）。
- §3 截圖疊圖、§4 對比量測：**未驗**（測試沒全過，照規定停下，沒拍）。
