# M2-36 PixelLab D2 補跑清單＋第二波／第三批審圖結論

負責：Game Art Director。版本 2026-11-19 22:05（台北）：補跑（PR #124，`art/m2-36-d2-rerun`）已審，§3 是定稿挑圖、§4 是補跑結果。審的是 `art/m2-36-d2-b2`（PR #122，項 1–6 全部）與 `art/m2-36-d2-b3`（PR #121，§5a–5d＋§6）。呼叫 body、palette、post、過關都照 `M2-36-pixellab-d2-batch2.md`（下稱 batch2）與 `M2-36-pixellab-d2.md`（下稱主檔）原列，本檔只改 `<DESC>`、`<NOT>` 加詞與種子。規格、JSON、日誌、對話不寫 API key 的名或值。

## 0. 審圖規則的修正（美術總監定，11/19 21:10）

1. **天賦樹 IoU 改成只回報**。第二波天賦 228 張 ❌ 裡 222 張是 IoU：預篩拿每張候選去比所有別組候選，而規格又要主形佔畫布 80–90%，火焰、水滴、愛心這類實心主形在畫布上必然重疊 ≥0.7。這是過濾太嚴，不是 prompt 壞。改用「灰階拼圖在顯示尺寸目視分得出」；我挑定的組另列易混對（見 §3）。
2. **元素主體 C\* 放寬**：主形本身就是元素的組（火焰、閃電、毒液、`tk_storm`），點綴色本身 C\*>40（火 41.7、雷 42.8、混 58.0、綠 59.1），上限從 25% 放寬到 80%；其餘組維持 ≤25%。
3. **部位圖示 IoU<0.6 改成只回報**：11 組最佳組合最大 0.72（盾／頭盔／手套），在 24／32 單色 50% 目視仍分得出；`slot_ring` 是實心圓盤，進補跑。
4. **圓框是真的 prompt 問題**：描述本身是圓的（圓盾、眼、同心弧、日晷、環），或模型自己加底盤。補跑一律把圓形題材改成不閉合的造形，`<NOT>` 加 ring, disc, badge 等詞（§1）。

## 1. 補跑清單（共 111 點，上限 115；由下往上砍）

每張 1 點。尺寸、body、palette、post 照「來源」原列；`<DESC>` 整句換掉，`<NOT>` 在原列後面**加**表中詞。種子 9001–9111 是新段，跟現有種子都不撞。檔名照原規則 `<id>-s<seed>.png`，放 `art/_tmp/m2-36-d2-rr/<id>/`。點數不夠就從最下一列往上砍；第 1–16 列（天賦與王）不能砍。

