/* dungeonPOE · 開場動畫：世界觀第 2 節的七個鏡頭，約 85 秒，隨時可跳過。
   canvas 動態分鏡：像素場景（分層視差＝鏡頭推移）＋程式特效＋Web Audio；字幕是 DOM。不用影片，不做逐格動畫。
   村莊、夜空、裂口、廢城先用程式畫剪影；INTRO_ART 填了圖檔路徑就換成圖（提示詞在 docs/開場提示詞.md）。
   十二神一律用發光剪影，墮落圖不能出現。 */
'use strict';
const INTRO_ART = { village: '', sky: '', rift: '', ruin: '' };
/* 字幕一字不改，跟 docs/世界觀.md 第 2 節對得上（tools/check.js 驗） */
const SHOTS = [
  {
    k: '太平',
    lead: 0.8,
    draw: shotPeace,
    lines: ['這片大陸由十二生肖神守護。', '千年來，城門不必上鎖，田裡年年有收成。', '孩子們都背得出十二位神的名字。']
  },
  {
    k: '前兆',
    lead: 0.6,
    draw: shotOmen,
    lines: ['那年秋天，井水開始發紅。', '鴉群在一夜之間飛離大陸。', '廟裡的香，再也點不著。', '沒有人放在心上。']
  },
  { k: '天裂', lead: 2.6, draw: shotCrack, lines: ['然後，天裂開了。'] },
  {
    k: '墜落',
    lead: 0.6,
    draw: shotFall,
    lines: ['十二位神，在同一夜墜落。', '牠們砸開大地，留下十二道深不見底的裂口。']
  },
  {
    k: '血雨',
    lead: 0.6,
    draw: shotRain,
    lines: [
      '血雨落了下來，各地的異象接連爆發。',
      '河水倒流，死者睜眼，裂口裡爬出了第一批妖魔。',
      '妖魔開始橫行，血雨與血霧再也分不清楚。',
      '等雨停的時候，大陸已經屍橫遍野，生靈塗炭。'
    ]
  },
  {
    k: '遠征',
    lead: 0.6,
    draw: shotMarch,
    lines: [
      '人們拋下家園，四處逃難。',
      '有能力的人站了出來，舉起刀劍，護著百姓與妖魔作戰。',
      '他們向神祈禱，沒有回應。',
      '最後，各路人馬湊齊一支遠征軍，舉著火把走進裂口，要把神找回來。',
      '他們再也沒有回來。'
    ]
  },
  { k: '你', lead: 1.8, draw: shotYou, lines: ['你在屍堆裡睜開眼睛。'] }
];
/* 時間軸：每句 1.5 秒＋每字 0.135 秒，句間留 0.35 秒 */
const IV_LEN = (() => {
  let t = 0;
  for (const s of SHOTS) {
    s.t0 = t;
    t += s.lead;
    s.ls = s.lines.map(x => {
      const o = { x, a: t, b: t + 1.5 + x.length * 0.135 };
      t = o.b + 0.35;
      return { ...o, a: o.a - s.t0, b: o.b - s.t0 };
    });
    s.d = t - s.t0;
  }
  return t;
})();
const IV = {
  on: false,
  gate: false,
  calm: false,
  speed: 1,
  t: 0,
  t0: 0,
  px: 2,
  W: 0,
  H: 0,
  hz: 0,
  sh: 0,
  fl: 0,
  line: null
};
/* 視差層要比畫面寬一點才能平移 */
const IV_M = 60;
const ivR = i => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
/* 減少動態：位移歸零、只留淡入淡出 */
const ivMv = t => (IV.calm ? 0 : t);
const ivRect = (x, y, w, h, c) => {
  CX.fillStyle = c;
  CX.fillRect(Math.round(x), Math.round(y), w, h);
};
function ivEll(x, y, rx, ry, c) {
  CX.fillStyle = c;
  for (let j = -Math.floor(ry); j <= ry; j++) {
    const w = Math.round(rx * Math.sqrt(1 - (j / (ry + 0.5)) ** 2));
    CX.fillRect(Math.round(x) - w, Math.round(y) + j, w * 2, 1);
  }
}
function ivLine(x0, y0, x1, y1, w, c) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) || 1;
  CX.fillStyle = c;
  for (let i = 0; i <= n; i++)
    CX.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), w, w);
}
/* 一團光：疊加的徑向漸層（只有光是平滑的，其他都是像素） */
function ivGlow(x, y, r, rgb, a) {
  if (a <= 0) return;
  const g = CX.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  CX.globalCompositeOperation = 'lighter';
  CX.fillStyle = g;
  CX.fillRect(x - r, y - r, r * 2, r * 2);
  CX.globalCompositeOperation = 'source-over';
}
const ivCover = (c, a) => a > 0 && ivRect(-IV_M, -IV_M, IV.W + IV_M * 2, IV.H + IV_M * 2, c.replace('A', a));
/* 這句字幕的顯示窗：進出各 f 秒 */
const ivWin = (s, i, t, f = 0.6) => clamp(Math.min((t - s.ls[i].a + f / 2) / f, (s.ls[i].b - t + f) / f), 0, 1);

