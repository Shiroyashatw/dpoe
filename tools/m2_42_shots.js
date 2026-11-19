/* M2-42 全頁 UI/UX 體檢截圖（specs/M2-42-ux-audit-checklist.md、-b.md；流程照 specs/visual-review-protocol.md）。
   只截、只量，不改遊戲碼：狀態用 main 的 ?test=midgame&seed=42&dbg=1、全域函式與 DBG 掛鉤做；AUDIT 補丁在 tools/m2_42_page.js 注入。
   每一列 × 每個狀態 × 每個尺寸：重新載入（?freeze=1，虛擬時鐘）→ AUDIT → DBG.step(2500) → 列的 go() → 驗狀態 → 截圖＋同一刻 DOM 量測 json。
   用法：先開本機伺服器（python3 -m http.server 8000），
     node tools/m2_42_shots.js [--only A-H1,B-S6] [--vp 390x844,1280x720] [--out docs/production/evidence/m2-42] [--url http://localhost:8000/]
   之後跑 python3 tools/m2_42_post.py 算 PF1／PF3 色彩量測、寫 measure.csv、prefilter.csv、summary.md。 */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? process.argv[i + 1] : d;
};
const OUT = arg('out', path.join(__dirname, '..', 'docs', 'production', 'evidence', 'm2-42')),
  URL = arg('url', 'http://localhost:8000/'),
  ONLY = arg('only', '') ? arg('only').split(',') : null,
  VPS = arg('vp', '390x844,1280x720').split(','),
  REPEAT = !!process.argv.includes('--repeat');
const { ROWS, U, darkGo } = require('./m2_42_rows.js');
const { ROWS: ROWS_B, SKB } = require('./m2_42_rows_b.js');
const ALL = [...ROWS, ...ROWS_B];
const PAGE = fs.readFileSync(path.join(__dirname, 'm2_42_page.js'), 'utf8');
const VP = {
  '390x844': { width: 390, height: 844, dpr: 2, mob: 1 },
  '1280x720': { width: 1280, height: 720, dpr: 1, mob: 0 },
  '375x667': { width: 375, height: 667, dpr: 2, mob: 1 }
};
const DEF_Q = 'test=midgame&seed=42&dbg=1';
const log = [];

async function newPage(b, vp, rm, video) {
  const V = VP[vp];
  const ctx = await b.newContext({
    viewport: { width: V.width, height: V.height },
    deviceScaleFactor: V.dpr,
    hasTouch: !!V.mob,
    isMobile: !!V.mob,
    reducedMotion: rm ? 'reduce' : 'no-preference',
    ...(video ? { recordVideo: { dir: video, size: { width: V.width, height: V.height } } } : {})
  });
  await ctx.route(/supabase/, r => r.abort());
  await ctx.addInitScript(PAGE);
  await ctx.addInitScript(
    `window.U = (${U.toString()})(); window.darkGo = ${darkGo.toString()}; window.SKB = ${SKB.toString()};`
  );
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  if (!V.mob) await p.mouse.move(V.width + 50, V.height + 50).catch(() => {});
  return { ctx, p };
}
/* 載入＋共用前置：凍結、AUDIT、往前走 2.5 秒（戰鬥起來、測試入口的吐司淡掉） */
async function boot(p, row, opt = {}, st) {
  const rq = row.q && typeof row.q === 'object' ? row.q[st] : row.q;
  const q = (rq || DEF_Q) + (opt.live ? '' : '&freeze=1');
  await p.goto(URL + '?' + q);
  const rr = row.ready && typeof row.ready === 'object' ? row.ready[st] : row.ready;
  const ready = rr ? rr.toString() : '() => typeof G === "object" && typeof DBG === "object" && G.scene === "map"';
  await p.waitForFunction(`(${ready})()`, null, { timeout: 20000 });
  await p.evaluate(() => document.fonts.ready);
  if (rq && !/test=/.test(rq)) return;
  await p.waitForTimeout(1700);
  await p.evaluate(live => {
    window.U = window.U || {};
    /* 等吐司淡掉那 1.7 秒裡，凍結中的空轉幀也會用亂數：AUDIT 前照 ?seed= 重新設一次，之後的物品與戰鬥才一樣 */
    if (DBG.seed != null) Math.random = rng(DBG.seed);
    M42.audit();
    if (!live) DBG.step(2500);
  }, !!opt.live);
  if (opt.live) await p.waitForTimeout(1200);
}
async function settle(p) {
  await p.evaluate(async () => {
    /* 凍結中新開始的進場動畫停在第 0 毫秒（半透明）：有限長度的推到結尾（只動動畫時間，不推遊戲時間）；循環的照 DBG.freeze 停在 0 */
    M42.finishAnims();
    await document.fonts.ready;
    const L = [...document.images].filter(i => !i.complete);
    await Promise.all(L.map(i => new Promise(r => ((i.onload = i.onerror = r), setTimeout(r, 1500)))));
  });
  await p.waitForTimeout(300);
}
const inArr = (x, s) => x === 1 || x === true || (Array.isArray(x) && x.includes(s));
function naOf(row, vpKey, st) {
  const k = vpKey === '1280x720' ? 'D' : 'P';
  const n = row.na && row.na[k];
  if (!n) return null;
  return typeof n === 'string' ? n : n[st] || null;
}

