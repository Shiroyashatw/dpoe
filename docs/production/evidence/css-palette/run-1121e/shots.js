/* #159 簽核必修 M1／M2／M3／M5／M6＋天賦樹像素（dpoe-css-palette4；palette5 沿用，M1 黑邊改不透明）。
   用法：PW_CHROME=/opt/pw-browsers/chromium node shots.js <網址> <輸出資料夾> <前綴 main|branch>
   產出：<前綴>-facts.json＋截圖；measure.py 再並排、算對比、寫 measure.csv。
   亂數在載入前固定、場景擺好後停掉主迴圈再手動 draw()，main 與分支同一個畫面。 */
const { chromium } = require('playwright');
const fs = require('fs');
const [URL, OUT, TAG] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const seed = () => {
  let s = 12345;
  Math.random = () => ((s = (s * 1103515245 + 12345) % 2147483648), s / 2147483648);
  window.__reseed = v => (s = v);
};
const scene = p =>
  p.evaluate(() => {
    try {
      introStop();
    } catch (e) {}
    window.hurtPlayer = () => 0;
    closePanels();
    try {
      chaseBnHide();
    } catch (e) {}
    $('banner').hidden = true;
    S.auto = 0;
    window.requestAnimationFrame = () => 0;
    __reseed(4242);
    runNode(TRUNK_K[14], 1);
    __reseed(99);
    const c0 = floorNear(G.W / 2, G.H / 2, 0, 400, 40) || { x: G.W / 2, y: G.H / 2 };
    P.x = c0.x;
    P.y = c0.y;
    G.cam.x = P.x;
    G.cam.y = P.y;
    G.mobs = [];
    G.drops = [];
    G.fx = [];
    G.tele = [];
    G.nums = [];
    G.ground = [];
  });
