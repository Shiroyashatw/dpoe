/* Task B：有感保底（P.feel）重設規則的 Monte Carlo。模型照 tools/chase_check.js 的 simRun（走真的 killMat；一輪的小怪、菁英照時間平均攤開，王在輪末）。
   兩種規則：cur＝現在的程式（任何怪物有感掉落都把 P.feel 歸零）；boss＝只有輪末王（k===2）自己的有感掉落才歸零（在記憶體裡改 craft.js 的那一行，不改檔案）。
   有感事件＝追逐物品、破裂石、完美石、追憶之墨、珠寶（含收藏滿換 500 靈魂）、靈魂包，跟 chase_check 的 A8 同一個算法。
   SCN＝只跑第幾個情境（逗號分隔，0 起算）；另寫 *_hist.csv（空窗分佈，最後一格 23.99–25.01 分＝剛好碰到 K 輪上限）。
   用法：REPO=repo路徑 node feel_mc.js [種子數 200] [小時 100] [--csv 檔]；固定亂數 */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const REPO = process.env.REPO || path.join(__dirname, '..', '..');
const a = process.argv.slice(2), ci = a.indexOf('--csv'), CSV = ci >= 0 ? a.splice(ci, 2)[1] : null;
const SEEDS = +a[0] || 200, H = +a[1] || 100, NS = 40;
const OLD = 'if (ch || D.jw || D.cur.frac || D.cur.perf || D.cur.ink) P.feel = 0;';
function mk(rule) {
  let seed = 1;
  const rand = () => { let t = (seed += 0x6d2b79f5) | 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const M = Object.create(Math); M.random = rand;
  const ctx = { console, Math: M, Date, JSON, Object, Array, location: { search: '' }, URLSearchParams };
  vm.createContext(ctx);
  for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'world.js']) {
    let src = fs.readFileSync(path.join(REPO, 'js', f), 'utf8');
    if (f === 'craft.js') {
      if (!src.includes(OLD)) throw new Error('craft.js 找不到要比對的那一行');
      /* 規則 (ii)：只有輪末王自己的有感掉落歸零；小怪、菁英的有感掉落不動計數 */
      if (rule === 'boss') src = src.replace(OLD, 'if (k === 2 && (ch || D.jw || D.cur.frac || D.cur.perf || D.cur.ink)) P.feel = 0;');
    }
    vm.runInContext(src, ctx, { filename: f });
  }
  ctx.SIM = { NS };
  vm.runInContext(`function simRun(o) {
    S = { lv: 90, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: {} }, prd: PRD0(), inv: { items: [] }, camp: { ...newCamp(), forge: o.forge },
      auto2: AUTO2(), world: { ...newWorld(), cur: TRUNK_K[o.node] }, gold: 0, star: o.star, chase: { pts: 0, got: {} }, rounds: [], jewels: [] };
    const t = lvT(TRUNK[o.node].lv), sec = 3600 / o.rph, od = { star: o.star, p: mapCurP(o.star, SIM.NS, 1.5), ilvl: tierIlvl(t), tier: t };
    const out = { ev: [], pity: 0, bosses: 0, resetBy: [0, 0, 0], k: 0 };
    const cnt = () => S.mat.frac + S.mat.perf + S.mat.ink + S.jewels.length;
    for (let r = 0; r < o.rph * o.h; r++) {
      const t0 = r * sec, nE = eliteCount(o.star), ev = [];
      for (let i = 0; i < SIM.NS; i++) ev.push([t0 + (sec * 0.9 * (i + 1)) / (SIM.NS + 1), 0]);
      for (let i = 0; i < nE; i++) ev.push([t0 + (sec * 0.9 * (i + 1)) / (nE + 1) + 0.01, 1]);
      ev.sort((a, b) => a[0] - b[0]);
      ev.push([t0 + sec, 2]);
      let ei = 0;
      for (const [tt, k] of ev) {
        const c0 = cnt(), f0 = S.prd.feel || 0;
        const g = killMat(k === 2 ? { boss: 1 } : k === 1 ? { elite: 1 } : {}, t, k === 1 ? { ...od, ei: ++ei } : od);
        const jf = g.includes('珠寶收藏滿了：換 500 靈魂');
        const hit = !!(g.chase || g.pack || jf || cnt() > c0);
        if (k === 2) out.bosses++;
        if (g.feel) { out.pity++; out.ev.push([tt, 'p']); }
        else if (hit) { out.ev.push([tt, k]); if (f0 > 0 && (S.prd.feel || 0) === 0) out.resetBy[k]++; }
      }
      if (S.jewels.length >= JEWEL.keep - 5) S.jewels.length = 0;
      S.rounds.push({ d: sec, nS: SIM.NS, nE });
      if (S.rounds.length > 10) S.rounds.shift();
    }
    out.k = feelK();
    return out;
  }`, ctx);
  return { ctx, setSeed: s => (seed = s) };
}
const q = (arr, p) => { const b = Float64Array.from(arr).sort(); return b[Math.min(b.length - 1, Math.floor(p * (b.length - 1) + 1e-9))]; };
const SC = [
  { n: '基準 Lv48 1★ 25輪/時 鍛造台20', node: 14, star: 1, rph: 25, forge: 20 },
  { n: '快刷 Lv48 5★ 60輪/時 鍛造台20', node: 14, star: 5, rph: 60, forge: 20 },
  { n: '中期 Lv38 1★ 25輪/時 鍛造台17', node: 12, star: 1, rph: 25, forge: 17 },
  { n: '鍛造台14（靈魂包）Lv38 1★ 25輪/時', node: 12, star: 1, rph: 25, forge: 14 }
];
const out = [['情境', '規則', '種子', '小時', 'K', '有感事件/時', '保底觸發/時', '保底佔有感%', '保底觸發/輪末王%', '空窗P50分', 'P90', 'P95', 'P99', '最長', '每人最長P95', '歸零來源_小怪', '歸零來源_菁英', '歸零來源_王'].join(',')];
const HIST = [], HB = [0, 2, 5, 10, 15, 20, 23.99, 25.01];
const SCN = process.env.SCN ? process.env.SCN.split(',').map(Number) : SC.map((_, i) => i);
for (const sc of SC.filter((_, i) => SCN.includes(i))) for (const rule of ['cur', 'boss']) {
  const E = mk(rule), gaps = [], maxes = [];
  let pity = 0, evN = 0, bosses = 0, K = 0; const rb = [0, 0, 0];
  for (let i = 0; i < SEEDS; i++) {
    E.setSeed(1000 + i * 7919);
    const r = E.ctx.simRun({ h: H, ...sc });
    let l = 0, m = 0;
    for (const [t] of r.ev) { gaps.push((t - l) / 60); m = Math.max(m, (t - l) / 60); l = t; }
    maxes.push(m); pity += r.pity; evN += r.ev.length; bosses += r.bosses; K = r.k; r.resetBy.forEach((v, j) => (rb[j] += v));
  }
  const hrs = SEEDS * H, f = v => v.toFixed(2);
  const row = [sc.n, rule === 'cur' ? '(i) 現行：任何怪物歸零' : '(ii) 只有輪末王歸零', SEEDS, H, K, f(evN / hrs), f(pity / hrs), f((100 * pity) / evN), f((100 * pity) / bosses),
    f(q(gaps, 0.5)), f(q(gaps, 0.9)), f(q(gaps, 0.95)), f(q(gaps, 0.99)), f(Math.max(...maxes)), f(q(maxes, 0.95)), rb[0], rb[1], rb[2]];
  out.push(row.join(','));
  const hb = HB.slice(1).map((hi, j) => gaps.filter(g => g >= HB[j] && g < hi).length);
  HIST.push([sc.n, row[1], ...hb.map(n => ((100 * n) / gaps.length).toFixed(2))].join(','));
  console.log(row.join(' | '));
}
if (CSV) fs.writeFileSync(CSV, out.join('\n') + '\n');
const HC = ['情境,規則,' + HB.slice(1).map((hi, j) => `空窗${HB[j]}-${hi}分%`).join(','), ...HIST];
console.log(HC.join('\n'));
if (CSV) fs.writeFileSync(CSV.replace('.csv', '_hist.csv'), HC.join('\n') + '\n');
