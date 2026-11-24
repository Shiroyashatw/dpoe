/* num-mat-v11：長老屋 Lv9～11 費用、倉房 Lv4 商會換打造通貨、CRAFT=mix 的長時間模擬（只為模擬，分支不能合併）。
   底子＝num-mat-final 的 sim_final.js（複製改名）。新增：
   - CRAFT=iron（num-mat-final 原樣，只用鐵）｜mix（部位照舊輪流；防具的系輪流 護甲→閃避→能量護盾＝鐵→皮→靈絲，武器、飾品照基底的材料＝鐵）
   - ALT=c9,c10,c11：覆寫 CAMP.altar[8..10].soul（其他不動）；不給＝用 js/data.js 的值
   - TRADE=1：倉房 Lv4（campCan('trade')）以後，每 5 秒把超過上限的材料用遊戲的 tradeCur 換成通貨；上限 CAP＝'wood:..,iron:..,hide:..,silk:..'（第 1 階當量）
   - 記錄：各材料各階的戰鬥掉落、設施用量、打造用量、分解退回、商會換掉；各通貨的戰鬥掉落、商會換到、庫存
   環境變數：SEC  NS（40）  SEED  MIN（3600）  CRAFT  ALT  TRADE  CAP  STOP（1＝鍛造台 Lv20、13 種 II、長老屋 Lv11 都到就停；預設 0＝跑滿 MIN）
   輸出：argv 的 .csv（逐分鐘＋事件＋乾等）、.json */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const REPO = process.env.REPO || path.join(__dirname, '..', '..');
const CRAFT = process.env.CRAFT || 'mix',
  TRADE = +(process.env.TRADE || 0),
  STOP = +(process.env.STOP || 0),
  ALT = process.env.ALT ? process.env.ALT.split(',').map(Number) : null,
  CAP = Object.fromEntries((process.env.CAP || '').split(',').filter(Boolean).map(x => [x.split(':')[0], +x.split(':')[1]]));
const SEC = +(process.env.SEC || 150),
  NS = +(process.env.NS || 40),
  MIN = +(process.env.MIN || 3600);
