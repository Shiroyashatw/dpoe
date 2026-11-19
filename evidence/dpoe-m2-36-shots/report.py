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
ORD = ['T-1', 'T-2', 'T-3', 'T-4', 'T-5', 'T-6', 'C-1', 'C-2', 'C-3', 'C-4', 'A-1', 'W-1', 'W-2', 'W-3', 'W-4', 'W-5', 'W-6', 'W-7', 'W-8', 'W-9', 'X-1', 'X-2', 'X-3', 'X-4', 'X-5', 'X-6', 'X-7', 'X-8', 'N-1', 'N-2', 'N-3', 'B-1', 'B-2', 'B-3', 'G-1', 'G-2', 'G-3', 'G-4', 'G-5', 'K-1', 'Q-1', 'Q-2', 'Q-3']
BO = ['temple', 'lava', 'tomb', 'ice']
def okey(k):
    b = k if k == 'W-9' else '-'.join(k.split('-')[:2])
    t = k.split('-')[2] if k.count('-') >= 2 else ''
    return (ORD.index(b) if b in ORD else 99, BO.index(t) if t in BO else -1)
groups = collections.OrderedDict()
for p in sorted(PF, key=lambda p: okey(p['id'])):
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
C += ['', '**沒量到／要注意（照實寫）**',
      '- PF5 只量了圖示整數倍與熱區；「token 解析、沒有色碼」與「焦點框」這輪沒做（缺：要另寫 getComputedStyle 對照 :root 與 Tab 巡一輪的腳本）。',
      '- PF4 色票偏移是對 palette-tokens 場景四色（-ground／-mid／-light／-edge）量，地磚若用了 detail 色會算偏移；地磚自己的接縫在 A-1、螢幕上的接縫在 C-1–C-3。C-2 牆頂：這張地圖牆只有一格厚，取 L 形轉角（三格牆＋一格地板），只量牆接牆兩條縫。',
      '- W-1：王印收在碎片（S.frags），戰利品格子裡本來就沒有王印 → 驗狀態不成立，照樣截圖。W-2／W-4／W-7：畫面上沒有 16／32 王印圖示（說明框那一行、掉落紀錄列、王倒下卡都沒有接圖示）。',
      '- X-3 unique：:root 沒有 `--rar-unique`／`--rar-unique-rgb`，beam_de 量不到；rare 的 `--rar-rare`（#ffcf5c）跟 `--rar-rare-rgb`（255,209,102＝#ffd166）不是同一個值，柱芯照 -rgb 上色。',
      '- X-6 減少動態：sig_crit 在 reduce 下仍照序列播（t 走到 0.3 秒、圖形逐幀變），不是 120 ms 單幀；總覽圖 1280x720/fx-crit-rm-sheet.png。',
      '- B-1 hp5：生命 5% 沒有吐司（遊戲裡沒有生命低的吐司）。B-2 mphot：#bmp 有 box-shadow 0 0 8px 外發光。',
      '- T-6：一般格 bStatic 都 < 0.06 ms（跟舊畫法差在量測雜訊內）；冷烘（清快取）lava／tomb／ice 有地磚比舊畫法慢約 10%（2.5–2.8 ms 對 2.4 ms），temple 快。數字在 measure.csv。',
      '- 除錯掛鉤問題（清單外，給工程）：`DBG.step` 每 33 ms 直接呼叫 pump，而 pump 又排一個 raf(pump)，step 過後同時有 N 條 pump 鏈，每個真實畫格主迴圈跑 N 次（解除凍結後遊戲 N 倍速）。這輪在 shots.js 裡去重處理，沒改遊戲碼。',
      '- 影片：Playwright recordVideo 要的 ffmpeg 版本這台沒有，改用 CDP screencast 收幀＋系統 ffmpeg（真實時間 30 fps）。只錄 temple（清單 ★）與 X-8、K-1 捲動。',
      '- 新舊對照：main 已含 M2-36 素材，左邊改用「擋掉牆頂磚／拿掉 FXS.sig_*」的舊畫法。',
      '- 證據大小約 103 MB，超過流程的 80 MB：靜態圖約 65 MB 不能砍；連拍逐幀沒提交（只留總覽與 temple 最大幀，同種子可重現）。',
      '- 375×667 只截清單「加截 S」的列（T-1、T-4、N-1、K-1）。']
(HERE / 'comment.md').write_text('\n'.join(C) + '\n', encoding='utf-8')
print(len('\n'.join(C)), 'chars comment;', cnt)
