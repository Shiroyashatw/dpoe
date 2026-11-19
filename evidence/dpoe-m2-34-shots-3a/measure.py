"""M2-34 3a 視覺審查：讀 shoot.js 產生的 png＋json，算 measure.csv（流程 §5）、prefilter.csv（§6）、地磚特寫、連拍總覽、summary.md。
門檻照來源檔：舒服 (a)–(f) 照 specs/M2-36-palette-tokens.md「舒服」表；接縫 ≤ 1.2 照 M2-36-pixellab-prompts.md §6；
地磚格 ≤ 1 裝置 px 照 M2-33-3a §3.2 驗收 1；跳數字下限照 M2-33-3a §1.3；熱區照 M2-33-1 §13-5。
用法：python3 -I evidence/dpoe-m2-34-shots-3a/measure.py"""
import csv, glob, hashlib, json, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

OUT = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(OUT, '..', '..'))
REL = lambda p: os.path.relpath(p, OUT)
MAN = json.load(open(os.path.join(OUT, 'manifest.json')))
RUN = MAN['run']
COMMIT = MAN['game_commit'][:7]
TASK = 'dpoe-m2-34-shots-3a'


# ---------- 色彩 ----------
def lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lab(img):
    a = img[..., :3].astype(np.float64)
    r, g, b = lin(a[..., 0]), lin(a[..., 1]), lin(a[..., 2])
    X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: np.where(t > 0.008856, np.cbrt(t), 7.787 * t + 16 / 116)
    fx, fy, fz = f(X), f(Y), f(Z)
    L = 116 * fy - 16
    A = 500 * (fx - fy)
    Bb = 200 * (fy - fz)
    C = np.hypot(A, Bb)
    H = (np.degrees(np.arctan2(Bb, A)) + 360) % 360
    return L, C, H, Y


def rgb_of(s):
    s = s.strip()
    if s.startswith('#'):
        s = s[1:]
        if len(s) == 3:
            s = ''.join(c * 2 for c in s)
        return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
    v = s[s.index('(') + 1:s.index(')')].replace('/', ' ').replace(',', ' ').split()
    return tuple(float(x) for x in v[:3])


def relY(rgb):
    r, g, b = [lin(np.array(c, dtype=float)) for c in rgb]
    return float(0.2126 * r + 0.7152 * g + 0.0722 * b)


def contrast(c1, c2):
    a, b = relY(c1), relY(c2)
    return (max(a, b) + 0.05) / (min(a, b) + 0.05)


def rmask(shape, rects, dpr):
    m = np.zeros(shape[:2], bool)
    H, W = shape[:2]
    for r in rects:
        x0, y0 = int(round(r['x'] * dpr)), int(round(r['y'] * dpr))
        x1, y1 = int(round((r['x'] + r['w']) * dpr)), int(round((r['y'] + r['h']) * dpr))
        m[max(0, y0):min(H, y1), max(0, x0):min(W, x1)] = True
    return m


def fmt(v, n=2):
    if v is None or v == '':
        return ''
    if isinstance(v, float):
        return f'{v:.{n}f}'
    return str(v)


