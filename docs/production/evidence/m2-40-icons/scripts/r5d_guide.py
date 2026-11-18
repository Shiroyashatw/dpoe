"""R5d 上色導引圖（§2.2）：照 §3 剪影欄畫 32×32，每塊用該列 palette 主色分 3 階（左上亮、中、右下暗），外緣 1 px --scene-void。
python3 -I <本檔> sk_fire,sk_gasflask,...   → art/_raw/skill/guide/<id>.png（舊的 r5 實心導引圖改名 <id>_r5.png 留著）
python3 -I <本檔> sheet                      → r5e_guide_sheet.png（本輪導引圖 4 倍拼圖）
R5e：預檢對同欄集（含已過新圖、拆圖對象、本輪其他導引圖）IoU < 0.55 才准送；r5d 的 sk_fire／sk_gasflask 導引圖改名 <id>_r5d.png 留著。
"""
import math, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from r5 import *
from PIL import ImageDraw, ImageFont

GD = RAW / 'guide'
R5_GUIDES = {'sk_deadeye', 'sk_fireburst', 'sk_ironaura', 'sk_weaken'}  # r5 留下的實心導引圖
R5D_GUIDES = {'sk_fire', 'sk_gasflask'}  # r5d 撞圖的導引圖，改名留著
ROUND = 'r5e'
LIMIT = 0.55



def rgb(t):
    return np.array(P.hexrgb(TOK[t]), float)


def tiers(tok):
    """亮／中／暗三階：亮＝往白混 40%，中＝原色，暗＝乘 0.55；tok 給三個 hex 就照給的（sk_fire：白黃→橘→紅，避開粉棕）"""
    if isinstance(tok, tuple):
        return [np.array(P.hexrgb(c), float) for c in tok]
    base = rgb(tok)
    return [np.clip(base * 0.6 + 255 * 0.4, 0, 255), base, base * 0.55]


def circle(cx, cy, r):
    return lambda x, y: (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def ellipse(cx, cy, rx, ry):
    return lambda x, y: ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1


def rot_rect(cx, cy, w, h, deg):
    """以 (cx,cy) 為中心、寬 w（沿軸）、高 h，軸往 deg（0＝右、-45＝右上）"""
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return lambda x, y: abs((x - cx) * c + (y - cy) * s) <= w / 2 and abs(-(x - cx) * s + (y - cy) * c) <= h / 2


def seg(x0, y0, x1, y1, w):
    """粗線段，寬 w"""
    def f(x, y):
        dx, dy = x1 - x0, y1 - y0
        t = max(0, min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)))
        return (x - x0 - t * dx) ** 2 + (y - y0 - t * dy) ** 2 <= w * w / 4
    return f


def poly(*pts):
    def f(x, y):
        inside = False
        for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
            if (ay > y) != (by > y) and x < ax + (y - ay) * (bx - ax) / (by - ay):
                inside = not inside
        return inside
    return f


def arc(cx, cy, r0, r1, a0, a1):
    """環的一段，角度 a0→a1（度，0＝右、90＝下，順時針）"""
    def f(x, y):
        d = math.hypot(x - cx, y - cy)
        a = math.degrees(math.atan2(y - cy, x - cx)) % 360
        return r0 <= d <= r1 and (a - a0) % 360 <= (a1 - a0) % 360
    return f


def union(*fs):
    return lambda x, y: any(f(x, y) for f in fs)


def minus(f, g):
    return lambda x, y: f(x, y) and not g(x, y)


def spiral(cx, cy, w, turns, r_in, r_out, a0):
    """往內捲的粗螺旋線（阿基米德），a0 起點角"""
    def f(x, y):
        d = math.hypot(x - cx, y - cy)
        a = (math.degrees(math.atan2(y - cy, x - cx)) - a0) % 360
        for k in range(int(turns) + 1):
            t = (a + 360 * k) / (360 * turns)
            if t <= 1 and abs(d - (r_out - (r_out - r_in) * t)) <= w / 2:
                return True
        return False
    return f


FIRE = ('#fff4c2', '#ffd23a', '#e8a21a'), ('#ffb347', '#f07a12', '#c4500a'), ('#f05a28', '#c8281e', '#7c1410')  # 核心白黃、中橘、外紅

