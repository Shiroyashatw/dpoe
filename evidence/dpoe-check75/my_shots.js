/* dpoe-check75 獨立截圖與量測（只讀、不改遊戲） */
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2],
  URL = 'http://localhost:8000/';
fs.mkdirSync(OUT, { recursive: true });
const res = {};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [W, H] of [
    [390, 844],
    [1280, 720]
  ]) {
    const mob = W < 900,
      tag = `${W}x${H}`,
      errs = [];
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
    await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL + '?test=chase&' + Date.now());
    await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
    await p.waitForFunction(() => !$('chase').hidden, null, { timeout: 20000 });
    /* 第一次掉王印：不額外等，給 artRepaint 最多 1 秒 */
    await p.waitForTimeout(1000);
    const ban = await p.evaluate(() => {
      const el = $('chase'),
        im = el.querySelector('img'),
        cs = getComputedStyle(el);
      return {
        imgs: el.querySelectorAll('img').length,
        imgLoaded: !!im && im.complete && im.naturalWidth > 0,
        emptyIc: el.querySelectorAll('span.ic').length,
        bg: cs.backgroundColor,
        name: (el.querySelector('b') || {}).textContent
      };
    });
    await p.screenshot({ path: `${OUT}/${tag}-first-banner.png` });
    await p.evaluate(() => chaseBnHide());
    const bm = await p.evaluate(() => {
      try {
        introStop();
      } catch (e) {}
      window.hurtPlayer = () => 0;
      closePanels();
      S.auto = 0;
      G.mobs = [];
      G.drops = [
        { chase: CHASE_POOL.trunk[0], t: 9, hold: 1e9, x: P.x - 40, y: P.y + 20, sx: P.x - 40, sy: P.y + 20 },
        { show: 'exalt', t: 9, hold: 1e9, x: P.x + 40, y: P.y + 20, sx: P.x + 40, sy: P.y + 20 }
      ];
      /* 柱芯：上色後 alpha 255 的像素裡出現最多次的顏色 */
      const core = k => {
        const c = beamSheet(cssv(k)),
          d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data,
          n = {};
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] === 255) n[[d[i], d[i + 1], d[i + 2]]] = (n[[d[i], d[i + 1], d[i + 2]]] || 0) + 1;
        return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 3);
      };
      return {
        chaseRgb: cssv('--rar-chase-rgb'),
        rareRgb: cssv('--rar-rare-rgb'),
        chaseHex: cssv('--rar-chase'),
        rareHex: cssv('--rar-rare'),
        chaseCore: core('--rar-chase-rgb'),
        rareCore: core('--rar-rare-rgb')
      };
    });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${tag}-beam.png` });
    let sheet = null;
    if (mob) {
      await p.evaluate(() => fmenuOpen('chase'));
      await p.waitForTimeout(900);
      await p.screenshot({ path: `${OUT}/${tag}-beam-halfsheet.png` });
      sheet = await p.evaluate(() => {
        const r = document.querySelector('#cv, canvas').getBoundingClientRect();
        const sh = [...document.querySelectorAll('.sheet, #fmenu, .fm, [class*=sheet]')]
          .map(e => e.getBoundingClientRect())
          .filter(q => q.height > 100 && q.top > 50)
          .map(q => Math.round(q.top));
        return { canvasTop: Math.round(r.top), sheetTops: sh, sceneTop: G.cam.y - cvH() / ZOOM / 2, beamBaseY: G.drops.map(d => d.y), zoom: ZOOM, cvH: cvH() };
      });
    }
    res[tag] = { ban, bm, sheet, errs };
    await ctx.close();
  }
  await b.close();
  console.log(JSON.stringify(res, null, 1));
  fs.writeFileSync(`${OUT}/measure.json`, JSON.stringify(res, null, 1));
})();
