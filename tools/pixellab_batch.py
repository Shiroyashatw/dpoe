#!/usr/bin/env python3
"""M2-36 地磚與王印：讀 docs/production/specs/M2-36-pixellab-prompts.md §3 的 JSON 工作表，呼叫 PixelLab，做 §5 後處理。

金鑰只讀環境變數 PIXELLAB_API_KEY，不要寫進程式或 commit（雲端環境由代理注入，可不設）。

用法（在 dpoe/ 底下）：
    python3 tools/pixellab_batch.py list                          # 列出工作表（含換好的提示詞）
    python3 tools/pixellab_batch.py run --wave A                  # 只預覽，不花點數
    python3 tools/pixellab_batch.py run --wave A --go             # 真的送出，一批 5 張依序跑
    python3 tools/pixellab_batch.py --repost all                  # 從 art/_raw 原圖重做後處理＋asset_check（不花點數）
    python3 tools/pixellab_batch.py recolor --job tile_ice_walltop --from tile_tomb_walltop-s1312   # 冰窟牆頂備案
    python3 tools/pixellab_batch.py balance
    python3 tools/pixellab_batch.py run --sheet art/_tmp/m2-36-d2-first/jobs.json --raw art/_tmp/m2-36-d2-first --all   # D2 首跑（工作表 json、另存目錄）
- 沒加 --go 一律只預覽；第 k 張用 seed0 + k；art/_raw/<id>/<id>-s<seed>.png 已存在就跳過。
- palette 寫 token 名，送出前從 specs/M2-36-palette-tokens.md 換成值；地磚的後處理與檢查一律用該地形四色。
- 工作表沒有的 id（第一輪）從 art/_raw/<id>/*.json 還原。
- init_from：規格指定的 32（alpha_binary 後、已過檢查、在正式目錄）；端點拒收 init_image 時加 --no-init。
"""
import argparse, base64, io, json, os, pathlib, re, sys, time, urllib.error, urllib.request
import numpy as np
from PIL import Image

API = 'https://api.pixellab.ai/v2'
ROOT = pathlib.Path(__file__).resolve().parent.parent
DOC = ROOT / 'docs/production/specs/M2-36-pixellab-prompts.md'
RAW = ROOT / 'art/_raw'
BATCH = 5


TOK = ROOT / 'docs/production/specs/M2-36-palette-tokens.md'
MOTIF = {'zhenyue': '--tx-strong', 'chixiao': '--el-fire', 'jiting': '--el-light', 'guixu': '--rar-magic'}
CARVE = {'zhenyue': 'a stylised mountain peak with three summits', 'chixiao': 'an upright sword wrapped in a rising flame',
         'jiting': 'a single zigzag lightning bolt', 'guixu': 'a spiral whirlpool sinking into the centre'}  # 規格 §3「刻紋」
INIT16 = {'zhenyue': 's2104', 'chixiao': 's2141', 'jiting': 's2124', 'guixu': 's2133'}  # 規格 §3「16 的 init_from」
SEAL = ['--scene-void', '--panel-inset', '--border', '--border-mid', '--border-cap', '--rar-chase-bg', '--rar-chase', '--rar-chase-hi']


def tokens():
    """色票檔的 token → 色值：`| --a／-b | `#x`／`#y` |` 與場景表 `| temple | -ground… |`"""
    t, scene = {}, None
    for line in TOK.read_text(encoding='utf-8').splitlines():
        c = [x.strip() for x in line.strip().strip('|').split('|')]
        if c[0] == '地形':
            scene = c[1:]
            continue
        if scene and c[0] in ('temple', 'lava', 'tomb', 'ice'):
            for k, v in zip(scene, c[1:]):
                if v.startswith('`#'):
                    t[f'--scene-{c[0]}{k}'] = v.strip('`')
        elif c[0].startswith('--') and len(c) > 1 and c[1].startswith('`#'):
            names = c[0].split()[0].split('／')
            vals = [v.strip('`') for v in c[1].split('／')]
            for i, (n, v) in enumerate(zip(names, vals)):
                t[n if n.startswith('--') else names[0] + n] = v
    return t


