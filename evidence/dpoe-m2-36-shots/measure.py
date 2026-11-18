#!/usr/bin/env python3
"""M2-36 視覺審查：量測（measure.csv）、預篩（prefilter.csv）、特寫、素材對照、新舊對照、連拍總覽、summary.md。
讀 shots.js 產生的 rows.json、extra.json 與各尺寸的 png／json。門檻照來源檔（見 THR 註解），不在這裡另訂。
用法：python3 -I evidence/dpoe-m2-36-shots/measure.py
"""
import csv, glob, hashlib, json, math, os, pathlib, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
TASK = 'dpoe-m2-36-shots'
B4 = ['temple', 'lava', 'tomb', 'ice']
VPD = {'390x844': 2, '1280x720': 1, '375x667': 2}

# ---------- 門檻（來源） ----------
THR = {
    'a_panel_scene': 8,  # palette-tokens「舒服」(a) 面板 − 場景 ≥ 8
    'a_key': 40,  # (a) 關鍵資訊 − 所在層 ≥ 40
    'b': 1.4,  # (b) ≥ 1.4:1
    'c': 10.0,  # (c) 閒置 ≤ 10%
    'd': 50.0,  # (d) ≤ 50%
    'e_lo': 4.5, 'e_hi': 12.0, 'e_colors': 5,  # (e)
    'f': 25.0,  # (f) ≤ 25%
    'bar': 4.5,  # 樣張：#bhp／#bmp ≥ 4.5
    'num_min': {'hit': 13, 'crit': 18, 'hurt': 14, 'other': 11},  # M2-33-3a §1.3
    'num_lw': 2,  # 描邊螢幕上 ≥ 2 px
    'hit_port': 44, 'hit_desk': 32,  # M2-33-1 §13-5
    'fx_max': 12.0, 'fx_8_s': 0.4, 'fx_black': 5.0, 'fx_5s': 15.0,  # 畫法規則 §6、PL §6
    'seam': 1.2,  # PL §6 接縫
    'beam_de': 2.0,  # M2-33-3a §4.3
    'grid': 1,  # §3.2 驗收 1：相鄰方塊寬差 ≤ 1 裝置 px
}

# ---------- 色彩 ----------
def lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lab(rgb):
    r, g, b = lin(rgb[..., 0]), lin(rgb[..., 1]), lin(rgb[..., 2])
    X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: np.where(t > 216 / 24389, np.cbrt(t), (24389 / 27 * t + 16) / 116)
    fx, fy, fz = f(X), f(Y), f(Z)
    return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], -1), Y


def de2000(l1, l2):
    L1, a1, b1 = l1[..., 0], l1[..., 1], l1[..., 2]
    L2, a2, b2 = l2[..., 0], l2[..., 1], l2[..., 2]
    C1, C2 = np.hypot(a1, b1), np.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - np.sqrt(Cb**7 / (Cb**7 + 25**7)))
    a1p, a2p = a1 * (1 + G), a2 * (1 + G)
    C1p, C2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p = np.degrees(np.arctan2(b1, a1p)) % 360
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360
    dLp, dCp = L2 - L1, C2p - C1p
    dh = h2p - h1p
    dh = np.where(C1p * C2p == 0, 0, np.where(dh > 180, dh - 360, np.where(dh < -180, dh + 360, dh)))
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dh / 2))
    Lbp, Cbp = (L1 + L2) / 2, (C1p + C2p) / 2
    hs = h1p + h2p
    hbp = np.where(C1p * C2p == 0, hs, np.where(np.abs(h1p - h2p) > 180, np.where(hs < 360, (hs + 360) / 2, (hs - 360) / 2), hs / 2))
    T = 1 - 0.17 * np.cos(np.radians(hbp - 30)) + 0.24 * np.cos(np.radians(2 * hbp)) + 0.32 * np.cos(np.radians(3 * hbp + 6)) - 0.2 * np.cos(np.radians(4 * hbp - 63))
    dth = 30 * np.exp(-(((hbp - 275) / 25) ** 2))
    RC = 2 * np.sqrt(Cbp**7 / (Cbp**7 + 25**7))
    SL = 1 + 0.015 * (Lbp - 50) ** 2 / np.sqrt(20 + (Lbp - 50) ** 2)
    SC, SH = 1 + 0.045 * Cbp, 1 + 0.015 * Cbp * T
    RT = -np.sin(np.radians(2 * dth)) * RC
    return np.sqrt((dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH))


def hexrgb(h):
    h = h.strip().lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def cssrgb(s):
    s = s.strip()
    if s.startswith('#'):
        return hexrgb(s), 1.0
    p = [float(x) for x in s[s.index('(') + 1:s.index(')')].replace('/', ' ').replace(',', ' ').split()]
    return np.array(p[:3]), (p[3] if len(p) > 3 else 1.0)


def relY(rgb):
    return 0.2126 * lin(rgb[..., 0]) + 0.7152 * lin(rgb[..., 1]) + 0.0722 * lin(rgb[..., 2])


def cr(y1, y2):
    a, b = max(y1, y2), min(y1, y2)
    return (a + 0.05) / (b + 0.05)