| 序 | id | 來源 | 尺寸 | 張 | 種子 | 累計 | 為什麼重跑 | 新 `<DESC>` | `<NOT>` 加 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `boss_xingtian` | §2 | 64 | 6 | 9001–9006 | 6 | 8 張無一無頭（全有頭／骷髏頭） | a headless giant warrior, the neck is a flat stump between broad shoulders with nothing above it, two large round eyes on the chest, a wide mouth at the navel, a large axe in one hand and a square shield in the other, mid-dance stance | head, skull, helmet, hood, horns, face above the shoulders |
| 2 | `tk_crimson` | §1a | 48 | 6 | 9007–9012 | 12 | 8 張全有圓底／六角／盾底 | three bold crimson forward chevrons stacked left to right, free-floating, nothing behind them | disc, badge, shield, hexagon, crystal, backing shape |
| 3 | `tn_block` | §1b | 32 | 4 | 9013–9016 | 16 | 正面圓盾＝圓框 | a round shield turned to a steep three-quarter angle so it reads as a narrow upright oval, centre boss, rim thickness visible on the right side, strap on the back | front view, full circle, ring, disc |
| 4 | `tn_crit` | §1b | 32 | 4 | 9017–9020 | 20 | 5 張全圓環 | a pointed almond-shaped eye outline, wider than tall, sharp corners left and right, one small solid pupil dot, made only of lines, no face | circle, ring, disc, round eye, target |
| 5 | `tn_area` | §1b | 32 | 4 | 9021–9024 | 24 | 5 張圓盤／刺球 | three short arcs opening upward like a signal icon, upper halves only, above a small centre dot, arcs not closed | full circle, ring, disc, ball, spikes |
| 6 | `tn_regen` | §1b | 32 | 4 | 9025–9028 | 28 | 5 張都沒有＋，等於 tn_life；點綴改「命＋綠」 | a plain heart with a large bold green plus sign overlapping its lower right corner, the plus clearly separate | （無） |
| 7 | `tn_tough` | §1b | 32 | 4 | 9029–9032 | 32 | 圓框或頭盔 | a flexed arm seen from the side, bicep bulging, fist up, elbow at the bottom left, no body | disc, ring, face, mask, helmet, torso |
| 8 | `tn_thorns` | §1b | 32 | 4 | 9033–9036 | 36 | 「loop」畫成圓環 | a short thorny vine branch curving in an S shape from bottom left to top right, five sharp thorns, both ends open | circle, ring, wreath, loop |
| 9 | `tn_duration` | §1b | 32 | 4 | 9037–9040 | 40 | 日晷正面＝圓盤 | a sundial seen from the side: a low flat stone slab with a tall triangular gnomon standing on it, one thin shadow line | round face, clock, compass, circle, disc |
| 10 | `ts_phys` | §1c | 32→16 | 4 | 9041–9044 | 44 | 5 張全圓框 | a clenched fist seen from the front, knuckles up, bold, fills the canvas, nothing behind it | ring, disc, coin, badge, round border |
| 11 | `ts_light` | §1c | 32→16 | 4 | 9045–9048 | 48 | 4 張圓盤、1 張方框 | a single bold zigzag lightning bolt, diagonal, fills the canvas, nothing behind it | ring, disc, coin, badge, round border, square frame |
| 12 | `ts_chaos` | §1c | 32→16 | 4 | 9049–9052 | 52 | 全圓盤／方框 | a bold three-arm spiral swirl with open arm ends, nothing behind it | ring, disc, coin, badge, round border, square frame |
| 13 | `ts_es` | §1c | 32→16 | 4 | 9053–9056 | 56 | 3 張畫成骷髏 | a thick pale-blue hexagon outline with an empty transparent centre, flat edges | skull, face, eye sockets, circle, disc |
| 14 | `ts_crit` | §1c | 32→16 | 4 | 9057–9060 | 60 | 全圓環 | an almond-shaped eye made of two curved lines meeting at sharp points, one pupil dot, wider than tall | circle, ring, round eye, target, disc |
| 15 | `ts_proj` | §1c | 32→16 | 4 | 9061–9064 | 64 | 圓框或像羽毛 | a single arrow pointing up-right at 45 degrees, clear triangular head, two fletching ticks, thin straight shaft | feather, leaf, ring, disc |
| 16 | `ts_area` | §1c | 32→16 | 4 | 9065–9068 | 68 | 全圓盤／方框 | three short arcs opening upward like a signal icon, upper halves only, arcs not closed | full circle, ring, disc, square frame |
| 17 | `boss_fengbo` | §2 | 64 | 4 | 9069–9072 | 72 | 8 張都是鹿頭，沒有鳥頭 | a beast with a deer body, antlers growing from a bird head with a sharp hooked beak, a long snake tail, carrying an open cloth wind bag, swirling wind ribbons | deer head, horse head, wings |
| 18 | `tk_deflect` | §1a | 48 | 3 | 9073–9075 | 75 | 只有羽毛，沒箭；撞 tn_evade | a straight arrow bent sharply away after glancing off the edge of a large curved feather, arrow and feather both large and separate | disc, ring, round badge |
| 19 | `tk_inevcrit` | §1a | 48 | 3 | 9076–9078 | 78 | 只有劍，沒有尖端爆點；撞 tn_melee | a sword pointing up with a bright four-point burst exactly at the tip, the burst as wide as the blade is long | disc, ring |
| 20 | `ts_attr` | §1c | 32→16 | 3 | 9079–9081 | 81 | 只有 6471 五角星可用 | a four-point star with four long sharp points up, down, left and right, gold, nothing behind it | five-point star, disc, ring, coin |
| 21 | `tn_leech` | §1b | 32 | 3 | 9082–9084 | 84 | 只有水滴，沒有牙 | a single curved white fang, tip down, one red drop falling from the tip | （無） |
| 22 | `slot_ring` | §3 | 32 | 3 | 9085–9087 | 87 | 3 張實心圓盤，撞盾 | a plain thin ring band seen at a steep angle so it reads as a narrow ellipse, hollow transparent centre, no gem | disc, coin, shield, filled centre, gem |
| 23 | `ail_blind` | 主檔 §4 | 16 | 3 | 9088–9090 | 90 | 圓／螺旋，沒有斜槓 | a front-view almond eye with one thick diagonal slash across it | round, spiral, ring, disc |
| 24 | `ail_curse` | 主檔 §4 | 16 | 3 | 9091–9093 | 93 | 圓環像眼，或主形 <10 px | a solid magenta diamond about 12 px tall with a bright pale cross on it | eye, ring, circle |
| 25 | `ail_cons` | 主檔 §4 | 16 | 3 | 9094–9096 | 96 | 綠色整片、棋盤 17–21 | a small upright grey stone tablet with a rounded top, one small green light dot on the top edge, mostly grey | banner, ring, disc, all-green fill |
| 26 | `ail_pin` | 主檔 §4 | 16 | 3 | 9097–9099 | 99 | 7043 曲線、7044 像十字鎬；s7045 斷線 | an upright nail, head at the top, a short horizontal crossbar near the top, vertical, fills the height | pickaxe, hammer, diagonal |
| 27 | `cur_wish` | 主檔 §2 | 16 | 3 | 9100–9102 | 102 | 3 張棋盤 9–15 | a small four-point star stone, flat 3-tone shading, no dithering | checker pattern, dither, noise, snowflake, sun |
| 28 | `cur_pcalam` | 主檔 §2 | 16 | 3 | 9103–9105 | 105 | 3 張都畫成棍／鐮 | a dark corrupted oval stone with one hooked crack and one sharp pale facet highlight, chunky, fills the canvas | stick, blade, scythe, staff, wing |
| 29 | `cur_ink` | 5a | 16 | 3 | 9106–9108 | 108 | 3 張都是細棍，沒墨滴 | a short thick black ink stick, a rectangular block about 3:1, lying at 45 degrees, fills 70% of the canvas, one round blue ink drop beside its lower end | brush, pen, sword, thin line, chalk |
| 30 | `plq_corner` | 主檔 §5 | 16 | 3 | 9109–9111 | 111 | 3 張都不是 L 形 | a small L-shaped carved dark wood corner bracket, two equal arms along the top and left edges, low chroma | ring, gem, cube, flower, face |

