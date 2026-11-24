const { chromium } = require('/tmp/pw/node_modules/playwright');
(async () => {
  const [URL, OUT] = [process.argv[2], process.argv[3]];
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  await c.route(/supabase/, r => r.abort());
  const q = await c.newPage();
  await q.goto(URL + '?' + 1); await q.evaluate(() => localStorage.clear()); await q.reload(); await q.waitForTimeout(1500);
  await q.evaluate(() => { proSkip(); S.story.tips = 0; S.lv = 49; G.paused = 1; changed(); });
  await q.evaluate(() => (closePanels(), navGo('char'))); await q.waitForTimeout(800);
  const h = await q.evaluate(() => $('pinv').innerHTML.replace(/\d+/g, '#'));
  require('fs').writeFileSync(OUT + '.html', h);
  await q.locator('#pinv').screenshot({ path: OUT + '.png' });
  await q.screenshot({ path: OUT + '-full.png' });
  await b.close();
})();
