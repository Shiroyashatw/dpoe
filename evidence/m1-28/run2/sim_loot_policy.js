/* loot_check.js 的同一套政策，加：候選數值覆寫（環境變數）、每次 campUp 的秒數、每分鐘的購買清單與產生器花費。
   用法：W=240 WW=50 WI=10 SEED=20261115 node sim.js [SEC] [NS] [MIN] [--csv 檔] [--quiet]
   W=watch[0].soul、WW=watch[0].wood、WI=watch[0] iron:1、ORDER=逗號（預設 loot_check 的）*/
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const REPO = process.env.REPO || '/home/user/dpoe';
const a = process.argv.slice(2).filter(x => !x.startsWith('--'));
const SEC = +a[0] || 150, NS = +a[1] || 40, MIN = +a[2] || 30;
let seed = +(process.env.SEED || 20261115);
const rand = () => { let t = (seed += 0x6d2b79f5) | 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const M = Object.create(Math); M.random = rand;
const ctx = { console, Math: M, Date, JSON, Object, Array, location: { search: '' }, URLSearchParams };
vm.createContext(ctx);
for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'world.js'])
  vm.runInContext(fs.readFileSync(path.join(REPO, 'js', f), 'utf8'), ctx, { filename: f });
const R = s => vm.runInContext(s, ctx);
const ov = { soul: process.env.W, wood: process.env.WW, iron: process.env.WI };
R(`(o => { const w = CAMP.watch[0]; if (o.soul) w.soul = +o.soul; if (o.wood) w.wood = +o.wood; if (o.iron) w.mats = { 'iron:1': +o.iron }; })(${JSON.stringify(ov)})`);
const ORDER = (process.env.ORDER || 'forge,house,watch,altar,scout,store').split(',');
const r = R(`(() => {
  S = { lv: 1, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: { wood: 20 } }, prd: PRD0(), inv: { items: [] }, camp: newCamp(), auto2: AUTO2(), world: newWorld(), gold: 0, star: 1 };
  const rows = [], ev = [], ORDER = ${JSON.stringify(ORDER)};
  let t = 0, nextRound = ${SEC}, genN = 0, soulIn = 0, rounds = 0;
  const node = () => TRUNK[Math.min(S.camp.watch, TRUNK.length - 1)];
  const iron1 = () => matN('iron', 1);
  const reserve = () => {
    const L = ORDER.map(b => campNext(b)).filter(Boolean).sort((a, b) => a.soul - b.soul)[0];
    return L && S.mat.soul >= L.soul ? { wood: L.wood || 0, mats: L.mats || {} } : { wood: 0, mats: {} };
  };
  for (let min = 1; min <= ${MIN}; min++) {
    const buys = [];
    for (; t < min * 60; t++) {
      genTick(1);
      if (t >= nextRound) {
        nextRound += ${SEC};
        const s0 = S.mat.soul;
        roundLoot(lvT(node().lv), 1, ${NS}, eliteCount(1));
        soulIn += S.mat.soul - s0; rounds++;
        S.gold += 125 * ${SEC} / 60;
      }
      if (t % 5) continue;
      for (const b of ORDER) {
        const n = campNext(b), s0 = S.mat.soul;
        if (!campUp(b)) { ev.push({ t, b, lv: S.camp[b], soul: n.soul, wood: n.wood, left: Math.round(S.mat.soul) }); buys.push(CAMPN[b] + S.camp[b] + '(' + n.soul + ')'); }
      }
      for (let g = 0; g < 50; g++) {
        const rs = reserve(), ok = GEN_K.filter(k => {
          if (!genOn(k) || genAfford(k) < 1) return false;
          const c = genCost(k);
          if (k !== 'wood' && matN('wood') - c.wood < rs.wood) return false;
          return Object.keys(c.mats).every(key => matN(...matOf(key)) - c.mats[key] >= (rs.mats[key] || 0));
        });
        if (!ok.length) break;
        const k = ok.reduce((a, b) => (genCost(a).wood <= genCost(b).wood ? a : b));
        genUp(k); genN++;
      }
    }
    rows.push({ min, lv: node().lv, soul: Math.round(S.mat.soul), soulIn: Math.round(soulIn), wood: matN('wood'), iron1: iron1(), gen: genN, buys: buys.join(' ') });
    genN = 0;
  }
  return { rows, ev, rounds };
})()`);
const key = e => `${e.b}${e.lv}`;
const first = {};
for (const e of r.ev) if (!(key(e) in first)) first[key(e)] = e.t;
const pick = ['house1', 'forge1', 'watch1', 'altar1', 'house2', 'forge2', 'house3', 'forge3', 'watch2', 'altar2', 'scout1'];
const out = { cfg: { W: process.env.W || 240, WW: process.env.WW || 50, WI: process.env.WI || 10, SEC, NS, seed: +(process.env.SEED || 20261115), ORDER: ORDER.join('>') }, spm: +(r.rows[r.rows.length - 1].soulIn / MIN).toFixed(1), t: Object.fromEntries(pick.map(k => [k, k in first ? +(first[k] / 60).toFixed(2) : null])) };
const ci = process.argv.indexOf('--csv');
if (ci > 0) {
  const L = ['分鐘,地點Lv,靈魂庫存,累計靈魂收入,木,鐵T1,產生器升級數,這一分鐘買的設施(靈魂費用)'];
  for (const x of r.rows) L.push([x.min, x.lv, x.soul, x.soulIn, x.wood, x.iron1, x.gen, x.buys].join(','));
  L.push('', '設施,等級,秒,分,靈魂費用,木費用,買完剩靈魂');
  for (const e of r.ev) L.push([CAMPN_(e.b), e.lv, e.t, (e.t / 60).toFixed(2), e.soul, e.wood, e.left].join(','));
  fs.writeFileSync(process.argv[ci + 1], L.join('\n') + '\n');
}
function CAMPN_(b) { return { forge: '鍛造台', watch: '瞭望台', scout: '斥候營', house: '民房', altar: '祭壇', store: '倉房' }[b]; }
console.log(JSON.stringify(out));
