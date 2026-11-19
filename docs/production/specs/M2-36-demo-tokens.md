# M2-36 demo 共用 token 對照（D2 紙紮灰燼定案，D1–D3 demo）

本檔給開發工程師把定案色票套進 D1 修正與 D2、D3。值只來自 Page [639b1311](https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/639b1311-bf38-4836-912f-e0e578aa0137)「dpoe 色票定案：D2 紙紮灰燼」／`specs/M2-36-palette-tokens.md`（介面數值以 `specs/palette-D2-final-ui.md` 為準；面板外觀與選中狀態以 `specs/palette-D2-panel-1plus.md` v1.0＝備案 1+ 為準，mumi 11/19 18:02 定全遊戲套用），不另造 hex。Demo 必須換上**整套** M2-36，禁止只換其中幾個 token：對比與 ΔE 是用整套一起算的，局部替換會把已算過的組合弄掉。現行 `demo/d1` 從 `css/style.css` 注入第一段 `:root`（`demo.js` L2570–2576），`demo.css` L337–348 又只覆寫 `--bad`／`--warn`／`--hp`／`--mp`／`--tx-strong`／`--hurt-vignette-rgb` 等數個——這正是禁止的局部換色；套完整套後刪掉這段覆寫。PR #78 的舊截圖不算數。

讀法：「demo 現值」是展示頁現在生效的值（注入的 `:root`，若 `demo.css` 有覆寫則寫有效值，並在括號註明注入值）。「無」＝現行選擇器沒用到，但注入的 `:root` 裡可能仍有舊值。「新增」＝色票新 token，`:root` 與 demo 都還沒有。`-rgb` 一律改成跟本體同一組數字（空格分隔，照色票）。字級、間距、字型 token 不在本檔。`--legacy-*` 刪掉（現行 demo 沒用）。`--fx-*` 保留原值，只能用在特效。`--scene-*-detail-*` 依色票用腳本從新的地面色換算，demo 沒用。

## 背景／場景

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --scene-void | `#16130f` | `#vp` 底；`.prog b`、`.boss .bt` 文字陰影 | `#0b0806`（style.css L8） |
| --scene-temple-ground／-mid／-light／-edge | `#46413c`／`#33302b`／`#615b56`／`#16130f` | 無（戰場目前用冰／墓室地板圖＋寫死遮罩） | `#1c181e`／`#6a241b`／`#a63c2b`／`#2a150e` |
| --scene-temple-dark-rgb／-glow-rgb | `10 7 4`／`244 240 236` | 無 | `7, 4, 3`／`255, 179, 90` |
| --scene-lava-ground／-mid／-light／-edge | `#46413c`／`#33302b`／`#615b56`／`#16130f` | 無 | `#1b1311`／`#2a1d18`／`#5c3a28`／`#0c0807` |
| --scene-lava-dark-rgb／-glow-rgb | `10 7 4`／`244 240 236` | 無 | `12, 4, 2`／`255, 138, 60` |
| --scene-tomb-ground／-mid／-light／-edge | `#46413c`／`#33302b`／`#615b56`／`#16130f` | 無（`P.save==='new'` 用墓室地板圖） | `#18201a`／`#28362b`／`#4c6250`／`#0b100c` |
| --scene-tomb-dark-rgb／-glow-rgb | `10 7 4`／`244 240 236` | 無 | `3, 9, 5`／`140, 240, 140` |
| --scene-ice-ground／-mid／-light／-edge | `#46413c`／`#33302b`／`#615b56`／`#16130f` | 無（預設戰場用冰地板圖） | `#1f3044`／`#35607e`／`#a8d8f0`／`#16263a` |
| --scene-ice-dark-rgb／-glow-rgb | `10 7 4`／`244 240 236` | 無 | `3, 7, 14`／`143, 214, 255` |

藏身處（HIDE_BIO）跟 temple 同一套值。現行 `:root` 的 `--scene-hide-dark-rgb`（`5, 3, 3`）／`--scene-hide-glow-rgb`（`255, 150, 70`）改成 temple 的 `-dark-rgb`／`-glow-rgb`，不另留角色。

