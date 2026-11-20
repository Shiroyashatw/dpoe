'use strict';
/* 十字弓（任務 4）：在「不重烘」的現有座標下，遊俠之路上最靠近榴彈叢集、可換主題的叢集位置（不是武器專精、不是入門、不是固定擺法），
   假設外流的 2 個十字弓叢集搬到這裡，遊俠起點到叢集入口與大點的點數。node xbow_slots.js <root> */
const L = require('./lib.js');
const { T, env } = L.load(process.argv[2]);
const TH = env.PT_THEME,
  A = L.adj(T),
  D = L.bfs(A, ['g1']);
const root = c => (c.par == null ? c : root(T.CL[c.par]));
const fam = {};
for (const c of T.CL) fam[root(c).id] = (fam[root(c).id] || 0) + c.nt;
const GR = env.PT_TH['榴彈'],
  grs = T.CL.filter(c => c.th === GR && L.roadOf(c) === 1),
  gd = c => Math.min(...grs.map(g => Math.hypot(g.x - c.x, g.y - c.y)));
const slots = T.CL.map((c, i) => ({ c, i }))
  .filter(({ c }) => c.par == null && !c.st && !c.fix && L.roadOf(c) === 1 && !TH[c.th].wp)
  .sort((a, b) => gd(a.c) - gd(b.c))
  .slice(0, 6)
  .map(({ c, i }) => ({
    ci: i,
    theme: TH[c.th].n,
    famNt: fam[c.id],
    entry: Math.min(...c.ids.map(id => D[id])),
    notablePts: c.ids.filter(id => T.I[id].big === 1).map(id => D[id]),
    toGrenade: Math.round(gd(c))
  }));
console.log(JSON.stringify(slots));
