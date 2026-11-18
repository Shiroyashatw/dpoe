# dpoe-check95：PR #95（彈夾→彈匣）獨立驗證

受驗 HEAD a3f8371（含 origin/main 6ab472a）。

1. origin/main 是 HEAD 祖先；origin/main..HEAD 5 個提交（3824c08 改字、039594c／b482e29 併 main、14285e7／a3f8371 CHANGELOG），合併的第二親代都是 main 上的提交；全 repo 無衝突標記。
2. `git grep -n 彈夾 -- js index.html css`：0 筆。
3. js／tools 的 diff 把舊行的「彈夾」換成「彈匣」後與新行完全相同（0 行差異）：只動字串與註解；tools 的斷言條件沒變。
4. check.js：✅871 ❌0（check.txt）。
5. touch_check：390×844 ✅146／1280×720 ✅60／375×667 ✅146／844×390 ✅60／667×375 ✅60／1440×900 ✅60，全部 ❌0，未重跑。
6. dmg_check：PR（dmg_pr.txt）與 origin/main（dmg_main.txt）輸出只差 6 行說明字串「彈夾→彈匣」，替換後逐字相同；兩邊都有同一個既有 ❌（鐵金剛 Lv90 太硬），非本 PR 造成。
7. 昇華石碑「千機」頁 390×844、1280×720：有「彈匣」、無「彈夾」、無頁面錯誤（shot.txt、asc_*.png）。
