# M2-36 demo 共用 token 對照（D1–D3）

本檔給開發工程師把定案色票套進 D1 修正與 D2、D3。值只來自 Page [4ac24fae](https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/4ac24fae-bc0a-4d94-a78d-b09213a2791c)／`specs/M2-36-palette-tokens.md`，不另造 hex。Demo 必須換上**整套** M2-36，禁止只換其中幾個 token：對比與 ΔE 是用整套一起算的，局部替換會把已算過的組合弄掉。現行 `demo/d1` 從 `css/style.css` 注入第一段 `:root`（`demo.js` L2570–2576），`demo.css` L337–348 又只覆寫 `--bad`／`--warn`／`--hp`／`--mp`／`--tx-strong`／`--hurt-vignette-rgb` 等數個——這正是禁止的局部換色；套完整套後刪掉這段覆寫。PR #78 的舊截圖不算數。

讀法：「demo 現值」是展示頁現在生效的值（注入的 `:root`，若 `demo.css` 有覆寫則寫有效值，並在括號註明注入值）。「無」＝現行選擇器沒用到，但注入的 `:root` 裡可能仍有舊值。「新增」＝色票新 token，`:root` 與 demo 都還沒有。`-rgb` 一律改成跟本體同一組數字（空格分隔，照色票）。字級、間距、字型 token 不在本檔。`--legacy-*` 刪掉（現行 demo 沒用）。`--fx-*` 保留原值，只能用在特效。`--scene-*-detail-*` 依色票用腳本從新的地面色換算，demo 沒用。

## 背景／場景

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --scene-void | `#0d0a07` | `#vp` 底；`.prog b`、`.boss .bt` 文字陰影 | `#0b0806`（style.css L8） |
| --scene-temple-ground／-mid／-light／-edge | `#1d1203`／`#4b3b2b`／`#7c644c`／`#120700` | 無（戰場目前用冰／墓室地板圖＋寫死遮罩） | `#1c181e`／`#6a241b`／`#a63c2b`／`#2a150e` |
| --scene-temple-dark-rgb／-glow-rgb | `9 7 5`／`255 179 90` | 無 | `7, 4, 3`／`255, 179, 90` |
| --scene-lava-ground／-mid／-light／-edge | `#211007`／`#52372e`／`#865f51`／`#150500` | 無 | `#1b1311`／`#2a1d18`／`#5c3a28`／`#0c0807` |
| --scene-lava-dark-rgb／-glow-rgb | `10 7 5`／`255 138 60` | 無 | `12, 4, 2`／`255, 138, 60` |
| --scene-tomb-ground／-mid／-light／-edge | `#171507`／`#413e2d`／`#6d6950`／`#0c0900` | 無（`P.save==='new'` 用墓室地板圖） | `#18201a`／`#28362b`／`#4c6250`／`#0b100c` |
| --scene-tomb-dark-rgb／-glow-rgb | `8 7 5`／`150 210 130` | 無 | `3, 9, 5`／`140, 240, 140` |
| --scene-ice-ground／-mid／-light／-edge | `#0a1619`／`#304044`／`#536c72`／`#010b0d` | 無（預設戰場用冰地板圖） | `#1f3044`／`#35607e`／`#a8d8f0`／`#16263a` |
| --scene-ice-dark-rgb／-glow-rgb | `6 8 8`／`170 205 225` | 無 | `3, 7, 14`／`143, 214, 255` |

藏身處（HIDE_BIO）跟 temple 同一套值。現行 `:root` 的 `--scene-hide-dark-rgb`（`5, 3, 3`）／`--scene-hide-glow-rgb`（`255, 150, 70`）改成 temple 的 `-dark-rgb`／`-glow-rgb`，不另留角色。

