/* Task B：直接呼叫真的 killMat，看每一種怪物（小怪、菁英、七情王 m.mini、輪末王）掉了有感物品時 P.feel（S.prd.feel）變成多少、沒掉時變成多少。
   起始 S.prd.feel＝5；第 15 個主幹地點、鍛造台 20。用法：REPO=repo路徑 node feel_reset_probe.js */
const fs = require('fs'), vm = require('vm'), path = require('path');
const REPO = process.env.REPO || path.join(__dirname, '..', '..');
const c = { console, Math: Object.create(Math), Date, JSON, Object, Array, location: { search: '' }, URLSearchParams };
vm.createContext(c);
for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'world.js']) vm.runInContext(fs.readFileSync(path.join(REPO, 'js', f), 'utf8'), c);
console.log(vm.runInContext(`(() => {
  const base = () => ({ lv: 90, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: {} }, prd: PRD0(), inv: { items: [] }, camp: { ...newCamp(), forge: 20 },
    auto2: AUTO2(), world: { ...newWorld(), cur: TRUNK_K[14] }, gold: 0, star: 1, chase: { pts: 0, got: {} }, rounds: [], jewels: [] });
  const hi = lvT(TRUNK[14].lv), L = [];
  for (const [n, m] of [['小怪 k=0', {}], ['菁英 k=1', { elite: 1 }], ['七情王 m.mini k=1', { boss: 1, mini: 1 }], ['輪末王 k=2', { boss: 1 }]]) {
    S = base(); let tries = 0, g;
    for (;;) { S.prd.feel = 5; const c0 = S.mat.frac + S.mat.perf + S.mat.ink + S.jewels.length; g = killMat(m, hi, { ei: 1 }); tries++;
      if (g.chase || S.mat.frac + S.mat.perf + S.mat.ink + S.jewels.length > c0 || tries > 500000) break; }
    const hit = S.prd.feel;
    S = base(); S.prd.feel = 5; const R = Math.random; Math.random = () => 0.999999; killMat(m, hi, { ei: 1 }); Math.random = R;
    L.push(n + '：有感掉落（第 ' + tries + ' 隻）後 P.feel 5 → ' + hit + '（掉了：' + g.filter(x => typeof x === 'string').join('、') + '）；沒掉時 P.feel 5 → ' + S.prd.feel);
  }
  return L.join('\\n');
})()`, c));
