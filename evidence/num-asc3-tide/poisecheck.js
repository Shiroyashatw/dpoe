/* num-asc3-tide：寒潮反擊為什麼量不到——用遊戲的 poise() 算第 16 階普通怪／菁英／王的冰凍穩固值，
   再用 out_final 的實測「每次被擊中掉多少」（taken ÷ hits，潮汐電弧、等級點 a）算一下擊中累積幾 %（poiseAdd：dmg × 2.1 × 100 ÷ 穩固值，冰凍累積提高另計） */
const fs = require('fs'), vm = require('vm'), path = require('path');
const REPO = path.join(__dirname, '..', '..');
const ctx = { console, Math, Date, JSON, Object, Array, Set, location: { search: '' }, URLSearchParams, PAL_CSS: fs.readFileSync(path.join(REPO, 'css', 'style.css'), 'utf8') };
vm.createContext(ctx);
for (const f of ['palette.js', 'ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'mech.js']) vm.runInContext(fs.readFileSync(path.join(REPO, 'js', f), 'utf8'), ctx, { filename: f });
vm.runInContext(`var G = { t: 0, mapT: 16, scene: 'map', mobs: [] }, P = {}, S, ST; ST = stats({ lv: 1, eq: {}, pt: [], asc: null, at: [], auras: [], charms: [] });`, ctx);
const R = s => vm.runInContext(s, ctx);
const po = { 普通: R(`poise({ ail: {} }, 'frz')`), 菁英: R(`poise({ elite: 1, ail: {} }, 'frz')`), 王: R(`poise({ boss: 1, ail: {} }, 'frz')`) };
const L = fs.readFileSync(__dirname + '/out_final.jsonl', 'utf8').split('\n').filter(Boolean).map(JSON.parse)
  .filter(r => r.tag.b === 'arc' && r.tag.asc === 'tide' && r.tag.pt === 'a' && r.hits);
const per = L.map(r => r.taken / r.hits).sort((a, b) => a - b), d = per[per.length >> 1];
console.log(`第 16 階冰凍穩固值：${Object.entries(po).map(([k, v]) => k + ' ' + Math.round(v)).join('、')}`);
console.log(`潮汐電弧（a）每次被擊中實際掉血 P50 ${d.toFixed(0)}（${per.length} 場）→ 一次擊中累積：${Object.entries(po).map(([k, v]) => k + ' ' + ((d * 2.1 * 100) / v).toFixed(2) + '%').join('、')}（再乘冰凍累積提高 1＋frzP/100）`);
