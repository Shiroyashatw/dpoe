#!/bin/bash
# 用法：run_suite.sh <main|pr> <port>
S=<scratch>
W=$1; P=$2
cd $S/$W; L=$S/logs; U=http://localhost:$P/
node tools/check.js > $L/$W-check.log 2>&1; echo "EXIT $?" >> $L/$W-check.log
for sz in "390 844" "375 667" "844 390" "667 375" "1280 720" "1440 900" "1280 800"; do
  f=$L/$W-touch-${sz// /x}.log
  node tools/touch_check.js $sz $U > $f 2>&1; echo "EXIT $?" >> $f
done
for t in pro hide world; do
  node tools/${t}_check.js $U > $L/$W-$t.log 2>&1; echo "EXIT $?" >> $L/$W-$t.log
done
for sz in "390 844" "1280 720"; do
  f=$L/$W-uiperf-${sz// /x}.log
  node tools/ui_perf.js $U $sz > $f 2>&1; echo "EXIT $?" >> $f
  f=$L/$W-uilook-${sz// /x}.log
  node tools/ui_look.js $sz $U $S/work/uilook-$W-${sz// /x} > $f 2>&1; echo "EXIT $?" >> $f
done
echo done > $L/$W-suite.done
