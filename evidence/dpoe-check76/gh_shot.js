const { chromium } = require('playwright');
const VW = +process.argv[2], VH = +process.argv[3], OUT = process.argv[4], MOB = VW < 900;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, hasTouch: MOB, isMobile: MOB, deviceScaleFactor: 2 });
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8000/?p=76&' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof treeInit === 'function');
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    localStorage.clear(); S = newGame();
    try { introStop(); } catch (e) {}
    proSkip(); S.story.tips = 0; S.auto = 0;
    S.camp.watch = CAMP.watch.length; S.lv = 25;
    S.gods = [{ g: 'rooster', p: 100, a: [{ k: 'life', T: 1, v: 50 }] }]; S.godOn = 0; ST = stats();
  });
  const info = await p.evaluate(() => {
    const h = lv => ((S.lv = lv), stats().hp);
    const on25 = h(25); S.godOn = null; const off25 = h(25); S.godOn = 0; const on26 = h(26); S.godOn = null; const off26 = h(26);
    S.lv = 25; S.godOn = 0; ST = stats();
    return { GH_LV, lv25_on_minus_off: on25 - off25, lv26_on_minus_off: on26 - off26 };
  });
  await p.evaluate(MOB => { closePanels(); if (MOB) navGo('char'); else { NAV.view = 'char'; openPanel('inv'); } }, MOB);
  await p.waitForTimeout(900);
  const sel = '#pinv .eqs.gh.lock';
  const lock = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { lk: e.dataset.lk, r: [r.left, r.top, r.width, r.height].map(Math.round), inView: r.top >= 0 && r.bottom <= innerHeight }; }, sel);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/神格鎖Lv25_${VW}x${VH}_1鎖住.png` });
  if (lock) { MOB ? await p.tap(sel) : await p.click(sel); }
  await p.waitForTimeout(250);
  const warn = await p.evaluate(() => ({ t: $('warn').textContent, on: $('warn').classList.contains('on') }));
  await p.screenshot({ path: `${OUT}/神格鎖Lv25_${VW}x${VH}_2點擊提示.png` });
  /* Lv26：格子不再鎖 */
  const lv26 = await p.evaluate(async () => { S.lv = 26; ST = stats(); hudPanels(); await new Promise(r => setTimeout(r, 300)); return { lock: !!document.querySelector('#pinv .eqs.gh.lock'), gh: !!document.querySelector('#pinv .eqs.gh') }; });
  const res = { size: `${VW}x${VH}`, info, lock, warn, lv26, errs };
  console.log(JSON.stringify(res, null, 1));
  const ok = info.lv25_on_minus_off === 0 && info.lv26_on_minus_off >= 50 && lock && warn.on && warn.t === '神格：角色到 Lv 26 才開' && !lv26.lock && lv26.gh && !errs.length;
  console.log(ok ? '✅ 神格 Lv26 鎖' : '❌ 神格 Lv26 鎖');
  await b.close(); process.exit(ok ? 0 : 1);
})();
