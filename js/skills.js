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
  if (U.conv && (D.unit || D.noConv || D.tags.includes('move') || D.tags.includes('minion'))) return false;
  if (
    U.meta === 'auto' &&
    (D.tags.includes('move') || D.tags.includes('minion') || D.unit === 'trap' || D.unit === 'mine')
  )
    return false;
  if (U.all && !U.all.every(t => D.tags.includes(t))) return false;
  return !U.need.length || U.need.some(t => D.tags.includes(t));
};
/* 一格技能的實際數值（技能等級＋輔助＋天賦冷卻時間恢復率）；觸發、幻影直接用 gemCfg（i = −1）；c.g 是寶石本身 */
const slotCfg = i => gemCfg(S.skills[i] && S.skills[i].a, i);
function gemCfg(g, i) {
  if (!g) return null;
  const D = SKILLS[g.gem],
    /* 長杖：法術技能等級 +1 */
    lv = g.lv + (D.tags.includes('spell') ? ST.spellLv : 0),
    c = {
      i,
      k: g.gem,
      D,
      lv,
      /* 攻擊的技能倍率（寶石等級）；「更多」另外放在 more（combat.js 的 hitCalc 第 5 步） */
      mult: gemMult(D, lv),
      more: 1,
      aoe: 1,
      speed: D.tags.includes('spell') ? (1 + ST.castP / 100) * (hasBuff('arcane') ? 1.15 : 1) : 1,
      mp: D.mp * gemMpMul(g.lv),
      cd: D.cd || 0,
      cdrP: ST.cdr,
      g,
      critInc: D.crit || 0,
      critX: 0,
      leech: ST.leech / 100,
      /* 天賦的投射物數量、穿透（0.2.23）只給投射物技能 */
      proj: (D.cnt || 1) + (D.tags.includes('proj') ? ST.proj : 0) + (D.gren ? ST.grenN : 0),
      pierce: (D.pierce || 0) + (D.tags.includes('proj') ? ST.pierce : 0),
      /* 全域投射物連鎖（0.2.25，彈射）：打中後彈向 260 內最近、還沒打過的敵人 */
      chain: D.tags.includes('proj') && !D.noChain ? ST.chain : 0,
      /* 分裂、迴旋（第 13～16 批）：只給投射物技能；擲斧品質的迴旋是機率，在 shoot 的 o.back */
      fork: D.tags.includes('proj') && !!ST.fork,
      ret: D.tags.includes('proj') && !!ST.projRet,
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
      pin: D.pin || 0,
      wolves: (D.cnt || 0) + ST.wolfN,
      wolfM: 1,
      /* 品質（0.2.29）0～1；fan 扇形角度倍率（多重投射的品質） */
      q: (g.q || 0) / GEM_Q_MAX,
      fan: 1
    };
  /* 閃電箭：品質每 1% 物理轉閃電 +1%、感電機率更多 +1% */
  if (D.cvL) (c.cvL = D.cvL + (g.q || 0)), (c.shockMore = D.shockMore + (g.q || 0)), (c.boltChain = 1);
  /* 重擊的品質：粉碎重擊後的下一下 */
  if (g.gem === 'smash' && P && P.smashQ) c.speed /= 1 - 0.5 * P.smashQ;
  for (const sp of g.sup || []) {
    if (!sp || !supOK(D, sp, g)) continue;
    c.more *= 1 + 0.01 * (sp.lv - 1);
    const k = sp.gem,
      sq = (sp.q || 0) / GEM_Q_MAX;
    if (k === 'multi') (c.proj += 2), (c.more *= 0.8), (c.fan *= 1 - 0.5 * sq);
    else if (k === 'pierce') (c.pierce += 3), (c.pSplit = 20 * sq);
    else if (k === 'area') (c.aoe *= 1.4), (c.solo = 0.2 * sq);
    else if (k === 'fury') (c.more *= 1.35), (c.mp *= 1.4 - 0.2 * sq);
    else if (k === 'haste') c.speed *= 1.25 * (P && recent('kill') ? 1 + 0.15 * sq : 1);
    else if (k === 'crit') (c.critInc += 50), (c.critX += 40), (c.critChg = 20 * sq);
    else if (k === 'leech') (c.leech += 0.03), (c.leechMp = 0.2 * sq);
    else if (k === 'cdr') c.cdrP += 50;
    else if (k === 'fireadd') (c.fireAdd += 0.25), (c.addIgn = 20 * sq);
    else if (k === 'heavy') (c.kb *= 2), (c.more *= 1.15), (c.wallCh = 20 * sq);
    else if (k === 'pack') (c.wolves += 1), (c.wolfM *= 1.3), (c.wolfBl = 20 * sq);
    else if (k === 'bleed') (c.bleedCh += 25), (c.ailMag += 20 * sq);
    else if (k === 'poison') (c.poisonCh += 25), (c.ailMag += 20 * sq);
    else if (k === 'poistack') (c.poiStack += 2), (c.ailMag += 10), (c.poiBurst = 0.2 * sq);
    else if (k === 'ailmag') (c.ailMag += 30), (c.ailExt = 20 * sq);
    else if (k === 'scorch' || k === 'brittle' || k === 'sap') (c.alt = k), (c.altQ = sq);
    else if (k === 'expose') (c.expose = 1), (c.expQ = sq);
    else if (k === 'armbreak') (c.armBreak = 1), (c.brkQ = sq);
    else if (k === 'elec') (c.elc = 1), (c.elcQ = sq);
    else if (k === 'pin') c.pin = 1 + 0.2 * sq;
    else if (k === 'wither') (c.wither = 1), (c.witherMax = 10 + 2 * Math.floor(sq * 4));
    else if (k === 'blind') (c.blind = 1), (c.blindQ = sq);
    else if (k === 'arcane') (c.arcane = 1), (c.arcKill = sq);
    else if (k === 'autocast') c.auto = sp;
    else if (SUPPORTS[k].conv && !c.conv) {
      c.conv = SUPPORTS[k].conv;
      c.totemCast = 20 * sq;
      c.more *= c.conv === 'trap' ? 1.2 : c.conv === 'totem' ? 0.7 : 1;
    }
  }
  if (c.auto) (c.cd += AUTO.cd * (1 - (c.auto.q || 0) / 100)), (c.mp *= AUTO.mp);
  c.cd /= 1 + c.cdrP / 100; /* 冷卻時間恢復率：冷卻 ÷ (1 + x/100)，沒有上限 */
  /* 效用：魔力消耗 ÷ (1 + 效用%) */
  c.mp = D.mp ? Math.max(1, Math.round(c.mp / (1 + ST.mpEff / 100))) : 0;
  c.unit = D.unit || c.conv;
  return c;
}
/* 出手一次要幾秒（useSlot 與面板共用） */
/* tAdd（0.2.42）：增加技能使用時間，固定秒數、不吃任何速度，加在最後 */
const actDur = c =>
  c.D.t / (c.D.shield ? ST.sasM : ST.asM) / c.speed / speedMul() / (isSpell(c.D) ? 1 : atkBuf()) + (c.D.tAdd || 0);