## 面板

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --panel-inset | `#24211e` | `.btn.off`、`.bar`、`.lb` 底、`.st`、`.sk.off`、`.idle .gs`／`.ipb .pb`、`.goalb .gp`、`.cc .cp`／`.tag`、`.sys` 底、`.sk .lk` 所在空態 | `#1f1915` |
| --panel | `#35312c` | `.pnl`、`.tab`、`.idle`、`.idle .away`、`.sticky`、`.off`、`.sys section`、`.forge`；`demo.js` L996 | `#26201b` |
| --panel-raised | `#39342f` | `#ctl` 控件、`.btn.sec`／`.danger`、`.card`、`.sk`、`.cc` | `#332a23` |
| --panel-raised-2 | `#3c3732` | `.flip .fb`；天賦樹線 `demo.js` L1431 寫死舊值 `#3a3027` | `#3a3027` |
| --plate-world | `rgba(36,33,30,0.85)` | `.plate`（含營地 `.res` 資源列）、`.boss`、`.ult`、`.dplate`、`.d3`、`.navtip`、`.goalb`、`.edge`、`.prog b` | `rgba(11, 8, 6, 0.8)` |
| --sheet-bg | `rgba(53,49,44,0.94)` | `.toast` | `rgba(31, 25, 21, 0.92)` |
| --panel-rgb | `53 49 44` | `.sticky::before`、`.sfade` 漸層 | `31, 25, 21` |
| --chase-bnr | `rgba(44,36,30,0.94)` | `.chban` | `#1c130d`（不透明） |
| --scrim-rgb | `10 8 6` | `.scrim`、`.lb span` 陰影、`.sk .cdv` | `0, 0, 0` |
| --hl-rgb | `225 220 213` | 無 | `214, 218, 226` |
| --glint／--glint-rgb | `#ffffff`／`255 255 255` | `.idle .gs i.flash`、`.goalb .gp i.flash` | `#ffffff`／`255, 255, 255`（值不變） |
| --warm-glint-rgb | `255 225 170` | 無 | `255, 225, 170`（值不變） |
| --hurt-vignette-rgb | `190 30 25` | 低血紅邊 `demo.js` L1532–1533（N2／N7） | `demo.css:root 190 30 25`（注入 `200, 20, 20`；已是定案值） |
| --dodge-vignette-rgb | `120 200 235` | 無 | `80, 180, 255` |

## 文字

介面字色只用這 5 個，加上壓在場景上的 `--tx-scene`（一定要有 `--plate-world`）。`--tx-title` 同 `--tx`（用字級和字重區分）；`--tx-lock`／`--tx-empty` 同 `--tx-off`（5 處全改）。

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --tx | `#dfd6c8` | `body`、`.pnl`、`.tab`、`.idle`、`.cc .cb`、`.off` | `#d9cdb4` |
| --tx-dim | `#c7bdb0` | `#ctl .note`、`.why`、`.x44`、`.tab .kc`、`.idle .ex .er .x44`、`.res .more`、`.cc .cb small`、`.one .ms`、`.off .nx`、`.sys h5`、`.ph2 p`、`.flip .fb` | `#a6957e` |
| --tx-off | `#ada69e` | `.btn.off`、`.sk.off`／`.lk`、`.cc .stamp.off` | `#aa9a84` |
| --tx-strong | `#f7f0e5` | 控件字、`.card h3`、`.toast`、`.boss .bt`／`.bsh`、`.lb span`、`.sk` 字與冷卻、`.st.more`、`.idle .away`、`.plq .stp`、`.cc .tag`／`.stamp`、`.off h2`、`.one h4`；小地圖主角 `demo.js` L1414 寫死舊值 `#f1ebdc` | `demo.css:root #f7f0e5`（注入 `#f1ebdc`；已是定案值） |
| --sel-ink | `#2a1a12` | `.btn.sel`／`:active`、`.tab[aria-selected]` | `#2a1a12`（值不變） |
| --tx-scene | `#f7f0e5` | `.plate`、`.prog b`、`.dplate`、`.d3 b`、`.cgain`、`.goalb`、`.plq`、`.edge` | `#d9cdb4` |
| --tx-title | 同 --tx `#dfd6c8` | `.pnl .hd` | `#d9cdb4` |
| --tx-lock／--tx-empty | 同 --tx-off `#ada69e` | 無 | `#8a7a62`／`#6a5a48` |