/* ---------- 背景：一張圖＝幾層視差（f 越大移動越多）；有圖檔就用圖 ---------- */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/* 天空：有限色帶＋Bayer 抖色（跟藏身處同一種畫法） */
function ivSky(g, w, h, hb, cols) {
  const im = g.createImageData(w, h),
    c = cols.map(hex2rgb),
    n = c.length - 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = Math.min(n, (y / hb) * n),
        i = Math.floor(v),
        k = c[v - i > BAYER[(x & 3) + (y & 3) * 4] / 16 ? Math.min(n, i + 1) : i],
        o = (y * w + x) * 4;
      im.data[o] = k[0];
      im.data[o + 1] = k[1];
      im.data[o + 2] = k[2];
      im.data[o + 3] = 255;
    }
  g.putImageData(im, 0, 0);
}
function ivRidge(w, h, y0, amp, seed, c) {
  CX.fillStyle = c;
  for (let x = 0; x < w; x++) {
    const y =
      y0 +
      amp *
        (Math.sin(x * 0.021 + seed) * 0.6 + Math.sin(x * 0.057 + seed * 2) * 0.3 + Math.sin(x * 0.13 + seed * 3) * 0.1);
    CX.fillRect(x, Math.round(y), 1, h);
  }
}
function ivStars(w, h, n, a) {
  for (let i = 0; i < n; i++)
    ivRect(ivR(i) * w, ivR(i + 500) * h, 1, 1, `rgba(220,225,255,${a * (0.35 + ivR(i + 900) * 0.65)})`);
}
/* 村屋：牆＋階梯屋頂＋亮窗 */
function ivHouse(x, y, w, h, c, lit) {
  ivRect(x, y - h, w, h, c);
  for (let i = 0; i < w / 2 + 1; i++) ivRect(x - 1 + i, y - h - i, w + 2 - i * 2, 1, c);
  if (lit) ivRect(x + Math.round(w / 2) - 1, y - h + 2, 2, 2, lit);
}
function ivTemple(x, y, s, c, lit) {
  ivRect(x - 9 * s, y - 2 * s, 18 * s, 2 * s, c);
  ivRect(x - 6 * s, y - 9 * s, 12 * s, 7 * s, c);
  for (let k = 0; k < 2; k++) {
    const y2 = y - 9 * s - k * 5 * s,
      w = (11 - k * 3) * s;
    for (let i = 0; i < 3 * s; i++) ivRect(x - w + i * 2, y2 - i, (w - i * 2) * 2, 1, c);
    if (k) ivRect(x - 4 * s, y2, 8 * s, 3 * s, c);
  }
  if (lit) ivRect(x - s, y - 7 * s, 2 * s, 5 * s, lit);
}
function ivBroken(x, y, w, h, c, seed) {
  for (let i = 0; i < w; i++) ivRect(x + i, y - h * (0.55 + ivR(seed + i) * 0.45), 1, h, c);
}
const IV_PAINT = {
  village(w, h, hz) {
    return [
      [
        0.1,
        g => {
          ivSky(g, w, h, hz + 4, ['#4a3058', '#8c4258', '#cf6c42', '#efa54f', '#f8d885']);
          ivEll(w * 0.68, hz - 30, 12, 12, '#fff0c4');
          ivGlow(w * 0.68, hz - 30, 54, '255,226,150', 0.4);
        }
      ],
      [0.35, () => ivRidge(w, h, hz - 22, 10, 1.2, '#a4655a')],
      [0.6, () => ivRidge(w, h, hz - 8, 5, 4.1, '#6a4048')],
      [
        1,
        () => {
          const c = '#2d1a26',
            lit = '#ffcf7a';
          ivRidge(w, h, hz + 14, 2, 2.3, c);
          for (let i = 0; i < 18; i++) {
            const x = (i + 0.5) * (w / 18) + (ivR(i) - 0.5) * 8;
            if (Math.abs(x - w / 2) > 22)
              ivHouse(x, hz + 15, 7 + ivR(i + 30) * 5, 4 + ivR(i + 60) * 4, c, ivR(i + 90) > 0.25 && lit);
          }
          ivTemple(w / 2, hz + 15, 1.5, c, lit);
          ivField(w, h, hz + 15);
        }
      ]
    ];
  },
  sky(w, h, hz) {
    return [
      [
        0.1,
        g => {
          ivSky(g, w, h, hz + 6, ['#04050d', '#080b1c', '#10142e', '#1d2146', '#2a2c58']);
          ivStars(w, hz, 150, 1);
        }
      ],
      [0.4, () => ivRidge(w, h, hz + 6, 14, 2.6, '#0c0d1e')],
      [
        1,
        () => {
          ivRidge(w, h, hz + 28, 6, 5.2, '#06070f');
          for (let i = 0; i < 12; i++) ivHouse(ivR(i + 200) * w, hz + 30, 6, 4, '#06070f');
        }
      ]
    ];
  },
  rift(w, h, hz) {
    return [
      [
        0.1,
        g => {
          ivSky(g, w, h, hz + 6, ['#10040b', '#260812', '#4f0f19', '#8d1a1d', '#cc3b22', '#e4592a']);
          ivStars(w, hz * 0.5, 40, 0.5);
        }
      ],
      [0.4, () => ivRidge(w, h, hz - 4, 14, 3.4, '#3a0d14')],
      [
        1,
        () => {
          ivRidge(w, h, hz + 10, 4, 0.7, '#16070b');
          for (let i = 0; i < 70; i++)
            ivRect(ivR(i + 300) * w, hz + 14 + ivR(i + 400) * (h - hz), 2 + ivR(i) * 4, 1, '#240b10');
        }
      ]
    ];
  },
  ruin(w, h, hz) {
    return [
      [
        0.1,
        g => {
          ivSky(g, w, h, hz + 14, ['#1c0a12', '#3c1016', '#6e1c1c', '#a8361f', '#e07a34', '#f0a050']);
        }
      ],
      [
        0.4,
        () => {
          const c = '#3a1620';
          ivRidge(w, h, hz + 6, 4, 1.9, c);
          for (let i = 0; i < 14; i++) {
            const x = (i + ivR(i)) * (w / 14);
            ivBroken(x, hz + 10, 6 + ivR(i + 20) * 8, 12 + ivR(i + 40) * 30, c, i * 9);
          }
        }
      ],
      [
        1,
        () => {
          ivRidge(w, h, hz + 18, 3, 3.3, '#1e0c10');
          /* 屍堆與插在地上的刀槍：照 y 排，近的蓋住遠的 */
          const L = Array.from({ length: 34 }, (_, i) => [
            ivR(i + 700) * w,
            hz + 22 + ivR(i + 800) ** 1.4 * (h - hz - 22),
            i
          ]).sort((a, b) => a[1] - b[1]);
          for (const [x, y, i] of L) {
            const z = 0.7 + ((y - hz) / (h - hz)) * 1.5,
              rx = (4 + ivR(i) * 7) * z,
              ry = (1.5 + ivR(i + 1) * 2) * z;
            ivEll(x, y, rx, ry, '#2e1216');
            ivRect(x - rx * 0.6, y - ry, rx * 1.2, 1, '#7a3226');
            for (let k = 0; k < 3; k++) ivRect(x + (ivR(i + k + 9) - 0.5) * rx, y - ry - 1, 2 * z, 1 + z, '#46191c');
            if (i % 3 === 0) ivLine(x, y, x + (2 - ivR(i + 2) * 4) * z, y - (8 + ivR(i + 3) * 8) * z, 1, '#8a4a34');
            if (i % 7 === 0) ivRect(x + 1, y - 13 * z, 5 * z, 3 * z, '#5a1a1c');
          }
        }
      ]
    ];
  }
};
/* 村莊前景的田：越近的麥畦越寬，再放幾個麥垛 */
function ivField(w, h, y0) {
  ivRect(0, y0, w, h, '#7a5524');
  for (let y = y0 + 1, k = 1; y < h; k++) {
    const st = 1 + k * 0.5,
      c = k % 2 ? '#b08a34' : '#94702a';
    for (let x = -((k * 13) % 9); x < w; x += 2 + k * 0.7)
      ivRect(x + ivR(x + k * 31) * 3, y - ivR(x * 3 + k) * k * 0.4, 1 + k * 0.16, Math.ceil(st * 0.8), c);
    y += st;
  }
  for (let i = 0; i < 9; i++) {
    const y = y0 + 6 + ivR(i + 11) * (h - y0 - 30),
      z = 0.7 + ((y - y0) / (h - y0)) * 1.6,
      x = ivR(i + 77) * w;
    ivEll(x, y + 1, 7 * z, 2 * z, '#4a3218');
    ivEll(x, y - 3 * z, 5 * z, 4 * z, '#d4a84a');
    ivRect(x - 4 * z, y - 2 * z, 8 * z, 1, '#a07c30');
  }
}
const IV_BAKE = {};
function ivBake(k) {
  const key = k + IV.W + 'x' + IV.H;
  if (IV_BAKE[key]) return IV_BAKE[key];
  const w = IV.W + IV_M,
    h = IV.H + IV_M,
    main = CX;
  try {
    return (IV_BAKE[key] = IV_PAINT[k](w, h, IV.hz + IV_M / 2).map(([f, paint]) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      CX = c.getContext('2d');
      paint(CX);
      return { f, c };
    }));
  } finally {
    CX = main;
  }
}
const IV_IMG = {};
function ivImg(k) {
  if (!IV_IMG[k]) (IV_IMG[k] = new Image()).src = INTRO_ART[k];
  return IV_IMG[k];
}
function ivBg(k, ox, oy) {
  if (INTRO_ART[k] && ivImg(k).naturalWidth) {
    const im = ivImg(k),
      z = Math.max((IV.W + IV_M) / im.naturalWidth, (IV.H + IV_M) / im.naturalHeight),
      w = im.naturalWidth * z,
      h = im.naturalHeight * z;
    return CX.drawImage(im, (IV.W - w) / 2 - ox * 0.5, (IV.H - h) / 2 - oy * 0.5, w, h);
  }
  for (const l of ivBake(k)) CX.drawImage(l.c, -IV_M / 2 - ox * l.f, -IV_M / 2 - oy * l.f);
}

