/* M2-34 第 3a 批視覺審查證據（specs/M2-34-review-checklist.md §3「3a 戰鬥畫面與營地」＋ M2-33-3a §5 驗收）。
   只截、只量，不改遊戲碼。照 specs/visual-review-protocol.md：每張靜態圖存 png＋同一刻的 json（DOM 區域、文字、圖示、熱區、canvas 呼叫記錄）。
   用法：在 repo 根目錄開 python3 -m http.server 8000（新版）與舊版 worktree 的 8001（新舊對照），再
     node evidence/dpoe-m2-34-shots-3a/shoot.js [all|rows|video|compare]
   之後跑 python3 evidence/dpoe-m2-34-shots-3a/measure.py 算 measure.csv、prefilter.csv、summary.md */
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path'),
  { execFileSync } = require('child_process');
const OUT = __dirname,
  URL = process.env.NEW_URL || 'http://localhost:8000/',
  OLD = process.env.OLD_URL || 'http://localhost:8001/',
  WHAT = process.argv[2] || 'all',
  SEED = 7;
const VP = {
  P: { dir: '390x844', w: 390, h: 844, dpr: 2, mob: 1 },
  D: { dir: '1280x720', w: 1280, h: 720, dpr: 1, mob: 0 },
  S: { dir: '375x667', w: 375, h: 667, dpr: 2, mob: 1 },
  W: { dir: '1440x900', w: 1440, h: 900, dpr: 1, mob: 0 }
};
const ROUND1 = ['P', 'D'],
  ROUND2 = ['S', 'W'];
const LOG = [],
  T0 = new Date();
const say = s => (console.log(s), LOG.push(s));

/* Google 字型每次從網路抓，存起來給之後的頁面用（同 tools/dbg_check.js） */
const FONT = new Map();
async function font(r) {
  const u = r.request().url();
  let v = FONT.get(u);
  if (!v) {
    const res = await r.fetch();
    v = { status: res.status(), headers: res.headers(), body: await res.body() };
    FONT.set(u, v);
  }
  return r.fulfill(v);
}
let B;
async function open(vk, q, o = {}) {
  const v = VP[vk];
  const ctx = await B.newContext({
    viewport: { width: v.w, height: v.h },
    deviceScaleFactor: v.dpr,
    isMobile: !!v.mob,
    hasTouch: !!v.mob,
    reducedMotion: 'no-preference',
    ...(o.video && { recordVideo: { dir: o.video, size: { width: v.w, height: v.h } } })
  });
  await ctx.route(/supabase/, r => r.abort());
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, font);
  for (const pat of o.block || []) await ctx.route(pat, r => r.abort());
  const p = await ctx.newPage();
  p.t0 = Date.now();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.goto((o.base || URL) + q);
  await p.waitForFunction(() => typeof proBoot === 'function' && typeof S === 'object' && !!S);
  await settle(p);
  return p;
}
async function settle(p, ms = 300) {
  await p.waitForLoadState('networkidle').catch(() => 0);
  await p.evaluate(() => document.fonts.ready.then(() => 0));
  await p
    .waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 5000 })
    .catch(() => 0);
  await p.waitForTimeout(ms);
}
const ev = (p, f, a) => p.evaluate(f, a);

