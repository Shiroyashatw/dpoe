/* dungeonPOE · 地圖場景（0.2.14）：冰雪洞窟、岩漿地城、毒沼古墓、廢棄廟宇（藏身處在 hideout.js）。
   只有外觀，不影響戰鬥。地板花紋 bFloor、地上細節 bDecals、牆 bWalls、擺設 decorate／bDeco、
   光源 bLights（在暗層挖洞）／bGlow（疊一層色光）。擺設只是畫，不擋路 */
'use strict';
const BIOMES = {
  ice: {
    n: '冰雪洞窟',
    top: '#1f3044',
    face: '#35607e',
    hi: '#a8d8f0',
    line: '#16263a',
    dark: '3,7,14',
    light: '143,214,255'
  },
  lava: {
    n: '岩漿地城',
    top: '#1b1311',
    face: '#2a1d18',
    hi: '#5c3a28',
    line: '#0c0807',
    dark: '12,4,2',
    light: '255,138,60'
  },
  tomb: {
    n: '毒沼古墓',
    top: '#18201a',
    face: '#28362b',
    hi: '#4c6250',
    line: '#0b100c',
    dark: '3,9,5',
    light: '140,240,140'
  },
  temple: {
    n: '廢棄廟宇',
    top: '#1c181e',
    face: '#6a241b',
    hi: '#a63c2b',
    line: '#2a150e',
    dark: '7,4,3',
    light: '255,179,90'
  }
};
const BIO = () => (G.scene === 'hide' ? HIDE_BIO : BIOMES[G.biome] || BIOMES.temple);

/* ---------- 地板：每種場景一張 256×256 的花紋（固定亂數，畫一次） ---------- */
const FLOORS = {};
function bFloor() {
  const b = G.biome || 'temple';
  if (FLOORS[b]) return FLOORS[b];
  const N = 256,
    c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d'),
    R = rng(h(b.length, b.charCodeAt(0))),
    dots = (n, col, a, s = 2) => {
      for (let i = 0; i < n; i++) {
        g.fillStyle = `rgba(${col},${R() * a})`;
        g.fillRect(R() * N, R() * N, s, s);
      }
    };
  if (b === 'temple') {
    /* 木地板：橫條、接縫錯開、木紋 */
    g.fillStyle = '#140d09';
    g.fillRect(0, 0, N, N);
    for (let y = 0; y < N; y += 16) {
      let x = -Math.floor(R() * 96);
      while (x < N) {
        const w = 64 + Math.floor(R() * 64),
          v = 40 + Math.floor(R() * 12);
        g.fillStyle = `rgb(${v + 10},${v - 6},${v - 18})`;
        g.fillRect(x + 1, y + 1, w - 2, 14);
        g.fillStyle = 'rgba(0,0,0,0.18)';
        for (let k = 0; k < 3; k++) g.fillRect(x + 4 + R() * (w - 12), y + 4 + R() * 7, 6 + R() * 18, 1);
        x += w;
      }
    }
    dots(500, '255,220,170', 0.05);
  } else if (b === 'tomb') {
    /* 青石墓磚：長磚錯縫、苔痕 */
    g.fillStyle = '#080b09';
    g.fillRect(0, 0, N, N);
    for (let y = 0; y < N; y += 16)
      for (let x = (y / 16) % 2 ? -16 : 0; x < N; x += 32) {
        const v = 26 + Math.floor(R() * 9);
        g.fillStyle = `rgb(${v},${v + 8},${v + 2})`;
        g.fillRect(x + 1, y + 1, 30, 14);
      }
    for (let i = 0; i < 14; i++) {
      g.fillStyle = `rgba(70,110,60,${0.12 + R() * 0.12})`;
      g.beginPath();
      g.ellipse(R() * N, R() * N, 6 + R() * 14, 3 + R() * 6, R() * 3, 0, TAU);
      g.fill();
    }
    dots(600, '150,220,140', 0.05);
  } else {
    /* 冰、岩漿：大石板＋裂縫（冰是白色霜裂，岩漿是發光的紅縫） */
    const ice = b === 'ice';
    g.fillStyle = ice ? '#0b1118' : '#060303';
    g.fillRect(0, 0, N, N);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const v = Math.floor(R() * 8),
          ox = Math.floor(R() * 6) - 3;
        g.fillStyle = ice ? `rgb(${28 + v},${42 + v},${56 + v})` : `rgb(${30 + v},${22 + v},${20 + v})`;
        g.fillRect(x * 64 + 2 + ox, y * 64 + 2, 60, 60);
      }
    g.lineWidth = ice ? 1 : 2;
    for (let i = 0; i < (ice ? 10 : 7); i++) {
      g.strokeStyle = ice
        ? `rgba(220,240,255,${0.15 + R() * 0.15})`
        : `rgba(255,${90 + Math.floor(R() * 60)},30,${0.45 + R() * 0.3})`;
      g.beginPath();
      let px = R() * N,
        py = R() * N;
      g.moveTo(px, py);
      for (let k = 0; k < 5; k++) g.lineTo((px += R() * 30 - 15), (py += R() * 30 - 15));
      g.stroke();
    }
    dots(ice ? 900 : 400, ice ? '230,245,255' : '255,140,60', ice ? 0.12 : 0.1);
  }
  return (FLOORS[b] = CX.createPattern(c, 'repeat'));
}

