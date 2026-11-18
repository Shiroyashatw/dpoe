#!/usr/bin/env python3
"""M2-40 R5f 技能圖示手修（0 次生成）：照 docs/production/specs/M2-40-skill-icon-picks.md §2（美術 16:24，a42e1d2）。
在 dpoe/ 底下跑：python3 -I <本檔>   → art/icons/skill/<id>/<底圖 stem>h.png（sk_holyshield 重畫：sk_holyshield-r5fh.png），底圖不動
顏色只用該列 palette 與 §2 指定的 token；明暗用 token 本身、token 兩兩混色，或 r5d 導引圖的三階（亮＝往白混 40%、暗＝×0.55）。
畫完一律跑 r5c.postproc（外緣 1 px --scene-void、1 px 透明邊、去 2 px 角、色數 ≤ 32），再用 r5c.evaluate 量 §5。
"""
import math, pathlib, sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import r5c
from r5c import P, TOK, OUT, VOID, n4

BASE = {'sk_deadeye': 'sk_deadeye-s7224', 'sk_holyshield': None, 'sk_rage': 'sk_rage-s7219', 'sk_despair': 'sk_despair-s7206',
        'sk_windflask': 'sk_windflask-s7215', 'sk_clarity': 'sk_clarity-s6201', 'sk_fireburst': 'sk_fireburst-s7210',
        'sk_refract': 'sk_refract-s7213', 'sk_doom': 'sk_doom-s7218'}
STEM = {i: (s + 'h' if s else f'{i}-r5fh') for i, s in BASE.items()}
HAND = {}  # id → 改法（寫進 review）


def T(t):
    return np.array(P.hexrgb(TOK[t]), float)


def mix(a, b, w=0.5):
    """token 兩兩混色：w＝b 的比例"""
    a, b = (T(a) if isinstance(a, str) else a), (T(b) if isinstance(b, str) else b)
    return a * (1 - w) + b * w


def lite(t):
    return mix(t, np.array([255., 255, 255]), 0.4)


def dark(t):
    return T(t) * 0.55


def C(c):
    c = T(c) if isinstance(c, str) else c
    return np.r_[np.clip(np.round(c), 0, 255), 255].astype(np.uint8)


def load(i):
    return np.asarray(Image.open(OUT / i / f'{BASE[i]}.png').convert('RGBA')).copy()


def blank():
    return np.zeros((32, 32, 4), np.uint8)


def grid(f):
    return np.array([[bool(f(x, y)) for x in range(32)] for y in range(32)])


def dil8(m):
    p = np.pad(m, 1)
    return np.any([p[1 + dy:33 + dy, 1 + dx:33 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)], 0)


def ring(m):
    """外面一圈（8 鄰）"""
    return dil8(m) & ~m


def thin(m):
    """把 4 連通的階梯線削成 1 px 的 8 連通線：L 形轉角那格（橫鄰、直鄰都在，兩者斜向相連）拿掉"""
    m = m.copy()
    g = lambda y, x: 0 <= y < 32 and 0 <= x < 32 and m[y, x]
    for y, x in zip(*np.nonzero(m)):
        if any(g(y + dy, x) and g(y, x + dx) for dy in (-1, 1) for dx in (-1, 1)):
            m[y, x] = False
    return m


def put(a, m, c):
    a[m] = C(c)


def part(a, fill, colour_fn, gap_clear=True):
    """把一塊（fill 遮罩，colour_fn(x,y)→色）連同 1 px 描邊疊上去；gap_clear：先把描邊外 1 px 的舊像素清掉，保證跟別塊斷開"""
    rg = ring(fill)
    if gap_clear:
        a[ring(fill | rg) & ~(fill | rg)] = 0
    for y, x in zip(*np.nonzero(fill)):
        a[y, x] = C(colour_fn(x, y))
    put(a, rg, VOID)


def outline_fix(a):
    """描邊重算：遮罩外緣全改 --scene-void（交給 r5c.postproc）"""
    return np.asarray(r5c.postproc(Image.fromarray(a, 'RGBA'))[0]).copy()


