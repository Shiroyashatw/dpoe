# M2-36 色票與 token 值（廟宇古地圖）

Page：https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/4ac24fae-bc0a-4d94-a78d-b09213a2791c
負責：Game Art Director。角色名稱照 M2-36a token 角色清單；token 收斂合併後，工程只改 `:root` 的值，再加下面兩處修正，選擇器不用再動。量測以 main 0a9d3c3 為準。

## 方向與規則
- 方向 A 廟宇古地圖（暖木、舊紙、銅綠），加上 C 的規則：飽和色只給掉落（稀有度）、特效、跳數字，以及主按鈕。面板、場景都是低彩度暖褐。
- 主按鈕：銅綠 `#2c6457`，不用紅色。mumi 否決過紅色主按鈕（看起來像錯誤），紅色只留給傷害與危險。
- 昇華改成綠色 `#17c68b`，橙色只給追逐物。
- 面板 C* ≤ 3.5，L* 2.5–17；場景 C* ≤ 21（冰原 ≤ 10），L* 4.5–49。面板和場景地面的亮度只差 1.15:1，所以面板一定要有 `--border-mid` 框（對場景地面 ≥ 4.79:1）。
- 每個畫面的介面字色只用 5 個：`--tx`、`--tx-dim`、`--tx-off`、`--tx-strong`、`--sel-ink`（用在紙卡上）。有顏色的字只有物品名稱（稀有度色）和正負數值（`--good`／`--warn`／`--bad`）。

## 量測（最不利背景；對比用 WCAG，ΔE 用 CIEDE2000）
| 項目 | 門檻 | 最不利的組合 | 值 |
| --- | --- | --- | --- |
| --tx | 4.5 | --panel-raised-2 | 10.25 |
| --tx-dim | 4.5 | --panel-raised-2 | 5.62 |
| --tx-off | 4.5 | --panel-raised-2 | 4.67 |
| --tx-strong | 4.5 | --panel-raised-2 | 12.64 |
| --tx-scene | 4.5 | --plate-world 疊在純白特效上 | 9.74 |
| --on-act | 4.5 | --act／--act-hi | 5.98／5.06 |
| --sel-ink | 4.5 | --paper | 11.64 |
| 語意色當字（14 色） | 4.5 | --bad 在 --panel-raised-2 上 | 4.57 |
| 稀有度字在自己的格底上 | 4.5 | --rar-chase 在 --rar-chase-bg 上 | 6.87 |
| --border-mid（不是文字） | 3 | 對 --panel／場景地面／場景中間調 | 5.54／4.79／3.05 |
| --border-ctl（不是文字） | 3 | --panel-raised-2 | 5.98 |
| 語意色兩兩之間的 ΔE | 15 | --bad／--el-fire | 16.4 |
| 語意色對中性字色的 ΔE | 15 | --el-light／--tx | 16.8 |
| 追逐 vs 昇華 ΔE | 越大越好 | --rar-chase／--asc | 48.9（原本 3.0） |
| 跳數字 5 色兩兩之間的 ΔE | 15 | --dmg-crit／--dmg-gain | 25.0 |
| 主按鈕 vs 負向色 ΔE | 越大越好 | --act／--bad | 58.1 |

語意色共 14 個：負向、警告、火、追逐、稀有、雷、正向、昇華、傳奇、冰、魔法、覺醒、混沌、受傷。

## token 值
「同 X」是指同一個值；token 還是分開的兩個。

