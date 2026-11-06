/* dungeonPOE · 底層（0.2.7，照 PoE2；規則與數字在 docs/企劃書.md 7.2）：
   怪物等級與抗性懲罰、怪物防禦、擊中傷害五步 hitCalc、異常（雙向）、持續傷害、能量球、buff、詛咒、印記、曝曬、護符、玩家受傷 hurtCalc。
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
/* 0.2.22：天賦回到 PoE2 的量級（全押傷害約 +900%），怪物與王的生命 ×2（護甲不跟著變；異常門檻、穩固值 0.2.35 起跟著乘） */
const MOB_HP = 2;

/* ---------- 異常門檻：同等級普通怪的基礎生命（只看等級，不吃稀有度；穩固值才吃，見下面） ---------- */
const ailThr = t => 30 * tierMul(t).hp;
/* 門檻倍率：折射箭矢本身中異常的機率提高 30%；被衝擊波打過的怪，那個元素的門檻降低 30%（暫定） */
const ailLow = (m, el) => (m.arrow ? 1 / 1.3 : m.ail.thrLow && m.ail.thrLow[el] > G.t ? 0.7 : 1);
/* 穩固值（0.2.36，企劃書 7.2）：冰凍、觸電、沉重暈眩、釘身（0.2.42）共用。每階比例是 Path of Building 兩張表相除（T1～T16） */
const POISE_T = [1.97, 2.03, 2.01, 1.96, 1.89, 1.82, 1.66, 1.46, 1.31, 1.26, 1.23, 1.19, 2.83, 3.02, 3.19, 3.35];
/* k 累積係數、on 定身到期的欄位、sec 定身秒數、back 定身結束後 +500% 退回的秒數 */
const POISE = {
  frz: { k: 2.1, on: 'frozen', sec: 4, back: 14, el: 'cold' },
  elc: { k: 1.7, on: 'elcT', sec: 5, back: 15, el: 'light' },
  hs: { k: 0.58, on: 'hstun', sec: 2, back: 16.5 },
  /* 釘身（0.2.42）：只有 c.pin 的技能、輔助會累積；不能移動、不能被擊退、還能出招（不在 ailTick 的「不能行動」裡） */
  pin: { k: 4.2, on: 'pinT', sec: 3, back: 15 }
};
function poise(m, k) {
  const t = G.mapT || 1,
    left = ((m.ail.psT && m.ail.psT[k]) || 0) - G.t,
    /* 刻意偏離 PoE2：生命地圖詞也提高穩固值，不然定身會跟著生命詞變強 */
    hpW = (1 + MM('mhp') / 100) * (1 + (m.boss ? MM('bhp') : 0) / 100);
  return (
    ailThr(t) *
    MOB_HP *
    POISE_T[t - 1] *
    (m.boss ? 18.78 : m.elite ? 3 : 1) *
    hpW *
    (POISE[k].el ? ailLow(m, POISE[k].el) : 1) *
    (1 + 5 * Math.max(0, Math.min(1, left / POISE[k].back)))
  );
}
/* 禁錮（0.2.42，照 PoE2）＝不能移動的總稱：冰凍、觸電、沉重暈眩、釘身、石化（第 10 批）；本身不加傷害，「對禁錮的敵人傷害提高」才吃 */
const immob = a => a.frozen > G.t || a.elcT > G.t || a.hstun > G.t || a.pinT > G.t || a.petr > G.t;
/* 定身：不管是累滿還是粉碎重擊、撞牆，之後穩固值都 +500%，從定身結束開始退回 */
function poisePin(m, k) {
  const q = POISE[k],
    a = m.ail;
  a[q.on] = G.t + q.sec;
  (a.psT = a.psT || {})[k] = G.t + q.sec + q.back;
  a[k] = 0;
  /* 釘身觸發時僵直一次（王不吃僵直） */
  if (k === 'pin' && !m.boss) m.stun = Math.max(m.stun || 0, 0.5);
}
/* 累積：定身期間四條都暫停；inc＝累積提高 % */
function poiseAdd(m, k, dmg, inc = 0) {
  const a = m.ail;
  if (!(dmg > 0) || immob(a)) return;
  /* 目眩（0.2.42）：受到的沉重暈眩累積 +50% */
  const daze = k === 'hs' && a.daze > G.t ? 1.5 : 1;
  /* 濕透（第 10 批）：冰凍累積 25% 更多 */
  const wet = k === 'frz' && a.wet > G.t ? 1 + DEBUFF.wetFrz / 100 : 1;
  a[k] = (a[k] || 0) + (dmg * POISE[k].k * (1 + inc / 100) * daze * wet * 100) / poise(m, k);
  (a.psA = a.psA || {})[k] = G.t;
  if (a[k] >= 100) poisePin(m, k);
}
/* 稀有度對減益的抵抗（冰緩、詛咒、曝曬）：菁英當稀有 30%、王當傳奇 50% */
const rarRed = m => (m.boss ? 0.5 : m.elite ? 0.3 : 0);
const ELEK = ['fire', 'cold', 'light'];

/* ---------- 第 10 批：異常與減益（企劃書 7.2、7.3）。數字照 poe2db；⚠️＝查不到的暫定值，全部集中在這裡 ---------- */
const DEBUFF = {
  parryT: 2 /* 受招架秒數 */,
  parryMore: 50 /* 受招架：攻擊傷害更多 % */,
  shatterR: 4 /* ⚠️ 格擋值碎開的衝擊範圍（公尺） */,
  crushPts: 15 /* 壓碎：物理減傷扣的百分點 */,
  crushT: 4 /* ⚠️ */,
  shatterMore: 20 /* 破碎護甲：物理再受到 +20%（跟完全破甲相加） */,
  rivenPct: 5,
  rivenT: 5,
  unbrPct: 10,
  unbrT: 60,
  unbrHits: 10,
  cripT: 12,
  stainNeed: 6 /* 血漬：流血累積 6 秒 */,
  stainT: 8 /* ⚠️ 血漬減益持續秒數 */,
  inciseCh: 10 /* 切割：每層流血機率 +10% */,
  inciseMax: 10,
  inciseMore: 3 /* 近期每消耗 1 層，流血幅度 3% 更多 */,
  inciseCap: 30,
  cbT: 5 /* 腐化之血 */,
  cbMax: 10,
  anemiaT: 8 /* ⚠️ 缺血持續秒數 */,
  petrifyT: 3 /* ⚠️ 王減半 */,
  weakT: 1,
  weakMove: 20,
  weakDmg: 10,
  tauntT: 3,
  tauntLess: 10,
  wetT: 2,
  wetShock: 50 /* 濕透：感電機率更多 % */,
  wetFrz: 25 /* 冰凍累積更多 % */,
  easyT: 4 /* ⚠️ */,
  suppMax: 100,
  suppCut: 50,
  overSlow: 10,
  overT: 4,
  overMax: 5 /* ⚠️ */,
  vineSlow: 8,
  vineMax: 5,
  vineLose: 1 /* ⚠️ 每移動 1 秒移除 1 層 */,
  /* 第 11 批：地面（企劃書 7.3，種類在 mech.js 的 GROUND） */
  consHeal: 5 /* 奉獻地面：每秒回最大生命 % */,
  consBoss: 1 /* ⚠️ 王每秒只回 1%：5% 比各配裝的打王 DPS 都高，站上去就打不死 */,
  consCurse: 50 /* 奉獻地面：身上詛咒效果 −50% */,
  blindT: 4 /* 致盲秒數 */,
  shockGT: 6 /* 感電地面：感電秒數 */,
  flamRate: 25 /* ⚠️ 點燃地面每秒累積的易燃（2 秒點燃，被油纏身 0.67 秒） */,
  flamAt: 50 /* 點燃地面：易燃到 50% 點燃 */,
  oilT: 2 /* ⚠️ 離開油滑地面後被油纏身還留幾秒 */,
  oilSlow: 30 /* ⚠️ 被油纏身的移動速度 −%（沿用舊的油） */,
  oilExp: 20 /* ⚠️ 火焰曝曬（同曝曬） */,
  oilFlam: 3 /* 被施加的易燃 200% 更多 */,
  howlT: 1 /* 怒號地面的效果留幾秒 */,
  howlEv: 30,
  howlDmg: 40,
  gndCh: 25 /* 地圖詞：怪物死亡留下地面的機率 % */,
  gndMax: 10 /* ⚠️ 怪物方地面同時存在的上限（效能） */
};
/* 技能欄位的值：true＝用預設秒數，數字＝施加者給的秒數 */
const dbT = (v, def) => (v === true ? def : v);
/* 受招架（0.2.43 第 10 批，原「失衡」）：受到的攻擊傷害更多、無法閃避攻擊；幅度與持續時間對所有來源一致（長矛招架、碎開衝擊、品質擴散） */
const parryOn = m => !!(m && m.ail && m.ail.parried > G.t);
const parryMore = () => 1 + (DEBUFF.parryMore * (1 + ST.parryMag / 100)) / 100;
function applyParry(m) {
  if (m && m.ail) m.ail.parried = G.t + DEBUFF.parryT * (1 + ST.parryDur / 100);
}
/* 不受影響（第 10 批）：ST.unaff = { chill: 1 } 之類，減益仍掛著、仍顯示，只是不發揮效果 */
const unaff = k => !!(ST.unaff && ST.unaff[k]);

/* ---------- 命中（0.2.22，照 PoE2）：命中率 = 1.25 × 命中 ÷（命中 ＋ 0.3 × 閃避），5%～100%；用熵值不擲骰 ---------- */
const hitChance = (acc, ev) => Math.max(0.05, Math.min(1, (1.25 * acc) / (acc + 0.3 * ev)));
/* 怪物閃避：同等級、沒投資命中（基礎 30＋每級 6）時，普通怪約 85%、菁英 80%、王 75% */
const mobEv = (lv, m) => 6 * lv * (m && m.boss ? 2.22 : m && m.elite ? 1.9 : 1.57);
/* 玩家的攻擊打不打得中：法術、召喚物、場上單位、持續傷害一律命中；基石「堅定技巧」必中 */
function hitRoll(m, c, o = {}) {
  if (ST.noMiss || o.minion || o.unit || isSpell(c.D) || !m.ev) return true;
  /* 受招架的敵人無法閃避攻擊；沉重暈眩的敵人無法閃避你的擊中（開關 hstunNoEv，易攻目標天賦版） */
  if (parryOn(m) || (ST.hstunNoEv && m.ail && m.ail.hstun > G.t)) return true;
  const ch = hitChance(
    ST.acc * (P.ail && P.ail.blind > G.t ? 0.8 : 1),
    m.ev * (m.ail && m.ail.howl > G.t ? 1 + DEBUFF.howlEv / 100 : 1)
  );
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
  m.ev0 = m.ev = mobEv(mobLv(t), m);
  m.spdM = 1 + MM('mspd') / 100;
  m.ail = {};
  /* 堅韌（0.2.42）：受到的傷害 ÷ (1 + 堅韌/100)；怪物、王的基礎值都是 0，只有地圖詞（mtough）給 */
  m.tough = 0;
}

/* 移動中＝0.3 秒內有移動（翻滾也算）；靜止＝連續站著 1 秒以上（game.js 的 updPlayer 記 movT／stillT） */
/* 品質（0.2.29）的小工具：機率（0～100）、加魔力、最近的怪、範圍冰緩、拉怪、閃電跳躍 */
/* 真隨機（0.2.42 第 6 批，設計原則第 4 節）：進攻端的機率靠次數平均；閃避才用熵值。
   幸運（luck > 0）擲兩次取好的、不幸（luck < 0 或 bad > 0）取壞的，兩者都有就抵消；上限由呼叫端套在幸運之後（capLuck） */
