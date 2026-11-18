# dpoe-check76：PR #76（M2-30）獨立驗證

受檢 HEAD：782f8841f4f4884e359e43dc2bcececb4f04ad48；origin/main 22b11c7527d8d8bf198150992f54e3c1d779bd79（已含）。結論：**通過**。

| 項目 | 結果 | 證據 |
|---|---|---|
| HEAD 含最新 main | ✅ merge-base --is-ancestor 成立 | — |
| 不含 DOC-18（7341751、4d9bdb5、960b8ec） | ✅ 三個都不在歷史裡；指定 6 個路徑 diff 0 行；兩份 CHANGELOG 只多 M2-30 的行 | — |
| PR mergeable | ✅ true（clean） | — |
| check.js | ✅ 866／❌ 0，exit 0（一次就過） | check.log |
| 卡牆斷言對修前程式 ❌ | ✅ game.js 換回 origin/main：865 ✅／1 ❌（就是「M2-30 卡牆」那條，[false×5,true]），exit 1；已還原 | check_prefix_game.log |
| touch_check 六尺寸（依序） | ✅ 390×844 141/0、375×667 141/0、412×915 141/0、844×390 60/0、1280×720 60/0、1440×900 60/0；沒有單項重跑；1440×900 因容器重啟中斷，整支重跑一次 | touch/ |
| touch_check／names_shot 改動審查 | ✅ 沒有放寬：ok() 判定式與門檻（face>0.7、roll dx>0.7、版面判定）都沒改；settle 只等量測值連三次一樣；翻滾重送只在手勢實際 ≥240ms（不是快速一撥）才觸發、最多 3 次，翻好了也不會因此跳過判定；names_shot 只改導覽（navGo('forge')）與行動尺寸用 tap | — |
| camp_run 390×844 60 分 | ✅ 沒有連續 3 分鐘 0 產出；頁面錯誤 0；玩家打完 33 輪（燒毀的村莊）；玩家 0 靈魂只有第 57 分（打王，王剩 26%）；無人組第 5、59 分（都在打王） | 390x844_60m* |
| camp_run 1280×720 60 分 | ✅ 沒有連續 3 分鐘 0 產出；頁面錯誤 0；玩家打完 27 輪（鴉衛的記號）；玩家 0 靈魂第 22、32 分（都在打王，15%／11%）；無人組第 42 分（打王） | 1280x720_60m* |
| names_shot 390×844、375×667 | ✅ 各 4 ✅／0 ❌，頁面錯誤 0 | names_* |
| 神格 Lv26 鎖 | ✅ Lv25 裝著生命 +0、Lv26 +50；兩尺寸角色頁有鎖住的格子、點了出「神格：角色到 Lv 26 才開」；Lv26 不鎖；頁面錯誤 0 | 神格鎖*.png、神格鎖Lv26.log、gh_shot.js |
| 不改數值 | ✅ js diff 只有 craft/game/hud/items；data.js（VER）、main.js（存檔版本）沒動；改的是邏輯不是數值表（GH_LV=26 新常數） | — |
| docs/待做清單.md 刪除 | ✅ HEAD 沒有、main 有 | — |
