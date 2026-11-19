# M2-36 PixelLab D2 第二批（點數到期前產完）

負責：Game Art Director。共用畫法、鎖色、呼叫 body、後處理、§6 收圖檢查都照 `M2-36-pixellab-d2.md`（下稱主檔）；本檔只列這批的清單與提示詞。規格、JSON、日誌、對話不寫 API key 的名或值。每張 1 點（16／24／32／48／64 實測）。產出放草稿分支 `art/_tmp/m2-36-d2-b2/<id>/`，過主檔 §6 的才進挑圖。

## 0. 跑的順序

| 序 | 批 | 張數（含候選） | 尺寸 | 提示詞在哪 |
| --- | --- | --- | --- | --- |
| 1 | 天賦樹圖示（本檔 §1） | **296** | 基石 48、大點 32、小點 32→16 | 本檔 §1 |
| 2 | 牆重跑 | 6 | 32×32、64×18 | 主檔「首跑重跑」與 §1 |
| 3 | 首跑補跑：金幣、歸墟 | 6 | 16 | 本檔 §4 |
| 4 | 王的替身圖、物品部位圖示 | 28＋33 | 64、32 | 本檔 §2、§3 |
| 5 | 其餘通貨 #5–19 | 45（每種 3） | 16 | 主檔 §2，n 改 3、種子照 seed0 往後排 |
| 6 | 營地與戰場道具 | 21（每種 3） | 32 | 主檔 §1 道具表，n 改 3 |

不做：第 4 表技能與狀態圖示（M2-40 會改）、王印加跑、怪物（主檔畫法規則：這輪不動）。

## 1. 天賦樹節點圖示

**為什麼要重做**：現在節點圖示全是借的（昇華 `asc_*`、輔助 `sup_*`、技能 `sk_*`、狀態 `ail_*`、裝備 `gear_*`、舊 `tree_n／tree_s`），畫風、線寬、留白都不一，縮到節點裡細節糊掉。節點圖示在 SVG 地圖裡跟著縮放（`tree.js` L157–164），現在小點圖示只有 13 世界單位寬。新圖照顯示大小出圖，**粗剪影、少細節**，不要大圖縮小。

**尺寸（UIUX 定，11/19）**：圖示 16／32／48（小點／大點／基石）。節點半徑不變（小 10、大 19、基石 30），樹的排版不動。圖示寬約＝節點直徑×0.8（16/20、32/38、48/60），外圍留 ≥2 單位給程式畫的三狀態外圈。SVG 會縮放，世界單位不等於像素；預設縮放、390 寬時小點圖示要 ≥16 CSS px（**未驗，工程師量**）。

**工程端改動**：`tree.js` 圖示倍數 小點 1.3→1.6、大點 1.4→1.68、基石 1.4→1.6（入口點半徑 20 用大點圖，倍數照舊，UIUX 未另定）。

**生成**：基石 48、大點 32 直出；小點產 32、最近鄰 2× 縮成 16（PIL NEAREST），再 `alpha_binary` 吸 palette（同主檔藥水作法；pixflux 畫布至少 32×32）。

**畫法（三種共用）**：pixflux 圖示 body（主檔 §0），`<NOT>`＝text, letters, numerals, face, skull, circle frame, node ring, background disc, gradient glow。透明底；**不畫圓框或底盤**（節點圓、外圈、已點／可點／不能點三狀態都由程式畫）。主形佔畫布 80–90%，最細的線 2 px（16 成品 1 px），1 px `#000` 外緣。轉灰階要能分（剪影不同，不靠顏色）。要在三種節點底上都看得清：已點 `--border-cap`、可點 `--panel-raised-2`、不能點 `--panel-inset`，所以主形要有 `#e8e5e1` 亮面＋`#33302b` 暗面兩側。

**palette**：共用 `#000000` `#33302b` `#615b56` `#aeaba7` `#e8e5e1`，再加該列「點綴」1–2 色（元素色規則 B：顏色一定搭形狀）。點綴代號：火 `#ee9978`、冰 `#ade2f9`、雷 `#f3f9a4`、混 `#e97ccf`、命 `#934341` `#af6c64`、魔 `#3a5b98` `#6b7dad`、綠 `#95e886`、金 `#f2cb9b`、無＝不加。

