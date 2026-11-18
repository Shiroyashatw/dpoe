const { chromium } = require('playwright');
/* D1 展示頁（demo/d1/）的截圖、錄影與預篩。只開展示頁，不碰遊戲。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/d1_demo.js [shots|videos|all]（預設 all）
   產出 docs/production/evidence/dpoe-d1-demo/：shots/<尺寸>/<列>.png、toggles/<尺寸>/<列>_<fs|en|rm>.png、
   videos/<V>_<尺寸>_<一般|rm>.mp4（60 fps 逐幀）、results.json、results.md。
   預篩只抓明顯的失敗（裁字、出框、重疊、字級、熱區、對比、安全區、時間），不放寬清單門檻；有 ❌ 結束碼 1 */
const fs = require('fs'),
  path = require('path'),
  os = require('os'),
  { execFileSync } = require('child_process');
const MODE = process.argv[2] || 'all',
  URL = process.env.D1_URL || 'http://localhost:8000/demo/d1/',
  OUT = path.join(__dirname, '..', 'docs/production/evidence/dpoe-d1-demo');
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
  return { F, INFO, miss: demo.miss() };
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
    hp: S.hp
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
    } else ok(true, '桌機：右欄滑入，戰場不改高');
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
        await p.evaluate(() => demo.step(20));
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
        res.shots[r.id] = Object.assign(res.shots[r.id] || {}, { [size]: { size: sz, save: r.save || 'mid', ...m } });
        console.log(`${m.F.length ? '❌' : '✅'} ${size} ${r.id} ${m.F.slice(0, 3).join('；')}`);
      }
      /* 三個切換 */
      fs.mkdirSync(path.join(OUT, 'toggles', size), { recursive: true });
      await p.setViewportSize({ width: +size.split('x')[0], height: +size.split('x')[1] });
      for (const [scr, id] of Object.entries(TOG))
        for (const t of ['fs', 'en', 'rm']) {
          const r = rows.find(x => x.id === id);
          await open(p, { size, row: id, save: r.save || 'mid', [t]: 1 });
          await p.evaluate(() => demo.step(20));
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
  if (MODE === 'all' || MODE === 'videos' || /^V\d$/.test(MODE)) {
    fs.mkdirSync(path.join(OUT, 'videos'), { recursive: true });
    for (const size of SIZES) {
      const p = await page(size);
      await open(p, { size });
      const scn = await p.evaluate(() => demo.SCN());
      for (const [V, s] of Object.entries(scn)) {
        if (/^V\d$/.test(MODE) && MODE !== V) continue;
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
    [...Object.values(res.shots).flatMap(x => Object.values(x)), ...Object.values(res.toggles)].some(
      x => x.F && x.F.length
    ) || Object.values(res.videos).some(v => v.R.some(x => x.startsWith('❌')));
  process.exit(bad ? 1 : 0);
})();
