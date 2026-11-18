# M2-36 PixelLab 提示詞表（地磚、招牌特效、王印）

Page：https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/4ac24fae-bc0a-4d94-a78d-b09213a2791c（「PixelLab 提示詞表」一節）
負責：Game Art Director。怎麼畫見 `specs/M2-36-drawing-rules.md`；色值只寫 token 名，工具送出前從 `specs/M2-36-palette-tokens.md` 的表換成值。金鑰只讀環境變數 `PIXELLAB_API_KEY`，不進 repo。產出只放分支 `art/m2-36-assets`（draft PR #47，不合併）；mumi 只挑圖。

## 1. 產圖結果與判斷（PR #47）
第 1 輪（0f20108）：88.75／120，104 張、舊規則過 20。第 2 輪（77206be）：新後處理 `--repost` 同一批原圖，加 A 批 14 張，已花 102.75／120；118 張、新規則過 93，再由 Art Director 目視挑成 §6 的候選。B 批（3629d87）：12 張，已花 116.75／120；16 過 5 張、疾霆 32 過 2、歸墟 32 過 1。下表是第 1 輪逐張看圖後的判斷：

| 不過的類別 | 看圖 | 原因 | 修法 |
| --- | --- | --- | --- |
| 地板：暗框、亮邊、2×2 看得到接縫 | 原圖結構都對（石板、木板、磚縫） | PixelLab 把 color_image 當「相對」色票：**最亮那一色變成底色**（地板 `-mid` 56–94%）。舊 `floor_remap` 硬塞 `-edge` 25–33%，逼出大片暗斑和框 | (a) `floor_shift`（§5）；(c) 地板 `-edge` 不設下限（規則檔 §3） |
| 牆頂：`-light` 39–77% | 同樣是最亮色當底色；磚、石蓋板的圖案可用 | 降一階後 `-light` 0、`-mid` 45–79%，舊上限 60% 是錯的：牆頂一定要比 `-ground` 地板亮一階才看得出房間形狀，比 `-ground` 亮的只剩 `-mid` | (a) `wall_shift`；(c) 牆頂 `-mid`＋`-light` ≤ 80%，(d) 改由遊戲截圖把關 |
| 牆頂：冰窟 4 張、temple s1111、lava s1211／s1214 | 畫成側面山形、冰刺剪影、斜放的方塊、條紋 | 提示詞「from above」不夠，模型畫成側視風景 | (b) 冰窟重跑（新提示詞）；不行就零成本 `recolor` |
| 牆面：亮、雜點、接縫 | 原圖可用 | 同上；半張各自判，換邊會有縫 | (a) `face_shift`（降一階＋四欄接縫修正） |
| 王印：45° 立體方塊、寶箱、人臉 | 只有正面平視的「方印牌＋上緣圓環」好看（鎮嶽 s2104、歸墟 s2133、疾霆 s2124） | 提示詞裡的 `high top-down` 和「beast knob」把它變成立體盒子 | (b) 改 `view: side`、正面方印牌、圓環、明寫不要立體與臉；以 s2104 當 init 統一家族 |
| 王印：孤立像素 9–30% | 好看的正面那幾張也不過 | 單色孤立像素量的是陰影階與亮點，10 色有明暗的圖示本來就會多；這條對圖示是錯的 | (c) 改量「材質類別雜點」（§6）：s2104 1.2%、s2133 1.7%、s2124 0.8% |
| 2×2 同色塊 ≤ 60% | 平的地磚本來就大片同色 | 量的是「平」，不是「被放大過」 | (c) 改成精確的放大測試（§6） |
| 特效 15 張 | 暴擊白金星芒、追逐橙環加光柱、光柱白灰可上色，全可用 | — | 不重跑 |

