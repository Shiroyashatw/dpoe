/* dungeonPOE · 做裝（0.2.72 重做，企劃書第 5 節）：純邏輯，不碰畫面（tools/check.js 也會載入）
   一條路：① 填（通貨，只能加）→ ② 淬鍊（金幣，重骰數值）→ ③ 聖化（聖化石）→ ④ 腐化（腐化石，全部鎖定）；
   通貨掉落、材料、靈魂升級、開孔 */
'use strict';

/* ---------- 材料（S.mat）：靈魂＋10 種通貨（data.js 的 CUR），精髓另放 S.mat.ess＝{ '類:T': 數量 } ---------- */
const newMat = () => ({ soul: 0, ...Object.fromEntries(Object.keys(CUR).map(k => [k, 0])), ess: {} });
const MAT = () => (S.mat = S.mat || newMat());
const essKey = (cls, T) => cls + ':' + T;
const essName = key => {
  const [c, T] = key.split(':');
  return `${ACLSI[c].n}精髓 T${T}`;
};
function essAdd(cls, T, n = 1) {
  const e = (MAT().ess = MAT().ess || {}),
    k = essKey(cls, T);
  e[k] = (e[k] || 0) + n;
}
/* 手上的精髓清單：類別順序、階級小（高階）的在前 */
const essList = () =>
  Object.entries(MAT().ess || {})
    .filter(([, n]) => n > 0)
    .sort(
      (a, b) =>
        ACLS.findIndex(x => x.k === a[0].split(':')[0]) - ACLS.findIndex(x => x.k === b[0].split(':')[0]) ||
        +a[0].split(':')[1] - +b[0].split(':')[1]
    );

/* ---------- 詞綴的條數上限 ---------- */
const affCap = it => (it.r === 2 ? 6 : it.r === 1 ? 2 : 0);
const sideCap = it => (it.r === 2 ? 3 : 1);
/* 這件還能加哪些詞（指定類 cls；沒指定＝全部），照前後綴上限；skip＝算上限時不算這一條（轉化石換掉它） */
function affPool(it, cls, skip) {
  const have = new Set(it.a.filter(a => a !== skip).map(a => a.k)),
    np = it.a.filter(a => a !== skip && AFF[a.k].p).length,
    ns = it.a.filter(a => a !== skip && !AFF[a.k].p).length,
    cap = sideCap(it);
  return (baseOf(it).aff || KINDS[baseOf(it).k].aff).filter(
    k => !have.has(k) && (!cls || affCls(k) === cls) && (AFF[k].p ? np < cap : ns < cap)
  );
}
/* 新加的詞（企劃書 5.3.1）：照物品等級骰階（最高 T1）；精髓給 minT＝保證至少那一階（T 的數字要 ≤ minT），
   但不會比物品等級允許的最高階更高（bestTier） */
function fillAff(it, cls, minT) {
  const a = rollAff(pick(affPool(it, cls)), it.L);
  if (minT == null || a.T <= minT) return a;
  return rollAffT(a.k, Math.max(bestTier(it.L), minT));
}
const sortAff = it => it.a.sort((x, y) => AFF[y.k].p - AFF[x.k].p);
/* 商人賭裝用：詞綴最高 T2（好基底與 T1 只靠掉落） */
function gambAff(k, ilvl) {
  const a = rollAff(k, ilvl);
  return a.T >= 2 ? a : rollAffT(k, 2);
}
/* 可能拿到的階級（預覽用）：這件物品等級能出的最高階往下 3 階 */
const tierSpan = it => {
  const b = bestTier(it.L),
    w = Math.min(AFF_T, b + 2);
  return w > b ? `T${b}～T${w}` : `T${b}`;
};
/* 預覽（0.2.30）：一條詞可能的數字範圍（這件物品等級能出的階級） */
function affRangeTxt(k, it) {
  const b = bestTier(it.L),
    [, hi] = tierRange(k, b),
    [lo] = tierRange(k, Math.min(AFF_T, b + 2));
  return AFF[k].n.replace('{}', `${lo}～${hi}`);
}
const affName = k => AFF[k].n.replace(/ ?\+?\{\}%?/g, '').replace('附加 ', '');

