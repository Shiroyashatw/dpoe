/* dungeonPOE · 底層（0.2.7，照 PoE2；規則與數字在 docs/企劃書.md 7.2）：
   怪物等級與抗性懲罰、怪物防禦、擊中傷害五步 hitCalc、異常（雙向）、持續傷害、球體、buff、詛咒、標記、曝露、護符、玩家受傷 hurtCalc。
   傷害與防禦的公式都在這裡；新效果要先在這裡有概念才能用（設計原則第 0 節）。 */
'use strict';

/* ---------- 等級 ---------- */
/* 地圖階級 → 怪物等級（第 1 階 Lv5、第 16 階 Lv83） */
const mobLv = t => Math.round(5 + ((t - 1) * 78) / 15);
/* 抗性進度懲罰（照 PoE2，只扣元素抗性） */
const RES_PEN = [
  [65, 60],
  [60, 50],
  [54, 40],
  [41, 30],
  [29, 20],
  [16, 10]
];
const resPen = lv => (RES_PEN.find(([l]) => lv >= l) || [0, 0])[1];
const MAXRES_CAP = 90;
/* 經驗：等級差太多打折（照 PoE 的安全區：3 + 等級/16） */
function xpMul(plv, mlv) {
  const d = Math.abs(plv - mlv) - (3 + Math.floor(plv / 16));
  return d <= 0 ? 1 : Math.max(0.01, Math.pow((plv + 5) / (plv + 5 + Math.pow(d, 2.5)), 1.5));
}

/* 王的生命、傷害倍率（0.2.7，dmg_check 驗收：第 16 階的王一般配裝 30～60 秒、大招最多打掉 40% 生命） */
const bossHpMul = t => 1 + 0.8 * t,
  BOSS_DMG = 1.8;

/* ---------- 異常門檻：同等級普通怪的基礎生命（照 PoE2 只看等級，不吃稀有度） ---------- */
const ailThr = t => 30 * tierMul(t).hp;
/* 稀有度對減益的抵抗（冰緩、詛咒、曝露）：菁英當稀有 30%、王當傳奇 50% */
const rarRed = m => (m.boss ? 0.5 : m.elite ? 0.3 : 0);
const ELEK = ['fire', 'cold', 'light'];

/* ---------- 怪物的防禦（spawnMob 呼叫） ---------- */
function mobDef(m, t) {
  m.res = { fire: 0, cold: 0, light: 0, chaos: 0 };
  if (m.boss) for (const k of ELEK) m.res[k] = 25;
  if (m.el && m.el !== 'phys') m.res[m.el] = 40;
  for (const k of ELEK) m.res[k] += MM('mres');
  /* 護甲：照「這種怪在這一階的基礎生命」的比例（重甲類 D.arm 高、王低；王的生命倍率不放大護甲） */
  m.arm0 = m.arm = (m.boss ? 0.1 : m.D.arm || 0.3) * m.D.hp * tierMul(t).hp * (m.elite ? ELITE.hp : 1) * 0.5;
  m.arm0 = m.arm *= 1 + MM('marm') / 100;
  m.acc = (15 + 6 * mobLv(t)) * (1 + MM('macc') / 100);
  m.spdM = 1 + MM('mspd') / 100;
  m.ail = {};
}

