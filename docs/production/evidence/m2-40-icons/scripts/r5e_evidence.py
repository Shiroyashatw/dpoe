"""R5e 證據（r5e_ 前綴）：
- r5e_32_compare.png：每張 導引圖 4x｜彩色 4x＋1x｜灰階 4x＋1x｜生成原圖 4x｜最撞對象 4x｜三項判定＋理由
- r5e_sil_32.png、r5e_sil_16.png：同欄集完整黑剪影（換上 24 張新圖），1x＋2x／4x；金框＝新圖；紅字＝在 IoU≥0.6 配對裡
- r5e_bar_mock.png：52／56 空白鈕，新圖＋最撞對象，彩色＋灰階
- r5e_iou.csv（每張新圖對同欄集每一枚＋拆圖對象，32／16、最大值與對象）、r5e_bar_pairs.csv（同欄集所有 ≥0.6 配對，含舊-舊）、r5e_locations.csv
- r5e_review.csv：重寫成每張一列（最終交叉 IoU＋意思＋目視＋判定）
最終交叉比對用 24 張新圖全集（含量測不過、待手修的），所以 IoU 可能比生成當下（只比已過的）高。
"""
import sys, pathlib, csv, json
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import r5, r5c
from r5c import *
from PIL import ImageDraw, ImageFont

HERE = pathlib.Path(__file__).parent
ST = {'sk_clarity': 'sk_clarity-s6201', 'sk_oilgrenade': 'sk_oilgrenade-s7212'}
ST.update({i: f'{i}-s{JOBS[i]["seed0"] + 3000 + (100 if i in ("sk_fire", "sk_gasflask") else 0)}' for i in JOBS if i not in ST})
NOTE = json.loads((EV / 'r5e_visual_notes.json').read_text(encoding='utf-8'))  # {id: [意思 對/不對, 理由]}
GUIDE = {r['id']: f"{r['max_iou']} {r['with']}" for r in csv.DictReader((EV / 'r5e_guide_precheck.csv').open(encoding='utf-8'))}  # 送出前預檢

# 最終量測（24 張新圖全集互比）
FINAL = {}
for i in JOBS:
    r, rows = evaluate(i, ST[i], ST, {})
    FINAL[i] = (r, rows)
CUR = {i: FINAL[i][0]['iou32_with'] for i in JOBS}

# 沿用 r5 evidence.py 的 IoU 表／配對／剪影／模擬鈕／locations，檔名換 r5e_，撞圖對象換成最終最撞的那枚
src = (HERE / 'evidence.py').read_text(encoding='utf-8')
src = src[:src.index('# r5_32_compare.png')] + src[src.index('# IoU 表與配對'):src.index('# review.csv')]
src = src.replace('st = latest_pass()', 'st = ST').replace("NOTE = json.loads((EV / 'visual_notes.json').read_text(encoding='utf-8'))", '')
src = src.replace("sets = sets_now(st)", "sets = sets_now(st)\nCOLL = {i: [CUR[i]] + COLL[i] for i in JOBS}")
src = src.replace("'r5_", "'r5e_").replace("[old_img(o) for o in COLL[i] if o not in JOBS][:2]",
                  "[(NEW[o] if o in JOBS else old_img(o)) for o in COLL[i]][:1]")
g = dict(globals(), ST=ST, CUR=CUR)
exec(compile(src, 'evidence.py(r5e)', 'exec'), g)

BG, FG, RED = (40, 37, 33, 255), (230, 220, 200, 255), (254, 120, 131, 255)
font = ImageFont.truetype('/usr/share/fonts/opentype/unifont/unifont.otf', 12)
gray, paste = g['gray'], g['paste']
ids = [i for i in JOBS if i not in ('sk_clarity', 'sk_oilgrenade')] + ['sk_oilgrenade', 'sk_clarity']
c = Image.new('RGBA', (1180, 24 + len(ids) * 150), BG)
d = ImageDraw.Draw(c)
d.text((6, 6), 'R5e：導引圖 4x ｜ 彩色 4x、1x ｜ 灰階 4x、1x ｜ 生成原圖 4x ｜ 最撞對象 4x ｜ 判定（畫風／意思／IoU32 全集互比）', fill=FG, font=font)
out = []
for n, i in enumerate(ids):
    r, _ = FINAL[i]
    s = ST[i]
    im = Image.open(OUT / i / f'{s}.png')
    y = 24 + n * 150
    mean, why = NOTE[i]
    iou_ok = r['iou32_max'] < 0.6
    style_ok = r['style'] == '過'
    other = [x for x in r['why'].split('；') if x and not x.startswith(('畫風', 'IoU32'))]
    three = style_ok and mean == '對' and iou_ok
    verdict = ('候選' if three and not other else '三項過，雜點超標待手修' if three else '不過，待手修') if i != 'sk_clarity' else '沿用 r5c，美術手修'
    d.text((6, y), f"{s}  畫風 {r['style']}（{r['style_colors']} 色／L*差 {r['style_dL']}）  意思 {mean}  IoU32 {r['iou32_max']} {r['iou32_with']}"
                   f"{'  其他：' + '、'.join(other) if other else ''}  → {verdict}", fill=FG if verdict == '候選' else RED, font=font)
    gd = RAW / 'guide' / f'{i}.png'
    if gd.exists() and i != 'sk_clarity':
        paste(c, Image.open(gd).convert('RGBA'), 6, y + 16, 4)
    paste(c, im, 140, y + 16, 4); paste(c, im, 274, y + 16); paste(c, gray(im), 312, y + 16, 4); paste(c, gray(im), 446, y + 16)
    paste(c, Image.open(RAW / i / f'{s}.png').convert('RGBA'), 484, y + 16, 4)
    o = r['iou32_with']
    paste(c, g['NEW'][o] if o in JOBS else old_img(o), 618, y + 16, 4)
    for k, line in enumerate([why[x:x + 32] for x in range(0, len(why), 32)][:8]):
        d.text((756, y + 18 + k * 14), line, fill=FG, font=font)
    meta = json.loads((RAW / i / f'{s}.json').read_text(encoding='utf-8'))
    out.append(dict(id=i, stem=s, round=meta.get('round', ''), seed=meta['seed'], bar=JOBS[i]['bar'], style=r['style'], style_colors=r['style_colors'],
                    style_dL=r['style_dL'], meaning=mean, iou32_max=r['iou32_max'], iou32_with=r['iou32_with'], iou16_max=r['iou16_max'],
                    iou16_with=r['iou16_with'], fill=r['fill'], box_fill=r['box_fill'], fill16=r['fill16'], checker16=r['checker16'], noise=r['noise'],
                    colors=r['colors'], outline_ok=not any(x == '描邊' for x in other), other_fail='、'.join(other),
                    guide_precheck=GUIDE.get(i, ''), verdict=verdict, reason=why, hand=''))
c.save(EV / 'r5e_32_compare.png')
with (EV / 'r5e_review.csv').open('w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, list(out[0].keys()))
    w.writeheader()
    w.writerows(out)
for r in out:
    print(r['id'], r['verdict'], r['style'], r['meaning'], r['iou32_max'], r['iou32_with'], r['other_fail'])
