"""R5f 證據（r5f_ 前綴，0 次生成）：先跑 r5f.build() 重出 9 枚手修圖，再量 24 枚全集。
- r5f_hand_compare.png：9 枚手修前後，左底圖、右手修（4x＋1x），下面寫改法與 §5 數字
- r5f_32_compare.png：24 枚 彩色 4x＋1x｜灰階 4x＋1x｜最撞對象 4x｜§5 數字與判定
- r5f_sil_32.png、r5f_sil_16.png、r5f_bar_mock.png、r5f_iou.csv、r5f_bar_pairs.csv（沿用 evidence.py，檔名換 r5f_）
- r5f_review.csv：每枚一列（手修欄寫改法）
"""
import sys, pathlib, csv, json
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import r5, r5c, r5f
from r5c import *
from PIL import ImageDraw, ImageFont

HERE = pathlib.Path(__file__).parent
HAND = r5f.build()
ST = dict(json.loads((EV / 'r5e_state.json').read_text(encoding='utf-8')))
BASE = {i: ST.get(i, f'{i}-s{JOBS[i]["seed0"] + 3000}') for i in JOBS}  # r5e 的 stem（手修底圖）
BASE.update({'sk_fireburst': 'sk_fireburst-s7210', 'sk_refract': 'sk_refract-s7213', 'sk_doom': 'sk_doom-s7218', 'sk_holyshield': 'sk_holyshield-s7208'})
ST = {i: r5f.STEM.get(i, BASE[i]) for i in JOBS}

FINAL = {i: evaluate(i, ST[i], ST, {}) for i in JOBS}
CUR = {i: FINAL[i][0]['iou32_with'] for i in JOBS}

src = (HERE / 'evidence.py').read_text(encoding='utf-8')
src = src[:src.index('# r5_32_compare.png')] + src[src.index('# IoU 表與配對'):src.index('# r5_locations.csv')]
src = src.replace('st = latest_pass()', 'st = ST').replace("NOTE = json.loads((EV / 'visual_notes.json').read_text(encoding='utf-8'))", '')
src = src.replace("sets = sets_now(st)", "sets = sets_now(st)\nCOLL = {i: [CUR[i]] + COLL[i] for i in JOBS}")
src = src.replace("'r5_", "'r5f_").replace("[old_img(o) for o in COLL[i] if o not in JOBS][:2]",
                  "[(NEW[o] if o in JOBS else old_img(o)) for o in COLL[i]][:1]")
g = dict(globals(), ST=ST, CUR=CUR)
exec(compile(src, 'evidence.py(r5f)', 'exec'), g)
gray, paste, NEW = g['gray'], g['paste'], g['NEW']

BG, FG, RED, OK = (40, 37, 33, 255), (230, 220, 200, 255), (254, 120, 131, 255), (149, 210, 78, 255)
font = ImageFont.truetype('/usr/share/fonts/opentype/unifont/unifont.otf', 12)
CAND = ['sk_purityaura', 'sk_staticfield', 'sk_summongod', 'sk_ironaura', 'sk_weaken', 'sk_bloodlust', 'sk_gasflask', 'sk_tidepull',
        'sk_assassinate', 'sk_combust', 'sk_talisman', 'sk_exorcise', 'sk_fire', 'sk_meteor', 'sk_oilgrenade']


def nums(r):
    return (f"畫風 {r['style']}（{r['style_colors']} 色／L*差 {r['style_dL']}）IoU32 {r['iou32_max']} {r['iou32_with'][3:]}  16 {r['iou16_max']} {r['iou16_with'][3:]}"
            f"  填滿 {r['fill']}／外框 {r['box_fill']}／16 {r['fill16']}  雜點 {r['noise']}  棋盤16 {r['checker16']}  色數 {r['colors']}")


def wrap(t, n=46):
    return [t[k:k + n] for k in range(0, len(t), n)]