/* ---------- 商人賭裝（0.2.28，企劃書 5.6）：選種類、花金幣買一件。物品等級＝開放的最高階；品質 0、孔 0、
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
  Object.assign(it, { q: 0, so: 0 });
  it.a = it.a.map(a => (a.T < 2 ? gambAff(a.k, L) : a));
  if (!gridAuto(S.inv, it)) return { why: '背包滿了' };
  S.gold -= c;
  S.gamN = rar === 2 ? 0 : (S.gamN || 0) + 1;
  return { it };
}

/* ---------- 填（企劃書 5.3.1）：通貨按鈕。ok(it, arg) 回傳 null＝可以、字串＝不行的原因；run(it, arg) 真的做。
   arg：精髓是 '類:T'，轉化石是要換的那條詞在 it.a 的位置 ---------- */
/* 這件現在不能動的原因（kind：'fill' 填、'temper' 淬鍊、'qual' 品質、'holy' 聖化、'corr' 腐化） */
function lockWhy(it, kind) {
  if (it.gem || it.charm) return '這個不能做裝';
  if (it.uid) return '還沒鑑定：先找撿骨師';
  if (it.cor) return '已腐化，全部鎖定';
  if (it.holy && kind === 'fill') return '已聖化，不能再填';
  if (it.holy && kind === 'temper') return '已聖化，不能再淬鍊';
  if (it.holy && kind === 'holy') return '已經聖化過了';
  return null;
}
/* 加 1 條詞的共同檢查：atR 是加完之後的稀有度（算前後綴上限）、cls 限定類別 */
const addWhy = (it, atR, cls) =>
  affPool({ ...it, r: atR }, cls).length
    ? null
    : cls
      ? '這一類沒有詞可以加（或前後綴滿了）'
      : '沒有詞可以加（前後綴滿了）';
