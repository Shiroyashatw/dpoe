/* 天賦樹拼塊表產生器（照 PoE2：一百多塊形狀都不一樣）。
   20 種基本形狀（直線、鋸齒、多邊形、圓、弧、星、輪、叉、梯子、梳子、箭頭、菱形、螺旋、蝴蝶結、十字、三角帶、鉤、扇、橋、風箏）
   兩三個組在一起產生幾千個候選 → 骨架（分岔、端點、迴圈大小、有沒有弧）一樣的只留一塊 →
   比「畫出來的樣子」（點和線畫到小格子圖、轉 12 個角度＋翻面取最像的）一塊一塊挑跟已挑的最不像的 →
   寫進 js/data.js 的 PT_SHAPES（兩個標記之間）。
   用法：node tools/pt_shapes.js [--write] [--png 總表.png] [--drop 3,17]（--drop：看總表後手動拿掉的編號） */
'use strict';
const fs = require('fs'),
  path = require('path');
const COUNT = 260;
const seenSk = new Map();
function gen(SEED, TRIES) {
  let seed = SEED;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296,
    ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)),
    TAU = Math.PI * 2;
  const mk = () => {
    const S = { p: [], e: [], arc: [], hot: [] };
    S.n = (x, y) => (S.p.push([x, y, 0]), S.p.length - 1);
    S.l = (a, b, arc = null) => {
      if (a !== b && !S.e.some(([x, y]) => (x === a && y === b) || (x === b && y === a)))
        S.e.push([a, b]), S.arc.push(arc);
    };
    S.ch = ids => ids.forEach((id, k) => k && S.l(ids[k - 1], id));
    return S;
  };
  /* 基本形狀：從點 A 往方向 th 長出去；P(u, v) 是這個方向的座標 */
  const MOT = {
    line: (S, A, P) => {
      const k = ri(2, 4),
        ids = [A];
      for (let i = 1; i <= k; i++) ids.push(S.n(...P(i, 0)));
      S.ch(ids);
      return [ids.at(-1)];
    },
    zig: (S, A, P) => {
      const k = ri(3, 5),
        w = 0.5 + rnd() * 0.3,
        ids = [A];
      for (let i = 1; i <= k; i++) ids.push(S.n(...P(i * 0.8, i % 2 ? w : -w)));
      S.ch(ids);
      return [ids.at(-1)];
    },
    poly: (S, A, P) => {
      const k = ri(3, 5),
        R = 0.5 / Math.sin(Math.PI / k),
        ids = [A];
      for (let j = 1; j < k; j++)
        ids.push(S.n(...P(R + Math.cos(Math.PI + (j * TAU) / k) * R, Math.sin(Math.PI + (j * TAU) / k) * R)));
      S.ch(ids), S.l(ids.at(-1), A);
      return [ids[Math.floor(k / 2)]];
    },
    circ: (S, A, P) => {
      const k = ri(4, 7),
        R = 0.5 / Math.sin(Math.PI / k),
        C = P(R, 0),
        ids = [A];
      for (let j = 1; j < k; j++)
        ids.push(S.n(...P(R + Math.cos(Math.PI + (j * TAU) / k) * R, Math.sin(Math.PI + (j * TAU) / k) * R)));
      ids.forEach((id, j) => S.l(id, ids[(j + 1) % k], [...C, R]));
      if (rnd() < 0.5) {
        const c = S.n(...C);
        S.l(c, ids[Math.floor(k / 2)]);
        S.hot.push(c);
        return [ids[Math.floor(k / 2)]];
      }
      return [ids[Math.floor(k / 2)]];
    },
    arc: (S, A, P) => {
      const k = ri(3, 5),
        Rr = 1.3 + rnd() * 1.4,
        side = rnd() < 0.5 ? 1 : -1,
        C = P(0, Rr * side),
        st = 2 * Math.asin(0.5 / Rr),
        ids = [A];
      for (let i = 1; i <= k; i++) {
        const a = -Math.PI / 2 + i * st;
        ids.push(S.n(...P(Math.cos(a) * Rr, (Rr + Math.sin(a) * Rr) * side)));
      }
      ids.forEach((id, i) => i && S.l(ids[i - 1], id, [...C, Rr]));
      return [ids.at(-1)];
    },
    star: (S, A, P) => {
      const c = S.n(...P(1, 0)),
        k = ri(2, 4),
        L = rnd() < 0.4 ? 2 : 1,
        tips = [];
      S.l(A, c);
      S.hot.push(c);
      for (let j = 1; j <= k; j++) {
        const a = Math.PI + (j * TAU) / (k + 1);
        let prev = c;
        for (let t = 1; t <= L; t++) {
          const q = S.n(...P(1 + Math.cos(a) * t, Math.sin(a) * t));
          S.l(prev, q);
          prev = q;
        }
        tips.push(prev);
      }
      return tips;
    },
    wheel: (S, A, P) => {
      const k = ri(4, 5),
        R = 0.5 / Math.sin(Math.PI / k),
        ids = [A];
      for (let j = 1; j < k; j++)
        ids.push(S.n(...P(R + Math.cos(Math.PI + (j * TAU) / k) * R, Math.sin(Math.PI + (j * TAU) / k) * R)));
      S.ch(ids), S.l(ids.at(-1), A);
      if (R < 0.95) return [ids[Math.floor(k / 2)]];
      const c = S.n(...P(R, 0)),
        sp = ri(2, k);
      for (let j = 0; j < sp; j++) S.l(c, ids[Math.floor((j * k) / sp)]);
      S.hot.push(c);
      return [ids[Math.floor(k / 2)]];
    },
    fork: (S, A, P) => {
      const m = S.n(...P(1, 0)),
        b = ri(2, 3),
        L = ri(1, 2),
        spread = 0.5 + rnd() * 0.5,
        tips = [];
      S.l(A, m);
      for (let j = 0; j < b; j++) {
        const a = (j - (b - 1) / 2) * spread;
        let prev = m;
        for (let t = 1; t <= L; t++) {
          const q = S.n(...P(1 + Math.cos(a) * t, Math.sin(a) * t));
          S.l(prev, q);
          prev = q;
        }
        tips.push(prev);
      }
      return tips;
    },
    ladder: (S, A, P) => {
      const k = ri(2, 4),
        a = [],
        b = [];
      for (let i = 1; i <= k; i++) a.push(S.n(...P(i * 0.9, 0.5))), b.push(S.n(...P(i * 0.9, -0.5)));
      S.l(A, a[0]), S.l(A, b[0]), S.ch(a), S.ch(b);
      for (let i = 1; i < k; i += rnd() < 0.5 ? 1 : 2) S.l(a[i], b[i]);
      return [a.at(-1), b.at(-1)];
    },
    comb: (S, A, P) => {
      const k = ri(3, 4),
        both = rnd() < 0.4,
        ids = [A],
        tips = [];
      for (let i = 1; i <= k; i++) ids.push(S.n(...P(i, 0)));
      S.ch(ids);
      for (let i = 1; i <= k; i += 2) {
        const t = S.n(...P(i, 1));
        S.l(ids[i], t), tips.push(t);
        if (both) S.l(ids[i], S.n(...P(i, -1)));
      }
      return [ids.at(-1), ...tips];
    },
    arrow: (S, A, P) => {
      const k = ri(2, 3),
        ids = [A];
      for (let i = 1; i <= k; i++) ids.push(S.n(...P(i, 0)));
      S.ch(ids);
      const t = ids.at(-1),
        bl = rnd() < 0.5 ? 1 : 2;
      for (const s of [1, -1]) {
        let prev = t;
        for (let j = 1; j <= bl; j++) {
          const q = S.n(...P(k - 0.7 * j, s * 0.75 * j));
          S.l(prev, q);
          prev = q;
        }
      }
      S.hot.push(t);
      return [t];
    },
    diamond: (S, A, P) => {
      const w = 0.6 + rnd() * 0.3,
        u = S.n(...P(0.9, w)),
        d = S.n(...P(0.9, -w)),
        f = S.n(...P(1.8, 0));
      S.l(A, u), S.l(A, d), S.l(u, f), S.l(d, f);
      if (rnd() < 0.5) {
        const c = S.n(...P(0.9, 0));
        S.l(c, u), S.l(c, d), S.hot.push(c);
      }
      return [f];
    },
    spiral: (S, A, P) => {
      const k = ri(5, 7),
        ids = [A];
      let a = 0,
        r = 2.2;
      const cx = 0,
        cy = 0;
      for (let i = 1; i <= k; i++) {
        a += 1 / r;
        r -= 0.22;
        ids.push(S.n(...P(cx + Math.sin(a) * r * 1.0 + 0, cy + (2.2 - Math.cos(a) * r))));
      }
      S.ch(ids);
      S.hot.push(ids.at(-1));
      return [ids.at(-1)];
    },
    bowtie: (S, A, P) => {
      const m = S.n(...P(1.6, 0)),
        a1 = S.n(...P(0.8, 0.55)),
        a2 = S.n(...P(0.8, -0.55)),
        b1 = S.n(...P(2.4, 0.55)),
        b2 = S.n(...P(2.4, -0.55));
      S.l(A, a1), S.l(A, a2), S.l(a1, m), S.l(a2, m), S.l(m, b1), S.l(m, b2), S.l(b1, b2);
      S.hot.push(m);
      return [b1, b2];
    },
    cross: (S, A, P) => {
      const c = S.n(...P(1, 0)),
        L = ri(1, 2),
        tips = [];
      S.l(A, c);
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [0, -1]
      ]) {
        let prev = c;
        for (let t = 1; t <= L; t++) {
          const q = S.n(...P(1 + dx * t, dy * t));
          S.l(prev, q);
          prev = q;
        }
        tips.push(prev);
      }
      S.hot.push(c);
      return tips;
    },
    tris: (S, A, P) => {
      const k = ri(3, 5),
        ids = [A];
      for (let i = 1; i <= k; i++) ids.push(S.n(...P(i * 0.5, i % 2 ? 0.85 : 0)));
      for (let i = 1; i <= k; i++) S.l(ids[i - 1], ids[i]), i > 1 && S.l(ids[i - 2], ids[i]);
      return [ids.at(-1)];
    },
    hook: (S, A, P) => {
      const k = ri(1, 2),
        ids = [A];
      for (let i = 1; i <= k; i++) ids.push(S.n(...P(i, 0)));
      S.ch(ids);
      const Rr = 0.9,
        side = rnd() < 0.5 ? 1 : -1,
        C = P(k, Rr * side),
        n = ri(2, 3);
      let prev = ids.at(-1);
      for (let j = 1; j <= n; j++) {
        const a = -Math.PI / 2 + (j * Math.PI) / 3;
        const q = S.n(...P(k + Math.cos(a) * Rr, (Rr + Math.sin(a) * Rr) * side));
        S.l(prev, q, [...C, Rr]);
        prev = q;
      }
      return [prev];
    },
    fan: (S, A, P) => {
      const k = ri(3, 4),
        L = 1.6,
        sp = 1.2 + rnd() * 0.6,
        C = P(0, 0),
        tips = [];
      for (let j = 0; j < k; j++) {
        const a = (j / (k - 1) - 0.5) * sp;
        const q = S.n(...P(Math.cos(a) * L, Math.sin(a) * L));
        S.l(A, q);
        if (tips.length) S.l(tips.at(-1), q, [...C, L]);
        tips.push(q);
      }
      S.hot.push(A);
      return [tips[0], tips.at(-1)];
    },
    bridge: (S, A, P) => {
      const a = S.n(...P(1, 0.5)),
        b = S.n(...P(1, -0.5)),
        c = S.n(...P(2, 0.5)),
        d = S.n(...P(2, -0.5)),
        e = S.n(...P(2.9, 0));
      S.l(A, a), S.l(A, b), S.l(a, c), S.l(b, d), S.l(c, e), S.l(d, e), S.l(a, b);
      return [e];
    },
    kite: (S, A, P) => {
      const u = S.n(...P(0.7, 0.7)),
        d = S.n(...P(0.7, -0.7)),
        f = S.n(...P(2.2, 0));
      S.l(A, u), S.l(A, d), S.l(u, f), S.l(d, f), S.l(A, f);
      S.hot.push(f);
      return [f];
    }
  };
  const NAMES = Object.keys(MOT),
    CURVE = new Set(['circ', 'arc', 'hook', 'fan']);
  /* 一個候選：根形狀＋0～2 個接在上面的形狀 */
  function build() {
    const S = mk(),
      A = S.n(0, 0),
      root = NAMES[ri(0, NAMES.length - 1)],
      at = (x0, y0, th) => (u, v) => [
        x0 + Math.cos(th) * u - Math.sin(th) * v,
        y0 + Math.sin(th) * u + Math.cos(th) * v
      ];
    let tips = MOT[root](S, A, at(0, 0, 0)),
      used = root;
    const extra = rnd() < 0.2 ? 0 : rnd() < 0.55 ? 1 : rnd() < 0.8 ? 2 : 3;
    for (let k = 0; k < extra; k++) {
      const t = tips[ri(0, tips.length - 1)],
        [x, y] = S.p[t],
        cx = S.p.reduce((s, q) => s + q[0], 0) / S.p.length,
        cy = S.p.reduce((s, q) => s + q[1], 0) / S.p.length,
        th = Math.atan2(y - cy, x - cx) + (rnd() - 0.5) * 1.4,
        m = NAMES[ri(0, NAMES.length - 1)];
      tips = MOT[m](S, t, at(x, y, th));
      used += '+' + m;
    }
    /* 根的點也可能是大點（死路的終點）；大點 1～3 個、不相鄰 */
    const n = S.p.length,
      deg = Array(n).fill(0);
    for (const [a, b] of S.e) deg[a]++, deg[b]++;
    const want = 1 + (n >= 7 ? 1 : 0) + (n >= 11 && rnd() < 0.5 ? 1 : 0),
      cand = [...new Set([...S.hot, ...tips, ...deg.map((d, i) => (d === 1 ? i : -1)).filter(i => i > 0)])],
      adj = (a, b) => S.e.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    let got = 0;
    for (const c of cand.sort(() => rnd() - 0.5))
      if (got < want && !S.p.some((q, i) => q[2] && adj(i, c))) (S.p[c][2] = 1), got++;
    if (!got) S.p[n - 1][2] = 1;
    S.kind = used;
    return S;
  }
  /* 合格：3～12 點、點不擠、直線不穿過別的點、直線不交叉 */
  const segD = ([px, py], [ax, ay], [bx, by]) => {
    const dx = bx - ax,
      dy = by - ay,
      f = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - ax - dx * f, py - ay - dy * f);
  };
  const cross = (a, b, c, d) => {
    const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  };
  function ok(S) {
    const P = S.p,
      n = P.length;
    if (n < 4 || n > 12) return false;
    /* 緊湊：一路串下去（只有 2 條線）的點最多 3 個、不能太細長 */
    const dg = Array(n).fill(0);
    for (const [a, b] of S.e) dg[a]++, dg[b]++;
    for (const [a, b] of S.e)
      if (dg[a] === 2 && dg[b] === 2) {
        let run = 0;
        const seen = new Set(),
          st = [a];
        while (st.length) {
          const x = st.pop();
          if (seen.has(x) || dg[x] !== 2) continue;
          seen.add(x), run++;
          for (const [u, v] of S.e) (u === x && st.push(v)) || (v === x && st.push(u));
        }
        if (run > 3) return false;
      }
    {
      const cx = P.reduce((t, q) => t + q[0], 0) / n,
        cy = P.reduce((t, q) => t + q[1], 0) / n;
      let a = 0,
        b = 0,
        c = 0;
      for (const [x, y] of P) (a += (x - cx) ** 2), (b += (y - cy) ** 2), (c += (x - cx) * (y - cy));
      const dt = Math.sqrt(((a - b) / 2) ** 2 + c * c);
      if ((a + b) / 2 - dt < ((a + b) / 2 + dt) * 0.06) return false;
    }
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) if (Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]) < 0.72) return false;
    for (const [a, b] of S.e)
      for (let i = 0; i < n; i++) if (i !== a && i !== b && segD(P[i], P[a], P[b]) < 0.32) return false;
    for (let x = 0; x < S.e.length; x++)
      for (let y = x + 1; y < S.e.length; y++) {
        const [a, b] = S.e[x],
          [c, d] = S.e[y];
        if (a === c || a === d || b === c || b === d) continue;
        if (cross(P[a], P[b], P[c], P[d])) return false;
      }
    return true;
  }
  /* 骨架：中間一路串過去的點（2 條線）縮掉，只看分岔點、端點、迴圈大小、有沒有弧、大點在哪 */
  function skel(S) {
    const n = S.p.length,
      adj = Array.from({ length: n }, () => []);
    for (const [a, b] of S.e) adj[a].push(b), adj[b].push(a);
    const dep = Array(n).fill(-1),
      par = Array(n).fill(-1),
      q = [0],
      cyc = [];
    dep[0] = 0;
    for (let h = 0; h < q.length; h++)
      for (const o of adj[q[h]]) if (dep[o] < 0) (dep[o] = dep[q[h]] + 1), (par[o] = q[h]), q.push(o);
    for (const [a, b] of S.e)
      if (par[a] !== b && par[b] !== a) {
        let x = a,
          y = b,
          L = 1;
        while (x !== y) dep[x] >= dep[y] ? ((x = par[x]), L++) : ((y = par[y]), L++);
        cyc.push(L);
      }
    const ds = adj.map(o => o.length);
    const big = S.p
      .map((q, i) => (q[2] ? (ds[i] === 1 ? 'e' : ds[i] === 2 ? 'm' : 'h') : ''))
      .filter(Boolean)
      .sort();
    return [
      ds
        .filter(d => d !== 2)
        .sort()
        .join(''),
      cyc.sort().join(','),
      S.arc.some(Boolean) ? 'c' : ''
    ].join('|');
  }
  const pool = [];
  for (let t = 0; t < TRIES; t++) {
    const S = build();
    if (!ok(S) || S.p.length < 4) continue;
    const k = skel(S);
    if (seenSk.has(k)) continue;
    seenSk.set(k, 1);
    S.sk = k;
    pool.push(S);
  }
  return pool;
}