function roll(p, luck = 0, bad = 0) {
  const r = () => Math.random() * 100 < p,
    up = luck > 0,
    down = luck < 0 || bad > 0;
  return up === down ? r() : up ? r() || r() : r() && r();
}
/* 有效機率（%）：幸運 1 −（1 − p）²、不幸 p²；p 先夾在 0～100 */
function effCh(p, luck = 0, bad = 0) {
  p = Math.max(0, Math.min(100, p)) / 100;
  const up = luck > 0,
    down = luck < 0 || bad > 0;
  return 100 * (up === down ? p : up ? 1 - (1 - p) ** 2 : p * p);
}
const capLuck = (p, cap, luck = 0, bad = 0) => Math.min(cap, effCh(p, luck, bad));
const qRoll = p => p > 0 && roll(p);
/* 偏斜（0.2.42）：機率 % = 150 ×（1 − 命中值 ÷（命中值 + 偏斜值 × 0.12）），上限 95（套在幸運之後）；被擊中、閃避沒躲掉才判定 */
const deflCh = (acc, defl) => (defl > 0 ? 150 * (1 - acc / (acc + defl * 0.12)) : 0);
/* 荊棘（0.2.42）：獨立傷害類別，不算攻擊、不算法術，只吃荊棘傷害提高，吃怪物的護甲（物理）；r 是擲範圍的函式 */
const thornCut = (m, v) => v * (1 - Math.min(0.9, m.arm / (m.arm + 10 * v + 1)));
function thornDmg(m, r = rnd) {
  const [lo, hi] = ST.thornAdd,
    v = hi ? r(lo, hi) * (1 + ST.thornP / 100) : 0;
  return thornCut(m, v);
}
/* 撲殺門檻（生命比例）、屠戮打擊上限（%）：普通／菁英／王 */
const cullAt = m => (m.boss ? 0.05 : m.elite ? 0.1 : 0.35);
const fullCap = m => (m.boss ? 5 : m.elite ? 15 : 30);
/* 屠戮打擊要先移除的生命（只對滿血）；撲殺（擊中後還活著、低於門檻） */
const fullCut = m => (ST.fullStrike && m.hp >= m.mhp ? (m.mhp * Math.min(ST.fullStrike, fullCap(m))) / 100 : 0);
const culled = m => !!ST.cull && m.hp > 0 && m.hp < m.mhp * cullAt(m);
const addMp = v => (P.mp = Math.min(ST.mp, P.mp + v));
/* 盛怒上限（基礎 30，加上 rageMax）；每點盛怒讓攻擊傷害更多 1% ×（1 + rageEff%） */
const rageCap = () => 30 + ST.rageMax;
/* 偷取（0.2.42 第 5 批）：生命、魔力、能量護盾、盛怒（第 8 批）各自同時一筆（取回得最快的），1 秒回完，補滿清掉；
   who 預設是玩家，友方偷取（第 8 批）傳友方自己 */
function leechAdd(res, rate, who = P) {
  const L = (who.leech = who.leech || {}),
    o = L[res];
  if (rate > 0 && (!o || o.t <= G.t || rate > o.rate)) L[res] = { rate, t: G.t + 1 };
}
function leechTick(
  dt,
  who = P,
  caps = [
    ['hp', ST.hp],
    ['mp', ST.mp],
    ['es', ST.es],
    ['rage', rageCap()]
  ]
) {
  const L = who.leech;
  if (!L) return;
  for (const [r, mx] of caps) {
    const o = L[r];
    if (!o) continue;
    if (o.t <= G.t || (who[r] || 0) >= mx) delete L[r];
    else {
      who[r] = Math.min(mx, (who[r] || 0) + o.rate * dt);
      /* 回復盛怒像擊中得盛怒一樣重設消退計時 */
      if (r === 'rage') who.rageT = G.t;
    }
  }
}
/* 生命充能（第 8 批）：失去生命後等 4 秒，每秒回復最大生命 x%；再失去生命重設延遲（lifeLost 在失血處標記） */
const lifeLost = () => (P.lifeLost = G.t);
function lifeRecTick(dt) {
  if (ST.lifeRec > 0 && P.hp > 0 && P.hp < ST.hp && G.t - (P.lifeLost == null ? -9 : P.lifeLost) > 4)
    P.hp = Math.min(ST.hp, P.hp + (ST.hp * ST.lifeRec * dt) / 100);
}
/* 能量護盾保護魔力（基石）：魔力費用先扣能量護盾；可用資源＝護盾＋魔力 */
const mpAvail = () => P.mp + (ST.esMana ? P.es || 0 : 0);
function payMp(v) {
  if (ST.esMana) {
    const e = Math.min(P.es || 0, v);
    (P.es -= e), (v -= e);
  }
  P.mp -= v;
}
/* 補償：受到擊中傷害後 8 秒內平均回復（多筆各自計時；只算擊中，hurtPlayer 呼叫） */
function recoupAdd(d) {
  const R = (P.recoup = P.recoup || []);
  if (ST.recoupHp > 0) R.push({ r: 'hp', rate: (d * ST.recoupHp) / 800, t: G.t + 8 });
  if (ST.recoupMp > 0) R.push({ r: 'mp', rate: (d * ST.recoupMp) / 800, t: G.t + 8 });
}
function recoupTick(dt) {
  const R = P.recoup;
  if (!R || !R.length) return;
  for (const o of R) P[o.r] = Math.min(o.r === 'hp' ? ST.hp : ST.mp, P[o.r] + o.rate * Math.min(dt, o.t - (G.t - dt)));
  P.recoup = R.filter(o => o.t > G.t);
}
/* 生命損失：不算傷害（不經能量護盾、護甲、抗性，不觸發被擊中），會致死 */
function loseLife(v, why = '生命損失') {
  if (G.state !== 'play' || !(v > 0)) return;
  P.hp -= v;
  lifeLost();
  P.lastHit = { n: why, el: '', d: 0 };
  num(P.x, P.y - 60, v, 'hurt');
  if (P.hp <= 0) die();
}
/* 獻祭：資源不夠回 false、不扣；獻祭生命不會降到 1 以下 */
function sacrifice(res, v) {
  if (res === 'hp' ? P.hp <= v + 1 : P[res] < v) return false;
  P[res] -= v;
  if (res === 'hp') lifeLost();
  return true;
}
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
/* ---------- 條件（0.2.42 第 7 批，名詞在 TERMS）：近期、被包圍、孤立、近距離、存在範圍（距離單位 METER） ---------- */
const RECENT = 4;
/* 記下事件發生的時間：'kill' 擊殺、'hit' 你擊中、'crit' 你暴擊、'hurt' 你被擊中（P 每個場景重建，G.t 也重來） */
const evMark = e => ((P.ev = P.ev || {})[e] = G.t);
const recent = e => {
  const d = P.ev ? G.t - P.ev[e] : NaN;
  return d >= 0 && d <= RECENT;
};
const foes = () => G.mobs.filter(o => o.hp > 0 && !o.arrow);
const surrounded = () => foes().filter(o => Math.hypot(o.x - P.x, o.y - P.y) <= 3 * METER).length >= 5;
const isolated = m => !foes().some(o => o !== m && Math.hypot(o.x - m.x, o.y - m.y) <= 6 * METER);
const closeRange = m => Math.hypot(m.x - P.x, m.y - P.y) <= 2 * METER;
const presence = (x, y) => Math.hypot(x - P.x, y - P.y) <= 4 * METER;
const moving = () => P.movT != null && G.t - P.movT < 0.3;
const still = () => !moving() && P.stillT != null && G.t - P.stillT >= 1;

/* ---------- 擊中傷害（企劃書 7.2 的五步） ---------- */
const DT = ['phys', 'fire', 'cold', 'light', 'chaos'];
const SPELL_BASE = [7, 12];
/* 法術的基礎傷害：看寶石等級（照 PoE2 每級成長很陡，Lv20 約 Lv1 的 69 倍，跟武器＋攻擊倍率同一個量級），不吃武器、不吃角色等級 */
const spellDmg = (lv, avg) =>
  (avg ? (SPELL_BASE[0] + SPELL_BASE[1]) / 2 : rnd(SPELL_BASE[0], SPELL_BASE[1])) * Math.pow(1.25, lv - 1);
const isSpell = D => (D.tags || []).includes('spell') && !(D.tags || []).includes('attack');
/* 目標身上的減益讓抗性變成多少（詛咒、曝曬、焦灼可以壓成負值；穿透最多穿到 0） */
const IGNK = { fire: 'Fire', cold: 'Cold', light: 'Light', chaos: 'Chaos' };
/* 曝曬與被油纏身的火焰曝曬（第 11 批，玩家、怪物同一組欄位）：同一種抗性只算最強一個 */
const expOf = (a, k) =>
  Math.max(a.exp > G.t && k !== 'chaos' ? 20 : 0, k === 'fire' && a.oiled > G.t ? DEBUFF.oilExp : 0);
/* 詛咒實際的效果：站在奉獻地面上少 50%（玩家、怪物同一組欄位）
   shortcut: 怪物的脆弱在施放時就改 m.arm，奉獻地面減不到，等脆弱改成即時算再接 */
