# M2-36 PixelLab 提示詞表（地磚、招牌特效、王印）

Page：https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/4ac24fae-bc0a-4d94-a78d-b09213a2791c（「PixelLab 提示詞表」一節）
負責：Game Art Director。怎麼畫見 `specs/M2-36-drawing-rules.md`；色值來自 `specs/M2-36-palette-tokens.md`（下面的色碼都是 token 值）。金鑰只讀環境變數 `PIXELLAB_API_KEY`，不進 repo。所有產出先放分支，不直接進遊戲；mumi 只挑圖。

## 1. 兩張試圖的評語（PR #40，6ba1f2d）
| | 地磚 tile-temple-1794913854（pixflux 64×64、4 色 color_image） | 特效 fx-shieldhit（/vfx lite、64×64、8 幀） |
| --- | --- | --- |
| 色票偏移 | 0：只用了 4 個 temple token，ΔE 0。**color_image 真的會鎖色**，地磚和圖示都走 pixflux | 9 個冷灰，C* ≤ 8，沒有飽和色；/vfx 不能鎖色，只能靠提示詞 |
| 像素格、反鋸齒 | 不透明、沒有過渡色；但 64 px 放進 48 世界 px 是 0.75 世界 px／像素，比主角細太多 → 改 32 | alpha 只有 0／255，沒有反鋸齒、沒有黑邊 → 合格 |
| 亮度 | **不合格**：`-light` 38.5%、`-mid` 29.1%，平均 L* 31.7；面板對它只有 0.68:1（要 ≥ 1.4），(d) 中明度褐色也會爆 | — |
| 雜點 | 孤立像素 7.6%（上限 2%），看起來像抖色 | — |
| 接縫 | **不合格**：接縫色差 227，磚內相鄰平均 64；2×2 拼起來看得到格線。pixflux 不保證無縫 | — |
| 可讀性 | 石板造型好，「舊地圖」感有出來，但亮、碎，會搶角色 | 盾牌是一團平的灰橢圓，只有第 2–3 幀的白火花有打擊感；招牌特效要更大的形狀變化 |
| 費用 | 1 次生成 | 報價 1，實收 1.76（超時加收）→ 預算要抓 ×1.8 |

**結論**：地磚與王印都用 `POST /v2/create-image-pixflux`＋`color_image`（已驗證）。地板只給 3 色（拿掉 `-light`），再做「明度排名重配」（§5），保證亮度；多產幾張、用接縫檢查淘汰。特效照 `vfx_gen.py` 的 /vfx 流程。

## 2. 呼叫方式（照 PR #40 的 tools/pixellab_batch.py）
- 同步回應：`POST https://api.pixellab.ai/v2/create-image-pixflux`、`/create-image-bitforge`，Bearer 驗證；回應 `image.base64` 存 PNG。`color_image` = `{"type":"base64","base64":<把 palette 色碼排成 1 列的 PNG>}`（PR #40 的 `png()`）。
- pixflux 的 `negative_description` 已淘汰，所以「不要的東西」寫在 description 的 `no …`；bitforge 才有 `negative_description`。pixflux 最小 32×32 的面積，所以 16 的圖示用 bitforge。
- 種子：第 k 張用 `seed0 + k`（k 從 0），重跑結果一樣。檔名 `<id>-s<seed>.png`，旁邊存同名 `.json`（endpoint、request 去掉 base64、response 的 usage）。
- 先不加 `--go` 預覽、一次最多 5 張的規則照舊；跑前後 `GET /v2/balance` 記用量。
- 工程要做：把 `pixellab_batch.py` 改成讀下面 §3 的 JSON（`--job <id>`、`--all`），加 §5 的後處理；`vfx_gen.py` 加 `--doc` 參數讀 §4（預設不變，它的自我檢查綁 `docs/特效提示詞.md` 的 34 筆）。

## 3. 地磚與王印的工作表（直接讀這段 JSON）
欄位：`n` 張數、`seed0` 起始種子、`body` 原樣送出（再加 `seed`、`color_image`）、`palette` 做 color_image 的色碼、`post` 後處理、`out` 輸出資料夾、`after` 要等哪一項先挑好。

