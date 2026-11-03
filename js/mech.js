/* dungeonPOE · 技能用的底層新機制（0.2.10，照 PoE2；規則在 docs/企劃書.md 7.3）：
   收割、地面效果與引爆器、殘留物與灌注、屍體、連擊數與段數、招架與失衡、能量與觸發（Meta）、手雷、彈藥、飛劍、幻影、
   旗幟與榮耀、變身。技能（0.2.11 起）只呼叫這裡的函式，不自己發明規則。 */
'use strict';

/* ---------- 1. 收割：消耗敵人身上的狀態，回傳有沒有（有的話清掉） ---------- */
const PRIMED = m => (m.boss ? 70 : m.elite ? 60 : 40);
function hasState(m, k) {
  const a = m.ail || {};
  if (k === 'frozen') return a.frozen > G.t;
  if (k === 'broken') return a.broken > G.t;
  if (k === 'primed') return (a.hs || 0) >= PRIMED(m);
  if (k === 'bleed') return !!(a.bleed && a.bleed.t > G.t);
  if (k === 'ign') return !!(a.ign && a.ign.t > G.t);
  if (k === 'shock') return a.shock > G.t;
  if (k === 'curse') return !!(a.curse && a.curse.t > G.t);
  if (k === 'mark') return !!a.mark;
  if (k === 'parried') return a.parried > G.t;
  return false;
}
function takeState(m, k) {
  if (!hasState(m, k)) return false;
  const a = m.ail;
  if (k === 'frozen') a.frozen = 0;
  else if (k === 'broken') (a.broken = 0), (m.arm = m.arm0);
  else if (k === 'primed') a.hs = 0;
  else if (k === 'bleed' || k === 'ign' || k === 'curse' || k === 'mark') a[k] = null;
  else a[k] = 0;
  return true;
}
/* 碾壓一擊：打中瀕臨重暈的怪直接重暈 */
function crush(m) {
  if (!takeState(m, 'primed')) return false;
  m.ail.hstun = G.t + (m.boss ? 1.2 : 3);
  fxs('slam', m.x, m.y, m.r * 1.5);
  return true;
}

