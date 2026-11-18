"""M2-42 體檢截圖的後處理：讀 tools/m2_42_shots.js 產生的 shots.json 與每張圖的 .json，
算 PF1（檔案）、PF3 舒服 (a)–(f)（specs/M2-36-palette-tokens.md「舒服」量測表）、bar_contrast，
合併 DOM 量測做 PF5、PF10–PF16（specs/M2-42-ux-audit-checklist.md §2），寫 measure.csv、prefilter.csv、
特寫裁切（crops/，最近鄰 ×4）、連拍總覽（-sheet.png）、summary.md（流程點擊紀錄讀 flows.json）。
用法：python3 tools/m2_42_post.py [證據資料夾，預設 docs/production/evidence/m2-42]（Pillow、numpy）"""
import csv, hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'docs', 'production', 'evidence', 'm2-42')
T = 'm2-42'
shots = json.load(open(os.path.join(ROOT, 'shots.json')))
flows = json.load(open(os.path.join(ROOT, 'flows.json'))) if os.path.exists(os.path.join(ROOT, 'flows.json')) else []
man = json.load(open(os.path.join(ROOT, 'manifest.json'))) if os.path.exists(os.path.join(ROOT, 'manifest.json')) else {}
COMMIT = man.get('commit', '')

# ---------- 色彩 ----------
def srgb_lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def lab(rgb):
    lin = srgb_lin(rgb.astype(np.float64))
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = lin @ M.T
    xyz /= np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return L, a, b, lin @ np.array([0.2126, 0.7152, 0.0722])

def rel_lum(c):
    c = np.array(c, dtype=np.float64)
    return float(srgb_lin(c) @ np.array([0.2126, 0.7152, 0.0722]))

def contrast(c1, c2):
    a, b = rel_lum(c1), rel_lum(c2)
    return (max(a, b) + 0.05) / (min(a, b) + 0.05)

def parse_rgb(s):
    try:
        v = s[s.index('(') + 1 : s.index(')')].replace('/', ',').split(',')
        return [float(x) for x in v[:3]]
    except Exception:
        return None

def mask_of(rects, W, H, k=1.0):
    m = np.zeros((H, W), bool)
    for x, y, w, h in rects:
        x0, y0 = max(0, int(x * k)), max(0, int(y * k))
        x1, y1 = min(W, int((x + w) * k)), min(H, int((y + h) * k))
        if x1 > x0 and y1 > y0:
            m[y0:y1, x0:x1] = True
    return m

PANELS = ['panel', 'pidle', 'over', 'tree', 'tip', 'ttip']
DOMS = ['top', 'bottom', 'bar', 'bars', 'pidle', 'pnav', 'dnav', 'modesw', 'panel', 'tree', 'over', 'tip', 'ttip', 'banner', 'chase', 'warn', 'lvup', 'dlog', 'prog', 'area', 'run', 'bossbar', 'phand', 'prac', 'paused', 'rcd', 'rot', 'tmore']