**工程的 6 個偏差**
1. floor_remap 同明度用鄰居亮度拆：**不採用**，`floor_remap` 整個拿掉，換 `floor_shift`。
2. 2×2 檢查改看原圖：**採用**（量 API 原圖才對），但指標換成 §6 的放大測試。
3. 牆面兩半分開判：**採用**亮度、雜點分開判；接縫要四種接法（a｜a、a｜b、b｜a、b｜b）都過，由 `face_shift` 的四欄修正保證；兩半都過，這組才算過。
4. 16 的 init 用「種子最小的過關 32」（實際用了不過的 smallrun）：**不採用**。init 一律用下表 `init_from` 指定的 32（Art Director 推薦、已過檢查）；mumi 挑了別張，該枚 16 重跑 1 張（見 §3）。
5. vfx_gen 自我檢查 34 → 32：**採用**，`docs/特效提示詞.md` 從 28fdbbd 起就是 32 筆，原本寫 34 是錯的。
6. 特效比例假設 1 材質像素 = 1.5 世界 px × ZOOM：**採用**，當保守上限（實際 `fxs` 依 r／rad 縮放，多半更小）；只因這條不過的，改用遊戲截圖跑 `comfort.py` 判。

## 2. 呼叫方式（tools/pixellab_batch.py）
- 同步回應：`POST https://api.pixellab.ai/v2/create-image-pixflux`、`/create-image-bitforge`，Bearer 驗證；回應 `image.base64` 存 PNG。`color_image` = 把 `palette` 的 token 值排成 1 列的 PNG。
- pixflux 的「不要的東西」寫在 description 的 `no …`；bitforge 才有 `negative_description`。16 的圖示用 bitforge。`init_image` 送 base64 PNG，`init_image_strength` 1–999。
- 種子：第 k 張用 `seed0 + k`。檔名 `<id>-s<seed>.png`，旁邊存同名 `.json`（request 去掉 base64、usage）。已跑過的提示詞都在這些 `.json` 裡，本檔不再重抄。
- 跑前預覽（不加 `--go`）、一次最多 5 張；每批前 `GET /v2/balance`：**已花＋這批張數 > 120 就停**。
- 新增 `--repost <job>`：只對 `art/_raw/` 原圖重做 §5 後處理與 §6 檢查，不花生成。

## 3. 重跑工作表（直接讀這段 JSON）
欄位：`n` 張數、`seed0`、`body` 原樣送出（再加 `seed`、`color_image`、`init_image`）、`palette` 是 token 名、`init_from` 是 init 圖（32 先做 `alpha_binary` 後的檔；給 16 時最近鄰縮成 16）、`post`、`out`、`wave`。

