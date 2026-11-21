# 特殊詞圖示 破裂／追憶 候選（Game Art Director 2026-11-21；程式畫，不用 PixelLab）
import os, math, json
import numpy as np
from PIL import Image
OUT = '/workspace/dpoe-docs/docs/production/art-picks/affix-icons-draft'
H = lambda h: tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
TOK = {'scene-void': '#16130f', 'tx-strong': '#fbf9f6', 'border-cap': '#d9d3cd', 'tx-dim': '#aeaba7',
       'border': '#817b75', 'el-cold': '#ade2f9', 'mp-hi': '#6b7dad', 'mp': '#3a5b98', 'glint': '#ffffff'}
SS = 8

def raster(N, fn):
    """fn(u,v)->bool on unit fill box. N=16: fill box px 1..14; N=32: px 2..29."""
    lo, hi = (1, 15) if N == 16 else (2, 30)
    n = (np.arange(N * SS) + 0.5) / SS
    X, Y = np.meshgrid(n, n)
    U, V = (X - lo) / (hi - lo), (Y - lo) / (hi - lo)
    m = fn(U, V).astype(float)
    cov = m.reshape(N, SS, N, SS).mean(axis=(1, 3))
    inside = np.zeros((N, N), bool); inside[lo:hi, lo:hi] = True
    return (cov >= 0.5) & inside

def poly_fn(pts):
    pts = np.array(pts, float)
    def f(U, V):
        res = np.zeros(U.shape, bool); j = len(pts) - 1
        for i in range(len(pts)):
            xi, yi = pts[i]; xj, yj = pts[j]
            cond = ((yi > V) != (yj > V)) & (U < (xj - xi) * (V - yi) / (yj - yi + 1e-12) + xi)
            res ^= cond; j = i
        return res
    return f

def star_pts(cx, cy, R, ratio, rot=0):
    p = []
    for k in range(10):
        a = math.radians(-90 + rot + 36 * k); r = R if k % 2 == 0 else R * ratio
        p.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return p

def clean(m):
    # 去掉孤立／只有 1 個四鄰的填色像素（16 的尖角留 1 px 尖可以，孤點不行）
    m = m.copy()
    for _ in range(2):
        p = np.pad(m, 1); nb = p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]
        m &= nb >= 1
    return m

def outline(m):
    p = np.pad(m, 1); d = p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return d & ~m

def edge_lr(m, w=1):
    """填色像素中，往右／下／右下 w px 內碰到外面的＝暗面。"""
    N = m.shape[0]; e = np.zeros_like(m)
    p = np.pad(m, w)
    for dy in range(0, w + 1):
        for dx in range(0, w + 1):
            if dx == dy == 0: continue
            e |= ~p[w + dy:w + dy + N, w + dx:w + dx + N]
    return e & m

def edge_ul(m, w=1):
    N = m.shape[0]; e = np.zeros_like(m); p = np.pad(m, w)
    for dy in range(0, w + 1):
        for dx in range(0, w + 1):
            if dx == dy == 0: continue
            e |= ~p[w - dy:w - dy + N, w - dx:w - dx + N]
    return e & m

def compose(N, layers):
    """layers: list of (mask, token) painted in order; outline from union of all fill."""
    img = np.zeros((N, N, 4), np.uint8); fill = np.zeros((N, N), bool)
    for m, t in layers:
        if t is None: fill |= m; continue
        img[m, :3] = H(TOK[t]); img[m, 3] = 255; fill |= m
    ol = outline(fill)
    # 描邊不准有 2 px 粗的角：2×2 全是描邊時，把最貼填色的那一格改成相鄰填色
    for _ in range(4):
        hit = False
        for y in range(N - 1):
            for x in range(N - 1):
                if ol[y:y + 2, x:x + 2].all():
                    best = None
                    for yy, xx in ((y, x), (y, x + 1), (y + 1, x), (y + 1, x + 1)):
                        nb = [(yy + dy, xx + dx) for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)) if 0 <= yy + dy < N and 0 <= xx + dx < N and fill[yy + dy, xx + dx]]
                        if best is None or len(nb) > len(best[1]): best = ((yy, xx), nb)
                    (yy, xx), nb = best
                    img[yy, xx] = img[nb[0]]; fill[yy, xx] = True; hit = True
        ol = outline(fill)
        if not hit: break
    img[ol, :3] = H(TOK['scene-void']); img[ol, 3] = 255
    return img

