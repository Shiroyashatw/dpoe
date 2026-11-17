const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8000/', TAG = process.argv[3] || 'head', OUT = process.argv[4];
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const res = {};
  for (const [W, H] of [[375, 667], [390, 844], [1280, 720]]) {
    const mob = W < 900;
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
    await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL + '?test=chase&' + Date.now());
    await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
    await p.waitForTimeout(2000);
    await p.evaluate(() => { try { introStop(); } catch (e) {} closePanels(); G.loot = null; hideTip(); chaseBnHide(); $('banner').hidden = true;
      S.chase.got = {}; S.frags = {}; for (const k of ['wangyin_zhenyue','wangyin_chixiao','wangyin_jiting','wangyin_guixu']) (S.chase.got[k] = 1), (S.frags[k] = 2); CHSEL = null; navGo('more'); fmenuOpen('chase'); });
    await p.waitForTimeout(500);
    const m = await p.evaluate(() => {
      const R = e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom) }; };
      const pc = $('pchase');
      const cells = [...pc.querySelectorAll('.chc')].map(R);
      const leaf = [...pc.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim().startsWith('四印齊鳴'))[0];
      let line = leaf; // climb to row container outside grid
      while (line && line.parentElement !== pc && !line.parentElement.classList.contains('chg')) line = line.parentElement;
      const lr = leaf ? R(leaf) : null, rowr = line ? R(line) : null;
      const ov = (a, c) => Math.max(0, Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x)) * Math.max(0, Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y));
      const pr = R(pc), g = R(pc.querySelector('.chg'));
      const lastCellBottom = Math.max(...cells.map(c => c.b));
      const kids = [...pc.children].map(e => ({ cls: e.className || e.tagName, ...R(e), sw: e.scrollWidth, cw: e.clientWidth }));
      return { scrollHeight: pc.scrollHeight, clientHeight: pc.clientHeight, fits: pc.scrollHeight <= pc.clientHeight, panel: pr, grid: g, cells,
        sealText: leaf && leaf.textContent.trim(), sealLeaf: lr, sealRow: rowr,
        overlapLeafCells: cells.reduce((s, c) => s + ov(lr, c), 0), overlapRowGrid: ov(rowr, g),
        gapCellToSeal: lr.y - lastCellBottom, inPanel: kids.every(k => k.y >= pr.y - 1 && k.b <= pr.b + 1), hOverflow: kids.filter(k => k.sw > k.cw + 1).map(k => k.cls) };
    });
    m.errs = errs;
    res[`${W}x${H}`] = m;
    if (OUT) await p.screenshot({ path: `${OUT}/${TAG}_追逐物品_王印4種_${W}x${H}.png` });
    await ctx.close();
  }
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
