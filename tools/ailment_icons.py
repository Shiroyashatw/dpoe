#!/usr/bin/env python3
"""M2-39 異常狀態圖示：讀 specs/M2-39-pixellab-prompts.md §3.1 工作表，呼叫 PixelLab，做 §4 後處理與 §5 檢查。

沿用 tools/pixellab_batch.py（M2-36）的色票、呼叫與 alpha_binary；只換工作表、上限與檢查。
金鑰只讀環境變數 PIXELLAB_API_KEY（雲端由代理注入，可不設），不印、不寫檔。

用法（在 dpoe/ 底下）：
    python3 tools/ailment_icons.py list
    python3 tools/ailment_icons.py run --size 32 --job scorch,brittle      # 預覽（不花）
    python3 tools/ailment_icons.py run --size 32 --job scorch,brittle --go # 真的送出，一次最多 5 張
    python3 tools/ailment_icons.py run --size 32 --job ad --k 1 --go       # 備用重跑：seed0 + 1
    python3 tools/ailment_icons.py check     # 後處理＋§5 檢查＋csv＋對照圖（不花）
    python3 tools/ailment_icons.py balance
- 32：/create-image-pixflux，seed＝seed0＋k。16：/create-image-bitforge，seed＝seed0＋100＋k，
  init＝該 id 過關的 32（最近鄰縮到 16），init_image_strength 300。
- 預算：第一次 --go 記下起始餘額（evidence/spend.csv）；已花＝起始−目前；已花＋這批張數 > 100 就停。
"""
import argparse, csv, json, pathlib, re, shutil, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from pixellab_batch import ROOT, alpha_binary, b64img, hexrgb, http, lab, nearest, palette_png, tokens  # noqa: E402

DOC = ROOT / 'docs/production/specs/M2-39-pixellab-prompts.md'
PICKS = ROOT / 'docs/production/specs/M2-39-picks.md'
RAW = ROOT / 'art/_raw/ailment'
OUT = ROOT / 'art/icons/ailment'
REJ = ROOT / 'art/_rejected/ailment'
EV = ROOT / 'docs/production/evidence/m2-39'
SPEND = EV / 'spend.csv'
CAP, BATCH, STRENGTH16 = 100, 5, 300
BG = (36, 33, 30)  # --panel-inset
FONT = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 12)
NEUTRAL = {'--scene-void', '--panel-inset', '--panel', '--border', '--border-mid', '--border-cap', '--tx-strong', '--tx-dim', '--hp', '--mp'}
BODY32 = ('game status icon, flat front view, {s}, centred, fills the canvas, light from the top-left, bold simple shapes readable at small size, '
          '1 pixel transparent margin, 1 pixel black outline, no perspective, no isometric, no 3D, no face, no eyes unless the silhouette is an eye, '
          'no text, no characters, no background, no dithering, no gradient')
BODY16 = 'tiny 16 pixel game status icon, flat front view, {s}, bold, 1 pixel black outline, no transparent margin'
NEG16 = 'blurry, anti-aliasing, gradient, text, background, noise, perspective, isometric, 3D, face, dithering'
RECOLOR = {'ad_cold': '--el-cold', 'ad_light': '--el-light'}  # 適應：ad 火焰版 --el-fire 換色，不花生成


def jobs():
    """§3.1 表格：id、名、角色、init、seed0、palette、description"""
    sec = DOC.read_text(encoding='utf-8').split('### 3.1')[1].split('### 3.2')[0]
    js = []
    for line in sec.splitlines():
        c = [x.strip() for x in line.strip().strip('|').split('|')]
        if len(c) == 7 and c[4].isdigit():
            js.append({'id': c[0].strip('`'), 'name': c[1], 'seed0': int(c[4]), 'palette': re.findall(r'`(--[a-z-]+)`', c[5]), 'desc': c[6]})
    return js


def rewrites():
    """picks.md §2 改寫的提示詞：「- riven：`…`」"""
    return dict(re.findall(r'^- (\w+)：`([^`]+)`', PICKS.read_text(encoding='utf-8'), re.M))


