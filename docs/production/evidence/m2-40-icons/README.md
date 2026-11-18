# M2-40 R5f 技能圖示手修：9 枚，0 次生成，§5 都過

照 `docs/production/specs/M2-40-skill-icon-picks.md` §2（美術 16:24，a42e1d2），量測門檻照 `M2-40-skill-icon-prompts.md` §5。**還沒定稿、沒接入遊戲**（`js/`、`css/`、`index.html` 沒動）。舊輪（r5_～r5e_）的檔和底圖都沒動，§1 的 15 枚候選也沒動。

## 做法

- **沒有呼叫 PixelLab**（生成 0 次，`spend.csv` 沒加列）。全部由 `scripts/r5f.py` 用程式逐像素畫：手修圖存成 `art/icons/skill/<id>/<底圖 stem>h.png`。`sk_holyshield` 是重畫，存成 `sk_holyshield-r5fh.png`。
- 顏色只用該列 palette 與 §2 指定的 token。明暗用 token 本身、兩個 token 的混色，或 r5d 導引圖的三階（亮＝往白混 40%，暗＝×0.55）。沒有平塗，也沒有單色實心。
- 畫完都跑 r5c 的後處理（外緣 1 px `--scene-void`、1 px 透明邊、去 2 px 角），再用 r5c 的 `evaluate` 量 §5。IoU 拿 24 枚全集互比。

## 9 枚（手修後的數字；畫風＝不透明非描邊的色數 ≥ 8 且 L* 差 ≥ 35）

| id | 底圖 → 手修 | 改法 | 畫風 | IoU32（對象） | IoU16（對象） | 填滿／外框／16 | 雜點 | §5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `sk_deadeye` | sk_deadeye-s7224 → sk_deadeye-s7224h | 剪影不動；兩顆骰子各分 3 面：頂面 --tx-strong、左面 --border-mid、右面 --border，稜線與底邊用相鄰 token 混色；左骰點數 2×2 --scene-void（頂 1、左 2、右 2），立起那顆點數 2×2 --bad（右下格 --bad 暗階） | 9 色／71.3 | 0.467（`sk_holyshield`） | 0.464（`sk_rend`） | 0.273／0.432／0.289 | 0.0 | 過 |
| `sk_holyshield` | sk_holyshield-s7208 → sk_holyshield-r5fh | 重畫：右上 14×16 鳶形小盾、往右傾 20°；盾面 --border-mid：中脊一道亮線，左半迎光（上段混 --border-cap）、右半背光（混 --border，右下 --border 最暗）；盾緣 --border-cap（右下半混 --border-mid）；左下 2 道 1 px 弧形速度線 --tx-strong，尾端混 --border-mid | 9 色／61.1 | 0.529（`sk_gasflask`） | 0.544（`sk_gasflask`） | 0.334／0.393／0.355 | 0.0 | 過 |
| `sk_rage` | sk_rage-s7219 → sk_rage-s7219h | 重畫成熊掌印：刪掉散開的 6 顆紅點；主掌墊改下寬上窄的圓角梯形；4 顆 4×5 橢圓趾墊排成弧形、描邊間隔 1 px；掌墊、趾墊都用 --hp 三階（左上亮→右下暗），左上一格 --bad 高光、旁邊 --bad／--hp 亮階混色；掌下 2 道 4 px 斜向短裂紋 --border（上端混 --border-mid、下端暗階） | 8 色／49.3 | 0.47（`sk_doom`） | 0.51（`sk_daunt`） | 0.341／0.445／0.391 | 0.0 | 過 |
| `sk_despair` | sk_despair-s7206 → sk_despair-s7206h | 左腿從弧頂往下約 1/3（y12）截斷並補描邊；刪掉右鉤尖黏著的粉色塊與底部花瓣，只留右邊彎鉤下垂（鉤尖 y19）；原本那片花瓣（原色、原明暗）移到鉤尖正下方，描邊間空 1 px | 13 色／69.9 | 0.336（`sk_fireburst`） | 0.381（`sk_shieldcharge`） | 0.176／0.341／0.195 | 0.017 | 過 |
| `sk_windflask` | sk_windflask-s7215 → sk_windflask-s7215h | 重畫成小瓶：頂端 2 px 瓶塞（--border-mid 三階）、細瓶頸上段空玻璃（--panel-inset／--tx-strong 混色）、下段鼓出瓶身裝 --good 三階藥水、左側 --tx-strong 反光；兩道風線跟瓶身斷開 1 px，改成波浪、由 3 px 收細到 1 px（--good，上緣混 --tx-strong、下緣暗階） | 11 色／67.7 | 0.489（`sk_berserk`） | 0.56（`sk_berserk`） | 0.364／0.476／0.426 | 0.0 | 過 |
| `sk_clarity` | sk_clarity-s6201 → sk_clarity-s6201h | 新月右下尖端下方加 2 顆斷開的水滴（2×3、1×2），--el-cold、亮點 --tx-strong、2×3 那顆右下一格混 --mp；為了留 1 px 空隙削掉新月右下緣 1–2 px 並補描邊 | 12 色／74.5 | 0.462（`sk_iceshield`） | 0.474（`sk_souldrain`） | 0.449／0.529／0.477 | 0.007 | 過 |
| `sk_fireburst` | sk_fireburst-s7210 → sk_fireburst-s7210h | 去孤立點：20 格改成 8 鄰裡 Lab 最接近的非描邊色（剪影不動、不加新色），雜點 0.088 → 0.000 | 29 色／75.4 | 0.408（`sk_chaosbolt`） | 0.475（`sk_shieldcharge`） | 0.221／0.31／0.262 | 0.0 | 過 |
| `sk_refract` | sk_refract-s7213 → sk_refract-s7213h | 去孤立點：10 格改成 8 鄰裡 Lab 最接近的非描邊色（剪影不動、不加新色），雜點 0.031 → 0.000 | 20 色／88.8 | 0.461（`sk_sacrifice`） | 0.514（`sk_sacrifice`） | 0.319／0.418／0.355 | 0.0 | 過 |
| `sk_doom` | sk_doom-s7218 → sk_doom-s7218h | 去孤立點：12 格改成 8 鄰裡 Lab 最接近的非描邊色（剪影不動、不加新色），雜點 0.033 → 0.000 | 18 色／80.3 | 0.542（`sk_bladestorm`） | 0.617（`sk_bladestorm`） | 0.358／0.485／0.398 | 0.0 | 過 |

