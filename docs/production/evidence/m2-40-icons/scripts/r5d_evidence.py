"""R5d 試跑證據：r5d_32_compare.png（導引圖 4x｜彩色 4x＋1x｜灰階 4x＋1x｜生成原圖 4x｜撞圖舊圖 4x）、
r5d_sil.png（黑剪影 32（1x、2x）與 16（1x、4x），新圖與撞圖並排）、r5d_bar_mock.png（52／56 空白鈕，彩色＋灰階，新圖與撞圖）、
r5d_iou.csv、r5d_review.csv（＋目視）"""
import sys, pathlib, csv, json
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import r5d, r5c
from r5c import *
from PIL import ImageDraw, ImageFont

BG, FG = (40, 37, 33, 255), (230, 220, 200, 255)
BTN, BTNB = (36, 33, 30, 255), (85, 79, 72, 255)
font = ImageFont.truetype('/usr/share/fonts/opentype/unifont/unifont.otf', 12)


def gray(im):
    a = np.asarray(im.convert('RGBA')).copy()
    a[..., 0] = a[..., 1] = a[..., 2] = (a[..., :3] @ [0.299, 0.587, 0.114]).astype(np.uint8)
    return Image.fromarray(a, 'RGBA')


def sil(im):
    m = mask(im)
    a = np.zeros((*m.shape, 4), np.uint8)
    a[m] = (0, 0, 0, 255)
    a[~m] = (255, 255, 255, 255)
    return Image.fromarray(a, 'RGBA')


def paste(c, im, x, y, s=1):
    im = im.resize((im.width * s, im.height * s), Image.NEAREST)
    c.paste(im, (x, y), im)


NOTE = json.loads((EV / 'r5d_visual_notes.json').read_text(encoding='utf-8'))
MEAN = {'sk_fire-s7222': '大致對（火感弱）', 'sk_gasflask-s7211': '對', 'sk_oilgrenade-s7212': '對'}
rows = {r['stem']: r for r in csv.DictReader(r5c.REVIEW.open(encoding='utf-8'))}
stems = list(NOTE)
c = Image.new('RGBA', (1060, 24 + len(stems) * 160), BG)
d = ImageDraw.Draw(c)
d.text((6, 6), 'R5d 試跑（pixflux＋上色導引圖 init 150）：導引圖 4x ｜ 彩色 4x、1x ｜ 灰階 4x、1x ｜ 生成原圖 4x ｜ 撞圖舊圖 4x ｜ 目視', fill=FG, font=font)
ious = []
sc = Image.new('RGBA', (560, 24 + len(stems) * 90), BG)
sd = ImageDraw.Draw(sc)
sd.text((6, 6), 'R5d 黑剪影：新圖 32（1x、2x）、16（1x、4x）｜撞圖舊圖同排', fill=FG, font=font)
bm = Image.new('RGBA', (560, 24 + len(stems) * 80), BG)
bd = ImageDraw.Draw(bm)
bd.text((6, 6), 'R5d 52／56 模擬鈕：新圖｜撞圖（彩色，灰階）', fill=FG, font=font)
st = r5c.state()
for n, s in enumerate(stems):
    i = s.split('-s')[0]
    im = Image.open(OUT / i / f'{s}.png')
    r = rows[s]
    other = old_img(r['iou32_with']) if r['iou32_with'] in r5.old_sets()['S'] | r5.old_sets()['A'] else Image.open(OUT / r['iou32_with'] / f"{st[r['iou32_with']]}.png")
    y = 24 + n * 160
    d.text((6, y), f"{s}  畫風 {r['style']}（{r['style_colors']} 色／L*差 {r['style_dL']}）  IoU32 {r['iou32_max']} {r['iou32_with']}  量測 {r['result']}  意思 {MEAN[s]}", fill=FG, font=font)
    paste(c, Image.open(RAW / 'guide' / f'{i}.png'), 6, y + 16, 4)
    paste(c, im, 140, y + 16, 4); paste(c, im, 274, y + 16); paste(c, gray(im), 312, y + 16, 4); paste(c, gray(im), 446, y + 16)
    paste(c, Image.open(RAW / i / f'{s}.png').convert('RGBA'), 484, y + 16, 4)
    paste(c, other, 618, y + 16, 4)
    for k, line in enumerate([NOTE[s][x:x + 20] for x in range(0, len(NOTE[s]), 20)][:9]):
        d.text((756, y + 16 + k * 14), line, fill=FG, font=font)
    yy = 24 + n * 90
    sd.text((6, yy), f"{s} ｜ {r['iou32_with']}  IoU32 {r['iou32_max']}／IoU16 {r['iou16_max']}", fill=FG, font=font)
    for k, src in enumerate((im, other)):
        x0 = 6 + k * 270
        paste(sc, sil(src), x0, yy + 16); paste(sc, sil(src), x0 + 40, yy + 16, 2)
        t = sil(thumb16(src)); paste(sc, t, x0 + 110, yy + 16); paste(sc, t, x0 + 132, yy + 16, 4)
    yb = 24 + n * 80
    bd.text((6, yb), f"{s} ｜ {r['iou32_with']}", fill=FG, font=font)
    x = 6
    for src in (im, other):
        for g in (src, gray(src)):
            for size in (52, 56):
                bd.rectangle((x, yb + 16, x + size - 1, yb + 16 + size - 1), fill=BTN, outline=BTNB)
                paste(bm, g, x + (size - 32) // 2, yb + 16 + (size - 32) // 2)
                x += size + 8
        x += 16
    _, rr = evaluate(i, s, {k: v for k, v in st.items() if k != i}, {})
    ious += [list(x) for x in rr]
c.save(EV / 'r5d_32_compare.png')
sc.save(EV / 'r5d_sil.png')
bm.save(EV / 'r5d_bar_mock.png')
with (EV / 'r5d_iou.csv').open('w', encoding='utf-8', newline='') as f:
    w = csv.writer(f)
    w.writerow(['id', 'stem', 'bar', 'other', 'iou32', 'iou16'])
    w.writerows(ious)
out = []
for s in stems:
    r = dict(rows[s])
    meta = json.loads((RAW / s.split('-s')[0] / f'{s}.json').read_text(encoding='utf-8'))
    r.update(negative_description_accepted=meta['negative_description_accepted'], meaning=MEAN[s], visual=NOTE[s], hand='')
    out.append(r)
with r5c.REVIEW.open('w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, list(out[0].keys()))
    w.writeheader()
    w.writerows(out)
print(len(out), 'rows')
