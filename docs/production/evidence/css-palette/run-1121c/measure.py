"""第三輪量測整理（SIGNOFF-CHECKLIST 上一輪「未驗」的項目）。
用法：python3 -I measure.py <shots 資料夾> <ruling.csv>
讀 measure.js／x4.js 的 facts 與截圖，寫：measure.csv（全部量測）、pal-scan.csv、rings.csv，
並排圖 cmp-*.jpg（main｜分支）、色盲模擬 cvd-*.png。"""
import csv, json, os, re, sys
import numpy as np
from PIL import Image, ImageDraw

D = sys.argv[1]
RULING = sys.argv[2]
F = {t: json.load(open(f'{D}/{t}-facts.json')) for t in ['main', 'branch']}


def hx(s):
    s = s.strip()
    if s.startswith('#'):
        s = s[1:]
        if len(s) == 3:
            s = ''.join(c * 2 for c in s)
        return [int(s[i:i + 2], 16) for i in (0, 2, 4)]
    m = re.findall(r'[\d.]+', s)
    return [int(float(v)) for v in m[:3]] if len(m) >= 3 else None


def lin(c):
    c = np.asarray(c, float) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lum(c):
    l = lin(c)
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]


def cr(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


def lab(c):
    l = lin(c)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    x, y, z = M @ l / np.array([0.95047, 1.0, 1.08883])
    f = lambda t: np.where(t > 216 / 24389, np.cbrt(t), (24389 / 27 * t + 16) / 116)
    fx, fy, fz = f(x), f(y), f(z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def de2000(c1, c2):
    L1, a1, b1 = lab(c1)
    L2, a2, b2 = lab(c2)
    C1, C2 = np.hypot(a1, b1), np.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - np.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p, h2p = np.degrees(np.arctan2(b1, a1p)) % 360, np.degrees(np.arctan2(b2, a2p)) % 360
    dLp, dCp = L2 - L1, C2p - C1p
    dh = h2p - h1p
    if C1p * C2p == 0:
        dh = 0
    elif dh > 180:
        dh -= 360
    elif dh < -180:
        dh += 360
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dh / 2))
    Lbp, Cbp = (L1 + L2) / 2, (C1p + C2p) / 2
    hs = h1p + h2p
    if C1p * C2p == 0:
        hbp = hs
    elif abs(h1p - h2p) > 180:
        hbp = (hs + 360) / 2 if hs < 360 else (hs - 360) / 2
    else:
        hbp = hs / 2
    T = 1 - 0.17 * np.cos(np.radians(hbp - 30)) + 0.24 * np.cos(np.radians(2 * hbp)) + 0.32 * np.cos(np.radians(3 * hbp + 6)) - 0.20 * np.cos(np.radians(4 * hbp - 63))
    dth = 30 * np.exp(-(((hbp - 275) / 25) ** 2))
    Rc = 2 * np.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7))
    Sl = 1 + 0.015 * (Lbp - 50) ** 2 / np.sqrt(20 + (Lbp - 50) ** 2)
    Sc, Sh = 1 + 0.045 * Cbp, 1 + 0.015 * Cbp * T
    Rt = -np.sin(np.radians(2 * dth)) * Rc
    return float(np.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh)))


