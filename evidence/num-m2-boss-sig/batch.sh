#!/bin/bash
# 用法：bash batch.sh <場景 BASE|WIRED|FIX> <每格場數> <王...>；每個王×兩種尺寸一個工作，最多 4 個同時跑
cd "$(dirname "$0")"
SC=$1; N=$2; shift 2
export PW_CHROME=${PW_CHROME:-/opt/pw-browsers/chromium}
mkdir -p raw logs
for b in "$@"; do for s in 1280x720 390x844; do echo "$b $s"; done; done |
  xargs -P4 -L1 bash -c 'W=${1%x*}; H=${1#*x}; node boss_fight.js $0 '"$SC"' '"$N"' $W $H raw/$0_'"$SC${BUILD}"'_$1.jsonl >> logs/$0_'"$SC${BUILD}"'_$1.log 2>&1'
