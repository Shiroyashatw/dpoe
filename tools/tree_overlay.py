"""天賦樹 1280×720 疊圖（S/talent-tree.md v1.0.1）：示意圖（2× 含圖例）裁出遊戲區 → 縮成 1280×720，
跟 tools/tree_check.js 的實機截圖各半透明疊在一起；紅框＝規格／示意圖座標、綠框＝實機量到的位置；另寫逐項位置差表 diff.md。
遊戲區在 2× 圖上是 40,40 起的 2560×1440（跟 tools/skill_overlay.py 同一個量法）。
規格只給寬（h＝0）的元件（懸浮窗、名詞提示：位置跟著點走）只比寬，x、y、h 寫「—」。
390×844：W5 沒有 390 的示意圖（規格「不含 390」），只把 01 縮到 390 寬跟實機並排，不比座標。
用法：python3 tools/tree_overlay.py <tree_check 的截圖資料夾> [輸出資料夾]"""
import json, os, sys
from PIL import Image, ImageDraw

D = sys.argv[1]
O = sys.argv[2] if len(sys.argv) > 2 else D
os.makedirs(O, exist_ok=True)
WF = os.path.join(os.path.dirname(__file__), '..', 'docs', 'production', 'specs', 'wireframes', 'W5-talent-tree')
GAME = (40, 40, 2600, 1480)
B = json.load(open(os.path.join(D, 'boxes.json')))
rows = ['# 天賦樹 1280×720 疊圖：規格座標 vs 實機（px）', '',
        '紅框＝規格（`S/talent-tree.md` 殼與元件表、示意圖圖例）座標，綠框＝實機（`tools/tree_check.js` 量 DOM）。差值＝實機 − 規格；`—`＝實機沒有這個元素或規格沒給。'
        '每張左半是示意圖遊戲區與實機各 50% 疊圖，右半是實機原圖。容差 ±1 px。', '']
bad = 0
for n, L in B.items():
    wf = Image.open(os.path.join(WF, n + '.png')).convert('RGB').crop(GAME).resize((1280, 720), Image.LANCZOS)
    sh = Image.open(os.path.join(D, n + '.png')).convert('RGB')
    ov = Image.blend(wf, sh, 0.5)
    dr = ImageDraw.Draw(ov)
    rows += [f'## {n}', '', f'![{n}](overlay-{n}.jpg)', '', '| 元件 | 規格 x,y w×h | 實機 x,y w×h | 差 Δx,Δy Δw,Δh | 符合 |', '|---|---|---|---|---|']
    for lab, q, sp, ac in L:
        x, y, w, h = sp
        wonly = h == 0
        if not wonly:
            dr.rectangle([x, y, x + w - 1, y + h - 1], outline=(255, 60, 60), width=1)
        if ac:
            ax, ay, aw, ah = ac
            dr.rectangle([ax, ay, ax + aw - 1, ay + ah - 1], outline=(60, 255, 90), width=1)
            if wonly:
                ok = abs(aw - w) <= 1
                rows.append(f'| {lab} | 寬 {w}（位置跟著點） | {ax},{ay} {aw}×{ah} | —,— {aw - w:+},— | {"✅" if ok else "❌"} |')
            else:
                d = [ax - x, ay - y, aw - w, ah - h]
                ok = all(abs(v) <= 1 for v in d)
                rows.append(f'| {lab} | {x},{y} {w}×{h} | {ax},{ay} {aw}×{ah} | {d[0]:+},{d[1]:+} {d[2]:+},{d[3]:+} | {"✅" if ok else "❌"} |')
            bad += not ok
        else:
            bad += 1
            rows.append(f'| {lab} | {x},{y} {w}×{h} | — | — | ❌ |')
    both = Image.new('RGB', (2560, 720))
    both.paste(ov, (0, 0))
    both.paste(sh, (1280, 0))
    both.save(os.path.join(O, f'overlay-{n}.jpg'), quality=82)
    rows.append('')
m = os.path.join(D, '390x844-tree.png')
if os.path.exists(m):
    wf = Image.open(os.path.join(WF, '01-overview.png')).convert('RGB').crop(GAME).resize((390, 219), Image.LANCZOS)
    sh = Image.open(m).convert('RGB')
    both = Image.new('RGB', (800, 844), (255, 255, 255))
    both.paste(wf, (0, 0))
    both.paste(sh, (410, 0))
    both.save(os.path.join(O, 'overlay-390x844.jpg'), quality=82)
    rows += ['## 390×844', '', '![390×844](overlay-390x844.jpg)', '',
             'W5 沒有 390×844 的示意圖（規格範圍「不含 390（待下一版）」），沒有座標可比：左為 01 總覽縮到 390 寬、右為實機。'
             '行動版以自動測試（tools/tree_check.js 390×844 段、tools/touch_check.js）通過為完成標準。', '']
rows.insert(4, f'不符 {bad} 項（明細見各表 ❌）。')
open(os.path.join(O, 'diff.md'), 'w').write('\n'.join(rows) + '\n')
print('\n'.join(r for r in rows if '❌' in r or r.startswith('## ')))
print(f'不符 {bad} 項')