/* ---------- 2、3. 地面效果與引爆器 ---------- */
const GROUND = {
  jagged: { n: '碎裂地面', col: '#b08a5a', slow: 0.3 },
  gas: { n: '毒氣雲', col: '#8fd16b', burn: 1 },
  oil: { n: '油', col: '#4a3a2a', slow: 0.3, burn: 1 },
  fire: { n: '燃燒地面', col: '#ff6b3d' },
  chill: { n: '冰緩地面', col: '#8fd6ff' },
  blades: { n: '劍陣', col: '#e8e2d6' },
  /* 0.2.13 死亡紅花：每秒吸血的持續傷害，時間到或被引爆就整排爆炸＋流血 */
  bloom: { n: '死亡紅花', col: '#d9304a', leech: 0.2 }
};
/* o：k 種類、x、y、r、dur 秒、c 技能設定（傷害照它算）、dps 每秒傷害倍率、after 結束時再打一次的倍率（餘震） */
function addGround(o) {
  G.ground.push({ t: 0, dur: 4, dps: 0, ...o });
}
const inGround = (g, o) => Math.hypot(o.x - g.x, o.y - g.y) < g.r + (o.r || 0);
/* 引爆：範圍裡可燃的地面爆炸（油變成燃燒地面）、手雷提早爆、插地的飛劍爆 */
function detonate(x, y, r, c) {
  for (const g of G.ground) {
    if (Math.hypot(g.x - x, g.y - y) > g.r + r || g.done) continue;
    if (GROUND[g.k].burn) {
      g.done = 1;
      boomAt(g.x, g.y, g.r * 1.2, g.c || c, 1.5, 'fire');
      if (g.k === 'oil') addGround({ k: 'fire', x: g.x, y: g.y, r: g.r, dur: 4, c: g.c || c, dps: 0.3 });
    } else if (g.k === 'blades') (g.done = 1), boomAt(g.x, g.y, g.r, g.c || c, 0.6 * (g.n || 1));
    else if (g.k === 'bloom') popBlooms();
  }
  for (const n of G.grenades) if (Math.hypot(n.x - x, n.y - y) < r + 30) n.fuse = 0;
}
/* 一次範圍爆炸：用技能 c 的數值、倍率 mul，el 指定的話整下轉成那個屬性 */
function boomAt(x, y, r, c, mul = 1, el) {
  if (!c) return;
  const cc = el ? { ...c, D: { ...c.D, el, tags: [...(c.D.tags || []), 'aoe'] } } : c;
  fx({ k: 'ring', x, y, r, dur: 0.3, col: el ? ELC[el] : '#fff3d6' });
  for (const m of G.mobs)
    if (m.hp > 0 && Math.hypot(m.x - x, m.y - y) < r + m.r)
      hitMob(m, cc, Math.atan2(m.y - y, m.x - x), 120, { quiet: 1, mult: (cc.mult || 1) * mul, from: { x, y } });
}
/* 死亡紅花爆炸：一朵一次範圍物理擊中（技能的 boomM），一定流血；場上只有一排，一朵爆就整排爆 */
function popBlooms() {
  for (const g of G.ground)
    if (g.k === 'bloom' && !g.done) {
      g.done = 1;
      boomAt(g.x, g.y, g.r * 1.4, { ...g.c, bleedCh: 100, spellBleed: 1 }, g.c.D.boomM / g.c.D.m);
      fxs('bleed', g.x, g.y - 10, 30);
    }
}
function groundTick(dt) {
  for (const g of G.ground) {
    g.t += dt;
    const G0 = GROUND[g.k];
    if (g.dps && g.c && (g.tick = (g.tick || 0) - dt) <= 0) {
      g.tick = 0.5;
      for (const m of G.mobs)
        if (m.hp > 0 && inGround(g, m)) {
          if (g.k === 'gas' && !hasState(m, 'poison')) fxs('poisoned', m.x, m.y - m.sz * 0.3, m.sz * 0.5);
          hitMob(m, g.k === 'gas' ? { ...g.c, poisonCh: 100 } : G0.leech ? { ...g.c, leech: G0.leech } : g.c, 0, 0, {
            quiet: 1,
            mult: g.c.mult * g.dps * 0.5,
            from: g
          });
        }
    }
    if (g.k === 'chill') for (const m of G.mobs) if (m.hp > 0 && inGround(g, m)) m.ail.chill = { v: 30, t: G.t + 0.5 };
    if (G0.slow) for (const m of G.mobs) if (m.hp > 0 && inGround(g, m)) m.gslow = G.t + 0.2;
    /* 餘震：結束時再打一次 */
    if (g.t >= g.dur && !g.done) {
      g.done = 1;
      if (g.after) boomAt(g.x, g.y, g.r, g.c, g.after);
      if (g.k === 'bloom') (g.done = 0), popBlooms();
    }
  }
  G.ground = G.ground.filter(g => !g.done);
}
/* 火焰擊中點燃可燃的地面（hitMob 呼叫） */
function igniteAt(x, y) {
  for (const g of G.ground)
    if (GROUND[g.k].burn && !g.done && Math.hypot(g.x - x, g.y - y) < g.r) detonate(g.x, g.y, 1, g.c);
}

/* ---------- 4. 殘留物與灌注 ---------- */
function dropRemnant(el, x, y) {
  if (G.remnants.length < 20) G.remnants.push({ el, x: x + rnd(-20, 20), y: y + rnd(-20, 20), t: G.t + 15 });
}
const infN = el => (P.inf && P.inf[el] && P.inf[el].t > G.t ? P.inf[el].n : 0);
function takeInf(el) {
  if (!infN(el)) return false;
  P.inf[el].n--;
  return true;
}
function remnantTick() {
  for (const r of G.remnants)
    if (Math.hypot(r.x - P.x, r.y - P.y) < 40) {
      const I = (P.inf = P.inf || {}),
        cur = infN(r.el);
      I[r.el] = { n: Math.min(3, cur + 1), t: G.t + 20 };
      r.t = 0;
      fx({ k: 'ring', x: P.x, y: P.y, r: 30, dur: 0.25, col: ELC[r.el] });
    }
  G.remnants = G.remnants.filter(r => r.t > G.t);
}