const cuV = a => a.curse.v * (a.cons > G.t ? 1 - DEBUFF.consCurse / 100 : 1);
/* 凋零層數（玩家、怪物同一組欄位）：每層受到的混沌傷害提高 5%，每層各自 4 秒 */
const witherN = a => (a.wither || []).filter(t => t > G.t).length;
function witherAdd(a, max = 10) {
  (a.wither = (a.wither || []).filter(x => x > G.t)).length < max && a.wither.push(G.t + 4);
}
/* 施加易燃（玩家、怪物共用）：被油纏身的目標 200% 更多 */
function flamAdd(a, v) {
  a.flam = Math.min(100, (a.flamT > G.t ? a.flam || 0 : 0) + v * (a.oiled > G.t ? DEBUFF.oilFlam : 1));
  a.flamT = G.t + 8;
}
function resOf(m, k, pen = 0) {
  /* 無視抗性（0.2.43）：該種傷害當抗性 0，負抗性也不吃（開關 ignFire／ignCold／ignLight／ignChaos，目前沒有來源） */
  if (ST['ign' + IGNK[k]]) return 0;
  const a = m.ail || {};
  let r = m.res[k] || 0;
  if (k !== 'chaos') {
    if (a.curse && a.curse.k === 'eleweak') r -= cuV(a);
    r -= expOf(a, k) * (1 - rarRed(m)) * debuffM();
    if (a.scorch && a.scorch.t > G.t) r -= a.scorch.v;
    /* 火焰曝曬（0.2.26，焦土）：點燃中的敵人火焰抗性 −x%（稀有度減效果，跟曝曬一樣） */
    if (k === 'fire' && ST.fireExp && a.ign && a.ign.t > G.t) r -= ST.fireExp * (1 - rarRed(m)) * debuffM();
  } else if (a.curse && a.curse.k === 'despair') r -= cuV(a);
  return r > 0 ? Math.max(0, r - pen) : r;
}
/* 目標「受到的傷害提高」：感電、威嚇、凋零（只混沌）、完全破甲（只物理，破碎護甲再 +20%、相加） */
function takenInc(m, k) {
  const a = m.ail || {};
  let v = 0;
  if (a.shock > G.t) v += 20;
  if (a.intim > G.t) v += 10;
  if (k === 'chaos') v += 5 * witherN(a);
  if (k === 'phys' && a.broken > G.t) v += 20 + (a.shatter > G.t ? DEBUFF.shatterMore : 0);
  return v;
}
const toughOf = m => (m.tough || 0) + MM('mtough');
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
/* 適應：最多 5 層、每層該元素承受 −10%（沒有持續時間，離開地圖清掉） */
const ADAPT = { max: 5, less: 0.1 };
const bvUp = () => ST.bv > 0 && P.bv > 0 && P.bvRe == null;
/* 傷害吸收（0.2.42 第 8 批）：減傷（護甲、抗性）之後、能量護盾與生命之前，依序扣：格擋值（沉重暈眩中不吸收）→ 守護；回傳剩下的傷害 */
function absorb(d) {
  if (bvUp() && !(P.ail && P.ail.hstun > G.t)) {
    const ab = Math.min(P.bv, d * (ST.heavyShield ? BV.absHeavy : BV.abs));
    P.bv -= ab;
    P.bvHit = G.t;
    if (ST.steelCycle) P.bvAcc = Math.min(ST.hp, (P.bvAcc || 0) + ab);
    if (P.bv <= 0.5) {
      P.bv = 0;
      P.bvRe = G.t;
      if (ST.sacrifice) P.sacT = G.t + 2;
      /* 碎開的衝擊：範圍內所有敵人（含王）受招架，範圍 4 公尺×(1 + parryR%)，圓環畫的就是實際範圍；有格擋值（拿盾）就生效 */
      const R = DEBUFF.shatterR * METER * (1 + ST.parryR / 100);
      for (const o of G.mobs || [])
        if (o.hp > 0 && !o.arrow && Math.hypot(o.x - P.x, o.y - P.y) <= R + o.r) applyParry(o);
      fx({ k: 'ring', x: P.x, y: P.y, r: R, dur: 0.35, col: '#c9d3e0' });
      sfx('block');
    }
    d -= ab;
  }
  if (P.guardV > 0) {
    const ab = Math.min(P.guardV, d);
    P.guardV -= ab;
    d -= ab;
  }
  /* 殘暴打擊的守護（4 秒） */
  if (P.svgV > 0 && P.svgT > G.t) {
    const ab = Math.min(P.svgV, d);
    P.svgV -= ab;
    d -= ab;
  }
  return d;
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
  if (ST.hfFlam) for (const m of G.mobs) if (m.hp > 0 && m.ail && dist(P, m) < HF.touchR) flamAdd(m.ail, ST.hfFlam);
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
/* 獵鷹印記（風行神射）：每 3 秒印記 500 內全部沒有印記的敵人（算印記，佔每隻怪 1 個印記位） */
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
  /* 傷害幸運（0.2.42）：範圍擲兩次取高（期望 = 下限 + 2/3 範圍） */
  const lk = ST.lukDmg > 0,
    rnd2 = o.avg
      ? lk
        ? (a, b) => (a + 2 * b) / 3
        : (a, b) => (a + b) / 2
      : lk
        ? (a, b) => Math.max(rnd(a, b), rnd(a, b))
        : rnd,
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
  /* 2. 多造成 x% 的附加傷害（憤怒、附加火焰；不潔之力是混沌） */
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
      phys: {
        light: ST.cvPL + (c.cvL || 0),
        cold: ST.cvPC + (c.cvC || 0),
        fire: ST.cvPF + av + hs + (c.cvF || 0)
      },
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
      (tg.includes('strike') ? ST.strikeP : 0) +
      (tg.includes('slam') ? ST.slamP : 0) +
      (tg.includes('nova') ? ST.novaP : 0) +
      (tg.includes('sustained') ? ST.sustP : 0) +
      (tg.includes('spell') ? ST.spellP : 0) +
      (tg.includes('elem') ? ST.elemP : 0) +
      (tg.includes('occ') ? ST.occP : 0) +
      (tg.includes('pri') ? ST.priP : 0) +
      (tg.includes('aoe') ? ST.aoeP : 0) +
      (o.minion ? ST.minionP : 0) +
      (o.unit ? ST.unitP : 0) +
      (lowHp() ? ST.lowHp : 0) +
      (P.hp >= ST.hp ? ST.fullHp + (hasBuff('howl') ? DEBUFF.howlDmg : 0) : 0) +
      (P.es > 0 ? ST.esUp : 0) +
      (P.rolledT > G.t ? ST.afterRoll : 0) +
      (m && (m.boss || m.elite) ? ST.bossP : 0) +
      (m && m.ail && immob(m.ail) ? ST.immobP : 0) +
      (moving() ? ST.movP : 0) +
      (still() ? ST.stillP : 0) +
      (near < 160 ? ST.closeP : 0) +
      (near > 350 ? ST.farP : 0) +
      (bannerOn() ? G.banner.buff.dmg || 0 : 0);
  const typeInc = { phys: ST.physP, fire: ST.fireP, cold: ST.coldP, light: ST.lightP, chaos: ST.chaosP },
    incOf = ch => ch.reduce((t, k) => t + typeInc[k], 0) + (ch.some(k => ELEK.includes(k)) ? ST.eleP : 0);
  /* 5. 更多：輔助、昇華、盛怒（只有攻擊）、化身（法術的元素） */
  let more = (o.mult || 1) * (c.more || 1);
  /* 你被「衰弱」詛咒（地圖詞）：造成的傷害更少 */
  const pc = P.ail && P.ail.curse;
  if (pc && pc.k === 'enfeeble' && pc.t > G.t && !unaff('curse')) more *= 1 - cuV(P.ail) / 100;
  if (tg.includes('attack')) more *= 1 + ((P.rage || 0) * (1 + ST.rageEff / 100)) / 100;
  /* 天賦基石的全域更多／更少（0.2.17） */
  if (ST.more) more *= 1 + ST.more / 100;
  /* 0.2.23 基石與特色點：疾風步、投射物更多、自己的擊中（不是召喚物、場上單位） */
  if (ST.wind) more *= moving() ? 1.25 : 0.75;
  if (ST.projMore && tg.includes('proj')) more *= 1 + ST.projMore / 100;
  if (!o.minion && !o.unit) more *= ST.noSelf ? 0 : 1 + ST.selfMore / 100;
  /* 受招架（mech.js）：受到的攻擊傷害 50% 更多（幅度 parryMag） */
  if (!spell && parryOn(m)) more *= parryMore();
  /* 易攻目標（第 10 批）：下一次投射物攻擊擊中更多傷害，擊中後消耗（面板的期望值不消耗） */
  const ez = m && m.ail && m.ail.easy;
  if (ez && ez.t > G.t && tg.includes('proj') && tg.includes('attack') && !o.avg)
    (more *= 1 + ez.v / 100), (m.ail.easy = null);
  /* 0.2.25 昇華：獵鷹印記（被印記的更多 10%）、遠射／近射（看投射物飛了多遠 o.fly） */
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
      ch = ST.noCrit ? 0 : o.crit ? 100 : effCh(chance, ST.lukCrit),
      sum = DT.reduce((s, k) => s + pre[k], 0),
      big = DT.reduce((b, k) => (pre[k] > pre[b] ? k : b), 'phys');
    return {
      d:
        sum *
        ((ST.forkCrit || ST.inevCrit) && !ST.noCrit && !o.crit ? critAvg(ch / 100, cm - 1) : 1 + (ch / 100) * (cm - 1)),
      el: big,
      ch: ST.noCrit || o.crit ? ch : ST.inevCrit && ch > 0 ? 100 : ST.forkCrit ? 100 * (1 - (1 - ch / 100) ** 2) : ch,
      cm,
      inc: common + incOf(parts[0] ? parts[0].ch : []),
      more
    };
  }
  /* 分岔暴擊（forkCrit）：判定兩次，任一次成功就暴擊，兩次都成功暴擊傷害加成套兩次（幸運時兩次各自幸運）；
     絕對暴擊（inevCrit）：沒骰中就重骰到成功，每重骰一次暴擊傷害加成 30% 更少（chance 0 不重骰） */
  const forced = !ST.noCrit && !!(o.crit || P.critNext || (ST.fullCrit && m && m.hp >= m.mhp));
  let hits = forced ? 1 : 0,
    rerolls = 0;
  if (!ST.noCrit && !forced) {
    const tries = ST.forkCrit ? 2 : 1,
      once = () => (roll(chance, ST.lukCrit) ? 1 : 0) + (tries > 1 && roll(chance, ST.lukCrit) ? 1 : 0);
    hits = once();
    while (!hits && ST.inevCrit && chance > 0 && rerolls < 50) rerolls++, (hits = once());
  }
  const crit = hits > 0;
  if (crit) {
    /* 致命陰影（0.2.26）：每顆暴擊球暴擊傷害加成 +x% */
    const cm =
      1 + ((100 + ST.critX + (c.critX || 0) + (P.critNext ? 50 : 0) + ST.powCritX * chgN('p')) / 100) * INEV ** rerolls;
    for (const k of DT) pre[k] *= hits > 1 ? cm * cm : cm;
  }
  if (!o.keep) P.critNext = 0;
  if (ST.aq.precise) P.noCritN = crit ? 0 : (P.noCritN || 0) + 1;
  /* 目標的減傷：物理看護甲（上限 90%）、其他看抗性；再乘「受到的傷害提高」；post 是扣完的（穩固值累積用） */
  let d = 0,
    big = 'phys',
    bigV = -1;
  const post = {},
    tough = m ? 1 + toughOf(m) / 100 : 1,
    /* 碎甲、卸防姿態：之後的攻擊擊中多一筆獨立附加物理（不吃提高、更多、暴擊、只算一次），在減傷之前加進去 */
    rv = m && tg.includes('attack') ? rivenAdd(m.ail) : 0;
  for (const k of DT) {
    const v = pre[k] + (k === 'phys' ? rv : 0);
    post[k] = 0;
    if (!v) continue;
    if (v > bigV) (bigV = v), (big = k);
    if (!m) {
      d += v;
      continue;
    }
    /* 物理減傷順序：護甲（上限 90%）→ 鎮壓（扣百分點，最多扣到 0）→ 壓碎（再扣 15 百分點，可以變負＝受到更多） */
    let red = k === 'phys' ? Math.min(0.9, m.arm / (m.arm + 10 * v + 1)) : resOf(m, k, ST.pen + (c.pen || 0)) / 100;
    if (k === 'phys') {
      red = Math.max(0, red - ((c.overwhelm || 0) + ST.overwhelm) / 100);
      if (m.ail && m.ail.crush > G.t) red -= DEBUFF.crushPts / 100;
    }
    d += post[k] = (v * (1 - red) * (1 + takenInc(m, k) / 100)) / tough;
  }
  return { d, pre, post, crit, el: big, spell };
}

/* 殘暴打擊（開關 savageGuard＝%，0.2.43；hurtPlayer 呼叫）：一下被移除至少 15% 最大生命，獲得該 % 最大生命的守護，4 秒（重新獲得是刷新，不疊） */
function savageHit(d) {
  if (ST.savageGuard && d >= ST.hp * 0.15) (P.svgV = (ST.hp * ST.savageGuard) / 100), (P.svgT = G.t + 4);
}
/* 擊中造成擊殺（skills.js hitMob 呼叫；hp0＝擊中前的生命）：溢出（超出剩餘生命的傷害）的 x% 打給 2 公尺內的敵人（只算擊中）；最後一擊：打死感電的敵人回復 x% 最大能量護盾 */
function hitKill(m, hp0, r) {
  const over = -m.hp;
  if (ST.ovkSplash && over > 0)
    for (const o of G.mobs)
      if (o !== m && o.hp > 0 && dist(o, m) < 2 * METER + o.r) dotHit(o, (over * ST.ovkSplash) / 100, r.el);
  if (ST.kbEs && m.ail && m.ail.shock > G.t) P.es = Math.min(ST.es, (P.es || 0) + (ST.es * ST.kbEs) / 100);
}
/* 分岔、絕對暴擊的期望倍率：e＝一次判定的有效暴擊率（已含幸運），b＝暴擊傷害加成（cm − 1）；跟 hitCalc 實際擲骰同一套規則 */
const INEV = 0.7;
function critAvg(e, b) {
  if (e <= 0) return 1;
  const s0 = ST.forkCrit ? (1 - e) ** 2 : 1 - e,
    s2 = ST.forkCrit ? e * e : 0,
    s1 = 1 - s0 - s2;
  if (!ST.inevCrit) return s0 + s1 * (1 + b) + s2 * (1 + b) ** 2;
  /* 失敗 k 次後才成功（機率 s0^k），加成 × 0.7^k：Σ 等比級數，平方項的比例是 0.49 */
  return 1 + ((s1 + 2 * s2) * b) / (1 - s0 * INEV) + (s2 * b * b) / (1 - s0 * INEV * INEV);
}
/* ---------- 異常：打中之後（hitMob 呼叫） ---------- */
/* 流血、點燃的備份佇列（0.2.43）：每一筆都留著，只有有效傷害最強的一筆（a.bleed／a.ign，原本的讀法不變）造成傷害，
   其他筆掛在它的 .q；最強的到期或有人被加劇就重新整理。加劇 .agg：有效傷害 ×2（流血一律當目標在移動、點燃 ×2）。
   shortcut: 最多留 AILQ 筆，超過丟掉最弱的；要放寬就改這個數字 */
