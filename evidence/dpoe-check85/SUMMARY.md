# dpoe-check85：PR #85（M2-12 藏身處併入營地，邏輯切片）獨立驗證

- 受檢 HEAD：f2b56f3669a5c47cd6162951cbf729106f224a0d（只驗證，沒改任何程式碼或文件）
- origin/main：2205bc5；**HEAD 不含最新 main**（`merge-base --is-ancestor` 否）。`git merge-tree` 衝突檔：`docs/production/CHANGELOG.md`（只有這一個）
- `git log origin/main..HEAD`：4658f47、b75d7ff（併 main）、f2b56f3，沒有其他分支的提交
- PR mergeable：false／mergeable_state：dirty

| 檢查 | 結果 | 輸出 |
| --- | --- | --- |
| check.js | ✅ 873／❌ 0，exit 0，一次過 | check.txt |
| hide_check（營地版） | ✅ 52／❌ 0 | hide_check.txt |
| 修前：HEAD 的 hide_check 原封跑在 origin/main | 第一步就崩（ReferenceError: enterCamp is not defined）| hide_check_before.txt |
| 修前：同上，只把 `enterCamp()` 換成舊名 `enterHideout()` | ✅ 26／❌ 26（場景名、市集名牌、主角不動、鏡頭、F、T 回營地、舊存檔…）| hide_check_before_alias.txt／.diff |
| world_check | ✅ 30／❌ 0 | world_check.txt |
| pro_check | ✅ 43／❌ 0 | pro_check.txt |
| dbg_check | ✅ 64／❌ 0 | dbg_check.txt |
| m2_12_shots | ✅ 16／❌ 0 | m2_12_shots.txt、shots/ |
| touch_check 390×844／375×667／412×915 | ✅ 143／143／143，0 失敗 | touch_*.txt |
| touch_check 844×390／1280×720／1440×900 | ✅ 62／62／62，0 失敗 | touch_*.txt |
| 行為抽驗（自寫 spot_check.js，390×844＋1280×720） | ✅ 20／❌ 0 | spot_check.txt、spot_*.png |

touch_check 依序跑、沒有任何重跑。

行為抽驗：(a) `js/`、`index.html` 已無 `scene==='hide'`（main 上有 22 處；grep_scene_hide.txt）；(b) 刷圖中桌機按兩次 T、手機「更多 → 回營地 → 確認」都回到營地；(c) 回營地後 `S.stopWhy='camp'`、有「繼續刷」、3 秒不自動開刷、自動模式重新整理仍停在營地；(d) 用 origin/main 舊程式實際產生的存檔（自己回藏身處：stopWhy 'home'，再加 scene 'hide'）載入 → 營地、stopWhy camp、scene 欄位拿掉，金幣／等級／背包／倉庫／寶石／裝備／世界一致、無頁面錯誤；(e) 營地 5 秒每 0.5 秒取樣，座標一直是 660,560。

文件收尾：任務檔保留、狀態改「邏輯進行中」；README 列改「邏輯進行中（PR dpoe-m2-12）；外觀等 M2-33 補遺」— 與 PR 說明一致，任務未完成所以不刪檔／不進 archive，符合規則 3。兩份 CHANGELOG 各只多 M2-12 一段／一行。

觀察（不在邏輯切片範圍）：1280×720 營地「繼續刷」鈕蓋住鍛造台名牌（spot_1280x720_c_reload_camp.png）。
