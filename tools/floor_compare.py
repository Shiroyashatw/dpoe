"""dpoe-battle-mockup-1126：S-F 地板對參照裁切（procedural-floor-impl.md §3）。
python3 tools/floor_compare.py <S-F 截圖> <參照 floor-384x256.png> <輸出資料夾> <格起點 x> <格起點 y>
參照避開右 64 px（掉落牌）只用左 320×256；實機從格線對齊的點裁同樣 320×256。輸出並排圖與 floor-compare.json。"""
import json, sys
import numpy as np
from PIL import Image

shot, ref, out, gx, gy = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5])


def lab(a):
    a = a.astype(float) / 255
    a = np.where(a > 0.04045, ((a + 0.055) / 1.055) ** 2.4, a / 12.92)
    M = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.072175], [0.0193339, 0.119192, 0.9503041]])
    xyz = a @ M.T / np.array([0.95047, 1, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def stats(a, cell, x0=0, y0=0):
    L = lab(a)
    C = np.hypot(L[..., 1], L[..., 2])
    cells = []
    y = y0
    while y + cell <= a.shape[0] + 0.5:
        x = x0
        while x + cell <= a.shape[1] + 0.5:
            cells.append(float(L[int(round(y)) + 4 : int(round(y + cell)) - 4, int(round(x)) + 4 : int(round(x + cell)) - 4, 0].mean()))
            x += cell
        y += cell
    cells = np.array(cells)
    return {
        'L_median': round(float(np.median(L[..., 0])), 2),
        'C_median': round(float(np.median(C)), 2),
        'C_gt40_share': round(float((C > 40).mean()), 4),
        'cells': len(cells),
        'cell_L_min': round(float(cells.min()), 2),
        'cell_L_max': round(float(cells.max()), 2),
        'cell_L_range': round(float(cells.max() - cells.min()), 2),
        'light_cells_over_32.05': int((cells > 32.046).sum()),
    }


R = np.asarray(Image.open(ref).convert('RGB'))[:, :320]
S = np.asarray(Image.open(shot).convert('RGB'))
x, y = int(round(gx)), int(round(gy))
Sc = S[y : y + 256, x : x + 320]
res = {'ref_box': [0, 0, 320, 256], 'shot_box': [x, y, x + 320, y + 256], 'ref': stats(R, 64), 'shot': stats(Sc, 64.8, gx - x, gy - y)}
im = Image.new('RGB', (320 * 2 + 8, 256), (0, 0, 0))
im.paste(Image.fromarray(R), (0, 0))
im.paste(Image.fromarray(Sc), (328, 0))
im.save(f'{out}/S-F-floor-compare-ref-vs-shot.png')
json.dump(res, open(f'{out}/floor-compare.json', 'w'), ensure_ascii=False, indent=2)
print(json.dumps(res, ensure_ascii=False))
