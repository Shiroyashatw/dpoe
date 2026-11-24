'use strict';
/* 起點入門叢集清單＋武器專精叢集在哪條路（含子叢集）：node inventory.js <root> */
const L = require('./lib.js');
const { T, env } = L.load(process.argv[2]);
const TH = env.PT_THEME,
  R = env.PT_ROADS.map(r => r.n.replace('之路', ''));
const nm = id => {
  const n = T.I[id];
  return TH[n.th].nt[n.v][0];
};
const out = { entry: [], weapons: {} };
for (let g = 0; g < 6; g++)
  for (const s of ['l', 'r']) {
    const hub = 's' + g + s + 'n',
      fam = i => [
        i,
        ...T.CL.map((c, j) => [c, j])
          .filter(([c]) => c.par === i)
          .flatMap(([, j]) => fam(j))
      ];
    const isD = env.PT_STARTS[g].d && T.N.some(n => n.id === 's' + g + s + 's1' && n.sv === 0);
    out.entry.push({
      road: R[g],
      side: isD ? '輸出' : '防禦',
      fifth: nm(hub),
      clusters: T.CL.map((c, i) => [c, i])
        .filter(([c]) => c.hub === hub)
        .map(([, i]) =>
          fam(i)
            .map(
              j =>
                TH[T.CL[j].th].n +
                '(' +
                T.CL[j].ids
                  .filter(id => T.I[id].big)
                  .map(nm)
                  .join('/') +
                ')'
            )
            .join('+')
        )
    });
  }
for (const [i, t] of TH.entries())
  if (t.wp) {
    const home = t.rg.indexOf(3),
      cl = T.CL.filter(c => c.th === i);
    out.weapons[t.n] = {
      home: R[home],
      onHome: cl.filter(c => L.roadOf(c) === home).length,
      total: cl.length,
      roads: cl.map(c => L.roadOf(c)).join('')
    };
  }
console.log(JSON.stringify(out, null, 1));