```json
[
{"id":"tile_ice_walltop","wave":"A","endpoint":"/create-image-pixflux","n":4,"seed0":1415,"body":{"description":"seamless tileable texture, orthographic view from directly above, the flat top surface of a thick frosted rock wall, irregular flat stone slabs with thin cracks and frost, the pattern fills the whole canvas evenly, light from the top-left, no horizon, no sky, no mountains, no peaks, no spikes, no icicles, no silhouette, no objects, no text, no border, no dithering","image_size":{"width":32,"height":32},"view":"high top-down","outline":"lineless","shading":"basic shading","detail":"low detail","no_background":false},"palette":["--scene-ice-edge","--scene-ice-ground","--scene-ice-mid","--scene-ice-light"],"post":"wall_shift","out":"art/tiles/ice/walltop/"},
{"id":"tile_tomb_floor","wave":"A","endpoint":"/create-image-pixflux","n":2,"seed0":1307,"body":"同 art/_raw/tile_tomb_floor/*-s1301.json 的 body","palette":["--scene-tomb-edge","--scene-tomb-ground","--scene-tomb-mid"],"post":"floor_shift","out":"art/tiles/tomb/floor/"},
{"id":"wangyin_chixiao_32","wave":"A","endpoint":"/create-image-pixflux","n":4,"seed0":2141,"init_from":"wangyin_zhenyue_32-s2104","init_image_strength":150,"body":{"description":"game item icon, flat front view, an ancient square bronze king seal plaque seen straight on, a small round ring loop on the top edge, an upright sword wrapped in a rising flame carved on the plaque face, the carved face glows orange, centred, fills the canvas, light from the top-left, bold simple shapes readable at small size, no perspective, no isometric, no 3D cube, no top face, no side face, no box, no chest, no face, no eyes, no text, no characters, no background, no dithering, no gradient","image_size":{"width":32,"height":32},"view":"side","outline":"single color black outline","shading":"medium shading","detail":"medium detail","no_background":true},"palette":["--scene-void","--panel-inset","--border","--border-mid","--border-cap","--rar-chase-bg","--rar-chase","--rar-chase-hi","--el-fire"],"post":"alpha_binary","out":"art/icons/wangyin/wangyin_chixiao/"},
{"id":"wangyin_zhenyue_32","wave":"A","endpoint":"/create-image-pixflux","n":2,"seed0":2145,"init_from":"wangyin_zhenyue_32-s2104","init_image_strength":150,"body":"同 chixiao，刻紋換成 a stylised mountain peak with three summits","palette":["--scene-void","--panel-inset","--border","--border-mid","--border-cap","--rar-chase-bg","--rar-chase","--rar-chase-hi","--tx-strong"],"post":"alpha_binary","out":"art/icons/wangyin/wangyin_zhenyue/"},
{"id":"wangyin_jiting_32","wave":"A","endpoint":"/create-image-pixflux","n":2,"seed0":2147,"init_from":"wangyin_zhenyue_32-s2104","init_image_strength":150,"body":"同 chixiao，刻紋換成 a single zigzag lightning bolt","palette":["--scene-void","--panel-inset","--border","--border-mid","--border-cap","--rar-chase-bg","--rar-chase","--rar-chase-hi","--el-light"],"post":"alpha_binary","out":"art/icons/wangyin/wangyin_jiting/"},
{"id":"wangyin_<名>_16","wave":"B","endpoint":"/create-image-bitforge","n":2,"seed0":"zhenyue 2151、chixiao 2153、jiting 2155、guixu 2157","init_from":"下表推薦 32","init_image_strength":300,"body":{"description":"tiny 16 pixel game icon, flat front view of a square bronze seal plaque with a small ring loop on top, <刻紋>, glowing orange face, bold, 1 pixel black outline","negative_description":"blurry, anti-aliasing, gradient, text, background, noise, perspective, isometric, 3D, face","image_size":{"width":16,"height":16},"no_background":true},"palette":"同該枚 32","post":"alpha_binary","out":"art/icons/wangyin/wangyin_<名>/"},
{"id":"wangyin_jiting_32","wave":"B","endpoint":"/create-image-pixflux","n":2,"seed0":2149,"init_from":"wangyin_jiting_32-s2124","init_image_strength":150,"body":"同 chixiao，刻紋換成 a single bold zigzag lightning bolt from the top-right corner to the bottom-left corner, sharp angles, no mountains, no peaks, no triangles","palette":"同疾霆 32","post":"alpha_binary","out":"art/icons/wangyin/wangyin_jiting/"},
{"id":"wangyin_guixu_32","wave":"B","endpoint":"/create-image-pixflux","n":2,"seed0":2161,"init_from":"wangyin_guixu_32-s2133","init_image_strength":150,"body":"同 chixiao，刻紋換成 a spiral whirlpool with three curved arms swirling into the centre, not concentric rings","palette":["--scene-void","--panel-inset","--border","--border-mid","--border-cap","--rar-chase-bg","--rar-chase","--rar-chase-hi","--rar-magic"],"post":"alpha_binary","out":"art/icons/wangyin/wangyin_guixu/"}
]
```

刻紋：鎮嶽 a stylised mountain peak with three summits（紋樣色 `--tx-strong`）、赤霄 an upright sword wrapped in a rising flame（`--el-fire`）、疾霆 a single zigzag lightning bolt（`--el-light`）、歸墟 a spiral whirlpool sinking into the centre（`--rar-magic`）。昇華綠、`--bad` 紅、`--act` 不准用在王印。id 照 M2-29：`wangyin_zhenyue`（防禦）、`wangyin_chixiao`（傷害）、`wangyin_jiting`（技能速度）、`wangyin_guixu`（續航）。

