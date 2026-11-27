/* 新存檔 → 五座設施各自第一次升級要多久、殺幾隻（材料來源 v1.1 的殺怪掉材料）。在 Node 載入純邏輯，
   一隻一隻殺：每隻都走真的 killMat（靈魂、通貨、木、鐵／皮／靈絲照 killMats），一輪 SEC 秒平均攤給小怪 NS、菁英（1★ eliteCount）、王（最後一隻）；
   開局材料照 newGame（木 20、生鐵 16）；每殺一隻「會按的玩家」照 鍛造台 → 瞭望台 → 長老屋 → 斥候營 → 倉房 能升就升，瞭望台開了新地點就過去刷。
   不打造（生鐵 16 不花掉）、不算撿東西與走路的時間。
   用法：node tools/mat_first.js [一輪幾秒，預設 150] [小怪數，預設 40] [種子數，預設 10]；同參數結果一樣 */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const PAL_CSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
const SEC = +process.argv[2] || 150,
  NS = +process.argv[3] || 40,
  SEEDS = +process.argv[4] || 10,
  ORDER = ['forge', 'watch', 'altar', 'scout', 'store'];
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
  for (const f of [
    'palette.js',
    'ptdata.js',
    'data.js',
    'items.js',
    'uniq.js',
    'craft.js',
    'combat.js',
    'maps.js',
    'world.js'
  ])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
  return vm.runInContext(
    `(() => {
    S = { lv: 1, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: { wood: 20, 'iron:1': 16 } }, prd: PRD0(), inv: { items: [] }, camp: newCamp(), auto2: AUTO2(), world: newWorld(), gold: 0, star: 1 };
    const first = {}, ORDER = ${JSON.stringify(ORDER)};
    let kills = 0, sec = 0;
    for (let r = 0; r < 200 && ORDER.some(b => !first[b]); r++) {
      S.world.cur = TRUNK_K[Math.min(S.camp.watch, TRUNK.length - 1)];
      const t = lvT(WNODE[S.world.cur].lv), nE = eliteCount(1), N = ${NS} + nE + 1,
        od = { star: 1, p: mapCurP(1, ${NS}, nE), ilvl: tierIlvl(t), tier: t };
      for (let i = 0, ei = 0; i < N; i++) {
        /* 菁英平均插在小怪中間（同 roundLoot 給 ei），王最後 */
        const e = i < N - 1 && ei < nE && (i + 1) % Math.floor((N - 1) / (nE + 1)) === 0,
          m = i === N - 1 ? { boss: 1 } : e ? { elite: 1 } : {};
        killMat(m, t, e ? { ...od, ei: ++ei } : od);
        kills++;
        sec = r * ${SEC} + ((i + 1) / N) * ${SEC};
        S.gold += (125 * ${SEC}) / 60 / N;
        for (const b of ORDER) if (!campUp(b) && !first[b]) first[b] = { sec, kills, mats: { ...S.mat.mats }, soul: Math.round(S.mat.soul) };
      }
    }
    return first;
  })()`,
    ctx
  );
}
const CAMPN = { forge: '鍛造台', watch: '瞭望台', altar: '長老屋', scout: '斥候營', store: '倉房' };
const P = (a, q) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.ceil(q * a.length) - 1)];
const runs = Array.from({ length: SEEDS }, (_, i) => one(20261125 + i * 7919));
console.log(
  `新存檔（木 20、生鐵 16）、一輪 ${SEC} 秒（小怪 ${NS}、1★ 菁英、王）、${SEEDS} 個種子；一隻一隻走 killMat；會按的玩家照 ${ORDER.map(b => CAMPN[b]).join(' → ')} 能升就升`
);
console.log('設施 Lv1 | 時間 P50／P90（分:秒） | 擊殺 P50／P90 | 種子 1 當下的材料');
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
for (const b of ORDER) {
  const L = runs.map(r => r[b]).filter(Boolean);
  if (L.length < SEEDS) {
    console.log(`${CAMPN[b]} | ${SEEDS - L.length} 個種子 ${200} 輪內沒升到`);
    continue;
  }
  const s = L.map(x => x.sec),
    k = L.map(x => x.kills);
  console.log(
    `${CAMPN[b]} | ${mmss(P(s, 0.5))}／${mmss(P(s, 0.9))} | ${P(k, 0.5)}／${P(k, 0.9)} | 靈魂 ${L[0].soul}、${JSON.stringify(L[0].mats)}（升完後）`
  );
}
