#!/usr/bin/env python3
"""M2-36 D2 第三批（dpoe-pixellab-d2-b3）：batch2 §5 的 5a–5d＋§6 加候選 1–5。

規格從 PR #119 分支讀（不帶進本分支）：origin/docs/m2-36-pixellab-d2 的
docs/production/specs/M2-36-pixellab-d2-batch2.md（batch2）與 M2-36-pixellab-d2.md（主檔）；
主檔 §4 狀態的 <DESC> 沿用 main 上的 M2-39-pixellab-prompts.md §3.2。

    python3 tools/pixellab_d2_b3.py sheet      # 寫 art/_tmp/m2-36-d2-b3/jobs.json（wave＝5a 5b 5c 5d 6-1…6-5）
    python3 tools/pixellab_d2_b3.py report     # 量能自動量的項目 → results.md、每項拼圖 1×／4×
生成：python3 tools/pixellab_batch.py run --sheet art/_tmp/m2-36-d2-b3/jobs.json --raw art/_tmp/m2-36-d2-b3 --wave 5a [--go]
"""
import json, pathlib, re, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import pixellab_batch as pb

OUT = pb.ROOT / 'art/_tmp/m2-36-d2-b3'
REF = 'origin/docs/m2-36-pixellab-d2'
B2 = 'docs/production/specs/M2-36-pixellab-d2-batch2.md'
MAIN = 'docs/production/specs/M2-36-pixellab-d2.md'
M39 = pb.ROOT / 'docs/production/specs/M2-39-pixellab-prompts.md'

# 主檔 §0 共用 body
ICON = ('game item icon, flat front view, {d}, centred, light from the top-left, 1 pixel black outline, rich three-tone shading plus one highlight, muted palette, '
        'no perspective, no isometric, no 3D, no face, no text, no background, no dithering, no baked frame, no badge, no cooldown ring, no numerals, no {n}')
TILE = ('seamless tileable texture, orthographic view from directly above, {d}, the pattern fills the whole canvas evenly, light from the top-left, {t}, '
        'no horizon, no sky, no objects, no text, no border, no dithering, no gradient, no anti-aliasing, no logo, no UI, no saturated amber')
BIT = 'tiny 16 pixel game icon, flat front view, {d}, bold, 1 pixel black outline, no transparent margin, light from the top-left'
BITNEG = 'blurry, anti-aliasing, gradient, text, background, noise, perspective, isometric, 3D, face, dithering, baked frame, circular badge, numerals, logo'
BATTLE = 'muted warm paper-ash grey, low chroma'
# batch2 §2 王 body
BOSS = ('game boss sprite, full body, standing, facing the viewer at three-quarter angle, {d}, dark fantasy Chinese mythology, centred, feet near the bottom edge, '
        'light from the top-left, no text, no background, no ground shadow, no frame, no UI, no {n}')
# batch2 §1
TREE_NOT = 'text, letters, numerals, face, skull, circle frame, node ring, background disc, gradient glow'
TREE_PAL = ['#000000', '#33302b', '#615b56', '#aeaba7', '#e8e5e1']
ACCENT = {'火': ['#ee9978'], '冰': ['#ade2f9'], '雷': ['#f3f9a4'], '混': ['#e97ccf'], '命': ['#934341', '#af6c64'], '魔': ['#3a5b98', '#6b7dad'],
          '綠': ['#95e886'], '金': ['#f2cb9b'], '無': []}
CUR_BASE = ['#46413c', '#817b75', '#e8e5e1']  # 主檔 §2：#000000＋主色＋這三色
PLQ_PAL = ['#000000', '#25211e', '#2c2825', '#3f3226', '#6b5440', '#817b75', '#aeaba7', '#e8e5e1']
BAN = ['#faaa5e', '#7c5729', '#fa8915']


def spec(path):
    return subprocess.run(['git', 'show', f'{REF}:{path}'], cwd=pb.ROOT, capture_output=True, text=True, check=True).stdout


def table(text, head):
    """從標題行 head 之後的第一張 markdown 表取資料列（cells）"""
    i = text.index(head)
    rows, started = [], False
    for line in text[i:].splitlines()[1:]:
        if line.startswith('|'):
            started = True
            c = [x.strip() for x in line.strip().strip('|').split('|')]
            if not set(c[0]) <= set('- '):
                rows.append(c)
        elif started:
            break
    return rows[1:]  # 去表頭


def code(s):
    return re.findall(r'`([^`]+)`', s)