const AILQ = 60,
  ailEff = x => x.dps * (x.agg ? 2 : 1);
function ailQ(list) {
  const all = list
    .filter(x => x && x.t > G.t)
    .sort((x, y) => ailEff(y) - ailEff(x) || y.t - x.t)
    .slice(0, AILQ);
  for (const x of all) delete x.q;
  if (all[0]) all[0].q = all.slice(1);
  return all[0];
}
/* 加進一筆；ex 是這筆的記號（惡化點燃的 cu＝同一次使用，會先移除同一次使用的舊筆） */
const keepMax = (cur, dps, t, ex) =>
  ailQ(
    [cur, ...((cur && cur.q) || [])]
      .filter(x => !(ex && ex.cu && x && x.cu === ex.cu))
      .concat({ dps, t: G.t + t, ...ex })
  );
/* 最強的到期了，換備份接手（沒有備份就不動） */
function ailReflow(a) {
  for (const k of ['ign', 'bleed'])
    if (a[k] && a[k].t <= G.t && a[k].q && a[k].q.length) a[k] = ailQ([a[k], ...a[k].q]) || ((a[k].q = null), a[k]);
}
/* 流血這一格實際的傷害：移動時普通流血也 ×2、加劇的一律 ×2，所以要用當下的 mv 在最強一筆與備份裡挑實際最大的（排序用的 ailEff 不知道移動） */
function bleedNow(a, mv) {
  let v = 0;
  if (a.bleed)
    for (const x of [a.bleed, ...(a.bleed.q || [])]) if (x.t > G.t) v = Math.max(v, x.dps * (x.agg || mv ? 2 : 1));
  return v;
}
/* 加劇：這個怪身上現有的每一筆（含備份）都變成加劇，之後新上的不算；回傳有沒有實際加劇（至少一筆從沒加劇變成加劇） */
function aggravate(m, k) {
  const top = m.ail && m.ail[k];
  if (!top) return false;
  const all = [top, ...(top.q || [])].filter(x => x.t > G.t && !x.agg);
  if (!all.length) return false;
  for (const x of all) x.agg = 1;
  m.ail[k] = ailQ([top, ...(top.q || [])]);
  return true;
}
/* 加劇任何流血：有流血被加劇才算；ST.aggIgn 開著時同時加劇所有點燃 */
function aggBleed(m) {
  const did = aggravate(m, 'bleed');
  if (did && ST.aggIgn) aggravate(m, 'ign');
  return did;
}
/* 有助於異常狀態的傷害（0.2.43）：哪種傷害算進哪種異常的基礎；AIL_EXTRA 的開關打開時，加進那幾種傷害 */
const AIL_SRC = { ign: ['fire'], bleed: ['phys'], poi: ['phys', 'chaos'] },
  AIL_EXTRA = [
    ['shaper', 'ign', ['phys', 'cold', 'light']],
    ['bleedAll', 'bleed', ['fire', 'cold', 'light', 'chaos']],
    ['poiAll', 'poi', ['fire', 'cold', 'light']]
  ],
  ailBase = (p, k) =>
    AIL_SRC[k].reduce((t, d) => t + p[d], 0) +
    AIL_EXTRA.reduce((t, [f, a, ds]) => t + (a === k && ST[f] ? ds.reduce((u, d) => u + p[d], 0) : 0), 0);
/* 滿溢機率（0.2.43）：回傳發生幾次，215 ＝ 2 次，再 15% 機率第 3 次 */
const surpass = p => (p > 0 ? Math.floor(p / 100) + (roll(p % 100) ? 1 : 0) : 0);
/* 惡化點燃（技能欄位 c.compound）：同一次使用（use＝hitMob 的 o.a）再點燃同一目標，移除這次使用的舊筆，新筆幅度 × 累計筆數；反射、油地面的點燃不走這裡 */
function igniteOn(m, dps, t, c, use) {
  if (!c.compound || !use) return keepMax(m.ail.ign, dps, t);
  const mp = (use.cmp = use.cmp || new Map()),
    n = (mp.get(m) || 0) + 1;
  mp.set(m, n);
  return keepMax(m.ail.ign, dps * n, t, { cu: use });
}
/* 破甲家族（第 10 批）：碎甲（5 秒，或完全破甲被移除就結束）、卸防姿態（60 秒，目眩消失或承受 10 次擊中就結束）、破碎護甲（只在完全破甲期間） */
const rivenOn = a => !!(a.riven && a.riven.t > G.t && a.broken > G.t),
  unbrOn = a => !!(a.unbr && a.unbr.t > G.t && a.daze > G.t),
  rivenAdd = a => (rivenOn(a) ? a.riven.v : 0) + (unbrOn(a) ? a.unbr.v : 0);
