#!/usr/bin/env python3
"""讀 prefilter.json 寫 summary.md（visual-review-protocol §8 的完整版）與 comment.md（PR 結束留言）。
用法：python3 -I evidence/dpoe-m2-36-shots/report.py <分支> <HEAD sha> <有沒有推送>"""
import json, pathlib, sys, collections, datetime

HERE = pathlib.Path(__file__).resolve().parent
br, sha, pushed = (sys.argv + ['', '', ''])[1:4]
BLOB = f'https://github.com/Shiroyashatw/dpoe/blob/{br}/evidence/dpoe-m2-36-shots/'
d = json.loads((HERE / 'prefilter.json').read_text())
PF = d['pf']

NAME = {
    'T-1': '地磚 idle', 'T-2': '天黑 night', 'T-3': '大霧 fog', 'T-4': '火焰放滿 fire', 'T-5': '缺磚退回 fallback', 'T-6': 'bStatic 效能',
    'C-1': '特寫 地板接縫', 'C-2': '特寫 牆頂接縫', 'C-3': '特寫 牆面接縫', 'C-4': '特寫 暗處地板', 'A-1': '地磚素材 2×2',
    'W-1': '王印 戰利品格子', 'W-2': '王印 16 說明框那一行', 'W-3': '王印 本身說明框', 'W-4': '王印 掉落紀錄', 'W-5': '追逐物品面板',
    'W-6': '追逐橫幅', 'W-7': '王倒下卡', 'W-8': '離線摘要', 'W-9': '王印素材灰階',
    'X-1': '特效 sig_crit', 'X-2': '特效 sig_lvup', 'X-3': '光柱 sig_beam', 'X-4': '特效 sig_chase', 'X-5': '特效 sig_wyapply',
    'X-6': '減少動態', 'X-7': '戰鬥 5 秒飽和', 'X-8': '特效退回',
    'N-1': '跳數字 九種', 'N-2': '跳數字 火焰 10 秒重疊', 'N-3': '跳數字 遠處／天黑',
    'B-1': 'HUD 生命條', 'B-2': 'HUD 魔力條', 'B-3': 'HUD 王血條',
    'G-1': '戰利品面板蓋場景', 'G-2': '鍛造兩欄（桌機）', 'G-3': '回藏身處對話框', 'G-4': '物品說明框蓋場景', 'G-5': '營地',
    'K-1': '鍛造黏底動作列', 'Q-1': '新舊對照 戰鬥', 'Q-2': '新舊對照 戰利品', 'Q-3': '新舊對照 sig_chase',
}
ICON = {'pass': '✅', 'fail': '❌', 'blocked': '⛔', 'n/a': '—'}
cnt = collections.Counter(p['verdict'] for p in PF)
groups = collections.OrderedDict()
for p in PF:
    groups.setdefault(p['id'], []).append(p)


def gv(L):
    vs = {p['verdict'] for p in L}
    if 'fail' in vs:
        return '不過'
    if 'blocked' in vs:
        return '缺' if vs == {'blocked'} else '不過（部分缺）'
    if vs == {'n/a'}:
        return 'n/a'
    return '過'


def link(p):
    return f"[{p['viewport']} {p['state']}]({BLOB}{p['file']})" if p['file'] else f"{p['viewport']} {p['state']}"


now = (datetime.datetime.utcnow() + datetime.timedelta(hours=8)).strftime('%Y-%m-%d %H:%M')
S = [f'## m2-36 視覺審查證據（commit {sha}，{now} 台北時間）',
     f'清單：docs/production/specs/M2-36-review-checklist.md；展開後共 {len(PF)} 列（清單列 × 尺寸）：過 {cnt["pass"]}、沒過 {cnt["fail"]}、卡住 {cnt["blocked"]}、n/a {cnt["n/a"]}', '',
     '| ID | 名稱 | 結果 | 各尺寸／狀態 |', '| --- | --- | --- | --- |']
for k, L in groups.items():
    base = k if k[:3] in ('W-9',) else '-'.join(k.split('-')[:2])
    cells = ' · '.join(f"{ICON.get(p['verdict'], '?')} {link(p)}" for p in L)
    S.append(f"| {k} | {NAME.get(base, '')} | {gv(L)} | {cells} |")
S += ['', '### 沒過（項目、數值、門檻）']
for p in PF:
    if p['verdict'] == 'fail':
        S.append(f"- {p['id']} {p['viewport']} {p['screen']}－{p['state']}：{p['why']}")
S += ['', '### 卡住／缺（原因）']
for p in PF:
    if p['verdict'] in ('blocked', 'n/a'):
        S.append(f"- {p['id']} {p['viewport']} {p['screen']}－{p['state']}（{p['verdict']}）：{p['why']}")
S += ['', '### 給美術總監看（★、兩個尺寸都過預篩）']
star = collections.OrderedDict()
for p in PF:
    if p['star']:
        star.setdefault((p['id'], p['state']), []).append(p)
for (k, st), L in star.items():
    if all(p['verdict'] == 'pass' for p in L) and len(L) >= 2 or (L and L[0]['viewport'] == 'assets' and L[0]['verdict'] == 'pass'):
        S.append(f"- {k} {st}：" + ' · '.join(link(p) for p in L))
(HERE / 'summary.md').write_text('\n'.join(S) + '\n', encoding='utf-8')

# 結束留言（逐條一行）
C = ['Grok 請求：dpoe-m2-36-shots 結束', '',
     f'分支 `{br}`，HEAD `{sha}`，推送：{pushed}。完整表格、每一格連結：[summary.md]({BLOB}summary.md)；量測 [measure.csv]({BLOB}measure.csv)、預篩 [prefilter.csv]({BLOB}prefilter.csv)。', '',
     f'**預篩彙總**：展開後 {len(PF)} 列：過 {cnt["pass"]}、不過 {cnt["fail"]}、缺／卡住 {cnt["blocked"]}、n/a {cnt["n/a"]}。', '',
     '**清單逐條**（條目／名稱：結果，證據）']
for k, L in groups.items():
    base = k if k == 'W-9' else '-'.join(k.split('-')[:2])
    rep = next((p for p in L if p['file']), None)
    why = ''
    if gv(L) != '過':
        bad = next((p for p in L if p['verdict'] in ('fail', 'blocked', 'n/a')), None)
        why = f"（{bad['viewport']} {bad['state']}：{bad['why'][:110]}）" if bad else ''
    C.append(f"- {k} {NAME.get(base, '')}：{gv(L)}{why}" + (f" — {BLOB}{rep['file']}" if rep else ''))
(HERE / 'comment.md').write_text('\n'.join(C) + '\n', encoding='utf-8')
print(len('\n'.join(C)), 'chars comment;', cnt)
