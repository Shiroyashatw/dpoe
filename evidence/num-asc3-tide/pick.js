/* num-asc3-tide：篩路線。讀 out_screen.jsonl（等級點 (a)、種子 1、2），每條路線算三個比例（對同配裝、同種子的無昇華基準）：
   打王＝穩態 DPS 比、清怪＝清到王出現的秒數比（倒數；沒清完用每秒擊殺比）、存活＝EHP（物理與元素的幾何平均）比；
   分數＝三個比例的幾何平均（兩個種子再幾何平均）。每個（配裝, 昇華）取前 2 名；潮汐在自己的配裝（電弧、冰霜彈）另外保證潮起線、潮落線各有最好的 1 條。
   輸出 picks.json、screen_rank.csv（全部路線的排名） */
'use strict';
const fs = require('fs');
const L = fs
  .readFileSync(__dirname + '/' + (process.argv[2] || 'out_screen.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map(JSON.parse);
const gm = a => Math.exp(a.reduce((s, x) => s + Math.log(Math.max(1e-9, x)), 0) / a.length);
const ehpOf = r => Math.sqrt(r.ehp.phys * r.ehp.ele);
const clearSp = r => (r.clear ? 1 / r.clear : r.kps / 1000); /* 沒清完的排在清完的後面（用擊殺速度的千分之一當速度） */
const key = t => [t.b, t.asc, t.at.join('+')].join('|');
const G = {};
for (const r of L) {
  if (r.error) {
    console.log('錯誤', r.id, r.error);
    continue;
  }
  const t = r.tag,
    k = key(t);
  ((G[k] = G[k] || { t, s: {} }).s[t.seed] = G[k].s[t.seed] || {})[t.mode] = r;
}
const base = (b, seed) => G[[b, 'none', ''].join('|')].s[seed];
const rows = [];
for (const [k, g] of Object.entries(G)) {
  if (g.t.asc === 'none') continue;
  const per = [];
  for (const [seed, m] of Object.entries(g.s)) {
    const b0 = base(g.t.b, seed);
    if (!m.boss || !m.clear || !b0.boss || !b0.clear) continue;
    const dps = m.boss.dps / b0.boss.dps,
      clr = clearSp(m.clear) / clearSp(b0.clear),
      ehp = ehpOf(m.boss) / ehpOf(b0.boss);
    per.push({ dps, clr, ehp, sc: gm([dps, clr, ehp]) });
  }
  if (!per.length) continue;
  rows.push({
    b: g.t.b,
    asc: g.t.asc,
    at: g.t.at,
    line: g.t.at.includes('rise') ? '潮起' : g.t.at.includes('fall') ? '潮落' : '',
    dps: gm(per.map(x => x.dps)),
    clr: gm(per.map(x => x.clr)),
    ehp: gm(per.map(x => x.ehp)),
    sc: gm(per.map(x => x.sc)),
    n: per.length
  });
}
rows.sort((a, b) => b.sc - a.sc);
fs.writeFileSync(
  __dirname + '/screen_rank.csv',
  'build,asc,route,line,dps_ratio,clear_ratio,ehp_ratio,score,seeds\n' +
    rows.map(r => [r.b, r.asc, r.at.join('+'), r.line, r.dps.toFixed(3), r.clr.toFixed(3), r.ehp.toFixed(3), r.sc.toFixed(3), r.n].join(',')).join('\n') +
    '\n'
);
const picks = [],
  has = (b, asc, at) => picks.some(p => p.b === b && p.asc === asc && p.at.join() === at.join());
for (const b of [...new Set(rows.map(r => r.b))])
  for (const asc of ['wind', 'iron', 'tide']) {
    const R = rows.filter(r => r.b === b && r.asc === asc);
    for (const r of R.slice(0, 2)) picks.push({ b, asc, at: r.at, why: 'top' });
    if (asc === 'tide' && (b === 'arc' || b === 'frost'))
      for (const line of ['潮起', '潮落']) {
        const r = R.find(x => x.line === line);
        if (r && !has(b, asc, r.at)) picks.push({ b, asc, at: r.at, why: line });
      }
  }
/* 潮汐另外補每個配裝最好的一條有浪潮之心的路線（調整方案動浪潮之心時，最佳路線可能換成它） */
for (const b of ['arc', 'frost', 'bow']) {
  const r = rows.find(x => x.b === b && x.asc === 'tide' && x.at.includes('heart'));
  if (r && !has(b, 'tide', r.at)) picks.push({ b, asc: 'tide', at: r.at, why: '浪潮之心' });
}
fs.writeFileSync(__dirname + '/picks.json', JSON.stringify(picks, null, 1));
for (const b of [...new Set(rows.map(r => r.b))])
  for (const asc of ['wind', 'iron', 'tide']) {
    const R = rows.filter(r => r.b === b && r.asc === asc);
    if (!R.length) continue;
    console.log(`\n${b} × ${asc}（${R.length} 條）`);
    for (const r of R.slice(0, 4))
      console.log(`  ${r.sc.toFixed(3)}  打王×${r.dps.toFixed(2)} 清怪×${r.clr.toFixed(2)} EHP×${r.ehp.toFixed(2)}  ${r.line} ${r.at.join(' ')}`);
  }
console.log('\npicks', picks.length);
