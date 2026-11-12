/* dungeonPOE · 掛機 AI（0.3.0，企劃書 2.1 第 9 項）
   AI 只輸出兩樣東西：移動方向 AI.mv（updPlayer 讀）與瞄準點 AI.aim（mouseWorld 回傳）；
   然後呼叫現有的 useSlot、doRoll、drinkFlask、interact（撿）。不複製技能邏輯。
   0.4.0 連續刷：打 → 王倒下 → 2 秒後同一個場地下一輪（game.js 的 roundEnd）；倒下 1.5 秒後原地重來（deadAgain，連死 3 次退回上一個節點）。 */
'use strict';
const AI = {
  on: 0 /* 這一格是 AI 在操作 */,
  mv: [0, 0],
  aim: { x: 0, y: 0 },
  hold: -1 /* 蓄力技能按住的那一格 */
};
/* 排在其他招後面的分類標籤（製造在收割前） */
const AI_LATE = ['cond', 'payoff', 'final'];
const AI_KEEP = 6 * METER; /* 遠程與法系跟目標保持的距離 */
const AI_HP = 0.5; /* 生命低於這個比例喝生命藥劑（企劃書 2.1 第 9 項，暫定） */
/* 出招順序：技能欄 1～4（右鍵、Q、E、R）照欄位順序，cond／payoff／final 的招排在其他招後面，最後才是左鍵那格（普攻）。
   tagsOf(i) 回傳該格技能的標籤，空格回傳 null */
function aiOrder(tagsOf, n = 5) {
  const L = [],
    late = [];
  for (let i = 1; i < n; i++) {
    const t = tagsOf(i);
    if (!t) continue;
    (t.some(x => AI_LATE.includes(x)) ? late : L).push(i);
  }
  return [...L, ...late, ...(tagsOf(0) ? [0] : [])];
}
const aiTags = i => {
  const c = slotCfg(i);
  return c ? c.D.tags : null;
};
/* 這招打得到目標嗎：近戰看範圍，位移看距離，其他看 520 以內 */
function aiReach(c, T) {
  const d = dist(P, T) - T.r;
  if (c.D.dist) return d < c.D.dist + 20;
  if (c.D.tags.includes('melee')) return d < (c.D.r || 100) * (c.aoe || 1) + 10;
  return d < 520;
}
/* 放得出來的招（冷卻、能力值、魔力、觸發輔助、榴彈、需要目標）；先全部查過，免得 useSlot 一直跳提示 */
function aiCan(c, i, at) {
  if (!c || (P.cds['s' + i] || 0) > 0 || metaOf(c.g) || !wtOK(c.D)) return false;
  if (c.D.gren && !pracFree() && !grenadeReady(c.k, c.D.gren[0] + ST.grenUse, c.D.gren[1])) return false;
  if (c.D.toMob && !mobNear(at.x, at.y, 150, c.D.dist)) return false;
  return !skillWhy(c, at);
}
/* 目標：王優先（七情王也算），其他取最近的活怪 */
function aiTarget() {
  let best = null,
    bd = 1e9;
  for (const m of G.mobs) {
    if (m.hp <= 0 || m.arrow || m.dummy) continue;
    const d = dist(P, m) * (m.boss ? 0.3 : 1);
    if (d < bd) (bd = d), (best = m);
  }
  return best;
}
/* 要躲的東西。回傳 { roll, walk }：各是要逃的方向（單位向量）或 null。
   roll＝爆炸／揮擊剩不到 AI_ROLL 秒、而且腳下有（翻滾的無敵 0.26 秒要蓋住那一下，太早滾會在命中前結束）；
   walk＝還有一點時間（紅光圈 0.9 秒、怪與王的前搖 0.6 秒內），翻滾冷卻中也能先走出去。
   王的衝撞（charge）往側邊閃（沿著衝撞的線往後跑躲不掉），其他往反方向 */
const AI_ROLL = 0.22;
/* 走著躲：一次固定方向走 0.3 秒，之後 0.9 秒不再躲投射物（專心出招） */
const AI_DODGE_HOLD = 0.3,
  AI_DODGE_CD = 0.9;
