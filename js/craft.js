/* dungeonPOE · 做裝（0.2.6，企劃書 5.3、6.2～6.4）：純邏輯，不碰畫面（tools/check.js 也會載入）
   鍛造（詞綴，花潛能＋三種粉，最高做到 T2）、淬鍊（數值，花金幣）、材料、靈魂升級、開孔 */
'use strict';

/* ---------- 材料 ---------- */
const newMat = () => ({ dust: 0, fine: 0, rare: 0, soul: 0 });
const MAT = () => (S.mat = S.mat || newMat());

/* ---------- 詞綴的條數上限 ---------- */
const affCap = it => (it.r === 2 ? 6 : it.r === 1 ? 2 : 0);
const sideCap = it => (it.r === 2 ? 3 : 1);
/* 這件還能加哪些詞（指定類 cls；沒指定＝全部），照前後綴上限 */
function affPool(it, cls, skip) {
  const have = new Set(it.a.filter(a => a !== skip).map(a => a.k)),
    np = it.a.filter(a => a !== skip && AFF[a.k].p).length,
    ns = it.a.filter(a => a !== skip && !AFF[a.k].p).length,
    cap = sideCap(it);
  return (baseOf(it).aff || KINDS[baseOf(it).k].aff).filter(
    k => !have.has(k) && (!cls || affCls(k) === cls) && (AFF[k].p ? np < cap : ns < cap)
  );
}
/* 鍛造出來的詞：照物品等級骰，但最高 T2（T1 只能靠野生掉落） */
function forgeAff(k, ilvl) {
  const a = rollAff(k, ilvl);
  if (a.T >= 2) return a;
  const [lo, hi] = tierRange(k, 2),
    v = irnd(lo, hi);
  return { k, T: 2, v: AFF[k].add ? [Math.max(1, Math.round(v * 0.5)), v] : v };
}
const sortAff = it => it.a.sort((x, y) => AFF[y.k].p - AFF[x.k].p);
/* 可能拿到的階級（預覽用） */
const tierSpan = it => `T${Math.max(2, bestTier(it.L))}～T${Math.min(AFF_T, bestTier(it.L) + 2)}`;
/* 預覽（0.2.30）：一條詞可能的數字範圍（這件物品等級能出的階級） */
function affRangeTxt(k, it) {
  const b = bestTier(it.L),
    [, hi] = tierRange(k, Math.max(2, b)),
    [lo] = tierRange(k, Math.min(AFF_T, b + 2));
  return AFF[k].n.replace('{}', `${lo}～${hi}`);
}
/* 這一步可能拿掉、可能加入什麼（鍛造台的預覽）：out 拿掉的詞、add 詞綴鍵、keep 不變的詞 */
function forgeWhat(it, op, cls) {
  const open = it.a.filter(a => !a.lock);
  if (op === 'enhance') return { out: [], add: affPool({ ...it, r: it.r + 1 }, cls) };
  if (op === 'add') return { out: [], add: affPool(it, cls) };
  if (op === 'reforge')
    return { all: 1, out: open, add: affPool({ ...it, a: it.a.filter(a => a.lock) }), keep: it.a.filter(a => a.lock) };
  const L = open.filter(a => (op === 'swapSame' ? affCls(a.k) === cls : affCls(a.k) !== cls));
  return { out: L, add: [...new Set(L.flatMap(o => affPool(it, cls, o)))] };
}
const affShort = a => AFF[a.k].n.replace(/ ?\+?\{\}%?/g, '').replace('附加 ', '') + ' T' + a.T;

/* ---------- 商人賭裝（0.2.28，企劃書 5.6）：選種類、花金幣買一件。物品等級＝開放的最高階；品質 0、孔 0、潛能 3、
   詞綴最高 T2（好基底與 T1 只靠掉落）；連續 8 件沒出稀有，下一件必出（S.gamN）。價格永遠高於稀有裝的賣價 ---------- */
