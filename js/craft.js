/* dungeonPOE · 做裝（0.2.72 重做，企劃書第 5 節）：純邏輯，不碰畫面（tools/check.js 也會載入）
   一條路：① 填（通貨，只能加）→ ② 淬鍊（金幣，重骰數值）→ ③ 聖化（聖化石）→ ④ 腐化（腐化石，全部鎖定）；
   通貨掉落、材料、靈魂升級、開孔 */
'use strict';

/* ---------- 材料（S.mat）：靈魂＋10 種通貨（data.js 的 CUR），精髓另放 S.mat.ess＝{ '類:T': 數量 } ---------- */
const newMat = () => ({ soul: 0, ...Object.fromEntries(Object.keys(CUR).map(k => [k, 0])), ess: {}, mats: {} });
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
/* 高階／完美通貨（0.4.1）這一次的最低階數（T 數字），forgeDo 裡才有值 */
let TIER_MIN = null;
function fillAff(it, cls, minT = TIER_MIN != null ? TIER_MIN : undefined) {
  const P = omenPool(it, cls),
    r1 = () => rollAff(pick(P), it.L);
  let a = r1();
  /* 預兆・貪欲：骰 2 次取階數高的（T 數字小的） */
  if (OMEN_ON && OMEN_ON.has('om_greed')) {
    const b = r1();
    if (b.T < a.T) a = b;
  }
  if (minT == null || a.T <= minT) return a;
  return rollAffT(a.k, Math.max(bestTier(it.L), minT));
}
/* ---------- 預兆（0.2.79 心魔劫，企劃書 4.2）：作用在下一顆通貨，用了就沒了；多顆要放在鼎裡（三尸鼎 2 顆、三彭鼎 3 顆）一起用 ---------- */
let OMEN_ON = null; /* 這一次通貨生效的預兆（Set），forgeDo 裡才有值 */
const EXALTS = ['exalt', 'exalt2', 'exalt3'],
  OMEN_ADD = [
    'tran',
    'aug',
    'rich',
    'exalt',
    'tran2',
    'aug2',
    'rich2',
    'exalt2',
    'tran3',
    'aug3',
    'rich3',
    'exalt3',
    'ess'
  ],
  OMEN_OPS = {
    om_joy: EXALTS,
    om_fear: EXALTS,
    om_love: EXALTS,
    om_hate: EXALTS,
    om_rage: OMEN_ADD,
    om_grief: OMEN_ADD,
    om_greed: OMEN_ADD
  };
/* 預兆限制後能加的詞：只前綴／只後綴、同類／不同類 */
function omenPool(it, cls) {
  let p = affPool(it, cls);
  const o = OMEN_ON;
  if (!o) return p;
  if (o.has('om_rage')) p = p.filter(k => AFF[k].p);
  if (o.has('om_grief')) p = p.filter(k => !AFF[k].p);
  const have = new Set(it.a.map(a => affCls(a.k)).filter(Boolean));
  if (o.has('om_love')) p = p.filter(k => have.has(affCls(k)));
  if (o.has('om_hate')) p = p.filter(k => !have.has(affCls(k)));
  return p;
}
/* 這組預兆能不能跟這顆通貨一起用（不含「詞加不加得上」，那個在 forgeDo 先在複本上試） */
function omenWhy(op, om) {
  if (!om || !om.length) return null;
  const M = MAT();
  if (new Set(om).size !== om.length) return '同一種預兆不能放兩顆';
  if (om.length > 3) return '最多同時用 3 顆預兆';
  if (om.length === 3 && !(M.v3 >= 1)) return '要三彭鼎才能同時用 3 顆預兆';
  if (om.length === 2 && !(M.v2 >= 1) && !(M.v3 >= 1)) return '要三尸鼎才能同時用 2 顆預兆';
  for (const k of om) {
    if (!(M[k] >= 1)) return CUR[k].n + '不夠';
    if (!OMEN_OPS[k].includes(op)) return `${CUR[k].n}只能用在${OMEN_OPS[k].length === 1 ? '崇高石' : '填詞的通貨'}`;
  }
  for (const [a, b] of SIN.clash) if (om.includes(a) && om.includes(b)) return `${CUR[a].n}跟${CUR[b].n}不能一起用`;
  return null;
}
/* 預兆・雙喜：兩條給你挑，選了才加上去 */
function omenPick(it, i) {
  const a = it.exOpt && it.exOpt[i];
  if (!a) return '沒有這個選項';
  it.a.push(a);
  delete it.exOpt;
  sortAff(it);
  return null;
}
const sortAff = it => it.a.sort((x, y) => AFF[y.k].p - AFF[x.k].p);
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

/* ---------- 材料（0.5.0，docs/工坊與解鎖表.md 第 4 節）：鐵、皮、靈絲，有階 T1～T6；S.mat.mats＝{ 'iron:2': n }（照精髓的寫法） ---------- */
/* 木沒有階：鍵就是 'wood'（T＝0） */
const matKey = (k, T) => (T ? k + ':' + T : k);
const matName = (k, T) => (T ? `${MATS[k].n} T${T}` : MATS[k].n);
const matOf = key => [key.split(':')[0], +key.split(':')[1] || 0];
const MATSOF = () => (MAT().mats = MAT().mats || {});
function matAdd(k, T, n = 1) {
  const m = MATSOF(),
    key = matKey(k, T);
  m[key] = (m[key] || 0) + n;
}
const matN = (k, T) => MATSOF()[matKey(k, T)] || 0;
/* 手上的材料 [[種類, 階, 數量]…]：鐵、皮、靈絲，階高的在前 */
const matList = () =>
  Object.entries(MATSOF())
    .filter(([, n]) => n > 0)
    .map(([key, n]) => [...matOf(key), n])
    .sort((a, b) => MAT_K.indexOf(a[0]) - MAT_K.indexOf(b[0]) || b[1] - a[1]);
/* 階 ↔ 物品等級：節點 Lv5 掉 T1、Lv83 掉 T6（tierIlvl 那條線三個一階）；T 階材料打出物品等級 3T−2（T1＝1、T6＝16） */
const matTier = lv => Math.max(1, Math.min(6, Math.ceil(tierIlvl(lvT(lv)) / 3)));
const matIlvl = T => Math.min(TMAX, 3 * T - 2);
const itemTier = it => Math.max(1, Math.min(6, Math.ceil(it.L / 3)));
/* 基底的系（防具）：護甲、閃避、能量護盾，混合系兩種（'armor+ev'）；武器、飾品是空字串 */
const baseSys = b => DEFK.filter(k => b.b && b.b[k]).join('+');
const SYSN = {
  armor: '護甲',
  ev: '閃避',
  es: '能量護盾',
  'armor+ev': '護甲閃避',
  'armor+es': '護甲護盾',
  'ev+es': '閃避護盾'
};
const SYS_MAT = { armor: 'iron', ev: 'hide', es: 'silk' };
const ACC_K = ['belt', 'ring', 'amulet'];
/* 基底吃哪種材料：鐵＝護甲系與所有武器、皮＝閃避系（箭袋也是 ⚠️）、靈絲＝能量護盾系與法器、混合系兩種各半；飾品鐵加金 */
function baseMat(b) {
  if (b.k === 'weapon' || ACC_K.includes(b.k)) return ['iron'];
  if (b.k === 'focus') return ['silk'];
  if (b.k === 'quiver') return ['hide'];
  const s = DEFK.filter(k => b.b[k]).map(k => SYS_MAT[k]);
  return s.length ? s : ['iron'];
}
/* 一件要幾個材料（第 5 節 ⚠️）：武器、胸甲 8，頭、手、鞋、腰、副手 5，戒指、項鍊 3；飾品另外要金 10 × 階 */
const CRAFT_N = { weapon: 8, chest: 8, ring: 3, amulet: 3 };
function craftCost(b, T) {
  const ms = baseMat(b),
    n = CRAFT_N[b.k] || 5,
    mats = {};
  for (const m of ms) mats[m] = Math.ceil(n / ms.length);
  return { mats, T, gold: ACC_K.includes(b.k) ? 10 * T : 0 };
}
/* 這一階、這個部位與系的基底固定一個：等級最高的那個（不隨機；推進才有高階裝）。o：{ sys 系, wt 武器類別, T 階 } */
function craftBase(kind, o) {
  const fit = b => b.k === kind && (kind === 'weapon' ? b.wt === (o.wt || 'sword') : !o.sys || baseSys(b) === o.sys),
    L = BASES.filter(b => fit(b) && b.lv <= matIlvl(o.T || 1));
  if (L.length) return L.reduce((a, b) => (b.lv > a.lv ? b : a));
  const all = BASES.filter(fit);
  return all.length ? all.reduce((a, b) => (b.lv < a.lv ? b : a)) : null;
}
/* 稀有度照鍛造台等級（第 5 節 ⚠️）：[等級門檻, [白, 藍, 黃] %]；黃用偽隨機保底（S.prd.craftR），長期剛好是表上的 % */
const CRAFT_RAR = [
  [16, [10, 50, 40]],
  [10, [30, 50, 20]],
  [4, [60, 30, 10]],
  [0, [70, 30, 0]]
];
const craftRarP = lv => CRAFT_RAR.find(([l]) => lv >= l)[1];
function craftRar(lv) {
  const [w, b, y] = craftRarP(lv);
  if (y && prdRoll('craftR', y / 100)) return 2;
  return Math.random() * (w + b) < w ? 0 : 1;
}
/* 材料夠不夠打 n 件：回不夠的那一句，夠就 null */
function craftLack(c, n) {
  for (const m in c.mats)
    if (matN(m, c.T) < c.mats[m] * n) return `${matName(m, c.T)}還差 ${c.mats[m] * n - matN(m, c.T)}`;
  if (S.gold < c.gold * n) return `金還差 ${c.gold * n - S.gold}`;
  return null;
}
/* 打造（第 5 節，取代商人賭裝）：扣材料，打 n 件，每件進倉庫；回 { why } 或 { items, salv }。
   基底固定（craftBase）、物品等級＝材料的階、稀有度照鍛造台等級、詞綴與品質與孔照 mkItem（跟掉落一樣）；
   自動分解規則說不留的、或倉庫滿了，當場分解（it.salv＝1，回收累計在 salv） */