- 9 枚 §5 全過：畫風、32 IoU < 0.6、填滿 0.15–0.50、外框 ≤ 0.75、16 填滿 ≤ 0.6、16 棋盤 ≤ 6、色數 ≤ 32、雜點 ≤ 3%、描邊、追逐色 0。可辨識度還要給美術總監和 UIUX設計師目視。
- 有兩枚畫風過得比較勉強：`sk_rage` 剛好 8 色（L* 差 49.3），`sk_deadeye`、`sk_holyshield` 各 9 色。原因是規格把顏色限定在少數幾個 token。
- 16 縮圖 IoU ≥ 0.6 的配對，跟 R5e 一樣還是兩對，要給 UIUX 目視：`sk_gasflask`／`sk_berserk` 0.602、`sk_doom`／`sk_bladestorm` 0.617（去雜點沒有改剪影）。
- 新圖相關的配對，沒有任何一對 IoU32 ≥ 0.6。舊圖之間 ≥ 0.6 的有 70 對（技能 62、光環 8），最高 0.742，沒有 ≥ 0.75 的（`r5f_bar_pairs.csv`）。
- 自己目視覺得還可以再修的地方：`sk_windflask` 的瓶子加兩道橫向風線，輪廓還是有一點像「F」，只是風線斷開、改成波浪，又往下移了。`sk_rage` 的掌墊偏扁。

## 檔案（本輪）

| 檔 | 內容 |
| --- | --- |
| `r5f_hand_compare.png` | 9 枚手修前後：左邊底圖 4x＋1x，右邊手修 4x＋1x，加手修灰階 4x；附改法與 §5 數字 |
| `r5f_32_compare.png` | 全 24 枚：彩色 4x＋1x、灰階 4x＋1x、最撞對象 4x、§5 數字與判定 |
| `r5f_sil_32.png`、`r5f_sil_16.png` | 同欄集完整黑剪影（換上 24 枚），金框是新圖，紅字是在 ≥ 0.6 配對裡的 |
| `r5f_bar_mock.png` | 52／56 空白鈕：每枚新圖和最撞對象，彩色＋灰階 |
| `r5f_iou.csv`、`r5f_bar_pairs.csv` | IoU 32／16 全表；同欄集所有 ≥ 0.6 的配對 |
| `r5f_review.csv` | 24 枚各一列：§5 數字、判定、手修改法 |
| `scripts/r5f.py`、`scripts/r5f_evidence.py` | 手修（在 dpoe/ 底下 `python3 -I` 跑）、證據 |

