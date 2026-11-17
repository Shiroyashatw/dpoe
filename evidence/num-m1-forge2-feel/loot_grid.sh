#!/bin/bash
# loot_sim.js 的穩健性網格：12 個亂數種子 × 一輪 90／100／120／150 秒 × 候選（main、鍛造台 2 250、550 對照），30 分鐘。輸出 JSONL
cd "$(dirname "$0")"
for sec in 90 100 120 150; do for s in $(seq 1 12); do
  for c in "main:" "f2_250:F2S=250" "f2_280:F2S=280" "ref550:W=550 WI=10"; do
    n=${c%%:*}; e=${c#*:}
    echo "{\"cand\":\"$n\",\"res\":$(env REPO=../.. SEED=$((20261115+s*101)) $e node loot_sim.js $sec 40 30)}"
  done; done; done
