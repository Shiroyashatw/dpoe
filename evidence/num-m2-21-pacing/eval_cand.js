/* 讀 sweep CSV，對每個方案 × 一輪秒數算 5 種子平均，跟 ref550（同收入同種子）比：
   目標＝ref550 時間 +4（m1-28 §5）；瞭望台 Lv1 8–12。另外列跟 main 的平均差（「不能變晚」）。
   用法：node eval_cand.js sweep/cand_craft1.csv [輸出.csv] */
const fs = require('fs');
const [f, out] = process.argv.slice(2);
const L = fs.readFileSync(f, 'utf8').trim().split('\n').map(l => l.split(','));
const H = L[0], rows = L.slice(1).map(r => Object.fromEntries(H.map((h, i) => [h, r[i]])));
const num = v => (v === '' || v == null ? 60 : +v); /* 60 分內沒到的當 60（下限） */
const KS = ['watch1', 'altar1', 'forge2', 'house2', 'forge3', 'forge4'];
const by = {};
for (const r of rows) ((by[r['方案']] = by[r['方案']] || {})[r['一輪秒']] = by[r['方案']][r['一輪秒']] || []).push(r);
const avg = (R, k) => R.reduce((a, r) => a + num(r[k]), 0) / R.length;
const O = [['方案', '一輪秒', '靈魂每分', ...KS.map(k => k), ...KS.slice(1).map(k => k + '_比ref'), ...KS.slice(1).map(k => k + '_比main'), '瞭望台8-12', '目標+4全過(場/5)'].join(',')];
for (const p in by)
  for (const sec in by[p]) {
    const R = by[p][sec], ref = by.ref550[sec], mn = by.main[sec];
    const pass = R.filter((r, i) => {
      const w = num(r.watch1);
      return w >= 8 && w <= 12 && ['altar1', 'forge2', 'house2', 'forge3'].every(k => num(r[k]) <= num(ref[i][k]) + 4);
    }).length;
    O.push([p, sec, avg(R, '靈魂每分').toFixed(1), ...KS.map(k => avg(R, k).toFixed(1)), ...KS.slice(1).map(k => (avg(R, k) - avg(ref, k)).toFixed(1)), ...KS.slice(1).map(k => (avg(R, k) - avg(mn, k)).toFixed(1)),
      R.filter(r => num(r.watch1) >= 8 && num(r.watch1) <= 12).length + '/' + R.length, pass + '/' + R.length].join(','));
  }
if (out) fs.writeFileSync(out, O.join('\n') + '\n');
console.log(O.join('\n'));