const GAMBLE = [
  ['武器', Object.keys(WTN).map(w => ({ id: w, k: 'weapon', wt: w, n: WTN[w] }))],
  [
    '副手',
    [
      ['shield', '盾'],
      ['focus', '法器'],
      ['quiver', '箭袋']
    ].map(([k, n]) => ({ id: k, k, n }))
  ],
  [
    '防具與飾品',
    [
      ['helm', '頭部'],
      ['chest', '胸甲'],
      ['gloves', '手套'],
      ['boots', '鞋子'],
      ['belt', '腰帶'],
      ['amulet', '項鍊'],
      ['ring', '戒指']
    ].map(([k, n]) => ({ id: k, k, n }))
  ]
];
const GAM_PITY = 8;
const gamIlvl = s => tierIlvl(s.maxT);
const gamPrice = s => Math.round(17 * (1 + 0.4 * gamIlvl(s)) * 1.5);
const gamLeft = s => GAM_PITY - (s.gamN || 0);
/* 回傳 { it } 或 { why }；背包放不下不扣錢、不算保底 */
function gambleDo(id) {
  const o = GAMBLE.flatMap(g => g[1]).find(x => x.id === id),
    c = gamPrice(S);
  if (!o) return { why: '沒有這種東西' };
  if (S.gold < c) return { why: `金幣不夠（要 ${c}）` };
  const L = gamIlvl(S),
    rar = gamLeft(S) <= 0 ? 2 : rollRarity(0),
    it = mkItem(pickBase(L, o.k, o.wt).id, L, rar);
  Object.assign(it, { q: 0, so: 0, pot: 3 });
  it.a = it.a.map(a => (a.T < 2 ? forgeAff(a.k, L) : a));
  if (!gridAuto(S.inv, it)) return { why: '背包滿了' };
  S.gold -= c;
  S.gamN = rar === 2 ? 0 : (S.gamN || 0) + 1;
  return { it };
}

/* ---------- 鍛造：5 種（企劃書 5.3.1 先做的） ---------- */
/* pot 潛能、du 花哪一種粉（DUSTS）、cls 選的詞綴類別；ok(it, cls) 回傳 null＝可以，字串＝不行的原因；preview 給預覽文字；run 真的做 */
const FORGE = {
  enhance: {
    n: '強化',
    d: '白→藍、藍→黃（保留原本的詞），加 1 條詞；選了類別就加那一類',
    pot: 1,
    du: 'dust',
    /* 照「強化之後」的稀有度算前後綴上限（藍→黃後各 3 條） */
    ok: (it, cls) =>
      it.r >= 2 ? '已經是稀有（黃）' : !affPool({ ...it, r: it.r + 1 }, cls).length ? '這一類沒有詞可以加' : null,
    preview: (it, cls) =>
      `變成${it.r ? '稀有（黃）' : '魔法（藍）'}，加入：${cls ? ACLSI[cls].n + '類 ' : ''}${tierSpan(it)}`,
    run(it, cls) {
      it.r++;
      if (it.r === 2) it.nm = pick(NAME_A) + pick(NAME_B);
      it.a.push(forgeAff(pick(affPool(it, cls)), it.L));
    }
  },
  add: {
    n: '添加 +1',
    d: '加 1 條指定類的詞',
    pot: 1,
    du: 'fine',
    ok: (it, cls) =>
      !it.r
        ? '白裝先用「強化」'
        : it.a.length >= affCap(it)
          ? `詞已經滿了（${affCap(it)} 條）`
          : !affPool(it, cls).length
            ? '這一類沒有詞可以加（或前後綴滿了）'
            : null,
    preview: (it, cls) =>
      `可能加入：${affPool(it, cls)
        .map(k => AFF[k].n.replace(/ ?\+?\{\}%?/g, '').replace('附加 ', ''))
        .join('、')}（${tierSpan(it)}）`,
    run(it, cls) {
      it.a.push(forgeAff(pick(affPool(it, cls)), it.L));
    }
  },
  swapSame: {
    n: '同類置換',
    d: '拿掉 1 條這一類的詞，加 1 條同類的',
    pot: 1,
    du: 'fine',
    ok: (it, cls) => (!it.a.some(a => affCls(a.k) === cls && !a.lock) ? '身上沒有這一類的詞' : null),
    preview(it, cls) {
      const L = it.a.filter(a => affCls(a.k) === cls && !a.lock);
      return `可能拿掉：${L.map(affShort).join('、')}（各 ${Math.round(100 / L.length)}%）；加入同類 ${tierSpan(it)}`;
    },
    run(it, cls) {
      const out = pick(it.a.filter(a => affCls(a.k) === cls && !a.lock));
      const pool = affPool(it, cls, out);
      it.a.splice(it.a.indexOf(out), 1, forgeAff(pick(pool.length ? pool : [out.k]), it.L));
    }
  },
  swapCross: {
    n: '跨類置換',
    d: '拿掉 1 條「不是這一類」的詞，換成這一類的',
    pot: 1,
    du: 'rare',
    ok(it, cls) {
      const L = it.a.filter(a => affCls(a.k) !== cls && !a.lock);
      if (!L.length) return '沒有別類的詞可以換';
      return L.some(out => affPool(it, cls, out).length) ? null : '這一類沒有詞可以加（或前後綴滿了）';
    },
    preview(it, cls) {
      const L = it.a.filter(a => affCls(a.k) !== cls && !a.lock);
      return `可能拿掉：${L.map(affShort).join('、')}（各 ${Math.round(100 / L.length)}%）；加入${ACLSI[cls].n}類 ${tierSpan(it)}`;
    },
    run(it, cls) {
      const L = it.a.filter(a => affCls(a.k) !== cls && !a.lock && affPool(it, cls, a).length),
        out = pick(L);
      it.a.splice(it.a.indexOf(out), 1, forgeAff(pick(affPool(it, cls, out)), it.L));
    }
  },
  reforge: {
    n: '定向重鑄',
    d: '全部重骰（條數不變），保證至少 1 條這一類',
    pot: 1,
    du: 'rare',
    ok: (it, cls) =>
      !it.r ? '白裝先用「強化」' : !affPool({ ...it, a: [] }, cls).length ? '這個部位沒有這一類的詞' : null,
    preview: (it, cls) => `${it.a.length} 條全部重骰，至少 1 條${ACLSI[cls].n}類（${tierSpan(it)}）`,
    run(it, cls) {
      const n = it.a.length,
        keep = it.a.filter(a => a.lock);
      it.a = keep.slice();
      if (!keep.some(a => affCls(a.k) === cls)) it.a.push(forgeAff(pick(affPool(it, cls)), it.L));
      for (let i = 0; i < 40 && it.a.length < n; i++) {
        const pool = affPool(it);
        if (!pool.length) break;
        it.a.push(forgeAff(pick(pool), it.L));
      }
    }
  }
};
/* 這次鍛造要花什麼、能不能做 */
function forgeCheck(it, op, cls) {
  const F = FORGE[op],
    m = MAT(),
    cost = { pot: F.pot, du: F.du, n: dustCost(it, F.du) };
  let why = null;
  if (it.gem) why = '寶石不能鍛造';
  else if (op !== 'enhance' && !cls) why = '先選一種類別';
  else if ((it.pot || 0) < cost.pot) why = '潛能用完了';
  else if (m[cost.du] < cost.n) why = `${DUSTS[cost.du]}不夠（要 ${cost.n}）`;
  else why = F.ok(it, cls);
  return { cost, why };
}
function forgeDo(it, op, cls) {
  const { cost, why } = forgeCheck(it, op, cls);
  if (why) return why;
  const m = MAT();
  it.pot -= cost.pot;
  m[cost.du] -= cost.n;
  FORGE[op].run(it, cls);
  sortAff(it);
  return null;
}
/* 推薦：白藍→強化；黃裝沒滿→添加（選的那類）；有很爛的詞（T5 以下）→同類置換 */
function forgeHint(it, cls) {
  if (it.gem || !it.pot) return null;
  if (it.r < 2) return 'enhance';
  if (it.a.length < affCap(it) && cls && !FORGE.add.ok(it, cls)) return 'add';
  if (cls && it.a.some(a => affCls(a.k) === cls && a.T >= 5)) return 'swapSame';
  return null;
}