def palette(job):
    """後處理、檢查用的色：地磚一律該地形四色（-edge、-ground、-mid、-light），其餘照工作表"""
    if job['id'].startswith('tile_') and not job.get('palette'):
        b = job['id'].split('_')[1]
        return [tokens()[f'--scene-{b}-{k}'] for k in ('edge', 'ground', 'mid', 'light')]
    return [tokens().get(c, c) for c in job['palette']]


def job_of(jid):
    """工作表沒有的 id（第一輪跑過的）：從 art/_raw/<id>/ 的 .json 還原"""
    j = next((x for x in jobs() if x['id'] == jid), None)
    if j:
        return j
    m = json.loads(next((RAW / jid).glob('*.json')).read_text(encoding='utf-8'))
    k = jid.split('_')[-1]
    post = {'floor': 'floor_shift', 'walltop': 'wall_shift', 'wallface': 'face_shift'}.get(k, 'alpha_binary')
    pal = [] if jid.startswith('tile_') else SEAL + [MOTIF[jid.split('_')[1]]]
    body = {x: v for x, v in m['request'].items() if x not in ('seed', 'color_image', 'init_image')}
    out = f"art/tiles/{jid.split('_')[1]}/{k}/" if jid.startswith('tile_') else f"art/icons/wangyin/wangyin_{jid.split('_')[1]}/"
    return {'id': jid, 'endpoint': m['endpoint'].replace('POST /v2', ''), 'body': body, 'palette': pal, 'post': post, 'out': out}


SHEET = None  # --sheet：改讀這個 json 工作表（D2 用）


def jobs():
    if SHEET:
        return json.loads(SHEET.read_text(encoding='utf-8'))
    """§3 JSON（跳過還沒定的 <名>）；body 是字串時照說明從別的 job 補"""
    text = DOC.read_text(encoding='utf-8')
    js = []
    for j in json.loads(re.search(r'## 3\..*?```json\n(.*?)\n```', text, re.S).group(1)):
        if '<名>' not in j['id']:
            js.append(j)
            continue
        for n, s in re.findall(r'(\w+) (\d+)', j['seed0']):  # 四枚 16：seed0「zhenyue 2151、…」，init 用推薦的 32
            b = dict(j['body'], description=j['body']['description'].replace('<刻紋>', CARVE[n]))
            js.append(dict(j, id=j['id'].replace('<名>', n), seed0=int(s), body=b, palette=SEAL + [MOTIF[n]],
                           init_from=f'wangyin_{n}_32-{INIT16[n]}', out=j['out'].replace('<名>', n)))
    by = {}
    for j in js:
        by.setdefault(j['id'], j)
    for j in js:
        if isinstance(j['palette'], str):  # 「同疾霆 32」：用同 id 第一筆的色
            j['palette'] = by[j['id']]['palette']
        b = j['body']
        if isinstance(b, str):
            if m := re.match(r'同 (art/_raw/\S+\.json) 的 body', b):
                r = json.loads(next(ROOT.glob(m.group(1))).read_text(encoding='utf-8'))['request']
                j['body'] = {x: v for x, v in r.items() if x not in ('seed', 'color_image', 'init_image')}
            elif m := re.match(r'同 (\w+)，刻紋換成 (.+)', b):
                src = next(v for k, v in by.items() if k.split('_')[1] == m.group(1))
                old = re.search(r'(?:a|an) [^,]*? carved on the plaque face', src['body']['description']).group(0)
                j['body'] = dict(src['body'], description=src['body']['description'].replace(old, m.group(2) + ' carved on the plaque face'))
            else:
                sys.exit(f'{j["id"]} 的 body 看不懂：{b}')
    return js