## 框

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --border | `#554f48` | `.pnl .hd`、`.lst li` 分隔 | `#4a3e2c` |
| --border-mid | `#a38e6b` | 面板與畫面框、`.btn.off`、`.toast`、`.lb` 1px 框、`.sk.off`、`.tab` 桌機、`.idle`、`.cc`、`.dplate`、`.mini`、`.navtip`、`.plq`、`.sticky`、`.off`、`.sys section`、`.strip`、`.feed .fr.sum` 左邊；小地圖／天賦節點 `demo.js` L1411、L1432 寫死舊值 `#5e4e3a` | `#5e4e3a` |
| --border-ctl | `#b8a482` | `#ctl` 控件、`.btn.sec`、`.sk` | `#907956` |
| --border-hi／-rgb | `#cdbd9f`／`205 189 159` | 焦點框 `.kf`、`.card`、`.bar` 外沿、`.boss`、`.st.more`、`.plq .stp`、`.cc .stamp`／`.cp i`、`.flip .fb`、`.idle .ipb .pb i` | `#a08f78`／`160, 143, 120` |
| --border-cap | `#e3d6bb` | `.feed .fr.pick`、`.plq:hover`、`.cc.sug`／`.pick`、`.cc .tag`、`.sys section.cur`；`demo.js` L948 | `#f1ebdc` |

## 按鈕（--act）

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --act／--act-hi | `#2b6769`／`#327273` | `.btn.pri`、`.tab .bdg`、`.plq .stp.can`、`.cc .stamp.can`（`--act-hi` 無） | `#8f3a2b`／`#a5452f`（舊紅按鈕；主按鈕已定案銅綠，不用紅） |
| --on-act／-rgb | `#f7f0e5`／`247 240 229` | 主按鈕字；`.btn.hold.pri .fill` | `#f3e4d2`／`243, 228, 210` |
| --sel／--paper | `#e3d6bb` | `.btn.sel`／`:active`、`.tab[aria-selected]`（`--paper` 無） | `#e6d9bd`／`#e6d9bd` |

## 語意狀態

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --good／-rgb | `#95d24e`／`149 210 78` | 狀態圖示增益、掛機目標細條、`.tab .dot`、`.idle .away` 左邊、`.cgain` 左邊、`.goalb .gp i`、`.cc .cp i.full`、`.one li .ok`／`.ms .bar i`、`.off .nx .gp i`、`.sk .chg`／`.act`／`.fla`（藥劑生效中）、`.gzone`、`.grid8` | `#7fc95a`／`123, 211, 107` |
| --bad／--bad-hi | `#fe7883`／`#fe7883` | `.btn.danger`、`.st.de`、`.ult`；小地圖怪點 `demo.js` L1416 寫死舊值 `#e0553f` | `demo.css:root 皆 #fe7883`（注入 `#e0553f`／`#f06a50`；已是定案值） |
| --bad-rgb | `254 120 131` | `.btn .fill` | `demo.css:root 254 120 131`（注入 `224, 96, 96`；已是定案值） |
| --warn | `#b7ad66` | `#ctl .note b`、`.toast.warn`、`.lb.mp.hot` 1px 外框、`.idle .ib b.warn`、`.cc .cb small.lack`、`.one li .lack`、`.holdtip`；過熱呼吸 `demo.js` L1630 | `demo.css:root #b7ad66`（注入 `#e0614a`；已是定案值） |
| --ready | `#e3d6bb` | `.sk .pips i`／`.on`（技能段；藥劑次數格已取消，mumi 11/19 14:04）；`demo.js` L565 | `#e6c36a` |
| --asc／-hi／-bg／-on | `#0fb89f`／`#8ce1cf`／`#121e1b`／`#1c4941` | 無（D2 昇華石碑） | `#ff9f43`／`#ffb38a`／`#241510`／`#5a2a12` |
| --awk／-bg | `#caaef4`／`#1d1a22` | 無 | `#b592ff`／`#1b1526` |
| --cat-frac／--cat-mem | `#f7f0e5`／`#ade2f9` | 無 | `#fff7d6`／`#6fe3ff` |
| --mod-mm／--mod-co | `#e97ccf`／`#fe7883` | 無 | `#c79bff`／`#e0614a` |
| --affix | `#83aaf2` | 無 | `#9aa6ff` |

