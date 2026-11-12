/* dungeonPOE · 世界地圖的純邏輯（企劃書第 4 節；畫面在 wmap.js）：固定的節點表、路、等級、星級、血霧、裂口。
   0.4.0 起所有人同一張地圖：一條主幹（劇情 9 個＋13 個）照等級排，五個主線特殊節點掛在旁邊，到等級才開。
   節點鍵是六角格座標 'q,r'（wmap.js 照它畫）。check.js 也載入。 */
'use strict';

const wKey = (q, r) => q + ',' + r;
const wXY = k => k.split(',').map(Number);
const wRing = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
const W_CAP = 83;
const W_SEED = 20261112; /* 0.4.0：所有人同一個種子（地形細節） */

/* 劇情區：固定節點，照順序打，不選星級（card 是固定的卡）。talk：第一次選到時播的對話 */
const STORY = [
  { q: 0, r: 0, n: '地層出口', lv: 5, d: '離開地層後的第一站', card: { star: 1, mods: [] }, talk: 'st_0' },
  { q: 0, r: 1, n: '枯河渡口', lv: 6, d: '地圖詞與星級', card: { star: 1, mods: ['dmg1'] }, talk: 'st_1' },
  { q: -1, r: 2, n: '破曉哨站', lv: 8, d: '破曉軍團的據點', card: { star: 1, mods: ['pack'] }, talk: 'st_2' },
  {
    q: 0,
    r: 2,
    n: '廢棄礦道',
    lv: 9,
    d: '地圖詞與風險',
    card: { star: 2, mods: ['hp1', 'dmg1', 'pack', 'arm'] },
    talk: 'st_3'
  },
  { q: 1, r: 1, n: '鴉衛的記號', lv: 11, d: '主線的方向', card: { star: 1, mods: ['spd1'] }, talk: 'st_4' },
  { q: 1, r: 2, n: '天星商隊', lv: 13, d: '商人與賣裝', card: { star: 1, mods: ['elite'] }, talk: 'st_5' },
  {
    q: 2,
    r: 1,
    n: '燒毀的村莊',
    lv: 14,
    d: '昇華',
    card: { star: 2, mods: ['fire', 'hp1', 'res1', 'acc'] },
    talk: 'st_6'
  },
  {
    q: 3,
    r: 0,
    n: '血霧山道',
    lv: 16,
    d: '狩獵之血',
    card: { star: 2, mods: ['bleed', 'hp1', 'dmg1', 'spd1'] },
    talk: 'st_7'
  },
  {
    q: 3,
    r: -1,
    n: '裂谷斷崖',
    lv: 18,
    d: '打倒這裡的王，世界就會展開',
    card: { star: 2, mods: ['boss', 'hp1', 'dmg1', 'pack'] },
    talk: 'st_8'
  }
];
const STORY_END = STORY.length - 1;
/* 主幹的後段（0.4.0）：Lv23 起每個 +5 到 Lv83；x、y 是世界地圖上的位置（像素，wmap.js 的 wmLat），換成最近的六角格。
   繞一圈經過五種地貌：中原 → 東邊熔岩 → 北邊冰原 → 西邊血原 → 南邊沼澤；g＝區域名 */