/* ---------- 十二神的發光剪影：頭是 7×6 的小圖，身體是同一件長袍。只有輪廓，不是墮落圖 ---------- */
const GOD_HEAD = [
  '##...##/##...##/.#####./.#####./..###../...#...', // 鼠
  '#.....#/##...##/.#####./.#####./..###../..###..', // 牛
  '.#...#./.#####./#######/#######/.#####./..###..', // 虎
  '.##.##./.##.##./.##.##./.#####./.#####./..###..', // 兔
  '#.#.#.#/.#####./..###../.#####./#######/..#.#..', // 龍
  '..###../.#####./#######/#######/.#####./..###..', // 蛇
  '..#.#../..###../.####../.####../...##../...##..', // 馬
  '##...##/#.###.#/..###../..###../...#.../...#...', // 羊
  '..###../#.###.#/#######/#.###.#/..###../..###..', // 猴
  '.#.#.#./.#####./..###../..####./..###../...#...', // 雞
  '##...##/#######/#.###.#/#.###.#/..###../..###..', // 狗
  '#.....#/.#####./#######/#.###.#/#######/.#####.' // 豬
].map(s => s.split('/'));
function ivGodBody(i, x, y, s, c) {
  CX.fillStyle = c;
  const H = GOD_HEAD[i];
  for (let r = 0; r < 6; r++)
    for (let q = 0; q < 7; q++) if (H[r][q] === '#') CX.fillRect(x + (q - 3.5) * s, y + (r - 17) * s, s, s);
  for (let r = 0; r < 9; r++) {
    const w = 2 + Math.floor(r / 3);
    CX.fillRect(x - w * s, y + (r - 11) * s, w * 2 * s, s);
  }
  CX.fillRect(x - 5 * s, y - 2 * s, 10 * s, 2 * s);
}
function ivGod(i, x, y, s, a) {
  ivGodBody(i, x, y, s, '#2c1a28');
  if (a <= 0) return;
  ivGlow(x, y - 10 * s, 15 * s, '255,214,130', 0.34 * a);
  CX.globalAlpha = a;
  ivGodBody(i, x, y, s, '#ffe9b8');
  CX.globalAlpha = 1;
}
/* 橫向一排 12 尊；直立兩排各 6 尊 */
function ivGodPos() {
  const { W, hz } = IV,
    wide = W > IV.H,
    n = wide ? 12 : 6;
  return Array.from({ length: 12 }, (_, i) => {
    const row = Math.floor(i / n),
      c = i % n;
    return { x: Math.round(((c + 0.5) * W) / n), y: Math.round(hz - 6 - (wide ? 0 : (1 - row) * 40)) };
  });
}