/* ---------- 擊中傷害（企劃書 7.2 的五步） ---------- */
const DT = ['phys', 'fire', 'cold', 'light', 'chaos'];
const SPELL_BASE = [7, 12];
/* 法術的基礎傷害：看寶石等級（照 PoE2 每級成長很陡，Lv20 約 Lv1 的 69 倍，跟武器＋攻擊倍率同一個量級），不吃武器、不吃角色等級 */
const spellDmg = lv => rnd(SPELL_BASE[0], SPELL_BASE[1]) * Math.pow(1.25, lv - 1);
const isSpell = D => (D.tags || []).includes('spell') && !(D.tags || []).includes('attack');
/* 目標身上的減益讓抗性變成多少（詛咒、曝露、焦灼可以壓成負值；穿透最多穿到 0） */
function resOf(m, k, pen = 0) {
  const a = m.ail || {};
  let r = m.res[k] || 0;
  if (k !== 'chaos') {
    if (a.curse && a.curse.k === 'eleweak') r -= a.curse.v;
    if (a.exp > G.t) r -= 20 * (1 - rarRed(m));
    if (a.scorch && a.scorch.t > G.t) r -= a.scorch.v;
  } else if (a.curse && a.curse.k === 'despair') r -= a.curse.v;
  return r > 0 ? Math.max(0, r - pen) : r;
}
/* 目標「受到的傷害提高」：感電、威嚇、凋零（只混沌）、完全破甲（只物理） */
function takenInc(m, k) {
  const a = m.ail || {};
  let v = 0;
  if (a.shock > G.t) v += 20;
  if (a.intim > G.t) v += 10;
  if (k === 'chaos') v += 5 * (a.wither || []).filter(t => t > G.t).length;
  if (k === 'phys' && a.broken > G.t) v += 20;
  return v;
}
/* c 技能設定（slotCfg）、m 目標、o：mult 更多倍率、crit 必暴、minion、unit */
function hitCalc(c, m, o = {}) {
  const D = c.D,
    tg = D.tags || [],
    spell = isSpell(D),
    pre = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0 };
  /* 1. 基礎：攻擊＝武器（含本地詞）×技能倍率；法術＝寶石 */
  if (spell) pre[D.el || 'phys'] = spellDmg(c.lv || 1) * D.m;
  else {
    /* 盾技能（0.2.13）：基礎換成盾的傷害（stats 的 sdmg），不吃武器的附加 */
    const W = D.shield ? ST.sdmg : ST.dmg;
    pre.phys = rnd(W[0], W[1]);
    if (!D.shield)
      for (const k of ['fire', 'cold', 'light', 'chaos']) {
        const [lo, hi] = ST.wadd[k];
        if (hi) pre[k] += rnd(lo, hi);
      }
    /* 2. 附加：飾品、手套的「攻擊附加」 */
    for (const k in ST.add) {
      const [lo, hi] = ST.add[k];
      if (hi) pre[k === 'flat' ? 'phys' : k] += rnd(lo, hi);
    }
    /* 穿刺：取出最強的一個，加進這一下 */
    const imp = m && m.ail && m.ail.imp;
    if (imp && imp.length) pre.phys += imp.splice(imp.indexOf(Math.max(...imp)), 1)[0];
    for (const k of DT) pre[k] *= c.mult;
  }
  /* 2. 多造成 x% 的附加傷害（憤怒、附加火焰；邪力是混沌） */
  const sum = DT.reduce((s, k) => s + pre[k], 0);
  pre.fire += (sum * ((c.fireAdd || 0) * 100 + ST.fireAdd)) / 100;
  if (P.buf && P.buf.unholy > G.t) pre.chaos += sum * 0.3;
  /* 3. 轉換：有屬性的攻擊技能把物理全部轉成那個屬性（吃兩邊的提高） */
  let conv = null;
  if (!spell && D.el && D.el !== 'phys') (pre[D.el] += pre.phys), (pre.phys = 0), (conv = D.el);
  /* 4. 提高：同一池相加 */
  const near = m ? dist(P, m) : 999,
    common =
      ST.dmgA +
      (tg.includes('attack') ? ST.atkP : 0) +
      (tg.includes('melee') ? ST.meleeP : 0) +
      (tg.includes('proj') ? ST.projP : 0) +
      (tg.includes('spell') ? ST.spellP : 0) +
      (tg.includes('elem') ? ST.elemP : 0) +
      (tg.includes('occ') ? ST.occP : 0) +
      (tg.includes('pri') ? ST.priP : 0) +
      (tg.includes('aoe') ? ST.aoeP : 0) +
      (o.minion ? ST.minionP : 0) +
      (o.unit ? ST.unitP : 0) +
      (P.hp < ST.hp / 2 ? ST.lowHp : 0) +
      (P.hp >= ST.hp ? ST.fullHp : 0) +
      (P.es > 0 ? ST.esUp : 0) +
      (P.rolledT > G.t ? ST.afterRoll : 0) +
      (m && (m.boss || m.elite) ? ST.bossP : 0) +
      (near < 160 ? ST.closeP : 0) +
      (near > 350 ? ST.farP : 0) +
      (bannerOn() ? G.banner.buff.dmg || 0 : 0);
  const typeInc = {
    phys: ST.physP,
    fire: ST.eleP + ST.fireP + (conv === 'fire' ? ST.physP : 0),
    cold: ST.eleP + ST.coldP + (conv === 'cold' ? ST.physP : 0),
    light: ST.eleP + ST.lightP + (conv === 'light' ? ST.physP : 0),
    chaos: ST.chaosP + (conv === 'chaos' ? ST.physP : 0)
  };
  /* 5. 更多：輔助、昇華、狂怒（只有攻擊）、化身（法術的元素） */
  let more = (o.mult || 1) * (c.more || 1);
  /* 你被「衰弱」詛咒（地圖詞）：造成的傷害更少 */
  const pc = P.ail && P.ail.curse;
  if (pc && pc.k === 'enfeeble' && pc.t > G.t) more *= 1 - pc.v / 100;
  if (tg.includes('attack')) more *= 1 + (P.rage || 0) / 100;
  /* 天賦基石的全域更多／更少（0.2.17） */
  if (ST.more) more *= 1 + ST.more / 100;
  /* 失衡（招架，mech.js）：受到的攻擊傷害提高 50% */
  if (!spell && m && m.ail && m.ail.parried > G.t) more *= 1.5;
  for (const k of DT) {
    let mk = more;
    if (spell && k !== 'phys' && k !== 'chaos' && P.buf && P.buf.archon > G.t) mk *= 1.25;
    pre[k] *= (1 + (common + typeInc[k]) / 100) * mk;
  }
  /* 暴擊：基礎（攻擊看武器、法術看寶石）×（1＋提高）；易碎直接加；暴擊傷害加成基礎 +100% */
  const base = spell ? D.crit || 7 : D.shield ? 5 : ST.wcrit,
    brit = m && m.ail && m.ail.brittle && m.ail.brittle.t > G.t ? m.ail.brittle.v : 0,
    chance = Math.min(100, base * (1 + (ST.critInc + (c.critInc || 0)) / 100) + brit);
  const crit = !!(o.crit || P.critNext || Math.random() * 100 < chance);
  if (crit) {
    const cm = 1 + (100 + ST.critX + (c.critX || 0) + (P.critNext ? 50 : 0)) / 100;
    for (const k of DT) pre[k] *= cm;
  }
  if (!o.keep) P.critNext = 0;
  /* 目標的減傷：物理看護甲（上限 90%）、其他看抗性；再乘「受到的傷害提高」 */
  let d = 0,
    big = 'phys',
    bigV = -1;
  for (const k of DT) {
    const v = pre[k];
    if (!v) continue;
    if (v > bigV) (bigV = v), (big = k);
    if (!m) {
      d += v;
      continue;
    }
    const red = k === 'phys' ? Math.min(0.9, m.arm / (m.arm + 10 * v + 1)) : resOf(m, k, ST.pen + (c.pen || 0)) / 100;
    d += v * (1 - red) * (1 + takenInc(m, k) / 100);
  }
  return { d, pre, crit, el: big, spell };
}

