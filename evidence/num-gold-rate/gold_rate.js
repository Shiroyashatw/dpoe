/* num-gold-rate：主幹每個地點（world.js TRUNK 第 1～22 個）、1★、沒有地圖詞，每分鐘的金與靈魂（小怪／菁英／王分開）。
   一輪＝NS 隻小怪（40）＋eliteCount(1) 隻菁英＋1 隻王（跟 num-mat-sources／num-mat-v12 的模擬同一套）。
   金：照 game.js killMob 的式子（掉率 小怪 0.4／菁英、王 1；量 Math.round(rnd(2,6)×(1+0.5t)×{1,3,12})）。
   靈魂：照 craft.js killMat（Math.round([1,10,100][k]×(1+0.2(t−1)))），蒙地卡羅直接呼叫遊戲的 killMat。
   兩種節奏：s100（一輪 100 秒）、s150（一輪 150 秒）。
   用法：node evidence/num-gold-rate/gold_rate.js  → 同目錄 gold_rate.csv、gold_rate_mc.csv、game_ns.csv、result.json */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const REPO = path.join(__dirname, '..', '..'),
  OUT = __dirname;
const NS = 40,
  ROUNDS = 600,
  SEEDS = [20261115, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  PACE = [
    ['s100', 100],
    ['s150', 150]
  ];
let seed = 0;
const rand = () => {
  let t = (seed += 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const M = Object.create(Math);
M.random = rand;
const ctx = { console, Math: M, Date, JSON, Object, Array, location: { search: '' }, URLSearchParams };
vm.createContext(ctx);
for (const f of ['palette.js', 'ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'world.js'])
  vm.runInContext(fs.readFileSync(path.join(REPO, 'js', f), 'utf8'), ctx, { filename: f });
const R = s => vm.runInContext(s, ctx);
const fresh = () =>
  R(`S = { lv: 1, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: {} }, prd: PRD0(), inv: { items: [] }, camp: newCamp(),
    auto2: { ...AUTO2(), up: 0 }, world: newWorld(), gold: 0, star: 1, rounds: [], eq: {}, lib: {}, idols: [], frags: newFrags ? newFrags() : {} }; 0`);
fresh();
const nodes = R(
  `TRUNK.map((n, i) => ({ i: i + 1, n: n.n, g: n.g, lv: n.lv, t: lvT(n.lv), T: matTier(n.lv), k: TRUNK_K[i], wsm: wSoulMin(n.lv) }))`
);
const elDist = R(`STAR_DROP[1].el`); /* [1, 2] → irnd 平均 1.5 */
const EN = (elDist[0] + elDist[1]) / 2;
const soulOf = (k, t) => Math.round([1, 10, 100][k] * (1 + 0.2 * (t - 1)));

/* ---------- 期望值 ---------- */
const exp = [];
for (const [pk, sec] of PACE)
  for (const n of nodes) {
    const f = 60 / sec,
      base = 4 * (1 + 0.5 * n.t) /* rnd(2,6) 平均 4 */,
      gS = NS * 0.4 * base * f,
      gE = EN * base * 3 * f,
      gB = base * 12 * f,
      sS = NS * soulOf(0, n.t) * f,
      sE = EN * soulOf(1, n.t) * f,
      sB = soulOf(2, n.t) * f;
    exp.push({ pk, sec, ...n, gS, gE, gB, g: gS + gE + gB, sS, sE, sB, s: sS + sE + sB });
  }

/* ---------- 蒙地卡羅：每個種子、每個地點 600 輪；走遊戲的 eliteCount、killMat 與 killMob 的掉金式子 ---------- */
const q = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const mc = {};
for (const n of nodes) {
  const per = []; /* 每一輪 [gS, gE, gB, sS, sE, sB] */
  const seedMean = [];
  for (const sd of SEEDS) {
    seed = sd;
    fresh();
    const L = R(`(() => {
      S.world.cur = ${JSON.stringify(n.k)};
      const t = ${n.t}, out = [];
      const gold = (boss, elite) => Math.random() < (boss || elite ? 1 : 0.4) ? Math.round(rnd(2, 6) * (1 + t * 0.5) * (boss ? 12 : elite ? 3 : 1)) : 0;
      for (let r = 0; r < ${ROUNDS}; r++) {
        const nE = eliteCount(1), od = { star: 1, p: mapCurP(1, ${NS}, nE), ilvl: tierIlvl(t), tier: t };
        const v = [0, 0, 0, 0, 0, 0];
        let s0;
        for (let i = 0; i < ${NS}; i++) { s0 = MAT().soul; const g = killMat({}, t, od); v[3] += MAT().soul - s0 + (g.pack || 0); v[0] += gold(0, 0); }
        for (let i = 0; i < nE; i++) { s0 = MAT().soul; const g = killMat({ elite: 1 }, t, { ...od, ei: i + 1 }); v[4] += MAT().soul - s0 + (g.pack || 0); v[1] += gold(0, 1); }
        s0 = MAT().soul; const b = killMat({ boss: 1 }, t, od); v[5] += MAT().soul - s0 + (b.pack || 0); v[2] += gold(1, 0);
        S.rounds.push({ d: 150, nS: ${NS}, nE }); if (S.rounds.length > 10) S.rounds.shift();
        out.push(v);
      }
      return out;
    })()`);
    per.push(...L);
    seedMean.push(L.reduce((a, v) => a + v[0] + v[1] + v[2], 0) / L.length);
  }
  mc[n.i] = { per, seedMean };
}
const mcRows = [];
for (const [pk, sec] of PACE)
  for (const n of nodes) {
    const f = 60 / sec,
      P = mc[n.i].per,
      col = j => P.map(v => v[j] * f),
      tot = (a, b, c) => P.map(v => (v[a] + v[b] + v[c]) * f),
      mean = a => a.reduce((x, y) => x + y, 0) / a.length,
      e = exp.find(x => x.pk === pk && x.i === n.i),
      gT = tot(0, 1, 2),
      sT = tot(3, 4, 5);
    const row = { pk, i: n.i, n: n.n };
    ['gS', 'gE', 'gB'].forEach((k, j) =>
      Object.assign(row, { [k + '50']: q(col(j), 0.5), [k + '90']: q(col(j), 0.9), [k + 'm']: mean(col(j)) })
    );
    ['sS', 'sE', 'sB'].forEach((k, j) =>
      Object.assign(row, {
        [k + '50']: q(col(j + 3), 0.5),
        [k + '90']: q(col(j + 3), 0.9),
        [k + 'm']: mean(col(j + 3))
      })
    );
    Object.assign(row, {
      g50: q(gT, 0.5),
      g90: q(gT, 0.9),
      gm: mean(gT),
      s50: q(sT, 0.5),
      s90: q(sT, 0.9),
      sm: mean(sT),
      gDiff: (mean(gT) / e.g - 1) * 100,
      sDiff: (mean(sT) / e.s - 1) * 100,
      seedLo: Math.min(...mc[n.i].seedMean) * f,
      seedHi: Math.max(...mc[n.i].seedMean) * f
    });
    mcRows.push(row);
  }

/* ---------- 對照：遊戲實際一輪打倒的小怪數（game.js enterMap 的群數、菁英、craft.js mapKills），不進主表 ---------- */
seed = 20261115;
fresh();
const gameNS = R(`(() => {
  const res = [];
  const splitN = PACKS.map(p => p.filter(n => MOBS[n].split).length);
  for (const n of TRUNK) {
    const t = lvT(n.lv);
    let sk = 0, sm = 0, el = 0, sp = 0; const N = 20000;
    for (let r = 0; r < N; r++) {
      const nR = Math.min(23, 8 + Math.floor(t / 3)), counts = Array.from({ length: nR }, () => irnd(2, 3)), total = counts.reduce((a, b) => a + b, 0),
        nEl = Math.min(total, eliteCount(1));
      let small = 0, s = 0;
      for (let pk = 1; pk <= total; pk++) { const j = Math.floor(Math.random() * PACKS.length); small += PACKS[j].length - (pk <= nEl ? 1 : 0); s += splitN[j]; }
      sk += mapKills(small, nEl); sm += small; el += nEl; sp += s;
    }
    res.push({ n: n.n, lv: n.lv, nR: Math.min(23, 8 + Math.floor(t / 3)), small: sm / N, kills: sk / N, el: el / N, split: sp / N });
  }
  return { res, splitMobs: Object.keys(MOBS).filter(k => MOBS[k].split) };
})()`);

/* ---------- 輸出 ---------- */
const r1 = v => Math.round(v * 10) / 10;
const H1 =
  '節奏,地點序,地點名,區域,怪物Lv,t,材料階,小怪金/分,菁英金/分,王金/分,合計金/分,小怪靈魂/分,菁英靈魂/分,王靈魂/分,合計靈魂/分';
fs.writeFileSync(
  path.join(OUT, 'gold_rate.csv'),
  [
    H1,
    ...exp.map(e =>
      [
        e.pk,
        e.i,
        e.n,
        nodes[e.i - 1].g,
        e.lv,
        e.t.toFixed(4),
        e.T,
        ...[e.gS, e.gE, e.gB, e.g, e.sS, e.sE, e.sB, e.s].map(r1)
      ].join(',')
    )
  ].join('\n') + '\n'
);
const H2 =
  '節奏,地點序,地點名,小怪金/分P50,小怪金/分P90,菁英金/分P50,菁英金/分P90,王金/分P50,王金/分P90,合計金/分P50,合計金/分P90,合計金/分MC平均,金MC對期望%,' +
  '小怪靈魂/分P50,小怪靈魂/分P90,菁英靈魂/分P50,菁英靈魂/分P90,王靈魂/分P50,王靈魂/分P90,合計靈魂/分P50,合計靈魂/分P90,合計靈魂/分MC平均,靈魂MC對期望%,各種子平均金/分最低,各種子平均金/分最高';
fs.writeFileSync(
  path.join(OUT, 'gold_rate_mc.csv'),
  [
    H2,
    ...mcRows.map(m =>
      [
        m.pk,
        m.i,
        m.n,
        ...[
          'gS50',
          'gS90',
          'gE50',
          'gE90',
          'gB50',
          'gB90',
          'g50',
          'g90',
          'gm',
          'gDiff',
          'sS50',
          'sS90',
          'sE50',
          'sE90',
          'sB50',
          'sB90',
          's50',
          's90',
          'sm',
          'sDiff',
          'seedLo',
          'seedHi'
        ].map(k => (k.endsWith('Diff') ? m[k].toFixed(2) : r1(m[k])))
      ].join(',')
    )
  ].join('\n') + '\n'
);
fs.writeFileSync(
  path.join(OUT, 'game_ns.csv'),
  [
    '地點,怪物Lv,群數nR,小怪總數平均,王前打倒小怪mapKills平均,菁英平均,會分裂的怪平均',
    ...gameNS.res.map(x => [x.n, x.lv, x.nR, r1(x.small), r1(x.kills), x.el.toFixed(3), x.split.toFixed(2)].join(','))
  ].join('\n') + '\n'
);
fs.writeFileSync(
  path.join(OUT, 'result.json'),
  JSON.stringify({ NS, ROUNDS, SEEDS, EN, elDist, exp, mcRows, gameNS }, null, 1)
);
console.log('EN', EN, 'splitMobs', gameNS.splitMobs);
for (const m of mcRows)
  console.log(
    m.pk,
    m.i,
    m.n,
    'g',
    r1(exp.find(e => e.pk === m.pk && e.i === m.i).g),
    r1(m.gm),
    m.gDiff.toFixed(2) + '%',
    's',
    r1(m.sm),
    m.sDiff.toFixed(2) + '%'
  );
