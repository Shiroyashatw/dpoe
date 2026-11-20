# M2-39 PixelLab 提示詞表（異常狀態圖示）

負責：Game Art Director。畫法與色票鎖在 `specs/M2-36-drawing-rules.md` §5.1 與 `specs/M2-39-status-icons.md` §4（狀態圖示的飽和度跟王印不同：主體可用元素／負向 token，即使 C* > 40 超過 35%；不准再加更飽和的色；`--rar-chase` 不准用）。清點與挑圖見 `specs/M2-39-status-icons.md`。金鑰只讀雲端環境變數 `PIXELLAB_API_KEY`，不准寫進 repo、規格、日誌或 PR 留言。產出放草稿 PR（不合併）。

## 1. 上限與批

- 帳號餘額（2026-11-17 夜 `GET /v2/balance`）約 1138.99 次。先前 120／118.75 是 **M2-36 自設花費上限**，只約束 M2-36，見 `specs/M2-36-pixellab-d2.md`（PR #119）。
- **M2-39 上限 100 次**（mumi 經幕僚長批准）。約 1 次／張。計畫 96 次，備用 4 次給不過 §5 的重跑；不得開第二輪大量重跑，除非再批。
- 批：
  1. **佇列 32**：40 張，`/create-image-pixflux`，無手繪底。適應只做 `ad` 火焰版，冰／雷用零成本 `recolor`。
  2. **佇列 16**：40 張，`/create-image-bitforge`，init＝該 id 剛過檢查的 32（最近鄰縮到 16 後再送，`init_image_strength` 300）。
  3. **優先 32**：16 張，等 mumi 挑完 16 的手繪再跑；`/create-image-pixflux`，init＝定稿 16 最近鄰放大到 30×30、外加 1 px `--scene-void` 描邊與 1 px 透明邊，`init_image_strength` 150。
- 每 id、每尺寸各 1 張候選。檔名 `ail_<id>_<16|32>-s<seed>.png`，旁邊存同名 `.json`（request 去掉 base64、usage）。輸出目錄 `art/icons/ailment/ail_<id>_16/`、`art/icons/ailment/ail_<id>_32/`。

## 2. 呼叫方式

沿用 `tools/pixellab_batch.py`（`specs/M2-36-pixellab-d2.md`（PR #119） §2），只改上限與工作表：

- 16 用 bitforge（有 `negative_description`）；32 用 pixflux（不要的東西寫在 description 的 `no …`）。
- `color_image`＝把該列 `palette` 的 token 值排成 1 列的 PNG。token 值從 `specs/M2-36-palette-tokens.md` 換，規格不寫色碼。
- 跑前預覽（不加 `--go`），一次最多 5 張；每批前在雲端 `GET /v2/balance`。記的是 **本工項已花**（從 0 起算，不含 M2-36 的 118.75）：**已花＋這批張數 > 100 就停**。
- 不准在終端、日誌、JSON、PR 留言或文件印出或寫入金鑰。
- `--repost` 與 `recolor` 不花生成。適應的 `ad_cold`、`ad_light`：把 `ad` 火焰版主體 `--el-fire` 換成 `--el-cold`／`--el-light`。

### 2.1 共用 body

32（pixflux）：

```json
{"description":"game status icon, flat front view, <silhouette>, centred, fills the canvas, light from the top-left, bold simple shapes readable at small size, 1 pixel transparent margin, 1 pixel black outline, no perspective, no isometric, no 3D, no face, no eyes unless the silhouette is an eye, no text, no characters, no background, no dithering, no gradient, no <the shapes this must not be>","image_size":{"width":32,"height":32},"view":"side","outline":"single color black outline","shading":"medium shading","detail":"low detail","no_background":true}
```

16（bitforge）：

```json
{"description":"tiny 16 pixel game status icon, flat front view, <silhouette>, bold, 1 pixel black outline, no transparent margin","negative_description":"blurry, anti-aliasing, gradient, text, background, noise, perspective, isometric, 3D, face, dithering","image_size":{"width":16,"height":16},"no_background":true}
```

