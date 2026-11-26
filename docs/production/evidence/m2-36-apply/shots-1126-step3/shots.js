/* 第 3 步改前改後截圖：node shots.js <URL> <輸出資料夾> <tag> */
const { chromium } = require('playwright');
const [URL, OUT, TAG] = process.argv.slice(2);
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const boot = async () => {
    await p.goto(URL + '?dbg=1&seed=7&' + Date.now());
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(1200);
    await p.evaluate(() => { proSkip(); S.story.tips = 0; S.auto = 0; });
  };
  const shot = async (name, fn, clip) => {
    await boot();
    await p.evaluate(fn);
    await p.waitForTimeout(400);
    await p.evaluate(() => { if (!DBG.frozen) { DBG.step(66); DBG.freeze(); } });
    await p.screenshot({ path: `${OUT}/${name}-1280x720-${TAG}.png`, clip });
  };
  /* 戰鬥：耐力球 3、暴擊球 3（能量球畫在主角頭上） */
  await shot('battle-charges', () => { DBG.biome('lava'); DBG.clear(); gainChg('e', 3); gainChg('p', 3); ST = stats(); });
  /* 命運輪盤六籤（狀態列）：點了輪盤、六種都放進 G.rou */
  await shot('roulette', () => { DBG.biome('lava'); DBG.clear(); S.asc = S.asc || {}; ST = stats(); ST.roulette = 1; G.rou = ['red', 'black', 'gold', 'green', 'blue', 'purple']; hudBar && hudBar(); });
  /* 火光：temple（紅燈籠內光、石燈籠窗、香頭火點）、lava（壁上火盆） */
  await shot('fire-temple', () => { DBG.biome('temple'); DBG.clear(); });
  await shot('fire-lava', () => { DBG.biome('lava'); DBG.clear(); });
  /* #chase 橫幅 */
  await shot('chase', () => { DBG.biome('lava'); DBG.clear(); const ck = CHASE_POOL.trunk[0]; chaseBn(ck); CB.hs = 1; clearTimeout(CB.tm); });
  /* 升級金圈 */
  await shot('lvup-ring', () => { DBG.biome('lava'); DBG.clear(); DBG.freeze(); fx({ k: 'ring', x: P.x, y: P.y, r: 120, col: PAL.dmgCrit, dur: 0.6 }); DBG.step(99); });
  console.log(TAG, 'errs', JSON.stringify(errs));
  await b.close();
})();
