/* dungeonPOE · 技能用的底層新機制（0.2.10，照 PoE2；規則在 docs/企劃書.md 7.3）：
   收割、地面效果與引爆技能、殘留物與灌注、屍體、連擊與段數、招架與受招架、能量與觸發（Meta）、手雷、彈藥、飛劍、幻影、
   旗幟與榮耀、變身。技能（0.2.11 起）只呼叫這裡的函式，不自己發明規則。 */
'use strict';

/* ---------- 1. 收割：消耗敵人身上的狀態，回傳有沒有（有的話清掉） ---------- */
const PRIMED = m => (m.boss ? 70 : m.elite ? 60 : 40);
function hasState(m, k) {
  const a = m.ail || {};
  if (k === 'frozen') return a.frozen > G.t;
  if (k === 'broken') return a.broken > G.t;
  if (k === 'primed') return (a.hs || 0) >= PRIMED(m);
  if (k === 'pinprime') return !(a.pinT > G.t) && (a.pin || 0) >= PRIMED(m);
  /* 可觸電、可冰凍（第 10 批）：跟可釘身同一套門檻，本身沒有效果，只給技能判斷；血漬：流血累積 6 秒的減益 */
  if (k === 'elcprime') return !immob(a) && (a.elc || 0) >= PRIMED(m);
  if (k === 'frzprime') return !immob(a) && (a.frz || 0) >= PRIMED(m);
  if (k === 'stain') return a.stain > G.t;
  if (k === 'bleed') return !!(a.bleed && a.bleed.t > G.t);
  if (k === 'ign') return !!(a.ign && a.ign.t > G.t);
  if (k === 'shock') return a.shock > G.t;
  if (k === 'curse') return !!(a.curse && a.curse.t > G.t);
  if (k === 'mark') return !!a.mark;
  if (k === 'parried') return a.parried > G.t;
  return false;
}
/* 效果消耗（第 13～16 批，企劃書 7.3）：同一下只能消耗一種，技能優先於其他來源（other＝不是技能的來源）；消耗減益後免疫它 1 秒，累積條不算減益 */
const NO_IMM = new Set(['primed', 'pinprime', 'elcprime', 'frzprime']);
function takeState(m, k, other) {
  if (!hasState(m, k)) return false;
  const a = m.ail,
    tk = a.took;
  if (tk && tk.t === G.t && (other || tk.skill)) return false;
  a.took = { t: G.t, skill: !other };
  if (!NO_IMM.has(k)) (a.imm = a.imm || {})[k] = G.t + DEBUFF.consumeImm;
  if (k === 'frozen') a.frozen = 0;
  else if (k === 'broken') (a.broken = 0), (m.arm = m.arm0);
  else if (k === 'primed') a.hs = 0;
  else if (k === 'pinprime') a.pin = 0;
  else if (k === 'elcprime') a.elc = 0;
  else if (k === 'frzprime') a.frz = 0;
  else if (k === 'bleed' || k === 'ign' || k === 'curse' || k === 'mark') a[k] = null;
  else a[k] = 0;
  return true;
}
/* 粉碎重擊：打中瀕臨沉重暈眩的怪直接沉重暈眩 */
function crush(m) {
  if (!takeState(m, 'primed')) return false;
  poisePin(m, 'hs');
  fxs('slam', m.x, m.y, m.r * 1.5);
  /* 0.2.47：粉碎重擊給 1 顆耐力球（震地會消耗） */
  gainChg('e');
  return true;
}

/* ---------- 2、3. 地面效果與引爆技能 ---------- */
/* 陣營（第 11 批，企劃書 7.3）：g.side 'm'＝怪物方，沒寫＝玩家方。on(a, t, g, dt) 是站在上面每格做的事，
   a 是目標的異常表（怪物、玩家同一組欄位）、t 是目標；on 打「地面的敵方」，ally 的打「擁有者那一方」。
   有 on 的種類才分陣營；碎裂、毒氣雲、燃燒地面、劍陣的傷害照玩家的技能算，只有玩家方。
   dot、burst：每秒傷害、生成時一次的傷害對 g.v 的倍率（怪物方 g.v＝死掉那隻的一下；⚠️ 暫定）；dur：怪物方留多久 */