def hexes(s):
    return re.findall(r'#[0-9a-fA-F]{6}', s)


def nots(desc):
    """bitforge 的 <NOT>：取 <DESC> 裡的 not／no 片語"""
    out = []
    for m in re.finditer(r'\b(?:not|no) (?:a |an |the )?([^,]+)', desc):
        out += [x.strip() for x in re.split(r'\bnot (?:a |an )?|\bor (?:a |an )?|\band (?:a |an )?', m.group(1)) if x.strip()]
    return out


def uniq(xs):
    return list(dict.fromkeys(xs))


def pix(i, wave, s0, n, desc, nn, w, h, pal, **kw):
    body = {'description': ICON.format(d=desc, n=nn), 'image_size': {'width': w, 'height': h}, 'view': 'side', 'outline': 'single color black outline',
            'shading': 'medium shading', 'detail': 'medium detail', 'no_background': True}
    return dict(id=i, wave=wave, endpoint='/create-image-pixflux', body=body, n=n, seed0=s0, post='alpha_binary', palette=pal, **kw)


def bit(i, wave, s0, n, desc, nn, pal):
    neg = ', '.join([BITNEG] + nn)
    body = {'description': BIT.format(d=desc), 'negative_description': neg, 'image_size': {'width': 16, 'height': 16}, 'no_background': True}
    return dict(id=i, wave=wave, endpoint='/create-image-bitforge', body=body, n=n, seed0=s0, post='alpha_binary', palette=pal)


def boss(i, wave, s0, n, desc, nn, pal):
    body = {'description': BOSS.format(d=desc, n=nn), 'image_size': {'width': 64, 'height': 64}, 'view': 'side', 'outline': 'single color black outline',
            'shading': 'detailed shading', 'detail': 'highly detailed', 'no_background': True}
    return dict(id=i, wave=wave, endpoint='/create-image-pixflux', body=body, n=n, seed0=s0, post='alpha_binary', palette=uniq(pal + ['#000000']))


def sheet():
    b2, mn = spec(B2), spec(MAIN)
    js = []
    # 5a 借圖通貨（bitforge 16，n 3，6801 起每種 3）
    for k, (i, name, desc, main) in enumerate(table(b2, '### 5a'), 1):
        i, desc = code(i)[0], desc
        js.append(bit(i, '5a', 6801 + (k - 1) * 3, 3, desc, nots(desc), uniq(['#000000'] + hexes(main) + CUR_BASE)))
    # 5b 其餘 8 隻王（64，n 4，6901 起每隻 4）
    bosses5b = table(b2, '### 5b')
    for k, (i, name, pal, desc, nn) in enumerate(bosses5b, 1):
        js.append(boss(code(i)[0], '5b', 6901 + (k - 1) * 4, 4, desc, ', no '.join(x.strip() for x in nn.split(',')), hexes(pal)))
    # 5c 戰鬥狀態 16 枚（主檔 §4 狀態表；n 3；seed0＝7001＋(k−1)×3）；<DESC> 沿用 M2-39 §3.2
    m39 = {c[0].strip('`'): c[6] for c in table(M39.read_text(encoding='utf-8'), '### 3.2')}
    for k, c in enumerate(table(mn, '狀態（bitforge 16'), 1):
        i = code(c[0])[0]
        desc = m39[i.removeprefix('ail_')]
        js.append(bit(i, '5c', 7001 + (k - 1) * 3, 3, desc, nots(desc), uniq(['#000000'] + hexes(c[4]) + ['#46413c'])))
    # 5d B3 牌匾（主檔 §5，原樣 n 3、種子 5701／5704／5707）
    plq = {code(c[0])[0]: c for c in table(mn, '## 5. 第 5 表')}
    d = plq['plq_body'][6]
    js.append(dict(id='plq_body', wave='5d', endpoint='/create-image-pixflux', n=3, seed0=5701, post='plq', palette=PLQ_PAL,
                   body={'description': TILE.format(d=d, t=BATTLE), 'image_size': {'width': 96, 'height': 44}, 'view': 'side', 'outline': 'lineless',
                         'shading': 'basic shading', 'detail': 'low detail', 'no_background': False}))
    # 16×44、16×16 低於 pixflux 最小畫布（32×32 面積）：照藥水／小點作法產 2×、最近鄰縮半
    js.append(pix('plq_end', '5d', 5704, 3, plq['plq_end'][6], 'text, hanging chain, logo', 32, 88, PLQ_PAL, shrink=2))
    js.append(pix('plq_corner', '5d', 5707, 3, plq['plq_corner'][6], 'paper-cut, flower, wreath, face, unique orange seal', 32, 32, PLQ_PAL, shrink=2))
    # §6 加候選：只換種子
    tk, tn, ts = table(b2, '### 1a'), table(b2, '### 1b'), table(b2, '### 1c')
    bosses2 = table(b2, '## 2. 王的替身圖')
    for k, (i, name, acc, desc) in enumerate(tk, 1):
        js.append(pix(code(i)[0], '6-1', 8001 + (k - 1) * 4, 4, desc, TREE_NOT, 48, 48, TREE_PAL + ACCENT[acc]))
    for k, (i, name, pal, desc, nn) in enumerate(bosses2, 1):
        js.append(boss(code(i)[0], '6-2', 8601 + (k - 1) * 4, 4, desc, ', no '.join(x.strip() for x in nn.split(',')), hexes(pal)))
    for k, (i, name, pal, desc, nn) in enumerate(bosses5b, 1):
        js.append(boss(code(i)[0], '6-3', 8701 + (k - 1) * 4, 4, desc, ', no '.join(x.strip() for x in nn.split(',')), hexes(pal)))
    for k, (i, name, acc, desc) in enumerate(tn, 1):
        js.append(pix(code(i)[0], '6-4', 8201 + (k - 1) * 2, 2, desc, TREE_NOT, 32, 32, TREE_PAL + ACCENT[acc]))
    for k, (i, name, acc, desc) in enumerate(ts, 1):
        js.append(pix(code(i)[0], '6-5', 8401 + (k - 1) * 2, 2, desc, TREE_NOT, 32, 32, TREE_PAL + ACCENT[acc], shrink=2))
    cnt = {}
    for j in js:
        cnt[j['wave']] = cnt.get(j['wave'], 0) + j['n']
    want = {'5a': 9, '5b': 32, '5c': 48, '5d': 9, '6-1': 92, '6-2': 28, '6-3': 32, '6-4': 88, '6-5': 48}
    assert cnt == want, cnt
    seeds = [(j['id'], j['seed0'] + k) for j in js for k in range(j['n'])]
    assert len(set(seeds)) == len(seeds)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'jobs.json').write_text(json.dumps(js, ensure_ascii=False, indent=2), encoding='utf-8')
    print('寫好 jobs.json', cnt, '共', sum(cnt.values()), '張')


