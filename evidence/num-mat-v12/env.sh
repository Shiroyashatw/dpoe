# 對照組的目錄（不進 commit 的大檔）：v11＝在 c85ddb2 的 checkout 跑 evidence/num-mat-v11 的
#   ./long.sh runs_D CRAFT=mix TRADE=1 CAP=wood:18000,iron:350000,hide:70000,silk:70000
# final＝在 bd96a91 的 checkout 跑 evidence/num-mat-final 的 ./long.sh。改成你自己的路徑。
export V11=${V11:-/tmp/claude-0/-home-user-dpoe/a2d6e318-50a4-5d2f-ae6b-a3f90828a4f9/scratchpad/wt_v11/evidence/num-mat-v11/runs_D}
export FIN=${FIN:-/tmp/claude-0/-home-user-dpoe/a2d6e318-50a4-5d2f-ae6b-a3f90828a4f9/scratchpad/wt_final/evidence/num-mat-final/runs}
