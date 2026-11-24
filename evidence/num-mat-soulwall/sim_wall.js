/* num-mat-soulwall：後段靈魂牆（倉房回收、後段靈魂費用上限）S0～S3 比較。
   底子＝numbers/num-mat-sources @000b53f 的 sim_mat.js（主組：PAY=any、MAT_SCALE＝1、W_RATIO＝0.3、開局生鐵 16、沒有產生器與居民、民房不買、
   第 5 格＝鍛造台 Lv16、購買照 ORDER、SUP a）。strict／商會、SUP b、CRAFT=0 的分支刪掉（這次只跑主組）。
   組（GRP）：S0＝主組（瞭望台 Lv1 鐵 80、SPECIAL 比例照 g，都在遊戲程式裡）；S1＝S0＋倉房回收；S2＝S0＋後段靈魂費用上限 20,000；S3＝S1＋S2；
             S3b＝S3 但鍛造台 Lv16 留 25,000；S3c＝S3 但上限 15,000
   回收政策：每 5 秒買完東西以後，把超過保留量的全部換掉（matRecycle，craft.js）。保留量：木 8,000；每種材料目前地點掉的階 T 與 T−1 各 300；
             再加最便宜（靈魂）下一級設施的木與材料（材料照 PAY=any 的第 1 階當量，從最高階往下留，最後一階無條件進位）
   環境變數：GRP  SEC  NS（40）  SEED  MIN（3600）  MINLO（1800）
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
  GRP = process.env.GRP || 'S0',
  RECYC = /^S[13]/.test(GRP) ? 1 : 0,
  CAP = GRP === 'S3c' ? 15000 : /^S[23]/.test(GRP) ? 20000 : 0,
  KEEP = GRP === 'S3b' ? { forge16: 1 } : {};
if (!['S0', 'S1', 'S2', 'S3', 'S3b', 'S3c'].includes(GRP)) throw new Error('GRP? ' + GRP);
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
  `MAT_SCALE = 1; W_RATIO = 0.3; MAT_SEED = ${(SEED0 ^ 0x5bd1e995) >>> 0}; RECYC_ON = ${RECYC}; soulCapSet(${CAP}, ${JSON.stringify(KEEP)});`
);
const r = R(`(() => {
  const B6 = ['forge', 'watch', 'scout', 'house', 'altar', 'store'], ORDER = ['forge', 'watch', 'altar', 'scout', 'store'];
  const MK = ['iron', 'hide', 'silk'];
  S = { lv: 1, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: { wood: 20, 'iron:1': 16 } }, prd: PRD0(), inv: { items: [] }, camp: newCamp(), auto2: { ...AUTO2(), up: 0 }, world: newWorld(), gold: 0, star: 1, rounds: [], eq: {}, lib: {}, idols: [], frags: newFrags ? newFrags() : {} };
  const SUP2K = Object.keys(SUPPORTS).filter(k => SUPPORTS[k].tier === 2);
  const rows = [], ev = [], dry = [];
  let recIn = 0, recMin = 0, recUnlock = null, w1soul = null, w1iron = null, w1both = null;
  let t = 0, nextRound = ${SEC}, soulIn = 0, rounds = 0, craftN = 0, rareN = 0, ctNext = 60, sup2N = 0, craft1 = null;
  const spend = { forge: 0, watch: 0, scout: 0, house: 0, altar: 0, store: 0, sup2: 0 };
  const acc = { campUse: {}, craftNet: {}, trade: {}, payAny: {}, drop: {}, feel: 0 };
  const add = (o, k, n) => (o[k] = (o[k] || 0) + n);
  const node = () => TRUNK[Math.min(S.camp.watch, TRUNK.length - 1)];
  const eqv = (mm, m) => { let s = 0; for (let u = 1; u <= 6; u++) s += (mm[m + ':' + u] || 0) * 3 ** (u - 1); return s; };
  /* 在 mm 上弄出 need 個 m:T（PAY=any：同種任何階都收，先用最低階付，最後一階無條件進位，多付不找）；mm 會被改（呼叫的人給拷貝） */
  const gather = (mm, m, T, need, log) => {
    const k = m + ':' + T;
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
  /* 回收（S1／S3）：買完以後把超過保留量的全部換掉；回這一次換到的靈魂 */
  const recycle = () => {
    if (!RECYC_ON || !campCan('salv65')) return 0;
    const T = matTier(node().lv), L = ORDER.map(b => campNext(b)).filter(Boolean).sort((a, b) => a.soul - b.soul)[0];
    let got = matRecycle('wood', matN('wood') - 8000 - ((L && L.wood) || 0));
    for (const m of MK) {
      const keep = { [T]: 300 };
      if (T > 1) keep[T - 1] = 300;
      let need = 0;
      for (const key in (L && L.mats) || {}) { const [mm, u] = matOf(key); if (mm === m) need += L.mats[key] * 3 ** (u - 1); }
      for (let u = 6; u >= 1 && need > 0; u--) {
        const v = 3 ** (u - 1), av = matN(m, u) - (keep[u] || 0);
        if (av <= 0) continue;
        const take = Math.min(av, Math.ceil(need / v));
        keep[u] = (keep[u] || 0) + take;
        need -= take * v;
      }
      for (let u = 1; u <= 6; u++) got += matRecycle(m + ':' + u, matN(m, u) - (keep[u] || 0));
    }
    return got;
  };
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
      if (S.camp.watch === 0) {
        if (w1soul == null && S.mat.soul >= campNext('watch').soul) w1soul = t;
        if (w1iron == null && eqv(S.mat.mats, 'iron') >= 80) w1iron = t;
        if (w1both == null && S.mat.soul >= campNext('watch').soul && eqv(S.mat.mats, 'iron') >= 80) w1both = t;
      }
      buyFacilities();
      {
        const first = recUnlock == null && RECYC_ON && campCan('salv65'), g = recycle();
        recIn += g; recMin += g;
        if (first) recUnlock = { t, soul: g };
      }
      if (t >= ctNext) {
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
    rows.push({ rec: recMin, recIn, scap: SOUL_CAP, min, node: Math.min(S.camp.watch, TRUNK.length - 1) + 1, lv: node().lv, T: matTier(node().lv), cap: tierCap(), soul: Math.round(S.mat.soul), soulIn: Math.round(soulIn),
      soulSpent: Math.round(Object.values(spend).reduce((a, b) => a + b, 0)), wood: matN('wood'), st,
      trade: Object.values(acc.trade).reduce((a, b) => a + b, 0), payAny: Object.values(acc.payAny).reduce((a, b) => a + b, 0),
      tran: S.mat.tran || 0, feel: acc.feel, camp: B6.map(b => S.camp[b]).join('/'), rounds, forge: S.camp.forge, slots: campN('slots'),
      sup2: sup2N, spend: Object.fromEntries(Object.entries(spend).map(([k, v]) => [k, Math.round(v)])), craftN, rareN, gold: Math.round(S.gold),
      _: (recMin = 0), dry: cur ? 1 : 0, dryWhy: cur ? (() => { const c = ORDER.filter(b => campNext(b)).map(b => b + ':' + fund(campNext(b), false).lack.join('+')); return c.join(' '); })() : '' });
    if (min >= ${MINLO} && S.camp.forge >= 20 && sup2Left() === 0) break;
  }
  if (cur) dry.push({ t0: cur.t0, len: t - cur.t0, node: cur.node, b: '', lv: 0, cause: 'open', both: 0, lack: [], open: 1,
    lacks: cur.last.map(x => x.b + ':' + x.f.lack.join('+')).join(' '), matWait: 0 });
  const next = {};
  for (const b of B6) { const n = campNext(b); if (n) next[b] = { lv: n.lv, soul: n.soul, wood: n.wood, mats: n.mats || {}, lack: fund(n, false).lack }; }
  return { rows, ev, dry, next, trade: acc.trade, payAny: acc.payAny, drop: acc.drop, craftNet: acc.craftNet, campUse: acc.campUse, sup2K: SUP2K.length, craft1, w13mat, recUnlock, w1soul, w1iron, w1both };
})()`);
const out = {
  cfg: { GRP, SEC, NS, MIN, MINLO, SEED: SEED0, RECYC, CAP, KEEP },
  sup2K: r.sup2K,
  end: r.rows.length,
  next: r.next,
  craft1: r.craft1,
  w13mat: r.w13mat,
  recUnlock: r.recUnlock,
  w1soul: r.w1soul,
  w1iron: r.w1iron,
  w1both: r.w1both
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
    ...B6.map(b => b + '等級'),
    '回收換到靈魂_當分',
    '回收換到靈魂_累計',
    '費用上限'
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
        ...x.camp.split('/'),
        x.rec,
        x.recIn,
        x.scap
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