補充：
- `tn_regen` 點綴改兩色：命 `#934341` `#af6c64`＋綠 `#95e886`（batch2 §1 准 1–2 色）。
- `tk_*`、`boss_*` 補跑後一樣只列過關的給 mumi 挑，不由我定。
- 1c 小點照舊產 32、最近鄰縮 16 再 `alpha_binary`。
- `ail_pin` 的 s7045（斷線）不重送，由本表 9091–9093 取代。

## 2. 牆

- **牆頂用 `tile_d2_walltop-s5221`（首跑原圖＋新 post）**：平均 L\* 37.1（32–38 內）、`#615b56` 89%、接縫比 0、雜點 0.1%，石板縫清楚，4×4 平鋪無縫。新跑的 5321／5322 L\* 21.4／24.3，5323 是 HTTP 500，**不補跑**（0 點）。
- **牆面 5331–5333 三張都是整片 `#25211e`＋第 0 列 `#46413c`**，沒有紋理，L\* 13.9（要 17–23）。模型重跑多半一樣，**不補跑**。請工程師用程式畫（0 點）：底 `#33302b`（L\* 20.0），每 6 列一條 1 px `#25211e` 石層縫、縫上錯開 1 px 豎縫，第 0 列 `#46413c`；平均約 L\* 19，`#33302b`＋`#25211e` 100%，四種接法無縫。

## 3. 我挑定的（大點、小點、部位、通貨、狀態、牌匾、道具）

標 ⚠ 的是可用但不理想。種子後面沒標的是第二波，標 \* 的是第三批。

**大點 tn（44 組，42 組定）**：base 8201\*⚠五角星｜life 6205｜armour 8205\*｜melee 6215｜atkspd 6217⚠沒速度線｜proj 6221｜evade 6224｜critdmg 6230｜crit 9018｜acc 6232｜trap 6235｜ail 6237｜elem 8228\*｜elemskill 6244｜spell 8231\*｜es 6251｜mpcd 6253｜occult 6256｜minion 6258｜aura 6263｜primal 6264｜totem 6267｜attack 8249\*｜phys 6277｜fire 6280｜cold 8256\*｜light 8257\*｜chaos 6290⚠沒混色｜bleed 6291⚠六滴｜poison 6294｜leech 9084｜strike 8270\*｜heavy 6308｜stun 8274\*｜deflect 6320｜curse 6326｜rage 6328｜parry 6331｜regen 9026｜tough 9031｜thorns 9033｜duration 9038。無可用、用現有借圖：block、area。

**小點 ts（24 組，23 組定）**：attack 6402｜fire 6409｜cold 8407\*｜bleed 8414\*｜poison 6423｜ignite 6425｜life 6429｜mana 8421\*｜armour 8426\*⚠｜evade 8428\*｜block 8429\*｜speed 6451｜minion 8440\*｜flask 8442\*｜curse 8444\*｜aura 6468｜attr 6471⚠五角星｜es 9053⚠實心六角｜crit 9057｜proj 9063｜phys＝借大點 tn_phys 6277｜light＝借大點 tn_light 8257｜chaos＝借大點 tn_chaos 6290（借大點的照小點流程：最近鄰縮 16 再 `alpha_binary`）。無可用、用現有借圖：area。

