import sys, warnings; warnings.filterwarnings('ignore')
sys.path.insert(0, '/workspace/d2final')
from lib import *
REF = {'--hp': '#934341', '--hp-hi': '#af6c64', '--mp': '#3a5b98', '--mp-hi': '#6b7dad', '--prog-hi': '#b6b0a8', '--prog-lo': '#3c3935',
       '--el-cold': '#ade2f9', '--el-fire': '#ee9978', '--el-light': '#f3f9a4', '--el-chaos': '#e97ccf', '--tx-strong': '#fbf9f6', '--tx': '#e8e5e1', '--tx-dim': '#aeaba7',
       '--rar-normal': '#f1ebdb', '--rar-magic': '#9da7ff', '--rar-rare': '#fbe53a', '--rar-unique': '#fa8915', '--rar-chase': '#0cf6ee', '--rar-chase-hi': '#8ffbf6',
       '--border-cap': '#d9d3cd', '--border': '#817b75', '--good': '#95e886', '--asc-hi': '#8ce1cf', '--awk': '#caaef4'}
BG = {'--panel': '#25211e', '--panel-inset': '#1d1a17', '--scene-void': '#16130f', '--scene-X-light': '#615b56'}
def mk(L, C, h): return from_lch(L, C, h)
def regen_for(block, C, h, frac):
    yb = Y(block); target = yb * frac
    lo, hi = 0, 100
    for _ in range(40):
        m = (lo + hi) / 2
        if Y(mk(m, C, h)) < target: lo = m
        else: hi = m
    return mk((lo + hi) / 2, C, h)
def report(name, s):
    print('==', name, s)
    for k, v in s.items():
        print(f'  {k} {v} L*={lch(v)[0]:.1f} C={lch(v)[1]:.1f} h={lch(v)[2]:.0f}', {b: round(cr(v, bh), 2) for b, bh in BG.items()})
    print('  regen/block Y', round(Y(s['--block-regen']) / Y(s['--block']), 3))
    b = s['--block']
    near = sorted(((round(de(b, r), 1), k) for k, r in REF.items()))[:6]; print('  ΔE block nearest', near)
    for kk in ('--block-hi', '--block-regen', '--block-dim'):
        print('  ', kk, sorted(((round(de(s[kk], r), 1), k) for k, r in REF.items()))[:3])
    for cv in MACH:
        sl = {k: lch(sim(v, cv))[0] for k, v in s.items()}
        ds = sorted(sl.values()); gaps = [round(ds[i + 1] - ds[i], 1) for i in range(3)]
        mins = sorted(((round(de(sim(b, cv), sim(r, cv)), 1), k) for k, r in REF.items()))[:4]
        print('  ', cv[:4], 'L* gaps', gaps, 'block vs', mins)
if __name__ == '__main__':
    import itertools
    for nm, (L, C, h) in {'A': (76, 10, 240), 'B': (75, 5, 225), 'C': (73, 16, 255)}.items():
        b = mk(L, C, h)
        s = {'--block': b, '--block-dim': mk(30, C * 0.6, h), '--block-regen': regen_for(b, C * 0.8, h, 0.45), '--block-hi': mk(95, C * 0.5, h)}
        report(nm, s)
