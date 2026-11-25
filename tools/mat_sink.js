/* 低階材料有沒有去處（材料來源.md 定稿 v1.1 §3 設施收任何階＋§6 商會換打造通貨＋每小時額度）。
   跟 mat_first.js 同一套：Node 載入純邏輯，一隻一隻走真的 killMat；每殺一隻照 鍛造台 → 瞭望台 → 長老屋 → 斥候營 → 倉房 能升就升（campUp，任何階付款走 costPay／matPlan），
   瞭望台開了新地點就過去刷。倉房 Lv4 以後，庫存（T1 當量）超過 §6.2 的設計參考上限，多出來的從最低階起拿去 tradeCur 換（額度照模擬時間，tradeNow 覆寫）。
   不打造、不算撿東西與走路。報：每 N 小時鐵／皮／靈絲各階庫存、T1 當量、設施用低階付掉多少、商會換掉多少。
   用法：node tools/mat_sink.js [小時，預設 60] [種子數，預設 3] [每幾小時一列，預設 6] [一輪幾秒，預設 150] [小怪數，預設 40]；同參數結果一樣 */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const PAL_CSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
const HRS = +process.argv[2] || 60,
  SEEDS = +process.argv[3] || 3,
  EVERY = +process.argv[4] || 6,
  SEC = +process.argv[5] || 150,
  NS = +process.argv[6] || 40,
  ORDER = ['forge', 'watch', 'altar', 'scout', 'store'],
  /* §6.2 庫存上限（T1 當量，設計參考）：多出來的才換 */
  CAP = { wood: 18000, iron: 350000, hide: 70000, silk: 70000 };
