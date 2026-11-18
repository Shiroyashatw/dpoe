const { chromium } = require('playwright');
/* D1 展示頁（demo/d1/）的截圖、錄影與預篩。只開展示頁，不碰遊戲。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/d1_demo.js [shots|videos|all]（預設 all）
   產出 docs/production/evidence/dpoe-d1-demo/review-fix/（D1_OUT 可改）：shots/<尺寸>/<列>.png、extra/<尺寸>/<名>.png（審查補拍）、toggles/<尺寸>/<列>_<fs|en|rm>.png、
   videos/<V>_<尺寸>_<一般|rm>.mp4（60 fps 逐幀）、results.json、results.md。
   預篩只抓明顯的失敗（裁字、出框、重疊、字級、熱區、對比、安全區、時間），不放寬清單門檻；有 ❌ 結束碼 1 */
const fs = require('fs'),
  path = require('path'),
  os = require('os'),
  { execFileSync } = require('child_process');
const MODE = process.argv[2] || 'all',
  URL = process.env.D1_URL || 'http://localhost:8000/demo/d1/',
  OUT = process.env.D1_OUT || path.join(__dirname, '..', 'docs/production/evidence/dpoe-d1-demo/review-fix');
const SIZES = process.env.D1_SIZES ? process.env.D1_SIZES.split(',') : ['390x844', '1280x720'];
/* 三個切換每個畫面挑一列（清單第 7 節的 9 個畫面） */
const TOG = {
  系統元件頁: 'S06',
  戰鬥HUD: 'H05',
  掉落動態與掉落紀錄: 'H11',
  營地升級抽屜與單座卡: 'C02',
  營地場景首頁: 'C07',
  掛機條: 'I02',
  離線結算: 'I08',
  倒下提示: 'H21',
  底分頁: 'C01'
};

/* 審查補拍（D1 審查第 8、12、26 項等）：[檔名, 列, 存檔, 在頁面裡跑的設定, 推幾格, 只拍這個尺寸, 抽屜滑入中] */
const EXTRA = [
  ['H09_all', 'H09', 'mid', 'S.filter = "all"', 20],
  ['H09_rare', 'H09', 'mid', 'S.filter = "rare"; S.feed = []; demo.reseed()', 20],
  ['H09_leg', 'H09', 'mid', 'S.filter = "leg"; S.feed = []; demo.reseed()', 20],
  [
    'H09_option_leg',
    'H09',
    'mid',
    'S.filter = "leg"; S.panel = "more"; S.fieldPanel = 1; S.drawerT = demo.NOW - 1000',
    20
  ],
  ['H17_0', 'H17', 'mid', 'S.status = { buff: 0, debuff: 0 }', 20],
  ['H17_1', 'H17', 'mid', 'S.status = { buff: 1, debuff: 0 }', 20],
  ['H17_8', 'H17', 'mid', 'S.status = { buff: 5, debuff: 3 }', 20],
  ['H17_n', 'H17', 'mid', 'S.status = { buff: 8, debuff: 9 }', 20],
  ['H19_ammo0', 'H19', 'mid', 'Object.assign(demo.SV().mid.d.skills[0], { ammo: [0, 6], cd: 1.5, left: 1.5 })', 20],
  ['H19_charge', 'H19', 'mid', '', 20],
  ['H19_flask', 'H19', 'en', '', 20],
  ['H01_leg', 'H01', 'mid', 'S.filter = "all"; S.feed = []; demo.reseed()', 20],
  ['C01_badge_dot', 'C01', 'big', '', 20],
  ['C03_lack', 'C03', 'mid', '', 4],
  ['H04_boss_feed', 'H04', 'mid', '', 20],
  ['H23_before', 'H01', 'mid', 'demo.key("h")', 11, null, 1],
  ['H23_after', 'H01', 'mid', 'demo.key("h")', 13, null, 1],
  ['K06_x_focus', 'K06', 'mid', '', 20],
  ['C06_x_focus', 'C06', 'mid', 'S.dev = "kbd"; demo.build(); demo.focus("px")', 20],
  ['H22_x_focus', 'H22', 'mid', 'S.dev = "kbd"; demo.build(); demo.focus("px")', 20],
  ['C02_x_focus', 'C02', 'mid', 'S.dev = "kbd"; demo.build(); demo.focus("px")', 20],
  ['S10_toast', 'S10', 'mid', '', 20],
  ['S11_toast', 'S11', 'near', '', 20],
  ['I08_scrim', 'I08', 'full', '', 20],
  ['S13_scroll', 'S13', 'mid', '', 20, '390x664'],
  ['I01_en', 'I01', 'en', '', 20],
  ['I01_mid', 'I01', 'mid', '', 20],
  ['H12_nums', 'H12', 'mid', '', 20],
  ['H16_hot', 'H16', 'mid', '', 20],
  ['I04_near', 'I04', 'near', '', 20],
  ['C04_sug', 'C04', 'mid', '', 20]
];

