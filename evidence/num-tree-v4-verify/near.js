'use strict';
/* 第 3 項：每個孔 N 步內（N＝3、4、5）有幾個叢集點、幾個大點、哪些主題：node near.js <repo 根目錄> <前綴>（要先跑 analyze.js 產生 <前綴>.json 的孔） */
const fs = require('fs'),
  L = require('./lib.js');
const [root, pre] = process.argv.slice(2);
const { T, env } = L.load(root),
  TH = env.PT_THEME,
  cOf = L.clusterOf(T),
  J = JSON.parse(fs.readFileSync(pre + '.json', 'utf8')),
  A = L.adj(
    T,
    J.sockets.map(s => [s.anchor, s.id])
  ),
  nm = id => (T.I[id].big === 2 ? T.I[id].n : TH[T.I[id].th].nt[T.I[id].v][0]);
const rows = [['孔', '種類', 'N步', '叢集點數', '大點數', '基石', '主題(點數)', '大點']];
const sum = {};
for (const s of J.sockets) {
  const d = L.bfs(A, [s.id]);
  for (const N of [3, 4, 5]) {
    const ids = Object.keys(d).filter(id => d[id] <= N && id !== s.id && T.I[id]),
      cl = ids.filter(id => cOf[id] != null && !T.I[id].lock),
      th = {};
    for (const id of cl) th[TH[T.CL[cOf[id]].th].n] = (th[TH[T.CL[cOf[id]].th].n] || 0) + 1;
    const nts = cl.filter(id => T.I[id].big === 1),
      ks = ids.filter(id => T.I[id].big === 2);
    rows.push([
      s.id,
      s.kind,
      N,
      cl.length,
      nts.length,
      '"' + ks.map(nm).join(' ') + '"',
      '"' +
        Object.entries(th)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => k + '(' + v + ')')
          .join(' ') +
        '"',
      '"' + nts.map(nm).join(' ') + '"'
    ]);
    (sum[N] = sum[N] || { noNt: 0, pts: [], nts: [] }).pts.push(cl.length), sum[N].nts.push(nts.length);
    if (!nts.length) sum[N].noNt++;
  }
}
fs.writeFileSync(pre + '_near.csv', '﻿' + rows.map(r => r.join(',')).join('\n') + '\n');
for (const N in sum) {
  const p = sum[N].pts.sort((a, b) => a - b),
    n = sum[N].nts.sort((a, b) => a - b);
  console.log(
    `N=${N}：叢集點 ${p[0]}～${p.at(-1)}（中位 ${p[9]}）、大點 ${n[0]}～${n.at(-1)}（中位 ${n[9]}）、沒有大點的孔 ${sum[N].noNt}／18`
  );
}
