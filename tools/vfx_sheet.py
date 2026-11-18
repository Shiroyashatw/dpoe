#!/usr/bin/env python3
"""招牌特效後處理＋接進遊戲（M2-36 PL §5、M2-33-3a §4.2），不連網、不花生成。

    python3 tools/vfx_sheet.py            # 全部 sig_*：讀原檔、後處理、寫 sheet／gif／img/fx／js/fxsig.js
    python3 tools/vfx_sheet.py test       # 不連網的自我檢查（beam_cap、fade_tail）

- 用哪一張照 art/fx/<id>/picked.txt（沒有就找 dpoe-*.png），json 同檔名。
- main 只放處理後的檔（M2-34 3a）：沒有 art/_raw/fx/<id>/ 時把 art/fx 當成已處理好，不再後處理（重做後處理先從 art/m2-36-assets 分支拿 art/_raw/fx）。

- 原檔（PixelLab /vfx 的 png、gif、json）第一次執行時搬到 art/_raw/fx/<id>/，之後一律從那裡讀，重跑結果一樣。
- 處理後的 sheet、gif 寫回 art/fx/<id>/（gif 墊 --scene-void 底，才看得到半透明淡出），sheet 另存 img/fx/<id>.png。
- beam_cap：sig_chase 每一幀；fade_tail：sig_wyapply 第 8 幀起（幀從 0 數）。
"""
import json, pathlib, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
FX, RAW, IMG, JS = ROOT / 'art/fx', ROOT / 'art/_raw/fx', ROOT / 'img/fx', ROOT / 'js/fxsig.js'
IDS = ['sig_crit', 'sig_lvup', 'sig_beam', 'sig_chase', 'sig_wyapply']
RAD = {'sig_crit': 40, 'sig_lvup': 56, 'sig_beam': 16, 'sig_chase': 64, 'sig_wyapply': 48}  # 3a §4.2；beam、wyapply 不走 fxs 縮放，填半寬
CHASE_HI = (0xFF, 0xBF, 0x73)  # --rar-chase-hi
VOID = (0x0D, 0x0A, 0x07)  # --scene-void
HALF, SEARCH, TAPER = 12, 40, [(3, 64), (2, 128), (1, 191)]  # 柱寬半徑、往下找幾列、最上 3 列（削幾格, alpha）
TAIL, TAIL_A = 8, [191, 128, 64]


def pixels(im):
    return [im.getpixel((x, y)) for y in range(im.height) for x in range(im.width)]


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def beam_cap(im):
    """柱頂改成柱芯那一列的顏色，最上 3 列削尖淡出；中線 ±12 以外（環、火花）不動。"""
    px, w, h = im.load(), im.width, im.height
    xs = range(w // 2 - HALF, w // 2 + HALF + 1)
    rows = [y for y in range(h) if any(px[x, y][3] for x in xs)]
    if not rows:
        return im
    top = rows[0]

    def mean(y):
        op = [px[x, y] for x in xs if px[x, y][3]]
        return sum(map(lum, op)) / len(op) if op else 0

    look = range(top, min(h, top + SEARCH))
    # 到柱芯淡橙；這幀的柱芯有描邊、整列平均到不了時，以這幀最亮那一列為準
    goal = min(lum(CHASE_HI), max(map(mean, look))) - 0.5
    src = next(y for y in look if mean(y) >= goal)
    seg = [px[x, src] for x in xs]
    for y in range(top, src):
        for x, p in zip(xs, seg):
            px[x, y] = p
    for y, (cut, a) in zip(range(top, top + 3), TAPER):
        on = [x for x in xs if px[x, y][3]]
        for x in on:
            px[x, y] = (0, 0, 0, 0) if x < on[0] + cut or x > on[-1] - cut else px[x, y][:3] + (a,)
    return im


def fade_tail(frames):
    """第 8 幀最多的色把外框整塊填滿，第 9–11 幀同一塊 alpha 75%、50%、25%。"""
    f = frames[TAIL]
    cnt = {}
    for p in pixels(f):
        if p[3]:
            cnt[p[:3]] = cnt.get(p[:3], 0) + 1
    col = max(cnt, key=cnt.get)
    mask = Image.new('L', f.size)
    mask.putdata([255 if p[3] and p[:3] == col else 0 for p in pixels(f)])
    box = mask.getbbox()
    out = list(frames[:TAIL])
    for a in [255] + TAIL_A:
        n = Image.new('RGBA', f.size)
        n.paste(col + (a,), box)
        out.append(n)
    return out + frames[TAIL + 1 + len(TAIL_A):]


def process(fid):
    d = FX / fid
    post = fid in ('sig_chase', 'sig_wyapply') and (RAW / fid).exists()
    raw = RAW / fid if post else d  # 沒後處理的只複製進 img/fx，art/fx 不動
    pick = d / 'picked.txt'
    png = raw / pick.read_text(encoding='utf-8').split()[0] if pick.exists() else next(raw.glob('dpoe-*.png'))
    meta = json.loads(png.with_suffix('.json').read_text(encoding='utf-8'))
    sheet = Image.open(png).convert('RGBA')
    fr = [x['frame'] for x in meta['frames']]
    frames = [sheet.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])) for r in fr]
    if post and fid == 'sig_chase':
        frames = [beam_cap(f) for f in frames]
    if post and fid == 'sig_wyapply':
        frames = fade_tail(frames)
    out = Image.new('RGBA', sheet.size)
    for f, r in zip(frames, fr):
        out.paste(f, (r['x'], r['y']))
    IMG.mkdir(parents=True, exist_ok=True)
    out.save(IMG / f'{fid}.png')
    dur = meta['frames'][0]['duration']
    if post:
        out.save(d / png.name)
        bg = [Image.alpha_composite(Image.new('RGBA', f.size, VOID + (255,)), f).convert('RGB') for f in frames]
        bg[0].save(d / png.with_suffix('.gif').name, save_all=True, append_images=bg[1:], duration=dur, loop=0)
    w, h = fr[0]['w'], fr[0]['h']
    a = meta['meta']['anchor']
    return f"  {fid}: {{ w: {w}, h: {h}, n: {len(fr)}, cols: {sheet.width // w}, fps: {round(1000 / dur)}, ox: {a['x']}, oy: {a['y']}, rad: {RAD[fid]} }}"