## 面板

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --panel-inset | `#1d1a17` | `.btn.off`、`.bar`、`.lb` 底、`.st`、`.sk.off`、`.idle .gs`／`.ipb .pb`、`.goalb .gp`、`.cc .cp`／`.tag`、`.sys` 底、`.sk .lk` 所在空態 | `#1f1915` |
| --panel | `#25211e` | `.pnl`、`.tab`、`.idle`、`.idle .away`、`.sticky`、`.off`、`.sys section`、`.forge`；`demo.js` L996 | `#26201b` |
| --panel-edge（新增） | `#a8927f` | 面板最外圈 1 px：d1 `.pnl`、`.off`、`.forge`；d2 `.pnl`、`.tcard`。直立半版／全版畫上左右，桌機欄四邊；碰螢幕邊那邊不畫。內卡、格子、`.sticky` 上緣仍 `--border-mid` | 新增（現用 `--border-mid`） |
| --panel-hi（新增） | `rgb(255 226 180 / 0.12)` | 同上元件 `box-shadow: inset 0 1px 0 var(--panel-hi)` | 新增 |
| --panel-grad-top（新增） | `#2d251f` | 同上元件底：`linear-gradient(var(--panel-grad-top), var(--panel) 40%, var(--panel))`；`.sticky` 維持不透明 `--panel` | 新增 |
| --hdr（新增） | `#2d251f` | d1 `.pnl .hd`、`.card1 .hd`、`.forge > .hd`；d2 `.pnl .hd`、`.thd` | 新增 |
| --panel-raised | `#2c2825` | `#ctl` 控件、`.btn.sec`／`.danger`、`.card`、`.sk`、`.cc` | `#332a23` |
| --panel-raised-2 | `#322f2b` | `.flip .fb`；天賦樹線 `demo.js` L1431 寫死舊值 `#3a3027` | `#3a3027` |
| --plate-world | `rgb(37 33 30 / 0.92)` | `.plate`（含營地 `.res` 資源列）、`.boss`、`.ult`、`.dplate`、`.d3`、`.navtip`、`.goalb`、`.edge`、`.prog b` | `rgba(11, 8, 6, 0.8)` |
| --sheet-bg | `rgb(37 33 30 / 0.94)` | `.toast` | `rgba(31, 25, 21, 0.92)` |
| --panel-rgb | `37 33 30` | `.sticky::before`、`.sfade` 漸層 | `31, 25, 21` |
| --chase-bnr | `rgb(37 33 30 / 0.94)` | `.chban` | `#1c130d`（不透明） |
| --scrim-rgb | `10 7 4` | `.scrim`、`.lb span` 陰影、`.sk .cdv` | `0, 0, 0` |
| --hl-rgb | `225 220 215` | 無 | `214, 218, 226` |
| --glint／--glint-rgb | `#ffffff`／`255 255 255` | `.idle .gs i.flash`、`.goalb .gp i.flash` | `#ffffff`／`255, 255, 255`（值不變） |
| --warm-glint-rgb | `255 225 170` | 無 | `255, 225, 170`（值不變） |
| --hurt-vignette-rgb | `176 26 20` | 低血紅邊 `demo.js` L1532–1533（N2／N7） | `demo.css:root 190 30 25`（注入 `200, 20, 20`） |
| --dodge-vignette-rgb | `120 200 235` | 無 | `80, 180, 255` |

## 文字

