# UIUX art-request-es-token.md 驗證（用 UIUX check_es.py 的 crh() 同一套算法）
import sys, json, numpy as np
exec(open('/workspace/mockups/W-hud-es-mock-1213/src/check_es.py').read().split("err = []")[0].split("import render_es as M")[0])
exec("\n".join(l for l in open('/workspace/mockups/W-hud-es-mock-1213/src/check_es.py').read().split("err = []")[0].splitlines()[8:]))
SETS = {'A': ('#dfbf91', '#fcefde'), 'B': ('#c2b8e5', '#f2effe'), 'C': ('#8cce92', '#def7e6')}
DOC = {'--hp': '#934341', '--panel-inset': '#1d1a17', '--panel': '#25211e', '--block': '#a9b8c3', '--mp': '#3a5b98', '--el-cold': '#ade2f9', '--prog-hi': '#b6b0a8',
       '--rar-normal': '#f1ebdb', '--rar-magic': '#9da7ff', '--rar-rare': '#fbe53a', '--rar-unique': '#fa8915', '--rar-chase': '#0cf6ee', '--tx-strong': '#fbf9f6'}
CSS = {'--hp': '#8a2a2a', '--panel-inset': '#1f1915', '--panel': '#26201b', '--block': '#a9b8c3', '--mp': '#2b4a8a', '--el-cold': '#8fd6ff', '--prog-hi': '#e1a54c',
       '--rar-normal': '#d9cdb4', '--rar-magic': '#7ea7ff', '--rar-rare': '#ffcf5c', '--rar-unique': '#fa8915', '--rar-chase': '#0cf6ee', '--tx-strong': '#f1ebdc'}
MODES = list(CVD)
out = {'method': 'UIUX src/check_es.py 的 Lsim／crh：WCAG 相對亮度 Y；色盲＝Machado 2009 嚴重度 1.0 矩陣乘線性 RGB 後再算 Y', 'sets': {}}
for k, (es, hi) in SETS.items():
    r = {'es': es, 'es_hi': hi, 'Y_es': round(Lrgb(h2(es)), 3), 'Y_es_hi': round(Lrgb(h2(hi)), 3)}
    for pn, P in (('doc', DOC), ('css', CSS)):
        q = {}
        for t in ('--hp', '--panel-inset', '--panel'): q[f'es/{t}'] = [round(crh(es, P[t], m), 2) for m in MODES]
        q['es_hi/es'] = [round(crh(hi, es, m), 2) for m in MODES]
        q['es_hi/--hp'] = [round(crh(hi, P['--hp'], m), 2) for m in MODES]
        for t in ('--block', '--mp', '--el-cold', '--prog-hi', '--rar-normal', '--rar-magic', '--rar-rare', '--rar-unique', '--rar-chase'):
            q[f'es/{t}'] = [round(crh(es, P[t], m), 2) for m in MODES]
        hard = {'es/--hp>=3': min(q['es/--hp']) >= 3, 'es/--panel-inset>=3': min(q['es/--panel-inset']) >= 3, 'es/--panel>=3': min(q['es/--panel']) >= 3,
                'es_hi/es>=1.5': min(q['es_hi/es']) >= 1.5, 'es_hi/--hp>=3': min(q['es_hi/--hp']) >= 3}
        r[pn] = {'ratios（一般,紅,綠,藍黃）': q, 'hard': hard}
    r['Y_in_0.418-0.650'] = 0.418 <= r['Y_es'] <= 0.650
    out['sets'][k] = r
json.dump(out, open('/tmp/es_verify.json', 'w'), ensure_ascii=False, indent=1)
for k, r in out['sets'].items():
    print('==', k, r['es'], r['es_hi'], 'Y', r['Y_es'], r['Y_es_hi'], 'inrange', r['Y_in_0.418-0.650'])
    for pn in ('doc', 'css'):
        print(' ', pn, r[pn]['hard'])
        for kk, v in r[pn]['ratios（一般,紅,綠,藍黃）'].items(): print('    ', kk, v)
