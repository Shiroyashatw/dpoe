/* dungeonPOE · 藏身處烘圖：地板、岩壁、擺設走同一個打光函式，量化成有限色帶＋Bayer 抖色，全場的光才一致。
   輸出 img/hide-*.png 與 js/hideart.js（圖、格子牆、擺設座標、前景遮擋；產生的，不要手改）。
   用法：node tools/hide_bake.js。1 格＝主角的 1 格像素（TX＝1.35 世界像素）；座標寫世界像素，t() 換成格 */
'use strict';
const fs = require('fs'),
  path = require('path'),
  zlib = require('zlib'),
  crypto = require('crypto');
const TX = 1.35,
  TS = 48,
  TAU = Math.PI * 2,
  { floor, sqrt, sin, cos, abs, min, max, hypot, PI } = Math,
  clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = (
  seed => () =>
    (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
)(19);
const RT = new Float32Array(65536);
for (let i = 0; i < 65536; i++) RT[i] = R();
const hs = (x, y) => RT[((x * 157 + y * 311) & 255) * 256 + ((x * 73 - y * 199) & 255)];
function vn(x, y) {
  const xi = floor(x),
    yi = floor(y),
    xf = x - xi,
    yf = y - yi,
    u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf),
    a = hs(xi, yi),
    b = hs(xi + 1, yi),
    c = hs(xi, yi + 1),
    d = hs(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 3) {
  let s = 0,
    a = 0.5,
    f = 1,
    t = 0;
  for (let i = 0; i < o; i++) (s += a * vn(x * f + i * 7.3, y * f)), (t += a), (a *= 0.5), (f *= 2.03);
  return s / t;
}
const BAYER = Float32Array.from(
  [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30,
    54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
    61, 29, 53, 21
  ],
  v => (v + 0.5) / 64 - 0.5
);
const ramp = s =>
  s.split(' ').map(h => {
    const n = parseInt(h.slice(1), 16);
    return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
  });
/* 材質：w 火光色帶、c 血光色帶、a 環境光、d 抖色強度 */
const mat = (w, c, a = 0.06, d = 0.9) => ({ w: ramp(w), c: ramp(c || w), a, d });
const M = {
  rock: mat(
    '#050408 #0b080c #131013 #1c1518 #281c1d #382522 #4e3226 #6b432c #8c5a34 #b27a41 #d99f58',
    '#050408 #0c070c #170a10 #240d14 #351018 #4a151c #641c21 #822627 #a4342d #c64c38 #e47a4d',
    0.1
  ),
  top: mat(
    '#040306 #08060a #0d0a0e #131013 #1a1518 #22191b',
    '#040306 #08060a #0f080c #170a10 #200d14 #2c1016',
    0.09,
    0.5
  ),
  dirt: mat(
    '#070506 #0e0a0b #161011 #1f1716 #2b1f1b #3a2a22 #4d392b #654b35 #836240 #a67f50 #cca364',
    '#070506 #0e090b #190c10 #260f14 #361318 #4a181c #621f21 #7e2926',
    0.1,
    0.75
  ),
  ash: mat('#08070a #101014 #1a191d #262428 #333036 #464045 #5e5656 #7a7068 #9a8e7c', 0, 0.09, 0.7),
  wood: mat(
    '#080505 #150c09 #24150e #372013 #4e2d18 #683d1f #875127 #a96a33 #cc8a45',
    '#080505 #170a0b #270e10 #3a1215 #52181a #6e2020',
    0.1
  ),
  iron: mat(
    '#06060a #101016 #1b1b22 #2a2a33 #3d3d48 #55555f #737379 #98989a #c4c0b8',
    '#06060a #120c12 #201016 #30151b #451c20 #5f2526',
    0.11
  ),
  bone: mat(
    '#0f0b0b #211a19 #392e2a #574839 #7b6952 #a08f70 #c4b48f #e2d6b4 #f4edd6',
    '#0f0b0b #231416 #3b1a1e #582326 #7a3430 #9e4e42 #c07a60',
    0.13
  ),
  clay: mat('#0d0706 #1e100c #321a12 #4a2718 #653620 #84492a #a56137 #c57f4a', '#0d0706 #200d0e #351214 #4e1a1a', 0.1),
  stone: mat(
    '#07070b #111116 #1c1b21 #29272e #38353c #4b464c #635c5e #7f7670 #a29688 #c8b9a0',
    '#07070b #120c12 #1f1016 #2f141a #431a1e #5c2224 #7a2d2a #9b3f34',
    0.15
  ),
  cloth: mat(
    '#0b0506 #1a090c #2c0d11 #431216 #5e181a #7b2220 #9c3128 #bf4a33',
    '#0b0506 #1a080b #2c0b10 #430f14',
    0.09
  ),
  tarp: mat('#0c0a09 #1b1612 #2c241c #413526 #594a33 #746142 #927c55 #b09a6c', '#0c0a09 #1c1012 #2e1518 #431c1c', 0.1),
  straw: mat('#0f0b05 #231a0a #3b2c10 #584217 #795b1f #9c772b #c09a3e #dfc05e', '#0f0b05 #24140b #3b1b10 #582515', 0.12)
};

/* ---------- 平面配置（世界座標） ---------- */
const L = {
  W: 1320,
  H: 1100,
  blobs: [
    [660, 530, 500, 200],
    [660, 690, 380, 170],
    [660, 430, 320, 70],
    [205, 600, 150, 150],
    [1115, 600, 150, 150]
  ],
  neg: [
    [352, 800, 42, 30],
    [1000, 782, 46, 30]
  ],
  win: [[660, 205, 300, 180]],
  tall: [
    [150, 300, 70],
    [1170, 300, 70]
  ],
  /* c＝血光（其他是火光）、s＝會投影子 */
  lights: [
    { x: 660, y: 770, z: 46, r: 620, i: 3.2, s: 1 },
    { x: 660, y: 318, z: 170, r: 640, i: 1.7, c: 1 },
    { x: 505, y: 505, z: 70, r: 320, i: 1.25 },
    { x: 815, y: 505, z: 70, r: 320, i: 1.25 },
    { x: 150, y: 620, z: 50, r: 300, i: 1.7 },
    { x: 240, y: 650, z: 70, r: 240, i: 0.9 },
    { x: 965, y: 560, z: 80, r: 300, i: 1.4 },
    { x: 1255, y: 560, z: 80, r: 300, i: 1.4 },
    { x: 450, y: 780, z: 70, r: 220, i: 0.9 }
  ]
};
const BW = Math.ceil(L.W / TX),
  BH = Math.ceil(L.H / TX),
  N = BW * BH,
  t = v => v / TX;
let LIGHTS = L.lights.map(o => ({
  x: t(o.x),
  y: t(o.y),
  z: t(o.z),
  r: t(o.r),
  r2: t(o.r) ** 2,
  i: o.i,
  c: o.c ? 1 : 0,
  s: o.s
}));
let LW = 0,
  LC = 0;
function lit(x, y, z, nx, ny, nz) {
  LW = LC = 0;
  const q = sqrt(nx * nx + ny * ny + nz * nz) || 1;
  for (let k = 0; k < LIGHTS.length; k++) {
    const o = LIGHTS[k],
      dx = o.x - x,
      dy = o.y - y;
    if (dx * dx + dy * dy > o.r2) continue;
    const dz = o.z - z,
      d = sqrt(dx * dx + dy * dy + dz * dz);
    if (d > o.r) continue;
    const ndl = (nx * dx + ny * dy + nz * dz) / (d * q);
    if (ndl <= 0) continue;
    const f = 1 - d / o.r,
      a = ndl * f * f * o.i;
    if (o.c) LC += a;
    else LW += a;
  }
}
const PX = new Uint32Array(N),
  ID = new Uint16Array(N),
  SIDE = new Float32Array(N).fill(1),
  CAST = [],
  FGS = new Map();
let cur = 1,
  bx0 = 1e9,
  bx1 = -1,
  by0 = 1e9,
  by1 = -1;
let sc = 1,
  ox = 0,
  oy = 0;
function put(x, y, m, nx, ny, nz, gy, k = 1, e = 0) {
  if (sc !== 1) {
    x = ox + (x - ox) * sc;
    y = oy + (y - oy) * sc;
    gy = oy + (gy - oy) * sc;
  }
  x |= 0;
  y |= 0;
  if (x < 0 || y < 0 || x >= BW || y >= BH) return;
  lit(x, gy, gy - y, nx, ny, nz);
  const i = y * BW + x,
    b = BAYER[((y & 7) << 3) | (x & 7)],
    lw = LW * k,
    lc = LC * k,
    s = lw + lc + 1e-4,
    r = lc / s + b * 0.3 > 0.5 ? m.c : m.w,
    l = (m.a * k + (1 - Math.exp(-s * 1.55)) + e) * (r.length - 1) + b * m.d,
    q = l < 0 ? 0 : l > r.length - 1 ? r.length - 1 : Math.round(l);
  PX[i] = r[q];
  ID[i] = cur;
  if (x < bx0) bx0 = x;
  if (x > bx1) bx1 = x;
  if (y < by0) by0 = y;
  if (y > by1) by1 = y;
}
/* ---------- 形狀基本件 ---------- */
function dome(cx, cy, rx, ry, m, o = {}) {
  const gy = o.gy == null ? cy + ry : o.gy;
  for (let y = floor(cy - ry); y <= cy + ry; y++)
    for (let x = floor(cx - rx); x <= cx + rx; x++) {
      const u = (x + 0.5 - cx) / rx,
        v = (y + 0.5 - cy) / ry,
        r = u * u + v * v;
      if (r > 1) continue;
      const nz = sqrt(1 - r),
        b = o.b ? (fbm(x * o.b, y * o.b, 2) - 0.5) * 1.2 : 0,
        f = o.f || 0,
        nu = f ? Math.round((u + b) * f) / f : u + b,
        nv = f ? Math.round((v + b) * f) / f : v;
      put(x, y, m, nu, nv + 0.25, nz + 0.25, gy, (1 - r * r * r * 0.65) * (o.k || 1), o.e || 0);
    }
}
function cap(cx, cy, rx, ry, m, e, gy) {
  for (let y = floor(cy - ry); y <= cy + ry; y++)
    for (let x = floor(cx - rx); x <= cx + rx; x++) {
      const u = (x + 0.5 - cx) / rx,
        v = (y + 0.5 - cy) / ry;
      if (u * u + v * v <= 1) put(x, y, m, u * 0.12, v * 0.12 - 0.05, 1, gy == null ? cy : gy, 1, e || 0);
    }
}
function cyl(cx, by, rx, ry, h, m, o = {}) {
  const top = by - h,
    tx = o.tex;
  for (let x = floor(cx - rx); x <= cx + rx; x++) {
    const u = (x + 0.5 - cx) / rx;
    if (abs(u) > 1) continue;
    const e = sqrt(1 - u * u);
    for (let y = floor(top); y <= by + ry * e; y++)
      put(x, y, m, u, e, 0.3, by, (0.8 + 0.2 * e) * (tx ? tx(x, y) : 1), o.e || 0);
  }
  cap(cx, top, rx, ry, o.tm || m, o.te || 0, by);
}
function box(x, y, w, dp, h, m, o = {}) {
  const tx = o.tex;
  for (let j = 0; j < dp; j++)
    for (let i = 0; i < w; i++)
      put(x + i, y - h + j, o.tm || m, 0, -0.05, 1, y + j, tx ? tx(x + i, y - h + j) : 1, o.e || 0);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++)
      put(
        x + i,
        y + dp - h + j,
        m,
        (i / w - 0.5) * 0.5,
        1,
        0.2,
        y + dp,
        (tx ? tx(x + i, y + dp - h + j) : 1) * (0.72 + (0.28 * (h - j)) / h),
        o.e || 0
      );
}
function poly(p, m, n, o = {}) {
  let y0 = 1e9,
    y1 = -1e9;
  for (const q of p) (y0 = min(y0, q[1])), (y1 = max(y1, q[1]));
  for (let y = floor(y0); y <= y1; y++) {
    const xs = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i],
        b = p[(i + 1) % p.length];
      if (a[1] <= y + 0.5 === b[1] <= y + 0.5) continue;
      xs.push(a[0] + ((y + 0.5 - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = floor(xs[k]); x < xs[k + 1]; x++)
        put(x, y, m, n[0], n[1], n[2], o.gy == null ? y1 : o.gy, o.tex ? o.tex(x, y) : o.k || 1, o.e || 0);
  }
}
function rod(x0, y0, x1, y1, r, m, gy, o = {}) {
  const d = hypot(x1 - x0, y1 - y0) || 1,
    n = Math.ceil(d),
    nx = -(y1 - y0) / d,
    ny = (x1 - x0) / d;
  for (let i = 0; i <= n; i++) {
    const f = i / n,
      px = x0 + (x1 - x0) * f,
      py = y0 + (y1 - y0) * f,
      rr = r * (o.taper ? 1 - f * o.taper : 1);
    for (let k = -rr; k <= rr; k += 0.5) {
      const u = k / (rr || 1);
      put(
        px + nx * k,
        py + ny * k,
        m,
        nx * u,
        ny * u + 0.3,
        sqrt(max(0.05, 1 - u * u)),
        gy == null ? max(y0, y1) : gy,
        o.tex ? o.tex(i, k) : 1,
        o.e || 0
      );
    }
  }
}
/* 物件外框：外面一圈塗深色，跟 PixelLab 的 Black outline 同一種語言 */
const OUT = ramp('#050306')[0],
  OL = [];
function group(fn, c, s = 1) {
  const id = ++cur;
  bx0 = by0 = 1e9;
  bx1 = by1 = -1;
  if (s !== 1 && c) (sc = s), (ox = c.x), (oy = c.y);
  fn();
  sc = 1;
  if (c) {
    CAST.push(s === 1 ? c : { x: c.x, y: c.y, r: c.r * s, h: c.h * s });
    FGS.set(id, { x: bx0, y: by0, w: bx1 - bx0 + 3, h: by1 - by0 + 3, by: c.y });
  }
  OL.length = 0;
  for (let y = max(1, by0 - 1); y <= min(BH - 2, by1 + 1); y++)
    for (let x = max(1, bx0 - 1); x <= min(BW - 2, bx1 + 1); x++) {
      const i = y * BW + x;
      if (ID[i] !== id && (ID[i - 1] === id || ID[i + 1] === id || ID[i - BW] === id || ID[i + BW] === id)) OL.push(i);
    }
  for (const i of OL) (PX[i] = OUT), (ID[i] = id);
}

/* ---------- 地形 ---------- */
const FL = new Uint8Array(N),
  WIN = new Uint8Array(N),
  DIST = new Float32Array(N);
function field() {
  const B = L.blobs.map(b => b.map(t)),
    G0 = L.neg.map(b => b.map(t)),
    W = L.win.map(b => b.map(t));
  for (let y = 0; y < BH; y++)
    for (let x = 0; x < BW; x++) {
      const n1 = (fbm(x * 0.011, y * 0.014, 3) - 0.5) * 0.62,
        n2 = (fbm(x * 0.06, y * 0.06, 2) - 0.5) * 0.14;
      let f = -9;
      for (const b of B) f = max(f, 1 - ((x - b[0]) / b[2]) ** 2 - ((y - b[1]) / b[3]) ** 2);
      f += n1 + n2;
      for (const b of G0) f = min(f, ((x - b[0]) / b[2]) ** 2 + ((y - b[1]) / b[3]) ** 2 - 1 + n2 * 2.5);
      const i = y * BW + x;
      FL[i] = f > 0 ? 1 : 0;
      for (const b of W)
        if (!FL[i] && 1 - ((x - b[0]) / b[2]) ** 2 - ((y - b[1]) / b[3]) ** 2 + n1 * 0.7 + n2 * 1.4 > 0) WIN[i] = 1;
    }
  /* 離牆多遠（地板裡）／離地板多遠（牆裡） */
  DIST.fill(1e6);
  for (let i = 0; i < N; i++) if (FL[i] !== 1) DIST[i] = 0;
  const s = (i, j, c) => {
    const v = DIST[j] + c;
    if (v < DIST[i]) DIST[i] = v;
  };
  for (let y = 1; y < BH - 1; y++)
    for (let x = 1; x < BW - 1; x++) {
      const i = y * BW + x;
      s(i, i - 1, 1), s(i, i - BW, 1), s(i, i - BW - 1, 1.41), s(i, i - BW + 1, 1.41);
    }
  for (let y = BH - 2; y > 0; y--)
    for (let x = BW - 2; x > 0; x--) {
      const i = y * BW + x;
      s(i, i + 1, 1), s(i, i + BW, 1), s(i, i + BW + 1, 1.41), s(i, i + BW - 1, 1.41);
    }
}
const tallAt = x => {
  let v = 0;
  for (const o of L.tall) {
    const d = abs(x * TX - o[0]) / (o[1] / 2);
    if (d < 1) v = max(v, t(o[2]) * min(1, (1 - d) * 2.4) * (0.82 + 0.36 * fbm(x * 0.03, 8.5, 2)));
  }
  return v;
};
const clampi = (v, m) => (v < 0 ? 0 : v > m ? m : Math.round(v)),
  BG = ramp('#070606')[0];
function terrain() {
  /* 每一欄往下找地板：牆的正面高度 fh */
  const fh = new Float32Array(BW);
  for (let x = 0; x < BW; x++) fh[x] = 40 + 26 * fbm(x * 0.016, 2.5, 2) + 10 * (vn(x * 0.21, 3) - 0.5) + tallAt(x);
  cur = 1;
  const dw = new Float32Array(N).fill(1e6);
  for (let i = 0; i < N; i++) if (FL[i]) dw[i] = 0;
  for (let y = 1; y < BH - 1; y++)
    for (let x = 1; x < BW - 1; x++) {
      const i = y * BW + x;
      dw[i] = min(dw[i], dw[i - 1] + 1, dw[i - BW] + 1, dw[i - BW - 1] + 1.41, dw[i - BW + 1] + 1.41);
    }
  for (let y = BH - 2; y > 0; y--)
    for (let x = BW - 2; x > 0; x--) {
      const i = y * BW + x;
      dw[i] = min(dw[i], dw[i + 1] + 1, dw[i + BW] + 1, dw[i + BW + 1] + 1.41, dw[i + BW - 1] + 1.41);
    }
  for (let x = 0; x < BW; x++) {
    let d = 1e6;
    const f = fh[x];
    for (let y = BH - 1; y >= 0; y--) {
      const i = y * BW + x;
      if (FL[i]) {
        d = 0;
        continue;
      }
      d++;
      if (WIN[i]) {
        PX[i] = 0;
        ID[i] = 0;
        d = 1e6;
        continue;
      }
      if (d <= f) face(x, y, d, f);
      else if (dw[i] < 14 + 10 * vn(x * 0.07, y * 0.07)) {
        /* 石緣：朝地板那面亮一條，邊緣不規則 */
        const gx = dw[i - 1] - dw[i + 1],
          gyy = dw[i - BW] - dw[i + BW];
        put(
          x,
          y,
          M.rock,
          gx * 0.7,
          gyy * 0.7,
          0.5,
          y,
          (0.46 - dw[i] * 0.022) * (0.55 + 0.9 * fbm(x * 0.09, y * 0.09, 2))
        );
      } else rockTop(x, y, dw[i]);
    }
  }
  /* 洞口的石緣：窗戶上緣一圈用正面畫 */
  for (let y = 1; y < BH - 1; y++)
    for (let x = 1; x < BW - 1; x++) {
      const i = y * BW + x;
      if (WIN[i] || FL[i]) continue;
      let near = 0;
      for (let k = 2; k <= 18; k += 2) if (y + k < BH && WIN[(y + k) * BW + x]) near = near || k;
      if (near) face(x, y, 20 + near, 38, y + near);
    }
}
function face(x, y, d, f, gyo) {
  const hn = (a, b) => fbm(a * 0.05, b * 0.1, 3) + 0.34 * fbm(a * 0.19, b * 0.24, 2),
    h0 = hn(x, y),
    hx = hn(x + 1.5, y) - h0,
    hy = hn(x, y + 1.5) - h0,
    s = sin((y + fbm(x * 0.008, y * 0.02, 2) * 54) * 0.4),
    col = sin(x * 0.085 + fbm(x * 0.02, y * 0.01, 2) * 7),
    v = d / f,
    k = (0.62 + 0.38 * Math.pow(1 - abs(v - 0.45), 2)) * (d < 3 ? 0.45 : 1) * (d > f - 2 ? 1.6 : 1);
  put(x, y, M.rock, col * 0.42 - hx * 4, 0.95 - hy * 4, 0.3 + s * 0.16, gyo == null ? y + d : gyo, k);
}
function rockTop(x, y, dw) {
  const i = y * BW + x,
    fade = max(0, 1 - dw / 200) * min(1, x / 70, (BW - x) / 70, y / 70, (BH - y) / 70),
    n = fbm(x * 0.03, y * 0.05, 3),
    n2 = fbm(x * 0.13, y * 0.17, 2),
    l = (0.4 + n * 0.8 + (n2 - 0.5) * 0.5) * fade * fade,
    r = M.top.w,
    q = clampi(l * (r.length - 1) + BAYER[((y & 7) << 3) | (x & 7)] * 0.8, r.length - 1);
  PX[i] = fade <= 0 ? BG : r[q];
  ID[i] = 1;
}
/* 走出來的路：一串線段 */
const PATHS = [],
  ASH = [];
const pathD = (x, y) => {
  let best = 1e9;
  for (const s of PATHS) {
    const dx = s[2] - s[0],
      dy = s[3] - s[1],
      q = clamp(((x - s[0]) * dx + (y - s[1]) * dy) / (dx * dx + dy * dy), 0, 1);
    best = min(best, hypot(x - s[0] - q * dx, y - s[1] - q * dy));
  }
  return best;
};
let wc0 = 0,
  wc1 = 0;
function worley(x, y) {
  const xi = floor(x),
    yi = floor(y);
  let f1 = 9,
    f2 = 9;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = xi + i + hs(xi + i, yi + j),
        cy = yi + j + hs(xi + i + 31, yi + j + 17),
        d = hypot(x - cx, y - cy);
      if (d < f1) (f2 = f1), (f1 = d), (wc0 = xi + i), (wc1 = yi + j);
      else if (d < f2) f2 = d;
    }
  return f2 - f1;
}
function ground() {
  /* 火光投出去的影子 */
  for (const o of LIGHTS.filter(o => o.s))
    for (const c of CAST) {
      const dx = c.x - o.x,
        dy = c.y - o.y,
        d = hypot(dx, dy) || 1;
      if (d > o.r) continue;
      const ux = dx / d,
        uy = dy / d,
        len = min(c.h * 2.6 * (1 + d / 260), 150),
        ex = c.x + ux * len,
        ey = c.y + uy * len * 0.8,
        x0 = floor(min(c.x, ex) - c.r - 2),
        x1 = max(c.x, ex) + c.r + 2,
        y0 = floor(min(c.y, ey) - c.r - 2),
        y1 = max(c.y, ey) + c.r + 2,
        sg = (ex - c.x) ** 2 + (ey - c.y) ** 2 || 1;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          if (x < 0 || y < 0 || x >= BW || y >= BH) continue;
          const q = clamp(((x - c.x) * (ex - c.x) + (y - c.y) * (ey - c.y)) / sg, 0, 1),
            px = c.x + (ex - c.x) * q,
            py = c.y + (ey - c.y) * q,
            w = c.r * (1 - q * 0.35);
          if (hypot(x - px, (y - py) * 1.25) < w) {
            const i = y * BW + x;
            SIDE[i] = min(SIDE[i], 0.34 + q * 0.5);
          }
        }
    }
  cur = 1;
  for (let y = 0; y < BH; y++)
    for (let x = 0; x < BW; x++) {
      const i = y * BW + x;
      if (!FL[i]) continue;
      const dw = DIST[i],
        ao = min(1, 0.3 + (dw / 34) * 0.7),
        big = fbm(x * 0.022, y * 0.034, 3) - 0.5,
        fine = fbm(x * 0.15, y * 0.22, 2) - 0.5,
        grit = hs(x, y) - 0.5,
        bx = fbm((x + 1) * 0.15, y * 0.22, 2) - 0.5 - fine,
        by = fbm(x * 0.15, (y + 1) * 0.22, 2) - 0.5 - fine;
      let m = M.dirt,
        k = (1 + big * 1.25 + fine * 0.35 + (grit > 0.465 ? 0.22 : grit < -0.47 ? -0.2 : 0)) * ao * 0.9 * SIDE[i];
      /* 中軸的舊石板路：從地圖台通到洞口 */
      const sb = abs(x - t(660)) / (t(112) + big * 90);
      if (sb < 1 && y > t(395) && y < t(690)) {
        const w = worley(x * 0.03, y * 0.046) + (big + fine) * 0.03;
        m = M.stone;
        if (w < 0.035) (m = M.dirt), (k *= 0.55);
        else k *= 0.78 + (hs(wc0 * 9, wc1 * 5) - 0.5) * 0.3;
      }
      const pd = PATHS.length ? pathD(x, y) + (fine + big) * 44 : 99;
      if (pd < 20) k *= 1 + 0.32 * (1 - pd / 20);
      for (const a of ASH) {
        const q = hypot((x - a[0]) / a[2], (y - a[1]) / a[3]) + big * 0.9;
        if (q < 1) (m = M.ash), (k *= a[4] || 0.8);
      }
      put(x, y, m, bx * 0.8, by * 0.8 + 0.02, 1, y, k);
    }
}

