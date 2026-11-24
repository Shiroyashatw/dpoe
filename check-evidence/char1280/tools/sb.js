const { chromium } = require('/tmp/pw/node_modules/playwright');
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.route(/supabase/, r => r.abort());
  await p.goto('http://localhost:8002/?' + 3); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => { proSkip(); S.story.tips = 0; S.lv = 49; S.asc='wind';
    for (const e of EQS) { if (e.k==='ring3') continue; const B = BASES.filter(b => b.k === e.t && b.lv <= 30); if (B.length) S.eq[e.k] = mkItem(B[B.length-1].id, 30, 2); }
    const H = BASES.filter(b => b.k === 'helm'); for (let i = 0; i < 14; i++) invPut(S.inv, mkItem(H[i % H.length].id, 10 + i * 3, 2)); changed(); });
  await p.keyboard.press('v'); await p.waitForTimeout(300);
  const sw = q => p.evaluate(q => { const e = document.querySelector(q); const r=e.getBoundingClientRect(); return { sbw: e.offsetWidth - e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight, x: r.x, w: r.width }; }, q);
  console.log('stats list', JSON.stringify(await sw('#pinv .c12l')));
  await p.screenshot({ path: process.argv[2] + '/01-asc.png' });
  // 點戰場關選單
  const row = await p.evaluate(() => { const r = document.querySelector('#pinv .cr').getBoundingClientRect(); return [r.x + 40, r.y + 10]; });
  await p.mouse.click(row[0], row[1], { button: 'right' }); await p.waitForTimeout(100);
  console.log('menu open', await p.evaluate(() => !!$('pinv').querySelector('.cmenu')));
  for (const [x, y] of [[300, 300], [400, 650], [640, 20]]) { await p.mouse.click(x, y); await p.waitForTimeout(100); console.log('after click', x, y, 'menu still', await p.evaluate(() => !!$('pinv').querySelector('.cmenu')), 'panel', await p.evaluate(() => PANEL.inv)); if (!(await p.evaluate(() => PANEL.inv))) { await p.keyboard.press('v'); await p.waitForTimeout(200);} }
  await p.click('#pinv [data-c="eq:helm"]'); await p.waitForTimeout(200);
  console.log('cand grid', JSON.stringify(await sw('#pinv .c12g')));
  console.log('cns', await p.evaluate(() => $('pinv').querySelector('.cns').textContent), 'cand count', await p.evaluate(() => document.querySelectorAll('#pinv .c12g .cq').length), 'blank', await p.evaluate(() => [...document.querySelectorAll('#pinv .c12g .cq')].filter(e => !e.querySelector('.cj')).length));
  // 點不能穿的候選
  const r = await p.evaluate(() => { const e = [...document.querySelectorAll('#pinv .c12g .cq')].find(e => !e.querySelector('.cj')); if (!e) return null; e.scrollIntoView(); const r = e.getBoundingClientRect(); return [r.x + 30, r.y + 30, e.dataset.c]; });
  if (r) { await p.mouse.move(r[0], r[1]); await p.waitForTimeout(100); console.log('unwearable popup l4', await p.evaluate(() => ($('pinv').querySelector('.c12p .l4') || {}).innerText)); }
  // X 沒選格時
  await b.close();
})();
