# H6 格擋值 鋼色 token＋盾牌 16 草稿（Game Art Director 2026-11-21）
import os, sys, json, math, warnings, hashlib, itertools
warnings.filterwarnings('ignore')
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, '/workspace/d2final'); sys.path.insert(0, '/workspace/affix-icons/src'); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import hx, tohex, Y, cr, lab, lch, de, MACH, sim, mix, lin
import colour
from pal import mk, regen_for, REF
import gen as G, measure as MS, shields as SHM
OUT = '/workspace/dpoe-docs/docs/production/art-picks/block-steel-draft'
for d in ('palette', 'shield_16', 'overview', 'src'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
FR = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'; FB = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
def F(sz, b=False): return ImageFont.truetype(FB if b else FR, max(1, int(round(sz))), index=3)
H = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
# ---------- 色組
SPEC = {'A': ('冷鋼（建議）', 74, 8, 250), 'B': ('青鋼', 76, 14, 215), 'C': ('亮鋼（近舊 HUD 白鋼）', 80, 6, 235)}
SETS = {}
for k, (nm, L, C, h) in SPEC.items():
    b = mk(L, C, h)
    SETS[k] = {'name': nm, 'lch': [L, C, h], '--block': b, '--block-dim': mk(30, C * 0.6, h),
               '--block-regen': regen_for(b, C * 0.8, h, 0.45), '--block-hi': mk(95, max(C * 0.5, 3), h)}
TK = ['--block', '--block-dim', '--block-regen', '--block-hi']
BGS = {'--panel': '#25211e', '--panel-inset': '#1d1a17', '--panel-raised': '#2c2825', '--scene-void': '#16130f（場景最暗）',
       '--scene-X-light': '#615b56（場景最亮 token）'}
BGH = {k: v[:7] for k, v in BGS.items()}
LAMP = mix('#d9a774', '#615b56', 0.16)   # 淺磚＋燈籠光暈 16% 最亮處
BGH['淺磚＋燈光 16%'] = LAMP
CMP = ['--hp', '--hp-hi', '--mp', '--mp-hi', '--prog-hi', '--prog-lo', '--el-cold', '--el-fire', '--el-light', '--el-chaos', '--tx-strong', '--tx-dim',
       '--rar-normal', '--rar-magic', '--rar-rare', '--rar-unique', '--rar-chase', '--border-cap', '--asc-hi', '--awk', '--good']
CV = {'normal': None, 'protan': 'Protanomaly', 'deutan': 'Deuteranomaly', 'tritan': 'Tritanomaly'}
def S(h, cv): return h if cv is None else sim(h, cv)
M = {'method': '對比 WCAG 2.x；ΔE CIEDE2000；色盲 Machado 2009 嚴重度 1.0（colour-science，同 /workspace/d2final/lib.py＝M2-36 色票量法）',
     'sets': {}, 'checks': {}}
for k, s in SETS.items():
    e = {'hex': {t: s[t] for t in TK}, 'name': s['name']}
    e['LCh'] = {t: [round(float(x), 1) for x in lch(s[t])] for t in TK}
    e['contrast'] = {t: {b: round(cr(s[t], bh), 2) for b, bh in BGH.items()} for t in TK}
    e['regen_over_block_Y'] = round(Y(s['--block-regen']) / Y(s['--block']), 3)
    e['Lstar_by_sim'] = {}; e['Lstar_gaps_min'] = {}
    for cvn, cv in CV.items():
        Ls = {t: round(float(lch(S(s[t], cv))[0]), 1) for t in TK}; e['Lstar_by_sim'][cvn] = Ls
        v = sorted(Ls.values()); e['Lstar_gaps_min'][cvn] = round(min(v[i + 1] - v[i] for i in range(3)), 1)
    e['dE_block'] = {cvn: {r: round(de(S(s['--block'], cv), S(REF[r], cv)), 1) for r in CMP} for cvn, cv in CV.items()}
    e['dE_all'] = {t: {cvn: {r: round(de(S(s[t], cv), S(REF[r], cv)), 1) for r in CMP} for cvn, cv in CV.items()} for t in TK}
    c = e['contrast']
    e['pass'] = {'block_vs_panel>=3': c['--block']['--panel'] >= 3, 'block_vs_scene_void>=3': c['--block']['--scene-void'] >= 3,
                 'block_vs_scene_light>=3': c['--block']['--scene-X-light'] >= 3, 'dim_vs_panel>=1.5': c['--block-dim']['--panel'] >= 1.5,
                 'regen_Y_40-50%': 0.40 <= e['regen_over_block_Y'] <= 0.50, 'Lstar_gap>=15_all_sims': all(x >= 15 for x in e['Lstar_gaps_min'].values())}
    M['sets'][k] = e
json.dump({k: {'name': s['name'], **{t: s[t] for t in TK}} for k, s in SETS.items()}, open(f'{OUT}/palette/sets.json', 'w'), ensure_ascii=False, indent=1)

# 色票卡
def swatches():
    img = Image.new('RGB', (760, 300), H('#25211e')); d = ImageDraw.Draw(img)
    d.text((10, 8), 'H6 格擋值 鋼色 token 草稿｜A／B／C 三組（左到右 --block、-dim、-regen、-hi）', font=F(14, True), fill=H('#fbf9f6'))
    for i, (k, s) in enumerate(SETS.items()):
        y = 40 + i * 84; d.text((10, y + 30), f'{k} {s["name"]}', font=F(13, True), fill=H('#e8e5e1'))
        for j, t in enumerate(TK):
            x = 200 + j * 136; d.rectangle((x, y, x + 120, y + 52), fill=H(s[t]), outline=H('#000000'))
            d.text((x, y + 56), f'{t} {s[t]}', font=F(11), fill=H('#aeaba7'))
    return img
sw = swatches(); sw.save(f'{OUT}/palette/swatches.png')

# ---------- 盾牌 16（★ A 色組畫；其他色組另存 by-set/）
def shield(v, setk):
    rows = getattr(SHM, f'SH_{v.upper()}').strip('\n').split('\n'); g = np.array([list(r) for r in rows])
    s = SETS[setk]; G.TOK.update({'b': s['--block'], 'r': s['--block-regen'], 'hh': s['--block-hi'], 'dd': s['--block-dim'], 'vv': '#16130f'})
    return G.compose(16, [(g == 'W', 'b'), (g == 'm', 'r'), (g == 'h', 'hh'), (g == 'd', 'dd'), (g == 'v', 'vv')])
SHIELDS = {}
os.makedirs(f'{OUT}/shield_16/by-set', exist_ok=True)
for v in 'abcd':
    for sk in SETS:
        a = shield(v, sk); im = Image.fromarray(a, 'RGBA')
        p = f'{OUT}/shield_16/block_shield_16-{v}.png' if sk == 'A' else f'{OUT}/shield_16/by-set/block_shield_16-{v}-{sk}.png'
        im.save(p); im.resize((32, 32), Image.NEAREST).save(p.replace('.png', '@2x.png'))
        if sk == 'A': SHIELDS[v] = a
# 檢查
PAL = set(MS.PAL) | {s[t] for s in SETS.values() for t in TK}
PAL_A = set(MS.PAL) | {SETS['A'][t] for t in TK}
def chk(a):
    c = MS.checks(a, 16); o = a[..., 3] > 0; vd = o & np.all(a[..., :3] == np.array(H('#16130f')), -1)
    pad = np.pad(~o, 1, constant_values=True); ext = vd & (pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:])
    c['outline_2x2_field_incl'] = c.pop('outline_2x2')
    c['outline_2x2'] = int(sum(1 for y in range(15) for x in range(15) if ext[y:y + 2, x:x + 2].all()))
    c['off_palette_vs_M2-36+setA'] = int(sum(1 for p in a[a[..., 3] > 0] if ('#%02x%02x%02x' % tuple(p[:3])) not in PAL_A)); c.pop('off_palette')
    return c