/* ---------- 擺設 ---------- */
const grain = (a, b) => (x, y) => 0.82 + 0.3 * vn(x * a, y * b);
function rock(x, y, s) {
  group(
    () => {
      dome(x, y - s * 0.34, s, s * 0.72, M.rock, { b: 0.05, f: 3, gy: y });
      dome(x + s * 0.5, y - s * 0.12, s * 0.58, s * 0.42, M.rock, { b: 0.07, f: 3, gy: y });
    },
    { x, y, r: s * 0.9, h: s * 0.8 }
  );
}
function stalag(x, y, s) {
  group(
    () => {
      const n = 3 + (((s * 3) | 0) % 2);
      for (let i = 0; i < n; i++) {
        const dx = (i - (n - 1) / 2) * s * 0.7,
          h = s * (2.8 - abs(i - (n - 1) / 2) * 0.9) * (0.8 + hs(x + i, y) * 0.5);
        poly(
          [
            [x + dx - s * 0.42, y],
            [x + dx + s * 0.1, y - h],
            [x + dx + s * 0.42, y]
          ],
          M.rock,
          [i < n / 2 ? -0.5 : 0.5, 0.9, 0.3],
          { gy: y, tex: (a, b) => 0.72 + 0.5 * vn(a * 0.5, b * 0.14) }
        );
      }
    },
    { x, y, r: s * 1.2, h: s * 2 }
  );
}
function urn(x, y, s, kind) {
  const m = kind ? M.bone : M.clay;
  cyl(x, y, s * 0.62, s * 0.24, s * 0.34, m);
  dome(x, y - s * 0.8, s * 0.86, s * 0.82, m, { gy: y });
  cyl(x, y - s * 1.42, s * 0.42, s * 0.18, s * 0.26, m);
  dome(x, y - s * 1.74, s * 0.46, s * 0.2, M.bone, { gy: y });
  for (let i = -0.7; i <= 0.7; i += 0.1) put(x + i * s * 0.84, y - s * 0.68 + sin(i * 9), m, 0, 1, 0.2, y, 0.55);
}
function urns(x, y, n, sp) {
  group(
    () => {
      const o = [];
      for (let i = 0; i < n; i++)
        o.push([
          x + (hs(i, n) - 0.5) * sp,
          y + (hs(n, i + 9) - 0.5) * sp * 0.34,
          6 + hs(i + 3, 5) * 6,
          hs(i + 5, 2) > 0.45
        ]);
      o.sort((a, b) => a[1] - b[1]);
      for (const u of o) urn(u[0], u[1], u[2], u[3]);
    },
    { x, y, r: sp * 0.45, h: 18 }
  );
}
function bones(x, y, s) {
  group(() => {
    const a = hs(x | 0, y | 0) * PI;
    rod(x - cos(a) * s, y - sin(a) * s * 0.5, x + cos(a) * s, y + sin(a) * s * 0.5, 1, M.bone, y);
    dome(x + cos(a) * s, y + sin(a) * s * 0.5, 2, 1.4, M.bone, { gy: y });
    if (s > 6) dome(x - s * 1.1, y + 4, 4.6, 3.6, M.bone, { gy: y + 4 });
  });
}
/* 一圈石塊：側面有接縫、頂面分扇形 */
function dais(x, y, rx, ry, h, n) {
  for (let px = floor(x - rx); px <= x + rx; px++) {
    const u = (px + 0.5 - x) / rx;
    if (abs(u) > 1) continue;
    const e = sqrt(1 - u * u),
      q = (Math.asin(u) * n) / PI,
      kk = (abs(q - Math.round(q)) < 0.07 ? 0.45 : 1) * (0.86 + 0.3 * hs(Math.round(q) + 40, n));
    for (let py = floor(y - h); py <= y + ry * e; py++) put(px, py, M.stone, u, e, 0.3, y, (0.78 + 0.2 * e) * kk);
  }
  const cy = y - h;
  for (let py = floor(cy - ry); py <= cy + ry; py++)
    for (let px = floor(x - rx); px <= x + rx; px++) {
      const u = (px + 0.5 - x) / rx,
        v = (py + 0.5 - cy) / ry,
        r = u * u + v * v;
      if (r > 1) continue;
      const q = (Math.atan2(v, u) / TAU) * n * 2,
        kk =
          (abs(q - Math.round(q)) < 0.09 || abs(r - 0.5) < 0.03 ? 0.5 : 1) *
          (0.86 + 0.3 * hs(Math.round(q) + 70, n + (r > 0.5 ? 1 : 0)));
      put(px, py, M.stone, u * 0.1, v * 0.1 - 0.05, 1, y, kk);
    }
}
function device(x, y) {
  group(
    () => {
      dais(x, y + 6, 62, 31, 9, 18);
      dais(x, y - 3, 46, 23, 8, 14);
      cyl(x, y - 12, 15, 8, 30, M.stone, { tex: (a, b) => 0.72 + 0.5 * vn(a * 0.5, b * 0.06) });
      for (const [dx, dy] of [
        [-36, -2],
        [36, -2],
        [-18, 14],
        [18, 14]
      ]) {
        rod(x + dx, y + dy - 12, x + dx * 0.9, y + dy - 40, 2, M.iron, y + dy);
        rod(x + dx * 0.9, y + dy - 40, x + dx * 0.34, y - 48, 1.6, M.iron, y);
        dome(x + dx, y + dy - 12, 3.4, 2.4, M.iron, { gy: y + dy });
      }
    },
    { x, y: y + 2, r: 52, h: 26 },
    0.74
  );
}
/* 地層出口（方向 B）：地上的裂口，繩梯垂下去 */
function pit(x, y) {
  group(() => {
    for (let py = floor(y - 26); py <= y + 26; py++)
      for (let px = floor(x - 56); px <= x + 56; px++) {
        const u = (px - x) / 56,
          v = (py - y) / 26,
          r = u * u + v * v + (fbm(px * 0.07, py * 0.09, 2) - 0.5) * 0.9;
        if (r > 1) continue;
        put(px, py, M.top, 0, 0, 1, y, 0.05);
        if (r < 0.7 && hs(px, py) > 0.2 + r) put(px, py, M.rock, 0, 1, 0.2, y, 0.08);
      }
    for (let a = -PI; a < PI; a += TAU / 22)
      dome(x + cos(a) * 56, y + sin(a) * 26, 5 + hs((a * 9) | 0, 1) * 5, 3.4 + hs((a * 9) | 0, 2) * 3, M.rock, {
        gy: y + 30 * sin(a),
        f: 2,
        b: 0.1
      });
    rod(x - 14, y - 34, x - 10, y + 14, 1.4, M.wood, y);
    rod(x + 14, y - 34, x + 10, y + 14, 1.4, M.wood, y);
    for (let i = 0; i < 6; i++) rod(x - 13 + i * 0.6, y - 28 + i * 8, x + 13 - i * 0.6, y - 28 + i * 8, 1, M.wood, y);
  });
}
function stash(x, y) {
  group(
    () => {
      box(x - 30, y - 50, 26, 22, 18, M.wood, { tex: grain(0.15, 0.7) });
      cyl(x + 18, y - 28, 11, 5, 26, M.wood, { tex: grain(0.4, 0.04) });
      box(x - 42, y - 22, 40, 22, 18, M.wood, { tex: grain(0.9, 0.08) });
      box(x - 42, y - 22, 3, 22, 18, M.iron);
      box(x - 6, y - 22, 3, 22, 18, M.iron);
      box(x - 32, y - 6, 18, 5, 4, M.iron);
      box(x - 26, y - 4, 7, 2, 7, M.bone);
      box(x + 3, y - 26, 26, 24, 26, M.wood, { tex: grain(0.15, 0.7) });
      dome(x + 41, y - 11, 16, 16, M.tarp, { b: 0.12, gy: y });
      dome(x + 22, y - 3, 12, 11, M.tarp, { b: 0.12, gy: y + 4 });
    },
    { x, y, r: 50, h: 34 },
    0.82
  );
}
function coals(x, y, w, h) {
  const r = ramp('#ff5a1e #ff8a2c #ffbe52 #ffe58f');
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const a = x + i,
        b = y + j,
        q = fbm(a * 0.4, b * 0.5, 2);
      if (q < 0.34) continue;
      const k = b * BW + a;
      PX[k] = r[clampi((q - 0.34) * 9, 3)];
      ID[k] = cur;
    }
}
function forge(x, y) {
  group(
    () => {
      const brick = (a, b) => ((b >> 2) % 5 === 0 ? 0.6 : 1) * (0.74 + 0.5 * vn((a + (b >> 3) * 7) * 0.22, b * 0.25));
      cyl(x - 22, y - 62, 11, 5, 34, M.stone, { tex: brick, tm: M.top });
      cyl(x - 24, y, 42, 20, 32, M.stone, { tex: brick });
      dome(x - 24, y - 32, 42, 34, M.stone, { gy: y, b: 0.06, f: 5 });
      poly(
        [
          [x - 44, y + 14],
          [x - 42, y - 12],
          [x - 24, y - 26],
          [x - 6, y - 12],
          [x - 4, y + 14]
        ],
        M.top,
        [0, 1, 0.2],
        { gy: y + 14, k: 0.05 }
      );
      coals(x - 40, y - 4, 32, 15);
      cyl(x + 38, y + 10, 16, 7, 18, M.wood, { tex: grain(0.5, 0.05) });
      box(x + 18, y - 14, 42, 10, 6, M.iron);
      box(x + 26, y - 8, 24, 5, 8, M.iron);
      poly(
        [
          [x + 60, y - 14],
          [x + 74, y - 11],
          [x + 60, y - 8]
        ],
        M.iron,
        [0.2, 0.3, 1]
      );
      rod(x + 24, y - 22, x + 44, y - 17, 1.4, M.wood, y);
      box(x + 40, y - 22, 8, 5, 4, M.iron);
    },
    { x, y, r: 56, h: 40 },
    0.8
  );
}
function tarpStall(x, y) {
  group(
    () => {
      rod(x - 50, y + 2, x - 50, y - 80, 2, M.wood, y + 2);
      rod(x + 50, y + 2, x + 50, y - 80, 2, M.wood, y + 2);
      box(x - 40, y - 18, 80, 16, 20, M.wood, { tex: grain(0.1, 0.7) });
      for (let i = 0; i < 5; i++) dome(x - 30 + i * 15, y - 42, 5, 5, i % 2 ? M.clay : M.bone, { gy: y - 18 });
      poly(
        [
          [x - 62, y - 82],
          [x + 62, y - 82],
          [x + 50, y - 58],
          [x + 34, y - 52],
          [x + 18, y - 58],
          [x, y - 50],
          [x - 18, y - 58],
          [x - 34, y - 52],
          [x - 50, y - 58]
        ],
        M.cloth,
        [0, 0.8, 0.5],
        { gy: y, tex: (a, b) => 0.76 + 0.42 * sin(a * 0.42) * 0.5 + 0.2 * vn(a * 0.1, b * 0.1) }
      );
      poly(
        [
          [x - 50, y - 92],
          [x + 50, y - 92],
          [x + 62, y - 82],
          [x - 62, y - 82]
        ],
        M.cloth,
        [0, -0.2, 1],
        { gy: y, tex: a => 0.9 + 0.4 * sin(a * 0.42) * 0.5 }
      );
    },
    { x, y, r: 52, h: 34 },
    0.8
  );
}
function board(x, y) {
  group(
    () => {
      rod(x - 30, y + 2, x - 30, y - 72, 2.4, M.wood, y + 2);
      rod(x + 30, y + 2, x + 30, y - 72, 2.4, M.wood, y + 2);
      box(x - 36, y - 64, 72, 3, 44, M.wood, { tex: grain(0.12, 0.5) });
      for (let i = 0; i < 6; i++) {
        const a = x - 30 + ((i * 14) % 44) + hs(i, 3) * 8,
          b = y - 58 + ((i * 11) % 26);
        box(a, b, 12, 1, 15, M.bone);
        box(a + 5, b + 1, 2, 1, 2, M.cloth, { e: 0.15 });
      }
      box(x + 12, y + 2, 24, 16, 16, M.wood, { tex: grain(0.15, 0.7) });
      dome(x - 18, y + 8, 12, 11, M.tarp, { b: 0.1, gy: y + 14 });
    },
    { x, y: y + 4, r: 40, h: 34 },
    0.8
  );
}
function stele(x, y) {
  group(
    () => {
      dais(x, y + 6, 36, 17, 7, 10);
      poly(
        [
          [x + 18, y - 2],
          [x + 20, y - 96],
          [x + 28, y - 80],
          [x + 28, y - 4]
        ],
        M.stone,
        [0.9, 0.5, 0.2],
        { gy: y, tex: (a, b) => 0.56 + 0.3 * fbm(a * 0.2, b * 0.05, 2) }
      );
      poly(
        [
          [x - 22, y - 2],
          [x - 27, y - 84],
          [x - 12, y - 112],
          [x + 4, y - 120],
          [x + 20, y - 96],
          [x + 18, y - 2]
        ],
        M.stone,
        [-0.1, 0.9, 0.4],
        {
          gy: y,
          tex: (a, b) => (((b + floor(vn(a * 0.1, 3) * 9)) & 15) < 1 ? 0.5 : 0.66 + 0.5 * fbm(a * 0.09, b * 0.05, 3))
        }
      );
      const G2 = (a, b, w, h) => {
        for (let j = 0; j < h; j++)
          for (let i = 0; i < w; i++) put(x + a + i, y + b + j, M.straw, 0, 1, 0.4, y, 1, 0.75);
      };
      G2(-2, -92, 4, 40);
      G2(-12, -82, 24, 3);
      G2(-9, -66, 18, 3);
      G2(-7, -96, 3, 8);
      G2(4, -96, 3, 8);
      G2(-12, -60, 3, 10);
      G2(9, -60, 3, 10);
    },
    { x, y, r: 26, h: 70 },
    0.72
  );
}
/* 十二神像：身體一樣、頭上的東西照生肖換；都還沒點亮 */
const ZOD = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];
const HEAD = {
  rat: [6, 3, 9],
  ox: [8, 7, 7],
  tiger: [8, 6, 7],
  rabbit: [6, 4, 7],
  dragon: [7, 5, 11],
  snake: [4, 3, 8],
  horse: [5, 4, 13],
  goat: [6, 3, 11],
  monkey: [7, 6, 6],
  rooster: [5, 2, 8],
  dog: [6, 4, 10],
  pig: [8, 7, 6]
};
function statue(i, x, y, s, m = M.stone) {
  const z = ZOD[i],
    Q = (pts, n, o = {}) =>
      poly(
        pts.map(([a, b]) => [x + a * s, y + b * s]),
        m,
        n,
        { gy: y, ...o }
      ),
    fold = (a, b) => 0.76 + 0.36 * (0.5 + 0.5 * sin(((a - x) * 1.25) / s + (b - y) * 0.03)),
    hy = -62,
    [hw, jw, ch] = HEAD[z],
    R2 = (a, b, c, d, w, o) => rod(x + a * s, y + b * s, x + c * s, y + d * s, w * s, m, y, o);
  group(
    () => {
      box(x - 20 * s, y - 7 * s, 40 * s, 11 * s, 7 * s, m, { tex: grain(0.2, 0.5) });
      box(x - 16 * s, y - 14 * s, 32 * s, 9 * s, 7 * s, m, { tex: grain(0.2, 0.5) });
      if (z === 'snake')
        Q(
          [
            [-12, hy + 10],
            [-9, hy - 10],
            [0, hy - 14],
            [9, hy - 10],
            [12, hy + 10]
          ],
          [0, 0.8, 0.5],
          { k: 0.72 }
        );
      Q(
        [
          [-15, -14],
          [-13, -45],
          [-5, -49],
          [-5, -14]
        ],
        [-0.6, 0.8, 0.4],
        { tex: fold }
      );
      Q(
        [
          [15, -14],
          [13, -45],
          [5, -49],
          [5, -14]
        ],
        [0.6, 0.8, 0.4],
        { tex: fold }
      );
      Q(
        [
          [-5, -14],
          [-5, -49],
          [5, -49],
          [5, -14]
        ],
        [0, 1, 0.35],
        { tex: fold }
      );
      Q(
        [
          [-17, -41],
          [-13, -51],
          [-5, -54],
          [5, -54],
          [13, -51],
          [17, -41],
          [11, -38],
          [-11, -38]
        ],
        [0, 0.35, 1]
      );
      R2(-15, -42, -7, -30, 2.3);
      R2(15, -42, 7, -30, 2.3);
      Q(
        [
          [-8, -33],
          [8, -33],
          [6, -25],
          [-6, -25]
        ],
        [0, 0.9, 0.5]
      );
      /* 頭：左右兩面，下巴長度決定臉型 */
      Q(
        [
          [0, hy - 8],
          [-hw + 1, hy - 8],
          [-hw, hy - 1],
          [-jw, hy + ch - 4],
          [0, hy + ch]
        ],
        [-0.55, 0.7, 0.6]
      );
      Q(
        [
          [0, hy - 8],
          [hw - 1, hy - 8],
          [hw, hy - 1],
          [jw, hy + ch - 4],
          [0, hy + ch]
        ],
        [0.55, 0.7, 0.6]
      );
      if (z === 'rabbit')
        R2(-4, hy - 7, -6, hy - 25, 2.2, { taper: 0.5 }), R2(4, hy - 7, 6, hy - 25, 2.2, { taper: 0.5 });
      if (z === 'rat' || z === 'monkey' || z === 'pig')
        for (const d of [-1, 1])
          dome(x + d * (hw + 1) * s, y + (hy - (z === 'monkey' ? 1 : 6)) * s, 3.6 * s, 3.6 * s, m, { gy: y, f: 2 });
      if (z === 'tiger')
        for (const d of [-1, 1]) dome(x + d * 6.4 * s, y + (hy - 8) * s, 2.8 * s, 2.8 * s, m, { gy: y, f: 2 });
      if (z === 'horse' || z === 'dog')
        for (const d of [-1, 1])
          Q(
            [
              [d * 2, hy - 7],
              [d * 6, hy - 7],
              [d * 5, hy - (z === 'dog' ? 14 : 16)]
            ],
            [d * 0.5, 0.7, 0.6]
          );
      if (z === 'horse') for (let k = 0; k < 5; k++) R2(0, hy - 8, (k - 2) * 1.4, hy - 13 + abs(k - 2), 1.2);
      if (z === 'ox' || z === 'goat' || z === 'dragon')
        for (const d of [-1, 1]) {
          R2(d * 6, hy - 6, d * 14, hy - 10, 2, { taper: 0.3 });
          R2(d * 14, hy - 10, d * (z === 'goat' ? 15 : 12), hy - (z === 'goat' ? 1 : 20), 1.6, { taper: 0.7 });
          if (z === 'dragon') R2(d * 10, hy - 9, d * 6, hy - 18, 1.2, { taper: 0.7 });
        }
      if (z === 'rooster')
        for (let k = 0; k < 3; k++)
          dome(x + (k - 1) * 3 * s, y + (hy - 10 - (k === 1 ? 1 : 0)) * s, 2 * s, 3.2 * s, m, { gy: y, f: 2 });
      if (z === 'goat') R2(0, hy + ch, 0, hy + ch + 6, 1.4, { taper: 0.6 });
      if (z === 'pig') dome(x, y + (hy + 4) * s, 4.4 * s, 3 * s, m, { gy: y, f: 2 });
      const ey = y + (hy - 1) * s;
      put(x - 3 * s, ey, M.top, 0, 1, 0, y, 0.05);
      put(x + 3 * s, ey, M.top, 0, 1, 0, y, 0.05);
    },
    { x, y, r: 15 * s, h: 44 * s }
  );
}
function dummy(tier, x, y) {
  const s = tier === 2 ? 1.34 : 1;
  group(
    () => {
      cyl(x, y, 2.6 * s, 1.5, 44 * s, M.wood, { tex: grain(0.5, 0.04) });
      rod(x - 20 * s, y - 34 * s, x + 20 * s, y - 36 * s, 2 * s, M.wood, y);
      if (tier === 0) {
        dome(x, y - 28, 12, 15, M.straw, { gy: y, b: 0.34 });
        for (let i = 0; i < 18; i++) {
          const a = hs(i, 9) * 2 - 1;
          rod(x + a * 11, y - 18, x + a * 14, y - 6 - hs(i, 3) * 6, 0.6, M.straw, y);
        }
        dome(x, y - 50, 8, 8, M.straw, { gy: y, b: 0.4 });
        rod(x - 8, y - 56, x + 8, y - 54, 1, M.cloth, y);
      } else if (tier === 1) {
        dome(x, y - 26, 14, 18, M.iron, { gy: y });
        dome(x - 15, y - 36, 7, 5, M.iron, { gy: y });
        dome(x + 15, y - 36, 7, 5, M.iron, { gy: y });
        dome(x, y - 52, 8, 9, M.iron, { gy: y });
        rod(x - 9, y - 50, x + 9, y - 50, 1, M.top, y);
        for (let i = 0; i < 7; i++) rod(x - 12 + i * 4, y - 10, x - 13 + i * 4.3, y + 2, 0.8, M.cloth, y);
      } else {
        for (let i = -3; i <= 3; i++) rod(x + i * 6 * s, y - 2, x + i * 3 * s, y - 60 * s, 1.3, M.iron, y);
        for (let k = 0; k < 4; k++)
          for (let a = 0; a < PI; a += 0.04)
            put(x + cos(a) * (20 - k * 3) * s, y - 8 - k * 16 * s + sin(a) * 4, M.iron, 0, 1, 0.3, y);
        dome(x, y - 72 * s, 12 * s, 12 * s, M.bone, { gy: y });
        for (const d of [-1, 1])
          rod(x + d * 10 * s, y - 78 * s, x + d * 24 * s, y - 94 * s, 2.2 * s, M.bone, y, { taper: 0.8 });
        put(x - 4 * s, y - 72 * s, M.top, 0, 1, 0, y, 0.1);
        put(x + 4 * s, y - 72 * s, M.top, 0, 1, 0, y, 0.1);
      }
    },
    { x, y, r: 14 * s, h: 56 * s }
  );
}
function stonefire(x, y) {
  group(() => {
    for (let a = -PI; a < 0; a += TAU / 11)
      dome(x + cos(a) * 30, y + sin(a) * 14, 7, 5.4, M.stone, { gy: y + 20 * sin(a) });
    coals(x - 22, y - 8, 44, 16);
    for (let a = 0; a < PI; a += TAU / 11) dome(x + cos(a) * 30, y + sin(a) * 14, 7, 5.4, M.stone, { gy: y - 20 });
  });
}
function log(x, y, a, l) {
  group(
    () =>
      rod(x - cos(a) * l, y - sin(a) * l * 0.5, x + cos(a) * l, y + sin(a) * l * 0.5, 6, M.wood, y, {
        tex: i => 0.8 + 0.25 * vn(i * 0.6, 3)
      }),
    {
      x,
      y,
      r: l * 0.7,
      h: 8
    }
  );
}
function tent(x, y, s) {
  group(
    () => {
      const tx = (a, b) => (0.68 + 0.42 * vn(a * 0.1, b * 0.14)) * (0.84 + 0.24 * sin(a * 0.5 + b * 0.12));
      poly(
        [
          [x - 74 * s, y],
          [x, y - 70 * s],
          [x, y + 14 * s]
        ],
        M.tarp,
        [-0.6, 0.6, 0.5],
        { gy: y, tex: tx }
      );
      poly(
        [
          [x, y - 70 * s],
          [x + 74 * s, y],
          [x, y + 14 * s]
        ],
        M.tarp,
        [0.6, 0.6, 0.5],
        { gy: y, tex: tx }
      );
      poly(
        [
          [x - 17 * s, y + 9 * s],
          [x, y - 40 * s],
          [x + 17 * s, y + 9 * s]
        ],
        M.top,
        [0, 1, 0.2],
        { gy: y, k: 0.05 }
      );
    },
    { x, y, r: 60 * s, h: 50 * s }
  );
}
function banner(x, y, c) {
  group(
    () => {
      rod(x, y, x + 3, y - 94, 1.6, M.wood, y);
      rod(x - 1, y - 90, x + 26, y - 86, 1.1, M.wood, y);
      poly(
        [
          [x + 1, y - 89],
          [x + 25, y - 86],
          [x + 22, y - 46],
          [x + 16, y - 56],
          [x + 11, y - 40],
          [x + 6, y - 54],
          [x + 2, y - 44]
        ],
        c,
        [0, 0.9, 0.4],
        { gy: y, tex: (a, b) => 0.7 + 0.6 * vn(a * 0.16, b * 0.09) }
      );
    },
    { x, y, r: 4, h: 60 }
  );
}
function lantern(x, y) {
  group(() => {
    rod(x, y, x, y - 72, 1.8, M.wood, y);
    rod(x, y - 72, x + 13, y - 74, 1.2, M.wood, y);
    box(x + 8, y - 66, 10, 4, 12, M.iron);
    coals(x + 9, y - 68, 8, 8);
  });
}
function shaft(x, y) {
  /* 地層出口：撐木的黑洞口 */
  group(() => {
    poly(
      [
        [x - 44, y],
        [x - 40, y - 74],
        [x - 22, y - 92],
        [x + 22, y - 92],
        [x + 40, y - 74],
        [x + 44, y]
      ],
      M.top,
      [0, 1, 0],
      { gy: y, k: 0.02 }
    );
    rod(x - 45, y + 2, x - 42, y - 84, 4.5, M.wood, y + 2, { tex: i => 0.8 + 0.3 * vn(i * 0.2, 1) });
    rod(x + 45, y + 2, x + 42, y - 84, 4.5, M.wood, y + 2, { tex: i => 0.8 + 0.3 * vn(i * 0.2, 2) });
    rod(x - 54, y - 80, x + 54, y - 86, 5, M.wood, y, { tex: i => 0.8 + 0.3 * vn(i * 0.2, 3) });
    rod(x - 40, y - 62, x - 22, y - 80, 2.6, M.wood, y);
    rod(x + 40, y - 62, x + 22, y - 80, 2.6, M.wood, y);
    for (let i = 0; i < 12; i++)
      dome(x - 54 + i * 10, y + 2 + (i % 3) * 3, 4 + (i % 2) * 2, 3.6, M.rock, { gy: y + 8, b: 0.3 });
  });
}
function ring(x, y, rx, ry) {
  group(() => {
    for (let a = 0; a < TAU; a += TAU / 34) {
      const px = x + cos(a) * rx * (1 + (hs((a * 9) | 0, 3) - 0.5) * 0.05),
        py = y + sin(a) * ry;
      dome(px, py, 3.6 + hs((a * 9) | 0, 1) * 2.4, 2.6 + hs((a * 9) | 0, 2) * 1.6, M.stone, { gy: py + 6, b: 0.3 });
    }
  });
}
function brazier(x, y) {
  group(
    () => {
      rod(x - 11, y + 3, x - 3, y - 30, 1.5, M.iron, y);
      rod(x + 11, y + 3, x + 3, y - 30, 1.5, M.iron, y);
      rod(x, y + 6, x, y - 30, 1.5, M.iron, y);
      cyl(x, y - 30, 14, 6, 7, M.iron);
      coals(x - 10, y - 40, 20, 7);
    },
    { x, y, r: 12, h: 30 }
  );
}
function rack(x, y) {
  group(
    () => {
      rod(x - 34, y, x - 34, y - 44, 2, M.wood, y);
      rod(x + 34, y, x + 34, y - 44, 2, M.wood, y);
      rod(x - 38, y - 40, x + 38, y - 40, 1.8, M.wood, y);
      rod(x - 38, y - 12, x + 38, y - 12, 1.6, M.wood, y);
      for (let i = 0; i < 5; i++) {
        const a = x - 24 + i * 12;
        rod(a, y - 2, a + (i % 2 ? 2 : -2), y - 52, 1.2, i % 2 ? M.iron : M.wood, y);
      }
    },
    { x, y, r: 30, h: 26 },
    0.8
  );
}
function rope(x0, y0, x1, y1) {
  group(() => {
    const n = hypot(x1 - x0, y1 - y0) | 0;
    for (let i = 0; i <= n; i++) {
      const f = i / n,
        sag = sin(f * PI) * n * 0.08,
        a = x0 + (x1 - x0) * f,
        b = y0 + (y1 - y0) * f + sag;
      put(a, b, M.tarp, 0, 1, 0.4, b + 80, 0.8);
      if (i % 16 === 8)
        for (let j = 0; j < 7 + (i % 5) * 2; j++)
          for (let k = 0; k < 5; k++)
            put(a + k - 2, b + 1 + j, i % 32 === 8 ? M.cloth : M.tarp, 0, 1, 0.4, b + 80, 0.8 + 0.2 * hs(k, j));
    }
  });
}
function sign(x, y) {
  group(
    () => {
      rod(x, y, x, y - 40, 1.8, M.wood, y);
      box(x - 18, y - 42, 36, 3, 16, M.wood, { tex: grain(0.12, 0.5) });
      for (let i = 0; i < 3; i++) box(x - 13 + i * 10, y - 38, 6, 1, 7, i === 0 ? M.bone : M.iron);
    },
    { x, y, r: 6, h: 30 }
  );
}
function teeth() {
  /* 洞口上緣垂下來的鐘乳石（黑色剪影） */
  group(() => {
    for (let x = 2; x < BW - 2; x += 5 + ((x * 7) % 9)) {
      let y = 0;
      while (y < BH && !WIN[y * BW + x]) y++;
      if (y >= BH || y < 6) continue;
      const h = 8 + hs(x, 4) * 30,
        w = 3 + hs(x, 9) * 6;
      poly(
        [
          [x - w, y - 2],
          [x + w, y - 2],
          [x + (hs(x, 2) - 0.5) * 3, y + h]
        ],
        M.top,
        [0, 1, 0.2],
        { gy: y + 40, k: 0.3 }
      );
    }
  });
}
function rubble(x, y, w) {
  group(() => {
    for (let i = 0; i < 26; i++) {
      const a = x + (hs(i, 2) - 0.5) * w * 1.2,
        b = y + (hs(i, 7) - 0.5) * 26;
      dome(a, b, 3 + hs(i, 5) * 7, 2 + hs(i, 6) * 4, M.top, { gy: b + 6, b: 0.1, f: 2 });
    }
  });
}
function nicheStatue(i, x, y) {
  x = t(x);
  y = t(y);
  group(() => {
    poly(
      [
        [x - 25, y + 4],
        [x - 25, y - 50],
        [x - 17, y - 64],
        [x, y - 70],
        [x + 17, y - 64],
        [x + 25, y - 50],
        [x + 25, y + 4]
      ],
      M.rock,
      [0, 0.9, 0.1],
      { gy: y, k: 0.24 }
    );
  });
  statue(i, x, y, 1.02);
}
/* 擺設（世界像素）：ny＝名牌離腳底多高 */
const PROPS = [
  { k: 'device', n: '地圖台', x: 660, y: 470, r: 54, ny: 104 },
  { k: 'asc', n: '昇華石碑', x: 660, y: 388, r: 26, ny: 100 },
  { k: 'stash', n: '倉庫', x: 318, y: 640, r: 46, ny: 76 },
  { k: 'forge', n: '鍛造台', x: 150, y: 610, r: 50, ny: 124 },
  { k: 'gamble', n: '商人', x: 450, y: 790, r: 50, ny: 108 },
  { k: 'market', n: '市集（之後開放）', x: 250, y: 748, r: 36, ny: 88 },
  { k: 'prac', n: '練習區', x: 952, y: 712, r: 14, ny: 62 }
];
/* 練習區：石圈裡才能出招；稻草人固定三隻（t：0 普通、1 菁英、2 王） */
const ZONE = { x: 1110, y: 628, rx: 150, ry: 104 },
  DUMMIES = [
    { t: 0, x: 1022, y: 640 },
    { t: 1, x: 1110, y: 572 },
    { t: 2, x: 1200, y: 640 }
  ],
  NPC = { bone: { x: 585, y: 778 }, crow: { x: 790, y: 408 } },
  SPAWN = { x: 660, y: 560 },
  EXIT = { x: 900, y: 806 };
