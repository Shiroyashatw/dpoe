'use strict';
/* dungeonPOE · 天賦樹烘焙工具：node tools/tree_bake.js → 寫 js/ptdata.js（PT_BAKE），遊戲不即時算
   （算一次要 3 秒，而且不同瀏覽器的三角函數差最後一位，放出來的樹會不一樣，存檔就對不上）。
   規則在 docs/天賦樹設計.md、skill talent-tree；照 PoE2 的做法：
   - 幹道＝手寫骨架 PT2_SK／PT2_LK，只放能力值點；六條路各寫各的
   - 起點＝六個同一套模板：第 1 步傷害與防禦各一個小點，各分成菱形（兩條路擇一），第 5 步大點
   - 叢集＝軌道格 PT2_ORB 上逐個生成，形狀不重複；小點都屬於某個叢集（沒有過路小點）
   - 外圈＝大型專精叢集往外長；基石在半徑 55%～85%
   - 預留叢集（data.js 的 PT_RSV）先鎖住，機制做好再解鎖
   這裡只決定形狀、主題、每個點用第幾條詞；詞的內容在 data.js 的 PT_THEME，改數值不用重烘。
   有線交叉、線壓到點、點太近、形狀重複就不寫檔（結束碼 1）。預覽：tools/tree_preview.html */

/* 幹道骨架：名字 → [角度（正上方 0°、順時針）, 半徑]。i 內環、m 中環、o 外環、s／x 死路支線 */
const PT2_SK = {
  i0: [0, 1280],
  i1: [30, 1120],
  i2: [62, 1300],
  i3: [93, 1150],
  i4: [118, 1330],
  i5: [150, 1180],
  i6: [181, 1180],
  i7: [209, 1180],
  i8: [242, 1340],
  i9: [272, 1120],
  i10: [298, 1270],
  i11: [331, 1150],
  m0: [342, 2300],
  m1: [0, 2520],
  m2: [18, 2330],
  m3: [33, 2150],
  m4: [50, 2420],
  m5: [72, 2420],
  m6: [90, 2600],
  m7: [108, 2250],
  m8: [128, 2480],
  m9: [150, 2300],
  m10: [166, 2140],
  m11: [180, 2140],
  m12: [194, 2140],
  m13: [212, 2420],
  m14: [232, 2200],
  m15: [250, 2560],
  m16: [270, 2280],
  m17: [288, 2480],
  m18: [310, 2480],
  m19: [328, 2450],
  o0: [350, 3550],
  o1: [10, 3550],
  o2: [30, 3300],
  o3: [45, 3650],
  o4: [60, 3650],
  o5: [76, 3650],
  o6: [92, 3350],
  o7: [112, 3600],
  o8: [134, 3450],
  o9: [152, 3300],
  o10: [170, 3500],
  o11: [190, 3500],
  o12: [210, 3350],
  o13: [226, 3650],
  o14: [246, 3400],
  o15: [258, 3700],
  o16: [272, 3350],
  o17: [290, 3650],
  o18: [312, 3500],
  o19: [330, 3300],
  s0: [0, 3250],
  s1: [180, 2850],
  x0: [14, 4050],
  x1: [60, 4150],
  x2: [104, 4080],
  x3: [140, 3950],
  x4: [197, 4020],
  x5: [226, 4150],
  x6: [262, 4150],
  x7: [296, 4120],
  x8: [318, 4000],
  x9: [346, 4050]
};
/* 幹道的線：'a-b' 直線、'a~b' 繞中心的弧（兩端半徑要一樣）。環故意不接滿，才不會像蜘蛛網 */
const PT2_LK = (
  'i0-i1 i1-i2 i2-i3 i3-i4 i4-i5 i5~i6 i6~i7 i7-i8 i8-i9 i9-i10 i10-i11 i11-i0 ' +
  'i0-m1 i11-m0 i1-m2 i1-m3 i2-m4 i2-m5 i3-m6 i4-m7 i4-m8 i5-m9 i5-m10 i6-m11 i7-m12 i7-m13 i8-m14 i8-m15 i9-m16 i10-m17 i10-m18 i11-m19 ' +
  'm19-m0 m0-m1 m1-m2 m2-m3 m3-m4 m4~m5 m5-m6 m6-m7 m7-m8 m9-m10 m10~m11 m11~m12 m12-m13 m13-m14 m15-m16 m16-m17 m17~m18 ' +
  'm0-o0 m2-o1 m1-s0 m3-o2 m4-o3 m5-o5 m6-o6 m7-o7 m8-o8 m9-o9 m10-o10 m12-o11 m11-s1 m13-o12 m14-o13 m14-o14 m15-o15 m16-o16 m17-o17 m18-o18 m19-o19 ' +
  'o19-o0 o0-o1 o1-o2 o2-o3 o3~o4 o4~o5 o6-o7 o7-o8 o8-o9 o10~o11 o11-o12 o12-o13 o14-o15 o15-o16 o16-o17 o18-o19 ' +
  'o1-x0 o4-x1 o7-x2 o8-x3 o11-x4 o13-x5 o15-x6 o17-x7 o18-x8 o0-x9'
).split(' ');
/* 軌道半徑（PoE2 的 82～839 換算到我們的尺寸，×0.375） */
const PT2_ORB = [31, 62, 94, 125, 183, 246, 315];

/* 每條路的叢集風格（六條路長得不一樣）：w 形狀權重、sz 尺寸偏好（小 3～4、中 5～8、大 9 以上） */
const PT2_STYLE = [
  { w: { ring: 3, diamond: 3, wheel: 2, star: 2, bull: 1.5, arc2: 1, fan: 1 }, sz: [0.7, 1.3, 1.2] },
  { w: { arc2: 3, hook: 3, fan: 3, anchor: 1.5, spiral: 1, ring: 1 }, sz: [1, 1.1, 0.9] },
  { w: { spiral: 3, hook: 2.5, vine: 2, diamond: 1.5, fan: 1.5 }, sz: [1.4, 0.9, 0.6] },
  { w: { bull: 3, ring: 2.5, star: 2.5, crown: 2, arcc: 2, arc2: 1 }, sz: [0.8, 1.2, 1.1] },
  { w: { vine: 3, anchor: 2.5, fan: 2, crown: 1.5, spiral: 1.5 }, sz: [1.1, 1, 1] },
  { w: { crown: 3, ring: 2, anchor: 2, arc2: 2, wheel: 1.5, hook: 1, arcc: 1 }, sz: [0.9, 1.1, 1.3] }
];

