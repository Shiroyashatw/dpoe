# M2-36 PixelLab 提示詞表（D2 紙紮灰燼定案）

負責：Game Art Director。依據：mumi 2026-11-19 15:40 定 D2＋3 項（幕僚長轉）；UIUX `specs/palette-D2-final-ui.md` §5。畫法沿用 `specs/M2-36-drawing-rules.md`。色以本檔與 D2 定案為準；token／demo 兩檔未同步前衝突以本檔為準。只做戰場／營地背景（無 logo、無宣傳圖）、貨幣 16、藥水 24、王印 16、B4 圖示、B3 牌匾。不做 D1、不做 D3 預設（`--theme-styx-*` 只存）。呼叫沿用 `tools/pixellab_batch.py`（`M2-36-pixellab-prompts.md` §2）。規格、JSON、日誌、對話不寫 API key 的名或值。產出放草稿分支（不合併）；過 §6 的交製作人，再經幕僚長請 mumi 挑。

執行條件：等 mumi 確認 D2 定案示意圖後，由製作人通知才執行；API key 不進 repo 或文件。

## 首跑 38 張清單

製作人定：首跑只跑這 38 張。其餘「第二批以後，等 mumi 挑完 38 張、色值不再動後再排」。三石墨不產、繼續借圖（第二批 113，不是 157−38 的 119）。種子第 k 張＝seed0＋k。

| 表 | id | 尺寸 | n | 種子 |
| --- | --- | --- | --- | --- |
| 1 | `tile_d2_battle_floor` | 32×32 | 4 | 5201–5204 |
| 1 | `tile_d2_camp_floor` | 32×32 | 4 | 5211–5214 |
| 1 | `tile_d2_walltop` | 32×32 | 3 | 5221–5223 |
| 1 | `tile_d2_wallface` | 64×18 | 3 | 5231–5233 |
| 2 | `cur_gold` | 16 | 3 | 5301–5303 |
| 2 | `cur_soul` | 16 | 3 | 5304–5306 |
| 2 | `flask_hp` | 24 | 3 | 5311–5313 |
| 2 | `flask_mp` | 24 | 3 | 5314–5316 |
| 3 | `wangyin_zhenyue_16` | 16 | 3 | 5401–5403 |
| 3 | `wangyin_chixiao_16` | 16 | 3 | 5404–5406 |
| 3 | `wangyin_jiting_16` | 16 | 3 | 5407–5409 |
| 3 | `wangyin_guixu_16` | 16 | 3 | 5410–5412 |

## 0. 共用鎖色與畫法

燈籠琥珀 `#faaa5e` 不准出現在介面或本表素材（跟傳奇 ΔE 8.9）。`--act` `#7c5729` 只給程式畫的主鈕，不准進圖示／光柱／框／牌匾。冷卻環、光柱黑邊、腳圈由程式畫，不烘進 PNG。

| 角色 | hex | 用途 |
| --- | --- | --- |
| 地面／磚縫／淺磚 | `#46413c`／`#33302b`／`#615b56` | 地板；紋理 C* ≤6；淺磚在中央 60% ≤10% |
| 面板／凸起／框 | `#25211e`／`#2c2825`／`#817b75` | 牌匾底用面板系 |
| 虛空／描邊 | `#000000`（近 `--scene-void` `#0d0a07`） | 圖示外緣 1 px；地磚不描邊 |
| 正文／強調／次要／點綴 | `#e8e5e1`／`#fbf9f6`／`#aeaba7`／`#f4f0ec` | 高光、金幣金屬；點綴 ≤20%，不進中央 60% |
| 普通／魔法／稀有／傳奇／追逐 | `#f1ebdb`／`#9da7ff`／`#fbe53a`／`#fa8915`／`#0cf6ee` | 稀有度只給對應物；王印用追逐青 |
| 追逐亮／底 | `#b8fffb`／`#143a38` | 王印印面高光與暗底（本檔補） |
| 正向／警告／負向／預警 | `#95e886`／`#a9ae68`／`#ff9bba`／`#ff3d7f` | 狀態與語意；負向不當大面積 |
| 生命／魔力／冷卻環 | `#934341`／`#3a5b98`／`#af6c64`／`#6b7dad` | 藥水本體用條色；環由程式畫，不烘進圖 |
| 淡金 | `#f2cb9b` | 金幣金屬面；不准用稀有黃或傳奇橘當幣面 |
| 火／冰／雷／混沌／物理／覺醒 | `#ee9978`／`#ade2f9`／`#f3f9a4`／`#e97ccf`／`#f7f0e5`／`#caaef4` | 技能／狀態點綴（§5 未改則沿用） |