## 生命魔力條

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --hp | `#823630` | `.lb.hp i`、`.boss .bf` | `demo.css:root #823630`（注入 `#8a2a2a`；已是定案值） |
| --mp | `#304e8b` | `.lb.mp i` | `demo.css:root #304e8b`（注入 `#2b4a8a`；已是定案值） |
| --hp-hi | `#ae766c` | 藥劑鈕冷卻環（3 秒冷卻，不限次數）、低血時藥劑鈕外框（非文字圖形） | 新增 |
| --mp-hi | `#7d81ac` | 藥劑鈕冷卻環（3 秒冷卻，不限次數）（魔力） | 新增 |
| --prog-lo／--prog-hi | `#4a3d2b`／`#b89a68` | `--prog-hi`：`.bar i`（離王進度等，不是生命／魔力條）。`--prog-lo` 無 | `#7a4a14`／`#e1a54c` |

現行 demo 的生命／魔力藥劑掛在技能列 `.sk`（H19；圖示隨技能格，不是 24px 的 2×）：生效中 2px `--good` 框＋上緣 `--good` 細條，空／停用走 `.sk.off`（`--panel-inset`＋`--tx-off`＋虛線 `--border-mid`）。沒有 `--hp-hi`／`--mp-hi`。掛機主畫面頂部通貨列、以及生命／魔力藥劑鈕（24px 圖示顯示 2×、冷卻態）尚未出現在 `demo/d1`（mumi 11/19 14:04：藥劑不限次數、冷卻 3 秒，鈕上只畫冷卻環，不再有次數格與空瓶圖示），本檔不預先指定那些元件的底、字、空態用色。

營地資源列 `.res`（C11，掛在 `.plate`）名稱用 `--tx-scene-dim`（見下節，改 `--tx-scene`），數字繼承 `.plate` 的 `--tx-scene`；這不是掛機主畫面頂部通貨列。

## 稀有度

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --rar-normal | `#dfd6c8` | `.r-normal`；地上普通掉落 `demo.js` L1310 寫死 `#d9cdb4` | `#d9cdb4` |
| --rar-magic／-bg | `#83aaf2`／`#161921` | 無（掉落分級沒有魔法）；菁英框 `demo.js` L1326 寫死舊值 `#7ea7ff` | `#7ea7ff`／`#121833` |
| --rar-rare／-bg | `#ffcf5c`／`#201b12` | `.r-rare`、`.flip .ff`；稀有掉落 `demo.js` L1310 寫死 `#ffcf5c` | `#ffcf5c`（字色不變）／`#2a210d` |
| --rar-unique／-bg | `#04e1e8`／`#111e1e` | `.r-leg` | `#52d6c3`／`#0e2826` |
| --rar-chase／-hi／-bg | `#f69625`／`#ffbf73`／`#251c13` | `.r-chase`、`.idle .ipb.full`、`.cgain .ch`、`.pity`、`.chban`、`.wy` 1px 框；`--rar-chase-rgb` 在 `demo.js` L1763 光暈。`--rar-chase-bg` 無 | `#ff9a4a`／`#ffc08a`／`#3a2214`（rgb 注入 `255, 154, 74`） |

## 元素

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --el-phys | `#f7f0e5` | 無 | `#fff3e0` |
| --el-fire | `#ee9978` | 無 | `#ff8a4c` |
| --el-cold | `#ade2f9` | 無 | `#8fd6ff` |
| --el-light | `#f3f9a4` | `.d3` 左邊與 `.em`；投射物 `demo.js` L1347 寫死舊值 `#ffe066` | `#ffe066` |
| --el-chaos | `#e97ccf` | 無 | `#c38bff` |

## 傷害數字

