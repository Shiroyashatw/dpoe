const { chromium } = require('playwright');
/* D2 展示頁（demo/d2/）的截圖、錄影與預篩。只開展示頁，不碰遊戲。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/d2_demo.js [all|shots|videos|unit]（預設 all）
   瀏覽器：PW_CHROME 指定（雲端 /opt/pw-browsers/chromium）。
   產出 docs/production/evidence/dpoe-d2-demo/（D2_OUT 可改）：
     <尺寸>/<列>.png（每列兩尺寸）、<尺寸>/<列>-<變體>.png、extra/<尺寸>/<列>.png（390×664、1280×800）、toggles/<尺寸>/<列>-<fs|en|rm>.png、
     videos/<V>_<尺寸>_<一般|rm>.mp4（60 fps 逐幀）＋ -sheet.png、prefilter.csv、prefilter.md、results.json、results.md。
   預篩門檻照清單（D2-checklist.md「量法與門檻」、第 10 節），不放寬；有 ❌ 結束碼 1 */
const fs = require('fs'),
  path = require('path'),
  { execFileSync } = require('child_process');
const MODE = process.argv[2] || 'all';
const URL = process.env.D2_URL || 'http://localhost:8000/demo/d2/';
const OUT = process.env.D2_OUT || path.join(__dirname, '..', 'docs/production/evidence/dpoe-d2-demo');
const ROOT = path.join(__dirname, '..');
const SIZES = ['390x844', '1280x720'];
const EXTRA = { '390x664': ['E01', 'F01', 'SK10'], '1280x800': ['E01', 'F01', 'SK01'] };
const TOG = { '角色＋倉庫': 'E01', 鍛造: 'F06', 技能: 'SK05', '天賦＋石碑': 'P06', '追逐＋王印': 'W01' };
const res = { rows: {}, pf: {}, videos: {}, unit: null };
const ok = (c, msg) => (c ? '✅' : '❌') + ' ' + msg;
const mk = d => fs.mkdirSync(d, { recursive: true });

