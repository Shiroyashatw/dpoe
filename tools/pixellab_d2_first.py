#!/usr/bin/env python3
"""M2-36 D2 首跑 38 張（specs/M2-36-pixellab-d2.md 文首清單、表 1–3、§0、§6）。

    python3 tools/pixellab_d2_first.py sheet     # 寫 art/_tmp/m2-36-d2-first/jobs.json（給 pixellab_batch.py --sheet）
    python3 tools/pixellab_d2_first.py repost    # 只用原圖重做後處理（不花生成）
    python3 tools/pixellab_d2_first.py report    # 量 §6／各表能自動量的項目 → results.md、拼圖總覽
    python3 tools/pixellab_d2_first.py flask48   # 藥水補跑：寫 jobs-flask48.json（48×48；pixflux 畫布至少 32×32，24 會 422）
    python3 tools/pixellab_d2_first.py shrink    # 補跑後：48 原圖改名 -48，最近鄰縮 2 倍成 -24（再 alpha_binary）
生成：python3 tools/pixellab_batch.py run --sheet art/_tmp/m2-36-d2-first/jobs.json --raw art/_tmp/m2-36-d2-first --all [--go]
"""
import json, pathlib, sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import pixellab_batch as pb

OUT = pb.ROOT / 'art/_tmp/m2-36-d2-first'
GROUT, GROUND, LIGHT = '#33302b', '#46413c', '#615b56'
STONE = [GROUT, GROUND, LIGHT]
CAMP = ['#4a3829', '#604832', '#836240', '#344224', '#46562e']  # soil、dirt-dk、dirt、grass-dk、grass
BAN = ['#faaa5e', '#7c5729']  # 全部不准；#fa8915 非追逐／非傳奇物也不准
ICON_BASE = ['#000000', '#46413c', '#817b75', '#e8e5e1']
WY = ['#000000', '#33302b', '#46413c', '#615b56', '#817b75', '#143a38', '#0cf6ee', '#8ffbf6']

TILE = ('seamless tileable texture, orthographic view from directly above, {d}, the pattern fills the whole canvas evenly, light from the top-left, {t}, '
        'no horizon, no sky, no objects, no text, no border, no dithering, no gradient, no anti-aliasing, no logo, no UI, no saturated amber')
ICON = ('game item icon, flat front view, {d}, centred, light from the top-left, 1 pixel black outline, rich three-tone shading plus one highlight, muted palette, '
        'no perspective, no isometric, no 3D, no face, no text, no background, no dithering, no baked frame, no badge, no cooldown ring, no numerals, no {n}')
BIT = 'tiny 16 pixel game icon, flat front view, {d}, bold, 1 pixel black outline, no transparent margin, light from the top-left'
BITNEG = 'blurry, anti-aliasing, gradient, text, background, noise, perspective, isometric, 3D, face, dithering, baked frame, circular badge, numerals, logo, {n}'
BATTLE = 'muted warm paper-ash grey, low chroma'
CAMPT = 'warm brown earth at night, muted'
PLAQUE = 'a square warm-grey stone seal plaque seen flat from the front with a small round ring loop on its top edge, '  # 表 3「正面平視方印牌＋上緣小圓環」


def tile(i, w, h, n, s0, post, pal, desc, tone, table):
    body = {'description': TILE.format(d=desc, t=tone), 'image_size': {'width': w, 'height': h}, 'view': 'high top-down', 'outline': 'lineless',
            'shading': 'basic shading', 'detail': 'low detail', 'no_background': False}
    return dict(id=i, table=table, endpoint='/create-image-pixflux', body=body, n=n, seed0=s0, post=post, palette=pal, wave='D2')


def flask(i, n, s0, desc, nots, pal):
    body = {'description': ICON.format(d=desc, n=nots), 'image_size': {'width': 24, 'height': 24}, 'view': 'side', 'outline': 'single color black outline',
            'shading': 'medium shading', 'detail': 'medium detail', 'no_background': True}
    return dict(id=i, table=2, endpoint='/create-image-pixflux', body=body, n=n, seed0=s0, post='alpha_binary', palette=pal, wave='D2')


