/* 檢查 4、7：用遊戲的 chaseRoll（craft.js，origin/main 原樣，不打補丁）模擬 100 小時的王印掉落。
   node chase_sim.js <每輪秒數> <星級> [小時，預設 100] [次數，預設 2000]
   一輪＝這一輪的菁英（STAR_DROP[星].el 均勻抽，前 4 隻判定）＋輪末王；地點＝雪埋古道（主幹第 14 個，怪物 Lv48，會判定）。
   印出：每小時王印數、100 小時的總數（中位、P10、P90）、4 種裡最少的那種、重複（總數 − 4 種各 1）、有感保底 K */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const [, , secA, starA, hA, nA] = process.argv;
const sec = +secA,
  star = +starA,
  H = +(hA || 100),
  N = +(nA || 2000);
let seed = 777;
const sMath = Object.create(Math);
sMath.random = () => {
  let t = (seed = (seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ctx = { console, Math: sMath, Date, JSON, Object, Array, Set, location: { search: '' }, URLSearchParams };
vm.createContext(ctx);
for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'world.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'js', f), 'utf8'), ctx, { filename: f });
vm.runInContext(`var G = { t: 0 }, P = {}, S, ST;`, ctx);
const R = s => vm.runInContext(s, ctx);
const rounds = Math.round((H * 3600) / sec),
  tot = [],
  minK = [],
  dup = [];
for (let n = 0; n < N; n++) {
  R(`S = { world: { cur: TRUNK_K[14] }, frags: {}, chase: { pts: 0, got: {} } }`);
  const t = R('lvT(TRUNK[14].lv)');
  ctx.__t = t;
  for (let r = 0; r < rounds; r++) {
    const el = R(`irnd(...STAR_DROP[${star}].el)`);
    for (let e = 1; e <= el; e++) R(`chaseRoll(1, __t, { ei: ${e} })`);
    R(`chaseRoll(2, __t)`);
  }
  const got = R('S.chase.got'),
    c = ['wangyin_zhenyue', 'wangyin_chixiao', 'wangyin_jiting', 'wangyin_guixu'].map(k => got[k] || 0),
    s = c.reduce((a, b) => a + b, 0);
  tot.push(s);
  minK.push(Math.min(...c));
  dup.push(c.reduce((a, b) => a + Math.max(0, b - 1), 0));
}
const q = (a, p) => [...a].sort((x, y) => x - y)[Math.floor(p * (a.length - 1))],
  mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const res = {
  sec,
  star,
  hours: H,
  runs: N,
  roundsPerHour: 3600 / sec,
  perHour: mean(tot) / H,
  med: q(tot, 0.5),
  p10: q(tot, 0.1),
  p90: q(tot, 0.9),
  mean: mean(tot),
  minKindMed: q(minK, 0.5),
  dupMed: q(dup, 0.5),
  dupP10: q(dup, 0.1),
  dupP90: q(dup, 0.9),
  feelK: Math.max(3, Math.floor(R('FEEL_TG') / sec))
};
console.log(JSON.stringify(res));
