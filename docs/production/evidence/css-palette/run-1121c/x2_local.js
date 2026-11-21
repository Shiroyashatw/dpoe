/* X2 補量：skills.js 約 2195 行的環用到區域變數 col、D.el，measure.js 的通用求值帶不進去，這裡照原始碼的式子逐元素觸發。
   用法：node x2_local.js <網址> <前綴> <輸出 json> */
const { chromium } = require('playwright');
const fs = require('fs');
const [URL, TAG, OUTF] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const p = await (await b.newContext()).newPage();
  await p.route(/supabase/, r => r.abort());
  await p.goto(URL + '?test=chase');
  await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
  const r = await p.evaluate(TAG => {
    const out = [],
      real = window.fxs;
    let got = [];
    window.fxs = (n, ...a) => (got.push(n), real(n, ...a));
    for (const el of [undefined, 'phys', 'fire', 'cold', 'light', 'chaos']) {
      const D = { el },
        col = { cold: PAL.elCold, light: PAL.elLight, fire: PAL.elFire }[D.el] || PAL.hlV2;
      got = [];
      const o = { k: 'ring', x: P.x, y: P.y, r: 80, dur: 0.35, col };
      if (TAG === 'branch') o.sh = ELSH[D.el];
      fx(o);
      out.push({ el: String(el), col, sheet: got[0] || null });
    }
    window.fxs = real;
    return out;
  }, TAG);
  fs.writeFileSync(OUTF, JSON.stringify(r, null, 1));
  console.log(TAG, JSON.stringify(r));
  await b.close();
})();
