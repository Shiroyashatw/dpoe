"""#159 簽核必修量測（dpoe-css-palette4；palette5 沿用，M1 黑邊改不透明）：讀 shots/{main,branch}-facts.json 與截圖，算 WCAG 對比，寫 shots/measure.csv，拼並排圖 cmp-*.jpg。
用法：python3 -I measure.py shots"""
import csv, json, os, sys
from collections import Counter
from PIL import Image

D = sys.argv[1]
F = {t: json.load(open(f'{D}/{t}-facts.json')) for t in ('main', 'branch')}


def lum(c):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = c[:3]
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def cr(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def hexc(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def css(s):
    return [int(float(x)) for x in s[s.index('(') + 1:s.index(')')].split(',')[:3]]


rows = []


def row(item, tree, size, what, a, b, val, thr='', st='記錄', note=''):
    rows.append([item, tree, size, what, json.dumps(a) if a is not None else '', json.dumps(b) if b is not None else '', val, thr, st, note])


def region(img, r):
    x, y, w, h = r
    return [img.getpixel((i, j))[:3] for j in range(max(0, y), min(img.height, y + h)) for i in range(max(0, x), min(img.width, x + w))]


def text_on_bg(img, r):
    """區塊裡最多的顏色當底，對底對比最高的像素當字（反鋸齒最亮／最暗點）"""
    px = region(img, r)
    bg = Counter(px).most_common(1)[0][0]
    tx = max(px, key=lambda c: cr(c, bg))
    return list(bg), list(tx)


# ---------- M1 王閃現線（五種淺磚，合成底；筆畫參數從遊戲 draw() 攔到） ----------
for t in ('main', 'branch'):
    for k, B in F[t]['blink'].items():
        sz, a = k.split('/')
        recs = '＋'.join(f"{r['style']} {r['lw']}px α{r['a']}" for r in B['rec'])
        row('M1 王閃現線', t, f'{sz} 合成', f'遊戲 draw() 實際筆畫（{a}）', None, None, recs, '', '記錄')
        for e in B['out']:
            nm = e['base']
            if t == 'main':
                row('M1 王閃現線', t, f'{sz} 合成', f'{nm}：線對淺磚（{a}）', e['line'], e['bg'], f"{cr(e['line'], e['bg']):.2f}", '', '記錄（main 基準）')
            else:
                v1, v2, v3 = cr(e['line'], e['edgeOut']), cr(e['edgeOut'], e['bg']), cr(e['line'], e['bg'])
                exp = '≥5.14' if a == 'a0.9' else '≥3.39'
                row('M1 王閃現線', t, f'{sz} 合成', f'{nm}：線對黑邊（{a}）', e['line'], e['edgeOut'], f'{v1:.2f}', f'≥3（預期 {exp}）', '通過' if v1 >= 3 else '不通過')
                row('M1 王閃現線', t, f'{sz} 合成', f'{nm}：黑邊對淺磚（{a}）', e['edgeOut'], e['bg'], f'{v2:.2f}', '記錄（預期 2.09–13.75）', '記錄')
                row('M1 王閃現線', t, f'{sz} 合成', f'{nm}：線對淺磚（{a}）', e['line'], e['bg'], f'{v3:.2f}', '', '記錄')

# ---------- M2 小地圖王點（直接讀畫布像素） ----------
for t in ('main', 'branch'):
    for size, S in F[t]['sizes'].items():
        M = S.get('mini')
        if not M or 'row' not in M:
            continue
        rw = M['row']  # dx = -7..7，中心 index 7
        rects = '、'.join(f"{r['col']} {r['w']:g}×{r['h']:g} @({r['x']:.2f},{r['y']:.2f})" for r in M['rects'])
        row('M2 小地圖王點', t, size, '畫的矩形（畫布座標）', None, None, rects)
        dot = rw[7]
        if t == 'branch':
            for side, ie, ib in (('右', 10, 11), ('左', 4, 3)):
                edge, bg = rw[ie], rw[ib]
                row('M2 小地圖王點', t, size, f'王點對黑邊（{side}）', dot, edge, f'{cr(dot, edge):.2f}', '≥3（預期 6.23）', '通過' if cr(dot, edge) >= 3 else '不通過')
                row('M2 小地圖王點', t, size, f'黑邊對小地圖底（{side}）', edge, bg, f'{cr(edge, bg):.2f}', '≥3（預期 3.40）', '通過' if cr(edge, bg) >= 3 else '不通過')
            col = M['col']
            for side, ie, ib in (('下', 10, 11), ('上', 4, 3)):
                edge, bg = col[ie], col[ib]
                row('M2 小地圖王點', t, size, f'王點對黑邊（{side}）', dot, edge, f'{cr(dot, edge):.2f}', '≥3', '通過' if cr(dot, edge) >= 3 else '不通過')
                row('M2 小地圖王點', t, size, f'黑邊對小地圖底（{side}）', edge, bg, f'{cr(edge, bg):.2f}', '≥3', '通過' if cr(edge, bg) >= 3 else '不通過')
        else:
            bg = rw[13]
            row('M2 小地圖王點', t, size, '王點對小地圖底（main 基準，沒有黑邊）', dot, bg, f'{cr(dot, bg):.2f}', '', '記錄（main 基準）')
        row('M2 小地圖王點', t, size, '中心橫列 dx=-7..7 像素', None, None, json.dumps(rw))

# ---------- M3 燃燒地面（我方左、怪物方右） ----------
for t in ('main', 'branch'):
    for size, S in F[t]['sizes'].items():
        g = S['ground']
        row('M3 燃燒地面', t, size, '我方 14% 填色像素對地板', g['own'], g['floor'], f"{cr(g['own'], g['floor']):.2f}", '', '記錄')
        row('M3 燃燒地面', t, size, '怪物方 36% 填色像素對地板', g['foe'], g['floor'], f"{cr(g['foe'], g['floor']):.2f}", '', '記錄')
        # 色相：我方是否偏紅紫（--enemy-tel 系）
        o, f0 = g['own'], g['floor']
        tint = [o[i] - f0[i] for i in range(3)]
        row('M3 燃燒地面', t, size, '我方填色減地板（看色偏：--el-fire 偏橘、--enemy-tel 偏紅紫）', o, f0, json.dumps(tint))

# ---------- M5 停用主鈕（背包面板） ----------
for t in ('main', 'branch'):
    for size, S in F[t]['sizes'].items():
        img = Image.open(f'{D}/{t}-{size}-panel-btn-disabled.png').convert('RGB')
        row('M5 停用主鈕', t, size, '插在哪個面板／天賦樹是否開著', None, None, f"{S['btn']['panel']}／{S['btn']['tree']}")
        for bt in S['btn']['bs']:
            x, y, w, h = bt['r']
            # 內縮 8 px；只取接近 computed 字色（RGB 差和 <30）的像素當字、其餘最多的顏色當底（1280 會量到隔壁鈕的 --border-hi 框、390 主鈕是漸層底）
            px = region(img, [x + 8, y + 8, w - 16, h - 16])
            tc = css(bt['color'])
            isnear = lambda q: sum(abs(q[i] - tc[i]) for i in range(3)) < 30
            bg = list(Counter([q for q in px if not isnear(q)] or px).most_common(1)[0][0])
            near = [q for q in px if isnear(q)] or px
            tx = list(max(near, key=lambda q: cr(q, bg)))
            row('M5 停用主鈕', t, size, f"「{bt['t']}」字對鈕底（像素）", tx, bg, f'{cr(tx, bg):.2f}', '灰階、不設 4.5（記錄）' if '停用' in bt['t'] else '', '記錄')
            row('M5 停用主鈕', t, size, f"「{bt['t']}」computed color／background-color", None, None, f"{bt['color']}／{bt['bg']}／opacity {bt['op']}")

# ---------- M6 分頁徽章 .dot.n.pill ----------
for t in ('main', 'branch'):
    for size, S in F[t]['sizes'].items():
        bd = S['badge']
        if not bd.get('n'):
            row('M6 分頁徽章', t, size, '.dot.n.pill 數量', None, None, '0', '', '未出現')
            continue
        img = Image.open(f'{D}/{t}-{size}-panel-nav.png').convert('RGB')
        x, y, w, h = bd['r']
        bg, tx = text_on_bg(img, [x + 2, y + 2, w - 4, h - 4])
        row('M6 分頁徽章', t, size, f"徽章字「{bd['text']}」對徽章底（像素）", tx, bg, f'{cr(tx, bg):.2f}', '≥4.5', '通過' if cr(tx, bg) >= 4.5 else '不通過')
        tc, tb = css(bd['color']), css(bd['bg'])
        row('M6 分頁徽章', t, size, '徽章字 token 對徽章底 token（computed）', tc, tb, f'{cr(tc, tb):.2f}', '≥4.5', '通過' if cr(tc, tb) >= 4.5 else '不通過')

# ---------- 天賦樹底、連線、「還沒有昇華」 ----------
for t in ('main', 'branch'):
    for size, S in F[t]['sizes'].items():
        T = S['tree']
        img = Image.open(f'{D}/{t}-{size}-panel-tree.png').convert('RGB')
        ptb = css(T['ptBg'])
        row('天賦樹', t, size, '#ptree 背景（computed）', ptb, None, T['ptBg'])
        if T['ptR']:
            mode = list(Counter(region(img, T['ptR'])).most_common(1)[0][0])
            row('天賦樹', t, size, '#ptree 範圍內最多的像素（實際樹底）', mode, ptb, f'{cr(mode, ptb):.2f}', '', '記錄', '值是實際像素對 computed 背景的對比，1.00＝一樣')
            ptb = mode
        # 連線：每條線中點附近 3×3 最亮像素，對 #ptree 底色
        vals = []
        for L in T['lines']:
            a, b, c, d, e, f = L['ctm']
            mx, my = (L['p'][0] + L['p'][2]) / 2, (L['p'][1] + L['p'][3]) / 2
            sx, sy = a * mx + c * my + e, b * mx + d * my + f
            px = region(img, [int(sx) - 1, int(sy) - 1, 3, 3])
            if not px:
                continue
            best = max(px, key=lambda q: cr(q, ptb))
            vals.append((cr(best, ptb), best, L['cls']))
        if vals:
            vals.sort()
            md = vals[len(vals) // 2]
            row('天賦樹', t, size, f'連線中點像素對樹底（{len(vals)} 條，中位）', md[1], ptb, f'{md[0]:.2f}', '', '記錄', f'最小 {vals[0][0]:.2f}、最大 {vals[-1][0]:.2f}')
        if T['textR']:
            x, y, w, h = T['textR']
            bg, tx = text_on_bg(img, [x, y, w, h])
            row('天賦樹', t, size, f"「{T['text']}」字對圓底（像素）", tx, bg, f'{cr(tx, bg):.2f}', '≥4.5', '通過' if cr(tx, bg) >= 4.5 else '不通過')
            nf, cf = css(T['nFill']), css(T['cFill'])
            row('天賦樹', t, size, f"「{T['text']}」fill 對圓 fill（computed）", nf, cf, f'{cr(nf, cf):.2f}', '≥4.5', '通過' if cr(nf, cf) >= 4.5 else '不通過')

with open(f'{D}/measure.csv', 'w', newline='') as fp:
    w = csv.writer(fp)
    w.writerow(['項目', 'tree', '尺寸', '量什麼', 'A', 'B', '值', '門檻', '狀態', '備註'])
    w.writerows(rows)


# ---------- 並排圖（左 main｜右 分支） ----------
def side(out, a, b, scale=1):
    A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    if scale != 1:
        A = A.resize((A.width * scale, A.height * scale), Image.NEAREST)
        B = B.resize((B.width * scale, B.height * scale), Image.NEAREST)
    C = Image.new('RGB', (A.width + B.width + 8, max(A.height, B.height)), (255, 255, 255))
    C.paste(A, (0, 0))
    C.paste(B, (A.width + 8, 0))
    C.save(f'{D}/{out}', quality=90)


for size in ('390x844', '1280x720'):
    for k in ('panel-btn-disabled', 'panel-nav', 'panel-tree', 'ground-fire', 'ground-fire-full'):
        side(f'cmp-{size}-{k}.jpg', f'{D}/main-{size}-{k}.png', f'{D}/branch-{size}-{k}.png')
    side(f'cmp-{size}-mini.png', f'{D}/main-{size}-mini.png', f'{D}/branch-{size}-mini.png', 8)
for nm in sorted({f[len('branch-tele-'):-4] for f in os.listdir(D) if f.startswith('branch-tele-')}):
    side(f'cmp-tele-{nm}.jpg', f'{D}/main-tele-{nm}.png', f'{D}/branch-tele-{nm}.png')
for size in ('390x844', '1280x720'):
    for a in ('a0.9', 'a0.7'):
        side(f'cmp-blink-ingame-{size}-{a}.jpg', f'{D}/main-blink-ingame-{size}-{a}.png', f'{D}/branch-blink-ingame-{size}-{a}.png', 2)
print(len(rows), 'rows')
