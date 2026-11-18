/* M2-36 視覺審查截圖（docs/production/specs/M2-36-review-checklist.md，流程 visual-review-protocol.md）。
   只截、只量，不改遊戲碼：狀態全部用 ?test=chase&dbg=1 的 DBG 掛鉤與現有全域函式做；遊戲碼一行都不動。
   產出：<尺寸>/<screen>-<state>.png＋.json（同一刻的 DOM 區域、文字、圖示、熱區、條、跳數字繪製紀錄）、連拍、影片、rows.json（給 measure.py）。
   用法：在 repo 根目錄開 python3 -m http.server 8000，再 node evidence/dpoe-m2-36-shots/shots.js [只跑的群組,逗號分隔] */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs'),
  { execFileSync } = require('child_process');
const OUT = __dirname,
  URL = process.env.URL || 'http://localhost:8000/',
  ONLY = (process.argv[2] || '').split(',').filter(Boolean);
const VP = {
  P: { dir: '390x844', w: 390, h: 844, dpr: 2, mob: 1 },
  D: { dir: '1280x720', w: 1280, h: 720, dpr: 1, mob: 0 },
  S: { dir: '375x667', w: 375, h: 667, dpr: 2, mob: 1 }
};
const B4 = ['temple', 'lava', 'tomb', 'ice'];
const ROWS = []; /* 每個「清單列 × 尺寸」一筆，measure.py 讀 */
const TAG = process.env.TAG || 'all',
  rowsFile = path.join(OUT, `rows-${TAG}.json`),
  extraFile = path.join(OUT, `extra-${TAG}.json`);
