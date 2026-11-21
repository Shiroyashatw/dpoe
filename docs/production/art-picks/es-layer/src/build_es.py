# H11 能量護盾層 --es／--es-hi 色組草稿（Game Art Director 2026-11-21）
import os, sys, json, warnings, shutil
warnings.filterwarnings('ignore')
import numpy as np, colour
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, '/workspace/d2final'); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import hx, tohex, Y, cr, lab, lch, de, MACH, sim, from_lch
OUT = '/workspace/dpoe-docs/docs/production/art-picks/es-layer-draft'
for d in ('palette', 'overview', 'src'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
FB = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'; FR = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
def F(sz, b=False): return ImageFont.truetype(FB if b else FR, max(1, int(round(sz))), index=3)
H = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
T = {'--hp': '#934341', '--hp-hi': '#af6c64', '--mp': '#3a5b98', '--mp-hi': '#6b7dad', '--prog-hi': '#b6b0a8', '--prog-lo': '#3c3935',
     '--el-cold': '#ade2f9', '--el-fire': '#ee9978', '--el-light': '#f3f9a4', '--el-chaos': '#e97ccf', '--tx-strong': '#fbf9f6', '--tx': '#e8e5e1', '--tx-dim': '#aeaba7',
     '--rar-normal': '#f1ebdb', '--rar-magic': '#9da7ff', '--rar-rare': '#fbe53a', '--rar-unique': '#fa8915', '--rar-chase': '#0cf6ee', '--rar-chase-hi': '#8ffbf6',
     '--border-cap': '#d9d3cd', '--border': '#817b75', '--good': '#95e886', '--asc-hi': '#8ce1cf', '--awk': '#caaef4',
     '--block': '#a9b8c3', '--block-dim': '#40484e', '--block-regen': '#758088', '--block-hi': '#eaf2f8',
     '--panel': '#25211e', '--panel-inset': '#1d1a17', '--scene-void': '#16130f', '--scene-X-light': '#615b56', '--glint': '#ffffff'}
REQ = ['--el-cold', '--mp', '--mp-hi', '--prog-hi', '--block', '--block-dim', '--block-regen', '--block-hi', '--rar-normal', '--rar-magic', '--rar-rare',
       '--rar-unique', '--rar-chase', '--rar-chase-hi', '--tx-strong']
EXT = ['--hp-hi', '--good', '--asc-hi', '--awk', '--el-fire', '--el-light', '--el-chaos', '--border-cap', '--tx', '--tx-dim']
SPEC = {'A': ('淡金（建議）', (79, 28, 80), (95, 10, 80)), 'B': ('淡紫', (77, 24.5, 300), (95, 8, 300)), 'C': ('薄荷', (77, 40, 145), (95, 12, 155))}
SETS = {k: {'name': n, '--es': from_lch(*a), '--es-hi': from_lch(*b), 'LCh_src': [list(a), list(b)]} for k, (n, a, b) in SPEC.items()}
OLD = 'rgb(--glint-rgb / 0.6)'
def over(fg, bg, a): f, b = np.array(hx(fg)), np.array(hx(bg)); return tohex(f * a + b * (1 - a))
OLD_ON_INSET = over('#ffffff', '#1d1a17', 0.6)    # 舊做法（glint 60%）疊在條底上的實際色
CV = {'normal': None, 'protan': 'Protanomaly', 'deutan': 'Deuteranomaly', 'tritan': 'Tritanomaly'}
S = lambda h, cv: h if cv is None else sim(h, cv)
NB = {'--hp': '條內上方：生命填色（低血時也是 --hp，只是短）', '--panel-inset': '細條軌道＋生命空的部分', '--border': '條外框 1 px（細條下緣貼著）',
      '#000000': '若加 1 px 分隔線', '--mp': '下方魔力條', '--prog-hi': '經驗條填色'}
M = {'method': 'WCAG 2.x；CIEDE2000；Machado 2009 嚴重度 1.0（colour-science，同 M2-36 量法）',
     'bar': {'390': 'P37 10,508 344×18；1 px --border 框；細條 E01 11,522 342×3（框內最底 3 px），軌道 --panel-inset',
             '1280': 'D59 340,652 450×20；細條 E01 341,668 448×3', 'source': '/workspace/wireframes-draft/W-hud-es-layer-1155/README.md（B 案）'},
     'old_glint60_on_inset': OLD_ON_INSET, 'old_glint60_on_inset_cr_hp': round(cr(OLD_ON_INSET, '#934341'), 2), 'old_glint60_on_inset_cr_inset': round(cr(OLD_ON_INSET, '#1d1a17'), 2), 'sets': {}}
for k, s in SETS.items():
    e = {'name': s['name'], 'hex': {'--es': s['--es'], '--es-hi': s['--es-hi']}}
    for t in ('--es', '--es-hi'):
        x = s[t]; e[t] = {'LCh': [round(v, 1) for v in lch(x)],
                          'contrast': {n: round(cr(x, T.get(n, n)), 2) for n in NB}}
        e[t]['contrast']['--es' if t == '--es-hi' else '--es-hi'] = round(cr(s['--es'], s['--es-hi']), 2)
        e[t]['dE'] = {cvn: {r: round(de(S(x, cv), S(T[r], cv)), 1) for r in REQ + EXT} for cvn, cv in CV.items()}
        e[t]['min_req'] = {cvn: min((v, r) for r, v in e[t]['dE'][cvn].items() if r in REQ) for cvn in CV}
        e[t]['min_ext'] = {cvn: min((v, r) for r, v in e[t]['dE'][cvn].items() if r in EXT) for cvn in CV}
        e[t]['dL_by_sim'] = {cvn: {r: round(lch(S(x, cv))[0] - lch(S(T[r], cv))[0], 1) for r in ('--hp', '--panel-inset', '--mp', '--prog-hi', '--block', '--el-cold')} for cvn, cv in CV.items()}
    c = e['--es']['contrast']
    e['pass'] = {'es_vs_hp>=3': c['--hp'] >= 3, 'es_vs_track>=3': c['--panel-inset'] >= 3, 'separator_needed': not (c['--hp'] >= 3 and c['--panel-inset'] >= 3),
                 'es_vs_required_min_dE_normal>=10': e['--es']['min_req']['normal'][0] >= 10,
                 'es_vs_required_min_dE_cvd>=8': all(e['--es']['min_req'][cv][0] >= 8 for cv in ('protan', 'deutan', 'tritan')),
                 'C*<=40（飽和色規則）': e['--es']['LCh'][1] <= 40.5}
    M['sets'][k] = e
json.dump({k: {'name': s['name'], '--es': s['--es'], '--es-hi': s['--es-hi']} for k, s in SETS.items()}, open(f'{OUT}/palette/sets.json', 'w'), ensure_ascii=False, indent=1)
sw = Image.new('RGB', (640, 230), H('#25211e')); d = ImageDraw.Draw(sw)
d.text((10, 8), 'H11 能量護盾層 token 草稿｜每組：--es、--es-hi、放在生命條底的樣子', font=F(14, True), fill=H('#fbf9f6'))
for i, (k, s) in enumerate(SETS.items()):
    y = 40 + i * 62; d.text((10, y + 14), f'{k} {s["name"]}', font=F(13, True), fill=H('#e8e5e1'))
    for j, t in enumerate(('--es', '--es-hi')):
        x = 130 + j * 130; d.rectangle((x, y, x + 110, y + 36), fill=H(s[t]), outline=H('#000000')); d.text((x, y + 40), f'{t} {s[t]}', font=F(10), fill=H('#aeaba7'))
    x = 400; d.rectangle((x, y, x + 220, y + 20), fill=H('#1d1a17'), outline=H('#817b75')); d.rectangle((x + 1, y + 1, x + 160, y + 19), fill=H('#934341'))
    d.rectangle((x + 1, y + 16, x + 120, y + 18), fill=H(s['--es'])); d.rectangle((x + 119, y + 16, x + 120, y + 18), fill=H(s['--es-hi']))
sw.save(f'{OUT}/palette/swatches.png')

# ---------- HUD 示意
BS = {'--block': '#a9b8c3', '--block-dim': '#40484e', '--block-regen': '#758088', '--block-hi': '#eaf2f8'}
SHIELD = Image.open('/workspace/dpoe-docs/docs/production/art-picks/block-steel/hud_block_16.png').convert('RGBA')
def arc(R, th=4):
    W, Hh = 2 * R + 2, R + 2; ss = 4
    yy, xx = np.mgrid[0:Hh * ss, 0:W * ss]; cx, cy = W * ss / 2, (R + 1) * ss
    r = np.hypot(xx + 0.5 - cx, yy + 0.5 - cy) / ss; up = (yy + 0.5) <= cy
    band = up & (r >= R - th) & (r <= R); rim = up & (r >= R - th - 1) & (r <= R + 1) & ~band
    o = np.zeros((Hh * ss, W * ss, 4), np.uint8); o[rim] = (0, 0, 0, 255); o[band] = H(BS['--block']) + (255,)
    return Image.fromarray(o[ss // 2::ss, ss // 2::ss], 'RGBA')
# 尺寸（取自 UIUX B 案與 1138 草稿；藥劑、經驗條為示意位置）
G = {'390': dict(crop=(0, 470, 390, 562), bar=(10, 508, 344, 18), mp=(10, 530, 344, 18), xp=(0, 552, 390, 6), arc=(278, 478, 24), fl=[(370, 517, 10), (370, 539, 10)], fs=14, sep=False),
     '1280': dict(crop=(330, 606, 830, 712), bar=(340, 652, 450, 20), mp=(340, 676, 450, 20), xp=(340, 701, 450, 6), arc=(726, 616, 28), fl=[(806, 662, 11), (806, 686, 11)], fs=16)}
STATES = [('full', 820, 600, False, '滿'), ('part', 820, 240, False, '被打掉 240/600'), ('rech', 820, 90, True, '充能中 90/600（前緣 --es-hi）'),
          ('zero', 820, 0, False, '能量護盾 0'), ('lowhp', 300, 240, False, '低血 300/968＋240/600')]
def hud(size, bg, es, eh, life, esv, rech, sep=False):
    g = G[size]; x0, y0, x1, y1 = g['crop']; img = Image.new('RGBA', (x1 - x0, y1 - y0), H(T[bg]) + (255,)); d = ImageDraw.Draw(img)
    o = lambda x, y: (x - x0, y - y0)
    # 下方面板（390 從 552 起）
    if size == '390': d.rectangle((*o(0, 552), *o(390, 562)), fill=H(T['--panel']))
    def bar(rect, fill, frac, txt):
        x, y, w, h = rect; X, Yy = o(x, y)
        d.rectangle((X, Yy, X + w - 1, Yy + h - 1), fill=H(T['--panel-inset']), outline=H(T['--border']))
        if frac > 0: d.rectangle((X + 1, Yy + 1, X + int(round((w - 2) * frac)), Yy + h - 2), fill=H(T[fill]))
        return X, Yy, w, h
    X, Yy, w, h = bar(g['bar'], '--hp', life / 968, '')
    # 能量護盾細條：框內最底 3 px，軌道 --panel-inset
    sy = Yy + h - 4; iw = w - 2
    if sep: d.line((X + 1, sy - 1, X + w - 2, sy - 1), fill=(0, 0, 0))
    d.rectangle((X + 1, sy, X + w - 2, sy + 2), fill=H(T['--panel-inset']))
    n = int(round(iw * esv / 600))
    if n > 0: d.rectangle((X + 1, sy, X + n, sy + 2), fill=H(es))
    if rech and n > 0: d.rectangle((X + max(1, n - 1), sy, X + n, sy + 2), fill=H(eh))
    if life / 968 < 0.35: d.rectangle((X - 2, Yy - 2, X + w + 1, Yy + h + 1), outline=H(T['--hp-hi']))
    txt = f'生命 {life} / 968・能量護盾 {esv} / 600'
    d.text((X + w / 2, Yy + (h - 3) / 2 - 1), txt, font=F(g['fs'] - (1 if size == '390' else 0), True), fill=H(T['--tx-strong']), anchor='mm')
    X2, Y2, w2, h2 = bar(g['mp'], '--mp', 0.6, '')
    d.text((X2 + w2 / 2, Y2 + h2 / 2), '魔力 240 / 400', font=F(g['fs'] - 1, True), fill=H(T['--tx-strong']), anchor='mm')
    x, y, ww, hh = g['xp']; Xx, Yx = o(x, y)
    d.rectangle((Xx, Yx, Xx + ww - 1, Yx + hh - 1), fill=H(T['--prog-lo'])); d.rectangle((Xx, Yx, Xx + int(ww * 0.62), Yx + hh - 1), fill=H(T['--prog-hi']))
    for (cx, cy, r), col in zip(g['fl'], ('--hp-hi', '--mp-hi')):
        cx, cy = o(cx, cy); d.ellipse((cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1), outline=(0, 0, 0)); d.arc((cx - r, cy - r, cx + r, cy + r), -90, 200, fill=H(T[col]), width=2)
    ax, ay, R = g['arc']; a = arc(R); A = o(ax, ay); img.paste(a, A, a)
    ic = (16, 6) if size == '390' else (20, 10); img.paste(SHIELD, (A[0] + ic[0], A[1] + ic[1]), SHIELD)
    return img
def set_sheet(k, sep=False):
    s = SETS[k]; rows = [(size, bg) for bg in ('--panel', '--scene-void', '--scene-X-light') for size in ('390', '1280')]
    cw = {'390': 390, '1280': 500}; LW = 120; colw = 500 + 8
    img = Image.new('RGB', (LW + 5 * colw, 52 + len(rows) * 112), H('#1d1a17')); d = ImageDraw.Draw(img)
    d.text((8, 6), f'{k} {s["name"]}：--es {s["--es"]}／--es-hi {s["--es-hi"]}' + ('｜加 1 px #000 分隔線' if sep else '') + '｜格擋弧＝A 冷鋼＋hud_block_16', font=F(14, True), fill=H('#fbf9f6'))
    for j, st in enumerate(STATES): d.text((LW + j * colw, 30), st[4], font=F(11, True), fill=H('#e8e5e1'))
    for i, (size, bg) in enumerate(rows):
        y = 52 + i * 112; d.text((8, y + 30), size, font=F(12, True), fill=H('#e8e5e1')); d.text((8, y + 50), bg, font=F(10), fill=H('#aeaba7'))
        for j, (_, life, esv, rech, _) in enumerate(STATES):
            img.paste(hud(size, bg, s['--es'], s['--es-hi'], life, esv, rech, sep).convert('RGB'), (LW + j * colw, y))
    return img
def cvd(im, cv):
    a = np.asarray(im.convert('RGB')).astype(float) / 255; l = colour.models.eotf_sRGB(a)
    s = np.clip(np.einsum('ij,hwj->hwi', MACH[cv], l), 0, 1); return Image.fromarray(np.clip(np.round(colour.models.eotf_inverse_sRGB(s) * 255), 0, 255).astype(np.uint8))
def tag(im, t):
    d = ImageDraw.Draw(im); d.rectangle((im.width - 300, 0, im.width, 24), fill=(0, 0, 0)); d.text((im.width - 292, 3), t, font=F(14, True), fill=(255, 255, 255)); return im
SIMS = (('protan', 'Protanomaly'), ('deutan', 'Deuteranomaly'), ('tritan', 'Tritanomaly'))
for k in SETS:
    sh = set_sheet(k); sh.save(f'{OUT}/overview/es-{k}-1x.png')
    for n, cv in SIMS: tag(cvd(sh, cv), f'模擬 {n}（Machado 1.0）').save(f'{OUT}/overview/es-{k}-1x-{n}.png')
    tag(sh.convert('L').convert('RGB'), '灰階').save(f'{OUT}/overview/es-{k}-1x-gray.png')
# 放大比較：只裁生命條＋魔力條＋弧（390），四倍，三組＋舊白 60%＋分隔線版
def zoom():
    rows = [('舊：白 60%（現行 M2-36 修正 1-4）', None, False)] + [(f'{k} {SETS[k]["name"]}', k, False) for k in SETS] + [(f'{k} ＋1 px #000 分隔線', k, True) for k in SETS]
    tiles = []
    for lab_, k, sep in rows:
        r = []
        for st in (STATES[1], STATES[2], STATES[4]):
            if k is None:
                im = hud('390', '--scene-X-light', '#ffffff', '#ffffff', st[1], st[2], st[3]);
                # 疊 60%：用白在 hp／inset 上的實際色重畫細條
                a = np.array(im); X, Yy = 10, 508 - 470; sy = Yy + 18 - 4; n = int(round(342 * st[2] / 600))
                a[sy:sy + 3, X + 1:X + 1 + n, :3] = np.round(np.array(H('#ffffff')) * 0.6 + np.array(H('#1d1a17')) * 0.4); im = Image.fromarray(a)
            else:
                im = hud('390', '--scene-X-light', SETS[k]['--es'], SETS[k]['--es-hi'], st[1], st[2], st[3], sep)
            r.append(im.crop((0, 500 - 470, 200, 552 - 470)))
        tiles.append((lab_, r))
    Z = 4; tw, th = 200 * Z, 52 * Z
    img = Image.new('RGB', (230 + 3 * (tw + 8), 30 + len(tiles) * (th + 8)), H('#1d1a17')); d = ImageDraw.Draw(img)
    d.text((8, 6), '390 生命條左半 ×4（底＝淺磚）：被打掉／充能中／低血', font=F(14, True), fill=H('#fbf9f6'))
    for i, (lab_, r) in enumerate(tiles):
        y = 30 + i * (th + 8); d.text((8, y + th / 2), lab_, font=F(12, True), fill=H('#e8e5e1'), anchor='lm')
        for j, im in enumerate(r): img.paste(im.convert('RGB').resize((tw, th), Image.NEAREST), (230 + j * (tw + 8), y))
    return img
z = zoom(); z.save(f'{OUT}/overview/es-zoom-4x.png')
for n, cv in SIMS: tag(cvd(z, cv), f'模擬 {n}').save(f'{OUT}/overview/es-zoom-4x-{n}.png')
tag(z.convert('L').convert('RGB'), '灰階').save(f'{OUT}/overview/es-zoom-4x-gray.png')
json.dump(M, open(f'{OUT}/measure.json', 'w'), ensure_ascii=False, indent=1, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
for f in ('build_es.py', 'search.py', 'evalc.py'): shutil.copy(f'/workspace/affix-icons/es/{f}', f'{OUT}/src/{f}')
shutil.copy('/workspace/d2final/lib.py', f'{OUT}/src/lib_d2final.py')
if __name__ == '__main__':
    print('old', OLD_ON_INSET, M['old_glint60_on_inset_cr_hp'])
    for k, e in M['sets'].items():
        print(k, e['hex'], e['pass'])
        for t in ('--es', '--es-hi'): print(' ', t, e[t]['LCh'], e[t]['contrast'], 'req', e[t]['min_req'], 'ext', e[t]['min_ext'])
        print('  dL', e['--es']['dL_by_sim'])
