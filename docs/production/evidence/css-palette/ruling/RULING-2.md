# CSS 對齊色票：(d1) 判定（續 2）

接 `RULING.md`。欄位與符號同前。

| token | 現值 | 引用（筆數） | 落點 | 判定 | 目標 | ΔE | 對比 | 理由 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `--mp-v1` | `#1a2f8e` | L483 L1031†（2） | css | a | --mp | 14.0 | 條上字 --tx-strong 對 --mp：10.85→6.38（≥4.5過） | 魔力球／條；M2-36 --mp 平塗；L1031 已被 L2230 覆寫 |
| `--rar-magic-v1` | `#7aa8ff` | L483（1） | css | a | --mp | 29.2 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 魔力球高光。這是魔力不是魔法稀有度，不能用 --rar-magic（稀有度色固定）；漸層改平塗 |
| `--rar-magic-v2` | `#8ab4ff` | L604† L676 L805 L833 L844 L1148 L1233 L1243 ｜JS maps.js:8 render.js:482 render.js:629 render.js:1028（12） | css／maps.js／render.js | a | 分用途：--tx／--rar-magic／--hp／--enemy-rim | 27.0 | 詞綴字 --tx 對 --panel：7.65→12.72（≥4.5過）；小地圖菁英點 --enemy-rim 對 --scene-mid：6.29→8.19（≥3過） | CSS 鍛造與說明的詞綴字（活的：L1148 .fpv、L1233 .fslot、L1243 .fcv）＝M2-33-2a「每條詞綴 14 px --tx」；JS：render.js:482 掉落光圈 r1＝魔法稀有度，改 --rar-magic；render.js:629 菁英頭上血條改 --hp（M2-33-3a）；render.js:1028 小地圖菁英點改 --enemy-rim（UIUX 13:32 裁定，菁英不用稀有度色）；小地圖王點 --enemy-tel 對菁英點 --enemy-rim：ΔE 25.4；maps.js:8 STARS.c 沒有被讀，這個欄位可刪；L604 已被 L926 覆寫；.qb1／.faff／.fop 疑似死碼 |
| `--rar-magic-v3` | `#6f9cff` | L1031†（1） | css | a | --mp | 26.4 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 魔力條上段（魔力，不是稀有度）；L1031 已被 L2230 覆寫 |
| `--rar-magic-rgb` | `138, 180, 255` | L539† L563† L1197† L1200† ｜JS render.js:579（5） | css／render.js | a | --rar-magic（CSS）／--enemy-rim（JS 菁英腳下圈） | 32.7 | 菁英腳下圈 --enemy-rim 0.7 對地面：3.19→3.98（≥3過） | CSS 4 處（魔法格框、漸層、光暈）全被 L2323／L2393 覆寫，現行已是 1 px var(--rar-magic)；JS render.js:579 菁英腳下圈改 --enemy-rim（UIUX 13:32 裁定；原本用魔法藍＝混用稀有度色）；JS 改成 strokeStyle = PAL.enemyRim，再加 globalAlpha 0.7，不用新增 -rgb；要等 JS 改完才能刪這個 token（palette.js 會讀 :root） |
| `--rar-magic-rgb-v1` | `154, 166, 255` | L1536 L2136（2） | css | a | --affix（.term.kw）／--border（#tip .tl） | 0.6 | 關鍵字底線 --affix 對 --panel：2.81→7.15（≥3過） | 技能關鍵字底線＝--affix（M2-36 技能關鍵字）；說明框詞綴行左標線＝中性框；rgba 改平塗 |
| `--rar-magic-bg-v1` | `#1f2740` | L2448（1） | css | a | --rar-magic-bg | 8.2 | 魔法名 --rar-magic 對底：6.61→6.98（≥4.5過） | 說明框魔法標題帶底；M2-33-2a §2「底用該稀有度的 -bg」 |
| `--rar-magic-bg-rgb` | `40, 60, 110` | L563† L1197†（2） | css | a | --rar-magic-bg | 17.2 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 魔法格底；M2-33-2a 格底平塗；L563／L1197 已被 L911／L2323 覆寫，可刪 |
| `--rar-rare-rgb` | `255, 209, 102` | L540† L564† L572 L655† L685 L813† L820† L1198† L1201† L1690 ｜JS touch.js:68 render.js:715（12） | css／render.js／touch.js | b伴生 | --rar-rare-rgb（定稿 251 229 58） | 10.1 | 光柱 對地面：7.00→7.86（≥3過） | JS render.js:715 稀有通貨光柱用 cssv 讀 -rgb 來拼色；M2-36 的光柱按稀有度分色，所以 -rgb 必須留著。值＝--rar-rare，不是新色（AD 定稿）；CSS 10 處：L540/564/1198/1201 已被覆寫；活的是 L572 .sell.on、L685 .nd.b2、L1690 .cub.g3，這些是選中、天賦、通貨在用稀有黃＝混用稀有度色，分別改 --sel-bg／--border-hi／--hl-rgb；touch.js:68 瞄準線改 --hl-rgb |
| `--rar-rare-bg-v1` | `#3a2b12` | L683（1） | css | a | --sel-bg | 7.1 | 已點框 --sel-edge 對底：4.62→3.72（裝飾，不設門檻） | 天賦大節點已點底。M2-36：--sel-bg＝「天賦已點節點」；改 --rar-rare-bg 會讓天賦節點像稀有物品（稀有度混用），所以不照工程建議 |
| `--rar-rare-bg-v2` | `#3a2e12` | L2449（1） | css | a | --rar-rare-bg | 9.7 | 稀有名 --rar-rare 對底：10.36→12.12（≥4.5過） | 說明框稀有標題帶底；M2-33-2a §2 |
| `--rar-rare-bg-rgb` | `110, 85, 30` | L564† L1198†（2） | css | a | --rar-rare-bg | 23.2 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 稀有格底；平塗；全被 L912／L2324 覆寫，可刪 |
| `--rar-unique-rgb` | `250, 137, 21` | L630† L631 L861† L1199†（4） | css | a | --rar-unique（格框）／--sel-bg（.gkind 選中） | 0.0 | 傳奇框 對 --panel-inset：7.14→7.14（≥3過） | 值已等於官方（ΔE 0）；活的只剩 L631 .eqs.r3 框 → 1 px var(--rar-unique)（M2-33-2a）；L630/1199 已被 L2325、L861 已被 L1194／L2242 覆寫 |
| `--rar-unique-bg-rgb` | `58, 34, 20` | L630† L1199†（2） | css | a | --rar-unique-bg | 8.7 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 傳奇格底；平塗；全被覆寫，可刪 |
| `--rar-chase-bg-v1` | `#3a110a` | L895†（1） | css | a | --act | 26.2 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 主鈕舊漸層下緣（不是追逐）；用 --rar-chase-bg 會混稀有度；L895 已被 L1112／L2237 覆寫，可刪 |
| `--rar-chase-bg-v2` | `#4a2a16` | L1984（1） | css | a | --asc-bg | 24.6 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 昇華標頭漸層起點（不是追逐）；用 --rar-chase-bg 會混稀有度，改昇華底 |
| `--rar-chase-rgb` | `12, 246, 238` | L2727 ｜JS render.js:292 render.js:296 render.js:303 render.js:715（6） | css／render.js | b伴生 | --rar-chase-rgb（定稿 12 246 238） | 0.0 | 追逐環 0.9 對地面：6.32→6.32（≥3過） | M2-33-2a §1.1 追逐框已經寫了 rgb(var(--rar-chase-rgb)/0.45)；JS 追逐光柱與地面環（render.js:292/296/303/715）用它拼 rgba。值＝--rar-chase，不是新色（AD 定稿） |
| `--asc-v1` | `#ffb15a` | L485 L487（2） | css | b | --hf（定稿 #b65517） | 27.7 | 條上數字：1.71→4.65（≥4.5過） | 地獄火條上段；跟 --act-v2 合成同一個 --hf（平塗）；舊亮橘當條底時，條上字只有 1.71 |
| `--asc-hi-v1` | `#ffcfa6` | L1944 L1998 L2017（3） | css | a | --asc-hi | 33.6 | 字 對 --asc-on 底：8.30→6.63（≥4.5過）；字 對 --panel-inset：12.15→11.37（≥4.5過） | 昇華亮字（舊橘系；M2-36 昇華已定青色） |
| `--asc-on-v1` | `#4a1f0e` | L621†（1） | css | a | --act | 20.3 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 主鈕舊漸層（不是昇華）；L621 已被覆寫，可刪 |
| `--asc-on-v2` | `#6b2414` | L895†（1） | css | a | --act | 19.3 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 主鈕舊漸層；L895 已被覆寫，可刪 |
| `--asc-on-v3` | `#5a0e0a` | L948（1） | css | a | --hp | 16.3 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 王血條下段（不是昇華）；M2-33-1 平塗 --hp |
| `--asc-rgb` | `255, 159, 67` | L691 L692 L1395 L1941 L1984 L1985 L2014 L2017（9） | css | a | --asc-on（框／線）／--asc-bg（底色） | 59.5 | 昇華節點框 --asc-on 對 --asc-bg：2.17→1.55（裝飾，不設門檻） | 昇華框線 α 0.3–0.45 與選中底 α 0.03–0.14；官方昇華改青色，α 框約等於 --asc-on、淡底約等於 --asc-bg，可平塗、不必新增 -rgb；框對比低（裝飾），節點靠圖示＋形狀；L1985 外光暈建議拿掉 |
| `--cat-frac-v1` | `#ffe7a8` | L824（1） | css | a | --cat-frac | 18.2 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | .dot.dust.rare（疑似死碼，未驗） |
| `--cat-frac-v2` | `#fff3c4` | L1539（1） | css | a | --cat-frac | 14.6 | 字 對說明框 --panel：14.35→15.20（≥4.5過） | 破裂詞字；M2-36 --cat-frac＝--tx-strong |
| `--cat-frac-v3` | `#ffe9a0` | L1539 L1540 L1559（3） | css | a | --cat-frac | 19.6 | 框 對 --panel：13.24→15.20（≥3過） | 破裂左標線／圖示字／揭曉框 |
| `--cat-mem-v1` | `#7be6ff` | L1541 L1556 L1560（3） | css | a | --cat-mem | 7.2 | 字 對 --panel：11.11→11.42（≥4.5過） | 記憶詞字與框；M2-36 --cat-mem |
| `--affix-v1` | `#b9c4ff` | L1954（1） | css | a | --affix | 8.2 | 字 對 --panel：9.43→7.15（≥4.5過） | 天賦卡技能關鍵字 |
| `--awk-v1` | `#b28dff` | L582†（1） | css | a | --awk | 10.5 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | .tier.on 框；L582 已被 L900 覆寫；.tier 疑似死碼 |
| `--el-fire-rgb` | `255, 138, 76` | L1117 L1119 L1208 ｜JS render.js:251 render.js:382（5） | css／render.js | b伴生 | --el-fire-rgb（定稿 238 153 120）／CSS 快爆光暈：--hurt-vignette-rgb ≤0.75 | 7.8 | 隕石圈 0.7 對地面：2.90→3.04（裝飾，不設門檻）；快爆光暈 --vig 0.75 疊 --panel 對 --hf：2.20→1.86（裝飾，不設門檻） | JS 我方隕石落點圈 render.js:251、火焰地面 render.js:382 用它拼 rgba；M2-33-3a 規定「自己的地面用 PAL.el*」；值＝--el-fire，不是新色（AD 定稿）。CSS L1117/1119/1208 地獄火快爆光暈（UIUX 13:37 定案）：改成 rgba(var(--hurt-vignette-rgb), ≤0.75)，畫在條的 1 px --border 框外面、疊在 --panel 上；L1117 的實心框留 --border，不改 --vig；光暈對 --hf：ΔE 19.1，紅、綠、藍黃三種色盲 ΔE 17.1／15.8／13.8，都 ≥ 10，可以分；實心 --vig 直接貼著 --hf 時綠色盲只有 8.2，所以框不用 --vig。我方隕石圈 0.7 超過我方特效 9% 規則（戰場可讀性風險，不在本表範圍） |
| `--el-fire-rgb-v1` | `255, 140, 90` | L473†（1） | css | a | --border-mid | 28.4 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 王血條框；M2-33-1 1 px --border-mid；L473 已被 L947／L1121 覆寫，可刪 |
| `--el-cold-v1` | `#8fc4ff` | L704†（1） | css | a | --tx | 23.6 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 傳送門卡大標題；M2-36 字色規則；L704 已被 L956 覆寫，可刪 |
| `--el-cold-v2` | `#a9cfff` | L956（1） | css | a | --tx | 20.3 | 標題 對 --panel：9.93→12.72（≥4.5過） | 傳送門卡大標題（有顏色的字只限物品名與正負值） |
| `--el-cold-rgb-v1` | `190, 225, 255` | L635†（1） | css | a | --es | 33.5 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | .orb .ward 底＝能量護盾；L635 已被 L715 覆寫，可刪 |
| `--el-cold-rgb-v2` | `123, 230, 255` | L1560（1） | css | a | --cat-mem | 7.2 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 記憶揭曉框光暈；記憶＝--cat-mem；M2-33-2a 不准外發光，建議拿掉；保留就用 color-mix(var(--cat-mem)) |
| `--el-chaos-rgb` | `178, 141, 255` | L582† ｜JS hideout.js:283 render.js:163 render.js:268 render.js:275（5） | css／hideout.js／render.js | b | 分用途：--enemy-tel-rgb（王閃現）／--portal-rgb（傳送門、地圖台符文） | 13.0 | 預警 --enemy-tel 對地面：3.47→2.66（≥3未過）；傳送門環 0.7 對地面：2.70→3.75（≥3過） | JS render.js:163 王「閃現」預警＝敵方攻擊，改 --enemy-tel-rgb（現在的紫色預警比我方傳送門還不顯眼）；傳送門 render.js:268/275、營地地圖台符文 hideout.js:283，連同地圖裡的「回家」傳送門，一律改 --portal-rgb（AD 定稿 #ccbcfe／204 188 254；UIUX 13:32 裁定：同類同色，所有傳送門是同一族）；--enemy-tel 對地面 2.66（舊紫 3.47），一定要加外 1 px #000；「回家」傳送門現在用 PAL.rgb.rarMagicV2（填色）和 PAL.rgb.dodgeVignetteV1（環），這兩個不在 d1，一併改 --portal-rgb（見附加列 X3）；CSS L582 已被 L900 覆寫 |
| `--el-chaos-rgb-v1` | `200, 170, 255` | L719（1） | css | a | --mp-hi（暫用） | 21.5 | 精魂環 對 --panel：8.10→3.93（≥3過） | .orb .spir 精魂環的光暈；UIUX 13:32 裁定先用 --mp-hi，如果 #146 拿掉 .orb 就整段刪 |
| `--dmg-hurt-v1` | `#ff6b6b` | L482 ｜JS combat.js:1861 render.js:604 render.js:973 skills.js:930（5） | css／combat.js／render.js／skills.js | a | 分用途：--hp／--tx-strong／--fx-own | 35.3 | 印記菱形 --tx-strong 對地面：3.64→9.60（≥3過） | CSS 生命球高光 → --hp（平塗）；JS 印記菱形 render.js:604 → --tx-strong（狀態標記，M2-33-3a 狀態列字 --tx-scene）；印記引爆環 combat:1861、上印記環 skills:930、喝藥環 render.js:973 → --fx-own（我方特效）；舊紅色印記在敵人頭上像敵方警示；改白後靠菱形＋位置辨識 |
| `--dmg-minor-v1` | `#8a8d96` | L1528（1） | css | a | --border | 10.5 | 框 對 --panel：4.81→3.82（≥3過） | 天賦圖例「鎖住」虛線框；M2-36 停用 1 px 虛線 --border |
| `--legacy-1` | `255, 90, 40` | L486† L488†（2） | css | a | （刪） | 14.2 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 兩處都已被 L1117／L1119／L1208 覆寫，畫面不吃；地獄火快爆光暈已定案：見 --el-fire-rgb（UIUX 13:37） |
| `--legacy-2` | `#3a3d44` | L682（1） | css | a | --sel-bg | 12.8 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 天賦已點節點底後備值；M2-36「--sel-bg：…天賦已點節點」 |
| `--legacy-3` | `#e6d6ff` | L719（1） | css | a | --mp-hi（暫用） | 29.4 | 精魂環描邊 對 --panel：11.73→3.93（≥3過） | .orb .spir 精魂環描邊；UIUX 13:32 裁定先用 --mp-hi，如果 #146 拿掉 .orb 就刪 |
| `--legacy-4` | `#d6e4ff` | L823（1） | css | a | --tx-dim | 19.4 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | .dot.dust.fine（死碼：class 找不到）；建議刪規則 |
| `--legacy-5` | `#5a72b8` | L823（1） | css | a | --prog-lo | 32.4 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | .dot.dust.fine（死碼）；建議刪規則 |
| `--legacy-6` | `#b8862a` | L824（1） | css | a | --tx-dim | 24.6 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | .dot.dust.rare（疑似死碼）；不可用 --rar-rare 系（通貨≠稀有度） |
| `--legacy-7` | `#d6f0ff` | L825（1） | css | a | --tx-dim | 20.0 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | .dot.soul（疑似死碼）；靈魂現用 cur_soul 圖示 |
| `--legacy-8` | `#4a7fc4` | L825（1） | css | a | --prog-lo | 34.6 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | .dot.soul（疑似死碼） |
| `--legacy-9` | `70, 95, 170` | L911†（1） | css | a | --rar-magic-bg | 28.3 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 物品格稀有度漸層；M2-33-2a 格底平塗該稀有度 -bg；L911–913 已被 L1197–1199、L2323–2325 覆寫，可刪 |
| `--legacy-10` | `20, 28, 60` | L911†（1） | css | a | --rar-magic-bg | 11.2 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 物品格稀有度漸層；M2-33-2a 格底平塗該稀有度 -bg；L911–913 已被 L1197–1199、L2323–2325 覆寫，可刪 |
| `--legacy-11` | `160, 125, 40` | L912†（1） | css | a | --rar-rare-bg | 38.1 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 物品格稀有度漸層；M2-33-2a 格底平塗該稀有度 -bg；L911–913 已被 L1197–1199、L2323–2325 覆寫，可刪 |
| `--legacy-12` | `55, 42, 12` | L912†（1） | css | a | --rar-rare-bg | 10.0 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 物品格稀有度漸層；M2-33-2a 格底平塗該稀有度 -bg；L911–913 已被 L1197–1199、L2323–2325 覆寫，可刪 |
| `--legacy-13` | `50, 150, 140` | L913†（1） | css | a | --rar-unique-bg | 44.2 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 物品格稀有度漸層；M2-33-2a 格底平塗該稀有度 -bg；L911–913 已被 L1197–1199、L2323–2325 覆寫，可刪 |
| `--legacy-14` | `12, 48, 45` | L913†（1） | css | a | --rar-unique-bg | 19.4 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 物品格稀有度漸層；M2-33-2a 格底平塗該稀有度 -bg；L911–913 已被 L1197–1199、L2323–2325 覆寫，可刪 |
| `--legacy-15` | `#8a86a0` | L927 L1537 L1555（3） | css | a | --tx-dim | 17.9 | T 標記 對 --panel：4.56→6.98（≥4.5過） | 說明框／揭曉的 T 標記；M2-33-2a「T 標記 13 --tx-dim」 |
| `--legacy-16` | `86, 108, 128` | L1126（1） | css | a | --sel-bg | 25.4 | 選取字 --glint 對底：6.83→11.03（≥4.5過） | 文字選取底；選中底＝--sel-bg（平塗） |
| `--legacy-17` | `#3d4a58` | L1183†（1） | css | a | --hdr | 17.8 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 面板標題列漸層上段；M2-36 --hdr＝標題列底；L1183 已被 L2193（--panel）覆寫 |
| `--legacy-18` | `#2f3945` | L1183†（1） | css | a | --hdr | 14.1 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 面板標題列漸層下段；同上 |
| `--legacy-19` | `#d98bb0` | L1241（1） | css | a | --cat-corr | 19.2 | 字 對 --panel：6.29→5.41（≥4.5過）；字 對 --panel-raised：5.75→4.95（≥4.5過） | 腐化詞字（.aff.cor、.fslot li.cw）；M2-36 --cat-corr＝腐化詞字色 |
| `--legacy-20` | `#5a3a3a` | L1365（1） | css | a | --prog-lo | 14.5 | 框 --border-ctl 對空段：2.39→2.75（裝飾，不設門檻） | 試招場條空段；M2-36 進度條空段 --prog-lo |
| `--legacy-21` | `#5a5d66` | L1513（1） | css | a | --border | 14.8 | 框 對樹底：2.99→4.43（≥3過） | 鎖住節點描邊；停用框＝--border |
| `--legacy-22` | `#2a2d36` | L1520（1） | css | a | --scene-void | 11.3 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 遠景鎖住節點底；同 --scene-void-v9 |
| `--legacy-23` | `#5b6270` | L1975（1） | css | a | --border | 15.2 | 框 對 --panel-raised：2.44→3.50（≥3過） | 昇華節點「關」框；停用框＝--border |
| `--frame` | `0 0 0 (rgb(var(--scrim-rgb)))` | L641† L884† L915† L934† L1040 L1043 L1698（7） | css | a | （保留，色已走 --scrim-rgb） | 0 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 陰影簡寫，不是色 token；色來自官方 --scrim-rgb，不進色票；7 處中 4 處已被 L1105／L1181 覆寫 |
| `--hi` | `var(--mp-hi)` | L506（1） | css | a | （保留，別名 --mp-hi／--hp-hi） | 0 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 局部別名，值已是官方 token；不進色票 |
| `--pt-bg` | `#090b13` | L1500（1） | css | a | --scene-void | 6.6 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 天賦樹畫布底；值改 var(--scene-void) |
| `--pt-node` | `#10131b` | L1504 L1505 L1626（3） | css | a | --panel-inset | 8.0 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 天賦節點底；值改 var(--panel-inset) |
| `--pt-line` | `162, 148, 110` | L1501 L1502 L1521 L1624（4） | css | a | --border-hi-rgb | 13.6 | 連線 0.62 對樹底：3.14→3.81（≥3過） | 天賦連線 α 0.28–0.62；中性強調框 -rgb（官方），去掉舊暖黃 |
| `--rc` | `var(--rar-rare)` | L1547（1） | css | a | （保留，別名 --rar-rare 等） | 0 | N/A（非字／非功能邊界：底、陰影、光暈或已覆寫） | 局部別名，指向官方稀有度 token；不進色票 |
| `X1 render.js:482 RCOL` | `[PAL.borderCapV1, PAL.rarMagicV2, PAL.dmgCrit]` | render.js:482（用在 314–321 掉落光圈）（1） | render.js | a | [--rar-normal, --rar-magic, --rar-rare] | 19.1（暴擊→稀有） | 稀有光圈 0.5 對地面：2.90→3.24（裝飾） | UIUX 13:32：稀有掉落光圈改 --rar-rare（原本借用暴擊色＝混用稀有度色）。r0 的 PAL.borderCapV1 照同一原則改 --rar-normal（這個 token 在刪除清單裡） |
| `X2 game.js:804 RINGFX` | `以色值當 key` | game.js:802–810、814（1） | game.js（＋combat.js／skills.js 傳參） | a | 改成明示序列圖名 | — | N/A | UIUX 13:32：重新對應。改色以後，敵方環（--enemy-tel）和我方環（--fx-own）都不能再靠色值查表，而且同值的 token 會撞 key（--el-cold＝--cat-mem）。建議 fx({k:ring}) 加 sh 欄位：王現身、王暴怒、獄火自爆、戰吼、怒氣、詛咒區結束→boom；火→boom；冰→frost；混沌→dark；預設→slam；印記環、喝藥→不播（維持現狀）；保留查表的話，至少要補上 [PAL.enemyTel] 和 [PAL.fxOwn] 兩個 key；但這樣印記環會多播一張 boom |
| `X3 render.js:268/275 回家傳送門` | `PAL.rgb.rarMagicV2（填）／PAL.rgb.dodgeVignetteV1（環）` | render.js:268、275（2） | render.js | b | --portal-rgb | — | 環 0.7 對地面：3.33→3.75（≥3過） | UIUX 13:32：同類同色，所有傳送門都是同一族，「回家」也用 --portal，跟其他傳送門靠位置、圖示分；原本兩個 token 都在刪除清單裡 |
| `X4 render.js:953 fx 環` | `環沒有描邊` | render.js:953–959（1） | render.js | a | 外 1 px #000（--dmg-outline／--beam-edge 系的 #000） | — | --enemy-tel 對黑 6.23（≥3過） | UIUX 13:32：fx 環加外 1 px #000（M2-36 --enemy-tel：線 3 px＋外 1 px #000）。先用 lineWidth+2 畫 #000，再畫本色；**硬規則：我方 fx 環的黑邊 alpha 跟環一樣，永遠不能不透明**（--fx-own 環的黑邊最多 9%），確保敵方預警一定比我方環明顯 |