let OLD = [];
try {
  OLD = JSON.parse(fs.readFileSync(rowsFile, 'utf8'));
} catch (e) {}
const want = g => !ONLY.length || ONLY.includes(g);
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* Google 字型每次從網路抓：同一輪第一次抓到就存起來（tools/dbg_check.js 同法），截圖才穩定 */
const FONT = new Map();
async function font(r) {
  const u = r.request().url();
  let v = FONT.get(u);
  if (!v) {
    try {
      const res = await r.fetch();
      v = { status: res.status(), headers: res.headers(), body: await res.body() };
      FONT.set(u, v);
    } catch (e) {
      return r.abort();
    }
  }
  return r.fulfill(v);
}
let BR;
async function ctxOf(v, o = {}) {
  const V = VP[v];
  const ctx = await BR.newContext({
    viewport: { width: V.w, height: V.h },
    deviceScaleFactor: V.dpr,
    isMobile: !!V.mob,
    hasTouch: !!V.mob,
    reducedMotion: o.rm ? 'reduce' : 'no-preference',
    ...(o.video ? { recordVideo: { dir: o.video, size: { width: V.w, height: V.h } } } : {})
  });
  await ctx.route(/supabase/, r => r.abort());
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, font);
  if (o.block) await ctx.route(o.block, r => r.abort());
  return ctx;
}
/* 頁面裡用的工具：基本狀態、DOM 收集、跳數字繪製紀錄 */
function pageLib() {
  const SK0 = JSON.stringify(S.skills);
  /* js/dbg.js 的 step 每推 33 ms 就直接呼叫一次 pump，而 pump 每次都會再排一個 raf(pump)：step 過後同時有 N 條 pump 鏈，
     每個真實畫格主迴圈跑 N 次（畫面不變但越來越慢，解除凍結後遊戲變 N 倍速）。這裡只在測試腳本裡去重：
     同一個真實畫格（document.timeline 時間相同）只跑一次遊戲的畫格；step 裡面照常每 33 ms 跑一次。不改遊戲碼 */
  if (!window.__rafFix) {
    window.__rafFix = 1;
    const dRaf = window.requestAnimationFrame;
    let Q2 = [],
      sched = false,
      lastTL = -1,
      inStep = 0;
    const myPump = () => {
      sched = false;
      const tl = document.timeline.currentTime;
      if (!inStep && tl === lastTL) {
        if (Q2.length && !sched) (sched = true), dRaf(myPump);
        return;
      }
      lastTL = tl;
      const L = Q2;
      Q2 = [];
      const t = performance.now();
      for (const f of L) f(t);
    };
    window.requestAnimationFrame = cb => {
      Q2.push(cb);
      if (!sched) (sched = true), dRaf(myPump);
      return Q2.length;
    };
    const st = DBG.step.bind(DBG);
    DBG.step = ms => {
      inStep++;
      try {
        st(ms);
      } finally {
        inStep--;
      }
    };
  }
  window.__errs = window.__errs || [];
  window.__vis = e => {
    if (!e || !e.getClientRects().length) return false;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    if (e.checkVisibility && !e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    return r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  };
  window.__rc = e => {
    const r = e.getBoundingClientRect();
    return { x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  };
  window.__sel = e => {
    if (e.id) return '#' + e.id;
    let s = e.tagName.toLowerCase() + (e.classList.length ? '.' + [...e.classList].join('.') : '');
    const p = e.parentElement;
    return p && p !== document.body ? __sel(p) + ' > ' + s : s;
  };
  /* 每個鏡頭開始前：關面板、收說明框與橫幅、回到這個地形的乾淨戰鬥場景（沒有怪、特效、數字），主角滿血滿魔 */
  window.__base = (b = 'temple', clr = 1) => {
    try {
      introStop();
    } catch (e) {}
    window.hurtPlayer = () => 0;
    if (G.scene !== 'map') runNode(TRUNK_K[14]);
    if (G.ask) act('askno');
    G.ask = 0;
    G.loot = null;
    hudState();
    S.skills = JSON.parse(SK0);
    closePanels();
    hideTip();
    try {
      chaseBnHide();
    } catch (e) {}
    $('banner').hidden = true;
    $('ttip').hidden = true;
    DBG.biome(b);
    if (clr) DBG.clear();
    G.bc = null;
    DBG.hot(0);
    ST = stats();
    hudBar();
    P.hp = ST.hp;
    P.mp = ST.mp;
    DBG.safeArea(null);
    /* 手動模式：主角不走動、不放技能（火焰放滿的鏡頭另外開自動） */
    S.auto = 0;
    G.drops.length = 0;
    $('warn').classList.remove('on');
    $('lvup').classList.remove('on');
    tileSet(b);
    return true;
  };
  window.__tilesOk = b => !!TILES[b] && !TILES[b].n && !TILES[b].bad;
  /* 跳數字繪製紀錄：包住主畫布的 fillText／strokeText，記字級、描邊、螢幕位置（CSS px） */
  const FT = CanvasRenderingContext2D.prototype.fillText,
    STK = CanvasRenderingContext2D.prototype.strokeText;
  window.__numLog = null;
  const rec = (ctx, kind, txt, x, y) => {
    if (!window.__numLog || ctx.canvas.id !== 'cv') return;
    const m = ctx.getTransform(),
      d = devicePixelRatio,
      px = parseFloat((ctx.font.match(/(\d+(?:\.\d+)?)px/) || [])[1]),
      w = ctx.measureText(String(txt)).width,
      sx = m.a / d,
      cx = (m.a * x + m.c * y + m.e) / d,
      cy = (m.b * x + m.d * y + m.f) / d,
      al = ctx.textAlign,
      x0 = al === 'center' ? cx - (w * sx) / 2 : al === 'right' || al === 'end' ? cx - w * sx : cx;
    window.__numLog.push({
      kind,
      txt: String(txt),
      font: ctx.font,
      px: +(px * sx).toFixed(2),
      lw: +(ctx.lineWidth * sx).toFixed(2),
      fill: String(ctx.fillStyle),
      stroke: String(ctx.strokeStyle),
      a: +ctx.globalAlpha.toFixed(3),
      box: { x: +x0.toFixed(1), y: +(cy - px * sx * 0.85).toFixed(1), w: +(w * sx).toFixed(1), h: +(px * sx).toFixed(1) }
    });
  };
  CanvasRenderingContext2D.prototype.fillText = function (t, x, y, ...r) {
    rec(this, 'fill', t, x, y);
    return FT.call(this, t, x, y, ...r);
  };
  CanvasRenderingContext2D.prototype.strokeText = function (t, x, y, ...r) {
    rec(this, 'stroke', t, x, y);
    return STK.call(this, t, x, y, ...r);
  };
  /* 王印圖示的網址（icHTML 用的 data URL） */
  window.__wyURL = () => {
    const o = {};
    for (const k of CHASE_POOL.trunk) for (const s of ['', '_16']) o[k + s] = artIconURL(k + s);
    return o;
  };
  const PANEL_SEL = '.panel, #tip, #ttip, #over > *, #chase, #banner',
    SKIP = new Set(['HTML', 'BODY', 'SCRIPT', 'STYLE', 'CANVAS', 'svg', 'path', 'BR']);
  const alphaOf = c => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return c === 'transparent' ? 0 : 1;
    const p = m[1].split(/[ ,/]+/).filter(Boolean);
    return p.length > 3 ? +p[3] : 1;
  };
  /* 同一刻的 DOM：元件矩形（panel／hud／scrim）、正文字（顏色、矩形、是不是關鍵資訊／稀有度／數值）、圖示、熱區、條 */
  window.__col = () => {
    const comps = [],
      texts = [],
      icons = [],
      hits = [],
      wy = __wyURL(),
      wyInv = {};
    for (const k in wy) if (wy[k]) wyInv[wy[k]] = k;
    for (const e of document.body.querySelectorAll('*')) {
      if (SKIP.has(e.tagName) || !__vis(e)) continue;
      const cs = getComputedStyle(e),
        r = e.getBoundingClientRect(),
        bgA = alphaOf(cs.backgroundColor),
        img = cs.backgroundImage !== 'none',
        bw = ['Top', 'Right', 'Bottom', 'Left'].some(
          s => parseFloat(cs['border' + s + 'Width']) > 0 && alphaOf(cs['border' + s + 'Color']) > 0
        ),
        own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()),
        big = r.width * r.height > innerWidth * innerHeight * 0.9,
        inPanel = !!e.closest(PANEL_SEL);
      if (e.tagName === 'IMG') {
        const nw = e.naturalWidth,
          sc = nw ? r.width / nw : 0;
        icons.push({
          sel: __sel(e),
          ...__rc(e),
          nw,
          nh: e.naturalHeight,
          scale: +sc.toFixed(3),
          wy: wyInv[e.src] || null,
          dim: !!e.closest('.chsil'),
          px: e.closest('.chsil') ? 1 : 0
        });
      }
      if (big && (e.id === 'over' || e.id === 'scrim' || bgA < 0.9)) {
        if (bgA > 0) comps.push({ kind: 'scrim', sel: __sel(e), ...__rc(e), bg: cs.backgroundColor });
        continue;
      }
      if (bgA > 0 || img || bw || own || e.tagName === 'IMG' || e.tagName === 'BUTTON')
        comps.push({
          kind: inPanel ? 'panel' : 'hud',
          top: e.matches(PANEL_SEL),
          sel: __sel(e),
          ...__rc(e),
          bg: cs.backgroundColor,
          bgA
        });
      if (own) {
        const t = [...e.childNodes]
          .filter(n => n.nodeType === 3)
          .map(n => n.textContent)
          .join('')
          .trim();
        const rg = document.createRange();
        rg.selectNodeContents(e);
        const rr = [...rg.getClientRects()].filter(q => q.width > 0 && q.height > 0);
        if (!rr.length) continue;
        const u = rr.reduce(
          (a, q) => ({
            x: Math.min(a.x, q.left),
            y: Math.min(a.y, q.top),
            r: Math.max(a.r, q.right),
            b: Math.max(a.b, q.bottom)
          }),
          { x: 1e9, y: 1e9, r: -1e9, b: -1e9 }
        );
        const cls = (e.className && e.className.baseVal == null ? e.className : '') + ' ' + (e.parentElement.className || '');
        texts.push({
          sel: __sel(e),
          t: t.slice(0, 40),
          x: +u.x.toFixed(1),
          y: +u.y.toFixed(1),
          w: +(u.r - u.x).toFixed(1),
          h: +(u.b - u.y).toFixed(1),
          color: cs.color,
          fs: parseFloat(cs.fontSize),
          fw: cs.fontWeight,
          rar: /\b(rc\d|r\d|rar|chs-t|c-good|c-bad)\b/.test(cls),
          num: /^[+\-−]?[\d.,%／/ ]+[%金]?$/.test(t),
          key: !!e.closest('.btn.pri') || /\brc\d\b/.test(cls) || !!e.closest('.orb, #bhp, #bmp'),
          panel: inPanel,
          scene: !inPanel
        });
      }
      if (
        e.matches('button, a[href], input, select, [role=button], [data-a], [data-tm]') &&
        !e.disabled &&
        cs.pointerEvents !== 'none'
      )
        hits.push({ sel: __sel(e), ...__rc(e) });
    }
    const bar = s => {
      const e = document.querySelector(s);
      return e && __vis(e) ? { sel: s, ...__rc(e), color: getComputedStyle(e).color, t: e.textContent } : null;
    };
    const tok = {};
    for (const k of [
      '--panel',
      '--scene-void',
      '--rar-rare',
      '--rar-unique',
      '--rar-chase',
      '--rar-rare-rgb',
      '--rar-unique-rgb',
      '--rar-chase-rgb',
      '--tx',
      '--tx-dim',
      '--bad',
      '--border-mid'
    ])
      tok[k] = getComputedStyle(document.documentElement).getPropertyValue(k).trim();
    return {
      vw: innerWidth,
      vh: innerHeight,
      dpr: devicePixelRatio,
      zoom: ZOOM,
      cv: __rc(CV),
      comps,
      texts,
      icons,
      hits,
      bars: ['#bhp > span', '#bmp > span', '#ohp > span', '#omp > span', '#bhp', '#bmp', '#ohp', '#omp'].map(bar),
      warn: (() => {
        const w = $('warn');
        return w.classList.contains('on') ? { ...__rc(w), color: getComputedStyle(w).color, t: w.textContent } : null;
      })(),
      tok,
      g: {
        biome: G.biome,
        scene: G.scene,
        t: G.t,
        night: G.night,
        fog: G.fog,
        fx: G.fx.length,
        nums: G.nums.length,
        mobs: G.mobs.length,
        frozen: DBG.frozen
      }
    };
  };
  return true;
}
async function load(ctx, q = '') {
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL + '?test=chase&dbg=1&seed=7&freeze=1' + q);
  await p.waitForFunction(() => typeof proBoot === 'function' && !!S && typeof DBG === 'object' && G.scene === 'map');
  await p.waitForLoadState('networkidle').catch(() => 0);
  await p.evaluate(() => document.fonts.ready.then(() => 0));
  await p.evaluate(pageLib);
  /* 四種地形的地磚先載好 */
  await p.evaluate(() => ['temple', 'lava', 'tomb', 'ice'].forEach(tileSet));
  /* ?test=chase 進場 1.5 秒（真時間 setTimeout）會 devChase 掉一個王印：等它掉完，之後每個鏡頭的 __base 再清掉 */
  await p.waitForTimeout(1900);
  return p;
}
/* 截一張靜態圖：先驗狀態（不成立＝blocked，照樣截一張留證），凍結、讓非循環的進場動畫走完、游標移出、等字型與圖，再截＋存 DOM */
const PT = (n, t) => process.env.PROF && console.log('  ⏱', n, Date.now() - t);
async function settle(p) {
  let t = Date.now();
  await p.evaluate(() => {
    DBG.freeze();
    document.getAnimations().forEach(a => {
      const t = a.effect && a.effect.getTiming();
      if (t && t.iterations !== Infinity) a.finish();
    });
  });
  PT('freeze', t);
  if (!(await p.evaluate(() => matchMedia('(hover: none)').matches))) await p.mouse.move(-1, -1);
  t = Date.now();
  await p.waitForLoadState('networkidle').catch(() => 0);
  PT('idle', t);
  await p.evaluate(() => document.fonts.ready.then(() => Promise.all([...document.images].map(i => i.decode().catch(() => 0)))));
  await p.waitForTimeout(300);
}
async function shot(p, v, row, o = {}) {
  const V = VP[v],
    dir = path.join(OUT, o.sub || V.dir);
  fs.mkdirSync(dir, { recursive: true });
  const name = `${row.screen}-${row.state}`,
    e0 = p.errs.length;
  if (!o.nosettle) await settle(p);
  let vr = { ok: true };
  if (row.verify) {
    try {
      vr = await p.evaluate(row.verify, row.arg);
    } catch (e) {
      vr = { ok: false, err: e.message };
    }
    if (typeof vr === 'boolean') vr = { ok: vr };
  }
  /* 跳數字：再畫一格，記下這一格畫了哪些字 */
  await p.evaluate(() => (window.__numLog = []));
  await p.waitForTimeout(80);
  const nums = await p.evaluate(() => {
    const L = window.__numLog;
    window.__numLog = null;
    return L;
  });
  const file = path.join(dir, name + '.png');
  let t = Date.now();
  await p.screenshot({ path: file });
  PT('shot', t);
  t = Date.now();
  const dom = await p.evaluate(() => __col());
  PT('col', t);
  dom.nums = nums;
  dom.verify = vr;
  dom.extra = o.extra || null;
  if (o.more) Object.assign(dom, await p.evaluate(o.more, row.arg));
  fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(dom));
  const R = {
    id: row.id,
    viewport: V.dir,
    screen: row.screen,
    state: row.state,
    file: path.relative(OUT, file),
    kind: o.kind || 'static',
    verdict0: vr.ok ? '' : 'blocked',
    verify: vr,
    errs: p.errs.slice(e0),
    meas: row.meas || '',
    star: row.star || '',
    note: row.note || ''
  };
  ROWS.push(R);
  console.log(`${vr.ok ? '📸' : '⛔'} ${row.id} ${V.dir} ${name}${vr.ok ? '' : ' ' + JSON.stringify(vr)}`);
  return R;
}
/* 不截圖的列（n/a、缺、只有數字） */
function note(row, v, verdict, why, extra = {}) {
  ROWS.push({
    id: row.id,
    viewport: VP[v].dir,
    screen: row.screen,
    state: row.state,
    file: extra.file || '',
    kind: extra.kind || 'none',
    verdict0: verdict,
    verify: { ok: verdict !== 'blocked', why },
    errs: extra.errs || [],
    meas: row.meas || '',
    star: row.star || '',
    note: why,
    data: extra.data
  });
  console.log(`📝 ${row.id} ${VP[v].dir} ${row.screen}-${row.state} ${verdict} ${why}`);
}
/* 連拍：DBG.step 一格一格推，每幀截圖（存 PNG）；dom 只存第 0 幀 */
async function burst(p, v, row, n, dt, o = {}) {
  const V = VP[v],
    dir = path.join(OUT, V.dir, `${row.screen}-${row.state}-burst`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const e0 = p.errs.length,
    frames = [];
  for (let i = 0; i < n; i++) {
    if (o.each) await p.evaluate(o.each, i);
    await p.evaluate(() => (window.__numLog = []));
    await p.evaluate(() => DBG.step(0.001)); /* 推 0 毫秒，只為了畫一格、記下跳數字 */
    const nums = await p.evaluate(() => {
      const L = window.__numLog;
      window.__numLog = null;
      return L;
    });
    const f = path.join(dir, String(i).padStart(2, '0') + '.png');
    await p.screenshot({ path: f });
    const info = o.info ? await p.evaluate(o.info) : null;
    frames.push({ i, file: path.relative(OUT, f), t: i * dt, nums, info });
    await p.evaluate(ms => DBG.step(ms), dt);
  }
  const vr = row.verify ? await p.evaluate(row.verify, row.arg).catch(e => ({ ok: false, err: e.message })) : { ok: true };
  ROWS.push({
    id: row.id,
    viewport: V.dir,
    screen: row.screen,
    state: row.state,
    file: path.relative(OUT, dir),
    kind: 'burst',
    frames,
    base: o.base || null,
    dt,
    verdict0: vr.ok === false ? 'blocked' : '',
    verify: vr,
    errs: p.errs.slice(e0),
    meas: row.meas || '',
    star: row.star || '',
    note: row.note || '',
    data: o.data
  });
  console.log(`🎞️  ${row.id} ${V.dir} ${row.screen}-${row.state} ${n} 幀`);
}
/* 影片：recordVideo 錄 webm，ffmpeg 轉 mp4（H.264、yuv420p、crf 28、faststart、無聲、30 fps） */
async function video(v, name, fn, o = {}) {
  const V = VP[v],
    tmp = path.join(OUT, '_vid');
  fs.mkdirSync(tmp, { recursive: true });
  const ctx = await ctxOf(v, { video: tmp, rm: o.rm, block: o.block });
  const p = await load(ctx);
  const errs = p.errs;
  await fn(p);
  const vp = await p.video().path();
  await ctx.close();
  const dst = path.join(OUT, V.dir, name + '.mp4');
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  /* 開頭載入的那一段剪掉，只留最後 o.len 秒 */
  const dur = parseFloat(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', vp]).toString()
  );
  const len = o.len || 3,
    ss = Math.max(0, dur - len);
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-ss',
    String(ss),
    '-i',
    vp,
    '-an',
    '-r',
    '30',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '28',
    '-movflags',
    '+faststart',
    '-vf',
    `scale=${V.w}:${V.h}`,
    dst
  ]);
  fs.rmSync(vp, { force: true });
  console.log(`🎬 ${V.dir}/${name}.mp4 ${(fs.statSync(dst).size / 1e6).toFixed(2)} MB`);
  return { file: path.relative(OUT, dst), errs };
}
/* 真時間跑（影片用）：解除凍結 ms 毫秒後再凍結 */
const runFor = async (p, ms) => {
  await p.evaluate(() => DBG.resume());
  await p.waitForTimeout(ms);
  await p.evaluate(() => DBG.freeze());
};