# ---------- 一張圖的量測 ----------
def comfort(png, dom, judge_c=True, night=False):
    im = np.array(Image.open(png))
    alpha_ok = True
    if im.shape[2] == 4:
        alpha_ok = bool((im[..., 3] == 255).all())
    L, C, Hh, Y = lab(im)
    dpr = dom['dpr']
    vw, vh = dom['vw'], dom['vh']
    area = vw * vh
    ui = dom['ui']
    uim = rmask(im.shape, ui, dpr)
    panels = [r for r in ui if r['w'] * r['h'] >= 0.03 * area]
    pm = rmask(im.shape, panels, dpr)
    cvm = rmask(im.shape, [dom['canvas']], dpr)
    scene = cvm & ~uim
    o = {}
    o['px_w'], o['px_h'] = im.shape[1], im.shape[0]
    o['size_ok'] = (im.shape[1] == round(vw * dpr) and im.shape[0] == round(vh * dpr))
    o['alpha_ok'] = alpha_ok
    o['l_std'] = float(L.std())
    o['a_scene_l'] = float(L[scene].mean()) if scene.any() else None
    o['a_panel_l'] = float(L[pm].mean()) if pm.any() else None
    # 關鍵資訊：粗字／主按鈕／生命魔力條數字的字形像素（跟所在框中位數差 > 20 的像素）
    keyL, keyD = [], []
    for t in dom['texts']:
        if not t['key']:
            continue
        m = rmask(im.shape, [t], dpr)
        if m.sum() < 9:
            continue
        lv = L[m]
        med = float(np.median(lv))
        g = lv[np.abs(lv - med) > 20]
        if g.size < 3:
            continue
        keyL.append(float(g.mean()))
        keyD.append(abs(float(g.mean()) - med))
    o['a_key_l'] = float(np.mean(keyL)) if keyL else None
    o['a_panel_minus_scene'] = (o['a_panel_l'] - o['a_scene_l']) if (o['a_panel_l'] is not None and o['a_scene_l'] is not None) else None
    o['a_key_minus_layer'] = float(np.mean(keyD)) if keyD else None
    o['a_key_min'] = float(min(keyD)) if keyD else None
    o['b_panel_scene'] = ((float(Y[pm].mean()) + 0.05) / (float(Y[scene].mean()) + 0.05)) if (pm.any() and scene.any()) else None
    sat = C > 40
    o['c_sat_pct'] = float(sat.mean() * 100)
    where = []
    if sat.any():
        tot = sat.sum()
        sc = (sat & scene).sum()
        if sc:
            where.append(('scene', sc))
        for r in ui:
            n = (sat & rmask(im.shape, [r], dpr)).sum()
            if n:
                where.append((r['sel'], n))
        where.sort(key=lambda x: -x[1])
        o['c_sat_where'] = '|'.join(f"{w}:{100 * n / tot:.0f}%" for w, n in where[:5])
    else:
        o['c_sat_where'] = ''
    o['d_brown_pct'] = float(((L >= 25) & (L <= 55) & (Hh >= 30) & (Hh <= 90) & (C > 8)).mean() * 100)
    o['f_bright_pct'] = float((L > 80).mean() * 100)
    # (e) 正文字對實際背後（框內中位色）
    cs, cols, fails = [], set(), []
    bars = []
    for t in dom['texts']:
        m = rmask(im.shape, [t], dpr)
        if m.sum() < 9:
            continue
        bg = tuple(float(x) for x in np.median(im[..., :3][m], axis=0))
        fg = rgb_of(t['color'])
        c = contrast(fg, bg)
        if '#bhp' in t['sel'] or '#bmp' in t['sel']:
            bars.append(c)
        if t['item']:
            continue
        cs.append(c)
        cols.add(t['color'])
        if c < 4.5 or c > 12:
            fails.append(f"{t['sel']}「{t['txt'][:8]}」{c:.1f}")
    o['e_text_min'] = min(cs) if cs else None
    o['e_text_max'] = max(cs) if cs else None
    o['e_text_fail'] = len(fails)
    o['e_fail_list'] = fails
    o['e_ui_colors'] = len(cols)
    o['bar_contrast'] = min(bars) if bars else None
    nonint = [i['sel'] for i in dom['icons'] if abs(i['k'] - round(i['k'])) > 1e-3 or i['k'] < 1 - 1e-3]
    o['icon_scale'] = 'ok' if not nonint else '|'.join(sorted(set(nonint)))[:300]
    cm = dom['clk_min'][0] if dom['clk_min'] else None
    o['hit_min'] = f"{cm['w']:.0f}x{cm['h']:.0f} {cm['sel']}" if cm else ''
    o['hit_min_side'] = min(cm['w'], cm['h']) if cm else None
    o['_im'] = im
    o['_L'] = L
    return o


