/* dpoe-check92 獨立量測：設施卡按鈕捲到畫面中間的高度、#pidle／#cmnext 圖示倍率、直立觸控技能列、裁切重現、地磚放大截圖 */
const { chromium } = require('/tmp/pw/node_modules/playwright');
const fs = require('fs');
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))));
async function run(b, W, H) {
  const mob = W < 900, tag = `${W}x${H}`, errs = [];
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob, deviceScaleFactor: mob ? 2 : 1 });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8000/?dbg=1&seed=3&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof proSkip === 'function');
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    proSkip(); S.story.tips = 0; S.auto = 0;
    for (const k of CAMP_B) S.camp[k] = Math.max(1, Math.min(campMax(k) - 1, 3));
    for (const k of GEN_K) if (S.camp.gen[k]) S.camp.gen[k].lv = Math.max(S.camp.gen[k].lv, 1);
    S.mat.soul = 1e9; hudBar();
    closePanels(); CRAFT.tab = 'camp'; CAMPUI.open = null; openPanel('craft');
  });
  await p.waitForTimeout(700);
  /* 1. 每顆 #cc-* 按鈕（收起＋每張展開）捲到捲動區中間量高度 */
  const res = await p.evaluate(async () => {
    const keys = [...document.querySelectorAll('#pcraft [id^="cc-"]')].map(e => e.id.slice(3));
    const rows = [];
    for (const open of [null, ...keys]) {
      if (CAMPUI.open !== open) { CAMPUI.open = open; hudPanels(); }
      await new Promise(r => setTimeout(r, 250));
      const ids = [...document.querySelectorAll('#pcraft [id^="cc-"]')].flatMap(c => [...c.querySelectorAll('button')].map((_, i) => [c.id, i]));
      for (const [id, i] of ids) {
        let el = document.getElementById(id).querySelectorAll('button')[i];
        if (!el || !el.getClientRects().length) continue;
        el.scrollIntoView({ block: 'center' });
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        el = document.getElementById(id).querySelectorAll('button')[i];
        const q = el.getBoundingClientRect(), mx = (q.left + q.right) / 2, my = (q.top + q.bottom) / 2;
        const topHit = el.contains(document.elementFromPoint(mx, my));
        rows.push({ id, i, cls: el.className, h: +q.height.toFixed(1), w: Math.round(q.width), y: +q.top.toFixed(1), topHit, open });
      }
    }
    CAMPUI.open = null; hudPanels();
    await new Promise(r => setTimeout(r, 250));
    $('pcraft').scrollTop = 0;
    await new Promise(r => setTimeout(r, 250));
    const ic = sel => [...document.querySelectorAll(sel)].filter(i => i.naturalWidth && i.getBoundingClientRect().width).map(i => ({ id: (i.closest('[id]') || {}).id, w: +i.getBoundingClientRect().width.toFixed(2), nw: i.naturalWidth, k: +(i.getBoundingClientRect().width / i.naturalWidth).toFixed(3) }));
    const cmnext = ic('#cmnext img.ic'), cc = ic('#pcraft [id^="cc-"] img.ic'), cmtop = ic('#cmtop img.ic');
    /* 重現審查的裁切：把 #cc-scout 的按鈕捲到剩 14 px 在畫面底 */
    const sc = $('pcraft');
    const bt = document.querySelector('#cc-scout button');
    let clip = null;
    if (bt) {
      const q0 = bt.getBoundingClientRect();
      sc.scrollTop += q0.top - (innerHeight - 14);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const q = document.querySelector('#cc-scout button').getBoundingClientRect();
      clip = { full: +q.height.toFixed(1), y: +q.top.toFixed(1), visibleToViewportBottom: +(Math.min(innerHeight, q.bottom) - q.top).toFixed(1), pcraftBottom: +sc.getBoundingClientRect().bottom.toFixed(1), innerHeight, scrolledToMax: sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1 };
    }
    return { rows, cmnext, cc, cmtop, clip };
  });
  const hs = res.rows.map(r => r.h);
  log(`${tag} #cc-* 按鈕（捲到中間）共 ${res.rows.length} 筆，高度 min ${Math.min(...hs)} max ${Math.max(...hs)}，中心點被蓋住 ${res.rows.filter(r => !r.topHit).length} 筆`);
  log(`${tag} 高度分佈`, hs.reduce((o, h) => ((o[h] = (o[h] || 0) + 1), o), {}));
  log(`${tag} 低於門檻(${mob ? 44 : 32})`, res.rows.filter(r => r.h < (mob ? 44 : 32)));
  log(`${tag} #cmnext img.ic`, res.cmnext);
  log(`${tag} #cc-* img.ic`, res.cc);
  log(`${tag} #cmtop img.ic`, res.cmtop);
  log(`${tag} 裁切重現 #cc-scout`, res.clip);
  await p.screenshot({ path: `${OUT}/${tag}-camp-clip-scout.png` });
  await p.evaluate(async () => { $('pcraft').scrollTop = 0; await new Promise(r => setTimeout(r, 200)); });
  await p.screenshot({ path: `${OUT}/${tag}-camp.png` });
  /* 2. 掛機卡 */
  await p.evaluate(async () => {
    closePanels(); runNode(TRUNK_K[0]); DBG.clear();
    await new Promise(r => setTimeout(r, 600)); S.auto = 1; idleBar(1);
    await new Promise(r => setTimeout(r, 500));
  });
  const idle = await p.evaluate(() => [...document.querySelectorAll('#pidle img.ic')].filter(i => i.getBoundingClientRect().width).map(i => ({ w: +i.getBoundingClientRect().width.toFixed(2), nw: i.naturalWidth, k: +(i.getBoundingClientRect().width / i.naturalWidth).toFixed(3) })));
  log(`${tag} #pidle img.ic`, idle);
  await p.screenshot({ path: `${OUT}/${tag}-idle.png` });
  /* 手動模式下技能列 */
  await p.evaluate(async () => { S.auto = 0; $('pidle').hidden = true; hudBar(); await new Promise(r => setTimeout(r, 400)); });
  const bar = await p.evaluate(() => [...document.querySelectorAll('#bar img.ic')].filter(i => i.getBoundingClientRect().width).map(i => ({ w: +i.getBoundingClientRect().width.toFixed(2), nw: i.naturalWidth, k: +(i.getBoundingClientRect().width / i.naturalWidth).toFixed(3) })));
  log(`${tag} 手動戰鬥 #bar img.ic`, bar);
  /* 3. 王印橫幅 */
  await p.evaluate(() => { DBG.hp(35); const k = CHASE_POOL.trunk[1]; chaseBnHide(); S.chase.got[k] = 1; chaseBn(k); });
  await p.waitForFunction(() => { const i = document.querySelector('#chase .cbi img.ic'); return i && i.naturalWidth; });
  await p.waitForTimeout(700);
  log(`${tag} 王印橫幅`, await p.evaluate(() => [...document.querySelectorAll('#chase img.ic')].map(i => ({ w: i.getBoundingClientRect().width, nw: i.naturalWidth }))));
  await p.screenshot({ path: `${OUT}/${tag}-chase.png` });
  await p.evaluate(() => chaseBnHide());
  /* 4. 地磚：兩個非整數鏡頭位置，畫完立刻取畫布、放大 4 倍裁一塊區塊交界 */
  for (const bk of ['temple', 'ice']) {
    await p.evaluate(bk => DBG.biome(bk), bk);
    await p.waitForFunction(bk => !!tileSet(bk), bk, { timeout: 10000 });
    await p.waitForTimeout(500);
    for (const [dx, dy] of [[0.37, 0.61], [101.45, 55.15]]) {
      const r = await p.evaluate(async ([dx, dy]) => {
        DBG.clear(); G.night = G.fog = 0;
        await new Promise(r => setTimeout(r, 300));
        G.cam.x = P.x + dx; G.cam.y = P.y + dy;
        let rects = [];
        const di = CX.drawImage;
        CX.drawImage = function (im, ...a) {
          if (a.length === 4 && im.width === 256) { const m = CX.getTransform(); rects.push([m.a * a[0] + m.e, m.d * a[1] + m.f, m.a * a[2], m.d * a[3]]); }
          return di.call(this, im, ...a);
        };
        for (let i = 0; i < 4; i++) { G.cam.x = P.x + dx; G.cam.y = P.y + dy; draw(); }
        rects = []; G.cam.x = P.x + dx; G.cam.y = P.y + dy; draw();
        delete CX.drawImage;
        /* 找一個在畫面內的區塊角 */
        const xs = [...new Set(rects.map(r => r[0]))].filter(x => x > 40 && x < CV.width - 140).sort((a, b) => a - b);
        const ys = [...new Set(rects.map(r => r[1]))].filter(y => y > 40 && y < CV.height - 140).sort((a, b) => a - b);
        const cx0 = Math.round(xs[0] || CV.width / 2) - 48, cy0 = Math.round(ys[0] || CV.height / 2) - 48;
        const c = document.createElement('canvas'); c.width = c.height = 96 * 5;
        const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
        x.drawImage(CV, cx0, cy0, 96, 96, 0, 0, 480, 480);
        const full = CV.toDataURL();
        return { crop: c.toDataURL(), full, corner: [cx0 + 48, cy0 + 48], rects: rects.slice(0, 3).map(r => r.map(v => +v.toFixed(3))), n: rects.length, nonInt: rects.filter(r => r.some(v => Math.abs(v - Math.round(v)) > 1e-6)).length, cv: [CV.width, CV.height], cam: [G.cam.x, G.cam.y] };
      }, [dx, dy]);
      const f = `${tag}-tiles-${bk}-cam${dx}_${dy}`;
      fs.writeFileSync(`${OUT}/${f}-zoom5x.png`, Buffer.from(r.crop.split(',')[1], 'base64'));
      fs.writeFileSync(`${OUT}/${f}-canvas.png`, Buffer.from(r.full.split(',')[1], 'base64'));
      log(`${tag} 地磚 ${bk} 鏡頭偏移 ${dx},${dy}：區塊 ${r.n} 塊、非整數 ${r.nonInt}、例 ${JSON.stringify(r.rects)}、交界放大中心(畫布px) ${r.corner}、畫布 ${r.cv}`);
    }
  }
  log(`${tag} 頁面錯誤`, errs);
  await ctx.close();
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME });
  for (const [W, H] of [[390, 844], [1280, 720]]) await run(b, W, H);
  await b.close();
})();
