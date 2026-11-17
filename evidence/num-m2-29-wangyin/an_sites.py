# 檢查 8：每個主幹地點（Lv48～83）× build × 星級，沒有印 vs 四印＋齊鳴；旗標：過關秒數下降 > 30%，或死亡率掉到約 0（沒有印 ≥ 10%、有印 ≤ 2%）
import csv, sys
from collections import defaultdict
rows = list(csv.DictReader(open(sys.argv[1])))
tag = sys.argv[2] if len(sys.argv) > 2 else 'all4'
A = defaultdict(lambda: [0, 0, 0.0, 0.0, ''])
for r in rows:
    k = (int(r['star']), int(r['site']), r['build'], r['var'])
    a = A[k]; rn, dn = int(r['rounds']), int(r['deaths'])
    a[0] += rn; a[1] += dn; a[2] += float(r['clearMean'] or 0) * rn; a[3] += float(r['simT']); a[4] = f"{r['siteName']} Lv{r['siteLv']}"
flags = []
print('| ★ | 地點 | build | 過關秒（無印） | 過關秒（四印） | Δ過關 | 死亡率（無印） | 死亡率（四印） | 過關輪/時（無→四） | 旗標 |')
print('|---|---|---|---|---|---|---|---|---|---|')
tot = defaultdict(lambda: [0, 0, 0, 0])
for star in [1, 5]:
    for site in range(14, 22):
        for b in ['phys', 'spell', 'bleed']:
            n, s = A.get((star, site, b, 'none')), A.get((star, site, b, tag))
            if not n or not s: continue
            cn, cs = n[2] / max(1, n[0]), s[2] / max(1, s[0])
            dn, ds = n[1] / max(1, n[0] + n[1]), s[1] / max(1, s[0] + s[1])
            dc = (cs / cn - 1) * 100
            f = []
            if dc < -30: f.append('過關秒數降 >30%')
            if dn >= 0.10 and ds <= 0.02: f.append('死亡率掉到約 0')
            if f: flags.append((star, n[4], b, f))
            t = tot[(star, b)]; t[0] += cn; t[1] += cs; t[2] += 1
            print(f"| {star} | {n[4]} | {b} | {cn:.1f} | {cs:.1f} | {dc:+.1f}% | {dn*100:.1f}% ({n[1]}/{n[0]+n[1]}) | {ds*100:.1f}% ({s[1]}/{s[0]+s[1]}) | {n[0]/n[3]*3600:.0f}→{s[0]/s[3]*3600:.0f} | {'⚠️ ' + '、'.join(f) if f else '—'} |")
print()
print('旗標：', flags if flags else '沒有')
