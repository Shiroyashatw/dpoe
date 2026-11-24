const { open, fixture } = require('./lib');
(async () => { const p = await open('http://localhost:8102/'); await p.keyboard.press('v'); await p.waitForTimeout(400); await p.click('#pinv [data-c="eq:helm"]'); await p.waitForTimeout(200); await p.mouse.move(300, 300); await p.waitForTimeout(200);
  await p.screenshot({ path: 'ev/states-1280x720/04-cands-no-popup.png' });
  console.log(JSON.stringify(await p.evaluate(() => [...$('pinv').querySelectorAll('.c12g .cq')].slice(0, 4).map(e => { const j = e.querySelector('.cj'); const r = (j || e).getBoundingClientRect(); return [j && j.textContent, r.x, r.y, r.width, r.height]; }))));
  await p._b.close(); })();