/* 技能基礎攻擊時間（只在技能面板顯示）：技能的 t 除以武器每秒攻擊次數（1.1 是 t 的基準），法術就是 t */
const baseT = c => c.D.t / (isSpell(c.D) ? 1 : (c.D.shield ? 1.2 : ST.waps) / 1.1);
/* 持續時間（0.2.42）：只有 duration 標籤的技能吃「技能持續時間」 */
const durOf = c => (c.D.dur || 0) * (c.D.tags.includes('duration') ? 1 + ST.durP / 100 : 1);
/* 面板的數字：hit 每下（含暴擊期望、不算怪物防禦）、dps、dot 每秒、unit 單體 DPS、eff 沒有傷害的效果 */
function skillNums(c) {
  const D = c.D,
    tg = D.tags;
  if (D.curse) return { eff: CURSE_D[D.curse] };
  if (D.mark) return { eff: MARK_D[D.mark] };
  if (c.k === 'corpseboom') return { eff: `屍體最大生命 ${(10 * (1 + 0.03 * (c.lv - 1))).toFixed(1)}% 的範圍火焰傷害` };
  if (!D.m) return {};
  if (tg.includes('minion')) {
    const r = hitCalc(c, null, { avg: 1, keep: 1, minion: 1, mult: c.wolfM });
    return { ...r, hit: r.d, unit: r.d / ALLY_RATE };
  }
  if (c.unit) {
    const r = hitCalc(c, null, { avg: 1, keep: 1, unit: 1 }),
      rate = D.rate || Math.max(0.5, D.t * 1.8);
    return c.unit === 'trap' || c.unit === 'mine' ? { ...r, hit: r.d } : { ...r, hit: r.d, unit: r.d / rate };
  }
  const r = hitCalc(c, null, { avg: 1, keep: 1, crit: c.k === 'shadowstrike', fly: 200 });
  /* 持續傷害：毒刃雨每 0.5 秒跳一下全傷害 */
  if (tg.includes('dot')) return { ...r, hit: r.d, dot: r.d / 0.5 };
  return { ...r, hit: r.d, dps: (r.d * (D.hits ? D.hits.length : 1)) / Math.max(actDur(c), c.cd) };
}
/* 按下技能鍵 */
/* 武器技能要拿對的武器（照 PoE2） */
/* 盾技能（D.off）要副手拿盾；wtNeed 沒有限制時是空字串 */
/* 空手（ST.wt 'unarmed'）不能用限定武器的技能，只有預設攻擊斬擊可以 */
const wtOK = D =>
  (!D.wt || D.wt.includes(ST.wt) || (ST.wt === 'unarmed' && D === SKILLS.slash)) && (!D.off || ST.shield);
const wtNeed = D => (D.wt ? '要拿' + D.wt.map(w => WTN[w]).join('或') : D.off ? '副手要拿盾' : '');
const needTxt = D => '需要：' + (D.wt ? D.wt.map(w => WTN[w]).join('、') : '副手的盾');
/* 插了暴擊施放（0.2.13 的觸發輔助）的法術：不能手動施放 */
const metaOf = g =>
  g && (g.sup || []).find(x => x && SUPPORTS[x.gem] && SUPPORTS[x.gem].meta && supOK(SKILLS[g.gem], x, g));
/* 練習區（藏身處的石圈，hideout.js）：in 站在裡面、real 實戰模式、t 稻草人階級、dot 正在結算持續傷害 */
const PRAC = { in: false, real: false, t: 0, dot: 0 };
/* 能不能出招：地圖裡，或藏身處的練習區 */
const fightOn = () => G.scene === 'map' || PRAC.in;
/* 練習區預設無限魔力、無冷卻；實戰模式才照真的算 */
const pracFree = () => G.scene === 'hide' && PRAC.in && !PRAC.real;
/* 放不放得出來（手動與自動共用）：回傳不能放的原因。地獄火（0.2.26）不扣魔力、改成累積，所以不檢查魔力；血魔法優先 */
function skillWhy(c, at) {
  if (c.g && gemLack(c.g).length) return '能力值不足';
  const hell = ST.hellfire && !ST.blood;
  if (!pracFree() && (ST.blood ? P.hp <= c.mp + 1 : !hell && mpAvail() < c.mp))
    return ST.blood ? '生命不夠施放' : '魔力不足';
  if (c.k === 'banner' && (P.glory || 0) < 100) return '榮耀不夠（' + Math.floor(P.glory || 0) + '／100）';
  if ((c.k === 'corpseboom' || c.k === 'paperdoll') && !corpseNear(c.k === 'paperdoll' ? P : at, 250))
    return '附近沒有屍體';
  const A = c.D.ammo && P.ammo && P.ammo[c.k];
  if (A && A.until > G.t) return '裝填中';
  return '';
}
/* 付費：彈藥、魔力（或生命、地獄火）、流順之風、冷卻 */
function skillPay(c, i) {
  if (pracFree()) return;
  if (c.D.ammo) ammoUse(c.k, c.D.ammo[0] + ST.ammoN, c.D.ammo[1]);
  if (ST.blood) sacrifice('hp', c.mp);
  else if (ST.hellfire) hfGain(c.mp);
  else payMp(c.mp);
  galeUse();
  if (c.cd) P.cds['s' + i] = c.cd;
}
function useSlot(i) {
  if (P.act || P.roll || G.state !== 'play') return false;
  if (!fightOn()) return pracHint(), false;
  if ((P.ail && P.ail.frozen > G.t) || pStagger() || pHeavy()) return false;
  const c = slotCfg(i);
  if (!c) return false;
  const mt = metaOf(c.g);
  if (mt) return hudWarn(`${c.D.n}插了${SUPPORTS[mt.gem].n}：會自動施放，不能手動`), false;
  if (!wtOK(c.D)) return hudWarn(c.D.n + '：' + wtNeed(c.D)), false;
  if ((P.cds['s' + i] || 0) > 0) return false;
  const w = mouseWorld(),
    D = c.D,
    tm = D.toMob && mobNear(w.x, w.y, 150, D.dist);
  const why = skillWhy(c, w) || (D.toMob && !tm && '滑鼠附近沒有敵人');
  if (why) return hudWarn(why), false;
  if (D.gren && !pracFree() && !grenadeReady(c.k, D.gren[0], D.gren[1])) return hudWarn('手雷還沒好'), false;
  skillPay(c, i);
  if (c.k === 'smash') P.smashQ = 0;
  /* 狼撲的品質：撲向被印記的怪不花魔力 */
  if (c.k === 'wolfpounce' && tm && tm.ail.mark && qRoll(20 * c.q)) addMp(c.mp);
  /* 變身（mech.js）：用了不是這個形態的技能就變回來 */
  formFor(c.D);
  const ang = Math.atan2(w.y - P.y, w.x - P.x);
  P.face = ang;
  /* 陷阱、地雷、砲塔圖騰、圖騰：放在滑鼠位置（最遠 320） */
  if (c.unit) {
    placeUnit(c, w);
    P.act = { k: c.k, c, t: 0, dur: 0.25 / c.speed, ang, hits: [], n: 0, place: 1 };
    sfx('throw');
    return true;
  }
  const stage = D.stage ? nextStage(c.k) : 0,
    a = (P.act = {
      k: c.k,
      c,
      t: 0,
      dur: actDur(c),
      ang,
      hits: D.hits || [0.42],
      n: 0,
      tx: w.x,
      ty: w.y,
      stage,
      final: !!D.stage && isFinal(stage),
      sealA: D.seal ? sealBreak(c.k) * D.seal.aoe : 0
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
/* 在藏身處想出招：提醒去練習區（按住連打時不要一直跳） */
let pracHintT = -9;
function pracHint() {
  if (G.t - pracHintT < 3) return;
  pracHintT = G.t;
  hudWarn('到練習區才能出招');
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
          if (a.c.i >= 0 && a.c.q) P.cds['s' + a.c.i] *= 1 - 0.1 * a.c.q;
        }
    } else if (f >= 1 && !a.n++) actHit(a, 0);
  } else {
    /* 施放時移動（combat.js 的 CAST_MOVE） */
    moveBody(P, mx * ST.spd * CAST_MOVE * dt, my * ST.spd * CAST_MOVE * dt);
    while (a.n < a.hits.length && a.t >= a.dur * a.hits[a.n]) actHit(a, a.n++);
  }
  if (a.t >= a.dur) P.act = null;
}

