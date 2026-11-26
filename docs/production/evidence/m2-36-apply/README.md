# M2-36 套值範圍表

- 基準：origin/main `1029c433e4a32c78fc6f3fb60887755c57035bd3`；規格 `docs/production/specs/M2-36-palette-tokens.md`（同一個 main）；裁定 UIUX `BASE-DIFF-2156.md` 附錄 A 與 §1.2 寫法規則；範圍補充：遊戲製作人 22:18（轉達）。
- `scope.csv`：每個 token 的分類、舊值、新值、規格列號。分類：
  - `缺 47`：新增（附錄 A）
  - `值不同 31`：改值（附錄 A；含 5 個基本色）
  - `場景 26`：改值（附錄 A；`--scene-lava/tomb/ice-glow-rgb` 3 個同時屬 31 與 26）
  - `missed-same-as`：5 個「同 X」token（`--tx-title`、`--tx-scene`、`--el-phys`、`--mod-mm`、`--mod-co`），附錄 A 的腳本漏掉，製作人 22:18 確認屬 M2-36
  - `rgb-new-9`：新增 9 個 `-rgb` 伴生（BASE-DIFF §1.1）
  - `rgb-sync`：既有 `--good-rgb`、`--el-cold-rgb` 跟著基本色同步（(17)a，製作人 22:18 確認）
- 數量：新增 56（47＋9）；改值 61（31＋26−3 重疊＋5＋2）；刪除 0；共 117 個 token、scope.csv 120 列（3 個重疊 token 各列兩次）。
- 寫法：`-rgb` 一律逗號；`--scene-lamp-glow` 只寫 `#d9a774`（16% 留在用的地方）；temple／hide glow 寫實值 `217, 167, 116`；「同 X」一律寫解析後的 hex，不用 `var()`（§1.2 第 3 點：Node 的 palette.js 讀 `PAL_CSS` 原文，讀不到 `var()`；main 的 `:root` 本來也都寫實值）；`rgb(… / α)` 寫成逗號式 `rgba(…, α)`。
- 不在範圍：使用處的顏色對應（顏色改碼 PR）、`--tx-off`／`--tx-empty` 的形狀區分（虛線框、「—」、sk-grip）、AD 修正稿 CORR-M236-AD 的兩項提案（等 mumi）。

## 第 3 步（2026-11-26，PR #210）
- 依據：顏色總表 `uiux/battle-hud-color-table-1126` @ `6cf0691a` §2（27 列）＋(18)/(19)＋#210 三項裁定。
- `:root`：`--chg-e` `#b6889a`、`--chg-p` `#70b2f2`（(18)）；`--chase-bnr` `#25211e`（裁定 2）；新增 `--scene-window-rgb 201, 149, 96`（(19) 火光要 rgba；待裁）。§2 其他 22 個 token 的值第 1 步已是新值，沒再動。
- 使用處：命運輪盤六籤照 §2.1 第 6 點（js/maps.js）；4 處火光（js/biome.js，α 不變）；升級金圈檢查改對 `PAL.dmgCrit`（tools/check.js）。
- 不再被引用的舊 token（`--scene-detail-28/31/56/61-rgb`、`--dmg-minor-v9`、`--rar-rare-v1`、`--good-v6`、`--el-cold-v4` 的 hex）留在 `:root`，第 4 步一起刪。
- M2-36 規格文字照總表 §2.1 改 6 段＋第 150、160 行（檔案 25,005 B）。