function ptreeGen2(env) {
  const { PT_THEME, PT_TH, PT_RW, PT_KEYS, PT_ROADS, PT_RSV, PT_STARTS } = env;
  const R0 = 470,
    GAP = 350,
    RAD = Math.PI / 180,
    TAU = Math.PI * 2;
  const N = [],
    E = [],
    I = {},
    ARC = {},
    CL = [];
  const rng = s => () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const R = rng(20261106);
  const pol = (deg, r) => ({ x: Math.sin(deg * RAD) * r, y: -Math.cos(deg * RAD) * r });
  const degOf = p => (Math.atan2(p.x, -p.y) / RAD + 360) % 360;
  const dst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const NR = n => (n.big === 2 ? 30 : n.gate ? 20 : n.big ? 19 : 10);
  const add = o => ((I[o.id] = o), N.push(o), o);
  const link = (a, b, arc) => {
    E.push([a.id, b.id]);
    if (arc) ARC[a.id + '|' + b.id] = ARC[b.id + '|' + a.id] = arc;
  };
  const pick = (L, r = R) => L[Math.floor(r() * L.length)];
  const wpick = (W, r = R) => {
    const K = Object.keys(W);
    let x = r() * K.reduce((s, k) => s + W[k], 0);
    for (const k of K) if ((x -= W[k]) < 0) return k;
    return K[K.length - 1];
  };
  const shuffle = L => {
    for (let i = L.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [L[i], L[j]] = [L[j], L[i]];
    }
    return L;
  };
  const angDiff = (a, b) => Math.abs(((((a - b) % TAU) + TAU + Math.PI) % TAU) - Math.PI);
  const rim = (x, y) => {
    const d = degOf({ x, y }) * RAD;
    return 4950 + 170 * Math.sin(d * 5 + 1) + 110 * Math.sin(d * 11 + 2);
  };

  /* ---------- 佔位格：每個點、每條線的取樣點都是一個圓，放新東西前先問放不放得下 ---------- */
  const CELL = 130,
    grid = new Map();
  /* own＝誰的（'t' 幹道與起點、'k' 基石、叢集編號）；hub＝引道是從哪個點拉出來的 */
  const put = (x, y, r, own, nd, hub) => {
    const k = Math.floor(x / CELL) + ',' + Math.floor(y / CELL);
    (grid.get(k) || grid.set(k, []).get(k)).push({ x, y, r, own, nd, hub });
  };
  /* 跟別人的點至少隔 52、跟線至少隔 36（PoE2 叢集之間都留空） */
  const free = (x, y, r, nd, skip) => {
    const cx = Math.floor(x / CELL),
      cy = Math.floor(y / CELL);
    for (let i = cx - 1; i <= cx + 1; i++)
      for (let j = cy - 1; j <= cy + 1; j++)
        for (const o of grid.get(i + ',' + j) || []) {
          if (skip && skip(o)) continue;
          if ((o.x - x) ** 2 + (o.y - y) ** 2 < (r + o.r + (nd && o.nd ? 52 : 36)) ** 2) return false;
        }
    return true;
  };
  const segPts = (ax, ay, bx, by, from = 14, to = 14, step = 22) => {
    const L = Math.hypot(bx - ax, by - ay),
      out = [];
    for (let s = from; s <= L - to; s += step) out.push([ax + ((bx - ax) * s) / L, ay + ((by - ay) * s) / L]);
    return out;
  };
  const arcPts = (cx, cy, r, a0, a1) => {
    let d = a1 - a0;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    const n = Math.max(1, Math.round((Math.abs(d) * r) / 22)),
      out = [];
    for (let k = 1; k < n; k++) out.push([cx + Math.cos(a0 + (d * k) / n) * r, cy + Math.sin(a0 + (d * k) / n) * r]);
    return out;
  };
  const putLine = (a, b, own) => {
    for (const [x, y] of segPts(a.x, a.y, b.x, b.y)) put(x, y, 2, own, 0);
  };

  /* ---------- 1. 起點與幹道 ---------- */
  /* 每個點已經有哪些方向的線（弧線算切線方向），新的線要跟它們隔開 */
  const dirs = {},
    tang = (p, q, c) => {
      const a0 = Math.atan2(p.y - c[1], p.x - c[0]);
      let d = Math.atan2(q.y - c[1], q.x - c[0]) - a0;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      return a0 + (d > 0 ? Math.PI / 2 : -Math.PI / 2);
    },
    addDir = (a, b, arc) => {
      (dirs[a.id] = dirs[a.id] || []).push(arc ? tang(a, b, arc) : Math.atan2(b.y - a.y, b.x - a.x));
      (dirs[b.id] = dirs[b.id] || []).push(arc ? tang(b, a, arc) : Math.atan2(a.y - b.y, a.x - b.x));
    };
  const tlink = (a, b, arc) => {
    link(a, b, arc);
    addDir(a, b, arc);
    if (arc) {
      for (const [x, y] of arcPts(0, 0, arc[2], Math.atan2(a.y, a.x), Math.atan2(b.y, b.x))) put(x, y, 2, 't', 0);
    } else putLine(a, b, 't');
  };
  const attr = (id, p) => {
    const n = add({ id, x: p.x, y: p.y, th: 0, big: 0, tk: 1, n: '基礎', s: { attr: 5 } });
    put(n.x, n.y, 10, 't', 1);
    return n;
  };
  const J = {};
  for (const [k, [deg, r]] of Object.entries(PT2_SK)) J[k] = attr('t_' + k, pol(deg, r));
  const chain = (A, B, curve) => {
    const n = Math.max(0, Math.round(dst(A, B) / GAP) - 1),
      dA = degOf(A),
      rA = Math.hypot(A.x, A.y);
    let dd = degOf(B) - dA;
    if (dd > 180) dd -= 360;
    if (dd < -180) dd += 360;
    let prev = A;
    for (let k = 1; k <= n; k++) {
      const f = k / (n + 1),
        nd = attr(
          't' + N.length,
          curve ? pol(dA + dd * f, rA) : { x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f }
        );
      tlink(prev, nd, curve ? [0, 0, rA] : null);
      prev = nd;
    }
    tlink(prev, B, curve ? [0, 0, rA] : null);
  };
  for (const l of PT2_LK) {
    const curve = l.includes('~'),
      [a, b] = l.split(curve ? '~' : '-');
    chain(J[a], J[b], curve);
  }
  /* 起點模板：局部座標 (往外, 順時針)；side −1 左、+1 右；傷害在哪一側照路輪流 */
  const startHubs = [];
  for (let g = 0; g < 6; g++) {
    const G = add({
        id: 'g' + g,
        ...pol(g * 60, R0),
        n: PT_ROADS[g].n,
        s: {},
        big: 1,
        gate: 1,
        th: PT_TH[PT_ROADS[g].th]
      }),
      u = pol(g * 60, 1),
      v = pol(g * 60 + 90, 1),
      W = (du, dv) => ({ x: G.x + u.x * du + v.x * dv, y: G.y + u.y * du + v.y * dv }),
      S = PT_STARTS[g];
    put(G.x, G.y, 20, 't', 1);
    for (const side of [-1, 1]) {
      const T = side === (g % 2 ? 1 : -1) ? S.d : S.f,
        main = PT_TH[T[0][0]],
        alt = PT_TH[T[1][0]],
        tag = `s${g}${side < 0 ? 'l' : 'r'}`,
        /* sv＝data.js 的 PT_STARTS[g] 第幾格（0 傷害主詞、1 傷害另一條路、2 防禦主詞、3 防禦另一條路） */
        sm = (k, du, dv, th, al) => {
          const n = add({
            id: tag + k,
            ...W(du, dv * side),
            th,
            big: 0,
            n: PT_THEME[th].n,
            st: 1,
            g,
            sv: (T === S.d ? 0 : 2) + (al ? 1 : 0)
          });
          put(n.x, n.y, 10, 't', 1);
          return n;
        },
        ln = (a, b) => {
          link(a, b);
          addDir(a, b);
          putLine(a, b, 't');
        };
      const s1 = sm('s1', 90, 55, main),
        s2 = sm('s2', 185, 60, main),
        p1 = sm('p1', 250, 150, alt, 1),
        p2 = sm('p2', 345, 185, alt, 1),
        q1 = sm('q1', 280, 40, main),
        q2 = sm('q2', 375, 75, main),
        nt = add({ id: tag + 'n', ...W(455, 150 * side), th: main, big: 1, n: PT_THEME[main].n, st: 1 });
      put(nt.x, nt.y, 19, 't', 1);
      ln(G, s1);
      ln(s1, s2);
      ln(s2, p1);
      ln(p1, p2);
      ln(p2, nt);
      ln(s2, q1);
      ln(q1, q2);
      ln(q2, nt);
      let prev = s1;
      for (const [k, [du, dv]] of [
        [135, 150],
        [215, 235],
        [320, 300],
        [430, 430]
      ].entries()) {
        const a = attr(tag + 'a' + k, W(du, dv * side));
        tlink(prev, a);
        prev = a;
      }
      chain(prev, J['i' + ((2 * g + (side < 0 ? 11 : 1)) % 12)]);
      /* 大點接到這條路正中間的內環交會點 */
      const ax = J['i' + 2 * g],
        x1 = attr(tag + 'x', { x: (nt.x + ax.x) / 2 + v.x * 40 * side, y: (nt.y + ax.y) / 2 + v.y * 40 * side });
      tlink(nt, x1);
      chain(x1, ax);
      startHubs.push({ n: nt, g, th: [main, alt, main], out: Math.atan2(u.y, u.x) + side * 0.5 });
    }
  }
  const trunk = N.filter(n => n.tk);
  const roadOf = p => Math.round(degOf(p) / 60) % 6;

  /* ---------- 2. 基石：先佔位置（半徑 55%～85%），掛在幹道點旁邊、只連 1 條線 ---------- */
  const ks = [];
  for (const [i, K] of PT_KEYS.entries()) {
    const cand = shuffle(
      trunk.filter(n => roadOf(n) === K.rg && Math.hypot(n.x, n.y) > 2475 && Math.hypot(n.x, n.y) < 3825)
    );
    done: for (const h of cand)
      for (let k = 0; k < 16; k++) {
        const a = (k * TAU) / 16 + i,
          p = { x: h.x + Math.cos(a) * 190, y: h.y + Math.sin(a) * 190 };
        if (!dirs[h.id].every(d => angDiff(a, d) >= 0.8) || ks.some(o => dst(o, p) < 700)) continue;
        if (!free(p.x, p.y, 30, 1) || !segPts(h.x, h.y, p.x, p.y, 60, 30).every(([x, y]) => free(x, y, 2, 0))) continue;
        const nd = add({ id: 'ks' + i, ...p, n: K.n, ic: K.ic, s: K.s, big: 2, th: PT_TH[PT_ROADS[K.rg].th] });
        link(h, nd);
        addDir(h, nd);
        put(p.x, p.y, 30, 'k', 1);
        putLine(h, nd, 'k');
        ks.push(nd);
        break done;
      }
  }

  /* ---------- 3. 叢集的形狀：軌道格上的點（o 半徑、d 角度；180° 朝幹道）＋線（弧或直線） ---------- */
  const minStep = (o, sep) => Math.ceil((2 * Math.asin(Math.min(1, sep / (2 * o)))) / RAD / 5) * 5;
  const stepIn = (lo, hi, r) => (lo > hi ? 0 : lo + 5 * Math.floor(r() * ((hi - lo) / 5 + 1)));
  const mk = () => {
    const P = [],
      Ed = [];
    return {
      P,
      Ed,
      p: (o, d, k = 0) => P.push({ o, d: ((Math.round(d) % 360) + 360) % 360, k }) - 1,
      arc: (i, j) => Ed.push([i, j, 1]),
      ln: (i, j) => Ed.push([i, j, 0])
    };
  };
  const nextOrb = (o, gap = 55) => PT2_ORB.find(x => x >= o + gap);
  const SHAPES = {
    /* 對稱的開口弧：入口在中間、兩臂、兩端是大點 */
    arc2(n, r) {
      if (n % 2 === 0 || n > 9) return null;
      const a = (n - 3) / 2,
        o = pick(
          [
            [62, 94],
            [62, 94, 125],
            [94, 125, 183],
            [125, 183]
          ][a],
          r
        ),
        s = stepIn(minStep(o, 52), Math.floor(165 / (a + 1) / 5) * 5, r);
      if (!s) return null;
      const b = mk(),
        e = b.p(o, 180);
      let L = e,
        Q = e;
      for (let j = 1; j <= a; j++) {
        const x = b.p(o, 180 + j * s),
          y = b.p(o, 180 - j * s);
        b.arc(L, x);
        b.arc(Q, y);
        L = x;
        Q = y;
      }
      b.arc(L, b.p(o, 180 + (a + 1) * s, 1));
      b.arc(Q, b.p(o, 180 - (a + 1) * s, 1));
      return [b, e];
    },
    /* 開口弧＋圓心的大點 */
    arcc(n, r) {
      if (n % 2 || n < 4 || n > 10) return null;
      const a = (n - 2) / 2,
        o = pick(a < 2 ? [62, 94] : a < 3 ? [94, 125] : [125, 183], r),
        s = stepIn(minStep(o, 42), Math.floor(160 / a / 5) * 5, r);
      if (!s) return null;
      const b = mk(),
        e = b.p(o, 180);
      b.ln(e, b.p(0, 0, 1));
      let L = e,
        Q = e;
      for (let j = 1; j <= a; j++) {
        const x = b.p(o, 180 + j * s),
          y = b.p(o, 180 - j * s);
        b.arc(L, x);
        b.arc(Q, y);
        L = x;
        Q = y;
      }
      return [b, e];
    },
    /* 封閉的環：大點在對面、兩側或圓心 */
    ring(n, r) {
      const cen = n >= 4 && r() < 0.35 ? 1 : 0,
        k = n - cen;
      if (k < 3 || k > 12) return null;
      /* 左右對稱、間距不一定平均：每邊 h 個，k 是偶數時正對面還有一個頂點 */
      const h = Math.floor((k - 1) / 2),
        apex = k % 2 === 0,
        /* 半徑跟著點數走（點跟點大約隔 75～135），不然會變成空空的大圈 */
        o = pick(
          PT2_ORB.filter(x => x >= 62 && x >= 12 * k && x <= 22 * k),
          r
        ),
        ms = minStep(o, 52),
        lo = apex ? ms : Math.ceil(ms / 10) * 5,
        last = stepIn(lo, Math.min(apex ? 180 : 85, 180 - h * ms), r);
      if (!last) return null;
      let extra = (180 - last - h * ms) / 5;
      const st = Array(h).fill(ms);
      while (extra-- > 0) st[Math.floor(r() * h)] += 5;
      const b = mk(),
        e = b.p(o, 180),
        mode = cen ? pick(['c', 'c', 'a'], r) : pick(apex ? ['a', 'a', 'p', 'ap'] : ['p'], r),
        pj = Math.floor(r() * h),
        L = [],
        Q = [];
      let a = 180;
      for (let j = 0; j < h; j++) {
        a -= st[j];
        const kk = mode.includes('p') && j === pj ? 1 : 0;
        L.push(b.p(o, a, kk));
        Q.push(b.p(o, -a, kk));
      }
      const top = apex ? b.p(o, 0, mode.includes('a') ? 1 : 0) : -1,
        loop = [e, ...L, ...(apex ? [top] : []), ...Q.reverse()];
      for (let j = 0; j < loop.length; j++) b.arc(loop[j], loop[(j + 1) % loop.length]);
      if (cen) {
        const c = b.p(0, 0, mode === 'c' ? 1 : 0);
        /* 圓心接一條（一個環）或左右各一條（兩個環） */
        if (h && r() < 0.45) b.ln(L[pj], c), b.ln(loop[loop.length - 1 - pj], c);
        else b.ln(apex ? top : e, c);
      }
      return [b, e];
    },
    /* 扇形：入口分出 2～3 支直線，末端是大點 */
    fan(n, r) {
      const cfg = { 3: [2, 0], 4: [3, 0], 5: [2, 1], 6: [3, 2], 7: [3, 1] }[n];
      if (!cfg) return null;
      const [br, mid] = cfg,
        o1 = pick([31, 62], r),
        o2 = pick(o1 === 31 ? [94, 125] : [125, 183], r),
        om = o1 === 31 ? 62 : 94,
        th = 5 * Math.floor((br === 2 ? 7 : 9) + r() * 8),
        tm = Math.min(125, th + 5 * (2 + Math.floor(r() * 5))),
        b = mk(),
        e = b.p(o1, 180),
        nt =
          br === 2
            ? r() < 0.75
              ? [1, 1]
              : [1, 0]
            : pick(
                [
                  [0, 1, 0],
                  [1, 1, 1],
                  [1, 0, 1]
                ],
                r
              ),
        ang = br === 2 ? [th, -th] : [th, 0, -th];
      for (const [k, a] of ang.entries()) {
        let prev = e;
        if (mid === 1 || (mid === 2 && a !== 0)) {
          const m = b.p(om, a === 0 ? 0 : a > 0 ? tm : -tm);
          b.ln(prev, m);
          prev = m;
        }
        b.ln(prev, b.p(o2, a, nt[k]));
      }
      return [b, e];
    },
    /* 菱形：入口兩邊各一條路，在對面的大點會合 */
    diamond(n, r) {
      const cfg = { 4: [1, 0], 5: [1, 1], 6: [2, 0], 7: [2, 1] }[n];
      if (!cfg) return null;
      const [s, t] = cfg,
        o = pick([62, 94, 125], r),
        ow = pick(
          PT2_ORB.filter(x => (s === 1 ? Math.abs(x - o) <= 63 : x >= o && x <= o + 95)),
          r
        ),
        ph = 5 * (8 + Math.floor(r() * 6)),
        b = mk(),
        e = b.p(o, 180),
        apex = b.p(o, 0, t ? 0 : 1);
      for (const sg of [1, -1]) {
        if (s === 1) {
          const m = b.p(ow, 90 * sg);
          b.ln(e, m);
          b.ln(m, apex);
        } else {
          const m1 = b.p(ow, (180 - ph) * sg),
            m2 = b.p(ow, ph * sg);
          b.ln(e, m1);
          b.ln(m1, m2);
          b.ln(m2, apex);
        }
      }
      if (t) b.ln(apex, b.p(nextOrb(o), 0, 1));
      return [b, e];
    },
    /* 皇冠：內圈一段弧，從弧上往外伸出大點 */
    crown(n, r) {
      const cfg = { 5: [1, 2, 0], 6: [1, 2, 1], 7: [2, 2, 0], 9: [2, 4, 0] }[n];
      if (!cfg) return null;
      const [a, j, cen] = cfg,
        o = pick([62, 94], r),
        o2 = nextOrb(o),
        s = stepIn(minStep(o, 42) + (a === 1 ? 20 : 0), Math.floor(150 / a / 5) * 5, r);
      if (!s) return null;
      const b = mk(),
        e = b.p(o, 180);
      if (cen) b.ln(e, b.p(0, 0, 1));
      for (const sg of [1, -1]) {
        let prev = e;
        for (let q = 1; q <= a; q++) {
          const x = b.p(o, 180 + sg * q * s);
          b.arc(prev, x);
          prev = x;
          if (q === a || j === 4) b.ln(x, b.p(o2, 180 + sg * q * s, q === a ? 1 : 0));
        }
      }
      return [b, e];
    },
    /* 星形：入口 → 圓心 → 往外幾支 */
    star(n, r) {
      const cfg = {
        4: [2, 1],
        5: [3, 1],
        6: pick(
          [
            [4, 1],
            [2, 2]
          ],
          r
        ),
        8: [3, 2],
        10: [4, 2]
      }[n];
      if (!cfg) return null;
      const [br, len] = cfg,
        o = len === 2 ? 62 : pick([62, 94, 125], r),
        o2 = pick([125, 183], r),
        kc = r() < 0.5 ? 1 : 0,
        t1 = 5 * (br === 4 ? 7 + Math.floor(r() * 5) : 11 + Math.floor(r() * 11)),
        t2 = 5 * (21 + Math.floor(r() * 6)),
        ang = br === 2 ? [t1, -t1] : br === 3 ? [t1, 0, -t1] : [t1, t2, -t1, -t2],
        b = mk(),
        e = b.p(o, 180),
        c = b.p(0, 0, kc);
      b.ln(e, c);
      for (const a of ang) {
        const m = b.p(o, a, len === 1 && !kc ? 1 : 0);
        b.ln(c, m);
        if (len === 2) b.ln(m, b.p(o2, a, kc ? 0 : 1));
      }
      return [b, e];
    },
    /* 藤：一條直線穿過圓心，旁邊長葉子 */
    vine(n, r) {
      if (n > 9) return null;
      const AX = pick(
          [
            [
              [62, 180],
              [0, 0],
              [62, 0],
              [125, 0],
              [183, 0]
            ],
            [
              [94, 180],
              [0, 0],
              [94, 0],
              [183, 0]
            ]
          ],
          r
        ),
        LF = {
          0: [
            [62, 90],
            [94, 70]
          ],
          62: [
            [94, 40],
            [125, 35]
          ],
          94: [
            [125, 45],
            [183, 30]
          ],
          125: [[183, 22]],
          183: [[246, 16]]
        },
        sym = r() < 0.6,
        len = Math.max(3, Math.min(AX.length, n - (sym ? (n % 2 ? 2 : 0) : Math.floor(r() * 3)))),
        lv = n - len;
      if (lv < 0 || (sym && lv % 2)) return null;
      const b = mk(),
        ax = [];
      for (let k = 0; k < len; k++) {
        ax.push(b.p(AX[k][0], AX[k][1], k === len - 1 ? 1 : 0));
        if (k) b.ln(ax[k - 1], ax[k]);
      }
      const host = shuffle([...Array(len - 1).keys()].map(k => k + 1)).slice(0, sym ? lv / 2 : lv);
      if (host.length < (sym ? lv / 2 : lv)) return null;
      for (const [q, h] of host.entries()) {
        const [o, d] = pick(LF[AX[h][0]], r),
          kk = r() < 0.4 ? 1 : 0;
        if (sym) {
          b.ln(ax[h], b.p(o, d, kk));
          b.ln(ax[h], b.p(o, -d, kk));
        } else b.ln(ax[h], b.p(o, q % 2 ? d : -d, kk));
      }
      return [b, ax[0]];
    },
    /* 錨：入口在圓心，往兩側伸出去再往前彎 */
    anchor(n, r) {
      if (n < 3 || n > 8) return null;
      const front = n % 2 === 0,
        a = (n - 3 - (front ? 1 : 0)) / 2,
        o = pick(a > 1 ? [94, 125] : [62, 94, 125], r),
        ps = 5 * (14 + Math.floor(r() * 9)),
        s = stepIn(minStep(o, 52), Math.floor((ps - 25) / Math.max(1, a) / 5) * 5, r),
        b = mk(),
        e = b.p(0, 0);
      if (a && !s) return null;
      for (const sg of [1, -1]) {
        let prev = b.p(o, sg * ps, a ? 0 : 1);
        b.ln(e, prev);
        for (let q = 1; q <= a; q++) {
          const x = b.p(o, sg * (ps - q * s), q === a ? 1 : 0);
          b.arc(prev, x);
          prev = x;
        }
      }
      if (front) b.ln(e, b.p(pick([94, 125], r), 0, 1));
      return [b, e];
    },
    /* 靶心：圓心大點＋內圈小環，再往外伸 */
    bull(n, r) {
      const opt = [];
      for (const k of [3, 4]) for (let j = 0; j < k; j++) if (1 + k + j === n) opt.push([k, j]);
      if (!opt.length) return null;
      const [k, j] = pick(opt, r),
        o2 = pick([125, 183], r),
        b = mk(),
        ids = [];
      for (let q = 0; q < k; q++) ids.push(b.p(62, 180 + (q * 360) / k));
      for (let q = 0; q < k; q++) b.arc(ids[q], ids[(q + 1) % k]);
      const c = b.p(0, 0, j >= 2 ? 0 : 1);
      if (k === 4 && r() < 0.4) b.ln(ids[1], c), b.ln(ids[3], c);
      else b.ln(ids[k === 4 ? 2 : 0], c);
      const outs = k === 4 ? [[2], [1, 3], [1, 2, 3]][j - 1] || [] : [[1], [1, 2]][j - 1] || [];
      for (const q of outs) b.ln(ids[q], b.p(o2, 180 + (q * 360) / k, j >= 2 || outs.length === 1 ? 1 : 0));
      return [b, ids[0]];
    },
    /* 大輪：外圈專精叢集，環上往外伸出大點 */
    wheel(n, r) {
      const opt = [];
      for (const k of [6, 8, 9, 12])
        for (const m of [2, 3, 4])
          for (const c of [0, 1]) if (k + m + c === n && !(k === 9 && m === 3)) opt.push([k, m, c]);
      if (!opt.length) return null;
      const [k, m, cen] = pick(opt, r),
        st = 360 / k,
        o = pick(k === 6 ? [94, 125] : k === 8 ? [125] : k === 9 ? [125, 183] : [183], r),
        o2 = nextOrb(o),
        q1 = Math.max(1, Math.round(k / (m === 4 ? 6 : 4))),
        q2 = Math.round(k / 3),
        at = m === 2 ? [q1 + (r() < 0.5 ? 1 : 0), 0] : m === 3 ? [q1, k / 2] : [q1, q2 + 1],
        b = mk(),
        ids = [];
      if (!o2 || (m === 3 && k % 2)) return null;
      for (let q = 0; q < k; q++) ids.push(b.p(o, 180 + q * st));
      for (let q = 0; q < k; q++) b.arc(ids[q], ids[(q + 1) % k]);
      const outs = new Set();
      for (const q of at) if (q) outs.add(q).add(k - q);
      for (const q of outs) b.ln(ids[q], b.p(o2, 180 + q * st, m === 4 && q !== at[1] && q !== k - at[1] ? 0 : 1));
      if (cen) {
        const c = b.p(0, 0, outs.size > 2 ? 0 : 1),
          q = Math.round(k / 3);
        if (r() < 0.6) b.ln(ids[q], c), b.ln(ids[k - q], c);
        else b.ln(ids[k % 2 ? 0 : k / 2], c);
      }
      return [b, ids[0]];
    },
    /* 螺旋：一圈一圈往外繞（不對稱） */
    spiral(n, r) {
      if (n > 6) return null;
      const s0 = Math.floor(r() * 2),
        s = 5 * (7 + Math.floor(r() * 9)),
        b = mk(),
        ids = [];
      if (s0 + n > PT2_ORB.length) return null;
      for (let j = 0; j < n; j++) {
        ids.push(b.p(PT2_ORB[s0 + j], 180 - j * s, j === n - 1 ? 1 : 0));
        if (j) b.ln(ids[j - 1], ids[j]);
      }
      return [b, ids[0]];
    },
    /* 鉤：弧往一邊長，另一邊可以有一小段（不對稱） */
    hook(n, r) {
      if (n > 8) return null;
      const c = Math.min(2, Math.floor(r() * Math.min(3, (n - 1) / 2))),
        m = n - 1 - c,
        o = pick(m < 3 ? [62, 94] : m < 5 ? [94, 125] : [125, 183], r),
        s = stepIn(minStep(o, 52), Math.floor(320 / (m + c) / 5) * 5, r);
      if (!s || m < 1) return null;
      const b = mk(),
        e = b.p(o, 180);
      let prev = e;
      for (let j = 1; j <= m; j++) {
        const x = b.p(o, 180 - j * s, j === m ? 1 : 0);
        b.arc(prev, x);
        prev = x;
      }
      prev = e;
      for (let j = 1; j <= c; j++) {
        const x = b.p(o, 180 + j * s, j === c && r() < 0.4 ? 1 : 0);
        b.arc(prev, x);
        prev = x;
      }
      return [b, e];
    }
  };
  const segD = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax,
      dy = by - ay,
      f = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(px - ax - dx * f, py - ay - dy * f);
  };
  const crossS = (p, q, r, s) => {
    const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]);
    if (Math.abs(d) < 1e-9) return false;
    const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d,
      u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
    return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
  };
  /* 檢查一個形狀：點不能太近、線不能壓到點或互相交叉、朝幹道那一側要空著 */
  const sigs = new Set();
  function finish(b, ent, name) {
    const { P, Ed } = b,
      xy = P.map(p => [Math.cos(p.d * RAD) * p.o, Math.sin(p.d * RAD) * p.o]);
    for (let i = 0; i < P.length; i++)
      for (let j = i + 1; j < P.length; j++)
        if (Math.hypot(xy[i][0] - xy[j][0], xy[i][1] - xy[j][1]) < (P[i].k && P[j].k ? 58 : P[i].k || P[j].k ? 48 : 40))
          return null;
    const poly = Ed.map(([i, j, arc]) => {
      if (!arc) return [xy[i], xy[j]];
      let d = (P[j].d - P[i].d) * RAD;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      const L = [];
      for (let k = 0; k <= 6; k++)
        L.push([Math.cos(P[i].d * RAD + (d * k) / 6) * P[i].o, Math.sin(P[i].d * RAD + (d * k) / 6) * P[i].o]);
      return L;
    });
    for (const [ei, [i, j, arc]] of Ed.entries()) {
      if (arc && P[i].o !== P[j].o) return null;
      for (let q = 0; q < P.length; q++)
        if (q !== i && q !== j)
          for (let k = 0; k < poly[ei].length - 1; k++)
            if (segD(xy[q][0], xy[q][1], ...poly[ei][k], ...poly[ei][k + 1]) < (P[q].k ? 19 : 10) + 12) return null;
      for (let ej = ei + 1; ej < Ed.length; ej++) {
        if (Ed[ej][0] === i || Ed[ej][0] === j || Ed[ej][1] === i || Ed[ej][1] === j) continue;
        for (let k = 0; k < poly[ei].length - 1; k++)
          for (let m = 0; m < poly[ej].length - 1; m++)
            if (crossS(poly[ei][k], poly[ei][k + 1], poly[ej][m], poly[ej][m + 1])) return null;
      }
    }
    const e = P[ent],
      ex = -e.o;
    if (e.o && e.d !== 180) return null;
    for (let q = 0; q < P.length; q++)
      if (q !== ent && xy[q][0] < ex + 5 && Math.abs(xy[q][1]) < (P[q].k ? 19 : 10) + 16) return null;
    for (const L of poly)
      for (let k = 0; k < L.length - 1; k++)
        if (L[k][1] * L[k + 1][1] < 0) {
          const x = L[k][0] + ((L[k + 1][0] - L[k][0]) * -L[k][1]) / (L[k + 1][1] - L[k][1]);
          if (x < ex - 2) return null;
        }
    const str = (mir, kind) =>
        P.map(p => `${p.o}:${p.o ? (mir ? (360 - p.d) % 360 : p.d) : 0}${kind ? ':' + p.k : ''}`)
          .sort()
          .join(','),
      s1 = str(0, 1),
      s2 = str(1, 1),
      sig = (s1 < s2 ? s1 : s2) + '#' + Ed.length;
    return {
      P,
      Ed,
      ent,
      name,
      sig,
      /* 對不對稱只看點的位置（跟 PoE2 的量法一樣） */
      sym: str(0, 0) === str(1, 0),
      loops: Ed.length - P.length + 1,
      nt: P.filter(p => p.k).length,
      maxR: Math.max(...P.map(p => p.o))
    };
  }
  /* 產生一個沒用過的形狀：照這條路的風格挑種類 */
  function genBody(n, g) {
    const W = {},
      /* 有環的形狀加權（PoE2：沒有環 48%、一個環 41%、兩個以上 11%） */
      LOOP = { ring: 3.2, diamond: 6, bull: 6, wheel: 3, hook: 0.4, spiral: 0.5 },
      /* 大點數照 PoE2：一個 60%、兩個 26%、三個以上 14% */
      want = +wpick(n < 6 ? { 1: 80, 2: 20 } : n < 9 ? { 1: 50, 2: 38, 3: 12 } : { 1: 12, 2: 40, 3: 34, 4: 14 });
    for (const k of Object.keys(SHAPES)) W[k] = (PT2_STYLE[g].w[k] || 0.5) * (LOOP[k] || 1);
    if (n >= 9) W.wheel *= 3;
    let spare = null;
    for (let t = 0; t < 90; t++) {
      /* 一部分形狀再長 1～2 個往外的分支（對稱的長一對），同一種形狀才有夠多變化 */
      const name = wpick(W),
        d = n > 3 && R() < 0.4 ? (n > 5 && R() < 0.5 ? 2 : 1) : 0,
        out = SHAPES[name](n - d, R);
      if (!out) continue;
      if (d) {
        const P = out[0].P,
          can = P.map((p, i) => i).filter(i => i !== out[1] && P[i].o && P[i].d !== 180 && nextOrb(P[i].o, 45)),
          pairs = [];
        for (const i of can)
          for (const j of can) if (i < j && P[i].o === P[j].o && P[i].d === (360 - P[j].d) % 360) pairs.push([i, j]);
        /* 對稱的形狀只長在正對面或左右一對，才不會變歪；本來就不對稱的（鉤、螺旋）隨便長 */
        const wild = name === 'hook' || name === 'spiral',
          at =
            d === 2
              ? pairs.length
                ? pick(pairs)
                : wild
                  ? shuffle(can).slice(0, 2)
                  : []
              : [can.find(i => P[i].d === 0) ?? (wild ? pick(can) : null)],
          kk = P.filter(p => p.k).length + at.length <= want ? 1 : 0;
        if (at.length < d || at[0] == null) continue;
        for (const i of at) out[0].ln(i, out[0].p(nextOrb(P[i].o, 45), P[i].d, kk));
      }
      const body = finish(out[0], out[1], name);
      if (!body || !body.nt || body.P.length !== n || sigs.has(body.sig)) continue;
      if (body.nt === want) return body;
      spare = spare || body;
    }
    return spare;
  }

  /* 除錯用：每種形狀在每個大小做得出幾個、幾個大點 */
  if (env.probe) {
    const out = {};
    for (let n = 3; n <= 13; n++)
      for (const k in SHAPES) {
        let ok = 0;
        const nts = {};
        for (let t = 0; t < 200; t++) {
          const o = SHAPES[k](n, R),
            b = o && finish(o[0], o[1], k);
          if (b && b.P.length === n) ok++, (nts[b.nt] = (nts[b.nt] || 0) + 1);
        }
        if (ok) out[n + ' ' + k] = ok + ' ' + JSON.stringify(nts);
      }
    return out;
  }
  /* ---------- 4. 把叢集掛到幹道上：從幹道點拉一條引道（0～5 個小點）到入口 ---------- */
  function fit(hub, body, a, k, m) {
    const Ls = (NR(hub) > 12 ? 100 : 86) + 94 * k,
      ux = Math.cos(a),
      uy = Math.sin(a),
      eo = body.P[body.ent].o,
      cx = hub.x + ux * (Ls + eo),
      cy = hub.y + uy * (Ls + eo),
      ang = body.P.map(p => a + m * p.d * RAD),
      pts = body.P.map((p, i) => [cx + Math.cos(ang[i]) * p.o, cy + Math.sin(ang[i]) * p.o]);
    for (const [x, y] of pts) {
      const r = Math.hypot(x, y);
      if (r < R0 + 170 || r > rim(x, y)) return null;
    }
    for (let i = 0; i < pts.length; i++) if (!free(pts[i][0], pts[i][1], body.P[i].k ? 19 : 10, 1)) return null;
    const smp = [];
    for (const [i, j, arc] of body.Ed)
      smp.push(...(arc ? arcPts(cx, cy, body.P[i].o, ang[i], ang[j]) : segPts(...pts[i], ...pts[j])));
    for (const [x, y] of smp) if (!free(x, y, 2, 0)) return null;
    /* 引道：樞紐自己和它旁邊的線不算擋路，但別的點一律要避開 */
    const own = hub.cl != null ? hub.cl : 't',
      hd = o => (o.x - hub.x) ** 2 + (o.y - hub.y) ** 2,
      /* 從叢集的點再拉出去時，只放過貼著這個點的那一小段線，不然會切過自己叢集的線 */
      mine = o =>
        o.nd
          ? hd(o) < 144
          : own === 't'
            ? hd(o) < 78 * 78 && (o.own === 't' || o.hub === hub.id)
            : hd(o) < 40 * 40 || (hd(o) < 78 * 78 && o.hub === hub.id),
      leads = [],
      ssm = [];
    for (let j = 1; j <= k; j++) leads.push([hub.x + (ux * Ls * j) / (k + 1), hub.y + (uy * Ls * j) / (k + 1)]);
    for (const [x, y] of leads) if (!free(x, y, 10, 1, mine)) return null;
    for (let s = 30; s <= Ls - 14; s += 22) ssm.push([hub.x + ux * s, hub.y + uy * s]);
    for (const [x, y] of ssm) if (!free(x, y, 2, 0, mine)) return null;
    return { cx, cy, pts, ang, leads, smp, ssm, a };
  }
  function commit(hub, body, pl, o) {
    const ci = CL.length,
      id = 'c' + ci,
      c = {
        id,
        hub: hub.id,
        x: pl.cx,
        y: pl.cy,
        ids: [],
        body: body.P.length,
        lead: pl.leads.length,
        nt: body.nt,
        sig: body.sig,
        sym: body.sym,
        loops: body.loops,
        shape: body.name,
        maxR: body.maxR,
        th: o.th == null ? null : o.th,
        st: o.st || 0,
        par: o.par == null ? null : o.par,
        g: o.g
      },
      cl = (a, b, arc) => {
        link(a, b, arc);
        addDir(a, b, arc);
      };
    sigs.add(body.sig);
    let prev = hub;
    for (const [j, [x, y]] of pl.leads.entries()) {
      const nd = add({ id: `${id}_l${j}`, x, y, big: 0, cl: ci, sd: 0 });
      c.ids.push(nd.id);
      cl(prev, nd);
      put(x, y, 10, ci, 1);
      prev = nd;
    }
    const nds = body.P.map((p, i) => {
      /* sd＝在叢集的哪一邊（另一邊的小點可以是另一條詞，玩家選邊走） */
      const nd = add({
        id: `${id}_${i}`,
        x: pl.pts[i][0],
        y: pl.pts[i][1],
        big: p.k,
        cl: ci,
        sd: p.o > 0 && p.d > 0 && p.d < 180 ? 1 : 0
      });
      c.ids.push(nd.id);
      put(nd.x, nd.y, p.k ? 19 : 10, ci, 1);
      return nd;
    });
    cl(prev, nds[body.ent]);
    for (const [i, j, arc] of body.Ed) cl(nds[i], nds[j], arc ? [pl.cx, pl.cy, body.P[i].o] : null);
    for (const [x, y] of pl.smp) put(x, y, 2, ci, 0);
    for (const [x, y] of pl.ssm) put(x, y, 2, ci, 0, hub.id);
    c.n = c.ids.length;
    CL.push(c);
    return c;
  }
  const hubN = {};
  function tryPlace(hub, o) {
    let n = o.n;
    for (let t = 0; t < 3; t++, n = Math.max(3, n - (n > 8 ? 3 : 1))) {
      const body = genBody(n, o.g);
      if (!body) continue;
      const base = R() * TAU,
        L = [];
      for (let k = 0; k < 24; k++) {
        const a = base + (k * TAU) / 24;
        if (dirs[hub.id].every(u => angDiff(a, u) >= 0.66) && (!o.cone || angDiff(a, o.cone[0]) <= o.cone[1]))
          L.push(a);
      }
      for (const a of shuffle(L))
        for (const k of o.ks) {
          const m = R() < 0.5 ? 1 : -1,
            pl = fit(hub, body, a, k, m) || (body.sym ? null : fit(hub, body, a, k, -m));
          if (pl) return (hubN[hub.id] = (hubN[hub.id] || 0) + 1), commit(hub, body, pl, o);
        }
    }
    return null;
  }
  const SZ = { 3: 17, 4: 21, 5: 19, 6: 14, 7: 10, 8: 7, 9: 3, 10: 1.5, 11: 1, 12: 1 },
    szOf = (g, lo = 3, hi = 12) => {
      const W = {},
        s = PT2_STYLE[g].sz;
      for (const k in SZ) if (+k >= lo && +k <= hi) W[k] = SZ[k] * s[+k < 5 ? 0 : +k < 9 ? 1 : 2];
      return +wpick(W);
    };
  /* 4a. 起點的大點是樞紐：各再掛 3 個入門叢集（主題固定） */
  for (const h of startHubs)
    for (const th of [...h.th, h.th[0]])
      tryPlace(h.n, { n: 3 + Math.floor(R() * 3), g: h.g, ks: [0, 1], cone: [h.out, 1.9], th, st: 1 });
  /* 4b. 最外圍：外環與支線末端往外長大型專精叢集 */
  const outer = shuffle(trunk.filter(n => Math.hypot(n.x, n.y) > 3250));
  for (const h of outer)
    if (R() < 0.75)
      tryPlace(h, {
        n: +wpick({ 9: 3, 10: 3, 11: 3, 12: 4, 13: 3, 14: 2, 15: 3 }),
        g: roadOf(h),
        ks: shuffle([0, 1, 2]),
        cone: [Math.atan2(h.y, h.x), 1.25]
      });
  /* 4c. 先放深處的（長引道），再放靠幹道的，不然裡面的空地會被擋住進不去 */
  const cap = {};
  for (const h of trunk) cap[h.id] = h.id.startsWith('s') ? 1 : +wpick({ 0: 13, 1: 15, 2: 20, 3: 25, 4: 16, 5: 11 });
  /* 叢集的點（含鎖住的約 250）：加上能力值點約 293、基石 23、起點 6、起點模板 84，全樹約 3915（跟 PoE2 一樣） */
  const nodeGoal = 3509;
  const count = () => CL.reduce((s, c) => s + c.n, 0);
  const pass = (ks, lo, hi, p = 1, ignoreCap) => {
    for (const h of shuffle([...trunk])) {
      if (count() >= nodeGoal) return;
      if (R() > p || (!ignoreCap && (hubN[h.id] || 0) >= cap[h.id])) continue;
      /* 最外面的幹道點只拉短引道，不然最遠的大點要走三十幾步（PoE2 最遠 24 步） */
      const K = typeof ks === 'function' ? ks() : ks;
      tryPlace(h, {
        n: szOf(roadOf(h), lo, hi),
        g: roadOf(h),
        ks: Math.hypot(h.x, h.y) > 3800 ? K.filter(k => k < 3) : K
      });
    }
  };
  /* 叢集再接叢集（PoE2 約 18% 的叢集是好幾組拼成的）：從末端的點往外再長一個，主題跟著前一個；
     裡面的空地靠這個填，不用拉很長的引道 */
  const chainPass = p => {
    const deg = {};
    for (const [a, b] of E) (deg[a] = (deg[a] || 0) + 1), (deg[b] = (deg[b] || 0) + 1);
    for (const c of shuffle([...CL])) {
      if (count() >= nodeGoal) return;
      if (R() > p || Math.hypot(c.x, c.y) > 4000 || CL.filter(o => o.par === CL.indexOf(c)).length) continue;
      const leaf = shuffle(c.ids.filter(id => deg[id] === 1 && !id.includes('_l')))[0];
      if (!leaf) continue;
      const h = I[leaf];
      tryPlace(h, {
        n: szOf(c.g, 3, 6),
        g: c.g,
        ks: [0, 1],
        cone: [Math.atan2(h.y - c.y, h.x - c.x), 1.2],
        par: CL.indexOf(c),
        st: c.st,
        th: c.st ? c.th : null
      });
    }
  };
  pass([4, 3, 5], 5, 9, 0.3);
  pass([2, 3, 1], 4, 9, 0.5);
  for (let r = 0; r < 3; r++) pass(() => [0, 1, 2, 3].sort((a, b) => a * 1.2 + R() * 3 - (b * 1.2 + R() * 3)), 3, 8);
  chainPass(0.3);
  for (let r = 0; r < 3; r++)
    pass(() => [0, 1, 2, 3, 4].sort((a, b) => a * 1.2 + R() * 3 - (b * 1.2 + R() * 3)), 3, 7, 1, 1);
  chainPass(0.25);
  for (let r = 0; r < 3; r++) pass(() => shuffle([0, 1, 2, 3, 4, 5]), 3, 6, 1, 1);
  chainPass(0.3);
  /* 還沒到目標點數就繼續補小的，補到放不下為止 */
  for (let r = 0, was = -1; r < 8 && count() < nodeGoal && count() !== was; r++) {
    was = count();
    pass(() => shuffle([0, 1, 2, 3, 4, 5]), 3, 5, 1, 1);
    chainPass(0.4);
  }

  /* ---------- 5. 兩頭通的叢集（約 13%）：末端的小點離另一個幹道點夠近就接過去 ---------- */
  const isT = id => I[id].tk;
  let bridges = 0;
  for (const c of shuffle([...CL])) {
    if (bridges >= CL.length * 0.13 || c.st) continue;
    const deg = id => E.filter(e => e[0] === id || e[1] === id).length;
    done: for (const id of c.ids) {
      const n = I[id];
      if (n.big || deg(id) !== 1) continue;
      for (const h of trunk) {
        const d = dst(h, n);
        if (h.id === c.hub || d < 70 || d > 230) continue;
        const a = Math.atan2(n.y - h.y, n.x - h.x);
        if (!dirs[h.id].every(u => angDiff(a, u) >= 0.66) || !dirs[n.id].every(u => angDiff(a + Math.PI, u) >= 0.8))
          continue;
        /* 兩端旁邊的線不算擋路；點只放過兩個端點自己 */
        const d2 = (o, p) => (o.x - p.x) ** 2 + (o.y - p.y) ** 2,
          ci = CL.indexOf(c),
          nearH = o =>
            o.nd
              ? d2(o, h) < 144 || d2(o, n) < 144
              : (d2(o, h) < 78 * 78 && (o.own === 't' || o.hub === h.id)) || (d2(o, n) < 50 * 50 && o.own === ci),
          pts = segPts(h.x, h.y, n.x, n.y, 30, 16);
        if (!pts.every(([x, y]) => free(x, y, 2, 0, nearH))) continue;
        link(h, n);
        addDir(h, n);
        for (const [x, y] of pts) put(x, y, 2, ci, 0, h.id);
        c.hub2 = h.id;
        bridges++;
        break done;
      }
    }
  }

  /* ---------- 6. 預留叢集：先挑單一入口的死路鎖起來（不佔主題與大點的額度） ---------- */
  for (const c of CL) c.dd = Math.min(1, (Math.hypot(c.x, c.y) - R0) / (4930 - R0));
  const hasKid = new Set(CL.filter(c => c.par != null).map(c => c.par));
  for (const [ri, [, roads, k]] of PT_RSV.entries()) {
    const got = [];
    for (const c of shuffle(
      CL.filter(
        (c, ci) =>
          !c.st &&
          !c.lock &&
          !c.hub2 &&
          c.par == null &&
          !hasKid.has(ci) &&
          c.dd > 0.35 &&
          c.n <= 12 &&
          roads.includes(roadOf(c))
      )
    )) {
      if (got.length >= k) break;
      if (got.some(o => dst(o, c) < 450)) continue;
      c.lock = ri + 1;
      got.push(c);
    }
  }
  /* ---------- 7. 主題：邊界銳利（中間 2/3 是自己的，只有邊界一條混搭）、最內圈不混、長矛混合帶 ---------- */
  const NO1 = { 近戰: 1, 招架: 1, 打擊: 1 },
    rgOf = (T, g) => (g === 1 && NO1[T.n] ? 0 : T.rg[g]),
    SPEAR = { 長矛術: 3, 攻擊: 2.5, 攻擊速度: 2, 物理: 2, 近戰: 0.6, 投射物: 0.6 },
    BIGT = new Set(['召喚', '砲塔圖騰', '陷阱地雷', '格擋與盾']),
    rootOf = c => (c.par == null ? c : rootOf(CL[c.par])),
    /* 一串接在一起的叢集共用主題，大點要一起算：手寫的大點不夠就不抽那個主題 */
    famNt = {},
    left = PT_THEME.map(T => T.nt.length);
  for (const c of CL) famNt[rootOf(c).id] = (famNt[rootOf(c).id] || 0) + c.nt;
  for (const n of N) if (n.st && n.big === 1 && !n.gate) left[n.th]--;
  for (const c of CL) if (c.st && c.par == null) left[c.th] -= famNt[c.id];
  const byR = [...CL].sort((a, b) => a.dd - b.dd);
  for (const c of byR) {
    if (c.th != null || c.par != null || c.lock) continue;
    const f = degOf(c) / 60,
      g0 = Math.round(f) % 6,
      off = f - Math.round(f),
      t = c.dd < 0.25 || Math.abs(off) < 0.33 ? 0 : ((Math.abs(off) - 0.33) / 0.17) * 0.5,
      g1 = (g0 + (off > 0 ? 1 : 5)) % 6,
      spear = c.dd >= 0.25 && f > 0.33 && f < 0.67,
      w = PT_THEME.map((T, ti) => {
        if (T.base || left[ti] < famNt[c.id]) return 0;
        let x = rgOf(T, g0) * (1 - t) + rgOf(T, g1) * t;
        if (spear) x = SPEAR[T.n] ? Math.max(T.rg[0], T.rg[1]) * SPEAR[T.n] : x * 0.35;
        return (
          x *
          (PT_RW[T.n] || 1) *
          (T.wp ? (c.dd < 0.45 ? 0 : c.dd < 0.65 ? 0.3 : 0.8) : T.inner && c.dd < 0.35 ? 2.5 : 1) *
          (c.n >= 9 ? (T.wp || BIGT.has(T.n) ? 2 : 0.6) : 1)
        );
      });
    let ws = w;
    for (const rep of [600, 420, 300, 0]) {
      const ban = new Set(byR.filter(b => b.th != null && dst(b, c) < rep).map(b => b.th)),
        v = w.map((x, ti) => (ban.has(ti) ? 0 : x));
      if (v.some(x => x > 0)) {
        ws = v;
        break;
      }
    }
    let roll = R() * ws.reduce((a, b) => a + b, 0);
    c.th = ws.findIndex(v => (roll -= v) < 0);
    if (c.th < 0) c.th = ws.findLastIndex(v => v > 0);
    /* 這一區能放的主題大點都用完了：還是要有主題，大點用產生的（check.js 會抓） */
    if (c.th < 0) c.th = PT_THEME.findIndex((T, ti) => !T.base && !T.wp && rgOf(T, g0) > 0);
    left[c.th] -= famNt[c.id];
  }
  /* 保底：每種武器至少 3 個專精叢集 */
  const cnt = t => CL.filter(c => c.th === t).length;
  for (const [ti, T] of PT_THEME.entries())
    for (let need = T.wp ? 3 - cnt(ti) : 0; need > 0; need--) {
      const c = byR
        .filter(
          c =>
            !c.st &&
            !c.lock &&
            c.par == null &&
            roadOf(c) === T.rg.indexOf(3) &&
            c.dd > 0.45 &&
            !PT_THEME[c.th].wp &&
            cnt(c.th) >= 5 &&
            left[ti] >= famNt[c.id] &&
            !CL.some(b => b.th === ti && dst(b, c) < 600)
        )
        .pop();
      if (!c) continue;
      left[c.th] += famNt[c.id];
      left[ti] -= famNt[c.id];
      c.th = ti;
    }
  for (const c of CL) if (c.par != null) c.th = rootOf(c).th;
  /* ---------- 8. 每個點用哪一條詞 ----------
     大點＝主題大點清單的第幾個（內圈先拿）。
     小點＝主題的小點清單（sm 接 sub）的第幾條：大部分是主詞 p（sm 輪流）；每個叢集另外抽一條變體 q
     （sub 照主題輪流，每一條都輪得到），放在其中一邊、隔一個放一個；8 個小點以上的再抽一條 r 放另一邊深處。
     照 PoE2：一個叢集幾個同樣的小點夾 1～2 個別的 */
  const ADJ = {};
  for (const [a, b] of E) (ADJ[a] = ADJ[a] || []).push(b), (ADJ[b] = ADJ[b] || []).push(a);
  const ntK = PT_THEME.map(() => 0),
    subK = PT_THEME.map(() => 0);
  for (const n of N) if (n.st && n.big === 1 && !n.gate) n.v = ntK[n.th]++;
  for (const c of byR) {
    if (c.lock) {
      for (const id of c.ids) (I[id].lock = c.lock), (I[id].th = 0);
      continue;
    }
    const T = PT_THEME[c.th],
      ci = CL.indexOf(c),
      nSub = T.sub ? T.sub.length : 0,
      set = new Set(c.ids),
      body = c.ids.filter(id => !I[id].big && !id.includes('_l')),
      /* 從入口算起第幾步（引道是負的） */
      dep = { [c.hub]: -c.lead - 1 },
      qu = [c.hub];
    for (let h = 0; h < qu.length; h++)
      for (const o of ADJ[qu[h]]) if (set.has(o) && dep[o] === undefined) (dep[o] = dep[qu[h]] + 1), qu.push(o);
    c.p = (ci + c.th) % T.sm.length;
    const pick = () => (nSub ? T.sm.length + (subK[c.th]++ % nSub) : (c.p + 1) % T.sm.length),
      /* 接在別的叢集後面的兩邊對調，才不會跟前一個叢集的同一條詞連在一起 */
      side = id => (I[id].sd === 1) !== (c.par != null),
      A = body.filter(side),
      B = body.filter(id => !side(id) && dep[id] >= 3 && dep[id] % 2);
    /* 幾個變體小點：小叢集約六成有 1 個、6～7 個小點的 2 個、8 個以上 3 個；接在別的叢集後面的至少 1 個
       （PoE2：小點約 18% 是複合詞，601 種裡 113 種全樹只出現一次） */
    const want = Math.max(c.par != null ? 1 : 0, body.length >= 8 ? 3 : body.length >= 6 ? 2 : R() < 0.62 ? 1 : 0),
      odd = A.filter(id => dep[id] % 2).sort((x, y) => dep[x] - dep[y]),
      qs = new Set([...odd, ...A.filter(id => !odd.includes(id))].slice(0, want));
    if (want && !qs.size && body.length) qs.add([...body].sort((x, y) => dep[y] - dep[x])[0]);
    c.q = qs.size ? pick() : c.p;
    c.r = body.length >= 8 && B.length ? pick() : null;
    const rs = new Set(B.slice(0, 2));
    for (const id of c.ids) {
      const n = I[id];
      n.th = c.th;
      n.v = n.big ? ntK[c.th]++ : qs.has(id) ? c.q : c.r != null && rs.has(id) ? c.r : c.p;
    }
  }
  return { N, E, I, ADJ, ARC, CL, R0, bridges };
}

