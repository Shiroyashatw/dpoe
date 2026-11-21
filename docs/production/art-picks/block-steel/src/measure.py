# 特殊詞圖示候選：量測＋預覽（Game Art Director 2026-11-21）
import os, re, json, math, itertools, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, '/workspace/d2final/equip')
import icons_v04 as UI   # UIUX v0.4 草稿遮罩：腐化 CORR、災魘 CAL（只拿外形當比較對象）
OUT = '/workspace/dpoe-docs/docs/production/art-picks/affix-icons-draft'
OV = os.path.join(OUT, 'overview'); os.makedirs(OV, exist_ok=True)
MOCK = '/workspace/mockups/W3-character-mock-1021'
SPEC = '/workspace/dpoe-docs/docs/production/specs/M2-36-palette-tokens.md'
PAL = set(h.lower() for h in re.findall(r'#[0-9a-fA-F]{6}', open(SPEC).read()))
FR = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'; FB = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
def F(sz, b=False): return ImageFont.truetype(FB if b else FR, max(1, int(round(sz))), index=3)
H = lambda h: tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
T = {'scene-void': '#16130f', 'panel-inset': '#1d1a17', 'rar-magic-bg': '#23232b', 'rar-rare-bg': '#26241b',
     'cell-corrupt': '#4b1e1e', 'cell-cal': '#352642', 'panel': '#25211e', 'panel-raised': '#2c2825',
     'tx-strong': '#fbf9f6', 'tx': '#e8e5e1', 'tx-dim': '#aeaba7', 'good': '#95e886', 'border': '#817b75',
     'rar-magic': '#9da7ff', 'rar-rare-frame': '#ccb72e', 'cal-stripe': '#524165', 'corr-dash': '#6f3a38',
     'cat-corr': '#ff6066', 'cat-cal': '#bd7aff', 'warn': '#a9ae68', 'border-cap': '#d9d3cd'}
PLATE = (37, 33, 30, round(0.92 * 255))
BG5 = ['panel-inset', 'rar-magic-bg', 'rar-rare-bg', 'cell-corrupt', 'cell-cal']
BGX = ['panel', 'panel-raised']
VOID = H(T['scene-void'])

def lum(c):
    c = [v / 255 for v in c[:3]]; c = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def cr(a, b):
    la, lb = lum(a), lum(b); return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
def Lstar(c):
    y = lum(c); return 116 * (y ** (1 / 3) if y > 0.008856 else (7.787 * y + 16 / 116)) - 16

def load(k, v, N): return np.array(Image.open(f'{OUT}/affix_{k}_{N}/affix_{k}_{N}-{v}.png').convert('RGBA'))
NAME = {'frac': '破裂', 'mem': '追憶'}
CANDS = [(k, v) for k in ('frac', 'mem') for v in 'abcd']
def cid(k, v): return f'{NAME[k]}-{v}'

# ---------- 比較對象（16 格）
def lock_mask(solid):
    im = Image.new('L', (16, 16), 0); d = ImageDraw.Draw(im)
    d.rectangle((3, 7, 12, 13), outline=255, fill=255 if solid else None, width=1)
    d.arc((5, 3, 11, 9), 180, 360, fill=255, width=1); d.line((5, 6, 5, 7), fill=255); d.line((10, 6, 10, 7), fill=255)
    return np.asarray(im) > 127
def star4_mask():   # 角色頁示意圖 render_mock.star4（r 5.5、內角 0.32r），12 px
    S = 8; im = Image.new('L', (12 * S, 12 * S), 0); d = ImageDraw.Draw(im); cx = cy = 6 * S; r = 5.5 * S; q = r * 0.32
    d.polygon([(cx, cy - r), (cx + q, cy - q), (cx + r, cy), (cx + q, cy + q), (cx, cy + r), (cx - q, cy + q), (cx - r, cy), (cx - q, cy - q)], fill=255)
    return np.asarray(im.resize((12, 12), Image.BOX)) >= 128
