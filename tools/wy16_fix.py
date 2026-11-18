#!/usr/bin/env python3
"""M2-36 王印 16 手修（dpoe-m2-36-wy16-fix）：不呼叫 PixelLab，可重現。

    python3 tools/wy16_fix.py        # 產出 art/_raw/ 中間檔、art/icons/wangyin/ 定稿、evidence/dpoe-m2-36-wy16-fix2/
    python3 tools/art_pick.py        # 再重拼 img/ic_wy16

- 赤霄：32 的 s2141（alpha_binary 後）最近鄰縮成 16 → 量化回該圖自己的色票 → 照 CHIXIAO 逐像素清理
  （牌面外框一圈實心 --scene-void、內圈 --border 銅框、中央劍身 2 px、上緣小圓環、沒有孤立像素）。
- 歸墟：s2166 不採用（Art Director：尖屋頂形、沒有圓環、右半棋盤抖色）。外框、圓環、牌面沿用赤霄 16-fix 同一批像素，
  只換牌面 8×7 紋樣（x 4–11、y 6–12）成提示詞表 §3 的漩渦（GUIXU，字母照 §3 小寫：v m c b i o h），顏色只用赤霄這 7 色。
- 都量提示詞檔 §6 的圖示檢查（色票、alpha、材質雜點 ≤3%、王印飽和 ≤35%、圖示棋盤 16 px ≤6），不過就不寫定稿。
- 四枚 16 px 定稿（picked.txt）都量一次寫進 csv，另出原尺寸／4× 與灰階並排圖。
"""
import csv, pathlib
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW, ICON, EV = ROOT / 'art/_raw', ROOT / 'art/icons/wangyin', ROOT / 'evidence/dpoe-m2-36-wy16-fix2'
# §6 材質類別：暗 --scene-void、--panel-inset、--rar-chase-bg；銅 --border、--border-mid、--border-cap；亮 --rar-chase、-hi、紋樣色
TOK = {'V': '#0d0a07', 'I': '#24211e', 'B': '#251c13', 'G': '#554f48', 'M': '#a38e6b', 'C': '#e3d6bb', 'O': '#f69625', 'H': '#ffbf73',
       'F': '#ee9978', 'U': '#83aaf2'}
CLS = {'V': 0, 'I': 0, 'B': 0, 'G': 1, 'M': 1, 'C': 1, 'O': 2, 'H': 2, 'F': 2, 'U': 2}
rgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
KEY = {rgb(v): k for k, v in TOK.items()}

# 赤霄 16 清理後（. 透明）：上緣圓環、外框一圈 V、內圈 G 銅框（四角 C 鉚釘）、牌面 I 底、C 劍身 2 px、M 護手與劍柄、兩側 O／H 火焰往上燒
CHIXIAO = """
................
......VVVV......
.....VMCMMV.....
.....VM..GV.....
..VVVVVMGVVVVV..
..VCGGGGGGGGCV..
..VGIIICCIIIGV..
..VGIOICCIOIGV..
..VGOOICCIOOGV..
..VGOHOCCOHOGV..
..VGIOMMMMOIGV..
..VGIIIMMIIIGV..
..VGIIIMMIIIGV..
..VCGGGGGGGGCV..
..VVVVVVVVVVVV..
................
"""
# 歸墟 16 手修：提示詞表 §3 的像素圖原樣（小寫字母 → 上面的 token 鍵：b=--border=G）
GUIXU = """
................
......vvvv......
.....vmcmmv.....
.....vm..bv.....
..vvvvvmbvvvvv..
..vcbbbbbbbbcv..
..vbioooooiibv..
..vboiiiiioibv..
..vboihhhioibv..
..vboihiiioibv..
..vboiiiioiibv..
..vbiooooiiibv..
..vbiiiiiiiibv..
..vcbbbbbbbbcv..
..vvvvvvvvvvvv..
................
""".translate(str.maketrans('vmcbioh', 'VMCGIOH'))
WY = ('zhenyue', 'chixiao', 'jiting', 'guixu')


def grid(img):
    a = np.asarray(img.convert('RGBA'))
    return [''.join(KEY[tuple(p[:3])] if p[3] else '.' for p in row) for row in a]


