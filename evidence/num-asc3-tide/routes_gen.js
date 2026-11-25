/* num-asc3-tide：列出三個昇華 8 點的所有合法路線 → routes.json（simlib.js 的 routes：從 a_st 往外長、4 小 4 大、選擇組只拿一個）。先開本機伺服器 */
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://localhost:8000/?dbg=1&seed=1&p=9');
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof proSkip === 'function');
  await p.addScriptTag({ content: fs.readFileSync(__dirname + '/simlib.js', 'utf8') });
  const R = await p.evaluate(() => Object.fromEntries(['wind', 'iron', 'tide'].map(k => [k, __sim.routes(k, 8)])));
  fs.writeFileSync(__dirname + '/routes.json', JSON.stringify(R));
  console.log(Object.entries(R).map(([k, v]) => k + ' ' + v.length).join('、'));
  await b.close();
})();