def bresenham(pts):
    out = []
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        dx, dy = abs(x1 - x0), -abs(y1 - y0); sx = 1 if x0 < x1 else -1; sy = 1 if y0 < y1 else -1; err = dx + dy
        while True:
            out.append((x0, y0))
            if (x0, y0) == (x1, y1): break
            e2 = 2 * err
            if e2 >= dy: err += dy; x0 += sx
            if e2 <= dx: err += dx; y0 += sy
    return out

# ---------- 破裂 ★ ----------
def star_geom(ratio, rot=0):
    R = 0.5 / math.sin(math.radians(72)) * 1.0
    h = R * (1 + math.cos(math.radians(36)))
    cy = R + (1 - h) / 2
    return 0.5, cy, R

def facet_shade(N, m, cx, cy, R, ratio, rot):
    """每個尖角分左右兩面，光從左上（-1,-1,+z）。回傳 dark/mid 遮罩。"""
    lo, hi = (1, 15) if N == 16 else (2, 30); s = hi - lo
    ys, xs = np.nonzero(m)
    L = np.array([-1, -1, 1.2]); L /= np.linalg.norm(L)
    br = np.zeros(m.shape)
    for y, x in zip(ys, xs):
        u, v = (x + 0.5 - lo) / s - cx, (y + 0.5 - lo) / s - cy
        a = math.degrees(math.atan2(v, u)) - (-90 + rot)
        k = round(a / 72) % 5; axis = math.radians(-90 + rot + 72 * k)
        ax = np.array([math.cos(axis), math.sin(axis)])
        side = np.sign(ax[0] * v - ax[1] * u) or 1
        perp = np.array([-ax[1], ax[0]]) * side
        nrm = np.array([perp[0] * 0.8, perp[1] * 0.8, 0.6]); nrm /= np.linalg.norm(nrm)
        br[y, x] = nrm @ L
    return br

def frac(N, var):
    ratio = {'a': 0.5, 'b': 0.5, 'c': 0.5, 'd': 0.6}[var]
    rot = 0
    cx, cy, R = star_geom(ratio)
    m = clean(raster(N, poly_fn(star_pts(cx, cy, R, ratio, rot))))
    br = facet_shade(N, m, cx, cy, R, ratio, rot)
    if var == 'c':   # 右上角那一角斷開：沿垂直於尖角軸的線切一道
        lo, hi = (1, 15) if N == 16 else (2, 30); s = hi - lo
        axis = math.radians(-90 + 72); ax = np.array([math.cos(axis), math.sin(axis)])
        d0 = 0.13 if N == 16 else 0.13
        n = np.arange(N) + 0.5; X, Y = np.meshgrid(n, n)
        U, V = (X - lo) / s - cx, (Y - lo) / s - cy
        t = U * ax[0] + V * ax[1]
        bw = (1.0 if N == 16 else 1.6) / s
        # 斜一點的裂口（不是正切），看起來是敲斷
        t2 = t + 0.18 * (U * -ax[1] + V * ax[0])
        ang = np.degrees(np.arctan2(V, U)) - (-90 + 72)
        ang = (ang + 180) % 360 - 180
        sector = np.abs(ang) < 40
        cut = (np.abs(t2 - d0 - 0.03) < bw / 2 + 0.5 / s * 0.6) & sector
        frag = (t2 > d0 + 0.03) & sector & m & ~cut
        # 斷掉的那角往外推 1 px（沿尖角軸方向取整）
        sh = (0, 0) if N == 16 else (1, 0)
        frag2 = np.roll(frag, sh[0], axis=1)
        m = (m & ~cut & ~frag) | frag2; m = clean(m)
    if N == 16:
        mid = m & (br < 0.15); dark = mid & edge_lr(m, 1)
    else:
        dark = m & (br < -0.15); mid = m & (br >= -0.15) & (br < 0.35)
        dark |= mid & edge_lr(m, 1)
    layers = [(m, 'tx-strong'), (mid, 'border-cap'), (dark, 'tx-dim')]
    if var == 'b':
        # 裂紋：從上尖往下到兩腳之間，折線，暗色 --border
        if N == 16:
            pts = [(7, 3), (8, 5), (7, 7), (8, 9), (7, 11)] if var == 'b' else [(8, 4), (7, 6), (9, 8), (8, 10)]
        else:
            pts = [(15, 6), (17, 10), (14, 14), (17, 18), (14, 22), (16, 25)] if var == 'b' else [(16, 9), (14, 13), (18, 17), (15, 22)]
        ck = np.zeros_like(m)
        for x, y in bresenham(pts):
            if m[y, x]: ck[y, x] = True
        layers.append((ck, 'border'))
    if N == 32:   # 高光點
        hl = np.zeros_like(m)
        ys, xs = np.nonzero(m & (br > 0.5))
        if len(ys):
            i = np.argmin(xs + ys); hl[ys[i], xs[i]] = True
        layers.append((hl, 'glint'))
    return compose(N, layers)

