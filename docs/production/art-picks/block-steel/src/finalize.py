# H6 格擋 定稿：A 冷鋼＋盾牌 a（mumi 2026-11-21 12:07 經幕僚長）
import os, json, hashlib, shutil, numpy as np
from PIL import Image, ImageDraw
NS = {'__name__': 'blkbuild', '__file__': '/workspace/affix-icons/blk/build.py'}
src = open('/workspace/affix-icons/blk/build.py').read().replace(
    "OUT = '/workspace/dpoe-docs/docs/production/art-picks/block-steel-draft'", "OUT = '/tmp/blk-final-scratch'")
exec(compile(src, 'build.py', 'exec'), NS)
g = NS; SETS, H, F = g['SETS'], g['H'], g['F']
FO = '/workspace/dpoe-docs/docs/production/art-picks/block-steel'
for d in ('palette', 'overview', 'src'): os.makedirs(f'{FO}/{d}', exist_ok=True)
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
A = SETS['A']; TK = g['TK']
# --- 圖
a = g['shield']('a', 'A'); im = Image.fromarray(a, 'RGBA')
p16, p32 = f'{FO}/hud_block_16.png', f'{FO}/hud_block_16@2x.png'
im.save(p16); im.resize((32, 32), Image.NEAREST).save(p32)
draft = '/workspace/dpoe-docs/docs/production/art-picks/block-steel-draft/shield_16/block_shield_16-a.png'
same_as_draft = sha(p16) == sha(draft) or np.array_equal(np.array(Image.open(draft)), a)
# --- 檢查（重跑）
b2 = np.array(Image.open(p32)); a16 = np.array(Image.open(p16))
c = g['chk'](a16); vm = g['MS'].vis_mask(a16)
iou = {r: g['MS'].d_iou(vm, m) for r, m in g['REFS'].items()}
used = sorted({'#%02x%02x%02x' % tuple(p[:3]) for p in a16[a16[..., 3] > 0]})
ROLE = {'#16130f': ('--scene-void', '外描邊（在 16 內）＋盾面暗面'), A['--block']: ('--block', '盾框本色（左、上）'),
        A['--block-regen']: ('--block-regen', '盾框暗半（右）'), A['--block-hi']: ('--block-hi', '左上緣高光')}
checks = {**c, 'size_16': list(a16.shape[:2]) == [16, 16], 'at2x_exact_nearest': bool(np.array_equal(b2, a16.repeat(2, 0).repeat(2, 1))),
          'at2x_size': list(b2.shape[:2]), 'colors_used': used, 'all_tokens_known': all(u in ROLE for u in used),
          'iou_vis_min': min(iou.values()), 'iou_vis_fails(<0.5)': [k for k, v in iou.items() if v < 0.5],
          'iou_strict_wangyin': g['MS'].d_iou(a16[..., 3] > 0, g['MS'].WY[..., 3] > 0), 'same_pixels_as_draft_a': bool(same_as_draft)}
P = '/workspace/dpoe-docs/docs/production'
def doc(rel, ver):
    return {'path': f'docs/production/{rel}', 'version': ver, 'sha256': sha(f'{P}/{rel}')}
SRCDOCS = {
    'M2-36-palette-tokens.md': doc('specs/M2-36-palette-tokens.md', 'D2 定案（無版號）；本次加 --block 四個 token 前的版本'),
    'M2-36-drawing-rules.md': doc('specs/M2-36-drawing-rules.md', '無版號；§1、§2、§5.1'),
    'battle-hud.md': {'path': 'main 59b6350 docs/production/specs/battle-hud/battle-hud.md', 'version': 'v1.3.3',
                      'sha256': sha('/workspace/scratch/main-59b6350/docs/production/specs/battle-hud/battle-hud.md')},
    'W-hud-exp-block README': {'path': '/workspace/wireframes-draft/W-hud-exp-block-1138/README.md', 'version': 'UIUX 2026-11-21 草稿（H6／H7、K01／K02）',
                               'sha256': sha('/workspace/wireframes-draft/W-hud-exp-block-1138/README.md')}}