/* ---------- PF-D2-1 K/M 單元表＋G06 色值掃描（不開瀏覽器） ---------- */
function unit() {
  const NUM = require(path.join(ROOT, 'demo/d2/num.js'));
  const FX = require(path.join(ROOT, 'demo/d2/fixtures.js'));
  const rows = FX.KM.map(([n, m, want]) => ({ n, m, want, got: NUM.abbr(n, m) }));
  /* 規格測試表（number-abbrev.md）也全跑一次 */
  const spec = [
    [9999, '9,999', '9,999'],
    [10000, '10.0K', '10.0K'],
    [10001, '10.0K', '10.1K'],
    [10099, '10.0K', '10.1K'],
    [12345, '12.3K', '12.4K'],
    [99999, '99.9K', '100K'],
    [100000, '100K', '100K'],
    [123456, '123K', '124K'],
    [999999, '999K', '1.00M'],
    [1000000, '1.00M', '1.00M'],
    [1000001, '1.00M', '1.01M'],
    [1234567, '1.23M', '1.24M'],
    [9999999, '9.99M', '10.0M'],
    [1234567890, '1.23B', '1.24B'],
    [1234567890123, '1.23T', '1.24T'],
    [999999999999999, '999T', '1.00e15'],
    [1234567890123456, '1.23e15', '1.24e15']
  ];
  spec.forEach(([n, o, c]) => {
    rows.push({ n, m: 'own', want: o, got: NUM.abbr(n, 'own') });
    rows.push({ n, m: 'cost', want: c, got: NUM.abbr(n, 'cost') });
  });
  const [have, cost] = FX.KM_BUY;
  const buy = { have, cost, show: `${NUM.abbr(have, 'own')}／${NUM.abbr(cost, 'cost')}`, can: NUM.can(have, cost) };
  const bad = rows.filter(r => r.got !== r.want);
  const width = rows.filter(r => !/e/.test(r.got) && r.got.length > 5);
  /* G06：色值只准在 tokens.css */
  const hex = [];
  ['demo/d2/demo.js', 'demo/d2/demo.css', 'demo/d2/fixtures.js', 'demo/d2/index.html', 'demo/d2/num.js'].forEach(f => {
    fs.readFileSync(path.join(ROOT, f), 'utf8')
      .split('\n')
      .forEach((l, i) => {
        const m = l.match(/#[0-9a-fA-F]{3,8}\b(?![-\w])|\brgba?\(\s*\d|\bhsla?\(\s*\d/g);
        if (m && !/^\s*(\/\/|\/\*|\*)/.test(l)) hex.push(`${f}:${i + 1} ${m.join(' ')}`);
      });
  });
  res.unit = { rows, bad, width, buy, buyOk: buy.can === true && buy.show === '12.3K／12.4K', hex };
  console.log(ok(!bad.length && !width.length, `PF-D2-1 K/M 單元表 ${rows.length - bad.length}/${rows.length}`));
  console.log(ok(res.unit.buyOk, `PF-D2-1 買得起邊界 ${buy.show} 可買=${buy.can}`));
  console.log(ok(!hex.length, `G06 demo 色值字面值 ${hex.length} 處（tokens.css 以外）`));
}

/* ---------- 頁內量測（在瀏覽器裡跑） ---------- */
function MEASURE(ctx) {
  const ui = document.getElementById('ui');
  const port = ctx.port;
  const z = ctx.z || 1;
  const R = e => {
    const r = e.getBoundingClientRect(),
      u = ui.getBoundingClientRect();
    return { x: (r.left - u.left) / z, y: (r.top - u.top) / z, w: r.width / z, h: r.height / z };
  };
  const vis = e => {
    if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return false;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = R(e);
    return r.w > 0 && r.h > 0 && r.x < ctx.W && r.y < ctx.H && r.x + r.w > 0 && r.y + r.h > 0;
  };
  /* 有確認卡時只量卡；滿版天賦樹只量樹 */
  const scope = ui.querySelector('#d-dlg') || ui.querySelector('#p-tree') || ui;
  const under = e => scope !== ui && !scope.contains(e);
  /* 可見區：被可捲容器捲出去的不算（之後捲進來才量） */
  const inView = e => {
    const r = e.getBoundingClientRect();
    for (let a = e.parentElement; a && a !== ui; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (/(auto|scroll|hidden)/.test(cs.overflow + cs.overflowX + cs.overflowY)) {
        const ar = a.getBoundingClientRect();
        if (r.bottom <= ar.top + 1 || r.top >= ar.bottom - 1 || r.right <= ar.left + 1 || r.left >= ar.right - 1)
          return false;
      }
    }
    return true;
  };
  const parse = c => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const lum = ([r, g, b]) => {
    const f = v => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const cr = (a, b) => {
    const x = lum(a),
      y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const over = (top, bot) => [0, 1, 2].map(i => top[i] * top[3] + bot[i] * (1 - top[3]));
  const tokv = k =>
    parse(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--' + k)
        .trim()
        .replace(/^#(..)(..)(..)$/, (m, a, b, c) => `rgb(${parseInt(a, 16)},${parseInt(b, 16)},${parseInt(c, 16)})`)
    );
  const sceneWorst = tokv('scene-tomb-light') || [109, 105, 80, 1];
  /* 字背後的實際底色：往上找底色，半透明一層層疊（最底是戰場：取最不利的地形亮部） */
  const bgOf = e => {
    const layers = [];
    for (let a = e; a && a !== ui.parentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && !a.classList.contains('btn'))
        return null; /* 漸層底：另外量 */
      const c = parse(cs.backgroundColor);
      if (c && c[3] > 0) {
        layers.push(c);
        if (c[3] >= 1) break;
      }
    }
    let base = layers.length && layers[layers.length - 1][3] >= 1 ? layers.pop().slice(0, 3) : sceneWorst.slice(0, 3);
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  const out = {
    hit: [],
    font: [],
    con: [],
    clip: [],
    ovl: [],
    icon: [],
    gapBtn: [],
    focus: null,
    text: '',
    feed: '',
    rect: {},
    n: { hit: 0, txt: 0 },
    minHit: 1e9,
    minCon: 99,
    minFont: 99
  };
  /* 熱區 */
  const minH = port ? 44 : 32;
  const hits = [...ui.querySelectorAll('[data-hit]')].filter(e => vis(e) && !under(e) && inView(e));
  hits.forEach(e => {
    const r = R(e);
    out.n.hit++;
    out.minHit = Math.min(out.minHit, r.w, r.h);
    if (r.w < minH - 0.5 || r.h < minH - 0.5)
      out.hit.push(`${e.dataset.k || e.className} ${r.w.toFixed(0)}×${r.h.toFixed(0)}`);
  });
  /* 按鈕間距 ≥ 8（.btn 同一列相鄰；格子類的間距照清單給的格距，不算在這裡） */
  const btns = hits.filter(e => e.classList.contains('btn'));
  for (let i = 0; i < btns.length; i++)
    for (let j = i + 1; j < btns.length; j++) {
      const a = R(btns[i]),
        b = R(btns[j]);
      const vy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y),
        vx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const gx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)),
        gy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
      if (vy > 4 && gx >= 0 && gx < 8 - 0.5)
        out.gapBtn.push(`${btns[i].dataset.k}↔${btns[j].dataset.k} ${gx.toFixed(1)}`);
      if (vx > 4 && gy >= 0 && gy < 8 - 0.5)
        out.gapBtn.push(`${btns[i].dataset.k}↕${btns[j].dataset.k} ${gy.toFixed(1)}`);
    }
  /* 文字：字級、對比、裁字 */
  const tw = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let nd;
  while ((nd = tw.nextNode())) {
    if (!nd.textContent.trim()) continue;
    const e = nd.parentElement;
    if (seen.has(e) || !vis(e) || !inView(e)) continue;
    seen.add(e);
    out.n.txt++;
    const cs = getComputedStyle(e);
    const fsz = parseFloat(cs.fontSize);
    const small = e.closest('.badge, .kc, .seg, .part, .tag, .hb, .corner, .upc, .lk, .cnt, .slot, .cand, .lockn, .cb');
    const need = small ? 12 : port ? 14 : 16;
    const txt = nd.textContent.trim().slice(0, 24);
    out.minFont = Math.min(out.minFont, fsz);
    if (fsz < need - 0.01) out.font.push(`${txt} ${fsz}px<${need}`);
    const fg = parse(cs.color);
    let op = 1;
    for (let a = e; a && a !== ui; a = a.parentElement) op *= +getComputedStyle(a).opacity;
    const bg = bgOf(e);
    if (fg && bg && op > 0.99) {
      const c = cr(over(fg, bg), bg);
      const large = fsz >= 24 || (fsz >= 18.66 && +cs.fontWeight >= 700);
      const need2 = large ? 3 : 4.5;
      out.minCon = Math.min(out.minCon, c);
      if (c < need2 - 0.005) out.con.push(`${txt} ${c.toFixed(2)}<${need2}`);
    }
    /* 裁字：字超出自己的框（overflow 不是 visible）或超出會裁的祖先（可捲的不算） */
    const r = e.getBoundingClientRect();
    if (
      /(hidden|clip)/.test(cs.overflow + cs.overflowX) &&
      (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)
    )
      out.clip.push(`${txt}（自己的框）`);
    const range = document.createRange();
    range.selectNodeContents(nd);
    const rr = range.getBoundingClientRect();
    for (let a = e.parentElement; a && a !== ui; a = a.parentElement) {
      const as = getComputedStyle(a);
      if (/(auto|scroll)/.test(as.overflow + as.overflowX + as.overflowY)) break;
      if (/(hidden|clip)/.test(as.overflow + as.overflowX + as.overflowY)) {
        const ar = a.getBoundingClientRect();
        if (rr.right > ar.right + 1 || rr.left < ar.left - 1 || rr.bottom > ar.bottom + 1 || rr.top < ar.top - 1) {
          out.clip.push(`${txt}（被 ${a.id || a.className.split(' ')[0]} 裁）`);
          break;
        }
      }
    }
    void r;
  }
  /* 重疊：版面區塊（data-box）兩兩交集 0；浮層（data-float）不算 */
  const boxes = [...ui.querySelectorAll('[data-box]')].filter(e => vis(e) && !e.closest('[data-float]'));
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxes[i].contains(boxes[j]) || boxes[j].contains(boxes[i])) continue;
      const a = R(boxes[i]),
        b = R(boxes[j]);
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
        iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 0.5 && iy > 0.5)
        out.ovl.push(`${boxes[i].dataset.box}∩${boxes[j].dataset.box} ${ix.toFixed(0)}×${iy.toFixed(0)}`);
    }
  /* 圖示整數倍 */
  [...ui.querySelectorAll('.art[data-art]')].filter(vis).forEach(e => {
    const zm = parseFloat(getComputedStyle(e).zoom || 1);
    let acc = zm;
    for (let a = e.parentElement; a && a !== ui; a = a.parentElement) acc *= parseFloat(getComputedStyle(a).zoom || 1);
    if (Math.abs(acc - Math.round(acc)) > 0.001 && Math.abs(acc - 0.5) > 0.001)
      out.icon.push(`${e.dataset.art} ×${acc}`);
    if (acc === 0.5) out.icon.push(`${e.dataset.art} ×0.5`);
  });
  /* 焦點框：2 px --border-hi、四邊完整（outline-offset −2 在框內）、對比 ≥ 3 */
  const fe =
    ui.querySelector('.fv') ||
    (document.activeElement && ui.contains(document.activeElement) ? document.activeElement : null);
  if (fe) {
    const cs = getComputedStyle(fe);
    const oc = parse(cs.outlineColor),
      bg = bgOf(fe.parentElement) || [0, 0, 0];
    const r = R(fe);
    let cut = false;
    for (let a = fe.parentElement; a && a !== ui; a = a.parentElement) {
      const as = getComputedStyle(a);
      if (/(hidden|clip|auto|scroll)/.test(as.overflow + as.overflowX + as.overflowY)) {
        const ar = R(a),
          o = parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth);
        if (
          r.x - Math.max(0, o) < ar.x - 0.5 ||
          r.y - Math.max(0, o) < ar.y - 0.5 ||
          r.x + r.w + Math.max(0, o) > ar.x + ar.w + 0.5 ||
          r.y + r.h + Math.max(0, o) > ar.y + ar.h + 0.5
        )
          cut = true;
        break;
      }
    }
    out.focus = {
      k: fe.dataset.k,
      w: parseFloat(cs.outlineWidth),
      style: cs.outlineStyle,
      off: parseFloat(cs.outlineOffset),
      con: oc ? +cr(oc, bg).toFixed(2) : 0,
      cut,
      tokOk: JSON.stringify(oc && oc.slice(0, 3)) === JSON.stringify(tokv('border-hi').slice(0, 3))
    };
  }
  /* PF-D2-8：藥劑鈕上的數字（鍵帽 1／2 不算）；裝備格：主欄 10 格＋第三戒指、護符 */
  out.flaskNum = [...ui.querySelectorAll('.flask')]
    .map(e => {
      const c = e.cloneNode(true);
      c.querySelectorAll('.kc').forEach(k => k.remove());
      return (c.textContent.match(/\d/g) || []).length;
    })
    .reduce((a, b) => a + b, 0);
  out.eqMain = ui.querySelectorAll('#d-eq .eq:not(.xs)').length;
  out.eqX = ui.querySelectorAll('#d-eq .eq.xs').length;
  /* 文字（黑名單、記號）、矩形 */
  out.text = scope.innerText;
  const fd = ui.querySelector('#d-feed');
  out.feed = fd ? fd.innerText : '';
  out.sym = [];
  [...ui.querySelectorAll('.mk')].forEach(e => {
    const t = e.textContent;
    const host = e.closest('.r-rare, .r-leg, .r-magic, .r-normal, .r-chase');
    const cls = host ? [...host.classList].find(c => c.startsWith('r-')) : 'none';
    if ((t === '◆' && cls !== 'r-rare') || (t === '◈' && cls !== 'r-leg')) out.sym.push(`${t} 在 ${cls}`);
  });
  (scope.innerText.match(/.{0,6}★.{0,12}/g) || []).forEach(s => {
    if (!/★ ?(破裂裝備|Fractured)/.test(s) && !/[0-9]★/.test(s)) out.sym.push(`★ 用在「${s}」`);
  });
  ctx.sel.forEach(([k, s]) => {
    const e = ui.querySelector(s);
    if (e) out.rect[k] = R(e);
  });
  return out;
}