const toYellow = it => {
  it.r = 2;
};
const FORGE = {
  tran: {
    n: '蛻變石',
    d: '白裝 → 藍裝（魔法），加 1 條詞',
    ok: it => (it.r ? '只有白裝能用蛻變石' : addWhy(it, 1)),
    add: it => affPool({ ...it, r: 1 }),
    run(it) {
      it.r = 1;
      it.a.push(fillAff(it));
    }
  },
  aug: {
    n: '增幅石',
    d: '藍裝（魔法）加 1 條詞，藍裝最多 2 條',
    ok: it => (it.r !== 1 ? '只有藍裝能用增幅石' : it.a.length >= 2 ? '藍裝最多 2 條詞' : addWhy(it, 1)),
    add: it => affPool(it),
    run(it) {
      it.a.push(fillAff(it));
    }
  },
  rich: {
    n: '富豪石',
    d: '藍裝 → 黃裝（稀有），加 1 條詞',
    ok: it => (it.r !== 1 ? '只有藍裝能用富豪石' : addWhy(it, 2)),
    add: it => affPool({ ...it, r: 2 }),
    run(it) {
      toYellow(it);
      it.a.push(fillAff(it));
    }
  },
  exalt: {
    n: '崇高石',
    d: '黃裝（稀有）加 1 條詞，最多 6 條，前後綴各 3',
    ok: it => (it.r !== 2 ? '只有黃裝能用崇高石' : it.a.length >= 6 ? '詞已經滿了（6 條）' : addWhy(it, 2)),
    add: it => affPool(it),
    run(it) {
      it.a.push(fillAff(it));
    }
  },
  /* 精髓：藍裝用＝增幅、黃裝用＝崇高，但保證那一類、而且至少那一階 */
  ess: {
    n: '精髓',
    d: '藍裝用＝增幅、黃裝用＝崇高；保證加的詞是那一類，而且至少是那一階',
    ok(it, arg) {
      const [cls] = String(arg || '').split(':');
      if (!ACLSI[cls]) return '先選一種精髓';
      if (!it.r) return '白裝先用蛻變石';
      if (it.r === 1 && it.a.length >= 2) return '藍裝最多 2 條詞';
      if (it.a.length >= 6) return '詞已經滿了（6 條）';
      return addWhy(it, it.r, cls);
    },
    add: (it, arg) => affPool(it, String(arg).split(':')[0]),
    run(it, arg) {
      const [cls, T] = arg.split(':');
      it.a.push(fillAff(it, cls, +T));
    }
  },
  /* 轉化石：1 條指定的詞換成同類的另一條，階不變、數值重骰；不能選破裂詞 */
  conv: {
    n: '轉化石',
    d: '1 條指定的詞換成同類的另一條，階不變、數值重骰；破裂詞不能選',
    ok(it, arg) {
      const a = it.a[+arg];
      if (!a) return '先選一條要換的詞';
      if (isFrac(it, a)) return '破裂詞不能轉化';
      if (!affCls(a.k)) return '這條沒有類別';
      return convPool(it, a).length ? null : '這一類沒有別的詞可以換（或前後綴滿了）';
    },
    add: (it, arg) => (it.a[+arg] ? convPool(it, it.a[+arg]) : []),
    run(it, arg) {
      const a = it.a[+arg];
      it.a.splice(+arg, 1, rollAffT(pick(convPool(it, a)), a.T));
    }
  }
};
/* 轉化石能換成什麼：同類、不是自己、這件裝備出得了、前後綴放得下（被換掉的那條不算） */
const convPool = (it, a) => affPool(it, affCls(a.k), a).filter(k => k !== a.k);
const FILL_OPS = Object.keys(FORGE);
/* 這顆通貨在材料頁的數量（精髓看選的那一種） */
const curHave = (op, arg) => (op === 'ess' ? (MAT().ess || {})[arg] || 0 : MAT()[op] || 0);
const curName = (op, arg) => (op === 'ess' ? (arg ? essName(arg) : '精髓') : CUR[op].n);
/* 這一步能不能做：why＝這件裝備不能這樣做的原因，lack＝通貨不夠（預覽照樣可以看） */
function forgeCheck(it, op, arg) {
  return {
    why: lockWhy(it, 'fill') || FORGE[op].ok(it, arg),
    lack: curHave(op, arg) < 1 ? `${curName(op, arg)}不夠` : null
  };
}
/* 預覽（鍛造台用）：add 可能加入的詞綴鍵、out 可能被換掉的詞、tier 階級說明 */
function forgeWhat(it, op, arg) {
  const out = op === 'conv' && it.a[+arg] ? [it.a[+arg]] : [];
  return {
    out,
    add: FORGE[op].add(it, arg),
    tier:
      op === 'conv'
        ? out[0]
          ? `T${out[0].T}（階不變）`
          : ''
        : op === 'ess'
          ? `至少 T${String(arg).split(':')[1]}`
          : tierSpan(it)
  };
}
function payCur(op, arg) {
  if (op === 'ess') MAT().ess[arg]--;
  else MAT()[op]--;
}
function forgeDo(it, op, arg) {
  const { why, lack } = forgeCheck(it, op, arg);
  if (why || lack) return why || lack;
  FORE = null;
  payCur(op, arg);
  FORGE[op].run(it, arg);
  sortAff(it);
  return null;
}
/* 推薦：白→蛻變；藍→增幅（滿 2 條改富豪）；黃沒滿→崇高 */
function forgeHint(it) {
  if (lockWhy(it, 'fill')) return null;
  return it.r === 0 ? 'tran' : it.r === 1 ? (it.a.length < 2 ? 'aug' : 'rich') : it.a.length < 6 ? 'exalt' : null;
}

/* ---------- 預知石（企劃書 5.3.1）：先看下一顆通貨的結果再決定用不用。
   forePeek 花 1 顆預知石、先把結果算好（不動裝備、不花那顆通貨）；foreUse 用掉那顆通貨、套用算好的結果；
   foreSkip 不用＝只消耗預知石，通貨留著。裝備被別的操作動過，預知就作廢 ---------- */
