/* dungeonPOE · 技能寶石與核心：技能欄設定 slotCfg（輔助）、放技能 useSlot、出手 actHit、打怪 hitMob（傷害、暴擊、屬性）、
   召喚狼 allies、毒刃雨與隕石、寶石升級、五個職業的核心效果（架勢、盾勢、燃燒、印記、獸群） */
'use strict';

/* ---------- 技能欄 ---------- */
const NSLOT = 5;
const SLOTKEY = ['左鍵', '右鍵', 'Q', 'E', 'R'];
/* 同一顆技能上已經有同分類的輔助（排在前面的那顆才算） */
const supDup = (g, sp) =>
  !!g && g.sup.some(x => x && x !== sp && supCat(x.gem) === supCat(sp.gem) && g.sup.indexOf(x) < g.sup.indexOf(sp));
const supOK = (D, sp, g) => {
  const U = SUPPORTS[sp.gem];
  /* Meta 寶石的孔插的是法術，不是輔助 */
  if (!U) return false;
  if (g && supDup(g, sp)) return false;
  if (U.conv && (D.unit || D.tags.includes('move') || D.tags.includes('minion'))) return false;
  return !U.need.length || U.need.some(t => D.tags.includes(t));
};
/* 一格技能的實際數值（技能等級＋輔助＋天賦冷卻縮減）；觸發、幻影直接用 gemCfg（i = −1）；c.g 是寶石本身 */
const slotCfg = i => gemCfg(S.skills[i] && S.skills[i].a, i);
function gemCfg(g, i) {
  if (!g) return null;
  const D = SKILLS[g.gem],
    /* 法杖：法術技能等級 +1 */
    lv = g.lv + (D.tags.includes('spell') ? ST.spellLv : 0),
    c = {
      i,
      k: g.gem,
      D,
      lv,
      /* 攻擊的技能倍率（寶石等級）；「更多」另外放在 more（combat.js 的 hitCalc 第 5 步） */
      mult: D.m * Math.pow(1.06, lv - 1),
      more: 1,
      aoe: 1,
      speed: D.tags.includes('spell') ? (1 + ST.castP / 100) * (hasBuff('arcane') ? 1.15 : 1) : 1,
      mp: D.mp,
      cd: (D.cd || 0) * (1 - ST.cdr / 100),
      g,
      critInc: D.crit || 0,
      critX: 0,
      leech: ST.leech / 100,
      /* 天賦的投射物數量、穿透（0.2.23）只給投射物技能 */
      proj: (D.cnt || 1) + (D.tags.includes('proj') ? ST.proj : 0),
      pierce: (D.pierce || 0) + (D.tags.includes('proj') ? ST.pierce : 0),
      kb: 1,
      fireAdd: 0,
      pen: 0,
      ailMag: 0,
      bleedCh: D.bleed || 0,
      poisonCh: 0,
      poiStack: 0,
      impaleCh: 0,
      armBreak: D.armBreak,
      wither: D.wither,
      blind: D.blind,
      hsM: D.hsM || 1,
      wolves: (D.cnt || 0) + ST.wolfN,
      wolfM: 1
    };
  for (const sp of g.sup || []) {
    if (!sp || !supOK(D, sp, g)) continue;
    c.more *= 1 + 0.01 * (sp.lv - 1);
    const k = sp.gem;
    if (k === 'multi') (c.proj += 2), (c.more *= 0.8);
    else if (k === 'pierce') c.pierce += 3;
    else if (k === 'area') c.aoe *= 1.4;
    else if (k === 'fury') (c.more *= 1.35), (c.mp *= 1.4);
    else if (k === 'haste') c.speed *= 1.25;
    else if (k === 'crit') (c.critInc += 50), (c.critX += 40);
    else if (k === 'leech') c.leech += 0.03;
    else if (k === 'cdr') c.cd *= 0.65;
    else if (k === 'fireadd') c.fireAdd += 0.25;
    else if (k === 'heavy') (c.kb *= 2), (c.more *= 1.15);
    else if (k === 'pack') (c.wolves += 1), (c.wolfM *= 1.3);
    else if (k === 'bleed') c.bleedCh += 25;
    else if (k === 'poison') c.poisonCh += 25;
    else if (k === 'poistack') (c.poiStack += 2), (c.ailMag += 10);
    else if (k === 'ailmag') c.ailMag += 30;
    else if (k === 'scorch' || k === 'brittle' || k === 'sap') c.alt = k;
    else if (k === 'expose') c.expose = 1;
    else if (k === 'armbreak') c.armBreak = 1;
    else if (k === 'elec') c.elc = 1;
    else if (k === 'wither') c.wither = 1;
    else if (k === 'blind') c.blind = 1;
    else if (k === 'arcane') c.arcane = 1;
    else if (SUPPORTS[k].conv && !c.conv) {
      c.conv = SUPPORTS[k].conv;
      c.more *= c.conv === 'trap' ? 1.2 : c.conv === 'totem' ? 0.7 : 1;
    }
  }
  c.mp = Math.round(c.mp);
  c.unit = D.unit || c.conv;
  return c;
}
/* 按下技能鍵 */
/* 武器技能要拿對的武器（照 PoE2） */
/* 盾技能（D.off）要副手拿盾；wtNeed 沒有限制時是空字串 */
const wtOK = D => (!D.wt || D.wt.includes(ST.wt)) && (!D.off || ST.shield);
const wtNeed = D => (D.wt ? '要拿' + D.wt.map(w => WTN[w]).join('或') : D.off ? '副手要拿盾' : '');
/* 插了暴擊施放（0.2.13 的觸發輔助）的法術：不能手動施放 */
const metaOf = g =>
  g && (g.sup || []).find(x => x && SUPPORTS[x.gem] && SUPPORTS[x.gem].meta && supOK(SKILLS[g.gem], x, g));
