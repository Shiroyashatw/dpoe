const { chromium } = require('/tmp/pw/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  await p.goto('http://localhost:8000/?dbg=1&seed=3&' + Date.now());
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForFunction(() => typeof proSkip === 'function'); await p.waitForTimeout(800);
  const r = await p.evaluate(async () => {
    proSkip(); S.story.tips = 0; S.auto = 0;
    for (const k of CAMP_B) S.camp[k] = Math.max(1, Math.min(campMax(k) - 1, 3));
    S.mat.soul = 1e9; hudBar(); closePanels(); CRAFT.tab = 'camp'; CAMPUI.open = null; openPanel('craft');
    await new Promise(r => setTimeout(r, 700));
    const sc = $('pcraft'), out = [];
    const L = [...document.querySelectorAll('#pcraft [id^="cc-"] button')];
    for (const [i, el0] of L.entries()) {
      const id = el0.closest('[id^="cc-"]').id;
      let el = el0; el.scrollIntoView({ block: 'center' });
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      el = document.querySelectorAll('#pcraft [id^="cc-"] button')[i];
      const q = el.getBoundingClientRect(), z = sc.getBoundingClientRect();
      const at = document.elementFromPoint((q.left + q.right) / 2, (q.top + q.bottom) / 2);
      /* 再用「捲動區中間」重量 */
      sc.scrollTop += (q.top + q.bottom) / 2 - (z.top + z.bottom) / 2;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      el = document.querySelectorAll('#pcraft [id^="cc-"] button')[i];
      const q2 = el.getBoundingClientRect();
      const at2 = document.elementFromPoint((q2.left + q2.right) / 2, (q2.top + q2.bottom) / 2);
      out.push({ id, y: Math.round(q.top), cover: el.contains(at) ? '' : (at && (at.id || at.className || at.tagName)), sc: [Math.round(z.top), Math.round(z.bottom)], y2: Math.round(q2.top), h2: q2.height, hit2: el.contains(at2) });
    }
    return out;
  });
  console.log(JSON.stringify(await p.evaluate(()=>{const h=document.querySelector('#pcraft .cmhead').getBoundingClientRect(),z=document.getElementById('pcraft').getBoundingClientRect();return {headTop:h.top,headBottom:h.bottom,scTop:z.top,scBottom:z.bottom}})));
  console.log('捲動區中間重量：', r.length, '顆，命中', r.filter(x => x.hit2).length, '，高度', [...new Set(r.map(x => x.h2))]);
  await b.close();
})();
