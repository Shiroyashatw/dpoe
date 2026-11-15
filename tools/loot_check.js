/* dungeonPOE 0.5.1 · 新手第一小時的節奏模擬（docs/工坊與解鎖表.md 第 2 節）：在 Node 載入純邏輯，從新存檔開始，
   戰鬥照連續刷一輪（小怪＋菁英＋王，roundLoot，一輪 SEC 秒）走真的掉落函式拿靈魂；營地的產生器每秒照產（genTick）；
   一個「會按的玩家」：解鎖表夠了就升（鍛造台、民房、瞭望台、祭壇、斥候營、倉房），產生器用剩下的木買（留夠下一件解鎖表要的木與鐵），
   瞭望台開了新地點就過去刷。每一分鐘印：在哪、靈魂、木、鐵、這一分鐘按了幾次產生器、解鎖了什麼。
   用法：node tools/loot_check.js [一輪幾秒，預設 150] [小怪數，預設 40] [分鐘，預設 60]；固定亂數，同參數結果一樣。只量不改數字 */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const SEC = +process.argv[2] || 150,
  NS = +process.argv[3] || 40,
  MIN = +process.argv[4] || 60;
let seed = 20261115;
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
for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'world.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
const R = s => vm.runInContext(s, ctx);
console.log(
  `新存檔、一輪 ${SEC} 秒（小怪 ${NS}、菁英照 1★）、${MIN} 分鐘；會按的玩家：解鎖表夠了就升、產生器用剩下的木買`
);
console.log('分 | 地點 | 靈魂 | 木 | 鐵 | 產生器按了幾級 | 這一分鐘的新東西');
const r = R(`(() => {
  S = { lv: 1, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: { wood: 20 } }, prd: PRD0(), inv: { items: [] }, camp: newCamp(), auto2: AUTO2(), world: newWorld(), gold: 0, star: 1 };
  const rows = [], news = [], ORDER = ['forge', 'house', 'watch', 'altar', 'scout', 'store'];
  let t = 0, nextRound = ${SEC}, genN = 0, genAll = 0, msN = 0;
  const node = () => TRUNK[Math.min(S.camp.watch, TRUNK.length - 1)];
  /* 下一件解鎖表（靈魂最少的那一件）：靈魂已經夠了、只差木或材料時，產生器不能吃掉它要的 */
  const reserve = () => {
    const L = ORDER.map(b => campNext(b)).filter(Boolean).sort((a, b) => a.soul - b.soul)[0];
    return L && S.mat.soul >= L.soul ? { wood: L.wood || 0, mats: L.mats || {} } : { wood: 0, mats: {} };
  };
  for (let min = 1; min <= ${MIN}; min++) {
    const un = [];
    for (; t < min * 60; t++) {
      genTick(1);
      if (t >= nextRound) {
        nextRound += ${SEC};
        roundLoot(lvT(node().lv), 1, ${NS}, eliteCount(1));
        S.gold += 125 * ${SEC} / 60;
      }
      if (t % 5) continue;
      for (const b of ORDER)
        if (!campUp(b)) un.push(CAMPN[b] + ' Lv' + S.camp[b] + '：' + CAMP[b][S.camp[b] - 1].d);
      /* 產生器：一次一級，最便宜的先，留下一件解鎖表要的 */
      for (let g = 0; g < 50; g++) {
        const rs = reserve(), ok = GEN_K.filter(k => {
          if (!genOn(k) || genAfford(k) < 1) return false;
          const c = genCost(k);
          if (k !== 'wood' && matN('wood') - c.wood < rs.wood) return false;
          return Object.keys(c.mats).every(key => matN(...matOf(key)) - c.mats[key] >= (rs.mats[key] || 0));
        });
        if (!ok.length) break;
        const k = ok.reduce((a, b) => (genCost(a).wood <= genCost(b).wood ? a : b)), m0 = genMs(genOf(k).lv);
        genUp(k);
        const m1 = genMs(genOf(k).lv);
        genN++; genAll++;
        if (m1.m > m0.m || m1.slots > m0.slots || m1.tu > m0.tu) un.push(GEN[k].n + ' Lv' + genOf(k).lv + ' 里程碑'), msN++;
      }
    }
    rows.push([min, node().lv, Math.round(S.mat.soul), matN('wood'), Object.entries(S.mat.mats).filter(([k]) => k.startsWith('iron')).map(([k, n]) => k.replace('iron:', 'T') + ' ' + n).join(' '), genN, un.join('；')]);
    news.push(...un.map(u => min + ' ' + u));
    genN = 0;
  }
  return { rows, news, camp: S.camp, genAll, msN, rates: genRates() };
})()`);
for (const row of r.rows) console.log(row.map(v => String(v).padStart(5)).join(' | '));
const c = r.camp;
console.log(
  `\n${MIN} 分鐘：新東西 ${r.news.length} 個（里程碑 ${r.msN}）、產生器升了 ${r.genAll} 級；鍛造台 ${c.forge}、瞭望台 ${c.watch}、斥候營 ${c.scout}、民房 ${c.house}、祭壇 ${c.altar}、倉房 ${c.store}；林場 ${c.gen.wood.lv}、礦場 ${c.gen.iron.lv}、獵場 ${c.gen.hide.lv}、絲地 ${c.gen.silk.lv}`
);
console.log('每分鐘產量：' + JSON.stringify(r.rates));
console.log(
  '對文件第 2 節（目標：新東西每 3 分鐘一個、第一小時 ≥18；產生器 80～100 級）。只量不改：調了寫回 docs/工坊與解鎖表.md'
);
