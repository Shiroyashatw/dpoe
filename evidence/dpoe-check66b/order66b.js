/* dpoe-check66b 獨立量測繪製順序（只量不改遊戲）：
   停住遊戲迴圈、手動呼叫 draw()；每種元素（跳數字、怪物生命條、掉落光柱）各畫「有／沒有」兩張，差異像素的能量 = 該元素畫出來多亮。
   白天：元素在暗層之後 → 能量跟不壓暗時差不多；夜晚：數字、生命條被壓暗（能量比 < 0.3），光柱不被壓暗（比 > 0.6）。
   另外統計 drawBars 一幀內每隻怪畫幾次生命條（攔 fillRect 的 #e5484d／#8ab4ff 條）。
   用法：先開 python3 -m http.server 8000；node order66b.js full|fallback 輸出資料夾 */
const { chromium } = require('playwright');
const MODE = process.argv[2] || 'full',
  OUT = process.argv[3] || '.';
let fail = 0;
const ok = (c, n, v) => {
  if (!c) fail++;
  console.log(`${c ? '✅' : '❌'} ${n} ${JSON.stringify(v)}`);
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  for (const [W, H] of [
    [390, 844],
    [1280, 720]
  ]) {
    const mob = W < 900,
      tag = `${W}x${H}`,
      errs = [];
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
    await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8000/?test=chase&r=' + Date.now());
    await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map', null, { timeout: 30000 });
    await p.evaluate(() => (window.hurtPlayer = () => 0));
    await p.waitForTimeout(4000);
    const facts = await p.evaluate(() => ({
      beam: !!beamSheet('255,154,74'),
      crit: sigFx('sig_crit', 'crit'),
      tile: !!tileSet(G.biome)
    }));
    ok(MODE === 'full' ? facts.beam && facts.crit === 'sig_crit' : !facts.beam && facts.crit === 'crit', `${tag} ${MODE} 模式素材狀態`, facts);
    await p.evaluate(() => {
      window.requestAnimationFrame = () => 0;
      try {
        introStop();
      } catch (e) {}
      closePanels();
      chaseBnHide();
      $('banner').hidden = true;
    });
    await p.waitForTimeout(300);
    const res = await p.evaluate(() => {
      const keep = G.mobs.slice(),
        m = keep.find(x => !x.boss && !x.arrow) || keep[0],
        ck = CHASE_POOL.trunk[0],
        T = { x: P.x + 650, y: P.y + 20 }; /* 夜晚光圈外 */
      G.fx = [];
      G.ground = [];
      G.trauma = 0;
      G.cam.x = T.x;
      G.cam.y = T.y;
      const shot = () => (draw(), CX.getImageData(0, 0, CV.width, CV.height).data);
      const diff = (A, B) => {
        let e = 0,
          n = 0,
          mx = 0;
        for (let i = 0; i < A.length; i += 4) {
          const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
          if (d > 6) (n++, (e += d)), (mx = Math.max(mx, B[i], B[i + 1], B[i + 2]));
        }
        return { n, e, mx };
      };
      const set = el => {
        G.mobs = [m];
        m.x = T.x;
        m.y = T.y;
        m.hp = el === 'bar' ? m.mhp * 0.5 : m.mhp;
        G.nums = el === 'num' ? [{ x: T.x + 40, y: T.y - 40, v: 777, c: 'crit', t: 0.3 }] : [];
        G.drops = el === 'beam' ? [{ chase: ck, t: 1, x: T.x - 80, y: T.y + 30, sx: T.x - 80, sy: T.y + 30, hold: 1e9 }] : [];
      };
      const r = {};
      for (const mode of ['day', 'night']) {
        G.night = mode === 'night' ? G.t + 999 : 0;
        G.fog = 0;
        r[mode] = {};
        for (const el of ['num', 'bar', 'beam']) {
          set('none');
          const A = shot();
          set(el);
          r[mode][el] = diff(A, shot());
        }
      }
      /* 一幀內生命條畫幾次：三隻受傷怪＋一隻菁英，白天／夜晚各數一次 */
      const cnt = {};
      const fr = CX.fillRect;
      for (const mode of ['day', 'night']) {
        G.night = mode === 'night' ? G.t + 999 : 0;
        const ms = keep.filter(x => !x.boss && !x.arrow).slice(0, 3);
        ms.forEach((x, i) => ((x.x = T.x + i * 60), (x.y = T.y + 50), (x.hp = x.mhp * 0.5)));
        G.mobs = ms;
        G.nums = [];
        G.drops = [];
        let n = 0;
        CX.fillRect = function (...a) {
          if (CX.fillStyle === '#e5484d' || CX.fillStyle === '#8ab4ff') n++;
          return fr.apply(this, a);
        };
        draw();
        CX.fillRect = fr;
        cnt[mode] = { mobs: ms.length, bars: n };
      }
      G.night = 0;
      G.mobs = keep;
      return { r, cnt };
    });
    const { r, cnt } = res,
      q = el => +(r.night[el].e / r.day[el].e).toFixed(3);
    ok(r.day.num.mx >= 240 && r.day.bar.mx >= 200, `${tag} ${MODE} 白天數字、生命條沒被壓暗（最亮）`, [r.day.num.mx, r.day.bar.mx]);
    ok(q('num') < 0.3 && q('bar') < 0.3, `${tag} ${MODE} 夜晚數字、生命條被壓暗（夜／日能量比）`, [q('num'), q('bar')]);
    ok(q('beam') > 0.6, `${tag} ${MODE} 夜晚光柱不被壓暗（夜／日能量比）`, q('beam'));
    ok(cnt.day.bars === cnt.day.mobs && cnt.night.bars === cnt.night.mobs, `${tag} ${MODE} 每隻怪生命條一幀只畫一次`, cnt);
    /* 截圖：同一場景（受傷怪、跳數字、光柱）白天／夜晚 */
    for (const mode of ['day', 'night']) {
      await p.evaluate(mode => {
        const T = { x: P.x + 650, y: P.y + 20 },
          ms = G.mobs.filter(x => !x.boss && !x.arrow).slice(0, 3);
        ms.forEach((x, i) => ((x.x = T.x + i * 60 - 30), (x.y = T.y + 40), (x.hp = x.mhp * (0.3 + i * 0.2))));
        G.mobs = ms;
        G.cam.x = T.x;
        G.cam.y = T.y;
        G.nums = [{ x: T.x, y: T.y - 30, v: 777, c: 'crit', t: 0.3 }, { x: T.x + 60, y: T.y, v: 123, c: 'fire', t: 0.3 }];
        G.drops = [
          { chase: CHASE_POOL.trunk[0], t: 1, x: T.x - 120, y: T.y + 30, sx: T.x - 120, sy: T.y + 30, hold: 1e9 },
          { show: Object.keys(CUR)[0], t: 1, x: T.x + 130, y: T.y + 60, sx: T.x + 130, sy: T.y + 60, hold: 1e9 }
        ];
        G.night = mode === 'night' ? G.t + 999 : 0;
        draw();
      }, mode);
      await p.screenshot({ path: `${OUT}/${tag}-${MODE}-${mode}.png` });
    }
    ok(!errs.length, `${tag} ${MODE} 沒有頁面錯誤`, errs.slice(0, 3));
    await ctx.close();
  }
  await b.close();
  console.log(fail ? `❌ ${fail} 項失敗` : '全部通過');
  process.exit(fail ? 1 : 0);
})();