介面字色只用這 5 個，加上壓在場景上的 `--tx-scene`（一定要有 `--plate-world`）。`--tx-title` 同 `--tx`（用字級和字重區分）；`--tx-lock`／`--tx-empty` 同 `--tx-off`（5 處全改）。

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --tx | `#e8e5e1` | `body`、`.pnl`、`.tab`、`.idle`、`.cc .cb`、`.off` | `#d9cdb4` |
| --tx-dim | `#aeaba7` | `#ctl .note`、`.why`、`.x44`、`.tab .kc`、`.idle .ex .er .x44`、`.res .more`、`.cc .cb small`、`.one .ms`、`.off .nx`、`.sys h5`、`.ph2 p`、`.flip .fb` | `#a6957e` |
| --tx-off | `#9d9995` | `.btn.off`、`.sk.off`／`.lk`、`.cc .stamp.off` | `#aa9a84` |
| --tx-strong | `#fbf9f6` | 控件字、`.card h3`、`.toast`、`.boss .bt`／`.bsh`、`.lb span`、`.sk` 字與冷卻、`.st.more`、`.idle .away`、`.plq .stp`、`.cc .tag`／`.stamp`、`.off h2`、`.one h4`；小地圖主角 `demo.js` L1414 寫死舊值 `#f1ebdc` | `demo.css:root #f7f0e5`（注入 `#f1ebdc`） |
| --sel-ink | `#231f1a` | 只配 `--paper`；選中類全部改 `--sel-tx`（見「選中狀態」節） | `#2a1a12`（值不變） |
| --tx-scene | `#fbf9f6` | `.plate`、`.prog b`、`.dplate`、`.d3 b`、`.cgain`、`.goalb`、`.plq`、`.edge` | `#d9cdb4` |
| --tx-title | 同 --tx `#e8e5e1` | `.pnl .hd` | `#d9cdb4` |
| --tx-lock／--tx-empty | 同 --tx-off `#9d9995` | 無 | `#8a7a62`／`#6a5a48` |

## 框

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --border | `#817b75` | `.pnl .hd`、`.lst li` 分隔 | `#4a3e2c` |
| --border-mid | `#817b75`（同 --border） | 面板與畫面框、`.btn.off`、`.toast`、`.lb` 1px 框、`.sk.off`、`.tab` 桌機、`.idle`、`.cc`、`.dplate`、`.mini`、`.navtip`、`.plq`、`.sticky`、`.off`、`.sys section`、`.strip`、`.feed .fr.sum` 左邊；小地圖／天賦節點 `demo.js` L1411、L1432 寫死舊值 `#5e4e3a` | `#5e4e3a` |
| --border-ctl | `#817b75`（同 --border） | `#ctl` 控件、`.btn.sec`、`.sk` | `#907956` |
| --border-hi／-rgb | `#b0aaa4`／`176 170 164` | 焦點框 `.kf`、`.card`、`.bar` 外沿、`.boss`、`.st.more`、`.plq .stp`、`.cc .stamp`／`.cp i`、`.flip .fb`、`.idle .ipb .pb i` | `#a08f78`／`160, 143, 120` |
| --border-cap | `#d9d3cd` | `.feed .fr.pick`、`.plq:hover`、`.cc.sug`／`.pick`、`.cc .tag`、`.sys section.cur`；`demo.js` L948 | `#f1ebdc` |

## 按鈕（--act）

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --act／--act-hi | `#7c5729`／`#876032`（另有 --act-edge `#a8927f`、--act-press `#704e23`） | `.btn.pri`（只有這裡；一個畫面最多 1 顆）。`--act-hi` 無 | `#8f3a2b`／`#a5452f`（舊紅按鈕） |
| --btn2（新增） | `#524c47`＋1px `--border` 框，字 `--tx-strong` | 其他所有按鈕；`.tab .bdg`、`.plq .stp.can`、`.cc .stamp.can` 從 `--act` 改到這裡，可升級者另加 `--ready` 左標 3px | 新增 |
| --act-edge／--act-press（新增） | `#a8927f`／`#704e23` | `.btn.pri` 2px 框（每個狀態都有）／`:active` | 新增 |
| --on-act／-rgb | `#fcf9f3`／`252 249 243` | 主按鈕字；`.btn.hold.pri .fill` | `#f3e4d2`／`243, 228, 210` |
| --sel-bg（取代 --sel） | `#463a2d` | 選中底，見「選中狀態」節 | `--sel` `#e6d9bd` |
| --sel-edge（新增） | `#a8927f` | 選中 2 px 框，往內畫（`box-shadow: inset 0 0 0 2px`），不改尺寸 | 新增 |
| --sel-tx（新增） | 同 --tx-strong `#fbf9f6` | 選中字 700；未選字 `--tx` 400 | 新增 |
| --sel-press（新增） | `#3d332a` | 選中類按下，內容下移 1 px | 新增 |
| --paper | `#e3dcd3` | 小紙卡點綴（單塊 ≤ 2% 畫面）；d2 `.mini .me` | `#e6d9bd` |