/* ---------- 量測（在頁面裡跑） ---------- */
function measure(port) {
  const ui = document.getElementById('ui'),
    U = ui.getBoundingClientRect(),
    s = U.width / ui.offsetWidth;
  const rect = e => {
    const r = e.getBoundingClientRect();
    return { x: (r.x - U.x) / s, y: (r.y - U.y) / s, w: r.width / s, h: r.height / s };
  };
  const vis = e => {
    if (!e.getClientRects().length) return false;
    if (getComputedStyle(e).clipPath.startsWith('inset(50%')) return false; /* 只給讀屏的字 */
    const sc = e.parentElement && e.parentElement.closest('.bd, .sys');
    if (sc) {
      const a = e.getBoundingClientRect(),
        b = sc.getBoundingClientRect();
      if (a.bottom <= b.top + 1 || a.top >= b.bottom - 1) return false; /* 捲到外面，不是出框 */
    }
    for (let a = e; a && a !== ui; a = a.parentElement) {
      const c = getComputedStyle(a);
      if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false;
    }
    return true;
  };
  const name = e => e.dataset.m || e.dataset.k || e.className.toString().split(' ')[0];
  const F = [],
    INFO = [];
  const W = ui.offsetWidth,
    H = ui.offsetHeight;
  const g = demo.geo();
  /* 出框 */
  for (const e of ui.querySelectorAll('[data-m]')) {
    if (!vis(e)) continue;
    const r = rect(e),
      sc = e.parentElement && e.parentElement.closest('.bd, .sys');
    if (sc) {
      const q = rect(sc);
      if (r.y < q.y - 0.5 || r.y + r.h > q.y + q.h + 0.5) continue; /* 捲動區裡露一半：捲一下就看得到 */
    }
    if (r.x < -0.5 || r.y < -0.5 || r.x + r.w > W + 0.5 || r.y + r.h > H + 0.5)
      F.push(`出框 ${name(e)} ${r.x.toFixed(0)},${r.y.toFixed(0)} ${r.w.toFixed(0)}×${r.h.toFixed(0)}`);
  }
  /* 裁字：字超出自己的框（省略號另列，清單只准砍名字） */
  for (const e of ui.querySelectorAll('[data-role], .btn')) {
    if (!vis(e)) continue;
    const c = getComputedStyle(e);
    const over = e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2;
    if (!over) continue;
    if (c.textOverflow === 'ellipsis' || e.closest('.ell, .nm'))
      INFO.push(`省略號 ${name(e)}「${e.textContent.trim().slice(0, 24)}」`);
    else if (c.overflow !== 'visible' || c.overflowX !== 'visible' || c.webkitLineClamp !== 'none')
      F.push(`裁字 ${name(e)}「${e.textContent.trim().slice(0, 24)}」`);
  }
  /* 重疊：HUD 元件兩兩交集（刻意疊放：面板、對話框、吐司、橫幅另列） */
  const hud = [...ui.querySelectorAll('[data-hud]')].filter(vis).map(e => [e, rect(e)]);
  for (let i = 0; i < hud.length; i++)
    for (let j = i + 1; j < hud.length; j++) {
      const [a, A] = hud[i],
        [b, B] = hud[j];
      const ix = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x),
        iy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
      if (ix > 0.5 && iy > 0.5) F.push(`重疊 ${name(a)}×${name(b)} ${ix.toFixed(0)}×${iy.toFixed(0)}`);
    }
  for (const e of [...ui.querySelectorAll('[data-over]')].filter(vis)) INFO.push(`白名單（刻意疊放）${name(e)}`);
  for (const p of [...ui.querySelectorAll('[data-panel]')].filter(vis)) {
    const P = rect(p);
    for (const [a, A] of hud) {
      const ix = Math.min(A.x + A.w, P.x + P.w) - Math.max(A.x, P.x),
        iy = Math.min(A.y + A.h, P.y + P.h) - Math.max(A.y, P.y);
      if (ix > 0.5 && iy > 0.5 && !p.contains(a)) F.push(`面板蓋到 ${name(a)} ${ix.toFixed(0)}×${iy.toFixed(0)}`);
    }
  }
  /* 字級：標籤、條內數字 ≥ 12；正文直立 ≥ 14、桌機 ≥ 14（次文 14／正文 16） */
  const min = { label: 12, num: 11, body: 14, icon: 0 };
  for (const e of ui.querySelectorAll('[data-role]')) {
    if (!vis(e) || !e.textContent.trim()) continue;
    const r = e.dataset.role,
      f = parseFloat(getComputedStyle(e).fontSize);
    const lim = r === 'num' && e.closest('.mp') ? 11 : r === 'num' ? 12 : min[r];
    if (f + 0.01 < lim) F.push(`字級 ${name(e)} ${f}px < ${lim}`);
  }
  /* 熱區：elementFromPoint 4 px 格點量實際可點 */
  const minHit = port ? 44 : 32;
  const seen = new Set();
  for (const e of ui.querySelectorAll('[data-hit]')) {
    if (!vis(e)) continue;
    const r = e.getBoundingClientRect(),
      sc = e.parentElement && e.parentElement.closest('.bd, .sys');
    if (sc) {
      const q = sc.getBoundingClientRect();
      if (r.top < q.top - 0.5 || r.bottom > q.bottom + 0.5) continue; /* 捲動區裡露一半的不量 */
    }
    let x0 = 1e9,
      x1 = -1e9,
      y0 = 1e9,
      y1 = -1e9;
    for (let y = r.y - 12; y <= r.bottom + 12; y += 4 * s)
      for (let x = r.x - 12; x <= r.right + 12; x += 4 * s) {
        const h = document.elementFromPoint(x, y);
        if (h && (h === e || e.contains(h) || h.closest('[data-hit]') === e))
          (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
      }
    const w = (x1 - x0) / s + 4,
      h = (y1 - y0) / s + 4,
      key = e.dataset.hit + ':' + Math.round(w) + '×' + Math.round(h);
    if (x1 < x0) continue;
    if ((w < minHit - 0.5 || h < minHit - 0.5) && !seen.has(key))
      seen.add(key), F.push(`熱區 ${name(e)} ${Math.round(w)}×${Math.round(h)} < ${minHit}`);
  }
  /* 安全區（直立）：上下安全區內可點元素 0 */
  if (port)
    for (const e of ui.querySelectorAll('[data-hit], button')) {
      if (!vis(e)) continue;
      const sc = e.parentElement && e.parentElement.closest('.bd, .sys');
      if (sc && e.getBoundingClientRect().top < sc.getBoundingClientRect().top - 0.5) continue;
      const r = rect(e);
      if (r.y < g.st - 0.5 || r.y + r.h > g.H - g.sb + 0.5)
        F.push(`安全區內可點 ${name(e)} y ${r.y.toFixed(0)}–${(r.y + r.h).toFixed(0)}`);
    }
  /* 對比：字色對背景（往上疊背景色；疊到底是戰場就取畫布字形外 8 px 環最亮 10%） */
  const cv = document.getElementById('cv'),
    cx = cv.getContext('2d'),
    vpR = cv.getBoundingClientRect(),
    cs = vpR.width / cv.width;
  const parse = c => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const v = m[1]
      .split(/[ ,/]+/)
      .filter(Boolean)
      .map(Number);
    return [v[0], v[1], v[2], v[3] == null ? 1 : v[3]];
  };
  const lum = ([r, g, b]) => {
    const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const seenC = new Set();
  for (const e of ui.querySelectorAll('[data-role]')) {
    if (!vis(e) || !e.textContent.trim() || e.dataset.role === 'icon') continue;
    const st = getComputedStyle(e),
      fg = parse(st.color);
    const layers = [];
    for (let a = e; a && a !== ui; a = a.parentElement) {
      const b = parse(getComputedStyle(a).backgroundColor);
      if (b && b[3] > 0) layers.push(b);
      if (b && b[3] >= 0.999) break;
    }
    let bg;
    if (layers.length && layers[layers.length - 1][3] >= 0.999) bg = layers.pop().slice(0, 3);
    else {
      /* 畫布：元素框往外 8 px，取最亮 10% */
      const r = e.getBoundingClientRect(),
        x = Math.max(0, Math.floor((r.x - 8 - vpR.x) / cs)),
        y = Math.max(0, Math.floor((r.y - 8 - vpR.y) / cs)),
        w = Math.min(cv.width - x, Math.ceil((r.width + 16) / cs)),
        h = Math.min(cv.height - y, Math.ceil((r.height + 16) / cs));
      if (w <= 0 || h <= 0) continue;
      const d = cx.getImageData(x, y, w, h).data,
        L = [];
      for (let i = 0; i < d.length; i += 16) L.push([d[i], d[i + 1], d[i + 2]]);
      L.sort((p, q) => lum(q) - lum(p));
      bg = L[Math.floor(L.length * 0.1)] || [0, 0, 0];
    }
    for (const l of layers.reverse()) bg = bg.map((c, i) => c * (1 - l[3]) + l[i] * l[3]);
    const fgc = fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));
    const k = ratio(fgc, bg),
      big =
        parseFloat(st.fontSize) >= 18.66 ||
        (parseFloat(st.fontSize) >= 14 && +st.fontWeight >= 700 && parseFloat(st.fontSize) >= 18.66),
      lim = big ? 3 : 4.5;
    const id = name(e) + st.color + bg.map(Math.round).join(',');
    if (k < lim && !seenC.has(id))
      seenC.add(id), F.push(`對比 ${name(e)}「${e.textContent.trim().slice(0, 14)}」${k.toFixed(2)} < ${lim}`);
  }
  /* 焦點框（K06）：每顆 × 的 2 px 往外 2 px 框，四邊都不能被 overflow 的祖先裁掉 */
  for (const e of ui.querySelectorAll('.x44')) {
    if (!vis(e)) continue;
    const r = e.getBoundingClientRect(),
      o = 4 * s;
    for (let a = e.parentElement; a && a !== ui.parentElement; a = a.parentElement) {
      const c = getComputedStyle(a);
      if (c.overflow === 'visible' && c.overflowX === 'visible' && c.overflowY === 'visible') continue;
      const q = a.getBoundingClientRect(),
        bl = parseFloat(c.borderLeftWidth) * s,
        bt = parseFloat(c.borderTopWidth) * s,
        br = parseFloat(c.borderRightWidth) * s,
        bb = parseFloat(c.borderBottomWidth) * s;
      const cut = [];
      if (r.top - o < q.top + bt - 0.5) cut.push('上');
      if (r.bottom + o > q.bottom - bb + 0.5) cut.push('下');
      if (r.left - o < q.left + bl - 0.5) cut.push('左');
      if (r.right + o > q.right - br + 0.5) cut.push('右');
      if (cut.length) {
        const msg = `焦點框被裁 ${name(e)}（${e.getAttribute('aria-label') || ''}）${cut.join('')}緣`;
        /* K06 管抽屜的 ×；掛機條 44 高、鈕也 44，另列備註 */
        if (e.closest('[data-panel]')) F.push(msg);
        else INFO.push(msg + '（不在抽屜）');
        break;
      }
    }
  }
  /* 英文（存檔或 +40%）：畫面上不該剩中文字 */
  if (demo.isEN()) {
    const tw = document.createTreeWalker(ui, NodeFilter.SHOW_TEXT),
      bad = new Set();
    for (let n; (n = tw.nextNode()); ) {
      if (!/[\u3400-\u9fff]/.test(n.data) || !vis(n.parentElement) || n.parentElement.closest('[data-note]'))
        continue; /* 標註（清單列名）不算 */
      bad.add(n.data.trim().slice(0, 16));
    }
    if (bad.size)
      F.push(`英文畫面還有中文 ${[...bad].slice(0, 6).join('／')}${bad.size > 6 ? ` 等 ${bad.size} 處` : ''}`);
  }
  return { F, INFO, miss: demo.miss() };
}