/* ---------- 地上的細節：每格用固定亂數決定有沒有、是什麼 ---------- */
function bDecals(W, H) {
  const b = G.biome,
    x0 = Math.max(0, Math.floor((G.cam.x - W / 2) / TS)),
    x1 = Math.min(G.cols - 1, Math.ceil((G.cam.x + W / 2) / TS)),
    y0 = Math.max(0, Math.floor((G.cam.y - H / 2) / TS)),
    y1 = Math.min(G.rows - 1, Math.ceil((G.cam.y + H / 2) / TS));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (G.tiles[y * G.cols + x]) continue;
      const v = h(x, y, 7);
      if (v % 100 >= 18) continue;
      const k = (v >>> 8) % 3,
        px = x * TS + ((v >>> 12) % 32) + 8,
        py = y * TS + ((v >>> 17) % 32) + 8;
      if (b === 'ice') {
        if (k === 2) {
          CX.fillStyle = 'rgba(200,230,255,0.25)';
          CX.fillRect(px - 1, py - 6, 2, 8);
          CX.fillRect(px + 4, py - 3, 2, 5);
        } else {
          CX.fillStyle = 'rgba(235,245,255,0.13)';
          CX.beginPath();
          CX.ellipse(px, py, 16 + k * 6, 6, 0, 0, TAU);
          CX.fill();
        }
      } else if (b === 'lava') {
        if (k === 0) {
          CX.fillStyle = 'rgba(0,0,0,0.35)';
          CX.beginPath();
          CX.ellipse(px, py, 18, 8, 0, 0, TAU);
          CX.fill();
        } else {
          CX.fillStyle = `rgba(255,${k === 1 ? 120 : 190},50,${0.45 + 0.35 * Math.sin(G.t * 3 + v)})`;
          CX.fillRect(px, py, 2, 2);
          CX.fillRect(px + 7, py + 3, 2, 2);
        }
      } else if (b === 'tomb') {
        if (k === 0) {
          CX.fillStyle = 'rgba(120,200,90,0.16)';
          CX.beginPath();
          CX.ellipse(px, py, 14, 6, 0, 0, TAU);
          CX.fill();
        } else if (k === 1) {
          /* 骨頭 */
          CX.fillStyle = 'rgba(220,214,190,0.5)';
          CX.fillRect(px - 6, py, 12, 2);
          CX.fillRect(px - 7, py - 1, 3, 4);
          CX.fillRect(px + 4, py - 1, 3, 4);
        } else {
          CX.fillStyle = 'rgba(60,90,50,0.35)';
          CX.fillRect(px - 8, py, 16, 3);
        }
      } else {
        if (k === 0) {
          /* 冥紙 */
          CX.fillStyle = 'rgba(214,170,70,0.55)';
          CX.fillRect(px, py, 7, 5);
          CX.fillRect(px + 9, py + 4, 6, 4);
        } else if (k === 1) {
          /* 掉在地上的符咒 */
          CX.fillStyle = 'rgba(230,200,90,0.6)';
          CX.fillRect(px, py, 5, 14);
          CX.fillStyle = 'rgba(170,30,20,0.7)';
          CX.fillRect(px + 2, py + 3, 1, 8);
        } else {
          CX.fillStyle = 'rgba(0,0,0,0.25)';
          CX.fillRect(px - 10, py, 20, 2);
        }
      }
    }
}

