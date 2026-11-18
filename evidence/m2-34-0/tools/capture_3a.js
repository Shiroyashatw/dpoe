/* M2-34-0 × 3a 決定性截圖：畫面與步驟照 tools/m2_34_3a_shots.js（full 模式），只改成可以逐像素比對：
   Playwright clock 暫停、只用 runFor 推進；Math.random 固定種子；截圖前 CSS 動畫停在固定時間點。
   另截缺圖退回（390×844、1280×720，1280 含四種地形），涵蓋程式畫的牆與地板。
   用法：node capture_3a.js <網址> <輸出資料夾>；輸出 <輸出>/3a/<尺寸>-<畫面>.png，接著 compare.py 一起比 */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const URL = process.argv[2] || 'http://localhost:8000/',
  OUT = path.join(process.argv[3] || path.join(__dirname, '..', 'raw'), '3a');
fs.mkdirSync(OUT, { recursive: true });
const SIZES = [
  [390, 844],
  [1280, 720],
  [375, 667],
  [844, 390],
  [1440, 900]
];
const INIT = () => {
  let a = 20261117;
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
const scene = p =>
  p.evaluate(() => {
    try {
      introStop();
    } catch (e) {}
    window.hurtPlayer = () => 0;
    closePanels();
    chaseBnHide();
    $('banner').hidden = true;
    S.auto = 0;
    P.x = 4 * TS;
    P.y = 3.2 * TS;
    G.cam.x = P.x;
    G.cam.y = P.y;
    G.mobs.slice(0, 4).forEach((m, i) => {
      m.x = P.x + 90 + i * 50;
      m.y = P.y + 40 + (i % 2) * 50;
      m.hp = m.mhp * (0.4 + i * 0.1);
    });
    const c = G.drops.find(d => d.chase);
    for (const d of G.drops) d.hold = 1e9;
    if (c) (c.x = c.sx = P.x - 70), (c.y = c.sy = P.y + 40);
    G.drops.push({
      show: Object.keys(CUR)[0],
      t: 1,
      x: P.x + 40,
      y: P.y + 110,
      sx: P.x + 40,
      sy: P.y + 110,
      hold: 1e9
    });
  });
const nums = p =>
  p.evaluate(() => {
    G.nums = [];
    G.mobs.slice(0, 4).forEach((m, i) => num(m.x, m.y - m.sz, 120 + i * 37, i === 1 ? 'crit' : 'hit'));
  });
async function run(b, W, H, FB) {
  const mob = W < 900,
    tag = FB ? `${W}x${H}-fallback` : `${W}x${H}`,
    errs = [];
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
  await ctx.route(/supabase/, r => r.abort());
  /* 缺圖退回（程式畫的地板、牆、舊特效）：地磚、王印拼條、招牌特效都擋掉 */
  if (FB) await ctx.route(/img\/(tiles\/|ic_wy(32|16)\.|fx\/sig_)/, r => r.abort());
  await ctx.addInitScript(INIT);
  await ctx.clock.install({ time: new Date('2026-11-17T12:00:00Z') });
  await ctx.clock.pauseAt(new Date('2026-11-17T12:00:01Z'));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  const wait = ms => p.clock.runFor(ms);
  const until = async f => {
    for (let i = 0; i < 300; i++) {
      if (await p.evaluate(f)) return;
      await wait(100);
      await p.waitForTimeout(20);
    }
    throw new Error('等不到 ' + f);
  };
  const shot = async name => {
    await wait(50);
    await p.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 30000 });
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(PIN);
    await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, animations: 'allow', caret: 'hide' });
    console.log('📷', tag, name);
  };
  await p.goto(URL + '?test=chase');
  await until(
    FB
      ? () => typeof G === 'object' && G.scene === 'map'
      : () => typeof G === 'object' && G.scene === 'map' && !!tileSet(G.biome)
  );
  if (FB) await p.waitForTimeout(1000);
  await wait(2500);
  await scene(p);
  await wait(1200);
  await nums(p);
  await wait(150);
  await shot('day');
  await p.evaluate(() => (G.night = G.t + 999));
  await nums(p);
  await wait(150);
  await shot('night');
  await p.evaluate(() => (G.night = 0));
  if (W === 1280)
    for (const bio of ['temple', 'lava', 'tomb', 'ice']) {
      await p.evaluate(bio => ((G.biome = bio), (G.bc = null), tileSet(bio)), bio);
      if (FB) await p.waitForTimeout(500);
      else await until(new Function(`return !!tileSet('${bio}')`));
      await nums(p);
      await wait(250);
      await shot('biome-' + bio);
    }
  if (!FB && (W === 390 || W === 1280)) {
    await p.evaluate(() => {
      const K = CHASE_POOL.trunk,
        it = mkItem('r_iron', 60, 2);
      it.id = ++S.inv.nid;
      S.eq.ring1 = it;
      S.chase.got = { [K[3]]: 1 };
      S.frags = { [K[3]]: 1 };
      changed();
      CHSEL = K[3];
      fmenuOpen('chase');
    });
    await wait(400);
    const tap = async sel => {
      const r = await p.evaluate(sel => {
        const e = document.querySelector(sel);
        e.scrollIntoView({ block: 'center' });
        const r = e.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, sel);
      await (mob ? p.touchscreen.tap(r.x, r.y) : p.mouse.click(r.x, r.y));
      await wait(300);
    };
    await tap('#pchase .chact .btn');
    await tap('#pchase [data-wyk="ring1"]');
    await wait(200);
    await shot('wyapply');
  }
  if (errs.length) console.log('❌', tag, errs);
  await ctx.close();
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium' });
  for (const [W, H] of SIZES) await run(b, W, H);
  for (const [W, H] of SIZES.slice(0, 2)) await run(b, W, H, 1);
  await b.close();
})();
