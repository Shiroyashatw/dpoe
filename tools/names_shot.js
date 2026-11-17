const { chromium } = require('playwright');
/* M1 材料顯示名的截圖（數值實作規格第 1 節）：新存檔的資源條、營地卡的還差、打造鈕與還差、打造後的分解一句、商會匯率都寫「生鐵」；
   用法：先開本機伺服器，node tools/names_shot.js [網址] [寬] [高] [存哪]；只截不改 */
const URL = process.argv[2] || 'http://localhost:8000/',
  VW = +process.argv[3] || 390,
  VH = +process.argv[4] || 844,
  OUT = process.argv[5] || 'evidence/names',
  MOB = VW < 900;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({
    viewport: { width: VW, height: VH },
    hasTouch: MOB,
    isMobile: MOB,
    deviceScaleFactor: 2
  });
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?p=78&' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof treeInit === 'function');
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    localStorage.clear();
    S = newGame();
    try {
      introStop();
    } catch (e) {}
    proSkip();
    S.story.tips = 0;
    S.auto = 1;
    S.mat.mats['iron:1'] = 3;
    ST = stats();
    runNode(TRUNK_K[0]);
  });
  await p.waitForTimeout(1500);
  const open = async (tab, pre) => {
    await p.evaluate(
      ([tab, pre]) => {
        closePanels();
        if (pre) eval(pre);
        CRAFT.tab = tab;
        PANEL.ctab = tab;
      },
      [tab, pre]
    );
    if (MOB) await p.evaluate(() => navGo('craft'));
    else await p.evaluate(() => openPanel('craft'));
  };
  const txt = sel => p.evaluate(s => [...document.querySelectorAll(s)].map(e => e.textContent).join(' | '), sel);
  const res = {};
  /* 1. 營地總覽：資源條、鍛造台卡的還差 */
  await open('camp', "CAMPUI.open = 'forge'");
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/${VW}x${VH}_1_camp.png` });
  res.camp = await txt('#pcraft');
  /* 2. 打造：打造鈕與還差 */
  await open('make');
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/${VW}x${VH}_2_make_lack.png` });
  res.make = await txt('#pcraft');
  /* 3. 鐵夠了按打造：翻出來的分解一句 */
  await p.evaluate(() => {
    S.mat.mats['iron:1'] = 200;
    hudPanels();
  });
  await p.waitForTimeout(300);
  await p.click('#pcraft [data-fg=go]');
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/${VW}x${VH}_3_salvage.png` });
  res.salv = await txt('#preveal');
  /* 4. 商會：倉房 Lv4 */
  await p.click('#preveal [data-a=rvsalv]').catch(() => {});
  await p.waitForTimeout(800);
  await open('camp', "S.camp.store = 4; CAMPUI.open = 'store'; S.mat.mats['iron:1'] = 200");
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    const e = document.querySelector('#pcraft .ccopen');
    if (e) e.scrollIntoView({ block: 'center' });
  });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/${VW}x${VH}_4_trade.png` });
  res.trade = await txt('#pcraft .ccopen');
  const has = k => /生鐵/.test(res[k]) && !/鐵 T\d/.test(res[k]);
  for (const k in res)
    console.log(
      `${has(k) ? '✅' : '❌'} ${k}：${(res[k].match(/[^|]{0,30}生鐵[^|]{0,30}/g) || []).slice(0, 4).join(' ／ ')}`
    );
  console.log('頁面錯誤', errs.length, errs.slice(0, 3).join('\n'));
  await b.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
