# dpoe-hud133-fix4 測試結果

程式 HEAD `a65d5a3`（之後的 commit 只加證據與文件，沒動 js／css／tools）。全部在本機（`python3 -m http.server 8000`）跑，不連線上。

| 測試 | 結果 | log |
|---|---|---|
| `node tools/check.js` | **956 ✅／0 ❌**（fix3 954 ＋ 本輪 F7 兩尺寸 2 項） | `logs/check.log` |
| `node tools/d1_saves.js --check` | **6 ✅／0 ❌** | `logs/d1_saves.log` |
| `node tools/pro_check.js` | **35 ✅／0 ❌**（全部通過） | `logs/pro_check.log` |
| `touch_check 375 667` | **161 ✅／0 ❌** | `logs/touch_375x667.log` |
| `touch_check 1280 720` | **16 ✅／0 ❌** | `logs/touch_1280x720.log` |
| `touch_check 1440 900` | **16 ✅／0 ❌** | `logs/touch_1440x900.log` |
| `touch_check 390 844` × 10 | **10／10 次 161 ✅／0 ❌** | `logs/touch_390x844_run{1..10}.log`、`logs/touch_summary.log` |
| `npx prettier@3.3.3 --check js/*.js tools/*.js` | All matched files use Prettier code style | `logs/prettier.log` |
| F7 負向驗證（條故意改 `--rar-magic`） | 現行 ✅、注入後 ❌ | `logs/f7_negative.log` |
| 390 偶發重現（修前／修後，開面板後第一格卡 0／280／300 ms） | 修前 280 ms ❌×3（點到腰帶）；修後全 ✅ | `logs/flake_repro.log` |

390×844 連跑 10 次：

| 次 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ✅／❌ | 161／0 | 161／0 | 161／0 | 161／0 | 161／0 | 161／0 | 161／0 | 161／0 | 161／0 | 161／0 |
