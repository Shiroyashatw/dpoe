/* M2-21 經濟／節奏模擬（tools/loot_check.js 與 evidence/m1-28 sim_loot_policy.js 的同一套「會按的玩家」政策，延長到 480 分並多記資料）。
   在 Node 載入 repo 的純邏輯（js/ 不改），戰鬥＝每 SEC 秒一輪 roundLoot（小怪 NS、菁英照 1★），產生器每秒 genTick。
   每 5 秒：照 ORDER 升解鎖表（夠了就升）、產生器用剩下的木買（一次一級、最便宜的先、留下一件解鎖表要的）；CRAFT=1 時另外一分鐘打造一件並分解（camp_run 的打造政策，不換裝）。
   環境變數：
     SEC 一輪秒數(150) NS 小怪(40) MIN 分鐘(60) SEED 亂數(20261115) CRAFT 0/1 ORDER 逗號
     SINK  none｜C（選項 C：生鐵加進 8 小時進度）｜Cb（C＋任何階鐵都收、低階打折：T 階 1 個＝3^(T−1) 生鐵當量，先付最低階）
     OUT   none｜a（5 換 1 升階在第一次升階（瞭望台 Lv8，tierCap≥2）就開，只換低於現產階的）｜a2（同 a，但一路換到材料階上限）｜c（蛻變石收低階：低於現產階的鐵／皮／絲 RC 個 → 1 顆，同樣在第一次升階開）
     RC    (c) 的匯率（預設 100）
     OVR   一段 JS（在載入後、新存檔前執行；試候選常數）
   輸出：--csv 檔（逐分鐘）、--json 檔（解鎖秒數與總結）；stdout 一行 JSON 摘要 */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const REPO = process.env.REPO || path.join(__dirname, '..', '..');
const a = process.argv.slice(2).filter(x => !x.startsWith('--') && !/\.(csv|json)$/.test(x));
const SEC = +(process.env.SEC || 150),
  NS = +(process.env.NS || 40),
  MIN = +(process.env.MIN || 60),
  CRAFT = +(process.env.CRAFT || 0),
  SINK = process.env.SINK || 'none',
  OUT = process.env.OUT || 'none',
  RC = +(process.env.RC || 100);