let FORE = null;
const foreOf = it => (FORE && it && FORE.id === it.id ? FORE : null);
function forePeek(it, op, arg) {
  if (MAT().fore < 1) return '預知石不夠';
  if (!FILL_OPS.includes(op)) return '預知石只能看填詞的結果';
  const { why, lack } = forgeCheck(it, op, arg);
  if (why || lack) return why || lack;
  MAT().fore--;
  const res = { ...it, a: it.a.map(a => ({ ...a, v: Array.isArray(a.v) ? a.v.slice() : a.v })) };
  FORGE[op].run(res, arg);
  sortAff(res);
  FORE = { id: it.id, op, arg, res, a0: it.a.map(a => JSON.stringify(a)), r0: it.r };
  return null;
}
function foreUse(it) {
  const f = foreOf(it);
  if (!f) return '沒有可以用的預知';
  if (it.r !== f.r0 || it.a.map(a => JSON.stringify(a)).join() !== f.a0.join())
    return (FORE = null), '裝備變過了，預知作廢';
  const { why, lack } = forgeCheck(it, f.op, f.arg);
  if (why || lack) return why || lack;
  payCur(f.op, f.arg);
  Object.assign(it, { r: f.res.r, a: f.res.a });
  FORE = null;
  return null;
}
const foreSkip = () => (FORE = null);
/* 預知看到的結果：新出現的詞（轉化後換成的詞也算） */
const foreNew = f => f.res.a.filter(a => !f.a0.includes(JSON.stringify(a)));

/* ---------- 淬鍊：階級不變，只在範圍裡重骰數值（破裂詞在 T0 的範圍裡） ---------- */
function rerollV(a) {
  a.v = rollAffT(a.k, a.T).v;
}
/* 這條在階級範圍裡的百分位（0～1；聖化後數值可能超出範圍，夾回 0～1） */
function affPct(a) {
  const [lo, hi] = tierRange(a.k, a.T),
    v = Array.isArray(a.v) ? a.v[1] : a.v;
  return hi > lo ? Math.max(0, Math.min(1, (v - lo) / (hi - lo))) : 1;
}
const perfection = it => (it.a.length ? it.a.reduce((s, a) => s + affPct(a), 0) / it.a.length : 0);
function temperDo(it, idx) {
  const single = idx != null,
    c = temperCost(it, single),
    w = lockWhy(it, 'temper');
  if (w) return w;
  if (!it.a.length) return '沒有詞可以淬鍊';
  if (single && !it.a[idx]) return '沒有這條詞';
  if (S.gold < c) return `金幣不夠（要 ${c}）`;
  FORE = null;
  S.gold -= c;
  it.tmp = (it.tmp || 0) + 1;
  if (single) rerollV(it.a[idx]);
  else for (const a of it.a) rerollV(a);
  return null;
}

/* ---------- 品質（磨刀石＝武器、護甲片＝防具，一次 +5%，最高 20%；20% 以上只有掉落） ---------- */
const qualCur = it => (baseOf(it).k === 'weapon' ? 'whet' : 'plate');
function qualCheck(it) {
  const w = lockWhy(it, 'qual');
  if (w) return { why: w };
  const k = qualCur(it);
  if ((it.q || 0) >= QUAL_CAP - 1e-9) return { k, why: '品質已經 20% 以上（再高只有掉落）' };
  return { k, why: MAT()[k] >= 1 ? null : `${CUR[k].n}不夠` };
}
function qualDo(it) {
  const { k, why } = qualCheck(it);
  if (why) return why;
  FORE = null;
  MAT()[k]--;
  it.q = Math.round(Math.min(QUAL_CAP, (it.q || 0) + QUAL_STEP) * 100) / 100;
  return null;
}

/* ---------- 聖化（企劃書 5.3.3）：每條各骰 m ∈ [0.8, 1.2]，中間多兩邊少（三個 0～1 亂數取平均）；數值可以超出階級；
   之後不能再填、淬鍊，還能腐化 ---------- */