# 每張：[(遮罩, palette token 或三階 hex)]，後面的塊蓋前面的塊。位置照 §3.1 剪影欄。
G = {
    # #24 兩顆骰子並排，右邊那顆用角立起、比左邊高
    'sk_deadeye': [
        (rot_rect(7.5, 19, 10, 10, 0), '--tx-strong'),
        (rot_rect(21.5, 8, 9, 9, 45), '--tx-strong'),
        (union(circle(5.5, 17, 0.8), circle(9.5, 21, 0.8), circle(7.5, 19, 0.8)), '--bad'),
        (union(circle(21.5, 5.5, 0.8), circle(21.5, 10.5, 0.8)), '--warn'),
    ],
    # #2 三顆分開的小寶石排成正三角，細線相連，中間空
    'sk_purityaura': [
        (union(seg(16, 7, 7, 24, 1.2), seg(16, 7, 25, 24, 1.2), seg(7, 24, 25, 24, 1.2)), '--tx-strong'),
        (poly((16, 2), (21, 7.5), (16, 13), (11, 7.5)), '--el-fire'),
        (poly((7, 18.5), (12, 24), (7, 29.5), (2, 24)), '--el-cold'),
        (poly((25, 18.5), (30, 24), (25, 29.5), (20, 24)), '--el-light'),
    ],
    # #3 上緣一條扁雲帶，一道粗閃電從雲往左下劈
    'sk_staticfield': [
        (union(ellipse(16, 6.5, 14, 2.4), circle(12, 4.5, 2.4), circle(20, 4.2, 2.6)), '--tx-strong'),
        (poly((19, 9), (22, 9), (17, 16), (20.5, 16), (6, 29), (12.5, 18.5), (9.5, 18.5), (16, 9)), '--el-light'),
    ],
    # #4 斷開的鐐銬：兩半 C 形環，左上與右下分開，中間有缺口
    'sk_summongod': [
        (arc(10.5, 10.5, 4.5, 8, 80, 10), '--awk'),
        (arc(21.5, 21.5, 4.5, 8, 260, 190), '--el-fire'),
    ],
    # #5 寬肩塔盾，正面，下緣平；盾的右上缺一角，露出一截劍尖
    'sk_ironaura': [
        (minus(poly((3, 6), (18, 6), (18, 27), (3, 27)), poly((10, 5), (19, 5), (19, 15))), '--border-mid'),
        (minus(poly((8, 9), (11, 9), (11, 24), (8, 24)), poly((10, 5), (19, 5), (19, 15))), '--hp'),
        (union(seg(15, 13, 26, 3, 2.2), poly((25, 2), (29, 2), (29, 5))), '--border-cap'),
    ],
    # #6 彎垂的斷莖成鉤形，莖尖往下，掉一片小花瓣
    'sk_despair': [
        (union(seg(7, 29, 7, 15, 3), arc(15, 15, 6.5, 9.5, 180, 0), seg(23, 15, 23, 20, 3)), '--tx-dim'),
        (ellipse(23, 22, 3, 4), '--el-chaos'),
        (rot_rect(15, 27, 5, 3, 30), '--el-chaos'),
    ],
    # #7 一塊甲片沿斜線裂成兩片，兩片錯開、中間空隙，右上一顆小菱形
    'sk_weaken': [
        (poly((3, 9), (17, 7), (5, 22)), '--border-mid'),
        (poly((24, 13), (25, 28), (12, 28)), '--border-mid'),
        (poly((26, 2), (29, 5), (26, 8), (23, 5)), '--el-chaos'),
    ],
    # #8 小盾在右上、略傾斜，往左下拖 2 道弧形速度線
    'sk_holyshield': [
        (union(arc(28, 30, 17, 19, 205, 240), arc(30, 28, 11, 13, 210, 245)), '--tx-strong'),
        (poly((17, 4), (28, 2), (29, 11), (25, 18), (19, 14)), '--border-mid'),
        (poly((21, 5), (26, 4), (26, 10), (23, 14)), '--border-cap'),
    ],
    # #9 三道平行斜爪痕（左上到右下），末端各滴一滴血
    'sk_bloodlust': [
        (union(seg(3, 9, 15, 21, 1.8), seg(9, 3, 22, 16, 1.8), seg(16, 3, 27, 14, 1.8)), '--hp'),
        (union(ellipse(16, 23, 1.8, 2.6), ellipse(23, 20.5, 1.8, 2.6), ellipse(28, 17.5, 1.6, 2.4)), '--bad'),
    ],
    # #10 空心火環，外緣 6 道短火舌往外，中心挖空
    'sk_fireburst': [
        (union(*[poly((16 + 7.4 * math.cos(math.radians(a - 8)), 16 + 7.4 * math.sin(math.radians(a - 8))),
                      (16 + 14 * math.cos(math.radians(a)), 16 + 14 * math.sin(math.radians(a))),
                      (16 + 7.4 * math.cos(math.radians(a + 8)), 16 + 7.4 * math.sin(math.radians(a + 8)))) for a in range(-75, 285, 60)]), '--warn'),
        (arc(16, 16, 7, 7.8, 0, 359.9), '--el-fire'),
    ],
    # #11 小瓶在左下（細）、瓶口斜向右上，右上冒一團三瓣毒雲（雲比瓶大、三瓣分開）
    'sk_gasflask': [
        (union(circle(12, 14, 4.2), circle(20, 6.5, 4.6), circle(25.5, 16, 4.2), seg(14, 12, 20, 9, 2), seg(22, 9, 24, 13, 2)), '--el-chaos'),
        (rot_rect(7.5, 24.5, 9, 4, -45), '--border-mid'),
        (rot_rect(11.5, 20.5, 3, 2.5, -45), '--border'),
        (rot_rect(6.5, 25.5, 5, 2, -45), '--el-chaos'),
    ],
    # #12 底部一灘很寬的扁油漬，左上一顆小圓罐彈起，罐和油漬分開（r5d 已過，沿用）
    'sk_oilgrenade': [
        (union(ellipse(16, 25.5, 13, 3.2), ellipse(10, 24, 5, 2.2), ellipse(23, 24.5, 4.5, 2)), '--warn'),
        (circle(10, 10, 5.2), '--border-mid'),
        (rot_rect(10, 4.5, 4, 2, 0), '--border'),
        (rot_rect(10, 11, 7, 2, 0), '--border'),
    ],
    # #13 一支箭直插進一小段地面短橫條，箭尾往上扇開 3 道短光
    'sk_refract': [
        (rot_rect(16, 26.5, 22, 3, 0), '--border-mid'),
        (union(seg(9, 3, 13, 9, 2), seg(16, 2, 16, 8, 2), seg(23, 3, 19, 9, 2)), '--el-light'),
        (union(rot_rect(16, 17, 2, 14, 0), poly((13, 10), (19, 10), (16, 14))), '--tx-strong'),
        (poly((14, 20), (18, 20), (16, 25)), '--el-cold'),
    ],
    # #14 往內捲的浪頭漩渦，單一粗螺旋線，中心空
    'sk_tidepull': [
        (spiral(16, 16, 2.6, 1.35, 4.5, 13, 200), '--el-cold'),
        (circle(5, 13, 2), '--tx-strong'),
    ],
    # #15 細長直立小瓶靠左，兩道長風線從瓶身往右拉出（像「F」）
    'sk_windflask': [
        (union(rot_rect(7, 16, 22, 5, 90), rot_rect(7, 4, 3, 3, 0)), '--border-mid'),
        (rot_rect(7, 19, 13, 3, 90), '--good'),
        (union(seg(10, 10, 27, 7, 3), seg(10, 18, 23, 16.5, 3), arc(26, 11, 3, 5, 270, 90)), '--good'),
    ],
    # #16 單把匕首從左上斜刺到右下，柄端套一個小空心準星環
    'sk_assassinate': [
        (arc(7, 7, 2.5, 4.6, 0, 359.9), '--bad'),
        (seg(10, 10, 14, 14, 3), '--panel-inset'),
        (seg(11, 17, 17, 11, 2.6), '--border-mid'),
        (poly((14, 16), (16, 14), (28, 28)), '--el-phys'),
    ],
    # #17 圓彈在左下，一條長引信彎到右上，末端一顆四角火花
    'sk_combust': [
        (arc(23, 22, 9, 11, 205, 290), '--warn'),
        (circle(8, 24, 5.2), '--border-mid'),
        (rot_rect(11.5, 19.5, 3, 3, 45), '--border'),
        (union(poly((25, 2), (26.5, 6), (25, 10), (23.5, 6)), poly((21, 6), (25, 4.5), (29, 6), (25, 7.5))), '--el-fire'),
    ],
    # #18 上半是三尖冠，下接一個空心環；冠寬、環小
    'sk_doom': [
        (arc(16, 22, 3, 5.4, 0, 359.9), '--border'),
        (poly((3, 13), (3, 3), (6, 9), (10, 9), (16, 2), (22, 9), (26, 9), (29, 3), (29, 13), (16, 11)), '--border-cap'),
        (union(circle(16, 9, 1.4), circle(8, 11, 1.1), circle(24, 11, 1.1)), '--hp'),
    ],
    # #19 熊掌印：一大掌墊加 4 顆分開的趾墊，下方 2 道短裂紋
    'sk_rage': [
        (ellipse(16.5, 19, 6, 4.6), '--border-mid'),
        (union(ellipse(5, 12, 2, 2.6), ellipse(10, 5.5, 2, 2.6), ellipse(18, 4.5, 2, 2.6), ellipse(25, 8.5, 2, 2.6)), '--border-mid'),
        (union(seg(11, 26, 9, 29, 1.5), seg(20, 26, 23, 29, 1.5)), '--bad'),
    ],
    # #20 剪紙人形：張臂、雙腿岔開，薄平、無臉，略往右傾
    'sk_talisman': [
        (union(circle(18, 5.5, 3), seg(5, 13, 28, 10, 2.6), poly((14, 10), (21, 10), (20, 20), (15, 20)),
               seg(16, 19, 10, 29, 2.8), seg(19, 19, 26, 28, 2.8)), '--paper'),
        (rot_rect(17, 15, 6, 1.6, -5), '--hp'),
    ],
    # #21 空心菱形碎成 4 片，往四角飛開，中心留空
    'sk_exorcise': [
        (union(poly((12, 3), (14, 5), (6, 13), (4, 11)), poly((20, 3), (28, 11), (26, 13), (18, 5))), '--el-chaos'),
        (union(poly((4, 21), (6, 19), (14, 27), (12, 29)), poly((28, 21), (20, 29), (18, 27), (26, 19))), '--awk'),
        (circle(16, 16, 1.6), '--tx-strong'),
    ],
    # #22 火球在右（縮小），尾巴往左拉長變細、帶 3 道火舌；白黃核心→橘→紅外緣
    'sk_fire': [
        (union(poly((22, 12.5), (4, 9), (13, 14)), poly((21, 15), (2, 16.5), (21, 17.5)), poly((22, 19.5), (6, 24), (13, 19))), FIRE[2]),
        (circle(24.5, 16, 4.8), FIRE[2]),
        (union(circle(24.3, 15.7, 3.6), poly((21, 14), (8, 16.3), (21, 17.5))), FIRE[1]),
        (circle(24.6, 15.4, 2), FIRE[0]),
    ],
    # #23 一大塊有稜角的岩石在右下，寬短的火尾往左上
    'sk_meteor': [
        (poly((3, 3), (12, 8), (20, 13), (13, 20), (8, 12)), '--el-fire'),
        (poly((7, 6), (14, 11), (11, 14)), '--warn'),
        (poly((19, 14), (25, 13), (29, 18), (28, 26), (22, 29), (16, 25), (15, 19)), '--border-mid'),
    ],
}


