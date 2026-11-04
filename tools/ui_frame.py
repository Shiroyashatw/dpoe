"""鑄鐵銀框的九宮格素材：python tools/ui_frame.py → img/ui/frame.png（48×48，切片 16，CSS 用 border-image）。"""
import os
from PIL import Image

N = 48
BLACK, DARK, IRON, STEEL, SILVER = [(*c, 255) for c in ((12, 13, 15), (46, 49, 55), (74, 78, 87), (130, 135, 146), (205, 209, 217))]
im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
p = im.load()
for y in range(N):
    for x in range(N):
        d = min(x, y, N - 1 - x, N - 1 - y)
        lit = min(x, y) <= min(N - 1 - x, N - 1 - y)  # 上、左亮，下、右暗
        ring = {0: BLACK, 1: IRON if lit else DARK, 2: STEEL if lit else IRON, 3: SILVER}.get(d)
        if ring:
            p[x, y] = ring
out = os.path.join(os.path.dirname(__file__), '..', 'img', 'ui')
os.makedirs(out, exist_ok=True)
im.save(os.path.join(out, 'frame.png'))
assert im.getpixel((0, 24))[3] == 255 and im.getpixel((24, 24))[3] == 0  # 邊有框、中間透明