/* ---------- 小人與妖魔的剪影 ---------- */
function ivMan(x, y, c, ph, pose, s = 1) {
  x = Math.round(x);
  y = Math.round(y);
  const r = (a, b, w, h) => CX.fillRect(x + a * s, y + b * s, w * s, h * s);
  CX.fillStyle = c;
  r(-1, -8, 2, 2);
  if (pose === 'kneel') return r(-1, -6, 3, 3), r(-2, -3, 5, 3);
  r(-1, -6, 3, 4);
  const k = Math.sin(ph) > 0 ? 1 : 0;
  r(-1 - k, -2, 1, 2);
  r(1 + k, -2, 1, 2);
  if (pose === 'sword') r(2, -11 + k * 2, 1, 7);
  if (pose === 'pack') r(1, -7, 3, 4);
}
function ivBeast(x, y, s, c, t) {
  x = Math.round(x);
  y = Math.round(y);
  ivEll(x, y - 6 * s, 7 * s, 5 * s, c);
  for (let i = -2; i <= 2; i++) ivRect(x + i * 3 * s, y - (12 + (i & 1) * 3) * s, s, 4 * s, c);
  ivRect(x - 6 * s, y - 2 * s, 2 * s, 2 * s, c);
  ivRect(x + 4 * s, y - 2 * s, 2 * s, 2 * s, c);
  if (Math.sin(t * 2 + x) > -0.8)
    ivRect(x - 3 * s, y - 7 * s, s, s, '#ff4030'), ivRect(x + 2 * s, y - 7 * s, s, s, '#ff4030');
}
/* 血紅裂縫：一條折線，直立時比較直 */
function ivCrackPts() {
  const { W, H, hz } = IV,
    wide = W > H,
    a = wide ? [W * 0.88, -4] : [W * 0.74, -4],
    b = wide ? [W * 0.14, hz * 0.72] : [W * 0.3, hz * 0.8],
    n = 16;
  return Array.from({ length: n + 1 }, (_, i) => [
    a[0] + ((b[0] - a[0]) * i) / n + (i % n ? (ivR(i) - 0.5) * 22 : 0),
    a[1] + ((b[1] - a[1]) * i) / n + (i % n ? (ivR(i + 40) - 0.5) * 12 : 0)
  ]);
}
function ivCrack(k, a) {
  const P2 = ivCrackPts(),
    n = (P2.length - 1) * k;
  CX.globalAlpha = a;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = P2[i],
      f = Math.min(1, n - i),
      x1 = x0 + (P2[i + 1][0] - x0) * f,
      y1 = y0 + (P2[i + 1][1] - y0) * f;
    ivLine(x0, y0, x1, y1, 4, '#8d1a1d');
    ivLine(x0 + 1, y0, x1 + 1, y1, 2, '#ff5a3a');
    ivLine(x0 + 1, y0, x1 + 1, y1, 1, '#ffe9d2');
    ivGlow(x0, y0, 34, '255,50,30', 0.16);
  }
  CX.globalAlpha = 1;
}
/* 十二道裂口落在地上的位置 */
const ivPit = i => ({
  x: IV.W * (0.08 + (0.84 * ((i * 7) % 12)) / 11),
  y: IV.hz + 18 + (IV.H - IV.hz - 30) * (0.1 + 0.8 * ivR(i + 70))
});
function ivPitDraw(p, s) {
  const w = Math.round(16 * s);
  for (let j = -w; j <= w; j++) {
    const e = 1 - (j / w) ** 2,
      d = Math.ceil(e * 4 * s * (0.5 + ivR(j + w + p.x) * 0.7));
    ivRect(p.x + j, p.y - d, 1, d * 2, '#060203');
    if (e > 0.35) ivRect(p.x + j, p.y - Math.floor(d * 0.3), 1, Math.ceil(d * 0.6), j % 3 ? '#a81e1e' : '#e0502c');
  }
  ivGlow(p.x, p.y, 20 * s, '230,50,30', 0.22);
}
const ivCross = (s, a) => IV.t0 - s.t0 < a && IV.t - s.t0 >= a;

