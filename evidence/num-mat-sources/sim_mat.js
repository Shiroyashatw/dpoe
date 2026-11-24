/* num-mat-sources：拿掉產生器與居民、材料改由擊殺掉落（js/craft.js 的 killMats，本分支）後的長時間節奏模擬。
   底子＝numbers/num-skill-slot5-pace @65b05b9 的 sim_slot5.js（購買政策＝那邊「對照組」的原政策，第 5 格＝鍛造台 Lv16 的規則在 craft.js）。
   跟底子不同的地方（summary.md「假設」逐條寫）：
     - 不買民房、不買產生器（產生器在 craft.js 已經不產、不能買）
     - 設施照 ORDER（鍛造台、瞭望台、長老屋、斥候營、倉房）夠了就買；保留量＝靈魂最便宜的下一級（靈魂夠了才留它的材料）
     - PAY any｜strict：any＝設施升級的鐵／皮／靈絲同種任何階都收（T 階 1 個＝3^(T−1) 個第 1 階，先用最低階付，最後一階無條件進位、多付不找）；
                        strict＝照 main 指定階（倉房 Lv4 商會開了用 5 換 1 補差額，不超過材料階上限）
     - 打造：一分鐘最多一件（n＝1、部位輪流、鐵）。階＝目前地點掉的 T（matTier），不夠就 T−1；留保留量＋8；全部分解、不換裝。CRAFT=0 不打造
     - 乾等：每 5 秒、買東西之前看五座設施（民房除外，滿級的不算）有沒有任何一級買得起；連續買不起的一段＝一段乾等
   環境變數：SEC 一輪秒數  NS 小怪（40）  SEED  MIN 上限分（3600）  MINLO 最少分（1800）  PAY any｜strict  TRADE 1｜0  SUP a｜b
             CRAFT 1｜0  MAT_SCALE（1）  W_RATIO（0.3）
   輸出：argv 的 .csv（逐分鐘＋事件＋乾等）、.json */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const REPO = process.env.REPO || path.join(__dirname, '..', '..');
