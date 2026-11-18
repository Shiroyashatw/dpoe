#!/usr/bin/env python3
"""M2-40 R5c 技能圖示（第 3 輪）：照 docs/production/specs/M2-40-skill-icon-prompts.md（R5c，cc7b018）生成、後處理、檢查。
在 dpoe/ 底下跑：
    python3 -I <本檔> preview <批> id:k,...      # 只預覽
    python3 -I <本檔> go <批> id:k,...           # 送出（k=0 首跑、1 重跑 1、2 重跑 2），接著後處理＋檢查
    python3 -I <本檔> check id:stem,...          # 只重做後處理＋檢查，不花生成
端點：POST /v2/create-image-pixflux，不給 style_image、init_image、color_image；不要的寫 negative_description（端點不收就退回 description 的 no …）。
後處理不吸色。金鑰只讀環境變數，沒有就交給雲端代理（tools/pixellab_batch.py 的 http()）。
"""
import base64, csv, io, json, pathlib, sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import r5  # 第 1 輪：工作表（prompt、palette、seed0、欄）、舊圖切圖、遮罩、IoU、16 縮圖
from r5 import P, TOK, JOBS, EXTRA, DROP, RAW, OUT, EV, VOID, old_img, old_sets, mask, iou, thumb16, checker

CAP = 28
ROUND = 'r5c'
SEED_ADD = 2000
ENDPOINT = '/create-image-pixflux'
REFS = ['sk_markshot', 'sk_hasteaura', 'sk_sacrifice', 'sk_iceshatter', 'sk_decay']
STATE = EV / 'r5c_state.json'
REVIEW = EV / 'r5c_review.csv'
NEG_FALLBACK = False  # 端點不收 negative_description 時改 True

COLOURS = {  # §3 palette 欄的色相（只當主色方向，不鎖色）
    'sk_deadeye': 'ivory white dice with bright red and olive gold pips, dark brown shadows',
    'sk_clarity': 'deep blue and pale cyan with white highlights',
    'sk_purityaura': 'orange-red, pale cyan and pale yellow gems with white highlights',
    'sk_staticfield': 'pale yellow and olive gold with white highlights, dark storm grey',
    'sk_summongod': 'lavender, orange and pale yellow with tarnished bronze',
    'sk_ironaura': 'dark grey-brown iron and bronze tan with cream highlights and dark red',
    'sk_despair': 'magenta-pink with dark brown and pale grey',
    'sk_weaken': 'grey-brown and bronze tan armour with magenta-pink cracks and white highlights',
    'sk_holyshield': 'grey-brown steel and bronze tan with cream and white highlights',
    'sk_bloodlust': 'dark blood red and bright red-pink with white highlights',
    'sk_fireburst': 'orange, olive gold and dark red',
    'sk_gasflask': 'magenta-pink poison, dark brown glass, bronze tan cork, white highlights',
    'sk_oilgrenade': 'olive gold oil, bronze tan, dark brown and grey-brown',
    'sk_refract': 'bronze tan and white arrow with orange, pale cyan and pale yellow light',
    'sk_tidepull': 'pale cyan and deep blue water with pale yellow and white foam',
    'sk_windflask': 'lime green and white wind, bronze tan and dark brown glass',
    'sk_assassinate': 'bone white steel with red and dark brown',
    'sk_combust': 'grey-brown iron and bronze tan with orange and olive gold spark',
    'sk_doom': 'grey-brown and cream gold with dark red and white highlights',
    'sk_rage': 'bronze tan with dark red and bright red',
    'sk_talisman': 'cream paper with light grey shading and dark red',
    'sk_exorcise': 'magenta-pink and lavender with white highlights',
    'sk_fire': 'orange, olive gold and dark red',
    'sk_meteor': 'grey-brown rock and bronze tan with orange and olive gold flames',
}
DESC = ('fantasy action RPG skill icon, {s}, main colours {c}, rich shading with highlights and shadows, '
        'light from the top-left, 1 pixel black outline, 1 pixel transparent margin')
NEG = 'text, letters, background, circular badge, round frame, flat colours, plain silhouette, {n}'
BODY = {'image_size': {'width': 32, 'height': 32}, 'outline': 'single color black outline', 'shading': 'detailed shading',
        'detail': 'highly detailed', 'no_background': True}
RERUN_NOT = json.loads((EV / 'r5c_rerun_not.json').read_text(encoding='utf-8')) if (EV / 'r5c_rerun_not.json').exists() else {}


def seed(i, k):
    return JOBS[i]['seed0'] + SEED_ADD + 100 * k