/* 審查量測：色票對比（WCAG）、ΔE2000、低血邊的樣式與層級 */
function palette() {
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const hex = c => {
    const d = document.createElement('div');
    d.style.color = c;
    document.body.appendChild(d);
    const m = getComputedStyle(d)
      .color.match(/[\d.]+/g)
      .map(Number);
    d.remove();
    return m.slice(0, 3);
  };
  const lin = c => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const cr = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const lab = ([r, g, b]) => {
    const [R, G, B] = [r, g, b].map(lin);
    const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047,
      Y = 0.2126 * R + 0.7152 * G + 0.0722 * B,
      Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
    const f = t => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
  };
  const de = (c1, c2) => {
    const [L1, a1, b1] = lab(c1),
      [L2, a2, b2] = lab(c2),
      rad = Math.PI / 180;
    const C1 = Math.hypot(a1, b1),
      C2 = Math.hypot(a2, b2),
      Cb = (C1 + C2) / 2,
      G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
    const a1p = (1 + G) * a1,
      a2p = (1 + G) * a2,
      C1p = Math.hypot(a1p, b1),
      C2p = Math.hypot(a2p, b2);
    const h = (b, a) => (Math.atan2(b, a) / rad + 360) % 360;
    const h1 = h(b1, a1p),
      h2 = h(b2, a2p);
    const dL = L2 - L1,
      dC = C2p - C1p;
    let dh = h2 - h1;
    if (C1p * C2p === 0) dh = 0;
    else if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
    const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
    const Lb = (L1 + L2) / 2,
      Cbp = (C1p + C2p) / 2;
    let hb = h1 + h2;
    if (C1p * C2p !== 0) hb = Math.abs(h1 - h2) > 180 ? (h1 + h2 + 360) / 2 : (h1 + h2) / 2;
    const T =
      1 -
      0.17 * Math.cos((hb - 30) * rad) +
      0.24 * Math.cos(2 * hb * rad) +
      0.32 * Math.cos((3 * hb + 6) * rad) -
      0.2 * Math.cos((4 * hb - 63) * rad);
    const SL = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2),
      SC = 1 + 0.045 * Cbp,
      SH = 1 + 0.015 * Cbp * T;
    const RT =
      -2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad);
    return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
  };
  const C = n => hex(css(n));
  const pairs = [
    ['條上字 --tx-strong／生命條填色 --hp', '--tx-strong', '--hp', 7.17],
    ['條上字 --tx-strong／魔力條填色 --mp', '--tx-strong', '--mp', 7.17],
    ['條上字 --tx-strong／條底 --panel-inset', '--tx-strong', '--panel-inset', 7.17],
    ['--warn（過熱外框、倉庫快滿）／--panel', '--warn', '--panel', 4.5],
    ['--warn（差 280 靈魂）／--panel-raised', '--warn', '--panel-raised', 4.5],
    ['--bad／--panel-raised', '--bad', '--panel-raised', 4.5],
    ['--warn 外框／--panel-inset（框，≥ 3）', '--warn', '--panel-inset', 3]
  ].map(([t, a, b, lim]) => ({ t, v: cr(C(a), C(b)), lim }));
  const deltas = [
    ['--warn／--bad（警告不再像危險紅）', '--warn', '--bad'],
    ['--warn／--hp（過熱跟生命條不撞色）', '--warn', '--hp'],
    ['--mp／--hp', '--mp', '--hp'],
    ['--warn／--rar-rare', '--warn', '--rar-rare']
  ].map(([t, a, b]) => ({ t, v: de(C(a), C(b)) }));
  const tok = Object.fromEntries(['--bad', '--bad-hi', '--bad-rgb', '--warn', '--hp', '--mp'].map(n => [n, css(n)]));
  return { pairs, deltas, tok };
}
/* 低血邊：樣式、層級（戰場畫布之上、HUD 之下） */
function vignette() {
  const v = document.getElementById('d-vign'),
    ui = document.getElementById('ui');
  if (!v) return null;
  const first = [...ui.children].filter(e => e.matches('.ab:not(.safe)'))[0] === v;
  const cs = getComputedStyle(v);
  const hudOver = [...ui.querySelectorAll('[data-hud]')].filter(e => {
    const z = getComputedStyle(e).zIndex;
    return v.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING || z !== 'auto';
  }).length;
  return {
    shadow: cs.boxShadow,
    z: cs.zIndex,
    first,
    hud: ui.querySelectorAll('[data-hud]').length,
    hudOver,
    a: +v.dataset.a
  };
}