大面積戰場 C* ≤12；畫面平均 L* 20–40；C*>40 ≤5%。圖示 ≤10 色（含描邊），3 階＋1 高光。PNG 只原尺寸或整數倍（16→16／32，24→24／48，32→32／64）。源圖不烘外框、環、數字。

**呼叫**

- 地磚、牆、牌匾身、32 圖示、24 藥水：`/create-image-pixflux`；不要的寫進 description 的 `no …`。
- 16 圖示（貨幣、王印、狀態）：`/create-image-bitforge`，必填 `negative_description`。
- `color_image`＝該列 palette hex 排成 1 列 PNG（用本檔 hex）。
- 種子第 k 張＝`seed0+k`；檔名 `<id>-s<seed>.png`，旁存去掉金鑰與 base64 的 `.json`。
- 首跑上限 38。每批前查雲端餘額；已花＋本批不得超過 38。第二批以後，等 mumi 挑完 38 張、色值不再動後再排。

共用 body（替換 `<DESC>`／`<NOT>`／寬高）：

```
pixflux 地磚：{"description":"seamless tileable texture, orthographic view from directly above, <DESC>, the pattern fills the whole canvas evenly, light from the top-left, muted warm paper-ash grey, low chroma, no horizon, no sky, no objects, no text, no border, no dithering, no gradient, no anti-aliasing, no logo, no UI, no saturated amber","image_size":{"width":32,"height":32},"view":"high top-down","outline":"lineless","shading":"basic shading","detail":"low detail","no_background":false}
pixflux 圖示／道具：{"description":"game item icon, flat front view, <DESC>, centred, light from the top-left, 1 pixel black outline, rich three-tone shading plus one highlight, muted paper-ash palette, no perspective, no isometric, no 3D, no face, no text, no background, no dithering, no baked frame, no badge, no cooldown ring, no numerals, no <NOT>","image_size":{"width":W,"height":H},"view":"side","outline":"single color black outline","shading":"medium shading","detail":"medium detail","no_background":true}
bitforge 16：{"description":"tiny 16 pixel game icon, flat front view, <DESC>, bold, 1 pixel black outline, no transparent margin, light from the top-left","negative_description":"blurry, anti-aliasing, gradient, text, background, noise, perspective, isometric, 3D, face, dithering, baked frame, circular badge, numerals, logo, <NOT>","image_size":{"width":16,"height":16},"no_background":true}
```

後處理：地磚 `floor_shift`（牆頂 `wall_shift`，牆面 `face_shift`）＋`wrap_heal`＋`despeckle`，同 `M2-36-pixellab-prompts.md` §5，色階對本檔地面／磚縫／淺磚（牆頂可多 1 階 `#615b56`，受光緣 ≤15%）。圖示 `alpha_binary`（α≥128→255，其餘 0，取 palette 最近色）。

## 1. 第 1 表：戰場與營地背景（可拼地板＋道具；組 390×844、1280×720）