# ---- 量測（同首跑 pixellab_d2_first.py 的量法） ----
def rgba(im):
    return np.asarray(im.convert('RGBA'))


def is_upscaled(a):
    h, w = a.shape[:2]
    if h % 2 or w % 2:
        return False
    s = a[::2, ::2]
    return bool((np.repeat(np.repeat(s, 2, 0), 2, 1) == a).all())


def checker(a, on):
    c = a[..., :3].astype(int) @ [65536, 256, 1]
    p, q, r, s = c[:-1, :-1], c[:-1, 1:], c[1:, :-1], c[1:, 1:]
    o = on[:-1, :-1] & on[:-1, 1:] & on[1:, :-1] & on[1:, 1:]
    return int((o & (p == s) & (q == r) & (p != q)).sum())


def banned(a, on):
    if not on.any():
        return 0
    d = pb.de2000(pb.lab(a[..., :3][on])[:, None, :], pb.lab([pb.hexrgb(c) for c in BAN]))
    return int((d <= 2).any(-1).sum())


def drift(a, on, pal):
    if not on.any():
        return 0, 0
    _, d = pb.nearest(a[..., :3][on], pal)
    return float((d > 3).mean()), float(d.max())


def chroma(a):
    L = pb.lab(a[..., :3])
    return np.hypot(L[..., 1], L[..., 2])


def iou(a, b):
    u = (a | b).sum()
    return float((a & b).sum() / u) if u else 0


def lr_seam(a):
    f = a[..., :3].astype(float)
    inner = np.abs(np.diff(f, axis=1)).sum(-1).mean()
    seam = np.abs(f[:, 0] - f[:, -1]).sum(-1).mean()
    return seam / inner if inner else (0 if seam == 0 else 99)