| token | M2-36 值 | demo 裡用在哪 | demo 現值 |
| --- | --- | --- | --- |
| --dmg-hit | `#ffffff` | 一般傷害；`demo.js` L1378 寫死 `#fff3e0` | `#fff3e0` |
| --dmg-crit | `#ffcf5c` | 暴擊；`demo.js` L1378 寫死 `#ffd166` | `#ffd166` |
| --dmg-hurt | `#fdb3d0` | 受傷；`demo.js` L1378 寫死 `#ff5a5a`（修正 2 未套） | `#ff5a5a` |
| --dmg-gain | `#95d24e` | 無（gold／lv／perfect／mat） | `#ffd166`（舊值跟暴擊同色） |
| --dmg-minor | `#ada69e` | 無（miss／block／ev／dot） | `#9aa3ad` |
| --dmg-outline | `rgba(10,8,6,0.95)` | 描邊；`demo.js` L1375 寫死 `rgba(0,0,0,0.8)` | `rgba(0, 0, 0, 0.8)` |

## demo 有、M2-36 無

變體一律併回角色本身（色票「變體與暫存 token」第 1 點），不要再留 `-vN`。

| demo token | 用在哪 | 改對到 |
| --- | --- | --- |
| --tx-scene-dim | `.feed .fr.sum`、`.sk .nm`、`.d3 span`、`.res span b`（注入 `#a6957e`） | `--tx-scene`（此 token 已刪） |
| --scene-void-rgb-v1 | `.feed .fr` 底 0.92、`.feed .fr.sum` 實底、`.feed.thin .fr` 0.6、`.plq` 底 0.92（注入 `21, 17, 13`） | `--scene-void`（`#0d0a07`＝`13 10 7`）。半透明用同一色的 rgb，不另開變體 |
| --scene-void-rgb-v2 | `.mini` 底 0.8（注入 `8, 6, 5`）；地板遮罩 `demo.js` L1299 寫死 `rgba(8,6,5,0.35)` | 同上，改 `--scene-void` |
| --scene-void-v8 | `.tree`、`#d-treecv`；天賦樹底 `demo.js` L1429 寫死 `#10131b` | `--scene-void` |
| --plate-world-1 | `.cgain` 不透明底（`demo.css:root` 自造 `rgb(11, 8, 6)`，色票沒有此名） | `--panel-inset`（`#24211e`＝`rgb(36,33,30)`，即新 `--plate-world` 的不透明本體） |
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

結果：數字背後只會是 `--hp`（7.36）、`--mp`（7.17）或 `--panel-inset`（14.15）；最不利 7.17:1。

現行 demo 的 `.lb`（`demo.css` L112–120）已照 1–3 做（魔力列高寫 13px，桌機規格是 14px）。`.ward` 不在 demo。

## 修正 2：受傷數字疊在亮色／火焰特效上

1. hurt 字色改成 `--dmg-hurt` `#fdb3d0`。
2. 只改 hurt：`lineWidth` 5；描邊 alpha 用 `min(1, fa + 0.5)`。
3. 只改 hurt：`fa = 1 - max(0, f - 0.75) / 0.25`。
4. 描邊改 `--dmg-outline` `rgba(10,8,6,0.95)`。

在 `#ffffe2`／`#fb591d` 上，fa 1.0 為 10.97／11.50，fa 0.75 為 6.58／6.78，fa 0.6 為 4.64／4.72（皆 ≥ 4.5）。現行 `demo.js` L1375–1378 仍用舊色、`lineWidth` 3、舊淡出，尚未套用。

## 驗收（拍攝前）

照 `specs/M2-36-review-checklist.md`「建置前提（先驗再拍）」：要拍的建置須已有 PR #68 的角色名收斂，再在上面套本色票的**全部** token 值與修正 1、2。開拍前腳本讀 `getComputedStyle(document.documentElement)`，把 `M2-36-palette-tokens.md` 表上每一個 token 跟規格值逐一比對（半透明比 rgba），寫進 `prefilter.csv`。只要有一個沒定義或值不同，或後面還有舊的 `:root` 把新值蓋掉（包括 demo 自己的局部覆寫），就中止、不截圖。390×844 與 1280×720 同等檢查，兩種尺寸都要過。