`js/` 沒變，所以 `r5e_locations.csv` 還是適用。

---

# M2-40 R5e（第 5 輪）技能圖示：續跑 22／22 次，17 張候選、7 張待手修

照 `docs/production/specs/M2-40-skill-icon-prompts.md`（R5e，a8cef7c）。**還沒定稿、沒接入遊戲**（`js/`、`css/`、`index.html` 沒動）。r5_／r5b_／r5c_／r5d_ 的舊檔都沒動。

## 做法

- 生成跟 R5d 一樣：`POST /v2/create-image-pixflux`，`init_image` 用上色導引圖、`init_image_strength` 150，不給 style_image／color_image，不要的寫進 `negative_description`（端點有收）。種子是 seed0＋3000；`sk_fire`、`sk_gasflask` 是重跑 1，再＋100，`<not>` 加了撞圖對象（`r5e_rerun_not.json`）。`sk_fire` 的主色改寫成白黃核心、橘、紅外緣，`<not>` 加了 pink、brown、stone、egg。
- 導引圖照 §2.2 畫：位置照剪影欄，每塊用 palette 主色分 3 階，外緣 1 px `--scene-void`。`sk_fire` 用三階 hex（白黃→橘→紅），因為 `--el-fire` 本身偏粉。**22 張都先預檢，同欄集 IoU < 0.55 才送出**；比對的對象包含沒被取代的舊圖、已過的新圖、拆圖對象，以及本輪其他導引圖。預檢最高 0.549，最低 0.429（`r5e_guide_precheck.csv`、`r5e_guide_sheet.png`）。預檢不過的導引圖先改圖，沒有花任何次數。
- 次數 **22／22**，餘額 997.99 → 975.99（`spend.csv` 的 `r5e-` 列）。我沒有手修。
- 最終 IoU 拿 24 張新圖互比，量測不過、待手修的新圖也算在內。新圖相關的配對沒有任何一對 IoU32 ≥ 0.6。

## 各張判定（畫風＝§5 色數 ≥ 8 且 L* 差 ≥ 35；意思＝對照 §3 剪影欄；IoU＝32 剪影對同欄集最大值）

| id | stem | 畫風 | 意思 | IoU32（對象） | 判定 |
| --- | --- | --- | --- | --- | --- |
| `sk_deadeye` | sk_deadeye-s7224 | 不過（6／75.6） | 對 | 0.446（`sk_gasflask`） | 不過，待手修 |
| `sk_purityaura` | sk_purityaura-s7202 | 過（16／93.0） | 對 | 0.466（`sk_command`） | 候選 |
| `sk_staticfield` | sk_staticfield-s7203 | 過（9／95.2） | 對 | 0.564（`sk_inferno`） | 候選 |
| `sk_summongod` | sk_summongod-s7204 | 過（8／71.5） | 對 | 0.417（`sk_iceshield`） | 候選 |
| `sk_ironaura` | sk_ironaura-s7205 | 過（21／88.9） | 對 | 0.533（`sk_iceshatter`） | 候選 |
| `sk_despair` | sk_despair-s7206 | 過（15／92.5） | 對 | 0.499（`sk_daunt`） | 候選 |
| `sk_weaken` | sk_weaken-s7207 | 過（22／86.2） | 對 | 0.465（`sk_frostnova`） | 候選 |
| `sk_holyshield` | sk_holyshield-s7208 | 過（18／94.9） | 不對 | 0.462（`sk_hasteaura`） | 不過，待手修 |
| `sk_bloodlust` | sk_bloodlust-s7209 | 過（13／96.9） | 對 | 0.538（`sk_daunt`） | 候選 |
| `sk_fireburst` | sk_fireburst-s7210 | 過（31／75.4） | 對 | 0.428（`sk_despair`） | 三項過，雜點超標待手修（雜點 0.088） |
| `sk_gasflask` | sk_gasflask-s7311 | 過（15／87.2） | 對 | 0.569（`sk_berserk`） | 候選 |
| `sk_refract` | sk_refract-s7213 | 過（21／88.8） | 對 | 0.461（`sk_sacrifice`） | 三項過，雜點超標待手修（雜點 0.031） |
| `sk_tidepull` | sk_tidepull-s7214 | 過（15／45.3） | 對 | 0.506（`sk_berserk`） | 候選 |
| `sk_windflask` | sk_windflask-s7215 | 過（22／65.4） | 對 | 0.5（`sk_berserk`） | 候選 |
| `sk_assassinate` | sk_assassinate-s7216 | 過（26／94.0） | 對 | 0.471（`sk_slash2`） | 候選 |
| `sk_combust` | sk_combust-s7217 | 過（23／90.6） | 對 | 0.488（`sk_rend`） | 候選 |
| `sk_doom` | sk_doom-s7218 | 過（18／80.3） | 對 | 0.542（`sk_bladestorm`） | 三項過，雜點超標待手修（雜點 0.033） |
| `sk_rage` | sk_rage-s7219 | 過（21／76.3） | 不對 | 0.466（`sk_talisman`） | 不過，待手修 |
| `sk_talisman` | sk_talisman-s7220 | 過（13／87.0） | 對 | 0.505（`sk_chaosbolt`） | 候選 |
| `sk_exorcise` | sk_exorcise-s7221 | 過（10／82.2） | 對 | 0.468（`sk_sweep`） | 候選 |
| `sk_fire` | sk_fire-s7322 | 過（22／95.2） | 對 | 0.532（`sk_shieldcharge`） | 候選 |
| `sk_meteor` | sk_meteor-s7223 | 過（15／57.2） | 對 | 0.557（`sk_shieldcharge`） | 候選 |
| `sk_oilgrenade` | sk_oilgrenade-s7212 | 過（18／80.9） | 對 | 0.492（`sk_sacrifice`） | 候選 |
| `sk_clarity` | sk_clarity-s6201 | 過（9／74.5） | 對 | 0.485（`sk_iceshield`） | 沿用 r5c，美術手修 |