**種子**：第 k 列 seed0＝表首 seed0＋(k−1)×n；檔名 `<id>-s<seed>.png`。

**過關（另加主檔 §6）**：每組 n 張至少 1 張在顯示尺寸（16／32／48 px）上一眼認得出主形；同一表兩兩剪影 IoU <0.7；不准有圓框、字、臉；C*>40 ≤25% 不透明像素。挑圖：大點 44 組、小點 24 組由我挑；**基石 23 組放 mumi 挑圖 Page**。

### 1a. 基石（48×48，n 4，seed0 6001，共 92）

| id | 名 | 點綴 | `<DESC>` |
| --- | --- | --- | --- |
| `tk_judge` | 堅定技巧 | 金 | a straight arrow stuck dead centre in a round target, bold and simple |
| `tk_phalanx` | 鐵壁 | 無 | a wall of three overlapping square iron shield plates |
| `tk_hunter` | 箭雨 | 無 | three arrows falling from above in a narrow fan |
| `tk_master` | 疾風步 | 綠 | a winged boot with three wind streaks behind it |
| `tk_shadow` | 混沌免疫 | 混 | a pale crystal heart inside a hexagon, purple mist kept outside the hexagon |
| `tk_bloodclaw` | 瓦爾契約 | 命 | a rolled contract scroll sealed with one large blood drop |
| `tk_storm` | 火焰化身 | 火 | a standing human silhouette made entirely of flame, no face |
| `tk_medium` | 心靈凌駕 | 魔 | a blue mana orb held in front of a red heart like a shield |
| `tk_bloodmage` | 血魔法 | 命 | a broken blue orb ring with a red drop falling through the gap |
| `tk_bonelord` | 亡者之主 | 無 | a small bone crown above two wolf silhouettes standing side by side |
| `tk_peach` | 不動如山 | 無 | a heavy anchor planted at the foot of a small mountain |
| `tk_banner` | 先祖羈絆 | 金 | two short carved totem poles joined by a rope |
| `tk_scythe` | 黑暗血鐮訓練 | 命 | a dark crescent scythe blade with a red cutting edge |
| `tk_circular` | 循環教義 | 金 | three curved arrows chasing each other in a closed circle |
| `tk_knightly` | 騎士信條 | 金 | a knight lance crossed with a short pennant |
| `tk_irongrip` | 堅鐵之力 | 無 | an iron gauntlet gripping a thick metal bar |
| `tk_ironwill` | 鋼鐵意志 | 魔 | a closed steel helm with one blue gem on the brow, no face |
| `tk_stance` | 磐石姿態 | 無 | a square boulder planted on cracked ground |
| `tk_rolltank` | 堅壁 | 無 | a tower shield tilted mid-roll with one motion arc |
| `tk_esmana` | 異能魔力 | 魔 | a blue mana drop wrapped in a pale thin shield ring |
| `tk_inevcrit` | 必然 | 雷 | a sword point meeting a small four-point burst exactly at the tip |
| `tk_deflect` | 擦身而過 | 無 | an arrow glancing off a curved feather, the arrow bent away |
| `tk_crimson` | 緋紅猛攻 | 命 | three crimson forward chevrons stacked left to right |

### 1b. 大點：每個主題 1 枚（32×32，n 3，seed0 6201，共 132）

同主題的大點共用這一枚（取代 `PT_ICONS` 的輪流借圖；入口點也用該主題這枚）。