/* 每格探針（錄影時量時間） */
function probe() {
  const q = s => document.querySelector(s),
    op = e => (e && e.getClientRects().length ? +getComputedStyle(e).opacity : 0),
    S = demo.S,
    g = demo.geo();
  const bb = q('#d-boss'),
    ul = q('#d-ult'),
    dw = q('#d-drw') || q('[data-panel]'),
    fb = q('#d-fb');
  const fills = [...document.querySelectorAll('.dbtn.hold, .btn.hold')].map(b => +b.dataset.fill);
  return {
    t: demo.NOW,
    fill: fills.length ? Math.max(...fills) : null,
    boss: bb ? { ph: bb.dataset.phase, h: parseFloat(bb.style.height), y: parseFloat(bb.style.top) } : null,
    ult: ul && !ul.classList.contains('hide') ? ul.style.transform || 'none' : null,
    gray: q('#cv').style.filter,
    plate: q('#d-dplate') && !q('#d-dplate').classList.contains('hide') ? +q('#d-dplate').style.opacity || 1 : 0,
    d3: q('#d-d3') && !q('#d-d3').classList.contains('hide') ? +q('#d-d3').style.opacity : 0,
    fade: q('#d-fade') ? +q('#d-fade').style.opacity : 0,
    feed: [...document.querySelectorAll('#d-feed .fr:not(.sum)')].map(r => [
      r.dataset.rar,
      +r.style.opacity,
      r.querySelector('.nm').textContent,
      r.style.transform
    ]),
    idleH: q('#d-idle') ? parseFloat(q('#d-idle').style.height) : null,
    idleOpen: S.idleOpen,
    fieldH: g.fieldBot - g.fieldTop,
    drawer: dw ? dw.style.transform || 'o' + dw.style.opacity : null,
    focus: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k || null : null,
    panel: S.panel,
    scr: S.scr,
    strip: q('#d-strip') ? q('#d-strip').offsetHeight : null,
    back: q('#d-back') ? !q('#d-back').classList.contains('hide') : null,
    flip: fb ? fb.style.transform || 'o' + fb.style.opacity : null,
    chban: q('#d-chban') ? !q('#d-chban').classList.contains('hide') : null,
    shake: S.shakeEl && q(S.shakeEl) ? q(S.shakeEl).style.transform : '',
    gain: q('#d-cgain') && !q('#d-cgain').classList.contains('hide') ? +q('#d-cgain').style.opacity : 0,
    off: q('#d-off') ? q('#d-off').dataset.done : null,
    offSum: q('#d-offsum') ? q('#d-offsum').textContent : null,
    offK: q('#d-off') ? +q('#d-off').dataset.k : null,
    idleMs: S.idleMs,
    hp: S.hp,
    hero: demo.hero(),
    thin: demo.feedThin(),
    hud: ['H02', 'H13', 'H17', 'H18', 'H07']
      .map(m => q(`[data-m="${m}"]`))
      .map(e => (e ? `${e.offsetLeft},${e.offsetTop},${e.style.transform || ''}` : '-'))
      .concat([q('#cv').style.transform || '', q('#ui').style.transform || ''])
      .join('|'),
    flipR: q('#d-flip')
      ? (r => `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}`)(
          q('#d-flip').getBoundingClientRect()
        )
      : null,
    ffT: q('#d-ff') ? q('#d-ff').style.transform : null,
    ffF: q('#d-ff') ? q('#d-ff').style.filter : null,
    f4T: q('#d-f4') ? q('#d-f4').style.transform : null,
    f4F: q('#d-f4') ? q('#d-f4').style.filter : null
  };
}

/* ---------- 時間檢查（照清單第 6 節；±1 幀＝16.7 ms） ---------- */
const FR = 1000 / 60,
  near = (a, b, tol = FR + 0.5) => Math.abs(a - b) <= tol;