const SOLID = [],
  solid = (x, y, r) => SOLID.push({ x, y, r });
const wallY = wx => {
  const x = clamp(Math.round(t(wx)), 0, BW - 1);
  for (let y = 0; y < BH; y++) if (FL[y * BW + x]) return y * TX;
  return 0;
};
function dress() {
  PATHS.push(
    ...[
      [660, 560, 660, 760],
      [660, 560, 318, 690],
      [660, 560, 1030, 640],
      [660, 560, 450, 800]
    ].map(s => s.map(t))
  );
  ASH.push([t(660), t(770), 66, 36, 0.8], [t(120), t(632), 54, 24, 0.8]);
}
const STAT = [];
function layout() {
  const L2 = (n, a) => a.forEach(([x, y, q]) => n(t(x), t(y), q));
  /* 十二尊沿著洞壁圍住洞口：從大廳中心往外走到牆，退一步 */
  const C = [660, 540],
    spots = [];
  for (let i = 0; i < 6; i++)
    for (const side of [-1, 1]) {
      const a = PI + 0.08 + i * 0.205,
        dx = cos(a) * side,
        dy = sin(a);
      let r = 200;
      while (FL[floor(t(C[1] + dy * r)) * BW + floor(t(C[0] + dx * r))]) r += 6;
      spots.push({ i: i + (side > 0 ? 6 : 0), x: C[0] + dx * (r - 6), y: C[1] + dy * (r - 6) + 34 });
    }
  spots.sort((p, q) => p.y - q.y);
  teeth();
  rubble(t(660), t(wallY(660) + 6), 440);
  for (const p of spots) {
    statue(p.i, t(p.x), t(p.y), 1.26);
    STAT.push(p);
    solid(p.x, p.y - 4, 30);
  }
  stele(t(660), t(388));
  device(t(660), t(470));
  brazier(t(505), t(520));
  brazier(t(815), t(520));
  ring(t(ZONE.x), t(ZONE.y), t(ZONE.rx), t(ZONE.ry));
  lantern(t(965), t(575));
  lantern(t(1255), t(575));
  sign(t(952), t(712));
  forge(t(150), t(610));
  stash(t(318), t(640));
  lantern(t(232), t(694));
  board(t(250), t(748));
  rack(t(1125), t(762));
  tent(t(795), t(748), 0.76);
  banner(t(726), t(690), M.cloth);
  rope(t(726) + 2, t(690) - 90, t(795), t(748) - 52);
  stonefire(t(660), t(770));
  log(t(585), t(806), 0.1, 26);
  log(t(735), t(818), -0.2, 24);
  tarpStall(t(450), t(800));
  pit(t(EXIT.x), t(EXIT.y));
  urns(t(560), t(858), 9, 110);
  urns(t(760), t(866), 9, 110);
  urns(t(660), t(892), 8, 90);
  bones(t(500), t(880), 8);
  bones(t(830), t(890), 7);
  L2(rock, [
    [1262, 690, 16],
    [320, 560, 10],
    [530, 900, 14]
  ]);
  L2(stalag, [
    [80, 680, 9],
    [1250, 540, 8],
    [330, 840, 7],
    [1000, 700, 6]
  ]);
  for (const p of PROPS) if (p.r > 20) solid(p.x, p.y, p.r);
  for (const [x, y, r] of [
    [505, 520, 14],
    [815, 520, 14],
    [660, 770, 44],
    [795, 740, 56],
    [1125, 762, 34],
    [560, 858, 50],
    [760, 866, 50],
    [660, 892, 40]
  ])
    solid(x, y, r);
  solid(EXIT.x, EXIT.y, 64);
}