| id | 主題 | 點綴 | `<DESC>` |
| --- | --- | --- | --- |
| `tn_base` | 基礎 | 無 | a small four-point star |
| `tn_life` | 生命 | 命 | a plain bold heart |
| `tn_armour` | 護甲 | 無 | a breastplate seen from the front |
| `tn_block` | 格擋與盾 | 無 | a round shield with a centre boss |
| `tn_melee` | 近戰 | 無 | a short broad sword pointing up |
| `tn_atkspd` | 攻擊速度 | 無 | a sword with two speed lines beside the blade |
| `tn_proj` | 投射物 | 無 | a single arrow flying right with fletching |
| `tn_evade` | 身法 | 綠 | a feather curving sideways |
| `tn_crit` | 暴擊率 | 雷 | an open eye shape made only of lines, centred dot, no face |
| `tn_critdmg` | 暴擊傷害加成 | 命 | a jagged burst with a cracked centre |
| `tn_acc` | 命中 | 無 | a crosshair over a small target dot |
| `tn_trap` | 陷阱地雷 | 無 | an open bear trap with teeth |
| `tn_ail` | 異常 | 混 | a drop with a swirl inside |
| `tn_elem` | 元素 | 火 | three small shapes in a triangle: flame, snowflake, bolt |
| `tn_elemskill` | 元素技能 | 冰 | a staff head with a glowing crystal |
| `tn_spell` | 法術 | 魔 | an open book with a spark above it |
| `tn_es` | 能量護盾 | 魔 | a hexagon shield made of light lines |
| `tn_mpcd` | 魔力冷卻 | 魔 | an hourglass with blue sand |
| `tn_occult` | 秘術技能 | 混 | a crescent moon over a small rune stone |
| `tn_minion` | 召喚 | 無 | a paw print |
| `tn_aura` | 精魂光環 | 金 | a lotus flower with a thin halo arc |
| `tn_primal` | 原始技能 | 綠 | a sprouting leaf from a seed |
| `tn_totem` | 砲塔圖騰 | 無 | a short carved totem pole |
| `tn_area` | 範圍 | 無 | three expanding arcs from a centre dot |
| `tn_attack` | 攻擊 | 無 | a fist striking forward |
| `tn_phys` | 物理 | 無 | a heavy hammer head |
| `tn_fire` | 火焰 | 火 | a single flame |
| `tn_cold` | 冰冷 | 冰 | a six-arm snowflake |
| `tn_light` | 閃電 | 雷 | a zigzag lightning bolt |
| `tn_chaos` | 混沌 | 混 | a spiral vortex |
| `tn_bleed` | 流血 | 命 | three drops, two on top, one below |
| `tn_poison` | 中毒 | 綠 | a bubbling flask drop with one bubble |
| `tn_leech` | 偷取 | 命 | a fang with one red drop |
| `tn_regen` | 回復 | 綠 | a heart with a small plus beside it |
| `tn_strike` | 打擊 | 無 | a mace head with impact lines |
| `tn_heavy` | 重擊 | 無 | a hammer coming down on a crack |
| `tn_stun` | 暈眩 | 雷 | three small stars circling a dot |
| `tn_tough` | 堅韌 | 無 | a flexed arm |
| `tn_thorns` | 荊棘 | 綠 | a thorny vine loop |
| `tn_deflect` | 偏斜 | 無 | an arrow bending off a small shield edge |
| `tn_duration` | 持續時間 | 金 | a sundial |
| `tn_curse` | 詛咒 | 混 | a hanging talisman tag with one mark, no readable text |
| `tn_rage` | 盛怒 | 命 | a clenched fist with flame-shaped streaks |
| `tn_parry` | 招架 | 無 | two crossed blades meeting at one spark |

### 1c. 小點：數值家族（產 32→成品 16，n 3，seed0 6401，共 72）

`PT_STAT_IC` 的 143 個數值鍵併成 24 族（對照表由工程師依族名接，族名不夠清楚的問我）。16 成品只准 1 個主形，主形 ≥10 px。

