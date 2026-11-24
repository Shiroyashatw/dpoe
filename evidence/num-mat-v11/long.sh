#!/bin/bash
# num-mat-v11 長跑：一輪秒數(100／150) × 10 種子，各 60 小時（跑滿 3,600 分）。4 個一起跑。
# 用法：./long.sh <輸出目錄> [環境變數…]，例：./long.sh runs_A_mix CRAFT=mix ALT=150000,250000,350000
#   A：runs_A_iron（CRAFT=iron ALT=150000,250000,350000）、runs_A_mix（CRAFT=mix ALT=150000,250000,350000）
#   D：runs_D（CRAFT=mix TRADE=1 CAP=… ALT=…，值見 summary.md）
cd "$(dirname "$0")"
OUT=$1; shift
mkdir -p "$OUT"
S10="20261115 1 2 3 4 5 6 7 8 9"
jobs=()
for sec in 100 150; do for sd in $S10; do
  f=s${sec}_sd${sd}
  [ -f "$OUT/$f.json" ] || jobs+=("env $* SEC=$sec SEED=$sd nice -n 19 node sim_v11.js $OUT/$f.csv $OUT/$f.json > /dev/null")
done; done
printf '%s\n' "${jobs[@]}" | xargs -P 4 -I{} bash -c '{}'
echo done $OUT
