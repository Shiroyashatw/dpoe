#!/usr/bin/env python3
"""M2-40 R5 技能圖示：照 docs/production/specs/M2-40-skill-icon-prompts.md 生成、後處理、檢查。
在 dpoe/ 底下跑：python3 -I <本檔> {preview|go|check|evidence} [--batch A1] [--rerun id:k,...]
呼叫與色票沿用 tools/pixellab_batch.py（金鑰只讀環境變數，沒有就交給雲端代理）。
"""
import base64, csv, io, json, pathlib, re, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = pathlib.Path.cwd()
sys.path.insert(0, str(ROOT / 'tools'))
import pixellab_batch as P

RAW = ROOT / 'art/_raw/skill'
OUT = ROOT / 'art/icons/skill'
EV = ROOT / 'docs/production/evidence/m2-40-icons'
CAP = 40
TOK = dict(P.tokens(), **{'--paper': '#e6d9bd'})  # --paper 不在色票檔，取 css/style.css
VOID = '--scene-void'

# id, 欄, 批, palette, prompt, not（§3.1、§3.2）
J = '''
sk_deadeye|S|A0|--scene-void --tx-strong --warn --bad --panel-inset|two dice side by side, the right one tipped up on its corner and higher than the left, a few pips showing|eye, target, shield, face, centred disc
sk_clarity|A|A1|--scene-void --mp --el-cold --tx-strong|an open crescent moon facing right with two small water droplets falling from its lower tip|full disc, ring, shield
sk_purityaura|A|A1|--scene-void --el-fire --el-cold --el-light --tx-strong|three small separate gems in a triangle, joined by thin lines, empty centre|ring, single crystal, disc
sk_staticfield|A|A1|--scene-void --el-light --warn --tx-strong|a flat storm cloud band across the top, one thick lightning bolt striking down to the lower left|round burst, sun, disc
sk_summongod|A|A1|--scene-void --awk --el-fire --el-light --border-mid|a broken shackle, two C-shaped halves pulled apart diagonally with a clear gap|human figure, arch, square block
sk_ironaura|A|A1|--scene-void --border --border-mid --border-cap --hp|a broad tower shield with a flat bottom, top-right corner cut away showing a short sword tip|ring, round badge, cross
sk_despair|S|A2|--scene-void --el-chaos --panel-inset --tx-dim|a drooping broken stem bent into a hook, tip pointing down, one falling petal|mask, face, skull, diamond
sk_weaken|S|A2|--scene-void --el-chaos --border --border-mid --tx-strong|an armour plate cracked diagonally into two offset pieces with a gap, a tiny diamond pip at the top right|whole shield, disc, down arrow
sk_holyshield|S|A2|--scene-void --border --border-mid --border-cap --tx-strong|a small tilted shield at the top right flying away, two curved speed arcs trailing to the lower left|cross on shield, centred shield
sk_bloodlust|S|A2|--scene-void --hp --bad --tx-strong|three parallel diagonal claw slashes from top-left to bottom-right, one blood drip at each end|blood orb, face
sk_fireburst|S|A2|--scene-void --el-fire --warn --hp|a hollow ring of fire with six short flame tongues pointing outward, empty centre|solid fireball, filled disc
sk_gasflask|S|A3|--scene-void --el-chaos --panel-inset --border-mid --tx-strong|a small vial at the lower left tipped toward the upper right, a large three-lobed poison cloud billowing out|tornado, skull, round flask in centre
sk_oilgrenade|S|A3|--scene-void --warn --border-mid --panel-inset --border|a wide flat oil puddle along the bottom, a small round pot bouncing above it at the upper left, separated|bomb fuse, flame, centred ball
sk_refract|S|A3|--scene-void --border-mid --tx-strong --el-fire --el-cold --el-light|one arrow stuck straight down into a short ground strip, three short light rays fanning up from its tail|target, bow, diagonal arrow
sk_tidepull|S|A3|--scene-void --el-cold --mp --el-light --tx-strong|a curling wave forming an inward spiral, one thick spiral line, open centre|ice crown, ring of spikes, snowflake
sk_windflask|S|A3|--scene-void --good --tx-strong --border-mid --panel-inset|a tall thin upright vial on the left, two long wind streaks pulled out to the right|feather, round flask, tornado
sk_assassinate|S|A4|--scene-void --el-phys --tx-strong --bad --panel-inset|a single dagger stabbing diagonally from top-left to bottom-right, a small hollow reticle ring at the pommel|hooded figure, face, triangle
sk_combust|S|A4|--scene-void --border --border-mid --el-fire --warn|a round bomb at the lower left, a long curved fuse reaching the upper right, a four-point spark at its end|heart, pedestal, centred bomb
sk_doom|S|A4|--scene-void --border --border-cap --hp --tx-strong|a wide three-spike crown on top joined to a small hollow ring below|flaming figure, face, solid disc
sk_rage|S|A4|--scene-void --border-mid --hp --bad|a bear paw print, one large pad and four separate toe pads, two short cracks under it|angry face, fist, disc
sk_talisman|S|A5|--scene-void --paper --tx-dim --hp|a flat paper cut-out doll, arms spread, legs apart, leaning slightly right, featureless|scroll, banner, vertical strip, face
sk_exorcise|S|A5|--scene-void --el-chaos --tx-strong --awk|a hollow diamond shattered into four shards flying out to the corners, empty centre|paper scroll, flame column
sk_fire|S|A5|--scene-void --el-fire --warn --hp|a fireball on the right with a short straight tail trailing horizontally to the left|diagonal comet, meteor rock
sk_meteor|S|A5|--scene-void --border --border-mid --el-fire --warn|a large angular rock at the lower right with a short wide flame tail toward the upper left|round fireball, long thin tail
'''
SEED0 = {'sk_deadeye': 4224}
JOBS = {}
for n, line in enumerate(x for x in J.strip().split('\n')):
    i, bar, b, pal, pr, no = line.split('|')
    JOBS[i] = dict(id=i, bar=bar, batch=b, pal=pal.split(), prompt=pr, no=no, seed0=SEED0.get(i, 4200 + n))