EYE = {'5a': '1× 可辨、主形對得上名字', '5b': '2× 縮小認得出主特徵、不像現有王或怪', '5c': '16 縮圖對得上驗收句、灰階可分',
       '5d': '拼高 44、拉到 220 接縫、角花翻轉、0 字', '6-1': '48 一眼認得出主形、無圓框字臉', '6-2': '2× 縮小認得出主特徵、不像現有王或怪',
       '6-3': '2× 縮小認得出主特徵、不像現有王或怪', '6-4': '32 一眼認得出主形、無圓框字臉', '6-5': '16 一眼認得出主形、無圓框字臉'}
NAME = {'5a': '5a 借圖通貨', '5b': '5b 其餘 8 隻王', '5c': '5c 戰鬥狀態', '5d': '5d B3 牌匾', '6-1': '§6-1 基石加候選', '6-2': '§6-2 王替身加候選',
        '6-3': '§6-3 其餘 8 隻王加候選', '6-4': '§6-4 大點加候選', '6-5': '§6-5 小點加候選'}


def measure(j, raw, post):
    pal = j['palette']
    ar, ap = rgba(raw), rgba(post)
    on_r, on = ar[..., 3] >= 128, ap[..., 3] == 255
    dr, dmax = drift(ar, on_r, pal)
    m, ok = {'原圖 ΔE>3': f'{dr:.0%}', '最大 ΔE': f'{dmax:.1f}'}, []
    up = is_upscaled(ar)
    m['放大圖'] = '是' if up else '否'
    ok.append(not up)
    bn = banned(ar, on_r)
    m['禁色'] = bn
    ok.append(bn == 0)
    if j['post'] == 'plq' and on.all():  # 匾身不透明
        s = lr_seam(ap)
        m['左右接縫比'] = f'{s:.2f}'
        ok.append(s <= 1.0)
    else:
        cov = float(on.mean())
        m['不透明'] = f'{cov:.0%}'
        ok.append(cov > 0.05)
        m['半透明(原圖)'] = int(((ar[..., 3] > 0) & (ar[..., 3] < 255)).sum())
    sat = float((chroma(ap)[on] > 40).mean()) if on.any() else 0
    m['C*>40'] = f'{sat:.0%}'
    if j['wave'] in ('6-1', '6-4', '6-5'):
        ok.append(sat <= 0.25)
    if j['wave'] == '5d':
        ok.append(sat <= 0.05)
    if ap.shape[1] == 16 and ap.shape[0] == 16:
        ck = checker(ap, on)
        m['棋盤'] = ck
        ok.append(ck <= 6)
    return m, all(ok), on


