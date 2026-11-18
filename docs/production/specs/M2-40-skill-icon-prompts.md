# M2-40 R5 PixelLab 提示詞表（技能圖示重畫）

負責：Game Art Director。範圍照 `specs/M2-40-icon-scope-support-class.md`（數值設計師，UIUX設計師確認 22 列）；可辨識度最後由 UIUX設計師審。畫法照 `specs/M2-36-drawing-rules.md` §1、§2、§5.1，另以本檔 §5 為準。金鑰只讀雲端環境變數 `PIXELLAB_API_KEY`，不准寫進 repo、規格、日誌、JSON 或 PR 留言。產出放草稿 PR（不合併）。資料依 origin/main `c1cd757`（`js/data.js`、`js/art.js`）。

## 1. 上限與批

- **R5 上限 40 次**（mumi 批准，與 M2-39 的 100 次分開記）。本工項已花從 0 起算。約 1 次／張。
- 張數：22 列，其中「毒霧藥劑／油榴彈」拆成兩張，共 **23 張新圖**；另外重畫 **1 張舊圖** `sk_deadeye`（§3.3，UIUX設計師 14:48）。
- 次數分配（合計永遠 ≤ 40）：
  - 23 張新圖首跑 23 次。
  - 17 次備用先拿 1 次給 `sk_deadeye` 首跑，剩 16 次是重跑共用池。
- 重跑池的順序：
  1. `sk_deadeye` 的重跑；
  2. 主清單與拆圖的新圖（§3.1 #1–19）；
  3. 次優先（#20–23）。
  同一順位照不過的先後排。
- 每 id 最多重跑 2 次。重跑池用完、或兩次都不過時，改由美術總監手修，不花生成；手修後一樣要過 §5。
- 若預算只夠 20 張新圖：先砸 `sk_meteor`、`sk_fire`（次優先最後兩列）。
- 每批前在雲端 `GET /v2/balance`，把餘額記進 `spend.csv`。**已花＋這批張數 > 40 就停**，回報製作人，不自行追加。
- 跑前先預覽（不加 `--go`），一次最多 5 張。
- 只做 32×32。不生成 16；16 是 32 的縮圖檢查（§5）。

批次（★＝同批互比，跑完一批先過 §5，再跑下一批）：

| 批 | 張 | id |
| --- | --- | --- |
| A0 舊圖 | 1 | `sk_deadeye`（先跑；後面每批都拿它的新圖來比） |
| A1 光環 | 5 | `sk_clarity`、`sk_purityaura`、`sk_staticfield`、`sk_summongod`、`sk_ironaura` |
| A2 詛咒與近身 | 5 | `sk_despair`、`sk_weaken`、`sk_holyshield`、`sk_bloodlust`、`sk_fireburst` |
| A3 拆圖 | 5 | `sk_gasflask`、`sk_oilgrenade`、`sk_refract`、`sk_tidepull`、`sk_windflask` |
| A4 武器互斥 | 4 | `sk_assassinate`、`sk_combust`、`sk_doom`、`sk_rage` |
| A5 次優先 | 4 | `sk_talisman`、`sk_exorcise`、`sk_fire`、`sk_meteor` |
| R 重跑 | ≤16 | §5 不過的 id，照 §1 順序與 §3.2 |

## 2. 呼叫方式

沿用 `tools/pixellab_batch.py`（`specs/M2-36-pixellab-prompts.md` §2），只改上限與工作表：

- 32 用 `/create-image-pixflux`。不要的東西寫在 description 的 `no …`。
- `color_image`：把該列 palette 的 token 值排成 1 列的 PNG。token 值從 `specs/M2-36-palette-tokens.md` 取，規格不寫色碼。
- 種子：首跑 `seed0`；重跑 1 用 `seed0 + 100`；重跑 2 用 `seed0 + 200`。
- 檔名 `sk_<id>-s<seed>.png`。旁邊存同名 `.json`，內容是 request 去掉 base64，加上 usage。
- 輸出目錄 `art/icons/skill/<id>/`。原圖留在 `art/_raw/skill/`。
- `--repost` 只重做後處理與檢查，不花生成。
- 不准在終端、日誌、JSON、PR 留言或文件印出或寫入金鑰。

### 2.1 共用 body