def desc(i, k):
    """(description, negative_description)；NEG_FALLBACK 時 negative 併進 description 的 no …"""
    j = JOBS[i]
    no = j['no'] + (', ' + RERUN_NOT[i] if k >= 1 and i in RERUN_NOT else '')
    d, n = DESC.format(s=j['prompt'], c=COLOURS[i]), NEG.format(n=no)
    if NEG_FALLBACK:
        return d + ', ' + ', '.join('no ' + x.strip() for x in n.split(',')), None
    return d, n


# ---- 花費 ----
def spent():
    rows = list(csv.DictReader((EV / 'spend.csv').open(encoding='utf-8')))
    return sum(int(r['generations'] or 0) for r in rows if r['batch'].startswith(ROUND + '-'))


def bal():
    return round(P.http('GET', '/balance')['subscription']['generations'], 2)


def gen(i, k):
    global NEG_FALLBACK
    s = seed(i, k)
    stem = f'{i}-s{s}'
    d = RAW / i
    if (d / f'{stem}.png').exists():
        return stem
    while True:
        dd, nn = desc(i, k)
        body = dict(BODY, description=dd, seed=s)
        if nn:
            body['negative_description'] = nn
        try:
            r = P.http('POST', ENDPOINT, body)
            break
        except SystemExit as e:  # 端點拒收 negative_description（4xx 且提到它）→ 退回 no …；其他錯誤照停
            if nn and 'negative' in str(e) and not NEG_FALLBACK:
                print('  negative_description 被拒，退回 description 的 no …：', str(e)[:200])
                NEG_FALLBACK = True
                continue
            raise
    d.mkdir(parents=True, exist_ok=True)
    Image.open(io.BytesIO(base64.b64decode(r['image']['base64']))).save(d / f'{stem}.png')
    (d / f'{stem}.json').write_text(json.dumps({'round': ROUND, 'endpoint': 'POST /v2' + ENDPOINT, 'job': i, 'seed': s, 'rerun': k,
                                                'negative_description_accepted': not NEG_FALLBACK, 'request': body, 'usage': r.get('usage')},
                                               ensure_ascii=False, indent=2), encoding='utf-8')
    print('  完成', stem, r.get('usage'))
    return stem


def run(batch, items, go):
    s = spent()
    print(f'批 {ROUND}-{batch}：{len(items)} 張（本輪已花 {s}／{CAP}）')
    if s + len(items) > CAP:
        sys.exit(f'已花＋本批 > {CAP}，停')
    if len(items) > 5:
        sys.exit('一批最多 5 張')
    for i, k in items:
        dd, nn = desc(i, k)
        print(f'- {i} s{seed(i, k)}\n  description: {dd}\n  negative_description: {nn}')
    if not go:
        return print('只是預覽')
    b0 = bal()
    stems = [gen(i, k) for i, k in items]
    b1 = bal()
    with (EV / 'spend.csv').open('a', encoding='utf-8', newline='') as f:
        csv.writer(f).writerow([f'{ROUND}-{batch}', ' '.join(stems), b0, b1, len(items), s + len(items)])
    print('餘額', b0, '→', b1)
    return stems


# ---- 後處理（§4）：alpha_binary、外緣 1 px --scene-void、1 px 透明邊、去 2 px 角；不吸色 ----
def n4(m):
    p = np.pad(m, 1)
    return p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]


def n8(m):
    p = np.pad(m, 1)
    return n4(m) & p[:-2, :-2] & p[:-2, 2:] & p[2:, :-2] & p[2:, 2:]


def merge_colours(a, m, cap=32):
    """色數 > cap：只把最相近的兩色併起來（少的併進多的），直到 ≤ cap；不壓平"""
    while True:
        cols, inv, cnt = np.unique(a[m][:, :3], axis=0, return_inverse=True, return_counts=True)
        if len(cols) <= cap:
            return a
        L = P.lab(cols.astype(float))
        d = P.de2000(L[:, None, :], L[None, :, :])
        np.fill_diagonal(d, 1e9)
        x, y = np.unravel_index(d.argmin(), d.shape)
        lo, hi = (x, y) if cnt[x] < cnt[y] else (y, x)
        sel = m & (a[..., :3] == cols[lo]).all(-1)
        a[sel, :3] = cols[hi]


