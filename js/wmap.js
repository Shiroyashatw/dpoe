/* dungeonPOE · 世界地圖畫面（規則在 world.js，企劃書第 4 節）：全螢幕像素大陸。
   地形切成區塊（WN×WN 像素，1 像素＝世界 WT 單位），每幀最多烘 WB 毫秒，LRU 快取；種子只換地形細節，五種地貌的方向固定。
   地形＋迷霧＋路＋節點合成一張底圖，鏡頭或資料變了才重畫，閒著只畫環境特效。地圖開著時 frame 跳過戰鬥（game.js）。 */
'use strict';
const W_SZ = 36,
  WT = 5,
  WN = 128,
  WC = WT * WN,
  WB = 4;
const WM = {
  on: false,
  cv: null,
  cx: null,
  bc: null /* 底圖 */,
  fc: null /* 迷霧 */,
  W: 0,
  H: 0,
  dpr: 1,
  x: 0,
  y: 0,
  z: 1,
  vx: 0,
  vy: 0,
  dirty: true,
  sel: null,
  view: 'node',
  nodes: [],
  edges: [],
  seed: 0,
  ox: 0,
  oy: 0,
  ch: new Map(),
  job: null,
  wipe: 1,
  anim: null,
  drag: null,
  pinch: null,
  tick: 0
};
const wmStill = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wmLat = (q, r) => [W_SZ * 1.5 * q, W_SZ * Math.sqrt(3) * (r + q / 2)];
/* 世界區的節點位置微微抖動，看起來不像格子 */
function wmPos(q, r) {
  const [x, y] = wmLat(q, r);
  if (STORY_I[wKey(q, r)] != null) return [x, y];
  return [x + (wHash(WM.seed, q, r, 7) - 0.5) * 26, y + (wHash(WM.seed, q, r, 8) - 0.5) * 26];
}

/* ---------- 噪聲與色帶 ---------- */
const WM_PERM = new Uint8Array(512);
{
  let s = 77;
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) WM_PERM[i] = p[i & 255];
}
function wmVn(x, y) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    xf = x - xi,
    yf = y - yi,
    u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf),
    X = xi & 255,
    Y = yi & 255,
    a = WM_PERM[WM_PERM[X] + Y] / 255,
    b = WM_PERM[WM_PERM[X + 1] + Y] / 255,
    c = WM_PERM[WM_PERM[X] + Y + 1] / 255,
    d = WM_PERM[WM_PERM[X + 1] + Y + 1] / 255;
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function wmFbm(x, y, o) {
  let s = 0,
    a = 0.5,
    f = 1;
  for (let i = 0; i < o; i++) {
    s += wmVn(x * f, y * f) * a;
    a *= 0.5;
    f *= 2.03;
  }
  return s;
}
const wmSmooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const wmPal = L => L.map(hex2rgb);
const WM_PAL = {
  mid: wmPal(['#1f1d1a', '#2b2822', '#39352c', '#4a4538', '#5e5847', '#79725d', '#98917a']),
  ash: wmPal(['#201a1c', '#2e2224', '#3f2b2b', '#533632', '#6c463c', '#8a5b4a', '#a8765f']),
  blood: wmPal(['#250f12', '#3a1417', '#531a1c', '#6f2221', '#8f2e29', '#ae4034', '#c95b47']),
  frost: wmPal(['#1b2531', '#2a3946', '#3f5361', '#5e7684', '#88a0ad', '#b6c8d1', '#e6f0f4']),
  lava: wmPal(['#170c0c', '#261110', '#371612', '#4a1b14', '#5f2217', '#7a2f1b', '#964222']),
  bog: wmPal(['#121b15', '#1a281b', '#243522', '#30452a', '#3f5732', '#526c3b', '#6b8446'])
};
const WM_SEA = wmPal(['#0b1219', '#0f1a24', '#13232f']);
const WM_WOOD = {
  mid: wmPal(['#1d3522', '#27472a', '#376034']),
  ash: wmPal(['#2b211c', '#392b22', '#4b3729']),
  blood: wmPal(['#2a0f12', '#3e1518', '#561c1e']),
  frost: wmPal(['#1f3339', '#2d4a50', '#cfdde2']),
  bog: wmPal(['#17281c', '#213a24', '#2e502e'])
};
const WM_RIVER = {
  mid: wmPal(['#2b6a86', '#6fb6cf']),
  ash: wmPal(['#2b6a86', '#6fb6cf']),
  frost: wmPal(['#a9cfdd', '#eef6f8']),
  lava: wmPal(['#d9531e', '#ffb13c']),
  bog: wmPal(['#2d5a3a', '#7aa862']),
  blood: wmPal(['#7d1a1e', '#cf4238'])
};
/* 還沒烘好的區塊先用地貌的平均色 */
const WM_FILL = { mid: '#3b362c', ash: '#42302d', blood: '#4f1a1b', frost: '#4a5e6b', lava: '#3a1813', bog: '#2a3a26' };
const WM_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16 - 0.5);