/* ---------- 異常：打中之後（hitMob 呼叫） ---------- */
/* 只取最強的（點燃、流血） */
const keepMax = (cur, dps, t) => (!cur || cur.t <= G.t || dps > cur.dps ? { dps, t: G.t + t } : cur);
function applyAil(m, r, c) {
  const a = m.ail,
    t = G.mapT || 1,
    thr = ailThr(t),
    p = r.pre,
    mag = 1 + (ST.ailMag + (c.ailMag || 0)) / 100,
    attack = (c.D.tags || []).includes('attack'),
    rr = 1 - rarRed(m);
  /* 點燃：火焰傷害疊易燃（每 5% 門檻 +1% 機率），中了清零 */
  if (p.fire > 0) {
    a.flam = Math.min(100, (a.flamT > G.t ? a.flam || 0 : 0) + (p.fire / thr) * 20);
    a.flamT = G.t + 8;
    if (Math.random() * 100 < a.flam) (a.ign = keepMax(a.ign, p.fire * 0.2 * mag, 4)), (a.flam = 0);
  }
  /* 冰緩：效果看傷害÷門檻，低於 30% 不生效，最高 50%；8 秒 */
  if (p.cold > 0) {
    const v = Math.min(50, ((p.cold / thr) * 100 + 0) * mag) * rr;
    if (v >= 30 * rr && (!a.chill || a.chill.t <= G.t || v >= a.chill.v)) a.chill = { v, t: G.t + 8 };
    /* 冰凍累積：滿了冰凍 4 秒；王每被冰凍一次門檻 +50% */
    a.frz = (a.frz || 0) + ((p.cold / thr) * 100) / (1 + 0.5 * (a.frzN || 0)) / (m.boss ? 4 : m.elite ? 2 : 1);
    if (a.frz >= 100) (a.frozen = G.t + 4), (a.frz = 0), (a.frzN = (a.frzN || 0) + 1);
  }
  /* 感電：每 4% 門檻 +1% 機率，受到的傷害提高 20%、8 秒 */
  if (p.light > 0 && Math.random() * 100 < ((p.light / thr) * 100) / 4) a.shock = G.t + 8;
  /* 電殛：只有特定技能、輔助會累積 */
  if (p.light > 0 && c.elc) {
    a.elc = (a.elc || 0) + ((p.light / thr) * 100 * c.elc) / (m.boss ? 4 : m.elite ? 2 : 1);
    if (a.elc >= 100) (a.elcT = G.t + (m.boss ? 1.5 : 5)), (a.elc = 0);
  }
  /* 暈眩：輕暈看「這一下÷最大生命」（低於 15% 不算）；重暈累積（冰冷不算，物理、近戰各 ×1.5） */
  const hit = p.phys + p.fire + p.light + p.chaos;
  if (!m.boss && hit / m.mhp >= 0.15 && Math.random() < hit / m.mhp) m.stun = Math.max(m.stun || 0, 0.5);
  a.hs =
    (a.hs || 0) +
    ((hit * (p.phys > 0 ? 1.5 : 1) * ((c.D.tags || []).includes('melee') ? 1.5 : 1) * (c.hsM || 1)) / m.mhp) *
      100 *
      0.5;
  if (a.hs >= 100) (a.hstun = G.t + (m.boss ? 1.2 : 3)), (a.hs = 0);
  /* 流血、中毒：要有機率；流血只有攻擊會造成，c.spellBleed 是例外（死亡紅花的爆炸） */
  if ((attack || c.spellBleed) && p.phys > 0 && Math.random() * 100 < ST.bleedCh + (c.bleedCh || 0))
    a.bleed = keepMax(a.bleed, p.phys * 0.15 * mag, 5);
  if (p.phys + p.chaos > 0 && Math.random() * 100 < ST.poisonCh + (c.poisonCh || 0)) {
    const n = 1 + ST.poiStack + (c.poiStack || 0);
    a.poi = (a.poi || []).filter(x => x.t > G.t);
    a.poi.push({ dps: (p.phys + p.chaos) * 0.2 * mag, t: G.t + 2 });
    a.poi.sort((x, y) => y.dps - x.dps);
    a.poi.length = Math.min(a.poi.length, n);
  }
  /* 破甲：物理擊中扣護甲（普通 ×3、菁英 ×2），扣到 0＝完全破甲 12 秒 */
  if (p.phys > 0 && (ST.armBreak || c.armBreak) && !(a.broken > G.t)) {
    m.arm -= p.phys * (m.boss ? 1 : m.elite ? 2 : 3);
    a.abT = G.t + 12;
    if (m.arm <= 0) (m.arm = 0), (a.broken = G.t + 12);
  }
  /* 穿刺：存 30% 物理（只有矛） */
  if (attack && p.phys > 0 && ST.wt === 'spear' && Math.random() * 100 < ST.impaleCh + (c.impaleCh || 0))
    (a.imp = a.imp || []).length < 60 && a.imp.push(p.phys * 0.3);
  /* 特殊元素異常（PoE1）：k ×（傷害÷門檻）^0.4，4 秒 */
  const alt = (k, dmg, cap) => Math.min(cap, k * Math.pow(dmg / thr, 0.4) * 100 * mag);
  if (c.alt === 'scorch' && p.fire > 0) a.scorch = { v: alt(0.5, p.fire, 30), t: G.t + 4 };
  if (c.alt === 'brittle' && p.cold > 0) a.brittle = { v: alt(10, p.cold, 600) / 100, t: G.t + 4 };
  if (c.alt === 'sap' && p.light > 0) a.sap = { v: alt(1 / 3, p.light, 20), t: G.t + 4 };
  /* 減益 */
  if (c.expose) a.exp = G.t + 4;
  if (c.blind) a.blind = G.t + 4;
  if (c.wither && p.chaos > 0) (a.wither = (a.wither || []).filter(x => x > G.t)).length < 10 && a.wither.push(G.t + 4);
  if (c.hinder) a.hinder = G.t + 4;
  if (c.maim && attack) a.maim = G.t + 4;
  if (c.intim) a.intim = G.t + 4;
}
/* 怪物這一格：持續傷害、累積條消退；回傳 true＝不能行動（冰凍、電殛、重暈、輕暈） */
function ailTick(m, dt) {
  const a = m.ail || {};
  let d = 0;
  if (a.ign && a.ign.t > G.t) d += a.ign.dps * (1 - resOf(m, 'fire') / 100);
  if (a.bleed && a.bleed.t > G.t) d += a.bleed.dps * (m.mv ? 2 : 1);
  if (a.poi)
    for (const x of a.poi) if (x.t > G.t) d += x.dps * (1 - resOf(m, 'chaos') / 100) * (1 + takenInc(m, 'chaos') / 100);
  if (d > 0) {
    m.hp -= d * dt;
    m.dotAcc = (m.dotAcc || 0) + d * dt;
    if ((m.dotT = (m.dotT || 0) + dt) > 0.5) {
      if (m.dotAcc >= 1) num(m.x, m.y - m.sz, m.dotAcc, 'dot');
      m.dotT = m.dotAcc = 0;
    }
  }
  for (const k of ['frz', 'elc', 'hs']) if (a[k]) a[k] = Math.max(0, a[k] - 15 * dt);
  /* 獵犬標記：流血的失血累積重暈 */
  if (a.mark && a.mark.k === 'hound' && a.bleed && a.bleed.t > G.t)
    a.hs = (a.hs || 0) + ((a.bleed.dps * dt) / m.mhp) * 100;
  if (a.abT && a.abT <= G.t && !(a.broken > G.t)) m.arm = m.arm0;
  if (a.curse && a.curse.t <= G.t) a.curse = null;
  if (m.stun > 0) m.stun -= dt;
  return a.frozen > G.t || a.elcT > G.t || a.hstun > G.t || m.stun > 0;
}
/* 怪物的移動倍率：冰緩、阻礙、殘廢、時空鎖鏈 */
function mobSpd(m) {
  const a = m.ail || {};
  let s = (m.spdM || 1) * (m.gslow > G.t ? 0.7 : 1);
  if (a.chill && a.chill.t > G.t) s *= 1 - a.chill.v / 100;
  if (a.hinder > G.t || a.maim > G.t) s *= 0.7;
  if (a.curse && a.curse.k === 'tchains') s *= 1 - a.curse.v / 100;
  return Math.max(0.25, s);
}
/* 怪物造成的傷害倍率：殘喘、衰弱（更少）、威嚇 */
function mobDmgMul(m) {
  const a = m.ail || {};
  let s = 1;
  if (a.sap && a.sap.t > G.t) s *= 1 - a.sap.v / 100;
  if (a.curse && a.curse.k === 'enfeeble') s *= 1 - a.curse.v / 100;
  if (a.intim > G.t) s *= 0.9;
  return s;
}

