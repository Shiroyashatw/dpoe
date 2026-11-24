'use strict';
/* num-tree-v3-verify（沿用 v1 腳本） 主分析：node analyze.js <repo 根目錄> <輸出前綴>
   1. 依調整書第 3 節原則自動挑 18 個孔點（每條路：前期、交會、外圈大孔），算 6 起點 × 18 孔的最短點數
   2. Lv100（129）、Lv300（149）一般 build 點得到幾個孔
   3. 十字弓叢集、閃避／偏斜叢集到遊俠、暗影起點的點數
   4. 每個孔 3 步內的主題叢集
   孔點的做法：孔＝新的一個點，掛在一個幹道能力值點旁邊（葉子，不擋路），點到孔要 1 點：
   「到孔的點數」＝起點到掛點的步數＋1（起點本身不算點）。 */
const fs = require('fs'),
  path = require('path'),
  L = require('./lib.js');
const [root, outPre] = process.argv.slice(2);
const { T, env, pts, ctx } = L.load(root);
/* data.js 用這份 ptdata 組好的 PTREE（每個點的 .s 已填好效果） */
const PT = require('vm').runInContext('PTREE', ctx);
const TH = env.PT_THEME,
  ROADN = env.PT_ROADS.map(r => r.n.replace('之路', '')),
  A0 = L.adj(T),
  G = [0, 1, 2, 3, 4, 5].map(g => 'g' + g),
  D = G.map(s => L.bfs(A0, [s])),
  cOf = L.clusterOf(T),
  rad = n => Math.hypot(n.x, n.y),
  nm = id => {
    const n = T.I[id];
    return n.big === 2 ? n.n : n.big ? TH[n.th].nt[n.v][0] : TH[n.th].n;
  };
/* 叢集主題（含叢集接叢集的子叢集）；起點模板 s{g}… 不算叢集 */
const clTh = i => TH[T.CL[i].th].n;
/* 某點 k 步內的點 */
const within = (src, k, A = A0) => {
  const d = L.bfs(A, [src]);
  return Object.keys(d).filter(id => d[id] <= k);
};
/* 屬於第 g 條路的主題：rg[g] ≥ 3，或固定擺法主題（rg 全 0）叢集在這條路上 */
const roadTheme = (th, g, node) => TH[th].rg[g] >= 3 || (TH[th].rg.every(x => !x) && node && L.roadOf(node) === g);

/* ---------- 1. 挑孔點 ---------- */
const trunk = T.N.filter(n => n.tk);
const used = new Set();
const sockets = [];
const scoreNear = (anchor, pred) => {
  /* 孔 3 步內＝掛點 2 步內 */
  const ids = within(anchor.id, 2).filter(id => cOf[id] != null);
  return ids.filter(id => pred(T.I[id])).length;
};
/* 原則 3：孔不放在任何起點前 10 點內（到孔點數＝掛點步數＋1）；前期孔在入門叢集後面一點＝中環以內 */
const EARLY_R = +(process.env.EARLY_R || 2300);
let EARLY = EARLY_R;
const JMIN = +(process.env.JMIN || 1700),
  OTHER_MIN = +(process.env.OTHER_MIN || 10);