```json
{"description":"fantasy action RPG skill icon, flat front view, <silhouette>, bold simple shapes readable as a black silhouette at 32 pixels, light from the top-left, 1 pixel transparent margin, 1 pixel black outline, clear negative space, no perspective, no isometric, no 3D, no face, no eyes, no text, no letters, no background, no circular badge, no round frame, no dithering, no gradient, no <not>","image_size":{"width":32,"height":32},"view":"side","outline":"single color black outline","shading":"medium shading","detail":"low detail","no_background":true}
```

- `<silhouette>` 填 §3 的 prompt 欄；`<not>` 填 not 欄。
- 首跑沒有 init。
- 重跑 2 加 `init_image`＝剪影導引圖，`init_image_strength` 200。導引圖由雲端 Claude 照 §3 剪影欄畫：32×32，造型用 `--tx-dim` 實心，外加 1 px `--scene-void` 描邊，其餘透明。導引圖存 `art/_raw/skill/guide/<id>.png`。

## 3. 工作表

### 3.1 23 張（seed0 從 4201 起）

現在的技能圖示幾乎都是置中的圓塊（填滿率中位數 0.35）。舊圖間 IoU 0.6 以上的，多半是「圓塊對圓塊」。所以新圖的剪影一律改走下面這些路線：
- 不置中、不對稱；
- 有挖空、留出負空間；
- 斜線、兩塊分離、環形，或是不規則的外緣。

23 張彼此也要分得開，所以每張用不同的剪影家族（剪影欄），同一家族不重複。

欄位說明：
- 欄：S＝技能列，A＝光環欄。
- 撞圖：現在 IoU 最高的對象。
- 新 id：只有拆圖的會有新 id，其餘沿用原 id、換掉原圖。