/* ---------- 5. 屍體 ---------- */
function addCorpse(m) {
  G.corpses.push({ x: m.x, y: m.y, sz: m.sz, mhp: m.mhp, rare: m.elite || m.boss, sp: m.D.sp, t: G.t + 15 });
  if (G.corpses.length > 30) G.corpses.shift();
}
/* 消耗 (x, y) 附近 r 內最近的一具屍體 */
function takeCorpse(x, y, r) {
  let best = null,
    bd = r;
  for (const c of G.corpses) {
    const d = Math.hypot(c.x - x, c.y - y);
    if (c.t > G.t && d < bd) (bd = d), (best = c);
  }
  if (best) G.corpses.splice(G.corpses.indexOf(best), 1);
  return best;
}

/* ---------- 6. 連擊數與段數 ---------- */
const COMBO_MAX = 10;
function comboHit(a) {
  if (!a || a.combo) return;
  a.combo = 1;
  P.combo = Math.min(COMBO_MAX, (P.combo || 0) + 1);
  P.comboT = G.t;
}
const comboN = () => (P.combo && G.t - (P.comboT || 0) < 8 ? P.combo : 0);
function useCombo() {
  const n = comboN();
  P.combo = 0;
  return n;
}
/* 同一招 1 秒內再按＝下一段（0、1、2…，最多 max−1） */
function nextStage(k, max = 3) {
  const s = (P.stage = P.stage || {}),
    cur = s[k] && G.t - s[k].t < 1 ? (s[k].n + 1) % max : 0;
  s[k] = { n: cur, t: G.t };
  return cur;
}

/* ---------- 7. 招架與失衡 ---------- */
function startParry(t = 0.4) {
  P.parryT = G.t + t;
}
/* hurtCalc 呼叫：招架窗口裡被近戰或投射物打到＝擋下，攻擊者失衡 */
function tryParry(m) {
  if (!(P.parryT > G.t) || !m || !m.ail) return false;
  m.ail.parried = G.t + 4;
  fxs('block', P.x, P.y);
  num(P.x, P.y - 60, 0, 'block', '招架');
  return true;
}

/* ---------- 8. 能量與觸發（Meta 寶石） ---------- */
const ENERGY = { crit: 10, perfect: 40, block: 25, kill: 5 };
/* 事件：插了觸發輔助（暴擊施放）的法術照輔助的條件累積能量（存在輔助寶石上），滿 100 對最近的敵人施放那招 */
function metaEvent(kind, near) {
  const full = [];
  for (let i = 0; i < NSLOT; i++) {
    const g = S.skills[i] && S.skills[i].a,
      sp = metaOf(g);
    if (!sp || SUPPORTS[sp.gem].meta !== kind) continue;
    /* 影咒（0.2.26）：暴擊的能量 +10 → +20 */
    sp.en = Math.min(200, (sp.en || 0) + ENERGY[kind] * (kind === 'crit' && ST.hexCoc ? 2 : 1));
    if (sp.en >= 100) full.push([g, sp]);
  }
  if (!full.length) return;
  const t = near || G.mobs.filter(m => m.hp > 0).sort((a, b) => dist(a, P) - dist(b, P))[0];
  if (!t) return;
  for (const [, sp] of full) sp.en -= 100;
  /* 咒爆（0.2.26）：有一顆滿了，所有插了觸發輔助的法術一起放（沒滿的不扣能量） */
  if (ST.hexBurst) hexBurst(t);
  else for (const [g] of full) castGem(g, t);
}
function hexBurst(t) {
  for (let i = 0; i < NSLOT; i++) {
    const g = S.skills[i] && S.skills[i].a;
    if (metaOf(g)) castGem(g, t);
  }
}
/* 不經技能欄、直接施放一顆技能寶石（觸發、幻影用） */
function castGem(g, t) {
  const c = gemCfg(g, -1);
  if (!c) return;
  const ang = Math.atan2(t.y - P.y, t.x - P.x);
  actHit({ k: c.k, c, t: 0, dur: 0.1, ang, hits: [0], n: 0, tx: t.x, ty: t.y, trig: 1 }, 0);
}

