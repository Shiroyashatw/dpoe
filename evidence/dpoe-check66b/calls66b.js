/* dpoe-check66b：記一幀 draw() 內 drawFx／drawFront／drawBars／drawNums／drawBeams／暗層（drawImage DARK）的先後；減少動態時跳數字的 y 不隨時間變 */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8000/?test=chase&r=' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => {
    window.requestAnimationFrame = () => 0;
    const ev = [];
    for (const n of ['drawFx', 'drawFront', 'drawBars', 'drawNums', 'drawBeams']) {
      const f = window[n];
      window[n] = eval(`(function ${n}(...a){ ev.push('${n}'); return f.apply(this, a); })`);
    }
    const di = CX.drawImage;
    CX.drawImage = function (im, ...a) { if (im === DARK) ev.push('DARK'); return di.call(this, im, ...a); };
    const out = {};
    for (const m of ['day', 'night', 'fog']) {
      G.night = m === 'night' ? G.t + 99 : 0; G.fog = m === 'fog' ? G.t + 99 : 0;
      ev.length = 0; draw(); out[m] = ev.join(' ');
    }
    CX.drawImage = di; G.night = G.fog = 0;
    /* 減少動態：同一個數字 t=0.02 與 t=0.5 畫的字級與 y 一樣 */
    const ft = CX.fillText, fs = [];
    CX.fillText = function (t, x, y) { if (t === 4321) fs.push([CX.font, y]); return ft.apply(this, arguments); };
    const rm = reduced();
    for (const t of [0.02, 0.5]) { G.nums = [{ x: P.x, y: P.y, v: 4321, c: 'crit', t }]; drawNums(); }
    CX.fillText = ft;
    out.reducedNums = { reduced: rm, fs };
    return out;
  });
  console.log(JSON.stringify(r, null, 1), 'errors', errs);
  await b.close();
})();