function aiThreat() {
  const R = [0, 0],
    W = [0, 0];
  let r = 0,
    w = 0;
  /* x、y 是威脅的位置（往反方向逃）；a 有值＝衝撞方向，往垂直的側邊逃 */
  const add = (left, lim, x, y, a, noRoll) => {
    if (left >= lim) return;
    let vx, vy;
    if (a != null) {
      const px = Math.cos(a + Math.PI / 2),
        py = Math.sin(a + Math.PI / 2),
        sg = px * (P.x - x) + py * (P.y - y) >= 0 ? 1 : -1;
      (vx = px * sg), (vy = py * sg);
    } else {
      const d = Math.hypot(P.x - x, P.y - y) || 1;
      (vx = (P.x - x) / d), (vy = (P.y - y) / d);
    }
    (W[0] += vx), (W[1] += vy), (w = 1);
    if (left < AI_ROLL && !noRoll) (R[0] += vx), (R[1] += vy), (r = 1);
  };
  for (const t of G.tele)
    if (!t.done && t.dmg > 0 && dist(P, t) < t.r + P.r + 10)
      add(Math.max(0, t.dur - t.t), 0.9, t.x, t.y, null, !(t.src && t.src.boss));
  for (const m of G.mobs) {
    /* 只躲王：小怪的前搖打得不重，每隻都躲的話場上怪一多就一直在跑、不出招 */
    const dash = m.st === 'dash' && m.boss;
    if (m.hp <= 0 || !m.boss || !(m.st === 'wind' || dash)) continue;
    /* 沒有預警圈的王招只有揮爪（swipe，扇形 150）與衝撞（charge／dash，420）；其他招有紅光圈（上面）或打不到近身的人 */
    const charge = m.pat === 'charge' || dash;
    if (!charge && m.pat !== 'swipe') continue;
    if (dist(m, P) > (charge ? 420 : 150 + 40) + P.r || angDiff(angTo(m, P), m.ang || 0) > (charge ? 0.7 : 1.4))
      continue;
    add(dash ? 0 : m.t, 0.45, m.x, m.y, charge ? m.ang || 0 : null);
  }
  const u = V => {
    const l = Math.hypot(V[0], V[1]);
    return l ? [V[0] / l, V[1] / l] : null;
  };
  return { roll: r ? u(R) : null, walk: w ? u(W) : null };
}
/* 朝自己飛來、0.5 秒內會擦過自己的怪物投射物：回傳側走的方向（垂直於飛行方向、離彈道遠的一側）或 null */
function aiShots() {
  let ax = 0,
    ay = 0,
    n = 0;
  for (const s of G.shots) {
    if (!s.foe || s.life <= 0) continue;
    const rx = s.x - P.x,
      ry = s.y - (P.y - 20) /* 碰撞用的是 P.y − 20（updShots） */,
      vv = s.vx * s.vx + s.vy * s.vy;
    if (!vv) continue;
    const t = Math.max(0, Math.min(0.5, -(rx * s.vx + ry * s.vy) / vv)),
      cx = rx + s.vx * t,
      cy = ry + s.vy * t;
    if (Math.hypot(cx, cy) > P.r + (s.r || 9) + 12) continue;
    /* 垂直於飛行方向，朝離彈道遠的一側（正好在線上就隨便選一側） */
    const l = Math.sqrt(vv),
      px = -s.vy / l,
      py = s.vx / l,
      sg = cx * px + cy * py > 0 ? -1 : 1;
    (ax += px * sg), (ay += py * sg), n++;
  }
  const l = Math.hypot(ax, ay);
  return n && l ? [ax / l, ay / l] : null;
}
/* 場上不藏的掉落裡最近的（沒放棄的） */
function aiLoot(A) {
  let best = null,
    bd = 1e9;
  for (const d of G.drops) {
    if (d.full || A.skip.has(d) || (d.it && dropFlt(d).act === 'hide')) continue;
    const e = dist(P, d);
    if (e < bd) (bd = e), (best = d);
  }
  return best;
}
/* 走向 (x, y)：停在 stop 以內 */
function aiGo(x, y, stop = 0) {
  const d = Math.hypot(x - P.x, y - P.y);
  if (d <= stop) return;
  AI.mv = [(x - P.x) / d, (y - P.y) / d];
}
function aiTick(dt) {
  AI.on = 0;
  AI.mv = [0, 0];
  AI.hold = -1;
  if (!S.auto || G.scene !== 'map' || PRO.on || TALK.on) return;
  AI.on = 1;
  const A =
    G.ai ||
    (G.ai = { deadT: 0, skip: new Map(), tryT: new Map(), flaskT: 0, rollT: 0, idle: 0, dodgeHold: 0, dodgeCd: 0 });
  if (G.state === 'dead') {
    A.deadT += dt;
    if (A.deadT > 1.5) deadAgain();
    return;
  }
  if (G.state !== 'play') return;
  A.flaskT -= dt;
  const T = aiTarget();
  AI.aim = T ? { x: T.x, y: T.y } : { x: P.x + Math.cos(P.face) * 200, y: P.y + Math.sin(P.face) * 200 };
  /* 藥劑：生命低於一半喝生命藥劑（正在回復中不重複喝） */
  if (P.hp < ST.hp * AI_HP && P.heal <= 0 && A.flaskT <= 0 && !(P.cds.flask > 0)) {
    A.flaskT = 1;
    drinkFlask();
  }
  /* 翻滾：爆炸、揮擊剩不到 0.22 秒而且腳下有，往反方向滾（翻滾在冷卻就靠下面的走位先走出去） */
  A.dodgeT = A.dodgeT || 0;
  const th = aiThreat();
  if (th.roll && !P.roll && !(P.cds.roll > 0)) {
    (P.mdx = th.roll[0]), (P.mdy = th.roll[1]);
    doRoll();
  }
  if (P.roll) return;
  /* 怪物方的地面（地圖詞留下的煙霧、凋零、油、感電、點燃……）：踩在上面就往外走（企劃書 2.1 第 11 項） */
  const hz = G.ground.find(g => g.side === 'm' && !g.done && onGround(g));
  /* 蓄力技能：按住到蓄滿、目標死了或打不到就放開；踩到怪物方的地面也放開 */
  const act = P.act;
  if (act && act.charge && !hz) {
    const E = act.c.D.charge;
    if (T && act.ch < E.max * E.step - 1e-6 && aiReach(act.c, T)) AI.hold = act.slot;
  }
  const order = aiOrder(aiTags);
  /* 走位：近戰貼到範圍內，遠程與法系保持 6 公尺 */
  const first = order.length ? slotCfg(order[0]) : null,
    ranged = first ? !first.D.tags.includes('melee') : false;
  if (T) {
    const d = dist(P, T),
      reach = first ? (first.D.dist ? first.D.dist * 0.6 : (first.D.r || 100) * (first.aoe || 1) * 0.7) : 80;
    if (ranged) {
      if (d < AI_KEEP * 0.85) {
        /* 退：離目標遠一點，靠牆時往場地中央偏 */
        const m = TS * 3,
          cx = (G.W / 2 - P.x) / G.W,
          cy = (G.H / 2 - P.y) / G.H,
          near = Math.max(0, 1 - Math.min(P.x, G.W - P.x, P.y, G.H - P.y) / m);
        const bx = (P.x - T.x) / d + cx * near * 3,
          by = (P.y - T.y) / d + cy * near * 3,
          l = Math.hypot(bx, by) || 1;
        AI.mv = [bx / l, by / l];
      } else if (d > AI_KEEP * 1.15) aiGo(T.x, T.y);
    } else aiGo(T.x, T.y, T.r + P.r + reach);
  }
  /* 撿東西：場上沒有近身的怪，或王已經倒下 */
  const loot = !T || dist(P, T) > 260 ? aiLoot(A) : null;
  if (loot) {
    aiGo(loot.x, loot.y, 8);
    const d = dist(P, loot);
    if (d < 200) {
      const t = (A.tryT.get(loot) || 0) + dt;
      A.tryT.set(loot, t);
      if (t > 3) A.skip.set(loot, 1);
    }
    if (loot.it && d < 100) interact();
  }
  /* 躲（走的那種；翻滾在上面）：王的前搖與紅光圈在翻滾冷卻時走出去、投射物側走。
     決定要躲就固定方向走 AI_DODGE_HOLD 秒（不每格重算，否則方向一直換邊會抽搐），躲完 AI_DODGE_CD 秒內不再躲投射物、專心出招；躲的時候不出新招 */
  A.dodgeHold -= dt;
  A.dodgeCd -= dt;
  const w = th.walk && P.cds.roll > 0 ? th.walk : null;
  if (w) (A.dodgeDir = w), (A.dodgeHold = AI_DODGE_HOLD), (A.dodgeCd = AI_DODGE_CD);
  else if (A.dodgeHold <= 0 && A.dodgeCd <= 0) {
    const sh = aiShots();
    if (sh) (A.dodgeDir = sh), (A.dodgeHold = AI_DODGE_HOLD), (A.dodgeCd = AI_DODGE_CD);
  }
  const dodge = A.dodgeHold > 0;
  if (dodge) AI.mv = A.dodgeDir;
  /* 踩在怪物方的地面上：往外走，蓋過追怪與撿東西的方向 */
  if (hz) {
    const d = Math.hypot(P.x - hz.x, P.y - hz.y);
    /* 正好站在圓心（地面就在腳下生成）：往反方向是零向量會卡住不動，改往場地中央走 */
    const cd = Math.hypot(G.W / 2 - P.x, G.H / 2 - P.y) || 1;
    AI.mv = d > 8 ? [(P.x - hz.x) / d, (P.y - hz.y) / d] : [(G.W / 2 - P.x) / cd, (G.H / 2 - P.y) / cd];
  }
  /* 出招：照順序，冷卻好、放得出來、打得到就放；魔力不夠的招等著，喝魔力藥劑。站在怪物方的地面上先走出去再出招（出招中走不動） */
  if (!T || P.act || G.state !== 'play' || hz || dodge) return;
  const at = AI.aim;
  let lackMp = false;
  for (const i of order) {
    const c = slotCfg(i);
    if (!c || (P.cds['s' + i] || 0) > 0 || !aiReach(c, T)) continue;
    if (skillWhy(c, at) === '魔力不足') lackMp = true;
    if (aiCan(c, i, at) && useSlot(i)) return;
  }
  if (lackMp && A.flaskT <= 0 && P.mp < ST.mp * 0.3 && !(P.cds.mflask > 0)) (A.flaskT = 1), drinkFlask(1);
}
/* 自動／手動切換鈕：切成手動 AI 停下（地圖不中斷）；切回自動 AI 接手 */
function autoToggle() {
  S.auto = S.auto ? 0 : 1;
  AI.hold = -1;
  save();
  hudWarn(S.auto ? '自動：AI 接手' : '手動：自己操作');
}