TABS = {f'分頁 {t}': np.array(Image.open(f'/workspace/mockups/W3-character-mock-1021/assets/art-picks/tab_{t}_16.png').convert('RGBA'))[..., 3] > 0
        for t in ('camp', 'char', 'forge', 'loot', 'more', 'skill', 'talent')}
PK = '/workspace/mockups/W-hud-exp-block-mock-1155/src/base/assets/pick'
CUR = {f'通貨 {n}': MS.vis_mask(np.array(Image.open(f'{PK}/{f}').convert('RGBA'))) for n, f in
       (('gold', 'cur_gold-s5401-16x16.png'), ('chaos', 'cur_chaos-s5330-16x16.png'), ('exalt', 'cur_exalt-s5329-16x16.png'))}
FIN = '/workspace/dpoe-docs/docs/production/art-picks/affix-icons'
AFF = {'破裂 16（定稿）': MS.vis_mask(np.array(Image.open(f'{FIN}/affix_frac/affix_frac_16.png').convert('RGBA'))),
       '追憶 16（定稿）': MS.vis_mask(np.array(Image.open(f'{FIN}/affix_mem/affix_mem_16.png').convert('RGBA')))}
REFS = {**MS.REFS, **AFF, **TABS, **CUR}
M['shield'] = {}
for v, a in SHIELDS.items():
    vm = MS.vis_mask(a)
    M['shield'][v] = {'checks': chk(a), 'iou_vis': {r: MS.d_iou(vm, m) for r, m in REFS.items()},
                      'iou_strict_wangyin': MS.d_iou(a[..., 3] > 0, MS.WY[..., 3] > 0),
                      'contrast_main': {b: round(cr(SETS['A']['--block'], bh), 2) for b, bh in BGH.items()},
                      'gray_L_mean': round(float(np.mean([lch(tohex(p[:3] / 255))[0] for p in a[vm]])), 1)}
    M['shield'][v]['min_iou'] = min(M['shield'][v]['iou_vis'].values())
    M['shield'][v]['fails'] = [f'{r}: {x}' for r, x in M['shield'][v]['iou_vis'].items() if x < 0.5]

