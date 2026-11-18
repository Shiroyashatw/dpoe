# M2-40 R5 技能圖示挑圖（美術總監初篩）

依 PR #101 `3419d19`（icons-7，R5e）。40 次額度已用完，以下不再生成，全部手修。可辨識度最後由 UIUX設計師審。

## 1. 候選（交 UIUX設計師審，15 枚）

`sk_purityaura` s7202、`sk_staticfield` s7203、`sk_summongod` s7204、`sk_ironaura` s7205、`sk_weaken` s7207、`sk_bloodlust` s7209、`sk_gasflask` s7311、`sk_tidepull` s7214、`sk_assassinate` s7216、`sk_combust` s7217、`sk_talisman` s7220、`sk_exorcise` s7221、`sk_fire` s7322、`sk_meteor` s7223、`sk_oilgrenade` s7212。

16 縮圖 IoU ≥ 0.6 兩對，目視分得開，算過：`sk_gasflask`／`sk_berserk` 0.602（粉紫三瓣雲對紅斧）、`sk_doom`／`sk_bladestorm` 0.617（冠＋環對灰旋風）。

## 2. 手修（雲端 Claude 做，0 次生成；手修只改造型或補明暗，不准平塗；修完要過 §5）

| id | 底圖 | 問題 | 改法 |
| --- | --- | --- | --- |
| `sk_deadeye` | s7224 | 只有 6 色，骰子沒明暗 | 兩顆骰子各分 3 面：頂面亮、左面中、右面暗（`--tx-strong`／`--border-mid`／`--border`）；點數 2×2 `--scene-void`，立起那顆的點用 `--bad`。畫風要過（≥ 8 色、L* 差 ≥ 35） |
| `sk_holyshield` | 重畫 | 畫成角／爪，看不出盾 | 照 §3.1 #8：右上一面約 14×16 的小盾、往右傾約 20°；盾面 `--border-mid`，左上亮、右下 `--border` 暗，盾緣 `--border-cap`；左下 2 道弧形速度線 `--tx-strong`，各 1 px。材質明暗參考 `sk_ironaura` s7205 的盾 |
| `sk_rage` | s7219 | 中間像石頭，周圍 6 顆紅點，看不出熊掌 | 刪掉散開的紅點。主掌墊改成下寬上窄的圓角梯形；4 顆橢圓趾墊（約 4×5）排成弧形，貼在掌墊上方、間距 1 px；掌墊、趾墊都用 `--hp` 三階明暗；掌下 2 道短裂紋 `--border` |
| `sk_despair` | s7206 | 兩端都往下垂，像耳機 | 左邊那條腿從弧頂往下 1/3 處截斷；只留右邊彎鉤下垂；花瓣只留 1 片，放在鉤尖下面、斷開 1 px |
| `sk_windflask` | s7215 | 1 倍直接讀成字母「F」（禁字） | 直桿改成小瓶：頂端加 2 px 瓶塞、下段鼓出瓶身；兩道風線跟瓶身斷開 1 px，改成尾端收細的波浪線 |
| `sk_clarity` | r5c s6201 | 只有左下 1 小滴 | 新月右下尖端下方加 2 顆斷開的水滴（2×3 和 1×2），`--el-cold`，亮點 `--tx-strong` |
| `sk_fireburst` | s7210 | 雜點 8.8% | 去掉環上孤立的亮點，降到 ≤ 3% |
| `sk_refract` | s7213 | 雜點 3.1% | 去孤立點，≤ 3% |
| `sk_doom` | s7218 | 雜點 3.3% | 去孤立點，≤ 3% |

## 3. 接著

手修完由雲端重出對照圖、剪影 32／16、52／56 模擬鈕與 bar_pairs，交美術總監看手修，再交 UIUX設計師審可辨識度。接入遊戲要等幕僚長放行。