function wmBiome(wx, wy) {
  const n = (wmFbm((wx + WM.ox) * 0.0016 + 21, (wy + WM.oy) * 0.0016 + 8, 3) - 0.45) * 900,
    x = wx + n,
    y = wy - n * 0.7;
  return y < -640 ? 'frost' : x > 620 ? 'lava' : y > 660 ? 'bog' : x < -640 ? 'blood' : 'mid';
}
/* 高度：沒有島的邊緣，海是大尺度噪聲挖出來的內海；中央保證是陸地 */
function wmH(wx, wy) {
  const X = wx + WM.ox,
    Y = wy + WM.oy,
    sea = wmFbm(X * 0.00042 + 40, Y * 0.00042 + 70, 3);
  return (
    wmFbm(X * 0.0021 + 9, Y * 0.0021 + 4, 5) * 1.25 -
    0.13 -
    Math.max(0, sea - 0.5) * 2.6 * wmSmooth(520, 1300, Math.hypot(wx, wy))
  );
}
/* 一格的顏色：h 高度、up 左上的高度（打陰影）、b Bayer 抖色 */
function wmTexel(h, up, b, wx, wy, tx, ty) {
  const X = wx + WM.ox,
    Y = wy + WM.oy;
  if (h < 0.16) {
    const w = clamp(Math.floor((h + 0.25) * 5 + b * 0.9 + Math.sin(wy * 0.04 + wx * 0.012) * 0.25), 0, 2);
    return WM_SEA[w];
  }
  const r = Math.hypot(wx, wy) / 1700,
    v = clamp(Math.floor(0.6 + (h - 0.16) * 8.5 + (h - up) * 34 + b * 0.7), 0, 6),
    cor = wmSmooth(0.28, 0.95, r + (wmFbm(X * 0.004 + 3, Y * 0.004 + 7, 3) - 0.45) * 0.5) + b * 0.2,
    bm = wmBiome(wx + b * 90, wy + b * 60),
    tint = bm === 'mid' ? (cor > 0.45 ? 'ash' : 'mid') : bm;
  /* 河：低頻噪聲的等值線，跨區塊接得起來；流過哪裡就是哪裡的顏色 */
  if (h >= 0.19) {
    const rv = Math.abs(wmFbm(X * 0.0013 + 11, Y * 0.0013 + 55, 3) - 0.5),
      rw = 0.0028 + 0.006 * wmSmooth(0.42, 0.62, wmFbm(X * 0.0009 + 3, Y * 0.0009 + 9, 2));
    if (rv < rw) return WM_RIVER[tint][rv < rw * 0.3 && rw > 0.005 ? 1 : 0];
  }
  if (h < 0.185) return WM_PAL[tint][6];
  /* 樹林：一整片樹冠；燒過的地方只剩枯林 */
  if (h >= 0.22 && h < 0.58 && bm !== 'lava') {
    const f = wmFbm(X * 0.0052 + 17, Y * 0.0052 + 3, 3) + b * 0.02;
    if (f > 0.535)
      return WM_WOOD[bm === 'mid' ? tint : bm][((((tx >> 1) * 3 + (ty >> 1) * 5 + ((f * 40) | 0)) % 3) + 3) % 3];
    if (bm === 'mid' && cor < 0.45 && r > 0.16 && wmFbm(X * 0.0075 + 71, Y * 0.0075 + 13, 2) > 0.6)
      return ((tx >> 2) + (ty >> 1)) & 1 ? [104, 92, 50] : [76, 70, 42];
  }
  if (h >= 0.2) {
    if (bm === 'lava') {
      const n = Math.abs(wmFbm(X * 0.0045 + 5, Y * 0.0045 + 2, 3) - 0.47);
      if (n < 0.0055) return [255, 176, 72];
      if (n < 0.012) return [176, 58, 26];
    } else {
      const n = wmFbm(X * 0.0062 + 30, Y * 0.0062 + 12, 3);
      if (n > 0.615) return bm === 'bog' ? [38, 72, 40] : bm === 'blood' ? [112, 18, 24] : [34, 86, 112];
      if (n > 0.6) return bm === 'bog' ? [104, 142, 62] : bm === 'blood' ? [176, 58, 50] : [134, 176, 182];
    }
  }
  return WM_PAL[tint][v];
}
/* 山、枯樹、燒毀的城鎮：格點抖動，跨區塊的部分鄰居也畫得到同一格；火與煙記在 sites */
function wmStamps(c) {
  const g = c.g,
    tx0 = c.cx * WN,
    ty0 = c.cy * WN,
    seed = WM.seed,
    mount = (x, y, s, l, d, snow, tip) => {
      for (let i = 0; i < s; i++) {
        g.fillStyle = l;
        g.fillRect(x - i, y - s + i, i + 1, 1);
        g.fillStyle = d;
        g.fillRect(x + 1, y - s + i, i, 1);
      }
      if (snow) {
        g.fillStyle = '#eef4f6';
        g.fillRect(x, y - s, 1, 1);
        g.fillRect(x - 1, y - s + 1, 2, 1);
        g.fillRect(x - 2, y - s + 2, 2, 1);
      }
      if (tip) {
        g.fillStyle = tip;
        g.fillRect(x - 1, y - s, 2, 2);
      }
    };
  for (let gy = Math.floor((ty0 - 8) / 9); gy * 9 < ty0 + WN + 16; gy++)
    for (let gx = Math.floor((tx0 - 20) / 11); gx * 11 < tx0 + WN + 20; gx++) {
      const jx = gx * 11 + (gy & 1) * 4 + ((wHash(seed, gx, gy, 21) * 8) | 0),
        jy = gy * 9 + ((wHash(seed, gx, gy, 22) * 7) | 0),
        wx = (jx + 0.5) * WT,
        wy = (jy + 0.5) * WT;
      if (wmH(wx, wy) < 0.22) continue;
      const X = wx + WM.ox,
        Y = wy + WM.oy,
        bm = wmBiome(wx, wy),
        R = Math.hypot(wx, wy) / 1700,
        ridge = 1 - Math.abs(2 * wmFbm(X * 0.0011 + 50, Y * 0.0011 + 60, 3) - 1),
        z = wHash(seed, gx, gy, 23),
        wild = wmFbm(X * 0.0052 + 17, Y * 0.0052 + 3, 3),
        x = jx - tx0,
        y = jy - ty0,
        mine = x >= 0 && y >= 0 && x < WN && y < WN;
      if (R > 0.34 && z < 0.016) {
        for (let i = 0; i < 4; i++) {
          const bx = x - 5 + i * 3,
            bh = 3 + ((wHash(seed, gx, i, 27) * 4) | 0);
          g.fillStyle = '#14100f';
          g.fillRect(bx, y - bh, 3, bh);
          g.fillStyle = '#ff7a3c';
          if (wHash(seed, gy, i, 28) < 0.5) g.fillRect(bx + 1, y - bh + 1, 1, 1);
        }
        if (mine) c.sites.push({ t: 'town', x: wx, y: wy, p: z * 400 });
      } else if (ridge > 0.94 && z < 0.55 && bm !== 'bog') {
        const s = 5 + ((wHash(seed, gx, gy, 24) * 5) | 0);
        if (bm === 'frost') mount(x, y, s, '#9fb4bf', '#31434f', 1);
        else if (bm === 'lava') {
          mount(x, y, s, '#4a2118', '#1a0d0c', 0, '#ffb13c');
          if (mine && wHash(seed, gx, gy, 29) < 0.45) c.sites.push({ t: 'smoke', x: wx, y: wy - s * WT, p: z * 50 });
        } else if (bm === 'blood') mount(x, y, s, '#6b2422', '#260f11');
        else mount(x, y, s, R > 0.5 ? '#6f5548' : '#7d7762', R > 0.5 ? '#2d2223' : '#26241f');
      } else if (wild > 0.52 && z < 0.45) {
        if (bm === 'frost') {
          g.fillStyle = '#23323d';
          g.fillRect(x, y - 2, 1, 3);
          g.fillStyle = '#e6f0f4';
          g.fillRect(x - 1, y - 3, 3, 1);
        } else if (bm === 'bog') {
          g.fillStyle = '#1b2a1b';
          g.fillRect(x, y - 3, 1, 4);
          g.fillStyle = '#a6c76a';
          g.fillRect(x - 1, y - 3, 3, 1);
          if (mine && z < 0.05) c.sites.push({ t: 'gas', x: wx, y: wy, p: z * 400 });
        } else if (bm === 'lava' || R > 0.56) {
          g.fillStyle = '#17100f';
          g.fillRect(x, y - 3, 1, 4);
          g.fillRect(x - 1, y - 2, 3, 1);
          if (mine && z < 0.06) c.sites.push({ t: 'fire', x: wx, y: wy - 8, p: z * 300 });
        } else if (z < 0.1) {
          g.fillStyle = '#20261c';
          g.fillRect(x, y - 2, 1, 3);
        }
      }
    }
  /* 裂口：十二位神砸出來的深谷 */
  for (const k in wRifts(seed)) {
    const [q, r] = wXY(k),
      [wx, wy] = wmPos(q, r),
      X = wx / WT - tx0,
      Y = wy / WT - ty0;
    if (X < -60 || Y < -60 || X > WN + 60 || Y > WN + 60) continue;
    const a = wHash(seed, q, r, 31) * Math.PI,
      pts = [];
    for (let i = -6; i <= 6; i++)
      pts.push([
        X + Math.cos(a) * i * 6 + (wHash(seed, q, i, 32) - 0.5) * 7,
        Y + Math.sin(a) * i * 6 + (wHash(seed, r, i, 33) - 0.5) * 7
      ]);
    for (const [col, ex] of [
      ['#ff8a4c', 1],
      ['#080508', 0]
    ]) {
      g.fillStyle = col;
      for (let i = 0; i < 12; i++)
        for (let u = 0; u < 1; u += 0.1) {
          const t = i + u,
            w = Math.max(0.6, 3 - Math.abs(t - 6) * 0.5) + ex,
            x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u,
            y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u;
          g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), Math.ceil(w), Math.ceil(w));
        }
    }
  }
}