/* ---------- 七個鏡頭：s 鏡頭、t 這個鏡頭的秒數 ---------- */
function shotPeace(s, t) {
  const { W, H, hz } = IV;
  ivBg('village', ivMv(t) * 1.6 - 14, 0);
  ivGodPos().forEach((g, i) => {
    const on = 1.2 + (i * (s.d - 3.4)) / 12;
    if (ivCross(s, on)) ivSnd.chime(i);
    ivGod(i, g.x, g.y, 2, clamp((t - on) / 0.8, 0, 1));
  });
  /* 飄起來的光點、前景的麥浪 */
  for (let i = 0; i < 26; i++) {
    const y = (ivR(i) * H - ivMv(t) * (4 + ivR(i + 9) * 6) + H * 9) % H;
    ivRect(ivR(i + 50) * W + Math.sin(t + i) * 4, y, 1, 1, 'rgba(255,230,160,0.7)');
  }
  for (let x = 0; x < W; x += 3) {
    const y = H - 10 - ivR(x) * 12;
    ivRect(x + Math.sin(ivMv(t) * 1.6 + x * 0.09) * 1.6, y, 1, 18, x % 2 ? '#c49a3c' : '#94702a');
  }
}
function shotOmen(s, t) {
  const { W, H, hz } = IV,
    k = t / s.d,
    m = Math.min(W, H);
  ivBg('village', 12 + ivMv(t) * 0.9, 0);
  ivGodPos().forEach((g, i) => ivGod(i, g.x, g.y, 2, clamp(1 - k * 2.2, 0, 1)));
  ivCover('rgba(14,4,12,A)', 0.25 + 0.6 * k);
  /* 水井發紅 */
  let a = ivWin(s, 0, t);
  if (a) {
    ivCover('rgba(8,3,8,A)', 0.85 * a);
    CX.globalAlpha = a;
    const x = W / 2,
      y = H * 0.52,
      r = m * 0.3,
      red = clamp((t - s.ls[0].a) / (s.ls[0].b - s.ls[0].a), 0, 1);
    ivEll(x, y + r * 0.42, r * 1.14, r * 0.5, '#2e2a30');
    ivRect(x - r * 1.14, y, r * 2.28, r * 0.42, '#2e2a30');
    ivEll(x, y, r * 1.14, r * 0.5, '#57525c');
    ivEll(x, y, r * 0.96, r * 0.4, `rgb(${30 + 130 * red},${52 - 34 * red},${80 - 56 * red})`);
    for (let i = 0; i < 5; i++) {
      const q = (ivMv(t) * 0.3 + i / 5) % 1;
      ivEll(
        x,
        y,
        r * 0.2 + q * r * 0.7,
        1 + (r * 0.3 - 1) * q,
        `rgba(${120 + 130 * red},${140 - 110 * red},${170 - 130 * red},${0.05 * (1 - q)})`
      );
    }
    CX.globalAlpha = 1;
    ivGlow(x, y, r * 1.1, '200,30,30', 0.3 * red * a);
  }
  /* 鴉群飛離 */
  a = ivWin(s, 1, t);
  if (a) {
    CX.globalAlpha = a;
    const T = ivMv(t - s.ls[1].a);
    for (let i = 0; i < 42; i++) {
      const x = W * (0.25 + ivR(i) * 0.75) - T * (34 + ivR(i + 7) * 40),
        y = hz * (0.2 + ivR(i + 13) * 0.75) - T * (6 + ivR(i + 19) * 10),
        f = Math.sin(t * 9 + i) > 0 ? 1 : 0;
      ivRect(x - 3, y - f, 3, 1, '#0b0810');
      ivRect(x, y + f - 1, 3, 1, '#0b0810');
      ivRect(x - 1, y, 2, 1, '#0b0810');
    }
    CX.globalAlpha = 1;
    if (ivCross(s, s.ls[1].a + 0.2) || ivCross(s, s.ls[1].a + 0.9) || ivCross(s, s.ls[1].a + 1.5)) ivSnd.caw();
  }
  /* 香熄了 */
  a = ivWin(s, 2, t);
  if (a) {
    ivCover('rgba(8,3,8,A)', 0.9 * a);
    CX.globalAlpha = a;
    const x = W / 2,
      y = H * 0.62,
      r = m * 0.16,
      off = t - s.ls[2].a > (s.ls[2].b - s.ls[2].a) * 0.5;
    ivEll(x, y, r, r * 0.6, '#3a2c28');
    ivRect(x - r * 1.1, y - r * 0.4, r * 2.2, r * 0.2, '#6a5244');
    ivRect(x - r * 0.75, y + r * 0.4, r * 0.28, r * 0.4, '#2a201e');
    ivRect(x + r * 0.47, y + r * 0.4, r * 0.28, r * 0.4, '#2a201e');
    [-0.4, 0, 0.4].forEach((d, i) => {
      const sx = x + d * r,
        top = y - r * (1.5 - i * 0.1);
      ivRect(sx, top, 1, r * 1.1, '#6e4a2a');
      if (off) return;
      ivRect(sx - 1, top - 2, 3, 3, '#ff7a30');
      ivGlow(sx, top, 10, '255,120,50', 0.5);
      for (let j = 0; j < 14; j++) {
        const q = (ivMv(t) * 0.25 + j / 14) % 1;
        ivRect(sx + Math.sin(q * 7 + i) * q * 10, top - q * H * 0.3, 1, 2, `rgba(190,190,200,${0.35 * (1 - q)})`);
      }
    });
    if (ivCross(s, s.ls[2].a + (s.ls[2].b - s.ls[2].a) * 0.5)) ivSnd.out();
    CX.globalAlpha = 1;
  }
}
function shotCrack(s, t) {
  const L = s.lead,
    k = clamp((t - L) / 0.35, 0, 1);
  ivBg('sky', 0, 0);
  if (ivCross(s, L)) {
    IV.fl = IV.calm ? 0.35 : 1;
    IV.sh = IV.calm ? 0 : 7;
    ivSnd.crack();
  }
  if (t < L) return ivCover('rgba(0,0,0,A)', 0.4 * (t / L));
  ivCover('rgba(150,16,20,A)', 0.2 + 0.1 * Math.sin(t * 3));
  ivCrack(k, 1);
}
function shotFall(s, t) {
  const { H } = IV;
  ivBg('rift', ivMv(t) * 0.8, 0);
  ivCrack(1, 1);
  for (let i = 0; i < 12; i++) {
    const on = 0.5 + (i * (s.d - 2.2)) / 12,
      fall = IV.calm ? 0.01 : 0.45,
      f = (t - on) / fall,
      p = ivPit(i);
    if (f >= 1) ivPitDraw(p, 0.7 + (p.y / H) * 0.7);
    if (f < 0 || f > 2.6) continue;
    const c = ivCrackPts()[2 + ((i * 12) % 13)];
    if (f < 1) {
      const x = c[0] + (p.x - c[0]) * f,
        y = c[1] + (p.y - c[1]) * f;
      ivLine(
        x,
        y,
        c[0] + (p.x - c[0]) * Math.max(0, f - 0.35),
        c[1] + (p.y - c[1]) * Math.max(0, f - 0.35),
        2,
        '#ffe9b8'
      );
      ivGlow(x, y, 26, '255,214,130', 0.8);
    } else {
      ivGlow(p.x, p.y, 60, '255,180,110', 0.9 * (1 - (f - 1) / 1.6));
    }
    if (ivCross(s, on + fall)) {
      ivSnd.boom(i);
      IV.sh = IV.calm ? 0 : 3.5;
      IV.fl = Math.max(IV.fl, IV.calm ? 0.08 : 0.22);
    }
  }
}
function shotRain(s, t) {
  const { W, H, hz } = IV,
    end = clamp((t - s.ls[3].a) / 2.4, 0, 1),
    rain = 1 - end,
    fog = clamp(t / s.ls[2].b, 0, 1);
  if (ivCross(s, 0.1)) ivSnd.bed('rain', 0.22);
  if (ivCross(s, s.ls[3].a)) ivSnd.bedOff('rain');
  ivBg('rift', ivMv(t) * 0.5 + 8, 0);
  ivCrack(1, 1);
  for (let i = 0; i < 12; i++) ivPitDraw(ivPit(i), 0.7 + (ivPit(i).y / H) * 0.7);
  /* 河水倒流：河面的光往上游跑 */
  let a = ivWin(s, 1, t, 1);
  if (a) {
    CX.globalAlpha = a;
    for (let y = hz + 12; y < H; y += 2) {
      const q = (y - hz) / (H - hz),
        w = 4 + q * W * 0.16;
      ivRect(W * 0.5 - w + Math.sin(q * 5) * 14, y, w * 2, 2, '#350d14');
    }
    for (let i = 0; i < 26; i++) {
      const q = (ivR(i) + 2 - ivMv(t) * 0.25) % 1,
        w = 4 + q * W * 0.16;
      ivRect(W * 0.5 + (ivR(i + 5) - 0.5) * 2 * w + Math.sin(q * 5) * 14, hz + 12 + q * (H - hz - 12), 1, 5, '#a04038');
    }
    CX.globalAlpha = 1;
  }
  /* 死者睜眼、第一批妖魔 */
  a = Math.max(ivWin(s, 1, t, 1), ivWin(s, 2, t, 1));
  if (a) {
    CX.globalAlpha = a;
    const T = t - s.ls[1].a;
    for (let i = 0; i < 16; i++) {
      const x = ivR(i + 120) * W,
        y = hz + 16 + ivR(i + 140) * (H - hz - 20),
        o = clamp(T - i * 0.3, 0, 1);
      if (o) ivRect(x, y, 1, 1, '#ff4030'), ivRect(x + 3, y, 1, 1, '#ff4030');
    }
    for (let i = 0; i < 12; i += 2) {
      const p = ivPit(i),
        up = clamp((T - 1.2 - i * 0.25) / 1.6, 0, 1);
      if (up)
        ivBeast(
          p.x + Math.sin(i) * 8 + ivMv(T) * (i % 4 ? 2 : -2),
          p.y + 12 * (1 - up),
          1 + (p.y / H) * 0.8,
          '#0c0406',
          t + i
        );
    }
    CX.globalAlpha = 1;
  }
  /* 霧：一片紅，雨與霧分不清 */
  ivCover('rgba(150,20,26,A)', 0.42 * fog * rain);
  for (let i = 0; i < 6; i++)
    ivGlow(
      ((ivR(i + 60) * W + ivMv(t) * (i % 2 ? 5 : -5)) % W) + 0,
      hz + ivR(i + 66) * (H - hz),
      W * 0.4,
      '200,40,40',
      0.2 * fog * rain
    );
  CX.globalAlpha = rain;
  for (let i = 0; i < (IV.calm ? 40 : 130); i++) {
    const v = 190 + ivR(i + 30) * 150,
      x = (ivR(i) * W * 1.2 - ivMv(t) * v * 0.08 + W * 40) % (W * 1.2),
      y = (ivR(i + 200) * H + ivMv(t) * v) % H;
    ivRect(x, y, 1, 5 + ivR(i) * 4, 'rgba(214,52,52,0.6)');
  }
  CX.globalAlpha = 1;
  /* 雨停，鏡頭拉遠 */
  if (end) {
    CX.globalAlpha = end;
    ivBg('ruin', 0, ivMv(1 - end) * 26);
    CX.globalAlpha = 1;
  }
}
function shotMarch(s, t) {
  const { W, H, hz } = IV,
    wide = W > H,
    gy = hz + 26;
  ivBg('ruin', ivMv(t) * 0.5 - 4, 0);
  /* 逃難：人潮往畫面外走 */
  let a = ivWin(s, 0, t);
  if (a) {
    CX.globalAlpha = a;
    for (let i = 0; i < 34; i++) {
      const sp = 9 + ivR(i) * 7,
        x = W + 14 - ((ivR(i + 11) * W * 1.3 + ivMv(t) * sp) % (W * 1.3)),
        y = gy - 8 + ivR(i + 23) * 22;
      ivMan(x, y, '#0a0405', ivMv(t) * 8 + i, i % 3 ? '' : 'pack', 2);
    }
    CX.globalAlpha = 1;
  }
  /* 舉著刀劍擋在妖魔前面 */
  a = ivWin(s, 1, t);
  if (a) {
    CX.globalAlpha = a;
    const T = ivMv(t - s.ls[1].a),
      n = wide ? 7 : 4,
      gap = (W * 0.4) / n;
    for (let i = 0; i < n; i++)
      ivMan(W * 0.42 - i * gap + Math.sin(T * 3 + i) * 1.5, gy + (i % 2) * 10, '#0a0405', T * 7 + i, 'sword', 2);
    for (let i = 0; i < 5; i++)
      ivBeast(W * (0.6 + i * 0.09) + Math.sin(T * 2.4 + i) * 2, gy + (i % 2) * 12, wide ? 2 : 1.5, '#0e0406', t + i);
    for (let i = 0; i < 8; i++) {
      const q = (T * 2.2 + i / 8) % 1;
      ivRect(W * 0.51 + (ivR(i) - 0.5) * 34 * q, gy - 8 - q * 18 + i * 2, 2, 2, `rgba(255,214,140,${1 - q})`);
    }
    if (ivCross(s, s.ls[1].a + 0.6) || ivCross(s, s.ls[1].a + 2) || ivCross(s, s.ls[1].a + 3.4)) ivSnd.clash();
    CX.globalAlpha = 1;
  }
  /* 跪著祈禱，天上什麼都沒有 */
  a = ivWin(s, 2, t);
  if (a) {
    ivCover('rgba(10,3,8,A)', 0.5 * a);
    CX.globalAlpha = a;
    const n = wide ? 11 : 6;
    for (let i = 0; i < n; i++)
      ivMan(W * (0.5 + (i - (n - 1) / 2) * (0.88 / n)), gy + (i % 2) * 12, '#070304', 0, 'kneel', 2);
    CX.globalAlpha = 1;
  }
  /* 火把長隊走進裂口；最後一句火光一點點消失 */
  const tq = s.ls[3],
    tl = s.ls[4];
  a = clamp((t - tq.a + 0.3) / 0.6, 0, 1);
  if (a) {
    ivCover('rgba(6,2,6,A)', 0.72 * a);
    CX.globalAlpha = a;
    const mx = wide ? W * 0.84 : W * 0.5,
      my = wide ? hz + 16 : hz + 2,
      gone = clamp((t - tl.a) / (tl.b - tl.a - 0.3), 0, 1),
      N = 32;
    ivEll(mx, my, 20, 6, '#050203');
    ivEll(mx, my, 15, 3, '#8d1a1d');
    ivGlow(mx, my, 34, '230,50,30', 0.4);
    for (let i = 0; i < N; i++) {
      const q = (i + ivMv(t - tq.a) * 1.2) / N,
        u = q % 1,
        px = wide ? W * 0.02 + (mx - W * 0.02) * u : W * 0.5 + Math.sin(u * 6) * W * 0.3 * (1 - u),
        py = wide ? H * 0.9 + (my - H * 0.9) * u + Math.sin(u * 9) * 5 : H * 0.92 + (my - H * 0.92) * u,
        v = clamp(1 - gone * 1.15 + (i / N) * 0.15 - (u > 0.97 ? 1 : 0), 0, 1);
      if (!v) continue;
      CX.globalAlpha = a * v;
      ivMan(px, py, '#1a0a0e', ivMv(t) * 7 + i, '');
      ivRect(px + 2, py - 10, 1, 2, '#ffd27a');
      ivGlow(px + 2, py - 10, 6, '255,160,60', 0.34);
    }
    CX.globalAlpha = 1;
  }
}
/* 全黑，只有心跳；紅色從四周一下一下滲進來 */
function shotYou(s, t) {
  const { W, H } = IV;
  ivCover('rgba(0,0,0,A)', 1);
  const beat = ((t + 0.1) % 1.5) / 1.5;
  for (const b of [0.2, 0.34]) if (ivCross(s, Math.floor((t + 0.1) / 1.5) * 1.5 + b * 1.5)) ivSnd.beat();
  const g = CX.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7),
    v = Math.max(0, 0.16 - Math.abs(beat - 0.27) * 0.5);
  g.addColorStop(0, 'rgba(120,10,14,0)');
  g.addColorStop(1, `rgba(120,10,14,${v})`);
  CX.fillStyle = g;
  CX.fillRect(0, 0, W, H);
}

