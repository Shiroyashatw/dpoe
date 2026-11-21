/* X4 黑邊 alpha 的像素量測：同一個畫面，先截沒有環、再截只有一個環，measure.py 用兩張相除反推黑邊與環的 alpha。
   也畫一個敵方預警（teleCircle）與王閃現線，量它們對地面的對比，跟我方環黑邊比。用法：node x4.js <網址> <輸出資料夾> <前綴> */
const { chromium } = require('playwright');
const fs = require('fs');
const [URL, OUT, TAG] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.route(/supabase/, r => r.abort());
  await ctx.addInitScript(() => {
    let s = 12345;
    Math.random = () => ((s = (s * 1103515245 + 12345) % 2147483648), s / 2147483648);
    window.__reseed = v => (s = v);
  });
  const p = await ctx.newPage();
  await p.goto(URL + '?test=chase');
  await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => {
    try {
      introStop();
    } catch (e) {}
    closePanels();
    $('banner').hidden = true;
    S.auto = 0;
    window.requestAnimationFrame = () => 0;
    __reseed(4242);
    runNode(TRUNK_K[14], 1);
    const c0 = floorNear(G.W / 2, G.H / 2, 0, 400, 40) || { x: G.W / 2, y: G.H / 2 };
    P.x = c0.x;
    P.y = c0.y;
    G.cam.x = P.x;
    G.cam.y = P.y - 150; /* 環畫在玩家上方 150，避開角色 */
    G.mobs = [];
    G.drops = [];
    G.fx = [];
    G.tele = [];
    G.nums = [];
    G.ground = [];
    G.t = 10;
    const r = CV.getBoundingClientRect();
    return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), zoom: ZOOM, k: r.width / IW, has: { fxOwn: !!PAL.fxOwn, enemyTel: !!PAL.enemyTel } };
  });
  const clip = { x: info.cx - 120, y: info.cy - 120, width: 240, height: 240 };
  const shot = async (n, js) => {
    await p.evaluate(js => {
      G.fx = [];
      G.tele = [];
      __reseed(7);
      eval(js);
      draw();
    }, js);
    await p.screenshot({ path: `${OUT}/${TAG}-x4-${n}.png`, clip });
  };
  await shot('none', '');
  const kinds = [
    ['fxown', 'PAL.fxOwn'],
    ['fire', 'PAL.elFire'],
    ['enemytel', 'PAL.enemyTel || PAL.badHiV2'],
    ['default', 'undefined']
  ];
  for (const [n, col] of kinds)
    for (const t of [0, 0.3])
      await shot(`${n}-t${t}`, `G.fx=[{k:'ring',x:G.cam.x,y:G.cam.y+10,r:80,dur:1,col:${col},t:${t}}]`);
  /* 敵方預警：teleCircle（f=1）與王閃現線 */
  await shot('tele', `G.tele=[{x:G.cam.x,y:G.cam.y,r:80,t:0.8,dur:0.8,dmg:0}]`);
  fs.writeFileSync(`${OUT}/${TAG}-x4.json`, JSON.stringify({ info, clip }, null, 1));
  await b.close();
})();