def tile_measure(o, rects, dpr):
    """3a §3.2 驗收 1（材質像素格寬差 ≤ 1 裝置 px）、驗收 2（區塊邊界接縫）；回傳 checks 與特寫區"""
    im = o['_im'][..., :3].astype(int)
    t66, t77, t88 = rects['t66'], rects['t77'], rects['t88']
    x0 = int(round(t66['x'] * dpr))
    y0 = int(round(t66['y'] * dpr))
    tw = t66['w'] * dpr
    x1 = int(round((t88['x'] + t88['w']) * dpr))
    y1 = int(round((t66['y'] + t66['h'] * 2) * dpr))
    H, W = im.shape[:2]
    if x0 < 0 or y0 < 0 or x1 > W or y1 > H:
        return {'grid': 'out-of-view'}, None
    u = tw / 32.0
    crop = im[y0:y1, x0:x1]
    devs, runs = [], []
    for row in crop[:: max(1, int(u))]:
        d = np.abs(np.diff(row, axis=0)).sum(axis=1) > 12
        ch = np.nonzero(d)[0] + 1
        for c in ch:
            r = c / u
            devs.append(abs(r - round(r)) * u)
        for a, b in zip(ch[:-1], ch[1:]):
            if b - a < 1.5 * u:
                runs.append(b - a)
    grid_dev = max(devs) if devs else None
    spread = (max(runs) - min(runs)) if runs else None

    def coldiff(b):
        b = int(b)
        return float(np.abs(im[y0:y1, b] - im[y0:y1, b - 1]).sum(axis=1).mean() / 3)

    bch = int(round(t88['x'] * dpr))
    btl = int(round(t77['x'] * dpr))
    # 磚內相鄰（同一張磚裡的材質像素邊界）平均
    inner = [coldiff(round(t77['x'] * dpr + k * u)) for k in range(1, 32)]
    inner_m = float(np.mean(inner))
    seam_chunk = coldiff(bch) / inner_m if inner_m else None
    seam_tile = coldiff(btl) / inner_m if inner_m else None
    ck = {
        'u_dev_px': round(u, 3),
        'grid_dev_max': round(grid_dev, 2) if grid_dev is not None else '',
        'grid_run_spread': spread if spread is not None else '',
        'seam_chunk': round(seam_chunk, 3) if seam_chunk is not None else '',
        'seam_tile_ref': round(seam_tile, 3) if seam_tile is not None else '',
    }
    # 特寫：地板 2×2 格，區塊邊在中間（tile 7|8）
    cx0 = int(round(t77['x'] * dpr))
    cx1 = int(round((t88['x'] + t88['w']) * dpr))
    cr = Image.fromarray(o['_im'][y0:y1, cx0:cx1, :3].astype('uint8'))
    return ck, cr


def pf1(o, errs):
    bad = []
    if not o['size_ok']:
        bad.append(f"尺寸 {o['px_w']}x{o['px_h']}")
    if not o['alpha_ok']:
        bad.append('有透明像素')
    if o['l_std'] < 2:
        bad.append(f"L* 標準差 {o['l_std']:.2f}<2")
    if errs:
        bad.append('pageerror ' + ' | '.join(errs)[:120])
    return bad


def pf3(o, idle=True, night=False):
    bad = []
    if o['a_panel_minus_scene'] is not None and not night and o['a_panel_minus_scene'] < 8:
        bad.append(f"(a) 面板−場景 {o['a_panel_minus_scene']:.1f}<8")
    if o['a_key_minus_layer'] is not None and o['a_key_minus_layer'] < 40:
        bad.append(f"(a) 關鍵−所在層 {o['a_key_minus_layer']:.1f}<40")
    if o['b_panel_scene'] is not None and not night and o['b_panel_scene'] < 1.4:
        bad.append(f"(b) {o['b_panel_scene']:.2f}<1.4")
    if idle and o['c_sat_pct'] > 10:
        bad.append(f"(c) {o['c_sat_pct']:.1f}%>10%")
    if not night and o['d_brown_pct'] > 50:
        bad.append(f"(d) {o['d_brown_pct']:.1f}%>50%")
    if o['e_text_fail']:
        bad.append(f"(e) 正文對比不在 4.5–12 的 {o['e_text_fail']} 筆（{o['e_text_min']:.1f}–{o['e_text_max']:.1f}）")
    if o['e_ui_colors'] > 5:
        bad.append(f"(e) 字色 {o['e_ui_colors']} 種>5")
    if o['f_bright_pct'] > 25:
        bad.append(f"(f) {o['f_bright_pct']:.1f}%>25%")
    if o['bar_contrast'] is not None and o['bar_contrast'] < 4.5:
        bad.append(f"條 {o['bar_contrast']:.2f}<4.5")
    return bad