def tri_mask():     # ▲ 12/700 字形
    im = Image.new('L', (16, 16), 0); d = ImageDraw.Draw(im); d.text((8, 8), '▲', font=F(12, True), fill=255, anchor='mm')
    return np.asarray(im) >= 128
WY = np.array(Image.open(f'{MOCK}/assets/art-picks/wangyin_chixiao_16-s5404.png').convert('RGBA'))
def vis_mask(a, bg=T['panel-inset']):
    """看得見的部分：不透明且對普通格底 ≥1.5:1（描邊、王印暗色印身都看不見）。"""
    o = a[..., 3] > 0; out = np.zeros(o.shape, bool)
    for y, x in zip(*np.nonzero(o)): out[y, x] = cr(a[y, x], H(bg)) >= 1.5
    return out
REFS = {'✦（12）': star4_mask(), '▲（12/700）': tri_mask(), '王印 16': vis_mask(WY), '鎖 實心': lock_mask(True),
        '鎖 空心': lock_mask(False), '腐化（UIUX v0.4 草稿外形）': UI.CORR, '災魘徽章（UIUX 草稿外形）': UI.CAL}
REFS_STRICT = dict(REFS); REFS_STRICT['王印 16'] = WY[..., 3] > 0
def center(m, S=24):
    ys, xs = np.nonzero(m); out = np.zeros((S, S), bool); cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2
    for y, x in zip(ys, xs):
        yy, xx = int(round(y - cy + S / 2)), int(round(x - cx + S / 2))
        if 0 <= yy < S and 0 <= xx < S: out[yy, xx] = True
    return out
def d_iou(a, b):
    A, B = center(a), center(b); return round(1 - float((A & B).sum() / (A | B).sum()), 3)

def checks(a, N):
    o = a[..., 3] > 0
    cols = sorted(set('#%02x%02x%02x' % tuple(p[:3]) for p in a[o]))
    off = int(sum(1 for p in a[o] if ('#%02x%02x%02x' % tuple(p[:3])) not in PAL))
    alph = sorted(set(int(x) for x in np.unique(a[..., 3])))
    ol = o & (a[..., :3] == VOID).all(-1)
    thick = int(sum(1 for y in range(N - 1) for x in range(N - 1) if ol[y:y + 2, x:x + 2].all()))
    # 描邊必須包住所有填色：填色像素的四鄰不能是透明
    fill = o & ~ol; p = np.pad(o, 1)
    leak = int((fill & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])).sum())
    chk = 0
    for y in range(N - 1):
        for x in range(N - 1):
            q = a[y:y + 2, x:x + 2]
            if (q[..., 3] > 0).all():
                A, B, C, D = [tuple(q[i, j, :3]) for i, j in ((0, 0), (0, 1), (1, 0), (1, 1))]
                if A == D and B == C and A != B: chk += 1
    ys, xs = np.nonzero(o)
    margin = dict(top=int(ys.min()), left=int(xs.min()), bottom=int(N - 1 - ys.max()), right=int(N - 1 - xs.max()))
    return dict(colors=len(cols), palette=cols, off_palette=off, alpha=alph, outline_2x2=thick, fill_without_outline=leak,
                checker2x2=chk, margin=margin)

