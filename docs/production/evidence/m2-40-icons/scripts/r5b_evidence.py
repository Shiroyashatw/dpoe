"""R5b 證據：r5b_32_compare.png（每次生成：彩色 4x＋1x、灰階 4x＋1x、所用參考圖）、r5b_iou.csv、r5b_review.csv（去重＋目視）"""
import sys, pathlib, csv, json
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from r5b import *
from PIL import ImageDraw, ImageFont

BG, FG = (40, 37, 33, 255), (230, 220, 200, 255)
font = ImageFont.truetype('/usr/share/fonts/opentype/unifont/unifont.otf', 12)


def gray(im):
    a = np.asarray(im.convert('RGBA')).copy()
    a[..., 0] = a[..., 1] = a[..., 2] = (a[..., :3] @ [0.299, 0.587, 0.114]).astype(np.uint8)
    return Image.fromarray(a, 'RGBA')


def paste(c, im, x, y, s=1):
    im = im.resize((im.width * s, im.height * s), Image.NEAREST)
    c.paste(im, (x, y), im)

NOTE = json.loads((EV / 'r5b_visual_notes.json').read_text(encoding='utf-8'))
rows = {r['stem']: r for r in csv.DictReader(REVIEW.open(encoding='utf-8'))}  # 同一張重檢以最後一次為準
stems = list(NOTE)
c = Image.new('RGBA', (900, 24 + len(stems) * 150), BG)
d = ImageDraw.Draw(c)
d.text((6, 6), 'R5b 每次生成：彩色 4x、1x、灰階 4x、1x ｜ 所用參考圖 4x ｜ 量測與目視', fill=FG, font=font)
ious = []
for n, s in enumerate(stems):
    i = s.split('-s')[0]
    meta = json.loads((RAW / i / f'{s}.json').read_text(encoding='utf-8'))
    im = Image.open(OUT / i / f'{s}.png')
    y = 24 + n * 150
    r = rows[s]
    ref = meta.get('style_image')
    d.text((6, y), f"{s}  強度 {meta['request'].get('style_strength', 0)}  畫風 {r['style']}（{r['style_colors']} 色／L*差 {r['style_dL']}）  量測 {r['result']}", fill=FG, font=font)
    paste(c, im, 6, y + 14, 4); paste(c, im, 140, y + 14); paste(c, gray(im), 180, y + 14, 4); paste(c, gray(im), 314, y + 14)
    if ref:
        paste(c, old_img(ref), 360, y + 14, 4)
        d.text((360, y + 144 - 12), ref, fill=FG, font=font)
    for k, line in enumerate([NOTE[s][x:x + 26] for x in range(0, len(NOTE[s]), 26)][:8]):
        d.text((500, y + 16 + k * 14), line, fill=FG, font=font)
    st = state()
    _, rr = evaluate(i, s, {k: v for k, v in st.items() if k != i}, {})
    ious += [list(x) for x in rr]
c.save(EV / 'r5b_32_compare.png')
with (EV / 'r5b_iou.csv').open('w', encoding='utf-8', newline='') as f:
    w = csv.writer(f)
    w.writerow(['id', 'stem', 'bar', 'other', 'iou32', 'iou16'])
    w.writerows(ious)
out = []
for s in stems:
    r = dict(rows[s])
    meta = json.loads((RAW / s.split('-s')[0] / f'{s}.json').read_text(encoding='utf-8'))
    r.update(style_strength=meta['request'].get('style_strength', 0), style_image=meta.get('style_image') or '', visual=NOTE[s], hand='')
    out.append(r)
with REVIEW.open('w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, list(out[0].keys()))
    w.writeheader()
    w.writerows(out)
print(len(out), 'rows')