# 拆圖／加比對象（§5「拆圖對象」）；換掉的舊圖
EXTRA = {'sk_gasflask': ['sk_poisontrap'], 'sk_oilgrenade': ['sk_poisontrap'], 'sk_refract': ['sk_markshot'],
         'sk_tidepull': ['sk_frostnova'], 'sk_windflask': ['sk_hasteaura'], 'sk_fireburst': ['sk_iceshatter'], 'sk_ironaura': ['sk_determination']}
DROP = {'S': {'sk_poisontrap'}, 'A': {'sk_determination'}}
NEWID = {'sk_gasflask', 'sk_oilgrenade', 'sk_refract', 'sk_tidepull', 'sk_windflask', 'sk_ironaura'}

DESC = ('fantasy action RPG skill icon, flat front view, {s}, bold simple shapes readable as a black silhouette at 32 pixels, '
        'light from the top-left, 1 pixel transparent margin, 1 pixel black outline, clear negative space, no perspective, no isometric, '
        'no 3D, no face, no eyes, no text, no letters, no background, no circular badge, no round frame, no dithering, no gradient, no {n}')
BODY = {'image_size': {'width': 32, 'height': 32}, 'view': 'side', 'outline': 'single color black outline', 'shading': 'medium shading',
        'detail': 'low detail', 'no_background': True}
RERUN_NOT = json.loads((EV / 'rerun_not.json').read_text(encoding='utf-8')) if (EV / 'rerun_not.json').exists() else {}


# ---- 舊圖 ----
def old_sets():
    d = (ROOT / 'js/data.js').read_text(encoding='utf-8').split('\n')
    def blk(a):
        s, i = set(), next(k for k, l in enumerate(d) if l.startswith(a))
        for l in d[i + 1:]:
            if l.startswith('};'):
                break
            s |= set(re.findall(r"\bic: '([\w-]+)'", l))
        return s
    return {'S': blk('const SKILLS'), 'A': blk('const AURAS')}


ARTJS = (ROOT / 'js/art.js').read_text(encoding='utf-8')
_sheets = {}