| # | id | 欄 | 技能 key（畫面名） | 撞圖（現 IoU） | 剪影家族 | palette |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `sk_clarity` | A | `clarity`（冥思） | `sk_purityaura` 0.92、`sk_precise` 0.83 | 開口新月，右下掉 2 顆小水滴 | `--scene-void`、`--mp`、`--el-cold`、`--tx-strong` |
| 2 | `sk_purityaura` | A | `purity`（純淨） | `sk_clarity` 0.92、`sk_determination` 0.87 | 三顆分開的小寶石排成正三角，細線相連，中間空 | `--scene-void`、`--el-fire`、`--el-cold`、`--el-light`、`--tx-strong` |
| 3 | `sk_staticfield` | A | `h_thunder`（雷霆捷光環） | `sk_weaken` 0.83、`sk_fireburst` 0.79；過實 0.57 | 上緣一條扁雲帶，一道粗閃電從雲往左下劈 | `--scene-void`、`--el-light`、`--warn`、`--tx-strong` |
| 4 | `sk_summongod` | A | `unboundav`（無縛化身） | `sk_weaken` 0.83；過實 0.68 | 斷開的鐐銬：兩半 C 形環，左上與右下分開，中間有缺口 | `--scene-void`、`--awk`、`--el-fire`、`--el-light`、`--border-mid` |
| 5 | `sk_ironaura`（新） | A | `iron`（堅毅） | 原用 `sk_determination`：對 `sk_precise` 0.84、`sk_decay` 0.74 | 寬肩塔盾，正面，下緣平；盾的右上缺一角，露出一截劍尖 | `--scene-void`、`--border`、`--border-mid`、`--border-cap`、`--hp` |
| 6 | `sk_despair` | S | `cu_despair`（絕望） | `sk_holyshield` 0.84、`sk_bloodlust` 0.82 | 彎垂的斷莖成鉤形，莖尖往下，掉一片小花瓣 | `--scene-void`、`--el-chaos`、`--panel-inset`、`--tx-dim` |
| 7 | `sk_weaken` | S | `cu_vuln`（脆弱） | `sk_summongod` 0.83；過實 0.59 | 一塊甲片沿斜線裂成兩片，兩片錯開、中間一道空隙，右上一顆小菱形 | `--scene-void`、`--el-chaos`、`--border`、`--border-mid`、`--tx-strong` |
| 8 | `sk_holyshield` | S | `shieldthrow`（盾牌投擲） | `sk_despair` 0.84、`sk_decay` 0.78 | 小盾在右上、略傾斜，往左下拖 2 道弧形速度線 | `--scene-void`、`--border`、`--border-mid`、`--border-cap`、`--tx-strong` |
| 9 | `sk_bloodlust` | S | `bloodrage`（血怒） | `sk_despair` 0.82 | 三道平行斜爪痕（左上到右下），末端各滴一滴血 | `--scene-void`、`--hp`、`--bad`、`--tx-strong` |
| 10 | `sk_fireburst` | S | `nova`（灌注新星） | `sk_weaken` 0.80、`sk_iceshatter` 0.78；過實 0.57 | 空心火環，外緣 6 道短火舌往外，中心挖空 | `--scene-void`、`--el-fire`、`--warn`、`--hp` |
| 11 | `sk_gasflask`（新） | S | `gasflask`（毒霧藥劑） | 原 `sk_poisontrap` 過實 0.58，與油榴彈共用 | 小瓶在左下、瓶口斜向右上，右上冒一團三瓣毒雲（雲比瓶大） | `--scene-void`、`--el-chaos`、`--panel-inset`、`--border-mid`、`--tx-strong` |
| 12 | `sk_oilgrenade`（新） | S | `oilgrenade`（油榴彈） | 同上 | 底部一灘很寬的扁油漬，左上一顆小圓罐彈起，罐和油漬分開 | `--scene-void`、`--warn`、`--border-mid`、`--panel-inset`、`--border` |
| 13 | `sk_refract`（新） | S | `refract`（折射箭矢） | 與 `mk_sniper` 共用 `sk_markshot` | 一支箭直插進一小段地面短橫條，箭尾往上扇開 3 道短光 | `--scene-void`、`--border-mid`、`--tx-strong`、`--el-fire`、`--el-cold`、`--el-light` |
| 14 | `sk_tidepull`（新） | S | `tidepull`（汐引） | 與 `frostwave` 共用 `sk_frostnova` | 往內捲的浪頭漩渦，單一粗螺旋線，中心空 | `--scene-void`、`--el-cold`、`--mp`、`--el-light`、`--tx-strong` |
| 15 | `sk_windflask`（新） | S | `windflask`（疾風藥劑） | 與 `swift` 共用 `sk_hasteaura` | 細長直立小瓶靠左，兩道長風線從瓶身往右拉出（像「F」） | `--scene-void`、`--good`、`--tx-strong`、`--border-mid`、`--panel-inset` |
| 16 | `sk_assassinate` | S | `mk_assassin`（id；名稱見 §6） | `sk_sacrifice` 0.78、`sk_combust` 0.77 | 單把匕首從左上斜刺到右下，柄端套一個小空心準星環 | `--scene-void`、`--el-phys`、`--tx-strong`、`--bad`、`--panel-inset` |
| 17 | `sk_combust` | S | `grenade`（爆裂榴彈） | `sk_assassinate` 0.77、`sk_despair` 0.76 | 圓彈在左下，一條長引信彎到右上，末端一顆四角火花 | `--scene-void`、`--border`、`--border-mid`、`--el-fire`、`--warn` |
| 18 | `sk_doom` | S | `mk_warlord`（id；名稱見 §6） | `sk_rage` 0.77、`sk_decay` 0.76 | 上半是三尖冠，下接一個空心環；冠寬、環小 | `--scene-void`、`--border`、`--border-cap`、`--hp`、`--tx-strong` |
| 19 | `sk_rage` | S | `furyslam`（狂怒重砸） | `sk_despair` 0.81、`sk_daunt` 0.79 | 熊掌印：一大掌墊加 4 顆分開的趾墊，下方 2 道短裂紋 | `--scene-void`、`--border-mid`、`--hp`、`--bad` |
| 20 | `sk_talisman` | S | `paperdoll`（召喚紙人） | `sk_exorcise` 0.77、`sk_shadowstep` 0.69 | 剪紙人形：張臂、雙腿岔開，薄平、無臉，略往右傾 | `--scene-void`、`--paper`、`--tx-dim`、`--hp` |
| 21 | `sk_exorcise` | S | `hexblast`（破咒） | `sk_talisman` 0.77、`sk_shadowstep` 0.73 | 空心菱形碎成 4 片，往四角飛開，中心留空 | `--scene-void`、`--el-chaos`、`--tx-strong`、`--awk` |
| 22 | `sk_fire` | S | `fireball`（火球） | `sk_meteor` 0.76 | 火球在右，一條短直尾巴水平往左（橫向，不斜） | `--scene-void`、`--el-fire`、`--warn`、`--hp` |
| 23 | `sk_meteor` | S | `meteor`（隕石） | `sk_fire` 0.76、`sk_bloodhowl` 0.63 | 一大塊有稜角的岩石在右下，寬短的火尾往左上 | `--scene-void`、`--border`、`--border-mid`、`--el-fire`、`--warn` |

