#!/usr/bin/env python3
"""M2-39 第 3／4 輪手修（0 次 PixelLab）：art/icons/ailment/*/ail_<id>_<size>-r3.txt → -r3.png，
跑 tools/ailment_icons.py 的 §5 check，產出 r3_compare.png、r3_{32,16}_gray.png、r3_1x.png，
並把 -r3.png 的列寫進 asset_check.csv（重跑會先刪舊的 -r3 列）。字母同 tools/ailment_hand.py，多一個 r＝--rar-magic（chg_p）。

    python3 docs/production/evidence/m2-39/r3_hand.py [r4]   # 預設 r3；r4＝第 4 輪（calm 改形）；r5 起 compare 每枚前面加 picked.txt 的前一版
"""
import csv, pathlib, sys
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'tools'))
from ailment_icons import BG, EV, OUT, cell, check, gray, jobs, sheet  # noqa: E402
from ailment_hand import LETTER  # noqa: E402
from pixellab_batch import hexrgb, tokens  # noqa: E402

LETTER = dict(LETTER, r='--rar-magic')
R = sys.argv[1] if len(sys.argv) > 1 else 'r3'
N = R[1:]


def render(txt):
    rows = [r for r in txt.read_text(encoding='utf-8').splitlines() if r]
    a = np.zeros((len(rows), len(rows[0]), 4), np.uint8)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                a[y, x] = (*hexrgb(tokens()[LETTER[ch]]), 255)
    return Image.fromarray(a, 'RGBA'), sorted({LETTER[ch] for r in rows for ch in r if ch != '.'})


def main():
    js = {j['id']: j for j in jobs()}
    pick = {pathlib.Path(l.split('\t')[1]).parent.name: ROOT / l.split('\t')[1].strip() for l in open(ROOT / 'docs/production/specs/M2-39-previews/picked.txt', encoding='utf-8') if '\t' in l}
    rows, cells, grays, ones = [], [], {32: [], 16: []}, {32: [], 16: []}
    for txt in sorted(OUT.glob(f'*/*-{R}.txt')):
        jid, size = txt.parent.name[4:].rsplit('_', 1)
        size = int(size)
        im, used = render(txt)
        png = txt.with_suffix('.png')
        im.save(png)
        base = js.get(jid) or js['ad']  # ad_cold、ad_light 是 ad 換色，沿用 ad 的工作表
        job = dict(base, id=jid, palette=list(dict.fromkeys(base['palette'] + used)))
        row, why = check(job, size, im, im)
        if size == 32 and row.get('margin_note'):
            why.append('32 外圈 1 px 不透明（第 3 輪起要求留邊）')
        row.update(file=str(png.relative_to(ROOT)), id=jid, fix=f'第 {N} 輪手修（0 次）', result='不過' if why else '過', reason='；'.join(why))
        rows.append(row)
        if int(N) >= 5 and txt.parent.name in pick:
            cells.append((f'{jid} {size} 前版', cell(Image.open(pick[txt.parent.name]).convert('RGBA')), True))
        cells.append((f'{jid} {size}', cell(im), not why))
        grays[size].append((jid, gray(im).resize((size * 4, size * 4), Image.NEAREST), not why))
        ones[size].append((jid, im, not why))
        print(f'{jid} {size}: {row["result"]} {row["reason"]}  不透明 {row["opaque_pct"]}% 雜點 {row["isolated_pct"]}% 棋盤 {row["checker"]}')
    sheet(f'M2-39 第 {N} 輪手修（0 次）：每枚 上彩 4 倍＋1 倍／下灰階 4 倍＋1 倍', cells, 7).save(EV / f'{R}_compare.png')
    for size in (32, 16):
        sheet(f'M2-39 第 {N} 輪 {size} 灰階並排（4 倍）', grays[size], 7).save(EV / f'{R}_{size}_gray.png')
        sheet(f'M2-39 第 {N} 輪 {size} 1 倍', ones[size], 11).save(EV / f'{R}_{size}_1x.png')
    f = EV / 'asset_check.csv'
    old = [r for r in csv.DictReader(open(f, encoding='utf-8')) if f'-{R}.png' not in r['file']]
    with open(f, 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, list(old[0].keys()), extrasaction='ignore')
        w.writeheader()
        w.writerows(old + rows)


if __name__ == '__main__':
    main()
