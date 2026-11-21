const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [tag, url] of [['main', 'http://localhost:8001/'], ['branch', 'http://localhost:8000/']])
    for (const [w, h, mob] of [[390, 844, 1], [1280, 720, 0]]) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: !!mob, isMobile: !!mob, deviceScaleFactor: 2 });
      await ctx.route(/supabase/, r => r.abort());
      await ctx.addInitScript(() => { let a = 12345; Math.random = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x80000000); });
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await p.goto(url + '?p=7&' + Date.now());
      await p.evaluate(() => localStorage.clear());
      await p.reload();
      await p.waitForTimeout(1200);
      await p.evaluate(() => { proSkip(); S.story.tips = 0; S.auto = 1; });
      await p.waitForTimeout(4000);
      const bar = await p.evaluate(() => [...document.querySelectorAll('#bar .sk')].filter(e => e.getClientRects().length).map(e => e.dataset.k + (e.classList.contains('far') ? '(far)' : '')).join(' '));
      console.log('bar', bar);
      const info = await p.evaluate(() => ({ touch: TOUCH.on, port: document.body.classList.contains('port'), PORT: PORT(), orient: S.orient, ZOOM, C, scene: G.scene,
        rot: !!document.getElementById('rot'), tmenu: !!document.querySelector('.tmenu'),
        manifest: !!document.querySelector('link[rel=manifest]'), apple: !!document.querySelector('link[rel=apple-touch-icon]') }));
      await p.screenshot({ path: `${OUT}/${tag}_${w}x${h}.png` });
      console.log(tag, w + 'x' + h, JSON.stringify(info), errs.length ? 'ERR ' + errs.join('/') : 'no errors');
      await ctx.close();
    }
  await b.close();
})();
