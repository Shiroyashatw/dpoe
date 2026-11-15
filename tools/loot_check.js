/* dungeonPOE 0.5.0 · 新手第一小時的節奏模擬（docs/工坊與解鎖表.md 第 2 節）：在 Node 載入純邏輯，照連續刷一輪（小怪＋菁英＋王）走真的掉落函式，
   從新存檔開始、停在第一個地點（或照 push 每打倒一次王就往下推），每一分鐘數：靈魂、鐵、打得起幾件（鐵 ÷ 8）、鍛造台升到幾級（靈魂夠就升）、
   第一小時幾個「新東西」（鍛造台每升一級算一個）；對第 2 節的表看哪一列對不上。
   用法：node tools/loot_check.js [一輪幾秒，預設 60] [小怪數，預設 40] [push＝1 每輪往下推一個點]；固定亂數，同參數結果一樣。只量不改數字 */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const SEC = +process.argv[2] || 60,
  NS = +process.argv[3] || 40,
  PUSH = process.argv[4] === '1';
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
  `新存檔、一輪 ${SEC} 秒（小怪 ${NS}、菁英照 1★）${PUSH ? '、每輪往下推一個點' : '、停在第一個地點'}；每分鐘一列`
);
console.log('分 | 地點 Lv | 靈魂（累計） | 鐵（累計） | 這一分鐘打得起（件） | 鍛造台 Lv | 這一分鐘解鎖');
const r = R(`(() => {
  S = { lv: 1, mat: newMat(), prd: PRD0(), inv: { items: [] }, camp: newCamp(), auto2: AUTO2(), world: newWorld(), gold: 0 };
  const rows = [], news = [];
  let t = 0, soulSum = 0, ironSum = 0, nodeI = 0, mats0 = 0;
  const ironAll = () => Object.entries(S.mat.mats).filter(([k]) => k.startsWith('iron:')).reduce((a, [, n]) => a + n, 0);
  for (let min = 1; min <= 60; min++) {
    const un = [];
    while (t < min * 60) {
      const lv = TRUNK[Math.min(nodeI, TRUNK.length - 1)].lv, T = lvT(lv);
      roundLoot(T, 1, ${NS}, eliteCount(1));
      /* 打倒王：主幹算走過、往下推 */
      S.world.done.push(TRUNK_K[nodeI]);
      if (${PUSH ? 'true' : 'false'}) nodeI = Math.min(TRUNK.length - 1, nodeI + 1);
      t += ${SEC};
      /* 靈魂夠就升鍛造台 */
      while (!campUp('forge')) un.push('鍛造台 Lv' + S.camp.forge + '：' + CAMP.forge[S.camp.forge - 1].d);
    }
    const iron = ironAll(), got = iron - mats0; mats0 = iron;
    rows.push([min, TRUNK[Math.min(nodeI, TRUNK.length - 1)].lv, S.mat.soul, iron, Math.floor(got / 8), S.camp.forge, un.join('；')]);
    news.push(...un);
  }
  return { rows, news: news.length, lv: S.camp.forge, iron: ironAll(), soul: S.mat.soul };
})()`);
for (const row of r.rows) console.log(row.map(v => String(v).padStart(6)).join(' | '));
console.log(
  `第一小時：鍛造台 Lv${r.lv}（文件第 2 節目標 Lv8）、新東西 ${r.news} 個（鍛造台的等級；目標含另外三座 14 個）、靈魂共 ${r.soul}、鐵共 ${r.iron}`
);
console.log('只量不改：對不上先調掉量再調費用，調了寫回 docs/工坊與解鎖表.md');