| id | 族（含哪些鍵） | 點綴 | `<DESC>` |
| --- | --- | --- | --- |
| `ts_attack` | 攻擊（atkP 等） | 無 | a single sword, bold |
| `ts_phys` | 物理 | 無 | a fist |
| `ts_fire` | 火 | 火 | a flame |
| `ts_cold` | 冰 | 冰 | a snowflake |
| `ts_light` | 雷 | 雷 | a bolt |
| `ts_chaos` | 混沌 | 混 | a spiral |
| `ts_bleed` | 流血、偷取 | 命 | one blood drop |
| `ts_poison` | 中毒 | 綠 | a green drop with a bubble |
| `ts_ignite` | 點燃 | 火 | a small flame on an ember |
| `ts_life` | 生命、回復 | 命 | a heart |
| `ts_mana` | 魔力 | 魔 | a blue orb |
| `ts_es` | 能量護盾 | 魔 | a hexagon outline |
| `ts_armour` | 護甲 | 無 | a breastplate |
| `ts_evade` | 閃避、敏捷 | 綠 | a feather |
| `ts_block` | 格擋、力量 | 無 | an anvil |
| `ts_crit` | 暴擊、命中 | 雷 | an eye made of lines, no face |
| `ts_speed` | 攻速、施放、移速 | 無 | a wing |
| `ts_proj` | 投射物 | 無 | an arrow |
| `ts_area` | 範圍 | 無 | concentric arcs |
| `ts_minion` | 召喚、夥伴 | 無 | a paw |
| `ts_flask` | 藥劑 | 命 | a small flask |
| `ts_curse` | 詛咒、減益 | 混 | a talisman tag |
| `ts_aura` | 光環、增益、精魂 | 金 | a lotus |
| `ts_attr` | 屬性、智慧 | 金 | a four-point star |

**接線（工程師）**：`PT_KEYS[].ic`→`tk_*`；`PT_ICONS` 每主題改成只有 `tn_*` 一枚；`PT_STAT_IC` 依族改 `ts_*`。舊圖留著不刪，挑圖定稿前不改程式（倍數改動可先做）。

## 2. 王的替身圖（64×64，n 4，seed0 6601，共 28）

這 7 隻現在借用名字對不上的圖（`js/data.js` 的 `BOSSES`）。怪物不受 D2 鎖色（主檔畫法規則），但要跟現有王圖同一畫風：約 60 px 高、全身、正面偏 3/4、深色外緣、細節多。其餘 8 隻借圖（喜怒哀懼愛、三尸）可以接受，這批不做。

**body**：pixflux，`{"description":"game boss sprite, full body, standing, facing the viewer at three-quarter angle, <DESC>, dark fantasy Chinese mythology, centred, feet near the bottom edge, light from the top-left, no text, no background, no ground shadow, no frame, no UI","image_size":{"width":64,"height":64},"view":"side","outline":"single color black outline","shading":"detailed shading","detail":"highly detailed","no_background":true}`；post `alpha_binary`；palette 照下表＋`#000000`。全部禁 `#faaa5e` `#7c5729` `#fa8915`（傳奇橘只給掉寶）。

**新圖用新鍵 `boss_<id>`，舊鍵不動**：這些王圖同時是道具圖示——刑天／風伯／雨師的圖＝「將印・刑天／風伯／雨師」（`FRAGS` 用 `BOSSES…sp` 動態取）；蚩尤 `satan`＝「兵符」；惡 `sin_pride_mirror`＝「預兆・厭棄」「惡之碎片」；欲 `sin_greed_usurer`＝「預兆・貪欲」「欲之碎片」。工程師只把該王的 `sp` 換成新鍵，道具的 `ic` 先留舊圖；道具要不要跟著換，等 mumi 挑完再定。

