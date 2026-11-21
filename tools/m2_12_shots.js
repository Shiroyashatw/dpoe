/* M2-12 藏身處併入營地（邏輯切片）的截圖：390×844（直立、觸控）與 1280×720（桌機）各一組，只截、只驗狀態，不改遊戲。
   1 停在營地 2 營地裡拖鏡頭（主角不動） 3 刷圖中開營地分頁（上方仍是戰鬥） 4 T 回營地的確認卡（手機是 ☰ →回營地）
   5 回營地後停在營地（刷圖暫停） 6 重新整理仍停在營地 7 舊存檔（停在藏身處、stopWhy 'home'、scene 'hide'）載入轉成營地
   用法：先開本機伺服器（python3 -m http.server 8000），node tools/m2_12_shots.js [輸出資料夾，預設 evidence/dpoe-m2-12] [網址]；PW_CHROME 指定 Chrome */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const OUT = process.argv[2] || path.join(__dirname, '..', 'evidence', 'dpoe-m2-12'),
  URL = process.argv[3] || 'http://localhost:8000/';
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const ok = (c, n, v = '') => {
  if (!c) fail++;
  console.log(`${c ? '✅' : '❌'} ${n}`, typeof v === 'string' ? v : JSON.stringify(v));
};
async function run(b, W, H) {
  const mob = W < 900 && H > W,
    tag = `${W}x${H}`;
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    hasTouch: mob,
    isMobile: mob
  });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const load = async () => {
    await p.goto(URL + '?p=9&' + Date.now());
    await p.waitForFunction(() => typeof G === 'object' && !!G.scene && !!S);
    await p.waitForTimeout(1200);
  };
  const shot = n => p.screenshot({ path: path.join(OUT, `${tag}_${n}.png`) });
  await load();
  await p.evaluate(() => localStorage.clear());
  await load();
  await p.evaluate(mob => {
    proSkip();
    S.story.tips = 0;
    S.orient = 'p';
    if (mob) setTouch(true);
    applyOrient();
    enterCamp();
  }, mob);
  await p.waitForTimeout(800);
  ok((await p.evaluate(() => G.scene)) === 'camp', `${tag} 1 停在營地`);
  await shot('1_camp');
  /* 2 拖鏡頭：直接用 campPan（跟拖曳、A／D 同一個入口），主角不動 */
  await p.evaluate(() => campPan(260));
  await p.waitForTimeout(500);
  ok(
    await p.evaluate(() => G.cam.x > P.x + 100 && P.x === HIDE_ART.spawn.x),
    `${tag} 2 拖鏡頭：鏡頭右移、主角在站位`,
    await p.evaluate(() => [Math.round(G.cam.x), P.x])
  );
  await shot('2_camp_pan');
  /* 3 刷圖中開營地分頁 */
  await p.evaluate(() => {
    G.pan = 0;
    runNode(TRUNK_K[0]);
  });
  await p.waitForTimeout(1500);
  await p.evaluate(mob => (mob ? navGo('craft') : fmenuOpen('craft')), mob);
  await p.waitForTimeout(800);
  ok(
    await p.evaluate(
      () => G.scene === 'map' && PANEL.craft && CRAFT.tab === 'camp' && !G.props.some(q => q.k === 'device')
    ),
    `${tag} 3 刷圖中開營地分頁：上方仍是戰鬥`
  );
  await shot('3_map_camp_tab');
  await p.evaluate(() => closePanels());
  /* 4 T 回營地：確認卡（手機從 ☰ 的「回營地」） */
  if (mob) await p.evaluate(() => campAsk());
  else await p.keyboard.press('t');
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => G.ask === 'camp' && /回營地/.test($('over').textContent)), `${tag} 4 回營地確認卡`);
  await shot('4_ask');
  if (mob) await p.click('#over [data-a=camp]');
  else await p.keyboard.press('t');
  await p.waitForTimeout(800);
  ok(
    await p.evaluate(() => G.scene === 'camp' && S.stopWhy === 'camp' && /繼續刷/.test($('run').textContent)),
    `${tag} 5 回營地後停在營地（刷圖暫停）`
  );
  await shot('5_back_camp');
  /* 6 重新整理（自動模式也一樣）仍停在營地 */
  await p.evaluate(() => {
    S.auto = 1;
    save();
  });
  await load();
  ok(await p.evaluate(() => G.scene === 'camp'), `${tag} 6 刷圖暫停重新整理：停在營地`);
  await shot('6_reload_camp');
  /* 7 舊存檔：停在藏身處 */
  await p.evaluate(() => {
    const o = JSON.parse(JSON.stringify(S));
    Object.assign(o, { stopWhy: 'home', scene: 'hide', farm: 0, auto: 1 });
    o.savedAt = o.offAt = Date.now();
    localStorage.setItem(KEY + SLOT, JSON.stringify(o));
  });
  await load();
  ok(
    await p.evaluate(() => G.scene === 'camp' && S.stopWhy === 'camp' && !('scene' in S)),
    `${tag} 7 舊存檔（藏身處）載入：轉成營地、停在營地`
  );
  await shot('7_old_save');
  ok(!errs.length, `${tag} 沒有頁面錯誤`, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  await run(b, 390, 844);
  await run(b, 1280, 720);
  await b.close();
  console.log(fail ? `❌ ${fail} 項沒過` : '全部通過');
  process.exit(fail ? 1 : 0);
})();