/* 有這些狀態的敵人不能再被破甲 */
const noBreak = a => rivenOn(a) || a.shatter > G.t;
/* 近期（4 秒）切割消耗的層數 */
function inciseRecent() {
  P.incN = (P.incN || []).filter(x => x[0] > G.t - RECENT);
  return P.incN.reduce((t, x) => t + x[1], 0);
}
/* 濕透（第 10 批）：獨立的通用減益，不綁任何技能；技能欄位 c.drench、地面、地圖詞都呼叫這個。t 預設 2 秒，傳更長的秒數會延長（不縮短） */
function drench(m, t = DEBUFF.wetT) {
  if (m && m.ail) m.ail.wet = Math.max(m.ail.wet || 0, G.t + t);
}
function applyAil(m, r, c, use) {
  const a = m.ail,
    cq = c.q || 0,
    t = G.mapT || 1,
    thr = ailThr(t) * MOB_HP,
    thrF = thr * ailLow(m, 'fire'),
    thrC = thr * ailLow(m, 'cold'),
    thrL = thr * ailLow(m, 'light'),
    p = r.pre,
    po = r.post,
    archon = P.buf && P.buf.archon > G.t,
    mk = a.mark && a.mark.k,
    mag = 1 + (ST.ailMag + (c.ailMag || 0)) / 100,
    attack = (c.D.tags || []).includes('attack'),
    rr = 1 - rarRed(m);
  /* 點燃：火焰傷害疊易燃（每 5% 門檻 +1% 機率），中了清零 */
  /* 火焰塑造者（0.2.26）：物理、冰冷、閃電也累積易燃（點燃的基礎跟著算這幾種）、點燃傷害提高；餘燼：點燃更多、持續時間 −25% */
  /* 加劇任何流血（開關 aggHit，攻擊擊中時）：先加劇現有的，這一下新上的不算 */
  if (ST.aggHit && attack) aggBleed(m);
  /* 第 10 批：卸防姿態承受的擊中數（這一下之後才算）；濕透先上，這一下就吃得到 */
  if (a.unbr && --a.unbr.n <= 0) a.unbr = null;
  if (c.drench) drench(m, dbT(c.drench, DEBUFF.wetT));
  const igB = ailBase(p, 'ign');
  if (igB > 0) {
    flamAdd(a, (igB / thrF) * 20 * (archon ? 2 : 1));
    if (roll(a.flam))
      (a.ign = igniteOn(
        m,
        igB * 0.2 * (mag + ST.shaper / 100) * (1 + ST.ember / 100),
        4 * (ST.ember ? 0.75 : 1),
        c,
        use
      )),
        (a.flam = 0);
  }
  /* 冰緩：效果看傷害÷門檻，低於 30% 不生效，最高 50%；8 秒 */
  if (p.cold > 0) {
    const v = Math.min(50, ((p.cold / thrC) * 100 + 0) * mag) * rr;
    if (v >= 30 * rr && (!a.chill || a.chill.t <= G.t || v >= a.chill.v)) a.chill = { v, t: G.t + 8 };
    /* 冰凍累積（穩固值）；印記、化身都是累積提高 */
    poiseAdd(m, 'frz', po.cold, ST.frzP + (mk === 'freeze' ? 50 : 0) + (archon ? 100 : 0));
  }
  /* 感電：每 4% 門檻 +1% 機率（化身 ×2、閃電箭更多），受到的傷害提高 20%、8 秒 */
  if (
    p.light > 0 &&
    roll(
      (((p.light / thrL) * 100) / 4) *
        (archon ? 2 : 1) *
        (1 + (c.shockMore || 0) / 100) *
        (a.wet > G.t ? 1 + DEBUFF.wetShock / 100 : 1)
    )
  )
    a.shock = G.t + 8;
  /* 觸電：只有特定技能、輔助會累積 */
  if (c.elc) poiseAdd(m, 'elc', po.light * c.elc, ST.elcP + (mk === 'volt' ? 50 : 0));
  /* 釘身：只有 c.pin 的技能、輔助累積（所有傷害種類都算） */
  if (c.pin) poiseAdd(m, 'pin', (po.phys + po.fire + po.cold + po.light + po.chaos) * c.pin);
  /* 目眩（0.2.42）：不疊加，重上刷新 8 秒 */
  if (qRoll(ST.dazeCh) && !unbrOn(a)) a.daze = G.t + 8;
  /* 暈眩：僵直（輕暈）看「這一下÷最大生命」（低於 15% 不算）；沉重暈眩累積（冰冷不算，物理、近戰各 ×1.5） */
  const hit = p.phys + p.fire + p.light + p.chaos;
  if (!m.boss && hit / m.mhp >= 0.15 && Math.random() < hit / m.mhp) m.stun = Math.max(m.stun || 0, 0.5);
  /* 0.2.25：沉重暈眩累積提高（昇華小點）、震懾之錘（物理擊中每 1000 護甲 +10%）、鋼鐵循環（格擋值吸收的量） */
  /* 品質：脆弱、碎裂地面（震地）、劈砍打流血、破甲輔助打完全破甲 */
  const hsQ =
    (a.curse && a.curse.k === 'vuln' && a.curse.t > G.t ? 0.4 * (a.curse.q || 0) : 0) +
    (m.jagT > G.t ? 0.4 * m.jagQ : 0) +
    (c.k === 'cleave' && hasState(m, 'bleed') ? 0.4 * cq : 0) +
    (c.brkQ && a.broken > G.t ? 0.2 * c.brkQ : 0);
  const hsInc = (1 + (ST.hsP + (p.phys > 0 ? (ST.hsArm * ST.armor) / 1000 : 0)) / 100) * (1 + hsQ);
  poiseAdd(
    m,
    'hs',
    (po.phys + po.fire + po.light + po.chaos) *
      (p.phys > 0 ? 1.5 : 1) *
      ((c.D.tags || []).includes('melee') ? 1.5 : 1) *
      (c.hsM || 1) *
      hsInc
  );
  if (ST.steelCycle && P.bvAcc > 0 && !immob(a)) poiseAdd(m, 'hs', P.bvAcc), (P.bvAcc = 0);
  /* 流血、中毒：要有機率；流血只有攻擊會造成，c.spellBleed 是例外（死亡紅花的爆炸） */
  /* 切割（開關 incise）：擊中給 1 層；每層流血機率 +10%（最多 10 層），上流血時全部移除；inciseMag：近期每消耗 1 層，流血幅度 3% 更多（上限 30%） */
  if (ST.incise) a.inc = Math.min(DEBUFF.inciseMax, (a.inc || 0) + 1);
  const nInc = a.inc || 0;
  if (
    (attack || c.spellBleed) &&
    ailBase(p, 'bleed') > 0 &&
    roll(ST.bleedCh + (c.bleedCh || 0) + DEBUFF.inciseCh * nInc)
  ) {
    if (nInc) (a.inc = 0), (P.incN = P.incN || []).push([G.t, nInc]);
    const im = ST.inciseMag ? 1 + Math.min(DEBUFF.inciseCap, DEBUFF.inciseMore * inciseRecent()) / 100 : 1;
    a.bleed = keepMax(a.bleed, ailBase(p, 'bleed') * 0.15 * mag * im, 5);
  }
  /* 附加火焰的品質：附加的火焰有機率直接點燃 */
  if (c.addIgn && p.fire > 0 && qRoll(c.addIgn)) a.ign = igniteOn(m, p.fire * 0.2 * mag, 4, c, use);
  if (ailBase(p, 'poi') > 0 && roll(ST.poisonCh + (c.poisonCh || 0))) {
    const n = 1 + ST.poiStack + (c.poiStack || 0);
    a.poi = (a.poi || []).filter(x => x.t > G.t);
    a.poi.push({ dps: ailBase(p, 'poi') * 0.2 * mag, t: G.t + 2 });
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
  if (brk > 0 && !(a.broken > G.t) && !noBreak(a)) {
    m.arm -= brk * (m.boss ? 1 : m.elite ? 2 : 3);
    a.abT = G.t + 12;
    if (m.arm <= 0) (m.arm = 0), (a.broken = G.t + 12);
  }
  /* 穿刺：存 30% 物理（只有長矛） */
  if (attack && p.phys > 0 && ST.wt === 'spear' && roll(ST.impaleCh + (c.impaleCh || 0)))
    (a.imp = a.imp || []).length < 60 && a.imp.push(p.phys * 0.3);
  /* 特殊元素異常（PoE1）：k ×（傷害÷門檻）^0.4，4 秒 */
  const alt = (k, dmg, cap, th) => Math.min(cap, k * Math.pow(dmg / th, 0.4) * 100 * mag);
  if (c.alt === 'scorch' && p.fire > 0) a.scorch = { v: alt(0.5, p.fire, 30, thrF), t: G.t + 4, q: c.altQ };
  if (c.alt === 'brittle' && p.cold > 0) a.brittle = { v: alt(10, p.cold, 600, thrC) / 100, t: G.t + 4, q: c.altQ };
  if (c.alt === 'sap' && p.light > 0) a.sap = { v: alt(1 / 3, p.light, 20, thrL), t: G.t + 4, q: c.altQ };
  /* 減益 */
  /* 曝曬的品質：曝曬中被任何擊中都可能刷新 */
  if (a.exp > G.t && qRoll(20 * (a.expQ || 0))) a.exp = G.t + 4;
  if (c.expose) (a.exp = G.t + 4), (a.expQ = c.expQ);
  if (c.blind) (a.blind = G.t + 4), (a.blindQ = c.blindQ);
  if (c.wither && p.chaos > 0) witherAdd(a, c.witherMax || 10);
  /* 異常強化的品質：記在怪身上，到期時看 ailTick */
  if (c.ailExt) a.extP = c.ailExt;
  if (c.hinder) a.hinder = G.t + 4;
  if (c.maim && attack) a.maim = G.t + 4;
  if (c.intim) a.intim = G.t + 4;
  debuffsOn(m, p, c);
}
/* 第 10 批的技能欄位減益（applyAil 最後呼叫）；來源只有技能欄位，沒有技能接的先不會發生 */
function debuffsOn(m, p, c) {
  const a = m.ail,
    dm = debuffM(),
    tot = DT.reduce((t, k) => t + p[k], 0);
  /* 破碎護甲：只能對完全破甲的敵人施加，物理再 +20%，持續到完全破甲結束；之後不能再破甲 */
  if (c.shatter && a.broken > G.t) a.shatter = a.broken;
  /* 碎甲：只能對完全破甲的敵人施加，存這次擊中 5% 減免前物理為幅度，5 秒，完全破甲被移除就結束；重上取代舊的 */
  if (c.riven && p.phys > 0 && a.broken > G.t)
    a.riven = { v: (p.phys * DEBUFF.rivenPct) / 100, t: G.t + DEBUFF.rivenT };
  /* 卸防姿態：只能對目眩的敵人施加，存 10%，60 秒；重上取代舊的 */
  if (c.unbr && p.phys > 0 && a.daze > G.t)
    a.unbr = { v: (p.phys * DEBUFF.unbrPct) / 100, t: G.t + DEBUFF.unbrT, n: DEBUFF.unbrHits };
  /* 壓碎：物理減傷 −15 個百分點，可以變負 */
  if (c.crush) a.crush = G.t + dbT(c.crush, DEBUFF.crushT);
  /* 跛行：扣目標當下的閃避（普通 ×3、菁英 ×2、王 ×1，跟破甲一致），扣到 0＝完全跛行 12 秒；c.cripple＝這一擊總傷害的倍率 */
  if (c.cripple && m.ev0 != null && !(a.crip > G.t)) {
    m.ev = Math.max(0, m.ev - tot * c.cripple * (m.boss ? 1 : m.elite ? 2 : 3));
    a.evT = G.t + DEBUFF.cripT;
    if (m.ev <= 0) a.crip = G.t + DEBUFF.cripT;
  }
  /* 缺血：目標的腐化之血層數上限 = 10 + 缺血幅度（乘減益幅度）；腐化之血：c.corrupt ＝每層每秒的物理持續傷害，每層獨立 5 秒 */
  if (c.anemia) a.anemia = { v: c.anemia * dm, t: G.t + DEBUFF.anemiaT };
  if (c.corrupt) {
    const cb = (a.cb = (a.cb || []).filter(x => x.t > G.t)),
      mx = DEBUFF.cbMax + (a.anemia && a.anemia.t > G.t ? Math.floor(a.anemia.v) : 0);
    cb.push({ dps: c.corrupt, t: G.t + DEBUFF.cbT });
    cb.sort((x, y) => y.t - x.t);
    if (cb.length > mx) cb.pop(); /* 滿了就換掉最舊的；上限縮小時不一次砍掉已有的層 */
  }
  /* 控制與減益（秒數由施加者給，true＝預設） */
  if (c.petrify) a.petr = G.t + dbT(c.petrify, DEBUFF.petrifyT) * (m.boss ? 0.5 : 1);
  if (c.calm) a.calm = G.t + dbT(c.calm, 1);
  if (c.weaken) a.weak = G.t + dbT(c.weaken, DEBUFF.weakT);
  if (c.taunt) a.taunt = G.t + dbT(c.taunt, DEBUFF.tauntT);
  if (c.easy) a.easy = { v: c.easy, t: G.t + DEBUFF.easyT };
}
/* 怪物這一格：持續傷害、累積條消退；回傳 true＝不能行動（冰凍、觸電、沉重暈眩、輕暈） */
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
  ailReflow(a);
  if (a.ign && a.ign.t > G.t) d += ailEff(a.ign) * (1 - resOf(m, 'fire') / 100);
  /* 加劇的流血一律當目標在移動（×2），移動時不再加倍 */
  const bl = bleedNow(a, m.mv);
  d += bl;
  if (a.poi)
    for (const x of a.poi) if (x.t > G.t) d += x.dps * (1 - resOf(m, 'chaos') / 100) * (1 + takenInc(m, 'chaos') / 100);
  /* 腐化之血：每層獨立的物理持續傷害，不是流血（不吃流血加成、不會加倍） */
  if (a.cb) for (const x of a.cb) if (x.t > G.t) d += x.dps;
  /* 站在地面上的持續傷害（第 11 批）：只算最強一塊，荊棘地面只有移動時才算 */
  if (a.gd && a.gd.t > G.t && (!a.gd.mv || m.mv))
    d += a.gd.v * (a.gd.el === 'phys' ? 1 : 1 - resOf(m, a.gd.el) / 100) * (1 + takenInc(m, a.gd.el) / 100);
  /* 血漬：流血時累積（目標移動或流血被加劇時 ×2），流血斷掉就暫停（不歸零），滿 6 秒得到血漬減益 */
  if (bl > 0) {
    const agg = [a.bleed, ...(a.bleed.q || [])].some(x => x.t > G.t && x.agg);
    a.stainA = (a.stainA || 0) + dt * (m.mv || agg ? 2 : 1);
    if (a.stainA >= DEBUFF.stainNeed) (a.stainA = 0), (a.stain = G.t + DEBUFF.stainT);
  }
  if (d > 0) {
    m.hp -= d * dt;
    m.dotAcc = (m.dotAcc || 0) + d * dt;
    if ((m.dotT = (m.dotT || 0) + dt) > 0.5) {
      if (m.dotAcc >= 1) num(m.x, m.y - m.sz, m.dotAcc, 'dot');
      m.dotT = m.dotAcc = 0;
    }
  }
  /* 累積條：8 秒沒被累積才開始退，每秒 5%；定身期間不動 */
  if (!immob(a))
    for (const k in POISE) if (a[k] && G.t - ((a.psA && a.psA[k]) || 0) >= 8) a[k] = Math.max(0, a[k] - 5 * dt);
  /* 獵犬印記：流血的失血累積沉重暈眩 */
  if (a.mark && a.mark.k === 'hound' && a.bleed && a.bleed.t > G.t) poiseAdd(m, 'hs', bl * dt);
  if (a.abT && a.abT <= G.t && !(a.broken > G.t)) m.arm = m.arm0;
  if (a.evT && a.evT <= G.t && !(a.crip > G.t) && m.ev0 != null) (m.ev = m.ev0), (a.evT = 0);
  /* 卸防姿態：目眩消失就結束（承受 10 次擊中、60 秒到期在 applyAil／unbrOn） */
  if (a.unbr && !unbrOn(a)) a.unbr = null;
  if (a.riven && !rivenOn(a)) a.riven = null;
  if (a.curse && a.curse.t <= G.t) a.curse = null;
  if (m.stun > 0) m.stun -= dt;
  if (m.ail) mobStates(m);
  return a.frozen > G.t || a.elcT > G.t || a.hstun > G.t || a.petr > G.t || m.stun > 0;
}
/* 怪物的移動倍率：冰緩、阻礙、殘廢、時空鎖鏈 */
function mobSpd(m) {
  const a = m.ail || {};
  let s = (m.spdM || 1) * (m.gslow > G.t ? 0.7 : 1);
  if (a.chill && a.chill.t > G.t) s *= 1 - a.chill.v / 100;
  if (a.hinder > G.t || a.maim > G.t) s *= 0.7;
  if (a.curse && a.curse.k === 'tchains') s *= 1 - cuV(a) / 100;
  if (a.weak > G.t) s *= 1 - DEBUFF.weakMove / 100;
  /* 地面（第 11 批）：被油纏身；怒號地面的猛攻（移動速度 +10%，技能速度在 updMobs） */
  if (a.oiled > G.t) s *= 1 - DEBUFF.oilSlow / 100;
  if (a.howl > G.t) s *= 1.1;
  return Math.max(0.25, s);
}
/* 怪物造成的傷害倍率：殘喘、衰弱（更少）、威嚇 */
function mobDmgMul(m) {
  const a = m.ail || {};
  let s = 1;
  if (a.sap && a.sap.t > G.t) s *= 1 - a.sap.v / 100;
  if (a.curse && a.curse.k === 'enfeeble') s *= 1 - cuV(a) / 100;
  if (a.intim > G.t) s *= 0.9;
  if (a.weak > G.t) s *= 1 - DEBUFF.weakDmg / 100;
  /* 怒號地面：滿血時傷害 +40% */
  if (a.howl > G.t && m.hp >= m.mhp) s *= 1 + DEBUFF.howlDmg / 100;
  /* 平靜：照常出手，但造成的傷害為 0 */
  if (a.calm > G.t) s = 0;
  return s;
}
/* 嘲諷（第 10 批）：被嘲諷的敵人只能以你為目標，對你以外的目標傷害 10% 更少。
   目前怪物只會打玩家（沒有怪打友方的接點），所以這裡只是旗標與倍率函式；以後有怪打友方時，在那個接點乘 tauntMul(m, 目標) */