| id | 王 | palette（另加 `#000000`） | `<DESC>` | `<NOT>` |
| --- | --- | --- | --- | --- |
| `boss_taisui` | 太歲 | `#2a1c18` `#5a2a22` `#934341` `#c43d24` `#f2cb9b` `#e8e5e1` `#615b56` | a towering star-lord general in dark red lacquered armour with pale gold trim, a long halberd, a ring of twelve small round medallions floating behind his back | angel, wings, halo, white robe |
| `boss_chiyou` | 蚩尤 | `#1f1a16` `#4a3a2a` `#7a5a3a` `#a07a4a` `#6b7d6a` `#aeaba7` `#e2552c` | a giant bull-horned war god with bronze armour and copper-green skin, four arms holding a dagger-axe, a short sword and a round shield, low mist at his feet | red devil, bat wings, trident |
| `boss_xingtian` | 刑天 | `#1f1a16` `#4a3a2a` `#7a5a3a` `#8a6c4e` `#934341` `#aeaba7` `#e8e5e1` | a headless giant warrior, two eyes on his chest and a mouth at his navel, a large axe in one hand and a square shield in the other, mid-dance stance | head, helmet, ice armour, skeleton |
| `boss_fengbo` | 風伯 | `#1f2a26` `#3a4a40` `#6b7d6a` `#a9ae68` `#aeaba7` `#e8e5e1` `#ade2f9` | a deer-bodied beast with a bird head and a snake tail, carrying an open cloth wind bag, swirling wind ribbons around it | eagle only, griffin, dragon |
| `boss_yushi` | 雨師 | `#141c26` `#22344a` `#3a5b98` `#6b7dad` `#ade2f9` `#aeaba7` `#e8e5e1` | an old rain master in dark blue robes pouring rain from a bowl, a small black dragon coiled around his shoulders, falling rain streaks | sea serpent only, fish, trident |
| `boss_e` | 惡 | `#1a1618` `#3a2e34` `#615b56` `#8a6a7a` `#e97ccf` `#aeaba7` `#e8e5e1` | a gaunt grey demon in tattered dark robes, a sneering mask, both hands thrust forward pushing something away | mirror, knight armour, cute |
| `boss_yu` | 欲 | `#1f1a16` `#4a3a2a` `#7a5a3a` `#a07a4a` `#f2cb9b` `#934341` `#e8e5e1` | a bloated greedy demon with a huge grinning mouth, clutching strings of square-holed copper coins and a sack of ingots | goblin, small imp, paper scroll |

**過關**：主檔 §6 的色票偏移、不反鋸齒、禁色；剪影 2× 縮小（遊戲 sz 120 世界單位）還認得出主特徵（太歲背後圓牌、蚩尤牛角四臂、刑天無頭胸眼、風伯鹿身鳥頭、雨師碗與小龍、惡推手、欲錢串）；不像現有任何王或怪。每隻 4 張全放 mumi 挑圖 Page。

## 3. 物品部位圖示（32×32，n 3，seed0 6701，共 33）

用在空格剪影（M2-33-2a「空格」：該部位圖示轉單色 `--tx-dim`、透明 0.5），也可當部位篩選。所以**剪影要一眼分得出**，不靠顏色、不畫寶石或稀有度光。pixflux 圖示 body（主檔 §0），`<NOT>`＝text, numerals, gem glow, rarity colour, frame, background disc, hand, character；palette `#000000` `#33302b` `#615b56` `#aeaba7` `#e8e5e1`；post `alpha_binary`。主形佔畫布 80–90%，置中。

| id | 部位 | `<DESC>` |
| --- | --- | --- |
| `slot_weapon` | 武器 | a straight sword pointing up-right at 45 degrees, plain guard |
| `slot_focus` | 法器 | a small orb resting on a short three-prong holder |
| `slot_shield` | 盾 | a kite shield seen front-on, plain face |
| `slot_helm` | 頭部 | a simple open-face helmet seen front-on, empty inside, no face |
| `slot_chest` | 胸甲 | a breastplate with shoulder guards seen front-on |
| `slot_gloves` | 手套 | one gauntlet, fingers up, back of the hand toward the viewer |
| `slot_boots` | 鞋子 | one boot in side view, toe pointing left |
| `slot_belt` | 腰帶 | a belt in a gentle arc with a square buckle in the centre |
| `slot_ring` | 戒指 | a plain ring seen at a slight angle, no gem |
| `slot_quiver` | 箭袋 | a quiver at 45 degrees with three arrow fletchings sticking out |
| `slot_amulet` | 項鍊 | a pendant on a V-shaped chain, plain round pendant |

**過關**：轉單色 `#aeaba7` 50% 墊 `--panel-inset`，24 與 32 都分得出 11 種；兩兩剪影 IoU <0.6（盾≠胸甲、戒指≠項鍊）。由我挑。

## 4. 首跑補跑（bitforge 16，共 6）

