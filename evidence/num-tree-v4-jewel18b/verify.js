'use strict';
/* num-tree-v4-jewel18b 驗證：node evidence/num-tree-v4-jewel18b/verify.js <改前 ptdata.js> <改後 ptdata.js> <v4_sockets.csv>
   1. N、E、C、M 改前改後 byte-identical（JSON 字串比對＋原始檔案前綴比對）
   2. J 的 id、anchor、kind、road 對 csv
   3. 每個孔跟每個點（N）與其他孔的距離 ≥ 最小點距；列最近點
   4. 孔壓線：孔到每條線（E，弧線照 tree_bake 的 7 點折線）的最近距離；孔的連線（掛點→孔）有沒有跟 E 交叉、有沒有壓到點
   5. 加孔節點（孔接掛點）的圖，六起點 g0～g5 到每個孔要幾點（起點不算，孔本身算 1 點），對 csv */
const fs = require('fs');
const [fa, fb, fc] = process.argv.slice(2);
const load = f => {
  const s = fs.readFileSync(f, 'utf8');
  return { s, o: JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf(';'))) };
};
const A = load(fa),
  B = load(fb),
  out = [];
const log = (...a) => out.push(a.join(' '));
/* 1 */
log('## 1. N／E／C／M 比對');
for (const k of ['N', 'E', 'C', 'M']) {
  const a = JSON.stringify(A.o[k]),
    b = JSON.stringify(B.o[k]);
  log(`- ${k}：改前 ${a.length} 字元、改後 ${b.length} 字元，${a === b ? '相同' : '❌ 不同'}`);
}
const pre = A.s.slice(0, A.s.lastIndexOf('}'));
log(
  `- 原始檔：改前去掉最後的「}」＝ ${Buffer.byteLength(pre)} 位元組；改後檔案開頭同樣長度 ${B.s.startsWith(pre) ? '逐位元組相同' : '❌ 不同'}，接著是「,"J":」：${B.s.slice(pre.length, pre.length + 5) === ',"J":' ? '是' : '❌ 否'}`
);
log(`- 改後的鍵：${Object.keys(B.o).join('、')}；J ${B.o.J.length} 筆`);
/* 2 */
const csv = fs
  .readFileSync(fc, 'utf8')
  .replace(/^﻿/, '')
  .trim()
  .split('\n')
  .slice(1)
  .map(l => l.split(','));
log('\n## 2. J 對 csv（id、anchor、kind、road）');
let bad2 = 0;
csv.forEach((r, i) => {
  const j = B.o.J[i];
  if (!j || j.id !== r[0] || j.anchor !== r[3] || j.kind !== r[1] || j.road !== r[2]) bad2++, log('- ❌ ' + r[0]);
});
log(`- csv ${csv.length} 列、J ${B.o.J.length} 筆，不一致 ${bad2} 筆`);
const kinds = {};
csv.forEach(r => (kinds[r[1]] = (kinds[r[1]] || 0) + 1));
log(
  '- csv 各種類：' +
    Object.entries(kinds)
      .map(([k, v]) => k + ' ' + v)
      .join('、')
);
/* 3 */
const N = B.o.N,
  J = B.o.J,
  idx = Object.fromEntries(N.map((n, i) => [n[0], i]));
let minD = Infinity,
  minPair = null;
for (let i = 0; i < N.length; i++)
  for (let j = i + 1; j < N.length; j++) {
    const d = Math.hypot(N[i][1] - N[j][1], N[i][2] - N[j][2]);
    if (d < minD) (minD = d), (minPair = [N[i][0], N[j][0]]);
  }