const minAll = n => Math.min(...D.map(d => d[n.id] + 1));
const farFromOthers = a => sockets.every(s => L.bfs(A0, [a.id])[s.anchor] >= 4);
for (let g = 0; g < 6; g++) {
  const ownD = D[g];
  /* 前期孔：到孔 10～15 點、在這條路上、旁邊 2 步內的主題叢集點越多越好，同分選靠近 12 點的 */
  let early = null;
  for (const er of [EARLY_R, 2600, 3000, 9999]) {
    EARLY = er;
    early = trunk
      .filter(
        n =>
          L.roadOf(n) === g &&
          ownD[n.id] + 1 >= 10 &&
          ownD[n.id] + 1 <= 15 &&
          rad(n) <= EARLY &&
          minAll(n) >= 10 &&
          !used.has(n.id)
      )
      .map(n => ({ n, sc: scoreNear(n, x => roadTheme(x.th, g, x)), d: ownD[n.id] + 1 }))
      .sort((a, b) => b.sc - a.sc || Math.abs(a.d - 12) - Math.abs(b.d - 12) || a.d - b.d)[0];
    if (early) break;
  }
  if (!early) throw new Error('第 ' + g + ' 條路找不到前期孔');
  used.add(early.n.id);
  sockets.push({ id: 'J' + g + 'a', kind: '前期', road: g, anchor: early.n.id, relax: 'r≤' + EARLY });
}
for (let g = 0; g < 6; g++) {
  /* 交會孔：第 g 與 g+1 條路的交界（角度 g×60+30），中段半徑 1700～2800；兩條路的主題叢集都在 2 步內，
     分數＝兩邊較少的那一邊（取捨要兩邊都有），同分選兩個起點平均點數少的 */
  const g2 = (g + 1) % 6,
    bd = g * 60 + 30,
    ang = n => Math.abs(((L.deg(n) - bd + 540) % 360) - 180);
  let c = null,
    JA = 15,
    JR = 2800;
  for (const [ja, jr] of [
    [15, Math.max(2800, JMIN + 400)],
    [22, Math.max(2800, JMIN + 400)],
    [22, Math.max(3100, JMIN + 600)],
    [30, 3600]
  ]) {
    (JA = ja), (JR = jr);
    c = trunk
      .filter(
        n => ang(n) <= JA && rad(n) >= JMIN && rad(n) <= JR && minAll(n) >= 10 && !used.has(n.id) && farFromOthers(n)
      )
      .map(n => {
        const a = scoreNear(n, x => roadTheme(x.th, g, x)),
          b = scoreNear(n, x => roadTheme(x.th, g2, x));
        return { n, sc: Math.min(a, b), tot: a + b, d: (D[g][n.id] + D[g2][n.id]) / 2 + 1 };
      })
      .sort((a, b) => b.sc - a.sc || b.tot - a.tot || a.d - b.d)[0];
    if (c) break;
  }
  if (!c) throw new Error('交會孔找不到 ' + g);
  c.relax = JA + '°/' + JR;
  used.add(c.n.id);
  sockets.push({ id: 'J' + g + 'b', kind: '交會', road: g, road2: g2, anchor: c.n.id, relax: c.relax });
}
for (let g = 0; g < 6; g++) {
  /* 外圈大孔：這條路、半徑 ≥ 3000；旁邊 2 步內這條路的武器專精叢集點＋基石越多越好，同分選近的 */
  const c = trunk
    .filter(n => L.roadOf(n) === g && rad(n) >= 3000 && minAll(n) >= 10 && !used.has(n.id) && farFromOthers(n))
    .map(n => {
      const ids = within(n.id, 2);
      const wp = ids.filter(id => cOf[id] != null && TH[T.I[id].th].wp && TH[T.I[id].th].rg[g] >= 3).length,
        ks = ids.filter(id => T.I[id].big === 2).length;
      return { n, sc: wp + 3 * ks, d: D[g][n.id] + 1 };
    })
    .sort((a, b) => b.sc - a.sc || a.d - b.d)[0];
  if (!c) throw new Error('外圈孔找不到 ' + g);
  used.add(c.n.id);
  sockets.push({ id: 'J' + g + 'c', kind: '外圈大孔', road: g, anchor: c.n.id });
}
/* 孔點加進圖：孔是新的葉子點 */
const extra = sockets.map(s => [s.anchor, s.id]);
const A = L.adj(T, extra);
const DS = G.map(s => L.bfs(A, [s]));
/* 起點本身不算點：到孔的點數＝步數 */
const table = sockets.map(s => G.map((_, g) => DS[g][s.id]));

/* ---------- 4（任務 6）：每個孔 3 步內的主題叢集 ---------- */
for (const s of sockets) {
  const d = L.bfs(A, [s.id]),
    cls = {};
  for (const id of Object.keys(d))
    if (d[id] <= 3 && cOf[id] != null) {
      const ci = cOf[id];
      cls[ci] = cls[ci] || { th: clTh(ci), n: 0, nt: [] };
      cls[ci].n++;
      if (T.I[id].big === 1) cls[ci].nt.push(nm(id));
    }
  s.near = Object.values(cls);
  s.ks = Object.keys(d)
    .filter(id => d[id] <= 3 && T.I[id] && T.I[id].big === 2)
    .map(nm);
  const n = T.I[s.anchor];
  s.x = Math.round(n.x);
  s.y = Math.round(n.y);
  s.deg = Math.round(L.deg(n));
  s.r = Math.round(rad(n));
}