def postproc(src):
    a = np.asarray(src.convert('RGBA')).copy()
    m = a[..., 3] >= 128
    m[0, :] = m[-1, :] = m[:, 0] = m[:, -1] = False
    a[~m] = 0
    a[m, 3] = 255
    void = np.array(P.hexrgb(TOK[VOID]), np.uint8)
    edge = m & ~n4(m)
    a[edge, :3] = void
    L = P.lab(a[..., :3].astype(float))[..., 0]
    near_t = m & n4(m) & ~n8(m)  # 只斜角碰到透明的內部像素
    fixed = 0
    for y, x in zip(*np.nonzero(near_t & (L < 12))):  # 接在外緣上又是近黑 → 2 px 角，改成鄰近的非暗色
        nb = [tuple(a[yy, xx, :3]) for yy in range(y - 1, y + 2) for xx in range(x - 1, x + 2)
              if m[yy, xx] and not edge[yy, xx] and L[yy, xx] >= 12]
        if nb:
            a[y, x, :3] = max(set(nb), key=nb.count)
            fixed += 1
    vm = m & (a[..., :3] == void).all(-1)
    for y in range(31):  # 外緣上 2×2 全是描邊色 → 裡面那幾格改成鄰近的非暗色
        for x in range(31):
            if vm[y:y + 2, x:x + 2].all() and edge[y:y + 2, x:x + 2].any():
                for yy, xx in [(y + dy, x + dx) for dy in (0, 1) for dx in (0, 1) if not edge[y + dy, x + dx]]:
                    nb = [tuple(a[p, q, :3]) for p in range(yy - 1, yy + 2) for q in range(xx - 1, xx + 2) if m[p, q] and L[p, q] >= 12]
                    if nb:
                        a[yy, xx, :3] = max(set(nb), key=nb.count)
                        vm[yy, xx] = False
                        fixed += 1
            if vm[y:y + 2, x:x + 2].all() and edge[y:y + 2, x:x + 2].all():  # 細到全是描邊的 2×2：拿掉鄰居最少的那格
                yy, xx = min([(y + dy, x + dx) for dy in (0, 1) for dx in (0, 1)], key=lambda q: m[q[0] - 1:q[0] + 2, q[1] - 1:q[1] + 2].sum())
                m[yy, xx] = vm[yy, xx] = False
                a[yy, xx] = 0
                fixed += 1
    a = merge_colours(a, m)
    return Image.fromarray(a, 'RGBA'), {'fixed_corners': fixed}


# ---- 檢查（§5）----
def style(im):
    """畫風：不透明且非描邊（外緣與 --scene-void 色以外）的色數、L* 最大減最小"""
    a = np.asarray(im.convert('RGBA'))
    m = a[..., 3] > 127
    inner = m & n4(m) & ~(a[..., :3] == P.hexrgb(TOK[VOID])).all(-1)
    px = a[inner][:, :3]
    if not len(px):
        return 0, 0.0
    L = P.lab(px.astype(float))[:, 0]
    return len({tuple(p) for p in px}), round(float(L.max() - L.min()), 1)


def stats(im):
    a = np.asarray(im.convert('RGBA'))
    m = a[..., 3] > 127
    ys, xs = np.nonzero(m)
    box = (np.ptp(ys) + 1) * (np.ptp(xs) + 1) if ys.size else 1
    t = thumb16(im)
    L = P.lab(a[..., :3].astype(float))[..., 0]
    cls = np.where(L < 35, 0, np.where(L < 70, 1, 2))
    lone = sum(cls[y, x] not in [cls[yy, xx] for yy in range(max(0, y - 1), min(32, y + 2)) for xx in range(max(0, x - 1), min(32, x + 2))
                                 if (yy, xx) != (y, x) and m[yy, xx]] for y, x in zip(ys, xs))
    edge = m & ~n4(m)
    vm = m & (a[..., :3] == P.hexrgb(TOK[VOID])).all(-1)
    thick = sum(int(vm[y:y + 2, x:x + 2].all() and edge[y:y + 2, x:x + 2].any()) for y in range(31) for x in range(31))
    sc, sl = style(im)
    return {'fill': round(m.sum() / 1024, 3), 'box_fill': round(m.sum() / box, 3), 'fill16': round(mask(t).sum() / 256, 3),
            'checker32': checker(m), 'checker16': checker(mask(t)), 'noise': round(lone / max(1, m.sum()), 3),
            'colors': len({tuple(p) for p in a[m][:, :3]}), 'style_colors': sc, 'style_dL': sl,
            'outline_void': bool((a[edge][:, :3] == P.hexrgb(TOK[VOID])).all()), 'margin_1px': not (m[0].any() or m[-1].any() or m[:, 0].any() or m[:, -1].any()),
            'void_2x2_at_edge': thick, 'chase': int((a[m][:, :3] == P.hexrgb(TOK['--rar-chase'])).all(1).sum())}


