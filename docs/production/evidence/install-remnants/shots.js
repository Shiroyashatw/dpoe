/* 390×844 觸控：模擬 fullscreenEnabled false／true 各截一張「更多」面板。先開 python3 -m http.server 8000 */
const { chromium } = require('playwright'),
  path = require('path');
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  for (const v of [false, true]) {
    const cx = await b.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2
    });
    await cx.route(/supabase/, r => r.abort());
    await cx.addInitScript(v => {
      Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => v, configurable: true });
      Object.defineProperty(Document.prototype, 'webkitFullscreenEnabled', { get: () => v, configurable: true });
    }, v);
    const p = await cx.newPage();
    await p.goto('http://localhost:8000/?' + Date.now());
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      proSkip();
      openPanel('more');
      hudPanels();
      return { fsOK: fsOK(), tfs: !$('tfs').hidden, row: !!$('pmore').querySelector('[data-tm="fs"]') };
    });
    await p.waitForTimeout(400);
    console.log(`fullscreenEnabled=${v}`, JSON.stringify(r));
    await p.screenshot({ path: path.join(__dirname, `more_fs_${v}_390x844.png`) });
    await cx.close();
  }
  await b.close();
})();