/* ---------- 淬鍊：階級不變，只在範圍裡重骰數值 ---------- */
function rerollV(a) {
  const [lo, hi] = tierRange(a.k, a.T),
    v = irnd(lo, hi);
  a.v = AFF[a.k].add ? [Math.max(1, Math.round(v * 0.5)), v] : v;
}
/* 這條在階級範圍裡的百分位（0～1） */
function affPct(a) {
  const [lo, hi] = tierRange(a.k, a.T),
    v = Array.isArray(a.v) ? a.v[1] : a.v;
  return hi > lo ? Math.max(0, Math.min(1, (v - lo) / (hi - lo))) : 1;
}
const perfection = it => (it.a.length ? it.a.reduce((s, a) => s + affPct(a), 0) / it.a.length : 0);
function temperDo(it, idx) {
  const single = idx != null,
    c = temperCost(it, single);
  if (it.gem || !it.a.length) return '沒有詞可以淬鍊';
  if (S.gold < c) return `金幣不夠（要 ${c}）`;
  S.gold -= c;
  it.tmp = (it.tmp || 0) + 1;
  if (single) rerollV(it.a[idx]);
  else for (const a of it.a) if (!a.lock) rerollV(a);
  return null;
}

/* ---------- 打怪拿材料（三種粉、靈魂自動進材料頁） ---------- */
function killMat(m, t) {
  const M = MAT(),
    k = m.boss ? 2 : m.elite ? 1 : 0,
    got = [];
  M.dust += Math.round([1, 6, 30][k] * (1 + 0.15 * (t - 1)) * (k ? 1 : Math.random() < 0.7 ? 1 : 0));
  M.soul += Math.round([1, 10, 100][k] * (1 + 0.2 * (t - 1)));
  const fine = [0, Math.round(1 + 0.1 * (t - 1)), Math.round(4 * (1 + 0.1 * (t - 1)))][k],
    rare = k === 2 ? 2 : k && Math.random() < 0.15 ? 1 : 0;
  if (fine) (M.fine += fine), got.push(fine + ' 精粉');
  if (rare) (M.rare += rare), got.push(rare + ' 稀粉');
  return got;
}