def bit(i, n, s0, desc, nots, pal, table, **kw):
    body = {'description': BIT.format(d=desc), 'negative_description': BITNEG.format(n=nots), 'image_size': {'width': 16, 'height': 16}, 'no_background': True}
    return dict(id=i, table=table, endpoint='/create-image-bitforge', body=body, n=n, seed0=s0, post='alpha_binary', palette=pal, wave='D2', **kw)


def wy(name, s0, desc, nots, init):
    return bit(f'wangyin_{name}_16', 3, s0, PLAQUE + desc, nots, WY, 3, init_recolor=f'art/icons/wangyin/wangyin_{name}/wangyin_{name}_32-{init}.png',
               init_image_strength=300, init_cyan=['#143a38', '#0cf6ee', '#8ffbf6'], init_grey=WY[:5])


def sheet():
    js = [
        tile('tile_d2_battle_floor', 32, 32, 4, 5201, 'floor_shift', STONE,
             'worn temple courtyard flagstones, thin grout filled with warm grey ash, a few hairline cracks, no props, ground is the base colour, grout in the cracks, light tiles only as small worn corners', BATTLE, 1),
        tile('tile_d2_camp_floor', 32, 32, 4, 5211, 'camp_shift', CAMP,
             'packed warm brown dirt ground with a worn footpath and a few small dark green grass tufts, village camp at night, no stone slabs, no ash, no paper, no props, no water', CAMPT, 1),
        tile('tile_d2_walltop', 32, 32, 3, 5221, 'wall_shift', STONE,
             'flat top surface of a thick warm-grey stone wall seen from directly above, irregular slabs and thin cracks, no horizon, no peaks, no side silhouette, no objects', BATTLE, 1),
        tile('tile_d2_wallface', 64, 18, 3, 5231, 'face_shift', STONE, 'front face of the same wall, darker toward the bottom, light from top-left, no doors, no windows, no text', BATTLE, 1),
        bit('cur_gold', 3, 5301, 'a short stack of two or three coins, pale gold faces, warm grey edges, not a single ingot, not a crown, not a rare-item star',
            'single ingot, crown, star, bright yellow, orange', ['#000000', '#f2cb9b', '#aeaba7', '#615b56', '#46413c', '#817b75', '#e8e5e1'], 2),
        bit('cur_soul', 3, 5304, 'a small floating soul wisp, pale core, muted cool violet-grey swirl, not a flame, not a chase cyan seal',
            'flame, fire, cyan, seal', ['#000000', '#fbf9f6', '#caaef4', '#6b7dad', '#46413c', '#817b75', '#e8e5e1'], 2),
        flask('flask_hp', 3, 5311, 'a small upright flask with a cork, filled with dark red liquid, readable bottle silhouette, not empty, not a skull, not a heart',
              'empty bottle, no skull, no heart', ICON_BASE + ['#934341', '#af6c64', '#fbf9f6']),
        flask('flask_mp', 3, 5314, 'the same flask family as flask_hp, filled with deep blue liquid, same cork and body, not empty, not a star, not a book',
              'empty bottle, no star, no book', ICON_BASE + ['#3a5b98', '#6b7dad', '#fbf9f6']),
        wy('zhenyue', 5401, 'mountain ridges carved on the plaque face, glowing cyan', 'peak silhouette, animal, face', 's2104'),
        wy('chixiao', 5404, 'an upright sword wrapped in a rising flame, all carved glow in cyan, no orange fire', 'unique orange, bird, face', 's2141'),
        wy('jiting', 5407, 'a single lightning bolt carved on the plaque face, glowing cyan', 'bare bolt without the plaque, mountain', 's2149'),
        wy('guixu', 5410, 'a single spiral vortex carved on the plaque face, glowing cyan, not concentric rings', 'cube, whirlpool landscape, face', 's2162'),
    ]
    face = js[3]['body']  # 牆面：地磚模板的「正上方」跟「正面」矛盾，照上一輪 tile_*_wallface 用正面平視、view side
    face['description'] = face['description'].replace('seamless tileable texture, orthographic view from directly above', 'horizontally seamless wall strip, straight-on front view')
    face['view'] = 'side'
    assert sum(j['n'] for j in js) == 38
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'jobs.json').write_text(json.dumps(js, ensure_ascii=False, indent=2), encoding='utf-8')
    print('寫好', (OUT / 'jobs.json').relative_to(pb.ROOT), len(js), '個 id，', sum(j['n'] for j in js), '張')