def pf5(o, mob):
    bad = []
    if o['icon_scale'] != 'ok':
        bad.append('圖示非整數倍：' + o['icon_scale'][:160])
    need = 44 if mob else 32
    if o['hit_min_side'] is not None and o['hit_min_side'] < need:
        bad.append(f"熱區 {o['hit_min']} < {need}")
    return bad


def pf9(rid, state, ck, vk):
    """清單「量測」欄＋3a 規格的數字"""
    bad = []
    if rid == 'S-1':
        ip = [float(x) for x in str(ck.get('icon_px', '')).split('|') if x]
        if not ip or any(abs(x - ck['icon_want']) > 0.5 for x in ip):
            bad.append(f"中央圖示 {ck.get('icon_px')}px ≠ {ck['icon_want']}（3a §1.2）")
        if vk in ('P', 'S') and 'false' in str(ck.get('icon_smooth')):
            bad.append('直立 32→16 沒開平滑縮')
        if '#ff3b3b' in str(ck.get('foe_color')):
            bad.append('怪物地面框仍是寫死 #ff3b3b（應 PAL.bad）')
        oa = [float(x) for x in str(ck.get('own_fill_alpha', '')).split('|') if x]
        if any(a > 0.14 + 1e-6 for a in oa):
            bad.append(f"自己的地面填色 {ck['own_fill_alpha']}>14%")
        if ck.get('hero_outline') != 'yes':
            bad.append('主角被特效蓋到時沒有描邊／腳下圈')
    if rid == 'S-2':
        if ck.get('num_floor_fail') not in ('none', None):
            bad.append('跳數字低於下限 ' + str(ck['num_floor_fail']))
        if ck.get('num_outline_px') not in ('', None) and float(ck['num_outline_px']) < 2:
            bad.append(f"描邊 {ck['num_outline_px']}px<2")
        if 'rgba(0, 0, 0' in str(ck.get('num_outline_color')):
            bad.append('跳數字描邊仍是寫死 rgba(0,0,0,0.95)（應 PAL.dmgOutline，3a §1.3）')
        if ck.get('target_ring') != 'yes':
            bad.append('沒有目前敵人腳下圈')
    if rid == 'S-4' and state == 'scene':
        if str(ck.get('plate_h_world')) != '26':
            bad.append(f"名牌高 {ck.get('plate_h_world')}（世界 px；螢幕 {ck.get('plate_h_css')} CSS px）≠ 26")
        if 'rgba(38, 40, 45' in str(ck.get('plate_bg')):
            bad.append('名牌底仍是寫死 rgba(38,40,45,0.94)（應 PAL.plateWorld）')
        if ck.get('plate_icon16') != 'yes':
            bad.append('名牌沒有 16 px 設施圖示')
    if rid == 'S-5':
        lit = ck.get('cc_literals')
        if lit and lit != 'none':
            bad.append('設施卡寫死色：' + str(lit)[:200])
    if rid.startswith('E-1') and state == 'idle':
        if str(ck.get('chunk_px')) != '256':
            bad.append(f"區塊 {ck.get('chunk_px')} ≠ 256（3a §3.2）")
        if ck.get('tiles') != 'yes':
            bad.append('地磚沒載入')
    if rid == 'E-3':
        if ck.get('tiles') != 'no' or str(ck.get('chunk_px')) != '384' or int(ck.get('pageerror', 0)):
            bad.append(f"退回不完整 tiles={ck.get('tiles')} chunk={ck.get('chunk_px')} err={ck.get('pageerror')}")
    return bad