const holyRoll = () => 0.8 + 0.4 * ((Math.random() + Math.random() + Math.random()) / 3);
const scaleV = (v, m) =>
  Array.isArray(v) ? v.map(x => Math.max(1, Math.round(x * m))) : Math.max(1, Math.round(v * m));
function holyCheck(it) {
  const w = lockWhy(it, 'holy');
  if (w) return w;
  if (!it.a.length) return '沒有詞可以聖化';
  return MAT().holy >= 1 ? null : '聖化石不夠';
}
function holyDo(it) {
  const why = holyCheck(it);
  if (why) return why;
  FORE = null;
  MAT().holy--;
  for (const a of it.a) {
    a.m = Math.round(holyRoll() * 1000) / 1000;
    a.v = scaleV(a.v, a.m);
  }
  it.holy = 1;
  return null;
}

/* ---------- 腐化（企劃書 5.3.4）：一次、純隨機、之後全部鎖定。
   結果：腐化詞 1／2 條（不占前後綴）、孔 +1（可超過部位上限 1 格）、無變化、
   爆開（腐化殘渣：黃裝換詞綴數一半的崇高石、藍裝換 1 顆富豪石） ---------- */
function corruptCheck(it) {
  const w = lockWhy(it, 'corr');
  if (w) return w;
  return MAT().corr >= 1 ? null : '腐化石不夠';
}
/* force：測試用，指定結果（'cw1'／'cw2'／'sock'／'none'／'burst'）。
   回傳 { why }，或 { res, cw?, give? }；爆開時 it.burst＝1，換到的通貨已經進材料頁（畫面端把這件拿掉） */
function corruptDo(it, force) {
  const why = corruptCheck(it);
  if (why) return { why };
  FORE = null;
  MAT().corr--;
  let res = force;
  if (!res) {
    let r = Math.random() * CORR_ROLL.reduce((a, b) => a + b[1], 0);
    res = (CORR_ROLL.find(x => (r -= x[1]) <= 0) || CORR_ROLL[3])[0];
  }
  it.cor = 1;
  const out = { res };
  if (res === 'cw1' || res === 'cw2') {
    const ks = Object.keys(CORR);
    it.cw = [];
    for (let i = 0; i < (res === 'cw1' ? 1 : 2); i++) {
      const k = ks.splice(Math.floor(Math.random() * ks.length), 1)[0],
        [lo, hi] = CORR[k].r;
      it.cw.push({ k, v: irnd(lo, hi) });
    }
    out.cw = it.cw;
  } else if (res === 'sock') it.so = (it.so || 0) + 1;
  else if (res === 'burst') {
    it.burst = 1;
    out.give = it.r === 2 ? { exalt: Math.floor(it.a.length / 2) } : it.r === 1 ? { rich: 1 } : {};
    for (const k in out.give) MAT()[k] += out.give[k];
  }
  return out;
}

/* 精髓：類別隨機，階照物品等級（跟裝備一樣） */
const rollEss = ilvl => [pick(ACLS).k, Math.min(AFF_T, bestTier(ilvl) + irnd(0, 2))];

/* ---------- 偽隨機保底（企劃書 5.4.2、設計原則第 4 節）：S.prd[key]＝這一項連續沒中的次數 n，第 n 次的機率 ＝ min(1, C × n)，
   C 照目標機率 p 解出來（長期機率剛好是 p，不會連續幾十次都沒有、也不會連中），所以「連續 prdMax(p) 次沒中，下一次必中」。
   不碰共用的掉落池：保底只放大這一項自己的機率 ---------- */
