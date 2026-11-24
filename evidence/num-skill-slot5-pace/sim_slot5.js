/* num-skill-slot5-pace：第 5 格技能移到鍛造台 Lv16 的長時間節奏模擬。
   底子＝evidence/num-skill-slot5-pace/sim_pacing.js（num-m2-21-pacing 的 sim_pacing.js 移植到最新 main，SINK=none OUT=none CRAFT=1），
   購買政策＝tools/camp_run.js 的「會按的玩家」（每 5 秒照 ORDER 升解鎖表、產生器用剩下的木一次一級最便宜的先、一分鐘打造一件 n=1 並分解）。
   這裡多做的事（summary.md「假設」一節逐條寫）：
     GROUP ctrl｜exp   ctrl＝第 5 格是長老屋 Lv9（main 現行）；exp＝第 5 格是鍛造台 Lv16，鍛造台 <16 時照「鍛造台優先」政策（見 buyFacilities）
     PAY   none｜any   none＝照現況；any＝假設：設施費用裡的鐵 T 階 n 個＝n×3^(T−1) 生鐵當量，任何階的鐵都收（先付最低階），只在 T ≤ 材料階上限時
     TRADE 1｜0        1＝倉房 Lv4（商會，forge.js tradeList／tradeDo）開了以後，設施缺材料時用 5 換 1 補（只補差額，不超過材料階上限）
     SUP   a｜b｜c      鍛造台 Lv20 後的輔助 II：a＝II 優先（還有 II 沒解鎖時，設施只用多出 15,000 以上的靈魂買）；b＝II 排在其他升級之後（替最便宜的下一級設施存錢，多出 15,000 才買 II）；c＝補充：同一輪設施先買、剩下的就買 II
     SEC 一輪秒數  NS 小怪  SEED  MIN 上限分鐘（3600）  MINLO 最少分鐘（1800）：到 MINLO 以後，鍛造台 Lv20 且 13 種 II 都解鎖就停
   輸出：argv 的 .csv（逐分鐘＋事件）、.json（事件、逐分鐘、總結） */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const REPO = process.env.REPO || path.join(__dirname, '..', '..');