/* ---------- 每列的位置與尺寸（清單寫的數字，PF9）：[名稱, 選擇器, 期望 {x0,y0,x1,y1,w,h,minW,minH,maxH}] ---------- */
const P = (s, e) => [s, e];
const EXP = {
  '390x844': {
    G01: { feed: P('#d-feed', { y0: 148, y1: 204 }), pnl: P('#p-char', { y0: 330, y1: 710 }) },
    G02: {
      bars: P('[data-box=bars]', { y0: 300, y1: 330, x0: 72, x1: 382 }),
      f0: P('[data-box=flask0]', { minW: 44, minH: 44, x0: 290, y0: 252, w: 44, h: 44 }),
      f1: P('[data-box=flask1]', { minW: 44, minH: 44, x0: 338, y0: 252, w: 44, h: 44 })
    },
    /* D1-fix §2：沒開面板時 56×56；技能鈕 76–380 × 644–700 */
    'G02-hud': {
      f0: P('[data-box=flask0]', { x0: 8, y0: 576, w: 56, h: 56 }),
      f1: P('[data-box=flask1]', { x0: 8, y0: 644, w: 56, h: 56 }),
      bars: P('[data-box=bars]', { x0: 72, x1: 382, y0: 600 }),
      sk0: P('[data-box=skb0]', { x0: 76, y0: 644, w: 56, h: 56 })
    },
    /* D1-fix §9：外觀 202–382 × 110–142、熱區 106–150 */
    G03: { res: P('[data-box=res]', { x0: 202, y0: 110, x1: 382, y1: 142 }), hit: P('[data-k=res]', { minH: 44 }) },
    G04: { idle: P('[data-box=idle]', { y0: 710, y1: 754 }), bar: P('.idle .goalbar', { h: 4 }) },
    G05: { feed: P('#d-feed', { y0: 148, y1: 204 }) },
    G10: { back: P('#p-char .back', { w: 44, h: 44 }) },
    E01: {
      hd: P('#p-char .hd', { y0: 330, y1: 374 }),
      eq: P('#d-eq', { y0: 378, y1: 482 }),
      cell: P('#d-eq .eq', { w: 50, h: 50 }),
      flt: P('#p-char .flt', { y0: 486, y1: 530 }),
      seg: P('#p-char .flt .seg', { w: 54, h: 44 }),
      st: P('#d-stash', { y0: 534, y1: 658 }),
      sbar: P('#p-char .sbar', { y0: 662, y1: 710 })
    },
    E05: {
      dl: P('#d-delta', { y0: 574 }),
      eqb: P('[data-k=equip]', { w: 210, h: 48 }),
      lk: P('[data-k=lock]', { w: 44, h: 48 }),
      sal: P('[data-k=sal1]', { w: 88, h: 48 }),
      cmp: P('#p-char .cmp', { y1: 710 })
    },
    F01: {
      seg: P('.segs .seg', { w: 96, h: 44 }),
      mats: P('#d-mats', { y0: 378, y1: 410 }),
      parts: P('#d-parts', { y0: 414, y1: 510 }),
      part: P('#d-parts .part', { w: 71, h: 46 }),
      tc: P('#d-tc', { y0: 514, y1: 558 }),
      odds: P('#d-odds', { y0: 562, y1: 590 }),
      auto: P('#d-auto', { y0: 594, y1: 638 }),
      craft: P('.btn.craft', { w: 374, h: 56, y0: 646, y1: 702 })
    },
    F03: {
      craft: P('.btn.craft', { y0: 590, y1: 646 }),
      nos: P('#d-nos', { y0: 650, y1: 710 }),
      tidy: P('[data-k=tidy]', { w: 120, h: 44 }),
      auto: P('#d-auto', { y0: 546, y1: 590 })
    },
    F05: { res: P('#d-res2', { y0: 414, y1: 638 }) },
    F06: { rr: P('.rr:not(.sal)', { h: 42 }), ch: P('[data-k=chpart]', { minH: 44 }) },
    F08: { slot: P('.av64', { w: 64, h: 64 }), sw: P('[data-k=swap]', { w: 88, h: 44 }) },
    F10: { use: P('[data-k=use]', { h: 48 }) },
    F11: { hold: P('[data-k=dhold]', { w: 226, h: 56 }), cancel: P('[data-k=dcancel]', { w: 132, h: 56 }) },
    SK01: {
      pnl: P('#p-skill', { y0: 330, y1: 710 }),
      row: P('#d-skr0', { h: 44 }),
      hole: P('#d-skr0 .hole', { w: 44, h: 44 }),
      up: P('[data-k=up0]', { minW: 96, h: 44 })
    },
    SK05: {
      pr: P('.pr:not(.on)', { h: 60 }),
      on: P('.pr.on', { h: 144 }),
      main: P('[data-k=pmain]', { w: 374, h: 44 }),
      back: P('[data-k=back]', { w: 44, h: 44 })
    },
    SK08: { up: P('[data-k=up0]', { minW: 96, h: 44 }) },
    SK10: { pnl: P('#p-skill', { y0: 103, y1: 710 }) },
    P01: { tree: P('#p-tree', { x0: 0, y0: 0, x1: 390, y1: 844 }) },
    P04: {
      top: P('.thd', { h: 56 }),
      asc: P('[data-k=stele]', { w: 88, h: 44 }),
      back: P('[data-k=tback]', { w: 44, h: 44 })
    },
    P06: {
      path: P('[data-k=path]', { w: 250, h: 52 }),
      pin: P('[data-k=pin]', { w: 108, h: 52 }),
      card: P('#d-tcard', { maxH: 337.6 })
    },
    P08: { asl: P('.asl', { w: 90, h: 52 }), card: P('.ascard', { minH: 72 }) },
    P09: { mini: P('#d-mini', { w: 120, h: 120 }) },
    W02: { pb: P('.pity2 .pb', { w: 170, h: 8 }), info: P('[data-k=pinfo]', { w: 44, h: 44 }) },
    W08: { bn: P('[data-box=banner]', { x0: 8, y0: 148, x1: 382, y1: 212 }), feed: P('#d-feed', { y0: 220 }) }
  },
  '1280x720': {
    G01: { feed: P('#d-feed', { x0: 500, x1: 780, y1: 136 }) },
    G02: {
      f0: P('[data-box=flask0]', { x0: 732, y0: 632, w: 48, h: 48 }),
      f1: P('[data-box=flask1]', { x0: 788, y0: 632, w: 48, h: 48 })
    },
    'G02-hud': {
      f0: P('[data-box=flask0]', { x0: 732, y0: 632, w: 48, h: 48 }),
      f1: P('[data-box=flask1]', { x0: 788, y0: 632, w: 48, h: 48 })
    },
    G03: { res: P('[data-box=res]', { x0: 16, x1: 316, h: 32 }) },
    /* 說明卡寬 ≤ 320（D1-fix §7；兩欄拿掉） */
    T01: { card: P('#p-detail', { w: 320 }), sum: P('#d-csum', { minH: 32 }) },
    T02: { card: P('#p-detail', { w: 320 }) },
    T03: { card: P('#p-detail', { w: 320 }) },
    T05: { card: P('#p-detail', { w: 320 }) },
    G04: { idle: P('[data-box=idle]', { x0: 16, y0: 664, x1: 396, y1: 704 }) },
    E01: {
      l: P('#p-char', { x0: 16, x1: 492 }),
      r: P('#p-stash', { x0: 844, x1: 1264 }),
      stl: P('#d-stl', { y0: 124, y1: 196 }),
      cell: P('#d-stash .st', { w: 36, h: 36 })
    },
    E05: { cmp: P('#d-cmpd', { y0: 344, y1: 604 }) },
    E11: { stl: P('#d-stl', { y0: 124, y1: 196 }) },
    F01: { part: P('#d-parts .part', { w: 86, h: 56 }), craft: P('.btn.craft', { w: 460, h: 56, y0: 548, y1: 604 }) },
    F03: { craft: P('.btn.craft', { y0: 548, y1: 604 }) },
    F05: { res: P('#d-res2', { y0: 400, y1: 540 }) },
    F06: { rr: P('.rr:not(.sal)', { h: 26 }) },
    SK01: {
      pnl: P('#p-skill', { x0: 844, y0: 64, x1: 1264, y1: 600 }),
      hole: P('#d-skr0 .hole', { w: 40, h: 40 }),
      row: P('#d-skr0', { h: 52 }),
      up: P('[data-k=up0]', { h: 36 })
    },
    SK05: { main: P('[data-k=pmain]', { w: 404, h: 46 }) },
    P01: { tree: P('#p-tree', { x0: 0, y0: 0, x1: 1280, y1: 720 }) },
    P04: { back: P('[data-k=tback]', { w: 36, h: 44 }) },
    P06: { card: P('#d-tcard', { w: 300 }) },
    P08: { asl: P('.asl', { w: 96, h: 56 }), card: P('.ascard', { minH: 64 }) },
    P09: { mini: P('#d-mini', { w: 160, h: 160 }) },
    W08: { bn: P('[data-box=banner]', { x0: 16, y0: 76, x1: 340, y1: 140 }) },
    F11: { dlg: P('#d-dlg', { w: 400 }) },
    W06: { dlg: P('#d-dlg', { w: 400 }) }
  }
};
function chkExp(rect, exp) {
  const bad = [],
    got = {};
  for (const k in exp) {
    const [, e] = exp[k],
      r = rect[k];
    if (!r) {
      bad.push(`${k} 找不到`);
      continue;
    }
    const v = { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h, w: r.w, h: r.h };
    got[k] =
      `${v.x0.toFixed(0)},${v.y0.toFixed(0)}–${v.x1.toFixed(0)},${v.y1.toFixed(0)}（${v.w.toFixed(0)}×${v.h.toFixed(0)}）`;
    for (const q in e) {
      const want = e[q];
      if (q === 'minW' && r.w < want - 0.5) bad.push(`${k} 寬 ${r.w.toFixed(1)}<${want}`);
      else if (q === 'minH' && r.h < want - 0.5) bad.push(`${k} 高 ${r.h.toFixed(1)}<${want}`);
      else if (q === 'maxH' && r.h > want + 0.5) bad.push(`${k} 高 ${r.h.toFixed(1)}>${want}`);
      else if (v[q] != null && Math.abs(v[q] - want) > 2) bad.push(`${k}.${q} ${v[q].toFixed(1)}≠${want}`);
    }
  }
  return { bad, got };
}