**王印 16（Art Director 挑，不給 mumi）**：鎮嶽 s2151、疾霆 s2155（配 s2149、s2124 都行）、赤霄 s2154（暫用，偏弱，沒有實心牌面）、歸墟 s2160（暫用，縮小後看不出漩渦；而且是照 s2133 做的，跟推薦的 s2162 不同款）。鎮嶽 s2152 灰、弱，不用。mumi 挑完 32 後，赤霄、歸墟各用「挑到的那張 32」當 init 重跑 1 張 16（bitforge，同上筆 body，seed 2165、2166），共 2 張。疾霆不管挑哪張都用 s2155。鎮嶽若挑 s2145，那枚 16 也要重跑 1 張，會到 119.75，超過工程的 118.75：先問 mumi，不准就從 s2145 手修 16。

**預算**
| 批 | 內容 | 張數 |
| --- | --- | --- |
| 第 1 輪＋A 批＋B 批（已做） | 88 次＋A 批 14＋B 批 12 | 已花 116.75 |
| 保留 | 赤霄 16、歸墟 16 各 1（mumi 挑完 32 才跑） | 2 |
| 特效 | 不重跑，改零成本後處理（§5 `beam_cap`、`fade_tail`） | 0 |

全部做完 118.75（工程上限），不超過 120；保留的 2 張用完就沒有備用。每批跑前查餘額，「已花＋這批張數 > 120」就停。

## 4. 招牌特效（/vfx，vfx_gen.py 的格式；已產完，不重跑）
輸出 `art/fx/<id>/`。`old/<時間>/` 的版本已永久不見，每個 id 只剩最新一張；sig_chase、sig_wyapply 的毛病用 §5 的後處理修，不花生成。提示詞裡的 `{token}` 由工具換成值（/vfx 不能鎖色，只能靠字）。下表留著是給以後重跑用。

每一筆提示詞的開頭都加上這句：

```
pixel art VFX animation, transparent background, no character, no text, no frame, crisp hard-edged pixels, no anti-aliasing, no black outline, low top-down view, dark temple dungeon, few tones per colour, bold shape that changes clearly every frame,
```

| id | 用途 | 尺寸・幀・播放 | 提示詞 |
| --- | --- | --- | --- |
| sig_crit | 暴擊（取代 fxsheets 的 crit） | 96×96・10・一次 | critical hit burst at the centre: a sharp four-point star flash in pure white {--dmg-hit} with a hard gold rim {--dmg-crit}, eight thin straight shards shoot outward, one ring expands and breaks apart in frames 3-6, gone by the last frame, no smoke, no lingering glow |
| sig_lvup | 升級（主角腳下） | 128×128・16・一次 | level up on the floor in the bottom third: a flat ring of warm pale gold {--dmg-crit} expands outward, six slim vertical rays of off-white {--tx-strong} rise from it, a few pale green {--dmg-gain} sparks drift up, everything fades by the last frame, no full-screen flash |
| sig_beam | 掉寶光柱（程式依稀有度上色） | 32×128・8・循環 | a slim vertical light beam rising from a small glow on the floor at the bottom, white and light grey only, no other colour, edges flicker softly, tiny motes float upward, seamless loop, the beam stays the same width |
| sig_chase | 追逐掉落（只給追逐物） | 128×128・14・一次 | a heavy treasure drop hitting the floor: an orange {--rar-chase} shock ring bursts outward and a tall orange beam with a pale orange {--rar-chase-hi} core and white {--dmg-hit} centre shoots up, ember sparks scatter, the beam thins to a thread by the last frame |
| sig_wyapply | 王印套用（套到裝備那一下） | 96×96・12・一次 | a square bronze stamp presses down at the centre and lifts away, leaving a square glowing orange {--rar-chase} impression that pulses once and fades, small pale orange {--rar-chase-hi} sparks pop at its four corners, square shapes only |

