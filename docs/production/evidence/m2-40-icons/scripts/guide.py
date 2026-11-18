import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from r5 import *
# 導引圖：造型 --tx-dim 實心，外加 1 px --scene-void 描邊，其餘透明（§2.1）
def save(i, fill):
    m = np.zeros((32, 32), bool)
    for y in range(32):
        for x in range(32):
            m[y, x] = fill(x, y)
    pad = np.pad(m, 1)
    grow = m.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            grow |= pad[1 + dy:33 + dy, 1 + dx:33 + dx]
    a = np.zeros((32, 32, 4), np.uint8)
    a[grow] = P.hexrgb(TOK['--scene-void']) + [255]
    a[m] = P.hexrgb(TOK['--tx-dim']) + [255]
    (RAW / 'guide').mkdir(parents=True, exist_ok=True)
    Image.fromarray(a, 'RGBA').save(RAW / 'guide' / f'{i}.png')
import math
def ring_fire(x, y):
    r, a = math.hypot(x - 15.5, y - 15.5), math.degrees(math.atan2(y - 15.5, x - 15.5)) % 60
    return 6.5 <= r <= 9.5 or (9.5 < r <= 14 and abs(a - 30) <= 12 * (14 - r) / 4.5)
def plate(x, y):
    a = 4 <= x + 1 <= 21 and 8 <= y - 2 <= 25 and (y - 2) > (x + 1) + 2  # 左下片：往左下錯開
    b = 4 <= x - 2 <= 21 and 8 <= y + 2 <= 25 and (y + 2) < (x - 2) - 2  # 右上片：往右上錯開
    return a or b or abs(x - 27) + abs(y - 4) <= 2
G = {
 'sk_ironaura': lambda x, y: (3 <= x <= 19 and 6 <= y <= 27 and not (x - 12 > y - 6)) or (abs(x + y - 31) <= 1 and 14 <= x <= 28),
 'sk_weaken': plate,
 'sk_fireburst': ring_fire,
 'sk_deadeye': lambda x, y: (3 <= x <= 14 and 15 <= y <= 26) or abs(x - 22) + abs(y - 11) <= 7,
}
for i in sys.argv[1].split(','):
    save(i, G[i])
