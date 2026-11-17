#!/bin/bash
# 480 分長跑：方案（SINK×OUT）× 一輪秒數 × 5 種子，CRAFT=1（camp_run 的打造政策）
cd "$(dirname "$0")"
for sec in 150 100; do for sd in 20261115 1 2 3 4; do
  for cfg in "none none" "C none" "Cb none" "none a" "none a2" "none c" "C a"; do set -- $cfg
    f=long/s${sec}_sd${sd}_${1}_${2}
    [ -f $f.json ] || SEC=$sec SEED=$sd MIN=480 CRAFT=1 SINK=$1 OUT=$2 nice -n 19 node sim_pacing.js $f.csv $f.json > /dev/null
  done
done; done
echo done