def main_tok(k): return T['tx-strong'] if k == 'frac' else '#ade2f9'
def run():
    global M
    M = {'method': {'1-IoU': 'UIUX icons_v04.iou 同法：外框中心對齊 24×24，16 px；「看得見」＝不透明且對 --panel-inset ≥1.5:1（描邊 1.07–1.33 看不見、王印暗印身 #33302b 1.3 看不見）；「含描邊」＝整個 alpha',
                         'contrast': 'WCAG 2.x；每張圖除描邊外每一色對底色，報主色與最低色',
                         'palette': 'M2-36-palette-tokens.md 全部 hex（%d 色）' % len(PAL)},
         'files': {}, 'pairs_vis': {}, 'pairs_strict': {}, 'refs_vis': {}, 'refs_strict': {}, 'contrast': {}, 'gray': {}}
    for k, v in CANDS:
        for N in (16, 32):
            a = load(k, v, N); M['files'][f'affix_{k}_{N}-{v}.png'] = checks(a, N)
            nn = np.array(Image.fromarray(load(k, v, 16)).resize((32, 32), Image.NEAREST))
            if N == 32: M['files'][f'affix_{k}_{N}-{v}.png']['is_nn_of_16'] = bool((nn == a).all())
        a = load(k, v, 16); vm = vis_mask(a); sm = a[..., 3] > 0
        M['refs_vis'][cid(k, v)] = {r: d_iou(vm, m) for r, m in REFS.items()}
        M['refs_strict'][cid(k, v)] = {r: d_iou(sm, m) for r, m in REFS_STRICT.items()}
        o = a[..., 3] > 0; cols = set(tuple(p[:3]) for p in a[o]) - {VOID}
        M['contrast'][cid(k, v)] = {b: {'main': round(cr(H(main_tok(k)), H(T[b])), 2), 'min': round(min(cr(c, H(T[b])) for c in cols), 2),
                                        'outline': round(cr(VOID, H(T[b])), 2)} for b in BG5 + BGX}
        Ls = [Lstar(tuple(p[:3])) for p in a[vm]]
        M['gray'][cid(k, v)] = round(float(np.mean(Ls)), 1)
    for (k1, v1), (k2, v2) in itertools.product([c for c in CANDS if c[0] == 'frac'], [c for c in CANDS if c[0] == 'mem']):
        a, b = load(k1, v1, 16), load(k2, v2, 16)
        M['pairs_vis'][f'{cid(k1, v1)}×{cid(k2, v2)}'] = d_iou(vis_mask(a), vis_mask(b))
        M['pairs_strict'][f'{cid(k1, v1)}×{cid(k2, v2)}'] = d_iou(a[..., 3] > 0, b[..., 3] > 0)
    wyv = vis_mask(WY); M['gray']['王印 16（看得見部分）'] = round(float(np.mean([Lstar(tuple(p[:3])) for p in WY[wyv]])), 1)
    M['gray']['✦／鎖 --tx-strong'] = round(Lstar(H(T['tx-strong'])), 1); M['gray']['▲ --good'] = round(Lstar(H(T['good'])), 1)
    M['gray']['腐化 --cat-corr'] = round(Lstar(H(T['cat-corr'])), 1)
    fails = []
    for c, d in M['refs_vis'].items():
        for r, x in d.items():
            if x < 0.5: fails.append(f'{c} vs {r}: {x}')
    for p, x in M['pairs_vis'].items():
        if x < 0.5: fails.append(f'{p}: {x}')
    for f, d in M['files'].items():
        if d['off_palette'] or d['alpha'] != [0, 255] or d['colors'] > 10 or d['outline_2x2'] or d['fill_without_outline']:
            fails.append(f'{f}: {d}')
    M['fails_vis'] = fails
    M['fails_strict'] = [f'{c} vs {r}: {x}' for c, d in M['refs_strict'].items() for r, x in d.items() if x < 0.5] + \
                        [f'{p}: {x}' for p, x in M['pairs_strict'].items() if x < 0.5]
    json.dump(M, open(os.path.join(OV, 'measure.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps({k: M[k] for k in ('refs_vis', 'pairs_vis', 'fails_vis', 'gray')}, ensure_ascii=False, indent=0))
    print('strict fails', len(M['fails_strict']))
    for f, d in M['files'].items(): print(f, d['colors'], d['off_palette'], d['alpha'], d['outline_2x2'], d['fill_without_outline'], d['checker2x2'], d['margin'], d.get('is_nn_of_16'))
    for c, d in M['contrast'].items(): print(c, {b: (x['main'], x['min']) for b, x in d.items()})

if __name__ == '__main__':
    run()
