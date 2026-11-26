"""戰鬥地板 × 怪物色差重測（照 AD-MEASURE.md §5 量法：CIEDE2000、門檻 15，不放寬）。
用法：python3 check/battle-floor-1126/measure.py [--shadow none|main|new] [--json 輸出.json]
- 精靈：js/art.js 的 m_*（75）＋ boss_shang（art-picks battle-hud v1.3 的 f64）＋ hero（img/hero.png 第 3 列第 4 格，跟 AD 表 nBdy 516、中位色 #3a253a 對得上）＝77
- 不透明 α≥128；本體＝其中 L*>10；每點 ΔE 取對 ground／mid 較近者（最壞）；中位色＝不透明點各通道中位數
- 判定「融進地板」：中位 ΔE<15 或本體平均 ΔE<15 或本體 >25% 的點 ΔE<15
- --shadow：腳下陰影（render.js）蓋到的本體點，底色改成「陰影疊在 ground／mid 上」的顏色，仍取較近者。
  none＝AD 原量法（不算陰影）；main＝main 現有的 shadow(m.x,m.y,m.r*1.1)；new＝本輪 mobShadow；stress＝極端陰影（只看上限，不是提案）。
  幾何照遊戲：精靈以腳底中心為錨、高＝D.sz（王 sz、主角 hero 高 80*…見 SPEC），陰影橢圓中心在腳底。"""
import re, sys, json, os, math
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
R = lambda *a: os.path.join(ROOT, *a)
GROUND, MID = (0x46, 0x41, 0x3C), (0x33, 0x30, 0x2B)
SCRIM = (10, 7, 4)  # css/style.css --scrim-rgb


def lin(c):
    c = np.asarray(c, float) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lab(rgb):
    l = lin(rgb)
    M = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])
    xyz = l @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > (6 / 29) ** 3, np.cbrt(xyz), xyz / (3 * (6 / 29) ** 2) + 4 / 29)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def de00(a, b):
    L1, a1, b1 = a[..., 0], a[..., 1], a[..., 2]
    L2, a2, b2 = b[..., 0], b[..., 1], b[..., 2]
    C1, C2 = np.hypot(a1, b1), np.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - np.sqrt(Cb**7 / (Cb**7 + 25**7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p = np.degrees(np.arctan2(b1, a1p)) % 360
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360
    dLp, dCp = L2 - L1, C2p - C1p
    dh = h2p - h1p
    dh = np.where(C1p * C2p == 0, 0, np.where(dh > 180, dh - 360, np.where(dh < -180, dh + 360, dh)))
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dh / 2))
    Lbp, Cbp = (L1 + L2) / 2, (C1p + C2p) / 2
    hs = h1p + h2p
    hbp = np.where(C1p * C2p == 0, hs, np.where(np.abs(h1p - h2p) > 180, np.where(hs < 360, (hs + 360) / 2, (hs - 360) / 2), hs / 2))
    T = 1 - 0.17 * np.cos(np.radians(hbp - 30)) + 0.24 * np.cos(np.radians(2 * hbp)) + 0.32 * np.cos(np.radians(3 * hbp + 6)) - 0.20 * np.cos(np.radians(4 * hbp - 63))
    dth = 30 * np.exp(-(((hbp - 275) / 25) ** 2))
    RC = 2 * np.sqrt(Cbp**7 / (Cbp**7 + 25**7))
    SL = 1 + 0.015 * (Lbp - 50) ** 2 / np.sqrt(20 + (Lbp - 50) ** 2)
    SC, SH = 1 + 0.045 * Cbp, 1 + 0.015 * Cbp * T
    RT = -np.sin(np.radians(2 * dth)) * RC
    return np.sqrt((dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH))