/* ---------- 詛咒與標記 ---------- */
/* 詛咒：每隻怪 1 個，新的蓋掉舊的；稀有度減效果 */
const CURSES = {
  enfeeble: { n: '衰弱', v: [20, 29], d: '造成的傷害更少 {}%' },
  eleweak: { n: '元素要害', v: [40, 59], d: '元素抗性 −{}%' },
  tchains: { n: '時空鎖鏈', v: [40, 59], d: '緩速 {}%' },
  vuln: { n: '脆弱', v: [30, 50], d: '護甲 −{}%' },
  despair: { n: '絕望', v: [35, 49], d: '混沌抗性 −{}%' }
};
const curseV = (k, lv) => {
  const [a, b] = CURSES[k].v;
  return a + ((b - a) * (Math.min(20, lv) - 1)) / 19;
};
function curseMob(m, k, lv) {
  const v = curseV(k, lv) * (1 - rarRed(m));
  m.ail.curse = { k, v, t: G.t + 6 + 0.07 * lv };
  if (k === 'vuln') m.arm = m.arm0 * (1 - v / 100);
}
/* 標記：每隻怪 1 個；觸發時消耗，給球或 buff */
const MARKS = {
  sniper: { n: '狙擊手標記', d: '下一次被暴擊：這一下多 50% 傷害，給狂怒球' },
  freeze: { n: '冰凍標記', d: '冰凍累積 +50%；被冰凍時你得到附加冰冷 buff' },
  volt: { n: '電壓標記', d: '電殛累積 +50%；被電殛時你得到附加閃電 buff' },
  hound: { n: '獵犬標記', d: '流血會累積重暈；被重暈或死亡時血爆' },
  assassin: { n: '刺客標記', d: '被暴擊率 +5%；死亡時給暴擊球' },
  poacher: { n: '獵人標記', d: '被擊中時你回 1% 魔力；死亡時給狂怒球、回 5% 生命' },
  warlord: { n: '軍閥標記', d: '被擊中時你回 0.5% 生命；死亡時給耐力球' }
};
function markMob(m, k) {
  for (const o of G.mobs) if (o.ail && o.ail.mark && o.ail.mark.k === k && o !== m && !ST.multiMark) o.ail.mark = null;
  m.ail.mark = { k };
}

