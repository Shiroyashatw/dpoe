/* Task A 快篩（混合重播）：營地邏輯全用遊戲的純邏輯（genTick、genUp、campUp、campNext、reserve；同 tools/camp_run.js 的 PLAY 購買規則，每 5 秒），
   只有「靈魂收入」與「打造吃掉的鐵 T1」從一場真的 camp_run CSV 逐分鐘拿（收入平均攤到每秒；打造用量在那分鐘末扣）。
   這樣木與鐵的門檻是模擬的，靈魂是那一場真的收入。⚠️ 近似：收入不隨重播改變（實際上瞭望台的早晚會改地點、鍛造台 2 會多打 2 件、多分解出靈魂）。
   IRONCSV=1＝鐵 T1 不模擬，直接用那一場的實測庫存（同一條鐵的時間線上比較候選）。LUMP＝靈魂每幾秒一次進帳（預設 1＝平均攤開；30／60 模擬王與分解一次一大包）。用環境變數在記憶體改 CAMP（不改檔案）：F2S／F2W 鍛造台 Lv2 靈魂／木、H2S／H2W 民房 Lv2、A1S／A1W 祭壇 Lv1、W1S／W1I 瞭望台 Lv1 靈魂／鐵 T1。
   用法：REPO=repo路徑 node hybrid.js 檔.csv... [--csv 輸出]；印每場的解鎖分鐘 */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const REPO = process.env.REPO || path.join(__dirname, '..', '..');
const a = process.argv.slice(2), ci = a.indexOf('--csv'), OUT = ci >= 0 ? a.splice(ci, 2)[1] : null;
const ctx = { console, Math: Object.create(Math), Date, JSON, Object, Array, location: { search: '' }, URLSearchParams };
vm.createContext(ctx);
for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'world.js'])
  vm.runInContext(fs.readFileSync(path.join(REPO, 'js', f), 'utf8'), ctx, { filename: f });
const R = s => vm.runInContext(s, ctx);
const E = process.env, ov = { F2S: E.F2S, F2W: E.F2W, H2S: E.H2S, H2W: E.H2W, A1S: E.A1S, A1W: E.A1W, W1S: E.W1S, W1I: E.W1I };
R(`(o => {
  if (o.F2S) CAMP.forge[1].soul = +o.F2S; if (o.F2W) CAMP.forge[1].wood = +o.F2W;
  if (o.H2S) CAMP.house[1].soul = +o.H2S; if (o.H2W) CAMP.house[1].wood = +o.H2W;
  if (o.A1S) CAMP.altar[0].soul = +o.A1S; if (o.A1W) CAMP.altar[0].wood = +o.A1W;
  if (o.W1S) CAMP.watch[0].soul = +o.W1S; if (o.W1I) CAMP.watch[0].mats = { 'iron:1': +o.W1I };
})(${JSON.stringify(ov)})`);
const cfg = R(`({ f2: CAMP.forge[1].soul + '/' + CAMP.forge[1].wood, h2: CAMP.house[1].soul + '/' + CAMP.house[1].wood, a1: CAMP.altar[0].soul + '/' + CAMP.altar[0].wood, w1: CAMP.watch[0].soul + '/' + CAMP.watch[0].wood + '/' + JSON.stringify(CAMP.watch[0].mats) })`);
const L = [['run', 'forge2(soul/wood)', 'house2', 'altar1', 'watch1(soul/wood/iron)', 'house1', 'forge1', 'altar1_min', 'watch1_min', 'house2_min', 'forge2_min', 'forge3_min', 'order'].join(',')];
for (const f of a) {
  const C = fs.readFileSync(f, 'utf8').trim().split('\n').slice(1).map(r => r.split(','));
  const inc = C.map(r => +r[4]), cu = C.map(r => +r[17] || 0), ir = C.map(r => +r[12]), wb = C.map(r => +r[6] > 0);
  const r = R(`(() => {
    S = { lv: 1, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: { wood: 20 } }, prd: PRD0(), inv: { items: [] }, camp: newCamp(), auto2: AUTO2(), world: newWorld(), gold: 0, star: 1 };
    const ir = ${JSON.stringify(ir)}, wb = ${JSON.stringify(wb)}, IRONCSV = ${+(process.env.IRONCSV || 0)};
    let wbAt = wb.indexOf(true);
    const inc = ${JSON.stringify(inc)}, LUMP = ${+(process.env.LUMP || 1)}, lumpAdd = t => { let a = 0; for (let u = t - LUMP + 1; u <= t; u++) a += inc[Math.floor((u - 1) / 60)] / 60; return a; }, cu = ${JSON.stringify(cu)}, ORDER = ['forge', 'house', 'watch', 'altar', 'scout', 'store'], ev = [];
    for (let t = 1; t <= inc.length * 60; t++) {
      genTick(1);
      if (t % LUMP === 0) S.mat.soul += lumpAdd(t);
      if (t % 60 === 0) S.mat.mats['iron:1'] = Math.max(0, (S.mat.mats['iron:1'] || 0) - cu[t / 60 - 1]);
      if (IRONCSV) {
        /* 鐵 T1 照那一場實測的庫存（分鐘末之間線性內插）；那一場買瞭望台扣掉的 130 加回去，重播自己買了再扣 */
        const m = Math.floor((t - 1) / 60), f = ((t - 1) % 60) / 60, a = m ? ir[m - 1] : 0, b = ir[m];
        S.mat.mats['iron:1'] = Math.max(0, Math.round(a + (b - a) * f + (wbAt >= 0 && m >= wbAt ? 130 : 0) - (S.camp.watch ? 130 : 0)));
      }
      if (t % 5) continue;
      for (const b of ORDER) if (!campUp(b)) ev.push([b + S.camp[b], t]);
      const nx = ORDER.map(b => campNext(b)).filter(Boolean).sort((a, b) => a.soul - b.soul)[0],
        rs = nx && S.mat.soul >= nx.soul ? nx : { wood: 0, mats: {} };
      for (let g = 0; g < 30; g++) {
        const ok = GEN_K.filter(k => {
          if (!genOn(k) || genAfford(k) < 1) return false;
          const c = genCost(k);
          if (k !== 'wood' && matN('wood') - c.wood < (rs.wood || 0)) return false;
          return Object.keys(c.mats).every(key => matN(...matOf(key)) - c.mats[key] >= ((rs.mats || {})[key] || 0));
        });
        if (!ok.length) break;
        genUp(ok.reduce((a, b) => (genCost(a).wood <= genCost(b).wood ? a : b)));
      }
    }
    return ev;
  })()`);
  const t = {}; for (const [k, s] of r) if (!(k in t)) t[k] = s;
  const m = k => (t[k] ? (t[k] / 60).toFixed(2) : '');
  const ord = r.filter(([k]) => /^(forge[123]|house[12]|altar1|watch1)$/.test(k)).map(x => x[0]).join('>');
  L.push([f.split('/').pop().replace('.csv', ''), cfg.f2, cfg.h2, cfg.a1, cfg.w1, m('house1'), m('forge1'), m('altar1'), m('watch1'), m('house2'), m('forge2'), m('forge3'), ord].join(','));
}
console.log(L.join('\n'));
if (OUT) fs.writeFileSync(OUT, L.join('\n') + '\n');