```json
[
{"id":"tile_temple_floor","endpoint":"/create-image-pixflux","n":6,"seed0":1101,"body":{"description":"seamless tileable floor tile, flat top-down, worn wooden floor boards of an abandoned temple hall, long horizontal planks with staggered seams, almost entirely one flat very dark tone, seams and cracks in the darkest tone, tiny worn highlights only on a few corners, faded old map feel, no objects, no characters, no text, no border, no noise, no dithering","image_size":{"width":32,"height":32},"view":"high top-down","outline":"lineless","shading":"flat shading","detail":"low detail","no_background":false},"palette":["#120700","#1d1203","#4b3b2b"],"post":"floor_remap","out":"art/tiles/temple/floor/"},
{"id":"tile_temple_walltop","endpoint":"/create-image-pixflux","n":4,"seed0":1111,"body":{"description":"seamless tileable wall top tile, flat top-down, top of a thick temple wall seen from above, a heavy timber beam cap with a carved edge, light from the top-left, lit edge on the top-left only, no objects, no text, no border, no dithering","image_size":{"width":32,"height":32},"view":"high top-down","outline":"lineless","shading":"basic shading","detail":"low detail","no_background":false},"palette":["#120700","#1d1203","#4b3b2b","#7c644c"],"post":"none","out":"art/tiles/temple/walltop/"},
{"id":"tile_temple_wallface","endpoint":"/create-image-pixflux","n":4,"seed0":1121,"body":{"description":"horizontally seamless wall strip, straight-on front view, front face of a temple wall, dark timber panels above a plaster band, dark, light from the top-left, darkest at the bottom where it meets the floor, no objects, no text, no border, no dithering","image_size":{"width":64,"height":18},"view":"side","outline":"lineless","shading":"basic shading","detail":"low detail","no_background":false},"palette":["#120700","#1d1203","#4b3b2b","#7c644c"],"post":"split_2x32","out":"art/tiles/temple/wallface/"},
{"id":"tile_lava_floor","endpoint":"/create-image-pixflux","n":6,"seed0":1201,"body":{"description":"seamless tileable floor tile, flat top-down, basalt flagstones of a dungeon near lava, large square slabs with thin seams and hairline cracks, almost entirely one flat very dark tone, seams and cracks in the darkest tone, tiny worn highlights only on a few corners, faded old map feel, no objects, no characters, no text, no border, no noise, no dithering","image_size":{"width":32,"height":32},"view":"high top-down","outline":"lineless","shading":"flat shading","detail":"low detail","no_background":false},"palette":["#150500","#211007","#52372e"],"post":"floor_remap","out":"art/tiles/lava/floor/"},
{"id":"tile_lava_walltop","endpoint":"/create-image-pixflux","n":4,"seed0":1211,"body":{"description":"seamless tileable wall top tile, flat top-down, top of a thick basalt dungeon wall seen from above, rough block cap, light from the top-left, lit edge on the top-left only, no objects, no text, no border, no dithering","image_size":{"width":32,"height":32},"view":"high top-down","outline":"lineless","shading":"basic shading","detail":"low detail","no_background":false},"palette":["#150500","#211007","#52372e","#865f51"],"post":"none","out":"art/tiles/lava/walltop/"},
{"id":"tile_lava_wallface","endpoint":"/create-image-pixflux","n":4,"seed0":1221,"body":{"description":"horizontally seamless wall strip, straight-on front view, front face of a basalt dungeon wall, stacked rough blocks, dark, light from the top-left, darkest at the bottom where it meets the floor, no objects, no text, no border, no dithering","image_size":{"width":64,"height":18},"view":"side","outline":"lineless","shading":"basic shading","detail":"low detail","no_background":false},"palette":["#150500","#211007","#52372e","#865f51"],"post":"split_2x32","out":"art/tiles/lava/wallface/"},
{"id":"tile_tomb_floor","endpoint":"/create-image-pixflux","n":6,"seed0":1301,"body":{"description":"seamless tileable floor tile, flat top-down, old tomb floor of long stone bricks in running bond with faint moss stains, almost entirely one flat very dark tone, seams and cracks in the darkest tone, tiny worn highlights only on a few corners, faded old map feel, no objects, no characters, no text, no border, no noise, no dithering","image_size":{"width":32,"height":32},"view":"high top-down","outline":"lineless","shading":"flat shading","detail":"low detail","no_background":false},"palette":["#0c0900","#171507","#413e2d"],"post":"floor_remap","out":"art/tiles/tomb/floor/"},
{"id":"tile_tomb_walltop","endpoint":"/create-image-pixflux","n":4,"seed0":1311,"body":{"description":"seamless tileable wall top tile, flat top-down, top of a thick tomb wall seen from above, worn stone coping blocks, light from the top-left, lit edge on the top-left only, no objects, no text, no border, no dithering","image_size":{"width":32,"height":32},"view":"high top-down","outline":"lineless","shading":"basic shading","detail":"low detail","no_background":false},"palette":["#0c0900","#171507","#413e2d","#6d6950"],"post":"none","out":"art/tiles/tomb/walltop/"},
{"id":"tile_tomb_wallface","endpoint":"/create-image-pixflux","n":4,"seed0":1321,"body":{"description":"horizontally seamless wall strip, straight-on front view, front face of a tomb wall, stacked stone bricks with a plinth, dark, light from the top-left, darkest at the bottom where it meets the floor, no objects, no text, no border, no dithering","image_size":{"width":64,"height":18},"view":"side","outline":"lineless","shading":"basic shading","detail":"low detail","no_background":false},"palette":["#0c0900","#171507","#413e2d","#6d6950"],"post":"split_2x32","out":"art/tiles/tomb/wallface/"},
{"id":"tile_ice_floor","endpoint":"/create-image-pixflux","n":6,"seed0":1401,"body":{"description":"seamless tileable floor tile, flat top-down, ice cave floor of big frosted stone slabs with thin frost cracks, almost entirely one flat very dark tone, seams and cracks in the darkest tone, tiny worn highlights only on a few corners, faded old map feel, no objects, no characters, no text, no border, no noise, no dithering","image_size":{"width":32,"height":32},"view":"high top-down","outline":"lineless","shading":"flat shading","detail":"low detail","no_background":false},"palette":["#010b0d","#0a1619","#304044"],"post":"floor_remap","out":"art/tiles/ice/floor/"},
{"id":"tile_ice_walltop","endpoint":"/create-image-pixflux","n":4,"seed0":1411,"body":{"description":"seamless tileable wall top tile, flat top-down, top of a thick ice cave wall seen from above, frosted rock cap, light from the top-left, lit edge on the top-left only, no objects, no text, no border, no dithering","image_size":{"width":32,"height":32},"view":"high top-down","outline":"lineless","shading":"basic shading","detail":"low detail","no_background":false},"palette":["#010b0d","#0a1619","#304044","#536c72"],"post":"none","out":"art/tiles/ice/walltop/"},
{"id":"tile_ice_wallface","endpoint":"/create-image-pixflux","n":4,"seed0":1421,"body":{"description":"horizontally seamless wall strip, straight-on front view, front face of an ice cave wall, layered frosted rock, dark, light from the top-left, darkest at the bottom where it meets the floor, no objects, no text, no border, no dithering","image_size":{"width":64,"height":18},"view":"side","outline":"lineless","shading":"basic shading","detail":"low detail","no_background":false},"palette":["#010b0d","#0a1619","#304044","#536c72"],"post":"split_2x32","out":"art/tiles/ice/wallface/"},
{"id":"wangyin_zhenyue_32","endpoint":"/create-image-pixflux","n":4,"seed0":2101,"body":{"description":"game item icon, an ancient square bronze king seal with a small beast-shaped knob on top, a stylised mountain peak with three summits carved on the seal face, steady and heavy, the carved face glows orange, centred, fills the canvas, light from the top-left, bold simple shapes readable at small size, no text, no characters, no background, no dithering, no gradient","image_size":{"width":32,"height":32},"view":"high top-down","outline":"single color black outline","shading":"medium shading","detail":"medium detail","no_background":true},"palette":["#0d0a07","#24211e","#554f48","#a38e6b","#e3d6bb","#251c13","#f69625","#ffbf73","#f7f0e5"],"post":"alpha_binary","out":"art/icons/wangyin/wangyin_zhenyue/"},
{"id":"wangyin_zhenyue_16","endpoint":"/create-image-bitforge","n":2,"seed0":2105,"after":"wangyin_zhenyue_32","body":{"description":"tiny 16 pixel game icon of a square bronze seal, a stylised mountain peak with three summits, glowing orange face, bold, 1 pixel black outline","negative_description":"blurry, anti-aliasing, gradient, text, background, noise","image_size":{"width":16,"height":16},"no_background":true,"init_image":"<picked 32 縮成 16（最近鄰）>","init_image_strength":300},"palette":["#0d0a07","#24211e","#554f48","#a38e6b","#e3d6bb","#251c13","#f69625","#ffbf73","#f7f0e5"],"post":"alpha_binary","out":"art/icons/wangyin/wangyin_zhenyue/"},
{"id":"wangyin_chixiao_32","endpoint":"/create-image-pixflux","n":4,"seed0":2111,"body":{"description":"game item icon, an ancient square bronze king seal with a small beast-shaped knob on top, an upright sword wrapped in a rising flame carved on the seal face, the carved face glows orange, centred, fills the canvas, light from the top-left, bold simple shapes readable at small size, no text, no characters, no background, no dithering, no gradient","image_size":{"width":32,"height":32},"view":"high top-down","outline":"single color black outline","shading":"medium shading","detail":"medium detail","no_background":true},"palette":["#0d0a07","#24211e","#554f48","#a38e6b","#e3d6bb","#251c13","#f69625","#ffbf73","#ee9978"],"post":"alpha_binary","out":"art/icons/wangyin/wangyin_chixiao/"},
{"id":"wangyin_chixiao_16","endpoint":"/create-image-bitforge","n":2,"seed0":2115,"after":"wangyin_chixiao_32","body":{"description":"tiny 16 pixel game icon of a square bronze seal, an upright sword wrapped in a rising flame, glowing orange face, bold, 1 pixel black outline","negative_description":"blurry, anti-aliasing, gradient, text, background, noise","image_size":{"width":16,"height":16},"no_background":true,"init_image":"<picked 32 縮成 16（最近鄰）>","init_image_strength":300},"palette":["#0d0a07","#24211e","#554f48","#a38e6b","#e3d6bb","#251c13","#f69625","#ffbf73","#ee9978"],"post":"alpha_binary","out":"art/icons/wangyin/wangyin_chixiao/"},
{"id":"wangyin_jiting_32","endpoint":"/create-image-pixflux","n":4,"seed0":2121,"body":{"description":"game item icon, an ancient square bronze king seal with a small beast-shaped knob on top, a single zigzag lightning bolt carved on the seal face, sharp and fast, the carved face glows orange, centred, fills the canvas, light from the top-left, bold simple shapes readable at small size, no text, no characters, no background, no dithering, no gradient","image_size":{"width":32,"height":32},"view":"high top-down","outline":"single color black outline","shading":"medium shading","detail":"medium detail","no_background":true},"palette":["#0d0a07","#24211e","#554f48","#a38e6b","#e3d6bb","#251c13","#f69625","#ffbf73","#f3f9a4"],"post":"alpha_binary","out":"art/icons/wangyin/wangyin_jiting/"},
{"id":"wangyin_jiting_16","endpoint":"/create-image-bitforge","n":2,"seed0":2125,"after":"wangyin_jiting_32","body":{"description":"tiny 16 pixel game icon of a square bronze seal, a single zigzag lightning bolt, glowing orange face, bold, 1 pixel black outline","negative_description":"blurry, anti-aliasing, gradient, text, background, noise","image_size":{"width":16,"height":16},"no_background":true,"init_image":"<picked 32 縮成 16（最近鄰）>","init_image_strength":300},"palette":["#0d0a07","#24211e","#554f48","#a38e6b","#e3d6bb","#251c13","#f69625","#ffbf73","#f3f9a4"],"post":"alpha_binary","out":"art/icons/wangyin/wangyin_jiting/"},
{"id":"wangyin_guixu_32","endpoint":"/create-image-pixflux","n":4,"seed0":2131,"body":{"description":"game item icon, an ancient square bronze king seal with a small beast-shaped knob on top, a spiral whirlpool sinking into the centre carved on the seal face, the carved face glows orange, centred, fills the canvas, light from the top-left, bold simple shapes readable at small size, no text, no characters, no background, no dithering, no gradient","image_size":{"width":32,"height":32},"view":"high top-down","outline":"single color black outline","shading":"medium shading","detail":"medium detail","no_background":true},"palette":["#0d0a07","#24211e","#554f48","#a38e6b","#e3d6bb","#251c13","#f69625","#ffbf73","#83aaf2"],"post":"alpha_binary","out":"art/icons/wangyin/wangyin_guixu/"},
{"id":"wangyin_guixu_16","endpoint":"/create-image-bitforge","n":2,"seed0":2135,"after":"wangyin_guixu_32","body":{"description":"tiny 16 pixel game icon of a square bronze seal, a spiral whirlpool sinking into the centre, glowing orange face, bold, 1 pixel black outline","negative_description":"blurry, anti-aliasing, gradient, text, background, noise","image_size":{"width":16,"height":16},"no_background":true,"init_image":"<picked 32 縮成 16（最近鄰）>","init_image_strength":300},"palette":["#0d0a07","#24211e","#554f48","#a38e6b","#e3d6bb","#251c13","#f69625","#ffbf73","#83aaf2"],"post":"alpha_binary","out":"art/icons/wangyin/wangyin_guixu/"}
]
```

