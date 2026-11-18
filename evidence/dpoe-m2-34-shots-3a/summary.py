"""由 prefilter.csv、measure.csv、manifest.json 產 summary.md（流程 §8 留言完整版）與 PR 留言 comment.md。
用法：python3 -I evidence/dpoe-m2-34-shots-3a/summary.py <分支> <HEAD sha>"""
import csv, json, os, sys

OUT = os.path.dirname(os.path.abspath(__file__))
BR, SHA = sys.argv[1], sys.argv[2]
BASE = f'https://github.com/Shiroyashatw/dpoe/blob/{BR}/evidence/dpoe-m2-34-shots-3a/'
lines = open(os.path.join(OUT, 'prefilter.csv')).read().splitlines()
head = lines[0].lstrip('# ')
P = list(csv.DictReader(lines[1:]))
M = list(csv.DictReader(open(os.path.join(OUT, 'measure.csv'))))
man = json.load(open(os.path.join(OUT, 'manifest.json')))
ICON = {'pass': '✅過', 'fail': '❌不過', 'blocked': '⛔卡住', 'n/a': 'n/a', '缺': '缺'}
NAME = {
    'S-1': '怪物地面框、自己的地面、目前敵人圈、主角描邊', 'S-2': '火焰放滿', 'S-3': 'CX 圖層順序（只有數字）', 'Z3-5': 'CX 呼叫記錄＝圖層表（S-3）',
    'S-4': '營地場景', 'S-5': '營地總覽', 'S-6': '設施升級演出', 'Z3-3': 'diff 沒有色碼（3a 部分）',
    'Q3-1': '新舊對照 combat－auto', 'Q3-2': '新舊對照 camp－overview',
    'E-1': '3a §5-1 四種地形 idle（含 §3.2 地磚格／接縫）', 'E-1n': '四種地形 night（拍前驗 G.night>G.t）', 'E-3': '3a §3.2-3 刪磚退回',
    'E-4': '3a §5-4 招牌特效有圖／沒圖各 2 秒影片', 'E-5': '3a §5-3 王印圖示整數倍',
}


def link(f):
    return f'[{os.path.basename(f) or f}]({BASE}{f})' if f else ''


def mrow(f):
    for m in M:
        if m['file'] == f:
            return m
    return None


out = [f"## dpoe-m2-34-shots-3a 視覺審查證據（遊戲 commit {man['game_commit'][:7]}，{man['run_at_taipei']} 台北時間）",
       f"清單：docs/production/specs/M2-34-review-checklist.md §3「3a」@ {man['checklist_commit']}＋ M2-33-3a §5 驗收。{head}", '',
       '| ID | 名稱 | 畫面－狀態 | 尺寸 | 輪 | 結果 | 證據 | 重點數字／原因 |', '| --- | --- | --- | --- | --- | --- | --- | --- |']
for p in P:
    m = mrow(p['file'])
    keys = ''
    if m and m['a_scene_l']:
        keys = f"a 場景 {m['a_scene_l']}／面板 {m['a_panel_l'] or '—'}；b {m['b_panel_scene'] or '—'}；c {m['c_sat_pct']}%；d {m['d_brown_pct']}%；e {m['e_text_min']}–{m['e_text_max']} 不合格 {m['e_text_fail']}、字色 {m['e_ui_colors']}；f {m['f_bright_pct']}%"
    reason = p['reason'].replace('|', '／')
    out.append(f"| {p['id']} | {NAME.get(p['id'], '')} | {p['screen']}－{p['state']} | {p['viewport']} | {p['round']} | {ICON.get(p['verdict'], p['verdict'])}{' ★' if p['star'] else ''} | {link(p['file'])} | {(keys + '。' if keys else '') + reason[:400]} |")
open(os.path.join(OUT, 'summary.md'), 'w').write('\n'.join(out) + '\n')
print(len(P))