主視覺只這兩處。不直出整屏，改產 32×32 可拼地磚、牆、透明底道具，再最近鄰拼 390×844、1280×720（另縮 960×540 給餘光，不另產）。拼圖不計次。只做 D2 暖灰石埕；lava／tomb／ice 與 D3 日後再做。風格：燒過紙紮的廟埕灰燼，暖灰石板、縫裡薄灰，大面積不搶色。戰場多裂與紙灰；營地同一家族、較平、有踩痕。**營地建築本體沿用藏身處舊圖**；道具只當地面點綴，C*>40 ≤5%，本體 C* ≤12。

| id | 內容 | 尺寸 | n | seed0 | post | palette（hex） | `<DESC>` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tile_d2_battle_floor` | 戰場地板 | 32×32 | 4 | 5201 | floor_shift | `#33302b` `#46413c` `#615b56` | worn temple courtyard flagstones, thin grout filled with warm grey ash, a few hairline cracks, no props, ground is the base colour, grout in the cracks, light tiles only as small worn corners |
| `tile_d2_camp_floor` | 營地地板 | 32×32 | 4 | 5211 | floor_shift | 同上 | same stone family, slightly tidier packed courtyard, faint scuff paths, thin ash in grout, no props, no grass, no water |
| `tile_d2_walltop` | 牆頂（戰場／營地共用） | 32×32 | 3 | 5221 | wall_shift | 同上 | flat top surface of a thick warm-grey stone wall seen from directly above, irregular slabs and thin cracks, no horizon, no peaks, no side silhouette, no objects |
| `tile_d2_wallface` | 牆面（兩半 32×18） | 64×18 | 3 | 5231 | face_shift | 同上 | front face of the same wall, darker toward the bottom, light from top-left, no doors, no windows, no text |
| `prop_censer` | 香爐 | 32×32 | 2 | 5241 | alpha_binary | `#000000` `#33302b` `#46413c` `#615b56` `#817b75` `#f4f0ec` | a small bronze-grey incense censer, tiny pale ash on top, not a lantern, not a fire |
| `prop_ash` | 灰堆 | 32×32 | 2 | 5243 | alpha_binary | `#000000` `#33302b` `#46413c` `#615b56` `#aeaba7` | a low pile of paper ash and burnt scraps, flat, no flame, no ember glow |
| `prop_joss` | 燒殘紙錢 | 32×32 | 2 | 5245 | alpha_binary | `#000000` `#33302b` `#46413c` `#615b56` `#e8e5e1` `#f2cb9b` | a small stack of burnt joss paper, charred edges, mostly grey, only a hint of pale gold on unburnt corners, no fire |
| `prop_stele` | 殘碑 | 32×32 | 2 | 5247 | alpha_binary | `#000000` `#33302b` `#46413c` `#615b56` `#817b75` | a short cracked stone stele, no readable glyphs, not a door |
| `prop_crate` | 木箱（營地） | 32×32 | 2 | 5251 | alpha_binary | `#000000` `#33302b` `#46413c` `#615b56` `#817b75` `#f2cb9b` | a closed packing crate, warm grey wood, not a chest with a lid slant, no gold pile |
| `prop_jar` | 陶甕（營地） | 32×32 | 2 | 5253 | alpha_binary | `#000000` `#33302b` `#46413c` `#615b56` `#817b75` | a squat clay jar, simple, no label, no face |
| `prop_dummy` | 木樁（營地試招） | 32×32 | 2 | 5255 | alpha_binary | `#000000` `#33302b` `#46413c` `#615b56` `#817b75` `#e8e5e1` | a short wooden practice post with a straw wrap, no human face, no limbs |

道具 `<NOT>`：logo, promo, character, monster, UI, amber lantern, saturated orange, unique orange fill。

拼圖（0 次）：地板無縫鋪滿，牆在場邊；首跑只拼地板＋牆。道具等第二批後再補（戰場 4–6、營地 5–7），不擋中央走位，不取代建築舊圖。出 `bg_battle_390x844.png`、`bg_battle_1280x720.png`、`bg_camp_390x844.png`、`bg_camp_1280x720.png`，另縮 `bg_*_960x540.png` 供 P2／P10。禁止字、logo、鈕、角色、怪物（示意另繪）。

