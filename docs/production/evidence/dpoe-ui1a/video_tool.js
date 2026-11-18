const { chromium } = require('playwright');
/* M2-12 第一段 §13 影片：王橫幅→血條、抽屜內升級連點 3 下、倒下→回戰場、掛機條展開與 6 秒自動收、換波。
   Playwright recordVideo（約 25 fps，不是 60 fps）；毫秒數另外用頁面裡 requestAnimationFrame 逐格取樣（每格記時間與量到的值）。 */
const fs = require('fs'),
  path = require('path');
const W = +process.argv[2] || 390,
  H = +process.argv[3] || 844,
  PORTM = H > W,
  OUT = process.argv[4] || '/home/user/dpoe/docs/production/evidence',
  tag = `${W}x${H}`;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const dir = path.join(OUT, '_vid_' + tag);
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    hasTouch: PORTM,
    isMobile: PORTM
  });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  await p.goto('http://localhost:8000/?dbg=1&seed=7&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1200);
  const press = q => (PORTM ? p.tap(q) : p.click(q));
  await p.evaluate(port => {
    proSkip();
    S.story.tips = 0;
    S.orient = port ? 'p' : 'l';
    applyOrient();
    if (port && innerHeight === 844) DBG.safeArea(34, 47);
    S.auto = 1;
    runNode(TRUNK_K[0]);
  }, PORTM);
  await p.waitForTimeout(1500);
  /* CDP 螢幕串流（每格 JPEG＋時間戳），最後用系統 ffmpeg 照真實間隔接成 webm */
  const cdp = await ctx.newCDPSession(p),
    FR = [];
  cdp.on('Page.screencastFrame', f => {
    FR.push([f.metadata.timestamp, f.data]);
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 });
  /* 逐格取樣：fn 每格回一個值，記 [ms, 值]，到 ms 為止 */
  const sample = (fnSrc, ms) =>
    p.evaluate(
      ([src, ms]) =>
        new Promise(r => {
          const f = new Function('return (' + src + ')()'),
            L = [],
            t0 = performance.now();
          const step = t => {
            L.push([Math.round(t - t0), f()]);
            t - t0 < ms ? requestAnimationFrame(step) : r(L);
          };
          requestAnimationFrame(step);
        }),
      [fnSrc, ms]
    );
  const res = {};
  /* 1 換波 */
  res.wave = await p.evaluate(async () => {
    G.waves = G.waves && G.waves.length ? G.waves : [[]];
    const r = () => JSON.stringify([$('pidle').getBoundingClientRect().top, $('area').getBoundingClientRect().top, $('warn').textContent]);
    const a = r();
    spawnWave();
    await new Promise(x => requestAnimationFrame(() => requestAnimationFrame(x)));
    return a === r() ? '0 位移、0 字' : '有變化';
  });
  await p.waitForTimeout(800);
  /* 2 王橫幅：出現到縮完，每格記王血條的寬與高 */
  await p.evaluate(() => {
    G.nextT = 0;
    G.mobs = G.mobs.filter(m => !m.boss);
    HV.boss = null;
    spawnBoss();
    for (const m of G.mobs) (m.dmg = 0), (m.hp = m.mhp = 1e9), m.boss && (m.aggro = 1);
  });
  const bs = await sample("() => { const r = $('bossbar').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.top)]; }", 1500);
  const s0 = bs.find(x => x[1][0] > 0),
    hold = bs.filter(x => x[1][0] === s0[1][0] && x[1][1] === s0[1][1]),
    end = bs.find((x, i) => i > 0 && x[1].join() === bs[bs.length - 1][1].join());
  res.banner = { 出現: s0[0], 開始縮: hold[hold.length - 1][0], 縮完: end[0], 停: hold[hold.length - 1][0] - s0[0], 縮: end[0] - hold[hold.length - 1][0] };
  await p.waitForTimeout(400);
  /* 3 倒下→能再操作 */
  res.down = await p.evaluate(async () => {
    const t0 = performance.now();
    die();
    while (G.state === 'dead') await new Promise(r => requestAnimationFrame(r));
    return Math.round(performance.now() - t0);
  });
  await p.waitForTimeout(800);
  /* 4 抽屜：開、連點 3 下（第 2 下在 300 ms 內） */
  await p.evaluate(() => {
    matAdd('wood', 0, 1e6);
    MAT().soul = 1e6;
  });
  await press(PORTM ? '#pnav [data-tm="nav:craft"]' : '#dnav [data-tm="nav:craft"]');
  await p.waitForTimeout(600);
  res.taps = await p.evaluate(async () => {
    const sel = '#pcamp .stamp[data-fg="gen:wood:1"]',
      lv = () => genOf('wood').lv,
      w = ms => new Promise(r => setTimeout(r, ms)),
      out = [];
    for (const d of [0, 150, 350]) {
      await w(d);
      const a = lv(),
        t = performance.now();
      document.querySelector(sel).click();
      await new Promise(r => requestAnimationFrame(r));
      out.push({ 間隔: d, 升: lv() - a, 第一個畫面變化ms: Math.round(performance.now() - t) });
    }
    return out;
  });
  await p.waitForTimeout(1200);
  await p.evaluate(() => closePanels());
  /* 5 點按鈕 → 第一個畫面變化（5 次取最大）：點掛機條，量到掛機條 class 變的那一格 */
  res.tap = [];
  for (let i = 0; i < 5; i++)
    res.tap.push(
      await p.evaluate(
        () =>
          new Promise(r => {
            const el = $('pidle'),
              c0 = el.className,
              t = performance.now();
            el.querySelector('[data-a=idlex]').click();
            const f = () => (el.className !== c0 ? r(Math.round(performance.now() - t)) : requestAnimationFrame(f));
            requestAnimationFrame(f);
          })
      )
    );
  /* 6 掛機條展開與 6 秒自動收 */
  await p.evaluate(() => IDLE.open && idleToggle());
  await p.waitForTimeout(300);
  res.idle = await p.evaluate(
    () =>
      new Promise(r => {
        idleToggle();
        const t = performance.now(),
          f = () => (!$('pidle').classList.contains('open') ? r(Math.round(performance.now() - t)) : requestAnimationFrame(f));
        requestAnimationFrame(f);
      })
  );
  await p.waitForTimeout(500);
  await cdp.send('Page.stopScreencast');
  await ctx.close();
  fs.mkdirSync(dir, { recursive: true });
  let list = '';
  FR.forEach(([t, d], i) => {
    const f = path.join(dir, `f${String(i).padStart(5, '0')}.jpg`);
    fs.writeFileSync(f, Buffer.from(d, 'base64'));
    const dur = i + 1 < FR.length ? FR[i + 1][0] - t : 0.04;
    list += `file '${f}'\nduration ${dur.toFixed(4)}\n`;
  });
  fs.writeFileSync(path.join(dir, 'list.txt'), list);
  const dst = path.join(OUT, `dpoe-ui1a_${tag}.webm`);
  require('child_process').execFileSync('/usr/bin/ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-vf', 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libvpx', '-b:v', '600k', dst]);
  fs.rmSync(dir, { recursive: true, force: true });
  res.frames = FR.length;
  fs.writeFileSync(path.join(OUT, 'dpoe-ui1a', `video_${tag}.json`), JSON.stringify(res, null, 1));
  console.log(tag, JSON.stringify(res));
  await b.close();
})();
