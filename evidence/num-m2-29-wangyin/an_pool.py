# 合併 9 格（3 build × 3 進度點）與每個 build 3 格：死亡率、平均生命%、偷取回復佔受到傷害的比例（偷取回復 ÷ 每秒失去的生命）
import csv, sys, statistics as st
from collections import defaultdict
rows = list(csv.DictReader(open(sys.argv[1])))
star = sys.argv[2] if len(sys.argv) > 2 else '5'
rows = [r for r in rows if r['star'] == star]
def pool(f):
    rs = [r for r in rows if f(r)]
    R = sum(int(r['rounds']) for r in rs); D = sum(int(r['deaths']) for r in rs)
    share = [float(r['leechPerS']) / 100 * float(r['hp']) / float(r['dmgTaken']) for r in rs if float(r['dmgTaken']) > 0]
    return R, D, D / max(1, R + D), st.mean(float(r['hpAvg']) for r in rs), st.mean(share) if share else 0, len(rs)
vars_ = sorted(set(r['var'] for r in rows))
print(f'### {star}★ 合併（每格 6 種子 × 900 秒）')
print('| 範圍 | 變體 | 過關輪 | 死亡 | 死亡率 | 平均生命% | 偷取回復 ÷ 受到傷害 |')
print('|---|---|---|---|---|---|---|')
for scope, f0 in [('全部 9 格', lambda r: True)] + [(b, (lambda b: lambda r: r['build'] == b)(b)) for b in ['phys', 'spell', 'bleed']] + [(f'{b} Lv{L}', (lambda b, L: lambda r: r['build'] == b and r['L'] == L)(b, L)) for b in ['phys', 'spell', 'bleed'] for L in ['48', '68', '83']]:
    for v in vars_:
        R, D, dr, hp, sh, n = pool(lambda r: f0(r) and r['var'] == v)
        print(f'| {scope} | {v} | {R} | {D} | {dr*100:.1f}% | {hp*100:.1f} | {sh*100:.1f}% |')