拆圖時哪一招換新圖：
- `sk_markshot`：`mk_sniper` 留用舊圖，`refract` 換新圖。
- `sk_frostnova`：`frostwave` 和冰凍狀態留用舊圖，`tidepull` 換新圖。
- `sk_hasteaura`：`swift` 和猛攻等狀態留用舊圖，`windflask` 換新圖。
- `sk_determination`：石膚藥劑和翠玉狀態留用舊圖，**新圖給堅毅**（`sk_ironaura`）。理由：光環欄 0.6 以上的舊配對，`sk_determination` 佔 5 對，改給堅毅一次清掉。
- `sk_poisontrap`：兩招都換新圖，舊圖不再掛在技能上。

### 3.2 prompt 欄（填進 `<silhouette>`／`<not>`）

| # | seed0 | prompt | not |
| --- | --- | --- | --- |
| 1 | 4201 | an open crescent moon facing right with two small water droplets falling from its lower tip | full disc, ring, shield |
| 2 | 4202 | three small separate gems in a triangle, joined by thin lines, empty centre | ring, single crystal, disc |
| 3 | 4203 | a flat storm cloud band across the top, one thick lightning bolt striking down to the lower left | round burst, sun, disc |
| 4 | 4204 | a broken shackle, two C-shaped halves pulled apart diagonally with a clear gap | human figure, arch, square block |
| 5 | 4205 | a broad tower shield with a flat bottom, top-right corner cut away showing a short sword tip | ring, round badge, cross |
| 6 | 4206 | a drooping broken stem bent into a hook, tip pointing down, one falling petal | mask, face, skull, diamond |
| 7 | 4207 | an armour plate cracked diagonally into two offset pieces with a gap, a tiny diamond pip at the top right | whole shield, disc, down arrow |
| 8 | 4208 | a small tilted shield at the top right flying away, two curved speed arcs trailing to the lower left | cross on shield, centred shield |
| 9 | 4209 | three parallel diagonal claw slashes from top-left to bottom-right, one blood drip at each end | blood orb, face |
| 10 | 4210 | a hollow ring of fire with six short flame tongues pointing outward, empty centre | solid fireball, filled disc |
| 11 | 4211 | a small vial at the lower left tipped toward the upper right, a large three-lobed poison cloud billowing out | tornado, skull, round flask in centre |
| 12 | 4212 | a wide flat oil puddle along the bottom, a small round pot bouncing above it at the upper left, separated | bomb fuse, flame, centred ball |
| 13 | 4213 | one arrow stuck straight down into a short ground strip, three short light rays fanning up from its tail | target, bow, diagonal arrow |
| 14 | 4214 | a curling wave forming an inward spiral, one thick spiral line, open centre | ice crown, ring of spikes, snowflake |
| 15 | 4215 | a tall thin upright vial on the left, two long wind streaks pulled out to the right | feather, round flask, tornado |
| 16 | 4216 | a single dagger stabbing diagonally from top-left to bottom-right, a small hollow reticle ring at the pommel | hooded figure, face, triangle |
| 17 | 4217 | a round bomb at the lower left, a long curved fuse reaching the upper right, a four-point spark at its end | heart, pedestal, centred bomb |
| 18 | 4218 | a wide three-spike crown on top joined to a small hollow ring below | flaming figure, face, solid disc |
| 19 | 4219 | a bear paw print, one large pad and four separate toe pads, two short cracks under it | angry face, fist, disc |
| 20 | 4220 | a flat paper cut-out doll, arms spread, legs apart, leaning slightly right, featureless | scroll, banner, vertical strip, face |
| 21 | 4221 | a hollow diamond shattered into four shards flying out to the corners, empty centre | paper scroll, flame column |
| 22 | 4222 | a fireball on the right with a short straight tail trailing horizontally to the left | diagonal comet, meteor rock |
| 23 | 4223 | a large angular rock at the lower right with a short wide flame tail toward the upper left | round fireball, long thin tail |

| 24 | 4224 | two dice side by side, the right one tipped up on its corner and higher than the left, a few pips showing | eye, target, shield, face, centred disc |