/* ===================== 狀態驗證（清單「驗狀態」） ===================== */
const V_IDLE = b =>
  `G.biome==='${b}' && !(G.night>G.t) && !(G.fog>G.t) && !G.fx.length && !G.nums.length && __tilesOk('${b}')`;
const vfn = s => new Function(`const ok = !!(${s}); return { ok, cond: ${JSON.stringify(s)} };`);

/* ===================== 1. 地磚、2. 王印、4. 數字、5. HUD、6. 面板（靜態） ===================== */
async function staticGroup(v) {
  const ctx = await ctxOf(v),
    p = await load(ctx),
    port = VP[v].mob;
  const base = (b, clr = 1) => p.evaluate(([b, c]) => __base(b, c), [b, clr]);
  const vs = v === 'S';
  /* ---- T-1 idle（附地磚矩形給特寫）、T-2 night、T-3 fog、T-4 fire ---- */
  if (want('T'))
    for (const b of B4) {
      await base(b);
      await shot(
        p,
        v,
        {
          id: `T-1-${b}`,
          screen: `combat-${b}`,
          state: 'idle',
          verify: vfn(V_IDLE(b)),
          meas: 'PF4;grid;chunk;(b)(d)',
          star: '★'
        },
        {
          more: () => {
            /* 特寫要的格子：地板 2×2 跨區塊邊、牆頂 2×2（含轉角）、牆面連續 4 格、光圈外 3×3 地板 */
            const C = G.cols,
              T = G.tiles,
              wall = (x, y) => x < 0 || y < 0 || x >= C || y >= G.rows || !!T[y * C + x],
              r = (x, y) => DBG.tileRect(x, y),
              on = (x, y, n = 1, m = 1) => {
                const a = r(x, y),
                  z = r(x + n - 1, y + m - 1);
                return a.x >= 0 && a.y >= 0 && z.x + z.w <= innerWidth && z.y + z.h <= CV.getBoundingClientRect().bottom;
              };
            const pr = { x: Math.floor(P.x / TS), y: Math.floor(P.y / TS) };
            let floor = null,
              top = null,
              face = null,
              dark = null;
            const near = [];
            for (let y = 0; y < G.rows; y++) for (let x = 0; x < C; x++) near.push([x, y]);
            near.sort((a, b) => Math.hypot(a[0] - pr.x, a[1] - pr.y) - Math.hypot(b[0] - pr.x, b[1] - pr.y));
            for (const [x, y] of near) {
              if (!floor && x % 8 === 7 && on(x, y, 2, 2) && !wall(x, y) && !wall(x + 1, y) && !wall(x, y + 1) && !wall(x + 1, y + 1))
                floor = { x, y };
              /* 牆頂 2×2：四格都是牆、而且下面一列有一格是地板（轉角：一邊是牆面一邊還是牆頂） */
              if (
                !top &&
                on(x, y, 2, 2) &&
                wall(x, y) &&
                wall(x + 1, y) &&
                wall(x, y + 1) &&
                wall(x + 1, y + 1) &&
                wall(x, y - 1) &&
                (!wall(x, y + 2) || !wall(x + 1, y + 2)) &&
                wall(x, y + 2) !== wall(x + 1, y + 2)
              )
                top = { x, y };
              if (!face && on(x, y, 4, 1) && [0, 1, 2, 3].every(i => wall(x + i, y) && !wall(x + i, y + 1))) face = { x, y };
            }
            /* 光圈外：離主角最遠、整塊在畫面裡的 3×3 地板 */
            for (const [x, y] of near.slice().reverse())
              if (!dark && on(x, y, 3, 3) && [0, 1, 2].every(i => [0, 1, 2].every(j => !wall(x + i, y + j)))) dark = { x, y };
            const R = o => o && { ...o, r: r(o.x, o.y) };
            return { tiles: { floor: R(floor), top: R(top), face: R(face), dark: R(dark), ts: TS, zoom: ZOOM, P: pr } };
          }
        }
      );
      if (!vs) {
        await p.evaluate(() => DBG.night(5));
        await shot(p, v, {
          id: `T-2-${b}`,
          screen: `combat-${b}`,
          state: 'night',
          verify: vfn('G.night>G.t'),
          meas: '(a)(e) HUD／面板；場景不算 (b)(d)',
          star: '★（燭龍出戰的地形）'
        });
        await p.evaluate(() => DBG.fog(5));
        await shot(p, v, {
          id: `T-3-${b}`,
          screen: `combat-${b}`,
          state: 'fog',
          verify: vfn('G.fog>G.t && !(G.night>G.t)'),
          meas: '(a)(e) HUD／面板；場景不算 (b)(d)',
          star: '★（蚩尤出戰的地形）'
        });
      }
      await base(b);
      await p.evaluate(() => ((S.auto = 1), DBG.fireAll(), DBG.step(2000)));
      await shot(p, v, {
        id: `T-4-${b}`,
        screen: `combat-${b}`,
        state: 'fire',
        verify: vfn(`G.biome==='${b}' && G.mobs.length>0 && S.skills.some(r=>r.k && SKILLS[r.k].el==='fire')`),
        meas: '輪廓（美術總監看）；(c) 不算閒置',
        star: '★'
      });
    }
  /* ---- N-1 kinds、N-3 far／far-night ---- */
  if (want('N'))
    for (const b of B4) {
      await base(b);
      await p.evaluate(() => {
        const K = ['hit', 'crit', 'hurt', 'gain', 'minor', 'miss', 'dodge', 'block', 'dot'];
        /* 3×3 排開，彼此不重疊 */
        K.forEach((k, i) => DBG.num(k, 100 + i * 111, P.x + ((i % 3) - 1) * 90, P.y - 70 + Math.floor(i / 3) * 34));
        DBG.step(120);
      });
      await shot(p, v, {
        id: `N-1-${b}`,
        screen: `num-${b}`,
        state: 'kinds',
        verify: vfn('G.nums.length===9'),
        meas: 'PF7 字高、描邊；num_min_px',
        star: '★'
      });
      if (vs) continue;
      for (const [st, nt] of [
        ['far', 0],
        ['far-night', 1]
      ]) {
        await base(b);
        await p.evaluate(nt => {
          if (nt) DBG.night(5);
          /* 離主角 400 世界 px（往右；直立畫面窄就往下） */
          const port = PORT(),
            x = P.x + (port ? 0 : 400),
            y = P.y + (port ? 400 : 0) - 40;
          DBG.num('crit', 4321, x, y);
          DBG.num('hurt', 87, x, y + 40);
          DBG.step(120);
        }, nt);
        await shot(p, v, {
          id: `N-3-${b}`,
          screen: `num-${b}`,
          state: st,
          verify: vfn(nt ? 'G.night>G.t && G.nums.length===2' : '!(G.night>G.t) && G.nums.length===2'),
          meas: '數字區平均 L* 對背後',
          star: b === 'temple' ? '★' : ''
        });
      }
    }
  /* ---- B-1 hp、B-2 mp、B-3 boss ---- */
  if (want('B') && !vs)
    for (const b of B4) {
      for (const h of [100, 30, 5]) {
        await base(b);
        /* 手動模式：AI 不會喝藥把血補回去 */
        await p.evaluate(h => ((S.auto = 0), DBG.hp(h), DBG.step(66)), h);
        await shot(p, v, {
          id: `B-1-${b}`,
          screen: `hud-${b}`,
          state: 'hp' + h,
          verify: vfn(`Math.abs(P.hp/ST.hp*100-${h})<1.5`),
          meas: 'PF8 bar_contrast' + (h === 5 ? '；吐司字色（危險類）' : ''),
          star: h === 30 ? '★' : ''
        });
      }
      await base(b);
      await p.evaluate(() => (DBG.mp(0), DBG.step(33)));
      await shot(p, v, { id: `B-2-${b}`, screen: `hud-${b}`, state: 'mp0', verify: vfn('P.mp<=1'), meas: 'PF8' });
      await base(b);
      await p.evaluate(() => (DBG.hot(1), DBG.step(33)));
      await shot(
        p,
        v,
        { id: `B-2-${b}`, screen: `hud-${b}`, state: 'mphot', verify: vfn('ST.hellfire===1'), meas: 'PF8；過熱只有 1 px 外框、沒有外發光' },
        {
          more: () => {
            const e = document.querySelector('#omp') || document.querySelector('#bmp'),
              cs = e && getComputedStyle(e);
            const el = [...document.querySelectorAll('#omp, #bmp, #omp *, #bmp *')].filter(__vis).map(x => {
              const c = getComputedStyle(x);
              return { sel: __sel(x), bw: c.borderTopWidth, bc: c.borderTopColor, sh: c.boxShadow, fl: c.filter, ol: c.outlineWidth };
            });
            return { hot: { cls: e && e.className, el } };
          }
        }
      );
      await base(b);
      const bi = B4.indexOf(b);
      await p.evaluate(bi => {
        const m = DBG.boss(BOSSES[bi].sp);
        /* 怪物頭上生命條也在畫面裡：放一隻受傷的普通怪在主角旁邊；王與怪都不動 */
        const n = spawnMob(Object.values(MOBS)[0], P.x + 110, P.y - 30, 1, false);
        n.hp = n.mhp * 0.5;
        if (m) (m.x = P.x - 150), (m.y = P.y - 40);
        DBG.fx('sig_crit', P.x + 110, P.y - 50);
        DBG.step(66);
      }, bi);
      await shot(p, v, {
        id: `B-3-${b}`,
        screen: `hud-${b}`,
        state: 'boss',
        verify: vfn(`G.mobs.some(m=>m.boss) && !$('bossbar').hidden`),
        meas: '王血條、王名墊底、怪物頭上生命條在特效之上',
        star: '★',
        note: `王：BOSSES[${bi}]（地形與王沒有對應表，照順序各取一隻）`
      });
    }
  /* ---- G-1 bag、G-3 dialog、G-4 tip ---- */
  if (want('G') && !vs) {
    for (const b of B4) {
      await base(b);
      await p.evaluate(() => navGo('bag'));
      await shot(p, v, {
        id: `G-1-${b}`,
        screen: `bag-${b}`,
        state: 'open',
        verify: vfn(`PANEL.inv && NAV.view==='bag' && G.biome==='${b}'`),
        meas: '(a) 面板−場景、(b)；上緣 scrim（美術總監看）',
        star: '★'
      });
      await base(b);
      await p.evaluate(() => homeAsk());
      await shot(p, v, {
        id: `G-3-${b}`,
        screen: `dialog-${b}`,
        state: 'camp',
        verify: vfn(`G.ask==='home' && /繼續刷圖/.test(document.body.innerText)`),
        meas: '(a)；暗幕後的場景 L*'
      });
      await p.evaluate(() => act('askno'));
      await base(b);
      await p.evaluate(() => {
        const it = S.eq.weapon || Object.values(S.eq).find(Boolean);
        const r = { left: innerWidth / 2 - 20, top: 120, right: innerWidth / 2 + 20, bottom: 160, width: 40, height: 40 };
        showTip(itemTip(it), r);
      });
      await shot(p, v, {
        id: `G-4-${b}`,
        screen: `tip-${b}`,
        state: 'item',
        verify: vfn(`__vis($('tip'))`),
        meas: '(a)(e)'
      });
    }
    if (v === 'D') {
      await base('lava');
      await p.evaluate(() => fmenuOpen('forge'));
      await shot(p, v, {
        id: 'G-2',
        screen: 'forge-lava',
        state: 'twocol',
        verify: vfn(`PANEL.craft && PANEL.inv && G.biome==='lava'`),
        meas: '(a)(b) 兩欄各算',
        star: '★'
      });
    } else note({ id: 'G-2', screen: 'forge-lava', state: 'twocol', star: '★' }, v, 'n/a', '只桌機（直立鍛造是半版，沒有兩欄）');
  }
  /* ---- W 王印 ---- */
  if (want('W') && !vs) await wangyin(p, v, base);
  /* ---- G-5 營地、K-1 鍛造黏底 ---- */
  if (want('K')) await forgeSticky(p, v, base);
  if (want('G') && !vs) {
    await base('temple');
    await p.evaluate(() => (closePanels(), enterHideout(), DBG.step(66)));
    await shot(p, v, { id: 'G-5', screen: 'camp', state: 'scene', verify: vfn(`G.scene==='hide' && !anyPanel()`), meas: '(a)–(f)；名牌墊底' });
    await p.evaluate(() => fmenuOpen('craft'));
    await shot(p, v, {
      id: 'G-5',
      screen: 'camp',
      state: 'overview',
      verify: vfn(`G.scene==='hide' && PANEL.craft && CRAFT.tab==='camp'`),
      meas: '(a)–(f)；名牌墊底',
      star: '★'
    });
  }
  const errs = p.errs;
  await ctx.close();
  return errs;
}