def main():
    rows = [process(i) for i in IDS]
    JS.write_text(
        '/* 自動產生（tools/vfx_sheet.py，PixelLab /vfx 招牌特效，圖在 img/fx/）；不要手改。欄位同 js/fxsheets.js */\n'
        'Object.assign(FXS, {\n' + ',\n'.join(rows) + '\n});\n',
        encoding='utf-8',
    )
    print('寫好', ', '.join(IDS), '→ art/fx、img/fx、js/fxsig.js')


def self_test():
    """合成圖測 beam_cap、fade_tail；有處理後的檔就連實際輸出一起驗。"""
    # 柱：中線 ±5，頂 3 列深棕、再 3 列橙、下面淡橙；柱外 30 欄一顆火花
    im = Image.new('RGBA', (64, 64))
    for y in range(10, 50):
        c = (0x7A, 0x3A, 0x0A) if y < 13 else (0xF6, 0x96, 0x25) if y < 16 else CHASE_HI
        for x in range(27, 38):
            im.putpixel((x, y), c + (255,))
    im.putpixel((2, 11), (255, 255, 255, 255))
    beam_cap(im)
    span = lambda y: [x for x in range(64) if x > 10 and im.getpixel((x, y))[3]]
    assert im.getpixel((2, 11)) == (255, 255, 255, 255), '火花被動到'
    assert [len(span(y)) for y in (10, 11, 12, 13)] == [5, 7, 9, 11], [len(span(y)) for y in range(10, 14)]
    assert [im.getpixel((32, y))[3] for y in (10, 11, 12, 13)] == [64, 128, 191, 255]
    assert all(im.getpixel((x, y))[:3] == CHASE_HI for y in range(10, 50) for x in span(y)), '柱頂還有深色'
    # 結尾：第 8 幀有洞的方塊＋一點別的色
    fr = [Image.new('RGBA', (32, 32)) for _ in range(12)]
    for x in range(8, 20):
        for y in range(6, 18):
            if (x + y) % 5:
                fr[8].putpixel((x, y), (0xF6, 0x96, 0x25, 255))
    fr[8].putpixel((25, 25), (1, 2, 3, 255))
    fr[3].putpixel((0, 0), (9, 9, 9, 255))
    out = fade_tail(fr)
    assert len(out) == 12 and out[3].getpixel((0, 0)) == (9, 9, 9, 255)
    for i, a in zip(range(8, 12), [255, 191, 128, 64]):
        assert set(pixels(out[i])) == {(0, 0, 0, 0), (0xF6, 0x96, 0x25, a)}, i
        assert out[i].getbbox() == (8, 6, 20, 18), out[i].getbbox()
    # 實際輸出（跑過 vfx_sheet.py 才有）
    if (RAW / 'sig_wyapply').exists():
        meta = json.loads(next((RAW / 'sig_wyapply').glob('dpoe-*.json')).read_text(encoding='utf-8'))
        sh = Image.open(FX / 'sig_wyapply/dpoe-sig-wyapply.png').convert('RGBA')
        tail = [sh.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])) for r in (x['frame'] for x in meta['frames'][8:])]
        cols = [set(p for p in pixels(t) if p[3]) for t in tail]
        assert [len(c) for c in cols] == [1] * 4 and [c.pop()[3] for c in cols] == [255, 191, 128, 64], '結尾不是單色整塊'
        bb = tail[0].getbbox()
        assert all(t.getbbox() == bb for t in tail) and sum(1 for p in pixels(tail[0]) if p[3]) == (bb[2] - bb[0]) * (bb[3] - bb[1]), '結尾有洞'
        assert 'sig_chase' in JS.read_text(encoding='utf-8') and (IMG / 'sig_chase.png').exists()
    return '後處理檢查通過：beam_cap、fade_tail'


if __name__ == '__main__':
    print(self_test()) if sys.argv[1:] == ['test'] else main()
