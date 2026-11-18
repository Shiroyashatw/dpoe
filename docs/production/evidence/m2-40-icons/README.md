# M2-40 R5c（第 3 輪）技能圖示：試跑沒過，停在 3／28

照 `docs/production/specs/M2-40-skill-icon-prompts.md`（R5c，cc7b018）。**沒有定稿**，下面 r5b_、r5_ 的檔不動。

## 結果

- 端點 `POST /v2/create-image-pixflux`，**不給 style_image、init_image、color_image**。body 照 §2.1：description 只寫要的，不要的全部放 `negative_description`——**端點接受**（沒有退回 `no …`）。shading `detailed shading`、detail `highly detailed`，種子＝seed0＋2000。後處理只做 alpha_binary、外緣 1 px `--scene-void`、1 px 透明邊、去 2 px 角，不吸色。
- 試跑 3 張：§5「畫風」3／3 過，但「意思」只有 `sk_clarity` 對，**畫風過且意思對 1／3，未達 2／3**，照 §1 停下，其餘 21 張與重跑都沒跑。

| stem | 畫風（色數／L* 差） | 意思（對 §3 剪影欄） | 量測 |
| --- | --- | --- | --- |
| `sk_fire-s6222` | 過（31／78.3） | 不對：火球在左下、尾巴斜往右上，是 not 欄的 diagonal comet；規格要火球在右、尾巴水平往左 | 不過（IoU32 0.70 對 `sk_berserk`） |
| `sk_gasflask-s6211` | 過（15／85.0） | 不對：置中直立圓肚瓶（not 欄 round flask in centre），只有兩條紫觸手、沒有比瓶大的三瓣雲 | 過 |
| `sk_clarity-s6201` | 過（9／74.5） | 大致對：開口新月；水滴只有左下尖端一小滴，不是右下 2 顆（可手修補） | 過 |

- 跟 R5b 比：不用參考圖後，構圖不再被抄成斜箭／羽毛，明暗也保留；但 pixflux 仍不太照位置描述（「左下／右上」「水平」），會回到最常見的置中構圖。
- 次數 **3／28**，餘額 1003.99 → 1000.99。沒有手修。

## 檔案（本輪）

| 檔 | 內容 |
| --- | --- |
| `r5c_32_compare.png` | 3 張：彩色 4x＋1x、灰階 4x＋1x、生成原圖 4x、量測與目視 |
| `r5c_review.csv` | 每張：量測（畫風、IoU、填滿、16、棋盤、雜點、描邊、追逐色）、negative_description 是否接受、意思、目視；手修欄空 |
| `r5c_iou.csv` | 每張對同欄集（＋拆圖對象）的 IoU 32／16 |
| `r5c_visual_notes.json` | 畫風與意思的理由 |
| `r5c_state.json` | 量測過的 stem（`sk_gasflask-s6211`、`sk_clarity-s6201`）；**`sk_gasflask` 目視不過，不是定稿** |
| `spend.csv` | `r5c-` 開頭兩列是本輪（`r5c-auth` 是第 1 步查餘額，0 次） |
| `scripts/r5c.py`、`scripts/r5c_evidence.py` | 生成、後處理、檢查；證據 |

沒有定稿，所以沒做剪影 32／16、52／56 模擬鈕、bar_pairs、locations（`js/` 沒變，`r5_locations.csv` 仍適用）。

## 給美術總監的建議

1. pixflux 對位置詞不穩。可試把位置換成形狀詞（如 sk_fire 用「horizontal fireball, flame tail to the left, wide and short」），或把 not 欄的禁止構圖再加重（`centred`、`diagonal`）。
2. 或以 `init_image`（手畫剪影導引，低強度）鎖構圖、不給 color_image，保留明暗。
3. `sk_clarity-s6201` 可直接當候選，手修補右下 2 顆水滴。

---

# M2-40 R5b（第 2 輪）技能圖示：停在 12／40

照 `docs/production/specs/M2-40-skill-icon-prompts.md`（R5b，6ff1ea7）。**沒有定稿**，下面第 1 輪的 r5_ 檔不動。

## 結果

- 端點 `POST /v2/create-image-bitforge`，body 照 §2.1（不給 `color_image`），`style_image` 一張（技能列 `sk_markshot`、光環欄 `sk_hasteaura`），種子＝seed0＋1000（重跑 1 再＋100）。後處理只做 alpha_binary、外緣 1 px `--scene-void`、1 px 透明邊、去 2 px 角，**不吸色**。
- 試跑 4 張（強度 40）：§5「畫風」4／4 過（色數 10–18、L* 差 86–99），照規則往下跑。
- 但 12 張**目視意思全部不過**：參考圖的斜箭／羽毛構圖被抄進來（對參考圖 IoU 0.61–0.72），強度 25、10 都一樣；強度 10 時明暗也掉（`sk_staticfield-s5303` 4 色）。不送參考圖（強度 0）明暗有，但意思仍錯、配色過飽和，而且寫在 description 的 `no arrow` 反而畫出箭。
- 再跑剩下 20 張首跑只會多出同樣的錯圖，所以停在 **12／40**（餘額 1015.99 → 1003.99），剩 28 次沒用。

## 檔案

