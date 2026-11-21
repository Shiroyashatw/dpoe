"""battle-hud v1.3.3 token 色值比對：在實機截圖上抽像素（不是 computed style），對照規格 token 值，算對比。
用法：python3 tools/bh_tokens.py [資料夾]（預設 docs/production/evidence/battle-hud-v133；先跑 node tools/bh_shots.js）
輸出：TOKENS.md（bh_overlay.py 會把它接到 REPORT.md 後面）。
抽法：字、細線＝框內離 token 最近的像素（反鋸齒的字心會是原色）；底色＝框內最多的顏色。
判定：最大通道差 ≤ 8 算相符（JPEG 以外的 PNG 沒有壓縮誤差，留 8 給半透明疊在場景上的底與次像素字）。
對比＝WCAG 2 相對亮度，前景用抽到的像素、背景用框內最多的顏色。"""
import json
import os
import subprocess
import sys
from collections import Counter

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs/production/evidence/battle-hud-v133-fix2')

TK = {
    '--panel': '#25211e', '--panel-raised': '#2c2825', '--panel-inset': '#1d1a17', '--panel-edge': '#a8927f',
    '--border': '#817b75', '--border-mid': '#817b75', '--tx': '#e8e5e1', '--tx-strong': '#fbf9f6', '--tx-dim': '#aeaba7',
    '--tx-off': '#9d9995', '--hp': '#934341', '--mp': '#3a5b98', '--hp-hi': '#af6c64', '--mp-hi': '#6b7dad',
    '--act': '#7c5729', '--act-edge': '#a8927f', '--on-act': '#fcf9f3', '--btn2': '#524c47', '--sel-bg': '#463a2d',
    '--sel-edge': '#a8927f', '--focus': '#fbf9f6', '--good': '#95e886', '--bad': '#ff9bba', '--warn': '#a9ae68',
    '--prog-hi': '#b6b0a8', '--rar-normal': '#f1ebdb', '--rar-magic': '#9da7ff', '--rar-rare': '#fbe53a',
    '--rar-unique': '#fa8915', '--rar-chase': '#0cf6ee', '#000': '#000000',
    # battle-hud-5／-6（M2-36 色票，main 9c6be66）
    '--es': '#dfbf91', '--es-hi': '#fcefde', '--prog-lo': '#3c3935', '--block': '#a9b8c3', '--block-dim': '#40484e',
    '--block-regen': '#758088',
}


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hx(c):
    return '#%02x%02x%02x' % c[:3]