**本表過關（另加 §6）**：地板平均相對亮度÷`#46413c` ≤1.02；磚縫 5–35%；3×3 實心暗塊 ≤2%；淺磚 ≤3%、地磚無 `-light`；接縫色差÷磚內 ≤1.2；紋理 C* ≤6。牆頂 `#615b56`＋中階 ≤80%，受光緣 ≤15%，須為正上方的面。拼圖 390／1280／960：中央 60% 中位 L* 27–29、C* 3–6、h 60–90；平均 L* 20–40；C*>40 ≤5%；大面積 C* ≤12。首跑 **14** 張（地板＋牆）。道具 14 張第二批以後（見文首）。拼圖 4＋2 不計次。

## 2. 第 2 表：16 px 貨幣（金、靈魂優先）＋ 24 px 生命／魔力藥水（同一輪）

藥水不限次數、冷卻 3 秒，只由程式畫環；**不產空瓶、不烘次數與環**。圖示 24×24，只顯示 24 或 48（2×）。D1-fix 曾寫 32：2×＝64 會超出直立鈕 56，故改 24（2×＝48，置中於 56、滿桌機 48 鈕）。本輪只換金與靈魂。破裂石／追憶之墨／完美石繼續借 `cur_scrap`／`cur_soul`／`cur_alch`，不產新圖。其餘通貨 16 列第二批以後（見文首）。高階／完美蛻變、增幅、富豪、崇高共用基礎石圖。預兆、鼎、燭龍之心不在本表。藥水 pixflux 24×24、1 px 透明邊（造型 22×22）。貨幣 bitforge 16、不留邊。金幣面用 `#f2cb9b`＋暖灰，禁用 `#fbe53a` `#fa8915` `#faaa5e` `#7c5729`。

| # | id | 名 | 尺寸 | n | seed0 | `<DESC>`／重點 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `cur_gold` | 金幣 | 16 | 3 | 5301 | a short stack of two or three coins, pale gold faces, warm grey edges, not a single ingot, not a crown, not a rare-item star |
| 2 | `cur_soul` | 靈魂 | 16 | 3 | 5304 | a small floating soul wisp, pale core, muted cool violet-grey swirl, not a flame, not a chase cyan seal |
| 3 | `flask_hp` | 生命藥劑 | 24 | 3 | 5311 | a small upright flask with a cork, filled with dark red liquid, readable bottle silhouette, not empty, not a skull, not a heart |
| 4 | `flask_mp` | 魔力藥劑 | 24 | 3 | 5314 | the same flask family as flask_hp, filled with deep blue liquid, same cork and body, not empty, not a star, not a book |
| 5 | `cur_trans` | 蛻變石 | 16 | 2 | 5321 | a small dull blue-grey transmutation stone, round, not a coin |
| 6 | `cur_aug` | 增幅石 | 16 | 2 | 5323 | a small cyan-grey stone with a tiny plus notch, not letters |
| 7 | `cur_regal` | 富豪石 | 16 | 2 | 5325 | a faceted stone with a tiny crown pip on top, muted, not a gold coin stack |
| 8 | `cur_exalt` | 崇高石 | 16 | 2 | 5327 | a pale winged stone, two short wing ticks, not a bird, not a unique orange orb |
| 9 | `cur_chaos` | 轉化石 | 16 | 2 | 5329 | a stone with a two-tone swirl core, muted red-violet and grey, not a yin-yang, not a face |
| 10 | `cur_wish` | 預知石 | 16 | 2 | 5331 | a small four-point star stone, not a snowflake, not a sun |
| 11 | `cur_whet` | 磨刀石 | 16 | 2 | 5333 | a flat grey whetstone bar, not a blade, not a brick wall |
| 12 | `cur_scrap` | 護甲片 | 16 | 2 | 5335 | a small bent metal plate scrap, not a full shield, not a coin |
| 13 | `cur_prism` | 聖化石 | 16 | 2 | 5337 | a short crystal prism, very muted facets, not a rainbow glow flood |
| 14 | `cur_vaal` | 腐化石 | 16 | 2 | 5339 | a dark red vial stone, corked, not a health flask (no large bottle body) |
| 15 | `cur_eng` | 覺醒石 | 16 | 2 | 5341 | a teal-grey rune tablet chip, one simple mark, no readable letters |
| 16 | `soulpack` | 靈魂包 | 16 | 2 | 5349 | a small tied pouch with one wisp leak, not a coin purse pile, not cur_soul alone |
| 17 | `cur_calam` | 災魘石 | 16 | 2 | 5351 | a darker corrupted stone with one hooked crack, distinct from cur_vaal |
| 18 | `cur_pcalam` | 完美災魘石 | 16 | 2 | 5353 | like cur_calam but a sharper pale facet, still muted, not cur_exalt wings |
| 19 | `cur_pen` | 判官筆 | 16 | 2 | 5355 | a short calligraphy brush or pen, tip down, not a sword, not a wand |