/* ---------- 球體（照 PoE2：只是資源，持有不加數值；15 秒） ---------- */
const CHG = { e: '耐力球', f: '狂怒球', p: '暴擊球' };
const chgMax = k => 3 + (ST['chg_' + k] || 0);
function gainChg(k, n = 1) {
  const c = (P.chg = P.chg || {}),
    cur = c[k] && c[k].t > G.t ? c[k].n : 0;
  c[k] = { n: Math.min(chgMax(k), cur + n), t: G.t + 15 };
}
const chgN = k => (P.chg && P.chg[k] && P.chg[k].t > G.t ? P.chg[k].n : 0);
/* 消耗全部，回傳消耗了幾顆 */
function useChg(k) {
  const n = chgN(k);
  if (n) P.chg[k] = null;
  return n;
}

/* ---------- Buff（同一種不疊加，只刷新時間） ---------- */
const BUFF = {
  onslaught: { n: '猛攻', d: '技能速度 +20%、移動速度 +10%' },
  arcane: { n: '秘術增強', d: '施法速度 +15%、魔力回復更多 20%' },
  unholy: { n: '邪力', d: '多造成全部傷害 30% 的混沌傷害' },
  archon: { n: '元素化身', d: '法術的元素傷害更多 25%' },
  phasing: { n: '相位', d: '可以穿過敵人' }
};
function gainBuff(k, t) {
  (P.buf = P.buf || {})[k] = Math.max(P.buf[k] || 0, G.t + t);
}
/* 讀檔時角色（P）還沒建立：當作沒有 buff */
const hasBuff = k => !!(P && P.buf && P.buf[k] > G.t);
/* 技能速度、移動速度（給 speedMul／moveMul） */
const buffSpeed = () => (hasBuff('onslaught') ? 1.2 : 1) * (1 + 0.02 * (P.tail || 0));
const buffMove = () => (hasBuff('onslaught') ? 1.1 : 1) * (1 + 0.01 * (P.tail || 0));