`<silhouette>` 用下表 description。`no <…>` 把「不是／不要」那句一併寫進 32 的 description。

## 3. 工作表

init 欄：`定稿手繪 16 放大`＝第 3 批；寫了另一個 id＝第 2 批用該 id 過關 32 當家族參考也可，但仍以「自己的過關 32」為準；`—`＝第 1 批無 init。

### 3.1 佇列 40（第 1 批 32 的 seed0＝3901 起；第 2 批 16 的 seed0＝4001 起，同一列 +100）

| id | 名 | 角色 | init | seed0 | palette | description |
| --- | --- | --- | --- | --- | --- | --- |
| `scorch` | 焦灼 | 減益／火 | `ign` | 3901 | `--scene-void`、`--hp`、`--el-fire`、`--warn` | a cracked ember disc, fire resistance dropping, not a rising flame |
| `brittle` | 易碎 | 減益／冰 | `frozen` | 3902 | `--scene-void`、`--el-cold`、`--tx-strong`、`--mp` | a cracked ice shard ready to break, not a solid cube and not a snowflake |
| `sap` | 殘喘 | 減益／雷 | `shock` | 3903 | `--scene-void`、`--el-light`、`--tx-dim` | a fading, shortened lightning bolt losing strength, not a full zigzag and not a ring |
| `broken` | 完全破甲 | 減益／物理 | — | 3904 | `--scene-void`、`--border`、`--border-mid`、`--tx-strong`、`--bad` | a shield split into two halves with a gap down the middle |
| `parried` | 受招架 | 減益／物理 | — | 3905 | `--scene-void`、`--border`、`--tx-strong`、`--bad` | a blade deflected by a short guard, two shapes crossing, not a full shield |
| `intim` | 威嚇 | 減益 | — | 3906 | `--scene-void`、`--bad`、`--hp`、`--tx-dim` | a downward pressure mark, a heavy chevron pressing from above, not a face, not a skull |
| `counter` | 反擊狀態 | 正面 | — | 3907 | `--scene-void`、`--good`、`--border`、`--tx-strong` | a blade pointing back, a small riposte hook, positive stance, not a shield |
| `seal` | seal | 正面／層數 | — | 3908 | `--scene-void`、`--border-mid`、`--border-cap`、`--tx-strong` | two concentric rounded squares expanding outward, a stack of rings, not a lock, not a crossed sword |
| `revive` | 復甦 | 正面 | — | 3909 | `--scene-void`、`--good`、`--tx-strong`、`--panel-inset` | a small spirit rising from a floor mark, upward spark over a short base |
| `mark` | mark | 減益 | — | 3910 | `--scene-void`、`--bad`、`--tx-strong` | a simple hunt reticle, a square bracket around a centre dot, not an eye |
| `fury` | 無縛之怒 | 資源／正面 | `rage` | 3911 | `--scene-void`、`--awk`、`--el-fire`、`--el-light` | an elemental swirl orb with a rising spike, not the solid red rage orb |
| `ad` | 適應 | 正面／元素 | — | 3912 | `--scene-void`、`--border`、`--border-mid`、`--el-fire`、`--tx-strong` | a small guard plate with one elemental pip in the centre; generate the fire pip first |
| `tail` | 流順之風 | 正面 | — | 3913 | `--scene-void`、`--tx-strong`、`--good`、`--tx-dim` | three short wind barbs flowing to the right, a sash of air, not a flame |
| `crush` | 壓碎 | 減益／物理 | — | 3914 | `--scene-void`、`--border`、`--border-mid`、`--tx-strong` | a downward hammer or compacting stone pressing a flat block, not a book |
| `shatter` | 破碎護甲 | 減益／物理 | — | 3915 | `--scene-void`、`--border`、`--border-mid`、`--bad`、`--tx-strong` | a shield with a hole punched through it, still in one piece, not fully split |
| `riven` | 碎甲 | 正面／物理 | — | 3916 | `--scene-void`、`--border-mid`、`--tx-strong`、`--good` | armor plates peeling apart to the sides, an opening for a follow-up hit |
| `unbr` | 卸防姿態 | 正面／物理 | — | 3917 | `--scene-void`、`--border-mid`、`--border-cap`、`--tx-strong` | an open, lowered guard, a shield tilted down, not a locked shield |
| `daze` | 目眩 | 減益／控制 | `stun` | 3918 | `--scene-void`、`--warn`、`--tx-strong` | a tight spiral of two skewed diamonds, dizzy, not three separate orbiting stars |
| `crip` | 完全跛行 | 減益 | — | 3919 | `--scene-void`、`--bad`、`--border`、`--tx-dim` | a foot or boot with a slash across it, movement broken, not a snowflake, not a weight |
| `stain` | 血漬 | 減益／物理 | `bleed` | 3920 | `--scene-void`、`--hp`、`--bad` | an irregular blood blot on the ground, a stain, not three falling droplets |
| `inc` | 切割 | 減益／物理 | — | 3921 | `--scene-void`、`--el-phys`、`--bad`、`--border` | two or three stacked slash marks, cut layers, not a blood drop |
| `cb` | 腐化之血 | 減益／混沌 | `bleed` | 3922 | `--scene-void`、`--hp`、`--el-chaos`、`--panel-inset` | a dark blood tendril curling, corruption, not a clean droplet and not a poison diamond |
| `anemia` | 缺血 | 減益 | `bleed` | 3923 | `--scene-void`、`--hp`、`--tx-dim`、`--bad` | a hollow, empty droplet outline, drained, not a filled blood drop |
| `petr` | 石化 | 減益／控制 | — | 3924 | `--scene-void`、`--border`、`--border-mid`、`--tx-dim` | a small standing stone figure or upright rock body, cannot move, not a horn |
| `calm` | 平靜 | 減益 | — | 3925 | `--scene-void`、`--mp`、`--el-cold`、`--tx-strong` | a still, closed circle, silence, damage at zero, not a shield badge |
| `weak` | 虛弱 | 減益 | — | 3926 | `--scene-void`、`--tx-dim`、`--bad`、`--border` | a downward chevron or wilted bar, weakened, not a fist, not a flame |
| `taunt` | 嘲諷 | 減益 | — | 3927 | `--scene-void`、`--warn`、`--bad`、`--tx-strong` | a pointing mark forcing focus, a hook toward the centre, not a reticle |
| `easy` | 易攻目標 | 減益 | — | 3928 | `--scene-void`、`--bad`、`--tx-strong`、`--border` | a target disc with one arrow stuck in it, a vulnerable mark, not a hunt reticle |
| `over` | 超重 | 減益 | — | 3929 | `--scene-void`、`--border`、`--border-mid`、`--tx-dim` | a heavy weight or anvil block, stacked mass, not a snowflake, not a slashed foot |
| `vine` | 緩速藤蔓 | 減益 | — | 3930 | `--scene-void`、`--asc`、`--good`、`--panel-inset` | a vine wrapping in a hook, plant coils, not a poison diamond, not a shield |
| `oiled` | 被油纏身 | 減益 | — | 3931 | `--scene-void`、`--warn`、`--border-mid`、`--panel-inset` | a slick oil blob with a short drip, brown-gold oil, not a flame, not a water drop |
| `chg_e` | 耐力球 | 資源 | — | 3932 | `--scene-void`、`--hp`、`--bad`、`--border-cap` | a small ringed orb with a tiny shield pip, endurance charge, not the solid rage orb |
| `chg_f` | 狂怒球 | 資源 | — | 3933 | `--scene-void`、`--good`、`--asc`、`--tx-strong` | a small ringed orb with a tiny wing or dash pip, frenzy charge, green, not a red orb |
| `chg_p` | 暴擊球 | 資源 | — | 3934 | `--scene-void`、`--awk`、`--rar-magic`、`--tx-strong` | a small ringed orb with a tiny star pip, power charge, cool colour, not a stun star cluster |
| `sac` | 捨身突襲 | 正面 | — | 3935 | `--scene-void`、`--good`、`--tx-strong`、`--border` | a rushing chevron with short speed lines, a charge forward, not a wind sash |
| `cu_enfeeble` | 衰弱 | 減益／詛咒 | `curse` | 3936 | `--scene-void`、`--el-chaos`、`--tx-dim`、`--tx-strong` | the curse diamond family with a drooping bar inside, enfeeble, not a plain plus |
| `cu_eleweak` | 元素要害 | 減益／詛咒 | `curse` | 3937 | `--scene-void`、`--el-chaos`、`--el-fire`、`--el-cold`、`--el-light` | the curse diamond family with three tiny elemental pips, not a sun, not a flame |
| `cu_tchains` | 時空鎖鏈 | 減益／詛咒 | `curse` | 3938 | `--scene-void`、`--el-chaos`、`--border-mid`、`--tx-strong` | the curse diamond family with a short chain link, not a vine |
| `cu_vuln` | 脆弱 | 減益／詛咒 | `curse` | 3939 | `--scene-void`、`--el-chaos`、`--border`、`--tx-strong` | the curse diamond family with a cracked plate inside, armor down, not a split shield |
| `cu_despair` | 絕望 | 減益／詛咒 | `curse` | 3940 | `--scene-void`、`--el-chaos`、`--awk`、`--panel-inset` | the curse diamond family with a small wilted mark inside, not the wither flower itself |