| 檔 | 內容 |
| --- | --- |
| `r5b_32_compare.png` | 12 次生成：彩色 4x＋1x、灰階 4x＋1x、所用參考圖、量測與目視 |
| `r5b_review.csv` | 每張：量測（畫風、IoU、填滿、16、棋盤、雜點、描邊、追逐色）、強度、參考圖、目視；手修欄全空（沒有手修） |
| `r5b_iou.csv` | 每張對同欄集（＋拆圖對象）的 IoU 32／16 |
| `r5b_visual_notes.json` | 目視理由 |
| `r5b_rerun_not.json` | 重跑 1 加進 `<not>` 的字 |
| `r5b_state.json` | 量測全過的 stem（`sk_deadeye-s5224`、`sk_summongod-s5204`）；**兩張目視都不過，不是定稿** |
| `spend.csv` | `r5b-` 開頭四列是本輪 |
| `scripts/r5b.py`、`scripts/r5b_evidence.py` | 生成、後處理、檢查；證據 |

沒有定稿，所以沒做剪影 32／16、52／56 模擬鈕、bar_pairs、locations（`js/` 沒變，`r5_locations.csv` 仍適用）。

## 給美術總監的建議

1. `no …` 移到 bitforge 的 `negative_description`，description 只寫要的東西。
2. 32×32 單張 style_image 會連構圖一起轉。可改：參考圖換成不帶斜向主體的、或改用一次出多張候選的風格端點（`/generate-with-style-v2`：32 px 一次 64 張、最多 4 張參考圖；**先查每次扣多少**再決定預算）。
3. 或回到 pixflux、不帶參考圖，只用新 body＋negative_description，先試 2–3 張。

---

# M2-40 R5 技能圖示重畫 evidence

照 `docs/production/specs/M2-40-skill-icon-prompts.md`（14:50 版）。草稿，不合併、不接入遊戲；最後由 UIUX設計師審可辨識度。

## 結果

- 生成 **40／40**（A0 1＋首跑 23＋重跑 16），每批前後的餘額記在 `spend.csv`（最後 1015.99）。認證：沒有設環境變數，照 M2-39 的做法由雲端代理注入。
- 24 枚定稿都過了 §5 的量測項：對同欄集 IoU32 < 0.6、填滿率 0.15–0.50、外框 ≤ 0.75、16 填滿率 ≤ 0.6、16 棋盤 ≤ 6、色數 ≤ 10、無追逐色。定稿檔名在 `state.json` 與 `review.csv`。
- 舊圖之間沒有 ≥ 0.75 的配對。0.6–0.75 有 70 對（技能列 62、光環欄 8），最高是 `sk_iceshatter`／`sk_iceshield` 0.742。規格估的是 69 對、最高 0.734，差在 IoU 的算法：這裡直接比 32×32 alpha > 127 的遮罩，沒有 `sil.py`。
- 新圖相關的 16 縮圖 IoU ≥ 0.6 有 12 對，列在 `r5_bar_pairs.csv`，要給 UIUX 目視。

## 手修（不花生成）

- **上色**：PixelLab 照共用 body（「readable as a black silhouette」）大多畫成近黑的實心剪影，內部吸到 `--scene-void`。內部像素超過一半是描邊色的，照原圖的亮度層把內部重配到 palette 的非描邊色，左上緣亮一階；剪影完全不變。檔名後綴 `h`。建議下一輪把 body 的這句改掉。
- **平移／加粗**：重跑 2 次都用完、還沒過的 6 枚由美術總監手修，檔名後綴 `m`。
  - 只差一點的平移 1–2 px：`sk_ironaura`、`sk_fireburst`、`sk_fire`、`sk_meteor`。
  - 太細的加粗 1 px：`sk_refract`、`sk_assassinate`。
- `sk_deadeye`：原圖骰面空白，手畫骰點，剪影不變。
- 美術總監目視的意見在 `visual_notes.json`，也寫在 `review.csv` 的 visual 欄。偏離剪影欄的有：`sk_purityaura`、`sk_gasflask`、`sk_oilgrenade`、`sk_refract`、`sk_windflask`、`sk_exorcise`、`sk_fire`、`sk_meteor`。

## 檔案

| 檔 | 內容 |
| --- | --- |
| `r5_32_compare.png` | 每枚：彩色 4x＋1x、灰階 4x＋1x，旁邊是撞圖對象（舊圖） |
| `r5_sil_32.png`、`r5_sil_16.png` | 同欄集全部黑剪影（換上新圖後）。金框＝新圖，紅字＝在 IoU ≥ 0.6 的配對裡 |
| `r5_bar_mock.png` | 新圖＋撞圖對象放進 52、56 空白鈕，彩色＋灰階 |
| `r5_iou.csv` | 每枚新圖對同欄集每一枚（含拆圖對象）的 IoU，32 與 16，附最大值與對象 |
| `r5_bar_pairs.csv` | 換圖後同欄集所有 IoU ≥ 0.6 的配對（32 或 16），含舊圖之間 |
| `r5_locations.csv` | `git grep -w` 在 `js/` 找到的每一處：72 處，其中 7 處是借圖改新 id |
| `review.csv` | 每枚定稿：試過的 seed、生成數、手修、量測、目視 |
| `asset_check.csv` | 定稿：100% palette 色、描邊、1 px 透明邊、2×2 粗角、棋盤、雜點、追逐色 |
| `spend.csv` | 每批：id、批前／批後餘額、生成數、累計 |
| `rerun_not.json` | 重跑 1、2 加進 `<not>` 的撞圖對象 |
| `scripts/` | `r5.py`（生成、後處理、檢查、手修）、`guide.py`（重跑 2 的剪影導引圖）、`evidence.py`（本目錄的圖與 csv） |

原圖在 `art/_raw/skill/<id>/`，旁邊是同名 `.json`（request 去掉 base64，加上 usage）。導引圖在 `art/_raw/skill/guide/`。後處理圖（含所有嘗試）在 `art/icons/skill/<id>/`。