const hexOf = (x, y) => {
  const q = Math.round(x / 54);
  return [q, Math.round(y / (36 * Math.sqrt(3)) - q / 2)];
};
const TRUNK2 = [
  ['焦土坡', 480, 80, '灰燼平原'],
  ['斷碑原', 820, 200, '灰燼平原'],
  ['熔谷入口', 1180, 120, '熔岩裂谷'],
  ['赤脊', 1380, -320, '熔岩裂谷'],
  ['凍河口', 1060, -1060, '寒鴉冰原'],
  ['雪埋古道', 420, -1300, '寒鴉冰原'],
  ['冰封神殿', -300, -1260, '寒鴉冰原'],
  ['血原邊境', -1220, -280, '血霧荒原'],
  ['白骨丘', -1360, 240, '血霧荒原'],
  ['腐沼渡', -820, 1020, '黑水沼澤'],
  ['沉城', -200, 1260, '黑水沼澤'],
  ['毒霧林', 80, 1620, '黑水沼澤'],
  ['裂口腹地', 0, 2000, '裂口腹地']
];
/* 主幹：劇情 9 個＋後段 13 個，照順序；i 是第幾個 */
const TRUNK = [
  ...STORY.map(s => ({ q: s.q, r: s.r, n: s.n, lv: s.lv, t: 'story', g: '枯河原野' })),
  ...TRUNK2.map(([n, x, y, g], i) => {
    const [q, r] = hexOf(x, y);
    return { q, r, n, lv: 23 + i * 5, t: 'plain', g };
  })
];
/* 主線特殊節點：掛在主幹第 at 個旁邊（dx、dy 像素），角色到 need 級才開；lock＝0.4.2 才開放 */
const SPECIAL = [
  { t: 'ghost', at: 11, dx: 60, dy: 300, need: 35 },
  { t: 'dream', at: 13, dx: 330, dy: -100, need: 45 },
  { t: 'fiend', at: 15, dx: -40, dy: -330, need: 55 },
  { t: 'army', at: 17, dx: -330, dy: 120, need: 65, lock: 1 },
  { t: 'rift', at: 19, dx: 300, dy: 120, need: 75, lock: 1 }
].map(o => {
  const T = TRUNK[o.at],
    [q, r] = hexOf(54 * T.q + o.dx, 36 * Math.sqrt(3) * (T.r + T.q / 2) + o.dy);
  return { ...o, q, r, lv: Math.min(W_CAP, Math.max(T.lv, o.need)), g: T.g };
});
const WNODE = Object.fromEntries([
  ...TRUNK.map((n, i) => [wKey(n.q, n.r), { ...n, i }]),
  ...SPECIAL.map(n => [wKey(n.q, n.r), n])
]);
const STORY_I = Object.fromEntries(STORY.map((s, i) => [wKey(s.q, s.r), i]));
const TRUNK_K = TRUNK.map(n => wKey(n.q, n.r));
const wNode = (seed, q, r) => !!WNODE[wKey(q, r)];
/* 相鄰：主幹前後一個；特殊節點接它掛的那個 */
function wNear(seed, q, r) {
  const n = WNODE[wKey(q, r)];
  if (!n) return [];
  const L = [];
  if (n.i != null) {
    if (n.i > 0) L.push(TRUNK[n.i - 1]);
    if (n.i < TRUNK.length - 1) L.push(TRUNK[n.i + 1]);
    for (const s of SPECIAL) if (s.at === n.i) L.push(s);
  } else L.push(TRUNK[n.at]);
  return L.map(o => [o.q, o.r]);
}

/* 節點類型：名字、地圖上的顏色、一句話 */
const WTYPE = {
  story: { n: '主線', c: '#ffd166', d: '' },
  plain: { n: '荒野', c: '#a7a294', d: '一般地圖' },
  blood: { n: '血霧之地', c: '#ff5a5f', d: '打倒這裡的王後累積血霧' },
  rift: { n: '裂口', c: '#ff8a4c', d: '血霧滿了才能進入，王是墮落的生肖神' },
  /* 0.2.78 酆都（企劃書 4.2） */
  ghost: { n: '鬼門關', c: '#7fd1c7', d: '每一輪的王是牛頭、馬面、黑無常、白無常其中之一，打倒後掉落勾魂令與腐化石' },
  /* 0.2.79 心魔劫（企劃書 4.2） */
  dream: { n: '心魔幻境', c: '#e08ad0', d: '每一輪都有一隻七情王，打倒後掉落預兆與碎片' },
  /* 0.2.80 四凶 */
  fiend: { n: '凶地', c: '#e3a14a', d: '每一輪隨機一隻凶當王，整張圖帶牠的專屬地圖詞' },
  army: { n: '陰兵借道', c: '#8fb3a0', d: '連續刷累積怨恨值，怪物更強、獎勵更好' }
};