### 3.2 優先 16 的獨立 32（第 3 批，seed0＝4101 起；16 手繪不生成）

| id | 名 | 角色 | init | seed0 | palette | description |
| --- | --- | --- | --- | --- | --- | --- |
| `ign` | 點燃 | 減益／火 | 定稿手繪 16 放大 | 4101 | `--scene-void`、`--hp`、`--el-fire`、`--border-cap` | a single rising teardrop flame with a dark core, centred, bold, readable at 16 pixels |
| `bleed` | 流血 | 減益／物理 | 定稿手繪 16 放大 | 4102 | `--scene-void`、`--hp`、`--bad`、`--border-cap` | three blood droplets, two small at the top and one larger below, not a single drop |
| `poison` | 中毒 | 減益／混沌 | 定稿手繪 16 放大 | 4103 | `--scene-void`、`--panel-inset`、`--el-chaos`、`--awk`、`--tx-strong` | a diamond-shaped vial droplet with one small bubble, not a teardrop and not three drops |
| `chill` | 冰緩 | 減益／冰 | 定稿手繪 16 放大 | 4104 | `--scene-void`、`--el-cold`、`--tx-strong` | an open six-point snowflake, thin arms connected at the centre, not a solid block |
| `frozen` | 冰凍 | 減益／冰 | 定稿手繪 16 放大 | 4105 | `--scene-void`、`--el-cold`、`--tx-strong` | a solid ice cube with one inner crack and a bright corner highlight, not a snowflake |
| `shock` | 感電 | 減益／雷 | 定稿手繪 16 放大 | 4106 | `--scene-void`、`--el-light`、`--tx-strong` | a single bold zigzag lightning bolt from top-right to bottom-left, not inside a ring |
| `elc` | 觸電 | 減益／雷 | 定稿手繪 16 放大 | 4107 | `--scene-void`、`--el-light`、`--tx-strong` | a lightning bolt inside a hollow ring, the ring must stay readable, not a bare bolt |
| `stun` | 暈眩 | 減益／控制 | 定稿手繪 16 放大 | 4108 | `--scene-void`、`--warn`、`--tx-strong` | three small four-point stars arranged in a triangle, circling a hidden centre |
| `wither` | 凋零 | 減益／混沌 | 定稿手繪 16 放大 | 4109 | `--scene-void`、`--el-chaos`、`--awk`、`--panel-inset` | a drooping three-petal wilted flower on a thin stem, hanging downward |
| `blind` | 致盲 | 減益 | 定稿手繪 16 放大 | 4110 | `--scene-void`、`--tx-strong`、`--panel-inset`、`--bad` | a front-view eye with a bold diagonal slash across it, not a plain circle |
| `exp` | 曝曬 | 減益／元素 | 定稿手繪 16 放大 | 4111 | `--scene-void`、`--warn`、`--el-fire`、`--tx-strong` | a small sun with short rays and a horizontal bar through the centre, not a flame |
| `curse` | 詛咒 | 減益／詛咒 | 定稿手繪 16 放大 | 4112 | `--scene-void`、`--el-chaos`、`--tx-strong` | a solid diamond sigil with a bright plus in the centre, not an eye, not a square block |
| `rage` | 盛怒 | 資源／正面 | 定稿手繪 16 放大 | 4113 | `--scene-void`、`--bad`、`--hp`、`--border-cap` | a filled round red orb with a small highlight, not a teardrop and not a flame |
| `wet` | 濕透 | 減益／冰雷 | 定稿手繪 16 放大 | 4114 | `--scene-void`、`--el-cold`、`--mp`、`--tx-strong` | a water droplet sitting above a short puddle, not three blood drops |
| `pin` | 釘身 | 減益／控制 | 定稿手繪 16 放大 | 4115 | `--scene-void`、`--border`、`--border-mid`、`--tx-strong` | a vertical stake with a short crossbar, planted upright, bold silhouette |
| `cons` | 奉獻地面 | 正面／地面 | 定稿手繪 16 放大 | 4116 | `--scene-void`、`--border`、`--border-mid`、`--tx-strong`、`--good` | a small stone stele tablet with a tiny green glow only on the top, not a bottle or a cross |