def state():
    return json.loads(STATE.read_text(encoding='utf-8')) if STATE.exists() else {}


def sets_now(st, cand=None):
    """同欄集：沒被取代的舊圖＋本輪已過的新圖（＋這批候選）"""
    o = old_sets()
    out = {}
    for bar in 'SA':
        ids = {i for i in o[bar] if i not in DROP[bar] and not (i in JOBS and JOBS[i]['bar'] == bar)}
        ims = {i: old_img(i) for i in ids}
        for i, s in {**st, **(cand or {})}.items():
            if JOBS[i]['bar'] == bar and s:
                ims[i] = Image.open(OUT / i / f'{s}.png')
        out[bar] = ims
    return out


def evaluate(i, stem, st, cand):
    j = JOBS[i]
    im = Image.open(OUT / i / f'{stem}.png')
    s = stats(im)
    sets = sets_now(st, cand)
    m, m16 = mask(im), mask(thumb16(im))
    rows, worst, worst16 = [], (0, ''), (0, '')
    others = {k: v for k, v in sets[j['bar']].items() if k != i}
    for e in EXTRA.get(i, []):
        others.setdefault(e, old_img(e))
    for k, v in sorted(others.items()):
        a, b = round(iou(m, mask(v)), 3), round(iou(m16, mask(thumb16(v))), 3)
        rows.append((i, stem, j['bar'], k, a, b))
        worst, worst16 = max(worst, (a, k)), max(worst16, (b, k))
    style_ok = s['style_colors'] >= 8 and s['style_dL'] >= 35
    fails = []
    if not style_ok:
        fails.append(f"畫風 色數 {s['style_colors']}／L* 差 {s['style_dL']}")
    if worst[0] >= 0.6:
        fails.append(f'IoU32 {worst[0]} {worst[1]}')
    if not 0.15 <= s['fill'] <= 0.5:
        fails.append(f"填滿率 {s['fill']}")
    if s['box_fill'] > 0.75:
        fails.append(f"外框填滿率 {s['box_fill']}")
    if s['fill16'] > 0.6:
        fails.append(f"16 填滿率 {s['fill16']}")
    if s['checker16'] > 6:
        fails.append(f"16 棋盤 {s['checker16']}")
    if s['colors'] > 32:
        fails.append(f"色數 {s['colors']}")
    if s['noise'] > 0.03:
        fails.append(f"雜點 {s['noise']}")
    if s['chase']:
        fails.append('追逐色')
    if not (s['outline_void'] and s['margin_1px']) or s['void_2x2_at_edge']:
        fails.append('描邊')
    return dict(id=i, stem=stem, bar=j['bar'], style=('過' if style_ok else '不過'), iou32_max=worst[0], iou32_with=worst[1],
                iou16_max=worst16[0], iou16_with=worst16[1], **s,
                result='過' if not fails else '不過', why='；'.join(fails)), rows


def check(pairs):
    st = state()
    cand = {}
    for i, stem in pairs:
        im, info = postproc(Image.open(RAW / i / f'{stem}.png'))
        (OUT / i).mkdir(parents=True, exist_ok=True)
        im.save(OUT / i / f'{stem}.png')
        cand[i] = stem
    res = []
    for i, stem in pairs:
        r, _ = evaluate(i, stem, st, cand)
        res.append(r)
        print(r['id'], r['stem'], r['result'], '畫風', r['style'], r['style_colors'], r['style_dL'], '|', r['why'], '| IoU32', r['iou32_max'], r['iou32_with'],
              'fill', r['fill'], r['box_fill'], 'f16', r['fill16'], 'noise', r['noise'])
    for r in res:
        if r['result'] == '過':
            st[r['id']] = r['stem']
    STATE.write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding='utf-8')
    new = not REVIEW.exists()
    with REVIEW.open('a', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, list(res[0].keys()))
        new and w.writeheader()
        w.writerows(res)
    return res


def ref_style():
    """對照：參考圖的畫風量測"""
    for r in REFS:
        print(r, style(old_img(r)))


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd in ('preview', 'go'):
        items = [(x.split(':')[0], int(x.split(':')[1])) for x in sys.argv[3].split(',')]
        stems = run(sys.argv[2], items, cmd == 'go')
        if stems:
            check(list(zip([i for i, _ in items], stems)))
    elif cmd == 'check':
        check([tuple(x.split(':')) for x in sys.argv[2].split(',')])
    elif cmd == 'refs':
        ref_style()