/* ---------- 9. 手雷 ---------- */
/* 丟手雷：往目標飛，落地彈跳，引信到或被引爆才爆；o：fuse、r 爆炸半徑、mul、el、onBoom(x, y) */
function throwGrenade(c, tx, ty, o = {}) {
  const ang = Math.atan2(ty - P.y, tx - P.x),
    d = Math.min(380, Math.hypot(tx - P.x, ty - P.y)),
    sp = d / 0.45;
  G.grenades.push({
    x: P.x,
    y: P.y - 10,
    vx: Math.cos(ang) * sp,
    vy: Math.sin(ang) * sp,
    c,
    fuse: o.fuse || 1.5,
    r: o.r || 100,
    mul: o.mul || 1,
    el: o.el,
    onBoom: o.onBoom,
    t: 0
  });
}
/* 手雷技能的次數：用掉的每顆各自冷卻 */
function grenadeReady(k, max, cd) {
  const q = ((P.gren = P.gren || {})[k] = (P.gren[k] || []).filter(t => t > G.t));
  if (q.length >= max) return false;
  q.push(G.t + cd);
  return true;
}
function grenadeTick(dt) {
  for (const n of G.grenades) {
    n.t += dt;
    n.fuse -= dt;
    const f = Math.exp(-dt * 3);
    let nx = n.x + n.vx * dt,
      ny = n.y + n.vy * dt;
    /* 撞牆彈回 */
    if (isWall(nx, n.y)) (n.vx = -n.vx * 0.6), (nx = n.x);
    if (isWall(n.x, ny)) (n.vy = -n.vy * 0.6), (ny = n.y);
    (n.x = nx), (n.y = ny), (n.vx *= f), (n.vy *= f);
    if (n.fuse <= 0) {
      n.done = 1;
      boomAt(n.x, n.y, n.r, n.c, n.mul, n.el);
      fxs('boom', n.x, n.y, n.r);
      sfx('slam');
      if (n.onBoom) n.onBoom(n.x, n.y);
    }
  }
  G.grenades = G.grenades.filter(n => !n.done);
}

/* ---------- 10. 彈藥 ---------- */
/* 射一發；彈夾空了開始裝填（這段時間這招不能用）。回傳能不能射 */
function ammoUse(k, clip, reload) {
  const A = ((P.ammo = P.ammo || {})[k] = P.ammo[k] || { n: clip, until: 0 });
  if (A.until > G.t) return false;
  if (A.until && A.until <= G.t) (A.n = clip), (A.until = 0);
  A.n--;
  if (A.n <= 0) A.until = G.t + reload;
  return true;
}
const ammoLeft = k => (P.ammo && P.ammo[k] ? (P.ammo[k].until > G.t ? 0 : P.ammo[k].n) : null);

/* ---------- 11. 飛劍 ---------- */
const SWORD_MAX = 10;
function gainSwords(n, c) {
  P.swords = (P.swords || []).filter(s => s.t > G.t);
  for (let i = 0; i < n && P.swords.length < SWORD_MAX; i++) P.swords.push({ t: G.t + 15, c });
}
const swordN = () => (P.swords || []).filter(s => s.t > G.t).length;
/* 全部射出：每把都是一次投射物擊中（用召喚時的技能數值、倍率 mul） */
function launchSwords(tx, ty, mul = 1) {
  const sw = (P.swords || []).filter(s => s.t > G.t);
  P.swords = [];
  sw.forEach((s, i) => {
    const ang = Math.atan2(ty - P.y, tx - P.x) + (i - (sw.length - 1) / 2) * 0.08;
    shoot(ang, 900, { ...s.c, mult: s.c.mult * mul, pierce: 1 }, {}, { life: 0.8, hitfx: 'mmhit' });
  });
  return sw.length;
}
/* 劍陣：飛劍插在地上，被引爆器引爆 */
function plantSwords(x, y, c) {
  const n = swordN();
  if (!n) return 0;
  P.swords = [];
  addGround({ k: 'blades', x, y, r: 70 + n * 6, dur: 8, c, n });
  return n;
}

/* ---------- 12. 幻影 ---------- */
/* 在 (x, y) 召出分身：dur 秒內每 every 秒從自己的位置出招一次，傷害 ×mul；
   g 是 null 時（0.2.25）每次從你裝著的攻擊技能隨機挑一招（用那顆寶石的等級與輔助）；src 是來源（幻影獵手限 2 個） */