/* ---------- 牆：頂面＋朝下的正面（有磚縫、場景的特徵）；鄰接地板的邊描亮線 ---------- */
function bWalls(W, H) {
  const B = BIO(),
    b = G.biome,
    x0 = Math.max(0, Math.floor((G.cam.x - W / 2) / TS) - 1),
    x1 = Math.min(G.cols - 1, Math.ceil((G.cam.x + W / 2) / TS) + 1),
    y0 = Math.max(0, Math.floor((G.cam.y - H / 2) / TS) - 1),
    y1 = Math.min(G.rows - 1, Math.ceil((G.cam.y + H / 2) / TS) + 1),
    T = G.tiles,
    C = G.cols,
    wall = (x, y) => x < 0 || y < 0 || x >= C || y >= G.rows || T[y * C + x] === 1,
    FH = TS * 0.55,
    pulse = 0.55 + 0.3 * Math.sin(G.t * 2);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!wall(x, y)) continue;
      const px = x * TS,
        py = y * TS,
        v = h(x, y, 3);
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (!wall(x + dx, y + dy)) near = true;
      CX.fillStyle = near ? B.top : '#050404';
      CX.fillRect(px, py, TS, TS);
      if (!near) continue;
      /* 頂面：廟宇是屋瓦（一排排弧），其他是粗石 */
      if (b === 'temple') {
        CX.strokeStyle = 'rgba(255,255,255,0.06)';
        CX.lineWidth = 2;
        for (let r = 0; r < 3; r++) {
          CX.beginPath();
          for (let i = 0; i < 4; i++) CX.arc(px + 6 + i * 12, py + 10 + r * 12, 6, 0, Math.PI);
          CX.stroke();
        }
      } else {
        CX.fillStyle = 'rgba(255,255,255,0.03)';
        CX.fillRect(px + (v % 20), py + ((v >>> 5) % 20), 16, 12);
      }
      CX.fillStyle = B.hi;
      CX.globalAlpha = 0.35;
      if (!wall(x - 1, y)) CX.fillRect(px, py, 2, TS);
      if (!wall(x + 1, y)) CX.fillRect(px + TS - 2, py, 2, TS);
      if (!wall(x, y - 1)) CX.fillRect(px, py, TS, 2);
      CX.globalAlpha = 1;
      if (wall(x, y + 1)) continue;
      /* 正面 */
      const fy = py + TS - FH;
      CX.fillStyle = B.face;
      CX.fillRect(px, fy, TS, FH);
      CX.fillStyle = B.hi;
      CX.fillRect(px, fy, TS, 3);
      if (b === 'temple') {
        /* 紅漆牆＋木樑＋金邊；隔幾格一根木柱 */
        CX.fillStyle = B.line;
        CX.fillRect(px, fy + 3, TS, 5);
        CX.fillStyle = '#c9a227';
        CX.fillRect(px, fy + 8, TS, 1);
        if (v % 3 === 0) {
          CX.fillStyle = '#3a2418';
          CX.fillRect(px + 2, fy + 3, 7, FH - 3);
        }
      } else {
        CX.fillStyle = B.line;
        CX.globalAlpha = 0.6;
        for (let r = 1; r < 3; r++) {
          const ly = fy + 3 + r * 8;
          CX.fillRect(px, ly, TS, 1);
          CX.fillRect(px + ((v >>> (r * 4)) % 36) + 4, ly - 8, 1, 8);
        }
        CX.globalAlpha = 1;
        if (b === 'ice') {
          CX.strokeStyle = 'rgba(220,245,255,0.35)';
          CX.lineWidth = 1;
          CX.beginPath();
          CX.moveTo(px + (v % 30) + 6, fy + 5);
          CX.lineTo(px + (v % 30) + 14, fy + FH - 2);
          CX.stroke();
          /* 冰柱 */
          if (v % 4 === 0) {
            CX.fillStyle = 'rgba(190,230,255,0.7)';
            CX.beginPath();
            CX.moveTo(px + 20, py + TS);
            CX.lineTo(px + 26, py + TS);
            CX.lineTo(px + 23, py + TS + 10);
            CX.fill();
          }
        } else if (b === 'lava' && v % 2 === 0) {
          CX.strokeStyle = `rgba(255,120,40,${pulse})`;
          CX.lineWidth = 2;
          CX.beginPath();
          CX.moveTo(px + (v % 24) + 8, fy + 4);
          CX.lineTo(px + (v % 24) + 14, fy + 12);
          CX.lineTo(px + (v % 24) + 10, fy + FH);
          CX.stroke();
        } else if (b === 'tomb') {
          CX.fillStyle = 'rgba(80,130,70,0.7)';
          for (let i = 0; i < 3; i++)
            if ((v >>> i) & 1) CX.fillRect(px + 6 + i * 14, fy + 3, 3, 4 + ((v >>> (i + 4)) % 12));
        }
      }
      /* 牆腳的影子落在地板上 */
      CX.fillStyle = 'rgba(0,0,0,0.35)';
      CX.fillRect(px, py + TS, TS, 6);
    }
}