palette：`#000000`＋該物 2–4 主色＋`#46413c` `#817b75` `#e8e5e1`。`flask_hp` 加 `#934341` `#af6c64` `#fbf9f6`；`flask_mp` 加 `#3a5b98` `#6b7dad` `#fbf9f6`。兩瓶同一家族，只換液體。#1–4 是首跑 12 張；#5–15、#16–19 第二批以後（見文首；30 張）。**過關**：1× 可辨；藥無空瓶／數字／環；灰階金≠靈魂≠包；災魘≠腐化、完美災魘≠崇高。

## 3. 第 3 表：16 px 王印（追逐徽）

四枚同一家族：**正面平視方印牌＋上緣小圓環**，無頂面／側面，不像臉、寶箱、立體塊。16 要重整理（每枚 ≤3 主形），不留邊，1 px `#000` 描邊。印身暖灰（`#46413c` `#615b56` `#817b75`），**印面只准追逐青** `#0cf6ee`／`#b8fffb`／`#143a38`。禁 `#fa8915`、`#faaa5e`。靠紋樣分（山、劍與焰、雷、單螺旋），灰階並排仍可分。舊 32 作 init 時先把橙追色換成青，再縮 16，`init_image_strength` 300；立體／臉舊圖不准當 init。

| id | 名 | n | seed0 | 印面紋樣 `<DESC>` | `<NOT>` |
| --- | --- | --- | --- | --- | --- |
| `wangyin_zhenyue_16` | 鎮嶽 | 3 | 5401 | mountain ridges carved on the plaque face, glowing cyan | peak silhouette, animal, face |
| `wangyin_chixiao_16` | 赤霄 | 3 | 5404 | an upright sword wrapped in a rising flame, all carved glow in cyan, no orange fire | unique orange, bird, face |
| `wangyin_jiting_16` | 疾霆 | 3 | 5407 | a single lightning bolt carved on the plaque face, glowing cyan | bare bolt without the plaque, mountain |
| `wangyin_guixu_16` | 歸墟 | 3 | 5410 | a single spiral vortex carved on the plaque face, glowing cyan, not concentric rings | cube, whirlpool landscape, face |

palette：`#000000` `#33302b` `#46413c` `#615b56` `#817b75` `#143a38` `#0cf6ee` `#b8fffb`。post＝`alpha_binary`。**過關**：正面家族；C*>40÷不透明 ≤35%；四枚 16 灰階可分；棋盤 ≤6；無臉、無立體。皆屬首跑。定稿拼 `img/ic_wy16.png`（槽位 `M2-33-3a-scene-assets.md` §4.1）。32 不在本表（換青用 `recolor`，0 次）。

## 4. 第 4 表：B4 技能 32 ＋ 戰鬥狀態 16（共 30）