async function ctxOf(b, W, H) {
  const mob = W < 900;
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    hasTouch: mob,
    isMobile: mob
  });
  await ctx.route(/supabase/, r => r.abort());
  await ctx.addInitScript(seed);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?test=chase');
  await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
  await p.waitForTimeout(2500);
  return { ctx, p, errs };
}
/* 畫面座標（CSS px） */
const scr = () => {
  const r = CV.getBoundingClientRect(),
    k = r.width / IW;
  return (x, y) => [
    Math.round(r.left + (x - G.cam.x + IW / ZOOM / 2) * ZOOM * k),
    Math.round(r.top + (y - G.cam.y + cvH() / ZOOM / 2) * ZOOM * k)
  ];
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const facts = { sizes: {} };
  /* ======== M1 王閃現線：攔遊戲 draw() 實際對閃現圓呼叫的 stroke，照同樣的參數畫在五種淺磚上 ======== */
  facts.blink = {};
  for (const [W, H] of [
    [390, 844],
    [1280, 720]
  ]) {
    const { ctx, p, errs } = await ctxOf(b, W, H);
    await scene(p);
    for (const [a0, t] of [
      ['a0.9', 0],
      ['a0.7', 0.25]
    ]) {
      const nm = `${W}x${H}/${a0}`;
      facts.blink[nm] = await p.evaluate(
        ([t, sc]) => {
          G.mobs = [];
          spawnBoss();
          G.fx = [];
          const m = G.mobs[G.mobs.length - 1];
          m.x = P.x + 200;
          m.y = P.y;
          m.st = 'wind';
          m.pat = 'blink';
          m.t = t;
          m.tx = P.x - 120;
          m.ty = P.y - 40;
          G.t = 10;
          const pr = CanvasRenderingContext2D.prototype,
            arc0 = pr.arc,
            st0 = pr.stroke,
            bp0 = pr.beginPath,
            rec = [];
          let hit = false;
          pr.beginPath = function () {
            hit = false;
            return bp0.call(this);
          };
          pr.arc = function (x, y, ...a) {
            if (this.canvas === CV && x === m.tx && y === m.ty) hit = true;
            return arc0.call(this, x, y, ...a);
          };
          pr.stroke = function (...a) {
            if (hit) rec.push({ style: String(this.strokeStyle), lw: this.lineWidth, a: +this.globalAlpha.toFixed(4) });
            return st0.apply(this, a);
          };
          try {
            draw();
          } finally {
            pr.arc = arc0;
            pr.stroke = st0;
            pr.beginPath = bp0;
          }
          /* 同樣的筆畫畫在五種淺磚（合成底，同 run-1121c） */
          const cv = document.createElement('canvas');
          cv.width = 400;
          cv.height = 200;
          const c = cv.getContext('2d'),
            main = CX,
            bases = [['規格淺磚 #615b56', '#615b56']].concat(
              Object.entries(PAL.scene)
                .map(([k, v]) => [`--scene-${k}-light`, v.light])
                .filter(x => x[1])
            ),
            px = (x, y) => [...c.getImageData(x, y, 1, 1).data.slice(0, 3)],
            out = [];
          for (const [nm, bg] of bases) {
            CX = c;
            c.setTransform(1, 0, 0, 1, 0, 0);
            c.globalAlpha = 1;
            c.fillStyle = bg;
            c.fillRect(0, 0, 400, 200);
            c.lineWidth = 2;
            teleCircle(100, 100, 80, 1);
            CX = main;
            c.beginPath();
            c.arc(300.5, 100.5, 80, 0, Math.PI * 2);
            for (const r of rec) {
              c.globalAlpha = r.a;
              c.lineWidth = r.lw;
              c.strokeStyle = r.style;
              c.stroke();
            }
            c.globalAlpha = 1;
            /* 圓在 x=380.5：3 px 線佔 379–381、5 px 黑邊多出 378 和 382；384 是淺磚 */
            out.push({
              base: nm,
              bg: px(5, 5),
              line: px(380, 100),
              edgeOut: px(382, 100),
              edgeIn: px(378, 100),
              out: px(386, 100),
              png: sc ? cv.toDataURL() : null
            });
          }
          /* 遊戲畫面上的閃現圓（真實地圖，含燈光） */
          const s = (() => {
            const r = CV.getBoundingClientRect(),
              k = r.width / IW;
            return [
              Math.round(r.left + (m.tx - G.cam.x + IW / ZOOM / 2) * ZOOM * k),
              Math.round(r.top + (m.ty - G.cam.y + cvH() / ZOOM / 2) * ZOOM * k),
              Math.round(m.r * (1.6 - (1 - t / 0.75) * 0.6) * ZOOM * k)
            ];
          })();
          return { rec, out, at: s };
        },
        [t, a0 === 'a0.9']
      );
      const B = facts.blink[nm];
      await p.screenshot({
        path: `${OUT}/${TAG}-blink-ingame-${W}x${H}-${a0}.png`,
        clip: {
          x: B.at[0] - B.at[2] - 30,
          y: B.at[1] - B.at[2] - 30,
          width: 2 * B.at[2] + 60,
          height: 2 * B.at[2] + 60
        }
      });
      for (const o of B.out) {
        if (o.png)
          fs.writeFileSync(
            `${OUT}/${TAG}-tele-${W}x${H}-${o.base.replace(/[^\w]+/g, '_')}.png`,
            Buffer.from(o.png.split(',')[1], 'base64')
          );
        delete o.png;
      }
    }
    facts.sizes[`${W}x${H}`] = { errs };
    await ctx.close();
  }
  /* ======== 兩種尺寸：小地圖王點、燃燒地面並排、面板 ======== */
  for (const [W, H] of [
    [390, 844],
    [1280, 720]
  ]) {
    const { ctx, p, errs } = await ctxOf(b, W, H),
      tag = `${TAG}-${W}x${H}`,
      F = (facts.sizes[`${W}x${H}`] = facts.sizes[`${W}x${H}`] || {});
    await scene(p);
    await p.evaluate(`window.scr = ${scr.toString()}`);
    /* M2 小地圖王點：攔 drawMinimap 的 fillRect 拿王點在畫布上的位置，直接讀畫布像素 */
    F.mini = await p.evaluate(() => {
      spawnBoss();
      G.fx = [];
      const bm = G.mobs[G.mobs.length - 1];
      bm.x = P.x + 150;
      bm.y = P.y - 120;
      G.t = 10;
      const fr = CanvasRenderingContext2D.prototype.fillRect,
        dm = window.drawMinimap,
        rects = [];
      window.drawMinimap = function (...a) {
        CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
          const t = this.getTransform();
          rects.push({ col: String(this.fillStyle), x: t.a * x + t.e, y: t.d * y + t.f, w: w * t.a, h: h * t.d });
          return fr.call(this, x, y, w, h);
        };
        try {
          return dm.apply(this, a);
        } finally {
          CanvasRenderingContext2D.prototype.fillRect = fr;
        }
      };
      draw();
      window.drawMinimap = dm;
      const boss = rects.filter(r => r.w >= 4.5 && r.w < 10).pop();
      if (!boss) return { err: 'no boss dot', rects: rects.slice(-6) };
      const g = CV.getContext('2d'),
        cx = Math.floor(boss.x + boss.w / 2),
        cy = Math.floor(boss.y + boss.h / 2),
        px = (x, y) => [...g.getImageData(x, y, 1, 1).data.slice(0, 3)],
        row = [];
      for (let d = -7; d <= 7; d++) row.push(px(cx + d, cy));
      const cr = CV.getBoundingClientRect(),
        k = cr.width / CV.width;
      return {
        rects: rects.filter(r => r.w >= 4.5 && r.w < 10),
        cx,
        cy,
        row,
        col: [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map(d => px(cx, cy + d)),
        screen: [Math.round(cr.left + cx * k), Math.round(cr.top + cy * k)],
        pal: { enemyTel: PAL.enemyTel, ringEdge: PAL.ringEdge }
      };
    });
    if (F.mini.screen)
      await p.screenshot({
        path: `${OUT}/${tag}-mini.png`,
        clip: { x: F.mini.screen[0] - 20, y: F.mini.screen[1] - 20, width: 40, height: 40 }
      });
    /* M3 燃燒地面：我方（左）＋怪物方（右）並排 */
    F.ground = await p.evaluate(() => {
      G.mobs = [];
      G.fx = [];
      G.ground = [];
      const gy = P.y + 110;
      addGround({ k: 'fire', x: P.x - 75, y: gy, r: 60, dur: 9, dps: 0 });
      addGround({ k: 'fire', side: 'm', x: P.x + 75, y: gy, r: 60, dur: 9, dps: 0 });
      G.t = 10;
      draw();
      const s = scr(),
        a = s(P.x - 75, gy + 30),
        bb = s(P.x + 75, gy + 30),
        bg = s(P.x, gy + 105),
        g = CV.getContext('2d'),
        cr = CV.getBoundingClientRect(),
        k = CV.width / cr.width,
        px = q => [
          ...g.getImageData(Math.round((q[0] - cr.left) * k), Math.round((q[1] - cr.top) * k), 1, 1).data.slice(0, 3)
        ];
      return {
        own: px(a),
        foe: px(bb),
        floor: px(bg),
        box: [s(P.x - 150, gy - 60), s(P.x + 150, gy + 60)],
        pal: { elFire: PAL.elFire, enemyTel: PAL.enemyTel }
      };
    });
    {
      const [[x0, y0], [x1, y1]] = F.ground.box;
      await p.screenshot({
        path: `${OUT}/${tag}-ground-fire.png`,
        clip: {
          x: Math.max(0, x0 - 20),
          y: Math.max(0, y0 - 20),
          width: Math.min(W, x1 - x0 + 40),
          height: y1 - y0 + 40
        }
      });
      await p.screenshot({ path: `${OUT}/${tag}-ground-fire-full.png` });
    }
    await p.evaluate(() => (G.ground = []));
    /* M5 停用主鈕：先關天賦樹（上一輪沒關，拍到的是天賦樹），再開背包、插三顆鈕 */
    const rect = `e => { if (!e || !e.offsetWidth) return null; const q = e.getBoundingClientRect(); return [q.left, q.top, q.width, q.height].map(Math.round); }`;
    F.btn = await p.evaluate(rect => {
      rect = eval(rect);
      closePanels();
      try {
        treeClose();
      } catch (e) {}
      fmenuOpen('inv');
      const pn = [...document.querySelectorAll('.panel')].find(e => e.offsetWidth);
      const bx = document.createElement('div');
      bx.id = '__btns';
      bx.style.cssText = 'padding:8px';
      /* 每顆鈕各包一層：兩顆 .btn.pri 相鄰時 CSS 會把後面的降成次鈕（.btn.pri ~ .btn.pri），run-1121c 就是這樣拍不到停用主鈕 */
      bx.innerHTML =
        '<span><button class="btn pri">主鈕</button></span> <span><button class="btn pri" disabled>停用主鈕</button></span> <span><button class="btn" disabled>停用鈕</button></span>';
      (pn || document.body).prepend(bx);
      const bs = [...bx.querySelectorAll('button')].map(e => {
        const c = getComputedStyle(e);
        return { t: e.textContent, r: rect(e), color: c.color, bg: c.backgroundColor, op: c.opacity, filter: c.filter };
      });
      return {
        panel: pn ? pn.id : null,
        tree: !!document.querySelector('#ptree') && !!document.querySelector('#ptree').offsetWidth,
        bs
      };
    }, rect);
    await p.waitForTimeout(600);
    /* 面板有滑入動畫：等完再量鈕的位置，跟截圖同一刻 */
    const rs = await p.evaluate(() =>
      [...document.querySelectorAll('#__btns button')].map(e =>
        (q => [q.left, q.top, q.width, q.height].map(Math.round))(e.getBoundingClientRect())
      )
    );
    F.btn.bs.forEach((x, i) => (x.r = rs[i]));
    await p.screenshot({ path: `${OUT}/${tag}-panel-btn-disabled.png` });
    await p.evaluate(() => {
      const b = document.querySelector('#__btns');
      if (b) b.remove();
      closePanels();
    });
    /* M6 分頁徽章 .dot.n.pill：給足金幣與材料，讓營地有可升級的東西 */
    F.badge = await p.evaluate(rect => {
      rect = eval(rect);
      S.gold = 1e15;
      MAT().soul = 1e9;
      MATSOF()[matKey('wood')] = 1e9;
      HV.nav = null;
      sheetSync();
      const d = [...document.querySelectorAll('.dot.n.pill')].filter(e => e.offsetWidth),
        e = d[0];
      if (!e) return { n: 0, ready: campReady() };
      const c = getComputedStyle(e);
      return {
        n: d.length,
        ready: campReady(),
        text: e.textContent,
        r: rect(e),
        color: c.color,
        bg: c.backgroundColor,
        font: c.font,
        parentBg: getComputedStyle(e.parentElement).backgroundColor
      };
    }, rect);
    await p.waitForTimeout(400);
    if (F.badge.n)
      F.badge.r = await p.evaluate(() =>
        (q => [q.left, q.top, q.width, q.height].map(Math.round))(
          [...document.querySelectorAll('.dot.n.pill')].find(e => e.offsetWidth).getBoundingClientRect()
        )
      );
    await p.screenshot({ path: `${OUT}/${tag}-panel-nav.png` });
    /* 天賦樹：樹底、連線、「還沒有昇華」字與圓底 */
    F.tree = await p.evaluate(rect => {
      rect = eval(rect);
      closePanels();
      S.asc = 0;
      treeOpen();
      const go = document.querySelector('#tascgo'),
        n = go && go.querySelector('.n'),
        circ = go && go.querySelector('circle'),
        pt = document.querySelector('#ptree'),
        ln = [...document.querySelectorAll('#tg line')].filter(l => {
          const q = l.getBoundingClientRect();
          return q.width + q.height > 30 && q.left > 0 && q.top > 0 && q.right < innerWidth && q.bottom < innerHeight;
        }),
        bb = e => {
          const q = e.getBoundingClientRect();
          return [q.left, q.top, q.width, q.height].map(Math.round);
        };
      return {
        text: n ? n.textContent : null,
        textR: n ? bb(n) : null,
        circR: circ ? bb(circ) : null,
        ptR: pt ? bb(pt) : null,
        lines: ln.slice(0, 40).map(l => ({
          cls: l.getAttribute('class'),
          p: [l.x1.baseVal.value, l.y1.baseVal.value, l.x2.baseVal.value, l.y2.baseVal.value],
          ctm: (m => [m.a, m.b, m.c, m.d, m.e, m.f])(l.getScreenCTM()),
          stroke: getComputedStyle(l).stroke
        })),
        ptBg: pt ? getComputedStyle(pt).backgroundColor : null,
        nFill: n ? getComputedStyle(n).fill : null,
        cFill: circ ? getComputedStyle(circ).fill : null
      };
    }, rect);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${tag}-panel-tree.png` });
    F.errs = errs;
    await ctx.close();
  }
  fs.writeFileSync(`${OUT}/${TAG}-facts.json`, JSON.stringify(facts, null, 1));
  console.log(
    TAG,
    'errs',
    JSON.stringify(Object.values(facts.sizes).map(s => s.errs)),
    'badge',
    JSON.stringify(Object.values(facts.sizes).map(s => s.badge && s.badge.n)),
    'btnPanel',
    JSON.stringify(Object.values(facts.sizes).map(s => s.btn && [s.btn.panel, s.btn.tree]))
  );
  await b.close();
})();
