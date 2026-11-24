'use strict';
/* num-tree-v4-verify 第 12 項（12:56 Q1 甲）：有感保底不加歸零條件，破裂石、追憶之墨每小時跟 main 比。以 v3 的 econ_v5.js 為底改寫。
   用法：node econ_feel.js <repo 根目錄> <每地點輪數> [地點起,迄] [skipSmall 0|1]
     環境變數 NEWP＝JSON，覆寫 craft.js 的 NEW_P 某幾格（例 {"frac":[0,0.004,0.016],"ink":[0,0,0.025]}），只給試算；正式數字用程式裡寫好的值（不給 NEWP）。
   - 走 <repo>/js 的真實掉落函式（roundLoot／killMat／feelGive／prdRoll），每個地點 seed 固定（20261124＋地點序號＋SEEDOFF）。
   - main 的根目錄＝原樣（全域珠寶照掉、保底珠寶格給珠寶）；本分支＝全域珠寶拿掉、保底珠寶格給靈魂包、沒有歸零條件。
   - skipSmall＝1：不跑小怪。只能用在本分支：本分支小怪不擲破裂石、完美石、墨、珠寶、追逐，也不碰保底計數，所以分布完全一樣（只少了小怪的蛻變、增幅等亂數）；
     main 的小怪會擲全域珠寶（會歸零保底），一定要跑小怪。
   輪長一律 150 秒＋輪間 2 秒（V7：估算，等測試階段再實測）。每小時輪數 3600÷152＝23.68。 */
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const [root, Ns, rangeS, skipS] = process.argv.slice(2),
  N = +Ns,
  skip = skipS === '1',
  SEC = 150,
  NEWP = process.env.NEWP || '',
  SEEDOFF = +(process.env.SEEDOFF || 0);
function mkctx(seed) {
  const rand = () => {
    let t = (seed += 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const M = Object.create(Math);
  M.random = rand;
  const ctx = {
    console,
    Math: M,
    Date,
    JSON,
    Object,
    Array,
    location: { search: '' },
    URLSearchParams,
    PAL_CSS: fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8')
  };
  vm.createContext(ctx);
  for (const f of ['palette.js', 'ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'world.js'])
    vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f });
  if (NEWP) vm.runInContext(`Object.assign(NEW_P, ${NEWP});`, ctx);
  return ctx;
}
const probe = mkctx(1),
  R0 = s => vm.runInContext(s, probe),
  isBranch = R0('typeof FEEL_PACK !== "undefined"'),
  meanPack = R0('PACKS.reduce((a, p) => a + p.length, 0) / PACKS.length'),
  el1 = R0('STAR_DROP[1].el'),
  LOC = R0(`[...TRUNK.map((n, i) => ({ k: TRUNK_K[i], n: n.n, lv: n.lv, t: 'trunk' })),
      ...SPECIAL.filter(s => s.t !== 'rift').map(s => ({ k: wKey(s.q, s.r), n: WTYPE[s.t].n, lv: s.lv, t: s.t }))]`);
if (skip && !isBranch) throw new Error('main 不能 skipSmall');
const [a, b] = (rangeS || '0,' + LOC.length).split(',').map(Number),
  out = [];
for (let li = a; li < Math.min(b, LOC.length); li++) {
  const L = LOC[li],
    ctx = mkctx(20261124 + li + SEEDOFF),
    R = s => vm.runInContext(s, ctx);
  out.push(
    R(`(() => {
    if (JEWEL.keep) JEWEL.keep = 1e9;
    const L = ${JSON.stringify(L)}, t = lvT(L.lv), nR = Math.min(23, 8 + Math.floor(t / 3)), packs = 2.5 * nR, eG = ${(el1[0] + el1[1]) / 2},
      nS = Math.round((packs * ${meanPack} - eG) / 1.55);
    S = { lv: 100, skills: [{}, {}, {}, {}, {}], mat: newMat(), prd: PRD0(), inv: { items: [], jw: [] },
      camp: { ...newCamp(), forge: 20 }, world: { ...newWorld(), cur: L.k }, gold: 0, star: 1, jewels: [], chase: { pts: 0, got: {} },
      rounds: Array.from({ length: 10 }, () => ({ d: ${SEC}, nS, nE: 1 })) };
    let feel = 0, pack = 0, packN = 0;
    const fg = feelGive;
    feelGive = t2 => { const g = fg(t2); feel++; pack += g.pack || 0; packN += g.pack ? 1 : 0; return g; };
    const nS2 = ${skip ? 0 : 'nS'};
    for (let i = 0; i < ${N}; i++) roundLoot(t, 1, nS2, eliteCount(1));
    feelGive = fg;
    const m = S.mat;
    return { li: ${li}, n: L.n, type: L.t, lv: L.lv, nS, K: feelK(), rounds: ${N}, frac: m.frac, ink: m.ink, perf: m.perf, feel, pack, packN,
      jw: (S.jewels || []).length + ((S.inv && S.inv.jw) || []).length };
  })()`)
  );
}
console.log(JSON.stringify(out));
