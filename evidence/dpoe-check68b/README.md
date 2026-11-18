# dpoe-check68b：PR #68（M2-34 第 0 批 角色 token）獨立驗證

受檢 HEAD：`1cdaa8cb9bd1b9c10b4ee025f5caa3d202ad7ace`（分支 `claude/dpoe-m2-34-0-tbt8sj`）；基準 main `22b11c7527d8d8bf198150992f54e3c1d779bd79`。
本機：分支 `:8000`、main `:8001`、缺圖退回 `:8002`（另開 worktree 移走 img/tiles、ic_wy32/16、fx/sig_*，跑完放回）。沒改任何遊戲程式碼或斷言。

**整體：在受檢 HEAD 上全部通過；但驗證期間 main 前進到 `7ab7fa5`（#72、#75 合併），PR #68 現在跟 main 衝突、`mergeable: false`，要再併一次 main 才能合併。**

| 項目 | 結果 | 檔案 |
| --- | --- | --- |
| 含最新 main | 開始時 ✅（含 22b11c7）；**收尾時 main 已到 7ab7fa5，HEAD 少了 #72（王印 16）、#75（3a 修正）** | — |
| 混入提交 | ✅ main..HEAD 16 個提交＝PR #68 的 16 個；7 個合併的另一親代都在 main 上；跟開啟中的 PR #28/40/51/69/72/75/76 交集 0，docs-18（#51）提交都不在 HEAD 歷史裡 | — |
| `docs/介面規範.md` | ✅ 只改第 2 節（變數表換成角色 token 名＋一段說明），跟 docs-18 的改寫內容不同 | — |
| mergeable | 開始時 `true`／`clean`；**收尾時 `false`／`dirty`**（試合併衝突：CHANGELOG.md、css/style.css、docs/production/CHANGELOG.md、js/render.js） | — |
| check.js | ✅ 868 ／ ❌ 0（含 4 條色票檢查），一次過 | check.txt |
| touch_check 六尺寸（依序） | 390×844 141/0、375×667 141/0、412×915 141/0、844×390 60/0、1280×720 60/0、1440×900 60/0；沒有重跑 | touch_*.txt |
| hide／world／pro／chase | 34/0、30/0、43/0、21/0 | *_check.txt |
| dmg_check | 分支與 main 輸出逐字相同（diff 空），只有 main 既有的「鐵金剛 Lv90 太硬」1 ❌ | dmg_check_*.txt、dmg_diff.txt |
| m2_34_3a_shots | full ✅24 ❌0、fallback ✅7 ❌0 | 3a_full.txt、3a_fallback.txt |
| 像素比對 | 4×4：73／75（桌機 05_戰鬥_橫幅 6 px、3a 1440x900-night 1 px，通道差都是 1）；桌機＋3a 加跑到 8×8：**75／75** | compare_4x4.txt、compare_8x8.txt、px_diff_round1/ |
| 嚴格 RGB 比對 | 75／75 都有 RGB 完全相同的一對（見下方註） | strict_rgb.txt、strict_rgb.py |
| 數值／存檔／版本 | ✅ data.js 只改 `ELC` 一行（改讀 PAL，值相同）；main.js、version.json、VER 沒變；index.html 只多 palette.js 一行 | — |
| 字面色碼 | 見下方 | — |

## 註

- **compare.py 的小漏洞**：「差異像素」是把差異圖轉灰階（L）再數，單一通道差 1 會被四捨五入成 0。所以 compare 表裡「最小差異 0、最大通道差 1」那列不代表 RGB 相同。另寫 `strict_rgb.py` 直接比 RGB：75 張都有完全相同的一對（桌機 05 是 base4×head6）。
- **字面色碼**：css 的 `:root` 以外只剩註解裡的色碼；JS 除了 PR 說明列的 intro.js `INTRO_PAL` 與 biome.js 兩處亂數色，還有 **data.js 73 處**（職業 `col`、天賦叢集 `c` 等識別色）與 **sprites.js 20 處**（像素圖調色盤）。這些跟 main 一樣沒動，check.js 的 SKIP 也明寫「開場、像素圖、技能與職業的識別色除外」，但 PR 說明第 5 點沒列出來。

## main 22b11c7 → 7ab7fa5 帶進的跟本批有關的改動（沒有替 PR 合併）

- `css/style.css`：`--chase-bnr` 改成不透明 `#1c130d`；新增 `--rar-chase`／`--rar-chase-rgb`／`--rar-rare`／`--rar-rare-rgb`（註解寫「M2-34 第 0 批 token 收斂同名同值」，但 main 的 `--rar-rare: #ffcf5c`、`--rar-rare-rgb: 255, 209, 102` 兩者不同值，併的時候要對一下 PR 的定義）。
- `js/render.js`：掉落光柱色改讀 `cssv('--rar-chase-rgb' / '--rar-rare-rgb')`、柱頂不出場景；跟 PR 的 `PAL.rgb.rarChase／rarRare` 衝突。
- `js/hud.js`（追逐橫幅王印圖延遲載入）、`js/art.js`、`tools/check.js`（+221 行）、`img/fx/sig_beam.png`、`img/ic_wy16.*`（換檔名）。
- 再併後要重跑 check.js（4 條色票檢查＋main 新斷言）與像素比對（3a 的光柱、王印圖都換了）。
