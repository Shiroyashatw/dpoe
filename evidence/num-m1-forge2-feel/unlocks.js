/* camp_run 的 log → 解鎖秒數（解鎖句的秒數，M1-14 hudWarn）＋瞭望台前後的平均靈魂收入（CSV 的「靈魂收入」欄，或 log 的靈魂庫存＋花費推回）
   用法：node unlocks.js 檔1.log 檔2.log ... [--csv 輸出]；每個 log 旁邊同名 .csv 有的話也讀 */
const fs = require('fs');
const args = process.argv.slice(2), ci = args.indexOf('--csv'), out = ci >= 0 ? args.splice(ci, 2)[1] : null;
const K = { 鍛造台: 'forge', 瞭望台: 'watch', 民房: 'house', 祭壇: 'altar', 斥候營: 'scout', 倉房: 'store' };
const rows = [['run', 'house1', 'forge1', 'altar1', 'watch1', 'house2', 'forge2', 'forge3', 'house3', 'spm_before_watch', 'spm_after_watch', 'rounds', 'deaths', 'minutes'].join(',')];
for (const f of args) {
  const L = fs.readFileSync(f, 'utf8').split('\n'), t = {};
  for (const l of L) { const m = l.match(/^\s+(\d+) (鍛造台|瞭望台|民房|祭壇|斥候營|倉房) Lv(\d+)：/); if (m && +m[1] > 60 ? true : m && L.some(x => /解鎖句/.test(x)) && L.indexOf(l) > L.findIndex(x => /解鎖句/.test(x))) { const k = K[m[2]] + m[3]; if (!(k in t)) t[k] = +m[1]; } }
  const mins = L.filter(l => /^\s*\d+ 分 \|/.test(l));
  const last = mins[mins.length - 1] || '';
  const rd = (last.match(/輪 (\d+) 死 (\d+)/) || []).slice(1);
  let sb = '', sa = '';
  const c = f.replace(/\.log$/, '.csv');
  if (fs.existsSync(c)) {
    const C = fs.readFileSync(c, 'utf8').trim().split('\n').slice(1).map(r => r.split(','));
    const w = t.watch1 ? t.watch1 / 60 : 1e9, b = C.filter(r => +r[0] <= Math.floor(w)), a = C.filter(r => +r[0] > Math.ceil(w));
    const avg = X => X.length ? (X.reduce((s, r) => s + +r[4], 0) / X.length).toFixed(1) : '';
    sb = avg(b); sa = avg(a);
  }
  const s = k => (k in t ? (t[k] / 60).toFixed(2) : '');
  rows.push([f.split('/').pop().replace(/\.log$/, ''), s('house1'), s('forge1'), s('altar1'), s('watch1'), s('house2'), s('forge2'), s('forge3'), s('house3'), sb, sa, rd[0] || '', rd[1] || '', mins.length].join(','));
}
console.log(rows.join('\n'));
if (out) fs.writeFileSync(out, rows.join('\n') + '\n');
