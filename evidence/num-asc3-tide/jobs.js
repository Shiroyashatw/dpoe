/* num-asc3-tide：產生 job 檔。
   node jobs.js screen  → jobs_screen.json：等級點 (a)，每個（配裝, 昇華）的所有合法 8 點路線（routes.json）× 種子 1、2 × 打王／清怪，加無昇華基準
   node jobs.js final   → jobs_final.json：pick.js 選出的路線（picks.json）× 種子 1–10 × 兩個等級點 × 打王（原生命）／清怪／穩態打王（王生命 ×50、60 秒），加無昇華基準
   node jobs.js tune <方案名>  → jobs_tune_<名>.json：潮汐套覆寫參數（tune.js 的方案）重跑 final 裡潮汐的那幾格
   種子 s：亂數種子（裝備、生怪、AI）＝s，王＝BOSSES[s−1]（每個種子不同的王，同種子各配裝同一隻） */
'use strict';
const fs = require('fs');
const { BUILDS, POINTS } = require('./builds.js');
const routes = JSON.parse(fs.readFileSync(__dirname + '/routes.json', 'utf8'));
const PAIRS = { tide: ['arc', 'frost', 'bow'], wind: ['bow', 'arc'], iron: ['mace', 'arc', 'bow'] };
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const TMAX = { boss: 180, clear: 300, bossx: 60 };
const job = (tag, b, asc, at, pt, seed, mode, ov) => ({
  id: [tag, b, asc || 'none', pt, (at || []).join('+'), seed, mode, ov ? JSON.stringify(ov) : ''].join('|'),
  tag: { b, asc: asc || 'none', at: at || [], pt, seed, mode, ov: ov || null },
  seed,
  cfg: { B: BUILDS[b], ...POINTS[pt], holes: 4, asc, at: at || [], mode, seed, boss: seed - 1, tmax: TMAX[mode], hpx: 50, ov }
});
const J = [];
const what = process.argv[2];
if (what === 'screen') {
  for (const seed of [1, 2])
    for (const mode of ['boss', 'clear']) {
      for (const b of Object.keys(BUILDS)) J.push(job('scr', b, null, [], 'a', seed, mode));
      for (const [asc, bs] of Object.entries(PAIRS))
        for (const b of bs) for (const at of routes[asc]) J.push(job('scr', b, asc, at.map(x => x.slice(2)), 'a', seed, mode));
    }
  fs.writeFileSync(__dirname + '/jobs_screen.json', JSON.stringify(J));
} else if (what === 'final' || what === 'tune') {
  const picks = JSON.parse(fs.readFileSync(__dirname + '/picks.json', 'utf8'));
  const T = what === 'tune' ? require('./tune.js')[process.argv[3]] : null;
  for (const pt of ['a', 'b'])
    for (const seed of SEEDS)
      for (const mode of ['boss', 'clear', 'bossx']) {
        if (!T) for (const b of Object.keys(BUILDS)) J.push(job('fin', b, null, [], pt, seed, mode));
        for (const p of picks) {
          if (T && p.asc !== 'tide') continue;
          J.push(job(T ? 'tune_' + process.argv[3] : 'fin', p.b, p.asc, p.at, pt, seed, mode, T ? T.ov : undefined));
        }
      }
  fs.writeFileSync(__dirname + `/jobs_${what === 'tune' ? 'tune_' + process.argv[3] : 'final'}.json`, JSON.stringify(J));
}
if (what === 'ablate') {
  /* 寒潮反擊／海神之軀的「少被打」：同一組進攻點（s1 潮起 s3 潮滅 s4 汐引）＋ s6（生命 5%），再加寒潮反擊、再加 s7＋海神之軀。
     只是拆機制量（點數不照 8 點上限），打王用穩態模式（60 秒）、清怪照常 */
  const A = ['s1', 'rise', 's3', 'ebb', 's4', 'pull', 's6'];
  for (const pt of ['a', 'b'])
    for (const seed of SEEDS)
      for (const mode of ['bossx', 'clear'])
        for (const b of ['arc', 'frost'])
          for (const at of [A, [...A, 'back'], [...A, 'back', 's7', 'god']]) J.push(job('abl', b, 'tide', at, pt, seed, mode));
  fs.writeFileSync(__dirname + '/jobs_ablate.json', JSON.stringify(J));
}
console.log(what, J.length);