const SEC = +(process.env.SEC || 150),
  NS = +(process.env.NS || 40),
  MIN = +(process.env.MIN || 3600),
  MINLO = +(process.env.MINLO || 1800),
  PAY = process.env.PAY || 'any',
  TRADE = +(process.env.TRADE ?? 1),
  SUP = process.env.SUP || 'b',
  CRAFT = +(process.env.CRAFT ?? 1),
  MSC = +(process.env.MAT_SCALE || 1),
  WR = +(process.env.W_RATIO || 0.3);
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
R(`MAT_SCALE = ${MSC}; W_RATIO = ${WR}; MAT_SEED = ${(SEED0 ^ 0x5bd1e995) >>> 0};`);
const r = R(`(() => {
  const PAY = ${JSON.stringify(PAY)}, TRADE = ${TRADE}, SUP = ${JSON.stringify(SUP)}, CRAFT = ${CRAFT};
  const B6 = ['forge', 'watch', 'scout', 'house', 'altar', 'store'], ORDER = ['forge', 'watch', 'altar', 'scout', 'store'];
  const MK = ['iron', 'hide', 'silk'];
  S = { lv: 1, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: { wood: 20, 'iron:1': 16 } }, prd: PRD0(), inv: { items: [] }, camp: newCamp(), auto2: { ...AUTO2(), up: 0 }, world: newWorld(), gold: 0, star: 1, rounds: [], eq: {}, lib: {}, idols: [], frags: newFrags ? newFrags() : {} };
  const SUP2K = Object.keys(SUPPORTS).filter(k => SUPPORTS[k].tier === 2);
  const rows = [], ev = [], dry = [];
  let t = 0, nextRound = ${SEC}, soulIn = 0, rounds = 0, craftN = 0, rareN = 0, ctNext = 60, sup2N = 0, craft1 = null;
  const spend = { forge: 0, watch: 0, scout: 0, house: 0, altar: 0, store: 0, sup2: 0 };
  const acc = { campUse: {}, craftNet: {}, trade: {}, payAny: {}, drop: {}, feel: 0 };
  const add = (o, k, n) => (o[k] = (o[k] || 0) + n);
  const node = () => TRUNK[Math.min(S.camp.watch, TRUNK.length - 1)];
  const tradeOn = () => TRADE && campCan('trade');
  const eqv = (mm, m) => { let s = 0; for (let u = 1; u <= 6; u++) s += (mm[m + ':' + u] || 0) * 3 ** (u - 1); return s; };
  /* 在 mm 上弄出 need 個 m:T（PAY 規則＋商會）；回 true／false，mm 會被改（呼叫的人給拷貝） */
  const gather = (mm, m, T, need, log) => {
    const k = m + ':' + T, h = mm[k] || 0;
    if (PAY === 'any') {
      /* 同種任何階都收：先用最低階付，最後一階無條件進位，多付不找 */
      let eq = need * 3 ** (T - 1);
      const plan = [];
      for (let u = 1; u <= 6 && eq > 0; u++) {
        const v = 3 ** (u - 1), have = mm[m + ':' + u] || 0, take = Math.min(have, Math.ceil(eq / v));
        if (take > 0) plan.push([u, take]), (eq -= take * v);
      }
      if (eq > 0) return false;
      for (const [u, n] of plan) { mm[m + ':' + u] -= n; if (log && u !== T) add(acc.payAny, m + ':' + u, n); }
      mm[k] = (mm[k] || 0) + need;
      return true;
    }
    if (h >= need) return true;
    const d = need - h;
    if (tradeOn() && T >= 2 && T <= tierCap()) {
      if (!gather(mm, m, T - 1, 5 * d, log)) return false;
      mm[m + ':' + (T - 1)] -= 5 * d;
      mm[k] = (mm[k] || 0) + d;
      log && add(acc.trade, k, d);
      return true;
    }
    return false;
  };
  /* 一筆費用付不付得起；pay＝真的付（只把材料換成指定階，靈魂等由 campUp 扣）；回 { ok, lack } */
  const fund = (c, pay, log = true) => {
    const lack = [];
    if ((c.soul || 0) > S.mat.soul) lack.push('soul');
    if ((c.wood || 0) > matN('wood')) lack.push('wood');
    if ((c.gold || 0) > S.gold) lack.push('gold');
    for (const k in c.cur || {}) if ((S.mat[k] || 0) < c.cur[k]) lack.push('cur:' + k);
    const mm = { ...S.mat.mats };
    for (const key in c.mats || {}) { const [m, T] = matOf(key); if (!gather(mm, m, T, c.mats[key], false)) lack.push(key); }
    if (lack.length || !pay) return { ok: !lack.length, lack };
    for (const key in c.mats || {}) { const [m, T] = matOf(key); gather(S.mat.mats, m, T, c.mats[key], log); }
    return { ok: true, lack };
  };
  const up = b => {
    const nx = campNext(b);
    if (!nx || !fund(nx, false).ok) return 1;
    const s0 = S.mat.soul, m0 = { ...S.mat.mats };
    fund(nx, true);
    const e = campUp(b);
    if (e) throw new Error('campUp 失敗 ' + b + ' ' + e);
    spend[b] += s0 - S.mat.soul;
    for (const k in m0) if (k !== 'wood' && m0[k] !== (S.mat.mats[k] || 0)) add(acc.campUse, k, m0[k] - (S.mat.mats[k] || 0));
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
    const sup2Open = campCan('sup2') && sup2Left() > 0;
    if (sup2Open && SUP === 'a') {
      while (S.mat.soul >= SUP2_COST && !buySup2());
      for (const b of ORDER) {
        const n = campNext(b);
        if (sup2Left() > 0 && n && S.mat.soul - n.soul < SUP2_COST) continue;
        up(b);
      }
      return;
    }
    for (const b of ORDER) up(b);
    if (sup2Open && SUP === 'b') while (sup2Left() > 0 && S.mat.soul - SUP2_COST >= (isFinite(cheapestPending()) ? cheapestPending() : 0) && !buySup2());
  }
  /* 保留量：靈魂最便宜的下一級，靈魂夠了才留它的材料 */
  const reserve = () => {
    const L = ORDER.map(b => campNext(b)).filter(Boolean).sort((a, b) => a.soul - b.soul)[0];
    if (!(L && S.mat.soul >= L.soul)) return { mats: {} };
    return { mats: { ...(L.mats || {}) } };
  };
  /* 打 T 階一件（最多 8 個鐵）之後保留量還在不在：strict 看同一階；any 看鐵的第 1 階當量 */
  const keepOK = (T, rs) => {
    if (PAY === 'any') {
      let need = 0;
      for (const key in rs.mats) { const [m, u] = matOf(key); if (m === 'iron') need += rs.mats[key] * 3 ** (u - 1); }
      return eqv(S.mat.mats, 'iron') - 8 * 3 ** (T - 1) >= need && matN('iron', T) >= 8;
    }
    return matN('iron', T) - 8 >= (rs.mats['iron:' + T] || 0);
  };
  const K = ['weapon', 'chest', 'helm', 'gloves', 'boots', 'belt', 'ring', 'amulet'];
  /* 乾等：五座設施（民房除外，滿級不算）都買不起的連續一段。cur＝目前這一段 */
  let cur = null, w13mat = null;
  const soulOk = {};
  const dryTick = () => {
    const open = ORDER.filter(b => campNext(b));
    if (!open.length) return;
    const st = open.map(b => { const n = campNext(b); return { b, f: fund(n, false), soulOK: S.mat.soul >= n.soul }; });
    for (const x of st) if (x.soulOK) { if (soulOk[x.b] == null) soulOk[x.b] = t; } else soulOk[x.b] = null;
    if (S.camp.watch === 12 && w13mat == null && !fund(campNext('watch'), false).lack.some(k => k !== 'soul')) w13mat = t;
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
  const lv0 = {};
  for (let min = 1; min <= ${MIN}; min++) {
    for (; t < min * 60; t++) {
      if (t >= nextRound) {
        nextRound += ${SEC};
        const s0 = S.mat.soul, f0 = S.prd.feelI || 0, m0 = { ...S.mat.mats };
        S.world.cur = TRUNK_K[Math.min(S.camp.watch, TRUNK.length - 1)];
        const nE = eliteCount(1);
        roundLoot(lvT(node().lv), 1, ${NS}, nE);
        for (const k in S.mat.mats) if ((S.mat.mats[k] || 0) > (m0[k] || 0)) add(acc.drop, k, S.mat.mats[k] - (m0[k] || 0));
        S.rounds.push({ d: ${SEC}, nS: ${NS}, nE }); if (S.rounds.length > 10) S.rounds.shift();
        if ((S.prd.feelI || 0) !== f0) acc.feel++;
        soulIn += S.mat.soul - s0; rounds++;
        S.gold += 125 * ${SEC} / 60;
      }
      if (t % 5) continue;
      dryTick();
      buyFacilities();
      if (CRAFT && t >= ctNext) {
        const T0 = matTier(node().lv), rs = reserve();
        const T = keepOK(T0, rs) ? T0 : T0 > 1 && keepOK(T0 - 1, rs) ? T0 - 1 : 0;
        if (T) {
          ctNext = t + 60;
          const kind = K[craftN % K.length], m0 = matN('iron', T);
          const res = craftDo(kind, { T, n: 1, sys: kind === 'weapon' || ['belt', 'ring', 'amulet'].includes(kind) ? '' : 'armor' });
          if (!res.why) {
            craftN++;
            if (craft1 == null) craft1 = t;
            rareN += res.items.filter(it => it.r === 2).length;
            for (const it of res.items) if (!it.salv) { S.inv.items = S.inv.items.filter(x => x !== it); salvageDo(it); }
          }
          add(acc.craftNet, 'iron:' + T, m0 - matN('iron', T));
        }
      }
    }
    const st = {};
    for (const m of MK) for (let T = 1; T <= 6; T++) st[m + T] = matN(m, T);
    rows.push({ min, node: Math.min(S.camp.watch, TRUNK.length - 1) + 1, lv: node().lv, T: matTier(node().lv), cap: tierCap(), soul: Math.round(S.mat.soul), soulIn: Math.round(soulIn),
      soulSpent: Math.round(Object.values(spend).reduce((a, b) => a + b, 0)), wood: matN('wood'), st,
      trade: Object.values(acc.trade).reduce((a, b) => a + b, 0), payAny: Object.values(acc.payAny).reduce((a, b) => a + b, 0),
      tran: S.mat.tran || 0, feel: acc.feel, camp: B6.map(b => S.camp[b]).join('/'), rounds, forge: S.camp.forge, slots: campN('slots'),
      sup2: sup2N, spend: Object.fromEntries(Object.entries(spend).map(([k, v]) => [k, Math.round(v)])), craftN, rareN, gold: Math.round(S.gold),
      dry: cur ? 1 : 0, dryWhy: cur ? (() => { const c = ORDER.filter(b => campNext(b)).map(b => b + ':' + fund(campNext(b), false).lack.join('+')); return c.join(' '); })() : '' });
    if (min >= ${MINLO} && S.camp.forge >= 20 && sup2Left() === 0) break;
  }
  if (cur) dry.push({ t0: cur.t0, len: t - cur.t0, node: cur.node, b: '', lv: 0, cause: 'open', both: 0, lack: [], open: 1,
    lacks: cur.last.map(x => x.b + ':' + x.f.lack.join('+')).join(' '), matWait: 0 });
  const next = {};
  for (const b of B6) { const n = campNext(b); if (n) next[b] = { lv: n.lv, soul: n.soul, wood: n.wood, mats: n.mats || {}, lack: fund(n, false).lack }; }
  return { rows, ev, dry, next, trade: acc.trade, payAny: acc.payAny, drop: acc.drop, craftNet: acc.craftNet, campUse: acc.campUse, sup2K: SUP2K.length, craft1, w13mat };
})()`);
const out = {
  cfg: { SEC, NS, MIN, MINLO, SEED: SEED0, PAY, TRADE, SUP, CRAFT, MAT_SCALE: MSC, W_RATIO: WR },
  sup2K: r.sup2K,
  end: r.rows.length,
  next: r.next,
  craft1: r.craft1,
  w13mat: r.w13mat
};
const ci = process.argv.findIndex(x => x.endsWith('.csv'));
if (ci > 0) {
  const MK = ['iron', 'hide', 'silk'],
    B6 = ['forge', 'watch', 'scout', 'house', 'altar', 'store'];
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
    '鍛瞭斥民祭倉',
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
    house: '民房',
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
