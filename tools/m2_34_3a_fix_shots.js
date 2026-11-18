/* M2-34 3a 修正的驗收截圖（Art Director 審查 eb6d5f7／PR #72 第 3、4、5 項）：只截、只量，不改遊戲。
   每個尺寸（390×844、1280×720）：掉寶光柱（追逐＋稀有，柱頂四階淡出；390 另截開半版面板，柱頂不出場景）；四個王印的追逐橫幅各一張（圖示有圖、底色不透明）。
   量：sig_beam 上色後柱芯的顏色（給 ΔE 用）、橫幅 img 載好、底色 alpha、頁面沒有錯誤。
   用法：先開本機伺服器（python3 -m http.server），node tools/m2_34_3a_fix_shots.js [輸出資料夾] [網址] */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const OUT = process.argv[2] || path.join(__dirname, '..', 'evidence', 'dpoe-m2-34-3a-fix'),
  URL = process.argv[3] || 'http://localhost:8000/';
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const ok = (c, n, v = '') => {
  if (!c) fail++;
  console.log(`${c ? '✅' : '❌'} ${n}`, typeof v === 'string' ? v : JSON.stringify(v));
};
async function run(b, W, H) {
  const mob = W < 900,
    tag = `${W}x${H}`,
    errs = [];
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?test=chase&' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
  /* 1. ?test=chase 進場 1.5 秒開發觸發的第一個王印：王印拼條第一次用到，橫幅要補上圖 */
  await p.waitForFunction(() => !$('chase').hidden);
  await p.waitForTimeout(600);
  const first = await p.evaluate(() => {
    const im = document.querySelector('#chase .cbi img.ic');
    return { img: !!im && im.naturalWidth > 0, empty: !!document.querySelector('#chase .cbi span.ic') };
  });
  ok(first.img && !first.empty, `${tag} 第一次掉王印：橫幅圖示有圖（不是空格）`, first);
  /* 2. 四個王印各一張橫幅 */
  for (const k of await p.evaluate(() => CHASE_POOL.trunk)) {
    await p.evaluate(k => {
      chaseBnHide();
      S.chase.got[k] = 1;
      chaseBn(k);
    }, k);
    await p.waitForTimeout(450);
    const r = await p.evaluate(() => {
      const el = $('chase'),
        im = el.querySelector('.cbi img.ic'),
        bg = getComputedStyle(el).backgroundColor,
        a = (bg.match(/rgba\([^)]*,\s*([\d.]+)\)/) || [])[1];
      return {
        name: el.querySelector('.cbt b').textContent,
        img: !!im && im.naturalWidth > 0,
        bg,
        opaque: a === undefined,
        scroll: document.scrollingElement.scrollTop
      };
    });
    ok(r.img && r.opaque && !r.scroll, `${tag} 橫幅 ${r.name}：圖示有圖、底色不透明、頁面沒捲動`, r);
    await p.screenshot({ path: `${OUT}/${tag}-banner-${k}.png` });
  }
  await p.evaluate(() => chaseBnHide());
  /* 3. 掉寶光柱：追逐、稀有通貨各一根在主角旁邊（最高的那種：追逐 360） */
  const bm = await p.evaluate(() => {
    try {
      introStop();
    } catch (e) {}
    window.hurtPlayer = () => 0;
    closePanels();
    S.auto = 0;
    G.mobs = [];
    G.drops = [
      { chase: CHASE_POOL.trunk[0], t: 9, hold: 1e9, x: P.x - 40, y: P.y + 20, sx: P.x - 40, sy: P.y + 20 },
      { show: 'exalt', t: 9, hold: 1e9, x: P.x + 40, y: P.y + 20, sx: P.x + 40, sy: P.y + 20 }
    ];
    const core = k => {
      const c = beamSheet(cssv(k)),
        d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data,
        n = {};
      for (let i = 0; i < d.length; i += 4)
        if (d[i + 3] === 255) n[[d[i], d[i + 1], d[i + 2]]] = (n[[d[i], d[i + 1], d[i + 2]]] || 0) + 1;
      return Object.keys(n).sort((a, b) => b.split(',')[0] - a.split(',')[0] || b.split(',')[1] - a.split(',')[1])[0];
    };
    return {
      chase: core('--rar-chase-rgb'),
      rare: core('--rar-rare-rgb'),
      tok: [cssv('--rar-chase'), cssv('--rar-rare')]
    };
  });
  console.log(`${tag} 上色後柱芯（最亮的不透明色）`, JSON.stringify(bm));
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/${tag}-beam.png` });
  /* 直立開半版面板（場景只剩上半）：柱頂最高到畫面上緣下 8，不頂出場景 */
  if (mob) {
    await p.evaluate(() => fmenuOpen('chase'));
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}/${tag}-beam-sheet.png` });
  }
  ok(!errs.length, `${tag} 沒有頁面錯誤`, errs);
  await ctx.close();
  return bm;
}
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const res = {};
  for (const [W, H] of [
    [390, 844],
    [1280, 720]
  ])
    res[`${W}x${H}`] = await run(b, W, H);
  await b.close();
  fs.writeFileSync(path.join(OUT, 'measure.json'), JSON.stringify(res, null, 2));
  console.log(fail ? `❌ ${fail} 項沒過` : '✅ 全部通過');
  process.exit(fail ? 1 : 0);
})();