function craftDo(kind, o) {
  const b = craftBase(kind, o);
  if (!b) return { why: '沒有這種基底' };
  const n = Math.max(1, Math.min(campN('batch'), o.n || 1)),
    c = craftCost(b, o.T),
    lack = craftLack(c, n);
  if (lack) return { why: lack };
  for (const m in c.mats) matAdd(m, o.T, -c.mats[m] * n);
  S.gold -= c.gold * n;
  const items = [],
    salv = salvZero();
  const ink = !!o.ink && campCan('cur:ink') && MAT().ink >= 1;
  for (let i = 0; i < n; i++) {
    const it = mkItem(b.id, matIlvl(o.T), craftRar(S.camp ? S.camp.forge : 0));
    /* 0.5.3 追憶之墨：一瓶管這一批的第一件（這個部位沒有追憶池就不扣） */
    if (ink && !i && memPool(it).length) addMem(it), MAT().ink--;
    if (!autoKeep(it) || !invPut(S.inv, it)) (it.salv = 1), salvAdd(salv, salvageDo(it));
    items.push(it);
  }
  if (typeof SES !== 'undefined' && SES) (SES.craft += n), (SES.rare += items.filter(it => it.r === 2).length);
  return { items, salv };
}
/* ---------- 分解（第 5 節）：回材料（打造費用 × 回收率，倉房升級再提高）＋靈魂（物品等級 × 2 ⚠️）＋金（舊賣價）；黃裝另回 1 顆蛻變或增幅。
   只算與加進材料頁，不碰倉庫（叫的人自己 takeOut） ---------- */
const salvRate = () => (!S.camp ? 0.5 : campCan('salv80') ? 0.8 : campCan('salv65') ? 0.65 : 0.5);
const salvZero = () => ({ mats: {}, soul: 0, gold: 0, cur: {}, n: 0 });
function salvAdd(a, v) {
  for (const k in v.mats) a.mats[k] = (a.mats[k] || 0) + v.mats[k];
  for (const k in v.cur) a.cur[k] = (a.cur[k] || 0) + v.cur[k];
  a.soul += v.soul;
  a.gold += v.gold;
  a.n += v.n;
  return a;
}
function salvValue(it) {
  const v = salvZero();
  v.n = 1;
  v.gold = sellPrice(it);
  if (it.charm) return v;
  const T = itemTier(it),
    c = craftCost(baseOf(it), T);
  for (const m in c.mats) v.mats[matKey(m, T)] = Math.max(1, Math.floor(c.mats[m] * salvRate()));
  v.soul = it.L * 2;
  if (it.r === 2) v.cur[Math.random() < 0.5 ? 'tran' : 'aug'] = 1;
  return v;
}
function salvageDo(it) {
  const v = salvValue(it),
    M = MAT();
  for (const key in v.mats) matAdd(...matOf(key), v.mats[key]);
  M.soul += v.soul;
  S.gold += v.gold;
  for (const k in v.cur) M[k] = (M[k] || 0) + v.cur[k];
  return v;
}
/* 回收寫成一句：「鐵 T2 +4、靈魂 +8、12 金」 */
const salvText = v =>
  [
    ...Object.entries(v.mats).map(([key, n]) => `${matName(...matOf(key))} +${n}`),
    v.soul ? `靈魂 +${v.soul}` : '',
    v.gold ? `${v.gold} 金` : '',
    ...Object.entries(v.cur).map(([k, n]) => `${CUR[k].n} +${n}`)
  ]
    .filter(Boolean)
    .join('、');
/* 自動分解規則（鍛造台 Lv8 照稀有度、Lv14 加詞階／追憶／▲）：S.auto2＝{ r 留稀有度 ≥ r（3＝不照稀有度留）, t 留最好的詞 T ≤ t（0＝不看）, mem 留追憶, up 留 ▲ }；回 true＝留 */
const AUTO2 = () => ({ r: 1, t: 1, mem: 1, up: 1 });
const bestT = it => (it.a && it.a.length ? Math.min(...it.a.map(a => a.T)) : 9);
function autoKeep(it) {
  if (!campCan('auto2')) return true;
  const A = S.auto2 || AUTO2();
  if (it.r >= A.r) return true;
  if (!campCan('auto2t')) return false;
  return (A.t > 0 && bestT(it) <= A.t) || (!!A.mem && !!it.mem) || (!!A.up && itemUp(it));
}

/* ---------- 營地（0.5.1，工坊與解鎖表第 3 節：兩層十座）：S.camp＝{ forge, watch, scout, house, altar, store 解鎖表六座的等級,
   wts 開了的武器類別, gen: { wood: { lv, tier 往下調幾階, pri 優先補位, acc 還沒滿 1 的產量 }, iron, hide, silk } }；表在 data.js 的 CAMP、GEN ---------- */
const newCamp = () => ({
  forge: 0,
  watch: 0,
  scout: 0,
  house: 0,
  altar: 0,
  store: 0,
  wts: ['sword'],
  gen: { wood: { lv: 1 }, iron: { lv: 1 }, hide: { lv: 0 }, silk: { lv: 0 } }
});
/* 解鎖鍵 → [設施, 第幾級]；瞭望台的表由 world.js 補完，所以第一次用到才建 */
let CAMP_KEY = null;
const campKey = k => {
  if (!CAMP_KEY) {
    CAMP_KEY = {};
    for (const b in CAMP) CAMP[b].forEach((r, i) => (r.un || []).forEach(x => (CAMP_KEY[x] = [b, i + 1])));
  }
  return CAMP_KEY[k];
};
/* 這樣東西開了沒：鍵不在表上＝不受管；'node:鍵'＝主幹第 i 個地點要瞭望台 Lv i。沒有 S.camp（tools 裡臨時湊的 S）＝全開 */
function campCan(k) {
  if (typeof S === 'undefined' || !S || !S.camp) return true;
  if (k.startsWith('node:')) {
    const n = typeof WNODE !== 'undefined' && WNODE[k.slice(5)];
    return !n || n.i == null || S.camp.watch >= n.i;
  }
  const e = campKey(k);
  return !e || (S.camp[e[0]] || 0) >= e[1];
}
/* 還沒開的一句話（M1-06）：「升祭壇到 Lv 4 才開」；開了或不受管回空字串 */
const lockTxt = k => {
  const e = !campCan(k) && campKey(k);
  return e ? `升${CAMPN[e[0]]}到 Lv ${e[1]} 才開` : '';
};
/* M1-26：角色頁鎖住的護符／神格格點了講一句「這格是什麼＋怎麼開」（同 M1-06）。神格出自弒神（裂口），跟著 line:rift 開 */
function lockSlotTxt(k) {
  if (k === 'gh') return '神格：' + (lockTxt('line:rift') || '之後開放');
  const b = S.eq.belt;
  if (b && !eqOpen(S, 'belt')) return '護符：腰帶被昇華鎖住，退點才能用';
  return b ? `護符：腰帶要有 ${+k[2] + 1} 格護符槽才開` : '護符：裝上腰帶才開';
}
/* 通貨對應的解鎖鍵：預兆一組、高階與完美照階 */
const curKey = k =>
  k.startsWith('om_') ? 'cur:om' : /^(tran|aug|rich|exalt)[23]$/.test(k) ? 'tier' + k.slice(-1) : 'cur:' + k;
const campWt = wt => ((S.camp || newCamp()).wts || ['sword']).includes(wt);
/* 數值型：batch 一次打幾件、wts 幾種武器類別、slots 技能格數、holes 每招最多幾個輔助孔、star 星級上限、pop 人口、off 離線上限（小時） */
function campN(k) {
  const C = S && S.camp;
  if (!C)
    return (
      { batch: 20, wts: 99, slots: S && S.skills ? S.skills.length : 5, holes: GEM_SO_MAX, star: 5, pop: 99, off: 12 }[
        k
      ] || 0
    );
  const f = C.forge,
    a = C.altar;
  if (k === 'batch') return f >= 16 ? 20 : f >= 9 ? 10 : f >= 5 ? 5 : f >= 2 ? 3 : 1;
  if (k === 'wts') return f < 11 ? 1 : Math.min(Object.keys(WTN).length, 2 + Math.floor((f - 11) / 2));
  if (k === 'slots') return Math.min(S.skills.length, a >= 9 ? 5 : a >= 6 ? 4 : a >= 3 ? 3 : a >= 1 ? 2 : 1);
  if (k === 'holes') return a >= 11 ? GEM_SO_MAX : a >= 8 ? 3 : a >= 5 ? 2 : a >= 2 ? 1 : 0;
  if (k === 'star') return Math.min(5, (C.scout || 0) + 1);
  if (k === 'pop') return CAMP_POP[Math.min(C.house || 0, CAMP_POP.length - 1)];
  if (k === 'off') return [1, 4, 4, 8, 8, 12][Math.min(5, C.store || 0)];
  return 0;
}
/* 下一個要解鎖的（M1-07，Q10 C）：每一類只回最近的那一個 { b 設施, lv, n 開什麼, t 一句話 }；這一類全開了回 null。
   數值型（技能格、輔助孔、武器類別）照 campN 變多的第一級；開關型照 campKey 要的等級 */