def lone(a):
    """§5 雜點：8 鄰沒有同類（暗<35／中<70／亮）的不透明像素"""
    m = a[..., 3] > 127
    L = P.lab(a[..., :3].astype(float))[..., 0]
    cls = np.where(L < 35, 0, np.where(L < 70, 1, 2))
    out = []
    for y, x in zip(*np.nonzero(m)):
        nb = [(yy, xx) for yy in range(max(0, y - 1), min(32, y + 2)) for xx in range(max(0, x - 1), min(32, x + 2)) if (yy, xx) != (y, x) and m[yy, xx]]
        if cls[y, x] not in [cls[p] for p in nb]:
            out.append((y, x, nb))
    return out


def denoise(a):
    """孤立點改成 Lab 最接近的鄰近非描邊色（不加新色、不改剪影）；描邊上的孤立點不動。回傳改了幾格"""
    void = np.array(P.hexrgb(TOK[VOID]))
    n = 0
    for _ in range(4):
        hit = 0
        for y, x, nb in lone(a):
            if (a[y, x, :3] == void).all():
                continue
            cols = [tuple(a[p][:3]) for p in nb if not (a[p][:3] == void).all()]
            if cols:  # 換成 Lab 最接近的鄰色（改動最小）
                me = P.lab(a[y, x, :3].astype(float)[None])[0]
                a[y, x, :3] = min(set(cols), key=lambda c: float(((P.lab(np.array(c, float)[None])[0] - me) ** 2).sum()))
                hit += 1
        n += hit
        if not hit:
            break
    return n


# ---------------- 9 枚 ----------------
def deadeye():
    a = load('sk_deadeye')
    # 左骰（方）內部 x3–12、y14–24：頂面 y14–17 亮、左面 x3–7 中、右面 x8–12 暗；稜線用混色
    def left(x, y):
        if y <= 17:
            return '--tx-strong' if y < 17 else mix('--tx-strong', '--border-mid', 0.45)
        if x <= 7:
            return mix('--border-mid', '--tx-strong', 0.35) if y == 18 else ('--border-mid' if y < 24 else mix('--border-mid', '--border'))
        return mix('--border', '--border-mid') if x == 8 and y < 24 else ('--border' if y < 24 else mix('--border', '--panel-inset'))
    # 右骰（角立起）內部 y3–14：上三角頂面、左下面、右下面
    def right(x, y):
        if y <= 7:
            return '--tx-strong' if y < 7 else mix('--tx-strong', '--border-mid', 0.45)
        if x <= 21:
            return mix('--border-mid', '--tx-strong', 0.35) if y == 8 else '--border-mid'
        return mix('--border', '--border-mid') if x == 22 else ('--border' if y < 13 else mix('--border', '--panel-inset'))
    m = a[..., 3] > 127
    inner = m & n4(m)
    for y, x in zip(*np.nonzero(inner)):
        c = (left if x <= 13 else right)(x, y)
        a[y, x] = C(c)
    for x, y in [(7, 15), (4, 19), (6, 22), (9, 19), (10, 22)]:  # 左骰點數 2×2 --scene-void（不貼描邊）
        put(a, grid(lambda u, v: x <= u <= x + 1 and y <= v <= y + 1), VOID)
    for x, y in [(21, 4), (18, 9), (24, 9)]:  # 立起那顆的點 --bad，右下角那格用暗階
        put(a, grid(lambda u, v: x <= u <= x + 1 and y <= v <= y + 1), '--bad')
        a[y + 1, x + 1] = C(dark('--bad'))
    HAND['sk_deadeye'] = '剪影不動；兩顆骰子各分 3 面：頂面 --tx-strong、左面 --border-mid、右面 --border，稜線與底邊用相鄰 token 混色；左骰點數 2×2 --scene-void（頂 1、左 2、右 2），立起那顆點數 2×2 --bad（右下格 --bad 暗階）'
    return a


