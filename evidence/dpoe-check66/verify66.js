/* dpoe-check66 獨立驗證：停住遊戲迴圈、手動呼叫 draw()，量跳數字／怪物生命條／掉落光柱在白天與夜晚的像素亮度；
   另驗缺圖退回。用法：node verify66.js [full|fallback] 輸出資料夾 */
const { chromium } = require('/tmp/pw/node_modules/playwright');
const MODE = process.argv[2] || 'full',
  OUT = process.argv[3];
let fail = 0;
const ok = (c, n, v) => {
  if (!c) fail++;
  console.log(`${c ? '✅' : '❌'} ${n} ${JSON.stringify(v)}`);
};
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME });
  for (const [W, H] of [
    [390, 844],
    [1280, 720]
  ]) {
    const mob = W < 900,
      tag = `${W}x${H}`,
      errs = [],
      cons = [];
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
    await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => m.type() === 'error' && cons.push(m.text().slice(0, 120)));
    await p.goto('http://localhost:8000/?test=chase&' + Date.now());
    await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
    await p.evaluate(() => (window.hurtPlayer = () => 0));
    await p.waitForTimeout(3000);
    await p.evaluate(() => ['temple', 'lava', 'tomb', 'ice'].forEach(k => tileSet(k)) || CHASE_POOL.trunk.forEach(k => (artImg(k), artImg(k + '_16'))));
    await p.waitForTimeout(2000);
    const facts = await p.evaluate(() => {
      const out = {};
      out.tiles = ['temple', 'lava', 'tomb', 'ice'].map(k => !!tileSet(k));
      out.chunk = G.bc && G.bc.m.size ? [...G.bc.m.values()][0].width : 0;
      out.wy = CHASE_POOL.trunk.map(k => (a => a && a.im.src.split('/').pop() + '@' + a.r[0])(artImg(k)));
      out.wy16 = CHASE_POOL.trunk.map(k => (a => a && a.im.src.split('/').pop() + '@' + a.r[0])(artImg(k + '_16')));
      out.crit = sigFx('sig_crit', 'crit');
      out.lv = sigFx('sig_lvup', 'old');
      out.chase = sigFx('sig_chase', 'old');
      out.beam = !!beamSheet('255,154,74');
      out.wyap = sigFx('sig_wyapply', 'old');
      /* 暴擊真的推了哪個序列圖 */
      const n0 = G.fx.length;
      fxs('crit', P.x, P.y);
      out.critPushed = G.fx.slice(n0).map(f => f.n);
      return out;
    });
    if (MODE === 'fallback') {
      ok(
        facts.tiles.every(t => !t) && facts.chunk === 384,
        `${tag} 缺圖：四種地形都退回程式畫法（區塊 384）`,
        [facts.tiles, facts.chunk]
      );
      ok(
        facts.wy.every(s => /^ic_cur\.[0-9a-f]+\.png@297$/.test(s)) &&
          facts.wy16.every(s => /^ic_cur\.[0-9a-f]+\.png@297$/.test(s)),
        `${tag} 缺圖：王印 32／16 都借 cur_regal（ic_cur x=297）`,
        [facts.wy, facts.wy16]
      );
      ok(
        facts.crit === 'crit' &&
          facts.critPushed.join() === 'crit' &&
          facts.lv === 'old' &&
          facts.chase === 'old' &&
          !facts.beam &&
          facts.wyap === 'old',
        `${tag} 缺圖：特效全部播舊的（crit、舊升級、程式光柱）`,
        facts
      );
    } else {
      ok(
        facts.tiles.every(t => t) && facts.chunk === 256,
        `${tag} 有圖：四種地形地磚載好、區塊 256`,
        [facts.tiles, facts.chunk]
      );
      ok(
        facts.wy.every((s, i) => s.startsWith('ic_wy32.') && s.endsWith('@' + i * 33)) &&
          facts.wy16.every((s, i) => s.startsWith('ic_wy16.') && s.endsWith('@' + i * 17)),
        `${tag} 有圖：王印 ic_wy32／ic_wy16`,
        [facts.wy, facts.wy16]
      );
      ok(facts.critPushed.join() === 'sig_crit' && facts.beam, `${tag} 有圖：暴擊推 sig_crit、光柱 sig_beam`, facts);
    }
    /* 繪製順序：停住迴圈、手動畫 */
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
      const mobs = G.mobs.slice();
      const tgt = mobs.find(m => !m.boss && !m.arrow) || mobs[0];
      const ckey = CHASE_POOL.trunk[0];
      const visW = CV.width / (DPR * ZOOM);
      /* 目標離主角 700（白天光圈 560、夜晚 260 之外），鏡頭對準目標 */
      const T = { x: P.x + 700, y: P.y + 10 };
      G.fx = [];
      G.trauma = 0;
      G.cam.x = T.x;
      G.cam.y = T.y;
      const snap = () => {
        draw();
        return CX.getImageData(0, 0, CV.width, CV.height).data;
      };
      const meas = (A, B) => {
        let e = 0,
          mx = 0,
          n = 0;
        for (let i = 0; i < A.length; i += 4) {
          const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
          if (d > 6) {
            n++;
            e += d;
            const L = Math.max(B[i], B[i + 1], B[i + 2]);
            if (L > mx) mx = L;
          }
        }
        return { n, e, mx };
      };
      const setup = el => {
        G.mobs = [tgt];
        tgt.x = T.x;
        tgt.y = T.y;
        tgt.hp = el === 'bar' ? tgt.mhp * 0.5 : tgt.mhp;
        G.nums = el === 'num' ? [{ x: T.x, y: T.y - 30, v: 888, c: 'crit', t: 0.3 }] : [];
        G.drops =
          el === 'beam' ? [{ chase: ckey, t: 1, x: T.x - 60, y: T.y + 40, sx: T.x - 60, sy: T.y + 40, hold: 1e9 }] : [];
      };
      const out = {};
      for (const mode of ['day', 'night']) {
        G.night = mode === 'night' ? G.t + 999 : 0;
        G.fog = 0;
        out[mode] = {};
        for (const el of ['num', 'bar', 'beam']) {
          setup('none');
          const A = snap();
          setup(el);
          const B = snap();
          out[mode][el] = meas(A, B);
        }
      }
      G.mobs = mobs;
      return { out, T, P: [P.x, P.y], visW };
    });
    const r = {};
    for (const el of ['num', 'bar', 'beam'])
      r[el] = {
        day: res.out.day[el],
        night: res.out.night[el],
        ratio: +(res.out.night[el].e / Math.max(1, res.out.day[el].e)).toFixed(3),
        mxDay: res.out.day[el].mx,
        mxNight: res.out.night[el].mx
      };
    console.log(tag, MODE, JSON.stringify({ T: res.T, P: res.P, visW: res.visW }));
    for (const el of ['num', 'bar', 'beam'])
      console.log(`  ${el}: 白天 n=${r[el].day.n} 最亮=${r[el].mxDay}；夜晚 n=${r[el].night.n} 最亮=${r[el].mxNight}；夜/日能量比 ${r[el].ratio}`);
    ok(r.num.day.n > 50 && r.num.mxDay >= 200, `${tag} ${MODE} 白天跳數字沒被壓暗（最亮 ≥200）`, r.num.mxDay);
    ok(r.bar.day.n > 20 && r.bar.mxDay >= 200, `${tag} ${MODE} 白天怪物生命條沒被壓暗（最亮 ≥200）`, r.bar.mxDay);
    ok(r.num.ratio < 0.3 && r.num.mxNight < 100, `${tag} ${MODE} 夜晚跳數字被壓暗`, [r.num.ratio, r.num.mxNight]);
    ok(r.bar.ratio < 0.3 && r.bar.mxNight < 100, `${tag} ${MODE} 夜晚怪物生命條被壓暗`, [r.bar.ratio, r.bar.mxNight]);
    ok(
      r.beam.day.n > 50 && r.beam.ratio >= 0.9,
      `${tag} ${MODE} 夜晚光柱不被壓暗（夜/日能量比 ≥0.9；光柱半透明，背後地板夜晚較暗所以最亮值略低）`,
      [r.beam.ratio, r.beam.mxDay, r.beam.mxNight]
    );
    /* 截圖：三種元素都在、目標在遠處 */
    for (const mode of ['day', 'night']) {
      await p.evaluate(mode => {
        const T = { x: P.x + 700, y: P.y + 10 };
        (G.cam.x = T.x), (G.cam.y = T.y), (G.trauma = 0);
        G.night = mode === 'night' ? G.t + 999 : 0;
        const m = G.mobs.find(m => !m.boss && !m.arrow);
        G.mobs = [m];
        m.x = T.x;
        m.y = T.y;
        m.hp = m.mhp * 0.5;
        G.nums = [{ x: T.x, y: T.y - 30, v: 888, c: 'crit', t: 0.3 }];
        G.drops = [
          { chase: CHASE_POOL.trunk[0], t: 1, x: T.x - 60, y: T.y + 40, sx: T.x - 60, sy: T.y + 40, hold: 1e9 }
        ];
        draw();
      }, mode);
      await p.screenshot({ path: `${OUT}/${tag}-${MODE}-${mode}.png` });
    }
    ok(!errs.length, `${tag} ${MODE} 沒有頁面錯誤`, errs);
    console.log(`  console error（${cons.length}）：`, JSON.stringify(cons.slice(0, 6)));
    await ctx.close();
  }
  await b.close();
  console.log(fail ? `❌ ${fail}` : '✅ 全部通過');
  process.exit(fail ? 1 : 0);
})();