const NEXT_U = {
  slot: { n: 'slots', b: 'altar', t: '技能格' },
  hole: { n: 'holes', b: 'altar', t: '輔助孔' },
  wt: { n: 'wts', b: 'forge', t: '武器類別' },
  tree: { k: { tree: '天賦樹', jsock: '天賦樹珠寶孔' } },
  asc: { k: { asc: '昇華石碑', asc3: '第三個昇華' } },
  aura: { k: { aura: '光環欄' } },
  menu: { k: { tree: '天賦樹', asc: '昇華石碑' } },
  camp: { k: { 'mat:hide': '獵場', 'mat:silk': '絲地' } }
};
function nextUnlock(kind) {
  const u = NEXT_U[kind],
    C = S.camp || newCamp();
  let r = null;
  if (u.n) {
    const now = campN(u.n),
      lv0 = C[u.b] || 0;
    for (let lv = lv0 + 1; lv <= campMax(u.b) && !r; lv++) {
      C[u.b] = lv;
      if (campN(u.n) > now) r = { b: u.b, lv, m: campN(u.n), n: `第 ${campN(u.n)} 個${u.t}` };
    }
    C[u.b] = lv0;
  } else
    for (const k in u.k) {
      const e = campKey(k);
      if (e && (C[e[0]] || 0) < e[1] && (!r || e[1] < r.lv)) r = { b: e[0], lv: e[1], n: u.k[k] };
    }
  return r && { ...r, t: `升${CAMPN[r.b]}到 Lv ${r.lv} 開${r.n}` };
}
/* 這一格實際能插幾顆輔助（孔數照祭壇蓋上限；開孔照舊花靈魂） */
const soN = r => Math.min(r.n, campN('holes'));
const campMax = b => CAMP[b].length;
/* 下一級：{ lv, soul, wood, mats, gold, cur, un, d }；滿級回 null */
function campNext(b) {
  const lv = (S.camp || newCamp())[b] || 0,
    r = CAMP[b][lv];
  return r ? { lv: lv + 1, ...r } : null;
}
/* 一筆費用（解鎖表的一級、產生器的 n 級）的每一項：[名字, 有, 要, 鍵（soul／wood／材料鍵／gold／cur:通貨）] */
function costRows(c) {
  const M = MAT(),
    L = [];
  if (c.soul) L.push(['靈魂', M.soul, c.soul, 'soul']);
  if (c.wood) L.push(['木', matN('wood'), c.wood, 'wood']);
  for (const key in c.mats || {}) L.push([matName(...matOf(key)), matN(...matOf(key)), c.mats[key], key]);
  if (c.gold) L.push(['金', S.gold, c.gold, 'gold']);
  for (const k in c.cur || {}) L.push([CUR[k].n, M[k] || 0, c.cur[k], 'cur:' + k]);
  return L;
}
function costPay(c) {
  const M = MAT();
  M.soul -= c.soul || 0;
  if (c.wood) matAdd('wood', 0, -c.wood);
  for (const key in c.mats || {}) matAdd(...matOf(key), -c.mats[key]);
  S.gold -= c.gold || 0;
  for (const k in c.cur || {}) M[k] -= c.cur[k];
}
/* 能不能升：why＝不能升的原因（滿級）；lack＝[[名字, 有, 要, 鍵]…] 還差的 */
function campUpCheck(b) {
  const n = campNext(b);
  if (!n) return { why: '已經滿級', lack: [] };
  return { n, why: null, lack: costRows(n).filter(([, h, w]) => h < w) };
}
function campUp(b) {
  const { n, why, lack } = campUpCheck(b);
  if (why) return why;
  if (lack.length) return lack.map(([nm, h, w]) => `${nm}還差 ${w - h}`).join('、');
  costPay(n);
  S.camp[b] = n.lv;
  /* 斥候營：星級預設跟著上限 */
  if (b === 'scout') S.star = campN('star');
  sayOnce('camp:' + b + ':' + n.lv, campSay(b, n.lv));
  return null;
}
/* ---------- 解鎖一句話（M1-14，docs/production/milestones.md「M1-13 定稿」，原文照用）：每一句只在第一次達成時出現一次（S.hint.u）；
   一次升好幾件（全部升級）時排隊，一句一句出（hud.js 的 hudWarn） ---------- */
const FORGE_SAY = [
  '鍛造台 Lv1：開了「填」。蛻變石、增幅石開始掉，拿來替裝備加詞。',
  '鍛造台 Lv2：打造一次 3 件。',
  '鍛造台 Lv3：獵場出現，開始產皮；可以打造閃避系防具與箭袋。',
  '鍛造台 Lv4：富豪石開始掉，打造有機率出稀有裝。',
  '鍛造台 Lv5：打造一次 5 件；精髓開始掉。',
  '鍛造台 Lv6：開了「淬鍊」，可以重骰詞的數值。',
  '鍛造台 Lv7：崇高石開始掉。',
  '鍛造台 Lv8：絲地出現，開始產靈絲；能打能量護盾系防具與法器；自動分解開了。',
  '鍛造台 Lv9：打造一次 10 件。',
  '鍛造台 Lv10：轉化石、預知石開始掉。',
  '鍛造台 Lv11：可以選第二種武器類別。',
  '鍛造台 Lv12：聖化石開始掉，開了「聖化」。',
  '鍛造台 Lv13：破裂石開始掉。四條詞以上的稀有裝，隨機一條升到 T0 並鎖住。',
  '鍛造台 Lv14：自動分解可以照詞階、追憶與 ▲ 決定留不留。',
  '鍛造台 Lv15：腐化石開始掉，開了「腐化」。',
  '鍛造台 Lv16：打造一次 20 件。',
  '鍛造台 Lv17：追憶之墨與珠寶開始掉。打造時加一瓶墨，保證一條追憶詞。',
  '鍛造台 Lv18：高階通貨開始掉。',
  '鍛造台 Lv19：完美石開始掉。六條詞全滿的稀有裝，隨機一條升到 T0。',
  '鍛造台 Lv20：開了輔助 II 與覺醒，完美通貨開始掉。'
];
const ALTAR_SAY = {
  4: '祭壇 Lv4：天賦樹開了，照等級補發的點數已經放進去。',
  7: '祭壇 Lv7：昇華石碑開了，先開放兩個昇華可以選。',
  10: '祭壇 Lv10：天賦樹的珠寶孔開了，撿到的珠寶可以鑲進去。',
  11: '祭壇 Lv11：第三個昇華以後的內容開了，輔助孔可以開到 5 個。'
};
/* 設施升到 lv 那一句（S.camp 已經是新的等級） */
function campSay(b, lv) {
  if (b === 'forge') return FORGE_SAY[lv - 1];
  if (b === 'watch') {
    if (lv <= TRUNK.length - 1) {
      const [q, r] = wXY(TRUNK_K[lv]);
      return `瞭望台 Lv${lv}：新地點「${wName(S, q, r)}」開了（怪物 Lv ${wLv(q, r)}）。到地點清單點它就去刷。`;
    }
    const t = Object.keys(W_LINE)[lv - TRUNK.length],
      n = SPECIAL.find(x => x.t === t),
      line = CAMP.watch[lv - 1].d.split('：')[0];
    return `瞭望台 Lv${lv}：${line}開了，「${n ? wName(S, n.q, n.r) : WTYPE[t].n}」出現在地點清單，它的通貨開始掉。`;
  }
  if (b === 'scout') return `斥候營 Lv${lv}：可以選到 ${lv + 1}★。星級越高，怪越強、掉得越多。`;
  if (b === 'house') return `民房 Lv${lv}：人口 ${campN('pop')}，新居民會自己補到空的工位。`;
  if (b === 'altar') {
    if (ALTAR_SAY[lv]) return ALTAR_SAY[lv];
    if ([1, 3, 6, 9].includes(lv)) return `祭壇 Lv${lv}：開了第 ${campN('slots')} 格技能，到技能分頁挑一招。`;
    return `祭壇 Lv${lv}：每一招多 1 個輔助孔，到技能分頁插一顆輔助。${lv === 5 ? '光環欄也開了。' : ''}`;
  }
  if (b === 'store') {
    if (lv === 2) return '倉房 Lv2：分解回收的材料從 50% 提高到 65%。';
    if (lv === 4) return '倉房 Lv4：商會開了，材料和通貨可以照固定匯率互換。';
    return `倉房 Lv${lv}：離線收益最多算 ${campN('off')} 小時。${lv === 5 ? '分解回收提高到 80%。' : ''}`;
  }
  return '';
}
/* 產生器從 a 級升到 b 級跨過的里程碑：每一個里程碑一或兩句（產量／階、工位） */
function genSay(k, a, b) {
  const L = [],
    nm = GEN[k].n;
  for (let x = a + 1; x <= b; x++) {
    const p = genMs(x - 1),
      q = genMs(x),
      tier = q.tu > p.tu && k !== 'wood' ? `可以產 T${1 + q.tu} ${MATS[k].n}，上限看瞭望台。` : '';
    if (q.m > p.m || tier)
      L.push([`gen:${k}:${x}:m`, `${nm} Lv${x}：${q.m > p.m ? `產量 ×${q.m / p.m}。` : ''}${tier}`]);
    if (q.slots > p.slots && x > 1) L.push([`gen:${k}:${x}:s`, `${nm} Lv${x}：多一個工位，民房有空的人會自己補上。`]);
  }
  return L;
}
const SAY = [];
function sayOnce(key, t) {
  if (!t || typeof S === 'undefined' || !S) return;
  const u = ((S.hint = S.hint || {}).u = S.hint.u || {});
  if (u[key]) return;
  u[key] = 1;
  SAY.push(t);
  if (SAY.length === 1) sayNext();
}
function sayNext() {
  if (!SAY.length || typeof hudWarn !== 'function') return void (SAY.length = 0);
  hudWarn(SAY[0]);
  setTimeout(() => (SAY.shift(), sayNext()), 2400);
}

/* ---------- 產生器（3.7）：林場、礦場、獵場、絲地 ---------- */
const genOf = k => {
  const G_ = (S.camp.gen = S.camp.gen || newCamp().gen);
  return (G_[k] = G_[k] || { lv: 0 });
};
/* 出現了沒（獵場鍛造台 Lv3、絲地 Lv8；出現時 Lv1） */
const genOn = k => !GEN[k].show || campCan(GEN[k].show);
/* 第 L 級的里程碑：m 產量倍率、slots 工位、tu 階 +1 幾次（5 ×2、10 +1 工位、25 ×2 階+1、50 ×2 +1 工位、75 階+1、100 ×3 +1 工位，之後每 50 ×2 階+1、每 100 +1 工位） */
function genMs(L) {
  let m = (L >= 5 ? 2 : 1) * (L >= 25 ? 2 : 1) * (L >= 50 ? 2 : 1) * (L >= 100 ? 3 : 1);
  if (L >= 150) m *= 2 ** Math.floor((L - 100) / 50);
  const slots = (L >= 1 ? 1 : 0) + (L >= 10) + (L >= 50) + (L >= 100) + (L >= 200 ? Math.floor((L - 100) / 100) : 0),
    tu = (L >= 25) + (L >= 75) + (L >= 150 ? Math.floor((L - 100) / 50) : 0);
  return { m, slots, tu };
}
/* 下一個里程碑：{ at 第幾級, t 獎勵 }（「產量 ×2」「+1 工位」「階 +1」） */
function genNextMs(k) {
  const L = genOf(k).lv,
    a = genMs(L);
  for (let x = L + 1; x < L + 200; x++) {
    const b = genMs(x),
      t = [
        b.m > a.m ? `產量 ×${b.m / a.m}` : '',
        b.slots > a.slots ? '+1 工位' : '',
        b.tu > a.tu && k !== 'wood' ? '階 +1' : ''
      ].filter(Boolean);
    if (t.length) return { at: x, t: t.join('、') };
  }
  return null;
}
/* 材料階的上限＝瞭望台開到最深的主幹地點（3.2） */
const tierCap = () => matTier(TRUNK[Math.min(S.camp.watch || 0, TRUNK.length - 1)].lv);
/* 這座現在產幾階：min(1＋階里程碑, 上限) − 往下調；林場沒有階（0） */
const genTierTop = k => (k === 'wood' ? 0 : Math.min(1 + genMs(genOf(k).lv).tu, tierCap()));
const genTier = k => (k === 'wood' ? 0 : Math.max(1, genTierTop(k) - (genOf(k).tier || 0)));
const genSlots = k => (genOn(k) ? genMs(Math.max(1, genOf(k).lv)).slots : 0);
/* 民房的人口自動補到空工位（3.4）：已經在做的留著（S.camp.gen[k].w），多出來的人補到空工位——有「優先」的先、再照離滿員最近的、再照設施順序；
   人口比在職的少（舊存檔、工具）就從後面的設施先撤。回 { 鍵: 在職人數 } */