/* ---- 2. 王印圖示 ---- */
async function wangyin(p, v, base) {
  const WY = await p.evaluate(() => CHASE_POOL.trunk);
  const got = n => WY.slice(0, n);
  const setGot = (n, on = 1) =>
    p.evaluate(
      ([L, on, all]) =>
        DBG.save(s => {
          const C = chaseOf(s);
          C.got = {};
          s.frags = s.frags || {};
          for (const k of all) s.frags[k] = 0;
          for (const k of L) (C.got[k] = 1), (s.frags[k] = 1);
          C.seen = { on, v: 1, k: L.slice() };
          C.pts = 185;
        }),
      [got(n), on, WY]
    );
  const hasWy = (sz, scope) =>
    vfn(`[...document.querySelectorAll('${scope} img')].filter(__vis).some(i => Object.entries(__wyURL()).some(([k,u]) => u && i.src===u && ${sz === 16 ? "k.endsWith('_16')" : "!k.endsWith('_16')"}))`);
  await base('temple');
  await setGot(4);
  /* W-1 戰利品格子：王印進碎片（S.frags），不進戰利品；照樣開戰利品截一張 */
  await p.evaluate(() => navGo('bag'));
  await shot(p, v, {
    id: 'W-1',
    screen: 'bag',
    state: 'wangyin',
    verify: hasWy(32, '#pinv'),
    meas: 'PF9 icon_scale 1 倍',
    star: '★',
    note: '王印收在碎片（S.frags），戰利品格子裡沒有王印'
  });
  /* W-2 有王印的裝備說明框（王印那一行） */
  await base('temple');
  await p.evaluate(() => {
    const k = Object.keys(S.eq).find(k => S.eq[k]);
    S.eq[k].wy = CHASE_POOL.trunk[0];
    if (S.eq[k].r !== 1 && S.eq[k].r !== 2) S.eq[k].r = 2;
    ST = stats();
    showTip(itemTip(S.eq[k]), { left: innerWidth / 2 - 20, top: 100, right: innerWidth / 2 + 20, bottom: 140, width: 40, height: 40 });
  });
  await shot(
    p,
    v,
    {
      id: 'W-2',
      screen: 'tip',
      state: 'wangyin-line',
      verify: vfn(`__vis($('tip')) && !!document.querySelector('#tip .wyl')`),
      meas: '16 px 1 倍；crops tipline-x4',
      star: '★'
    },
    {
      more: () => {
        const l = document.querySelector('#tip .wyl');
        return { tipline: l ? __rc(l) : null, wy16: [...document.querySelectorAll('#tip img')].filter(__vis).length };
      }
    }
  );
  /* W-3 王印本身的說明框（碎片頁點一列的詳情） */
  await base('temple');
  await p.evaluate(() => {
    fmenuOpen('chase');
    const c = document.querySelector('#pchase .chc[data-chs]');
    if (c) (CHSEL = c.dataset.chs), hudPanels(), chaseTip(document.querySelector('#pchase .chc[data-chs]'));
  });
  await shot(p, v, {
    id: 'W-3',
    screen: 'tip',
    state: 'wangyin-item',
    verify: vfn(`__vis($('ttip')) && !!document.querySelector('#ttip .chs-t')`),
    meas: '32 px 1 倍（標題帶）'
  });
  /* W-4 掉落紀錄的追逐列 */
  await base('temple');
  await p.evaluate(WY => {
    S.log = S.log || [];
    for (const k of WY) S.log.unshift({ c: 'chase', n: chaseName(k), k, t: Date.now() });
    fmenuOpen('log');
  }, WY);
  await shot(p, v, {
    id: 'W-4',
    screen: 'log',
    state: 'chase',
    verify: vfn(`PANEL.log && !!document.querySelector('#plog li.lg-chase')`),
    meas: '32（文字列 16）1 倍'
  });
  /* W-5 追逐物品面板：開放前、0、2、4 種 */
  for (const [st, n, on] of [
    ['locked', 0, 0],
    ['k0', 0, 1],
    ['k2', 2, 1],
    ['k4', 4, 1]
  ]) {
    await base('temple');
    /* 開放前：要在怪物 Lv45 以下的地點（每格的 chaseUnlock 才不會自己開放） */
    if (!on) await p.evaluate(() => (runNode(TRUNK_K[0]), DBG.biome('temple'), DBG.clear(), (G.bc = null)));
    await setGot(n, on);
    await p.evaluate(() => ((CHSEL = null), openPanel('chase'), DBG.step(33)));
    await shot(
      p,
      v,
      {
        id: 'W-5',
        screen: 'pchase',
        state: st,
        verify: vfn(on ? `PANEL.chase && chaseOn() && wyGot()===${n}` : `PANEL.chase && !chaseOn()`),
        meas: '32 px 1 倍；剪影不是原圖（--tx-dim）',
        star: st === 'k2' ? '★' : '',
        note: on ? '' : '開放前：遊戲的入口（fmenuOpen）在開放前不讓開；用 openPanel 直接開面板截'
      },
      {
        more: () => ({
          sil: [...document.querySelectorAll('#pchase .chsil img')].map(i => ({
            src: i.src.slice(0, 40),
            orig: Object.values(__wyURL()).includes(i.src),
            fl: getComputedStyle(i).filter,
            ...__rc(i)
          }))
        })
      }
    );
    if (!on) await p.evaluate(() => runNode(TRUNK_K[14]));
  }
  await p.evaluate(() => runNode(TRUNK_K[14]));
  await setGot(4);
  /* W-6 追逐橫幅：單件、合併、王血條顯示中 */
  for (const st of ['single', 'merged', 'bossbar']) {
    await base('temple');
    await p.evaluate(
      ([st, WY]) => {
        if (st === 'bossbar') DBG.boss(BOSSES[0].sp);
        chaseBn(WY[0]);
        if (st === 'merged') chaseBn(WY[1]);
        DBG.step(500);
      },
      [st, WY]
    );
    await shot(
      p,
      v,
      {
        id: 'W-6',
        screen: 'banner',
        state: st,
        verify: vfn(
          `__vis($('chase'))` +
            (st === 'bossbar' ? ` && !$('bossbar').hidden` : '') +
            (st === 'merged' ? ` && $('chase').querySelectorAll('.chf').length>1` : '')
        ),
        meas: '32 px 1 倍；位置照 M2-33-3b §9 驗收 2',
        star: st === 'single' ? '★' : ''
      },
      { more: () => ({ banner: __rc($('chase')), bossbar: $('bossbar').hidden ? null : __rc($('bossbar')) }) }
    );
  }
  /* W-7 王倒下卡（這一輪掉的） */
  await base('temple');
  await p.evaluate(WY => {
    S.auto = 1; /* 掛機卡只在自動模式出現 */
    S.chase.pts = 185;
    G.loot = {
      t: performance.now(),
      items: [],
      gold: 1234,
      sold: 0,
      log: [{ c: 'chase', n: chaseName(WY[0]), k: WY[0], t: Date.now() }, { c: 'cur', n: CUR[Object.keys(CUR)[0]].n }],
      node: G.node,
      hint: false
    };
    idleBar(1);
  }, WY);
  await shot(p, v, {
    id: 'W-7',
    screen: 'bosscard',
    state: 'wangyin',
    verify: vfn(`__vis($('pidle')) && !!document.querySelector('#pidle .igo')`),
    meas: '16／32 1 倍'
  });
  /* W-8 離線摘要：有追逐、0 件（照 tools/m2_19_shots.js 的做法） */
  for (const st of ['chase', 'zero']) {
    await base('temple');
    await p.evaluate(st => {
      closePanels();
      S.auto = 1;
      S.rounds = [{ d: 150, nS: 40, nE: 2, xp: 0, gold: 0 }];
      const r = Math.random;
      if (st === 'zero') (S.chase.pts = 185), (Math.random = () => 0.99);
      else S.chase.pts = 495;
      const ms = st === 'zero' ? 3600e3 : 12 * 3600e3,
        o = offSettle(ms);
      Math.random = r;
      offShow(o, {}, ms);
    }, st);
    await shot(p, v, {
      id: 'W-8',
      screen: 'offline',
      state: st,
      verify: vfn(st === 'zero' ? `!!document.querySelector('#preveal .offch.z')` : `!!document.querySelector('#preveal button.offch')`),
      meas: '16／32 1 倍'
    });
    await p.evaluate(() => closePanels());
  }
}