**面板與疊層**
| token | 值 | 角色 |
| --- | --- | --- |
| --scene-void | `#0b0907` | 畫面最底層、場景外（L* 2.5） |
| --panel-inset | `#12100e` | 凹槽、空格、輸入框、條的空段（L* 4.8） |
| --panel | `#1b1917` | 面板底（L* 8.9，C* 1.8） |
| --panel-raised | `#25221f` | 凸起：按鈕、卡片（L* 13.4） |
| --panel-raised-2 | `#2c2925` | hover、選中列，一定要搭配 --border-hi 框（L* 16.8，C* 3.2） |
| --plate-world | `rgba(18,16,14,0.82)` | 場景上的字底板 |
| --sheet-bg | `rgba(27,25,23,0.94)` | 直立半版面板的底 |
| --panel-rgb | `27 25 23` | 面板色的半透明用法 |
| --chase-bnr | `rgba(30,22,15,0.94)` | 追逐橫幅的底 |
| --scrim-rgb | `10 8 6` | 陰影、遮罩、文字陰影（暗褐，不用純黑） |
| --hl-rgb | `227 216 195` | hover 亮層（改成暖色） |
| --glint／--glint-rgb | `#ffffff`／`255 255 255` | 不變 |
| --warm-glint-rgb | `255 225 170` | 不變 |
| --hurt-vignette-rgb | `190 30 25` | 受傷／低血時的畫面紅邊 |
| --dodge-vignette-rgb | `120 200 235` | 完美閃避的藍邊 |

**框線與文字**
| token | 值 | 角色 |
| --- | --- | --- |
| --border | `#3d3833` | 一般分隔線（裝飾用） |
| --border-mid | `#a38e6b` | 面板框（銅色） |
| --border-ctl | `#b8a482` | 可按元件的外框（不能當字色） |
| --border-hi／-rgb | `#cdbd9f`／`205 189 159` | 強調框、hover 框 |
| --border-cap | `#e3d6bb` | 框角、選中時的亮框 |
| --tx | `#e3d8c3` | 正文 |
| --tx-title | `#e3d8c3` | 標題（同 --tx，用字級和字重區分） |
| --tx-strong | `#f6efe0` | 主數字、強調的字 |
| --tx-dim | `#aca08c` | 次要的字 |
| --tx-off／--tx-lock／--tx-empty | `#9c917f` | 停用、鎖住、空格裡的「空」（5 處全改） |
| --tx-scene | `#f6efe0` | 壓在場景上的字，一定要有 --plate-world |
| --tx-scene-dim | `#f6efe0` | 刪掉；用到的地方改成 --tx-scene |

**動作與狀態**
| token | 值 | 角色 |
| --- | --- | --- |
| --act／--act-hi | `#2c6457`／`#33705f` | 主要按鈕的底（銅綠）／hover |
| --on-act／-rgb | `#f6efe0`／`246 239 224` | 主要按鈕上的字 |
| --sel／--paper | `#e3d6bb` | 選中的底；紙卡 |
| --sel-ink | `#2a1a12` | 選中的底和紙卡上的字 |
| --good／-rgb | `#94c759`／`148 199 89` | 正向 |
| --bad／--bad-hi | `#ff5262` | 負向；小字也用同一個值 |
| --bad-rgb | `255 82 98` | 負向的光暈 |
| --warn | `#a59413` | 警告（危險度中段），跟稀有金色差 ΔE 19.5 |
| --ready | `#e3d6bb` | 「可以做／買得起」的左邊標記 |
| --hp／--mp | `#8e2c25`／`#2b4f8f` | 生命條／法力條，兩種平台都用平塗 |
| --prog-lo／--prog-hi | `#4a3d2b`／`#b89a68` | 進度條（銅色） |

