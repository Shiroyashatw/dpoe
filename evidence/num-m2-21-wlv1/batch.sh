#!/bin/bash
# 補跑（每批最多 6 場同時，避免負載過高）：bash batch.sh r 方案:寬:高 ...
cd "$(dirname "$0")"; r=$1; shift
for x in "$@"; do IFS=: read s w h <<<"$x"; bash rerun.sh $r $s $w $h & done; wait