function wHash(seed, q, r, s) {
  let n =
    Math.imul(q | 0, 374761393) ^
    Math.imul(r | 0, 668265263) ^
    Math.imul(s | 0, 1442695041) ^
    Math.imul(seed | 0, 2654435761);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n = Math.imul(n ^ (n >>> 15), 2246822519);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
/* 怨恨值（陰兵借道，存檔 S.army＝{ 鍵: { n 怨恨值, g 打倒的將領 } }；0.4.2 改成連刷層數） */
const armyOf = (s, ck) => ((s.army = s.army || {})[ck] = s.army[ck] || { n: 0, g: [] });
const armyRes = (s, ck) => ((s.army || {})[ck] || { n: 0 }).n;
/* 裂口（wmap.js 畫深谷用）：節點鍵 → 生肖 */
const wRifts = () => Object.fromEntries(SPECIAL.filter(s => s.t === 'rift').map(s => [wKey(s.q, s.r), 0]));
const wType = (s, q, r) => (WNODE[wKey(q, r)] || {}).t || 'plain';
/* 裂口的王：十二生肖照順序，打過的跳過 */
const wZod = s => ZODIAC.find(z => !s.idols.includes(z.z)) || ZODIAC[0];
const wLv = (q, r) => (WNODE[wKey(q, r)] || { lv: W_CAP }).lv;
const wRegion = k => (WNODE[k] || TRUNK[0]).g;
function wName(s, q, r) {
  const n = WNODE[wKey(q, r)];
  if (!n) return '';
  if (n.t === 'rift') return wZod(s).n + '的裂口';
  return n.n || WTYPE[n.t].n;
}

/* ---------- 弒神的王（0.2.82，山海寶盒）：太歲＝十二神像全亮＋4 份神血；太歲星君＝12 份神血＋Lv70 ---------- */
function tsHallWhy(s, kind) {
  const b = (s.frags || {}).blood || 0;
  if (kind === 'taisui') {
    if ((s.idols || []).length < ZODIAC.length) return `先點亮十二神像（${(s.idols || []).length}／${ZODIAC.length}）`;
    return b < TAISUI.blood ? `神血 ${b}／${TAISUI.blood}` : '';
  }
  if (b < TAISUI.uber) return `神血 ${b}／${TAISUI.uber}`;
  return s.lv < TAISUI.uberLv ? `角色等級需達 ${TAISUI.uberLv}` : '';
}
function tsHallPay(s, kind) {
  const w = tsHallWhy(s, kind);
  if (w) return w;
  s.frags.blood -= kind === 'taisui' ? TAISUI.blood : TAISUI.uber;
  return '';
}
/* ---------- 陰兵借道的王（0.2.81，山海寶盒）：蚩尤＝三種將印各 1；涿鹿兵主＝兵符＋Lv70 ---------- */
function armyHallWhy(s, kind) {
  const F = s.frags || {};
  if (kind === 'chiyou') {
    const miss = ARMY.gen.filter(k => !(F[k] >= 1)).map(k => FRAGS[k].n);
    return miss.length ? '還缺' + miss.join('、') : '';
  }
  if (!(F.fu >= 1)) return '還缺兵符';
  return s.lv < ARMY.uberLv ? `角色等級需達 ${ARMY.uberLv}` : '';
}
function armyHallPay(s, kind) {
  const w = armyHallWhy(s, kind);
  if (w) return w;
  if (kind === 'chiyou') for (const k of ARMY.gen) s.frags[k]--;
  else s.frags.fu--;
  return '';
}
/* ---------- 酆都的殿（0.2.78）：鬼門節點可以改進閻羅殿（勾魂令 5 張，哪隻的都算）或十殿閻羅（四種各 1 張＋生死簿、角色 Lv70） ---------- */
const fdHun = s => FENG.elites.reduce((a, k) => a + ((s.frags || {})[k] || 0), 0);
function fdHallWhy(s, kind) {
  const F = s.frags || {};
  if (kind === 'yama') return fdHun(s) >= FENG.hun ? null : `勾魂令 ${fdHun(s)}／${FENG.hun}`;
  if (kind === 'uber') {
    const miss = FENG.elites.filter(k => !(F[k] >= 1)).map(k => FRAGS[k].n.split('・')[1]);
    if (miss.length) return '還缺勾魂令：' + miss.join('、');
    if (!(F.book >= 1)) return '還缺生死簿：打倒閻羅取得';
    if (s.lv < FENG.uberLv) return `角色等級需達 ${FENG.uberLv}`;
    return null;
  }
  return '沒有這個殿';
}
/* 付門票：閻羅殿從張數最多的勾魂令開始扣 */
function fdHallPay(s, kind) {
  const why = fdHallWhy(s, kind);
  if (why) return why;
  const F = s.frags;
  if (kind === 'uber') {
    for (const k of FENG.elites) F[k]--;
    F.book--;
  } else
    for (let n = FENG.hun; n > 0; n--) {
      const k = FENG.elites.reduce((a, b) => (F[b] > F[a] ? b : a));
      F[k]--;
    }
  return null;
}

/* ---------- 心魔（0.2.79）：心魔幻境的節點可以花碎片進三尸（任 3 種各 1 片）或三彭（7 種各 1 片＋Lv70）；sel＝帶哪幾種（每片帶一個減益） ---------- */
function sinHallWhy(s, kind, sel) {
  const F = s.frags || {},
    L = kind === 'sanpeng' ? SIN.emo : sel || [];
  if (kind === 'sanpeng' && s.lv < SIN.uberLv) return `角色等級需達 ${SIN.uberLv}`;
  if (kind === 'sanshi' && new Set(L).size < SIN.need) return `至少選 ${SIN.need} 種碎片`;
  const miss = L.filter(k => !(F[k] >= 1));
  return miss.length ? '還缺碎片：' + miss.map(k => SIN_FRAG[k].n).join('、') : null;
}
function sinHallPay(s, kind, sel) {
  const why = sinHallWhy(s, kind, sel);
  if (why) return why;
  const L = kind === 'sanpeng' ? SIN.emo : [...new Set(sel)];
  for (const k of L) s.frags[k]--;
  s.sinDeb = L;
  return null;
}

/* ---------- 四凶（0.2.80）：山海寶盒開燭龍（四凶之鱗各 1 片）、燭九陰（再加燭龍之目、Lv70） ---------- */
function xiHallWhy(s, kind) {
  const F = s.frags || {},
    miss = XIONG.filter(k => !(F[k] >= 1)).map(k => FRAGS[k].n);
  if (miss.length) return '還缺' + miss.join('、');
  if (kind === 'zhu9') {
    if (!(F.eye >= 1)) return '還缺燭龍之目：打倒燭龍取得';
    if (s.lv < XI.uberLv) return `角色等級需達 ${XI.uberLv}`;
  }
  return null;
}
function xiHallPay(s, kind) {
  const why = xiHallWhy(s, kind);
  if (why) return why;
  for (const k of XIONG) s.frags[k]--;
  if (kind === 'zhu9') s.frags.eye--;
  return null;
}

/* ---------- 存檔 ----------
   stage：劇情走到第幾個；open：看過世界展開；at：現在（最後打的）節點；done：打倒過王的節點；
   star：每個節點選的星級；hold：退回之後留在這裡（等玩家按「再推一次」） */
const newWorld = () => ({ seed: W_SEED, stage: 0, open: 0, at: '0,0', done: [], star: {}, hold: 0 });
const newHunt = () => ({ v: 0, full: 0, used: 0 });
/* done 在存檔裡是陣列；查詢用的 Set 只放記憶體 */
const WDONE = new WeakMap();
function wDone(s) {
  let D = WDONE.get(s.world);
  if (!D || D.size !== s.world.done.length) WDONE.set(s.world, (D = new Set(s.world.done)));
  return D;
}
const wOpen = s => s.world.stage > STORY_END;
/* 主幹開到第幾個：打倒過王的最後一個＋1 */
function wFront(s) {
  const D = wDone(s);
  let i = 0;
  while (i < TRUNK.length - 1 && D.has(TRUNK_K[i])) i++;
  return i;
}
/* 不能進的原因，能進回傳空字串（0.4.0：打過的可以一直重複刷） */
function wWhy(s, q, r) {
  const n = WNODE[wKey(q, r)];
  if (!n) return '沒有這個地點';
  if (n.i != null) return n.i <= wFront(s) ? '' : '先打倒前一個地點的王';
  if (!wDone(s).has(TRUNK_K[n.at])) return `先打倒${TRUNK[n.at].n}的王`;
  if (s.lv < n.need) return `角色等級需達 ${n.need}`;
  if (n.lock) return '還沒開放';
  if (n.t === 'rift') {
    if (!s.hunt.full) return '血霧滿了才進得去';
    if (s.hunt.used) return '這次血霧已經開過一道裂口';
  }
  return '';
}
const wCan = (s, q, r) => !wWhy(s, q, r);
/* 地圖上看得到的節點：主幹開到的地方、世界展開後的特殊節點（還沒開也看得到，寫幾級開） */
function wList(s) {
  const L = TRUNK_K.slice(0, Math.min(wFront(s), wOpen(s) ? TRUNK.length : STORY_END) + 1);
  if (wOpen(s)) for (const n of SPECIAL) L.push(wKey(n.q, n.r));
  return L;
}
/* 下一個目標：主幹最前面那個 */
const wGoal = s => TRUNK_K[wFront(s)];
/* 主幹的下一個／上一個（連續刷往下推、連死退回） */
const wNext = k => {
  const n = WNODE[k];
  return n && n.i != null && n.i < TRUNK.length - 1 ? TRUNK_K[n.i + 1] : null;
};
const wPrev = k => {
  const n = WNODE[k];
  return !n ? null : n.i == null ? TRUNK_K[n.at] : n.i > 0 ? TRUNK_K[n.i - 1] : null;
};
/* 這一輪的地圖詞：劇情區固定，其他照選的星級每輪重抽（0.4.0，企劃書 4.1） */
const wStar = (s, k) => (STORY_I[k] != null ? STORY[STORY_I[k]].card.star : (s.world.star || {})[k] || 1);
const wCard = (s, k) => (STORY_I[k] != null ? STORY[STORY_I[k]].card : rollCard(wStar(s, k)));

/* ---------- 血霧：只有血霧節點累積；滿了每進一張圖扣 25%，期間不累積 ---------- */
const HUNT = { gain: 20, cost: 25, w5: 3 };
function huntGain(s) {
  if (s.hunt.full) return;
  s.hunt.v = Math.min(100, s.hunt.v + HUNT.gain);
  if (s.hunt.v >= 100) s.hunt.full = 1;
}
function huntEnter(s) {
  if (!s.hunt.full) return;
  s.hunt.v -= HUNT.cost;
  if (s.hunt.v > 0) return;
  s.hunt.v = s.hunt.full = s.hunt.used = 0;
}

/* 打倒節點的王：回傳節點類型 */
function wClear(s, k) {
  const [q, r] = wXY(k),
    t = wType(s, q, r),
    i = STORY_I[k],
    d = lvT(wLv(q, r));
  if (!wDone(s).has(k)) s.world.done.push(k);
  s.world.at = k;
  if (i != null) s.world.stage = Math.max(s.world.stage, i + 1);
  /* S.maxT、S.t16 留作內部欄位：昇華點、練習區、賭裝的物品等級都讀它們 */
  s.maxT = Math.max(s.maxT, Math.min(TMAX, Math.floor(d) + 1));
  if (d >= TMAX) s.t16 = 1;
  if (i === 7) s.story.crow = 1;
  if (t === 'blood' || i === 7) huntGain(s);
  if (t === 'rift') {
    s.hunt.used = 1;
    const z = wZod(s).z;
    if (!s.idols.includes(z)) s.idols.push(z);
  }
  return t;
}