## 選中狀態（備案 1+；`--sel` 刪除）

選中＝底 `--sel-bg`＋2 px `--sel-edge` 內框＋字 `--sel-tx` 700。未選＝原底＋1 px `--border-ctl`（分段／階是整條外框＋分隔線）＋字 `--tx` 400。現行所有用到 `--sel` 的選擇器（`demo/d1`、`demo/d2` 的 `demo.css`／`demo.js`；`grep -n -- '--sel'`，repo 51162c9a）：

| 檔案 行 | 選擇器 | 現在 | 改成 |
| --- | --- | --- | --- |
| d1 css L43 | `.btn.sel` | `--sel` 底＋`--sel-ink` 字＋1px `--sel` 框 | `--sel-bg` 底、`--sel-tx` 字 700、`border: 2px solid var(--sel-edge)`（padding 減 1 px 保持尺寸）；勾號 `currentColor` 不動 |
| d1 css L45 | `.btn.down`、`.btn:active:not(.off)` | `--sel` 底＋`--sel-ink` | 改成 `.btn:not(.pri)`：`--sel-press` 底、`--sel-tx`、內容 `translateY(1px)`；`.btn.pri.down`／`.btn.pri:active` 改 `--act-press`（縮 0.96） |
| d1 css L158 | `.tab[aria-selected='true']` | `--sel` 底＋`--sel-ink` | `--sel-bg`、`--sel-tx` 700、`box-shadow: inset 0 0 0 2px var(--sel-edge)`；未選 `.tab` 字重改 400 |
| d1 css L160 | `.tab[aria-selected='true'] .kc` | `--sel-ink` | `--tx` |
| d1 js L1494 | S02 標註「按下（0 ms 換 --sel、80 ms 回彈）」 | 文字 | 改「換 --act-press」（S02 示範的是 `.btn.pri`） |
| d2 css L67 | `.seg.on` | `--sel` 底／框＋`--sel-ink` | `--sel-bg`、`--sel-tx` 700、`border-color: var(--sel-edge)`＋`box-shadow: inset 0 0 0 1px var(--sel-edge)`（合 2 px）；未選 `.seg` 字 `--tx` 400 |
| d2 css L119 | `.tab.on` | 同上 | 同 d1 L158；未選 `.tab` 字重 700→400 |
| d2 css L123 | `.tab.on .kc` | `--sel-ink` 字與框 | 字 `--tx`、框 `--sel-edge` |
| d2 css L155 | `.eq.sel`、`.st.sel` | `outline: 3px solid var(--sel)` | 裝備格不套新樣式：`outline: 2px solid var(--border-cap)`、offset 1px（稀有度框不動） |
| d2 css L182 | `.st.chk .cb` | `--bad` 底＋`--sel-ink` 字 | 字改 `--panel-inset`（8.78）；`--sel-ink` 只配 `--paper` |
| d2 css L241 | `.part.on` | `--sel` 底＋`--sel-ink` | 同 `.seg.on`（部位卡）；未選 `.part` 字重 400 |
| d2 css L352 | `.nd.on i` | `--sel` 底與框 | `--sel-bg` 底、`--sel-edge` 框（2 px 已有） |
| d2 css L360 | `.mini .me` | `--sel` | `--paper`（6×6 小點綴） |

`demo/d2/tokens.css` 仍是舊值（`--sel`／`--paper` `#e3d6bb`、`--panel` `#35312c` 等），要整份換成 M2-36，不能只改這三個。遊戲本體 `css/style.css` 另有約 45 處 `--sel`／`--paper`（不在 demo 範圍），照同一規則另開工項。