- 重跑 1：同一個 prompt，把 §5 的撞圖對象寫進 `<not>`。
- 重跑 2：加 §2.1 的剪影導引圖。

### 3.3 舊圖之間的配對（換上 23 張新圖後重算）

舊圖之間 IoU ≥ 0.75 的配對，換圖後還剩 3 對，都在技能列、都跟 `sk_deadeye`（`allin`，梭哈）有關：
- `sk_daunt` 0.788
- `sk_shieldcharge` 0.756
- `sk_determination` 0.753（現在只留給石膚藥劑）

光環欄沒有 ≥ 0.75 的舊配對，因為堅毅改用新圖。

所以只重畫 `sk_deadeye` 一張（#24，技能列）：
- 剪影：兩顆骰子並排，右邊那顆用角立起、位置比左邊高。
- palette：`--scene-void`、`--tx-strong`、`--warn`、`--bad`、`--panel-inset`。
- 過關門檻跟新圖一樣：對同欄集 < 0.6。

重畫後，舊圖之間最高剩 0.734（`sk_chaosbolt`／`sk_markshot`）。0.6–0.75 的舊配對共 69 對（技能列 61、光環欄 8），只列在 `r5_bar_pairs.csv`，這次不另花預算。

## 4. 後處理

沿用 `pixellab_batch.py` 的 `post`：
- `alpha_binary`：alpha ≥ 128 → 255，其餘 → 0；不透明像素取 palette 最近色，記最大 ΔE。
- 外緣描邊補成連續的 1 px `--scene-void`，角上不准 2 px 粗；內部不描邊。
- 不跑地磚用的 `floor_shift`、`wall_shift`、`face_shift`，也不平滑縮放。

## 5. 收圖檢查

用 `tools/asset_check.py`，再加新的 `tools/skill_sil_check.py`。每張一列 csv。不過的不進對照圖、不給 UIUX設計師看。

**剪影比對集**（每批重算）：
- 技能列集：`js/data.js` 裡 `SKILLS` 用到的 `ic`，共 78 枚 `sk_*` 加 `ail_mark`。
- 光環欄集：`AURAS` 用到的 `ic`，共 18 枚。
- 這兩集的圖都先換成本批與先前批已過的新圖；要被取代的舊圖不比。
- 堅毅換新圖後，光環欄不再有 `sk_determination`；它只在技能列（石膚藥劑）。
- 遮罩：32×32、alpha > 127。IoU＝交集 ÷ 聯集。算法同 r17 評估的 `sil.py`。

| 項 | 量 | 通過 | 不過 |
| --- | --- | --- | --- |
| 32 剪影 IoU（新圖與 `sk_deadeye`） | 對同欄集每一枚（含其他新圖） | 全部 < 0.6 | 重跑 1，再重跑 2，再手修 |
| 舊圖之間 | 同欄集內，兩枚都是沒重畫的舊圖 | < 0.75；0.6–0.75 只列出 | 列入 PR，不重跑 |
| 拆圖對象 | 新圖對原共用圖；`sk_fireburst` 加比 `sk_iceshatter`；`sk_ironaura` 加比 `sk_determination` | < 0.6 | 同上 |
| 不是實心塊 | 填滿率＝不透明 ÷ 1024；外框填滿率＝不透明 ÷ 外框面積 | 0.15–0.50；外框 ≤ 0.75 | 重跑 |
| 16 縮圖 | 32 每 2×2 有 ≥ 2 格不透明就算不透明，取最多的色；對同欄集量 IoU | 填滿率 ≤ 0.6；IoU ≥ 0.6 的列出給 UIUX設計師目視，目視分不開就不過 | 重跑 |
| 圖示棋盤 | 不透明 2×2「a b／b a」交錯格數 | 16 縮圖 ≤ 6；32 只回報 | 重跑或手修 |
| 色票偏移 | 不透明像素對 palette 最近色的 ΔE2000 | ΔE > 3 的 ≤ 5%、最大 ≤ 10；後處理後 100% 是 palette 色 | 重跑或 `alpha_binary` |
| 色數 | 整張（含描邊） | ≤ 10 | 併色 |
| 描邊 | 外緣 1 px `--scene-void` 連續；1 px 透明邊 | 無斷線、無 2 px 角 | 後處理修 |
| 圖示雜點 | 8 鄰沒有同類（暗／中／亮）的不透明像素 | ≤ 3% | 手修 |
| 追逐色 | `--rar-chase` | 0 | 退回 |
| 目視（美術總監） | 沒有臉或眼；不是圓徽章；跟同元素的舊圖放一起不突兀 | 判 | 退回 |