# 手修前後
ids = list(r5f.STEM)
c = Image.new('RGBA', (1180, 24 + len(ids) * 170), BG)
d = ImageDraw.Draw(c)
d.text((6, 6), 'R5f 手修前後（0 次生成）：左＝底圖 4x＋1x、右＝手修 4x＋1x、手修灰階 4x ｜ 改法與 §5 數字（手修後）', fill=FG, font=font)
for n, i in enumerate(ids):
    y = 24 + n * 170
    r = FINAL[i][0]
    base = Image.open(OUT / i / f'{BASE[i]}.png')
    hand = Image.open(OUT / i / f'{ST[i]}.png')
    br, _ = evaluate(i, BASE[i], dict(ST, **{i: BASE[i]}), {})
    d.text((6, y), f"{i}  底圖 {BASE[i]} → {ST[i]}  ｜  §5 {r['result']}{'（' + r['why'] + '）' if r['why'] else ''}", fill=OK if r['result'] == '過' else RED, font=font)
    paste(c, base, 6, y + 16, 4); paste(c, base, 136, y + 16)
    d.text((170, y + 70), '→', fill=FG, font=font)
    paste(c, hand, 190, y + 16, 4); paste(c, hand, 320, y + 16); paste(c, gray(hand), 356, y + 16, 4)
    lines = ['底圖：' + f"{br['style_colors']} 色／L*差 {br['style_dL']}／雜點 {br['noise']}／IoU32 {br['iou32_max']}"] + wrap('手修：' + nums(r)) + wrap('改法：' + HAND[i])
    for k, t in enumerate(lines[:10]):
        d.text((494, y + 16 + k * 14), t, fill=FG, font=font)
c.save(EV / 'r5f_hand_compare.png')

# 24 枚對照
order = ids + CAND
c = Image.new('RGBA', (1180, 24 + len(order) * 150), BG)
d = ImageDraw.Draw(c)
d.text((6, 6), 'R5f 全 24 枚：彩色 4x、1x ｜ 灰階 4x、1x ｜ 最撞對象 4x（24 枚全集互比）｜ §5 數字', fill=FG, font=font)
out = []
for n, i in enumerate(order):
    r = FINAL[i][0]
    y = 24 + n * 150
    im = NEW[i]
    kind = '手修' if i in r5f.STEM else '候選（§1，不動）'
    d.text((6, y), f"{ST[i]}  [{kind}]  §5 {r['result']}{'：' + r['why'] if r['why'] else ''}", fill=FG if r['result'] == '過' else RED, font=font)
    paste(c, im, 6, y + 16, 4); paste(c, im, 140, y + 16); paste(c, gray(im), 178, y + 16, 4); paste(c, gray(im), 312, y + 16)
    o = r['iou32_with']
    paste(c, NEW[o] if o in JOBS else old_img(o), 352, y + 16, 4)
    d.text((352, y + 146 - 14), o, fill=FG, font=font)
    for k, t in enumerate(wrap(nums(r), 40)[:8]):
        d.text((490, y + 18 + k * 14), t, fill=FG, font=font)
    out.append(dict(id=i, stem=ST[i], base=BASE[i], kind=kind, bar=JOBS[i]['bar'], result=r['result'], style=r['style'], style_colors=r['style_colors'],
                    style_dL=r['style_dL'], iou32_max=r['iou32_max'], iou32_with=r['iou32_with'], iou16_max=r['iou16_max'], iou16_with=r['iou16_with'],
                    fill=r['fill'], box_fill=r['box_fill'], fill16=r['fill16'], checker16=r['checker16'], noise=r['noise'], colors=r['colors'],
                    chase=r['chase'], fail=r['why'], hand=HAND.get(i, '')))
c.save(EV / 'r5f_32_compare.png')
with (EV / 'r5f_review.csv').open('w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, list(out[0].keys()))
    w.writeheader()
    w.writerows(out)
for r in out:
    print(r['id'], r['kind'], r['result'], r['style_colors'], r['style_dL'], r['iou32_max'], r['iou32_with'], r['iou16_max'], r['iou16_with'], r['noise'], r['fail'])
