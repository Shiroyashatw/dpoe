/* dungeonPOE M2-18 · 追逐掉落驗收（docs/交辦/M2-18-追逐掉落.md）：在 Node 載入純邏輯，走真的 killMat（追逐判定、有感保底、通貨、珠寶），
   每個種子從新的保底點數開始掛 H 小時。一輪的小怪、菁英照時間平均攤開（王在輪末），有感掉落的空窗用這個時間量。
   情境：基準（第 15 個主幹地點 Lv48、1★、每小時 25 輪、鍛造台 20）、離線 12 小時（roundLoot，跟 offSettle 同一條路）、
   速度下限（5★、每小時 60 輪）、鍛造台 13–16（只開破裂石，每一級都量；有感保底給靈魂包）、珠寶收藏滿 30 顆一直不清（有感保底與自然掉的珠寶都換 500 靈魂）。
   用法：node tools/chase_check.js [種子數，預設 200] [小時，預設 100] [小怪數，預設 40]；固定亂數，同參數結果一樣。只量不改數字 */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
/* js/palette.js 在 Node 讀 css/style.css（M2-34-0）：每個 vm 環境都帶 PAL_CSS */
const PAL_CSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8'),
  vmCtx = vm.createContext;
vm.createContext = o => vmCtx(Object.assign(o, { PAL_CSS }));
const SEEDS = +process.argv[2] || 200,
  H = +process.argv[3] || 100,
  NS = +process.argv[4] || 40;
let seed = 1;
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
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
ctx.SIM = { NS };
/* 珠寶收藏（JEWEL.keep）：基準快滿就清掉（玩家會拆）；o.full＝一開始就滿 30 顆、一直不清（珠寶換 500 靈魂，照樣算有感掉落） */
/* 一個種子：回每件追逐物品的 { t 秒, p 掉之前累積的點數, pity 是不是必掉 }、有感掉落的時間、必掉漏掉幾次、有感保底給了幾顆破裂石／幾個靈魂包、滿了換靈魂幾次 */
vm.runInContext(
  `function simRun(o) {
  S = { lv: 90, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: {} }, prd: PRD0(), inv: { items: [] }, camp: { ...newCamp(), forge: o.forge },
    auto2: AUTO2(), world: { ...newWorld(), cur: TRUNK_K[14] }, gold: 0, star: o.star, chase: { pts: 0, got: {} }, rounds: [],
    jewels: o.full ? Array.from({ length: JEWEL.keep }, (_, i) => ({ id: 'j' + i })) : [] };
  const t = lvT(TRUNK[14].lv), sec = 3600 / o.rph, od = { star: o.star, p: mapCurP(o.star, SIM.NS, 1.5), ilvl: tierIlvl(t), tier: t },
    C = S.chase, out = { ch: [], feel: [], miss: 0, frac: 0, pack: 0, jwSoul: 0, maxP: 0 };
  const cnt = () => S.mat.frac + S.mat.perf + S.mat.ink + S.jewels.length;
  for (let r = 0; r < o.rph * o.h; r++) {
    const t0 = r * sec, nE = eliteCount(o.star), ev = [];
    for (let i = 0; i < SIM.NS; i++) ev.push([t0 + (sec * 0.9 * (i + 1)) / (SIM.NS + 1), 0]);
    for (let i = 0; i < nE; i++) ev.push([t0 + (sec * 0.9 * (i + 1)) / (nE + 1) + 0.01, 1]);
    ev.sort((a, b) => a[0] - b[0]);
    ev.push([t0 + sec, 2]);
    let ei = 0;
    for (const [tt, k] of ev) {
      const p0 = C.pts, c0 = cnt();
      const g = killMat(k === 2 ? { boss: 1 } : k === 1 ? { elite: 1 } : {}, t, k === 1 ? { ...od, ei: ++ei } : od);
      if (g.chase) out.ch.push({ t: tt, p: p0 + (k === 2 ? CHASE.ptB : 0), pity: k === 2 && p0 + CHASE.ptB >= CHASE.cap });
      else if (k === 2 && p0 + CHASE.ptB >= CHASE.cap && mobLv(t) >= CHASE.lv) out.miss++;
      out.maxP = Math.max(out.maxP, C.pts);
      const jf = g.includes('珠寶收藏滿了：換 500 靈魂');
      if (g.feel) out.frac += g.feel.rare.includes('frac') ? 1 : 0;
      out.pack += g.pack ? 1 : 0;
      out.jwSoul += jf ? 1 : 0;
      if (g.chase || g.pack || jf || cnt() > c0) out.feel.push(tt);
    }
    if (!o.full && S.jewels.length >= JEWEL.keep - 5) S.jewels.length = 0;
    S.rounds.push({ d: sec, nS: SIM.NS, nE });
    if (S.rounds.length > 10) S.rounds.shift();
  }
  return out;
}
function simOff(rounds) {
  S = { lv: 90, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: {} }, prd: PRD0(), inv: { items: [] }, camp: { ...newCamp(), forge: 20 },
    auto2: AUTO2(), world: { ...newWorld(), cur: TRUNK_K[14] }, gold: 0, star: 1, chase: { pts: 0, got: {} }, jewels: [], rounds: [] };
  for (let i = 0; i < rounds; i++) { roundLoot(lvT(TRUNK[14].lv), 1, SIM.NS, eliteCount(1)); if (S.jewels.length >= JEWEL.keep - 5) S.jewels.length = 0; }
  return chaseN();
}`,
  ctx
);
const q = (a, p) => {
  const b = [...a].sort((x, y) => x - y);
  return b[Math.min(b.length - 1, Math.floor(p * (b.length - 1) + 1e-9))];
};
const f2 = v => v.toFixed(2),
  rows = [],
  ok = (name, val, pass, want) => rows.push(`| ${name} | ${val} | ${want} | ${pass ? '✅' : '❌'} |`);
