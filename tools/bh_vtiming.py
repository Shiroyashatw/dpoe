"""battle-hud 影片時序：讀 tools/bh_video.js 每格記下的 HUD 狀態（{clip}_{W}x{H}.json），列出每個動作的起迄幀與毫秒，寫成 TIMING.md。
用法：python3 tools/bh_vtiming.py [影片資料夾]（預設 docs/production/evidence/battle-hud-v133-fix2/video）
影片是 60 fps 原生（每格＝1000/60 ms 遊戲時間），幀號 f 的時間＝f×1000/60 ms，跟畫面燒入的「F nnnn  t ms」一樣。"""
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs/production/evidence/battle-hud-v133-fix2/video')
FMS = 1000 / 60
SIZES = ['390x844', '1280x720']


def load(clip, size):
    p = os.path.join(DIR, f'{clip}_{size}.json')
    return json.load(open(p)) if os.path.exists(p) else None


def runs(L, key, pred):
    """連續成立的區間：[(起幀, 迄幀)]，迄幀＝最後一格成立的下一格（動作在那一格已經結束）"""
    out, s = [], None
    for r in L:
        if pred(r[key]) and s is None:
            s = r['f']
        elif not pred(r[key]) and s is not None:
            out.append((s, r['f']))
            s = None
    if s is not None:
        out.append((s, L[-1]['f'] + 1))
    return out


def ms(f):
    return f'{f * FMS:.1f}'


lines = ['# battle-hud 影片時序（tools/bh_video.js＋tools/bh_vtiming.py）', '',
         '每支都是原生 60 fps（ffprobe r_frame_rate＝60/1）：凍結虛擬時鐘，每格推 1000/60 ms 再截圖，ffmpeg `-framerate 60` 直接編碼，沒有 fps／scale 濾鏡。',
         '畫面右側燒入「F 幀號  毫秒」；下表的幀號、毫秒就是那個數字。1 格＝16.7 ms，所以 40 ms、120 ms、200 ms 的量測誤差是 ±1 格（±16.7 ms）。', '']
for size in SIZES:
    lines += [f'## {size}', '']
    L = load('reload', size)
    if L:
        st = next(r['f'] for r in L if r['rl'] == '裝填')
        fill = []
        prev = 0
        for r in L:
            if r['f'] > st and r['lit'] > prev:
                fill.append(r['f'])
            prev = r['lit'] if r['f'] > st else prev
        gaps = [f'{(b - a) * FMS:.1f}' for a, b in zip(fill, fill[1:])]
        lines += [f'- **裝填**（reload_{size}.mp4）：打完第 3 發、裝填開始 F{st}（{ms(st)} ms）；彈匣格逐格亮回 F{"、F".join(map(str, fill))}'
                  f'（{"／".join(ms(f) for f in fill)} ms）；相鄰間隔 {"／".join(gaps)} ms（規格每格 40 ms）。'
                  f'第 1 格到第 6 格 {(fill[-1] - fill[0]) * FMS:.1f} ms（5 段×40＝200）。']
    L = load('charge', size)
    if L:
        seg = []
        for a, b in zip(L, L[1:]):
            if b['stg'] > a['stg'] and a['stg'] >= 0:
                seg.append((b['f'], b['stg'], b['auto']))
        # 按下（useSlot）在兩格之間：那一格畫面還沒蓄，下一格已經推了 1/60 秒，所以起點記在「第一格有蓄力」的前一格
        st0 = [r['f'] - 1 for a, r in zip(L, L[1:]) if a['stg'] < 0 <= r['stg']]
        full = runs(L, 'full', bool)
        rel = [(r['f'], x) for r in L for x in r['rel']]
        lines.append(f'- **蓄力**（charge_{size}.mp4）：按下開始蓄力 F{"、F".join(map(str, st0))}；每升一段：' +
                     '、'.join(f'F{f}（{ms(f)} ms，{s}/3，{"自動" if au else "手動"}）' for f, s, au in seg) + '。')
        for f0 in st0:
            ss = [f for f, s, au in seg if f > f0][:3]
            if len(ss) == 3:
                lines.append(f'  - F{f0} 起：1／2／3 段在開始後 {"／".join(f"{(f - f0) * FMS:.1f}" for f in ss)} ms（規格每段 0.4 s：400／800／1200）。')
        lines.append('  - 蓄滿外框：' + ('、'.join(f'F{a}–F{b}（{ms(a)}–{ms(b)} ms，{(b - a) * FMS:.1f} ms）' for a, b in full) or '沒有') + '（規格 120 ms）。')
        lines.append('  - 放開出手（記錄當下段數）：' + ('、'.join(f'F{f} {x["stg"]}/{x["max"]}（{"自動" if x["auto"] else "手動"}）' for f, x in rel) or '沒有') + '。')
        au = [x for f, x in rel if x['auto']]
        lines.append(f'  - 自動出手 {len(au)} 次，' + ('全部 3/3。' if au and all(x['stg'] == x['max'] == 3 for x in au) else '❌ 有不是 3/3 的。'))
    L = load('collapse', size)
    if L:
        mv = []
        for a, b in zip(L, L[1:]):
            if b['pid'] != a['pid'] or b['hmin'] != a['hmin']:
                mv.append(b['f'])
        grp = []
        for f in mv:
            if grp and f - grp[-1][1] <= 2:
                grp[-1][1] = f
            else:
                grp.append([f, f])
        desc = []
        for a, b in grp:
            r0 = next(r for r in L if r['f'] == a - 1)
            r1 = next(r for r in L if r['f'] == b)
            desc.append(f'F{a - 1}→F{b}（{ms(a - 1)}–{ms(b)} ms，{(b - a + 1) * FMS:.1f} ms；面板上緣 {r0["pid"]}→{r1["pid"]}，{"收起" if r1["hmin"] else "展開"}）')
        lines.append(f'- **收起／展開**（collapse_{size}.mp4）：' + '；'.join(desc) + '（規格 200 ms ease-out；最後一格是動畫結束、版面一次換成收起／一般）。')
    L = load('slidein', size)
    if L:
        sl = runs(L, 'slx', lambda v: v > 0.05)
        lines.append(f'- **掉寶滑入**（slidein_{size}.mp4，收起列最近一筆）：' +
                     '、'.join(f'F{a - 1}→F{b}（{ms(a - 1)}–{ms(b)} ms，{(b - a + 1) * FMS:.1f} ms）' for a, b in sl) + '（規格 200 ms，從右滑入後停住）。')
    lines.append('')
open(os.path.join(DIR, 'TIMING.md'), 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