def flask48():
    js = [dict(j, body=dict(j['body'], image_size={'width': 48, 'height': 48})) for j in json.loads((OUT / 'jobs.json').read_text(encoding='utf-8'))
          if j['id'].startswith('flask')]
    (OUT / 'jobs-flask48.json').write_text(json.dumps(js, ensure_ascii=False, indent=2), encoding='utf-8')
    print('寫好 jobs-flask48.json', [j['id'] for j in js])


def shrink():
    for j in json.loads((OUT / 'jobs-flask48.json').read_text(encoding='utf-8')):
        d = OUT / j['id']
        for f in sorted(d.glob(f"{j['id']}-s????.png")):
            for x in (f, f.with_suffix('.json'), d / 'post' / f.name):
                x.rename(x.with_name(f'{f.stem}-48{x.suffix}'))
            im = Image.open(d / f'{f.stem}-48.png')
            im.resize((im.width // 2, im.height // 2), Image.NEAREST).save(d / f'{f.stem}-24.png')
            pb.post(j, d, f'{f.stem}-24')
            print('縮好', f.stem, '48 → 24')


# ---- 量測 ----
def rgb(im):
    return np.asarray(im.convert('RGBA'))


def frac(mask, base):
    return float(mask.sum()) / max(int(base.sum()), 1)


def is_upscaled(a):
    h, w = a.shape[:2]
    if h % 2 or w % 2:
        return False
    s = a[::2, ::2]
    return bool((np.repeat(np.repeat(s, 2, 0), 2, 1) == a).all())


def checker(a, on):
    """不透明 2×2 為 a b／b a 交錯兩色的格數"""
    c = a[..., :3].astype(int) @ [65536, 256, 1]
    p, q, r, s = c[:-1, :-1], c[:-1, 1:], c[1:, :-1], c[1:, 1:]
    o = on[:-1, :-1] & on[:-1, 1:] & on[1:, :-1] & on[1:, 1:]
    return int((o & (p == s) & (q == r) & (p != q)).sum())


def banned(a, on, allow_legend=False):
    bans = BAN + ([] if allow_legend else ['#fa8915'])
    d = pb.de2000(pb.lab(a[..., :3][on])[:, None, :], pb.lab([pb.hexrgb(c) for c in bans]))
    return int((d <= 2).any(-1).sum())


def drift(a, on, pal):
    i, d = pb.nearest(a[..., :3][on], pal)
    return float((d > 3).mean()) if d.size else 0, float(d.max()) if d.size else 0


def isolated(idx):
    nb = pb.neighbours(idx)
    return float((nb != idx).all(0).mean())


def seam_ratio(a):
    """接縫平均 RGB 色差 ÷ 磚內相鄰平均（左右、上下繞回）"""
    f = a[..., :3].astype(float)
    inner = np.concatenate([np.abs(np.diff(f, axis=1)).sum(-1).ravel(), np.abs(np.diff(f, axis=0)).sum(-1).ravel()]).mean()
    seam = np.concatenate([np.abs(f[:, 0] - f[:, -1]).sum(-1), np.abs(f[0] - f[-1]).sum(-1)]).mean()
    return seam / inner if inner else (0 if seam == 0 else 99)


def face_seam(a, b):
    f = [x[..., :3].astype(float) for x in (a, b)]
    inner = np.mean([np.abs(np.diff(x, axis=1)).sum(-1).mean() for x in f])
    s = max(np.abs(p[:, -1] - q[:, 0]).sum(-1).mean() for p in f for q in f)
    return s / inner if inner else (0 if s == 0 else 99)


def chroma(a):
    L = pb.lab(a[..., :3])
    return np.hypot(L[..., 1], L[..., 2])


def tex_c(a):
    return float(np.percentile(chroma(a), 95))


def measure_tile(j, raw, posts):
    pal = j['palette']
    ar = rgb(raw)
    on = np.ones(ar.shape[:2], bool)
    dr, dmax = drift(ar, on, pal)
    m = {'原圖 ΔE>3': f'{dr:.0%}', '原圖最大 ΔE': f'{dmax:.1f}'}
    ok = [is_upscaled(ar) is False]
    m['放大圖'] = '是' if not ok[-1] else '否'
    ps = [rgb(p) for p in posts]
    idxs = [pb.nearest(p[..., :3], pal)[0] for p in ps]
    iso = max(isolated(i) for i in idxs)
    m['雜點'] = f'{iso:.1%}'
    ok.append(iso <= 0.02)
    ok.append(banned(ar, on) == 0)
    m['禁色'] = banned(ar, on)
    t = j['id']
    if t == 'tile_d2_battle_floor':
        idx, p = idxs[0], ps[0]
        lr = float(pb.lum(p[..., :3]).mean() / pb.lum(pb.hexrgb(GROUND)))
        gr = float((idx == 0).mean())
        solid = (idx == 0)
        s3 = np.ones_like(solid)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                s3 &= np.roll(np.roll(solid, dy, 0), dx, 1)
        lt = float((idx == 2).mean())
        sr = seam_ratio(p)
        tc = tex_c(p)
        m.update({'亮度比': f'{lr:.3f}', '磚縫': f'{gr:.0%}', '3×3 暗塊': f'{s3.mean():.1%}', '淺磚': f'{lt:.1%}', '接縫比': f'{sr:.2f}', '紋理 C*(p95)': f'{tc:.1f}'})
        ok += [lr <= 1.02, 0.05 <= gr <= 0.35, s3.mean() <= 0.02, lt == 0, sr <= 1.2, tc <= 6]
    elif t == 'tile_d2_walltop':
        idx, p = idxs[0], ps[0]
        hi = float((idx >= 1).mean())
        lt = float((idx == 2).mean())
        sr = seam_ratio(p)
        m.update({'淺磚＋中階': f'{hi:.0%}', '受光緣': f'{lt:.0%}', '接縫比': f'{sr:.2f}', '紋理 C*(p95)': f'{tex_c(p):.1f}'})
        ok += [hi <= 0.80, lt <= 0.15, sr <= 1.2]
    elif t == 'tile_d2_wallface':
        his = [float((i >= 1).mean()) for i in idxs]
        lts = [float((i == 2).mean()) for i in idxs]
        sr = face_seam(*ps)
        m.update({'a/b 中＋淺': '／'.join(f'{x:.0%}' for x in his), 'a/b 淺': '／'.join(f'{x:.0%}' for x in lts), '接縫比': f'{sr:.2f}'})
        ok += [all(0.05 <= x <= 0.60 for x in his), all(x <= 0.15 for x in lts), sr <= 1.2]
    elif t == 'tile_d2_camp_floor':
        idx, p = idxs[0], ps[0]
        gr = float((idx >= 3).mean())
        L = pb.lab(p[..., :3])
        m.update({'草': f'{gr:.0%}', '亮部 L*': f'{L[..., 0].max():.1f}', '接縫比': f'{seam_ratio(p):.2f}'})
        ok += [0.10 <= gr <= 0.30, L[..., 0].max() <= 70, seam_ratio(p) <= 1.2]
    return m, all(ok)


def measure_icon(j, raw, post):
    pal = j['palette']
    ar, ap = rgb(raw), rgb(post)
    on_r, on = ar[..., 3] >= 128, ap[..., 3] == 255
    dr, dmax = drift(ar, on_r, pal)
    ok = []
    m = {'原圖 ΔE>3': f'{dr:.0%}', '原圖最大 ΔE': f'{dmax:.1f}'}
    up = is_upscaled(ar)
    m['放大圖'] = '是' if up else '否'
    ok.append(not up)
    half = int(((ar[..., 3] > 0) & (ar[..., 3] < 255)).sum())
    m['原圖半透明'] = half
    w, h = ap.shape[1], ap.shape[0]
    ok.append((w, h) in ((16, 16), (24, 24), (32, 32)))
    cov = float(on.mean())
    m['不透明'] = f'{cov:.0%}'
    ok.append(cov > 0.05)
    bn = banned(ar, on_r, allow_legend=False)
    m['禁色'] = bn
    ok.append(bn == 0)
    ck = checker(ap, on)
    m['棋盤'] = ck
    if w == 16:
        ok.append(ck <= 6)
    hi = chroma(ap)[on] > 40
    sat = float(hi.mean()) if on.any() else 0
    m['C*>40'] = f'{sat:.0%}'
    if j['id'].startswith('wangyin'):
        ok.append(sat <= 0.35)
    if j['id'].startswith('flask'):  # 1 px 透明邊（造型 22×22）
        edge = on[0].any() or on[-1].any() or on[:, 0].any() or on[:, -1].any()
        m['外圈透明'] = '否' if edge else '是'
        ok.append(not edge)
    return m, all(ok)


def contact(groups, scale):
    """依表分組的總覽：每列一個 id、每格一張（地磚 2×2 拼）"""
    pad, lab_h = 4, 12
    rows = [(t, jid, ims) for t, items in groups for jid, ims in items]
    cell = max([64] + [im.width for _, _, ims in rows for _, im in ims])
    W = pad + 4 * (cell + pad)
    H = sum(64 + pad + lab_h for _ in rows) + pad + 3 * lab_h
    bg = Image.new('RGBA', (W, H), (0x16, 0x13, 0x0f, 255))
    dr = ImageDraw.Draw(bg)
    y, last = pad, None
    for t, jid, ims in rows:
        if t != last:
            dr.text((pad, y), f'表 {t}'.replace('表', 'T'), fill=(232, 229, 225, 255))
            y += lab_h
            last = t
        dr.text((pad, y), jid, fill=(174, 171, 167, 255))
        y += lab_h
        for k, (seed, im) in enumerate(ims):
            x = pad + k * (cell + pad)
            dr.rectangle([x, y, x + cell - 1, y + 63], fill=(0x46, 0x41, 0x3c, 255))
            bg.alpha_composite(im, (x + (cell - im.width) // 2, y + (64 - im.height) // 2))
            dr.text((x + 1, y + 54), str(seed), fill=(251, 249, 246, 255))
        y += 64 + pad
    return bg.resize((W * scale, H * scale), Image.NEAREST) if scale > 1 else bg


def preview(j, posts):
    """總覽用小圖：地磚 2×2 拼（牆面 a b 左右接＋上下疊）；圖示 1× 與 2× 並排"""
    if j['post'] == 'face_shift':
        a, b = posts
        row = Image.new('RGBA', (64, 18))
        row.paste(a.convert('RGBA'), (0, 0))
        row.paste(b.convert('RGBA'), (32, 0))
        out = Image.new('RGBA', (64, 36))
        out.paste(row, (0, 0))
        out.paste(row, (0, 18))
        return out
    p = posts[0].convert('RGBA')
    if j['id'].startswith('tile'):
        out = Image.new('RGBA', (64, 64))
        for x in (0, 32):
            for y in (0, 32):
                out.paste(p, (x, y))
        return out
    w = p.width
    out = Image.new('RGBA', (w + 2 + 2 * w, 2 * w))
    out.paste(p, (0, w // 2))
    out.paste(p.resize((2 * w, 2 * w), Image.NEAREST), (w + 2, 0))
    return out


def repost():
    """只用原圖重做後處理（不花生成）"""
    pb.SHEET, pb.RAW = OUT / 'jobs.json', OUT
    for j in json.loads((OUT / 'jobs.json').read_text(encoding='utf-8')):
        for f in sorted((OUT / j['id']).glob('*.png')):
            pb.post(j, OUT / j['id'], f.stem)


def report():
    js = json.loads((OUT / 'jobs.json').read_text(encoding='utf-8'))
    fails = json.loads((OUT / 'failures.json').read_text(encoding='utf-8')) if (OUT / 'failures.json').exists() else []
    fmap = {(f['id'], f['seed']): f['error'] for f in fails}
    rows, groups, n_ok, n_fail, n_pass = [], {}, 0, 0, 0
    for j in js:
        d = OUT / j['id']
        for k in range(j['n']):
            seed = j['seed0'] + k
            stem = f"{j['id']}-s{seed}"
            if j['id'].startswith('flask'):  # 補跑：48 產圖、縮成 24 量
                stem += '-24'
            f = d / f'{stem}.png'
            if not f.exists():
                n_fail += 1
                rows.append((j['table'], j['id'], seed, '失敗', fmap.get((j['id'], seed), '沒有圖（未送出或失敗）'), '—', '—'))
                continue
            n_ok += 1
            if j['id'].startswith('flask'):
                note = f"48 `{stem[:-3]}-48.png`、24 `{stem}.png`（48 補跑，最近鄰縮 2 倍）；"
            else:
                note = ''
            raw = Image.open(f)
            posts = [Image.open(d / 'post' / n) for n in pb.post_names(stem, j['post'])]
            m, ok = (measure_tile(j, raw, posts) if j['id'].startswith('tile') else measure_icon(j, raw, posts[0]))
            n_pass += ok
            eye = {'tile_d2_walltop': '正上方的面', 'tile_d2_camp_floor': '草不成圈、camp-mood §2 禁用意象、跟 camp_M1 並排',
                   'tile_d2_battle_floor': '接縫、重複感', 'tile_d2_wallface': '牆面、無門窗'}.get(j['id'], '')
            if j['id'].startswith('wangyin'):
                eye = '正面家族、無臉無立體、四枚灰階可分'
            elif j['id'].startswith('flask'):
                eye = '有塞有液、非空瓶、HP／MP 同家族、無數字環'
            elif j['id'].startswith('cur'):
                eye = '1× 可辨、灰階金≠靈魂'
            rows.append((j['table'], j['id'], seed, '成功', note + '；'.join(f'{a} {b}' for a, b in m.items()), '✅' if ok else '❌', f'待美術看：{eye}'))
            groups.setdefault(j['table'], []).append((j['id'], seed, preview(j, posts)))
    by = {}
    for t, items in groups.items():
        cur = {}
        for jid, seed, im in items:
            cur.setdefault(jid, []).append((seed, im))
        by[t] = list(cur.items())
    g = sorted(by.items())
    if g:
        contact(g, 1).save(OUT / 'contact-1x.png')
        contact(g, 4).save(OUT / 'contact-4x.png')
    head = ['# M2-36 D2 首跑 38 張（藥水 6 張 48 補跑、縮成 24）：自動預篩',
            '',
            f'成功 {n_ok} 張、失敗 {n_fail} 張；自動預篩 ✅ {n_pass}／❌ {n_ok - n_pass}。目視項目一律「待美術看」。量測用後處理圖（`post/`），色票偏移與放大圖用原圖。',
            '',
            '量法與過關（規格 §6、表 1–3）：',
            '- 共用：原圖色票偏移（ΔE>3 比例、最大值，只回報）；放大圖＝最近鄰縮半再放大後與原圖相同（不准）；禁色 `#faaa5e` `#7c5729` `#fa8915`（ΔE≤2 視為同色，0 像素）。',
            '- 戰場地板（floor_shift，三色 磚縫／地面／淺磚 −1 階）：亮度比＝平均相對亮度÷`#46413c` ≤1.02；磚縫 5–35%；3×3 實心磚縫 ≤2%；淺磚 0；接縫比 ≤1.2；紋理 C*（p95）≤6；雜點 ≤2%。',
            '- 牆頂、牆面（wall_shift／face_shift，同 prompts §5 −1 階；「中階」取 `#46413c`）：牆頂 淺＋中 ≤80%、淺（受光緣）≤15%；牆面每半 中＋淺 5–60%、淺 ≤15%；接縫比 ≤1.2。',
            '- 營地地板（camp_shift，對 5 色、不降階）：草 10–30%；亮部 L* ≤70；接縫比 ≤1.2。',
            '- 圖示（alpha_binary）：尺寸 16／24；16 棋盤 ≤6；王印 C*>40÷不透明 ≤35%；藥水外圈 1 px 透明。',
            '',
            '| 表 | id | 種子 | 結果 | 量測值 | 自動預篩 | 目視 |',
            '| --- | --- | --- | --- | --- | --- | --- |']
    body = [f'| {t} | `{i}` | {s} | {r} | {m} | {p} | {e} |' for t, i, s, r, m, p, e in rows]
    (OUT / 'results.md').write_text('\n'.join(head + body) + '\n', encoding='utf-8')
    print(f'成功 {n_ok}、失敗 {n_fail}、預篩 ✅ {n_pass}／❌ {n_ok - n_pass}')


if __name__ == '__main__':
    {'sheet': sheet, 'repost': repost, 'report': report, 'flask48': flask48, 'shrink': shrink}[sys.argv[1]]()