const noAil = (a, k) => a.imm && a.imm[k] > G.t;
/* 持續傷害：同一格只算最強一塊，離開就停（ailTick、baseTick 讀 a.gd） */
function gdSet(a, g, el, mv) {
  const v = g.v * GROUND[g.k].dot;
  if (!(a.gd && a.gd.t > G.t && a.gd.v > v)) a.gd = { v, el, mv, n: GROUND[g.k].n, t: G.t + 0.2 };
}
const GROUND = {
  jagged: { n: '碎裂地面', col: '#b08a5a', slow: 0.3 },
  gas: { n: '毒氣雲', col: '#8fd16b', burn: 1 },
  /* 緩速在被油纏身裡（離開還留 2 秒），地面本身不另外緩速 */
  oil: { n: '油滑地面', col: '#8a6a2a', burn: 1, dur: 6, on: a => (a.oiled = G.t + DEBUFF.oilT) },
  fire: { n: '燃燒地面', col: '#ff6b3d' },
  chill: {
    n: '冰緩地面',
    col: '#8fd6ff',
    el: 'cold',
    dur: 4,
    on: a => noAil(a, 'chill') || (a.chill = { v: 30, t: G.t + 0.5 })
  },
  blades: { n: '劍陣', col: '#e8e2d6' },
  cons: {
    n: '奉獻地面',
    col: '#ffe08a',
    ally: 1,
    dur: 6,
    on(a, t, g, dt) {
      a.cons = G.t + 0.2;
      /* 回復：玩家吃「生命回復」地圖詞；怪物的王只回 1% */
      if (t === P)
        P.hp = Math.min(ST.hp, P.hp + ((ST.hp * DEBUFF.consHeal) / 100) * Math.max(0, 1 + MM('pregen') / 100) * dt);
      else t.hp = Math.min(t.mhp, t.hp + ((t.mhp * (t.boss ? DEBUFF.consBoss : DEBUFF.consHeal)) / 100) * dt);
    }
  },
  corrupt: { n: '腐化地面', col: '#7a3fa0', dot: 0.6, dur: 6, on: (a, t, g) => gdSet(a, g, 'chaos') },
  smoke: {
    n: '煙霧',
    col: '#9aa0a8',
    dur: 6,
    on: a => (a.blind = Math.max(a.blind || 0, G.t + DEBUFF.blindT))
  },
  shockg: {
    n: '感電地面',
    col: '#ffe14d',
    el: 'light',
    dur: 6,
    on: a => noAil(a, 'shock') || (a.shock = Math.max(a.shock || 0, G.t + DEBUFF.shockGT))
  },
  /* 持續累積易燃（被油纏身 200% 更多），到 50% 點燃 */
  ignited: {
    n: '點燃地面',
    col: '#ff8a2a',
    el: 'fire',
    dot: 0.5,
    dur: 4,
    on(a, t, g, dt) {
      if (noAil(a, 'ign')) return;
      flamAdd(a, DEBUFF.flamRate * dt);
      if (a.flam < DEBUFF.flamAt) return;
      a.flam = 0;
      a.ign = keepMax(a.ign, g.v * GROUND.ignited.dot, 4, { by: GROUND.ignited.n });
    }
  },
  /* 每秒疊 1 層（a.gwT 是這個目標下一層的時間） */
  wither: {
    n: '凋零地面',
    col: '#5fae7a',
    dur: 6,
    on(a) {
      if (a.gwT > G.t) return;
      a.gwT = G.t + 1;
      witherAdd(a);
    }
  },
  /* 生成時打一次（addGround），之後在裡面移動才受傷 */
  thorn: { n: '荊棘地面', col: '#a8c24a', dot: 0.4, burst: 1, dur: 6, on: (a, t, g) => gdSet(a, g, 'phys', 1) },
  howl: {
    n: '怒號地面',
    col: '#ff5a8a',
    ally: 1,
    dur: 6,
    on(a, t) {
      if (t === P) gainBuff('howl', DEBUFF.howlT), gainBuff('onslaught', DEBUFF.howlT);
      else a.howl = G.t + DEBUFF.howlT;
    }
  }
};
/* o：k 種類、x、y、r、dur 秒、c 技能設定（傷害照它算）、dps 每秒傷害倍率、after 結束時再打一次的倍率（餘震）、side 'm' 怪物方、v 傷害基準 */
function addGround(o) {
  const g = { t: 0, dur: 4, dps: 0, v: 0, ...o };
  G.ground.push(g);
  if (GROUND[g.k].burst) groundBurst(g);
}
/* 地圖詞「怪物死亡有 25% 機率留下 X」（killMob 呼叫）：召喚物與王不留（王死了要撿東西），怪物方同時最多 gndMax 塊 */
function mobGround(m) {
  const k = MM('gnd');
  if (!k || m.summoned || m.boss || G.ground.filter(g => g.side === 'm').length >= DEBUFF.gndMax || !roll(DEBUFF.gndCh))
    return;
  const kind = k === 'ele' ? pick(['shockg', 'chill', 'ignited']) : k;
  addGround({ k: kind, side: 'm', x: m.x, y: m.y, r: 2 * METER, dur: GROUND[kind].dur, v: m.dmg });
}
const inGround = (g, o) => Math.hypot(o.x - g.x, o.y - g.y) < g.r + (o.r || 0);
/* 玩家要腳下真的踩在畫出來的橢圓裡、中間沒有牆才算（設計原則：死得要有道理） */
const onGround = g => Math.hypot(P.x - g.x, (P.y - g.y) / 0.75) < g.r && los(g.x, g.y, P.x, P.y);
/* 荊棘地面生成時打一次：怪物方打玩家（躲不掉、吃護甲，死因寫地面）；玩家方是荊棘傷害，吃荊棘傷害提高與怪物護甲 */
function groundBurst(g) {
  const v = g.v * GROUND[g.k].burst;
  fx({ k: 'ring', x: g.x, y: g.y, r: g.r, dur: 0.3, col: GROUND[g.k].col });
  if (g.side === 'm') {
    if (onGround(g)) hurtPlayer(v, { D: { n: GROUND[g.k].n }, x: g.x, y: g.y }, 'phys', true);
  } else
    for (const m of G.mobs) if (m.hp > 0 && inGround(g, m)) dotHit(m, thornCut(m, v * (1 + ST.thornP / 100)), 'phys');
}
/* 站在地面上：敵方（怪物方打玩家、玩家方打怪物）；ally 反過來 */
function groundOn(g, G0, dt) {
  if ((g.side === 'm') !== !!G0.ally) {
    if (G.state !== 'play' || !onGround(g)) return;
    G0.on((P.ail = P.ail || {}), P, g, dt);
    if (G0.el) trigCharms(G0.el, P.ail);
  } else for (const m of G.mobs) if (m.hp > 0 && inGround(g, m)) G0.on(m.ail, m, g, dt);
}
/* 引爆：範圍裡可燃的地面爆炸（油變成燃燒地面）、手雷提早爆、插地的飛劍爆。
   誰點的爆炸算誰的：怪物方的油沒有 g.c，用點燃它的那一招算傷害，只傷怪物 */