def all_jobs():
    """工作表＋art/_raw 裡第一輪的 job"""
    js, ids = [], set()
    for j in jobs():  # 同一個 id 分兩波（疾霆 32 A、B）只留第一筆：同一個資料夾只檢查一次
        if j['id'] not in ids:
            ids.add(j['id'])
            js.append(j)
    return js + [job_of(d.name) for d in sorted(RAW.iterdir()) if d.is_dir() and d.name not in ids and any(d.glob('*.json'))]


def hexrgb(c):
    return [int(c[i:i + 2], 16) for i in (1, 3, 5)]


def png_bytes(im):
    b = io.BytesIO()
    im.save(b, 'PNG')
    return b.getvalue()


def b64img(im):
    return {'type': 'base64', 'base64': base64.b64encode(png_bytes(im)).decode()}


def palette_png(colors):
    """把色票排成 1 列的小 PNG，給 color_image 用"""
    return Image.fromarray(np.array([[hexrgb(c) for c in colors]], np.uint8), 'RGB')


# ---- 顏色（sRGB → Lab、CIEDE2000），asset_check.py 也用 ----
def lab(rgb):
    c = np.asarray(rgb, float) / 255
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[0.4124, 0.2126, 0.0193], [0.3576, 0.7152, 0.1192], [0.1805, 0.0722, 0.9505]])
    xyz /= [0.95047, 1.0, 1.08883]
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def lum(rgb):
    c = np.asarray(rgb, float) / 255
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    return c @ [0.2126, 0.7152, 0.0722]


def de2000(a, b):
    L1, a1, b1 = np.moveaxis(a, -1, 0)
    L2, a2, b2 = np.moveaxis(b, -1, 0)
    C = (np.hypot(a1, b1) + np.hypot(a2, b2)) / 2
    G = 0.5 * (1 - np.sqrt(C ** 7 / (C ** 7 + 25 ** 7)))
    a1p, a2p = a1 * (1 + G), a2 * (1 + G)
    C1p, C2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p, h2p = np.degrees(np.arctan2(b1, a1p)) % 360, np.degrees(np.arctan2(b2, a2p)) % 360
    dL, dC = L2 - L1, C2p - C1p
    dh = h2p - h1p
    dh = np.where(C1p * C2p == 0, 0, np.where(dh > 180, dh - 360, np.where(dh < -180, dh + 360, dh)))
    dH = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dh / 2))
    Lm, Cm = (L1 + L2) / 2, (C1p + C2p) / 2
    hs = h1p + h2p
    hm = np.where(C1p * C2p == 0, hs, np.where(np.abs(h1p - h2p) <= 180, hs / 2, np.where(hs < 360, (hs + 360) / 2, (hs - 360) / 2)))
    T = 1 - 0.17 * np.cos(np.radians(hm - 30)) + 0.24 * np.cos(np.radians(2 * hm)) + 0.32 * np.cos(np.radians(3 * hm + 6)) - 0.20 * np.cos(np.radians(4 * hm - 63))
    SL = 1 + 0.015 * (Lm - 50) ** 2 / np.sqrt(20 + (Lm - 50) ** 2)
    SC, SH = 1 + 0.045 * Cm, 1 + 0.015 * Cm * T
    RT = -2 * np.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)) * np.sin(np.radians(60 * np.exp(-(((hm - 275) / 25) ** 2))))
    return np.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH))


def nearest(rgb, pal):
    """每個像素對 palette 的最近色索引與 ΔE2000"""
    d = de2000(lab(rgb)[..., None, :], lab([hexrgb(c) for c in pal]))
    return d.argmin(-1), d.min(-1)


# ---- §5 後處理 ----
def mode(a):
    v, n = np.unique(a, return_counts=True)
    return v[n.argmax()]


