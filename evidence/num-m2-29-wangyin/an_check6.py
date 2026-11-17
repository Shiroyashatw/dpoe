# 檢查 1、2、6 的彙總（靜態，10 個種子平均）：
#  線單位＝印的增量 ÷ 對照那一條的增量（DPS 軸看 ΔDPS、防禦軸看 ΔeHP、歸墟偷取看每秒偷取回復的增量）
#  檢查 6：(a) 四印＋齊鳴各自換算成線單位加總 ≤ 5；(b) 「力量分數」＝ΔDPS% + ΔeHP%：四印＋齊鳴 vs 5 條 T2（defP 24、physP 24／spellP 69.5、ss 12、resA 14.5、life 92），偷取不在力量分數裡、另外算 1.3 條
import json, statistics as st
from collections import defaultdict
G = defaultdict(list)
for l in open('data/static_final.csv.jsonl'):
    r = json.loads(l); G[(r['build'], r['L'])].append(r['res'])
def d(rs, v, m):
    return st.mean((x[v][m] / x['none'][m] - 1) * 100 for x in rs)
def dl(rs, v): return st.mean(x[v]['leechS'] - x['none']['leechS'] for x in rs)
print('| build | Lv | 鎮嶽24÷T2 defP（eHP） | 赤霄13÷T2（DPS） | 疾霆12÷T2 ss（DPS） | 歸墟偷取1÷參考1 | 齊鳴：鎮嶽30 | 赤霄16 | 疾霆15 | 歸墟1.3 | 線單位合計 | 四印+齊鳴 ΔDPS/ΔeHP | 5 條 T2 ΔDPS/ΔeHP | 力量分數 四印 vs 5 條 |')
print('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
worst = 0
for (b, L), rs in sorted(G.items()):
    dmgT2 = 'T2_spellP' if b == 'spell' else 'T2_physP'
    x5 = 'T2x5_spell' if b == 'spell' else 'T2x5_phys'
    u = lambda v, ref, m: d(rs, v, m) / d(rs, ref, m)
    zy, cx, jt = u('zy24', 'T2_defP', 'ehp'), u('cx13', dmgT2, 'dps'), u('jt12', 'T2_ss', 'dps')
    gx = dl(rs, 'gx1') / dl(rs, 'gx1')
    zy30, cx16, jt15 = u('zy30', 'T2_defP', 'ehp'), u('cx16', dmgT2, 'dps'), u('jt15', 'T2_ss', 'dps')
    gx13 = dl(rs, 'gx13') / dl(rs, 'gx1')
    tot = zy30 + cx16 + jt15 + gx13
    worst = max(worst, tot)
    a_d, a_e, f_d, f_e = d(rs, 'all4', 'dps'), d(rs, 'all4', 'ehp'), d(rs, x5, 'dps'), d(rs, x5, 'ehp')
    print(f'| {b} | {L} | {zy:.2f} | {cx:.2f} | {jt:.2f} | {gx:.2f} | {zy30:.2f} | {cx16:.2f} | {jt15:.2f} | {gx13:.2f} | {tot:.2f} | {a_d:.1f}%/{a_e:.1f}% | {f_d:.1f}%/{f_e:.1f}% | {a_d+a_e:.1f} vs {f_d+f_e:.1f} |')
print(f'\n線單位合計最大 {worst:.2f}（門檻 5）')