function popAssign() {
  const w = {};
  let used = 0;
  for (const k of GEN_K) used += w[k] = Math.min(genOf(k).w || 0, genSlots(k));
  let free = campN('pop') - used;
  for (let i = GEN_K.length - 1; free < 0 && i >= 0; i--) {
    const d = Math.min(w[GEN_K[i]], -free);
    w[GEN_K[i]] -= d;
    free += d;
  }
  while (free > 0) {
    const open = GEN_K.filter(k => w[k] < genSlots(k));
    if (!open.length) break;
    open.sort((a, b) => !!genOf(b).pri - !!genOf(a).pri || genSlots(a) - w[a] - (genSlots(b) - w[b]));
    w[open[0]]++;
    free--;
  }
  for (const k of GEN_K) genOf(k).w = w[k];
  return w;
}
/* 每分鐘產多少：r × L × 里程碑倍率 × 在職／工位（0 人不產） */
function genRate(k, W = popAssign()) {
  const g = genOf(k),
    s = genSlots(k);
  return s ? GEN[k].r * g.lv * genMs(g.lv).m * (W[k] / s) : 0;
}
/* 升 n 級的費用 { wood, mats }：c × 1.12^L × (1.12^n − 1) / 0.12，每一項四捨五入（林場 Lv1→2＝木 11） */
function genCost(k, n = 1) {
  const L = genOf(k).lv,
    f = (GEN_MUL ** L * (GEN_MUL ** n - 1)) / (GEN_MUL - 1),
    c = { mats: {} };
  for (const m in GEN[k].c) {
    const v = Math.round(GEN[k].c[m] * f);
    if (m === 'wood') c.wood = v;
    else c.mats[matKey(m, genTier(k))] = v;
  }
  return c;
}
/* 買得起幾級（等比級數反算，每一項取最少） */
function genAfford(k) {
  const L = genOf(k).lv;
  let n = Infinity;
  for (const m in GEN[k].c) {
    const have = m === 'wood' ? matN('wood') : matN(m, genTier(k)),
      a = (have * (GEN_MUL - 1)) / (GEN[k].c[m] * GEN_MUL ** L);
    n = Math.min(n, Math.floor(Math.log(1 + a) / Math.log(GEN_MUL) + 1e-9));
  }
  /* 進位誤差：反算出來的 n 級真的付不起就少一級 */
  while (n > 0 && costRows(genCost(k, n)).some(([, h, w]) => h < w)) n--;
  return Math.max(0, n);
}
function genUp(k, n = 1) {
  if (!genOn(k)) return '還沒出現';
  const c = genCost(k, n),
    lack = costRows(c).filter(([, h, w]) => h < w);
  if (lack.length) return lack.map(([nm, h, w]) => `${nm}還差 ${w - h}`).join('、');
  costPay(c);
  genOf(k).lv += n;
  for (const [key, t] of genSay(k, genOf(k).lv - n, genOf(k).lv)) sayOnce(key, t);
  return null;
}
/* 每一格累加產量（主迴圈叫，藏身處、場地、面板開著都算；離線用同一條公式乘時間）；回這一次加了多少 { 材料鍵: n } */
function genTick(dt) {
  if (typeof S === 'undefined' || !S || !S.camp) return {};
  const W = popAssign(),
    got = {};
  for (const k of GEN_K) {
    if (!genOn(k)) continue;
    const g = genOf(k);
    if (!g.lv) g.lv = 1;
    g.acc = (g.acc || 0) + (genRate(k, W) * dt) / 60;
    const n = Math.floor(g.acc);
    if (n > 0) {
      g.acc -= n;
      /* 這一座總共產了多少（0.5.4，卡片上的「總共產了 N」） */
      g.tot = (g.tot || 0) + n;
      const key = matKey(k, genTier(k));
      matAdd(...matOf(key), n);
      got[key] = (got[key] || 0) + n;
    }
  }
  return got;
}
/* 每分鐘的材料進帳 { 材料鍵: n }（「還要幾分鐘」用） */
function genRates() {
  const W = popAssign(),
    o = {};
  for (const k of GEN_K)
    if (genOn(k)) {
      const key = matKey(k, genTier(k));
      o[key] = (o[key] || 0) + genRate(k, W);
    }
  return o;
}
/* 靈魂每分鐘：本次掛機最近 5 分鐘的平均（SES.sm 每 10 秒記一筆 [時間, 累計靈魂]，數字不每秒亂跳）；
   取樣不到 1 分鐘時（0.5.4，考核 F1）先用本次掛機拿到的 ÷ 經過的時間估（掛了 10 秒以上才算）；沒在掛回 0 */
function soulRate() {
  const ses = typeof SES !== 'undefined' && SES,
    L = ses && ses.sm;
  if (!ses) return 0;
  if (L && L.length >= 2 && L[L.length - 1][0] - L[0][0] >= 60e3) {
    const a = L[0],
      b = L[L.length - 1];
    return ((b[1] - a[1]) / (b[0] - a[0])) * 60000;
  }
  const m = (Date.now() - ses.t0) / 60000;
  return m >= 1 / 6 ? ses.soul / m : 0;
}
/* 一筆費用還要幾分鐘：只算最慢的那一項；回 { m 分鐘（算不出來 Infinity，夠了 0）, nm 最慢那一項, d 缺多少 } */
function costEta(c) {
  const R = genRates(),
    sr = soulRate();
  let out = { m: 0, nm: '', d: 0 };
  for (const [nm, h, w, key] of costRows(c)) {
    if (h >= w) continue;
    const rate = key === 'soul' ? sr : R[key] || 0,
      m = rate > 0 ? (w - h) / rate : Infinity;
    if (m >= out.m) out = { m, nm, d: Math.ceil(w - h) };
  }
  return out;
}
const campEta = b => {
  const n = campNext(b);
  return n ? costEta(n) : null;
};
/* 營地裡現在買得起幾件（分頁列的小點、掛機卡那一行） */
const campReady = () =>
  Object.keys(CAMP).filter(b => {
    const c = campUpCheck(b);
    return !c.why && !c.lack.length;
  }).length + GEN_K.filter(k => genOn(k) && genAfford(k) > 0).length;
/* 全部升級（離線回來的卡）：只買產生器，最便宜的先，一次一級；回買了幾級 */
function genAll() {
  let n = 0;
  for (;;) {
    const L = GEN_K.filter(k => genOn(k) && genAfford(k) > 0);
    if (!L.length || n > 2000) return n;
    genUp(L.reduce((a, b) => (genCost(a).wood <= genCost(b).wood ? a : b)));
    n++;
  }
}

/* ---------- 填（企劃書 5.3.1）：通貨按鈕。ok(it, arg) 回傳 null＝可以、字串＝不行的原因；run(it, arg) 真的做。
   arg：精髓是 '類:T'，轉化石是要換的那條詞在 it.a 的位置 ---------- */
/* 這件現在不能動的原因（kind：'fill' 填、'temper' 淬鍊、'qual' 品質、'holy' 聖化、'corr' 腐化） */
function lockWhy(it, kind) {
  if (it.charm) return '這個不能做裝';
  if (it.uid) return '還沒鑑定：先找撿骨師';
  if (it.exOpt) return '先從雙喜的兩條詞選一條';
  if (it.cor) return '已腐化，全部鎖定';
  if (it.holy && kind === 'fill') return '已聖化，不能再填';
  if (it.holy && kind === 'temper') return '已聖化，不能再淬鍊';
  if (it.holy && kind === 'holy') return '已經聖化過了';
  return null;
}
/* 加 1 條詞的共同檢查：atR 是加完之後的稀有度（算前後綴上限）、cls 限定類別 */
const addWhy = (it, atR, cls) =>
  affPool({ ...it, r: atR }, cls).length ? null : cls ? '這一類沒有詞可加，或前後綴已滿' : '前後綴已滿，沒有詞可加';