let seed = +(process.env.SEED || 20261115);
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
if (process.env.OVR) R(process.env.OVR);
const ORDER = (process.env.ORDER || 'forge,house,watch,altar,scout,store').split(',');
const r = R(`(() => {
  const SINK = ${JSON.stringify(SINK)}, OUT = ${JSON.stringify(OUT)}, RC = ${RC}, CRAFT = ${CRAFT};
  /* 選項 C（數值表 v0.3 草稿）：生鐵 = 瞭望台 80n²(n≥2)、鍛造台 80n²(n≥4)、民房 80n²(n≥3)、祭壇 100n²(n≥2)、斥候營 150n²(n≥2)、倉房 400n²(全部) */
  const CX = { watch: [80, 2], forge: [80, 4], house: [80, 3], altar: [100, 2], scout: [150, 2], store: [400, 1] };
  const cx = (b, n) => (SINK === 'none' || !CX[b] || n < CX[b][1] ? 0 : CX[b][0] * n * n);
  S = { lv: 1, skills: [{}, {}, {}, {}, {}], mat: { ...newMat(), mats: { wood: 20 } }, prd: PRD0(), inv: { items: [] }, camp: newCamp(), auto2: { ...AUTO2(), up: 0 }, world: newWorld(), gold: 0, star: 1, rounds: [], eq: {}, frags: newFrags ? newFrags() : {} };
  const rows = [], ev = [], ORDER = ${JSON.stringify(ORDER)};
  let t = 0, nextRound = ${SEC}, soulIn = 0, soulSpent = 0, rounds = 0, craftN = 0, ctNext = 60;
  const acc = { prod: {}, campUse: {}, sinkUse: {}, genUse: {}, craftNet: {}, trade: {}, tranTrade: 0, feel: 0, chase: 0, packSoul: 0 };
  const add = (o, k, n) => (o[k] = (o[k] || 0) + n);
  const node = () => TRUNK[Math.min(S.camp.watch, TRUNK.length - 1)];
  const ironEq = () => { let s = 0; for (let T = 1; T <= 6; T++) s += matN('iron', T) * 3 ** (T - 1); return s; };
  /* C 的額外生鐵：Cb 收任何階（T 階 = 3^(T−1) 當量），C 只收生鐵 */
  const cxOk = n => (SINK === 'Cb' ? ironEq() >= n : matN('iron', 1) >= n);
  const cxPay = n => {
    if (SINK !== 'Cb') { matAdd('iron', 1, -n); add(acc.sinkUse, 'iron:1', n); return; }
    for (let T = 1; T <= 6 && n > 0; T++) {
      const v = 3 ** (T - 1), take = Math.min(matN('iron', T), Math.ceil(n / v));
      matAdd('iron', T, -take); add(acc.sinkUse, 'iron:' + T, take); n -= take * v;
    }
  };
  const up = b => {
    const nx = campNext(b);
    if (!nx) return 1;
    const x = cx(b, nx.lv);
    if (x && !cxOk(x)) return 1;
    const m0 = { ...S.mat.mats }, s0 = S.mat.soul;
    if (campUp(b)) return 1;
    soulSpent += s0 - S.mat.soul;
    for (const k in m0) if (k !== 'wood' && m0[k] !== (S.mat.mats[k] || 0)) add(acc.campUse, k, m0[k] - (S.mat.mats[k] || 0));
    if (x) cxPay(x);
    ev.push({ t, b, lv: S.camp[b], soul: nx.soul, wood: nx.wood || 0, iron: Object.assign({}, nx.mats), cx: x, left: Math.round(S.mat.soul) });
    return 0;
  };
  const reserve = () => {
    const L = ORDER.map(b => campNext(b)).filter(Boolean).sort((a, b) => a.soul - b.soul)[0];
    if (!(L && S.mat.soul >= L.soul)) return { wood: 0, mats: {} };
    const b = ORDER.find(b => campNext(b) === L) || ORDER.find(b => { const n = campNext(b); return n && n.soul === L.soul && n.lv === L.lv; });
    const mats = { ...(L.mats || {}) }, x = b ? cx(b, L.lv) : 0;
    if (x && SINK === 'C') mats['iron:1'] = (mats['iron:1'] || 0) + x;
    return { wood: L.wood || 0, mats };
  };
  /* 低階死庫存：鐵／皮／絲 低於「這座產生器現在產的階」的庫存 */
  const low = m => { const T0 = genOn(m) ? genTier(m) : 1; let s = 0; for (let T = 1; T < T0; T++) s += matN(m, T); return s; };
  const firstTierUp = () => tierCap() >= 2;
  const outlets = () => {
    if ((OUT === 'a' || OUT === 'a2') && firstTierUp() && !campCan('trade'))
      for (const m of ['iron', 'hide', 'silk']) {
        /* a：只把低於現產階的換上去（不跳階）；a2：玩家照 tradeList 一路換到材料階上限（會跳過產生器的階里程碑） */
        const T0 = OUT === 'a2' ? tierCap() : genOn(m) ? genTier(m) : 1;
        for (let T = 1; T < T0; T++) { const k = Math.floor(matN(m, T) / 5); if (k) { matAdd(m, T, -5 * k); matAdd(m, T + 1, k); add(acc.trade, m + ':' + (T + 1), k); } }
      }
    if (OUT === 'c' && firstTierUp())
      for (const m of ['iron', 'hide', 'silk']) {
        const T0 = genOn(m) ? genTier(m) : 1;
        for (let T = 1; T < T0; T++) { const k = Math.floor(matN(m, T) / RC); if (k) { matAdd(m, T, -RC * k); S.mat.tran = (S.mat.tran || 0) + k; acc.tranTrade += k; } }
      }
  };
  const K = ['weapon', 'chest', 'helm', 'gloves', 'boots', 'belt', 'ring', 'amulet'];
  for (let min = 1; min <= ${MIN}; min++) {
    for (; t < min * 60; t++) {
      const got = genTick(1);
      for (const k in got) add(acc.prod, k, got[k]);
      if (t >= nextRound) {
        nextRound += ${SEC};
        const s0 = S.mat.soul, f0 = S.prd.feelI || 0, c0 = (S.chase && S.chase.n) || 0, j0 = (S.jewels || []).length;
        const nE = eliteCount(1);
        roundLoot(lvT(node().lv), 1, ${NS}, nE);
        S.rounds.push({ d: ${SEC}, nS: ${NS}, nE }); if (S.rounds.length > 10) S.rounds.shift();
        if ((S.prd.feelI || 0) !== f0) acc.feel++;
        soulIn += S.mat.soul - s0; rounds++;
        S.gold += 125 * ${SEC} / 60;
      }
      if (t % 5) continue;
      for (const b of ORDER) up(b);
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
      if (CRAFT && t >= ctNext) {
        const T = genTier('iron'), rs = reserve(), keep = (rs.mats['iron:' + T] || 0) + (genCost('iron').mats['iron:' + T] || 0);
        if (matN('iron', T) - 8 >= keep) {
          ctNext = t + 60;
          const kind = K[craftN % K.length], m0 = matN('iron', T);
          const res = craftDo(kind, { T, n: 1, sys: kind === 'weapon' || ['belt', 'ring', 'amulet'].includes(kind) ? '' : 'armor' });
          if (!res.why) { craftN++; for (const it of res.items) if (!it.salv) { S.inv.items = S.inv.items.filter(x => x !== it); salvageDo(it); } }
          add(acc.craftNet, 'iron:' + T, m0 - matN('iron', T));
        }
      }
      if (t % 60 === 0) outlets();
    }
    const st = {};
    for (const m of ['iron', 'hide', 'silk']) for (let T = 1; T <= 6; T++) st[m + T] = matN(m, T);
    rows.push({ min, node: S.camp.watch + 1, lv: node().lv, cap: tierCap(), ironT: genTier('iron'), soul: Math.round(S.mat.soul), soulIn: Math.round(soulIn), soulSpent: Math.round(soulSpent),
      wood: matN('wood'), st, prodI1: acc.prod['iron:1'] || 0, prod: { ...acc.prod }, campUse: { ...acc.campUse }, sinkUse: { ...acc.sinkUse }, genUse: { ...acc.genUse }, craftNet: { ...acc.craftNet },
      trade: { ...acc.trade }, tranTrade: acc.tranTrade, tran: S.mat.tran || 0, aug: S.mat.aug || 0, feel: acc.feel, chase: (S.frags && Object.keys(S.frags).filter(k => k.startsWith('wangyin')).reduce((a, k) => a + S.frags[k], 0)) || 0,
      lowI: low('iron'), lowH: low('hide'), lowS: low('silk'), camp: ['forge', 'watch', 'scout', 'house', 'altar', 'store'].map(b => S.camp[b]).join('/'),
      gen: GEN_K.map(k => genOf(k).lv).join('/'), rounds });
  }
  /* 下一件卡在什麼（480 分時）：每座的下一級缺什麼 */
  const next = {};
  for (const b of ORDER) { const n = campNext(b); if (n) next[b] = { lv: n.lv, soul: n.soul, wood: n.wood, mats: n.mats || {}, cx: cx(b, n.lv), lack: campUpCheck(b).lack.map(x => x[0] + ' ' + Math.round(x[1]) + '/' + x[2]) }; }
  return { rows, ev, next };
})()`);
const first = {};
for (const e of r.ev) if (!(`${e.b}${e.lv}` in first)) first[`${e.b}${e.lv}`] = e.t;
const last = r.rows[r.rows.length - 1];
const out = {
  cfg: { SEC, NS, MIN, SEED: +(process.env.SEED || 20261115), CRAFT, SINK, OUT, RC, OVR: process.env.OVR || '' },
  spm: +(last.soulIn / MIN).toFixed(1),
  t: Object.fromEntries(Object.entries(first).map(([k, v]) => [k, +(v / 60).toFixed(2)]))
};
const ci = process.argv.findIndex(x => x.endsWith('.csv'));
if (ci > 0) {
  const MK = ['iron', 'hide', 'silk'];
  const H = ['分', '第幾個地點', '怪物Lv', '材料階上限', '礦場產階', '靈魂庫存', '累計靈魂收入', '累計靈魂花費', '木', ...MK.flatMap(m => [1, 2, 3, 4].map(T => m + 'T' + T)),
    '累計生鐵產量', '累計生鐵_營地原表用量', '累計生鐵_C用量', '累計生鐵_產生器用量', '累計生鐵_打造淨用量', '低階鐵', '低階皮', '低階絲', '累計5換1得到', '累計低階換蛻變石', '蛻變石庫存', '有感保底次數', '鍛瞭斥民祭倉', '林礦獵絲', '輪數'];
  const L = [H.join(',')];
  for (const x of r.rows)
    L.push([x.min, x.node, x.lv, x.cap, x.ironT, x.soul, x.soulIn, x.soulSpent, x.wood, ...MK.flatMap(m => [1, 2, 3, 4].map(T => x.st[m + T])),
      x.prodI1, x.campUse['iron:1'] || 0, Object.values(x.sinkUse).reduce((a, b) => a + b, 0), x.genUse['iron:1'] || 0, x.craftNet['iron:1'] || 0, x.lowI, x.lowH, x.lowS,
      Object.values(x.trade).reduce((a, b) => a + b, 0), x.tranTrade, x.tran, x.feel, x.camp, x.gen, x.rounds].join(','));
  L.push('', '設施,等級,秒,分,靈魂費用,木費用,原表材料,C生鐵,買完剩靈魂');
  const NM = { forge: '鍛造台', watch: '瞭望台', scout: '斥候營', house: '民房', altar: '祭壇', store: '倉房' };
  for (const e of r.ev) L.push([NM[e.b], e.lv, e.t, (e.t / 60).toFixed(2), e.soul, e.wood, '"' + JSON.stringify(e.iron).replace(/"/g, "'") + '"', e.cx, e.left].join(','));
  fs.writeFileSync(process.argv[ci], L.join('\n') + '\n');
}
const ji = process.argv.findIndex(x => x.endsWith('.json'));
if (ji > 0) fs.writeFileSync(process.argv[ji], JSON.stringify({ ...out, rows: r.rows, ev: r.ev, next: r.next }));
console.log(JSON.stringify(out));
