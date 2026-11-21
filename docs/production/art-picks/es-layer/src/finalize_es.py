# H11 能量護盾 --es 定稿：A 淡金（mumi 2026-11-21 12:31 經幕僚長）
import os, json, shutil, hashlib, numpy as np
from PIL import Image, ImageDraw
NS = {'__name__': 'esbuild', '__file__': '/workspace/affix-icons/es/build_es.py'}
src = open('/workspace/affix-icons/es/build_es.py').read().replace(
    "OUT = '/workspace/dpoe-docs/docs/production/art-picks/es-layer-draft'", "OUT = '/tmp/es-final-scratch'")
exec(compile(src, 'build_es.py', 'exec'), NS); g = NS
FO = '/workspace/dpoe-docs/docs/production/art-picks/es-layer'
for d in ('palette', 'overview', 'src'): os.makedirs(f'{FO}/{d}', exist_ok=True)
A = g['SETS']['A']; H, F = g['H'], g['F']
V = json.load(open('/tmp/es_verify.json'))['sets']['A']
MA = json.load(open('/tmp/es-final-scratch/measure.json'))['sets']['A']
tok = {'set': 'A 淡金', 'picked': 'mumi 2026-11-21 12:31（經幕僚長）：選 A；准暖色例外；生命條下緣框不改；色值以 M2-36-palette-tokens.md 為準（不以 css/style.css）',
       'tokens': {'--es': {'hex': A['--es'], 'LCh': MA['--es']['LCh'], 'Y': V['Y_es'], 'role': '能量護盾：生命條框內最底 3 px 細條填色；空槽沿用 --panel-inset'},
                  '--es-hi': {'hex': A['--es-hi'], 'LCh': MA['--es-hi']['LCh'], 'Y': V['Y_es_hi'], 'role': '充能中填色前緣 2 px 亮邊（不閃）'}},
       'warm_exception': '「全畫面唯一暖色重點＝--act」的唯一例外：--es（C* 28、只在生命條底 3 px）',
       'uiux_request': {'doc': '/workspace/mockups/W-hud-es-mock-1213/art-request-es-token.md', 'method': V and json.load(open('/tmp/es_verify.json'))['method'],
                        'Y_range_0.418-0.650': V['Y_in_0.418-0.650'], 'palette_doc': V['doc'], 'main_css_c57ff912': V['css']},
       'dE_vs_neighbours': {t: MA[t]['dE'] for t in ('--es', '--es-hi')}, 'contrast_extra': {t: MA[t]['contrast'] for t in ('--es', '--es-hi')}}
json.dump(tok, open(f'{FO}/palette/es-tokens.json', 'w'), ensure_ascii=False, indent=1)
sw = Image.new('RGB', (520, 120), H('#25211e')); d = ImageDraw.Draw(sw)
d.text((10, 6), 'H11 能量護盾 token 定稿：A 淡金（mumi 11/21 12:31）', font=F(14, True), fill=H('#fbf9f6'))
for j, t in enumerate(('--es', '--es-hi')):
    x = 10 + j * 140; d.rectangle((x, 34, x + 120, 76), fill=H(A[t]), outline=H('#000000')); d.text((x, 82), t, font=F(11), fill=H('#aeaba7')); d.text((x, 98), A[t], font=F(11), fill=H('#aeaba7'))
x = 290; d.rectangle((x, 44, x + 220, 64), fill=H('#1d1a17'), outline=H('#817b75')); d.rectangle((x + 1, 45, x + 160, 63), fill=H('#934341'))
d.rectangle((x + 1, 60, x + 120, 62), fill=H(A['--es'])); d.rectangle((x + 119, 60, x + 120, 62), fill=H(A['--es-hi']))
d.text((x, 70), '生命條底 3 px（充能前緣 2 px）', font=F(10), fill=H('#aeaba7'))
sw.save(f'{FO}/palette/swatches.png')
sh = g['set_sheet']('A'); d = ImageDraw.Draw(sh); d.rectangle((0, 0, sh.width, 26), fill=H('#1d1a17'))
d.text((8, 6), f'H11 定稿：--es {A["--es"]}／--es-hi {A["--es-hi"]}｜390／1280 × panel／scene-void／淺磚｜格擋弧 A 冷鋼＋hud_block_16', font=F(14, True), fill=H('#fbf9f6'))
S2 = sh.resize((sh.width * 2, sh.height * 2), Image.NEAREST); S2.save(f'{FO}/overview/final-review-2x.png')
for n, cv in g['SIMS']: g['tag'](g['cvd'](S2, cv), f'模擬 {n}（Machado 1.0）').save(f'{FO}/overview/final-review-2x-{n}.png')
g['tag'](S2.convert('L').convert('RGB'), '灰階').save(f'{FO}/overview/final-review-2x-gray.png')
# 4× 細條放大（★ A only）
st = g['STATES']; tiles = []
for s_ in st:
    tiles.append(g['hud']('390', '--scene-X-light', A['--es'], A['--es-hi'], s_[1], s_[2], s_[3]).crop((0, 30, 200, 82)).convert('RGB').resize((800, 208), Image.NEAREST))
