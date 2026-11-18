"""產出 §7 交付：對照圖、剪影圖、模擬鈕、IoU／配對／位置 csv、review.csv、asset_check.csv"""
import sys, pathlib, subprocess, itertools
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from r5 import *
from PIL import ImageFont

st = latest_pass()
NOTE = json.loads((EV / 'visual_notes.json').read_text(encoding='utf-8'))
HAND = {'sk_deadeye': '手畫骰點（剪影不變）', 'sk_ironaura': '平移 (-1,0)', 'sk_fireburst': '平移 (-2,0)', 'sk_refract': '加粗 1 px＋上色',
        'sk_assassinate': '加粗 1 px＋平移 (-1,0)＋上色', 'sk_fire': '平移 (-1,0)', 'sk_meteor': '平移 (-1,1)'}
COLL = {'sk_clarity': ['sk_precise'], 'sk_purityaura': ['sk_clarity', 'sk_determination'], 'sk_staticfield': ['sk_weaken', 'sk_fireburst'],
        'sk_summongod': ['sk_weaken'], 'sk_ironaura': ['sk_determination', 'sk_precise'], 'sk_despair': ['sk_holyshield', 'sk_bloodlust'],
        'sk_weaken': ['sk_summongod'], 'sk_holyshield': ['sk_despair', 'sk_decay'], 'sk_bloodlust': ['sk_despair'], 'sk_fireburst': ['sk_weaken', 'sk_iceshatter'],
        'sk_gasflask': ['sk_poisontrap'], 'sk_oilgrenade': ['sk_poisontrap'], 'sk_refract': ['sk_markshot'], 'sk_tidepull': ['sk_frostnova'],
        'sk_windflask': ['sk_hasteaura'], 'sk_assassinate': ['sk_sacrifice', 'sk_combust'], 'sk_combust': ['sk_assassinate', 'sk_despair'],
        'sk_doom': ['sk_rage', 'sk_decay'], 'sk_rage': ['sk_despair', 'sk_daunt'], 'sk_talisman': ['sk_exorcise', 'sk_shadowstep'],
        'sk_exorcise': ['sk_talisman', 'sk_shadowstep'], 'sk_fire': ['sk_meteor'], 'sk_meteor': ['sk_fire', 'sk_bloodhowl'], 'sk_deadeye': ['sk_daunt', 'sk_shieldcharge', 'sk_determination']}
NEW = {i: Image.open(OUT / i / f'{st[i]}.png') for i in JOBS}
sets = sets_now(st)
BG, FG, RED, FR = (40, 37, 33, 255), (230, 220, 200, 255), (220, 60, 60, 255), (240, 200, 90, 255)
font = ImageFont.truetype('/usr/share/fonts/opentype/unifont/unifont.otf', 12)


def gray(im):
    a = np.asarray(im.convert('RGBA')).copy()
    g = (a[..., :3] @ [0.299, 0.587, 0.114]).astype(np.uint8)
    a[..., 0] = a[..., 1] = a[..., 2] = g
    return Image.fromarray(a, 'RGBA')


def sil(im):
    a = np.zeros((im.height, im.width, 4), np.uint8)
    m = mask(im)
    a[m] = (0, 0, 0, 255)
    return Image.fromarray(a, 'RGBA')


def paste(c, im, x, y, s=1):
    im = im.resize((im.width * s, im.height * s), Image.NEAREST)
    c.paste(im, (x, y), im)


# r5_32_compare.png
W = 4 + 4 * 140 + 3 * 140
c = Image.new('RGBA', (W, 24 + len(JOBS) * 150), BG)
d = ImageDraw.Draw(c)
d.text((6, 6), '新圖：彩色 4x、1x、灰階 4x、1x ｜ 撞圖對象（舊圖）：彩色 4x', fill=FG, font=font)
for r, i in enumerate(JOBS):
    y = 24 + r * 150
    im = NEW[i]
    d.text((6, y), f'{i}  {st[i]}', fill=FG, font=font)
    paste(c, im, 6, y + 14, 4); paste(c, im, 140, y + 14); paste(c, gray(im), 180, y + 14, 4); paste(c, gray(im), 314, y + 14)
    for k, o in enumerate(COLL[i]):
        x = 360 + k * 140
        if o in JOBS:
            continue
        paste(c, old_img(o), x, y + 14, 4)
        d.text((x, y + 144 - 12), o, fill=FG, font=font)
c.save(EV / 'r5_32_compare.png')