function detonate(x, y, r, c) {
  for (const g of G.ground) {
    if (Math.hypot(g.x - x, g.y - y) > g.r + r || g.done) continue;
    if (GROUND[g.k].burn) {
      g.done = 1;
      boomAt(g.x, g.y, g.r * 1.2, g.c || c, 1.5, 'fire');
      if (g.k === 'oil') addGround({ k: 'fire', x: g.x, y: g.y, r: g.r, dur: 4, c: g.c || c, dps: 0.3 });
    } else if (g.k === 'blades') (g.done = 1), boomAt(g.x, g.y, g.r, g.c || c, 0.6 * (g.n || 1));
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
function groundTick(dt) {
  for (const g of G.ground) {
    g.t += dt;
    const G0 = GROUND[g.k];
    /* 震地的品質：地面上的怪沉重暈眩累積更多（applyAil 看 m.jagT） */
    if (g.q) for (const m of G.mobs) if (m.hp > 0 && inGround(g, m)) (m.jagT = G.t + 0.2), (m.jagQ = g.q);
    /* 毒氣箭的品質：毒氣雲飄向最近的怪 */
    if (g.drift) {
      const m = mobNear(g.x, g.y, 500),
        d = m && Math.hypot(m.x - g.x, m.y - g.y);
      if (d > 4) (g.x += ((m.x - g.x) / d) * g.drift * dt), (g.y += ((m.y - g.y) / d) * g.drift * dt);
    }
    if (g.dps && g.c && (g.tick = (g.tick || 0) - dt) <= 0) {
      g.tick = 0.5;
      for (const m of G.mobs)
        if (m.hp > 0 && inGround(g, m)) {
          if (g.k === 'gas' && !hasState(m, 'poison')) fxs('poisoned', m.x, m.y - m.sz * 0.3, m.sz * 0.5);
          hitMob(m, g.k === 'gas' ? { ...g.c, poisonCh: 100 } : g.c, 0, 0, {
            quiet: 1,
            mult: g.c.mult * g.dps * 0.5,
            from: g
          });
        }
    }
    if (G0.on) groundOn(g, G0, dt);
    if (G0.slow) for (const m of G.mobs) if (m.hp > 0 && inGround(g, m)) m.gslow = G.t + 0.2;
    /* 餘震：結束時再打一次 */
    if (g.t >= g.dur && !g.done) {
      g.done = 1;
      if (g.after) boomAt(g.x, g.y, g.r, g.c, g.after);
      /* 褻瀆儀式：腐化地面結束時給能量球 */
      if (g.chg) gainChg(g.chg);
      /* 震地消耗的耐力球：每顆多一次餘震，隔 0.4 秒 */
      if (g.again > 0) g.again--, (g.done = 0), (g.t = g.dur - 0.4);
    }
  }
  G.ground = G.ground.filter(g => !g.done);
}
/* 火焰擊中點燃可燃的地面（hitMob 呼叫） */
function igniteAt(x, y, c) {
  for (const g of G.ground)
    if (GROUND[g.k].burn && !g.done && Math.hypot(g.x - x, g.y - y) < g.r) detonate(g.x, g.y, 1, g.c || c);
}

/* ---------- 4. 殘留物與灌注 ---------- */
/* 技能欄裝著會吃灌注的技能（目前只有灌注新星 nova）才會產生殘留物 */
const REMN = { fire: '火焰殘留', cold: '冰霜殘留', light: '閃電殘留' };
const hasInfSkill = () => S.skills.some(s => s && s.a && s.a.gem === 'nova');
function dropRemnant(el, x, y) {
  if (G.remnants.length < 20 && hasInfSkill())
    G.remnants.push({ el, x: x + rnd(-20, 20), y: y + rnd(-20, 20), t: G.t + 15 });
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

/* ---------- 6. 連擊與段數 ---------- */
const COMBO_MAX = 10;
function comboHit(a) {
  /* 終極：生效期間無法獲得連擊 */
  if (!a || a.combo || hasBuff('finality')) return;
  a.combo = 1;
  if (a.c && a.c.k === 'combo') P.comboQ = a.c.q;
  P.combo = Math.min(COMBO_MAX, (P.combo || 0) + 1);
  P.comboT = G.t;
}
/* 連打的品質：超時時留下一部分（mechTick），不整組歸零 */
function comboTick() {
  if (!P.combo || !P.comboQ || G.t - (P.comboT || 0) < 8) return;
  P.combo = Math.floor(P.combo * 0.5 * P.comboQ);
  P.comboT = G.t;
}
const comboN = () => (P.combo && G.t - (P.comboT || 0) < 8 ? P.combo : 0);
function useCombo() {
  const n = comboN();
  P.combo = 0;
  return n;
}
/* 同一招 1 秒內再按＝下一段（0、1、2…，最多 max−1）；最後一段是最終打擊，終極直接跳到那裡 */
const STAGE_MAX = 3;
const isFinal = st => st === STAGE_MAX - 1;
function nextStage(k, max = STAGE_MAX) {
  const s = (P.stage = P.stage || {}),
    cur = hasBuff('finality') ? max - 1 : s[k] && G.t - s[k].t < 1 ? (s[k].n + 1) % max : 0;
  s[k] = { n: cur, t: G.t };
  return cur;
}

/* ---------- 封印（第 13～16 批，企劃書 7.3）：D.seal = { max, every, aoe } 的技能隨時間累積封印（每 every 倍施放時間 1 個，最多 max），
   只有你自己使用（useSlot）才打破，那次使用每個封印範圍提高 aoe %；自動化、觸發、場上單位不會打破 ---------- */
function sealTick(dt) {
  S.skills.forEach((s, i) => {
    const g = s && s.a,
      E = g && SKILLS[g.gem].seal,
      q = E && ((P.seal = P.seal || {})[g.gem] = P.seal[g.gem] || { n: 0, t: 0 });
    if (!E || q.n >= E.max) return;
    q.t += dt;
    const need = E.every * actDur(slotCfg(i));
    if (q.t >= need) (q.t -= need), q.n++;
  });
}
const sealN = k => (P.seal && P.seal[k] ? P.seal[k].n : 0);
function sealBreak(k) {
  const n = sealN(k);
  if (P.seal && P.seal[k]) P.seal[k] = { n: 0, t: 0 };
  return n;
}

/* ---------- 7. 招架與受招架、反擊狀態 ---------- */
function startParry(t = 0.4) {
  P.parryT = G.t + t;
}
/* 反擊狀態（0.2.47 改寫，盾衝在用）：持續 t 秒，期間每次被找得到攻擊者的擊中打到（近戰、投射物、範圍招、王的紅光大招），
   攻擊者就受招架；傷害照常結算、不擋、不自動反擊。條件放寬是為了手機好觸發 */
function startCounter(t = 2) {
  P.counterT = G.t + t;
}
/* hurtCalc 呼叫（在招架、閃避之前）：m 是攻擊者，地面與持續傷害沒有攻擊者，不算 */
function counterHit(m) {
  if (!(P.counterT > G.t) || !m || !m.ail || m.hp <= 0) return;
  if (!parryOn(m)) fxs('block', P.x, P.y), num(P.x, P.y - 60, 0, 'block', '受招架');
  applyParry(m);
}
/* hurtCalc 呼叫：招架窗口裡被近戰或投射物打到＝擋下，攻擊者受招架（幅度與持續時間在 combat.js 的 applyParry） */
function tryParry(m) {
  if (!(P.parryT > G.t) || !m || !m.ail) return false;
  applyParry(m);
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
    sp.en = Math.min(
      200,
      (sp.en || 0) + ENERGY[kind] * (kind === 'crit' && ST.hexCoc ? 2 : 1) * (1 + ST.energyP / 100)
    );
    if (sp.en >= 100) full.push([g, sp]);
  }
  if (!full.length) return;
  const t = near || G.mobs.filter(m => m.hp > 0).sort((a, b) => dist(a, P) - dist(b, P))[0];
  if (!t) return;
  for (const [, sp] of full) sp.en -= 100;
  /* 咒爆（0.2.26）：有一顆滿了，所有插了觸發輔助的法術一起放（沒滿的不扣能量） */
  if (ST.hexBurst) hexBurst(t);
  else
    for (const [g, sp] of full) {
      castGem(g, t);
      /* 暴擊施放的品質：再放一次 */
      if (qRoll(sp.q || 0)) castGem(g, t);
    }
}
function hexBurst(t) {
  for (let i = 0; i < NSLOT; i++) {
    const g = S.skills[i] && S.skills[i].a;
    const sp = metaOf(g);
    if (sp && SUPPORTS[sp.gem].meta === 'crit') castGem(g, t);
  }
}
/* 不經技能欄、直接施放一顆技能寶石（觸發、幻影用） */
function castGem(g, t) {
  const c = gemCfg(g, -1);
  if (!c || gemLack(g).length) return; /* 能力值不夠的寶石不能觸發 */
  const ang = Math.atan2(t.y - P.y, t.x - P.x);
  actHit({ k: c.k, c, t: 0, dur: 0.1, ang, hits: [0], n: 0, tx: t.x, ty: t.y, trig: 1 }, 0);
}

/* ---------- 9. 手雷 ---------- */
/* 丟手雷：往目標飛，落地彈跳，引信到或被引爆才爆；o：fuse、r 爆炸半徑、mul、el、onBoom(x, y) */
function throwGrenade(c, tx, ty, o = {}) {
  const f = o.from || P,
    ang = Math.atan2(ty - f.y, tx - f.x),
    d = Math.min(380, Math.hypot(tx - f.x, ty - f.y)),
    sp = d / 0.45;
  G.grenades.push({
    x: f.x,
    y: f.y - 10,
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
  q.push(G.t + cd / (1 + ST.grenCd / 100));
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
  if (A.n <= 0) A.until = G.t + reload / (1 + ST.reloadP / 100);
  return true;
}
const ammoLeft = k => (P.ammo && P.ammo[k] ? (P.ammo[k].until > G.t ? 0 : P.ammo[k].n) : null);

/* ---------- 11. 飛劍 ---------- */
const SWORD_MAX = 10;
function gainSwords(n, c) {
  P.swords = (P.swords || []).filter(s => s.t > G.t);
  for (let i = 0; i < n && P.swords.length < SWORD_MAX; i++) P.swords.push({ t: G.t + 15, c });
}
/* 御劍訣的品質：環繞的飛劍每 0.6 秒砍一下身邊的怪 */
function swordTick(dt) {
  if ((P.swT = (P.swT || 0) - dt) > 0) return;
  P.swT = 0.6;
  for (const s of P.swords || []) {
    const m = s.t > G.t && s.c.q && mobNear(P.x, P.y, 110);
    if (m) hitMob(m, s.c, angTo(P, m), 0, { quiet: 1, mult: s.c.mult * 0.3 * s.c.q });
  }
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
/* 劍陣：飛劍插在地上，被引爆技能引爆 */
function plantSwords(x, y, c) {
  const n = swordN();
  if (!n) return 0;
  P.swords = [];
  /* after：8 秒沒引爆就自己爆（威力是引爆的一半） */
  addGround({ k: 'blades', x, y, r: 70 + n * 6, dur: 8, c, n, after: 0.3 * n });
  return n;
}

/* ---------- 12. 幻影 ---------- */
/* 在 (x, y) 召出分身：dur 秒內每 every 秒從自己的位置出招一次，傷害 ×mul；
   g 是 null 時（0.2.25）每次從你裝著的攻擊技能隨機挑一招（用那顆寶石的等級與輔助）；src 是來源（幻影獵手限 2 個） */
function spawnMirage(g, x, y, dur = 4, every = 1, mul = 0.6, src) {
  G.mirages.push({ g, x, y, t: G.t + dur, next: G.t + 0.3, every, mul, src });
}
/* 幻影能用的攻擊技能：不用位移、放單位、資源（屍體、榮耀、飛出去的盾）、要指定目標的，也不能是幻影斬自己 */
const MIRAGE_NO = new Set([
  'mirage',
  'shieldthrow',
  'banner',
  'corpseboom',
  'paperdoll',
  'refract',
  'swordarray',
  'furyslam'
]);
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
  /* 幻影斬的品質：消失時有機率留下新分身 */
  for (const M of G.mirages.slice()) if (M.t <= G.t && qRoll(20 * (M.q || 0))) spawnMirage(null, M.x, M.y, 2, 0.8, 0.6);
  G.mirages = G.mirages.filter(M => M.t > G.t);
}

/* ---------- 13. 旗幟與榮耀 ---------- */
function gainGlory(v) {
  P.glory = Math.min(100, (P.glory || 0) + (v > 0 ? v * (1 + ST.gloryP / 100) : v));
  if (v > 0) P.gloryT = G.t;
}
/* 擊中給榮耀（0.2.42）：同一隻怪每 0.5 秒最多一次；一般 1、精英 5、王 20，再乘暴擊 ×4 與技能的 glory */
function hitGlory(m, crit, mul = 1) {
  if (m.gloryT > G.t) return;
  m.gloryT = G.t + 0.5;
  gainGlory((m.boss ? 20 : m.elite ? 5 : 1) * (crit ? 4 : 1) * mul);
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
  if (P.form && !D.form) for (const k in BUFF) if (BUFF[k].human) stkClr(k);
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
    counterT: 0,
    inf: {},
    swords: [],
    glory: 0,
    form: null,
    ammo: {},
    gren: {},
    seal: {}
  });
}
function mechTick(dt) {
  groundTick(dt);
  remnantTick();
  grenadeTick(dt);
  mirageTick();
  comboTick();
  sealTick(dt);
  swordTick(dt);
  /* 榮耀消退：15 秒沒有獲得就每秒掉 2 點 */
  if (P.glory > 0 && G.t - (P.gloryT || 0) > 15) P.glory = Math.max(0, P.glory - 2 * dt);
  /* 鬥旗的品質：收起時返還榮耀 */
  if (G.banner && G.banner.q && G.banner.t <= G.t) gainGlory(25 * G.banner.q), (G.banner.q = 0);
  G.corpses = G.corpses.filter(c => c.t > G.t);
}
function drawMech() {
  for (const g of G.ground) {
    const C = GROUND[g.k],
      f = Math.min(1, (g.dur - g.t) / 0.5);
    /* 怪物方：填色更濃、紅色虛線框、寫名字，一眼跟自己的地面分開 */
    const foe = g.side === 'm';
    CX.globalAlpha = (foe ? 0.36 : 0.22) * f;
    CX.fillStyle = C.col;
    CX.beginPath();
    CX.ellipse(g.x, g.y, g.r, g.r * 0.75, 0, 0, TAU);
    CX.fill();
    CX.globalAlpha = (foe ? 0.95 : 0.5) * f;
    CX.strokeStyle = foe ? '#ff3b3b' : C.col;
    CX.lineWidth = foe ? 3 : 2;
    if (foe) CX.setLineDash([10, 6]);
    CX.stroke();
    CX.setLineDash([]);
    if (foe) {
      CX.font = '600 11px "Noto Sans TC", sans-serif';
      CX.textAlign = 'center';
      CX.lineWidth = 3;
      CX.strokeStyle = 'rgba(0,0,0,0.85)';
      CX.strokeText(C.n, g.x, g.y + 4);
      CX.fillStyle = '#fff';
      CX.fillText(C.n, g.x, g.y + 4);
    }
  }
  CX.globalAlpha = 1;
  for (const c of G.corpses) {
    CX.globalAlpha = 0.4;
    CX.fillStyle = '#3a1a14';
    CX.beginPath();
    CX.ellipse(c.x, c.y, c.sz * 0.35, c.sz * 0.15, 0, 0, TAU);
    CX.fill();
  }
  /* 殘留物：元素結晶（菱形）＋小字標籤 */
  CX.font = '600 11px "Noto Sans TC", sans-serif';
  CX.textAlign = 'center';
  for (const r of G.remnants) {
    const bob = Math.sin(G.t * 3 + r.x) * 2,
      y = r.y - 14 + bob;
    CX.globalAlpha = 0.85 + 0.15 * Math.sin(G.t * 6 + r.x);
    CX.fillStyle = ELC[r.el];
    CX.strokeStyle = 'rgba(255,255,255,0.8)';
    CX.lineWidth = 1.5;
    CX.beginPath();
    CX.moveTo(r.x, y - 10);
    CX.lineTo(r.x + 6, y);
    CX.lineTo(r.x, y + 10);
    CX.lineTo(r.x - 6, y);
    CX.closePath();
    CX.fill();
    CX.stroke();
    CX.lineWidth = 3;
    CX.strokeStyle = 'rgba(0,0,0,0.85)';
    CX.strokeText(REMN[r.el], r.x, y + 24);
    CX.fillStyle = '#fff';
    CX.fillText(REMN[r.el], r.x, y + 24);
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
