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
/* 0.2.22：天賦回到 PoE2 的量級（全押傷害約 +900%），怪物與王的生命 ×2（護甲、異常門檻不跟著變） */
const MOB_HP = 2;

/* ---------- 異常門檻：同等級普通怪的基礎生命（照 PoE2 只看等級，不吃稀有度） ---------- */
const ailThr = t => 30 * tierMul(t).hp;
/* 稀有度對減益的抵抗（冰緩、詛咒、曝露）：菁英當稀有 30%、王當傳奇 50% */
const rarRed = m => (m.boss ? 0.5 : m.elite ? 0.3 : 0);
const ELEK = ['fire', 'cold', 'light'];

/* ---------- 命中（0.2.22，照 PoE2）：命中率 = 1.25 × 命中 ÷（命中 ＋ 0.3 × 閃避），5%～100%；用熵值不擲骰 ---------- */
const hitChance = (acc, ev) => Math.max(0.05, Math.min(1, (1.25 * acc) / (acc + 0.3 * ev)));
/* 怪物閃避：同等級、沒投資命中（基礎 30＋每級 6）時，普通怪約 85%、菁英 80%、王 75% */
const mobEv = (lv, m) => 6 * lv * (m && m.boss ? 2.22 : m && m.elite ? 1.9 : 1.57);
/* 玩家的攻擊打不打得中：法術、召喚物、場上單位、持續傷害一律命中；基石「堅定技巧」必中 */
function hitRoll(m, c, o = {}) {
  if (ST.noMiss || o.minion || o.unit || isSpell(c.D) || !m.ev) return true;
  const ch = hitChance(ST.acc * (P.ail && P.ail.blind > G.t ? 0.8 : 1), m.ev);
  if (m.evE == null) m.evE = Math.random() * 100;
  m.evE += ch * 100;
  if (m.evE < 100) return false;
  m.evE -= 100;
  return true;
}

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
  m.ev = mobEv(mobLv(t), m);
  m.spdM = 1 + MM('mspd') / 100;
  m.ail = {};
}

/* 移動中＝0.3 秒內有移動（翻滾也算）；靜止＝連續站著 1 秒以上（game.js 的 updPlayer 記 movT／stillT） */
/* 品質（0.2.29）的小工具：機率（0～100）、加魔力、最近的怪、範圍冰緩、拉怪、閃電跳躍 */
const qRoll = p => p > 0 && Math.random() * 100 < p;
const addMp = v => (P.mp = Math.min(ST.mp, P.mp + v));
const nearMob = (m, r, ok) =>
  G.mobs
    .filter(o => o.hp > 0 && o !== m && o.ail && dist(o, m) < r && (!ok || ok(o)))
    .sort((x, y) => dist(x, m) - dist(y, m))[0];
function chillNear(m, r, t) {
  for (const o of G.mobs) if (o.hp > 0 && o !== m && o.ail && dist(o, m) < r) o.ail.chill = { v: 30, t: G.t + t };
}
function pullTo(x, y, r, v = 420) {
  for (const m of G.mobs) {
    const d = Math.hypot(m.x - x, m.y - y);
    if (m.hp <= 0 || m.boss || d >= r || !d) continue;
    m.vx += ((x - m.x) / d) * v * (m.elite ? 0.5 : 1);
    m.vy += ((y - m.y) / d) * v * (m.elite ? 0.5 : 1);
  }
}
function zapNear(m, d, n) {
  let from = m;
  const hit = new Set([m]);
  for (let i = 0; i < n; i++) {
    const o = nearMob(from, 260, x => !hit.has(x));
    if (!o) return;
    hit.add(o);
    fx({ k: 'zap', x: from.x, y: from.y, x2: o.x, y2: o.y - o.sz * 0.4, dur: 0.18 });
    dotHit(o, d, 'light');
    from = o;
  }
}
const moving = () => P.movT != null && G.t - P.movT < 0.3;
const still = () => !moving() && P.stillT != null && G.t - P.stillT >= 1;

/* ---------- 擊中傷害（企劃書 7.2 的五步） ---------- */
const DT = ['phys', 'fire', 'cold', 'light', 'chaos'];
const SPELL_BASE = [7, 12];
/* 法術的基礎傷害：看寶石等級（照 PoE2 每級成長很陡，Lv20 約 Lv1 的 69 倍，跟武器＋攻擊倍率同一個量級），不吃武器、不吃角色等級 */
const spellDmg = (lv, avg) =>
  (avg ? (SPELL_BASE[0] + SPELL_BASE[1]) / 2 : rnd(SPELL_BASE[0], SPELL_BASE[1])) * Math.pow(1.25, lv - 1);