/* ---------- 聲音：全部合成（audio.js 的 tone、nz） ---------- */
const IV_BEDS = {};
const ivSafe = f =>
  function (...a) {
    try {
      f(...a);
    } catch (e) {}
  };
const ivSnd = {
  chime: ivSafe(i => {
    const f = [392, 440, 523, 587, 659, 784][(i * 5) % 6];
    tone(f, f, 1.8, 0.05, 'sine');
    tone(f * 2, f * 2, 0.9, 0.018, 'triangle');
  }),
  caw: ivSafe(() => (nz(0.16, 1500, 600, 0.05), tone(520, 340, 0.14, 0.025, 'sawtooth'))),
  out: ivSafe(() => nz(0.5, 900, 200, 0.04)),
  crack: ivSafe(() => (nz(1.8, 3200, 60, 0.6, 'lowpass'), tone(64, 26, 2.2, 0.55, 'sawtooth'))),
  boom: ivSafe(i => (tone(84 - i * 2, 28, 1.1, 0.42), nz(0.8, 800, 60, 0.32, 'lowpass'))),
  clash: ivSafe(() => (nz(0.1, 4200, 1800, 0.08, 'highpass'), tone(1200, 800, 0.12, 0.03, 'square'))),
  beat: ivSafe(() => tone(66, 38, 0.2, 0.7)),
  /* 持續的底：風、雨 */
  bed: ivSafe((k, vol) => {
    if (IV_BEDS[k]) return;
    const a = ac(),
      s = a.createBufferSource(),
      f = a.createBiquadFilter(),
      g = a.createGain();
    s.buffer = noise();
    s.loop = true;
    f.type = k === 'rain' ? 'bandpass' : 'lowpass';
    f.frequency.value = k === 'rain' ? 1400 : 320;
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(vol, a.currentTime + 1.2);
    s.connect(f).connect(g).connect(a.destination);
    s.start();
    IV_BEDS[k] = { s, g };
  }),
  bedOff: ivSafe(k => {
    const b = IV_BEDS[k];
    if (!b) return;
    delete IV_BEDS[k];
    const a = ac();
    b.g.gain.cancelScheduledValues(a.currentTime);
    b.g.gain.setValueAtTime(b.g.gain.value, a.currentTime);
    b.g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.8);
    b.s.stop(a.currentTime + 0.85);
  })
};

