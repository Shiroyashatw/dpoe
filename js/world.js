/* dungeonPOE · 世界地圖的純邏輯（企劃書第 4 節；畫面在 wmap.js）：六角格節點、路、等級、地圖卡與洗卡、血霧、裂口。
   節點、路、類型都是 (seed, q, r) 的純函式，同座標同種子永遠一樣，存檔只記走過的節點。check.js 也載入。 */
'use strict';

/* 六角格（axial）：圈數＝到 (0,0) 的距離 */
const HDIR = [
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1]
];
const wKey = (q, r) => q + ',' + r;
const wXY = k => k.split(',').map(Number);
const wRing = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
const W_ROAD = 4; /* 這一圈整圈連成環，劇情終點接在環上 */
const W_LV0 = 18; /* 劇情區結束時的怪物等級 */
const W_STEP = 3; /* 每往外一圈怪物等級 +3 */
const W_CAP = 83;

/* 劇情區：固定節點，照順序打，不選卡（card 是固定的卡）。after：打完回到地圖時播的對話；talk：第一次選到時播的對話 */
const STORY = [
  { q: 0, r: 0, n: '地層出口', lv: 5, d: '離開地層後的第一站', card: { star: 1, mods: [] }, talk: 'st_0' },
  { q: 0, r: 1, n: '枯河渡口', lv: 6, d: '地圖卡與星級', card: { star: 1, mods: ['dmg1'] }, talk: 'st_1' },
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
const STORY_I = Object.fromEntries(STORY.map((s, i) => [wKey(s.q, s.r), i]));
const STORY_END = STORY.length - 1;
const W_R = wRing(STORY[STORY_END].q, STORY[STORY_END].r); /* 劇情區的半徑，這裡面沒有世界節點 */

/* 節點類型：名字、地圖上的顏色、一句話（血霧與裂口才有規則，其他是普通地圖） */
const WTYPE = {
  story: { n: '主線', c: '#ffd166', d: '' },
  plain: { n: '荒野', c: '#a7a294', d: '一般地圖' },
  dawn: { n: '破曉據點', c: '#9cc4e4', d: '破曉軍團守著的地方' },
  crow: { n: '鴉衛情報', c: '#d6dae2', d: '鴉衛留下的記號' },
  star: { n: '天星分會', c: '#c9a0ff', d: '天星商會的貨棧' },
  blood: { n: '血霧之地', c: '#ff5a5f', d: '打完累積血霧' },
  rift: { n: '裂口', c: '#ff8a4c', d: '血霧滿了才進得去，裡面是墮落的生肖神' },
  /* 0.2.78 酆都（企劃書 4.2） */
  ghost: { n: '鬼門關', c: '#7fd1c7', d: '酆都的門：裡面是牛頭、馬面、黑無常、白無常其中一個，打倒掉勾魂令' },
  /* 0.2.79 心魔劫（企劃書 4.2） */
  dream: { n: '心魔幻境', c: '#e08ad0', d: '每張圖都有一隻七情王：打倒掉預兆與碎片' },
  /* 0.2.80 四凶 */
  fiend: { n: '凶地', c: '#e3a14a', d: '一隻凶的地盤：每張圖帶牠的專屬地圖詞，中心那格的王就是牠' },
  army: { n: '陰兵借道', c: '#8fb3a0', d: '陰兵的大區塊：每打完一張圖怨恨值 +1，怪物更強、獎勵更好；三位將領各守一格' }
};
/* 機制區塊（0.2.79，照 PoE2 的區域）：地圖切成 7 格的大格（中心＋旁邊 6 格；中心＝a·(2,1)＋b·(−1,3)，剛好不重疊鋪滿），
   中心在第 REGION.ring 圈以外的大格照各機制自己的機率 REGION.w 整塊變成那個機制（0.2.80；照種子，同一個存檔每次都一樣）；裂口、主線節點優先 */
const REGION = { ring: 10, w: { ghost: 0.07, dream: 0.08, fiend: 0.05 } };
REGION.types = Object.keys(REGION.w);
function wRegionC(q, r) {
  const a = Math.floor((3 * q + r) / 7),
    b = Math.floor((-q + 2 * r) / 7);
  for (const [i, j] of [
    [a, b],
    [a + 1, b],
    [a, b + 1],
    [a + 1, b + 1]
  ]) {
    const x = 2 * i - j,
      y = i + 3 * j;
    if (wRing(q - x, r - y) <= 1) return [x, y];
  }
  return [q, r];
}
function wRegion2(seed, q, r) {
  const [x, y] = wRegionC(q, r);
  if (wRing(x, y) < REGION.ring) return null;
  let h = wHash(seed, x, y, 8);
  for (const t of REGION.types) if ((h -= REGION.w[t]) < 0) return t;
  return null;
}
/* 凶地（0.2.80）：這一格屬於哪隻凶、是不是中心 */
function wFiend(seed, q, r) {
  const [x, y] = wRegionC(q, r);
  return { k: XIONG[Math.floor(wHash(seed, x, y, 9) * XIONG.length)], c: x === q && y === r };
}
/* 陰兵借道（0.2.81）：19 格的大六角（中心＋兩圈；中心＝a·(3,2)＋b·(−2,5)，剛好鋪滿），用自己的格線，跟 7 格的區塊重疊時陰兵借道優先 */
function wArmyC(q, r) {
  const a = Math.floor((5 * q + 2 * r) / 19),
    b = Math.floor((-2 * q + 3 * r) / 19);
  for (let i = a - 1; i <= a + 2; i++)
    for (let j = b - 1; j <= b + 2; j++) {
      const x = 3 * i - 2 * j,
        y = 2 * i + 5 * j;
      if (wRing(q - x, r - y) <= 2) return [x, y];
    }
  return [q, r];
}
const wArmyCells = (x, y) => {
  const L = [];
  for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (wRing(a, b) <= 2) L.push([x + a, y + b]);
  return L;
};
/* 這一格在不在陰兵借道裡：回傳區塊中心的鍵 */
function wArmy(seed, q, r) {
  const [x, y] = wArmyC(q, r);
  return wRing(x, y) >= ARMY.ring && wHash(seed, x, y, 12) < ARMY.w ? wKey(x, y) : null;
}
/* 三位將領站哪三個節點（節點鍵 → 將領）：區塊裡的節點照雜湊排，彼此不相鄰、不是裂口 */
const ARMY_MEMO = new Map();
function wArmyGen(seed, ck) {
  const id = seed + '|' + ck;
  if (ARMY_MEMO.has(id)) return ARMY_MEMO.get(id);
  const [x, y] = wXY(ck),
    R = wRifts(seed),
    L = wArmyCells(x, y)
      .filter(([a, b]) => wNode(seed, a, b) && R[wKey(a, b)] == null)
      .sort((p, o) => wHash(seed, p[0], p[1], 13) - wHash(seed, o[0], o[1], 13)),
    got = [];
  for (const c of L) if (got.length < 3 && got.every(g => wRing(g[0] - c[0], g[1] - c[1]) >= 2)) got.push(c);
  const sh = Math.floor(wHash(seed, x, y, 14) * 3),
    o = Object.fromEntries(got.map((c, i) => [wKey(...c), ARMY.gen[(i + sh) % 3]]));
  ARMY_MEMO.set(id, o);
  return o;
}
/* 怨恨值（存檔 S.army＝{ 區塊中心: { n 怨恨值, g 打倒的將領 } }） */
const armyOf = (s, ck) => ((s.army = s.army || {})[ck] = s.army[ck] || { n: 0, g: [] });
const armyRes = (s, ck) => ((s.army || {})[ck] || { n: 0 }).n;
/* 區域名：看圈數 */
const WREGION = [
  ['枯河原野', 4],
  ['灰燼平原', 10],
  ['血霧荒原', 16],
  ['裂口腹地', 23]
];
const wRegion = ring => WREGION.filter(x => ring >= x[1]).pop()[0];

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
/* 第 d 圈上位置 u（0～1）的格子 */
function ringHex(d, u) {
  const i = Math.floor(u * 6 * d) % (6 * d),
    s = Math.floor(i / d),
    k = i % d,
    a = HDIR[s],
    b = HDIR[(s + 2) % 6];
  return [a[0] * d + b[0] * k, a[1] * d + b[1] * k];
}
/* 十二道裂口：一隻一個方向，第 8～25 圈平均分散（Lv33～83），方向與順序看種子 */
const RIFT_MEMO = new Map();
function wRifts(seed) {
  let m = RIFT_MEMO.get(seed);
  if (m) return m;
  m = {};
  const ord = ZODIAC.map((_, i) => i).sort((a, b) => wHash(seed, a, 0, 71) - wHash(seed, b, 0, 71)),
    ang = ZODIAC.map((_, i) => i).sort((a, b) => wHash(seed, a, 1, 72) - wHash(seed, b, 1, 72));
  ord.forEach((z, i) => {
    const [q, r] = ringHex(8 + Math.round((i * 17) / 11), (ang[i] + 0.2 + wHash(seed, i, 2, 73) * 0.6) / 12);
    m[wKey(q, r)] = z;
  });
  RIFT_MEMO.set(seed, m);
  return m;
}
/* 空格只放在六角格三色的同一色（同色不相鄰），而且不在三條軸上：
   非軸上的格子有 2 個相鄰的內圈鄰居，最多 1 個是空格；軸上的格子內圈鄰居也在軸上。所以每個節點都有內圈節點可接 */
function wHole(seed, q, r) {
  return (
    (((q - r) % 3) + 3) % 3 === 0 &&
    q !== 0 &&
    r !== 0 &&
    q + r !== 0 &&
    wRing(q, r) > W_ROAD &&
    wHash(seed, q, r, 2) < 0.33
  );
}
function wNode(seed, q, r) {
  const k = wKey(q, r);
  if (STORY_I[k] != null) return true;
  if (wRing(q, r) <= W_R) return false;
  return wRifts(seed)[k] != null || !wHole(seed, q, r);
}
/* 每個節點固定接一條內圈路：照著走一定回到第 W_ROAD 圈的環 */
function wInner(seed, q, r) {
  const d = wRing(q, r),
    L = HDIR.map(([a, b]) => [q + a, r + b]).filter(([x, y]) => wRing(x, y) === d - 1 && wNode(seed, x, y));
  return L[Math.floor(wHash(seed, q, r, 3) * L.length)];
}
function wLinked(seed, a, b, c, d) {
  if (wRing(a - c, b - d) !== 1) return false;
  const i = STORY_I[wKey(a, b)],
    j = STORY_I[wKey(c, d)];
  if (i != null && j != null) return Math.abs(i - j) === 1;
  if (i != null || j != null)
    return (i === STORY_END || j === STORY_END) && wRing(i != null ? c : a, i != null ? d : b) === W_ROAD;
  if (!wNode(seed, a, b) || !wNode(seed, c, d)) return false;
  const ra = wRing(a, b),
    rb = wRing(c, d);
  if (ra === W_ROAD && rb === W_ROAD) return true;
  /* 成對的雜湊要跟方向無關 */
  const [p, o] = a < c || (a === c && b < d) ? [wKey(a, b), [c, d]] : [wKey(c, d), [a, b]],
    [px, py] = wXY(p),
    hp = wHash(seed, px * 7 + o[0] * 13, py * 11 + o[1] * 17, 4);
  if (ra === rb) return hp < 0.2;
  const [oq, or, iq, ir] = ra > rb ? [a, b, c, d] : [c, d, a, b],
    n = wInner(seed, oq, or);
  return (n[0] === iq && n[1] === ir) || hp < 0.25;
}
const wNear = (seed, q, r) =>
  HDIR.map(([a, b]) => [q + a, r + b]).filter(([x, y]) => wNode(seed, x, y) && wLinked(seed, q, r, x, y));

/* 十二隻都打完後，還沒走過的地方約 3% 會裂開 */
const W_RIFT_AGAIN = 0.03;
function wType(s, q, r) {
  const k = wKey(q, r),
    seed = s.world.seed;
  if (STORY_I[k] != null) return 'story';
  if (wRifts(seed)[k] != null) return 'rift';
  if (s.idols.length >= ZODIAC.length && wRing(q, r) > W_ROAD && wHash(seed, q, r, 5) < W_RIFT_AGAIN) return 'rift';
  if (wArmy(seed, q, r)) return 'army';
  const rg = wRegion2(seed, q, r);
  if (rg) return rg;
  const h = wHash(seed, q, r, 1);
  return h < 0.07 ? 'dawn' : h < 0.12 ? 'crow' : h < 0.17 ? 'star' : h < 0.3 ? 'blood' : 'plain';
}
const wZod = (s, q, r) => {
  const z = wRifts(s.world.seed)[wKey(q, r)];
  return ZODIAC[z != null ? z : Math.floor(wHash(s.world.seed, q, r, 6) * ZODIAC.length)];
};
const wLv = (q, r) => {
  const i = STORY_I[wKey(q, r)];
  return i != null ? STORY[i].lv : Math.min(W_CAP, W_LV0 + (wRing(q, r) - W_R) * W_STEP);
};
function wName(s, q, r) {
  const i = STORY_I[wKey(q, r)],
    t = wType(s, q, r);
  if (i != null) return STORY[i].n;
  if (t === 'rift') return wZod(s, q, r).n + '的裂口';
  if (t === 'fiend') {
    const f = wFiend(s.world.seed, q, r);
    return `凶地・${XIONG_MOD[f.k].n}${f.c ? '（巢穴）' : ''}`;
  }
  if (t === 'army') {
    const g = wArmyGen(s.world.seed, wArmy(s.world.seed, q, r))[wKey(q, r)];
    return '陰兵借道' + (g ? '・' + armyBoss(g).n : '');
  }
  return t === 'plain' ? wRegion(wRing(q, r)) : WTYPE[t].n;
}

/* ---------- 陰兵借道的王（0.2.81，山海寶盒）：蚩尤＝三種將印各 1；涿鹿兵主＝兵符＋Lv70 ---------- */
function armyHallWhy(s, kind) {
  const F = s.frags || {};
  if (kind === 'chiyou') {
    const miss = ARMY.gen.filter(k => !(F[k] >= 1)).map(k => FRAGS[k].n);
    return miss.length ? '還缺：' + miss.join('、') : '';
  }
  if (!(F.fu >= 1)) return '要 1 個兵符';
  return s.lv < ARMY.uberLv ? `角色要 Lv${ARMY.uberLv}` : '';
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
  if (kind === 'yama') return fdHun(s) >= FENG.hun ? null : `勾魂令不夠（${fdHun(s)}／${FENG.hun}）`;
  if (kind === 'uber') {
    const miss = FENG.elites.filter(k => !(F[k] >= 1)).map(k => FRAGS[k].n.split('・')[1]);
    if (miss.length) return '缺勾魂令：' + miss.join('、');
    if (!(F.book >= 1)) return '缺生死簿（閻羅掉的）';
    if (s.lv < FENG.uberLv) return `角色要 Lv${FENG.uberLv}`;
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
  if (kind === 'sanpeng' && s.lv < SIN.uberLv) return `角色要 Lv${SIN.uberLv}`;
  if (kind === 'sanshi' && new Set(L).size < SIN.need) return `選 ${SIN.need} 種以上的碎片`;
  const miss = L.filter(k => !(F[k] >= 1));
  return miss.length ? '缺碎片：' + miss.map(k => SIN_FRAG[k].n).join('、') : null;
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
  if (miss.length) return '缺：' + miss.join('、');
  if (kind === 'zhu9') {
    if (!(F.eye >= 1)) return '缺燭龍之目（燭龍掉的）';
    if (s.lv < XI.uberLv) return `角色要 Lv${XI.uberLv}`;
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

/* ---------- 存檔 ---------- */
const newWorld = () => ({ seed: Math.floor(Math.random() * 2147483647), stage: 0, open: 0, at: '0,0', done: [] });
const newHunt = () => ({ v: 0, full: 0, used: 0 });
/* done 在存檔裡是陣列；查詢用的 Set 只放記憶體 */
const WDONE = new WeakMap();
function wDone(s) {
  let D = WDONE.get(s.world);
  if (!D || D.size !== s.world.done.length) WDONE.set(s.world, (D = new Set(s.world.done)));
  return D;
}
const wOpen = s => s.world.stage > STORY_END;

/* 走得到嗎：劇情區照順序；世界區要有路接到走過的節點 */
function wCan(s, q, r) {
  const k = wKey(q, r),
    D = wDone(s),
    i = STORY_I[k];
  if (D.has(k)) return false;
  if (i != null) return i === s.world.stage;
  return wOpen(s) && wNear(s.world.seed, q, r).some(([x, y]) => D.has(wKey(x, y)));
}
/* 不能進的原因，能進回傳空字串 */
function wWhy(s, q, r) {
  if (wDone(s).has(wKey(q, r))) return '已經走過';
  if (!wCan(s, q, r)) return '還走不到：先打完相鄰的地點';
  if (wType(s, q, r) === 'rift') {
    if (!s.hunt.full) return '血霧滿了才進得去';
    if (s.hunt.used) return '這次血霧已經開過一道裂口';
  }
  return '';
}
/* 地圖上看得到的節點：走過的、接得到的、十二道裂口（世界展開後）、劇情區到目前這一步 */
function wList(s) {
  const seen = new Set(STORY.slice(0, Math.min(s.world.stage, STORY_END) + 1).map(n => wKey(n.q, n.r)));
  for (const k of s.world.done) {
    seen.add(k);
    if (STORY_I[k] != null && STORY_I[k] < STORY_END) continue;
    if (wOpen(s)) for (const [x, y] of wNear(s.world.seed, ...wXY(k))) seen.add(wKey(x, y));
  }
  if (wOpen(s)) for (const k in wRifts(s.world.seed)) seen.add(k);
  return [...seen];
}

/* ---------- 地圖卡：每節點 3 張，第一次打開才抽，換節點再回來不會變；進圖就刪，下次是新的一批 ---------- */
const W_CARDS = 3;
const huntStar = s => rollCard(rollStar(s.hunt.full ? HUNT.w5 : 1));
function wCards(s, k) {
  const o = (s.cards[k] = s.cards[k] || { c: Array.from({ length: W_CARDS }, () => huntStar(s)), w: 0 });
  /* 三張都買不起：第一張換成免費的 1★，不會卡住 */
  if (!o.c.some(x => mapCost(x.star) <= s.frag)) o.c[0] = rollCard(1);
  return o;
}
/* 洗卡：費用看地圖等級區間，同一節點每洗一次加倍 */
const washCost = (lv, n) => (lv <= 30 ? 1 : lv <= 60 ? 2 : 4) * 2 ** n;
function wWash(s, k) {
  const o = wCards(s, k),
    c = washCost(wLv(...wXY(k)), o.w);
  if (s.frag < c) return false;
  s.frag -= c;
  o.w++;
  o.c = Array.from({ length: W_CARDS }, () => huntStar(s));
  return true;
}

/* ---------- 血霧：只有血霧節點累積；滿了每進一張圖扣 25%，期間不累積、5★ 權重 ×3 ---------- */
const HUNT = { gain: 20, cost: 25, w5: 3 };
function huntGain(s) {
  if (s.hunt.full) return;
  s.hunt.v = Math.min(100, s.hunt.v + HUNT.gain);
  if (s.hunt.v < 100) return;
  s.hunt.full = 1;
  /* 卡是之前抽的，換掉才看得到 5★ 變多 */
  s.cards = {};
}
function huntEnter(s) {
  if (!s.hunt.full) return;
  s.hunt.v -= HUNT.cost;
  if (s.hunt.v > 0) return;
  s.hunt.v = s.hunt.full = s.hunt.used = 0;
}

/* 下一個目標：劇情區的下一步；之後血霧滿了標最近的裂口，沒滿標最近走得到的血霧；都沒有就最近走得到的節點 */
function wGoal(s) {
  if (!wOpen(s)) return wKey(STORY[s.world.stage].q, STORY[s.world.stage].r);
  const L = wList(s).map(wXY),
    near = (a, b) => wRing(...a) - wRing(...b),
    can = L.filter(([q, r]) => wCan(s, q, r)).sort(near),
    rift = L.filter(([q, r]) => wType(s, q, r) === 'rift' && !wDone(s).has(wKey(q, r))).sort(near),
    p =
      s.hunt.full && !s.hunt.used && rift[0]
        ? can.find(([q, r]) => wType(s, q, r) === 'rift') || rift[0]
        : can.find(([q, r]) => wType(s, q, r) === 'blood') || can[0];
  return p ? wKey(...p) : null;
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
  if (t === 'army') {
    const A = armyOf(s, wArmy(s.world.seed, q, r));
    A.n = Math.min(ARMY.max, A.n + 1);
  }
  if (t === 'rift') {
    s.hunt.used = 1;
    const z = wZod(s, q, r).z;
    if (!s.idols.includes(z)) s.idols.push(z);
  }
  return t;
}