易混對（同表、灰階要再看）：tn_ail／tn_poison／tn_leech（都是滴形）；tn_life 與補跑的 tn_regen；ts_bleed／ts_fire／ts_ignite（16 px 都是尖頂滴形，靠顏色）。

**部位 slot（11 組，10 組可用）**：weapon 6701｜focus 6706｜shield 6707｜helm 6711｜chest 6714｜gloves 6717｜boots 6721｜belt 6722｜quiver 6730｜amulet 6732。ring 補跑仍是實心圓盤，用現有圖。

**通貨 16**：gold 5401⚠偏灰｜trans 5322｜aug 5324｜regal 5327｜exalt 5329⚠｜chaos 5330｜whet 5335｜scrap 5336｜prism 5339｜vaal 5340｜eng 5343｜soulpack 5351｜calam 5351｜pen 5357｜frac 6803\*⚠｜perf 6805\*。wish 9101｜pcalam 9103｜ink 9108⚠（細棍＋墨滴）。灰階：calam≠vaal、pcalam≠exalt 過。

**歸墟王印 16**：5510（5512 備）。

**狀態 16（5c）**：ign 7001｜bleed 7004｜poison 7007｜chill 7011⚠棋盤 9｜frozen 7013｜shock 7017⚠｜elc 7021｜stun 7023⚠只有一顆星｜wither 7025｜exp 7032⚠｜rage 7038｜wet 7042。cons 9094｜pin 9098。blind、curse 補跑仍不過，**留 M2-39 舊圖**。

**牌匾（5d）**：身 5702（四角鉚釘每 96 px 重複一次，拉到 220 會看到兩組；不行就換 5703）｜端 5706｜角花補跑仍不是 L 形（9110 是 T 形），**不用角花**。

**道具 32（項 6）**：lantern 5243⚠｜ash 5244⚠灰色火焰形，違反 no flame｜joss 5247｜stele 5249｜crate 5252｜barrel 5255｜rack 5256。不補跑（點數留給天賦與王）。

## 4. 補跑結果（PR #124，110／111 張；tk_crimson s9011 斷線未扣點）

| id | 結果 | 定 |
| --- | --- | --- |
| `boss_xingtian` | 9003 無頭（頸部是空的領口），胸眼看不出；其餘 5 張有頭 | 9003 進 mumi 挑（只有 1 張） |
| `boss_fengbo` | 9072 鳥喙頭＋鹿角＋蛇尾，但有翅膀；9069 鳥頭但有地面影子；9070／9071 仍是鹿頭 | 9072 加進 mumi 挑 |
| `tk_crimson` | 9007–9010 箭形朝上、沒有底盤；9012 盾底 | 4 張進 mumi 挑 |
| `tk_deflect` | 3 張仍只有羽毛 | 沿用 6087／8087 |
| `tk_inevcrit` | 9077 劍尖有爆點、9078 劍尖有光 | 加進 mumi 挑 |
| `tn_block`、`tn_area` | 全是圓盤 | 用現有借圖 |
| `tn_crit`／`regen`／`tough`／`thorns`／`duration`／`leech` | 都有可用 | 見 §3 |
| `ts_phys`／`light`／`chaos` | 圓盤或灰團 | 借大點縮 16 |
| `ts_es` | 9053 實心藍六角，16 看得出六角 | 9053⚠ |
| `ts_crit`／`proj` | 可用 | 9057／9063 |
| `ts_area` | 圓盤或長條 | 用現有借圖 |
| `ts_attr` | 9080 五角星、9081 多角星 | 沿用 6471 |
| `slot_ring` | 全是實心圓盤 | 用現有圖 |
| `ail_blind`／`ail_curse` | 糰、棍、X、太小 | 留 M2-39 舊圖 |
| `ail_cons`／`ail_pin` | 可用 | 9094／9098 |
| `cur_wish`／`cur_pcalam`／`cur_ink` | 可用（ink 偏弱） | 9101／9103／9108 |
| `plq_corner` | 不是 L 形 | 不用角花 |
| 牆面 | 程式畫，L\* 19.3，四邊接縫比 0.00 | 用程式畫；牆頂 s5221 |

PixelLab 點數今晚 24:00 到期，這輪之後不再跑。剩下沒過的組都有退路（現有借圖或 M2-39 舊圖），不擋接線。

## 5. 暫定定稿（11/19 22:06 幕僚長代 mumi，照美術總監建議）

營地地板 5212；弱基石接受；刑天 9003、風伯 9072（嚴格）；元素主體 C\* 上限 80% 准；IoU 只回報。基石 23 組、王 15 隻各選一張，全部暫定，mumi 改哪張只換那張。接線清單在 `M2-36-d2-picks.md`。
