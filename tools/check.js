/* dungeonPOE 0.2 · 固定檢查：在 Node 載入 data.js＋items.js，檢查裝備產生、數值、格子背包。有 ❌ 結束碼 1 */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const ctx = { console, Math, Date, JSON, Object, Array, location: { search: '' }, URLSearchParams };
vm.createContext(ctx);
for (const f of ['data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'mech.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
const G = vm.runInContext(
  '({ BASES, BASEI, KINDS, AFF, EQS, eqTakes, offOK, SOCK_MAX, SHARDS, FORGE, forgeCheck, forgeDo, temperDo, tierRange, affPct, decompDo, newMat, gemUp, drillDo, soulCost, TMAX, MOBS, BOSSES, SKILLS, SUPPORTS, PTREE, PT_START, mkItem, mkGem, dropItem, dropGem, itemSize, stats, dps, gridAuto, sellPrice, bestTier, tierRange, affText, itemName })',
  ctx
);
let bad = 0;
const ok = (name, cond, info = '') => {
  console.log((cond ? '✅ ' : '❌ ') + name + (cond ? '' : ' ' + info));
  if (!cond) bad++;
};
/* 1. 圖都在：底材、怪物、王 */
const art = fs.readFileSync(path.join(__dirname, '..', 'js', 'art.js'), 'utf8'),
  has = n => new RegExp(`^\\s*'?${n}'?:`, 'm').test(art);
const miss = [...G.BASES.map(b => b.ic), ...Object.values(G.MOBS).map(m => m.sp), ...G.BOSSES.map(b => b.sp)].filter(
  n => !has(n)
);
ok('底材、怪物、王的圖都在', !miss.length, miss.join(','));
ok(
  '底材種類都有裝備欄',
  G.BASES.every(b => G.KINDS[b.k] && G.EQS.some(e => G.eqTakes(e, b.k)))
);
/* 0.2.6：底材三層的範圍、雙手武器與箭袋的規則 */
{
  const bad = [];
  for (let i = 0; i < 3000; i++) {
    const it = G.dropItem(1 + (i % 16), 0.5),
      k = G.BASEI[it.b].k;
    if (!(it.q >= 0 && it.q <= 0.4)) bad.push('品質 ' + it.q);
    if (it.q >= 0.35 && it.L < 10) bad.push('階級 ' + it.L + ' 出了 ' + it.q);
    if (!(it.so >= 0 && it.so <= G.SOCK_MAX[k])) bad.push(k + ' 孔 ' + it.so);
    if (!(it.pot >= 3 && it.pot <= 10)) bad.push('潛能 ' + it.pot);
  }
  ok('品質 0～40%（35% 以上只在階級 10 以上）、孔數不超過上限、潛能 3～10', !bad.length, bad.slice(0, 4).join('、'));
  const mk = id => G.mkItem(id, 10, 0),
    rules = [
      [mk('w_sword2_0'), mk('s_wood'), false],
      [mk('w_sword1_0'), mk('s_wood'), true],
      [mk('w_bow_0'), mk('q_bamboo'), true],
      [mk('w_sword1_0'), mk('q_bamboo'), false],
      [mk('w_bow_0'), mk('s_wood'), false],
      [mk('w_wand_0'), mk('f_orb'), true],
      [mk('w_mace1_0'), mk('f_orb'), false],
      [mk('w_mace1_0'), mk('w_sceptre_0'), true],
      [mk('w_sceptre_0'), mk('w_sceptre_1'), false],
      [mk('w_dagger_0'), mk('w_dagger_2'), true],
      [mk('w_dagger_0'), mk('w_claw_0'), false],
      [mk('w_mace1_0'), mk('w_mace1_1'), false],
      [mk('w_spear_0'), mk('s_wood'), true]
    ].filter(([w, o, want]) => G.offOK(w, o) !== want);
  /* 每種武器都拿一次：所有數值都要是數字（新武器種類查不到天賦加成會變 NaN） */
  const nan = [];
  for (const B of G.BASES.filter(b => b.k === 'weapon')) {
    const s = { lv: 20, eq: Object.fromEntries(G.EQS.map(e => [e.k, null])), pt: [], at: [], auras: [] };
    s.eq.weapon = G.mkItem(B.id, 10, 2);
    const o = G.stats(s),
      badK = Object.keys(o).filter(k => typeof o[k] === 'number' && !Number.isFinite(o[k]));
    if (badK.length || o.dmg.some(v => !Number.isFinite(v))) nan.push(B.n + '：' + badK.join(','));
  }
  ok('每種武器的數值都不是 NaN', !nan.length, nan.join('；'));
  /* 0.2.6 鍛造：材料給滿，隨機鍛造 2000 次 */
  vm.runInContext('var S = { gold: 1e12, lv: 60, mat: null, lib: [] }', ctx);
  vm.runInContext(
    'S.mat = newMat(); S.mat.dust = 1e9; for (const k in S.mat.sh) S.mat.sh[k] = 1e6; S.mat.soul = 1e12; S.mat.drill = [99, 99, 99];',
    ctx
  );
  const fbad = [],
    ops = Object.keys(G.FORGE);
  let done = 0;
  for (let i = 0; i < 2000; i++) {
    const it = G.dropItem(1 + (i % 16), 0.6);
    it.pot = 10;
    const op = ops[i % ops.length],
      cls = G.SHARDS[i % 8].k,
      before = it.a.slice(),
      p0 = it.pot,
      err = G.forgeDo(it, op, cls);
    if (err) continue;
    done++;
    const add = it.a.filter(a => !before.includes(a)),
      np = it.a.filter(a => G.AFF[a.k].p).length,
      cap = it.r === 2 ? 3 : 1;
    if (add.some(a => a.T < 2)) fbad.push(op + ' 做出 T1');
    if (it.a.length > (it.r === 2 ? 6 : 2) || np > cap || it.a.length - np > cap) fbad.push(op + ' 超過條數');
    if (new Set(it.a.map(a => a.k)).size !== it.a.length) fbad.push(op + ' 重複的詞');
    if (it.pot !== p0 - G.FORGE[op].pot) fbad.push(op + ' 潛能沒扣');
    const tiers = it.a.map(a => a.T).join();
    if (
      !G.temperDo(it, null) &&
      (it.a.map(a => a.T).join() !== tiers || it.a.some(a => G.affPct(a) < 0 || G.affPct(a) > 1))
    )
      fbad.push('淬鍊改到階級或超出範圍');
  }
  ok(
    `鍛造 ${done} 次：沒有做出 T1、不超過條數、不重複、潛能有扣；淬鍊不改階級`,
    done > 500 && !fbad.length,
    [...new Set(fbad)].slice(0, 4).join('、') || done
  );
  /* 藍裝（後綴已經用掉）強化成黃：還能加後綴（照強化之後的上限） */
  const blue = G.mkItem('c_leather', 10, 0);
  blue.r = 1;
  blue.a = [{ k: 'resF', T: 8, v: 20 }];
  blue.pot = 5;
  ok(
    '藍裝後綴滿了也能「強化」加抗性（照黃裝的上限）',
    !G.forgeDo(blue, 'enhance', 'res') && blue.r === 2 && blue.a.length === 2
  );
  const g = G.mkGem('fireball', 1);
  let up = 0;
  while (!G.gemUp(g)) up++;
  let dr = 0;
  while (!G.drillDo(g)) dr++;
  ok(
    '寶石：靈魂升到 20 級為止、開孔開到 5 孔為止',
    g.lv === 20 && up === 19 && g.so === 5 && g.sup.length === 5 && dr === 3,
    `Lv ${g.lv}、${g.so} 孔`
  );
  ok('雙手武器不能拿副手、箭袋只有弓能用', !rules.length, rules.map(([w, o]) => w.b + '+' + o.b).join('、'));
}
/* 2. 產生 3000 件：詞綴數、前後綴上限、不重複、數值在那一階的範圍 */
const err = [];
for (let i = 0; i < 3000; i++) {
  const L = 1 + (i % G.TMAX),
    it = G.dropItem(L, (i % 5) / 4),
    n = it.a.length,
    np = it.a.filter(a => G.AFF[a.k].p).length;
  if (it.r === 0 && n) err.push('普通有詞綴');
  if (it.r === 1 && (n < 1 || n > 2 || np > 1 || n - np > 1)) err.push('魔法詞綴數 ' + n);
  if (it.r === 2 && (n < 3 || n > 6 || np > 3 || n - np > 3)) err.push('稀有詞綴數 ' + n);
  if (new Set(it.a.map(a => a.k)).size !== n) err.push('詞綴重複');
  for (const a of it.a) {
    if (a.T < G.bestTier(L) || a.T > 12) err.push(`階級超出 T${a.T} L${L}`);
    const [lo, hi] = G.tierRange(a.k, a.T),
      v = Array.isArray(a.v) ? a.v[1] : a.v;
    if (v < lo || v > hi) err.push(`數值超出 ${a.k} ${v}`);
    const Bb = G.BASES.find(b => b.id === it.b);
    if (!(Bb.aff || G.KINDS[Bb.k].aff).includes(a.k)) err.push('不該出現的詞綴 ' + a.k);
  }
  if (!(G.sellPrice(it) > 0)) err.push('賣價');
  if (!G.itemName(it) || it.a.some(a => G.affText(a).includes('{}'))) err.push('文字');
}
ok('3000 件裝備的稀有度、詞綴、數值範圍', !err.length, [...new Set(err)].slice(0, 5).join('；'));
/* 3. 全身穿滿的數值沒有 NaN */
let nan = 0;
for (let i = 0; i < 300; i++) {
  const s = { lv: 1 + (i % 60), eq: {} };
  for (const e of G.EQS) {
    const pool = G.BASES.filter(b => b.k === e.t);
    s.eq[e.k] = Math.random() < 0.8 ? G.mkItem(pool[i % pool.length].id, 1 + (i % 16), i % 3) : null;
  }
  const o = G.stats(s),
    vals = [o.hp, o.mp, o.dmg[0], o.dmg[1], o.aps, o.crit, o.armor, o.spd, G.dps(o), ...Object.values(o.res)];
  if (vals.some(v => !Number.isFinite(v))) nan++;
}
ok('300 套全身裝備的數值沒有 NaN', !nan, nan + ' 套');
/* 4. 格子背包：自動擺放不重疊、不出界 */
let over = 0;
for (let k = 0; k < 50; k++) {
  const g = { w: 12, h: 5, items: [] };
  for (let i = 0; i < 40; i++) G.gridAuto(g, G.dropItem(8, 0.5));
  for (const a of g.items) {
    const [w, h] = G.itemSize(a);
    if (a.x < 0 || a.y < 0 || a.x + w > g.w || a.y + h > g.h) over++;
    for (const b of g.items) {
      if (a === b) continue;
      const [bw, bh] = G.itemSize(b);
      if (a.x < b.x + bw && b.x < a.x + w && a.y < b.y + bh && b.y < a.y + h) over++;
    }
  }
}
ok('格子背包自動擺放不重疊、不出界', !over, over + ' 處');
/* 5. 技能寶石、天賦樹、核心樹 */
const miss2 = [...Object.values(G.SKILLS), ...Object.values(G.SUPPORTS), ...G.PTREE.N]
  .map(x => x.ic)
  .filter(n => n && !has(n));
ok('技能、輔助、天賦的圖示都在', !miss2.length, [...new Set(miss2)].join(','));
{
  const T = G.PTREE,
    bad = T.E.flat().filter(id => !T.I[id]),
    seen = new Set(G.PT_START),
    q = [...G.PT_START];
  while (q.length) for (const o of T.ADJ[q.pop()] || []) if (!seen.has(o)) seen.add(o), q.push(o);
  ok(
    `天賦樹 ${T.N.length} 個點，每個都從起點連得到`,
    T.N.length >= 1000 && !bad.length && seen.size === T.N.length,
    `${seen.size}/${T.N.length}`
  );
}
{
  const T = G.PTREE;
  let close = 0;
  for (let i = 0; i < T.N.length; i++)
    for (let j = i + 1; j < T.N.length; j++) if (Math.hypot(T.N[i].x - T.N[j].x, T.N[i].y - T.N[j].y) < 30) close++;
  ok('天賦樹的點沒有疊在一起', !close, close + ' 組');
}
{
  /* 0.2.22 結構驗收（docs/PoE天賦結構.md 5.6）：叢集大小、死路比例、大點在最裡面、同一條詞連續塊、
     同主題叢集的距離、起點到大點的步數、幹道是十字路口；12 個基石各只連 1 條線、15 種武器都有專精、大點全部手寫 */
  const T = G.PTREE,
    TH = vm.runInContext('PT_THEME', ctx),
    A = T.ADJ,
    cid = n => (/^k\d/.test(n.id) ? n.id.split('_')[0] : null),
    bfs = src => {
      const d = {},
        q = [...src];
      src.forEach(s => (d[s] = 0));
      for (let h = 0; h < q.length; h++)
        for (const b of A[q[h]] || []) if (d[b] === undefined) (d[b] = d[q[h]] + 1), q.push(b);
      return d;
    },
    D = bfs(G.PT_START),
    C = {};
  for (const n of T.N) if (cid(n)) (C[cid(n)] = C[cid(n)] || []).push(n);
  const cl = Object.keys(C),
    nts = T.N.filter(n => n.big === 1 && !n.gate);
  let sm = 0,
    dead = 0,
    far = 0;
  for (const c of cl) {
    const ns = C[c],
      set = new Set(ns.map(n => n.id)),
      ent = ns.filter(n => A[n.id].some(b => !set.has(b))).length,
      maxS = Math.max(...ns.filter(n => !n.big).map(n => D[n.id]));
    sm += ns.filter(n => !n.big).length;
    if (ent === 1) dead++;
    far += ns.filter(n => n.big && D[n.id] >= maxS).length;
  }
  /* 連續塊照「詞」算：同主題但不同詞（副詞）、轉折大點（tt）都會切斷 */
  const tag = n => n.tt ?? (n.big ? n.th : n.th + ':' + Object.keys(n.s)[0]),
    seen = new Set(),
    runs = [];
  for (const n of T.N) {
    if (seen.has(n.id) || !cid(n)) continue;
    let k = 0;
    const q = [n.id];
    seen.add(n.id);
    while (q.length) {
      k++;
      for (const b of A[q.pop()]) if (!seen.has(b) && cid(T.I[b]) && tag(T.I[b]) === tag(n)) seen.add(b), q.push(b);
    }
    runs.push(k);
  }
  runs.sort((x, y) => x - y);
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length,
    thC = c => C[c][0].th,
    nearS = [];
  for (const c of cl) {
    const d = bfs(C[c].map(n => n.id));
    let best = 1e9;
    for (const o of cl) if (o !== c && thC(o) === thC(c)) for (const n of C[o]) best = Math.min(best, d[n.id]);
    if (best < 1e9) nearS.push(best);
  }
  const nd = nts.map(n => D[n.id]).sort((x, y) => x - y),
    vd = T.N.filter(n => /^v\d/.test(n.id)).map(n => A[n.id].length),
    ks = T.N.filter(n => n.big === 2),
    wp = TH.filter((t, i) => t.wp && !cl.some(c => thC(c) === i)).map(t => t.n),
    auto = nts.filter(n => n.auto).length;
  ok(
    `天賦樹 ${cl.length} 個叢集，平均 ${(sm / cl.length).toFixed(2)} 小＋${(nts.length / cl.length).toFixed(2)} 大（3～4.2、1.3～1.5）`,
    sm / cl.length >= 3 && sm / cl.length <= 4.2 && nts.length / cl.length >= 1.3 && nts.length / cl.length <= 1.5
  );
  ok(
    `死路叢集 ${Math.round((100 * dead) / cl.length)}%（55～70%）`,
    dead / cl.length >= 0.55 && dead / cl.length <= 0.7
  );
  ok(`大點在叢集最裡面 ${Math.round((100 * far) / nts.length)}%（≥ 75%）`, far / nts.length >= 0.75);
  ok(
    `同一條詞連續塊：平均 ${avg(runs).toFixed(2)}、90% ${runs[Math.floor(runs.length * 0.9)]}、最多 ${runs.at(-1)}（≤ 3、≤ 6、≤ 12）`,
    avg(runs) <= 3 && runs[Math.floor(runs.length * 0.9)] <= 6 && runs.at(-1) <= 12
  );
  ok(
    `到最近的同主題叢集平均 ${avg(nearS).toFixed(1)} 步、2 步內 ${nearS.filter(x => x <= 2).length} 個（≥ 5、≤ 15%）`,
    avg(nearS) >= 5 && nearS.filter(x => x <= 2).length <= nearS.length * 0.15
  );
  ok(
    `起點到大點：最近 ${nd[0]}、第 10 近 ${nd[9]}、最遠 ${nd.at(-1)} 步（4～5、≤ 10、≤ 24）`,
    nd[0] >= 4 && nd[0] <= 5 && nd[9] <= 10 && nd.at(-1) <= 24
  );
  ok(`幹道頂點平均連 ${avg(vd).toFixed(1)} 條（4～6）`, avg(vd) >= 4 && avg(vd) <= 6);
  ok('12 個基石、各只連 1 條線', ks.length === 12 && ks.every(n => A[n.id].length === 1), ks.length);
  ok('15 種武器都有專精叢集', !wp.length, wp.join(','));
  ok(
    `大點全部手寫（${nts.length} 個，名字不重複）`,
    !auto && new Set(nts.map(n => n.n)).size === nts.length,
    `${auto} 個是產生的`
  );
}
{
  const full = { lv: 100, eq: {}, pt: G.PTREE.N.map(n => n.id) },
    o = G.stats(full),
    vals = [
      o.hp,
      o.mp,
      o.mpReg,
      o.cdr,
      o.dmgA,
      o.eleP,
      o.meleeP,
      o.dmg[0],
      o.aps,
      o.crit,
      o.critM,
      o.spd,
      G.dps(o),
      ...Object.values(o.res)
    ];
  ok('天賦全點滿：數值沒有 NaN', vals.every(Number.isFinite), JSON.stringify(vals));
}
const gems = Array.from({ length: 200 }, (_, i) => G.dropGem(1 + (i % 16)));
ok(
  '寶石掉落：等級 1～20、大小 1×1、有名字',
  gems.every(g => g.lv >= 1 && g.lv <= 20 && G.itemSize(g).join() === '1,1' && G.itemName(g))
);
/* 0.2.7 底層（企劃書 7.2） */
const B = s => vm.runInContext(s, ctx);
ok(
  '等級與懲罰：第 16 階怪物 Lv83、抗性 −60%；Lv100 有 119 天賦點、Lv300 有 139 點',
  B('mobLv(16)') === 83 &&
    B('resPen(83)') === 60 &&
    B('resPen(10)') === 0 &&
    B('ptPoints(100)') === 119 &&
    B('ptPoints(300)') === 139
);
vm.runInContext(
  `var G = { t: 0, mapT: 16, scene: 'map', mobs: [] }, P = { x: 0, y: 0, hp: 100, es: 0 };
   var dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
   S = { lv: 90, eq: {}, pt: [...PT_START], asc: null, at: [], auras: [], charms: [] }; ST = stats(S);
   var mob = { D: MOBS.fire, x: 50, y: 0, hp: 1000, mhp: 1000, el: 'fire' }; mobDef(mob, 16);`,
  ctx
);
const hits = Array.from({ length: 300 }, () =>
  B('hitCalc(BASEC2 = { D: SKILLS.fireball, lv: 20, mult: 1, more: 1 }, mob)')
);
ok(
  '擊中傷害：法術有數字、同屬性怪抗 40%、沒有 NaN',
  hits.every(h => Number.isFinite(h.d) && h.d > 0) && B('mob.res.fire') === 40 && B('resOf(mob, "fire", 100)') === 0
);
ok('抗性：沒堆抗性在第 16 階是 −60%，上限是最大抗性', B("effRes('fire')") === -60 && B('ST.maxRes.fire') === 75);
const cards = Array.from({ length: 2000 }, () => B('rollCard()'));
ok(
  '地圖卡：詞綴數照星級（1★ 1～3、5★ 13～15）、同組不重複、1～2★ 沒有致命詞',
  cards.every(c => {
    const [lo, hi] = B('STARS')[c.star].n,
      M = B('MAPMOD'),
      g = new Set(c.mods.map(k => M[k].g));
    return (
      c.mods.length >= lo &&
      c.mods.length <= hi &&
      g.size === c.mods.length &&
      (c.star > 2 || c.mods.every(k => M[k].d <= 2))
    );
  }) &&
    B('cardsOpen({ maxT: 1 })') === 3 &&
    B('cardsOpen({ maxT: 16 })') === 8 &&
    B('mapCost(16, 5)') === 23
);
/* 0.2.10 技能用的底層新機制（企劃書 7.3、mech.js） */
vm.runInContext(
  `G = { t: 0, mapT: 5, scene: 'map', mobs: [] }; P = { x: 0, y: 0, hp: 100, mp: 100 };
   var fx = () => {}, fxs = () => {}, num = () => {}, sfx = () => {}, isWall = () => false;
   mechEnter();`,
  ctx
);
{
  const R = s => vm.runInContext(s, ctx);
  /* 連擊數：每次出手最多 +1，8 秒沒加就歸零；段數：1 秒內再按進下一段 */
  R('var a1 = {}, a2 = {}; comboHit(a1); comboHit(a1); comboHit(a2);');
  const c2 = R('comboN()');
  R('G.t = 9');
  const c0 = R('comboN()');
  const st = R(
    '[nextStage("x"), (G.t += 0.5, nextStage("x")), (G.t += 0.5, nextStage("x")), (G.t += 0.5, nextStage("x")), (G.t += 2, nextStage("x"))]'
  );
  ok('連擊數與段數', c2 === 2 && c0 === 0 && st.join() === '0,1,2,0,0', `${c2} ${c0} ${st}`);
  /* 彈藥：3 發打完裝填 1 秒，裝填時不能射 */
  const am = R(
    'G.t = 0; [ammoUse("k", 3, 1), ammoUse("k", 3, 1), ammoUse("k", 3, 1), ammoUse("k", 3, 1), (G.t = 1.1, ammoUse("k", 3, 1))]'
  );
  /* 手雷次數：2 顆，各自冷卻 */
  const gr = R(
    'G.t = 0; [grenadeReady("g", 2, 3), grenadeReady("g", 2, 3), grenadeReady("g", 2, 3), (G.t = 3.1, grenadeReady("g", 2, 3))]'
  );
  ok(
    '彈藥與手雷次數',
    am.join() === 'true,true,true,false,true' && gr.join() === 'true,true,false,true',
    am + ' ' + gr
  );
  /* 收割：有才消耗、消耗後就沒了；碾壓一擊 */
  const hv = R(`var m = { x: 0, y: 0, r: 10, mhp: 100, ail: { frozen: 5, hs: 50 } };
    [takeState(m, 'frozen'), takeState(m, 'frozen'), hasState(m, 'primed'), crush(m), hasState(m, 'primed'), m.ail.hstun > G.t]`);
  ok('收割與碾壓一擊', hv.join() === 'true,false,true,true,false,true', hv.join());
  /* 灌注：撿殘留物 +1（最多 3），消耗 −1 */
  const inf = R(`G.t = 0; for (let i = 0; i < 5; i++) dropRemnant('fire', 0, 0), remnantTick();
    [infN('fire'), takeInf('fire'), infN('fire'), takeInf('cold')]`);
  ok('灌注', inf.join() === '3,true,2,false', inf.join());
  /* 飛劍：最多 10 把、15 秒 */
  const sw = R('P.x = 0; gainSwords(7, {}); gainSwords(7, {}); var n1 = swordN(); G.t += 16; [n1, swordN()]');
  ok('飛劍上限與時間', sw.join() === '10,0', sw.join());
}
process.exit(bad ? 1 : 0);
