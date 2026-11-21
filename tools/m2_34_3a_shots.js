/* M2-34 3a 素材接入的驗收截圖（specs/M2-33-3a-scene-assets.md §5）：只截、只量，不改遊戲。
   每個尺寸：靠牆角的戰鬥畫面（怪物受傷有生命條、跳數字、追逐物品＋稀有通貨光柱）白天、夜晚（燭龍閉眼）各一張；
   1280×720 另截四種地形；390×844、1280×720 實點「套到裝備」看 sig_wyapply。
   量：地磚區塊 256（有圖）／384（缺圖）、王印圖來源、sig_crit 有沒有用、頁面沒有錯誤。
   用法：先開本機伺服器（python3 -m http.server），node tools/m2_34_3a_shots.js [full|fallback] [輸出資料夾] [網址]
   fallback：先把 img/tiles、img/ic_wy32.*、img/ic_wy16.*、img/fx/sig_* 移走再跑，跑完放回去 */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const MODE = process.argv[2] || 'full',
  OUT = process.argv[3] || path.join(__dirname, '..', 'evidence', 'dpoe-m2-34-3a'),
  URL = process.argv[4] || 'http://localhost:8000/',
  FB = MODE === 'fallback';
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const ok = (c, n, v = '') => {
  if (!c) fail++;
  console.log(`${c ? '✅' : '❌'} ${n}`, typeof v === 'string' ? v : JSON.stringify(v));
};
const SIZES = FB
  ? [
      [390, 844],
      [1280, 720]
    ]
  : [
      [390, 844],
      [1280, 720],
      [375, 667],
      [1440, 900]
    ];
/* 靠左上牆角站好、怪物受傷、掉落拉到身邊、打幾個數字 */
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
    return { chase: !!c, mobs: G.mobs.length };
  });
const nums = p =>
  p.evaluate(() => {
    G.nums = [];
    G.mobs.slice(0, 4).forEach((m, i) => num(m.x, m.y - m.sz, 120 + i * 37, i === 1 ? 'crit' : 'hit'));
  });
const facts = p =>
  p.evaluate(() => ({
    biome: G.biome,
    tiles: !!tileSet(G.biome),
    chunk: G.bc && G.bc.m.size ? [...G.bc.m.values()][0].width : 0,
    wy: (a => a && a.im.src.split('/').pop())(artImg('wangyin_zhenyue')),
    crit: sigFx('sig_crit', 'crit'),
    beam: !!beamSheet('255,154,74')
  }));
async function run(b, W, H) {
  const mob = W < 900,
    tag = `${W}x${H}`,
    pre = FB ? `${tag}-fallback` : tag,
    errs = [];
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?test=chase&' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
  await p.waitForTimeout(2500);
  const sc = await scene(p);
  await p.waitForTimeout(1200);
  await nums(p);
  await p.waitForTimeout(150);
  const f = await facts(p);
  if (FB)
    ok(
      !f.tiles && f.chunk === 384 && /^ic_cur\./.test(f.wy) && f.crit === 'crit' && !f.beam,
      `${tag} 缺圖：地磚退回程式畫法（384 區塊）、王印借 cur_regal、暴擊播舊 crit、光柱程式畫`,
      f
    );
  else
    ok(
      f.tiles && f.chunk === 256 && /^ic_wy32\./.test(f.wy) && f.crit === 'sig_crit' && f.beam,
      `${tag} 有圖：地磚 256 區塊、王印 ic_wy32、暴擊 sig_crit、光柱 sig_beam`,
      f
    );
  ok(sc.chase, `${tag} 有追逐物品掉落（光柱）`, sc);
  await p.screenshot({ path: `${OUT}/${pre}-day-${f.biome}.png` });
  await p.evaluate(() => (G.night = G.t + 999));
  await nums(p);
  await p.waitForTimeout(150);
  await p.screenshot({ path: `${OUT}/${pre}-night-${f.biome}.png` });
  await p.evaluate(() => (G.night = 0));
  if (!FB && W === 1280)
    for (const bio of ['temple', 'lava', 'tomb', 'ice']) {
      await p.evaluate(bio => ((G.biome = bio), (G.bc = null), tileSet(bio)), bio);
      await p.waitForFunction(bio => !!tileSet(bio), bio);
      await nums(p);
      await p.waitForTimeout(250);
      const g = await facts(p);
      ok(g.tiles && g.chunk === 256, `${tag} ${bio} 地磚 256 區塊`, g);
      await p.screenshot({ path: `${OUT}/${tag}-biome-${bio}.png` });
    }
  if (!FB && (W === 390 || W === 1280)) {
    /* 套王印：戒指 1 稀有、沒有印，手上歸墟 1 枚 → 選歸墟 → 套到裝備 → 點戒指 1 */
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
    await p.waitForTimeout(400);
    const tap = async sel => {
      const r = await p.evaluate(sel => {
        const e = document.querySelector(sel);
        e.scrollIntoView({ block: 'center' });
        const r = e.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, sel);
      await (mob ? p.touchscreen.tap(r.x, r.y) : p.mouse.click(r.x, r.y));
      await p.waitForTimeout(300);
    };
    await tap('#pchase .chact .btn');
    await tap('#pchase [data-wyk="ring1"]');
    await p.waitForTimeout(200);
    const wy = await p.evaluate(() => {
      const d = [...document.querySelectorAll('body > div')].find(d => /sig_wyapply/.test(d.style.background));
      return d && [d.offsetWidth, d.offsetHeight, getComputedStyle(d).pointerEvents, S.eq.ring1.wy];
    });
    ok(
      wy && wy[0] === 96 && wy[1] === 96 && wy[2] === 'none' && wy[3] === 'wangyin_guixu',
      `${tag} 套王印播 sig_wyapply（96×96、不擋點擊）`,
      wy
    );
    await p.screenshot({ path: `${OUT}/${tag}-wyapply.png` });
    await p.waitForTimeout(1200);
    ok(
      !(await p.evaluate(() =>
        [...document.querySelectorAll('body > div')].some(d => /sig_wyapply/.test(d.style.background))
      )),
      `${tag} sig_wyapply 播完拿掉`
    );
  }
  ok(!errs.length, `${pre} 頁面沒有錯誤`, errs);
  await ctx.close();
}
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  for (const [W, H] of SIZES) await run(b, W, H);
  await b.close();
  console.log(fail ? `❌ ${fail} 項沒過` : '✅ 全部通過');
  process.exit(fail ? 1 : 0);
})();