def paint(rows):
    a = np.zeros((len(rows), len(rows[0]), 4), np.uint8)
    for y, r in enumerate(rows):
        for x, k in enumerate(r):
            if k != '.':
                a[y, x] = rgb(TOK[k]) + (255,)
    return Image.fromarray(a, 'RGBA')


def lab(c):
    c = np.asarray(c, float) / 255
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[0.4124, 0.2126, 0.0193], [0.3576, 0.7152, 0.1192], [0.1805, 0.0722, 0.9505]]) / [0.95047, 1.0, 1.08883]
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def quantize(img, pal):
    """不透明像素換成 pal（該圖自己的色）裡 Lab 最近的色；alpha 0／255"""
    a = np.asarray(img.convert('RGBA')).copy()
    on = a[..., 3] >= 128
    P = np.array([rgb(TOK[k]) for k in pal])
    d = np.linalg.norm(lab(a[..., :3])[..., None, :] - lab(P), axis=-1)
    a[..., :3] = np.where(on[..., None], P[d.argmin(-1)], 0)
    a[..., 3] = np.where(on, 255, 0)
    return Image.fromarray(a, 'RGBA')


def check(img):
    """§6 圖示：色票（100% token 色）、alpha 只有 0／255、材質雜點（8 鄰沒有同類）≤3%、C*>40 ≤35%"""
    a = np.asarray(img.convert('RGBA'))
    g = grid(img)
    op = a[..., 3] > 0
    c = np.array([[CLS.get(k, -1) for k in r] for r in g])
    p = np.pad(c, 1, constant_values=-1)
    nb = np.stack([p[1 + dy:1 + dy + 16, 1 + dx:1 + dx + 16] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx])
    iso = (nb != c).all(0) & op
    L = lab(a[..., :3][op])
    row = {'opaque': int(op.sum()), 'palette_pct': 100.0, 'alpha_ok': bool(np.isin(a[..., 3], (0, 255)).all()),
           'upscaled': bool((a[::2, ::2].repeat(2, 0).repeat(2, 1) == a).all()),
           'isolated_px': int(iso.sum()), 'isolated_pct': round(float(100 * iso.sum() / op.sum()), 2),
           'sat_pct': round(float(100 * (np.hypot(L[:, 1], L[:, 2]) > 40).mean()), 2),
           'colors': ' '.join(sorted({k for r in g for k in r if k != '.'}, key='VIBGMCOHFU'.index))}
    row['checker'] = checker(img)
    row['pass'] = row['alpha_ok'] and not row['upscaled'] and row['isolated_pct'] <= 3 and row['sat_pct'] <= 35 and row['checker'] <= 6
    return row, [(x, y) for y, x in zip(*np.nonzero(iso))]


def checker(img):
    """§6 圖示棋盤：不透明的 2×2 是「a b／b a」交錯兩色（a≠b）的格數"""
    a = np.asarray(img.convert('RGBA')).astype(np.int64)
    k = (a[..., 0] << 16) | (a[..., 1] << 8) | a[..., 2]
    op = a[..., 3] > 0
    tl, tr, bl, br = k[:-1, :-1], k[:-1, 1:], k[1:, :-1], k[1:, 1:]
    on = op[:-1, :-1] & op[:-1, 1:] & op[1:, :-1] & op[1:, 1:]
    return int((on & (tl == br) & (tr == bl) & (tl != tr)).sum())


def zoom(im, z=4):
    return im.resize((im.width * z, im.height * z), Image.NEAREST)