/* ---------- 打中、擊殺時的觸發（hitMob／killMob 呼叫） ---------- */
function onHitBase(m, r, c) {
  const a = m.ail,
    melee = (c.D.tags || []).includes('melee');
  /* 狂怒：近戰擊中 +1（每 0.5 秒最多一次），最多 30；停止 4 秒後每 0.2 秒掉 1 */
  if (melee && ST.rageHit && !(P.rageCd > G.t))
    (P.rage = Math.min(30, (P.rage || 0) + ST.rageHit)), (P.rageCd = G.t + 0.5), (P.rageT = G.t);
  if (r.crit && ST.powOnCrit && Math.random() * 100 < ST.powOnCrit) gainChg('p');
  if (r.spell && (c.arcane || Math.random() * 100 < ST.arcaneHit)) gainBuff('arcane', 10);
  if (ST.tailwind && r.crit) P.tail = Math.min(10, (P.tail || 0) + 1);
  /* 標記 */
  const mk = a.mark;
  if (!mk) return;
  if (mk.k === 'sniper' && r.crit) (m.hp -= r.d * 0.5), gainChg('f'), (a.mark = null);
  else if (mk.k === 'poacher') P.mp = Math.min(ST.mp, P.mp + ST.mp * 0.01);
  else if (mk.k === 'warlord') P.hp = Math.min(ST.hp, P.hp + ST.hp * 0.005);
  else if (mk.k === 'freeze' && a.frozen > G.t) gainBuff('frostMark', 6), (a.mark = null);
  else if (mk.k === 'volt' && a.elcT > G.t) gainBuff('voltMark', 6), (a.mark = null);
  else if (mk.k === 'hound' && a.hstun > G.t) markBoom(m);
}
function markBoom(m) {
  m.ail.mark = null;
  fx({ k: 'ring', x: m.x, y: m.y, r: 120, dur: 0.3, col: '#ff6b6b' });
  for (const o of G.mobs)
    if (o.hp > 0 && o !== m && dist(o, m) < 120 + o.r) (o.hp -= m.mhp * 0.1), num(o.x, o.y - o.sz, m.mhp * 0.1, 'phys');
}
function onKillBase(m) {
  const mk = m.ail && m.ail.mark;
  if (mk) {
    if (mk.k === 'assassin') gainChg('p');
    else if (mk.k === 'poacher') gainChg('f'), (P.hp = Math.min(ST.hp, P.hp + ST.hp * 0.05));
    else if (mk.k === 'warlord') gainChg('e');
    else if (mk.k === 'hound') markBoom(m);
  }
  if (ST.onsKill && Math.random() * 100 < ST.onsKill) gainBuff('onslaught', 4);
  if (ST.unholyKill && Math.random() * 100 < ST.unholyKill) gainBuff('unholy', 4);
  addCorpse(m);
  /* 元素殘留物：點燃、冰緩（冰凍）、感電中的怪死掉留下（撿起來得到灌注） */
  const a = m.ail || {};
  if (a.ign && a.ign.t > G.t) dropRemnant('fire', m.x, m.y);
  if ((a.chill && a.chill.t > G.t) || a.frozen > G.t) dropRemnant('cold', m.x, m.y);
  if (a.shock > G.t) dropRemnant('light', m.x, m.y);
  gainGlory(m.boss ? 40 : m.elite ? 15 : 3);
  metaEvent('kill');
  chargeCharms(m);
}
/* 玩家這一格：狂怒消退、球體與 buff 到期、玩家身上的異常、護符 */
function baseTick(dt) {
  if (P.rage && G.t - (P.rageT || 0) > 4) {
    P.rageDec = (P.rageDec || 0) + dt;
    while (P.rageDec >= 0.2 && P.rage > 0) (P.rageDec -= 0.2), P.rage--;
  }
  if (P.tail && !(P.tailT > G.t)) (P.tail = Math.max(0, P.tail - dt * 2)), (P.tailT = G.t + 0.5);
  const a = (P.ail = P.ail || {});
  let d = 0,
    skipEs = 0;
  if (a.ign && a.ign.t > G.t) d += a.ign.dps * (1 - effRes('fire') / 100);
  if (a.bleed && a.bleed.t > G.t) (d += a.bleed.dps), (skipEs += a.bleed.dps);
  if (a.poi && a.poi.t > G.t) {
    const v = a.poi.dps * (1 - effRes('chaos') / 100);
    (d += v), (skipEs += v);
  }
  if (a.frz) a.frz = Math.max(0, a.frz - 20 * dt);
  if (d > 0) {
    /* 流血、中毒跳過能量護盾 */
    const viaEs = Math.min(P.es || 0, (d - skipEs) * dt);
    P.es = (P.es || 0) - viaEs;
    P.hp -= d * dt - viaEs;
    if (P.hp <= 0) die();
  }
  /* 吸血：1 秒內回完 */
  if (P.lch && P.lch.t > G.t) P.hp = Math.min(ST.hp, P.hp + P.lch.rate * dt);
  tickCharms(dt);
}

