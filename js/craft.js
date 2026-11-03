/* dungeonPOE · 做裝（0.2.6，企劃書 5.3、6.2～6.4）：純邏輯，不碰畫面（tools/check.js 也會載入）
   鍛造（詞綴，花潛能＋粉＋碎片，最高做到 T2）、淬鍊（數值，花金幣）、分解、材料、寶石書庫、靈魂升級、開孔 */
'use strict';

/* ---------- 材料 ---------- */
const newMat = () => ({ dust: 0, soul: 0, sh: Object.fromEntries(SHARDS.map(x => [x.k, 0])), drill: [0, 0, 0] });
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
const tierSpan = it => `T${Math.max(2, bestTier(it.L))}～T${Math.min(12, bestTier(it.L) + 4)}`;
const affShort = a => AFF[a.k].n.replace(/ ?\+?\{\}%?/g, '').replace('附加 ', '') + ' T' + a.T;

/* ---------- 鍛造：5 種（企劃書 5.3.1 先做的） ---------- */
/* need：潛能、碎片（用哪一類 cls）；ok(it, cls) 回傳 null＝可以，字串＝不行的原因；preview 給預覽文字；run 真的做 */
const FORGE = {
  enhance: {
    n: '強化',
    d: '白→藍、藍→黃（保留原本的詞），加 1 條詞；選了碎片就加那一類',
    pot: 1,
    shard: 0,
    /* 照「強化之後」的稀有度算前後綴上限（藍→黃後各 3 條） */
    ok: (it, cls) =>
      it.r >= 2 ? '已經是稀有（黃）' : !affPool({ ...it, r: it.r + 1 }, cls).length ? '這一類沒有詞可以加' : null,
    preview: (it, cls) =>
      `變成${it.r ? '稀有（黃）' : '魔法（藍）'}，加入：${cls ? SHARDI[cls].n + '類 ' : ''}${tierSpan(it)}`,
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
    shard: 1,
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
    shard: 1,
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
    shard: 1,
    ok(it, cls) {
      const L = it.a.filter(a => affCls(a.k) !== cls && !a.lock);
      if (!L.length) return '沒有別類的詞可以換';
      return L.some(out => affPool(it, cls, out).length) ? null : '這一類沒有詞可以加（或前後綴滿了）';
    },
    preview(it, cls) {
      const L = it.a.filter(a => affCls(a.k) !== cls && !a.lock);
      return `可能拿掉：${L.map(affShort).join('、')}（各 ${Math.round(100 / L.length)}%）；加入${SHARDI[cls].n}類 ${tierSpan(it)}`;
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
    shard: 1,
    ok: (it, cls) =>
      !it.r ? '白裝先用「強化」' : !affPool({ ...it, a: [] }, cls).length ? '這個部位沒有這一類的詞' : null,
    preview: (it, cls) => `${it.a.length} 條全部重骰，至少 1 條${SHARDI[cls].n}類（${tierSpan(it)}）`,
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
    cost = { pot: F.pot, dust: dustCost(it), shard: F.shard || (op === 'enhance' && cls ? 1 : 0) };
  let why = null;
  if (it.gem) why = '寶石不能鍛造';
  else if ((F.shard || op !== 'enhance') && !cls) why = '先選一種碎片';
  else if ((it.pot || 0) < cost.pot) why = '潛能用完了';
  else if (m.dust < cost.dust) why = `粉不夠（要 ${cost.dust}）`;
  else if (cost.shard && m.sh[cls] < cost.shard) why = `${SHARDI[cls].n}碎片不夠`;
  else why = F.ok(it, cls);
  return { cost, why };
}
function forgeDo(it, op, cls) {
  const { cost, why } = forgeCheck(it, op, cls);
  if (why) return why;
  const m = MAT();
  it.pot -= cost.pot;
  m.dust -= cost.dust;
  if (cost.shard) m.sh[cls] -= cost.shard;
  FORGE[op].run(it, cls);
  sortAff(it);
  return null;
}
/* 推薦：白藍→強化；黃裝沒滿→添加（碎片最多的那類）；有很爛的詞（T9 以下）→同類置換 */
function forgeHint(it, cls) {
  if (it.gem || !it.pot) return null;
  if (it.r < 2) return 'enhance';
  if (it.a.length < affCap(it) && cls && !FORGE.add.ok(it, cls)) return 'add';
  if (cls && it.a.some(a => affCls(a.k) === cls && a.T >= 9)) return 'swapSame';
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

/* ---------- 分解：黃裝→最高階那條的碎片 ×2＋粉；藍、白只給粉 ---------- */
function decompYield(it) {
  const dust = Math.round((it.r === 2 ? 10 : it.r ? 5 : 2) * (1 + it.L / 4));
  if (it.r < 2 || !it.a.length) return { dust };
  const top = it.a.reduce((b, a) => (a.T < b.T ? a : b));
  return { dust, cls: affCls(top.k), n: 2 };
}
function decompDo(it) {
  const y = decompYield(it),
    m = MAT();
  m.dust += y.dust;
  if (y.cls) m.sh[y.cls] += y.n;
  return y;
}

/* ---------- 打怪拿材料（粉、靈魂自動吸收；碎片、鑿孔石也直接進材料頁） ---------- */
function killMat(m, t) {
  const M = MAT(),
    k = m.boss ? 2 : m.elite ? 1 : 0,
    got = [];
  M.dust += Math.round([1, 6, 30][k] * (1 + 0.15 * (t - 1)) * (k ? 1 : Math.random() < 0.7 ? 1 : 0));
  M.soul += Math.round([1, 10, 100][k] * (1 + 0.2 * (t - 1)));
  const nSh = k === 2 ? 3 : Math.random() < [0.04, 0.35][k] ? 1 : 0;
  for (let i = 0; i < nSh; i++) {
    const x = pick(SHARDS).k;
    M.sh[x]++;
    got.push(SHARDI[x].n + '碎片');
  }
  const dr = [
    Math.random() < [0.012, 0.08, 0.6][k],
    t >= 5 && Math.random() < [0.002, 0.04, 0.5][k],
    t >= 10 && Math.random() < [0, 0.005, 0.3][k]
  ];
  dr.forEach((y, i) => y && (M.drill[i]++, got.push(DRILLS[i])));
  return got;
}

/* ---------- 寶石：書庫（學會＝永遠會）、白板、靈魂升級、開孔 ---------- */
const LIB = () => (S.lib = S.lib || []);
/* 撿到寶石：沒學過＝學會（寶石收進書庫）；學過了＝技能、光環換靈魂，輔助換粉 */
function learnGem(it) {
  const L = LIB(),
    M = MAT();
  if (!L.includes(it.gem)) {
    L.push(it.gem);
    return { learned: 1 };
  }
  if (isSup(it)) return (M.dust += 15), { dust: 15 };
  const v = 20 * it.lv;
  M.soul += v;
  return { soul: v };
}
/* 從書庫複製一顆白板（Lv 1、技能 2 孔） */
const blankGem = g => mkGem(g, 1);
const gemSoCap = g => (SKILLS[g.gem] ? GEM_SO_MAX : 0);
function gemUpCheck(g) {
  const cap = Math.min(GEM_MAX, S.lv),
    c = soulCost(g.lv, isSup(g));
  if (g.lv >= cap) return { c, why: g.lv >= GEM_MAX ? '已經滿級' : `不能超過角色等級（Lv ${S.lv}）` };
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
function drillCheck(g) {
  const so = g.so || 0;
  if (!SKILLS[g.gem]) return { why: '只有技能寶石能開孔' };
  if (so >= GEM_SO_MAX) return { why: '已經 5 孔' };
  const k = Math.max(0, so - 2);
  return { k, why: MAT().drill[k] > 0 ? null : `沒有${DRILLS[k]}` };
}
function drillDo(g) {
  const { k, why } = drillCheck(g);
  if (why) return why;
  MAT().drill[k]--;
  g.so = (g.so || 2) + 1;
  g.sup = [...(g.sup || []), null];
  return null;
}