/* ---------- 窗外：血色山谷 ---------- */
function sky() {
  const w = BW + 200,
    p = new Uint32Array(w * BH),
    top = t(L.win[0][1] - L.win[0][3]),
    bot = t(L.win[0][1] + L.win[0][3]),
    SK = ramp('#14060c #1f0810 #2d0a14 #3f0d18 #560f1b #70131c #8d1a1d #ad271f #cc3b22 #e4592a #f3853a'),
    RD = ramp('#0a0408 #12060b #1b0a10 #270d14 #340f18 #45131c'),
    HOT = ramp('#ffe9d2 #ff8f5e'),
    crack = [];
  /* 天上的裂縫 */
  let cx = t(712) + 100,
    cy = top;
  for (let i = 0; i < 26; i++) {
    crack.push([cx, cy]);
    cx += (hs(i, 4) - 0.5) * 34;
    cy += 5 + hs(i, 8) * 9;
  }
  const cd = (x, y) => {
    let b = 1e9;
    for (let i = 0; i + 1 < crack.length; i++) {
      const a = crack[i],
        e = crack[i + 1],
        dx = e[0] - a[0],
        dy = e[1] - a[1],
        q = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy), 0, 1);
      b = min(b, hypot(x - a[0] - q * dx, y - a[1] - q * dy));
    }
    return b;
  };
  const span = bot - top,
    ridge = [0.7, 0.8, 0.9].map(
      (b, k) => x => top + span * b - fbm(x * (0.012 + k * 0.012) + k * 9, k * 3.1, 3) * span * (0.17 - k * 0.03)
    );
  for (let y = 0; y < min(bot + 20, BH); y++)
    for (let x = 0; x < w; x++) {
      const b = BAYER[((y & 7) << 3) | (x & 7)],
        v = clamp((y - top) / span, 0, 1),
        cl = fbm(x * 0.012, y * 0.05, 3),
        dc = y < top + span * 0.76 ? cd(x, y) : 99;
      let q = (0.16 + v * 1.0) * (SK.length - 1) + (cl - 0.5) * 3.4 + b * 1.1;
      q += max(0, 1 - dc / 44) * 4;
      let col = SK[clampi(q, SK.length - 1)];
      if (dc < 2.6) col = HOT[0];
      else if (dc < 6) col = HOT[1];
      for (let k = 0; k < 3; k++) {
        const r = ridge[k](x);
        if (y >= r) {
          const rim = y - r < 2 && k < 2 ? 2 : 0,
            f = clamp((y - r) / (span * 0.3), 0, 1),
            m = fbm(x * 0.06, y * 0.1, 2);
          col = RD[clampi(3 - k * 1.1 + rim + (1 - f) * 0.6 + (m - 0.5) * 2.2 + b * 0.8, RD.length - 1)];
        }
      }
      /* 遠處墜落留下的石柱 */
      if (v > 0.68 && v < 0.82 && hs(floor(x / 23), 77) > 0.8 && abs((x % 23) - 11) < 3 - (0.8 - v) * 30) col = RD[1];
      /* 谷底的血霧 */
      if (v > 0.8) {
        const fog = (v - 0.8) / 0.2 + (fbm(x * 0.02, y * 0.07, 2) - 0.5) * 0.9 + b * 0.35;
        if (fog > 0.4) col = SK[clampi(5.4 + fog * 4, SK.length - 1)];
      }
      p[y * w + x] = col;
    }
  return { p, w, h: BH };
}