# ---------- 主流程 ----------
VPK = {'390x844': 'P', '1280x720': 'D', '375x667': 'S', '1440x900': 'W'}
MOB = {'P': 1, 'S': 1, 'D': 0, 'W': 0}
MCOLS = ['task', 'id', 'viewport', 'screen', 'state', 'file', 'frame', 'commit', 'dpr', 'px_w', 'px_h',
         'a_scene_l', 'a_panel_l', 'a_key_l', 'a_panel_minus_scene', 'a_key_minus_layer', 'b_panel_scene',
         'c_sat_pct', 'c_sat_where', 'd_brown_pct', 'e_text_min', 'e_text_max', 'e_text_fail', 'e_ui_colors',
         'f_bright_pct', 'bar_contrast', 'num_min_px', 'icon_scale', 'hit_min', 'fx_sat_pct', 'fx_black_pct',
         'checks', 'verdict', 'fail']
mrows, prows = [], []
hashes = {}


def ckstr(ck):
    return ';'.join(f'{k}={v}' for k, v in ck.items() if k != 'tile_rects')


def add_measure(rid, vp, screen, state, file, frame, dpr, o, ck, verdict, fail, num_min=None):
    r = {'task': TASK, 'id': rid, 'viewport': vp, 'screen': screen, 'state': state, 'file': file, 'frame': frame,
         'commit': COMMIT, 'dpr': dpr, 'checks': ckstr(ck), 'verdict': verdict, 'fail': fail,
         'num_min_px': fmt(num_min, 1) if num_min is not None else ''}
    if o:
        for k in ['px_w', 'px_h', 'e_text_fail', 'e_ui_colors', 'icon_scale', 'hit_min', 'c_sat_where']:
            r[k] = o[k]
        for k in ['a_scene_l', 'a_panel_l', 'a_key_l', 'a_panel_minus_scene', 'a_key_minus_layer', 'b_panel_scene',
                  'c_sat_pct', 'd_brown_pct', 'e_text_min', 'e_text_max', 'f_bright_pct', 'bar_contrast']:
            r[k] = fmt(o[k])
    mrows.append(r)


def add_pf(rid, vp, screen, state, verdict, why, file='', star='', rnd=''):
    prows.append({'id': rid, 'viewport': vp, 'screen': screen, 'state': state, 'round': rnd, 'star': star,
                  'verdict': verdict, 'reason': why, 'file': file})


shots = sorted(glob.glob(os.path.join(OUT, '*x*', '*.json')))
crops_done = []
for jf in shots:
    d = json.load(open(jf))
    png = jf[:-5] + '.png'
    vp, vk = d['vp'], d['vk']
    rid, screen, state = d['id'], d['screen'], d['state']
    ck = d['checks']
    night = state == 'night'
    idle = state in ('idle', 'scene', 'overview', 'expand', 'ready', 'lock', 'hover') and rid != 'E-3'
    o = comfort(png, d['dom'], night=night)
    if rid == 'E-1' and ck.get('tile_rects'):
        tr = json.loads(ck['tile_rects'])
        tk, cr = tile_measure(o, tr, d['dom']['dpr'])
        ck.update(tk)
        if cr is not None:
            cd = os.path.join(OUT, vp, 'crops')
            os.makedirs(cd, exist_ok=True)
            cf = os.path.join(cd, f'{screen}-{state}-seam-floor-x4.png')
            cr.resize((cr.width * 4, cr.height * 4), Image.NEAREST).save(cf, optimize=True)
            crops_done.append(REL(cf))
    hkey = (rid, vp)
    h = hashlib.md5(o['_im'].tobytes()).hexdigest()
    dup = h in hashes.get(hkey, set())
    hashes.setdefault(hkey, set()).add(h)
    bad1 = pf1(o, d['errs']) + (['跟同列另一狀態是同一張圖'] if dup else [])
    blocked = not d['state_ok']
    bad3 = pf3(o, idle=idle, night=night)
    bad5 = pf5(o, MOB[vk])
    bad9 = pf9(rid, state, ck, vk)
    if rid == 'E-1' and state == 'idle':
        if ck.get('grid_dev_max') not in ('', None) and float(ck['grid_dev_max']) > 1:
            bad9.append(f"地磚格偏差 {ck['grid_dev_max']} 裝置 px>1")
        if ck.get('grid_run_spread') not in ('', None) and float(ck['grid_run_spread']) > 1:
            bad9.append(f"相鄰方塊寬差 {ck['grid_run_spread']}>1")
        if ck.get('seam_chunk') not in ('', None) and float(ck['seam_chunk']) > 1.2:
            bad9.append(f"區塊接縫 {ck['seam_chunk']}>1.2")
    groups = [('PF1', bad1), ('PF3', bad3), ('PF5', bad5), ('PF9', bad9)]
    fails = [f'{g} ' + '；'.join(b) for g, b in groups if b]
    verdict = 'blocked' if blocked else ('fail' if fails else 'pass')
    why = ('狀態不成立：' + d['cond'] + '｜') if blocked else ''
    why += ' ／ '.join(fails)
    num_min = ck.get('num_min_px')
    add_measure(rid, vp, screen, state, REL(png), '', d['dom']['dpr'], o, ck, verdict, why, num_min)
    add_pf(rid, vp, screen, state, verdict, why or '全過', REL(png), 'star' if d['star'] else '', d['round'])

