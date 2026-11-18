#!/usr/bin/env python3
"""tools/wy16_fix.py 的圖示棋盤（§6）測試：python3 tools/wy16_fix_test.py"""
import pathlib, sys
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from wy16_fix import RAW, ICON, GUIXU, paint, checker

a, b = (255, 0, 0, 255), (0, 0, 255, 255)
t = Image.new('RGBA', (2, 2))
t.putdata([a, b, b, a])
assert checker(t) == 1, '一格 a b／b a'
t.putdata([a, b, b, (0, 0, 0, 0)])
assert checker(t) == 0, '有透明不算'
t.putdata([a, a, b, b])
assert checker(t) == 0, '同色相鄰不算'
assert checker(Image.open(RAW / 'wangyin_guixu_16/post/wangyin_guixu_16-s2166.png')) == 17 > 6, 's2166 應超過門檻（§6 寫 17）'
assert checker(Image.open(ICON / 'wangyin_guixu/wangyin_guixu_32-s2162.png')) == 20, '32 s2162（§6 寫 20）'
assert checker(paint(GUIXU.split())) <= 6, '歸墟手修版 ≤ 6'
for k in ('zhenyue', 'chixiao', 'jiting', 'guixu'):
    d = ICON / f'wangyin_{k}'
    f = next(n for n in (d / 'picked.txt').read_text().split() if '_16-' in n)
    assert checker(Image.open(d / f)) <= 6, f
print('wy16_fix_test ok')
