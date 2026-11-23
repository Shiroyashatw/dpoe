/* dpoe-camp-audit 量測腳本 4（只讀）：營地首頁 DOM 版面（對 M2-12 第二段 §2 表）。用法：node probe4.js 390 844 */
const { chromium } = require('playwright');
const fs = require('fs');
const [W, H] = [+process.argv[2] || 390, +process.argv[3] || 844], mob = W < H;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: mob, hasTouch: mob });
  const pg = await ctx.newPage();
  await pg.goto('http://localhost:8123/index.html');
  await pg.waitForFunction(() => typeof proSkip === 'function');
  await pg.evaluate(() => proSkip());
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => act('camp'));
  await pg.waitForTimeout(1500);
  const r = await pg.evaluate(() => {
    const q = s => [...document.querySelectorAll(s)].filter(e => e.offsetParent || getComputedStyle(e).position === 'fixed').map(e => {
      const b = e.getBoundingClientRect();
      return { s, txt: (e.innerText || '').replace(/\s+/g, ' ').slice(0, 60), rect: [b.left, b.top, b.right, b.bottom].map(Math.round), vis: getComputedStyle(e).visibility, hidden: e.hidden };
    });
    return {
      sel: ['#area', '#run [data-a=resume]', '#run', '#pidle', '#pnav', '#dnav', '.tmenu', '#pcline', '.bottom .mid'].flatMap(q),
      props: G.props.map(k => ({ k: k.k, n: k.n, plaque: k._pl && k._pl.L.join(' '), shown: !!k._pr, can: k._pl && k._pl.can })),
      zoom: ZOOM, viewWorldW: Math.round(IW / ZOOM)
    };
  });
  fs.writeFileSync(`${__dirname}/layout_${W}x${H}.json`, JSON.stringify(r, null, 1));
  console.log(JSON.stringify(r));
  await b.close();
})();