# 連拍（S-6）：每幀一列 measure，一張總覽
for bd in sorted(glob.glob(os.path.join(OUT, '*x*', 'camp-upgrade-burst'))):
    vp = os.path.basename(os.path.dirname(bd))
    fr = sorted(glob.glob(os.path.join(bd, '*.png')))
    thumbs = []
    for f in fr:
        d = json.load(open(f[:-4] + '.json'))
        o = comfort(f, d['dom'])
        card = d.get('card') or {}
        ck = {'card_w': card.get('w'), 'card_bg': card.get('bg'), 'anim': card.get('anim')}
        bad = pf1(o, d['errs'])
        add_measure('S-6', vp, 'camp', 'upgrade', REL(f), d['frame'], d['dom']['dpr'], o, ck,
                    'fail' if bad else 'pass', '；'.join(bad))
        im = Image.open(f).convert('RGB')
        thumbs.append(im)
    if thumbs:
        tw = 320 if thumbs[0].width >= 1000 else 195
        th = round(thumbs[0].height * tw / thumbs[0].width)
        cols = 10
        rows = math.ceil(len(thumbs) / cols)
        sheet = Image.new('RGB', (cols * tw, rows * th), (16, 16, 16))
        dr = ImageDraw.Draw(sheet)
        for i, t in enumerate(thumbs):
            x, y = (i % cols) * tw, (i // cols) * th
            sheet.paste(t.resize((tw, th), Image.LANCZOS), (x, y))
            dr.rectangle([x, y, x + 22, y + 12], fill=(0, 0, 0))
            dr.text((x + 2, y), f'{i:02d}', fill=(255, 255, 255))
        sp = os.path.join(OUT, vp, 'camp-upgrade-sheet.png')
        sheet.save(sp, optimize=True)

# 只有數字的列（S-3、S-4 hover n/a、S-6、E-5、Q3-*）
nums = RUN['numbers']
for n in nums:
    vk = VPK.get(n['vp'], '')
    ck = n.get('checks', {})
    if n['id'] == 'S-6':
        bad = []
        sm = ck.get('scale_max')
        if sm not in ('', None) and abs(float(sm) - 1.03) > 0.005:
            bad.append(f'卡放大最大 {sm}，M2-23.7 要 1→1.03→1')
        if 'rgba(123, 211, 107' in str(ck.get('bg_f0')):
            bad.append('升級底色仍是寫死綠 rgba(123,211,107,0.18)（應 --hl-rgb）')
        v = n.get('verdict') or ('fail' if bad else 'pass')
        why = '；'.join(bad)
        add_measure('S-6', n['vp'], 'camp', 'upgrade', n.get('burst', ''), 'all', '', None, ck, v, why)
        add_pf('S-6', n['vp'], 'camp', 'upgrade', v, why or '全過', n['vp'] + '/camp-upgrade-sheet.png', 'star', 1 if vk in 'PD' else 2)
        continue
    add_measure(n['id'], n['vp'], n['screen'], n['state'], n.get('file', n.get('src', '')), '', '', None, ck, n['verdict'], n.get('fail', ''))
    add_pf(n['id'], n['vp'], n['screen'], n['state'], n['verdict'], n.get('fail') or '全過', n.get('file', n.get('src', '')), '', 1 if vk in 'PD' else 2)

# 影片：PF1（存在、≤ 3 MB、≤ 6 秒、沒有 pageerror）
for v in RUN['videos']:
    f = os.path.join(OUT, v['file'])
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip() or 0)
    bad = []
    if v['bytes'] > 3 * 1024 * 1024:
        bad.append(f"{v['bytes'] / 1e6:.1f} MB>3")
    if dur > 6.05:
        bad.append(f'{dur:.1f} 秒>6')
    if v['errs']:
        bad.append('pageerror ' + ' | '.join(v['errs'])[:100])
    info = v.get('info') or {}
    if v['name'].startswith('fx-') and not v['name'].endswith('fallback') and info.get('sig') in (False, None, 'crit'):
        bad.append('沒播到招牌特效')
    if v['name'].endswith('fallback') and info.get('sig') not in (False, None, 'crit'):
        bad.append('擋掉 sig 圖後仍是招牌特效')
    rid = 'S-6' if v['name'] == 'camp-upgrade' else 'E-4'
    st = v['name']
    ver = 'fail' if bad else 'pass'
    ck = {'dur_s': round(dur, 2), 'bytes': v['bytes'], **{k: str(x) for k, x in info.items()}}
    add_measure(rid, v['vp'], 'video', st, v['file'], '', '', None, ck, ver, '；'.join(bad))
    add_pf(rid, v['vp'], 'video', st, ver, '；'.join(bad) or '全過（手感由美術總監看影片）', v['file'], 'star' if rid == 'S-6' else '', 1)