function scen(o, n) {
  const R = [];
  for (let i = 0; i < n; i++) (seed = 1000 + i * 7919), R.push(ctx.simRun({ h: H, ...o }));
  return R;
}
const t0 = Date.now();
/* 基準 */
const B = scen({ rph: 25, star: 1, forge: 20 }, SEEDS);
const per = B.map(r => r.ch.length),
  all = per.reduce((a, b) => a + b, 0),
  gaps = [],
  feelGaps = [],
  feelMax = [];
let pity = 0,
  miss = 0,
  maxP = 0,
  maxGap = 0;
for (const r of B) {
  let last = 0;
  for (const c of r.ch) gaps.push((c.t - last) / 3600), (maxGap = Math.max(maxGap, (c.t - last) / 3600)), (last = c.t);
  pity += r.ch.filter(c => c.pity).length;
  miss += r.miss;
  maxP = Math.max(maxP, r.maxP, ...r.ch.map(c => c.p));
  let lf = 0,
    m = 0;
  for (const ft of r.feel) feelGaps.push((ft - lf) / 60), (m = Math.max(m, (ft - lf) / 60)), (lf = ft);
  feelMax.push(m);
}
const perH = all / SEEDS / H,
  avgGap = (SEEDS * H) / all;
console.log(`種子 ${SEEDS}、每個 ${H} 小時、小怪 ${NS}；基準：第 15 個主幹地點 Lv48、1★、每小時 25 輪、鍛造台 20`);
console.log('| 項目 | 實測 | 規格 | |\n| --- | --- | --- | --- |');
ok('每小時件數', f2(perH), perH >= 0.5 && perH <= 0.62, '0.50–0.62');
ok('平均間隔（時）', f2(avgGap), avgGap >= 1.6 && avgGap <= 1.95, '1.60–1.95');
ok('保底觸發率', ((pity / all) * 100).toFixed(1) + '%', pity / all >= 0.24 && pity / all <= 0.33, '24%–33%');
ok(
  `單一種子 ${H} 小時件數 P1–P99`,
  `${q(per, 0.01)}–${q(per, 0.99)}（最少 ${Math.min(...per)}、最多 ${Math.max(...per)}）`,
  q(per, 0.01) >= 46 && q(per, 0.99) <= 67,
  '46–67'
);
ok('點數 ≥500 的輪末王沒掉', miss + ' 次', miss === 0, '0 次');
ok('兩件之間最多累積點數', maxP, maxP <= 510, '≤ 510');
ok('最長空窗（時）', f2(maxGap), maxGap <= 3.5, '≤ 3.5');
const fp95 = q(feelGaps, 0.95),
  fmax = Math.max(...feelMax);