def levels(im, pal):
    """每個像素對地形四色（-edge、-ground、-mid、-light → 0–3）的最近色"""
    return nearest(np.asarray(im.convert('RGB')), pal)[0]


def paint(idx, pal):
    return Image.fromarray(np.array([hexrgb(c) for c in pal], np.uint8)[idx], 'RGB')


def neighbours(idx, wrapy=True):
    """上下左右四鄰；左右一定繞回，上下看 wrapy（牆面不繞回，邊外記 -1）"""
    lr = [np.roll(idx, 1, 1), np.roll(idx, -1, 1)]
    if wrapy:
        return np.stack([np.roll(idx, 1, 0), np.roll(idx, -1, 0)] + lr)
    p = np.pad(idx, ((1, 1), (0, 0)), constant_values=-1)
    return np.stack([p[:-2], p[2:]] + lr)


def wrap_heal(idx):
    """上下、左右接縫兩邊相對的像素不同色 → 兩格都改成整張最多的色"""
    m, out = mode(idx), idx.copy()
    for a, b in ((np.s_[:, 0], np.s_[:, -1]), (np.s_[0], np.s_[-1])):
        bad = idx[a] != idx[b]
        out[a][bad] = m
        out[b][bad] = m
    return out


def despeckle(idx, wrapy=True, keep_edges=False):
    """四鄰都跟自己不同 → 改成鄰居裡最多的色，做一次。keep_edges：牆面左右邊那兩欄不動（接縫已統一）"""
    nb = neighbours(idx, wrapy)
    iso = (nb != idx).all(0)
    if keep_edges:
        iso[:, [0, -1]] = False
    out = idx.copy()
    for y, x in zip(*np.nonzero(iso)):
        v = nb[:, y, x]
        out[y, x] = mode(v[v >= 0])
    return out


def shift(im, pal, drop=1):
    """floor_shift／wall_shift：色階 −drop（最低 0），再 wrap_heal、despeckle；camp_shift＝drop 0（不降成灰）"""
    return [paint(despeckle(wrap_heal(np.maximum(levels(im, pal) - drop, 0))), pal)], {}


def face_shift(im, pal, drop=1, grade=False):
    """牆面 64×18：−drop；每列第 0、31、32、63 欄不全同 → 都改成這列最多的色；切成 a、b 各自 despeckle。
    grade（D2 第二批）：despeckle 後第 0 列改 `#46413c` 受光線，最下 3 列再 −1 階"""
    idx = np.maximum(levels(im, pal) - drop, 0)
    w = idx.shape[1] // 2
    cols = [0, w - 1, w, 2 * w - 1]
    for row in idx:
        if len(set(row[cols])) > 1:
            row[cols] = mode(row)
    halves = [despeckle(h, False, True) for h in (idx[:, :w], idx[:, w:])]
    if grade:
        lit = [c.lower() for c in pal].index('#46413c')
        for h in halves:
            h[0] = lit
            h[-3:] = np.maximum(h[-3:] - 1, 0)
    return [paint(h, pal) for h in halves], {}


def recolor(src, pal, src_pal):
    """另一地形已過的色階圖（後處理後）用這個地形的四色重畫"""
    return [paint(levels(Image.open(src), src_pal), pal)], {'recolor_from': src.name}


def alpha_binary(im, pal, drop=None):
    a = np.asarray(im.convert('RGBA')).copy()
    on = a[..., 3] >= 128
    a[..., 3] = np.where(on, 255, 0)
    i, d = nearest(a[..., :3][on], pal)
    a[..., :3][on] = np.array([hexrgb(c) for c in pal], np.uint8)[i]
    a[..., :3][~on] = 0
    return [Image.fromarray(a, 'RGBA')], {'max_de_before_snap': round(float(d.max()), 2) if d.size else 0}


POST = {'floor_shift': shift, 'wall_shift': shift, 'camp_shift': shift, 'face_shift': face_shift, 'alpha_binary': alpha_binary}


