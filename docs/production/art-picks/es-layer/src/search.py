import sys, warnings; warnings.filterwarnings('ignore')
sys.path.insert(0, '/workspace/d2final'); sys.path.insert(0, '/workspace/affix-icons/blk')
from lib import *
from pal import REF
import numpy as np, colour
CONF = dict(REF); CONF.update({'--block': '#a9b8c3', '--block-dim': '#40484e', '--block-regen': '#758088', '--block-hi': '#eaf2f8'})
for k in ('--prog-lo', '--border', '--hp', '--tx-dim'): CONF.pop(k, None)
CV = [None, 'Protanomaly', 'Deuteranomaly', 'Tritanomaly']
keys = list(CONF)
def tolab(hs): return np.array([lab(h) for h in hs])
simlab = {cv: tolab([CONF[k] if cv is None else sim(CONF[k], cv) for k in keys]) for cv in CV}
def de_vec(l1, L2):
    return colour.difference.delta_E_CIE2000(np.repeat(l1[None], len(L2), 0), L2)
def score(h_):
    out = []
    for cv in CV:
        l = np.array(lab(h_ if cv is None else sim(h_, cv))); d = de_vec(l, simlab[cv]); out.append((d.min(), keys[d.argmin()]))
    return out
def ingamut(L, C, h):
    x = from_lch(L, C, h); return x if np.allclose(lch(x)[:2], [L, C], atol=1.2) else None
if __name__ == '__main__':
    mode = sys.argv[1]
    Lmin = {'N': 71, 'S': 44}[mode]
    res = []
    for L in range(Lmin, 93, 2):
        for C in range(4, 64, 4):
            for h in range(0, 360, 10):
                x = ingamut(L, C, h)
                if not x: continue
                if cr(x, '#934341') < 3 and mode == 'N': continue
                if cr(x, '#1d1a17') < 3 or cr(x, '#000000') < 3: continue
                s = score(x); res.append((min(a for a, _ in s), s[0][0], x, L, C, h, [(round(a, 1), k) for a, k in s]))
    res.sort(key=lambda r: -r[0])
    for r in res[:25]: print(round(r[0], 1), round(r[1], 1), r[2:6], r[6])
    # best per hue family
    fam = {'gold/ivory': (60, 110), 'violet/lilac': (280, 330), 'teal/mint': (150, 200), 'blue': (220, 270), 'rose': (340, 360)}
    for f, (a, b) in fam.items():
        rr = [r for r in res if a <= r[5] <= b]
        if rr: print(f, round(rr[0][0], 1), rr[0][2:6], rr[0][6])
