/* SU-03 截圖：1280×720（skpanel12 懸停浮窗、名冊）與 390×844（skpanel.js 單招說明、挑招清單的「印記」分類）
   用法：先開本機伺服器，node docs/production/evidence/SU-03/shots.js [網址] ；圖存在本資料夾 */
const { chromium } = require('playwright');
const path = require('path');
const URL = process.argv[2] || 'http://localhost:8000/',
  OUT = __dirname;
/* 爪：連爪／血怒／盲擊撲／狂暴戰吼；能力值給夠 */
const setup = ([wt, ks]) => {
  introStop();
  proSkip();
  S.story.tips = 0;
  S.lv = 50;
  S.camp.altar = 8;
  S.camp.wts = Object.keys(WTN);
  S.eq.weapon = mkItem(BASES.filter(b => b.k === 'weapon' && b.wt === wt)[0].id, 1, 0);
  S.eq.off = null;
  S.eq.amulet = mkItem(BASES.find(b => b.k === 'amulet').id, 20, 2);
  S.eq.amulet.a = [{ k: 'attrA', v: 200, T: 1 }];
  ks.forEach((k, i) => (k && (S.lib.sk[k] = 5), (S.skills[i] = k ? { k, so: [null, null], n: 2 } : newSlot())));
  S.auras = [null];
  changed();
};
const SETS = {
  claw: ['claw', ['clawchain', 'bloodrage', 'blindpounce', 'warcry', null]],
  mace: ['mace', ['quake', 'leap', 'fissure', 'chargeslam', null]],
  axe: ['axe', ['axethrow', 'rend', null, null, null]],
  bow: ['bow', ['split', 'refract', 'gasarrow', null, null]],
  staff: ['staff', ['fireball', 'nova', 'venom', 'thunderstorm', 'profane']]
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const open = async (o, set) => {
    const ctx = await b.newContext(o);
    await ctx.route('**/*.supabase.co/**', r => r.abort());
    const p = await ctx.newPage();
    p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(URL + '?dbg=1&seed=5&' + Date.now());
    await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof treeInit === 'function');
    await p.waitForTimeout(500);
    await p.evaluate(setup, set);
    return p;
  };
  const txt = [];
  /* 1280×720：每組開技能面板，逐列懸停截浮窗 */
  for (const [nm, set] of Object.entries(SETS)) {
    const p = await open({ viewport: { width: 1280, height: 720 } }, set);
    await p.keyboard.press('g');
    await p.waitForTimeout(400);
    for (let i = 0; i < 4; i++) {
      if (!set[1][i]) continue;
      const row = p.locator(`#pskill [data-s="row:${i}"] .s-n`);
      if (!(await row.count())) continue;
      await row.hover();
      await p.waitForTimeout(150);
      const f = await p.evaluate(() => (document.querySelector('#pskill .s-f') || {}).innerText || '');
      txt.push(`[1280 ${set[1][i]}] ` + f.replace(/\n+/g, '｜'));
      if (['bloodrage', 'chargeslam', 'axethrow', 'refract', 'nova', 'rend'].includes(set[1][i]))
        await p.screenshot({ path: path.join(OUT, `1280x720-${set[1][i]}.png`) });
    }
    if (nm === 'claw') {
      /* 名冊：法術分類裡有 7 個印記（原本爪一個都沒有） */
      await p.mouse.move(10, 10);
      await p.click('#pskill [data-s="ros"]');
      await p.waitForTimeout(300);
      const f = p.locator('#pros button', { hasText: '法術' }).first();
      if (await f.count()) await f.click();
      await p.waitForTimeout(300);
      txt.push(
        '[1280 爪 名冊 法術] ' + (await p.evaluate(() => ($('pros') || {}).innerText || '')).replace(/\n+/g, '｜')
      );
      await p.screenshot({ path: path.join(OUT, '1280x720-claw-roster-marks.png') });
    }
    if (p.errs.length) txt.push('錯誤：' + p.errs.join(' | '));
    await p.context().close();
  }
  /* 390×844：技能頁 → 單招說明（血怒、蓄力重砸）；挑招清單點「印記」 */
  for (const [nm, set, i] of [
    ['claw', SETS.claw, 1],
    ['mace', SETS.mace, 3],
    ['axe', SETS.axe, 0],
    ['bow', SETS.bow, 1],
    ['staff', SETS.staff, 1]
  ]) {
    const q = await open(
      { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
      set
    );
    await q.evaluate(() => (closePanels(), navGo('skill')));
    await q.waitForTimeout(500);
    await q.evaluate(s => document.querySelector(s).click(), `#pskill [data-sk="go:one:${i}"]`);
    await q.waitForTimeout(400);
    txt.push(
      `[390 ${set[1][i]}] ` + (await q.evaluate(() => $('pskill').innerText)).replace(/\n+/g, '｜').slice(0, 900)
    );
    await q.screenshot({ path: path.join(OUT, `390x844-${set[1][i]}.png`) });
    if (nm === 'claw') {
      await q.evaluate(() => (closePanels(), navGo('skill')));
      await q.waitForTimeout(300);
      await q.evaluate(s => document.querySelector(s).click(), '#pskill [data-sk="go:skills:3"]');
      await q.waitForTimeout(400);
      const chip = q.locator('#pskill .sk-chips button', { hasText: '印記' });
      txt.push(
        '[390 爪 篩選] ' +
          (await q.evaluate(() =>
            [...document.querySelectorAll('#pskill .sk-chips button')].map(b => b.textContent).join('、')
          ))
      );
      if (await chip.count()) await chip.evaluate(b => b.click());
      await q.waitForTimeout(300);
      txt.push(
        '[390 爪 印記] ' +
          (await q.evaluate(() =>
            [...document.querySelectorAll('#pskill .sk-row b')].map(b => b.textContent).join('、')
          ))
      );
      await q.screenshot({ path: path.join(OUT, '390x844-claw-marks.png') });
      const ov = await q.evaluate(() => {
        const r = $('pskill').getBoundingClientRect();
        return [r.left, r.right, r.bottom, document.documentElement.scrollWidth - innerWidth];
      });
      txt.push('[390 面板邊界] ' + JSON.stringify(ov));
    }
    if (q.errs.length) txt.push('錯誤：' + q.errs.join(' | '));
    await q.context().close();
  }
  console.log(txt.join('\n'));
  await b.close();
})();