def draw(i):
    a = np.zeros((32, 32, 4), np.uint8)
    m = np.zeros((32, 32), bool)
    for f, tok in G[i]:
        b = np.array([[bool(f(x, y)) and 2 <= x <= 29 and 2 <= y <= 29 for x in range(32)] for y in range(32)])
        ys, xs = np.nonzero(b)
        if not len(ys):
            continue
        t = tiers(tok)
        s = (xs - xs.min()) / max(1, np.ptp(xs)) + (ys - ys.min()) / max(1, np.ptp(ys))  # 0 左上 → 2 右下
        k = np.where(s < 0.75, 0, np.where(s < 1.35, 1, 2))
        for y, x, kk in zip(ys, xs, k):
            a[y, x, :3], a[y, x, 3] = t[kk], 255
        m |= b
    pad = np.pad(m, 1)
    grow = m.copy()
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
        grow |= pad[1 + dy:33 + dy, 1 + dx:33 + dx]
    a[grow & ~m] = P.hexrgb(TOK[VOID]) + [255]
    GD.mkdir(parents=True, exist_ok=True)
    old = GD / f'{i}.png'
    for keep, suf in ((R5_GUIDES, '_r5'), (R5D_GUIDES, '_r5d')):  # 前幾輪的導引圖改名留著
        if i in keep and old.exists() and not (GD / f'{i}{suf}.png').exists():
            old.rename(GD / f'{i}{suf}.png')
    Image.fromarray(a, 'RGBA').save(old)


