"""main 與分支同一畫面的疊圖／差異圖＋截圖像素對比量測（SIGNOFF-CHECKLIST §3、§4）。
用法：python3 -I diff.py shots  → shots/cmp-*.png、measure.csv、diff-summary.csv"""
import csv, json, sys, os
import numpy as np
from PIL import Image, ImageDraw

D = sys.argv[1] if len(sys.argv) > 1 else 'shots'
names = sorted(f[len('branch-'):] for f in os.listdir(D) if f.startswith('branch-') and f.endswith('.png'))


def lum(c):
    c = np.asarray(c, float) / 255
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def cr(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


summ = []
for n in names:
    a = np.asarray(Image.open(f'{D}/main-{n}').convert('RGB')).astype(int)
    b = np.asarray(Image.open(f'{D}/branch-{n}').convert('RGB')).astype(int)
    if a.shape != b.shape:
        continue
    d = np.abs(a - b).max(axis=2)
    ch = d > 12
    pct = ch.mean() * 100
    heat = np.zeros_like(a)
    heat[..., 0] = np.clip(d * 4, 0, 255)
    heat[..., 1] = np.clip(d * 1, 0, 255) // 3
    gray = (b.mean(axis=2, keepdims=True) * 0.35).astype(int)
    over = np.where(ch[..., None], heat, gray)
    H, W = d.shape
    out = Image.new('RGB', (W * 3 + 20, H + 28), (16, 19, 15))
    for i, (im, t) in enumerate([(a, 'main 812b428'), (b, 'branch'), (over, f'diff >12 ({pct:.1f}% px)')]):
        out.paste(Image.fromarray(im.astype('uint8')), (i * (W + 10), 28))
        ImageDraw.Draw(out).text((i * (W + 10) + 4, 8), t, fill=(240, 240, 240))
    # 差異區塊圈起來（32 px 格）
    dr = ImageDraw.Draw(out)
    g = 32
    for y in range(0, H, g):
        for x in range(0, W, g):
            if ch[y:y + g, x:x + g].mean() > 0.15:
                dr.rectangle([2 * (W + 10) + x, 28 + y, 2 * (W + 10) + x + g - 1, 28 + y + g - 1], outline=(255, 214, 0))
    out.convert('RGB').save(f'{D}/cmp-{n[:-4]}.jpg', quality=82)
    summ.append([n, f'{pct:.2f}'])

with open(f'{D}/diff-summary.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['screen', 'changed_px_pct(maxch>12)'])
    w.writerows(summ)

# 對比量測：在截圖上取實際像素
rows = []
for tag in ['main', 'branch']:
    facts = json.load(open(f'{D}/{tag}-facts.json'))
    for k, f in facts.items():
        size = k[len(tag) + 1:]
        px = f['px']
        dpr = int(size.split('@')[1][0])
        for kind in ['crowd', 'hellfire-crisis']:
            p = f'{D}/{tag}-{size}-{kind}.png'
            if not os.path.exists(p):
                continue
            im = np.asarray(Image.open(p).convert('RGB')).astype(int)
            Hh, Ww = im.shape[:2]
            at = lambda x, y: im[min(Hh - 1, max(0, int(y * dpr))), min(Ww - 1, max(0, int(x * dpr)))]
            if kind == 'crowd':
                # 敵方預警：圓內 30% 半徑處的填色 vs 圓外 1.4 倍半徑處的地面
                for i, (x, y, r) in enumerate(px['tele']):
                    fill = at(x + r * 0.5, y)
                    grd = at(x + r * 1.6, y)
                    rows.append([tag, size, kind, f'tele{i} 填色 vs 地面', [int(v) for v in fill], [int(v) for v in grd], f'{cr(fill, grd):.2f}', ''])
                x, y = px['portal']
                ring = max(((at(x + dx, y), dx) for dx in range(30, 60)), key=lambda c: lum(c[0]))[0]
                grd = at(x + 80, y)
                rows.append([tag, size, kind, '傳送門環（最亮點）vs 地面', [int(v) for v in ring], [int(v) for v in grd], f'{cr(ring, grd):.2f}', '≥3'])
            else:
                for bar in ['bmp', 'omp', 'bhp', 'ohp']:
                    r = px.get(bar)
                    if not r:
                        continue
                    x, y, w, h = r
                    if w < 4:
                        continue
                    fill = at(x + 3, y + h - 3 if bar.startswith('o') else y + h / 2)
                    empty = at(x + w - 3, y + h / 2) if bar.startswith('b') else at(x + w / 2, y + 3)
                    rows.append([tag, size, kind, f'{bar} 填色 vs 空段', [int(v) for v in fill], [int(v) for v in empty], f'{cr(fill, empty):.2f}', ''])
with open(f'{D}/measure.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['tree', 'size', 'shot', 'what', 'rgb_a', 'rgb_b', 'contrast', 'threshold'])
    w.writerows(rows)
print('\n'.join(','.join(r) for r in summ))
print(len(rows), 'measurements')