def meta(fn, size, dpr):
    return {'icon': 'hud_block', 'term': '格擋值（盾牌圖示，放在格擋弧內）', 'file': fn, 'sha256': sha(f'{FO}/{fn}'), 'size': size,
            'anchor': 'top-left', 'placement': '格擋弧盒內：390 弧盒 48×24 的 (16,6)；1280 弧盒 56×28 的 (20,10)（UIUX K02 草稿位置）', 'pivot': [8, 8],
            'outline': '1 px --scene-void，在 16 格內（不留透明邊），程式不另墊 18×18；盾面也是 --scene-void（暗面，不算描邊）',
            'tokens': [{'hex': h, 'token': ROLE[h][0], 'role': ROLE[h][1]} for h in used], 'colors': len(used), 'alpha': [0, 255],
            'image_rendering': 'pixelated', 'dpr': dpr, 'dpr2': 'DPR 2＝hud_block_16@2x.png（16 最近鄰 ×2，逐像素相同），不另畫 32',
            'source': {'method': '程式畫（PIL／numpy，手排 16 像素圖）；沒用 PixelLab，沒有 seed', 'candidate': '盾牌 a（空心盾框，平頂尖底）、色組 A 冷鋼',
                       'draft': 'docs/production/art-picks/block-steel-draft/shield_16/block_shield_16-a.png', 'hand_fix': None, 'docs': SRCDOCS},
            'picked': 'mumi 2026-11-21 12:07（經幕僚長）：色組 A 冷鋼＋盾牌 a', 'author': 'Game Art Director 2026-11-21', 'checks': checks}
json.dump(meta('hud_block_16.png', [16, 16], 1), open(f'{FO}/hud_block_16.json', 'w'), ensure_ascii=False, indent=1)
json.dump(meta('hud_block_16@2x.png', [32, 32], 2), open(f'{FO}/hud_block_16@2x.json', 'w'), ensure_ascii=False, indent=1)
open(f'{FO}/picked.txt', 'w').write(
    'mumi 2026-11-21 12:07（經幕僚長）挑定：色組 A 冷鋼（--block #a9b8c3／--block-dim #40484e／--block-regen #758088／--block-hi #eaf2f8）＋盾牌 a（空心盾框）。\n'
    '盾牌 a 來源 block-steel-draft/shield_16/block_shield_16-a.png（逐像素相同，未手修）；沒選：色組 B、C，盾牌 b、c、d。\n')
# --- 色票
M = json.load(open('/tmp/blk-final-scratch/measure.json'))['sets']['A']
ROLES = {'--block': '格擋弧填色、盾牌本色', '--block-dim': '格擋弧空軌／被打掉的段', '--block-regen': '碎開後回滿中的虛線段（亮度 Y＝--block 45%）',
         '--block-hi': '碎開閃，只在弧上約 150 ms'}
json.dump({'set': 'A 冷鋼', 'picked': 'mumi 2026-11-21 12:07（經幕僚長）', 'source_LCh_block': [74, 8, 250],
           'tokens': {t: {'hex': A[t], 'LCh': M['LCh'][t], 'role': ROLES[t], 'contrast': M['contrast'][t]} for t in TK},
           'regen_over_block_Y': M['regen_over_block_Y'], 'Lstar_by_sim': M['Lstar_by_sim'], 'Lstar_gaps_min': M['Lstar_gaps_min'],
           'dE_block_by_sim': M['dE_block'], 'required': '格擋弧外圍 1 px #000 是必要條件（--block 在淺磚 3.29、加燈籠光 16% 2.69；dim／regen 在淺磚靠黑邊和弧形）',
           'method': 'WCAG 2.x；CIEDE2000；Machado 2009 嚴重度 1.0'}, open(f'{FO}/palette/block-tokens.json', 'w'), ensure_ascii=False, indent=1)