/* ---------- 頁內工具：canvas 呼叫記錄器、DOM 量測 ---------- */
const REC_NAMES = [
  'draw',
  'bStatic',
  'bDecals',
  'bDeco',
  'drawMech',
  'drawMob',
  'drawHero',
  'drawFx',
  'drawFront',
  'footRing',
  'drawBars',
  'drawNums',
  'drawBeams',
  'drawMinimap',
  'drawPrompts',
  'drawPropNames',
  'plate',
  'drawHideout',
  'hideFront'
];
async function recInstall(p) {
  await ev(
    p,
    names => {
      if (window.__recOK) return;
      window.__recOK = 1;
      const L = (window.__log = []),
        st = [];
      window.__recOn = false;
      names.forEach(n => {
        const f = window[n];
        if (typeof f !== 'function') return;
        window[n] = function (...a) {
          if (!window.__recOn) return f.apply(this, a);
          st.push(n);
          L.push({ ev: 'enter', n, nums: n === 'drawNums' ? G.nums.map(x => x.c) : undefined });
          try {
            return f.apply(this, a);
          } finally {
            st.pop();
            L.push({ ev: 'exit', n });
          }
        };
      });
      const nm = v => (typeof v === 'number' ? +v.toFixed(2) : String(v).slice(0, 48));
      ['fillText', 'strokeText', 'drawImage', 'fillRect', 'strokeRect', 'stroke', 'fill'].forEach(m => {
        const o = CX[m].bind(CX);
        CX[m] = function (...a) {
          if (window.__recOn) {
            const t = CX.getTransform();
            L.push({
              ev: m,
              in: st[st.length - 1] || '-',
              a: +t.a.toFixed(4),
              font: CX.font,
              fs: String(CX.fillStyle),
              ss: String(CX.strokeStyle),
              ga: +CX.globalAlpha.toFixed(3),
              lw: CX.lineWidth,
              dash: CX.getLineDash(),
              sm: CX.imageSmoothingEnabled,
              args:
                m === 'drawImage'
                  ? [
                      a[0] === (typeof DARK !== 'undefined' && DARK)
                        ? 'DARK'
                        : a[0] && a[0].src
                          ? a[0].src.split('/').pop().split('?')[0]
                          : 'canvas' + (a[0] && a[0].width ? a[0].width + 'x' + a[0].height : ''),
                      ...a.slice(1).map(nm)
                    ]
                  : a.map(nm)
            });
          }
          return o(...a);
        };
      });
    },
    REC_NAMES
  );
}
/* 走一格並記下這一格 draw 的 canvas 呼叫 */
async function recFrame(p) {
  await recInstall(p);
  return ev(p, () => {
    __log.length = 0;
    __recOn = true;
    DBG.step(33);
    __recOn = false;
    return __log.slice();
  });
}
/* 同一刻的 DOM：UI 層矩形（有底色的最外層元件）、文字、圖示、可按元件、狀態欄位 */
const DOMFN = () => {
  const vw = innerWidth,
    vh = innerHeight;
  const vis = el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;
  };
  const nm = el =>
    el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
  const pth = el => {
    let p = el.parentElement;
    while (p && !p.id && p !== document.body) p = p.parentElement;
    return (p && p.id && p !== el ? '#' + p.id + ' ' : '') + nm(el);
  };
  const al = c => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return 0;
    const v = m[1].split(/[ ,\/]+/).filter(Boolean);
    return v.length > 3 ? parseFloat(v[3]) : 1;
  };
  const R = el => {
    const r = el.getBoundingClientRect();
    const x = Math.max(0, r.left),
      y = Math.max(0, r.top);
    return { x, y, w: Math.min(vw, r.right) - x, h: Math.min(vh, r.bottom) - y };
  };
  const ui = [];
  const walk = (el, inUi) => {
    for (const c of el.children) {
      if (c.id === 'cv' || c.tagName === 'SCRIPT') continue;
      if (!vis(c)) {
        /* 自己隱形但小孩可能看得到（visibility）：只跳過 display:none */
        if (getComputedStyle(c).display !== 'none') walk(c, inUi);
        continue;
      }
      const cs = getComputedStyle(c),
        op = al(cs.backgroundColor) >= 0.5 || (cs.backgroundImage !== 'none' && c.tagName !== 'IMG');
      if (op && !inUi) {
        const r = R(c);
        if (r.w > 0 && r.h > 0) ui.push({ sel: pth(c), ...r, bg: cs.backgroundColor });
        walk(c, true);
      } else walk(c, inUi);
    }
  };
  walk(document.body, false);
  const texts = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg') || ['SCRIPT', 'STYLE', 'CANVAS'].includes(el.tagName)) continue;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own || !vis(el)) continue;
    const cs = getComputedStyle(el),
      r = R(el);
    if (r.w < 2 || r.h < 2) continue;
    const pri = !!el.closest('.pri');
    texts.push({
      sel: pth(el),
      txt: el.textContent.trim().slice(0, 24),
      ...r,
      color: cs.color,
      fsz: parseFloat(cs.fontSize),
      fw: +cs.fontWeight || 400,
      item: /\b(r[0-4]|rar\w*|c-good|c-bad|dlt|up|dn)\b/.test(el.className + ' ' + (el.parentElement || {}).className),
      key: pri || el.closest('#bhp,#bmp') != null || ((+cs.fontWeight || 400) >= 700 && parseFloat(cs.fontSize) >= 16)
    });
  }
  const icons = [...document.querySelectorAll('img.ic, img')]
    .filter(i => vis(i) && i.naturalWidth)
    .map(i => {
      const r = i.getBoundingClientRect();
      return { sel: pth(i), src: i.src.split('/').pop().split('?')[0], w: r.width, nw: i.naturalWidth, k: +(r.width / i.naturalWidth).toFixed(3) };
    });
  const clk = [...document.querySelectorAll('button, [data-fg], [data-a], a[href], [role=button], input, select')]
    .filter(vis)
    .map(el => ({ sel: pth(el), ...R(el) }))
    .filter(r => r.w > 0 && r.h > 0)
    .sort((a, b) => Math.min(a.w, a.h) - Math.min(b.w, b.h));
  const cv = R($('cv'));
  return {
    vw,
    vh,
    dpr: devicePixelRatio,
    zoom: typeof ZOOM === 'number' ? ZOOM : null,
    canvas: cv,
    ui,
    texts,
    icons,
    clk_min: clk.slice(0, 5),
    g: typeof G === 'object' && {
      scene: G.scene,
      biome: G.biome,
      t: G.t,
      night: G.night,
      fog: G.fog,
      mobs: G.mobs.length,
      fx: G.fx.length,
      nums: G.nums.length,
      drops: G.drops.length
    },
    frozen: typeof DBG === 'object' ? DBG.frozen : null
  };
};
const MAN = { shots: [], videos: [], numbers: [] };
async function shot(p, vk, id, screen, state, o = {}) {
  const v = VP[vk],
    dir = path.join(OUT, v.dir);
  fs.mkdirSync(dir, { recursive: true });
  const f = `${screen}-${state}`;
  if (!p.isMobile) await p.mouse.move(-1, -1).catch(() => 0);
  await settle(p, 300);
  const dom = await ev(p, DOMFN);
  const ok = o.cond ? await ev(p, o.cond) : true;
  const rec = { id, vp: v.dir, vk, screen, state, file: `${v.dir}/${f}.png`, cond: o.condTxt || '', state_ok: !!ok, checks: o.checks || {}, note: o.note || '', star: !!o.star, round: o.round || (ROUND1.includes(vk) ? 1 : 2), errs: p.errs.slice(), dom, log: o.log || null, blocked_ref: !!o.blockedRef };
  /* 狀態不成立：照流程這列 blocked；仍存一張「現況參考圖」（檔名加 -blocked），不算審查圖 */
  const fn = ok ? f : f + '-blocked';
  rec.file = `${v.dir}/${fn}.png`;
  await p.screenshot({ path: path.join(dir, fn + '.png') });
  fs.writeFileSync(path.join(dir, fn + '.json'), JSON.stringify(rec, null, 1));
  MAN.shots.push({ id, vp: v.dir, screen, state, file: rec.file, state_ok: !!ok });
  say(`${ok ? '📸' : '⛔'} ${id} ${v.dir} ${f} ${ok ? '' : '（狀態不成立：' + (o.condTxt || '') + '）'}`);
  return rec;
}
/* 載入＋等測試入口的吐司散掉（真時間），再做狀态 */
async function boot(vk, q = `?test=midgame&seed=${SEED}`, o = {}) {
  const p = await open(vk, q, o);
  await p.waitForTimeout(o.wait || 4200);
  await ev(p, () => {
    window.hurtPlayer = () => 0; /* 測試裡主角不受傷（狀態穩定；不改遊戲檔） */
    try {
      introStop();
    } catch (e) {}
    closePanels();
  });
  return p;
}
/* DBG.biome 換了 G.biome 但沒清區塊快取 G.bc（快取只看 G.tiles）→ 會沿用前一個地形烘好的地板與牆。
   這裡照 biome.js 圖載好時的做法：等這個地形的磚載完（或載不到）再清 G.bc 重烘 */