function one(seed) {
  const M = Object.create(Math);
  M.random = () => {
    let t = (seed += 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ctx = vm.createContext({
    console,
    Math: M,
    Date,
    JSON,
    Object,
    Array,
    location: { search: '' },
    URLSearchParams,
    PAL_CSS
  });
  for (const f of ['palette.js', 'ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'world.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
  return vm.runInContext(
    `(() => {
    S = { lv: 1, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: { wood: 20, 'iron:1': 16 } }, prd: PRD0(), inv: { items: [] }, camp: newCamp(), auto2: AUTO2(), world: newWorld(), gold: 0, star: 1, idols: [] };
    let SIMT = 0;
    tradeNow = () => SIMT;
    const ORDER = ${JSON.stringify(ORDER)}, CAP = ${JSON.stringify(CAP)}, K = ['iron', 'hide', 'silk'],
      eq = k => (k === 'wood' ? matN('wood') : [1, 2, 3, 4, 5, 6].reduce((a, T) => a + matN(k, T) * 3 ** (T - 1), 0)),
      snap = () => ({ ...S.mat.mats }),
      low = { iron: 0, hide: 0, silk: 0 }, /* 設施升級用比要求低的階付掉的（T1 當量） */
      sold = { wood: 0, iron: 0, hide: 0, silk: 0 }, /* 商會換掉的（T1 當量） */
      got = { tran: 0, aug: 0, rich: 0, exalt: 0 },
      rows = [], ups = [];
    let next = ${EVERY}, store4 = null, flip = 0;
    const row = h => rows.push({ h, lv: ORDER.map(b => S.camp[b] || 0).join('/'), node: S.camp.watch,
      mats: Object.fromEntries(K.map(k => [k, [1, 2, 3, 4, 5, 6].map(T => Math.round(matN(k, T)))])),
      wood: Math.round(matN('wood')), eqv: Object.fromEntries(['wood', ...K].map(k => [k, Math.round(eq(k))])),
      low: { ...low }, sold: { ...sold }, got: { ...got } });
    for (let r = 0; SIMT < ${HRS} * 3600; r++) {
      S.world.cur = TRUNK_K[Math.min(S.camp.watch, TRUNK.length - 1)];
      const t = lvT(WNODE[S.world.cur].lv), nE = eliteCount(1), N = ${NS} + nE + 1,
        od = { star: 1, p: mapCurP(1, ${NS}, nE), ilvl: tierIlvl(t), tier: t };
      for (let i = 0, ei = 0; i < N; i++) {
        const e = i < N - 1 && ei < nE && (i + 1) % Math.floor((N - 1) / (nE + 1)) === 0,
          m = i === N - 1 ? { boss: 1 } : e ? { elite: 1 } : {};
        killMat(m, t, e ? { ...od, ei: ++ei } : od);
        SIMT = r * ${SEC} + ((i + 1) / N) * ${SEC};
        S.gold += (125 * ${SEC}) / 60 / N;
        for (const b of ORDER) {
          const n = campNext(b), m0 = snap();
          if (campUp(b)) continue;
          for (const key in (n && n.mats) || {}) {
            const [k, T] = matOf(key);
            for (let u = 1; u < T; u++) low[k] += ((m0[k + ':' + u] || 0) - (S.mat.mats[k + ':' + u] || 0)) * 3 ** (u - 1);
          }
          ups.push([b, S.camp[b], +(SIMT / 3600).toFixed(2)]);
          if (b === 'store' && S.camp.store === 4) store4 = SIMT / 3600;
        }
        /* 商會：多出來的從最低階起換，蛻變石／增幅石輪流 */
        if (campCan('trade')) {
          for (const k of ['wood', ...K])
            for (let guard = 0; guard < 300 && eq(k) > CAP[k]; guard++) {
              const cs = Object.keys(TRADE_CUR[k]), c = cs[flip++ % cs.length],
                T = k === 'wood' ? 0 : [1, 2, 3, 4, 5, 6].find(T => matN(k, T) >= tradeCost(k, T, c));
              if (T === undefined) break;
              const q = tradeCost(k, T, c) * (T ? 3 ** (T - 1) : 1);
              if (tradeCur(k, T, c)) break;
              sold[k] += q; got[c]++;
            }
        }
        if (SIMT >= next * 3600) row(next), (next += ${EVERY});
      }
    }
    return { rows, store4, ups };
  })()`,
    ctx
  );
}
const MN = {
  iron: ['生鐵', '熟鐵', '百煉鋼', '玄鐵', '寒鐵', '隕鐵'],
  hide: ['生皮', '鞣皮', '厚革', '玄革', '霜革', '神獸革'],
  silk: ['繭絲', '熟絲', '彩絲', '巫絲', '祭絲', '神絲']
};
const f = n => Math.round(n).toLocaleString('en-US');
console.log(
  `新存檔（木 20、生鐵 16）、一輪 ${SEC} 秒（小怪 ${NS}、1★ 菁英、王）、${HRS} 小時、${SEEDS} 個種子；走真的 killMat／campUp（任何階付款）／tradeCur（每小時額度，模擬時間）。不打造。`
);
console.log(`商會規則：T1 當量超過 §6.2 上限 ${JSON.stringify(CAP)} 才換，從最低階起`);
for (let s = 0; s < SEEDS; s++) {
  const R = one(20261126 + s * 7919);
  console.log(`\n## 種子 ${s + 1}：倉房 Lv4（商會開張）在第 ${R.store4 ? R.store4.toFixed(2) : '—'} 小時`);
  console.log(
    '小時 | 設施等級 鍛/瞭/長/斥/倉 | 鐵 T1…T6 | 皮 T1…T6 | 靈絲 T1…T6 | 木 | T1 當量 鐵／皮／靈絲 | 設施用低階付掉（T1 當量）鐵／皮／靈絲 | 商會換掉（T1 當量）木／鐵／皮／靈絲 | 換到 蛻變／增幅／富豪／崇高'
  );
  for (const r of R.rows)
    console.log(
      [
        r.h,
        r.lv,
        r.mats.iron.map(f).join(' '),
        r.mats.hide.map(f).join(' '),
        r.mats.silk.map(f).join(' '),
        f(r.wood),
        ['iron', 'hide', 'silk'].map(k => f(r.eqv[k])).join('／'),
        ['iron', 'hide', 'silk'].map(k => f(r.low[k])).join('／'),
        ['wood', 'iron', 'hide', 'silk'].map(k => f(r.sold[k])).join('／'),
        ['tran', 'aug', 'rich', 'exalt'].map(k => r.got[k]).join('／')
      ].join(' | ')
    );
}
console.log(
  `\n階名：${Object.entries(MN)
    .map(([k, a]) => a.join('、'))
    .join('；')}`
);