def comfort(img, d):
    """(a)–(f)：在 CSS 像素解析度上量（縮掉 DPR）"""
    dpr = d.get('dpr', 1)
    W, H = img.size[0] // dpr, img.size[1] // dpr
    sm = img.convert('RGB').resize((W, H), Image.Resampling.BOX)
    rgb = np.asarray(sm)
    L, A, B, Y = lab(rgb)
    C = np.hypot(A, B)
    hue = (np.degrees(np.arctan2(B, A)) + 360) % 360
    R = d['m']['regions']
    pm = mask_of(sum((R.get(k, []) for k in PANELS), []), W, H)
    dm = mask_of(sum((R.get(k, []) for k in DOMS), []), W, H)
    cv = mask_of(R.get('cv', [[0, 0, W, H]]), W, H)
    sc = cv & ~dm
    out = {}
    out['a_scene_l'] = round(float(L[sc].mean()), 1) if sc.any() else ''
    out['a_panel_l'] = round(float(L[pm].mean()), 1) if pm.any() else ''
    # 關鍵資訊：主按鈕字、標題、主數字的字形像素（離該框中位數最遠的 15%）
    keys = [t['r'] for t in d['m'].get('text', []) if t.get('key')]
    kl = []
    for x, y, w, h in keys:
        x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
        if x1 - x0 < 2 or y1 - y0 < 2:
            continue
        sub = L[y0:y1, x0:x1].ravel()
        med = np.median(sub)
        dev = np.abs(sub - med)
        g = sub[dev >= np.quantile(dev, 0.85)]
        kl.append(float(g.mean()))
    out['a_key_l'] = round(float(np.mean(kl)), 1) if kl else ''
    if out['a_panel_l'] != '' and out['a_scene_l'] != '':
        out['a_panel_minus_scene'] = round(out['a_panel_l'] - out['a_scene_l'], 1)
    else:
        out['a_panel_minus_scene'] = ''
    lay = out['a_panel_l'] if out['a_panel_l'] != '' else out['a_scene_l']
    out['a_key_minus_layer'] = round(out['a_key_l'] - lay, 1) if out['a_key_l'] != '' and lay != '' else ''
    if pm.any() and sc.any():
        out['b_panel_scene'] = round((float(Y[pm].mean()) + 0.05) / (float(Y[sc].mean()) + 0.05), 2)
    else:
        out['b_panel_scene'] = ''
    sat = C > 40
    out['c_sat_pct'] = round(float(sat.mean()) * 100, 1)
    where = []
    if sat.any():
        tot = sat.sum()
        for k in ['cv'] + DOMS:
            if k not in R:
                continue
            m = mask_of(R[k], W, H) & sat
            if k == 'cv':
                m &= ~dm
            if m.sum() / tot > 0.1:
                where.append(f"{'scene' if k == 'cv' else k}")
    out['c_sat_where'] = '|'.join(where)
    brown = (L >= 25) & (L <= 55) & (hue >= 30) & (hue <= 90) & (C > 8)
    out['d_brown_pct'] = round(float(brown.mean()) * 100, 1)
    out['f_bright_pct'] = round(float((L > 80).mean()) * 100, 1)
    # (e) 文字對實際背後的對比：背景＝字框外圍一圈像素的中位數
    cs, cols, fails, barc = [], set(), 0, []
    for t in d['m'].get('text', []):
        x, y, w, h = t['r']
        c = parse_rgb(t['c'])
        if not c or w < 2 or h < 2:
            continue
        x0, y0, x1, y1 = max(0, x - 2), max(0, y - 2), min(W, x + w + 2), min(H, y + h + 2)
        if x1 - x0 < 3 or y1 - y0 < 3:
            continue
        ring = np.concatenate([rgb[y0, x0:x1], rgb[y1 - 1, x0:x1], rgb[y0:y1, x0], rgb[y0:y1, x1 - 1]])
        bg = np.median(ring, axis=0)
        k = contrast(c, bg)
        if '#bhp' in t['s'] or '#bmp' in t['s']:
            barc.append(k)
        if t.get('x'):
            continue
        cs.append(k)
        cols.add(tuple(int(v) for v in c))
        if k < 4.5 or k > 12:
            fails += 1
    out['e_text_min'] = round(min(cs), 2) if cs else ''
    out['e_text_max'] = round(max(cs), 2) if cs else ''
    out['e_text_fail'] = fails if cs else ''
    out['e_ui_colors'] = len(cols) if cs else ''
    out['bar_contrast'] = round(min(barc), 2) if barc else ''
    return out, L

FIELDS = 'task id viewport screen state file frame commit dpr px_w px_h a_scene_l a_panel_l a_key_l a_panel_minus_scene a_key_minus_layer b_panel_scene c_sat_pct c_sat_where d_brown_pct e_text_min e_text_max e_text_fail e_ui_colors f_bright_pct bar_contrast num_min_px icon_scale hit_min fx_sat_pct fx_black_pct checks verdict fail'.split()

def pf1(path, d, Lstd, hashes):
    im = Image.open(path)
    vw, vh = d['vw'], d['vh']
    if d.get('viewport_override'):
        vw, vh = map(int, d['viewport_override'].split('x'))
    bad = []
    if im.size != (vw * d['dpr'], vh * d['dpr']):
        bad.append(f'PF1 尺寸 {im.size} ≠ {vw * d["dpr"]}x{vh * d["dpr"]}')
    if im.mode in ('RGBA', 'LA') and np.asarray(im)[..., -1].min() < 255:
        bad.append('PF1 有透明像素')
    if Lstd < 2:
        bad.append(f'PF1 L*標準差 {Lstd:.1f}<2（空白或全黑）')
    if d.get('errs'):
        bad.append('PF1 pageerror：' + '；'.join(d['errs'])[:120])
    return bad