## 5. 後處理（pixellab_batch.py 的 `post`）
先把每個像素對該地形四色（`-edge`、`-ground`、`-mid`、`-light`，依序 0–3）取 CIEDE2000 最近色，得到色階圖。
- `floor_shift`：色階 −1（最低 0）：原圖 `-mid` → `-ground`、`-ground` 與 `-edge` → `-edge`。再 `wrap_heal`、`despeckle`。
- `wall_shift`（牆頂）：同樣 −1（`-light` → `-mid`、`-mid` → `-ground`、`-ground` 與 `-edge` → `-edge`），再 `wrap_heal`、`despeckle`。
- `face_shift`（牆面 64×18）：−1；每一列看第 0、31、32、63 欄，四格不全同 → 四格都改成這一列最多的色（左右兩半怎麼接都無縫）；從中間切成 a、b 兩張 32×18，各自 `despeckle`。
- `wrap_heal`：上下、左右接縫兩邊相對的像素不同色 → 兩格都改成整張最多的色。
- `despeckle`：上下左右四個鄰居（含接縫繞回）都跟自己不同 → 改成鄰居裡最多的色，做一次。
- `recolor`：把另一地形已過的色階圖用這個地形的四色重畫（冰窟牆頂備案：墓地牆頂 s1312 的色階圖，用冰窟四色）。
- `alpha_binary`：alpha ≥ 128 → 255，其餘 → 0；不透明像素取 palette 最近色（記最大 ΔE）。
- 拿掉 `floor_remap`、`split_2x32`（併進 `face_shift`）。

特效後處理（`tools/vfx_sheet.py` 讀最新的 png＋json 逐幀改，再寫 sheet、gif 和 `js/fxsig.js`；原檔留在 `art/_raw/fx/`）：
- `beam_cap`（sig_chase 每一幀）：柱子範圍是畫面中線左右各 12 px。找柱頂第一列；從柱頂往下找第一列「不透明像素平均亮度到柱芯淡橙」（最多找 40 列），柱頂到它之間的列都改成那一列的顏色（拿掉頂端的深棕、深橙橫帶）。再把最上 3 列左右各削 3、2、1 格，alpha 依序 25%、50%、75%。環和火花不動。
- `fade_tail`（sig_wyapply，從第 8 幀起）：第 8 幀取最多的那一色（`--rar-chase`），把它的外框整塊填滿（補掉洞和暗點），當新的第 8 幀；第 9–11 幀用同一塊，alpha 依序 75%、50%、25%，播完就消失。不准出現棋盤或抖色。

## 6. 收圖檢查（tools/asset_check.py，每張一列 csv，不過的不給 mumi 看）
| 檢查 | 怎麼量 | 過關 | 對應 |
| --- | --- | --- | --- |
| 色票偏移 | 不透明像素對 palette 最近色 ΔE2000（原圖） | ΔE > 3 的 ≤ 5%、最大 ≤ 10；後處理後 100% palette 色 | (c)(d) |
| 沒被放大 | 原圖最近鄰縮一半再放大回來，跟原圖完全一樣 → 是放大的圖 | 不能完全一樣 | — |
| 地磚雜點 | 後處理後四鄰都不同色的像素 | ≤ 2% | — |
| 地板 | 平均相對亮度 ÷ `-ground`；`-edge` 比例；實心暗塊（3×3 全是 `-edge` 的中心像素）；`-mid`、`-light` | ≤ 1.02；5–35%；≤ 2%；≤ 3%、0 | (b) |
| 牆頂 | `-mid`＋`-light`；`-light` | ≤ 80%；≤ 15% | (d) 截圖 |
| 牆面 | 每半張 `-mid`＋`-light`；`-light` | 5–60%；≤ 15% | (d) |
| 接縫 | 接縫平均 RGB 色差 ÷ 磚內相鄰平均（牆面量四種接法） | ≤ 1.2 | — |
| 圖示雜點 | 色分三類：暗（`--scene-void`、`--panel-inset`、`--rar-chase-bg`）、銅（`--border`、`--border-mid`、`--border-cap`）、亮（`--rar-chase`、`--rar-chase-hi`、紋樣色）；8 鄰沒有同類的不透明像素 | ≤ 3% | — |
| 王印飽和 | C* > 40 ÷ 不透明 | ≤ 35% | (c) |
| 目視（Art Director） | 牆頂是正上方的面、不是側面風景或立體塊；王印正面平視、看不到頂面或側面、沒有臉；四枚轉灰階縮成 16 分得出 | Art Director 判 | — |
| 特效 | 最大一幀不透明面積、C* > 40 面積（換成兩種畫面比例，見 §1 偏差 6）；L* < 15 | 招牌 ≤ 12%；黑邊 ≤ 5% | (c) |