const PRDC = {};
function prdC(p) {
  const key = Math.round(p * 1e6);
  if (PRDC[key]) return PRDC[key];
  /* 長期機率 ＝ 1 ÷ 平均要幾次才中（C 越大越高，二分法解） */
  const rate = c => {
    let alive = 1,
      e = 0;
    for (let n = 1; n < 1e5 && alive > 0; n++) {
      const q = Math.min(1, c * n);
      e += n * alive * q;
      alive *= 1 - q;
    }
    return 1 / e;
  };
  let lo = 0,
    hi = p;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    rate(mid) < p ? (lo = mid) : (hi = mid);
  }
  return (PRDC[key] = (lo + hi) / 2);
}
/* 連續幾次沒中，下一次必中 */
const prdMax = p => Math.ceil(1 / prdC(p));
/* frac＝黃裝的 ★、fracB＝藍裝的 ★（各自一個計數器：共用的話黃裝常中就歸零，藍裝拿不到機率）、mem＝追憶、holy／corr＝聖化石、腐化石 */
const PRD0 = () => ({ frac: 0, fracB: 0, mem: 0, holy: 0, corr: 0 });
function prdRoll(key, p) {
  const prd = (S.prd = S.prd || PRD0()),
    n = (prd[key] || 0) + 1,
    hit = p > 0 && Math.random() < Math.min(1, prdC(p) * n);
  prd[key] = hit ? 0 : n;
  return hit;
}

/* ---------- 掉落的四樣（企劃書 5.4.2～5.4.4）：只有掉落才有，任何通貨碰不到 ---------- */
/* 破裂詞：挑 1 條換成 T0（一件最多 1 條，it.frac＝那條的詞綴 k）；每件黃裝 1.5%、藍裝 0.5%（⚠️ 暫定），星級與地圖詞的稀有度放大，偽隨機（黃、藍各自一個計數器） */
const FRAC_P = [0, 0.005, 0.015];
function makeFrac(it) {
  const i = irnd(0, it.a.length - 1);
  it.a[i] = rollAffT(it.a[i].k, 0);
  it.frac = it.a[i].k;
  return it;
}
/* 追憶詞：0～1 條，照部位分池（MEM 的 on）；force＝指定哪一條（測試用） */
function addMem(it, force) {
  it.mem = rollMem(force || pick(memPool(it)));
  return it;
}
/* 菁英 0.5%、王 2%（⚠️ 暫定；每次擊殺一次，王的 3 件裡挑 1 件有這個部位的池的），偽隨機 */
const MEM_P = [0, 0.005, 0.02];
/* 裂口生肖王保底 1 件追憶裝（取代原本「保底品質 30% 稀有裝」）：黃裝、一定有追憶 */
function memGear(o) {
  for (let i = 0; i < 200; i++) {
    const it = mkItem(pickBase(o.ilvl).id, o.ilvl, 2);
    if (memPool(it).length) return addMem(it);
  }
  return addMem(mkItem(pickBase(o.ilvl, 'weapon', 'bow').id, o.ilvl, 2));
}

/* ---------- 掉落（0.2.72，企劃書 5.4.5、5.8）：純邏輯，game.js 的 killMob 套用 ---------- */
/* 星級表：el 菁英數、cur 一般通貨（蛻變、增幅、磨刀石／護甲片各自）每張圖的量、ess 精髓機率（每隻菁英）、essB 精髓機率（王；5★ 保底 1）。
   ⚠️ 暫定：裝備件數欄（企劃書 5.4.5）跟「王必掉 3 件、菁英各 1 件」對不上，照明文規則做；精髓機率文件只寫「機率／提高／保底」 */
const STAR_DROP = [
  null,
  { el: [1, 2], cur: [1, 2], ess: 0, essB: 0 },
  { el: [2, 3], cur: [2, 3], ess: 0, essB: 0 },
  { el: [3, 4], cur: [3, 4], ess: 0.15, essB: 0.3 },
  { el: [4, 5], cur: [4, 6], ess: 0.3, essB: 0.5 },
  { el: [5, 6], cur: [6, 8], ess: 0.3, essB: 1 }
];
/* ⚠️ 暫定：菁英掉富豪石的機率（偶爾）、掉崇高石的機率（小機率）；血霧期每隻菁英掉轉化石、預知石的機率（王各保底 1）；
   階級 10 以上：菁英掉聖化石 2%、每張圖掉腐化石 5%（偽隨機保底） */
const ELITE_RICH = 0.35,
  ELITE_EXALT = 0.08,
  HUNT_ELITE = 0.3,
  HOLY_P = 0.02,
  CORR_P = 0.05,
  HIGH_T = 10;
