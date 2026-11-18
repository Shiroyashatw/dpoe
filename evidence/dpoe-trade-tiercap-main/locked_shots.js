const { chromium } = require('/tmp/pw/node_modules/playwright');
const OUT = '/home/user/dpoe/evidence/dpoe-trade-tiercap-main/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME });
  for (const [w, h, touch] of [[390, 844, 1], [1280, 720, 0]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: !!touch, isMobile: !!touch });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8000/'); await p.waitForTimeout(1500);
    await p.evaluate(() => typeof proSkip === 'function' && proSkip()); await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      S.camp.store = 4;
      for (let x = 0; x <= 26; x++) { S.camp.watch = x; if (tierCap() === 2) break; }
      S.mat = newMat(); for (let T = 1; T <= 3; T++) { matAdd('iron', T, 5); matAdd('hide', T, 5); }
      CAMPUI.open = 'store'; CRAFT.tab = 'camp';
      PANEL.craft ? changed() : PORT() ? navGo('craft') : openPanel('craft');
      return tierCap();
    });
    await p.waitForTimeout(600);
    await p.evaluate(() => { const e = document.querySelector('[data-fg^="tr:"]'); e && e.scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(400);
    const info = await p.$$eval('[data-fg^="tr:"]', L => L.map(e => e.textContent + (e.disabled ? '(鎖)' : '')));
    await p.screenshot({ path: `${OUT}locked_${w}x${h}.png` });
    console.log(w + 'x' + h, 'tierCap=T' + r, info.join(' | '), 'errors=' + errs.length);
    await p.close();
  }
  await b.close();
})();