async function shot(b, row, st, vpKey) {
  const V = VP[vpKey],
    port = !!V.mob,
    dir = path.join(OUT, vpKey),
    base = `${row.scr}-${st}`,
    rec = {
      id: row.id,
      screen: row.scr,
      state: st,
      viewport: vpKey,
      star: inArr(row.star, st) ? 1 : 0,
      s: inArr(row.s, st) ? 1 : 0
    };
  const na = naOf(row, vpKey, st);
  if (na) return Object.assign(rec, { verdict: 'n/a', reason: na });
  fs.mkdirSync(dir, { recursive: true });
  const { ctx, p } = await newPage(b, vpKey, row.rm);
  let res;
  try {
    await boot(p, row, {}, st);
    if (row.pre) await p.evaluate(`(${row.pre.toString()})(${JSON.stringify(st)}, ${port})`);
    if (row.node) res = await row.node(p, st, port);
    else res = await p.evaluate(`(${row.go.toString()})(${JSON.stringify(st)}, ${port})`);
    const wn = await p.evaluate(() => window.U && U.wpnNote);
    if (wn && res) res.checks = Object.assign(res.checks || {}, { weapon: wn });
  } catch (e) {
    res = { ok: false, err: e.message.split('\n')[0] };
  }
  if (res && res.na) {
    await ctx.close();
    return Object.assign(rec, { verdict: 'n/a', reason: res.na, v: res.v });
  }
  if (!res || !res.ok) {
    /* 驗狀態不成立 → blocked，不截（除錯圖存到暫存，不進證據） */
    const dbg = process.env.M42_DBG || path.join(require('os').tmpdir(), 'm42dbg');
    try {
      fs.mkdirSync(dbg, { recursive: true });
      await p.screenshot({ path: path.join(dbg, `${vpKey}-${base}.png`) });
    } catch (e) {}
    await ctx.close();
    return Object.assign(rec, {
      verdict: 'blocked',
      reason: (res && (res.err || res.why)) || '驗狀態不成立',
      v: res && res.v,
      errs: p.errs
    });
  }
  await settle(p);
  const m = await p.evaluate(port => M42.measure(port), port);
  const file = `${vpKey}/${base}.png`;
  await p.screenshot({ path: path.join(OUT, file) });
  /* 連拍：DBG.step 一幀一幀截 */
  let burst = null;
  if (row.burst) {
    const bd = path.join(dir, `${base}-burst`);
    fs.rmSync(bd, { recursive: true, force: true });
    fs.mkdirSync(bd, { recursive: true });
    burst = [];
    for (let i = 0; i < row.burst.n; i++) {
      if (i) await p.evaluate(ms => DBG.step(ms), row.burst.ms);
      const f = path.join(bd, String(i).padStart(2, '0') + '.png');
      await p.screenshot({ path: f });
      const st2 = await p.evaluate(() => ({
        t: +G.t.toFixed(3),
        night: +(G.night > G.t),
        fog: +(G.fog > G.t),
        nums: G.nums.length,
        beams: G.drops.length
      }));
      burst.push({ f: path.relative(OUT, f), ...st2 });
    }
  }
  const out = {
    ...rec,
    file,
    v: res.v,
    checks: res.checks || {},
    crops: res.crops || {},
    m,
    errs: p.errs,
    burst,
    dpr: V.dpr,
    vw: V.width,
    vh: V.height,
    viewport_override: res.viewport || null
  };
  fs.writeFileSync(path.join(OUT, `${vpKey}/${base}.json`), JSON.stringify(out, null, 1));
  await ctx.close();
  return Object.assign(rec, { verdict: 'shot', file });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME_M42 || '/opt/pw-browsers/chromium' });
  const t0 = Date.now();
  const resFile = path.join(OUT, 'shots.json');
  const prev = fs.existsSync(resFile) ? JSON.parse(fs.readFileSync(resFile, 'utf8')) : [];
  const done = [],
    tasks = [];
  for (const row of ALL) {
    if (ONLY && !ONLY.includes(row.id)) continue;
    for (const vpKey of VPS) {
      const sts = vpKey === '375x667' ? row.st.filter(s => inArr(row.s, s)) : row.st;
      for (const st of sts) tasks.push([row, st, vpKey]);
    }
  }
  /* 平行 JOBS 個分頁（各自一個 context；虛擬時鐘各自凍結，結果跟一個一個跑一樣） */
  const JOBS = +arg('jobs', 4);
  let ti = 0;
  await Promise.all(
    Array.from({ length: JOBS }, async () => {
      while (ti < tasks.length) {
        const [row, st, vpKey] = tasks[ti++];
        let r;
        try {
          r = await shot(b, row, st, vpKey);
        } catch (e) {
          r = {
            id: row.id,
            screen: row.scr,
            state: st,
            viewport: vpKey,
            verdict: 'blocked',
            reason: '工具錯誤：' + e.message.split('\n')[0]
          };
        }
        done.push(r);
        console.log(
          `${r.verdict === 'shot' ? '📸' : r.verdict === 'n/a' ? '➖' : '⛔'} ${row.id} ${vpKey} ${row.scr}-${st} ${r.reason || ''} ${r.v && r.verdict !== 'shot' ? JSON.stringify(r.v) : ''}`
        );
      }
    })
  );
  await b.close();
  /* 合併到 shots.json（同一列同尺寸同狀態以這次為準） */
  const key = r => `${r.id}|${r.viewport}|${r.state}`;
  const map = new Map(prev.map(r => [key(r), r]));
  for (const r of done) map.set(key(r), r);
  fs.writeFileSync(resFile, JSON.stringify([...map.values()], null, 1));
  console.log(`完成 ${done.length} 張，${Math.round((Date.now() - t0) / 1000)} 秒`);
})();
