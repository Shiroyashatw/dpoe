"""dpoe-hud133-fix4：讀 bh_fix4.js 的截圖與 fix4.json，抽像素、算對比，寫 F7.md、F8.md、F9.md。
用法：python3 tools/bh_fix4.py [資料夾]（預設 docs/production/evidence/battle-hud-v133-fix4）"""
import json, os, sys
from collections import Counter
from PIL import Image

D = sys.argv[1] if len(sys.argv) > 1 else 'docs/production/evidence/battle-hud-v133-fix4'
R = json.load(open(os.path.join(D, 'fix4.json')))
hx = lambda c: '#%02x%02x%02x' % tuple(c[:3])


def rgb(s):
    s = s.strip()
    if s.startswith('#'):
        return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))
    return tuple(int(float(x)) for x in s[s.index('(') + 1:s.index(')')].replace('/', ' ').replace(',', ' ').split()[:3])


def lum(c):
    f = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (f(x / 255) for x in c[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def cr(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def mode_text(im, box, skip=4):
    """字的顏色：框內（略過左條）亮度最高那一群裡出現最多的色"""
    x, y, w, h = box
    px = [im.getpixel((i, j)) for i in range(x + skip, min(x + w, im.width)) for j in range(y, y + h)]
    px = [p[:3] for p in px if lum(p) > 0.15]
    return Counter(px).most_common(1)[0] if px else (None, 0)


RN = {2: '稀有', 3: '傳奇', 4: '追逐'}
out = ['# F7 最近一筆（收起列 T34／C34）左條與字：同一個稀有度 token', '',
       '條＝`.i34` 的 `border-left: 2px solid currentColor`，字＝同一個元素（與裡面 `.ilast`）的 `.rr{n}` 色；兩者都來自 `logR(hi)` 同一個值。',
       '「計算值」＝`getComputedStyle`；「截圖」＝`f7_r{n}_{尺寸}.png` 抽像素（條：左緣 2 px 的中間；字：框內亮色出現最多的那一色）。', '',
       '| 尺寸 | 稀有度 | token | 名稱 | 條（計算值） | 字（計算值） | 記號 | 條（截圖） | 字（截圖） | 同色 |', '|---|---|---|---|---|---|---|---|---|---|']
TOK = {2: '--rar-rare #fbe53a', 3: '--rar-unique #fa8915', 4: '--rar-chase #0cf6ee'}
allok = True
for sz in R:
    for f in R[sz]['f7']:
        im = Image.open(os.path.join(D, f"f7_r{f['r']}_{sz}.png")).convert('RGB')
        x, y, w, h = f['box']
        bar = [im.getpixel((x + i, y + h // 2)) for i in (0, 1)]
        tc, n = mode_text(im, f['box'])
        same = rgb(f['bar'][2]) == rgb(f['text']) == bar[0] == bar[1] and tc == bar[0]
        allok &= same
        mk = f"{f['mark'][0]} {hx(rgb(f['mark'][1]))}" if f['mark'] else '王印 16 圖'
        out.append(f"| {sz} | {RN[f['r']]} | `{TOK[f['r']]}` | {f['name']} | {hx(rgb(f['bar'][2]))} {f['bar'][0]} | {hx(rgb(f['text']))} | {mk} | {hx(bar[0])}／{hx(bar[1])} | {hx(tc)}（{n} 點） | {'✅' if same else '❌'} |")
out += ['', '普通、魔法不會出現在最近一筆（只取稀有以上），只出現在展開的拾取列，那裡沒有直條：', '',
        '| 尺寸 | 類別 | 名稱 | 字（計算值） | 直條 |', '|---|---|---|---|---|']
for sz in R:
    for c, n, col, bl in R[sz]['pk']:
        out.append(f"| {sz} | `{c}` | {n} | {hx(rgb(col))} | {bl} |")
out += ['', f"結果：{'全部同色 ✅' if allok else '有不同色 ❌'}"]
open(os.path.join(D, 'F7.md'), 'w').write('\n'.join(out) + '\n')
print('\n'.join(out))

# F8
o = ['# F8 拾取通知的位置與滑入路徑（只回報，不改）', '',
     '規格：390 收起 T34 238,722,104×24；1280 收起 C34 24,676,264×24（battle-hud-2／-3，定 mumi 16:32）；1280 展開拾取 1 D28 24,512,152×24、390 P44 22,584,178×22。', '']
for sz in R:
    for m, tag in (('f8_min', '收起'), ('f8_full', '展開')):
        f = R[sz][m]
        o.append(f"## {sz} {tag}")
        o.append('')
        o.append(f"- 掛機卡 #pidle {f['pidle']}（overflow {f['ovf']}，z-index {f['z']}）；「掛機 N 分」{f['i32'] or f['is1']}；最近一筆 {f['i34'] or (f['ipk'] or [None])[0]}；▲／▼ {f['x']}；生命條 {f['hp']}")
        o.append('- 滑入（凍結時鐘、每格 1000/60 ms；左、右、上、下是滑動中那一筆名字的框）：')
        o.append('')
        o.append('| 格 | ms | 所在 | 左 | 右 | 上 | 下 | translateX | 不透明度 |')
        o.append('|---|---|---|---|---|---|---|---|---|')
        for r in f['path']:
            o.append('| ' + ' | '.join(str(v) for v in r) + ' |')
        o.append('')
open(os.path.join(D, 'F8.md'), 'w').write('\n'.join(o) + '\n')

# F9
t = ['# F9 裝填環：token、α、形狀、對五種地磚的對比（只回報，不改）', '']
for sz in R:
    T = R[sz]['f9']['tiles']
    k0 = T['temple']
    tok = {k: rgb(v) for k, v in k0['tok'].items() if not v.startswith('rgb(0 0 0')}
    t += [f'## {sz}', '', f"- 技能格 1 {k0['slot']}，`--r` {k0['r']}（裝填 1.5 秒停在一半左右）；字「{k0['rlText']}」",
          f"- `.bsk[data-k='rl'] .rl` background：`{k0['bg']}`",
          f"- 格底 `--panel-raised` {k0['slotBg']}（不透明）、框 `--border` {k0['slotBorder']}", '']
    x, y, w, h = k0['slot']
    rows = []
    for k in ('temple', 'lava', 'tomb', 'ice', 'camp'):
        m = T[k]
        im = Image.open(os.path.join(D, f'f9_{k}_{sz}.png')).convert('RGB')
        # 地板：技能列上方一塊戰場（中位數）
        fx, fy, fw, fh = (60, 380, 320, 70) if sz.startswith('390') else (400, 520, 560, 60)
        px = [im.getpixel((i, j)) for i in range(fx, fx + fw, 2) for j in range(fy, fy + fh, 2)]
        med = tuple(sorted(p[c] for p in px)[len(px) // 2] for c in range(3))
        if m['vis']:
            fill = im.getpixel((x + w - 4, y + 4))  # 右上角：已填的扇形
            trk = im.getpixel((x + w // 2 - 4, y + 2))  # 12 點鐘左邊：還沒填（300° 之後；左上角是鍵帽）
        else:
            fill = trk = None
        # 緊貼技能格上緣外 2–6 px 的地板（環實際看到的背景）
        bd = [im.getpixel((i, j)) for i in range(x, x + w) for j in range(y - 6, y - 2)]
        near = tuple(sorted(p[c] for p in bd)[len(bd) // 2] for c in range(3))
        rows.append((k, m['scene'], med, fill, trk, near))
    t += [f'地板取 {"x60–380 × y380–450" if sz.startswith("390") else "x400–960 × y520–580"}（技能列上方的戰場，中位數）。營地沒有戰鬥 HUD（技能格不畫），只列地板色算理論對比。', '',
          '「格外」＝技能格上緣外 2–6 px 那條地板的中位色（環實際貼著的背景）；「戰場」＝上面那一大塊的中位色。對比是 WCAG 2 公式。', '',
          '| 地磚 | 格外地板 | 戰場地板 | 環已填（截圖） | 環未填（截圖） | 已填 #b6b0a8 對格外／戰場 | 未填 #1d1a17 對格外／戰場 | 格框 #817b75 對格外／戰場 | 格底 #2c2825 對格外／戰場 |', '|---|---|---|---|---|---|---|---|---|']
    for k, sc, med, fill, trk, near in rows:
        c2 = lambda tk: f"{cr(tok[tk], near):.2f}／{cr(tok[tk], med):.2f}"
        t.append(f"| {k}（{sc}） | {hx(near)} | {hx(med)} | {hx(fill) if fill else '—（不畫）'} | {hx(trk) if trk else '—'} | {c2('--prog-hi')} | {c2('--panel-inset')} | {c2('--border')} | {c2('--panel-raised')} |")
    t += ['', f"- 環內部：已填 #b6b0a8 對未填 #1d1a17 = {cr(tok['--prog-hi'], tok['--panel-inset']):.2f}；中間黑圓 `--d2-scrim` α 0.62 壓在已填上 = {hx(tuple(round(c * 0.38) for c in tok['--prog-hi']))}、壓在未填上 = {hx(tuple(round(c * 0.38) for c in tok['--panel-inset']))}；字「裝填」--tx-strong 壓在黑圓上。", '']
open(os.path.join(D, 'F9.md'), 'w').write('\n'.join(t) + '\n')
print('\n'.join(t))
