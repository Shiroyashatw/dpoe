/* SU-02 詞綴池擴充的驗收截圖：有複合詞綴的裝備說明框、鍛造台的詞綴列；390×844（觸控、點一下）與 1280×720（滑鼠停留）。
   用法：先開本機伺服器，PW_CHROME=<chromium> node tools/su02_shots.js [網址 http://localhost:8000/] [輸出資料夾 docs/production/evidence/SU-02] */
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path');
const URL = process.argv[2] || 'http://localhost:8000/',
  OUT = process.argv[3] || path.join(__dirname, '..', 'docs/production/evidence/SU-02');
fs.mkdirSync(OUT, { recursive: true });
/* 頁面裡：跳過開場、手動、開鍛造台；做一件有複合詞的稀有胸甲（前綴：護甲＋生命、護甲%＋能量護盾%、最大生命%；後綴：火冰抗、耐力球上限、暈眩恢復）並放進倉庫 */
const SETUP = () => {
  proSkip();
  S.story.tips = 0;
  S.auto = 0;
  S.camp.forge = 18;
  S.camp.store = 4;
  S.gold = 99999;
  const it = mkItem(BASES.find(b => b.k === 'chest' && b.lv >= 12).id, 16, 2);
  it.a = [
    rollAffT('h_arLife', 1),
    rollAffT('h_arEsP', 2),
    rollAffT('hpP', 1),
    rollAffT('h_resFC', 1),
    rollAffT('chg_e', 2),
    rollAffT('stunRec', 3)
  ];
  delete it.uid;
  invPut(S.inv, it);
  window.SU = it;
  return it.a.map(affText);
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const errs = [];
  for (const [w, h, mob] of [
    [1280, 720, 0],
    [390, 844, 1]
  ]) {
    const p = await b.newPage({
      viewport: { width: w, height: h },
      deviceScaleFactor: 2,
      ...(mob ? { hasTouch: true, isMobile: true } : {})
    });
    p.on('pageerror', e => errs.push(`${w}×${h} ${e.message}`));
    await p.goto(URL);
    await p.waitForTimeout(2500);
    const txt = await p.evaluate(SETUP);
    /* 1. 說明框：開倉庫，桌機滑鼠停在那一格、手機點一下 */
    await p.evaluate(() => openPanel('inv'));
    await p.waitForTimeout(600);
    /* 桌機倉庫（stash12.js）的格子是 data-st="it:id"、比較浮窗 .stp；直立（觸控）是 hud.js 的 .it[data-id]、說明框 #tip */
    const sel = await p.evaluate(() => {
      const s = [`[data-st="it:${SU.id}"]`, `.it[data-id="${SU.id}"]`].find(x => document.querySelector(x));
      s && document.querySelector(s).scrollIntoView({ block: 'center' });
      return s || '';
    });
    if (!sel) throw new Error('倉庫裡找不到那件');
    if (mob) await p.tap(sel);
    else await p.hover(sel);
    await p.waitForTimeout(500);
    const tip = await p.evaluate(() =>
      [...document.querySelectorAll('#tip:not([hidden]), .stp')].map(e => e.innerText).join('\n')
    );
    await p.screenshot({ path: path.join(OUT, `tip_${w}x${h}.png`) });
    /* 直立：比較卡的詞綴清單會捲，另截一張捲到後綴的 */
    if (mob) {
      await p.evaluate(() => {
        const L = [...document.querySelectorAll('.cmpc li')].filter(e => /抗性/.test(e.textContent));
        L.length && L[0].scrollIntoView({ block: 'center' });
      });
      await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(OUT, `tip_${w}x${h}_rows.png`) });
    }
    /* 2. 鍛造台：把這件放上去，看詞綴列（淬鍊頁會列每條的百分位） */
    await p.evaluate(() => (typeof hideTip === 'function' && hideTip(), closePanels && closePanels()));
    await p.evaluate(() => {
      CRAFT.tab = 'forge';
      openPanel('craft');
      craftPick('inv', SU);
    });
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(OUT, `forge_${w}x${h}.png`) });
    if (mob) {
      await p.evaluate(() => {
        const L = [...document.querySelectorAll('#pcraft li')].filter(e => /抗性/.test(e.textContent));
        L.length && L[0].scrollIntoView({ block: 'center' });
      });
      await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(OUT, `forge_${w}x${h}_rows.png`) });
    }
    const fg = await p.evaluate(() => (document.getElementById('pcraft') || {}).innerText || '');
    console.log(
      `${w}×${h}\n詞綴：${txt.join('｜')}\n說明框有兩個數字的行：${tip
        .split('\n')
        .filter(l => /、/.test(l))
        .join('｜')}\n鍛造台有兩個數字的行：${fg
        .split('\n')
        .filter(l => /、/.test(l) && /\d/.test(l))
        .join('｜')}`
    );
    await p.close();
  }
  console.log(errs.length ? '頁面錯誤：' + errs.join('；') : '沒有頁面錯誤');
  await b.close();
})();