const firstT = (P, f, from = 0) => {
  const p = P.find(x => x.t >= from && f(x));
  return p ? p.t : null;
};
function timing(V, P, L, rm) {
  const R = [],
    ok = (c, msg) => R.push((c ? '✅ ' : '❌ ') + msg),
    t0 = P[0].t - FR,
    ev = (e, i = 0) => (L.filter(x => x.ev === e)[i] || {}).t;
  if (V === 'V1') {
    const lo = firstT(P, p => p.hp != null && p.hp < 0.35);
    ok(lo != null && P.find(p => p.t === lo).back, '生命 < 35% 那一格「回戰場」出現');
    const s20 = firstT(P, p => p.hp != null && p.hp < 0.2),
      big = firstT(P, p => p.strip >= 330, s20);
    ok(
      big != null && big - s20 <= (rm ? FR + 1 : 200 + FR + 1),
      `生命 < 20% 戰場條拉高到 330：${big != null ? (big - s20).toFixed(0) : '—'} ms（≤ 200${rm ? '，減少動態直接換' : ''}）`
    );
    const u = ev('ult'),
      ub = firstT(P, p => p.strip >= 330, u);
    ok(
      u != null && ub != null && ub - u <= 200 + FR + 1,
      `王大招拉高到 330：${ub != null && u != null ? (ub - u).toFixed(0) : '—'} ms`
    );
  }
  if (V === 'V2') {
    const ci = ev('camp-in'),
      co = ev('camp-out'),
      a = P.find(p => p.t >= ci + 100),
      b = P.find(p => p.t >= co - 50 && p.t < co);
    ok(
      a && b && b.idleMs > a.idleMs,
      `營地中掛機時間照走：${a ? a.idleMs.toFixed(0) : '—'} → ${b ? b.idleMs.toFixed(0) : '—'} ms`
    );
    const d0 = P.find(p => p.panel === 'camp'),
      d1 = [...P].reverse().find(p => p.panel === 'camp');
    ok(d0 && d1 && d1.idleMs > d0.idleMs, '營地升級抽屜開著時掛機秒數不停');
    const g0 = firstT(P, p => p.gain > 0, co);
    ok(
      g0 != null && near(g0 - co, 160),
      `回來淡入 160 後出「營地期間 +N」：${g0 != null ? (g0 - co).toFixed(0) : '—'} ms`
    );
    const gEnd = firstT(P, p => p.gain < 1, g0 + 10),
      gOff = firstT(P, p => p.gain === 0, g0 + 10);
    ok(
      gEnd != null && near(gEnd - g0, 3000, FR * 1.5) && gOff != null && near(gOff - gEnd, 300, FR * 1.5),
      `停 ${gEnd != null ? (gEnd - g0).toFixed(0) : '—'} ms、淡出 ${gOff != null && gEnd != null ? (gOff - gEnd).toFixed(0) : '—'} ms（3,000／300）`
    );
    const co2 = ev('camp-out', 1),
      g2 = firstT(P, p => p.gain > 0, co2);
    ok(co2 != null && g2 == null, '在營地 < 10 秒不出');
  }
  if (V === 'V3') {
    const hs = L.filter(x => x.ev === 'hold-start').map(x => x.t),
      done = L.filter(x => x.ev === 'hold-done');
    const full = firstT(P, p => p.fill >= 0.9999, hs[1]);
    ok(
      full != null && near(full - hs[1], 600),
      `填滿 ${full != null ? (full - hs[1]).toFixed(1) : '—'} ms（600 ±1 幀）`
    );
    const c = L.find(x => x.ev === 'hold-cancel'),
      back = c && firstT(P, p => p.fill === 0 || p.fill == null, c.t);
    ok(
      c && back != null && back - c.t <= 150,
      `早放開退回 ${back != null && c ? (back - c.t).toFixed(0) : '—'} ms（≤ 150）`
    );
    ok(
      done.length === 2 && done.every(d => d.ms >= 599.9),
      `按滿 0.6 秒才確認（${done.length} 次，${done.map(d => d.ms.toFixed(0)).join('、')} ms）`
    );
  }
  if (V === 'V4') {
    const b0 = ev('boss-banner'),
      sh = firstT(P, p => p.boss && p.boss.ph === 'shrink', b0),
      bar = firstT(P, p => p.boss && p.boss.ph === 'bar', b0);
    if (rm)
      ok(
        bar != null && near(bar - b0, 800),
        `減少動態：不縮放，${bar != null ? (bar - b0).toFixed(0) : '—'} ms 換成王血條`
      );
    else {
      ok(sh != null && near(sh - b0, 800), `橫幅停 ${sh != null ? (sh - b0).toFixed(0) : '—'} ms（800 ±1 幀）`);
      ok(
        bar != null && sh != null && near(bar - sh, 240),
        `縮進王血條 ${bar != null && sh != null ? (bar - sh).toFixed(0) : '—'} ms（240 ±1 幀）`
      );
    }
    const b1 = ev('boss-banner', 1),
      u = ev('ult'),
      ub = P.find(p => p.t >= u);
    ok(ub && ub.boss && ub.boss.ph === 'bar' && ub.ult, '橫幅期間出大招：同一格換成王血條、大招警示出現（0 ms）');
    const ue = firstT(P, p => p.ult === 'none' || p.ult === '', u);
    ok(
      rm ? ub && (ub.ult === 'none' || ub.ult === '') : ue != null && near(ue - u, 80),
      rm ? '減少動態：大招不縮放' : `大招 1.1→1 用 ${ue != null ? (ue - u).toFixed(0) : '—'} ms（80）`
    );
    ok(b1 != null, '第二次王出現');
  }
  if (V === 'V5') {
    const d = L.filter(x => x.ev === 'down').map(x => x.t),
      rv = L.filter(x => x.ev === 'revive').map(x => x.t);
    const g1 = firstT(P, p => p.gray === 'grayscale(1)', d[0]);
    ok(
      rm ? !P.some(p => p.gray) : g1 != null && near(g1 - d[0], 300),
      rm ? '減少動態：不去色' : `去色 ${g1 != null ? (g1 - d[0]).toFixed(0) : '—'} ms（300）`
    );
    ok(P.find(p => p.t >= d[0]).plate > 0 || rm, '字板 0 ms 出現');
    ok(rv[0] != null && rv[0] - d[0] <= 3000 + 0.5, `${(rv[0] - d[0]).toFixed(0)} ms 能再操作（≤ 3,000）`);
    const l = ev('d3-line'),
      fadeIn = P.find(p => p.t >= rv[2] + 60);
    ok(
      l != null && fadeIn && fadeIn.fade > 0,
      `連續 3 次：淡出 120／淡入 160（${l != null ? (l - rv[2]).toFixed(0) : '—'} ms 換地點）`
    );
    const lEnd = firstT(P, p => p.d3 > 0 && p.d3 < 1, l),
      lOff = firstT(P, p => p.d3 === 0, l + 10);
    ok(
      lEnd != null && near(lEnd - l, 6000, FR * 1.5) && lOff != null && near(lOff - lEnd, 300, FR * 1.5),
      `一行 ${lEnd != null ? (lEnd - l).toFixed(0) : '—'} ms＋淡出 ${lOff != null && lEnd != null ? (lOff - lEnd).toFixed(0) : '—'} ms（6,000＋300）`
    );
    /* 審查 V5：減少動態時不震、不縮放、不位移（HUD 位置、畫布與 #ui 的 transform、主角位置整段不變），淡入 ≤ 150 */
    const hudSet = new Set(P.map(p => p.hud)),
      heroSet = new Set(P.map(p => (p.hero ? `${p.hero.x.toFixed(1)},${p.hero.y.toFixed(1)}` : '-')));
    if (rm) {
      ok(
        hudSet.size === 1 && heroSet.size === 1,
        `減少動態：不震、不縮放、不位移（HUD 位置 ${hudSet.size} 種、主角位置 ${heroSet.size} 種）`
      );
      const fs = firstT(P, p => p.fade > 0, rv[2]),
        fe = fs != null && firstT(P, p => p.fade === 0, fs + 130);
      const peak =
        fs != null && P.filter(p => p.t >= fs && p.t < fe).reduce((a, p) => (p.fade > a.fade ? p : a), { fade: -1 });
      ok(
        fe != null && peak && fe - peak.t <= 150 + FR + 0.5,
        `減少動態：淡入 ${fe != null && peak ? (fe - peak.t).toFixed(0) : '—'} ms（≤ 150）`
      );
    } else R.push(`ℹ️ 一般：HUD 位置 ${hudSet.size} 種、主角位置 ${heroSet.size} 種`);
  }
  if (V === 'V6') {
    const ins = L.filter(x => x.ev === 'feed-in'),
      f = ins[0];
    const o1 = firstT(P, p => p.feed.some(r => r[2] === f.name && r[1] >= 0.999), f.t);
    ok(o1 != null && near(o1 - f.t, 120), `淡入 ${o1 != null ? (o1 - f.t).toFixed(0) : '—'} ms（120）`);
    const p1 = P.find(p => p.t >= f.t + 1);
    ok(
      rm ? p1.feed[0][3] === 'translateY(0px)' || p1.feed[0][3] === 'translateY(0.00px)' : /-/.test(p1.feed[0][3]),
      rm ? '減少動態：不下移 6 px' : '進來下移 6 px'
    );
    const m = L.find(x => x.ev === 'feed-merge'),
      pm = P.find(p => p.t >= m.t);
    ok(m && pm.feed[0][2] === m.name, `合併：${m && m.name} +${m && m.n} 移到最上`);
    const stay = (nm, ms, after) => {
      const last = L.filter(
        x => (x.ev === 'feed-in' || x.ev === 'feed-merge') && x.name === nm && x.t >= (after || 0)
      ).pop();
      if (!last) return null;
      const s = firstT(P, p => p.feed.some(r => r[2] === nm && r[1] < 0.999), last.t + 200),
        e = firstT(P, p => !p.feed.some(r => r[2] === nm), last.t + 200);
      return [s && s - last.t, e && e - s];
    };
    for (const [nm, ms, lab] of [
      ['崇高石', 6000, '稀有'],
      ['赤霄印', 10000, '追逐']
    ]) {
      const r = stay(nm, ms);
      ok(
        r && r[0] != null && near(r[0], ms, FR * 1.5) && r[1] != null && near(r[1], 400, FR * 1.5),
        `${lab}停留 ${r && r[0] != null ? r[0].toFixed(0) : '—'} ms＋淡出 ${r && r[1] != null ? r[1].toFixed(0) : '—'} ms（${ms}＋400）`
      );
    }
    const ev1 = L.filter(x => x.ev === 'feed-evict');
    ok(
      ev1.length && ev1.every(x => x.rar === 'normal' || !x.hadNormal),
      `滿了先擠普通（稀有以上只在沒有普通時才被擠）：${ev1.map(x => x.name + '（' + x.rar + '）').join('、') || '—'}`
    );
    const qt = ev('feed-quiet'),
      rq = qt != null ? stay('聖化石', 3000, qt) : null;
    ok(
      rq && rq[0] != null && near(rq[0], 3000, FR * 1.5) && rq[1] != null && near(rq[1], 400, FR * 1.5),
      `列沒滿時普通停留 ${rq && rq[0] != null ? rq[0].toFixed(0) : '—'} ms＋淡出 ${rq && rq[1] != null ? rq[1].toFixed(0) : '—'} ms（3,000＋400）`
    );
    const r3 = stay('增幅石', 3000);
    ok(
      r3 == null || (r3[0] != null && near(r3[0], 3000, FR * 1.5)) || r3[0] == null,
      `普通停留 ${r3 && r3[0] != null ? r3[0].toFixed(0) : '被擠掉'} ms（3,000）`
    );
  }
  if (V === 'V7') {
    const o = ev('idle-open'),
      full = firstT(P, p => p.idleH >= 199.99, o);
    ok(
      rm ? full != null && full - o <= FR + 0.5 : full != null && near(full - o, 200),
      `展開 ${full != null ? (full - o).toFixed(0) : '—'} ms（200${rm ? '，減少動態不滑' : ''}）`
    );
    const c = ev('idle-close'),
      cl = firstT(P, p => p.idleH <= 44.01, c);
    ok(
      rm ? cl - c <= FR + 0.5 : cl != null && near(cl - c, 200),
      `收起 ${cl != null ? (cl - c).toFixed(0) : '—'} ms（200）`
    );
    const auto = L.find(x => x.ev === 'idle-close' && x.why === 'auto'),
      o2 = ev('idle-open', 1);
    ok(auto && near(auto.t - o2, 6000, FR * 1.5), `6 秒沒操作自動收：${auto ? (auto.t - o2).toFixed(0) : '—'} ms`);
    const op = ev('off-open'),
      dn = firstT(P, p => p.offK >= 1, op);
    ok(
      rm ? dn != null && dn - op <= FR + 0.5 : dn != null && near(dn - op, 1200),
      `離線數字跑 ${dn != null ? (dn - op).toFixed(0) : '—'} ms（1,200 ease-out-expo${rm ? '；減少動態直接顯示' : ''}）`
    );
    const op2 = ev('off-open', 1),
      sk = L.find(x => x.ev === 'off-skip'),
      af = sk && P.find(p => p.t >= sk.t + 1);
    ok(
      rm || (sk && af && /6\.4萬/.test(af.offSum)),
      rm ? '減少動態：直接是最終值，點一下就收' : `點一下立刻跑完（${sk ? (sk.t - op2).toFixed(0) : '—'} ms 點）`
    );
  }
  if (V === 'V7a') {
    const o = ev('idle-open'),
      auto = L.find(x => x.ev === 'idle-close' && x.why === 'auto'),
      shut = auto && firstT(P, p => p.idleH <= 44.01, auto.t);
    ok(
      auto && near(auto.t - o, 6000, FR * 1.5),
      `展開後 6 秒沒操作自動收：${auto ? (auto.t - o).toFixed(0) : '—'} ms（6,000）`
    );
    ok(
      shut != null && (rm ? shut - auto.t <= FR + 0.5 : near(shut - auto.t, 200)),
      `收回 ${shut != null && auto ? (shut - auto.t).toFixed(0) : '—'} ms（200${rm ? '，減少動態不滑' : ''}）`
    );
  }
  if (V === 'V8') {
    const f = ev('flip'),
      fe = firstT(P, p => /rotateY\(180(\.0+)?deg\)/.test(p.flip) || p.flip === 'o0', f);
    ok(fe != null, `翻牌揭曉 ${fe != null ? (fe - f).toFixed(0) : '—'} ms`);
    const pb = firstT(P, p => p.chban, f);
    ok(pb != null, `保底 100% 演出出現（${pb != null ? (pb - f).toFixed(0) : '—'} ms）`);
    const s = L.filter(x => x.ev === 'f4-shake');
    const se = s.length && firstT(P, p => p.shake === '' || p.shake === 'translateX(0.00px)', s[0].t + 1);
    ok(
      s.length >= 2 && (rm || (se && se - s[0].t <= 120 + FR + 1)),
      `F4 停用抖 ${se ? (se - s[0].t).toFixed(0) : '—'} ms（120；demo 未驗，進遊戲量）`
    );
    /* 審查 V8：減少動態時物品框不抖（位置不變、沒有 transform），揭曉改一次 120 ms 亮度閃光 */
    if (rm) {
      const fr = new Set(P.filter(p => p.flipR).map(p => p.flipR)),
        tr = P.some(p => (p.ffT && p.ffT !== 'none') || (p.f4T && p.f4T !== 'none' && p.f4T !== ''));
      ok(fr.size === 1 && !tr, `減少動態：物品框不抖（位置 ${fr.size} 種、transform ${tr ? '有' : '無'}）`);
      const a = firstT(P, p => /brightness/.test(p.ffF || ''), f),
        b2 = a != null && firstT(P, p => !p.ffF, a);
      ok(
        a != null && b2 != null && near(b2 - a, 120),
        `揭曉亮度閃光 ${a != null && b2 ? (b2 - a).toFixed(0) : '—'} ms（120）`
      );
    }
  }
  if (V === 'V9') {
    const o = L.find(x => x.ev === 'panel' && x.p === 'camp'),
      rs = L.filter(x => x.ev === 'field-resize');
    const port = P[0].fieldH > 400 && P[0].fieldH < 700;
    if (port) {
      ok(
        rs.length >= 1 && near(rs[0].t - o.t, rm ? 150 : 200),
        `滑完那一格戰場改高：${rs.length ? (rs[0].t - o.t).toFixed(0) : '—'} ms（200）`
      );
      const hs = [...new Set(P.filter(p => p.t >= o.t && p.t < o.t + 400).map(p => p.fieldH))];
      ok(hs.length === 2 && hs[0] === 663 && hs[1] === 283, `戰場高 ${hs.join(' → ')}（663 → 283 一次改）`);
      /* 審查 V9：縮小前後兩幀主角中心位移 ≤ 2 px（主角留在看得到的戰場正中心） */
      for (const r of rs.slice(0, 1)) {
        /* 比「最後一幀 663」對「第一幀 283」（log 時間有四捨五入，不拿它找幀） */
        const i = P.findIndex((p, j) => j > 0 && p.t >= o.t && p.fieldH < P[j - 1].fieldH),
          a = P[i - 1] && P[i - 1].hero,
          b = P[i] && P[i].hero;
        const d = a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;
        ok(
          d != null && d <= 2,
          `縮小那一格主角中心位移 ${d != null ? d.toFixed(2) : '—'} px（≤ 2；${a ? a.y.toFixed(1) : '—'} → ${b ? b.y.toFixed(1) : '—'}，戰場 ${P[i - 1] ? P[i - 1].fieldH : '—'} → ${P[i] ? P[i].fieldH : '—'}）`
        );
        if (b) R.push(`ℹ️ 縮小後主角在戰場框的相對位置 ${((b.y - 47) / P[i].fieldH).toFixed(3)}（0.5＝正中心）`);
      }
    } else {
      ok(true, '桌機：右欄滑入，戰場不改高');
      const hs = new Set(
        P.filter(p => p.scr === 'hud' && p.panel !== 'tree' && p.hero).map(
          p => `${p.hero.x.toFixed(1)},${p.hero.y.toFixed(1)}`
        )
      );
      ok(hs.size === 1, `桌機：抽屜開關時主角位置 ${hs.size} 種（不動）`);
    }
    const tabs = L.filter(x => x.ev === 'key' && x.k === 'Tab').map(x => P.find(p => p.t >= x.t).focus);
    ok(tabs.length === 3 && tabs.every(Boolean) && tabs[0] !== tabs[1], `Tab 換分頁、焦點 0 ms：${tabs.join(' → ')}`);
    const esc = L.filter(x => x.ev === 'esc').map(x => x.what);
    ok(
      JSON.stringify(esc.slice(-6)) ===
        JSON.stringify(['dialog', 'spect', 'tree', 'open-settings', 'settings', 'open-settings'].slice(-6)) ||
        esc.includes('dialog'),
      `Esc 逐層關：${esc.join(' → ')}`
    );
    const ar = L.filter(x => x.ev === 'focus').length;
    ok(ar >= 3, `方向鍵移焦點 ${ar} 次`);
  }
  return R;
}