## 語意狀態

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --good／-rgb | `#95e886`／`149 232 134` | 狀態圖示增益、掛機目標細條、`.tab .dot`、`.idle .away` 左邊、`.cgain` 左邊、`.goalb .gp i`、`.cc .cp i.full`、`.one li .ok`／`.ms .bar i`、`.off .nx .gp i`、`.sk .chg`／`.act`／`.fla`（藥劑生效中）、`.gzone`、`.grid8` | `#7fc95a`／`123, 211, 107` |
| --bad／--bad-hi | `#ff9bba`／`#ff9bba` | `.btn.danger`、`.st.de`、`.ult`；小地圖怪點 `demo.js` L1416 寫死舊值 `#e0553f` | `demo.css:root 皆 #fe7883`（注入 `#e0553f`／`#f06a50`） |
| --bad-rgb | `255 155 186` | `.btn .fill` | `demo.css:root 254 120 131`（注入 `224, 96, 96`） |
| --warn | `#a9ae68` | `#ctl .note b`、`.toast.warn`、`.lb.mp.hot` 1px 外框、`.idle .ib b.warn`、`.cc .cb small.lack`、`.one li .lack`、`.holdtip`；過熱呼吸 `demo.js` L1630 | `demo.css:root #b7ad66`（注入 `#e0614a`） |
| --ready | `#e8e5e1`（同 --tx） | `.sk .pips i`／`.on`（技能段；藥劑次數格已取消，mumi 11/19 14:04）；`demo.js` L565 | `#e6c36a` |
| --asc／-hi／-bg／-on | `#0fb89f`／`#8ce1cf`／`#1a2623`／`#1c4941` | 無（D2 昇華石碑） | `#ff9f43`／`#ffb38a`／`#241510`／`#5a2a12` |
| --awk／-bg | `#caaef4`／`#26222a` | 無 | `#b592ff`／`#1b1526` |
| --cat-frac／--cat-mem | `#fbf9f6`／`#ade2f9` | 無 | `#fff7d6`／`#6fe3ff` |
| --mod-mm／--mod-co | `#e97ccf`／`#ff9bba` | 無 | `#c79bff`／`#e0614a` |
| --affix | `#9da7ff` | 無 | `#9aa6ff` |

## 生命魔力條

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --hp | `#934341` | `.lb.hp i`、`.boss .bf` | `demo.css:root #823630`（注入 `#8a2a2a`） |
| --mp | `#3a5b98` | `.lb.mp i` | `demo.css:root #304e8b`（注入 `#2b4a8a`） |
| --hp-hi | `#af6c64` | 藥劑鈕冷卻環（3 秒冷卻，不限次數）、低血時藥劑鈕外框（非文字圖形） | 新增 |
| --mp-hi | `#6b7dad` | 藥劑鈕冷卻環（3 秒冷卻，不限次數）（魔力） | 新增 |
| --prog-lo／--prog-hi | `#3c3935`／`#b6b0a8` | `--prog-hi`：`.bar i`（離王進度等，不是生命／魔力條）。`--prog-lo` 無 | `#7a4a14`／`#e1a54c` |

現行 demo 的生命／魔力藥劑掛在技能列 `.sk`（H19；圖示隨技能格，不是 24px 的 2×）：生效中 2px `--good` 框＋上緣 `--good` 細條，空／停用走 `.sk.off`（`--panel-inset`＋`--tx-off`＋虛線 `--border-mid`）。沒有 `--hp-hi`／`--mp-hi`。掛機主畫面頂部通貨列、以及生命／魔力藥劑鈕（24px 圖示顯示 2×、冷卻態）尚未出現在 `demo/d1`（mumi 11/19 14:04：藥劑不限次數、冷卻 3 秒，鈕上只畫冷卻環，不再有次數格與空瓶圖示），本檔不預先指定那些元件的底、字、空態用色。

