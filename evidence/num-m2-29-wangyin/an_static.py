# 靜態比較（檢查 1、2、6）：每個 build × 進度點，10 個種子的平均；增量＝(變體 − none) ÷ none
import json, sys, statistics as st
from collections import defaultdict
F = sys.argv[1] if len(sys.argv) > 1 else 'data/static.csv.jsonl'
rows = [json.loads(l) for l in open(F)]
G = defaultdict(list)
for r in rows: G[(r['build'], r['L'])].append(r['res'])
def inc(rs, v, m):
    return st.mean((x[v][m] - x['none'][m]) / x['none'][m] * 100 for x in rs)
def mean(rs, v, m): return st.mean(x[v][m] for x in rs)
out = []
P = lambda *a: (print(*a), out.append(' '.join(str(x) for x in a)))
names = list(rows[0]['res'].keys())
P('| build | Lv | 變體 | ΔDPS% | ΔeHP% | 偷取 %最大生命/秒 |')
P('|---|---|---|---|---|---|')
for (b, L), rs in sorted(G.items()):
    for v in names:
        P(f'| {b} | {L} | {v} | {inc(rs,v,"dps"):.2f} | {inc(rs,v,"ehp"):.2f} | {mean(rs,v,"leechS"):.2f} |')
json.dump({f'{b}_{L}': {v: {'dps': inc(rs, v, 'dps'), 'ehp': inc(rs, v, 'ehp'), 'leechS': mean(rs, v, 'leechS')} for v in names} for (b, L), rs in G.items()}, open(F.replace('.csv.jsonl', '_summary.json'), 'w'), ensure_ascii=False, indent=1)
