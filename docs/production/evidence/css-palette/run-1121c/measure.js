/* CSS 對齊色票 PR 第三輪（dpoe-css-palette3）：把 SIGNOFF-CHECKLIST 上一輪「未驗」的項目在瀏覽器裡實際量。
   用法：node measure.js <網址> <原始碼資料夾> <輸出資料夾> <前綴 main|branch>
   產出：<前綴>-facts.json（量測原始數據）＋截圖；measure.py 再把 main／分支並排、算對比與 ΔE、寫 measure.csv。
   亂數在載入前固定、場景擺好後停掉主迴圈再手動 draw()，main 與分支同一個畫面。 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [URL, SRC, OUT, TAG] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const seed = () => {
  let s = 12345;
  Math.random = () => ((s = (s * 1103515245 + 12345) % 2147483648), s / 2147483648);
  window.__reseed = v => (s = v);
};
/* ---- 原始碼靜態掃：JS 讀到的 PAL 鍵、所有 fx 環的呼叫點 ---- */
const jsFiles = fs.readdirSync(path.join(SRC, 'js')).filter(f => f.endsWith('.js'));
const palKeys = new Set(),
  rings = [];
for (const f of jsFiles) {
  const t = fs.readFileSync(path.join(SRC, 'js', f), 'utf8');
  for (const m of t.matchAll(/\bPAL\.(rgb\.|scene\.(\w+)\.)?([a-zA-Z]\w*)/g))
    palKeys.add(m[1] ? (m[1] === 'rgb.' ? 'rgb.' + m[3] : 'scene.' + m[2] + '.' + m[3]) : m[3]);
  const lines = t.split('\n');
  lines.forEach((ln, i) => {
    if (!/fx\(\{ k: 'ring'/.test(ln)) return;
    /* 物件常值可能跨行：接到配對的 }) 為止 */
    let s = ln.slice(ln.indexOf("fx({ k: 'ring'")),
      j = i;
    while (!/\}\)/.test(s) && j < i + 8) s += ' ' + lines[++j].trim();
    s = s.slice(0, s.indexOf('})') + 1);
    const col = (s.match(/col: ([^,}]+?)(?:,|\s*\})/) || [])[1],
      sh = (s.match(/sh: ([^,}]+?)(?:,|\s*\})/) || [])[1];
    rings.push({ file: f, line: i + 1, col: col ? col.trim() : null, sh: sh ? sh.trim() : null });
  });
}
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
const toPx = () => {
  const W = IW / ZOOM,
    H = cvH() / ZOOM,
    r = CV.getBoundingClientRect();
  return (x, y) => [
    Math.round(r.left + (x - G.cam.x + W / 2) * ZOOM * (r.width / IW)),
    Math.round(r.top + (y - G.cam.y + H / 2) * ZOOM * (r.width / IW))
  ];
};
async function ctxOf(b, W, H) {
  const mob = W < 900;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: mob, isMobile: mob });
  await ctx.route(/supabase/, r => r.abort());
  await ctx.addInitScript(seed);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?test=chase');
  await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
  await p.waitForTimeout(2500);
  await p.evaluate(`window.toPx = ${toPx.toString()}`);
  return { ctx, p, errs };
}
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const facts = { rings: [], sizes: {} };
  /* ======== 1280×720：PAL 開機掃描、X2 逐一觸發、X4 黑邊、預警壓淺磚 ======== */
  {
    const { ctx, p, errs } = await ctxOf(b, 1280, 720);
    /* §1 PAL 開機掃描：JS 讀到的每個鍵＋:root 每個 token 的解析值 */
    facts.pal = await p.evaluate(keys => {
      const get = k => k.split('.').reduce((o, x) => (o == null ? o : o[x]), PAL),
        cs = getComputedStyle(document.documentElement),
        root = {};
      for (const sh of document.styleSheets) {
        let rs;
        try {
          rs = sh.cssRules;
        } catch (e) {
          continue;
        }
        for (const r of rs)
          if (r.selectorText === ':root') for (const k of r.style) if (k.startsWith('--')) root[k] = cs.getPropertyValue(k).trim();
      }
      return { keys: keys.map(k => [k, get(k) === undefined ? null : typeof get(k) === 'object' ? '[obj]' : get(k)]), root };
    }, [...palKeys].sort());
    /* §2 X2：每一個 fx 環呼叫點，在頁面裡用真的 fx() 觸發，攔 fxs() 拿到實際播的序列圖；元素、地面這類變數逐一列舉 */
    await scene(p);
    facts.rings = await p.evaluate(sites => {
      const got = [],
        real = window.fxs;
      window.fxs = (n, ...a) => (got.push(n), real(n, ...a));
      const ELS = [undefined, 'phys', 'fire', 'cold', 'light', 'chaos'],
        out = [];
      for (const s of sites) {
        const vars = /\bel\b|\br\.el\b/.test(s.col + s.sh) ? ELS.map(e => ({ el: e, r: { el: e }, g: {} })) : /\bg\.k\b/.test(s.col + s.sh) ? Object.keys(GROUND).map(k => ({ g: { k }, r: {} })) : [{ r: {}, g: {} }];
        for (const v of vars) {
          let col, sh, err;
          try {
            const fn = new Function('el', 'r', 'g', 'c', 'D', 'a', 'm', 'o', 't', `return [${s.col || 'undefined'}, ${s.sh || 'undefined'}]`);
            [col, sh] = fn(v.el, v.r, v.g, {}, {}, {}, {}, {}, {});
          } catch (e) {
            err = e.message;
          }
          got.length = 0;
          const o = { k: 'ring', x: P.x, y: P.y, r: 80, dur: 1, col };
          if (s.sh) o.sh = sh;
          if (!err) fx(o);
          out.push({
            ...s,
            v: v.el !== undefined ? 'el=' + v.el : v.g.k ? 'g.k=' + v.g.k : vars.length > 1 ? 'el=undefined' : '',
            colVal: col === undefined ? null : col,
            sheet: err ? 'ERR ' + err : got[0] || null
          });
        }
      }
      window.fxs = real;
      G.fx = [];
      return out;
    }, rings);
    /* X2 截圖：每種「序列圖」各觸發一個真的事件或呼叫點，畫第 0.12 秒，截環周圍 */
    const trig = {
      '王現身 spawnBoss()': 'spawnBoss()',
      '獄火自爆 hfBoom()': 'ST.hfMax=ST.hfMax||100; hfBoom()'
    };
    facts.trig = {};
    for (const [k, js] of Object.entries(trig)) {
      await scene(p);
      facts.trig[k] = await p.evaluate(js => {
        const got = [],
          real = window.fxs;
        window.fxs = (n, ...a) => (got.push(n), real(n, ...a));
        try {
          eval(js);
        } catch (e) {
          return 'ERR ' + e.message;
        }
        window.fxs = real;
        const r = G.fx.filter(o => o.k === 'ring');
        return { sheets: got, rings: r.map(o => ({ col: o.col, sh: o.sh })) };
      }, js);
    }
    /* 每個不同的（呼叫點×變數）組合截一張 160×160：環＋序列圖 */
    const uniq = [];
    for (const r of facts.rings) if (!uniq.find(u => u.colVal === r.colVal && u.sheet === r.sheet)) uniq.push(r);
    facts.ringShots = [];
    for (let i = 0; i < uniq.length; i++) {
      const u = uniq[i];
      await scene(p);
      const pos = await p.evaluate(
        ([u]) => {
          const o = { k: 'ring', x: P.x, y: P.y + 10, r: 70, dur: 1, col: u.colVal || undefined };
          if (u.sh !== null) o.sh = u.sheet && !/^ERR/.test(u.sheet) ? u.sheet : undefined;
          /* main 沒有 sh 參數：直接走 main 的 fx()，用同一個 col 就會查到同一張圖 */
          fx(o);
          for (const f of G.fx) f.t = 0.12;
          G.t = 10;
          draw();
          return toPx()(P.x, P.y);
        },
        [u]
      );
      const f = `${OUT}/${TAG}-ring-${String(i).padStart(2, '0')}.png`;
      await p.screenshot({ path: f, clip: { x: pos[0] - 80, y: pos[1] - 80, width: 160, height: 160 } });
      facts.ringShots.push({ i, file: path.basename(f), colVal: u.colVal, sheet: u.sheet, site: `${u.file}:${u.line} ${u.v}` });
    }
    /* §2 X4：黑邊 alpha。攔 stroke()，記下畫 fx 環時每一筆的 globalAlpha／strokeStyle／lineWidth；另外用畫布像素反推 */
    facts.x4 = await p.evaluate(() => {
      const res = [];
      for (const [nm, col] of [
        ['我方 --fx-own', PAL.fxOwn],
        ['火 --el-fire', PAL.elFire],
        ['敵方 --enemy-tel', PAL.enemyTel],
        ['無 col（預設）', undefined]
      ])
        for (const t of [0, 0.3, 0.7]) {
          G.fx = [];
          G.mobs = [];
          G.tele = [];
          G.ground = [];
          G.t = 10;
          draw();
          const c = CV.getContext('2d'),
            W = CV.width,
            H = CV.height,
            before = c.getImageData(0, 0, W, H).data;
          G.fx = [{ k: 'ring', x: P.x, y: P.y + 10, r: 90, dur: 1, col, t }];
          const log = [],
            st = CanvasRenderingContext2D.prototype.stroke;
          CanvasRenderingContext2D.prototype.stroke = function (...a) {
            log.push({ a: +this.globalAlpha.toFixed(4), s: String(this.strokeStyle), w: +this.lineWidth.toFixed(2) });
            return st.apply(this, a);
          };
          try {
            drawFx();
          } catch (e) {
            log.push({ err: e.message });
          }
          CanvasRenderingContext2D.prototype.stroke = st;
          draw();
          const after = c.getImageData(0, 0, W, H).data;
          /* 變暗的像素（三通道都降、底夠亮）＝黑邊；a≈1−後/前 */
          const dark = [];
          for (let i = 0; i < before.length; i += 4) {
            const d = [0, 1, 2].map(k => before[i + k] - after[i + k]);
            if (d.every(v => v > 0) && before[i] + before[i + 1] + before[i + 2] > 90) dark.push(1 - (after[i] + after[i + 1] + after[i + 2]) / (before[i] + before[i + 1] + before[i + 2]));
          }
          dark.sort((x, y) => x - y);
          res.push({
            ring: nm,
            t,
            strokes: log,
            edgeAlpha: log[0] && log[0].a,
            ringAlpha: log[1] && log[1].a,
            darkPx: dark.length,
            darkMedian: dark.length ? +dark[dark.length >> 1].toFixed(4) : null,
            darkMax: dark.length ? +dark[dark.length - 1].toFixed(4) : null
          });
        }
      G.fx = [];
      return res;
    });
    /* §3 王的預警壓在淺磚：用遊戲本身的 teleCircle()／王閃現的畫法，畫在填滿淺磚色的畫布上（底色是 token，不是地圖截圖） */
    facts.tele = await p.evaluate(() => {
      const cv = document.createElement('canvas');
      cv.width = 400;
      cv.height = 200;
      const c = cv.getContext('2d'),
        main = CX,
        bases = [['規格淺磚 #615b56', '#615b56']].concat(Object.entries(PAL.scene).map(([k, v]) => [`--scene-${k}-light`, v.light]).filter(x => x[1])),
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
        /* 王閃現（render.js 王 pat==='blink'）：線 rgba(PAL.rgb.enemyTel, 0.3+0.6f)，f=1 */
        c.strokeStyle = `rgba(${PAL.rgb.enemyTel || PAL.rgb.elChaos},0.9)`;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(300, 100, 80, 0, Math.PI * 2);
        c.stroke();
        CX = main;
        out.push({
          base: nm,
          bg: px(5, 5),
          teleFill: px(100, 100),
          teleLine: px(180, 100),
          teleOut: px(184, 100),
          blinkLine: px(380, 100),
          blinkOut: px(384, 100),
          png: cv.toDataURL()
        });
      }
      return out;
    });
    for (const t of facts.tele) {
      fs.writeFileSync(`${OUT}/${TAG}-tele-${t.base.replace(/[^\w]+/g, '_')}.png`, Buffer.from(t.png.split(',')[1], 'base64'));
      delete t.png;
    }
    facts.sizes['1280x720'] = { errs };
    await ctx.close();
  }
  /* ======== 兩種尺寸：擠的戰鬥（條、小地圖、預警）、地獄火快爆＋危急、營地、面板 ======== */
  for (const [W, H] of [
    [390, 844],
    [1280, 720]
  ]) {
    const { ctx, p, errs } = await ctxOf(b, W, H),
      tag = `${TAG}-${W}x${H}`,
      F = (facts.sizes[`${W}x${H}`] = facts.sizes[`${W}x${H}`] || {});
    await scene(p);
    F.crowd = await p.evaluate(() => {
      spawnBoss();
      const b = G.mobs[G.mobs.length - 1];
      b.x = P.x + 150;
      b.y = P.y - 120;
      const Ds = Object.values(MOBS).filter(d => !d.boss && d.ai).slice(0, 4);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2,
          m = spawnMob(Ds[i % Ds.length], P.x + Math.cos(a) * 150, P.y + Math.sin(a) * 120, 1, i % 4 === 0);
        if (!m) continue;
        m.x = P.x + Math.cos(a) * 150;
        m.y = P.y + Math.sin(a) * 120;
        if (m.elite) mobDef(m, G.mapT || 1);
      }
      G.fx = [];
      G.tele.push({ x: P.x + 60, y: P.y - 40, r: 70, t: 0.8, dur: 0.8, dmg: 0, src: b, el: 'phys' });
      G.t = 10;
      try {
        hudTick();
      } catch (e) {}
      draw();
      const s = toPx(),
        rect = e => {
          if (!e || !e.offsetWidth) return null;
          const q = e.getBoundingClientRect();
          return [q.left, q.top, q.width, q.height].map(Math.round);
        },
        bars = [...document.querySelectorAll('.hb, .orb')].filter(e => e.offsetWidth).map(e => ({ cls: e.className, id: e.id, r: rect(e), fill: rect(e.querySelector('i')), span: rect(e.querySelector('span')) }));
      /* 小地圖點：攔 drawMinimap 裡的 fillRect，記下畫布座標（含當下 transform）與顏色，再換成畫面座標 */
      const cr = CV.getBoundingClientRect(),
        k = cr.width / CV.width,
        dots = [],
        fr = CanvasRenderingContext2D.prototype.fillRect,
        dm = window.drawMinimap;
      window.drawMinimap = function (...a) {
        CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
          const t = this.getTransform(),
            cx = t.a * (x + w / 2) + t.e,
            cy = t.d * (y + h / 2) + t.f;
          dots.push({ col: String(this.fillStyle), a: +this.globalAlpha.toFixed(3), w: +(w * t.a * k).toFixed(2), at: [Math.round(cr.left + cx * k), Math.round(cr.top + cy * k)] });
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
      return {
        bars,
        tele: G.tele.map(t => s(t.x, t.y).concat([Math.round(t.r * ZOOM * (cr.width / IW))])),
        dots,
        pal: { hf: PAL.hf, hp: PAL.hp, mp: PAL.mp, act: PAL.act, vig: PAL.vig, txStrong: PAL.txStrong, enemyTel: PAL.enemyTel, enemyRim: PAL.enemyRim, badV6: PAL.badV6, panel: PAL.panel, panelInset: PAL.panelInset, hurtVignette: PAL.rgb.hurtVignette, ringEdge: PAL.ringEdge }
      };
    });
    await p.screenshot({ path: `${OUT}/${tag}-crowd.png` });
    /* 地獄火快爆（≥80%）＋危急紅邊（生命 <20%） */
    F.hot = await p.evaluate(() => {
      ST.hellfire = 1;
      ST.hfMax = ST.hfMax || 100;
      P.hf = ST.hfMax * 0.92;
      P.hp = ST.hp * 0.15;
      G.t = 10;
      try {
        hudTick();
      } catch (e) {}
      draw();
      const rect = e => {
        if (!e || !e.offsetWidth) return null;
        const q = e.getBoundingClientRect();
        return [q.left, q.top, q.width, q.height].map(Math.round);
      };
      return [...document.querySelectorAll('.hb, .orb')].filter(e => e.offsetWidth).map(e => ({ cls: e.className, id: e.id, r: rect(e), fill: rect(e.querySelector('i')), span: rect(e.querySelector('span')), fillBg: e.querySelector('i') ? getComputedStyle(e.querySelector('i')).backgroundColor : null, shadow: getComputedStyle(e).boxShadow }));
    });
    await p.waitForTimeout(200);
    await p.evaluate(() => draw());
    await p.screenshot({ path: `${OUT}/${tag}-hellfire-crisis.png` });
    /* 營地：傳送門、地圖台符文 */
    F.camp = await p.evaluate(() => {
      P.hf = 0;
      P.hp = ST.hp;
      try {
        enterCamp();
      } catch (e) {
        return 'ERR ' + e.message;
      }
      closePanels();
      const d = G.props[0];
      G.cam.x = d.x;
      G.cam.y = d.y;
      P.x = d.x + 60;
      P.y = d.y + 80;
      G.t = 10;
      draw();
      const s = toPx(),
        k = CV.getBoundingClientRect().width / IW;
      return { device: s(d.x, d.y - 14).concat([Math.round(34 * ZOOM * k), Math.round(16 * ZOOM * k)]), portal: G.portal ? s(G.portal.x, G.portal.y) : null, props: G.props.map(q => q.k || q.id || '') };
    });
    await p.screenshot({ path: `${OUT}/${tag}-camp.png` });
    /* 面板抽查：說明框（物品）、昇華、天賦樹、停用主鈕、分頁徽章 */
    const panels = [
      ['tip', "closePanels(); fmenuOpen('inv'); const it=mkItem('r_iron',60,2); showTip(itemTip(it,false),{left:40,top:80,right:200,bottom:120,width:160,height:40})"],
      ['asc', "closePanels(); openPanel('asc')"],
      ['tree', 'closePanels(); treeOpen()'],
      ['btn-disabled', "closePanels(); fmenuOpen('inv'); const pn=[...document.querySelectorAll('.panel')].find(e=>e.offsetWidth); const bx=document.createElement('div'); bx.id='__btns'; bx.innerHTML='<button class=\"btn pri\">主鈕</button> <button class=\"btn pri\" disabled>停用主鈕</button> <button class=\"btn\" disabled>停用鈕</button>'; (pn||document.body).prepend(bx)"],
      ['nav', 'closePanels()']
    ];
    F.panels = {};
    for (const [k, js] of panels) {
      F.panels[k] = await p.evaluate(js => {
        try {
          eval(js);
        } catch (e) {
          return 'ERR ' + e.message;
        }
        const b = document.querySelector('#__btns');
        const r = b && b.getBoundingClientRect();
        return { ok: 1, btns: r ? [r.left, r.top, r.width, r.height].map(Math.round) : null, badge: [...document.querySelectorAll('.dot.n.pill')].filter(e => e.offsetWidth).length };
      }, js);
      await p.waitForTimeout(400);
      await p.screenshot({ path: `${OUT}/${tag}-panel-${k}.png` });
      await p.evaluate(() => {
        const b = document.querySelector('#__btns');
        if (b) b.remove();
        try {
          $('tip').hidden = true;
        } catch (e) {}
      });
    }
    F.errs = errs;
    await ctx.close();
  }
  fs.writeFileSync(`${OUT}/${TAG}-facts.json`, JSON.stringify(facts, null, 1));
  console.log(TAG, 'rings', facts.rings.length, 'ringShots', facts.ringShots.length, 'pal', facts.pal.keys.length, 'errs', JSON.stringify(Object.values(facts.sizes).map(s => s.errs)));
  await b.close();
})();