def mode_rgb(px):
    if len(px) == 0:
        return None
    q = (px // 4).astype(np.int32)
    k = q[:, 0] * 4096 + q[:, 1] * 64 + q[:, 2]
    v, c = np.unique(k, return_counts=True)
    m = v[c.argmax()]
    return px[k == m].mean(0)


# ---------- 讀圖 ----------
def img(p):
    return np.asarray(Image.open(HERE / p).convert('RGBA'))


def rect_mask(shape, rs, d, clip=None):
    m = np.zeros(shape[:2], bool)
    for r in rs:
        x0, y0 = max(0, int(round(r['x'] * d))), max(0, int(round(r['y'] * d)))
        x1, y1 = min(shape[1], int(round((r['x'] + r['w']) * d))), min(shape[0], int(round((r['y'] + r['h']) * d)))
        if x1 > x0 and y1 > y0:
            m[y0:y1, x0:x1] = True
    return m


def is_idle(r):
    s, st = r['screen'], r['state']
    if s.startswith(('fx', 'num')) or st in ('fire', 'fx5s', 'boss', 'mphot') or s.startswith('banner'):
        return False
    return True


# ---------- 靜態圖量測 ----------
def measure_static(r, dom, A):
    d = dom['dpr']
    rgb = A[..., :3].astype(float)
    L, Y = lab(rgb)
    C = np.hypot(L[..., 1], L[..., 2])
    H = (np.degrees(np.arctan2(L[..., 2], L[..., 1])) + 360) % 360
    Ls = L[..., 0]
    out, fails = {}, []
    comps = dom['comps']
    panels = [c for c in comps if c['kind'] == 'panel']
    huds = [c for c in comps if c['kind'] == 'hud']
    cvm = rect_mask(A.shape, [dom['cv']], d)
    pm = rect_mask(A.shape, panels, d)
    hm = rect_mask(A.shape, huds, d)
    scene = cvm & ~pm & ~hm
    nightfog = r['state'] in ('night', 'fog', 'far-night')
    # (a)
    out['a_scene_l'] = round(float(Ls[scene].mean()), 2) if scene.any() else ''
    out['a_panel_l'] = round(float(Ls[pm].mean()), 2) if pm.any() else ''
    # 關鍵資訊：字色（計算後樣式）的 L* 對它所在那一層（字框內最多的顏色，排除跟字色接近的像素）
    keyd, keyL, keyS = [], [], []
    for t in dom['texts']:
        if not t['key']:
            continue
        m = rect_mask(A.shape, [t], d)
        px = rgb[m]
        if len(px) < 4:
            continue
        fg, fa = cssrgb(t['color'])
        far = np.abs(px - fg).sum(1) > 60
        bg = mode_rgb(px[far]) if far.sum() > 4 else mode_rgb(px)
        fg = fg * fa + bg * (1 - fa)
        lf, lb = lab(fg[None])[0][0][0], lab(bg[None])[0][0][0]
        keyL.append(float(lf))
        keyd.append(abs(float(lf - lb)))
        keyS.append(t['sel'][-40:])
    out['a_key_l'] = round(float(np.mean(keyL)), 2) if keyL else ''
    out['a_panel_minus_scene'] = round(out['a_panel_l'] - out['a_scene_l'], 2) if pm.any() and scene.any() else ''
    out['a_key_minus_layer'] = round(float(min(keyd)), 2) if keyd else ''
    if out['a_panel_minus_scene'] != '' and out['a_panel_minus_scene'] < THR['a_panel_scene']:
        fails.append(f"(a) 面板−場景 {out['a_panel_minus_scene']} < {THR['a_panel_scene']}")
    if out['a_key_minus_layer'] != '' and out['a_key_minus_layer'] < THR['a_key']:
        worst = min(zip(keyd, keyS))[1]
        fails.append(f"(a) 關鍵資訊−所在層最小 {out['a_key_minus_layer']} < {THR['a_key']}（{worst}）")
    # (b)
    if pm.any() and scene.any() and not nightfog:
        out['b_panel_scene'] = round(float((Y[pm].mean() + 0.05) / (Y[scene].mean() + 0.05)), 3)
        if out['b_panel_scene'] < THR['b']:
            fails.append(f"(b) 面板÷場景 {out['b_panel_scene']} < {THR['b']}")
    else:
        out['b_panel_scene'] = ''
    # (c)
    sat = C > 40
    out['c_sat_pct'] = round(float(sat.mean() * 100), 2)
    where = {}
    for c in comps:
        if c['kind'] == 'scrim':
            continue
        m = rect_mask(A.shape, [c], d)
        n = int((sat & m).sum())
        if n > 0.0005 * sat.size:
            key = c['sel'].split(' > ')[0]
            where[key] = where.get(key, 0) + n
    if (sat & scene).sum() > 0.0005 * sat.size:
        where['場景'] = int((sat & scene).sum())
    out['c_sat_where'] = '|'.join(k for k, _ in sorted(where.items(), key=lambda x: -x[1])[:6])
    if is_idle(r) and not nightfog and out['c_sat_pct'] > THR['c']:
        fails.append(f"(c) C*>40 {out['c_sat_pct']}% > {THR['c']}%")
    # (d)
    brown = (Ls >= 25) & (Ls <= 55) & (H >= 30) & (H <= 90) & (C > 8)
    out['d_brown_pct'] = round(float(brown.mean() * 100), 2)
    if not nightfog and out['d_brown_pct'] > THR['d']:
        fails.append(f"(d) 中明度褐色 {out['d_brown_pct']}% > {THR['d']}%")
    # (e)
    crs, cols, bad = [], set(), []
    for t in dom['texts']:
        if t['h'] < 4 or t['w'] < 2:
            continue
        m = rect_mask(A.shape, [t], d)
        px = rgb[m]
        if len(px) < 4:
            continue
        fg, fa = cssrgb(t['color'])
        far = np.abs(px - fg).sum(1) > 60
        bg = mode_rgb(px[far]) if far.sum() > 4 else mode_rgb(px)
        fg = fg * fa + bg * (1 - fa)
        v = cr(float(relY(fg[None])[0]), float(relY(bg[None])[0]))
        crs.append(v)
        if not (THR['e_lo'] <= v <= THR['e_hi']):
            bad.append(f"{t['sel'][-40:]}「{t['t'][:8]}」{v:.2f}")
        if not t['rar'] and not t['num']:
            cols.add(t['color'])
    out['e_text_min'] = round(min(crs), 2) if crs else ''
    out['e_text_max'] = round(max(crs), 2) if crs else ''
    out['e_text_fail'] = len(bad)
    out['e_ui_colors'] = len(cols)
    if bad:
        fails.append(f"(e) 正文對比不在 4.5–12：{len(bad)} 筆（例 {bad[0]}）")
    if len(cols) > THR['e_colors']:
        fails.append(f"(e) 介面字色 {len(cols)} 種 > {THR['e_colors']}")
    # (f)
    out['f_bright_pct'] = round(float((Ls > 80).mean() * 100), 2)
    if out['f_bright_pct'] > THR['f']:
        fails.append(f"(f) L*>80 {out['f_bright_pct']}% > {THR['f']}%")
    # 條
    bc = []
    for s in ('#bhp > span', '#bmp > span', '#ohp > span', '#omp > span'):
        b = next((x for x in dom['bars'] if x and x['sel'] == s), None)
        if not b or not b['t'].strip():
            continue
        m = rect_mask(A.shape, [b], d)
        px = rgb[m]
        if len(px) < 4:
            continue
        # 字的背後：字框內跟字色差最多的那一群（條的填色或空段）
        fg, _ = cssrgb(b['color'])
        dist = np.abs(px - fg).sum(1)
        bg = mode_rgb(px[dist > 120]) if (dist > 120).sum() > 4 else mode_rgb(px)
        bc.append((cr(float(relY(fg[None])[0]), float(relY(bg[None])[0])), s))
    if bc:
        w = min(bc)
        out['bar_contrast'] = f"{w[0]:.2f}"
        if w[0] < THR['bar']:
            fails.append(f"PF8 {w[1]} 字對條 {w[0]:.2f} < {THR['bar']}")
    else:
        out['bar_contrast'] = ''
    # 跳數字
    nm = num_check(dom.get('nums') or [])
    out['num_min_px'] = nm['min'] if nm['min'] is not None else ''
    if r['screen'].startswith('num') or r['state'] == 'fire':
        fails += nm['fails']
    # 圖示
    bads = [f"{i['sel'][-30:]}={i['scale']}" for i in dom['icons'] if i['nw'] and abs(i['scale'] - round(i['scale'])) > 0.01]
    out['icon_scale'] = 'ok' if not bads else ';'.join(sorted(set(bads))[:4]) + (f' 等 {len(bads)} 個' if len(bads) > 4 else '')
    if bads:
        fails.append(f"PF5 圖示非整數倍 {len(bads)} 個")
    # 熱區
    hits = [h for h in dom['hits'] if h['w'] > 0 and h['h'] > 0]
    if hits:
        h = min(hits, key=lambda h: min(h['w'], h['h']))
        out['hit_min'] = f"{h['w']:.0f}x{h['h']:.0f} {h['sel'][-40:]}"
        lim = THR['hit_port'] if r['viewport'] != '1280x720' else THR['hit_desk']
        nbad = sum(1 for h in hits if min(h['w'], h['h']) < lim)
        if nbad:
            fails.append(f"PF5 熱區 < {lim}：{nbad} 個（最小 {out['hit_min']}）")
    else:
        out['hit_min'] = ''
    return out, fails, {'L': Ls, 'C': C, 'rgb': rgb}


NUMC = {'#fff3e0': 'hit', '#ffd166': 'crit', '#ffc21a': 'crit', '#ff5a5a': 'hurt', '#9aa3ad': 'other', '#b8f0c8': 'other', '#cfd8e3': 'other', '#c9a3a3': 'other', '#8fe0ff': 'other', '#d6b8ff': 'other'}


def num_check(nums):
    fills = [n for n in nums if n['kind'] == 'fill' and n['fill'].lower() in NUMC]
    strokes = [n for n in nums if n['kind'] == 'stroke']
    res = {'min': None, 'fails': [], 'kinds': {}}
    for n in fills:
        k = NUMC[n['fill'].lower()]
        if k == 'crit' and n['px'] < 20 and '金' in n['txt']:
            k = 'other'  # 金幣（gain）跟暴擊同色，字級小的是金幣
        lim = THR['num_min'][k]
        res['kinds'].setdefault(k, []).append(n['px'])
        res['min'] = n['px'] if res['min'] is None else min(res['min'], n['px'])
        if n['px'] < lim:
            res['fails'].append(f"PF7 {k}「{n['txt']}」字高 {n['px']} < {lim}")
    for s in strokes:
        if s['txt'] in [f['txt'] for f in fills] and s['lw'] < THR['num_lw']:
            res['fails'].append(f"PF7 描邊「{s['txt']}」{s['lw']} px < {THR['num_lw']}")
            break
    return res


def overlap(nums):
    bx = [n['box'] for n in nums if n['kind'] == 'fill' and n['fill'].lower() in NUMC and n['a'] > 0.05]
    c = 0
    for i in range(len(bx)):
        for j in range(i + 1, len(bx)):
            a, b = bx[i], bx[j]
            if a['x'] < b['x'] + b['w'] and b['x'] < a['x'] + a['w'] and a['y'] < b['y'] + b['h'] and b['y'] < a['y'] + a['h']:
                c += 1
    return c


# ---------- 地磚（PF4） ----------
TOK = {  # palette-tokens「場景」
    'temple': ['#1d1203', '#4b3b2b', '#7c644c', '#120700'],
    'lava': ['#211007', '#52372e', '#865f51', '#150500'],
    'tomb': ['#171507', '#413e2d', '#6d6950', '#0c0900'],
    'ice': ['#0a1619', '#304044', '#536c72', '#010b0d'],
}


def tile_files(b):
    s = (ROOT / 'js/tiles.js').read_text()
    blk = s[s.index(f'  {b}: {{'):]
    blk = blk[:blk.index('\n  }')]
    import re
    return {k: ROOT / re.search(rf"{k}-[^'\"]*?\.png", blk).group(0).join(['img/tiles/', '']) for k in []} or {
        'floor': ROOT / re.search(r"img/tiles/[a-z]+-floor[^']*\.png", blk).group(0),
        'top': ROOT / re.search(r"img/tiles/[a-z]+-walltop[^']*\.png", blk).group(0),
        'fa': ROOT / re.search(r"img/tiles/[a-z]+-wallface-a[^']*\.png", blk).group(0),
        'fb': ROOT / re.search(r"img/tiles/[a-z]+-wallface-b[^']*\.png", blk).group(0),
    }


def seam_ratio(a, b, axis=1):
    """a、b 兩張磚接在一起（axis=1 左右、0 上下）：接縫平均 RGB 色差 ÷ 磚內相鄰平均。"""
    a, b = a.astype(float), b.astype(float)
    if axis == 1:
        seam = np.abs(a[:, -1] - b[:, 0]).sum(-1).mean()
        inner = np.concatenate([np.abs(np.diff(a, axis=1)).sum(-1).ravel(), np.abs(np.diff(b, axis=1)).sum(-1).ravel()]).mean()
    else:
        seam = np.abs(a[-1] - b[0]).sum(-1).mean()
        inner = np.concatenate([np.abs(np.diff(a, axis=0)).sum(-1).ravel(), np.abs(np.diff(b, axis=0)).sum(-1).ravel()]).mean()
    return float(seam / max(inner, 1e-6))


def pf4(b):
    F = tile_files(b)
    im = {k: np.asarray(Image.open(v).convert('RGBA')) for k, v in F.items()}
    pal = np.array([hexrgb(h) for h in TOK[b]])
    plab = lab(pal)[0]
    out, fails = {}, []
    allpx = np.concatenate([im[k][..., :3][im[k][..., 3] == 255] for k in im]).astype(float)
    l = lab(allpx)[0]
    dmin = de2000(l[:, None, :], plab[None]).min(1)
    out['pal_de3_pct'] = round(float((dmin > 3).mean() * 100), 1)
    out['pal_demax'] = round(float(dmin.max()), 1)
    if out['pal_de3_pct'] > 5 or out['pal_demax'] > 10:
        fails.append(f"PF4 色票偏移（對 palette-tokens 四色）ΔE>3 {out['pal_de3_pct']}%、最大 {out['pal_demax']}")
    for k, a in im.items():
        rgb = a[..., :3]
        h, w = rgb.shape[:2]
        sm = np.asarray(Image.fromarray(rgb).resize((w // 2, h // 2), Image.NEAREST).resize((w, h), Image.NEAREST))
        if (sm == rgb).all():
            fails.append(f"PF4 {k} 是放大的圖")
        p = np.pad(rgb.astype(int), ((1, 1), (1, 1), (0, 0)), mode='wrap')
        c = p[1:-1, 1:-1]
        diff = [np.any(c != p[1 + dy:h + 1 + dy, 1 + dx:w + 1 + dx], -1) for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1))]
        noise = float(np.logical_and.reduce(diff).mean() * 100)
        out[f'noise_{k}'] = round(noise, 2)
        if noise > 2:
            fails.append(f"PF4 {k} 雜點 {noise:.2f}% > 2%")
    # 類別（最近 palette 色）
    def cls(a):
        px = a[..., :3][a[..., 3] == 255].astype(float)
        dd = de2000(lab(px)[0][:, None, :], plab[None])
        return dd.argmin(1)  # 0 ground 1 mid 2 light 3 edge
    fl = cls(im['floor'])
    out['floor_lum_ratio'] = round(float(relY(im['floor'][..., :3].reshape(-1, 3).astype(float)).mean() / relY(pal[0][None])[0]), 3)
    out['floor_edge_pct'] = round(float((fl == 3).mean() * 100), 1)
    out['floor_mid_pct'] = round(float((fl == 1).mean() * 100), 1)
    out['floor_light_n'] = int((fl == 2).sum())
    if out['floor_lum_ratio'] > 1.02:
        fails.append(f"PF4 地板亮度÷-ground {out['floor_lum_ratio']} > 1.02")
    if not 5 <= out['floor_edge_pct'] <= 35:
        fails.append(f"PF4 地板 -edge {out['floor_edge_pct']}% 不在 5–35%")
    if out['floor_mid_pct'] > 3 or out['floor_light_n']:
        fails.append(f"PF4 地板 -mid {out['floor_mid_pct']}%（≤3%）、-light {out['floor_light_n']} 個（0）")
    tp = cls(im['top'])
    out['top_midlight_pct'] = round(float(((tp == 1) | (tp == 2)).mean() * 100), 1)
    out['top_light_pct'] = round(float((tp == 2).mean() * 100), 1)
    if out['top_midlight_pct'] > 80 or out['top_light_pct'] > 15:
        fails.append(f"PF4 牆頂 -mid＋-light {out['top_midlight_pct']}%（≤80）、-light {out['top_light_pct']}%（≤15）")
    for k in ('fa', 'fb'):
        c = cls(im[k])
        ml, li = float(((c == 1) | (c == 2)).mean() * 100), float((c == 2).mean() * 100)
        out[f'{k}_midlight_pct'], out[f'{k}_light_pct'] = round(ml, 1), round(li, 1)
        if not 5 <= ml <= 60 or li > 15:
            fails.append(f"PF4 牆面 {k} -mid＋-light {ml:.1f}%（5–60）、-light {li:.1f}%（≤15）")
    rg = lambda k: im[k][..., :3]
    out['seam_floor'] = round(max(seam_ratio(rg('floor'), rg('floor'), 1), seam_ratio(rg('floor'), rg('floor'), 0)), 2)
    out['seam_top'] = round(max(seam_ratio(rg('top'), rg('top'), 1), seam_ratio(rg('top'), rg('top'), 0)), 2)
    for a_, b_ in (('fa', 'fb'), ('fb', 'fa'), ('fa', 'fa'), ('fb', 'fb')):
        out[f'seam_{a_[1]}{b_[1]}'] = round(seam_ratio(rg(a_), rg(b_), 1), 2)
    for k in [k for k in out if k.startswith('seam_')]:
        if out[k] > THR['seam']:
            fails.append(f"PF4 接縫 {k} {out[k]} > {THR['seam']}")
    return out, fails, im


# ---------- 特寫：grid 與 seam（從 T-1 截圖） ----------
def grid_seam(A, t, d, n, m):
    """t＝DBG.tileRect（CSS px）。n×m 格；回傳每個材質像素在螢幕上的寬度（裝置 px）差、跨格／格內色差比。"""
    rgb = A[..., :3].astype(float)
    ts = t['r']['w'] * d  # 一格裝置 px
    s = ts / 32
    x0, y0 = t['r']['x'] * d, t['r']['y'] * d
    W, Hh = int(round(n * ts)), int(round(m * ts))
    sub = rgb[int(round(y0)):int(round(y0)) + Hh, int(round(x0)):int(round(x0)) + W]
    # 材質像素邊界：所有列合起來，相鄰欄有變化的位置
    def runs(a, axis):
        ch = np.any(np.abs(np.diff(a, axis=axis)) > 6, -1).any(axis=1 - axis)
        pos = np.nonzero(ch)[0] + 1
        g = np.diff(np.concatenate([[0], pos]))
        g = g[g > 0]
        return g
    gx, gy = runs(sub, 1), runs(sub, 0)
    # 只看單一材質像素寬（接近 s）的那些
    one = np.concatenate([gx, gy])
    one = one[(one > s * 0.5) & (one < s * 1.5)]
    spread = int(one.max() - one.min()) if len(one) else None
    # 取每個材質像素中心色
    cx = (np.arange(32 * n) + 0.5) * s
    cy = (np.arange(32 * m) + 0.5) * s
    tex = sub[np.clip(cy.astype(int), 0, sub.shape[0] - 1)][:, np.clip(cx.astype(int), 0, sub.shape[1] - 1)]
    dx = np.abs(np.diff(tex, axis=1)).sum(-1)
    dy = np.abs(np.diff(tex, axis=0)).sum(-1)
    return tex, dx, dy, spread, s, (int(round(x0)), int(round(y0)), W, Hh)


def crops(rows, M, P):
    out = []
    for r in [r for r in rows if r['id'].startswith('T-1-') and r['kind'] == 'static']:
        b = r['id'][4:]
        jp = HERE / r['file'].replace('.png', '.json')
        dom = json.loads(jp.read_text())
        T = dom.get('tiles') or {}
        A = img(r['file'])
        d = dom['dpr']
        vp = r['viewport']
        cdir = HERE / vp / 'crops'
        cdir.mkdir(parents=True, exist_ok=True)
        for cid, key, nm, n, m, sc in (('C-1', 'floor', 'seam-floor-x4', 2, 2, 4), ('C-2', 'top', 'seam-walltop-x4', 2, 2, 4), ('C-3', 'face', 'seam-wallface-x4', 4, 1, 4), ('C-4', 'dark', 'dark-floor-x2', 3, 3, 2)):
            row = {'id': f'{cid}-{b}', 'viewport': vp, 'screen': f'combat-{b}', 'state': 'idle', 'crop': nm, 'star': '★' if cid != 'C-4' else ''}
            t = T.get(key)
            if not t:
                row.update(verdict='blocked', fail=f'畫面上找不到要裁的格子（{key}）', file='')
                out.append(row)
                continue
            tex, dx, dy, spread, s, (x, y, W, Hh) = grid_seam(A, t, d, n, m)
            if key == 'face':
                Hh = int(round(t['r']['h'] * d))
            im = Image.fromarray(A[y:y + Hh, x:x + W, :3]).resize((W * sc, Hh * sc), Image.NEAREST)
            fn = cdir / f'combat-{b}-idle-{nm}.png'
            im.save(fn)
            row['file'] = str(fn.relative_to(HERE))
            chk, fail = {}, []
            chk['grid'] = spread if spread is not None else ''
            if spread is not None and spread > THR['grid']:
                fail.append(f"grid 材質像素寬差 {spread} 裝置 px > {THR['grid']}（1 材質像素 {s:.2f} px）")
            if key == 'floor':
                # 中間那條是區塊邊（x0 % 8 == 7 → 第 1、2 格之間）
                inner = np.concatenate([np.delete(dx, 31, 1).ravel(), dy.ravel()]).mean()
                chk['seam'] = round(float(dx[:, 31].mean() / max(inner, 1e-6)), 2)
                chk['chunk'] = chk['seam']
            elif key == 'top':
                inner = np.concatenate([np.delete(dx, 31, 1).ravel(), np.delete(dy, 31, 0).ravel()]).mean()
                chk['seam'] = round(float(max(dx[:, 31].mean(), dy[31].mean()) / max(inner, 1e-6)), 2)
            elif key == 'face':
                # 牆面只量貼在格子底部的 18 材質像素高那一段
                fh = int(round(18 * s))
                yy = (np.arange(18) + 0.5) * s + (Hh - fh)
                xx = (np.arange(128) + 0.5) * s
                sub = A[y:y + Hh, x:x + W, :3].astype(float)
                tx = sub[np.clip(yy.astype(int), 0, Hh - 1)][:, np.clip(xx.astype(int), 0, W - 1)]
                ddx = np.abs(np.diff(tx, axis=1)).sum(-1)
                inner = np.delete(ddx, [31, 63, 95], 1).mean()
                for j, c in enumerate((31, 63, 95)):
                    chk[f'seam{j + 1}'] = round(float(ddx[:, c].mean() / max(inner, 1e-6)), 2)
            for k in [k for k in chk if k.startswith('seam')]:
                if chk[k] != '' and chk[k] > THR['seam']:
                    fail.append(f"{k} {chk[k]} > {THR['seam']}")
            if key == 'dark':
                Lm = lab(A[y:y + Hh, x:x + W, :3].astype(float))[0][..., 0]
                chk['dark_l_mean'] = round(float(Lm.mean()), 2)
                chk['dark_l_std'] = round(float(Lm.std()), 2)
            row.update(checks=chk, verdict='fail' if fail else 'pass', fail='；'.join(fail))
            out.append(row)
    return out


# ---------- 素材對照 ----------
def assets(pf4res):
    ad = HERE / 'assets'
    ad.mkdir(exist_ok=True)
    void = hexrgb('#0d0a07').astype(np.uint8)
    out = []
    for b in B4:
        _, _, im = pf4res[b]
        rg = {k: Image.fromarray(v) for k, v in im.items()}
        W, H = 8 + 64 + 8 + 64 + 8 + 128 + 8, 8 + 64 + 8
        c = Image.new('RGB', (W, H), tuple(int(x) for x in void))
        for i in range(2):
            for j in range(2):
                c.paste(rg['floor'], (8 + 32 * i, 8 + 32 * j), rg['floor'])
                c.paste(rg['top'], (80 + 32 * i, 8 + 32 * j), rg['top'])
        for i, k in enumerate(('fa', 'fb', 'fa', 'fb')):
            c.paste(rg[k], (152 + 32 * i, 8 + 23), rg[k])
        c.save(ad / f'tiles-{b}-2x2.png')
        c.resize((W * 4, H * 4), Image.NEAREST).save(ad / f'tiles-{b}-2x2-x4.png')
        out.append({'id': f'A-1-{b}', 'file': f'assets/tiles-{b}-2x2.png', 'file2': f'assets/tiles-{b}-2x2-x4.png'})
    # W-9 王印
    import re
    art = (ROOT / 'js/art.js').read_text()
    p32 = ROOT / re.search(r"ic_wy32: '([^']+)'", art).group(1)
    p16 = ROOT / re.search(r"ic_wy16: '([^']+)'", art).group(1)
    s32, s16 = Image.open(p32).convert('RGBA'), Image.open(p16).convert('RGBA')
    ic32 = [s32.crop((33 * i, 0, 33 * i + 32, 32)) for i in range(4)]
    ic16 = [s16.crop((17 * i, 0, 17 * i + 16, 16)) for i in range(4)]
    W = 8 + 4 * 72
    c = Image.new('RGB', (W, 8 + 72 * 2 + 40 * 2 + 8), tuple(int(x) for x in hexrgb('#35312c')))
    gray = lambda im: Image.merge('RGBA', (*[im.convert('L')] * 3, im.split()[3]))
    for i in range(4):
        for row, f in ((0, lambda x: x), (1, gray)):
            g = f(ic32[i])
            c.paste(g, (8 + 72 * i, 8 + 72 * row), g)
            g2 = f(ic32[i]).resize((64, 64), Image.NEAREST)
            c.paste(g2, (8 + 72 * i + 32 + 4, 8 + 72 * row) if False else (8 + 72 * i, 8 + 72 * row + 0), None) if False else None
            h = f(ic16[i])
            c.paste(h, (8 + 72 * i + 40, 8 + 72 * row + 8), h)
    # 2 倍一列（原色、灰階）
    for i in range(4):
        for row, f in ((0, lambda x: x), (1, gray)):
            g = f(ic32[i]).resize((64, 64), Image.NEAREST)
            c.paste(g, (8 + 72 * i, 8 + 144 + row * 40 - 0), g) if False else None
    c.save(ad / 'wangyin-sheet.png')
    big = Image.new('RGB', (8 + 4 * 72, 8 + 2 * 72), tuple(int(x) for x in hexrgb('#35312c')))
    for i in range(4):
        for row, f in ((0, lambda x: x), (1, gray)):
            g = f(ic32[i]).resize((64, 64), Image.NEAREST)
            big.paste(g, (8 + 72 * i, 8 + 72 * row), g)
    big.save(ad / 'wangyin-sheet-x2.png')
    # 灰階分得出：四枚灰階 16 兩兩平均 |ΔL| 最小值
    gl = [np.asarray(ic16[i].convert('L'), float)[np.asarray(ic16[i])[..., 3] > 0] for i in range(4)]
    g32 = [np.asarray(ic32[i].convert('LA'), float) for i in range(4)]
    dmin = min(np.abs(g32[i][..., 0] * (g32[i][..., 1] > 0) - g32[j][..., 0] * (g32[j][..., 1] > 0)).mean() for i in range(4) for j in range(i + 1, 4))
    out.append({'id': 'W-9', 'file': 'assets/wangyin-sheet.png', 'file2': 'assets/wangyin-sheet-x2.png', 'gray_min_diff32': round(float(dmin), 2)})
    return out


# ---------- 連拍 ----------
def sheet(frames, dst, cols=None):
    ims = [Image.open(HERE / f['file']).convert('RGB') for f in frames]
    w0, h0 = ims[0].size
    n = len(ims)
    cols = cols or min(n, 8)
    tw = min(w0, 4096 // cols)
    th = int(h0 * tw / w0)
    rows = math.ceil(n / cols)
    S = Image.new('RGB', (cols * tw, rows * th), (0, 0, 0))
    dr = ImageDraw.Draw(S)
    for i, im in enumerate(ims):
        x, y = (i % cols) * tw, (i // cols) * th
        S.paste(im.resize((tw, th), Image.BILINEAR), (x, y))
        dr.rectangle((x, y, x + 22, y + 12), fill=(0, 0, 0))
        dr.text((x + 2, y), f'{i:02d}', fill=(255, 255, 255))
    q = 85
    S.save(dst, optimize=True)
    while os.path.getsize(dst) > 2e6 and tw > 60:
        tw = int(tw * 0.8)
        th = int(h0 * tw / w0)
        S = S.resize((cols * tw, rows * th), Image.BILINEAR)
        S.save(dst, optimize=True)


def measure_burst(r):
    fr = r['frames']
    base = None
    if r.get('base'):
        bL, _ = lab(img(r['base'])[..., :3].astype(float))
        base = bL
    res = []
    bbs = []
    for f in fr:
        A = img(f['file'])[..., :3].astype(float)
        L, _ = lab(A)
        C = np.hypot(L[..., 1], L[..., 2])
        tot = L.shape[0] * L.shape[1]
        row = {'frame': f['i'], 'file': f['file']}
        if base is not None:
            dE = np.sqrt(((L - base) ** 2).sum(-1))
            m = dE > 10
            row['fx_sat_pct'] = round(float((m & (C > 40)).sum() / tot * 100), 3)
            row['fx_black_pct'] = round(float((m & (L[..., 0] < 15)).sum() / max(m.sum(), 1) * 100), 2)
            row['fx_area_pct'] = round(float(m.sum() / tot * 100), 3)
            ys, xs = np.nonzero(m)
            bbs.append((xs.min(), ys.min(), xs.max(), ys.max()) if len(xs) else None)
        row['c_sat_pct'] = round(float((C > 40).mean() * 100), 2)
        if f.get('nums') is not None:
            row['num_overlap'] = overlap(f['nums'])
            nm = num_check(f['nums'])
            row['num_min_px'] = nm['min'] if nm['min'] is not None else ''
            row['num_fail'] = nm['fails'][:1]
        res.append(row)
    return res, bbs


# ---------- 主程式 ----------
def main():
    rows, extra = [], {}
    for f in sorted(HERE.glob('rows-*.json')):
        rows += json.loads(f.read_text())
    for f in sorted(HERE.glob('extra-*.json')):
        for k, v in json.loads(f.read_text()).items():
            if isinstance(v, dict) and isinstance(extra.get(k), dict):
                extra[k].update(v)
            else:
                extra[k] = v
    commit = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT).decode().strip()
    M, PF = [], []
    MCOLS = ['task', 'id', 'viewport', 'screen', 'state', 'file', 'frame', 'commit', 'dpr', 'px_w', 'px_h', 'a_scene_l', 'a_panel_l', 'a_key_l', 'a_panel_minus_scene', 'a_key_minus_layer', 'b_panel_scene', 'c_sat_pct', 'c_sat_where', 'd_brown_pct', 'e_text_min', 'e_text_max', 'e_text_fail', 'e_ui_colors', 'f_bright_pct', 'bar_contrast', 'num_min_px', 'icon_scale', 'hit_min', 'fx_sat_pct', 'fx_black_pct', 'checks', 'verdict', 'fail']
    def pf(id_, vp, screen, state, verdict, why, file='', star=''):
        PF.append({'id': id_, 'viewport': vp, 'screen': screen, 'state': state, 'verdict': verdict, 'why': why, 'file': file, 'star': star})
    hashes = {}
    pf4res = {b: pf4(b) for b in B4}
    for r in rows:
        if r['kind'] != 'static':
            continue
        A = img(r['file'])
        hashes.setdefault((r['id'], r['viewport']), []).append((hashlib.md5(A.tobytes()).hexdigest(), r['state']))
    for r in rows:
        base = {'task': 'm2-36', 'id': r['id'], 'viewport': r['viewport'], 'screen': r['screen'], 'state': r['state'], 'file': r['file'], 'commit': commit, 'dpr': VPD.get(r['viewport'], '')}
        if r['kind'] == 'none':
            base.update(verdict=r['verdict0'], fail=r['note'])
            M.append(base)
            pf(r['id'], r['viewport'], r['screen'], r['state'], r['verdict0'], r['note'], star=r.get('star', ''))
            continue
        if r['kind'] == 'static':
            dom = json.loads((HERE / r['file'].replace('.png', '.json')).read_text())
            A = img(r['file'])
            fails = []
            # PF1
            d = dom['dpr']
            if A.shape[1] != round(dom['vw'] * d) or A.shape[0] != round(dom['vh'] * d):
                fails.append(f"PF1 尺寸 {A.shape[1]}×{A.shape[0]} ≠ 視窗×DPR")
            if (A[..., 3] < 255).any():
                fails.append('PF1 有透明像素')
            o, f2, aux = measure_static(r, dom, A)
            if aux['L'].std() < 2:
                fails.append('PF1 空白或全黑（L* 標準差 < 2）')
            h = hashes[(r['id'], r['viewport'])]
            me = hashlib.md5(A.tobytes()).hexdigest()
            dup = [s for hh, s in h if hh == me and s != r['state']]
            if dup:
                fails.append(f"PF1 跟同一列的 {dup[0]} 是同一張圖")
            if r['errs']:
                fails.append(f"PF1 pageerror {len(r['errs'])}：{r['errs'][0][:80]}")
            # PF2
            if not r['verify'].get('ok'):
                fails.append(f"PF2 驗狀態不成立：{r['verify'].get('cond', r['verify'].get('err', ''))[:100]}")
            fails += f2
            checks = {}
            # PF9 清單專屬
            nm = num_check(dom.get('nums') or [])
            iid = r['id']
            if iid.startswith('T-1-'):
                o4, f4, _ = pf4res[iid[4:]]
                checks.update({k: v for k, v in o4.items()})
                fails += f4
            if iid.startswith(('T-2', 'T-3')):
                pass
            if iid.startswith('W-') and iid not in ('W-9',):
                need = 16 if iid == 'W-2' else 32
                wy = [i for i in dom['icons'] if i['wy'] and (i['wy'].endswith('_16') == (need == 16))]
                wy_any = [i for i in dom['icons'] if i['wy']]
                if iid == 'W-5' and r['state'] in ('k0', 'locked'):
                    sil = dom.get('sil') or []
                    checks['sil'] = len(sil)
                    checks['sil_orig'] = sum(1 for s in sil if s['orig'])
                    if sil and all(s['orig'] for s in sil) and all(s['fl'] in ('none', '') for s in sil):
                        fails.append('PF9 剪影用的是原圖（沒有濾鏡、沒有 --tx-dim 填色）')
                else:
                    checks['wy_icons'] = len(wy)
                    checks['wy_any'] = len(wy_any)
                    if not wy:
                        fails.append(f"PF9 畫面上沒有 {need} px 王印圖示" + (f"（有別的尺寸 {len(wy_any)} 個）" if wy_any else ''))
                    bads = [i for i in wy if abs(i['scale'] - 1) > 0.01]
                    if bads:
                        fails.append(f"PF9 王印圖示不是 1 倍：{bads[0]['scale']}")
                if iid == 'W-5' and r['state'] == 'k2':
                    sil = dom.get('sil') or []
                    checks['sil_orig'] = sum(1 for s in sil if s['orig'])
                    if sil and all(s['orig'] for s in sil) and all(s['fl'] in ('none', '') for s in sil):
                        fails.append('PF9 剪影用的是原圖（沒有濾鏡）')
            if iid.startswith('B-1') and r['state'] == 'hp5':
                checks['toast'] = 1 if dom.get('warn') else 0
                if not dom.get('warn'):
                    fails.append('PF9 生命 5% 沒有跳吐司')
                else:
                    checks['toast_color'] = dom['warn']['color']
            if iid.startswith('B-2') and r['state'] == 'mphot':
                hot = (dom.get('hot') or {}).get('el') or []
                glow = [e for e in hot if e['sh'] not in ('none', '') or e['fl'] not in ('none', '')]
                checks['hot_glow'] = len(glow)
                if glow:
                    fails.append(f"PF9 過熱有外發光／濾鏡：{glow[0]['sel'][-30:]} {glow[0]['sh'][:40]}")
            if iid == 'K-1':
                st = dom.get('sticky')
                if not st:
                    fails.append('PF9 找不到黏底動作列')
                else:
                    rgb, a = cssrgb(st['bg'])
                    checks['bar_bg_alpha'] = a
                    checks['bar_bt'] = st['bt']
                    checks['bar_shadow'] = st['sh'][:40]
                    checks['bar_bottom'] = round(st['y'] + st['h'], 1)
                    if a < 1:
                        fails.append(f"PF9 動作列底色不是不透明（{st['bg']}）")
                    if not st['bt'].startswith('1px solid'):
                        fails.append(f"PF9 動作列上緣不是 1 px 框（{st['bt']}）")
                    if st['sh'] in ('none', ''):
                        fails.append('PF9 動作列上緣外沒有 scrim 陰影')
                    if st['y'] + st['h'] < dom['vh'] - 1 and r['viewport'] != '1280x720':
                        fails.append(f"PF9 底色沒鋪到螢幕底（列底 {st['y'] + st['h']:.0f} < {dom['vh']}）")
                    # 列範圍內：只有列底色與列上的元件（量列內跟列底色差很多、又不是按鈕區的像素）
                    m = rect_mask(A.shape, [st], d)
                    px = A[..., :3][m].astype(float)
                    bgm = mode_rgb(px)
                    checks['bar_mode'] = '#%02x%02x%02x' % tuple(int(x) for x in bgm)
            if iid.startswith('N-3'):
                Lm = aux['L']
                vals = []
                for n_ in dom.get('nums') or []:
                    if n_['kind'] != 'fill':
                        continue
                    bx = n_['box']
                    m = rect_mask(A.shape, [bx], d)
                    ring = rect_mask(A.shape, [{'x': bx['x'] - 12, 'y': bx['y'] - 12, 'w': bx['w'] + 24, 'h': bx['h'] + 24}], d) & ~m
                    vals.append((float(Lm[m].mean()), float(Lm[ring].mean())))
                if vals:
                    checks['num_l'] = round(np.mean([v[0] for v in vals]), 2)
                    checks['behind_l'] = round(np.mean([v[1] for v in vals]), 2)
            if iid.startswith('N-1'):
                checks['kinds'] = ','.join(f"{k}:{min(v)}" for k, v in nm['kinds'].items())
                if not nm['kinds']:
                    fails.append('PF7 沒有記到跳數字')
            if iid.startswith('W-2'):
                checks['tipline'] = 1 if dom.get('tipline') else 0
                if dom.get('tipline'):
                    t = dom['tipline']
                    cd = HERE / r['viewport'] / 'crops'
                    cd.mkdir(parents=True, exist_ok=True)
                    x0, y0 = int(t['x'] * d) - 4, int(t['y'] * d) - 4
                    cimg = Image.fromarray(A[max(0, y0):int((t['y'] + t['h']) * d) + 4, max(0, x0):int((t['x'] + t['w']) * d) + 4, :3])
                    cimg.resize((cimg.width * 4, cimg.height * 4), Image.NEAREST).save(cd / 'tip-wangyin-line-tipline-x4.png')
                    checks['crop'] = f"{r['viewport']}/crops/tip-wangyin-line-tipline-x4.png"
            base.update(o)
            base.update(px_w=A.shape[1], px_h=A.shape[0], checks=';'.join(f'{k}={v}' for k, v in checks.items()), verdict='fail' if fails else 'pass', fail='；'.join(fails))
            M.append(base)
            pf(r['id'], r['viewport'], r['screen'], r['state'], base['verdict'], base['fail'], r['file'], r.get('star', ''))
            continue
        if r['kind'] == 'burst':
            res, bbs = measure_burst(r)
            fails = []
            if r['errs']:
                fails.append(f"PF1 pageerror {len(r['errs'])}：{r['errs'][0][:80]}")
            if not r['verify'].get('ok', True):
                fails.append('PF2 驗狀態不成立')
            sat = [x.get('fx_sat_pct', 0) for x in res]
            checks = {}
            iid = r['id']
            if r.get('base') and not iid.startswith('X-6'):
                mx = max(sat)
                over = sum(1 for s in sat if s > 8) * r['dt'] / 1000
                blk = max(x['fx_black_pct'] for x in res if x.get('fx_area_pct', 0) > 0.05) if any(x.get('fx_area_pct', 0) > 0.05 for x in res) else 0
                checks.update(fx_max=mx, fx_over8_s=round(over, 3), fx_black_max=blk, max_frame=int(np.argmax(sat)))
                if mx > THR['fx_max']:
                    fails.append(f"PF6 最大幀 C*>40 {mx}% > {THR['fx_max']}%")
                if over > THR['fx_8_s']:
                    fails.append(f"PF6 超過 8% 的時間 {over:.2f} 秒 > {THR['fx_8_s']}")
                if blk > THR['fx_black']:
                    fails.append(f"PF6 黑邊 {blk}% > {THR['fx_black']}%")
            if iid.startswith('X-3'):
                bm = (r.get('data') or {}).get('beam')
                if bm and bm.get('core'):
                    core = np.array([float(x) for x in bm['core'].split(',')])
                    tok = hexrgb(bm['val'])
                    de = float(de2000(lab(core[None])[0], lab(tok[None])[0])[0])
                    checks['beam_de'] = round(de, 2)
                    checks['beam_core'] = bm['core']
                    checks['beam_tok'] = bm['tok'] + bm['val']
                    if de > THR['beam_de']:
                        fails.append(f"PF9 beam_de {de:.2f} > {THR['beam_de']}（柱芯 rgb({bm['core']}) 對 {bm['tok']} {bm['val']}）")
                else:
                    fails.append('PF9 量不到 beam_de（沒有 sig_beam 上色圖）')
            if iid.startswith('X-6'):
                vis = [b for b in bbs if b]
                if vis:
                    xs = [b[0] for b in vis] + [b[2] for b in vis]
                    spread = max(max(b[0] for b in vis) - min(b[0] for b in vis), max(b[2] for b in vis) - min(b[2] for b in vis), max(b[1] for b in vis) - min(b[1] for b in vis), max(b[3] for b in vis) - min(b[3] for b in vis))
                    checks['bbox_spread_px'] = int(spread)
                    checks['frames_visible'] = len(vis)
                    if spread > 4:
                        fails.append(f"PF9 減少動態仍有位移或縮放：變化區域外框差 {spread} 裝置 px")
                else:
                    checks['frames_visible'] = 0
                    fails.append('PF9 減少動態下看不到任何變化（沒有播）')
            if iid == 'X-7':
                avg = float(np.mean([x['c_sat_pct'] for x in res]))
                checks['avg_c_sat_5s'] = round(avg, 2)
                if avg > THR['fx_5s']:
                    fails.append(f"PF6 5 秒平均 C*>40 {avg:.2f}% > {THR['fx_5s']}%")
            if iid.startswith('N-2'):
                ov = sum(1 for x in res if x.get('num_overlap'))
                checks['frames_overlap'] = ov
                checks['frames'] = len(res)
                mins = [x['num_min_px'] for x in res if x.get('num_min_px') != '' and x.get('num_min_px') is not None]
                checks['num_min_px'] = min(mins) if mins else ''
                if ov:
                    fails.append(f"PF7 數字外框交疊：{ov}／{len(res)} 幀")
                nf = [x['num_fail'][0] for x in res if x.get('num_fail')]
                if nf:
                    fails.append(nf[0])
            for x in res:
                m = dict(base)
                m.update(file=x['file'], frame=x['frame'], fx_sat_pct=x.get('fx_sat_pct', ''), fx_black_pct=x.get('fx_black_pct', ''), c_sat_pct=x['c_sat_pct'], num_min_px=x.get('num_min_px', ''), checks=f"overlap={x['num_overlap']}" if 'num_overlap' in x else '')
                M.append(m)
            # 總覽圖
            sd = HERE / r['file']
            sheet(r['frames'], str(sd) + '-sheet.png' if False else HERE / (r['file'][:-len('-burst')] + '-sheet.png'))
            key = HERE / (r['file'][:-len('-burst')] + '-max.png')
            mi = int(np.argmax(sat)) if r.get('base') else len(r['frames']) // 2
            Image.open(HERE / r['frames'][mi]['file']).save(key)
            r['_max'] = str(key.relative_to(HERE))
            r['_sheet'] = r['file'][:-len('-burst')] + '-sheet.png'
            v = 'fail' if fails else 'pass'
            M.append({**base, 'file': r['_sheet'], 'frame': 'all', 'checks': ';'.join(f'{k}={v_}' for k, v_ in checks.items()), 'verdict': v, 'fail': '；'.join(fails)})
            pf(r['id'], r['viewport'], r['screen'], r['state'], v, '；'.join(fails), r['_sheet'], r.get('star', ''))
    # 特寫
    for c in crops(rows, M, PF):
        M.append({'task': 'm2-36', 'id': c['id'], 'viewport': c['viewport'], 'screen': c['screen'], 'state': c['state'] + '／' + c['crop'], 'file': c.get('file', ''), 'commit': commit, 'checks': ';'.join(f'{k}={v}' for k, v in (c.get('checks') or {}).items()), 'verdict': c['verdict'], 'fail': c.get('fail', '')})
        pf(c['id'], c['viewport'], c['screen'], c['state'] + '／' + c['crop'], c['verdict'], c.get('fail', ''), c.get('file', ''), c.get('star', ''))
    # 素材
    for a in assets(pf4res):
        fails = []
        chk = ''
        if a['id'].startswith('A-1'):
            o4, f4, _ = pf4res[a['id'][4:]]
            fails = f4
            chk = ';'.join(f'{k}={v}' for k, v in o4.items())
        else:
            chk = f"gray_min_diff32={a['gray_min_diff32']}"
            if a['gray_min_diff32'] < 10:
                fails.append(f"PF9 灰階四枚兩兩平均差最小 {a['gray_min_diff32']} < 10（數字只供參考，分不分得出由美術總監看）")
        v = 'fail' if fails else 'pass'
        M.append({'task': 'm2-36', 'id': a['id'], 'viewport': 'assets', 'screen': 'assets', 'state': pathlib.Path(a['file']).stem, 'file': a['file'], 'commit': commit, 'checks': chk, 'verdict': v, 'fail': '；'.join(fails)})
        pf(a['id'], 'assets', 'assets', pathlib.Path(a['file']).stem, v, '；'.join(fails), a['file'], '★')
    # T-6 效能
    perf = extra.get('perf') or {}
    for vp, P in (('390x844', perf.get('P')), ('1280x720', perf.get('D'))):
        if not P:
            pf('T-6', vp, 'combat', 'perf', 'blocked', '缺：沒有跑 perfGroup')
            continue
        fails, chk = [], []
        for b in B4:
            t, o = P[b]['tiles'], P[b]['old']
            chk.append(f"{b}:warm {t['warm']['avg']}ms vs 舊 {o['warm']['avg']}ms；cold {t['cold']['avg']}ms vs 舊 {o['cold']['avg']}ms")
            if t['warm']['avg'] > o['warm']['avg'] * 1.1 + 0.05:
                fails.append(f"{b} 一般格 bStatic {t['warm']['avg']} ms 比舊畫法 {o['warm']['avg']} ms 慢")
        v = 'fail' if fails else 'pass'
        M.append({'task': 'm2-36', 'id': 'T-6', 'viewport': vp, 'screen': 'combat', 'state': 'perf', 'commit': commit, 'checks': ' | '.join(chk), 'verdict': v, 'fail': '；'.join(fails)})
        pf('T-6', vp, 'combat', 'perf', v, '；'.join(fails) or ' | '.join(chk))
    # 新舊對照
    cmpd = HERE / 'compare'
    for r in [r for r in rows if r['kind'] == 'cmp']:
        old = HERE / r['file']
        new = HERE / r['viewport'] / f"{r['screen']}-{r['state']}.png"
        if not new.exists():
            pf(r['id'], r['viewport'], r['screen'], r['state'], 'blocked', '缺：這次的圖不存在')
            continue
        a, b = Image.open(old).convert('RGB'), Image.open(new).convert('RGB')
        c = Image.new('RGB', (a.width + b.width + 8, a.height), (255, 255, 255))
        c.paste(a, (0, 0))
        c.paste(b, (a.width + 8, 0))
        dst = cmpd / r['viewport'] / f"{r['screen']}-{r['state']}.png"
        dst.parent.mkdir(parents=True, exist_ok=True)
        c.save(dst)
        pf(r['id'], r['viewport'], r['screen'], r['state'], 'pass', '左：擋掉素材的舊畫法；右：這次', str(dst.relative_to(HERE)))
    for vp in ('390x844', '1280x720'):
        od = cmpd / '_old' / vp
        mx = HERE / vp / 'fx-chase-temple-play-max.png'
        olds = sorted(od.glob('fx-chase-f*.png'))
        if olds and mx.exists():
            ob = np.asarray(Image.open(od / 'fx-chase-base.png').convert('RGB'), float)
            best = max(olds, key=lambda p: np.abs(np.asarray(Image.open(p).convert('RGB'), float) - ob).sum())
            a, b = Image.open(best).convert('RGB'), Image.open(mx).convert('RGB')
            c = Image.new('RGB', (a.width + b.width + 8, a.height), (255, 255, 255))
            c.paste(a, (0, 0))
            c.paste(b, (a.width + 8, 0))
            dst = cmpd / vp / 'fx-chase-play.png'
            dst.parent.mkdir(parents=True, exist_ok=True)
            c.save(dst)
            pf('Q-3', vp, 'fx-chase', 'play', 'pass', '左：拿掉 FXS.sig_* 的舊特效（變化最大那一幀）；右：這次最大那一幀', str(dst.relative_to(HERE)))
        else:
            pf('Q-3', vp, 'fx-chase', 'play', 'blocked', '缺：沒有舊畫法或最大幀')
    # 影片（X-8 與給看的影片）
    vids = extra.get('videos') or {}
    for vp, key in (('390x844', 'P'), ('1280x720', 'D')):
        V = vids.get(key) or {}
        for k in ('crit', 'lvup', 'beam', 'chase', 'wyapply'):
            x = V.get(f'fx-{k}-fallback')
            if not x:
                pf('X-8', vp, f'fx-{k}', 'fallback', 'blocked', '缺：沒有錄到')
                continue
            e = x.get('errs') or []
            pf('X-8', vp, f'fx-{k}', 'fallback', 'fail' if e else 'pass', ('pageerror：' + e[0][:80]) if e else '拿掉 FXS.sig_* 後觸發，播舊特效、沒有錯誤（看影片）', x['file'])
    # 寫檔
    with open(HERE / 'measure.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, MCOLS, extrasaction='ignore')
        w.writeheader()
        for m in M:
            w.writerow({k: m.get(k, '') for k in MCOLS})
    with open(HERE / 'prefilter.csv', 'w', newline='', encoding='utf-8') as f:
        f.write(f'# M2-36 清單展開後 {len(PF)} 列（清單列 × 尺寸；連拍、特寫、素材、效能、影片各算一列），commit {commit}\n')
        w = csv.DictWriter(f, ['id', 'viewport', 'screen', 'state', 'verdict', 'why', 'file', 'star'])
        w.writeheader()
        for p in PF:
            w.writerow(p)
    json.dump({'commit': commit, 'pf': PF}, open(HERE / 'prefilter.json', 'w'), ensure_ascii=False, indent=0)
    from collections import Counter
    print(Counter(p['verdict'] for p in PF), len(PF))


if __name__ == '__main__':
    main()