let seed = +(process.env.SEED || 20261115);
const SEED0 = seed;
const rand = () => {
  let t = (seed += 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const M = Object.create(Math);
M.random = rand;
const ctx = { console, Math: M, Date, JSON, Object, Array, location: { search: '' }, URLSearchParams };
vm.createContext(ctx);
for (const f of ['palette.js', 'ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'world.js'])
  vm.runInContext(fs.readFileSync(path.join(REPO, 'js', f), 'utf8'), ctx, { filename: f });
const R = s => vm.runInContext(s, ctx);
/* 材料亂數流：跟 Math.random（原本的掉落亂數）分開，種子＝SEED 的固定變換 */
R(
  `MAT_SCALE = 1; W_RATIO = 0.3; MAT_SEED = ${(SEED0 ^ 0x5bd1e995) >>> 0};`
);
if (ALT) R(`CAMP.altar[8].soul = ${ALT[0]}; CAMP.altar[9].soul = ${ALT[1]}; CAMP.altar[10].soul = ${ALT[2]};`);
const ALTV = R('CAMP.altar.slice(8).map(x => x.soul)');
const r = R(`(() => {
  const B6 = ['forge', 'watch', 'scout', 'altar', 'store'], ORDER = ['forge', 'watch', 'altar', 'scout', 'store'];
  const MK = ['iron', 'hide', 'silk'];
  S = { lv: 1, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: { wood: 20, 'iron:1': 16 } }, prd: PRD0(), inv: { items: [] }, camp: newCamp(), auto2: { ...AUTO2(), up: 0 }, world: newWorld(), gold: 0, star: 1, rounds: [], eq: {}, lib: {}, idols: [], frags: newFrags ? newFrags() : {} };
  const SUP2K = Object.keys(SUPPORTS).filter(k => SUPPORTS[k].tier === 2);
  const rows = [], ev = [], dry = [];
  let w1soul = null, w1iron = null, w1both = null;
  let t = 0, nextRound = ${SEC}, soulIn = 0, rounds = 0, craftN = 0, rareN = 0, ctNext = 60, sup2N = 0, craft1 = null;
  const spend = { forge: 0, watch: 0, scout: 0, altar: 0, store: 0, sup2: 0 };
  const acc = { campUse: {}, craftNet: {}, craftOut: {}, salvIn: {}, trade: {}, tradeOut: {}, payAny: {}, drop: {}, curDrop: {}, curTrade: {}, feel: 0 };
  const CURK = Object.keys(CUR).filter(k => typeof MAT()[k] === 'number');
  const CAP = ${JSON.stringify(CAP)}, MK4 = ['wood', 'iron', 'hide', 'silk'];
  let node22 = null, tradeOn = null, armorN = 0;
  const add = (o, k, n) => (o[k] = (o[k] || 0) + n);
  const node = () => TRUNK[Math.min(S.camp.watch, TRUNK.length - 1)];
  const eqv = (mm, m) => { let s = 0; for (let u = 1; u <= 6; u++) s += (mm[m + ':' + u] || 0) * 3 ** (u - 1); return s; };
  /* 一筆費用付不付得起：直接用遊戲的 costRows（設施升級帶 any＝任何階都收）；回 { ok, lack:[鍵…] } */
  const fund = c => {
    const lack = costRows(c).filter(([, h, w]) => h < w).map(x => x[3]);
    return { ok: !lack.length, lack };
  };
  const up = b => {
    const nx = campNext(b);
    if (!nx || !fund(nx).ok) return 1;
    const s0 = S.mat.soul, m0 = { ...S.mat.mats };
    const e = campUp(b);
    if (e) throw new Error('campUp 失敗 ' + b + ' ' + e);
    spend[b] += s0 - S.mat.soul;
    for (const k in m0) if (m0[k] !== (S.mat.mats[k] || 0)) { add(acc.campUse, k, m0[k] - (S.mat.mats[k] || 0)); if (k !== 'wood' && !(nx.mats || {})[k]) add(acc.payAny, k, m0[k] - (S.mat.mats[k] || 0)); }
    ev.push({ t, b, lv: S.camp[b], soul: nx.soul, wood: nx.wood || 0, mats: Object.assign({}, nx.mats), left: Math.round(S.mat.soul) });
    return 0;
  };
  const sup2Left = () => SUP2K.filter(k => sup2Lock(k)).length;
  const buySup2 = () => {
    const k = SUP2K.find(k => sup2Lock(k));
    if (!k) return 1;
    const s0 = S.mat.soul;
    if (sup2Unlock(k)) return 1;
    spend.sup2 += s0 - S.mat.soul;
    sup2N++;
    ev.push({ t, b: 'sup2', lv: sup2N, soul: SUP2_COST, wood: 0, mats: {}, left: Math.round(S.mat.soul) });
    return 0;
  };
  const cheapestPending = () => Math.min(...ORDER.map(b => campNext(b)).filter(Boolean).map(n => n.soul), Infinity);
  function buyFacilities() {
    if (campCan('sup2') && sup2Left() > 0) {
      while (S.mat.soul >= SUP2_COST && !buySup2());
      for (const b of ORDER) {
        const n = campNext(b);
        if (sup2Left() > 0 && n && S.mat.soul - n.soul < SUP2_COST) continue;
        up(b);
      }
      return;
    }
    for (const b of ORDER) up(b);
  }
  /* 保留量：靈魂最便宜的下一級，靈魂夠了才留它的材料 */
  const reserve = () => {
    const L = ORDER.map(b => campNext(b)).filter(Boolean).sort((a, b) => a.soul - b.soul)[0];
    if (!(L && S.mat.soul >= L.soul)) return { mats: {} };
    return { mats: { ...(L.mats || {}) } };
  };
  /* 打 T 階一件（最多 8 個鐵）之後保留量還在不在：看鐵的第 1 階當量 */
  const keepOK = (T, rs) => {
    let need = 0;
    for (const key in rs.mats) { const [m, u] = matOf(key); if (m === 'iron') need += rs.mats[key] * 3 ** (u - 1); }
    return eqv(S.mat.mats, 'iron') - 8 * 3 ** (T - 1) >= need && matN('iron', T) >= 8;
  };
  const K = ['weapon', 'chest', 'helm', 'gloves', 'boots', 'belt', 'ring', 'amulet'];
  /* 乾等：五座設施（民房除外，滿級不算）都買不起的連續一段。cur＝目前這一段 */
  let cur = null, w13mat = null;
  const soulOk = {};
  const dryTick = () => {
    const open = ORDER.filter(b => campNext(b));
    if (!open.length) return;
    const st = open.map(b => { const n = campNext(b); return { b, f: fund(n), soulOK: S.mat.soul >= n.soul }; });
    for (const x of st) if (x.soulOK) { if (soulOk[x.b] == null) soulOk[x.b] = t; } else soulOk[x.b] = null;
    if (S.camp.watch === 12 && w13mat == null && !fund(campNext('watch')).lack.some(k => k !== 'soul')) w13mat = t;
    const ok = st.find(x => x.f.ok);
    if (!ok) {
      if (!cur) cur = { t0: t, node: Math.min(S.camp.watch, TRUNK.length - 1) + 1 };
      cur.last = st;
      return;
    }
    if (cur) {
      /* 結束這一段：原因看「結束時買得起的那一座」在最後一個乾等刻缺什麼 */
      const x = cur.last.find(y => y.b === ok.b), L = x.f.lack, mat = L.filter(k => k !== 'soul');
      dry.push({ t0: cur.t0, len: t - cur.t0, node: cur.node, b: ok.b, lv: (S.camp[ok.b] || 0) + 1, cause: mat.length ? 'mat' : 'soul', both: mat.length && L.includes('soul') ? 1 : 0, lack: L,
        matWait: mat.length && soulOk[ok.b] != null ? t - Math.max(cur.t0, soulOk[ok.b]) : 0 });
      cur = null;
    }
  };
  /* 商會：超過上限 CAP[m]（第 1 階當量）的部分，從第 1 階往上用整顆的量換通貨；通貨照 TRADE_CUR 那一列輪流（跳過還沒開始掉的） */
  const curRR = {};
  function doTrade() {
    if (tradeOn == null) tradeOn = t;
    for (const m of MK4) {
      if (!(m in CAP)) continue;
      const cs = Object.keys(TRADE_CUR[m]).filter(c => TRADE_CUR[m][c] && campCan(curKey(c)));
      if (!cs.length) continue;
      for (let guard = 0; guard < 100000; guard++) {
        const have = m === 'wood' ? matN('wood') : eqv(S.mat.mats, m);
        const c = cs[(curRR[m] = curRR[m] || 0) % cs.length], P = TRADE_CUR[m][c];
        if (have - CAP[m] < P) break;
        let n = Math.floor((have - CAP[m]) / P), paid = 0;
        for (const T of m === 'wood' ? [0] : [1, 2, 3, 4, 5, 6]) {
          if (paid >= n) break;
          const q = tradeCost(m, T, c), k = Math.min(n - paid, Math.floor(matN(m, T) / q));
          if (k <= 0) continue;
          /* 一顆一顆換，通貨照輪流 */
          for (let i = 0; i < k; i++) {
            const cc = cs[curRR[m] % cs.length], qq = tradeCost(m, T, cc);
            if (matN(m, T) < qq) break;
            const e = tradeCur(m, T, cc);
            if (e) throw new Error('tradeCur ' + e);
            curRR[m]++; paid++;
            add(acc.tradeOut, matKey(m, T), qq); add(acc.curTrade, cc, 1);
          }
        }
        if (!paid) break;
      }
    }
  }
  /* 打造：一分鐘最多一件；階＝地點掉的 T，不夠就試 T−1；打完全部分解。
     CRAFT=iron：num-mat-final 原樣（防具一律護甲系、keepOK 只看鐵 8 個）。
     CRAFT=mix：防具的系輪流（armorN：護甲→閃避→能量護盾），這一系 T、T−1 都不夠就照輪流試下一系；武器、飾品照基底（鐵）。
     保留量（reserve）照原本：靈魂最便宜的下一級、靈魂夠了才留它的材料；看那種材料的第 1 階當量 */
  const SYS3 = ['armor', 'ev', 'es'];
  const okMix = (kind, sys, T, rs) => {
    if (T < 1) return null;
    const b = craftBase(kind, { sys, T });
    if (!b) return null;
    const c = craftCost(b, T);
    for (const m in c.mats) {
      let need = 0;
      for (const key in rs.mats) { const [mm, u] = matOf(key); if (mm === m) need += rs.mats[key] * 3 ** (u - 1); }
      if (matN(m, T) < c.mats[m] || eqv(S.mat.mats, m) - c.mats[m] * 3 ** (T - 1) < need) return null;
    }
    if (S.gold < c.gold) return null;
    return { sys, T };
  };
  function craftTick() {
    const T0 = matTier(node().lv), rs = reserve(), kind = K[craftN % K.length];
    let pick = null;
    if ('${CRAFT}' === 'iron') {
      const T = keepOK(T0, rs) ? T0 : T0 > 1 && keepOK(T0 - 1, rs) ? T0 - 1 : 0;
      if (T) pick = { T, sys: kind === 'weapon' || ['belt', 'ring', 'amulet'].includes(kind) ? '' : 'armor' };
    } else if (kind === 'weapon' || ['belt', 'ring', 'amulet'].includes(kind)) pick = okMix(kind, '', T0, rs) || okMix(kind, '', T0 - 1, rs);
    else for (let i = 0; i < 3 && !pick; i++) { const sys = SYS3[(armorN + i) % 3]; pick = okMix(kind, sys, T0, rs) || okMix(kind, sys, T0 - 1, rs); }
    if (!pick) return;
    const { T } = pick;
    ctNext = t + 60;
    const m0 = { ...S.mat.mats };
    const res = craftDo(kind, { T, n: 1, sys: pick.sys });
    if (!res.why) {
      craftN++;
      if ('${CRAFT}' !== 'iron' && pick.sys) armorN = SYS3.indexOf(pick.sys) + 1;
      if (craft1 == null) craft1 = t;
      rareN += res.items.filter(it => it.r === 2).length;
      for (const k in m0) if ((S.mat.mats[k] || 0) < m0[k]) add(acc.craftOut, k, m0[k] - (S.mat.mats[k] || 0));
      for (const k in res.salv.mats) add(acc.craftOut, k, res.salv.mats[k]);
      const m1 = { ...S.mat.mats };
      for (const it of res.items) if (!it.salv) { S.inv.items = S.inv.items.filter(x => x !== it); salvageDo(it); }
      for (const k in S.mat.mats) if ((S.mat.mats[k] || 0) > (m1[k] || 0)) add(acc.salvIn, k, S.mat.mats[k] - (m1[k] || 0));
      /* 自動分解（倉庫留不下）的退回已經在 craftDo 裡加進去了：從 res.salv 補記 */
      for (const k in res.salv.mats) add(acc.salvIn, k, res.salv.mats[k]);
    }
    for (const k in m0) if (m0[k] !== (S.mat.mats[k] || 0)) add(acc.craftNet, k, m0[k] - (S.mat.mats[k] || 0));
  }
  const lv0 = {};
  for (let min = 1; min <= ${MIN}; min++) {
    for (; t < min * 60; t++) {
      if (t >= nextRound) {
        nextRound += ${SEC};
        const s0 = S.mat.soul, f0 = S.prd.feelI || 0, m0 = { ...S.mat.mats }, c0 = Object.fromEntries(CURK.map(k => [k, S.mat[k]]));
        S.world.cur = TRUNK_K[Math.min(S.camp.watch, TRUNK.length - 1)];
        const nE = eliteCount(1);
        roundLoot(lvT(node().lv), 1, ${NS}, nE);
        for (const k in S.mat.mats) if ((S.mat.mats[k] || 0) > (m0[k] || 0)) add(acc.drop, k, S.mat.mats[k] - (m0[k] || 0));
        for (const k of CURK) if (S.mat[k] > c0[k]) add(acc.curDrop, k, S.mat[k] - c0[k]);
        S.rounds.push({ d: ${SEC}, nS: ${NS}, nE }); if (S.rounds.length > 10) S.rounds.shift();
        if ((S.prd.feelI || 0) !== f0) acc.feel++;
        soulIn += S.mat.soul - s0; rounds++;
        S.gold += 125 * ${SEC} / 60;
      }
      if (t % 5) continue;
      dryTick();
      if (S.camp.watch === 0) {
        if (w1soul == null && S.mat.soul >= campNext('watch').soul) w1soul = t;
        if (w1iron == null && eqv(S.mat.mats, 'iron') >= 80) w1iron = t;
        if (w1both == null && S.mat.soul >= campNext('watch').soul && eqv(S.mat.mats, 'iron') >= 80) w1both = t;
      }
      buyFacilities();
      if (${TRADE} && campCan('trade')) doTrade();
      if (t >= ctNext) craftTick();
    }
    const st = {};
    for (const m of MK) for (let T = 1; T <= 6; T++) st[m + T] = matN(m, T);
    if (node22 == null && S.camp.watch >= 21) node22 = min;
    const eqA = (o, m) => (m === 'wood' ? o.wood || 0 : eqv(o, m));
    const u = Object.fromEntries(MK4.map(m => [m, [eqA(acc.drop, m), eqA(acc.campUse, m), eqA(acc.craftNet, m), eqA(acc.tradeOut, m)]]));
    rows.push({ u, cur: Object.fromEntries(CURK.map(k => [k, S.mat[k] || 0])), ctr: { ...acc.curTrade }, cdr: { ...acc.curDrop }, min, node: Math.min(S.camp.watch, TRUNK.length - 1) + 1, lv: node().lv, T: matTier(node().lv), cap: tierCap(), soul: Math.round(S.mat.soul), soulIn: Math.round(soulIn),
      soulSpent: Math.round(Object.values(spend).reduce((a, b) => a + b, 0)), wood: matN('wood'), st,
      trade: Object.values(acc.trade).reduce((a, b) => a + b, 0), payAny: Object.values(acc.payAny).reduce((a, b) => a + b, 0),
      tran: S.mat.tran || 0, feel: acc.feel, camp: B6.map(b => S.camp[b]).join('/'), rounds, forge: S.camp.forge, slots: campN('slots'),
      sup2: sup2N, spend: Object.fromEntries(Object.entries(spend).map(([k, v]) => [k, Math.round(v)])), craftN, rareN, gold: Math.round(S.gold),
      dry: cur ? 1 : 0, dryWhy: cur ? (() => { const c = ORDER.filter(b => campNext(b)).map(b => b + ':' + fund(campNext(b)).lack.join('+')); return c.join(' '); })() : '' });
    if (${STOP} && S.camp.forge >= 20 && sup2Left() === 0 && S.camp.altar >= 11) break;
  }
  if (cur) dry.push({ t0: cur.t0, len: t - cur.t0, node: cur.node, b: '', lv: 0, cause: 'open', both: 0, lack: [], open: 1,
    lacks: cur.last.map(x => x.b + ':' + x.f.lack.join('+')).join(' '), matWait: 0 });
  const next = {};
  for (const b of B6) { const n = campNext(b); if (n) next[b] = { lv: n.lv, soul: n.soul, wood: n.wood, mats: n.mats || {}, lack: fund(n).lack }; }
  return { node22, tradeOn, acc, CURK, rows, ev, dry, next, trade: acc.trade, payAny: acc.payAny, drop: acc.drop, craftNet: acc.craftNet, campUse: acc.campUse, sup2K: SUP2K.length, craft1, w13mat, w1soul, w1iron, w1both };
})()`);
const out = {
  cfg: { SEC, NS, MIN, SEED: SEED0, CRAFT, TRADE, CAP, ALT: ALTV, STOP },
  node22: r.node22,
  tradeOn: r.tradeOn,
  acc: r.acc,
  sup2K: r.sup2K,
  end: r.rows.length,
  next: r.next,
  craft1: r.craft1,
  w13mat: r.w13mat,
  w1soul: r.w1soul,
  w1iron: r.w1iron,
  w1both: r.w1both
};
const ci = process.argv.findIndex(x => x.endsWith('.csv'));
if (ci > 0) {
  const MK = ['iron', 'hide', 'silk'],
    B6 = ['forge', 'watch', 'scout', 'altar', 'store'];
  const H = [
    '分',
    '第幾個地點',
    '怪物Lv',
    '地點掉的階',
    '材料階上限',
    '靈魂庫存',
    '累計靈魂收入',
    '累計靈魂花費',
    '木',
    ...MK.flatMap(m => [1, 2, 3, 4, 5, 6].map(T => m + 'T' + T)),
    '累計5換1得到',
    '假設_任何階付款用掉',
    '蛻變石庫存',
    '有感保底次數',
    '鍛瞭斥祭倉',
    '輪數',
    '鍛造台等級',
    '技能格數',
    '輔助II已解鎖',
    ...B6.map(b => '累計靈魂花費_' + b),
    '累計靈魂花費_輔助II',
    '累計打造次數',
    '累計打造稀有',
    '金',
    '乾等',
    '乾等時各設施缺什麼',
    ...B6.map(b => b + '等級')
  ];
  const L = [H.join(',')];
  for (const x of r.rows)
    L.push(
      [
        x.min,
        x.node,
        x.lv,
        x.T,
        x.cap,
        x.soul,
        x.soulIn,
        x.soulSpent,
        x.wood,
        ...MK.flatMap(m => [1, 2, 3, 4, 5, 6].map(T => x.st[m + T])),
        x.trade,
        x.payAny,
        x.tran,
        x.feel,
        x.camp,
        x.rounds,
        x.forge,
        x.slots,
        x.sup2,
        ...B6.map(b => x.spend[b]),
        x.spend.sup2,
        x.craftN,
        x.rareN,
        x.gold,
        x.dry,
        x.dryWhy,
        ...x.camp.split('/')
      ].join(',')
    );
  L.push('', '設施,等級,秒,分,靈魂費用,木費用,原表材料,買完剩靈魂');
  const NM = {
    forge: '鍛造台',
    watch: '瞭望台',
    scout: '斥候營',
    altar: '長老屋',
    store: '倉房',
    sup2: '輔助II'
  };
  for (const e of r.ev)
    L.push(
      [
        NM[e.b],
        e.lv,
        e.t,
        (e.t / 60).toFixed(2),
        e.soul,
        e.wood,
        '"' + JSON.stringify(e.mats).replace(/"/g, "'") + '"',
        e.left
      ].join(',')
    );
  L.push('', '乾等開始秒,長度秒,地點,結束時買得起的設施,等級,原因,都缺,缺什麼,靈魂夠了以後等材料秒,沒結束');
  for (const d of r.dry)
    L.push(
      [
        d.t0,
        d.len,
        d.node,
        d.b,
        d.lv,
        d.cause,
        d.both,
        (d.lack.join('+') || d.lacks || '').replace(/,/g, ';'),
        d.matWait,
        d.open || 0
      ].join(',')
    );
  fs.writeFileSync(process.argv[ci], L.join('\n') + '\n');
}
const ji = process.argv.findIndex(x => x.endsWith('.json'));
if (ji > 0)
  fs.writeFileSync(
    process.argv[ji],
    JSON.stringify({
      ...out,
      rows: r.rows,
      ev: r.ev,
      dry: r.dry,
      drop: r.drop,
      craftNet: r.craftNet,
      campUse: r.campUse,
      trade: r.trade,
      payAny: r.payAny
    })
  );
console.log(JSON.stringify({ ...out, next: undefined }));
