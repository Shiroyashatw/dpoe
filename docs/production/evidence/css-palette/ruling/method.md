# 方法與資料來源

## 資料來源
- 程式：`git -C /workspace/dpoe worktree add --detach /tmp/pal origin/main`，初版 origin/main = `8bae3f69`（#150）；13:32 更新時重抓為 `982f07d857a88f7e3a0b99c76118679cebe0bd29`，`git diff --stat 8bae3f69 982f07d8 -- css js index.html` 為空，跟工程盤點底版 c57ff912 同一份程式。用完已移除 worktree，沒碰 `/workspace/dpoe` 的工作區。
- 139 個 token 的名單：`/workspace/landscape-audit-1225/palette-css-vs-M2-36.md` §(d1)。
- 官方值：`docs/production/specs/M2-36-palette-tokens.md`（main），加上 `--es`／`--es-hi`（#152 已併），以及 AD 定稿包 `/workspace/stash-palette-css-1321/`（mumi 13:31 核准）：`--hf #b65517`、`--portal #ccbcfe`／`204 188 254`、`--rar-rare-rgb`、`--rar-chase-rgb`、`--el-fire-rgb`、`--enemy-tel-rgb`。`--hp #934341` 照 M2-36。
- 語意依據：M2-33-1 §王血條（`--panel-inset` 空段、1 px `--border-mid`、外 3 px scrim、平塗 `--hp`）、M2-33-2a §1–2（格底平塗稀有度 -bg、1 px 稀有度框、詞綴 14 `--tx`、技能關鍵字 `--affix`、T 標記 `--tx-dim`、追逐框 `rgb(var(--rar-chase-rgb)/0.45)`）、M2-33-3a §1.2（怪物頭上血條填 `PAL.hp`；自己的地面用 `PAL.el*`）、battle-hud-5 P66（經驗條空 `--prog-lo`、填 `--prog-hi`）、M2-36 規則（`--bad` 只在面板；主鈕唯一；選中＝`--sel-bg`／`--sel-edge`；停用＝`--panel-raised`＋虛線 `--border`＋`--tx-dim`；`--enemy-tel` 線＋外 1 px `#000`；我方特效 `--fx-own` 9%；菁英不用稀有度色）。
- 文件衝突時以 M2-36 為準（mumi 裁定）：例如 M2-33-3a 寫「敵人腳下圈 PAL.bad」，但 M2-36 規定 `--bad` 只在面板，所以列為待確認。

## 引用怎麼找（`work/extract.py`、`casc.py`）
1. CSS：`css/style.css` 全文找 `var(--token`（後面不接 `[\w-]`），往回找所在規則的選擇器與屬性。
2. JS：`js/palette.js` 把 `:root` 每個 token 讀進 `PAL`（`--a-b-v1` → `PAL.aBV1`；`--a-rgb-v1` → `PAL.rgb.aV1`），所以另外找 `PAL.<key>`、`cssv('--token')`。工程盤點只算 CSS，沒算 JS。
3. 覆寫（†）：同一個選擇器（逗號拆開後任一段相同）在後面的規則又設同一類屬性（background／border／box-shadow／color／fill／stroke／outline／filter），且沒有再用同一個 token，就標「已被 Lnnn 覆寫」。`@media` 裡的覆寫只在該條件成立時生效；特異度不同的覆寫沒算（偏保守：只會漏標，不會多標）。
4. 疑似死碼：選擇器裡的 class／id 在 `js/*.js`、`index.html` 找不到字串。動態拼的 class（如 `r${it.r}`）會誤判，所以只寫「疑似、未驗」。

## 色差
- ΔE = CIEDE2000（colour-science 0.4.7）：sRGB → XYZ（D65）→ CIE Lab，`colour.delta_E(method='CIE 2000')`。
- 比的是「token 現值」對「目標 token 的 M2-36 值」。`-rgb` 三元組照三元組比；別名（`--pt-*`）先解到它指的 token。

## 對比
- WCAG 2.x 相對亮度：通道 c ≤ 0.04045 → c/12.92，否則 ((c+0.055)/1.055)^2.4；Y = 0.2126R + 0.7152G + 0.0722B；對比 = (Y亮+0.05)/(Y暗+0.05)。
- 門檻：字 ≥ 4.5；大字、圖示、功能邊界（框、條、選中框）≥ 3；底色、陰影、光暈、α ≤ 0.3 的裝飾框標「裝飾，不設門檻」。
- 半透明：照 M2-36，以 sRGB alpha 疊出實際色再量（`over(fg, α, bg)`）。
- 背景用實際所在的位置：面板 `--panel #25211e`、凹槽 `--panel-inset #1d1a17`、凸起 `--panel-raised #2c2825`、戰場地面 `#46413c`、淺磚 `#615b56`、天賦樹底（舊 `#090b13`→新 `--scene-void`）等。「舊→新」的背景也是規格值（背景 token 也會在同一個對齊 PR 改值），所以只反映這個 token 本身的變化。
- 全部是算的，**沒開遊戲、沒截圖疊圖（未驗）**。

## 判定規則
- (a)：有同語意的官方 token 就用，ΔE 大也照語意（例如昇華舊橘 → 官方青）；但會讓敵方危險變弱、或讓非稀有度元素用到稀有度色時，改用別的官方 token（例如 `--rar-chase-bg-v2` 不用 `--rar-chase-bg` 而用 `--asc-bg`；`--rar-rare-bg-v1` 用 `--sel-bg`）。
- 同一個 token 用在不同語意時寫「分用途」，逐處給目標（`--bad-hi-v2`、`--dmg-hurt-v1`、`--rar-magic-v2`、`--scrim-v1`、`--el-chaos-rgb`）。
- (b)：沒有同語意官方色，或官方色會讓字對比不過。能合併的合併（`--hf`）。
- (b伴生)：值等於官方色，但 JS 或規格要拼 `rgba(var(--x-rgb), α)` 的三元組；照 M2-36「--good／-rgb」寫法補進色票，不是新色。純 CSS 的半透明能改成平塗官方 token 的，就不補（例如稀有度格框照 M2-33-2a 改 1 px 平塗）。
- 引用全被覆寫的，判定照語意給，同時註明宣告可直接刪。
- 待確認：規格沒定、或兩份規格衝突的子項，不猜。

## 檔案
- `RULING.md`、`RULING-2.md`：判定表（每檔 ≤ 25,600 B）。
- `ruling.csv`：同內容；`target_value` 是算 ΔE 用的值，`live_use_count` = 沒被覆寫的 CSS 引用數＋JS 引用數。
- `work/`：腳本與中間檔（`usage.json` 每處引用的選擇器、屬性、覆寫；`risk_deleted_but_js.json` 是「沒被 CSS 引用但被 JS 讀」的 169 個 token）。

## 13:32 更新補充
- 色盲 ΔE：Machado 2009 嚴重度 1.0（colour-science `matrix_cvd_Machado2009`，作用在線性 sRGB），再算 CIEDE2000。用於 --hf 對 --vig 的可分性檢查。
- `files` 欄：該列要改的檔，`css` 加上 JS 引用所在檔（不含 palette.js；palette.js 會自動讀 `:root`，不必改）。
- 附加列 X1–X4 不是 d1 token，是同一個 PR 要一起改的 JS（UIUX 13:32 裁定）。
- 前一版在 `-pre1332/`。