/* ---------- 區塊：每幀烘一點，靠畫面中心的先做 ---------- */
const wmCap = () => (TOUCH.on ? 48 : 96);
function wmChunkNew(cx, cy) {
  const can = document.createElement('canvas');
  can.width = can.height = WN;
  const g = can.getContext('2d');
  return {
    cx,
    cy,
    can,
    g,
    sites: [],
    y: -1,
    up: new Float32Array(WN + 1),
    im: g.createImageData(WN, WN),
    ready: false
  };
}
/* 烘 c 到時間用完；回傳 true＝烘好了 */
function wmBake(c, until) {
  const d = c.im.data,
    tx0 = c.cx * WN,
    ty0 = c.cy * WN;
  while (c.y < WN) {
    const y = c.y,
      ty = ty0 + y,
      wy = (ty + 0.5) * WT,
      cur = new Float32Array(WN + 1);
    for (let x = -1; x < WN; x++) cur[x + 1] = wmH((tx0 + x + 0.5) * WT, wy);
    if (y >= 0)
      for (let x = 0; x < WN; x++) {
        const tx = tx0 + x,
          b = WM_BAYER[(ty & 3) * 4 + (tx & 3)],
          col = wmTexel(cur[x + 1], c.up[x], b, (tx + 0.5) * WT, wy, tx, ty),
          k = (y * WN + x) * 4;
        d[k] = col[0];
        d[k + 1] = col[1];
        d[k + 2] = col[2];
        d[k + 3] = 255;
      }
    c.up = cur;
    c.y++;
    if (performance.now() > until) return false;
  }
  c.g.putImageData(c.im, 0, 0);
  wmStamps(c);
  c.im = c.up = null;
  c.ready = true;
  return true;
}
/* 這一幀看得到哪些區塊 */
function wmVisible() {
  const hw = WM.W / 2 / WM.z,
    hh = WM.H / 2 / WM.z,
    L = [];
  for (let cy = Math.floor((WM.y - hh) / WC); cy <= Math.floor((WM.y + hh) / WC); cy++)
    for (let cx = Math.floor((WM.x - hw) / WC); cx <= Math.floor((WM.x + hw) / WC); cx++) L.push([cx, cy]);
  return L;
}
function wmBakeStep() {
  const until = performance.now() + WB;
  for (;;) {
    if (!WM.job || WM.job.ready) {
      let best = null,
        bd = 1e18;
      for (const [cx, cy] of wmVisible()) {
        const c = WM.ch.get(cx + ',' + cy);
        if (c && (c.ready || c === WM.job)) continue;
        const d = ((cx + 0.5) * WC - WM.x) ** 2 + ((cy + 0.5) * WC - WM.y) ** 2;
        if (d < bd) (bd = d), (best = [cx, cy]);
      }
      if (!best) return;
      const k = best.join(',');
      WM.job = WM.ch.get(k) || wmChunkNew(best[0], best[1]);
      WM.ch.delete(k);
      WM.ch.set(k, WM.job);
      /* LRU：Map 照放進去的順序，最舊的在前面；看得到的區塊在畫的時候會更新順序 */
      while (WM.ch.size > wmCap()) {
        const old = WM.ch.keys().next().value;
        if (WM.ch.get(old) === WM.job) break;
        WM.ch.delete(old);
      }
    }
    if (wmBake(WM.job, until)) WM.dirty = true;
    if (performance.now() > until) return;
  }
}