/* 地板＋牆不會動：切成 8×8 格的區塊，第一次進畫面時畫成一張圖，之後每格只貼圖（每格重畫 400 多個方塊太貴）。
   shortcut: 岩漿牆的裂縫亮度固定在畫的那一刻，不再閃；要閃的話另外每格畫裂縫 */
const BCH = 8;
function bStatic(W, H) {
  if (!G.bc || G.bc.t !== G.tiles) G.bc = { t: G.tiles, m: new Map() };
  const S = BCH * TS,
    x0 = Math.max(0, Math.floor((G.cam.x - W / 2) / S)),
    x1 = Math.floor((G.cam.x + W / 2) / S),
    y0 = Math.max(0, Math.floor((G.cam.y - H / 2) / S)),
    y1 = Math.floor((G.cam.y + H / 2) / S);
  const get = (cx, cy) => {
    const k = cy * 1000 + cx;
    let c = G.bc.m.get(k);
    if (c) G.bc.m.delete(k);
    else c = bakeChunk(cx, cy, S);
    /* 用到的排到最後；最多留 48 塊（約 28 MB，畫面加外一圈夠用），最久沒用的丟掉 */
    G.bc.m.set(k, c);
    if (G.bc.m.size > 48) G.bc.m.delete(G.bc.m.keys().next().value);
    return c;
  };
  const inMap = (cx, cy) => cx >= 0 && cy >= 0 && cx * BCH < G.cols && cy * BCH < G.rows;
  for (let cy = y0; cy <= y1; cy++)
    for (let cx = x0; cx <= x1; cx++) if (inMap(cx, cy)) CX.drawImage(get(cx, cy), cx * S, cy * S);
  /* 每格先畫好畫面外一圈的一塊，走過去時不用當場畫（不然那一格會頓） */
  for (let cy = y0 - 1; cy <= y1 + 1; cy++)
    for (let cx = x0 - 1; cx <= x1 + 1; cx++) if (inMap(cx, cy) && !G.bc.m.has(cy * 1000 + cx)) return void get(cx, cy);
}
function bakeChunk(cx, cy, S) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const main = CX,
    cam = G.cam;
  CX = c.getContext('2d');
  CX.translate(-cx * S, -cy * S);
  CX.fillStyle = bFloor();
  CX.fillRect(cx * S, cy * S, S, S);
  /* bWalls 只畫鏡頭附近（多一格），把鏡頭放在這塊中間 */
  G.cam = { x: cx * S + S / 2, y: cy * S + S / 2 };
  try {
    bWalls(S, S);
  } finally {
    (CX = main), (G.cam = cam);
  }
  return c;
}