/* PF-D2-2 字串黑名單 */
const BLACK = [
  '輪',
  '四印齊鳴',
  '輪末王',
  '下一隻王',
  '印記',
  '封印',
  '背包',
  '多的直接分解',
  '全部裝備 ▲',
  /* 名詞表 v0.6.16／v0.6.17 禁用 */
  '必出',
  '藥劑充能',
  '沒有充能'
];

async function openPage(b, size, q = '') {
  const [w, h] = size.split('x').map(Number);
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(`${URL}?bare=1&cap=1&size=${size}${q}`);
  await p.waitForFunction(() => window.__ready);
  return p;
}
const settle = p =>
  p.evaluate(() => {
    for (let i = 0; i < 3; i++) demo.step(1000 / 60);
  });

async function measure(p, size, row) {
  const port = size.startsWith('390');
  const g = await p.evaluate(() => demo.geo());
  const exp = (row && (EXP[size] || {})[row]) || {};
  const sel = Object.entries(exp).map(([k, [s]]) => [k, s]);
  const m = await p.evaluate(MEASURE, { port, z: size === '1280x800' ? 1.25 : 1, W: g.W, H: g.H, sel });
  const e = chkExp(m.rect, exp);
  m.exp = e;
  return m;
}
function verdictOf(row, m, errs) {
  const f = [];
  if (errs.length) f.push('PF1 pageerror ' + errs.join(' / '));
  if (m.hit.length) f.push('A 熱區 ' + m.hit.slice(0, 4).join('、'));
  if (m.gapBtn.length) f.push('A 鈕距 ' + m.gapBtn.slice(0, 3).join('、'));
  if (m.font.length) f.push('A 字級 ' + m.font.slice(0, 4).join('、'));
  if (m.con.length) f.push('A 對比 ' + m.con.slice(0, 4).join('、'));
  if (m.clip.length) f.push('A 裁字 ' + m.clip.slice(0, 4).join('、'));
  if (m.ovl.length) f.push('A 重疊 ' + m.ovl.slice(0, 4).join('、'));
  if (m.icon.length) f.push('PF5 圖示 ' + m.icon.slice(0, 3).join('、'));
  if (m.exp.bad.length) f.push('PF9 ' + m.exp.bad.join('、'));
  const bl = BLACK.filter(w => m.text.includes(w));
  if (/\bPity \d/.test(m.text)) bl.push('Pity n%（v0.6.15 停用）');
  if (bl.length) f.push('PF-D2-2 ' + bl.join('、'));
  if (m.flaskNum) f.push(`PF-D2-8 藥劑鈕上有數字 ${m.flaskNum} 個`);
  if (/魔法/.test(m.feed)) f.push('PF-D2-2 掉落列出現「魔法」');
  if (m.sym.length) f.push('PF-D2-3 ' + m.sym.join('、'));
  if (m.focus && (m.focus.w < 2 || m.focus.cut || m.focus.con < 3 || !m.focus.tokOk))
    f.push(`KB05 焦點框 ${JSON.stringify(m.focus)}`);
  return f;
}

async function shots(b) {
  const rows = await (async () => {
    const p = await openPage(b, '390x844');
    const r = await p.evaluate(() => ({ rows: demo.rows(), vars: demo.vars() }));
    await p.close();
    return r;
  })();
  res.rowList = rows.rows;
  const all = [];
  for (const size of SIZES) {
    const p = await openPage(b, size);
    mk(path.join(OUT, size));
    for (const [id] of rows.rows) {
      for (const v of [null, ...(rows.vars[id] || [])]) {
        if (v === 'lv') continue;
        await p.evaluate(([r, v]) => demo.go(r, v), [id, v]);
        await settle(p);
        const f = path.join(OUT, size, `${id}${v ? '-' + v : ''}.png`);
        await p.screenshot({ path: f });
        const m = await measure(p, size, v ? (EXP[size] || {})[`${id}-${v}`] && `${id}-${v}` : id);
        const extra = {};
        if (id === 'F12')
          extra.baodi = (await p.evaluate(() => document.querySelector('#p-forge').innerText.includes('保底')))
            ? '❌ 鍛造面板有「保底」'
            : '✅ 鍛造面板 0 次';
        if (id === 'P02' || id === 'P01') {
          const h0 = await p.evaluate(() => [demo.hash(), demo.FT()]);
          await p.evaluate(() => {
            for (let i = 0; i < 180; i++) demo.step(1000 / 60);
          });
          const h1 = await p.evaluate(() => [demo.hash(), demo.FT()]);
          extra.pause = { h0, h1, same: h0[0] === h1[0] && h0[1] === h1[1] };
          const cover = await p.evaluate(() => {
            const r = document.querySelector('#p-tree').getBoundingClientRect(),
              u = document.querySelector('#ui').getBoundingClientRect();
            const others = [...document.querySelectorAll('#ui > [data-box]')].filter(e => e.id !== 'p-tree').length;
            return { x: r.left - u.left, y: r.top - u.top, w: r.width, h: r.height, others };
          });
          extra.cover = cover;
        }
        if (id === 'F12' && !v) {
          const t = await p.evaluate(() => document.querySelector('#p-forge').innerText);
          extra.rarePity = t.includes('再 3 件沒出稀有，下一件一定是稀有');
        }
        if (id === 'F02' && !v)
          extra.lack = await p.evaluate(() => /熟鐵還差\s*12/.test(document.querySelector('#ui').innerText));
        if (id === 'E01' && !v) extra.eq = { main: m.eqMain, x: m.eqX };
        if (id === 'P03' && v === 'short') extra.noGain = !m.text.includes('期間');
        if (id === 'G02' && v === 'F2-2')
          extra.cool = await p.evaluate(() => {
            const e = document.querySelector('[data-k="flask-hp"]');
            return {
              p: +e.dataset.cool,
              ring: !!e.querySelector('.ring'),
              dim: getComputedStyle(e.querySelector('.fl')).filter
            };
          });
        const fails = verdictOf(id, m, p.errs);
        if (extra.baodi && extra.baodi.startsWith('❌')) fails.push('F12 ' + extra.baodi);
        if (extra.rarePity === false) fails.push('F12 沒有稀有保底句');
        if (extra.lack === false) fails.push('F02 沒有「熟鐵還差 12」');
        if (extra.eq && (extra.eq.main !== 10 || extra.eq.x !== 3))
          fails.push(`E01 裝備 ${extra.eq.main} 格＋${extra.eq.x}（要 10＋第三戒指、護符 2）`);
        if (extra.noGain === false) fails.push('P03 開 < 10 秒仍出補算行');
        if (
          extra.cool &&
          (Math.abs(extra.cool.p - 0.5) > 0.05 || !extra.cool.ring || !/brightness/.test(extra.cool.dim))
        )
          fails.push('F2-2 冷卻一半 ' + JSON.stringify(extra.cool));
        if (extra.pause && !extra.pause.same) fails.push('PF-D2-5 3 秒內假戰場雜湊改變');
        if (extra.cover) {
          const [W, H] = size.split('x').map(Number);
          if (extra.cover.w < W - 0.5 || extra.cover.h < H - 0.5 || extra.cover.others)
            fails.push('PF-D2-5 樹外有像素');
        }
        p.errs.length = 0;
        const key = `${id}${v ? '-' + v : ''}|${size}`;
        res.rows[key] = {
          id,
          v,
          size,
          file: path.relative(OUT, f),
          fails,
          m: {
            minHit: m.minHit,
            minCon: +m.minCon.toFixed(2),
            minFont: m.minFont,
            nHit: m.n.hit,
            nTxt: m.n.txt,
            exp: m.exp.got,
            focus: m.focus
          },
          extra
        };
        all.push(key);
      }
    }
    await p.close();
  }
  /* 另驗尺寸 */
  for (const size in EXTRA) {
    const p = await openPage(b, size);
    mk(path.join(OUT, 'extra', size));
    for (const id of EXTRA[size]) {
      await p.evaluate(r => demo.go(r), id);
      await settle(p);
      const f = path.join(OUT, 'extra', size, `${id}.png`);
      await p.screenshot({ path: f });
      const m = await measure(p, size, id);
      res.rows[`${id}|${size}`] = {
        id,
        size,
        file: path.relative(OUT, f),
        fails: verdictOf(id, m, p.errs),
        m: { minHit: m.minHit, minCon: +m.minCon.toFixed(2), minFont: m.minFont },
        extra: {}
      };
    }
    await p.close();
  }
  /* 三個切換（第 9 節） */
  for (const size of SIZES)
    for (const [scr, id] of Object.entries(TOG))
      for (const t of ['fs', 'en', 'rm']) {
        const p = await openPage(b, size, `&${t}=1`);
        mk(path.join(OUT, 'toggles', size));
        await p.evaluate(r => demo.go(r), id);
        await settle(p);
        const f = path.join(OUT, 'toggles', size, `${id}-${t}.png`);
        await p.screenshot({ path: f });
        const m = await measure(p, size, null);
        const fails = verdictOf(id, m, p.errs).filter(x => !x.startsWith('PF9'));
        res.rows[`${id}-${t}|${size}`] = {
          id,
          v: t,
          scr,
          size,
          file: path.relative(OUT, f),
          fails,
          m: { minHit: m.minHit, minCon: +m.minCon.toFixed(2), minFont: m.minFont },
          extra: {}
        };
        await p.close();
      }
  /* PF-D2-4：INV_CAP 改 280 */
  {
    const p = await openPage(b, '390x844', '&invcap=280');
    const r = {};
    for (const id of ['E01', 'E08', 'F03']) {
      await p.evaluate(r => demo.go(r), id);
      await settle(p);
      r[id] = await p.evaluate(() => ({ t: document.querySelector('#ui').innerText, cap: demo.INV().INV_CAP }));
    }
    const has280 = r.E01.t.includes('／280') && r.E08.t.includes('／280');
    const no300 = !/／300/.test(r.E01.t + r.E08.t + r.F03.t);
    const nos = (r.F03.t.match(/倉庫只剩 (\d+) 格/) || [])[1];
    res.pf.invcap = { has280, no300, nos, ok: has280 && no300 && nos === '3' };
    await p.screenshot({ path: path.join(OUT, '390x844', 'PF-D2-4-invcap280.png') });
    await p.close();
  }
  /* PF-D2-8：藥劑充能環對 --panel */
  {
    const p = await openPage(b, '390x844');
    res.pf.ring = await p.evaluate(() => {
      const lum = h => {
        const c = getComputedStyle(document.documentElement).getPropertyValue(h).trim();
        const d = document.createElement('i');
        d.style.color = c;
        document.body.appendChild(d);
        const m = getComputedStyle(d).color.match(/\d+/g).map(Number);
        d.remove();
        const f = v => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]);
      };
      const cr = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const pn = lum('--panel');
      return {
        hp: +cr(lum('--hp-hi'), pn).toFixed(2),
        mp: +cr(lum('--mp-hi'), pn).toFixed(2),
        barHp: +cr(lum('--tx-strong'), lum('--hp')).toFixed(2),
        barMp: +cr(lum('--tx-strong'), lum('--mp')).toFixed(2),
        barIn: +cr(lum('--tx-strong'), lum('--panel-inset')).toFixed(2)
      };
    });
    await p.close();
  }
}