# ---------- 追憶 墨瓶 ----------
def union(*fs):
    return lambda U, V: np.logical_or.reduce([f(U, V) for f in fs])
def rect(x0, y0, x1, y1): return lambda U, V: (U >= x0) & (U < x1) & (V >= y0) & (V < y1)
def circ(cx, cy, r): return lambda U, V: (U - cx) ** 2 + (V - cy) ** 2 < r * r
def rot_fn(f, deg, cx=0.5, cy=0.5):
    a = math.radians(deg); ca, sa = math.cos(a), math.sin(a)
    return lambda U, V: f(cx + (U - cx) * ca + (V - cy) * sa, cy - (U - cx) * sa + (V - cy) * ca)

def flask(sx=1.0):
    return union(rect(0.30, 0.0, 0.70, 0.14), rect(0.39, 0.12, 0.61, 0.42),
                 lambda U, V: circ(0.5, 0.66, 0.36)(U, V) & (V < 1.0))
def scaled(f, x0, y0, s):
    return lambda U, V: f((U - x0) / s, (V - y0) / s)
def mem_shape(var, N):
    if var == 'a':   # 墨瓶（左下）＋一滴墨（右上）
        body = scaled(flask(), -0.04, 0.33, 0.68)
        drop = union(circ(0.76, 0.27, 0.15), poly_fn([(0.76, -0.04), (0.63, 0.22), (0.89, 0.22)]))
        return body, drop
    if var == 'b':   # 傾倒的圓腹瓶（瓶口朝右上）
        f = union(rect(0.33, 0.0, 0.67, 0.13), rect(0.42, 0.11, 0.58, 0.50), circ(0.5, 0.72, 0.28))
        return rot_fn(scaled(f, 0.0, 0.0, 1.0), 42, 0.5, 0.52)
    if var == 'c':   # 矮墨瓶＋斜插一枝筆
        body = union(rect(0.10, 0.40, 0.54, 0.50), rect(0.20, 0.48, 0.44, 0.58),
                     lambda U, V: (((U - 0.32) / 0.38) ** 2 + ((V - 0.96) / 0.42) ** 2 < 1) & (V < 1.0))
        brush = poly_fn([(0.24, 0.50), (0.90, -0.02), (1.02, 0.10), (0.40, 0.56)])
        return body, brush
    if var == 'd':   # 直立圓腹長頸瓶（對照）
        return flask()

