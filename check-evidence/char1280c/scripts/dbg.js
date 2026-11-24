const { open, fixture } = require('./lib');
(async () => { const p = await open('http://localhost:8102/'); await p.keyboard.press('v'); await p.waitForTimeout(400);
  await p.click('#pinv [data-c="eq:helm"]'); await p.waitForTimeout(200);
  const fx = await p.evaluate(fixture); await p.waitForTimeout(200);
  console.log(fx, await p.evaluate(() => slotCands('helm').map(i => [i.id, BASEI[i.b].n, BASEI[i.b].lv, i.L, cantWear(i), itemDelta(i,'helm').why])));
  await p.hover(`#pinv [data-c="cand:${fx.A}"]`); await p.waitForTimeout(200);
  console.log(await p.evaluate(() => [CH.hov, $('pinv').querySelector('.c12p .l4').innerText, S.lv, JSON.stringify(BASEI[S.inv.items.find(x=>x.id===CH.hov).b]).slice(0,300)]));
  await p._b.close(); })();