B4（mumi 11/18 16:25 選 B；`specs/M2-40-skill-icon-picks.md` §2.3）：**14 枚技能 32×32**。狀態收戰鬥列、M2-39 優先的 **16 枚 16×16**，共 30。輔助「異常」14 名（劇毒、異常強化、仲裁點燃等）仍用輔助圖，不另畫狀態圖。狀態格程式畫 24×24：增益圓角 6、減益四角切 3（Deck ×1.25 格 30、圓角 8、切角 4，圖仍 16 置中）。源圖不烘格、圓角、切角、時間條。技能 32 留 1 px 透明邊；狀態 16 不留邊。改法以 picks 為準，本表鎖 D2 色。金屬用 `#817b75` `#615b56` `#e8e5e1`，不用舊銅 `#a38e6b`／`#e3d6bb`。

技能（pixflux，n＝2，圖示 body；`<NOT>` 另加 flat colours, plain silhouette）：

| id | 名 | seed0 | `<DESC>`（摘 picks 改法） |
| --- | --- | --- | --- |
| `sk_holyshield` | 盾牌投擲 | 5501 | a front-on kite shield, flat top 12 wide, tapering to a 1 px point, a 1 px ridge down the centre, one short arc of motion below the shield separated by 1 px, no handle, no torch |
| `sk_rage` | 狂怒重砸 | 5503 | a paw print: inverted three-lobe pad 8 wide 6 high, four 3×3 toe pads in an arc with 1 px gaps, no face, no cracks, no insect |
| `sk_windflask` | 疾風藥劑 | 5505 | a round-belly flask tilted 15–20°, belly ≥ 2.5× the neck, one side wind swirl leaving the mouth, swirl tail diameter ≥ 4, not the letter F or E, not gasflask’s rising cloud |
| `sk_ironaura` | 堅毅 | 5507 | a wide-shoulder tower shield, square 90° corners, slightly concave top, metal shading, 2 px rim, four 1×1 rivets, a 3 px red-grey vertical band, a 2 px blade tip with a 5×1 guard, not a tombstone |
| `sk_gasflask` | 毒霧藥劑 | 5509 | a small corked vial at lower left, a three-lobed poison cloud to the upper right with a flat bottom edge, 2 px gap and two smoke ticks between neck and cloud, not grapes, not a doughnut |
| `sk_bloodlust` | 血怒 | 5511 | three parallel slash marks, each thick in the middle and pointed at both ends, 2 px gaps, one 2×3 drop detached from each tip, not a pencil, not a single claw |
| `sk_exorcise` | 破咒 | 5513 | four irregular triangle shards flying outward at different angles, two with 2 px motion ticks, empty centre or a 3×3 burst, not a reticle, not four-way symmetry |
| `sk_meteor` | 隕石 | 5515 | an angular rock at lower right, three separated fire tongues tapering back up-left, yellow to orange to red, 2–3 facets and two 2×2 pits, not an ice-cream cone |
| `sk_purityaura` | 純淨 | 5517 | three small gems in a triangle joined by 2 px lines, hollow centre |
| `sk_summongod` | 無縛化身 | 5519 | broken cuffs: two C-shaped rings at opposite corners, 3 px gap, a 2×2 chip at each break |
| `sk_weaken` | 脆弱 | 5521 | an armour plate split on a 1 px jagged stair crack, the two pieces offset, a small diamond at upper right |
| `sk_tidepull` | 汐引 | 5523 | a single inward water spiral, hollow centre, a 3 px flipped wave tip at the outer tail, not a snowflake |
| `sk_combust` | 爆裂榴彈 | 5525 | a round bomb at lower left with a 3×2 cap, a short fuse, a 5×5 four-point spark detached by 1 px |
| `sk_oilgrenade` | 油榴彈 | 5527 | a wide irregular oil stain at the bottom, a small can at upper left with a 2 px rim and 1 px strap, two 1×1 drips, can and stain separated |

狀態（bitforge 16，n＝2；palette＝`#000000`＋該列色＋`#46413c`；描述沿用 `M2-39-pixellab-prompts.md` §3.2，色改 D2）：