function spawnMirage(g, x, y, dur = 4, every = 1, mul = 0.6, src) {
  G.mirages.push({ g, x, y, t: G.t + dur, next: G.t + 0.3, every, mul, src });
}
/* 幻影能用的攻擊技能：不用位移、放單位、資源（屍體、榮耀、飛出去的盾）、要指定目標的，也不能是幻影斬自己 */
const MIRAGE_NO = new Set(['mirage', 'shieldthrow', 'banner', 'corpseboom', 'paperdoll']);
function mirageGem() {
  const gs = S.skills
    .map(k => k.a)
    .filter(g => {
      const D = g && SKILLS[g.gem];
      return (
        D &&
        D.tags.includes('attack') &&
        !D.dist &&
        !D.unit &&
        !D.toMob &&
        !MIRAGE_NO.has(g.gem) &&
        wtOK(D) &&
        !metaOf(g)
      );
    });
  return gs.length ? pick(gs) : mkGem('slash');
}
/* 幻影獵手（昇華「風行神射」）：擊中熵值 +20，滿了在身邊生成幻影（同時最多 2 個、4 秒） */
function mirageHunt() {
  if (!entropy('mirage', 20) || G.mirages.filter(M => M.src === 'hunt' && M.t > G.t).length >= 2) return;
  const a = Math.random() * TAU,
    x = P.x + Math.cos(a) * 60,
    y = P.y + Math.sin(a) * 60,
    ok = !isWall(x, y);
  spawnMirage(null, ok ? x : P.x, ok ? y : P.y, 4, 0.8, 0.6, 'hunt');
  fxs('blinkin', ok ? x : P.x, ok ? y : P.y, 40);
}
function mirageTick() {
  for (const M of G.mirages) {
    if (M.next > G.t) continue;
    M.next = G.t + M.every;
    const t = G.mobs
      .filter(m => m.hp > 0 && Math.hypot(m.x - M.x, m.y - M.y) < 500)
      .sort((a, b) => Math.hypot(a.x - M.x, a.y - M.y) - Math.hypot(b.x - M.x, b.y - M.y))[0];
    if (!t) continue;
    /* 暫時把施放點換成分身的位置（跟場上單位一樣的做法） */
    const px = P.x,
      py = P.y,
      c = gemCfg(M.g || mirageGem(), -1);
    if (!c) continue;
    c.more *= M.mul;
    P.x = M.x;
    P.y = M.y;
    actHit(
      { k: c.k, c, t: 0, dur: 0.1, ang: Math.atan2(t.y - M.y, t.x - M.x), hits: [0], n: 0, tx: t.x, ty: t.y, trig: 1 },
      0
    );
    P.x = px;
    P.y = py;
  }
  G.mirages = G.mirages.filter(M => M.t > G.t);
}

/* ---------- 13. 旗幟與榮耀 ---------- */
function gainGlory(v) {
  P.glory = Math.min(100, (P.glory || 0) + v);
}
/* 插旗：榮耀滿 100 才能插；buff 是 stats 欄位 → 數值（例 { atkP: 20 }），站在旗子範圍裡才有效 */
function plantBanner(buff, r = 220, dur = 10) {
  if ((P.glory || 0) < 100) return false;
  P.glory = 0;
  G.banner = { x: P.x, y: P.y, r, t: G.t + dur, buff };
  return true;
}
const bannerOn = () => !!G.banner && G.banner.t > G.t && Math.hypot(P.x - G.banner.x, P.y - G.banner.y) < G.banner.r;

/* ---------- 14. 變身 ---------- */
const FORMS = {
  bear: { n: '熊', armorM: 1.5, move: 0.9, atk: 1 },
  wolf: { n: '狼人', move: 1.15, atk: 1.1 },
  wyvern: { n: '飛龍', move: 1.05, eleTaken: 0.9, atk: 1 }
};
/* 技能有 D.form 就變成那個形態；用了不是這個形態的技能就變回來（useSlot 呼叫） */
function formFor(D) {
  P.form = D.form || null;
}
const formOf = () => (P.form ? FORMS[P.form] : null);