/* ---------- results.md ---------- */
const VID = {
  S05: 'V9',
  S06: 'V3',
  S07: 'V3',
  S09: 'V3',
  H04: 'V4',
  H07: 'V6',
  H08: 'V6',
  H10: 'V6',
  H20: 'V5',
  H21: 'V5',
  H23: 'V9',
  C05: 'V2',
  C09: 'V2',
  C10: 'V2',
  I02: 'V7',
  I07: 'V7',
  K02: 'V9',
  K03: 'V9',
  K07: 'V9'
};
function report(res) {
  const cell = x => (!x ? '未跑' : x.na ? '—（清單此尺寸不驗）' : x.F.length ? '❌ ' + x.F.join('；') : '✅');
  const vok = (V, sz) =>
    ['一般', 'rm']
      .map(m => res.videos[`${V}|${sz}|${m}`])
      .map(v => (!v ? '未錄' : v.R.some(x => x.startsWith('❌')) ? '❌' : '✅'))
      .join('／');
  const L = [
    '# dpoe-d1-demo 預篩結果',
    '',
    '由 `node tools/d1_demo.js` 產生（先開 `python3 -m http.server 8000`）。預篩只抓明顯失敗：出框、裁字、HUD 兩兩重疊、面板蓋 HUD、字級、熱區（elementFromPoint 4 px 格點）、直立安全區、對比（往上疊背景；疊到戰場取畫布框外 8 px 最亮 10%）、錄影的時間（±1 幀）。通過預篩≠清單列通過，A／C／D 的判斷仍待 UIUX 審查。',
    ''
  ];
  L.push(
    '## 逐列（66 列）',
    '',
    '| # | 畫面 × 狀態 | 存檔 | 390×844 | 1280×720 | 錄影（一般／減少動態） | 備註 |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  );
  for (const [id, r] of Object.entries(res.shots)) {
    const a = r['390x844'],
      b = r['1280x720'],
      any = (a && !a.na && a) || b;
    const note = [];
    if (res.rows && res.rows[id] && res.rows[id].nv) note.push(`${res.rows[id].nv}：demo 未驗，進遊戲量`);
    if (any && any.miss && any.miss.length) note.push('缺欄沿用中期：' + any.miss.join('、'));
    const el = [...new Set([...(a && a.INFO ? a.INFO : []), ...(b && b.INFO ? b.INFO : [])])];
    if (el.length) note.push(el.slice(0, 4).join('；') + (el.length > 4 ? ` 等 ${el.length} 項` : ''));
    const V = VID[id];
    L.push(
      `| ${id} | ${(res.rows && res.rows[id] && res.rows[id].t) || ''} | ${(any && any.save) || ''} | ${cell(a)} | ${cell(b)} | ${V ? `${V} 390：${vok(V, '390x844')}・1280：${vok(V, '1280x720')}` : '—'} | ${note.join('<br>')} |`
    );
  }
  L.push('', '截圖：`shots/<尺寸>/<列>.png`（S12 是 390×763、S13 是 390×664、S14 另有 `S14_1280x800.png`）。', '');
  if (res.extra) {
    L.push('## 審查補拍', '', '| 檔名 | 列 | 存檔 | 尺寸 | 預篩 |', '| --- | --- | --- | --- | --- |');
    for (const [k, x] of Object.entries(res.extra)) {
      const [nm, sz] = k.split('|');
      L.push(`| \`extra/${sz}/${nm}.png\` | ${x.row} | ${x.save} | ${x.size} | ${cell(x)} |`);
    }
    L.push('');
  }
  {
    L.push('## 審查量測', '');
    const h16 = res.shots.H16 && (res.shots.H16['390x844'] || res.shots.H16['1280x720']);
    if (h16 && h16.palette) {
      const pl = h16.palette;
      L.push(
        `demo 覆寫的 token（量到的值）：${Object.entries(pl.tok)
          .map(([k, v]) => `\`${k}: ${v}\``)
          .join('、')}`,
        '',
        '| 對比（WCAG） | 值 | 門檻 |',
        '| --- | --- | --- |',
        ...pl.pairs.map(
          x =>
            `| ${x.t} | ${x.v.toFixed(3)}:1 ${+x.v.toFixed(2) >= x.lim ? '✅' : '❌'} | ≥ ${x.lim}（照 M2-36 取兩位小數比） |`
        ),
        '',
        '| ΔE2000 | 值 |',
        '| --- | --- |',
        ...pl.deltas.map(x => `| ${x.t} | ${x.v.toFixed(1)} |`),
        ''
      );
    }
    for (const id of ['H14', 'H15'])
      for (const sz of SIZES) {
        const v = res.shots[id] && res.shots[id][sz] && res.shots[id][sz].vign;
        if (v)
          L.push(
            `- ${id} ${sz}：box-shadow \`${v.shadow}\`；z-index ${v.z}；在 #ui 第一個（戰場畫布之上）：${v.first ? '是' : '否'}；HUD ${v.hud} 個都畫在它上面：${v.hudOver === v.hud ? '是' : '否'}（${v.hudOver}/${v.hud}）`
          );
      }
    L.push('', '錄影量測（V5、V6、V7a、V8、V9 的時間與位移）寫在下面錄影表的「時間檢查」欄。', '');
  }
  L.push(
    '## 三個切換（每個畫面各一張）',
    '',
    '| 畫面 | 列 | 尺寸 | 文字 130% | 英文 +40% | 減少動態 |',
    '| --- | --- | --- | --- | --- | --- |'
  );
  for (const sz of SIZES)
    for (const [scr, id] of Object.entries(TOG)) {
      const g = t => res.toggles[`${scr}|${t}|${sz}`];
      L.push(`| ${scr} | ${id} | ${sz} | ${cell(g('fs'))} | ${cell(g('en'))} | ${cell(g('rm'))} |`);
    }
  L.push('', '截圖：`toggles/<尺寸>/<列>_<fs|en|rm>.png`。', '');
  L.push(
    '## 錄影 V1–V9（60 fps 逐幀，兩尺寸，一般＋減少動態）',
    '',
    '| V | 尺寸 | 模式 | 幀 | 檔案 | 時間檢查 |',
    '| --- | --- | --- | --- | --- | --- |'
  );
  for (const [k, v] of Object.entries(res.videos)) {
    const [V, sz, m] = k.split('|');
    L.push(
      `| ${V} | ${sz} | ${m === 'rm' ? '減少動態' : '一般'} | ${v.frames} | \`${v.file}\` | ${v.R.join('<br>')} |`
    );
  }
  L.push(
    '',
    'V1（T1 live strip）、V8（鍛造揭曉、保底 100%、F4 120 ms 震）清單原寫「屬 D2」，這次照製作人指示（方案 6a）提前做。',
    ''
  );
  L.push(
    '## demo 未驗，進遊戲量',
    '',
    'hit-stop（暴擊 5 幀、菁英 6 幀、王倒下 160 ms）、畫面震動（王倒下 6 px、F4 120 ms）、輸入延遲（≤ 100／50／50 ms）、預警時長（一般 ≥ 300、大招 ≥ 600 ms）：demo 沒量、沒為它們改判定，等對應 B 批進遊戲錄影量。另：心跳聲、短音、按鈕聲 demo 沒有聲音。',
    ''
  );
  if (res.errs && res.errs.length) L.push('## 頁面錯誤', '', ...res.errs.map(e => '- ' + e), '');
  fs.writeFileSync(path.join(OUT, 'results.md'), L.join('\n'));
}