const toYellow = it => {
  it.r = 2;
};
const FORGE = {
  tran: {
    n: '蛻變石',
    d: '將普通物品升級為魔法物品，並新增 1 條隨機詞綴',
    ok: it => (it.r ? '只有普通物品能用蛻變石' : addWhy(it, 1)),
    add: it => affPool({ ...it, r: 1 }),
    run(it) {
      it.r = 1;
      it.a.push(fillAff(it));
    }
  },
  aug: {
    n: '增幅石',
    d: '為魔法物品新增 1 條隨機詞綴（魔法物品最多 2 條）',
    ok: it => (it.r !== 1 ? '只有魔法物品能用增幅石' : it.a.length >= 2 ? '魔法物品最多 2 條詞綴' : addWhy(it, 1)),
    add: it => affPool(it),
    run(it) {
      it.a.push(fillAff(it));
    }
  },
  rich: {
    n: '富豪石',
    d: '將魔法物品升級為稀有物品，並新增 1 條隨機詞綴',
    ok: it => (it.r !== 1 ? '只有魔法物品能用富豪石' : addWhy(it, 2)),
    add: it => affPool({ ...it, r: 2 }),
    run(it) {
      toYellow(it);
      it.a.push(fillAff(it));
    }
  },
  exalt: {
    n: '崇高石',
    d: '為稀有物品新增 1 條隨機詞綴（前綴、後綴各最多 3 條）',
    ok: it => (it.r !== 2 ? '只有稀有物品能用崇高石' : it.a.length >= 6 ? '詞綴已滿（6 條）' : addWhy(it, 2)),
    add: it => affPool(it),
    run(it) {
      it.a.push(fillAff(it));
    }
  },
  /* 精髓：藍裝用＝增幅、黃裝用＝崇高，但保證那一類、而且至少那一階 */
  ess: {
    n: '精髓',
    d: '為魔法或稀有物品新增 1 條該精髓類別的詞綴，至少是精髓的階級',
    ok(it, arg) {
      const [cls] = String(arg || '').split(':');
      if (!ACLSI[cls]) return '先選一種精髓';
      if (!it.r) return '普通物品要先用蛻變石';
      if (it.r === 1 && it.a.length >= 2) return '魔法物品最多 2 條詞綴';
      if (it.a.length >= 6) return '詞綴已滿（6 條）';
      return addWhy(it, it.r, cls);
    },
    add: (it, arg) => affPool(it, String(arg).split(':')[0]),
    run(it, arg) {
      const [cls, T] = arg.split(':');
      it.a.push(fillAff(it, cls, +T));
    }
  },
  /* 0.5.3 破裂石（工坊與解鎖表第 6 節）：黃裝、四條以上、還沒有破裂詞：隨機一條升到 T0、變成破裂 ★（it.frac；轉化、淬鍊、聖化都不碰它） */
  frac: {
    n: '破裂石',
    d: CUR.frac.d,
    ok: it =>
      it.r !== 2 ? '只有稀有物品能用破裂石' : it.a.length < 4 ? '要四條以上詞綴' : it.frac ? '已經有破裂詞了' : null,
    add: () => [],
    run(it) {
      const i = irnd(0, it.a.length - 1);
      it.a[i] = rollAffT(it.a[i].k, 0);
      it.frac = it.a[i].k;
    }
  },
  /* 0.5.3 完美石：黃裝、六條全滿：隨機一條沒破裂的升到 T0（a.perf，不鎖、不算破裂）；一件一次（it.perfed） */
  perf: {
    n: '完美石',
    d: CUR.perf.d,
    ok: it =>
      it.r !== 2
        ? '只有稀有物品能用完美石'
        : it.a.length < 6
          ? '要六條詞綴全滿'
          : it.perfed
            ? '這件已經用過完美石了'
            : it.a.some(a => !isFrac(it, a) && a.T > 0)
              ? null
              : '沒有可以升的詞',
    add: () => [],
    run(it) {
      const L = it.a.filter(a => !isFrac(it, a) && a.T > 0),
        a = pick(L),
        b = rollAffT(a.k, 0);
      b.perf = 1;
      it.a.splice(it.a.indexOf(a), 1, b);
      it.perfed = 1;
    }
  },
  /* 轉化石：1 條指定的詞換成同類的另一條，階不變、數值重骰；不能選破裂詞 */
  conv: {
    n: '轉化石',
    d: '將指定的 1 條詞綴換成同類的另一條隨機詞綴，階級不變；破裂詞綴不能選',
    ok(it, arg) {
      const a = it.a[+arg];
      if (!a) return '先選一條要換的詞';
      if (isFrac(it, a)) return '破裂詞不能轉化';
      if (!affCls(a.k)) return '這條沒有類別';
      return convPool(it, a).length ? null : '這一類沒有別的詞可換，或前後綴已滿';
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
/* 這顆通貨在材料頁的數量（精髓看選的那一種） */
const curHave = (op, arg) => (op === 'ess' ? (MAT().ess || {})[arg] || 0 : MAT()[op] || 0);
const curName = (op, arg) => (op === 'ess' ? (arg ? essName(arg) : '精髓') : CUR[op].n);
/* 這一步能不能做：why＝這件裝備不能這樣做的原因，lack＝通貨不夠（預覽照樣可以看） */
/* 通貨分三階（0.4.1，企劃書 5.3、5.8）：高階、完美照原本那顆的規則，只是新詞有最低階數：
   高階＝這件能出的最高階（bestTier）或下一階各一半，完美＝保證最高階；T0 仍然只有破裂 ★ */
const CUR_TIER = { 2: '高階', 3: '完美' };
for (const k of ['tran', 'aug', 'rich', 'exalt'])
  for (const g of [2, 3]) {
    const B = FORGE[k];
    FORGE[k + g] = {
      ...B,
      n: CUR[k + g].n,
      d: CUR[k + g].d,
      run(it, arg) {
        TIER_MIN = bestTier(it.L) + (g === 3 ? 0 : irnd(0, 1));
        try {
          B.run(it, arg);
        } finally {
          TIER_MIN = null;
        }
      }
    };
  }
const FILL_OPS = Object.keys(FORGE);
const rareCur = k => EXALTS.includes(k) || /^(tran|aug|rich)[23]$/.test(k) || ['frac', 'perf', 'ink'].includes(k);
/* 掉落（0.4.1，⚠️ 暫定）：每掉 1 顆蛻變、增幅、富豪、崇高，Lv45 以上的節點另外 10% 掉同種的高階；
   Lv70 以上 1% 掉完美（保底：連續 TIER_P.pity 次沒掉，下一次必掉，S.prd.perfC） */
const TIER_P = { g: 0.1, gLv: 45, p: 0.01, pLv: 70, pity: 300 };
function tierDrop(cur, lv) {
  for (const k of ['tran', 'aug', 'rich', 'exalt'])
    for (let i = 0; i < (cur[k] || 0); i++) {
      if (lv >= TIER_P.gLv && Math.random() < TIER_P.g) cur[k + '2'] = (cur[k + '2'] || 0) + 1;
      if (lv < TIER_P.pLv) continue;
      const P = (S.prd = S.prd || PRD0()),
        n = (P.perfC || 0) + 1;
      if (n >= TIER_P.pity || Math.random() < TIER_P.p) (cur[k + '3'] = (cur[k + '3'] || 0) + 1), (P.perfC = 0);
      else P.perfC = n;
    }
}
function forgeCheck(it, op, arg, om) {
  /* 預兆・畏縮：先移除 1 條再加，所以 6 條滿的黃裝也能用崇高石 */
  const full = om && om.includes('om_fear') && EXALTS.includes(op) && it.r === 2 && it.a.length >= 6;
  return {
    why: lockWhy(it, 'fill') || (full ? null : FORGE[op].ok(it, arg)) || omenWhy(op, om),
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
        : op === 'frac' || op === 'perf'
          ? 'T0'
          : op === 'ess'
            ? `至少 T${String(arg).split(':')[1]}`
            : /3$/.test(op)
              ? `T${bestTier(it.L)}`
              : /2$/.test(op)
                ? `T${bestTier(it.L)}～T${bestTier(it.L) + 1}`
                : tierSpan(it)
  };
}
function payCur(op, arg) {
  if (op === 'ess') MAT().ess[arg]--;
  else MAT()[op]--;
}
function forgeDo(it, op, arg, om) {
  const { why, lack } = forgeCheck(it, op, arg, om);
  if (why || lack) return why || lack;
  if (om && om.length) {
    /* 先在複本上做：預兆的條件下沒有詞可以加，就什麼都不扣 */
    const c = JSON.parse(JSON.stringify(it));
    OMEN_ON = new Set(om);
    try {
      if (OMEN_ON.has('om_fear')) {
        const L = c.a.filter(a => !isFrac(c, a));
        if (!L.length) return '沒有可移除的詞：破裂詞不會被移除';
        c.a.splice(c.a.indexOf(pick(L)), 1);
      }
      if (
        !omenPool(
          { ...c, r: /^tran/.test(op) ? 1 : /^rich/.test(op) ? 2 : c.r },
          op === 'ess' ? String(arg).split(':')[0] : undefined
        ).length
      )
        return '預兆的條件下沒有詞可以加';
      FORGE[op].run(c, arg);
      if (OMEN_ON.has('om_joy')) {
        const a1 = c.a.pop(),
          P = omenPool(c).filter(k => k !== a1.k);
        if (P.length) {
          let a2 = rollAff(pick(P), c.L);
          if (OMEN_ON.has('om_greed')) {
            const b = rollAff(pick(P), c.L);
            if (b.T < a2.T) a2 = b;
          }
          c.exOpt = [a1, a2];
        } else c.a.push(a1);
      }
    } finally {
      OMEN_ON = null;
    }
    FORE = null;
    payCur(op, arg);
    const M = MAT();
    for (const k of om) M[k]--;
    if (om.length === 2) M[M.v2 >= 1 ? 'v2' : 'v3']--;
    if (om.length === 3) M.v3--;
    /* 沒動到的詞放回原本那個物件（鍛造台的紀錄靠物件比對「加了哪條」） */
    const old = it.a.slice();
    c.a = c.a.map(x => {
      const i = old.findIndex(o => o.k === x.k && JSON.stringify(o) === JSON.stringify(x));
      return i < 0 ? x : old.splice(i, 1)[0];
    });
    Object.assign(it, c);
    if (!c.exOpt) delete it.exOpt;
    sortAff(it);
    return null;
  }
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
  if (S.gold < c) return `金不夠（要 ${c}）`;
  FORE = null;
  S.gold -= c;
  it.tmp = (it.tmp || 0) + 1;
  if (single && isFrac(it, it.a[idx])) return '破裂詞鎖住了，不能淬鍊';
  if (single) rerollV(it.a[idx]);
  else for (const a of it.a) if (!isFrac(it, a)) rerollV(a);
  return null;
}

/* ---------- 品質（磨刀石＝武器、護甲片＝防具，一次 +5%，最高 20%；20% 以上只有掉落） ---------- */
const qualCur = it => (baseOf(it).k === 'weapon' ? 'whet' : 'plate');
function qualCheck(it) {
  const w = lockWhy(it, 'qual');
  if (w) return { why: w };
  const k = qualCur(it);
  if ((it.q || 0) >= QUAL_CAP - 1e-9) return { k, why: '品質已達 20%，更高只能靠掉落' };
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
    if (isFrac(it, a)) continue;
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
/* force：測試用，指定結果（'cw1'／'sock'／'none'／'burst'；0.2.77 起最多 1 條腐化詞，舊存檔的 2 條照舊保留）。
   回傳 { why }，或 { res, cw?, give? }；爆開時 it.burst＝1，換到的通貨已經進材料頁（畫面端把這件拿掉） */
function corruptDo(it, force) {
  const why = corruptCheck(it);
  if (why) return { why };
  FORE = null;
  MAT().corr--;
  let res = force;
  if (!res) {
    let r = Math.random() * CORR_ROLL.reduce((a, b) => a + b[1], 0);
    res = (CORR_ROLL.find(x => (r -= x[1]) <= 0) || ['none'])[0];
  }
  it.cor = 1;
  const out = { res };
  if (res === 'cw1') {
    const k = pick(Object.keys(CORR)),
      [lo, hi] = CORR[k].r;
    it.cw = [{ k, v: irnd(lo, hi) }];
    out.cw = it.cw;
  } else if (res === 'sock') it.so = (it.so || 0) + 1;
  else if (res === 'burst') {
    it.burst = 1;
    out.give = it.r === 2 ? { exalt: Math.floor(it.a.length / 2) } : it.r === 1 ? { rich: 1 } : {};
    for (const k in out.give) MAT()[k] += out.give[k];
  }
  return out;
}

/* ---------- 災魘（0.2.78 酆都，企劃書 4.2）：只用在已腐化、還沒有災魘詞的裝備。
   成功（CALAM_OK）→ 三選一（每個選項一組有利＋有害，同一組 g 的不配在一起；完美災魘石沒有有害），選項先存在 it.calOpt，
   選了才寫進 it.cal（關掉面板再打開還在）；失敗 → 裝備毀掉（it.burst），勾判官筆的話改成沒有變化。判官筆勾了就用掉 ---------- */
function calamCheck(it, perf) {
  if (it.charm) return '這個不能做裝';
  if (it.uid) return '還沒鑑定：先找撿骨師';
  if (!it.cor) return '要先腐化';
  if (it.cal) return '已經有災魘詞了';
  if (it.calOpt) return '先從三個選項選一個';
  return MAT()[perf ? 'pcalam' : 'calam'] >= 1 ? null : (perf ? '完美災魘石' : '災魘石') + '不夠';
}
/* 一個選項：有利一條，有害一條（跟有利不同組）；perf 沒有有害 */
function calamRoll(perf, no = []) {
  const gk = pick(Object.keys(CALAM_G).filter(k => !no.includes(k))),
    G = CALAM_G[gk],
    roll = r => irnd(r[0], r[1]),
    o = { g: { k: gk, v: roll(G.r) }, b: null };
  if (!perf) {
    const bk = pick(Object.keys(CALAM_B).filter(k => CALAM_B[k].g !== G.g));
    o.b = { k: bk, v: roll(CALAM_B[bk].r) };
  }
  return o;
}
/* force：測試用（'ok'／'fail'）。回傳 { why } 或 { res: 'ok', opts }／{ res: 'fail' }／{ res: 'saved' } */
function calamDo(it, perf, usePen, force) {
  const why = calamCheck(it, perf) || (usePen && !(MAT().pen >= 1) ? '判官筆不夠' : null);
  if (why) return { why };
  FORE = null;
  MAT()[perf ? 'pcalam' : 'calam']--;
  if (usePen) MAT().pen--;
  const ok = force ? force === 'ok' : Math.random() < CALAM_OK;
  if (!ok) {
    if (usePen) return { res: 'saved' };
    it.burst = 1;
    return { res: 'fail' };
  }
  const opts = [];
  for (let i = 0; i < CALAM_OPT; i++)
    opts.push(
      calamRoll(
        perf,
        opts.map(o => o.g.k)
      )
    );
  it.calOpt = opts;
  return { res: 'ok', opts };
}
function calamPick(it, i) {
  const o = it.calOpt && it.calOpt[i];
  if (!o) return '沒有這個選項';
  it.cal = o;
  delete it.calOpt;
  return null;
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
const PRD0 = () => ({
  frac: 0,
  fracB: 0,
  craftR: 0 /* 0.5.0 打造的黃裝保底 */,
  fracO1: 0,
  fracO2: 0,
  perfO1: 0,
  perfO2: 0,
  ink2: 0,
  jw0: 0,
  jw1: 0,
  jw2: 0 /* 0.5.3 破裂石、完美石、追憶之墨、珠寶的保底（後面的數字：0 小怪、1 菁英、2 王） */,
  mem: 0,
  holy: 0,
  corr: 0,
  awk: 0,
  fore: 0,
  pen: 0,
  book: 0,
  perf: 0,
  perfC: 0,
  holy7: 0,
  v3: 0,
  heart: 0,
  eye: 0
});
function prdRoll(key, p) {
  const prd = (S.prd = S.prd || PRD0()),
    n = (prd[key] || 0) + 1,
    hit = p > 0 && Math.random() < Math.min(1, prdC(p) * n);
  prd[key] = hit ? 0 : n;
  return hit;
}

/* ---------- 追憶詞（企劃書 5.4.3）：0～1 條，照部位分池（MEM 的 on）；force＝指定哪一條（測試用）。
   0.5.0 起裝備不再掉落，★ 的自然掉落（makeFrac）與追憶裝的保底（memGear）拿掉；追憶由 12-4 的追憶之墨在打造時加 ---------- */
function addMem(it, force) {
  it.mem = rollMem(force || pick(memPool(it)));
  return it;
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
/* ⚠️ 暫定：菁英掉富豪石的機率（偶爾）、掉崇高石的機率（小機率）；裂口的每隻菁英掉轉化石的機率（生肖王保底 1，0.4.2 起只有裂口掉）；
   階級 10 以上：菁英掉聖化石 2%、每張圖掉腐化石 5%（偽隨機保底） */
/* 0.5.3（第 4、6 節，⚠️ 暫定）：破裂石 菁英 0.5%、王 2%；完美石一半；追憶之墨 王 3%（陰兵借道的將領保底）；珠寶 小怪 0.05%、菁英 0.5%、王 2%。
   一小時約 25 輪（一輪 2.5 分鐘、菁英 1～2）→ 破裂石約每 1.5 小時一顆、完美石約每 3 小時、墨約每 1.3 小時、珠寶約每小時一顆；都用偽隨機（S.prd 的 fracO／perfO／ink／jw＋0 小怪／1 菁英／2 王） */
const NEW_P = { frac: [0, 0.005, 0.02], perf: [0, 0.0025, 0.01], ink: [0, 0, 0.03], jw: [0.0005, 0.005, 0.02] };
/* M2-18 追逐掉落（M2-17 數值設計師 v1.0，交辦 docs/交辦/M2-18-追逐掉落.md）：平機率；輪末王 +5 點判 b、菁英判 e 沒中 +1 點（每輪前 ec 隻）；
   點數到 cap 的輪末王必掉（菁英不觸發必掉）；掉到任何一件點數歸零；地點怪物等級 lv 以上才判定也才累計；沒拿過的優先。存檔 S.chase＝{ pts, got: { 鍵: 件數 } } */
const CHASE = { b: 0.014, e: 0.0014, cap: 500, ptB: 5, ptE: 1, lv: 45, ec: 4 };
/* 有感保底：連續 K＝max(3, floor(FEEL_TG ÷ 最近 10 輪平均秒數)) 隻輪末王沒有有感掉落（破裂石、完美石、追憶之墨、珠寶、追逐物品）→ 輪流給 1 件 */
const FEEL_TG = 1500;
/* 池（M2-19.9）：主幹 4 王印、賽制線各 2 個異寶基底；名字只從字串表 STR_T（data.js）讀。⚠️ 用法與固定詞數值待定：現在只收起來、看得到詳情、帶追逐標記 */
const CHASE_POOL = { trunk: Object.keys(STR_T.wangyin) };
for (const l of ['ghost', 'dream', 'fiend', 'army', 'rift']) CHASE_POOL[l] = [l + '1', l + '2'];
const isWy = k => !!STR_T.wangyin[k];
const chaseName = k => STR_T.wangyin[k] || STR_T.base[k];
const chasePool = k => Object.keys(CHASE_POOL).find(p => CHASE_POOL[p].includes(k));
const chaseOf = (s = S) => (s.chase = s.chase || { pts: 0, got: {} });
const chaseN = (s = S) => Object.values(chaseOf(s).got).reduce((a, n) => a + n, 0);
/* 保底 %（數值設計師第 5 點）：min(100, floor(點數 ÷ 5))，滿了也寫 100% */
const chasePct = (s = S) => Math.min(100, Math.floor(chaseOf(s).pts / 5));
/* 掛機卡那一行（製作人第 2 點）：只有會觸發保底的地點（怪物 Lv45 以上）才有，其他地點空字串、不留空位 */
const chaseLine = t => (t && mobLv(t) >= CHASE.lv ? `下一件保底 ${chasePct()}%` : '');
/* 收集進度（第 3 點）：「王印 2／4」、「鬼門關基底 1／2」 */
function chaseProg(k) {
  const p = chasePool(k),
    L = CHASE_POOL[p];
  return `${isWy(k) ? '王印' : WTYPE[p].n + '基底'} ${L.filter(x => chaseOf().got[x]).length}／${L.length}`;
}
const chaseBanner = k => `${chaseName(k)}・${chaseProg(k)}`;
/* 離線摘要（第 8 點）：n＝這次離開掉了幾件、後面是現在的保底 % */
const chaseOffRow = n => `追逐物品 ×${n}、目前保底 ${chasePct()}%`;
/* 材料的名字（第 9 點）：字串表有階級名就用（生鐵、熟鐵…），沒有照「鐵 T3」 */
const matTN = key => STR_T.mat[key] || matName(...matOf(key));
/* kind 1 菁英（o.ei＝這一輪第幾隻）、2 輪末王；回掉到的鍵或 null */
function chaseRoll(kind, t, o = {}) {
  if (mobLv(t) < CHASE.lv) return null;
  const C = chaseOf();
  if (kind === 1) {
    if ((o.ei || 0) > CHASE.ec) return null;
    if (Math.random() < CHASE.e) return chaseGive(t);
    C.pts += CHASE.ptE;
    return null;
  }
  C.pts += CHASE.ptB;
  return C.pts >= CHASE.cap || Math.random() < CHASE.b ? chaseGive(t) : null;
}
/* pk：哪一個池（開發觸發用）；沒給照現在的地點（主幹王印、賽制線那條線的基底） */
function chaseGive(t, pk) {
  const C = chaseOf(),
    cur = typeof WNODE !== 'undefined' && S.world && WNODE[S.world.cur],
    pool = CHASE_POOL[pk || (cur && CHASE_POOL[cur.t] && cur.t) || 'trunk'],
    fresh = pool.filter(k => !C.got[k]),
    k = pick(fresh.length ? fresh : pool);
  C.got[k] = (C.got[k] || 0) + 1;
  C.pts = 0;
  chasePut(k, t);
  return k;
}
/* 收起來（製作人第 1 點）：王印進「通貨與碎片」的碎片頁（S.frags）；異寶基底是倉庫裡一件普通裝備（這個地點的物品等級、隨機基底），
   帶追逐標記 it.chase、鎖住（批量分解不會分掉），倉庫滿了照樣收（INV_SPARE） */
function chasePut(k, t) {
  if (isWy(k)) return (S.frags = S.frags || {}), (S.frags[k] = (S.frags[k] || 0) + 1), null;
  const L = tierIlvl(t),
    it = mkItem(pickBase(L).id, L, 0);
  it.chase = k;
  it.lock = 1;
  if (S.inv) invPut(S.inv, it);
  return it;
}
/* 套上王印（第 4 點）：⚠️ 用法與固定詞數值待定，現在只扣一個王印、記在物品上（it.wy），物品帶上追逐標記（原本有的不動） */
function wangyinSet(it, k) {
  if (!isWy(k) || !((S.frags || {})[k] > 0)) return '沒有這個王印';
  S.frags[k]--;
  it.wy = k;
  it.chase = it.chase || k;
  return '';
}
/* 最近 10 輪的平均秒數（沒有紀錄當 150 秒） */
const roundSec = () => {
  const R = (typeof S !== 'undefined' && S.rounds) || [];
  return R.length ? R.reduce((a, r) => a + r.d, 0) / R.length : 150;
};
const feelK = () => Math.max(3, Math.floor(FEEL_TG / roundSec()));
/* 輪流給（珠寶→破裂石→追憶之墨，跳過沒開的）；鍛造台 13–16（破裂石開了、墨與珠寶還沒）不給破裂石，改給材料包。回跳字清單（got.rare＝要演光柱的通貨） */
function feelGive(t) {
  const P = (S.prd = S.prd || PRD0()),
    L = ['jewel', 'frac', 'ink'],
    got = [];
  got.rare = [];
  for (let i = 0; i < 3; i++) {
    const j = ((P.feelI || 0) + i) % 3,
      k = L[j];
    if (!campCan(k === 'jewel' ? k : 'cur:' + k)) continue;
    P.feelI = j + 1;
    P.feel = 0;
    if (k === 'jewel') got.push(...jwAdd(1));
    else if (k === 'frac' && !campCan('cur:ink')) {
      /* 材料包（12:45 (a)；第 6、7、9 點）：戰鬥不掉材料（產生器產），給產生器照現在的階 5 分鐘的產量；got.pack＝{ 材料鍵: 數量 }。⚠️ 量待確認 */
      const R = genRates(),
        pk = {};
      for (const key in R) {
        const n = Math.round(R[key] * 300);
        if (n > 0) matAdd(...matOf(key), n), (pk[key] = n);
      }
      got.push(...Object.entries(pk).map(([key, n]) => `${n} ${matTN(key)}`));
      got.pack = pk;
    } else MAT()[k]++, got.push(`1 ${CUR[k].n}`), got.rare.push(k);
    return got;
  }
  return got;
}
const ELITE_RICH = 0.35,
  ELITE_EXALT = 0.03 /* 0.5.0：8% → 3%，鍛造台 Lv7 才開始掉 */,
  HUNT_ELITE = 0.3,
  HOLY_P = 0.02,
  CORR_P = 0.05,
  AWK_P = 0.03,
  /* 0.2.77：預知石改成全域低機率（菁英 0.1%、王 0.5%，偽隨機，地圖詞「材料」放大）：約每 30 張圖 90 隻菁英 → 每小時 0.24 顆＝每 4 小時 1 顆。⚠️ 暫定 */
  FORE_E = 0.001,
  FORE_B = 0.005,
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
        hunt＝裂口那一場（0.4.2；轉化石只在這裡掉；預知石 0.2.77 起全域低機率）, zod＝裂口生肖王（腐化石、聖化石各保底 1） }。回傳 { cur: { 鍵: 數量 }, ess: [[類, 階]] } */
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
    if (o.hunt && Math.random() < HUNT_ELITE) add('conv');
    if (prdRoll('fore', FORE_E * mat)) add('fore');
    if ((o.tier || 0) >= HIGH_T && prdRoll('holy', HOLY_P)) add('holy');
  } else {
    add('exalt');
    if (Math.random() < Math.min(1, D.essB * mat)) ess.push(rollEss(o.ilvl));
    if (o.hunt) add('conv');
    if (prdRoll('fore', FORE_B * mat)) add('fore');
    /* 0.2.82：裂口生肖王不再保底腐化石、聖化石、覺醒石（各自搬到酆都、心魔劫、燭龍），改掉神血（tsDrop）；階級 10 以上的王照舊 */
    if ((o.tier || 0) >= HIGH_T && prdRoll('corr', CORR_P)) add('corr');
    /* 覺醒石（0.2.75，企劃書 5.7）：階級 10 以上的王 3%（偽隨機，跟腐化石各自一個計數器）。⚠️ 暫定 */
    if ((o.tier || 0) >= HIGH_T && prdRoll('awk', AWK_P)) add('awk');
  }
  if (o.tier) tierDrop(cur, mobLv(o.tier));
  /* 0.5.3：破裂石、完美石、追憶之墨（下面照鍛造台等級濾掉沒開的） */
  /* 機率 0 的不擲；小怪、菁英、王各一個計數器（共用的話小怪會把王的機率墊高） */
  if (NEW_P.frac[kind] && prdRoll('fracO' + kind, NEW_P.frac[kind] * mat)) add('frac');
  if (NEW_P.perf[kind] && prdRoll('perfO' + kind, NEW_P.perf[kind] * mat)) add('perf');
  if (NEW_P.ink[kind] && prdRoll('ink' + kind, NEW_P.ink[kind])) add('ink');
  /* 0.5.0：通貨照鍛造台等級開關（工坊與解鎖表第 4 節）；沒開的不掉 */
  for (const k in cur) if (!campCan(curKey(k))) delete cur[k];
  /* 0.5.3 珠寶全域（鍛造台 Lv17）：任何節點低機率，一個大點 */
  const jw = campCan('jewel') && prdRoll('jw' + kind, NEW_P.jw[kind]);
  return { cur, ess: campCan('cur:ess') ? ess : [], jw };
}
/* 酆都的王額外掉的（0.2.78，企劃書 4.2）：k＝王的 fd（ox／horse／black／white／yama／uber）。直接進材料頁與碎片分頁，回傳要跳字的清單 */
function fdDrop(k, s = S) {
  const M = MAT(),
    F = (s.frags = { ...newFrags(), ...s.frags }),
    got = [],
    cur = (c, n = 1) => ((M[c] += n), got.push(`${n} ${CUR[c].n}`)),
    frag = c => (F[c]++, got.push(FRAGS[c].n));
  if (FENG.elites.includes(k)) frag(k), cur('corr');
  else if (k === 'yama') {
    cur('calam');
    if (prdRoll('pen', FENG.pen)) cur('pen');
    if (prdRoll('book', FENG.book)) frag('book');
  } else if (k === 'uber') {
    cur('calam', 2);
    cur('pen');
    if (prdRoll('perf', FENG.perf)) cur('pcalam');
  }
  return got;
}
/* 心魔劫的王額外掉的（0.2.79）：k＝王的 sin（七情、up／mid／low 三尸、peng 三彭） */
function sinDrop(k, s = S) {
  const M = MAT(),
    F = (s.frags = { ...newFrags(), ...s.frags }),
    got = [],
    cur = (c, n = 1) => ((M[c] += n), got.push(`${n} ${CUR[c].n}`));
  if (SIN.emo.includes(k)) {
    cur('om_' + k);
    F[k]++, got.push(SIN_FRAG[k].n);
    if (prdRoll('holy7', SIN.holy)) cur('holy');
  } else if (k === 'peng') {
    cur('v2');
    if (prdRoll('v3', SIN.v3)) cur('v3');
  } else cur('v2');
  return got;
}
/* 覺醒輔助（0.2.80）：拿到一顆＝沒有就解鎖（S.lib.sup 記 1）、有了 +1 級；已經 Lv5 以上換成靈魂（那顆 Lv5 升級的量） */
const awHave = (k, s = S) => !!(s.lib && s.lib.sup && s.lib.sup[k]);
function awGain(k, s = S) {
  const L = (s.lib.sup = s.lib.sup || {}),
    lv = L[k] || 0;
  if (lv >= AW_MAX) {
    const n = soulCost(lv);
    MAT().soul += n;
    return `${SUPPORTS[k].n}已滿級：換 ${n} 靈魂`;
  }
  L[k] = lv + 1;
  return lv ? `${SUPPORTS[k].n} 升到 Lv ${lv + 1}` : `解鎖 ${SUPPORTS[k].n}`;
}
const AW_KEYS = () => Object.keys(SUPPORTS).filter(k => SUPPORTS[k].aw);
/* 燭龍之心：Lv5 的覺醒輔助突破到 Lv6 */
function heartWhy(k, s = S) {
  if (!SUPPORTS[k] || !SUPPORTS[k].aw) return '只能用在覺醒輔助';
  if ((s.lib.sup || {})[k] !== AW_MAX) return `要先升到 Lv${AW_MAX}`;
  return MAT().heart >= 1 ? null : '燭龍之心不夠';
}
function heartUse(k, s = S) {
  const why = heartWhy(k, s);
  if (why) return why;
  MAT().heart--;
  s.lib.sup[k] = AW_MAX + 1;
  return null;
}
/* 四凶與燭龍的王額外掉的（0.2.80）：k＝王的 xi（四凶、zhulong 燭龍、zhu9 燭九陰） */
function xiDrop(k, s = S) {
  const M = MAT(),
    F = (s.frags = { ...newFrags(), ...s.frags }),
    got = [],
    aw = () => got.push(awGain(pick(AW_KEYS()), s));
  if (XIONG.includes(k)) {
    aw();
    F[k]++, got.push(FRAGS[k].n);
  } else if (k === 'zhulong') {
    (M.awk += 1), got.push('1 ' + CUR.awk.n);
    if (prdRoll('heart', XI.heart)) (M.heart += 1), got.push('1 ' + CUR.heart.n);
    if (prdRoll('eye', XI.eye)) F.eye++, got.push(FRAGS.eye.n);
  } else if (k === 'zhu9') {
    (M.heart += 1), got.push('1 ' + CUR.heart.n);
    aw(), aw();
  }
  return got;
}
/* 陰兵借道的將領（0.2.81）：掉自己的將印；同一塊區塊打倒第三位將領時怨恨值 ≥ ARMY.fu 掉兵符（一塊只掉一次）。追憶裝在 killMob（armyGear） */
/* 亡靈珠寶（0.2.84）：蚩尤 1 個大點、涿鹿兵主 2 個（樹上現有的一般大點隨機抽、不重複）；直接進收藏 S.jewels（最多 JEWEL.keep 個，滿了換靈魂） */
function jwRoll(n) {
  const L = [...PT_NOTABLES],
    nt = [];
  while (nt.length < n) nt.push(...L.splice(irnd(0, L.length - 1), 1));
  return { id: Math.random().toString(36).slice(2, 9), nt };
}
const jwGain = (k, s = S) => jwAdd(JEWEL.nt[k], s);
/* 收一顆 n 個大點的珠寶（0.5.3 全域掉落是 1 個） */
function jwAdd(n, s = S) {
  const L = (s.jewels = s.jewels || []);
  if (L.length >= JEWEL.keep) return (MAT().soul += 500), ['珠寶收藏滿了：換 500 靈魂'];
  const j = jwRoll(n);
  L.push(j);
  return [jwName(j)];
}
/* 拆掉不要的珠寶：換靈魂（鑲著的不能拆） */
function jwSalvage(id, s = S) {
  if ((s.jsock || []).includes(id)) return '鑲著的不能拆：先拔下來';
  const i = (s.jewels || []).findIndex(j => j.id === id);
  if (i < 0) return '沒有這顆珠寶';
  s.jewels.splice(i, 1);
  MAT().soul += 200;
  return null;
}
/* 鑲上／拔下：一顆珠寶只能在一個孔；孔沒開也能先放（鎖住、不生效） */
function jwPut(i, id, s = S) {
  const J = (s.jsock = s.jsock || [null, null, null, null, null, null]);
  if (id && !jwOf(s, id)) return '沒有這顆珠寶';
  for (let k = 0; k < 6; k++) if (J[k] === id) J[k] = null;
  J[i] = id || null;
  return null;
}
function armyDrop(k, ck, res, s = S) {
  if (k === 'chiyou' || k === 'zhuolu') return jwGain(k, s);
  if (!ARMY.gen.includes(k)) return [];
  const F = (s.frags = { ...newFrags(), ...s.frags }),
    got = [];
  F[k]++, got.push(FRAGS[k].n);
  /* 0.5.3：將領保底一瓶追憶之墨（鍛造台 Lv17 才開） */
  if (campCan('cur:ink')) (MAT().ink = (MAT().ink || 0) + 1), got.push('1 ' + CUR.ink.n);
  if (ck) {
    const A = armyOf(s, ck);
    if (!A.g.includes(k)) A.g.push(k);
    if (A.g.length >= ARMY.gen.length && res >= ARMY.fu && !A.fu) (A.fu = 1), F.fu++, got.push(FRAGS.fu.n);
  }
  return got;
}

/* 弒神（0.2.82）：裂口生肖王掉 1 份神血；太歲、太歲星君掉 1 個神格（直接進收藏 S.gods，最多 TAISUI.keep 個，滿了換靈魂） */
function ghRoll(uber, ilvl = 80) {
  const [a, b] = uber ? TAISUI.pU : TAISUI.p,
    k = pick(GH_AFF);
  return {
    g: pick(GODSON)[0],
    p: irnd(a, b),
    a: [{ ...rollAff(k, ilvl), k }],
    id: Math.random().toString(36).slice(2, 9)
  };
}
function tsDrop(k, s = S, ilvl) {
  const F = (s.frags = { ...newFrags(), ...s.frags }),
    got = [];
  if (k === 'zod') return F.blood++, [FRAGS.blood.n];
  if (k !== 'taisui' && k !== 'xingjun') return got;
  const g = ghRoll(k === 'xingjun', ilvl),
    L = (s.gods = s.gods || []);
  if (L.length >= TAISUI.keep) (MAT().soul += 500), got.push('神格收藏滿了：換 500 靈魂');
  else L.push(g), got.push(ghName(g));
  return got;
}
const ghName = g => `神格・${GODSON.find(x => x[0] === g.g)[1]} ${g.p}%`;
/* 拆掉不要的神格：換靈魂（裝著的不能拆） */
function ghSalvage(i, s = S) {
  if (i === s.godOn) return '裝著的不能拆';
  if (!(s.gods || [])[i]) return '沒有這個神格';
  s.gods.splice(i, 1);
  if (s.godOn != null && s.godOn > i) s.godOn--;
  MAT().soul += 200;
  return null;
}

/* 打怪拿材料：靈魂、通貨、精髓自動進材料頁（0.5.1 起不掉材料，材料由產生器產）；回傳要跳字的清單 */
function killMat(m, t, o = {}) {
  const M = MAT(),
    k = m.boss && !m.mini ? 2 : m.elite || m.mini ? 1 : 0,
    got = [],
    D = dropCur(k, { star: 1, ilvl: tierIlvl(t), tier: t, ...o });
  const soul = Math.round([1, 10, 100][k] * (1 + 0.2 * (t - 1)));
  M.soul += soul;
  if (typeof SES !== 'undefined' && SES) SES.soul += soul;
  for (const c in D.cur) (M[c] += D.cur[c]), got.push(`${D.cur[c]} ${CUR[c].n}`);
  for (const [cls, T] of D.ess) essAdd(cls, T), got.push(essName(essKey(cls, T)));
  if (D.jw) got.push(...jwAdd(1));
  /* 稀有通貨（0.4.1）：崇高石各階、高階與完美通貨，地圖上另外演一次（game.js 的 rareShow） */
  got.rare = Object.keys(D.cur).filter(rareCur);
  /* M2-18 追逐掉落與有感保底 */
  const ch = k && chaseRoll(k, t, o),
    P = (S.prd = S.prd || PRD0());
  if (ch) got.push(chaseName(ch)), (got.chase = ch);
  if (ch || D.jw || D.cur.frac || D.cur.perf || D.cur.ink) P.feel = 0;
  else if (k === 2 && (P.feel = (P.feel || 0) + 1) >= feelK()) {
    const f = feelGive(t);
    got.push(...f);
    got.rare.push(...f.rare);
    got.feel = f.length ? f : null;
  }
  return got;
}

/* 一輪的掉落（0.4.1，離線結算與 tools/loot_check.js 共用）：nS 隻小怪、nE 隻菁英、1 隻王，走真的掉落函式（通貨、精髓、靈魂直接進材料頁）；
   回這一輪的靈魂。o＝地圖詞的 qty／rar／mat（沒有就是 0） */
function roundLoot(t, star, nS, nE, o = {}) {
  const od = { star, p: mapCurP(star, nS, nE), ilvl: tierIlvl(t), tier: t, ...o },
    s0 = MAT().soul;
  for (let i = 0; i < nS; i++) killMat({}, t, od);
  for (let i = 0; i < nE; i++) killMat({ elite: 1 }, t, { ...od, ei: i + 1 });
  killMat({ boss: 1 }, t, od);
  return MAT().soul - s0;
}
/* ---------- 鑑定：0.4.0 起掉下來就是鑑定好的（企劃書 5.4.1）；只剩舊存檔轉換用，翻牌演出 0.4.1 搬到回來時的摘要 ---------- */
const unidList = s => s.inv.items.filter(it => it.uid);
const unidN = s => unidList(s).length;
/* 開獎的順序：越好的越晚翻（白、藍、黃，有追憶、有 ★ 的壓軸） */
const unidScore = it => it.r + (it.mem ? 4 : 0) + (it.mem2 ? 2 : 0) + (it.frac ? 8 : 0);
function identifyAll(s = S) {
  const L = unidList(s).sort((a, b) => unidScore(a) - unidScore(b));
  for (const it of L) delete it.uid;
  return L;
}

/* ---------- 目錄：靈魂升級、開孔（0.2.75，企劃書 6.2）：技能與光環的等級記在 S.lib，換招不用重練；一般輔助 0.4.8 起沒有等級 ---------- */
function libUpCheck(k) {
  if (SUPPORTS[k]) return { c: 0, why: SUPPORTS[k].aw ? '覺醒輔助要再撿到同一顆才會升級' : '輔助沒有等級' };
  const lv = libLv(k),
    c = soulCost(lv);
  if (lv >= gemCap(S.lv)) return { c, why: lv >= GEM_MAX ? '已經滿級' : `Lv ${lv + 1} 要角色 Lv ${gemReq(lv + 1)}` };
  if (MAT().soul < c) return { c, why: `靈魂不夠（要 ${c}）` };
  return { c, why: null };
}
function libUp(k) {
  const { c, why } = libUpCheck(k);
  if (why) return why;
  MAT().soul -= c;
  (S.lib[libKind(k)] = S.lib[libKind(k)] || {})[k] = libLv(k) + 1;
  return null;
}
/* 輔助 II（0.4.8，企劃書 6.5）：花 SUP2_COST 靈魂解鎖一次，之後每個孔自由選 I 或 II；k 是 II 的鍵 */
function sup2Check(k) {
  const U = SUPPORTS[k];
  if (!U || U.tier !== 2) return { c: 0, why: '只有 II 要解鎖' };
  if (!sup2Lock(k)) return { c: 0, why: '已經解鎖' };
  if (!campCan('sup2')) return { c: 0, why: '鍛造台 Lv20 才開' };
  return { c: SUP2_COST, why: MAT().soul >= SUP2_COST ? null : `靈魂不夠（要 ${SUP2_COST}）` };
}
function sup2Unlock(k) {
  const { c, why } = sup2Check(k);
  if (why) return why;
  MAT().soul -= c;
  (S.lib.sup2 = S.lib.sup2 || {})[SUPPORTS[k].base] = 1;
  return null;
}
/* 開孔（0.2.72）：花靈魂，費用看 data.js 的 DRILL／drillCost；r 是技能格或光環欄的項目 { k, so, n } */
function drillCheck(r) {
  if (r.n >= GEM_SO_MAX) return { why: '已經 5 孔' };
  const k = r.n - 2,
    c = drillCost(k);
  return { k, c, why: MAT().soul >= c ? null : `靈魂不夠（要 ${c}）` };
}
function drillDo(r) {
  const { c, why } = drillCheck(r);
  if (why) return why;
  MAT().soul -= c;
  r.n++;
  r.so.push(null);
  return null;
}
/* ---------- 覺醒（0.2.75，企劃書 6.3）：花 1 顆覺醒石選 A（原版增強）或 B（變化），記在目錄 S.lib.aw[技能鍵]；之後免費切換、不能拆掉 ---------- */
function awakeCheck(k, which) {
  if (!AWK[k] || !AWK[k][which]) return which === 'B' ? '變化版製作中' : '這招不能覺醒';
  if (awOf(k) === which) return '已經是這個覺醒';
  if (!awOf(k) && MAT().awk < 1) return '要 1 顆覺醒石';
  return '';
}
function awakeDo(k, which) {
  const why = awakeCheck(k, which);
  if (why) return why;
  if (!awOf(k)) MAT().awk--;
  (S.lib.aw = S.lib.aw || {})[k] = which;
  return null;
}
