"""battle-hud v1.3.3 §13 疊圖：把 W1_battle-{state}_{size}_overlay.png 以 100%、左上 (0,0) 疊到實機截圖上，並把量測寫成差表。
用法：python3 tools/bh_overlay.py [資料夾]（預設 docs/production/evidence/battle-hud-v133；先跑 node tools/bh_shots.js）
輸出：overlay_{state}_{size}.png、REPORT.md"""
import io
import json
import subprocess
import re
import os
import sys

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs/production/evidence/battle-hud-v133')
WF = 'docs/production/specs/wireframes/W1-battle-hud'
# 依據的規格版本：預設 v1.3.3 的 59b6350（交辦依據），BH_SPEC_REV 可換
REV = os.environ.get('BH_SPEC_REV', '59b6350')
def wf(name):
    return Image.open(io.BytesIO(subprocess.check_output(['git', 'show', f'{REV}:{WF}/{name}'], cwd=ROOT)))
STATES = ['normal', 'boss', 'lowhp', 'lootflood', 'collapsed']
SIZES = ['390x844', '1280x720']

lines = ['# battle-hud v1.3.3 疊圖驗收（tools/bh_shots.js＋tools/bh_overlay.py）', '',
         '截圖 DPR 1、同 CSS 視窗；疊圖＝`W1_battle-{state}_{size}_overlay.png` 100%、左上 (0,0)。',
         '差＝實機框四邊減規格框（左、上、右、下，px）；熱區差同理；容差 ±2。字＝computed font-size/weight；色＝computed color。', '']
tot = bad = 0
fbad = []
for size in SIZES:
    for st in STATES:
        shot = os.path.join(OUT, f'{st}_{size}.png')
        if not os.path.exists(shot):
            continue
        a = Image.open(shot).convert('RGBA')
        b = wf(f'W1_battle-{st}_{size}_overlay.png').convert('RGBA')
        assert a.size == b.size, (shot, a.size, b.size)
        Image.alpha_composite(a, b).save(os.path.join(OUT, f'overlay_{st}_{size}.png'))
        m = json.load(open(os.path.join(OUT, f'measure_{st}_{size}.json')))
        rep = m['rep']
        nb = [r for r in rep if not r['ok']]
        tot += len(rep)
        bad += len(nb)
        lines += [f'## {st} {size}：{len(rep) - len(nb)}／{len(rep)} 項在 ±2 px 內', '',
                  f'原圖 `{st}_{size}.png`、疊圖 `overlay_{st}_{size}.png`、量測 `measure_{st}_{size}.json`' +
                  (f'；頁面錯誤：{"／".join(m["errs"])}' if m['errs'] else ''), '',
                  '| id | 名稱 | 規格 x,y,w,h | 實機 x,y,w,h | 四邊差 | 熱區（規格） | 熱區差 | 字（規格） | 字（實機） | 色（實機） | 結果 |',
                  '|---|---|---|---|---|---|---|---|---|---|---|']
        for r in rep:
            got = ','.join(f'{v:g}' for v in r['got']) if r['got'] else '—'
            # 四邊差寫到小數 2 位（量測本身是小數；容差判定照 bh_shots.js 四捨五入後 ±2）
            dd = r['d']
            if r['got'] and r['spec'][2]:
                g, e = r['got'], r['spec']
                dd = [g[0] - e[0], g[1] - e[1], g[0] + g[2] - e[0] - e[2], g[1] + g[3] - e[1] - e[3]]
                dd = [f'{v:+.2f}'.rstrip('0').rstrip('.') if abs(v) > 0.004 else '0' for v in dd]
            res = '✅' if r['ok'] else ('❌ 沒有' if r['miss'] else ('❌ 沒畫' if not r['vis'] else '❌'))
            fnt = f"{r['fs'] or ''}/{r['fw'] or ''}" if r.get('fs') else '—'
            # 字級字重：規格寫「14/700」才比；「+k 14/700」只管 +k 那格（另由 check.js 驗），這裡不比
            mm = re.match(r'^(?:數字 )?(\d+)/(\d+)', r['f'] or '')
            if mm and r.get('fs'):
                fok = r['fs'] == mm.group(1) + 'px' and str(r['fw']) == mm.group(2)
                fnt += '' if fok else ' ⚠'
                fbad.append(f"{st} {size} {r['id']}") if not fok else None
            if r.get('kbd'):
                fnt += f"；鍵帽 {r['kbd']}"
            lines.append(f"| {r['id']} | {r['n'][:24]} | {','.join(map(str, r['spec']))} | {got} | {','.join(map(str, dd))} | "
                         f"{r['hit'] or '—'} | {','.join(map(str, r['hd'])) if r['hd'] else '—'} | {r['f']} | {fnt} | {r.get('col') or '—'} | {res} |")
        lines.append('')
sha = json.load(open(os.path.join(OUT, 'measure_normal_390x844.json'))).get('sha', '?')
lines.insert(3, f'產生時的 commit：`{sha}`（每個 measure_*.json 檔頭 `sha` 欄也有）；規格表與疊圖讀自 `{REV}`（battle-hud v1.3.3，交辦依據）。')
lines.insert(4, '')
lines.insert(4, f'**合計 {tot - bad}／{tot} 項在 ±2 px 內；不符 {bad} 項。**')
lines.insert(5, f'**字級／字重（規格寫明 px/weight 的項）：不符 {len(fbad)} 項**' + (f'：{"、".join(fbad)}' if fbad else '') + '（⚠ 標在表上）')
lines.insert(6, '')
tk = os.path.join(OUT, 'TOKENS.md')
if os.path.exists(tk):
    lines += ['', open(tk).read()]
open(os.path.join(OUT, 'REPORT.md'), 'w').write('\n'.join(lines) + '\n')
print(f'{tot - bad}/{tot}，不符 {bad}；字級字重不符 {len(fbad)}：{fbad}')