Z = Image.new('RGB', (800, 30 + 5 * 216), H('#1d1a17')); dz = ImageDraw.Draw(Z); dz.text((8, 6), '390 生命條左半 ×4（淺磚）：滿／被打掉／充能中／0／低血', font=F(14, True), fill=H('#fbf9f6'))
for i, t in enumerate(tiles): Z.paste(t, (0, 30 + i * 216))
Z.save(f'{FO}/overview/final-zoom-4x.png')
for n, cv in g['SIMS']: g['tag'](g['cvd'](Z, cv), f'模擬 {n}').save(f'{FO}/overview/final-zoom-4x-{n}.png')
g['tag'](Z.convert('L').convert('RGB'), '灰階').save(f'{FO}/overview/final-zoom-4x-gray.png')
open(f'{FO}/picked.txt', 'w').write('mumi 2026-11-21 12:31（經幕僚長）挑定：--es A 淡金 #dfbf91／--es-hi #fcefde；准暖色例外；生命條下緣框不改；色值以 M2-36-palette-tokens.md 為準（不以 css/style.css）。\n沒選：B 淡紫、C 薄荷。草稿 docs/production/art-picks/es-layer-draft/（只在盒上）。\n')
for f in ('build_es.py', 'finalize_es.py', 'verify_req.py', 'search.py', 'evalc.py'): shutil.copy(f'/workspace/affix-icons/es/{f}', f'{FO}/src/{f}')
shutil.copy('/workspace/d2final/lib.py', f'{FO}/src/lib_d2final.py')
open(f'{FO}/README.md', 'w').write('''# H11 能量護盾 --es 定稿：A 淡金（參考用，不是執行時資產）

mumi 2026-11-21 12:31（經幕僚長）挑定：--es `#dfbf91`、--es-hi `#fcefde`。另外：准暖色例外；生命條下緣框不改；色值以 `specs/M2-36-palette-tokens.md` 為準，不以 css/style.css。token 已寫進 M2-36。

UIUX 需求單（art-request-es-token.md）的硬條件，用 UIUX `check_es.py` 的 crh() 量（一般／紅色盲／綠色盲／藍黃色盲）。色票值和 main css 值兩組都過：
- --es 對 --hp：3.85／4.31／3.61／3.83（css 4.91 起）
- --es 對 --panel-inset：9.46 以上
- --es 對 --panel：8.74 以上
- --es-hi 對 --es：1.55／1.60／1.52／1.54
- --es-hi 對 --hp：5.46 以上
- --es 的相對亮度 Y＝0.550，在 0.418–0.650 內

軟條件是跟 --block、--prog-hi 盡量拉開。只靠亮度只拉到 1.16、1.23，跟這兩個要靠位置（只在生命條底 3 px）和色相分。數字在 `palette/es-tokens.json`。

- `palette/es-tokens.json`、`swatches.png`
- `overview/final-review-2x.png`：390／1280 × 三種底，五種狀態（滿、被打掉、充能中＋前緣、0、低血），旁邊有魔力條、經驗條、格擋弧。另有 `-protan/-deutan/-tritan/-gray`。
- `overview/final-zoom-4x*.png`：細條放大 4 倍。
- `picked.txt`、`src/`：重跑 `python3 src/finalize_es.py`，要在 /workspace/affix-icons/es 下跑。

藥劑環、經驗條的位置是示意。
''')
print('ok')
