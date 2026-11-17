#!/usr/bin/env python3
"""M2-36 地磚與王印：讀 docs/production/specs/M2-36-pixellab-prompts.md §3 的 JSON 工作表，呼叫 PixelLab，做 §5 後處理。

金鑰只讀環境變數 PIXELLAB_API_KEY，不要寫進程式或 commit（雲端環境由代理注入，可不設）。

用法（在 dpoe/ 底下）：
    python3 tools/pixellab_batch.py list                          # 列出工作表
    python3 tools/pixellab_batch.py run --job tile_temple_floor   # 只預覽，不花點數
    python3 tools/pixellab_batch.py run --job tile_temple_floor --n 1 --go
    python3 tools/pixellab_batch.py run --all --go                # 全部，一批 5 張依序跑
    python3 tools/pixellab_batch.py post                          # 從原圖重做後處理（不花點數）
    python3 tools/pixellab_batch.py balance
- 沒加 --go 一律只預覽；一批最多 5 張（--all 就是一批一批跑）。
- 第 k 張用 seed0 + k；art/_raw/<id>/<id>-s<seed>.png 已存在就跳過（重跑接著做）。
- 原圖與 .json 在 art/_raw/<id>/，後處理結果在 art/_raw/<id>/post/；挑去正式目錄由 tools/asset_check.py 做。
- 有 after 的工作（16 的王印）：init_image = 該 32 工作在正式目錄裡種子最小的過關圖，最近鄰縮成 16。
"""
import argparse, base64, io, json, os, pathlib, re, sys, urllib.error, urllib.request
import numpy as np
from PIL import Image

API = 'https://api.pixellab.ai/v2'
ROOT = pathlib.Path(__file__).resolve().parent.parent
DOC = ROOT / 'docs/production/specs/M2-36-pixellab-prompts.md'
RAW = ROOT / 'art/_raw'
BATCH = 5


def jobs():
    text = DOC.read_text(encoding='utf-8')
    return json.loads(re.search(r'## 3\..*?```json\n(.*?)\n```', text, re.S).group(1))


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
def fix_isolated(idx):
    """上下左右都不同色的像素改成多數鄰居色（左右上下相接，因為地磚要拼）"""
    nb = np.stack([np.roll(idx, s, a) for s, a in ((1, 0), (-1, 0), (1, 1), (-1, 1))])
    iso = (nb != idx).all(0)
    out = idx.copy()
    for y, x in zip(*np.nonzero(iso)):
        v, n = np.unique(nb[:, y, x], return_counts=True)
        out[y, x] = v[n.argmax()]
    return out


def floor_remap(im, pal):
    """明度排名：最暗 28% → -edge，最亮 2% → -mid，其他 → -ground。
    PixelLab 回來只有 3 色，同明度一大片；只照掃描順序會讓 -mid 永遠擠在右下角，
    所以同明度再比周圍 5×5（左右上下相接）的平均明度，最後才照原本排列。"""
    a = np.asarray(im.convert('RGB'))
    L2 = lab(a)[..., 0]
    near = sum(np.roll(np.roll(L2, dy, 0), dx, 1) for dy in range(-2, 3) for dx in range(-2, 3))
    L = L2.ravel()
    order = np.lexsort((near.ravel(), L))
    n = L.size
    idx = np.ones(n, int)
    idx[order[: round(n * 0.28)]] = 0
    idx[order[n - round(n * 0.02):]] = 2
    idx = fix_isolated(idx.reshape(a.shape[:2]))
    return [Image.fromarray(np.array([hexrgb(c) for c in pal], np.uint8)[idx], 'RGB')], {}


def split_2x32(im, pal):
    w = im.width // 2
    return [im.crop((0, 0, w, im.height)), im.crop((w, 0, im.width, im.height))], {}


def alpha_binary(im, pal):
    a = np.asarray(im.convert('RGBA')).copy()
    on = a[..., 3] >= 128
    a[..., 3] = np.where(on, 255, 0)
    i, d = nearest(a[..., :3][on], pal)
    a[..., :3][on] = np.array([hexrgb(c) for c in pal], np.uint8)[i]
    a[..., :3][~on] = 0
    return [Image.fromarray(a, 'RGBA')], {'max_de_before_snap': round(float(d.max()), 2) if d.size else 0}


POST = {'floor_remap': floor_remap, 'split_2x32': split_2x32, 'alpha_binary': alpha_binary, 'none': lambda im, pal: ([im], {})}


def post_names(stem, post):
    return [f'{stem}-a.png', f'{stem}-b.png'] if post == 'split_2x32' else [f'{stem}.png']


def post(job, d, stem):
    outs, info = POST[job['post']](Image.open(d / f'{stem}.png'), job['palette'])
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
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'API 錯誤 {e.code}：{e.read().decode("utf-8", "replace")[:300]}')