def lum(c):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (f(x) for x in c[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


def dist(a, b):
    return max(abs(a[i] - b[i]) for i in range(3))


def px(im, r):
    x, y, w, h = [int(round(v)) for v in r]
    W, H = im.size
    return [im.getpixel((i, j)) for i in range(max(0, x), min(W, x + w)) for j in range(max(0, y), min(H, y + h))]


def fg(im, r, tok):
    """框內離 token 最近的像素、跟它相符（≤8）的像素數、框內最多的顏色（當背景）"""
    t = rgb(TK[tok])
    P = px(im, r)
    best = min(P, key=lambda c: dist(c, t))
    n = sum(1 for c in P if dist(c, t) <= 8)
    bg = Counter(c for c in P if dist(c, t) > 24).most_common(1)
    return best, n, bg[0][0] if bg else None


def dom(im, r):
    return Counter(px(im, r)).most_common(1)[0][0]


def meas(st, size):
    m = json.load(open(os.path.join(OUT, f'measure_{st}_{size}.json')))
    return {r['id']: r['got'] for r in m['rep'] if r['got']}, m


rows, acc = [], []


def row(st, size, eid, name, tok, kind, r, im):
    exp = rgb(TK[tok])
    if kind == 'bg':
        got = dom(im, r)
        ok = dist(got, exp) <= 8
        rows.append(f'| {st} {size} | {eid} | {name} | {tok} {TK[tok]} | 底 | {hx(got)} | {dist(got, exp)} | — | {"✅" if ok else "❌"} |')
        return got
    got, n, bg = fg(im, r, tok)
    ok = dist(got, exp) <= 8 and n > 0
    cr = f'{contrast(got, bg):.2f}:1（底 {hx(bg)}）' if bg else '—'
    rows.append(f'| {st} {size} | {eid} | {name} | {tok} {TK[tok]} | 字／線（{n} px 相符） | {hx(got)} | {dist(got, exp)} | {cr} | {"✅" if ok else "❌"} |')
    return got


def sub(r, dx, dy, w, h):
    return [r[0] + dx, r[1] + dy, w, h]


for size, P in (('390x844', 'P'), ('1280x720', 'D')):
    d = size == '1280x720'
    for st in ['normal', 'boss', 'lowhp', 'lootflood', 'collapsed']:
        f = os.path.join(OUT, f'{st}_{size}.png')
        if not os.path.exists(f):
            continue
        im = Image.open(f).convert('RGB')
        R, m = meas(st, size)
        c = st == 'collapsed'
        k = (lambda a, b: a if not d else b)
        if c:
            k = (lambda a, b: a.replace('P', 'T') if not d else b.replace('D', 'C'))
        top, cur0, loc = (('T03', 'T04', 'T08') if c else ('P03', 'P04', 'P08')) if not d else (('C01', 'C02', 'C06') if c else ('D01', 'D02', 'D06'))
        row(st, size, top, '頂列底', '--panel', 'bg', R[top], im)
        row(st, size, cur0, '通貨數字', '--tx-strong', 'fg', R[cur0], im)
        row(st, size, loc, '地點字', '--tx-dim' if not d else '--tx', 'fg', R[loc], im)
        row(st, size, loc, '地點 ★', '--tx-strong', 'fg', R[loc], im)
        # 技能格底取第 4 格（第 1 格在洪水狀態是裝填中，整格被裝填環蓋住）
        s0 = {('p', 0): 'P23', ('p', 1): 'T24', ('d', 0): 'D45', ('d', 1): 'C45'}[('d' if d else 'p', int(c))]
        sk = R[s0]
        row(st, size, s0, '技能格底（右緣內側，避開鍵帽與圖示）', '--panel-raised', 'bg', sub(sk, sk[2] - 6, sk[3] // 2, 3, 6), im)
        row(st, size, s0, '技能格框', '--border', 'fg', sub(sk, 0, 0, sk[2], 1), im)
        hp = {('p', 0): 'P37', ('p', 1): 'T26', ('d', 0): 'D59', ('d', 1): 'C59'}[('d' if d else 'p', int(c))]
        mp = {('p', 0): 'P38', ('p', 1): 'T27', ('d', 0): 'D60', ('d', 1): 'C60'}[('d' if d else 'p', int(c))]
        row(st, size, hp, '生命條（左端）', '--hp', 'bg', sub(R[hp], 2, 2, 24, 4), im)
        row(st, size, hp, '條上字', '--tx-strong', 'fg', R[hp], im)
        row(st, size, mp, '魔力條', '--mp', 'bg', R[mp], im)
        if not c:
            pid = R['D25' if d else 'P41']
            row(st, size, 'D25' if d else 'P41', '下方面板底', '--panel', 'bg', sub(pid, 2, 2, pid[2] - 4, 3) if d else sub(pid, 0, 7, 8, 3), im)  # 直立上緣 0–6 是經驗條 P66（v1.3.5），往下取
            if not d:
                row(st, size, 'P42', '掛機卡底', '--panel-raised', 'bg', sub(R['P42'], 4, 30, 6, 100), im)
            row(st, size, 'D26' if d else 'P43', '本次掛機字', '--tx-dim', 'fg', R['D26' if d else 'P43'], im)
            row(st, size, 'D27' if d else 'P43', '保底字', '--tx-strong', 'fg', R['D27' if d else 'P43'], im)
            pk = ['D28', 'D29', 'D30', 'D31', 'D32'] if d else ['P44', 'P45', 'P46', 'P47', 'P48']
            want = [('--rar-chase', '追逐 王印'), ('--rar-unique', '◈ 判官烏紗'), ('--rar-rare', '◆ 厲鬼護符'),
                    ('--rar-magic', '寒鐵之戒'), ('--rar-normal', '轉化石 ×3')]
            for i, (tok, nm) in enumerate(want):
                if st == 'lootflood' and not d and i == 4:
                    continue
                if pk[i] in R:
                    row(st, size, pk[i], '拾取 ' + nm, tok, 'fg', R[pk[i]], im)
            row(st, size, pk[0], '「拾取」', '--tx-dim', 'fg', R[pk[0]], im)
            gd = 'D36' if d else 'P51'
            bd = 'D35' if d else 'P50'
            if 'P51' in R or 'D36' in R:
                row(st, size, gd if gd in R else bd, '比較 ▲ 字', '--good', 'fg', R.get('D37' if d else 'P52'), im)
                row(st, size, 'D36' if d else 'P51', '比較 ▼ 字', '--bad', 'fg', R['D36' if d else 'P51'], im)
            w = 'D38' if d else 'P54'
            if w in R:
                row(st, size, w, '⚠ 倉庫 96%', '--warn', 'fg', R[w], im)
            b1, b2, b3 = ('D39', 'D40', 'D41') if d else ('P55', 'P56', 'P57')
            row(st, size, b1, '整理倉庫 底', '--btn2', 'bg', R[b1], im)
            row(st, size, b2, '自動（開）底', '--sel-bg', 'bg', R[b2], im)
            row(st, size, b3, '去營地 底', '--act', 'bg', R[b3], im)
            row(st, size, b3, '去營地 框', '--act-edge', 'fg', sub(R[b3], 0, 0, R[b3][2], 2), im)
            row(st, size, b3, '去營地 字', '--on-act', 'fg', R[b3], im)
            xh = 'D64' if d else 'P65'
            row(st, size, xh, '▼ 底', '--btn2', 'bg', sub(R[xh], 0, 0, 4, 24), im)
            row(st, size, xh, '▼ 實心三角', '--tx-strong', 'fg', R[xh], im)
        else:
            a, b, cc, x = ('C32', 'C33', 'C34', 'C35') if d else ('T32', 'T33', 'T34', 'T35')
            row(st, size, a, '⚠ 倉庫快滿', '--warn', 'fg', R[a], im)
            row(st, size, b, '保底字', '--tx-strong', 'fg', R[b], im)
            row(st, size, cc, '最近一筆（追逐）字', '--rar-chase', 'fg', R[cc], im)
            row(st, size, cc, '最近一筆 左 2px 直條', '--rar-chase', 'bg', sub(R[cc], 0, 2, 2, R[cc][3] - 4), im)
            row(st, size, x, '▲ 實心三角', '--tx-strong', 'fg', R[x], im)
        # 分頁：倉庫選中
        tb = ('C07' if c else 'D07') if d else ('T36' if c else 'P58')
        if tb in R:
            row(st, size, tb, '倉庫分頁 選中底', '--sel-bg', 'bg', sub(R[tb], 4, 6, R[tb][2] - 8, 3), im)
            if d:
                # 1px --border 框線內側再畫 2px（inset）
                row(st, size, tb, '倉庫分頁 2px --sel-edge（框線內側）', '--sel-edge', 'bg', sub(R[tb], R[tb][2] // 2, 1, 1, 2), im)
            else:
                row(st, size, tb, '倉庫分頁 上緣 2px --focus', '--focus', 'bg', sub(R[tb], 4, 0, R[tb][2] - 8, 2), im)
            row(st, size, tb, '倉庫分頁 字', '--tx-strong', 'fg', R[tb], im)
        if st == 'boss':
            pb = 'D17' if d else 'P12'
            row(st, size, pb, '王名', '--tx-strong', 'fg', R[pb], im)
            row(st, size, pb, '王血條', '--hp', 'bg', R[pb], im)
            row(st, size, 'D18' if d else 'P13', '大招字', '--bad', 'fg', R['D18' if d else 'P13'], im)
        # 掉落牌（canvas 座標＋戰場上緣）
        t0 = 0 if d else 91  # 桌機戰場 canvas 蓋滿畫面（cvTop 0）；直立從頂列下緣起
        for q in m.get('plates', []):
            tok = {'rare': '--rar-rare', 'unique': '--rar-unique', 'chase': '--rar-chase', 'elite': '--tx-strong'}[q['c']]
            r = [q['r'][0], q['r'][1] + t0, q['r'][2], q['r'][3]]
            if r[1] + r[3] > im.size[1] or r[1] < t0:
                continue
            row(st, size, '掉落牌' if q['c'] != 'elite' else '菁英名牌', q['n'][:10] + ('（★）' if q.get('star') else ''), tok, 'fg', r, im)

# ---------- v1.3.5 經驗條／格擋弧、v1.3.6 能量護盾細條／危急外框 ----------
for size in ('390x844', '1280x720'):
    d = size == '1280x720'
    for st in ['es_partial', 'es_recharge', 'es_zero', 'lowcomb', 'lowlife', 'blockbr', 'normal', 'collapsed']:
        f = os.path.join(OUT, f'{st}_{size}.png')
        if not os.path.exists(f):
            continue
        im = Image.open(f).convert('RGB')
        R, m = meas(st, size)
        c = st == 'collapsed'
        es = ('C67' if c else 'D69') if d else ('T46' if c else 'P70')
        if es in R:
            r = R[es]
            if st in ('es_partial', 'lowlife', 'es_recharge', 'collapsed', 'lowcomb'):
                row(st, size, es, '能量護盾細條 填（左端）', '--es', 'bg', sub(r, 0, 0, 2, 3), im)
            if st not in ('lowlife', 'es_full'):  # 滿的沒有空槽
                row(st, size, es, '能量護盾細條 空槽（右端）', '--panel-inset', 'bg', sub(r, r[2] - 6, 0, 6, 3), im)
        ee = ('C68' if c else 'D70') if d else ('T47' if c else 'P71')
        if ee in R:
            row(st, size, ee, '充能前緣 2 px', '--es-hi', 'bg', R[ee], im)
        xp = ('C64' if c else 'D65') if d else ('T43' if c else 'P66')
        if xp in R:
            r = R[xp]
            o = 2 if d else 1
            row(st, size, xp, '經驗條 填（左）', '--prog-hi', 'bg', sub(r, 4, o, 20, 4), im)
            row(st, size, xp, '經驗條 空（右）', '--prog-lo', 'bg', sub(r, r[2] - 24, o, 20, 4), im)
            if d:
                row(st, size, xp, '經驗條 外框 #000', '#000', 'bg', sub(r, 20, 0, 100, 1), im)
                row(st, size, xp, '經驗條 內框 --border', '--border', 'bg', sub(r, 20, 1, 100, 1), im)
            elif c:
                row(st, size, xp, '經驗條 上下 1 px #000（收起）', '#000', 'bg', sub(r, 20, 0, 100, 1), im)
            else:
                row(st, size, xp, '經驗條 上緣 --panel-edge', '--panel-edge', 'bg', sub(r, 20, 0, 100, 1), im)
                row(st, size, xp, '經驗條 下緣 --border', '--border', 'bg', sub(r, 20, 5, 100, 1), im)
        bk = ('C65' if c else 'D66') if d else ('T44' if c else 'P67')
        if bk in R:
            r = R[bk]
            if st == 'blockbr':
                row(st, size, bk, '格擋弧 回滿中斷續段', '--block-regen', 'fg', sub(r, 0, 0, r[2] // 2, r[3]), im)
            else:
                row(st, size, bk, '格擋弧 填（左半）', '--block', 'fg', sub(r, 0, 0, r[2] // 2, r[3]), im)
            row(st, size, bk, '格擋弧 空軌（右端）', '--block-dim', 'fg', sub(r, r[2] - 8, r[3] - 8, 8, 8), im)
            row(st, size, bk, '格擋弧 外圍 #000', '#000', 'fg', r, im)
        lw = 'D24' if d else 'P19'
        if st in ('lowcomb', 'lowlife') and lw in R:
            row(st, size, lw, '生命條危急外框（常亮）', '--hp-hi', 'fg', sub(R[lw], 0, 0, R[lw][2], 1), im)

# ---------- 退回第 1–5 項驗收抽樣 ----------
E = os.path.join(OUT)


def img(n):
    return Image.open(os.path.join(E, n)).convert('RGB')


def mean(im, r):
    P = px(im, r)
    return sum(lum(c) for c in P) / len(P)


acc.append('### 第 1 項：390 戰場上方暗層（10–316 × 98–142）')
b = img('boss_390x844.png')
Rb, _ = meas('boss', '390x844')
g, n, bg = fg(b, Rb['P12'], '--tx-strong')
acc.append(f'- boss_390 P12 王名字：抽到 {hx(g)}（{n} px 相符 #fbf9f6），對底 {hx(bg)} 對比 **{contrast(g, bg):.2f}:1**（上一輪 #3b3836、1.68:1）')
hp = dom(b, Rb['P12'])
acc.append(f'- boss_390 P12 王血條：框內最多的顏色 {hx(hp)}（規格 --hp #934341，差 {dist(hp, rgb("#934341"))}）；對槽 --panel-inset #1d1a17 對比 {contrast(hp, rgb("#1d1a17")):.2f}:1（上一輪 #261312、1.1:1）')
try:
    old = subprocess.run(['git', 'show', 'b206020:docs/production/evidence/battle-hud-v133/normal_390x844.png'], cwd=ROOT,
                         capture_output=True, check=True).stdout
    import io
    oi = Image.open(io.BytesIO(old)).convert('RGB')
except Exception:
    oi = None
nm = img('normal_390x844.png')
reg, below, side = [10, 98, 306, 44], [10, 150, 306, 44], [320, 98, 66, 44]
acc.append(f'- normal_390 10–316×98–142 平均相對亮度 {mean(nm, reg):.4f}；同一張下方 10–316×150–194 {mean(nm, below):.4f}、右側 320–386×98–142 {mean(nm, side):.4f}'
           + (f'；上一輪（b206020）同區 {mean(oi, reg):.4f}、右側 {mean(oi, side):.4f}' if oi else ''))
acc.append('- 成因：舊 HUD 的地點列 `#area`（底 rgba(11,8,6,0.8)，10–316×99–143）。`body.touch.port #area { display: flex }` 的權重蓋過 `body.inmap #area { display: none }`；改成 `body.inmap #area, body.bhp.inmap #area { display: none }`。')

acc.append('')
acc.append('### 第 2 項：彈匣 6 格同一行')
for f, rid, y0 in (('normal_390x844.png', 'P20', 496), ('normal_1280x720.png', 'D42', 636)):
    im = img(f)
    st, size = f.split('_')[0], f.split('_')[1][:-4]
    R, _ = meas(st, size)
    x0 = R[rid][0] + (5 if rid == 'P20' else 7)
    cells = []
    for j in range(6):
        c = im.getpixel((x0 + 6 * j + 1, y0 + 1))
        cells.append(hx(c))
    on = sum(1 for c in cells if dist(rgb(c), rgb('#b6b0a8')) <= 8)
    below_px = [im.getpixel((x0 + 6 * j + 1, y0 + 6)) for j in range(6)]
    acc.append(f'- {f} {rid}：y {y0}–{y0 + 3}、x {x0}–{x0 + 33} 每格中心 {"、".join(cells)}；亮 {on} 格（測資彈匣 4／6，--prog-hi #b6b0a8）；下一行 y {y0 + 6} 沒有格子（抽到 {"、".join(hx(c) for c in below_px[:2])}…）')

acc.append('')
acc.append('### 第 3 項：蓄力弧（P22／D44，測資 2/3）')
for f, rid in (('normal_390x844.png', 'P22'), ('normal_1280x720.png', 'D44'), ('collapsed_390x844.png', 'T23'), ('lootflood_390x844.png', 'P22')):
    im = img(f)
    st, size = f.split('_')[0], f.split('_')[1][:-4]
    R, _ = meas(st, size)
    x, y, w, h = [int(round(v)) for v in R[rid]]
    hi, mid = rgb('#b6b0a8'), rgb('#817b75')
    # 上邊（右半）→ 段 1；右邊 → 段 1／2；下邊 → 段 2；左邊 → 段 3
    def band(pts):
        P = [im.getpixel(p) for p in pts]
        return sum(1 for c in P if dist(c, hi) <= 10), sum(1 for c in P if dist(c, mid) <= 10), len(P)
    top_r = band([(i, y - 4 + k) for i in range(x + w // 2 + 4, x + w) for k in (0, 1)])
    bot = band([(i, y + h + 2 + k) for i in range(x + 4, x + w - 4) for k in (0, 1)])
    left = band([(x - 4 + k, j) for j in range(y + 4, y + h - 8) for k in (0, 1)])
    acc.append(f'- {f} {rid}（格 {x}–{x + w}×{y}–{y + h}，弧 {x - 4}–{x + w + 4}×{y - 4}–{y + h + 4}）：上緣右半 --prog-hi {top_r[0]}／{top_r[2]} px；下緣 --prog-hi {bot[0]}／{bot[2]} px；左緣（第 3 段，未到）--border-mid {left[1]}／{left[2]} px、--prog-hi {left[0]} px')

acc.append('')
acc.append('### 第 4 項：拾取列照稀有度（見上表「拾取」各列）＋ #bh 範圍 --rar-*')
acc.append('- `#bh, #pidle, #pnav, #dnav` 覆寫 --rar-normal #f1ebdb、--rar-magic #9da7ff、--rar-rare #fbe53a（值放 :root 的 --d2-rar-*，canvas 掉落牌同一組）。記號：◆ 稀有、◈ 傳奇、王印 追逐、★ 只給完美通貨與破裂；普通、魔法、一般通貨沒有記號。')
acc.append('')
acc.append('### 第 5 項：收起列 T34／C34 左 2px 直條（見上表「最近一筆 左 2px 直條」）')
open(os.path.join(OUT, 'TOKENS.md'), 'w').write('\n'.join([
    '## token 色值比對（抽實際像素）', '',
    '抽法：字／細線＝框內離 token 最近的像素（相符＝最大通道差 ≤ 8；括號是相符的像素數）；底＝框內最多的顏色。對比＝WCAG 2，前景抽到的像素對框內最多的顏色。框位取 measure_*.json 的實機框；掉落牌取 G.plates（canvas 座標＋戰場上緣）。', '',
    '| 畫面 | id | 元素 | 規格 token | 抽法 | 實測像素 | 差 | 對比 | 結果 |', '|---|---|---|---|---|---|---|---|---|'] + rows + ['', '## 退回第 1–5 項驗收抽樣', ''] + acc) + '\n')
bad = sum(1 for r in rows if r.endswith('❌ |'))
print(f'token 比對 {len(rows)} 項，不符 {bad}')
