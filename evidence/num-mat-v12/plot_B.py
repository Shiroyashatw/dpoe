# num-mat-v12 B 的曲線圖：B_hourly_p.csv、B_inv_t1.csv → B_curves.png、B_inv.png（python3 plot_B.py；要 matplotlib）
import csv, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
font_manager.fontManager.addfont('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc')
plt.rcParams['font.family'] = 'WenQuanYi Zen Hei'
R = list(csv.DictReader(open('B_hourly_p.csv', encoding='utf8')))
I = list(csv.DictReader(open('B_inv_t1.csv', encoding='utf8')))
G = [('H12', 'v12 額度 H12', '#2a6fdb'), ('H24', '額度 H24（對照）', '#e08a1e'), ('OFF', '不限額度（＝v11 換法）', '#888888')]
CUR = ['蛻變石', '增幅石', '富豪石', '崇高石']
fig, ax = plt.subplots(4, 2, figsize=(12, 13), sharex=True)
for ci, c in enumerate(CUR):
    for si, sec in enumerate(['100', '150']):
        a = ax[ci][si]
        for g, nm, col in G:
            rows = [r for r in R if r['組'] == g and r['一輪'] == sec]
            a.plot([int(r['小時']) for r in rows], [float(r[c + '_比P50']) * 100 for r in rows], color=col, label=nm, lw=1.6)
        a.set_yscale('symlog', linthresh=100)
        a.set_ylim(0, 1500)
        a.axhline(100, color='#ccc', lw=0.8)
        a.set_title(f's{sec}　{c}：商會每小時換到 ÷ 同一小時戰鬥掉落（P50，%）', fontsize=10)
        a.grid(alpha=0.3)
        if ci == 3: a.set_xlabel('小時')
ax[0][0].legend(fontsize=8)
fig.tight_layout()
fig.savefig('B_curves.png', dpi=110)
MAT = [('木', 18000), ('鐵', 350000), ('皮', 70000), ('靈絲', 70000)]
fig, ax = plt.subplots(4, 2, figsize=(12, 13), sharex=True)
for mi, (m, cap) in enumerate(MAT):
    for si, sec in enumerate(['100', '150']):
        a = ax[mi][si]
        for g, nm, col in G:
            rows = [r for r in I if r['組'] == g and r['一輪'] == sec]
            a.plot([int(r['小時']) for r in rows], [float(r[m + '_P50']) for r in rows], color=col, label=nm, lw=1.6)
        a.axhline(cap, color='red', lw=0.8, ls='--', label='上限')
        a.set_yscale('log')
        a.set_title(f's{sec}　{m}庫存（T1 當量；木是個數；P50）', fontsize=10)
        a.grid(alpha=0.3)
        if mi == 3: a.set_xlabel('小時')
ax[0][0].legend(fontsize=8)
fig.tight_layout()
fig.savefig('B_inv.png', dpi=110)
print('B_curves.png、B_inv.png')