/* ---------- PNG（色盤優先：檔案小很多） ---------- */
function png(px, w, h) {
  const pal = new Map(),
    idx = new Uint8Array(w * h);
  let indexed = true;
  for (let i = 0; i < w * h; i++) {
    const v = px[i] >>> 24 ? px[i] : 0;
    if (!pal.has(v)) {
      if (pal.size >= 256) {
        indexed = false;
        break;
      }
      pal.set(v, pal.size);
    }
    idx[i] = pal.get(v);
  }
  const chunk = (n, d) => {
      const b = Buffer.alloc(12 + d.length);
      b.writeUInt32BE(d.length, 0);
      b.write(n, 4, 'latin1');
      d.copy(b, 8);
      b.writeUInt32BE(zlib.crc32(b.subarray(4, 8 + d.length)), 8 + d.length);
      return b;
    },
    hd = Buffer.alloc(13);
  hd.writeUInt32BE(w, 0);
  hd.writeUInt32BE(h, 4);
  hd[8] = 8;
  hd[9] = indexed ? 3 : 6;
  const row = indexed ? w : w * 4,
    raw = Buffer.alloc((row + 1) * h);
  for (let y = 0; y < h; y++) {
    const o = y * (row + 1) + 1;
    if (indexed) raw.set(idx.subarray(y * w, y * w + w), o);
    else raw.set(new Uint8Array(px.buffer, px.byteOffset + y * w * 4, row), o);
  }
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hd)];
  if (indexed) {
    const c = [...pal.keys()],
      plte = Buffer.alloc(c.length * 3),
      trns = Buffer.alloc(c.length);
    c.forEach((v, i) => {
      plte[i * 3] = v & 255;
      plte[i * 3 + 1] = (v >> 8) & 255;
      plte[i * 3 + 2] = (v >> 16) & 255;
      trns[i] = v >>> 24;
    });
    parts.push(chunk('PLTE', plte), chunk('tRNS', trns));
  }
  parts.push(chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}