/* ---------- 寶石：靈魂升級、開孔 ---------- */
const gemSoCap = g => (SKILLS[g.gem] ? GEM_SO_MAX : 0);
function gemUpCheck(g) {
  const cap = gemCap(S.lv),
    c = soulCost(g.lv);
  if (g.lv >= cap) return { c, why: g.lv >= GEM_MAX ? '已經滿級' : `Lv ${g.lv + 1} 要角色 Lv ${gemReq(g.lv + 1)}` };
  if (MAT().soul < c) return { c, why: `靈魂不夠（要 ${c}）` };
  return { c, why: null };
}
function gemUp(g) {
  const { c, why } = gemUpCheck(g);
  if (why) return why;
  MAT().soul -= c;
  g.lv++;
  return null;
}
/* 升滿（0.2.24）：一直升到角色能用的最高級（或滿級），靈魂不夠就停在買得起的最高級；
   寶石等級會拉高能力值需求，停在升完還能用的最高級（硬要升走 gemUp，面板上有警告） */
function gemMaxCheck(g) {
  const cap = gemCap(S.lv);
  let lv = g.lv,
    c = 0,
    stop = null;
  while (lv < cap && c + soulCost(lv) <= MAT().soul) {
    const l = gemLack({ ...g, lv: lv + 1 });
    if (l.length) {
      stop = `Lv ${lv + 1} 要${lackTxt(l)}`;
      break;
    }
    c += soulCost(lv++);
  }
  return { lv, c, why: lv > g.lv ? null : stop || gemUpCheck(g).why };
}
function gemUpMax(g) {
  const { lv, c, why } = gemMaxCheck(g);
  if (why) return why;
  MAT().soul -= c;
  g.lv = lv;
  return null;
}
/* 全部升滿：一次升一級、最低等的先升，靈魂不夠時大家平均；跟 gemMaxCheck 一樣不會升到失效。回傳總花費與每顆的目標等級 */
function gemAllPlan(gems) {
  const cap = gemCap(S.lv),
    L = gems.map(g => ({ g, lv: g.lv }));
  let c = 0;
  for (;;) {
    let b = null;
    for (const x of L) {
      if (x.lv >= cap || c + soulCost(x.lv) > MAT().soul || gemLack({ ...x.g, lv: x.lv + 1 }).length) continue;
      if (!b || x.lv < b.lv) b = x;
    }
    if (!b) break;
    c += soulCost(b.lv++);
  }
  return { c, L: L.filter(x => x.lv > x.g.lv) };
}
function gemUpAll(gems) {
  const { c, L } = gemAllPlan(gems);
  MAT().soul -= c;
  for (const x of L) x.g.lv = x.lv;
  return L.length;
}
/* 品質（0.2.29）：花精粉，只能升不能降 */
function gemQCheck(g) {
  const q = g.q || 0,
    n = Math.ceil((GEM_Q_MAX - q) / gemQStep(g));
  if (!n) return { why: '品質已滿', n: 0 };
  return { n, why: MAT().fine > 0 ? null : '精粉不夠' };
}
/* all：能升多少升多少 */
function gemQUp(g, all) {
  const { n, why } = gemQCheck(g);
  if (why) return why;
  const k = all ? Math.min(n, MAT().fine) : 1;
  MAT().fine -= k;
  g.q = Math.min(GEM_Q_MAX, (g.q || 0) + k * gemQStep(g));
  return null;
}
function drillCheck(g) {
  const so = g.so || 0;
  if (!SKILLS[g.gem] && !AURAS[g.gem]) return { why: '只有技能與光環寶石能開孔' };
  if (so >= GEM_SO_MAX) return { why: '已經 5 孔' };
  const k = Math.max(0, so - 2),
    [m, n] = DRILL[k];
  return { k, m, n, why: MAT()[m] >= n ? null : `${DUSTS[m]}不夠（要 ${n}）` };
}
function drillDo(g) {
  const { m, n, why } = drillCheck(g);
  if (why) return why;
  MAT()[m] -= n;
  g.so = (g.so || 2) + 1;
  g.sup = [...(g.sup || []), null];
  return null;
}
