# dpoe-check85b：PR #85（M2-12 邏輯切片）獨立驗證

受檢 HEAD：f37edf8d49b5feba647a1d0927847d48693f5e77；origin/main 2845e5a 是 HEAD 的祖先；`git merge-tree` 無衝突。只驗證，沒改程式或文件。

| 檢查 | 結果 | 檔案 |
| --- | --- | --- |
| check.js | ✅874／❌0，exit 0，一次過 | check.txt |
| hide_check（營地版） | ✅52／❌0 | hide_check.txt |
| 修前：HEAD 的 hide_check 原封跑 origin/main | 一開始就崩（ReferenceError: enterCamp is not defined） | hide_check_before_main.txt |
| 修前：同上，暫存副本把 enterCamp( 換成 enterHideout(（不進 repo） | ✅26／❌26 | hide_check_before_main_shim.txt |
| world_check／pro_check／dbg_check | ✅30／43／64，❌0 | *.txt |
| m2_12_shots | ✅16／❌0 | m2_12_shots.txt、shots/ |
| touch_check 390×844／375×667／412×915 | ✅148／148／148，❌0 | touch_*.txt |
| touch_check 844×390／1280×720／1440×900 | ✅62／62／62，❌0（沒有重跑） | touch_*.txt |
| idle_check 390×844／1280×720 | ✅11／11，❌0 | idle_*.txt、idle_b2_offline_*.png |
| 行為抽驗 spot85b.js（兩尺寸） | ✅22／❌0 | spot_check.txt、spot_*.png |
| (a) grep | `scene==='hide'`、enterHideout、homeAsk 0 處（main 22 處）；`stopWhy==='home'` 只剩 migrate 轉換行 | grep_hide.txt |

1280×720「繼續刷」鈕 (16,50)–(166,98)；鍛造台名牌 (113,102)–(194,136)，不重疊（間距 4 px）；其他名牌都不碰鈕。
