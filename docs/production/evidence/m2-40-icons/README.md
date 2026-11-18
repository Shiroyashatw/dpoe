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