function useSlot(i) {
  if (P.act || P.roll || G.state !== 'play' || G.scene !== 'map') return false;
  if (P.ail && P.ail.frozen > G.t) return false;
  const c = slotCfg(i);
  if (!c) return false;
  if (metaOf(c.g)) return hudWarn(c.D.n + '插了暴擊施放：條件達成會自動施放，不能手動'), false;
  if (!wtOK(c.D)) return hudWarn(c.D.n + '：' + wtNeed(c.D)), false;
  if ((P.cds['s' + i] || 0) > 0) return false;
  /* 血祭／血之代價：用生命施放 */
  if (ST.blood ? P.hp <= c.mp + 1 : P.mp < c.mp) return hudWarn(ST.blood ? '生命不夠施放' : '魔力不足'), false;
  const w = mouseWorld(),
    D = c.D,
    tm = D.toMob && mobNear(w.x, w.y, 150, D.dist);
  if (D.toMob && !tm) return hudWarn('滑鼠附近沒有敵人'), false;
  if (c.k === 'banner' && (P.glory || 0) < 100)
    return hudWarn('榮耀不夠（' + Math.floor(P.glory || 0) + '／100）'), false;
  if ((c.k === 'corpseboom' || c.k === 'paperdoll') && !corpseNear(c.k === 'paperdoll' ? P : w, 250))
    return hudWarn('附近沒有屍體'), false;
  if (c.k === 'shieldthrow' && P.shieldOut > G.t) return hudWarn('盾還沒飛回來'), false;
  const A = D.ammo && P.ammo && P.ammo[c.k];
  if (A && A.until > G.t) return hudWarn('裝填中'), false;
  if (D.gren && !grenadeReady(c.k, D.gren[0], D.gren[1])) return hudWarn('手雷還沒好'), false;
  if (D.ammo) ammoUse(c.k, D.ammo[0], D.ammo[1]);
  if (ST.blood) P.hp -= c.mp;
  else P.mp -= c.mp;
  if (c.cd) P.cds['s' + i] = c.cd;
  /* 變身（mech.js）：用了不是這個形態的技能就變回來 */
  formFor(c.D);
  const ang = Math.atan2(w.y - P.y, w.x - P.x);
  P.face = ang;
  /* 陷阱、地雷、砲台、圖騰：放在滑鼠位置（最遠 320） */
  if (c.unit) {
    placeUnit(c, w);
    P.act = { k: c.k, c, t: 0, dur: 0.25 / c.speed, ang, hits: [], n: 0, place: 1 };
    sfx('throw');
    return true;
  }
  const a = (P.act = {
    k: c.k,
    c,
    t: 0,
    dur: D.t / (D.shield ? ST.sasM : ST.asM) / c.speed / speedMul(),
    ang,
    hits: D.hits || [0.42],
    n: 0,
    tx: w.x,
    ty: w.y,
    stage: D.stage ? nextStage(c.k) : 0
  });
  sfx(D.tags.includes('spell') ? 'cast' : D.tags.includes('proj') ? 'throw' : 'swing');
  if (D.parry) startParry(0.4), fxs('parry', P.x, P.y - 20, 50);
  /* 位移技能：衝向滑鼠（居合、跳砸）或撲向滑鼠附近的怪（影襲停在牠背後），途中無敵 */
  if (D.dist) {
    let tx = w.x,
      ty = w.y;
    if (tm) {
      const g = angTo(P, tm),
        off = (tm.r + 16) * (c.k === 'shadowstrike' ? 1 : -1);
      (tx = tm.x + Math.cos(g) * off), (ty = tm.y + Math.sin(g) * off);
      if (c.k === 'shadowstrike' || c.k === 'wolfpounce') fxs('blink', P.x, P.y);
    }
    a.ang = P.face = Math.atan2(ty - P.y, tx - P.x);
    const d = Math.min(D.dist, Math.hypot(tx - P.x, ty - P.y));
    Object.assign(a, { sx: P.x, sy: P.y, d, tm, hit: new Set(), hits: [] });
    if (c.k === 'iai') fxs('blink', P.x, P.y);
    P.iuntil = G.t + a.dur + 0.05;
  }
  return true;
}
/* (x, y) 附近 r 內、離自己 far 以內最近的怪 */
function mobNear(x, y, r, far = 1e9) {
  let best = null,
    bd = r;
  for (const m of G.mobs) {
    const d = Math.hypot(m.x - x, m.y - y);
    if (m.hp > 0 && d < bd + m.r && dist(P, m) < far) (bd = d), (best = m);
  }
  return best;
}
const corpseNear = (o, r) => G.corpses.some(c => c.t > G.t && Math.hypot(c.x - o.x, c.y - o.y) < r);
/* 每格畫面：出手中的動作 */
function skillTick(a, dt, mx, my) {
  a.t += dt;
  if (a.sx != null) {
    const f = Math.min(1, a.t / a.dur),
      e = 1 - Math.pow(1 - f, 3);
    moveBody(P, a.sx + Math.cos(a.ang) * a.d * e - P.x, a.sy + Math.sin(a.ang) * a.d * e - P.y);
    if (Math.random() < 0.8) fx({ k: 'ghost', x: P.x, y: P.y, dur: 0.22, flip: Math.cos(a.ang) < 0 });
    /* 居合：路上的都斬；其他的落地才出手 */
    if (a.k === 'iai') {
      for (const m of G.mobs)
        if (m.hp > 0 && !a.hit.has(m) && dist(P, m) < m.r + 40) {
          a.hit.add(m);
          fxs('sslash', m.x, m.y - m.sz * 0.4, 50, { rot: a.ang });
          hitMob(m, a.c, a.ang + Math.PI / 2, 220, { a });
        }
    } else if (f >= 1 && !a.n++) actHit(a, 0);
  } else {
    moveBody(P, mx * ST.spd * 0.35 * dt, my * ST.spd * 0.35 * dt);
    while (a.n < a.hits.length && a.t >= a.dur * a.hits[a.n]) actHit(a, a.n++);
  }
  if (a.t >= a.dur) P.act = null;
}