def crop(path, d, name, rect, k=4):
    im = Image.open(path)
    dpr = d['dpr']
    x, y, w, h = rect
    box = (max(0, x * dpr), max(0, y * dpr), min(im.size[0], (x + w) * dpr), min(im.size[1], (y + h) * dpr))
    if box[2] - box[0] < 2 or box[3] - box[1] < 2:
        return None, None
    c = im.crop(box).convert('RGB')
    os.makedirs(os.path.join(ROOT, d['viewport'], 'crops'), exist_ok=True)
    rel = f"{d['viewport']}/crops/{d['screen']}-{d['state']}-{name}-x{k}.png"
    c.resize((c.size[0] * k // dpr, c.size[1] * k // dpr), Image.Resampling.NEAREST).save(os.path.join(ROOT, rel))
    return rel, c

def glyph_l(c):
    """跳數字／條：框裡最亮 15% 像素的平均 L*（字形）與整框平均"""
    L = lab(np.asarray(c))[0].ravel()
    top = L[L >= np.quantile(L, 0.85)]
    return round(float(top.mean()), 1), round(float(L.mean()), 1)

def sheet(frames, out):
    ims = [Image.open(os.path.join(ROOT, f)).convert('RGB') for f in frames]
    w, h = ims[0].size
    cols = max(1, min(len(ims), 4096 // w))
    if cols < len(ims) and w > 1024:
        s = 1024 / w
        ims = [i.resize((int(w * s), int(h * s)), Image.Resampling.BOX) for i in ims]
        w, h = ims[0].size
        cols = min(len(ims), 4096 // w)
    rows = (len(ims) + cols - 1) // cols
    S = Image.new('RGB', (cols * w, rows * h))
    dr = ImageDraw.Draw(S)
    for i, im in enumerate(ims):
        S.paste(im, ((i % cols) * w, (i // cols) * h))
        dr.rectangle([(i % cols) * w, (i // cols) * h, (i % cols) * w + 26, (i // cols) * h + 14], fill=(0, 0, 0))
        dr.text(((i % cols) * w + 3, (i // cols) * h + 2), f'{i:02d}', fill=(255, 255, 255))
    q = 1.0
    while True:
        S.save(out, optimize=True)
        if os.path.getsize(out) <= 2e6 or q < 0.3:
            break
        q *= 0.8
        S = S.resize((int(S.size[0] * 0.8), int(S.size[1] * 0.8)), Image.Resampling.BOX)

measure, pre, info = [], [], {}
hashes = {}
for r in shots:
    if r['verdict'] != 'shot':
        continue
    p = os.path.join(ROOT, r['file'])
    hashes.setdefault((r['id'], r['viewport']), {})[r['state']] = hashlib.md5(open(p, 'rb').read()).hexdigest()

for r in sorted(shots, key=lambda r: (r['id'], r['viewport'], r['state'])):
    key = (r['id'], r['viewport'], r['state'])
    if r['verdict'] != 'shot':
        pre.append({'task': T, 'id': r['id'], 'viewport': r['viewport'], 'screen': r['screen'], 'state': r['state'], 'star': r.get('star', 0), 'verdict': r['verdict'], 'pf1': '', 'pf2': 'blocked' if r['verdict'] == 'blocked' else 'n/a', 'fail': '', 'reason': r.get('reason', '') + (' ' + json.dumps(r.get('v'), ensure_ascii=False) if r.get('v') else '')})
        continue
    p = os.path.join(ROOT, r['file'])
    d = json.load(open(p[:-4] + '.json'))
    img = Image.open(p)
    cm, L = comfort(img, d)
    m = d['m']
    port = d['viewport'] != '1280x720'
    bad1 = pf1(p, d, float(L.std()), hashes)
    same = [s for s, h in hashes[(r['id'], r['viewport'])].items() if s != r['state'] and h == hashes[(r['id'], r['viewport'])][r['state']]]
    if same:
        bad1.append('PF1 與同列狀態 ' + ','.join(same) + ' 同一張圖（畫面上分不出這幾個狀態）')
    ck = dict(d.get('checks') or {})
    fails = []
    # PF3 舒服（門檻：M2-36-palette-tokens.md「舒服」量測表）
    if cm['a_panel_minus_scene'] != '' and cm['a_panel_minus_scene'] < 8:
        fails.append(f"PF3(a) 面板−場景 {cm['a_panel_minus_scene']}<8")
    if cm['a_key_minus_layer'] != '' and cm['a_key_minus_layer'] < 40:
        fails.append(f"PF3(a) 關鍵−所在層 {cm['a_key_minus_layer']}<40")
    if cm['b_panel_scene'] != '' and cm['b_panel_scene'] < 1.4:
        fails.append(f"PF3(b) 面板÷場景 {cm['b_panel_scene']}<1.4")
    if cm['c_sat_pct'] > 10:
        fails.append(f"PF3(c) 飽和 {cm['c_sat_pct']}%>10%（{cm['c_sat_where']}）")
    if cm['d_brown_pct'] > 50:
        fails.append(f"PF3(d) 中明度褐 {cm['d_brown_pct']}%>50%")
    if cm['e_text_fail'] not in ('', 0):
        fails.append(f"PF3(e) 正文對比不在 4.5–12：{cm['e_text_fail']} 筆（{cm['e_text_min']}–{cm['e_text_max']}）")
    if cm['e_ui_colors'] != '' and cm['e_ui_colors'] > 5:
        fails.append(f"PF3(e) 介面字色 {cm['e_ui_colors']} 種>5")
    if cm['f_bright_pct'] > 25:
        fails.append(f"PF3(f) 亮面 {cm['f_bright_pct']}%>25%")
    if cm['bar_contrast'] != '' and cm['bar_contrast'] < 4.5:
        fails.append(f"PF8 #bhp/#bmp 對比 {cm['bar_contrast']}<4.5")
    # PF5／PF10 熱區（F §3、§12）
    hit = m['hit']
    hit_min = f"{hit['min'][0]}x{hit['min'][1]} {hit['min'][2]}" if hit.get('min') else ''
    if hit['nbad']:
        fails.append(f"PF10 熱區不足 {hit['nbad']} 個（{'、'.join(hit['bad'][:3])}）門檻 {'直立 44×44／主 48' if port else '桌機主48／次36／圖示32'}")
    if port and hit.get('adj_lt8'):
        ck['adj_lt8'] = hit['adj_lt8']
    # PF11 字級（F §2）
    f = m['fonts']
    ck['font_min'] = f['min']
    if f['nlt12']:
        fails.append(f"PF11 字高<12 {f['nlt12']} 筆（{'、'.join(f['lt12'][:2])}）")
    if f['nlt14']:
        fails.append(f"PF11 正文<14 {f['nlt14']} 筆")
    if f['h_lt18']:
        ck['h_lt18'] = len(f['h_lt18'])
    # PF12 截斷
    if m['ntrunc']:
        ck['trunc'] = '、'.join(m['trunc'][:4])
        fails.append(f"PF12 截斷 {m['ntrunc']} 處")
    # PF13 重疊
    ov = m['overlap']
    if ov:
        ck['overlap'] = ','.join(f'{k}={v}' for k, v in ov.items())
    if m.get('rbar_overlap'):
        fails.append(f"PF13 資源列兄弟交集 {m['rbar_overlap']}px²")
    if m.get('rbar_outside'):
        ck['rbar_outside'] = m['rbar_outside']
    if m.get('sk_area'):
        ck['sk_block'] = f"{m['sk_block']}/{m['sk_area']}"
        if m['sk_block']:
            fails.append(f"PF13 技能鍵被擋 {m['sk_block']}/{m['sk_area']}px²")
    for k in ('banner/dnav', 'banner/prog', 'chase/dnav', 'chase/prog', 'bossbar/banner', 'bar/pidle'):
        if ov.get(k):
            fails.append(f'PF13 {k} 交集 {ov[k]}px²')
    # PF14 捲動層（補遺 §5.3 目標 1 層）
    ck['scroll_layers'] = len(m['scroll'])
    if len(m['scroll']) > 1:
        fails.append(f"PF14 同時可捲 {len(m['scroll'])} 層（{'|'.join(m['scroll'][:4])}）")
    # PF15 隱藏資訊
    hid = ck.get('hidden')
    if hid and hid != 'none':
        fails.append(f'PF15 hidden={hid}')
    # PF16 色碼字面值（F §12–13）
    if m['color_lit']:
        ck['color_lit'] = '|'.join(m['color_lit'][:6])
        fails.append(f"PF16 色碼字面值 {len(m['color_lit'])} 處")
    # PF5 圖示整數倍
    icon = 'ok' if not m['nicon_bad'] else '|'.join(m['icon_bad'][:4])
    if m['nicon_bad']:
        fails.append(f"PF5 圖示非整數倍 {m['nicon_bad']} 個")
    if m.get('img_broken'):
        ck['img_broken'] = '|'.join(m['img_broken'][:4])
    # 特寫裁切（黑暗層 Z-8 量 L*）
    for name, rect in (d.get('crops') or {}).items():
        rel, c = crop(p, d, name, rect)
        if c is not None and name != 'cmtop':
            g, mean = glyph_l(c)
            ck[f'L_{name}'] = f'{g}/{mean}'
    if 'L_num-near' in ck and 'L_num-far' in ck:
        ck['L_near_minus_far'] = round(float(ck['L_num-near'].split('/')[0]) - float(ck['L_num-far'].split('/')[0]), 1)
    for k, v in (d.get('v') or {}).items():
        if k.startswith('G_') or k in ('night', 'fog'):
            ck['verify_' + k] = v
    verdict = 'fail' if (bad1 or fails) else 'pass'
    row = {'task': T, 'id': r['id'], 'viewport': r['viewport'], 'screen': r['screen'], 'state': r['state'], 'file': r['file'], 'frame': '', 'commit': COMMIT, 'dpr': d['dpr'], 'px_w': img.size[0], 'px_h': img.size[1], **cm, 'num_min_px': '', 'icon_scale': icon, 'hit_min': hit_min, 'fx_sat_pct': '', 'fx_black_pct': '', 'checks': ';'.join(f'{k}={v}' for k, v in ck.items()), 'verdict': verdict, 'fail': '；'.join(bad1 + fails)}
    measure.append(row)
    # 連拍：每幀一列、總覽
    if d.get('burst'):
        fr = [b['f'] for b in d['burst']]
        sheet(fr, os.path.join(ROOT, r['viewport'], f"{r['screen']}-{r['state']}-sheet.png"))
        for i, b in enumerate(d['burst']):
            bi = Image.open(os.path.join(ROOT, b['f']))
            bc, _ = comfort(bi, d)
            measure.append({**row, **bc, 'file': b['f'], 'frame': i, 'checks': f"t={b['t']};night={b['night']};fog={b['fog']};nums={b['nums']};drops={b['beams']}", 'verdict': '', 'fail': ''})
    pre.append({'task': T, 'id': r['id'], 'viewport': r['viewport'], 'screen': r['screen'], 'state': r['state'], 'star': r.get('star', 0), 'verdict': verdict, 'pf1': 'fail' if bad1 else 'pass', 'pf2': 'pass', 'fail': '；'.join(bad1 + fails), 'reason': ''})
    info[key] = {'row': row, 'pf1': not bad1, 'fails': fails, 'checks': ck, 'v': d.get('v')}

with open(os.path.join(ROOT, 'measure.csv'), 'w', newline='') as fo:
    w = csv.DictWriter(fo, FIELDS)
    w.writeheader()
    for r in measure:
        w.writerow({k: r.get(k, '') for k in FIELDS})
PF = 'task id viewport screen state star verdict pf1 pf2 fail reason'.split()
with open(os.path.join(ROOT, 'prefilter.csv'), 'w', newline='') as fo:
    w = csv.DictWriter(fo, PF)
    w.writeheader()
    for r in pre:
        w.writerow({k: r.get(k, '') for k in PF})

# ---------- summary.md ----------
VPS = ['390x844', '1280x720']
by = {}
for r in pre:
    by.setdefault((r['id'], r['state']), {})[r['viewport']] = r
order = []
for r in shots:
    k = (r['id'], r['state'])
    if k not in order:
        order.append(k)
SEC = ['A-I', 'A-H', 'A-D', 'A-C', 'A-O', 'A-M', 'B-S', 'B-E', 'B-F', 'B-P', 'B-T', 'B-A', 'B-Y']
def idkey(k):
    a, b = k[0].split('-')
    return (SEC.index(a + '-' + b[0]), int(b[1:]) if b[1:].isdigit() else 0)
order.sort(key=lambda k: (idkey(k), [s['state'] for s in shots if s['id'] == k[0]].index(k[1])))
cnt = {}
for r in pre:
    if r['viewport'] in VPS:
        cnt[r['verdict']] = cnt.get(r['verdict'], 0) + 1
S = []
S.append(f'# M2-42 全頁 UI/UX 體檢截圖（{T}）\n')
S.append(f"遊戲 commit `{COMMIT}`（main），執行 {man.get('run_at', '')}（台北時間）。清單：`specs/M2-42-ux-audit-checklist.md`、`-b.md` @ `{man.get('checklist_commit', '')}`。流程：`specs/visual-review-protocol.md`。\n")
S.append(f"第一輪 154 列 × 2 尺寸 = {sum(cnt.values())} 筆：過 {cnt.get('pass', 0)}、沒過 {cnt.get('fail', 0)}、卡住 {cnt.get('blocked', 0)}、n/a {cnt.get('n/a', 0)}。\n")
S.append('「沒過」幾乎都是 UX 預篩（PF3／PF10–PF16）抓到的現行問題；這是體檢，PF1／PF2 過的 ★ 圖照樣列在「給美術總監看」。狀態都照清單用 `?test=midgame&seed=42&dbg=1`、全域函式與 `DBG.*` 做，AUDIT 補丁只在截圖工具裡注入（`tools/m2_42_page.js`）。\n')
S.append('## 每列結果\n\n| ID | 畫面－狀態 | 390×844 | 1280×720 | 重點數字 |\n| --- | --- | --- | --- | --- |')
icon = {'pass': '✅', 'fail': '❌', 'blocked': '⛔', 'n/a': 'n/a'}
def cell(r):
    if not r:
        return '—'
    v = icon[r['verdict']]
    if r['verdict'] == 'shot':
        v = '?'
    f = info.get((r['id'], r['viewport'], r['state']))
    link = f" [圖]({f['row']['file']})" if f else ''
    if r['verdict'] == 'fail':
        codes = sorted(set(x.split(' ')[0] for x in r['fail'].split('；') if x))
        return f"{v} {' '.join(codes)}{link}"
    if r['verdict'] in ('blocked', 'n/a'):
        return f"{v} {r['reason'][:40]}"
    return v + link
for k in order:
    rs = by.get(k, {})
    ck = []
    for vp in VPS:
        f = info.get((k[0], vp, k[1]))
        if not f:
            continue
        c = f['checks']
        bits = [f"{x}={c[x]}" for x in ('hidden', 'idle_shrink', 'beige_slots', 'scroll_layers', 'sk_block', 'rec_same', 'L_near_minus_far', 'dlog_colors') if x in c and c[x] not in ('', None)]
        if bits:
            ck.append(f"{vp[:3]}:{','.join(bits)}")
    S.append(f"| {k[0]} | {[s['screen'] for s in shots if s['id'] == k[0]][0]}－{k[1]} | {cell(rs.get('390x844'))} | {cell(rs.get('1280x720'))} | {'；'.join(ck)[:160]} |")
# 給美術總監看
S.append('\n## 給美術總監看（★ 列，PF1／PF2 過就列，不管 UX 預篩）\n')
for k in order:
    sh = [s for s in shots if s['id'] == k[0] and s['state'] == k[1]]
    if not sh or not sh[0].get('star'):
        continue
    links = []
    for vp in VPS:
        f = info.get((k[0], vp, k[1]))
        if f and f['pf1']:
            links.append(f"[{vp[:4]}]({f['row']['file']})")
    if links:
        S.append(f"- {k[0]} {sh[0]['screen']}－{k[1]}：{' · '.join(links)}")
    else:
        # PF1 只因「同列狀態同一張圖」沒過：這正是要看的問題（狀態在畫面上分不出來），照樣列出
        dup = []
        for vp in VPS:
            r = by.get(k, {}).get(vp)
            f = info.get((k[0], vp, k[1]))
            if f and r and all('同一張圖' in x for x in r['fail'].split('；') if x.startswith('PF1')):
                dup.append(f"[{vp[:4]}]({f['row']['file']})")
        if dup:
            S.append(f"- {k[0]} {sh[0]['screen']}－{k[1]}：{' · '.join(dup)}（PF1 只因跟同列其他狀態同一張圖沒過＝畫面上分不出狀態）")
# 黑暗層
S.append('\n## 黑暗層決策 A-D1～A-D3（Z-8，給 mumi 決定 3a §6）\n')
S.append('現行繪製順序：`drawBeams`、`drawBars`、`drawNums` 在暗層之後（選項 2，永遠全亮）。L* 欄是「字形／條最亮 15% 的平均 L* ／整框平均 L*」。驗證值：天黑 `G.night>G.t`、大霧 `G.fog>G.t` 且 `G.night≤G.t`。\n')
S.append('| 列 | 尺寸 | 驗證 G.t／G.night／G.fog | 光柱 | 怪物生命條 | 近距數字 | 遠距數字 | 近−遠 | 腳下地面 | 特寫 |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for rid in ('A-D1', 'A-D2', 'A-D3', 'A-D4'):
    for k in [o for o in order if o[0] == rid]:
        for vp in VPS:
            f = info.get((rid, vp, k[1]))
            if not f:
                continue
            c = f['checks']
            v = f['v'] or {}
            cr = ' '.join(f"[{n}]({vp}/crops/combat-{k[1]}-{n}-x4.png)" for n in ('beam', 'bar', 'num-near', 'num-far') if f'L_{n}' in c)
            S.append(f"| {rid} {k[1]} | {vp} | {v.get('G_t')}／{v.get('G_night')}／{v.get('G_fog')} | {c.get('L_beam', '')} | {c.get('L_bar', '')} | {c.get('L_num-near', '')} | {c.get('L_num-far', '')} | {c.get('L_near_minus_far', '')} | {c.get('L_ground', '')} | {cr} |")
# 流程點擊紀錄
S.append('\n## 流程點擊紀錄\n')
for vp in VPS:
    S.append(f'\n### {vp}\n\n| 流程 | 尺寸 | 步驟（動作 → 畫面） | 點擊或按鍵次數 | 層數或備註 |\n| --- | --- | --- | --- | --- |')
    for fl in [f for f in flows if f['viewport'] == vp]:
        S.append(f"| {fl['flow']} | {vp} | {' → '.join(fl['steps'])} | {fl['clicks']} | {fl['note']}{' · [影片](' + fl['video'] + ')' if fl.get('video') else ''} |")
# Z-1～Z-10
def ck_of(i, vp, st):
    f = info.get((i, vp, st))
    return f['checks'] if f else {}
S.append('\n## 只有數字（Z-1～Z-10）\n')
lit = {}
for (i, vp, st), f in info.items():
    for s in str(f['checks'].get('color_lit', '')).split('|'):
        if s:
            lit.setdefault(s, set()).add(f'{i}')
S.append('**Z-1 色碼字面值**（可見元件 style 屬性裡的色碼／rgb()；只記選擇器）：' + ('；'.join(f"`{k}`（{','.join(sorted(v))[:60]}）" for k, v in sorted(lit.items())) or '無') + '。另：天賦樹圖例 `.lg` 用 `--c` 自訂屬性帶色值（tree.js），技能、王印等 canvas 色碼不在 DOM，不在此列。\n')
for vp in VPS:
    c1, c2 = ck_of('A-H12', vp, 'dlog-mix'), ck_of('A-H12', vp, 'dlog-cur')
    S.append(f"**Z-2 {vp}**：#dlog 混稀有度 {c1.get('dlog_n', '')} 行、字色 {c1.get('dlog_colors', '')} 種、有圖示={c1.get('dlog_icon', '')}（只放 3 行）；只有通貨時字色 {c2.get('dlog_colors', '')} 種。")
S.append('')
for vp in VPS:
    z3 = []
    for st in ('ammo-mid', 'ammo-last', 'ammo-reload'):
        z3.append(f"{st}:{ck_of('A-H3', vp, st).get('hidden', '')}")
    for st in ('gren-full', 'gren-cd'):
        z3.append(f"{st}:{ck_of('A-H4', vp, st).get('hidden', '')}")
    for st in ('charge-1', 'charge-2', 'charge-3'):
        z3.append(f"{st}:{ck_of('A-H5', vp, st).get('hidden', '')}")
    S.append(f"**Z-3 {vp}**（PF15，技能格上的數字）：{'、'.join(z3)}")
S.append('')
for vp in VPS:
    S.append(f"**Z-4 {vp}**：掛機卡 A-C1 技能鍵被擋 {ck_of('A-C1', vp, 'expand').get('sk_block', '量不到（自動模式不畫技能列）')}、手動 A-H2 技能鍵被擋 {ck_of('A-H2', vp, 'manual').get('sk_block', '')}；營地半版 B-P1 scroll_layers={ck_of('B-P1', vp, 'sheet').get('scroll_layers', '')}、資源列高 {ck_of('B-P1', vp, 'sheet').get('cmtop_h', '')}px；掛機卡資源列 A-C2 截斷={ck_of('A-C2', vp, 'resbar').get('rbar_cut', '')}。")
S.append('\n**Z-5**：見上「流程點擊紀錄」。\n')
for vp in VPS:
    c = ck_of('B-E1', vp, 'beige')
    S.append(f"**Z-6 {vp}**：裝備格米色方塊 beige_slots={c.get('beige_slots', '')}（{c.get('beige_sel', '')}）；有圖的 img {c.get('img_ok', '')} 個；不符合需求的格 {c.get('eq_bad', '')}。")
S.append('')
for vp in VPS:
    c = ck_of('B-S6', vp, 'pick-sups')
    S.append(f"**Z-7 {vp}**：B-S6 推薦列 {c.get('rows', '')} 列、推薦差同一句={c.get('rec_same', '')}（{c.get('rec', '')}）、說明被截斷 {c.get('desc_trunc', '')} 列、篩選列可橫捲={c.get('chips_scroll', '')}。")
S.append('\n**Z-8**：見上「黑暗層決策」表。\n')
S.append('**Z-9 Esc 關閉順序**（照 `js/hud.js` 鍵盤處理讀出，未另錄）：確認卡（`G.ask`）→ 天賦樹 → 面板（`closePanels`）→ 都沒有時打開設定；設定頁快捷鍵表寫「Esc：取消確認、關閉面板；都沒有時打開設定」，一致。死亡卡不吃 Esc。\n')
s3 = [r for r in pre if r['viewport'] == '375x667']
c3 = {}
for r in s3:
    c3[r['verdict']] = c3.get(r['verdict'], 0) + 1
S.append(f"**Z-10 375×667 第二輪**（標 S 的列）：{len(s3)} 筆：過 {c3.get('pass', 0)}、沒過 {c3.get('fail', 0)}、卡住 {c3.get('blocked', 0)}、n/a {c3.get('n/a', 0)}。" + ('' if s3 else '（本輪未跑）'))
if s3:
    S.append('\n| ID | 狀態 | 結果 | 熱區最小 | 字級最小 | 沒過 |\n| --- | --- | --- | --- | --- | --- |')
    for r in sorted(s3, key=lambda r: (idkey((r['id'], r['state'])), r['state'])):
        f = info.get((r['id'], '375x667', r['state']))
        S.append(f"| {r['id']} | {r['state']} | {icon[r['verdict']]} | {f['row']['hit_min'] if f else ''} | {f['checks'].get('font_min', '') if f else ''} | {r['fail'][:120] if r['verdict'] == 'fail' else r['reason'][:60]} |")
S.append('\n**新舊對照 (g)**：左邊 main 與本輪同一個 commit，無舊圖、略（清單 §14）。mumi 的 fb 1.jpg–4.jpg 不在雲端（`/workspace/fb` 不存在），沒拼。\n')
S.append('**沒錄的動態**（清單列的「動態」欄，必錄以外）：開場全程、自動切手動、橫幅、升級膠囊、掛機卡王倒下、離線滾數字、分頁 hover／按住、倉庫捲動、營地全版、試招場走進石圈、翻牌。必錄 8 條主流程（兩尺寸）都有。\n')
# 穩定性（visual-review-protocol §3：同一份清單跑兩次，靜態圖要逐像素相同）
sp = os.path.join(ROOT, 'stability.json')
if os.path.exists(sp):
    st = json.load(open(sp))
    bad = [k for k, v in st['files'].items() if not v]
    S.append(f"\n## 穩定性（★ 列重跑一次逐像素比對）\n\n比了 {len(st['files'])} 張：相同 {len(st['files']) - len(bad)}、不穩定 {len(bad)}。" + ('不穩定：' + '、'.join(bad) if bad else '') + f"\n\n{st.get('note', '')}\n")
# 卡住、n/a
S.append('\n## 卡住（狀態做不出來或驗狀態不成立）\n')
bl = [r for r in pre if r['verdict'] == 'blocked']
S.extend([f"- {r['id']} {r['viewport']} {r['screen']}－{r['state']}：{r['reason']}" for r in bl] or ['- 無'])
S.append('\n## n/a（只有某一種尺寸有的畫面）\n')
S.extend([f"- {r['id']} {r['viewport']} {r['screen']}－{r['state']}：{r['reason']}" for r in pre if r['verdict'] == 'n/a'])
# 狀態做法的偏差
S.append('\n## 狀態做法跟清單不同的地方（照實記）\n')
dev = []
for k, f in info.items():
    c = f['checks']
    for x in ('forge_lv', 'watch_lv', 'altar', 'note', 'scene_after_skip', 'hold', 'sub_t'):
        if x in c and str(c[x]) and '→' in str(c[x]) or (x in ('note', 'scene_after_skip', 'hold') and x in c):
            dev.append(f"- {k[0]} {k[1]} {k[2]}：{x}={c[x]}")
S.extend(sorted(set(dev)))
open(os.path.join(ROOT, 'summary.md'), 'w').write('\n'.join(S) + '\n')
print('measure', len(measure), 'prefilter', len(pre), cnt)
