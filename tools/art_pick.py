#!/usr/bin/env python3
"""把 mumi 挑好的素材接進遊戲（M2-33-3a §3.1、§4.1）。每個素材資料夾的 picked.txt 一行一個檔名，換圖只改 picked.txt 再跑這支。

    python3 tools/art_pick.py

- 地磚 art/tiles/<地形>/{floor,walltop,wallface}/ → img/tiles/<地形>-floor[-2…]／-walltop／-wallface-a／-b.<雜湊>.png，網址寫進 js/tiles.js。
- 王印 art/icons/wangyin/<id>/ 的 _32、_16 → 拼成 img/ic_wy32／ic_wy16.<雜湊>.png（順序鎮嶽、赤霄、疾霆、歸墟，間隔 1），網址改 js/art.js 的 ART_SHEET。
- 檔名雜湊跟 img/ 其他圖一樣（md5 前 8 碼），舊雜湊的檔會刪掉。
"""
import hashlib, pathlib, re
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
ART, IMG = ROOT / 'art', ROOT / 'img'
BIOMES = ['temple', 'lava', 'tomb', 'ice']
WY = ['wangyin_zhenyue', 'wangyin_chixiao', 'wangyin_jiting', 'wangyin_guixu']


def picked(d):
    return [d / n for n in (d / 'picked.txt').read_text(encoding='utf-8').split()]


def put(name, data):
    """寫 img/<name>.<雜湊>.png，刪掉同名舊雜湊的檔，回傳網址。"""
    p = IMG / f"{name}.{hashlib.md5(data).hexdigest()[:8]}.png"
    for old in p.parent.glob(pathlib.Path(name).name + '.????????.png'):
        if old != p:
            old.unlink()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)
    return p.relative_to(ROOT).as_posix()


def png(im):
    import io

    b = io.BytesIO()
    im.save(b, 'PNG', optimize=True)
    return b.getvalue()


def tiles():
    rows = []
    for b in BIOMES:
        d = ART / 'tiles' / b
        fl = [put(f'tiles/{b}-floor' + (f'-{i + 1}' if i else ''), f.read_bytes()) for i, f in enumerate(picked(d / 'floor'))]
        top = put(f'tiles/{b}-walltop', picked(d / 'walltop')[0].read_bytes())
        fa = {f.stem[-1]: f for f in picked(d / 'wallface')}
        face = [put(f'tiles/{b}-wallface-{k}', fa[k].read_bytes()) for k in 'ab']
        q = lambda a: '[' + ', '.join(f"'{u}'" for u in a) + ']'
        rows.append(f"  {b}: {{\n    floor: {q(fl)},\n    top: '{top}',\n    face: {q(face)}\n  }}")  # 照 prettier 的排法
    (ROOT / 'js/tiles.js').write_text(
        '/* 自動產生（tools/art_pick.py，照 art/tiles/<地形>/<種類>/picked.txt）；不要手改。地磚 32×32、牆面 32×18，biome.js 的 tileSet 載入 */\n'
        'const TILE_SRC = {\n' + ',\n'.join(rows) + '\n};\n',
        encoding='utf-8',
    )


def wangyin():
    art = (ROOT / 'js/art.js').read_text(encoding='utf-8')
    for n in (32, 16):
        strip = Image.new('RGBA', (4 * n + 3, n))
        for i, k in enumerate(WY):
            f = next(f for f in picked(ART / 'icons/wangyin' / k) if f'_{n}-' in f.name)
            im = Image.open(f).convert('RGBA')
            assert im.size == (n, n), (f, im.size)
            strip.paste(im, (i * (n + 1), 0))
        url = put(f'ic_wy{n}', png(strip))
        art, c = re.subn(rf"^(  ic_wy{n}: )'[^']*'", rf"\1'{url}'", art, flags=re.M)
        assert c == 1, f'js/art.js 的 ART_SHEET 找不到 ic_wy{n}'
    (ROOT / 'js/art.js').write_text(art, encoding='utf-8')


if __name__ == '__main__':
    tiles()
    wangyin()
    print('寫好 img/tiles、img/ic_wy32、img/ic_wy16、js/tiles.js、js/art.js')
