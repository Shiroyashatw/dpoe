#!/usr/bin/env python3
"""用 PixelLab 的 POST /v2/vfx 批次產技能特效：讀 docs/特效提示詞.md，結果放 art/fx/名字/（不會直接進遊戲）。

金鑰只讀環境變數 PIXELLAB_API_KEY，不要寫進程式或 commit。PowerShell：
    $env:PIXELLAB_API_KEY = '你的token'

用法（在 dpoe/ 底下）：
    python tools/vfx_gen.py list                                         # 列出全部提示詞，不花點數
    python tools/vfx_gen.py run --only shieldcrush,bloom,void            # 只預覽要送什麼，不花點數
    python tools/vfx_gen.py run --only shieldcrush,bloom,void --go       # 真的送出（會花點數）
    python tools/vfx_gen.py run --all --limit 10 --go                    # 依序產，已有結果的跳過
    python tools/vfx_gen.py run --only void --artist pro --go            # pro 一張 6 次以上，預設 lite 1 次
    python tools/vfx_gen.py run --only void --force --go                 # 重產（舊結果留在 old/）
    python tools/vfx_gen.py test                                         # 不連網的自我檢查

- 沒加 --go 一律只預覽；一次最多 --limit 張（預設 5），避免手滑花掉點數。
- 中斷了重跑會接著做：art/fx/名字/result.json 存在就跳過。
"""
import argparse, json, os, pathlib, re, shutil, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://api.pixellab.ai/v2'
ROOT = pathlib.Path(__file__).resolve().parent.parent
DOC = ROOT / 'docs/特效提示詞.md'
OUT = ROOT / 'art/fx'
UA = 'dpoe-vfx-tool'
POLL_S, POLL_MAX = 8, 300


def token():
    t = os.environ.get('PIXELLAB_API_KEY', '').strip()
    if not t:
        sys.exit('請先設定環境變數 PIXELLAB_API_KEY（pixellab.ai/account 的 API token）')
    return t


