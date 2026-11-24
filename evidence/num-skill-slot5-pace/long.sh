#!/bin/bash
# num-skill-slot5-pace 長跑：PAY(none 照現況／any 假設) × GROUP(ctrl／exp) × SUP(a／b／c) × 一輪秒數(100／150) × 10 種子
# 另加 notrade_ctrl_b：舊政策原樣（不用商會），看第 13／16 個地點會不會卡死
# 每個跑到 1,800 分以後「鍛造台 Lv20 且 13 種 II 都解鎖」就停，最長 3,600 分。4 個一起跑。
cd "$(dirname "$0")"
mkdir -p runs
jobs=()
for pay in none any; do for g in ctrl exp; do for sup in a b c; do for sec in 100 150; do for sd in 20261115 1 2 3 4 5 6 7 8 9; do
  f=runs/${pay}_${g}_${sup}_s${sec}_sd${sd}
  [ -f $f.json ] || jobs+=("PAY=$pay GROUP=$g SUP=$sup SEC=$sec SEED=$sd nice -n 19 node sim_slot5.js $f.csv $f.json > /dev/null")
done; done; done; done; done
for sec in 100 150; do for sd in 20261115 1 2 3 4 5 6 7 8 9; do
  f=runs/notrade_ctrl_b_s${sec}_sd${sd}
  [ -f $f.json ] || jobs+=("TRADE=0 GROUP=ctrl SUP=b SEC=$sec SEED=$sd nice -n 19 node sim_slot5.js $f.csv $f.json > /dev/null")
done; done
printf '%s\n' "${jobs[@]}" | xargs -P 4 -I{} bash -c '{}'
echo done