| id | n | 種子 | 改法 |
| --- | --- | --- | --- |
| `cur_gold` | 3 | 5401–5403 | 首跑 3 張都不像幣（兩團、灰寶石、竹籤）。`<DESC>`＝a single round cash coin with a square hole in the centre, seen straight on, pale gold face, warm grey rim, fills the canvas；`<NOT>` 另加 stack, ingot, gem, octagon, stick, crown, star；palette `#000000` `#46413c` `#817b75` `#aeaba7` `#e8e5e1` `#f2cb9b` |
| `wangyin_guixu_16` | 3 | 5510–5512 | 首跑 3 張都沒有方牌外形。`init_file`＝`art/_tmp/m2-36-d2-first/wangyin_chixiao_16/post/wangyin_chixiao_16-s5404.png`（strength 300，借牌形）；`<DESC>`＝a small square plaque with a small ring on top, front view, a single thin spiral line carved in the centre of the plaque face, glowing cyan, warm grey plaque body；`<NOT>` 另加 cube, whirlpool landscape, face, figure, person, lightning, sword；palette 同主檔 §3 |

其餘照主檔 §2、§3 的畫法與過關。

## 5. 待 mumi 決定，未放行不跑

製作人報 mumi 點頭的子項才跑；每張 1 點。挑圖 Page 上的營地地板與基石不在這裡。

| 子項 | 張數 | 尺寸 | 種子 | 風險 |
| --- | --- | --- | --- | --- |
| 5a 借圖通貨 3 種 | 9 | 16 | 6801 起，每種 3 | 低 |
| 5b 其餘 8 隻借圖王 | 32 | 64 | 6901 起，每隻 4 | 低 |
| 5c 戰鬥狀態 16 枚 | 48 | 16 | 7001 起，每枚 3 | 中 |
| 5d B3 牌匾 | 9 | 主檔 §5 | 主檔 §5 | 低 |
| 5e 一般怪物 30 種 | 90 | 64 | 7101 起，每種 3 | 中 |

### 5a 借圖通貨（bitforge 16，n 3）

畫法、palette 規則、過關照主檔 §2。

| id | 名 | `<DESC>` | 主色 |
| --- | --- | --- | --- |
| `cur_frac` | 破裂石 | a small grey stone split by one clean crack, the two halves slightly apart, not a skull, not an egg | `#615b56` `#aeaba7` |
| `cur_perf` | 完美石 | a flawless polished oval stone with one bright facet highlight, not a coin, no wings | `#aeaba7` `#e8e5e1` `#f2cb9b` |
| `cur_ink` | 追憶之墨 | a short ink stick lying diagonally with one small ink drop beside it, not a brush, not a sword | `#33302b` `#3a5b98` `#e8e5e1` |

### 5b 其餘 8 隻借圖王（64×64，n 4）

body、禁色、過關、新鍵 `boss_<id>` 的規則同 §2。這些圖也是道具圖示（喜怒哀懼愛＝預兆與碎片；上尸 `necro`＝三彭鼎；中尸＝三尸鼎），道具 `ic` 一樣先留舊圖。

| id | 王 | palette（另加 `#000000`） | `<DESC>` | `<NOT>` |
| --- | --- | --- | --- | --- |
| `boss_xi` | 喜 | `#2a1c18` `#934341` `#c43d24` `#f2cb9b` `#e8e5e1` `#615b56` | a dancing demon in a grinning laughing mask, long red ribbons whirling around it | belly dancer, bikini |
| `boss_nu` | 怒 | `#1f1a16` `#5a2a22` `#934341` `#e2552c` `#ffd890` `#aeaba7` | a wrathful guardian with a red scowling face and flame-shaped hair, raising a heavy club | western devil, bat wings |
| `boss_ai` | 哀 | `#141c26` `#22344a` `#6b7dad` `#ade2f9` `#aeaba7` `#e8e5e1` | a weeping water ghost woman with long wet hair, tears pooling into a puddle at her feet | mermaid, skeleton |
| `boss_ju` | 懼 | `#16130f` `#2c2825` `#615b56` `#8a6a7a` `#aeaba7` `#e8e5e1` | a hollow-eyed shadow ghost cowering, many thin hands reaching out from its robe | grim reaper, scythe |
| `boss_ai2` | 愛 | `#1f1a16` `#5a2a22` `#934341` `#c43d24` `#f2cb9b` `#e8e5e1` | a ghost bride in a red veil and red wedding robe, a long red thread trailing from her finger | western wedding dress |
| `boss_shang` | 上尸 | `#1f2a26` `#3a4a40` `#6b7d6a` `#95e886` `#aeaba7` `#e8e5e1` | a pale long-robed corpse spirit with an oversized head and a scholar cap, clutching a jade tablet | necromancer staff, skull mask |
| `boss_zhong` | 中尸 | `#1f1a16` `#4a3a2a` `#7a5a3a` `#a9ae68` `#aeaba7` `#e8e5e1` | a bloated corpse spirit with a huge belly and gaping mouth, holding two empty rice bowls | ogre, club |
| `boss_xia` | 下尸 | `#141c26` `#22344a` `#615b56` `#6b7dad` `#aeaba7` `#e8e5e1` | a hunched long-legged corpse spirit with pale skin, chains dragging from its ankles | giant, hammer |

