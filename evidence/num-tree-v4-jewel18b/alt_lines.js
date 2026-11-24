'use strict';
/* 備案（沒烘、只給數值設計師參考）：node evidence/num-tree-v4-jewel18b/alt_lines.js <ptdata.js>
   同一條射線，從掛點往外每 0.1 試一次，條件加上 tree_bake 的線規則：
   孔跟點 ≥ 最小點距、孔到線 ≥ 16、掛點→孔的連線不跟線交叉、不壓點（點半徑＋6）；取從掛點往外第一段可行範圍的盡頭。 */
const fs = require('fs'),
  path = require('path');
const { PT2_JS, pt2Rim } = require(path.join(__dirname, '../../tools/tree_bake.js'));
const s = fs.readFileSync(process.argv[2], 'utf8'),
  O = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf(';'))),
  N = O.N,
  ri = Object.fromEntries(N.map((n, i) => [n[0], i]));
let minD = Infinity;
for (let i = 0; i < N.length; i++)
  for (let j = i + 1; j < N.length; j++) minD = Math.min(minD, Math.hypot(N[i][1] - N[j][1], N[i][2] - N[j][2]));
const segD = (x, y, a, b) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      f = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x - a[0] - dx * f, y - a[1] - dy * f);
  },
  cross = (p, q, r, s) => {
    const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]);
    if (Math.abs(d) < 1e-9) return false;
    const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d,
      u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
    return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98;
  },
  NRt = t => (t === 3 ? 30 : t === 4 ? 20 : t === 2 || t === 7 ? 19 : 10);
const segs = [];
for (const e of O.E) {
  const a = N[e[0]],
    b = N[e[1]],
    P = [[a[1], a[2]]];
  if (e.length > 2) {
    const [cx, cy, r] = e.slice(2),
      a0 = Math.atan2(a[2] - cy, a[1] - cx);
    let d = Math.atan2(b[2] - cy, b[1] - cx) - a0;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    for (let k = 1; k < 6; k++) P.push([cx + Math.cos(a0 + (d * k) / 6) * r, cy + Math.sin(a0 + (d * k) / 6) * r]);
  }
  P.push([b[1], b[2]]);
  for (let k = 0; k < P.length - 1; k++) segs.push({ e, a: P[k], b: P[k + 1] });
}
const placed = [];
console.log('最小點距 ' + minD.toFixed(3) + '；孔到線 ≥ 16');
console.log('| id | anchor | 第一段可行範圍 | 偏移（最大） | 孔 x | 孔 y |');
console.log('|---|---|---|---|---|---|');
for (const [id, anchor] of PT2_JS) {
  const ai = ri[anchor],
    A = [N[ai][1], N[ai][2]],
    L = Math.hypot(...A),
    u = [A[0] / L, A[1] / L],
    cap = pt2Rim(A[0], A[1]) - L;
  const ok = d => {
    const x = Math.round((A[0] + u[0] * d) * 10) / 10,
      y = Math.round((A[1] + u[1] * d) * 10) / 10,
      H = [x, y];
    if (N.some(n => Math.hypot(n[1] - x, n[2] - y) < minD) || placed.some(p => Math.hypot(p[0] - x, p[1] - y) < minD))
      return null;
    if (segs.some(s => segD(x, y, s.a, s.b) < 16)) return null;
    if (segs.some(s => s.e[0] !== ai && s.e[1] !== ai && cross(A, H, s.a, s.b))) return null;
    if (N.some(n => n[0] !== anchor && segD(n[1], n[2], A, H) < NRt(n[3]) + 6)) return null;
    return H;
  };
  let lo = null,
    hi = null,
    H = null;
  for (let k = 1; k / 10 <= cap; k++) {
    const d = k / 10,
      h = ok(d);
    if (h) {
      if (lo == null) lo = d;
      (hi = d), (H = h);
    } else if (lo != null) break;
  }
  if (lo == null) {
    console.log(`| ${id} | ${anchor} | 沒有 | — | — | — |`);
    continue;
  }
  placed.push(H);
  console.log(
    `| ${id} | ${anchor} | +${lo.toFixed(1)}～+${hi.toFixed(1)}${hi + 0.1 > cap ? '（到外緣）' : ''} | ${hi.toFixed(1)} | ${H[0]} | ${H[1]} |`
  );
}
