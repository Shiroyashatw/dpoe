#!/usr/bin/env python3
"""M2-39 狀態圖示手修／手繪（0 次 PixelLab）：字母格 txt → PNG，加 §5 檢查與 4 倍彩＋灰階對照。

字母照 specs/M2-39-status-icons.md §5（`.` 透明、`v` --scene-void …）。原始檔放
art/icons/ailment/ail_<id>_<16|32>/ail_<id>_<size>-hand.txt，同名 .png 由這支產生。

    python3 tools/ailment_hand.py dump art/icons/ailment/ail_sap_32/ail_sap_32-s3903.png   # PNG → 字母格（起稿用）
    python3 tools/ailment_hand.py dump X.png --half                                     # 先最近鄰縮一半
    python3 tools/ailment_hand.py build    # 全部 -hand.txt → PNG＋檢查（追加 asset_check.csv）＋對照圖
"""
import csv, pathlib, sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from ailment_icons import EV, OUT, ROOT, cell, check, gray, jobs, sheet  # noqa: E402
from pixellab_batch import hexrgb, tokens  # noqa: E402

LETTER = {'v': '--scene-void', 'i': '--panel-inset', 'p': '--panel', 'n': '--border', 'm': '--border-mid', 'c': '--border-cap',
          'w': '--tx-strong', 't': '--tx-dim', 'k': '--el-fire', 'e': '--hp', 'd': '--bad', 'f': '--el-cold', 'u': '--mp',
          'l': '--el-light', 'h': '--el-chaos', 'q': '--awk', 'g': '--good', 'a': '--asc', 'o': '--warn'}


def rgb(ch):
    return tuple(hexrgb(tokens()[LETTER[ch]]))


def dump(f, half=False):
    im = Image.open(f).convert('RGBA')
    if half:
        im = im.resize((im.width // 2, im.height // 2), Image.NEAREST)
    back = {rgb(ch): ch for ch in LETTER}
    a = np.asarray(im)
    print('\n'.join(''.join('.' if p[3] == 0 else back.get(tuple(p[:3]), '?') for p in row) for row in a))


def render(txt):
    rows = [r for r in txt.read_text(encoding='utf-8').splitlines() if r]
    a = np.zeros((len(rows), len(rows[0]), 4), np.uint8)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                a[y, x] = (*rgb(ch), 255)
    return Image.fromarray(a, 'RGBA'), sorted({LETTER[ch] for r in rows for ch in r if ch != '.'})


REGEN = ['ail_riven_32/ail_riven_32-s3941.png', 'ail_vine_32/ail_vine_32-s3942.png', 'ail_cb_32/ail_cb_32-s3943.png']  # picks §2 重生過關的 32（檢查在 ailment_icons.py）


def build():
    js = {j['id']: j for j in jobs()}
    rows, cells, grays = [], [], {32: [], 16: []}
    for f in REGEN:
        im = Image.open(OUT / f).convert('RGBA')
        cells.append((f'{f.split("/")[0][4:-3]} 32 重生', cell(im), True))
        grays[32].append((f.split('/')[0][4:-3], gray(im).resize((128, 128), Image.NEAREST), True))
    for txt in sorted(OUT.glob('*/*-hand.txt')):
        jid, size = txt.parent.name[4:].rsplit('_', 1)
        size = int(size)
        im, used = render(txt)
        im.save(txt.with_suffix('.png'))
        job = dict(js[jid], palette=list(dict.fromkeys(js[jid]['palette'] + used)))  # 檢查用：工作表色＋手修加的 token
        row, why = check(job, size, im, im)
        row.update(file=str(txt.with_suffix('.png').relative_to(ROOT)), id=jid, fix='手修／手繪（0 次）',
                   result='不過' if why else '過', reason='；'.join(why))
        rows.append(row)
        cells.append((f'{jid} {size}', cell(im), not why))
        grays[size].append((jid, gray(im).resize((size * 4, size * 4), Image.NEAREST), not why))
        print(f'{txt.parent.name}: {row["result"]} {row["reason"]}  雜點 {row["isolated_pct"]}% 棋盤 {row["checker"]}')
    sheet('M2-39 手修／手繪（0 次）：每枚 上彩 4 倍＋1 倍／下灰階 4 倍＋1 倍', cells, 8).save(EV / 'hand_compare.png')
    for size in (32, 16):
        if grays[size]:
            sheet(f'M2-39 手修／手繪 {size} 灰階並排（4 倍）', grays[size], 10).save(EV / f'hand_{size}_gray.png')
    f = EV / 'asset_check.csv'
    old = [r for r in csv.DictReader(open(f, encoding='utf-8')) if '-hand.png' not in r['file']]
    cols = list(old[0].keys())
    with open(f, 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, cols, extrasaction='ignore')
        w.writeheader()
        w.writerows(old + rows)


if __name__ == '__main__':
    if sys.argv[1] == 'dump':
        dump(sys.argv[2], '--half' in sys.argv)
    else:
        build()
