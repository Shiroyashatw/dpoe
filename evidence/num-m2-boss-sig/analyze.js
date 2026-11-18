/* 讀 raw/*.jsonl → fights.csv（每場一列）、patterns.csv（每王×場景×招）、bosses.csv（每王×場景的指標＋驗收）、印 Markdown 表 */
'use strict';
const fs = require('fs'),
  path = require('path');
const D = path.join(__dirname, 'raw');
const rows = [];
for (const f of fs.readdirSync(D).filter(f => f.endsWith('.jsonl')))
  for (const l of fs.readFileSync(path.join(D, f), 'utf8').split('\n').filter(Boolean)) rows.push(JSON.parse(l));
const NEW = ['devour', 'gale', 'unstop', 'chaosjump', 'daynight'];
/* 大招：王、預警 ≥0.6 秒、傷害倍率（對 m.dmg）≥1.2。照 game.js 的數字（行號是 c4b1a1d）：
   charge 前搖 BOSS_WIND 0.75（1609）、衝撞 ×1.4（1993）→ 是；devour 前搖 0.8（1627）、×1.3（1879）→ 是；
   swipe 0.5／×1.2；blink 落地揮爪 0.4／×1.2；slam 預警 0.75–1.31／×1.1；line 0.6–1.2／×1.0；nova 0.8／×0.8；
   gale 0.6／×0.8；chaosjump 0.5／×1.0；daynight 火光 0.7–1.2／×1.0；unstop 本身 0 傷害，期間的衝撞＝charge（unstop:charge） */
