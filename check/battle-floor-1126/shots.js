/* 戰鬥地板改前改後截圖 1280×720：node shots.js <網址> <輸出資料夾> <before|after> */
const { chromium } = require('playwright');
const fs = require('fs');
const [URL, OUT, MODE] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
/* 地點：名字 → 改前（main 每張圖隨機）固定成哪種地形來對照 */
const SPOTS = [
  ['焦土坡', 'temple'],
  ['熔谷入口', 'lava'],
  ['凍河口', 'ice'],
  ['腐沼渡', 'tomb']
];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?dbg=1&seed=7&p=bf1126');
  await p.waitForFunction(() => typeof proSkip === 'function' && !!S && typeof DBG === 'object');
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    proSkip();
    S.auto = 0;
    S.world.done = TRUNK_K.slice();
    S.camp.watch = 99;
    S.lv = 99;
  });
  const res = [];
  for (const [n, bio] of SPOTS) {
    const r = await p.evaluate(
      ([n, bio, MODE]) => {
        const i = TRUNK.findIndex(t => t.n === n);
        DBG.resume && DBG.resume();
        closePanels();
        runNode(TRUNK_K[i]);
        const picked = G.biome;
        DBG.biome(MODE === 'before' ? bio : G.biome);
        DBG.clear();
        G.bc = null;
        return { n, g: TRUNK[i].g, picked, shown: G.biome, deco: G.deco.map(d => d.k) };
      },
      [n, bio, MODE]
    );
    await p.waitForFunction(() => !!tileSet(G.biome), null, { timeout: 10000 });
    await p.evaluate(
      () => ((G.bc = null), delete HV.bhcur)
    ); /* main 既有：bhCur 只在通貨變動時重畫地點名，截圖前清快取 */
    await p.waitForTimeout(800);
    await p.evaluate(() => DBG.freeze());
    await p.waitForTimeout(200);
    const f = `${OUT}/${MODE}-${r.shown}-${n}.png`;
    await p.screenshot({ path: f });
    res.push({ ...r, file: f });
  }
  console.log(JSON.stringify({ res, errs, ua: await b.version() }, null, 1));
  await b.close();
})();
