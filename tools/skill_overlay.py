"""技能面板 1280×720 疊圖（S/skills-panel.md v1.0.1）：示意圖（2× 含圖例）裁出遊戲區 → 縮成 1280×720，
跟 tools/skill_check.js 的實機截圖各半透明疊在一起；紅框＝規格座標、綠框＝實機量到的位置；另寫逐項位置差表 diff.md。
遊戲區在 2× 圖上是 40,40 起的 2560×1440（外面一圈 1× 20 px 的邊，圖例在右；跟 tools/char_overlay.py 同一個量法）。
用法：python3 tools/skill_overlay.py <skill_check 的截圖資料夾>（輸出也寫在同一個資料夾）"""
import json, os, sys
from PIL import Image, ImageDraw

D = sys.argv[1]
WF = os.path.join(os.path.dirname(__file__), '..', 'docs', 'production', 'specs', 'wireframes', 'W4-skill-panel', 'color')
GAME = (40, 40, 2600, 1440 + 40)
B = json.load(open(os.path.join(D, 'boxes.json')))
rows = ['# 技能面板 1280×720 疊圖：規格座標 vs 實機（px）', '',
        '紅框＝規格（`S/skills-panel.md` 元件表）座標，綠框＝實機（`tools/skill_check.js` 量 DOM）。差值＝實機 − 規格；`—`＝實機沒有這個元素。'
        '每張左半是示意圖遊戲區與實機各 50% 疊圖，右半是實機原圖。', '']
bad = 0
for n, L in B.items():
    wf = Image.open(os.path.join(WF, n + '-color.png')).convert('RGB').crop(GAME).resize((1280, 720), Image.LANCZOS)
    sh = Image.open(os.path.join(D, n + '.png')).convert('RGB')
    ov = Image.blend(wf, sh, 0.5)
    dr = ImageDraw.Draw(ov)
    rows += [f'## {n}', '', f'![{n}](overlay-{n}.jpg)', '', '| 元件 | 規格 x,y w×h | 實機 x,y w×h | 差 Δx,Δy Δw,Δh | 符合 |', '|---|---|---|---|---|']
    for lab, q, sp, ac in L:
        x, y, w, h = sp
        dr.rectangle([x, y, x + w - 1, y + h - 1], outline=(255, 60, 60), width=1)
        if ac:
            ax, ay, aw, ah = ac
            dr.rectangle([ax, ay, ax + aw - 1, ay + ah - 1], outline=(60, 255, 90), width=1)
            d = [ax - x, ay - y, aw - w, ah - h]
            ok = all(abs(v) <= 1 for v in d)
            bad += not ok
            rows.append(f'| {lab} | {x},{y} {w}×{h} | {ax},{ay} {aw}×{ah} | {d[0]:+},{d[1]:+} {d[2]:+},{d[3]:+} | {"✅" if ok else "❌"} |')
        else:
            bad += 1
            rows.append(f'| {lab} | {x},{y} {w}×{h} | — | — | ❌ |')
    both = Image.new('RGB', (2560, 720))
    both.paste(ov, (0, 0))
    both.paste(sh, (1280, 0))
    both.save(os.path.join(D, f'overlay-{n}.jpg'), quality=85)
    rows.append('')
open(os.path.join(D, 'diff.md'), 'w').write('\n'.join(rows) + '\n')
print('\n'.join(r for r in rows if '❌' in r or r.startswith('## ')))
print(f'不符 {bad} 項')
