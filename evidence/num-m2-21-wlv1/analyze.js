/* M2-21 D1：S0／S1／S2 實掛驗收。跟 num-m2-21-pacing/accept.js 同一套事件解析與目標（瞭望台 8–12 單場 6–14；祭壇 ≤10.8／13.8；
   鍛造台 2 ≤14.6 桌機／≤13.4 直立（上限 +3）；民房 2 ≤17.4／≤15.6；鍛造台 3 ≤22.2／≤19.9；鍛造台 4 24–36（單場 ≤39））。
   鍛造台 4 照本次題目用 24–36 窗（下限 24；<24 記 ~）。o＝目標內、~＝目標外但單場上限內、X＝超過單場上限。
   有效場：AI 沒卡住（camp_run_v2 的 stuckFrom＝0）。卡住的場次整場不採用（檔名在 summary 列出）。
   用法：node analyze.js → runs.csv、accept.csv、stdout markdown */
const fs = require('fs');
const ev = j => { const o = {}; j.rows.forEach(r => r.ev.forEach(e => { const m = e.match(/^([\d.]+) (.+?)(：|$)/); if (m && !/換上/.test(e) && !(m[2] in o)) o[m[2]] = +m[1] / 60; })); return o; };
const K = ['瞭望台 Lv1', '祭壇 Lv1', '民房 Lv2', '鍛造台 Lv2', '鍛造台 Lv3', '鍛造台 Lv4'];
const tg = (d, k) => ({ '瞭望台 Lv1': [8, 12, 6, 14], '祭壇 Lv1': [0, 10.8, 0, 13.8], '鍛造台 Lv2': [0, d ? 14.6 : 13.4, 0, d ? 17.6 : 16.4], '民房 Lv2': [0, d ? 17.4 : 15.6, 0, d ? 20.4 : 18.6], '鍛造台 Lv3': [0, d ? 22.2 : 19.9, 0, d ? 25.2 : 22.9], '鍛造台 Lv4': [24, 36, 0, 39] }[k]);
const files = fs.readdirSync('camp').filter(f => /^S\d_.*\.json$/.test(f)).sort();
const runs = ['方案,場次,有效,卡住起(分),前30分靈魂/分,' + K.join(',') + ',生鐵30分,生鐵60分,30分≤6000,60分≤15000'];
const acc = ['方案,場次,' + K.join(',')];
const agg = {}, iron = {};
for (const f of files) {
  const j = JSON.parse(fs.readFileSync('camp/' + f)), e = ev(j), d = /1280/.test(f), pl = f.split('_')[0], id = f.replace('.json', '');
  const ok = !j.stuckFrom && j.rows.length >= 60;
  const i30 = j.rows[29]?.mats['iron:1'] ?? '', i60 = j.rows[59]?.mats['iron:1'] ?? '';
  const cs = fs.readFileSync('camp/' + id + '.csv', 'utf8').trim().split('\n').slice(1).map(l => l.split(',')), spm = cs.length >= 30 ? Math.round(cs.slice(0, 30).reduce((a, r) => a + +r[5], 0) / 30) : '';
  const cells = K.map(k => { const x = e[k]; if (x == null) return 'X(未解)'; const [a, b, c, dd] = tg(d, k); return `${x.toFixed(1)}${x >= a && x <= b ? 'o' : x >= c && x <= dd ? '~' : 'X'}`; });
  runs.push([pl, id, ok ? 1 : 0, j.stuckFrom || '', spm, ...K.map(k => (e[k] == null ? '' : e[k].toFixed(2))), i30, i60, i30 !== '' ? +(i30 <= 6000) : '', i60 !== '' ? +(i60 <= 15000) : ''].join(','));
  if (!ok) continue;
  acc.push([pl, id, ...cells].join(','));
  const A = (agg[pl] = agg[pl] || { n: 0, nd: 0, np: 0 }); A.n++; d ? A.nd++ : A.np++;
  K.forEach((k, i) => { const c = cells[i], B = (A[k] = A[k] || [0, 0, 0, 0]); B[0]++; if (c.includes('o')) { B[1]++; d ? B[3]++ : 0; } if (!/X/.test(c)) B[2]++; });
  const I = (iron[pl] = iron[pl] || { a: [], b: [] }); I.a.push(+i30); I.b.push(+i60);
}
fs.writeFileSync('runs.csv', runs.join('\n') + '\n');
fs.writeFileSync('accept.csv', acc.join('\n') + '\n');
const md = ['| 方案（有效場） | ' + K.join(' | ') + ' |', '|---|' + K.map(() => '---|').join('')];
for (const pl in agg) md.push(`| ${pl}（${agg[pl].n}：直立 ${agg[pl].np}、桌機 ${agg[pl].nd}） | ` + K.map(k => `${agg[pl][k][1]}／${agg[pl][k][0]}（上限內 ${agg[pl][k][2]}）`).join(' | ') + ' |');
md.push('', '| 方案 | 生鐵 30 分（範圍） | ≤6,000 | 生鐵 60 分（範圍） | ≤15,000 |', '|---|---|---|---|---|');
for (const pl in iron) { const I = iron[pl], r = a => `${Math.min(...a).toLocaleString()}–${Math.max(...a).toLocaleString()}`; md.push(`| ${pl} | ${r(I.a)} | ${I.a.filter(x => x <= 6000).length}／${I.a.length} | ${r(I.b)} | ${I.b.filter(x => x <= 15000).length}／${I.b.length} |`); }
const P = (pl, k) => (agg[pl] && agg[pl][k] ? agg[pl][k][1] : NaN);
if (agg.S0 && agg.S1) {
  const f2 = P('S1', '鍛造台 Lv2'), reg = ['民房 Lv2', '鍛造台 Lv3', '瞭望台 Lv1', '祭壇 Lv1'].filter(k => P('S1', k) < P('S0', k));
  md.push('', `判定：S1 鍛造台 Lv2 ${f2}／${agg.S1['鍛造台 Lv2'][0]}（需 ≥4／6）；比 S0 退步的：${reg.length ? reg.map(k => `${k} ${P('S1', k)} < ${P('S0', k)}`).join('、') : '無'} → ${f2 >= 4 && !reg.length ? '採用 S1' : '採用 P8'}`);
}
console.log(md.join('\n'));