const tauntMul = (m, tgt) => (m.ail && m.ail.taunt > G.t && tgt !== P ? 1 - DEBUFF.tauntLess / 100 : 1);

/* ---------- 詛咒與印記 ---------- */
/* 詛咒：每隻怪 1 個，新的蓋掉舊的；稀有度減效果 */
const CURSES = {
  enfeeble: { n: '衰弱', v: [20, 29], d: '造成的傷害更少 {}%' },
  eleweak: { n: '元素要害', v: [40, 59], d: '元素抗性 −{}%' },
  tchains: { n: '時空鎖鏈', v: [40, 59], d: '緩速 {}%' },
  vuln: { n: '脆弱', v: [30, 50], d: '護甲 −{}%' },
  despair: { n: '絕望', v: [35, 49], d: '混沌抗性 −{}%' }
};
/* 增益／減益的數值＝基礎 ×（1 + 效果%）×（1 + 幅度%），兩個分開相乘（0.2.42；光環效果 auraEff 歸增益效果）；幅度目前沒有來源 */
const buffM = () => (1 + ST.buffEff / 100) * (1 + ST.buffMag / 100),
  debuffM = () => (1 + ST.debuffEff / 100) * (1 + ST.debuffMag / 100);
const curseV = (k, lv) => {
  const [a, b] = CURSES[k].v;
  return a + ((b - a) * (Math.min(20, lv) - 1)) / 19;
};
function curseMob(m, k, lv, q = 0) {
  /* 無咒的（怪物旗標 m.hexproof）：不受詛咒；玩家有 hexPierce 時你的詛咒能影響無咒敵人 */
  if (m.hexproof && !ST.hexPierce) return;
  const v = curseV(k, lv) * (1 - rarRed(m)) * debuffM();
  m.ail.curse = { k, v, t: G.t + 6 + 0.07 * lv, q };
  if (k === 'vuln') m.arm = m.arm0 * (1 - v / 100);
}
/* 印記：每隻怪 1 個；觸發時消耗，給球或 buff */
const MARKS = {
  sniper: { n: '狙擊手印記', d: '下一次被暴擊：這一下多 50% 傷害，給狂怒球' },
  freeze: { n: '冰凍印記', d: '冰凍累積 +50%；被冰凍時你得到附加冰冷 buff' },
  volt: { n: '電壓印記', d: '觸電累積 +50%；被觸電時你得到附加閃電 buff' },
  hound: { n: '獵犬印記', d: '流血會累積沉重暈眩；被沉重暈眩或死亡時血爆' },
  assassin: { n: '刺客印記', d: '被暴擊率 +5%；死亡時給暴擊球' },
  poacher: { n: '獵人印記', d: '被擊中時你回 1% 魔力；死亡時給狂怒球、回 5% 生命' },
  warlord: { n: '軍閥印記', d: '被擊中時你回 0.5% 生命；死亡時給耐力球' },
  falcon: { n: '獵鷹印記', d: '被擊中時傷害更多 10% 並消耗（昇華「風行神射」）' }
};
function markMob(m, k, q = 0) {
  for (const o of G.mobs) if (o.ail && o.ail.mark && o.ail.mark.k === k && o !== m && !ST.multiMark) o.ail.mark = null;
  m.ail.mark = { k, q };
}

/* ---------- 能量球（照 PoE2：只是資源，持有不加數值；15 秒） ---------- */
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
  arcane: { n: '秘能波動', d: '施法速度 +15%、魔力回復更多 20%' },
  unholy: { n: '不潔之力', d: '多造成全部傷害 30% 的混沌傷害' },
  archon: { n: '元素化身', d: '法術的元素傷害更多 25%、冰凍累積 +100%、易燃 +100%、感電機率 +100%' },
  phasing: { n: '相位', d: '可以穿過敵人' },
  howl: { n: '怒號', d: '閃避值 +30%、滿血時傷害 +40%' }
};
function gainBuff(k, t) {
  (P.buf = P.buf || {})[k] = Math.max(P.buf[k] || 0, G.t + t);
}
/* 讀檔時角色（P）還沒建立：當作沒有 buff */
const hasBuff = k => !!(P && P.buf && P.buf[k] > G.t);
/* 貧血、貧魔、貧能量護盾（0.2.42）：低於最大值的 LOW（35%）；沒有最大值的算沒有 */
const lowHp = () => P.hp < ST.hp * LOW,
  lowMp = () => P.mp < ST.mp * LOW,
  lowEs = () => ST.es > 0 && P.es < ST.es * LOW;
/* 技能速度、移動速度（給 speedMul／moveMul） */
/* 0.2.42：技能速度（ST.ss、猛攻 +20%、流順之風每層 +2%）跟攻擊速度同一個「提高」池相加；ST.as 已在 asM 裡，這裡只乘上多出來的部分 */
const buffSpeed = () =>
  (1 + (ST.as + ST.ss + ((hasBuff('onslaught') ? 20 : 0) + 2 * (P.tail || 0)) * buffM()) / 100) / (1 + ST.as / 100);
/* 疾風化身（0.2.25）：流順之風滿 10 層（0.2.42 起層數是整數、不消退） */
const windFull = () => !!ST.windWalk && (P.tail || 0) >= 10;
/* 流順之風每層移動速度 +1%（聚風再 +1%）；疾風化身：滿 10 層 +10%；狂風：每顆狂怒球 +4% 移動速度；捨身突襲：2 秒內 +30% */
const buffMove = () =>
  (hasBuff('onslaught') ? 1 + 0.1 * buffM() : 1) *
  (windFull() ? 1.1 : 1) *
  (1 + (ST.gale ? 0.02 : 0.01) * (P.tail || 0) * buffM()) *
  (1 + ((ST.frenzyMs || 0) * chgN('f')) / 100) *
  (ST.sacrifice && P.sacT > G.t ? 1.3 : 1);
/* 攻擊速度的暫時加成：狂風（每顆狂怒球 +4%） */
const atkBuf = () => 1 + ((ST.frenzyMs || 0) * chgN('f')) / 100;
/* 施放時移動（0.2.25 底層）：出手中照移動方向走，基礎移動速度的 35%（不吃移動速度加成）。
   位移技能（D.dist）自己控制位置，不走這裡 */
const CAST_MOVE = 0.35;
/* 聚風：用技能得 1 層流順之風 */
function galeUse() {
  if (ST.gale) P.tail = Math.min(10, (P.tail || 0) + 1);
}