/* ---- 7. 鍛造黏底動作列 ---- */
async function forgeSticky(p, v, base) {
  const sas = v === 'P' ? [0, 34] : [0];
  for (const sa of sas)
    for (const pos of ['top', 'mid', 'bottom']) {
      await base('temple');
      await p.evaluate(
        ([pos, sa]) => {
          if (sa) DBG.safeArea(sa);
          act('ctab:make');
          if (!PANEL.craft) fmenuOpen('forge');
          if (FSEG !== 'make') act('ctab:make');
          /* 捲動區：鍛造面板裡最高的可捲動元素 */
          const sc = [...document.querySelectorAll('#pcraft, #pcraft *')]
            .filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY))
            .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
          window.__sc = sc;
          if (sc) sc.scrollTop = pos === 'top' ? 0 : pos === 'mid' ? (sc.scrollHeight - sc.clientHeight) / 2 : sc.scrollHeight;
        },
        [pos, sa]
      );
      await shot(
        p,
        v,
        {
          id: 'K-1',
          screen: 'forge-make',
          state: pos + (sa ? '-sa34' : ''),
          verify: vfn(`PANEL.craft && FSEG==='make'`),
          meas: '動作列不透明、上緣 1 px --border-mid＋scrim、底色鋪到螢幕底',
          star: pos === 'mid' && !sa ? '★' : ''
        },
        {
          more: () => {
            /* 黏底動作列：鍛造面板裡 position: sticky／fixed、貼底的元素 */
            const L = [...document.querySelectorAll('#pcraft *')].filter(e => {
              const c = getComputedStyle(e);
              return (c.position === 'sticky' || c.position === 'fixed') && __vis(e) && parseFloat(c.bottom) >= 0;
            });
            const e = L.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
            const c = e && getComputedStyle(e),
              pc = $('pcraft').getBoundingClientRect();
            return {
              sticky: e
                ? {
                    sel: __sel(e),
                    ...__rc(e),
                    bg: c.backgroundColor,
                    bt: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor,
                    sh: c.boxShadow,
                    pb: c.paddingBottom
                  }
                : null,
              sc: window.__sc ? { ...__rc(window.__sc), top: window.__sc.scrollTop, max: window.__sc.scrollHeight - window.__sc.clientHeight } : null,
              panel: { b: pc.bottom }
            };
          }
        }
      );
    }
}