TOP = {}


def precheck(i):
    """導引圖對同欄集（沒被取代的舊圖＋已過新圖＋拆圖對象＋本輪其他導引圖）的最大 IoU"""
    g = mask(Image.open(GD / f'{i}.png'))
    others = {k: mask(v) for k, v in old_sets_imgs(JOBS[i]['bar']).items() if k != i}
    for e in EXTRA.get(i, []):
        others.setdefault(e, mask(old_img(e)))
    st = state()
    for k in G:
        if k != i and k not in st and JOBS[k]['bar'] == JOBS[i]['bar'] and (GD / f'{k}.png').exists():
            others['guide:' + k] = mask(Image.open(GD / f'{k}.png'))
    w = max((round(iou(g, v), 3), k) for k, v in others.items())
    TOP[i] = sorted(((round(iou(g, v), 3), k) for k, v in others.items()), reverse=True)[:3]
    a = np.asarray(Image.open(GD / f'{i}.png'))
    return round(g.sum() / 1024, 3), len({tuple(p) for p in a[g][:, :3]}), w


def state():
    import json
    f = EV / f'{ROUND}_state.json'
    return json.loads(f.read_text(encoding='utf-8')) if f.exists() else {}


def old_sets_imgs(bar):
    """預檢用：同欄集舊圖（扣掉被取代的）＋本輪已過的新圖"""
    o = old_sets()[bar]
    ims = {k: old_img(k) for k in o if k not in DROP[bar] and not (k in JOBS and JOBS[k]['bar'] == bar)}
    ims.update({k: Image.open(OUT / k / f'{s}.png') for k, s in state().items() if JOBS[k]['bar'] == bar})
    return ims


