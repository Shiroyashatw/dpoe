/* 前 30 分鐘節奏表 v2：讀 camp/<前綴>_*.json（camp_run_v2.js 的輸出），每個尺寸：
   (1) 解鎖時間表：每場的秒數（分）、平均、§2 目標分、M2-21 目標窗、差多少
   (2) 逐分鐘表（1–60，各場平均）：靈魂收入／花費／庫存、木、生鐵庫存／產量／用量、該分鐘新東西數、小變強數
   (3) 指標：首輪、30／60 分新東西、前 15 分小變強次數與最大間隔
   用法：node pacing_table.js 前綴 run1,run2,... > 輸出.md；--csv 目錄 另外寫 CSV */
const fs = require('fs');
const [pre, runsArg] = process.argv.slice(2);
const csvDir = (process.argv.find(x => x.startsWith('--csv=')) || '').slice(6);
const runs = runsArg.split(',');
/* §2 目標（docs/工坊與解鎖表.md 第 2 節「目標節奏」表）＋ M1-21/M1-28 的驗收窗（瞭望台 8–12；其他＝550 版同收入同尺寸 +4，81–119／分那一欄） */
const TGT = {
  '民房 Lv1': [5], '鍛造台 Lv1': [6], '礦場 Lv10 里程碑': [8], '瞭望台 Lv1': [10, '8–12（單場 6–14）'], '民房 Lv2': [11, '≤17.4 桌機／≤15.6 直立'],
  '鍛造台 Lv2': [12, '≤14.6 桌機／≤13.4 直立'], '祭壇 Lv1': [14, '≤10.8'], '瞭望台 Lv2': [18], '礦場 Lv25 里程碑': [20], '斥候營 Lv1': [22], '鍛造台 Lv3': [25, '≤22.2 桌機／≤19.9 直立'],
  '祭壇 Lv2': [30], '林場 Lv25 里程碑': [30], '鍛造台 Lv4': [34, '本報告提案：24–36（單場 ≤39）'], '民房 Lv3': [34], '鍛造台 Lv5': [38], '倉房 Lv1': [42], '鍛造台 Lv6': [46], '礦場 Lv50 里程碑': [50], '祭壇 Lv3': [50],
  '瞭望台 Lv4': [55], '斥候營 Lv2': [60], '林場 Lv5 里程碑': [3], '林場 Lv10 里程碑': [null], '礦場 Lv5 里程碑': [null], '瞭望台 Lv3': [null]
};
const J = runs.map(r => JSON.parse(fs.readFileSync(`camp/${pre}_${r}.json`)));
const evs = J.map(j => {
  const o = {};
  j.rows.forEach(r => r.ev.forEach(e => {
    const m = e.match(/^([\d.]+) (.+?)(：|$)/);
    if (!m || /換上/.test(e)) return;
    const k = m[2].replace(/ 里程碑$/, ' 里程碑');
    if (!(k in o)) o[k] = +m[1] / 60;
  }));
  return o;
});
const keys = [...new Set(evs.flatMap(o => Object.keys(o)))].sort((a, b) => Math.min(...evs.map(o => o[a] ?? 1e9)) - Math.min(...evs.map(o => o[b] ?? 1e9)));
const f1 = x => (x == null ? '—' : x.toFixed(1));
const L = [];
L.push(`### ${pre}（${J[0].vw}×${J[0].vh}，${runs.length} 場：${runs.join('、')}）`, '');
L.push('| 指標 | ' + runs.join(' | ') + ' |', '|---|' + runs.map(() => '---|').join(''));
const spm = j => Math.round(j.rows[Math.min(29, j.rows.length - 1)].soul / 1); // placeholder
L.push('| 首輪完成（分:秒） | ' + J.map(j => `${Math.floor(j.r1 / 60000)}:${String(Math.round((j.r1 % 60000) / 1000)).padStart(2, '0')}`).join(' | ') + ' |');
L.push('| 新東西 30 分／60 分 | ' + J.map(j => `${j.news30}／${j.news60}`).join(' | ') + ' |');
L.push('| 前 15 分小變強次數 | ' + J.map(j => j.up15).join(' | ') + ' |');
L.push('| 前 15 分最大間隔（秒） | ' + J.map(j => j.gapMax15).join(' | ') + ' |');
L.push('| 前 15 分每分鐘次數 | ' + J.map(j => j.per.join(' ')).join(' | ') + ' |');
L.push('| AI 卡住 | ' + J.map(j => (j.stuckFrom ? `第 ${j.stuckFrom} 分起（無效）` : '沒有')).join(' | ') + ' |', '');
L.push('| 解鎖 | §2 目標分 | 驗收窗 | ' + runs.map(r => r + '（分）').join(' | ') + ' | 平均 | 比 §2 |', '|---|---|---|' + runs.map(() => '---|').join('') + '---|---|');
for (const k of keys) {
  const v = evs.map(o => o[k]), ok = v.filter(x => x != null), avg = ok.length === v.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
  const t = (TGT[k] || [null])[0];
  L.push(`| ${k} | ${t ?? '—'} | ${(TGT[k] || [])[1] || ''} | ${v.map(f1).join(' | ')} | ${avg == null ? (ok.length ? `（${ok.length}/${v.length} 場有）` : '—') : f1(avg)} | ${avg != null && t != null ? (avg - t >= 0 ? '+' : '') + (avg - t).toFixed(1) : ''} |`);
}
console.log(L.join('\n'));
if (csvDir) {
  /* 逐分鐘（各場平均）＋每場一份 */
  const rd = r => fs.readFileSync(`camp/${pre}_${r}.csv`, 'utf8').trim().split('\n').map(l => l.match(/("[^"]*"|[^,]+|(?<=,)(?=,)|^(?=,))/g));
  const T = runs.map(rd), H = T[0][0];
  const want = ['分', '靈魂收入', '靈魂花費', '靈魂庫存', '分解靈魂', '木庫存', '木產量', '木用量_營地', '木用量_產生器', 'iron:1庫存', 'iron:1產量', 'iron:1用量_營地', 'iron:1用量_產生器', 'iron:1淨用量_打造', 'iron:2庫存', 'hide:1庫存'];
  const idx = want.map(w => H.indexOf(w));
  const n = Math.min(...T.map(t => t.length - 1));
  const O = [[...want, '新東西(該分鐘,平均)', '小變強(該分鐘,平均)', '輪數累計(平均)'].join(',')];
  for (let i = 1; i <= n; i++) {
    const row = idx.map((x, c) => (c === 0 ? i : Math.round(T.reduce((a, t) => a + +t[i][x], 0) / T.length)));
    const nw = J.reduce((a, j) => a + j.rows[i - 1].ev.filter(e => !/換上/.test(e)).length, 0) / J.length;
    const up = J.reduce((a, j) => a + j.up.filter(u => u[0] >= (i - 1) * 60 && u[0] < i * 60).length, 0) / J.length;
    const rnd = J.reduce((a, j) => a + j.rows[i - 1].rounds, 0) / J.length;
    O.push([...row, nw.toFixed(1), up.toFixed(1), rnd.toFixed(1)].join(','));
  }
  fs.writeFileSync(`${csvDir}/${pre}_per_minute_avg.csv`, O.join('\n') + '\n');
}