# IoU 表與配對
iou_rows, pairs = [], []
for bar, ims in sets.items():
    ks = sorted(ims)
    M32 = {k: mask(ims[k]) for k in ks}
    M16 = {k: mask(thumb16(ims[k])) for k in ks}
    for a, b in itertools.combinations(ks, 2):
        v32, v16 = iou(M32[a], M32[b]), iou(M16[a], M16[b])
        kind = '新-新' if a in JOBS and b in JOBS else ('新-舊' if a in JOBS or b in JOBS else '舊-舊')
        if v32 >= 0.6 or v16 >= 0.6:
            pairs.append([bar, a, b, kind, round(v32, 3), round(v16, 3)])
    for i in [k for k in ks if k in JOBS]:
        others = [k for k in ks if k != i] + [e for e in EXTRA.get(i, []) if e not in ks]
        best32, best16 = (0, ''), (0, '')
        rows = []
        for o in others:
            om = mask(ims[o]) if o in ims else mask(old_img(o))
            om16 = mask(thumb16(ims[o] if o in ims else old_img(o)))
            v32, v16 = round(iou(M32[i], om), 3), round(iou(M16[i], om16), 3)
            rows.append([bar, i, o, v32, v16, '拆圖對象' if o in EXTRA.get(i, []) else ''])
            best32, best16 = max(best32, (v32, o)), max(best16, (v16, o))
        for rr in rows:
            iou_rows.append(rr + [best32[0], best32[1], best16[0], best16[1]])
with (EV / 'r5_iou.csv').open('w', encoding='utf-8', newline='') as f:
    w = csv.writer(f)
    w.writerow(['bar', 'new_id', 'other', 'iou32', 'iou16', 'note', 'max32', 'max32_with', 'max16', 'max16_with'])
    w.writerows(iou_rows)
with (EV / 'r5_bar_pairs.csv').open('w', encoding='utf-8', newline='') as f:
    w = csv.writer(f)
    w.writerow(['bar', 'a', 'b', 'kind', 'iou32', 'iou16'])
    w.writerows(sorted(pairs, key=lambda p: -p[4]))
old32 = [p for p in pairs if p[3] == '舊-舊' and p[4] >= 0.6]
print('舊-舊 32≥0.6：', len(old32), 'S', sum(p[0] == 'S' for p in old32), 'A', sum(p[0] == 'A' for p in old32), '最高', max(p[4] for p in old32), '≥0.75', [p for p in old32 if p[4] >= 0.75])
print('新圖相關 32≥0.6：', [p for p in pairs if p[3] != '舊-舊' and p[4] >= 0.6])
hot16 = [p for p in pairs if p[3] != '舊-舊' and p[5] >= 0.6]
print('新圖相關 16≥0.6（給 UIUX 目視）：', hot16)

