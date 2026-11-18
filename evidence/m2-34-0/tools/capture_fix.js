/* M2-34-0 × #72 王印 16、#75 3a 修正 決定性截圖：畫面照 tools/m2_34_3a_fix_shots.js 與 tools/wy16_shots.js，
   只改成可以逐像素比對（同 capture_3a.js：clock 暫停、只用 runFor 推進；Math.random 固定種子；CSS 動畫停在固定時間點）。
   390×844、1280×720 各截：四個王印的追逐橫幅、掉寶光柱（追逐＋稀有）、390 開半版面板的光柱、王印 16 測試框；
   另擋掉 sig_beam 截一張程式畫的光柱。
   用法：node capture_fix.js <網址> <輸出資料夾>；輸出 <輸出>/fix/<尺寸>-<畫面>.png，接著 compare.py 一起比 */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const URL = process.argv[2] || 'http://localhost:8000/',
  OUT = path.join(process.argv[3] || path.join(__dirname, '..', 'raw'), 'fix');
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
async function run(b, W, H, FB) {
  const mob = W < 900,
    tag = FB ? `${W}x${H}-nobeamimg` : `${W}x${H}`,
    errs = [];
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
  await ctx.route(/supabase/, r => r.abort());
  if (FB) await ctx.route(/img\/fx\/sig_beam/, r => r.abort());
  await ctx.addInitScript(INIT);
  await ctx.clock.install({ time: new Date('2026-11-18T12:00:00Z') });
  await ctx.clock.pauseAt(new Date('2026-11-18T12:00:01Z'));
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
  await until(() => typeof G === 'object' && G.scene === 'map' && !!tileSet(G.biome));
  await wait(2500);
  if (!FB) {
    /* 四個王印的追逐橫幅（拼條載好後才截） */
    await until(() => !$('chase').hidden);
    await until(() => !!document.querySelector('#chase .cbi img.ic') && document.querySelector('#chase .cbi img.ic').complete);
    for (const k of await p.evaluate(() => CHASE_POOL.trunk)) {
      await p.evaluate(k => {
        chaseBnHide();
        S.chase.got[k] = 1;
        chaseBn(k);
      }, k);
      await wait(450);
      await shot('banner-' + k);
    }
  }
  /* 掉寶光柱：追逐、稀有通貨各一根在主角旁邊 */
  await p.evaluate(() => {
    try {
      introStop();
    } catch (e) {}
    window.hurtPlayer = () => 0;
    chaseBnHide();
    closePanels();
    $('banner').hidden = true;
    S.auto = 0;
    G.mobs = [];
    G.nums = [];
    G.drops = [
      { chase: CHASE_POOL.trunk[0], t: 9, hold: 1e9, x: P.x - 40, y: P.y + 20, sx: P.x - 40, sy: P.y + 20 },
      { show: 'exalt', t: 9, hold: 1e9, x: P.x + 40, y: P.y + 20, sx: P.x + 40, sy: P.y + 20 }
    ];
  });
  await wait(400);
  await shot('beam');
  if (mob) {
    await p.evaluate(() => fmenuOpen('chase'));
    await wait(800);
    await shot('beam-sheet');
    await p.evaluate(() => closePanels());
  }
  if (!FB) {
    /* 王印 16 測試框（同 tools/wy16_shots.js） */
    await p.evaluate(() => {
      const K = CHASE_POOL.trunk;
      S.chase.got = Object.fromEntries(K.map(k => [k, 1]));
      S.frags = Object.fromEntries(K.map(k => [k, 1]));
      changed();
      fmenuOpen('chase');
    });
    await until(() =>
      ['zhenyue', 'chixiao', 'jiting', 'guixu'].every(k => {
        const a = artImg(`wangyin_${k}_16`);
        return a && a.im.complete && a.im.naturalWidth;
      })
    );
    await p.evaluate(() => {
      const box = document.createElement('div');
      box.style.cssText =
        'position:fixed;top:8px;right:8px;z-index:99999;background:#24211e;border:1px solid #a38e6b;padding:6px;font:11px sans-serif;color:#e3d6bb;pointer-events:none';
      box.textContent = '王印 16 1× ／ 4×';
      for (const z of [1, 4]) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:6px;margin-top:4px;align-items:end';
        for (const k of ['zhenyue', 'chixiao', 'jiting', 'guixu']) {
          const a = artImg(`wangyin_${k}_16`),
            c = document.createElement('canvas');
          c.width = c.height = 16 * z;
          c.style.cssText = `width:${16 * z}px;height:${16 * z}px;image-rendering:pixelated`;
          const g = c.getContext('2d');
          g.imageSmoothingEnabled = false;
          g.drawImage(a.im, ...a.r, 0, 0, 16 * z, 16 * z);
          row.appendChild(c);
        }
        box.appendChild(row);
      }
      document.body.appendChild(box);
    });
    await wait(400);
    await shot('wy16');
  }
  if (errs.length) console.log('❌', tag, errs);
  await ctx.close();
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium' });
  for (const [W, H] of [
    [390, 844],
    [1280, 720]
  ]) {
    await run(b, W, H);
    await run(b, W, H, 1);
  }
  await b.close();
})();