def post_names(stem, post):
    return [f'{stem}-a.png', f'{stem}-b.png'] if post == 'face_shift' else [f'{stem}.png']


def post(job, d, stem, meta=None):
    if meta and meta.get('recolor_from'):  # 備案：從來源地形的後處理圖重畫，不是 API 原圖
        sj = job_of(meta['recolor_from'].split('-s')[0])
        outs, info = recolor(RAW / sj['id'] / 'post' / meta['recolor_from'], palette(job), palette(sj))
        outs[0].save(d / f'{stem}.png')  # 「原圖」就是重畫的圖（沒有 API 原圖可量）
    else:
        drop = job.get('drop', 0 if job['post'] == 'camp_shift' else 1)
        kw = {'grade': True} if job.get('grade') else {}
        outs, info = POST[job['post']](Image.open(d / f'{stem}.png'), palette(job), drop, **kw)
    for o, name in zip(outs, post_names(stem, job['post'])):
        o.save(d / 'post' / name)
    return info


# ---- 呼叫 ----
def http(method, path, body=None):
    t = os.environ.get('PIXELLAB_API_KEY', '').strip() or 'injected-by-proxy'
    h = {'Authorization': 'Bearer ' + t, 'User-Agent': 'dpoe-pixellab-batch'}
    data = None
    if body is not None:
        data, h['Content-Type'] = json.dumps(body).encode(), 'application/json'
    req = urllib.request.Request(API + path, data, method=method, headers=h)
    for k in range(8):  # 429 限流：退避再送，不算失敗
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == 7:
                err = e
                break
            w = int(e.headers.get('Retry-After') or 0) or 15 * 2 ** k
            print(f'  429 限流，等 {w} 秒再送')
            time.sleep(w)
    e = err
    msg = e.read().decode('utf-8', 'replace')[:300]
    if t != 'injected-by-proxy':
        msg = msg.replace(t, '(金鑰已遮)')
    if SHEET:  # D2：失敗記下、不中斷、不重跑
        raise RuntimeError(f'API 錯誤 {e.code}：{msg}')
    sys.exit(f'API 錯誤 {e.code}：{msg}')


def init_recolor(job):
    """init_recolor（D2 王印 16）：舊 32 換色（C*>25 的紋樣 → 依 L* 換成追逐青三色，其餘 → 最近的灰），再最近鄰縮成這張的尺寸"""
    f = ROOT / job['init_recolor']
    a = np.asarray(Image.open(f).convert('RGBA')).copy()
    on = a[..., 3] >= 128
    L = lab(a[..., :3])
    hot = on & (np.hypot(L[..., 1], L[..., 2]) > 25)
    cy = job['init_cyan']  # 由暗到亮
    a[..., :3][hot] = np.array([hexrgb(c) for c in cy], np.uint8)[np.abs(L[..., 0][hot][:, None] - lab([hexrgb(c) for c in cy])[:, 0]).argmin(-1)]
    grey = job['init_grey']
    cold = on & ~hot
    a[..., :3][cold] = np.array([hexrgb(c) for c in grey], np.uint8)[nearest(a[..., :3][cold], grey)[0]]
    a[..., 3] = np.where(on, 255, 0)
    w, h = job['body']['image_size']['width'], job['body']['image_size']['height']
    return Image.fromarray(a, 'RGBA').resize((w, h), Image.NEAREST), f.name


def init_file(job):
    """init_file（D2 第二批）：repo 內圖（一張或多張左右拼）最近鄰縮成 image_size"""
    fs = job['init_file'] if isinstance(job['init_file'], list) else [job['init_file']]
    ims = [Image.open(ROOT / f).convert('RGBA') for f in fs]
    out = Image.new('RGBA', (sum(i.width for i in ims), max(i.height for i in ims)))
    x = 0
    for i in ims:
        out.paste(i, (x, 0))
        x += i.width
    w, h = job['body']['image_size']['width'], job['body']['image_size']['height']
    return out.resize((w, h), Image.NEAREST), '＋'.join(pathlib.Path(f).name for f in fs)