/* ---------- 2. build 模擬 ---------- */
/* 目標：這條路主題的大點（價值 1），孔（價值 V）；每次挑「價值 ÷ 還要幾點」最高的，把路徑點起來，點數用完為止 */
function build(g, budget, V) {
  const alloc = new Set([G[g]]),
    sockSet = new Set(sockets.map(s => s.id));
  const isTarget = id => {
    const n = T.I[id];
    return n && n.big === 1 && !n.gate && roadTheme(n.th, g, n);
  };
  let spent = 0,
    nts = 0,
    sock = [],
    sockPts = 0;
  for (;;) {
    const { d, p } = L.bfsP(A, [...alloc]);
    let best = null;
    for (const id of Object.keys(d)) {
      if (alloc.has(id) || d[id] > budget - spent) continue;
      const v = sockSet.has(id) ? V : isTarget(id) ? 1 : 0;
      if (!v) continue;
      const r = v / d[id];
      if (!best || r > best.r || (r === best.r && d[id] < best.c)) best = { id, r, c: d[id] };
    }
    if (!best) break;
    let x = best.id;
    const path = [];
    while (!alloc.has(x)) path.push(x), (x = p[x]);
    for (const id of path) {
      alloc.add(id);
      if (isTarget(id)) nts++;
      if (sockSet.has(id)) sock.push(id);
    }
    if (sockSet.has(best.id)) sockPts += best.c;
    spent += best.c;
  }
  /* 順路孔：再 1 點就點得到的孔 */
  const adj1 = sockets.filter(s => !alloc.has(s.id) && alloc.has(s.anchor)).map(s => s.id);
  /* 剩的點數補最近的孔（不管大點）：還能多拿幾個孔 */
  return { spent, nts, sock, sockPts, adj1 };
}
const builds = [];
for (let g = 0; g < 6; g++)
  for (const P of pts)
    for (const V of [0, 1, 2]) {
      const b = build(g, P, V);
      builds.push({ g, P, V, ...b });
    }
/* 只拿孔：把全部點數拿去點孔（最省路徑），上限 */
function sockOnly(g, budget) {
  const alloc = new Set([G[g]]),
    got = [];
  let spent = 0;
  for (;;) {
    const { d, p } = L.bfsP(A, [...alloc]);
    const c = sockets.filter(s => !alloc.has(s.id) && d[s.id] <= budget - spent).sort((a, b) => d[a.id] - d[b.id])[0];
    if (!c) break;
    let x = c.id;
    while (!alloc.has(x)) alloc.add(x), (x = p[x]);
    spent += d[c.id];
    got.push(c.id);
  }
  return { got, spent };
}

/* ---------- 3. 十字弓、閃避／偏斜 ---------- */
const clDist = (g, pred) =>
  T.CL.map((c, i) => [c, i])
    .filter(([c, i]) => pred(c, i))
    .map(([c, i]) => ({
      ci: i,
      th: clTh(i),
      road: L.roadOf(c),
      entry: Math.min(...c.ids.map(id => D[g][id])),
      nts: c.ids.filter(id => T.I[id].big === 1).map(id => [nm(id), D[g][id]]),
      st: c.st ? 1 : 0,
      x: Math.round(c.x),
      y: Math.round(c.y)
    }))
    .sort((a, b) => a.entry - b.entry);
const XB = env.PT_TH['十字弓術'],
  GR = env.PT_TH['榴彈'];
/* 含叢集接叢集的子叢集（docs/天賦樹設計.md 的「十字弓 5／7」是連子叢集一起數） */
const xbow = clDist(1, c => c.th === XB);
for (const x of xbow) x.child = T.CL[x.ci].par != null ? 1 : 0;
const gren = clDist(1, c => c.th === GR);
for (const x of xbow) {
  const c = T.CL[x.ci];
  x.nearGrenade = gren.length ? Math.round(Math.min(...gren.map(gc => Math.hypot(gc.x - c.x, gc.y - c.y)))) : null;
}
const EV = env.PT_TH['身法'],
  DF = env.PT_TH['偏斜'];
