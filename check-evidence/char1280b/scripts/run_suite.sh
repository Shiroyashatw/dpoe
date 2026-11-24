#!/bin/bash
S=/tmp/claude-0/-home-user-dpoe/f6fd920b-e223-524c-8c80-74c70aee17fa/scratchpad
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
echo done > $L/$W-suite.done