/* ---------- 擺設：每個房間上牆的燈、場景的主角（岩漿池、毒水窪、冰晶、香爐）、散落的小東西 ---------- */
const DECO_SET = {
  ice: { feat: 'crystal', small: ['icicle', 'crystal'] },
  lava: { feat: 'lava', small: ['rock', 'brazier'] },
  tomb: { feat: 'poison', small: ['grave', 'urn'] },
  temple: { feat: 'incense', small: ['slant', 'urn'] }
};
function decorate(rooms) {
  const out = [],
    S = DECO_SET[G.biome],
    T = G.tiles,
    C = G.cols;
  for (const r of rooms) {
    /* 上牆的燈：房間最上面一排、上面是牆的格子 */
    const top = [];
    for (let x = r.x0 + 1; x < r.x1; x++) {
      let y = r.y0;
      while (y < r.y1 && T[y * C + x]) y++;
      if (!T[y * C + x] && T[(y - 1) * C + x]) top.push([x, y]);
    }
    for (let i = Math.min(top.length, irnd(1, 2)); i > 0; i--) {
      const [x, y] = top.splice(irnd(0, top.length - 1), 1)[0];
      out.push({ k: 'torch', x: x * TS + TS / 2, y: y * TS - TS * 0.3, l: 190 });
    }
    if (Math.random() < 0.7) {
      const p = floorIn(r);
      if (p) out.push({ k: S.feat, x: p.x, y: p.y, s: rnd(0.8, 1.3), l: S.feat === 'incense' ? 120 : 150 });
    }
    for (let i = irnd(1, 3); i > 0; i--) {
      const p = floorIn(r);
      if (p) {
        const k = pick(S.small);
        out.push({ k, x: p.x, y: p.y, s: rnd(0.8, 1.2), l: k === 'brazier' ? 150 : k === 'slant' ? 110 : 0 });
      }
    }
  }
  return out;
}
function bDeco(W, H) {
  const b = G.biome,
    L = G.cam.x - W / 2 - 80,
    R = G.cam.x + W / 2 + 80,
    U = G.cam.y - H / 2 - 80,
    D = G.cam.y + H / 2 + 80;
  for (const d of G.deco || []) {
    if (d.x < L || d.x > R || d.y < U || d.y > D) continue;
    const { x, y } = d,
      s = d.s || 1,
      fk = 0.85 + 0.15 * Math.sin(G.t * 9 + x) * Math.sin(G.t * 5.3 + y);
    if (d.k === 'torch') {
      if (b === 'temple') {
        /* 紅燈籠 */
        CX.fillStyle = '#2a150e';
        CX.fillRect(x - 1, y - 18, 2, 6);
        CX.fillStyle = `rgba(214,52,34,${0.9})`;
        CX.beginPath();
        CX.ellipse(x, y - 4, 9, 10, 0, 0, TAU);
        CX.fill();
        CX.fillStyle = `rgba(255,200,110,${0.55 * fk})`;
        CX.beginPath();
        CX.ellipse(x, y - 4, 5, 7, 0, 0, TAU);
        CX.fill();
        CX.fillStyle = '#c9a227';
        CX.fillRect(x - 6, y - 14, 12, 2);
        CX.fillRect(x - 6, y + 5, 12, 2);
        CX.fillRect(x - 1, y + 7, 2, 6);
      } else {
        /* 壁上的火盆／冰晶燈／磷火燈 */
        const col = b === 'ice' ? '170,225,255' : b === 'tomb' ? '150,250,150' : '255,150,60';
        CX.fillStyle = '#151010';
        CX.fillRect(x - 6, y, 12, 4);
        CX.fillRect(x - 2, y + 4, 4, 6);
        CX.fillStyle = `rgba(${col},${0.85 * fk})`;
        CX.beginPath();
        CX.moveTo(x - 5, y);
        CX.quadraticCurveTo(x, y - 18 * fk, x + 5, y);
        CX.fill();
        CX.fillStyle = `rgba(255,255,230,${0.7 * fk})`;
        CX.fillRect(x - 1, y - 6, 2, 5);
      }
    } else if (d.k === 'lava' || d.k === 'poison') {
      const lava = d.k === 'lava',
        rx = 46 * s,
        ry = 22 * s,
        g = CX.createRadialGradient(x, y, 2, x, y, rx);
      g.addColorStop(0, lava ? `rgba(255,220,120,${fk})` : `rgba(170,255,120,${0.75 * fk})`);
      g.addColorStop(0.45, lava ? 'rgba(255,110,30,0.95)' : 'rgba(70,160,60,0.8)');
      g.addColorStop(1, lava ? 'rgba(90,20,10,0.9)' : 'rgba(20,50,25,0.85)');
      CX.fillStyle = lava ? '#140807' : '#0a140b';
      CX.beginPath();
      CX.ellipse(x, y, rx + 5, ry + 4, 0, 0, TAU);
      CX.fill();
      CX.fillStyle = g;
      CX.beginPath();
      CX.ellipse(x, y, rx, ry, 0, 0, TAU);
      CX.fill();
      /* 冒泡 */
      const t = (G.t * 0.7 + x * 0.01) % 1;
      CX.fillStyle = lava ? `rgba(255,240,180,${1 - t})` : `rgba(200,255,170,${1 - t})`;
      CX.beginPath();
      CX.arc(x + Math.sin(x) * rx * 0.4, y - t * 6, 2 + t * 3, 0, TAU);
      CX.fill();
    } else if (d.k === 'crystal') {
      /* 冰晶簇：幾根斜的菱柱 */
      for (let i = 0; i < 4; i++) {
        const a = -1.2 + i * 0.75,
          len = (22 + ((i * 7) % 11)) * s,
          bx = x + (i - 1.5) * 7 * s;
        CX.fillStyle = i % 2 ? 'rgba(150,210,245,0.9)' : 'rgba(200,240,255,0.95)';
        CX.beginPath();
        CX.moveTo(bx - 4 * s, y);
        CX.lineTo(bx + Math.sin(a) * len - 2, y - Math.cos(a) * len);
        CX.lineTo(bx + Math.sin(a) * len + 2, y - Math.cos(a) * len);
        CX.lineTo(bx + 4 * s, y);
        CX.fill();
      }
    } else if (d.k === 'icicle') {
      CX.fillStyle = 'rgba(220,240,255,0.18)';
      CX.beginPath();
      CX.ellipse(x, y, 22 * s, 8 * s, 0, 0, TAU);
      CX.fill();
      CX.fillStyle = 'rgba(180,225,250,0.8)';
      CX.fillRect(x - 8 * s, y - 6 * s, 5 * s, 6 * s);
      CX.fillRect(x + 2 * s, y - 9 * s, 6 * s, 9 * s);
    } else if (d.k === 'rock') {
      CX.fillStyle = '#1e1513';
      CX.beginPath();
      CX.ellipse(x, y, 14 * s, 9 * s, 0, 0, TAU);
      CX.fill();
      CX.fillStyle = `rgba(255,110,40,${0.6 * fk})`;
      CX.fillRect(x - 5 * s, y - 2, 10 * s, 2);
    } else if (d.k === 'brazier') {
      CX.fillStyle = '#231a17';
      CX.fillRect(x - 3, y - 14, 6, 14);
      CX.fillRect(x - 12, y - 20, 24, 7);
      CX.fillStyle = `rgba(255,140,50,${0.9 * fk})`;
      CX.beginPath();
      CX.moveTo(x - 10, y - 20);
      CX.quadraticCurveTo(x, y - 44 * fk, x + 10, y - 20);
      CX.fill();
    } else if (d.k === 'grave') {
      CX.fillStyle = '#2f3a32';
      CX.fillRect(x - 10 * s, y - 24 * s, 20 * s, 24 * s);
      CX.beginPath();
      CX.arc(x, y - 24 * s, 10 * s, Math.PI, 0);
      CX.fill();
      CX.fillStyle = 'rgba(0,0,0,0.4)';
      CX.fillRect(x - 1, y - 26 * s, 2, 18 * s);
      CX.fillStyle = 'rgba(80,130,70,0.6)';
      CX.fillRect(x - 10 * s, y - 4, 20 * s, 4);
    } else if (d.k === 'urn') {
      CX.fillStyle = b === 'temple' ? '#4a3020' : '#34302a';
      CX.beginPath();
      CX.ellipse(x, y - 9 * s, 8 * s, 10 * s, 0, 0, TAU);
      CX.fill();
      CX.fillRect(x - 5 * s, y - 22 * s, 10 * s, 4 * s);
      CX.fillStyle = 'rgba(255,255,255,0.08)';
      CX.fillRect(x - 5 * s, y - 14 * s, 3, 8 * s);
    } else if (d.k === 'slant') {
      /* 石燈籠 */
      CX.fillStyle = '#4a4540';
      CX.fillRect(x - 4, y - 18, 8, 18);
      CX.fillRect(x - 12, y - 24, 24, 6);
      CX.fillRect(x - 9, y - 38, 18, 14);
      CX.fillStyle = '#5a554f';
      CX.beginPath();
      CX.moveTo(x - 16, y - 38);
      CX.lineTo(x, y - 48);
      CX.lineTo(x + 16, y - 38);
      CX.fill();
      CX.fillStyle = `rgba(255,190,100,${0.85 * fk})`;
      CX.fillRect(x - 4, y - 35, 8, 8);
    } else if (d.k === 'incense') {
      /* 香爐：三腳銅爐＋三炷香＋煙 */
      CX.fillStyle = '#3b3e45';
      CX.beginPath();
      CX.ellipse(x, y - 10, 18 * s, 10 * s, 0, 0, TAU);
      CX.fill();
      CX.fillStyle = '#7c8290';
      CX.fillRect(x - 18 * s, y - 14, 36 * s, 3);
      CX.fillStyle = '#3a2d18';
      CX.fillRect(x - 12, y - 2, 3, 6);
      CX.fillRect(x + 9, y - 2, 3, 6);
      CX.fillStyle = '#8a2a1a';
      for (let i = -1; i <= 1; i++) CX.fillRect(x + i * 5, y - 30, 1.5, 16);
      CX.fillStyle = `rgba(255,160,80,${fk})`;
      for (let i = -1; i <= 1; i++) CX.fillRect(x + i * 5 - 0.5, y - 31, 2.5, 2);
      for (let i = 0; i < 3; i++) {
        const t = (G.t * 0.35 + i / 3) % 1;
        CX.fillStyle = `rgba(200,200,210,${0.22 * (1 - t)})`;
        CX.beginPath();
        CX.arc(x + Math.sin(G.t + i * 2) * 6 * t, y - 34 - t * 40, 3 + t * 8, 0, TAU);
        CX.fill();
      }
    }
  }
}