def old_img(ic):
    sh, x, y, w, h = re.search(rf"\n  {ic}: \['([\w-]+)', (\d+), (\d+), (\d+), (\d+)\]", ARTJS).groups()
    if sh not in _sheets:
        _sheets[sh] = Image.open(ROOT / re.search(rf"\n  '?{sh}'?: '([^']+)'", ARTJS).group(1)).convert('RGBA')
    x, y, w, h = map(int, (x, y, w, h))
    return _sheets[sh].crop((x, y, x + w, y + h))


# ---- 生成 ----
def spent():
    f = EV / 'spend.csv'
    rows = list(csv.DictReader(f.open(encoding='utf-8'))) if f.exists() else []
    return sum(int(r['generations'] or 0) for r in rows), rows


def log_spend(batch, ids, before, after, gens):
    s, rows = spent()
    with (EV / 'spend.csv').open('a', encoding='utf-8', newline='') as f:
        csv.writer(f).writerow([batch, ' '.join(ids), before, after, gens, s + gens])


def bal():
    return round(P.http('GET', '/balance')['subscription']['generations'], 2)


def guide(j):
    g = RAW / 'guide' / f"{j['id']}.png"
    if not g.exists():
        sys.exit(f'重跑 2 要先畫導引圖 {g.relative_to(ROOT)}')
    return Image.open(g).convert('RGBA')


def gen(j, k):
    """k=0 首跑，1、2 重跑"""
    seed = j['seed0'] + 100 * k
    stem = f"{j['id']}-s{seed}"
    d = RAW / j['id']
    if (d / f'{stem}.png').exists():
        return stem
    no = j['no'] + (', ' + RERUN_NOT[j['id']] if k >= 1 and j['id'] in RERUN_NOT else '')
    body = dict(BODY, description=DESC.format(s=j['prompt'], n=no), seed=seed,
                color_image=P.b64img(P.palette_png([TOK[c] for c in j['pal']])))
    if k == 2:
        body['init_image'], body['init_image_strength'] = P.b64img(guide(j)), 200
    r = P.http('POST', '/create-image-pixflux', body)
    d.mkdir(parents=True, exist_ok=True)
    Image.open(io.BytesIO(base64.b64decode(r['image']['base64']))).save(d / f'{stem}.png')
    req = {a: ('(base64 略)' if isinstance(v, dict) and 'base64' in v else v) for a, v in body.items()}
    (d / f'{stem}.json').write_text(json.dumps({'endpoint': 'POST /v2/create-image-pixflux', 'job': j['id'], 'seed': seed, 'rerun': k,
                                                'palette': j['pal'], 'request': req, 'usage': r.get('usage')}, ensure_ascii=False, indent=2), encoding='utf-8')
    print('  完成', stem, r.get('usage'))
    return stem


# ---- 後處理（§4）----
def postproc(src, pal):
    cols = np.array([P.hexrgb(TOK[c]) for c in pal], np.uint8)
    a = np.asarray(src.convert('RGBA')).copy()
    on = a[..., 3] >= 128
    rgb = a[..., :3][on].astype(float)
    de = P.de2000(P.lab(rgb)[:, None, :], P.lab(cols)[None, :, :])
    idx = de.argmin(1)
    dmin = de.min(1)
    info = {'de_max': round(float(dmin.max()), 2) if dmin.size else 0, 'de_gt3': round(float((dmin > 3).mean()), 3) if dmin.size else 0}
    I = np.full((32, 32), -1)
    I[on] = idx
    I[0, :] = I[-1, :] = I[:, 0] = I[:, -1] = -1  # 1 px 透明邊
    m = I >= 0
    pad = np.pad(m, 1)
    n4 = pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
    n8 = n4 & pad[:-2, :-2] & pad[:-2, 2:] & pad[2:, :-2] & pad[2:, 2:]
    edge = m & ~n4
    I[edge] = 0  # 外緣 1 px --scene-void
    thick = m & n4 & ~n8 & (I == 0)  # 只斜角碰到透明的描邊色 → 2 px 角，換成鄰近非描邊色
    for y, x in zip(*np.nonzero(thick)):
        nb = I[y - 1:y + 2, x - 1:x + 2].ravel()
        nb = nb[nb > 0]
        if nb.size:
            I[y, x] = np.bincount(nb).argmax()
    out = np.zeros((32, 32, 4), np.uint8)
    out[m, :3] = cols[I[m]]
    out[m, 3] = 255
    info['fixed_corners'] = int(thick.sum())
    return Image.fromarray(out, 'RGBA'), info