def http(method, url, body=None, auth=True):
    h = {'User-Agent': UA}
    if auth:
        h['Authorization'] = 'Bearer ' + token()
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        h['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def api(method, path, body=None):
    for n in range(5):
        try:
            return json.loads(http(method, API + path, body))
        except urllib.error.HTTPError as e:
            text = e.read().decode('utf-8', 'replace')[:300]
            if e.code in (429, 503) and n < 4:
                wait = 15 * (n + 1)
                print(f'  忙碌（{e.code}），{wait} 秒後重試')
                time.sleep(wait)
                continue
            sys.exit(f'API 錯誤 {e.code}：{text}')
        except urllib.error.URLError as e:
            if n < 4:
                time.sleep(5)
                continue
            sys.exit(f'連不上 API：{e.reason}')


def parse(text):
    """### id｜名字｜說明、下一行規格（64×64・10 幀・一次・朝右）、再來是 ``` 提示詞 ```"""
    prefix = re.search(r'每一筆提示詞的開頭都加上這句：\s*```\s*(.*?)\s*```', text, re.S).group(1).strip()
    items = []
    for m in re.finditer(r'^### ([\w-]+)｜(.+?)\n(.+?)\n```\n(.*?)\n```', text, re.M | re.S):
        pid, title, spec, body = m.group(1), m.group(2).strip(), m.group(3).strip(), m.group(4).strip()
        size = re.search(r'(\d+)×(\d+)', spec)
        frames = re.search(r'(\d+)\s*幀', spec)
        items.append({
            'id': pid, 'title': title, 'spec': spec,
            'w': int(size.group(1)) if size else 64, 'h': int(size.group(2)) if size else 64,
            'frames': int(frames.group(1)) if frames else 8,
            'loop': '循環' in spec, 'right': '朝右' in spec, 'prompt': body
        })
    return prefix, items


def describe(prefix, it):
    tail = f"canvas {it['w']}x{it['h']} pixels, {it['frames']} frames, " + ('seamless loop' if it['loop'] else 'plays once')
    if it['right']:
        tail += ', drawn facing right'
    return f"{prefix} {it['prompt']}. {tail}. No black outline."


def urls(v):
    """API 的 files 可能是字串、清單或物件，全部撈出下載連結"""
    if isinstance(v, str):
        return [v] if v.startswith('http') else []
    if isinstance(v, dict):
        return [u for x in v.values() for u in urls(x)]
    if isinstance(v, list):
        return [u for x in v for u in urls(x)]
    return []


def fetch(it, prefix, artist, force):
    d = OUT / it['id']
    if (d / 'result.json').exists():
        if not force:
            print(f"跳過 {it['id']}：已有結果")
            return 0
        old = d / 'old' / time.strftime('%Y%m%d-%H%M%S')
        old.mkdir(parents=True)
        for f in d.iterdir():
            if f.is_file():
                shutil.move(str(f), old / f.name)
    d.mkdir(parents=True, exist_ok=True)
    print(f"送出 {it['id']}（{it['title']}）")
    r = api('POST', '/vfx', {'description': describe(prefix, it), 'artist': artist, 'name': 'dpoe_' + it['id']})
    job = r['background_job_id']
    print(f"  報價 {r.get('quoted_generations')} 次，等待結果")
    for _ in range(POLL_MAX // POLL_S):
        time.sleep(POLL_S)
        j = api('GET', f'/background-jobs/{job}')
        st = j.get('status')
        if st == 'completed':
            res = j.get('last_response') or {}
            links = sorted(set(urls(res.get('files'))))
            for u in links:
                name = pathlib.PurePosixPath(urllib.parse.urlparse(u).path).name
                (d / name).write_bytes(http('GET', u, auth=False))
                print('  下載', name)
            (d / 'result.json').write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding='utf-8')
            print(f"  完成：{res.get('frames')} 幀、{res.get('canvas')}、{res.get('fps')} fps → art/fx/{it['id']}/")
            return r.get('quoted_generations') or 0
        if st in ('failed', 'error', 'cancelled'):
            print(f"  失敗：{json.dumps(j, ensure_ascii=False)[:300]}")
            return 0
    print(f"  等太久，工作編號 {job}（完成才計費，可到網站的 My effects 查看）")
    return 0


def self_test():
    prefix, items = parse(DOC.read_text(encoding='utf-8'))
    ids = [i['id'] for i in items]
    assert prefix.startswith('pixel art VFX animation')
    assert len(items) == 34 and len(set(ids)) == 34, len(items)
    s = next(i for i in items if i['id'] == 'shieldcrush')
    assert (s['w'], s['h'], s['frames'], s['loop'], s['right']) == (64, 64, 10, False, True), s
    f = next(i for i in items if i['id'] == 'frostbolt')
    assert (f['w'], f['frames'], f['loop']) == (64, 8, True), f
    t = describe(prefix, f)
    assert 'seamless loop' in t and 'canvas 64x64' in t and t.startswith(prefix) and len(t) < 700  # 700 字起 lite 報價變 2 倍
    assert urls({'a': 'https://x/a.png', 'b': ['https://x/b.gif', 'nope'], 'c': {'d': 'https://x/c.json'}}) == ['https://x/a.png', 'https://x/b.gif', 'https://x/c.json']
    print('自我檢查通過：34 筆提示詞')


def main():
    sys.stdout.reconfigure(errors='replace')  # Windows 主控台遇到編不出的字不要中斷批次
    p = argparse.ArgumentParser(description='PixelLab VFX 批次工具')
    p.add_argument('cmd', choices=['list', 'run', 'test'])
    p.add_argument('--only', default='', help='逗號分隔的 id')
    p.add_argument('--all', action='store_true', help='跑全部還沒產的')
    p.add_argument('--limit', type=int, default=5, help='這次最多幾張')
    p.add_argument('--artist', choices=['lite', 'pro'], default='lite')
    p.add_argument('--force', action='store_true', help='已有結果也重產')
    p.add_argument('--go', action='store_true', help='真的送出，會花點數')
    a = p.parse_args()
    if a.cmd == 'test':
        return self_test()
    prefix, items = parse(DOC.read_text(encoding='utf-8'))
    if a.cmd == 'list':
        for i in items:
            print(f"{i['id']:16} {i['w']}×{i['h']} {i['frames']:>2} 幀 {'循環' if i['loop'] else '一次'}  {i['title']}")
        return print(f'共 {len(items)} 筆')
    want = [x for x in a.only.split(',') if x]
    bad = [x for x in want if x not in {i['id'] for i in items}]
    if bad:
        sys.exit('沒有這些 id：' + '、'.join(bad))
    if not want and not a.all:
        sys.exit('請用 --only 指定 id，或加 --all')
    pick = [i for i in items if (i['id'] in want or a.all) and (a.force or not (OUT / i['id'] / 'result.json').exists())][: a.limit]
    each = 1 if a.artist == 'lite' else 6
    print(f'這次 {len(pick)} 張，{a.artist}，預估 {len(pick) * each} 次生成數（實際以 API 報價為準）')
    for i in pick:
        print(f"- {i['id']}：{describe(prefix, i)[:150]}…")
    if not a.go:
        return print('只是預覽，沒有送出。確認後加 --go')
    total = sum(fetch(i, prefix, a.artist, a.force) for i in pick)
    print(f'完成，這批報價合計 {total} 次生成數')


if __name__ == '__main__':
    main()