/* ---------- 各技能出手 ---------- */
function actHit(a, idx) {
  const c = a.c,
    D = c.D,
    R = (D.r || 0) * ST.aoeM * c.aoe * (ST.wt === 'spear' && D.tags.includes('melee') ? 1.25 : 1);
  const hitArc = (ang, arc, r, kb, o) => {
    let n = 0;
    for (const m of G.mobs) {
      if (m.hp <= 0) continue;
      const dd = dist(P, m);
      if (dd < r + m.r && angDiff(angTo(P, m), ang) < arc / 2 + m.r / Math.max(dd, 1))
        hitMob(m, c, angTo(P, m), kb, { a, ...o }), n++;
    }
    return n;
  };
  if (a.k === 'slash') {
    /* 3 段一輪：第 2 段反手，第 3 段範圍 ×1.5、必定暴擊 */
    const st = a.stage || 0,
      R2 = R * (st === 2 ? 1.5 : 1);
    P.x += Math.cos(a.ang) * 10;
    P.y += Math.sin(a.ang) * 10;
    fx({ k: 'slash', x: P.x, y: P.y, ang: a.ang, r: R2, arc: D.arc, dur: 0.18, flipArc: st === 1 });
    fxs(st === 2 ? 'dslash' : 'sslash', P.x, P.y - 20, R2, { rot: a.ang });
    const n = hitArc(a.ang, D.arc, R2, 170 * c.kb, st === 2 ? { crit: 1 } : {});
    if (D.gain && n) P.mp = Math.min(ST.mp, P.mp + D.gain * n);
  } else if (a.k === 'thrust') {
    /* 招架反擊：往前刺一整排；失衡的怪消耗失衡、必定暴擊、給狂怒球 */
    const L = R * 1.9;
    fxs('thrust', P.x, P.y - 20, L, { rot: a.ang });
    for (const m of G.mobs) {
      if (m.hp <= 0) continue;
      const dx = m.x - P.x,
        dy = m.y - P.y,
        along = dx * Math.cos(a.ang) + dy * Math.sin(a.ang),
        side = Math.abs(-dx * Math.sin(a.ang) + dy * Math.cos(a.ang));
      if (!(along > 0 && along < L + m.r && side < 28 + m.r)) continue;
      const par = takeState(m, 'parried');
      hitMob(m, c, a.ang, 220 * c.kb, { a, crit: par });
      if (par) gainChg('f');
    }
  } else if (a.k === 'combo') {
    /* 連打：左右左，第 3 下得到暴擊球 */
    const last = idx === a.hits.length - 1,
      ang = a.ang + [-0.3, 0.3, 0][idx];
    fx({ k: 'slash', x: P.x, y: P.y, ang, r: R, arc: D.arc, dur: 0.15, flipArc: idx === 1 });
    fxs('dslash', P.x, P.y - 20, R, { rot: ang });
    const n = hitArc(ang, D.arc, R, (last ? 200 : 90) * c.kb);
    if (D.gain && n) P.mp = Math.min(ST.mp, P.mp + D.gain * n);
    if (last && n) gainChg('p');
  } else if (a.k === 'split') {
    const n = D.cnt + c.proj - 1;
    for (let i = 0; i < n; i++) shoot(a.ang + (i - (n - 1) / 2) * 0.22, D.spd, c, a, { life: 0.7, sh: 'arrow' });
  } else if (a.k === 'frostbolt') {
    const n = c.proj;
    for (let i = 0; i < n; i++)
      shoot(a.ang + (i - (n - 1) / 2) * 0.18, D.spd, c, a, {
        pierce: 999,
        life: 0.75,
        life0: 0.75,
        decay: 1,
        cold: 1,
        hitfx: 'shatter',
        hfr: 30
      });
  } else if (a.k === 'arc') {
    /* 先打滑鼠附近（離自己 450 內）最近的，再跳 chain 次（每次 260 內、不重複） */
    const hit = new Set();
    let from = { x: P.x, y: P.y - 20 },
      cur = null,
      bd = 1e9;
    for (const m of G.mobs)
      if (m.hp > 0 && dist(P, m) < 450) {
        const d = Math.hypot(m.x - a.tx, m.y - a.ty);
        if (d < bd) (bd = d), (cur = m);
      }
    for (let k = 0; cur && k <= D.chain + (c.proj - 1); k++) {
      fx({ k: 'zap', x: from.x, y: from.y, x2: cur.x, y2: cur.y - cur.sz * 0.4, dur: 0.18 });
      hit.add(cur);
      hitMob(cur, c, angTo(from, cur), 60 * c.kb, { a, from });
      from = { x: cur.x, y: cur.y - cur.sz * 0.4 };
      let nx = null,
        nd = 260;
      for (const m of G.mobs)
        if (m.hp > 0 && !hit.has(m)) {
          const d = Math.hypot(m.x - cur.x, m.y - cur.y);
          if (d < nd) (nd = d), (nx = m);
        }
      cur = nx;
    }
    if (!hit.size) fx({ k: 'zap', x: P.x, y: P.y - 20, x2: a.tx, y2: a.ty, dur: 0.15 });
    sfx('cast');
  } else if (a.k === 'quake') {
    fx({ k: 'quake', x: P.x, y: P.y, ang: a.ang, r: R, arc: D.arc, dur: 0.35 });
    fxs('slam', P.x + Math.cos(a.ang) * R * 0.5, P.y + Math.sin(a.ang) * R * 0.5, R * 0.6);
    shake(0.1);
    sfx('slam');
    hitArc(a.ang, D.arc, R, 120 * c.kb, { stun: D.stun });
    const cx = P.x + Math.cos(a.ang) * R * 0.55,
      cy = P.y + Math.sin(a.ang) * R * 0.55;
    addGround({ k: 'jagged', x: cx, y: cy, r: R * 0.5, dur: 2, c, after: 1.2 });
  } else if (a.k === 'whirl') {
    fx({ k: 'ring', x: P.x, y: P.y, r: R, dur: 0.28 });
    fxs('spin', P.x, P.y - 10, R);
    for (const m of G.mobs) if (m.hp > 0 && dist(P, m) < R + m.r) hitMob(m, c, angTo(P, m), 320 * c.kb, { a });
  } else if (a.k === 'nova') {
    /* 灌注：火＝範圍 ×1.5＋燃燒地面，冰＝冰緩地面（觸發、幻影施放的不吃灌注） */
    const fire = !a.trig && takeInf('fire'),
      cold = !a.trig && takeInf('cold'),
      R2 = R * (fire ? 1.5 : 1);
    fx({ k: 'ring', x: P.x, y: P.y, r: R2, dur: 0.32, col: '#ff8a4c' });
    fxs('firering', P.x, P.y, R2);
    for (const m of G.mobs) if (m.hp > 0 && dist(P, m) < R2 + m.r) hitMob(m, c, angTo(P, m), 140 * c.kb, { a });
    if (fire) addGround({ k: 'fire', x: P.x, y: P.y, r: R2, dur: 4, c, dps: 0.3 });
    if (cold) addGround({ k: 'chill', x: P.x, y: P.y, r: R2, dur: 4 }), fxs('frost', P.x, P.y, R2);
  } else if (a.k === 'fireball') {
    const n = c.proj,
      spread = 0.18;
    for (let i = 0; i < n; i++) {
      const g = a.ang + (i - (n - 1) / 2) * spread;
      shoot(g, D.spd, c, a, { boom: (D.r || 70) * ST.aoeM * c.aoe, fire: 1, life: 1.1 });
    }
  } else if (a.k === 'venom') {
    G.pools.push({ x: a.tx, y: a.ty, r: R, t: 0, dur: D.dur, tick: 0, c, a });
    sfx('cast');
  } else if (D.curse) {
    G.meteors.push({ x: a.tx, y: a.ty, r: R, t: 0, dur: 1.5, curse: D.curse, lv: c.lv });
    fx({ k: 'ring', x: a.tx, y: a.ty, r: R, dur: 0.4, col: '#c38bff' });
    sfx('cast');
  } else if (D.mark) {
    const m = G.mobs
      .filter(o => o.hp > 0 && Math.hypot(o.x - a.tx, o.y - a.ty) < 120 + o.r)
      .sort((x, y) => Math.hypot(x.x - a.tx, x.y - a.ty) - Math.hypot(y.x - a.tx, y.y - a.ty))[0];
    if (m) markMob(m, D.mark), fx({ k: 'ring', x: m.x, y: m.y, r: 40, dur: 0.3, col: '#ff6b6b' }), sfx('cast');
  } else if (a.k === 'meteor') {
    G.meteors.push({ x: a.tx, y: a.ty, r: R, t: 0, dur: D.delay, c, a });
  } else if (a.k === 'wolf') {
    G.allies = G.allies.filter(w => w.src !== 'gem');
    for (let i = 0; i < c.wolves; i++) callWolf('gem', c);
    fx({ k: 'ring', x: P.x, y: P.y, r: 90, dur: 0.35, col: '#9df29d' });
  } else actHit2(a, idx, R, hitArc);
}
/* 0.2.11 的武器技能（docs/技能分配.md）；機制都在 mech.js、combat.js */
function actHit2(a, idx, R, hitArc) {
  const c = a.c,
    D = c.D,
    cos = Math.cos(a.ang),
    sin = Math.sin(a.ang),
    /* 圓形範圍：(x, y) 半徑 r 內的怪都打一下 */
    around = (x, y, r, kb, o) => {
      let n = 0;
      for (const m of G.mobs)
        if (m.hp > 0 && Math.hypot(m.x - x, m.y - y) < r + m.r)
          hitMob(m, c, Math.atan2(m.y - y, m.x - x), kb * c.kb, { a, from: { x, y }, ...o }), n++;
      return n;
    };
  if (a.k === 'mirage') {
    /* 分身用這顆寶石的等級與輔助出斬擊 */
    const p = open(a.tx, a.ty, 14) ? { x: a.tx, y: a.ty } : { x: P.x, y: P.y };
    spawnMirage({ ...c.g, gem: 'slash' }, p.x, p.y, 4, 0.8, 0.6);
    fxs('blinkin', p.x, p.y, 40);
  } else if (a.k === 'axethrow' || a.k === 'apshot' || a.k === 'chaosbolt') {
    const n = c.proj,
      o = {
        /* 擲斧：飛的是手上那把斧頭的圖（轉著飛） */
        axethrow: { spin: S.eq.weapon ? baseOf(S.eq.weapon).ic : 'sk_axespin', life: 0.8 },
        apshot: { sh: 'tracer', life: 0.6 },
        chaosbolt: { sh: 'void', shs: 0.22, wave: 'chaos', life: 0.8, hitfx: 'dark', hfr: 28 }
      }[a.k];
    if (a.k === 'axethrow') fxs('sslash', P.x, P.y - 20, 50, { rot: a.ang });
    for (let i = 0; i < n; i++) shoot(a.ang + (i - (n - 1) / 2) * 0.16, D.spd, c, a, { ...o });
  } else if (a.k === 'shieldcrush') {
    /* 盾牌粉碎：前方扇形；瀕臨重暈的碾壓（直接重暈），並震傷碾壓那隻周圍的怪 */
    fxs('blunt', P.x + cos * R * 0.5, P.y + sin * R * 0.5 - 10, R * 0.7);
    shake(0.1);
    sfx('slam');
    for (const m of G.mobs) {
      const dd = dist(P, m);
      if (m.hp <= 0 || !(dd < R + m.r && angDiff(angTo(P, m), a.ang) < D.arc / 2 + m.r / Math.max(dd, 1))) continue;
      const crushed = crush(m);
      hitMob(m, c, angTo(P, m), 220 * c.kb, { a });
      if (crushed)
        for (const o of G.mobs)
          if (o.hp > 0 && o !== m && dist(o, m) < 120 + o.r)
            hitMob(o, c, angTo(m, o), 260, { a, quiet: 1, mult: c.mult * 0.5, from: m });
    }
  } else if (a.k === 'shieldthrow') {
    /* 盾牌投擲：彈 bounce 次再飛回來（game.js 的投射物），飛出去的時候不能格擋（combat.js 的 hurtCalc） */
    if (P.shieldOut > G.t) return;
    P.shieldOut = G.t + 3;
    shoot(a.ang, D.spd, c, a, { spin: baseOf(S.eq.off).ic, spz: 40, life: 0.7, bounce: D.bounce, pierce: 0 });
  } else if (a.k === 'rend') {
    /* 撕裂：先記下流血，擊中後消耗它，一次結算剩下的 ×1.5，並傳給附近 */
    fxs('claw', P.x, P.y - 20, R, { rot: a.ang });
    for (const m of G.mobs) {
      if (m.hp <= 0) continue;
      const dd = dist(P, m);
      if (!(dd < R + m.r && angDiff(angTo(P, m), a.ang) < D.arc / 2 + m.r / Math.max(dd, 1))) continue;
      const b = hasState(m, 'bleed') && { ...m.ail.bleed };
      hitMob(m, c, angTo(P, m), 150 * c.kb, { a });
      if (!b || m.hp <= 0 || !takeState(m, 'bleed')) continue;
      fxs('bleed', m.x, m.y - m.sz * 0.5, 30);
      for (const o of G.mobs)
        if (o.hp > 0 && o !== m && dist(o, m) < 120 + o.r) o.ail.bleed = keepMax(o.ail.bleed, b.dps, 5);
      dotHit(m, b.dps * (b.t - G.t) * 1.5, 'phys');
    }
  } else if (a.k === 'cleave') {
    fxs('cleave', P.x + cos * R * 0.5, P.y + sin * R * 0.5, R * 0.6);
    sfx('slam');
    hitArc(a.ang, D.arc, R, 200 * c.kb);
  } else if (a.k === 'warcry') {
    P.rage = Math.min(30, (P.rage || 0) + 15);
    P.rageT = G.t;
    fxs('rage', P.x, P.y - 30, 40);
    fx({ k: 'ring', x: P.x, y: P.y, r: R, dur: 0.35, col: '#ff6b3d' });
    for (const m of G.mobs) if (m.hp > 0 && dist(P, m) < R + m.r) m.ail.intim = G.t + 4;
  } else if (a.k === 'smash') {
    /* 重擊：打前方最近的一隻；瀕臨重暈就碾壓（直接重暈）並震傷周圍 */
    let t = null,
      bd = 1e9;
    for (const m of G.mobs) {
      const dd = dist(P, m);
      if (m.hp > 0 && dd < R + m.r && angDiff(angTo(P, m), a.ang) < D.arc / 2 + m.r / Math.max(dd, 1) && dd < bd)
        (bd = dd), (t = m);
    }
    if (!t) return fxs('blunt', P.x + cos * R * 0.6, P.y + sin * R * 0.6, 40);
    const crushed = crush(t);
    hitMob(t, c, a.ang, 200 * c.kb, { a });
    if (crushed) {
      fxs('hammer', t.x, t.y, 90);
      shake(0.1);
      for (const o of G.mobs)
        if (o.hp > 0 && o !== t && dist(o, t) < 120 + o.r)
          hitMob(o, c, angTo(t, o), 260, { a, quiet: 1, mult: c.mult * 0.5, from: t });
    } else fxs('blunt', t.x, t.y - t.sz * 0.3, 45);
  } else if (a.k === 'leap' || a.k === 'blindpounce') {
    /* 落地：範圍攻擊；跳砸留碎裂地面，盲擊撲致盲（c.blind） */
    shake(0.1);
    sfx('slam');
    if (a.k === 'leap') {
      fxs('landing', P.x, P.y, R);
      addGround({ k: 'jagged', x: P.x, y: P.y, r: R, dur: 2, c, after: 0.8 });
    } else fxs('smoke', P.x, P.y, R * 0.8), fxs('claw', P.x, P.y - 20, R * 0.8, { rot: a.ang });
    around(P.x, P.y, R, 180);
  } else if (a.k === 'fissure') {
    /* 往前 5 處裂地（碰到牆停），每隻怪只打一次；完全破甲的消耗掉、這一下 ×2 */
    const hit = new Set();
    for (let k = 0; k < 5; k++) {
      const x = P.x + cos * (60 + k * 65),
        y = P.y + sin * (60 + k * 65),
        r = R * ST.aoeM * c.aoe;
      if (isWall(x, y)) break;
      fxs('dirt', x, y, r);
      for (const m of G.mobs)
        if (m.hp > 0 && !hit.has(m) && Math.hypot(m.x - x, m.y - y) < r + m.r) {
          hit.add(m);
          hitMob(m, c, a.ang, 100 * c.kb, { a, from: { x, y }, mult: takeState(m, 'broken') ? c.mult * 2 : 0 });
        }
    }
  } else if (a.k === 'thunder') {
    /* 每顆暴擊球多劈一道；連擊數 5 以上全部花掉換範圍 ×1.5 */
    const n = 1 + useChg('p'),
      r = R * (comboN() >= 5 ? (useCombo(), 1.5) : 1);
    for (let k = 0; k < n; k++) {
      const x = P.x + cos * (80 + k * 70) - sin * (k % 2 ? 24 : -24) * (k > 0),
        y = P.y + sin * (80 + k * 70) + cos * (k % 2 ? 24 : -24) * (k > 0);
      if (isWall(x, y)) break;
      fxs('thunder', x, y, r);
      fxs('strike', x, y, r);
      around(x, y, r, 80);
    }
    sfx('slam');
  } else if (a.k === 'spearthrow') {
    /* 每顆狂怒球多一根，多的擊中時爆炸 */
    const f = useChg('f'),
      n = c.proj + f;
    for (let i = 0; i < n; i++)
      shoot(a.ang + (i - (n - 1) / 2) * 0.12, D.spd, c, a, {
        sh: 'arrow',
        shs: 1.4,
        life: 0.8,
        ...(i >= c.proj ? { boom: 80 * ST.aoeM * c.aoe } : {})
      });
  } else if (a.k === 'gasarrow') {
    for (let i = 0; i < c.proj; i++)
      shoot(a.ang + (i - (c.proj - 1) / 2) * 0.2, D.spd, c, a, {
        sh: 'arrow',
        life: 0.6,
        boom: 1,
        gas: R * ST.aoeM * c.aoe
      });
  } else if (a.k === 'grenade') {
    throwGrenade(c, a.tx, a.ty, { r: R * ST.aoeM * c.aoe, el: 'fire' });
  } else if (a.k === 'flyswords') {
    if (swordN() >= SWORD_MAX) launchSwords(a.tx, a.ty), sfx('throw');
    else gainSwords(3 + c.proj - 1, c), fx({ k: 'ring', x: P.x, y: P.y, r: 45, dur: 0.25, col: '#cfd8e3' });
  } else if (a.k === 'shadowstrike' || a.k === 'wolfpounce') {
    /* 撲到目標身邊：影襲必定暴擊（翻滾後 2 秒內 ×2），狼撲上獵人標記 */
    const t = a.tm;
    if (!t || t.hp <= 0 || dist(P, t) > t.r + 60) return;
    const g = angTo(P, t);
    fxs(a.k === 'shadowstrike' ? 'flurry' : 'claw', P.x, P.y - 20, 70, { rot: g });
    if (a.k === 'shadowstrike') hitMob(t, c, g, 120 * c.kb, { a, crit: 1, mult: P.rolledT > G.t ? c.mult * 2 : 0 });
    else hitMob(t, c, g, 160 * c.kb, { a }), t.hp > 0 && markMob(t, 'poacher');
  } else if (a.k === 'clawchain') {
    /* 4 段爪擊，每段打中回 1% 生命 */
    const ang = a.ang + [-0.25, 0.25, -0.12, 0.12][idx];
    fxs('claw', P.x, P.y - 20, R, { rot: ang });
    if (hitArc(ang, D.arc, R, 60 * c.kb)) P.hp = Math.min(ST.hp, P.hp + ST.hp * 0.01);
  } else if (a.k === 'chainsweep') {
    const r = R * [1, 1.3, 1.7][a.stage || 0];
    fxs('whip', P.x, P.y - 20, r, { rot: a.ang });
    hitArc(a.ang, D.arc, r, 150 * c.kb);
  } else if (a.k === 'banner') {
    if (plantBanner({ dmg: 30 })) fxs('pillar', P.x, P.y, 70), sfx('cast');
  } else if (a.k === 'corpseboom') {
    /* 屍體最大生命 10%（每級 +3%）的火焰範圍傷害，只吃抗性；也是引爆器 */
    const cp = takeCorpse(a.tx, a.ty, 250);
    if (!cp) return;
    const r = R * ST.aoeM * c.aoe,
      d = cp.mhp * 0.1 * (1 + 0.03 * (c.lv - 1));
    fxs('dark', cp.x, cp.y, r);
    sfx('slam');
    for (const m of G.mobs) if (m.hp > 0 && Math.hypot(m.x - cp.x, m.y - cp.y) < r + m.r) dotHit(m, d, 'fire');
    detonate(cp.x, cp.y, r, c);
  } else if (a.k === 'paperdoll') {
    /* 消耗一具屍體叫紙人兵（15 秒，最多 4 隻，滿了換掉最舊的） */
    const cp = takeCorpse(P.x, P.y, 250);
    if (!cp) return;
    const dolls = G.allies.filter(w => w.src === 'doll');
    if (dolls.length >= 4) G.allies.splice(G.allies.indexOf(dolls[0]), 1);
    callWolf('doll', c, cp, G.t + 15);
    fxs('rise', cp.x, cp.y, 40);
  } else if (a.k === 'redbloom') {
    /* 死亡紅花：舊的那排先爆，再往滑鼠方向鋪 5 朵（碰到牆就停） */
    popBlooms();
    for (let k = 0; k < 5; k++) {
      const x = P.x + cos * (40 + (k * D.len) / 4),
        y = P.y + sin * (40 + (k * D.len) / 4);
      if (isWall(x, y)) break;
      addGround({ k: 'bloom', x, y, r: R, dur: D.dur, c, dps: 1 });
    }
    sfx('cast');
  } else if (a.k === 'bearmaul') {
    fxs('claw', P.x, P.y - 20, R, { rot: a.ang });
    fxs('slam', P.x + cos * R * 0.5, P.y + sin * R * 0.5, R * 0.5);
    if (hitArc(a.ang, D.arc, R, 220 * c.kb)) (P.rage = Math.min(30, (P.rage || 0) + 2)), (P.rageT = G.t);
  }
}
function shoot(ang, spd, c, a, o) {
  G.shots.push({
    x: P.x + Math.cos(ang) * 20,
    y: P.y - 18 + Math.sin(ang) * 20,
    vx: Math.cos(ang) * spd,
    vy: Math.sin(ang) * spd,
    ang,
    r: 10,
    pierce: c.pierce,
    c,
    a,
    hit: new Set(),
    life: 0.9,
    ...o
  });
}
/* 火球爆炸 */
function boom(s) {
  if (s.done) return;
  s.done = 1;
  if (s.gas) {
    addGround({ k: 'gas', x: s.x, y: s.y + 18, r: s.gas, dur: 5, c: s.c, dps: 0.6 });
    return fxs('gas', s.x, s.y + 18, s.gas);
  }
  fx({ k: 'ring', x: s.x, y: s.y + 18, r: s.boom, dur: 0.3, col: '#ff8a4c' });
  sfx('slam');
  for (const m of G.mobs)
    if (m.hp > 0 && Math.hypot(m.x - s.x, m.y - 18 - s.y) < s.boom + m.r)
      hitMob(m, s.c, angTo(s, m), 120 * s.c.kb, { a: s.a, from: { x: s.x, y: s.y + 18 } });
}