**稀有度、昇華、元素**（`-rgb` 用跟本體同一個值）
| token | 值 | 角色 |
| --- | --- | --- |
| --rar-normal | `#e3d8c3` | 普通 |
| --rar-magic／-bg | `#7ea7ff`／`#151a28` | 魔法 |
| --rar-rare／-bg | `#ffcf5c`／`#262012` | 稀有 |
| --rar-unique／-bg | `#3fd3d0`／`#102422` | 傳奇 |
| --rar-chase／-hi／-bg | `#f69625`／`#ffbf73`／`#33200f` | 追逐物（只有它用橙色） |
| --asc／-hi／-bg／-on | `#17c68b`／`#7fe0b8`／`#0f1f19`／`#134a37` | 昇華（綠色） |
| --cat-frac | `#f6efe0` | 碎片類（同 --tx-strong） |
| --cat-mem | `#ade2f9` | 記憶類（同 --el-cold） |
| --mod-mm／--mod-co | `#d171c6`／`#ff5262` | 同 --el-chaos／--bad |
| --affix | `#7ea7ff` | 技能關鍵字（同 --rar-magic） |
| --awk／-bg | `#caaef4`／`#1d1826` | 覺醒 |
| --el-phys | `#f6efe0` | 物理 |
| --el-fire／--el-cold／--el-light／--el-chaos | `#fc916e`／`#ade2f9`／`#f3f9a4`／`#d171c6` | 火／冰／雷／混沌 |

**跳數字（5 色，字級不變）**
| token | 值 | render.js 裡用到它的類型 |
| --- | --- | --- |
| --dmg-hit | `#ffffff` | hit、phys、fire、cold、light、chaos（元素不再用數字顏色區分） |
| --dmg-crit | `#ffcf5c` | crit、jackpot（jackpot 只靠 30px 的大字區分） |
| --dmg-hurt | `#fe9cba` | hurt |
| --dmg-gain | `#94c759` | gold、lv、perfect、mat |
| --dmg-minor | `#9c917f` | miss、block、ev、dot |
| --dmg-outline | `rgba(10,8,6,0.95)` | 描邊 |

**場景（biome.js）**
| 地形 | -ground | -mid | -light | -edge | -dark-rgb | -glow-rgb |
| --- | --- | --- | --- | --- | --- | --- |
| temple | `#2e241a` | `#524132` | `#8a7059` | `#140f0a` | `9 7 5` | `255 179 90` |
| lava | `#33221c` | `#593e35` | `#946b5c` | `#160e0b` | `10 7 5` | `255 138 60` |
| tomb | `#27261c` | `#464535` | `#77765d` | `#10100b` | `8 7 5` | `150 210 130` |
| ice | `#1e272b` | `#38474d` | `#627882` | `#0c1012` | `6 8 8` | `170 205 225` |

四種地形的 L* 都一樣（地面 15、中間調 29、亮部 49、邊緣 4.5），只差色相和彩度。冰原只有特效和小物件用冷色。`--scene-X-detail-n` 用腳本換算：L* 保留原值，a*b* 改成同地形新 -ground 的方向，C* 不超過該地形的 -light。藏身處的 HIDE_BIO 跟 temple 一樣。

## 變體與暫存 token
1. 所有 `--角色-vN` 變體都併回角色本身，包括 --on-act-v1、--rar-magic-v1、--dmg-crit-v1；跳數字的變體照上面的 5 色表歸類。
2. `--legacy-n` 刪掉，用到它的規則一起刪。
3. `--fx-名字` 保留原值，只能用在特效，不能當字色或面板色。
4. data.js 的技能和職業識別色、intro.js、sprites.js 都不動。

## 修正 1：桌機生命／魔力條的數字壓在場景上（M2-31 的 5 筆）
原因：桌機 `.hb`（style.css L1919）的底是 `rgba(0,0,0,0.7)`，條沒滿的時候場景會從空段透出來。這 5 筆是：15 `#bhp` 3.62、15 `#bmp` 3.62、16 `#bhp` 4.10、18 `#bhp` 1.44、18 `#bmp` 3.89。
1. `.hb` 的底改成不透明的 `var(--panel-inset)`，再加 1px `var(--border-mid)` 的框（兩種平台都改）。
2. 桌機的條高：生命 16px、魔力 14px。數字 11px／700，字色 `var(--tx-strong)`，陰影 `0 1px 0 rgb(var(--scrim-rgb))`，整個數字都在條裡面。
3. 填色改成平塗 `var(--hp)`／`var(--mp)`，拿掉 L623、L625 的漸層。
4. `.ward` 改成條底的 3px 細條，用 `rgb(var(--glint-rgb) / 0.6)`；不要再整條蓋 0.35 的白（會把數字的對比壓到 3.16）。

