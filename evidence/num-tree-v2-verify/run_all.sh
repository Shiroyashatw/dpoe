#!/bin/bash
# num-tree-v2-verify 重現步驟。在分支 numbers/num-tree-v2-verify 的 repo 根目錄外層跑：
#   S=<scratch 目錄> evidence/num-tree-v2-verify/run_all.sh
# A＝本分支（定案文字套進 js/data.js、tools/tree_bake.js 後重烘，js/ptdata.js 已 commit）
# main＝base 68a48d98 原樣；B、C、D＝只在 scratch 的敏感度變體（不是定案）
set -e
: "${S:?先設 S=scratch 目錄}"; export S
R=$(git rev-parse --show-toplevel); E=$R/evidence/num-tree-v2-verify; cd $E
# 1. 定案 A：重烘＋check.js（重烘結果要跟 commit 的 js/ptdata.js 一樣）
(cd $R && node tools/tree_bake.js > $E/checks/bake_A.txt && git diff --exit-code js/ptdata.js && node tools/check.js > $E/checks/check_A.txt || true)
# 2. base（main 68a48d98）
git -C $R worktree add -f $S/main 68a48d984874c2b74c8d85941256117193d30ee6 2>/dev/null || true
(cd $S/main && node tools/tree_bake.js > $E/checks/bake_main.txt && node tools/check.js > $E/checks/check_main.txt || true)
# 3. 敏感度變體：B＝入門叢集每個主題最多試 8 次；C＝B＋奇數路輸出菱形放左側（5.1 的 tF）
./mkvariant.sh B RETRY=8; ./mkvariant.sh C RETRY=8 FLIPODD=1
for v in B C; do cp $S/$v/check.txt checks/check_$v.txt; cp $S/$v/bake.txt checks/bake_$v.txt; done
#    D＝main 只改十字弓術 rg [0,3,0,0,0,1]→[0,3,0,0,0,0]（第 5 項的純對照）
d=$S/D; rm -rf $d; mkdir -p $d; for f in $S/main/*; do b=$(basename $f); case $b in js|css|tools|evidence) ;; *) ln -sfn $f $d/$b;; esac; done
cp -r $S/main/js $S/main/css $S/main/tools $d/
sed -i '/^    .十字弓術.,$/,/^    \[0, 3, 0, 0, 0, 1\],$/ s/\[0, 3, 0, 0, 0, 1\]/[0, 3, 0, 0, 0, 0]/' $d/js/data.js
(cd $d && node tools/tree_bake.js > bake.txt && node tools/check.js > check.txt || true); cp $d/check.txt checks/check_D.txt
# 4. 分析（第 1～10 項）
for v in main A B C D; do r=$S/$v; [ $v = A ] && r=$R
  node analyze.js $r $v; node near.js $r $v; node avoid.js $r $v; node inventory.js $r > inv_$v.json; done
# 5. 經濟（第 11～15 項）
node econ.js > econ.txt
