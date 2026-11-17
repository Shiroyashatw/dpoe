#!/bin/bash
# M2-21 D1：S0／S1／S2 實掛。用法：bash run.sh <批次號 r>  （每批 6 場同時：3 方案 × 2 尺寸，60 分）
# 本機伺服器 python3 -m http.server 8000（repo 根目錄）；只改記憶體（OVR），不動 repo。
cd "$(dirname "$0")"
r=$1
declare -A O=(
  [S0]='CAMP.forge[3].soul=500;'
  [S1]='CAMP.forge[3].soul=500;CAMP.watch[0].mats={"iron:1":100};'
  [S2]='CAMP.forge[3].soul=500;CAMP.house[1].soul=300;'
)
for s in S0 S1 S2; do for wh in "390 844" "1280 720"; do
  set -- $wh
  TZ=UTC OVR="${O[$s]}" node camp_run_v2.js http://localhost:8000/ 60 $1 $2 camp/${s}_${1}x${2}_r$r > camp/${s}_${1}x${2}_r$r.log 2>&1 &
done; done
wait