營地資源列 `.res`（C11，掛在 `.plate`）名稱用 `--tx-scene-dim`（見下節，改 `--tx-scene`），數字繼承 `.plate` 的 `--tx-scene`；這不是掛機主畫面頂部通貨列。

## 稀有度

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --rar-normal | `#f1ebdb` | `.r-normal`；地上普通掉落 `demo.js` L1310 寫死 `#d9cdb4` | `#d9cdb4` |
| --rar-magic／-bg | `#9da7ff`／`#23232b` | 無（掉落分級沒有魔法）；菁英框 `demo.js` L1326 寫死舊值 `#7ea7ff` | `#7ea7ff`／`#121833` |
| --rar-rare／-bg | `#fbe53a`／`#26241b` | `.r-rare`、`.flip .ff`；稀有掉落 `demo.js` L1310 寫死 `#ffcf5c` | `#ffcf5c`／`#2a210d` |
| --rar-unique／-bg | `#fa8915`／`#2a221c` | `.r-leg` | `#52d6c3`／`#0e2826` |
| --rar-chase／-hi／-bg | `#0cf6ee`／`#8ffbf6`／`#192625` | `.r-chase`、`.idle .ipb.full`、`.cgain .ch`、`.pity`、`.chban`、`.wy` 1px 框；`--rar-chase-rgb` 在 `demo.js` L1763 光暈。`--rar-chase-bg` 無 | `#ff9a4a`／`#ffc08a`／`#3a2214`（rgb 注入 `255, 154, 74`） |

## 元素

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --el-phys | `#fbf9f6` | 無 | `#fff3e0` |
| --el-fire | `#ee9978` | 無 | `#ff8a4c` |
| --el-cold | `#ade2f9` | 無 | `#8fd6ff` |
| --el-light | `#f3f9a4` | `.d3` 左邊與 `.em`；投射物 `demo.js` L1347 寫死舊值 `#ffe066` | `#ffe066` |
| --el-chaos | `#e97ccf` | 無 | `#c38bff` |

## 傷害數字

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --dmg-hit | `#e8e5e1` | 一般傷害；`demo.js` L1378 寫死 `#fff3e0` | `#fff3e0` |
| --dmg-crit | `#f2cb9b` | 暴擊；`demo.js` L1378 寫死 `#ffd166` | `#ffd166` |
| --dmg-hurt | `#fbf9f6` | 受傷；`demo.js` L1378 寫死 `#ff5a5a`（修正 2 未套） | `#ff5a5a` |
| --dmg-gain | `#95e886` | 無（gold／lv／perfect／mat） | `#ffd166`（舊值跟暴擊同色） |
| --dmg-minor | `#aeaba7` | 無（miss／block／ev／dot） | `#9aa3ad` |
| --dmg-outline | `#000000` | 描邊；`demo.js` L1375 寫死 `rgba(0,0,0,0.8)` | `rgba(0, 0, 0, 0.8)` |

## D2 定案新增（`:root` 與 demo 都還沒有）

| token | 值 | 用途 |
| --- | --- | --- |
| --accent | `#f4f0ec` | 介面小點綴；**場景不用**（戰場、營地都不用；`--scene-*-glow-rgb` 同值也不用在場景） |
| --scene-lamp-body／--scene-lamp-glow | `#b98a5e`／`#d9a774`（16%） | 戰場燈籠本體／光暈（demo 目前沒畫燈籠） |
| 營地場景色 `--scene-fire-*`、`--scene-window` 等 | 見 `M2-36-palette-tokens.md`「場景光與營地材質」 | demo 營地用點陣圖，這組只給出圖與程式畫的火光；demo 暫不需要 |
| --enemy-tel | `#ff3d7f` | 預警線 3px＋外 1px `#000`；填色 55% |
| --fx-own | `#c6c6c6` | 我方特效：灰階上限 `#c6c6c6` × 不透明度 9%（所有尺寸，一起套），重疊取最大值；實際淺磚上峰值 ≤ 同磚預警填色（390／1280／960：1.189／1.208／1.199 vs 1.421／1.473／1.367） |
| --enemy-rim | `#fbbdbb` | 敵人 1px 外框 |
| --vig | `#b01a14` | 低血紅邊 24px；<35% 時 60%、<20% 時 70% |
| --hero-ring | `#fbf6ef` | 主角腳圈 4px＋外 2px `#000`；頭上 10×8 ▼ 用 `--focus` |
| --focus | `#fbf9f6` | 焦點框 2px、外推 2px |
| --beam-edge | `rgb(0 0 0 / 0.8)` | 光柱兩側各 2px |
| --theme-styx-ground／-mid／-light／-panel／-raised／-border／-accent | `#041e27`／`#152f38`／`#2a4148`／`#2a3d45`／`#2c3f47`／`#b09162`／`#faaa5e` | 主題組，只存不用；預設 `:root` 不引用 |