/* ===================== 3. 特效（連拍，四地形；影片另外錄） ===================== */
async function fxGroup(v) {
  const ctx = await ctxOf(v),
    p = await load(ctx);
  const base = b => p.evaluate(b => __base(b, 1), b);
  const FXN = await p.evaluate(() =>
    Object.fromEntries(Object.keys(FXS).filter(k => k.startsWith('sig_')).map(k => [k, { n: FXS[k].n, fps: FXS[k].fps }]))
  );
  const nOf = (k, loops = 1) => Math.min(60, Math.ceil((FXN[k].n / FXN[k].fps) * 30 * loops) + 2);
  const fxInfo = () => G.fx.filter(f => f.n && f.n.startsWith('sig_')).map(f => ({ n: f.n, t: +f.t.toFixed(3), x: f.x, y: f.y }));
  const TRIG = {
    'fx-crit': ['play', () => DBG.fx('sig_crit', P.x + 80, P.y - 30), () => nOf('sig_crit')],
    'fx-lvup': ['play', () => DBG.lvup(), () => nOf('sig_lvup')],
    'fx-chase': ['play', () => DBG.chaseDrop(), () => nOf('sig_chase') + 6]
  };
  for (const b of B4) {
    if (!want('X')) break;
    for (const scr of ['fx-crit', 'fx-lvup', 'fx-chase']) {
      const [st, trig, n] = TRIG[scr];
      await base(b);
      await settle(p);
      /* 基準幀（觸發前）：量特效的變化面積用 */
      const bdir = path.join(OUT, VP[v].dir, `${scr}-${b}-${st}-base.png`);
      await p.screenshot({ path: bdir });
      await p.evaluate(trig);
      await burst(
        p,
        v,
        {
          id: { 'fx-crit': 'X-1', 'fx-lvup': 'X-2', 'fx-chase': 'X-4' }[scr] + '-' + b,
          screen: `${scr}-${b}`,
          state: st,
          meas: 'PF6',
          star: b === 'temple' ? '★（影片）' : '',
          verify: () => ({ ok: true })
        },
        n(),
        33,
        { base: path.relative(OUT, bdir), info: fxInfo }
      );
      await p.evaluate(() => (chaseBnHide(), closePanels()));
    }
    for (const r of ['rare', 'unique', 'chase']) {
      await base(b);
      await settle(p);
      const bdir = path.join(OUT, VP[v].dir, `fx-beam-${b}-${r}-base.png`);
      await p.screenshot({ path: bdir });
      await p.evaluate(r => DBG.beam(r), r);
      const de = await p.evaluate(r => {
        const tok = { rare: '--rar-rare', unique: '--rar-unique', chase: '--rar-chase' }[r];
        const c = beamSheet(cssv(tok + '-rgb'));
        if (!c) return null;
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data,
          n = {};
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] === 255) n[[d[i], d[i + 1], d[i + 2]]] = (n[[d[i], d[i + 1], d[i + 2]]] || 0) + 1;
        const core = Object.keys(n).sort((a, b) => b.split(',').reduce((s, x) => s + +x, 0) - a.split(',').reduce((s, x) => s + +x, 0))[0];
        return { tok, val: cssv(tok), rgbTok: cssv(tok + '-rgb'), core };
      }, r);
      await burst(
        p,
        v,
        {
          id: `X-3-${b}`,
          screen: `fx-beam-${b}`,
          state: r,
          meas: 'PF6；beam_de ≤ 2',
          star: b === 'temple' ? '★（影片）' : '',
          verify: () => ({ ok: G.drops.length > 0 })
        },
        Math.min(60, Math.ceil((FXN.sig_beam.n / FXN.sig_beam.fps) * 30 * 2)),
        33,
        { base: path.relative(OUT, bdir), data: { beam: de } }
      );
      await p.evaluate(() => (chaseBnHide(), closePanels(), (G.drops.length = 0)));
    }
  }
  /* X-5 套王印（DOM 96 CSS px）：角色頁那一格 */
  if (want('X')) {
    await base('temple');
    await settle(p);
    await p.evaluate(() => DBG.wyApply('weapon'));
    await p.evaluate(() => DBG.step(500)); /* 外框收縮 240 ms＋延遲後 sig_wyapply 才出現 */
    await burst(
      p,
      v,
      {
        id: 'X-5',
        screen: 'fx-wyapply',
        state: 'play',
        meas: 'PF6；結尾整塊淡出、1 倍',
        star: '★（影片）',
        verify: () => ({ ok: PANEL.chase })
      },
      Math.min(60, Math.ceil((FXN.sig_wyapply.n / FXN.sig_wyapply.fps) * 30) + 4),
      33,
      {
        info: () => {
          const d = [...document.querySelectorAll('div')].find(e => e.style.backgroundImage && /sig_wyapply/.test(e.style.backgroundImage));
          return d ? { ...__rc(d), bp: d.style.backgroundPosition || getComputedStyle(d).backgroundPosition, op: getComputedStyle(d).opacity } : null;
        }
      }
    );
    await p.evaluate(() => closePanels());
  }
  /* X-7 戰鬥 5 秒：火焰放滿＋每秒一次 sig_crit，每 166 ms 一幀 */
  if (want('X')) {
    await base('temple');
    await p.evaluate(() => ((S.auto = 1), DBG.fireAll(), DBG.step(500)));
    await burst(
      p,
      v,
      { id: 'X-7', screen: 'combat-temple', state: 'fx5s', meas: '5 秒平均 C*>40 ≤ 15%', verify: () => ({ ok: G.mobs.length > 0 }) },
      30,
      166,
      { each: i => i % 6 === 0 && DBG.fx('sig_crit', P.x + 60, P.y - 40) }
    );
  }
  /* N-2 火焰放滿 10 秒每 166 ms：三段傷害數字設定各一次（只記跳數字的繪製，截圖只留設定「全部」那一輪） */
  if (want('N2'))
    for (const b of B4)
      for (const m of ['all', 'crit', 'off']) {
        await base(b);
        await p.evaluate(m => ((S.dmgn = m), (S.auto = 1), DBG.fireAll(), DBG.step(300)), m);
        await burst(
          p,
          v,
          {
            id: `N-2-${b}`,
            screen: `num-${b}`,
            state: 'fire10s' + (m === 'all' ? '' : '-' + m),
            meas: 'PF7 重疊',
            verify: () => ({ ok: G.mobs.length > 0 })
          },
          60,
          166
        );
        await p.evaluate(() => delete S.dmgn);
      }
  const errs = p.errs;
  await ctx.close();
  return errs;
}