# 剪影圖
for name, f16 in (('r5_sil_32.png', False), ('r5_sil_16.png', True)):
    cell = 110
    rowsN = sum((len(v) + 9) // 10 for v in sets.values())
    c = Image.new('RGBA', (10 * cell + 8, rowsN * cell + 40), (235, 230, 220, 255))
    d = ImageDraw.Draw(c)
    hot = {p[1] for p in pairs if (p[5] if f16 else p[4]) >= 0.6} | {p[2] for p in pairs if (p[5] if f16 else p[4]) >= 0.6}
    d.text((6, 4), ('16 縮圖' if f16 else '32') + ' 黑剪影 1x＋2x；金框＝新圖；紅字＝在 IoU≥0.6 配對裡（含舊-舊）', fill=(0, 0, 0, 255), font=font)
    y0 = 20
    for bar in 'SA':
        ks = sorted(sets[bar], key=lambda k: (k not in JOBS, k))
        for n, k in enumerate(ks):
            x, y = 4 + (n % 10) * cell, y0 + (n // 10) * cell
            im = thumb16(sets[bar][k]) if f16 else sets[bar][k]
            s = 2 if not f16 else 4
            paste(c, sil(im), x + 2, y + 2, 1)
            paste(c, sil(im), x + 2 + im.width + 4, y + 2, s)
            if k in JOBS:
                d.rectangle([x, y, x + cell - 4, y + cell - 18], outline=FR, width=2)
            d.text((x + 2, y + cell - 16), f'{bar} {k[3:]}', fill=RED if k in hot else (0, 0, 0, 255), font=font)
        y0 += (len(ks) + 9) // 10 * cell
    c.save(EV / name)

# r5_bar_mock.png：52、56 空白鈕，彩色＋灰階；每列＝新圖＋撞圖對象
def button(sz, im):
    b = Image.new('RGBA', (sz, sz), (36, 33, 30, 255))
    dd = ImageDraw.Draw(b)
    dd.rectangle([0, 0, sz - 1, sz - 1], outline=(85, 79, 72, 255), width=2)
    o = (sz - 32) // 2
    b.paste(im, (o, o), im)
    return b
c = Image.new('RGBA', (8 + 4 * 2 * 62 + 40, 20 + len(JOBS) * 64), BG)
d = ImageDraw.Draw(c)
d.text((6, 4), '每列：新圖、撞圖對象…｜52 彩色、56 彩色，再一組灰階（圖示 32 原尺寸置中）', fill=FG, font=font)
for r, i in enumerate(JOBS):
    y = 20 + r * 64
    group = [NEW[i]] + [old_img(o) for o in COLL[i] if o not in JOBS][:2]
    x = 6
    for g in (False, True):
        for sz in (52, 56):
            for im in group:
                c.paste(button(sz, gray(im) if g else im), (x, y))
                x += sz + 2
            x += 8
c = c.crop((0, 0, x + 120, c.height))
c.save(EV / 'r5_bar_mock.png')

# r5_locations.csv：git grep js/ 每一處
TARGET = sorted(set(JOBS) | {'sk_poisontrap', 'sk_markshot', 'sk_frostnova', 'sk_hasteaura', 'sk_determination'} - NEWID)
SPLIT = {('js/data.js', 'gasflask'): 'sk_gasflask', ('js/data.js', 'oilgrenade'): 'sk_oilgrenade', ('js/data.js', 'refract'): 'sk_refract',
         ('js/data.js', 'tidepull'): 'sk_tidepull', ('js/data.js', 'windflask'): 'sk_windflask', ('js/data.js', 'iron'): 'sk_ironaura',
         ('js/combat.js', 'windflask'): 'sk_windflask'}
loc = []
data = (ROOT / 'js/data.js').read_text(encoding='utf-8').split('\n')
blocks = [(n, l) for n, l in enumerate(data) if re.match(r'^const [A-Z_]+ = ', l)]
def owner(file, ln):
    """所在的 const 區塊與上一個物件鍵"""
    lines = (ROOT / file).read_text(encoding='utf-8').split('\n')
    blk = next((re.match(r'^const ([A-Z_]+)', lines[k]).group(1) for k in range(ln - 1, -1, -1) if re.match(r'^const [A-Z_]+', lines[k])), '')
    key = next((m.group(1) for k in range(ln - 1, max(-1, ln - 80), -1) if (m := re.match(r'^  (\w+): [\[{(]', lines[k]))), '')
    return blk, key
for t in TARGET:
    out = subprocess.run(['git', 'grep', '-n', '-w', t, '--', 'js/'], capture_output=True, text=True).stdout.strip().split('\n')
    for o in filter(None, out):
        file, ln, txt = o.split(':', 2)
        blk, key = owner(file, int(ln))
        if file == 'js/art.js':
            use = '其他（圖集座標）'
        elif blk == 'SKILLS':
            use = '技能'
        elif blk == 'AURAS':
            use = '光環'
        elif file == 'js/combat.js':
            use = '狀態列'
        elif blk in ('PT_THEME',) or 'PT_' in blk:
            use = '天賦主題'
        else:
            use = f'其他（{file} {blk}）'
        if t in JOBS:
            after = t + '（新圖）'
        else:
            after = SPLIT.get((file, key)) or (SPLIT.get(('js/data.js', key)) if blk in ('SKILLS', 'AURAS') else None)
            after = f'{after}（借圖改新 id）' if after else f'{t}（留舊圖）'
            if t == 'sk_poisontrap' and use == '技能':
                after = after
        loc.append([t, f'{file}:{ln}', use, key, after, txt.strip()[:80]])
with (EV / 'r5_locations.csv').open('w', encoding='utf-8', newline='') as f:
    w = csv.writer(f)
    w.writerow(['id', 'file_line', 'use', 'key', 'after', 'code'])
    w.writerows(loc)
print('locations', len(loc), '借圖改新 id', sum('借圖改新 id' in r[4] for r in loc))

# review.csv（定稿）＋ asset_check.csv
rv, ac = [], []
for i in JOBS:
    r, _ = evaluate(i, st[i], st, {})
    seeds = sorted(p.stem for p in (RAW / i).glob('*.png'))
    rv.append(dict(id=i, bar=JOBS[i]['bar'], final=st[i], tries=' '.join(seeds), gens=len(seeds), hand=HAND.get(i, '') + ('；上色' if st[i].endswith(('h', 'hm')) and '上色' not in HAND.get(i, '') else ''),
                   result=r['result'], iou32_max=r['iou32_max'], iou32_with=r['iou32_with'], iou16_max=r['iou16_max'], iou16_with=r['iou16_with'],
                   fill=r['fill'], box_fill=r['box_fill'], fill16=r['fill16'], visual=NOTE.get(i, '')))
    a = np.asarray(NEW[i])
    m = a[..., 3] > 0
    pal = {tuple(P.hexrgb(TOK[c])) for c in JOBS[i]['pal']}
    inpal = all(tuple(p) in pal for p in a[m][:, :3])
    pad = np.pad(m, 1)
    edge = m & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    edge_void = bool((a[edge][:, :3] == P.hexrgb(TOK[VOID])).all())
    margin = not (m[0].any() or m[-1].any() or m[:, 0].any() or m[:, -1].any())
    vm = m & (a[..., :3] == P.hexrgb(TOK[VOID])).all(-1)
    thick = sum(int(vm[y:y + 2, x:x + 2].all() and edge[y:y + 2, x:x + 2].any()) for y in range(31) for x in range(31))
    raw = json.loads(next((RAW / i).glob(st[i].rstrip('hm') + '.json')).read_text(encoding='utf-8'))
    ac.append(dict(id=i, file=f'art/icons/skill/{i}/{st[i]}.png', size='32x32', palette_100=inpal, colors=r['colors'], outline_void=edge_void,
                   margin_1px=margin, void_2x2_at_edge=thick, checker32=r['checker32'], checker16=r['checker16'], noise=r['noise'], chase=r['chase'],
                   seed=raw['seed']))
for name, rows in (('review.csv', rv), ('asset_check.csv', ac)):
    with (EV / name).open('w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