### 5c 戰鬥狀態 16 枚（bitforge 16，n 3）

照主檔 §4「狀態」表 16 列原樣跑，只改 n＝3、種子 seed0＝7001＋(k−1)×3。第 4 表的 14 枚技能 32 **不跑**（M2-40 手修中，重產會跟手修撞）。

### 5d B3 牌匾

照主檔 §5 三列原樣跑（9 張）。

### 5e 一般怪物 30 種（64×64，n 3）

`MOBS` 現有圖約 60 px，新圖照 §2 的 body，把 `game boss sprite` 改成 `game monster sprite`、`detail` 改 `medium detail`；palette 由工程師從該怪舊圖取 8 個最多的色（排除禁色）＋`#000000`；新鍵 `mob_<鍵>`，舊圖不刪。`<DESC>`＝下表名稱的英文描述＋「same scale as a 60 px tall sprite」。

| 鍵 | 名 | `<DESC>` |
| --- | --- | --- |
| slime | 綠史萊姆 | a green slime blob |
| dog | 流浪狗 | a mangy stray dog |
| bat | 蝙蝠 | a cave bat, wings spread |
| fire | 鬼火 | a floating blue-green will-o'-wisp flame |
| wolf | 雪原狼 | a white snow wolf |
| tbat | 雷蝠 | a bat crackling with yellow lightning |
| shroom | 毒菇 | a walking purple poison mushroom |
| bear | 黑熊 | a black bear standing on hind legs |
| islime | 冰史萊姆 | a pale blue ice slime with frost shards |
| fslime | 火史萊姆 | an orange-red fire slime with a flame top |
| tslime | 腐臭史萊姆 | a murky brown-green rotten slime with flies |
| lgolem | 熔岩魔像 | a lava rock golem with glowing cracks |
| tgolem | 雷魔像 | a stone golem with lightning runes |
| bknight | 骷髏騎士 | a skeleton knight with sword and shield |
| ltoad | 熔岩蟾蜍 | a lava toad with ember spots |
| tfrog | 雷蛙 | a frog with electric yellow stripes |
| treefrog | 毒樹蛙 | a small bright poison tree frog |
| lantern | 燈籠鬼 | a haunted paper lantern with a tongue |
| joss | 金紙火 | a floating burning joss paper bundle |
| hghost | 餓鬼 | a starving ghost with a thin neck and swollen belly |
| imp | 地獄小鬼 | a small red hell imp with horns |
| paper | 紙人 | a paper effigy doll |
| cobra | 眼鏡蛇 | a hooded cobra rearing up |
| viper | 青竹絲 | a green bamboo viper coiled |
| bailiff | 鬼差 | an underworld bailiff with a chain and a tall hat |
| jiangshi | 殭屍 | a hopping jiangshi in Qing robes with a talisman |
| skel | 骷髏兵 | a skeleton soldier with a rusty spear |
| yaksha | 夜叉 | a blue-skinned yaksha with a trident |
| judge | 判官 | an underworld judge with a brush and ledger |
| priest | 鬼道士 | a ghost Taoist priest with a peach-wood sword |

風險：怪物畫風要跟主角、王接得上，接不上就整批不換（點數明天到期，不跑也是浪費）。過關照 §2，另加與舊圖並排目視。
