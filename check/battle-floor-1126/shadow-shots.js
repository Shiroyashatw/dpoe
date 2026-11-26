/* 怪物腳下陰影改前改後截圖 1280×720（地板已是共用的 tile_d2_battle_floor）：node shadow-shots.js <網址> <輸出資料夾>
   同一個畫面先拍「加陰影前」（mobShadow 換回 main 的 shadow(m.x, m.y, m.r * 1.1)），再拍「加陰影後」（本輪 mobShadow）。
   怪：色差量測（measure.py）仍融進地板的 9 種，排在主角右邊 3×3 */
const { chromium } = require('playwright');
const fs = require('fs');
const [URL, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const SPOTS = [
  ['焦土坡', 't09-jiaotupo'],
  ['熔谷入口', 't11-ronggu-lava'],
  ['凍河口', 't13-donghekou']
];
const MOB_K = ['bear', 'cobra', 'tgolem', 'lgolem', 'fslime', 'tslime', 'slime', 'treefrog', 'hghost'];
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?dbg=1&seed=7&p=bfs1126');
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
  for (const [n, tag] of SPOTS) {
    const r = await p.evaluate(
      ([n, MOB_K]) => {
        DBG.resume();
        closePanels();
        runNode(TRUNK_K[TRUNK.findIndex(t => t.n === n)]);
        DBG.clear();
        G.bc = null;
        MOB_K.forEach((k, i) => {
          const m = spawnMob(MOBS[k], P.x + 150 + (i % 3) * 110, P.y - 90 + Math.floor(i / 3) * 100, 0, false);
          m.st = 'idle';
          m.aggro = 0;
        });
        return { n, biome: G.biome, mobs: G.mobs.map(m => m.D.sp) };
      },
      [n, MOB_K]
    );
    await p.waitForFunction(() => !!tileSet(G.biome), null, { timeout: 10000 });
    await p.evaluate(() => ((G.bc = null), delete HV.bhcur));
    await p.waitForTimeout(500);
    await p.evaluate(() => DBG.freeze());
    await p.waitForTimeout(200);
    const f1 = `${OUT}/shadow-before-${tag}.png`,
      f2 = `${OUT}/shadow-after-${tag}.png`;
    await p.evaluate(() => {
      window._ms = mobShadow;
      mobShadow = m => shadow(m.x, m.y, m.r * 1.1);
      draw();
    });
    await p.screenshot({ path: f1 });
    await p.evaluate(() => {
      mobShadow = window._ms;
      draw();
    });
    await p.screenshot({ path: f2 });
    res.push({ ...r, before: f1, after: f2 });
  }
  console.log(JSON.stringify({ res, errs, browser: 'Playwright Chromium ' + (await b.version()) }, null, 1));
  await b.close();
})();