| id | 尺寸 | 色票（token） | 候選 | 誰挑 |
| --- | --- | --- | --- | --- |
| tile_<地形>_floor | 32×32 | `-edge／-ground／-mid` | 6 → 過檢查的前 3 張 | mumi 每種地形挑 1 |
| tile_<地形>_walltop | 32×32 | 4 色 | 4 | mumi 挑 1 |
| tile_<地形>_wallface | 64×18 → 切 2 張 32×18 | 4 色 | 4 | mumi 挑 1 |
| wangyin_<名>_32 | 32×32 透明 | `--scene-void`、`--panel-inset`、`--border`、`--border-mid`、`--border-cap`、`--rar-chase-bg`、`--rar-chase`、`--rar-chase-hi`＋紋樣色 | 4 | mumi 每枚挑 1 |
| wangyin_<名>_16 | 16×16 透明 | 同上 | 2 | Art Director 挑 |

紋樣色：鎮嶽印 `--tx-strong`（山白）、赤霄印 `--el-fire`、疾霆印 `--el-light`、歸墟印 `--rar-magic`（深水藍）。昇華綠、`--bad` 紅、`--act` 不准用在王印。王印 id 照 M2-29：`wangyin_zhenyue`（鎮嶽印，防禦）、`wangyin_chixiao`（赤霄印，傷害）、`wangyin_jiting`（疾霆印，技能速度）、`wangyin_guixu`（歸墟印，續航）。