- 不過、待美術手修的（本輪不再生成）：
  - `sk_deadeye`：畫風不過，只有 6 色。
  - `sk_holyshield`：意思不對，畫成彎角，看不出盾。
  - `sk_rage`：意思不對，畫成石頭加散落的紅點，看不出熊掌。
  - `sk_fireburst`、`sk_refract`、`sk_doom`：三項都過，但雜點超過 3%，分別是 8.8%、3.1%、3.3%。
  - `sk_clarity`：沿用 r5c s6201。
- 16 縮圖 IoU ≥ 0.6，給 UIUX 目視：`sk_gasflask`／`sk_berserk` 0.602、`sk_doom`／`sk_bladestorm` 0.617。
- 舊圖之間 IoU32 ≥ 0.6 的有 70 對（技能 62、光環 8），最高 0.742，沒有 ≥ 0.75 的（`r5e_bar_pairs.csv`）。
- `r5e_locations.csv` 共 72 處，其中借圖改新 id 的有 7 處。

## 檔案（本輪）

| 檔 | 內容 |
| --- | --- |
| `r5e_guide_sheet.png`、`r5e_guide_precheck.csv` | 22 張導引圖的 4x＋1x 拼圖，以及送出前的預檢數字（原檔在 `art/_raw/skill/guide/<id>.png`；前幾輪的導引圖改名成 `<id>_r5.png`、`<id>_r5d.png` 留著） |
| `r5e_32_compare.png` | 24 張：導引圖 4x、彩色 4x＋1x、灰階 4x＋1x、生成原圖 4x、最撞對象 4x、判定與理由 |
| `r5e_sil_32.png`、`r5e_sil_16.png` | 同欄集的**完整**黑剪影（換上 24 張新圖），金框是新圖，紅字是在 ≥ 0.6 配對裡的 |
| `r5e_bar_mock.png` | 52／56 空白鈕：新圖和最撞對象，彩色＋灰階 |
| `r5e_iou.csv`、`r5e_bar_pairs.csv`、`r5e_locations.csv` | IoU 32／16 全表；同欄集所有 ≥ 0.6 的配對；`js/` 裡受影響的每一處 |
| `r5e_review.csv`、`r5e_visual_notes.json`、`r5e_state.json` | 每張的量測、意思、理由、判定；量測過的 stem |
| `scripts/r5e.py`、`scripts/r5e_evidence.py`、`scripts/r5d_guide.py` | 生成、證據、導引圖與預檢 |

---

# M2-40 R5d（第 4 輪）技能圖示：試跑沒過，停在 3／25

照 `docs/production/specs/M2-40-skill-icon-prompts.md`（R5d，1dd8a0f）。**沒有定稿**，下面 r5c_、r5b_、r5_ 的檔不動。

## 結果