/* ---------- 主程式 ---------- */
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const res = fs.existsSync(path.join(OUT, 'results.json'))
    ? JSON.parse(fs.readFileSync(path.join(OUT, 'results.json'), 'utf8'))
    : { shots: {}, toggles: {}, videos: {} };
  const page = async size => {
    const [w, h] = size.split('x').map(Number);
    const ctx = await b.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 1,
      hasTouch: size.startsWith('390')
    });
    const p = await ctx.newPage();
    p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message));
    return p;
  };
  const open = async (p, q) => {
    await p.goto(URL + '?bare=1&cap=1&' + new URLSearchParams(q));
    await p.waitForFunction(() => window.__ready, null, { timeout: 15000 });
  };
  if (MODE === 'all' || MODE === 'shots') {
    for (const size of SIZES) {
      const port = size.startsWith('390');
      const p = await page(size);
      await open(p, { size });
      const rows = await p.evaluate(() => demo.ROWS());
      fs.mkdirSync(path.join(OUT, 'shots', size), { recursive: true });
      for (const r of rows) {
        if ((r.size === 'desk' && port) || (r.size && r.size !== 'desk' && !port)) {
          res.shots[r.id] = Object.assign(res.shots[r.id] || {}, { [size]: { na: 1 } });
          continue;
        }
        const sz = r.size && r.size !== 'desk' ? r.size : size;
        await p.setViewportSize({ width: +sz.split('x')[0], height: +sz.split('x')[1] });
        await open(p, { size: sz, row: r.id, save: r.save || 'mid' });
        await p.evaluate(n => demo.step(n), r.steps || 20);
        const m = await p.evaluate(measure, !!port);
        await p.screenshot({ path: path.join(OUT, 'shots', size, r.id + '.png') });
        if (r.id === 'S14') {
          await p.setViewportSize({ width: 1280, height: 800 });
          await open(p, { size: '1280x800', row: 'S14', save: 'mid' });
          await p.evaluate(() => demo.step(20));
          const m2 = await p.evaluate(measure, false);
          await p.screenshot({ path: path.join(OUT, 'shots', size, 'S14_1280x800.png') });
          m.F.push(...m2.F.map(x => '1280×800×1.25 ' + x));
        }
        if (['H14', 'H15'].includes(r.id)) m.vign = await p.evaluate(vignette);
        if (r.id === 'H16') m.palette = await p.evaluate(palette);
        res.shots[r.id] = Object.assign(res.shots[r.id] || {}, { [size]: { size: sz, save: r.save || 'mid', ...m } });
        console.log(`${m.F.length ? '❌' : '✅'} ${size} ${r.id} ${m.F.slice(0, 3).join('；')}`);
      }
      /* 審查補拍 */
      fs.mkdirSync(path.join(OUT, 'extra', size), { recursive: true });
      res.extra = res.extra || {};
      for (const [nm, row, save, js, steps, only, trans] of EXTRA) {
        if (only && only !== size && !(only.startsWith('390') && port)) continue;
        const sz = only || size;
        await p.setViewportSize({ width: +sz.split('x')[0], height: +sz.split('x')[1] });
        await open(p, { size: sz, row, save });
        if (js) await p.evaluate(`(() => { const S = demo.S; ${js}; demo.build(); })()`);
        await p.evaluate(n => demo.step(n), steps);
        const m = await p.evaluate(measure, !!port);
        /* 抽屜滑入中途那一格：抽屜照規格蓋著 HUD（滑完那一格才改戰場高），改列備註 */
        if (trans)
          m.INFO.push(...m.F.filter(x => x.startsWith('面板蓋到')).map(x => '滑入中 ' + x)),
            (m.F = m.F.filter(x => !x.startsWith('面板蓋到')));
        await p.screenshot({ path: path.join(OUT, 'extra', size, nm + '.png') });
        res.extra[`${nm}|${size}`] = { row, save, size: sz, ...m };
        console.log(`${m.F.length ? '❌' : '✅'} ${size} 補拍 ${nm} ${m.F.slice(0, 3).join('；')}`);
      }
      await p.setViewportSize({ width: +size.split('x')[0], height: +size.split('x')[1] });
      /* 三個切換 */
      fs.mkdirSync(path.join(OUT, 'toggles', size), { recursive: true });
      await p.setViewportSize({ width: +size.split('x')[0], height: +size.split('x')[1] });
      for (const [scr, id] of Object.entries(TOG))
        for (const t of ['fs', 'en', 'rm']) {
          const r = rows.find(x => x.id === id);
          await open(p, { size, row: id, save: r.save || 'mid', [t]: 1 });
          await p.evaluate(n => demo.step(n), r.steps || 20);
          const m = await p.evaluate(measure, !!port);
          await p.screenshot({ path: path.join(OUT, 'toggles', size, `${id}_${t}.png`) });
          res.toggles[`${scr}|${t}|${size}`] = { id, ...m };
          console.log(`${m.F.length ? '❌' : '✅'} ${size} ${scr} ${t} ${m.F.slice(0, 3).join('；')}`);
        }
      if (p.errs.length) console.log('❌ 頁面錯誤', p.errs.join('；'));
      res.errs = (res.errs || []).concat(p.errs);
      await p.context().close();
    }
  }
  if (MODE === 'all' || MODE === 'videos' || /^V\d\w?$/.test(MODE)) {
    fs.mkdirSync(path.join(OUT, 'videos'), { recursive: true });
    for (const size of SIZES) {
      const p = await page(size);
      await open(p, { size });
      const scn = await p.evaluate(() => demo.SCN());
      for (const [V, s] of Object.entries(scn)) {
        if (/^V\d\w?$/.test(MODE) && MODE !== V) continue;
        for (const rm of [0, 1]) {
          await open(p, { size, scn: V, ...(rm ? { rm: 1 } : {}) });
          const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'd1v-'));
          const P = [],
            n = Math.ceil(s.dur / FR);
          for (let i = 0; i < n; i++) {
            await p.evaluate(() => demo.step(1));
            P.push(await p.evaluate(probe));
            await p.screenshot({
              path: path.join(dir, String(i).padStart(5, '0') + '.jpg'),
              type: 'jpeg',
              quality: 85
            });
          }
          const L = await p.evaluate(() => demo.LOG.slice());
          const out = path.join(OUT, 'videos', `${V}_${size}_${rm ? 'rm' : '一般'}.mp4`);
          execFileSync('ffmpeg', [
            '-y',
            '-loglevel',
            'error',
            '-framerate',
            '60',
            '-i',
            path.join(dir, '%05d.jpg'),
            '-c:v',
            'libx264',
            '-preset',
            'veryfast',
            '-crf',
            '30',
            '-pix_fmt',
            'yuv420p',
            '-vf',
            'pad=ceil(iw/2)*2:ceil(ih/2)*2',
            out
          ]);
          fs.rmSync(dir, { recursive: true });
          const R = timing(V, P, L, rm);
          res.videos[`${V}|${size}|${rm ? 'rm' : '一般'}`] = { frames: n, file: path.relative(OUT, out), R };
          console.log(
            `${R.some(x => x.startsWith('❌')) ? '❌' : '✅'} ${V} ${size} ${rm ? '減少動態' : '一般'} ${n} 幀\n   ${R.join('\n   ')}`
          );
        }
      }
      await p.context().close();
    }
  }
  {
    const p = await page('1280x720');
    await open(p, { size: '1280x720' });
    res.rows = Object.fromEntries((await p.evaluate(() => demo.ROWS())).map(r => [r.id, r]));
    await p.context().close();
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  report(res);
  const bad =
    [
      ...Object.values(res.shots).flatMap(x => Object.values(x)),
      ...Object.values(res.toggles),
      ...Object.values(res.extra || {})
    ].some(x => x.F && x.F.length) || Object.values(res.videos).some(v => v.R.some(x => x.startsWith('❌')));
  process.exit(bad ? 1 : 0);
})();