/* ---------- 傷害（公式在 combat.js 的 hitCalc） ---------- */
/* 沒有技能時的預設（反擊、盾擊、狼）：左鍵斬擊、沒有輔助 */
const BASEC = () => ({
  D: SKILLS.slash,
  mult: 1,
  more: 1,
  critInc: 0,
  critX: 0,
  fireAdd: 0,
  kb: 1,
  pen: 0,
  ailMag: 0,
  bleedCh: 0,
  poisonCh: 0,
  poiStack: 0,
  impaleCh: 0
});
/* 打中一隻怪：o.a 出手、o.quiet 不停頓不震（狼、毒、反擊）、o.stun 暈眩、o.mult 改這一下的倍率（換成「更多」） */
function hitMob(m, c, ang, kb, o = {}) {
  /* 不能穿牆：從出手的地方（o.from，預設是玩家）看不到就打不到 */
  const f = o.from || P;
  if (!los(f.x, f.y, m.x, m.y)) return;
  const a = o.a || {};
  let mult = (o.mult ? o.mult / (c.mult || 1) : 1) * (a.mul || 1),
    crit = !!(a.crit || o.crit);
  /* 0.2.22：攻擊可能被閃避（熵值，combat.js 的 hitRoll） */
  if (!hitRoll(m, c, { minion: o.minion, unit: a.unit }))
    return num(m.x, m.y - m.sz, 0, 'miss', '未命中'), aggroPack(m);
  const r = hitCalc(c, m, { mult, crit, minion: o.minion, unit: a.unit });
  applyAil(m, r, c);
  if (c.k === 'axethrow' && hasState(m, 'bleed')) fxs('bleed', m.x, m.y - m.sz * 0.5, 30);
  onHitBase(m, r, c);
  /* mech.js：火焰點燃可燃地面、引爆器、連擊數、榮耀、暴擊觸發 */
  if (r.pre.fire > 0) igniteAt(m.x, m.y);
  if (c.D.detonator) detonate(m.x, m.y, 60, c);
  if ((c.D.tags || []).includes('melee') && !o.quiet) comboHit(a);
  gainGlory(r.crit ? 4 : 1);
  if (r.crit && !a.trig) metaEvent('crit', m);
  if (ST.wt === 'qstaff' && (c.D.tags || []).includes('melee') && !o.quiet) P.mp = Math.min(ST.mp, P.mp + 1);
  m.hp -= r.d;
  if (a) a.any = 1;
  m.flash = 0.09;
  m.sq = 1;
  if (o.stun && !m.boss) m.stun = o.stun;
  if (!m.boss && kb) {
    const res = m.elite ? 0.5 : m.D.ai === 'slam' ? 0.4 : 1;
    m.vx += Math.cos(ang) * kb * res * (r.crit ? 1.5 : 1);
    m.vy += Math.sin(ang) * kb * res * (r.crit ? 1.5 : 1);
  }
  aggroPack(m);
  num(m.x, m.y - m.sz, r.d, r.crit ? 'crit' : r.el);
  fxs(r.crit ? 'crit' : 'hit', m.x, m.y - m.sz * 0.3, m.sz * (r.crit ? 0.8 : 0.5));
  if (!o.quiet) {
    sparks(m.x, m.y - m.sz * 0.4, ang, r.crit ? 10 : 5, r.crit ? '#ffd166' : ELC[r.el]);
    hitstop(r.crit ? 0.085 : 0.04);
    sfx(r.crit ? 'crit' : 'hit');
    if (ST.loh) P.hp = Math.min(ST.hp, P.hp + ST.loh);
  }
  /* 吸血：1 秒內回完；同時只有一筆（取回得最快的） */
  const lr = r.d * c.leech * (1 + MM('pleech') / 100);
  /* 瓦爾契約（基石）：吸血立即回復 */
  if (c.leech && ST.vaal) P.hp = Math.min(ST.hp, P.hp + lr);
  else if (c.leech && (!P.lch || P.lch.t <= G.t || lr > P.lch.rate)) P.lch = { rate: lr, t: G.t + 1 };
  /* 劍的招牌點（0.2.23）：近戰擊中有機率再打一次（再打的那一下不會再觸發） */
  if (m.hp <= 0) killMob(m);
  else if (ST.dbl && !o.again && (c.D.tags || []).includes('melee') && Math.random() * 100 < ST.dbl)
    hitMob(m, c, ang, 0, { ...o, again: 1, quiet: 1 });
}