## 4. 招牌特效（/vfx，vfx_gen.py 的格式）
輸出 `art/fx/<id>/`（vfx_gen.py 預設）。每個 id 跑 3 次（第 2、3 次用 `--force`，舊的會留在 `old/`），lite。挑圖前把 3 張的 gif 排在一起。

每一筆提示詞的開頭都加上這句：

```
pixel art VFX animation, transparent background, no character, no text, no frame, crisp hard-edged pixels, no anti-aliasing, no black outline, low top-down view, dark temple dungeon, few tones per colour, bold shape that changes clearly every frame,
```

### sig_crit｜暴擊｜取代 fxsheets 的 crit
96×96・10 幀・一次
```
critical hit burst at the centre: a sharp four-point star flash in pure white #ffffff with a hard gold rim #ffcf5c, eight thin straight shards shoot outward, one ring expands and breaks apart in frames 3-6, gone by the last frame, no smoke, no lingering glow
```

### sig_lvup｜升級｜主角腳下
128×128・16 幀・一次
```
level up on the floor in the bottom third: a flat ring of warm light #ffe1aa expands outward, six slim vertical rays of off-white #f7f0e5 rise from it, a few pale green #95d24e sparks drift up, everything fades by the last frame, no full-screen flash
```

### sig_beam｜掉寶光柱｜程式依稀有度上色
32×128・8 幀・循環
```
a slim vertical light beam rising from a small glow on the floor at the bottom, white and light grey only, no other colour, edges flicker softly, tiny motes float upward, seamless loop, the beam stays the same width
```