def contact(rows, scale, bg_rgb=(0x46, 0x41, 0x3c)):
    pad, lab_h = 4, 12
    cell = max([64] + [im.width for _, ims in rows for _, im in ims])
    ch = max([64] + [im.height for _, ims in rows for _, im in ims])
    ncol = max(len(ims) for _, ims in rows)
    W = pad + max(ncol, 2) * (cell + pad)
    H = len(rows) * (ch + pad + lab_h) + pad
    bg = Image.new('RGBA', (W, H), (0x16, 0x13, 0x0f, 255))
    dr = ImageDraw.Draw(bg)
    y = pad
    for jid, ims in rows:
        dr.text((pad, y), jid, fill=(174, 171, 167, 255))
        y += lab_h
        for k, (seed, im) in enumerate(ims):
            x = pad + k * (cell + pad)
            dr.rectangle([x, y, x + cell - 1, y + ch - 1], fill=bg_rgb + (255,))
            bg.alpha_composite(im.convert('RGBA'), (x + (cell - im.width) // 2, y + (ch - im.height) // 2))
            dr.text((x + 1, y + ch - 10), str(seed), fill=(251, 249, 246, 255))
        y += ch + pad
    return bg.resize((W * scale, H * scale), Image.NEAREST) if scale > 1 else bg


def preview(j, p):
    p = p.convert('RGBA')
    if j['id'] == 'plq_body':  # 平鋪到 192 寬看接縫
        out = Image.new('RGBA', (p.width * 2, p.height))
        out.paste(p, (0, 0))
        out.paste(p, (p.width, 0))
        return out
    if p.width <= 16:  # 16：1× 與 2× 並排
        w, h = p.width, p.height
        out = Image.new('RGBA', (w + 2 + 2 * w, 2 * h))
        out.paste(p, (0, h // 2))
        out.paste(p.resize((2 * w, 2 * h), Image.NEAREST), (w + 2, 0))
        return out
    return p


def report():
    js = json.loads((OUT / 'jobs.json').read_text(encoding='utf-8'))
    fdir = OUT / '_failures'
    fmap = {}
    for f in sorted(fdir.glob('*.json')) if fdir.exists() else []:
        x = json.loads(f.read_text(encoding='utf-8'))
        fmap[(x['id'], x['seed'])] = x['error']
    rows, stat, groups, masks = [], {}, {}, {}
    for j in js:
        d = OUT / j['id']
        for k in range(j['n']):
            seed = j['seed0'] + k
            stem = f"{j['id']}-s{seed}"
            st = stat.setdefault(j['wave'], [0, 0, 0])
            f = d / f'{stem}.png'
            if not f.exists():
                if (j['id'], seed) not in fmap:  # 還沒送出：不列
                    continue
                st[1] += 1
                rows.append([j['wave'], j['id'], seed, '失敗', fmap.get((j['id'], seed), '沒有圖（未送出）'), '—', '—'])
                continue
            st[0] += 1
            post = Image.open(d / 'post' / f'{stem}.png')
            m, ok, on = measure(j, Image.open(f), post)
            masks.setdefault(j['wave'], []).append((j['id'], seed, on, len(rows)))
            st[2] += ok
            note = f"API 原圖 `{stem}-{j['body']['image_size']['width']}x{j['body']['image_size']['height']}.png` 最近鄰縮半；" if j.get('shrink') else ''
            rows.append([j['wave'], j['id'], seed, '成功', note + '；'.join(f'{a} {b}' for a, b in m.items()), '✅' if ok else '❌', f"待美術看：{EYE[j['wave']]}"])
            groups.setdefault(j['wave'], {}).setdefault(j['id'], []).append((seed, preview(j, post)))
    # 天賦樹同表跨組剪影 IoU（不同 id 之間取最大）：只回報
    for w, ms in masks.items():
        if w not in ('6-1', '6-4', '6-5'):
            continue
        for i, s, a, r in ms:
            mx = max([iou(a, b) for i2, _, b, _ in ms if i2 != i and b.shape == a.shape] or [0])
            rows[r][4] += f'；跨組最大 IoU {mx:.2f}'
    for w, g in groups.items():
        items = list(g.items())
        contact(items, 1).save(OUT / f'contact-{w}-1x.png')
        contact(items, 4).save(OUT / f'contact-{w}-4x.png')
    head = ['# M2-36 D2 第三批（batch2 §5 的 5a–5d＋§6 加候選）：自動預篩', '',
            '量測用後處理圖（`post/`），色票偏移、放大圖、禁色用原圖。目視項目一律「待美術看」。', '',
            '| 項 | 成功 | 失敗 | 預篩 ✅ | 預篩 ❌ |', '| --- | --- | --- | --- | --- |']
    head += [f'| {NAME[w]} | {a} | {b} | {c} | {a - c} |' for w, (a, b, c) in stat.items()]
    tot = [sum(x[i] for x in stat.values()) for i in range(3)]
    head += [f'| 合計 | {tot[0]} | {tot[1]} | {tot[2]} | {tot[0] - tot[2]} |', '',
             '量法與過關：', '- 共用（主檔 §6）：原圖色票偏移（ΔE>3 比例、最大值，只回報）；放大圖＝最近鄰縮半再放大後與原圖相同（不准）；禁色 `#faaa5e` `#7c5729` `#fa8915`（ΔE≤2，0 像素）；不透明 >5%；16×16 棋盤 ≤6。',
             '- 天賦樹（6-1／6-4／6-5，batch2 §1）：C*>40 ≤25% 不透明；同表跨組剪影 IoU 只回報、不進預篩（規格的 <0.7 是對挑定的那組；每張候選對所有別組候選取最大，圓形主形常互撞，挑圖時再量）。',
             '- 牌匾（5d，主檔 §5）：C*>40 ≤5%；匾身左右接縫比 ≤1.0（接縫不大於體內）。',
             '- 王（5b／6-2／6-3）：色票、禁色、不反鋸齒（alpha_binary 後）；主特徵目視。', '',
             '| 項 | id | 種子 | 結果 | 量測值 | 自動預篩 | 目視 |', '| --- | --- | --- | --- | --- | --- | --- |']
    body = [f'| {w} | `{i}` | {s} | {r} | {m} | {p} | {e} |' for w, i, s, r, m, p, e in rows]
    (OUT / 'results.md').write_text('\n'.join(head + body) + '\n', encoding='utf-8')
    print(json.dumps(stat, ensure_ascii=False), '合計', tot)


if __name__ == '__main__':
    {'sheet': sheet, 'report': report}[sys.argv[1]]()
