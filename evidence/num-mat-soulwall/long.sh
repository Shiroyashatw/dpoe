#!/bin/bash
# num-mat-soulwall 長跑：GRP × 一輪秒數(100／150) × 10 種子。每個跑到 1,800 分以後「鍛造台 Lv20 且 13 種 II 都解鎖」就停，最長 3,600 分。4 個一起跑。
# 用法：./long.sh（S0～S3）；GRPS="S3b S3c" ./long.sh（條件加跑）
cd "$(dirname "$0")"
mkdir -p runs
S10="20261115 1 2 3 4 5 6 7 8 9"
jobs=()
for g in ${GRPS:-S0 S1 S2 S3}; do for sec in 100 150; do for sd in $S10; do
  f=${g}_s${sec}_sd${sd}
  [ -f runs/$f.json ] || jobs+=("GRP=$g SEC=$sec SEED=$sd nice -n 19 node sim_wall.js runs/$f.csv runs/$f.json > /dev/null")
done; done; done
printf '%s\n' "${jobs[@]}" | xargs -P 4 -I{} bash -c '{}'
echo done
