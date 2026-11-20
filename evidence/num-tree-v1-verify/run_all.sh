#!/bin/bash
# num-tree-v1-verify 重現步驟（只寫 scratch 與本資料夾，不改 repo 的遊戲檔）
# 用法：S=<scratch 目錄> ./run_all.sh
set -e
: "${S:?先設 S=scratch 目錄}"
export S
# 1. 變體副本（輕量：js/css/tools 複製，其餘 symlink）＋重烘
VARIANT=entry+xb ./mkvariant.sh v1                 # T4/T10 直接對調（遊俠第 2 個輸出叢集放不下）
FLIPODD=1 VARIANT=entry+xb ./mkvariant.sh tF       # 最小修法：奇數路輸出菱形改放左側
VARIANT=xb ./mkvariant.sh xbonly                   # 只搬十字弓、不重烘形狀（找不到同大點數的對調對象）
for s in 20261107 20261108 20261109 20261110; do FLIPODD=1 SEED=$s ./mkvariant.sh s$s; done
# 十字弓 rg 第 6 格 1→0（形狀不變）：見 summary.md，手動 sed（xbrg）
# 2. check.js（各副本裡跑，約 1 分鐘）：輸出在 checks/
# 3. 分析
node analyze.js /home/user/dpoe base
node analyze.js "$S/tF" tF
JMIN=2700 node analyze.js /home/user/dpoe base_push
node inventory.js /home/user/dpoe > inv_base.json
node inventory.js "$S/tF" > inv_tF.json
node xbow_slots.js /home/user/dpoe > xbow_slots_base.json