const SEC = +(process.env.SEC || 150),
  NS = +(process.env.NS || 40),
  MIN = +(process.env.MIN || 3600),
  MINLO = +(process.env.MINLO || 1800),
  GROUP = process.env.GROUP || 'ctrl',
  PAY = process.env.PAY || 'none',
  TRADE = +(process.env.TRADE ?? 1),
  SUP = process.env.SUP || 'b';
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
const r = R(`(() => {
  const GROUP = ${JSON.stringify(GROUP)}, PAY = ${JSON.stringify(PAY)}, TRADE = ${TRADE}, SUP = ${JSON.stringify(SUP)};
  const B6 = ['forge', 'watch', 'scout', 'house', 'altar', 'store'], ORDER = ['forge', 'house', 'watch', 'altar', 'scout', 'store'];
  /* 自動分解的 ▲（itemUp）要角色資料，模擬不換裝，關掉不影響（留下的也立刻分解） */
  S = { lv: 1, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: { wood: 20 } }, prd: PRD0(), inv: { items: [] }, camp: newCamp(), auto2: { ...AUTO2(), up: 0 }, world: newWorld(), gold: 0, star: 1, rounds: [], eq: {}, lib: {}, idols: [], frags: newFrags ? newFrags() : {} };
  /* 第 5 格：ctrl 照 main（長老屋 Lv9）；exp 照本分支（鍛造台 Lv16）。跟 campN('slots') 對帳 */
  const slot5 = () => (GROUP === 'exp' ? S.camp.forge >= 16 : S.camp.altar >= 9);
  const SUP2K = Object.keys(SUPPORTS).filter(k => SUPPORTS[k].tier === 2);
  const rows = [], ev = [];
  let t = 0, nextRound = ${SEC}, soulIn = 0, rounds = 0, craftN = 0, rareN = 0, ctNext = 60, sup2N = 0;
  const spend = { forge: 0, watch: 0, scout: 0, house: 0, altar: 0, store: 0, sup2: 0 };
  const acc = { prod: {}, campUse: {}, genUse: {}, craftNet: {}, trade: {}, payAny: {}, feel: 0 };
  const add = (o, k, n) => (o[k] = (o[k] || 0) + n);
  const node = () => TRUNK[Math.min(S.camp.watch, TRUNK.length - 1)];

  /* ---------- 付材料：在一份材料表（mats 物件）上試付／實付。缺的部分 PAY=any 用其他階的鐵當量補，TRADE 用 5 換 1 補 ---------- */
  const tradeOn = () => TRADE && campCan('trade');
  /* 在 mm（{ 'iron:2': n }）上弄出 need 個 m:T；回 true／false，mm 會被改（呼叫的人給拷貝） */
  const gather = (mm, m, T, need, log) => {
    const k = m + ':' + T, h = mm[k] || 0;
    if (h >= need) return true;
    let d = need - h;
    if (PAY === 'any' && m === 'iron' && T <= tierCap()) {
      /* 假設：鐵 T 階 1 個＝3^(T−1) 生鐵；先付最低階，最後一階無條件進位（多付的不找） */
      let eq = d * 3 ** (T - 1);
      const plan = [];
      for (let u = 1; u <= 6 && eq > 0; u++) {
        if (u === T) continue;
        const v = 3 ** (u - 1), have = mm[m + ':' + u] || 0, take = Math.min(have, Math.ceil(eq / v));
        if (take > 0) plan.push([u, take]), (eq -= take * v);
      }
      if (eq <= 0) {
        for (const [u, n] of plan) (mm[m + ':' + u] -= n), log && add(acc.payAny, m + ':' + u, n);
        mm[k] = (mm[k] || 0) + d;
        return true;
      }
    }
    if (tradeOn() && T >= 2 && T <= tierCap()) {
      if (!gather(mm, m, T - 1, 5 * d + 0, log)) return false;
      mm[m + ':' + (T - 1)] -= 5 * d;
      mm[k] = (mm[k] || 0) + d;
      log && add(acc.trade, k, d);
      return true;
    }
    return false;
  };
  /* 一筆費用付不付得起（含補法）；pay＝真的付；回 { ok, lack:[鍵…] } */
  const fund = (c, pay, log = true) => {
    const lack = [];
    if ((c.soul || 0) > S.mat.soul) lack.push('soul');
    if ((c.wood || 0) > matN('wood')) lack.push('wood');
    if ((c.gold || 0) > S.gold) lack.push('gold');
    for (const k in c.cur || {}) if ((S.mat[k] || 0) < c.cur[k]) lack.push('cur:' + k);
    const mm = { ...S.mat.mats };
    for (const key in c.mats || {}) {
      const [m, T] = matOf(key);
      if (!gather(mm, m, T, c.mats[key], false)) lack.push(key);
    }
    if (lack.length || !pay) return { ok: !lack.length, lack };
    for (const key in c.mats || {}) {
      const [m, T] = matOf(key);
      const mm2 = S.mat.mats;
      gather(mm2, m, T, c.mats[key], log);
    }
    return { ok: true, lack };
  };
  const up = b => {
    const nx = campNext(b);
    if (!nx || !fund(nx, false).ok) return 1;
    const s0 = S.mat.soul, m0 = { ...S.mat.mats };
    fund(nx, true);
    if (campUp(b)) throw new Error('campUp 失敗 ' + b + ' ' + campUp(b));
    spend[b] += s0 - S.mat.soul;
    for (const k in m0) if (k !== 'wood' && m0[k] !== (S.mat.mats[k] || 0)) add(acc.campUse, k, m0[k] - (S.mat.mats[k] || 0));
    ev.push({ t, b, lv: S.camp[b], soul: nx.soul, wood: nx.wood || 0, mats: Object.assign({}, nx.mats), left: Math.round(S.mat.soul) });
    return 0;
  };
  /* 試買 b 之後，鍛造台下一級 F 有沒有變遠：F 現在缺的那幾項 b 一點都不能用；F 現在夠的那幾項 b 用完還要夠 */
  const snap = () => ({ soul: S.mat.soul, gold: S.gold, mats: { ...S.mat.mats }, cur: Object.fromEntries(Object.keys(CUR).map(k => [k, S.mat[k]])) });
  const restore = x => { S.mat.soul = x.soul; S.gold = x.gold; S.mat.mats = x.mats; for (const k in x.cur) S.mat[k] = x.cur[k]; };
  const lackKeys = F => {
    const L = fund(F, false).lack;
    return L;
  };
  const noDelay = (b, F) => {
    const nx = campNext(b);
    if (!nx || !fund(nx, false).ok) return false;
    const before = lackKeys(F), x = snap();
    const use = new Set();
    fund(nx, true, false);
    if (nx.soul) use.add('soul');
    if (nx.wood) use.add('wood');
    if (nx.gold) use.add('gold');
    for (const k in nx.cur || {}) use.add('cur:' + k);
    const after = lackKeys(F), m1 = S.mat.mats;
    restore(x);
    /* 材料：F 缺的鍵，b 有沒有動到（直接用或被拿去換） */
    for (const k of before) {
      if (k.includes(':') && !k.startsWith('cur:')) { if ((m1[k] || 0) !== (x.mats[k] || 0) || lowerTouched(k, x.mats, m1)) return false; }
      else if (use.has(k)) return false;
    }
    return after.every(k => before.includes(k));
  };
  /* 缺的那一階能用別階補（商會開了，或假設 PAY=any 的鐵）時，同一種材料的別階被動到也算動到 */
  const lowerTouched = (k, a, b) => {
    const [m, T] = matOf(k);
    if (!(tradeOn() || (PAY === 'any' && m === 'iron'))) return false;
    for (let u = 1; u <= 6; u++) if (u !== T && (a[m + ':' + u] || 0) !== (b[m + ':' + u] || 0)) return true;
    return false;
  };
  /* 鍛造台下一級缺的材料要哪座設施才解得開：材料階 > 上限 → 瞭望台；鐵／皮／絲 T≥4（產生器要 Lv150 才產，等於產不出）且商會還沒開 → 倉房（到 Lv4） */
  const unlockers = F => {
    const u = new Set();
    for (const key in F.mats || {}) {
      const [m, T] = matOf(key);
      if (matN(m, T) >= F.mats[key]) continue;
      if (T > tierCap()) u.add('watch');
      if (T >= 4 && TRADE && !campCan('trade') && !(PAY === 'any' && m === 'iron')) u.add('store');
    }
    return u;
  };
  const expOn = () => GROUP === 'exp' && S.camp.forge < 16;
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
  const cheapestPending = () => Math.min(...B6.map(b => campNext(b)).filter(Boolean).map(n => n.soul), Infinity);
  function buyFacilities() {
    if (expOn()) {
      up('forge');
      if (!expOn()) return buyFacilities();
      const F = campNext('forge'), U = unlockers(F);
      for (const b of ORDER) {
        if (b === 'forge') continue;
        if (U.has(b) && !(b === 'store' && S.camp.store >= 4)) up(b);
        else if (noDelay(b, F)) up(b);
      }
      return;
    }
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
    /* c（補充）：同一輪裡設施先買，剩下的靈魂才買 II（不替設施存錢） */
    if (sup2Open && SUP === 'c') while (S.mat.soul >= SUP2_COST && !buySup2());
    if (sup2Open && SUP === 'b') while (sup2Left() > 0 && S.mat.soul - SUP2_COST >= (isFinite(cheapestPending()) ? cheapestPending() : 0) && !buySup2());
  }
  /* 產生器與打造要留的木與材料：exp 鍛造台 <16 時留鍛造台下一級的；其他照原本（最便宜的下一件，靈魂夠了才留） */
  const reserve = () => {
    if (expOn()) { const F = campNext('forge'); return { wood: F.wood || 0, mats: { ...(F.mats || {}) } }; }
    const L = ORDER.map(b => campNext(b)).filter(Boolean).sort((a, b) => a.soul - b.soul)[0];
    if (!(L && S.mat.soul >= L.soul)) return { wood: 0, mats: {} };
    return { wood: L.wood || 0, mats: { ...(L.mats || {}) } };
  };
  const K = ['weapon', 'chest', 'helm', 'gloves', 'boots', 'belt', 'ring', 'amulet'];
  let lastNodeT = {};
  for (let min = 1; min <= ${MIN}; min++) {
    for (; t < min * 60; t++) {
      const got = genTick(1);
      for (const k in got) add(acc.prod, k, got[k]);
      if (t >= nextRound) {
        nextRound += ${SEC};
        const s0 = S.mat.soul, f0 = S.prd.feelI || 0;
        const nE = eliteCount(1);
        roundLoot(lvT(node().lv), 1, ${NS}, nE);
        S.rounds.push({ d: ${SEC}, nS: ${NS}, nE }); if (S.rounds.length > 10) S.rounds.shift();
        if ((S.prd.feelI || 0) !== f0) acc.feel++;
        soulIn += S.mat.soul - s0; rounds++;
        S.gold += 125 * ${SEC} / 60;
      }
      if (t % 5) continue;
      buyFacilities();
      for (let g = 0; g < 50; g++) {
        const rs = reserve(), ok = GEN_K.filter(k => {
          if (!genOn(k) || genAfford(k) < 1) return false;
          const c = genCost(k);
          if (k !== 'wood' && matN('wood') - c.wood < rs.wood) return false;
          return Object.keys(c.mats).every(key => matN(...matOf(key)) - c.mats[key] >= (rs.mats[key] || 0));
        });
        if (!ok.length) break;
        const k = ok.reduce((a, b) => (genCost(a).wood <= genCost(b).wood ? a : b)), c = genCost(k);
        for (const key in c.mats) add(acc.genUse, key, c.mats[key]);
        genUp(k);
      }
      if (t >= ctNext) {
        const T = genTier('iron'), rs = reserve(), keep = (rs.mats['iron:' + T] || 0) + (genCost('iron').mats['iron:' + T] || 0);
        if (matN('iron', T) - 8 >= keep) {
          ctNext = t + 60;
          const kind = K[craftN % K.length], m0 = matN('iron', T);
          const res = craftDo(kind, { T, n: 1, sys: kind === 'weapon' || ['belt', 'ring', 'amulet'].includes(kind) ? '' : 'armor' });
          if (!res.why) {
            craftN++;
            rareN += res.items.filter(it => it.r === 2).length;
            for (const it of res.items) if (!it.salv) { S.inv.items = S.inv.items.filter(x => x !== it); salvageDo(it); }
          }
          add(acc.craftNet, 'iron:' + T, m0 - matN('iron', T));
        }
      }
    }
    const st = {};
    for (const m of ['iron', 'hide', 'silk']) for (let T = 1; T <= 6; T++) st[m + T] = matN(m, T);
    const low = m => { const T0 = genOn(m) ? genTier(m) : 1; let s = 0; for (let T = 1; T < T0; T++) s += matN(m, T); return s; };
    if (GROUP === 'exp' && campN('slots') !== (S.camp.altar >= 6 ? 4 : S.camp.altar >= 3 ? 3 : S.camp.altar >= 1 ? 2 : 1) + (S.camp.forge >= 16 ? 1 : 0)) throw new Error('campN slots 跟實驗組規則對不上（js/craft.js 要是本分支的版本）');
    rows.push({ min, node: S.camp.watch + 1, lv: node().lv, cap: tierCap(), ironT: genTier('iron'), soul: Math.round(S.mat.soul), soulIn: Math.round(soulIn),
      soulSpent: Math.round(Object.values(spend).reduce((a, b) => a + b, 0)), wood: matN('wood'), st, prodI1: acc.prod['iron:1'] || 0,
      campUseI1: acc.campUse['iron:1'] || 0, genUseI1: acc.genUse['iron:1'] || 0, craftI1: acc.craftNet['iron:1'] || 0,
      lowI: low('iron'), lowH: low('hide'), lowS: low('silk'), trade: Object.values(acc.trade).reduce((a, b) => a + b, 0), payAny: Object.values(acc.payAny).reduce((a, b) => a + b, 0),
      tran: S.mat.tran || 0, feel: acc.feel, camp: B6.map(b => S.camp[b]).join('/'), gen: GEN_K.map(k => genOf(k).lv).join('/'), rounds,
      wall: B6.map(b => { const n = campNext(b); if (!n || S.mat.soul < n.soul) return ''; const L = fund(n, false).lack.filter(k => k !== 'soul'); return L.length ? b + ':' + L.join('+') : ''; }).filter(Boolean).join(' '),
      forge: S.camp.forge, slot5: slot5() ? 1 : 0, slots: GROUP === 'exp' ? campN('slots') : Math.min(5, S.camp.altar >= 9 ? 5 : S.camp.altar >= 6 ? 4 : S.camp.altar >= 3 ? 3 : S.camp.altar >= 1 ? 2 : 1),
      sup2: sup2N, spend: Object.fromEntries(Object.entries(spend).map(([k, v]) => [k, Math.round(v)])), craftN, rareN, gold: Math.round(S.gold) });
    if (min >= ${MINLO} && S.camp.forge >= 20 && sup2Left() === 0) break;
  }
  const next = {};
  for (const b of B6) { const n = campNext(b); if (n) next[b] = { lv: n.lv, soul: n.soul, wood: n.wood, mats: n.mats || {}, lack: fund(n, false).lack }; }
  return { rows, ev, next, trade: acc.trade, payAny: acc.payAny, sup2K: SUP2K.length };
})()`);
const out = { cfg: { SEC, NS, MIN, MINLO, SEED: SEED0, GROUP, PAY, TRADE, SUP }, sup2K: r.sup2K, end: r.rows.length, next: r.next, trade: r.trade, payAny: r.payAny };
const ci = process.argv.findIndex(x => x.endsWith('.csv'));
if (ci > 0) {
  const MK = ['iron', 'hide', 'silk'], B6 = ['forge', 'watch', 'scout', 'house', 'altar', 'store'];
  const H = ['分', '第幾個地點', '怪物Lv', '材料階上限', '礦場產階', '靈魂庫存', '累計靈魂收入', '累計靈魂花費', '木', ...MK.flatMap(m => [1, 2, 3, 4].map(T => m + 'T' + T)),
    '累計生鐵產量', '累計生鐵_營地原表用量', '累計生鐵_C用量', '累計生鐵_產生器用量', '累計生鐵_打造淨用量', '低階鐵', '低階皮', '低階絲', '累計5換1得到', '累計低階換蛻變石', '蛻變石庫存', '有感保底次數', '鍛瞭斥民祭倉', '林礦獵絲', '輪數',
    '鍛造台等級', '第5格開了', '技能格數', '輔助II已解鎖', ...B6.map(b => '累計靈魂花費_' + b), '累計靈魂花費_輔助II', '累計打造次數', '累計打造稀有', '假設_鐵當量付款用掉', '金', '靈魂夠但缺材料', 'ironT5', 'ironT6', 'hideT5', 'hideT6', 'silkT5', 'silkT6'];
  const L = [H.join(',')];
  for (const x of r.rows)
    L.push([x.min, x.node, x.lv, x.cap, x.ironT, x.soul, x.soulIn, x.soulSpent, x.wood, ...MK.flatMap(m => [1, 2, 3, 4].map(T => x.st[m + T])),
      x.prodI1, x.campUseI1, 0, x.genUseI1, x.craftI1, x.lowI, x.lowH, x.lowS, x.trade, 0, x.tran, x.feel, x.camp, x.gen, x.rounds,
      x.forge, x.slot5, x.slots, x.sup2, ...B6.map(b => x.spend[b]), x.spend.sup2, x.craftN, x.rareN, x.payAny, x.gold, x.wall, x.st.iron5, x.st.iron6, x.st.hide5, x.st.hide6, x.st.silk5, x.st.silk6].join(','));
  L.push('', '設施,等級,秒,分,靈魂費用,木費用,原表材料,C生鐵,買完剩靈魂');
  const NM = { forge: '鍛造台', watch: '瞭望台', scout: '斥候營', house: '民房', altar: '長老屋', store: '倉房', sup2: '輔助II' };
  for (const e of r.ev) L.push([NM[e.b], e.lv, e.t, (e.t / 60).toFixed(2), e.soul, e.wood, '"' + JSON.stringify(e.mats).replace(/"/g, "'") + '"', 0, e.left].join(','));
  fs.writeFileSync(process.argv[ci], L.join('\n') + '\n');
}
const ji = process.argv.findIndex(x => x.endsWith('.json'));
if (ji > 0) fs.writeFileSync(process.argv[ji], JSON.stringify({ ...out, rows: r.rows, ev: r.ev }));
console.log(JSON.stringify(out));