/* ---------- 比「畫出來的樣子」 ---------- */
const G = 11,
  SPAN = 2.4,
  ROT = 12;
function samples(S) {
  const out = [];
  S.p.forEach(([x, y, b]) => out.push([x, y, b ? 3 : 2]));
  S.e.forEach(([a, b], k) => {
    const A = S.p[a],
      B = S.p[b],
      c = S.arc[k];
    if (c) {
      const a1 = Math.atan2(A[1] - c[1], A[0] - c[0]);
      let da = Math.atan2(B[1] - c[1], B[0] - c[0]) - a1;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const n = Math.max(2, Math.ceil((Math.abs(da) * c[2]) / 0.2));
      for (let t = 1; t < n; t++)
        out.push([c[0] + Math.cos(a1 + (da * t) / n) * c[2], c[1] + Math.sin(a1 + (da * t) / n) * c[2], 1]);
    } else {
      const n = Math.max(2, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / 0.2));
      for (let t = 1; t < n; t++) out.push([A[0] + ((B[0] - A[0]) * t) / n, A[1] + ((B[1] - A[1]) * t) / n, 1]);
    }
  });
  const W = out.reduce((s, q) => s + q[2], 0),
    cx = out.reduce((s, q) => s + q[0] * q[2], 0) / W,
    cy = out.reduce((s, q) => s + q[1] * q[2], 0) / W,
    rms = Math.sqrt(out.reduce((s, q) => s + ((q[0] - cx) ** 2 + (q[1] - cy) ** 2) * q[2], 0) / W) || 1;
  return out.map(([x, y, w]) => [(x - cx) / rms, (y - cy) / rms, w]);
}
function raster(sm, th, mir) {
  const g = new Float64Array(G * G),
    c = Math.cos(th),
    s = Math.sin(th);
  const put = (i, j, w) => i >= 0 && j >= 0 && i < G && j < G && (g[j * G + i] += w);
  for (const [x0, y0, w] of sm) {
    const y1 = y0 * mir,
      x = x0 * c - y1 * s,
      y = x0 * s + y1 * c,
      i = Math.floor(((x + SPAN) / (2 * SPAN)) * G),
      j = Math.floor(((y + SPAN) / (2 * SPAN)) * G);
    put(i, j, w);
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ])
      put(i + di, j + dj, w * 0.35);
  }
  const t = g.reduce((a, b) => a + b, 0);
  return g.map(v => v / t);
}
function look(S) {
  const sm = samples(S),
    v = [];
  for (const mir of [1, -1]) for (let r = 0; r < ROT; r++) v.push(raster(sm, (r / ROT) * Math.PI * 2, mir));
  return v;
}
function dist(a, b) {
  const A = a.look[0];
  let best = 9;
  for (const B of b.look) {
    let d = 0;
    for (let i = 0; i < A.length && d < best; i++) d += Math.abs(A[i] - B[i]);
    if (d < best) best = d;
  }
  return best;
}