# Z3-3（3a 部分）：PR #66＋#75 改到的 render.js、biome.js、tiles.js、style.css 新增行有沒有色碼字面值
import re
# 只看 3a 兩個 PR 自己的改動：#66（3456ad5→eb6d5f7）、#75（f281eb4→7ab7fa5）
FILES = ['--', 'js/render.js', 'js/biome.js', 'js/tiles.js', 'css/style.css']
diff = ''.join(subprocess.run(['git', '-C', ROOT, 'diff', '--diff-algorithm=histogram', a, b] + FILES, capture_output=True, text=True).stdout
               for a, b in [('3456ad5', 'eb6d5f7'), ('f281eb4', '7ab7fa5')])
hits, cur = [], ''
for ln in diff.splitlines():
    if ln.startswith('+++ '):
        cur = ln[6:]
    elif ln.startswith('+') and not ln.startswith('+++'):
        if re.search(r"#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d|linear-gradient|--r4\b", ln) and not ln.strip().startswith(('+//', '+/*', '+ *')) and not re.match(r"\+\s*--[\w-]+\s*:", ln):
            hits.append(f"{cur}: {ln[1:].strip()[:90]}")
open(os.path.join(OUT, 'z3-3-literals.txt'), 'w').write('\n'.join(hits) + '\n')
zv = 'fail' if hits else 'pass'
for vp in ['390x844', '1280x720']:
    add_measure('Z3-3', vp, 'diff', 'literals', 'z3-3-literals.txt', '', '', None, {'hits': len(hits)}, zv, f'{len(hits)} 行新增色碼／漸層字面值（見 z3-3-literals.txt）' if hits else '')
    add_pf('Z3-3', vp, 'diff', 'literals', zv, f'{len(hits)} 行新增色碼字面值' if hits else '全過', 'z3-3-literals.txt', '', 1)