### sig_chase｜追逐掉落｜只給追逐物
128×128・14 幀・一次
```
a heavy treasure drop hitting the floor: an orange #f69625 shock ring bursts outward and a tall orange beam with a pale orange #ffbf73 core and white #ffffff centre shoots up, ember sparks scatter, the beam thins to a thread by the last frame
```

### sig_wyapply｜王印套用｜套到裝備那一下
96×96・12 幀・一次
```
a square bronze stamp presses down at the centre and lifts away, leaving a square glowing orange #f69625 impression that pulses once and fades, small pale orange #ffbf73 sparks pop at its four corners, square shapes only
```

數量：5 個 × 3 次 = 15 張；報價每張 1，預算抓 1.8 → 約 27 次生成。

## 5. 後處理（pixellab_batch.py 的 `post`）
- `floor_remap`：只看明度排名、不看原色：最暗 28% 的像素 → `-edge`，最亮 2% → `-mid`，其他 → `-ground`；同明度保持原本的排列。然後把孤立像素（上下左右都不同色）改成多數鄰居色。
- `split_2x32`：64×18 從中間切成兩張 32×18，各自當一個牆面變體。
- `alpha_binary`：alpha ≥ 128 → 255，其餘 → 0；然後每個不透明像素對 palette 取 CIEDE2000 最近色（記下取代前的最大 ΔE）。
- `none`：不改。

