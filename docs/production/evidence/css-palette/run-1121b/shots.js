/* CSS 對齊色票 PR 的截圖證據（SIGNOFF-CHECKLIST §3）：main 與分支同一個畫面各截一張，給 diff.py 做疊圖／差異圖、量對比。
   亂數在頁面載入前就固定（LCG），主迴圈在擺好場景後停掉，再手動 draw() 一次，所以兩邊地圖、怪的位置一樣。
   用法：node shots.js <網址> <輸出資料夾> <前綴 main|branch> */
const { chromium } = require('playwright');
const fs = require('fs');
const [URL, OUT, TAG] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const SIZES = [
  [390, 844, 1],
  [390, 844, 2],
  [1280, 720, 1],
  [1280, 720, 2],
  [375, 667, 1],
  [1440, 900, 1]
];
const seed = () => {
  let s = 12345;
  Math.random = () => ((s = (s * 1103515245 + 12345) % 2147483648), s / 2147483648);
  window.__reseed = v => (s = v);
};
/* 最擠的戰鬥：王＋菁英＋一般怪、敵方預警、我方技能環、元素地面、各稀有度掉落、追逐光柱、通貨光柱、跳數字、回家傳送門 */
const crowd = p =>
  p.evaluate(() => {
    try {
      introStop();
    } catch (e) {}
    window.hurtPlayer = () => 0;
    closePanels();
    chaseBnHide();
    $('banner').hidden = true;
    S.auto = 0;
    /* 同一個種子重開同一張圖，並立刻停住主迴圈：main 與分支的地圖、王、怪一樣 */
    window.requestAnimationFrame = () => 0;
    __reseed(4242);
    runNode(TRUNK_K[14], 1);
    __reseed(99);
    const c0 = floorNear(G.W / 2, G.H / 2, 0, 400, 40) || { x: G.W / 2, y: G.H / 2 };
    P.x = c0.x;
    P.y = c0.y;
    G.cam.x = P.x;
    G.cam.y = P.y;
    const Ds = [...new Set(G.mobs.map(m => m.D))];
    G.mobs = [];
    G.drops = [];
    G.fx = [];
    G.tele = [];
    G.nums = [];
    spawnBoss();
    const b = G.mobs[G.mobs.length - 1];
    b.x = P.x + 150;
    b.y = P.y - 120;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2,
        r = 110 + (i % 3) * 45,
        m = spawnMob(Ds[i % Ds.length], P.x + Math.cos(a) * r, P.y + Math.sin(a) * r * 0.8, 1, i % 6 === 0);
      if (!m) continue;
      m.x = P.x + Math.cos(a) * r;
      m.y = P.y + Math.sin(a) * r * 0.8;
      m.hp = m.mhp * (0.3 + (i % 5) * 0.12);
      if (m.elite) mobDef(m, G.mapT || 1);
    }
    G.fx = [];
    const ring = (x, y, r, sh) => fx({ k: 'ring', x, y, r, dur: 1, sh });
    ring(P.x, P.y, 90);
    ring(P.x - 80, P.y + 60, 70, 'boom');
    ring(P.x + 60, P.y + 90, 60, 'frost');
    ring(P.x - 40, P.y - 90, 60, 'dark');
    ring(b.x, b.y, 160, 'boom');
    for (const f of G.fx) f.t = 0.35;
    G.tele.push(
      { x: P.x + 40, y: P.y - 40, r: 70, t: 0.4, dur: 0.8, dmg: 0, src: b, el: 'phys' },
      { x: b.x - 60, y: b.y + 30, r: 90, t: 0.6, dur: 0.8, dmg: 0, src: b, el: 'fire' },
      { x: P.x - 140, y: P.y + 10, r: 60, t: 0.2, dur: 0.8, dmg: 0, src: b, el: 'cold' }
    );
    try {
      const ks = Object.keys(GROUND);
      [ks[0], ks[1], ks[2]].forEach((k, i) =>
        G.ground.push({ k, x: P.x - 120 + i * 120, y: P.y + 150, r: 50, t: 0.5, dur: 9, dps: 0, v: 0, side: i ? 'm' : 'p' })
      );
    } catch (e) {}
    const D = (o, dx, dy) => G.drops.push({ ...o, x: P.x + dx, y: P.y + dy, sx: P.x + dx, sy: P.y + dy, t: 1, hold: 1e9 });
    [0, 1, 2, 3].forEach(r => {
      try {
        D({ it: mkItem('r_iron', 60, r) }, -150 + r * 45, -150);
      } catch (e) {}
    });
    D({ show: Object.keys(CUR)[0] }, 90, -170);
    D({ show: Object.keys(CUR).find(k => /3$/.test(k)) || Object.keys(CUR)[1] }, 140, -160);
    D({ chase: CHASE_POOL.trunk[0] }, -190, -100);
    D({ gold: 12 }, 30, -180);
    G.portal = { x: P.x - 200, y: P.y + 120 };
    G.mobs.slice(0, 8).forEach((m, i) => num(m.x, m.y - m.sz, 120 + i * 37, i % 3 === 1 ? 'crit' : 'hit'));
    return { mobs: G.mobs.length, drops: G.drops.length, tele: G.tele.length, fx: G.fx.length, ground: G.ground.length };
  });
