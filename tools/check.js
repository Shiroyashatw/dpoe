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
  '({ BASES, BASEI, KINDS, AFF, EQS, eqTakes, offOK, SOCK_MAX, ACLS, FORGE, forgeCheck, forgeDo, temperDo, tierRange, affPct, newMat, gemUp, drillDo, soulCost, TMAX, MOBS, BOSSES, SKILLS, SUPPORTS, PTREE, PT_START, mkItem, mkGem, dropItem, itemSize, stats, dps, gridAuto, sellPrice, bestTier, tierRange, affText, itemName })',
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
    'S.mat = newMat(); S.mat.dust = S.mat.fine = S.mat.rare = 1e9; S.mat.soul = 1e12; S.mat.drill = [99, 99, 99];',
    ctx
  );
  const fbad = [],
    ops = Object.keys(G.FORGE);
  let done = 0;
  for (let i = 0; i < 2000; i++) {
    const it = G.dropItem(1 + (i % 16), 0.6);
    it.pot = 10;
    const op = ops[i % ops.length],
      cls = G.ACLS[i % 8].k,
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
/* 0.2.25 昇華：每個昇華點得成 4 大 4 小、選擇組只能拿一個、照規則亂點一定停在 4 大 4 小、全點滿沒有 NaN */
{
  const R = s => vm.runInContext(s, ctx),
    ASC = R('ASC');
  ok(
    '昇華點：一開始 2 點，第一次打倒階級 6、12、16 的王各 +2',
    R('ascPoints({ maxT: 1 })') === 2 &&
      R('ascPoints({ maxT: 7 })') === 4 &&
      R('ascPoints({ maxT: 13 })') === 6 &&
      R('ascPoints({ maxT: 16, t16: 1 })') === 8
  );
  for (const k of Object.keys(ASC)) {
    const T = R(`ascNodes('${k}')`),
      big = id => T.I[id].big === 1,
      can = set => id =>
        !set.includes(id) && (T.ADJ[id] || []).some(o => set.includes(o)) && R('ascFeasible')(T, [...set, id]);
    /* 起點都連得到、圖示都在、大點都有說明 */
    const seen = new Set(['a_st']),
      q = ['a_st'];
    while (q.length) for (const o of T.ADJ[q.pop()] || []) if (!seen.has(o)) seen.add(o), q.push(o);
    const noIc = T.N.filter(n => n.big && !has(n.ic)).map(n => n.n);
    ok(
      `昇華「${ASC[k].n}」${T.N.length} 個點都連得到、大點有圖示與說明`,
      seen.size === T.N.length && !noIc.length && T.N.filter(n => n.big === 1).every(n => n.d),
      noIc.join(',')
    );
    /* 一小一大（照 PoE）：從起點往外，起點的下一個是小點、小點後面只接大點、大點後面只接小點 */
    const dep = { a_st: 0 },
      bq = ['a_st'];
    while (bq.length) {
      const x = bq.shift();
      for (const o of T.ADJ[x] || []) if (dep[o] == null) (dep[o] = dep[x] + 1), bq.push(o);
    }
    const altBad = T.E.map(([a, b]) => (dep[a] < dep[b] ? [a, b] : [b, a]))
      .filter(([a, b]) => (a === 'a_st' ? big(b) : big(a) === big(b)))
      .map(e => e.join('-'));
    ok(`昇華「${ASC[k].n}」一小一大交錯：每個大點前面是自己的小點、小點後面只接大點`, !altBad.length, altBad.join(','));
    /* 所有合法的 8 點組合：沒有哪個點是每一種都一定要拿的 */
    const all = [],
      seen8 = new Set(),
      walk = set => {
        const key = [...set].sort().join();
        if (seen8.has(key)) return;
        seen8.add(key);
        if (set.length === 9) return all.push(set);
        for (const id of T.N.map(n => n.id).filter(can(set))) walk([...set, id]);
      };
    walk(['a_st']);
    const forced = T.N.filter(n => n.id !== 'a_st' && all.every(set => set.includes(n.id))).map(n => n.n + n.id);
    ok(
      `昇華「${ASC[k].n}」${all.length} 種合法的 8 點組合，沒有每一種都一定要拿的點`,
      all.length > 1 && !forced.length,
      forced.join(',')
    );
    /* 照規則亂點 2000 次：每一步都有點可以點、最後剛好 4 大 4 小、同一組只拿一個 */
    let stuck = 0,
      wrong = 0;
    const ends = new Set();
    for (let i = 0; i < 2000; i++) {
      const set = ['a_st'];
      while (set.length < 9) {
        const c = T.N.map(n => n.id).filter(can(set));
        if (!c.length) {
          stuck++;
          break;
        }
        set.push(c[Math.floor(Math.random() * c.length)]);
      }
      const nb = set.filter(big).length,
        ns = set.length - 1 - nb,
        g = set.map(id => T.I[id].g).filter(Boolean);
      if (nb !== 4 || ns !== 4 || new Set(g).size !== g.length) wrong++;
      ends.add(set.filter(big).sort().join());
    }
    ok(
      `昇華「${ASC[k].n}」照規則亂點 2000 次都停在 4 大 4 小、選擇組只拿一個（${ends.size} 種大點組合）`,
      !stuck && !wrong && ends.size >= 4,
      `卡住 ${stuck}、不對 ${wrong}`
    );
    /* 5 大 3 小點不出來：手動試「大點優先」也會被擋 */
    const bigFirst = ['a_st'];
    for (let i = 0; i < 8; i++) {
      const c = T.N.map(n => n.id).filter(can(bigFirst));
      bigFirst.push(c.find(big) || c[0]);
    }
    ok(
      `昇華「${ASC[k].n}」大點優先也點不出 5 大 3 小`,
      bigFirst.filter(big).length === 4 &&
        !R('ascFeasible')(T, ['a_st', ...T.N.filter(n => n.big === 1).map(n => n.id)])
    );
    /* 全點滿（不管規則）＋錘盾、弓兩套：數值沒有 NaN */
    for (const eq of [
      { weapon: G.mkItem('w_mace1_5', 16, 2), off: G.mkItem('s_tower', 16, 2) },
      { weapon: G.mkItem('w_bow_5', 16, 2) }
    ]) {
      const o = G.stats({ lv: 90, eq, pt: G.PTREE.N.map(n => n.id), asc: k, at: T.N.map(n => n.id) }),
        vals = [o.hp, o.armor, o.ev, o.bv, o.block, o.dmg[0], o.aps, o.crit, o.spd, G.dps(o), ...Object.values(o.res)];
      ok(
        `昇華「${ASC[k].n}」全點滿（${eq.off ? '錘＋盾' : '弓'}）數值沒有 NaN`,
        vals.every(Number.isFinite),
        JSON.stringify(vals)
      );
    }
  }
  /* 底層：格擋值、暴擊弱點、熵值、投射物飛行距離 */
  R(`G = { t: 0, mapT: 16, scene: 'map', mobs: [] };
     S = { lv: 90, eq: { weapon: mkItem('w_mace1_5', 16, 0), off: mkItem('s_tower', 16, 0) }, pt: [...PT_START], asc: null, at: [], auras: [], charms: [] };
     ST = stats(S); P = { x: 0, y: 0, hp: ST.hp, es: 0, bv: ST.bv };`);
  const bv0 = R('ST.bv'),
    left = R('bvAbsorb(100)'),
    bv1 = R('P.bv');
  R('bvAbsorb(1e9)');
  const br = [R('P.bv'), R('P.bvRe'), R('bvAbsorb(100)')];
  R('G.t = 4; bvTick(0)');
  const half = R('P.bv / ST.bv');
  R('G.t = 8.1; bvTick(0)');
  const full = [R('P.bv === ST.bv'), R('P.bvRe')];
  R('P.bv = ST.bv / 2; P.bvHit = G.t; G.t += 1; bvTick(1)');
  const wait = R('P.bv / ST.bv');
  R('G.t += 1.5; bvTick(1)');
  const regen = R('P.bv / ST.bv');
  ok(
    '格擋值：拿盾就有、吸收 40%、碎了 8 秒從 0 跑滿（跑滿前不吸收）、2 秒沒被打每秒回 25%',
    bv0 > 0 &&
      left === 60 &&
      bv1 === bv0 - 40 &&
      br.join() === '0,0,100' &&
      Math.abs(half - 0.5) < 0.01 &&
      full.join() === 'true,' &&
      wait === 0.5 &&
      Math.abs(regen - 0.75) < 0.01,
    [bv0, left, bv1, br, half, full, wait, regen].join(' ')
  );
  R('var m2 = { ail: {} }; addCw(m2, 10); addCw(m2, 15);');
  const cw = [R('cwN(m2)')];
  R('G.t += 4.1');
  cw.push(R('cwN(m2)'));
  const ent = Array.from({ length: 10 }, () => R("entropy('t', 20)")).filter(Boolean).length;
  R('ST.farShot = 30; ST.nearShot = 0');
  const far = [R('projDistMore(0)'), R('projDistMore(250)'), R('projDistMore(900)')];
  R('ST.farShot = 0; ST.nearShot = 30');
  const near = [R('projDistMore(0)'), R('projDistMore(150)'), R('projDistMore(300)')];
  ok(
    '暴擊弱點最多 20 層、4 秒；熵值每 5 次 +20 必定觸發 2 次／10 次；遠射、近射的更多照飛行距離',
    cw.join() === '20,0' && ent === 2 && far.join() === '1,1.15,1.3' && near.join() === '1.3,1.15,1',
    [cw, ent, far, near].join(' ')
  );
}
/* 0.2.26 底層：地獄火、承受轉換、完美閃避判定時間、暴擊弱點上限 40 */
{
  const R = s => vm.runInContext(s, ctx);
  R(`var esAbsorb = d => d, die = () => {};
     G = { t: 0, mapT: 16, scene: 'map', mobs: [] };
     S = { lv: 90, eq: {}, pt: [...PT_START], asc: 'hell', at: ['a_st', 'a_s1', 'a_pact', 'a_s3', 'a_lava'], auras: [], charms: [] };
     ST = stats(S); P = { x: 0, y: 0, hp: ST.hp, es: 0, mp: ST.mp, hf: 0 };`);
  const hm = R('ST.hfMax === ST.mp * 2');
  R('hfGain(ST.hfMax * 0.6)');
  const acc = R('P.hf / ST.hfMax');
  R('G.t = 1.5; hfTick(1)');
  const wait = R('P.hf / ST.hfMax');
  R('G.t = 3; hfTick(1)');
  const dec = R('P.hf / ST.hfMax');
  R('P.hp = ST.hp; hfGain(ST.hfMax)');
  const boom = [R('P.hf'), R('ST.hp - P.hp'), R("ST.hp * (1 - effRes('fire') / 100)")];
  ok(
    '地獄火：最大＝2 倍魔力、放技能累積、2 秒後每秒退 25%、滿了自爆（最大生命×（1−火抗））並清空',
    hm &&
      Math.abs(acc - 0.6) < 1e-9 &&
      Math.abs(wait - 0.6) < 1e-9 &&
      Math.abs(dec - 0.35) < 1e-9 &&
      boom[0] === 0 &&
      Math.abs(boom[1] - boom[2]) < 1e-6,
    [hm, acc, wait, dec, boom].join(' ')
  );
  /* 熔岩之膚：承受的物理 20% 當作火焰（不閃避的一下，護甲 0） */
  R('ST.armor = 0; P.evE = 0; P.ail = {}');
  const lava = R("hurtCalc(100, null, 'phys', 1).d"),
    want = R("80 + 20 * (1 - effRes('fire') / 100)");
  ok('承受轉換：熔岩之膚的物理 20% 當火焰承受（吃火焰抗性）', Math.abs(lava - want) < 1e-6, lava + ' vs ' + want);
  R("S.asc = 'shade'; S.at = ['a_st', 'a_s3', 'a_deadly', 'a_s4', 'a_hunt', 'a_s1', 'a_after']; ST = stats(S)");
  const pw = [R('perfWin()'), R('ROLL.perfect')];
  R('var m3 = { ail: {} }; addCw(m3, 30); addCw(m3, 30)');
  const cw40 = R('cwN(m3)');
  ok(
    '殘影步：完美閃避判定 0.24 秒（預設 0.16）；弱點獵殺：暴擊弱點上限 40',
    pw.join() === '0.24,0.16' && cw40 === 40,
    pw + ' ' + cw40
  );
}
/* 0.2.27 物理傷害不能走抗性（NaN＝無敵）；T1～T5 放寬；魔力回復與消耗 */
{
  const R = s => vm.runInContext(s, ctx);
  R("S.asc = null; S.at = ['a_st']; ST = stats(S); ST.armor = 100; P.evE = 0; P.ail = {}; G.scene = 'map'");
  const ph = R("hurtCalc(100, null, 'phys', 1).d"),
    el = ['fire', 'cold', 'light', 'chaos'].map(k => R(`hurtCalc(100, null, '${k}', 1).d`));
  ok(
    '玩家受傷：物理與四種元素都是有限的數字，物理只看護甲',
    [ph, ...el].every(Number.isFinite) && ph > 0 && ph < 100,
    ph + ' ' + el
  );
  const e = [1, 2, 3, 4, 5, 6, 16].map(t => +R(`tierMob(${t}).hp / tierMul(${t}).hp`).toFixed(2)),
    d = [1, 3, 4, 5, 6].map(t => +R(`tierMob(${t}).dmg / tierMul(${t}).dmg`).toFixed(2));
  ok(
    '地圖放寬：T1～T3 ×0.8、T4 ×0.87、T5 ×0.93、T6 起不變（生命、傷害一樣）',
    e.join() === '0.8,0.8,0.8,0.87,0.93,1,1' && d.join() === '0.8,0.8,0.87,0.93,1',
    e + ' / ' + d
  );
  ok(
    '魔力：每秒回最大魔力 10%；消耗 Lv1 ×0.5、Lv10 起 ×1',
    Math.abs(R('ST.mpReg / ST.mp') - 0.1) < 0.02 &&
      R('gemMpMul(1)') === 0.5 &&
      R('gemMpMul(10)') === 1 &&
      R('gemMpMul(20)') === 1,
    R('ST.mpReg / ST.mp')
  );
}
/* 0.2.28 商人：買了馬上賣不會賺、T1 不出現、品質與孔、保底、背包滿不扣錢 */
{
  const R = s => vm.runInContext(s, ctx);
  R(`var S = { maxT: 1, gold: 1e9, gamN: 0, inv: { w: 12, h: 6, items: [] } };`);
  const ids = R('GAMBLE.flatMap(g => g[1]).map(x => x.id)');
  ok('商人：15 種武器＋3 種副手＋7 種防具飾品', ids.length === 25, ids.length);
  let lose = 0,
    wrong = 0,
    t1 = 0,
    streak = 0,
    maxMiss = 0,
    rares = 0,
    n = 0;
  for (const t of [1, 4, 8, 16])
    for (const id of ids)
      for (let i = 0; i < 40; i++) {
        R(`S.maxT = ${t}; S.inv.items = []`);
        const g0 = R('S.gold'),
          ok1 = R(
            `(() => { const r = gambleDo('${id}'); return r.it ? [r.it.r, sellPrice(r.it), r.it.q, r.it.so, r.it.pot, r.it.L, Math.min(9, ...r.it.a.map(a => a.T)), baseOf(r.it).k, baseOf(r.it).wt || ''] : null; })()`
          ),
          price = g0 - R('S.gold');
        n++;
        if (!ok1) {
          wrong++;
          continue;
        }
        const [r, sell, q, so, pot, L, T, k, wt] = ok1;
        if (sell >= price) lose++;
        if (q || so || pot !== 3 || L !== t || (k !== id && wt !== id)) wrong++;
        if (T < 2) t1++;
        if (r === 2) rares++, (maxMiss = Math.max(maxMiss, streak)), (streak = 0);
        else streak++;
      }
  ok('商人：買了馬上賣都賠錢、底材對、品質 0 孔 0 潛能 3、物品等級＝最高階', !lose && !wrong, lose + ' ' + wrong);
  ok('商人：詞綴最高 T2', !t1, t1);
  ok('商人：連續 8 件沒出稀有，下一件必出', maxMiss <= 8 && maxMiss >= 5, maxMiss);
  console.log(`   稀有率 ${((rares / n) * 100).toFixed(1)}%（平均每 ${(n / rares).toFixed(1)} 件一件）`);
  R(
    `S.inv = { w: 1, h: 1, items: [] }; S.gamN = 3; var g9 = S.gold; var r9 = gambleDo('ring'); r9 = gambleDo('ring');`
  );
  ok(
    '商人：背包滿不扣錢、不算保底',
    R('r9.why') === '背包滿了' && R('g9 - S.gold') === R('gamPrice(S)') && R('S.gamN') <= 4,
    R('[r9.why, g9 - S.gold, S.gamN]')
  );
}
/* 投射物：每一招都吃多重投射（0.2.27）；自動化的規則（0.2.28）。載入 skills.js，用替身跑出手 */
{
  const c2 = { console, Math, Date, JSON, Object, Array, Set, location: { search: '' }, URLSearchParams };
  vm.createContext(c2);
  for (const f of ['data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'mech.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), c2, { filename: f });
  const R = s => vm.runInContext(s, c2);
  R(`var G = { t: 1, mapT: 1, scene: 'map', state: 'play', mobs: [], shots: [], grenades: [], units: [], ground: [], W: 2000, H: 2000 }, P = { x: 500, y: 500, cds: {}, mp: 1e4, hp: 100, ail: {} }, S, ST, TOUCH = { on: 0 };
     const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
     const num = () => {}, fx = () => {}, fxs = () => {}, sfx = () => {}, hudWarn = t => (G.warn = t), die = () => {}, los = () => true, open = () => true, floorNear = () => null;`);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'skills.js'), 'utf8'), c2, {
    filename: 'skills.js'
  });
  R(
    `S = { lv: 60, eq: {}, pt: [...PT_START], asc: null, at: ['a_st'], auras: [], charms: [], skills: [0, 1, 2, 3, 4].map(() => ({ a: null })) }; S.eq.off = mkItem(BASES.find(b => b.k === 'shield').id, 10, 0); ST = stats(S); ST.cdr = 0;`
  );
  const count = (k, multi) =>
    R(`(() => {
      G.shots = []; G.grenades = []; G.units = []; P.swords = []; P.gren = {}; P.ammo = {};
      const g = mkGem('${k}', 5); ${multi ? "g.sup[0] = mkGem('multi', 1);" : ''}
      const c = gemCfg(g, 0), D = c.D, a = { k: '${k}', c, ang: 0, tx: P.x + 200, ty: P.y, hits: [0], n: 0 };
      if (c.unit) { placeUnit(c, { x: P.x + 100, y: P.y }); unitFire(G.units[0], { x: P.x + 300, y: P.y }); }
      else actHit(a, 0);
      return G.shots.length + G.grenades.length + (P.swords || []).length;
    })()`);
  const pk = R(`Object.keys(SKILLS).filter(k => SKILLS[k].tags.includes('proj'))`),
    res = pk.map(k => [k, count(k, 0), count(k, 1)]),
    badp = res.filter(([, a, b]) => !(a >= 1 && b === a + 2));
  ok(`多重投射：${pk.length} 招投射物都多 2 發`, !badp.length, JSON.stringify(badp));
  ok(
    '散射基礎 3 支',
    res.find(x => x[0] === 'split')[1] === 3,
    res.find(x => x[0] === 'split')
  );
  const cfg = (k, lv = 5) =>
    R(
      `(() => { const g = mkGem('${k}', ${lv}); const b = gemCfg(g, 0); g.sup[0] = mkGem('autocast', 1); const c = gemCfg(g, 0); return [supOK(SKILLS['${k}'], g.sup[0], g), b.cd, c.cd, b.mp, c.mp]; })()`
    );
  const fb = cfg('fireball', 10),
    wh = cfg('whirl', 10);
  ok(
    '自動化：沒冷卻變 8 秒、原本 3 秒變 11 秒、魔力 ×1.4',
    fb[0] && fb[2] === 8 && wh[2] === 11 && fb[4] === Math.round(9 * 1.4),
    fb + ' / ' + wh
  );
  ok(
    '自動化：砲台、圖騰可以；位移、陷阱、地雷、召喚不行',
    cfg('ballista')[0] &&
      cfg('firetotem')[0] &&
      !['iai', 'frosttrap', 'blastmine', 'wolf', 'paperdoll'].some(k => cfg(k)[0])
  );
  ok(
    '自動化：品質 20% 附加冷卻 6.4 秒',
    Math.abs(
      R(
        `(() => { const g = mkGem('fireball', 5); g.sup[0] = mkGem('autocast', 1); g.sup[0].q = 20; return gemCfg(g, 0).cd; })()`
      ) - 6.4
    ) < 1e-9
  );
  const run = R(`(() => {
    const g = mkGem('fireball', 5); g.sup[0] = mkGem('autocast', 1); S.skills[0].a = g;
    G.shots = []; G.mobs = []; P.mp = 1e4; P.cds = {};
    autoTick(); const none = G.shots.length;
    G.mobs = [{ x: P.x + 300, y: P.y, hp: 10, ail: {} }];
    P.act = { k: 'x' }; autoTick(); const fired = G.shots.length, cd = P.cds.s0, act = P.act.k;
    P.act = null; autoTick(); const again = G.shots.length;
    P.cds = {}; P.mp = 0; autoTick(); const dry = G.shots.length;
    G.mobs[0].x = P.x + 600; P.mp = 1e4; autoTick(); const far = G.shots.length;
    const hand = useSlot(0);
    return [none, fired, cd, act, again, dry, far, hand];
  })()`);
  ok(
    '自動化：沒敵人不放、有敵人放且不打斷出手、冷卻中不放、沒魔力等、太遠不放、不能手動',
    run.join() === '0,1,8,x,1,1,1,false',
    run
  );
  const nums = R(
      `Object.keys(SKILLS).map(k => { const g = mkGem(k, 7), n = skillNums(gemCfg(g, 0)); return [k, n.hit, n.dps, n.unit, n.dot, n.eff]; })`
    ),
    badn = nums.filter(([k, ...v]) => v.some(x => x != null && typeof x === 'number' && !Number.isFinite(x)));
  ok('技能面板的數字沒有 NaN', !badn.length, JSON.stringify(badn));
  const nod = nums.filter(([, h, , , , ef]) => h == null && !ef).map(x => x[0]);
  console.log('   沒有傷害也沒有效果字的技能：' + nod.join('、'));
  /* 品質（0.2.29） */
  ok(
    '品質：92 顆寶石都有效果說明，沒有多的',
    R(`Object.keys({ ...SKILLS, ...SUPPORTS, ...AURAS }).every(k => QUAL[k]) && Object.keys(QUAL).length`) === 92,
    R(`Object.keys(QUAL).length`)
  );
  ok(
    '品質：說明的數字照比例換算',
    R(`[qualText('fury', 0), qualText('fury', 10), qualText('autocast', 20), qualText('fireball', 10)].join('|')`) ===
      '魔力倍率 ×1.4 降到 ×1.4|魔力倍率 ×1.4 降到 ×1.3|附加冷卻 8 秒降到 6.4 秒|爆炸處留下燃燒地面 0.75 秒',
    R(`qualText('fury', 10)`)
  );
  const qc = R(`(() => {
    S.mat = newMat(); S.mat.fine = 25;
    const a = mkGem('fireball', 1), b = mkGem('multi', 1), o = mkGem('anger', 1);
    gemQUp(a); const a1 = [a.q, S.mat.fine];
    gemQUp(b); const b1 = [b.q, S.mat.fine];
    gemQUp(a, 1); const a2 = [a.q, S.mat.fine];
    const whyFull = gemQCheck(a).why;
    gemQUp(b, 1); const b2 = [b.q, S.mat.fine];
    S.mat.fine = 3; gemQUp(o, 1); const o1 = [o.q, S.mat.fine, gemQCheck(o).why];
    return JSON.stringify([a1, b1, a2, whyFull, b2, o1]);
  })()`);
  ok(
    '品質：技能、光環 1 精粉 1%，輔助 1 精粉 2%，精粉不夠時能升多少升多少',
    qc === '[[1,24],[2,23],[20,4],"品質已滿",[10,0],[3,0,"精粉不夠"]]',
    qc
  );
  const qs = R(`(() => {
    const cf = (k, sp, lv = 5) => { const g = mkGem(k, lv); g.q = 20; const x = mkGem(sp, 1); x.q = 20; g.sup[0] = x; return gemCfg(g, 0); };
    const fb = mkGem('fireball', 10), fq = mkGem('fireball', 10); fq.q = 20;
    return JSON.stringify([cf('fireball', 'multi').fan, cf('fireball', 'fury').mp / gemCfg(mkGem('fireball', 5), 0).mp,
      cf('slash', 'bleed').ailMag, cf('fireball', 'poison').ailMag, cf('chaosbolt', 'wither').witherMax,
      gemCfg(fq, 0).mult === gemCfg(fb, 0).mult, gemCfg(fq, 0).q]);
  })()`);
  ok(
    '品質：多重投射角度減半、狂暴魔力 ×1.2、流血中毒強度 +20、凋零 18 層、品質不加技能倍率',
    /^\[0\.5,1\.\d+,20,20,18,true,1\]$/.test(qs) && Math.abs(JSON.parse(qs)[1] - 1.2) < 0.15,
    qs
  );
  /* 0.2.30 狀態圖示、鍛造預覽 */
  const si = R(`[...Object.values(STATE).map(s => s[1]), ...Object.keys(CURSES).map(curseIc)]`).filter(
    n => !art.includes(`  ${n}: [`)
  );
  ok('狀態圖示都有圖', !si.length, si.join());
  const ms = R(`(() => {
    G.t = 10;
    const m = { ail: { ign: { dps: 1, t: 20 }, bleed: { dps: 1, t: 5 }, poi: [{ dps: 1, t: 20 }], shock: 30, curse: { k: 'vuln', t: 20 }, mark: { k: 'sniper' } } };
    return mobStates(m);
  })()`);
  ok(
    '怪物狀態：只列有效的（過期的流血不列），含詛咒與標記',
    ms.length === 5 && !ms.includes(R(`STATE.bleed[1]`)),
    ms.join()
  );
  const ps = R(`(() => {
    P.ail = { ign: { dps: 1, t: 17 }, bleed: { dps: 1, t: 5 }, curse: { k: 'enfeeble', v: 25, t: 16 } };
    P.buf = { onslaught: 18 }; P.chg = {}; P.rage = 7; P.tail = 0;
    const L = playerStates().map(s => [s.k, s.t == null ? null : Math.round(s.t), s.c || 0, s.bad || 0].join(':')).join();
    P.ail = {}; P.buf = {}; P.rage = 0;
    return L;
  })()`);
  ok('玩家狀態：秒數、層數、負面都對，過期的不列', ps === 'ign:7:0:1,c:6:0:1,onslaught:8:0:0,rage::7:0', ps);
  const fw = R(`(() => {
    const it = mkItem(BASES.find(b => b.k === 'chest').id, 20, 2), c = 'life';
    const r = forgeWhat(it, 'reforge', null), add = forgeWhat({ ...it, a: [] }, 'add', null);
    it.a[0].lock = 1;
    const k = forgeWhat(it, 'reforge', null);
    return [r.all, r.out.length === it.a.length, add.add.length > 0, k.keep.length, k.out.length === it.a.length - 1, /～/.test(affRangeTxt(add.add[0], it))];
  })()`);
  ok('鍛造預覽：重鑄列出全部、鎖住的不變、可能加入有數字範圍', fw.every(Boolean), fw.join());
  /* 品質 0 時不觸發：舊存檔的寶石沒有 q，機率類的工具要回 false */
  ok('品質：機率 0 不觸發、機率 100 必中', !R('qRoll(0)') && !R('qRoll(undefined)') && R('qRoll(100)'));
}
process.exit(bad ? 1 : 0);
