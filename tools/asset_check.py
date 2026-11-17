#!/usr/bin/env python3
"""M2-36 收圖檢查（提示詞檔 §6）：每張一列 csv，過關的放正式目錄，不過的放 art/_rejected/，每個 job 拼一張接觸表。

用法（在 dpoe/ 底下，先跑過 pixellab_batch.py／vfx_gen.py）：
    python3 tools/asset_check.py              # 地磚、王印（art/_raw/）＋特效（art/fx/sig_*）
- csv 與接觸表放 evidence/dpoe-m2-36-assets/。
- 地板只把過關的前 3 張放正式目錄，其餘過關的放 _rejected（理由寫「超過前 3 張」）。
- 特效：art/fx/<id>/ 是最新一次、old/<時間>/ 是前幾次；不過的整次搬到 art/_rejected/fx/<id>/。
- 特效的畫面比例假設 1 材質像素 = 1.5 世界 px（同地磚），× ZOOM（桌機 1.35、390 直立 0.8125）。
"""
import csv, json, pathlib, re, shutil, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from pixellab_batch import RAW, ROOT, de2000, hexrgb, jobs, lab, lum, nearest, post_names  # noqa: E402

EV = ROOT / 'evidence/dpoe-m2-36-assets'
REJ = ROOT / 'art/_rejected'
FX = ROOT / 'art/fx'
FONT = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 12)
GROUND_BG = (36, 33, 30)  # --panel-inset，接觸表底色
SCREENS = {'1280x720': (1280 * 720, 1.5 * 1.35), '390x844': (390 * 844, 1.5 * 0.8125)}
COLS = ['file', 'job', 'kind', 'size', 'de_gt3_pct', 'de_max', 'post_palette_pct', 'grid_2x2_pct', 'alpha_ok', 'isolated_pct',
        'floor_lum_ratio', 'mid_pct', 'light_pct', 'seam_ratio', 'sat_pct', 'fx_opaque_pct', 'fx_sat_pct', 'fx_sat8_s', 'fx_dark_pct', 'result', 'reason']


def kind(jid):
    return 'icon' if jid.startswith('wangyin') else jid.rsplit('_', 1)[1]


def light_token(job, js):
    """地板的工作表沒有 -light，用同地形牆頂 palette 的第 4 色"""
    biome = job['id'].split('_')[1]
    return next(j for j in js if j['id'] == f'tile_{biome}_walltop')['palette'][3]


def isolated(idx, wrap):
    if wrap:
        nb = np.stack([np.roll(idx, s, a) for s, a in ((1, 0), (-1, 0), (1, 1), (-1, 1))])
    else:
        p = np.pad(idx, 1, constant_values=-1)
        nb = np.stack([p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]])
    return (nb != idx).all(0)


def seam(rgb, vertical):
    a = rgb.astype(float)
    d = lambda x, y: np.linalg.norm(x - y, axis=-1).mean()
    inner = [np.linalg.norm(a[:, 1:] - a[:, :-1], axis=-1).ravel()]
    edges = [d(a[:, -1], a[:, 0])]
    if vertical:
        inner.append(np.linalg.norm(a[1:] - a[:-1], axis=-1).ravel())
        edges.append(d(a[-1], a[0]))
    m = np.concatenate(inner).mean()
    return max(edges) / m if m else (0.0 if max(edges) == 0 else 99.0)