/* ---------- 各技能出手 ---------- */
function actHit(a, idx) {
  const c = a.c,
    D = c.D,
    R =
      (D.r || 0) *
      (ST.aoeM + (a.sealA || 0) / 100) *
      c.aoe *
      (ST.wt === 'spear' && D.tags.includes('melee') ? 1.25 : 1);
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
    /* 斬擊的品質：第 3 段放斬波 */
    if (st === 2 && c.q)
      shoot(a.ang, 760, { ...c, mult: c.mult * 0.5 * c.q, pierce: 99 }, a, { life: 0.4, sh: 'arrow', shs: 1.6 });
    if (D.gain && n) P.mp = Math.min(ST.mp, P.mp + D.gain * n);
  } else if (a.k === 'thrust') {
    /* 招架反擊：往前刺一整排；受招架的怪消耗受招架、必定暴擊、給狂怒球 */
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
      if (par) {
        gainChg('f');
        for (const o of G.mobs) if (o !== m && o.hp > 0 && dist(o, m) < 120 && qRoll(40 * c.q)) applyParry(o);
      }
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
    const n = c.proj;
    for (let i = 0; i < n; i++)
      shoot(a.ang + (i - (n - 1) / 2) * 0.22 * c.fan, D.spd, c, a, { life: 0.7, sh: 'arrow' });
  } else if (a.k === 'refract') {
    /* 只留這次射的：飛到滑鼠位置（碰牆提早）才變成場上的箭矢，路上不打人 */
    for (const m of G.mobs) if (m.arrow) m.hp = 0;
    const life = Math.max(0.05, Math.min(D.reach, Math.hypot(a.tx - P.x, a.ty - P.y)) / D.spd);
    for (let i = 0; i < c.proj; i++)
      shoot(a.ang + (i - (c.proj - 1) / 2) * 0.3 * c.fan, D.spd, c, a, {
        life,
        sh: 'arrow',
        noHit: 1,
        onEnd: s => {
          const y = s.y + 18,
            p = open(s.x, y, 12) ? { x: s.x, y } : floorNear(s.x, y, 10, 80, 14) || P;
          spawnArrow(p.x, p.y, c);
        }
      });
  } else if (a.k === 'frostbolt') {
    const n = c.proj;
    for (let i = 0; i < n; i++)
      shoot(a.ang + (i - (n - 1) / 2) * 0.18 * c.fan, D.spd, c, a, {
        onEnd: s => c.q && addGround({ k: 'chill', x: s.x, y: s.y + 18, r: 70, dur: 2 * c.q }),
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
    let jumps = D.chain + (c.proj - 1) + (c.chain || 0);
    for (let k = 0; cur && k <= jumps; k++) {
      /* 電弧的品質：感電的怪不算跳數 */
      if (hasState(cur, 'shock') && qRoll(20 * c.q)) jumps++;
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
    addGround({ k: 'jagged', x: cx, y: cy, r: R * 0.5, dur: 2, c, after: 1.2, q: c.q });
  } else if (a.k === 'whirl') {
    fx({ k: 'ring', x: P.x, y: P.y, r: R, dur: 0.28 });
    fxs('spin', P.x, P.y - 10, R);
    /* 旋風斬的品質：品質越高越往內吸 */
    for (const m of G.mobs)
      if (m.hp > 0 && dist(P, m) < R + m.r) hitMob(m, c, angTo(P, m), 320 * c.kb * (1 - 2 * (c.q || 0)), { a });
  } else if (a.k === 'nova') {
    /* 灌注：火＝範圍 ×1.5＋燃燒地面，冰＝冰緩地面（觸發、幻影施放的不吃灌注） */
    const keep = qRoll(20 * c.q),
      use = el => !a.trig && infN(el) > 0 && (keep || takeInf(el)),
      fire = use('fire'),
      cold = use('cold'),
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
      const g = a.ang + (i - (n - 1) / 2) * spread * c.fan;
      shoot(g, D.spd, c, a, { boom: (D.r || 70) * ST.aoeM * c.aoe, fire: 1, life: 1.1 });
    }
  } else if (a.k === 'venom') {
    G.pools.push({ x: a.tx, y: a.ty, r: R, t: 0, dur: durOf(c), tick: 0, c, a });
    sfx('cast');
  } else if (D.curse) {
    G.meteors.push({ x: a.tx, y: a.ty, r: R, t: 0, dur: 1.5, curse: D.curse, lv: c.lv, q: c.q });
    fx({ k: 'ring', x: a.tx, y: a.ty, r: R, dur: 0.4, col: '#c38bff' });
    sfx('cast');
  } else if (D.mark) {
    const m = G.mobs
      .filter(o => o.hp > 0 && Math.hypot(o.x - a.tx, o.y - a.ty) < 120 + o.r)
      .sort((x, y) => Math.hypot(x.x - a.tx, x.y - a.ty) - Math.hypot(y.x - a.tx, y.y - a.ty))[0];
    if (m) markMob(m, D.mark, c.q), fx({ k: 'ring', x: m.x, y: m.y, r: 40, dur: 0.3, col: '#ff6b6b' }), sfx('cast');
  } else if (a.k === 'meteor') {
    G.meteors.push({ x: a.tx, y: a.ty, r: R, t: 0, dur: D.delay, c, a });
  } else if (a.k === 'wolf') {
    for (const w of G.allies.filter(w => w.src === 'gem')) allyDie(w);
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
    /* 分身（0.2.25）：每次從你裝著的攻擊技能隨機放一招，傷害 ×0.6 */
    const p = open(a.tx, a.ty, 14) ? { x: a.tx, y: a.ty } : { x: P.x, y: P.y };
    spawnMirage(null, p.x, p.y, 4, 0.8, 0.6);
    G.mirages[G.mirages.length - 1].q = c.q;
    fxs('blinkin', p.x, p.y, 40);
  } else if (a.k === 'axethrow' || a.k === 'apshot' || a.k === 'chaosbolt') {
    const n = c.proj,
      o = {
        /* 擲斧：飛的是手上那把斧頭的圖（轉著飛） */
        axethrow: { spin: S.eq.weapon ? baseOf(S.eq.weapon).ic : 'sk_axespin', life: 0.8 },
        /* 穿甲彈的品質：彈夾最後一發爆炸（ammoUse 已經扣過，剩 0 就是最後一發） */
        apshot: {
          sh: 'tracer',
          life: 0.6,
          onHit: c.q && ammoLeft(a.k) === 0 ? (s, m) => boomAt(m.x, m.y, 80 * ST.aoeM, c, c.q) : null
        },
        /* 混沌箭的品質：10 層凋零的怪把層數傳出去 */
        chaosbolt: {
          sh: 'void',
          shs: 0.22,
          wave: 'chaos',
          life: 0.8,
          hitfx: 'dark',
          hfr: 28,
          onHit: (s, m) => {
            if (!c.q || (m.ail.wither || []).filter(t => t > G.t).length < 10) return;
            for (const o of G.mobs)
              if (o !== m && o.hp > 0 && dist(o, m) < 120)
                o.ail.wither = [...(o.ail.wither || []), ...Array(Math.round(5 * c.q)).fill(G.t + 4)].slice(-18);
          }
        }
      }[a.k];
    if (a.k === 'axethrow') fxs('sslash', P.x, P.y - 20, 50, { rot: a.ang });
    for (let i = 0; i < n; i++)
      shoot(a.ang + (i - (n - 1) / 2) * 0.16 * c.fan, D.spd, c, a, {
        ...o,
        back: a.k === 'axethrow' && qRoll(20 * c.q)
      });
  } else if (a.k === 'shieldcrush') {
    /* 盾牌粉碎：前方扇形；瀕臨沉重暈眩的粉碎重擊（直接沉重暈眩），並震傷粉碎重擊那隻周圍的怪 */
    fxs('blunt', P.x + cos * R * 0.5, P.y + sin * R * 0.5 - 10, R * 0.7);
    shake(0.1);
    sfx('slam');
    for (const m of G.mobs) {
      const dd = dist(P, m);
      if (m.hp <= 0 || !(dd < R + m.r && angDiff(angTo(P, m), a.ang) < D.arc / 2 + m.r / Math.max(dd, 1))) continue;
      const crushed = crush(m);
      hitMob(m, c, angTo(P, m), 220 * c.kb, { a });
      if (crushed) {
        /* 盾牌粉碎的品質：粉碎重擊回格擋值 */
        if (c.q && P.bvRe == null) P.bv = Math.min(ST.bv, (P.bv || 0) + ST.bv * 0.2 * c.q);
        for (const o of G.mobs)
          if (o.hp > 0 && o !== m && dist(o, m) < 120 + o.r)
            hitMob(o, c, angTo(m, o), 260, { a, quiet: 1, mult: c.mult * 0.5, from: m });
      }
    }
  } else if (a.k === 'shieldthrow') {
    /* 盾牌投擲：彈 bounce 次再飛回來（game.js 的投射物），每次出手 c.proj 面 */
    for (let i = 0; i < c.proj; i++)
      shoot(a.ang + (i - (c.proj - 1) / 2) * 0.16 * c.fan, D.spd, c, a, {
        spin: baseOf(S.eq.off).ic,
        spz: 40,
        life: 0.7,
        bounce: D.bounce + Math.floor(c.q * 2),
        pierce: 0
      });
  } else if (a.k === 'rend') {
    /* 撕裂：先記下流血，擊中後消耗它，一次結算剩下的 ×1.5，並傳給附近 */
    fxs('claw', P.x, P.y - 20, R, { rot: a.ang });
    for (const m of G.mobs) {
      if (m.hp <= 0) continue;
      const dd = dist(P, m);
      if (!(dd < R + m.r && angDiff(angTo(P, m), a.ang) < D.arc / 2 + m.r / Math.max(dd, 1))) continue;
      const b = hasState(m, 'bleed') && { ...m.ail.bleed };
      hitMob(m, c, angTo(P, m), 150 * c.kb, { a });
      /* 撕裂的品質：有機率不消耗流血 */
      if (!b || m.hp <= 0 || !(qRoll(20 * c.q) || takeState(m, 'bleed'))) continue;
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
    P.rage = Math.min(rageCap(), (P.rage || 0) + 15);
    P.rageT = G.t;
    fxs('rage', P.x, P.y - 30, 40);
    fx({ k: 'ring', x: P.x, y: P.y, r: R, dur: 0.35, col: '#ff6b3d' });
    for (const m of G.mobs) if (m.hp > 0 && dist(P, m) < R + m.r) (m.ail.intim = G.t + 4), (m.ail.intimQ = c.q);
  } else if (a.k === 'smash') {
    /* 重擊：打前方最近的一隻；瀕臨沉重暈眩就粉碎重擊（直接沉重暈眩）並震傷周圍 */
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
      P.smashQ = c.q;
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
      if (c.q) pullTo(P.x, P.y, 180 * c.q);
    } else {
      fxs('smoke', P.x, P.y, R * 0.8), fxs('claw', P.x, P.y - 20, R * 0.8, { rot: a.ang });
      addGround({ k: 'smoke', x: P.x, y: P.y, r: R, dur: 2 });
    }
    /* 盲擊撲的品質：打到已經致盲的怪，冷卻 −1 秒（要在這一下上致盲之前看） */
    const blinded = a.k === 'blindpounce' && G.mobs.some(m => m.hp > 0 && m.ail.blind > G.t && dist(P, m) < R + m.r);
    around(P.x, P.y, R, 180);
    if (blinded && c.i >= 0) P.cds['s' + c.i] = Math.max(0, (P.cds['s' + c.i] || 0) - c.q);
  } else if (a.k === 'fissure') {
    /* 往前 5 處裂地（碰到牆停），每隻怪只打一次；完全破甲的消耗掉、這一下 ×2 */
    const hit = new Set();
    let last = null;
    for (let k = 0; k < 5; k++) {
      const x = P.x + cos * (60 + k * 65),
        y = P.y + sin * (60 + k * 65),
        r = R * ST.aoeM * c.aoe;
      if (isWall(x, y)) break;
      last = { x, y, r };
      fxs('dirt', x, y, r);
      for (const m of G.mobs)
        if (m.hp > 0 && !hit.has(m) && Math.hypot(m.x - x, m.y - y) < r + m.r) {
          hit.add(m);
          hitMob(m, c, a.ang, 100 * c.kb, { a, from: { x, y }, mult: takeState(m, 'broken') ? c.mult * 2 : 0 });
        }
    }
    if (last && c.q) addGround({ k: 'jagged', ...last, r: last.r * 1.5, dur: 2 * c.q, c });
  } else if (a.k === 'thunder') {
    /* 每顆暴擊球多劈一道；連擊 5 以上全部花掉換範圍 ×1.5 */
    const spent = useChg('p'),
      n = 1 + spent,
      r = R * (comboN() >= 5 ? (useCombo(), 1.5) : 1);
    if (spent && qRoll(20 * c.q)) gainChg('p');
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
      shoot(a.ang + (i - (n - 1) / 2) * 0.12 * c.fan, D.spd, c, a, {
        sh: 'arrow',
        shs: 1.4,
        life: 0.8,
        /* 擲矛的品質：打中受招架的怪不消耗穿透（回傳 true）、給狂怒球 */
        onHit: (s, m) => {
          if (!c.q || !hasState(m, 'parried')) return false;
          if (qRoll(20 * c.q)) gainChg('f');
          return qRoll(100 * c.q);
        },
        ...(i >= c.proj ? { boom: 80 * ST.aoeM * c.aoe } : {})
      });
  } else if (a.k === 'gasarrow') {
    for (let i = 0; i < c.proj; i++)
      shoot(a.ang + (i - (c.proj - 1) / 2) * 0.2 * c.fan, D.spd, c, a, {
        sh: 'arrow',
        life: 0.6,
        boom: 1,
        gas: R * ST.aoeM * c.aoe
      });
  } else if (a.k === 'grenade') {
    /* 多重投射：多的手雷以出手點為圓心往兩側散開 */
    const dx = a.tx - P.x,
      dy = a.ty - P.y;
    for (let i = 0; i < c.proj; i++) {
      const g = (i - (c.proj - 1) / 2) * 0.3 * c.fan,
        r = R * ST.aoeM * c.aoe;
      throwGrenade(c, P.x + dx * Math.cos(g) - dy * Math.sin(g), P.y + dx * Math.sin(g) + dy * Math.cos(g), {
        r,
        el: 'fire',
        /* 爆裂手雷的品質：爆炸分出小手雷（小手雷不會再分） */
        onBoom: (x, y) =>
          qRoll(20 * c.q) &&
          throwGrenade(c, x + rnd(-90, 90), y + rnd(-90, 90), {
            from: { x, y },
            fuse: 0.6,
            mul: 0.3,
            r: r * 0.6,
            el: 'fire'
          })
      });
    }
  } else if (a.k === 'flyswords') {
    if (swordN() >= SWORD_MAX) launchSwords(a.tx, a.ty), sfx('throw');
    else gainSwords(3 + c.proj - 1, c), fx({ k: 'ring', x: P.x, y: P.y, r: 45, dur: 0.25, col: '#cfd8e3' });
  } else if (a.k === 'shadowstrike' || a.k === 'wolfpounce') {
    /* 撲到目標身邊：影襲必定暴擊（翻滾後 2 秒內 ×2），狼撲上獵人印記 */
    const t = a.tm;
    if (!t || t.hp <= 0 || dist(P, t) > t.r + 60) return;
    const g = angTo(P, t);
    fxs(a.k === 'shadowstrike' ? 'flurry' : 'claw', P.x, P.y - 20, 70, { rot: g });
    if (a.k === 'shadowstrike') {
      hitMob(t, c, g, 120 * c.kb, { a, crit: 1, mult: P.rolledT > G.t ? c.mult * 2 : 0 });
      if (t.hp <= 0 && c.i >= 0 && qRoll(20 * c.q)) P.cds['s' + c.i] = 0;
    } else hitMob(t, c, g, 160 * c.kb, { a }), t.hp > 0 && markMob(t, 'poacher');
  } else if (a.k === 'clawchain') {
    /* 4 段爪擊，每段打中回 1% 生命 */
    const ang = a.ang + [-0.25, 0.25, -0.12, 0.12][idx];
    fxs('claw', P.x, P.y - 20, R, { rot: ang });
    if (hitArc(ang, D.arc, R, 60 * c.kb, { blind: idx === 3 && qRoll(20 * c.q) }))
      P.hp = Math.min(ST.hp, P.hp + ST.hp * 0.01);
  } else if (a.k === 'chainsweep') {
    const r = R * [1, 1.3, 1.7][a.stage || 0];
    fxs('whip', P.x, P.y - 20, r, { rot: a.ang });
    hitArc(a.ang, D.arc, r, 150 * c.kb, { glory: a.stage === 2 ? 1 + c.q : 1 });
  } else if (a.k === 'banner') {
    if (plantBanner({ dmg: 30 })) (G.banner.q = c.q), fxs('pillar', P.x, P.y, 70), sfx('cast');
  } else if (a.k === 'corpseboom') {
    /* 屍體最大生命 10%（每級 +3%）的火焰範圍傷害，只吃抗性；也是引爆技能 */
    const cp = takeCorpse(a.tx, a.ty, 250);
    if (!cp) return;
    if (qRoll(20 * c.q)) G.corpses.push(cp);
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
    if (dolls.length >= 4) allyDie(dolls[0]);
    callWolf('doll', c, cp, G.t + 15);
    const nw = G.allies[G.allies.length - 1];
    nw.hp = nw.mhp = cp.mhp * giantM(nw);
    fxs('rise', cp.x, cp.y, 40);
  } else if (a.k === 'bearmaul') {
    fxs('claw', P.x, P.y - 20, R, { rot: a.ang });
    fxs('slam', P.x + cos * R * 0.5, P.y + sin * R * 0.5, R * 0.5);
    if (hitArc(a.ang, D.arc, R, 220 * c.kb))
      (P.rage = Math.min(rageCap(), (P.rage || 0) + 2)), (P.rageT = G.t), (P.bearQ = c.q);
  }
}
/* 閃電箭打中已經感電的怪：連鎖閃電跳 2 隻（260 內最近、看得到、不重複），物理全部轉閃電；不會再觸發自己 */
function boltChain(m, c, a) {
  const hit = new Set([m]),
    c2 = { ...c, cvL: 100, boltChain: 0 };
  let from = m;
  for (let k = 0; k < 2; k++) {
    const n = G.mobs
      .filter(o => o.hp > 0 && !o.arrow && !hit.has(o) && dist(o, from) < 260 && los(from.x, from.y, o.x, o.y))
      .sort((x, y) => dist(x, from) - dist(y, from))[0];
    if (!n) return;
    fx({ k: 'zap', x: from.x, y: from.y - from.sz * 0.4, x2: n.x, y2: n.y - n.sz * 0.4, dur: 0.18 });
    hit.add(n);
    hitMob(n, c2, angTo(from, n), 60 * c.kb, { a, from });
    from = n;
  }
}
/* 折射箭矢：放在 G.mobs 裡，所有打怪的技能自動打得到；怪不會理它，不算擊殺（hp 由 updMobs 補滿） */
const ARROW_HITS = 3;
const ARROW_D = { hp: 1, dmg: 0, r: 16, sz: 34, xp: 0 };
function spawnArrow(x, y, c) {
  const m = spawnMob(ARROW_D, x, y, -1, false);
  Object.assign(m, { arrow: 1, summoned: 1, aggro: 1, hp: 1e12, mhp: 1e12, c, until: G.t + durOf(c), fired: 0 });
  fxs('landing', x, y, 30);
}
/* 箭矢被打中：只有這一下的異常算數（易燃累積、地面冰緩都不算）；中了就清掉，一下只放一次衝擊波（中的異常裡傷害最高的元素） */
function arrowHit(m, r, c) {
  const a = m.ail;
  a.ign = a.chill = a.shock = null;
  a.flam = 0;
  applyAil(m, r, c);
  fxs('hit', m.x, m.y - 20, 14);
  const el = [
    ['fire', 'ign'],
    ['cold', 'chill'],
    ['light', 'shock']
  ]
    .filter(([, k]) => a[k])
    .sort((x, y) => r.pre[y[0]] - r.pre[x[0]])[0];
  a.ign = a.chill = a.shock = null;
  a.flam = 0;
  if (el && m.fired++ < ARROW_HITS) arrowWave(m, el[0]);
  if (m.fired >= ARROW_HITS) m.hp = 0;
}
/* 衝擊波：用箭矢這顆寶石的數值，物理全部轉成那個元素；先降門檻，這一下就吃得到 */
function arrowWave(u, el) {
  const c = u.c,
    r = c.D.r * ST.aoeM * c.aoe * (1 + (c.g.q || 0) / 100),
    w = { ...c, cvL: el === 'light' ? 100 : 0, cvC: el === 'cold' ? 100 : 0, cvF: el === 'fire' ? 100 : 0 };
  fxs({ fire: 'boom', cold: 'frost', light: 'thunder' }[el], u.x, u.y, r);
  sfx('slam');
  for (const m of G.mobs)
    if (m.hp > 0 && !m.arrow && Math.hypot(m.x - u.x, m.y - u.y) < r + m.r) {
      (m.ail.thrLow = m.ail.thrLow || {})[el] = G.t + 8;
      hitMob(m, w, angTo(u, m), 120 * c.kb, { from: u });
    }
}
/* 從飛行中的投射物分出一支（品質：穿透）；分出來的不會再分 */
function shotFork(s, ang) {
  const v = Math.hypot(s.vx, s.vy) || 800;
  G.shots.push({
    ...s,
    vx: Math.cos(ang) * v,
    vy: Math.sin(ang) * v,
    ang,
    life: 0.45,
    hit: new Set(s.hit),
    onHit: null,
    onEnd: null,
    noFork: 1
  });
}
function shoot(ang, spd, c, a, o) {
  if (windFull()) spd *= 1.3; /* 疾風化身：投射物速度 +30% */
  G.shots.push({
    x: P.x + Math.cos(ang) * 20,
    y: P.y - 18 + Math.sin(ang) * 20,
    vx: Math.cos(ang) * spd,
    vy: Math.sin(ang) * spd,
    ang,
    r: 10,
    pierce: c.pierce,
    chain: c.chain || 0,
    /* 射出的位置（投射物飛行距離：遠射、近射） */
    sx: P.x,
    sy: P.y,
    c,
    a,
    hit: new Set(),
    life: 0.9,
    ...o,
    /* 迴旋：會爆炸的投射物在終點爆炸，不飛回來 */
    back: (o && o.back) || (c.ret && !(o && o.boom))
  });
}
/* 火球爆炸 */
function boom(s) {
  if (s.done) return;
  s.done = 1;
  if (s.gas) {
    /* 毒氣箭的品質：毒氣雲飄向最近的怪（groundTick） */
    addGround({ k: 'gas', x: s.x, y: s.y + 18, r: s.gas, dur: 5, c: s.c, dps: 0.6, drift: 60 * (s.c.q || 0) });
    return fxs('gas', s.x, s.y + 18, s.gas);
  }
  fx({ k: 'ring', x: s.x, y: s.y + 18, r: s.boom, dur: 0.3, col: '#ff8a4c' });
  sfx('slam');
  for (const m of G.mobs)
    if (m.hp > 0 && Math.hypot(m.x - s.x, m.y - 18 - s.y) < s.boom + m.r)
      hitMob(m, s.c, angTo(s, m), 120 * s.c.kb, { a: s.a, from: { x: s.x, y: s.y + 18 } });
  if (s.c.k === 'fireball' && s.c.q)
    addGround({ k: 'fire', x: s.x, y: s.y + 18, r: s.boom, dur: 1.5 * s.c.q, c: s.c, dps: 0.3 });
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
const SPLASH_R = 1.5 * METER;
/* 打中一隻怪：o.a 出手、o.quiet 不停頓不震（狼、毒、反擊）、o.stun 暈眩、o.mult 改這一下的倍率（換成「更多」） */
function hitMob(m, c, ang, kb, o = {}) {
  /* 不能穿牆：從出手的地方（o.from，預設是玩家）看不到就打不到 */
  const f = o.from || P;
  if (!los(f.x, f.y, m.x, m.y)) return;
  const a = o.a || {};
  let mult = (o.mult ? o.mult / (c.mult || 1) : 1) * (a.mul || 1),
    crit = !!(a.crit || o.crit);
  /* 0.2.22：攻擊可能被閃避（熵值，combat.js 的 hitRoll） */
  if (!m.arrow && !hitRoll(m, c, { minion: o.minion, unit: a.unit }))
    return num(m.x, m.y - m.sz, 0, 'miss', '未命中'), aggroPack(m);
  /* 投射物飛行距離（0.2.25）：飛出去的算飛了多遠，瞬間的算到目標的距離 */
  const fly = f.sx != null ? Math.hypot(f.x - f.sx, f.y - f.sy) : Math.hypot(m.x - f.x, m.y - f.y);
  const r = hitCalc(c, m, {
    mult,
    crit,
    minion: o.minion,
    unit: a.unit,
    fly,
    trig: a.trig,
    keep: m.arrow,
    final: a.final
  });
  if (m.arrow) return arrowHit(m, r, c);
  const shocked = c.boltChain && hasState(m, 'shock');
  /* 幻影獵手（昇華）：你自己的擊中累積熵值，滿了生成幻影（幻影、觸發的不算） */
  if (ST.mirageH && !a.trig && !o.minion && !a.unit && !o.again) mirageHunt();
  applyAil(m, r, c, a);
  if (c.k === 'axethrow' && hasState(m, 'bleed')) fxs('bleed', m.x, m.y - m.sz * 0.5, 30);
  onHitBase(m, r, c);
  /* 近期事件（combat.js 的 recent）：你自己的擊中與暴擊，不算召喚物與場上單位 */
  if (!o.minion && !a.unit) evMark('hit'), r.crit && evMark('crit');
  /* mech.js：火焰點燃可燃地面、引爆技能、連擊、榮耀、暴擊觸發 */
  if (r.pre.fire > 0) igniteAt(m.x, m.y, c);
  if (c.D.detonator) detonate(m.x, m.y, 60, c);
  if ((c.D.tags || []).includes('melee') && !o.quiet) comboHit(a);
  hitGlory(m, r.crit, o.glory || 1);
  if (r.crit && !a.trig) metaEvent('crit', m);
  if (ST.wt === 'qstaff' && (c.D.tags || []).includes('melee') && !o.quiet) P.mp = Math.min(ST.mp, P.mp + 1);
  /* 屠戮打擊（0.2.42）：擊中滿血的敵人，先移除 min(x%, 上限) 的生命；撲殺：擊中後生命低於門檻直接殺死 */
  const cut = fullCut(m);
  if (cut) (m.hp -= cut), num(m.x, m.y - m.sz * 1.3, 0, 'ev', '屠戮');
  const hp0 = m.hp;
  m.hp -= r.d;
  if (culled(m)) (m.hp = 0), num(m.x, m.y - m.sz * 1.3, 0, 'crit', '撲殺');
  /* 事件（0.2.43，擊中造成擊殺才算，持續傷害不算）：溢出 ovkSplash＝%（溢出傷害打給 2 公尺內的敵人）、最後一擊 kbEs＝%（打死感電的敵人回復最大能量護盾） */
  if (hp0 > 0 && m.hp <= 0) hitKill(m, hp0, r);
  if (a) a.any = 1;
  m.flash = 0.09;
  m.sq = 1;
  if (o.stun && !m.boss) m.stun = o.stun;
  if (o.blind) m.ail.blind = G.t + 4;
  if (!m.boss && kb && !(m.ail.pinT > G.t)) {
    const res = m.elite ? 0.5 : m.D.ai === 'slam' ? 0.4 : 1;
    m.vx += Math.cos(ang) * kb * res * (r.crit ? 1.5 : 1);
    m.vy += Math.sin(ang) * kb * res * (r.crit ? 1.5 : 1);
    /* 預期擊退（第 13～16 批）：技能欄位 c.kbEasy＝每公尺預期擊退距離的易攻目標幅度 %（來源例：輔助 Punch Through） */
    if (c.kbEasy && kb > 0) m.ail.easy = { v: c.kbEasy * kbExp(kb, r.crit), t: G.t + DEBUFF.easyT };
    /* 重擊輔助的品質：擊退方向貼著牆就沉重暈眩 */
    if (
      kb > 0 &&
      c.wallCh &&
      isWall(m.x + Math.cos(ang) * (m.r + 40), m.y + Math.sin(ang) * (m.r + 40)) &&
      qRoll(c.wallCh)
    )
      poisePin(m, 'hs');
  }
  aggroPack(m);
  num(m.x, m.y - m.sz, r.d, r.crit ? 'crit' : r.el);
  fxs(r.crit ? 'crit' : 'hit', m.x, m.y - m.sz * 0.3, m.sz * (r.crit ? 0.8 : 0.5));
  if (!o.quiet) {
    sparks(m.x, m.y - m.sz * 0.4, ang, r.crit ? 10 : 5, r.crit ? '#ffd166' : ELC[r.el]);
    sfx(r.crit ? 'crit' : 'hit');
    if (ST.loh) P.hp = Math.min(ST.hp, P.hp + ST.loh);
  }
  /* 偷取：1 秒內回完；每種資源同時只有一筆（取回得最快的），見 combat.js leechAdd */
  const lr = r.d * c.leech * (1 + MM('pleech') / 100);
  /* 生命偷取的品質：生命全滿時轉成魔力 */
  if (c.leechMp && P.hp >= ST.hp) addMp(lr * c.leechMp);
  /* 瓦爾契約（基石）：生命偷取立即回復 */
  if (c.leech && ST.vaal) P.hp = Math.min(ST.hp, P.hp + lr);
  else if (c.leech) leechAdd('hp', lr);
  const lm = 1 + MM('pleech') / 100;
  if (ST.mpLeech) leechAdd('mp', (r.d * ST.mpLeech * lm) / 100);
  if (ST.esLeech) leechAdd('es', (r.d * ST.esLeech * lm) / 100);
  if (ST.rageLeech) leechAdd('rage', (r.d * ST.rageLeech * lm) / 100);
  /* 友方偷取相同數值（開關）：友方擊中用你的生命偷取總值（不再吃加成）回復自己 */
  if (ST.allyLeech && o.from && o.from.mhp && G.allies.includes(o.from))
    leechAdd('hp', r.d * (c.leech != null ? c.leech : ST.leech / 100), o.from);
  /* 擴散傷害（第 13～16 批）：打擊技能對被打中的敵人 1.5 公尺內的其他敵人多一次擊中（走 hitMob，多的那一下不再擴散） */
  if ((ST.splash || c.splash) && !o.splash && !o.minion && (c.D.tags || []).includes('strike'))
    for (const x of G.mobs)
      if (x !== m && x.hp > 0 && !x.arrow && dist(x, m) < SPLASH_R + x.r)
        hitMob(x, c, angTo(m, x), 0, { a, quiet: 1, from: m, splash: 1 });
  /* 劍的招牌點（0.2.23）：近戰擊中有機率再打一次（再打的那一下不會再觸發） */
  if (m.hp <= 0) {
    if (r.crit && !o.minion && !a.unit) reapBoom(m);
    if (c.arcKill && hasBuff('arcane')) P.buf.arcane += c.arcKill;
    /* 召喚戰狼的品質：咬死怪多一隻臨時狼（同時最多 4 隻） */
    if (o.minion && c.k === 'wolf' && qRoll(20 * (c.q || 0)) && G.allies.filter(w => w.src === 'gemt').length < 4)
      callWolf('gemt', c, m, G.t + 8);
    killMob(m);
  } else if (ST.dbl && !o.again && (c.D.tags || []).includes('melee') && roll(ST.dbl))
    hitMob(m, c, ang, 0, { ...o, again: 1, quiet: 1 });
  if (shocked) boltChain(m, c, a);
}

/* 荊棘反擊（hurtPlayer 呼叫）：近戰怪（近戰、撲咬）擊中你時，同一隻怪 0.3 秒最多一次；不走 hitCalc（不算攻擊、不算法術），吃護甲、不暴擊 */
function thornHit(m) {
  if (!m || !m.D || (m.D.ai !== 'melee' && m.D.ai !== 'lunge') || !(ST.thornAdd[1] > 0) || m.thornT > G.t) return;
  m.thornT = G.t + 0.3;
  const d = thornDmg(m);
  m.hp -= d;
  num(m.x, m.y - m.sz, d, 'dot');
  aggroPack(m);
  if (m.hp <= 0) killMob(m);
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
  /* 能量護盾保護魔力（基石）：傷害不扣能量護盾、直接扣生命 */
  if (ST.esMana) return d;
  P.lastHurt = G.t;
  if (P.es > 0) {
    const ab = Math.min(P.es, d);
    P.es -= ab;
    d -= ab;
  }
  return d;
}

/* ---------- 召喚物（第 13～16 批，企劃書 7.3）：w.t 有值＝暫時召喚物，死了就沒了；沒有＝復甦召喚物，被擊殺後自動復活 ---------- */
/* revive 復活秒數（另一隻復甦召喚物死亡時重算）；⚠️ healWait 幾秒沒受傷開始自癒、heal 每秒回最大生命的比例；giant 極大的更多與體型 */
const MINION = { revive: 7.5, healWait: 4, heal: 0.2, giant: 0.2 };
const giantM = w => (ST.minGiant || (w.c && w.c.giant) ? 1 + MINION.giant : 1);
/* 召喚物受傷（目前沒有怪會打召喚物，要等召喚物 AI） */
function allyHurt(w, d) {
  if (w.dead) return;
  w.hp -= d;
  w.hurtT = G.t;
  if (w.hp <= 0) allyDie(w, true);
}
/* killed＝生命歸零（被擊殺）；沒寫＝時間到或被取消，算死亡但「被擊殺時」不觸發，也不會復活 */
function allyDie(w, killed) {
  evMark('mdie');
  if (killed) evMark('mkill');
  if (w.t || !killed) return void (G.allies = G.allies.filter(o => o !== w));
  w.hp = 0;
  w.dead = G.t + MINION.revive;
  for (const o of G.allies) if (o.dead) o.dead = w.dead;
}
/* ---------- 召喚戰狼：狼跟著你、咬最近的怪 ---------- */
function callWolf(src, c, at = P, t = 0) {
  const p = floorNear(at.x, at.y, 30, 80, 14) || { x: at.x, y: at.y },
    /* hp／mhp：取你的最大生命當底（紙人用屍體的最大生命） */
    w = { src, x: p.x, y: p.y, vx: 0, vy: 0, cd: rnd(0.2, 0.6), c, ph: Math.random() * TAU, t };
  w.r = 14 * giantM(w);
  w.hp = w.mhp = ST.hp * giantM(w);
  G.allies.push(w);
}
/* 同伴這一下的倍率：寶石叫的狼吃群狼、紙人用寶石倍率、魔像與光環狼用左鍵技能打折 */
const ALLY_RATE = 0.8;
const allyMult = (w, c) =>
  w.src === 'gem' || w.src === 'gemt'
    ? c.mult * c.wolfM
    : w.src === 'doll'
      ? c.mult
      : w.src === 'golem'
        ? c.mult * 0.8
        : 0.4;
function updAllies(dt) {
  for (const w of G.allies) {
    if (w.dead > G.t) continue;
    if (w.dead) (w.dead = 0), (w.hp = w.mhp), (w.x = P.x), (w.y = P.y), fxs('rise', P.x, P.y, 40);
    w.cd -= dt;
    w.ph += dt * 10;
    leechTick(dt, w, [['hp', w.mhp]]);
    /* 復甦召喚物：一段時間沒受傷就自癒 */
    if (!w.t && w.hp < w.mhp && G.t - (w.hurtT == null ? -99 : w.hurtT) >= MINION.healWait)
      w.hp = Math.min(w.mhp, w.hp + w.mhp * MINION.heal * dt);
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
      w.cd = ALLY_RATE;
      fx({ k: 'claw', x: w.x, y: w.y, ang: angTo(w, t), r: 34, dur: 0.12 });
      const c = w.c || slotCfg(0) || BASEC(),
        mult = allyMult(w, c) * giantM(w);
      /* 群狼的品質：狼咬中有機率流血 */
      const cc = c.wolfBl ? { ...c, bleedCh: c.wolfBl, spellBleed: 1 } : c;
      hitMob(t, cc, angTo(w, t), 60, { quiet: 1, mult, minion: 1, from: w });
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
          curseMob(m, o.curse, o.lv, o.q);
    } else if (o.t >= o.dur && !o.done) {
      o.done = 1;
      fx({ k: 'ring', x: o.x, y: o.y, r: o.r, dur: 0.4, col: '#ff6b3d' });
      sfx('slam');
      let n = 0;
      for (const m of G.mobs)
        if (m.hp > 0 && Math.hypot(m.x - o.x, m.y - o.y) < o.r + m.r)
          hitMob(m, o.c, Math.atan2(m.y - o.y, m.x - o.x), 260, { a: o.a, from: o }), n++;
      if (n >= 3 && qRoll(20 * (o.c.q || 0))) dropRemnant('fire', o.x, o.y);
    }
  }
  G.meteors = G.meteors.filter(o => !o.done);
}
const ES_DELAY = 4;
function updSkills(dt) {
  /* 能量護盾（0.2.42）：4 秒沒受傷開始充能（天賦 esDelay 縮短延遲），每秒 12.5% */
  if (ST.es && P.es < ST.es && G.t - (P.lastHurt || -9) > ES_DELAY / (1 + ST.esDelay / 100))
    P.es = Math.min(ST.es, P.es + ST.es * 0.125 * (1 + (ST.esRec + MM('pes')) / 100) * dt);
  /* 戰狼精魂光環 */
  const aw = G.allies.some(w => w.src === 'aura');
  if (fightOn() && ST.auraWolf && !aw) callWolf('aura');
  else if (!ST.auraWolf && aw) for (const w of G.allies.filter(w => w.src === 'aura')) allyDie(w);
  /* 召喚魔像（光環欄）：拿權杖才會出來 */
  const gm = G.allies.some(w => w.src === 'golem'),
    gOn = ST.auraGolem;
  if (fightOn() && gOn && !gm) callWolf('golem');
  else if (!gOn && gm) for (const w of G.allies.filter(w => w.src === 'golem')) allyDie(w);
  /* 紙人 15 秒就消失；品質：有機率留下屍體 */
  for (const w of G.allies)
    if (w.src === 'doll' && w.t <= G.t && qRoll(20 * (w.c.q || 0)))
      G.corpses.push({ x: w.x, y: w.y, sz: 20, mhp: w.mhp || 100, t: G.t + 15 });
  for (const w of G.allies.filter(w => w.t && w.t <= G.t)) allyDie(w);
  updAllies(dt);
  updPools(dt);
  updUnits(dt);
  if (fightOn()) mechTick(dt), autoTick();
  if (G.scene === 'hide') hideTick();
}
/* 自動化（0.2.28）：冷卻好了、魔力夠、480 內看得到敵人就放；不佔玩家的出手（P.act），砲塔圖騰、圖騰放在敵人方向 */
const AUTO_R = 480;
function autoTick() {
  if (G.state !== 'play' || (P.ail && P.ail.frozen > G.t) || pStagger() || pHeavy()) return;
  for (let i = 0; i < NSLOT; i++) {
    const g = S.skills[i] && S.skills[i].a,
      sp = metaOf(g);
    if (!sp || SUPPORTS[sp.gem].meta !== 'auto' || (P.cds['s' + i] || 0) > 0) continue;
    const c = slotCfg(i),
      t = G.mobs
        .filter(m => m.hp > 0 && dist(m, P) < AUTO_R && los(P.x, P.y, m.x, m.y))
        .sort((a, b) => dist(a, P) - dist(b, P))[0];
    if (!t || !wtOK(c.D) || skillWhy(c, t)) continue;
    if (c.D.gren && !grenadeReady(c.k, c.D.gren[0], c.D.gren[1])) continue;
    skillPay(c, i);
    formFor(c.D);
    if (c.unit) placeUnit(c, t);
    else castGem(g, t);
    sfx(c.D.tags.includes('spell') ? 'cast' : 'throw');
  }
}
/* 進地圖、回藏身處：重設狀態 */
function skillsEnter() {
  Object.assign(P, { lastHurt: -9, rage: 0, rageT: 0, lifeLost: -9, adapt: {} });
  Object.assign(G, { allies: [], pools: [], meteors: [], units: [], mineT: 0 });
  mechEnter();
  P.es = ST.es;
  P.bv = ST.bv;
  P.bvRe = null;
  P.hf = 0;
}

/* 出手速度、移動速度：buff 與冰緩、冰凍（combat.js） */
function speedMul() {
  return (
    buffSpeed() *
    Math.max(0.3, playerSlow()) *
    ((formOf() && formOf().atk) || 1) *
    (P.rolledT > G.t ? 1 + 0.05 * (ST.aq.swift || 0) : 1)
  );
}
function moveMul() {
  return (
    buffMove() *
    playerSlow() *
    vineSlow() *
    oilSlow() *
    ((formOf() && formOf().move) || 1) *
    (P.rolledT > G.t ? 1 + 0.04 * (ST.aq.swift || 0) : 1)
  );
}
/* 殺怪：擊殺回血 */
function onKill() {
  if (ST.killHeal) P.hp = Math.min(ST.hp, P.hp + ST.killHeal);
}

/* ---------- 陷阱、地雷、砲塔圖騰、圖騰（場上單位） ---------- */
const UNIT_MAX = { trap: 4, mine: 6, totem: 2, turret: 2 };
const UNIT_N = { trap: '陷阱', mine: '地雷', totem: '圖騰', turret: '砲塔圖騰' };
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
    cap = type === 'totem' || type === 'turret' ? ['totem', 'turret'] : [type],
    mine = G.units.filter(u => cap.includes(u.type));
  /* 滿了就收掉最舊的（0.2.42：砲塔圖騰與圖騰合計一個上限） */
  if (mine.length >= (cap.length > 1 ? UNIT_MAX.totem : UNIT_MAX[type]) + (ST.units || 0))
    G.units.splice(G.units.indexOf(mine[0]), 1);
  const D = c.D,
    dur = type === 'trap' || type === 'mine' ? 30 : durOf(c) || 8,
    rate = D.rate || Math.max(0.5, D.t * 1.8);
  const u = { type, x, y, c, t: 0, dur, cd: 0.3, rate };
  G.units.push(u);
  /* 轉圖騰的品質：立下時立刻施放一次 */
  if (type === 'totem' && qRoll(c.totemCast)) {
    const m = mobNear(x, y, 480);
    if (m) unitFire(u, m);
  }
  if (type === 'mine') G.mineT = G.t + 1.2;
  fx({ k: 'ring', x, y, r: 30, dur: 0.25, col: '#cfd8e3' });
}
/* 從場上單位施放：本身就是單位的技能（陷阱爆開、地雷爆開、砲塔圖騰射擊、火焰圖騰）或轉換來的技能 */
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
  /* 砲塔圖騰、圖騰也吃多重投射（c.proj）：扇形散開 */
  const fan = i => ang + (i - (c.proj - 1) / 2) * 0.16 * c.fan;
  if (D.unit === 'turret')
    for (let i = 0; i < c.proj; i++) shoot(fan(i), 820, c, a, { life: 0.7, bolt: 1, sh: 'arrow', shs: 1.2 });
  else if (D.unit === 'totem')
    for (let i = 0; i < c.proj; i++) shoot(fan(i), 520, c, a, { boom: D.r * ST.aoeM, fire: 1, life: 1 });
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
    extra = [],
    boomMines = G.mineT && G.t >= G.mineT;
  const mines = G.units.filter(u => u.type === 'mine').length;
  for (const u of G.units) {
    u.t += dt;
    if (u.type === 'trap') {
      const m = u.t > 0.4 && near(u, 70);
      if (m) {
        unitFire(u, m);
        /* 冰霜陷阱的品質：有機率留在原地 */
        if (u.c.k === 'frosttrap' && qRoll(20 * (u.c.q || 0))) (u.t = 0), keep.push(u);
        continue;
      }
    } else if (u.type === 'mine') {
      if (boomMines) {
        unitFire(u, near(u, 400), u.mini ? 0.5 : 1 + 0.1 * (mines - 1));
        /* 爆裂地雷的品質：彈出小地雷 */
        if (!u.mini && u.c.k === 'blastmine' && qRoll(20 * (u.c.q || 0))) {
          const x = u.x + rnd(-60, 60),
            y = u.y + rnd(-60, 60);
          if (open(x, y, 12)) extra.push({ ...u, x, y, t: 0, mini: 1 });
        }
        continue;
      }
    } else if ((u.cd -= dt) <= 0) {
      const m = near(u, 480);
      if (m) (u.cd = u.rate), unitFire(u, m);
    }
    if (u.t < u.dur) keep.push(u);
    /* 火焰圖騰的品質：時間到時自爆 */ else if (u.c.k === 'firetotem' && u.c.q)
      boomAt(u.x, u.y, 100 * ST.aoeM, u.c, u.c.q, 'fire');
  }
  if (boomMines) G.mineT = extra.length ? G.t + 0.5 : 0;
  G.units = [...keep, ...extra];
}
