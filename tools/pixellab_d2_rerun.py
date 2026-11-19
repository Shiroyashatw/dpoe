#!/usr/bin/env python3
"""M2-36 D2 補跑（dpoe-pixellab-d2-rerun）：照 origin/docs/m2-36-pixellab-d2 的 M2-36-pixellab-d2-reruns.md §1（30 列、111 張）。

原列 body／palette／post 從 b2（art/_tmp/m2-36-d2-b2/jobs-*.json）與 b3（art/_tmp/m2-36-d2-b3/jobs.json）取，
只換 <DESC>、在 <NOT> 後面加詞、換種子與張數。

    python3 tools/pixellab_d2_rerun.py sheet    # 寫 art/_tmp/m2-36-d2-rerun/jobs.json（wave＝列序 1–30）
    python3 tools/pixellab_d2_rerun.py wall     # 程式畫牆面 tile_d2_wallface（0 點）
    python3 tools/pixellab_d2_rerun.py report   # 量測、預篩 → results.md、拼圖
生成：python3 tools/pixellab_batch.py run --sheet art/_tmp/m2-36-d2-rerun/jobs.json --raw art/_tmp/m2-36-d2-rerun --wave 1 [--go]
"""
import json, pathlib, re, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import pixellab_batch as pb

OUT = pb.ROOT / 'art/_tmp/m2-36-d2-rerun'
REF = 'origin/docs/m2-36-pixellab-d2'
RR = 'docs/production/specs/M2-36-pixellab-d2-reruns.md'
SRC = [('origin/art/m2-36-d2-b2', f'art/_tmp/m2-36-d2-b2/jobs-{i}.json') for i in range(1, 7)] + [('origin/art/m2-36-d2-b3', 'art/_tmp/m2-36-d2-b3/jobs.json')]
TREE_PAL = ['#000000', '#33302b', '#615b56', '#aeaba7', '#e8e5e1']


def git(ref, path):
    return subprocess.run(['git', 'show', f'{ref}:{path}'], cwd=pb.ROOT, capture_output=True, text=True, check=True).stdout


def rows():
    t = git(REF, RR)
    t = t[t.index('## 1.'):t.index('## 2.')]
    out = []
    for line in t.splitlines():
        c = [x.strip() for x in line.strip().strip('|').split('|')]
        if len(c) == 10 and c[0].isdigit():
            a, b = map(int, c[4 + 1].split('–'))
            nots = [] if '無' in c[9] else [x.strip() for x in c[9].split(',')]
            out.append(dict(row=int(c[0]), id=c[1].strip('`'), size=c[3], n=int(c[4]), seed0=a, seed1=b, desc=c[8], nots=nots))
    assert len(out) == 30 and sum(r['n'] for r in out) == 111, (len(out), sum(r['n'] for r in out))
    for r in out:
        assert r['seed1'] - r['seed0'] + 1 == r['n'], r
    return out


def src_jobs():
    by = {}
    for ref, p in SRC:
        for j in json.loads(git(ref, p)):
            by.setdefault(j['id'], j)  # 同 id 取第一筆（原列）
    return by


def swap(job, r):
    b = dict(job['body'])
    d = b['description']
    if job['endpoint'] == '/create-image-bitforge':
        m = re.match(r'(tiny 16 pixel game icon, flat front view, )(.*)(, bold, 1 pixel black outline.*)$', d)
        b['description'] = m.group(1) + r['desc'] + m.group(3)
        neg = [x.strip() for x in b['negative_description'].split(',')]
        b['negative_description'] = ', '.join(dict.fromkeys(neg + r['nots']))
    else:
        m = re.match(r'(game (?:item icon, flat front view|boss sprite, .*?three-quarter angle), )(.*?)(, (?:centred|dark fantasy Chinese mythology), .*)$', d)
        tail = m.group(3)
        if r['nots']:
            have = [x.strip() for x in tail.rsplit(', no ', 1)[1].split(',')] if ', no ' in tail else []
            add = [x for x in r['nots'] if x not in have]
            if add:
                tail += ', ' + ', '.join(add)
        b['description'] = m.group(1) + r['desc'] + tail
    return b


