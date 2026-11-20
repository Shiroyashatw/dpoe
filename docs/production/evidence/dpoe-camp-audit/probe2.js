/* dpoe-camp-audit 量測腳本 2（只讀）：轉場時的主角與鏡頭。
   刷圖 2 秒 → act('camp') 回營地 → 點練習區（useProp → pracGo）→ 再點一次回站位 → 按「繼續刷」。
   每幀記主角世界座標、主角螢幕座標、鏡頭、scene；用 CDP screencast 錄影。
   用法：node probe2.js 390 844 | node probe2.js 1280 720（先開 python3 -m http.server 8123） */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const [W, H] = [+process.argv[2] || 390, +process.argv[3] || 844];
const OUT = __dirname,
  tag = `${W}x${H}`,
  mob = W < H;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: mob, hasTouch: mob });
  const pg = await ctx.newPage();
  await pg.goto('http://localhost:8123/index.html');
  await pg.waitForFunction(() => typeof proSkip === 'function' && typeof G === 'object');
  await pg.evaluate(() => proSkip());
  await pg.waitForTimeout(2500);
  const vd = path.join(OUT, 'tmpvid2');
  fs.mkdirSync(vd, { recursive: true });
  const sc = await ctx.newCDPSession(pg),
    shots = [];
  sc.on('Page.screencastFrame', async f => {
    const fn = path.join(vd, `f${String(shots.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(fn, Buffer.from(f.data, 'base64'));
    shots.push([fn, f.metadata.timestamp]);
    await sc.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await sc.send('Page.startScreencast', { format: 'jpeg', quality: 70 });
  await pg.evaluate(() => {
    window.__log = [];
    window.__ev = [];
    const t0 = performance.now();
    window.__mark = s => __ev.push([Math.round(performance.now() - t0), s]);
    const f = () => {
      const Wd = IW / ZOOM,
        Hd = cvH() / ZOOM,
        ox = Math.round(Wd / 2 - G.cam.x),
        oy = Math.round(Hd / 2 - G.cam.y);
      __log.push({
        t: Math.round(performance.now() - t0),
        scene: G.scene,
        P: [Math.round(P.x), Math.round(P.y)],
        Ps: [Math.round((P.x + ox) * ZOOM), Math.round((P.y + oy) * ZOOM)],
        cam: [Math.round(G.cam.x), Math.round(G.cam.y)],
        prac: !!PRAC.in,
        n: G.mobs.length
      });
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  const step = async (s, fn, ms, shot) => {
    await pg.evaluate(([s, fn]) => (__mark(s), eval(fn)), [s, fn]);
    await pg.waitForTimeout(ms);
    if (shot) await pg.screenshot({ path: path.join(OUT, `trans_${tag}_${shot}.png`) });
  };
  await step('刷圖中', '0', 1500);
  await step("act('camp') 回營地", "act('camp')", 2000, 'camp');
  await step('點練習區 useProp(prac)', "useProp(G.props.find(p=>p.k==='prac'))", 120, 'prac_120ms');
  await pg.waitForTimeout(2400);
  await pg.screenshot({ path: path.join(OUT, `trans_${tag}_prac.png`) });
  await step('再點練習區（回站位）', "useProp(G.props.find(p=>p.k==='prac'))", 2500);
  await step('繼續刷', "document.querySelector('[data-a=resume]').click()", 2500, 'resume');
  await sc.send('Page.stopScreencast');
  const { log, ev } = await pg.evaluate(() => ({ log: __log, ev: __ev }));
  await ctx.close();
  await b.close();
  const lst = shots
    .map(([fn, ts], i) => `file '${fn}'\nduration ${((shots[i + 1] ? shots[i + 1][1] : ts + 0.05) - ts).toFixed(3)}`)
    .join('\n');
  fs.writeFileSync(path.join(vd, 'list.txt'), lst + `\nfile '${shots[shots.length - 1][0]}'\n`);
  execSync(
    `ffmpeg -y -loglevel error -f concat -safe 0 -i ${vd}/list.txt -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30" -c:v libvpx-vp9 -b:v 600k ${OUT}/trans_${tag}.webm`
  );
  fs.rmSync(vd, { recursive: true });
  fs.writeFileSync(path.join(OUT, `trans_frames_${tag}.json`), JSON.stringify({ ev, log }));
  /* 摘要：每段事件之後，主角世界座標單幀跳多少、主角在螢幕上滑了多遠、多久停下 */
  const rep = [`${tag} 幀數 ${log.length}`];
  for (let e = 0; e < ev.length; e++) {
    const [t0, s] = ev[e],
      t1 = ev[e + 1] ? ev[e + 1][0] : 1e9,
      seg = log.filter(r => r.t >= t0 - 20 && r.t < t1);
    let jw = 0,
      js = 0,
      last = t0;
    for (let i = 1; i < seg.length; i++) {
      const a = seg[i - 1],
        c = seg[i],
        dw = Math.hypot(c.P[0] - a.P[0], c.P[1] - a.P[1]),
        ds = Math.hypot(c.Ps[0] - a.Ps[0], c.Ps[1] - a.Ps[1]);
      jw = Math.max(jw, dw);
      js = Math.max(js, ds);
      if (ds > 1) last = c.t;
    }
    const a = seg[0],
      z = seg[seg.length - 1];
    rep.push(
      `[${s}] scene ${a.scene}→${z.scene}；主角世界 ${a.P}→${z.P}（單幀最大跳 ${jw.toFixed(0)}）；主角螢幕 ${a.Ps}→${z.Ps}（單幀最大 ${js.toFixed(0)} px，最後一次移動在事件後 ${last - t0} ms）；鏡頭 ${a.cam}→${z.cam}`
    );
  }
  fs.writeFileSync(path.join(OUT, `trans_summary_${tag}.log`), rep.join('\n') + '\n');
  console.log(rep.join('\n'));
})();
