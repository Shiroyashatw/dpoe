#!/bin/bash
# num-mat-final 長跑：一輪秒數(100／150) × 10 種子。鍛造台 Lv20、13 種 II、長老屋 Lv11 都到了就停，最長 3,600 分。4 個一起跑。
# 用法：./long.sh  → runs/s{100,150}_sd*.{csv,json}；再 node analyze.js
cd "$(dirname "$0")"
mkdir -p runs
S10="20261115 1 2 3 4 5 6 7 8 9"
jobs=()
for sec in 100 150; do for sd in $S10; do
  f=s${sec}_sd${sd}
  [ -f runs/$f.json ] || jobs+=("SEC=$sec SEED=$sd nice -n 19 node sim_final.js runs/$f.csv runs/$f.json > /dev/null")
done; done
printf '%s\n' "${jobs[@]}" | xargs -P 4 -I{} bash -c '{}'
echo done