def init_image(job):
    if 'init_file' in job:
        return init_file(job)
    if 'init_recolor' in job:
        return init_recolor(job)
    """init_from：規格指定、已過檢查的 32（alpha_binary 後、在正式目錄裡），縮成這張的尺寸"""
    src = job['init_from'].split('-s')[0]
    f = ROOT / job_of(src)['out'] / f"{job['init_from']}.png"
    if not f.exists():
        sys.exit(f'init_from {f.relative_to(ROOT)} 不在正式目錄（先跑 asset_check.py，要過關）')
    w, h = job['body']['image_size']['width'], job['body']['image_size']['height']
    return Image.open(f).convert('RGBA').resize((w, h), Image.NEAREST), f.name


def request(job, seed, no_init=False):
    body = dict(job['body'], seed=seed, color_image=b64img(palette_png([tokens().get(c, c) for c in job['palette']])))
    note = {}
    if ('init_from' in job or 'init_recolor' in job or 'init_file' in job) and not no_init:
        im, note['init_from'] = init_image(job)
        body['init_image'], body['init_image_strength'] = b64img(im), job['init_image_strength']
    return body, note


def run_one(job, k, no_init=False):
    seed = job['seed0'] + k
    stem = f"{job['id']}-s{seed}"
    d = RAW / job['id']
    body, note = request(job, seed, no_init)
    r = http('POST', job['endpoint'], body)
    d.mkdir(parents=True, exist_ok=True)
    (d / 'post').mkdir(exist_ok=True)
    im = Image.open(io.BytesIO(base64.b64decode(r['image']['base64'])))
    im.save(d / f'{stem}.png')
    info = post(job, d, stem)
    req = {k2: ('(base64 略)' if isinstance(v, dict) and 'base64' in v else v) for k2, v in body.items()}
    r['image']['base64'] = '(存成 png，略)'
    meta = {'endpoint': 'POST /v2' + job['endpoint'], 'job': job['id'], 'seed': seed, 'wave': job.get('wave'), 'post': job['post'], **note, **info,
            'request': req, 'usage': r.get('usage'), 'response': r}
    (d / f'{stem}.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"  完成 {stem}.png {im.size} {im.mode}，用量 {r.get('usage')}")


def repost(ids):
    """只用 art/_raw 的原圖重做 §5 後處理，不花生成；接著跑 asset_check（§6）"""
    for j in all_jobs():
        if ids != ['all'] and j['id'] not in ids:
            continue
        d = RAW / j['id']
        for old in (d / 'post').glob('*.png'):
            old.unlink()
        for f in sorted(d.glob('*.json')):
            m = json.loads(f.read_text(encoding='utf-8'))
            m['post'] = j['post']
            m.update(post(j, d, f.stem, m))
            f.write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding='utf-8')
            print('重做', f.stem, j['post'])
    import asset_check
    asset_check.main()


def make_recolor(dst, src_stem):
    """備案：把 src_stem（另一地形已過的後處理圖）用 dst 地形的四色重畫，存成 dst 的一張"""
    j = job_of(dst)
    d = RAW / dst
    (d / 'post').mkdir(parents=True, exist_ok=True)
    stem = f'{dst}-recolor-{src_stem.split("_")[1]}-s{src_stem.rsplit("-s", 1)[1]}'
    m = {'job': dst, 'seed': int(src_stem.rsplit('-s', 1)[1]), 'post': j['post'], 'recolor_from': src_stem + '.png', 'usage': None}
    m.update(post(j, d, stem, m))
    (d / f'{stem}.json').write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding='utf-8')
    print('備案', stem)