/* 驗收數字：數量、形狀不重複、有沒有跑版（線交叉、線壓到點、點太近） */
function pt2Audit(T) {
  const { N, E, I, ADJ, ARC, CL } = T,
    TAU = Math.PI * 2;
  const typ = n =>
    n.gate ? 'start' : n.big === 2 ? 'keystone' : n.tk ? 'attr' : n.lock ? 'lock' : n.big ? 'notable' : 'small';
  const cnt = {};
  for (const n of N) cnt[typ(n)] = (cnt[typ(n)] || 0) + 1;
  const hist = (L, f) => {
    const h = {};
    for (const x of L) h[f(x)] = (h[f(x)] || 0) + 1;
    return h;
  };
  const NR = n => (n.big === 2 ? 30 : n.gate ? 20 : n.big ? 19 : 10);
  const poly = ([a, b]) => {
    const A = I[a],
      B = I[b],
      c = ARC[a + '|' + b];
    if (!c)
      return [
        [A.x, A.y],
        [B.x, B.y]
      ];
    const [cx, cy, r] = c,
      a0 = Math.atan2(A.y - cy, A.x - cx);
    let d = Math.atan2(B.y - cy, B.x - cx) - a0;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    const P = [];
    for (let k = 0; k <= 6; k++) P.push([cx + Math.cos(a0 + (d * k) / 6) * r, cy + Math.sin(a0 + (d * k) / 6) * r]);
    return P;
  };
  const segs = [];
  E.forEach((e, ei) => {
    const P = poly(e);
    for (let k = 0; k < P.length - 1; k++) segs.push({ ei, a: P[k], b: P[k + 1], e });
  });
  const C = 400,
    grid = new Map();
  segs.forEach((s, si) => {
    for (let x = Math.floor(Math.min(s.a[0], s.b[0]) / C); x <= Math.floor(Math.max(s.a[0], s.b[0]) / C); x++)
      for (let y = Math.floor(Math.min(s.a[1], s.b[1]) / C); y <= Math.floor(Math.max(s.a[1], s.b[1]) / C); y++) {
        const k = x + ',' + y;
        (grid.get(k) || grid.set(k, []).get(k)).push(si);
      }
  });
  const cross = (p, q, r, s) => {
    const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]);
    if (Math.abs(d) < 1e-9) return false;
    const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d,
      u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
    return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98;
  };
  const xs = new Set();
  for (const L of grid.values())
    for (let i = 0; i < L.length; i++)
      for (let j = i + 1; j < L.length; j++) {
        const s = segs[L[i]],
          o = segs[L[j]];
        if (s.ei === o.ei || s.e.some(v => o.e.includes(v))) continue;
        if (cross(s.a, s.b, o.a, o.b)) xs.add(Math.min(s.ei, o.ei) + '|' + Math.max(s.ei, o.ei));
      }
  const segD = (P, A, B) => {
    const dx = B[0] - A[0],
      dy = B[1] - A[1],
      f = Math.max(0, Math.min(1, ((P.x - A[0]) * dx + (P.y - A[1]) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(P.x - A[0] - dx * f, P.y - A[1] - dy * f);
  };
  let through = 0,
    close = 0,
    sharp = 0;
  const dbg = [];
  for (const n of N) {
    const gx = Math.floor(n.x / C),
      gy = Math.floor(n.y / C),
      near = new Set();
    for (let x = gx - 1; x <= gx + 1; x++)
      for (let y = gy - 1; y <= gy + 1; y++) for (const si of grid.get(x + ',' + y) || []) near.add(si);
    for (const si of near) {
      const s = segs[si];
      if (!s.e.includes(n.id) && segD(n, s.a, s.b) < NR(n) + 6) {
        through++;
        dbg.push('壓 ' + n.id + ' ← ' + s.e.join('-'));
        break;
      }
    }
    /* 弧線照切線方向算，不是弦 */
    const A = (ADJ[n.id] || [])
      .map(o => {
        const c = ARC[n.id + '|' + o];
        if (!c) return Math.atan2(I[o].y - n.y, I[o].x - n.x);
        const a0 = Math.atan2(n.y - c[1], n.x - c[0]);
        let d = Math.atan2(I[o].y - c[1], I[o].x - c[0]) - a0;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        return a0 + (d > 0 ? Math.PI / 2 : -Math.PI / 2);
      })
      .map(a => ((a % TAU) + TAU) % TAU)
      .sort((a, b) => a - b);
    for (let k = 0; k < A.length && A.length > 1; k++)
      if ((A[(k + 1) % A.length] - A[k] + TAU) % TAU < 0.21) sharp++, dbg.push('尖 ' + n.id);
  }
  for (const k of xs)
    dbg.push(
      '交叉 ' +
        k
          .split('|')
          .map(i => E[i].join('-'))
          .join(' x ')
    );
  const ng = new Map();
  for (const n of N) {
    const k = Math.floor(n.x / 100) + ',' + Math.floor(n.y / 100);
    (ng.get(k) || ng.set(k, []).get(k)).push(n);
  }
  for (const n of N) {
    const gx = Math.floor(n.x / 100),
      gy = Math.floor(n.y / 100);
    for (let x = gx - 1; x <= gx + 1; x++)
      for (let y = gy - 1; y <= gy + 1; y++)
        for (const o of ng.get(x + ',' + y) || [])
          if (o.id > n.id && Math.hypot(o.x - n.x, o.y - n.y) < NR(n) + NR(o) + 8) close++;
  }
  /* 從六個起點都走得到 */
  const seen = new Set(['g0']),
    q = ['g0'];
  while (q.length) for (const o of ADJ[q.pop()] || []) if (!seen.has(o)) seen.add(o), q.push(o);
  const hubN = hist(CL, c => c.hub),
    attrs = N.filter(n => n.tk);
  const depth = g => {
    const d = { ['g' + g]: 0 },
      qq = ['g' + g];
    for (let i = 0; i < qq.length; i++)
      for (const o of ADJ[qq[i]] || []) if (d[o] === undefined) (d[o] = d[qq[i]] + 1), qq.push(o);
    const row = [];
    for (let k = 1; k <= 7; k++) {
      const L = N.filter(n => d[n.id] === k);
      row.push(
        `${L.length}（能力值 ${L.filter(n => n.tk).length}、小 ${L.filter(n => !n.tk && !n.big).length}、大 ${L.filter(n => n.big === 1).length}）`
      );
    }
    return row;
  };
  const open = CL.filter(c => !c.lock);
  return {
    點數: cnt,
    看得到的點: N.length,
    叢集: CL.length,
    鎖住的叢集: CL.length - open.length,
    形狀不重複: new Set(CL.map(c => c.sig)).size + ' / ' + CL.length,
    左右對稱: Math.round((100 * CL.filter(c => c.sym).length) / CL.length) + '%',
    環的數量: hist(CL, c => Math.min(2, c.loops)),
    叢集大小: hist(CL, c => (c.n >= 13 ? '13+' : c.n)),
    每個叢集幾個大點: hist(CL, c => Math.min(4, c.nt)),
    形狀種類: hist(CL, c => c.shape),
    引道小點: CL.reduce((s, c) => s + c.lead, 0),
    兩頭通: T.bridges,
    每個能力值點掛幾個: hist(attrs, n => Math.min(5, hubN[n.id] || 0)),
    每條路的叢集: hist(CL, c => Math.round((((Math.atan2(c.x, -c.y) / Math.PI) * 180 + 360) % 360) / 60) % 6),
    線交叉: xs.size,
    線壓到點: through,
    兩點太近: close,
    夾角小於12度: sharp,
    全部連得到: seen.size === N.length,
    遊俠起點每一步: depth(1),
    _dbg: dbg
  };
}
/* ---------- 直接執行：烘成 js/ptdata.js ---------- */
if (typeof require !== 'undefined' && require.main === module) {
  const fs = require('fs'),
    vm = require('vm'),
    path = require('path'),
    js = f => path.join(__dirname, '..', 'js', f),
    /* data.js 載入時會用 PT_BAKE 組 PTREE：烘的時候給一份空的 */
    ctx = {
      console,
      Math,
      Date,
      JSON,
      Object,
      Array,
      location: { search: '' },
      URLSearchParams,
      PT_BAKE: { N: [], E: [] }
    };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(js('data.js'), 'utf8'), ctx, { filename: 'data.js' });
  const env = vm.runInContext('({ PT_THEME, PT_TH, PT_RW, PT_KEYS, PT_ROADS, PT_RSV, PT_STARTS })', ctx),
    T = ptreeGen2(env),
    A = pt2Audit(T),
    bad = A.線交叉 + A.線壓到點 + A.兩點太近 + A.夾角小於12度,
    uniq = new Set(T.CL.map(c => c.sig)).size === T.CL.length;
  for (const [k, v] of Object.entries(A))
    if (k[0] !== '_') console.log(k, typeof v === 'object' ? JSON.stringify(v) : v);
  if (bad || !uniq || !A.全部連得到) {
    console.log('❌ 不寫檔：', A._dbg.join('、') || '形狀重複或有點連不到');
    process.exit(1);
  }
  /* 點：[id, x, y, 類型, 主題, 第幾條]；類型 0 能力值、1 小點、2 大點、3 基石、4 起點、5 起點模板的小點、6 鎖住的小點、7 鎖住的大點 */
  const r1 = x => Math.round(x * 10) / 10,
    idx = Object.fromEntries(T.N.map((n, i) => [n.id, i])),
    rows = T.N.map(n => {
      const t = n.gate ? 4 : n.big === 2 ? 3 : n.tk ? 0 : n.lock ? (n.big ? 7 : 6) : n.sv != null ? 5 : n.big ? 2 : 1,
        v =
          t === 4
            ? +n.id.slice(1)
            : t === 3
              ? +n.id.slice(2)
              : t === 5
                ? n.g * 4 + n.sv
                : t > 5
                  ? n.lock - 1
                  : t
                    ? n.v
                    : 0;
      return [n.id, r1(n.x), r1(n.y), t, n.th || 0, v];
    }),
    /* 線：[a, b]（N 的第幾個）；弧線多 [圓心 x, y, 半徑] */
    edges = T.E.map(([a, b]) => {
      const c = T.ARC[a + '|' + b];
      return c ? [idx[a], idx[b], r1(c[0]), r1(c[1]), r1(c[2])] : [idx[a], idx[b]];
    }),
    /* 叢集的圓心（預覽頁寫主題名用）：[x, y, 主題或 -預留編號, 最外圈半徑] */
    cl = T.CL.map(c => [Math.round(c.x), Math.round(c.y), c.lock ? -c.lock : c.th, c.maxR]),
    M = Object.fromEntries(Object.entries(A).filter(([k]) => k[0] !== '_'));
  fs.writeFileSync(
    js('ptdata.js'),
    '/* tools/tree_bake.js 產生，不要手改：天賦樹的形狀（點、線、叢集）。效果在 data.js 的 PT_THEME */\nconst PT_BAKE = ' +
      JSON.stringify({ N: rows, E: edges, C: cl, M }) +
      ';\n'
  );
  console.log('✅ 寫好 js/ptdata.js：' + rows.length + ' 個點、' + edges.length + ' 條線、' + cl.length + ' 個叢集');
}
if (typeof module !== 'undefined') module.exports = { ptreeGen2, pt2Audit };
