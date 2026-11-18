/* 代表配裝產生器：照 tools/dmg_check.js 的「劍近戰」（遊戲預設路線：開局拿劍、斬擊）做法，
   route()／gear()／能力值過路點補法逐字照抄（dmg_check.js 第 30–105、503–556 行），種子公式同 dmg_check（SD=0、劍近戰 bidx=0）。
   用法：node make_build.js 55 70 → builds/L55.json、builds/L70.json（S.lv／eq／pt／ptA／技能） */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
let seed = 12345;
const sMath = Object.create(Math);
sMath.random = () => {
  let t = (seed = (seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ROOT = path.join(__dirname, '..', '..');
const ctx = { console, Math: sMath, Date, JSON, Object, Array, Set, location: { search: '' }, URLSearchParams };
vm.createContext(ctx);
for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'mech.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f });
vm.runInContext(
  `var G = { t: 0, mapT: 1, scene: 'map', mobs: [] }, P = {}, S, ST;
   const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
   const num = () => {}, fx = () => {}, fxs = () => {}, sfx = () => {}, tryUndying = () => false, die = () => {};`,
  ctx
);
const R = s => vm.runInContext(s, ctx);
function route(w, pts) {
  const T = R('PTREE'),
    I = T.I,
    ADJ = T.ADJ,
    have = new Set();
  const val = n => Object.entries(I[n].s || {}).reduce((a, [k, v]) => a + (w[k] || 0) * (+v || 0), 0);
  const bfs = src => {
    const prev = {},
      d = {},
      q = [...src];
    src.forEach(s => (d[s] = 0));
    while (q.length) {
      const c = q.shift();
      if (d[c] >= 14) continue;
      for (const n of ADJ[c] || [])
        if (d[n] === undefined && !have.has(n) && !I[n].lock) (d[n] = d[c] + 1), (prev[n] = c), q.push(n);
    }
    return { d, prev };
  };
  const s0 = R('PT_START')
    .map(s => [s, Object.entries(bfs([s]).d).reduce((a, [n, dd]) => a + val(n) / (1 + dd), 0)])
    .sort((a, b) => b[1] - a[1])[0][0];
  have.add(s0);
  let used = 0;
  while (used < pts) {
    const { d, prev } = bfs([...have]);
    let bt = null,
      br = -1;
    for (const n of Object.keys(d)) {
      if (have.has(n) || !d[n]) continue;
      let p = n,
        g = 0,
        c = 0;
      while (!have.has(p)) (g += val(p)), c++, (p = prev[p]);
      if (c <= pts - used && g / c > br) (br = g / c), (bt = n);
    }
    if (!bt) break;
    const path = [];
    for (let p = bt; !have.has(p); p = prev[p]) path.push(p);
    path.reverse().forEach(p => have.add(p));
    used += path.length;
  }
  return [...have];
}
function gear(t, want, wt, off, L = 999) {
  const eq = {};
  for (const e of R('EQS')) {
    if (e.k === 'ring3') continue;
    let best = null,
      bv = -1;
    for (let i = 0; i < 4; i++) {
      const pool = R('BASES').filter(
        b =>
          R('eqTakes')(e, b.k) &&
          b.lv <= t &&
          1 + Math.round(((b.lv - 1) * 82) / 15) <= L &&
          (e.k !== 'weapon' || b.wt === wt) &&
          (e.k !== 'off' || !off || b.k === off) &&
          (e.k !== 'weapon' || !off || !b.two)
      );
      if (!pool.length) break;
      const b = pool[Math.floor(sMath.random() * pool.length)],
        it = R('mkItem')(b.id, R('tierIlvl')(t), 2),
        v = it.a.reduce((a, x) => a + (want[x.k] || 0) * (Array.isArray(x.v) ? x.v[1] : x.v), 0);
      if (v > bv) (bv = v), (best = it);
    }
    if (best && (e.k !== 'off' || R('offOK')(eq.weapon, best))) eq[e.k] = best;
  }
  return eq;
}
/* dmg_check.js BUILDS.劍近戰 */
const B = {
  tree: { meleeP: 2, atkP: 2, w_sword: 2, critInc: 1, critX: 1, as: 3, life: 0.3 },
  gear: { dmgP: 1, flat: 3, as: 2, crit: 5, critInc: 1, critX: 1, life: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
  wt: 'sword',
  sk: 'slash'
};
fs.mkdirSync(path.join(__dirname, 'builds'), { recursive: true });
/* 參數 55 或 55:-3（裝備階級 −3 的低配；天賦、寶石等級照角色等級不變） */
for (const arg of process.argv.slice(2)) {
  const [L, off] = arg.split(':').map(Number);
  const t = Math.max(1, Math.min(16, Math.max(1, Math.round(((L - 5) * 15) / 78) + 1)) + (off || 0));
  seed = 12345 + L * 1000 + 0;
  const S = { lv: L, eq: gear(t, B.gear, B.wt, B.off, L), pt: [], ptA: {}, asc: null, at: [], auras: [], charms: [] };
  ctx.S = S;
  for (const k of Object.keys(S.eq)) (ctx.__k = k), R('eqOpen(S, __k)') || delete S.eq[k];
  for (const aw of [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16]) {
    S.pt = route({ ...B.tree, attr: aw }, R('ptPoints')(L));
    S.ptA = {};
    const I = R('PTREE').I;
    ctx.S = S;
    const lack = () => {
      const d = { 力量: 0, 敏捷: 0, 智慧: 0 };
      for (const k of Object.keys(S.eq)) {
        ctx.__k = k;
        for (const [n, have, req] of R('eqLack(S, S.eq.' + k + ', __k)')) if (n in d) d[n] += req - have;
      }
      return d;
    };
    for (const id of S.pt.filter(id => I[id].s && I[id].s.attr)) {
      const d = lack(),
        c = [
          ['s', '力量'],
          ['d', '敏捷'],
          ['i', '智慧']
        ].sort((a, b) => d[b[1]] - d[a[1]])[0];
      S.ptA[id] = d[c[1]] > 0 ? c[0] : 's';
    }
    S.aw = aw;
    if (!R('eqCheck(S).bad.size')) break;
  }
  ctx.S = S;
  R('S = this.S; ST = stats(S); G.mapT = ' + t + ';');
  const ST = R('ST');
  const out = {
    L,
    tier: t,
    gemLv: R('gemCap')(L),
    seed: 12345 + L * 1000,
    aw: S.aw,
    bad: R('eqCheck(S).bad.size'),
    st: { hp: ST.hp, es: ST.es, armor: ST.armor, ev: ST.ev, resF: ST.resF, resC: ST.resC, resL: ST.resL, resX: ST.resX },
    S: { lv: L, eq: S.eq, pt: S.pt, ptA: S.ptA }
  };
  fs.writeFileSync(path.join(__dirname, 'builds', `L${L}${off ? 'g' + off : ''}.json`), JSON.stringify(out));
  console.log(`L${L} 階${t} 寶石Lv${out.gemLv} 天賦${S.pt.length}點 aw${S.aw} 失效${out.bad}`, JSON.stringify(out.st), Object.keys(S.eq).join(','));
}
