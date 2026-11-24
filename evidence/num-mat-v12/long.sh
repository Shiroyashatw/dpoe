#!/bin/bash
# num-mat-v12 長跑：一輪秒數(100／150) × 10 種子，各 60 小時（跑滿 3,600 分）。4 個一起跑。
# 用法：./long.sh <輸出目錄> [環境變數…]，例：./long.sh runs_C CRAFT=mix TRADE=1 CAP=wood:18000,iron:350000,hide:70000,silk:70000
#   C：runs_C（CRAFT=mix TRADE=1 CAP=…；費用、額度用 js 的值）、runs_C_h24（再加 QH=tran:80,aug:80,rich:9,exalt:18）、runs_C_off（再加 QH=off）
cd "$(dirname "$0")"
OUT=$1; shift
mkdir -p "$OUT"
S10="20261115 1 2 3 4 5 6 7 8 9"
jobs=()
for sec in 100 150; do for sd in $S10; do
  f=s${sec}_sd${sd}
  [ -f "$OUT/$f.json" ] || jobs+=("env $* SEC=$sec SEED=$sd nice -n 19 node sim_v12.js $OUT/$f.csv $OUT/$f.json > /dev/null")
done; done
printf '%s\n' "${jobs[@]}" | xargs -P 4 -I{} bash -c '{}'
echo done $OUT