const avoid = {};
for (const g of [1, 2])
  for (const [k, th] of [
    ['身法', EV],
    ['偏斜', DF]
  ]) {
    const L2 = clDist(g, c => c.th === th);
    /* 起點模板上有這個主題的小點（s{g}…）：最近一個 */
    const tmpl = T.N.filter(n => n.id.startsWith('s' + g) && n.st && n.th === th && !n.big).map(n => D[g][n.id]);
    /* 依效果：有閃避（evF、evP、surrEv）／偏斜（defl、evAsDefl、lukDefl）的最近一個點 */
    const KEYS = k === '身法' ? ['evF', 'evP', 'surrEv'] : ['defl', 'evAsDefl', 'lukDefl'],
      byStat = PT.N.filter(n => n.s && KEYS.some(x => n.s[x]))
        .map(n => ({ id: n.id, d: D[g][n.id], big: n.big ? 1 : 0, name: n.big ? n.n : '' }))
        .sort((a, b) => a.d - b.d);
    avoid[ROADN[g] + '→' + k] = {
      nearestStatNode: byStat[0],
      nearestStatNotable: byStat.find(x => x.big),
      statNodesWithin10: byStat.filter(x => x.d <= 10).length,
      clusters: L2.slice(0, 3).map(c => ({
        entry: c.entry,
        road: ROADN[c.road],
        st: c.st,
        nts: c.nts.map(z => z.join(':')).join('/')
      })),
      nearestCluster: L2.length ? L2[0].entry : null,
      templateNodes: tmpl.sort((a, b) => a - b)
    };
  }

/* ---------- 起點到大點（check.js 同口徑：六起點多源） ---------- */
const Dall = L.bfs(A0, G);
const ntD = T.N.filter(n => n.big === 1 && !n.gate && !n.lock)
  .map(n => Dall[n.id])
  .sort((a, b) => a - b);

/* ---------- 輸出 ---------- */
const out = {
  root,
  points: pts,
  N: T.N.length,
  CL: T.CL.length,
  sockets,
  table,
  within40: G.map((_, g) => table.filter(r => r[g] <= 40).length),
  ownEarly: [0, 1, 2, 3, 4, 5].map(g => table[g][g]),
  builds,
  sockOnly: [0, 1, 2, 3, 4, 5].flatMap(g => pts.map(P => ({ g, P, ...sockOnly(g, P) }))),
  xbow,
  gren,
  avoid,
  startToNotable: {
    nearest: ntD[0],
    tenth: ntD[9],
    avg: +(ntD.reduce((a, b) => a + b, 0) / ntD.length).toFixed(1),
    far: ntD.at(-1)
  }
};
fs.writeFileSync(outPre + '.json', JSON.stringify(out, null, 1));
/* CSV */
const csv = (f, rows) => fs.writeFileSync(f, '﻿' + rows.map(r => r.join(',')).join('\n') + '\n');
csv(outPre + '_sockets.csv', [
  [
    '孔',
    '種類',
    '路',
    '掛點(幹道能力值點)',
    '挑選放寬',
    'x',
    'y',
    '角度',
    '半徑',
    ...ROADN.map(r => r + '起點→孔點數'),
    '3步內主題叢集(點數)',
    '3步內大點',
    '3步內基石'
  ],
  ...sockets.map((s, i) => [
    s.id,
    s.kind,
    ROADN[s.road] + (s.road2 != null ? '|' + ROADN[s.road2] : ''),
    s.anchor,
    s.relax || '',
    s.x,
    s.y,
    s.deg,
    s.r,
    ...table[i],
    '"' + s.near.map(c => c.th + '(' + c.n + ')').join(' ') + '"',
    '"' + s.near.flatMap(c => c.nt).join(' ') + '"',
    '"' + s.ks.join(' ') + '"'
  ])
]);
csv(outPre + '_builds.csv', [
  [
    '職業(路)',
    '天賦點',
    '孔價值V(大點=1)',
    '點到的主題大點',
    '點到的孔數',
    '孔id',
    '只為孔花的點',
    '再1點就有的孔',
    '總花費'
  ],
  ...builds.map(b => [ROADN[b.g], b.P, b.V, b.nts, b.sock.length, b.sock.join(' '), b.sockPts, b.adj1.length, b.spent])
]);
csv(outPre + '_sockonly.csv', [
  ['職業(路)', '天賦點', '全部點數只拿孔：孔數', '花費', '孔id'],
  ...out.sockOnly.map(b => [ROADN[b.g], b.P, b.got.length, b.spent, b.got.join(' ')])
]);
csv(outPre + '_xbow.csv', [
  ['叢集', '子叢集', '路', '遊俠起點→叢集入口點數', '叢集大點(名:點數)', '離最近遊俠榴彈叢集的距離(座標)'],
  ...xbow.map(x => [
    x.ci,
    x.child,
    ROADN[x.road],
    x.entry,
    '"' + x.nts.map(z => z.join(':')).join(' ') + '"',
    x.nearGrenade
  ])
]);
console.log(
  JSON.stringify({
    N: out.N,
    CL: out.CL,
    within40: out.within40,
    ownEarly: out.ownEarly,
    startToNotable: out.startToNotable
  })
);