def sheet():
    by = src_jobs()
    js = []
    for r in rows():
        j = dict(by[r['id']])
        j['body'] = swap(j, r)
        j.update(wave=str(r['row']), n=r['n'], seed0=r['seed0'], row=r['row'], size=r['size'])
        if r['id'] == 'tn_regen':  # 補跑表補充：點綴改命＋綠
            j['palette'] = TREE_PAL + ['#934341', '#af6c64', '#95e886']
        if j.get('shrink') == 16:
            j['shrink'] = 2
        js.append(j)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'jobs.json').write_text(json.dumps(js, ensure_ascii=False, indent=1), encoding='utf-8')
    for j in js:
        print(j['row'], j['id'], j['body']['image_size'], j['n'], j['seed0'], j.get('shrink', ''))


# ---- 牆面：程式畫（補跑表 §2，0 點） ----
FACE = {'base': '#33302b', 'seam': '#25211e', 'lit': '#46413c'}
# 64×18 = a、b 兩塊 32×18；第 0 列受光線，第 6、12 列石層縫；每層豎縫錯開（左右邊欄不放縫 → 四種接法都無縫）
JOINTS = {'a': [[9, 25], [3, 17], [11, 27]], 'b': [[6, 21], [14, 29], [4, 19]]}


def wall_half(k):
    c = {n: pb.hexrgb(v) for n, v in FACE.items()}
    a = np.zeros((18, 32, 3), np.uint8)
    a[:] = c['base']
    a[0] = c['lit']
    for y in (6, 12):
        a[y] = c['seam']
    for course, (y0, y1) in enumerate(((1, 6), (7, 12), (13, 18))):
        for x in JOINTS[k][course]:
            a[y0:y1, x] = c['seam']
    return a


def wall():
    d = OUT / 'tile_d2_wallface'
    (d / 'post').mkdir(parents=True, exist_ok=True)
    ha, hb = wall_half('a'), wall_half('b')
    Image.fromarray(np.concatenate([ha, hb], 1), 'RGB').save(d / 'tile_d2_wallface-prog.png')
    Image.fromarray(ha, 'RGB').save(d / 'post' / 'tile_d2_wallface-prog-a.png')
    Image.fromarray(hb, 'RGB').save(d / 'post' / 'tile_d2_wallface-prog-b.png')
    # 4×4 平鋪：每列 a b a b／b a b a 交錯，含四種左右接法
    rows = [np.concatenate([ha, hb, ha, hb], 1), np.concatenate([hb, ha, hb, ha], 1)] * 2
    Image.fromarray(np.concatenate(rows, 0), 'RGB').resize((128 * 4, 72 * 4), Image.NEAREST).save(d / 'tile_d2_wallface-prog-4x4.png')
    m = wall_measure(ha, hb)
    (d / 'measure.json').write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(m, ensure_ascii=False))
    return m


def wall_measure(ha, hb):
    L = lambda a: float(pb.lab(a)[..., 0].mean())
    share = lambda a, cs: float(np.isin(a.astype(int) @ [65536, 256, 1], [int(pb.hexrgb(c)[0]) * 65536 + pb.hexrgb(c)[1] * 256 + pb.hexrgb(c)[2] for c in cs]).mean())
    pairs = {'a|a': (ha, ha), 'a|b': (ha, hb), 'b|a': (hb, ha), 'b|b': (hb, hb)}
    seam = {}
    for n, (l, r) in pairs.items():
        f = np.concatenate([l, r], 1).astype(float)
        inner = np.abs(np.diff(f, axis=1)).sum(-1)
        x = l.shape[1] - 1  # 接縫那一欄的差
        s_lr = float(inner[:, x].mean() / np.delete(inner, x, 1).mean())
        wrap = float(np.abs(f[:, 0] - f[:, -1]).sum(-1).mean() / np.delete(inner, x, 1).mean())
        seam[n] = {'接縫比': round(s_lr, 2), '繞回比': round(wrap, 2), '邊欄相同': bool((l[:, -1] == r[:, -1]).all() and (l[:, 0] == r[:, 0]).all())}
    v = float(np.abs(ha[0].astype(float) - ha[-1]).sum(-1).mean())
    return {'尺寸': '64×18（a、b 各 32×18）', '平均 L*': round(L(np.concatenate([ha, hb], 1)), 1), 'a/b 平均 L*': [round(L(ha), 1), round(L(hb), 1)],
            '第 1–17 列 #33302b＋#25211e': f"{share(np.concatenate([ha, hb], 1)[1:], ['#33302b', '#25211e']):.0%}",
            '第 0 列 #46413c': bool(share(np.concatenate([ha, hb], 1)[:1], ['#46413c']) == 1), '左右接法': seam,
            '上下': f'第 0 列受光線與第 17 列不同（設計如此，牆面上下不繞回；4×4 圖上下相接處色差 {v:.0f}）'}