/* ---------- 每格、進場、畫面 ---------- */
function mechEnter() {
  Object.assign(G, { ground: [], remnants: [], corpses: [], grenades: [], mirages: [], banner: null });
  Object.assign(P, {
    combo: 0,
    stage: {},
    parryT: 0,
    inf: {},
    swords: [],
    glory: 0,
    form: null,
    ammo: {},
    gren: {}
  });
}
function mechTick(dt) {
  groundTick(dt);
  remnantTick();
  grenadeTick(dt);
  mirageTick();
  G.corpses = G.corpses.filter(c => c.t > G.t);
}
function drawMech() {
  for (const g of G.ground) {
    const C = GROUND[g.k],
      f = Math.min(1, (g.dur - g.t) / 0.5);
    if (g.k === 'bloom') {
      /* 紅花：五片花瓣，快爆的時候變大、跳得更快 */
      const k = g.t / g.dur,
        s = (8 + 6 * k) * (1 + 0.08 * Math.sin(G.t * (6 + 14 * k))),
        y = g.y - 6;
      CX.globalAlpha = 0.18;
      CX.fillStyle = C.col;
      CX.beginPath();
      CX.ellipse(g.x, g.y, g.r, g.r * 0.6, 0, 0, TAU);
      CX.fill();
      CX.globalAlpha = 1;
      for (let i = 0; i < 5; i++) {
        const q = (i / 5) * TAU + g.x;
        CX.beginPath();
        CX.arc(g.x + Math.cos(q) * s * 0.7, y + Math.sin(q) * s * 0.5, s * 0.55, 0, TAU);
        CX.fill();
      }
      CX.fillStyle = '#ffd166';
      CX.beginPath();
      CX.arc(g.x, y, s * 0.3, 0, TAU);
      CX.fill();
      continue;
    }
    CX.globalAlpha = 0.22 * f;
    CX.fillStyle = C.col;
    CX.beginPath();
    CX.ellipse(g.x, g.y, g.r, g.r * 0.75, 0, 0, TAU);
    CX.fill();
    CX.globalAlpha = 0.5 * f;
    CX.strokeStyle = C.col;
    CX.lineWidth = 2;
    CX.stroke();
  }
  CX.globalAlpha = 1;
  for (const c of G.corpses) {
    CX.globalAlpha = 0.4;
    CX.fillStyle = '#3a1a14';
    CX.beginPath();
    CX.ellipse(c.x, c.y, c.sz * 0.35, c.sz * 0.15, 0, 0, TAU);
    CX.fill();
  }
  for (const r of G.remnants) {
    CX.globalAlpha = 0.6 + 0.3 * Math.sin(G.t * 6 + r.x);
    CX.fillStyle = ELC[r.el];
    CX.beginPath();
    CX.arc(r.x, r.y - 12, 6, 0, TAU);
    CX.fill();
  }
  CX.globalAlpha = 1;
  for (const n of G.grenades) {
    /* 手雷：畫火瓶的圖示轉著飛，圖還沒載好才畫圓點 */
    const im = artImg('it_firebottle');
    if (im && im.im.naturalWidth) {
      CX.save();
      CX.translate(n.x, n.y - 8);
      CX.rotate(n.t * 10);
      CX.drawImage(im.im, im.r[0], im.r[1], im.r[2], im.r[3], -11, -11, 22, 22);
      CX.restore();
      continue;
    }
    CX.fillStyle = n.el ? ELC[n.el] : '#cfd8e3';
    CX.beginPath();
    CX.arc(n.x, n.y - 8, 6, 0, TAU);
    CX.fill();
  }
  for (const M of G.mirages) heroCell(0, dirCol(P.face), M.x, M.y, false, 0.45);
  if (G.banner && G.banner.t > G.t) {
    const B = G.banner;
    CX.strokeStyle = '#ffd166';
    CX.lineWidth = 3;
    CX.beginPath();
    CX.moveTo(B.x, B.y);
    CX.lineTo(B.x, B.y - 60);
    CX.stroke();
    CX.fillStyle = '#c0392b';
    CX.fillRect(B.x, B.y - 60, 22, 14);
    CX.globalAlpha = 0.12;
    CX.beginPath();
    CX.ellipse(B.x, B.y, B.r, B.r * 0.75, 0, 0, TAU);
    CX.fillStyle = '#ffd166';
    CX.fill();
    CX.globalAlpha = 1;
  }
  /* 飛劍：繞著玩家轉 */
  const sw = swordN();
  CX.strokeStyle = '#e8f4ff';
  CX.lineWidth = 2;
  for (let i = 0; i < sw; i++) {
    const a = G.t * 3 + (i * TAU) / sw,
      x = P.x + Math.cos(a) * 40,
      y = P.y - 24 + Math.sin(a) * 14;
    CX.beginPath();
    CX.moveTo(x, y);
    CX.lineTo(x + Math.cos(a + 1.57) * 12, y + Math.sin(a + 1.57) * 5);
    CX.stroke();
  }
}