/* ---------- 玩家受傷（hurtPlayer 呼叫）：回傳 { d, ev, block, crit }，d 是扣完防禦的傷害 ---------- */
/* 抗性：扣完懲罰、上限是最大抗性（藏身處不扣） */
const effRes = k => {
  const pen = k !== 'chaos' && G.scene === 'map' ? resPen(mobLv(G.mapT || 1)) : 0;
  let r = ST.res[k] - pen;
  const cu = P.ail && P.ail.curse;
  if (cu && cu.t > G.t && ((cu.k === 'eleweak' && k !== 'chaos') || (cu.k === 'despair' && k === 'chaos'))) r -= cu.v;
  return Math.min(ST.maxRes[k] + (k !== 'chaos' && G.scene === 'map' ? MM('pmaxres') : 0), r);
};
function hurtCalc(d, src, el, noEv) {
  const m = src && src.ail ? src : src && src.src && src.src.ail ? src.src : null;
  if (m) d *= mobDmgMul(m);
  /* 招架（mech.js）：窗口裡被打到＝擋下，攻擊者失衡 */
  if (!noEv && tryParry(m)) return { parry: 1 };
  /* 閃避：熵值（累積命中率到 100 才算打中），王的紅光大招（noEv）躲不掉 */
  if (!noEv) {
    const acc = (m ? m.acc : 15 + 6 * mobLv(G.mapT || 1)) * (m && m.ail.blind > G.t ? 0.8 : 1),
      hitCh = Math.max(0.05, Math.min(1, (1.25 * acc) / (acc + 0.3 * ST.ev)));
    if (P.evE == null) P.evE = Math.random() * 100;
    P.evE += hitCh * 100;
    if (P.evE < 100) return { ev: 1 };
    P.evE -= 100;
  }
  /* 盾牌投擲：盾飛出去的時候不能格擋 */
  if (!noEv && !(P.shieldOut > G.t) && Math.random() * 100 < ST.block) return { block: 1 };
  /* 王、菁英會暴擊（5%，暴擊傷害 +60%）；地圖詞可以讓所有怪暴擊 */
  const crit = m && Math.random() * 100 < (m.boss || m.elite ? 5 : 0) + MM('mcrit');
  if (crit) d *= 1.6 + MM('mcritX');
  const pre = d,
    /* 怪物穿透（地圖詞）：最多穿到 0 */
    resHit = k => {
      const r = effRes(k);
      return r > 0 ? Math.max(0, r - MM('mpen')) : r;
    },
    cu = P.ail && P.ail.curse,
    arm = ST.armor * (cu && cu.k === 'vuln' ? 1 - cu.v / 100 : 1) * ((formOf() && formOf().armorM) || 1);
  if (el === 'phys') d *= 1 - Math.min(0.9, arm / (arm + 10 * d + 1));
  else d *= 1 - resHit(el) / 100;
  /* 地圖詞「怪物多造成 20% 的某元素傷害」：另外照那個元素的抗性算 */
  for (const [f, k] of [
    ['addF', 'fire'],
    ['addC', 'cold'],
    ['addL', 'light']
  ])
    if (MM(f)) d += ((pre * MM(f)) / 100) * (1 - resHit(k) / 100);
  if (P.ail && P.ail.shock > G.t) d *= 1.2;
  if (el !== 'phys' && el !== 'chaos' && formOf() && formOf().eleTaken) d *= formOf().eleTaken;
  if (m) mobAilPlayer(m, pre, el);
  /* 守護先吸收 */
  if (P.guardV > 0) {
    const ab = Math.min(P.guardV, d);
    P.guardV -= ab;
    d -= ab;
  }
  return { d, crit };
}
/* 怪物對玩家上異常：照怪物類型（企劃書 7.2） */
function mobAilPlayer(m, d, el) {
  const a = (P.ail = P.ail || {}),
    thr = ST.hp / 2,
    ail = m.D.ail || '',
    imm = k => a.imm && a.imm[k] > G.t;
  if (el === 'fire' && !imm('ign') && Math.random() < Math.min(1, (d / thr) * 0.2 + 0.1))
    a.ign = keepMax(a.ign, d * 0.2, 4);
  if (el === 'cold' && !imm('chill')) {
    const v = Math.min(50, (d / thr) * 100);
    if (v >= 30) a.chill = { v, t: G.t + 2 };
  }
  if (el === 'light' && !imm('shock') && Math.random() * 100 < ((d / thr) * 100) / 4) a.shock = G.t + 4;
  /* 冰凍累積：滿了凍住 1.5 秒（玩家的比怪物短，不然太難受） */
  if (el === 'cold' && !imm('frz')) {
    a.frz = (a.frz || 0) + (d / thr) * 50;
    if (a.frz >= 100) (a.frozen = G.t + 1.5), (a.frz = 0);
  }
  if (!imm('bleed') && Math.random() < (ail === 'bleed' ? 0.25 : 0) + MM('mbleed') / 100)
    a.bleed = keepMax(a.bleed, d * 0.15, 5);
  if (!imm('poi') && Math.random() < (ail === 'poison' ? 0.3 : 0) + MM('mpoi') / 100)
    a.poi = { dps: d * 0.2, t: G.t + 2 };
  if (!imm('ign') && Math.random() * 100 < MM('mign')) a.ign = keepMax(a.ign, d * 0.2, 4);
  trigCharms(el, a);
}
/* 玩家被冰緩、時空鎖鏈時的移動、出手倍率 */
function playerSlow() {
  const a = P.ail || {};
  let s = 1;
  if (a.frozen > G.t) return 0;
  if (a.chill && a.chill.t > G.t && !(a.imm && a.imm.slow > G.t)) s *= 1 - a.chill.v / 100;
  const cu = a.curse;
  if (cu && cu.t > G.t && cu.k === 'tchains' && !(a.imm && a.imm.slow > G.t)) s *= 1 - cu.v / 100;
  return s;
}