/* ---------- 挑 ---------- */
const BANF = path.join(__dirname, 'pt_shapes_ban.json'),
  BAN = new Set(fs.existsSync(BANF) ? JSON.parse(fs.readFileSync(BANF, 'utf8')) : []);
function select() {
  seenSk.clear();
  const pool = [913, 1777, 4242, 5150, 6011, 7369, 8081, 9203, 1013, 2027, 3301, 4409, 5521, 6637]
    .flatMap(sd => gen(sd, 30000))
    .filter(S => !BAN.has(S.sk));
  for (const S of pool) S.look = look(S);
  const curvy = S => S.arc.some(Boolean),
    ring = S =>
      S.sk
        .split('|')[1]
        .split(',')
        .some(L => +L >= 5),
    hex = S =>
      S.sk
        .split('|')[1]
        .split(',')
        .some(L => +L >= 6),
    strip = S => /ladder|tris|bridge/.test(S.kind),
    md = pool.map(() => 9),
    pick = [];
  /* 第一塊：六點左右的普通形狀 */
  let bi = pool.findIndex(S => S.p.length === 6);
  while (pick.length < COUNT && bi >= 0) {
    pick.push(pool[bi]);
    md[bi] = -1;
    for (let i = 0; i < pool.length; i++) if (md[i] >= 0) md[i] = Math.min(md[i], dist(pool[i], pool[bi]));
    /* 搶眼的形狀限量：有弧的 1/4、大圈（五邊以上）25%、六邊以上 5%、梯子三角帶 10% */
    const full = [
      [curvy, COUNT / 4],
      [ring, COUNT * 0.25],
      [hex, COUNT * 0.05],
      [strip, COUNT * 0.1]
    ].filter(([f, cap]) => pick.filter(f).length >= cap);
    bi = -1;
    for (let i = 0; i < pool.length; i++)
      if (md[i] >= 0 && !full.some(([f]) => f(pool[i])) && (bi < 0 || md[i] > md[bi])) bi = i;
  }
  console.log(
    `候選 ${pool.length} 塊（骨架都不同），挑 ${pick.length} 塊；最像的兩塊差距 ${Math.min(...pick.slice(1).map(S => Math.min(...pick.filter(o => o !== S).map(o => dist(S, o))))).toFixed(3)}`
  );
  return pick;
}
/* 輸出格式（字串，省空間）：點「x,y,大」用 ; 分開 | 線「a-b」 | 弧「線編號:圓心x,圓心y,半徑」 */
function enc(S) {
  const n = S.p.length,
    cx = S.p.reduce((s, q) => s + q[0], 0) / n,
    cy = S.p.reduce((s, q) => s + q[1], 0) / n,
    r2 = v => +v.toFixed(2);
  return [
    S.p.map(([x, y, b]) => `${r2(x - cx)},${r2(y - cy)}${b ? ',1' : ''}`).join(';'),
    S.e.map(([a, b]) => `${a}-${b}`).join(','),
    S.arc
      .map((c, k) => (c ? `${k}:${r2(c[0] - cx)},${r2(c[1] - cy)},${r2(c[2])}` : ''))
      .filter(Boolean)
      .join(';')
  ].join('|');
}
async function png(pick, file) {
  const { chromium } = require('playwright'),
    cols = 15,
    cell = 110;
  let svg = '';
  pick.forEach((S, i) => {
    const X = (i % cols) * cell + cell / 2,
      Y = Math.floor(i / cols) * cell + cell / 2,
      n = S.p.length,
      cx = S.p.reduce((s, q) => s + q[0], 0) / n,
      cy = S.p.reduce((s, q) => s + q[1], 0) / n,
      ext = Math.max(...S.p.map(p => Math.hypot(p[0] - cx, p[1] - cy))) || 1,
      k = Math.min(18, (cell / 2 - 10) / ext),
      T = ([x, y]) => [X + (x - cx) * k, Y + (y - cy) * k];
    S.e.forEach(([a, b], j) => {
      const A = T(S.p[a]),
        B = T(S.p[b]),
        c = S.arc[j];
      if (c) {
        const C = T(c),
          cw = (A[0] - C[0]) * (B[1] - C[1]) - (A[1] - C[1]) * (B[0] - C[0]) > 0 ? 1 : 0;
        svg += `<path d="M${A} A${c[2] * k} ${c[2] * k} 0 0 ${cw} ${B}" fill="none" stroke="#999"/>`;
      } else svg += `<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="#999"/>`;
    });
    S.p.forEach(p => {
      const [x, y] = T(p);
      svg += `<circle cx="${x}" cy="${y}" r="${p[2] ? 6 : 3.5}" fill="${p[2] ? '#e8b04a' : '#ccc'}"/>`;
    });
    svg += `<text x="${X - cell / 2 + 4}" y="${Y - cell / 2 + 12}" fill="#777" font-size="10">${i}</text>`;
  });
  const W = cols * cell,
    H = Math.ceil(pick.length / cols) * cell,
    b = await chromium.launch(),
    p = await b.newPage({ viewport: { width: W, height: H } });
  await p.setContent(`<body style="margin:0;background:#111"><svg width="${W}" height="${H}">${svg}</svg></body>`);
  await p.screenshot({ path: file });
  await b.close();
}
(async () => {
  const arg = k => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
  let pick = select();
  if (arg('--drop')) {
    for (const i of arg('--drop').split(',').map(Number)) BAN.add(pick[i].sk);
    fs.writeFileSync(BANF, JSON.stringify([...BAN].sort(), null, 1) + '\n');
    pick = select();
  }
  console.log(
    `共 ${pick.reduce((s, S) => s + S.p.length, 0)} 點；有弧的 ${pick.filter(S => S.arc.some(Boolean)).length} 塊`
  );
  if (arg('--png')) await png(pick, arg('--png'));
  if (process.argv.includes('--write')) {
    const f = path.join(__dirname, '../js/data.js'),
      s = fs.readFileSync(f, 'utf8'),
      A = '/* PT_SHAPES 開始（tools/pt_shapes.js 產生，不要手改） */',
      B = '/* PT_SHAPES 結束 */',
      i = s.indexOf(A),
      j = s.indexOf(B);
    if (i < 0 || j < 0) throw new Error('data.js 找不到 PT_SHAPES 標記');
    const body = `${A}\nconst PT_SHAPES = [\n${pick.map(S => `  '${enc(S)}'`).join(',\n')}\n];\n`;
    fs.writeFileSync(f, s.slice(0, i) + body + s.slice(j));
    console.log('已寫入 js/data.js');
  }
})();
