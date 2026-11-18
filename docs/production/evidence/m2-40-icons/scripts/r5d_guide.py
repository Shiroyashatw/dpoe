"""R5d 上色導引圖（§2.2）：照 §3 剪影欄畫 32×32，每塊用該列 palette 主色分 3 階（左上亮、中、右下暗），外緣 1 px --scene-void。
python3 -I <本檔> sk_fire,sk_gasflask,...   → art/_raw/skill/guide/<id>.png（舊的 r5 實心導引圖改名 <id>_r5.png 留著）
python3 -I <本檔> sheet                      → r5d_guide_sheet.png（所有 r5d 導引圖 4 倍拼圖）
"""
import math, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from r5 import *
from PIL import ImageDraw, ImageFont

GD = RAW / 'guide'
R5_GUIDES = {'sk_deadeye', 'sk_fireburst', 'sk_ironaura', 'sk_weaken'}  # r5 留下的實心導引圖


def rgb(t):
    return np.array(P.hexrgb(TOK[t]), float)


def tiers(base):
    """亮／中／暗三階：亮＝往白混 40%，中＝原色，暗＝乘 0.55"""
    return [np.clip(base * 0.6 + 255 * 0.4, 0, 255), base, base * 0.55]


def circle(cx, cy, r):
    return lambda x, y: (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def ellipse(cx, cy, rx, ry):
    return lambda x, y: ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1


def rot_rect(cx, cy, w, h, deg):
    """以 (cx,cy) 為中心、寬 w（沿軸）、高 h，軸往 deg（0＝右、-45＝右上）"""
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return lambda x, y: abs((x - cx) * c + (y - cy) * s) <= w / 2 and abs(-(x - cx) * s + (y - cy) * c) <= h / 2


def union(*fs):
    return lambda x, y: any(f(x, y) for f in fs)


def minus(f, g):
    return lambda x, y: f(x, y) and not g(x, y)


# 每張：[(遮罩, palette token)]，後面的塊蓋前面的塊
G = {
    # #22 火球在右，短直尾巴水平往左（橫向，不斜）
    'sk_fire': [
        (lambda x, y: any(x0 <= x <= 18 and abs(y - yc) <= 0.4 + (x - x0) * h for x0, yc, h in ((4, 16, 0.3), (8, 12.5, 0.2), (8, 19.5, 0.2))), '--warn'),
        (circle(21.5, 16, 7), '--el-fire'),
        (circle(20.5, 15, 3), '--tx-strong'),
    ],
    # #11 小瓶在左下、瓶口斜向右上，右上冒三瓣毒雲（雲比瓶大）
    'sk_gasflask': [
        (union(circle(17, 12, 4.6), circle(23, 8, 5.2), circle(25, 15, 4.4)), '--el-chaos'),
        (union(circle(8.5, 23.5, 4.6), rot_rect(12.5, 19.5, 5, 3.4, -45)), '--border-mid'),
        (rot_rect(14.5, 17.5, 2.4, 3.6, -45), '--border'),
        (minus(circle(8.5, 23.5, 3.6), lambda x, y: x + y < 31), '--el-chaos'),
    ],
    # #12 底部一灘很寬的扁油漬，左上一顆小圓罐彈起，罐和油漬分開
    'sk_oilgrenade': [
        (union(ellipse(16, 25.5, 13, 3.2), ellipse(10, 24, 5, 2.2), ellipse(23, 24.5, 4.5, 2)), '--warn'),
        (circle(10, 10, 5.2), '--border-mid'),
        (rot_rect(10, 4.5, 4, 2, 0), '--border'),
        (rot_rect(10, 11, 7, 2, 0), '--border'),
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
        t = tiers(rgb(tok))
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
    if i in R5_GUIDES and not (GD / f'{i}_r5.png').exists():  # r5 的實心導引圖留著
        old.rename(GD / f'{i}_r5.png')
    Image.fromarray(a, 'RGBA').save(old)
    others = {k: v for k, v in old_sets_imgs(JOBS[i]['bar']).items() if k != i}
    w = max((round(iou(grow, mask(v)), 3), k) for k, v in others.items())
    print(i, '填滿率', round(grow.sum() / 1024, 3), '色數', len({tuple(p) for p in a[grow][:, :3]}), '導引圖對同欄集最大 IoU', w,
          '（生成圖對導引圖 IoU 約 0.9，導引圖先壓在 0.55 以下再送）')


def old_sets_imgs(bar):
    """預檢用：同欄集舊圖（扣掉被取代的）＋ r5d 已過的新圖"""
    import json
    st = json.loads((EV / 'r5d_state.json').read_text(encoding='utf-8')) if (EV / 'r5d_state.json').exists() else {}
    o = old_sets()[bar]
    ims = {k: old_img(k) for k in o if k not in DROP[bar] and not (k in JOBS and JOBS[k]['bar'] == bar)}
    ims.update({k: Image.open(OUT / k / f'{s}.png') for k, s in st.items() if JOBS[k]['bar'] == bar})
    return ims


def sheet():
    ids = [i for i in JOBS if i in G]
    font = ImageFont.truetype('/usr/share/fonts/opentype/unifont/unifont.otf', 12)
    c = Image.new('RGBA', (len(ids) * 150 + 10, 190), (40, 37, 33, 255))
    d = ImageDraw.Draw(c)
    d.text((6, 4), 'R5d 上色導引圖（init_image，32×32，4 倍＋1 倍）', fill=(230, 220, 200, 255), font=font)
    for n, i in enumerate(ids):
        im = Image.open(GD / f'{i}.png')
        x = 10 + n * 150
        c.paste(im.resize((128, 128), Image.NEAREST), (x, 24), im.resize((128, 128), Image.NEAREST))
        c.paste(im, (x, 156), im)
        d.text((x + 40, 160), i, fill=(230, 220, 200, 255), font=font)
    c.save(EV / 'r5d_guide_sheet.png')


if __name__ == '__main__':
    if sys.argv[1] == 'sheet':
        sheet()
    else:
        for i in sys.argv[1].split(','):
            draw(i)
        sheet()
