#!/bin/bash
# num-tree-v4-verify 重現步驟。在分支 numbers/num-tree-v4-verify 的 repo 根目錄跑：
#   S=<scratch 目錄> evidence/num-tree-v4-verify/run_all.sh
# 要先開兩個本機伺服器：本分支 python3 -m http.server 8765（repo 根目錄）、main python3 -m http.server 8766（$S/main）
set -e
: "${S:?先設 S=scratch 目錄}"; export S
R=$(git rev-parse --show-toplevel); E=$R/evidence/num-tree-v4-verify; cd $E
BASE=49b9babf6750c0b02303ba2070093919fbdafc0d
git -C $R worktree add -f $S/main $BASE 2>/dev/null || true
# 1. 重烘（結果要跟 commit 的 js/ptdata.js 位元組相同）＋ check.js
(cd $R && node tools/tree_bake.js > $E/checks/bake_v4.txt && git diff --exit-code js/ptdata.js)
(cd $R && node tools/check.js > $E/checks/check_v4.txt || true)
(cd $S/main && node tools/check.js > $E/checks/check_main.txt || true)
# 2. 其他 repo 測試：main 與本分支
for v in v4 main; do r=$R; u=http://localhost:8765/; [ $v = main ] && r=$S/main && u=http://localhost:8766/
  (cd $r && node tools/dmg_check.js > $E/checks/dmg_check_$v.txt || true)
  (cd $r && node tools/chase_check.js > $E/checks/chase_check_$v.txt || true)
  (cd $r && node tools/chase_check.js 20 20 > $E/checks/chase_check_20_20_$v.txt || true)
  (cd $r && node tools/loot_check.js > $E/checks/loot_check_$v.txt || true)
  for t in pro_check hide_check world_check; do (cd $r && node tools/$t.js $u > $E/checks/${t}_$v.txt 2>&1 || true); done
done
# 3. 天賦樹分析（第 1～10 項）
for v in v4 main; do r=$R; [ $v = main ] && r=$S/main
  node analyze.js $r $v > analyze_$v.txt; node near.js $r $v > /dev/null; node avoid.js $r $v > avoid_$v.txt; done
node inventory.js $R > inv_v4.json
node tree_quick.js > checks/tree_quick_v4.txt || true
# 4. 經濟：第 11 項（main 的每地點靈魂）
node econ.js $S/main 20000 > econ.txt
# 5. 第 12 項：main（含小怪 600,000 輪）、改前（本分支程式、NEW_P 照 main、不加歸零條件）、改後（本分支程式）
node econ_feel.js $S/main 600000 0,13 0 > feel/main_a.json & node econ_feel.js $S/main 600000 13,26 0 > feel/main_b.json & wait
cat feel/main_a.json feel/main_b.json > feel/main.json
NEWP='{"frac":[0,0.005,0.02],"ink":[0,0,0.03]}' node econ_feel.js $R 1000000 0,26 1 > feel/pre.json
node econ_feel.js $R 1000000 0,26 1 > feel/post.json
node econ_feel_table.js feel/main.json feel/pre.json feel/post.json feel_table.csv > feel_table.txt
# 6. 第 13～15 項：機制珠寶＋儲存規則的蒙地卡羅
node econ_mech.js 10000 > econ_mech.txt
# 7. 第 17 項：儲存規則（瀏覽器）
node jw_store_test.js http://localhost:8765/ > checks/jw_store_test.txt
