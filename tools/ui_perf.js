const { chromium } = require('playwright');
/* 介面順不順（0.4.7，skill ui-design 的「順」那一段）：手機直立、CPU 降速 4 倍，量
   1. 每個常用操作「按下到畫面更新」幾毫秒（瀏覽器的 Event Timing；標準 ≤100，>200 明顯卡）
   2. 戰鬥在跑時手指捲戰利品清單，每一格幾毫秒（標準 p95 ≤33）
   3. 天賦樹：打開、拖曳、兩指縮放的每一格，以及一開始每個點在畫面上幾 px
   只量不改；無頭瀏覽器沒有顯示卡，數字偏慢，看的是相對大小與有沒有變好。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/ui_perf.js [網址] [寬 390] [高 844] */
const URL = process.argv[2] || 'http://localhost:8000/',
  W = +process.argv[3] || 390,
  H = +process.argv[4] || 844,
  TAP_OK = 100,
  FRAME_OK = 33;
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2
  });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  await p.goto(URL + '?p=8&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    proSkip();
    S.story.tips = 0;
    S.lv = 60;
    S.orient = 'p';
    applyOrient();
    let i = 0;
    while (S.inv.items.length < 600)
      for (const it of dropGear(i++ % 4 ? 1 : 2, { ilvl: 60, star: 3 })) invPut(S.inv, it);
    for (const e of EQS) {
      if (e.k === 'ring3') continue;
      const it = S.inv.items.find(
        o => !o.charm && eqTakes(e, kindOf(o)) && !eqLack(S, o, e.k).length && (e.k !== 'off' || offOK(S.eq.weapon, o))
      );
      if (it && !S.eq[e.k]) takeOut('inv', it), (S.eq[e.k] = it);
    }
    changed();
    window._ev = [];
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) if (e.name === 'click') _ev.push(Math.round(e.duration));
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  });
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const touch = (type, pts) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
  const tap = async q => {
    const c = await p.evaluate(q => {
      const e = document.querySelector(q);
      if (!e) return null;
      e.scrollIntoView({ block: 'nearest', inline: 'center' });
      const r = e.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    }, q);
    if (!c) return -1;
    const k = await p.evaluate(() => _ev.length);
    await touch('touchStart', [c]);
    await p.waitForTimeout(50);
    await touch('touchEnd', []);
    await p.waitForTimeout(800);
    return p.evaluate(k => (_ev.length > k ? _ev[_ev.length - 1] : 0), k);
  };
  /* 量一段時間裡每一格的間隔 */
  const frames = async fn => {
    await p.evaluate(() => {
      window._f = [];
      window._fr = 1;
      let l = performance.now();
      const step = t => {
        _f.push(t - l);
        l = t;
        if (window._fr) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    await fn();
    return p.evaluate(() => {
      window._fr = 0;
      const a = _f.slice(2).sort((x, y) => x - y),
        n = a.length;
      return {
        p50: Math.round(a[Math.floor(n * 0.5)]),
        p95: Math.round(a[Math.floor(n * 0.95)]),
        max: Math.round(a[n - 1])
      };
    });
  };
  let bad = 0;
  const mark = (v, ok) => (v < 0 ? '找不到' : (v <= ok ? '✅ ' : (bad++, '❌ ')) + v);
  const SEQ = [
    ['分頁：戰利品', '#pnav [data-tm="nav:bag"]'],
    ['篩選：防具', '#pinv [data-a="bagf:armor"]'],
    ['點一件裝備（說明框）', '#pinv .bag .it'],
    ['說明框：鎖定', '#tip [data-tq=lock]'],
    ['分頁：角色', '#pnav [data-tm="nav:char"]'],
    ['角色：點手套欄', '#pinv .doll [data-eq="gloves"]'],
    ['分頁：做裝', '#pnav [data-tm="nav:craft"]'],
    ['分頁：更多', '#pnav [data-tm="nav:more"]'],
    ['更多：地點', '#pmore [data-tm="nav:node"]'],
    ['分頁：技能', '#pnav [data-tm="nav:skill"]']
  ];
  const run = async label => {
    console.log(`\n${label}：按下到畫面更新（毫秒，標準 ≤${TAP_OK}）`);
    for (const [n, q] of SEQ) console.log(`  ${mark(await tap(q), TAP_OK)}  ${n}`);
    await p.evaluate(() => {
      hideTip();
      closePanels();
    });
  };
  await run('藏身處');
  await p.evaluate(() => runNode(TRUNK_K[6]));
  await p.waitForTimeout(3000);
  await run('刷圖中');
  await p.evaluate(() => navGo('bag'));
  await p.waitForTimeout(500);
  const c = await p.evaluate(() => {
    const r = document.querySelectorAll('#pinv .bag .it')[10].getBoundingClientRect();
    return [r.left + 20, r.top + 20];
  });
  const sc = await frames(async () => {
    for (let k = 0; k < 4; k++) {
      await touch('touchStart', [c]);
      for (let i = 1; i <= 20; i++) {
        await touch('touchMove', [[c[0], c[1] - i * 8]]);
        await p.waitForTimeout(16);
      }
      await touch('touchEnd', []);
      await p.waitForTimeout(400);
    }
  });
  console.log(`\n刷圖中捲戰利品：每一格（毫秒，標準 p95 ≤${FRAME_OK}）`);
  console.log(`  ${mark(sc.p95, FRAME_OK)}  p95（中位數 ${sc.p50}、最慢 ${sc.max}）`);
  /* 天賦樹 */
  const open = await p.evaluate(async () => {
    closePanels();
    treeClose();
    const t0 = performance.now();
    treeOpen('pt');
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return Math.round(performance.now() - t0);
  });
  await p.waitForTimeout(600);
  const px = await p.evaluate(() => {
    const a = [...document.querySelectorAll('#tg .nd')]
      .map(e => e.getBoundingClientRect().width)
      .filter(Boolean)
      .sort((x, y) => x - y);
    return [
      Math.round(a[Math.floor(a.length / 2)]),
      Math.round(a[a.length - 1]),
      document.querySelectorAll('#ptree svg *').length
    ];
  });
  const pan = await frames(async () => {
    await touch('touchStart', [[W / 2, H * 0.6]]);
    for (let i = 1; i <= 40; i++) {
      await touch('touchMove', [[W / 2 - i * 4, H * 0.6 - i * 3]]);
      await p.waitForTimeout(16);
    }
    await touch('touchEnd', []);
    await p.waitForTimeout(300);
  });
  const zoom = await frames(async () => {
    await touch('touchStart', [
      [W / 2 - 45, H * 0.55],
      [W / 2 + 45, H * 0.55]
    ]);
    for (let i = 1; i <= 30; i++) {
      await touch('touchMove', [
        [W / 2 - 45 - i * 3, H * 0.55],
        [W / 2 + 45 + i * 3, H * 0.55]
      ]);
      await p.waitForTimeout(16);
    }
    await touch('touchEnd', []);
    await p.waitForTimeout(300);
  });
  console.log('\n天賦樹');
  console.log(`  ${mark(open, 200)}  打開（毫秒，標準 ≤200）`);
  console.log(`  ${mark(pan.p95, FRAME_OK)}  拖曳每一格 p95（最慢 ${pan.max}）`);
  console.log(`  ${mark(zoom.p95, FRAME_OK)}  兩指縮放每一格 p95（最慢 ${zoom.max}）`);
  console.log(
    `  ${px[0] >= 24 ? '✅' : (bad++, '❌')} 一開始每個點在畫面上 ${px[0]}px（最大 ${px[1]}px；要看得到圖示至少 24px）；繪圖元素 ${px[2]} 個`
  );
  console.log(`\n${bad ? `❌ ${bad} 項超過標準` : '✅ 都在標準內'}`);
  await b.close();
})();