# Z3-5 ＝ S-3（同一份 CX 呼叫記錄）
for p in [r for r in prows if r['id'] == 'S-3']:
    prows.append({**p, 'id': 'Z3-5', 'reason': '同 S-3：' + p['reason']})

# ---------- 完整性：清單列 × 尺寸 ----------
EXPECT = []
for vp in ['390x844', '1280x720', '375x667', '1440x900']:
    r = 1 if vp in ('390x844', '1280x720') else 2
    for rid, sc, st in [('S-1', 'combat', 'ground'), ('S-2', 'combat', 'fire'), ('S-3', 'combat', 'layers'), ('Z3-5', 'combat', 'layers'),
                        ('S-4', 'camp', 'scene'), ('S-4', 'camp', 'hover'), ('S-4', 'camp', 'ready'), ('S-4', 'camp', 'lock'),
                        ('S-5', 'camp', 'overview'), ('S-5', 'camp', 'expand'), ('S-6', 'camp', 'upgrade')]:
        EXPECT.append((rid, vp, sc, st, r))
    for b in ['temple', 'lava', 'tomb', 'ice']:
        EXPECT.append(('E-1', vp, f'combat-{b}', 'idle', r))
        EXPECT.append(('E-1n', vp, f'combat-{b}', 'night', r))
for vp in ['390x844', '1280x720']:
    EXPECT += [('S-6', vp, 'video', 'camp-upgrade', 1), ('Z3-3', vp, 'diff', 'literals', 1), ('E-3', vp, 'combat-temple', 'fallback', 1),
               ('E-5', vp, 'wangyin', 'icon-scale', 1), ('Q3-1', vp, 'combat-auto', 'compare', 1), ('Q3-2', vp, 'camp-overview', 'compare', 1)]
    for fx in ['crit', 'lvup', 'chase']:
        for t in ['', '-fallback']:
            EXPECT.append(('E-4', vp, 'video', f'fx-{fx}-play{t}', 1))
have = {(p['id'], p['viewport'], p['screen'], p['state']) for p in prows}
missing = [e for e in EXPECT if (e[0], e[1], e[2], e[3]) not in have]
for e in missing:
    add_pf(e[0], e[1], e[2], e[3], '缺', '這輪沒有產生（腳本沒跑到）', '', '', e[4])

order = {k: i for i, k in enumerate(['S-1', 'S-2', 'S-3', 'Z3-5', 'S-4', 'S-5', 'S-6', 'Z3-3', 'Q3-1', 'Q3-2', 'E-1', 'E-1n', 'E-3', 'E-4', 'E-5'])}
vorder = {'390x844': 0, '1280x720': 1, '375x667': 2, '1440x900': 3}
prows.sort(key=lambda p: (order.get(p['id'], 99), p['screen'], p['state'], vorder.get(p['viewport'], 9)))
cnt = {}
for p in prows:
    cnt[p['verdict']] = cnt.get(p['verdict'], 0) + 1
with open(os.path.join(OUT, 'prefilter.csv'), 'w', newline='') as f:
    f.write(f"# 完整性：清單列×尺寸 {len(EXPECT)} 列（第一輪 390×844、1280×720；第二輪 375×667、1440×900；另 3a §5 驗收列 E-*）；本檔 {len(prows)} 列："
            + '、'.join(f'{k} {v}' for k, v in sorted(cnt.items())) + f"；缺 {len(missing)}\n")
    w = csv.DictWriter(f, fieldnames=['id', 'viewport', 'screen', 'state', 'round', 'star', 'verdict', 'reason', 'file'])
    w.writeheader()
    w.writerows(prows)
with open(os.path.join(OUT, 'measure.csv'), 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=MCOLS, extrasaction='ignore')
    w.writeheader()
    w.writerows(mrows)
json.dump({'expect': len(EXPECT), 'rows': len(prows), 'count': cnt, 'missing': missing, 'crops': crops_done},
          open(os.path.join(OUT, 'prefilter-summary.json'), 'w'), ensure_ascii=False, indent=1)
print(len(EXPECT), len(prows), cnt, 'missing', len(missing))