# ---------- 格擋弧示意
TOKC = {'panel': '#25211e', 'panel-inset': '#1d1a17', 'hp': '#934341', 'hp-hi': '#af6c64', 'mp': '#3a5b98', 'mp-hi': '#6b7dad',
        'prog-lo': '#3c3935', 'prog-hi': '#b6b0a8', 'tx-strong': '#fbf9f6', 'border': '#817b75', 'tx-dim': '#aeaba7', 'black': '#000000'}
def arc_img(s, R, th, frac, state, scale):
    """上半圓弧：外半徑 R、粗 th、外圍 1 px #000；從左端順時針填 frac。state: full/part/regen/flash。"""
    W, Hh = 2 * R + 2, R + 2; ss = 4
    N = np.zeros((Hh * ss, W * ss, 4), np.uint8)
    yy, xx = np.mgrid[0:Hh * ss, 0:W * ss]; cx, cy = W * ss / 2, (R + 1) * ss
    r = np.hypot(xx + 0.5 - cx, yy + 0.5 - cy) / ss; ang = np.degrees(np.arctan2(cy - (yy + 0.5), xx + 0.5 - cx))  # 0 右、180 左
    up = (yy + 0.5) <= cy
    band = up & (r >= R - th) & (r <= R); rim = up & (r >= R - th - 1) & (r <= R + 1) & ~band
    out = np.zeros((Hh * ss, W * ss, 3)); a = np.zeros((Hh * ss, W * ss))
    def put(m, h): out[m] = np.array(H(h)); a[m] = 1
    put(rim, '#000000'); put(band, s['--block-dim'])
    filled = band & (ang >= 180 - 180 * frac)
    if state == 'full' or state == 'part': put(filled, s['--block'])
    if state == 'flash': put(band, s['--block-hi'])
    if state == 'regen':
        seg = (np.floor((180 - ang) / 9) % 2 == 0)   # 9° 一段、隔 9°
        put(filled & seg, s['--block-regen'])
    # 最近鄰縮回（取中心點）
    o = out[ss // 2::ss, ss // 2::ss]; al = a[ss // 2::ss, ss // 2::ss]
    im = Image.fromarray(np.dstack([o, al * 255]).astype(np.uint8), 'RGBA')
    return im
def bar(d, x, y, w, h, fillc, frac, label, sz):
    d.rectangle((x, y, x + w - 1, y + h - 1), fill=H(TOKC['panel-inset']), outline=H('#000000'))
    d.rectangle((x + 1, y + 1, x + 1 + int((w - 2) * frac), y + h - 2), fill=H(TOKC[fillc]))
    d.text((x + 6, y + h / 2), label, font=F(sz, True), fill=H(TOKC['tx-strong']), anchor='lm')
def ring(d, x, y, r, col):
    d.ellipse((x - r - 1, y - r - 1, x + r + 1, y + r + 1), outline=H('#000000'), width=1); d.arc((x - r, y - r, x + r, y + r), -90, 200, fill=H(TOKC[col]), width=2)
SZ = {'390': dict(R=24, th=4, ic=(16, 6), barw=170, barh=18, fs=14), '1280': dict(R=28, th=4, ic=(20, 10), barw=210, barh=20, fs=16)}
STATES = [('full', 1.0, '滿'), ('part', 0.69, '被打掉 69%'), ('regen', 0.45, '碎開回滿中 45%'), ('flash', 1.0, '碎開閃 150 ms')]
def tile(setk, size, bgk, shield_v='a'):
    s = SETS[setk]; z = SZ[size]; W, Hh = 560, 92
    img = Image.new('RGBA', (W, Hh), H(BGH[bgk]) + (255,)); d = ImageDraw.Draw(img)
    bar(d, 6, 8, z['barw'], z['barh'], 'hp', 0.85, '生命 820 / 968', z['fs'] - 3)
    bar(d, 6, 12 + z['barh'], z['barw'], z['barh'], 'mp', 0.6, '魔力 240 / 400', z['fs'] - 3)
    ring(d, z['barw'] + 18, 8 + z['barh'] // 2, 9, 'hp-hi'); ring(d, z['barw'] + 18, 12 + z['barh'] * 3 // 2, 9, 'mp-hi')
    d.rectangle((6, 18 + 2 * z['barh'], 6 + z['barw'] + 24, 18 + 2 * z['barh'] + 5), fill=H('#000000'))
    d.rectangle((7, 19 + 2 * z['barh'], 7 + int((z['barw'] + 22) * 0.62), 18 + 2 * z['barh'] + 4), fill=H(TOKC['prog-hi']))
    d.rectangle((8 + int((z['barw'] + 22) * 0.62), 19 + 2 * z['barh'], 5 + z['barw'] + 24, 18 + 2 * z['barh'] + 4), fill=H(TOKC['prog-lo']))
    shim = Image.fromarray(shield(shield_v, setk), 'RGBA')
    x = z['barw'] + 40
    for st, fr, lab_ in STATES:
        a = arc_img(s, z['R'], z['th'], fr, st, 1); img.paste(a, (x, 10), a)
        img.paste(shim, (x + 1 + z['ic'][0], 10 + 1 + z['ic'][1]), shim)
        d.text((x + z['R'], 10 + z['R'] + 8), lab_, font=F(9), fill=H('#e8e5e1') if bgk != '--scene-X-light' else H('#fbf9f6'), anchor='mt')
        x += 2 * z['R'] + 18
    return img
def arc_sheet():
    rows = [(sk, size, bg) for sk in SETS for bg in ('--panel', '--scene-void', '--scene-X-light') for size in ('390', '1280')]
    LW = 210; img = Image.new('RGBA', (LW + 560 + 8, 30 + len(rows) * 96), H('#1d1a17') + (255,)); d = ImageDraw.Draw(img)
    d.text((8, 8), '格擋值弧示意（1×）：每列 生命／魔力條＋藥劑環＋經驗條＋四態弧（盾牌＝★ 候選 a）', font=F(12, True), fill=H('#fbf9f6'))
    for i, (sk, size, bg) in enumerate(rows):
        y = 30 + i * 96
        d.text((8, y + 30), f'{sk} {SETS[sk]["name"].split('（')[0]}｜{size}', font=F(12, True), fill=H('#e8e5e1'))
        d.text((8, y + 50), f'底 {bg}', font=F(10), fill=H('#aeaba7'))
        img.paste(tile(sk, size, bg), (LW, y))
    return img
def cvd_img(im, cv):
    a = np.asarray(im.convert('RGB')).astype(float) / 255; l = colour.models.eotf_sRGB(a)
    s = np.clip(np.einsum('ij,hwj->hwi', MACH[cv], l), 0, 1); o = colour.models.eotf_inverse_sRGB(s)
    return Image.fromarray(np.clip(np.round(o * 255), 0, 255).astype(np.uint8), 'RGB')
def label(im, t):
    d = ImageDraw.Draw(im); d.rectangle((im.width - 260, 0, im.width, 22), fill=(0, 0, 0)); d.text((im.width - 252, 3), t, font=F(13, True), fill=(255, 255, 255)); return im
A1 = arc_sheet(); A1.save(f'{OUT}/overview/arc-sets-1x.png')
A2 = A1.resize((A1.width * 2, A1.height * 2), Image.NEAREST); A2.save(f'{OUT}/overview/arc-sets-2x.png')
for nm, cv in (('protan', 'Protanomaly'), ('deutan', 'Deuteranomaly'), ('tritan', 'Tritanomaly')):
    label(cvd_img(A2, cv), f'模擬 {nm}（Machado 2009, 1.0）').save(f'{OUT}/overview/arc-sets-2x-{nm}.png')
label(A2.convert('L').convert('RGB'), '灰階').save(f'{OUT}/overview/arc-sets-2x-gray.png')

# ---------- 盾牌候選表
SB = ['--panel', '--panel-inset', '--panel-raised', '--scene-void', '--scene-X-light']
LAB = {'a': 'a 空心盾框', 'b': 'b 盾框＋中脊', 'c': 'c 雉堞頂＋中脊', 'd': 'd 實心盾（對照）'}
WYI = Image.open('/workspace/mockups/W3-character-mock-1021/assets/art-picks/wangyin_chixiao_16-s5404.png').convert('RGBA')
FRI = Image.open(f'{FIN}/affix_frac/affix_frac_16.png').convert('RGBA'); MEI = Image.open(f'{FIN}/affix_mem/affix_mem_16.png').convert('RGBA')
def lock(d, x, y, col='#fbf9f6'):
    d.rectangle((x + 3, y + 7, x + 12, y + 13), fill=H(col)); d.arc((x + 5, y + 3, x + 11, y + 9), 180, 360, fill=H(col)); d.line((x + 5, y + 6, x + 5, y + 7), fill=H(col)); d.line((x + 10, y + 6, x + 10, y + 7), fill=H(col))
def shield_sheet(Sc):
    LW, SW, RH = 150, 124, 30
    img = Image.new('RGBA', (LW + 5 * SW + 8, 50 + 4 * RH + 70), H('#1d1a17') + (255,)); d = ImageDraw.Draw(img)
    d.text((8, 6), '盾牌 16 候選（★ A 色組）｜每格：候選｜王印｜破裂｜追憶｜鎖', font=F(11, True), fill=H('#fbf9f6'))
    for j, b in enumerate(SB): d.text((LW + j * SW, 28), b, font=F(9), fill=H('#aeaba7'))
    for i, v in enumerate('abcd'):
        y = 44 + i * RH; d.text((8, y + 12), LAB[v], font=F(10, True), fill=H('#e8e5e1'), anchor='lm')
        sh = Image.fromarray(SHIELDS[v], 'RGBA')
        for j, b in enumerate(SB):
            x = LW + j * SW; d.rectangle((x, y, x + 116, y + 24), fill=H(BGH[b]))
            for k_, im in enumerate((sh, WYI, FRI, MEI)): img.paste(im, (x + 4 + k_ * 22, y + 4), im)
            lock(d, x + 92, y + 4)
    y = 44 + 4 * RH + 6; d.text((8, y + 12), 'a–d 在 A／B／C', font=F(10, True), fill=H('#e8e5e1'), anchor='lm')
    for j, sk in enumerate(('A', 'B', 'C')):
        x = LW + j * SW; d.rectangle((x, y, x + 116, y + 24), fill=H('#25211e'))
        for k_, v in enumerate('abcd'):
            im = Image.fromarray(shield(v, sk), 'RGBA'); img.paste(im, (x + 4 + k_ * 22, y + 4), im)
        d.text((x + 100, y + 12), sk, font=F(10, True), fill=H('#aeaba7'), anchor='lm')
    return img if Sc == 1 else img.resize((img.width * Sc, img.height * Sc), Image.NEAREST)
s1 = shield_sheet(1); s1.save(f'{OUT}/overview/shield-sheet-1x.png')
s2 = shield_sheet(2); s2.save(f'{OUT}/overview/shield-sheet-2x.png')
label(s2.convert('L').convert('RGB'), '灰階').save(f'{OUT}/overview/shield-sheet-2x-gray.png')
for nm, cv in (('protan', 'Protanomaly'), ('deutan', 'Deuteranomaly'), ('tritan', 'Tritanomaly')):
    label(cvd_img(s2, cv), f'模擬 {nm}').save(f'{OUT}/overview/shield-sheet-2x-{nm}.png')
json.dump(M, open(f'{OUT}/measure.json', 'w'), ensure_ascii=False, indent=1)
if __name__ == '__main__':
    for k, e in M['sets'].items(): print(k, e['hex'], e['pass'], e['Lstar_gaps_min'], e['regen_over_block_Y'])
    for v, e in M['shield'].items(): print(v, e['min_iou'], e['fails'], e['iou_strict_wangyin'], {x: e['checks'][x] for x in ('colors', 'alpha', 'outline_2x2', 'fill_without_outline', 'off_palette_vs_M2-36+setA', 'checker2x2')})
