/* dungeonPOE 0.4.1 · 掉落量的「有感事件」模擬（企劃書 5.4.5、2.2）：在 Node 載入純邏輯，照連續刷一輪（小怪＋菁英＋王）走真的掉落函式，
   數每 5 分鐘有幾次有感事件（★、追憶、崇高石各階、高階與完美通貨），目標每 5 分鐘至少 1 次；
   0.4.8 加每小時進帳多少靈魂、解鎖一顆輔助 II（SUP2_COST）要刷幾分鐘。
   用法：node tools/loot_check.js [小時，預設 4] [一輪幾秒，預設 60]；固定亂數，同參數結果一樣。只量不改數字 */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const HOURS = +process.argv[2] || 4,
  SEC = +process.argv[3] || 60;
let seed = 20261112;
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
  `連續刷 ${HOURS} 小時、一輪 ${SEC} 秒（${Math.floor((HOURS * 3600) / SEC)} 輪）；小怪 40、菁英照星級（eliteCount）`
);
console.log(
  `節點 Lv | 星 | ★ | 追憶 | 崇高 | 高階 | 完美 | 有感事件／5 分鐘 | 靈魂／時 | 輔助 II（${R('SUP2_COST')}）幾分鐘`
);
let bad = 0;
for (const lv of [18, 33, 53, 73, 83])
  for (const star of [1, 3, 5]) {
    const r = R(`(() => {
      S = { lv: 90, mat: newMat(), prd: PRD0(), inv: { items: [] } };
      const t = lvT(${lv}), n = Math.floor(${HOURS * 3600} / ${SEC}), o = { f: 0, m: 0, ex: 0, g: 0, p: 0, s: 0 };
      for (let i = 0; i < n; i++) {
        const m0 = { ...S.mat };
        for (const it of roundLoot(t, ${star}, 40, eliteCount(${star}))) (o.f += it.frac ? 1 : 0), (o.m += it.mem ? 1 : 0);
        const d = k => S.mat[k] - m0[k];
        o.ex += d('exalt');
        o.s += d('soul');
        o.g += ['tran2', 'aug2', 'rich2', 'exalt2'].reduce((a, k) => a + d(k), 0);
        o.p += ['tran3', 'aug3', 'rich3', 'exalt3'].reduce((a, k) => a + d(k), 0);
      }
      return o;
    })()`);
    const ev = r.f + r.m + r.ex + r.g + r.p,
      per5 = ev / ((HOURS * 60) / 5),
      soulH = r.s / HOURS;
    if (per5 < 1) bad++;
    console.log(
      `Lv${String(lv).padStart(2)} | ${star}★ | ${r.f} | ${r.m} | ${r.ex} | ${r.g} | ${r.p} | ${per5.toFixed(2)}${per5 < 1 ? ' ⚠️ 不到 1' : ''} | ${Math.round(soulH)} | ${((R('SUP2_COST') / soulH) * 60).toFixed(1)}`
    );
  }
console.log(
  bad ? `⚠️ ${bad} 組不到每 5 分鐘 1 次（只量不改，數字等實際玩過再調）` : '每一組都至少每 5 分鐘 1 次有感事件'
);