def check(job, js, raw, img, part):
    """raw：API 原圖；img：後處理後；part：wallface 切半時取原圖的哪一半"""
    k, pal = kind(job['id']), job['palette']
    row, why = {'kind': k}, []
    exp = (job['body']['image_size']['width'] // (2 if job['post'] == 'split_2x32' else 1), job['body']['image_size']['height'])
    row['size'] = f'{img.width}x{img.height}'
    if img.size != exp:
        why.append(f'尺寸 {row["size"]} ≠ {exp[0]}x{exp[1]}')
    r = np.asarray(raw.convert('RGBA'))
    if part is not None:
        w = r.shape[1] // 2
        r = r[:, part * w:(part + 1) * w]
    on = r[..., 3] >= 128 if k == 'icon' else np.ones(r.shape[:2], bool)
    _, d = nearest(r[..., :3][on], pal)
    row['de_gt3_pct'], row['de_max'] = round(100 * (d > 3).mean(), 2), round(float(d.max()), 2)
    if row['de_gt3_pct'] > 5 or row['de_max'] > 10:
        why.append(f'色票偏移 ΔE>3 {row["de_gt3_pct"]}%／最大 {row["de_max"]}')
    a = np.asarray(img.convert('RGBA'))
    op = a[..., 3] > 0
    P = np.array([hexrgb(c) for c in pal])
    eq = (a[..., None, :3] == P).all(-1)
    idx = np.where(eq.any(-1), eq.argmax(-1), 99)
    row['post_palette_pct'] = round(100 * (idx[op] != 99).mean(), 2)
    if row['post_palette_pct'] < 100:
        why.append(f'後處理後非色票色 {100 - row["post_palette_pct"]:.2f}%')
    h2, w2 = (r.shape[0] // 2) * 2, (r.shape[1] // 2) * 2  # 像素格看 API 原圖（後處理會把地板壓平）
    q = r[:h2, :w2].reshape(h2 // 2, 2, w2 // 2, 2, 4).transpose(0, 2, 1, 3, 4).reshape(h2 // 2, w2 // 2, 4, 4)
    uni = (q == q[:, :, :1]).all((2, 3))
    full = (q[..., 3] == 255).all(-1)
    row['grid_2x2_pct'] = round(100 * uni[full].mean(), 1) if full.any() else 0
    if row['grid_2x2_pct'] > 60:
        why.append(f'2×2 同色塊 {row["grid_2x2_pct"]}%（疑似放大過）')
    al = a[..., 3]
    row['alpha_ok'] = bool((al == 255).all()) if k != 'icon' else bool(np.isin(al, (0, 255)).all())
    if not row['alpha_ok']:
        why.append('alpha 不合（地磚要全 255、圖示只能 0／255）')
    ci = np.where(op, idx, -1) if k == 'icon' else idx
    iso = isolated(ci, k != 'icon')
    row['isolated_pct'] = round(100 * iso[op].mean(), 2)
    lim = 4 if k == 'icon' else 2
    if row['isolated_pct'] > lim:
        why.append(f'孤立像素 {row["isolated_pct"]}% > {lim}%')
    n = op.sum()
    if k == 'floor':
        lt = light_token(job, js)
        row['floor_lum_ratio'] = round(float(lum(a[..., :3][op]).mean() / lum(hexrgb(pal[1]))), 3)
        row['mid_pct'] = round(100 * (idx == 2).sum() / n, 2)
        row['light_pct'] = round(100 * (a[..., :3] == hexrgb(lt)).all(-1).sum() / n, 2)
        if row['floor_lum_ratio'] > 1.02 or row['mid_pct'] > 3 or row['light_pct'] > 0:
            why.append(f'地板太亮（亮度比 {row["floor_lum_ratio"]}、-mid {row["mid_pct"]}%、-light {row["light_pct"]}%）')
    if k in ('walltop', 'wallface'):
        row['mid_pct'], row['light_pct'] = round(100 * (idx == 2).sum() / n, 2), round(100 * (idx == 3).sum() / n, 2)
        if row['mid_pct'] + row['light_pct'] > 60 or row['light_pct'] > 15:
            why.append(f'牆太亮（-mid＋-light {row["mid_pct"] + row["light_pct"]:.1f}%、-light {row["light_pct"]}%）')
    if k != 'icon':
        row['seam_ratio'] = round(seam(a[..., :3], k != 'wallface'), 3)
        if row['seam_ratio'] > 1.2:
            why.append(f'接縫 {row["seam_ratio"]} > 1.2')
    else:
        row['sat_pct'] = round(100 * (np.hypot(*lab(a[..., :3][op])[:, 1:].T) > 40).mean(), 2)
        if row['sat_pct'] > 35:
            why.append(f'王印飽和 {row["sat_pct"]}% > 35%')
    return row, why


def fx_frames(d, res):
    sheet = next(d.glob('*.png'))
    s = np.asarray(Image.open(sheet).convert('RGBA'))
    w, h = res['canvas']['w'], res['canvas']['h']
    cols = s.shape[1] // w
    return sheet, [s[(i // cols) * h:(i // cols + 1) * h, (i % cols) * w:(i % cols + 1) * w] for i in range(res['frames'])]


def check_fx(d):
    res = json.loads((d / 'result.json').read_text(encoding='utf-8'))
    sheet, fr = fx_frames(d, res)
    row, why = {'kind': 'fx', 'size': f"{res['canvas']['w']}x{res['canvas']['h']}x{res['frames']}"}, []
    opq = [int((f[..., 3] > 0).sum()) for f in fr]
    sat = [int(((f[..., 3] > 0) & (np.hypot(*np.moveaxis(lab(f[..., :3])[..., 1:], -1, 0)) > 40)).sum()) for f in fr]
    pct = lambda c: max(c * s * s / area * 100 for area, s in SCREENS.values())
    row['fx_opaque_pct'], row['fx_sat_pct'] = round(pct(max(opq)), 2), round(pct(max(sat)), 2)
    row['fx_sat8_s'] = round(sum(pct(c) > 8 for c in sat) / res.get('fps', 20), 2)
    allpx = np.concatenate([f[f[..., 3] > 0] for f in fr]) if sum(opq) else np.zeros((0, 4))
    row['fx_dark_pct'] = round(100 * (lab(allpx[:, :3])[:, 0] < 15).mean(), 2) if len(allpx) else 0
    if row['fx_sat_pct'] > 12:
        why.append(f'飽和面積 {row["fx_sat_pct"]}% > 12%')
    if row['fx_sat8_s'] > 0.4:
        why.append(f'飽和 > 8% 持續 {row["fx_sat8_s"]} 秒 > 0.4')
    if row['fx_dark_pct'] > 5:
        why.append(f'黑邊（L*<15）{row["fx_dark_pct"]}% > 5%')
    if not opq or max(opq) == 0:
        why.append('全透明')
    return row, why, sheet, fr


def label(draw, x, y, text, ok):
    draw.text((x, y), text, font=FONT, fill=(230, 230, 230))
    draw.text((x, y + 14), '過' if ok else '不過', font=FONT, fill=(120, 210, 90) if ok else (240, 90, 80))


def sheet_tiles(jid, items):
    """items：(檔名, PIL 圖, 過不過)；地磚拼 2×2（牆面左右 3 張）放大 4 倍，圖示 4 倍＋灰階"""
    cells = []
    for name, im, ok in items:
        im = im.convert('RGBA')
        if kind(jid) in ('floor', 'walltop'):
            t = Image.new('RGBA', (im.width * 2, im.height * 2))
            for dx in (0, 1):
                for dy in (0, 1):
                    t.paste(im, (dx * im.width, dy * im.height))
        elif kind(jid) == 'wallface':
            t = Image.new('RGBA', (im.width * 3, im.height))
            for dx in range(3):
                t.paste(im, (dx * im.width, 0))
        else:
            t = Image.new('RGBA', (im.width, im.height * 2), GROUND_BG + (255,))
            t.alpha_composite(im, (0, 0))
            g = im.convert('LA').convert('RGBA')
            t.alpha_composite(g, (0, im.height))
        z = 4 if t.width <= 64 else 3
        cells.append((name, t.resize((t.width * z, t.height * z), Image.NEAREST), ok))
    return compose(jid, cells)


def compose(title, cells):
    pad, top = 10, 24
    W = sum(c[1].width for c in cells) + pad * (len(cells) + 1)
    H = max(c[1].height for c in cells) + top + 40
    out = Image.new('RGB', (max(W, 300), H), GROUND_BG)
    dr = ImageDraw.Draw(out)
    dr.text((pad, 4), title, font=FONT, fill=(240, 240, 240))
    x = pad
    for name, im, ok in cells:
        bg = Image.new('RGBA', im.size, GROUND_BG + (255,))
        bg.alpha_composite(im)
        out.paste(bg.convert('RGB'), (x, top))
        dr.rectangle((x - 2, top - 2, x + im.width + 1, top + im.height + 1), outline=(120, 210, 90) if ok else (240, 90, 80))
        label(dr, x, top + im.height + 4, name, ok)
        x += im.width + pad
    return out


def clear(job):
    for d in (ROOT / job['out'], REJ / job['id']):
        for f in d.glob(f"{job['id']}-s*"):
            f.unlink()


def run_tiles(js, rows):
    for job in js:
        d = RAW / job['id']
        metas = sorted(d.glob('*.json'), key=lambda p: json.loads(p.read_text(encoding='utf-8'))['seed']) if d.exists() else []
        if not metas:
            continue
        clear(job)
        out, rej = ROOT / job['out'], REJ / job['id']
        out.mkdir(parents=True, exist_ok=True)
        passed, items = 0, []
        for m in metas:
            raw = Image.open(d / f'{m.stem}.png')
            names = post_names(m.stem, job['post'])
            for i, name in enumerate(names):  # 牆面切成的兩半各自是一個變體，各自判
                img = Image.open(d / 'post' / name)
                row, why = check(job, js, raw, img, i if len(names) == 2 else None)
                if not why and kind(job['id']) == 'floor' and passed >= 3:
                    why.append('過關，超過前 3 張（備用）')
                dest = rej if why else out
                passed += dest is out
                dest.mkdir(parents=True, exist_ok=True)
                shutil.copy(m, dest / m.name)
                shutil.copy(d / 'post' / name, dest / name)
                spare = why == ['過關，超過前 3 張（備用）']
                rows.append({'file': str((dest / name).relative_to(ROOT)), 'job': job['id'], **row,
                             'result': '過' if not why else '過（備用）' if spare else '不過', 'reason': '；'.join(why)})
                items.append((name, img, dest is out))
        sheet_tiles(job['id'], items).save(EV / f"sheet_{job['id']}.png")
        print(f"{job['id']}：{len(metas)} 張原圖，{passed} 張進 {job['out']}")


def run_fx(rows):
    for d in sorted(FX.glob('sig_*')):
        runs = [d] + sorted((d / 'old').glob('*')) + sorted((REJ / 'fx' / d.name).glob('*'))
        cells = []
        for r in runs:
            if not (r / 'result.json').exists():
                continue
            row, why, sheet, fr = check_fx(r)
            tag = 'latest-' + json.loads((r / 'result.json').read_text(encoding='utf-8'))['result_id'][:8] if r == d else r.name
            dest = r
            if why and REJ not in r.parents:
                dest = REJ / 'fx' / d.name / tag
                if dest.exists():
                    shutil.rmtree(dest)
                dest.mkdir(parents=True)
                for f in r.iterdir():
                    if f.is_file():
                        shutil.move(str(f), dest / f.name)
                sheet = dest / sheet.name
            rows.append({'file': str(sheet.relative_to(ROOT)), 'job': d.name, **row, 'result': '過' if not why else '不過', 'reason': '；'.join(why)})
            pick = np.linspace(0, len(fr) - 1, min(8, len(fr))).round().astype(int)
            strip = Image.new('RGBA', (fr[0].shape[1] * len(pick), fr[0].shape[0]))
            for j, i in enumerate(pick):
                strip.paste(Image.fromarray(fr[i], 'RGBA'), (j * fr[0].shape[1], 0))
            z = 2 if strip.height <= 96 else 1
            cells.append((f'{d.name}/{tag}', strip.resize((strip.width * z, strip.height * z), Image.NEAREST), not why))
        if cells:
            # 一次一列，往下疊
            parts = [compose(c[0], [c]) for c in cells]
            out = Image.new('RGB', (max(p.width for p in parts), sum(p.height for p in parts)), GROUND_BG)
            y = 0
            for p in parts:
                out.paste(p, (0, y))
                y += p.height
            out.save(EV / f'sheet_{d.name}.png')
            print(f'{d.name}：{len(cells)} 次，{sum(c[2] for c in cells)} 過')


def main():
    EV.mkdir(parents=True, exist_ok=True)
    rows = []
    run_tiles(jobs(), rows)
    run_fx(rows)
    with open(EV / 'asset_check.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, COLS)
        w.writeheader()
        w.writerows(rows)
    ok = sum(r['result'].startswith('過') for r in rows)
    print(f'共 {len(rows)} 列，過 {ok}、不過 {len(rows) - ok} → {(EV / "asset_check.csv").relative_to(ROOT)}')


if __name__ == '__main__':
    main()