/* 這張圖的菁英數 */
const eliteCount = star => irnd(...STAR_DROP[star].el);
/* 王出現前大概會打倒幾隻小怪：首領進度＝(小怪數＋6×菁英數)÷1.55 才滿，菁英（每隻 6 點）都打倒了的話，剩下的由小怪補 */
const mapKills = (small, el) => Math.max(Math.round(small * 0.3), Math.round((small + 6 * el) / 1.55 - 6 * el));
/* 這張圖每種一般通貨（蛻變、增幅、品質）的量，換成每隻小怪的掉落機率：預計打倒的小怪數看 mapKills */
function mapCurP(star, small, el = 0) {
  const n = Math.max(1, mapKills(small, el)),
    q = () => irnd(...STAR_DROP[star].cur) / n;
  return { tran: q(), aug: q(), qual: q() };
}
/* 一隻怪死掉掉的通貨（不含靈魂）：kind 0 小怪、1 菁英、2 王；
   o：{ ilvl, star, p＝mapCurP 的結果, qty＝地圖詞數量 %（通貨件數）, mat＝地圖詞材料 %（崇高與精髓的機率）, tier＝地圖階級,
        hunt＝血霧期（轉化石、預知石只在這裡掉）, zod＝裂口生肖王（腐化石、聖化石各保底 1） }。回傳 { cur: { 鍵: 數量 }, ess: [[類, 階]] } */
function dropCur(kind, o) {
  const cur = {},
    ess = [],
    star = o.star || 1,
    D = STAR_DROP[star],
    mat = 1 + (o.mat || 0) / 100,
    add = (k, n = 1) => (cur[k] = (cur[k] || 0) + n);
  if (kind === 0) {
    const p = o.p || mapCurP(star, 60),
      f = 1 + (o.qty || 0) / 100;
    for (const k of ['tran', 'aug']) if (Math.random() < p[k] * f) add(k);
    if (Math.random() < p.qual * f) add(Math.random() < 0.5 ? 'whet' : 'plate');
  } else if (kind === 1) {
    if (Math.random() < ELITE_RICH) add('rich');
    if (Math.random() < ELITE_EXALT * mat) add('exalt');
    if (Math.random() < D.ess * mat) ess.push(rollEss(o.ilvl));
    if (o.hunt) for (const k of ['conv', 'fore']) if (Math.random() < HUNT_ELITE) add(k);
    if ((o.tier || 0) >= HIGH_T && prdRoll('holy', HOLY_P)) add('holy');
  } else {
    add('exalt');
    if (Math.random() < Math.min(1, D.essB * mat)) ess.push(rollEss(o.ilvl));
    if (o.hunt) add('conv'), add('fore');
    if (o.zod) add('corr'), add('holy');
    else if ((o.tier || 0) >= HIGH_T && prdRoll('corr', CORR_P)) add('corr');
  }
  return { cur, ess };
}
/* 一隻菁英或王死掉掉的裝備（小怪不掉裝備）：菁英 1 件黃（地圖詞「數量」有機會多 1 件）、王 3 件，第一件保底黃；
   o：{ ilvl, star, qty＝MM('qty')、rar＝MM('rar')（黃裝比例，★ 與追憶的機率）、zod＝裂口生肖王（多 1 件保底追憶裝） }。
   ★ 與追憶：每件黃裝 1.5%、藍裝 0.5%、菁英 0.5%、王 2%（⚠️ 暫定，加權後每小時約 ★ 2.5 件、追憶 1 件），×星級（STAR_MUL）×(1＋稀有度%)，偽隨機（S.prd；黃、藍各自一個計數器） */