def sheet(ids):
    font = ImageFont.truetype('/usr/share/fonts/opentype/unifont/unifont.otf', 12)
    cols = 6
    rows = (len(ids) + cols - 1) // cols
    c = Image.new('RGBA', (cols * 150 + 10, 24 + rows * 190), (40, 37, 33, 255))
    d = ImageDraw.Draw(c)
    d.text((6, 4), 'R5e 上色導引圖（init_image，32×32，4 倍＋1 倍；下方是預檢：導引圖對同欄集最大 IoU，< 0.55 才送）', fill=(230, 220, 200, 255), font=font)
    for n, i in enumerate(ids):
        im = Image.open(GD / f'{i}.png')
        x, y = 10 + n % cols * 150, 24 + n // cols * 190
        c.paste(im.resize((128, 128), Image.NEAREST), (x, y), im.resize((128, 128), Image.NEAREST))
        c.paste(im, (x, y + 132), im)
        f, _, (v, k) = precheck(i)
        d.text((x + 36, y + 132), i, fill=(230, 220, 200, 255), font=font)
        d.text((x, y + 150), f'IoU {v} {k[:16]}', fill=(230, 220, 200, 255) if v < LIMIT else (254, 120, 131, 255), font=font)
        d.text((x, y + 166), f'填滿 {f}', fill=(230, 220, 200, 255), font=font)
    c.save(EV / f'{ROUND}_guide_sheet.png')


R5E = [i for i in JOBS if i not in ('sk_clarity', 'sk_oilgrenade')]  # 本輪 22 張

if __name__ == '__main__':
    ids = R5E if sys.argv[1] in ('all', 'sheet') else sys.argv[1].split(',')
    if sys.argv[1] != 'sheet':
        for i in ids:
            draw(i)
    for i in ids:
        f, n, w = precheck(i)
        print(('OK ' if w[0] < LIMIT and 0.2 <= f <= 0.45 else 'XX ') + i, '填滿率', f, '色數', n, '前 3', TOP[i])
    sheet(R5E)