/* X-6 減少動態：X-1–X-5 各一次，連拍 12 幀（33 ms） */
async function rmGroup(v) {
  const ctx = await ctxOf(v, { rm: 1 }),
    p = await load(ctx);
  const T = [
    ['crit', () => DBG.fx('sig_crit', P.x + 80, P.y - 30)],
    ['lvup', () => DBG.lvup()],
    ['beam', () => DBG.beam('rare')],
    ['chase', () => DBG.chaseDrop()],
    ['wyapply', () => (DBG.wyApply('weapon'), DBG.step(500))]
  ];
  for (const [k, f] of T) {
    await p.evaluate(() => __base('temple', 1));
    await settle(p);
    const bdir = path.join(OUT, VP[v].dir, `fx-${k}-rm-base.png`);
    await p.screenshot({ path: bdir });
    await p.evaluate(f);
    await burst(
      p,
      v,
      {
        id: 'X-6',
        screen: `fx-${k}`,
        state: 'rm',
        meas: '沒有位移縮放（相鄰幀變化區域的外框相同）；120 ms 淡入淡出',
        verify: () => ({ ok: matchMedia('(prefers-reduced-motion: reduce)').matches })
      },
      12,
      33,
      { base: path.relative(OUT, bdir), info: () => G.fx.filter(f => f.n && f.n.startsWith('sig_')).map(f => ({ n: f.n, t: f.t, s: f.s, x: f.x, y: f.y })) }
    );
    await p.evaluate(() => (chaseBnHide(), closePanels(), (G.drops.length = 0)));
  }
  const errs = p.errs;
  await ctx.close();
  return errs;
}