async function idle(p, b = 'temple') {
  await ev(
    p,
    b => {
      closePanels();
      DBG.biome(b);
      DBG.clear();
      S.auto = 1;
      tileSet(b);
    },
    b
  );
  await p.waitForFunction(b => !!tileSet(b) || (TILES[b] && TILES[b].bad), b, { timeout: 8000 }).catch(() => 0);
  return ev(p, () => {
    G.bc = null;
    DBG.step(33);
    DBG.freeze();
    return G.biome;
  });
}
const IDLE_COND = b => new Function(`return G.scene==='map' && G.biome==='${b}' && !(G.night>G.t) && !(G.fog>G.t) && G.fx.length===0 && G.nums.length===0`);

/* ---------- S-1 combat－ground ---------- */
async function S1(vk) {
  const p = await boot(vk);
  await idle(p);
  await ev(p, () => {
    DBG.resume();
    const D = Object.values(MOBS)[0];
    for (let i = 0; i < 3; i++) spawnMob(D, P.x + 170 + i * 40, P.y + 30 + i * 30, 1, false).aggro = 0;
    G.ground.push({ k: 'fire', side: 'm', x: P.x + 190, y: P.y + 130, r: 70, t: 0, dur: 999, dps: 0, v: 0 });
    G.ground.push({ k: 'chill', side: 'm', x: P.x + 40, y: P.y + 200, r: 55, t: 0, dur: 999, dps: 0, v: 0 });
    G.ground.push({ k: 'fire', side: 'p', x: P.x, y: P.y + 10, r: 80, t: 0, dur: 999, dps: 0, v: 0 });
    DBG.fx('sig_crit', P.x + 10, P.y - 10);
    DBG.fx('sig_crit', P.x - 10, P.y - 20);
    for (const m of G.mobs) (m.spd = 0), (m.st = 'idle');
    DBG.freeze();
    DBG.step(66);
  });
  const log = await recFrame(p);
  const mech = log.filter(e => e.in === 'drawMech');
  const dpr = VP[vk].dpr;
  const icons = mech.filter(e => e.ev === 'drawImage').map(e => +((e.args[e.args.length - 1] * e.a) / dpr).toFixed(1));
  const frames = mech.filter(e => e.ev === 'stroke');
  const fills = mech.filter(e => e.ev === 'fill');
  const front = log.filter(e => e.in === 'footRing' && e.ev === 'stroke');
  const want = VP[vk].mob ? 16 : 32;
  const checks = {
    icon_px: icons.join('|') || '',
    icon_want: want,
    icon_smooth: mech.filter(e => e.ev === 'drawImage').map(e => e.sm).join('|'),
    foe_dash: frames.map(e => e.dash.join('/')).join('|'),
    foe_lw_world: frames.map(e => e.lw).join('|'),
    foe_color: [...new Set(frames.map(e => e.ss))].join('|'),
    own_fill_alpha: fills.filter(e => e.ga < 0.2).map(e => e.ga).join('|'),
    foe_fill_alpha: fills.filter(e => e.ga >= 0.2).map(e => e.ga).join('|'),
    foot_rings: front.map(e => e.ss).join('|'),
    hero_outline: front.length >= 2 ? 'yes' : 'no'
  };
  const r = await shot(p, vk, 'S-1', 'combat', 'ground', {
    star: true,
    log,
    checks,
    cond: () => G.ground.some(g => g.side === 'm') && G.ground.some(g => g.side === 'p') && G.mobs.length > 0,
    condTxt: "G.ground 有怪物方與自己的地面、G.mobs.length>0"
  });
  await p.context().close();
  return r;
}
/* ---------- S-2 combat－fire ＋ S-3 layers ---------- */
const LAYER = {
  bStatic: 2,
  bDecals: 3,
  bDeco: 3,
  drawMech: 4,
  drawBeams: 5,
  drawMob: 6,
  drawHero: 6,
  drawFx: 7,
  drawFront: 7.5,
  drawBars: 8,
  drawNums: 9,
  DARK: 10,
  drawMinimap: 12
};
async function S2(vk, id = 'S-2', rows = true) {
  const p = await boot(vk);
  await idle(p);
  await ev(p, () => {
    DBG.fireAll();
    DBG.beam('rare');
    for (const m of G.mobs) m.hp = m.mhp * 50; /* 打不死，2 秒內場上一直有怪 */
    DBG.step(2000);
    DBG.hp(100);
    /* 9 種跳數字各一個在主角附近（流程 §4 DBG.num），量各種字級下限 */
    ['hit', 'crit', 'hurt', 'gain', 'minor', 'miss', 'dodge', 'block', 'dot'].forEach((k, i) =>
      DBG.num(k, 100 + i, P.x - 120 + (i % 3) * 120, P.y - 90 + Math.floor(i / 3) * 40)
    );
    DBG.step(200);
  });
  const log = await recFrame(p);
  const dpr = VP[vk].dpr;
  /* 跳數字：drawNums 裡第 i 個 fillText 對 G.nums[i] */
  const en = log.find(e => e.ev === 'enter' && e.n === 'drawNums');
  const ft = log.filter(e => e.in === 'drawNums' && e.ev === 'fillText');
  const sk = log.filter(e => e.in === 'drawNums' && e.ev === 'strokeText');
  const MIN = { hit: 13, crit: 18, jackpot: 18, hurt: 14, phys: 13, fire: 13, cold: 13, light: 13, chaos: 13 };
  const per = {};
  ft.forEach((e, i) => {
    const c = en && en.nums[i],
      px = (parseFloat(e.font.match(/(\d+)px/)[1]) * e.a) / dpr;
    if (!per[c] || px < per[c]) per[c] = +px.toFixed(1);
  });
  const lwScr = sk.length ? Math.min(...sk.map(e => (e.lw * e.a) / dpr)) : null;
  let nfail = [];
  for (const c in per) {
    const m = MIN[c] || (c === 'dot' ? 11 : 11);
    if (per[c] < m) nfail.push(`${c} ${per[c]}<${m}`);
  }
  const numMin = Object.values(per).length ? Math.min(...Object.values(per)) : null;
  const order = [];
  for (const e of log) {
    const k = e.ev === 'enter' ? e.n : e.ev === 'drawImage' && e.args[0] === 'DARK' ? 'DARK' : null;
    if (k && LAYER[k] != null && !order.includes(k)) order.push(k);
  }
  const lay = order.map(k => LAYER[k]);
  const inv = [];
  for (let i = 1; i < lay.length; i++) if (lay[i] < Math.max(...lay.slice(0, i))) {
      const j = lay.indexOf(Math.max(...lay.slice(0, i)));
      inv.push(`${order[i]}(${lay[i]}) 畫在 ${order[j]}(${lay[j]}) 之後`);
    }
  const res = {};
  if (rows) {
    res.s2 = await shot(p, vk, id, 'combat', 'fire', {
      star: true,
      log,
      checks: {
        num_min_px: numMin,
        num_px_by_kind: Object.entries(per).map(([k, v]) => `${k}:${v}`).join('|'),
        num_floor_fail: nfail.join('|') || 'none',
        num_outline_px: lwScr != null ? +lwScr.toFixed(2) : '',
        num_outline_color: [...new Set(sk.map(e => e.ss))].join('|'),
        target_ring: log.some(e => e.in === 'footRing') ? 'yes' : 'no',
        fire_skills: (await ev(p, () => S.skills.map(r => r && r.k).join('/')))
      },
      cond: () => S.skills.filter(Boolean).every(r => SKILLS[r.k].el === 'fire') && G.mobs.length > 0 && G.fx.length > 0,
      condTxt: '技能格全是火焰法術、G.mobs>0、G.fx>0'
    });
    MAN.numbers.push({
      id: 'S-3',
      vp: VP[vk].dir,
      screen: 'combat',
      state: 'layers',
      checks: { order: order.join('>'), layers: lay.join('>'), inversions: inv.join('|') || 'none' },
      verdict: inv.length ? 'fail' : 'pass',
      fail: inv.length ? `跟 M2-33-3a §1.1 表順序不同：${inv.join('；')}` : '',
      src: `${VP[vk].dir}/combat-fire.json（log）`
    });
  }
  await p.context().close();
  return res;
}
/* ---------- 營地 S-4、S-5 ---------- */
const CAMP_RICH = () =>
  DBG.save(s => {
    s.mat.soul = 1e7;
    s.gold = 1e9;
    s.mat.mats.wood = 1e6;
    for (const k in s.mat.mats) s.mat.mats[k] = 1e6;
    ['iron:1', 'iron:2', 'iron:3', 'hide:1', 'silk:1'].forEach(k => (s.mat.mats[k] = 1e6));
  });
