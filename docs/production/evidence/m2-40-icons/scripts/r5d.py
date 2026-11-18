#!/usr/bin/env python3
"""M2-40 R5d 技能圖示（第 4 輪）：照 docs/production/specs/M2-40-skill-icon-prompts.md（R5d，1dd8a0f）。
在 dpoe/ 底下跑：python3 -I <本檔> {preview|go} <批> id:k,...｜check id:stem,...
端點：POST /v2/create-image-pixflux，init_image＝上色導引圖（art/_raw/skill/guide/<id>.png，r5d_guide.py 畫），init_image_strength 150；
不給 style_image、color_image；不要的寫 negative_description。後處理、檢查沿用 r5c（不吸色）。金鑰只讀環境變數，沒有就交給雲端代理。
"""
import base64, io, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import r5c
from r5c import P, RAW, EV, Image, JOBS

r5c.CAP, r5c.ROUND, r5c.SEED_ADD = 25, 'r5d', 3000
r5c.STATE, r5c.REVIEW = EV / 'r5d_state.json', EV / 'r5d_review.csv'
r5c.RERUN_NOT = json.loads((EV / 'r5d_rerun_not.json').read_text(encoding='utf-8')) if (EV / 'r5d_rerun_not.json').exists() else {}
STRENGTH = 150
if not r5c.STATE.exists():  # sk_clarity 沿用 r5c 的 s6201（美術手修），不再生成
    r5c.STATE.write_text(json.dumps({'sk_clarity': 'sk_clarity-s6201'}, indent=1), encoding='utf-8')


def gen(i, k):
    s = r5c.seed(i, k)
    stem = f'{i}-s{s}'
    d = RAW / i
    if (d / f'{stem}.png').exists():
        return stem
    guide = Image.open(RAW / 'guide' / f'{i}.png').convert('RGBA')
    while True:
        dd, nn = r5c.desc(i, k)
        body = dict(r5c.BODY, description=dd, seed=s, init_image=P.b64img(guide), init_image_strength=STRENGTH)
        if nn:
            body['negative_description'] = nn
        try:
            r = P.http('POST', r5c.ENDPOINT, body)
            break
        except SystemExit as e:
            if nn and 'negative' in str(e) and not r5c.NEG_FALLBACK:
                print('  negative_description 被拒，退回 description 的 no …：', str(e)[:200])
                r5c.NEG_FALLBACK = True
                continue
            raise
    d.mkdir(parents=True, exist_ok=True)
    Image.open(io.BytesIO(base64.b64decode(r['image']['base64']))).save(d / f'{stem}.png')
    req = {a: ('(base64 略)' if isinstance(v, dict) and 'base64' in v else v) for a, v in body.items()}
    (d / f'{stem}.json').write_text(json.dumps({'round': 'r5d', 'endpoint': 'POST /v2' + r5c.ENDPOINT, 'job': i, 'seed': s, 'rerun': k,
                                                'init_image': f'art/_raw/skill/guide/{i}.png', 'negative_description_accepted': not r5c.NEG_FALLBACK,
                                                'request': req, 'usage': r.get('usage')}, ensure_ascii=False, indent=2), encoding='utf-8')
    print('  完成', stem, r.get('usage'))
    return stem


r5c.gen = gen

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd in ('preview', 'go'):
        items = [(x.split(':')[0], int(x.split(':')[1])) for x in sys.argv[3].split(',')]
        stems = r5c.run(sys.argv[2], items, cmd == 'go')
        if stems:
            r5c.check(list(zip([i for i, _ in items], stems)))
    elif cmd == 'check':
        r5c.check([tuple(x.split(':')) for x in sys.argv[2].split(',')])
