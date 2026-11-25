const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  await p.goto('http://localhost:8003/?' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1500);
  await p.evaluate(() => { proSkip(); S.auto = 1; Object.assign(S.camp, { forge: 15, watch: 12, scout: 2, altar: 6, store: 2 }); MAT().soul = 1e6; changed(); });
  await p.evaluate(() => runNode(TRUNK_K[0]));
  await p.waitForTimeout(1500);
  await p.keyboard.press('h');
  await p.waitForTimeout(400);
  const at = () => p.evaluate(() => { const a = document.activeElement; const c = a && a.closest && a.closest('.c12c'); return (c ? c.id : a.tagName + '.' + a.className) + ' fv=' + a.matches(':focus-visible') + ' key=' + ($('c12key') && !$('c12key').hidden ? $('c12key').style.top : 'hidden'); });
  console.log('open', await at());
  for (const k of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) { await p.keyboard.press(k); await p.waitForTimeout(120); console.log(k, await at()); }
  await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  console.log('Enter ->', await p.evaluate(() => CDR.one), await at());
  console.log('paused?', await p.evaluate(() => worldPaused()), 'auto', await p.evaluate(() => S.auto));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  console.log('Esc ->', await p.evaluate(() => [CDR.one, PANEL.camp]), await at());
  await b.close();
})();