/* ---------- 流程 ---------- */
function ivLayout() {
  const vw = CV.clientWidth,
    vh = CV.clientHeight;
  /* 一格像素：畫面換算成約 320 寬（直立照寬度），手機至少 2 倍 */
  IV.px = Math.max(2, Math.round(Math.min(vw, vh * 1.6) / 320));
  IV.W = Math.ceil(vw / IV.px);
  IV.H = Math.ceil(vh / IV.px);
  IV.hz = Math.round(IV.H * (vw > vh ? 0.58 : 0.5));
}
function introFrame(dt) {
  if (IV.gate) return;
  IV.t0 = IV.t;
  IV.t += dt * IV.speed;
  if (IV.t >= IV_LEN) return introEnd();
  const s = SHOTS.find(o => IV.t < o.t0 + o.d),
    t = IV.t - s.t0;
  ivLayout();
  const sh = IV.sh * IV.sh * 0.3;
  CX.setTransform(DPR * IV.px, 0, 0, DPR * IV.px, 0, 0);
  CX.imageSmoothingEnabled = false;
  CX.fillStyle = '#000';
  CX.fillRect(0, 0, IV.W + 1, IV.H + 1);
  CX.translate(Math.round((Math.random() - 0.5) * sh * 2), Math.round((Math.random() - 0.5) * sh * 2));
  s.draw(s, t);
  CX.setTransform(DPR * IV.px, 0, 0, DPR * IV.px, 0, 0);
  /* 鏡頭之間走黑場；閃光 */
  ivCover('rgba(0,0,0,A)', 1 - clamp(Math.min(t / 0.5, (s.d - t) / 0.5), 0, 1));
  ivCover('rgba(255,245,235,A)', IV.fl);
  IV.fl = Math.max(0, IV.fl - dt * 1.6);
  IV.sh = Math.max(0, IV.sh - dt * 3.5);
  /* 字幕 */
  const L = s.ls.find(l => t >= l.a && t < l.b) || null,
    el = $('ivs');
  if (L !== IV.line) {
    IV.line = L;
    if (L) el.textContent = L.x;
    el.classList.toggle('on', !!L);
  }
}
/* 開場：先等玩家按一下（瀏覽器要有操作才放得出聲音） */
function introGate() {
  Object.assign(IV, { on: true, gate: true, t: 0, t0: 0, line: null, fl: 0, sh: 0 });
  document.body.classList.add('cine');
  $('intro').hidden = false;
  $('ivg').hidden = false;
  $('ivs').classList.remove('on');
  $('ivgo').focus();
}
function introGo() {
  IV.gate = false;
  IV.calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('ivg').hidden = true;
  ivLayout();
  ['village', 'sky', 'rift', 'ruin'].forEach(ivBake);
  ivSnd.bed('wind', 0.12);
}
/* 停掉畫面與聲音，不決定下一步（雲端換存檔時用） */
function introStop() {
  if (!IV.on) return;
  IV.on = false;
  document.body.classList.remove('cine');
  $('intro').hidden = true;
  Object.keys(IV_BEDS).forEach(ivSnd.bedOff);
}
/* 播完或跳過：進序章，睜開眼 */
function introEnd() {
  introStop();
  S.story.intro = PRO_VER;
  save();
  proStart();
  introLid();
}
function introKey(k) {
  if (k === 'escape') introEnd();
  else if (IV.gate && k === 'enter') introGo();
}
/* 睜眼：上下兩片黑往外退（減少動態時只淡出） */
function introLid() {
  const l = $('lid');
  l.hidden = true;
  void l.offsetWidth;
  l.hidden = false;
}
function introInit() {
  $('intro').addEventListener('click', e => {
    const b = e.target.closest('[data-iv]');
    if (!b) return;
    if (b.dataset.iv === 'go') introGo();
    else introEnd();
  });
  $('lid').addEventListener('animationend', () => ($('lid').hidden = true));
}