# ---- 檢查（§5）----
def mask(im):
    return np.asarray(im.convert('RGBA'))[..., 3] > 127


def iou(a, b):
    u = (a | b).sum()
    return float((a & b).sum() / u) if u else 0.0


def thumb16(im):
    a = np.asarray(im.convert('RGBA'))
    out = np.zeros((16, 16, 4), np.uint8)
    for y in range(16):
        for x in range(16):
            c = a[2 * y:2 * y + 2, 2 * x:2 * x + 2].reshape(4, 4)
            o = c[c[:, 3] > 127]
            if len(o) >= 2:
                vals, cnt = np.unique(o[:, :3], axis=0, return_counts=True)
                out[y, x, :3], out[y, x, 3] = vals[cnt.argmax()], 255
    return Image.fromarray(out, 'RGBA')


def checker(m):
    a, b, c, d = m[:-1, :-1], m[:-1, 1:], m[1:, :-1], m[1:, 1:]
    return int(((a == d) & (b == c) & (a != b)).sum())


def stats(im):
    m = mask(im)
    ys, xs = np.nonzero(m)
    box = (np.ptp(ys) + 1) * (np.ptp(xs) + 1) if ys.size else 1
    t = thumb16(im)
    a = np.asarray(im.convert('RGBA'))
    L = P.lab(a[..., :3].astype(float))[..., 0]
    cls = np.where(L < 35, 0, np.where(L < 70, 1, 2))
    lone = 0
    for y, x in zip(ys, xs):
        nb = [(cls[yy, xx]) for yy in range(max(0, y - 1), min(32, y + 2)) for xx in range(max(0, x - 1), min(32, x + 2))
              if (yy, xx) != (y, x) and m[yy, xx]]
        lone += cls[y, x] not in nb
    cols = len({tuple(p) for p in a[m][:, :3]})
    return {'fill': round(m.sum() / 1024, 3), 'box_fill': round(m.sum() / box, 3), 'fill16': round(mask(t).sum() / 256, 3),
            'checker32': checker(m), 'checker16': checker(mask(t)), 'noise': round(lone / max(1, m.sum()), 3), 'colors': cols,
            'chase': int((a[m][:, :3] == P.hexrgb(TOK['--rar-chase'])).all(1).sum())}


def latest_pass():
    f = EV / 'state.json'
    return json.loads(f.read_text(encoding='utf-8')) if f.exists() else {}


def sets_now(state, cand=None):
    """同欄集：沒被取代的舊圖＋已過的新圖（＋這批候選）"""
    o = old_sets()
    out = {}
    for bar in 'SA':
        ids = {i for i in o[bar] if i not in DROP[bar] and not (i in JOBS and JOBS[i]['bar'] == bar)}
        ims = {i: old_img(i) for i in ids}
        for i, st in {**state, **(cand or {})}.items():
            if JOBS[i]['bar'] == bar and st:
                ims[i] = Image.open(OUT / i / f'{st}.png')
        out[bar] = ims
    return out


def evaluate(i, stem, state, cand):
    j = JOBS[i]
    im = Image.open(OUT / i / f'{stem}.png')
    s = stats(im)
    sets = sets_now(state, cand)
    m, m16 = mask(im), mask(thumb16(im))
    rows, worst, worst16 = [], (0, ''), (0, '')
    others = {k: v for k, v in sets[j['bar']].items() if k != i}
    for e in EXTRA.get(i, []):
        others.setdefault(e, old_img(e))
    for k, v in sorted(others.items()):
        a, b = iou(m, mask(v)), iou(m16, mask(thumb16(v)))
        rows.append((i, stem, j['bar'], k, round(a, 3), round(b, 3)))
        worst = max(worst, (round(a, 3), k))
        worst16 = max(worst16, (round(b, 3), k))
    fails = []
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
    if s['colors'] > 10:
        fails.append(f"色數 {s['colors']}")
    if s['chase']:
        fails.append('追逐色')
    return dict(id=i, stem=stem, bar=j['bar'], iou32_max=worst[0], iou32_with=worst[1], iou16_max=worst16[0], iou16_with=worst16[1],
                **s, result='過' if not fails else '不過', why='；'.join(fails)), rows


