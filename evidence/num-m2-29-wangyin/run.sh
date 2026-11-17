#!/bin/bash
# M2-29 王印數值模擬：完整重跑步驟（在 repo 根目錄執行；測的 commit：origin/main fc78dea7056003049c58cefe080a7a775509c1b3）
# 1. 複製遊戲到 scratch 並打補丁（只改複製品的 js/items.js：stats() 加王印一段）
set -e
SIM=${SIM:-/tmp/m2-29-sim}
node evidence/num-m2-29-wangyin/patch.js $SIM
(cd $SIM && python3 -m http.server 8031 >/dev/null 2>&1 &)
sleep 1
cd evidence/num-m2-29-wangyin
# 2. job 清單都在 jobs/（static_cx／single／sites 由 jobs.js 產生；recheck／static_final 是同格式的手寫清單）
# 3. 跑（Playwright，4 頁平行；動態 job 每個是 900 遊戲秒、dt 1/30、AI 自動打）
node sim_run.js jobs/static_cx.json data/static_cx.csv        # 靜態 → data/static_cx.csv.jsonl
node sim_run.js jobs/static_final.json data/static_final.csv  # 靜態 → data/static_final.csv.jsonl
node sim_run.js jobs/single.json data/single.csv
node sim_run.js jobs/sites.json data/sites.csv
node sim_run.js jobs/recheck.json data/recheck.csv
# 4. 王印掉落（用 origin/main 的 chaseRoll，不打補丁）：每輪秒數 星級 小時 次數
for a in "144 1" "134.83 1" "50.21 1" "47.0 1" "113.02 5" "96.81 5" "70.59 5" "75.99 5"; do node chase_sim.js $a 100 300; done > data/chase.jsonl
# 5. 彙總
python3 an_static.py data/static_cx.csv.jsonl > data/static_cx_table.md
python3 an_static.py data/static_final.csv.jsonl > data/static_final_table.md
python3 an_check6.py > data/check126_table.md
python3 an_dyn.py data/single.csv > data/single_table.md
python3 an_pool.py data/single.csv 5 > data/single_pool5.md
python3 an_sites.py data/sites.csv > data/sites_table.md
python3 an_sites.py data/recheck.csv > data/recheck_table.md