| id | 名 | 格 | seed0 | 主色 | `<DESC>` 要點 |
| --- | --- | --- | --- | --- | --- |
| `ail_ign` | 點燃 | 減益切角 | 5601 | `#934341` `#ee9978` | 單焰，暗芯；不是太陽 |
| `ail_bleed` | 流血 | 減益 | 5603 | `#934341` `#ff9bba` | 三滴，上二下一；不是單滴 |
| `ail_poison` | 中毒 | 減益 | 5605 | `#e97ccf` `#caaef4` | 菱形瓶滴，一泡；不是三滴 |
| `ail_chill` | 冰緩 | 減益 | 5607 | `#ade2f9` `#e8e5e1` | 六臂空心雪花；不是冰塊 |
| `ail_frozen` | 冰凍 | 減益 | 5609 | `#ade2f9` `#e8e5e1` | 實心冰塊一裂縫；不是雪花 |
| `ail_shock` | 感電 | 減益 | 5611 | `#f3f9a4` `#e8e5e1` | 單道閃電，無環 |
| `ail_elc` | 觸電 | 減益 | 5613 | `#f3f9a4` `#e8e5e1` | 閃電在空心環內，環要清楚 |
| `ail_stun` | 暈眩 | 減益 | 5615 | `#a9ae68` `#e8e5e1` | 三顆四角星繞隱心 |
| `ail_wither` | 凋零 | 減益 | 5617 | `#e97ccf` `#25211e` | 下垂三瓣枯花 |
| `ail_blind` | 致盲 | 減益 | 5619 | `#e8e5e1` `#ff9bba` | 正面眼加斜槓；不是純圓 |
| `ail_exp` | 曝曬 | 減益 | 5621 | `#a9ae68` `#ee9978` | 小日加橫槓；不是火焰 |
| `ail_curse` | 詛咒 | 減益 | 5623 | `#e97ccf` `#e8e5e1` | 實心菱加亮十字；不是眼 |
| `ail_rage` | 盛怒 | 增益圓角 | 5625 | `#ff9bba` `#934341` | 實心紅球一高光；不是血滴 |
| `ail_wet` | 濕透 | 減益 | 5627 | `#ade2f9` `#3a5b98` | 一滴在短水灘上；不是血 |
| `ail_pin` | 釘身 | 減益 | 5629 | `#817b75` `#e8e5e1` | 直立釘加短橫檔 |
| `ail_cons` | 奉獻地面 | 增益 | 5631 | `#817b75` `#95e886` | 小石碑，頂緣一點綠光 |

M2-39 其餘狀態不進本表。本表 60 張第二批以後（見文首）。技能 palette＝各招元素／金屬＋`#000000`。**過關**：14 枚兩兩 IoU32 <0.6（含 windflask vs gasflask）；16 縮圖對得上 picks 驗收句；狀態 16 在 24 格置中、源圖無框；灰階可分（感電≠觸電、冰緩≠冰凍、中毒≠濕透≠流血）。

## 5. 第 5 表：B3 牌匾

牌匾高 **44**、左右內距 12，字 14／700 由程式寫（例「鍛造台 Lv5」），底 `--plate-world`（`#25211e` 92%）。本表只產**無字**的身、端、角花；▲、進度條、亮框、焦點是 CSS。最寬 220，身須可橫向平鋪。API 若拒 44 高，改 48 再裁上下各 2 px（裁完仍無字）。角花 16，源圖只畫左上，其餘翻轉。