結果：最不利的情況是 7.01:1（--mp），不管血量多少、背後是什麼場景都一樣。

## 修正 2：紅色受傷數字疊在亮色／火焰特效上（M2-31 的 2 筆）
這 2 筆是 hurt `#ff5a5a` 疊在 `#ffffe2`（直立 03）和 `#fb591d`（桌機 09）上。
1. hurt 的字色改成 `--dmg-hurt` `#fe9cba`：跟 #fb591d 差 ΔE 30.4（原本 13.3），跟 --el-fire 差 21.4。
2. 只改 hurt：`lineWidth` 5；描邊的 alpha 用 `min(1, fa + 0.5)`。
3. 只改 hurt：`fa = 1 - max(0, f - 0.75) / 0.25`。

| 背景 | fa 1.0（舊 → 新） | fa 0.75 | fa 0.6 |
| --- | --- | --- | --- |
| #ffffe2 | 6.37 → 9.91 | 3.98 → 5.91 | 2.63 → 4.15 |
| #fb591d | 6.62 → 10.30 | 4.08 → 6.04 | 2.94 → 4.18 |

用舊畫法算 fa 1.0 是 6.37，跟 PR #31 實測的 6.35 一致。

## 樣張截圖（交給工程的雲端 Claude Code，11/20 上午，由製作人排程）
前提：token 收斂已經合併進 main。
1. 從 main 開分支 `art/m2-36-sample`，把本規格的值填進去，套用修正 1、2。
2. 用 PR #28 的 `capture.js` 截同一份畫面清單：直立 01–26、桌機 01–18 和 20–26，尺寸 390×844、1280×720，另外加 375×667（新增一個模式，畫面跟直立一樣）。
3. 用 `analyze.py` 量，回報：每種尺寸的 DOM 不合格筆數、canvas 不合格筆數、`#bhp`／`#bmp` 的最差值、hurt 的最差值。
4. 推到分支、開 draft PR，在 PR 留言貼數字表，不要合併。

過關條件：DOM 不合格 0 筆（PR #31 那 10 筆已知誤報不算）；`#bhp`／`#bmp` ≥ 4.5；hurt 在 fa ≥ 0.75 時 ≥ 4.5。

## PixelLab
- `tools/vfx_gen.py`：呼叫 `https://api.pixellab.ai/v2` 的 `POST /vfx`，用 Bearer 驗證；金鑰只從環境變數 `PIXELLAB_API_KEY` 讀。沒加 `--go` 只會預覽；一次最多產 5 張。
- `art/fx/*/result.json`：5 個特效是 vfx_gen.py 存下來的 API 回應（lite，每張 1 次生成），在 a93c3fd 提交（2026-11-15 21:13 台北時間）。
- `art/hero/hero.json`：PixelLab 網頁版 Create character 匯出的檔案，repo 裡沒有產生角色的程式。
- 提示詞：`docs/特效提示詞.md`、`docs/怪物提示詞.md`、`docs/主角提示詞.md`、`docs/裝備圖示提示詞.md`。
- MCP：沒有設定（沒有 `.mcp.json`；`.claude/settings.json` 只會跑 `tools/cloud_setup.sh` 裝 playwright）。
- 地磚和單張圖（王印）repo 裡還沒有程式（`tools/pixellab_batch.py` 不存在），要由雲端 session 新寫，金鑰用同一個環境變數。
- **需要 mumi 提供 token**：雲端環境裡現在有沒有這個變數，從 repo 看不出來。請在雲端 Claude Code 的環境設定裡加環境變數，名字要完全一樣：`PIXELLAB_API_KEY`，值是 pixellab.ai/account 的 API token。不要寫進 repo。第一批大約 11/21 開跑，所以 11/20 晚上之前要設好；帳號裡也要有生成次數。
