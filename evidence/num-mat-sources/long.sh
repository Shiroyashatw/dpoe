#!/bin/bash
# num-mat-sources 長跑。每個跑到 1,800 分以後「鍛造台 Lv20 且 13 種 II 都解鎖」就停，最長 3,600 分。4 個一起跑。
# 主組 any（MAT_SCALE=1、W_RATIO=0.3）、對照 strict：SUP(a／b) × 一輪秒數(100／150) × 10 種子
# nocraft：不打造（any、SUP a、s150、3 種子）；w02：W_RATIO=0.2（any、SUP a、s100／s150、6 種子）
# 校準（只在主組有缺材料乾等 >60 分時跑）：CALIB=1 ./long.sh
cd "$(dirname "$0")"
mkdir -p runs
S10="20261115 1 2 3 4 5 6 7 8 9"; S6="20261115 1 2 3 4 5"
jobs=()
q() { [ -f runs/$1.json ] || jobs+=("$2 nice -n 19 node sim_mat.js runs/$1.csv runs/$1.json > /dev/null"); }
for pay in any strict; do for sup in a b; do for sec in 100 150; do for sd in $S10; do
  q ${pay}_${sup}_s${sec}_sd${sd} "PAY=$pay SUP=$sup SEC=$sec SEED=$sd"
done; done; done; done
for sd in 20261115 1 2; do q nocraft_a_s150_sd$sd "PAY=any SUP=a SEC=150 CRAFT=0 SEED=$sd"; done
for sec in 100 150; do for sd in $S6; do q w02_a_s${sec}_sd$sd "PAY=any SUP=a SEC=$sec W_RATIO=0.2 SEED=$sd"; done; done
if [ "$CALIB" = 1 ]; then for ms in 1.25 1.5; do for wr in 0.2 0.3; do for sec in 100 150; do for sd in $S6; do
  q cal_m${ms}_w${wr}_s${sec}_sd$sd "PAY=any SUP=a SEC=$sec MAT_SCALE=$ms W_RATIO=$wr SEED=$sd"
done; done; done; done; fi
printf '%s\n' "${jobs[@]}" | xargs -P 4 -I{} bash -c '{}'
echo done