換進遊戲後照 `specs/M2-36-palette-tokens.md` 的 (a)–(g) 截圖量（`tools/comfort.py`），牆頂的 (d) 以截圖為準。

**現在的候選（第 2 輪 77206be＋B 批 3629d87，過 §6 再經 Art Director 目視；★＝推薦）**
| 組 | 候選 |
| --- | --- |
| 地板 | temple ★s1103、s1106；lava ★s1202、s1203、s1205；tomb ★s1308、s1301；ice ★s1404、s1403 |
| 牆頂 | temple ★s1112、s1113；lava ★s1213、s1212；tomb ★s1312、s1311、s1314；ice ★s1417 |
| 牆面 | temple ★s1122、s1124；lava ★s1224、s1223；tomb ★s1322、s1323；ice ★s1423、s1422 |
| 王印 32 | 赤霄 ★s2141、s2144；鎮嶽 ★s2104、s2145；疾霆 ★s2149、s2124、s2150（牌子略帶側面）；歸墟 ★s2162（螺旋）、s2133（同心圓） |
| 王印 16 | 定稿：鎮嶽 s2151、疾霆 s2155、赤霄 `16-fix`（32 s2141 手修，`tools/wy16_fix.py`）、歸墟 s2166 |
| 特效 | 每種只剩最新一張，只要確認：sig_crit、sig_lvup、sig_beam；sig_chase、sig_wyapply 加 §5 後處理 |

目視淘汰（過了數字但不給 mumi）：
- 地板：ice s1401（弧形裂紋重複，像一排笑臉）；lava s1201（格線太密像網格）、s1204（跟 s1203 太像、暗塊較多）；temple s1104（碎點多）；tomb s1303（圓紋重複，2×2 看得出格）。
- 牆頂：s1411–s1414（側面山形、冰刺）、s1211（立體方塊）、s1214（條紋）、s1111（側面橫樑）、s1114（刻痕像文字）、s1313（直條像門板）。
- 牆面：s1424（像樹根）、s1221（三角亮塊）、s1222（幾乎全黑）、s1121（大片全黑方塊）、s1324（碎，像雜訊）。
- 王印：s2101–s2103、s2111、s2114、s2121、s2123、s2131（立體方塊、寶箱，看得到頂面）；s2113（臉）；s2142、s2143（刻紋像人形）；s2146（尖峰像火焰，會跟赤霄混）；s2147、s2148（疾霆刻成山）。
- 特效：sig_lvup 115627、sig_wyapply 115811 等舊版已不存在。sig_chase 最新（光柱頂是平的方塊）、sig_wyapply 最新（結尾散成棋盤雜點）改用 §5 後處理修，不淘汰。
- 王印 B 批：歸墟 s2161（又是同心圓，不過檢查）；鎮嶽 16 s2152（灰、弱）。

## 7. 給 mumi 挑圖
- 過了 §6 的候選由工程拼成對照圖（地磚：每張 2×2 拼＋放一個主角；王印：32 與 2 倍並排、轉灰階一列；特效：gif 放在 `-ground` 底上），推到 `art/m2-36-assets`（draft PR #47，不合併）。
- 挑圖 Page：「dpoe M2-36 素材挑圖」（Art Director 做，經幕僚長請 mumi 挑）。21 個決定、39 張，約 12 分鐘（其中 6 個只有一張，確認即可）；王印 16 由 Art Director 挑，Page 只小圖給看。
- 挑完怎麼接進遊戲（檔案槽、路徑、載入、退回、FXS 寫法）照 `specs/M2-33-3a-scene-assets.md` §3–4：地磚 `img/tiles/<地形>-floor.png` 等；王印拼成 `img/ic_wy32.png`、`img/ic_wy16.png`；特效由 `tools/vfx_sheet.py` 寫進 `js/fxsig.js`（不動自動產生的 `js/fxsheets.js`）。
