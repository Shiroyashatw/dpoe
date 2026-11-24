"""角色頁 1280×720 疊圖（M2-character-1280）：示意圖（2× 含圖例）裁出左上遊戲區 2560×1440 → 縮成 1280×720，
跟 tools/char_check.js 的實機截圖各半透明疊在一起；紅框＝圖例座標、綠框＝實機量到的位置；另寫逐項位置差表 diff.md。
用法：python3 tools/char_overlay.py <char_check 的截圖資料夾>（輸出也寫在同一個資料夾）"""
import json, os, sys
from PIL import Image, ImageDraw

D = sys.argv[1]
WF = os.path.join(os.path.dirname(__file__), '..', 'docs', 'production', 'specs', 'wireframes', 'W3-character', 'color')
GAME = (40, 40, 2600, 1440 + 40)  # 2× 圖上的遊戲區（左上 40,40 起，圖例在右）
B = json.load(open(os.path.join(D, 'boxes.json')))
rows = ['# 角色頁 1280×720 疊圖：示意圖圖例座標 vs 實機（px）', '',
        '紅框＝示意圖圖例座標，綠框＝實機（`tools/char_check.js` 量 DOM）。差值＝實機 − 規格；`—`＝實機沒有這個元素。'
        '浮窗各層的高度已扣掉層間距下半（padding 12＋線 1），跟圖例的層高同一個量法。', '']
for n, L in B.items():
    wf = Image.open(os.path.join(WF, n + '-color.png')).convert('RGB').crop(GAME).resize((1280, 720), Image.LANCZOS)
    sh = Image.open(os.path.join(D, n + '.png')).convert('RGB')
    ov = Image.blend(wf, sh, 0.5)
    dr = ImageDraw.Draw(ov)
    rows += [f'## {n}', '', f'![{n}](overlay-{n}.png)', '', '| 圖例 | 規格 x,y w×h | 實機 x,y w×h | 差 Δx,Δy Δw,Δh | 符合 |', '|---|---|---|---|---|']
    for lab, q, sp, ac in L:
        x, y, w, h = sp
        dr.rectangle([x, y, x + w - 1, y + h - 1], outline=(255, 60, 60), width=1)
        if ac:
            ax, ay, aw, ah = ac
            dr.rectangle([ax, ay, ax + aw - 1, ay + ah - 1], outline=(60, 255, 90), width=1)
            d = [ax - x, ay - y, aw - w, ah - h]
            ok = all(abs(v) <= 1 for v in d)
            rows.append(f'| {lab} | {x},{y} {w}×{h} | {ax},{ay} {aw}×{ah} | {d[0]:+},{d[1]:+} {d[2]:+},{d[3]:+} | {"✅" if ok else "❌"} |')
        else:
            rows.append(f'| {lab} | {x},{y} {w}×{h} | — | — | ❌ |')
    ov.save(os.path.join(D, f'overlay-{n}.png'))
    rows.append('')
open(os.path.join(D, 'diff.md'), 'w').write('\n'.join(rows) + '\n')
print('\n'.join(r for r in rows if '❌' in r or r.startswith('## ')))
