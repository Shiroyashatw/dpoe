const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  await p.goto('http://localhost:8003/?' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => { proSkip(); });
  await p.waitForTimeout(1000);
  const info = await p.evaluate(() => {
    window.__mat = []; const o = num;
    window.num = function (x, y, v, c, t) { if (c === 'mat') __mat.push({ T: performance.now(), x, y, t, sx: null }); return o.apply(this, arguments); };
    return { cur: S.world && S.world.cur, auto: S.auto, dmgN: typeof dmgN === 'function' ? dmgN() : null };
  });
  console.log('state', JSON.stringify(info));
  let shot = 0;
  for (let i = 0; i < 90 && shot < 2; i++) {
    await p.waitForTimeout(500);
    const act = await p.evaluate(() => G.nums.filter(n => n.c === 'mat').map(n => n.txt));
    if (act.length >= 2) { await p.screenshot({ path: `${OUT}/F-floater-1280-${++shot}.png` }); console.log('shot', shot, JSON.stringify(act)); await p.waitForTimeout(3000); }
  }
  const r = await p.evaluate(() => {
    const cam = (typeof G !== 'undefined' && G.cam) ? G.cam : null;
    return { n: __mat.length, sample: __mat.slice(0, 15).map(m => m.t), spanS: __mat.length ? (__mat[__mat.length-1].T - __mat[0].T)/1000 : 0,
      feed: [...document.querySelectorAll('*')].filter(e => /拾取|撿取|pickup|lootfeed|feed/i.test(e.id + ' ' + e.className)).map(e => e.id || e.className).slice(0,10),
      settings: typeof dmgN==='function' ? dmgN() : null };
  });
  console.log(JSON.stringify(r));
  // screen position of mat floaters relative to screen center: compute from current nums
  await b.close();
})();