`seal`、`mark` 規格與檔名只用 id；畫面名稱跟數值設計師的用語表走。

## 4. 後處理

沿用 `pixellab_batch.py` 的 `post`：

- 全部：`alpha_binary`（alpha ≥ 128 → 255，其餘 → 0；不透明像素取 palette 最近色）。
- 適應冰／雷：`recolor` 如上，不花生成。
- 不要對狀態圖示跑地板／牆的 `floor_shift`、`wall_shift`、`face_shift`。

## 5. 收圖檢查（`tools/asset_check.py`，每張一列 csv，不過的不進對照、不給 mumi 看）

| 項 | 量 | 通過 | 不過 |
| --- | --- | --- | --- |
| 色票偏移 | 不透明像素對 palette 最近色 ΔE2000 | ΔE > 3 的 ≤ 5%、最大 ≤ 10；後處理後 100% palette 色 | 重跑或 `alpha_binary` |
| 圖示雜點 | 8 鄰沒有同類的不透明像素（類：描邊暗、中、主體亮／角色色） | ≤ 3% | 手修或備用重跑 |
| 圖示棋盤 | 不透明 2×2「a b／b a」交錯格數 | 16：≤ 6；32 只回報 | 16 不過則備用重跑 |
| 飽和 | 非角色 token 出現 C* > 40 | 0（主體角色 token 不受 35% 上限） | 換掉多出的色 |
| `--rar-chase` | 橙色追逐色 | 0 | 退回 |
| 灰階剪影 | 同尺寸全部過關圖轉灰階並排，兩兩能分；優先 16 還要跟手繪 16 是同一家族 | 目視＋對照圖 | 退回重跑 |
| 放大 | 不開平滑放大測試（F §12） | 通過 | 退回 |

冰緩類雪花尖端雜點可到約 5.5%，與手繪例外相同，只限雪花／細尖造型。

## 6. 交付

- 過檢查的候選拼成 4 倍對照（每枚：彩 4 倍＋1 倍、灰階 4 倍＋1 倍；佇列還要同尺寸互相並排灰階）。推到草稿 PR（不合併），並在 PR 留一則結束留言（對照路徑、已花／上限、不過的 id、適應 recolor 結果）。
- 美術總監只看過檢查的圖；mumi 挑圖另開或沿用 Page。優先 16 的手繪仍在挑圖 Page，32 候選等挑完再附。
- 雲端跑、美術總監不開遊戲網頁。不要把金鑰寫進 PR、檔案或留言。