sw = Image.new('RGB', (600, 120), H('#25211e')); d = ImageDraw.Draw(sw)
d.text((10, 6), 'H6 格擋 token 定稿：A 冷鋼（mumi 11/21 12:07）', font=F(14, True), fill=H('#fbf9f6'))
for j, t in enumerate(TK):
    x = 10 + j * 146; d.rectangle((x, 34, x + 130, 80), fill=H(A[t]), outline=H('#000000'))
    d.text((x, 86), f'{t}', font=F(11), fill=H('#aeaba7')); d.text((x, 101), A[t], font=F(11), fill=H('#aeaba7'))
sw.save(f'{FO}/palette/swatches.png')
# --- 定稿總覽
def grid():
    rows = [(size, bg) for bg in ('--panel', '--scene-void', '--scene-X-light') for size in ('390', '1280')]
    LW = 150; img = Image.new('RGBA', (LW + 560 + 8, 30 + len(rows) * 96), H('#1d1a17') + (255,)); dd = ImageDraw.Draw(img)
    for i, (size, bg) in enumerate(rows):
        y = 30 + i * 96; dd.text((8, y + 30), f'{size}', font=F(12, True), fill=H('#e8e5e1')); dd.text((8, y + 50), f'底 {bg}', font=F(10), fill=H('#aeaba7'))
        img.paste(g['tile']('A', size, bg, 'a'), (LW, y))
    return img
G1 = grid(); dd = ImageDraw.Draw(G1); dd.text((8, 8), 'H6 定稿：A 冷鋼＋盾牌 a｜四態：滿／69%／碎開回滿中 45%（虛線）／碎開閃', font=F(12, True), fill=H('#fbf9f6'))
G2 = G1.resize((G1.width * 2, G1.height * 2), Image.NEAREST).convert('RGB')
vers = [('一般', G2)] + [(f'模擬 {n}（Machado 1.0）', g['cvd_img'](G2, cv)) for n, cv in (('protan', 'Protanomaly'), ('deutan', 'Deuteranomaly'), ('tritan', 'Tritanomaly'))] + [('灰階', G2.convert('L').convert('RGB'))]
# 一般全幅在上；下面 2×2 放色盲＋灰階（各縮成 1×，最近鄰取樣後仍是整數倍）
small = [(n, v.resize((G1.width, G1.height), Image.NEAREST)) for n, v in vers[1:]]
W = G2.width; out = Image.new('RGB', (W, G2.height + 2 * (G1.height + 30) + 10), H('#16130f')); out.paste(G2, (0, 0))
for k, (n, v) in enumerate(small):
    x = (k % 2) * G1.width; y = G2.height + 10 + (k // 2) * (G1.height + 30)
    ImageDraw.Draw(out).text((x + 8, y + 4), n + '（1×）', font=F(14, True), fill=H('#fbf9f6')); out.paste(v, (x, y + 26))
out.save(f'{FO}/overview/final-review-2x.png')
for n, v in zip(('protan', 'deutan', 'tritan', 'gray'), [x[1] for x in vers[1:]]):
    v.save(f'{FO}/overview/final-review-2x-{n}.png')
# 盾牌 5 底 1×／2×
sh = Image.open(p16)
bgs = ['--panel', '--panel-inset', '--panel-raised', '--scene-void', '--scene-X-light']
st = Image.new('RGB', (5 * 28, 28), (0, 0, 0))
for i, b in enumerate(bgs):
    t = Image.new('RGBA', (28, 28), H(g['BGH'][b]) + (255,)); t.paste(sh, (6, 6), sh); st.paste(t.convert('RGB'), (i * 28, 0))
st.resize((st.width * 4, st.height * 4), Image.NEAREST).save(f'{FO}/overview/hud_block_16-on-5bg-4x.png')
for f in ('build.py', 'finalize.py', 'pal.py', 'shields.py'): shutil.copy(f'/workspace/affix-icons/blk/{f}', f'{FO}/src/{f}')
for f in ('gen.py', 'measure.py'): shutil.copy(f'/workspace/affix-icons/src/{f}', f'{FO}/src/{f}')
shutil.copy('/workspace/d2final/lib.py', f'{FO}/src/lib_d2final.py')
print(json.dumps(checks, ensure_ascii=False)); print(iou)