def main():
    p = argparse.ArgumentParser(description='PixelLab 地磚與王印批次工具（M2-36 §3）')
    p.add_argument('cmd', nargs='?', choices=['list', 'run', 'balance', 'recolor'])
    p.add_argument('--job', default='', help='逗號分隔的 id')
    p.add_argument('--all', action='store_true')
    p.add_argument('--wave', help='只跑這一波（A、B）')
    p.add_argument('--n', type=int, default=0, help='每個工作跑到第幾張（0 = 照工作表；備用可超過，已有的 seed 跳過）')
    p.add_argument('--repost', help='逗號分隔的 id 或 all：從 art/_raw 原圖重做後處理與檢查，不花生成')
    p.add_argument('--from', dest='src', help='recolor 的來源，例如 tile_tomb_walltop-s1312')
    p.add_argument('--no-init', action='store_true', help='不送 init_image（端點拒收時）')
    p.add_argument('--sheet', help='改讀這個 json 工作表（D2 首跑）')
    p.add_argument('--raw', help='原圖與 json 另存的目錄（預設 art/_raw）')
    p.add_argument('--go', action='store_true', help='真的送出，會花點數')
    a = p.parse_args()
    global SHEET, RAW
    if a.sheet:
        SHEET = ROOT / a.sheet
    if a.raw:
        RAW = ROOT / a.raw
    if a.repost:
        return repost(a.repost.split(','))
    if a.cmd == 'balance':
        return print(json.dumps(http('GET', '/balance'), ensure_ascii=False))
    if a.cmd == 'recolor':
        return make_recolor(a.job, a.src)
    js = jobs()
    if a.cmd == 'list':
        for j in js:
            s = j['body']['image_size']
            print(f"{j['wave']} {j['id']:22} {j['endpoint']:22} {s['width']}×{s['height']} n={j['n']} seed0={j['seed0']} post={j['post']} init={j.get('init_from', '-')} → {j['out']}")
            print('   ', j['body']['description'])
        return
    want = [x for x in a.job.split(',') if x]
    bad = [x for x in want if x not in {j['id'] for j in js}]
    if bad or not (want or a.all or a.wave):
        sys.exit('沒有這些 id：' + '、'.join(bad) if bad else '請用 --job 指定 id，或加 --all／--wave')
    todo = [(j, k) for j in js if (a.all or j['id'] in want or j['wave'] == a.wave) for k in range(a.n or j['n'])
            if not (RAW / j['id'] / f"{j['id']}-s{j['seed0'] + k}.png").exists()]
    print(f'這次 {len(todo)} 張，預估 {len(todo)} 次生成；一批最多 {BATCH} 張')
    for b in range(0, len(todo), BATCH):
        print(f'第 {b // BATCH + 1} 批')
        for j, k in todo[b:b + BATCH]:
            print(f"- {j['id']} s{j['seed0'] + k}：{j['endpoint']} {j['body']['description'][:90]}…")
            if SHEET and not a.go:
                b2 = j['body']
                print(f"    {b2['image_size']['width']}×{b2['image_size']['height']} post={j['post']} palette={' '.join(j['palette'])} init={j.get('init_recolor', '-')}")
                print(f"    description: {b2['description']}")
                if 'negative_description' in b2:
                    print(f"    negative: {b2['negative_description']}")
            if a.go:
                try:
                    run_one(j, k, a.no_init)
                except Exception as e:
                    if not SHEET:
                        raise
                    print(f'  失敗 {j["id"]} s{j["seed0"] + k}：{e}')
                    f = RAW / 'failures.json'
                    fl = json.loads(f.read_text(encoding='utf-8')) if f.exists() else []
                    fl.append({'id': j['id'], 'seed': j['seed0'] + k, 'error': str(e)})
                    f.write_text(json.dumps(fl, ensure_ascii=False, indent=2), encoding='utf-8')
    if not a.go:
        print('只是預覽，沒有送出。確認後加 --go')


if __name__ == '__main__':
    main()