## 6. 收圖檢查（寫成 tools/asset_check.py，每張輸出一列 csv，不過的不給 mumi 看）
| 檢查 | 怎麼量 | 過關 | 對應 |
| --- | --- | --- | --- |
| 色票偏移 | 每個不透明像素對該張 palette 的最近色 ΔE2000（後處理前） | ΔE > 3 的像素 ≤ 5%，最大 ≤ 10；後處理後 100% 是 palette 色 | (c)(d) |
| 像素格 | 尺寸跟工作表一樣；沒有被縮放過（2×2 同色塊 ≤ 60%） | 是 | — |
| 雜色反鋸齒 | 地磚 alpha 全 255；圖示 alpha 只有 0／255；孤立像素 | 地磚 ≤ 2%，圖示 ≤ 4% | — |
| 地板亮度 | 平均相對亮度 ÷ `-ground` 的相對亮度；`-mid` 比例 | ≤ 1.02；`-mid` ≤ 3%、`-light` 0 | (b) |
| 牆亮度 | `-mid`＋`-light` 比例；`-light` 比例 | ≤ 60%；≤ 15% | (d) |
| 接縫 | 左右、上下接縫平均 RGB 色差 ÷ 磚內相鄰平均色差（牆面只算左右） | ≤ 1.2 | — |
| 王印飽和 | C* > 40 像素 ÷ 不透明像素 | ≤ 35% | (c) |
| 王印分辨 | 四枚轉灰階、縮成 16 後兩兩比 | 人眼 1× 看分得出；Art Director 判 | — |
| 特效 | 最大那一幀不透明面積、C* > 40 面積（換成 1280×720 與 390×844 畫面比例）；L* < 15 的像素 | 招牌 ≤ 12%；黑邊 ≤ 5% | (c) |

換進遊戲後再照 `specs/M2-36-palette-tokens.md` 的 (a)–(g) 截圖量（`tools/comfort.py`），樣張要求不變。

## 7. 給 mumi 挑圖
- 過了 §6 的候選，由工程拼成對照圖（地磚：每張 2×2 拼＋放一個主角；王印：32 與 2 倍並排、轉灰階一列；特效：gif 放在 `-ground` 底上），推到分支 `art/m2-36-assets`、開 draft PR，不合併。
- Art Director 把對照圖放到 Page，經幕僚長請 mumi 挑：地磚 12 組（4 地形 × 地板／牆頂／牆面）每組 3–4 張、王印 4 枚每枚 4 張、特效 5 個每個 3 張，共約 75 張、挑 21 次，約 25 分鐘。
- 挑完怎麼接進遊戲（檔案槽、路徑、載入、退回、FXS 寫法）照 `specs/M2-33-3a-scene-assets.md` §3–4：地磚 `img/tiles/<地形>-floor.png` 等；王印拼成 `img/ic_wy32.png`、`img/ic_wy16.png`；特效由 `tools/vfx_sheet.py` 寫進 `js/fxsig.js`（不動自動產生的 `js/fxsheets.js`）。