const isSpell = D => (D.tags || []).includes('spell') && !(D.tags || []).includes('attack');
/* 目標身上的減益讓抗性變成多少（詛咒、曝露、焦灼可以壓成負值；穿透最多穿到 0） */
function resOf(m, k, pen = 0) {
  const a = m.ail || {};
  let r = m.res[k] || 0;
  if (k !== 'chaos') {
    if (a.curse && a.curse.k === 'eleweak') r -= a.curse.v;
    if (a.exp > G.t) r -= 20 * (1 - rarRed(m));
    if (a.scorch && a.scorch.t > G.t) r -= a.scorch.v;
    /* 火焰曝露（0.2.26，焦土）：點燃中的敵人火焰抗性 −x%（稀有度減效果，跟曝露一樣） */
    if (k === 'fire' && ST.fireExp && a.ign && a.ign.t > G.t) r -= ST.fireExp * (1 - rarRed(m));
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
/* 0.2.25 底層 ---------- */
/* 依防禦給附加物理傷害：「護甲的 x%」（addArm），閃避、能量護盾之後要用再加 */
const defAdd = () => (ST.addArm ? (ST.armor * ST.addArm) / 100 : 0);
/* 投射物飛行距離（遠射、近射）：fly＝投射物從射出到打中飛了多遠（瞬間的投射物用到目標的距離）
   遠射：0 → 500 線性到更多 farShot%；近射：貼臉更多 nearShot%，300（中距離）降到 0 */
const PROJ_FAR = 500,
  PROJ_MID = 300;
const projDistMore = fly =>
  (1 + (ST.farShot * Math.min(1, fly / PROJ_FAR)) / 100) * (1 + (ST.nearShot * Math.max(0, 1 - fly / PROJ_MID)) / 100);
/* 暴擊弱點（照 PoE2）：每層讓對這個目標的擊中暴擊率 +0.5%，最多 20 層、每層各自 4 秒 */
const cwN = m => (m && m.ail && m.ail.cw ? (m.ail.cw = m.ail.cw.filter(t => t > G.t)).length : 0);
function addCw(m, n) {
  const a = (m.ail.cw = (m.ail.cw || []).filter(t => t > G.t));
  for (let i = 0; i < n; i++) a.push(G.t + 4);
  /* 上限 20 層；弱點獵殺 40 層 */
  a.splice(0, Math.max(0, a.length - (ST.cwMax || 20)));
}
/* 熵值（設計原則第 4 節）：每次 +v，滿 100 必定觸發（起點隨機，不會每次都在同一下） */
function entropy(k, v) {
  const E = (P.ent = P.ent || {});
  if (E[k] == null) E[k] = Math.random() * 100;
  E[k] += v;
  if (E[k] < 100) return false;
  E[k] -= 100;
  return true;
}
/* 格擋值（0.2.25，盾的隱性：格擋值＝盾的護甲，stats 的 ST.bv）：
   大於 0 時每一下吸收 40%（重盾前進 60%），在守護之前；2 秒沒被打開始回，每秒 25%；
   打碎（歸 0）後 8 秒（不動如山 5 秒）從 0 跑滿，跑滿前不吸收 */
const BV = { abs: 0.4, absHeavy: 0.6, wait: 2, rate: 0.25, re: 8, reStand: 5 };
const bvUp = () => ST.bv > 0 && P.bv > 0 && P.bvRe == null;
function bvAbsorb(d) {
  if (!bvUp()) return d;
  const ab = Math.min(P.bv, d * (ST.heavyShield ? BV.absHeavy : BV.abs));
  P.bv -= ab;
  P.bvHit = G.t;
  if (ST.steelCycle) P.bvAcc = Math.min(ST.hp, (P.bvAcc || 0) + ab);
  if (P.bv <= 0.5) {
    P.bv = 0;
    P.bvRe = G.t;
    if (ST.sacrifice) P.sacT = G.t + 2;
    fx({ k: 'ring', x: P.x, y: P.y, r: 60, dur: 0.35, col: '#c9d3e0' });
    sfx('block');
  }
  return d - ab;
}
function bvTick(dt) {
  if (!ST.bv) return (P.bv = 0), (P.bvRe = null);
  if (P.bvRe != null) {
    P.bv = (ST.bv * (G.t - P.bvRe)) / (ST.unmov ? BV.reStand : BV.re);
    if (P.bv >= ST.bv) (P.bv = ST.bv), (P.bvRe = null);
  } else if (G.t - (P.bvHit == null ? -9 : P.bvHit) >= BV.wait)
    P.bv = Math.min(ST.bv, (P.bv || 0) + ST.bv * BV.rate * dt);
  P.bv = Math.min(ST.bv, P.bv);
}
/* ---------- 地獄火（0.2.26，炎魔契約）：反過來的魔力 ----------
   最大＝2 倍最大魔力（stats 的 hfMax）。放技能不扣魔力，改成累積地獄火；滿了自爆（受到最大生命＋能量護盾的火焰傷害，吃火焰抗性）並清空；
   2 秒沒累積，每秒消退最大值的 25%。灰燼重生：自爆後 4 秒不累積；炎魔之觸：累積時 300 內的敵人易燃 */
const HF = { wait: 2, decay: 0.25, reborn: 4, touchR: 300 };
function hfGain(v) {
  if (!ST.hellfire || P.rebT > G.t) return;
  P.hf = (P.hf || 0) + v;
  P.hfT = G.t;
  if (ST.hfFlam)
    for (const m of G.mobs)
      if (m.hp > 0 && m.ail && dist(P, m) < HF.touchR) {
        const a = m.ail;
        a.flam = Math.min(100, (a.flamT > G.t ? a.flam || 0 : 0) + ST.hfFlam);
        a.flamT = G.t + 8;
      }
  if (P.hf >= ST.hfMax) hfBoom();
}
function hfBoom() {
  P.hf = 0;
  const d = (ST.hp + ST.es) * (1 - effRes('fire') / 100);
  fx({ k: 'ring', x: P.x, y: P.y, r: 140, dur: 0.45, col: '#ff6b3d' });
  sfx('slam');
  num(P.x, P.y - 60, d, 'hurt');
  if (ST.reborn) P.rebT = G.t + HF.reborn;
  P.hp -= esAbsorb(d);
  if (P.hp <= 0) die();
}
function hfTick(dt) {
  if (!ST.hellfire) return (P.hf = 0);
  if (P.hf > 0 && G.t - (P.hfT == null ? -9 : P.hfT) >= HF.wait) P.hf = Math.max(0, P.hf - ST.hfMax * HF.decay * dt);
}
/* 完美閃避的判定時間（0.2.26 可調：殘影步 0.24 秒）；完美閃避之後（殘影步：2 秒更多、重置翻滾冷卻） */
const perfWin = () => ST.perfWin || ROLL.perfect;
function onPerfect() {
  if (!ST.perfMore) return;
  P.pfT = G.t + 2;
  P.cds.roll = 0;
}
/* 影襲（0.2.26）：翻滾穿過敵人時給致盲與 x 層暴擊弱點（每次翻滾每隻一次） */
function rollThrough() {
  if (!ST.rollBlind || !P.roll) return;
  const h = (P.roll.hit = P.roll.hit || new Set());
  for (const m of G.mobs)
    if (m.hp > 0 && m.ail && !h.has(m) && dist(P, m) < P.r + m.r + 10)
      h.add(m), (m.ail.blind = G.t + 4), addCw(m, ST.rollBlind);
}
/* 暗影收割（0.2.26）：暴擊擊殺時消耗 1 顆暴擊球，原地爆炸（120 內，牠最大生命 x% 的物理） */
function reapBoom(m) {
  const c = P.chg && P.chg.p;
  if (!ST.reap || !(c && c.t > G.t && c.n > 0)) return;
  c.n--;
  fx({ k: 'ring', x: m.x, y: m.y, r: 120, dur: 0.3, col: '#8a6cff' });
  const v = (m.mhp * ST.reap) / 100;
  for (const o of G.mobs)
    if (o.hp > 0 && o !== m && dist(o, m) < 120 + o.r) (o.hp -= v), num(o.x, o.y - o.sz, v, 'phys');
}
/* 獵鷹標記（風行神射）：每 3 秒標記 500 內全部沒有標記的敵人（算標記，佔每隻怪 1 個標記位） */
function falconTick() {
  if (!ST.falcon || (P.falT || 0) > G.t) return;
  P.falT = G.t + 3;
  let n = 0;
  for (const m of G.mobs) if (m.hp > 0 && m.ail && !m.ail.mark && dist(P, m) < 500) (m.ail.mark = { k: 'falcon' }), n++;
  if (n) fx({ k: 'ring', x: P.x, y: P.y, r: 500, dur: 0.5, col: '#ffd166' });
}

/* c 技能設定（slotCfg）、m 目標、o：mult 更多倍率、crit 必暴、minion、unit、fly 投射物飛行距離、
   avg 面板用的期望值（傷害取中間、暴擊算進期望、不動任何狀態），m 是 null */
function hitCalc(c, m, o = {}) {
  const rnd2 = o.avg ? (a, b) => (a + b) / 2 : rnd,
    D = c.D,
    tg = D.tags || [],
    spell = isSpell(D),
    pre = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0 };
  /* 1. 基礎：攻擊＝武器（含本地詞）×技能倍率；法術＝寶石 */
  if (spell) pre[D.el || 'phys'] = spellDmg(c.lv || 1, o.avg) * D.m;
  else {
    /* 盾技能（0.2.13）：基礎換成盾的傷害（stats 的 sdmg），不吃武器的附加 */
    const W = D.shield ? ST.sdmg : ST.dmg;
    pre.phys = rnd2(W[0], W[1]);
    if (!D.shield)
      for (const k of ['fire', 'cold', 'light', 'chaos']) {
        const [lo, hi] = ST.wadd[k];
        if (hi) pre[k] += rnd2(lo, hi);
      }
    /* 2. 附加：飾品、手套的「攻擊附加」 */
    for (const k in ST.add) {
      const [lo, hi] = ST.add[k];
      if (hi) pre[k === 'flat' ? 'phys' : k] += rnd2(lo, hi);
    }
    /* 依防禦給的附加物理（0.2.25，鐵金剛的重如泰山：護甲的 x%） */
    pre.phys += defAdd();
    /* 穿刺：取出最強的一個，加進這一下 */
    const imp = m && m.ail && m.ail.imp;
    if (imp && imp.length) pre.phys += imp.splice(imp.indexOf(Math.max(...imp)), 1)[0];
    for (const k of DT) pre[k] *= c.mult;
  }
  /* 2. 多造成 x% 的附加傷害（憤怒、附加火焰；邪力是混沌） */
  const sum = DT.reduce((s, k) => s + pre[k], 0);
  /* 憤怒的品質：對點燃中的怪，光環效果最多 ×1.5 */
  const angerX = m && ST.aq.anger && hasState(m, 'ign') ? ST.angerV * 0.5 * ST.aq.anger : 0;
  pre.fire += (sum * ((c.fireAdd || 0) * 100 + ST.fireAdd + angerX)) / 100;
  if (P.buf && P.buf.unholy > G.t) pre.chaos += sum * 0.3;
  /* 3. 轉換：有屬性的攻擊技能把物理全部轉成那個屬性；再照天賦往後轉（物理→閃電→冰冷→火焰，每種最多轉 100%）
     轉過去的部分吃路上每一種屬性的提高（parts 的 ch） */
  let parts = DT.filter(k => pre[k]).map(k => ({ k, v: pre[k], ch: [k] }));
  if (!spell && D.el && D.el !== 'phys') for (const p of parts) if (p.k === 'phys') (p.k = D.el), p.ch.push(D.el);
  const av = ST.avatar ? 50 : 0,
    hs = m && m.ail && m.ail.hstun > G.t ? ST.hsFire : 0,
    CV = {
      phys: { light: ST.cvPL, cold: ST.cvPC, fire: ST.cvPF + av + hs },
      light: { cold: ST.cvLC, fire: av + ST.cvLF },
      cold: { fire: ST.cvCF + av }
    };
  for (const src of ['phys', 'light', 'cold']) {
    const to = CV[src],
      tot = Object.values(to).reduce((a, b) => a + b, 0);
    if (!tot) continue;
    const sc = Math.min(1, 100 / tot);
    for (const p of parts.filter(p => p.k === src)) {
      for (const k in to) if (to[k]) parts.push({ k, v: (p.v * to[k] * sc) / 100, ch: [...p.ch, k] });
      p.v *= 1 - Math.min(100, tot) / 100;
    }
  }
  /* 4. 提高：同一池相加 */
  const near = m ? dist(P, m) : o.avg ? 200 : 999,
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
      (moving() ? ST.movP : 0) +
      (still() ? ST.stillP : 0) +
      (near < 160 ? ST.closeP : 0) +
      (near > 350 ? ST.farP : 0) +
      (bannerOn() ? G.banner.buff.dmg || 0 : 0);
  const typeInc = { phys: ST.physP, fire: ST.fireP, cold: ST.coldP, light: ST.lightP, chaos: ST.chaosP },
    incOf = ch => ch.reduce((t, k) => t + typeInc[k], 0) + (ch.some(k => ELEK.includes(k)) ? ST.eleP : 0);
  /* 5. 更多：輔助、昇華、狂怒（只有攻擊）、化身（法術的元素） */
  let more = (o.mult || 1) * (c.more || 1);
  /* 你被「衰弱」詛咒（地圖詞）：造成的傷害更少 */
  const pc = P.ail && P.ail.curse;
  if (pc && pc.k === 'enfeeble' && pc.t > G.t) more *= 1 - pc.v / 100;
  if (tg.includes('attack')) more *= 1 + (P.rage || 0) / 100;
  /* 天賦基石的全域更多／更少（0.2.17） */
  if (ST.more) more *= 1 + ST.more / 100;
  /* 0.2.23 基石與特色點：疾風步、投射物更多、自己的擊中（不是召喚物、場上單位） */
  if (ST.wind) more *= moving() ? 1.25 : 0.75;
  if (ST.projMore && tg.includes('proj')) more *= 1 + ST.projMore / 100;
  if (!o.minion && !o.unit) more *= ST.noSelf ? 0 : 1 + ST.selfMore / 100;
  /* 失衡（招架，mech.js）：受到的攻擊傷害提高 50% */
  if (!spell && m && m.ail && m.ail.parried > G.t) more *= 1.5;
  /* 0.2.25 昇華：獵鷹標記（被標記的更多 10%）、遠射／近射（看投射物飛了多遠 o.fly） */
  if (m && m.ail && m.ail.mark && m.ail.mark.k === 'falcon') more *= 1.1;
  if (tg.includes('proj')) more *= projDistMore(o.fly || 0);
  /* 範圍擴大的品質：目標周圍沒有其他怪 */
  if (c.solo && m && !nearMob(m, 200)) more *= 1 + c.solo;
  const sac = ST.sacrifice && P.sacT > G.t;
  /* 0.2.26 昇華：沸騰之軀（地獄火過半，法術更多）、殘影步（完美閃避後 2 秒更多）、影咒（觸發施放的法術更多） */
  if (spell && ST.boil && P.hf > ST.hfMax / 2) more *= 1 + ST.boil / 100;
  if (ST.perfMore && P.pfT > G.t) more *= 1 + ST.perfMore / 100;
  if (spell && o.trig && ST.hexCoc) more *= 1 + ST.hexCoc / 100;
  const reb = ST.reborn && P.rebT > G.t;
  for (const k of DT) pre[k] = 0;
  for (const p of parts) {
    let mk = more;
    if (spell && ELEK.includes(p.k) && P.buf && P.buf.archon > G.t) mk *= 1.25;
    if (ST.avatar && (p.k === 'cold' || p.k === 'light')) mk *= 0.7;
    if (sac && p.k === 'phys') mk *= 1.15;
    if (reb && p.k === 'fire') mk *= 1 + ST.reborn / 100;
    pre[p.k] += p.v * (1 + (common + incOf(p.ch)) / 100) * mk;
  }
  /* 暴擊：基礎（攻擊看武器、法術看寶石）×（1＋提高）；易碎直接加；暴擊傷害加成基礎 +100% */
  const base = spell ? D.crit || 7 : D.shield ? 5 : ST.wcrit,
    brit = m && m.ail && m.ail.brittle && m.ail.brittle.t > G.t ? m.ail.brittle.v : 0,
    /* 精準的品質：沒暴擊的累積（o.avg 面板不算） */
    pity = o.avg ? 0 : (P.noCritN || 0) * (ST.aq.precise || 0),
    chance = ST.noCrit
      ? 0
      : Math.min(100, base * (1 + (ST.critInc + (c.critInc || 0)) / 100) + brit + cwN(m) * 0.5 + pity);
  if (o.avg) {
    const cm = 1 + (100 + ST.critX + (c.critX || 0) + ST.powCritX * chgN('p')) / 100,
      ch = ST.noCrit ? 0 : o.crit ? 100 : chance,
      sum = DT.reduce((s, k) => s + pre[k], 0),
      big = DT.reduce((b, k) => (pre[k] > pre[b] ? k : b), 'phys');
    return {
      d: sum * (1 + (ch / 100) * (cm - 1)),
      el: big,
      ch,
      cm,
      inc: common + incOf(parts[0] ? parts[0].ch : []),
      more
    };
  }
  const crit =
    !ST.noCrit && !!(o.crit || P.critNext || (ST.fullCrit && m && m.hp >= m.mhp) || Math.random() * 100 < chance);
  if (crit) {
    /* 致命陰影（0.2.26）：每顆暴擊球暴擊傷害 +x% */
    const cm = 1 + (100 + ST.critX + (c.critX || 0) + (P.critNext ? 50 : 0) + ST.powCritX * chgN('p')) / 100;
    for (const k of DT) pre[k] *= cm;
  }
  if (!o.keep) P.critNext = 0;
  if (ST.aq.precise) P.noCritN = crit ? 0 : (P.noCritN || 0) + 1;
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
    cq = c.q || 0,
    t = G.mapT || 1,
    thr = ailThr(t) * MOB_HP,
    p = r.pre,
    mag = 1 + (ST.ailMag + (c.ailMag || 0)) / 100,
    attack = (c.D.tags || []).includes('attack'),
    rr = 1 - rarRed(m);
  /* 點燃：火焰傷害疊易燃（每 5% 門檻 +1% 機率），中了清零 */
  /* 火焰塑造者（0.2.26）：物理、冰冷、閃電也累積易燃（點燃的基礎跟著算這幾種）、點燃傷害提高；餘燼：點燃更多、持續時間 −25% */
  const igB = ST.shaper ? p.fire + p.phys + p.cold + p.light : p.fire;
  if (igB > 0) {
    a.flam = Math.min(100, (a.flamT > G.t ? a.flam || 0 : 0) + (igB / thr) * 20);
    a.flamT = G.t + 8;
    if (Math.random() * 100 < a.flam)
      (a.ign = keepMax(a.ign, igB * 0.2 * (mag + ST.shaper / 100) * (1 + ST.ember / 100), 4 * (ST.ember ? 0.75 : 1))),
        (a.flam = 0);
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
  /* 暈眩：僵直（輕暈）看「這一下÷最大生命」（低於 15% 不算）；重暈累積（冰冷不算，物理、近戰各 ×1.5） */
  const hit = p.phys + p.fire + p.light + p.chaos;
  if (!m.boss && hit / m.mhp >= 0.15 && Math.random() < hit / m.mhp) m.stun = Math.max(m.stun || 0, 0.5);
  /* 0.2.25：重暈累積提高（昇華小點）、震懾之錘（物理擊中每 1000 護甲 +10%）、鋼鐵循環（格擋值吸收的量） */
  /* 品質：脆弱、碎裂地面（震地）、劈砍打流血、破甲輔助打完全破甲 */
  const hsQ =
    (a.curse && a.curse.k === 'vuln' && a.curse.t > G.t ? 0.4 * (a.curse.q || 0) : 0) +
    (m.jagT > G.t ? 0.4 * m.jagQ : 0) +
    (c.k === 'cleave' && hasState(m, 'bleed') ? 0.4 * cq : 0) +
    (c.brkQ && a.broken > G.t ? 0.2 * c.brkQ : 0);
  const hsInc = (1 + (ST.hsP + (p.phys > 0 ? (ST.hsArm * ST.armor) / 1000 : 0)) / 100) * (1 + hsQ);
  a.hs =
    (a.hs || 0) +
    ((hit * (p.phys > 0 ? 1.5 : 1) * ((c.D.tags || []).includes('melee') ? 1.5 : 1) * (c.hsM || 1) * hsInc) / m.mhp) *
      100 *
      0.5;
  if (ST.steelCycle && P.bvAcc > 0) (a.hs += (P.bvAcc / m.mhp) * 100 * 0.5), (P.bvAcc = 0);
  if (a.hs >= 100) (a.hstun = G.t + (m.boss ? 1.2 : 3)), (a.hs = 0);
  /* 流血、中毒：要有機率；流血只有攻擊會造成，c.spellBleed 是例外（死亡紅花的爆炸） */
  if ((attack || c.spellBleed) && p.phys > 0 && Math.random() * 100 < ST.bleedCh + (c.bleedCh || 0))
    a.bleed = keepMax(a.bleed, p.phys * 0.15 * mag, 5);
  /* 附加火焰的品質：附加的火焰有機率直接點燃 */
  if (c.addIgn && p.fire > 0 && qRoll(c.addIgn)) a.ign = keepMax(a.ign, p.fire * 0.2 * mag, 4);
  if (p.phys + p.chaos > 0 && Math.random() * 100 < ST.poisonCh + (c.poisonCh || 0)) {
    const n = 1 + ST.poiStack + (c.poiStack || 0);
    a.poi = (a.poi || []).filter(x => x.t > G.t);
    a.poi.push({ dps: (p.phys + p.chaos) * 0.2 * mag, t: G.t + 2 });
    a.poi.sort((x, y) => y.dps - x.dps);
    a.poi.length = Math.min(a.poi.length, n);
    /* 劇毒的品質：疊滿時結算一部分剩餘毒傷 */
    if (c.poiBurst && n > 1 && a.poi.length >= n) {
      const v = a.poi.reduce((s, x) => s + x.dps * (x.t - G.t), 0) * c.poiBurst;
      (m.hp -= v), num(m.x, m.y - m.sz, v, 'chaos');
    }
  }
  /* 破甲：物理擊中扣護甲（普通 ×3、菁英 ×2），扣到 0＝完全破甲 12 秒 */
  /* 鐵砧之重（0.2.25）：任何擊中都依你護甲的 x% 破甲 */
  const brk =
    (p.phys > 0 && (ST.armBreak || c.armBreak || (c.k === 'ballista' && qRoll(20 * cq))) ? p.phys : 0) +
    (ST.armBreakArm * ST.armor) / 100;
  if (brk > 0 && !(a.broken > G.t)) {
    m.arm -= brk * (m.boss ? 1 : m.elite ? 2 : 3);
    a.abT = G.t + 12;
    if (m.arm <= 0) (m.arm = 0), (a.broken = G.t + 12);
  }
  /* 穿刺：存 30% 物理（只有矛） */
  if (attack && p.phys > 0 && ST.wt === 'spear' && Math.random() * 100 < ST.impaleCh + (c.impaleCh || 0))
    (a.imp = a.imp || []).length < 60 && a.imp.push(p.phys * 0.3);
  /* 特殊元素異常（PoE1）：k ×（傷害÷門檻）^0.4，4 秒 */
  const alt = (k, dmg, cap) => Math.min(cap, k * Math.pow(dmg / thr, 0.4) * 100 * mag);
  if (c.alt === 'scorch' && p.fire > 0) a.scorch = { v: alt(0.5, p.fire, 30), t: G.t + 4, q: c.altQ };
  if (c.alt === 'brittle' && p.cold > 0) a.brittle = { v: alt(10, p.cold, 600) / 100, t: G.t + 4, q: c.altQ };
  if (c.alt === 'sap' && p.light > 0) a.sap = { v: alt(1 / 3, p.light, 20), t: G.t + 4, q: c.altQ };
  /* 減益 */
  /* 曝露的品質：曝露中被任何擊中都可能刷新 */
  if (a.exp > G.t && qRoll(20 * (a.expQ || 0))) a.exp = G.t + 4;
  if (c.expose) (a.exp = G.t + 4), (a.expQ = c.expQ);
  if (c.blind) (a.blind = G.t + 4), (a.blindQ = c.blindQ);
  if (c.wither && p.chaos > 0)
    (a.wither = (a.wither || []).filter(x => x > G.t)).length < (c.witherMax || 10) && a.wither.push(G.t + 4);
  /* 異常強化的品質：記在怪身上，到期時看 ailTick */
  if (c.ailExt) a.extP = c.ailExt;
  if (c.hinder) a.hinder = G.t + 4;
  if (c.maim && attack) a.maim = G.t + 4;
  if (c.intim) a.intim = G.t + 4;
}
/* 怪物這一格：持續傷害、累積條消退；回傳 true＝不能行動（冰凍、電殛、重暈、輕暈） */
function ailTick(m, dt) {
  const a = m.ail || {};
  let d = 0;
  /* 異常強化的品質：到期時有機率延長 1 秒，每筆只判定一次 */
  if (a.extP)
    for (const x of [a.ign, a.bleed, a.chill, ...(a.poi || [])])
      if (x && x.t <= G.t && !x.ext) {
        x.ext = 1;
        if (qRoll(a.extP)) x.t = G.t + 1;
      }
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
  if (m.ail) mobStates(m);
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
function curseMob(m, k, lv, q = 0) {
  const v = curseV(k, lv) * (1 - rarRed(m));
  m.ail.curse = { k, v, t: G.t + 6 + 0.07 * lv, q };
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
  warlord: { n: '軍閥標記', d: '被擊中時你回 0.5% 生命；死亡時給耐力球' },
  falcon: { n: '獵鷹標記', d: '被擊中時傷害更多 10% 並消耗（昇華「風行神射」）' }
};
function markMob(m, k, q = 0) {
  for (const o of G.mobs) if (o.ail && o.ail.mark && o.ail.mark.k === k && o !== m && !ST.multiMark) o.ail.mark = null;
  m.ail.mark = { k, q };
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
/* 疾風化身（0.2.25）：順風滿 10 層（照 HUD 的顯示無條件進位；順風會慢慢消退） */
const windFull = () => !!ST.windWalk && Math.ceil(P.tail || 0) >= 10;
/* 聚風（0.2.25）：每層順風再 +2% 移動速度；疾風化身：滿 10 層 +10%；狂風：每顆狂怒球 +4% 移動速度；捨身突襲：2 秒內 +30% */
const buffMove = () =>
  (hasBuff('onslaught') ? 1.1 : 1) *
  (windFull() ? 1.1 : 1) *
  (1 + (0.01 + (ST.gale || 0) / 100) * (P.tail || 0)) *
  (1 + ((ST.frenzyMs || 0) * chgN('f')) / 100) *
  (ST.sacrifice && P.sacT > G.t ? 1.3 : 1);
/* 攻擊速度的暫時加成：狂風（每顆狂怒球 +4%） */
const atkBuf = () => 1 + ((ST.frenzyMs || 0) * chgN('f')) / 100;
/* 施放時移動（0.2.25 底層）：出手中照移動方向走，基礎移動速度的 35%（不吃移動速度加成）。
   位移技能（D.dist）自己控制位置，不走這裡 */
const CAST_MOVE = 0.35;
/* 聚風：用技能得 1 層順風、被擊中掉光 */
function galeUse() {
  if (ST.gale) P.tail = Math.min(10, (P.tail || 0) + 1);
}

/* ---------- 打中、擊殺時的觸發（hitMob／killMob 呼叫） ---------- */
function onHitBase(m, r, c) {
  const a = m.ail,
    melee = (c.D.tags || []).includes('melee');
  /* 狂怒：近戰擊中 +1（每 0.5 秒最多一次），最多 30；停止 4 秒後每 0.2 秒掉 1 */
  if (melee && ST.rageHit && !(P.rageCd > G.t))
    (P.rage = Math.min(30, (P.rage || 0) + ST.rageHit)), (P.rageCd = G.t + 0.5), (P.rageT = G.t);
  if (r.crit && ST.powOnCrit && Math.random() * 100 < ST.powOnCrit) gainChg('p');
  if (r.crit && qRoll(c.critChg)) gainChg('p');
  /* 電殛的品質：不能行動的怪被閃電擊中，跳一道電弧 */
  if (c.elcQ && a.elcT > G.t && r.pre.light > 0) zapNear(m, r.pre.light * 0.5 * c.elcQ, 1);
  if (r.spell && (c.arcane || Math.random() * 100 < ST.arcaneHit)) gainBuff('arcane', 10);
  if (ST.tailwind && r.crit) P.tail = Math.min(10, (P.tail || 0) + 1);
  /* 致命陰影：暴擊時熵值累積，滿 100 給暴擊球；弱點獵殺：攻擊擊中給 1 層暴擊弱點 */
  if (r.crit && ST.powCritE && entropy('pow', ST.powCritE)) gainChg('p');
  if (ST.cwHit && (c.D.tags || []).includes('attack')) addCw(m, ST.cwHit);
  /* 標記 */
  const mk = a.mark;
  if (!mk) return;
  if (mk.k === 'falcon') {
    a.mark = null;
    if (ST.bullseye) addCw(m, ST.bullseye);
    if (entropy('falcon', 20)) gainChg('f');
  } else if (mk.k === 'sniper' && r.crit) {
    (m.hp -= r.d * 0.5), gainChg('f'), (a.mark = null);
    const o = qRoll(20 * (mk.q || 0)) && nearMob(m, 300, x => !x.ail.mark);
    if (o) markMob(o, 'sniper', mk.q);
  } else if (mk.k === 'poacher') P.mp = Math.min(ST.mp, P.mp + ST.mp * 0.01);
  else if (mk.k === 'warlord') P.hp = Math.min(ST.hp, P.hp + ST.hp * 0.005);
  else if (mk.k === 'freeze' && a.frozen > G.t) {
    gainBuff('frostMark', 6), (a.mark = null);
    if (mk.q) chillNear(m, 150 * mk.q, 2);
  } else if (mk.k === 'volt' && a.elcT > G.t) {
    gainBuff('voltMark', 6), (a.mark = null);
    if (mk.q) zapNear(m, r.d * 0.5, Math.round(3 * mk.q));
  } else if (mk.k === 'hound' && a.hstun > G.t) markBoom(m);
}
function markBoom(m) {
  const q = (m.ail.mark && m.ail.mark.q) || 0;
  m.ail.mark = null;
  fx({ k: 'ring', x: m.x, y: m.y, r: 120, dur: 0.3, col: '#ff6b6b' });
  for (const o of G.mobs)
    if (o.hp > 0 && o !== m && dist(o, m) < 120 + o.r) {
      (o.hp -= m.mhp * 0.1), num(o.x, o.y - o.sz, m.mhp * 0.1, 'phys');
      if (qRoll(40 * q)) o.ail.bleed = keepMax(o.ail.bleed, m.mhp * 0.015, 5);
    }
}
function onKillBase(m) {
  const mk = m.ail && m.ail.mark;
  if (mk) {
    const mq = 20 * (mk.q || 0);
    if (mk.k === 'assassin') gainChg('p', qRoll(mq) ? 2 : 1);
    else if (mk.k === 'poacher') {
      gainChg('f'), (P.hp = Math.min(ST.hp, P.hp + ST.hp * 0.05));
      if (qRoll(mq)) P.mflask = Math.min(FLASK.n, P.mflask + 1);
    } else if (mk.k === 'warlord') {
      gainChg('e');
      if (mk.q) for (const o of G.mobs) if (o.hp > 0 && o.ail && dist(o, m) < 200 * mk.q) o.ail.intim = G.t + 3;
    } else if (mk.k === 'hound') markBoom(m);
  }
  if (ST.onsKill && Math.random() * 100 < ST.onsKill) gainBuff('onslaught', 4);
  if (ST.unholyKill && Math.random() * 100 < ST.unholyKill) gainBuff('unholy', 4);
  addCorpse(m);
  qualKill(m);
  /* 焚城（0.2.26）：被點燃的死掉時點燃傳給 200 內的怪；業火吞噬：地獄火 −10% */
  const ig = m.ail && m.ail.ign && m.ail.ign.t > G.t ? m.ail.ign : null;
  if (ig && ST.igSpread)
    for (const o of G.mobs)
      if (o !== m && o.hp > 0 && o.ail && dist(o, m) < 200) o.ail.ign = keepMax(o.ail.ign, ig.dps, ig.t - G.t);
  if (ig && ST.devour && P.hf) P.hf = Math.max(0, P.hf - (ST.hfMax * ST.devour) / 100);
  /* 元素殘留物：點燃、冰緩（冰凍）、感電中的怪死掉留下（撿起來得到灌注） */
  const a = m.ail || {};
  if (a.ign && a.ign.t > G.t) dropRemnant('fire', m.x, m.y);
  if ((a.chill && a.chill.t > G.t) || a.frozen > G.t) dropRemnant('cold', m.x, m.y);
  if (a.shock > G.t) dropRemnant('light', m.x, m.y);
  gainGlory(m.boss ? 40 : m.elite ? 15 : 3);
  metaEvent('kill');
  chargeCharms(m);
}
/* 品質的擊殺效果（0.2.29）：詛咒、威嚇、異常留下來的效果、毒刃雨、冷卻縮減 */
function qualKill(m) {
  P.killT = G.t + 3;
  const a = m.ail || {},
    cu = a.curse && a.curse.t > G.t ? a.curse : null,
    q = cu ? 20 * (cu.q || 0) : 0;
  if (cu && cu.k === 'eleweak' && qRoll(q)) dropRemnant(pick(['fire', 'cold', 'light']), m.x, m.y);
  if (cu && cu.k === 'tchains' && qRoll(q)) {
    const o = nearMob(m, 200, x => !hasState(x, 'curse'));
    if (o) o.ail.curse = { ...cu };
  }
  if (cu && cu.k === 'despair' && a.wither && qRoll(q)) {
    const o = nearMob(m, 150);
    if (o) o.ail.wither = [...(o.ail.wither || []), ...a.wither.filter(t => t > G.t)].slice(-18);
  }
  if (a.intim > G.t && qRoll(20 * (a.intimQ || 0))) (P.rage = Math.min(30, (P.rage || 0) + 1)), (P.rageT = G.t);
  if (a.scorch && a.scorch.t > G.t && qRoll(20 * (a.scorch.q || 0))) dropRemnant('fire', m.x, m.y);
  if (a.brittle && a.brittle.t > G.t && a.brittle.q) chillNear(m, 120 * a.brittle.q, 2);
  for (const p of G.pools) if (p.c.q && Math.hypot(m.x - p.x, m.y - p.y) < p.r + m.r) p.dur += 0.25 * p.c.q;
  for (let i = 0; i < NSLOT; i++) {
    const g = S.skills[i] && S.skills[i].a,
      sp = g && g.sup.find(x => x && x.gem === 'cdr' && x.q && supOK(SKILLS[g.gem], x, g));
    if (sp) P.cds['s' + i] = Math.max(0, (P.cds['s' + i] || 0) - (0.2 * sp.q) / GEM_Q_MAX);
  }
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
    if (P.hp <= 0) {
      /* 死因：持續傷害裡最先算到的那一種 */
      const n =
        a.ign && a.ign.t > G.t
          ? '點燃'
          : a.bleed && a.bleed.t > G.t
            ? '流血'
            : a.poi && a.poi.t > G.t
              ? '中毒'
              : '持續傷害';
      P.lastHit = { n, el: '', d: 0 };
      die();
    }
  }
  bvTick(dt);
  hfTick(dt);
  falconTick();
  /* 吸血：1 秒內回完 */
  if (P.lch && P.lch.t > G.t) P.hp = Math.min(ST.hp, P.hp + P.lch.rate * dt);
  tickCharms(dt);
}

/* ---------- 玩家受傷（hurtPlayer 呼叫）：回傳 { d, ev, block, crit }，d 是扣完防禦的傷害 ---------- */
/* 抗性：扣完懲罰、上限是最大抗性（藏身處不扣） */
const effRes = k => {
  if (k === 'chaos' && ST.ci) return 100;
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
      hitCh = hitChance(acc, ST.ev * (1 + ((ST.gale || 0) * (P.tail || 0)) / 100));
    if (P.evE == null) P.evE = Math.random() * 100;
    P.evE += hitCh * 100;
    if (P.evE < 100) {
      /* 致盲的品質：致盲中的怪打不中你，回魔 */
      if (m && m.ail.blind > G.t && m.ail.blindQ) addMp(ST.mp * 0.01 * m.ail.blindQ);
      return { ev: 1 };
    }
    P.evE -= 100;
  }
  if (!noEv && Math.random() * 100 < ST.block) return { block: 1 };
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
    arm =
      ST.armor *
      (cu && cu.k === 'vuln' ? 1 - cu.v / 100 : 1) *
      ((formOf() && formOf().armorM) || 1) *
      (still() ? 1 + 0.08 * (ST.aq.iron || 0) : 1);
  /* 承受轉換（0.2.26，熔岩之膚）：承受的物理有 x% 當作火焰承受（在減傷之前分出來，吃火焰抗性） */
  let asFire = 0;
  if (el === 'phys' && ST.physAsFire) (asFire = (d * ST.physAsFire) / 100), (d -= asFire);
  if (el === 'phys') d *= 1 - Math.min(0.9, arm / (arm + 10 * d + 1));
  if (asFire) d += asFire * (1 - resHit('fire') / 100);
  else if (el !== 'phys') d *= 1 - resHit(el) / 100;
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
  /* 品質：殘喘的怪打中你回魔；被衰弱的怪打中得到守護（上限最大生命 50%） */
  if (m) {
    const sp = m.ail.sap,
      en = m.ail.curse;
    if (sp && sp.q && sp.t > G.t) addMp(ST.mp * 0.01 * sp.q);
    if (en && en.k === 'enfeeble' && en.q && en.t > G.t)
      P.guardV = Math.min(ST.hp * 0.5, (P.guardV || 0) + d * 0.2 * en.q);
  }
  /* 格擋值（0.2.25）在守護之前 */
  d = bvAbsorb(d);
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
  /* 純淨的品質：元素異常有機率免疫 */
  if (el !== 'phys' && el !== 'chaos' && qRoll(20 * (ST.aq.purity || 0))) return;
  if (el === 'fire' && !imm('ign') && Math.random() < Math.min(1, (d / thr) * 0.2)) a.ign = keepMax(a.ign, d * 0.2, 4);
  if (el === 'cold' && !imm('chill')) {
    const v = Math.min(50, (d / thr) * 100);
    if (v >= 30) a.chill = { v, t: G.t + 2 };
  }
  if (el === 'light' && !imm('shock') && Math.random() * 100 < ((d / thr) * 100) / 4) a.shock = G.t + 4;
  /* 冰凍累積：滿了凍住 1.5 秒（玩家的比怪物短，不然太難受） */
  if (el === 'cold' && !imm('frz') && !ST.stand) {
    a.frz = (a.frz || 0) + (d / thr) * 50;
    if (a.frz >= 100) (a.frozen = G.t + 1.5), (a.frz = 0);
  }
  if (!imm('bleed') && !ST.ci && Math.random() < (ail === 'bleed' ? 0.25 : 0) + MM('mbleed') / 100)
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
/* 狀態圖示（0.2.30）：玩家的狀態列（技能列上方，圖示＋剩餘秒數）與怪物頭上（只有圖示）共用；[名字, 圖示, 說明] */
const STATE = {
  ign: ['點燃', 'sup_sp_gfire', '每秒受到火焰傷害'],
  bleed: ['流血', 'sup_sp_bleed', '每秒受到物理傷害，移動時加倍'],
  poison: ['中毒', 'sup_sp_poison', '每秒受到混沌傷害'],
  chill: ['冰緩', 'sk_frostarrow', '移動與出手變慢'],
  frozen: ['冰凍', 'sk_frostnova', '不能行動'],
  shock: ['感電', 'sk_arc', '受到的傷害提高'],
  elc: ['電殛', 'sup_sp_stun', '不能行動'],
  stun: ['暈眩', 'sup_sp_stun', '不能行動'],
  stagger: ['僵直', 'sup_sp_stun', '被一擊打中最大生命 15% 以上，不能行動 0.5 秒'],
  wither: ['凋零', 'sup_sp_wither', '受到的混沌傷害提高'],
  blind: ['致盲', 'sup_sp_ailx', '命中值降低'],
  broken: ['完全破甲', 'sup_sp_pen', '護甲歸零，受到的物理傷害提高'],
  parried: ['失衡', 'sup_sp_heavy', '受到的攻擊傷害提高'],
  intim: ['威嚇', 'sk_anger', '受到的傷害提高、造成的傷害降低'],
  mark: ['標記', 'sk_markshot', '被標記的怪觸發時給你效果'],
  scorch: ['焦灼', 'sup_sp_gfire', '元素抗性降低'],
  brittle: ['易碎', 'sk_frostarrow', '被擊中時暴擊率提高'],
  sap: ['殘喘', 'sk_arc', '造成的傷害降低'],
  exp: ['曝露', 'sk_elemweak', '元素抗性降低'],
  rage: ['狂怒', 'sk_anger', '攻擊傷害更多'],
  tail: ['順風', 'sk_hasteaura', '移動速度提高'],
  chg_e: ['耐力球', 'sup_sp_heavy', '球體資源'],
  chg_f: ['狂怒球', 'sk_anger', '球體資源'],
  chg_p: ['暴擊球', 'sk_precise', '球體資源'],
  onslaught: ['猛攻', 'sk_hasteaura', BUFF.onslaught.d],
  arcane: ['秘術增強', 'sk_clarity', BUFF.arcane.d],
  unholy: ['邪力', 'sk_despair', BUFF.unholy.d],
  archon: ['元素化身', 'sk_elemweak', BUFF.archon.d],
  phasing: ['相位', 'sk_hasteaura', BUFF.phasing.d],
  frostMark: ['附加冰冷', 'sk_frostarrow', '冰凍標記給的效果'],
  voltMark: ['附加閃電', 'sk_arc', '電壓標記給的效果'],
  sac: ['捨身突襲', 'sk_hasteaura', '移動速度更快']
};
const curseIc = k => SKILLS['cu_' + k].ic;
/* 怪物身上有哪些狀態（畫面用，回傳圖示名） */
/* 剩餘時間比例 0～1（扇形倒數用）：第一次看到或被刷新時記下總時長；玩家（P）、怪物（m）共用 */
function stFrac(o, k, until) {
  const r = until - G.t,
    s = (o.sd = o.sd || {}),
    x = s[k];
  if (!x || until > x.u + 0.05) s[k] = { u: until, d: r };
  else x.u = until;
  return Math.max(0, Math.min(1, r / s[k].d));
}
/* 回傳 [{ k, ic 圖示, f 剩餘比例, c 層數 }]；ailTick 每格也會呼叫一次，讓總時長記得準 */
function mobStates(m) {
  const a = m.ail;
  if (!a) return [];
  const o = [],
    add = (k, until, c, ic) => o.push({ k, ic: ic || STATE[k][1], f: until == null ? 1 : stFrac(m, k, until), c });
  const mx = l => Math.max(...l);
  if (a.ign && a.ign.t > G.t) add('ign', a.ign.t);
  if (a.bleed && a.bleed.t > G.t) add('bleed', a.bleed.t);
  const pl = a.poi ? a.poi.filter(x => x.t > G.t) : [];
  if (pl.length) add('poison', mx(pl.map(x => x.t)), pl.length);
  if (a.chill && a.chill.t > G.t) add('chill', a.chill.t);
  if (a.frozen > G.t) add('frozen', a.frozen);
  if (a.shock > G.t) add('shock', a.shock);
  if (a.elcT > G.t) add('elc', a.elcT);
  if (a.hstun > G.t) add('stun', a.hstun);
  if (m.stun > 0) add('stagger', G.t + m.stun);
  if (a.curse && a.curse.t > G.t) add('c' + a.curse.k, a.curse.t, 0, curseIc(a.curse.k));
  if (a.mark) add('mark');
  const wl = a.wither ? a.wither.filter(t => t > G.t) : [];
  if (wl.length) add('wither', mx(wl), wl.length);
  if (a.broken > G.t) add('broken', a.broken);
  if (a.blind > G.t) add('blind', a.blind);
  if (a.parried > G.t) add('parried', a.parried);
  if (a.intim > G.t) add('intim', a.intim);
  if (a.scorch && a.scorch.t > G.t) add('scorch', a.scorch.t);
  if (a.brittle && a.brittle.t > G.t) add('brittle', a.brittle.t);
  if (a.sap && a.sap.t > G.t) add('sap', a.sap.t);
  if (a.exp > G.t) add('exp', a.exp);
  return o.filter((x, i) => o.findIndex(y => y.ic === x.ic) === i);
}
/* 玩家身上的狀態：{ k, n, ic, d, t 剩餘秒數（沒有時間的是 null）, c 層數, bad 負面 } */
function playerStates() {
  const a = P.ail || {},
    L = [],
    add = (k, until, o = {}) => {
      /* null＝沒有時間（層數）；其他要有效才顯示 */
      if (until !== null && !(until > G.t)) return;
      const [n, ic, d] = STATE[k];
      L.push({ k, n, ic, d, t: until == null ? null : until - G.t, f: until == null ? 1 : stFrac(P, k, until), ...o });
    };
  const bad = { bad: 1 };
  add('ign', a.ign && a.ign.t, bad);
  add('bleed', a.bleed && a.bleed.t, bad);
  add('poison', a.poi && a.poi.t, bad);
  add('chill', a.chill && a.chill.t, bad);
  add('frozen', a.frozen, bad);
  add('shock', a.shock, bad);
  if (a.curse && a.curse.t > G.t) {
    const C = CURSES[a.curse.k];
    L.push({
      k: 'c',
      n: C.n,
      ic: curseIc(a.curse.k),
      d: C.d.replace('{}', Math.round(a.curse.v)),
      t: a.curse.t - G.t,
      f: stFrac(P, 'curse', a.curse.t),
      bad: 1
    });
  }
  for (const k of Object.keys(BUFF)) if (STATE[k]) add(k, P.buf && P.buf[k]);
  for (const k of ['frostMark', 'voltMark']) add(k, P.buf && P.buf[k]);
  for (const k of ['e', 'f', 'p']) if (chgN(k)) add('chg_' + k, P.chg[k].t, { c: chgN(k) });
  if (P.rage) add('rage', null, { c: Math.floor(P.rage) });
  if (P.tail) add('tail', null, { c: Math.ceil(P.tail) });
  if (ST.sacrifice) add('sac', P.sacT);
  return L;
}
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