def holyshield():
    a = blank()
    cx, cy, deg = 21.0, 10.5, 20.0  # 盾心；往右傾 20°
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))

    def local(x, y):  # 轉回盾的座標：u 右、v 下
        dx, dy = x - cx, y - cy
        return dx * c + dy * s, -dx * s + dy * c

    def shield(x, y, k=0.0):  # 寬 14、高 16 的鳶形盾：上緣平、下半收成尖
        u, v = local(x, y)
        if v < -7.5 + k or v > 7.5 - k:
            return False
        w = 6.5 - k
        h = 9.5 - k  # 從 v=-2 起兩段圓弧收成尖（鳶形盾）
        R = (w * w + h * h) / (2 * w)
        hw = w if v <= -2 else math.sqrt(max(0, R * R - (v + 2) ** 2)) - (R - w)
        if v < -6.5 + k and abs(u) > w - 1:  # 上角削 1 格
            return False
        return abs(u) <= hw
    fill = grid(shield)
    face = grid(lambda x, y: shield(x, y, 1.15))

    def col(x, y):
        u, v = local(x, y)
        if not face[y, x]:  # 盾緣 --border-cap，右下那半壓暗
            return '--border-cap' if u + v < 3 else mix('--border-cap', '--border-mid', 0.5)
        if abs(u) < 0.6:  # 中脊亮線
            return mix('--border-mid', '--border-cap', 0.6) if v < 3 else '--border-mid'
        if u < 0:  # 左半迎光：上段混 --border-cap，往下 --border-mid
            return mix('--border-mid', '--border-cap', 0.4) if v < -3 else '--border-mid'
        return mix('--border-mid', '--border', 0.5) if v < 1 else '--border'  # 右半背光，右下最暗
    part(a, fill, col)
    # 左下 2 道弧形速度線，各 1 px --tx-strong，尾端混 --border-mid 淡出
    for p0, p1, p2 in (((13, 15), (6, 16), (3, 24)), ((18, 21), (11, 22), (7, 29))):  # 二次貝茲，往左下彎
        line = np.zeros((32, 32), bool)
        for k in range(200):
            t = k / 199
            x = (1 - t) ** 2 * p0[0] + 2 * t * (1 - t) * p1[0] + t * t * p2[0]
            y = (1 - t) ** 2 * p0[1] + 2 * t * (1 - t) * p1[1] + t * t * p2[1]
            line[int(round(y)), int(round(x))] = True
        line = thin(line) & ~dil8(dil8(fill))
        part(a, line, lambda x, y, p2=p2: mix('--tx-strong', '--border-mid', 0.55) if math.hypot(x - p2[0], y - p2[1]) < 3 else '--tx-strong', gap_clear=False)
    HAND['sk_holyshield'] = '重畫：右上 14×16 鳶形小盾、往右傾 20°；盾面 --border-mid：中脊一道亮線，左半迎光（上段混 --border-cap）、右半背光（混 --border，右下 --border 最暗）；盾緣 --border-cap（右下半混 --border-mid）；左下 2 道 1 px 弧形速度線 --tx-strong，尾端混 --border-mid'
    return a


def rage():
    a = blank()
    hp = [lite('--hp'), T('--hp'), dark('--hp')]

    def shade(x, y, x0, y0, x1, y1):  # 左上亮、中、右下暗；左上角一格 --bad 高光、旁邊混色
        t = ((x - x0) / max(1, x1 - x0) + (y - y0) / max(1, y1 - y0)) / 2
        if x == x0 + 1 and y == y0 + 1:
            return '--bad'
        if t < 0.18:
            return mix('--bad', hp[0], 0.5)
        return hp[0] if t < 0.4 else (hp[1] if t < 0.72 else hp[2])
    # 主掌墊：下寬上窄的圓角梯形，內部 y17–23
    def pad(x, y):
        if not 17 <= y <= 23:
            return False
        t = (y - 17) / 6
        l, r = 10.5 - 4 * t, 21.5 + 4 * t
        if y in (17, 23):
            l, r = l + 1, r - 1
        return l <= x <= r
    P_ = grid(pad)
    part(a, P_, lambda x, y: shade(x, y, 7, 17, 25, 23))
    # 4 顆橢圓趾墊 4×5，弧形排在掌墊上方，描邊間隔 1 px
    for x0, y0 in ((3, 9), (10, 4), (18, 4), (25, 9)):
        toe = grid(lambda x, y: x0 <= x <= x0 + 3 and y0 <= y <= y0 + 4 and not ((x in (x0, x0 + 3)) and (y in (y0, y0 + 4))))
        part(a, toe, lambda x, y, x0=x0, y0=y0: shade(x, y, x0, y0, x0 + 3, y0 + 4))
    # 掌下 2 道短裂紋 --border（上端混 --border-mid 亮、下端 --border 暗階）
    for pts in (((12, 27), (11, 27), (10, 28), (9, 29)), ((19, 27), (20, 27), (21, 28), (22, 29))):
        cr = np.zeros((32, 32), bool)
        for x, y in pts:
            cr[y, x] = True
        part(a, cr, lambda x, y: mix('--border', '--border-mid', 0.5) if y == 27 else ('--border' if y == 28 else dark('--border')), gap_clear=False)
    HAND['sk_rage'] = '重畫成熊掌印：刪掉散開的 6 顆紅點；主掌墊改下寬上窄的圓角梯形；4 顆 4×5 橢圓趾墊排成弧形、描邊間隔 1 px；掌墊、趾墊都用 --hp 三階（左上亮→右下暗），左上一格 --bad 高光、旁邊 --bad／--hp 亮階混色；掌下 2 道 4 px 斜向短裂紋 --border（上端混 --border-mid、下端暗階）'
    return a


