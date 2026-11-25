/* num-asc3-tide：寒潮反擊／海神之軀的「少被打」（jobs.js ablate → out_ablate.jsonl）。
   同一組進攻點＋s6，再加寒潮反擊、再加 s7＋海神之軀；比時間平均受傷（%生命/秒）與倒下次數，成對（同種子）比的中位數 */
const fs = require('fs');
const L = fs.readFileSync(__dirname + '/out_ablate.jsonl', 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const med = a => { const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const V = { 7: '基準（s1 潮起 s3 潮滅 s4 汐引 s6）', 8: '＋寒潮反擊', 10: '＋寒潮反擊＋s7＋海神之軀' };
const out = ['| 等級點 | 配裝 | 模式 | 點法 | 受傷 %生命/秒 P50 | 對基準（成對中位數） | 倒下 P50 | 穩態 DPS 或清怪秒數 P50 |', '|---|---|---|---|---|---|---|---|'];
for (const pt of ['a', 'b']) for (const b of ['arc', 'frost']) for (const mode of ['bossx', 'clear']) {
  const g = n => L.filter(r => r.tag.pt === pt && r.tag.b === b && r.tag.mode === mode && r.tag.at.length === n);
  const base = g(7);
  for (const n of [7, 8, 10]) {
    const R = g(n), pr = R.map(r => { const o = base.find(x => x.tag.seed === r.tag.seed); return o && o.takenPctPs > 0 ? r.takenPctPs / o.takenPctPs : null; });
    out.push(`| ${pt} | ${b} | ${mode === 'bossx' ? '打王 60 秒' : '清怪'} | ${V[n]} | ${(med(R.map(r => r.takenPctPs)) * 100).toFixed(2)} | ${n === 7 ? '—' : med(pr).toFixed(2) + '×'} | ${med(R.map(r => r.deaths))} | ${mode === 'bossx' ? Math.round(med(R.map(r => r.steady))) : med(R.map(r => r.dur)).toFixed(1) + ' 秒'} |`);
  }
}
fs.writeFileSync(__dirname + '/ablate.md', out.join('\n') + '\n');
console.log(out.join('\n'));
