'use strict';
/* num-tree-v4-jewel18c 驗證：node evidence/num-tree-v4-jewel18c/verify.js <改前 ptdata.js> <改後 ptdata.js> <v4_sockets.csv>
   1. N、E、C、M 改前改後 byte-identical
   2. J：孔數、各種類數、id／kind／road 對 csv，掛點有沒有換
   3. 每個孔：角度偏移（孔相對掛點的方向 − 掛點的半徑方向，＋＝順時針）、掛點到孔的距離、最近的點或孔
   4. 加孔節點（孔接掛點）的圖，六起點 g0～g5 到每個孔要幾點（起點不算，孔本身算 1 點）
   5. 用 tree_bake 的 pt2Socks 重算（同一份 N、E）看結果跟檔案裡的 J 一樣，列每圈 d、換掛點的原因 */
const fs = require('fs'),
  path = require('path');
const [fa, fb, fc] = process.argv.slice(2);
const load = f => {
  const s = fs.readFileSync(f, 'utf8');
  return { s, o: JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf(';'))) };
};
const A = load(fa),
  B = load(fb),
  out = [],
  log = (...a) => out.push(a.join(' '));
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
const csv = fs
  .readFileSync(fc, 'utf8')
  .replace(/^﻿/, '')
  .trim()
  .split('\n')
  .slice(1)
  .map(l => l.split(','));
const N = B.o.N,
  E = B.o.E,
  J = B.o.J,
  idx = Object.fromEntries(N.map((n, i) => [n[0], i]));
log('\n## 2. J 對 csv');
let bad = 0;
const kinds = {};
csv.forEach((r, i) => {
  const j = J[i];
  if (!j || j.id !== r[0] || j.kind !== r[1] || j.road !== r[2]) bad++, log('- ❌ ' + r[0]);
  if (j && j.anchor !== r[3]) log(`- 換掛點：${j.id} ${r[3]} → ${j.anchor}`);
});
J.forEach(j => (kinds[j.kind] = (kinds[j.kind] || 0) + 1));
log(`- csv ${csv.length} 列、J ${J.length} 筆，id／kind／road 不一致 ${bad} 筆`);
log(
  '- J 各種類：' +
    Object.entries(kinds)
      .map(([k, v]) => k + ' ' + v)
      .join('、')
);
const keys = ['id', 'anchor', 'x', 'y', 'kind', 'road'];
log('- 每筆都有 ' + keys.join('、') + '：' + (J.every(j => keys.every(k => j[k] != null)) ? '是' : '❌ 否'));
/* 4 */
const adj = {};
for (const n of N) adj[n[0]] = [];
for (const e of E) adj[N[e[0]][0]].push(N[e[1]][0]), adj[N[e[1]][0]].push(N[e[0]][0]);
for (const j of J) adj[j.anchor].push(j.id), (adj[j.id] = [j.anchor]);
const bfs = s => {
  const d = { [s]: 0 },
    q = [s];
  for (let h = 0; h < q.length; h++) for (const o of adj[q[h]]) if (d[o] === undefined) (d[o] = d[q[h]] + 1), q.push(o);
  return d;
};
const DS = [0, 1, 2, 3, 4, 5].map(g => bfs('g' + g));
const deg = (x, y) => ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
log('\n## 3. 18 孔');
log(
  '| id | kind | road | 原掛點 | 最終掛點 | 孔 x | 孔 y | 角度偏移 | 掛點→孔 | 最近點（距離） | 鬥士 | 遊俠 | 暗影 | 魔導 | 死靈 | 自然 | csv 點數 |'
);
log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
let diffCsv = 0;
J.forEach((j, i) => {
  const a = N[idx[j.anchor]];
  let off = deg(j.x - a[1], j.y - a[2]) - deg(a[1], a[2]);
  off = ((off + 540) % 360) - 180;
  let best = [Infinity, ''];
  for (const n of N) {
    const d = Math.hypot(n[1] - j.x, n[2] - j.y);
    if (d < best[0]) best = [d, n[0]];
  }
  for (const k of J)
    if (k !== j) {
      const d = Math.hypot(k.x - j.x, k.y - j.y);
      if (d < best[0]) best = [d, k.id];
    }
  const c = DS.map(d => d[j.id]),
    cc = csv[i].slice(9, 15).map(Number),
    same = c.every((v, k) => v === cc[k]);
  if (!same) diffCsv++;
  log(
    `| ${j.id} | ${j.kind} | ${j.road.replace('|', '×')} | ${csv[i][3]} | ${j.anchor === csv[i][3] ? j.anchor : j.anchor + '（變更）'} | ${j.x} | ${j.y} | ${off.toFixed(1)} | ${Math.hypot(j.x - a[1], j.y - a[2]).toFixed(1)} | ${best[1]}（${best[0].toFixed(2)}） | ${c.join(' | ')} | ${same ? '同' : cc.join('／')} |`
  );
});
log(`- 六起點點數跟 csv 不同的孔：${diffCsv}`);
/* 5 */
const TB = require(path.resolve(__dirname, '../../tools/tree_bake.js')),
  SK = TB.pt2Socks(N, E);
log('\n## 4. 用 pt2Socks 重算');
log('- 最小點距 ' + SK.minD.toFixed(3));
for (const [k, v] of Object.entries(SK.ringD))
  log(
    `- ${k}：d＝${v.d.toFixed(2)}（${v.n} 條線的中位數，最短 ${v.min.toFixed(1)}、最長 ${v.max.toFixed(1)}）→ 範圍 ${(0.6 * v.d).toFixed(1)}～${(1.5 * v.d).toFixed(1)}`
  );
log(
  '- 重算的 J 跟檔案相同：' +
    (JSON.stringify(SK.J) === JSON.stringify(J) ? '是' : '❌ 否') +
    '；放不下 ' +
    SK.fail.length
);
for (const o of SK.info) {
  log(
    `- ${o.id}：${o.th}°、${o.f}d（${o.L.toFixed(1)}）${o.anchor !== o.anchor0 ? '，掛點 ' + o.anchor0 + '→' + o.anchor : ''}`
  );
  if (o.anchor !== o.anchor0) {
    log(
      `  - 原掛點 ${o.anchor0} 190 個候選全不過；第一個候選（0°、0.6d）卡在：${o.first0.w}；各規則（第一條不過的）次數：${JSON.stringify(o.why0)}`
    );
    for (const t of o.alts)
      log(
        `  - 替代點 ${t.id}（離原掛點 ${t.dist.toFixed(1)}）：${t.ok ? '放得下' : '放不下 ' + JSON.stringify(t.why)}`
      );
  }
}
console.log(out.join('\n'));
