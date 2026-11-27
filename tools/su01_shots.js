/* SU-01 截圖：390×844 與 1280×720 各一組（掉落、倉庫格子、說明框、鍛造台擋下來的訊息）
   用法：先開本機伺服器（python3 -m http.server 8003），node tools/su01_shots.js [網址] [輸出資料夾] */
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.argv[2] || 'http://localhost:8003/',
  OUT = process.argv[3] || 'docs/production/evidence/SU-01/shots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  for (const [w, h, tag, mobile] of [
    [390, 844, '390', true],
    [1280, 720, '1280', false]
  ]) {
    const cx = await b.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 2,
      hasTouch: mobile,
      isMobile: mobile
    });
    await cx.route(/supabase/, r => r.abort());
    const p = await cx.newPage(),
      errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL + '?' + Date.now());
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(1500);
    const E = f => p.evaluate(f);
    const shot = async n => {
      await p.waitForTimeout(400);
      await p.screenshot({ path: `${OUT}/${tag}-${n}.png` });
    };
    /* 共用：跳過開場、回營地、材料與鍛造台等級；倉庫放 7 件樣板＋幾件稀有對照 */
    await E(() => {
      proSkip();
      S.story.tips = 0;
      S.auto = 0;
      S.lv = 60;
      S.camp.forge = 16;
      S.camp.store = 4;
      S.gold = 1e6;
      for (let T = 1; T <= 6; T++)
        for (const m of ['iron', 'leather', 'wood', 'silk', 'bone', 'cloth']) matAdd(m, T, 500);
      Object.assign(MAT(), { aug: 20, exalt: 5, holy: 3, corr: 3, whet: 5, plate: 5, conv: 2 });
      S.inv.items = [];
      for (const k of Object.keys(UNIQ)) invPut(S.inv, mkUniq(k, 9));
      for (let i = 0; i < 5; i++) invPut(S.inv, dropItem(9, 1));
      if (typeof enterCamp === 'function') enterCamp();
    });
    await p.waitForTimeout(800);

    /* 1. 掉落：打造鞋子，亂數先固定成 0 讓這一件變成傳奇，揭曉後全部翻開 */
    await E(() => {
      Object.assign(MK, { kind: 'boots', sys: 'armor', T: 6, n: 1 });
      CRAFT.tab = 'make';
      openPanel('craft');
      const rr = Math.random;
      Math.random = () => 0;
      try {
        craftGo();
      } finally {
        Math.random = rr;
      }
    });
    await p.waitForTimeout(600);
    await shot('1a-drop-reveal-back');
    await E(() => typeof rvFlipAll === 'function' && rvFlipAll(() => hudPanels()));
    await p.waitForTimeout(2500);
    await shot('1b-drop-reveal');
    /* 掉落紀錄（傳奇 ◈） */
    await E(() => {
      closePanels();
      if (typeof openFeat === 'function') openFeat('log');
      else openPanel('log');
    });
    await shot('1c-drop-log');

    /* 2. 倉庫格子 */
    await E(() => {
      closePanels();
      openPanel('inv');
    });
    await shot('2-stash-grid');

    /* 3. 說明框：滑過第一件傳奇（千羽） */
    const sel = await E(() => {
      const it = S.inv.items.find(x => x.u === 'qianyu');
      const el = document.querySelector(`[data-st="it:${it.id}"]`) || document.querySelector(`[data-id="${it.id}"]`);
      return el ? (el.dataset.st ? `[data-st="it:${it.id}"]` : `[data-id="${it.id}"]`) : '';
    });
    if (sel) {
      if (mobile) await p.tap(sel);
      else await p.hover(sel);
    }
    await shot('3-tooltip');
    /* 手機比較欄會捲：捲到底，看特色詞那一行 */
    const uq = await E(() => {
      for (const el of document.querySelectorAll('.cmpc ul, .cmpc > div, .cmpc'))
        if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight;
      return [...document.querySelectorAll('li.uq, p.uq')].filter(e => e.offsetParent).map(e => e.textContent);
    });
    console.log(tag, '特色詞列：', uq.join(' / '));
    await shot('3b-tooltip-scrolled');

    /* 4. 鍛造台：選這件傳奇，擋下來的訊息 */
    await E(() => {
      closePanels();
      const it = S.inv.items.find(x => x.u === 'tiexie');
      CRAFT.tab = 'forge';
      openPanel('craft');
      craftPick('inv', it);
      CRAFT.op = 'aug';
      hudPanels();
    });
    await shot('4-forge-lock');
    console.log(tag, 'errors:', errs.length ? errs.join(' | ') : 'none');
    await cx.close();
  }
  await b.close();
})();