log(`\n## 3. 距離（最小點距＝N 兩兩最近 ${minD.toFixed(3)}，${minPair.join('–')}）`);
const rows = [];
for (const j of J) {
  let best = [Infinity, ''],
    bestJ = [Infinity, ''];
  for (const n of N) {
    const d = Math.hypot(n[1] - j.x, n[2] - j.y);
    if (d < best[0]) best = [d, n[0]];
  }
  for (const k of J)
    if (k !== j) {
      const d = Math.hypot(k.x - j.x, k.y - j.y);
      if (d < bestJ[0]) bestJ = [d, k.id];
    }
  const a = N[idx[j.anchor]];
  rows.push({
    j,
    best,
    bestJ,
    off: Math.hypot(j.x - a[1], j.y - a[2]),
    r: Math.hypot(j.x, j.y),
    ra: Math.hypot(a[1], a[2])
  });
  log(
    `- ${j.id}：最近點 ${best[1]} ${best[0].toFixed(2)}${best[0] >= minD ? '' : ' ❌'}；最近的孔 ${bestJ[1]} ${bestJ[0].toFixed(1)}`
  );
}
/* 4 */
const P = i => N[i];
const poly = e => {
  const a = P(e[0]),
    b = P(e[1]);
  if (e.length < 5)
    return [
      [a[1], a[2]],
      [b[1], b[2]]
    ];
  const [cx, cy, r] = e.slice(2),
    a0 = Math.atan2(a[2] - cy, a[1] - cx);
  let d = Math.atan2(b[2] - cy, b[1] - cx) - a0;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const o = [];
  for (let k = 0; k <= 6; k++) o.push([cx + Math.cos(a0 + (d * k) / 6) * r, cy + Math.sin(a0 + (d * k) / 6) * r]);
  return o;
};
const segD = (x, y, A, B) => {
  const dx = B[0] - A[0],
    dy = B[1] - A[1],
    f = Math.max(0, Math.min(1, ((x - A[0]) * dx + (y - A[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - A[0] - dx * f, y - A[1] - dy * f);
};
const cross = (p, q, r, s) => {
  const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d,
    u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
  return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98;
};
const segs = [];
B.o.E.forEach(e => {
  const p = poly(e);
  for (let k = 0; k < p.length - 1; k++) segs.push({ e, a: p[k], b: p[k + 1] });
});
const NR = t => (t === 3 ? 30 : t === 4 ? 20 : t === 2 || t === 7 ? 19 : 10);
log('\n## 4. 壓線（tree_bake 的門檻：點到線 < 點半徑＋6 算壓到；小點半徑 10 → 16）');
for (const R of rows) {
  const j = R.j,
    a = N[idx[j.anchor]];
  let m = [Infinity, ''];
  for (const s of segs) {
    const d = segD(j.x, j.y, s.a, s.b);
    if (d < m[0]) m = [d, N[s.e[0]][0] + '-' + N[s.e[1]][0]];
  }
  const L = [a[1], a[2]],
    H = [j.x, j.y],
    xs = segs
      .filter(s => !s.e.slice(0, 2).includes(idx[j.anchor]) && cross(L, H, s.a, s.b))
      .map(s => N[s.e[0]][0] + '-' + N[s.e[1]][0]),
    pr = N.filter(n => n[0] !== j.anchor && segD(n[1], n[2], L, H) < NR(n[3]) + 6).map(n => n[0]);
  R.line = m;
  R.xs = [...new Set(xs)];
  R.pr = pr;
  log(
    `- ${j.id}：孔到最近的線 ${m[1]} ${m[0].toFixed(1)}；掛點→孔的連線 長 ${R.off.toFixed(1)}，跟 E 交叉 ${R.xs.length ? R.xs.join(' ') : '0'}，壓到點 ${pr.length ? pr.join(' ') : '0'}`
  );
}
/* 5 */
const adj = {};
const link = (a, b) => ((adj[a] = adj[a] || []).push(b), (adj[b] = adj[b] || []).push(a));
for (const e of B.o.E) link(N[e[0]][0], N[e[1]][0]);
for (const j of J) link(j.anchor, j.id);
const bfs = s => {
  const d = { [s]: 0 },
    q = [s];
  for (let i = 0; i < q.length; i++)
    for (const o of adj[q[i]] || []) if (d[o] === undefined) (d[o] = d[q[i]] + 1), q.push(o);
  return d;
};
const D = [0, 1, 2, 3, 4, 5].map(g => bfs('g' + g));
log('\n## 5. 六起點到孔的點數（加孔節點的圖；起點不算、孔本身算 1 點）');
let bad5 = 0;
csv.forEach((r, i) => {
  const mine = D.map(d => d[r[0]]),
    theirs = r.slice(9, 15).map(Number),
    ok = mine.every((v, k) => v === theirs[k]);
  if (!ok) bad5++;
  rows[i].steps = mine;
  log(`- ${r[0]}：${mine.join(' ')}　csv ${theirs.join(' ')}　${ok ? '相同' : '❌'}`);
});
log(`- 不一致 ${bad5} 筆`);
/* 表 */
log('\n## 18 孔總表');
log(
  '| id | kind | road | anchor | 孔 x | 孔 y | 偏移 | 孔半徑 | 最近點（距離） | 最近的線（距離） | 鬥士 | 遊俠 | 暗影 | 魔導 | 死靈 | 自然 |'
);
log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const R of rows)
  log(
    `| ${R.j.id} | ${R.j.kind} | ${R.j.road.replace('|', '×')} | ${R.j.anchor} | ${R.j.x} | ${R.j.y} | ${R.off.toFixed(1)} | ${R.r.toFixed(0)} | ${R.best[1]}（${R.best[0].toFixed(2)}） | ${R.line[1]}（${R.line[0].toFixed(1)}） | ${R.steps.join(' | ')} |`
  );
console.log(out.join('\n'));