function dropGear(kind, o) {
  if (kind === 0) return [];
  const q = o.qty || 0,
    r = (o.rar || 0) / 100,
    sm = STAR_MUL[o.star || 1] * (1 + r),
    n = kind === 2 ? Math.round(3 * (1 + q / 100)) : 1 + (roll(q) ? 1 : 0),
    L = [];
  for (let i = 0; i < n; i++) {
    const it = dropItem(o.ilvl, (kind === 2 ? 0.8 : 0.4) + r);
    if (i === 0 && it.r < 2) Object.assign(it, mkItem(it.b, it.L, 2), { id: it.id });
    L.push(it);
  }
  for (const it of L) if (FRAC_P[it.r] && prdRoll(it.r === 2 ? 'frac' : 'fracB', FRAC_P[it.r] * sm)) makeFrac(it);
  const can = L.filter(it => memPool(it).length);
  if (can.length && prdRoll('mem', MEM_P[kind] * sm)) addMem(pick(can));
  if (kind === 2 && o.zod) L.push(memGear(o));
  /* 地圖裡掉的裝備一律未鑑定（企劃書 5.4.1）：前後綴看不到，不能裝備、不能做裝，回藏身處找撿骨師 */
  for (const it of L) it.uid = 1;
  return L;
}
/* 打怪拿材料：靈魂與通貨自動進材料頁；回傳要跳字的清單 */
function killMat(m, t, o = {}) {
  const M = MAT(),
    k = m.boss ? 2 : m.elite ? 1 : 0,
    got = [],
    D = dropCur(k, { star: 1, ilvl: tierIlvl(t), tier: t, ...o });
  M.soul += Math.round([1, 10, 100][k] * (1 + 0.2 * (t - 1)));
  for (const c in D.cur) (M[c] += D.cur[c]), got.push(`${D.cur[c]} ${CUR[c].n}`);
  for (const [cls, T] of D.ess) essAdd(cls, T), got.push(essName(essKey(cls, T)));
  return got;
}

/* ---------- 鑑定（企劃書 5.4.1）：撿骨師免費「全部鑑定」，背包、倉庫、臨時倉庫裡所有未鑑定的一次開完 ---------- */
const unidList = s => [s.inv, s.stash, s.temp].flatMap(g => (g ? g.items : [])).filter(it => it.uid);
const unidN = s => unidList(s).length;
/* 開獎的順序：越好的越晚翻（白、藍、黃，有追憶、有 ★ 的壓軸） */
const unidScore = it => it.r + (it.mem ? 4 : 0) + (it.frac ? 8 : 0);
function identifyAll(s = S) {
  const L = unidList(s).sort((a, b) => unidScore(a) - unidScore(b));
  for (const it of L) delete it.uid;
  return L;
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
/* 品質（0.2.29）：0.2.72 起花靈魂（每 +1% 花 GEM_Q_SOUL），只能升不能降；c＝一次的花費 */
function gemQCheck(g) {
  const q = g.q || 0,
    n = Math.ceil((GEM_Q_MAX - q) / gemQStep(g)),
    c = GEM_Q_SOUL * gemQStep(g);
  if (!n) return { why: '品質已滿', n: 0, c };
  return { n, c, why: MAT().soul >= c ? null : `靈魂不夠（要 ${c}）` };
}
/* all：能升多少升多少 */
function gemQUp(g, all) {
  const { n, c, why } = gemQCheck(g);
  if (why) return why;
  const k = all ? Math.min(n, Math.floor(MAT().soul / c)) : 1;
  MAT().soul -= k * c;
  g.q = Math.min(GEM_Q_MAX, (g.q || 0) + k * gemQStep(g));
  return null;
}
/* 開孔（0.2.72）：花靈魂，費用看 data.js 的 DRILL／drillCost */
function drillCheck(g) {
  const so = g.so || 0;
  if (!SKILLS[g.gem] && !AURAS[g.gem]) return { why: '只有技能與光環寶石能開孔' };
  if (so >= GEM_SO_MAX) return { why: '已經 5 孔' };
  const k = Math.max(0, so - 2),
    c = drillCost(k);
  return { k, c, why: MAT().soul >= c ? null : `靈魂不夠（要 ${c}）` };
}
function drillDo(g) {
  const { c, why } = drillCheck(g);
  if (why) return why;
  MAT().soul -= c;
  g.so = (g.so || 2) + 1;
  g.sup = [...(g.sup || []), null];
  return null;
}