/* ---------- 護符（照 PoE2）：腰帶給 1～3 格，條件達成自動觸發，殺怪回充 ---------- */
const CHARMS = {
  c_ruby: {
    n: '紅玉護符',
    ic: 'sup_sp_gfire',
    on: 'fire',
    fx: 'resF',
    d: '受到火焰擊中時：火焰抗性 +25%，4 秒',
    dur: 4,
    use: 20,
    max: 40
  },
  c_sapph: {
    n: '藍玉護符',
    ic: 'sup_sp_gcold',
    on: 'cold',
    fx: 'resC',
    d: '受到冰冷擊中時：冰冷抗性 +25%，4 秒',
    dur: 4,
    use: 20,
    max: 40
  },
  c_topaz: {
    n: '黃玉護符',
    ic: 'sup_sp_glight',
    on: 'light',
    fx: 'resL',
    d: '受到閃電擊中時：閃電抗性 +25%，4 秒',
    dur: 4,
    use: 20,
    max: 40
  },
  c_ameth: {
    n: '紫晶護符',
    ic: 'sup_sp_gchaos',
    on: 'chaos',
    fx: 'resX',
    d: '受到混沌擊中時：混沌抗性 +18%，4 秒',
    dur: 4,
    use: 30,
    max: 40
  },
  c_silver: {
    n: '銀護符',
    ic: 'ail_slow',
    on: 'chill',
    fx: 'slow',
    d: '被緩速時：不受緩速影響，3 秒',
    dur: 3,
    use: 20,
    max: 40
  },
  c_thaw: {
    n: '解凍護符',
    ic: 'ail_frozen',
    on: 'frz',
    fx: 'frz',
    d: '被冰凍時：免疫冰凍，3 秒',
    dur: 3,
    use: 40,
    max: 40
  },
  c_staunch: {
    n: '止血護符',
    ic: 'ail_bleed',
    on: 'bleed',
    fx: 'bleed',
    d: '開始流血時：解除並免疫流血，3 秒',
    dur: 3,
    use: 30,
    max: 40
  },
  c_antidote: {
    n: '解毒護符',
    ic: 'ail_poison',
    on: 'poi',
    fx: 'poi',
    d: '中毒時：解除並免疫中毒，3 秒',
    dur: 3,
    use: 20,
    max: 40
  },
  c_douse: {
    n: '滅火護符',
    ic: 'ail_burn',
    on: 'ign',
    fx: 'ign',
    d: '被點燃時：解除並免疫點燃，3 秒',
    dur: 3,
    use: 30,
    max: 40
  },
  c_ground: {
    n: '接地護符',
    ic: 'ail_shock',
    on: 'shock',
    fx: 'shock',
    d: '被感電時：解除並免疫感電，3 秒',
    dur: 3,
    use: 30,
    max: 40
  },
  c_gold: {
    n: '黃金護符',
    ic: 'it_coindart',
    on: 'rareKill',
    fx: 'rarity',
    d: '擊殺菁英或王時：物品稀有度 +15%，1 秒',
    dur: 1,
    use: 80,
    max: 80
  }
};
/* 護符道具：1×1，r=1（藍色），ch 充能 */
const mkCharm = k => ({ id: ++IID, charm: k, ch: 0, r: 1, a: [] });
const dropCharm = () => mkCharm(pick(Object.keys(CHARMS)));
/* 腰帶的護符槽：照物品等級（物品等級 1～29 給 1 格、30～59 給 1～2、60 以上 1～3；我們的物品等級是怪物等級） */
const charmSlots = s => {
  const b = s.eq && s.eq.belt;
  return b ? b.cs || 1 : 0;
};
const rollCharmSlots = ilvl => {
  const lv = mobLv(ilvl);
  return lv < 30 ? 1 : lv < 60 ? irnd(1, 2) : irnd(1, 3);
};
/* 戴著的護符（S.charms 是 3 格，超過腰帶槽數的不生效） */
const charmsOn = () => (S.charms || []).slice(0, charmSlots(S)).filter(Boolean);
function trigCharms(el, a) {
  for (const it of charmsOn()) {
    const C = CHARMS[it.charm];
    if (it.on > G.t || (it.ch || 0) < C.use) continue;
    const hit =
      C.on === el ||
      (C.on === 'chill' && a.chill && a.chill.t > G.t) ||
      (C.on === 'frz' && a.frozen > G.t) ||
      (C.on !== el && a[C.on] && (a[C.on].t || a[C.on]) > G.t);
    if (!hit) continue;
    it.ch -= C.use;
    it.on = G.t + C.dur;
    (a.imm = a.imm || {})[C.fx] = G.t + C.dur;
    if (['ign', 'bleed', 'poi', 'shock', 'frz'].includes(C.fx)) a[C.fx === 'frz' ? 'frozen' : C.fx] = null;
    fx({ k: 'ring', x: P.x, y: P.y, r: 46, dur: 0.3, col: '#ffd166' });
    sfx('drink');
  }
}
/* 殺怪回充（跟藥水一樣：普通 1、菁英 3、王 10） */
function chargeCharms(m) {
  for (const it of charmsOn()) {
    const C = CHARMS[it.charm];
    it.ch = Math.min(C.max, (it.ch || 0) + (m.boss ? 10 : m.elite ? 3 : 1));
    if (C.on === 'rareKill' && (m.boss || m.elite) && it.ch >= C.use) (it.ch -= C.use), (it.on = G.t + C.dur);
  }
}
function tickCharms() {
  /* 抗性類護符：生效期間加抗性（stats 之外的暫時加成，effRes 讀不到，直接改 ST） */
  const want = {};
  for (const it of charmsOn()) if (it.on > G.t && /^res/.test(CHARMS[it.charm].fx)) want[CHARMS[it.charm].fx] = 1;
  for (const [fxk, k, v] of [
    ['resF', 'fire', 25],
    ['resC', 'cold', 25],
    ['resL', 'light', 25],
    ['resX', 'chaos', 18]
  ]) {
    const on = !!want[fxk],
      had = !!(P.charmRes && P.charmRes[fxk]);
    if (on !== had) (ST.res[k] += on ? v : -v), ((P.charmRes = P.charmRes || {})[fxk] = on);
  }
}

/* 玩家身上的異常與詛咒（HUD 顯示用） */
function ailNames() {
  const a = P.ail || {},
    on = x => x && (x.t || x) > G.t,
    o = [];
  if (on(a.ign)) o.push('點燃');
  if (on(a.bleed)) o.push('流血');
  if (on(a.poi)) o.push('中毒');
  if (on(a.chill)) o.push('冰緩');
  if (a.frozen > G.t) o.push('冰凍');
  if (a.shock > G.t) o.push('感電');
  if (a.curse && a.curse.t > G.t) o.push(CURSES[a.curse.k].n);
  return o;
}
