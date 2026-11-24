'use strict';
/* num-tree-v3-verify（沿用 v1 腳本）：載入某個 repo 根目錄（正式或 scratch 副本）的 data.js 與 tree_bake.js，重建天賦樹（含叢集） */
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
function load(root) {
  root = path.resolve(root);
  const J = f => fs.readFileSync(path.join(root, 'js', f), 'utf8');
  const ctx = {
    console: { log() {}, warn() {}, error: console.error },
    Math,
    Date,
    JSON,
    Object,
    Array,
    URLSearchParams,
    location: { search: '' },
    PAL_CSS: fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8')
  };
  vm.createContext(ctx);
  for (const f of ['palette.js', 'ptdata.js', 'data.js']) vm.runInContext(J(f), ctx, { filename: f });
  const env = vm.runInContext('({ PT_THEME, PT_TH, PT_RW, PT_KEYS, PT_ROADS, PT_RSV, PT_STARTS, PT_FIX })', ctx);
  const bake = path.join(root, 'tools', 'tree_bake.js');
  delete require.cache[require.resolve(bake)];
  const { ptreeGen2 } = require(bake);
  /* 烘焙工具放不下入門叢集時會 console.log：收起來，放到 T.log */
  const log0 = console.log,
    LOG = [];
  console.log = (...a) => LOG.push(a.join(' '));
  const T = ptreeGen2(env);
  console.log = log0;
  T.log = LOG;
  const B = vm.runInContext('PT_BAKE', ctx);
  const same = T.N.length === B.N.length && T.N.every((n, i) => n.id === B.N[i][0] && Math.abs(n.x - B.N[i][1]) < 0.06);
  const pts = vm.runInContext('typeof ptPoints === "function" ? [ptPoints(100), ptPoints(300)] : null', ctx);
  return { T, env, sameAsPtdata: same, pts, ctx };
}
/* 鄰接表（含額外的孔點） */
function adj(T, extra = []) {
  const A = {};
  for (const n of T.N) A[n.id] = [];
  for (const [a, b] of T.E) A[a].push(b), A[b].push(a);
  for (const [a, b] of extra) (A[a] = A[a] || []).push(b), (A[b] = A[b] || []).push(a);
  return A;
}
function bfs(A, src) {
  const d = {},
    q = [...src];
  src.forEach(s => (d[s] = 0));
  for (let h = 0; h < q.length; h++) for (const o of A[q[h]]) if (d[o] === undefined) (d[o] = d[q[h]] + 1), q.push(o);
  return d;
}
/* 多源 BFS 帶前驅（從已點的集合出發），回傳距離與前驅 */
function bfsP(A, src) {
  const d = {},
    p = {},
    q = [...src];
  src.forEach(s => (d[s] = 0));
  for (let h = 0; h < q.length; h++)
    for (const o of A[q[h]]) if (d[o] === undefined) (d[o] = d[q[h]] + 1), (p[o] = q[h]), q.push(o);
  return { d, p };
}
const deg = n => ((Math.atan2(n.x, -n.y) * 180) / Math.PI + 360) % 360;
const roadOf = n => Math.round(deg(n) / 60) % 6;
/* 每個點屬於哪個叢集（T.CL 的 ids）；起點模板 s{g}… 另算 */
function clusterOf(T) {
  const m = {};
  T.CL.forEach((c, i) => c.ids.forEach(id => (m[id] = i)));
  return m;
}
module.exports = { load, adj, bfs, bfsP, deg, roadOf, clusterOf };
