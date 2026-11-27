/* dungeonPOE 0.5.1 · 新手第一小時的節奏模擬（docs/工坊與解鎖表.md 第 2 節）：在 Node 載入純邏輯，從新存檔開始，
   戰鬥照連續刷一輪（小怪＋菁英＋王，roundLoot，一輪 SEC 秒）走真的掉落函式拿靈魂與材料（材料來源 v1.1 殺怪掉材料，開局木 20、生鐵 16）；產生器與民房 mumi 2026-11-25 收掉（沒有背景生產）；
   一個「會按的玩家」：五座設施夠了就升（鍛造台、瞭望台、長老屋、斥候營、倉房），瞭望台開了新地點就過去刷。
   每一分鐘印：在哪、靈魂、木、鐵、解鎖了什麼。
   用法：node tools/loot_check.js [一輪幾秒，預設 150] [小怪數，預設 40] [分鐘，預設 60]；固定亂數，同參數結果一樣。只量不改數字 */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
/* js/palette.js 在 Node 讀 css/style.css（M2-34-0）：每個 vm 環境都帶 PAL_CSS */
const PAL_CSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8'),
  vmCtx = vm.createContext;
vm.createContext = o => vmCtx(Object.assign(o, { PAL_CSS }));
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
const R = s => vm.runInContext(s, ctx);
console.log(`新存檔、一輪 ${SEC} 秒（小怪 ${NS}、菁英照 1★）、${MIN} 分鐘；會按的玩家：五座設施夠了就升（沒有產生器）`);
console.log('分 | 地點 | 靈魂 | 木 | 鐵 | 這一分鐘的新東西');
const r = R(`(() => {
  S = { lv: 1, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: { wood: 20, 'iron:1': 16 } }, prd: PRD0(), inv: { items: [] }, camp: newCamp(), auto2: AUTO2(), world: newWorld(), gold: 0, star: 1 };
  const rows = [], news = [], ORDER = ['forge', 'watch', 'altar', 'scout', 'store'];
  let t = 0, nextRound = ${SEC};
  const node = () => TRUNK[Math.min(S.camp.watch, TRUNK.length - 1)];
  for (let min = 1; min <= ${MIN}; min++) {
    const un = [];
    for (; t < min * 60; t++) {
      if (t >= nextRound) {
        nextRound += ${SEC};
        S.world.cur = TRUNK_K[Math.min(S.camp.watch, TRUNK.length - 1)];
        roundLoot(lvT(node().lv), 1, ${NS}, eliteCount(1));
        S.gold += 125 * ${SEC} / 60;
      }
      if (t % 5) continue;
      for (const b of ORDER)
        if (!campUp(b)) un.push(CAMPN[b] + ' Lv' + S.camp[b] + '：' + CAMP[b][S.camp[b] - 1].d);
    }
    rows.push([min, node().lv, Math.round(S.mat.soul), matN('wood'), Object.entries(S.mat.mats).filter(([k]) => k.startsWith('iron')).map(([k, n]) => k.replace('iron:', 'T') + ' ' + n).join(' '), un.join('；')]);
    news.push(...un.map(u => min + ' ' + u));
  }
  return { rows, news, camp: S.camp };
})()`);
for (const row of r.rows) console.log(row.map(v => String(v).padStart(5)).join(' | '));
const c = r.camp;
console.log(
  `\n${MIN} 分鐘：新東西 ${r.news.length} 個；鍛造台 ${c.forge}、瞭望台 ${c.watch}、斥候營 ${c.scout}、長老屋 ${c.altar}、倉房 ${c.store}`
);
/* 0.5.3：鍛造台 Lv20、第 13 個地點（Lv38）、1★ 刷一小時（25 輪）掉幾顆破裂石、完美石、追憶之墨、珠寶 */
const d = R(`(() => { S.camp = { ...newCamp(), forge: 20 }; S.mat = newMat(); S.prd = PRD0(); S.jewels = [];
  let t = 0; for (let h = 0; h < 10; h++) for (let i = 0; i < 25; i++) roundLoot(lvT(38), 1, ${NS}, eliteCount(1));
  return [S.mat.frac / 10, S.mat.perf / 10, S.mat.ink / 10, S.jewels.length / 10]; })()`);
console.log(
  `鍛造台 Lv20、Lv38、1★、每小時 25 輪（10 小時平均）：破裂石 ${d[0]}、完美石 ${d[1]}、追憶之墨 ${d[2]}、珠寶 ${d[3]}／小時`
);
console.log('對文件第 2 節（目標：新東西每 3 分鐘一個、第一小時 ≥18）。只量不改：調了寫回 docs/工坊與解鎖表.md');
