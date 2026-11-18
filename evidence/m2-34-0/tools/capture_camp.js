/* M2-34-0：#85（M2-12 藏身處併入營地）營地畫面的決定性截圖。步驟照 tools/m2_12_shots.js 的 1–7，
   只加 capture_det.js 的三件事（clock 暫停只用 runFor 推進、Math.random 固定種子、截圖前 CSS 動畫停在固定時間），
   讓 main 與分支兩次截圖可以逐像素比對。390×844（直立觸控）與 1280×720（桌機）各 7 張，存到 <輸出>/camp/。
   用法：node capture_camp.js <網址> <輸出資料夾> */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const URL = process.argv[2] || 'http://localhost:8000/',
  OUT = path.join(process.argv[3] || 'out', 'camp');
fs.mkdirSync(OUT, { recursive: true });
const INIT = () => {
  let a = 20261118;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const PIN = () =>
  document.getAnimations().forEach(an => {
    const t = an.effect && an.effect.getComputedTiming();
    an.pause();
    an.currentTime = t && isFinite(t.endTime) ? t.endTime : 1234;
  });
async function run(b, W, H) {
  const mob = W < 900,
    tag = `${W}x${H}`;
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: mob ? 3 : 1,
    hasTouch: mob,
    isMobile: mob
  });
  await ctx.route(/supabase/, r => r.abort());
  await ctx.addInitScript(INIT);
  await ctx.clock.install({ time: new Date('2026-11-18T12:00:00Z') });
  await ctx.clock.pauseAt(new Date('2026-11-18T12:00:01Z'));
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const wait = ms => p.clock.runFor(ms);
  const load = async () => {
    await p.goto(URL + '?p=9');
    await p.waitForFunction(() => typeof G === 'object' && !!G.scene && !!S, null, { timeout: 30000, polling: 100 });
    await p.evaluate(() => document.fonts.ready);
    await wait(1200);
  };
  const shot = async n => {
    await wait(250);
    await p.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 30000, polling: 100 });
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(PIN);
    await p.screenshot({ path: path.join(OUT, `${tag}_${n}.png`), animations: 'allow', caret: 'hide' });
    console.log('📷', tag, n);
  };
  await load();
  await p.evaluate(() => localStorage.clear());
  await load();
  await p.evaluate(mob => {
    try {
      introStop();
    } catch (e) {}
    proSkip();
    S.story.tips = 0;
    S.orient = mob ? 'p' : 'l';
    if (mob) setTouch(true);
    applyOrient();
    enterCamp();
  }, mob);
  await wait(800);
  await shot('1_camp');
  await p.evaluate(() => campPan(260));
  await wait(500);
  await shot('2_camp_pan');
  await p.evaluate(() => {
    G.pan = 0;
    runNode(TRUNK_K[0]);
  });
  await wait(1500);
  await p.evaluate(mob => (mob ? navGo('craft') : fmenuOpen('craft')), mob);
  await wait(800);
  await shot('3_map_camp_tab');
  await p.evaluate(() => closePanels());
  if (mob) await p.evaluate(() => campAsk());
  else await p.keyboard.press('t');
  await wait(400);
  await shot('4_ask');
  if (mob) await p.click('#over [data-a=camp]');
  else await p.keyboard.press('t');
  await wait(800);
  await shot('5_back_camp');
  await p.evaluate(() => {
    S.auto = 1;
    save();
  });
  await load();
  await shot('6_reload_camp');
  await p.evaluate(() => {
    const o = JSON.parse(JSON.stringify(S));
    Object.assign(o, { stopWhy: 'home', scene: 'hide', farm: 0, auto: 1 });
    o.savedAt = o.offAt = Date.now();
    localStorage.setItem(KEY + SLOT, JSON.stringify(o));
  });
  await load();
  await shot('7_old_save');
  console.log(errs.length ? '❌ 頁面錯誤 ' + errs.slice(0, 2).join(' | ') : '✅ 沒有頁面錯誤');
  await ctx.close();
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium' });
  await run(b, 390, 844);
  await run(b, 1280, 720);
  await b.close();
})();
