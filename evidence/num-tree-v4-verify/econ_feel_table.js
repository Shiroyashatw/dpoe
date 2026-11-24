'use strict';
/* num-tree-v4-verify 第 12 項：把 econ_feel.js 的輸出（main、改前、改後）排成表。
   用法：node econ_feel_table.js <main.json> <改前.json> <改後.json> [csv 路徑]
   每小時＝件數 ÷ 輪數 × 23.68（每輪 150＋2 秒，估算，等測試階段再實測）。標準誤＝√件數 ÷ 輪數 × 23.68（件數當 Poisson，保守估計） */
const fs = require('fs');
const rd = f => fs.readFileSync(f, 'utf8').trim().split('\n').flatMap(l => JSON.parse(l));
const [mf, bf, af, csv] = process.argv.slice(2),
  M = rd(mf),
  B = rd(bf),
  A = rd(af),
  RPH = 3600 / 152,
  ph = (r, k) => (r[k] / r.rounds) * RPH,
  se = (r, k) => (Math.sqrt(r[k]) / r.rounds) * RPH,
  pct = (x, y) => ((x / y - 1) * 100).toFixed(1);
const rows = [],
  hdr = ['地點', '類型', 'Lv', 'main 石/時', 'main 墨/時', '改前 石/時', '改前 墨/時', '改前 差%(石/墨)', '改後 石/時', '改後 墨/時', '改後 差%(石/墨)', '改後 ±2% 內', '差的標準誤%(石/墨)', '保底次數/時 main→改前→改後', '靈魂包/時 改前→改後'];
let worst = 0,
  worstB = 0;
for (const m of M) {
  const b = B.find(x => x.li === m.li),
    a = A.find(x => x.li === m.li);
  const dF = (ph(a, 'frac') / ph(m, 'frac') - 1) * 100,
    dI = (ph(a, 'ink') / ph(m, 'ink') - 1) * 100,
    sF = Math.hypot(se(a, 'frac') / ph(a, 'frac'), se(m, 'frac') / ph(m, 'frac')) * 100,
    sI = Math.hypot(se(a, 'ink') / ph(a, 'ink'), se(m, 'ink') / ph(m, 'ink')) * 100;
  worst = Math.max(worst, Math.abs(dF), Math.abs(dI));
  worstB = Math.max(worstB, Math.abs(+pct(ph(b, 'frac'), ph(m, 'frac'))), Math.abs(+pct(ph(b, 'ink'), ph(m, 'ink'))));
  rows.push([
    m.n, m.type, m.lv,
    ph(m, 'frac').toFixed(3), ph(m, 'ink').toFixed(3),
    ph(b, 'frac').toFixed(3), ph(b, 'ink').toFixed(3), pct(ph(b, 'frac'), ph(m, 'frac')) + '/' + pct(ph(b, 'ink'), ph(m, 'ink')),
    ph(a, 'frac').toFixed(3), ph(a, 'ink').toFixed(3), dF.toFixed(1) + '/' + dI.toFixed(1),
    Math.abs(dF) <= 2 && Math.abs(dI) <= 2 ? '是' : '否',
    sF.toFixed(1) + '/' + sI.toFixed(1),
    [m, b, a].map(r => ((r.feel / r.rounds) * RPH).toFixed(2)).join('→'),
    [b, a].map(r => Math.round((r.pack / r.rounds) * RPH)).join('→')
  ]);
}
console.log(hdr.join(' | '));
for (const r of rows) console.log(r.join(' | '));
console.log(`26 地點最大偏差 %（石、墨取大）：改前 ${worstB.toFixed(1)}、改後 ${worst.toFixed(1)}；改後全部在 ±2% 內：${rows.every(r => r[11] === '是') ? '是' : '否'}`);
if (csv) fs.writeFileSync(csv, '﻿' + [hdr, ...rows].map(r => r.join(',')).join('\n') + '\n');
