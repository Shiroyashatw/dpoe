/* dpoe-camp-audit 量測腳本 3（只讀）：單座卡＋lookTiers 實際演出。
   營地 → 點鍛造台牌匾（plqUse → cdOne）截單座卡 → 按卡上真的升級鈕（data-fg）三次：
   Lv0→1（表內）、Lv1→2（不在表內）、Lv4→5（表內），每次記 DUST.up.forge.T、牌匾縮放持續多久、塵土最後一顆結束時間，
   並比對鍛造台建築那一塊升級前後的像素（看有沒有換外觀）。
   測試時在頁面裡把 costRows／costPay 換成「不用錢」（只在這個瀏覽器分頁，不改檔案）；DUST.last 清掉避開 10 秒連升。
   用法：node probe3.js 390 844 | node probe3.js 1280 720（先開 python3 -m http.server 8123） */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
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
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => act('camp'));
  await pg.waitForTimeout(1500);
  /* 鏡頭移到鍛造台（390 首頁看不到鍛造台） */
  await pg.evaluate(() => campPan(G.props.find(p => p.k === 'forge').x - G.cam.x));
  await pg.waitForTimeout(1200);
  await pg.screenshot({ path: path.join(OUT, `card_${tag}_0_forge_scene.png`) });
  await pg.evaluate(() => plqUse(G.props.find(p => p.k === 'forge')));
  await pg.waitForTimeout(600);
  await pg.screenshot({ path: path.join(OUT, `card_${tag}_1_single_card.png`) });
  const card = await pg.evaluate(() => {
    const el = document.querySelector('#pcamp') || document.querySelector('.cd1');
    const r = (el.closest('.panel') || el).getBoundingClientRect();
    return {
      panelRect: [r.left, r.top, r.right, r.bottom].map(Math.round),
      head: document.querySelector('#pcamp .ph') ? document.querySelector('#pcamp .ph').innerText : null,
      btns: [...document.querySelectorAll('#pcamp button')].map(b => b.innerText || b.getAttribute('aria-label')),
      upBtn: !!document.querySelector('#pcamp .cd1 [data-fg]')
    };
  });
  /* 免費升級（只在這個分頁） */
  await pg.evaluate(() => {
    window.costRows = () => [];
    window.costPay = () => {};
  });
  const rows = [];
  for (const [from, label] of [
    [0, 'Lv0→1（lookTiers 表內 1）'],
    [1, 'Lv1→2（不在表內）'],
    [4, 'Lv4→5（lookTiers 表內 5）']
  ]) {
    /* 升級前截圖（為了比對建築，關掉面板） */
    await pg.evaluate(f => {
      S.camp.forge = f;
      DUST.last = {};
      closePanels();
      /* 鏡頭釘在鍛造台（panT 設很大＝不回主角，只在這個分頁） */
      campPan(G.props.find(p => p.k === 'forge').x - G.cam.x);
      G.panT = 1e9;
    }, from);
    await pg.waitForTimeout(1200);
    const pre = await pg.screenshot();
    const r = await pg.evaluate(async () => {
      const k = G.props.find(p => p.k === 'forge');
      cdOne('forge');
      await new Promise(r => setTimeout(r, 300));
      const btn = document.querySelector('#pcamp .cd1 [data-fg]');
      const t0 = performance.now();
      btn.click();
      const up = { ...DUST.up.forge };
      let scEnd = 0,
        dustEnd = 0,
        dustMax = 0;
      await new Promise(res => {
        const f = () => {
          const now = performance.now();
          if (plqScale('forge', now) !== 1) scEnd = now - t0;
          const on = DUST.p.filter(d => d.on).length;
          if (DUST.p.length) dustEnd = now - t0;
          dustMax = Math.max(dustMax, on);
          if (now - t0 < 2500) requestAnimationFrame(f);
          else res();
        };
        requestAnimationFrame(f);
      });
      return { lv: S.camp.forge, T: up.T, q: up.q, scaleMs: Math.round(scEnd), dustLastMs: Math.round(dustEnd), dustMax, rect: k._pr };
    });
    await pg.evaluate(() => closePanels());
    await pg.waitForTimeout(400);
    const post = await pg.screenshot();
    fs.writeFileSync(path.join(OUT, `card_${tag}_up_${from}to${from + 1}.png`), post);
    /* 比對鍛造台建築那一塊（世界 (300,470) 附近 ±60×±90，扣掉牌匾矩形） */
    const diff = await pg.evaluate(
      async ([a, b]) => {
        const load = s =>
          new Promise(r => {
            const i = new Image();
            i.onload = () => r(i);
            i.src = 'data:image/png;base64,' + s;
          });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        const c = document.createElement('canvas');
        c.width = ia.width;
        c.height = ia.height;
        const g = c.getContext('2d');
        g.drawImage(ia, 0, 0);
        const A = g.getImageData(0, 0, c.width, c.height).data;
        g.drawImage(ib, 0, 0);
        const B = g.getImageData(0, 0, c.width, c.height).data;
        const k = G.props.find(p => p.k === 'forge'),
          Wd = IW / ZOOM,
          Hd = cvH() / ZOOM,
          ox = Math.round(Wd / 2 - G.cam.x),
          oy = Math.round(Hd / 2 - G.cam.y),
          cx = Math.round((k.x + ox) * ZOOM),
          cy = Math.round((k.y + oy) * ZOOM) + cvTop(),
          pr = k._pr;
        let n = 0,
          tot = 0;
        for (let y = cy - Math.round(110 * ZOOM); y < cy + Math.round(30 * ZOOM); y++)
          for (let x = cx - Math.round(70 * ZOOM); x < cx + Math.round(70 * ZOOM); x++) {
            if (x < 0 || y < 0 || x >= c.width || y >= c.height) continue;
            if (pr && x >= pr[0] - 6 && x < pr[0] + pr[2] + 6 && y >= pr[1] + cvTop() - 6 && y < pr[1] + pr[3] + cvTop() + 6) continue;
            tot++;
            const i = (y * c.width + x) * 4;
            if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 60) n++;
          }
        return { changed: n, of: tot };
      },
      [pre.toString('base64'), post.toString('base64')]
    );
    rows.push({ label, ...r, buildingDiff: diff });
  }
  const res = { tag, card, rows };
  fs.writeFileSync(path.join(OUT, `card_looktiers_${tag}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