def split_desc(d):
    """「a, not x and not y」→ 剪影、no 句（冠詞拿掉）。ad 的「先畫火」與「curse diamond family」換成模型看得懂的字"""
    d = d.replace('; generate the fire pip first', '').replace('one elemental pip', 'one fire pip')
    d = d.replace('the curse diamond family', 'a solid diamond curse sigil')
    parts = [p.strip() for p in d.split(',')]
    keep = [p for p in parts if not p.startswith('not ')]
    nots = [re.sub(r'^(a|an|the) ', '', q.strip()) for p in parts if p.startswith('not ') for q in re.split(r'\band not\b|^not\b', p) if q.strip()]
    return ', '.join(keep), nots


def body(job, size):
    sil, nots = split_desc(job['desc'])
    if size == 32:
        d = BODY32.format(s=sil) + ''.join(f', no {n}' for n in nots)
        return '/create-image-pixflux', {'description': d, 'image_size': {'width': 32, 'height': 32}, 'view': 'side',
                                         'outline': 'single color black outline', 'shading': 'medium shading', 'detail': 'low detail', 'no_background': True}
    return '/create-image-bitforge', {'description': BODY16.format(s=sil), 'negative_description': NEG16,
                                      'image_size': {'width': 16, 'height': 16}, 'no_background': True}


def key(jid, size):
    return f'ail_{jid}_{size}'


def seed(job, size, k):
    return job['seed0'] + (100 if size == 16 else 0) + k


def pal(job):
    return [tokens()[t] for t in job['palette']]


def passed32(jid):
    """該 id 已過關的 32（後處理後，在正式目錄）；多張取 seed 最小"""
    fs = sorted((OUT / key(jid, 32)).glob(f'{key(jid, 32)}-s*.png'))
    return fs[0] if fs else None


# ---- 預算 ----
def balance():
    return float(http('GET', '/balance')['subscription']['generations'])


def ledger():
    return list(csv.DictReader(open(SPEND, encoding='utf-8'))) if SPEND.exists() else []


def log_spend(row):
    EV.mkdir(parents=True, exist_ok=True)
    new = not SPEND.exists()
    with open(SPEND, 'a', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, ['batch', 'files', 'before', 'after', 'spent_batch', 'spent_total'])
        if new:
            w.writeheader()
        w.writerow(row)


