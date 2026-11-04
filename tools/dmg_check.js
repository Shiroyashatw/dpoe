/* dungeonPOE 0.2.7 · 傷害與防禦的驗收（企劃書 7.2）：Lv30／60／90 各三套典型配裝（天賦路線＋同階級稀有裝），
   算打王幾秒、王一招打掉多少生命、各屬性減傷。用法：node tools/dmg_check.js [每格模擬次數，預設 400] */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const ctx = { console, Math, Date, JSON, Object, Array, Set, location: { search: '' }, URLSearchParams };
vm.createContext(ctx);
for (const f of ['data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'mech.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
/* 遊戲裡由 game.js 提供的全域：這裡給最小的替身 */
vm.runInContext(
  `var G = { t: 0, mapT: 1, scene: 'map', mobs: [] }, P = {}, S, ST;
   const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
   const num = () => {}, fx = () => {}, fxs = () => {}, sfx = () => {}, tryUndying = () => false, die = () => {};`,
  ctx
);
const N = +process.argv[2] || 400;
const R = s => vm.runInContext(s, ctx);

/* 天賦：照權重貪心走（跟 docs/天賦下修對照.md 的推算一樣） */
function route(w, pts) {
  const T = R('PTREE'),
    I = T.I,
    ADJ = T.ADJ,
    have = new Set();
  const val = n => Object.entries(I[n].s || {}).reduce((a, [k, v]) => a + (w[k] || 0) * v, 0);
  const bfs = src => {
    const prev = {},
      d = {},
      q = [...src];
    src.forEach(s => (d[s] = 0));
    while (q.length) {
      const c = q.shift();
      if (d[c] >= 14) continue;
      for (const n of ADJ[c] || []) if (d[n] === undefined && !have.has(n)) (d[n] = d[c] + 1), (prev[n] = c), q.push(n);
    }
    return { d, prev };
  };
  const s0 = R('PT_START')
    .map(s => [s, Object.entries(bfs([s]).d).reduce((a, [n, dd]) => a + val(n) / (1 + dd), 0)])
    .sort((a, b) => b[1] - a[1])[0][0];
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
/* 裝備：每一欄挑同階級的稀有裝（照權重從 4 件裡挑最好的，接近一般玩家） */
function gear(t, want, wt, off) {
  const eq = {};
  for (const e of R('EQS')) {
    let best = null,
      bv = -1;
    for (let i = 0; i < 4; i++) {
      const pool = R('BASES').filter(
        b =>
          R('eqTakes')(e, b.k) &&
          b.lv <= t &&
          (e.k !== 'weapon' || b.wt === wt) &&
          (e.k !== 'off' || !off || b.k === off) &&
          (e.k !== 'weapon' || !off || !b.two)
      );
      if (!pool.length) break;
      const b = pool[Math.floor(Math.random() * pool.length)],
        it = R('mkItem')(b.id, R('tierIlvl')(t), 2),
        v = it.a.reduce((a, x) => a + (want[x.k] || 0) * (Array.isArray(x.v) ? x.v[1] : x.v), 0);
      if (v > bv) (bv = v), (best = it);
    }
    if (best && (e.k !== 'off' || R('offOK')(eq.weapon, best))) eq[e.k] = best;
  }
  return eq;
}
const BUILDS = {
  劍近戰: {
    tree: { meleeP: 2, atkP: 2, w_sword: 2, critInc: 1, critX: 1, as: 3, life: 0.3 },
    gear: {
      dmgP: 1,
      flat: 3,
      as: 2,
      crit: 5,
      critInc: 1,
      critX: 1,
      life: 0.5,
      resA: 1,
      resF: 0.5,
      resC: 0.5,
      resL: 0.5
    },
    wt: 'sword',
    sk: 'slash'
  },
  火法: {
    tree: { spellP: 2, eleP: 2, elemP: 2, w_staff: 2, castP: 3, pen: 2, life: 0.3 },
    gear: { spellP: 1, life: 0.5, es: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'staff',
    sk: 'fireball'
  },
  坦克: {
    tree: { life: 1, hpP: 10, armorP: 3, armorF: 0.5, regen: 2, resA: 5, blockInc: 2 },
    gear: { life: 1, armor: 0.5, block: 3, resA: 2, resF: 1, resC: 1, resL: 1, dmgP: 0.3 },
    wt: 'sword',
    sk: 'slash'
  },
  /* 0.2.23 特色大點與基石 */
  轉火: {
    tree: { meleeP: 2, w_sword: 2, cvPF: 3, fireP: 2, eleP: 2, as: 3, avatar: 3000, life: 0.3 },
    gear: { dmgP: 1, flat: 3, fire: 3, as: 2, life: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'sword',
    sk: 'slash'
  },
  混沌免疫: {
    tree: { spellP: 2, eleP: 2, elemP: 2, w_staff: 2, castP: 3, pen: 2, esP: 1, ci: 3000 },
    gear: { spellP: 1, es: 2, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'staff',
    sk: 'fireball'
  },
  箭雨: {
    tree: { projP: 2, atkP: 2, w_bow: 2, critInc: 1, as: 3, proj: 3000, pierce: 5, life: 0.3 },
    gear: { dmgP: 1, flat: 3, as: 2, crit: 5, critInc: 1, life: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'bow',
    sk: 'split'
  },
  /* 0.2.25 昇華：asc 照順序點，點數照等級（ascPoints；Lv90 當作打過第 16 階的王） */
  風行神射: {
    tree: { projP: 2, atkP: 2, w_bow: 2, critInc: 1, as: 3, ms: 1, evP: 0.5, life: 0.3 },
    gear: {
      dmgP: 1,
      flat: 3,
      as: 2,
      crit: 5,
      critInc: 1,
      life: 0.5,
      ev: 0.5,
      resA: 1,
      resF: 0.5,
      resC: 0.5,
      resL: 0.5
    },
    wt: 'bow',
    sk: 'split',
    asc: ['wind', 's3', 'far', 's4', 'endless', 's5', 'falcon', 's1', 'gale'],
    /* 遠射：當作平均飛 400（更多 24%）；獵鷹標記：當作每一下都打到被標記的（更多 10%） */
    fly: 400,
    falcon: 1
  },
  鐵金剛: {
    tree: { meleeP: 2, atkP: 1, w_mace: 2, shieldP: 1, armorP: 3, armorF: 0.5, blockInc: 1, life: 0.5, hpP: 5 },
    gear: { dmgP: 1, flat: 3, as: 1, life: 0.8, armor: 1, block: 1, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'mace',
    off: 'shield',
    sk: 'quake',
    asc: ['iron', 's4', 'mass', 's1', 'wall', 's2', 'push', 's5', 'stun']
  },
  /* 0.2.26：地獄火（火法＋點燃：點燃當作一直掛著，每秒傷害＝每一下火焰 ×20%×點燃加成，扣火抗）；
     影舞者（匕首暴擊＋暴擊施放電弧：每秒觸發次數＝每秒暴擊數 × 能量÷100；暴擊球當 3 顆、暴擊弱點當上限） */
  地獄火: {
    tree: { spellP: 2, eleP: 2, elemP: 2, w_staff: 2, castP: 3, pen: 2, fireP: 2, ailMag: 2, life: 0.3 },
    gear: { spellP: 1, life: 0.5, es: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'staff',
    sk: 'fireball',
    asc: ['hell', 's2', 'shaper', 'f2', 'ember', 'f3', 'scorch', 's1', 'pact'],
    ign: 1
  },
  影舞者: {
    tree: { meleeP: 1, atkP: 2, w_dagger: 2, critInc: 3, critX: 3, as: 3, spellP: 1, life: 0.3 },
    gear: {
      dmgP: 1,
      flat: 3,
      as: 2,
      crit: 5,
      critInc: 2,
      critX: 2,
      life: 0.5,
      resA: 1,
      resF: 0.5,
      resC: 0.5,
      resL: 0.5
    },
    wt: 'dagger',
    sk: 'slash',
    asc: ['shade', 's3', 'deadly', 's4', 'hunt', 's6', 'hex', 's1', 'after'],
    coc: 'arc'
  }
};
/* 0.2.36 穩固值：同樣扣完減傷的總傷害，全部換成一種累積，30 秒打死王時定得住幾次（用真的 poiseAdd，打不打得中、抗性不算） */
console.log(
  '階級  王生命    穩固值  累滿占王生命 冰/電/暈(近戰物理)  30 秒打死：定住次數 冰/電/暈  第一次(秒)  累滿占生命 精英/普通'
);
for (const t of [1, 4, 8, 12, 13, 16]) {
  const avgMob = R('Object.values(MOBS).map(x => x.hp)').reduce((a, b) => a + b, 0) / R('Object.keys(MOBS).length'),
    tm = R('tierMob')(t),
    bossHp = Math.max(...R('BOSSES').map(b => b.hp)) * tm.hp * R('bossHpMul')(t) * R('MOB_HP'),
    mobHp = avgMob * tm.hp * R('MOB_HP'),
    fill = { frz: 2.1, elc: 1.7, hs: 0.58 * 2.25 },
    pct = (v, hp) => ((v / hp) * 100).toFixed(0) + '%';
  R(`G.mapT = ${t}; G.t = 0`);
  const po = R(`poise({ boss: 1, ail: {} }, 'frz')`),
    run = (k, dmg) => {
      ctx.b = { boss: 1, ail: {} };
      R(`G.t = 0`);
      let n = 0,
        first = 0;
      for (let i = 0; i < 90; i++) {
        const was = R(`ailPinned(b.ail)`);
        R(`G.t = ${i / 3}; poiseAdd(b, '${k}', ${dmg})`);
        if (!was && R(`ailPinned(b.ail)`)) (n += 1), (first = first || i / 3);
      }
      return [n, first];
    },
    hitD = bossHp / 90,
    rs = [run('frz', hitD), run('elc', hitD), run('hs', hitD * 2.25)],
    e = R(`poise({ elite: 1, ail: {} }, 'frz')`) / R('ELITE.hp'),
    n = R(`poise({ ail: {} }, 'frz')`);
  console.log(
    [
      String(t).padStart(3),
      Math.round(bossHp).toString().padStart(9),
      Math.round(po).toString().padStart(8),
      `${pct(po / fill.frz, bossHp)}/${pct(po / fill.elc, bossHp)}/${pct(po / fill.hs, bossHp)}`.padStart(16),
      rs
        .map(x => x[0])
        .join('/')
        .padStart(14),
      rs
        .map(x => x[1].toFixed(1))
        .join('/')
        .padStart(16),
      `${pct(e / 2.1, mobHp)}/${pct(n / 2.1, mobHp)}`.padStart(14)
    ].join('  ')
  );
}
console.log('等級 階級 配裝     每秒傷害  王生命   打王秒數  王一招(火/物)  生命  物理減傷 火抗 命中');
for (const L of [30, 60, 90]) {
  const t = Math.min(16, Math.max(1, Math.round(((L - 5) * 15) / 78) + 1));
  for (const [bn, B] of Object.entries(BUILDS)) {
    const ap = R('ascPoints')({ maxT: t, t16: L >= 90 ? 1 : 0 }),
      S = {
        lv: L,
        eq: gear(t, B.gear, B.wt, B.off),
        pt: route(B.tree, R('ptPoints')(L)),
        asc: B.asc ? B.asc[0] : null,
        at: B.asc ? ['a_st', ...B.asc.slice(1, 1 + ap).map(k => 'a_' + k)] : [],
        auras: [],
        charms: []
      };
    ctx.S = S;
    R('S = this.S; ST = stats(S); G.mapT = ' + t + '; G.t = 0; P = { x: 0, y: 0, hp: ST.hp, es: ST.es, mp: ST.mp };');
    const ST = R('ST'),
      D = R('SKILLS')[B.sk],
      lv = Math.min(20, Math.round(L / 4.5)),
      c = { D, lv, mult: D.m * Math.pow(1.06, lv - 1), more: 1, critInc: 0, critX: 0, fireAdd: 0, pen: 0, ailMag: 0 },
      /* 王是隨機的：用生命最高、傷害最高的組合當最壞情況 */
      bossD = {
        ...R('BOSSES')[0],
        hp: Math.max(...R('BOSSES').map(b => b.hp)),
        dmg: Math.max(...R('BOSSES').map(b => b.dmg))
      },
      tm = R('tierMob')(t),
      boss = {
        D: bossD,
        boss: 1,
        x: 100,
        y: 0,
        hp: bossD.hp * tm.hp * R('bossHpMul')(t) * R('MOB_HP'),
        el: bossD.el || 'phys',
        ail: {}
      };
    boss.mhp = boss.hp;
    ctx.boss = boss;
    R('mobDef(boss, ' + t + ')');
    let sum = 0;
    ctx.c = c;
    if (B.falcon) boss.ail.mark = { k: 'falcon' };
    /* 點燃一直掛著（焦土的火焰曝露才算得到）；暴擊球滿 3 顆、暴擊弱點堆到上限 */
    if (B.ign) boss.ail.ign = { dps: 1, t: 1e9 };
    if (ST.powCritX) R('P.chg = { p: { n: 3, t: 1e9 } }');
    if (ST.cwHit) boss.ail.cw = Array(ST.cwMax || 20).fill(1e9);
    let fireSum = 0,
      crits = 0;
    for (let i = 0; i < N; i++) {
      const r = R(`hitCalc(c, boss, { fly: ${B.fly || 0} })`);
      sum += r.d;
      fireSum += r.pre.fire;
      crits += r.crit ? 1 : 0;
    }
    const ignDps = B.ign
      ? (fireSum / N) *
        0.2 *
        (1 + (ST.ailMag + ST.shaper) / 100) *
        (1 + ST.ember / 100) *
        (1 - R(`resOf(boss, 'fire', ST.pen)`) / 100)
      : 0;
    let cocDps = 0;
    if (B.coc) {
      const sd = R('SKILLS')[B.coc];
      ctx.sc = { D: sd, lv, mult: 1, more: 1, critInc: 0, critX: 0, fireAdd: 0, pen: 0, ailMag: 0 };
      let ss = 0;
      for (let i = 0; i < N; i++) ss += R('hitCalc(sc, boss, { trig: 1 }).d');
      const atkRate = (ST.asM / D.t) * R('hitChance')(ST.acc, boss.ev);
      cocDps = (ss / N) * ((atkRate * crits) / N) * ((10 * (ST.hexCoc ? 2 : 1)) / 100) * ((sd.chain || 0) + 1);
    }
    const hit = sum / N,
      spell = R('isSpell')(D),
      rate = spell ? (1 + ST.castP / 100) / D.t : ST.asM / D.t,
      /* 0.2.22：攻擊要乘命中率（法術一律命中） */
      hc = spell || ST.noMiss ? 1 : R('hitChance')(ST.acc, boss.ev),
      dps = hit * rate * ((D.cnt || 1) + (D.tags.includes('proj') ? ST.proj : 0)) * hc + ignDps + cocDps,
      hitDmg = bossD.dmg * tm.dmg * R('BOSS_DMG') * 1.4,
      /* 0.2.25：無盡箭矢的投射物 +1 已經在 ST.proj */
      ehp = ST.hp + ST.es,
      fire = R(`ST.res.fire`) && R(`effRes('fire')`),
      fireHit = hitDmg * (1 - R(`effRes('fire')`) / 100),
      physHit0 = hitDmg * (1 - Math.min(0.9, ST.armor / (ST.armor + 10 * hitDmg + 1))),
      /* 0.2.25 格擋值：滿的時候先吸收 40%（重盾前進 60%），最多吸到格擋值 */
      bvAb = d => Math.min(ST.bv, d * (ST.heavyShield ? 0.6 : 0.4)),
      physHit = physHit0 - bvAb(physHit0);
    console.log(
      [
        String(L).padStart(3),
        String(t).padStart(4),
        bn.padEnd(5, '　'),
        Math.round(dps).toString().padStart(8),
        Math.round(boss.mhp).toString().padStart(8),
        (boss.mhp / dps).toFixed(1).padStart(8),
        `${Math.round(((fireHit - bvAb(fireHit)) / ehp) * 100)}%/${Math.round((physHit / ehp) * 100)}%`.padStart(12),
        String(ehp).padStart(6),
        (Math.min(0.9, ST.armor / (ST.armor + 10 * hitDmg + 1)) * 100).toFixed(0).padStart(7) + '%',
        String(R(`effRes('fire')`)).padStart(4) + '%',
        Math.round(hc * 100)
          .toString()
          .padStart(4) + '%',
        ST.bv ? `格擋值 ${ST.bv}` : '',
        B.asc ? `昇華 ${S.at.length - 1} 點` : ''
      ].join(' ')
    );
    void fire;
    if (process.argv.includes('--why'))
      console.log(
        '     ',
        JSON.stringify({
          dmg: ST.dmg.map(Math.round),
          wadd: ST.wadd,
          add: ST.add,
          aps: +ST.aps.toFixed(2),
          crit: +ST.crit.toFixed(1),
          critX: ST.critX,
          inc: ST.dmgA + ST.atkP + ST.meleeP + ST.physP,
          spellInc: ST.spellP + ST.eleP + ST.fireP,
          gemMult: +c.mult.toFixed(2),
          /* 天賦樹本身：點了幾個大點／小點／過路點，各數值合計 */
          tree: (() => {
            const I = R('PTREE').I,
              n = S.pt.map(id => I[id]).filter(x => !x.gate),
              sum = {};
            for (const x of n) for (const k in x.s) sum[k] = (sum[k] || 0) + x.s[k];
            return {
              大: n.filter(x => x.big).length,
              小: n.filter(x => !x.big && x.th).length,
              過路: n.filter(x => !x.th).length,
              ...sum
            };
          })()
        })
      );
  }
}
