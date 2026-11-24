#!/bin/bash
# num-tree-v3-verify 重現步驟。在分支 numbers/num-tree-v3-verify 的 repo 根目錄跑：
#   S=<scratch 目錄> evidence/num-tree-v3-verify/run_all.sh
# 本分支＝定案（11:42 V1～V7、4.1.1 S1～S5、M1）套進 js/data.js、tools/tree_bake.js、js/*.js 後重烘；main＝base 68a48d98 原樣（worktree）
# 要先開本機伺服器（第 16、17 項、pro/hide/world_check）：python3 -m http.server 8765；PW_CHROME 指定瀏覽器（雲端 /opt/pw-browsers/chromium）
set -e
: "${S:?先設 S=scratch 目錄}"; export S
R=$(git rev-parse --show-toplevel); E=$R/evidence/num-tree-v3-verify; U=http://localhost:8765/; cd $E
git -C $R worktree add -f $S/main 68a48d984874c2b74c8d85941256117193d30ee6 2>/dev/null || true
# 1. 重烘（結果要跟 commit 的 js/ptdata.js 位元組相同）＋check.js＋其他測試
(cd $R && node tools/tree_bake.js > $E/checks/bake_v3.txt && git diff --exit-code js/ptdata.js)
(cd $R && node tools/check.js > $E/checks/check_v3.txt || true)
(cd $R && node tools/dmg_check.js > $E/checks/dmg_check_v3.txt || true)
(cd $S/main && node tools/dmg_check.js > $E/checks/dmg_check_main.txt || true)
for t in pro_check hide_check world_check; do (cd $R && node tools/$t.js $U > $E/checks/${t}_v3.txt || true); done
(cd $R && node tools/chase_check.js 20 20 > $E/checks/chase_check_v3.txt || true)
(cd $S/main && node tools/chase_check.js 20 20 > $E/checks/chase_check_main.txt || true)
# 2. 天賦樹分析（第 1～10 項）：本分支 v3、main
for v in v3 main; do r=$R; [ $v = main ] && r=$S/main
  node analyze.js $r $v > analyze_$v.txt; node near.js $r $v > /dev/null; node avoid.js $r $v > avoid_$v.txt; done
node inventory.js $R > inv_v3.json
# 3. 敏感度（不是定案）：本分支換烘焙種子 1～6，看 check.js 的 ❌ 是不是種子問題
for sd in 1 2 3 4 5 6; do ./mkvariant.sh seed$sd SEED=$sd > /dev/null 2>&1; cp $S/seed$sd/check.txt checks/check_seed$sd.txt; done
# 4. 經濟：第 11 項（main 的每地點靈魂；v2 同一支 econ.js）
node econ.js $S/main 20000 > econ.txt
# 5. 第 12 項（V5）：main／改前（FEEL_TG 1500）／K12、K13（FEEL_TG 1800、1950）／改後（歸零條件，跟 main 同亂數序列：phs）
mkdir -p v5
(for li in $(seq 0 25); do echo "main $li 300000"; echo "phs $li 300000"; echo "1500 $li 100000"; echo "1800 $li 60000"; echo "1950 $li 60000"; done) |
  xargs -P4 -n3 sh -c 'm=after; tg=$0; [ "$0" = main ] && m=main && tg=1500; node econ_v5.js $S/main $m $2 $tg $1,$(($1+1)) > v5/$0_$1.json'
#    本分支程式本身（不覆寫）跑 4 個地點，對 main 看誤差
for li in 0 14 22 25; do node econ_v5.js $R after 300000 1500 $li,$((li+1)) > v5/branch_$li.json; done
node v5_table.js > v5_table.txt
# 6. 第 13～15 項：機制珠寶＋儲存規則的蒙地卡羅
node econ_mech.js 10000 > econ_mech.txt
# 7. 第 16、17 項：migrate() 與儲存規則（瀏覽器）
node jw_store_test.js $U > checks/jw_store_test.txt
