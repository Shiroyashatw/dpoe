"""check3 疊圖（方法同 tools/char_overlay.py 與 check2）：示意圖 2× 圖裁出遊戲區 (40,40)-(2600,1480) → 縮成 1280×720，
與實機截圖 50% 疊合；紅框＝圖例座標、綠框＝實機量到的位置。另出「示意｜實機」並排圖。
用法：python3 overlay.py <states 資料夾> <輸出資料夾> <示意圖資料夾>"""
import json, os, sys
from PIL import Image, ImageDraw
D, O, WF = sys.argv[1:4]
os.makedirs(O, exist_ok=True)
B = json.load(open(os.path.join(D, 'boxes.json')))
MAP = {'04a-single-def': '04a-cands-hover', '04b-single-def': '04b-cands-hover-alt'}
for n, L in B.items():
    if n.startswith('_'): continue
    wf = Image.open(os.path.join(WF, MAP.get(n, n) + '-color.png')).convert('RGB').crop((40, 40, 2600, 1480)).resize((1280, 720), Image.LANCZOS)
    sh = Image.open(os.path.join(D, n + '.png')).convert('RGB')
    wf.save(os.path.join(O, f'wf-{n}.png'))
    ov = Image.blend(wf, sh, 0.5); dr = ImageDraw.Draw(ov)
    for lab, sp, ac in L:
        x, y, w, h = sp; dr.rectangle([x, y, x + w - 1, y + h - 1], outline=(255, 60, 60))
        if ac: ax, ay, aw, ah = ac; dr.rectangle([ax, ay, ax + aw - 1, ay + ah - 1], outline=(60, 255, 90))
    ov.save(os.path.join(O, f'overlay-{n}.png'))
    side = Image.new('RGB', (1280 * 2 + 8, 720), (255, 0, 255)); side.paste(wf, (0, 0)); side.paste(sh, (1288, 0)); side.save(os.path.join(O, f'side-{n}.png'))
print('ok')