| id | 內容 | 尺寸 | n | seed0 | post | `<DESC>` |
| --- | --- | --- | --- | --- | --- | --- |
| `plq_body` | 可平鋪匾身 | 96×44 | 3 | 5701 | alpha 若有透明，否則 floor 類但不做 floor_shift 降亮 | a horizontal worn paper-ash wooden plaque surface, flat, slightly warm grey, faint fibre, seamless on the left and right edges, no text, no nails in the middle, no logo |
| `plq_end` | 左右端（含內距區） | 16×44 | 3 | 5704 | alpha_binary | the short end cap of the same plaque, matching the body tone, plain, no text, no hanging chain |
| `plq_corner` | 角花（左上） | 16×16 | 3 | 5707 | alpha_binary | a small corner ornament in burnt-paper cut style, L-shaped, low chroma, not a flower bouquet, not a face, not a unique orange seal |

palette：`#000000` `#25211e` `#2c2825` `#33302b` `#46413c` `#615b56` `#817b75` `#aeaba7` `#e8e5e1`。角花可加極少 `#f2cb9b`（≤5%）。十座設施與山海寶盒、試招場共用一套匾，不每座一張、不烘名。小圖仍用 `CAMP_IC`。

**過關**：拼高 44，拉到寬 220 接縫不大於體內；角花翻轉對齊；0 個字元；C*>40 ≤5%。9 張第二批以後（見文首）。

## 6. 收圖檢查（腳本，不過的不進挑圖）

擴充 `tools/asset_check.py`（每張一列 csv）。對比 WCAG 相對亮度；ΔE CIEDE2000。

| 檢查 | 怎麼量 | 過關 |
| --- | --- | --- |
| 色票偏移 | 不透明像素對該列 palette 最近色 ΔE | ΔE>3 的 ≤5%、最大 ≤10；後處理後 100% palette |
| 沒被放大 | 原圖最近鄰縮半再放大，與原圖完全相同→是放大圖 | 不能完全相同 |
| 不反鋸齒 | 圖示／道具 alpha 只 0 或 255；地磚不透明 | 過渡色 0（後處理後） |
| 不抖色 | 不透明 2×2 為 a b／b a 交錯的格數 | 地磚孤立像素 ≤2%；圖示類別雜點 ≤3%；16 棋盤 ≤6 |
| 禁色 | 像素是否落在 `#faaa5e`、以及非追逐／非傳奇物上的 `#fa8915`；圖示是否誤用 `#7c5729` | 0 像素（容差 ΔE ≤2 視為同色） |
| 地磚亮度／接縫／牆 | 同 `M2-36-pixellab-prompts.md` §6，地面改對 `#46413c` | 見 §1 |
| 拼圖舒適 | 390／1280／960 全畫面 L*、C*>40、中央 60% 中位 L*／C*／h | 見 §1；另交 UIUX 用 P2／P10 重量 |
| 圖示整數倍 | 源寬高只許 16／24／32（牌匾 44／16／96 例外） | 是；預覽只 1×／2× |
| 不烘框 | 外圈 1 px 是否為 UI 格／圓角／切角／環／數字 | 不准有；描邊只准 1 px `#000` 外緣 |
| 王印家族／飽和 | 目視＋ C*>40 佔不透明 | 見 §3；≤35% |
| 技能 IoU | 32 剪影兩兩 IoU | <0.6 |
| 藥水 | 連通瓶身、有塞、有液體；OCR／連通域找數字與環 | 無空瓶、無數字、無環；HP／MP 同家族 |
| 牌匾 | 拼高 44、左右接縫、OCR 找字 | 見 §5 |

目視：地磚非側視風景；道具非角色；四印灰階可分；14 技能對得上 picks。過關圖拼對照後交製作人。

## 7. 張數

| 批 | 張數 | 內容 |
| --- | --- | --- |
| 首跑 | **38** | 地板＋牆 14、金／靈魂／兩藥 12、王印 16 共 12。清單見文首。 |
| 第二批以後 | **113** | 第二批以後，等 mumi 挑完 38 張、色值不再動後再排：道具 14、其餘通貨 30、B4 60、B3 9 |
| 不產 | — | 破裂石／追憶之墨／完美石繼續借圖 |

重跑同 id 種子＋100，每 id 最多再 2 張，再不過手修。首跑重跑仍計入 38，需先報製作人。
