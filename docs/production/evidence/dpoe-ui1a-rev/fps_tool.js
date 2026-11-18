const { chromium } = require('playwright');
/* 每一格間隔（requestAnimationFrame）p50／p95 與 fps：戰鬥、開營地升級抽屜、王倒下（爆開＋光柱）、開角色頁（AI 繼續刷）。
   rate＝CPU 節流倍率（4＝中階機近似，模擬）。無頭 Chromium 用軟體畫，數字比真機差 */
const W = +process.argv[2] || 390,
  H = +process.argv[3] || 844,
  rate = +process.argv[4] || 1,
  PORTM = H > W;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: PORTM, isMobile: PORTM });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  await p.goto('http://localhost:8000/?dbg=1&seed=7&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1200);
  await p.evaluate(port => {
    proSkip();
    S.story.tips = 0;
    S.orient = port ? 'p' : 'l';
    applyOrient();
    S.auto = 1;
    runNode(TRUNK_K[0]);
  }, PORTM);
  await p.waitForTimeout(2000);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const fr = (setup, ms = 3000) =>
    p.evaluate(
      ([src, ms]) =>
        new Promise(r => {
          new Function(src)();
          const L = [];
          let l = performance.now();
          const t0 = l,
            step = t => {
              L.push(t - l);
              l = t;
              t - t0 < ms ? requestAnimationFrame(step) : (L.splice(0, 2), L.sort((a, b) => a - b), r({ p50: +L[L.length >> 1].toFixed(1), p95: +L[Math.floor(L.length * 0.95)].toFixed(1), fps: Math.round(1000 / (L.reduce((a, b) => a + b, 0) / L.length)), t: Math.round(G.t) }));
            };
          requestAnimationFrame(step);
        }),
      [setup, ms]
    );
  const out = {};
  out['戰鬥'] = await fr('');
  out['開營地升級抽屜（AI 繼續刷）'] = await fr("navGo('craft')");
  out['王倒下（爆開＋光柱＋追逐）'] = await fr("closePanels(); spawnBoss(); const m = G.mobs.find(x => x.boss); devChase(); killMob(m);", 2000);
  out['開角色頁（AI 繼續刷）'] = await fr("navGo('char')");
  console.log(`${W}x${H} CPU ${rate}×`, JSON.stringify(out));
  await b.close();
})();