- 端點 `POST /v2/create-image-pixflux`，`init_image`＝上色導引圖（`art/_raw/skill/guide/<id>.png`）、`init_image_strength` 150；**不給 style_image、color_image**。body 照 §2.1，不要的寫 `negative_description`——**端點接受**。種子＝seed0＋3000。後處理不吸色（同 r5c）。
- 導引圖照 §2.2：位置照剪影欄、每塊用 palette 主色分 3 階（左上亮、中、右下暗）、外緣 1 px `--scene-void`，不是單色實心；填滿率 0.30–0.39。拼圖 `r5d_guide_sheet.png`。
- **導引圖鎖構圖有效**：3 張都照位置畫（生成圖對導引圖 IoU 0.90–0.93），r5c 的「置中／斜彗星」問題解掉；畫風 3／3 過。
- 但剪影 IoU 只有 `sk_oilgrenade` 過，**三項都過 1／3，未達 2／3**，照 §1 停下；其餘 20 張與重跑都沒跑。

| stem | 畫風（色數／L* 差） | 意思（對 §3 剪影欄） | IoU32 最大（對象） | 三項 |
| --- | --- | --- | --- | --- |
| `sk_fire-s7222` | 過（27／84.3） | 大致對：火球在右、尾巴水平往左；火感弱，火球像斑點圓球 | **0.633 不過**（`sk_shieldcharge`） | 不過 |
| `sk_gasflask-s7211` | 過（21／75.9） | 對：小瓶左下、瓶口斜往右上、右上三瓣洋紅毒雲 | **0.608 不過**（`sk_smokebomb`） | 不過 |
| `sk_oilgrenade-s7212` | 過（18／80.9） | 對：底部寬扁油漬、左上小圓罐、分開 | 0.492 過（`sk_sacrifice`） | **過** |

- 不過的原因在導引圖：導引圖本身對同欄集就 0.652（fire 對 `sk_shieldcharge`）、0.596（gasflask 對 `sk_smokebomb`），生成圖照著畫所以跟著撞。`scripts/r5d_guide.py` 已加預檢，畫完就印導引圖對同欄集的最大 IoU；**下一輪導引圖先壓在 0.55 以下再送**。
- 次數 **3／25**，餘額 1000.99 → 997.99。沒有手修。

## 檔案（本輪）

| 檔 | 內容 |
| --- | --- |
| `r5d_guide_sheet.png` | 用到的 3 張導引圖，4x＋1x 拼圖（原檔 `art/_raw/skill/guide/sk_fire.png`、`sk_gasflask.png`、`sk_oilgrenade.png`） |
| `r5d_32_compare.png` | 3 張：導引圖 4x、彩色 4x＋1x、灰階 4x＋1x、生成原圖 4x、撞圖舊圖 4x、目視 |
| `r5d_sil.png` | 黑剪影 32（1x、2x）與 16 縮圖（1x、4x），新圖與撞圖並排 |
| `r5d_bar_mock.png` | 52／56 空白鈕：新圖與撞圖，彩色＋灰階 |
| `r5d_review.csv` | 每張：量測、negative_description 是否接受、意思、目視；手修欄空 |
| `r5d_iou.csv` | 每張對同欄集（＋拆圖對象）的 IoU 32／16 |
| `r5d_bar_pairs.csv` | 試跑新圖在同欄集 IoU32 或 16 ≥ 0.6 的配對（3 對）；舊圖之間見 `r5_bar_pairs.csv` |
| `r5d_visual_notes.json`、`r5d_state.json` | 目視理由；量測過的 stem（`sk_oilgrenade-s7212`，另 `sk_clarity` 沿用 r5c `s6201`） |
| `spend.csv` | `r5d-` 開頭兩列是本輪（`r5d-auth` 是第 1 步查餘額，0 次） |
| `scripts/r5d.py`、`scripts/r5d_guide.py`、`scripts/r5d_evidence.py` | 生成（沿用 r5c 後處理與檢查）；導引圖＋預檢；證據 |

`js/` 沒變，`r5_locations.csv` 仍適用，本輪沒另出 locations。

## 給美術總監的建議

1. 導引圖法可用，續跑前先改兩張導引圖、預檢 < 0.55：`sk_fire` 把火球縮小、尾巴拉長變細（現在的「圓＋錐」跟 `sk_shieldcharge` 的盾＋衝刺線輪廓太像）；`sk_gasflask` 讓雲更大、三瓣分得更開，瓶身更細（`sk_smokebomb` 也是左下圓彈＋右上煙）。
2. `sk_oilgrenade-s7212` 可當候選。
3. 預算還剩 22 次（本輪 25），改導引圖後可再試跑 2 張（fire、gasflask 重跑 1），過了再續跑 20 張。

---

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