/* 不吃暴擊的傷害：只吃抗性 */
function dotHit(m, d, el, quiet) {
  if (el !== 'phys') d *= 1 - resOf(m, el) / 100;
  m.hp -= d;
  if (!quiet) num(m.x, m.y - m.sz, d, el);
  aggroPack(m);
  if (m.hp <= 0) killMob(m);
}
/* 怪物每格：異常（combat.js）；回傳 true＝這格不行動 */
function mobTick(m, dt) {
  const stop = ailTick(m, dt);
  if (m.hp <= 0) return killMob(m), true;
  return stop;
}
/* 能量護盾：受傷先扣護盾（流血、中毒在 combat.js 另外算）；回傳剩下的傷害 */
function esAbsorb(d) {
  P.lastHurt = G.t;
  if (P.es > 0) {
    const ab = Math.min(P.es, d);
    P.es -= ab;
    d -= ab;
  }
  return d;
}

/* ---------- 召喚戰狼：狼跟著你、咬最近的怪 ---------- */
function callWolf(src, c, at = P, t = 0) {
  const p = floorNear(at.x, at.y, 30, 80, 14) || { x: at.x, y: at.y };
  G.allies.push({ src, x: p.x, y: p.y, vx: 0, vy: 0, r: 14, cd: rnd(0.2, 0.6), c, ph: Math.random() * TAU, t });
}
/* 同伴這一下的倍率：寶石叫的狼吃群狼、紙人用寶石倍率、魔像與光環狼用左鍵技能打折 */
const allyMult = (w, c) =>
  w.src === 'gem' ? c.mult * c.wolfM : w.src === 'doll' ? c.mult : w.src === 'golem' ? c.mult * 0.8 : 0.4;