ok('A8 有感掉落空窗 P95（分）', fp95.toFixed(1), fp95 <= 30, '≤ 30');
ok('A8 每人最長空窗（分）', fmax.toFixed(1), fmax <= 45, '≤ 45');
/* 珠寶收藏滿 30 顆、不清（數值設計師 13:20 第 18 點：保底改給 500 靈魂，照樣歸零並計入有感） */
const fullFeel = r => {
  const g = [];
  let l = 0,
    m = 0;
  for (const ft of r.feel) g.push((ft - l) / 60), (m = Math.max(m, (ft - l) / 60)), (l = ft);
  return { g, m };
};
const J = scen({ rph: 25, star: 1, forge: 20, full: 1 }, SEEDS),
  jg = J.flatMap(r => fullFeel(r).g),
  jp95 = q(jg, 0.95),
  jmax = Math.max(...J.map(r => fullFeel(r).m)),
  jSoul = J.reduce((a, r) => a + r.jwSoul, 0);
ok(
  '珠寶滿 30 不清：A8 有感掉落空窗 P95（分）',
  `${jp95.toFixed(1)}（換 500 靈魂 ${jSoul} 次）`,
  jp95 <= 30 && jSoul > 0,
  '≤ 30'
);
ok('珠寶滿 30 不清：A8 每人最長空窗（分）', jmax.toFixed(1), jmax <= 45, '≤ 45');
/* 離線 12 小時（300 輪，roundLoot） */
const off = [];
for (let i = 0; i < SEEDS; i++) (seed = 5000 + i * 7919), off.push(ctx.simOff(300));
ok(
  '離線 12 小時件數（最少）',
  `${Math.min(...off)}（平均 ${f2(off.reduce((a, b) => a + b, 0) / SEEDS)}）`,
  Math.min(...off) >= 3,
  '≥ 3'
);
/* 速度下限：5★、每小時 60 輪 */
const F = scen({ rph: 60, star: 5, forge: 20 }, Math.min(SEEDS, 100)),
  fAvg = (Math.min(SEEDS, 100) * H) / F.reduce((a, r) => a + r.ch.length, 0);
ok('速度下限 5★、每小時 60 輪的平均間隔（時）', f2(fAvg), fAvg >= 0.5, '≥ 0.5');
/* 鍛造台 13–16（只開破裂石）：每一級都量 */
for (const fg of [13, 14, 15, 16]) {
  const K = scen({ rph: 25, star: 1, forge: fg }, Math.min(SEEDS, 50)),
    kFrac = K.reduce((a, r) => a + r.frac, 0),
    kPack = K.reduce((a, r) => a + r.pack, 0),
    kMax = Math.max(
      ...K.map(r => {
        let l = 0,
          m = 0;
        for (const ft of r.feel) (m = Math.max(m, (ft - l) / 60)), (l = ft);
        return m;
      })
    );
  ok(`鍛造台 ${fg}：有感保底給的破裂石`, kFrac + ' 件', kFrac === 0, '0 件');
  ok(`鍛造台 ${fg}：靈魂包（計入有感掉落）`, `${kPack} 個（每人最長空窗 ${kMax.toFixed(1)} 分）`, kPack > 0, '有出現');
}
console.log(rows.join('\n'));
console.log(`\n${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
process.exitCode = rows.some(r => r.includes('❌')) ? 1 : 0;
