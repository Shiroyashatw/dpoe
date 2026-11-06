/* dungeonPOE 0.2 · 固定檢查：在 Node 載入 data.js＋items.js，檢查裝備產生、數值、格子背包。有 ❌ 結束碼 1 */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const ctx = { console, Math, Date, JSON, Object, Array, location: { search: '' }, URLSearchParams };
vm.createContext(ctx);
for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'world.js', 'mech.js'])
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
/* 1. 圖都在：基底、怪物、王 */
const art = fs.readFileSync(path.join(__dirname, '..', 'js', 'art.js'), 'utf8'),
  has = n => new RegExp(`^\\s*'?${n}'?:`, 'm').test(art);
const miss = [...G.BASES.map(b => b.ic), ...Object.values(G.MOBS).map(m => m.sp), ...G.BOSSES.map(b => b.sp)].filter(
  n => !has(n)
);
ok('基底、怪物、王的圖都在', !miss.length, miss.join(','));
ok(
  '基底種類都有裝備欄',
  G.BASES.every(b => G.KINDS[b.k] && G.EQS.some(e => G.eqTakes(e, b.k)))
);
/* 0.2.6：基底三層的範圍、雙手武器與箭袋的規則 */
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
  ok('品質 0～40%（35% 以上只在階級 10 以上）、插槽數不超過上限、潛能 3～10', !bad.length, bad.slice(0, 4).join('、'));
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
  vm.runInContext('S.mat = newMat(); S.mat.dust = S.mat.fine = S.mat.rare = 1e9; S.mat.soul = 1e12;', ctx);
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
  blue.a = [{ k: 'resF', T: 4, v: 20 }];
  blue.pot = 5;
  ok(
    '藍裝後綴滿了也能「強化」加抗性（照黃裝的上限）',
    !G.forgeDo(blue, 'enhance', 'res') && blue.r === 2 && blue.a.length === 2
  );
  const g = G.mkGem('fireball', 1);
  let up = 0;
  while (!G.gemUp(g)) up++;
  /* 0.2.40：角色 Lv60 只能升到 14 級（Lv15 要 64），升到 90 才能到 20 */
  const why60 = G.gemUp(g);
  ok(
    '寶石等級門檻照 PoE2：角色 Lv60 停在 14 級',
    g.lv === 14 && why60 === 'Lv 15 要角色 Lv 64',
    `Lv ${g.lv}：${why60}`
  );
  vm.runInContext('S.lv = 90', ctx);
  while (!G.gemUp(g)) up++;
  vm.runInContext('S.lv = 60', ctx);
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
    if (a.T < G.bestTier(L) || a.T > 6) err.push(`階級超出 T${a.T} L${L}`);
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
  /* 不規則的網：直線不能壓到別的點（點的半徑 10）、幹道不能交叉 */
  const seg = T.E.filter(([a, b]) => !T.ARC[a + '|' + b]).map(([a, b]) => [T.I[a], T.I[b]]),
    side = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  let thru = 0,
    cross = 0;
  for (const [A, B] of seg) {
    const dx = B.x - A.x,
      dy = B.y - A.y,
      L = dx * dx + dy * dy;
    for (const n of T.N) {
      if (n === A || n === B) continue;
      const f = ((n.x - A.x) * dx + (n.y - A.y) * dy) / L;
      if (f > 0 && f < 1 && Math.hypot(n.x - A.x - dx * f, n.y - A.y - dy * f) < 10) thru++;
    }
  }
  for (let i = 0; i < seg.length; i++)
    for (let j = i + 1; j < seg.length; j++) {
      const [a, b] = seg[i],
        [c, d] = seg[j];
      if (
        a !== c &&
        a !== d &&
        b !== c &&
        b !== d &&
        side(a, b, c) * side(a, b, d) < 0 &&
        side(c, d, a) * side(c, d, b) < 0
      )
        cross++;
    }
  ok('天賦樹的線不壓到別的點、不互相交叉', !thru && !cross, `壓到 ${thru}、交叉 ${cross}`);
}
{
  /* 0.2.45 結構驗收（docs/天賦樹設計.md，數字照 PoE2）：叢集＝被能力值點切開的連通塊（跟量 PoE2 的方法一樣）；
     形狀＝烘焙工具放的一個一個形狀（點的編號 c12_3 的 c12） */
  const T = G.PTREE,
    TH = vm.runInContext('PT_THEME', ctx),
    A = T.ADJ,
    isT = n => n.gate || !!(n.s && n.s.attr) || n.big === 2,
    bfs = (src, pass = () => true) => {
      const d = {},
        q = [...src];
      src.forEach(s => (d[s] = 0));
      for (let h = 0; h < q.length; h++)
        for (const o of A[q[h]] || []) if (d[o] === undefined && pass(T.I[o])) (d[o] = d[q[h]] + 1), q.push(o);
      return d;
    },
    D = bfs(G.PT_START),
    comp = {},
    C = [];
  for (const n of T.N) {
    if (isT(n) || comp[n.id] !== undefined) continue;
    const ns = [],
      q = [n.id];
    comp[n.id] = C.length;
    while (q.length) {
      const x = q.pop();
      ns.push(T.I[x]);
      for (const o of A[x]) if (comp[o] === undefined && !isT(T.I[o])) (comp[o] = C.length), q.push(o);
    }
    C.push(ns);
  }
  const open = C.filter(ns => !ns[0].lock),
    locked = C.filter(ns => ns[0].lock),
    /* 主題叢集：不含起點模板那一串（它故意有兩種詞） */
    plain = open.filter(ns => !ns.some(n => /^s\d/.test(n.id))),
    nts = T.N.filter(n => n.big === 1 && !n.gate && !n.lock),
    hubs = ns => new Set(ns.flatMap(n => A[n.id].filter(o => isT(T.I[o])))).size,
    avg = a => a.reduce((x, y) => x + y, 0) / a.length,
    smAvg = avg(plain.map(ns => ns.filter(n => !n.big).length)),
    ntAvg = avg(plain.map(ns => ns.filter(n => n.big).length)),
    dead = plain.filter(ns => hubs(ns) === 1).length / plain.length;
  /* 大點在形狀的最裡面：離起點不比同一個形狀的任何小點近 */
  const S = {};
  for (const n of T.N) if (/^c\d/.test(n.id) && !n.lock) (S[n.id.split('_')[0]] = S[n.id.split('_')[0]] || []).push(n);
  let far = 0,
    farN = 0;
  for (const ns of Object.values(S)) {
    const maxS = Math.max(...ns.filter(n => !n.big).map(n => D[n.id]));
    for (const n of ns) if (n.big) farN++, D[n.id] >= maxS && far++;
  }
  /* 同一條詞連續塊：同主題但不同詞（複合詞算另一條）、轉折大點（tt）都會切斷 */
  const tag = n => n.tt ?? (n.big ? n.th : n.th + ':' + Object.keys(n.s).join('+')),
    seen = new Set(),
    runs = [];
  for (const n of T.N) {
    if (seen.has(n.id) || isT(n) || n.lock) continue;
    let k = 0;
    const q = [n.id];
    seen.add(n.id);
    while (q.length) {
      k++;
      for (const o of A[q.pop()])
        if (!seen.has(o) && !isT(T.I[o]) && !T.I[o].lock && tag(T.I[o]) === tag(n)) seen.add(o), q.push(o);
    }
    runs.push(k);
  }
  runs.sort((x, y) => x - y);
  const thC = ns => ns[0].th,
    nearS = [];
  for (const ns of plain) {
    const d = bfs(ns.map(n => n.id));
    let best = 1e9;
    for (const o of plain) if (o !== ns && thC(o) === thC(ns)) for (const n of o) best = Math.min(best, d[n.id]);
    if (best < 1e9) nearS.push(best);
  }
  const nd = nts.map(n => D[n.id]).sort((x, y) => x - y),
    attrs = T.N.filter(n => n.s && n.s.attr),
    ks = T.N.filter(n => n.big === 2),
    wp = TH.filter((t, i) => t.wp && !T.N.some(n => n.th === i && !n.lock && /^c\d/.test(n.id))).map(t => t.n),
    auto = nts.filter(n => n.auto).length;
  ok(
    `天賦樹 ${C.length} 個叢集（${locked.length} 個鎖住），平均 ${smAvg.toFixed(2)} 小＋${ntAvg.toFixed(2)} 大（PoE2 4.74＋1.65；4～6.5、1.3～2）`,
    smAvg >= 4 && smAvg <= 6.5 && ntAvg >= 1.3 && ntAvg <= 2
  );
  ok(`只接一個能力值點的叢集 ${Math.round(100 * dead)}%（PoE2 85%；≥ 70%）`, dead >= 0.7);
  ok(`大點在形狀最裡面 ${Math.round((100 * far) / farN)}%（≥ 70%）`, far / farN >= 0.7);
  ok(
    `同一條詞連續塊：平均 ${avg(runs).toFixed(2)}、90% ${runs[Math.floor(runs.length * 0.9)]}、最多 ${runs.at(-1)}（≤ 3.5、≤ 7、≤ 14）`,
    avg(runs) <= 3.5 && runs[Math.floor(runs.length * 0.9)] <= 7 && runs.at(-1) <= 14
  );
  ok(
    `到最近的同主題叢集平均 ${avg(nearS).toFixed(1)} 步、2 步內 ${nearS.filter(x => x <= 2).length} 個（≥ 5、≤ 15%）`,
    avg(nearS) >= 5 && nearS.filter(x => x <= 2).length <= nearS.length * 0.15
  );
  ok(
    `起點到大點：最近 ${nd[0]}、第 10 近 ${nd[9]}、平均 ${avg(nd).toFixed(1)}、最遠 ${nd.at(-1)} 步（4～5、≤ 6、≤ 17、≤ 30）`,
    nd[0] >= 4 && nd[0] <= 5 && nd[9] <= 6 && avg(nd) <= 17 && nd.at(-1) <= 30
  );
  ok(
    `能力值點平均連 ${avg(attrs.map(n => A[n.id].length)).toFixed(1)} 條（3.5～6）`,
    avg(attrs.map(n => A[n.id].length)) >= 3.5 && avg(attrs.map(n => A[n.id].length)) <= 6
  );
  ok('23 個基石、各只連 1 條線', ks.length === 23 && ks.every(n => A[n.id].length === 1), ks.length);
  /* 起點模板：每個起點出去兩條都是小點（一條傷害、一條防禦），第 5 步有大點 */
  {
    const bad = G.PT_START.filter(g => {
      const d = bfs([g]),
        n1 = A[g].map(o => T.I[o]);
      return (
        n1.length !== 2 || n1.some(n => n.s.attr || n.big) || !T.N.some(n => n.big === 1 && !n.gate && d[n.id] === 5)
      );
    });
    ok('六個起點：第 1 步是兩個小點、第 5 步有大點', !bad.length, bad.join(' '));
  }
  /* 鎖住的預留叢集：只有一個入口，不擋路（不經過鎖住的點也走得到每個沒鎖的點） */
  {
    const RSV = vm.runInContext('PT_RSV', ctx),
      free = bfs(G.PT_START, n => !n.lock),
      cut = T.N.filter(n => !n.lock && free[n.id] === undefined).length,
      multi = locked.filter(ns => ns.flatMap(n => A[n.id].filter(o => !T.I[o].lock)).length !== 1).length,
      want = RSV.reduce((s, r) => s + r[2], 0);
    ok(
      `鎖住的預留叢集 ${locked.length} 個（表上 ${want} 個）、各只有一個入口、不擋路`,
      locked.length === want && !multi && !cut,
      `入口不是 1 個的 ${multi}、被擋住的點 ${cut}`
    );
  }
  /* 烘的檔要跟工具一致；形狀不重複、沒有跑版 */
  {
    const { ptreeGen2, pt2Audit } = require('./tree_bake.js'),
      B = vm.runInContext('PT_BAKE', ctx),
      T2 = ptreeGen2(vm.runInContext('({ PT_THEME, PT_TH, PT_RW, PT_KEYS, PT_ROADS, PT_RSV, PT_STARTS })', ctx)),
      A2 = pt2Audit(T2),
      same =
        T2.N.length === B.N.length &&
        T2.N.every(
          (n, i) => n.id === B.N[i][0] && Math.abs(n.x - B.N[i][1]) < 0.06 && Math.abs(n.y - B.N[i][2]) < 0.06
        );
    ok('js/ptdata.js 是用現在的 tools/tree_bake.js 烘的（改了工具或主題要重烘）', same);
    ok(`${T2.CL.length} 個形狀都不重複`, new Set(T2.CL.map(c => c.sig)).size === T2.CL.length);
    ok(
      '天賦樹沒有跑版（線交叉、線壓到點、點太近、夾角小於 12°，含弧線）',
      !(A2.線交叉 + A2.線壓到點 + A2.兩點太近 + A2.夾角小於12度),
      A2._dbg.slice(0, 5).join('、')
    );
  }
  /* 每個能力都有來源、每個點都有名字與圖示 */
  {
    const has = new Set(T.N.flatMap(n => Object.keys(n.s || {}))),
      need =
        `atkP physP fireP coldP lightP chaosP strikeP slamP novaP sustP durP projAtkP bleedMag poiMag ignMag rageMax rageEff rageLeech rageHit
        mpLeech esLeech allyLeech lifeRec esMana recoupHp recoupMp evAsArmor cull lukCrit lukBlock lukDmg lukDefl thornP thorn defl evAsDefl
        ignFire ignCold ignLight ignChaos aggHit aggIgn aggAll bleedAll poiAll forkCrit inevCrit ovkSplash kbEs savageGuard parryMag parryDur parryR bvNoCrit
        overwhelm incise inciseMag hexPierce hstunNoEv suppCh buffMag debuffMag blackScythe circular knightly ironGrip ironWill fork projRet splash minmax reveal
        weakMore noRoll noStag rollTank minGiant surrP isoP killP presP lowMpP lowEsP dynOn crushOn crippleOn weakenOn compoundOn unChill unPoi unBleed esDelay esRec
        stunThrP stunRec immobP dazeCh`.split(/\s+/),
      miss = need.filter(k => !has.has(k)),
      STATN = vm.runInContext('STATN', ctx),
      noName = [...has].filter(k => k !== 'only' && !STATN[k]),
      noIc = T.N.filter(n => !n.gate && !n.ic).map(n => n.id),
      /* 沒有過路小點：每個小點都跟某個大點連在一起（鎖住的也算） */
      way = C.filter(ns => !ns.some(n => n.big)).length;
    ok('每個能力都有天賦來源（fullStrike 留給昇華）', !miss.length && !has.has('fullStrike'), miss.join(' '));
    ok('天賦點的每個鍵都有 STATN 名字', !noName.length, noName.join(' '));
    ok('每個天賦點都有圖示', !noIc.length, noIc.slice(0, 5).join(' '));
    ok(
      `能力值點 ${attrs.length} 個佔全樹 ${((100 * attrs.length) / T.N.length).toFixed(1)}%、沒有過路小點、全樹 ${T.N.length} 點（PoE2 3915）`,
      Math.abs(attrs.length - 293) <= 8 &&
        Math.abs(attrs.length / T.N.length - 0.075) < 0.003 &&
        !way &&
        Math.abs(T.N.length - 3915) <= 25,
      `沒有大點的叢集 ${way} 個`
    );
  }
  {
    /* 小點的種類照能力的組合算（PoE2 是 601 種、18% 是兩條詞） */
    const sm = T.N.filter(n => !n.big && !n.lock && !n.s.attr),
      kinds = new Set(sm.map(n => Object.keys(n.s).sort().join('+'))).size,
      two = sm.filter(n => Object.keys(n.s).length > 1).length / sm.length;
    ok(`小點 ${kinds} 種（≥ 420）、兩條詞的佔 ${Math.round(100 * two)}%（≤ 32%）`, kinds >= 420 && two <= 0.32);
  }
  ok('15 種武器都有專精叢集', !wp.length, wp.join(','));
  ok(
    `大點全部手寫（${nts.length} 個，名字不重複）`,
    !auto && new Set(nts.map(n => n.n)).size === nts.length,
    `${auto} 個是產生的`
  );
}
{
  /* 0.2.45 天賦樹重做新增的能力：預設要是 0（戰鬥直接拿來算，undefined 會變 NaN），天賦給了要讀得到 */
  const K =
      'penF penC penL lowEnemyP blindP blindCh formP formArm flamP chillMag shockCh pinP chgDur chgMore expEff armEle esAsThr presArea twoP oneP dualP minAs gloryP energyP grenCd reloadP'.split(
        ' '
      ),
    o0 = G.stats({ lv: 50, eq: {}, pt: [] });
  G.PTREE.I.zz = { s: Object.fromEntries(K.map(k => [k, 7])) };
  const o1 = G.stats({ lv: 50, eq: {}, pt: ['zz'] });
  delete G.PTREE.I.zz;
  ok(
    `0.2.45 新增的 ${K.length} 個能力：預設是 0、天賦給了讀得到`,
    K.every(k => o0[k] === 0 && o1[k] === 7),
    K.filter(k => o0[k] !== 0 || o1[k] !== 7).join(' ')
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
  '等級與懲罰：第 16 階怪物 Lv83、抗性 −60%；Lv100 有 129 天賦點、Lv300 有 149 點',
  B('mobLv(16)') === 83 &&
    B('resPen(83)') === 60 &&
    B('resPen(10)') === 0 &&
    B('ptPoints(100)') === 129 &&
    B('ptPoints(300)') === 149
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
    B('mapCost(1)') === 0 &&
    B('mapCost(5)') === 8
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
  /* 連擊：每次出手最多 +1，8 秒沒加就歸零；段數：1 秒內再按進下一段 */
  R('var a1 = {}, a2 = {}; comboHit(a1); comboHit(a1); comboHit(a2);');
  const c2 = R('comboN()');
  R('G.t = 9');
  const c0 = R('comboN()');
  const st = R(
    '[nextStage("x"), (G.t += 0.5, nextStage("x")), (G.t += 0.5, nextStage("x")), (G.t += 0.5, nextStage("x")), (G.t += 2, nextStage("x"))]'
  );
  ok('連擊與段數', c2 === 2 && c0 === 0 && st.join() === '0,1,2,0,0', `${c2} ${c0} ${st}`);
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
  /* 收割：有才消耗、消耗後就沒了；粉碎重擊 */
  const hv = R(`var m = { x: 0, y: 0, r: 10, mhp: 100, ail: { frozen: 5, hs: 50 } };
    [takeState(m, 'frozen'), (G.t += 0.1, takeState(m, 'frozen')), hasState(m, 'primed'), crush(m), hasState(m, 'primed'), m.ail.hstun > G.t]`);
  ok('收割與粉碎重擊', hv.join() === 'true,false,true,true,false,true', hv.join());
  /* 穩固值：T16 的王約 24 萬；定身期間三條都暫停；定身後 +500% 退回；8 秒沒累積才消退 */
  const po = R(`(() => {
    G.t = 100; G.mapT = 16;
    const m = { x: 0, y: 0, boss: 1, mhp: 1e6, ail: {} }, a = m.ail, p0 = poise(m, 'frz');
    poiseAdd(m, 'frz', (p0 / 2.1) * 0.5);
    poiseAdd(m, 'hs', (p0 / 0.58) * 0.1);
    const half = Math.round(a.frz);
    poiseAdd(m, 'frz', (p0 / 2.1) * 0.6);
    const fr = a.frozen === 104 && a.frz === 0;
    poiseAdd(m, 'hs', 1e9);
    const paused = Math.round(a.hs);
    G.t = 104;
    const up = Math.round(poise(m, 'frz') / p0);
    G.t = 111;
    const mid = (poise(m, 'frz') / p0).toFixed(1);
    G.t = 118;
    const back = Math.round(poise(m, 'frz') / p0);
    a.psA.hs = 113; a.hs = 50;
    G.t = 120; ailTick(m, 1); const d0 = a.hs;
    G.t = 121; ailTick(m, 1); const d1 = a.hs;
    const e = { ail: {}, elite: 1 }, n = { ail: {} }, mp = { x: 0, y: 0, mhp: 1, ail: {} };
    G.mm = { bhp: 100 }; const b2 = Math.round(poise(m, 'frz') / p0); G.mm = null;
    return [p0 > 2.4e5 && p0 < 2.5e5, half, fr, paused, up, mid, back, d0, d1, Math.round(poise(e, 'hs') / poise(n, 'hs')), b2];
  })()`);
  ok('穩固值', po.join() === 'true,50,true,10,6,3.5,1,50,45,3,2', po.join());
  /* 灌注：撿殘留物 +1（最多 3），消耗 −1 */
  const inf =
    R(`S.skills = [{ a: { gem: 'nova' } }]; G.t = 0; for (let i = 0; i < 5; i++) dropRemnant('fire', 0, 0), remnantTick();
    [infN('fire'), takeInf('fire'), infN('fire'), takeInf('cold')]`);
  ok('灌注', inf.join() === '3,true,2,false', inf.join());
  /* 技能欄沒有吃灌注的技能：不產生殘留物 */
  const nr = R(`S.skills = [{ a: { gem: 'slash' } }]; G.remnants = []; dropRemnant('fire', 0, 0); G.remnants.length`);
  ok('沒有灌注技能不掉殘留物', nr === 0, nr);
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
     S = { lv: 90, eq: { weapon: mkItem('w_mace1_5', 16, 0), off: mkItem('s_tower', 16, 0), ring1: Object.assign(mkItem('r_iron', 16, 0), { a: [{ k: 'attrA', v: 99, T: 1 }] }) }, pt: [...PT_START], asc: null, at: [], auras: [], charms: [] };
     ST = stats(S); P = { x: 0, y: 0, hp: ST.hp, es: 0, bv: ST.bv };`);
  const bv0 = R('ST.bv'),
    left = R('absorb(100)'),
    bv1 = R('P.bv');
  R('absorb(1e9)');
  const br = [R('P.bv'), R('P.bvRe'), R('absorb(100)')];
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
  ok('商人：買了馬上賣都賠錢、基底對、品質 0 孔 0 潛能 3、物品等級＝最高階', !lose && !wrong, lose + ' ' + wrong);
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
  const c2 = {
    console,
    Math,
    Date,
    JSON,
    Object,
    Array,
    Set,
    location: { search: '' },
    URLSearchParams,
    document: { getElementById: () => ({ classList: { add() {}, remove() {} } }), querySelectorAll: () => [] }
  };
  vm.createContext(c2);
  for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'mech.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), c2, { filename: f });
  const R = s => vm.runInContext(s, c2);
  R(`var G = { t: 1, mapT: 1, scene: 'map', state: 'play', mobs: [], shots: [], grenades: [], units: [], ground: [], W: 2000, H: 2000 }, P = { x: 500, y: 500, cds: {}, mp: 1e4, hp: 100, ail: {} }, S, ST, TOUCH = { on: 0 };
     const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
     const num = () => {}, fx = () => {}, fxs = () => {}, sfx = () => {}, hudWarn = t => (G.warn = t), die = () => {}, los = () => true, open = () => true, floorNear = () => null;`);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'skills.js'), 'utf8'), c2, {
    filename: 'skills.js'
  });
  R(
    `S = { lv: 60, eq: {}, pt: [...PT_START], asc: null, at: ['a_st'], auras: [], charms: [], skills: [0, 1, 2, 3, 4].map(() => ({ a: null })) }; S.eq.off = mkItem(BASES.find(b => b.k === 'shield').id, 10, 0); S.eq.ring1 = mkItem('r_iron', 10, 0); S.eq.ring1.a = [{ k: 'attrA', v: 99, T: 1 }]; ST = stats(S); ST.cdr = 0;`
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
  /* 滿溢機率（0.2.43）：多重投射 250% ＝ 多 2 發，再 50% 機率第 3 發；測試裡把 surpass 的結果加進 c.proj，實際出手數對得上（遊戲內容還沒接） */
  {
    const k = pk[0],
      sr = R(`(() => {
      const out = [], base = ${count(k, 0)};
      for (let i = 0; i < 60; i++) {
        G.shots = []; G.grenades = []; G.units = []; P.swords = []; P.gren = {}; P.ammo = {};
        const c = gemCfg(mkGem('${k}', 5), 0), n = surpass(250); c.proj += n;
        const a = { k: '${k}', c, ang: 0, tx: P.x + 200, ty: P.y, hits: [0], n: 0 };
        if (c.unit) { placeUnit(c, { x: P.x + 100, y: P.y }); unitFire(G.units[0], { x: P.x + 300, y: P.y }); } else actHit(a, 0);
        out.push([n, G.shots.length + G.grenades.length + (P.swords || []).length - base]);
      }
      return out;
    })()`);
    ok(
      '滿溢機率：多重投射 250% ＝ 實際多 2 或 3 發（兩種都出現），發數跟 surpass 的結果一致',
      sr.every(([n, d]) => (n === 2 || n === 3) && d === n) && sr.some(([n]) => n === 2) && sr.some(([n]) => n === 3),
      JSON.stringify(sr.slice(0, 6))
    );
  }
  ok(
    '閃電箭基礎 1 支',
    res.find(x => x[0] === 'split')[1] === 1,
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
    '自動化：砲塔圖騰、圖騰可以；位移、陷阱、地雷、召喚不行',
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
    '品質：135 顆寶石都有效果說明，沒有多的',
    R(`Object.keys({ ...SKILLS, ...SUPPORTS, ...AURAS }).every(k => QUAL[k]) && Object.keys(QUAL).length`) === 135,
    R(`Object.keys(QUAL).length`)
  );
  /* 閃電箭：品質 20% 轉 90%、無法連鎖、只有打已感電的才跳 2 隻；折射箭矢：3 次就消失、不算擊殺、衝擊波降門檻、三種元素一起中也只放 1 次 */
  const bow = R(`(() => {
    G.mobs = []; G.t = 100; G.kills = 0; ST.chain = 3; ST.dmg = [100, 100]; globalThis.spawnMob = (D, x, y) => mk(x - P.x); globalThis.aggroPack = globalThis.sparks = globalThis.hitstop = globalThis.killMob = () => {};
    const D = Object.values(MOBS)[0],
      mk = x => { const m = { D, x: P.x + x, y: P.y, r: 12, sz: 20, hp: 1e9, mhp: 1e9, arm: 0, arm0: 0, ev: 0, vx: 0, vy: 0, aggro: 1, res: { fire: 0, cold: 0, light: 0, chaos: 0 }, ail: {} }; G.mobs.push(m); return m; },
      [a, b, c, d] = [40, 80, 120, 160].map(mk),
      g = mkGem('split', 5);
    g.q = 20;
    const cf = gemCfg(g, 0), pre = hitCalc(cf, a, { keep: 1 }).pre, hurt = m => m.hp < m.mhp, out = [];
    out.push(Math.round((pre.light / (pre.light + pre.phys)) * 100), cf.chain, cf.proj);
    hitMob(a, cf, 0, 0);
    out.push(hurt(b));
    a.ail.shock = G.t + 8;
    hitMob(a, cf, 0, 0);
    out.push(hurt(b), hurt(c), hurt(d));
    const rnd0 = Math.random, k0 = G.kills, rc = gemCfg(mkGem('refract', 5), 0);
    Math.random = () => 0;
    spawnArrow(P.x + 10, P.y, rc);
    const ar = G.mobs[G.mobs.length - 1], fire = { ...rc, cvF: 100 };
    d.hp = d.mhp;
    hitMob(ar, fire, 0, 0);
    out.push(ar.fired, !!ar.ail.ign, hurt(d), d.ail.thrLow.fire === G.t + 8, ailLow(d, 'fire'), ailLow(d, 'cold'));
    hitMob(ar, fire, 0, 0);
    hitMob(ar, fire, 0, 0);
    spawnArrow(P.x + 10, P.y, rc);
    const ar2 = G.mobs[G.mobs.length - 1];
    hitMob(ar2, { ...rc, cvF: 40, cvC: 30, cvL: 30 }, 0, 0);
    Math.random = rnd0;
    out.push(ar.fired, ar.hp, G.kills - k0, ar2.fired);
    G.mobs = [];
    return out;
  })()`);
  ok('閃電箭與折射箭矢', bow.join() === '90,0,1,false,true,true,false,1,false,true,true,0.7,1,3,0,0,1', bow.join());
  /* 0.2.42 定身與控制：禁錮四種、釘身來源與觸發、可釘身、目眩、玩家僵直與沉重暈眩、暈眩恢復、堅韌 */
  const ctl = R(`(() => {
    G.mobs = []; G.t = 200; G.mapT = 16; G.mm = null; ST.dmg = [100, 100]; ST.noCrit = 1; ST.hp = 1000;
    ST.immobP = 0; ST.dazeCh = 0; ST.stunRec = 0; ST.stunThrP = 0; P.ail = {}; P.stag = 0;
    const D = Object.values(MOBS)[0],
      mk = (o = {}) => ({ D, x: P.x + 40, y: P.y, r: 12, sz: 20, hp: 1e9, mhp: 1e9, arm: 0, arm0: 0, ev: 0, vx: 0, vy: 0, aggro: 1, res: { fire: 0, cold: 0, light: 0, chaos: 0 }, ail: {}, ...o }),
      cf = gemCfg(mkGem('split', 5), 0), dmg = m => hitCalc(cf, m, { keep: 1 }).d, out = [], r2 = x => Math.round(x * 100) / 100;
    /* 1. 禁錮：冰凍、觸電、沉重暈眩、釘身都算；對禁錮的敵人傷害提高 */
    out.push([{ frozen: 201 }, { elcT: 201 }, { hstun: 201 }, { pinT: 201 }, {}].map(a => !!immob(a)).join(''));
    const base = dmg(mk());
    ST.immobP = 50;
    out.push(r2(dmg(mk({ ail: { pinT: 201 } })) / base), r2(dmg(mk()) / base));
    ST.immobP = 0;
    /* 2. 釘身只來自擲矛、插了釘身輔助的投射物攻擊（近戰、法術插了也沒用）；定身中被擊中不會被擊退 */
    const pinOf = g => { const m = mk(); hitMob(m, gemCfg(g, 0), 0, 0); return m.ail.pin > 0; },
      withPin = k => { const g = mkGem(k, 5); g.sup[0] = mkGem('pin', 1); return g; };
    out.push([pinOf(mkGem('spearthrow', 5)), pinOf(mkGem('gasarrow', 5)), pinOf(withPin('gasarrow')), pinOf(withPin('slash')), pinOf(withPin('fireball'))].join(''));
    const pm = mk({ ail: { pinT: 203 } });
    hitMob(pm, cf, 0, 300);
    out.push(pm.vx === 0, ailTick(pm, 0.016) === false, ailTick(mk({ ail: { frozen: 203 } }), 0.016) === true);
    /* 3. 累滿：釘身 3 秒、僵直一次（王不僵直）；結束後穩固值 ×6、15 秒退回；定身中四條都暫停 */
    const pb = mk(), p0 = poise(pb, 'pin'), bs = mk({ boss: 1 });
    poiseAdd(pb, 'pin', p0 / 4.2 + 1);
    poiseAdd(bs, 'pin', poise(bs, 'pin') / 4.2 + 1);
    out.push(pb.ail.pinT === 203, pb.stun === 0.5, bs.ail.pinT === 203, !bs.stun);
    poiseAdd(pb, 'hs', 1e9);
    out.push(!pb.ail.hs);
    G.t = 203; out.push(Math.round(poise(pb, 'pin') / p0));
    G.t = 218; out.push(Math.round(poise(pb, 'pin') / p0));
    G.t = 200;
    /* 4. 可釘身：普通 40、魔法 50 的門檻照「瀕臨」：普通 40、稀有 60、王 70；釘身中不算 */
    out.push([mk({ ail: { pin: 40 } }), mk({ ail: { pin: 39 } }), mk({ elite: 1, ail: { pin: 59 } }), mk({ elite: 1, ail: { pin: 60 } }), mk({ boss: 1, ail: { pin: 69 } }), mk({ boss: 1, ail: { pin: 70 } }), mk({ ail: { pin: 100, pinT: 203 } })].map(m => +hasState(m, 'pinprime')).join(''));
    /* 5. 目眩：沉重暈眩累積 +50%、不疊加、重上刷新 8 秒；機率 0 不上 */
    const dz = mk(), dz2 = mk({ ail: { daze: 208 } }), ph = poise(dz, 'hs');
    poiseAdd(dz, 'hs', (ph / 0.58) * 0.1);
    poiseAdd(dz2, 'hs', (ph / 0.58) * 0.1);
    out.push(r2(dz2.ail.hs / dz.ail.hs));
    const dm = mk();
    hitMob(dm, cf, 0, 0); out.push(!dm.ail.daze);
    ST.dazeCh = 100;
    hitMob(dm, cf, 0, 0); out.push(dm.ail.daze === 208);
    G.t = 203; hitMob(dm, cf, 0, 0); out.push(dm.ail.daze === 211);
    G.t = 200; ST.dazeCh = 0;
    /* 6. 玩家僵直：機率 = 傷害 ÷ 門檻，低於 15% 不算；暈眩恢復縮短、暈眩門檻提高 */
    const rnd0 = Math.random, sg = (d, st) => { P.stag = 0; P.act = {}; Math.random = () => st; playerStagger(d); return P.stag; };
    out.push(sg(100, 0), sg(150, 0.99), sg(150, 0) === 200.5 && P.act === null, sg(1000, 0.99) === 200.5);
    ST.stunRec = 100; out.push(sg(150, 0));
    ST.stunRec = 0; ST.stunThrP = 100; out.push(sg(150, 0));
    ST.stunThrP = 0;
    /* 7. 玩家沉重暈眩條：冰冷不累積、累滿 3 秒（恢復縮短）、暈住中不累積、結束後門檻 +500% */
    P.ail = {}; Math.random = rnd0;
    playerHeavy(1000, 'cold'); out.push(!P.ail.hs);
    playerHeavy(1000, 'phys'); out.push(Math.round(P.ail.hs));
    playerHeavy(1000, 'phys'); out.push(P.ail.hstun === 203, P.ail.hs === 0, playerSlow() === 0, playerStates().map(x => x.k).join());
    playerHeavy(1000, 'phys'); out.push(P.ail.hs === 0);
    G.t = 203; playerHeavy(600, 'phys'); out.push(Math.round(P.ail.hs));
    P.ail = {}; G.t = 200; ST.stunRec = 100;
    playerHeavy(1e9, 'fire'); out.push(P.ail.hstun === 201.5);
    ST.stunRec = 0; P.ail = {}; P.stag = 0;
    /* 8. 堅韌：受到的傷害 ÷ (1 + 堅韌/100)；怪物基礎 0；地圖詞 +30% */
    out.push(r2(dmg(mk({ tough: 100 })) / base), r2(dmg(mk()) / base));
    G.mm = mapMods({ mods: ['tough'] }); out.push(r2(dmg(mk()) / base)); G.mm = null;
    ST.noCrit = 0; Math.random = rnd0;
    return out.join('|');
  })()`);
  ok(
    '定身與控制：禁錮、釘身、可釘身、目眩、玩家僵直與沉重暈眩、堅韌',
    ctl ===
      'truetruetruetruefalse|1.5|1|truefalsetruefalsefalse|true|true|true|true|true|true|true|true|6|1|1001010|1.5|true|true|true|0|0|true|true|200.25|0|true|87|true|true|true|hstunP|true|9|true|0.5|1|0.77',
    ctl
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
    '怪物狀態：只列有效的（過期的流血不列），含詛咒與印記',
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
  /* 0.2.42 第 1 批：速度與防禦 */
  const b1 = R(`(() => {
    const out = {}, ss0 = ST.ss, cdr0 = ST.cdr;
    const atk = Object.keys(SKILLS).find(k => !isSpell(SKILLS[k]) && !SKILLS[k].shield && !SKILLS[k].unit && SKILLS[k].t),
      spl = Object.keys(SKILLS).find(k => isSpell(SKILLS[k]) && !SKILLS[k].unit && SKILLS[k].t),
      cdk = Object.keys(SKILLS).find(k => SKILLS[k].cd > 0);
    const dur = k => actDur(gemCfg(mkGem(k, 5), 0));
    P.tail = 0; P.buf = {};
    const a0 = dur(atk), s0 = dur(spl); ST.ss = 20;
    const k1 = (1 + (ST.as + 20) / 100) / (1 + ST.as / 100);
    out.ssAtk = a0 / dur(atk) / k1; out.ssSpl = s0 / dur(spl) / k1;
    ST.ss = 0; P.tail = 10; out.tail = a0 / dur(atk) / ((1 + (ST.as + 20) / 100) / (1 + ST.as / 100));
    P.tail = 5; baseTick(5); out.tailKeep = P.tail; P.tail = 0;
    ST.cdr = 100; out.cd100 = gemCfg(mkGem(cdk, 5), 0).cd; ST.cdr = 300; out.cd300 = gemCfg(mkGem(cdk, 5), 0).cd; ST.cdr = 0;
    out.cd0 = gemCfg(mkGem(cdk, 5), 0).cd;
    ST.ss = ss0; ST.cdr = cdr0;
    /* 全域防禦：加進護甲、閃避、能量護盾各自的提高 */
    const S2 = { ...S, eq: { ...S.eq } };
    const ch = mkItem(BASES.find(b => b.k === 'chest').id, 10, 0);
    ch.a = [{ k: 'armor', v: 100 }, { k: 'ev', v: 100 }, { k: 'es', v: 100 }];
    S2.eq.chest = ch; S2.pt = [];
    const o0 = stats(S2), am = mkItem(BASES.find(b => b.k === 'amulet').id, 10, 0);
    am.a = [{ k: 'defP', v: 50 }]; S2.eq.amulet = am;
    const o1 = stats(S2);
    out.def = [o1.armor / o0.armor, o1.ev / o0.ev, o1.es / o0.es];
    /* 35% 門檻 */
    const hp0 = P.hp, es0 = P.es, mp0 = P.mp, M = ST.hp;
    P.hp = M * 0.34; out.lo1 = lowHp(); P.hp = M * 0.36; out.lo2 = lowHp(); P.hp = hp0;
    P.mp = ST.mp * 0.34; out.lm1 = lowMp(); P.mp = ST.mp * 0.36; out.lm2 = lowMp(); P.mp = mp0;
    const e0 = ST.es; ST.es = 100; P.es = 34; out.le1 = lowEs(); P.es = 36; out.le2 = lowEs(); ST.es = e0; P.es = es0;
    /* 護盾 4 秒才充能、每秒 12.5% */
    Object.assign(G, { allies: [], pools: [], meteors: [], t: 100 }); mechEnter(); const es1 = ST.es, d1 = ST.esDelay;
    ST.es = 100; ST.esDelay = 0; P.es = 0; P.lastHurt = 97; updSkills(0.5); out.es3 = P.es;
    P.lastHurt = 95; updSkills(1); out.es5 = P.es;
    P.es = 0; ST.esDelay = 100; P.lastHurt = 97.5; updSkills(1); out.esFast = P.es;
    ST.es = es1; ST.esDelay = d1; P.es = es0;
    /* 榮耀：同一隻怪 0.5 秒一次，一般 1、精英 5、王 20，暴擊 ×4 */
    P.glory = 0; const mm = { hp: 9 }, el = { elite: 1 }, bs = { boss: 1 };
    G.t = 200; hitGlory(mm, false); hitGlory(mm, false); const g1 = P.glory;
    G.t = 200.6; hitGlory(mm, false); const g2 = P.glory;
    P.glory = 0; hitGlory(el, false); hitGlory(bs, false); hitGlory({ hp: 1 }, true); out.glory = [g1, g2, P.glory];
    P.glory = 50; P.gloryT = 200; G.t = 214; mechTick(1); const gk = P.glory; G.t = 216.5; mechTick(1); out.gloryFade = [gk, P.glory];
    /* 砲塔圖騰＋圖騰合計 2 */
    G.units = []; const u0 = ST.units; ST.units = 0;
    for (const k of ['totem', 'turret', 'totem', 'turret', 'turret']) {
      const key = Object.keys(SKILLS).find(x => SKILLS[x].unit === k);
      placeUnit(gemCfg(mkGem(key, 5), 0), { x: P.x + 50, y: P.y });
    }
    out.units = [G.units.length, G.units.filter(u => u.type === 'turret').length];
    G.units = []; ST.units = u0;
    return out;
  })()`);
  ok(
    '技能速度：攻擊與法術一起變快（加進攻擊速度池）',
    Math.abs(b1.ssAtk - 1) < 1e-6 && Math.abs(b1.ssSpl - 1) < 1e-6,
    JSON.stringify(b1)
  );
  ok(
    '流順之風：每層技能速度 +2%、不隨時間消退、被擊中一律清空',
    Math.abs(b1.tail - 1) < 1e-6 &&
      b1.tailKeep === 5 &&
      /P\.tail = 0;/.test(
        fs
          .readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8')
          .replace(/\r/g, '')
          .split('if (ST.gale)')
          .join('X')
      ),
    JSON.stringify([b1.tail, b1.tailKeep])
  );
  ok(
    '冷卻時間恢復率：冷卻 ÷ (1 + x/100)、沒有上限',
    Math.abs(b1.cd100 * 2 - b1.cd0) < 1e-9 && Math.abs(b1.cd300 * 4 - b1.cd0) < 1e-9,
    JSON.stringify([b1.cd0, b1.cd100, b1.cd300])
  );
  ok(
    '全域防禦：同時加到護甲、閃避、能量護盾',
    b1.def.every(x => x > 1.3),
    JSON.stringify(b1.def)
  );
  ok(
    '低血 35%：貧血、貧魔、貧能量護盾',
    b1.lo1 && !b1.lo2 && b1.lm1 && !b1.lm2 && b1.le1 && !b1.le2,
    JSON.stringify([b1.lo1, b1.lo2, b1.lm1, b1.lm2, b1.le1, b1.le2])
  );
  ok(
    '能量護盾：4 秒沒受傷才充能、每秒 12.5%、充能更快開始縮短延遲',
    b1.es3 === 0 && Math.abs(b1.es5 - 12.5) < 1e-6 && Math.abs(b1.esFast - 12.5) < 1e-6,
    JSON.stringify([b1.es3, b1.es5, b1.esFast])
  );
  ok(
    '榮耀：同一隻怪 0.5 秒一次、一般 1／精英 5／王 20、暴擊 ×4、15 秒後消退',
    b1.glory.join() === '1,2,29' && Math.abs(b1.gloryFade[0] - 50) < 1e-9 && b1.gloryFade[1] < 50,
    JSON.stringify([b1.glory, b1.gloryFade])
  );
  ok('砲塔圖騰與圖騰合計最多 2 個', b1.units[0] === 2, JSON.stringify(b1.units));
  /* 品質 0 時不觸發：舊存檔的寶石沒有 q，機率類的工具要回 false */
  ok('品質：機率 0 不觸發、機率 100 必中', !R('qRoll(0)') && !R('qRoll(undefined)') && R('qRoll(100)'));
  /* 0.2.42 第 2 批：計算規則（能力總量、轉換、獲得、效用、增益／減益、非疊加、未限抗性） */
  const b2 = R(`(() => {
    const out = {};
    for (const [id, st] of Object.entries({ x3: { evP: 100 }, x4: { armorP: 100 }, x5: { evP: 100, armorP: 100 }, x6: { hpP: 100 } })) PTREE.I[id] = { s: st };
    const mk = (aff, pt = [], auras = []) => {
      const s = { ...S, eq: {}, pt, auras, asc: null, at: [] }, am = mkItem(BASES.find(b => b.k === 'amulet').id, 10, 0);
      am.q = 0; am.a = aff; s.eq.amulet = am; return s;
    };
    const o = (aff, pt, auras) => stats(mk(aff, pt, auras));
    out.base = o([]).armor === 0 && o([]).ev === 0 && o([]).es === 0;
    out.order = o([{ k: 'armor', v: 100 }, { k: 'defP', v: 50 }, { k: 'armorTot', v: 7 }]).armor;
    const ir = o([{ k: 'armor', v: 100 }, { k: 'ev', v: 100 }, { k: 'ironRef', v: 1 }], ['x3']);
    out.iron = [ir.armor, ir.ev];
    const ga = o([{ k: 'ev', v: 100 }, { k: 'evAsArmor', v: 15 }], ['x5']);
    out.gain = [ga.armor, ga.ev];
    out.es = o([{ k: 'es', v: 50 }, { k: 'defP', v: 100 }, { k: 'esTot', v: 10 }]).es;
    out.tot = [o([], ['x6']).hp, o([{ k: 'lifeTot', v: 20 }], ['x6']).hp, o([{ k: 'accTot', v: 5 }]).acc - o([]).acc, o([{ k: 'spiritTot', v: 5 }]).spirit - o([]).spirit];
    const au = [{ gem: 'precise', lv: 1, q: 0 }];
    out.spirit = [o([], [], au).spiritUsed, o([{ k: 'spiritEff', v: 50 }], [], au).spiritUsed];
    out.auraM = [o([], [], au).critInc, o([{ k: 'buffEff', v: 50 }, { k: 'buffMag', v: 100 }], [], au).critInc, o([{ k: 'auraEff', v: 50 }], [], au).critInc];
    const mpk = Object.keys(SKILLS).find(k => SKILLS[k].mp > 0), mp0 = gemCfg(mkGem(mpk, 10), 0).mp;
    ST.mpEff = 100; const mp1 = gemCfg(mkGem(mpk, 10), 0).mp; ST.mpEff = 0;
    out.mp = [mp0, mp1];
    /* 增益：猛攻、流順之風讀效果與幅度；減益：詛咒、曝曬 */
    P.buf = { onslaught: G.t + 10 }; P.tail = 5;
    const sp0 = buffSpeed(), mv0 = buffMove(); ST.buffEff = 50; ST.buffMag = 100;
    out.buff = [buffSpeed(), (1 + (ST.as + ST.ss + (20 + 10) * 3) / 100) / (1 + ST.as / 100), buffMove(), (1 + 0.1 * 3) * (1 + 0.01 * 5 * 3)];
    ST.buffEff = 0; ST.buffMag = 0; out.buff0 = [buffSpeed() === sp0, buffMove() === mv0];
    const cm = () => ({ ail: {}, arm0: 100, arm: 100, res: { fire: 0, cold: 0, light: 0, chaos: 0 } });
    ST.debuffEff = 50; ST.debuffMag = 100;
    const m1 = cm(); curseMob(m1, 'enfeeble', 1); m1.ail.exp = G.t + 4;
    out.debuff = [m1.ail.curse.v, resOf(m1, 'fire')]; ST.debuffEff = 0; ST.debuffMag = 0;
    /* 非疊加：重複上只刷新時間 */
    const m2 = cm(); G.t = 1000; curseMob(m2, 'eleweak', 5); const v1 = m2.ail.curse.v, k1 = Object.keys(m2.ail).length;
    G.t = 1002; curseMob(m2, 'eleweak', 5); G.t = 1000;
    out.curse = [m2.ail.curse.v === v1, Object.keys(m2.ail).length === k1, Math.abs(m2.ail.curse.t - 1008.35) < 1e-9];
    markMob(m2, 'sniper'); markMob(m2, 'sniper'); out.mark = m2.ail.mark.k;
    const ap = () => applyAil(m2, { pre: {}, post: {}, d: 0, crit: false }, { D: { tags: [] }, expose: 1, q: 0, ailMag: 0 });
    G.t = 1000; ap(); const e1 = m2.ail.exp; G.t = 1002; ap(); G.t = 1000;
    out.expose = [e1, m2.ail.exp, resOf(m2, 'fire') - resOf({ ...m2, ail: { ...m2.ail, exp: 0 } }, 'fire')];
    P.buf = {}; G.t = 1000; gainBuff('onslaught', 4); const b1t = P.buf.onslaught; G.t = 1002; gainBuff('onslaught', 4); G.t = 1000;
    out.onsT = [b1t, P.buf.onslaught]; P.buf = {}; P.tail = 0;
    /* 未限抗性與最大抗性 */
    const rs = [{ k: 'resF', v: 112 }, { k: 'maxResF', v: 5 }];
    const sA = o(rs.slice(0, 1)), sB = o(rs);
    S0 = S; ST0 = ST; G.mm = null; G.scene = 'hideout';
    S = mk(rs.slice(0, 1)); ST = stats(S); const rA = [ST.resRaw.fire, ST.maxRes.fire, effRes('fire')];
    S = mk(rs); ST = stats(S); const rB = [ST.resRaw.fire, ST.maxRes.fire, effRes('fire')];
    S = mk([{ k: 'resF', v: 60 }, { k: 'maxResF', v: 5 }]); ST = stats(S); const rC = [ST.resRaw.fire, ST.maxRes.fire, effRes('fire')];
    G.scene = 'map'; G.mapT = 1; G.mm = { pmaxres: -10 };
    S = mk(rs); ST = stats(S); const rD = effRes('fire');
    G.mm = null; S = S0; ST = ST0; G.scene = 'map';
    out.res = [rA, rB, rC, rD];
    return out;
  })()`);
  ok(
    '能力總量：基礎 → 提高 → 增添能力總量（最後才加、不吃 %）',
    b2.base && b2.order === 157,
    JSON.stringify([b2.base, b2.order])
  );
  ok('能力轉換：鐵壁轉的是基礎閃避，吃護甲的提高、不吃閃避的', b2.iron.join() === '200,0', b2.iron.join());
  ok('從其他能力獲得：基礎閃避 15% 當護甲、吃護甲的提高、閃避本身照舊', b2.gain.join() === '30,200', b2.gain.join());
  ok(
    '增添能力總量：能量護盾、生命、命中值、精魂最後才加',
    b2.es === 110 && b2.tot[1] === b2.tot[0] + 20 && b2.tot[2] === 5 && b2.tot[3] === 5,
    JSON.stringify([b2.es, b2.tot])
  );
  ok(
    '效用：精魂保留 ÷ (1 + 50%)、魔力消耗 ÷ (1 + 100%)',
    b2.spirit.join() === '30,20' && b2.mp[1] === Math.max(1, Math.round(b2.mp[0] / 2)),
    JSON.stringify([b2.spirit, b2.mp])
  );
  ok(
    '增益效果與幅度分開相乘：光環、猛攻、流順之風（效果 +50%、幅度 +100% → ×3）；光環效果算效果',
    b2.auraM[1] === b2.auraM[0] * 3 &&
      b2.auraM[2] === b2.auraM[0] * 1.5 &&
      Math.abs(b2.buff[0] - b2.buff[1]) < 1e-9 &&
      Math.abs(b2.buff[2] - b2.buff[3]) < 1e-9 &&
      b2.buff0.every(Boolean),
    JSON.stringify([b2.auraM, b2.buff, b2.buff0])
  );
  ok(
    '減益效果與幅度分開相乘：詛咒、曝曬（×3）',
    Math.abs(b2.debuff[0] - 60) < 1e-9 && Math.abs(b2.debuff[1] + 60) < 1e-9,
    JSON.stringify(b2.debuff)
  );
  ok(
    '非疊加：詛咒、印記、曝曬、猛攻重複上只刷新時間',
    b2.curse.every(Boolean) &&
      b2.mark === 'sniper' &&
      b2.expose[0] === 1004 &&
      b2.expose[1] === 1006 &&
      Math.abs(b2.expose[2] + 20) < 1e-9 &&
      b2.onsT.join() === '1004,1006',
    JSON.stringify([b2.curse, b2.mark, b2.expose, b2.onsT])
  );
  ok(
    '未限抗性與最大抗性：有效抗性 = min(未限, 最大抗性)；最大抗性提高拉高上限、地圖詞 pmaxres 壓低',
    b2.res[0].join() === '112,75,75' &&
      b2.res[1].join() === '112,80,80' &&
      b2.res[2].join() === '60,80,60' &&
      b2.res[3] === 70,
    JSON.stringify(b2.res)
  );

  /* 0.2.42 第 3 批：能力值與裝備需求 */
  const b3 = R(`(() => {
    const out = {},
      mk = (eq, pt = [], ptA = {}, lv = 60) => ({ lv, eq: { ...Object.fromEntries(EQS.map(e => [e.k, null])), ...eq }, pt: [...PT_START, ...pt], ptA, asc: null, at: ['a_st'], auras: [], charms: [] }),
      ring = a => Object.assign(mkItem('r_iron', 1, 0), { a }),
      itm = (id, a = []) => Object.assign(mkItem(id, 1, 0), { a }),
      att = PTREE.N.filter(n => n.s && n.s.attr);
    /* 起始值與固定加成：各 10；1 力量 +2 生命、1 敏捷 +8 命中值、1 智慧 +2 魔力 */
    const o0 = stats(mk({}));
    out.start = [o0.str, o0.dex, o0.int, o0.hp - (HERO.hp + 12 * 59), Math.round(o0.mp - (HERO.mp + 3 * 59)), o0.acc - (30 + 6 * 60)];
    /* 過路點：全部是 +5 能力值；自選、沒選當力量 */
    out.pass = [PTREE.N.filter(n => n.n === '基礎').length, PTREE.N.filter(n => n.n === '基礎').every(n => n.s.attr === 5), att.length];
    const p16 = att.slice(0, 16).map(n => n.id), s16 = Object.fromEntries(p16.map(id => [id, 's']));
    const a1 = att[0].id, a2 = att[1].id, a3 = att[2].id;
    const o1 = stats(mk({}, [a1, a2, a3], { [a1]: 'd', [a2]: 'i' }));
    out.pick = [o1.str, o1.dex, o1.int, o1.acc - o0.acc, o1.hp - o0.hp];
    /* 詞綴範圍與部位 */
    out.aff = [AFF.str.r.join(), AFF.dex.r.join(), AFF.int.r.join(), AFF.attrA.r.join(), tierRange('str', 1)[1], tierRange('attrA', 1)[1],
      ['ring', 'amulet', 'gloves', 'helm', 'boots', 'weapon'].every(k => ['str', 'dex', 'int'].every(a => KINDS[k].aff.includes(a))),
      Object.keys(KINDS).filter(k => KINDS[k].aff.includes('attrA')).join(),
      Object.keys(KINDS).filter(k => KINDS[k].aff.includes('str')).sort().join()];
    /* 裝備需求 */
    const rq = id => { const r = itemReq(mkItem(id, 1, 0)); return [r.lv, r.str, r.dex, r.int].join(); };
    const wk = wt => BASES.filter(b => b.wt === wt);
    out.req = [rq('c_leather'), rq('c_plate'), rq('c_katabira'), rq('c_robe'), rq('c_kage'), rq('r_ruby'), rq('a_gold'), rq('bt_leather'), rq('s_tower'), rq('f_mirror'),
      rq(wk('mace')[5].id), rq(wk('bow')[0].id), rq(wk('sword')[2].id), rq(wk('staff')[3].id), rq(wk('flail')[5].id)];
    /* 寶石需求：單色 1.6×、多色 0.9×、每顆輔助 +5；輔助與光環沒有 */
    const gr = (k, lv, n = 0) => { const g = mkGem(k, lv); for (let i = 0; i < n; i++) g.sup[i] = mkGem('fury', 1); const r = gemAttrReq(g); return [r.str, r.dex, r.int].join(); };
    out.gem = [gr('fireball', 5), gr('fireball', 5, 2), gr('slash', 1), gr('slash', 20), gr('fury', 5), gemLack(mkGem('fireball', 5), { str: 10, dex: 10, int: 21 }).length, gemLack(mkGem('fireball', 5), { str: 10, dex: 10, int: 22 }).length];
    const twoC = Object.keys(SKILLS).filter(k => SKILLS[k].wt && new Set(SKILLS[k].wt.flatMap(w => WATT[w])).size > 1)[0];
    out.two = twoC ? gr(twoC, 5) : 'none';
    /* 不符合不能裝（放進欄位缺什麼）：夠了就空 */
    const plate = itm('c_plate');
    out.lack = [eqLack(mk({}), plate, 'chest').map(l => l.join('|')).join(), eqLack(mk({}, p16, s16), plate, 'chest').length, eqLack(mk({}, [], {}, 5), plate, 'chest').map(l => l[0]).join()];
    /* 已經裝著但不夠：失效（不算數值、紅框）；不自動拿下 */
    const w1 = mk({ chest: plate });
    const o2 = stats(w1);
    out.dead = [o2.eqBad.join(), o2.armor, w1.eq.chest === plate];
    const o3 = stats(mk({ chest: plate }, p16, s16));
    out.live = [o3.eqBad.length, o3.armor > 0];
    /* 不循環：自己給的能力值不能幫自己過關；失效的不給能力值 */
    const self = itm('c_plate', [{ k: 'str', v: 8, T: 1 }]);
    const o4 = stats(mk({ chest: self }));
    out.self = [o4.eqBad.join(), o4.str];
    /* 互相補對方需求的兩件：都有效、結果固定；少一件兩件都失效 */
    const A = itm('c_chain', [{ k: 'dex', v: 35, T: 1 }]), B = itm('g_shinobi', [{ k: 'str', v: 27, T: 1 }]);
    const o5 = stats(mk({ chest: A, gloves: B })), o5b = stats(mk({ chest: A, gloves: B }));
    out.mutual = [o5.eqBad.length, o5.str, o5.dex, o5b.str === o5.str && o5b.eqBad.length === o5.eqBad.length, stats(mk({ chest: A })).eqBad.join()];
    /* 等級需求：lv 5 穿不了 lv 11 的大鎧，就算能力值夠 */
    out.lvq = stats(mk({ chest: plate, ring1: ring([{ k: 'attrA', v: 30, T: 1 }]) }, [], {}, 5)).eqBad.join();
    /* 失效的武器當作沒拿（空手） */
    const wp = mkItem(wk('mace')[5].id, 1, 0);
    out.wp = [stats(mk({ weapon: wp })).eqBad.join(), stats(mk({ weapon: wp })).dmg.join() === stats(mk({})).dmg.join()];
    /* 全能力值詞綴＋裝備給的能力值進力量 → 生命 */
    const o6 = stats(mk({ ring1: ring([{ k: 'attrA', v: 10, T: 1 }]), ring2: ring([{ k: 'str', v: 5, T: 1 }]) }));
    out.give = [o6.str, o6.dex, o6.int, o6.hp - o0.hp - 12];
    S = S0; ST = ST0;
    return out;
  })()`);
  ok(
    '能力值：起始各 10；1 力量 +2 生命、1 敏捷 +8 命中值、1 智慧 +2 魔力',
    b3.start.join() === '10,10,10,20,20,80',
    b3.start.join()
  );
  ok('過路點：全部是基礎點、各 +5 能力值', b3.pass[1] && b3.pass[0] === b3.pass[2] && b3.pass[0] > 200, b3.pass.join());
  ok(
    '過路點自選：敏捷 +5（命中 +40）、智慧 +5、沒選當力量 +5（生命 +10）',
    b3.pick.join() === '15,15,15,40,10',
    b3.pick.join()
  );
  ok(
    '能力值詞綴：範圍 [5,33]／全能力值 [2,13]、六個部位可出、全能力值只有項鍊',
    b3.aff.slice(0, 6).join('|') === '5,33|5,33|5,33|2,13|33|13' &&
      b3.aff[6] &&
      b3.aff[7] === 'amulet' &&
      b3.aff[8] === 'amulet,boots,gloves,helm,ring,weapon',
    JSON.stringify(b3.aff)
  );
  ok(
    '裝備需求：階級換算成等級 1～83，單系 1.6×等級、混合各 0.9×、飾品與腰帶沒有',
    b3.req.join('|') ===
      '1,2,0,0|56,90,0,0|39,35,35,0|6,0,0,10|61,0,98,0|0,0,0,0|0,0,0,0|0,0,0,0|67,107,0,0|67,0,0,107|78,125,0,0|1,0,2,0|28,25,25,0|45,0,0,72|78,70,0,70',
    b3.req.join('|')
  );
  ok(
    '寶石需求：單色 1.6×、輔助每顆各色 +5、輔助與光環沒有、雙色各 0.9×',
    b3.gem[0] === '0,0,22' &&
      b3.gem[1] === '0,0,32' &&
      b3.gem[4] === '0,0,0' &&
      b3.gem[5] === 1 &&
      b3.gem[6] === 0 &&
      !String(b3.gem[2]).startsWith('0,0,0') &&
      b3.two !== '0,0,0',
    JSON.stringify([b3.gem, b3.two])
  );
  ok(
    '不符合不能裝：缺什麼列得出來（力量 10／90）、點夠了就能裝、等級不夠也擋',
    b3.lack[0] === '力量|10|90' && b3.lack[1] === 0 && b3.lack[2] === '等級,力量',
    b3.lack.join(' / ')
  );
  ok(
    '不夠的留在原位但失效：不算數值、列在紅框清單、不自動拿下；點夠了就生效',
    b3.dead.join() === 'chest,0,true' && b3.live.join() === '0,true',
    JSON.stringify([b3.dead, b3.live])
  );
  ok(
    '不循環：自己給的能力值不能幫自己過關；互補的兩件都有效且結果固定',
    b3.self.join() === 'chest,10' && b3.mutual.join() === '0,37,45,true,chest',
    JSON.stringify([b3.self, b3.mutual])
  );
  ok('等級需求：等級不夠就算能力值夠也失效', b3.lvq === 'chest', b3.lvq);
  ok('失效的武器當作沒拿（空手）', b3.wp.join() === 'weapon,true', b3.wp.join());
  ok('裝備給的能力值：全能力值 +10 與力量 +5 → 力量 25、生命 +30', b3.give.join() === '25,20,20,30', b3.give.join());
  /* 0.2.42 第 5 批：偷取、補償、生命損失、獻祭 */
  const b5 = R(`(() => {
    const out = {}, h0 = ST.hp, m0 = ST.mp, e0 = ST.es, l0 = ST.leech;
    ST.hp = 1000; ST.mp = 1000; ST.es = 1000;
    Object.assign(G, { t: 100, state: 'play', allies: [], pools: [], meteors: [] });
    Object.assign(P, { hp: 500, mp: 500, es: 500, leech: null, recoup: null, tail: 7, lastHurt: -9 });
    /* 三種各自一筆、取最快的、1 秒回完 */
    leechAdd('hp', 100); leechAdd('hp', 50); leechAdd('hp', 200); leechAdd('mp', 10); leechAdd('es', 20);
    out.pick = [P.leech.hp.rate, P.leech.mp.rate, P.leech.es.rate];
    for (let i = 0; i < 10; i++) { G.t += 0.1; leechTick(0.1); }
    out.fin = [P.hp, P.mp, P.es].map(Math.round);
    G.t += 0.1; leechTick(0.1); out.done = [P.hp, P.mp, P.es].map(Math.round);
    out.gone = Object.keys(P.leech).length;
    /* 補滿清掉；沒用完的慢筆在快筆回完後才輪到 */
    P.hp = 995; leechAdd('hp', 100); G.t += 0.1; leechTick(0.1); out.full = [P.hp, P.leech.hp];
    leechAdd('hp', 100); G.t += 0.1; leechTick(0.1); out.cleared = !P.leech.hp;
    /* 來源相加：天賦 2% ＋ 輔助 3% */
    ST.leech = 2; const g = mkGem(Object.keys(SKILLS).find(k => SKILLS[k].t), 5); g.sup[0] = mkGem('leech', 1);
    out.sum = Math.round(gemCfg(g, 0).leech * 1000); ST.leech = l0;
    /* 補償：8 秒平均回、多筆並行、持續傷害（baseTick 的點燃）不算 */
    ST.recoupHp = 50; ST.recoupMp = 25; P.hp = 100; P.mp = 100; P.recoup = null; G.t = 200;
    recoupAdd(160);
    for (let i = 0; i < 40; i++) { G.t += 0.1; recoupTick(0.1); }
    out.r4 = [Math.round(P.hp), Math.round(P.mp)];
    for (let i = 0; i < 45; i++) { G.t += 0.1; recoupTick(0.1); } out.r8 = [Math.round(P.hp), Math.round(P.mp), P.recoup.length];
    P.hp = 100; P.recoup = null; G.t = 300; recoupAdd(80); G.t += 4; recoupAdd(80);
    for (let i = 0; i < 10; i++) { G.t += 0.1; recoupTick(0.1); } out.multi = [P.recoup.length, Math.round(P.hp - 100)];
    P.hp = 100; P.recoup = null; P.ail = { ign: { t: G.t + 5, dps: 10 } }; baseTick(1); out.dot = [P.recoup ? P.recoup.length : 0];
    P.ail = {}; ST.recoupHp = ST.recoupMp = 0;
    /* 生命損失：不經能量護盾、不清流順之風、致死寫死因 */
    P.hp = 500; P.es = 500; P.tail = 7; P.lastHurt = -9; loseLife(100);
    out.loss = [P.hp, P.es, P.tail, P.lastHurt];
    G.dead = 0; P.hp = 50; loseLife(80, '測試'); out.dead = [P.lastHit.n, P.hp <= 0];
    loseLife(0); P.hp = 500; out.noop = P.hp;
    /* 獻祭：不夠回 false 不扣、生命不低於 1 */
    P.hp = 100; P.mp = 30; P.es = 10;
    out.sac = [sacrifice('mp', 31), P.mp, sacrifice('mp', 30), P.mp, sacrifice('es', 11), sacrifice('hp', 99), P.hp, sacrifice('hp', 98), P.hp];
    /* 血魔法行為不變：生命不夠施放；夠就扣生命 */
    ST.blood = 1; P.cds = {}; const c = { mp: 99, D: {}, k: 'x' };
    P.hp = 100; out.bl = [skillWhy(c, P)]; P.hp = 101; out.bl.push(skillWhy(c, P)); skillPay(c, 0); out.bl.push(P.hp); ST.blood = 0;
    ST.hp = h0; ST.mp = m0; ST.es = e0; P.hp = h0; P.mp = m0; G.state = 'play';
    return out;
  })()`);
  ok('偷取：三種各自一筆、取最快的', b5.pick.join() === '200,10,20', b5.pick.join());
  ok(
    '偷取：1 秒回完（200／10／20 各回 1 秒），回完就清掉',
    b5.fin.join() === '700,510,520' && b5.gone === 0,
    JSON.stringify([b5.fin, b5.gone])
  );
  ok(
    '偷取：補滿清掉、來源相加（天賦 2% ＋ 輔助 3%）',
    b5.cleared && b5.sum === 50,
    JSON.stringify([b5.full, b5.cleared, b5.sum])
  );
  ok(
    '補償：8 秒平均回（生命 160×50%＝80、魔力 40），8 秒後清掉',
    b5.r4.join() === '140,120' && b5.r8.join() === '180,140,0',
    JSON.stringify([b5.r4, b5.r8])
  );
  ok(
    '補償：多筆並行各自計時、持續傷害不算',
    b5.multi.join() === '4,10' && b5.dot[0] === 0,
    JSON.stringify([b5.multi, b5.dot])
  );
  ok(
    '生命損失：不經能量護盾、不清流順之風、不算被擊中；會致死寫死因',
    b5.loss.join() === '400,500,7,-9' && b5.dead.join() === '測試,true' && b5.noop === 500,
    JSON.stringify([b5.loss, b5.dead])
  );
  ok(
    '獻祭：不夠回 false 不扣、生命不低於 1',
    b5.sac.join() === 'false,30,true,0,false,false,100,true,2',
    b5.sac.join()
  );
  ok('血魔法：生命 ≤ 費用＋1 不能放、夠就扣生命（101 付 99 剩 2）', b5.bl.join() === '生命不夠施放,,2', b5.bl.join());
  /* 0.2.42 第 8 批：盛怒偷取、友方偷取、生命充能、能量護盾保護魔力、傷害吸收、適應 */
  const b8 = R(`(() => {
    const out = {}, st0 = { ...ST }, p0 = { ...P }, g0 = { t: G.t, scene: G.scene, mapT: G.mapT, mm: G.mm, mobs: G.mobs, allies: G.allies, state: G.state };
    Object.assign(ST, { hp: 1000, mp: 1000, es: 1000, leech: 0, rageLeech: 0, allyLeech: 0, lifeRec: 0, esMana: 0, adapt: 0, defl: 0, armor: 0, physAsFire: 0, bv: 0, ev: 0, block: 0, heavyShield: 0,
      res: { fire: 0, cold: 0, light: 0, chaos: 0 }, maxRes: { fire: 75, cold: 75, light: 75, chaos: 75 } });
    Object.assign(G, { t: 100, scene: 'hide', mm: null, mobs: [], allies: [], state: 'play' });
    Object.assign(P, { hp: 500, mp: 500, es: 500, rage: 0, rageT: 0, leech: null, ail: {}, guardV: 0, bv: 0, bvRe: null, adapt: {}, lifeLost: -9, tail: 0, evE: null });
    /* 盛怒偷取：直接當盛怒點數、取最快一筆、1 秒回完、小數不被捨去、重設消退計時、滿了清掉 */
    leechAdd('rage', 4); leechAdd('rage', 12); leechAdd('rage', 6);
    for (let i = 0; i < 10; i++) { G.t += 0.1; leechTick(0.1); }
    out.rage = [Math.round(P.rage * 100) / 100, Math.abs(P.rageT - G.t) < 1e-9];
    G.t += 0.1; leechTick(0.1); out.rageGone = !(P.leech && P.leech.rage);
    P.rage = 0; P.leech = null; leechAdd('rage', 0.3); for (let i = 0; i < 10; i++) { G.t += 0.1; leechTick(0.1); } out.small = Math.round(P.rage * 1000) / 1000;
    P.rage = 29.9; leechAdd('rage', 5); G.t += 0.1; leechTick(0.1); out.cap = P.rage; G.t += 0.1; leechTick(0.1); out.capGone = !P.leech.rage;
    P.rage = 0.5; P.rageT = 0; baseTick(0.25); out.dec = P.rage;
    /* 友方偷取：開才偷、用你的生命偷取總值（c.leech，不吃地圖詞加成）、每隻自己一筆 */
    const D = Object.values(MOBS)[0],
      mk = () => ({ D, x: P.x + 40, y: P.y, r: 12, sz: 20, hp: 1e9, mhp: 1e9, arm: 0, arm0: 0, ev: 0, vx: 0, vy: 0, aggro: 1, res: { fire: 0, cold: 0, light: 0, chaos: 0 }, ail: {} }),
      cf = { ...gemCfg(mkGem('split', 5), 0), leech: 0.1 }, w = { hp: 100, mhp: 1000, leech: null }, w2 = { hp: 100, mhp: 1000, leech: null };
    G.allies = [w, w2]; ST.noCrit = 1; ST.noMiss = 1; G.mm = { pleech: 200 };
    const hitW = a => { const m = mk(); hitMob(m, cf, 0, 0, { quiet: 1, minion: 1, from: a }); return 1e9 - m.hp; };
    let dd = hitW(w); out.allyOff = !w.leech;
    ST.allyLeech = 1; dd = hitW(w); out.allyRate = Math.abs(w.leech.hp.rate - dd * 0.1) < 1e-6 && !w2.leech;
    for (let i = 0; i < 10; i++) { G.t += 0.1; leechTick(0.1, w, [['hp', w.mhp]]); }
    out.allyHeal = Math.abs(w.hp - (100 + dd * 0.1)) < 1e-6;
    ST.dmg = [100, 100]; P.rage = 10; ST.rageEff = 0; const r0d = hitCalc(cf, mk(), { keep: 1 }).d; ST.rageEff = 100; const r1d = hitCalc(cf, mk(), { keep: 1 }).d; ST.rageEff = 0;
    out.rageEff = Math.round((r1d / r0d) * 1000) / 1000;
    ST.rageMax = 20; P.rage = 29; P.rageT = G.t; P.leech = null; leechAdd('rage', 100); G.t += 0.1; leechTick(0.1); out.rageMax = [P.rage, rageCap(), !!P.leech.rage]; ST.rageMax = 0; P.rage = 0; P.leech = null;
    G.mm = null;
    /* 生命充能：失去生命後 4 秒才開始，每秒 x%；再失去就重設 */
    ST.lifeRec = 10; P.hp = 500; G.t = 200; P.lifeLost = 200;
    G.t = 203.9; lifeRecTick(1); out.lr1 = P.hp;
    G.t = 204.1; lifeRecTick(1); out.lr2 = P.hp;
    loseLife(1); out.lr3 = P.lifeLost === G.t; const h3 = P.hp; G.t += 3; lifeRecTick(1); out.lr4 = P.hp === h3;
    G.t += 1.5; lifeRecTick(0.5); out.lr5 = Math.round(P.hp - h3);
    ST.lifeRec = 0; P.hp = 500;
    /* 能量護盾保護魔力：傷害直接扣生命；費用先扣護盾；能不能放看護盾＋魔力 */
    Object.assign(P, { hp: 1000, mp: 20, es: 100, x: 0, y: 0 }); G.t = 300; P.iuntil = 0; P.roll = null; G.slow = 0;
    ST.esMana = 0; out.hurtOff = [esAbsorb(50), P.es];
    ST.esMana = 1; P.es = 100; out.hurtOn = [esAbsorb(50), P.es];
    const sc = { mp: 60, D: {}, k: 'x' };
    out.why = [skillWhy(sc, P), (ST.esMana = 0, skillWhy(sc, P))]; ST.esMana = 1;
    P.cds = {}; skillPay(sc, 0); out.pay = [P.es, P.mp];
    const sc2 = { ...sc, mp: 40 }; P.mp = 20; P.es = 30; out.why2 = skillWhy(sc2, P); skillPay(sc2, 0); out.pay2 = [P.es, P.mp];
    ST.esMana = 0;
    /* 傷害吸收：格擋值（40%）→ 守護 → 護盾 → 生命；數值跟舊的一樣 */
    ST.bv = 100; P.bv = 100; P.bvRe = null; P.guardV = 30; P.es = 20; P.hp = 1000; P.ail = {};
    out.ab = [absorb(100), P.bv, P.guardV];
    P.bv = 100; P.guardV = 30; P.ail = { hstun: G.t + 5 }; out.abStun = [absorb(100), P.bv, P.guardV]; P.ail = {};
    P.bv = 100; P.guardV = 30; P.es = 20; P.hp -= esAbsorb(absorb(100)); out.abFlow = [Math.round(P.bv), P.guardV, P.es, P.hp];
    ST.bv = 0; P.bv = 0; P.guardV = 0;
    /* 適應：取最高的元素、每層 −10%、最多 5 層、沒開關不獲得、清除在進出地圖 */
    P.adapt = {}; ST.adapt = 0; hurtCalc(100, null, 'fire', 1); out.noAd = Object.keys(P.adapt).length;
    ST.adapt = 1; const f0 = hurtCalc(100, null, 'fire', 1).d; out.ad1 = [f0, P.adapt.fire];
    const f1 = hurtCalc(100, null, 'fire', 1).d; out.ad2 = [Math.round(f1 * 10) / 10, P.adapt.fire, hurtCalc(100, null, 'cold', 1).d];
    for (let i = 0; i < 9; i++) hurtCalc(100, null, 'fire', 1);
    out.ad5 = [P.adapt.fire, Math.round(hurtCalc(100, null, 'fire', 1).d * 10) / 10, P.adapt.cold, hurtCalc(100, null, 'chaos', 1).d, P.adapt.chaos];
    P.adapt = {}; ST.physAsFire = 100; const pf = hurtCalc(100, null, 'phys', 1).d; out.mix = [Math.round(pf), Object.keys(P.adapt).join()];
    P.adapt = { fire: 1 }; ST.physAsFire = 50; out.conv = [Math.round(hurtCalc(1000, null, 'phys', 1).d), P.adapt.fire]; P.adapt = {}; ST.physAsFire = 0; hurtCalc(1000, null, 'phys', 1); out.pure = Object.keys(P.adapt).length;
    ST.physAsFire = 0; G.mm = { addC: 150 }; P.adapt = {}; hurtCalc(100, null, 'fire', 1); out.top = Object.keys(P.adapt).join(); G.mm = null;
    P.adapt = { fire: 3 }; skillsEnter(); out.clear = Object.keys(P.adapt).length;
    Object.assign(ST, st0); Object.assign(P, p0); Object.assign(G, g0);
    return out;
  })()`);
  ok(
    '盛怒偷取：取最快一筆、1 秒回完、重設消退計時、滿了清掉、小數保留、消退不會變負',
    b8.rage.join() === '12,true' && b8.rageGone && b8.small === 0.3 && b8.cap === 30 && b8.capGone && b8.dec === 0,
    JSON.stringify([b8.rage, b8.rageGone, b8.small, b8.cap, b8.capGone, b8.dec])
  );
  ok(
    '友方偷取：關著不偷、開著用你的生命偷取總值（不吃地圖詞）、每隻一筆、1 秒回完',
    b8.allyOff && b8.allyRate && b8.allyHeal,
    JSON.stringify([b8.allyOff, b8.allyRate, b8.allyHeal])
  );
  ok(
    '生命充能：失去生命 4 秒後才開始、每秒 10%、再失去生命重設延遲',
    b8.lr1 === 500 && b8.lr2 === 600 && b8.lr3 && b8.lr4 && b8.lr5 === 50,
    JSON.stringify([b8.lr1, b8.lr2, b8.lr3, b8.lr4, b8.lr5])
  );
  ok(
    '能量護盾保護魔力：傷害直接扣生命、費用先扣護盾再扣魔力、能不能放看護盾＋魔力',
    b8.hurtOff.join() === '0,50' &&
      b8.hurtOn.join() === '50,100' &&
      b8.why.join() === ',魔力不足' &&
      b8.pay.join() === '40,20' &&
      b8.why2 === '' &&
      b8.pay2.join() === '0,10',
    JSON.stringify([b8.hurtOff, b8.hurtOn, b8.why, b8.pay, b8.why2, b8.pay2])
  );
  ok(
    '傷害吸收：格擋值 40% → 守護 → 能量護盾 → 生命（數值同舊）；沉重暈眩中格擋值不吸收',
    b8.ab.join() === '30,60,0' && b8.abStun.join() === '70,100,0' && b8.abFlow.join() === '60,0,0,990',
    JSON.stringify([b8.ab, b8.abStun, b8.abFlow])
  );
  ok(
    '適應：沒開關不獲得；取最高元素 +1 層、每層 −10%、最多 5 層、三種各自、混沌不算；進出地圖清掉',
    b8.noAd === 0 &&
      b8.ad1.join() === '100,1' &&
      b8.ad2.join() === '90,2,100' &&
      b8.ad5.join() === '5,50,1,100,' &&
      b8.mix[0] === 100 &&
      b8.mix[1] === 'fire' &&
      b8.top === 'cold' &&
      b8.conv.join() === '950,2' &&
      b8.pure === 0 &&
      b8.rageEff === 1.091 &&
      b8.rageMax.join() === '39,50,true' &&
      b8.clear === 0,
    JSON.stringify([
      b8.noAd,
      b8.ad1,
      b8.ad2,
      b8.ad5,
      b8.mix,
      b8.top,
      b8.clear,
      b8.conv,
      b8.pure,
      b8.rageEff,
      b8.rageMax
    ])
  );
  /* 0.2.42 第 6 批：撲殺、屠戮打擊、幸運、荊棘、偏斜 */
  const b6 = R(`(() => {
    const out = {}, r0 = Math.random, st0 = { ...ST }, t0 = G.t, p0 = { ...P };
    const seq = a => { let i = 0; Math.random = () => a[i++ % a.length]; };
    globalThis.aggroPack = () => {}; globalThis.killMob = m => { m.dead = 1; };
    /* roll：幸運取好的、不幸取壞的、兩者都有抵消（只擲一次） */
    seq([0.9, 0.1]); out.lucky = roll(50, 1);
    seq([0.9, 0.1]); out.plain = roll(50);
    seq([0.1, 0.9]); out.unl = roll(50, -1);
    seq([0.1, 0.1]); out.unl2 = roll(50, 0, 1);
    seq([0.9, 0.1]); out.cancel = roll(50, 1, 1);
    Math.random = r0;
    out.eff = [effCh(50, 1), effCh(50, 0, 1), effCh(50, 1, 1), effCh(150, 1)];
    out.cap = [capLuck(40, 50, 1), capLuck(20, 50, 1)].map(Math.round);
    /* 閃避仍是熵值：不管亂數，100 次剛好躲掉 95 次（命中率 5%） */
    Math.random = () => 0.5; Object.assign(ST, { ev: 1e9, defl: 0, block: 0, armor: 0, physAsFire: 0, lukBlock: 0, lukDefl: 0 }); P.ail = {}; P.evE = 0; P.tail = 0;
    let evs = 0; for (let i = 0; i < 100; i++) if (hurtCalc(100, null, 'phys', 0).ev) evs++;
    out.ent = evs;
    /* 偏斜公式 */
    out.dc = [deflCh(100, 0), Math.round(deflCh(100, 1000) * 10) / 10, Math.round(deflCh(100, 1e9)), Math.round(capLuck(deflCh(100, 1000), 95, 1)), Math.round(capLuck(deflCh(100, 1e9), 95, 1))];
    /* 偏斜：−40%、流順之風每層 +1%、紅光大招（noEv）也有效；閃避先判定 */
    ST.ev = 0; ST.defl = 1e9;
    out.d0 = hurtCalc(100, null, 'phys', 0).d;
    P.tail = 10; out.d10 = hurtCalc(100, null, 'phys', 1).d; P.tail = 0;
    ST.defl = 0; out.dn = hurtCalc(100, null, 'phys', 1).d;
    ST.ev = 1e9; ST.defl = 1e9; P.evE = null; const rr = hurtCalc(100, null, 'phys', 0); out.first = [rr.ev, rr.defl];
    Object.assign(ST, st0); P.evE = p0.evE;
    /* 撲殺：普通 35%、菁英 10%、王 5%；屠戮打擊：只對滿血、上限照稀有度 */
    ST.cull = 1;
    const mk = (hp, o = {}) => ({ hp, mhp: 100, ...o });
    out.cull = [mk(34), mk(35), mk(9, { elite: 1 }), mk(10, { elite: 1 }), mk(4, { boss: 1 }), mk(5, { boss: 1 }), mk(0)].map(m => culled(m));
    ST.cull = 0; out.cull0 = culled(mk(1));
    ST.fullStrike = 50;
    out.fs = [mk(100), mk(100, { elite: 1 }), mk(100, { boss: 1 }), mk(99)].map(m => fullCut(m));
    ST.fullStrike = 10; out.fs10 = fullCut(mk(100, { elite: 1 }));
    ST.fullStrike = 0; out.fs0 = fullCut(mk(100));
    /* 荊棘：不吃攻擊、法術、全傷害提高，吃荊棘提高與護甲；近戰才反擊、0.3 秒一次 */
    Object.assign(ST, { thornAdd: [100, 100], thornP: 50, atkP: 100, spellP: 100, dmgA: 100, meleeP: 100 });
    const tm = a => ({ hp: 1000, arm: a, x: 0, y: 0, sz: 10, D: { ai: 'melee' } });
    out.th = [thornDmg(tm(0)), Math.round(thornDmg(tm(1000)))];
    ST.thornP = 0; out.th0 = thornDmg(tm(0)); ST.thornP = 50;
    G.t = 100; const a1 = tm(0), a2 = { ...tm(0), D: { ai: 'ranged' } }, a3 = { ...tm(0), hp: 100 };
    thornHit(a1); thornHit(a1); out.t1 = a1.hp; G.t = 100.31; thornHit(a1); out.t2 = a1.hp;
    thornHit(a2); thornHit({ D: undefined, hp: 5 }); thornHit(null); out.t3 = a2.hp;
    thornHit(a3); out.t4 = [a3.hp <= 0, a3.dead];
    ST.thornAdd = [0, 0]; const a4 = tm(0); thornHit(a4); out.t5 = a4.hp;
    Object.assign(ST, st0); G.t = t0;
    /* 來源：胸甲詞綴「附加荊棘物理傷害」只有胸甲；獲得閃避當作偏斜值 */
    out.kinds = Object.keys(KINDS).filter(k => KINDS[k].aff.includes('thorn')).join();
    S.eq.chest = mkItem(BASES.find(b => b.k === 'chest').id, 10, 0); S.eq.chest.a = [{ k: 'thorn', v: [10, 20], T: 1 }, { k: 'ev', v: 200, T: 1 }];
    const s0 = stats(S); out.thornAff = s0.thornAdd.join();
    PTREE.I.zz = { s: { evAsDefl: 50 } };
    const s1 = stats({ ...S, pt: [...S.pt, 'zz'] });
    delete PTREE.I.zz; delete S.eq.chest;
    out.dfl = [s0.defl, Math.round(s1.defl), Math.round(s1.ev / 2)];
    P.tail = p0.tail; Math.random = r0;
    return out;
  })()`);
  ok(
    'roll：幸運取好的、不幸取壞的、兩者都有抵消',
    b6.lucky === true && b6.plain === false && b6.unl === false && b6.unl2 === true && b6.cancel === false,
    JSON.stringify([b6.lucky, b6.plain, b6.unl, b6.unl2, b6.cancel])
  );
  ok(
    '有效機率：幸運 50→75、不幸 50→25、兩者都有 50；上限在幸運之後（40→64→50、20→36）',
    b6.eff.join() === '75,25,50,100' && b6.cap.join() === '50,36',
    JSON.stringify([b6.eff, b6.cap])
  );
  ok('閃避仍是熵值：命中率 5% 不管亂數，100 次剛好躲 95 次', b6.ent === 95, b6.ent);
  ok(
    '偏斜公式：沒偏斜值 0%、命中 100／偏斜 1000＝81.8%、極大 150%；上限 95%（幸運後也是 95）',
    b6.dc.join() === '0,81.8,150,95,95',
    b6.dc.join()
  );
  ok(
    '偏斜：傷害 −40%、流順之風 10 層 −50%、紅光大招也偏斜、沒有偏斜值不減；閃避先判定',
    b6.d0 === 60 && b6.d10 === 50 && b6.dn === 100 && b6.first.join() === '1,',
    JSON.stringify([b6.d0, b6.d10, b6.dn, b6.first])
  );
  ok(
    '撲殺：普通 <35%、菁英 <10%、王 <5% 直接死；沒有能力或已死不觸發',
    b6.cull.join() === 'true,false,true,false,true,false,false' && b6.cull0 === false,
    b6.cull.join()
  );
  ok(
    '屠戮打擊：只對滿血、上限 普通 30%／菁英 15%／王 5%、x 比上限小就用 x',
    b6.fs.join() === '30,15,5,0' && b6.fs10 === 10 && b6.fs0 === 0,
    JSON.stringify([b6.fs, b6.fs10, b6.fs0])
  );
  ok(
    '荊棘：不吃攻擊、法術、全傷害提高，吃荊棘傷害提高（100→150）與護甲',
    b6.th[0] === 150 && b6.th[1] === 90 && b6.th0 === 100,
    JSON.stringify([b6.th, b6.th0])
  );
  ok(
    '荊棘反擊：近戰怪、同一隻 0.3 秒一次；遠程、沒怪不反擊；打死會殺；沒荊棘傷害不觸發',
    b6.t1 === 850 && b6.t2 === 700 && b6.t3 === 1000 && b6.t4.join() === 'true,1' && b6.t5 === 1000,
    JSON.stringify([b6.t1, b6.t2, b6.t3, b6.t4, b6.t5])
  );
  ok(
    '荊棘與偏斜的來源：只有胸甲出荊棘詞（算進 thornAdd）、獲得基礎閃避的 50% 當作偏斜值',
    b6.kinds === 'chest' && b6.thornAff === '10,20' && b6.dfl[0] === 0 && b6.dfl[1] > 0 && b6.dfl[1] === b6.dfl[2],
    JSON.stringify([b6.kinds, b6.thornAff, b6.dfl])
  );
  const src = fs
    .readdirSync(path.join(__dirname, '..', 'js'))
    .filter(f => f.endsWith('.js') && f !== 'art.js')
    .map(f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'))
    .join('\n');
  ok(
    '機率都走 roll：沒有殘留的 Math.random() * 100 <',
    !/Math\.random\(\) \* 100 </.test(src.replace(/function roll[\s\S]*?\r?\n}\r?\n/, ''))
  );
}
/* 0.2.42 第 7 批：技能分類標籤、跟標籤的傷害池、持續時間、tAdd、條件函式、格擋值＝盾的護甲×（1＋更多）、鐵金剛三個點 */
{
  const c3 = { console, Math, Date, JSON, Object, Array, Set, location: { search: '' }, URLSearchParams };
  vm.createContext(c3);
  for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'mech.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), c3, { filename: f });
  const R = s => vm.runInContext(s, c3);
  R(`var G = { t: 1, mapT: 1, scene: 'map', state: 'play', mobs: [], pools: [], shots: [], grenades: [], units: [], ground: [], W: 2000, H: 2000 }, P = { x: 0, y: 0, cds: {}, mp: 1e4, hp: 100, ail: {} }, S, ST, TOUCH = { on: 0 };
     const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
     const num = () => {}, fx = () => {}, fxs = () => {}, sfx = () => {}, hudWarn = t => (G.warn = t), die = () => {}, los = () => true, open = () => true, floorNear = () => null;`);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'skills.js'), 'utf8'), c3, {
    filename: 'skills.js'
  });
  R(
    `S = { lv: 60, eq: {}, pt: [...PT_START], asc: null, at: [], auras: [], charms: [], skills: [0, 1, 2, 3, 4].map(() => ({ a: null })) }; S.eq.weapon = mkItem('w_mace1_0', 10, 0); S.eq.off = mkItem(BASES.find(b => b.k === 'shield').id, 10, 0); S.eq.ring1 = mkItem('r_iron', 10, 0); S.eq.ring1.a = [{ k: 'attrA', v: 99, T: 1 }]; ST = stats(S);`
  );
  const hudSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'hud.js'), 'utf8');
  /* 1. 分類標籤 */
  const cl = R(`(() => {
    const ks = Object.keys(SKILLS), has = (k, t) => SKILLS[k].tags.includes(t), tg = k => SKILLS[k].tags, out = {};
    const NEW = ['strike', 'slam', 'nova', 'duration', 'sustained', 'remote', 'repeat', 'stack', 'cond', 'channel', 'orb', 'herald', 'payoff', 'grenade', 'banner', 'wind', 'storm', 'cascade', 'final', 'temp'];
    out.badTag = Object.values(CLS_TAGS).flatMap(v => v.split(' ')).filter(t => !NEW.includes(t));
    out.both = ks.filter(k => has(k, 'strike') && has(k, 'slam'));
    out.stray = ks.filter(k => (has(k, 'strike') || has(k, 'slam')) && !has(k, 'melee'));
    out.melee = ks.filter(k => has(k, 'melee') && !has(k, 'strike') && !has(k, 'slam'));
    out.slamNoAoe = ks.filter(k => has(k, 'slam') && !has(k, 'aoe'));
    out.strikeAoe = ks.filter(k => has(k, 'strike') && has(k, 'aoe'));
    out.dur = ks.filter(k => has(k, 'duration') !== !!SKILLS[k].dur);
    out.remote = ks.filter(k => has(k, 'remote')).join();
    out.unitNoRemote = ks.filter(k => SKILLS[k].unit && !has(k, 'remote'));
    out.minionRemote = ks.filter(k => has(k, 'minion') && has(k, 'remote'));
    out.cond = ks.filter(k => has(k, 'cond')).join();
    out.channel = ks.filter(k => has(k, 'channel'));
    out.nova = ks.filter(k => has(k, 'nova')).join();
    out.sust = ks.filter(k => has(k, 'sustained')).join();
    out.n = ks.filter(k => NEW.some(t => has(k, t))).length;
    out.total = ks.length;
    return out;
  })()`);
  ok(
    '技能分類：標籤都在清單內、打擊與重擊互斥且只給近戰',
    !cl.badTag.length && !cl.both.length && !cl.stray.length,
    JSON.stringify([cl.badTag, cl.both, cl.stray])
  );
  ok(
    '技能分類：近戰技能不是打擊就是重擊（幻影斬是遠端）；重擊都有範圍（打擊照 poe2db 可以有範圍，例：旋風斬）',
    cl.melee.join() === 'mirage' && !cl.slamNoAoe.length,
    JSON.stringify([cl.melee, cl.slamNoAoe])
  );
  ok(
    '技能分類：持續時間標籤＝有 dur；遠端＝場上單位＋幻影、召喚物不算；引導目前沒有；新星、經久、條件使用',
    !cl.dur.length &&
      !cl.unitNoRemote.length &&
      !cl.minionRemote.length &&
      cl.remote === 'frosttrap,blastmine,ballista,firetotem,mirage' &&
      !cl.channel.length &&
      cl.nova === 'whirl,nova' &&
      cl.sust === 'venom,thunderstorm' &&
      cl.cond === 'shadowstrike,blindpounce,banner,corpseboom,paperdoll,wolfpounce,swordarray,snap,hexblast,profane',
    JSON.stringify(cl)
  );
  const tagN = [
    'strike',
    'slam',
    'nova',
    'duration',
    'sustained',
    'remote',
    'repeat',
    'stack',
    'cond',
    'channel'
  ].filter(t => !new RegExp('\\b' + t + ": '").test(hudSrc));
  ok(
    '技能分類：每個新標籤都有中文名（hud.js 的 TAGN）、名字是 TERMS 的鍵',
    !tagN.length &&
      R(
        `['打擊','重擊','新星技能','持續時間技能','經久技能','遠端技能','重複技能','獲得疊層的技能','條件使用','引導','公尺','增加技能使用時間','前期消耗','技能基礎攻擊時間','近期','被包圍','孤立','近距離','存在範圍'].every(k => TERMS[k])`
      ),
    tagN.join()
  );
  /* 2. 跟標籤的傷害提高：只對有標籤的技能 */
  const pool = R(`(() => {
    const nz = ['strikeP', 'slamP', 'novaP', 'sustP'], d = k => hitCalc(gemCfg(mkGem(k, 5), 0), null, { avg: 1, keep: 1 }).d, ks = ['slash', 'whirl', 'quake', 'nova', 'venom', 'fireball'], out = {};
    const base = Object.fromEntries(ks.map(k => [k, d(k)]));
    for (const s of nz) {
      ST[s] = 50;
      out[s] = ks.filter(k => d(k) > base[k] * 1.0001).join();
      ST[s] = 0;
    }
    return out;
  })()`);
  ok(
    '傷害池：打擊只給打擊技能、重擊只給重擊、新星只給新星、經久只給經久（沒標籤的不吃）',
    pool.strikeP === 'slash,whirl' && pool.slamP === 'quake' && pool.novaP === 'whirl,nova' && pool.sustP === 'venom',
    JSON.stringify(pool)
  );
  /* 3. 技能持續時間：只影響 duration 標籤；tAdd 不吃速度；技能基礎攻擊時間 */
  const du = R(`(() => {
    ST.durP = 50;
    const out = [], c = k => gemCfg(mkGem(k, 5), 0);
    out.push(durOf(c('venom')), durOf(c('ballista')), durOf({ D: { dur: 5, tags: ['proj'] } }), durOf(c('fireball')));
    G.pools = [];
    const cv = c('venom');
    actHit({ k: 'venom', c: cv, ang: 0, tx: 100, ty: 0, hits: [0], n: 0 }, 0);
    out.push(G.pools[0] && G.pools[0].dur);
    ST.durP = 0;
    out.push(durOf(c('venom')));
    return out;
  })()`);
  ok(
    '技能持續時間：毒刃雨 3→4.5、弩砲塔圖騰 10→15，沒有標籤的不變；毒刃雨真的放出 4.5 秒',
    du.join() === '4.5,15,5,0,4.5,3',
    du.join()
  );
  /* 0.2.46：原本寫死秒數的六類也吃技能持續時間（詛咒存的是倍率 dm） */
  const du2 = R(`(() => {
    ST.durP = 50;
    const c = k => gemCfg(mkGem(k, 5), 0),
      out = ['warcry', 'banner', 'gasarrow', 'mirage', 'paperdoll', 'cu_enfeeble'].map(k => durOf(c(k)));
    G.meteors = [];
    actHit({ k: 'cu_enfeeble', c: c('cu_enfeeble'), ang: 0, tx: 100, ty: 0, hits: [0], n: 0 }, 0);
    out.push(G.meteors[0] && G.meteors[0].dm);
    G.meteors = [];
    /* 真的放一次：威嚇掛在怪身上的秒數、鬥旗插多久 */
    const mob = { hp: 1, x: P.x + 10, y: P.y, r: 10, ail: {} }, mobs0 = G.mobs, rage0 = P.rage;
    G.mobs = [mob];
    actHit({ k: 'warcry', c: c('warcry'), ang: 0, tx: 100, ty: 0, hits: [0], n: 0 }, 0);
    out.push(+(mob.ail.intim - G.t).toFixed(2));
    G.mobs = mobs0;
    P.rage = rage0;
    P.glory = 100;
    actHit({ k: 'banner', c: c('banner'), ang: 0, tx: 100, ty: 0, hits: [0], n: 0 }, 0);
    out.push(+(G.banner.t - G.t).toFixed(2));
    G.banner = null;
    ST.durP = 0;
    return out;
  })()`);
  ok(
    '技能持續時間：威嚇、鬥旗、毒氣雲、幻影斬、紙人、詛咒也吃（詛咒 ×1.5；威嚇真的掛 6 秒、鬥旗真的插 15 秒）',
    du2.join() === '6,15,7.5,6,22.5,9,1.5,6,15',
    du2.join()
  );
  const ta = R(`(() => {
    const c = gemCfg(mkGem('slash', 5), 0), t = x => ({ ...c, D: { ...c.D, tAdd: x } }), out = [];
    const a0 = actDur(c);
    out.push(+(actDur(t(0.3)) - a0).toFixed(6));
    const asM = ST.asM; ST.asM = asM * 2;
    out.push(+(actDur(t(0.3)) - actDur(c)).toFixed(6), actDur(c) < a0);
    ST.asM = asM;
    out.push(+(actDur({ ...t(0.3), speed: 3 }) - actDur({ ...c, speed: 3 })).toFixed(6));
    const w = ST.waps; ST.waps = 1.1; out.push(+baseT(c).toFixed(6) === c.D.t); ST.waps = 2.2; out.push(+baseT(c).toFixed(6) === c.D.t / 2); ST.waps = w;
    out.push(baseT(gemCfg(mkGem('fireball', 5), 0)) === SKILLS.fireball.t);
    return out;
  })()`);
  ok(
    '增加技能使用時間：固定 +0.3 秒，攻速加倍、技能速度 ×3 都不變；基礎攻擊時間＝t ÷（武器每秒攻擊 ÷ 1.1）、法術就是 t',
    ta.join() === '0.3,0.3,true,0.3,true,true,true',
    ta.join()
  );
  /* 4. 條件 */
  const cd = R(`(() => {
    const out = [], mob = (x, y, o = {}) => ({ x, y, hp: 10, ail: {}, ...o });
    P.x = 0; P.y = 0; P.ev = null; G.t = 100;
    out.push(recent('kill'));
    evMark('kill'); evMark('hit');
    G.t = 104; out.push(recent('kill'), recent('crit'));
    G.t = 104.01; out.push(recent('kill'));
    G.t = 50; out.push(recent('kill'));
    G.t = 103.5; const g = mkGem('slash', 5); g.sup[0] = mkGem('haste', 1); g.sup[0].q = 20;
    const sp = () => gemCfg(g, 0).speed; out.push(+sp().toFixed(4)); G.t = 104.1; out.push(+sp().toFixed(4));
    const ring = n => Array.from({ length: n }, (_, i) => mob(80 * Math.cos(i), 80 * Math.sin(i)));
    G.mobs = ring(5); out.push(surrounded());
    G.mobs = ring(4); out.push(surrounded());
    G.mobs = [...ring(4), mob(91, 0)]; out.push(surrounded());
    G.mobs = [...ring(4), mob(60, 0, { arrow: 1 })]; out.push(surrounded());
    G.mobs = [...ring(4), mob(60, 0, { hp: 0 })]; out.push(surrounded());
    const m = mob(500, 0);
    G.mobs = [m, mob(680, 0)]; out.push(isolated(m));
    G.mobs = [m, mob(681, 0)]; out.push(isolated(m));
    G.mobs = [m, mob(500, 100, { arrow: 1 }), mob(500, 100, { hp: 0 })]; out.push(isolated(m));
    out.push(closeRange(mob(60, 0)), closeRange(mob(61, 0)), presence(120, 0), presence(121, 0), presence(0, -120));
    return out;
  })()`);
  ok(
    '條件：近期＝4 秒（擊殺、擊中各自記、沒記的不算、時間倒退不算）；連擊輔助的品質改吃近期擊殺（3.5 秒還在、4.1 秒沒了）',
    cd.slice(0, 4).join() === 'false,true,false,false' && cd[4] === false && cd[5] === 1.4375 && cd[6] === 1.25,
    cd.slice(0, 7).join()
  );
  ok(
    '條件：被包圍＝3 公尺內至少 5 隻（箭矢、死掉的不算）；孤立＝6 公尺內沒有其他怪；近距離 2 公尺；存在範圍 4 公尺',
    cd.slice(7).join() === 'true,false,false,false,false,false,true,true,true,false,true,false,true',
    cd.slice(7).join()
  );
  /* 5. 格擋值＝盾上的護甲 ×（1＋盾的護甲更多）；鐵金剛三個點 */
  const bv = R(`(() => {
    const sh = S.eq.off, base = Math.round((baseOf(sh).b.armor || 0) * qMul(sh)) + sh.a.reduce((t, a) => t + (a.k === 'armor' ? a.v : 0), 0), out = [base, stats(S).bv];
    S.asc = 'iron';
    for (const at of [['a_st', 'a_s1', 'a_wall'], ['a_st', 'a_s1', 'a_wall', 'a_s2'], ['a_st', 'a_s1', 'a_wall', 'a_s2', 'a_push']]) {
      S.at = at; const o = stats(S); out.push(o.bv, o.shArmMore, o.heavyShield, o.block);
    }
    const armIron = stats(S).armor;
    S.at = ['a_st', 'a_s1']; const arm1 = stats(S).armor;
    S.asc = null; S.at = [];
    out.push(armIron > arm1, arm1 > stats(S).armor);
    return out;
  })()`);
  const b0 = bv[0];
  ok('格擋值：沒昇華＝盾上的護甲（基底護甲×品質＋護甲詞）', b0 > 0 && bv[1] === b0, bv.slice(0, 2).join());
  ok(
    '鐵金剛：鐵壁之盾 ×2、小點再 +25%（×2.25）、重盾前進再 +100%（×3.25，不再翻倍），格擋值＝盾的護甲×（1＋更多）；重盾前進保留吸收 60%；鐵壁之盾仍是格擋機率減半',
    bv[2] === b0 * 2 &&
      bv[3] === 100 &&
      bv[4] === 0 &&
      bv[6] === Math.round(b0 * 2.25) &&
      bv[7] === 125 &&
      bv[8] === 0 &&
      bv[10] === Math.round(b0 * 3.25) &&
      bv[11] === 225 &&
      bv[12] === 1 &&
      bv[5] === bv[13],
    JSON.stringify(bv)
  );
  ok('盾的護甲更多也加進角色護甲（點越多護甲越高）', bv[14] && bv[15], bv.slice(14).join());
  ok(
    'blockValP 已拿掉：沒有這個能力、STATN 與圖示表都沒有',
    !R(`'blockValP' in ST || 'blockValP' in STATN || 'blockValP' in PT_STAT_IC`),
    ''
  );
  /* 0.2.43 第 9 批：異常備份佇列與加劇、惡化點燃、無視抗性、有助於異常的傷害、空手、分岔／絕對暴擊、滿溢機率、溢出／最後一擊／殘暴打擊 */
  const b9 = R(`(() => {
    const out = {}, D = Object.values(MOBS)[0],
      mk = (o = {}) => ({ D, x: P.x + 40, y: P.y, r: 12, sz: 20, hp: 1e9, mhp: 1e9, arm: 0, arm0: 0, ev: 0, vx: 0, vy: 0, aggro: 1, res: { fire: 0, cold: 0, light: 0, chaos: 0 }, ail: {}, ...o }),
      loss = (m, t) => { G.t = t; const h = m.hp; ailTick(m, 1); return Math.round((h - m.hp) * 1000) / 1000; },
      st0 = { ...ST };
    Object.assign(ST, { noCrit: 1, noMiss: 1, aggHit: 0, aggIgn: 0, shaper: 0, ember: 0, ailMag: 0, bleedAll: 0, poiAll: 0, forkCrit: 0, inevCrit: 0, ignFire: 0, ignCold: 0, ignLight: 0, ignChaos: 0 });
    Object.assign(G, { t: 100, scene: 'map', mapT: 1, mm: null, mobs: [], allies: [], state: 'play' });
    /* 備份佇列：弱的備份在最強一筆結束後接手；強的後到變成最強、舊的退成備份；同強度刷新時間 */
    let m = mk(), a = m.ail;
    a.bleed = keepMax(a.bleed, 10, 5); a.bleed = keepMax(a.bleed, 4, 8);
    out.q1 = [a.bleed.dps, a.bleed.q.length, a.bleed.q[0].dps];
    a.bleed = keepMax(a.bleed, 20, 2);
    out.q2 = [a.bleed.dps, a.bleed.q.map(x => x.dps).join('/')];
    out.dmg = [loss(m, 101), loss(m, 103.5), loss(m, 106), a.bleed.dps, a.bleed.q.length, loss(m, 109)];
    G.t = 100; a.ign = keepMax(undefined, 10, 5); a.ign = keepMax(a.ign, 10, 8);
    out.same = [a.ign.t, a.ign.q.length];
    /* 點燃同樣是佇列（吃火焰抗性） */
    m = mk({ res: { fire: 50, cold: 0, light: 0, chaos: 0 } }); a = m.ail; G.t = 100;
    a.ign = keepMax(a.ign, 10, 2); a.ign = keepMax(a.ign, 6, 6);
    out.ign = [loss(m, 101), loss(m, 104), a.ign.dps, a.ign.q.length];
    /* 玩家身上也一樣（baseTick 的持續傷害） */
    G.t = 100; P.ail = {}; P.hp = 1e6; P.es = 0;
    P.ail.bleed = keepMax(P.ail.bleed, 10, 2); P.ail.bleed = keepMax(P.ail.bleed, 3, 6);
    const hp0 = P.hp; G.t = 100.5; baseTick(1); const l1 = hp0 - P.hp; G.t = 103; const h1 = P.hp; baseTick(1);
    out.player = [Math.round(l1 * 10) / 10, Math.round((h1 - P.hp) * 10) / 10];
    P.ail = {};
    /* 加劇：現有的每一筆都加劇（含備份）、再加劇回傳 false、新上的不算、已加劇的維持；流血 ×2（移動時不再加倍）、點燃 ×2 */
    G.t = 100; m = mk({ mv: 1 }); a = m.ail;
    a.bleed = keepMax(a.bleed, 10, 5); a.bleed = keepMax(a.bleed, 4, 8);
    out.agg0 = aggravate(mk(), 'bleed');
    out.agg1 = [aggravate(m, 'bleed'), aggravate(m, 'bleed'), a.bleed.agg, a.bleed.q[0].agg];
    a.bleed = keepMax(a.bleed, 3, 10);
    out.aggNew = [a.bleed.q.find(x => x.dps === 3).agg || 0, a.bleed.agg];
    out.aggDmg = [loss(m, 101), loss(m, 106), a.bleed.agg, loss(m, 109), a.bleed.agg || 0, a.bleed.dps];
    m = mk(); a = m.ail; G.t = 100;
    a.bleed = keepMax(a.bleed, 4, 8); aggravate(m, 'bleed'); a.bleed = keepMax(a.bleed, 5, 8);
    out.aggSort = [a.bleed.dps, a.bleed.agg || 0, a.bleed.q[0].dps];
    m = mk(); a = m.ail; G.t = 100; a.bleed = keepMax(a.bleed, 5, 8); a.ign = keepMax(a.ign, 10, 5);
    out.aggIgn0 = [aggBleed(m), a.ign.agg || 0];
    m = mk(); a = m.ail; G.t = 100; a.bleed = keepMax(a.bleed, 5, 8); a.ign = keepMax(a.ign, 10, 5);
    ST.aggIgn = 1; out.aggIgn1 = [aggBleed(m), a.ign.agg, loss(m, 101)]; out.aggIgn2 = [aggBleed(m), aggBleed(mk())];
    ST.aggIgn = 0;
    /* 移動目標：普通流血也 ×2，所以加劇 100 對普通 150 要打 300；靜止則加劇的 200 勝過 150 */
    const mb = mv => { const t = mk({ mv }); G.t = 100; t.ail.bleed = keepMax(t.ail.bleed, 100, 8); aggravate(t, 'bleed'); t.ail.bleed = keepMax(t.ail.bleed, 150, 8); t.ail.mark = { k: 'hound', t: 200 }; const h = t.ail.hs || 0; const l = loss(t, 101); return [l, Math.round(((t.ail.hs || 0) - h) * 1000) / 1000]; };
    out.mvBleed = [mb(1), mb(0)];
    /* 純元素擊中：bleedAll／poiAll 開才有流血、中毒；關閉時不變 */
    const pf = { phys: 0, fire: 50, cold: 0, light: 0, chaos: 0 }, rf = { pre: pf, post: pf }, cb = { D: { tags: ['attack'] }, q: 0, bleedCh: 100, poisonCh: 100 };
    const pureF = () => { const t = mk(); G.t = 100; applyAil(t, rf, cb, {}); return [!!t.ail.bleed, !!(t.ail.poi && t.ail.poi.length)]; };
    out.pure0 = pureF(); ST.bleedAll = 1; ST.poiAll = 1; out.pure1 = pureF(); ST.bleedAll = ST.poiAll = 0;
    G.t = 100;
    /* 惡化點燃：同一次使用再點燃同一目標，移除舊筆、新筆幅度 × 累計筆數 */
    const pre = { phys: 0, fire: 0.001, cold: 0, light: 0, chaos: 0 }, rr = { pre, post: pre }, ci = { D: { tags: [] }, q: 0, addIgn: 100 };
    const hitI = (m, c, use) => applyAil(m, rr, c, use);
    G.t = 100; m = mk(); a = m.ail; a.flam = 0;
    const u = {}, ca = { ...ci, compound: 1 };
    hitI(m, ca, u); const d1 = a.ign.dps; hitI(m, ca, u); const d2 = a.ign.dps; hitI(m, ca, u); const d3 = a.ign.dps;
    out.comp = [Math.round(d2 / d1 * 1000) / 1000, Math.round(d3 / d1 * 1000) / 1000, a.ign.q.length];
    hitI(m, ca, {}); out.compOther = [Math.round(a.ign.dps / d1 * 1000) / 1000, a.ign.q.length];
    m = mk(); hitI(m, ci, u); hitI(m, ci, u); hitI(m, ci, u); out.compOff = [Math.round(m.ail.ign.dps / d1 * 1000) / 1000, m.ail.ign.q.length];
    /* 有助於異常的傷害：預設表、火焰塑造者、其他開關 */
    const pp = { phys: 1, fire: 2, cold: 4, light: 8, chaos: 16 };
    out.base = [ailBase(pp, 'ign'), ailBase(pp, 'bleed'), ailBase(pp, 'poi')];
    ST.shaper = 1; out.shaper = ailBase(pp, 'ign'); ST.shaper = 0;
    ST.bleedAll = 1; ST.poiAll = 1; out.all = [ailBase(pp, 'bleed'), ailBase(pp, 'poi')]; ST.bleedAll = ST.poiAll = 0;
    /* 無視抗性：負抗性也不吃；其他種類不受影響 */
    const rm = mk({ res: { fire: -50, cold: 30, light: 0, chaos: -20 } });
    out.res0 = [resOf(rm, 'fire'), resOf(rm, 'cold'), resOf(rm, 'chaos')];
    ST.ignFire = 1; ST.ignChaos = 1; out.res1 = [resOf(rm, 'fire'), resOf(rm, 'fire', 20), resOf(rm, 'cold'), resOf(rm, 'chaos')];
    ST.ignFire = ST.ignChaos = 0;
    /* 空手：獨立類別、2～5、1.65、暴擊 5%；限定武器的技能不能用、預設攻擊斬擊可以 */
    const s0 = { lv: 1, eq: Object.fromEntries(EQS.map(e => [e.k, null])), pt: [], ptA: {}, asc: null, at: [], auras: [], charms: [] }, un = stats(s0);
    out.unarmed = [un.wt, un.dmg.join(), un.waps, un.crit];
    const wt0 = ST.wt; ST.wt = 'unarmed'; out.unW = [wtOK(SKILLS.slash), wtOK(SKILLS[Object.keys(SKILLS).find(k => SKILLS[k].wt && !SKILLS[k].wt.includes('sword'))])]; ST.wt = wt0;
    /* 暴擊：期望值（avg）跟實際擲骰的平均要一致 */
    const cf = gemCfg(mkGem('split', 5), 0), mc = (n) => { let t = 0; for (let i = 0; i < n; i++) t += hitCalc(cf, null, { keep: 1 }).d; return t / n; };
    ST.noCrit = 0; ST.dmg = [100, 100]; ST.wcrit = 30; ST.critInc = 0; ST.critX = 0; ST.lukCrit = 0; P.critNext = 0;
    const cr = {};
    for (const [k, f, i, l] of [['base', 0, 0, 0], ['fork', 1, 0, 0], ['inev', 0, 1, 0], ['both', 1, 1, 0], ['lucky', 1, 1, 1]]) {
      ST.forkCrit = f; ST.inevCrit = i; ST.lukCrit = l;
      const av = hitCalc(cf, null, { avg: 1, keep: 1 }).d, sm = mc(40000);
      cr[k] = [Math.round(av), Math.abs(sm / av - 1) < 0.02];
    }
    out.cr = cr;
    ST.wcrit = 0; ST.forkCrit = 1; ST.inevCrit = 1; ST.lukCrit = 0; const z = hitCalc(cf, null, { keep: 1 }); out.zero = [z.crit, hitCalc(cf, null, { avg: 1, keep: 1 }).ch];
    ST.forkCrit = ST.inevCrit = 0; ST.wcrit = 5; ST.noCrit = 1;
    /* 滿溢機率：215% ＝ 2 次，再 15% 第 3 次 */
    const sp = { 2: 0, 3: 0, other: 0 }; for (let i = 0; i < 20000; i++) { const n = surpass(215); n === 2 || n === 3 ? sp[n]++ : sp.other++; }
    out.sp = [sp.other, Math.round(sp[3] / 200), surpass(0), surpass(-5), surpass(100), surpass(300), surpass(99) <= 1];
    /* 溢出：擊中擊殺才算，溢出的 x% 打 2 公尺（60）內；最後一擊：打死感電的敵人回復能量護盾；持續傷害都不算 */
    globalThis.aggroPack = globalThis.sparks = globalThis.hitstop = () => {}; globalThis.killMob = m => { m.dead = 1; };
    const cf2 = { ...gemCfg(mkGem('split', 5), 0), leech: 0 }; ST.dmg = [100, 100]; ST.es = 1000; P.es = 0; G.t = 100;
    const dd = (() => { const t = mk(); hitMob(t, cf2, 0, 0); return 1e9 - t.hp; })();
    const grp = (hp, o = {}) => { const t = mk({ hp, mhp: 100, ...o }), n1 = mk({ x: P.x + 80, hp: 1000, mhp: 1000 }), far = mk({ x: P.x + 400, hp: 1000, mhp: 1000 }); G.mobs = [t, n1, far]; return [t, n1, far]; };
    let [t1, n1, f1] = grp(10);
    hitMob(t1, cf2, 0, 0); out.ovk0 = [t1.dead, n1.hp];
    ST.ovkSplash = 30; [t1, n1, f1] = grp(10);
    hitMob(t1, cf2, 0, 0); out.ovk = [t1.dead, Math.abs((1000 - n1.hp) - (dd - 10) * 0.3) < 0.01, f1.hp];
    [t1, n1, f1] = grp(1e9, { mhp: 1e9 }); hitMob(t1, cf2, 0, 0); out.ovkAlive = [t1.dead || 0, n1.hp];
    [t1, n1, f1] = grp(10); dotHit(t1, 500, 'phys'); out.ovkDot = [t1.dead, n1.hp];
    ST.ovkSplash = 0;
    ST.kbEs = 10; [t1] = grp(10, { ail: { shock: 200 } }); hitMob(t1, cf2, 0, 0); out.kb = [t1.dead, P.es];
    const rnd1 = Math.random; Math.random = () => 0.999; P.es = 0; [t1] = grp(10); hitMob(t1, cf2, 0, 0); out.kbNo = P.es; Math.random = rnd1;
    [t1] = grp(10, { ail: { shock: 200 } }); dotHit(t1, 500, 'phys'); out.kbDot = P.es;
    [t1] = grp(1e9, { mhp: 1e9, ail: { shock: 200 } }); hitMob(t1, cf2, 0, 0); out.kbAlive = P.es; ST.kbEs = 0;
    G.mobs = [];
    /* 殘暴打擊：一下被移除至少 15% 最大生命才有守護，x% 最大生命、4 秒；先吸收（在格擋值之後） */
    ST.hp = 1000; ST.bv = 0; ST.savageGuard = 10; P.svgV = 0; P.guardV = 0; G.t = 300;
    savageHit(149); out.sv0 = P.svgV || 0;
    savageHit(150); out.sv1 = [P.svgV, P.svgT - G.t, absorb(80), P.svgV];
    G.t = 305; out.sv2 = absorb(50); ST.savageGuard = 0; P.svgV = 0; savageHit(900); out.sv3 = P.svgV;
    Object.assign(ST, st0);
    return out;
  })()`);
  const j9 = x => JSON.stringify(x);
  ok(
    '流血在移動目標上取實際最大的一筆：移動時 加劇 100 vs 普通 150 → 300、靜止時加劇 200 勝過 150',
    b9.mvBleed[0][0] === 300 && b9.mvBleed[1][0] === 200,
    j9(b9.mvBleed)
  );
  ok(
    'bleedAll／poiAll：純火焰擊中開了才有流血、中毒；關閉時沒有',
    j9(b9.pure0) === '[false,false]' && j9(b9.pure1) === '[true,true]',
    j9([b9.pure0, b9.pure1])
  );
  ok(
    '備份佇列：最強一筆造成傷害、強的後到舊的退成備份、弱的備份在最強一筆結束後接手',
    j9(b9.q1) === '[10,1,4]' && j9(b9.q2) === '[20,"10/4"]' && j9(b9.dmg) === '[20,10,4,4,0,0]',
    j9([b9.q1, b9.q2, b9.dmg])
  );
  ok('備份佇列：強度相同時刷新時間（原本 keepMax 會留舊的）', j9(b9.same) === '[108,1]', j9(b9.same));
  ok(
    '備份佇列：點燃一樣（吃火焰抗性）、玩家身上也一樣',
    j9(b9.ign) === '[5,3,6,0]' && j9(b9.player) === '[10,3]',
    j9([b9.ign, b9.player])
  );
  ok(
    '加劇：現有的每一筆（含備份）都加劇、再加劇回傳 false、沒流血回傳 false；新上的筆不繼承；已加劇的維持到結束',
    b9.agg0 === false && j9(b9.agg1) === '[true,false,1,1]' && j9(b9.aggNew) === '[0,1]',
    j9([b9.agg0, b9.agg1, b9.aggNew])
  );
  ok(
    '加劇流血一律 ×2（目標移動時不再加倍）；結束後新筆（未加劇）才接手，移動時才 ×2',
    j9(b9.aggDmg) === '[20,8,1,6,0,3]',
    j9(b9.aggDmg)
  );
  ok('加劇後重新排序：較弱但加劇的（有效 ×2）排在後來較強但沒加劇的前面', j9(b9.aggSort) === '[4,1,5]', j9(b9.aggSort));
  ok(
    '加劇任何流血：有流血被加劇才成立；aggIgn 開著時所有點燃一起加劇（點燃 ×2）',
    j9(b9.aggIgn0) === '[true,0]' && j9(b9.aggIgn1) === '[true,1,30]' && j9(b9.aggIgn2) === '[false,false]',
    j9([b9.aggIgn0, b9.aggIgn1, b9.aggIgn2])
  );
  ok(
    '惡化點燃：同一次使用 3 次點燃變 3 倍（舊筆移除）、換一次使用不累計也不移除舊筆（新的較弱進備份）、沒有 compound 不累計',
    j9(b9.comp) === '[2,3,0]' && j9(b9.compOther) === '[3,1]' && j9(b9.compOff) === '[1,2]',
    j9([b9.comp, b9.compOther, b9.compOff])
  );
  ok(
    '有助於異常的傷害：預設表（點燃 火、流血 物理、中毒 物理＋混沌）；火焰塑造者＝點燃吃物理冰冷閃電；流血／中毒的開關',
    j9(b9.base) === '[2,1,17]' && b9.shaper === 15 && j9(b9.all) === '[31,31]',
    j9([b9.base, b9.shaper, b9.all])
  );
  ok(
    '無視抗性：該種傷害當抗性 0（負抗性也不吃、穿透也不變負），其他種類不受影響',
    j9(b9.res0) === '[-50,30,-20]' && j9(b9.res1) === '[0,0,30,0]',
    j9([b9.res0, b9.res1])
  );
  ok(
    '空手：獨立類別 unarmed、物理 2～5、每秒攻擊 1.65、暴擊 5%；不能用限定武器的技能，預設攻擊斬擊可以',
    j9(b9.unarmed) === '["unarmed","2,5",1.65,5]' && j9(b9.unW) === '[true,false]',
    j9([b9.unarmed, b9.unW])
  );
  ok(
    '分岔／絕對暴擊：期望值跟實際擲骰平均一致（含幸運）、分岔 ＞ 一般、絕對暴擊 ＞ 一般；暴擊率 0 不會卡住也不暴擊',
    Object.values(b9.cr).every(x => x[1]) &&
      b9.cr.fork[0] > b9.cr.base[0] &&
      b9.cr.inev[0] > b9.cr.base[0] &&
      b9.cr.both[0] > b9.cr.fork[0] &&
      j9(b9.zero) === '[false,0]',
    j9(b9.cr) + j9(b9.zero)
  );
  ok(
    '滿溢機率：215% ＝ 2 次、再 15% 第 3 次；100% 剛好 1 次、300% 剛好 3 次、0 以下 0 次',
    b9.sp[0] === 0 &&
      Math.abs(b9.sp[1] - 15) < 2 &&
      b9.sp[2] === 0 &&
      b9.sp[3] === 0 &&
      b9.sp[4] === 1 &&
      b9.sp[5] === 3 &&
      b9.sp[6],
    j9(b9.sp)
  );
  ok(
    '溢出：擊中擊殺才把溢出的 x% 打給 2 公尺內的敵人（遠的、沒殺死、持續傷害殺死都不算）',
    j9(b9.ovk0) === '[1,1000]' &&
      j9(b9.ovk) === '[1,true,1000]' &&
      j9(b9.ovkAlive) === '[0,1000]' &&
      j9(b9.ovkDot) === '[1,1000]',
    j9([b9.ovk0, b9.ovk, b9.ovkAlive, b9.ovkDot])
  );
  ok(
    '最後一擊：擊中殺死感電的敵人回復 x% 最大能量護盾；沒感電、沒殺死、持續傷害都不算',
    j9(b9.kb) === '[1,100]' && b9.kbNo === 0 && b9.kbDot === 0 && b9.kbAlive === 0,
    j9([b9.kb, b9.kbNo, b9.kbDot, b9.kbAlive])
  );
  ok(
    '殘暴打擊：一下被移除至少 15% 最大生命才獲得 x% 最大生命的守護、4 秒、先吸收；過期不吸收；沒開關沒有',
    b9.sv0 === 0 && j9(b9.sv1) === '[100,4,0,20]' && b9.sv2 === 50 && b9.sv3 === 0,
    j9([b9.sv0, b9.sv1, b9.sv2, b9.sv3])
  );
  /* 天賦擴充：新的開關與條件傷害（docs/天賦擴充清單.md） */
  const bx = R(`(() => {
    const out = {}, D = Object.values(MOBS)[0], st0 = { ...ST }, rd = x => Math.round(x * 1000) / 1000,
      mk = (o = {}) => ({ D, x: P.x + 40, y: P.y, r: 12, sz: 20, hp: 1e9, mhp: 1e9, arm: 0, arm0: 0, ev: 0, ev0: 0, vx: 0, vy: 0, aggro: 1, acc: 100, res: { fire: 0, cold: 0, light: 0, chaos: 0 }, ail: {}, ...o }),
      atk = { D: { tags: ['attack'], m: 1 }, mult: 1, more: 1, kb: 1, q: 0, leech: 0 },
      P0 = { phys: 100, fire: 0, cold: 0, light: 0, chaos: 0 }, F0 = { phys: 0, fire: 0.001, cold: 0, light: 0, chaos: 0 },
      apply = (m, c = {}, pre = P0) => applyAil(m, { pre, post: pre }, { ...atk, ...c }),
      hit = m => hitCalc(atk, m, { keep: 1 }).d;
    Object.assign(ST, { noCrit: 1, noMiss: 0, dmg: [100, 100], ev: 0, block: 0, defl: 0, physP: 0, dmgA: 0, atkP: 0, meleeP: 0, projP: 0, strikeP: 0, ailMag: 0, bleedCh: 100, poisonCh: 100, hp: 1000, mp: 100, es: 100 });
    ST.wadd = { fire: [0, 0], cold: [0, 0], light: [0, 0], chaos: [0, 0] };
    ST.add = {};
    Object.assign(G, { t: 100, scene: 'map', mapT: 1, mm: null, mobs: [], allies: [], state: 'play' });
    Object.assign(P, { ail: {}, ev: {}, hp: 1000, mp: 100, es: 100, rage: 0, buf: {}, stk: {}, x: 0, y: 0 });
    /* 異常強度分種類：只放大自己那一種 */
    let m = mk(); apply(m); const b0 = m.ail.bleed.dps, p0 = m.ail.poi[0].dps;
    ST.bleedMag = 100; m = mk(); apply(m); out.bleed = [rd(m.ail.bleed.dps / b0), rd(m.ail.poi[0].dps / p0)]; ST.bleedMag = 0;
    ST.poiMag = 100; m = mk(); apply(m); out.poi = [rd(m.ail.bleed.dps / b0), rd(m.ail.poi[0].dps / p0)]; ST.poiMag = 0;
    const ig = { addIgn: 100 }; m = mk(); apply(m, ig, F0); const i0 = m.ail.ign.dps; ST.ignMag = 100; m = mk(); apply(m, ig, F0); out.ign = rd(m.ail.ign.dps / i0); ST.ignMag = 0;
    /* 惡化點燃的開關等於技能欄位 compound */
    ST.compoundOn = 1; m = mk(); const u = {}; apply(m, ig, F0); const c1 = m.ail.ign.dps; applyAil(m, { pre: F0, post: F0 }, { ...atk, ...ig }, u); applyAil(m, { pre: F0, post: F0 }, { ...atk, ...ig }, u); out.comp = rd(m.ail.ign.dps / c1); ST.compoundOn = 0;
    /* 緋紅猛攻：新上的流血是加劇、2 秒 */
    ST.aggAll = 1; m = mk(); apply(m); out.agg = [m.ail.bleed.agg, rd(m.ail.bleed.t - G.t), rd(bleedNow(m.ail, 0) / m.ail.bleed.dps)]; ST.aggAll = 0;
    m = mk(); apply(m); out.agg0 = m.ail.bleed.agg || 0;
    /* 條件傷害：提高池 +100 ＝ 兩倍；條件不成立不變 */
    const h0 = hit(mk()), dbl = (k, set = () => {}) => { set(); ST[k] = 100; const v = rd(hit(mk()) / h0); ST[k] = 0; return v; };
    out.killNo = dbl('killP'); evMark('kill'); out.killYes = dbl('killP'); P.ev = {};
    out.lowMpNo = dbl('lowMpP'); P.mp = 1; out.lowMpYes = dbl('lowMpP'); P.mp = 100;
    out.lowEsNo = dbl('lowEsP'); P.es = 1; out.lowEsYes = dbl('lowEsP'); P.es = 100;
    out.pres = dbl('presP'); ST.presP = 100; out.presFar = rd(hit(mk({ x: 400 })) / h0); ST.presP = 0;
    out.isoAlone = dbl('isoP'); G.mobs = [mk({ x: 50 }), mk({ x: 60 })]; ST.isoP = 100; out.isoCrowd = rd(hit(G.mobs[0]) / h0); ST.isoP = 0;
    G.mobs = []; out.surrNo = dbl('surrP'); G.mobs = [0, 1, 2, 3, 4].map(i => mk({ x: 10 + i })); out.surrYes = dbl('surrP'); G.mobs = [];
    /* 減益開關：要符合條件才施加 */
    const slam = { D: { tags: ['attack', 'slam'], m: 1 } };
    ST.crushOn = 1; m = mk(); debuffsOn(m, P0, { ...atk }); out.crush0 = m.ail.crush > 0; m = mk(); debuffsOn(m, P0, { ...atk, ...slam }); out.crush1 = m.ail.crush > G.t; ST.crushOn = 0;
    ST.crippleOn = 1; m = mk({ ev: 1000, ev0: 1000 }); debuffsOn(m, P0, atk); out.crip0 = m.ev; m.ail.bleed = { dps: 1, t: G.t + 5 }; debuffsOn(m, P0, atk); out.crip1 = m.ev; ST.crippleOn = 0;
    ST.weakenOn = 1; m = mk(); debuffsOn(m, P0, atk); out.weak0 = m.ail.weak > 0; m.ail.curse = { k: 'vuln', v: 1, t: G.t + 5 }; debuffsOn(m, P0, atk); out.weak1 = m.ail.weak > G.t; ST.weakenOn = 0;
    /* 磐石姿態不會僵直；奇術活力常駐 */
    const rnd0 = Math.random; Math.random = () => 0; P.act = {}; P.stag = 0; ST.noStag = 1; playerStagger(1e6); out.stag0 = P.stag; ST.noStag = 0; playerStagger(1e6); out.stag1 = P.stag > 0; Math.random = rnd0;
    ST.dynOn = 1; P.stk = {}; baseTick(0.016); out.dyn = stkN('dyn'); ST.dynOn = 0;
    Object.assign(ST, st0);
    return out;
  })()`);
  const jx = JSON.stringify;
  ok(
    '流血、中毒、點燃強度只放大自己那一種（×2）',
    jx([bx.bleed, bx.poi, bx.ign]) === '[[2,1],[1,2],2]',
    jx([bx.bleed, bx.poi, bx.ign])
  );
  ok('惡化點燃的天賦開關等於技能欄位', bx.comp > 1, bx.comp);
  ok(
    '緋紅猛攻：流血都是加劇（×2）、2 秒；沒開關不是',
    jx(bx.agg) === '[1,2,2]' && bx.agg0 === 0,
    jx([bx.agg, bx.agg0])
  );
  ok(
    '條件傷害：近期擊殺、貧魔、貧能量護盾、存在範圍、孤立、被包圍，成立才 ×2',
    jx([
      bx.killNo,
      bx.killYes,
      bx.lowMpNo,
      bx.lowMpYes,
      bx.lowEsNo,
      bx.lowEsYes,
      bx.pres,
      bx.presFar,
      bx.isoAlone,
      bx.isoCrowd,
      bx.surrNo,
      bx.surrYes
    ]) === '[1,2,1,2,1,2,2,1,2,1,1,2]',
    jx(bx)
  );
  ok(
    '壓碎只有重擊、跛行只對流血、虛弱只對被詛咒',
    !bx.crush0 && bx.crush1 && bx.crip0 === 1000 && bx.crip1 < 1000 && !bx.weak0 && bx.weak1,
    jx(bx)
  );
  ok(
    '不會僵直開關有效；奇術活力常駐得到 1 層',
    bx.stag0 === 0 && bx.stag1 && bx.dyn === 1,
    jx([bx.stag0, bx.stag1, bx.dyn])
  );
  ok(
    '大點的能力值算一次、算進需求；不受影響、荊棘、基石的開關讀得到',
    R(`(() => {
      const T = PTREE.N, id = f => T.find(f).id, st = id(n => n.n === '千錘百鍊'), s = { lv: 90, eq: {}, pt: [...PT_START, st], ptA: {}, auras: [], charms: [], skills: [] },
        o = stats(s), d = stats({ ...s, pt: [...PT_START, id(n => n.n === '踏雪'), id(n => n.n === '尖刺'), id(n => n.n === '磐石姿態')] });
      return o.str === ATT_START + 10 && eqCheck(s).tot.str === ATT_START + 10 && d.unaff.chill === 1 && d.thornAdd[0] === 8 && d.thornAdd[1] === 20 && d.noRoll === 1 && d.noStag === 1;
    })()`)
  );
  /* 0.2.43 第 10 批：異常與減益 */
  const b10 = R(`(() => {
    const out = {}, D = Object.values(MOBS)[0],
      mk = (o = {}) => ({ D, x: P.x + 40, y: P.y, r: 12, sz: 20, hp: 1e9, mhp: 1e9, arm: 0, arm0: 0, ev: 0, ev0: 0, vx: 0, vy: 0, aggro: 1, acc: 100, res: { fire: 0, cold: 0, light: 0, chaos: 0 }, ail: {}, ...o }),
      st0 = { ...ST }, rnd0 = Math.random, rd = x => Math.round(x * 1000) / 1000,
      atk = { D: { tags: ['attack'], m: 1 }, mult: 1, more: 1, kb: 1, q: 0, leech: 0 },
      apply = (m, pre, c) => applyAil(m, { pre, post: pre }, { ...atk, ...c }),
      P0 = { phys: 100, fire: 0, cold: 0, light: 0, chaos: 0 },
      hit = (m, c = atk) => hitCalc(c, m, { keep: 1 }).d;
    Object.assign(ST, { noCrit: 1, noMiss: 0, dmg: [100, 100], ev: 0, block: 0, defl: 0, physP: 0, dmgA: 0, atkP: 0, meleeP: 0, projP: 0, strikeP: 0, parryMag: 0, parryDur: 0, parryR: 0, bvNoCrit: 0, overwhelm: 0, incise: 0, inciseMag: 0, hexPierce: 0, hstunNoEv: 0, suppCh: 0, unaff: {}, debuffEff: 0, debuffMag: 0, bleedCh: 0, poisonCh: 0, dazeCh: 0, acc: 1, bv: 0 });
    ST.wadd = { fire: [0, 0], cold: [0, 0], light: [0, 0], chaos: [0, 0] };
    ST.add = {};
    Object.assign(G, { t: 100, scene: 'map', mapT: 1, mm: null, mobs: [], allies: [], state: 'play' });
    P.ail = {}; P.parryT = 0; P.counterT = 0; P.hp = 1e6; P.es = 0; P.incN = []; P.rage = 0; P.buf = {};
    globalThis.aggroPack = globalThis.sparks = globalThis.hitstop = () => {}; globalThis.killMob = m => { m.dead = 1; };
    let m = mk(), a = m.ail;
    /* 受招架：必中（天生閃避極高也中）、幅度與持續開關 */
    m = mk({ ev: 1e7 }); ST.acc = 1;
    let n0 = 0, n1 = 0; for (let i = 0; i < 40; i++) hitRoll(m, atk) && n0++;
    applyParry(m); for (let i = 0; i < 40; i++) hitRoll(m, atk) && n1++;
    out.parryHit = [n0 < 10, n1];
    m = mk(); applyParry(m); out.parryT = m.ail.parried - G.t; ST.parryDur = 50; m = mk(); applyParry(m); out.parryDur = m.ail.parried - G.t; ST.parryDur = 0;
    m = mk(); const h0 = hit(m); applyParry(m); const h1 = hit(m); ST.parryMag = 100; const h2 = hit(m); ST.parryMag = 0;
    out.parryMore = [rd(h1 / h0), rd(h2 / h0)];
    /* 沉重暈眩無法閃避你的擊中（開關 hstunNoEv） */
    m = mk({ ev: 1e7 }); m.ail.hstun = G.t + 3;
    let e0 = 0, e1 = 0; for (let i = 0; i < 40; i++) hitRoll(m, atk) && e0++; ST.hstunNoEv = 1; for (let i = 0; i < 40; i++) hitRoll(m, atk) && e1++; ST.hstunNoEv = 0;
    out.hsNoEv = [e0 < 10, e1];
    /* 格擋值碎開：範圍內（含王）受招架，範圍外不受；圓環半徑＝實際範圍；parryR 放大範圍 */
    const shat = () => { ST.bv = 1000; P.bv = 10; P.bvRe = null; P.ail = {}; const ms = [mk({ x: P.x + 3 * METER }), mk({ x: P.x + 3.5 * METER, boss: 1 }), mk({ x: P.x + 6 * METER }), mk({ x: P.x + 10 * METER })]; G.mobs = ms; absorb(100); return ms.map(x => parryOn(x) ? 1 : 0).join(''); };
    out.shat = shat(); ST.parryR = 100; out.shatR = shat(); ST.parryR = 0; ST.bv = 0; P.bv = 0; G.mobs = [];
    /* 反擊狀態（0.2.47 改寫，盾衝）：期間每次被打，攻擊者都受招架；不擋、不自動反擊；王的紅光大招（noEv）也算；過期不算 */
    m = mk({ hp: 1e9 }); G.mobs = [m]; startCounter(3); const hp0 = m.hp;
    const c1 = hurtCalc(50, m, 'phys'), p1 = parryOn(m);
    m.ail.parried = 0; const c2 = hurtCalc(50, m, 'phys'), p2 = parryOn(m);
    m.ail.parried = 0; hurtCalc(50, m, 'phys', 1); const p3 = parryOn(m);
    out.counter = [c1.parry || 0, m.hp === hp0, p1, c2.parry || 0, p2, p3];
    G.t = 200; startCounter(1); G.t = 202; m.ail.parried = 0; out.counterEnd = [(hurtCalc(50, m, 'phys').parry || 0), parryOn(m)];
    G.t = 100; P.counterT = 0; G.mobs = [];
    /* 物理減傷：護甲（上限 90%）→ 鎮壓（最多扣到 0）→ 壓碎（可以變負）；全部跟「沒減傷」的數字比 */
    m = mk({ arm: 1e12 }); const base = hit(mk());
    const rr = (c, mm) => rd(hit(mm || m, c) / base);
    out.red = [rr(atk), rr({ ...atk, overwhelm: 30 }), rr({ ...atk, overwhelm: 95 })];
    m.ail.crush = G.t + 4; out.crush = [rr(atk), rr({ ...atk, overwhelm: 30 })];
    ST.overwhelm = 30; out.stOver = rr(atk); ST.overwhelm = 0;
    m = mk({ arm: 0 }); m.ail.crush = G.t + 4; out.crushNeg = rr(atk, m); m.ail.crush = G.t - 1; out.crushOff = rr(atk, m);
    apply(m = mk(), P0, { crush: true }); out.crushOn = [m.ail.crush - G.t, hit(m) / base > 1.14];
    /* 破碎護甲：只對完全破甲的敵人施加、物理 +20% 相加；有它或碎甲不能再破甲 */
    m = mk({ arm: 50, arm0: 50 }); apply(m, P0, { shatter: true }); out.sh0 = [m.ail.shatter || 0, takenInc(m, 'phys')];
    m.ail.broken = G.t + 12; apply(m, P0, { shatter: true }); out.sh1 = [m.ail.shatter > G.t, takenInc(m, 'phys')];
    m.ail.broken = 0; out.sh2 = takenInc(m, 'phys');
    m = mk({ arm: 50, arm0: 50 }); m.ail.shatter = G.t + 5; m.ail.broken = G.t - 1; apply(m, P0, { armBreak: 1 }); const noB = m.arm;
    m = mk({ arm: 50, arm0: 50 }); out.noBreak = [noB];
    m = mk({ arm: 50, arm0: 50 }); apply(m, P0, { armBreak: 1 }); out.canBreak = m.arm < 50;
    /* 碎甲：幅度＝該次擊中 5% 的減免前物理；之後的攻擊多一筆不吃任何加成的附加物理；法術沒有；5 秒到期；完全破甲被移除即結束 */
    ST.physP = 100; const c2x = { ...atk, more: 2 };
    m = mk(); m.ail.broken = G.t + 12; const nb = hit(m, c2x); apply(m, { ...P0, phys: 1000 }, { riven: 1 }); out.riven = [m.ail.riven.v, rd(hit(m, c2x) - nb)];
    const sc = { D: { tags: ['spell'], m: 1, el: 'fire' }, mult: 1, more: 1, lv: 1 };
    Math.random = () => 0.5; out.rivenSpell = rd(hitCalc(sc, m, { keep: 1 }).d - hitCalc(sc, mk(), { keep: 1 }).d) === 0; Math.random = rnd0;
    ST.physP = 0;
    G.t = 100; m.ail.riven.t = 104; G.t = 105; { const r = m.ail.riven, h = hit(m); m.ail.riven = null; out.rivenEnd = h === hit(m); m.ail.riven = r; }
    G.t = 100; m = mk(); m.ail.broken = G.t + 12; apply(m, { ...P0, phys: 1000 }, { riven: 1 }); const rb = [rivenOn(m.ail)]; m.ail.broken = 0; rb.push(rivenOn(m.ail)); out.rivenBroken = rb;
    G.t = 100; m = mk(); out.rivenNo = (apply(m, { ...P0, phys: 1000 }, { riven: 1 }), !m.ail.riven); m.ail.broken = G.t + 12; apply(m, { ...P0, phys: 1000 }, { riven: 1 }); apply(m, { ...P0, phys: 2000 }, { riven: 1 }); out.rivenRe = m.ail.riven.v;
    /* 卸防姿態：只對目眩的敵人、存 10%；10 次擊中、60 秒、目眩消失後結束；有它不能再目眩；重上取代舊的 */
    m = mk(); apply(m, { ...P0, phys: 1000 }, { unbr: 1 }); out.unb0 = !!m.ail.unbr;
    m.ail.daze = G.t + 8; apply(m, { ...P0, phys: 1000 }, { unbr: 1 }); out.unb1 = [m.ail.unbr.v, rd(hit(m) - hit(mk()))];
    apply(m, { ...P0, phys: 2000 }, { unbr: 1 }); out.unbRe = [m.ail.unbr.v, m.ail.unbr.n];
    m.ail.daze = G.t + 1; ST.dazeCh = 100; apply(m, P0, {}); out.unbNoDaze = m.ail.daze - G.t; ST.dazeCh = 0;
    for (let i = 0; i < 8; i++) apply(m, P0, {}); out.unb9 = !!m.ail.unbr; apply(m, P0, {}); out.unb10 = !!m.ail.unbr;
    m = mk(); m.ail.daze = G.t + 8; apply(m, { ...P0, phys: 1000 }, { unbr: 1 }); m.ail.daze = 0; ailTick(m, 0.1); out.unbDaze = !!m.ail.unbr;
    m = mk(); m.ail.daze = G.t + 8; apply(m, { ...P0, phys: 1000 }, { unbr: 1 }); G.t = 170; out.unbT = unbrOn(m.ail); G.t = 100;
    /* 跛行：普通 ×3、稀有與王 ×1，扣目標當下的閃避，扣到 0 完全跛行 12 秒（攻擊必中），到期恢復 */
    m = mk({ ev: 1000, ev0: 1000 }); apply(m, P0, { cripple: 2 }); const evN = m.ev;
    m = mk({ ev: 1000, ev0: 1000, boss: 1 }); apply(m, P0, { cripple: 2 }); const evB = m.ev;
    m = mk({ ev: 1000, ev0: 1000, elite: 1 }); apply(m, P0, { cripple: 2 }); out.crip = [evN, evB, m.ev];
    /* 易攻目標：法術投射物不吃也不消耗，攻擊投射物才吃 */
    m = mk(); apply(m, P0, { easy: 50 }); const spj = { D: { tags: ['spell', 'proj'], m: 1, el: 'fire' }, mult: 1, more: 1, lv: 1 }; Math.random = () => 0.5; hitCalc(spj, m, { keep: 1 }); out.easySpell = !!m.ail.easy; Math.random = rnd0;
    m = mk({ ev: 1000, ev0: 1000 }); apply(m, P0, { cripple: 2 }); apply(m, P0, { cripple: 2 }); apply(m, P0, { cripple: 2 });
    out.crip0 = [m.ev, m.ail.crip - G.t, hitRoll(m, atk)]; G.t = 113; ailTick(m, 0.1); out.cripEnd = [m.ev, m.ail.crip > G.t]; G.t = 100;
    /* 可觸電、可冰凍：普通 40%、菁英 60%、王 70%；定身後不算；收割後歸零 */
    m = mk(); m.ail.elc = 40; m.ail.frz = 39; out.prime = [hasState(m, 'elcprime'), hasState(m, 'frzprime')];
    m = mk({ boss: 1 }); m.ail.elc = 60; const pb = hasState(m, 'elcprime'); m.ail.elc = 70; out.primeB = [pb, hasState(m, 'elcprime')];
    m = mk({ elite: 1 }); m.ail.frz = 60; out.primeE = hasState(m, 'frzprime');
    m = mk(); m.ail.elc = 50; m.ail.frozen = G.t + 3; out.primeFrozen = hasState(m, 'elcprime');
    m = mk(); m.ail.elc = 50; m.ail.frz = 50; out.primeTake = [takeState(m, 'elcprime'), m.ail.elc, (G.t += 0.1, takeState(m, 'elcprime')), takeState(m, 'frzprime'), m.ail.frz];
    /* 血漬：流血時累積（移動或加劇時 ×2），流血斷掉暫停不歸零，滿 6 秒得到減益 */
    const bleedTick = (m, secs, bt) => { for (let i = 0; i < secs; i++) { G.t += 1; if (!m.ail.bleed || m.ail.bleed.t <= G.t) m.ail.bleed = keepMax(null, 1, bt); ailTick(m, 1); } };
    G.t = 100; m = mk(); bleedTick(m, 5, 99); out.stain5 = [m.ail.stainA, hasState(m, 'stain')]; bleedTick(m, 1, 99); out.stain6 = [hasState(m, 'stain'), m.ail.stainA, takeState(m, 'stain'), hasState(m, 'stain')];
    G.t = 100; m = mk({ mv: 1 }); bleedTick(m, 3, 99); out.stainMv = hasState(m, 'stain');
    G.t = 100; m = mk(); m.ail.bleed = keepMax(null, 1, 4); aggravate(m, 'bleed'); G.t = 101; ailTick(m, 1); G.t = 102; ailTick(m, 1); G.t = 103; ailTick(m, 1); out.stainAgg = hasState(m, 'stain');
    G.t = 100; m = mk(); m.ail.bleed = keepMax(null, 1, 4); for (let i = 1; i <= 3; i++) { G.t = 100 + i; ailTick(m, 1); } const part = m.ail.stainA;
    G.t = 110; ailTick(m, 1); ailTick(m, 1); const paused = m.ail.stainA; m.ail.bleed = keepMax(null, 1, 20); G.t = 111; ailTick(m, 1); out.stainPause = [part, paused, m.ail.stainA];
    G.t = 100; m = mk(); m.ail.cb = [{ dps: 5, t: G.t + 50 }]; for (let i = 0; i < 10; i++) { G.t += 1; ailTick(m, 1); } out.stainCb = [m.ail.stainA || 0, hasState(m, 'stain')];
    /* 切割：擊中給 1 層，每層流血機率 +10%（上限 10 層），上流血全清；inciseMag：近期每消耗 1 層流血幅度 3% 更多（上限 30%） */
    const bleedHit = (m, p = 1000) => apply(m, { ...P0, phys: p }, { bleedCh: 0 });
    G.t = 100; ST.incise = 1; Math.random = () => 0.55; m = mk(); const lay = [];
    for (let i = 0; i < 5; i++) bleedHit(m), lay.push(m.ail.inc);
    out.incLayers = [lay.join(), !!m.ail.bleed]; bleedHit(m); out.incBleed = [!!m.ail.bleed, m.ail.inc, P.incN.length];
    G.t = 100; P.incN = []; m = mk(); m.ail.inc = 10; ST.incise = 0; Math.random = () => 0.999; bleedHit(m); out.incCap = [!!m.ail.bleed, m.ail.inc];
    ST.incise = 0; Math.random = () => 0.001; m = mk(); bleedHit(m); out.incOff = [m.ail.inc || 0, !!m.ail.bleed];
    ST.incise = 1; m = mk(); m.ail.inc = 10; Math.random = () => 0.999; bleedHit(m); out.incMax = [m.ail.bleed ? 1 : 0, m.ail.inc]; m = mk(); m.ail.inc = 10; ST.bleedCh = -100; bleedHit(m); out.incMax2 = m.ail.inc; ST.bleedCh = 0;
    const bd = n => { P.incN = []; const t = mk(); t.ail.inc = n; Math.random = () => 0; ST.incise = 0; bleedHit(t); return t.ail.bleed ? t.ail.bleed.dps : 0; };
    ST.inciseMag = 0; const d0 = bd(6); ST.inciseMag = 1; out.incMag = [rd(bd(6) / d0), rd(bd(10) / d0), rd(bd(20) / d0)];
    P.incN = [[G.t - 1, 4]]; const t2 = mk(); t2.ail.inc = 2; Math.random = () => 0; bleedHit(t2); out.incMagRecent = rd(t2.ail.bleed.dps / d0);
    P.incN = [[G.t - 9, 4]]; const t3 = mk(); t3.ail.inc = 2; bleedHit(t3); out.incMagOld = rd(t3.ail.bleed.dps / d0);
    ST.inciseMag = 0; ST.incise = 0; Math.random = rnd0; P.incN = [];
    /* 腐化之血：每層獨立 5 秒、最多 10 層、不是流血（不累積血漬）；缺血提高上限（乘減益幅度）；上限縮小不砍已有的層 */
    G.t = 100; m = mk(); for (let i = 0; i < 12; i++) apply(m, P0, { corrupt: 10 });
    out.cb = [m.ail.cb.length, rd((() => { const h = m.hp; G.t = 101; ailTick(m, 1); return h - m.hp; })()), m.ail.bleed || null, m.ail.stainA || 0];
    G.t = 100; m = mk(); apply(m, P0, { anemia: 3 }); for (let i = 0; i < 20; i++) apply(m, P0, { corrupt: 1 }); out.anemia = m.ail.cb.length;
    ST.debuffMag = 50; m = mk(); apply(m, P0, { anemia: 3 }); for (let i = 0; i < 20; i++) apply(m, P0, { corrupt: 1 }); out.anemiaM = m.ail.cb.length; ST.debuffMag = 0;
    G.t = 100; m = mk(); apply(m, P0, { corrupt: 10 }); G.t = 103; apply(m, P0, { corrupt: 10 }); G.t = 106; const h6 = m.hp; ailTick(m, 1); out.cbIndep = [rd(h6 - m.hp), m.ail.cb.filter(x => x.t > G.t).length];
    G.t = 100; m = mk(); apply(m, P0, { anemia: 5 }); for (let i = 0; i < 15; i++) apply(m, P0, { corrupt: 1 }); G.t = 102; m.ail.anemia.t = 101; apply(m, P0, { corrupt: 1 }); out.anemiaEnd = m.ail.cb.length;
    /* 控制與減益（技能欄位）：石化（王減半、算禁錮）、平靜、虛弱、嘲諷、濕透、易攻目標 */
    G.t = 100; m = mk(); apply(m, P0, { petrify: true }); out.petr = [rd(m.ail.petr - G.t), immob(m.ail), ailTick(m, 0.1)];
    m = mk({ boss: 1 }); apply(m, P0, { petrify: true }); out.petrB = rd(m.ail.petr - G.t); G.t = 104; out.petrEnd = [immob(m.ail), ailTick(m, 0.1)]; G.t = 100;
    m = mk(); out.calm0 = mobDmgMul(m); apply(m, P0, { calm: 2 }); out.calm = [mobDmgMul(m), rd(m.ail.calm - G.t)]; G.t = 103; out.calmEnd = mobDmgMul(m); G.t = 100;
    m = mk(); const sp0 = mobSpd(m); apply(m, P0, { weaken: true }); out.weak = [rd(mobSpd(m) / sp0), mobDmgMul(m), rd(m.ail.weak - G.t)]; G.t = 102; out.weakEnd = mobDmgMul(m); G.t = 100;
    m = mk(); apply(m, P0, { taunt: true }); out.taunt = [rd(m.ail.taunt - G.t), tauntMul(m, P), rd(tauntMul(m, { x: 0 })), tauntMul(mk(), { x: 0 })];
    m = mk(); apply(m, P0, { easy: 50 }); const pj = { ...atk, D: { tags: ['attack', 'proj'], m: 1 } }, bz = hit(mk(), pj);
    out.easy = [rd(hit(m, atk) / base), rd(hit(m, pj) / bz), rd(hit(m, pj) / bz), !m.ail.easy]; apply(m, P0, { easy: 50 }); G.t = 105; out.easyEnd = rd(hit(m, pj) / bz); G.t = 100;
    /* 濕透：通用減益（技能欄位 c.drench、drench() 函式都行）；感電機率 50% 更多、冰凍累積 25% 更多；預設 2 秒、可傳更長、不縮短 */
    m = mk(); apply(m, P0, { drench: true }); out.wet = rd(m.ail.wet - G.t); apply(m, P0, { drench: 5 }); out.wet5 = rd(m.ail.wet - G.t); drench(m, 1); out.wetKeep = rd(m.ail.wet - G.t);
    m = mk(); drench(m); out.wetFn = rd(m.ail.wet - G.t);
    const thr = ailThr(1) * MOB_HP, lt = { ...P0, phys: 0, light: thr * 0.8 };
    Math.random = () => 0.25; m = mk(); apply(m, lt, {}); const s0 = m.ail.shock > G.t; m = mk(); drench(m); apply(m, lt, {}); const s1 = m.ail.shock > G.t; Math.random = rnd0;
    out.wetShock = [s0, s1];
    const fz = { ...P0, phys: 0, cold: thr * 0.3 }, fa = mm => { apply(mm, fz, {}); return mm.ail.frz || 0; };
    m = mk(); const f0 = fa(m); m = mk(); drench(m); const f1 = fa(m); const f2 = (() => { const t = mk(); t.ail.wet = G.t - 1; return fa(t); })();
    out.wetFrz = [rd(f1 / f0), rd(f2 / f0)];
    /* 無咒的：curseMob 直接跳過，hexPierce 開了才能詛咒 */
    m = mk({ hexproof: 1 }); curseMob(m, 'enfeeble', 5); const hx0 = !!m.ail.curse; ST.hexPierce = 1; curseMob(m, 'enfeeble', 5); out.hex = [hx0, !!m.ail.curse]; ST.hexPierce = 0;
    m = mk(); curseMob(m, 'enfeeble', 5); out.hexNormal = !!m.ail.curse;
    /* 超重：每層緩速 10%、4 秒、重上疊層並刷新、最多 5 層 */
    G.t = 100; P.ail = {}; encumber(); encumber(); out.over = [P.ail.over.n, rd(playerSlow())]; G.t = 102; encumber(); out.overRe = [P.ail.over.n, rd(P.ail.over.t - G.t)];
    for (let i = 0; i < 6; i++) encumber(); out.overCap = [P.ail.over.n, rd(playerSlow())]; G.t = 107; out.overEnd = playerSlow(); G.t = 100;
    /* 緩速藤蔓：每層移動 −8%（只移動、不影響出手）、最多 5 層；移動逐漸移除層數；站著不掉 */
    P.ail = {}; const mv0 = moveMul(), sp1 = speedMul(); vineAdd(3); out.vine = [rd(moveMul() / mv0), rd(speedMul() / sp1)]; vineAdd(9); out.vineCap = P.ail.vine.n;
    P.ail.vine.n = 3; P.movT = null; baseTick(1); baseTick(1); const st = P.ail.vine.n; P.movT = G.t; baseTick(1); baseTick(1); out.vineMove = [st, P.ail.vine.n]; P.movT = G.t; baseTick(1); baseTick(1); baseTick(1); out.vineGone = [P.ail.vine.n, rd(moveMul() / mv0)];
    /* 不受影響：減益仍掛著、仍顯示，只是不發揮效果 */
    P.ail = { chill: { v: 40, t: G.t + 5 }, shock: G.t + 5 }; encumber(2);
    const sl0 = rd(playerSlow()), sh0x = (() => { P.hp = 1e6; return hurtCalc(100, mk(), 'phys').d; })(); ST.unaff = { chill: 1, shock: 1, over: 1 };
    out.unaff = [sl0, rd(playerSlow()), sh0x > hurtCalc(100, mk(), 'phys').d, playerStates().filter(x => ['chill', 'shock', 'over'].includes(x.k)).length]; ST.unaff = {};
    /* 壓抑：機率（上限 100%）、擊中傷害與異常傷害各防止 50%（異常照上） */
    P.ail = {}; ST.ev = 0; ST.block = 0; ST.defl = 0; Math.random = () => 0; m = mk({ D: { ...D, ail: '' } });
    const hs = () => { P.ail = {}; P.evE = 0; const r = hurtCalc(1000, m, 'fire'); return [r.d, P.ail.ign ? P.ail.ign.dps : 0, !!r.supp]; };
    const u0 = hs(); ST.suppCh = 250; const u1 = hs(); ST.suppCh = 0; out.supp = [rd(u1[0] / u0[0]), rd(u1[1] / u0[1]), u0[2], u1[2], u0[1] > 0];
    Math.random = rnd0;
    /* 無法被暴擊：有格擋值（bvUp）才算；用盡就不算 */
    Math.random = () => 0; m = mk({ boss: 1 }); P.ail = {}; ST.bv = 1000; P.bv = 500; P.bvRe = null;
    const cr0 = hurtCalc(100, m, 'phys').crit; ST.bvNoCrit = 1; const cr1 = hurtCalc(100, m, 'phys').crit; P.bv = 0; P.bvRe = G.t; const cr2 = hurtCalc(100, m, 'phys').crit;
    out.bvNoCrit = [!!cr0, !!cr1, !!cr2]; Math.random = rnd0; ST.bv = 0; P.bv = 0; P.bvRe = null;
    Object.assign(ST, st0); P.ail = {}; G.mobs = []; G.t = 100;
    return out;
  })()`);
  const j10 = x => JSON.stringify(x);
  ok(
    '受招架：必中（閃避再高也中）、持續 2 秒（parryDur 放大）、攻擊傷害 50% 更多（parryMag 放大）',
    b10.parryHit[0] &&
      b10.parryHit[1] === 40 &&
      b10.parryT === 2 &&
      b10.parryDur === 3 &&
      j10(b10.parryMore) === '[1.5,2]',
    j10([b10.parryHit, b10.parryT, b10.parryDur, b10.parryMore])
  );
  ok(
    'hstunNoEv：沉重暈眩的敵人無法閃避你的擊中，沒開關仍會被閃避',
    b10.hsNoEv[0] && b10.hsNoEv[1] === 40,
    j10(b10.hsNoEv)
  );
  ok(
    '格擋值打碎：4 公尺內所有敵人（含王）受招架、範圍外不受；parryR 放大範圍',
    b10.shat === '1100' && b10.shatR === '1110',
    j10([b10.shat, b10.shatR])
  );
  ok(
    '反擊狀態：期間每次被打攻擊者都受招架（含王的大招）、不擋、不反擊；過期不算',
    j10(b10.counter) === '[0,true,true,0,true,true]' && j10(b10.counterEnd) === '[0,false]',
    j10([b10.counter, b10.counterEnd])
  );
  ok(
    '物理減傷順序：護甲 90% → 鎮壓（扣百分點、最多扣到 0）→ 壓碎（−15 個百分點）',
    j10(b10.red) === '[0.1,0.4,1]' && j10(b10.crush) === '[0.25,0.55]' && b10.stOver === 0.55,
    j10([b10.red, b10.crush, b10.stOver])
  );
  ok(
    '壓碎可以讓物理減傷變負（沒護甲 → 受到 115%）、到期恢復；技能欄位 crush 上 4 秒',
    b10.crushNeg === 1.15 && b10.crushOff === 1 && b10.crushOn[0] === 4 && b10.crushOn[1],
    j10([b10.crushNeg, b10.crushOff, b10.crushOn])
  );
  ok(
    '破碎護甲：只對完全破甲的敵人、物理 +20% 與完全破甲相加（20 → 40）、完全破甲結束就沒效果；有它或碎甲不能再破甲',
    j10(b10.sh0) === '[0,0]' &&
      j10(b10.sh1) === '[true,40]' &&
      b10.sh2 === 0 &&
      j10(b10.noBreak) === '[50]' &&
      b10.canBreak,
    j10([b10.sh0, b10.sh1, b10.sh2, b10.noBreak, b10.canBreak])
  );
  ok(
    '碎甲：只能對完全破甲的敵人施加（沒完全破甲不會上）、幅度＝擊中 5% 減免前物理、之後攻擊多一筆不吃提高與更多的附加物理；法術沒有、5 秒到期、完全破甲移除即結束、重上取代舊的',
    j10(b10.riven) === '[50,60]' &&
      b10.rivenSpell &&
      b10.rivenEnd &&
      j10(b10.rivenBroken) === '[true,false]' &&
      b10.rivenRe === 100 &&
      b10.rivenNo,
    j10([b10.riven, b10.rivenSpell, b10.rivenEnd, b10.rivenBroken, b10.rivenRe])
  );
  ok(
    '卸防姿態：只對目眩的敵人、存 10%、附加物理；有它不能再目眩；承受 10 次擊中、目眩消失、60 秒後結束；重上取代舊的',
    !b10.unb0 &&
      j10(b10.unb1) === '[100,100]' &&
      j10(b10.unbRe) === '[200,10]' &&
      b10.unbNoDaze === 1 &&
      b10.unb9 &&
      !b10.unb10 &&
      !b10.unbDaze &&
      !b10.unbT,
    j10([b10.unb0, b10.unb1, b10.unbRe, b10.unbNoDaze, b10.unb9, b10.unb10, b10.unbDaze, b10.unbT])
  );
  ok(
    '跛行：普通怪 ×3、菁英 ×2、王 ×1（跟破甲一致）扣目標當下的閃避，扣到 0 完全跛行 12 秒（攻擊必中），到期恢復',
    j10(b10.crip) === '[400,800,600]' && j10(b10.crip0) === '[0,12,true]' && j10(b10.cripEnd) === '[1000,false]',
    j10([b10.crip, b10.crip0, b10.cripEnd])
  );
  ok(
    '可觸電、可冰凍：普通 40%、菁英 60%、王 70%；定身中不算；收割後歸零',
    j10(b10.prime) === '[true,false]' &&
      j10(b10.primeB) === '[false,true]' &&
      b10.primeE &&
      !b10.primeFrozen &&
      j10(b10.primeTake) === '[true,0,false,true,0]',
    j10([b10.prime, b10.primeB, b10.primeE, b10.primeFrozen, b10.primeTake])
  );
  ok(
    '血漬：流血累積 6 秒得到、移動或加劇時 ×2（3 秒）、流血斷掉暫停不歸零、腐化之血（不是流血）不累積',
    j10(b10.stain5) === '[5,false]' &&
      j10(b10.stain6) === '[true,0,true,false]' &&
      b10.stainMv &&
      b10.stainAgg &&
      j10(b10.stainPause) === '[3,3,4]' &&
      j10(b10.stainCb) === '[0,false]',
    j10([b10.stain5, b10.stain6, b10.stainMv, b10.stainAgg, b10.stainPause, b10.stainCb])
  );
  ok(
    '切割：擊中給 1 層、每層流血機率 +10%、上流血時全部移除；沒開關不給層數；層數有上限 10',
    j10(b10.incLayers) === '["1,2,3,4,5",false]' &&
      j10(b10.incBleed) === '[true,0,1]' &&
      j10(b10.incCap) === '[true,0]' &&
      j10(b10.incOff) === '[0,false]' &&
      j10(b10.incMax) === '[1,0]' &&
      b10.incMax2 === 10,
    j10([b10.incLayers, b10.incBleed, b10.incCap, b10.incOff, b10.incMax, b10.incMax2])
  );
  ok(
    '切割幅度（inciseMag）：近期每消耗 1 層流血幅度 3% 更多、上限 30%、超過 4 秒的不算',
    j10(b10.incMag) === '[1.18,1.3,1.3]' && b10.incMagRecent === 1.18 && b10.incMagOld === 1.06,
    j10([b10.incMag, b10.incMagRecent, b10.incMagOld])
  );
  ok(
    '腐化之血：最多 10 層、每層獨立 5 秒、不是流血（沒有流血）；缺血 +3 → 13 層（乘減益幅度 1.5 → 14）；上限縮小不砍已有的層',
    j10(b10.cb) === '[10,100,null,0]' &&
      b10.anemia === 13 &&
      b10.anemiaM === 14 &&
      j10(b10.cbIndep) === '[10,1]' &&
      b10.anemiaEnd === 15,
    j10([b10.cb, b10.anemia, b10.anemiaM, b10.cbIndep, b10.anemiaEnd])
  );
  ok(
    '石化：3 秒（王減半）、不能行動、算禁錮；到期恢復',
    j10(b10.petr) === '[3,true,true]' && b10.petrB === 1.5 && j10(b10.petrEnd) === '[false,false]',
    j10([b10.petr, b10.petrB, b10.petrEnd])
  );
  ok(
    '平靜：傷害 0、秒數由施加者給；虛弱：移動 −20%、傷害 −10%、預設 1 秒；嘲諷：3 秒、對你以外傷害 −10%',
    b10.calm0 === 1 &&
      j10(b10.calm) === '[0,2]' &&
      b10.calmEnd === 1 &&
      j10(b10.weak) === '[0.8,0.9,1]' &&
      b10.weakEnd === 1 &&
      j10(b10.taunt) === '[3,1,0.9,1]',
    j10([b10.calm, b10.weak, b10.weakEnd, b10.taunt])
  );
  ok(
    '易攻目標：只有投射物攻擊吃、吃一次就消耗；幅度由施加者給；4 秒到期不吃',
    b10.easySpell && j10(b10.easy) === '[1,1.5,1,true]' && b10.easyEnd === 1,
    j10([b10.easy, b10.easyEnd])
  );
  ok(
    '濕透：技能欄位 c.drench 或 drench() 都能施加、預設 2 秒、可傳更長、不縮短；感電機率 50% 更多、冰凍累積 25% 更多；到期不吃',
    b10.wet === 2 &&
      b10.wet5 === 5 &&
      b10.wetKeep === 5 &&
      b10.wetFn === 2 &&
      j10(b10.wetShock) === '[false,true]' &&
      j10(b10.wetFrz) === '[1.25,1]',
    j10([b10.wet, b10.wet5, b10.wetKeep, b10.wetFn, b10.wetShock, b10.wetFrz])
  );
  ok(
    '無咒的：curseMob 直接跳過；hexPierce 開了才能詛咒；一般敵人照常',
    j10(b10.hex) === '[false,true]' && b10.hexNormal,
    j10([b10.hex, b10.hexNormal])
  );
  ok(
    '超重：每層緩速 10%、重上疊層並刷新 4 秒、最多 5 層、到期恢復',
    j10(b10.over) === '[2,0.8]' && j10(b10.overRe) === '[3,4]' && j10(b10.overCap) === '[5,0.5]' && b10.overEnd === 1,
    j10([b10.over, b10.overRe, b10.overCap, b10.overEnd])
  );
  ok(
    '緩速藤蔓：每層移動 −8%（不影響出手）、最多 5 層；移動逐漸移除層數、站著不掉',
    j10(b10.vine) === '[0.76,1]' && b10.vineCap === 5 && j10(b10.vineMove) === '[3,1]' && j10(b10.vineGone) === '[0,1]',
    j10([b10.vine, b10.vineCap, b10.vineMove, b10.vineGone])
  );
  /* 感電照 PoE2：玩家跟怪物一樣跟其他「受到的傷害提高」相加，不另外乘 */
  ok(
    '玩家的感電與凋零同池相加（20% + 10% ＝ 30%，不是 ×1.2×1.1）',
    R(
      `(() => { const a0 = P.ail; P.ail = { shock: G.t + 5, wither: [G.t + 5, G.t + 5] }; const v = takenP('chaos'); P.ail = a0; return v; })()`
    ) === 30
  );
  ok(
    '不受影響：冰緩、感電、超重仍掛著、仍顯示，但不緩速、不多受傷',
    j10(b10.unaff) === '[0.48,1,true,3]',
    j10(b10.unaff)
  );
  ok(
    '壓抑：機率上限 100%、被壓抑的擊中傷害與異常傷害各防止 50%（異常照上）、沒機率不壓抑',
    j10(b10.supp) === '[0.5,0.5,false,true,true]',
    j10(b10.supp)
  );
  ok(
    'bvNoCrit：有格擋值時不會被暴擊，格擋值打碎後恢復；沒開關照常',
    j10(b10.bvNoCrit) === '[true,false,true]',
    j10(b10.bvNoCrit)
  );
  const need10 = [
    '受招架',
    '不受影響',
    '鎮壓',
    '壓抑',
    '嘲諷',
    '可觸電',
    '可冰凍',
    '壓碎',
    '腐化之血',
    '緩速藤蔓',
    '石化',
    '無咒',
    '血漬',
    '切割',
    '跛行',
    '易攻目標',
    '虛弱',
    '平靜',
    '碎甲',
    '卸防姿態',
    '破碎護甲',
    '濕透',
    '超重',
    '缺血'
  ];
  ok(
    '第 10 批名詞卡 24 張都在，舊名「失衡」沒有留下',
    need10.length === 24 &&
      need10.every(k => R(`!!TERMS['${k}']`)) &&
      !R(`'失衡' in TERMS || Object.values(STATE).some(s => s[0] === '失衡')`),
    need10.filter(k => !R(`!!TERMS['${k}']`)).join()
  );
}
/* 第 11 批：地面（mech.js 的 GROUND、maps.js 的地面詞）：每種地面雙向、數值不是 NaN、陣營、死因、上限 */
{
  const c4 = { console, Math, Date, JSON, Object, Array, Set, location: { search: '' }, URLSearchParams };
  vm.createContext(c4);
  for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'mech.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), c4, { filename: f });
  const R = s => vm.runInContext(s, c4);
  R(`var G = { t: 100, mapT: 5, scene: 'hide', state: 'play', mobs: [], pools: [], shots: [], grenades: [], units: [], ground: [], allies: [], W: 2000, H: 2000 }, P = { x: 0, y: 0, r: 14, cds: {}, mp: 1e4, hp: 100, ail: {} }, S, ST, TOUCH = { on: 0 };
     const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
     var LOS = true, HURT = null, DEAD = 0;
     const num = () => {}, fx = () => {}, fxs = () => {}, sfx = () => {}, hudWarn = () => {}, los = () => LOS, open = () => true, floorNear = () => null, isWall = () => false,
       die = () => DEAD++, killMob = m => (m.hp = 0), aggroPack = () => {}, hurtPlayer = (d, src, el, noEv) => (HURT = { d, n: src.D.n, el, noEv });`);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'skills.js'), 'utf8'), c4, {
    filename: 'skills.js'
  });
  R(`S = { lv: 60, eq: {}, pt: [...PT_START], asc: null, at: [], auras: [], charms: [], skills: [0, 1, 2, 3, 4].map(() => ({ a: null })) }; ST = stats(S);
     mechEnter();
     Object.assign(ST, { hp: 1000, es: 0, ev: 1000, acc: 1000, res: { fire: 0, cold: 0, light: 0, chaos: 0 }, maxRes: { fire: 75, cold: 75, light: 75, chaos: 75 }, armor: 0, block: 0, defl: 0 });`);
  const g = R(`(() => {
    const o = {}, D = Object.values(MOBS)[0],
      mk = (x = {}) => ({ D, x: 0, y: 0, r: 12, sz: 20, hp: 500, mhp: 1000, arm: 0, arm0: 0, ev: 100, vx: 0, vy: 0, dmg: 100, res: { fire: 0, cold: 0, light: 0, chaos: 0 }, ail: {}, ...x }),
      reset = () => { G.t = 100; G.ground = []; G.mobs = []; G.mm = null; G.state = 'play'; LOS = true; HURT = null; DEAD = 0; Object.assign(P, { x: 0, y: 0, hp: 500, es: 0, ail: {}, buf: {}, evE: null, movT: null, lastHit: null }); },
      /* 跑 s 秒（地面、怪物、玩家每格都跑） */
      run = (s, dt = 0.05) => { for (let i = 0; i < Math.round(s / dt); i++) { G.t += dt; groundTick(dt); for (const m of G.mobs) ailTick(m, dt); baseTick(dt); } },
      /* 一塊地面：side 'p'／'m'，怪物與玩家都站在裡面 */
      put = (k, side, mx) => { reset(); const m = mk(mx); G.mobs = [m]; addGround({ k, x: 0, y: 0, r: 60, dur: 30, v: 100, ...(side === 'm' ? { side } : {}) }); return m; },
      r2 = v => Math.round(v * 100) / 100;
    /* 每種地面雙向跑 3 秒：沒有 NaN */
    o.kinds = Object.keys(GROUND).filter(k => GROUND[k].on);
    o.nan = [];
    for (const k of o.kinds) for (const s of ['p', 'm']) {
      const m = put(k, s, { mv: 1 });
      for (let i = 0; i < 60; i++) { P.movT = G.t; run(0.05); }
      const vals = [m.hp, P.hp, P.es, resOf(m, 'fire'), resOf(m, 'chaos'), takenInc(m, 'chaos'), mobSpd(m), mobDmgMul(m), effRes('fire'), effRes('chaos'), moveMul(), speedMul()];
      if (!vals.every(Number.isFinite)) o.nan.push(k + s + ':' + vals);
    }
    /* 奉獻：友方每秒 5%，王 1%，詛咒 −50%；另一方不受影響 */
    let m = put('cons', 'p'); P.ail.curse = { k: 'eleweak', v: 40, t: 1e9 }; m.ail.curse = { k: 'eleweak', v: 40, t: 1e9 };
    run(1); o.consP = [Math.round(P.hp), m.hp, effRes('fire'), resOf(m, 'fire')];
    m = put('cons', 'm'); P.ail.curse = { k: 'eleweak', v: 40, t: 1e9 }; m.ail.curse = { k: 'eleweak', v: 40, t: 1e9 };
    run(1); o.consM = [P.hp, Math.round(m.hp), effRes('fire'), resOf(m, 'fire')];
    m = put('cons', 'm', { boss: 1 }); run(1); o.consB = Math.round(m.hp);
    m = put('cons', 'p'); G.mm = { pregen: -100 }; run(1); o.consNo = P.hp; G.mm = null;
    /* 腐化：混沌持續傷害，跳過能量護盾；只有敵方受傷；離開就停 */
    m = put('corrupt', 'm'); ST.res.chaos = 50; P.es = 100; run(1); o.corM = [Math.round(P.hp), m.hp, P.es]; ST.res.chaos = 0;
    P.x = 500; run(0.3); const h0 = P.hp; run(1); o.corOff = P.hp === h0;
    m = put('corrupt', 'p'); run(1); o.corP = [P.hp, Math.round(m.hp)];
    /* 煙霧：敵方致盲；玩家致盲時閃避值、命中值少 20% */
    m = put('smoke', 'p'); run(0.1); o.smP = [m.ail.blind > G.t, !P.ail.blind];
    m = put('smoke', 'm'); run(0.1); o.smM = [!m.ail.blind, P.ail.blind > G.t];
    const evGain = () => { P.evE = 0; hurtCalc(100, null, 'phys'); return P.evE; }, e1 = evGain();
    P.ail.blind = 0; o.smEv = e1 > evGain();
    /* 感電地面：感電 6 秒、雙向 */
    m = put('shockg', 'p'); run(0.1); o.shP = [r2(m.ail.shock - G.t), !P.ail.shock];
    m = put('shockg', 'm'); run(0.1); o.shM = [!m.ail.shock, r2(P.ail.shock - G.t)];
    /* 點燃地面：2 秒累積到 50%、死因；被油纏身 200% 更多 */
    m = put('ignited', 'p'); run(1.5); const ig0 = !m.ail.ign; run(0.6); o.igP = [ig0, !!m.ail.ign, m.ail.ign && m.ail.ign.dps, !P.ail.ign];
    m = put('ignited', 'm'); run(2.1); o.igM = [!m.ail.ign, P.ail.ign && P.ail.ign.dps, P.ail.ign && P.ail.ign.by];
    m = put('ignited', 'm'); P.ail.oiled = 1e9; run(0.75); o.igOil = !!P.ail.ign;
    m = put('ignited', 'm'); P.ail.imm = { ign: 1e9 }; run(3); o.igImm = !P.ail.ign;
    m = put('ignited', 'm'); P.hp = 1; run(4); o.igDead = [DEAD > 0, P.lastHit && P.lastHit.n];
    /* 凋零地面：每秒 1 層、每層 4 秒、混沌受傷提高（玩家、怪物） */
    m = put('wither', 'p'); run(2.5); o.wiP = [witherN(m.ail), !P.ail.wither, takenInc(m, 'chaos')];
    m = put('wither', 'm'); run(9); o.wiM = [!m.ail.wither, witherN(P.ail)];
    P.ail = {}; const wb = hurtCalc(100, null, 'chaos', 1).d; P.ail.wither = [1e9, 1e9, 1e9]; o.wiHit = r2(hurtCalc(100, null, 'chaos', 1).d / wb);
    P.ail.poi = { dps: 100, t: 1e9 }; P.hp = 500; P.ail.wither = [1e9, 1e9]; baseTick(1); o.wiPoi = Math.round(500 - P.hp); P.ail = {};
    /* 荊棘：生成時打一次（怪物方躲不掉、死因是地面；玩家方吃護甲），移動才持續受傷 */
    m = put('thorn', 'm'); o.thM = HURT && [HURT.d, HURT.n, HURT.el, HURT.noEv];
    run(1); o.thStill = P.hp; for (let i = 0; i < 20; i++) { P.movT = G.t; run(0.05); } o.thMove = Math.round(P.hp);
    m = put('thorn', 'p', { arm: 0, mv: 0 }); o.thP = [m.hp, HURT === null];
    const hp1 = m.hp; run(1); o.thPStill = m.hp === hp1; m.mv = 1; run(1); o.thPMove = Math.round(m.hp);
    /* 怒號：友方閃避、滿血傷害、猛攻，留 1 秒；怪物方給怪物 */
    m = put('howl', 'p'); run(0.1); o.hoP = [hasBuff('howl'), hasBuff('onslaught'), !m.ail.howl];
    const eH = evGain(); P.buf.howl = 0; o.hoEv = eH < evGain();
    const cf = gemCfg(mkGem('split', 5), 0); ST.noCrit = 1; ST.noMiss = 1; ST.dmg = [100, 100]; P.hp = ST.hp;
    const dmgNow = () => { const rn = Math.random; Math.random = () => 0.5; const v = hitCalc(cf, mk({ arm: 0 }), { keep: 1 }).d; Math.random = rn; return v; };
    P.buf.howl = 1e9; const dH = dmgNow(); P.buf.howl = 0; const d0 = dmgNow();
    P.buf.howl = 1e9; P.hp = 500; const dL = dmgNow(); P.buf.howl = 0; o.hoDmg = [dH > d0, dL < dH];
    m = put('howl', 'm', { hp: 1000 }); run(0.1); o.hoM = [m.ail.howl > G.t, !hasBuff('howl'), r2(mobDmgMul(m)), r2(mobSpd(m))]; m.hp = 900; o.hoM2 = r2(mobDmgMul(m));
    G.ground = []; G.t += 1.1; o.hoEnd = [m.ail.howl > G.t, r2(mobSpd(m))];
    /* 油滑：被油纏身（緩速、火焰曝曬、易燃 ×3），留 2 秒；不另外疊地面緩速；雙向 */
    m = put('oil', 'p'); run(0.1); o.oiP = [m.ail.oiled > G.t, !P.ail.oiled, r2(mobSpd(m)), resOf(m, 'fire'), resOf(m, 'cold')];
    m = put('oil', 'm'); run(0.1); o.oiM = [!m.ail.oiled, P.ail.oiled > G.t, r2(oilSlow()), effRes('fire'), effRes('cold')];
    flamAdd(P.ail, 10); o.oiFlam = P.ail.flam; P.x = 500; G.t += 1.9; o.oiStay = r2(oilSlow()); G.t += 0.2; o.oiGone = oilSlow();
    /* 被油纏身時，怪物的火焰擊中點燃機率 ×3 */
    const rnd0 = Math.random; Math.random = () => 0.25; P.x = 0; P.ail = { oiled: 1e9 }; const mf = mk({ ail: {} }); mobAilPlayer(mf, ST.hp * 0.5, 'fire'); const a1 = !!P.ail.ign; P.ail = {}; mobAilPlayer(mf, ST.hp * 0.5, 'fire'); o.oiHit = [a1, !!P.ail.ign]; Math.random = rnd0;
    /* 曝曬：玩家也吃；跟火焰曝曬不疊 */
    reset(); P.ail.exp = 1e9; o.exP = [effRes('fire'), effRes('cold'), effRes('chaos')]; P.ail.oiled = 1e9; o.exTop = effRes('fire'); P.ail = {};
    /* 怪物方的油：火焰擊中引爆，爆炸算點燃的那一招（只傷怪物），留下玩家方的燃燒地面 */
    m = put('oil', 'm', { hp: 1e6, mhp: 1e6 }); const c0 = { ...cf, mult: 1 }; P.hp = 500;
    igniteAt(0, 0, c0); o.oilBoom = [G.ground.filter(g => g.k === 'oil' && !g.done).length, m.hp < 1e6, G.ground.filter(g => g.k === 'fire' && g.side !== 'm' && g.c).length, P.hp];
    /* 冰緩地面雙向 */
    m = put('chill', 'p'); run(0.1); o.chP = [m.ail.chill && m.ail.chill.v, !P.ail.chill];
    m = put('chill', 'm'); run(0.1); o.chM = [!m.ail.chill, P.ail.chill && P.ail.chill.v, r2(playerSlow())];
    /* 玩家要踩在畫出來的橢圓裡（y 方向 0.75）、牆後面不算 */
    m = put('corrupt', 'm'); P.y = 50; run(0.5); o.ell = P.hp; P.y = 0; LOS = false; run(0.5); o.wall = P.hp;
    /* 死因 */
    m = put('corrupt', 'm'); P.hp = 5; run(2); o.dead = [DEAD > 0, P.lastHit && P.lastHit.n];
    /* 死掉之後不再作用在玩家身上 */
    m = put('cons', 'p'); G.state = 'dead'; run(1); o.deadNoHeal = P.hp;
    /* 持續傷害只算最強一塊 */
    reset(); addGround({ k: 'corrupt', side: 'm', x: 0, y: 0, r: 60, dur: 30, v: 100 }); addGround({ k: 'corrupt', side: 'm', x: 0, y: 0, r: 60, dur: 30, v: 300 }); addGround({ k: 'corrupt', side: 'm', x: 0, y: 0, r: 60, dur: 30, v: 100 }); run(1); o.top = Math.round(P.hp);
    /* 地圖詞：留地面的條件 */
    reset(); G.mm = mapMods({ mods: ['gCorrupt'] });
    const r0 = Math.random; Math.random = () => 0;
    mobGround(mk({ summoned: 1 })); mobGround(mk({ boss: 1 })); o.noSum = G.ground.length;
    mobGround(mk({ x: 7, y: 8, dmg: 123 })); o.drop = G.ground.length && { k: G.ground[0].k, side: G.ground[0].side, x: G.ground[0].x, r: G.ground[0].r, dur: G.ground[0].dur, v: G.ground[0].v };
    for (let i = 0; i < 30; i++) mobGround(mk()); o.cap = G.ground.length;
    /* 玩家方的地面不佔上限 */
    G.ground = G.ground.slice(-3).concat({ k: 'smoke' }); mobGround(mk()); o.cap2 = G.ground.length;
    Math.random = () => 0.99; G.ground = []; for (let i = 0; i < 30; i++) mobGround(mk()); o.noRoll = G.ground.length; Math.random = r0;
    G.mm = mapMods({ mods: ['gEle'] }); const ks = new Set(); for (let i = 0; i < 300; i++) { G.ground = []; while (!G.ground.length) mobGround(mk()); ks.add(G.ground[0].k); } o.ele = [...ks].sort().join();
    G.mm = null; G.ground = []; mobGround(mk()); o.noMod = G.ground.length;
    /* 卡片 */
    const gk = Object.keys(MAPMOD).filter(k => MAPMOD[k].g === 'ground');
    o.mods = [gk.length, gk.every(k => /^怪物死亡有 25% 機率留下/.test(MAPMOD[k].t)), gk.every(k => MAPMOD[k].d <= 2), gk.every(k => k === 'gEle' || GROUND[MAPMOD[k].fx.gnd]), Object.keys(MAPMOD).length];
    o.one = Array.from({ length: 3000 }, rollCard).every(c => c.mods.filter(k => MAPMOD[k].g === 'ground').length <= 1);
    o.terms = ['奉獻地面', '腐化地面', '煙霧', '感電地面', '點燃地面', '元素地面', '被油纏身', '油滑地面', '凋零地面', '荊棘地面', '怒號地面'].filter(k => !TERMS[k]);
    o.gname = o.kinds.filter(k => !GROUND[k].n || !GROUND[k].col || !GROUND[k].dur);
    reset(); P.ail = { blind: 1e9, exp: 1e9, oiled: 1e9, cons: 1e9, wither: [1e9, 1e9], gd: { v: 1, n: '腐化地面', t: 1e9 } }; P.buf = { howl: 1e9 };
    const st = playerStates(); o.pst = ['blind', 'exp', 'oiled', 'wither', 'cons', 'gd', 'howl'].filter(k => !st.some(x => x.k === k)); o.gdName = (st.find(x => x.k === 'gd') || {}).n; o.wc = (st.find(x => x.k === 'wither') || {}).c;
    o.mst = mobStates(mk({ ail: { oiled: 1e9, cons: 1e9, howl: 1e9 } })).map(x => x.k).join();
    reset(); ST.noCrit = 0; ST.noMiss = 0;
    return o;
  })()`);
  ok(
    '地面：每種分陣營的地面雙向跑 3 秒，數值都不是 NaN',
    g.kinds.length === 10 && !g.nan.length,
    g.kinds + ' ' + g.nan.join(' | ')
  );
  ok(
    '奉獻地面：友方每秒 5%（王 1%）、詛咒效果 −50%；敵方不受影響；不能回復生命的地圖詞也擋得住',
    g.consP.join() === '550,500,-20,-40' && g.consM.join() === '500,550,-40,-20' && g.consB === 510 && g.consNo === 500,
    JSON.stringify([g.consP, g.consM, g.consB, g.consNo])
  );
  ok(
    '腐化地面：混沌持續傷害吃抗性、跳過能量護盾、只打敵方、離開就停',
    g.corM.join() === '470,500,100' && g.corOff && g.corP.join() === '500,440',
    JSON.stringify([g.corM, g.corOff, g.corP])
  );
  ok(
    '煙霧：雙向致盲；玩家被致盲時閃避值變低',
    g.smP.join() === 'true,true' && g.smM.join() === 'true,true' && g.smEv,
    JSON.stringify([g.smP, g.smM, g.smEv])
  );
  ok(
    '感電地面：雙向、感電 6 秒',
    g.shP.join() === '6,true' && g.shM.join() === 'true,6',
    JSON.stringify([g.shP, g.shM])
  );
  ok(
    '點燃地面：2 秒累積到 50%、雙向、被油纏身更快、護符免疫、死因是點燃地面',
    g.igP.join() === 'true,true,50,true' &&
      g.igM.join() === 'true,50,點燃地面' &&
      g.igOil &&
      g.igImm &&
      g.igDead.join() === 'true,點燃地面',
    JSON.stringify([g.igP, g.igM, g.igOil, g.igImm, g.igDead])
  );
  ok(
    '凋零地面：每秒 1 層、每層 4 秒、玩家的混沌擊中與中毒也吃',
    g.wiP.join() === '3,true,15' && g.wiM.join() === 'true,4' && g.wiHit === 1.15 && g.wiPoi === 110,
    JSON.stringify([g.wiP, g.wiM, g.wiHit, g.wiPoi])
  );
  ok(
    '荊棘地面：生成時打一次（怪物方躲不掉、死因是地面），站著不受傷、移動才受傷，雙向',
    g.thM.join() === '100,荊棘地面,phys,true' &&
      g.thStill === 500 &&
      g.thMove === 460 &&
      g.thP.join() === '400,true' &&
      g.thPStill &&
      g.thPMove === 360,
    JSON.stringify([g.thM, g.thStill, g.thMove, g.thP, g.thPStill, g.thPMove])
  );
  ok(
    '怒號地面：友方閃避、滿血傷害、猛攻，留 1 秒；怪物方給怪物（傷害 ×1.4 只在滿血、移動速度 +10%）',
    g.hoP.join() === 'true,true,true' &&
      g.hoEv &&
      g.hoDmg.join() === 'true,true' &&
      g.hoM.join() === 'true,true,1.4,1.1' &&
      g.hoM2 === 1 &&
      g.hoEnd.join() === 'false,1',
    JSON.stringify([g.hoP, g.hoEv, g.hoDmg, g.hoM, g.hoM2, g.hoEnd])
  );
  ok(
    '油滑地面與被油纏身：緩速 30%、火焰抗性 −20%（別的元素不吃）、易燃 ×3、留 2 秒、雙向；怪物火焰擊中的點燃機率 ×3',
    g.oiP.join() === 'true,true,0.7,-20,0' &&
      g.oiM.join() === 'true,true,0.7,-20,0' &&
      g.oiFlam === 30 &&
      g.oiStay === 0.7 &&
      g.oiGone === 1 &&
      g.oiHit.join() === 'true,false',
    JSON.stringify([g.oiP, g.oiM, g.oiFlam, g.oiStay, g.oiGone, g.oiHit])
  );
  ok(
    '曝曬：玩家三元素 −20%、混沌不吃，跟火焰曝曬不疊',
    g.exP.join() === '-20,-20,0' && g.exTop === -20,
    JSON.stringify([g.exP, g.exTop])
  );
  ok(
    '怪物方的油可引爆：爆炸算點燃的那一招、只傷怪物、留下玩家方的燃燒地面',
    g.oilBoom[0] === 0 && g.oilBoom[1] && g.oilBoom[2] === 1 && g.oilBoom[3] === 500,
    JSON.stringify(g.oilBoom)
  );
  ok('冰緩地面：雙向', g.chP.join() === '30,true' && g.chM.join() === 'true,30,0.7', JSON.stringify([g.chP, g.chM]));
  ok(
    '地面打玩家：要踩在畫出來的橢圓裡、牆後面不算；死因寫地面；死後不再作用；只算最強一塊',
    g.ell === 500 && g.wall === 500 && g.dead.join() === 'true,腐化地面' && g.deadNoHeal === 500 && g.top === 320,
    JSON.stringify([g.ell, g.wall, g.dead, g.deadNoHeal, g.top])
  );
  ok(
    '地圖詞留地面：召喚物與王不留、怪物方、基準是那隻怪的一下、最多 10 塊、機率真的會擋、元素地面三選一、沒有詞不留',
    g.noSum === 0 &&
      g.drop.k === 'corrupt' &&
      g.drop.side === 'm' &&
      g.drop.x === 7 &&
      g.drop.r === 60 &&
      g.drop.dur === 6 &&
      g.drop.v === 123 &&
      g.cap === 10 &&
      g.cap2 === 5 &&
      g.noRoll === 0 &&
      g.ele === 'chill,ignited,shockg' &&
      g.noMod === 0,
    JSON.stringify([g.noSum, g.drop, g.cap, g.cap2, g.noRoll, g.ele, g.noMod])
  );
  ok(
    '地面地圖詞 10 條：寫在卡面上、同組一張卡最多一種、危險度 1～2、種類都存在',
    g.mods.join() === '10,true,true,true,46' && g.one,
    JSON.stringify([g.mods, g.one])
  );
  ok(
    '地面的名詞卡、狀態圖示都在',
    !g.terms.length &&
      !g.gname.length &&
      !g.pst.length &&
      g.gdName === '腐化地面' &&
      g.wc === 2 &&
      g.mst === 'oiled,cons,howl',
    JSON.stringify([g.terms, g.gname, g.pst, g.gdName, g.wc, g.mst])
  );
  /* 地面詞的出現率（固定亂數）：整組的權重等於 3 條詞，其他詞的相對比例跟沒有地面詞時一樣 */
  const fq = R(`(() => {
    const seed = s => () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      N = 200000,
      count = () => {
        const o = { n: [0, 0, 0, 0, 0, 0], g: [0, 0, 0, 0, 0, 0], h: [0, 0, 0, 0, 0, 0], w: {}, gw: {}, tot: 0, gtot: 0 };
        for (let i = 0; i < N; i++) {
          const c = rollCard();
          o.n[c.star]++;
          for (const k of c.mods) {
            const f = MAPMOD[k].g;
            if (f === 'ground') o.g[c.star]++, (o.gw[k] = (o.gw[k] || 0) + 1), o.gtot++;
            else (o.w[k] = (o.w[k] || 0) + 1), o.tot++;
            if (f === 'hp') o.h[c.star]++;
          }
        }
        return o;
      },
      rnd0 = Math.random,
      gk = Object.keys(MAPMOD).filter(k => MAPMOD[k].g === 'ground'),
      saved = {};
    Math.random = seed(11);
    const A = count();
    /* 對照組：把地面詞拿掉，就是加地面詞之前的抽法 */
    for (const k of gk) (saved[k] = MAPMOD[k]), delete MAPMOD[k];
    Math.random = seed(12);
    const B = count();
    Object.assign(MAPMOD, saved);
    Math.random = rnd0;
    const pct = (a, n) => Math.round((a / n) * 1000) / 10;
    return {
      rate: [1, 2, 3, 4, 5].map(s => pct(A.g[s], A.n[s])),
      hp: [1, 2, 3, 4, 5].map(s => pct(A.h[s], A.n[s])),
      gs: gk.map(k => pct(A.gw[k], A.gtot)),
      /* 每條非地面詞佔非地面詞總數的比例，兩組最大差（百分點） */
      drift: Math.max(...Object.keys(B.w).map(k => Math.abs(((A.w[k] || 0) / A.tot - B.w[k] / B.tot) * 100)))
    };
  })()`);
  console.log(
    `   地面詞出現率 ${fq.rate.map((v, i) => `${i + 1}★ ${v}%`).join('、')}；「怪物生命」${fq.hp.map(v => v + '%').join('／')}；其他詞比例最大差 ${fq.drift.toFixed(2)} 個百分點`
  );
  ok(
    '地面詞出現率：1★ 15～20%；3★ 起跟 3 條同組的「怪物生命」差不超過 3 個百分點；10 條機率相同',
    fq.rate[0] >= 15 &&
      fq.rate[0] <= 20 &&
      [2, 3, 4].every(i => Math.abs(fq.rate[i] - fq.hp[i]) <= 3) &&
      fq.gs.every(v => Math.abs(v - 10) < 0.5),
    JSON.stringify(fq)
  );
  ok('地面詞改權重：其他地圖詞的相對比例不變（每條差不到 0.2 個百分點）', fq.drift < 0.2, JSON.stringify(fq));
}
/* 基底擴充（0.2.44）：防具六系、凍結、固定詞分布、數量、商人、固定詞有效 */
{
  const c4 = { console, Math, Date, JSON, Object, Array, Set, location: { search: '' }, URLSearchParams };
  vm.createContext(c4);
  for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'mech.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), c4, { filename: f });
  const R = s => vm.runInContext(s, c4);
  R(`var G = { t: 1, mapT: 1, scene: 'map', state: 'play', mobs: [], shots: [], grenades: [], units: [], ground: [], W: 2000, H: 2000 }, P = { x: 500, y: 500, cds: {}, mp: 1e4, hp: 100, ail: {} }, S, ST, TOUCH = { on: 0 };
     const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
     const num = () => {}, fx = () => {}, fxs = () => {}, sfx = () => {}, hudWarn = t => (G.warn = t), die = () => {}, los = () => true, open = () => true, floorNear = () => null;`);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'skills.js'), 'utf8'), c4, {
    filename: 'skills.js'
  });
  const B = R('BASES'),
    DEF = ['armor', 'ev', 'es'],
    PARTS = ['helm', 'chest', 'gloves', 'boots'],
    SYS = ['armor', 'ev', 'es', 'armor+ev', 'armor+es', 'ev+es'],
    sys = b => DEF.filter(k => b.b[k]).join('+'),
    line = (p, s) => B.filter(b => b.k === p && sys(b) === s).sort((x, y) => x.lv - y.lv);
  ok(
    '基底：頭、胸、手、鞋每部位每系 6 個，共 144 個',
    PARTS.every(p => SYS.every(s => line(p, s).length === 6)) && B.filter(b => PARTS.includes(b.k)).length === 144,
    PARTS.flatMap(p => SYS.map(s => p + ' ' + s + ' ' + line(p, s).length)).join('、')
  );
  /* 階級 12 的單系防禦 */
  const CAP = {
      helm: { armor: 55, ev: 60, es: 60 },
      chest: { armor: 110, ev: 120, es: 100 },
      gloves: { armor: 40, ev: 40, es: 33 },
      boots: { armor: 40, ev: 40, es: 33 }
    },
    frz = [];
  for (const p of PARTS)
    for (const s of SYS) {
      const L = line(p, s),
        ks = s.split('+'),
        top = k => (ks.length > 1 ? Math.round(CAP[p][k] * 0.55) : CAP[p][k]),
        /* 胸甲到階級 12 凍結；頭、手、鞋的階級 15 多 10% */
        top15 = k => (p === 'chest' ? top(k) : Math.round(top(k) * 1.1));
      for (const k of ks) {
        const v = L.map(b => b.b[k]),
          at = lv => L.filter(b => b.lv === lv).map(b => b.b[k]);
        if (at(12)[0] !== top(k) || at(15)[0] !== top15(k) || Math.max(...v) !== top15(k))
          frz.push(`${p} ${s} ${k} 上限`);
        /* 手套、鞋子每階都要變高；頭與胸的舊基底已經到上限，只要不降 */
        const flat = p === 'gloves' || p === 'boots' ? 0 : 1;
        if (v.some((x, i) => i && x + flat <= v[i - 1])) frz.push(`${p} ${s} ${k} 階級高防禦沒有變高`);
      }
    }
  ok('基底：階級 12 上限、胸甲凍結、頭手鞋階級 15 多 10%、混合約 55%＋55%、階梯遞增', !frz.length, frz.join('、'));
  const impK = b =>
      Object.keys(b.b).filter(
        k => !(['helm', 'chest', 'gloves', 'boots', 'shield'].includes(b.k) && [...DEF, 'block'].includes(k))
      ),
    want = b => (['shield', 'ring', 'amulet', 'belt'].includes(b.k) || (b.k === 'chest' && b.lv >= 12) ? 1 : 0),
    impBad = B.filter(b => !['weapon', 'focus', 'quiver'].includes(b.k) && impK(b).length !== want(b));
  ok('基底：固定詞只有盾、飾品、階級 12 起的胸甲，一個基底一條', !impBad.length, impBad.map(b => b.n).join('、'));
  const cnt = k => B.filter(b => b.k === k).length,
    light = B.filter(b => b.k === 'shield' && b.b.ev > b.b.armor);
  ok(
    '基底：戒指 12、項鍊 10、腰帶 8、盾 9＋輕盾 6、法器 6、箭袋 6',
    cnt('ring') === 12 &&
      cnt('amulet') === 10 &&
      cnt('belt') === 8 &&
      cnt('shield') === 15 &&
      light.length === 6 &&
      cnt('focus') === 6 &&
      cnt('quiver') === 6,
    ['ring', 'amulet', 'belt', 'shield', 'focus', 'quiver'].map(cnt).join() + ' 輕盾 ' + light.length
  );
  /* 武器：id 是 w_類別_階；同一類的 6 個固定詞都不一樣 */
  const WC = R('Object.keys(WCLS)'),
    wSame = WC.filter(c => {
      const L = B.filter(b => b.id.startsWith(`w_${c}_`)).map(b =>
        Object.keys(b.b)
          .filter(k => !['dmg', 'as', 'crit'].includes(k))
          .sort()
          .join()
      );
      return L.length !== 6 || L.some(x => !x) || new Set(L).size !== 6;
    });
  ok('基底：武器每類 6 個，固定詞都不一樣', WC.length === 18 && !wSame.length, wSame.join());
  const dup = a => a.filter((x, i) => a.indexOf(x) !== i);
  ok(
    '基底：id、名字不重複',
    !dup(B.map(b => b.id)).length && !dup(B.map(b => b.n)).length,
    [...dup(B.map(b => b.id)), ...dup(B.map(b => b.n))].join()
  );
  const isNum = v => (Array.isArray(v) ? v.length === 2 && v.every(Number.isFinite) : Number.isFinite(v)),
    nanB = B.filter(b => !Object.values(b.b).every(isNum) || !Number.isFinite(b.lv)).map(b => b.n);
  ok('基底：所有基底數值都不是 NaN', !nanB.length, nanB.join('、'));
  /* 每條固定詞都有說明，而且穿上去數值真的變（打錯鍵名、stats 沒接到的會抓出來） */
  const dead = R(`(() => {
    const bad = [], SLOT = { weapon: 'weapon', focus: 'off', quiver: 'off', shield: 'off', helm: 'helm', chest: 'chest', gloves: 'gloves', boots: 'boots', belt: 'belt', ring: 'ring1', amulet: 'amulet' };
    const ring = mkItem('r_iron', 10, 0);
    ring.a = [{ k: 'attrA', v: 999, T: 1 }];
    for (const b of BASES) {
      const it = mkItem(b.id, 16, 0);
      const txt = baseText(it).join();
      if (/undefined|NaN|[{]}/.test(txt)) bad.push(b.n + ' 說明：' + txt);
      const s = { lv: 100, pt: [], at: [], auras: [], asc: null, eq: { ring2: ring, [SLOT[b.k]]: it } };
      if (b.k === 'focus') s.eq.weapon = mkItem('w_wand_0', 16, 0);
      if (b.k === 'quiver') s.eq.weapon = mkItem('w_bow_0', 16, 0);
      for (const k of Object.keys(b.b)) {
        if (['dmg', 'as', 'crit'].includes(k) && b.k === 'weapon') continue;
        const v = b.b[k], a = JSON.stringify(stats(s));
        delete b.b[k];
        const c = JSON.stringify(stats(s));
        b.b[k] = v;
        if (a === c) bad.push(b.n + ' ' + k + ' 沒有效果');
      }
    }
    return bad;
  })()`);
  ok('基底：每條固定詞都有說明、穿上去數值會變', !dead.length, dead.slice(0, 8).join('；'));
  ok(
    '基底：項鍊的能力值固定詞算進能力值與需求',
    R(`(() => {
      const s = { lv: 1, pt: [], at: [], auras: [], asc: null, eq: { amulet: mkItem('a_amber', 1, 0) } };
      return eqCheck(s).tot.str === ATT_START + BASEI.a_amber.b.str;
    })()`)
  );
  ok(
    '基底：itemAttr 遇到沒有 a 或查不到基底的物品不會丟例外',
    R(`itemAttr(null).str === 0 && itemAttr({}).str === 0 && itemAttr({ b: 'a_amber' }).str === BASEI.a_amber.b.str`)
  );
  /* 商人：每種都賣得到新基底（階級 15 的、輕盾）。一件的機率約 4～10%，600 次都沒出現幾乎不可能 */
  R(`S = { maxT: 16, gold: 1e12, gamN: 0, inv: { w: 12, h: 6, items: [] } }`);
  const SELL = {
      helm: 'h_kongo',
      chest: 'c_kongo',
      gloves: 'g_kongo',
      boots: 'b_kongo',
      belt: 'bt_scale',
      ring: 'r_tenju',
      amulet: 'a_sun',
      shield: 's_crane',
      focus: 'f_lotus',
      quiver: 'q_pierce'
    },
    noSell = Object.keys(SELL).filter(
      k =>
        !R(
          `(() => { for (let i = 0; i < 600; i++) { S.inv.items = []; if (gambleDo('${k}').it.b === '${SELL[k]}') return true; } })()`
        )
    );
  ok('基底：商人賣得到新基底', !noSell.length, noSell.join());
  /* 十字弓的固定詞：多裝填 1 發、多丟 1 顆手雷 */
  R(
    `S = { lv: 100, eq: {}, pt: [...PT_START], asc: null, at: [], auras: [], charms: [], skills: [0, 1, 2, 3, 4].map(() => ({ a: null })) }; S.eq.ring1 = mkItem('r_iron', 10, 0); S.eq.ring1.a = [{ k: 'attrA', v: 999, T: 1 }];`
  );
  const shots = id =>
    R(`(() => {
      S.eq.weapon = mkItem('${id}', 16, 0); ST = stats(S); P.ammo = {}; P.gren = {}; G.grenades = [];
      const c = gemCfg(mkGem('apshot', 5), 0), g = gemCfg(mkGem('grenade', 5), 0);
      for (let i = 0; i < 6; i++) skillPay(c, 0);
      actHit({ k: 'grenade', c: g, ang: 0, tx: P.x + 200, ty: P.y, hits: [0], n: 0 }, 0);
      return [P.ammo.apshot.n, !!P.ammo.apshot.until, G.grenades.length];
    })()`);
  ok(
    '基底：連弩多裝填 1 發、攻城弩多 1 顆手雷、手弩都沒有',
    JSON.stringify([shots('w_xbow_0'), shots('w_xbow_2'), shots('w_xbow_4')]) ===
      JSON.stringify([
        [0, true, 1],
        [1, false, 1],
        [0, true, 2]
      ]),
    JSON.stringify([shots('w_xbow_0'), shots('w_xbow_2'), shots('w_xbow_4')])
  );
}
/* 藏身處（0.2.44）：地形走得到、對話資料、稻草人不會死、DPS 統計 */
{
  const c4 = { console, Math, Date, JSON, Object, Array, Uint8Array, Float64Array };
  vm.createContext(c4);
  for (const f of ['hideart.js', 'npc.js', 'hideout.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), c4, { filename: f });
  const R = x => vm.runInContext(x, c4);
  R(`var G = { t: 0, mobs: [] }, P = {}, S = { story: {}, maxT: 3 }, PRAC = { t: 2, dot: 0 }, MOBS = { a: { hp: 50 } }, BOSSES = [{ hp: 300 }];
    var clamp = (v, a, b) => Math.max(a, Math.min(b, v)), hudWarn = () => {};
    var bossHpMul = () => 10, mobDef = () => {}, ailTick = () => {};
    var spawnMob = (D, x, y, pack, elite) => { const m = { D, x, y, r: D.r, sz: D.sz, elite, hp: D.hp, mhp: D.hp, ail: {}, flash: 0, sq: 0 }; G.mobs.push(m); return m; };`);
  const A = R('HIDE_ART'),
    tiles = R('hideTiles()'),
    at = (x, y) => Math.floor(y / 48) * A.cols + Math.floor(x / 48),
    dst = new Float64Array(A.cols * A.rows).fill(1e9),
    q = [at(A.spawn.x, A.spawn.y)];
  dst[q[0]] = 0;
  for (let h = 0; h < q.length; h++)
    for (const d of [1, -1, A.cols, -A.cols]) {
      const n = q[h] + d;
      if (!tiles[n] && dst[n] > dst[q[h]] + 48) (dst[n] = dst[q[h]] + 48), q.push(n);
    }
  const near = o => {
    let b = 1e9;
    for (let y = -2; y <= 2; y++)
      for (let x = -2; x <= 2; x++) b = Math.min(b, dst[at(o.x + x * 48, o.y + y * 48)] || 1e9);
    return b;
  };
  const far = [...A.props, ...A.dummies, ...Object.values(A.npc), A.exit].filter(o => near(o) > 690);
  ok('藏身處：每個設施從出生點 3 秒內走得到', !far.length, JSON.stringify(far));
  ok('藏身處：出生點、傳送門不在牆裡', !tiles[at(A.spawn.x, A.spawn.y)] && !tiles[at(A.portal.x, A.portal.y)]);
  ok(
    '藏身處：十二尊神像各一尊、三隻稻草人都在石圈裡',
    new Set(A.statues.map(s => s.z)).size === 12 &&
      A.dummies.length === 3 &&
      A.dummies.every(d => ((d.x - A.zone.x) / A.zone.rx) ** 2 + ((d.y - A.zone.y) / A.zone.ry) ** 2 < 1)
  );
  /* 稻草人 */
  R('dummyBuild()');
  const hit = v => R(`G.mobs[0].hp -= ${v}; G.mobs[0].hp`);
  ok(
    '稻草人：三隻、王的生命照倍率、階級照選的',
    R(
      'G.mobs.length === 3 && G.mobs[2].boss === 1 && G.mobs[2].mhp === 3000 && G.mapT === 2 && G.mobs[1].elite === true'
    )
  );
  hit(30);
  ok('稻草人：擊中算直接傷害與最高一擊', R('DPS.tot === 30 && DPS.max === 30 && DPS.dot === 0'));
  const after = hit(1e6);
  ok('稻草人：打爆了補滿，不會死', after === R('G.mobs[0].mhp') && R('DPS.tot') === 1000030 && R('DPS.max') === 1e6);
  R('G.mobs[0].hp = 0');
  ok('稻草人：歸零的寫入（撲殺）不算傷害、也不會死', R('DPS.tot === 1000030 && G.mobs[0].hp > 0'));
  R('PRAC.dot = 1; G.mobs[0].hp -= 5; PRAC.dot = 0');
  ok('稻草人：持續傷害另外算、不進最高一擊', R('DPS.dot === 5 && DPS.tot === 1000035 && DPS.max === 1e6'));
  R(
    `ailTick = m => { m.hp -= 7; m.x = 9999; }; DPS.dot = 0; G.mobs[1].x = 1; dummyTick(G.mobs[1], 0.1); ailTick = () => {}`
  );
  ok('稻草人：異常走得到、釘在原地', R('DPS.dot === 7 && G.mobs[1].x === G.mobs[1].hx'));
  R('G.t = 100; G.mobs[1].hitT = 90; dummyTick(G.mobs[1], 0.1)');
  ok('稻草人：沒人打 5 秒回滿', R('G.mobs[1].hp === G.mobs[1].mhp'));
  R('G.mobs[0].ailX = 1; G.mobs = []; PRAC.t = 3; dummyBuild(); dpsReset()');
  ok('稻草人：換階級重建、統計歸零', R('G.mobs.length === 3 && G.mapT === 3 && DPS.tot === 0 && dpsView().avg === 0'));
  /* DPS：10 秒平均 */
  R('G.t = 200; for (let i = 0; i < 20; i++) { dpsAdd(100, i % 2); G.t += 1; }');
  ok('DPS：10 秒平均只看最近 10 秒', Math.abs(R('dpsView().avg') - 100) < 11, R('dpsView().avg'));
  ok('DPS：直接與持續的比例', Math.abs(R('dpsView().dotP') - 0.5) < 1e-9 && R('DPS.tot') === 2000);
  R('G.t += 11');
  ok('DPS：停手 10 秒後平均歸零、總傷害留著', R('dpsView().avg === 0 && dpsView().tot === 2000'));
  R('dpsReset(); G.t = 300; dpsAdd(50, 0); G.t = 302');
  ok('DPS：剛開打用實際秒數平均', R('dpsView().avg') === 25);
  /* 對話資料 */
  const bad2 = R(`Object.entries(TALKS).flatMap(([k, T]) => [
      ...T.lines.filter(l => l[0] !== null && !NPCS[l[0]]).map(() => k + ' 的 NPC 不存在'),
      ...(typeof T.next === 'string' && !TALKS[T.next] ? [k + ' 的 next 不存在'] : [])
    ])`);
  ok('NPC：對話的角色與接續都存在', !bad2.length, bad2.join());
  ok(
    'NPC：每個人都接得到對話、位置都有',
    /* 破曉哨兵只在世界地圖的對話裡說話，不在藏身處 */
    R(`Object.keys(NPCS).every(id => id === 'dawn' || (TALKS[NPCS[id].talk(S)] && HIDE_ART.npc[id]))`)
  );
  ok('NPC：撿骨師、掌櫃在，赤鴉預設隱藏', R(`npcList().map(n => n.id).join() === 'bone,trader'`));
  R('S.story.crow = 1');
  ok('NPC：解鎖後赤鴉出現', R(`npcList().some(n => n.id === 'crow')`));
}
/* 技能寶石改版：升滿不把寶石升到失效、全部升滿平均分 */
{
  const R = s => vm.runInContext(s, ctx);
  R(`var mkG = (k, lv) => Object.assign(mkGem(k), { lv });
     S = { lv: 72, eq: {}, pt: [...PT_START], ptA: {}, asc: null, at: [], auras: [], charms: [], mat: Object.assign(newMat(), { soul: 1e7 }) };
     ST = stats(S);`);
  ok(
    '升滿：停在升完還能用的最高級，原因寫得出來',
    R(`(() => {
      const g = mkG('slash', 1), a = gemMaxCheck(g), free = gemLack({ ...g, lv: a.lv }).length;
      const next = gemLack({ ...g, lv: a.lv + 1 }).length;
      const top = mkG('slash', a.lv), b = gemMaxCheck(top);
      return a.lv > 1 && !free && next > 0 && !!b.why && /要/.test(b.why);
    })()`)
  );
  ok(
    '升滿：輔助與光環沒有能力值需求，升到角色上限',
    R(`gemMaxCheck(mkG('fury', 1)).lv === gemCap(S.lv) && gemMaxCheck(mkG('anger', 1)).lv === gemCap(S.lv)`)
  );
  ok(
    '全部升滿：靈魂不夠時最低等的先升、花費不超過持有、不把任何一顆升到失效',
    R(`(() => {
      S.mat.soul = 500;
      const L = [mkG('fury', 2), mkG('crit', 9), mkG('area', 2), mkG('slash', 3)], before = L[1].lv, P = gemAllPlan(L);
      const c = P.c, n = gemUpAll(L), lv = L.map(g => g.lv);
      return c <= 500 && S.mat.soul === 500 - c && n === P.L.length && L[1].lv === before && lv[0] > 2 && lv[2] > 2 && Math.abs(lv[0] - lv[2]) <= 1 && !L.some(g => gemLack(g).length);
    })()`)
  );
  ok(
    '全部升滿：靈魂夠的時候跟一顆一顆升滿花的一樣',
    R(`(() => {
      S.mat.soul = 1e7;
      const A = mkG('fury', 4), B = mkG('crit', 7), c = gemAllPlan([A, B]).c;
      const one = gemMaxCheck(A).c + gemMaxCheck(B).c;
      return c === one;
    })()`)
  );
}
/* 第 12 批：增益與資源（combat.js 的 BUFF）：疊層、上限、到期、數值生效、不是 NaN；奇術活力、滿溢聖杯 */
{
  const c5 = { console, Math, Date, JSON, Object, Array, Set, location: { search: '' }, URLSearchParams };
  vm.createContext(c5);
  for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'mech.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), c5, { filename: f });
  const R = s => vm.runInContext(s, c5);
  R(`var G = { t: 100, mapT: 5, scene: 'hide', state: 'play', mobs: [], pools: [], shots: [], grenades: [], units: [], ground: [], allies: [], W: 2000, H: 2000 }, P = { x: 0, y: 0, r: 14, cds: {}, mp: 1e4, hp: 100, ail: {} }, S, ST, TOUCH = { on: 0 };
     const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
     var LOS = true, HURT = null, DEAD = 0;
     const num = () => {}, fx = () => {}, fxs = () => {}, sfx = () => {}, hudWarn = () => {}, los = () => LOS, open = () => true, floorNear = () => null, isWall = () => false,
       die = () => DEAD++, killMob = m => (m.hp = 0), aggroPack = () => {}, hurtPlayer = (d, src, el, noEv) => (HURT = { d, n: src.D.n, el, noEv });`);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'skills.js'), 'utf8'), c5, {
    filename: 'skills.js'
  });
  const gs = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8').replace(/\r/g, '');
  vm.runInContext(gs.slice(gs.indexOf('function drinkFlask'), gs.indexOf('/* 受傷：完美閃避')), c5);
  R(
    `S = { lv: 60, eq: {}, pt: [...PT_START], asc: null, at: [], auras: [], charms: [], skills: [0, 1, 2, 3, 4].map(() => ({ a: null })) }; ST = stats(S); mechEnter();`
  );
  const b = R(`(() => {
    const o = {}, D = Object.values(MOBS)[0],
      mk = () => ({ D, x: 0, y: 0, r: 12, sz: 20, hp: 500, mhp: 1000, arm: 0, arm0: 0, ev: 100, vx: 0, vy: 0, dmg: 100, res: { fire: 0, cold: 0, light: 0, chaos: 0 }, ail: {} }),
      ATK = { D: { n: 'x', tags: ['attack', 'melee'] }, mult: 1, lv: 1 },
      SPL = { D: { n: 'x', tags: ['spell'], el: 'fire', m: 1 }, mult: 1, lv: 1 },
      avg = c => hitCalc(c, null, { avg: 1 }),
      r2 = v => Math.round(v * 100) / 100,
      base = { ...ST },
      reset = () => {
        G.t = 100; G.mm = null; G.mobs = []; G.state = 'play'; G.scene = 'hide'; DEAD = 0;
        ST = { ...base, dmg: [100, 100], armor: 0, block: 0, defl: 0, ev: 0, hp: 1000, mp: 1000, es: 1000 };
        Object.assign(P, { x: 0, y: 0, hp: 1000, mp: 1000, es: 1000, ail: {}, buf: {}, stk: null, stkC: null, stkE: null, drain: null, chg: {}, rage: 0, rageCd: 0, flask: 0, mflask: 0, heal: 0, mheal: 0, form: null, charmRes: {}, evE: null, lastHit: null });
      },
      run = (s, dt = 0.05) => { for (let i = 0; i < Math.round(s / dt); i++) { G.t += dt; baseTick(dt); } };

    /* 每一列：疊層、上限、狀態圖示、不是 NaN、到期 */
    o.rows = Object.keys(BUFF).filter(k => BUFF[k].max);
    o.bad = [];
    const keys = [...new Set(o.rows.flatMap(k => Object.keys(BUFF[k].st || {})))];
    for (const k of o.rows) {
      const R = BUFF[k], st = () => playerStates().find(x => x.k === k), no = w => o.bad.push(k + ' ' + w);
      reset();
      gainStk(k);
      if (stkN(k) !== 1) no('疊層 1');
      if (R.max > 1) { gainStk(k); if (stkN(k) !== 2) no('疊層 2'); }
      if (!R.fade) gainStk(k, 99);
      if (stkN(k) !== R.max) no('上限');
      const s = st();
      if (!s || s.n !== R.n || s.ic !== R.ic || (R.max > 1 && s.c !== R.max)) no('狀態圖示');
      const vals = [...keys.map(bufV), buffSpeed(), buffMove(), avg(ATK).d, avg(SPL).d, hurtCalc(100, null, 'phys', 1).d, hurtCalc(100, null, 'fire', 1).d];
      if (!vals.every(Number.isFinite)) no('NaN ' + vals.join());
      if (R.t || R.lose) {
        G.t += R.lose ? R.lose * R.max + 0.01 : R.t + 0.01;
        if (stkN(k) || st()) no('到期');
        if (keys.some(x => bufV(x))) no('到期後還有數值');
      } else {
        G.t += 1e5;
        if (stkN(k) !== R.max) no('不該到期');
        stkClr(k);
        if (stkN(k) || st()) no('清掉');
      }
    }
    /* 來源可以指定秒數 */
    reset(); gainStk('chalice', 1, 5); G.t += 4.9; o.tA = stkN('chalice'); G.t += 0.2; o.tB = stkN('chalice');
    reset(); gainStk('elusive', 1, 60); o.tC = bufV('moveP'); G.t += 5.01; o.tD = stkN('elusive');
    /* 持續時間：刷新 vs 每層各算各的 */
    reset(); gainStk('dark', 3); G.t += 5; gainStk('dark'); G.t += 5; o.dark = stkN('dark');
    reset(); gainStk('storm', 3); G.t += 3; gainStk('storm'); G.t += 3; o.storm = stkN('storm');
    reset(); gainStk('prowess', 3); G.t += 1; gainStk('prowess'); const nFull = stkN('prowess'); G.t += 9.5; o.prow = [nFull, stkN('prowess')];
    reset(); gainStk('unbound', 10); G.t += 5.01; const u1 = stkN('unbound'); G.t += 20; o.lose = [u1, stkN('unbound')];
    /* 靈巧：遞減、結束前不能再獲得、移動速度跟 ST.ms 同池、避開擊中 */
    reset(); ST.ms = 20; const mv0 = buffMove(); gainStk('elusive'); o.el0 = [bufV('moveP'), bufV('avoid'), r2(buffMove() / mv0)];
    G.t += 2.5; gainStk('elusive', 1, 60); o.el1 = [bufV('moveP'), bufV('avoid')];
    G.t += 2.6; o.el2 = bufV('moveP'); gainStk('elusive'); o.el3 = bufV('moveP');
    reset(); gainStk('elusive'); let av = 0; for (let i = 0; i < 4000; i++) if (hurtCalc(100, null, 'phys').ev) av++;
    o.avoid = av / 40; o.avoidNo = hurtCalc(100, null, 'phys', 1).ev;
    /* 黑暗低語：詛咒幅度跟 debuffMag 同池；到期 4 秒內損失、能致死、死因 */
    reset(); const m = mk(); curseMob(m, 'vuln', 1); const c0 = m.ail.curse.v; gainStk('dark', 5); curseMob(m, 'vuln', 1); o.cu = r2(m.ail.curse.v / c0);
    ST.debuffMag = 50; curseMob(m, 'vuln', 1); o.cu2 = r2(m.ail.curse.v / c0);
    reset(); gainStk('dark', 10); run(8.1); o.dr0 = [stkN('dark'), !!P.drain]; run(5); o.dr = [Math.round(P.hp), Math.round(P.mp), Math.round(P.es), !!P.drain, P.lastHit.n, DEAD];
    reset(); P.hp = 100; gainStk('dark', 10); run(13); o.drK = DEAD > 0;
    /* 風暴湧流：獲得額外閃電，只有攻擊 */
    reset(); ST.noCrit = 1; gainStk('storm', 10); const m2 = mk(), hA = hitCalc(ATK, m2), hS = hitCalc(SPL, m2); o.st = [r2(hA.pre.light / hA.pre.phys), hS.pre.light];
    /* 德魯伊之賦：技能速度同池、法術擊中給盛怒、0.5 秒限制 */
    reset(); ST.as = 0; ST.ss = 0; gainStk('prowess', 2); o.ss = r2(buffSpeed());
    const hit = sp => onHitBase(mk(), { spell: sp, crit: 0, d: 1, pre: { light: 0 } }, sp ? SPL : ATK);
    hit(1); const g1 = P.rage; hit(1); const g2 = P.rage; G.t += 0.6; hit(0); const g3 = P.rage; hit(1); o.rg = [g1, g2, g3, P.rage];
    /* 翠玉：物理減免、90% 上限、不影響元素 */
    reset(); const j0 = hurtCalc(100, null, 'phys', 1).d, jf0 = hurtCalc(100, null, 'fire', 1).d; gainStk('jade', 10);
    const j1 = hurtCalc(100, null, 'phys', 1).d, jf1 = hurtCalc(100, null, 'fire', 1).d; ST.armor = 1e9; o.jade = [j0, j1, r2(hurtCalc(100, null, 'phys', 1).d), jf0 === jf1];
    /* 完美增益：更多、不進提高池；增益效果與幅度都吃 */
    reset(); const pf0 = avg(ATK); gainStk('perfect', 4); const pf1 = avg(ATK); o.pf = [r2(pf1.more / pf0.more), pf1.inc === pf0.inc];
    ST.buffEff = 100; ST.buffMag = 50; o.pfM = bufV('more');
    /* 無縛潛能：真的護甲與能量護盾（stats 同池）、傷害提高；到人形全失、能量護盾收回 */
    reset();
    const lo = f => BASES.filter(f).sort((x, y) => x.lv - y.lv)[0].id;
    S.eq = { chest: mkItem(lo(x => x.k === 'chest' && x.b.armor && !x.b.es && !x.b.ev), 1, 0), helm: mkItem(lo(x => x.k === 'helm' && x.b.es && !x.b.armor && !x.b.ev), 1, 0) };
    ST = stats(S); P.es = ST.es; const a0 = ST.armor, e0 = ST.es, in0 = avg(ATK).inc;
    gainStk('unbound', 5); run(0.05); o.ub = [a0 > 0, e0 > 0, r2(ST.armor / a0), r2(ST.es / e0), avg(ATK).inc - in0]; P.es = ST.es;
    formFor({ form: 'bear' }); formFor({ form: 'wolf' }); const keep = stkN('unbound'); formFor({}); run(0.05); o.ub2 = [keep, stkN('unbound'), ST.armor === a0, ST.es === e0, P.es <= e0];
    S.eq = {}; ST = stats(S);
    /* 奇術活力：只有生效時給、每 5 秒一顆、種類照能力值需求 */
    const only = a => Object.keys(SKILLS).find(k => { const r = gemAttrReq(mkGem(k, 5)); return r[a] > 0 && ATTR.every(x => x === a || !r[x]); }),
      nChg = () => chgN('e') + chgN('f') + chgN('p');
    reset(); run(6); o.dy0 = nChg();
    reset(); gainStk('dyn'); run(4.9); const dy1 = nChg(); run(0.2); o.dy = [dy1, nChg()];
    o.dyT = [['str', 'e'], ['dex', 'f'], ['int', 'p']].map(([a, c]) => { reset(); S.skills[0].a = mkGem(only(a), 5); dynChg(); return chgN(c); });
    reset(); S.skills[0].a = mkGem(only('str'), 5); S.skills[1].a = mkGem(only('int'), 5);
    const seen = { e: 0, f: 0, p: 0 }; for (let i = 0; i < 300; i++) { P.chg = {}; dynChg(); for (const c in seen) seen[c] += chgN(c); } o.dyW = seen;
    S.skills[0].a = S.skills[1].a = null; reset(); dynChg(); o.dyNone = nChg();
    /* 滿溢聖杯：每秒 2 充能＝0.2 瓶、恢復量跟藥劑效果同池、到上限為止 */
    reset(); P.flask = 0; P.mflask = 1; gainStk('chalice', 1, 10); run(1); o.fl = [r2(P.flask), r2(P.mflask)]; run(10); o.fl2 = r2(P.flask);
    reset(); P.flask = P.mflask = 2.99; gainStk('chalice', 1, 5); run(2); o.fl3 = [P.flask, P.mflask];
    reset(); G.scene = 'map'; ST.flask = 20; P.flask = P.mflask = 3; drinkFlask(); drinkFlask(1); const h0 = P.heal, mh0 = P.mheal;
    gainStk('chalice', 1, 5); P.heal = P.mheal = 0; drinkFlask(); drinkFlask(1); o.fl4 = [r2(P.heal / h0), r2(P.mheal / mh0)];
    /* 沒有層數時一切照舊 */
    reset(); o.none = keys.map(bufV).every(v => v === 0);
    o.terms = ['靈巧', '黑暗低語', '風暴湧流', '德魯伊之賦', '翠玉', '無縛潛能', '完美增益', '奇術活力', '滿溢聖杯'].filter(k => !TERMS[k]);
    return o;
  })()`);
  ok(
    '層數增益：十列（含血怒）都有疊層、上限、狀態圖示與層數、不是 NaN、到期或清掉',
    b.rows.length === 10 && !b.bad.length,
    b.rows.join() + ' ' + b.bad.join(' | ')
  );
  ok(
    '層數增益：來源可以指定秒數，會遞減的不行',
    b.tA === 1 && b.tB === 0 && b.tC === 30 && b.tD === 0,
    JSON.stringify([b.tA, b.tB, b.tC, b.tD])
  );
  ok(
    '層數增益：得到新層時全部刷新（黑暗低語）、每層各算各的（風暴湧流、德魯伊之賦，滿了擠掉最舊的）、每 5 秒掉一層（無縛潛能）',
    b.dark === 4 && b.storm === 1 && b.prow.join() === '3,1' && b.lose.join() === '9,5',
    JSON.stringify([b.dark, b.storm, b.prow, b.lose])
  );
  ok(
    '靈巧：移動速度跟提高池相加、5 秒遞減到 0、結束前不能再獲得',
    b.el0.join() === '30,15,1.25' && b.el1.join() === '15,7.5' && b.el2 === 0 && b.el3 === 30,
    JSON.stringify([b.el0, b.el1, b.el2, b.el3])
  );
  ok(
    '靈巧：約 15% 避開擊中，紅光大招躲不掉',
    Math.abs(b.avoid - 15) < 3 && !b.avoidNo,
    JSON.stringify([b.avoid, b.avoidNo])
  );
  ok('黑暗低語：每層詛咒幅度 +4%，跟其他幅度相加', b.cu === 1.2 && b.cu2 === 1.7, JSON.stringify([b.cu, b.cu2]));
  ok(
    '黑暗低語：結束後 4 秒損失每層 3% 生命魔力能量護盾，死因寫得出來，會致死',
    b.dr0.join() === '0,true' && b.dr.join() === '700,700,700,false,黑暗低語,0' && b.drK,
    JSON.stringify([b.dr0, b.dr, b.drK])
  );
  ok('風暴湧流：每層 3% 獲得額外閃電，法術沒有', b.st.join() === '0.3,0', b.st.join());
  ok(
    '德魯伊之賦：每層技能速度 +10%、法術擊中每層 3 盛怒、每 0.5 秒一次、非法術不給',
    b.ss === 1.2 && b.rg.join() === '6,6,6,12',
    JSON.stringify([b.ss, b.rg])
  );
  ok('翠玉：10 層物理 −10%，跟護甲一起吃 90% 上限，不影響元素', b.jade.join() === '100,90,10,true', b.jade.join());
  ok(
    '完美增益：4 層 20% 更多、不進提高池，增益效果與幅度分開相乘',
    b.pf.join() === '1.2,true' && b.pfM === 60,
    JSON.stringify([b.pf, b.pfM])
  );
  ok(
    '無縛潛能：5 層傷害提高 +100、護甲與能量護盾 ×1.5（跟 stats 同池），變身之間不掉、變回人形全部失去',
    b.ub[0] &&
      b.ub[1] &&
      Math.abs(b.ub[2] - 1.5) < 0.1 &&
      Math.abs(b.ub[3] - 1.5) < 0.1 &&
      b.ub[4] === 100 &&
      b.ub2.join() === '5,0,true,true,true',
    JSON.stringify([b.ub, b.ub2])
  );
  ok(
    '奇術活力：沒生效不給、每 5 秒一顆、種類照能力值需求加權',
    b.dy0 === 0 &&
      b.dy.join() === '0,1' &&
      b.dyT.join() === '1,1,1' &&
      b.dyW.e > 50 &&
      b.dyW.p > 50 &&
      b.dyW.f === 0 &&
      b.dyNone === 1,
    JSON.stringify([b.dy0, b.dy, b.dyT, b.dyW, b.dyNone])
  );
  ok(
    '滿溢聖杯：每秒 0.2 瓶、到期就停、不超過上限，恢復量跟藥劑效果同池（1.5÷1.2）',
    b.fl.join() === '0.2,1.2' && b.fl2 === 2 && b.fl3.join() === '3,3' && b.fl4.join() === '1.25,1.25',
    JSON.stringify([b.fl, b.fl2, b.fl3, b.fl4])
  );
  ok('層數增益：沒有層數時數值都是 0；九張名詞卡都在', b.none && !b.terms.length, b.terms.join());
}
/* 第 13～16 批（企劃書 7.2、7.3）：標籤與名詞卡、分裂、迴旋、超限格擋率、效果消耗、最終打擊、終極、擴散傷害、只有最低或最高傷害、暴露弱點、封印、
   召喚物（極大、暫時、死亡與擊殺、復甦）、翻滾（無法翻滾、無法躲避傷害）、迷蹤、預期擊退、能力值基石；真的跑 updShots、doRoll、hurtPlayer */
{
  const c6 = { console, Math, Date, JSON, Object, Array, Set, location: { search: '' }, URLSearchParams };
  vm.createContext(c6);
  for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'mech.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), c6, { filename: f });
  const R = s => vm.runInContext(s, c6);
  R(`var G = { t: 100, mapT: 5, scene: 'map', state: 'play', mobs: [], pools: [], meteors: [], swarms: [], shots: [], tele: [], grenades: [], units: [], ground: [], allies: [], W: 5000, H: 5000 }, P = { x: 0, y: 0, r: 14, cds: {}, mp: 1e4, hp: 100, ail: {} }, S, ST, TOUCH = { on: 0 };
     const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x), angDiff = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
     var WARN = '', DEAD = 0; const TAU = Math.PI * 2;
     const num = () => {}, fx = () => {}, fxs = () => {}, sfx = () => {}, sparks = () => {}, hudWarn = t => (WARN = t), los = () => true, open = () => true, floorNear = () => null, isWall = () => false,
       die = () => DEAD++, killMob = m => (m.hp = 0), aggroPack = () => {}, thornHit = () => {}, mobNear = () => null, mouseWorld = () => ({ x: 0, y: 0 });`);
  const skSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'skills.js'), 'utf8').replace(/\r/g, '');
  vm.runInContext(
    skSrc.replace('function mobNear(', 'function mobNear_(').replace('function thornHit(', 'function thornHit_('),
    c6,
    {
      filename: 'skills.js'
    }
  );
  const gs = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8').replace(/\r/g, '');
  vm.runInContext(gs.slice(gs.indexOf('function doRoll'), gs.indexOf('/* mana：喝魔力藥劑')), c6);
  vm.runInContext(gs.slice(gs.indexOf('function hurtPlayer'), gs.indexOf('/* 死亡（PoE 式）')), c6);
  vm.runInContext(gs.slice(gs.indexOf('function updShots'), gs.indexOf('/* ---------- 主迴圈')), c6);
  R(
    `S = { lv: 60, eq: {}, pt: [...PT_START], asc: null, at: [], auras: [], charms: [], skills: [0, 1, 2, 3, 4].map(() => ({ a: null })) }; ST = stats(S); mechEnter();`
  );
  const b = R(`(() => {
    const o = {}, D = Object.values(MOBS)[0],
      mk = (x = 0, y = 0, e = {}) => ({ D, x, y, r: 12, sz: 20, hp: 1e6, mhp: 1e6, arm: 0, arm0: 0, ev: 0, vx: 0, vy: 0, dmg: 100, res: { fire: 0, cold: 0, light: 0, chaos: 0 }, ail: {}, ...e }),
      ATK = { D: { n: 'x', tags: ['attack', 'melee', 'strike'] }, mult: 1, lv: 1, kb: 1, leech: 0 },
      PROJ = { D: { n: 'x', tags: ['attack', 'proj'] }, mult: 1, lv: 1, kb: 1, leech: 0, pierce: 0, chain: 0 },
      SPL = { D: { n: 'x', tags: ['spell'], el: 'fire', m: 1 }, mult: 1, lv: 1 },
      avg = c => hitCalc(c, null, { avg: 1 }).d,
      r2 = v => Math.round(v * 100) / 100,
      base = { ...ST },
      reset = () => {
        G.t = 100; G.mm = null; G.mobs = []; G.shots = []; G.allies = []; G.state = 'play'; G.slow = 0; DEAD = 0; WARN = '';
        ST = { ...base, dmg: [100, 100], wadd: { fire: [0, 0], cold: [0, 0], light: [0, 0], chaos: [0, 0] }, add: { flat: [0, 0], fire: [0, 0], cold: [0, 0], light: [0, 0], chaos: [0, 0] }, armor: 0, block: 0, defl: 0, ev: 0, hp: 1000, mp: 1000, es: 0, noCrit: 1, noMiss: 1 };
        Object.assign(P, { x: 0, y: 0, vx: 0, vy: 0, face: 0, mdx: 1, mdy: 0, hp: 1000, mp: 1000, es: 0, ail: {}, buf: {}, stk: null, chg: {}, rage: 0, form: null, evE: null, lastHit: null, roll: null, iuntil: 0, cds: {}, ev: {}, seal: {}, stage: {}, combo: 0, comboT: 0, hurtT: 0 });
      },
      shot = (c, e = {}) => shoot(0, 800, c, {}, e);

    /* 標籤 */
    const tagOf = k => SKILLS[k].tags;
    o.tags = [tagOf('venom').includes('orb'), tagOf('rend').includes('payoff'), tagOf('fissure').includes('payoff'), tagOf('grenade').includes('grenade'), tagOf('banner').includes('banner'), tagOf('warcry').includes('cascade'), tagOf('nova').includes('cascade'), tagOf('meteor').includes('cascade'), tagOf('cu_vuln').includes('cascade'), tagOf('slash').includes('final'), tagOf('chainsweep').includes('final'), tagOf('paperdoll').includes('temp')];
    o.tagNo = [tagOf('fireball').includes('cascade'), tagOf('smash').includes('payoff'), tagOf('thrust').includes('payoff')];
    o.stageFinal = Object.keys(SKILLS).filter(k => !!SKILLS[k].stage !== tagOf(k).includes('final'));
    o.terms = ['寶珠技能','捷光環技能','遣散技能','擲彈技能','鬥旗技能','疾風技能','風暴技能','可爆發技能','主要寶石','連結的輔助技能','分裂','迴旋','超限格擋率','效果消耗','最終打擊','終極','擴散傷害','只有最低或最高傷害','暴露弱點','封印','極大','暫時召喚物','召喚物死亡及擊殺召喚物','復甦召喚物','迷蹤','無法閃避翻滾或衝刺','閃避翻滾無法躲避傷害','預期擊退','黑暗血鐮訓練','循環教義','騎士信條','堅鐵之力','鋼鐵意志','無法獲得力量的固有加成','無法獲得敏捷的固有加成','無法獲得智慧的固有加成'].filter(k => !TERMS[k]);
    o.statn = [...Object.keys(ATT_KS), 'projAtkP', 'fork', 'projRet', 'splash', 'minmax', 'reveal', 'weakMore', 'noRoll', 'rollTank', 'minGiant'].filter(k => !STATN[k] || !(k in base));

    /* 分裂：第一次擊中變 2 支、原本的消失、不扣穿透；分出來的打到別隻不再分 */
    reset(); P.x = P.y = 500;
    const m1 = mk(530, 482), m2 = mk(900, 482);
    G.mobs = [m1, m2];
    const cf = { ...gemCfg(mkGem('axethrow', 1), 0), fork: true, pierce: 1 };
    shot(cf); updShots(1 / 60);
    o.fork1 = [G.shots.length, G.shots.every(s => s.noFork), G.shots.every(s => s.pierce === 1), m1.hp < m1.mhp];
    const n1 = G.shots.length; for (let i = 0; i < 4; i++) updShots(1 / 60);
    reset(); P.x = P.y = 500; G.mobs = [mk(530, 482)];
    shot({ ...cf, pierce: 1 }, { noFork: 1 }); updShots(1 / 60);
    o.fork2 = [G.shots.length <= n1, G.shots.length, G.shots[0].pierce];
    reset(); ST.fork = 1; o.forkCfg = [gemCfg(mkGem('axethrow', 1), 0).fork, gemCfg(mkGem('slash', 1), 0).fork];

    /* 迴旋：飛到終點或打完最後一個目標後飛回來，回程再打一次；投射物技能才有；會爆炸的不飛回來 */
    reset(); ST.projRet = 1; o.retCfg = [gemCfg(mkGem('axethrow', 1), 0).ret, gemCfg(mkGem('slash', 1), 0).ret];
    const cr = gemCfg(mkGem('axethrow', 1), 0); cr.pierce = 0;
    P.x = P.y = 500;
    const m3 = mk(700, 482); G.mobs = [m3];
    shot(cr); const sr = G.shots[0];
    let hitN = 0, hp0 = m3.hp;
    for (let i = 0; i < 180 && G.shots.length; i++) { updShots(1 / 60); if (m3.hp < hp0) (hitN++, (hp0 = m3.hp)); }
    o.ret = [!!sr.back, hitN, G.shots.length];
    reset(); ST.projRet = 1; const cb = gemCfg(mkGem('axethrow', 1), 0);
    shoot(0, 800, cb, {}, { boom: 40 }); o.retBoom = !!G.shots[0].back;
    /* 場上單位射的飛回單位的位置 */
    reset(); const cu = { ...gemCfg(mkGem('axethrow', 1), 0), ret: true };
    shoot(0, 800, cu, { unit: 1 }, { sx: 500, sy: 300, x: 520, y: 280, ret: 1 });
    P.x = 4000; updShots(1 / 60); o.retUnit = G.shots[0].vx < 0 ? 1 : r2(G.shots[0].vx);

    /* 超限格擋率：超過 50 的部分，沒超過是 0 */
    reset();
    const sb = PTREE.I[PT_START[0]].s; const sb0 = { ...sb };
    Object.assign(sb, { block: 60 }); const st1 = stats(S); Object.assign(sb, { block: 30 }); const st2 = stats(S);
    for (const k in sb) if (!(k in sb0)) delete sb[k];
    Object.assign(sb, sb0);
    o.over = [st1.block, st1.blockOver, st2.block, st2.blockOver];

    /* 效果消耗：同一下只消耗一種（狀態留著）、技能優先、之後可以再消耗；消耗後免疫 1 秒，時間到恢復；累積條不算減益 */
    reset();
    const me = mk(); me.ail.bleed = { dps: 10, t: G.t + 5 }; me.ail.shock = G.t + 5;
    o.eat1 = [takeState(me, 'bleed'), takeState(me, 'shock'), hasState(me, 'shock')];
    G.t += 0.1; o.eat2 = takeState(me, 'shock');
    const mo = mk(); mo.ail.shock = G.t + 5; mo.ail.bleed = { dps: 10, t: G.t + 5 };
    o.eat3 = [takeState(mo, 'shock', true), takeState(mo, 'bleed')];
    const mo2 = mk(); mo2.ail.shock = G.t + 5; mo2.ail.bleed = { dps: 10, t: G.t + 5 };
    o.eat4 = [takeState(mo2, 'shock'), takeState(mo2, 'bleed', true), hasState(mo2, 'bleed')];
    const mo3 = mk(); mo3.ail.shock = G.t + 5; mo3.ail.bleed = { dps: 10, t: G.t + 5 };
    o.eat5 = [takeState(mo3, 'shock', true), takeState(mo3, 'bleed', true), hasState(mo3, 'bleed')];
    reset();
    const mi = mk(); mi.ail.parried = G.t + 2; takeState(mi, 'parried');
    applyParry(mi); const ip0 = parryOn(mi); G.t += 1.01; applyParry(mi); o.imm = [ip0, parryOn(mi)];
    const mc = mk(); curseMob(mc, 'vuln', 1); G.t += 0.1; takeState(mc, 'curse'); curseMob(mc, 'vuln', 1); const cu0 = !!mc.ail.curse; G.t += 1.01; curseMob(mc, 'vuln', 1); o.immC = [cu0, !!mc.ail.curse];
    const mb = mk(); mb.ail.broken = G.t + 5; G.t += 0.1; takeState(mb, 'broken'); o.immB = !!noBreak(mb.ail); G.t += 1.01; o.immB2 = !!noBreak(mb.ail);
    /* 異常：消耗流血、點燃、感電後 1 秒內上不去 */
    ST.bleedCh = 100; ST.ignAll = 0;
    const mh = mk(); mh.ail.bleed = { dps: 10, t: G.t + 5 }; G.t += 0.1; takeState(mh, 'bleed');
    const rH = { pre: { phys: 1e6, fire: 0, cold: 0, light: 1e9, chaos: 0 }, post: { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0 }, d: 1 };
    const cH = { ...ATK, bleedCh: 100 };
    applyAil(mh, rH, cH, {}); const bl0 = !!mh.ail.bleed; G.t += 1.01; applyAil(mh, rH, cH, {}); o.immBl = [bl0, !!mh.ail.bleed];
    const ms = mk(); ms.ail.shock = G.t + 5; G.t += 0.1; takeState(ms, 'shock'); applyAil(ms, rH, cH, {}); const sh0 = ms.ail.shock > G.t; G.t += 1.01; applyAil(ms, rH, cH, {}); o.immSh = [sh0, ms.ail.shock > G.t];
    const mq = mk(); mq.ail.hs = 99; mq.ail.elc = 0; o.immP = (takeState(mq, 'primed'), !(mq.ail.imm && mq.ail.imm.primed));

    /* 最終打擊與終極 */
    reset();
    P.stage = {}; const st = [nextStage('slash'), nextStage('slash'), nextStage('slash'), nextStage('slash')];
    o.stages = [st.join(), isFinal(2), isFinal(1)];
    reset(); gainBuff('finality', 5); o.skip = [nextStage('slash'), nextStage('slash'), nextStage('chainsweep')];
    reset(); ST.noCrit = 0; ST.wcrit = 10; ST.critInc = 0;
    let c0 = 0, c1 = 0, c2 = 0;
    for (let i = 0; i < 4000; i++) { if (hitCalc(ATK, mk()).crit) c0++; if (hitCalc(ATK, mk(), { final: 1 }).crit) c1++; }
    gainBuff('finality', 99);
    for (let i = 0; i < 4000; i++) if (hitCalc(ATK, mk(), { final: 1 }).crit) c2++;
    o.fin = [c0, c1, c2];
    reset(); comboHit({}); const cb0 = comboN(); gainBuff('finality', 5); comboHit({}); o.finCombo = [cb0, comboN()];

    /* 擴散傷害：只有打擊、範圍 1.5 公尺、多一次擊中、不連鎖擴散 */
    reset(); ST.splash = 1;
    const sA = mk(0, 0), sB = mk(40, 0), sC = mk(45 + 12 + 1, 0), sD = mk(90, 0);
    G.mobs = [sA, sB, sC, sD];
    hitMob(sA, { ...ATK, D: { ...ATK.D, tags: ['attack', 'melee', 'strike'] } }, 0, 0, { quiet: 1 });
    o.spl = [sA.hp < 1e6, sB.hp < 1e6, sC.hp === 1e6, sD.hp === 1e6];
    reset(); ST.splash = 1;
    const tA = mk(0, 0), tB = mk(40, 0); G.mobs = [tA, tB];
    hitMob(tA, { ...ATK, D: { n: 'x', tags: ['attack', 'melee', 'slam'] } }, 0, 0, { quiet: 1 });
    o.splNo = tB.hp === 1e6;
    reset(); const uA = mk(0, 0), uB = mk(40, 0); G.mobs = [uA, uB];
    hitMob(uA, { ...ATK, splash: 1 }, 0, 0, { quiet: 1 }); o.splC = uB.hp < 1e6;

    /* 只有最低或最高傷害：只有兩種值、各 50%；幸運 75%；每種傷害各擲；面板期望值一致 */
    reset(); ST.dmg = [100, 300]; ST.minmax = 1;
    const seen = {}; for (let i = 0; i < 4000; i++) { const v = Math.round(hitCalc(ATK, null).pre.phys); seen[v] = (seen[v] || 0) + 1; }
    o.mmV = Object.keys(seen).sort((x, y) => x - y).join(); o.mmP = seen[300] / 4000; o.mmA = r2(avg(ATK));
    ST.lukDmg = 1; let hi = 0; for (let i = 0; i < 4000; i++) if (hitCalc(ATK, null).pre.phys > 200) hi++;
    o.mmL = hi / 4000; o.mmAL = r2(avg(ATK));
    reset(); ST.dmg = [100, 300]; ST.wadd = { ...ST.wadd, fire: [100, 300] }; ST.minmax = 1;
    let mix = 0; for (let i = 0; i < 2000; i++) { const p = hitCalc(ATK, null).pre; if ((p.phys > 200) !== (p.fire > 200)) mix++; }
    o.mmMix = mix / 2000;
    reset(); ST.minmax = 1; const sv = new Set(); for (let i = 0; i < 500; i++) sv.add(Math.round(hitCalc(SPL, null).pre.fire)); o.mmS = sv.size;
    reset(); ST.dmg = [100, 300]; const sa = new Set(); for (let i = 0; i < 200; i++) sa.add(Math.round(hitCalc(ATK, null).pre.phys)); o.mmOff = sa.size > 2;

    /* 暴露弱點：精英與王才有；3 段、合計 45%、不重疊；生命在區段裡才算開放弱點；更多 */
    reset();
    const mw = mk(0, 0, { elite: 1 }); o.weak0 = openWeak(mw); ST.reveal = 1;
    const seg = weakSegs(mw); o.weakSeg = [seg.length, r2(seg.reduce((t, [a, b]) => t + b - a, 0)), seg.every((x, i) => i === 0 || x[0] >= seg[i - 1][1]), seg[0][0] >= 0, seg[2][1] <= 1];
    const mwN = mk(); mwN.weak = seg; mwN.hp = mwN.mhp * ((seg[1][0] + seg[1][1]) / 2); o.weakN = openWeak(mwN);
    mw.hp = mw.mhp * ((seg[1][0] + seg[1][1]) / 2); o.weak1 = openWeak(mw);
    mw.hp = mw.mhp * (seg[0][1] + (seg[1][0] - seg[0][1]) / 2); o.weak2 = seg[1][0] > seg[0][1] ? openWeak(mw) : false;
    mw.hp = mw.mhp * ((seg[1][0] + seg[1][1]) / 2); ST.weakMore = 50; const dW = hitCalc(ATK, mw).d, dN = hitCalc(ATK, mk()).d; o.weakM = r2(dW / dN);

    /* 封印：每 every 倍施放時間 1 個、最多 max、打破歸零；沒有 D.seal 的不累積；範圍吃進提高池 */
    reset();
    SKILLS.frostbolt.seal = { max: 3, every: 2, aoe: 30 };
    S.skills[0].a = mkGem('frostbolt', 1); S.skills[1].a = mkGem('arc', 1);
    const per = 2 * actDur(slotCfg(0));
    sealTick(per * 1.5); o.seal1 = sealN('frostbolt');
    for (let i = 0; i < 20; i++) sealTick(per); o.seal2 = [sealN('frostbolt'), sealN('arc')];
    o.seal3 = [sealBreak('frostbolt'), sealN('frostbolt'), sealBreak('arc')];
    delete SKILLS.frostbolt.seal; S.skills[0].a = S.skills[1].a = null;

    /* 極大 */
    reset(); callWolf('gem', null); const w0 = G.allies[0];
    ST.minGiant = 1; callWolf('gem', null); const w1 = G.allies[1];
    o.giant = [r2(w1.mhp / w0.mhp), r2(w1.r / 14), giantM(w1)];
    ST.minGiant = 0; callWolf('gem', { giant: 1 }); o.giantC = [r2(G.allies[2].mhp / w0.mhp), giantM(w0)];

    /* 暫時召喚物、死亡與擊殺：時間到算死亡不算被擊殺；被打死算被擊殺；暫時的不復活 */
    reset(); P.ev = {}; callWolf('doll', { q: 0 }, P, G.t + 15); G.t += 15.1; updSkills(0);
    o.tempExp = [G.allies.length, recent('mdie'), recent('mkill')];
    reset(); P.ev = {}; callWolf('doll', { q: 0 }, P, G.t + 15); allyHurt(G.allies[0], 1e9);
    o.tempKill = [G.allies.length, recent('mdie'), recent('mkill')];
    reset(); P.ev = {}; callWolf('gem', null); const wg = G.allies[0];
    for (const w of G.allies.filter(w => w.src === 'gem')) allyDie(w);
    o.gone = [G.allies.length, recent('mdie'), recent('mkill')];

    /* 復甦召喚物：被擊殺留在場上、7.5 秒後滿血復活；另一隻死亡時重算；死的不打人、自癒 */
    reset(); P.ev = {}; callWolf('gem', null); callWolf('gem', null);
    const [ra, rb] = G.allies; ra.c = rb.c = BASEC();
    allyHurt(ra, 1e12);
    o.rv1 = [G.allies.length, ra.dead > G.t, ra.hp, recent('mkill')];
    allyHurt(ra, 5); o.rv1b = ra.hp;
    G.t += 5; allyHurt(rb, 1e12);
    o.rv2 = [ra.dead === rb.dead, r2(ra.dead - G.t)];
    G.t += 7.4; updAllies(0.01); const up0 = ra.dead > G.t; G.t += 0.11; updAllies(0.01);
    o.rv3 = [up0, !!ra.dead, ra.hp === ra.mhp, !!rb.dead];
    reset(); callWolf('gem', null); const rc = G.allies[0];
    allyHurt(rc, rc.mhp / 2); const h0 = rc.hp;
    G.t += 3.9; updAllies(0.5); const h1 = rc.hp; G.t += 0.2; updAllies(1); o.heal = [h0 === h1, r2((rc.hp - h1) / rc.mhp)];
    reset(); ST.hp = 1000; callWolf('golem', null); allyHurt(G.allies[0], 1e12);
    let tk = 0; const hg = hurtCalc; o.golemDead = !G.allies.some(w => w.src === 'golem' && !w.dead && dist(w, P) < 200);
    /* 紙人的生命照屍體，極大也吃 */
    reset(); ST.minGiant = 1; G.corpses = [{ x: 0, y: 0, mhp: 200, t: G.t + 9 }];
    callWolf('doll', { q: 0 }, P, G.t + 15); const nd = G.allies[0]; nd.hp = nd.mhp = 200 * giantM(nd); o.dollHp = nd.mhp;

    /* 無法閃避翻滾 */
    reset(); ST.noRoll = 1; doRoll(); o.noRoll = [P.roll, WARN];
    reset(); doRoll(); o.canRoll = !!P.roll && P.iuntil > G.t;

    /* 閃避翻滾無法躲避傷害：沒有無敵、沒有完美閃避、翻滾中少 30%；沒翻滾不打折；開關關著照舊 */
    reset(); doRoll(); P.hp = 1000; hurtPlayer(100, { D: { n: 'x' } }, 'fire', 1); o.rollNormal = P.hp;
    reset(); ST.rollTank = 1; doRoll(); o.tankI = P.iuntil > G.t;
    P.hp = 1000; hurtPlayer(100, { D: { n: 'x' } }, 'fire', 1); o.tank = r2(1000 - P.hp);
    reset(); ST.rollTank = 1; P.hp = 1000; hurtPlayer(100, { D: { n: 'x' } }, 'fire', 1); o.tankOff = r2(1000 - P.hp);
    o.tankNum = ROLL.tank;

    /* 迷蹤：沿用 phasing 這一列 */
    reset(); gainBuff('phasing', 3); o.phase = [BUFF.phasing.n, hasBuff('phasing'), playerStates().some(x => x.n === '迷蹤')];
    reset(); gainBuff('finality', 3); o.finState = playerStates().some(x => x.n === '終極');

    /* 預期擊退：照衰減積分，暴擊 ×1.5；易攻目標幅度照它算，不受抵抗影響 */
    reset();
    o.kb = [r2(kbExp(270)), r2(kbExp(270, 1))];
    /* 模擬衰減：實際走的距離跟預期差不到 5% */
    let vx = 270, xx = 0; for (let i = 0; i < 600; i++) { xx += vx / 120; vx *= Math.exp(-KB_F / 120); }
    o.kbSim = Math.abs(xx / METER / kbExp(270) - 1) < 0.05;
    const mk1 = mk(0, 0), mk2 = mk(0, 0, { elite: 1 }); G.mobs = [mk1, mk2];
    hitMob(mk1, { ...ATK, kbEasy: 3 }, 0, 540, { quiet: 1 }); hitMob(mk2, { ...ATK, kbEasy: 3 }, 0, 540, { quiet: 1 });
    o.kbE = [r2(mk1.ail.easy.v), r2(mk2.ail.easy.v), mk2.vx < mk1.vx];

    /* 能力值基石：拿掉固有加成、每 2 點給 1%（單數無條件捨去）、需求照舊 */
    reset();
    const nd2 = PTREE.I[PT_START[0]].s, nd0 = { ...nd2 }, with_ = kv => { Object.assign(nd2, kv); const r = stats(S); for (const k in nd2) if (!(k in nd0)) delete nd2[k]; Object.assign(nd2, nd0); return r; };
    const eq0 = stats(S), S0 = { ...S };
    const pts = { str: eq0.str, dex: eq0.dex, int: eq0.int };
    const bs = with_({ blackScythe: 1 }), ct = with_({ circular: 1 }), kt = with_({ knightly: 1 }), ig = with_({ ironGrip: 1 }), iw = with_({ ironWill: 1 });
    o.ks = {
      hp: [eq0.hp - bs.hp, Math.round(2 * pts.str)], es: [bs.esP - eq0.esP, Math.floor(pts.str / 2)],
      acc: [eq0.acc - ct.acc > 0, ct.hp === eq0.hp], mp: [eq0.mp > kt.mp, kt.hp === eq0.hp],
      proj: [ig.projAtkP, Math.floor(pts.str / 2), eq0.hp > ig.hp], spell: [iw.spellP - eq0.spellP, Math.floor(pts.str / 2), eq0.hp > iw.hp],
      attr: [bs.str === eq0.str, ct.dex === eq0.dex, kt.int === eq0.int]
    };
    /* 護甲、閃避、能量護盾真的跟著提高 */
    const armS = with_({ armorF: 1000 }), armC = with_({ armorF: 1000, circular: 1 }), evS = with_({ evF: 1000 }), evK = with_({ evF: 1000, knightly: 1 }), esS = with_({ esF: 1000 }), esB = with_({ esF: 1000, blackScythe: 1 });
    o.ksDef = [armC.armor > armS.armor, evK.ev > evS.ev, esB.es > esS.es];
    /* 投射物攻擊傷害只給投射物攻擊 */
    reset(); ST.projAtkP = 100; const pA = avg(PROJ), aA = avg(ATK), sA2 = avg(SPL); ST.projAtkP = 0; o.ksPool = [r2(pA / avg(PROJ)), r2(aA / avg(ATK)), r2(sA2 / avg(SPL))];
    /* 全開也不是 NaN */
    reset(); Object.assign(ST, { fork: 1, projRet: 1, splash: 1, minmax: 1, reveal: 1, weakMore: 50, rollTank: 1, minGiant: 1, projAtkP: 50 });
    const vals = [avg(ATK), avg(PROJ), avg(SPL), hurtCalc(100, null, 'phys', 1).d, kbExp(100)];
    o.nan = vals.every(Number.isFinite);
    return JSON.parse(JSON.stringify(o));
  })()`);
  ok(
    '第 13～16 批：名詞卡都在、新開關都有 STATN 且在 stats 預設值',
    !b.terms.length && !b.statn.length,
    [...b.terms, ...b.statn].join()
  );
  ok(
    '標籤：寶珠、遣散、擲彈、鬥旗、可爆發、最終打擊、暫時召喚物標在該標的技能上，火球不算可爆發；有段數的技能才有最終打擊',
    b.tags.every(Boolean) && !b.tagNo.some(Boolean) && !b.stageFinal.length,
    JSON.stringify([b.tags, b.tagNo, b.stageFinal])
  );
  ok(
    '分裂：第一次擊中變 2 支、不扣穿透，分出來的不再分；只給投射物技能',
    b.fork1.join() === '2,true,true,true' && b.fork2.join() === 'true,1,0' && b.forkCfg.join() === 'true,false',
    JSON.stringify([b.fork1, b.fork2, b.forkCfg])
  );
  ok(
    '迴旋：打完目標飛回來、回程再打一次、回到發射者就消失；會爆炸的不飛回來；場上單位射的回單位',
    b.ret.join() === 'true,2,0' && b.retCfg.join() === 'true,false' && !b.retBoom && b.retUnit === 1,
    JSON.stringify([b.ret, b.retCfg, b.retBoom, b.retUnit])
  );
  ok('超限格擋率：超過 50 的部分，沒超過是 0', b.over.join() === '50,10,30,0', b.over.join());
  /* 0.2.47 第 3 層 B 批（近戰）：耐力球、狂怒重砸、霜波、霜牙、劍陣、血怒（盾衝的反擊狀態在第 10 批那一段） */
  const b47 = R(`(() => {
    const c = k => gemCfg(mkGem(k, 5), 0),
      A = (k, o) => ({ k, c: c(k), ang: 0, tx: P.x + 60, ty: P.y, hits: [0], n: 0, ...o }),
      D = Object.values(MOBS)[0],
      mk = (o = {}) => ({ D, x: P.x + 40, y: P.y, r: 12, sz: 20, hp: 1e9, mhp: 1e9, arm: 0, arm0: 0, ev: 0, vx: 0, vy: 0, aggro: 1, res: { fire: 0, cold: 0, light: 0, chaos: 0 }, ail: {}, ...o }),
      keep = { mobs: G.mobs, ground: G.ground, chg: P.chg, rage: P.rage, stk: P.stk, hp: P.hp, swords: P.swords, form: P.form, t: G.t },
      out = {};
    let m;
    if (typeof shake === 'undefined') globalThis.shake = () => {};
    /* 耐力球：粉碎重擊給 1 顆；震地全部消耗，每顆讓餘震多打一次（2 顆＝餘震 3 次） */
    P.chg = {}; G.ground = []; m = mk(); G.mobs = [m]; m.ail.hs = 50;
    actHit(A('smash'), 0); out.endGain = chgN('e');
    gainChg('e'); actHit(A('quake'), 0);
    const jg = G.ground.find(g => g.k === 'jagged'); out.endUse = [chgN('e'), jg.again];
    let booms = 0; const h0 = m.hp;
    for (let i = 0; i < 80; i++) { const h = m.hp; G.t += 0.05; groundTick(0.05); if (m.hp < h) booms++; }
    out.after = [booms, G.ground.length];
    /* 狂怒重砸：盛怒不夠只砸一下、不留地面；夠就花 10 點、多一道震波＋碎裂地面 */
    G.ground = []; m = mk(); G.mobs = [m]; P.rage = 9; let h = m.hp;
    actHit(A('furyslam'), 0); const d1 = h - m.hp; out.fury0 = [P.rage, G.ground.length];
    P.rage = 12; h = m.hp; actHit(A('furyslam'), 0); out.fury1 = [P.rage, G.ground.length, h - m.hp > d1 * 1.5];
    /* 霜波：可冰凍的怪直接冰凍，累積清掉；不是可冰凍的不會 */
    G.ground = []; m = mk(); const m2 = mk({ y: P.y + 10 }); G.mobs = [m, m2]; m.ail.frz = 50;
    actHit(A('frostwave'), 0); out.frost = [hasState(m, 'frozen'), hasState(m2, 'frozen')];
    /* 霜牙：受招架的怪消耗受招架、留冰緩地面；沒受招架的不留 */
    G.ground = []; m = mk(); G.mobs = [m]; actHit(A('frostfang'), 0); out.fang0 = G.ground.length;
    applyParry(m); actHit(A('frostfang'), 0); out.fang1 = [parryOn(m), G.ground.filter(g => g.k === 'chill').length];
    /* 劍陣：沒有飛劍不能用；有就插地（飛劍用掉）、再按引爆；沒引爆時間到自己爆 */
    G.ground = []; P.swords = []; m = mk({ x: P.x + 60 }); G.mobs = [m];
    out.arrWhy = skillWhy({ ...c('swordarray'), g: null }, { x: P.x + 60, y: P.y });
    gainSwords(4, c('flyswords')); out.arrOk = skillWhy({ ...c('swordarray'), g: null }, { x: P.x + 60, y: P.y });
    actHit(A('swordarray'), 0); const bl = G.ground.find(g => g.k === 'blades');
    out.arr = [swordN(), !!bl, bl && bl.n]; h = m.hp;
    actHit(A('swordarray'), 0); groundTick(0.01); out.arrBoom = [h > m.hp, G.ground.some(g => g.k === 'blades')];
    gainSwords(2, c('flyswords')); actHit(A('swordarray'), 0); h = m.hp; G.t += 8.1; groundTick(8.1); out.arrEnd = [h > m.hp, G.ground.length];
    /* 血怒：技能速度 +20、偷取 +3；每秒損失 4% 最大生命，生命剩 1 就不再扣；再按關掉 */
    P.stk = {}; P.hp = ST.hp; actHit(A('bloodrage'), 0);
    out.br = [stkN('bloodrage'), bufV('ss'), bufV('leech'), gemCfg(mkGem('clawchain', 5), 0).leech > ST.leech / 100];
    stkTick(1); out.brLoss = +((ST.hp - P.hp) / ST.hp).toFixed(3);
    P.hp = 1.5; stkTick(1); out.brMin = P.hp;
    actHit(A('bloodrage'), 0); out.brOff = stkN('bloodrage');
    Object.assign(G, { mobs: keep.mobs, ground: keep.ground, t: keep.t });
    Object.assign(P, { chg: keep.chg, rage: keep.rage, stk: keep.stk, hp: keep.hp, swords: keep.swords, form: keep.form });
    return out;
  })()`);
  ok(
    'B 批近戰：粉碎重擊給耐力球、震地消耗後餘震 3 次；狂怒重砸花 10 盛怒才有第二道震波與地面；霜波冰凍可冰凍的怪；霜牙消耗受招架留冰緩地面',
    b47.endGain === 1 &&
      JSON.stringify([b47.endUse, b47.after, b47.fury0, b47.fury1, b47.frost, b47.fang0, b47.fang1]) ===
        '[[0,2],[3,0],[9,0],[2,1,true],[true,false],0,[false,1]]',
    JSON.stringify(b47)
  );
  ok(
    'B 批近戰：劍陣要有飛劍、插地後再按引爆、8 秒自己爆；血怒給速度與偷取、每秒扣 4% 生命、剩 1 不再扣、再按關掉',
    JSON.stringify([
      b47.arrWhy,
      b47.arrOk,
      b47.arr,
      b47.arrBoom,
      b47.arrEnd,
      b47.br,
      b47.brLoss,
      b47.brMin,
      b47.brOff
    ]) === '["要先用御劍訣召出飛劍","",[0,true,4],[true,false],[true,0],[1,20,3,true],0.04,1,0]',
    JSON.stringify(b47)
  );
  /* 0.2.48 第 3 層 B 批（遠程與法術）：油手雷、雷暴、裂解、破咒、褻瀆儀式 */
  const b48 = R(`(() => {
    const c = k => gemCfg(mkGem(k, 5), 0),
      A = (k, o) => ({ k, c: c(k), ang: 0, tx: P.x + 60, ty: P.y, hits: [0], n: 0, ...o }),
      D = Object.values(MOBS)[0],
      mk = (o = {}) => ({ D, x: P.x + 60, y: P.y, r: 12, sz: 20, hp: 1e9, mhp: 1e9, arm: 0, arm0: 0, ev: 0, vx: 0, vy: 0, aggro: 1, res: { fire: 0, cold: 0, light: 0, chaos: 0 }, ail: {}, ...o }),
      why = (k, at) => skillWhy({ ...c(k), g: null }, at || { x: P.x + 60, y: P.y }),
      keep = { mobs: G.mobs, ground: G.ground, pools: G.pools, grenades: G.grenades, corpses: G.corpses, remnants: G.remnants, chg: P.chg, t: G.t },
      out = {};
    let m, h;
    G.corpses = []; G.remnants = [];
    /* 油手雷：1.5 秒後破開、留油滑地面（6 秒）；引爆技能點爆，油變成燃燒地面 */
    G.grenades = []; G.ground = []; m = mk(); G.mobs = [m]; h = m.hp;
    actHit(A('oilgrenade'), 0); out.oil0 = [G.grenades.length, G.ground.length];
    for (let i = 0; i < 40; i++) (G.t += 0.05), grenadeTick(0.05);
    const og = G.ground.find(g => g.k === 'oil'); out.oil1 = [G.grenades.length, !!og, og && og.dur, h > m.hp];
    detonate(og.x, og.y, 10, c('grenade')); groundTick(0.01);
    out.oil2 = [G.ground.some(g => g.k === 'oil'), G.ground.some(g => g.k === 'fire')];
    /* 雷暴：範圍裡的怪濕透、每 0.5 秒被劈一次 */
    G.ground = []; G.pools = []; m = mk(); const far = mk({ x: P.x + 900 }); G.mobs = [m, far]; h = m.hp;
    actHit(A('thunderstorm'), 0); updPools(0.5);
    out.storm = [G.pools.length, G.pools[0].dur, m.ail.wet > G.t, h > m.hp, !!far.ail.wet];
    G.pools = [];
    /* 裂解：沒有目標不能用；消耗冰凍、感電（一隻一種），造成傷害 */
    m = mk(); const m2 = mk({ y: P.y + 30 }); G.mobs = [m, m2]; out.snapNo = why('snap');
    m.ail.frozen = G.t + 3; m.ail.shock = G.t + 3; m2.ail.shock = G.t + 3; out.snapOk = why('snap'); h = m2.hp;
    actHit(A('snap'), 0); out.snap = [hasState(m, 'frozen'), hasState(m, 'shock'), hasState(m2, 'shock'), h > m2.hp];
    /* 破咒：沒有被詛咒的不能用；消耗詛咒、造成傷害 */
    m = mk(); G.mobs = [m]; out.hexNo = why('hexblast');
    curseMob(m, 'despair', 5); out.hexOk = why('hexblast'); h = m.hp;
    actHit(A('hexblast'), 0); out.hex = [hasState(m, 'curse'), h > m.hp];
    /* 褻瀆儀式：要屍體；消耗屍體留腐化地面、每 0.5 秒打一次、結束時給暴擊球 */
    G.ground = []; P.chg = {}; m = mk(); G.mobs = [m]; out.proNo = why('profane');
    G.corpses = [{ x: P.x + 60, y: P.y, sz: 20, mhp: 100, t: G.t + 15 }]; out.proOk = why('profane'); h = m.hp;
    actHit(A('profane'), 0); const cg = G.ground.find(g => g.k === 'corrupt');
    out.pro = [G.corpses.length, !!cg, cg && cg.dur];
    groundTick(0.5); out.proHit = h > m.hp;
    for (let i = 0; i < 13; i++) (G.t += 0.5), groundTick(0.5);
    out.proEnd = [G.ground.length, chgN('p')];
    Object.assign(G, { mobs: keep.mobs, ground: keep.ground, pools: keep.pools, grenades: keep.grenades, corpses: keep.corpses, remnants: keep.remnants, t: keep.t });
    P.chg = keep.chg;
    return out;
  })()`);
  ok(
    'B 批遠程與法術：油手雷破開留油、引爆後變燃燒地面；雷暴讓範圍裡的怪濕透並落雷；裂解消耗冰凍與感電（一隻一種）',
    JSON.stringify([b48.oil0, b48.oil1, b48.oil2, b48.storm, b48.snapNo, b48.snapOk, b48.snap]) ===
      '[[1,0],[0,true,6,true],[false,true],[1,6,true,true,false],"附近沒有冰凍、感電或點燃的敵人","",[false,true,false,true]]',
    JSON.stringify(b48)
  );
  ok(
    'B 批遠程與法術：破咒要有詛咒、消耗後爆炸；褻瀆儀式要屍體、留腐化地面打怪、結束給暴擊球',
    JSON.stringify([b48.hexNo, b48.hexOk, b48.hex, b48.proNo, b48.proOk, b48.pro, b48.proHit, b48.proEnd]) ===
      '["附近沒有被詛咒的敵人","",[false,true],"附近沒有屍體","",[0,true,6],true,[0,1]]',
    JSON.stringify(b48)
  );
  /* 0.2.49 C1：11 顆輔助（機制本來就在底層，這裡驗寶石有接上、分類有擋） */
  const c49 = R(`(() => {
    const cf = (k, sups, q = 0) => {
        const g = mkGem(k, 5);
        g.sup = sups.map(x => ({ ...mkGem(x, 1), q }));
        return gemCfg(g, 0);
      },
      r2 = v => +v.toFixed(2),
      /* 前面的測試可能把天賦的分裂、迴旋開著：這裡只看輔助 */
      st0 = [ST.fork, ST.projRet, ST.chain],
      out = {};
    ST.fork = ST.projRet = false;
    ST.chain = 0;
    const base = cf('axethrow', []);
    const f = cf('axethrow', ['fork']), ch = cf('axethrow', ['chain']), rt = cf('axethrow', ['ret']);
    out.proj = [!!f.fork, r2(f.more / base.more), ch.chain - base.chain, r2(ch.more / base.more), !!rt.ret, r2(rt.more / base.more)];
    /* 分裂＋連鎖可以同插；連鎖＋迴旋同分類，只有一顆生效 */
    const fc = cf('axethrow', ['fork', 'chain']), cr = cf('axethrow', ['chain', 'ret']);
    out.cat = [!!fc.fork, fc.chain - base.chain, (cr.chain - base.chain === 2 ? 1 : 0) + (cr.ret ? 1 : 0)];
    out.q = r2(cf('axethrow', ['fork'], 20).more / base.more);
    /* 一路穿透的冰霜彈、閃電箭插連鎖沒有效果（不相容） */
    out.noChain = [cf('frostbolt', ['chain']).chain, r2(cf('frostbolt', ['chain']).more / cf('frostbolt', []).more), cf('split', ['chain']).chain];
    const q0 = cf('quake', []), fo = cf('quake', ['focus']), fa = cf('quake', ['focus', 'area']);
    out.focus = [r2(fo.aoe / q0.aoe), r2(fo.more / q0.more), fa.aoe === fo.aoe || r2(fa.aoe / q0.aoe) === 1.4];
    out.pen = cf('fireball', ['elepen']).pen - cf('fireball', []).pen;
    out.giant = [cf('wolf', ['giant']).giant || 0, cf('fireball', ['giant']).giant || 0];
    out.night = [cf('slash', ['nightblade']).elusive || 0, cf('fireball', ['nightblade']).elusive || 0];
    /* 撲殺只對插著的那一招有效（普通怪 35%） */
    const m = { D: Object.values(MOBS)[0], hp: 30, mhp: 100, ail: {} };
    out.cull = [culled(m, cf('slash', ['cull'])), culled(m, cf('slash', [])), culled({ ...m, hp: 40 }, cf('slash', ['cull']))];
    /* 三顆觸發輔助：各自的事件累積各自的能量；跟暴擊施放同分類 */
    const keep = S.skills[0].a;
    out.meta = [];
    for (const [k, ev, en] of [['cast_kill', 'kill', 5], ['cast_dodge', 'perfect', 40], ['cast_block', 'block', 25]]) {
      const g = mkGem('fireball', 5);
      g.sup = [mkGem(k, 1), null];
      S.skills[0].a = g;
      metaEvent(ev);
      metaEvent('crit');
      out.meta.push(r2(g.sup[0].en / (1 + ST.energyP / 100)) === en);
    }
    const g2 = mkGem('fireball', 5);
    g2.sup = [mkGem('cast_kill', 1), mkGem('cast_crit', 1)];
    out.metaCat = [supOK(SKILLS.fireball, g2.sup[0], g2), supOK(SKILLS.fireball, g2.sup[1], g2)].filter(Boolean).length;
    S.skills[0].a = keep;
    [ST.fork, ST.projRet, ST.chain] = st0;
    return out;
  })()`);
  ok(
    'C1 輔助：分裂、連鎖 +2、迴旋各讓傷害更少 20%（品質 20% 剩 10%）；分裂可以配連鎖，連鎖與迴旋只有一顆生效；集中效應範圍 ×0.7、更多 30%，不能配範圍擴大',
    JSON.stringify([c49.proj, c49.cat, c49.q, c49.focus, c49.noChain]) ===
      '[[true,0.8,2,0.8,true,0.8],[true,2,1],0.9,[0.7,1.3,true],[0,1,0]]',
    JSON.stringify(c49)
  );
  ok(
    'C1 輔助：抗性穿透 +25、極大只給召喚、夜刃只給攻擊、撲殺只對插著的那一招（普通怪 35% 以下）、三顆觸發輔助各吃各的事件且跟暴擊施放只能插一顆',
    JSON.stringify([c49.pen, c49.giant, c49.night, c49.cull, c49.meta, c49.metaCat]) ===
      '[25,[1,0],[1,0],[true,false,false],[true,true,true],1]',
    JSON.stringify(c49)
  );
  /* 0.2.50 C2：附加冰冷／閃電／混沌（可以同插）、魔力偷取、受傷施放、擴張（封印）、貫穿拳 */
  const c50 = R(`(() => {
    const cf = (k, sups, q = 0) => {
        const g = mkGem(k, 5);
        g.sup = sups.map(x => ({ ...mkGem(x, 1), q }));
        return gemCfg(g, 0);
      },
      r2 = v => +v.toFixed(2),
      m = () => ({ D: Object.values(MOBS)[0], x: 60, y: 0, r: 12, sz: 20, hp: 1e9, mhp: 1e9, arm: 0, arm0: 0, ev: 0, res: { fire: 0, cold: 0, light: 0, chaos: 0 }, ail: {} }),
      out = {};
    /* 四顆附加可以插在同一招，各加各的元素 */
    const all = cf('slash', ['fireadd', 'coldadd', 'lightadd', 'chaosadd']), b0 = hitCalc(cf('slash', []), m()).pre, b4 = hitCalc(all, m()).pre;
    out.add = [all.fireAdd, all.coldAdd, all.lightAdd, all.chaosAdd, b0.cold + b0.light + b0.chaos === 0, b4.cold > 0 && r2(b4.cold / b4.light) === 1 && r2(b4.cold / b4.chaos) === 1];
    out.addQ = r2(cf('slash', ['coldadd'], 20).coldAdd);
    out.mp = [cf('slash', ['mpleech']).mpLeech, r2(cf('slash', ['mpleech'], 20).mpLeech)];
    out.punch = [cf('slash', ['punch']).kbEasy, cf('fireball', ['punch']).kbEasy || 0];
    /* 受傷施放：被擊中 +15，跟其他觸發輔助同分類 */
    const keep = S.skills[0].a, g = mkGem('fireball', 5);
    g.sup = [mkGem('cast_hurt', 1), mkGem('cast_crit', 1)];
    S.skills[0].a = g;
    metaEvent('hurt'); metaEvent('kill');
    out.hurt = [r2(g.sup[0].en / (1 + ST.energyP / 100)), supOK(SKILLS.fireball, g.sup[1], g)];
    /* 擴張：隨時間累積封印（每 2 倍施放時間 1 個，最多 3）；拔掉輔助就清掉 */
    const q = mkGem('quake', 5);
    q.sup = [mkGem('expand', 1), null];
    S.skills[0].a = q; P.seal = {};
    const c = slotCfg(0), one = 2 * actDur(c);
    sealTick(one * 0.9); const n0 = sealN('quake');
    sealTick(one * 0.2); const n1 = sealN('quake');
    for (let k = 0; k < 6; k++) sealTick(one); const n3 = sealN('quake');
    out.seal = [c.seal.max, c.seal.aoe, n0, n1, n3];
    q.sup = [null, null]; sealTick(0.1); out.sealOff = sealN('quake');
    S.skills[0].a = keep; P.seal = {};
    return out;
  })()`);
  ok(
    'C2 輔助：四顆附加可以同插、各加 25% 的那種元素（品質 20% 是 30%）；魔力偷取 2%（品質 3%）；貫穿拳只給近戰；受傷施放 +15 且跟暴擊施放只能插一顆；擴張累積封印最多 3 個、拔掉就清掉',
    JSON.stringify(c50) ===
      '{"add":[0.25,0.25,0.25,0.25,true,true],"addQ":0.3,"mp":[0.02,0.03],"punch":[3,0],"hurt":[15,false],"seal":[3,30,0,1,3],"sealOff":0}',
    JSON.stringify(c50)
  );
  /* 0.2.51 C3：輔助 II 分級（13 顆）、新寶石的使用等級、重擊輔助真的加沉重暈眩累積 */
  const c51 = R(`(() => {
    const cf = (k, sups) => {
        const g = mkGem(k, 5);
        g.sup = sups.map(x => mkGem(x, 1));
        return gemCfg(g, 0);
      },
      r2 = v => +v.toFixed(2),
      b = cf('axethrow', []),
      out = {};
    const II = Object.keys(SUPPORTS).filter(k => SUPPORTS[k].tier === 2);
    out.n = II.length;
    /* 每顆 II：名字加 II、跟 I 同分類、同圖示、有品質效果、使用等級 31 */
    out.meta = II.every(k => {
      const U = SUPPORTS[k], B = SUPPORTS[U.base];
      return U.n === B.n + ' II' && supCat(k) === supCat(U.base) && U.ic === B.ic && QUAL[k] === QUAL[U.base] && gemLv(k) === 31 && U.d !== B.d;
    });
    /* I 跟 II 不能插在同一招：後插的那顆不生效 */
    const both = cf('axethrow', ['multi', 'multi2']), one = cf('axethrow', ['multi']), two = cf('axethrow', ['multi2']);
    out.dup = [both.proj - b.proj, r2(both.more / b.more), r2(two.more / b.more)];
    out.nums = [
      cf('axethrow', ['pierce2']).pierce - b.pierce,
      r2(cf('quake', ['area2']).aoe / cf('quake', []).aoe),
      r2(cf('slash', ['fury2']).more / cf('slash', []).more),
      r2(cf('slash', ['haste2']).speed / cf('slash', []).speed),
      cf('slash', ['crit2']).critInc - cf('slash', []).critInc,
      cf('slash', ['crit2']).critX,
      r2(cf('slash', ['leech2']).leech - cf('slash', []).leech),
      cf('iai', ['cdr2']).cdrP - cf('iai', []).cdrP,
      cf('slash', ['fireadd2']).fireAdd,
      cf('slash', ['coldadd2']).coldAdd,
      cf('slash', ['lightadd2']).lightAdd,
      cf('slash', ['chaosadd2']).chaosAdd
    ];
    out.heavy = [r2(cf('slash', ['heavy']).more / cf('slash', []).more), cf('slash', ['heavy']).hsM, r2(cf('slash', ['heavy2']).more / cf('slash', []).more), cf('slash', ['heavy2']).hsM];
    /* 使用等級：新寶石都有設，沒有哪一顆還是預設的 1 卻不在名單裡 */
    out.lv = ['shieldcharge', 'furyslam', 'bloodrage', 'frostwave', 'frostfang', 'swordarray', 'oilgrenade', 'thunderstorm', 'profane', 'snap', 'hexblast', 'fork', 'chain', 'ret', 'focus', 'elepen', 'giant', 'cull', 'nightblade', 'cast_kill', 'cast_dodge', 'cast_block', 'cast_hurt', 'coldadd', 'lightadd', 'chaosadd', 'mpleech', 'expand', 'punch'].filter(k => !GEM_LV[k]);
    return out;
  })()`);
  ok(
    'C3 分級：13 顆 II 都跟 I 同分類、同圖示、使用等級 31，I 與 II 同插只算一顆；II 的數字照表；重擊輔助的沉重暈眩累積 ×1.5（II ×1.7）；新寶石都有使用等級',
    JSON.stringify(c51) ===
      '{"n":13,"meta":true,"dup":[2,0.8,0.9],"nums":[5,1.55,1.45,1.32,70,50,0.04,65,0.32,0.32,0.32,0.32],"heavy":[1.15,1.5,1.22,1.7],"lv":[]}',
    JSON.stringify(c51)
  );
  ok(
    '效果消耗：同一下只消耗一種、技能優先、下一下可以再消耗',
    b.eat1.join() === 'true,false,true' &&
      b.eat2 === true &&
      b.eat3.join() === 'true,true' &&
      b.eat4.join() === 'true,false,true' &&
      b.eat5.join() === 'true,false,true',
    JSON.stringify([b.eat1, b.eat2, b.eat3, b.eat4, b.eat5])
  );
  ok(
    '效果消耗：免疫 1 秒（受招架、詛咒、破甲、流血、感電），累積條不算',
    b.imm.join() === 'false,true' &&
      b.immC.join() === 'false,true' &&
      b.immB === true &&
      b.immB2 === false &&
      b.immBl.join() === 'false,true' &&
      b.immSh.join() === 'false,true' &&
      b.immP,
    JSON.stringify([b.imm, b.immC, b.immB, b.immB2, b.immBl, b.immSh, b.immP])
  );
  ok(
    '最終打擊：3 段循環；終極直接跳到最後一段，暴擊率提高 100%（只有最終打擊），生效期間不累積連擊',
    b.stages[0] === '0,1,2,0' &&
      b.stages[1] &&
      !b.stages[2] &&
      b.skip.join() === '2,2,2' &&
      Math.abs(b.fin[0] / 4000 - 0.1) < 0.02 &&
      Math.abs(b.fin[1] / 4000 - 0.1) < 0.02 &&
      Math.abs(b.fin[2] / 4000 - 0.2) < 0.03 &&
      b.finCombo.join() === '1,1',
    JSON.stringify([b.stages, b.skip, b.fin, b.finCombo])
  );
  ok(
    '擴散傷害：打擊才有、1.5 公尺內多一次擊中、不連鎖擴散；重擊沒有；技能欄位也能開',
    b.spl.join() === 'true,true,true,true' && b.splNo && b.splC,
    JSON.stringify([b.spl, b.splNo, b.splC])
  );
  ok(
    '只有最低或最高傷害：只有兩種值、各 50%，幸運 75%，每種傷害各擲，面板期望值一致，法術也吃，開關關著照舊',
    b.mmV === '100,300' &&
      Math.abs(b.mmP - 0.5) < 0.04 &&
      b.mmA === 200 &&
      Math.abs(b.mmL - 0.75) < 0.04 &&
      b.mmAL === 250 &&
      Math.abs(b.mmMix - 0.5) < 0.06 &&
      b.mmS === 2 &&
      b.mmOff,
    JSON.stringify([b.mmV, b.mmP, b.mmA, b.mmL, b.mmAL, b.mmMix, b.mmS, b.mmOff])
  );
  ok(
    '暴露弱點：開關關著沒有；精英與王 3 段共 45%；生命在區段裡才算；對開放弱點更多',
    !b.weak0 && b.weakSeg.join() === '3,0.45,true,true,true' && !b.weakN && b.weak1 && !b.weak2 && b.weakM === 1.5,
    JSON.stringify([b.weak0, b.weakSeg, b.weakN, b.weak1, b.weak2, b.weakM])
  );
  ok(
    '封印：照施放時間累積、到上限停、打破歸零；沒有 D.seal 的不累積',
    b.seal1 === 1 && b.seal2.join() === '3,0' && b.seal3.join() === '3,0,0',
    JSON.stringify([b.seal1, b.seal2, b.seal3])
  );
  ok(
    '極大：最大生命、傷害、體型各 ×1.2，開關與技能欄位都能給',
    b.giant.join() === '1.2,1.2,1.2' && b.giantC.join() === '1.2,1',
    JSON.stringify([b.giant, b.giantC])
  );
  ok(
    '暫時召喚物、死亡與擊殺：時間到算死亡不算被擊殺；生命歸零才算被擊殺；暫時的不復活；被取消不算被擊殺',
    b.tempExp.join() === '0,true,false' && b.tempKill.join() === '0,true,true' && b.gone.join() === '0,true,false',
    JSON.stringify([b.tempExp, b.tempKill, b.gone])
  );
  ok(
    '復甦召喚物：被擊殺留著等 7.5 秒、另一隻死亡時重算、滿血復活；一段時間沒受傷才自癒；死的魔像不替你擋',
    b.rv1.join() === '2,true,0,true' &&
      b.rv1b === 0 &&
      b.rv2.join() === 'true,7.5' &&
      b.rv3.join() === 'true,false,true,false' &&
      b.heal[0] &&
      b.heal[1] === 0.2 &&
      b.golemDead,
    JSON.stringify([b.rv1, b.rv1b, b.rv2, b.rv3, b.heal, b.golemDead])
  );
  ok(
    '無法閃避翻滾或衝刺：按了不翻滾、有提示；開關關著照舊',
    b.noRoll[0] === null && b.noRoll[1] === '無法閃避翻滾' && b.canRoll,
    JSON.stringify([b.noRoll, b.canRoll])
  );
  ok(
    '閃避翻滾無法躲避傷害：沒有無敵與完美閃避、翻滾中少 30%；不翻滾不打折；開關關著照舊無敵',
    b.rollNormal === 1000 && !b.tankI && Math.abs(b.tank / b.tankOff - 0.7) < 0.01 && b.tankNum === 30,
    JSON.stringify([b.rollNormal, b.tankI, b.tank, b.tankOff, b.tankNum])
  );
  ok(
    '迷蹤沿用 phasing（改名）、終極有狀態圖示',
    b.phase.join() === '迷蹤,true,true' && b.finState,
    JSON.stringify([b.phase, b.finState])
  );
  ok(
    '預期擊退：速度 ÷ 衰減 ÷ 公尺、暴擊 ×1.5、跟實際衰減一致；易攻目標幅度照預期值，精英抵抗不影響',
    b.kb.join() === '1,1.5' && b.kbSim && b.kbE.join() === '6,6,true',
    JSON.stringify([b.kb, b.kbSim, b.kbE])
  );
  const K = b.ks;
  ok(
    '能力值基石：拿掉固有加成、每 2 點給 1%、需求用的能力值不變；護甲、閃避、能量護盾真的提高',
    K.hp[0] === K.hp[1] &&
      K.es[0] === K.es[1] &&
      K.acc.join() === 'true,true' &&
      K.mp.join() === 'true,true' &&
      K.proj[0] === K.proj[1] &&
      K.proj[2] &&
      K.spell[0] === K.spell[1] &&
      K.spell[2] &&
      K.attr.every(Boolean) &&
      b.ksDef.every(Boolean),
    JSON.stringify([K, b.ksDef])
  );
  ok('投射物攻擊傷害只給投射物攻擊', b.ksPool.join() === '2,1,1', b.ksPool.join());
  ok('第 13～16 批全開不是 NaN', b.nan);
}
/* 開場與序章（0.2.44）：字幕一字不改、總長、地圖走得通、石牆擋得住、老存檔不動、新玩家拿到劍、版本號重跑、新玩家不會卡在地圖台 */
{
  const c2 = {
    console,
    Math,
    Date,
    JSON,
    Object,
    Array,
    Set,
    location: { search: '' },
    URLSearchParams,
    document: { getElementById: () => ({ classList: { add() {}, remove() {} } }), querySelectorAll: () => [] }
  };
  vm.createContext(c2);
  for (const f of [
    'core.js',
    'ptdata.js',
    'data.js',
    'items.js',
    'craft.js',
    'combat.js',
    'maps.js',
    'world.js',
    'mech.js',
    'game.js',
    'skills.js',
    'intro.js',
    'prologue.js'
  ])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), c2, { filename: f });
  const R2 = s => vm.runInContext(s, c2);
  /* 字幕：照世界觀第 2 節的表，一字不改 */
  const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', '世界觀.md'), 'utf8'),
    rows = doc
      .split('## 2.')[1]
      .split('## 3.')[0]
      .split('\n')
      .filter(l => /^\| \d /.test(l)),
    want = rows.map(l => l.split('|')[3].trim().split('<br>')),
    got = R2('SHOTS.map(s => s.lines)');
  ok(
    '開場：七個鏡頭的字幕跟世界觀一字不差',
    want.length === 7 && JSON.stringify(want) === JSON.stringify(got),
    JSON.stringify(want.flat().filter(l => !got.flat().includes(l)))
  );
  const len = R2('IV_LEN');
  ok('開場：約 85 秒', len > 83 && len < 88, len);
  /* 地圖：開到第幾道石牆，走得到哪裡 */
  const M = R2('PRO_MAP'),
    STEPS = R2('PRO_STEPS.map(s => ({ at: s.at, gate: s.gate }))'),
    tiles = R2('proTiles()');
  const reach = n => {
    const t = Array.from(tiles);
    M.gates.slice(0, n).forEach(([x0, y, x1]) => {
      for (let x = x0; x <= x1; x++) t[y * M.cols + x] = 0;
    });
    const [sx, sy] = STEPS[0].at.map(Math.floor),
      seen = new Set([sy * M.cols + sx]),
      q = [...seen];
    while (q.length) {
      const i = q.pop();
      for (const d of [1, -1, M.cols, -M.cols]) if (!t[i + d] && !seen.has(i + d)) seen.add(i + d), q.push(i + d);
    }
    return seen;
  };
  const exit = 1 * M.cols + 12;
  ok(
    '序章：每開一道石牆才走得更遠，全開才到得了出口',
    M.gates.every((_, i) => reach(i + 1).size > reach(i).size) &&
      reach(M.gates.length).has(exit) &&
      !reach(M.gates.length - 1).has(exit)
  );
  const all = reach(M.gates.length);
  ok(
    '序章：每一步重來的起點都在地板上',
    STEPS.filter(s => s.at).every(s => all.has(Math.floor(s.at[1]) * M.cols + Math.floor(s.at[0])))
  );
  /* 存檔：proBack 換回來 */
  R2(`hudBar = () => {}; save = () => {}; closePanels = () => {}; enterHideout = () => {}; introStop = () => {};
    var BOOT = ''; introGate = () => (BOOT = 'gate'); proStart = () => (BOOT = 'map'); proStep = i => (BOOT = 'step' + i);`);
  ok(
    '新存檔：沒有武器、有 fresh 旗標',
    R2(`S = newGame(); !S.eq.weapon && S.fresh === 1 && S.skills[0].a.gem === 'slash' && !!S.eq.chest`)
  );
  ok(
    '序章跳過（新玩家）：給一把劍、拿掉 fresh、會有設施提示',
    R2(`S = newGame(); PRO.real = null; proBack(); S.eq.weapon.b === PRO_SWORD && !S.fresh && S.story.tips === 1`)
  );
  ok(
    '序章結束（新玩家）：留下序章那把劍，不是新的',
    R2(`var real = newGame(), tmp = newGame(); tmp.eq.weapon = mkItem(PRO_SWORD, 1, 0); var sid = tmp.eq.weapon.id;
      tmp.story = real.story; PRO.real = real; S = tmp; proBack(); S === real && S.eq.weapon.id === sid && !PRO.real`)
  );
  ok(
    '序章結束（老存檔）：裝備、等級、技能、天賦都不動，臨時角色的東西不留',
    R2(`var old = newGame(); delete old.fresh; old.lv = 42; old.gold = 777; old.eq.weapon = mkItem('w_bow_0', 20, 2); old.pt = old.pt.slice(0, 1);
      var snap = JSON.stringify(old); tmp = newGame(); tmp.gold = 1; tmp.lv = 9; tmp.eq.weapon = mkItem(PRO_SWORD, 1, 0);
      tmp.story = old.story; tmp.orient = old.orient; tmp.sfx = old.sfx; PRO.real = old; S = tmp; proBack();
      S === old && JSON.stringify(S) === snap && !S.story.tips`)
  );
  ok('序章結束（老存檔）：沒有設施提示', R2(`!proHint('asc')`));
  const boot = st => R2(`BOOT = ''; S = newGame(); S.story = ${JSON.stringify(st)}; proBoot(); BOOT`);
  ok(
    '版本號：沒跑過＝開場、看過開場＝序章、第 7 步接回、跑過＝不跑、版本變了＝重跑',
    boot({}) === 'gate' &&
      boot({ intro: R2('PRO_VER') }) === 'map' &&
      boot({ intro: R2('PRO_VER'), proS: 7 }) === 'step7' &&
      boot({ prologue: R2('PRO_VER') }) === '' &&
      boot({ prologue: R2('PRO_VER') - 1, intro: R2('PRO_VER') - 1 }) === 'gate'
  );
  ok(
    '第 8 步收斂在 openWorld：序章結束、記版本號',
    R2(`openPanel = () => {}; S = newGame(); PRO.on = true; PRO.i = 8; S.story.proS = 7; openWorld();
      !PRO.on && S.story.prologue === PRO_VER && S.story.intro === PRO_VER && !S.story.proS`)
  );
  /* 存檔 24：main.js 最後的 start() 不跑 */
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8').replace(/\nstart\(\);\s*$/, '\n'),
    c2,
    { filename: 'main.js' }
  );
  ok(
    '舊存檔（23）：保留等級、裝備、寶石、昇華點，地圖進度重置到劇情區第一個節點',
    R2(`(() => {
      const old = newGame();
      delete old.fresh;
      Object.assign(old, { v: 23, lv: 57, frag: 40, maxT: 13, t16: 0, cards: [rollCard(), rollCard()], card: rollCard(), tier: 9 });
      delete old.world; delete old.hunt;
      old.eq.weapon = mkItem('w_bow_0', 12, 2);
      const id = old.eq.weapon.id, n = migrate(JSON.parse(JSON.stringify(old)));
      return n.v === 26 && n.lv === 57 && n.frag === 40 && n.eq.weapon.id === id && n.skills[0].a.gem === 'slash' && n.maxT === 13 &&
        n.world.stage === 0 && !n.world.done.length && n.world.at === '0,0' && Number.isInteger(n.world.seed) &&
        n.hunt.v === 0 && !Array.isArray(n.cards) && !Object.keys(n.cards).length && !n.card;
    })()`)
  );
  ok(
    '存檔 24：還原後走過的節點、種子不變',
    R2(`(() => {
      const a = newGame();
      a.world.done.push('0,0'); a.world.stage = 1; a.hunt.v = 40;
      const n = migrate(JSON.parse(JSON.stringify(a)));
      return n.world.seed === a.world.seed && n.world.done.length === 1 && n.hunt.v === 40;
    })()`)
  );
  ok(
    '節點的地圖卡：沒有碎片也一定有一張免費卡（不會卡住）',
    R2(`(() => {
      for (let i = 0; i < 400; i++) {
        const s = newGame();
        if (!wCards(s, '5,0').c.some(c => mapCost(c.star) === 0)) return false;
      }
      return true;
    })()`)
  );
}
/* 世界地圖（world.js）：節點與路是種子的純函式、路走得回去、難度、洗卡、血霧、裂口 */
{
  const R = s => vm.runInContext(s, ctx);
  R(`var WS = (seed, o) => { const w = newWorld(); w.seed = seed; return { world: w, hunt: newHunt(), cards: {}, idols: [], story: {}, frag: 0, maxT: 1, ...o }; };
    var WFP = seed => { const s = WS(seed), L = [];
      for (let q = -30; q <= 30; q++) for (let r = -30; r <= 30; r++) {
        if (wRing(q, r) > 30 || !wNode(seed, q, r)) continue;
        L.push([q, r, wType(s, q, r), wNear(seed, q, r).join('|')].join(':'));
      }
      return L.join(';'); };`);
  const a = R('WFP(12345)');
  R('RIFT_MEMO.clear()');
  ok('世界：同種子同地圖（清掉快取重算也一樣）、不同種子不一樣', a === R('WFP(12345)') && a !== R('WFP(54321)'));
  ok(
    '世界：連線是對稱的（a 接 b 就是 b 接 a）',
    R(`(() => { const s = 777;
      for (let q = -25; q <= 25; q++) for (let r = -25; r <= 25; r++)
        for (const [x, y] of wNode(s, q, r) ? wNear(s, q, r) : []) if (!wLinked(s, x, y, q, r)) return false;
      return true; })()`)
  );
  const back = R(`(() => {
    for (const seed of [1, 7, 12345, 99999, 2147483646]) {
      for (let q = -45; q <= 45; q++) for (let r = -45; r <= 45; r++) {
        if (!wNode(seed, q, r) || wRing(q, r) <= W_R) continue;
        let x = q, y = r, n = 0;
        while (wRing(x, y) > W_ROAD) {
          const p = wInner(seed, x, y);
          if (!p || !wLinked(seed, x, y, p[0], p[1])) return 'seed ' + seed + ' 斷在 ' + x + ',' + y;
          [x, y] = p;
          if (++n > 100) return '繞圈';
        }
      }
      /* 第 4 圈整圈是環、接得到劇情終點 */
      for (let i = 0; i < 24; i++) {
        const [a, b] = ringHex(W_ROAD, i / 24), [c, d] = ringHex(W_ROAD, ((i + 1) % 24) / 24);
        if (!wNode(seed, a, b) || !wLinked(seed, a, b, c, d)) return '環斷了';
      }
      const E = STORY[STORY_END];
      if (!wNear(seed, E.q, E.r).some(([x, y]) => wRing(x, y) === W_ROAD)) return '劇情終點沒接到環';
      if (wNear(seed, 0, 1).some(([x, y]) => STORY_I[wKey(x, y)] == null)) return '劇情區漏路';
    }
    return '';
  })()`);
  ok('世界：每個節點照內圈路都走得回劇情區（5 個種子、45 圈內）', !back, back);
  ok(
    '世界：空格約 11%、節點連線不是六邊都通',
    R(`(() => { const s = 42; let n = 0, all = 0, deg = 0;
      for (let q = -30; q <= 30; q++) for (let r = -30; r <= 30; r++) {
        if (wRing(q, r) <= W_ROAD || wRing(q, r) > 30) continue;
        all++; if (wNode(s, q, r)) { n++; deg += wNear(s, q, r).length; }
      }
      return 1 - n / all > 0.08 && 1 - n / all < 0.14 && deg / n > 2 && deg / n < 4; })()`)
  );
  ok(
    '難度：節點等級 ↔ 內部難度對得起來、每圈 +3、83 封頂',
    R(`(() => {
      for (let L = 5; L <= 83; L++) if (mobLv(lvT(L)) !== L) return false;
      return lvT(83) === 16 && wLv(4, 0) === 21 && wLv(10, 0) === 39 && wLv(25, 0) === 83 && wLv(26, 0) === 83 && wLv(5000, -2000) === 83 && wLv(3, -1) === 18 && wLv(0, 0) === 5;
    })()`)
  );
  ok(
    '難度：小數的內部難度數值都正常，整數的結果不變',
    R(`(() => {
      for (let t = 1; t <= 16; t += 0.05) {
        const m = tierMob(t), p = poiseT(t), i = tierIlvl(t);
        if (!(m.hp > 0 && m.dmg > 0 && p > 0 && Number.isInteger(i) && i >= 1 && i <= 16)) return false;
      }
      for (let t = 1; t <= 16; t++) if (poiseT(t) !== POISE_T[t - 1] || tierIlvl(t) !== t) return false;
      return tierMob(1).hp === 0.8 && tierMob(3.5).hp > tierMob(3).hp && tierMob(3.5).hp < tierMob(4).hp;
    })()`)
  );
  ok(
    '地圖卡：每節點 3 張、換節點再回來不會變；洗卡費用看等級區間、每洗一次加倍',
    R(`(() => {
      const s = WS(5, { frag: 100 }), k = '5,0', c = wCards(s, k).c;
      wCards(s, '6,0');
      if (c.length !== 3 || wCards(s, k).c !== c) return false;
      if (washCost(1, 0) !== 1 || washCost(30, 0) !== 1 || washCost(31, 0) !== 2 || washCost(60, 0) !== 2 || washCost(61, 0) !== 4 || washCost(61, 3) !== 32) return false;
      /* 5,0 是 Lv24：1、2、4 */
      if (!wWash(s, k) || s.frag !== 99 || !wWash(s, k) || s.frag !== 97 || !wWash(s, k) || s.frag !== 93) return false;
      s.frag = 7;
      return !wWash(s, k) && s.frag === 7 && wCards(s, k).w === 3;
    })()`)
  );
  ok(
    '血霧：只有血霧節點累積；滿了每進一張扣 25%、期間不累積，扣完回到累積',
    R(`(() => {
      const s = WS(5), blood = [];
      for (let q = -20; q <= 20; q++) for (let r = -20; r <= 20; r++) if (wNode(5, q, r) && wType(s, q, r) === 'blood') blood.push(wKey(q, r));
      const plain = (() => { for (let q = 5; q < 40; q++) if (wNode(5, q, 0) && wType(s, q, 0) === 'plain') return wKey(q, 0); })();
      wClear(s, plain);
      if (s.hunt.v !== 0) return 'plain';
      blood.slice(0, 4).forEach(k => wClear(s, k));
      if (s.hunt.v !== 80 || s.hunt.full) return 'gain';
      s.cards = { x: 1 };
      wClear(s, blood[4]);
      if (s.hunt.v !== 100 || !s.hunt.full || s.cards.x) return 'full';
      wClear(s, blood[5]);
      if (s.hunt.v !== 100) return 'no gain';
      huntEnter(s); huntEnter(s); huntEnter(s);
      if (s.hunt.v !== 25 || !s.hunt.full) return 'enter';
      huntEnter(s);
      return s.hunt.v === 0 && !s.hunt.full ? '' : 'end';
    })()`) === ''
  );
  ok(
    '血霧：5★ 權重 ×3',
    R(`(() => { const N = 60000, n = w => { let c = 0; for (let i = 0; i < N; i++) if (rollStar(w) === 5) c++; return c / N; };
      const a = n(1), b = n(3); return Math.abs(a - 0.05) < 0.006 && Math.abs(b - 15 / 110) < 0.01; })()`)
  );
  ok(
    '裂口：血霧滿才能進、一次血霧只開一道、打完點亮神像',
    R(`(() => {
      const seed = 9, s = WS(seed);
      s.world.stage = STORY.length;
      s.world.done = STORY.map(n => wKey(n.q, n.r));
      const ks = Object.keys(wRifts(seed));
      if (ks.length !== 12) return 'count';
      const [a, b] = ks.map(wXY);
      /* 把路走到裂口旁邊 */
      for (const [q, r] of [a, b]) { const p = wNear(seed, q, r)[0]; s.world.done.push(wKey(...p)); }
      if (wWhy(s, ...a) !== '血霧滿了才進得去') return 'lock';
      s.hunt = { v: 100, full: 1, used: 0 };
      if (wWhy(s, ...a) !== '') return 'open';
      wClear(s, wKey(...a));
      if (s.idols.length !== 1 || s.idols[0] !== wZod(s, ...a).z) return 'idol';
      if (wWhy(s, ...b) !== '這次血霧已經開過一道裂口') return 'once';
      s.hunt.v = 25; huntEnter(s);
      s.hunt = { v: 100, full: 1, used: s.hunt.used };
      return wWhy(s, ...b) === '' ? '' : 'next';
    })()`) === ''
  );
  ok(
    '裂口：十二隻打完前地圖上只有 12 道，打完後隨機出現約 3%',
    R(`(() => {
      const seed = 31, s = WS(seed);
      let a = 0, b = 0, n = 0;
      const scan = f => { for (let q = -40; q <= 40; q++) for (let r = -40; r <= 40; r++) if (wRing(q, r) > W_ROAD && wRing(q, r) <= 40 && wNode(seed, q, r) && wType(s, q, r) === 'rift') f(q, r); };
      scan(() => a++);
      s.idols = ZODIAC.map(z => z.z);
      for (let q = -40; q <= 40; q++) for (let r = -40; r <= 40; r++) if (wRing(q, r) > W_ROAD && wRing(q, r) <= 40 && wNode(seed, q, r)) n++;
      let okz = true;
      scan((q, r) => { b++; if (!ZODIAC.includes(wZod(s, q, r))) okz = false; });
      return a === 12 && (b - 12) / n > 0.02 && (b - 12) / n < 0.04 && okz;
    })()`)
  );
  ok(
    '世界：劇情區照順序、走完才開世界區；走過的不能再打；只有接到路的才進得去',
    R(`(() => {
      const seed = 3, s = WS(seed);
      if (!wCan(s, 0, 0) || wCan(s, 0, 1) || wCan(s, 4, 0)) return 'start';
      for (let i = 0; i < 8; i++) wClear(s, wKey(STORY[i].q, STORY[i].r));
      if (wOpen(s) || wCan(s, 4, -1)) return 'lock';
      wClear(s, '3,-1');
      if (!wOpen(s) || !wCan(s, 4, -1) || wCan(s, 3, -1) || wCan(s, 20, 0)) return 'open';
      const L = wList(s);
      if (!L.includes('4,-1') || !L.includes('0,0') || !Object.keys(wRifts(seed)).every(k => L.includes(k))) return 'list';
      return wWhy(s, 3, -1) === '已經走過' && s.world.at === '3,-1' ? '' : 'done';
    })()`) === ''
  );
  ok(
    '十二生肖：圖、招式、叫的小怪、墮落詞、神像的鍵都對得上',
    R(
      `ZODIAC.length === 12 && new Set(ZODIAC.map(z => z.z)).size === 12 && ZODIAC.every(z => z.pat.length >= 3 && MOBS[z.call] && MAPMOD[z.cor])`
    ) &&
      R('ZODIAC.map(z => z.sp)').every(has) &&
      ['swipe', 'charge', 'slam', 'summon', 'nova', 'line', 'blink'].every(p =>
        R('ZODIAC').some(z => z.pat.includes(p))
      )
  );
  ok(
    '十二生肖：墮落詞換掉同組的卡片詞，不疊加',
    R(
      `mapMods({ mods: ['poison', 'hp1'] }, 'poison').mpoi === 25 && mapMods({ mods: ['dmg1'] }, 'poison').mpoi === 25 && mapMods({ mods: ['hp1'] }).mhp === 20`
    )
  );
}
/* 存檔 23：舊存檔裡的死亡紅花要拿掉、退靈魂、輔助放回寶石頁，別的寶石不動 */
{
  const r = vm.runInContext(
    `(() => {
    const bad = lv => ({ gem: 'redbloom', lv, sup: [{ gem: 'multi', lv: 1 }, null] }), keep = { gem: 'slash', lv: 2, sup: [null, null] };
    const o = { mat: { soul: 5 }, gems: [bad(1), keep], skills: [{ a: bad(3) }, { a: keep }, { a: null }], inv: { items: [bad(1), { b: 'x', a: [] }] }, stash: { items: [] }, temp: { items: [] } };
    gemPurge(o, 'redbloom');
    return { soul: o.mat.soul, need: 5 + soulCost(1) + soulCost(2), slots: o.skills.map(s => (s.a ? s.a.gem : '')).join(), gems: o.gems.map(g => g.gem).sort().join(), inv: o.inv.items.length, live: !SKILLS.redbloom && !GROUND_OK };
  })()`.replace('GROUND_OK', 'false'),
    ctx
  );
  ok(
    '舊存檔的死亡紅花：拿掉、退靈魂、輔助放回寶石頁',
    r.soul === r.need && r.slots === ',slash,' && r.gems === 'multi,multi,multi,slash' && r.inv === 1 && r.live,
    JSON.stringify(r)
  );
}
process.exit(bad ? 1 : 0);