def init_image(job, all_jobs, init=None):
    src = next(j for j in all_jobs if j['id'] == job['after'])
    picks = [pathlib.Path(init)] if init else sorted(pathlib.Path(ROOT / src['out']).glob(f"{src['id']}-s*.png"), key=lambda p: int(re.search(r'-s(\d+)', p.name).group(1)))
    if not picks:
        return None, None
    w, h = job['body']['image_size']['width'], job['body']['image_size']['height']
    return Image.open(picks[0]).convert('RGBA').resize((w, h), Image.NEAREST), picks[0].name


def request(job, seed, all_jobs, init=None):
    body = dict(job['body'], seed=seed, color_image=b64img(palette_png(job['palette'])))
    note = {}
    if 'after' in job:
        im, name = init_image(job, all_jobs, init)
        if im is None:
            return None, None
        body['init_image'], note['init_from'] = b64img(im), name
    return body, note


def run_one(job, k, all_jobs, init=None):
    seed = job['seed0'] + k
    stem = f"{job['id']}-s{seed}"
    d = RAW / job['id']
    body, note = request(job, seed, all_jobs, init)
    if body is None:
        return print(f"  跳過 {stem}：{job['after']} 還沒有過關的圖（先跑 asset_check.py）")
    r = http('POST', job['endpoint'], body)
    d.mkdir(parents=True, exist_ok=True)
    (d / 'post').mkdir(exist_ok=True)
    im = Image.open(io.BytesIO(base64.b64decode(r['image']['base64'])))
    im.save(d / f'{stem}.png')
    info = post(job, d, stem)
    req = {k2: ('(base64 略)' if isinstance(v, dict) and 'base64' in v else v) for k2, v in body.items()}
    r['image']['base64'] = '(存成 png，略)'
    meta = {'endpoint': 'POST /v2' + job['endpoint'], 'job': job['id'], 'seed': seed, 'post': job['post'], **note, **info,
            'request': req, 'usage': r.get('usage'), 'response': r}
    (d / f'{stem}.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"  完成 {stem}.png {im.size} {im.mode}，用量 {r.get('usage')}")


def main():
    p = argparse.ArgumentParser(description='PixelLab 地磚與王印批次工具（M2-36 §3）')
    p.add_argument('cmd', choices=['list', 'run', 'post', 'balance'])
    p.add_argument('--job', default='', help='逗號分隔的 id')
    p.add_argument('--all', action='store_true')
    p.add_argument('--n', type=int, default=0, help='每個工作最多幾張（0 = 照工作表）')
    p.add_argument('--init', help='16 的王印改用這張當 init_image（只給小跑驗工具用）')
    p.add_argument('--go', action='store_true', help='真的送出，會花點數')
    a = p.parse_args()
    if a.cmd == 'balance':
        return print(json.dumps(http('GET', '/balance'), ensure_ascii=False))
    js = jobs()
    if a.cmd == 'list':
        for j in js:
            s = j['body']['image_size']
            print(f"{j['id']:22} {j['endpoint']:22} {s['width']}×{s['height']} n={j['n']} seed0={j['seed0']} post={j['post']} → {j['out']}")
        return
    if a.cmd == 'post':  # 改了後處理：從 art/_raw 的原圖重做，不花點數
        for j in js:
            for f in sorted((RAW / j['id']).glob('*.json')):
                m = json.loads(f.read_text(encoding='utf-8'))
                m.update(post(j, RAW / j['id'], f.stem))
                f.write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding='utf-8')
                print('重做', f.stem)
        return
    want = [x for x in a.job.split(',') if x]
    bad = [x for x in want if x not in {j['id'] for j in js}]
    if bad or not (want or a.all):
        sys.exit('沒有這些 id：' + '、'.join(bad) if bad else '請用 --job 指定 id，或加 --all')
    todo = [(j, k) for j in js if a.all or j['id'] in want for k in range(min(j['n'], a.n or j['n']))
            if not (RAW / j['id'] / f"{j['id']}-s{j['seed0'] + k}.png").exists()]
    print(f'這次 {len(todo)} 張，預估 {len(todo)} 次生成；一批最多 {BATCH} 張')
    if not a.all:
        todo = todo[:BATCH]
    for b in range(0, len(todo), BATCH):
        print(f'第 {b // BATCH + 1} 批')
        for j, k in todo[b:b + BATCH]:
            print(f"- {j['id']} s{j['seed0'] + k}：{j['endpoint']} {j['body']['description'][:90]}…")
            if a.go:
                run_one(j, k, js, a.init)
    if not a.go:
        print('只是預覽，沒有送出。確認後加 --go')


if __name__ == '__main__':
    main()
