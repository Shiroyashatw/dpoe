'use strict';
/* num-tree-v4-jewel18：把 v4_sockets.csv 的 18 孔對回 ptdata（掛點座標、最近叢集、所在圈）。node sock_table.js <repo 根目錄> */
const fs = require('fs'),
  path = require('path'),
  L = require('../num-tree-v4-verify/lib.js');
const root = process.argv[2] || '.';
const { T, env, sameAsPtdata } = L.load(root);
const TH = env.PT_THEME,
  cOf = L.clusterOf(T),
  A = L.adj(T);
const csv = fs
  .readFileSync(path.join(root, 'evidence/num-tree-v4-verify/v4_sockets.csv'), 'utf8')
  .replace(/^﻿/, '')
  .trim()
  .split('\n')
  .map(l => l.split(','));
const H = csv.shift();
const skel = id => /^t_[imosx]\d+$/.test(id);
const ringOf = id => ({ i: '內環', m: '中環', o: '外環', s: '支線', x: '支線' })[id[2]];
console.log('重建的樹與 ptdata 一致:', sameAsPtdata);
console.log(
  '| 孔 | 種類 | 路 | 掛點 | csv x | csv y | 掛點 x（全精度） | 掛點 y | 半徑 | 掛點所在幹道段（兩端骨架點） | 最近叢集點（步數；點 id＋主題） | ' +
    H.slice(9, 15).join(' | ') +
    ' |'
);
for (const r of csv) {
  const a = r[3],
    n = T.I[a];
  /* 沿幹道（tk 點）往兩邊走到最近的骨架點 */
  const ends = [];
  if (skel(a)) ends.push(a);
  else {
    const seen = new Set([a]);
    let q = [a];
    while (q.length && ends.length < 2) {
      const nq = [];
      for (const x of q)
        for (const y of A[x] || [])
          if (!seen.has(y) && T.I[y] && T.I[y].tk) {
            seen.add(y);
            skel(y) ? ends.push(y) : nq.push(y);
          }
      q = nq;
    }
  }
  const d = L.bfs(A, [a]);
  const near = Object.keys(d)
    .filter(id => cOf[id] != null)
    .sort(
      (x, y) => d[x] - d[y] || Math.hypot(T.I[x].x - n.x, T.I[x].y - n.y) - Math.hypot(T.I[y].x - n.x, T.I[y].y - n.y)
    )[0];
  console.log(
    '| ' +
      [
        r[0],
        r[1],
        r[2].replace('|', '×'),
        a,
        r[5],
        r[6],
        n.x.toFixed(2),
        n.y.toFixed(2),
        r[8],
        ends.map(e => e + '(' + ringOf(e) + ')').join('–'),
        near + '（' + d[near] + ' 步；' + TH[T.I[near].th].n + '）',
        ...r.slice(9, 15)
      ].join(' | ') +
      ' |'
  );
}
