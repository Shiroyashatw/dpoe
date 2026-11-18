"""run_all.sh 的結果做逐張像素比對：python3 compare.py <輸出資料夾> [差異圖資料夾]
同一張畫面：改動前 N 次 × 分支 N 次兩兩比對，取最小的差異像素數（0＝至少有一對逐像素相同）；
另列改動前自己跟自己比的雜訊（同一份程式跑兩次的差）。印出 markdown 表。"""
import sys, os, glob, itertools
from PIL import Image, ImageChops
D = sys.argv[1]; OUT = sys.argv[2] if len(sys.argv) > 2 else None
base = sorted(glob.glob(os.path.join(D, 'base*/'))); head = sorted(glob.glob(os.path.join(D, 'head*/')))
def diff(a, b):
    A = Image.open(a).convert('RGB'); B = Image.open(b).convert('RGB')
    if A.size != B.size: return (10 ** 9, 255, None)
    d = ImageChops.difference(A, B); bb = d.getbbox()
    if not bb: return (0, 0, None)
    m = d.convert('L').point(lambda v: 255 if v else 0)
    return (m.histogram()[255], max(x[1] for x in d.getextrema()), d)
rows = []; bad = 0
for size in ('portrait', 'desktop', '3a', 'fix', 'camp'):
    names = sorted(os.path.basename(p) for p in glob.glob(os.path.join(base[0], size, '*.png')))
    for n in names:
        ok = lambda d: os.path.exists(os.path.join(d, size, n))
        pairs = [diff(os.path.join(a, size, n), os.path.join(b, size, n)) for a, b in itertools.product(base, head) if ok(a) and ok(b)]
        noise = [diff(os.path.join(a, size, n), os.path.join(b, size, n))[0] for a, b in itertools.combinations(base, 2) if ok(a) and ok(b)]
        best = min(pairs, key=lambda x: x[0]) if pairs else (None, None, None)
        if best[0] != 0:
            bad += 1
            if OUT and best[2] is not None:
                os.makedirs(os.path.join(OUT, size), exist_ok=True); best[2].point(lambda v: 255 if v else 0).save(os.path.join(OUT, size, n))
        rows.append((size, n[:-4], best[0], best[1], max(p[0] for p in pairs) if pairs else '', max(noise) if noise else ''))
print('| 尺寸 | 畫面 | 改動前×分支 最小差異（像素） | 最大通道差 | 兩兩比對最大差異 | 改動前自己比的雜訊（最大） | 結果 |')
print('| --- | --- | --- | --- | --- | --- | --- |')
for s, n, b, mx, worst, nz in rows:
    print('| %s | %s | %s | %s | %s | %s | %s |' % ({'portrait': '直立 390×844', 'desktop': '桌機 1280×720', '3a': '3a 素材', 'fix': '#72／#75', 'camp': '#85 營地'}[s], n, b, mx, worst, nz, '✅ 相同' if b == 0 else '❌ 不同'))
print('\n相同 %d／%d，不同 %d' % (len(rows) - bad, len(rows), bad))