# Machado 2009，嚴重度 1.0（線性 RGB）
CVD = {
    'protan': np.array([[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]]),
    'deutan': np.array([[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]]),
    'tritan': np.array([[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]),
}


def sim(img, m):
    l = lin(np.moveaxis(img, -1, 0))
    o = np.tensordot(m, l, axes=1).clip(0, 1)
    s = np.where(o <= 0.0031308, o * 12.92, 1.055 * o ** (1 / 2.4) - 0.055)
    return np.moveaxis((s * 255).round(), 0, -1).astype(np.uint8)


def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(int)


def px(im, x, y):
    H, W = im.shape[:2]
    return [int(v) for v in im[min(H - 1, max(0, int(y))), min(W - 1, max(0, int(x)))]]


def med(im, x0, y0, x1, y1):
    H, W = im.shape[:2]
    a = im[max(0, int(y0)):min(H, int(y1)), max(0, int(x0)):min(W, int(x1))].reshape(-1, 3)
    return [int(v) for v in np.median(a, axis=0)] if len(a) else None


rows = []


def row(item, tree, size, what, a, b, val, kind, thr, status, note=''):
    rows.append([item, tree, size, what, a, b, val, kind, thr, status, note])


def side(name, left, right, title=('main 812b428', 'branch')):
    """main｜分支並排"""
    if not (os.path.exists(left) and os.path.exists(right)):
        return None
    a, b = Image.open(left).convert('RGB'), Image.open(right).convert('RGB')
    W, H = max(a.width, b.width), max(a.height, b.height)
    o = Image.new('RGB', (W * 2 + 10, H + 24), (16, 19, 15))
    o.paste(a, (0, 24))
    o.paste(b, (W + 10, 24))
    d = ImageDraw.Draw(o)
    d.text((4, 6), title[0], fill=(240, 240, 240))
    d.text((W + 14, 6), title[1], fill=(240, 240, 240))
    o.save(f'{D}/{name}', quality=82)
    return name


# ---------- §1 PAL 開機掃描 ----------
SRC = {'branch': sys.argv[3] if len(sys.argv) > 3 else '.', 'main': sys.argv[4] if len(sys.argv) > 4 else '.'}


def codekeys(src):
    ks = set()
    for fn in os.listdir(f'{src}/js'):
        if fn.endswith('.js'):
            t = re.sub(r'/\*[\s\S]*?\*/', '', open(f'{src}/js/{fn}', encoding='utf8').read())
            for m in re.finditer(r'\bPAL\.(rgb\.|scene\.(\w+)\.)?([a-zA-Z]\w*)', t):
                ks.add(('rgb.' + m[3]) if m[1] == 'rgb.' else ('scene.' + m[2] + '.' + m[3]) if m[1] else m[3])
    return ks


for t in F:
    ck = codekeys(SRC[t])
    F[t]['pal']['comment_only'] = [k for k, v in F[t]['pal']['keys'] if k not in ck]
    F[t]['pal']['keys'] = [[k, v] for k, v in F[t]['pal']['keys'] if k in ck]
pal = F['branch']['pal']
bad = [k for k, v in pal['keys'] if v is None or v == '']
root = pal['root']
with open(f'{D}/pal-scan.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['tree', 'PAL 鍵（JS 讀到的）', '開機解析值', '狀態'])
    for t in ['main', 'branch']:
        for k, v in F[t]['pal']['keys']:
            w.writerow([t, k, v, '❌ undefined／空字串' if v is None or v == '' else 'ok'])
mainBad = [k for k, v in F['main']['pal']['keys'] if v is None or v == '']
row('§1 PAL 開機掃描', 'branch', '1280x720', f'JS 程式（不含註解）讀到的 PAL 鍵 {len(pal["keys"])} 個；undefined 或空字串', '', '', len(bad), 'count', '0', '通過' if not bad else '不通過', ' '.join(bad) + f'（只出現在註解、不算：{" ".join(pal["comment_only"])}）')
row('§1 PAL 開機掃描', 'main', '1280x720', f'JS 讀到的 PAL 鍵 {len(F["main"]["pal"]["keys"])} 個；undefined 或空字串', '', '', len(mainBad), 'count', '', '參考', ' '.join(mainBad))
# 判定表 target 與定稿值：target 欄裡每個 --token 在 :root 的實際值，對 target_value
rul = list(csv.DictReader(open(RULING)))
tgt_rows, mism = [], []
for r in rul:
    toks = re.findall(r'--[\w-]+', r['target'])
    tv = r['target_value'].strip()
    tvv = hx(tv) if tv and tv != '—' else None
    if not toks:
        continue
    if len(toks) == 1 and tvv:
        got = root.get(toks[0])
        gv = hx(got) if got else None
        ok = gv == tvv
        tgt_rows.append([r['token'], toks[0], tv, got, 'ok' if ok else '❌ 不符'])
        if not ok:
            mism.append(f'{r["token"]}→{toks[0]}（定 {tv}，實際 {got}）')
    else:
        for t in toks:
            got = root.get(t)
            tgt_rows.append([r['token'], t, '(分用途，只查有定義)', got, 'ok' if got else '❌ :root 沒有'])
            if not got:
                mism.append(f'{r["token"]}→{t}（:root 沒有）')
FINAL = {'--hf': '#b65517', '--portal': '#ccbcfe', '--portal-rgb': '204, 188, 254', '--enemy-tel-rgb': '255, 61, 127', '--el-fire-rgb': '238, 153, 120', '--rar-rare-rgb': '251, 229, 58', '--rar-chase-rgb': '12, 246, 238', '--enemy-tel': None, '--enemy-rim': None, '--fx-own': None, '--vig': None, '--dmg-outline': None}
for k, v in FINAL.items():
    got = root.get(k)
    ok = bool(got) and (v is None or hx(got) == hx(v))
    tgt_rows.append(['SIGNOFF §0', k, v or '(要有)', got, 'ok' if ok else '❌'])
    if not ok:
        mism.append(f'§0 {k}（定 {v}，實際 {got}）')
with open(f'{D}/pal-target.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['判定表列／來源', 'target token', '定稿值', '分支 :root 實際值', '狀態'])
    w.writerows(tgt_rows)
row('§1 PAL 對判定表 target／M2-36 定稿', 'branch', '1280x720', f'target 與 §0 定稿 token 共 {len(tgt_rows)} 筆', '', '', len(mism), 'count', '0', '通過' if not mism else '不通過', '；'.join(mism))

# ---------- §2 X2：每個 fx 環呼叫點的序列圖 ----------
def key(r):
    return (r['file'], r['v'])


with open(f'{D}/rings.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['tree', '檔:行', '變數', 'col 運算式', 'sh 運算式', 'col 值', '實際播的序列圖'])
    for t in ['main', 'branch']:
        for r in F[t]['rings']:
            w.writerow([t, f'{r["file"]}:{r["line"]}', r['v'], r['col'], r['sh'], r['colVal'], r['sheet']])
# 照檔案內順序配對 main 與分支的呼叫點
from collections import defaultdict
seq = {t: defaultdict(list) for t in F}
for t in F:
    for r in F[t]['rings']:
        if not (r['file'] == 'skills.js' and abs(r['line'] - 2195) < 3):
            seq[t][r['file']].append(r)
    for r in json.load(open(f'{D}/{t}-x2-local.json')):
        seq[t]['skills.js@2195（區域變數 col、D.el；x2_local.js）'].append({'file': 'skills.js', 'line': 2195, 'v': 'el=' + r['el'], 'sheet': r['sheet']})
pairs, diffs = [], []
for fn in sorted(set(seq['main']) | set(seq['branch'])):
    A, B = seq['main'][fn], seq['branch'][fn]
    for i in range(max(len(A), len(B))):
        a = A[i] if i < len(A) else None
        b = B[i] if i < len(B) else None
        sa, sb = a and a['sheet'], b and b['sheet']
        pairs.append([fn, a and a['line'], b and b['line'], (a or b)['v'], sa, sb, '同' if sa == sb else '不同'])
        if sa != sb:
            diffs.append(f'{fn}:{a and a["line"]}/{b and b["line"]} {(a or b)["v"]} {sa}→{sb}')
with open(f'{D}/rings-pair.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['檔', 'main 行', '分支行', '變數', 'main 序列圖', '分支序列圖', '比對'])
    w.writerows(pairs)
row('§2 X2 RINGFX', 'main↔branch', '1280x720', f'fx 環呼叫點×變數 {len(pairs)} 組，用真的 fx() 觸發、攔 fxs() 看播哪張', '', '', len(diffs), 'count', '0 不同', '通過' if not diffs else '有差異（見 rings-pair.csv）', '；'.join(diffs))
for k in F['branch']['trig']:
    a, b = F['main']['trig'][k], F['branch']['trig'][k]
    row('§2 X2 實際事件', 'main↔branch', '1280x720', k, a.get('sheets') if isinstance(a, dict) else a, b.get('sheets') if isinstance(b, dict) else b, '', 'sheet', '相同', '通過' if a.get('sheets') == b.get('sheets') else '不同')
# 每個（col×序列圖）組合的截圖拼成一張
for t in F:
    S = F[t]['ringShots']
    n = len(S)
    cols = 8
    g = Image.new('RGB', (cols * 164, ((n + cols - 1) // cols) * 184), (16, 19, 15))
    d = ImageDraw.Draw(g)
    for i, s in enumerate(S):
        x, y = (i % cols) * 164, (i // cols) * 184
        g.paste(Image.open(f'{D}/{s["file"]}').convert('RGB'), (x, y + 20))
        d.text((x + 2, y + 2), f'{s["sheet"]} {s["site"][:22]}', fill=(240, 240, 240))
    g.save(f'{D}/rings-{t}.jpg', quality=80)

# ---------- §2 X4：黑邊 alpha（截圖像素，兩張相除）＋程式攔 stroke ----------
for t in F:
    none = load(f'{D}/{t}-x4-none.png')
    for nm in ['fxown', 'fire', 'enemytel', 'default']:
        for tt in ['0', '0.3']:
            p = f'{D}/{t}-x4-{nm}-t{tt}.png'
            if not os.path.exists(p):
                continue
            im = load(p)
            dif = im - none
            darker = (dif < -1).all(axis=2) & (none.sum(axis=2) > 30)
            a = 1 - im.sum(axis=2)[darker] / none.sum(axis=2)[darker]
            # 環本色的 alpha：比底亮的像素，(後−前)/(色−前)
            stroke = [s for s in F[t]['x4'] if s['t'] == float(tt) and s['ring'].startswith({'fxown': '我方', 'fire': '火', 'enemytel': '敵方', 'default': '無'}[nm])]
            st = stroke[0]['strokes'] if stroke else []
            edgeA = st[0]['a'] if st and st[0]['s'] == '#000000' else None
            ringA = st[-1]['a'] if st else None
            ok = (edgeA is not None and edgeA == ringA and edgeA < 1) and (nm != 'fxown' or edgeA <= 0.09 + 1e-9)
            row('§2 X4 黑邊 alpha', t, '1280x720', f'{nm} t={tt}：程式 stroke 黑邊 α／環 α', edgeA, ringA, '' if not len(a) else f'{np.median(a):.3f}（像素中位，n={len(a)}）', 'alpha', '黑邊α＝環α、<1；--fx-own ≤0.09', ('通過' if ok else '不通過') if t == 'branch' else '參考（main 沒有黑邊）', f'像素反推最大 {a.max():.3f}' if len(a) else '沒有變暗像素')
    # 我方環黑邊 vs 敵方預警：對地面的對比
    tl = load(f'{D}/{t}-x4-tele.png')
    H, W = tl.shape[:2]
    g0 = px(none, W // 2, H // 2)
    fill = px(tl, W // 2, H // 2)
    row('§2 X4 我方黑邊 vs 敵方預警', t, '1280x720', '敵方預警 teleCircle 填色（f=1）對地面', fill, g0, f'{cr(fill, g0):.2f}', 'contrast', '', '記錄')
    for nm in ['fxown', 'fire']:
        im = load(f'{D}/{t}-x4-{nm}-t0.png')
        dif = (im - none).sum(axis=2)
        dk = np.unravel_index(np.argmin(dif), dif.shape)
        c = [int(v) for v in im[dk]]
        gg = [int(v) for v in none[dk]]
        row('§2 X4 我方黑邊 vs 敵方預警', t, '1280x720', f'{nm} 環最暗點（黑邊）對地面', c, gg, f'{cr(c, gg):.2f}', 'contrast', '< 敵方預警', '記錄')

# ---------- §3 王的預警壓在淺磚（遊戲的 teleCircle 畫在淺磚色上） ----------
for t in F:
    for e in F[t]['tele']:
        bg = e['bg']
        row('§3 預警壓淺磚', t, '合成', f'{e["base"]}：teleCircle 填色', e['teleFill'], bg, f'{cr(e["teleFill"], bg):.2f}', 'contrast', '≥3（--enemy-tel 規格 2.99／1.98 照實記）', '記錄')
        row('§3 預警壓淺磚', t, '合成', f'{e["base"]}：teleCircle 外框線', e['teleLine'], bg, f'{cr(e["teleLine"], bg):.2f}', 'contrast', '', '記錄')
        row('§3 預警壓淺磚', t, '合成', f'{e["base"]}：王閃現線', e['blinkLine'], bg, f'{cr(e["blinkLine"], bg):.2f}', 'contrast', '', '記錄')
        row('§3 預警壓淺磚', t, '合成', f'{e["base"]}：線外 2 px 有沒有 #000 黑邊', e['teleOut'], bg, '有' if sum(e['teleOut']) < sum(bg) - 30 or sum(e['blinkOut']) < sum(bg) - 30 else '沒有', 'rim', '要有外 1 px #000', '不通過' if t == 'branch' and not (sum(e['teleOut']) < sum(bg) - 30) else '參考')

# ---------- 擠的戰鬥＋地獄火快爆：條、字、光暈、ΔE、色盲、小地圖 ----------
for t in F:
    for size, S in F[t]['sizes'].items():
        if 'crowd' not in S:
            continue
        cw = load(f'{D}/{t}-{size}-crowd.png')
        hc = load(f'{D}/{t}-{size}-hellfire-crisis.png')
        pal = S['crowd']['pal']

        def bar(bars, want):
            for b in bars:
                c = b['cls'].split()
                if want(c):
                    return b
            return None

        hpb = bar(S['crowd']['bars'], lambda c: 'hb' in c and 'mp' not in c and 'bv' not in c) or bar(S['crowd']['bars'], lambda c: 'orb' in c and 'mp' not in c)
        mpb = bar(S['crowd']['bars'], lambda c: 'mp' in c)
        hfb = bar(S['hot'], lambda c: 'mp' in c and 'hot' in c) or bar(S['hot'], lambda c: 'mp' in c)

        def fillpx(im, b):
            f = b['fill'] or b['r']
            x0 = f[0] + 2
            return med(im, x0, f[1] + 2, x0 + 4, f[1] + f[3] - 2)

        def textpx(im, b):
            s = b['span'] or b['r']
            reg = im[s[1]:s[1] + s[3], s[0]:s[0] + s[2]].reshape(-1, 3)
            if not len(reg):
                return None
            L = reg.sum(axis=1)
            return [int(v) for v in reg[np.argmax(L)]]

        def emptypx(im, b):
            f, r = b['fill'], b['r']
            if not f or f[0] + f[2] >= r[0] + r[2] - 4:
                return None
            return med(im, f[0] + f[2] + 1, f[1] + 2, r[0] + r[2] - 2, f[1] + f[3] - 2)

        for nm, im, b, tok in [('--hp', cw, hpb, 'hp'), ('--mp', cw, mpb, 'mp'), ('--hf', hc, hfb, 'hf')]:
            if not b:
                row('§4 條上字', t, size, f'{nm} 條', '', '', '找不到條', '', '', '無法自動驗')
                continue
            fp, tp = fillpx(im, b), textpx(im, b)
            row('§4 條上字', t, size, f'--tx-strong 字（最亮像素）對 {nm} 填色（{b["cls"]}）', tp, fp, f'{cr(tp, fp):.2f}' if tp and fp else '', 'contrast', '≥4.5', ('通過' if tp and fp and cr(tp, fp) >= 4.5 else '不通過') if t == 'branch' else '參考', '字有 text-shadow 黑描邊；取的是字心最亮像素')
            if tok == 'hf' or tok == 'hp' or tok == 'mp':
                tv = hx(pal['txStrong'])
                row('§4 條上字', t, size, f'--tx-strong token 值 {pal["txStrong"]} 對 {nm} 填色像素', tv, fp, f'{cr(tv, fp):.2f}' if fp else '', 'contrast', '≥4.5', ('通過' if fp and cr(tv, fp) >= 4.5 else '不通過') if t == 'branch' else '參考', '10 px 字反鋸齒，像素最亮點到不了 token 值；兩種都列')
            ep = emptypx(im, b)
            if ep:
                row('§4 條填色對空段', t, size, f'{nm} 填色對空段', fp, ep, f'{cr(fp, ep):.2f}', 'contrast', {'hf': '3.55', 'hp': '2.57（要 1 px 框）', 'mp': ''}[tok], '記錄')
        # ΔE：--hf 對 --hp（畫面像素）、--act（主鈕像素）、--vig（token；畫面上危急紅邊用的是 --hurt-vignette）
        if hfb and hpb:
            a, b = fillpx(hc, hfb), fillpx(cw, hpb)
            row('§4 ΔE', t, size, '--hf 填色 vs --hp 填色（像素）', a, b, f'{de2000(a, b):.1f}', 'ΔE2000', '≥15', ('通過' if de2000(a, b) >= 15 else '不通過') if t == 'branch' else '參考')
            for cv, m in CVD.items():
                sa, sb = sim(np.array([[a]]), m)[0, 0].tolist(), sim(np.array([[b]]), m)[0, 0].tolist()
                row('§4 ΔE 色盲', t, size, f'{cv}：--hf vs --hp', sa, sb, f'{de2000(sa, sb):.1f}', 'ΔE2000', '記錄（低值靠位置／外框）', '記錄')
        bp = f'{D}/{t}-{size}-panel-btn-disabled.png'
        btn = S['panels'].get('btn-disabled', {})
        if hfb and os.path.exists(bp) and isinstance(btn, dict) and btn.get('btns'):
            bi = load(bp)
            x, y, w_, h_ = btn['btns']
            act = px(bi, x + 6, y + h_ // 2)
            a = fillpx(hc, hfb)
            row('§4 ΔE', t, size, '--hf 填色 vs --act（主鈕底像素）', a, act, f'{de2000(a, act):.1f}', 'ΔE2000', '≥15', ('通過' if de2000(a, act) >= 15 else '不通過') if t == 'branch' else '參考')
            for cv, m in CVD.items():
                sa, sb = sim(np.array([[a]]), m)[0, 0].tolist(), sim(np.array([[act]]), m)[0, 0].tolist()
                row('§4 ΔE 色盲', t, size, f'{cv}：--hf vs --act', sa, sb, f'{de2000(sa, sb):.1f}', 'ΔE2000', '記錄', '記錄')
        if hfb and pal.get('vig'):
            a, v = fillpx(hc, hfb), hx(pal['vig'])
            row('§4 ΔE', t, size, '--hf 填色像素 vs --vig token 值（畫面上沒有元件用 --vig）', a, v, f'{de2000(a, v):.1f}', 'ΔE2000', '≥15', ('通過' if de2000(a, v) >= 15 else '不通過') if t == 'branch' else '參考')
            for cv, m in CVD.items():
                sa, sb = sim(np.array([[a]]), m)[0, 0].tolist(), sim(np.array([[v]]), m)[0, 0].tolist()
                row('§4 ΔE 色盲', t, size, f'{cv}：--hf vs --vig', sa, sb, f'{de2000(sa, sb):.1f}', 'ΔE2000', '記錄', '記錄')
        # 快爆光暈 vs --hf 填色（一般＋三種色盲），在條外 3 px 取光暈
        if hfb:
            r = hfb['r']
            gl = px(hc, r[0] - 3, r[1] + r[3] // 2) if 'orb' not in hfb['cls'] else px(hc, r[0] + r[2] // 2, r[1] - 6)
            ref = px(cw, r[0] - 3, r[1] + r[3] // 2) if 'orb' not in hfb['cls'] else px(cw, r[0] + r[2] // 2, r[1] - 6)
            a = fillpx(hc, hfb)
            row('§3／§4 快爆光暈 vs --hf', t, size, f'光暈（{hfb["cls"]} 外 3 px）vs --hf 填色；沒光暈時同點 {ref}', gl, a, f'{de2000(gl, a):.1f}', 'ΔE2000', '≥10', ('通過' if de2000(gl, a) >= 10 else '不通過') if t == 'branch' else '參考')
            for cv, m in CVD.items():
                sa, sb = sim(np.array([[gl]]), m)[0, 0].tolist(), sim(np.array([[a]]), m)[0, 0].tolist()
                row('§3 色盲 光暈 vs --hf', t, size, f'{cv}（Machado 2009，1.0）', sa, sb, f'{de2000(sa, sb):.1f}', 'ΔE2000', '≥10', ('通過' if de2000(sa, sb) >= 10 else '不通過') if t == 'branch' else '參考')
            # 危急紅邊（canvas 的 hurt-vignette）vs --hf
            Hh, Ww = hc.shape[:2]
            ve = px(hc, 2, Hh // 2)
            row('§3 危急紅邊 vs --hf', t, size, '畫面左緣紅邊像素 vs --hf 填色', ve, a, f'{de2000(ve, a):.1f}', 'ΔE2000', '分得開', '記錄')
        # 色盲模擬圖
        if t == 'branch':
            for cv, m in CVD.items():
                Image.fromarray(sim(hc.astype(np.uint8), m)).save(f'{D}/cvd-{size}-{cv}.png')
        # 小地圖點對周圍
        for dt in S['crowd']['dots']:
            if dt['w'] > 10:
                continue
            x, y = dt['at']
            c = px(cw, x, y)
            ring = [px(cw, x + dx, y + dy) for dx, dy in [(-4, 0), (4, 0), (0, -4), (0, 4), (-4, -4), (4, 4), (-4, 4), (4, -4)]]
            bgm = [int(v) for v in np.median(np.array(ring), axis=0)]
            row('§4 小地圖點', t, size, f'點 {dt["col"]}（{dt["w"]:.0f} px）對周圍', c, bgm, f'{cr(c, bgm):.2f}', 'contrast', '≥3', ('通過' if cr(c, bgm) >= 3 else '不通過') if t == 'branch' else '參考')
        # 營地：地圖台符文
        cp = f'{D}/{t}-{size}-camp.png'
        if os.path.exists(cp) and isinstance(S.get('camp'), dict):
            im = load(cp)
            x, y, rx, ry = S['camp']['device']
            pts = [px(im, x + np.cos(q) * rx, y + np.sin(q) * ry) for q in np.linspace(0, 2 * np.pi, 80, endpoint=False)]
            target = hx(pal.get('enemyTel') and '204,188,254' or '204,188,254')
            best = max(pts, key=lambda c: lum(c))
            bgc = px(im, x + rx * 2.2, y)
            row('§3 營地地圖台符文', t, size, '符文最亮像素 vs 旁邊地面', best, bgc, f'{cr(best, bgc):.2f}', 'contrast', '≥3', ('通過' if cr(best, bgc) >= 3 else '不通過') if t == 'branch' else '參考', f'色相：{"偏 --portal 淡紫" if best[2] > best[0] else "其他"}')

# ---------- --enemy-tel 對黑邊（王現身／獄火自爆環） ----------
im = load(f'{D}/branch-x4-enemytel-t0.png')
none = load(f'{D}/branch-x4-none.png')
tel = hx('#ff3d7f')
dd = np.abs(im - np.array(tel)).sum(axis=2)
ry, rx_ = np.unravel_index(np.argmin(dd), dd.shape)
ring = [int(v) for v in im[ry, rx_]]
dif = (im - none).sum(axis=2)
ky, kx = np.unravel_index(np.argmin(dif), dif.shape)
edge = [int(v) for v in im[ky, kx]]
row('§4 --enemy-tel 對黑邊', 'branch', '1280x720', '王現身／獄火自爆環：最接近 --enemy-tel 的像素 vs 最暗的黑邊像素', ring, edge, f'{cr(ring, edge):.2f}', 'contrast', '≥3（算出來 6.23）', '通過' if cr(ring, edge) >= 3 else '不通過')

# ---------- 並排圖 ----------
for size in ['390x844', '1280x720']:
    for k in ['camp', 'panel-tip', 'panel-asc', 'panel-tree', 'panel-btn-disabled', 'panel-nav', 'crowd', 'hellfire-crisis']:
        side(f'cmp-{size}-{k}.jpg', f'{D}/main-{size}-{k}.png', f'{D}/branch-{size}-{k}.png')
for nm in ['tele__615b56'] + sorted({f[len('branch-tele-'):-4] for f in os.listdir(D) if f.startswith('branch-tele-')}):
    side(f'cmp-tele-{nm}.jpg', f'{D}/main-tele-{nm}.png', f'{D}/branch-tele-{nm}.png')
xs = ['none', 'fxown-t0', 'fire-t0', 'enemytel-t0', 'tele']
for t in F:
    g = Image.new('RGB', (240 * len(xs), 260), (16, 19, 15))
    d = ImageDraw.Draw(g)
    for i, n in enumerate(xs):
        g.paste(Image.open(f'{D}/{t}-x4-{n}.png').convert('RGB'), (i * 240, 20))
        d.text((i * 240 + 4, 4), n, fill=(240, 240, 240))
    g.save(f'{D}/x4-{t}.jpg', quality=85)

with open(f'{D}/measure.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['項目', 'tree', '尺寸', '量什麼', 'A', 'B', '值', '單位', '門檻', '狀態', '備註'])
    w.writerows(rows)
print(len(rows), 'rows')
