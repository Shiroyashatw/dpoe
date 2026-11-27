"""營地 v1.0／倉庫 v1.0 疊圖（tools/camp_stash_check.js 拍的 1280×720 實機截圖 × 上色示意圖的遊戲區）。

示意圖是 2× 截圖後裁切（含右側圖例與紅標）：遊戲區＝(40,40)–(2600,1480)，縮成 1280×720 再比。
每張輸出：<名>-pair.jpg（左示意、右實機）、<名>-overlay.jpg（實機 50% 疊在示意上）；
REPORT.md 逐項列元素的規格框（圖例座標／尺寸）與實機框、差（px），超過 2 px 記 ❌（照實列，不放寬）。
用法：python3 tools/camp_stash_overlay.py <截圖資料夾> <輸出資料夾>
"""
import glob
import json
import os
import sys

from PIL import Image

SHOTS, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
ROOT = os.path.join(os.path.dirname(__file__), '..', 'docs', 'production', 'specs', 'wireframes')
BOX = json.load(open(os.path.join(SHOTS, 'boxes.json'), encoding='utf-8'))


def mock(name):
    """camp-04-detail-forge → W2-camp/color/04-*.png；stash-07-compare → W-stash/color/07-*.png"""
    kind, num = name.split('-')[:2]
    d = 'W2-camp' if kind == 'camp' else 'W-stash'
    if not num.isdigit():
        return None
    L = sorted(glob.glob(os.path.join(ROOT, d, 'color', num + '-*.png')))
    return L[0] if L else None


rows = ['# 營地／倉庫 1280×720 疊圖報告', '',
        '示意圖遊戲區 (40,40)–(2600,1480) 縮成 1280×720；實機用預裝 Playwright Chromium（/opt/pw-browsers/chromium）拍。',
        '差＝實機 − 規格（px）；|差| ≤ 2 記 ✅，其餘 ❌。規格欄是圖例寫的座標／尺寸；圖例沒寫高度的（浮層）只比 x、y、寬。', '']
tot = [0, 0]
for shot in sorted(glob.glob(os.path.join(SHOTS, '*.png'))):
    name = os.path.basename(shot)[:-4]
    if name.startswith('390'):
        continue
    real = Image.open(shot).convert('RGB')
    m = mock(name)
    rows.append(f'## {name}')
    if m:
        base = Image.open(m).convert('RGB').crop((40, 40, 2600, 1480)).resize((1280, 720), Image.LANCZOS)
        pair = Image.new('RGB', (2560, 720))
        pair.paste(base, (0, 0))
        pair.paste(real, (1280, 0))
        pair.save(os.path.join(OUT, name + '-pair.jpg'), quality=85)
        Image.blend(base, real, 0.5).save(os.path.join(OUT, name + '-overlay.jpg'), quality=85)
        rows.append(f'示意圖：`{os.path.relpath(m, os.path.join(os.path.dirname(__file__), ".."))}`；'
                    f'[並排]({name}-pair.jpg)・[疊圖]({name}-overlay.jpg)・[實機]({os.path.basename(shot)})')
    else:
        rows.append(f'（沒有對應示意圖）[實機]({os.path.basename(shot)})')
    L = BOX.get(name, [])
    if L:
        rows += ['', '| 元素 | 規格 x,y,w,h | 實機 x,y,w,h | 差 dx,dy,dw,dh | 判定 |', '| --- | --- | --- | --- | --- |']
        for el, _q, sp, rb in L:
            if not rb:
                rows.append(f'| {el} | {sp} | （沒有這個元素） | — | ❌ |')
                tot[1] += 1
                continue
            n = 3 if el.endswith(('提示', '浮窗', '確認卡', '小窗', '懸停')) else 4
            d = [rb[i] - sp[i] for i in range(4)]
            good = all(abs(d[i]) <= 2 for i in range(n))
            tot[0 if good else 1] += 1
            ds = ','.join(f'{x:+d}' for x in d[:n]) + ('' if n == 4 else ',（高未標）')
            rows.append(f'| {el} | {",".join(map(str, sp))} | {",".join(map(str, rb))} | {ds} | {"✅" if good else "❌"} |')
    rows.append('')
rows.insert(4, f'合計：{tot[0]} ✅ ／ {tot[1]} ❌（元素框）')
open(os.path.join(OUT, 'REPORT.md'), 'w', encoding='utf-8').write('\n'.join(rows) + '\n')
print(f'{tot[0]} ✅ / {tot[1]} ❌')