/* ---------- 打中、擊殺時的觸發（hitMob／killMob 呼叫） ---------- */
function onHitBase(m, r, c) {
  const a = m.ail,
    melee = (c.D.tags || []).includes('melee');
  /* 盛怒：近戰擊中 +1（每 0.5 秒最多一次），最多 30；停止 4 秒後每 0.2 秒掉 1 */
  if (melee && ST.rageHit && !(P.rageCd > G.t))
    (P.rage = Math.min(rageCap(), (P.rage || 0) + ST.rageHit)), (P.rageCd = G.t + 0.5), (P.rageT = G.t);
  if (r.crit && ST.powOnCrit && roll(ST.powOnCrit)) gainChg('p');
  if (r.crit && qRoll(c.critChg)) gainChg('p');
  /* 觸電的品質：不能行動的怪被閃電擊中，跳一道電弧 */
  if (c.elcQ && a.elcT > G.t && r.pre.light > 0) zapNear(m, r.pre.light * 0.5 * c.elcQ, 1);
  if (r.spell && (c.arcane || roll(ST.arcaneHit))) gainBuff('arcane', 10);
  if (ST.tailwind && r.crit) P.tail = Math.min(10, (P.tail || 0) + 1);
  /* 致命陰影：暴擊時熵值累積，滿 100 給暴擊球；弱點獵殺：攻擊擊中給 1 層暴擊弱點 */
  if (r.crit && ST.powCritE && entropy('pow', ST.powCritE)) gainChg('p');
  if (ST.cwHit && (c.D.tags || []).includes('attack')) addCw(m, ST.cwHit);
  /* 印記 */
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
  if (ST.onsKill && roll(ST.onsKill)) gainBuff('onslaught', 4);
  if (ST.unholyKill && roll(ST.unholyKill)) gainBuff('unholy', 4);
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
  evMark('kill');
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
  if (a.intim > G.t && qRoll(20 * (a.intimQ || 0))) (P.rage = Math.min(rageCap(), (P.rage || 0) + 1)), (P.rageT = G.t);
  if (a.scorch && a.scorch.t > G.t && qRoll(20 * (a.scorch.q || 0))) dropRemnant('fire', m.x, m.y);
  if (a.brittle && a.brittle.t > G.t && a.brittle.q) chillNear(m, 120 * a.brittle.q, 2);
  for (const p of G.pools) if (p.c.q && Math.hypot(m.x - p.x, m.y - p.y) < p.r + m.r) p.dur += 0.25 * p.c.q;
  for (let i = 0; i < NSLOT; i++) {
    const g = S.skills[i] && S.skills[i].a,
      sp = g && g.sup.find(x => x && x.gem === 'cdr' && x.q && supOK(SKILLS[g.gem], x, g));
    if (sp) P.cds['s' + i] = Math.max(0, (P.cds['s' + i] || 0) - (0.2 * sp.q) / GEM_Q_MAX);
  }
}
/* 玩家這一格：盛怒消退、能量球與 buff 到期、玩家身上的異常、護符 */
function baseTick(dt) {
  if (P.rage && G.t - (P.rageT || 0) > 4) {
    P.rageDec = (P.rageDec || 0) + dt;
    while (P.rageDec >= 0.2 && P.rage > 0) (P.rageDec -= 0.2), (P.rage = Math.max(0, P.rage - 1));
  }
  const a = (P.ail = P.ail || {});
  let d = 0,
    skipEs = 0;
  ailReflow(a);
  if (a.ign && a.ign.t > G.t && !unaff('ign')) d += ailEff(a.ign) * (1 - effRes('fire') / 100);
  if (a.bleed && a.bleed.t > G.t && !unaff('bleed')) (d += ailEff(a.bleed)), (skipEs += ailEff(a.bleed));
  if (a.poi && a.poi.t > G.t && !unaff('poison')) {
    const v = a.poi.dps * (1 - effRes('chaos') / 100) * (1 + (5 * witherN(a)) / 100);
    (d += v), (skipEs += v);
  }
  /* 站在地面上的持續傷害（第 11 批）：跟流血、中毒一樣跳過能量護盾；只算最強一塊，荊棘地面只有移動時才算 */
  const gd = a.gd && a.gd.t > G.t && (!a.gd.mv || moving()) ? a.gd : null;
  if (gd) {
    const v = gd.v * (gd.el === 'phys' ? 1 : (1 - effRes(gd.el) / 100) * (1 + (5 * witherN(a)) / 100));
    (d += v), (skipEs += v);
  }
  if (a.frz) a.frz = Math.max(0, a.frz - 20 * dt);
  /* 緩速藤蔓：移動逐漸移除層數 */
  if (a.vine && a.vine.n > 0 && moving())
    for (a.vine.acc += dt; a.vine.acc >= DEBUFF.vineLose && a.vine.n > 0; a.vine.acc -= DEBUFF.vineLose) a.vine.n--;
  if (a.hs && !(a.hstun > G.t) && G.t - (a.hsA || 0) >= 8) a.hs = Math.max(0, a.hs - 5 * dt);
  if (d > 0) {
    /* 流血、中毒跳過能量護盾 */
    const viaEs = Math.min(P.es || 0, (d - skipEs) * dt);
    P.es = (P.es || 0) - viaEs;
    P.hp -= d * dt - viaEs;
    if (d * dt > viaEs) lifeLost();
    if (P.hp <= 0) {
      /* 死因：持續傷害裡最先算到的那一種（地面優先，點燃看是不是點燃地面上的） */
      const n = gd
        ? gd.n
        : a.ign && a.ign.t > G.t
          ? a.ign.by || '點燃'
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
  leechTick(dt);
  lifeRecTick(dt);
  recoupTick(dt);
  tickCharms(dt);
}

/* ---------- 玩家受傷（hurtPlayer 呼叫）：回傳 { d, ev, block, crit }，d 是扣完防禦的傷害 ---------- */
/* 抗性：扣完懲罰、上限是最大抗性（藏身處不扣） */
const effRes = k => {
  if (k === 'chaos' && ST.ci) return 100;
  const pen = k !== 'chaos' && G.scene === 'map' ? resPen(mobLv(G.mapT || 1)) : 0;
  const a = P.ail || {},
    cu = a.curse;
  let r = ST.res[k] - pen - expOf(a, k);
  if (
    cu &&
    cu.t > G.t &&
    !unaff('curse') &&
    ((cu.k === 'eleweak' && k !== 'chaos') || (cu.k === 'despair' && k === 'chaos'))
  )
    r -= cuV(a);
  return Math.min(ST.maxRes[k] + (k !== 'chaos' && G.scene === 'map' ? MM('pmaxres') : 0), r);
};
function hurtCalc(d, src, el, noEv) {
  const m = src && src.ail ? src : src && src.src && src.src.ail ? src.src : null;
  if (m) d *= mobDmgMul(m);
  /* 招架（mech.js）：窗口裡被打到＝擋下，攻擊者受招架 */
  if (!noEv && tryParry(m)) return { parry: 1 };
  const acc = (m ? m.acc : 15 + 6 * mobLv(G.mapT || 1)) * (m && m.ail.blind > G.t ? 0.8 : 1);
  /* 閃避：熵值（累積命中率到 100 才算打中），王的紅光大招（noEv）躲不掉 */
  if (!noEv) {
    /* 閃避值：流順之風每層 +10%、怒號 +30%（同池相加）；致盲少 20% */
    const hitCh = hitChance(
      acc,
      ST.ev *
        (1 + 0.1 * (P.tail || 0) + (hasBuff('howl') ? DEBUFF.howlEv / 100 : 0)) *
        (P.ail && P.ail.blind > G.t ? 0.8 : 1)
    );
    if (P.evE == null) P.evE = Math.random() * 100;
    P.evE += hitCh * 100;
    if (P.evE < 100) {
      /* 致盲的品質：致盲中的怪打不中你，回魔 */
      if (m && m.ail.blind > G.t && m.ail.blindQ) addMp(ST.mp * 0.01 * m.ail.blindQ);
      return { ev: 1 };
    }
    P.evE -= 100;
  }
  /* 格擋：真隨機（有上限、只減傷）；上限 50 套在幸運之後 */
  if (!noEv && !(P.ail && P.ail.hstun > G.t) && roll(capLuck(ST.block, 50, ST.lukBlock))) return { block: 1 };
  /* 偏斜（0.2.42）：閃避、格擋之後；這一下傷害 −40%（流順之風每層再 +1%）；紅光大招也有效 */
  const defl = roll(capLuck(deflCh(acc, ST.defl), 95, ST.lukDefl));
  if (defl) d *= 1 - Math.min(0.9, 0.4 + 0.01 * (P.tail || 0));
  /* 王、菁英會暴擊（5%，暴擊傷害加成 +60%）；地圖詞可以讓所有怪暴擊；bvNoCrit：格擋值還在時無法被暴擊 */
  const crit = m && !(ST.bvNoCrit && bvUp()) && roll((m.boss || m.elite ? 5 : 0) + MM('mcrit'));
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
      (cu && cu.k === 'vuln' && !unaff('curse') ? 1 - cuV(P.ail) / 100 : 1) *
      ((formOf() && formOf().armorM) || 1) *
      (still() ? 1 + 0.08 * (ST.aq.iron || 0) : 1);
  /* 承受轉換（0.2.26，熔岩之膚）：承受的物理有 x% 當作火焰承受（在減傷之前分出來，吃火焰抗性） */
  let asFire = 0;
  /* 適應（第 8 批）：每層該元素承受 −10%（less，在減傷這步）；ep 記每種元素這一下的量，供取最高的那種 */
  const ad = k => 1 - ADAPT.less * ((P.adapt && P.adapt[k]) || 0),
    ep = { fire: 0, cold: 0, light: 0 };
  if (el === 'phys' && ST.physAsFire) (asFire = (d * ST.physAsFire) / 100), (d -= asFire);
  if (el === 'phys') d *= 1 - Math.min(0.9, arm / (arm + 10 * d + 1));
  if (asFire) {
    const v = asFire * (1 - resHit('fire') / 100);
    (ep.fire += v), (d += v * ad('fire'));
  } else if (el !== 'phys') {
    d *= 1 - resHit(el) / 100;
    if (el in ep) (ep[el] = d), (d *= ad(el));
    /* 凋零：受到的混沌傷害提高 */
    if (el === 'chaos' && P.ail) d *= 1 + (5 * witherN(P.ail)) / 100;
  }
  /* 地圖詞「怪物多造成 20% 的某元素傷害」：另外照那個元素的抗性算 */
  for (const [f, k] of [
    ['addF', 'fire'],
    ['addC', 'cold'],
    ['addL', 'light']
  ])
    if (MM(f)) {
      const v = ((pre * MM(f)) / 100) * (1 - resHit(k) / 100);
      (ep[k] += v), (d += v * ad(k));
    }
  if (P.ail && P.ail.shock > G.t && !unaff('shock')) d *= 1.2;
  if (el !== 'phys' && el !== 'chaos' && formOf() && formOf().eleTaken) d *= formOf().eleTaken;
  /* 壓抑（開關 suppCh，機率上限 100%）：被壓抑的擊中傷害與它造成的異常傷害各防止 50%（異常照上，只是傷害減半） */
  const supp = ST.suppCh > 0 && roll(Math.min(DEBUFF.suppMax, ST.suppCh)),
    sm = supp ? 1 - DEBUFF.suppCut / 100 : 1;
  if (m) mobAilPlayer(m, pre, el, sm);
  /* 品質：殘喘的怪打中你回魔；被衰弱的怪打中得到守護（上限最大生命 50%） */
  if (m) {
    const sp = m.ail.sap,
      en = m.ail.curse;
    if (sp && sp.q && sp.t > G.t) addMp(ST.mp * 0.01 * sp.q);
    if (en && en.k === 'enfeeble' && en.q && en.t > G.t)
      P.guardV = Math.min(ST.hp * 0.5, (P.guardV || 0) + d * 0.2 * en.q);
  }
  /* 適應：這一下最高的那種元素 +1 層（這一下不受益） */
  if (ST.adapt) {
    const [k, v] = Object.entries(ep).sort((a, b) => b[1] - a[1])[0];
    if (v > 0) (P.adapt = P.adapt || {})[k] = Math.min(ADAPT.max, ((P.adapt || {})[k] || 0) + 1);
  }
  d = absorb(d * sm);
  return { d, crit, defl, supp };
}
/* 怪物對玩家上異常：照怪物類型（企劃書 7.2） */
function mobAilPlayer(m, d, el, dm = 1) {
  const a = (P.ail = P.ail || {}),
    thr = (ST.hp / 2) * (1 + ST.ailThrP / 100),
    ail = m.D.ail || '',
    imm = k => a.imm && a.imm[k] > G.t;
  /* 純淨的品質：元素異常有機率免疫 */
  if (el !== 'phys' && el !== 'chaos' && qRoll(20 * (ST.aq.purity || 0))) return;
  /* 被油纏身：被施加的易燃 200% 更多（玩家被打沒有累積條，直接乘在機率上） */
  if (
    el === 'fire' &&
    !imm('ign') &&
    Math.random() < Math.min(1, (d / thr) * 0.2 * (a.oiled > G.t ? DEBUFF.oilFlam : 1))
  )
    a.ign = keepMax(a.ign, d * 0.2 * dm, 4);
  if (el === 'cold' && !imm('chill')) {
    const v = Math.min(50, (d / thr) * 100);
    if (v >= 30) a.chill = { v, t: G.t + 2 };
  }
  if (el === 'light' && !imm('shock') && roll(((d / thr) * 100) / 4)) a.shock = G.t + 4;
  /* 冰凍累積：滿了凍住 1.5 秒（玩家的比怪物短，不然太難受） */
  if (el === 'cold' && !imm('frz') && !ST.stand) {
    a.frz = (a.frz || 0) + (d / thr) * 50;
    if (a.frz >= 100) (a.frozen = G.t + 1.5), (a.frz = 0);
  }
  if (!imm('bleed') && !ST.ci && Math.random() < (ail === 'bleed' ? 0.25 : 0) + MM('mbleed') / 100)
    a.bleed = keepMax(a.bleed, d * 0.15 * dm, 5);
  if (!imm('poi') && Math.random() < (ail === 'poison' ? 0.3 : 0) + MM('mpoi') / 100)
    a.poi = { dps: d * 0.2 * dm, t: G.t + 2 };
  if (!imm('ign') && roll(MM('mign'))) a.ign = keepMax(a.ign, d * 0.2 * dm, 4);
  /* 緩速藤蔓：怪物（D.vine＝層數）打中你時施加 */
  if (m.D.vine) vineAdd(m.D.vine);
  trigCharms(el, a);
}
/* 玩家暈眩（0.2.42，照 PoE2）：門檻＝最大生命 ×（1 + 暈眩門檻提高）；時間 ÷ (1 + 暈眩恢復) */
const pStunThr = () => ST.hp * (1 + ST.stunThrP / 100),
  pStunSec = s => s / (1 + ST.stunRec / 100),
  /* 僵直中不能出招（可以移動、翻滾）；沉重暈眩中不能動、翻滾、格擋、出招 */
  pStagger = () => P.stag > G.t,
  pHeavy = () => !!(P.ail && P.ail.hstun > G.t);
/* 僵直：被擊中時機率＝傷害 ÷ 門檻，低於 15% 不算（跟怪物的僵直一樣）；打斷正在出的招 */
function playerStagger(d) {
  const p = d / pStunThr();
  if (p >= 0.15 && Math.random() < p) (P.stag = G.t + pStunSec(0.5)), (P.act = null);
}
/* 玩家的沉重暈眩條：只有王的紅光大招（noEv）會累積。比照怪物的 poise()：每下累積 % ＝ 傷害 × 0.58 × 100 ÷ 門檻
   （物理 ×1.5、冰冷不累積）；累滿暈住 3 秒、條歸零；結束後門檻 +500%、16.5 秒線性退回；暈住期間不累積；8 秒沒累積每秒退 5%（baseTick） */
function playerHeavy(d, el) {
  const a = (P.ail = P.ail || {});
  if (el === 'cold' || !(d > 0) || a.hstun > G.t) return;
  const left = Math.max(0, Math.min(1, ((a.hsB || 0) - G.t) / 16.5));
  a.hs = (a.hs || 0) + (d * 0.58 * (el === 'phys' ? 1.5 : 1) * 100) / (pStunThr() * (1 + 5 * left));
  a.hsA = G.t;
  if (a.hs >= 100) {
    a.hstun = G.t + pStunSec(3);
    a.hsB = a.hstun + 16.5;
    a.hs = 0;
    P.act = null;
  }
}
/* 玩家被冰緩、時空鎖鏈時的移動、出手倍率 */
function playerSlow() {
  const a = P.ail || {};
  let s = 1;
  if ((a.frozen > G.t && !unaff('frozen')) || a.hstun > G.t) return 0;
  if (a.chill && a.chill.t > G.t && !(a.imm && a.imm.slow > G.t) && !unaff('chill')) s *= 1 - a.chill.v / 100;
  const cu = a.curse;
  if (cu && cu.t > G.t && cu.k === 'tchains' && !(a.imm && a.imm.slow > G.t) && !unaff('curse')) s *= 1 - cuV(a) / 100;
  /* 超重：每層緩速 10% */
  if (a.over && a.over.t > G.t && !unaff('over')) s *= 1 - (DEBUFF.overSlow * a.over.n) / 100;
  return s;
}
/* 超重（第 10 批，玩家減益）：重新施加疊層並刷新 4 秒，最多 5 層（⚠️）；來源還沒有 */
function encumber(n = 1) {
  const a = (P.ail = P.ail || {});
  a.over = { n: Math.min(DEBUFF.overMax, (a.over && a.over.t > G.t ? a.over.n : 0) + n), t: G.t + DEBUFF.overT };
}
/* 緩速藤蔓（第 10 批，怪物施加給玩家）：每層移動速度 −8%（只影響移動），最多 5 層；移動會逐漸移除層數（每移動 1 秒 1 層，⚠️） */
function vineAdd(n = 1) {
  const a = (P.ail = P.ail || {});
  a.vine = { n: Math.min(DEBUFF.vineMax, ((a.vine && a.vine.n) || 0) + n), acc: 0 };
}
const vineSlow = () => {
  const v = P.ail && P.ail.vine;
  return v && v.n > 0 && !unaff('vine') ? 1 - (DEBUFF.vineSlow * v.n) / 100 : 1;
};

/* 被油纏身（第 11 批）：只影響移動 */
const oilSlow = () => (P.ail && P.ail.oiled > G.t && !unaff('oil') ? 1 - DEBUFF.oilSlow / 100 : 1);

/* ---------- 護符（照 PoE2）：腰帶給 1～3 格，條件達成自動觸發，殺怪充能 ---------- */
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
/* 殺怪充能（跟藥劑一樣：普通 1、菁英 3、王 10） */
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
  elc: ['觸電', 'sup_sp_stun', '不能行動'],
  pin: ['釘身', 'ail_n_pin', '不能移動、不能被擊退，還能出招'],
  pinprime: ['可釘身', 'ail_n_arrow', '釘身累積到門檻，再累積一點就會釘身'],
  daze: ['目眩', 'ail_n_weak', '受到的沉重暈眩累積 +50%'],
  hstunP: ['沉重暈眩', 'ail_stun', '不能移動、翻滾、格擋、出招'],
  stun: ['暈眩', 'sup_sp_stun', '不能行動'],
  stagger: ['僵直', 'sup_sp_stun', '被一擊打中最大生命 15% 以上，不能行動 0.5 秒'],
  wither: ['凋零', 'sup_sp_wither', '受到的混沌傷害提高'],
  blind: ['致盲', 'sup_sp_ailx', '命中值降低'],
  broken: ['完全破甲', 'sup_sp_pen', '護甲歸零，受到的物理傷害提高'],
  parried: ['受招架', 'sup_sp_heavy', '受到的攻擊傷害更多、無法閃避攻擊'],
  intim: ['威嚇', 'sk_anger', '受到的傷害提高、造成的傷害降低'],
  mark: ['印記', 'sk_markshot', '被印記的怪觸發時給你效果'],
  scorch: ['焦灼', 'sup_sp_gfire', '元素抗性降低'],
  brittle: ['易碎', 'sk_frostarrow', '被擊中時暴擊率提高'],
  sap: ['殘喘', 'sk_arc', '造成的傷害降低'],
  exp: ['曝曬', 'sk_elemweak', '元素抗性降低'],
  rage: ['盛怒', 'sk_anger', '攻擊傷害更多'],
  ad_fire: ['火焰適應', 'sup_sp_gfire', '每層受到的火焰傷害少 10%；離開地圖清掉'],
  ad_cold: ['冰冷適應', 'sup_sp_gcold', '每層受到的冰冷傷害少 10%；離開地圖清掉'],
  ad_light: ['閃電適應', 'sup_sp_glight', '每層受到的閃電傷害少 10%；離開地圖清掉'],
  tail: ['流順之風', 'sk_hasteaura', '每層移動速度 +1%、技能速度 +2%、閃避值 +10%、偏斜減傷 +1%；被擊中清空'],
  elcprime: ['可觸電', 'ail_shock', '觸電累積到門檻，再累積一點就會觸電；本身沒有效果'],
  frzprime: ['可冰凍', 'ail_frozen', '冰凍累積到門檻，再累積一點就會冰凍；本身沒有效果'],
  crush: ['壓碎', 'ail_doom', '物理傷害減免 −15 個百分點，可以變負（受到更多）'],
  shatter: ['破碎護甲', 'ail_vul', '完全破甲期間，受到的物理擊中傷害再 +20%；不能再被破甲'],
  riven: ['碎甲', 'ail_n_seal', '你之後的攻擊擊中多一筆獨立附加物理；不能再被破甲'],
  unbr: ['卸防姿態', 'ail_guard', '你之後的攻擊擊中多一筆獨立附加物理；不能再被目眩'],
  crip: ['完全跛行', 'ail_slow', '閃避值歸零，你的攻擊必定命中'],
  stain: ['血漬', 'ail_dmark', '流血累積 6 秒得到；目前沒有技能消耗它'],
  inc: ['切割', 'ail_stacks', '每層擊中造成流血機率 +10%；造成流血後全部移除'],
  cb: ['腐化之血', 'ail_n_corrode', '每層獨立的物理持續傷害，不是流血'],
  anemia: ['缺血', 'ail_bleed', '腐化之血的層數上限 +缺血幅度'],
  petr: ['石化', 'ail_empN', '不能移動、不能行動'],
  calm: ['平靜', 'ail_shield', '造成的傷害為 0'],
  weak: ['虛弱', 'ail_chgN', '移動速度 −20%、造成的傷害 −10%'],
  taunt: ['嘲諷', 'ail_mark', '只能以你為目標，對你以外的目標傷害少 10%'],
  wet: ['濕透', 'ail_burn', '感電機率 50% 更多、冰凍累積 25% 更多'],
  easy: ['易攻目標', 'ail_comboN', '下一次投射物攻擊擊中受到更多傷害，擊中後消耗'],
  over: ['超重', 'ail_slow', '每層緩速 10%，重新施加疊層並刷新'],
  vine: ['緩速藤蔓', 'ail_n_corrode', '每層移動速度 −8%；移動會逐漸移除層數'],
  oiled: ['被油纏身', 'ail_n_burn', '移動速度 −30%、火焰抗性 −20%、被施加的易燃 200% 更多'],
  cons: ['奉獻地面', 'sk_sanct', '每秒回復生命，身上的詛咒效果少 50%'],
  gd: ['地面傷害', 'ail_poison', '站在地面上持續受傷，離開就停'],
  chg_e: ['耐力球', 'sup_sp_heavy', '能量球資源'],
  chg_f: ['狂怒球', 'sk_anger', '能量球資源'],
  chg_p: ['暴擊球', 'sk_precise', '能量球資源'],
  onslaught: ['猛攻', 'sk_hasteaura', BUFF.onslaught.d],
  arcane: ['秘能波動', 'sk_clarity', BUFF.arcane.d],
  unholy: ['不潔之力', 'sk_despair', BUFF.unholy.d],
  archon: ['元素化身', 'sk_elemweak', BUFF.archon.d],
  phasing: ['相位', 'sk_hasteaura', BUFF.phasing.d],
  howl: ['怒號', 'sk_bloodhowl', BUFF.howl.d],
  frostMark: ['附加冰冷', 'sk_frostarrow', '冰凍印記給的效果'],
  voltMark: ['附加閃電', 'sk_arc', '電壓印記給的效果'],
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
  if (a.pinT > G.t) add('pin', a.pinT);
  else if (hasState(m, 'pinprime')) add('pinprime');
  if (a.daze > G.t) add('daze', a.daze);
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
  /* 第 10 批 */
  if (hasState(m, 'elcprime')) add('elcprime');
  else if (hasState(m, 'frzprime')) add('frzprime');
  if (a.crush > G.t) add('crush', a.crush);
  if (a.shatter > G.t && a.broken > G.t) add('shatter', a.shatter);
  if (rivenOn(a)) add('riven', a.riven.t);
  if (unbrOn(a)) add('unbr', a.unbr.t);
  if (a.crip > G.t) add('crip', a.crip);
  if (a.stain > G.t) add('stain', a.stain);
  if (a.inc > 0) add('inc', null, a.inc);
  const cb = (a.cb || []).filter(x => x.t > G.t);
  if (cb.length) add('cb', mx(cb.map(x => x.t)), cb.length);
  if (a.anemia && a.anemia.t > G.t) add('anemia', a.anemia.t, Math.floor(a.anemia.v));
  if (a.easy && a.easy.t > G.t) add('easy', a.easy.t);
  for (const k of ['petr', 'calm', 'weak', 'taunt', 'wet', 'oiled', 'cons', 'howl']) if (a[k] > G.t) add(k, a[k]);
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
  add('stagger', P.stag, bad);
  add('hstunP', a.hstun, bad);
  add('blind', a.blind, bad);
  add('exp', a.exp, bad);
  add('oiled', a.oiled, bad);
  if (witherN(a)) add('wither', Math.max(...a.wither), { bad: 1, c: witherN(a) });
  if (a.gd) add('gd', a.gd.t, { bad: 1, n: a.gd.n });
  add('cons', a.cons);
  if (a.over && a.over.t > G.t) add('over', a.over.t, { bad: 1, c: a.over.n });
  if (a.vine && a.vine.n > 0) add('vine', null, { bad: 1, c: a.vine.n });
  if (a.curse && a.curse.t > G.t) {
    const C = CURSES[a.curse.k];
    L.push({
      k: 'c',
      n: C.n,
      ic: curseIc(a.curse.k),
      d: C.d.replace('{}', Math.round(cuV(a))),
      t: a.curse.t - G.t,
      f: stFrac(P, 'curse', a.curse.t),
      bad: 1
    });
  }
  for (const k of Object.keys(BUFF)) if (STATE[k]) add(k, P.buf && P.buf[k]);
  for (const k of ['frostMark', 'voltMark']) add(k, P.buf && P.buf[k]);
  for (const k of ['e', 'f', 'p']) if (chgN(k)) add('chg_' + k, P.chg[k].t, { c: chgN(k) });
  if (P.rage > 0) add('rage', null, { c: Math.ceil(P.rage) });
  for (const k of ['fire', 'cold', 'light']) if (P.adapt && P.adapt[k]) add('ad_' + k, null, { c: P.adapt[k] });
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
