#!/usr/bin/env python3
"""M2-40 R5e 技能圖示（第 5 輪，續跑 22 次）：照 docs/production/specs/M2-40-skill-icon-prompts.md（R5e，a8cef7c）。
在 dpoe/ 底下跑：python3 -I <本檔> {preview|go} <批> id:k,...｜check id:stem,...
生成沿用 r5d（pixflux＋上色導引圖 init 150、無 style_image／color_image、negative_description、seed0＋3000，重跑＋100）。
導引圖先用 r5d_guide.py 畫並預檢（對同欄集 IoU < 0.55 才送）。金鑰只讀環境變數，沒有就交給雲端代理。
"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import r5c, r5d  # r5d 把 r5c.gen 換成導引圖 init 版
from r5c import EV

r5c.CAP, r5c.ROUND, r5c.SEED_ADD = 22, 'r5e', 3000
r5c.STATE, r5c.REVIEW = EV / 'r5e_state.json', EV / 'r5e_review.csv'
r5c.RERUN_NOT = json.loads((EV / 'r5e_rerun_not.json').read_text(encoding='utf-8'))
r5c.COLOURS['sk_fire'] = 'white-yellow hot core, bright orange flames, red outer edge'  # §1：要一眼看出是火，不准粉棕
if not r5c.STATE.exists():  # sk_clarity 沿用 r5c s6201（美術手修）；sk_oilgrenade r5d s7212 三項過（候選）
    r5c.STATE.write_text(json.dumps({'sk_clarity': 'sk_clarity-s6201', 'sk_oilgrenade': 'sk_oilgrenade-s7212'}, indent=1), encoding='utf-8')

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd in ('preview', 'go'):
        items = [(x.split(':')[0], int(x.split(':')[1])) for x in sys.argv[3].split(',')]
        stems = r5c.run(sys.argv[2], items, cmd == 'go')
        if stems:
            r5c.check(list(zip([i for i, _ in items], stems)))
    elif cmd == 'check':
        r5c.check([tuple(x.split(':')) for x in sys.argv[2].split(',')])