/* ---------- 節點、路、迷霧 ---------- */
function wmNodes() {
  const s = S,
    keys = wList(s),
    seen = new Set(keys),
    D = wDone(s),
    seed = s.world.seed;
  WM.nodes = keys.map(k => {
    const [q, r] = wXY(k),
      [x, y] = wmPos(q, r);
    return { k, q, r, x, y, t: wType(s, q, r), done: D.has(k), can: wCan(s, q, r) };
  });
  WM.edges = [];
  for (const n of WM.nodes)
    for (const [a, b] of wNear(seed, n.q, n.r)) {
      const o = wKey(a, b);
      if (!seen.has(o) || o < n.k) continue;
      const [x, y] = wmPos(a, b);
      WM.edges.push({
        x1: n.x,
        y1: n.y,
        x2: x,
        y2: y,
        on: n.done && D.has(o),
        h1: wHash(seed, n.q + a, n.r + b, 44),
        h2: wHash(seed, n.q + a, n.r + b, 45)
      });
    }
  WM.goal = wGoal(s);
  WM.dirty = true;
}
/* 節點圖示：11×11 點陣，照顏色烘成小圖 */
const WM_ICO = {
  story: [
    '...##......',
    '...####....',
    '...######..',
    '...####....',
    '...##......',
    '...#.......',
    '...#.......',
    '...#.......',
    '...#.......',
    '..###......',
    '.#####.....'
  ],
  dawn: [
    '.....#.....',
    '....###....',
    '...#####...',
    '..##+#+##..',
    '.##+++++##.',
    '##+++.+++##',
    '#+++...+++#',
    '#+++...+++#',
    '###########',
    '...........',
    '...........'
  ],
  crow: [
    '...........',
    '..####.....',
    '.#+#####...',
    '###########',
    '..#######..',
    '...#####...',
    '...#####...',
    '....###....',
    '....#.#....',
    '...##.##...',
    '...........'
  ],
  star: [
    '.....#.....',
    '.....#.....',
    '....###....',
    '..#######..',
    '#####+#####',
    '..#######..',
    '....###....',
    '.....#.....',
    '.....#.....',
    '...........',
    '...........'
  ],
  blood: [
    '.....#.....',
    '....###....',
    '....###....',
    '...#####...',
    '..#######..',
    '..##+####..',
    '.##+######.',
    '.##+######.',
    '..#######..',
    '...#####...',
    '...........'
  ],
  rift: [
    '......#....',
    '.....##....',
    '....##.....',
    '...###.....',
    '...####....',
    '....###....',
    '.....##....',
    '....##.....',
    '...##......',
    '...#.......',
    '..#........'
  ],
  plain: [
    '...........',
    '...........',
    '....###....',
    '...#####...',
    '..###+###..',
    '..##+++##..',
    '.##+++++##.',
    '.#########.',
    '...........',
    '...........',
    '...........'
  ]
};
const WM_IC = {};
function wmIcons() {
  for (const k in WM_ICO) {
    const c = document.createElement('canvas');
    c.width = c.height = 11;
    const g = c.getContext('2d'),
      col = WTYPE[k].c;
    WM_ICO[k].forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        g.fillStyle = ch === '#' ? col : shade(col, -0.45);
        g.fillRect(x, y, 1, 1);
      })
    );
    WM_IC[k] = c;
  }
}
/* 迷霧的洞：預先畫好一張，蓋章 */
function wmHole() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'),
    r = g.createRadialGradient(32, 32, 11, 32, 32, 32);
  r.addColorStop(0, 'rgba(0,0,0,1)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return c;
}
function wmFog() {
  const f = WM.fc,
    W = (f.canvas.width = Math.ceil(WM.W / 8)),
    H = (f.canvas.height = Math.ceil(WM.H / 8)),
    S2 = (x, y) => [((x - WM.x) * WM.z + WM.W / 2) / 8, ((y - WM.y) * WM.z + WM.H / 2) / 8];
  f.fillStyle = '#0d0e11';
  f.fillRect(0, 0, W, H);
  f.globalCompositeOperation = 'destination-out';
  /* 世界展開：紅色的環從中心往外推，推過的地方看得到但比較暗 */
  if (WM.wipe > 0) {
    if (WM.wipe >= 1) {
      f.fillStyle = 'rgba(0,0,0,0.62)';
      f.fillRect(0, 0, W, H);
    } else {
      const [cx, cy] = S2(0, 0),
        r = ((80 + WM.wipe * 2400) * WM.z) / 8,
        g = f.createRadialGradient(cx, cy, r * 0.7, cx, cy, r);
      g.addColorStop(0, 'rgba(0,0,0,0.62)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      f.fillStyle = g;
      f.fillRect(0, 0, W, H);
    }
  }
  for (const n of WM.nodes) {
    if (!n.done && STORY_I[n.k] == null) continue;
    const [x, y] = S2(n.x, n.y),
      R = ((STORY_I[n.k] != null ? 170 : 150) * WM.z) / 8;
    if (x < -R || y < -R || x > W + R || y > H + R) continue;
    f.drawImage(WM.hole, x - R, y - R, R * 2, R * 2);
  }
  f.globalCompositeOperation = 'source-over';
}
const wmS = (x, y) => [(x - WM.x) * WM.z + WM.W / 2, (y - WM.y) * WM.z + WM.H / 2];
function wmDots(g, e) {
  const [x1, y1] = wmS(e.x1, e.y1),
    [x3, y3] = wmS(e.x2, e.y2),
    mx = (e.x1 + e.x2) / 2 + (e.y2 - e.y1) * (e.h1 - 0.5) * 0.5,
    my = (e.y1 + e.y2) / 2 - (e.x2 - e.x1) * (e.h2 - 0.5) * 0.5,
    [xm, ym] = wmS(mx, my),
    L = Math.hypot(x3 - x1, y3 - y1),
    n = Math.max(3, Math.floor(L / 7));
  for (let i = 1; i < n; i++) {
    const t = i / n,
      u = 1 - t,
      x = u * u * x1 + 2 * u * t * xm + t * t * x3,
      y = u * u * y1 + 2 * u * t * ym + t * t * y3;
    g.push(Math.round(x), Math.round(y));
  }
}
function wmBase() {
  const c = WM.bc,
    { W, H, z, dpr } = WM;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#0c1014';
  c.fillRect(0, 0, W, H);
  for (const [cx, cy] of wmVisible()) {
    const k = cx + ',' + cy,
      ch = WM.ch.get(k),
      [x0, y0] = wmS(cx * WC, cy * WC),
      [x1, y1] = wmS((cx + 1) * WC, (cy + 1) * WC),
      X = Math.floor(x0),
      Y = Math.floor(y0),
      w = Math.ceil(x1) - X,
      h = Math.ceil(y1) - Y;
    if (ch && ch.ready) {
      WM.ch.delete(k);
      WM.ch.set(k, ch);
      c.drawImage(ch.can, X, Y, w, h);
    } else {
      c.fillStyle = WM_FILL[wmBiome((cx + 0.5) * WC, (cy + 0.5) * WC)];
      c.fillRect(X, Y, w, h);
    }
  }
  wmFog();
  c.imageSmoothingEnabled = true;
  c.drawImage(WM.fc.canvas, 0, 0, W, H);
  c.imageSmoothingEnabled = false;
  /* 區域名：地圖上直接寫，取代等級線 */
  if (wOpen(S) && z < 1) {
    c.textAlign = 'center';
    c.font = `700 ${Math.max(14, 26 * z + 6)}px "Noto Serif TC", serif`;
    c.lineWidth = 4;
    WREGION.forEach(([n, r], i) => {
      const a = -1.15 + i * 1.72,
        R = (r + 3) * W_SZ * 1.62,
        [x, y] = wmS(Math.cos(a) * R, Math.sin(a) * R),
        t = [...n].join(' ');
      c.strokeStyle = 'rgba(13,14,17,.85)';
      c.fillStyle = 'rgba(233,226,206,.72)';
      c.strokeText(t, x, y);
      c.fillText(t, x, y);
    });
  }
  /* 路 */
  const L = [],
    D = [];
  for (const e of WM.edges) {
    const a = wmS(e.x1, e.y1),
      b = wmS(e.x2, e.y2);
    if (
      Math.max(a[0], b[0]) < -20 ||
      Math.max(a[1], b[1]) < -20 ||
      Math.min(a[0], b[0]) > W + 20 ||
      Math.min(a[1], b[1]) > H + 20
    )
      continue;
    wmDots(e.on ? D : L, e);
  }
  const dots = (P, s, o, col) => {
    c.fillStyle = col;
    c.beginPath();
    for (let i = 0; i < P.length; i += 2) c.rect(P[i] - o, P[i + 1] - o, s, s);
    c.fill();
  };
  dots([...L, ...D], 5, 2, 'rgba(8,8,10,.85)');
  dots(L, 3, 1, '#b9b09a');
  dots(D, 3, 1, '#ffe9b0');
  /* 節點 */
  const big = z >= 0.62 ? 2 : 1;
  for (const n of WM.nodes) {
    const [x, y] = wmS(n.x, n.y);
    if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
    const sel = WM.sel === n.k,
      s = n.t === 'rift' || n.t === 'story' ? Math.max(2, big) : big,
      sz = 11 * s,
      b = sz / 2 + 5;
    c.beginPath();
    c.moveTo(x, y - b);
    c.lineTo(x + b, y);
    c.lineTo(x, y + b);
    c.lineTo(x - b, y);
    c.closePath();
    c.fillStyle = 'rgba(13,14,17,.92)';
    c.fill();
    c.lineWidth = sel ? 3 : 1.5;
    c.strokeStyle = sel ? '#fff' : n.done ? '#6d7280' : WTYPE[n.t].c;
    c.stroke();
    c.globalAlpha = n.done ? 0.45 : 1;
    c.drawImage(WM_IC[n.t], Math.round(x - sz / 2), Math.round(y - sz / 2), sz, sz);
    c.globalAlpha = 1;
    if (sel || (n.can && z >= 0.62)) {
      const lab = sel ? wName(S, n.q, n.r) : 'Lv ' + wLv(n.q, n.r);
      c.font = `700 ${sel ? 13 : 12}px "Noto Sans TC", sans-serif`;
      c.textAlign = 'center';
      const w = c.measureText(lab).width + 12;
      c.fillStyle = 'rgba(23,24,27,.92)';
      c.fillRect(x - w / 2, y + b + 5, w, 20);
      c.strokeStyle = '#5f636e';
      c.lineWidth = 1;
      c.strokeRect(x - w / 2 + 0.5, y + b + 5.5, w - 1, 19);
      c.fillStyle = '#e9eaed';
      c.fillText(lab, x, y + b + 19);
    }
  }
  /* 目前位置 */
  const [ax, ay] = wmS(...wmPos(...wXY(S.world.at))),
    hx = Math.round(ax),
    hy = Math.round(ay);
  c.fillStyle = '#fff';
  c.fillRect(hx - 3, hy - 28, 6, 6);
  c.fillStyle = '#e5484d';
  c.fillRect(hx - 3, hy - 22, 6, 8);
  c.fillStyle = '#17181b';
  c.fillRect(hx - 4, hy - 14, 8, 2);
}

/* ---------- 環境特效：只在世界展開之後（整片大陸都在燃燒） ---------- */
const WM_ASH = Array.from({ length: 46 }, (_, i) => ({
  x: wHash(0, i, 1, 51),
  y: wHash(0, i, 2, 51),
  v: 8 + wHash(0, i, 3, 51) * 26,
  e: wHash(0, i, 4, 51) < 0.45
}));
const WM_FLOCK = [0, 1, 2, 3].map(i => ({ a: i * 1.6, d: 420 + i * 260, v: 0.00006 + i * 0.00002 }));
let wmBolt = null,
  wmBoltT = 5000;
/* 下一目標：黃色箭頭，走出畫面時貼在邊緣指過去 */
function wmGoalMark(now, still) {
  if (!WM.goal) return;
  const c = WM.cx,
    { W, H } = WM,
    [wx, wy] = wmPos(...wXY(WM.goal)),
    [x, y] = wmS(wx, wy),
    m = 30,
    out = x < m || y < 70 || x > W - m || y > H - m,
    bob = still ? 0 : Math.sin(now / 260) * 3,
    px = clamp(x, m, W - m),
    py = clamp(y, 70, H - m),
    a = out ? Math.atan2(y - py, x - px) : Math.PI / 2,
    ax = out ? px : x,
    ay = out ? py : y - 34 + bob;
  c.save();
  c.translate(Math.round(ax), Math.round(ay));
  c.rotate(a - Math.PI / 2);
  c.fillStyle = '#17181b';
  c.beginPath();
  c.moveTo(-10, -8);
  c.lineTo(10, -8);
  c.lineTo(0, 10);
  c.closePath();
  c.fill();
  c.fillStyle = WTYPE.story.c;
  c.beginPath();
  c.moveTo(-7, -6);
  c.lineTo(7, -6);
  c.lineTo(0, 6);
  c.closePath();
  c.fill();
  c.restore();
}
function wmFx(now) {
  const c = WM.cx,
    { W, H, z } = WM,
    on = WM.wipe,
    still = wmStill(),
    cull = (x, y) => x < -60 || y < -120 || x > W + 60 || y > H + 60,
    px = Math.max(2, Math.round(z * 3));
  /* 走得到的節點：呼吸的外框 */
  const pulse = still ? 1 : 0.5 + 0.5 * Math.sin(now / 320);
  for (const n of WM.nodes) {
    if (!n.can) continue;
    const [x, y] = wmS(n.x, n.y);
    if (cull(x, y)) continue;
    const b = ((n.t === 'rift' || n.t === 'story' || z >= 0.62 ? 22 : 11) >> 0) / 2 + 12;
    c.globalAlpha = 0.25 + 0.55 * pulse;
    c.strokeStyle = WTYPE[n.t].c;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, y - b);
    c.lineTo(x + b, y);
    c.lineTo(x, y + b);
    c.lineTo(x - b, y);
    c.closePath();
    c.stroke();
    c.globalAlpha = 1;
  }
  wmGoalMark(now, still);
  if (!on) return;
  /* 世界展開：紅色的環往外推 */
  if (on > 0.02 && on < 0.995) {
    const [x, y] = wmS(0, 0);
    c.strokeStyle = `rgba(229,72,77,${0.7 * (1 - on)})`;
    c.lineWidth = 40 * z + 6;
    c.beginPath();
    c.arc(x, y, (80 + on * 2400) * z * 0.92, 0, Math.PI * 2);
    c.stroke();
  }
  /* 裂口光柱，直通天上的裂縫 */
  c.globalCompositeOperation = 'lighter';
  for (const n of WM.nodes) {
    if (n.t !== 'rift' || n.done) continue;
    const [x, y] = wmS(n.x, n.y),
      h = 520 * z,
      w = 5 * z + 2,
      g = c.createLinearGradient(0, y, 0, y - h);
    g.addColorStop(0, 'rgba(255,110,60,.5)');
    g.addColorStop(0.4, 'rgba(229,60,60,.16)');
    g.addColorStop(1, 'rgba(229,60,60,0)');
    c.globalAlpha = on * (still ? 0.8 : 0.72 + 0.28 * Math.sin(now / 600 + n.q));
    c.fillStyle = g;
    c.fillRect(x - w / 2, y - h, w, h);
  }
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = on;
  for (const [cx, cy] of wmVisible()) {
    const ch = WM.ch.get(cx + ',' + cy);
    if (!ch || !ch.ready) continue;
    for (const s of ch.sites) {
      const [x, y] = wmS(s.x, s.y);
      if (cull(x, y)) continue;
      const t = still ? 0 : now / 1000 + s.p;
      if (s.t === 'fire' || s.t === 'town') {
        const f = Math.floor(t * 9) % 3,
          n = s.t === 'town' ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const o = (i - (n - 1) / 2) * 3 * px;
          c.fillStyle = '#ff7a2e';
          c.fillRect(x + o - px, y - px * (2 + f), px * 2, px * (2 + f));
          c.fillStyle = '#ffd166';
          c.fillRect(x + o - px / 2, y - px * (1 + f / 2), px, px);
        }
      }
      if (s.t === 'town' || s.t === 'smoke')
        for (let i = 0; i < 5; i++) {
          const p = (t * 0.22 + i / 5) % 1,
            sz = px * (2 + p * 6);
          c.fillStyle = `rgba(32,28,30,${(1 - p) * 0.34})`;
          c.fillRect(x + Math.sin(p * 6 + s.p) * 10 * z - sz / 2, y - p * 110 * z - sz, sz, sz);
        }
      if (s.t === 'gas')
        for (let i = 0; i < 3; i++) {
          const p = (t * 0.3 + i / 3) % 1;
          c.fillStyle = `rgba(150,210,90,${(1 - p) * 0.55})`;
          c.fillRect(x + Math.sin(p * 8 + i) * 8 * z, y - p * 34 * z, px, px);
        }
    }
  }
  /* 鴉群 */
  c.fillStyle = '#0a0a0d';
  for (const f of WM_FLOCK) {
    const a = f.a + (still ? 0 : now * f.v),
      bx = Math.cos(a) * f.d,
      by = Math.sin(a) * f.d * 0.7;
    for (let i = 0; i < 7; i++) {
      const [x, y] = wmS(bx + (wHash(0, i, 1, 52) - 0.5) * 90, by + (wHash(0, i, 2, 52) - 0.5) * 60);
      if (cull(x, y)) continue;
      const w = Math.floor(now / 170 + i) % 2 ? 1 : 2;
      c.fillRect(x - 3, y - w, 3, 1);
      c.fillRect(x + 1, y - w, 3, 1);
      c.fillRect(x, y, 1, 1);
    }
  }
  c.globalAlpha = 1;
  if (still) return;
  /* 灰燼與閃電：從天上的裂縫打到大地 */
  c.globalAlpha = Math.min(1, on);
  for (const a of WM_ASH) {
    const y = (a.y * H + now * 0.001 * a.v) % H,
      x = (a.x * W + Math.sin(now * 0.0006 + a.y * 9) * 18 + W) % W;
    c.fillStyle = a.e ? '#ff8a4c' : 'rgba(190,186,178,.55)';
    c.fillRect(x, y, 2, 2);
  }
  c.globalAlpha = 1;
  if (now > wmBoltT) {
    wmBoltT = now + 3500 + Math.random() * 4500;
    const x0 = W * (0.25 + Math.random() * 0.5),
      pts = [[x0, 56]],
      end = 140 + Math.random() * (H - 200);
    let x = x0,
      y = 56;
    while (y < end) {
      y += 26 + Math.random() * 30;
      x += (Math.random() - 0.5) * 60;
      pts.push([x, y]);
    }
    wmBolt = { t: now, pts };
  }
  if (wmBolt && now - wmBolt.t < 320) {
    const a = 1 - (now - wmBolt.t) / 320;
    c.beginPath();
    wmBolt.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = `rgba(255,120,110,${a * 0.55})`;
    c.lineWidth = 7;
    c.stroke();
    c.strokeStyle = `rgba(255,240,235,${a})`;
    c.lineWidth = 2;
    c.stroke();
  }
}
/* 天空的裂縫：掛在畫面最上方，永遠看得到 */
function wmCrack(now) {
  const c = WM.cx,
    W = WM.W,
    g = c.createLinearGradient(0, 0, 0, 96),
    w0 = W * 0.5 - Math.min(W * 0.42, 330),
    N = 22,
    dx = ((W * 0.5 - w0) * 2) / N,
    pulse = wmStill() ? 1 : 0.5 + 0.5 * Math.sin(now / 320);
  g.addColorStop(0, 'rgba(10,9,12,.96)');
  g.addColorStop(1, 'rgba(10,9,12,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, 96);
  c.beginPath();
  for (let i = 0; i <= N; i++) {
    const y = 54 + (wHash(0, i, 7, 53) - 0.5) * 15 - Math.sin((i / N) * Math.PI) * 7;
    if (i) c.lineTo(w0 + i * dx, y);
    else c.moveTo(w0, y);
  }
  c.lineJoin = 'bevel';
  c.strokeStyle = `rgba(229,72,77,${0.22 + 0.1 * pulse})`;
  c.lineWidth = 9;
  c.stroke();
  c.strokeStyle = '#ff6b5e';
  c.lineWidth = 2.5;
  c.stroke();
  c.strokeStyle = '#ffd9cc';
  c.lineWidth = 1;
  c.stroke();
}

/* ---------- 鏡頭 ---------- */
const WM_ZMIN = 0.3,
  WM_ZMAX = 1.8;
/* 鏡頭最遠到走過最遠的圈再往外 12 圈，不會一路拖到遠方狂烘 */
function wmBound() {
  let m = 16; /* 裂口最遠在第 25 圈，看得到才知道往哪走 */
  for (const k of S.world.done) m = Math.max(m, wRing(...wXY(k)));
  return (m + 12) * W_SZ * 1.8;
}
function wmZoomAt(mx, my, z) {
  const r = WM.cv.getBoundingClientRect(),
    nz = clamp(z, WM_ZMIN, WM_ZMAX),
    px = mx - r.left - WM.W / 2,
    py = my - r.top - WM.H / 2;
  WM.x += px / WM.z - px / nz;
  WM.y += py / WM.z - py / nz;
  WM.z = nz;
  WM.dirty = true;
}
function wmCenter(k, z) {
  const [x, y] = wmPos(...wXY(k));
  WM.x = x;
  WM.y = y;
  if (z) WM.z = Math.max(WM.z, z);
  WM.vx = WM.vy = 0;
  WM.dirty = true;
}
function wmMove(dt) {
  if (WM.anim || WM.drag || WM.pinch) return;
  /* 慣性＋軟邊界：任何時候按下去都能接住 */
  if (WM.vx || WM.vy) {
    WM.x += WM.vx * dt;
    WM.y += WM.vy * dt;
    const k = Math.exp(-dt * 4.5);
    WM.vx *= k;
    WM.vy *= k;
    if (Math.hypot(WM.vx, WM.vy) < 8) WM.vx = WM.vy = 0;
    WM.dirty = true;
  }
  const B = wmBound(),
    d = Math.hypot(WM.x, WM.y);
  if (d > B) {
    const k = 1 + (B / d - 1) * (1 - Math.exp(-dt * 10));
    WM.x *= k;
    WM.y *= k;
    if (d - B < 1) (WM.x *= B / d), (WM.y *= B / d);
    WM.dirty = true;
  }
}
function wmFrame(now, dt) {
  const r = WM.cv.getBoundingClientRect(),
    dpr = Math.min(TOUCH.on ? 1.5 : 2, devicePixelRatio || 1),
    W = Math.round(r.width),
    H = Math.round(r.height);
  if (!W || !H) return;
  if (W !== WM.W || H !== WM.H || dpr !== WM.dpr) {
    Object.assign(WM, { W, H, dpr, dirty: true });
    WM.cv.width = WM.bc.canvas.width = Math.round(W * dpr);
    WM.cv.height = WM.bc.canvas.height = Math.round(H * dpr);
  }
  if (WM.anim) WM.anim(now);
  wmMove(dt);
  wmBakeStep();
  /* 手機閒著時 30 fps */
  WM.tick++;
  if (TOUCH.on && !WM.dirty && WM.tick & 1) return;
  if (WM.dirty) {
    WM.dirty = false;
    wmBase();
  }
  const c = WM.cx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.imageSmoothingEnabled = false;
  c.drawImage(WM.bc.canvas, 0, 0);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  wmFx(now);
  wmCrack(now);
}

/* ---------- 開關與手勢 ---------- */
function wmInit() {
  if (WM.cv) return;
  wmIcons();
  $('pdev').innerHTML = `<div class="wm-map"><canvas id="wmc" aria-label="世界地圖，點選地點"></canvas>
    <button class="wm-rift" id="wmr" data-wm="quest"></button>
    <div class="wm-cap" id="wmcap" hidden><p></p></div>
    <div class="wm-tools">
      <button class="btn" data-wm="me" aria-label="回到目前位置"><svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4"/><path d="M8 0v3M8 13v3M0 8h3M13 8h3"/></svg></button>
      <button class="btn" data-wm="zo" aria-label="縮小"><svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h12"/></svg></button>
      <button class="btn" data-wm="zi" aria-label="放大"><svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h12M8 2v12"/></svg></button>
    </div></div>
    <aside class="wm-side" id="wms"></aside>`;
  WM.cv = $('wmc');
  WM.cx = WM.cv.getContext('2d', { alpha: false });
  WM.bc = document.createElement('canvas').getContext('2d', { alpha: false });
  WM.fc = document.createElement('canvas').getContext('2d');
  WM.hole = wmHole();
  const el = WM.cv,
    TP = new Map(),
    pinchD = () => {
      const [a, b] = [...TP.values()];
      return [Math.hypot(a.x - b.x, a.y - b.y), (a.x + b.x) / 2, (a.y + b.y) / 2];
    };
  el.addEventListener('pointerdown', e => {
    TP.set(e.pointerId, { x: e.clientX, y: e.clientY });
    el.setPointerCapture(e.pointerId);
    WM.vx = WM.vy = 0;
    /* 演出可以被打斷：一碰就停在現在的位置，迷霧直接散開 */
    if (WM.anim) wmRevealEnd();
    if (TP.size === 2) {
      const [d, cx, cy] = pinchD();
      WM.pinch = { d, z: WM.z, cx, cy };
      WM.drag = null;
      return;
    }
    WM.drag = { x: e.clientX, y: e.clientY, cx: WM.x, cy: WM.y, m: 0, h: [[e.clientX, e.clientY, performance.now()]] };
  });
  el.addEventListener('pointermove', e => {
    if (TP.has(e.pointerId)) TP.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (WM.pinch && TP.size >= 2) {
      const [d, cx, cy] = pinchD();
      /* 兩指同時移動就是拖 */
      WM.x -= (cx - WM.pinch.cx) / WM.z;
      WM.y -= (cy - WM.pinch.cy) / WM.z;
      WM.pinch.cx = cx;
      WM.pinch.cy = cy;
      return wmZoomAt(cx, cy, (WM.pinch.z * d) / WM.pinch.d);
    }
    const g = WM.drag;
    if (!g) return;
    const dx = e.clientX - g.x,
      dy = e.clientY - g.y;
    g.m = Math.max(g.m, Math.hypot(dx, dy));
    if (g.m <= 8) return;
    el.classList.add('drag');
    WM.x = g.cx - dx / WM.z;
    WM.y = g.cy - dy / WM.z;
    g.h.push([e.clientX, e.clientY, performance.now()]);
    if (g.h.length > 5) g.h.shift();
    WM.dirty = true;
  });
  const up = e => {
    TP.delete(e.pointerId);
    el.classList.remove('drag');
    if (WM.pinch) {
      if (TP.size < 2) WM.pinch = null;
      WM.drag = null;
      return;
    }
    const g = WM.drag;
    WM.drag = null;
    if (!g || e.type !== 'pointerup') return;
    if (g.m <= 8) return wmTap(e);
    const [a, b] = [g.h[0], g.h[g.h.length - 1]],
      t = (b[2] - a[2]) / 1000;
    /* 停住才放開就不滑：只看放開前一刻的速度 */
    if (t > 0 && t < 0.2 && performance.now() - b[2] < 60 && !wmStill()) {
      WM.vx = -(b[0] - a[0]) / t / WM.z;
      WM.vy = -(b[1] - a[1]) / t / WM.z;
    }
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener(
    'wheel',
    e => {
      e.preventDefault();
      wmZoomAt(e.clientX, e.clientY, WM.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
    },
    { passive: false }
  );
  $('pdev').addEventListener('click', e => {
    const b = e.target.closest('[data-wm]');
    if (!b) return;
    const a = b.dataset.wm;
    if (a === 'me') wmCenter(S.world.at, 0.9);
    else if (a === 'zi') wmZoomAt(WM.W / 2, WM.H / 2, WM.z * 1.25);
    else if (a === 'zo') wmZoomAt(WM.W / 2, WM.H / 2, WM.z / 1.25);
    else if (a === 'quest') (WM.view = WM.view === 'quest' ? 'node' : 'quest'), wmPanel();
    else if (a === 'goal') {
      WM.view = 'node';
      if (WM.goal) wmSel(WM.goal), wmCenter(WM.goal);
    } else if (a === 'wash') {
      if (!wWash(S, WM.sel)) return hudWarn('碎片不夠');
      PANEL.card = 0;
      sfx('click');
      save();
      wmPanel();
    }
  });
}
function wmTap(e) {
  const r = WM.cv.getBoundingClientRect(),
    mx = e.clientX - r.left,
    my = e.clientY - r.top;
  let best = null,
    bd = TOUCH.on ? 34 : 28;
  for (const n of WM.nodes) {
    const [x, y] = wmS(n.x, n.y),
      d = Math.hypot(x - mx, y - my);
    if (d < bd) (bd = d), (best = n);
  }
  if (best) wmSel(best.k);
}
function wmSel(k) {
  WM.sel = k;
  WM.view = 'node';
  PANEL.card = 0;
  WM.dirty = true;
  sfx('click');
  wmPanel();
  save(); /* 卡是選到節點才抽的：馬上存，重新整理不能白洗 */
}
/* 打開世界地圖：seed 換了（換存檔）就清快取，鏡頭回到目前位置 */
function wmOpen() {
  wmInit();
  const seed = S.world.seed;
  if (seed !== WM.seed) {
    WM.seed = seed;
    WM.ox = wHash(seed, 1, 2, 91) * 40000;
    WM.oy = wHash(seed, 3, 4, 92) * 40000;
    WM.ch.clear();
    WM.job = null;
  }
  WM.on = true;
  WM.wipe = S.world.open ? 1 : 0;
  WM.anim = null;
  $('wmcap').hidden = true; /* 演出到一半按 Esc 關掉的話字幕還留著 */
  WM.view = 'node';
  WM.vx = WM.vy = 0;
  wmNodes();
  WM.sel = WM.goal || null;
  PANEL.card = 0;
  WM.z = 1;
  if (WM.sel) wmCenter(WM.sel);
  else wmCenter(S.world.at);
  wmStamp();
  if (wOpen(S) && !S.world.open) wmReveal();
  else wmStory();
}
/* 劇情區：第一次走到這一步時播對話 */
function wmStory() {
  const n = STORY[S.world.stage];
  if (n && !S.story[n.talk]) talkPlay(n.talk);
}
/* 世界展開：鏡頭拉遠，迷霧被紅色的環推開。一個人只看一次，碰一下就結束；減少動態時直接切，只留字幕 */
function wmReveal() {
  S.world.open = 1;
  save();
  const cap = $('wmcap'),
    D = wmStill() ? 1 : 3400,
    t0 = performance.now(),
    z0 = WM.z,
    x0 = WM.x,
    y0 = WM.y;
  cap.firstChild.textContent = '霧散開了。整片大陸都在燃燒。';
  cap.hidden = false;
  WM.sel = null;
  wmPanel();
  sfx('boss');
  WM.anim = now => {
    const f = Math.min(1, (now - t0) / D),
      e = 1 - (1 - f) ** 4;
    WM.z = z0 + (0.46 - z0) * e;
    WM.x = x0 * (1 - e);
    WM.y = y0 * (1 - e);
    WM.wipe = e;
    WM.dirty = true;
    if (f >= 1) wmRevealEnd();
  };
}
function wmRevealEnd() {
  WM.anim = null;
  WM.wipe = 1;
  WM.dirty = true;
  setTimeout(() => ($('wmcap').hidden = true), 1400);
  if (WM.goal) wmSel(WM.goal);
}
/* 地圖上的文字：裂縫列、面板 */
function wmStamp() {
  const zn = S.idols.length,
    h = S.hunt,
    on = S.story.crow;
  $('wmr').innerHTML =
    `<b>天空的裂縫</b>鎖定 · 主線 ${zn >= ZODIAC.length ? 1 : 0}／4${on ? ` · 生肖 ${zn}／${ZODIAC.length}` : ''}${
      on
        ? `<span class="wm-hunt ${h.full ? 'full' : ''}" role="progressbar" aria-label="血霧" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${h.v}"><i style="width:${h.v}%"></i></span>`
        : ''
    }`;
  wmPanel();
}
const WM_DN = ['', '低', '中', '高'];
function wmCardHTML(k, why, lv) {
  const i = STORY_I[k];
  if (i != null) {
    const c = STORY[i].card;
    return `<ul class="mmods wm-mods">${c.mods.map(m => `<li class="d${MAPMOD[m].d}">${termify(MAPMOD[m].t)}</li>`).join('') || '<li>沒有地圖詞</li>'}</ul>
      <p class="wm-note">主線是固定內容，不用選地圖卡</p>
      <button class="btn pri" data-a="open">${G.scene === 'map' ? '進入下一張' : '開啟傳送門'}</button>`;
  }
  const o = wCards(S, k),
    n = Math.min(PANEL.card || 0, W_CARDS - 1),
    card = o.c[n],
    c = mapCost(card.star),
    rw = cardRew(card),
    wc = washCost(lv, o.w),
    danger = cd => Math.max(1, ...cd.mods.map(x => MAPMOD[x].d));
  return `<div class="mcards2 wm-cards">${o.c
    .map((cd, j) => {
      const d = danger(cd),
        cc = mapCost(cd.star);
      return `<button class="mc2 ${j === n ? 'on' : ''}" data-card="${j}" style="--sc:${STARS[cd.star].c}">
        <span class="mstar">${'★'.repeat(cd.star)}</span>
        <span class="mdang d${d}">危險 ${WM_DN[d]}</span>
        <span class="mcost ${S.frag < cc ? 'c-bad' : ''}">${cc ? `${cc} 碎片` : '免費'}</span></button>`;
    })
    .join('')}</div>
    <div class="msel"><b>這張的地圖詞</b><span class="c-gold" title="數量：裝備與通貨的件數；稀有度：黃裝比例與 ★、追憶的機率；材料：崇高石與精髓的機率">數量 +${rw.qty}% · 稀有度 +${rw.rar}% · 材料 +${rw.mat}%</span></div>
    <ul class="mmods wm-mods">${card.mods.map(m => `<li class="d${MAPMOD[m].d}">${termify(MAPMOD[m].t)}</li>`).join('') || '<li>沒有地圖詞</li>'}</ul>
    <div class="wm-acts"><button class="btn" data-wm="wash" ${S.frag < wc ? 'disabled' : ''} title="換一批新的卡">洗卡 · ${wc} 碎片</button>
    <button class="btn pri" data-a="open" ${why || S.frag < c ? 'disabled' : ''} ${why ? `title="${esc(why)}"` : ''}>${why || (S.frag < c ? `碎片不夠（要 ${c}，有 ${S.frag}）` : `${G.scene === 'map' ? '進入下一張' : '開啟傳送門'}${c ? ` · ${c} 碎片` : ''}`)}</button></div>`;
}
function wmNodeHTML() {
  const k = WM.sel;
  if (!k) {
    const [q, r] = wXY(S.world.at);
    return `<h2>${wOpen(S) ? wRegion(Math.max(W_ROAD, wRing(q, r))) : STORY[0].n}</h2><p>${wOpen(S) ? '點一個發亮的地點。往外走會變難，橫著走難度不變。' : '點發亮的主線地點繼續前進。'}</p>`;
  }
  const [q, r] = wXY(k),
    t = wType(S, q, r),
    lv = wLv(q, r),
    i = STORY_I[k],
    done = wDone(S).has(k),
    why = wWhy(S, q, r),
    pen = resPen(lv),
    zod = t === 'rift' ? wZod(S, q, r) : null,
    head = `<h2>${esc(wName(S, q, r))}</h2><p class="wm-kind">${i != null ? '主線' : WTYPE[t].n} · 怪物 Lv ${lv}${pen ? ` · <span class="c-warn">元素抗性 −${pen}%</span>` : ''}</p><p>${esc(i != null ? STORY[i].d : WTYPE[t].d)}</p>`,
    cor = zod ? `<p class="wm-note">墮落詞：<span class="c-warn">${termify(MAPMOD[zod.cor].t)}</span></p>` : '';
  if (done) return head + '<p class="wm-note">已經走過，留在地圖上當路。</p>';
  /* 走不到的地方不抽卡：抽了也打不了 */
  if (!wCan(S, q, r)) return head + cor + `<p class="wm-note">${esc(why)}</p>`;
  const blood = S.hunt.full ? `<p class="c-warn">血霧 ${S.hunt.v}%：每進一張扣 ${HUNT.cost}%，5★ 地圖變多</p>` : '';
  return head + cor + blood + wmCardHTML(k, why, lv);
}
function wmQuestHTML() {
  const n = S.idols.length,
    lit = new Set(S.idols);
  return `<h2>天空的裂縫</h2><p class="wm-kind">鎖定 · 主線 ${n >= ZODIAC.length ? 1 : 0}／4</p>
    <p>十二道裂口之外，還有天上那一道。它還沒有打開。</p>
    <ul class="wm-q">
      <li><b>狩獵之血</b><span>${S.story.crow ? `生肖 ${n}／${ZODIAC.length}` : '還沒開始'}</span>
        ${S.story.crow ? `<div class="wm-zod">${ZODIAC.map(z => `<span class="${lit.has(z.z) ? 'on' : ''}" title="${esc(z.n)}">${icHTML(z.sp)}</span>`).join('')}</div>` : ''}</li>
      <li class="lock"><b>？？？</b><span>鎖定</span></li>
      <li class="lock"><b>？？？</b><span>鎖定</span></li>
      <li class="lock"><b>？？？</b><span>鎖定</span></li>
    </ul>
    ${WM.goal ? `<button class="btn" data-wm="goal">看下一個目標</button>` : ''}`;
}
function wmPanel() {
  if (!WM.cv || !PANEL.device) return;
  $('wms').innerHTML =
    `<div class="ph"><b>世界地圖</b><span>Lv ${S.lv} · 碎片 <b class="c-gold">${S.frag}</b></span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
    <div class="wm-body">${WM.view === 'quest' ? wmQuestHTML() : wmNodeHTML()}</div>`;
}
/* 面板上的主要按鈕 */
function wmGo() {
  const k = WM.sel;
  if (!k) return;
  if (G.scene === 'map') mapAgain(k, PANEL.card || 0);
  else openMap(k, PANEL.card || 0);
  closePanels();
}
