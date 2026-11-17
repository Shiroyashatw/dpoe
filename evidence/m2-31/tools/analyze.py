"""視覺量測第二步（只量不改）：讀 capture.js 的 RAW（每畫面的文字清單 JSON＋隱藏文字後的背景圖）與 shots/，
寫 contrast.csv、palette.csv、_stats.json（給 summary 用）。
用法：python3 -I analyze.py <RAW 資料夾> <evidence 資料夾> <repo 根目錄>"""
import sys, os, json, re, csv, glob, colorsys
import numpy as np
from PIL import Image

RAW, OUT, REPO = sys.argv[1], sys.argv[2], sys.argv[3]
CSS = os.path.join(REPO, 'css', 'style.css')


def lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lum(rgb):
    r, g, b = lin(np.asarray(rgb, dtype=float).T)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = np.maximum(la, lb), np.minimum(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def hx(c):
    return '#%02x%02x%02x' % tuple(int(round(v)) for v in c[:3])


# ---------- CSS 規則 → 行號 ----------
src = open(CSS, encoding='utf-8').read()
lines = src.split('\n')
norm = lambda s: re.sub(r'\s+', '', s.replace("'", '"'))
blocks = []  # (正規化選擇器清單, 起始行, 結束行)
# 粗略切出每個 { } 區塊（含 @media 內）：記錄每個「選擇器 {」開頭的行
depth, buf, start = 0, '', 1
stack = []
i = 0
line = 1
sel_start_line = 1
cur = ''
for ch in src:
    if ch == '{':
        stack.append((cur.strip(), sel_start_line, line))
        cur = ''
    elif ch == '}':
        if stack:
            s, sl, bl = stack.pop()
            if s and not s.startswith('@'):
                blocks.append((s, bl, line))
        cur = ''
    elif ch == ';' and stack:
        cur = ''
    else:
        if not cur.strip() and not ch.isspace():
            sel_start_line = line
        cur += ch
    if ch == '\n':
        line += 1
# 去掉註解後的選擇器
bidx = {}
for s, bl, el in blocks:
    s2 = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    bidx.setdefault(norm(s2), []).append((bl, el))


def css_loc(rule, props):
    """回 (token 字串, 行號)：選擇器找區塊，區塊內找屬性那一行。"""
    if not rule:
        return '', ''
    sel, val = rule.get('sel', ''), rule.get('val', '')
    toks = re.findall(r'var\((--[\w-]+)', val)
    tok = ','.join(toks) if toks else (val.strip()[:40] if val else '')
    if sel.startswith('('):
        return (tok + ' ' + sel).strip(), ''
    hits = bidx.get(norm(sel), [])
    for bl, el in reversed(hits):  # 瀏覽器取原始碼最後一條符合的，這裡也從後面找
        for ln in range(bl, el + 1):
            t = lines[ln - 1]
            if any(re.search(r'(^|[\s;{])' + re.escape(p) + r'\s*:', t) for p in props):
                if not toks or any(k in t for k in toks):
                    return tok, ln
        # 有區塊但屬性行找不到（寫法不同）→ 回區塊起點
    if hits:
        return tok, hits[-1][0]
    return tok, ''


# ---------- 對比 ----------
rows, stats = [], {}
for size in ('portrait', 'desktop'):
    for jf in sorted(glob.glob(os.path.join(RAW, size, '[0-9]*.json'))):
        d = json.load(open(jf, encoding='utf-8'))
        name, dpr = d['screen'], d['dpr']
        bg = np.asarray(Image.open(os.path.join(RAW, size, name + '.bg.png')).convert('RGB'))
        fg = np.asarray(Image.open(os.path.join(OUT, 'shots', size, name + '.png')).convert('RGB'))
        Hh, Ww = bg.shape[:2]
        st = stats.setdefault(size, {}).setdefault(name, {'dom': 0, 'occluded': 0, 'canvas': 0, 'fail': 0})

        def samp(img, box, ring=0):
            x0, y0, x1, y1 = [int(round(v * dpr)) for v in box]
            pad = int(round(2 * dpr))
            X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(Ww, x1 + pad), min(Hh, y1 + pad)
            if X1 <= X0 or Y1 <= Y0:
                return None
            reg = img[Y0:Y1, X0:X1].reshape(-1, 3)
            if ring:  # 只取外圈（canvas 的字沒辦法單獨隱藏）
                m = np.ones((Y1 - Y0, X1 - X0), bool)
                ix0, iy0 = max(0, x0 - X0), max(0, y0 - Y0)
                m[iy0:iy0 + (y1 - y0), ix0:ix0 + (x1 - x0)] = False
                reg = img[Y0:Y1, X0:X1][m]
            return reg if len(reg) else None

        def judge(rgba, px):
            cols, cnt = np.unique(px, axis=0, return_counts=True)
            a = min(1.0, max(0.0, rgba[3]))
            eff = lambda b: np.asarray(rgba[:3]) * a + np.asarray(b, float) * (1 - a)
            common = cols[cnt.argmax()]
            keep = cnt >= max(1, 0.02 * cnt.sum())  # 至少佔 2% 的顏色才算（去掉反鋸齒雜點）
            cand = cols[keep] if keep.any() else cols
            rs = np.array([ratio(eff(c), c) for c in cand])
            w = cand[rs.argmin()]
            return common, w, float(ratio(eff(common), common)), float(rs.min())

        for e in d['dom']:
            st['dom'] += 1
            if e['occluded']:
                st['occluded'] += 1
                continue
            px = [samp(bg, b) for b in e['boxes']]
            px = [p for p in px if p is not None]
            if not px:
                continue
            common, worst, rc, rw = judge(e['rgba'], np.concatenate(px))
            thr = 3.0 if e['large'] else 4.5
            ok = rw >= thr
            st['fail'] += 0 if ok else 1
            ct, cl = css_loc(e.get('cr'), ['color', '-webkit-text-fill-color'])
            bt, bl = css_loc(e.get('br'), ['background-color', 'background', 'background-image'])
            a = e['rgba'][3]
            rows.append(dict(size=size, screen=name, selector=e['sel'], text_sample=e['txt'], font_px=round(e['fs'], 1),
                             weight=e['fw'], large=int(e['large']),
                             text_hex=hx(e['rgba']) + ('' if a >= 0.999 else '@a%.2f' % a),
                             bg_hex_common=hx(common), bg_hex_worst=hx(worst), ratio_common=round(rc, 2),
                             ratio_worst=round(rw, 2), threshold=thr, pass_=int(ok),
                             css_token=('color:' + ct if ct else 'color:(inherit/UA)') + ' | bg:' + (bt or '(none)') + (' @' + e['br'].get('from', '') if e.get('br') else ''),
                             css_line=('c:%s' % cl) + (' bg:%s' % bl), extra=('shadow ' if e.get('shadow') else '') + ('stroke' if e.get('stroke') else '')))
        for c in d['canvas']:
            st['canvas'] += 1
            m = re.match(r'#([0-9a-f]{3,8})$', c['fill'].strip(), re.I)
            m2 = re.match(r'rgba?\(([^)]+)\)', c['fill'])
            if m:
                h = m.group(1)
                if len(h) in (3, 4):
                    h = ''.join(x * 2 for x in h)
                rgba = [int(h[i:i + 2], 16) for i in (0, 2, 4)] + [int(h[6:8], 16) / 255 if len(h) == 8 else 1]
            elif m2:
                p = [float(x) for x in re.split(r'[ ,/]+', m2.group(1)) if x]
                rgba = p[:3] + [p[3] if len(p) > 3 else 1]
            else:
                continue
            rgba[3] *= c['ga']
            if rgba[3] < 0.1:  # 淡出到幾乎看不到的跳數字不算
                st['canvas_faded'] = st.get('canvas_faded', 0) + 1
                continue
            px = samp(fg, c['box'], ring=1)
            if px is None:
                continue
            common, worst, rc, rw = judge(rgba, px)
            fpx = re.search(r'([\d.]+)px', c['font'])
            fs = float(fpx.group(1)) if fpx else 0
            bold = bool(re.search(r'bold|[6-9]00', c['font']))
            large = fs >= 24 or (fs >= 18.66 and bold)
            thr = 3.0 if large else 4.5
            st['cfail'] = st.get('cfail', 0) + (0 if rw >= thr else 1)
            rows.append(dict(size=size, screen=name, selector='canvas#%s:fillText' % c['canvas'], text_sample=c['t'], font_px=fs,
                             weight=700 if bold else 400, large=int(large), text_hex=hx(rgba) + ('' if rgba[3] >= 0.999 else '@a%.2f' % rgba[3]),
                             bg_hex_common=hx(common), bg_hex_worst=hx(worst), ratio_common=round(rc, 2), ratio_worst=round(rw, 2),
                             threshold=thr, pass_=int(rw >= thr), css_token='(canvas，js/render.js 的 fillStyle)', css_line='',
                             extra='canvas 外圈取樣' + ('；有描邊 ' + c['stroke'] if c.get('stroke') else '；無描邊')))

# ---------- canvas 算描邊（M2-31）：字形內填色 vs 字外 1–3 px 的描邊環 ----------
def shift_or(m, r):
    o = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy > r * r:
                continue
            o |= np.roll(np.roll(m, dy, 0), dx, 1)
    return o


srows = []
for size in ('portrait', 'desktop'):
    for jf in sorted(glob.glob(os.path.join(RAW, size, '[0-9]*.json'))):
        d = json.load(open(jf, encoding='utf-8'))
        name, dpr = d['screen'], d['dpr']
        fg = np.asarray(Image.open(os.path.join(OUT, 'shots', size, name + '.png')).convert('RGB')).astype(float)
        Hh, Ww = fg.shape[:2]
        for c in d['canvas']:
            if not c.get('stroke') or not c['stroke'].startswith('rgba(0'):
                continue
            m = re.match(r'#([0-9a-f]{6})$', c['fill'].strip(), re.I)
            if not m or c['ga'] < 0.1:
                continue
            fill = np.array([int(m.group(1)[i:i + 2], 16) for i in (0, 2, 4)], float)
            r3 = int(round(3 * dpr))
            x0, y0, x1, y1 = [int(round(v * dpr)) for v in c['box']]
            X0, Y0, X1, Y1 = max(0, x0 - r3 - 1), max(0, y0 - r3 - 1), min(Ww, x1 + r3 + 1), min(Hh, y1 + r3 + 1)
            if X1 - X0 < 3 or Y1 - Y0 < 3:
                continue
            reg = fg[Y0:Y1, X0:X1]
            inb = np.zeros(reg.shape[:2], bool)
            inb[max(0, y0 - Y0):y1 - Y0, max(0, x0 - X0):x1 - X0] = True
            # 字形：框內最接近 填色×透明度（壓在黑描邊上）的像素
            exp = fill * c['ga']
            dist = np.sqrt(((reg - exp) ** 2).sum(2))
            glyph = inb & (dist < max(40, 0.2 * np.linalg.norm(exp)))
            if glyph.sum() < 4 * dpr:
                continue
            ring = shift_or(glyph, r3) & ~shift_or(glyph, max(1, int(round(dpr))))
            ring &= ~glyph
            if not ring.any():
                continue
            fc = np.median(reg[glyph], 0)
            rc = np.median(reg[ring], 0)  # 環的中位數：描邊佔多數時就是描邊色
            rr = float(ratio(fc, rc))
            hurt = c['fill'].lower() == '#ff5a5a'
            srows.append([size, name, c['t'], c['fill'], round(c['ga'], 2), c['stroke'], hx(fc), hx(rc), round(rr, 2),
                          int(rr >= 4.5), '延到 M2-32' if hurt else 'C1'])
with open(os.path.join(OUT, 'canvas_stroke.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['size', 'screen', 'text', 'fill', 'alpha', 'stroke', 'glyph_hex', 'ring_hex', 'ratio', 'pass', 'scope'])
    w.writerows(srows)
for size in ('portrait', 'desktop'):
    rs = [r for r in srows if r[0] == size and r[10] == 'C1']
    print(size, 'canvas 描邊（C1）', len(rs), '筆，不合格', sum(1 for r in rs if not r[9]),
          '；hurt', sum(1 for r in srows if r[0] == size and r[10] != 'C1'), '筆')

cols = ['size', 'screen', 'selector', 'text_sample', 'font_px', 'weight', 'large', 'text_hex', 'bg_hex_common', 'bg_hex_worst',
        'ratio_common', 'ratio_worst', 'threshold', 'pass', 'css_token', 'css_line', 'note']
with open(os.path.join(OUT, 'contrast.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(cols)
    for r in rows:
        w.writerow([r[k] for k in cols[:13]] + [r['pass_'], r['css_token'], r['css_line'], r['extra']])

# ---------- 配色 ----------
pal_rows, pal_stats = [], {}
for size in ('portrait', 'desktop'):
    for f in sorted(glob.glob(os.path.join(OUT, 'shots', size, '*.png'))):
        name = os.path.basename(f)[:-4]
        im = Image.open(f).convert('RGB')
        dpr = 3 if size == 'portrait' else 1
        im = im.resize((im.width // dpr, im.height // dpr), Image.BOX)  # 每個 CSS 像素一格
        q = im.quantize(colors=16, method=Image.Quantize.MEDIANCUT)
        pal = q.getpalette()[:48]
        cnt = np.bincount(np.asarray(q).ravel(), minlength=16)
        tot = cnt.sum()
        order = np.argsort(-cnt)
        acc = 0
        for rk, i in enumerate([i for i in order if cnt[i] > 0], 1):
            rgb = pal[i * 3:i * 3 + 3]
            h, s, v = colorsys.rgb_to_hsv(*[x / 255 for x in rgb])
            share = 100 * cnt[i] / tot
            pal_rows.append([size, name, rk, hx(rgb), round(share, 2), round(h * 360), round(s, 3), round(v, 3)])
            if s >= 0.5 and v >= 0.5 and share >= 0.5:
                acc += 1
        a = np.asarray(im).reshape(-1, 3) / 255.0
        mx, mn = a.max(1), a.min(1)
        sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-9), 0)
        sb = np.histogram(sat, bins=[0, .2, .4, .6, .8, 1.0001])[0] / len(sat) * 100
        vb = np.histogram(mx, bins=[0, .2, .4, .6, .8, 1.0001])[0] / len(mx) * 100
        pal_stats.setdefault(size, {})[name] = dict(accents=acc, sat_bins=[round(x, 1) for x in sb], val_bins=[round(x, 1) for x in vb],
                                                     sat_mean=round(float(sat.mean()), 3), val_mean=round(float(mx.mean()), 3))
with open(os.path.join(OUT, 'palette.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['size', 'screen', 'rank', 'hex', 'share_pct', 'h', 's', 'v'])
    w.writerows(pal_rows)

json.dump({'contrast': stats, 'palette': pal_stats, 'rows': len(rows)}, open(os.path.join(RAW, '_stats.json'), 'w'), ensure_ascii=False, indent=1)
print('contrast rows', len(rows), 'palette rows', len(pal_rows))
for size in stats:
    print(size, 'dom fail', sum(v['fail'] for v in stats[size].values()), 'canvas fail', sum(v.get('cfail', 0) for v in stats[size].values()), 'rows', sum(1 for r in rows if r['size'] == size))