/* 停住主迴圈，固定時間與亂數再畫一次 */
const freeze = p =>
  p.evaluate(() => {
    window.requestAnimationFrame = () => 0;
  });
const redraw = p =>
  p.evaluate(() => {
    G.t = 10;
    for (const d of G.drops) d.t = 1;
    __reseed(777);
    try {
      hudTick();
    } catch (e) {}
    draw();
  });
async function run(b, W, H, DPR) {
  const mob = W < 900,
    tag = `${TAG}-${W}x${H}@${DPR}x`,
    errs = [],
    facts = {};
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: DPR,
    hasTouch: mob,
    isMobile: mob
  });
  await ctx.route(/supabase/, r => r.abort());
  await ctx.addInitScript(seed);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?test=chase');
  await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
  await p.waitForTimeout(2500);
  facts.crowd = await crowd(p);
  await p.waitForTimeout(800);
  await redraw(p);
  await p.waitForTimeout(300);
  await redraw(p);
  await p.screenshot({ path: `${OUT}/${tag}-crowd.png` });
  /* 世界座標 → 截圖像素（給 diff.py 取樣） */
  facts.px = await p.evaluate(() => {
    const W = IW / ZOOM,
      H = cvH() / ZOOM,
      r = CV.getBoundingClientRect(),
      s = (x, y) => [
        Math.round(r.left + (x - G.cam.x + W / 2) * ZOOM * (r.width / IW)),
        Math.round(r.top + (y - G.cam.y + H / 2) * ZOOM * (r.width / IW))
      ],
      rect = id => {
        const e = $(id);
        if (!e || !e.offsetWidth) return null;
        const q = e.getBoundingClientRect();
        return [q.left, q.top, q.width, q.height].map(Math.round);
      };
    return {
      tele: G.tele.map(t => s(t.x, t.y).concat([Math.round(t.r * ZOOM)])),
      portal: s(G.portal.x, G.portal.y),
      player: s(P.x, P.y),
      ohp: rect('ohp'),
      omp: rect('omp'),
      bhp: rect('bhp'),
      bmp: rect('bmp'),
      mini: rect('mini') || rect('minimap')
    };
  });
  /* 地獄火快爆（≥ 80%）＋危急紅邊（生命 < 20%） */
  await p.evaluate(() => {
    ST.hellfire = 1;
    ST.hfMax = ST.hfMax || 100;
    P.hf = ST.hfMax * 0.92;
    P.hp = ST.hp * 0.15;
  });
  await redraw(p);
  await p.waitForTimeout(100);
  await p.screenshot({ path: `${OUT}/${tag}-hellfire-crisis.png` });
  facts.hot = await p.evaluate(() => [$('omp').className, $('bmp').className]);
  if (DPR === 1 && (W === 390 || W === 1280)) {
    for (const [k, go] of [
      ['inv', "fmenuOpen('inv')"],
      ['tree', 'treeOpen && treeOpen()']
    ]) {
      await p.evaluate(go => {
        try {
          closePanels();
          eval(go);
        } catch (e) {}
      }, go);
      await p.waitForTimeout(500);
      await p.screenshot({ path: `${OUT}/${tag}-panel-${k}.png` });
    }
  }
  facts.errs = errs;
  await ctx.close();
  return [tag, facts];
}
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : { executablePath: '/opt/pw-browsers/chromium/chrome-linux/chrome' });
  const out = {};
  for (const [W, H, D] of SIZES) {
    const [t, f] = await run(b, W, H, D);
    out[t] = f;
    console.log(t, JSON.stringify(f.crowd), f.errs.length ? 'errs:' + f.errs.join('|') : '');
  }
  fs.writeFileSync(`${OUT}/${TAG}-facts.json`, JSON.stringify(out, null, 1));
  await b.close();
})();
