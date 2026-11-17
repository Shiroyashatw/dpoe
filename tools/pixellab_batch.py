#!/usr/bin/env python3
"""用 PixelLab 的 POST /v2/create-image-pixflux 產地磚（M2-36 方向 A 廟宇古地圖），結果放 art/_tmp/pixellab-test/。

金鑰只讀環境變數 PIXELLAB_API_KEY（同 vfx_gen.py），不要寫進程式或 commit。

用法（在 dpoe/ 底下）：
    python tools/pixellab_batch.py tile --terrain temple            # 只預覽，不花點數
    python tools/pixellab_batch.py tile --terrain temple --n 2 --go  # 真的送出，一張 1 次生成
- 沒加 --go 一律只預覽；一次最多 5 張。
- 色票：地形的 -ground／-mid／-light／-edge 當強制色盤（docs/production/specs/M2-36-palette-tokens.md）。
"""
import argparse, base64, json, os, pathlib, struct, sys, time, urllib.error, urllib.request, zlib

API = 'https://api.pixellab.ai/v2'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'art/_tmp/pixellab-test'
PAL = {  # -ground, -mid, -light, -edge
    'temple': ['1d1203', '4b3b2b', '7c644c', '120700'],
    'lava': ['211007', '52372e', '865f51', '150500'],
    'tomb': ['171507', '413e2d', '6d6950', '0c0900'],
    'ice': ['0a1619', '304044', '536c72', '010b0d'],
}
PROMPT = ('seamless tileable dungeon floor tile, top-down, ancient temple flagstones like a faded old map, '
          'worn square stone slabs with thin engraved lines and cracks, dark muted earth tones, low contrast, '
          'even lighting, no objects, no characters, no text, no border')


def png(colors):
    """把色票做成 1 列的小 PNG，給 color_image 用"""
    row = b'\0' + b''.join(bytes.fromhex(c) for c in colors)
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', len(colors), 1, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(row)) + chunk(b'IEND', b''))


def body(terrain, size, seed):
    return {'description': PROMPT, 'image_size': {'width': size, 'height': size}, 'view': 'high top-down',
            'outline': 'lineless', 'shading': 'basic shading', 'detail': 'medium detail', 'no_background': False,
            'seed': seed, 'color_image': {'type': 'base64', 'base64': base64.b64encode(png(PAL[terrain])).decode()}}


def post(path, b):
    t = os.environ.get('PIXELLAB_API_KEY', '').strip()
    if not t:
        sys.exit('請先設定環境變數 PIXELLAB_API_KEY')
    req = urllib.request.Request(API + path, json.dumps(b).encode(), method='POST',
                                 headers={'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'API 錯誤 {e.code}：{e.read().decode("utf-8", "replace")[:300]}')


def main():
    p = argparse.ArgumentParser(description='PixelLab 地磚批次工具')
    p.add_argument('cmd', choices=['tile'])
    p.add_argument('--terrain', choices=list(PAL), default='temple')
    p.add_argument('--n', type=int, default=1, help='張數，上限 5')
    p.add_argument('--size', type=int, default=64)
    p.add_argument('--go', action='store_true', help='真的送出，會花點數')
    a = p.parse_args()
    n = max(1, min(a.n, 5))
    print(f'POST /create-image-pixflux × {n}，{a.size}×{a.size}，{a.terrain} 色票 {PAL[a.terrain]}，預估 {n} 次生成')
    print('提示詞：' + PROMPT)
    if not a.go:
        return print('只是預覽，沒有送出。確認後加 --go')
    OUT.mkdir(parents=True, exist_ok=True)
    for i in range(n):
        seed = int(time.time()) + i
        r = post('/create-image-pixflux', body(a.terrain, a.size, seed))
        name = f'tile-{a.terrain}-{seed}'
        (OUT / f'{name}.png').write_bytes(base64.b64decode(r['image']['base64']))
        r['image']['base64'] = '(存成 png，略)'
        req = body(a.terrain, a.size, seed)
        (OUT / f'{name}.json').write_text(json.dumps({'endpoint': 'POST /v2/create-image-pixflux', 'request': req, 'response': r},
                                                     ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'  完成 {name}.png，用量 {r.get("usage")}')


if __name__ == '__main__':
    main()