function updAllies(dt) {
  for (const w of G.allies) {
    w.cd -= dt;
    w.ph += dt * 10;
    let t = null,
      bd = 420;
    for (const m of G.mobs)
      if (m.hp > 0 && dist(m, P) < 500 && dist(m, w) < bd) {
        bd = dist(m, w);
        t = m;
      }
    const goal = t || { x: P.x - 40 + (w.ph % 3) * 20, y: P.y + 30 },
      d = dist(w, goal);
    w.mv = d > (t ? t.r + 20 : 50);
    if (w.mv) {
      const a = angTo(w, goal),
        sp = d > 300 && !t ? 420 : 280;
      moveBody(w, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
      w.face = Math.cos(a);
    }
    if (t && d < t.r + 30 && w.cd <= 0) {
      w.cd = 0.8;
      fx({ k: 'claw', x: w.x, y: w.y, ang: angTo(w, t), r: 34, dur: 0.12 });
      const c = w.c || slotCfg(0) || BASEC(),
        mult = allyMult(w, c);
      hitMob(t, c, angTo(w, t), 60, { quiet: 1, mult, minion: 1, from: w });
    }
    if (dist(w, P) > 900) (w.x = P.x), (w.y = P.y);
  }
}

/* ---------- 毒刃雨、隕石 ---------- */
function updPools(dt) {
  for (const p of G.pools) {
    p.t += dt;
    p.tick -= dt;
    if (p.tick <= 0) {
      p.tick = 0.5;
      for (const m of G.mobs)
        if (m.hp > 0 && Math.hypot(m.x - p.x, m.y - p.y) < p.r + m.r)
          hitMob(m, p.c, 0, 0, { quiet: 1, a: p.a, mult: p.c.mult, from: p });
    }
  }
  G.pools = G.pools.filter(p => p.t < p.dur);
  for (const o of G.meteors) {
    o.t += dt;
    if (o.t >= o.dur && !o.done && o.curse) {
      o.done = 1;
      fxs('dark', o.x, o.y, o.r * 0.6);
      for (const m of G.mobs)
        if (m.hp > 0 && Math.hypot(m.x - o.x, m.y - o.y) < o.r + m.r && los(o.x, o.y, m.x, m.y))
          curseMob(m, o.curse, o.lv);
    } else if (o.t >= o.dur && !o.done) {
      o.done = 1;
      fx({ k: 'ring', x: o.x, y: o.y, r: o.r, dur: 0.4, col: '#ff6b3d' });
      sfx('slam');
      for (const m of G.mobs)
        if (m.hp > 0 && Math.hypot(m.x - o.x, m.y - o.y) < o.r + m.r)
          hitMob(m, o.c, Math.atan2(m.y - o.y, m.x - o.x), 260, { a: o.a, from: o });
    }
  }
  G.meteors = G.meteors.filter(o => !o.done);
}
function updSkills(dt) {
  /* 能量護盾：2 秒沒受傷開始回充，每秒 25% */
  if (ST.es && P.es < ST.es && G.t - (P.lastHurt || -9) > 2)
    P.es = Math.min(ST.es, P.es + ST.es * 0.25 * (1 + (ST.esRec + MM('pes')) / 100) * dt);
  /* 戰狼精魄光環 */
  const aw = G.allies.some(w => w.src === 'aura');
  if (G.scene === 'map' && ST.auraWolf && !aw) callWolf('aura');
  else if (!ST.auraWolf && aw) G.allies = G.allies.filter(w => w.src !== 'aura');
  /* 召喚魔像（光環欄）：拿權杖才會出來 */
  const gm = G.allies.some(w => w.src === 'golem'),
    gOn = ST.auraGolem;
  if (G.scene === 'map' && gOn && !gm) callWolf('golem');
  else if (!gOn && gm) G.allies = G.allies.filter(w => w.src !== 'golem');
  /* 紙人 15 秒就消失 */
  G.allies = G.allies.filter(w => !w.t || w.t > G.t);
  updAllies(dt);
  updPools(dt);
  updUnits(dt);
  if (G.scene === 'map') mechTick(dt);
}
/* 進地圖、回藏身處：重設狀態 */
function skillsEnter() {
  Object.assign(P, { lastHurt: -9, rage: 0, rageT: 0 });
  Object.assign(G, { allies: [], pools: [], meteors: [], units: [], mineT: 0 });
  mechEnter();
  P.es = ST.es;
}

/* 出手速度、移動速度：buff 與冰緩、冰凍（combat.js） */
function speedMul() {
  return buffSpeed() * Math.max(0.3, playerSlow()) * ((formOf() && formOf().atk) || 1);
}
function moveMul() {
  return buffMove() * playerSlow() * ((formOf() && formOf().move) || 1);
}
/* 殺怪：擊殺回血 */
function onKill() {
  if (ST.killHeal) P.hp = Math.min(ST.hp, P.hp + ST.killHeal);
}

/* ---------- 陷阱、地雷、砲台、圖騰（場上單位） ---------- */
const UNIT_MAX = { trap: 4, mine: 6, totem: 2, turret: 2 };
const UNIT_N = { trap: '陷阱', mine: '地雷', totem: '圖騰', turret: '砲台' };
function placeUnit(c, w) {
  const d = Math.min(320, Math.hypot(w.x - P.x, w.y - P.y)),
    a = Math.atan2(w.y - P.y, w.x - P.x);
  /* 往滑鼠方向走，碰到牆就停在牆前（不能丟到隔壁房間） */
  let x = P.x,
    y = P.y;
  for (let s = 12; s <= d; s += 12) {
    const nx = P.x + Math.cos(a) * s,
      ny = P.y + Math.sin(a) * s;
    if (!open(nx, ny, 12)) break;
    (x = nx), (y = ny);
  }
  const type = c.unit,
    mine = G.units.filter(u => u.type === type);
  /* 滿了就收掉最舊的 */
  if (mine.length >= UNIT_MAX[type] + (ST.units || 0)) G.units.splice(G.units.indexOf(mine[0]), 1);
  const D = c.D,
    dur = type === 'trap' || type === 'mine' ? 30 : D.dur || 8,
    rate = D.rate || Math.max(0.5, D.t * 1.8);
  G.units.push({ type, x, y, c, t: 0, dur, cd: 0.3, rate });
  if (type === 'mine') G.mineT = G.t + 1.2;
  fx({ k: 'ring', x, y, r: 30, dur: 0.25, col: '#cfd8e3' });
}
/* 從場上單位施放：本身就是單位的技能（陷阱爆開、地雷爆開、砲台射擊、火焰圖騰）或轉換來的技能 */
function unitFire(u, tgt, mul = 1) {
  const c = u.c,
    D = c.D,
    ang = tgt ? Math.atan2(tgt.y - u.y, tgt.x - u.x) : 0,
    a = { k: c.k, c, ang, tx: tgt ? tgt.x : u.x, ty: tgt ? tgt.y : u.y, hits: [0], n: 0, unit: 1, mul };
  if (D.unit === 'trap' || D.unit === 'mine') {
    const r = (D.r || 100) * ST.aoeM * c.aoe;
    fx({ k: 'ring', x: u.x, y: u.y, r, dur: 0.35, col: D.el === 'cold' ? '#8fd6ff' : '#ff8a4c' });
    sfx('slam');
    for (const m of G.mobs)
      if (m.hp > 0 && Math.hypot(m.x - u.x, m.y - u.y) < r + m.r)
        hitMob(m, c, Math.atan2(m.y - u.y, m.x - u.x), 140, { a, stun: D.stun, from: u });
    return;
  }
  /* 其他：暫時把施放點換成單位的位置，照原本的技能出手（出手完放回來） */
  const px = P.x,
    py = P.y,
    pf = P.face;
  P.x = u.x;
  P.y = u.y;
  if (D.unit === 'turret') shoot(ang, 820, c, a, { life: 0.7, bolt: 1, sh: 'arrow', shs: 1.2 });
  else if (D.unit === 'totem') shoot(ang, 520, c, a, { boom: D.r * ST.aoeM, fire: 1, life: 1 });
  else actHit(a, 0);
  P.x = px;
  P.y = py;
  P.face = pf;
}
function updUnits(dt) {
  const near = (u, r) => {
    let best = null,
      bd = r;
    for (const m of G.mobs)
      if (m.hp > 0 && Math.hypot(m.x - u.x, m.y - u.y) < bd) (bd = Math.hypot(m.x - u.x, m.y - u.y)), (best = m);
    return best;
  };
  const keep = [],
    boomMines = G.mineT && G.t >= G.mineT;
  const mines = G.units.filter(u => u.type === 'mine').length;
  for (const u of G.units) {
    u.t += dt;
    if (u.type === 'trap') {
      const m = u.t > 0.4 && near(u, 70);
      if (m) {
        unitFire(u, m);
        continue;
      }
    } else if (u.type === 'mine') {
      if (boomMines) {
        unitFire(u, near(u, 400), 1 + 0.1 * (mines - 1));
        continue;
      }
    } else if ((u.cd -= dt) <= 0) {
      const m = near(u, 480);
      if (m) (u.cd = u.rate), unitFire(u, m);
    }
    if (u.t < u.dur) keep.push(u);
  }
  if (boomMines) G.mineT = 0;
  G.units = keep;
}