def mem(N, var):
    w = 1 if N == 16 else 2
    if var == 'a':
        bf, df = mem_shape('a', N)
        body = clean(raster(N, bf)); drop = clean(raster(N, df)) & ~body
        m = body | drop
        dark = edge_lr(m, w)
        layers = [(m, 'el-cold'), (dark, 'mp-hi')]
        dh = np.zeros_like(m); ys, xs = np.nonzero(drop & ~dark & ~edge_ul(drop, 1))
        if len(ys): i = np.argmin(xs + ys); dh[ys[i], xs[i]] = True
        layers.append((dh, 'tx-strong'))
    elif var == 'c':
        bf, brf = mem_shape('c', N)
        body = clean(raster(N, bf)); brush = clean(raster(N, brf)) & ~body
        m = body | brush
        dark = edge_lr(m, w) & body
        layers = [(m, 'el-cold'), (dark, 'mp-hi')]
        # 筆桿用中性色（筆不是瓶），暗面 tx-dim
        layers += [(brush, 'border-cap'), (edge_lr(brush, 1) & brush, 'tx-dim')]
    else:
        m = clean(raster(N, mem_shape(var, N)))
        dark = edge_lr(m, w)
        layers = [(m, 'el-cold'), (dark, 'mp-hi')]
        body = m
    # 玻璃反光：瓶身左上一條 tx-strong
    ys, xs = np.nonzero(body & ~edge_lr(body, w) & ~edge_ul(body, 1))
    hl = np.zeros_like(m)
    if len(ys):
        # 瓶身（下半）最左上的內點
        cand = [(x + y * 0.6, x, y) for x, y in zip(xs, ys) if y >= (N * (0.55 if N == 16 else 0.5) if var not in 'ac' else N * 0.72)]
        if cand:
            _, x, y = min(cand)
            L = 2 if N == 16 else 4
            for k in range(L):
                if y + k < N and body[y + k, x] and not dark[y + k, x]: hl[y + k, x] = True
            if N == 32 and body[y - 2, x + 1]: hl[y - 2, x + 1] = True if body[y-2, x+1] and not dark[y-2,x+1] else False
    layers.append((hl, 'tx-strong'))
    if N == 32 and var != 'c':
        # 墨：瓶身下段深墨（只在 32，16 不畫以保持剪影亮）
        pass
    return compose(N, layers)

import maps16
CMAP = {'frac': {'W': 'tx-strong', 'm': 'border-cap', 'd': 'tx-dim', 'k': 'border'},
        'mem': {'W': 'el-cold', 'd': 'mp-hi', 'h': 'tx-strong', 'b': 'border-cap', 't': 'tx-dim'}}
def from_map(kind, v):
    rows = getattr(maps16, f'{kind.upper()}_{v.upper()}').strip('\n').split('\n')
    g = np.array([list(r) for r in rows])
    fill = g != '.'
    # 下緣貼底：描邊含在內的外框往下推到第 15 列（瓶子坐著），左右置中不動
    ys = np.nonzero(fill.any(1))[0]; sh = 14 - ys.max()
    g = np.roll(g, sh, axis=0)
    layers = [(g == ch, t) for ch, t in CMAP[kind].items()]
    return compose(16, layers)
CANDS = {'frac': 'abcd', 'mem': 'abcd'}
def build():
    res = {}
    for kind, vs in CANDS.items():
        for v in vs:
            for N in (16, 32):
                a = from_map(kind, v) if N == 16 else (frac(N, v) if kind == 'frac' else mem(N, v))
                d = os.path.join(OUT, f'affix_{kind}_{N}'); os.makedirs(d, exist_ok=True)
                p = os.path.join(d, f'affix_{kind}_{N}-{v}.png')
                Image.fromarray(a, 'RGBA').save(p)
                Image.fromarray(a, 'RGBA').resize((N * 2, N * 2), Image.NEAREST).save(p.replace('.png', '@2x.png'))
                res[(kind, v, N)] = a
    return res

if __name__ == '__main__':
    build()
