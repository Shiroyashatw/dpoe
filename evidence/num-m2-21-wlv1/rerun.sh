#!/bin/bash
# 補跑卡住的場次：bash rerun.sh <r> <方案> <寬> <高>（OVR 同 run.sh）
cd "$(dirname "$0")"
declare -A O=([S0]='CAMP.forge[3].soul=500;' [S1]='CAMP.forge[3].soul=500;CAMP.watch[0].mats={"iron:1":100};' [S2]='CAMP.forge[3].soul=500;CAMP.house[1].soul=300;')
TZ=UTC OVR="${O[$2]}" node camp_run_v2.js http://localhost:8000/ 60 $3 $4 camp/${2}_${3}x${4}_r$1 > camp/${2}_${3}x${4}_r$1.log 2>&1
