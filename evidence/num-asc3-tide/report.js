/* num-asc3-tide：整理 final（和調整方案）的結果 → results.csv、results.json、印出總表。
   node report.js out_final.jsonl [out_tune_X.jsonl …]
   每格（配裝, 昇華, 路線, 等級點）10 個種子：
   - 打王：穩態 DPS＝同一隻王生命 ×50 打 60 秒，10～60 秒的傷害 ÷ 50（不會打死，不受接近王的時間影響）；10 秒爆發＝前 10 秒 ÷ 10；
     另列原生命的擊殺秒數（180 秒沒打死記 null）
   - 清怪：進場到王出現的秒數（300 秒沒清完記 null），另列每秒擊殺
   - EHP：王一招（BOSSES 最高 dmg × tierMob(16).dmg × BOSS_DMG × 1.4）用 hurtCalc 平均 600 次的有效生命；物理、元素（火冰電調和平均）各一，綜合＝兩者幾何平均
   - 時間平均受傷：穩態打王（60 秒）與清怪兩段實際受到的擊中傷害 ÷ 秒數 ÷（生命＋護盾）
   P50＝種子（1–10）的中位數，離散＝(最大−最小)／中位數。每格的「最佳路線」＝三項對無昇華基準比例的幾何平均最高的那條（同配裝、同等級點） */