def despair():
    a = load('sk_despair')
    petal = a[23:31, 12:20].copy()  # 底部那片花瓣（含描邊）
    a[19:31, :] = 0  # 先清掉 y≥19 的右鉤尾端粉色塊與底部花瓣
    a[12:19, :12] = 0  # 左腿從弧頂往下約 1/3（y12）截斷
    b = load('sk_despair')
    a[19, 20:27] = b[19, 20:27]  # 右鉤留到 y19（鉤尖），y20 起是原本黏著的粉色塊
    a[19, 24:27] = 0
    a = outline_fix(a)
    # 唯一一片花瓣放到鉤尖正下方，描邊跟鉤尖描邊之間空 1 px
    ys, xs = np.nonzero(a[..., 3] > 127)
    tip_y = ys.max()
    tip_x = int(round(xs[ys >= tip_y - 2].mean()))
    pm = petal[..., 3] > 127
    py, px = np.nonzero(pm)
    oy, ox = tip_y + 2 - py.min(), tip_x - int(round(px.mean()))
    for y, x in zip(py, px):
        if 0 < y + oy < 31 and 0 < x + ox < 31:
            a[y + oy, x + ox] = petal[y, x]
    HAND['sk_despair'] = f'左腿從弧頂往下約 1/3（y12）截斷並補描邊；刪掉右鉤尖黏著的粉色塊與底部花瓣，只留右邊彎鉤下垂（鉤尖 y{tip_y}）；原本那片花瓣（原色、原明暗）移到鉤尖正下方，描邊間空 1 px'
    return a