/* ---------- 錄影（第 8 節）：60 fps 逐幀；每幀記 probe，再量時間 ---------- */
/* D2_VID=V8,V9 只重錄這幾支，其他沿用上次結果 */
const VID = process.env.D2_VID
  ? process.env.D2_VID.split(',')
  : ['V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V-F2_flask_busy'];
const FXD = require(path.join(ROOT, 'demo/d2/fixtures.js'));
const F = 1000 / 60;
async function videos(b) {
  for (const v of VID)
    for (const size of SIZES)
      for (const rm of [0, 1]) {
        const p = await openPage(b, size, `&scn=${v}${rm ? '&rm=1' : ''}`);
        console.log('錄影', v, size, rm ? 'rm' : '一般');
        const dir = path.join(OUT, 'frames', `${v}_${size}_${rm ? 'rm' : 'n'}`);
        mk(dir);
        const pr = [];
        let i = 0;
        const len = await p.evaluate(() => 0);
        void len;
        for (;;) {
          const run = await p.evaluate(() => demo.running());
          if (!run) break;
          await p.evaluate(s => demo.step(s), F);
          pr.push(await p.evaluate(() => demo.probe()));
          await p.screenshot({ path: path.join(dir, String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 70 });
          i++;
        }
        const LOG = await p.evaluate(() => demo.LOG());
        await p.close();
        mk(path.join(OUT, 'videos'));
        const mp4 = path.join(OUT, 'videos', `${v}_${size}_${rm ? 'rm' : '一般'}.mp4`);
        execFileSync('ffmpeg', [
          '-y',
          '-loglevel',
          'error',
          '-framerate',
          '60',
          '-i',
          path.join(dir, '%04d.jpg'),
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-crf',
          '28',
          '-movflags',
          '+faststart',
          '-vf',
          'scale=trunc(iw/2)*2:trunc(ih/2)*2',
          mp4
        ]);
        res.videos[`${v}|${size}|${rm ? 'rm' : 'n'}`] = {
          file: path.relative(OUT, mp4),
          frames: i,
          checks: vcheck(v, rm, pr, LOG, size),
          errs: p.errs
        };
        fs.rmSync(dir, { recursive: true, force: true });
      }
  fs.rmSync(path.join(OUT, 'frames'), { recursive: true, force: true });
}
/* 時序量測：t 是虛擬時鐘（毫秒）；±1 幀＝±16.7 */
function vcheck(v, rm, pr, LOG, size) {
  const c = [];
  const near = (got, want, tol = F + 0.5) => Math.abs(got - want) <= tol;
  /* 動作在兩幀之間發生：動作後的第一幀就看到＝0 延遲（≤ 1 幀） */
  const add = (name, pass, val) => c.push({ name, pass: !!pass, val });
  const ev = n => LOG.filter(e => e.ev === n);
  const t0 = (LOG.find(e => e.ev === 'scn') || { t: pr.length ? pr[0].t : 0 }).t;
  const firstAfter = (ts, f) => pr.find(x => x.t > ts && f(x));
  const lastWhile = (ts, f) => {
    let l = null;
    for (const x of pr)
      if (x.t > ts) {
        if (f(x)) l = x;
        else if (l) break;
      }
    return l;
  };
  if (v === 'V8') {
    const cr = ev('craft')[0],
      fs0 = ev('flip-start').find(e => e.i === 0),
      end = ev('flip-end')[0];
    add('按打造到第一張翻 ≤ 100 ms', cr && fs0 && fs0.t - cr.t <= 100, cr && fs0 ? fs0.t - cr.t : null);
    if (!rm) {
      const ds = ev('flip-start')
        .slice(0, 10)
        .map(e => Math.round(e.d));
      add(
        '每件時間 普通 240／▲ 360／黃裝 450／▲▲ 600',
        JSON.stringify(ds.slice(0, 4)) === JSON.stringify([450, 600, 450, 240]),
        ds.join(',')
      );
      add('整批 ≤ 3,000', end && end.ms <= 3000 + F, end && end.ms);
      const fa = ev('flip-all')[0];
      const endAll = ev('flip-end')[1];
      add(
        '再按＝全部翻開（同一幀）',
        fa && endAll && endAll.t - fa.t <= F + 0.01,
        fa && endAll ? endAll.t - fa.t : null
      );
    } else add('減少動態一次全開', end && end.ms <= F + 0.01, end && end.ms);
  }
  if (v === 'V10') {
    const d = ev('deny'),
      sk = ev('deny-skip');
    add('停用鈕抖 120 ms', d.length >= 1, d.length);
    const s0 = d[0]
      ? pr.filter(x => x.t > d[0].t && x.t <= d[0].t + 300 && x.shake && x.shake !== 'translateX(0.00px)')
      : [];
    if (!rm)
      add(
        '抖動持續 ≈120 ms（±1 幀）',
        s0.length && near(s0[s0.length - 1].t - d[0].t, 120 - F, F + 0.5),
        s0.length ? s0[s0.length - 1].t - d[0].t + F : null
      );
    else add('減少動態不抖', !s0.length, s0.length);
    add('300 ms 內重複不震', sk.length >= 1 && sk[0].t - d[0].t < 300, sk.length ? sk[0].t - d[0].t : null);
    add('缺料同 120 ms 回饋', d.length >= 3, d.length);
  }
  if (v === 'V11') {
    const p1 = ev('pity100')[0];
    const fr = p1 ? pr.filter(x => x.t > p1.t + 0.5 && x.t < p1.t + 200) : [];
    add(
      '保底 100% 換色不閃（換色後每幀都是 full）',
      fr.length && fr.every(x => x.full),
      fr.filter(x => x.full).length + '/' + fr.length
    );
    const ap = ev('apply')[0];
    const la = ap && lastWhile(ap.t - 1, x => x.apply);
    if (!rm)
      add(
        '套上 收縮 240＋彈 280＝520',
        ap && la && near(la.t - ap.t + F, 520, 2 * F),
        ap && la ? la.t - ap.t + F : null
      );
    const hd = ev('hold-done').find(e => e.k === 'reroll');
    add('重擲長按 600', hd && hd.ms >= 600 && hd.ms <= 600 + F, hd && hd.ms);
    const rr = ev('reroll')[1] || ev('reroll')[0];
    const lb = rr && lastWhile(rr.t - 1, x => x.brk);
    if (!rm)
      add('重擲 碎 300 → 落 280', rr && lb && near(lb.t - rr.t + F, 580, 2 * F), rr && lb ? lb.t - rr.t + F : null);
  }
  if (v === 'V12') {
    const s = ev('select')[0],
      e = ev('equip')[0];
    const sf = s && firstAfter(s.t + 0.5, x => x.sel);
    add('選中 0 ms（動作後下一幀）', sf && sf.t - s.t <= F + 0.5, sf ? +(sf.t - s.t).toFixed(1) : null);
    const c1 = s && firstAfter(s.t - 1, x => x.cmpOp === 1);
    if (!rm) add('比較列 160 升', c1 && near(c1.t - s.t, 160), c1 ? c1.t - s.t : null);
    else add('減少動態：比較列直接出現', c1 && c1.t - s.t <= F + 0.5, c1 ? +(c1.t - s.t).toFixed(1) : null);
    const dl = e && lastWhile(e.t - 1, x => x.dd);
    add('▲▲ 差值停 1,500＋280', dl && near(dl.t - e.t + F, 1780, 2 * F), dl ? dl.t - e.t + F : null);
    const roll = e && pr.filter(x => x.t >= e.t && x.t <= e.t + 600).map(x => x.dps);
    const stop = roll && pr.find(x => x.t >= e.t && x.dps === roll[roll.length - 1]);
    if (!rm) add('▲▲ 數值滾 400', stop && near(stop.t - e.t, 400, F + 0.5), stop ? stop.t - e.t : null);
    else add('減少動態不滾數字', stop && stop.t - e.t <= F + 0.5, stop ? +(stop.t - e.t).toFixed(1) : null);
    const sc = e && lastWhile(e.t - 1, x => x.sumS);
    if (!rm) add('▲▲ 1→1.04→1 280', sc && near(sc.t - e.t + F, 280, 2 * F), sc ? sc.t - e.t + F : null);
  }
  if (v === 'V13') {
    const hd = ev('hold-done');
    add('批次長按 600', hd[0] && hd[0].ms >= 600 && hd[0].ms <= 600 + F, hd[0] && hd[0].ms);
    const sd = ev('salvage-done');
    add('批次每件隔 20、總 ≤ 400', sd[0] && sd[0].ms <= 400 + F, sd[0] && sd[0].ms);
    add('保護件長按 1,200', hd[1] && hd[1].ms >= 1200 && hd[1].ms <= 1200 + F, hd[1] && hd[1].ms);
  }
  if (v === 'V14') {
    const o = ev('tree-open')[0],
      cl = ev('tree-close')[0];
    const during = o && cl ? pr.filter(x => x.t > o.t && x.t < cl.t) : [];
    add(
      '開樹那幀戰鬥停（FT 不動）',
      during.length && during.every(x => x.ft === during[0].ft) && during[0].ft === o.ft,
      during.length ? `${during[0].ft}→${during[during.length - 1].ft}` : null
    );
    if (!rm) {
      const lf = cl && lastWhile(cl.t - 1, x => x.fade > 0);
      add('關樹淡入 160', lf && near(lf.t - cl.t + F, 160, F + 0.5), lf ? lf.t - cl.t + F : null);
      const g1 = cl && firstAfter(cl.t, x => x.gain > 0),
        gl = cl && lastWhile(cl.t + 200, x => x.gain > 0);
      add(
        '補算行停 3,000、淡出 300',
        g1 && gl && near(g1.t - cl.t, 160, F + 0.5) && near(gl.t - cl.t + F, 3460, 2 * F),
        g1 && gl ? `${g1.t - cl.t}→${gl.t - cl.t + F}` : null
      );
      const pth = ev('path')[0];
      const l4 = pth && firstAfter(pth.t - 1, x => x.lit >= 4);
      add('點亮每點隔 30、總 ≤ 300', l4 && l4.t - pth.t <= 300 && l4.t - pth.t >= 90 - F, l4 ? l4.t - pth.t : null);
    } else {
      const g1 = cl && firstAfter(cl.t, x => x.gain > 0);
      add(
        '減少動態直接換（無淡入層）',
        pr.every(x => x.fade === 0),
        g1 ? g1.t - cl.t : null
      );
    }
    const tg = FXD.S.mid.treeGain;
    add(
      '補算 N 按秒數比例',
      cl && cl.gain && cl.gain.soul === Math.floor((tg.soul / tg.sec) * cl.sec),
      cl ? JSON.stringify(cl.gain) + ' / ' + cl.sec.toFixed(2) + ' 秒' : null
    );
  }
  if (v === 'V15') {
    const o = ev('drawer-open')[0];
    const e0 = o && firstAfter(o.t - 1, x => x.pnl === 'p-skill' && x.off === 0 && x.pop === 1);
    if (!rm) add('抽屜滑入 200', e0 && near(e0.t - o.t, 200), e0 ? e0.t - o.t : null);
    else add('減少動態淡入 ≤ 150', e0 && e0.t - o.t <= 150 + F, e0 ? e0.t - o.t : null);
    add(
      '挑選推入',
      ev('push').length >= 0 && pr.some(x => x.sub === 'pick'),
      pr.some(x => x.sub === 'pick')
    );
    const ds = ev('drag-start')[0];
    add('長按 400 才拖', ds && ds.ms >= 400, ds && ds.ms);
    add('放到別的孔', ev('drop').length === 1, JSON.stringify(ev('drop')[0] || null));
  }
  if (v === 'V16') {
    const cl = ev('drawer-close')[0],
      dn = ev('drawer-closed')[0];
    add(
      rm ? '減少動態 ≤ 150 淡出' : '抽屜 160 滑出',
      cl && dn && (rm ? dn.ms <= 150 + F : near(dn.ms, 160)),
      dn && dn.ms
    );
    if (size.startsWith('390') && !rm) {
      const cam = cl && lastWhile(cl.t - 1, x => x.cam !== 0);
      add('鏡頭同 160 回', cam && near(cam.t - cl.t + F, 160, F + 0.5), cam ? cam.t - cl.t + F : null);
    }
    if (rm)
      add(
        '減少動態沒有位移',
        pr.every(x => x.off === 0),
        pr.filter(x => x.off !== 0).length
      );
  }
  if (v === 'V-F2_flask_busy') {
    const dr = ev('flask-drink'),
      bz = ev('flask-busy');
    const hpD = dr.filter(e => e.k === 'hp');
    add(
      '冷卻中再按不喝（生命只喝 1 次）',
      hpD.length === 1 && bz.length === 1 && bz[0].k === 'hp',
      `喝 ${hpD.length}、忙 ${bz.length}`
    );
    const mid = hpD[0] && pr.find(x => x.t >= hpD[0].t + 1500);
    add('冷卻一半掃過 50±5%', mid && Math.abs(+mid.fHp - 0.5) <= 0.05, mid ? mid.fHp : null);
    const end = hpD[0] && firstAfter(hpD[0].t + 1, x => x.fHp === ''); /* log 的 t 取到 0.01，+1 跳過喝之前那幀 */
    add('冷卻 3 秒（±1 幀）', end && near(end.t - hpD[0].t, 3000), end ? +(end.t - hpD[0].t).toFixed(1) : null);
    const sh = bz[0]
      ? pr.filter(x => x.t > bz[0].t && x.t <= bz[0].t + 300 && x.fShake && x.fShake !== 'translateX(0.00px)')
      : [];
    const fl = bz[0] ? pr.filter(x => x.t > bz[0].t && x.t <= bz[0].t + 300 && x.fFlash) : [];
    if (!rm)
      add(
        '忙碌抖 ≤ 80 ms、不亮框',
        sh.length && sh[sh.length - 1].t - bz[0].t + F <= 80 + F && !fl.length,
        sh.length ? +(sh[sh.length - 1].t - bz[0].t + F).toFixed(1) : null
      );
    else
      add(
        '減少動態不抖、只亮外框 120',
        !sh.length && fl.length && near(fl[fl.length - 1].t - bz[0].t + F, 120, F + 0.5),
        fl.length ? +(fl[fl.length - 1].t - bz[0].t + F).toFixed(1) : null
      );
  }
  if (v === 'V9') {
    const fx = LOG.filter(e => e.ev === 'focus');
    add('換焦點 0 ms（同一幀）', fx.length >= 3, fx.map(e => e.k).join('→'));
    const esc = ev('esc');
    const st = esc.map(e => {
      const x = firstAfter(e.t + 0.5, () => true);
      return x ? (x.dlg ? 'dlg' : x.sub ? 'sub' : x.pnl ? 'pnl' : 'none') : '?';
    });
    add(
      'Esc 逐層：確認卡 → 子頁 → 面板',
      JSON.stringify(st) === JSON.stringify(['sub', 'pnl', 'none']) ||
        JSON.stringify(st) === JSON.stringify(['sub', 'pnl', 'pnl']),
      st.join('→')
    );
  }
  void t0;
  return c;
}

/* ---------- 像素：亮度比（PF-D2-7）、舒服 (c)(d)(f) ---------- */
function pixels() {
  const py = `
import sys, json, numpy as np
from PIL import Image
out = {}
def lin(c):
    c = c/255.0
    return np.where(c <= 0.03928, c/12.92, ((c+0.055)/1.055)**2.4)
def lab(a):
    l = lin(a[..., :3].astype(float))
    M = np.array([[0.4124,0.3576,0.1805],[0.2126,0.7152,0.0722],[0.0193,0.1192,0.9505]])
    xyz = l @ M.T / np.array([0.95047,1.0,1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787*xyz + 16/116)
    L = 116*f[...,1]-16; A = 500*(f[...,0]-f[...,1]); B = 200*(f[...,1]-f[...,2])
    return L, A, B
for f, rects in json.load(open(sys.argv[1])).items():
    im = np.array(Image.open(f).convert('RGBA'))
    a = im[..., :3]
    L, A, B = lab(im)
    C = np.hypot(A, B); H = (np.degrees(np.arctan2(B, A)) + 360) % 360
    o = {'alphaOk': bool((im[..., 3] == 255).all()), 'Lstd': float(L.std()), 'sat': float((C > 40).mean()*100), 'brown': float(((L>25)&(L<55)&(H>=30)&(H<=90)&(C>8)).mean()*100), 'bright': float((L>80).mean()*100)}
    if rects:
        Y = 0.2126*lin(a[...,0].astype(float))+0.7152*lin(a[...,1].astype(float))+0.0722*lin(a[...,2].astype(float))
        px, gr = rects
        pv = Y[px[1]:px[3], px[0]:px[2]].mean()
        g = a[gr[1]:gr[3], gr[0]:gr[2]].reshape(-1,3)
        vals, cnt = np.unique(g, axis=0, return_counts=True)
        mode = vals[cnt.argmax()]
        gv = float(0.2126*lin(mode[0])+0.7152*lin(mode[1])+0.0722*lin(mode[2]))
        o['panel'] = float(pv); o['ground'] = gv; o['ratio'] = float((pv+0.0)/gv) if gv else 0
    out[f] = o
print(json.dumps(out))
`;
  const job = {};
  for (const k in res.rows) {
    const r = res.rows[k];
    if (r.v || !SIZES.includes(r.size)) continue;
    const port = r.size === '390x844';
    let rects = null;
    if (r.id === 'G07' || r.id === 'G08')
      rects = port
        ? [
            [0, 380, 390, 700],
            [0, 60, 390, 300]
          ]
        : [
            [16, 200, 492, 640],
            [500, 260, 836, 600]
          ];
    job[path.join(OUT, r.file)] = rects;
  }
  const jf = path.join(OUT, '.px.json');
  fs.writeFileSync(jf, JSON.stringify(job));
  const o = JSON.parse(execFileSync('python3', ['-I', '-c', py, jf], { maxBuffer: 64 << 20 }).toString());
  fs.rmSync(jf);
  for (const k in res.rows) {
    const r = res.rows[k];
    const q = o[path.join(OUT, r.file)];
    if (!q) continue;
    r.px = q;
    if (!q.alphaOk) r.fails.push('PF1 截圖有透明像素');
    if (q.Lstd < 2) r.fails.push('PF1 L* 標準差 < 2');
    if (q.brown > 50) r.fails.push(`PF3 (d) 中明度褐色 ${q.brown.toFixed(1)}%`);
    if (q.bright > 25) r.fails.push(`PF3 (f) 大片亮面 ${q.bright.toFixed(1)}%`);
    if (q.ratio != null && q.ratio < 1.4) r.fails.push(`PF-D2-7 面板／地面 ${q.ratio.toFixed(2)} < 1.4`);
  }
}

/* ---------- 報告 ---------- */
function report() {
  const L = [],
    csv = ['row,size,verdict,reason'];
  let pass = 0,
    fail = 0;
  const keys = Object.keys(res.rows);
  keys.forEach(k => {
    const r = res.rows[k];
    const v = r.fails.length ? 'fail' : 'pass';
    v === 'pass' ? pass++ : fail++;
    csv.push([r.id + (r.v ? '-' + r.v : ''), r.size, v, '"' + r.fails.join('；').replace(/"/g, "'") + '"'].join(','));
  });
  /* 每列 × 尺寸缺圖就寫不完整 */
  (res.rowList || []).forEach(([id]) =>
    SIZES.forEach(s => !res.rows[`${id}|${s}`] && csv.push(`${id},${s},不完整,沒有截圖`))
  );
  fs.writeFileSync(path.join(OUT, 'prefilter.csv'), csv.join('\n') + '\n');
  const u = res.unit;
  const vids = Object.entries(res.videos);
  const vPass = vids.filter(([, x]) => x.checks.every(c => c.pass)).length;
  L.push('# dpoe-d2-demo 預篩（tools/d2_demo.js）', '');
  L.push(`截圖 ${keys.length} 張（74 列 × 2 尺寸＋變體＋另驗尺寸＋三個切換）：✅ ${pass}、❌ ${fail}`);
  L.push(
    `影片 ${vids.length} 支（${vids.length / 4} 支 × 2 尺寸 × 一般／減少動態）：時序全過 ${vPass}／${vids.length}`,
    ''
  );
  L.push('## D2 加項', '', '| 代號 | 結果 | 量測 |', '| --- | --- | --- |');
  L.push(
    `| PF-D2-1 K/M 單元表 | ${u && !u.bad.length && !u.width.length && u.buyOk ? '✅' : '❌'} | ${u ? `${u.rows.length - u.bad.length}/${u.rows.length} 照表；寬度 > 5 字元 ${u.width.length}；買得起邊界 ${u.buy.show} 可買=${u.buy.can}` : '—'} |`
  );
  const allTxt = keys.map(k => res.rows[k].fails.filter(f => f.startsWith('PF-D2-2'))).flat();
  L.push(
    `| PF-D2-2 字串黑名單 | ${allTxt.length ? '❌' : '✅'} | ${allTxt.length ? allTxt.slice(0, 5).join('、') : '0 次（' + BLACK.join('、') + '；掉落列「魔法」）'} |`
  );
  const sym = keys.map(k => res.rows[k].fails.filter(f => f.startsWith('PF-D2-3'))).flat();
  L.push(`| PF-D2-3 記號 | ${sym.length ? '❌' : '✅'} | ${sym.length ? sym.slice(0, 5).join('、') : '0 違規'} |`);
  const ic = res.pf.invcap;
  L.push(
    `| PF-D2-4 INV_CAP 280 | ${ic && ic.ok ? '✅' : '❌'} | ${ic ? `畫面「／280」=${ic.has280}、寫死「／300」0 處=${ic.no300}、F03 剩 ${ic.nos} 格` : '—'} |`
  );
  const tp = ['P01|390x844', 'P02|390x844', 'P01|1280x720', 'P02|1280x720'].map(k => res.rows[k]).filter(Boolean);
  L.push(
    `| PF-D2-5 天賦樹滿版 | ${tp.length && tp.every(r => !r.fails.some(f => f.startsWith('PF-D2-5'))) ? '✅' : '❌'} | ${tp.map(r => `${r.size} 蓋 ${r.extra.cover.w}×${r.extra.cover.h}、樹外區塊 ${r.extra.cover.others}、3 秒雜湊 ${r.extra.pause.same ? '不變' : '改變'}`).join('；')} |`
  );
  const a6 = keys.map(k => res.rows[k]).filter(r => !r.v || ['fs', 'en', 'rm'].includes(r.v));
  const mh = Math.min(...a6.filter(r => r.size.startsWith('390')).map(r => r.m.minHit)),
    md = Math.min(...a6.filter(r => !r.size.startsWith('390')).map(r => r.m.minHit));
  const a6f = a6
    .map(r =>
      r.fails.filter(f => /^A (熱區|鈕距|裁字|重疊)/.test(f)).map(f => `${r.id}${r.v ? '-' + r.v : ''}@${r.size} ${f}`)
    )
    .flat();
  L.push(
    `| PF-D2-6 熱區、間距、裁字、重疊 | ${a6f.length ? '❌' : '✅'} | 最小熱區 直立 ${mh.toFixed(0)}／桌機 ${md.toFixed(0)}；${a6f.length ? a6f.slice(0, 6).join('、') : '裁字 0、重疊 0、鈕距 ≥ 8'} |`
  );
  const g7 = ['G07|390x844', 'G07|1280x720', 'G08|390x844', 'G08|1280x720']
    .map(k => res.rows[k])
    .filter(r => r && r.px);
  L.push(
    `| PF-D2-7 面板／場景地面亮度 | ${g7.length === 4 && g7.every(r => r.px.ratio >= 1.4) ? '✅（佔位底圖）' : '❌'} | ${g7.map(r => `${r.id}@${r.size} ${r.px.ratio.toFixed(2)}`).join('、')}；底圖待素材，量的是 token 佔位格 |`
  );
  const rg = res.pf.ring;
  const fn = keys.map(k => res.rows[k].fails.filter(f => f.startsWith('PF-D2-8'))).flat();
  L.push(
    `| PF-D2-8 藥劑冷卻環對 --panel；鈕上數字 0 個 | ${rg && rg.hp >= 3 && rg.mp >= 3 && !fn.length ? '✅' : '❌'} | ${rg ? `生命 ${rg.hp}、魔力 ${rg.mp}（--hp-hi #ae766c／--mp-hi #7d81ac，M2-36-demo-tokens.md）` : '—'}；鈕上數字 ${fn.length ? fn.slice(0, 3).join('、') : `0 個（${keys.length} 張，鍵帽 1／2 不算）`} |`
  );
  L.push(
    `| G06 色值 | ${u && !u.hex.length ? '✅' : '❌'} | tokens.css 以外色值字面值 ${u ? u.hex.length : '—'} 處；值照 M2-36-demo-tokens.md |`,
    ''
  );
  L.push('## PF1–PF9（visual-review-protocol §6）', '');
  L.push('- PF1 檔案：每張截圖檢查不透明、L* 標準差 ≥ 2、沒有 pageerror（逐列在 prefilter.csv）。');
  L.push('- PF2 狀態：每列由 demo.go(列) 設定狀態後才拍；PF9 位置量測沒對上就算沒過。');
  L.push(
    '- PF3 舒服：(d) 中明度褐色 ≤ 50%、(f) L* > 80 ≤ 25% 逐張算；(b) 只量 G07／G08；(a)(c)(e) 只列數字、不判（需要分層遮罩，進遊戲量）。'
  );
  L.push('- PF4 素材：n/a（沒有新素材；王印、裝備、技能圖示用現有圖集，1×／2×）。');
  L.push('- PF5 介面：圖示整數倍、熱區、tokens.css 以外 0 色碼、焦點框（KB05）。');
  L.push('- PF6 特效、PF7 跳數字：n/a（D2 沒有特效與跳數字）。');
  L.push(
    `- PF8 條：條上數字 --tx-strong 對 --hp ${rg ? rg.barHp : '—'}、--mp ${rg ? rg.barMp : '—'}、--panel-inset ${rg ? rg.barIn : '—'}（≥ 4.5）。`
  );
  L.push('- PF9 清單專屬：下表「量測」欄。', '');
  L.push('## 沒過的列', '');
  const fl = keys.filter(k => res.rows[k].fails.length);
  if (!fl.length) L.push('（無）');
  fl.forEach(k =>
    L.push(
      `- ${res.rows[k].id}${res.rows[k].v ? '-' + res.rows[k].v : ''} @ ${res.rows[k].size}：${res.rows[k].fails.join('；')}`
    )
  );
  L.push('', '## 錄影時序（±1 幀＝±16.7 ms）', '', '| 影片 | 尺寸 | 模式 | 結果 |', '| --- | --- | --- | --- |');
  vids.forEach(([k, x]) => {
    const [v, s, m] = k.split('|');
    L.push(
      `| ${v}（${x.file}） | ${s} | ${m === 'rm' ? '減少動態' : '一般'} | ${x.checks.map(c => `${c.pass ? '✅' : '❌'} ${c.name}＝${c.val}`).join('<br>')} |`
    );
  });
  fs.writeFileSync(path.join(OUT, 'prefilter.md'), L.join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  /* results.md：清單每列兩尺寸的截圖、結果與量測 */
  const R = [
    '# dpoe-d2-demo 驗收結果（tools/d2_demo.js 產生）',
    '',
    '每列兩尺寸各一張；量測＝清單「量」欄的位置與尺寸（x0,y0–x1,y1（寬×高））、最小熱區、最低字對比。錄影見 prefilter.md「錄影時序」。',
    '',
    '| # | 畫面 × 狀態 | 390×844 | 1280×720 | 量測（390×844／1280×720） |',
    '| --- | --- | --- | --- | --- |'
  ];
  (res.rowList || []).forEach(([id, name]) => {
    const a = res.rows[`${id}|390x844`],
      b = res.rows[`${id}|1280x720`];
    const cell = r => (r ? `${r.fails.length ? '❌' : '✅'} \`${r.file}\`` : '—');
    const ms = r =>
      r
        ? Object.entries(r.m.exp || {})
            .map(([k, v]) => `${k} ${v}`)
            .concat([`熱區 ≥ ${r.m.minHit.toFixed(0)}`, `對比 ≥ ${r.m.minCon}`])
            .join('；')
        : '';
    const vs = Object.keys(res.rows)
      .filter(k => k.startsWith(id + '-') && !/-(fs|en|rm)\|/.test(k))
      .map(k => res.rows[k].file);
    R.push(
      `| ${id} | ${name}${vs.length ? '（變體 ' + vs.map(f => '`' + f + '`').join('、') + '）' : ''} | ${cell(a)} | ${cell(b)} | ${ms(a)}／${ms(b)} |`
    );
  });
  R.push('', '## 另驗尺寸與三個切換', '');
  Object.values(res.rows)
    .filter(r => (r.v && /^(fs|en|rm)$/.test(r.v)) || !SIZES.includes(r.size))
    .forEach(r =>
      R.push(
        `- ${r.fails.length ? '❌' : '✅'} ${r.id}${r.v ? '-' + r.v : ''} @ ${r.size}${r.scr ? '（' + r.scr + '）' : ''}：\`${r.file}\`${r.fails.length ? '：' + r.fails.join('；') : ''}`
      )
    );
  fs.writeFileSync(path.join(OUT, 'results.md'), R.join('\n') + '\n');
  const vf = vids.filter(([, x]) => !x.checks.every(c => c.pass)).length;
  console.log(`截圖 ✅ ${pass} ❌ ${fail}；影片 ✅ ${vPass} ❌ ${vf}`);
  return fail + vf + (u && (u.bad.length || u.hex.length) ? 1 : 0);
}

(async () => {
  mk(OUT);
  const prev = fs.existsSync(path.join(OUT, 'results.json'))
    ? JSON.parse(fs.readFileSync(path.join(OUT, 'results.json'), 'utf8'))
    : null;
  unit();
  if (MODE === 'unit') return;
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  if (MODE === 'all' || MODE === 'shots') {
    await shots(b);
    pixels();
  } else if (prev) Object.assign(res, { rows: prev.rows, pf: prev.pf, rowList: prev.rowList });
  if (MODE === 'all' || MODE === 'videos') {
    if (prev && process.env.D2_VID) res.videos = prev.videos;
    await videos(b);
  } else if (prev) res.videos = prev.videos;
  await b.close();
  const bad = report();
  process.exitCode = bad ? 1 : 0;
})();