'use strict';
const fs = require('fs');
const files = process.argv.slice(2);
const L = files.flatMap(f =>
  fs
    .readFileSync(f, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(JSON.parse)
);
const errs = L.filter(r => r.error);
if (errs.length) console.log('錯誤', errs.length, errs[0].error);
const med = a => {
  const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const spread = a => {
  const s = a.filter(x => x != null && isFinite(x));
  const m = med(s);
  return m ? (Math.max(...s) - Math.min(...s)) / m : null;
};
const gm = a => Math.exp(a.reduce((s, x) => s + Math.log(Math.max(1e-9, x)), 0) / a.length);
const C = {};
for (const r of L) {
  if (r.error) continue;
  const t = r.tag,
    k = [t.b, t.asc, t.at.join('+'), t.pt, t.ov ? JSON.stringify(t.ov) : ''].join('|');
  const c = (C[k] = C[k] || { b: t.b, asc: t.asc, at: t.at, pt: t.pt, ov: t.ov, seed: {} });
  (c.seed[t.seed] = c.seed[t.seed] || {})[t.mode] = r;
}
const cells = Object.values(C).map(c => {
  const S = Object.entries(c.seed)
    .filter(([, m]) => m.boss && m.clear && m.bossx)
    .map(([seed, m]) => ({
      seed: +seed,
      /* 打王的主要數字＝穩態（王生命 ×50、10～60 秒）；原生命的擊殺秒數另列 */
      dps: m.bossx.steady,
      burst: m.bossx.burst10,
      dpsKill: m.boss.dps,
      kill: m.boss.kill,
      clear: m.clear.clear,
      clearT: m.clear.clear || m.clear.dur,
      kps: m.clear.kps,
      ehpP: m.boss.ehp.phys,
      ehpE: m.boss.ehp.ele,
      ehp: Math.sqrt(m.boss.ehp.phys * m.boss.ehp.ele),
      tkB: m.bossx.takenPctPs,
      tkC: m.clear.takenPctPs,
      dB: m.bossx.deaths,
      dC: m.clear.deaths,
      tideB: m.bossx.tideAvg,
      tideC: m.clear.tideAvg,
      hp: m.boss.hp,
      es: m.boss.es,
      res: m.boss.res,
      armor: m.boss.armor
    }));
  const agg = {};
  for (const f of ['dps', 'burst', 'dpsKill', 'kill', 'clear', 'clearT', 'kps', 'ehpP', 'ehpE', 'ehp', 'tkB', 'tkC', 'dB', 'dC', 'tideB', 'tideC', 'hp', 'es', 'armor'])
    agg[f] = { p50: med(S.map(x => x[f])), sp: spread(S.map(x => x[f])), v: S.map(x => x[f]) };
  agg.cleared = S.filter(x => x.clear != null).length;
  agg.killed = S.filter(x => x.kill != null).length;
  return { ...c, n: S.length, S, agg, seed: undefined };
});
/* 對同配裝、同等級點、同種子的無昇華基準的比例（選最佳路線用） */
for (const c of cells) {
  const b0 = cells.find(x => x.b === c.b && x.asc === 'none' && x.pt === c.pt && !x.ov);
  if (!b0 || c.asc === 'none') continue;
  /* 成對比：同一個種子（同一套裝備與天賦、同一隻王、同樣的生怪亂數起點）昇華 ÷ 無昇華，取中位數（比兩邊各自的中位數相除穩） */
  const per = c.S.map(s => {
    const o = b0.S.find(x => x.seed === s.seed);
    return o ? { dps: s.dps / o.dps, clear: o.clearT / s.clearT, ehp: s.ehp / o.ehp } : null;
  }).filter(Boolean);
  per.forEach(x => (x.sc = gm([x.dps, x.clear, x.ehp])));
  c.gain = {
    dps: med(per.map(x => x.dps)),
    clear: med(per.map(x => x.clear)),
    ehp: med(per.map(x => x.ehp)),
    sc: med(per.map(x => x.sc)),
    spD: spread(per.map(x => x.dps)),
    spC: spread(per.map(x => x.clear)),
    n: per.length
  };
}
fs.writeFileSync(__dirname + '/' + (process.env.OUTN || 'results') + '.json', JSON.stringify(cells, null, 1));
const f0 = x => (x == null ? '—' : Math.round(x).toLocaleString('en'));
const f1 = x => (x == null ? '—' : x.toFixed(1));
const f2 = x => (x == null ? '—' : x.toFixed(2));
const csv = [
  'build,asc,route,point,override,seeds,steady_dps_p50,steady_spread,burst10_p50,kill_s_p50,boss_killed,clear_s_p50,clear_spread,cleared,kps_p50,ehp_p50,ehp_phys_p50,ehp_ele_p50,taken_boss_pct_s,taken_clear_pct_s,deaths_boss,deaths_clear,tide_stacks_boss,tide_stacks_clear,gain_dps,gain_clear,gain_ehp,gain_score,gain_dps_spread,gain_clear_spread'
];
for (const c of cells.sort((a, b) => (a.b + a.asc + a.pt).localeCompare(b.b + b.asc + b.pt)))
  csv.push(
    [
      c.b,
      c.asc,
      c.at.join('+'),
      c.pt,
      c.ov ? JSON.stringify(c.ov).replace(/,/g, ';') : '',
      c.n,
      f0(c.agg.dps.p50).replace(/,/g, ''),
      f2(c.agg.dps.sp),
      f0(c.agg.burst.p50).replace(/,/g, ''),
      f1(c.agg.kill.p50),
      c.agg.killed,
      f1(c.agg.clear.p50),
      f2(c.agg.clearT.sp),
      c.agg.cleared,
      f2(c.agg.kps.p50),
      f0(c.agg.ehp.p50).replace(/,/g, ''),
      f0(c.agg.ehpP.p50).replace(/,/g, ''),
      f0(c.agg.ehpE.p50).replace(/,/g, ''),
      (c.agg.tkB.p50 * 100).toFixed(2),
      (c.agg.tkC.p50 * 100).toFixed(2),
      c.agg.dB.p50,
      c.agg.dC.p50,
      f1(c.agg.tideB.p50),
      f1(c.agg.tideC.p50),
      c.gain ? f2(c.gain.dps) : '',
      c.gain ? f2(c.gain.clear) : '',
      c.gain ? f2(c.gain.ehp) : '',
      c.gain ? f2(c.gain.sc) : '',
      c.gain ? f2(c.gain.spD) : '',
      c.gain ? f2(c.gain.spC) : ''
    ].join(',')
  );
fs.writeFileSync(__dirname + '/' + (process.env.OUTN || 'results') + '.csv', csv.join('\n') + '\n');
console.log(csv.join('\n'));