def windflask():
    a = blank()
    g = [lite('--good'), T('--good'), dark('--good')]
    # 瓶塞 2 px（y3–4）--border-mid 三階
    cork = grid(lambda x, y: 5 <= x <= 7 and 3 <= y <= 4)
    # 瓶頸 x5–7 y5–12；瓶身下段鼓出：y13–14 x4–8、y15–26 x3–9、y27 x4–8
    def bottle(x, y):
        return (5 <= x <= 7 and 5 <= y <= 12) or (4 <= x <= 8 and y in (13, 14, 27)) or (3 <= x <= 9 and 15 <= y <= 26)
    vial = grid(bottle)

    def vcol(x, y):
        if y <= 4:
            return lite('--border-mid') if x == 5 else ('--border-mid' if x == 6 else dark('--border-mid'))
        if y <= 7:  # 瓶頸上段是空玻璃：--tx-strong 反光＋--panel-inset 混色
            return '--tx-strong' if x == 5 else mix('--panel-inset', '--tx-strong', 0.35 if x == 6 else 0.15)
        l = 3 if y >= 15 else (4 if y >= 13 else 5)
        r = 9 if y >= 15 else (8 if y >= 13 else 7)
        if y == 8:  # 液面
            return mix('--good', '--tx-strong', 0.5)
        if x == l + 1 and 10 <= y <= 24:
            return '--tx-strong' if y in (16, 17, 18) else g[0]
        if x == l:
            return g[1]
        if x >= r - 1 or y >= 26:
            return g[2]
        return g[0] if (x - l) + (y - 8) / 6 < 3 else g[1]
    part(a, cork | vial, vcol)
    # 兩道風線：跟瓶身斷開 1 px，尾端（右）收細的波浪線
    for x0, yc in ((12, 12), (13, 22)):
        w = np.zeros((32, 32), bool)
        for x in range(x0, 30):
            y = yc + int(round(1.4 * math.sin((x - x0) / 2.4)))
            th = 3 if x < x0 + 4 else (2 if x < 24 else 1)
            for k in range(th):
                if 1 < y - th // 2 + k < 30:
                    w[y - th // 2 + k, x] = True
        w &= ~dil8(dil8(vial | cork))
        def wcol(x, y, w=w):
            col = np.nonzero(w[:, x])[0]
            top, n = col.min(), len(col)
            if n == 1:
                return '--good' if x < 28 else mix('--good', '--tx-strong', 0.5)
            return mix('--good', '--tx-strong', 0.6) if y == top else (dark('--good') if y == col.max() else '--good')
        part(a, w, wcol, gap_clear=False)
    HAND['sk_windflask'] = '重畫成小瓶：頂端 2 px 瓶塞（--border-mid 三階）、細瓶頸上段空玻璃（--panel-inset／--tx-strong 混色）、下段鼓出瓶身裝 --good 三階藥水、左側 --tx-strong 反光；兩道風線跟瓶身斷開 1 px，改成波浪、由 3 px 收細到 1 px（--good，上緣混 --tx-strong、下緣暗階）'
    return a


def clarity():
    a = load('sk_clarity')
    # 右下 2 顆斷開的水滴：2×3（x28–29、y26–28）與 1×2（x24、y28–29）；--el-cold，亮點 --tx-strong，底部混 --mp
    d1 = grid(lambda x, y: 28 <= x <= 29 and 26 <= y <= 28)
    d2 = grid(lambda x, y: x == 24 and 28 <= y <= 29)
    for d in (d1, d2):  # 清出 1 px 空隙（會削掉新月右下緣 1–2 px，再補描邊）
        a[dil8(dil8(d)) & ~d] = 0
    a = outline_fix(a)
    part(a, d1, lambda x, y: '--tx-strong' if (x, y) == (28, 26) else (mix('--el-cold', '--mp', 0.5) if (x, y) == (29, 28) else '--el-cold'))
    part(a, d2, lambda x, y: '--tx-strong' if y == 28 else '--el-cold')
    HAND['sk_clarity'] = '新月右下尖端下方加 2 顆斷開的水滴（2×3、1×2），--el-cold、亮點 --tx-strong、2×3 那顆右下一格混 --mp；為了留 1 px 空隙削掉新月右下緣 1–2 px 並補描邊'
    return a


def noise_fix(i):
    def f():
        a = load(i)
        before = len(lone(a)) / (a[..., 3] > 127).sum()
        n = denoise(a)
        after = len(lone(a)) / (a[..., 3] > 127).sum()
        HAND[i] = f'去孤立點：{n} 格改成 8 鄰裡 Lab 最接近的非描邊色（剪影不動、不加新色），雜點 {before:.3f} → {after:.3f}'
        return a
    return f


DRAW = {'sk_deadeye': deadeye, 'sk_holyshield': holyshield, 'sk_rage': rage, 'sk_despair': despair, 'sk_windflask': windflask,
        'sk_clarity': clarity, 'sk_fireburst': noise_fix('sk_fireburst'), 'sk_refract': noise_fix('sk_refract'), 'sk_doom': noise_fix('sk_doom')}


def build():
    for i, f in DRAW.items():
        a = f()
        im, _ = r5c.postproc(Image.fromarray(a, 'RGBA'))
        (OUT / i).mkdir(parents=True, exist_ok=True)
        im.save(OUT / i / f'{STEM[i]}.png')
    return HAND


if __name__ == '__main__':
    build()
    st = dict(r5c.json.loads((r5c.EV / 'r5e_state.json').read_text(encoding='utf-8')), **{'sk_fireburst': 'x', 'sk_refract': 'x', 'sk_doom': 'x'})
    st.update(STEM)
    for i in DRAW:
        r, _ = r5c.evaluate(i, STEM[i], st, {})
        print(i, r['result'], r['style_colors'], r['style_dL'], 'iou', r['iou32_max'], r['iou32_with'], r['iou16_max'], r['iou16_with'],
              'fill', r['fill'], r['box_fill'], r['fill16'], 'noise', r['noise'], 'chk16', r['checker16'], '|', r['why'])
