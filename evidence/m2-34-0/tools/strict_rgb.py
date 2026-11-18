"""嚴格 RGB 比對：python3 strict_rgb.py <輸出資料夾>
compare.py 先轉灰階再數像素，單一通道差 1 可能算成 0 px；這裡直接比 RGB 三個通道，任何一個通道不同就算一個像素。
同一張畫面：改動前 N 次 × 分支 N 次兩兩比，取最小差異像素數，0＝至少有一對 RGB 完全相同。"""
import sys, os, glob, itertools
import numpy as np
from PIL import Image
D = sys.argv[1]
base = sorted(glob.glob(os.path.join(D, 'base*/'))); head = sorted(glob.glob(os.path.join(D, 'head*/')))
L = {}
def ld(p):
    if p not in L: L[p] = np.asarray(Image.open(p).convert('RGB')).astype(np.int16)
    return L[p]
def diff(a, b):
    A, B = ld(a), ld(b)
    if A.shape != B.shape: return (10 ** 9, 255)
    d = np.abs(A - B)
    return (int((d.max(axis=2) > 0).sum()), int(d.max()))
rows = []; bad = 0
for size in ('portrait', 'desktop', '3a', 'fix'):
    names = sorted(os.path.basename(p) for p in glob.glob(os.path.join(base[0], size, '*.png')))
    for n in names:
        pairs = [diff(os.path.join(a, size, n), os.path.join(b, size, n)) for a, b in itertools.product(base, head)
                 if os.path.exists(os.path.join(a, size, n)) and os.path.exists(os.path.join(b, size, n))]
        best = min(pairs) if pairs else (None, None)
        bad += best[0] != 0
        rows.append((size, n[:-4], best[0], best[1], len(pairs)))
        L.clear()
print('| 組 | 畫面 | RGB 最小差異（像素） | 該對最大通道差 | 比了幾對 | 結果 |')
print('| --- | --- | --- | --- | --- | --- |')
for s, n, b, mx, k in rows:
    print('| %s | %s | %s | %s | %s | %s |' % (s, n, b, mx, k, '✅ 相同' if b == 0 else '❌ 不同'))
print('\n嚴格 RGB：相同 %d／%d，不同 %d' % (len(rows) - bad, len(rows), bad))