def run(batch, items, go):
    """items：[(id, k)]"""
    s, _ = spent()
    print(f'批 {batch}：{len(items)} 張（已花 {s}／{CAP}）', [f'{i}#{k}' for i, k in items])
    if s + len(items) > CAP:
        sys.exit('已花＋本批 > 40，停')
    if len(items) > 5:
        sys.exit('一批最多 5 張')
    for i, k in items:
        j = JOBS[i]
        print('-', i, j['seed0'] + 100 * k, DESC.format(s=j['prompt'], n=j['no'])[:100], '…')
    if not go:
        return print('只是預覽')
    b0 = bal()
    print('餘額', b0)
    done = [gen(JOBS[i], k) for i, k in items]
    b1 = bal()
    log_spend(batch, [d for d in done], b0, b1, len(items))
    print('餘額', b1)


def check(ids_stems):
    """對 [(id, stem)] 做後處理＋檢查，過的寫進 state.json"""
    state = latest_pass()
    res, allrows = [], []
    cand = {}
    for i, stem in ids_stems:
        im, info = postproc(Image.open(RAW / i / f'{stem}.png'), JOBS[i]['pal'])
        (OUT / i).mkdir(parents=True, exist_ok=True)
        im.save(OUT / i / f'{stem}.png')
        cand[i] = stem
        JOBS[i]['_info'] = info
    for i, stem in ids_stems:
        r, rows = evaluate(i, stem, state, cand)
        r.update(JOBS[i]['_info'])
        res.append(r)
        allrows += rows
        print(r['id'], r['stem'], r['result'], r['why'], 'IoU32', r['iou32_max'], r['iou32_with'], 'fill', r['fill'], r['box_fill'], 'f16', r['fill16'])
    # 同批互比：都過了才算數（互相比的時候候選都在集裡）
    for r in res:
        if r['result'] == '過':
            state[r['id']] = r['stem']
    (EV / 'state.json').write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding='utf-8')
    f = EV / 'review.csv'
    new = not f.exists()
    with f.open('a', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, list(res[0].keys()))
        new and w.writeheader()
        w.writerows(res)
    return res


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd in ('preview', 'go'):
        items = [tuple([x.split(':')[0], int(x.split(':')[1])]) for x in sys.argv[3].split(',')]
        run(sys.argv[2], items, cmd == 'go')
    elif cmd == 'check':
        check([(x.split(':')[0], x.split(':')[1]) for x in sys.argv[2].split(',')])


def void_share(i, stem):
    a = np.asarray(Image.open(OUT / i / f'{stem}.png'))
    m = a[..., 3] > 0
    pad = np.pad(m, 1)
    inner = m & pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
    return float((a[inner][:, :3] == P.hexrgb(TOK[VOID])).all(1).mean()) if inner.any() else 0


def hand_recolor(i, stem):
    """手修（不花生成）：原圖太暗（內部多半吸到 --scene-void）時，內部照原圖亮度排名分給 palette 的非描邊色，剪影不變。
    原圖已明顯上色（對最近色 ΔE ≤ 6 且不是描邊色）的像素保留。"""
    pal = JOBS[i]['pal']
    raw = np.asarray(Image.open(RAW / i / f'{stem}.png').convert('RGBA'))
    cur = np.asarray(Image.open(OUT / i / f'{stem}.png')).copy()
    m = cur[..., 3] > 0
    pad = np.pad(m, 1)
    inner = m & pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
    cols = [c for c in pal if c != VOID]
    ramp = sorted(cols, key=lambda c: P.lab(P.hexrgb(TOK[c]))[0])
    L = P.lab(raw[..., :3].astype(float))[..., 0]
    keep = inner & ~(cur[..., :3] == P.hexrgb(TOK[VOID])).all(-1)
    labc = P.lab(np.array([P.hexrgb(TOK[c]) for c in pal], float))
    de = P.de2000(P.lab(raw[..., :3].astype(float))[..., None, :], labc[None, None])
    keep &= de.min(-1) <= 6
    todo = inner & ~keep
    if todo.any():
        lv, inv = np.unique(np.round(L[todo]), return_inverse=True)  # 原圖的亮度層：最暗 → ramp[0]、最亮 → ramp[-1]
        k = np.rint(inv * (len(ramp) - 1) / max(1, len(lv) - 1)).astype(int)
        tl = (np.pad(~inner, 1)[:-2, 1:-1] | np.pad(~inner, 1)[1:-1, :-2])[todo]  # 上或左貼著描邊：亮一階（光從左上）
        k = np.clip(k + tl, 0, len(ramp) - 1)
        cur[todo, :3] = np.array([P.hexrgb(TOK[ramp[x]]) for x in k], np.uint8)
    out = stem + 'h'
    Image.fromarray(cur, 'RGBA').save(OUT / i / f'{out}.png')
    return out


