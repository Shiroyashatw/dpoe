import sys, warnings; warnings.filterwarnings('ignore')
sys.path.insert(0, '/workspace/d2final'); sys.path.insert(0, '/workspace/affix-icons/blk')
from lib import *
from pal import REF
ALL = dict(REF); ALL.update({'--block': '#a9b8c3', '--block-dim': '#40484e', '--block-regen': '#758088', '--block-hi': '#eaf2f8'})
REQ = ['--el-cold','--mp','--mp-hi','--prog-hi','--block','--block-dim','--block-regen','--block-hi','--rar-normal','--rar-magic','--rar-rare','--rar-unique','--rar-chase','--rar-chase-hi','--tx-strong']
EXT = ['--hp-hi','--good','--asc-hi','--awk','--el-fire','--el-light','--el-chaos','--border-cap','--tx','--tx-dim']
CV = {'normal': None, 'protan': 'Protanomaly', 'deutan': 'Deuteranomaly', 'tritan': 'Tritanomaly'}
S = lambda h, cv: h if cv is None else sim(h, cv)
def ev(es, eh=None):
    o = {'es': es, 'LCh': [round(x, 1) for x in lch(es)], 'cr_hp': round(cr(es, '#934341'), 2), 'cr_inset': round(cr(es, '#1d1a17'), 2), 'cr_border': round(cr(es, '#817b75'), 2)}
    for cvn, cv in CV.items():
        d = {k: round(de(S(es, cv), S(ALL[k], cv)), 1) for k in REQ + EXT}
        o[cvn] = (min((d[k], k) for k in REQ), min((d[k], k) for k in EXT))
    return o
if __name__ == '__main__':
    for c in sys.argv[1:]:
        L, C, h = map(float, c.split(',')); x = from_lch(L, C, h); print(c, ev(x))
