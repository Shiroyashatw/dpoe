/* dpoe-hud133-fix3（UIUX 複審 §7、B 標準「輸入 ≤ 50 ms」）：不用虛擬時鐘，量真實的「按下 → 出手」延遲並錄影。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/bh_latency.js [輸出資料夾]（預設 docs/production/evidence/battle-hud-v133-fix3/latency）
   每個尺寸按 6 次：1280 按 Q（keydown 直接 useSlot(2)）與滑鼠左鍵（主迴圈每格看 M.L 再 useSlot(0)）；390 在戰場快點一下（pointerup 放 useSlot(0)）。
   量法（頁面內、真時間 performance.now）：輸入事件 event.timeStamp → useSlot 回傳成功（出手）→ 出手後第一個 rAF（那一格畫出來）。
   影片：CDP Page.startScreencast 收真時間的每一張合成畫面（時間戳），ffmpeg 依時間戳轉成 60 fps 定格率（缺的格重複前一張）；
   畫面右上燒入頁面 rAF 幀號與毫秒、最近一次延遲。不含螢幕與觸控硬體本身的延遲 */
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path'),
  { execFileSync } = require('child_process');
const OUT = path.resolve(
    process.argv[2] || path.join(__dirname, '..', 'docs/production/evidence/battle-hud-v133-fix3/latency')
  ),
  URL = process.argv[3] || 'http://localhost:8000/';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {}),
    all = {};
  for (const [W, H, touch] of [
    [390, 844, 1],
    [1280, 720, 0]
  ]) {
    const ctx = await b.newContext({
      viewport: { width: W, height: H },
      hasTouch: !!touch,
      isMobile: !!touch,
      deviceScaleFactor: 1
    });
    await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage(),
      errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL + '?dbg=1&seed=3&' + Date.now());
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(1200);
    await p.evaluate(touch => {
      proSkip();
      S.story.tips = 0;
      S.auto = 0;
      if (touch) DBG.safeArea(34, 47);
      runNode(TRUNK_K[0]);
      /* 新角色左鍵格的基本攻擊，也放到 Q 格 */
      const k = S.skills[0].k;
      S.skills[2] = { k, so: [null, null], n: 2 };
      S.lib.sk[k] = 1;
      ST = stats();
      hudBar();
      DBG.clear();
      for (const id of ['warn', 'warn2', 'banner']) $(id).style.visibility = 'hidden';
      /* 量測：輸入事件時間、出手時間、出手後第一個 rAF */
      window.LAT = [];
      let last = null;
      for (const t of ['keydown', 'pointerdown', 'pointerup'])
        window.addEventListener(t, e => (last = { type: t + (e.key ? ':' + e.key : ''), t: e.timeStamp }), true);
      const u0 = window.useSlot;
      window.useSlot = function (i) {
        const r = u0.apply(this, arguments);
        if (r && last)
          LAT.push({
            slot: i,
            in: last.type,
            by: (new Error().stack.split('\n')[2] || '')
              .trim()
              .replace(/^at /, '')
              .replace(/https?:\/\/[^/]+\//, '')
              .replace(/\?v=[^:]*/, ''),
            tIn: last.t,
            tFire: performance.now(),
            tFrame: null,
            fFrame: null
          }),
            (last = null);
        return r;
      };
      const d = document.createElement('div');
      d.id = 'latstamp';
      d.style.cssText =
        'position:fixed;right:4px;top:' +
        (PORT() ? 140 : 120) +
        'px;z-index:99;padding:2px 6px;background:#000;color:#fff;font:700 14px/1.2 monospace;pointer-events:none;white-space:pre';
      document.body.append(d);
      let f = 0;
      const t0 = performance.now(),
        loop = t => {
          f++;
          for (const L of LAT) if (L.tFrame == null) (L.tFrame = t), (L.fFrame = f);
          const z = LAT[LAT.length - 1];
          d.textContent =
            `F ${String(f).padStart(5, '0')}  ${(t - t0).toFixed(1).padStart(8)} ms` +
            (z ? `\n${z.in} → 出手 ${(z.tFire - z.tIn).toFixed(1)} ms` : '');
          requestAnimationFrame(loop);
        };
      requestAnimationFrame(loop);
      window.LATF0 = t0;
    }, touch);
    await p.waitForTimeout(600);
    /* 錄影：screencast 每張都有時間戳 */
    const dir = path.join(OUT, `lat_${W}x${H}_frames`),
      frames = [],
      cdp = await ctx.newCDPSession(p);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      const fn = path.join(dir, String(frames.length).padStart(5, '0') + '.png');
      fs.writeFileSync(fn, Buffer.from(data, 'base64'));
      frames.push({ fn, ts: metadata.timestamp });
      await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: W, maxHeight: H });
    await p.waitForTimeout(400);
    const press = async j => {
      await p.evaluate(() => ((P.act = null), (P.cds = {}), (P.mp = ST.mp)));
      if (touch) await p.touchscreen.tap(W / 2 + 60, 300);
      else if (j % 2) await p.mouse.click(W / 2 + 200, H / 2 - 60);
      else await p.keyboard.press('q');
      await p.waitForTimeout(700);
    };
    for (let j = 0; j < 6; j++) await press(j);
    await cdp.send('Page.stopScreencast');
    const lat = await p.evaluate(() =>
      LAT.map(L => ({
        slot: L.slot,
        in: L.in,
        by: L.by,
        fire: +(L.tFire - L.tIn).toFixed(1),
        frame: +(L.tFrame - L.tIn).toFixed(1),
        f: L.fFrame,
        ms: +(L.tFrame - LATF0).toFixed(1)
      }))
    );
    /* 依時間戳排成 60 fps（ffmpeg concat 每張的時長） */
    const list = frames
      .map((x, i) => {
        const dur = i + 1 < frames.length ? frames[i + 1].ts - x.ts : 1 / 60;
        return `file '${x.fn}'\nduration ${Math.max(1 / 600, dur).toFixed(4)}`;
      })
      .join('\n');
    const lf = path.join(dir, 'list.txt');
    fs.writeFileSync(lf, list + `\nfile '${frames[frames.length - 1].fn}'\n`);
    const mp4 = path.join(OUT, `latency_${W}x${H}.mp4`);
    execFileSync('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      lf,
      '-vf',
      'fps=60',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '18',
      '-movflags',
      '+faststart',
      mp4
    ]);
    const span = frames.length > 1 ? frames[frames.length - 1].ts - frames[0].ts : 0;
    all[`${W}x${H}`] = {
      lat,
      screencast: { frames: frames.length, seconds: +span.toFixed(2), fps: +(frames.length / (span || 1)).toFixed(1) },
      errs
    };
    fs.rmSync(dir, { recursive: true, force: true });
    for (const L of lat)
      console.log(
        `${L.fire <= 50 ? '✅' : '❌'} ${W}x${H} ${L.in} → 出手（${L.by}） ${L.fire} ms、畫出來 ${L.frame} ms（頁面 rAF F${L.f}，${L.ms} ms）`
      );
    console.log(
      `   screencast ${frames.length} 張／${span.toFixed(2)} 秒（平均 ${(frames.length / (span || 1)).toFixed(1)} fps）→ ${path.basename(mp4)}`
    );
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'latency.json'), JSON.stringify(all, null, 1));
  await b.close();
})();