# ---- 呼叫 ----
def run_one(job, size, k):
    s = seed(job, size, k)
    stem = f'{key(job["id"], size)}-s{s}'
    d = RAW / key(job['id'], size)
    ep, b = body(job, size)
    b = dict(b, seed=s, color_image=b64img(palette_png(pal(job))))
    note = {}
    if size == 16:
        src = passed32(job['id'])
        b['init_image'] = b64img(Image.open(src).convert('RGBA').resize((16, 16), Image.NEAREST))
        b['init_image_strength'] = STRENGTH16
        note['init_from'] = src.name
    r = http('POST', ep, b)
    (d / 'post').mkdir(parents=True, exist_ok=True)
    import base64, io
    im = Image.open(io.BytesIO(base64.b64decode(r['image']['base64'])))
    im.save(d / f'{stem}.png')
    req = {x: ('(base64 略)' if isinstance(v, dict) and 'base64' in v else v) for x, v in b.items()}
    r['image']['base64'] = '(存成 png，略)'
    meta = {'endpoint': 'POST /v2' + ep, 'job': key(job['id'], size), 'seed': s, 'post': 'alpha_binary', 'palette': job['palette'], **note,
            'request': req, 'usage': r.get('usage'), 'response': r}
    (d / f'{stem}.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'  完成 {stem}.png {im.size} {im.mode}，用量 {r.get("usage")}')


def run(a):
    js = {j['id']: j for j in jobs()}
    if a.seed:  # 重生：用 picks.md §2 的提示詞，seed 從 a.seed 起依序（只做 32）
        rw = rewrites()
        js = {jid: dict(js[jid], desc=rw[jid], seed0=a.seed + i) for i, jid in enumerate(a.job.split(',')) if jid in rw}
    want = [x for x in a.job.split(',') if x] if a.job else list(js)
    bad = [x for x in want if x not in js]
    if bad:
        sys.exit('沒有這些 id：' + '、'.join(bad))
    todo, skip = [], []
    for jid in want:
        f = RAW / key(jid, a.size) / f'{key(jid, a.size)}-s{seed(js[jid], a.size, a.k)}.png'
        if f.exists():
            continue
        if a.size == 16 and not passed32(jid):
            skip.append(jid)
            continue
        todo.append(js[jid])
    if skip:
        print('沒有過關的 32，跳過 16：' + '、'.join(skip))
    if len(todo) > BATCH:
        sys.exit(f'一次最多 {BATCH} 張（這次 {len(todo)} 張）')
    print(f'這批 {len(todo)} 張（{a.size}，k={a.k}）')
    for j in todo:
        ep, b = body(j, a.size)
        print(f'- {key(j["id"], a.size)} s{seed(j, a.size, a.k)} {ep}：{b["description"][:140]}…')
    if not a.go or not todo:
        return print('只是預覽，沒有送出。確認後加 --go' if not a.go else '沒有要跑的')
    led = ledger()
    before = balance()
    start = float(led[0]['before']) if led else before
    spent = start - before
    print(f'餘額 {before:.2f}，本工項已花 {spent:.2f}／{CAP}')
    if spent + len(todo) > CAP:
        sys.exit(f'已花 {spent:.2f} ＋ 這批 {len(todo)} > {CAP}，停')
    for j in todo:
        run_one(j, a.size, a.k)
    after = balance()
    log_spend({'batch': len(led) + 1, 'files': ' '.join(f'{key(j["id"], a.size)}-s{seed(j, a.size, a.k)}' for j in todo),
               'before': f'{before:.4f}', 'after': f'{after:.4f}', 'spent_batch': f'{before - after:.4f}', 'spent_total': f'{start - after:.4f}'})
    print(f'這批花 {before - after:.2f}，本工項累計 {start - after:.2f}／{CAP}')


# ---- §4 後處理、§5 檢查 ----
def review():
    f = EV / 'review.csv'
    return {r['file']: r['reason'] for r in csv.DictReader(open(f, encoding='utf-8')) if r['verdict'] == '不過'} if f.exists() else {}


def classes(job):
    """雜點用的類：0 描邊暗（L*<15）、1 中、2 主體亮／角色色（非中性 token 或 L*≥58）"""
    out = []
    for t in job['palette']:
        L = lab(hexrgb(tokens()[t]))[0]
        out.append(0 if L < 15 else 2 if (t not in NEUTRAL or L >= 58) else 1)
    return np.array(out)


def check(job, size, raw, img):
    p = pal(job)
    row, why = {'size': f'{img.width}x{img.height}'}, []
    if img.size != (size, size):
        why.append(f'尺寸 {row["size"]}')
    r = np.asarray(raw.convert('RGBA'))
    on = r[..., 3] >= 128
    if not on.any():
        return row, ['全透明']
    _, d = nearest(r[..., :3][on], p)
    row['de_gt3_pct'], row['de_max'] = round(100 * (d > 3).mean(), 2), round(float(d.max()), 2)
    if row['de_gt3_pct'] > 5 or row['de_max'] > 10:
        row['de_note'] = '原圖偏移，alpha_binary 後已全色票'  # §5 不過時的處理就是 alpha_binary；後處理後要 100%
    a = np.asarray(img.convert('RGBA'))
    op = a[..., 3] > 0
    P = np.array([hexrgb(c) for c in p])
    eq = (a[..., None, :3] == P).all(-1)
    idx = np.where(eq.any(-1), eq.argmax(-1), 99)
    row['post_palette_pct'] = round(100 * (idx[op] != 99).mean(), 2)
    if row['post_palette_pct'] < 100:
        why.append(f'後處理後非色票色 {100 - row["post_palette_pct"]:.2f}%')
    row['opaque_pct'] = round(100 * op.mean(), 1)
    if op.mean() < 0.12:
        why.append(f'不透明只有 {row["opaque_pct"]}%（幾乎空白）')
    c = np.where(op, classes(job)[np.minimum(idx, len(p) - 1)], -1)
    pd = np.pad(c, 1, constant_values=-1)
    nb = np.stack([pd[1 + dy:1 + dy + size, 1 + dx:1 + dx + size] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx])
    row['isolated_pct'] = round(100 * ((nb != c).all(0) & op).sum() / op.sum(), 2)
    if row['isolated_pct'] > 3:
        why.append(f'雜點 {row["isolated_pct"]}% > 3%')
    q = np.where(op, idx, -1)
    A, B, C, D = q[:-1, :-1], q[:-1, 1:], q[1:, :-1], q[1:, 1:]
    row['checker'] = int(((A == D) & (B == C) & (A != B) & (A >= 0) & (B >= 0)).sum())
    if size == 16 and row['checker'] > 6:
        why.append(f'棋盤 {row["checker"]} > 6')
    cs = np.hypot(*lab(a[..., :3][op])[:, 1:].T)
    neutral = np.isin(np.array(job['palette'])[np.minimum(idx[op], len(p) - 1)], list(NEUTRAL))
    row['sat_nonrole'] = int(((cs > 40) & neutral).sum())
    if row['sat_nonrole']:
        why.append(f'非角色色 C*>40 有 {row["sat_nonrole"]} 格')
    chase = hexrgb(tokens()['--rar-chase'])
    row['chase_px'] = int((a[..., :3][op] == chase).all(-1).sum()) + ('--rar-chase' in job['palette'])
    if row['chase_px']:
        why.append('用到 --rar-chase')
    row['upscaled'] = bool((r[::2, ::2].repeat(2, 0).repeat(2, 1) == r).all())
    if row['upscaled']:
        why.append('縮一半再放大跟原圖一樣（放大過的圖）')
    if not np.isin(a[..., 3], (0, 255)).all():
        why.append('alpha 不是 0／255')
    if size == 32 and (a[0, :, 3].any() or a[-1, :, 3].any() or a[:, 0, 3].any() or a[:, -1, 3].any()):
        row['margin_note'] = '外圈 1 px 有不透明'  # 規格要求透明邊；只回報，留給美術判
    return row, why


def despeckle(job, img, size):
    """手修：8 鄰沒有同類的不透明像素 → 改成 8 鄰裡最多的顏色（含透明），做一次"""
    a = np.asarray(img.convert('RGBA')).copy()
    P = np.array([hexrgb(c) for c in pal(job)])
    op = a[..., 3] > 0
    idx = np.where(op, (a[..., None, :3] == P).all(-1).argmax(-1), -1)
    c = np.where(op, classes(job)[np.maximum(idx, 0)], -1)
    pd, pi = np.pad(c, 1, constant_values=-1), np.pad(idx, 1, constant_values=-1)
    sh = [(dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx]
    nb = np.stack([pd[1 + dy:1 + dy + size, 1 + dx:1 + dx + size] for dy, dx in sh])
    ni = np.stack([pi[1 + dy:1 + dy + size, 1 + dx:1 + dx + size] for dy, dx in sh])
    out = a.copy()
    for y, x in zip(*np.nonzero((nb != c).all(0) & op)):
        v, n = np.unique(ni[:, y, x], return_counts=True)
        best = v[n.argmax()]
        out[y, x] = (0, 0, 0, 0) if best < 0 else (*P[best], 255)
    return Image.fromarray(out, 'RGBA')


def gray(im):
    return im.convert('LA').convert('RGBA')


def cell(im):
    """彩 4 倍＋1 倍、灰階 4 倍＋1 倍（直排）"""
    im = im.convert('RGBA')
    w, h = im.size
    t = Image.new('RGBA', (w * 4 + 4 + w, h * 8 + 4), BG + (255,))
    for i, x in enumerate((im, gray(im))):
        y = i * (h * 4 + 4)
        t.alpha_composite(x.resize((w * 4, h * 4), Image.NEAREST), (0, y))
        t.alpha_composite(x, (w * 4 + 4, y))
    return t


def sheet(title, cells, cols):
    pad, top, lab_h = 10, 24, 30
    cw = max(c[1].width for c in cells)
    ch = max(c[1].height for c in cells)
    cw = max(cw, max(int(FONT.getlength(c[0])) for c in cells))
    rows = (len(cells) + cols - 1) // cols
    out = Image.new('RGB', (pad + cols * (cw + pad), top + rows * (ch + lab_h + pad)), BG)
    dr = ImageDraw.Draw(out)
    dr.text((pad, 4), title, font=FONT, fill=(240, 240, 240))
    for i, (name, im, ok) in enumerate(cells):
        x, y = pad + (i % cols) * (cw + pad), top + (i // cols) * (ch + lab_h + pad)
        bg = Image.new('RGBA', im.size, BG + (255,))
        bg.alpha_composite(im)
        out.paste(bg.convert('RGB'), (x, y))
        dr.rectangle((x - 2, y - 2, x + im.width + 1, y + im.height + 1), outline=(120, 210, 90) if ok else (240, 90, 80))
        dr.text((x, y + im.height + 3), name, font=FONT, fill=(230, 230, 230))
        dr.text((x, y + im.height + 16), '過' if ok else '不過', font=FONT, fill=(120, 210, 90) if ok else (240, 90, 80))
    return out


def recolor_ad(rows, cells):
    """適應 ad_cold／ad_light：ad 過關圖的 --el-fire 像素換色（32、16 都做），不花生成"""
    for size in (32, 16):
        src = sorted((OUT / key('ad', size)).glob(f'{key("ad", size)}-s*.png'))
        if not src:
            continue
        a = np.asarray(Image.open(src[0]).convert('RGBA')).copy()
        fire = (a[..., :3] == hexrgb(tokens()['--el-fire'])).all(-1) & (a[..., 3] > 0)
        for nid, tok in RECOLOR.items():
            b = a.copy()
            b[..., :3][fire] = hexrgb(tokens()[tok])
            d = OUT / key(nid, size)
            d.mkdir(parents=True, exist_ok=True)
            name = f'{key(nid, size)}-recolor-{src[0].stem.rsplit("-", 1)[1]}.png'
            Image.fromarray(b, 'RGBA').save(d / name)
            (d / (name[:-4] + '.json')).write_text(json.dumps({'job': key(nid, size), 'recolor_from': src[0].name, 'swap': ['--el-fire', tok],
                                                               'pixels': int(fire.sum()), 'usage': None}, ensure_ascii=False, indent=2), encoding='utf-8')
            rows.append({'file': str((d / name).relative_to(ROOT)), 'id': nid, 'size': f'{size}x{size}', 'result': '過（recolor）',
                         'reason': f'由 {src[0].name} 換色 {int(fire.sum())} 格'})
            cells[size].append((f'{nid} recolor', Image.fromarray(b, 'RGBA'), True))


def check_all():
    EV.mkdir(parents=True, exist_ok=True)
    rows, cells, grays = [], {32: [], 16: []}, {32: [], 16: []}
    for size in (32, 16):
        for job in jobs():
            k = key(job['id'], size)
            d = RAW / k
            metas = sorted(d.glob('*.json')) if d.exists() else []
            for dst in (OUT / k, REJ / k):
                for f in dst.glob(f'{k}-s*'):
                    f.unlink()
            for m in metas:
                raw = Image.open(d / f'{m.stem}.png')
                img = alpha_binary(raw, pal(job))[0][0]
                img.save(d / 'post' / f'{m.stem}.png')
                row, why = check(job, size, raw, img)
                if m.stem in review():  # §5 灰階剪影／題意：目視退回（evidence/review.csv）
                    why.append(review()[m.stem])
                if why and all(w.startswith('雜點') for w in why):  # §5 雜點不過：手修（不花生成），修過的另存 -fix 再檢查一次
                    fixed = despeckle(job, img, size)
                    row2, why2 = check(job, size, raw, fixed)
                    if not why2:
                        img.save(REJ / k / f'{m.stem}.png') if (REJ / k).mkdir(parents=True, exist_ok=True) is None else None
                        shutil.copy(m, REJ / k / m.name)
                        rows.append({'file': str((REJ / k / f'{m.stem}.png').relative_to(ROOT)), 'id': job['id'], **row, 'result': '不過', 'reason': '；'.join(why) + '（改用手修版）'})
                        img, row, why = fixed, dict(row2, fix=f'手修 {row["isolated_pct"]}%→{row2["isolated_pct"]}%'), []
                        fixed.save(d / 'post' / f'{m.stem}-fix.png')
                dest = REJ / k if why else OUT / k
                dest.mkdir(parents=True, exist_ok=True)
                shutil.copy(m, dest / m.name)
                name = f'{m.stem}-fix.png' if row.get('fix') else f'{m.stem}.png'
                img.save(dest / name)
                rows.append({'file': str((dest / name).relative_to(ROOT)), 'id': job['id'], **row,
                             'result': '不過' if why else '過', 'reason': '；'.join(why)})
                if not why:  # §5：不過的不進對照
                    cells[size].append((f'{job["id"]} s{m.stem.rsplit("-s", 1)[1]}' + (' 手修' if row.get('fix') else ''), cell(img), True))
                    grays[size].append((job['id'], gray(img), True))
    recolor_ad(rows, grays)
    for size in (32, 16):
        if cells[size]:
            sheet(f'M2-39 佇列 {size}：過關圖，每枚 上彩 4 倍＋1 倍／下灰階 4 倍＋1 倍', cells[size], 8).save(EV / f'queue_{size}_compare.png')
        if grays[size]:
            g = [(n, Image.fromarray(np.asarray(gray(im))).resize((im.width * 4, im.height * 4), Image.NEAREST), ok) for n, im, ok in grays[size]]
            sheet(f'M2-39 佇列 {size} 過關圖灰階並排（4 倍）', g, 10).save(EV / f'queue_{size}_gray.png')
    cols = ['file', 'id', 'size', 'de_gt3_pct', 'de_max', 'de_note', 'post_palette_pct', 'opaque_pct', 'isolated_pct', 'checker', 'sat_nonrole',
            'chase_px', 'upscaled', 'margin_note', 'fix', 'result', 'reason']
    with open(EV / 'asset_check.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, cols, extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)
    for size in (32, 16):
        r = [x for x in rows if x['size'] == f'{size}x{size}' and 'recolor' not in x['result']]
        ok = sorted({x['id'] for x in r if x['result'] == '過'})
        no = sorted({x['id'] for x in r} - set(ok))
        print(f'{size}：{len(r)} 張，過 {len(ok)} 枚；沒過 {"、".join(no) or "無"}')


def main():
    p = argparse.ArgumentParser(description='M2-39 異常狀態圖示 PixelLab 批次')
    p.add_argument('cmd', choices=['list', 'run', 'check', 'balance'])
    p.add_argument('--size', type=int, choices=[32, 16], default=32)
    p.add_argument('--job', default='')
    p.add_argument('--k', type=int, default=0, help='第幾張（0＝首跑，1 起＝備用重跑）')
    p.add_argument('--seed', type=int, default=0, help='重生：用 picks.md §2 的提示詞，--job 依序 seed、seed+1…')
    p.add_argument('--go', action='store_true')
    a = p.parse_args()
    if a.cmd == 'balance':
        return print(f'{balance():.4f}')
    if a.cmd == 'list':
        for j in jobs():
            for s in (32, 16):
                ep, b = body(j, s)
                print(f'{key(j["id"], s):20} s{seed(j, s, 0)} {ep}\n    {b["description"]}')
        return print(f'{len(jobs())} 枚')
    if a.cmd == 'check':
        return check_all()
    run(a)


if __name__ == '__main__':
    main()