const ROOT = path.join(__dirname, '..');
function out(name, px, w, h) {
  const b = png(px, w, h),
    f = `img/hide-${name}.${crypto.createHash('sha1').update(b).digest('hex').slice(0, 8)}.png`;
  fs.writeFileSync(path.join(ROOT, f), b);
  console.log(f, (b.length / 1024) | 0, 'KB');
  return f;
}

/* ---------- 烘圖 ---------- */
for (const f of fs.readdirSync(path.join(ROOT, 'img')))
  if (f.startsWith('hide-')) fs.unlinkSync(path.join(ROOT, 'img', f));
field();
dress();
terrain();
layout();
/* 物件要先擺才算得出影子：地板最後畫，物件蓋回去 */
{
  const pxo = PX.slice(),
    ido = ID.slice();
  ground();
  for (let i = 0; i < N; i++) if (ido[i] > 1) (PX[i] = pxo[i]), (ID[i] = ido[i]);
}
const SCENE = out('scene', PX, BW, BH),
  FG = new Uint32Array(N);
for (let i = 0; i < N; i++) if (FGS.has(ID[i])) FG[i] = PX[i];
const FGF = out('fg', FG, BW, BH),
  SK = sky(),
  SKYF = out('sky', SK.p, SK.w, SK.h);
