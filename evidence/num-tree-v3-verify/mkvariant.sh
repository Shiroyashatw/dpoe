#!/bin/bash
# 敏感度變體（不進 repo 的遊戲檔）：S=<scratch> ./mkvariant.sh <名字> [SEED=n]（v3 只用 SEED；RETRY、FLIPODD 是 v2 的，已經寫進 tools/tree_bake.js）
# 從目前分支（已套用 v3 定案）複製 js/css/tools，其餘 symlink；套變體後重烘＋跑 check.js
set -e
name=$1; shift
for kv in "$@"; do export "$kv"; done
R=$(git rev-parse --show-toplevel); d="$S/$name"; rm -rf "$d"; mkdir -p "$d"
for f in $R/* ; do b=$(basename "$f"); case "$b" in js|css|tools|evidence) ;; *) ln -sfn "$f" "$d/$b";; esac; done
cp -r $R/js $R/css $R/tools "$d/"
B="$d/tools/tree_bake.js"
if [ -n "$RETRY" ]; then
  # 每個入門叢集主題放不下就再試，最多 RETRY 次（定案 A 是 1 次，跟原本一樣）
  perl -0pi -e 's/      if \(!tryPlace\(h\.n, (\{[^\n]*\})\) && h\.el\)/      if (![...Array(h.el ? '$RETRY' : 1)].some(() => tryPlace(h.n, $1)) && h.el)/' "$B"
  grep -q "Array(h.el ? $RETRY" "$B"
fi
if [ -n "$FLIPODD" ]; then
  # 5.1 S 的建議 tF：奇數路（遊俠、魔導、自然）輸出菱形改放左側
  perl -pi -e 's/const T = side === \(g % 2 \? 1 : -1\) \? S\.d : S\.f,/const T = side === -1 ? S.d : S.f,/' "$B"
  grep -q "const T = side === -1 ? S.d : S.f," "$B"
fi
if [ -n "$SEED" ]; then sed -i "s/rng(20261106)/rng($SEED)/" "$B"; fi
(cd "$d" && node tools/tree_bake.js > bake.txt 2>&1; echo "bake=$?" >> bake.txt; node tools/check.js > check.txt 2>&1; echo "check=$?" >> check.txt) || true