## demo 有、M2-36 無

變體一律併回角色本身（色票「變體與暫存 token」第 1 點），不要再留 `-vN`。

| demo token | 用在哪 | 改對到 |
| --- | --- | --- |
| --tx-scene-dim | `.feed .fr.sum`、`.sk .nm`、`.d3 span`、`.res span b`（注入 `#a6957e`） | `--tx-scene`（此 token 已刪） |
| --scene-void-rgb-v1 | `.feed .fr` 底 0.92、`.feed .fr.sum` 實底、`.feed.thin .fr` 0.6、`.plq` 底 0.92（注入 `21, 17, 13`） | `--scene-void`（`#16130f`＝`22 19 15`）。半透明用同一色的 rgb，不另開變體 |
| --scene-void-rgb-v2 | `.mini` 底 0.8（注入 `8, 6, 5`）；地板遮罩 `demo.js` L1299 寫死 `rgba(8,6,5,0.35)` | 同上，改 `--scene-void` |
| --scene-void-v8 | `.tree`、`#d-treecv`；天賦樹底 `demo.js` L1429 寫死 `#10131b` | `--scene-void` |
| --plate-world-1 | `.cgain` 不透明底（`demo.css:root` 自造 `rgb(11, 8, 6)`，色票沒有此名） | `--panel-inset`（`#1d1a17`） |
| --tx-title | `.pnl .hd` | 可留名，值必須同 `--tx` |

## 寫死的色碼（應改成 token）

下列是 `var(--…)` 以外、寫在展示頁檔案裡的色碼（`demo.css` L337–348 的 `:root` 賦值不算，那是局部覆寫，套完整套後刪掉）。Canvas 請改讀計算後的 token 值，不要抄 hex。

**`demo/d1/demo.css`**

| 位置 | 現值 | 改對到 | 說明 |
| --- | --- | --- | --- |
| L4 `body` | `#000` | --scene-void | 頁底（控制列後面） |
| L8 `#ctl` | `#15110f` | --scene-void | 控制列，不屬於展示畫面（舊 `--scene-void-v1`） |
| L26 `.safe` | `#000` | --scene-void | 安全區遮色，不屬於展示畫面 |
| L27 `.safe::after` | `#555` | （非展示標籤） | 安全區說明字；不是角色 token，不強制 |
| L131 `.sk .kc`、L132 `.sk .cnt`、L134 `.sk .cdt` | `#000` 文字陰影 | --scrim-rgb | 條上字已用 `rgb(var(--scrim-rgb))`，這三處應一致 |
| L300 `.strip` | `#000` | --scene-void | 桌機即時戰場條 |

**`demo/d1/demo.js`**

