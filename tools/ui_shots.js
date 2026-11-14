/* 介面對照截圖（0.4.8，skill ui-design 的「改之前／改之後」）：新存檔跳過開場、倉庫塞 24 件、開第一個節點，依序截戰鬥、戰利品、說明框、角色、技能、做裝、天賦樹、更多、世界地圖。
   只截不改；用法：先開本機伺服器，node tools/ui_shots.js [寬 390] [高 844] [網址]；PW_CHROME 指定 Chrome；圖存系統暫存資料夾的 ui_shots */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs'),
  os = require('os');
const [W, H] = [+process.argv[2] || 390, +process.argv[3] || 844];
const URL = process.argv[4] || 'http://localhost:8003/';
const OUT = path.join(os.tmpdir(), 'ui_shots');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const mobile = W < 900;
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    hasTouch: mobile,
    isMobile: mobile,
    deviceScaleFactor: mobile ? 2 : 1
  });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?p=8&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    proSkip();
    S.story.tips = 0;
    for (let i = 0; i < 24; i++) invPut(S.inv, dropItem(i < 8 ? 5 : 3));
    S.mat.soul = 12000;
    for (const k in CUR) S.mat[k] = (S.mat[k] || 0) + 7;
  });
  const shot = async name => {
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(OUT, `${W}x${H}-${name}.png`) });
    console.log('📷', name);
  };
  const port = await p.evaluate(() => typeof PORT === 'function' && PORT());
  const open = k =>
    p.evaluate(
      ([port, k]) => {
        closePanels();
        port ? navGo(k) : openPanel(k);
      },
      [port, k]
    );
  /* 1 戰鬥 */
  await p.evaluate(() => runNode(TRUNK_K[0]));
  await p.waitForTimeout(5000);
  await shot('1戰鬥');
  /* 2 戰利品清單 */
  await open(port ? 'bag' : 'inv');
  await shot('2戰利品');
  /* 3 說明框：點清單第一件 */
  const row = await p.$('#pinv .bag > *');
  if (row) await row.evaluate(e => e.click());
  await shot('3說明框');
  /* 4 角色頁 */
  if (port) await open('char');
  else await p.evaluate(() => ((NAV.view = 'char'), hudPanels()));
  await shot('4角色');
  /* 5 技能總覽與這一招 */
  await open('skill');
  await shot('5技能總覽');
  const one = await p.$('#pskill [data-sk="go:one:0"]');
  if (one) await one.evaluate(e => e.click());
  await shot('6技能這一招');
  /* 7 做裝 */
  await open('craft');
  await shot('7做裝');
  /* 8 天賦樹 */
  await p.evaluate(() => {
    closePanels();
    treeOpen();
  });
  await shot('8天賦樹');
  await p.evaluate(() => treeClose());
  /* 9 地點／世界地圖 */
  if (port) await open('more'), await shot('9更多');
  await p.evaluate(() => {
    closePanels();
    openPanel('device');
  });
  await shot('10世界地圖');
  await p.evaluate(() => closePanels());
  /* 11 掉寶瞬間：加速打幾秒 */
  await p.waitForTimeout(4000);
  await shot('11戰鬥b');
  console.log('錯誤：', errs.length, errs.slice(0, 3));
  await b.close();
})();
