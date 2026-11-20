/* dpoe-camp-audit 量測腳本（只讀，不改遊戲）：開本機伺服器的 main 08c7921，
   新存檔 → proSkip() 開刷 → act('camp') 回營地 → 每幀記錄主角、鏡頭、牌匾、擺設錨點、稻草人、NPC 的位置，
   中間做一次「左拖平移」再放開等鏡頭自己回來，同時錄影、截圖。
   用法：node probe.js 390 844 | node probe.js 1280 720   （先在 repo 根目錄開 python3 -m http.server 8123） */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [W, H] = [+process.argv[2] || 390, +process.argv[3] || 844];
const OUT = __dirname;
const tag = `${W}x${H}`;
const mob = W < H;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    isMobile: mob,
    hasTouch: mob
  });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8123/index.html');
  await pg.waitForFunction(() => typeof proSkip === 'function' && typeof G === 'object');
  await pg.evaluate(() => proSkip());
  await pg.waitForTimeout(3000);
  await pg.evaluate(() => act('camp'));
  await pg.waitForTimeout(1500);
  /* 錄影：CDP screencast 抓幀（帶時間戳），結束後用系統 ffmpeg 接成 webm */
  const vd = path.join(OUT, 'tmpvid');
  fs.mkdirSync(vd, { recursive: true });
  const sc = await ctx.newCDPSession(pg),
    shots = [];
  sc.on('Page.screencastFrame', async f => {
    const fn = path.join(vd, `f${String(shots.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(fn, Buffer.from(f.data, 'base64'));
    shots.push([fn, f.metadata.timestamp]);
    await sc.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await sc.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 });
  /* 每幀記錄：世界座標＋螢幕座標（牌匾是螢幕矩形 _pr；擺設錨點螢幕 x＝(k.x+ox)*ZOOM） */
  await pg.evaluate(() => {
    window.__log = [];
    const t0 = performance.now();
    const f = () => {
      if (G.scene === 'camp') {
        const Wd = IW / ZOOM,
          Hd = cvH() / ZOOM,
          ox = Math.round(Wd / 2 - G.cam.x),
          oy = Math.round(Hd / 2 - G.cam.y),
          sx = x => Math.round((x + ox) * ZOOM);
        window.__log.push({
          t: Math.round(performance.now() - t0),
          scene: G.scene,
          ai: AI.on,
          P: [+P.x.toFixed(1), +P.y.toFixed(1)],
          Psx: sx(P.x),
          cam: [+G.cam.x.toFixed(1), +G.cam.y.toFixed(1)],
          pan: +(G.pan || 0).toFixed(1),
          props: G.props.map(k => ({ k: k.k, ax: sx(k.x), pr: k._pr ? [k._pr[0], k._pr[1]] : null })),
          mobs: G.mobs.map(m => ({ n: m.n, x: +m.x.toFixed(1), y: +m.y.toFixed(1), sx: sx(m.x) })),
          npcs: G.npcs.map(n => ({ k: n.k, x: n.x, y: n.y, sx: sx(n.x) }))
        });
      }
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  await pg.waitForTimeout(2000);
  await pg.screenshot({ path: path.join(OUT, `camp_${tag}_idle.png`) });
  /* 拖曳平移：從畫面中間往右拖 W*0.45（鏡頭往左看），分 20 步 */
  const y = Math.round(H * 0.55),
    x0 = Math.round(W * 0.3),
    x1 = Math.round(W * 0.75);
  if (mob) {
    const cdp = await ctx.newCDPSession(pg);
    const tp = (type, x) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await tp('touchStart', x0);
    for (let i = 1; i <= 20; i++) await tp('touchMove', x0 + ((x1 - x0) * i) / 20), await pg.waitForTimeout(16);
    await pg.waitForTimeout(200);
    await pg.screenshot({ path: path.join(OUT, `camp_${tag}_panned.png`) });
    await tp('touchEnd');
  } else {
    await pg.mouse.move(x0, y);
    await pg.mouse.down();
    for (let i = 1; i <= 20; i++) await pg.mouse.move(x0 + ((x1 - x0) * i) / 20, y), await pg.waitForTimeout(16);
    await pg.waitForTimeout(200);
    await pg.screenshot({ path: path.join(OUT, `camp_${tag}_panned.png`) });
    await pg.mouse.up();
  }
  /* 放開後 3 秒開始慢慢回主角，看 6 秒 */
  await pg.waitForTimeout(6500);
  await pg.screenshot({ path: path.join(OUT, `camp_${tag}_back.png`) });
  const log = await pg.evaluate(() => window.__log);
  const ver = await pg.evaluate(() => VER);
  await sc.send('Page.stopScreencast');
  await ctx.close();
  await b.close();
  const lst = shots
    .map(([fn, ts], i) => `file '${fn}'\nduration ${((shots[i + 1] ? shots[i + 1][1] : ts + 0.05) - ts).toFixed(3)}`)
    .join('\n');
  fs.writeFileSync(path.join(vd, 'list.txt'), lst + `\nfile '${shots[shots.length - 1][0]}'\n`);
  require('child_process').execSync(
    `ffmpeg -y -loglevel error -f concat -safe 0 -i ${vd}/list.txt -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30" -c:v libvpx-vp9 -b:v 600k ${OUT}/camp_${tag}.webm`
  );
  fs.rmSync(vd, { recursive: true });
  fs.writeFileSync(path.join(OUT, `frames_${tag}.json`), JSON.stringify({ ver, W, H, errs, log }));
  /* 摘要：每個實體逐幀螢幕位移，最大跳幅；牌匾相對自己建築錨點的偏移變化（＝不跟建築走的部分） */
  const L = log;
  const rep = [`VER ${ver} ${tag} 幀數 ${L.length} 頁面錯誤 ${errs.length}`];
  const mx = a => (a.length ? Math.max(...a) : 0);
  const dP = [],
    dCam = [];
  for (let i = 1; i < L.length; i++) {
    dP.push(Math.hypot(L[i].P[0] - L[i - 1].P[0], L[i].P[1] - L[i - 1].P[1]));
    dCam.push(Math.abs(L[i].cam[0] - L[i - 1].cam[0]));
  }
  rep.push(`主角 世界座標每幀位移最大 ${mx(dP).toFixed(1)} px（起 ${L[0].P} 終 ${L[L.length - 1].P}）`);
  rep.push(`鏡頭 x 每幀最大 ${mx(dCam).toFixed(1)} 世界 px；pan 範圍 ${Math.min(...L.map(r => r.pan))}～${Math.max(...L.map(r => r.pan))}`);
  const ks = L[0].props.map(p => p.k);
  for (const k of ks) {
    let jx = 0,
      jy = 0,
      jRel = 0,
      at = null,
      hid = 0;
    for (let i = 1; i < L.length; i++) {
      const a = L[i - 1].props.find(p => p.k === k),
        c = L[i].props.find(p => p.k === k);
      if (!a.pr || !c.pr) {
        if (!!a.pr !== !!c.pr) hid++;
        continue;
      }
      const dx = Math.abs(c.pr[0] - a.pr[0]),
        dy = Math.abs(c.pr[1] - a.pr[1]),
        rel = Math.abs(c.pr[0] - c.ax - (a.pr[0] - a.ax));
      if (dx > jx) jx = dx;
      if (dy > jy) jy = dy;
      if (rel > jRel) (jRel = rel), (at = L[i].t);
    }
    rep.push(
      `牌匾 ${k}：每幀 x 最大 ${jx}、y 最大 ${jy} 螢幕 px；相對建築錨點偏移每幀最大變化 ${jRel} px（t=${at} ms）；出現／消失切換 ${hid} 次`
    );
  }
  const m0 = L[0].mobs;
  for (let j = 0; j < m0.length; j++) {
    let d = 0;
    for (let i = 1; i < L.length; i++) {
      const a = L[i - 1].mobs[j],
        c = L[i].mobs[j];
      if (a && c) d = Math.max(d, Math.hypot(c.x - a.x, c.y - a.y));
    }
    rep.push(`怪物 ${m0[j].n}（${m0[j].x},${m0[j].y}）世界座標每幀最大位移 ${d.toFixed(1)}`);
  }
  rep.push(`NPC：${JSON.stringify(L[0].npcs.map(n => n.k))}（每幀數量 ${[...new Set(L.map(r => r.npcs.length))]}）`);
  rep.push(`AI.on 值：${[...new Set(L.map(r => r.ai))]}；scene：${[...new Set(L.map(r => r.scene))]}`);
  fs.writeFileSync(path.join(OUT, `summary_${tag}.log`), rep.join('\n') + '\n');
  console.log(rep.join('\n'));
})();