# ---- 量測、預篩 ----
BAN = ['#faaa5e', '#7c5729', '#fa8915']
ELEM = {'ts_light', 'ts_chaos'}  # 補跑表 §0-2：元素本身是主體 → C*>40 上限 80%
OUTLINE_OK = {'ts_es': '主體就是六角外框', 'slot_ring': '主體就是環（窄橢圓）'}


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


def frame_check(on):
    """圓框：外圈環帶（0.72–1.0 R）角度覆蓋 ≥80% 且環帶內不透明 ≥35%、中心區比環帶空；
    底盤：剪影對同面積圓 IoU ≥0.87（實心圓盤），或外接框 ≥80% 畫布且框內填滿 ≥90%（方底）"""
    h, w = on.shape
    if not on.any():
        return None
    yy, xx = np.mgrid[:h, :w]
    ys, xs = np.nonzero(on)
    cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2
    R = max(ys.max() - ys.min(), xs.max() - xs.min()) / 2 + 0.5
    r = np.hypot(yy - cy, xx - cx) / R
    ang = (np.degrees(np.arctan2(yy - cy, xx - cx)) % 360 // 15).astype(int)
    band = (r >= 0.72) & (r <= 1.0)
    cov = len(set(ang[band & on].tolist())) / 24
    dens = on[band].mean() if band.any() else 0
    core = on[r < 0.45].mean() if (r < 0.45).any() else 0
    why = []
    if R >= 0.3 * min(h, w) and cov >= 0.8 and dens >= 0.35 and core < dens:
        why.append(f'圓框（外圈角度覆蓋 {cov:.0%}、環帶 {dens:.0%}、中心 {core:.0%}）')
    Re = np.sqrt(on.sum() / np.pi)  # 同面積圓（放在重心）跟剪影的 IoU：圓盤、圓盾底 ≥0.87
    dk = np.hypot(yy - ys.mean(), xx - xs.mean()) <= Re
    ciou = (on & dk).sum() / (on | dk).sum()
    if Re >= 0.3 * min(h, w) and ciou >= 0.87:
        why.append(f'實心圓盤／圓底（剪影對同面積圓 IoU {ciou:.2f}）')
    bh, bw = ys.max() - ys.min() + 1, xs.max() - xs.min() + 1
    fill = on[ys.min():ys.max() + 1, xs.min():xs.max() + 1].mean()
    if bh >= 0.8 * h and bw >= 0.8 * w and fill >= 0.9:
        why.append(f'方形底盤（外接框 {bw}×{bh}、填滿 {fill:.0%}）')
    return '、'.join(why) or None


def measure(j, raw, post):
    pal = j['palette']
    ar, ap = rgba(raw), rgba(post)
    on_r, on = ar[..., 3] >= 128, ap[..., 3] == 255
    m, bad = {}, []
    if on_r.any():
        _, d = pb.nearest(ar[..., :3][on_r], pal)
        m['原圖 ΔE>3'], m['最大 ΔE'] = f'{(d > 3).mean():.0%}', f'{d.max():.1f}'
    up = is_upscaled(ar)
    m['放大圖'] = '是' if up else '否'
    up and bad.append('原圖是放大圖')
    bn = int((pb.de2000(pb.lab(ar[..., :3][on_r])[:, None, :], pb.lab([pb.hexrgb(c) for c in BAN])) <= 2).any(-1).sum()) if on_r.any() else 0
    m['禁色'] = bn
    bn and bad.append(f'禁色 {bn} 像素')
    cov = float(on.mean())
    m['不透明'] = f'{cov:.0%}'
    cov <= 0.05 and bad.append('幾乎全透明')
    m['半透明(原圖)'] = int(((ar[..., 3] > 0) & (ar[..., 3] < 255)).sum())
    L = pb.lab(ap[..., :3])
    sat = float((np.hypot(L[..., 1], L[..., 2])[on] > 40).mean()) if on.any() else 0
    m['C*>40'] = f'{sat:.0%}'
    tree = j['id'][:3] in ('tk_', 'tn_', 'ts_')
    if tree:
        cap = 0.8 if j['id'] in ELEM else 0.25
        m['C* 上限'] = f'{cap:.0%}'
        sat > cap and bad.append(f'C*>40 {sat:.0%} 超過 {cap:.0%}')
    if j['id'] == 'plq_corner':
        sat > 0.05 and bad.append(f'C*>40 {sat:.0%} 超過 5%')
    if ap.shape[:2] == (16, 16):
        ck = checker(ap, on)
        m['棋盤'] = ck
        ck > 6 and bad.append(f'棋盤 {ck} 超過 6')
    if not j['id'].startswith('boss_'):
        fr = frame_check(on)
        if fr and j['id'] in OUTLINE_OK:
            m['外框判定'] = f'{fr}（{OUTLINE_OK[j["id"]]}，不擋，待美術看）'
        elif fr:
            bad.append(fr)
    return m, bad, on


def contact(rows, scale):
    pad, lab_h = 4, 12
    cell = max([64] + [im.width for _, ims in rows for _, im in ims])
    ch = max([64] + [im.height for _, ims in rows for _, im in ims])
    ncol = max(len(ims) for _, ims in rows)
    W, H = pad + max(ncol, 2) * (cell + pad), len(rows) * (ch + pad + lab_h) + pad
    bg = Image.new('RGBA', (W, H), (0x16, 0x13, 0x0f, 255))
    dr = ImageDraw.Draw(bg)
    y = pad
    for jid, ims in rows:
        dr.text((pad, y), jid, fill=(174, 171, 167, 255))
        y += lab_h
        for k, (seed, im) in enumerate(ims):
            x = pad + k * (cell + pad)
            dr.rectangle([x, y, x + cell - 1, y + ch - 1], fill=(0x46, 0x41, 0x3c, 255))
            bg.alpha_composite(im.convert('RGBA'), (x + (cell - im.width) // 2, y + (ch - im.height) // 2))
            dr.text((x + 1, y + ch - 10), str(seed), fill=(251, 249, 246, 255))
        y += ch + pad
    return bg.resize((W * scale, H * scale), Image.NEAREST) if scale > 1 else bg


SEG = {'A 王 1、17': {1, 17}, 'B 基石 tk 2、18、19': {2, 18, 19}, 'C 大點 tn 3–9、21': {3, 4, 5, 6, 7, 8, 9, 21},
       'D 小點 ts 10–16、20': {10, 11, 12, 13, 14, 15, 16, 20}, 'E 部位／狀態／通貨／牌匾 22–30': set(range(22, 31))}


def report():
    js = json.loads((OUT / 'jobs.json').read_text(encoding='utf-8'))
    ff = OUT / 'failures.json'
    fmap = {(x['id'], x['seed']): x['error'] for x in (json.loads(ff.read_text(encoding='utf-8')) if ff.exists() else [])}
    rows, stat, groups, masks = [], {}, {}, []
    for j in js:
        d = OUT / j['id']
        for k in range(j['n']):
            seed = j['seed0'] + k
            stem = f"{j['id']}-s{seed}"
            f = d / f'{stem}.png'
            st = stat.setdefault(j['row'], [j['id'], j['n'], 0, 0, 0])
            if not f.exists():
                if (j['id'], seed) in fmap:
                    st[3] += 1
                    rows.append([j['row'], j['id'], seed, '失敗', fmap[(j['id'], seed)], '—'])
                else:
                    rows.append([j['row'], j['id'], seed, '未送出', '—', '—'])
                continue
            st[2] += 1
            if j.get('shrink'):  # 32 原圖最近鄰縮半 → 16，再 alpha_binary
                im = Image.open(f).convert('RGBA')
                sm = im.resize((im.width // j['shrink'], im.height // j['shrink']), Image.NEAREST)
                pb.alpha_binary(sm, pb.palette(j))[0][0].save(d / 'post' / f'{stem}.png')
            post = Image.open(d / 'post' / f'{stem}.png')
            m, bad, on = measure(j, Image.open(f), post)
            st[4] += not bad
            masks.append((j['id'], seed, on, len(rows)))
            note = f'原圖 {Image.open(f).width}，post 縮成 {post.width}；' if j.get('shrink') else ''
            rows.append([j['row'], j['id'], seed, '成功', note + '；'.join(f'{a} {b}' for a, b in m.items()), '✅' if not bad else '❌ ' + '；'.join(bad)])
            groups.setdefault(j['row'], (j['id'], []))[1].append((seed, post if post.width > 16 else post.resize((32, 32 * post.height // post.width), Image.NEAREST)))
    # IoU：天賦（tk／tn／ts 同層）與部位跟本批別 id 比，只回報
    for i, s, a, r in masks:
        tier = i[:3] if i[:3] in ('tk_', 'tn_', 'ts_') else ('slot' if i.startswith('slot_') else None)
        if not tier:
            continue
        o = [b for i2, _, b, _ in masks if i2 != i and i2.startswith(tier if tier != 'slot' else 'slot_') and b.shape == a.shape]
        u = lambda x, y: float((x & y).sum() / (x | y).sum()) if (x | y).any() else 0
        rows[r][4] += f'；本批別組最大 IoU {max([u(a, b) for b in o] or [0]):.2f}（只回報）'
    for name, rs in SEG.items():
        items = [groups[k] for k in sorted(groups) if k in rs]
        if items:
            tag = name.split()[0]
            contact(items, 1).save(OUT / f'contact-{tag}-1x.png')
            contact(items, 4).save(OUT / f'contact-{tag}-4x.png')
    wm = json.loads((OUT / 'tile_d2_wallface' / 'measure.json').read_text(encoding='utf-8'))
    head = ['# M2-36 D2 補跑（補跑表 §1 30 列＋§2 牆面程式畫）：自動預篩', '',
            '量測用後處理圖（`post/`），色票偏移、放大圖、禁色用原圖。目視項目一律待美術看；預篩只自動擋得到的。', '',
            '預篩規則（補跑表 §0＋色票負責人 11/19 新定）：',
            '- 擋：原圖是放大圖、禁色 `#faaa5e` `#7c5729` `#fa8915`（ΔE≤2）、不透明 ≤5%、16×16 棋盤 >6、**圓框**、**底盤**（實心圓盤或方形底），❌ 後面寫原因。',
            '- 天賦樹 tk／tn／ts：C*>40 ≤25%；元素本身是主體（`ts_light`、`ts_chaos`）≤80%。牌匾角花 ≤5%。',
            '- 天賦樹與部位的 IoU（跟本批別組比）只列出來，不淘汰。',
            '- 圓框判定：外圈環帶（0.72–1.0 R）角度覆蓋 ≥80%、環帶不透明 ≥35% 且中心比環帶空；底盤：剪影跟同面積圓（放重心）IoU ≥0.87，或外接框 ≥80% 畫布且填滿 ≥90%。`ts_es`（六角外框）、`slot_ring`（環）主體就是外框，判到也不擋、標待美術看。王不判外框。', '',
            '## 每列', '', '| 序 | id | 張 | 成功 | 失敗 | 預篩 ✅ |', '| --- | --- | --- | --- | --- | --- |']
    head += [f'| {k} | `{v[0]}` | {v[1]} | {v[2]} | {v[3]} | {v[4]} |' for k, v in sorted(stat.items())]
    tot = [sum(v[i] for v in stat.values()) for i in (1, 2, 3, 4)]
    head += [f'| 合計 | | {tot[0]} | {tot[1]} | {tot[2]} | {tot[3]} |', '',
             '## 牆', '', '- 牆頂：沿用 `tile_d2_walltop-s5221`（首跑原圖＋新後處理，在 `origin/art/m2-36-d2-b2`），不補跑，s5323 不重送。',
             f"- 牆面 `tile_d2_wallface`：程式畫（0 點），`tile_d2_wallface/tile_d2_wallface-prog.png`（64×18）、`post/…-a.png`／`-b.png`、4×4 平鋪 `tile_d2_wallface-prog-4x4.png`。",
             f"- 平均 L\\* {wm['平均 L*']}（a {wm['a/b 平均 L*'][0]}／b {wm['a/b 平均 L*'][1]}，要 17–23）；第 1–17 列 `#33302b`＋`#25211e` {wm['第 1–17 列 #33302b＋#25211e']}；第 0 列 `#46413c` {'是' if wm['第 0 列 #46413c'] else '否'}。",
             '- 左右四種接法：' + '；'.join(f"{k} 接縫比 {v['接縫比']}、邊欄相同 {'是' if v['邊欄相同'] else '否'}" for k, v in wm['左右接法'].items()) + '（接縫比 ≤1.0 算無縫）。',
             f"- {wm['上下']}。", '',
             '## 每張', '', '| 序 | id | 種子 | 結果 | 量測值 | 自動預篩 |', '| --- | --- | --- | --- | --- | --- |']
    body = [f'| {a} | `{b}` | {c} | {d} | {e} | {f} |' for a, b, c, d, e, f in rows]
    (OUT / 'results.md').write_text('\n'.join(head + body) + '\n', encoding='utf-8')
    print('合計 張/成功/失敗/✅', tot)


if __name__ == '__main__':
    {'sheet': sheet, 'wall': wall, 'report': report}[sys.argv[1]]()