def main():
    EV.mkdir(parents=True, exist_ok=True)
    rows = []
    # 赤霄
    d = RAW / 'wangyin_chixiao_16_fix'
    d.mkdir(exist_ok=True)
    src = Image.open(RAW / 'wangyin_chixiao_32/post/wangyin_chixiao_32-s2141.png').convert('RGBA')
    nn = src.resize((16, 16), Image.NEAREST)
    nn.save(d / '1-nn16.png')
    pal = sorted({k for r in grid(src) for k in r if k != '.'}, key='VIBGMCOHFU'.index)
    q = quantize(nn, pal)
    q.save(d / '2-quant.png')
    want = CHIXIAO.split()
    assert set(''.join(want)) - {'.'} <= set(pal), '清理只能用 s2141 自己的色'
    out = paint(want)
    out.save(d / '3-clean.png')
    changed = sum(a != b for ra, rb in zip(grid(q), want) for a, b in zip(ra, rb))
    r, iso = check(out)
    rows.append({'file': 'wangyin_chixiao_16-fix', 'from': '32 s2141 最近鄰→量化→清理', 'changed_from_nn': changed, **r})
    for name, im in (('wangyin_chixiao_16-s2154（舊暫用）', Image.open(RAW / "wangyin_chixiao_16/post/wangyin_chixiao_16-s2154.png")), ('wangyin_chixiao_16 nn+quant', q)):
        rr, _ = check(im)
        rows.append({'file': name, 'from': '對照', 'changed_from_nn': '', **rr})
    if r['pass']:
        out.save(ICON / 'wangyin_chixiao/wangyin_chixiao_16-fix.png')
    print('赤霄', '過' if r['pass'] else '不過', r, '孤立', iso, '改了', changed, '格')
    # 歸墟：外框沿用赤霄，只換牌面 8×7
    g = GUIXU.split()
    box = lambda x, y: 4 <= x <= 11 and 6 <= y <= 12
    assert all(g[y][x] == want[y][x] for y in range(16) for x in range(16) if not box(x, y)), '歸墟外框要跟赤霄 16-fix 同一批像素'
    assert set(''.join(g)) <= set(''.join(want)), '歸墟只能用赤霄 16 已有的色'
    g0 = Image.open(RAW / 'wangyin_guixu_16/post/wangyin_guixu_16-s2166.png').convert('RGBA')
    gd = RAW / 'wangyin_guixu_16_fix'
    gd.mkdir(exist_ok=True)
    g1 = paint(g)
    g1.save(gd / 'guixu16-fix.png')
    r1, iso1 = check(g1)
    rows.append({'file': 'wangyin_guixu_16-fix', 'from': '赤霄 16-fix 外框＋§3 漩渦', 'changed_from_nn': sum(box(x, y) and g[y][x] != want[y][x] for y in range(16) for x in range(16)), **r1})
    rg, _ = check(g0)
    rows.append({'file': 'wangyin_guixu_16-s2166（舊，不採用）', 'from': '對照', 'changed_from_nn': '', **rg})
    if r1['pass']:
        g1.save(ICON / 'wangyin_guixu/wangyin_guixu_16-fix.png')
    print('歸墟', '過' if r1['pass'] else '不過', r1, '孤立', iso1)
    # 四枚定稿（picked.txt）都量
    for k in WY:
        f = next(n for n in (ICON / f'wangyin_{k}/picked.txt').read_text().split() if '_16-' in n)
        rr, _ = check(Image.open(ICON / f'wangyin_{k}' / f))
        rows.append({'file': f + '（定稿）', 'from': 'picked.txt', 'changed_from_nn': '', **rr})
    with open(EV / 'wy16_check.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, rows[0].keys())
        w.writeheader()
        w.writerows(rows)
    # 原尺寸、4×
    for n, im in (('chixiao16', out), ('chixiao16-nn', q), ('chixiao16-s2154-old', Image.open(RAW / "wangyin_chixiao_16/post/wangyin_chixiao_16-s2154.png")), ('guixu16-s2166', g0), ('guixu16', g1)):
        im.save(EV / f'{n}.png')
        zoom(im.convert('RGBA')).save(EV / f'{n}-4x.png')
    # 四枚定稿（picked.txt）並排 4×，下排轉灰階（§6 目視：灰階分得出）
    s = Image.new('RGBA', (4 * 17 - 1, 33), (36, 33, 30, 255))
    for i, k in enumerate(WY):
        f = next(n for n in (ICON / f'wangyin_{k}/picked.txt').read_text().split() if '_16-' in n)
        im = Image.open(ICON / f'wangyin_{k}' / f).convert('RGBA')
        s.alpha_composite(im, (i * 17, 0))
        s.alpha_composite(im.convert('LA').convert('RGBA'), (i * 17, 17))
    zoom(s).save(EV / 'wy16-four-4x.png')
    gray = s.crop((0, 17, s.width, 33))
    gray.save(EV / 'wy16-four-gray.png')
    zoom(gray).save(EV / 'wy16-four-gray-4x.png')


if __name__ == '__main__':
    main()
