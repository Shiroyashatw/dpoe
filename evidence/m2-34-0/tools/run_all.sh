#!/bin/bash
# 用法：bash run_all.sh <改動前網址> <分支網址> <輸出資料夾> [次數，預設 2]
# 每一輪、每個尺寸：改動前與分支同時各跑一次（一次只開兩個瀏覽器，機器太忙遊戲模擬會走岔）
# 結果在 <輸出>/base1..N、<輸出>/head1..N（直立 26 張＋桌機 25 張＋3a 素材 3a/ 24 張），接著 python3 compare.py <輸出>
cd "$(dirname "$0")"
A=$1 B=$2 OUT=$3 N=${4:-2}
for i in $(seq 1 $N); do
  for s in portrait desktop; do
    node capture_det.js $s "$A" "$OUT/base$i" > "$OUT/base$i.$s.log" 2>&1 &
    node capture_det.js $s "$B" "$OUT/head$i" > "$OUT/head$i.$s.log" 2>&1 &
    wait
  done
  node capture_3a.js "$A" "$OUT/base$i" > "$OUT/base$i.3a.log" 2>&1 &
  node capture_3a.js "$B" "$OUT/head$i" > "$OUT/head$i.3a.log" 2>&1 &
  wait
done
