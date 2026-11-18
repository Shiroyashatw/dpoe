const { chromium } = require(require.resolve('playwright',{paths:[process.cwd()]}));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [w, h] of [[390, 844], [1280, 720]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: w < 800, isMobile: w < 800 });
    await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8000/?' + Date.now());
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(1200);
    await p.evaluate(() => {
      proSkip();
      S.story.tips = 0;
      S.auto = 0;
      Object.assign(S.camp, { forge: 20, watch: 26, scout: 4, house: 10, altar: 11, store: 5 });
      S.maxT = 7;
      openPanel('asc');
      ASCUI.v = 'engineer';
      ASCUI.pick = 0;
      hudPanels();
    });
    await p.waitForTimeout(600);
    const txt = await p.evaluate(() => document.body.innerText);
    console.log(w, h, 'has 彈匣:', txt.includes('彈匣'), 'has 彈夾:', txt.includes('彈夾'), 'errs', errs);
    await p.screenshot({ path: `evidence/dpoe-mag-term/asc_${w}x${h}.png` });
    await ctx.close();
  }
  await b.close();
})();
