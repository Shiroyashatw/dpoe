/* 實掛驗收矩陣：main／P7／P8 每場每項對「目標」（m1-28 §5 81–119／分欄；鍛造台 4 用本報告提案 ≤36）與「單場上限」（目標 +3；瞭望台 6–14；鍛造台 4 ≤39）。
   卡住的場次只用卡住前的時間（卡住之後才發生的算「—」不計）。輸出 camp_accept.csv 與一張 markdown 表 */
const fs = require('fs');
const ev = j => { const o = {}; j.rows.forEach(r => r.ev.forEach(e => { const m = e.match(/^([\d.]+) (.+?)(：|$)/); if (m && !/換上/.test(e) && !(m[2] in o)) o[m[2]] = +m[1] / 60; })); return o; };
const K = ['瞭望台 Lv1', '祭壇 Lv1', '鍛造台 Lv2', '民房 Lv2', '鍛造台 Lv3', '鍛造台 Lv4'];
const tg = (d, k) => ({ '瞭望台 Lv1': [8, 12, 6, 14], '祭壇 Lv1': [0, 10.8, 0, 13.8], '鍛造台 Lv2': [0, d ? 14.6 : 13.4, 0, d ? 17.6 : 16.4], '民房 Lv2': [0, d ? 17.4 : 15.6, 0, d ? 20.4 : 18.6], '鍛造台 Lv3': [0, d ? 22.2 : 19.9, 0, d ? 25.2 : 22.9], '鍛造台 Lv4': [0, 36, 0, 39] }[k]);
const files = fs.readdirSync('camp').filter(f => /^(main|P7|P8)_.*\.json$/.test(f));
const out = [['方案', '場次', ...K, '目標全過', '單場上限全過'].join(',')], agg = {};
for (const f of files.sort()) {
  const j = JSON.parse(fs.readFileSync('camp/' + f)), e = ev(j), d = /1280/.test(f), pl = f.split('_')[0];
  const vt = j.validTo || j.stuckFrom || (/無效/.test(f) ? 28 : 1e9), cut = j.min || 60;
  const cells = K.map(k => { const x = e[k]; if (x == null) return x === undefined && cut >= 40 && vt > 40 ? 'X' : ''; if (x > vt) return ''; const [a, b, c, dd] = tg(d, k); return `${x.toFixed(1)}${x >= a && x <= b ? 'o' : x >= c && x <= dd ? '~' : 'X'}`; });
  const strict = cells.every(c => !c || c.endsWith('o')), cap = cells.every(c => !c || !c.endsWith('X'));
  out.push([pl, f.replace('.json', ''), ...cells, strict ? 1 : 0, cap ? 1 : 0].join(','));
  const A = (agg[pl] = agg[pl] || { n: 0 }); A.n++;
  K.forEach((k, i) => { const c = cells[i]; if (!c) return; const B = (A[k] = A[k] || [0, 0, 0]); B[0]++; if (c.endsWith('o')) B[1]++; if (!c.endsWith('X')) B[2]++; });
}
fs.writeFileSync('camp/camp_accept.csv', out.join('\n') + '\n');
const md = ['| 方案（場數） | ' + K.join(' | ') + ' |', '|---|' + K.map(() => '---|').join('')];
for (const pl in agg) md.push(`| ${pl}（${agg[pl].n}） | ` + K.map(k => (agg[pl][k] ? `${agg[pl][k][1]}／${agg[pl][k][0]}（上限內 ${agg[pl][k][2]}）` : '—')).join(' | ') + ' |');
console.log(out.join('\n') + '\n\n' + md.join('\n'));
