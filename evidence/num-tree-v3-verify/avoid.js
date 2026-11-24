'use strict';
/* num-tree-v3-verify 第 6～9 項：node avoid.js <repo 根目錄> <輸出前綴>
   閃避＝evF、evP、surrEv（值 > 0）；偏斜＝defl、evAsDefl、lukDefl（值 > 0）。evAsDefl 只算偏斜（data.js:2895、items.js:1159）。
   「第幾點」＝從起點走過去要點幾點（起點不算；BFS 步數）。「前 15 點」＝步數 ≤ 15 的點。 */
const fs = require('fs'),
  vm = require('vm'),
  L = require('./lib.js');
const [root, pre] = process.argv.slice(2);
const { T, env, ctx } = L.load(root);
const PT = vm.runInContext('PTREE', ctx),
  TH = env.PT_THEME,
  RN = env.PT_ROADS.map(r => r.n.replace('之路', '')),
  A = L.adj(T),
  cOf = L.clusterOf(T);
const EV = ['evF', 'evP', 'surrEv'],
  DF = ['defl', 'evAsDefl', 'lukDefl'],
  has = (n, K) => n.s && K.some(k => n.s[k] > 0);
const desc = n => {
  const ci = cOf[n.id];
  return {
    id: n.id,
    name: n.big ? n.n : TH[n.th] ? TH[n.th].n + '小點' : n.n,
    s: JSON.stringify(n.s),
    big: n.big,
    road: RN[L.roadOf(n)],
    cluster:
      ci == null
        ? n.id[0] === 's'
          ? '起點模板'
          : '幹道'
        : ci + ':' + TH[T.CL[ci].th].n + (T.CL[ci].st ? '(入門叢集)' : '')
  };
};
const out = { root, starts: {}, dual: [] };
const dual = PT.N.filter(n => has(n, EV) && has(n, DF));
for (let g = 0; g < 6; g++) {
  const D = L.bfs(A, ['g' + g]),
    near = K =>
      PT.N.filter(n => has(n, K) && D[n.id] != null).sort((a, b) => D[a.id] - D[b.id] || (a.id < b.id ? -1 : 1)),
    ev = near(EV),
    df = near(DF),
    clNear = th => {
      const c = T.CL.map((c, i) => [c, i])
        .filter(([c]) => c.th === env.PT_TH[th])
        .map(([c, i]) => ({
          ci: i,
          entry: Math.min(...c.ids.map(id => D[id])),
          road: RN[L.roadOf(c)],
          st: c.st ? 1 : 0
        }))
        .sort((a, b) => a.entry - b.entry);
      return c.slice(0, 3);
    };
  out.starts[RN[g]] = {
    nearestEv: { d: D[ev[0].id], ...desc(ev[0]) },
    nearestEvNotable: (x => x && { d: D[x.id], ...desc(x) })(ev.find(n => n.big === 1)),
    nearestDf: { d: D[df[0].id], ...desc(df[0]) },
    nearestDfNotable: (x => x && { d: D[x.id], ...desc(x) })(df.find(n => n.big === 1)),
    evWithin15: ev.filter(n => D[n.id] <= 15).length,
    dfWithin15: df.filter(n => D[n.id] <= 15).length,
    dualWithin15: dual.filter(n => D[n.id] <= 15).map(n => ({ d: D[n.id], ...desc(n) })),
    cl身法: clNear('身法'),
    cl偏斜: clNear('偏斜')
  };
}
for (const n of dual) {
  const ds = [0, 1, 2, 3, 4, 5].map(g => L.bfs(A, ['g' + g])[n.id]);
  out.dual.push({ ...desc(n), fromStarts: ds, min: Math.min(...ds) });
}
out.dual.sort((a, b) => a.min - b.min);
/* 卸力現在的效果（第 7 項） */
out.卸力 = PT.N.filter(n => n.n === '卸力').map(n => ({ id: n.id, s: n.s }));
fs.writeFileSync(pre + '_avoid.json', JSON.stringify(out, null, 1));
const S = out.starts;
for (const r of RN)
  console.log(
    r,
    '最近閃避',
    S[r].nearestEv.d,
    S[r].nearestEv.name,
    S[r].nearestEv.road,
    S[r].nearestEv.cluster,
    '| 最近偏斜',
    S[r].nearestDf.d,
    S[r].nearestDf.name,
    S[r].nearestDf.road,
    S[r].nearestDf.cluster,
    '| 前15點雙給',
    S[r].dualWithin15.map(x => x.d + ':' + x.name + x.s + '@' + x.road).join(' ') || '0'
  );
console.log('全樹同點閃避＋偏斜', out.dual.length, '個；離最近起點', out.dual.map(x => x.min).join(','));
console.log('卸力', JSON.stringify(out.卸力));