可辨識度最後由 UIUX設計師審，美術總監只先篩。按鈕是 52／56，圖示照 M2-36 §1 只用 32 原尺寸或整數倍顯示，置中放。

## 6. 名稱

`mk_assassin`、`mk_warlord`、`mk_sniper` 的畫面名稱含規格禁用字。本檔與檔名只用 id。畫面名稱照數值設計師的名詞表。

## 7. 交付

草稿 PR，分支 `art/m2-40-skill-icons`，不合併。證據放 `docs/production/evidence/m2-40-r5/`：
- `r5_32_compare.png`：每枚放彩色 4 倍＋1 倍、灰階 4 倍＋1 倍，旁邊放它的撞圖對象（舊圖）。
- `r5_sil_32.png`：同欄集全部 32 黑剪影（換上新圖後），1 倍＋2 倍。新圖標框；IoU ≥ 0.6 的配對標紅。
- `r5_sil_16.png`：同上，16 縮圖。
- `r5_bar_mock.png`：本批每組撞圖放進 52 與 56 的空白鈕裡並排（彩色＋灰階）。
- `r5_iou.csv`：每枚新圖對同欄集每一枚的 IoU，32 與 16 都要，附最大值與對象。
- `r5_bar_pairs.csv`：換圖後同欄集所有 IoU ≥ 0.6 的配對（包括舊圖之間）。
- `r5_locations.csv`：**每一處受影響的位置**，一處一列：id、檔案:行、用途（技能／光環／狀態列／天賦主題／其他）、改後用哪張圖。用 `git grep` 在 `js/` 全部找，不要只靠下面這份清單。

規則：同一件東西永遠用同一張圖（UIUX設計師 14:48）。重畫的 id 在每一處都換成新圖。拆圖的新 id，原本借用舊圖的狀態列和天賦主題也要一起改。依 `c1cd757`，已知的有：
- `js/combat.js` 狀態列：
  - `arcane` 用 `sk_clarity`；
  - `unholy` 用 `sk_despair`；
  - `prowess` 用 `sk_talisman`；
  - `bloodrage` 用 `sk_bloodlust`；
  - `perfect` 用 `sk_deadeye`；
  - `herT` 用 `sk_staticfield`；
  - `fury` 用 `sk_summongod`；
  - `windflask` 從 `sk_hasteaura` 改 `sk_windflask`。
- `js/combat.js` 不改的：`stone`、`jade` 仍用 `sk_determination`（石膚藥劑留舊圖）；`onslaught`、`phasing`、`tail`、`sac` 仍用 `sk_hasteaura`；`frozen` 仍用 `sk_frostnova`；`mark` 仍用 `sk_markshot`。
- `js/data.js` 天賦主題：`sk_rage`（戰吼）、`sk_staticfield`（捷光環）、`sk_doom`（波動）、`sk_fireburst`（榴彈）。
- `js/data.js` 技能、光環的 `ic`：新 id 6 個——`gasflask`、`oilgrenade`、`refract`、`tidepull`、`windflask`、`iron`。

疾風藥劑狀態用的是藥劑本身的效果，所以跟著藥劑換新圖。猛攻、迷蹤等是迅捷這一類的效果，留在 `sk_hasteaura`。這兩條如果 UIUX設計師要改，就照他的。
- `review.csv`、`asset_check.csv`、`spend.csv`（已花／上限、每批前餘額）。

結束時在 PR 留一則留言，內容：
- 對照圖路徑；
- 已花／40 與最後餘額；
- 不過的 id 與原因；
- 要手修的 id；
- `r5_bar_pairs.csv` 舊圖之間還剩幾對。

PR 結束留言另外要寫：`r5_locations.csv` 共幾處，以及哪些是「借圖改新 id」的。

挑圖：美術總監先篩，再交 UIUX設計師審可辨識度。定稿後交開發工程師接入：
- 新 sheet；
- 改 `js/art.js` 的座標；
- 新 id 改 `js/data.js` 的 `ic`。

雲端跑；美術總監不開遊戲網頁。
