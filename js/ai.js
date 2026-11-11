/* dungeonPOE · 掛機 AI（0.3.0，企劃書 2.1 第 9 項）
   AI 只輸出兩樣東西：移動方向 AI.mv（updPlayer 讀）與瞄準點 AI.aim（mouseWorld 回傳）；
   然後呼叫現有的 useSlot、doRoll、drinkFlask、interact（撿）、aiHome（走進傳送門）。不複製技能邏輯。
   一張圖的自動循環：打 → 王倒下 → 撿完 → 走進傳送門 → 回家（臨時頁倒進倉庫）→ 自動再開（aiReopen）。 */
'use strict';
const AI = {
  on: 0 /* 這一格是 AI 在操作 */,
  mv: [0, 0],
  aim: { x: 0, y: 0 },
  hold: -1 /* 蓄力技能按住的那一格 */,
  dn: 0 /* 同一節點連死幾次 */,
  dk: null /* 連死的節點 */,
  pending: 0 /* 回家後等著再開（世界展開的演出看完再走） */,
  re: 0 /* 正在由 AI 開圖（payMap 不清連死） */
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
/* 要躲的東西：紅光預警圈（快爆了而且腳下有）、馬上要出手而且面向自己的近戰怪。回傳要逃的方向（單位向量）或 null */
function aiThreat() {
  let ax = 0,
    ay = 0;
  const push = (x, y) => {
    const d = Math.hypot(P.x - x, P.y - y) || 1;
    (ax += (P.x - x) / d), (ay += (P.y - y) / d);
  };
  for (const t of G.tele)
    if (!t.done && t.dmg > 0 && t.dur - t.t < ROLL.t + 0.5 && dist(P, t) < t.r + P.r + 10) push(t.x, t.y);
  for (const m of G.mobs) {
    /* 王的招式沒有統一的射程：前搖快結束、離得近、面向自己就算 */
    if (m.hp <= 0 || m.st !== 'wind' || m.t > 0.4 || !(m.boss || ['melee', 'lunge', 'slam'].includes(m.D.ai))) continue;
    if (dist(m, P) < (m.D.reach || m.r + 170) + P.r + 20 && angDiff(angTo(m, P), m.ang || 0) < 1.3) push(m.x, m.y);
  }
  const l = Math.hypot(ax, ay);
  return l ? [ax / l, ay / l] : null;
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
  /* 回到藏身處後等著再開：世界展開的演出、面板、對話都結束了才走 */
  if (AI.pending && G.scene === 'hide') {
    if (!S.auto) AI.pending = 0;
    else if (!anyPanel() && !TALK.on && G.state === 'play') (AI.pending = 0), aiReopen();
    return;
  }
  if (!S.auto || G.scene !== 'map' || PRO.on || TALK.on) return;
  AI.on = 1;
  const A = G.ai || (G.ai = { deadT: 0, skip: new Map(), tryT: new Map(), flaskT: 0, rollT: 0, idle: 0 });
  if (G.state === 'dead') {
    A.deadT += dt;
    if (A.deadT > 1.5) aiHome(true);
    return;
  }
  if (G.state === 'portal') return aiHome(false);
  if (G.state !== 'play') return;
  A.flaskT -= dt;
  const T = aiTarget(),
    boss = G.portal && G.portal.home;
  AI.aim = T ? { x: T.x, y: T.y } : { x: P.x + Math.cos(P.face) * 200, y: P.y + Math.sin(P.face) * 200 };
  /* 藥劑：生命低於一半喝生命藥劑（正在回復中不重複喝） */
  if (P.hp < ST.hp * AI_HP && P.heal <= 0 && A.flaskT <= 0 && P.flask >= flaskNeed()) {
    A.flaskT = 1;
    drinkFlask();
  }
  /* 翻滾：紅光圈在腳下、近戰怪馬上要打到自己，往反方向滾 */
  if (!P.roll && !(P.cds.roll > 0)) {
    const e = aiThreat();
    if (e) {
      (P.mdx = e[0]), (P.mdy = e[1]);
      doRoll();
    }
  }
  if (P.roll) return;
  /* 蓄力技能：按住到蓄滿、目標死了或打不到就放開 */
  const act = P.act;
  if (act && act.charge) {
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
  } else if (boss && (!T || dist(P, T) > 260)) aiGo(G.portal.x, G.portal.y, 6);
  /* 出招：照順序，冷卻好、放得出來、打得到就放；魔力不夠的招等著，喝魔力藥劑 */
  if (!T || P.act || G.state !== 'play') return;
  const at = AI.aim;
  let lackMp = false;
  for (const i of order) {
    const c = slotCfg(i);
    if (!c || (P.cds['s' + i] || 0) > 0 || !aiReach(c, T)) continue;
    if (skillWhy(c, at) === '魔力不足') lackMp = true;
    if (aiCan(c, i, at) && useSlot(i)) return;
  }
  if (lackMp && A.flaskT <= 0 && P.mp < ST.mp * 0.3 && P.mflask >= flaskNeed()) (A.flaskT = 1), drinkFlask(1);
}
/* 自動／手動切換鈕：切成手動 AI 停下（地圖不中斷）；切回自動 AI 接手，在藏身處就接著開圖 */
function autoToggle() {
  S.auto = S.auto ? 0 : 1;
  AI.hold = -1;
  if (S.auto) S.stopWhy = null;
  save();
  hudWarn(S.auto ? '自動：AI 接手' : '手動：自己操作');
}
/* 開始巡邏（世界地圖與巡邏卡的按鈕）：選好的卡整個區塊共用；在藏身處就直接開第一個節點 */
function patrolStart(rg, sel) {
  const P = S.patrol;
  wCards(S, rg).sel = sel || 0;
  Object.assign(P, { rg, prev: P.rg && P.rg !== rg ? P.rg : P.prev, got: 0 });
  S.run = null;
  S.stopWhy = null;
  S.auto = 1;
  AI.dn = 0;
  save();
  if (G.scene === 'hide') aiReopen();
  else hudWarn('開始巡邏：這張圖打完就接著走');
}
/* 倉庫與兩頁臨時倉庫都滿了（放不下最大的 2×4 裝備） */
function aiTempFull() {
  const room = g => {
    for (let x = 0; x <= g.w - 2; x++) for (let y = 0; y <= g.h - 4; y++) if (gridFree(g, x, y, 2, 4)) return true;
    return false;
  };
  return !room(S.temp) && !room(S.temp2);
}
/* 停機：記下原因（巡邏卡看），玩家按地圖台的開始才繼續 */
function aiStop(why, txt, extra) {
  S.stopWhy = { k: G.node || (S.run && S.run.k) || null, rg: S.patrol.rg || S.patrol.prev, why, ...extra };
  save();
  hudWarn(txt);
}
/* 這張圖結束：走進傳送門（won）或倒下（died）→ 回藏身處（臨時頁倒進倉庫）→ 自動再開 */
function aiHome(died) {
  const k = G.node,
    card = G.card,
    n = k ? wName(S, ...wXY(k)) : '',
    hit = P.lastHit;
  if (k) S.run = { k, card };
  AI.dn = died ? (AI.dk === k ? AI.dn : 0) + 1 : 0;
  AI.dk = k;
  save();
  enterHideout();
  if (!S.auto || !k) return;
  if (died && AI.dn >= 3)
    return aiStop('dead3', `死在${n}，連死 3 次，停下來了`, {
      n,
      hit: hit && hit.n,
      el: hit && hit.el,
      mods: card && card.mods
    });
  AI.pending = 1;
  aiReopen();
}
/* 這個區塊裡走得到的節點（裂口不算），離 at 最近的排前面 */
function aiRgReach(rg, at) {
  return wRgNodes(S, rg)
    .filter(([q, r]) => !wWhy(S, q, r))
    .sort((a, b) => wRing(a[0] - at[0], a[1] - at[1]) - wRing(b[0] - at[0], b[1] - at[1]));
}
/* 區塊卡裡星級最接近 star 的那張（往下一個區塊「新抽同星級的卡」） */
function aiCardNear(rg, star) {
  const o = wCards(S, rg);
  let b = 0;
  o.c.forEach((c, i) => Math.abs(c.star - star) < Math.abs(o.c[b].star - star) && (b = i));
  return (o.sel = b), o.c[b];
}
/* 下一個節點（企劃書 2.1 第 4 項）：
   1. 死了就同一節點同一張卡；2. 劇情區照順序；3. 巡邏中的區塊裡離目前位置最近、走得到的節點，卡是整個區塊共用的；
   4. 區塊打完（或剩下的走不到）照 S.patrol.mode：next 往外最近的區塊（新抽同星級的卡）、reset 花碎片重置再刷、stop 停下來。
   回傳 { k, card } 或 { stop: 原因, txt } */
function aiPick() {
  const run = S.run,
    P = S.patrol;
  if (run && !wDone(S).has(run.k) && !wWhy(S, ...wXY(run.k))) return run;
  if (!wOpen(S)) return { k: wKey(STORY[S.world.stage].q, STORY[S.world.stage].r) };
  if (!P.rg) return { stop: 'pick', txt: '選一張區塊卡，按「開始巡邏」' };
  const at = wXY(S.world.at);
  let L = aiRgReach(P.rg, at);
  if (!L.length) {
    const star = (S.run && S.run.card && S.run.card.star) || (wCards(S, P.rg).c[wCards(S, P.rg).sel] || {}).star || 1;
    if (P.mode === 'stop')
      return (P.prev = P.rg), delete S.cards[P.rg], (P.rg = null), { stop: 'end', txt: '這個區塊巡邏完了，停下來了' };
    if (P.mode === 'reset') {
      if (!wReset(S, P.rg)) return { stop: 'frag', txt: `碎片不夠：重置區塊要 ${resetCost(P.rg)} 個，停下來了` };
      L = aiRgReach(P.rg, at);
      if (!L.length) return { stop: 'none', txt: '重置了但沒有走得到的節點，停下來了' };
    } else {
      /* 往外最近：所有走得到的節點（不是裂口、不在這個區塊）裡離目前位置最近的那個，它的區塊就是下一個 */
      const c = wList(S)
        .map(wXY)
        .filter(([q, r]) => wRegionOf(S.world.seed, q, r) && wRegionOf(S.world.seed, q, r) !== P.rg)
        .filter(([q, r]) => wType(S, q, r) !== 'rift' && !wWhy(S, q, r))
        .sort((a, b) => wRing(a[0] - at[0], a[1] - at[1]) - wRing(b[0] - at[0], b[1] - at[1]))[0];
      if (!c) return { stop: 'none', txt: '沒有可以走的節點，停下來了' };
      P.prev = P.rg;
      delete S.cards[P.prev]; /* 打完（剩下的走不到）的區塊：卡清掉 */
      P.rg = wRegionOf(S.world.seed, c[0], c[1]);
      aiCardNear(P.rg, star);
      L = aiRgReach(P.rg, at);
    }
  }
  const o = wCards(S, P.rg);
  return { k: wKey(...L[0]), card: o.c[o.sel] };
}
function aiReopen() {
  if (!S.auto || S.stopWhy || G.scene !== 'hide') return false;
  if (PANEL.device) return false; /* 世界展開的演出：看完再走（AI.pending 還在） */
  if (aiTempFull()) return aiStop('full', '倉庫和臨時倉庫都滿了，停下來了'), false;
  const nx = aiPick();
  if (nx.stop) return aiStop(nx.stop, nx.txt), false;
  AI.re = 1;
  const t = payMap(nx.k, 0, nx.card);
  AI.re = 0;
  if (!t) return aiStop('none', `進不去${wName(S, ...wXY(nx.k))}，停下來了`), false;
  save();
  enterMap(t);
  return true;
}