/* ---------- 光源：在暗層挖亮（dg 是暗層的 2d，座標是畫布像素）；再疊一層場景色的光 ---------- */
function lightsInView(ox, oy) {
  const k = DPR * ZOOM,
    out = [];
  for (const d of G.deco || []) {
    if (!d.l) continue;
    const x = (d.x + ox) * k,
      y = (d.y - 10 + oy) * k,
      r = d.l * k * (0.94 + 0.06 * Math.sin(G.t * 8 + d.x));
    if (x < -r || y < -r || x > CV.width + r || y > CV.height + r) continue;
    out.push([x, y, r]);
  }
  return out;
}
function bLights(dg, ox, oy) {
  for (const [x, y, r] of lightsInView(ox, oy)) {
    const g = dg.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    dg.fillStyle = g;
    dg.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
let GLOW = null;
function bGlow(ox, oy) {
  const c = BIO().light;
  CX.globalCompositeOperation = 'lighter';
  /* 光暈圖只在換場景顏色時畫一次，之後每格放大貼上（每格建漸層太貴） */
  if (!GLOW || GLOW.c !== c) {
    GLOW = Object.assign(document.createElement('canvas'), { width: 64, height: 64, c });
    const gg = GLOW.getContext('2d'),
      g = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${c},0.16)`);
    g.addColorStop(1, `rgba(${c},0)`);
    gg.fillStyle = g;
    gg.fillRect(0, 0, 64, 64);
  }
  CX.imageSmoothingEnabled = true;
  for (const [x, y, r] of lightsInView(ox, oy)) CX.drawImage(GLOW, x - r * 0.75, y - r * 0.75, r * 1.5, r * 1.5);
  CX.imageSmoothingEnabled = false;
  CX.globalCompositeOperation = 'source-over';
}