| 位置 | 現值 | 改對到 | 說明 |
| --- | --- | --- | --- |
| L528 `#d-fade` | `#000` | --scene-void | 轉場淡入 |
| L1263 `drawField` 清底 | `#000` | --scene-void | 畫布清屏 |
| L1299 地板遮罩 | `rgba(8,6,5,0.35)` | --scene-void（α 0.35） | 舊 `--scene-void-rgb-v2` |
| L1310 掉落 | `#ffcf5c`／`#d9cdb4` | --rar-rare／--rar-normal |  |
| L1326 菁英框 | `#7ea7ff` | --rar-magic |  |
| L1347 投射物 | `#ffe066` | --el-light |  |
| L1375 跳數字描邊 | `rgba(0,0,0,0.8)` | --dmg-outline | 修正 2 |
| L1378 跳數字 | `#ff5a5a`／`#ffd166`／`#fff3e0` | --dmg-hurt／--dmg-crit／--dmg-hit | 修正 2；hurt 算法見下 |
| L1409 小地圖底 | `#0b0806` | --scene-void | 舊 void |
| L1411 小地圖路徑 | `#5e4e3a` | --border-mid | 舊 mid |
| L1414 小地圖主角 | `#f1ebdc` | --tx-strong | 舊 strong（現與舊 `--border-cap` 同值，勿誤對到新 cap） |
| L1416 小地圖怪 | `#e0553f` | --bad | 舊 bad |
| L1429 天賦樹底 | `#10131b` | --scene-void | 舊 `--scene-void-v8` |
| L1431 天賦樹線 | `#3a3027` | --panel-raised-2 | 舊 raised-2 |
| L1432 天賦樹節點 | `#5e4e3a` | --border-mid | 舊 mid |

共 26 處（css 8、js 18 個色碼；L1310、L1378 一列多色）。`index.html` 沒有寫死色碼。

## 修正 1：桌機生命／魔力條的數字壓在場景上

原因：舊 `.hb` 底是半透明黑，條沒滿時場景會透出來，數字對比不夠。

1. 條底改成不透明 `var(--panel-inset)`，再加 1px `var(--border-mid)` 框（直立、桌機都改）。
2. 桌機條高：生命 16px、魔力 14px。數字 11px／700，字色 `var(--tx-strong)`，陰影 `0 1px 0 rgb(var(--scrim-rgb))`，整個數字都在條裡面。
3. 填色平塗 `var(--hp)`／`var(--mp)`，拿掉漸層。
4. `.ward` 改成條底的 3px 細條，用 `rgb(var(--glint-rgb) / 0.6)`；不要再整條蓋 0.35 的白。

結果：數字背後只會是 `--hp`（6.41）、`--mp`（6.38）或 `--panel-inset`（16.48）；最不利 6.38:1。

現行 demo 的 `.lb`（`demo.css` L112–120）已照 1–3 做（魔力列高寫 13px，桌機規格是 14px）。`.ward` 不在 demo。

## 修正 2：跳數字

1. hurt 字色改成 `--dmg-hurt`（＝`--tx-strong` `#fbf9f6`），字級 0.8 倍；`--bad` 不用在戰場數字。
2. 全部跳數字描邊 2px `#000`（`lineWidth` 4）＝`--dmg-outline`。
3. 一般擊中 `--dmg-hit` `#e8e5e1` 15px，出現時不彈；暴擊 `--dmg-crit` `#f2cb9b` 24px，彈出 1.0→1.35（0–40 ms）→1.0（40–160 ms，ease-out），取代現在共用的 `1+(0.08−t)×8`；jackpot 同色 30px＋「大獎」字頭，1.0→1.5→1.0、200 ms。
4. 減少動態：不彈、不飄，原地淡出 0.6 秒。

現行 `demo.js` L1375–1378 仍是舊色、`lineWidth` 3，尚未套用。

## 驗收（拍攝前）

照 `specs/M2-36-review-checklist.md`「建置前提（先驗再拍）」：要拍的建置須已有 PR #68 的角色名收斂，再在上面套本色票的**全部** token 值與修正 1、2。開拍前腳本讀 `getComputedStyle(document.documentElement)`，把 `M2-36-palette-tokens.md` 表上每一個 token 跟規格值逐一比對（半透明比 rgba），寫進 `prefilter.csv`。只要有一個沒定義或值不同，或後面還有舊的 `:root` 把新值蓋掉（包括 demo 自己的局部覆寫），就中止、不截圖。390×844 與 1280×720 同等檢查，兩種尺寸都要過。
