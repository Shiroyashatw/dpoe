/* 王印分解匯率用：鍛造台 Lv20、斥候營 4、指定怪物等級、1★、每小時 25 輪，跑 H 小時（種子 5 個），列每小時各通貨與王印掉落數。
   用法：node cur_rate.js [怪物Lv=43] [小時=40]（同 tools/loot_check.js 第二段的做法；M2-29 的基準＝每小時 25 輪、1★） */
const fs = require('fs'), vm = require('vm'), path = require('path');
const LV = +(process.argv[2] || 43), HRS = +(process.argv[3] || 40);
const out = [];
for (const sd of [20261115, 1, 2, 3, 4]) {
  let seed = sd;
  const rand = () => { let t = (seed += 0x6d2b79f5) | 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const M = Object.create(Math); M.random = rand;
  const ctx = { console, Math: M, Date, JSON, Object, Array, location: { search: '' }, URLSearchParams };
  vm.createContext(ctx);
  for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'world.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'js', f), 'utf8'), ctx, { filename: f });
  const r = vm.runInContext(`(() => {
    S = { lv: 60, skills: [{}, {}, {}, {}, {}], mat: newMat(), prd: PRD0(), inv: { items: [] }, camp: { ...newCamp(), forge: 20, watch: 21, scout: 4, altar: 11, house: 10, store: 5 }, auto2: AUTO2(), world: newWorld(), gold: 0, star: 1, rounds: [], jewels: [], frags: newFrags() };
    const m0 = { ...S.mat };
    for (let i = 0; i < 25 * ${HRS}; i++) { const nE = eliteCount(1); roundLoot(lvT(${LV}), 1, 40, nE); S.rounds.push({ d: 144, nS: 40, nE }); if (S.rounds.length > 10) S.rounds.shift(); }
    const o = {};
    for (const k in S.mat) if (typeof S.mat[k] === 'number' && S.mat[k] !== (m0[k] || 0)) o[k] = (S.mat[k] - (m0[k] || 0)) / ${HRS};
    o.jewels = S.jewels.length / ${HRS};
    o.seals = Object.entries(S.frags).filter(([k]) => /wangyin/.test(k)).reduce((a, [, n]) => a + n, 0) / ${HRS};
    o.fragsAll = JSON.stringify(Object.fromEntries(Object.entries(S.frags).filter(([, n]) => n)));
    return o;
  })()`, ctx);
  out.push(r);
}
const keys = [...new Set(out.flatMap(o => Object.keys(o)))].filter(k => k !== 'fragsAll');
console.log('通貨,每小時(5種子平均),各種子');
for (const k of keys) { const v = out.map(o => o[k] || 0); console.log([k, (v.reduce((a, b) => a + b) / v.length).toFixed(2), v.map(x => x.toFixed(2)).join(' ')].join(',')); }
console.log('frags 種子1：' + out[0].fragsAll);