/* 格子牆：floor 超過 55% 的格子才能走 */
const cols = Math.ceil(L.W / TS),
  rows = Math.ceil(L.H / TS),
  tiles = new Uint8Array(cols * rows).fill(1);
for (let ty = 1; ty < rows - 1; ty++)
  for (let tx = 1; tx < cols - 1; tx++) {
    let n = 0,
      c = 0;
    for (let y = floor(t(ty * TS)); y < t((ty + 1) * TS); y++)
      for (let x = floor(t(tx * TS)); x < t((tx + 1) * TS); x++) n++, (c += FL[y * BW + x]);
    tiles[ty * cols + tx] = c / n >= 0.55 ? 0 : 1;
  }
/* 走得到：從出生點走到每個設施，最遠 3 秒（230 px/s） */
{
  const dist = new Float32Array(cols * rows).fill(1e9),
    q = [floor(SPAWN.y / TS) * cols + floor(SPAWN.x / TS)];
  dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    for (const d of [1, -1, cols, -cols])
      if (!tiles[i + d] && dist[i + d] > dist[i] + TS) (dist[i + d] = dist[i] + TS), q.push(i + d);
  }
  for (const p of [
    ...PROPS,
    ...DUMMIES.map(d => ({ n: '稻草人', ...d })),
    { n: '撿骨師', ...NPC.bone },
    { n: '赤鴉', ...NPC.crow },
    { n: '出口', ...EXIT }
  ]) {
    let b = 1e9;
    for (let y = -2; y <= 2; y++)
      for (let x = -2; x <= 2; x++) b = min(b, dist[(floor(p.y / TS) + y) * cols + floor(p.x / TS) + x] || 1e9);
    console.log(p.n, b === 1e9 ? '❌ 走不到' : Math.round(b) + ' px');
    if (b > 690) process.exitCode = 1;
  }
}
/* 另一張圖：稻草人、點亮的神像，用固定的光 */
PX.fill(0);
ID.fill(0);
cur = 1;
const SPR = {};
let FOOT = 0;
const LIT = mat('#2a1a10 #5a3518 #8c5a24 #bd8a3a #e6b85a #ffdf8c #fff3c8', 0, 0.3, 0.7);
let ax = 50,
  ay = 190;