def batch(name, ids, k=0):
    """生成 → 後處理＋檢查 → 太暗的手修上色（剪影不變）→ state 指到手修版"""
    items = [(i, k) for i in ids]
    run(name, items, True)
    stems = [(i, f"{i}-s{JOBS[i]['seed0'] + 100 * k}") for i in ids]
    res = check(stems)
    state = latest_pass()
    for i, s in stems:
        if void_share(i, s) > 0.5:
            h = hand_recolor(i, s)
            print('  手修上色', h)
            if state.get(i) == s:
                state[i] = h
    (EV / 'state.json').write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding='utf-8')
    return res


if __name__ == '__main__' and sys.argv[1] == 'batch':
    batch(sys.argv[2], sys.argv[3].split(','), int(sys.argv[4]) if len(sys.argv) > 4 else 0)


def outline(a):
    """外緣 1 px 換成 --scene-void（同 postproc）"""
    m = a[..., 3] > 0
    pad = np.pad(m, 1)
    edge = m & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    a[edge, :3] = P.hexrgb(TOK[VOID])
    return a


def thicken(a):
    """加粗 1 px：外擴一圈，新像素取原本外緣內側的顏色，再重描外緣"""
    m = a[..., 3] > 0
    pad = np.pad(m, 1)
    grow = m | pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    grow[0, :] = grow[-1, :] = grow[:, 0] = grow[:, -1] = False
    b = a.copy()
    pa = np.pad(m, 2)
    inner = m & np.pad(m, 1)[:-2, 1:-1] & np.pad(m, 1)[2:, 1:-1] & np.pad(m, 1)[1:-1, :-2] & np.pad(m, 1)[1:-1, 2:]
    for y, x in zip(*np.nonzero(grow & ~inner)):
        nb = [(yy, xx) for yy in range(max(0, y - 2), min(32, y + 3)) for xx in range(max(0, x - 2), min(32, x + 3)) if inner[yy, xx]]
        c = a[min(nb, key=lambda p: abs(p[0] - y) + abs(p[1] - x))][:3] if nb else P.hexrgb(TOK[VOID])
        b[y, x, :3], b[y, x, 3] = c, 255
    return outline(b)


def shift(a, dx, dy):
    b = np.zeros_like(a)
    ys, xs = np.nonzero(a[..., 3] > 0)
    if ys.min() + dy < 1 or ys.max() + dy > 30 or xs.min() + dx < 1 or xs.max() + dx > 30:
        return None
    b[ys + dy, xs + dx] = a[ys, xs]
    return b


def handfix(i, stem, thick=False):
    state = latest_pass()
    a = np.asarray(Image.open(OUT / i / f'{stem}.png')).copy()
    if thick:
        a = thicken(a)
    tries = sorted({(dx, dy) for dx in range(-4, 5) for dy in range(-4, 5)}, key=lambda d: (abs(d[0]) + abs(d[1]), d))
    for dx, dy in tries:
        b = shift(a, dx, dy)
        if b is None:
            continue
        out = f'{stem}m'
        Image.fromarray(b, 'RGBA').save(OUT / i / f'{out}.png')
        r, _ = evaluate(i, out, {k: v for k, v in state.items() if k != i}, {})
        if r['result'] == '過':
            state[i] = out
            (EV / 'state.json').write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding='utf-8')
            print(i, out, '手修過', f'加粗={thick} 平移=({dx},{dy})', 'IoU32', r['iou32_max'], r['iou32_with'], 'fill', r['fill'], r['box_fill'])
            return out
    print(i, stem, '手修仍不過', r['why'])
