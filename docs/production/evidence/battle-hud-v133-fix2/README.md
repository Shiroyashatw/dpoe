# dpoe-hud133-fix2 證據（PR #146，分支 feat/battle-hud-v133）

- 程式 commit：`7a9ca08`（截圖、量測、token 比對都在這個 commit 上重產，measure_*.json 檔頭 `sha` 欄、REPORT.md 第 4 行都寫它）；已合併 main `9c6be66`。
- 規格：`docs/production/specs/battle-hud/battle-hud.md` v1.3.6＋`-2`／`-3`／`-4`、`battle-hud-5.md` v1.3.5、`battle-hud-6.md` v1.3.6、`terms-aura.md`、名詞表 v0.6.40（全部讀自 `9c6be66`；工具預設 `BH_SPEC_REV=9c6be66`）。
- 只拍 390×844 與 1280×720（沒有橫向、沒有 667×375 smoke）。

## 檔案

| 檔 | 內容 |
|---|---|
| `REPORT.md` | 26 張（13 狀態 × 2 尺寸）逐項框位 px 差（四邊 ±2）、熱區差、字級字重、色；後面接 `TOKENS.md`（截圖抽像素對 token） |
| `{state}_{size}.png` | 實機截圖（DPR 1） |
| `overlay_{state}_{size}.png` | 疊 W1 疊圖（新狀態疊一般／低血那張） |
| `compare_{state}_{size}.jpg` | 左實機、右規格上色示意圖（v1.3.5 xpblk／v1.3.6 es；1280 收起沒有示意圖） |
| `measure_{state}_{size}.json` | 量測原始資料 |
| `video/*.mp4`、`video/TIMING.md`、`video/*.json` | 8 支 HUD 影片（原生 60 fps）、起迄幀與毫秒、每格 HUD 狀態 |
| `logs/` | check.js（main 9c6be66 與 HEAD）、d1_saves、pro_check、touch_check 四尺寸 |

## 狀態

| 狀態 | 內容 |
|---|---|
| normal／boss／lowhp／lootflood／collapsed | v1.3.3 起的五狀態；現在一律拿盾（格擋值 412 / 600）、經驗一半；collapsed 另帶能量護盾 90 / 600 充能中（量 T46／T47、C67／C68） |
| es_full／es_partial／es_recharge／es_zero／es_none | 能量護盾 600／240／90 充能前緣／0（延遲中）／沒有上限（最大生命 1000、生命 820） |
| lowcomb | 危急紅邊合計分支：生命 500、能量護盾 30 / 600（合計 33%） |
| lowlife | 危急紅邊生命分支：生命 300、能量護盾 600 / 600 仍滿（生命 30%） |
| blockbr | 格擋碎開回滿中 200 / 600（斷續段）＋工具提示「格擋值 200 / 600（碎了，回滿前不吸收）」 |

## 結果

- 框位：**1387／1387 在 ±2 px 內，不符 0**（含 P66–P71、T43–T47、D65–D70、C64–C68）。
- token 抽像素：**497 項，不符 0**。
- 字級字重 ⚠ 63 項：都是 P24／T25（技能格 5 冷卻秒數 16/700，規格同格寫「冷卻秒數 16/700」）、P56／D40（自動開著 700，Q-U1）、P58／T36／D07／C07（選中分頁 700）——跟 v1.3.3 證據同一組（規格表字欄寫一般態，選中／冷卻另有規則），不是本輪新增。
- 影片：見 `video/TIMING.md`。8 支 ffprobe 都是 `r_frame_rate=60/1`；彈匣逐格 33–50 ms（平均 40，5 段 200 ms）、蓄力每段 400.0 ms、蓄滿外框 133 ms（120 ms 落在 8 格內，±1 格）、收起／展開 200 ms、掉寶滑入 200 ms；自動出手 3 次（390 兩次、1280 一次）都是 3/3。