const atlas = (name, fn, w) => {
  LIGHTS = [{ x: ax - 30, y: ay + 10, z: 120, r: 420, r2: 420 ** 2, i: 1.15, c: 0, s: 0 }];
  fn(ax, ay);
  const rx = max(ax - bx0, bx1 - ax) + 2;
  SPR[name] = [ax - rx, by0 - 2, rx * 2 + 1, by1 - by0 + 5];
  FOOT = (by0 - 2 + (by1 - by0 + 5) - ay) * TX;
  ax += w;
  if (ax > BW - 60) (ax = 50), (ay += 230);
};
[0, 1, 2].forEach(i => atlas('dummy' + i, (x, y) => dummy(i, x, y), 90));
ZOD.forEach(z => atlas('idol_' + z, (x, y) => statue(ZOD.indexOf(z), x, y, 1.26, LIT), 80));
const SPRH = ay + 60,
  SPRF = out('spr', PX.subarray(0, BW * SPRH), BW, SPRH);
const data = {
  TX,
  W: L.W,
  H: L.H,
  cols,
  rows,
  tiles: Array.from({ length: rows }, (_, y) => tiles.subarray(y * cols, (y + 1) * cols).join('')).join(''),
  img: { scene: SCENE, fg: FGF, sky: SKYF },
  skyW: SK.w,
  win: L.win[0],
  spawn: SPAWN,
  portal: { x: SPAWN.x, y: SPAWN.y },
  exit: EXIT,
  props: PROPS,
  zone: ZONE,
  dummies: DUMMIES,
  npc: NPC,
  solids: SOLID,
  statues: STAT.map(p => ({ z: ZOD[p.i], x: Math.round(p.x), y: Math.round(p.y) })),
  idolDy: Math.round(FOOT),
  fg: [...FGS.values()].map(o => ({ x: o.x, y: o.y, w: o.w, h: o.h, by: Math.round(o.by * TX) })),
  fires: [
    { x: 660, y: 770, s: 1 },
    { x: 505, y: 482, s: 0.42 },
    { x: 815, y: 482, s: 0.42 }
  ],
  lights: [
    { x: 660, y: 770, l: 300 },
    { x: 505, y: 482, l: 170 },
    { x: 815, y: 482, l: 170 }
  ]
};
fs.writeFileSync(
  path.join(ROOT, 'js/hideart.js'),
  `/* 自動產生（tools/hide_bake.js）；不要手改 */\nconst HIDE_ART = ${JSON.stringify(data)};\nif (typeof ART !== 'undefined') {\n  ART_SHEET.hide = ${JSON.stringify(SPRF)};\n  Object.assign(ART, ${JSON.stringify(Object.fromEntries(Object.entries(SPR).map(([k, v]) => [k, ['hide', ...v]])))});\n}\n`
);
