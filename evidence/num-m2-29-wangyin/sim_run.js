/* M2-29 王印：用真的遊戲（補丁過的複製品，patch.js）跑掛機，固定 dt 推進主迴圈（AI 自己打、真的會死、偷取與技能速度都照遊戲程式）。
   用法：node sim_run.js <jobs.json> <out.csv> [網址，預設 http://localhost:8031/] [平行頁數，預設 4]
   job：{ id, build: 'phys'|'spell'|'bleed', L 角色等級, site 主幹第幾個（TRUNK 索引）, seed, simT 遊戲秒數, fx: { 印鍵: [能力, 數值] }, set 齊鳴倍率, seals: [印鍵…] }
   輸出每個 job 一列：回合數、死亡數、平均過關秒數、死亡率、平均生命%、偷取回復（每秒佔最大生命%）、DPS 粗估（打王）等 */
'use strict';
const fs = require('fs');
const { chromium } = require('playwright');
const [, , jobsF, outF, URL0 = 'http://localhost:8031/', PAR = '4'] = process.argv;
const jobs = JSON.parse(fs.readFileSync(jobsF, 'utf8'));
const COLS = ['id', 'build', 'L', 'site', 'siteName', 'siteLv', 'seed', 'seals', 'fx', 'set', 'simT', 'rounds', 'deaths', 'deathRate', 'clearMean', 'clearMed', 'hpAvg', 'leechPerS', 'hp', 'es', 'ehpNote', 'dmgTaken', 'bleedCh', 'leechSt', 'ssSt', 'defPSt', 'dmgASt', 'dbg', 'var', 'star'];
const BUILDS = {
  phys: {
    tree: { meleeP: 2, atkP: 2, w_sword: 2, critInc: 1, critX: 1, as: 3, life: 0.3 },
    gear: { dmgP: 1, flat: 3, as: 2, crit: 5, critInc: 1, critX: 1, life: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'sword',
    sk: 'slash'
  },
  spell: {
    tree: { spellP: 2, eleP: 2, elemP: 2, w_staff: 2, castP: 3, pen: 2, life: 0.3 },
    gear: { spellP: 1, life: 0.5, es: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'staff',
    sk: 'fireball'
  },
  bleed: {
    tree: { atkP: 2, w_axe: 2, critInc: 1, critX: 1, as: 3, life: 0.3, meleeP: 2, bleedCh: 2, bleedMag: 2, ailMag: 1 },
    gear: { dmgP: 1, flat: 3, as: 2, crit: 5, critInc: 1, critX: 1, life: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'axe',
    sk: 'cleave'
  }
};
/* 頁面裡跑的：配裝（dmg_check.js 的 route／gear 搬過來，ilvl 照材料階 matIlvl(matTier(L))）＋固定 dt 推進 */
function pageRun(job, B) {
  const mul32 = a => () => {
    let t = (a = (a + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Math.random = mul32(job.seed * 7919 + job.L);
  function route(w, pts) {
    const T = PTREE,
      I = T.I,
      ADJ = T.ADJ,
      have = new Set();
    const val = n => Object.entries(I[n].s || {}).reduce((a, [k, v]) => a + (w[k] || 0) * (+v || 0), 0);
    const bfs = src => {
      const prev = {},
        d = {},
        q = [...src];
      src.forEach(s => (d[s] = 0));
      while (q.length) {
        const c = q.shift();
        if (d[c] >= 14) continue;
        for (const n of ADJ[c] || []) if (d[n] === undefined && !have.has(n) && !I[n].lock) (d[n] = d[c] + 1), (prev[n] = c), q.push(n);
      }
      return { d, prev };
    };
    const s0 = PT_START.map(s => [s, Object.entries(bfs([s]).d).reduce((a, [n, dd]) => a + val(n) / (1 + dd), 0)]).sort((a, b) => b[1] - a[1])[0][0];
    have.add(s0);
    let used = 0;
    while (used < pts) {
      const { d, prev } = bfs([...have]);
      let bt = null,
        br = -1;
      for (const n of Object.keys(d)) {
        if (have.has(n) || !d[n]) continue;
        let p = n,
          g = 0,
          c = 0;
        while (!have.has(p)) (g += val(p)), c++, (p = prev[p]);
        if (c <= pts - used && g / c > br) (br = g / c), (bt = n);
      }
      if (!bt) break;
      const path = [];
      for (let p = bt; !have.has(p); p = prev[p]) path.push(p);
      path.reverse().forEach(p => have.add(p));
      used += path.length;
    }
    return [...have];
  }
  const ilvl = matIlvl(matTier(job.L));
  function gear(want, wt, L) {
    const eq = {};
    for (const e of EQS) {
      if (e.k === 'ring3') continue;
      let best = null,
        bv = -1;
      for (let i = 0; i < 4; i++) {
        const pool = BASES.filter(
          b => eqTakes(e, b.k) && b.lv <= ilvl && 1 + Math.round(((b.lv - 1) * 82) / 15) <= L && (e.k !== 'weapon' || b.wt === wt)
        );
        if (!pool.length) break;
        const b = pool[Math.floor(Math.random() * pool.length)],
          it = mkItem(b.id, ilvl, 2),
          v = it.a.reduce((a, x) => a + (want[x.k] || 0) * (Array.isArray(x.v) ? x.v[1] : x.v), 0);
        if (v > bv) (bv = v), (best = it);
      }
      if (best && (e.k !== 'off' || offOK(eq.weapon, best))) eq[e.k] = best;
    }
    return eq;
  }
  introStop && introStop();
  proSkip && proSkip();
  S.story.tips = 0;
  S.lv = job.L;
  S.eq = Object.fromEntries(EQS.map(e => [e.k, null]));
  Object.assign(S.eq, gear(B.gear, B.wt, job.L));
  S.asc = null;
  S.at = [];
  S.auras = [];
  S.charms = [];
  S.skills = Array.from({ length: NSLOT }, newSlot);
  S.skills[0].k = B.sk;
  S.lib.sk[B.sk] = gemCap(job.L);
  for (const aw of [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16]) {
    S.pt = route({ ...B.tree, attr: aw }, ptPoints(job.L));
    S.ptA = {};
    const I = PTREE.I;
    const lack = () => {
      const d = { 力量: 0, 敏捷: 0, 智慧: 0 };
      for (const k of Object.keys(S.eq)) if (S.eq[k]) for (const [n, have, req] of eqLack(S, S.eq[k], k)) if (n in d) d[n] += req - have;
      ST = stats();
      for (const [n, have, req] of gemLack(slotCfg(0).g)) if (n in d) d[n] += req - have;
      return d;
    };
    for (const id of S.pt.filter(id => I[id].s && I[id].s.attr)) {
      const d = lack(),
        c = [['s', '力量'], ['d', '敏捷'], ['i', '智慧']].sort((a, b) => d[b[1]] - d[a[1]])[0];
      S.ptA[id] = d[c[1]] > 0 ? c[0] : 's';
    }
    ST = stats();
    if (!eqCheck(S).bad.size && !gemLack(slotCfg(0).g).length) break;
  }
  if (job.mode === 'static') {
    const eq0 = JSON.stringify(S.eq),
      t = lvT(job.L),
      tm = tierMob(t),
      bossD = { ...BOSSES[0], hp: Math.max(...BOSSES.map(b => b.hp)), dmg: Math.max(...BOSSES.map(b => b.dmg)) },
      hitDmg = bossD.dmg * tm.dmg * BOSS_DMG * 1.4,
      out = {};
    G.mapT = t;
    for (const v of job.vars) {
      S.eq = JSON.parse(eq0);
      window.WY_FX = { ...WY_FX, ...(v.fx || {}) };
      window.WY_SET = v.set == null ? 1.25 : v.set;
      const SL = ['chest', 'weapon', 'gloves', 'helm', 'boots', 'belt'];
      (v.seals || []).forEach((k, i) => S.eq[SL[i]] && (S.eq[SL[i]].wy = k));
      for (const a of [].concat(v.aff || [])) S.eq[a.slot] && S.eq[a.slot].a.push({ k: a.k, v: a.v, T: 2 });
      ST = stats();
      P.hp = ST.hp;
      const c = slotCfg(0),
        boss = { D: bossD, boss: 1, x: 100, y: 0, hp: bossD.hp * tm.hp * bossHpMul(t) * MOB_HP, el: bossD.el || 'phys', ail: {} };
      boss.mhp = boss.hp;
      mobDef(boss, t);
      Math.random = mul32(job.seed * 31 + 5);
      let sum = 0,
        phys = 0;
      const N = 600;
      for (let i = 0; i < N; i++) {
        const r = hitCalc(c, boss, {});
        sum += r.d;
        phys += r.pre.phys;
      }
      const spell = isSpell(c.D),
        hc = spell || ST.noMiss ? 1 : hitChance(ST.acc, boss.ev),
        rate = 1 / actDur(c),
        hit = sum / N,
        bleed = ST.bleedCh ? (phys / N) * 0.15 * (1 + (ST.ailMag + ST.bleedMag) / 100) * Math.min(1, ST.bleedCh / 100) : 0,
        dps = (hit * hc + bleed) * rate,
        physT = 1 - Math.min(0.9, ST.armor / (ST.armor + 10 * hitDmg + 1)),
        eleT = 1 - (effRes('fire') + effRes('cold') + effRes('light')) / 300,
        ehp = (ST.hp + ST.es) / (0.5 * physT + 0.5 * eleT),
        /* 偷取（靜態估計）：每秒擊中次數 × 平均一下 × 偷取%，但同時只有一筆、1 秒回完 → 上限約「最大的一下 × 偷取%」每秒；這裡取 min(每秒擊中傷害, 一下)×偷取 */
        leechS = ((Math.min(hit * hc * rate, hit) * (c.leech || 0)) / ST.hp) * 100;
      out[v.name] = { dps, ehp, leechS, hp: ST.hp, es: ST.es, armor: ST.armor, ev: ST.ev, res: effRes('fire'), rate, hit, bleed, wyN: ST.wyN, dmgA: ST.dmgA, ss: ST.ss, defP: ST.defP, leech: ST.leech };
    }
    return out;
  }
  /* 王印：每個印放在不同的一件（全域能力，放哪件不影響）；同名照遊戲規則只算一次 */
  const SLOTS = ['chest', 'weapon', 'gloves', 'helm', 'boots', 'belt'];
  window.WY_FX = { ...WY_FX, ...(job.fx || {}) };
  window.WY_SET = job.set == null ? 1.25 : job.set;
  (job.seals || []).forEach((k, i) => S.eq[SLOTS[i]] && (S.eq[SLOTS[i]].wy = k));
  S.camp.watch = 99;
  S.camp.scout = 99;
  S.star = job.star || 1;
  S.auto = 1;
  ST = stats();
  const st0 = ST;
  /* 紀錄：每一輪（roundRec）、死亡留在同一個地點（不退回）、偷取回復 */
  const R = [];
  let T = 0;
  const rr0 = roundRec;
  window.roundRec = r => (R.push({ ...r, T }), rr0(r));
  window.deadAgain = function () {
    const k = G.node;
    S.world.dn = 0;
    roundRec({ d: G.t, die: 1 });
    runNode(k, true);
  };
  let lh = 0,
    dmg = 0;
  const lt0 = leechTick;
  window.leechTick = function (dt, who, caps) {
    if (who && who !== P) return lt0(dt, who, caps);
    const h = P.hp;
    lt0(dt);
    lh += Math.max(0, P.hp - h);
  };
  Math.random = mul32(job.seed * 104729 + 17);
  runNode(TRUNK_K[job.site]);
  const dt = 1 / 30;
  let hpInt = 0,
    lastHp = P.hp;
  while (T < job.simT) {
    if (G.hs > 0) G.hs -= dt;
    else {
      let d = dt;
      if (G.slow > 0) (G.slow -= dt), (d *= ROLL.slowScale);
      if (worldPaused()) {
        if (G.state === 'dead') aiTick(d);
        if (G.ask) G.ask = null;
      } else {
        G.t += d;
        const h0 = P.hp;
        updPlayer(d);
        updMobs(d);
        updShots(d);
        updSkills(d);
        if (G.nextT && G.t >= G.nextT && G.state === 'play') (G.nextT = 0), roundEnd();
        for (const dr of G.drops.slice()) {
          dr.t += d;
          if ((dr.gold || dr.show || dr.chase || (dr.it && !dr.nopick && !dr.full)) && dr.t > (dr.hold || 0.4)) pickup(dr);
        }
        if (P.hp < h0) dmg += h0 - P.hp;
      }
    }
    G.fx.length = 0;
    G.nums.length = 0;
    if (S.lv !== job.L) (S.lv = job.L), (ST = stats());
    hpInt += (P.hp / ST.hp) * dt;
    T += dt;
  }
  for (let i = 0; i < R.length; i++) R[i].dur = R[i].T - (i ? R[i - 1].T : 0);
  const ok = R.filter(r => !r.die).map(r => r.dur).sort((a, b) => a - b),
    die = R.filter(r => r.die).length;
  return {
    rounds: ok.length,
    deaths: die,
    deathRate: R.length ? die / R.length : 0,
    clearMean: ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null,
    clearMed: ok.length ? ok[ok.length >> 1] : null,
    hpAvg: hpInt / T,
    leechPerS: (lh / T / st0.hp) * 100,
    hp: st0.hp,
    es: st0.es,
    dmgTaken: dmg / T,
    bleedCh: st0.bleedCh,
    leechSt: st0.leech,
    ssSt: st0.ss,
    defPSt: st0.defP,
    dmgASt: st0.dmgA,
    siteName: TRUNK[job.site].n,
    siteLv: TRUNK[job.site].lv,
    bad: st0.eqBad.join('/'),
    dbg: [S.eq.weapon && S.eq.weapon.b, skillWhy ? String(skillWhy(slotCfg(0))) : '', P.mp, ST.mp, G.mobs.filter(m=>m.hp>0).length].join('|')
  };
}
(async () => {
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const q = jobs.slice(),
    rows = [];
  fs.writeFileSync(outF, COLS.join(',') + '\n');
  const worker = async () => {
    while (q.length) {
      const job = q.shift();
      const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await p.goto(URL0 + '?p=sim' + job.id, { waitUntil: 'load' });
      await p.waitForFunction(() => typeof S !== 'undefined' && S && typeof runNode === 'function', null, { timeout: 30000 });
      await p.evaluate(() => (window.requestAnimationFrame = () => 0));
      await p.waitForTimeout(100);
      const r = await p.evaluate(new Function('a', `return (${pageRun.toString()})(a[0], a[1])`), [job, BUILDS[job.build]]).catch(e => ({ err: e.message }));
      await ctx.close();
      if (job.mode === 'static') { fs.appendFileSync(outF + '.jsonl', JSON.stringify({ id: job.id, build: job.build, L: job.L, seed: job.seed, err: r.err, res: r }) + '\n'); console.log(job.id); continue; }
      const row = { ...job, ...r, seals: (job.seals || []).join('+'), fx: JSON.stringify(job.fx || {}).replace(/,/g, ';'), set: job.set == null ? 1.25 : job.set, ehpNote: r.bad || '' };
      if (r.err || errs.length) console.error(job.id, r.err, errs.slice(0, 3));
      fs.appendFileSync(outF, COLS.map(c => (row[c] == null ? '' : typeof row[c] === 'number' ? +row[c].toFixed(4) : row[c])).join(',') + '\n');
      rows.push(row);
      console.log(job.id, job.build, job.L, row.siteName, row.seals || '-', 'rounds', r.rounds, 'deaths', r.deaths, 'clear', r.clearMean && r.clearMean.toFixed(1), 'hp', r.hpAvg && r.hpAvg.toFixed(2), 'leech', r.leechPerS && r.leechPerS.toFixed(2));
    }
  };
  await Promise.all(Array.from({ length: +PAR }, worker));
  await b.close();
})();