/* T-5 退回：擋掉四種地形的牆頂磚 → 整套退回程式畫法、沒有錯誤；同時拍 Q 的「舊畫法」 */
async function fallbackGroup(v) {
  const ctx = await ctxOf(v, { block: /img\/tiles\/[a-z]+-walltop\./ }),
    p = await load(ctx);
  for (const b of B4) {
    if (!want('T5')) break;
    await p.evaluate(b => __base(b, 1), b);
    await p.waitForTimeout(300);
    await shot(p, v, {
      id: `T-5-${b}`,
      screen: `combat-${b}`,
      state: 'fallback',
      verify: vfn(`TILES['${b}'] && TILES['${b}'].bad===1 && tileSet('${b}')===null && G.biome==='${b}'`),
      meas: '整套退回舊畫法、pageerror 0；只過預篩'
    });
  }
  /* Q：左邊（舊畫法＝沒有地磚、沒有招牌特效）；main 已含素材，所以「舊」用擋掉素材的同一份程式 */
  if (want('Q')) {
    for (const b of ['temple', 'lava']) {
      await p.evaluate(b => __base(b, 1), b);
      await shot(p, v, { id: 'Q-1', screen: `combat-${b}`, state: 'idle', verify: vfn(`tileSet('${b}')===null`) }, { sub: 'compare/_old/' + VP[v].dir, kind: 'cmp' });
    }
    await p.evaluate(() => (__base('temple', 1), navGo('bag')));
    await shot(p, v, { id: 'Q-2', screen: 'bag-temple', state: 'open', verify: vfn(`PANEL.inv`) }, { sub: 'compare/_old/' + VP[v].dir, kind: 'cmp' });
    await p.evaluate(() => {
      __base('temple', 1);
      for (const k of Object.keys(FXS)) if (k.startsWith('sig_')) delete FXS[k];
    });
    await settle(p);
    await p.evaluate(() => DBG.chaseDrop());
    const bd = path.join(OUT, 'compare', '_old', VP[v].dir, 'fx-chase-base.png');
    fs.mkdirSync(path.dirname(bd), { recursive: true });
    await p.screenshot({ path: bd });
    for (let i = 0; i < 16; i++) {
      await p.evaluate(() => DBG.step(33));
      await p.screenshot({ path: path.join(OUT, 'compare', '_old', VP[v].dir, `fx-chase-f${String(i).padStart(2, '0')}.png`) });
    }
  }
  const errs = p.errs;
  await ctx.close();
  return errs;
}

/* T-6 bStatic 時間：有地磚 vs 擋掉地磚（舊畫法），每個地形量 90 格（暖機後的一般格），另量冷烘（每格清快取） */
async function perfGroup(v) {
  const res = {};
  for (const mode of ['tiles', 'old']) {
    const ctx = await ctxOf(v, mode === 'old' ? { block: /img\/tiles\// } : {}),
      p = await load(ctx);
    for (const b of B4) {
      await p.evaluate(b => __base(b, 1), b);
      await p.evaluate(() => DBG.resume());
      await p.waitForTimeout(500);
      const r = await p.evaluate(async () => {
        const f = window.bStatic,
          t = [],
          cold = [];
        let coldOn = 0;
        window.bStatic = function (...a) {
          if (coldOn) G.bc = null;
          const s = performance.now();
          const v = f.apply(this, a);
          (coldOn ? cold : t).push(performance.now() - s);
          return v;
        };
        await new Promise(r => setTimeout(r, 1500));
        coldOn = 1;
        await new Promise(r => setTimeout(r, 1500));
        window.bStatic = f;
        const st = a => {
          const s = a.slice().sort((x, y) => x - y);
          return { n: s.length, avg: +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(3), p50: +s[s.length >> 1].toFixed(3), p95: +s[Math.floor(s.length * 0.95)].toFixed(3) };
        };
        return { warm: st(t), cold: st(cold), tiles: !!tileSet(G.biome) };
      });
      (res[b] = res[b] || {})[mode] = r;
      await p.evaluate(() => DBG.freeze());
    }
    await ctx.close();
  }
  return res;
}

/* ===================== 影片（temple；K-1 捲動；X-8 退回） ===================== */
async function videos(v) {
  const out = {};
  const prep = async p => {
    await p.evaluate(() => __base('temple', 1));
    await p.evaluate(() => DBG.resume());
    await p.waitForTimeout(500);
  };
  const V = [
    ['fx-crit-temple-play', p => p.evaluate(() => DBG.fx('sig_crit', P.x + 80, P.y - 30)), 1000],
    ['fx-lvup-temple-play', p => p.evaluate(() => DBG.lvup()), 1500],
    ['fx-beam-temple-rare', p => p.evaluate(() => DBG.beam('rare')), 2200],
    ['fx-beam-temple-unique', p => p.evaluate(() => DBG.beam('unique')), 2200],
    ['fx-beam-temple-chase', p => p.evaluate(() => DBG.beam('chase')), 2200],
    ['fx-chase-temple-play', p => p.evaluate(() => DBG.chaseDrop()), 1600],
    ['fx-wyapply-play', p => p.evaluate(() => DBG.wyApply('weapon')), 1600]
  ];
  for (const [n, f, ms] of V)
    out[n] = await video(
      v,
      n,
      async p => {
        await prep(p);
        await p.evaluate(() => (S.auto = 0)); /* 主角不走動，鏡頭不晃 */
        await p.waitForTimeout(500);
        await f(p);
        await p.waitForTimeout(ms + 500);
      },
      { len: (ms + 1000) / 1000 }
    );
  /* X-8：拿掉 FXS.sig_* 再觸發（各 2 秒） */
  for (const [k, f] of [
    ['crit', () => DBG.fx('crit', P.x + 80, P.y - 30)],
    ['lvup', () => DBG.lvup()],
    ['beam', () => DBG.beam('rare')],
    ['chase', () => DBG.chaseDrop()],
    ['wyapply', () => DBG.wyApply('weapon')]
  ])
    out['fx-' + k + '-fallback'] = await video(
      v,
      `fx-${k}-fallback`,
      async p => {
        await prep(p);
        await p.evaluate(() => {
          S.auto = 0;
          for (const k of Object.keys(FXS)) if (k.startsWith('sig_')) delete FXS[k];
        });
        await p.waitForTimeout(300);
        await p.evaluate(f);
        await p.waitForTimeout(1700);
      },
      { len: 2 }
    );
  /* K-1 捲動 2 秒 */
  out['forge-make-scroll'] = await video(
    v,
    'forge-make-scroll',
    async p => {
      await prep(p);
      await p.evaluate(() => {
        S.auto = 0;
        fmenuOpen('forge');
        act('ctab:make');
      });
      await p.waitForTimeout(400);
      await p.evaluate(async () => {
        const sc = [...document.querySelectorAll('#pcraft, #pcraft *')]
          .filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY))
          .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
        if (!sc) return;
        const m = sc.scrollHeight - sc.clientHeight;
        for (let i = 0; i <= 60; i++) {
          sc.scrollTop = (m * i) / 60;
          await new Promise(r => setTimeout(r, 33));
        }
      });
      await p.waitForTimeout(300);
    },
    { len: 2.5 }
  );
  return out;
}

/* 每跑完一組就存一次（中途當掉也留得住） */
const key = r => [r.id, r.viewport, r.screen, r.state].join('|');
function save(extra) {
  const mine = new Set(ROWS.map(key));
  fs.writeFileSync(rowsFile, JSON.stringify(OLD.filter(r => !mine.has(key(r))).concat(ROWS), null, 1));
  let ex = {};
  try {
    ex = JSON.parse(fs.readFileSync(extraFile, 'utf8'));
  } catch (e) {}
  Object.assign(ex, extra);
  fs.writeFileSync(extraFile, JSON.stringify(ex, null, 1));
}
(async () => {
  BR = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium' });
  const t0 = Date.now(),
    errs = {};
  for (const v of (process.env.VPS || 'P,D,S').split(',').filter(Boolean)) {
    errs[v + ':static'] = await staticGroup(v);
    save({ errs });
    if (v !== 'S' && (want('X') || want('N2'))) (errs[v + ':fx'] = await fxGroup(v)), save({ errs });
    if (v !== 'S' && want('X')) (errs[v + ':rm'] = await rmGroup(v)), save({ errs });
    if (v !== 'S' && (want('T5') || want('Q'))) (errs[v + ':fallback'] = await fallbackGroup(v)), save({ errs });
  }
  if (want('T6')) save({ perf: { P: await perfGroup('P'), D: await perfGroup('D') } });
  if (want('V')) {
    const vd = {};
    for (const v of ['P', 'D']) (vd[v] = await videos(v)), save({ videos: vd });
  }
  await BR.close();
  save({ errs });
  console.log(`完成 ${ROWS.length} 列，${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
})();