MACH = {
    'prot': [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    'deut': [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    'trit': [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}


def cvd(rgb, k):
    l = np.clip(lin(rgb) @ np.array(MACH[k]).T, 0, 1)
    s = np.where(l <= 0.0031308, 12.92 * l, 1.055 * l ** (1 / 2.4) - 0.055)
    return s * 255


def lum(rgb):
    l = lin(rgb)
    return 0.2126 * l[..., 0] + 0.7152 * l[..., 1] + 0.0722 * l[..., 2]


def wcag(a, b):
    x, y = sorted([lum(a), lum(b)])
    return (y + 0.05) / (x + 0.05)


def sprites():
    """art.js 的 m_*、boss_shang、hero；回傳 [(名, RGBA 陣列, 資料鍵 sp)]"""
    art = open(R('js', 'art.js'), encoding='utf8').read()
    sheet = dict(re.findall(r"^  '?([\w-]+)'?: '(img/[^']+)'", art, re.M))
    out = []
    for n, sh, x, y, w, h in re.findall(r"^  (m_\w+): \['([\w-]+)', (\d+), (\d+), (\d+), (\d+)\]", art, re.M):
        im = Image.open(R(sheet[sh])).convert('RGBA')
        x, y, w, h = map(int, (x, y, w, h))
        out.append((n, np.array(im.crop((x, y, x + w, y + h)))))
    out.append(('boss_shang', np.array(Image.open(R('docs/production/art-picks/battle-hud-v1.3/4-boss/boss_shang-s6921-f64.png')).convert('RGBA'))))
    out.append(('hero', np.array(Image.open(R('img/hero.png')).convert('RGBA').crop((320, 240, 400, 320)))))
    return out


def mob_dims():
    """data.js：sp → (r, sz)，從 sp 所在的 { } 物件取（同一張圖多隻怪時取最小的 sz，陰影佔比最小＝對陰影最不利）"""
    d = open(R('js', 'data.js'), encoding='utf8').read()
    res = {}
    for m in re.finditer(r"sp: '(m_\w+|boss_\w+)'", d):
        i, dep = m.start(), 0
        while i > 0:  # 往回找這個物件的 {
            i -= 1
            if d[i] == '}':
                dep += 1
            elif d[i] == '{':
                if dep == 0:
                    break
                dep -= 1
        j, dep = m.start(), 0
        while j < len(d):
            if d[j] == '{':
                dep += 1
            elif d[j] == '}':
                if dep == 0:
                    break
                dep -= 1
            j += 1
        seg = d[i:j]
        r = re.search(r'(?<![\w.])r: (\d+(?:\.\d+)?)', seg)
        sz = re.search(r'(?<![\w.])sz: (\d+(?:\.\d+)?)', seg)
        if r and sz:
            k, v = m.group(1), (float(r.group(1)), float(sz.group(1)))
            if k not in res or v[1] < res[k][1]:
                res[k] = v
    return res


def shadow_alpha(mode, W, H, r, sc, foot):
    """每個精靈原始像素中心被腳下陰影蓋到的不透明度（0＝沒蓋到）；原圖 1 px＝sc 世界 px，腳底中心＝(W/2, foot)"""
    a = np.zeros((H, W))
    if mode == 'none':
        return a
    xs = (np.arange(W) + 0.5 - W / 2) * sc
    ys = (np.arange(H) + 0.5 - foot) * sc
    X, Y = np.meshgrid(xs, ys)
    if mode == 'main':
        layers = [(r * 1.1, 0.38, 0.4)]  # render.js shadow(m.x, m.y, m.r * 1.1)：scrim 0.4
    elif mode == 'stress':  # 不是提案：寬 2 倍、近黑（0.95）的極端陰影，只看「光靠陰影」的上限
        layers = [(max(r * 1.1, W * sc * 0.5) * 2.0, 0.6, 0.95)]
    else:
        layers = new_layers(W * sc, r)
    out = np.zeros((H, W))
    for rx, k, al in layers:  # 疊加：1-(1-a)(1-b)
        inside = (X / rx) ** 2 + (Y / (rx * k)) ** 2 <= 1
        out = np.where(inside, 1 - (1 - out) * (1 - al), out)
    return out


def new_layers(w, r):
    """要跟 js/render.js 的 mobShadow 一致（MOB_SHADOW 表）"""
    js = open(R('js', 'render.js'), encoding='utf8').read()
    m = re.search(r'const MOB_SHADOW = (\[[^;]*\]);', js)
    L = json.loads(re.sub(r'(\w+):', r'"\1":', m.group(1).replace("'", '"')))
    R0 = max(r * 1.1, w * 0.5)
    return [(R0 * s['w'], s['k'], s['a']) for s in L]


def measure(mode):
    dims = mob_dims()
    gl, ml = lab(np.array(GROUND)), lab(np.array(MID))
    rows = []
    for n, a in sprites():
        H, W = a.shape[:2]
        op = a[..., 3] >= 128
        rgb = a[..., :3].astype(float)
        L = lab(rgb)
        body = op & (L[..., 0] > 10)
        if n == 'hero':  # 主角不改：一律是 main 的 shadow(P.x,P.y,18)；HSC 1.35、腳底在格內 y=63
            al = shadow_alpha('none' if mode == 'none' else 'main', W, H, 18 / 1.1, 1.35, 63)
        else:  # 沒接進 data.js 的圖（多數 m_*、boss_shang）：照已接怪 r/sz 中位數 0.386；王照 BOSSES 常見的 r 40、sz 120
            r, sz = dims.get(n, (40, 120) if n.startswith('boss_') else (0.386 * 48, 48))
            al = shadow_alpha(mode, W, H, r, sz / H, H)
        bgs = []
        for base in (GROUND, MID):
            b = np.array(base, float)[None, None, :] * (1 - al[..., None]) + np.array(SCRIM, float)[None, None, :] * al[..., None]
            bgs.append(b)
        d = np.minimum(de00(L, lab(bgs[0])), de00(L, lab(bgs[1])))
        db = d[body]
        px = rgb[body]
        med = np.median(rgb[op], 0).round()  # 中位色＝所有不透明點（含墨線）各通道中位數；跟 AD 表只有 m_hundredpace 差 1 階（偶數個點取中的進位），名單不受影響
        # 中位色：對「中位色所在高度的平均底色」太複雜，照 AD：對 ground／mid（不算陰影）——陰影只影響逐點
        mdl = lab(med)
        dmed = min(float(de00(mdl, gl)), float(de00(mdl, ml)))
        cv = {k: float(de00(lab(cvd(med, k)), lab(cvd(np.array(GROUND, float), k)))) for k in MACH}  # 色盲（Machado 1.0）中位色對 ground
        wi = int(np.argmin(db))
        row = dict(
            n=n, nb=int(body.sum()), med='#%02x%02x%02x' % tuple(int(v) for v in med), L=float(mdl[0]), dmed=dmed,
            cvdw=min(cv.values()), wcag=float(wcag(med, np.array(GROUND, float))), mean=float(db.mean()),
            p15=float((db < 15).mean() * 100), p8=float((db < 8).mean() * 100),
            worst='#%02x%02x%02x' % tuple(int(v) for v in px[wi]), wde=float(db[wi]),
            shadowPct=float((al[body] > 0).mean() * 100),
        )
        row['blend'] = row['dmed'] < 15 or row['mean'] < 15 or row['p15'] > 25
        rows.append(row)
    return rows


if __name__ == '__main__':
    mode = sys.argv[sys.argv.index('--shadow') + 1] if '--shadow' in sys.argv else 'none'
    rows = measure(mode)
    rows.sort(key=lambda r: r['mean'])
    print(f'# shadow={mode}')
    print('name                   nBdy  med     L  ΔEmed  CVDw  WCAG  meanΔEbody  %body<15  %body<8  worstBody        %body在陰影')
    for r in rows:
        print(f"{r['n']:<20} {r['nb']:>6}  {r['med']} {r['L']:5.1f}  {r['dmed']:5.1f}  {r['cvdw']:5.1f}  {r['wcag']:4.2f}  {r['mean']:9.1f}  {r['p15']:7.1f}%  {r['p8']:6.1f}%  {r['worst']} ΔE{r['wde']:.1f}  {r['shadowPct']:5.1f}%")
    bl = [r['n'] for r in rows if r['blend']]
    print(f'\n- sprites with median ΔE<15 or mean body ΔE<15 or >25% body pixels ΔE<15 vs floor: {len(bl)} / {len(rows)}')
    print('  ' + ', '.join(bl))
    ad = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'AD-MEASURE.md'), encoding='utf8').read()
    adl = re.search(r'vs floor: (\d+) / 77\n  (.+)', ad)
    adrow = {m[0]: m for m in re.findall(r'^(\w+)\s+(\d+)\s+#\w+\s+[\d.]+\s+([\d.]+)\s+[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)%', ad, re.M)}
    if mode == 'none':  # AD 原量法：逐隻對 AD 表（nBdy、ΔEmed、meanΔEbody、%body<15）跟名單
        diff = [r['n'] for r in rows if adrow.get(r['n']) and (int(adrow[r['n']][1]) != r['nb'] or abs(float(adrow[r['n']][2]) - r['dmed']) > 0.051 or abs(float(adrow[r['n']][3]) - r['mean']) > 0.051 or abs(float(adrow[r['n']][4]) - r['p15']) > 0.051)]
        print(f'- 跟 AD-MEASURE.md 對照：77 隻都在表裡={len(adrow) == 77 and all(r["n"] in adrow for r in rows)}；判定用的四欄逐隻不同的={diff}；名單相同={set(adl.group(2).split(", ")) == set(bl)}')
    else:
        old = set(adl.group(2).split(', '))
        print(f'- 跟 AD 名單比：新增融進={sorted(set(bl) - old)}；不再融進={sorted(old - set(bl))}')
    if '--json' in sys.argv:
        json.dump(rows, open(sys.argv[sys.argv.index('--json') + 1], 'w'), ensure_ascii=False, indent=1)