const BIG = new Set(['charge', 'devour', 'unstop:charge']);
const q = (L, p) => {
  if (!L.length) return null;
  const s = [...L].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(s.length * p) - 1)];
};
const med = L => {
  if (!L.length) return null;
  const s = [...L].sort((a, b) => a - b),
    n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
const r1 = (x, d = 1) => (x == null || isNaN(x) ? '' : (+x).toFixed(d));
const bld = r => r.build || 'L' + r.L;
const key = r => `${bld(r)}|${r.boss}|${r.scen}`;
/* 每場一列 */
const fcsv = ['build,boss,bossName,scen,W,H,i,res,killT,dur,deaths,dmgTakenPctMaxLife,fires,newFires,bigFires,bossMhp,bossDmg,playerLife,playerES,errs'];
for (const r of rows) {
  const dmg = r.hits.reduce((a, h) => a + h.l, 0);
  fcsv.push(
    [bld(r), r.boss, r.bn, r.scen, r.W, r.H, r.i, r.res, r.res === 'win' ? r.killT : '', r.dur, r.res === 'dead' ? 1 : 0,
      r1((100 * dmg) / r.mhp), r.fires.length, r.fires.filter(f => NEW.includes(f.p)).length,
      r.fires.filter(f => BIG.has(f.p)).length, r.bmhp, r.bdmg, r.mhp, r.mes, r.errs.length].join(',')
  );
}
fs.writeFileSync(path.join(__dirname, 'fights.csv'), fcsv.join('\n') + '\n');
/* 每王×場景 */
const G = {};
for (const r of rows) (G[key(r)] = G[key(r)] || []).push(r);
const agg = {},
  pcsv = ['build,boss,scen,pattern,fires,firesPerMin,hitRatePct,hits,avgHitPctMaxLife,avgPerFirePctMaxLife,maxPerFirePctMaxLife,big'],
  bcsv = ['build,boss,scen,n,n1280,n390,winPct,win1280,win390,medKill,p90Kill,med1280,med390,deathsPerFight,dmgTakenPct,bigPerMin,errs'];
for (const [k, L] of Object.entries(G)) {
  const [build, boss, scen] = k.split('|');
  const mins = L.reduce((a, r) => a + (r.dur || 0), 0) / 60;
  const win = L.filter(r => r.res === 'win');
  const kt = win.map(r => r.killT);
  const sz = w => L.filter(r => r.W === w);
  const wr = A => (A.length ? (100 * A.filter(r => r.res === 'win').length) / A.length : null);
  const P = {};
  /* 招牌招的「一次出招」：daynight 的火光（daynight:fire）算在那次 daynight 上（已經帶同一個 fid）；
     unstop 期間的衝撞（unstop:charge）算在之前最近的那次 unstop 上，另外以 unstop+ 這個列名彙總 */
  for (const r of L) {
    let last = null;
    const par = {};
    for (const f of r.fires) {
      if (f.p === 'unstop') last = f.id;
      if (f.p === 'unstop:charge' && last != null) par[f.id] = last;
    }
    const ext = [];
    for (const h of r.hits) {
      if (h.p === 'daynight:fire') ext.push({ ...h, p: 'daynight+' });
      if (h.p === 'unstop:charge') ext.push({ ...h, p: 'unstop+', id: par[h.id] != null ? par[h.id] : h.id });
    }
    r.hits2 = r.hits.concat(ext);
    r.fires2 = r.fires.concat(
      r.fires.filter(f => f.p === 'daynight' || f.p === 'unstop').map(f => ({ ...f, p: f.p + '+' }))
    );
  }
  for (const r of L) {
    for (const f of r.fires2) (P[f.p] = P[f.p] || { fires: 0, hitF: new Set(), hits: [], perFire: {} }).fires++;
    for (const h of r.hits2) {
      if (!P[h.p]) P[h.p] = { fires: 0, hitF: new Set(), hits: [], perFire: {} };
      const pp = P[h.p];
      pp.hits.push((100 * h.l) / r.mhp);
      if (h.id != null) {
        const id = r.i + ':' + r.W + ':' + h.id;
        pp.hitF.add(id);
        pp.perFire[id] = (pp.perFire[id] || 0) + (100 * h.l) / r.mhp;
      }
    }
  }
  /* daynight 的火光算在 daynight 那一次出招上 */
  const pats = {};
  for (const [p, v] of Object.entries(P)) {
    const pf = Object.values(v.perFire);
    pats[p] = {
      fires: v.fires,
      fpm: v.fires / mins,
      hitRate: v.fires ? (100 * v.hitF.size) / v.fires : null,
      hits: v.hits.length,
      avgHit: v.hits.length ? v.hits.reduce((a, b) => a + b, 0) / v.hits.length : null,
      avgFire: pf.length ? pf.reduce((a, b) => a + b, 0) / pf.length : null,
      maxFire: pf.length ? Math.max(...pf) : null
    };
    pcsv.push([build, boss, scen, p, v.fires, r1(pats[p].fpm, 2), r1(pats[p].hitRate), v.hits.length, r1(pats[p].avgHit), r1(pats[p].avgFire), r1(pats[p].maxFire), BIG.has(p) ? 1 : 0].join(','));
  }
  const bigN = L.reduce((a, r) => a + r.fires.filter(f => BIG.has(f.p)).length, 0);
  const A = (agg[k] = {
    build, boss, scen, bn: L[0].bn, n: L.length, n1280: sz(1280).length, n390: sz(390).length,
    win: wr(L), win1280: wr(sz(1280)), win390: wr(sz(390)),
    med: med(kt), p90: q(kt, 0.9),
    med1280: med(sz(1280).filter(r => r.res === 'win').map(r => r.killT)),
    med390: med(sz(390).filter(r => r.res === 'win').map(r => r.killT)),
    deaths: L.filter(r => r.res === 'dead').length / L.length,
    dmg: L.reduce((a, r) => a + (100 * r.hits.reduce((s, h) => s + h.l, 0)) / r.mhp, 0) / L.length,
    bigPM: bigN / mins, mins, pats,
    errs: L.reduce((a, r) => a + r.errs.length, 0)
  });
  bcsv.push([build, boss, scen, A.n, A.n1280, A.n390, r1(A.win), r1(A.win1280), r1(A.win390), r1(A.med, 2), r1(A.p90, 2), r1(A.med1280, 2), r1(A.med390, 2), r1(A.deaths, 3), r1(A.dmg), r1(A.bigPM, 2), A.errs].join(','));
}
fs.writeFileSync(path.join(__dirname, 'patterns.csv'), pcsv.join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'bosses.csv'), bcsv.join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'agg.json'), JSON.stringify(agg, null, 1));
/* 驗收：WIRED（與 FIX）對 BASE */
const SIG = { taotie: ['devour'], qiongqi: ['gale'], taowu: ['unstop+'], hundun: ['chaosjump'], zhulong: ['daynight+'], zhu9: ['devour', 'gale', 'unstop+', 'chaosjump', 'daynight+'] };
const acc = ['build,boss,scen,winDropPP,killTimeChgPct,deathsDelta,maxNewAvgHitPct,passWin,passKill,passDeaths,passHit,pass'];
const builds = [...new Set(rows.map(bld))].sort();
for (const build of builds)
for (const boss of Object.keys(SIG))
  for (const scen of [...new Set(rows.map(r => r.scen))].filter(s => s !== 'BASE')) {
    const B = agg[build + '|' + boss + '|BASE'],
      W = agg[build + '|' + boss + '|' + scen];
    if (!B || !W) continue;
    const dWin = B.win - W.win,
      dKill = (100 * (W.med - B.med)) / B.med,
      dDeath = W.deaths - B.deaths;
    /* 「單一新招打中」＝那一次出招打到的總和（chaosjump 3 圈、daynight 18 圈都加總），取平均 */
    const hitMax = Math.max(0, ...SIG[boss].map(p => (W.pats[p] && W.pats[p].avgFire) || 0));
    const ok = [dWin <= 10, dKill <= 20, dDeath <= 0.3, hitMax <= 40];
    acc.push([build, boss, scen, r1(dWin), r1(dKill), r1(dDeath, 3), r1(hitMax), ...ok.map(x => (x ? 'PASS' : 'FAIL')), ok.every(x => x) ? 'PASS' : 'FAIL'].join(','));
  }
fs.writeFileSync(path.join(__dirname, 'acceptance.csv'), acc.join('\n') + '\n');
console.log(bcsv.join('\n'));
console.log(acc.join('\n'));
