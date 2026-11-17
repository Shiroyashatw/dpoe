# 動態結果彙總：每個 (星級, build, Lv/地點, 變體) 把種子加總：死亡率＝死亡 ÷ (過關＋死亡)；過關秒數＝每個種子平均的加權平均（權重＝過關輪數）
import csv, sys, statistics as st
from collections import defaultdict
F = sys.argv[1]
key = sys.argv[2] if len(sys.argv) > 2 else 'L'
rows = list(csv.DictReader(open(F)))
A = defaultdict(lambda: {'r': 0, 'd': 0, 'cw': 0.0, 'hp': [], 'lc': [], 'n': 0, 'site': ''})
for r in rows:
    k = (int(r['star']), r['build'], int(r[key]), r['var'])
    a = A[k]
    rn, dn = int(r['rounds']), int(r['deaths'])
    a['r'] += rn; a['d'] += dn; a['n'] += 1; a['site'] = r['siteName']
    if r['clearMean']: a['cw'] += float(r['clearMean']) * rn
    a['hp'].append(float(r['hpAvg'])); a['lc'].append(float(r['leechPerS']))
def agg(a):
    return {'rounds': a['r'], 'deaths': a['d'], 'dr': a['d'] / max(1, a['r'] + a['d']), 'clear': a['cw'] / max(1, a['r']), 'hp': st.mean(a['hp']), 'leech': st.mean(a['lc']), 'seeds': a['n'], 'site': a['site']}
out = {k: agg(a) for k, a in A.items()}
if __name__ == '__main__':
    print('| ★ | build | %s | 地點 | 變體 | 種子 | 過關輪 | 死亡 | 死亡率 | 平均過關秒 | Δ過關%% | 平均生命%% | 偷取回復 %%最大生命/秒 |' % key)
    print('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for k in sorted(out):
        o = out[k]; b = out.get((k[0], k[1], k[2], 'none')) or out.get((k[0], k[1], k[2], k[3].replace('all4', 'none')))
        dc = (o['clear'] / b['clear'] - 1) * 100 if b and b['clear'] else float('nan')
        print(f"| {k[0]} | {k[1]} | {k[2]} | {o['site']} | {k[3]} | {o['seeds']} | {o['rounds']} | {o['deaths']} | {o['dr']*100:.1f}% | {o['clear']:.1f} | {dc:+.1f} | {o['hp']*100:.1f} | {o['leech']:.2f} |")