async function campBoot(vk, rich, q = `?test=midgame&seed=${SEED}`) {
  const p = await boot(vk, q);
  await ev(
    p,
    rich => {
      closePanels();
      enterHideout();
      if (rich) {
        S.mat.soul = 1e7;
        S.gold = 1e9;
        for (const k in S.mat.mats) S.mat.mats[k] = 1e6;
        ['wood', 'iron:1', 'iron:2', 'iron:3', 'hide:1', 'silk:1', 'stone:1'].forEach(k => (S.mat.mats[k] = 1e6));
        ST = stats();
      }
      hudBar();
      hudPanels();
      DBG.step(33);
      DBG.freeze();
    },
    rich
  );
  await settle(p);
  return p;
}
async function S4(vk) {
  const out = [];
  let p = await campBoot(vk, false);
  let log = await recFrame(p);
  const pl = log.filter(e => e.in === 'plate');
  const dpr = VP[vk].dpr;
  const h = pl.filter(e => e.ev === 'fillRect').map(e => e.args[3]);
  const plateChecks = {
    plate_h_world: [...new Set(h)].join('|'),
    plate_h_css: [...new Set(pl.filter(e => e.ev === 'fillRect').map(e => +((e.args[3] * e.a) / dpr).toFixed(1)))].join('|'),
    plate_bg: [...new Set(pl.filter(e => e.ev === 'fillRect').map(e => e.fs))].join('|'),
    plate_font: [...new Set(pl.filter(e => e.ev === 'fillText').map(e => e.font))].join('|'),
    plate_icon16: pl.some(e => e.ev === 'drawImage') ? 'yes' : 'no',
    plates: pl.filter(e => e.ev === 'fillText').map(e => e.args[0]).join('|')
  };
  out.push(
    await shot(p, vk, 'S-4', 'camp', 'scene', {
      star: true,
      log,
      checks: plateChecks,
      cond: () => G.scene === 'hide' && !Object.keys(PANEL).some(k => k !== 'pick' && PANEL[k]),
      condTxt: "G.scene=='hide'、沒開面板"
    })
  );
  /* hover：桌機滑鼠停在一座設施上（直立沒有懸停 → n/a） */
  if (!VP[vk].mob) {
    const pt = await ev(p, () => {
      const f = G.props.find(k => k.k === 'forge') || G.props[0],
        ox = Math.round(IW / ZOOM / 2 - G.cam.x),
        oy = Math.round(cvH() / ZOOM / 2 - G.cam.y),
        r = CV.getBoundingClientRect();
      return { x: r.left + (f.x + ox) * ZOOM, y: r.top + (f.y - 20 + oy) * ZOOM, n: f.n };
    });
    await ev(p, () => DBG.resume());
    await p.mouse.move(pt.x, pt.y);
    await p.waitForTimeout(400);
    await ev(p, () => DBG.freeze());
    log = await recFrame(p);
    const pl2 = log.filter(e => e.in === 'plate' && e.ev === 'fillText');
    /* 懸停成立＝那座的名牌變成亮的互動提示（#eceef2，跟走近一樣）或畫了設施描邊 */
    const hov = pl2.some(e => String(e.args[0]).includes(pt.n) && e.fs === '#eceef2');
    await p.mouse.move(pt.x, pt.y);
    const r = await shot(p, vk, 'S-4', 'camp', 'hover', {
      log,
      checks: { mouse: `${Math.round(pt.x)},${Math.round(pt.y)}`, prop: pt.n, plate_bright: hov ? 'yes' : 'no' },
      cond: new Function(`return ${hov}`),
      condTxt: `滑鼠停在「${pt.n}」上，那座的名牌變亮或有設施描邊（render.js 只看主角距離 nearProp，沒有滑鼠懸停）`
    });
    out.push(r);
    await p.mouse.move(-1, -1);
  } else MAN.numbers.push({ id: 'S-4', vp: VP[vk].dir, screen: 'camp', state: 'hover', verdict: 'n/a', fail: '直立觸控沒有懸停（清單：桌機停一座設施）', checks: {} });
  await p.context().close();
  /* ready：有可以升級的設施，名牌要有 ▲ */
  p = await campBoot(vk, true);
  log = await recFrame(p);
  const up = await ev(p, () => CAMP_B.filter(b => !campUpCheck(b).why && !campUpCheck(b).lack.length));
  const tri = log.filter(e => e.in === 'plate' && e.ev === 'fillText' && /▲/.test(e.args[0]));
  out.push(
    await shot(p, vk, 'S-4', 'camp', 'ready', {
      log,
      checks: { upgradable: up.join('|'), plate_tri: tri.length },
      cond: new Function(`return ${up.length > 0 && tri.length > 0}`),
      condTxt: `有可以升級的設施（${up.length} 座）且場景名牌畫出 ▲（現在 ${tri.length} 個）`
    })
  );
  await p.context().close();
  /* lock：下一個解鎖的虛線地基（6／4 虛線＋鎖圖示）；用新存檔（?test=fresh，營地還有下一個解鎖） */
  p = await campBoot(vk, false, `?test=fresh&seed=${SEED}`);
  log = await recFrame(p);
  const dash = log.filter(e => ['drawHideout', 'draw', '-', 'drawPropNames', 'plate'].includes(e.in) && e.ev === 'stroke' && e.dash.join('/') === '6/4');
  const nx = await ev(p, () => (nextUnlock('camp') || {}).t || '');
  out.push(
    await shot(p, vk, 'S-4', 'camp', 'lock', {
      log,
      checks: { next_unlock: nx, dashed_found: dash.length },
      cond: new Function(`return ${dash.length > 0}`),
      condTxt: `營地場景畫出下一個解鎖的虛線地基（6／4 虛線；下一個解鎖：${nx || '無'}）`
    })
  );
  await p.context().close();
  return out;
}
const CC_STYLE = () => {
  /* 營地卡上寫死的顏色：掃 style.css 裡 .cc 相關規則的色碼字面值 */
  const hits = [];
  for (const sh of document.styleSheets) {
    let rules;
    try {
      rules = sh.cssRules;
    } catch (e) {
      continue;
    }
    const scan = L => {
      for (const r of L) {
        if (r.cssRules) scan(r.cssRules);
        if (r.selectorText && /\.cc\b|\.ccms|\.ccfl/.test(r.selectorText)) {
          const t = r.style.cssText;
          const m = t.match(/#[0-9a-f]{3,8}\b|rgba?\(\s*\d[^)]*\)/gi);
          if (m) hits.push(`${r.selectorText}{${m.join(',')}}`);
        }
        if (r.type === 7 && /^cc(up|ms)$/.test(r.name)) {
          const m = r.cssText.match(/#[0-9a-f]{3,8}\b|rgba?\(\s*\d[^)]*\)/gi);
          if (m) hits.push(`@keyframes ${r.name}{${m.join(',')}}`);
        }
      }
    };
    scan(rules);
  }
  const cc = [...document.querySelectorAll('.cc')].filter(e => e.offsetParent);
  return {
    literals: hits,
    cards: cc.length,
    card_h: [...new Set(cc.map(e => Math.round(e.getBoundingClientRect().height)))],
    head_h: [...new Set([...document.querySelectorAll('.cch')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height)))],
    can_border: [...new Set(cc.filter(e => e.classList.contains('can')).map(e => getComputedStyle(e).borderLeftColor))],
    open_bg: [...new Set(cc.filter(e => e.querySelector('[aria-expanded=true]')).map(e => getComputedStyle(e).backgroundColor))]
  };
};
async function openCamp(p) {
  await ev(p, () => {
    DBG.resume();
    CRAFT.tab = 'camp';
    openPanel('craft');
    DBG.step(400);
    DBG.freeze();
  });
  await settle(p);
}
async function S5(vk) {
  const p = await campBoot(vk, true);
  await openCamp(p);
  const st = await ev(p, CC_STYLE);
  const out = [];
  const lit = st.literals.join(' ; ');
  out.push(
    await shot(p, vk, 'S-5', 'camp', 'overview', {
      star: true,
      checks: { cards: st.cards, card_h: st.card_h.join('|'), head_h: st.head_h.join('|'), can_border: st.can_border.join('|'), cc_literals: lit || 'none' },
      cond: () => PANEL.craft && CRAFT.tab === 'camp' && document.querySelectorAll('.cc').length > 0,
      condTxt: "PANEL.craft && CRAFT.tab=='camp'、有 .cc 卡"
    })
  );
  /* 展開一張設施卡：點卡頭 */
  const k = await ev(p, () => CAMP_B[0]);
  await ev(p, k => {
    DBG.resume();
    document.querySelector(`[data-fg="cc:${k}"]`).click();
    DBG.step(300);
    DBG.freeze();
    const el = document.querySelector(`#cc-${k}`);
    el && el.scrollIntoView({ block: 'center' });
  }, k);
  await settle(p);
  const st2 = await ev(p, CC_STYLE);
  out.push(
    await shot(p, vk, 'S-5', 'camp', 'expand', {
      star: true,
      checks: { open: k, open_bg: st2.open_bg.join('|'), cc_literals: st2.literals.join(' ; ') || 'none' },
      cond: new Function(`return CAMPUI.open==='${k}' && !!document.querySelector('[data-fg="cc:${k}"][aria-expanded=true]')`),
      condTxt: `CAMPUI.open=='${k}'、卡頭 aria-expanded=true`
    })
  );
  await p.context().close();
  return out;
}
/* ---------- S-6 camp－upgrade：連拍（凍結＋step 33，30 幀＝1 秒）＋影片 ---------- */
async function S6burst(vk) {
  const p = await campBoot(vk, true);
  await openCamp(p);
  const b = await ev(p, () => CAMP_B.find(b => !campUpCheck(b).why && !campUpCheck(b).lack.length));
  if (!b) {
    MAN.numbers.push({ id: 'S-6', vp: VP[vk].dir, screen: 'camp', state: 'upgrade', verdict: 'blocked', fail: '沒有可以升級的設施', checks: {} });
    await p.context().close();
    return;
  }
  await ev(p, b => {
    DBG.resume();
    CAMPUI.open = b;
    hudPanels();
    DBG.step(100);
    DBG.freeze();
    document.querySelector(`#cc-${b}`).scrollIntoView({ block: 'center' });
  }, b);
  await settle(p);
  const lv0 = await ev(p, b => S.camp[b], b);
  const dir = path.join(OUT, VP[vk].dir, 'camp-upgrade-burst');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const frames = [];
  await ev(p, b => document.querySelector(`[data-fg="camp:${b}"]`).click(), b);
  for (let i = 0; i < 30; i++) {
    const m = await ev(p, b => {
      const el = document.querySelector(`#cc-${b}`);
      if (!el) return null;
      const r = el.getBoundingClientRect(),
        cs = getComputedStyle(el),
        tf = cs.transform;
      return { w: +r.width.toFixed(2), h: +r.height.toFixed(2), bg: cs.backgroundColor, sh: cs.boxShadow, tf, anim: el.getAnimations().map(a => a.animationName || '').join('|') };
    }, b);
    const f = String(i).padStart(2, '0');
    await p.screenshot({ path: path.join(dir, f + '.png') });
    const dom = await ev(p, DOMFN);
    fs.writeFileSync(path.join(dir, f + '.json'), JSON.stringify({ id: 'S-6', vp: VP[vk].dir, screen: 'camp', state: 'upgrade', frame: i, card: m, dom, errs: p.errs }, null, 1));
    frames.push(m);
    await ev(p, () => DBG.step(33));
  }
  const lv1 = await ev(p, b => S.camp[b], b);
  const w0 = frames[0] && frames[0].w,
    wmax = Math.max(...frames.filter(Boolean).map(m => m.w));
  MAN.numbers.push({
    id: 'S-6',
    vp: VP[vk].dir,
    screen: 'camp',
    state: 'upgrade',
    burst: `${VP[vk].dir}/camp-upgrade-burst/`,
    checks: {
      fac: b,
      lv: `${lv0}->${lv1}`,
      scale_max: w0 ? +(wmax / w0).toFixed(3) : '',
      scale_want: '1.03（M2-23.7 卡 1→1.03→1，280 ms）',
      bg_f0: frames[0] && frames[0].bg,
      anims: [...new Set(frames.filter(Boolean).map(m => m.anim))].join(','),
      shadow_any: frames.some(m => m && m.sh !== 'none') ? 'yes' : 'no'
    },
    verdict: lv1 > lv0 ? null : 'blocked'
  });
  say(`🎞 S-6 ${VP[vk].dir} 連拍 30 幀（${b} Lv${lv0}→${lv1}）`);
  await p.context().close();
}
/* 影片：Playwright 錄影要的 ffmpeg 版本這台沒有 → 改用 DBG.freeze＋step(33) 一幀一幀截（CSS 大小），ffmpeg 編成 30 fps mp4；
   事件前 0.5 秒（15 幀）＋事件後 after 秒，結果可重現 */
async function video(vk, name, q, setup, event, after = 1.5, o = {}) {
  const tmp = path.join(OUT, '.vtmp', `${VP[vk].dir}-${name}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const p = await open(vk, q, { block: o.block });
  await p.waitForTimeout(4200);
  await ev(p, () => {
    window.hurtPlayer = () => 0;
    closePanels();
  });
  await setup(p);
  await p.waitForTimeout(800);
  if (!VP[vk].mob) await p.mouse.move(-1, -1);
  await ev(p, () => DBG.freeze());
  await settle(p, 100);
  let n = 0;
  const grab = async k => {
    for (let i = 0; i < k; i++) {
      await p.screenshot({ path: path.join(tmp, String(n++).padStart(4, '0') + '.png'), scale: 'css' });
      await ev(p, () => DBG.step(33));
    }
  };
  await grab(15);
  const info = await event(p);
  await grab(Math.round(after * 30) + 15);
  const errs = p.errs.slice();
  await p.context().close();
  const out = path.join(OUT, VP[vk].dir, `${name}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(tmp, '%04d.png'), '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', '-movflags', '+faststart', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', out]);
  fs.rmSync(tmp, { recursive: true, force: true });
  const sz = fs.statSync(out).size;
  MAN.videos.push({ vp: VP[vk].dir, name, file: `${VP[vk].dir}/${name}.mp4`, bytes: sz, frames: n, info, errs });
  say(`🎬 ${VP[vk].dir}/${name}.mp4 ${(sz / 1024).toFixed(0)} KB ${n} 幀 ${JSON.stringify(info)}`);
}
async function S6video(vk) {
  let b;
  await video(
    vk,
    'camp-upgrade',
    `?test=midgame&seed=${SEED}`,
    async p => {
      b = await ev(p, () => {
        enterHideout();
        S.mat.soul = 1e7;
        S.gold = 1e9;
        for (const k in S.mat.mats) S.mat.mats[k] = 1e6;
        ['wood', 'iron:1', 'iron:2', 'iron:3', 'hide:1', 'silk:1', 'stone:1'].forEach(k => (S.mat.mats[k] = 1e6));
        CRAFT.tab = 'camp';
        openPanel('craft');
        const b = CAMP_B.find(b => !campUpCheck(b).why && !campUpCheck(b).lack.length);
        CAMPUI.open = b;
        hudPanels();
        return b;
      });
      await p.waitForTimeout(300);
      await ev(p, b => document.querySelector(`#cc-${b}`).scrollIntoView({ block: 'center' }), b);
    },
    async p => {
      const lv0 = await ev(p, b => S.camp[b], b);
      await ev(p, b => document.querySelector(`[data-fg="camp:${b}"]`).click(), b);
      return { fac: b, lv0, lv1: await ev(p, b => S.camp[b], b) };
    },
    1.5
  );
}
/* ---------- 3a §5 驗收：四種地形 idle／night、地磚格與接縫、退回、招牌特效、王印圖示 ---------- */
async function E1(vk) {
  const p = await boot(vk);
  const out = [];
  for (const b of ['temple', 'lava', 'tomb', 'ice']) {
    await idle(p, b);
    await ev(p, () => {
      /* 換地形後清區塊快取已由 biome() 做；等地磚圖載好再走一格 */
    });
    await p.waitForFunction(b => !!tileSet(b), b, { timeout: 5000 }).catch(() => 0);
    await ev(p, () => DBG.step(33));
    const chunk = await ev(p, () => (G.bc && G.bc.m && G.bc.m.size ? [...G.bc.m.values()][0].width : 0));
    const tr = await ev(p, () => {
      const tx = Math.floor(P.x / TS),
        ty = Math.floor(P.y / TS),
        R = (x, y) => DBG.tileRect(x, y),
        fl = (x, y) => G.tiles[y * G.cols + x];
      return { ptile: [tx, ty], tile_here: fl(tx, ty), t66: R(6, 5), t77: R(7, 5), t88: R(8, 5), row: [5, 6, 7, 8, 9].map(x => fl(x, 5)), row6: [5, 6, 7, 8, 9].map(x => fl(x, 6)), BCH: typeof BCH === 'number' ? BCH : null };
    });
    out.push(
      await shot(p, vk, 'E-1', `combat-${b}`, 'idle', {
        star: true,
        checks: { chunk_px: chunk, tiles: (await ev(p, b => !!tileSet(b), b)) ? 'yes' : 'no', tile_rects: JSON.stringify(tr) },
        cond: IDLE_COND(b),
        condTxt: `G.biome=='${b}' && !(G.night>G.t) && !(G.fog>G.t)，沒有特效與數字`
      })
    );
    await ev(p, () => (DBG.night(5), DBG.step(33)));
    out.push(
      await shot(p, vk, 'E-1n', `combat-${b}`, 'night', {
        checks: { night_left: await ev(p, () => +(G.night - G.t).toFixed(2)) },
        cond: () => G.night > G.t,
        condTxt: 'G.night>G.t（拍前確認真的是夜）'
      })
    );
  }
  await p.context().close();
  return out;
}
async function E3(vk) {
  /* 擋掉 temple 牆頂磚：整套退回舊畫法（384 區塊）、沒有 pageerror */
  const p = await boot(vk, `?test=midgame&seed=${SEED}`, { block: [/img\/tiles\/temple-walltop/] });
  await idle(p, 'temple');
  await ev(p, () => DBG.step(33));
  const f = await ev(p, () => ({ tiles: !!tileSet('temple'), chunk: G.bc && G.bc.m && G.bc.m.size ? [...G.bc.m.values()][0].width : 0 }));
  const r = await shot(p, vk, 'E-3', 'combat-temple', 'fallback', {
    checks: { tiles: f.tiles ? 'yes' : 'no', chunk_px: f.chunk, pageerror: p.errs.length },
    cond: new Function(`return ${!f.tiles}`),
    condTxt: '擋掉 img/tiles/temple-walltop.png 後 tileSet(temple) 為空'
  });
  await p.context().close();
  return r;
}
async function E4(vk, fb) {
  const tag = fb ? '-fallback' : '';
  const block = fb ? [/img\/fx\/sig_/] : [];
  const setup = async p => {
    await ev(p, () => {
      DBG.biome('temple');
      DBG.clear();
      tileSet('temple');
    });
    await p.waitForFunction(() => !!tileSet('temple'), null, { timeout: 8000 }).catch(() => 0);
    await ev(p, () => (G.bc = null));
  };
  await video(vk, `fx-crit-play${tag}`, `?test=midgame&seed=${SEED}`, setup, p => ev(p, fb => ({ ok: fb ? DBG.fx('crit') : DBG.fx('sig_crit'), sig: sigFx('sig_crit', 'crit') }), fb), 1.0, { block });
  await video(vk, `fx-lvup-play${tag}`, `?test=midgame&seed=${SEED}`, setup, p => ev(p, () => (DBG.lvup(), { lv: S.lv, sig: !!sigFx('sig_lvup') })), 1.5, { block });
  await video(vk, `fx-chase-play${tag}`, `?test=midgame&seed=${SEED}`, setup, p => ev(p, () => (DBG.chaseDrop(), { chase: G.drops.some(d => d.chase), sig: !!sigFx('sig_chase') })), 1.5, { block });
}
async function E5(vk) {
  const p = await boot(vk, `?test=chase&seed=${SEED}`, { wait: 4500 });
  const out = {};
  for (const k of ['chase', 'log']) {
    await ev(p, k => (closePanels(), openPanel(k)), k);
    await settle(p);
    out[k] = await ev(p, () =>
      {
        /* 王印圖由 artIconURL 從 ic_wy32／ic_wy16 切成 data URL：用網址比對認出來 */
        const U = new Set(CHASE_POOL.trunk.flatMap(k => [artIconURL(k), artIconURL(k + '_16')]).filter(Boolean));
        return [...document.querySelectorAll('img')].filter(i => i.offsetParent && U.has(i.getAttribute('src'))).map(i => +(i.getBoundingClientRect().width / i.naturalWidth).toFixed(3));
      }
    );
  }
  const all = [...out.chase, ...out.log];
  MAN.numbers.push({
    id: 'E-5',
    vp: VP[vk].dir,
    screen: 'wangyin',
    state: 'icon-scale',
    checks: { chase: out.chase.join('|'), log: out.log.join('|') },
    verdict: !all.length ? 'blocked' : all.every(k => Number.isInteger(k)) ? 'pass' : 'fail',
    fail: !all.length ? '畫面上沒有 ic_wy 圖' : all.every(k => Number.isInteger(k)) ? '' : '王印圖示寬 ÷ naturalWidth 不是整數'
  });
  await p.context().close();
}
/* ---------- 新舊對照 Q3-1、Q3-2：左 main 3a 之前（3456ad5）、右這次（main aa8f220） ---------- */
async function Q(vk) {
  for (const [id, scr, fn] of [
    ['Q3-1', 'combat-auto', async p => {}],
    ['Q3-2', 'camp-overview', async p => ev(p, () => (closePanels(), enterHideout(), (CRAFT.tab = 'camp'), openPanel('craft')))]
  ]) {
    const imgs = [];
    for (const base of [OLD, URL]) {
      const ctxp = await open(vk, `?test=midgame&seed=${SEED}`, { base });
      await ctxp.waitForTimeout(4200);
      await ev(ctxp, () => {
        window.hurtPlayer = () => 0;
        closePanels();
      });
      await fn(ctxp);
      await ctxp.waitForTimeout(1500);
      await settle(ctxp);
      if (!VP[vk].mob) await ctxp.mouse.move(-1, -1);
      const f = path.join(OUT, '.vtmp', `${id}-${VP[vk].dir}-${base === OLD ? 'old' : 'new'}.png`);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      await ctxp.screenshot({ path: f });
      imgs.push(f);
      await ctxp.context().close();
    }
    const out = path.join(OUT, 'compare', VP[vk].dir, `${scr}.png`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    execFileSync('python3', ['-I', path.join(OUT, 'sbs.py'), imgs[0], imgs[1], out, 'left: main before 3a (3456ad5)', 'right: this run (main aa8f220)']);
    MAN.numbers.push({ id, vp: VP[vk].dir, screen: scr, state: 'compare', file: `compare/${VP[vk].dir}/${scr}.png`, verdict: 'n/a', fail: '(g) 不是預篩，給美術總監與 mumi 看', checks: {} });
    say(`🆚 ${id} ${VP[vk].dir} ${out}`);
  }
}

(async () => {
  process.on('exit', () => saveMan());
  B = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium' });
  const man = path.join(OUT, 'manifest.json');
  if (fs.existsSync(man) && WHAT !== 'all' && WHAT !== 'rows') Object.assign(MAN, JSON.parse(fs.readFileSync(man)).run || {});
  if (WHAT.startsWith('only:')) {
    /* 除錯用：only:S1,S2:D,P */
    const [, fns, vks] = WHAT.split(':');
    const F = { S1, S2, S4, S5, S6burst, S6video, E1, E3, E5, Q, E4a: vk => E4(vk, false), E4b: vk => E4(vk, true) };
    for (const vk of vks.split(',')) for (const f of fns.split(',')) await F[f](vk);
  }
  if (WHAT === 'all' || WHAT === 'rows')
    for (const vk of [...ROUND1, ...ROUND2]) {
      await S1(vk);
      await S2(vk);
      await S4(vk);
      await S5(vk);
      await S6burst(vk);
      await E1(vk);
      if (ROUND1.includes(vk)) await E3(vk);
      if (ROUND1.includes(vk)) await E5(vk);
    }
  if (WHAT === 'all' || WHAT === 'video')
    for (const vk of ROUND1) {
      await S6video(vk);
      await E4(vk, false);
      await E4(vk, true);
    }
  if (WHAT === 'all' || WHAT === 'compare') for (const vk of ROUND1) await Q(vk);
  await B.close();
  fs.rmSync(path.join(OUT, '.vtmp'), { recursive: true, force: true });
})();
/* 中途失敗也存下已經做完的列 */
let SAVED = 0;
function saveMan() {
  if (SAVED++) return;
  const man = path.join(OUT, 'manifest.json'),
    t0 = T0;
  const head = execFileSync('git', ['rev-parse', 'HEAD']).toString().trim();
  const ck = execFileSync('git', ['log', '-1', '--format=%h', '--', 'docs/production/specs/M2-34-review-checklist.md']).toString().trim();
  fs.writeFileSync(
    man,
    JSON.stringify(
      {
        task: 'dpoe-m2-34-shots-3a',
        game_commit: head,
        branch: execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD']).toString().trim(),
        checklist: 'docs/production/specs/M2-34-review-checklist.md §3（3a）＋ M2-33-3a §5',
        checklist_commit: ck,
        compare_old: '3456ad5（PR #66 合併前的 main）',
        run_at_taipei: new Date(t0.getTime() + 8 * 3600e3).toISOString().replace('T', ' ').slice(0, 16),
        seed: SEED,
        viewports: VP,
        dbg_ver: 1,
        run: MAN
      },
      null,
      1
    )
  );
  fs.appendFileSync(path.join(OUT, 'shoot.log'), LOG.join('\n') + '\n');
}
