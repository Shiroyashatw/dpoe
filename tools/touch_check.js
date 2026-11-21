const { chromium } = require('playwright');
/* 手機操作測試（docs/企劃書.md 第 9 節「操作模式」）：Playwright 模擬觸控螢幕、送真的觸控事件。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/touch_check.js [寬 390] [高 844] [網址]
   手機一律直式（2026-11-21 取消橫向）：寬 ≤ 高＝觸控直式手機；寬 > 高（1280×720、1440×900）＝桌機（滑鼠，不模擬觸控），只跑桌機那一段
   截圖存在系統暫存資料夾（touch_*.png）；有 ❌ 時結束碼 1 */
const os = require('os'),
  path = require('path');
const W = +process.argv[2] || 390,
  H = +process.argv[3] || 844,
  DESK = W > H,
  URL = process.argv[4] || 'http://localhost:8000/',
  tag = W + 'x' + H,
  shot = n => path.join(os.tmpdir(), `touch_${tag}_${n}.png`);
let fail = 0;
/* 等版面穩定再量（面板滑進來、機器忙時畫格慢）：每次先等 100 毫秒再等兩個畫格，連三次結果一樣（最多約 4 秒）才回傳 */
const settle = async (p, fn, arg) => {
  const L = [];
  for (let i = 0; i < 20 && !(L.length >= 3 && L.slice(-3).every(x => x === L[L.length - 1])); i++) {
    await p.waitForTimeout(100);
    await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    L.push(JSON.stringify(await p.evaluate(fn, arg)));
  }
  return JSON.parse(L[L.length - 1]);
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    hasTouch: !DESK,
    isMobile: !DESK,
    deviceScaleFactor: 2
  });
  await ctx.route(/supabase/, r => r.abort()); /* 假存檔不能同步到正式雲端 */
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?p=7&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    proSkip();
    S.story.tips = 0;
    S.auto = 0; /* 手動的流程在 S.auto = 0 下跑；自動鈕另外測 */
    /* 0.5.0／0.5.1：舊流程（通貨頁、鍛造台、天賦、技能格）要營地開了才看得到；全 0 的藏法另外測 */
    Object.assign(S.camp, { forge: 20, watch: 26, scout: 4, house: 10, altar: 11, store: 5 });
    window._CAMP = JSON.parse(JSON.stringify(S.camp));
    S.skills[1].k = 'mirage'; /* 0.5.0 開局只有斬擊；技能鍵的測試要第 2 格有招 */
    hudBar();
  });
  const cdp = await ctx.newCDPSession(p);
  const touch = async (type, pts) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
  const ok = (n, v, d = '') => {
    if (!v) fail++;
    console.log((v ? '✅ ' : '❌ ') + n + (d ? ' ' + d : ''));
  };
  /* M0-06：還沒有手勢就不建立 AudioContext（不跳主控台警告）；第一次點了才建立（檔案最後再驗） */
  ok('還沒點過：音效還沒建立', await p.evaluate(() => !AC));
  ok('新存檔預設直立', await p.evaluate(() => S.orient === 'p'));
  ok(
    '沒有方向提示（#rot）、橫向右上鈕（.tmenu）',
    await p.evaluate(() => !$('rot') && !document.querySelector('.tmenu'))
  );
  if (DESK) {
    /* 桌機（滑鼠）：桌機 HUD、不是觸控直立；舊存檔的橫向（l）讀進來是 p，桌機照舊；面板不超出畫面 */
    const desk = () =>
      p.evaluate(() => {
        const vis = e => !!e && !e.hidden && e.getClientRects().length > 0,
          r = $('dnav').getBoundingClientRect();
        return [
          document.body.classList.contains('touch'),
          document.body.classList.contains('port'),
          PORT(),
          vis($('dnav')) && r.right <= innerWidth && r.bottom <= innerHeight,
          vis($('pnav')),
          /* battle-hud v1.3.3：技能列是 #bh 的 5 格（舊的 #bar 拿掉了） */
          [...document.querySelectorAll('#bh .bsk')].filter(vis).length === 5,
          ZOOM,
          C
        ].join();
      });
    ok(
      '桌機：不是觸控、不是直立、功能列在畫面內、沒有底部分頁、技能列在、視野 1.35、格 36',
      (await desk()) === 'false,false,false,true,false,true,1.35,36',
      await desk()
    );
    await p.evaluate(() => {
      S.orient = 'l';
      save();
    });
    await p.reload();
    await p.waitForTimeout(1500);
    ok(
      '桌機：舊存檔 orient l 重新整理後是 p、存回 p',
      await p.evaluate(() => S.orient === 'p' && JSON.parse(localStorage.getItem(KEY + SLOT)).orient === 'p')
    );
    ok('桌機：重新整理後版面照舊', (await desk()) === 'false,false,false,true,false,true,1.35,36', await desk());
    await p.evaluate(() => {
      proSkip();
      S.auto = 0;
      Object.assign(S.camp, { forge: 20, watch: 26, scout: 4, house: 10, altar: 11, store: 5 });
    });
    for (const k of ['inv', 'stash', 'skill', 'craft', 'set', 'node', 'asc', 'log'])
      await p
        .evaluate(k => {
          closePanels();
          openPanel(k);
        }, k)
        .then(async () => {
          await p.waitForTimeout(250);
          const r = await p.evaluate(() =>
            [...document.querySelectorAll('.panel')]
              .filter(e => !e.hidden && e.getClientRects().length)
              .map(e => {
                const b = e.getBoundingClientRect();
                return [
                  e.id,
                  b.left >= -0.5 && b.top >= -0.5 && b.right <= innerWidth + 0.5 && b.bottom <= innerHeight + 0.5
                ];
              })
          );
          ok(`桌機：開 ${k} 面板不超出畫面`, r.length > 0 && r.every(x => x[1]), JSON.stringify(r));
        });
    ok(
      '桌機：設定沒有「操作方向」',
      await p.evaluate(() => (closePanels(), openPanel('set'), !/操作方向|橫向/.test($('pset').innerText)))
    );
    await p.evaluate(() => closePanels());
    await p.screenshot({ path: shot('desk') });
    if (errs.length) fail++;
    console.log(errs.length ? '❌ 頁面錯誤 ' + errs.join(' / ') : '✅ 沒有頁面錯誤');
    await b.close();
    process.exit(fail ? 1 : 0);
  }
  ok(
    '進來就是觸控模式、直立操作',
    await p.evaluate(
      () => document.body.classList.contains('touch') && document.body.classList.contains('port') && PORT()
    )
  );
  /* M2-12：營地主角不走動——單指拖＝左右平移鏡頭（不出搖桿、主角不動、不出招）；點場景物件＝開跟分頁同一個面板 */
  await p.evaluate(() => enterCamp());
  await p.waitForTimeout(600);
  {
    const c0 = await p.evaluate(() => ({ x: P.x, y: P.y, cam: G.cam.x })),
      x0 = Math.round(W * 0.6),
      y0 = Math.round(H * 0.55);
    await touch('touchStart', [[x0, y0]]);
    for (let i = 1; i <= 8; i++) {
      await touch('touchMove', [[x0 - i * 18, y0 + i]]);
      await p.waitForTimeout(16);
    }
    await p.waitForTimeout(250);
    const mid = await p.evaluate(() => ({ stick: $('stick').classList.contains('on'), cam: G.cam.x, act: !!P.act }));
    await touch('touchEnd', []);
    await p.waitForTimeout(200);
    const c1 = await p.evaluate(() => ({ x: P.x, y: P.y, mv: P.mv }));
    ok(
      '營地：單指往左拖＝鏡頭往右平移，不出搖桿、主角不動、沒出招',
      !mid.stick && mid.cam > c0.cam + 60 && !mid.act && c1.x === c0.x && c1.y === c0.y,
      JSON.stringify([c0, mid, c1])
    );
    await p.evaluate(() => (G.pan = 0));
    await p.waitForTimeout(700);
    const dv = await p.evaluate(() => {
      const d = G.props.find(q => q.k === 'device');
      return [(d.x - G.cam.x) * ZOOM + IW / 2, (d.y - 25 - G.cam.y) * ZOOM + cvH() / 2];
    });
    await touch('touchStart', [dv]);
    await touch('touchEnd', []);
    await p.waitForTimeout(400);
    ok(
      '營地：點地圖台＝開地點清單（跟分頁同一個面板），主角不動',
      await p.evaluate(c0 => PANEL.node && P.x === c0.x && P.y === c0.y, c0),
      JSON.stringify(dv)
    );
    await p.evaluate(() => closePanels());
  }
  await p.screenshot({ path: shot('hide') });
  await p.evaluate(() => {
    enterMap(1);
  });
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    for (const m of G.mobs) {
      m.aggro = 0;
    }
  });
  const x0 = await p.evaluate(() => P.x),
    sp = [W / 2 - 60, H * 0.45];
  await touch('touchStart', [sp]);
  for (let i = 1; i <= 6; i++) {
    await touch('touchMove', [[sp[0] + i * 12, sp[1]]]);
    await p.waitForTimeout(30);
  }
  await p.waitForTimeout(500);
  await p.screenshot({ path: shot('stick') });
  const x1 = await p.evaluate(() => P.x);
  await touch('touchEnd', []);
  ok('搖桿往右推角色往右走', x1 - x0 > 40, `${Math.round(x1 - x0)}`);
  await p.waitForTimeout(200);
  const mv = await p.evaluate(() => TOUCH.mv.join());
  ok('放開搖桿就停', mv === '0,0', mv);
  /* 普攻按住：放一個怪在旁邊，看會不會打它 */
  await p.evaluate(() => {
    G.mobs.length = 0;
    const m = spawnMob(MOBS[Object.keys(MOBS)[0]], P.x + 90, P.y, 0, null);
    m.hp = m.mhp = 1e6;
    m.aggro = 0;
    m.cd = 99;
    window._m = m;
    window._hp = m.hp;
  });
  /* 直立：畫面上按住不動 */
  const r0 = [W / 2, H * 0.3];
  await touch('touchStart', [r0]);
  /* 要先走到怪旁邊才揮得到：機器忙時遊戲時間比牆鐘慢，固定等 900 毫秒會偶發失敗；改成打中就停、最多 3 秒 */
  await p
    .waitForFunction(() => _m.hp < _hp || !G.mobs.includes(_m), null, { timeout: 3000, polling: 50 })
    .catch(() => {});
  ok('畫面上按住不動＝連續普攻最近的怪', await p.evaluate(() => _m.hp < _hp || !G.mobs.includes(_m)));
  /* 出手中朝向鎖住、下一下才轉：等朝向到位（最多 2 秒、每 50 毫秒看）再判定，不在出手的半途量 */
  const faceOf = () => Math.cos(P.face - Math.atan2(_m.y - P.y, _m.x - P.x));
  await p.waitForFunction(`(${faceOf})() > 0.7`, null, { timeout: 2000, polling: 50 }).catch(() => {});
  const face = await p.evaluate(faceOf);
  ok('朝向怪物', face > 0.7, face.toFixed(2));
  await touch('touchEnd', []);
  /* battle-hud v1.3.3 §11：直立的技能格不是出招鍵——點＝開技能分頁、長按 400 ms＝工具提示（放開收）；出招靠點畫面（普攻）與自動 */
  const c1 = await p.evaluate(() => {
    const r = $('bhS1').getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  await touch('touchStart', [c1]);
  await p.waitForTimeout(520);
  const lt = await p.evaluate(() => [!$('bhTip').hidden, $('bhTip').textContent]);
  await touch('touchEnd', []);
  await p.waitForTimeout(80);
  ok(
    '直立技能格：長按 400 ms 出工具提示、放開收起',
    lt[0] && !!lt[1] && (await p.evaluate(() => $('bhTip').hidden)),
    JSON.stringify(lt)
  );
  await touch('touchStart', [c1]);
  await touch('touchEnd', []);
  await p.waitForTimeout(200);
  ok('直立技能格：點一下＝開技能分頁（不出招）', await p.evaluate(() => navOn() === 'skill' && !(P.cds.s1 > 0)));
  await p.evaluate(() => closePanels());
  await p.waitForTimeout(150);
  /* 翻滾：直立快速一撥 */
  {
    /* 快速一撥＝按下到放開不到 260 毫秒（touch.js）。機器忙時送四個觸控事件就超過 260 毫秒，送出去的不是快速一撥：
       在頁面記下這次手勢實際花多久，太慢就重送（最多 3 次）；撥的判定在下一格才跑，等到翻滾開始（最多 1 秒）再判定 */
    const rolled = () => (!!P.roll && P.roll.dx > 0.7) || P.cds.roll > 0;
    for (let k = 0; k < 3; k++) {
      await p.evaluate(() => {
        P.cds.roll = 0;
        P.act = null;
        P.roll = null;
        window._sw = [];
        const f = e => _sw.push(performance.now());
        addEventListener('pointerdown', f, { once: true });
        addEventListener('pointerup', f, { once: true });
      });
      await touch('touchStart', [[W / 2, H * 0.45]]);
      await touch('touchMove', [[W / 2 + 30, H * 0.45]]);
      await touch('touchMove', [[W / 2 + 80, H * 0.45]]);
      await touch('touchEnd', []);
      await p.waitForFunction(rolled, null, { timeout: 1000, polling: 16 }).catch(() => {});
      if (await p.evaluate(() => _sw.length < 2 || _sw[1] - _sw[0] < 240)) break;
    }
    ok('快速一撥＝翻滾（往撥的方向）', await p.evaluate(rolled));
    /* 點一下＝普攻一次 */
    await p.evaluate(() => {
      P.act = null;
      P.roll = null;
      window._hp = _m.hp;
    });
    await p.waitForTimeout(400);
    await touch('touchStart', [[W / 2, H * 0.3]]);
    await touch('touchEnd', []);
    /* 每格看：出手（P.act）只有一下子、打不中（命中率）時血不會少，只在 500 毫秒後看一次會漏掉 */
    ok(
      '點一下＝普攻',
      await p
        .waitForFunction(() => _m.hp < _hp || !G.mobs.includes(_m) || !!P.act, null, { timeout: 1000 })
        .then(
          () => true,
          () => false
        )
    );
  }
  /* 按鈕都在畫面內、不重疊、夠大 */
  const lay = await p.evaluate(() => {
    const els = [...document.querySelectorAll('#bar .sk')]
      .filter(e => e.offsetParent || getComputedStyle(e).display !== 'none')
      .map(e => [e.dataset.k || e.textContent, e.getBoundingClientRect()]);
    const bad = [];
    for (const [n, r] of els) {
      if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) bad.push(n + ' 出界');
      if (r.width < 44 || r.height < 44) bad.push(n + ' 太小 ' + r.width);
    }
    for (let i = 0; i < els.length; i++)
      for (let j = i + 1; j < els.length; j++) {
        const a = els[i][1],
          c = els[j][1],
          round = x => x.width === x.height && getComputedStyle(document.querySelector('.sk')).borderRadius === '50%';
        const d = Math.hypot(a.x + a.width / 2 - c.x - c.width / 2, a.y + a.height / 2 - c.y - c.height / 2);
        if (
          els[i][0].length < 6 &&
          els[j][0].length < 6 &&
          /^(s\d|roll|flask|use)$/.test(els[i][0]) &&
          /^(s\d|roll|flask|use)$/.test(els[j][0])
            ? d < (a.width + c.width) / 2 + 4
            : a.left < c.right - 2 && c.left < a.right - 2 && a.top < c.bottom - 2 && c.top < a.bottom - 2
        )
          bad.push(els[i][0] + '×' + els[j][0] + ' 重疊');
      }
    return bad;
  });
  ok('按鈕在畫面內、≥44px、不重疊', !lay.length, lay.join(' '));
  /* 自動／手動（0.4.9 搬進設定）：按得到（真的觸控）、切換、亮著的跟著 */
  await p.evaluate(() => (closePanels(), openPanel('set')));
  await p.waitForTimeout(200);
  const ab = await p.evaluate(() => {
    const r = document.querySelector('#pset [data-a="auto:1"]').getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2, r.width, r.height];
  });
  await touch('touchStart', [[ab[0], ab[1]]]);
  await touch('touchEnd', []);
  await p.waitForTimeout(150);
  const ab1 = await p.evaluate(() => [
    S.auto,
    document.querySelector('#pset [data-a="auto:1"]').classList.contains('on')
  ]);
  ok(
    '設定的自動鈕：點一下切成自動（≥44px）',
    ab1[0] === 1 && ab1[1] && ab[2] >= 44 && ab[3] >= 44,
    JSON.stringify([ab1, ab])
  );
  {
    const r = await p.evaluate(() => {
      const r = document.querySelector('#pset [data-a="auto:0"]').getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
    await touch('touchStart', [r]);
    await touch('touchEnd', []);
    await p.waitForTimeout(150);
  }
  ok(
    '再點手動：切回手動',
    await p.evaluate(() => S.auto === 0 && document.querySelector('#pset [data-a="auto:0"]').classList.contains('on'))
  );
  await p.evaluate(() => closePanels());
  await p.screenshot({ path: shot('map') });
  /* 回營地，開裝備與清單倉庫（0.4.0） */
  await p.evaluate(() => {
    enterCamp();
    for (let i = 0; i < 10; i++) invPut(S.inv, dropItem(i < 6 ? 3 : 5));
    /* 最新的一件（清單排第一）是沒有需求的戒指：點了「裝備」一定裝得上 */
    invPut(S.inv, mkItem('r_iron', 1, 1));
    openPanel('inv');
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: shot('stash') });
  const pan = await p.evaluate(() =>
    [...document.querySelectorAll('.panel')]
      .filter(e => !e.hidden)
      .map(e => {
        const r = e.getBoundingClientRect();
        return [e.id, Math.round(r.left), Math.round(r.right), Math.round(r.bottom), e.scrollWidth > e.clientWidth + 1];
      })
  );
  ok(
    '面板在畫面內、沒有左右捲動',
    pan.every(([id, l, r, bt, ox]) => l >= 0 && r <= W && bt <= H && !ox),
    JSON.stringify(pan)
  );
  /* 點道具（0.4.9）：選它，底下出換裝卡與動作列；「詳細」才是說明框 */
  const it = await p.evaluate(() => {
    const e = document.querySelector('#pinv .bag .it');
    const r = e.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  await touch('touchStart', [it]);
  await touch('touchEnd', []);
  await p.waitForTimeout(300);
  ok(
    '點道具：選中、出換裝卡與動作列（換上 ≥44px）',
    await p.evaluate(() => {
      const b = document.querySelector('#pinv [data-a=selmove]');
      return (
        BAG.sel != null && !!document.querySelector('#pinv .cmpc') && !!b && b.getBoundingClientRect().height >= 44
      );
    })
  );
  const seltipPt = await p.evaluate(() => {
    const r = document.querySelector('#pinv [data-a=seltip]').getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  await touch('touchStart', [seltipPt]);
  await touch('touchEnd', []);
  await p.waitForTimeout(250);
  ok(
    '按「詳細」出說明與動作按鈕',
    await p.evaluate(() => !$('tip').hidden && !!document.querySelector('#tip [data-tq=move]'))
  );
  /* 說明框貼在旁邊：不蓋住被點的東西、不出畫面 */
  /* 每一個看得到的東西都試一次（左上、右下、正中間的都要放得下） */
  const tipAll = sel =>
    p.evaluate(sel => {
      const bad = [];
      for (const e of document.querySelectorAll(sel)) {
        const r = e.getBoundingClientRect();
        const it = !e.dataset.n && findItem(e.dataset.src, e.dataset.id, e.dataset.eqk);
        if (
          (!e.dataset.n && !it) ||
          !r.width ||
          r.right < 0 ||
          r.bottom < 0 ||
          r.left > innerWidth ||
          r.top > innerHeight
        )
          continue;
        showTip(
          e.dataset.n
            ? treeTip(e.dataset.n)
            : itemTip(it, true) +
                '<div class="tqa"><button class="btn pri">裝備</button><button class="btn">賣 3 金</button></div>',
          r
        );
        const t = $('tip').getBoundingClientRect();
        if (
          (t.left < r.right - 1 && t.right > r.left + 1 && t.top < r.bottom - 1 && t.bottom > r.top + 1) ||
          t.left < 0 ||
          t.top < 0 ||
          t.right > innerWidth + 0.5 ||
          t.bottom > innerHeight + 0.5
        )
          bad.push(e.dataset.n || e.dataset.id);
      }
      hideTip();
      return bad;
    }, sel);
  const tipOK = pt =>
    p.evaluate(([x, y]) => {
      const t = $('tip').getBoundingClientRect(),
        e = document
          .elementsFromPoint(x, y)
          .map(n => n.closest('.it[data-id], .nd, [data-a=seltip]'))
          .find(Boolean);
      const r = e.getBoundingClientRect(),
        cover = t.left < r.right - 1 && t.right > r.left + 1 && t.top < r.bottom - 1 && t.bottom > r.top + 1,
        out = t.left < 0 || t.top < 0 || t.right > innerWidth || t.bottom > innerHeight;
      return [
        !cover && !out,
        [t, r].map(q => [q.left, q.top, q.right, q.bottom].map(Math.round).join(',')).join(' / ')
      ];
    }, pt);
  {
    const [v, d] = await tipOK(seltipPt);
    ok('「詳細」的說明框不蓋住那顆鈕、不出畫面', v, d);
  }
  await p.screenshot({ path: shot('tip') });
  const n0 = await p.evaluate(() => String(S.inv.items.length));
  const bt = await p.evaluate(() => {
    const r = document.querySelector('#tip [data-tq=move]').getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  await touch('touchStart', [bt]);
  await touch('touchEnd', []);
  await p.waitForTimeout(200);
  const n1 = await p.evaluate(() => String(S.inv.items.length));
  ok('按動作按鈕搬過去', n0 !== n1, n0 + ' → ' + n1);
  {
    const bad = await tipAll('.it[data-id]');
    ok('每件道具的說明框都不蓋住、不出畫面', !bad.length, bad.join(','));
  }
  await p.evaluate(() => hideTip());
  {
    /* 0.5.0 打造（原本在橫向測，2026-11-21 改在直式）：鍛造台的第一頁、按鈕在畫面內、翻牌的三顆鈕在畫面內 */
    const tapL = async q => {
      const c = await p.evaluate(q => {
        const e = document.querySelector(q);
        if (!e) return null;
        e.scrollIntoView({ block: 'nearest' });
        const r = e.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      }, q);
      if (!c) return false;
      await touch('touchStart', [c]);
      await touch('touchEnd', []);
      await p.waitForTimeout(250);
      return true;
    };
    await p.evaluate(() => {
      closePanels();
      S.camp = newCamp();
      S.mat.mats = {};
      matAdd('iron', 1, 16);
      CRAFT.tab = 'make';
      FSEG = 'make';
      fmenuOpen('forge');
    });
    await p.waitForTimeout(200);
    const mkL = await p.evaluate(() => {
      const b = document.querySelector('#pcraft [data-fg=go]'),
        tabs = [...document.querySelectorAll('#pcraft .ftabs button')].map(x => x.textContent),
        pn = $('pcraft').getBoundingClientRect(),
        r = b.getBoundingClientRect();
      return [
        tabs.join(),
        b.disabled,
        Math.round(r.height),
        r.bottom <= innerHeight + 0.5,
        pn.right <= innerWidth + 0.5,
        $('pcraft').scrollWidth <= $('pcraft').clientWidth + 1
      ];
    });
    ok(
      '直式：鍛造台全 0 的鍛造只有「打造」（跟直立同名，M2-38 起營地是另一頁）、沒有鍛造台／淬鍊／災魘、打造鈕 ≥44px 在畫面內、面板不超出畫面、沒有橫向溢出',
      mkL[0] === '打造' && !/鍛造台|淬鍊/.test(mkL[0]) && !mkL[1] && mkL[2] >= 44 && mkL[3] && mkL[4] && mkL[5],
      JSON.stringify(mkL)
    );
    await tapL('#pcraft [data-fg=go]');
    await p.waitForTimeout(500);
    const rvL = await p.evaluate(() => {
      const b = [...document.querySelectorAll('#preveal .acts .btn, #preveal .dlink2')];
      return [
        PANEL.ident,
        b.length,
        b.every(x => x.getBoundingClientRect().bottom <= innerHeight + 0.5 && x.getBoundingClientRect().height >= 44),
        S.inv.items.length
      ];
    });
    ok('直式：翻牌開著、三顆鈕 ≥44px 在畫面內', rvL[0] && rvL[1] === 3 && rvL[2] && rvL[3] >= 1, JSON.stringify(rvL));
    await tapL('#preveal [data-a=rvsalv]');
    ok('直式：分解掉那一件', await p.evaluate(() => /已分解/.test($('preveal').innerText)));
    await p.evaluate(() => {
      S.camp = JSON.parse(JSON.stringify(_CAMP));
      closePanels();
    });
  }
  {
    /* ---------- 直立重排（0.4.4）：上半戰鬥、下半面板、底部分頁 ---------- */
    const tap = async q => {
      const c = await p.evaluate(q => {
        /* 先把分頁列畫成現在的樣子：測試直接改 S.camp 會讓「天賦」分頁出現／消失，
           不先同步的話量到的是舊位置，計時器重畫後點到隔壁的分頁（營地 → 更多） */
        sheetSync();
        const e = typeof q === 'string' ? document.querySelector(q) : null;
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      }, q);
      if (!c) return false;
      await touch('touchStart', [c]);
      await touch('touchEnd', []);
      await p.waitForTimeout(250);
      return true;
    };
    const box = q =>
      p.evaluate(q => {
        const e = document.querySelector(q);
        if (!e || e.hidden || !e.getClientRects().length) return null;
        const r = e.getBoundingClientRect();
        return [r.left, r.top, r.right, r.bottom].map(Math.round);
      }, q);
    await p.evaluate(() => {
      closePanels();
      for (let i = 0; i < 70; i++) invPut(S.inv, dropItem(5));
    });
    await p.waitForTimeout(150);
    const nav = await p.evaluate(() =>
      [...document.querySelectorAll('#pnav button')].map(e => {
        const r = e.getBoundingClientRect();
        return [e.textContent, Math.round(r.width), Math.round(r.height), Math.round(r.bottom)];
      })
    );
    /* battle-hud v1.3.3（mumi 15:14、18:45）：7 格照順序（倉庫獨立）、每格 ≥44px、在畫面內 */
    ok(
      '底部分頁列：7 格（倉庫・角色・鍛造・技能・天賦・營地・更多）、每格 ≥44px、在畫面內',
      nav.length === 7 &&
        nav.map(n => n[0].replace(/\d+$/, '')).join() === '倉庫,角色,鍛造,技能,天賦,營地,更多' &&
        nav.every(n => n[1] >= 44 && n[2] >= 44 && n[3] <= H),
      JSON.stringify(nav)
    );
    ok(
      '右上沒有按鈕（0.4.9：自動進設定；倉庫、選單在分頁列）',
      await p.evaluate(() => !document.querySelector('.tmenu'))
    );
    /* 戰利品併進角色頁（M2-12 §5）：點「角色」再切「倉庫」 */
    await tap('#pnav [data-tm="nav:char"]');
    await tap('#pinv [data-invt="bag"]');
    const cvb = await box('#cv'),
      pb = await box('#pinv'),
      nb = await box('#pnav');
    ok(
      '點「戰利品」：半版面板在戰鬥畫面下面、分頁列上面',
      !!pb && cvb[3] < H * 0.5 && pb[1] >= cvb[3] && pb[3] <= nb[1] + 1,
      JSON.stringify([cvb, pb, nb])
    );
    ok(
      '面板開著時戰鬥畫面還在畫（畫布縮到上半）',
      await p.evaluate(() => CV.clientHeight < innerHeight * 0.5 && CV.height === Math.round(CV.clientHeight * DPR))
    );
    const cell = await p.evaluate(() => {
      const c = document.querySelector('#pinv .bag .it').getBoundingClientRect(),
        chip = document.querySelector('#pinv .bagf .chip').getBoundingClientRect(),
        sell = document.querySelector('#pinv .foot .btn').getBoundingClientRect(),
        pn = $('pinv').getBoundingClientRect();
      return [c.width, c.height, chip.height, sell.height, sell.bottom <= pn.bottom + 1 && sell.top >= pn.top].map(v =>
        typeof v === 'number' ? Math.round(v) : v
      );
    });
    ok(
      '戰利品：格子、篩選鈕、賣出鈕都 ≥44px，賣出鈕黏在面板底部',
      cell[0] >= 44 && cell[1] >= 44 && cell[2] >= 44 && cell[3] >= 44 && cell[4],
      JSON.stringify(cell)
    );
    /* 手指在格子上往上滑＝清單捲動（0.4.3 以前格子擋住捲動） */
    /* 0.4.10：選了一件時換裝卡黏在底部（小手機會蓋住整個清單）：先用卡右上的 × 收起，再挑一格沒被蓋住的 */
    await p.evaluate(() => BAG.sel != null && act('selno'));
    await p.waitForTimeout(300);
    const sw = await p.evaluate(() => {
      const e = [...document.querySelectorAll('#pinv .bag .it')].find(e => {
          const r = e.getBoundingClientRect();
          return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === e;
        }),
        r = e.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
    await touch('touchStart', [sw]);
    for (let i = 1; i <= 8; i++) {
      await touch('touchMove', [[sw[0], sw[1] - i * 14]]);
      await p.waitForTimeout(16);
    }
    await touch('touchEnd', []);
    await p.waitForTimeout(300);
    ok(
      '手指在格子上滑＝清單捲動、不會拖起道具',
      await p.evaluate(() => $('pinv').scrollTop > 20 && !document.querySelector('.ghost') && !DR),
      String(await p.evaluate(() => $('pinv').scrollTop))
    );
    await p.evaluate(() => ($('pinv').scrollTop = 0));
    /* 點道具 → 詳細 →「做裝」→ 放進通貨頁中間 */
    await tap('#pinv .bag .it:not(:has(.bk))');
    await tap('#pinv [data-a=seltip]');
    const tqs = await p.evaluate(() =>
      [...document.querySelectorAll('#tip .tqa button')].map(e => {
        const r = e.getBoundingClientRect();
        return [e.dataset.tq, Math.round(r.height), r.left >= 0 && r.right <= innerWidth];
      })
    );
    ok(
      '說明框有「做裝」、每顆動作鈕 ≥44px 不出畫面',
      tqs.some(t => t[0] === 'craft') && tqs.every(t => t[1] >= 44 && t[2]),
      JSON.stringify(tqs)
    );
    await tap('#tip [data-tq=craft]');
    ok(
      '按「做裝」：開鍛造 › 通貨、裝備放在中間',
      await p.evaluate(() => !!S.curIt && !$('pstash').hidden && $('pinv').hidden && navOn() === 'forge')
    );
    /* 換一件：挑裝備只看倉庫清單，點一下直接放上去 */
    const cur0 = await p.evaluate(() => S.curIt.id);
    await p.evaluate(() => act('pick'));
    await p.waitForTimeout(150);
    ok(
      '挑裝備：只看倉庫清單',
      await p.evaluate(() => !$('pinv').hidden && $('pstash').hidden && /選一件裝備/.test($('pinv').textContent))
    );
    await tap('#pinv .bag .it');
    ok(
      '點一件直接放上去、回到做裝（不用先開說明框）',
      await p.evaluate(c => !!S.curIt && S.curIt.id !== c && !$('pstash').hidden && $('tip').hidden && !NAV.pick, cur0)
    );
    /* 通貨頁（0.4.5）：每顆通貨有名字與說明、不能用的寫原因、裝備的詞黏在上面、剛加的那條亮起來 */
    const full0 = await box('#pstash');
    ok('做裝打開就蓋滿（看得到詞與通貨）', !!full0 && full0[1] < 60, JSON.stringify(full0));
    await p.evaluate(() => {
      for (const k of [
        'tran',
        'tran2',
        'tran3',
        'aug',
        'rich',
        'exalt',
        'conv',
        'fore',
        'holy',
        'corr',
        'plate',
        'whet'
      ])
        S.mat[k] = 5;
      invPut(S.inv, S.curIt);
      S.curIt = mkItem(pickBase(40, 'chest').id, 40, 0);
      changed();
    });
    await p.waitForTimeout(150);
    const cu = await p.evaluate(() => {
      const rows = [...document.querySelectorAll('#pstash .culist .curow')],
        t3 = [...document.querySelectorAll('#pstash .cut3 button')];
      return {
        named: rows.every(
          r => r.querySelector('.ct b').textContent.length >= 3 && r.querySelector('.ct small').textContent
        ),
        h: Math.min(
          ...rows.map(r => r.getBoundingClientRect().height),
          ...t3.map(b => b.getBoundingClientRect().height)
        ),
        n: rows.length,
        tier: t3.map(b => b.textContent),
        no: [...document.querySelectorAll('#pstash .curow.no')].map(r => r.querySelector('.ct').textContent),
        ring: !!document.querySelector('#pstash .cupg')
      };
    });
    ok(
      '通貨一列一顆：有名字與說明、每列與三階按鈕 ≥44px、沒有只剩圖示的那一圈',
      cu.named && cu.h >= 44 && cu.n >= 9 && !cu.ring,
      JSON.stringify([cu.named, cu.h, cu.n, cu.ring])
    );
    ok(
      '白裝：蛻變石展開三階（寫會出哪幾階）、增幅富豪崇高寫不能用的原因',
      cu.tier.length === 3 && cu.tier.every(t => /T\d/.test(t)) && cu.no.filter(t => /只有/.test(t)).length === 3,
      JSON.stringify([cu.tier, cu.no])
    );
    await tap('#pstash [data-cu="u:tran"]');
    ok(
      '點蛻變石：直接用掉，剛加的那條詞亮起來',
      await p.evaluate(
        () =>
          S.curIt.r === 1 &&
          S.curIt.a.length === 1 &&
          S.mat.tran === 4 &&
          document.querySelectorAll('#pstash .cutop .fslot li.new').length === 1
      )
    );
    await p.evaluate(() => ($('pstash').scrollTop = 600));
    await p.waitForTimeout(150);
    const st = await p.evaluate(() => {
      const t = document.querySelector('#pstash .cutop .fslot').getBoundingClientRect(),
        pn = $('pstash').getBoundingClientRect();
      return [
        Math.round(t.top),
        Math.round(t.bottom),
        Math.round(pn.top),
        Math.round(pn.bottom),
        $('pstash').scrollTop
      ];
    });
    ok('清單往下捲，裝備的詞還黏在上面', st[4] > 100 && st[0] >= st[2] && st[1] < st[3] - 100, st.join());
    await p.evaluate(() => ($('pstash').scrollTop = 0));
    /* 把手：蓋滿 ↔ 半版 */
    await tap('#phand');
    const half = await box('#pstash');
    ok('點把手：縮回半版', !!half && half[1] > H * 0.3, JSON.stringify(half));
    await tap('#phand');
    const full = await box('#pstash');
    ok('再點把手：面板放大到蓋滿', !!full && full[1] < 60, JSON.stringify(full));
    await tap('#phand');
    /* 點亮著的分頁＝收起來 */
    await tap('#pnav [data-tm="nav:forge"]');
    ok(
      '點亮著的分頁＝收起來、畫布回到整個戰場（M2-12：扣掉安全區、分頁與刷圖中的掛機條）',
      await p.evaluate(
        () =>
          !anyPanel() &&
          CV.clientHeight === innerHeight - SAFE.t - SAFE.b - portFix() &&
          !document.body.classList.contains('sheet')
      )
    );
    /* ---------- 0.5.0 打造：鍛造台 Lv0 的鍛造只有「打造」（M2-38 起碎片頁拆掉）、材料夠按一下打一件、翻牌出換裝卡與三顆鈕、換上／分解、升級鈕 ---------- */
    await p.evaluate(() => {
      closePanels();
      S.camp = newCamp();
      S.mat.soul = 0;
      S.mat.mats = {};
      matAdd('iron', 1, 16);
      CRAFT.tab = 'make';
      FSEG = 'make';
      window._n0 = S.inv.items.length;
    });
    await tap('#pnav [data-tm="nav:forge"]');
    const seg0 = await p.evaluate(() =>
      [...document.querySelectorAll('#pcraft .ftabs button')].map(b => b.textContent)
    );
    ok(
      '鍛造台全 0：鍛造只有「打造」（通貨、鍛造台藏起來）',
      seg0.join() === '打造' && (await p.evaluate(() => CRAFT.tab === 'make' && !$('pcraft').hidden)),
      seg0.join()
    );
    const mk = await p.evaluate(() => {
      const b = document.querySelector('#pcraft [data-fg=go]'),
        r = b.getBoundingClientRect(),
        k = document.querySelector('#pcraft .shopb');
      return [
        b.textContent,
        b.disabled,
        Math.round(r.height),
        r.bottom <= innerHeight,
        Math.round(k.getBoundingClientRect().height)
      ];
    });
    ok(
      '打造鈕寫「打造 1 件・生鐵 ×8」、≥44px、在畫面內、部位鈕 ≥44px',
      /打造 1 件/.test(mk[0]) && !mk[1] && mk[2] >= 44 && mk[3] && mk[4] >= 44,
      JSON.stringify(mk)
    );
    await tap('#pcraft [data-fg=go]');
    await p.waitForTimeout(500);
    const rv = await p.evaluate(() => {
      /* BASE-04：分解是主行動下一行的文字鏈（.dlink2） */
      const b = [...document.querySelectorAll('#preveal .acts .btn, #preveal .dlink2')];
      return [
        PANEL.ident,
        REV.craft,
        REV.sel != null,
        !!document.querySelector('#preveal .cmpc'),
        b.map(x => x.textContent.slice(0, 2)).join(),
        b.every(x => x.getBoundingClientRect().height >= 44 && x.getBoundingClientRect().bottom <= innerHeight),
        matN('iron', 1),
        S.inv.items.length - _n0
      ];
    });
    ok(
      '按打造：扣 8 個鐵、翻牌、選中那一件、換裝卡與換上／留著／分解 ≥44px 在畫面內',
      rv[0] &&
        rv[1] &&
        rv[2] &&
        rv[3] &&
        rv[4] === '換上,留著,分解' &&
        rv[5] &&
        rv[6] >= 8 &&
        rv[6] <= 10 &&
        rv[7] === 1,
      JSON.stringify(rv)
    );
    const eq0 = await p.evaluate(() => itemName(S.eq.weapon));
    await tap('#preveal [data-a=rvwear]');
    await p.waitForTimeout(200);
    ok(
      '換上：新的進武器欄、舊的進倉庫',
      await p.evaluate(
        e0 => !!S.eq.weapon && S.inv.items.length === _n0 + 1 && itemName(S.inv.items[S.inv.items.length - 1]) === e0,
        eq0
      )
    );
    await p.evaluate(() => closePanels());
    await tap('#pnav [data-tm="nav:forge"]');
    await tap('#pcraft [data-fg=go]');
    await p.waitForTimeout(500);
    const s0 = await p.evaluate(() => S.mat.soul);
    await tap('#preveal [data-a=rvsalv]');
    await p.waitForTimeout(200);
    ok(
      '分解：回鐵與靈魂、那一件消失、翻牌寫「已分解」',
      await p.evaluate(
        s0 =>
          S.inv.items.length === _n0 + 1 &&
          matN('iron', 1) > 0 &&
          S.mat.soul > s0 &&
          /已分解/.test($('preveal').innerText),
        s0
      )
    );
    await p.evaluate(() => {
      closePanels();
      S.mat.soul = 150;
      matAdd('wood', 0, 40 - matN('wood'));
      CRAFT.tab = 'camp';
    });
    await tap('#pnav [data-tm="nav:craft"]');
    const up = await p.evaluate(() => {
      const b = document.querySelector('#cc-forge [data-fg="camp:forge"]');
      return [b.textContent, b.disabled, b.classList.contains('pri'), Math.round(b.getBoundingClientRect().height)];
    });
    ok(
      '靈魂夠：升級鈕亮起、寫升級到 Lv 1、≥44px',
      /升級到 Lv 1/.test(up[0]) && !up[1] && up[2] && up[3] >= 44,
      JSON.stringify(up)
    );
    await tap('#pcraft [data-fg="camp:forge"]');
    await p.waitForTimeout(200);
    await tap('#pnav [data-tm="nav:forge"]');
    const seg1 = await p.evaluate(() =>
      [...document.querySelectorAll('#pcraft .ftabs button')].map(b => b.textContent)
    );
    ok(
      '升到 Lv1：靈魂扣 150、鍛造的通貨與鍛造台段出現',
      (await p.evaluate(() => S.camp.forge === 1 && S.mat.soul === 0)) && seg1.join() === '打造,通貨,鍛造台',
      seg1.join()
    );
    /* ---------- 0.5.3 破裂石、完美石：鍛造台「填」選石頭 → 按鈕在畫面內、≥44px → 用下去 ---------- */
    await p.evaluate(() => {
      closePanels();
      S.camp = JSON.parse(JSON.stringify(_CAMP));
      const it = mkItem('c_leather', 16, 2);
      while (it.a.length < 6) it.a.push(fillAff(it));
      invPut(S.inv, it);
      S.mat.frac = 1;
      S.mat.perf = 1;
      CRAFT.tab = 'forge';
      CRAFT.sel = { src: 'inv', id: it.id };
      CRAFT.op = 'frac';
      FSEG = 'forge';
      window._st = it;
    });
    await tap('#pnav [data-tm="nav:forge"]');
    const stB = async () =>
      p.evaluate(() => {
        const b = document.querySelector('#pcraft [data-fg="op"]'),
          r = b && b.getBoundingClientRect();
        return b ? [b.textContent.slice(0, 3), !b.disabled, Math.round(r.height), r.bottom <= innerHeight + 0.5] : null;
      });
    const s1 = await stB();
    await tap('#pcraft [data-fg="op"]');
    await p.evaluate(() => ((CRAFT.op = 'perf'), changed()));
    await p.waitForTimeout(150);
    const s2 = await stB();
    await tap('#pcraft [data-fg="op"]');
    const s3 = await p.evaluate(() => [!!_st.frac, !!_st.perfed, _st.a.filter(a => a.T === 0).length]);
    ok(
      '破裂石、完美石（0.5.3）：「填」裡選得到、按鈕 ≥44px 在畫面內，用下去一件有一個 ★ 一個完美 T0',
      s1 &&
        s1[0] === '破裂石' &&
        s1[1] &&
        s1[2] >= 44 &&
        s1[3] &&
        s2 &&
        s2[0] === '完美石' &&
        s2[1] &&
        s3.join() === 'true,true,2',
      JSON.stringify([s1, s2, s3])
    );
    await p.evaluate(() => closePanels());
    /* ---------- 0.5.1 營地總覽：卡片、升級鈕、×1／×10／最大、下一件事、民房的「優先」 ---------- */
    await p.evaluate(() => {
      closePanels();
      S.camp = newCamp();
      S.mat.mats = { wood: 400, 'iron:1': 400 };
      S.mat.soul = 0;
      CRAFT.tab = 'camp';
      CAMPUI.mul = 1;
    });
    await tap('#pnav [data-tm="nav:craft"]');
    const cm = await p.evaluate(() => {
      const cs = [...document.querySelectorAll('#pcraft .cc')],
        bs = [...document.querySelectorAll('#pcraft .cc .btn, #pcraft .cmmul .chip, #pcraft .cmnext .btn')];
      return [
        cs.length,
        cs.every(c => c.getBoundingClientRect().left >= 0 && c.getBoundingClientRect().right <= innerWidth),
        bs.every(b => b.getBoundingClientRect().height >= 44),
        !!document.querySelector('#pcraft #cmtop') && !!document.querySelector('#pcraft #cmnext'),
        document.querySelector('#pnav [data-tm="nav:craft"] .dot')
          ? document.querySelector('#pnav [data-tm="nav:craft"] .dot').textContent
          : ''
      ];
    });
    ok(
      '營地總覽（0.5.1）：開局 8 張卡（解鎖表六座＋林場、礦場）都在畫面寬度內、升級鈕與 ×1／×10／最大 ≥44px、上面兩行（庫存＋速率、下一件事）、分頁列徽章寫買得起幾件（M2-38 只寫數字）',
      cm[0] === 8 && cm[1] && cm[2] && cm[3] && /^\d+$/.test(cm[4]) && parseInt(cm[4]) >= 2,
      JSON.stringify(cm)
    );
    /* 0.5.4（工項 12-C）：資源條在跑（同一條隔 1.5 秒寬度變了、數字有字）、卡片固定順序（產生器在前、解鎖表照 CAMP_B，升級後不重排）、上面兩行黏住 */
    const ord0 = await p.evaluate(() => [...document.querySelectorAll('#pcraft .cc')].map(c => c.id).join());
    const rb0 = await p.evaluate(
      () => getComputedStyle(document.querySelector('#cmtop [data-rb="wood"] .rt i')).transform
    );
    await p.waitForTimeout(1500);
    const rb1 = await p.evaluate(() => [
      getComputedStyle(document.querySelector('#cmtop [data-rb="wood"] .rt i')).transform,
      document.querySelector('#cmtop [data-rb="wood"] b').textContent,
      getComputedStyle(document.querySelector('#pcraft .cmhead')).position,
      [...document.querySelectorAll('#pcraft .rtg')].length
    ]);
    ok(
      '營地總覽（0.5.4）：資源條在跑（木的條 1.5 秒內變了）、庫存有數字、產生器卡各有一條、上面兩行黏住、卡片固定順序（林場、礦場、鍛造台…倉房）',
      rb0 !== rb1[0] &&
        /\d/.test(rb1[1]) &&
        rb1[2] === 'sticky' &&
        rb1[3] === 2 &&
        ord0 === 'cc-wood,cc-iron,cc-forge,cc-watch,cc-scout,cc-house,cc-altar,cc-store',
      JSON.stringify([rb0, ...rb1, ord0])
    );
    await p.evaluate(() =>
      document.querySelector('#pcraft [data-fg="gen:wood:1"]').scrollIntoView({ block: 'center' })
    );
    await tap('#pcraft [data-fg="gen:wood:1"]');
    await tap('#pcraft [data-fg="mul:max"]');
    await p.evaluate(() =>
      document.querySelector('#pcraft [data-fg^="gen:iron:"]').scrollIntoView({ block: 'center' })
    );
    await tap('#pcraft [data-fg^="gen:iron:"]');
    const g2 = await p.evaluate(() => [
      S.camp.gen.wood.lv,
      S.camp.gen.iron.lv,
      matN('wood') < 400,
      [...document.querySelectorAll('#pcraft .cc')].map(c => c.id).join()
    ]);
    ok(
      '產生器：×1 升 1 級、最大一次升好幾級、扣木；升完卡片順序不變',
      g2[0] === 2 && g2[1] > 2 && g2[2] && g2[3] === ord0,
      JSON.stringify(g2)
    );
    await p.evaluate(() => {
      S.camp.house = 1;
      document.querySelector('#pcraft [data-fg="cc:house"]').scrollIntoView({ block: 'center' });
    });
    await tap('#pcraft [data-fg="cc:house"]');
    const ho = await p.evaluate(() => {
      const c = [...document.querySelectorAll('#cc-house .ccopen .chip')];
      return [c.length, c.every(b => b.getBoundingClientRect().height >= 44)];
    });
    ok('民房展開：每座產生器一列、「優先」≥44px', ho[0] === 2 && ho[1], JSON.stringify(ho));
    /* battle-hud v1.3.3 取代 M2-12 §2 的掛機條：刷圖中分頁上面是下方面板（P41，204 高；本次掛機、拾取、比較、整理倉庫／自動／去營地），
       ▼（熱區 44）收到最小＝44 高收起列（掛機時間、▲ 熱區 44）；沒有營地升級鈕、不寫輪；營地升級從分頁「營地」開抽屜（刷圖不停） */
    {
      const ic = await p.evaluate(async () => {
        closePanels();
        S.auto = 1;
        S.hmin = 0;
        if (G.scene !== 'map') runNode(TRUNK_K[0]);
        matAdd('wood', 0, 500);
        await new Promise(r => setTimeout(r, 900));
        idleBar(1);
        const el = $('pidle'),
          r = el.getBoundingClientRect(),
          x = el.querySelector('.ihd').getBoundingClientRect(),
          nv = $('pnav').getBoundingClientRect();
        return [
          idleOn(),
          Math.round(r.height),
          Math.round(r.bottom) === Math.round(nv.top) && r.top >= 0,
          el.querySelector('.is1').textContent,
          !el.querySelector('[data-fg^="camp:"], [data-fg^="gen:"]'),
          x.width >= 44 && x.height >= 44
        ];
      });
      ok(
        '下方面板（battle-hud P41）：刷圖中在分頁上面、204 高、寫「本次掛機 N 分」、不寫輪、▼ 熱區 ≥44、沒有升級鈕',
        ic[0] && ic[1] === 204 && ic[2] && /^本次掛機 \d+ 分/.test(ic[3]) && !/輪/.test(ic[3]) && ic[4] && ic[5],
        JSON.stringify(ic)
      );
      await tap('#pidle .ihd');
      await p.waitForTimeout(400);
      const mn = await p.evaluate(() => {
        const el = $('pidle'),
          r = el.getBoundingClientRect(),
          x = el.querySelector('.ix').getBoundingClientRect(),
          nv = $('pnav').getBoundingClientRect();
        return [
          bhMin(),
          Math.round(r.height),
          Math.round(r.bottom) === Math.round(nv.top),
          el.querySelector('.i32').textContent,
          x.width >= 44 && x.height >= 44
        ];
      });
      ok(
        '收起列（battle-hud T30）：點 ▼ 收到最小、44 高、在分頁上面、寫「掛機 N 分」、▲ ≥44',
        mn[0] && mn[1] === 44 && mn[2] && /^掛機 \d+ 分|倉庫快滿|離開/.test(mn[3]) && mn[4],
        JSON.stringify(mn)
      );
      await tap('#pidle .ix');
      await p.waitForTimeout(400);
      ok(
        '收起列：點 ▲ 展開回一般',
        await p.evaluate(() => !bhMin() && $('pidle').getBoundingClientRect().height === 204)
      );
      await tap('#pnav [data-tm="nav:craft"]');
      const dr = await p.evaluate(() => {
        const st = [...document.querySelectorAll('#pcamp .stamp')];
        return [
          !!PANEL.camp,
          !PANEL.craft,
          document.querySelectorAll('#pcamp .cdc').length,
          st.length > 0 &&
            st.every(b => b.getBoundingClientRect().height >= 44 && b.getBoundingClientRect().width >= 44),
          document.querySelectorAll('#pcamp .stamp.sug').length
        ];
      });
      ok(
        '刷圖中點「營地」：開營地升級抽屜（不是營地總覽），6 設施＋已出現的產生器、印章 ≥44、只有 1 顆實心（建議）',
        dr[0] && dr[1] && dr[2] >= 8 && dr[3] && dr[4] === 1,
        JSON.stringify(dr)
      );
      /* battle-hud v1.3.3 拿掉「王 n%」首領進度（元件表沒有）：面板開著（半版）頂列（通貨、地點）照樣看得到、在面板上緣之上 */
      const pg = await p.evaluate(() => {
        const r = $('bhTop').getBoundingClientRect(),
          top = $('pcamp').getBoundingClientRect().top;
        return [
          G.scene,
          getComputedStyle($('bhTop')).display,
          Math.round(r.top),
          Math.round(r.bottom),
          Math.round(top)
        ];
      });
      ok(
        'battle-hud：直立開半版面板時頂列不藏、在面板上面',
        pg[0] === 'map' && pg[1] !== 'none' && pg[3] > pg[2] && pg[3] <= pg[4],
        JSON.stringify(pg)
      );
      /* M2-08：收起列換版面（離開幾分鐘那一行換掉左字）400 毫秒內的點擊不算，過了就照常（點了展開） */
      await p.evaluate(() => {
        closePanels();
        S.hmin = 1;
        bhLayout(1);
        IDLE.msg = '離開 4 分・靈魂 +12';
        IDLE.msgT = Date.now() + 6000;
        HV.idle = null;
        idleBar(1);
      });
      await tap('#pidle .ihit');
      const g0 = await p.evaluate(() => !bhMin());
      await p.waitForTimeout(400);
      await tap('#pidle .ihit');
      await p.waitForTimeout(400);
      const g1 = await p.evaluate(() => !bhMin());
      ok('M2-08：收起列剛換版面時點了不算，等一下再點才展開', !g0 && g1, JSON.stringify([g0, g1]));
    }
    await p.evaluate(() => {
      S.camp = JSON.parse(JSON.stringify(_CAMP));
      closePanels();
    });
    /* ---------- 0.4.6：角色數值分組、角色頁點一格列出可以換的、說明框先寫換上去的差別、篩選可以選部位 ---------- */
    const tapIn = async q => {
      await p.evaluate(q => {
        const e = document.querySelector(q);
        if (e) e.scrollIntoView({ block: 'center', inline: 'center' });
      }, q);
      await p.waitForTimeout(80);
      return tap(q);
    };
    await p.evaluate(() => {
      closePanels();
      const B = BASES.filter(b => b.k === 'boots').sort((a, b) => a.lv - b.lv)[0];
      for (let i = 0; i < 12; i++) invPut(S.inv, mkItem(B.id, 1, 2));
      if (S.eq.boots) invPut(S.inv, S.eq.boots), (S.eq.boots = null);
      changed();
      navGo('char');
      NAV.full = 1;
      hudPanels();
    });
    await p.waitForTimeout(200);
    const stt = await p.evaluate(() => {
      const secs = [...document.querySelectorAll('#pinv .st2 section')];
      return [
        secs.map(x => x.querySelector('h4').firstChild.textContent).join(),
        [...document.querySelectorAll('#pinv .stg > div')].every(
          d => d.querySelector('span').textContent && d.querySelector('b').textContent
        ),
        !document.querySelector('#pinv .st')
      ];
    });
    ok(
      '角色數值分三組（抗性在穿著旁邊）、每一項有名稱與數字',
      stt[0] === '攻擊,防禦,能力值' && stt[1] && stt[2],
      JSON.stringify(stt)
    );
    await tapIn('#pinv .doll2 [data-eq="boots"]');
    const sp = await p.evaluate(() => {
      const el = document.querySelector('#pinv .slotp'),
        its = el ? [...el.querySelectorAll('.bag .it')] : [];
      return [
        !!el && el.querySelector('.ph2').textContent,
        its.length,
        its.every(e => baseOf(findItem('inv', e.dataset.id)).k === 'boots'),
        document.querySelector('#pinv .doll2 [data-eq="boots"]').classList.contains('sel'),
        its.length ? Math.round(its[0].getBoundingClientRect().width) : 0
      ];
    });
    ok(
      '角色頁點空的鞋子欄：底下列出倉庫裡的鞋子（只有鞋子、格子 ≥44px）',
      /^鞋子/.test(sp[0]) && sp[1] >= 12 && sp[2] && sp[3] && sp[4] >= 44,
      JSON.stringify(sp)
    );
    const cid = await p.evaluate(() => +document.querySelector('#pinv .slotp .bag .it:not(.nq)').dataset.id);
    await tapIn('#pinv .slotp .bag .it:not(.nq)');
    const tp = await p.evaluate(() => {
      const t = $('tip'),
        c = t.querySelector('.cmp2'),
        sl = t.querySelector('.tslots');
      return [
        !t.hidden,
        !!c && !!sl && !!(c.compareDocumentPosition(sl) & Node.DOCUMENT_POSITION_FOLLOWING),
        c ? c.querySelector('span').textContent : '',
        /物品等級|還沒有符文|賣價/.test(t.textContent),
        t.getBoundingClientRect().right <= innerWidth && t.getBoundingClientRect().left >= 0
      ];
    });
    ok(
      '說明框：換上去的差別在最上面（詞的前面）、沒有物品等級與賣價那幾行、不出畫面',
      tp[0] && tp[1] && /鞋子現在空著/.test(tp[2]) && !tp[3] && tp[4],
      JSON.stringify(tp)
    );
    await tap('#tip [data-tq=move]');
    ok('按裝備：換進選的那一格', await p.evaluate(id => !!S.eq.boots && S.eq.boots.id === id, cid));
    await tapIn('#pinv .slotp .bag .it:not(.nq)');
    const tp2 = await p.evaluate(() => {
      const c = $('tip').querySelector('.cmp2');
      return c ? c.querySelector('span').textContent : '';
    });
    ok('那一格有東西：寫「換掉」哪一件', /^換掉 /.test(tp2), tp2);
    await p.evaluate(() => hideTip());
    await tapIn('#pinv .doll2 [data-eq="chest"]');
    await p.evaluate(() => hideTip());
    ok(
      '點胸甲欄：列的是胸甲（不是護符）',
      await p.evaluate(() => /^胸甲/.test(document.querySelector('#pinv .slotp .ph2').textContent)),
      await p.evaluate(() => document.querySelector('#pinv .slotp .ph2').textContent)
    );
    await p.evaluate(() => navGo('bag'));
    await p.waitForTimeout(200);
    await tapIn('#pinv [data-a="bagf:armor"]');
    const parts = await p.evaluate(() =>
      [...document.querySelectorAll('#pinv .bagf.sub [data-a^="bagk:"]')].map(e => e.textContent)
    );
    ok('戰利品選防具：第二列出現部位（寫幾件）', parts.length >= 2 && parts.every(t => /\d/.test(t)), parts.join());
    await tapIn('#pinv [data-a="bagk:boots"]');
    ok(
      '選鞋子：清單只剩鞋子、選到的那顆看得到',
      await p.evaluate(() => {
        const its = [...document.querySelectorAll('#pinv .bag .it')],
          c = document.querySelector('#pinv [data-a="bagk:boots"]').getBoundingClientRect();
        return (
          BAG.k === 'boots' &&
          its.length > 0 &&
          its.every(e => baseOf(findItem('inv', e.dataset.id)).k === 'boots') &&
          c.left >= 0 &&
          c.right <= innerWidth
        );
      })
    );
    await p.evaluate(() => {
      Object.assign(BAG, { f: 'all', k: '' });
      closePanels();
    });
    /* 更多、地點 */
    await tap('#pnav [data-tm="nav:more"]');
    const mr = await p.evaluate(() =>
      [...document.querySelectorAll('#pmore .mrow')].map(e => Math.round(e.getBoundingClientRect().height))
    );
    ok('更多：每一格 ≥44px', mr.length >= 7 && mr.every(h => h >= 44), mr.join());
    await tap('#pmore [data-tm="nav:node"]');
    ok(
      '地點（0.5.2 唯一入口）：開了的節點一列一個、照區域分組、上面一排星級（≥44px）',
      await p.evaluate(
        () =>
          !$('pnode').hidden &&
          document.querySelectorAll('#pnode .ndr').length >= TRUNK.length &&
          document.querySelectorAll('#pnode .ndg').length >= 2 &&
          [...document.querySelectorAll('#pnode .ndst .chip')].every(b => b.getBoundingClientRect().height >= 44)
      )
    );
    const nr = await p.evaluate(() =>
      [...document.querySelectorAll('#pnode .ndr')].slice(0, 6).map(e => Math.round(e.getBoundingClientRect().height))
    );
    ok(
      '地點：每一列 ≥44px',
      nr.every(h => h >= 44),
      nr.join()
    );
    /* 自動模式：收起藥水、技能鍵、翻滾鍵；面板開著時死亡卡不蓋上來 */
    await p.evaluate(() => {
      closePanels();
      S.auto = 1;
      enterMap(1);
    });
    await p.waitForTimeout(500);
    ok(
      '自動模式：技能列收起來、血條還在',
      await p.evaluate(
        () =>
          document.body.classList.contains('ai') &&
          getComputedStyle($('bar')).display === 'none' &&
          $('bhp').getClientRects().length > 0
      )
    );
    /* battle-hud v1.3.3 P08：直立刷圖時頂列的地點＝點了出提示（星級、怪物 Lv），舊 #area 不畫；地點清單在「更多 › 地點」 */
    await tap('#bhLoc');
    ok(
      '點頂列的地點（P08）＝提示星級與怪物 Lv；舊地點列 #area 不畫',
      await p.evaluate(
        () => !$('tip').hidden && /★.*怪物 Lv \d+/.test($('tip').textContent) && !$('area').getClientRects().length
      ),
      await p.evaluate(() => [$('tip').hidden, $('tip').textContent].join('|'))
    );
    await p.evaluate(() => hideTip());
    await p.evaluate(() => {
      G.node = G.node || '0,0';
      P.hp = 0;
      die();
    });
    await p.waitForTimeout(200);
    ok('自動、面板開著時倒下：死亡卡不蓋上來', await p.evaluate(() => G.state === 'dead' && $('over').hidden));
    await p.evaluate(() => {
      S.auto = 0;
      closePanels();
      enterCamp();
      openPanel('inv');
    });
    await p.waitForTimeout(300);
  }
  /* 天賦樹（0.4.7 重做手機的操作：說明卡在底部、沿路點亮、小總覽、中間是昇華入口；0.4.10 點一個點只選取、不飛） */
  await p.evaluate(() => {
    closePanels();
    S.lv = 20;
    PORT() ? navGo('tree') : treeOpen();
  });
  await p.waitForTimeout(500);
  /* 畫面上點得到的點（沒被上方列、卡片、小總覽擋住） */
  const ndAt = sel =>
    p.evaluate(sel => {
      const e = [...document.querySelectorAll(sel)].find(e => {
        const r = e.getBoundingClientRect(),
          top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return top && top.closest('.nd') === e;
      });
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return [e.dataset.n, r.left + r.width / 2, r.top + r.height / 2];
    }, sel);
  const tapXY = async (x, y, w = 450) => {
    await touch('touchStart', [[x, y]]);
    await touch('touchEnd', []);
    await p.waitForTimeout(w);
  };
  const tapSel = async q => {
    const c = await p.evaluate(q => {
      const r = document.querySelector(q).getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    }, q);
    await tapXY(c[0], c[1]);
  };
  ok(
    '還沒點過天賦：一打開是全圖，寫著六區的名字',
    await p.evaluate(
      () =>
        TREE.z < 0.7 &&
        [...document.querySelectorAll('#tg .secn')].filter(e => getComputedStyle(e).display !== 'none').length === 6
    )
  );
  ok(
    '頂部只有一排、按鈕 ≥44px、重置不在關閉旁邊',
    await p.evaluate(() => {
      const bar = document.querySelector('#ptree .tbar').getBoundingClientRect(),
        xs = [...document.querySelectorAll('#ptree .tbar .x')].map(e => e.getBoundingClientRect());
      return (
        bar.height <= 64 && xs.every(r => r.width >= 44 && r.height >= 44) && !document.querySelector('.tbar #treset')
      );
    })
  );
  {
    /* 0.4.10：看全圖點一個點＝選它，畫面不縮放、不飛（0.4.7 會飛過去放大，每點一下就跳） */
    const far = await ndAt('#tg .nd.can'),
      z0 = await p.evaluate(() => [TREE.z, TREE.x]);
    await tapXY(far[1], far[2], 700);
    ok(
      '看全圖時點一個點＝選它，不縮放、不花點數',
      await p.evaluate(
        ([id, z0]) => TREE.z === z0[0] && TREE.x === z0[1] && TREE.sel === id && S.pt.length === PT_START.length,
        [far[0], z0]
      ),
      await p.evaluate(() => [TREE.z.toFixed(2), TREE.sel].join())
    );
    await p.evaluate(id => {
      treeSelect(null);
      treeFly(PTREE.I[id].x, PTREE.I[id].y, 1.25);
    }, far[0]);
    await p.waitForTimeout(500);
  }
  ok(
    '放大後每個小點 ≥24px',
    await p.evaluate(() =>
      [...document.querySelectorAll('#tg .nd.b0 circle')]
        .map(e => e.getBoundingClientRect().width)
        .filter(Boolean)
        .every(w => w >= 24)
    )
  );
  const nd = await ndAt('#tg .nd.can');
  await tapXY(nd[1], nd[2]);
  ok(
    '天賦點一下＝選取，底部出現說明卡（還沒點亮）',
    await p.evaluate(id => TREE.sel === id && !S.pt.includes(id) && !$('tcard').hidden && $('tip').hidden, nd[0])
  );
  ok(
    '說明卡不出畫面、不蓋住選的點、按鈕 ≥44px',
    await p.evaluate(id => {
      const c = $('tcard').getBoundingClientRect(),
        n = document.querySelector(`#tg [data-n="${id}"]`).getBoundingClientRect(),
        nav = document.querySelector('#pnav'),
        bottom = nav && !nav.hidden ? nav.getBoundingClientRect().top : innerHeight;
      return (
        c.left >= 0 &&
        c.right <= innerWidth &&
        c.bottom <= bottom + 1 &&
        n.bottom <= c.top &&
        [...$('tcard').querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 44)
      );
    }, nd[0])
  );
  await p.screenshot({ path: shot('tree') });
  /* 過路點要選能力值：卡片上三顆；其他一顆「點亮」 */
  await tapSel('#tcard [data-ta^="go"]');
  ok('按卡片的按鈕點亮', await p.evaluate(id => S.pt.includes(id), nd[0]));
  {
    /* 沒有連著的點：卡片算出最短的路，一顆按鈕沿路點亮（先收起上一張卡，橫向的卡會蓋住大半棵樹） */
    await tapSel('#tcard [data-ta="desel"]');
    const far = await p.evaluate(() => {
      const have = new Set(S.pt),
        e = [...document.querySelectorAll('#tg .nd.off')].find(e => {
          const r = e.getBoundingClientRect(),
            top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2),
            n = PTREE.I[e.dataset.n];
          return top && top.closest('.nd') === e && !n.lock && !(PTREE.ADJ[n.id] || []).some(o => have.has(o));
        });
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return [e.dataset.n, r.left + r.width / 2, r.top + r.height / 2];
    });
    await tapXY(far[1], far[2]);
    const n0 = await p.evaluate(() => [S.pt.length, TREE.path.length, document.querySelectorAll('#tg .nd.pth').length]);
    await tapSel('#tcard [data-ta^="go"]');
    ok(
      '選沒連著的點：標出路、按一下沿路全部點亮',
      n0[1] >= 2 &&
        n0[2] === n0[1] &&
        (await p.evaluate(([id, n]) => S.pt.includes(id) && S.pt.length === n, [far[0], n0[0] + n0[1]])),
      `路上 ${n0[1]} 點`
    );
    await tapSel('#tcard [data-ta="back"]');
    ok('卡片的「退回這一點」', await p.evaluate(id => !S.pt.includes(id), far[0]));
  }
  ok(
    '放大後有小總覽，點一下移過去',
    await (async () => {
      const [x0, r] = await p.evaluate(() => {
        const m = $('tmini').getBoundingClientRect();
        return [TREE.x, m.hidden ? null : [m.left + 8, m.top + m.height / 2]];
      });
      await tapXY(r[0], r[1]);
      return p.evaluate(x0 => !$('tmini').hidden && Math.abs(TREE.x - x0) > 100, x0);
    })()
  );
  const z0 = await p.evaluate(() => TREE.z);
  await touch('touchStart', [
    [W / 2 - 115, H / 2],
    [W / 2 + 115, H / 2]
  ]);
  for (let i = 1; i <= 5; i++) {
    await touch('touchMove', [
      [W / 2 - 115 + i * 15, H / 2],
      [W / 2 + 115 - i * 15, H / 2]
    ]);
    await p.waitForTimeout(30);
  }
  await touch('touchEnd', []);
  await p.waitForTimeout(100);
  const z1 = await p.evaluate(() => TREE.z);
  ok('兩指縮小', z1 < z0 * 0.7, z0.toFixed(2) + ' → ' + z1.toFixed(2));
  {
    /* 中間是昇華的入口：點一下開昇華石碑 */
    await p.evaluate(() => {
      treeSelect(null);
      TREE.x = TREE.y = 0;
      TREE.z = treeZ0();
      treeView();
    });
    await tapSel('#tascgo');
    ok(
      '樹中間是昇華的入口（不再塞整張昇華圖），點一下開昇華石碑',
      await p.evaluate(() => !TREE.open && PANEL.asc && !document.querySelector('#tg .nd.asc'))
    );
    await p.evaluate(() => {
      closePanels();
      PORT() ? navGo('tree') : treeOpen();
    });
    await p.waitForTimeout(300);
  }
  {
    /* 昇華石碑（0.4.7 直立重做）：不畫盤面，一張卡一個大點；按「選這個」連同前面的小點一起點亮 */
    const asc = await p.evaluate(() => {
      treeClose();
      S.asc = 'wind';
      S.at = ['a_st'];
      S.maxT = 7;
      changed();
      fmenuOpen('asc');
      const pa = $('pasc'),
        T = ascNodes('wind');
      return {
        bigs: T.N.filter(n => n.big === 1).length,
        cards: pa.querySelectorAll('.axc').length,
        chart: !!pa.querySelector('.ax-chart'),
        slots: pa.querySelectorAll('.axs-s').length,
        take: pa.querySelectorAll('[data-ax^="take:"]').length,
        need: pa.querySelector('#axc-a_walk .axc-w').textContent
      };
    });
    ok(
      '昇華石碑（直立）：沒有盤面，每個大點一張卡、上面 4 個位子；要先選別人的寫原因、沒有按鈕',
      !asc.chart && asc.cards === asc.bigs && asc.slots === 4 && asc.take > 0 && asc.need.includes('聚風'),
      JSON.stringify(asc)
    );
    ok(
      '昇華卡片上的按鈕 ≥44px、卡片不出畫面左右',
      await p.evaluate(() =>
        [...$('pasc').querySelectorAll('.axc, .axc .btn, .axs-r .btn')].every(e => {
          const r = e.getBoundingClientRect();
          return r.left >= 0 && r.right <= innerWidth && (e.tagName !== 'BUTTON' || r.height >= 44);
        })
      )
    );
    await p.evaluate(() => document.querySelector('#pasc [data-ax="take:a_gale"]').scrollIntoView({ block: 'center' }));
    await tapSel('#pasc [data-ax="take:a_gale"]');
    ok(
      '按「選這個」：大點連同前面的小點一起點亮（2 點），第一個位子填上',
      await p.evaluate(
        () =>
          S.at.join() === 'a_st,a_s1,a_gale' &&
          ascLeft() === 2 &&
          document.querySelectorAll('#pasc .axs-s.on').length === 1 &&
          !!document.querySelector('#pasc [data-ax="take:a_walk"]')
      )
    );
    await p.screenshot({ path: shot('asc') });
    await p.evaluate(() => document.querySelector('#pasc [data-ax="drop:a_gale"]').scrollIntoView({ block: 'center' }));
    await tapSel('#pasc [data-ax="drop:a_gale"]');
    ok('按「已選 · 退回」：大點與它的小點一起退', await p.evaluate(() => S.at.join() === 'a_st' && ascLeft() === 4));
    await p.evaluate(() => ($('pasc').scrollTop = 0));
    await tapSel('#pasc [data-ax="pick"]');
    ok(
      '「換昇華」：只列開放的昇華（0.4.10 先開 2 個）、寫著在做什麼、每列 ≥44px',
      await p.evaluate(() => {
        const L = [...document.querySelectorAll('#pasc .axl-r')];
        return (
          L.length === ascList().length &&
          L.every(e => e.getBoundingClientRect().height >= 44 && e.querySelector('small').textContent.length > 4)
        );
      })
    );
    await tapSel('#pasc [data-ax="v:iron"]');
    ok(
      '點另一個昇華先看內容：卡片沒有選的按鈕，底下一顆「改成」看得到',
      await p.evaluate(() => {
        const b = document.querySelector('#pasc .ax-pick'),
          r = b && b.getBoundingClientRect(),
          nav = document.querySelector('#pnav').getBoundingClientRect();
        return (
          S.asc === 'wind' &&
          !document.querySelector('#pasc [data-ax^="take:"]') &&
          !!r &&
          r.bottom <= nav.top + 1 &&
          r.height >= 44
        );
      })
    );
    await p.evaluate(() => {
      closePanels();
      navGo('tree');
    });
    await p.waitForTimeout(300);
    ok(
      '天賦樹開著時底部分頁列還在、「天賦」亮著、有點數沒用時有亮點',
      await p.evaluate(() => {
        const b = document.querySelector('#pnav [data-tm="nav:tree"]'),
          r = b.getBoundingClientRect(),
          top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return b.classList.contains('on') && !!b.querySelector('.dot') && !!top.closest('#pnav');
      })
    );
    await tapSel('#pnav [data-tm="nav:char"]');
    ok('天賦樹開著時按別的分頁直接切過去', await p.evaluate(() => !TREE.open && PANEL.inv && $('ptree').hidden));
    await p.evaluate(() => navGo('tree'));
    await p.waitForTimeout(300);
  }
  /* 技能面板（0.4.8）：總覽 → 這一招 → 選了一個孔 → 挑輔助，每個畫面都不出畫面、按得到的東西 ≥44px；手指在清單上滑＝捲清單、不會選到 */
  {
    const tap = async q => {
      const c = await p.evaluate(q => {
        const e = document.querySelector(q);
        if (!e) return null;
        e.scrollIntoView({ block: 'nearest' });
        const r = e.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      }, q);
      if (!c) return false;
      await touch('touchStart', [c]);
      await touch('touchEnd', []);
      await p.waitForTimeout(250);
      return true;
    };
    const look = () =>
      settle(p, () => {
        const pn = $('pskill').getBoundingClientRect(),
          small = [],
          out = [];
        if (pn.left < -0.5 || pn.top < -0.5 || pn.right > innerWidth + 0.5 || pn.bottom > innerHeight + 0.5)
          out.push('面板');
        for (const e of document.querySelectorAll('#pskill button')) {
          const r = e.getBoundingClientRect();
          /* 捲到面板外的不算；文字裡的名詞（.term）是行內字 */
          if (!r.width || e.classList.contains('term') || r.bottom <= pn.top || r.top >= pn.bottom) continue;
          const n = e.dataset.sk || e.dataset.a || e.className;
          /* 篩選晶片那一列可以橫向捲：看那一列本身 */
          const q = e.closest('.sk-chips') ? e.closest('.sk-chips').getBoundingClientRect() : r;
          if (q.left < -0.5 || q.right > innerWidth + 0.5) out.push(n);
          if (Math.min(r.width, r.height) < 43.5) small.push(`${n} ${Math.round(r.width)}×${Math.round(r.height)}`);
        }
        const pri = document.querySelector('#pskill .sk-bar .pri');
        return { v: SKUI.view, small, out, pri: !pri || pri.getBoundingClientRect().bottom <= pn.bottom + 0.5 };
      });
    await p.evaluate(() => {
      treeClose();
      closePanels();
      const ok = Object.keys(SKILLS).filter(
        k => SKILLS[k].m && !skWhy(SKILLS[k]) && !gemLack(mkGem(k, 1)).length && !['slash', 'mirage'].includes(k)
      );
      S.skills[0].k = 'slash';
      S.skills[1].k = ok[0];
      S.skills[2].k = ok[1];
      S.skills[0].n = 3;
      S.skills[0].so = ['fury', null, null];
      changed();
      navGo('skill');
    });
    await p.waitForTimeout(300);
    const R = [['總覽', await look()]];
    await tap('#pskill [data-sk="go:one:0"]');
    await p.waitForTimeout(260);
    R.push(['這一招', await look()]);
    await tap('#pskill .sk-row[data-sk="hole:0"]');
    await p.waitForTimeout(260);
    R.push(['選了一個孔', await look()]);
    await tap('#pskill [data-sk="back"]');
    await tap('#pskill .sk-row.emp[data-sk^="hole"]');
    await p.waitForTimeout(260);
    R.push(['挑輔助', await look()]);
    const bad = R.filter(([, r]) => r.small.length || r.out.length || !r.pri);
    ok(
      '技能面板：四個畫面都不出畫面、按得到的東西 ≥44px、主要按鈕在面板底部',
      !bad.length,
      JSON.stringify(bad.length ? bad : R.map(x => x[0] + ':' + x[1].v))
    );
    const sw = await p.evaluate(() => {
      /* 清單裡看得到的最後一列（橫向手機只看得到兩三列） */
      const L = document.querySelector('#pskill .sk-list'),
        b = L.getBoundingClientRect(),
        e = [...L.querySelectorAll('.sk-row')].filter(x => x.getBoundingClientRect().bottom <= b.bottom).pop(),
        r = e.getBoundingClientRect();
      return [
        r.left + r.width / 2,
        Math.min(r.top + r.height / 2, b.bottom - 10),
        SKUI.pick,
        L.children.length,
        SKUI.view
      ];
    });
    await touch('touchStart', [sw.slice(0, 2)]);
    for (let i = 1; i <= 8; i++) {
      await touch('touchMove', [[sw[0], sw[1] - i * 14]]);
      await p.waitForTimeout(16);
    }
    await touch('touchEnd', []);
    await p.waitForTimeout(300);
    const after = await p.evaluate(() => [document.querySelector('#pskill .sk-list').scrollTop, SKUI.pick]);
    ok('技能面板：手指在清單上滑＝捲清單、不會選到那一列', after[0] > 20 && after[1] === sw[2], JSON.stringify(after));
    /* 最常做的事（0.4.8 驗收）：從戰鬥畫面開始，「找出讓第 1 格每秒最高的輔助並插上」幾下（打開技能分頁那一下另外算） */
    const best = await p.evaluate(() => {
      closePanels();
      S.skills[0].so = ['fury', null, null];
      changed();
      /* 暴力算：每一顆能插的輔助放進第 2 孔，取每秒最高的 */
      const c = { D: awD(S.skills[0].k, awOf(S.skills[0].k)), rec: S.skills[0] };
      let b = null;
      for (const k of Object.keys(SUPPORTS)) {
        if ((SUPPORTS[k].aw && !awHave(k)) || supWhy(c, k, 1) !== '') continue;
        S.skills[0].so[1] = k;
        const v = skMain(skillNums(slotCfg(0)));
        if (!b || v > b.v) b = { k, v };
      }
      S.skills[0].so[1] = null;
      return b;
    });
    await p.evaluate(() => navGo('skill'));
    await p.waitForTimeout(260);
    let taps = 0;
    /* M1-PK.1：空孔沒有目前項＝不預選，要先點一列（推薦排第一的就是差最多的）再按「放上」 */
    for (const q of [
      '#pskill [data-sk="go:one:0"]',
      '#pskill .sk-row.emp[data-sk^="hole"]',
      '#pskill .sk-list .sk-row',
      '#pskill .sk-bar .pri'
    ]) {
      taps += (await tap(q)) ? 1 : 0;
      await p.waitForTimeout(200);
    }
    const got = await p.evaluate(() => S.skills[0].so[1]);
    ok(
      `技能面板：找出讓第 1 格每秒最高的輔助並插上 ${taps} 下（不含打開技能分頁那一下）`,
      taps <= 4 && got === best.k,
      `插上 ${got}，暴力算的最好是 ${best.k}`
    );
    await p.evaluate(() => closePanels());
  }
  /* 技能寶石、昇華石碑：面板不出畫面、主要動作看得到（等面板滑入的動畫跑完才量） */
  {
    const inView = async (open, ...sel) => {
      await p.evaluate(open);
      await p.waitForTimeout(260);
      return settle(
        p,
        sel =>
          sel.map(q => {
            const r = document.querySelector(q).getBoundingClientRect();
            return r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5;
          }),
        sel
      );
    };
    const L = [
      await inView(
        () => {
          treeClose();
          closePanels();
          S.lv = 72;
          S.lib.sk.slash = 10;
          changed();
          /* 直立（0.4.4）：照玩家的走法從分頁列開，技能面板打開就蓋滿 */
          PORT() ? navGo('skill') : openPanel('skill');
          skSel(0);
          hudPanels();
        },
        '#pskill',
        '.sk-top',
        '.sk-hero',
        '.sk-bar .pri'
      ),
      await inView(
        () => {
          closePanels();
          S.asc = null;
          S.at = [];
          ASCUI.v = null;
          openPanel('asc');
        },
        '#pasc',
        '.axl-r',
        '.axl-h'
      ),
      /* 0.2.73：點過點、出現「重置」後，標題列的 × 也要在畫面內（667×375 曾被擠出去） */
      await inView(
        () => {
          closePanels();
          S.asc = 'iron';
          S.at = ['a_st', 'a_s1', 'a_wall'];
          ASCUI.v = 'iron';
          openPanel('asc');
        },
        '#pasc',
        '.ax-reset',
        '#pasc .ph .x'
      ),
      /* 0.2.73：按下「重置」的確認期間，× 與按鈕都在畫面內，點數那行不蓋到標題、按鈕與 ×
         （B2 起「再按一次」改長按確認卡：卡上「長按重置」「取消」也要在畫面內） */
      await inView(
        async () => {
          closePanels();
          S.asc = 'iron';
          S.at = ['a_st', 'a_s1', 'a_wall'];
          ASCUI.v = 'iron';
          openPanel('asc');
          await new Promise(r => setTimeout(r, 200));
          document.querySelector('.ax-reset').click();
        },
        '#pasc',
        '.ax-reset',
        '#pasc .ph .x',
        '#hask:not([hidden]) .hgo',
        '#hask:not([hidden]) .btn.pri'
      ),
      [
        await p.evaluate(() => {
          const r = s => document.querySelector(s).getBoundingClientRect(),
            [t, sum, btn, x] = ['#pasc .ph > b', '.ax-sum', '.ax-reset', '#pasc .ph .x'].map(r),
            apart = (a, b) =>
              a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5;
          /* 點數那行的字有沒有溢出它的格子（框不重疊但字蓋到按鈕，667×375 曾這樣） */
          const out = document.querySelector('.ax-sum');
          return (
            apart(t, btn) && apart(sum, btn) && apart(btn, x) && apart(sum, x) && out.scrollWidth <= out.clientWidth + 1
          );
        })
      ]
    ];
    ok('技能、昇華石碑：不出畫面、主要動作看得到', L.flat().every(Boolean), JSON.stringify(L));
    await p.evaluate(() => holdClose());
    await p.evaluate(() => closePanels());
  }
  /* ---------- M0：死亡卡與確認卡在最上層、世界暫停、繼續刷是主按鈕、更多的地點副標 ---------- */
  {
    const tapEl = async q => {
      const r = await p.evaluate(q => {
        const b = document.querySelector(q).getBoundingClientRect();
        return [b.left + b.width / 2, b.top + b.height / 2];
      }, q);
      await touch('touchStart', [r]);
      await p.waitForTimeout(40);
      await touch('touchEnd', []);
      await p.waitForTimeout(250);
    };
    /* 卡片上每顆鈕的正中央點下去，最上面的是那顆鈕本身（沒被面板、掛機卡蓋住） */
    const onTop = () =>
      p.evaluate(() => {
        const bs = [...document.querySelectorAll('#over:not([hidden]) .btn')];
        return (
          bs.length > 0 &&
          bs.every(b => {
            const r = b.getBoundingClientRect(),
              el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return el && b.contains(el);
          })
        );
      });
    await p.evaluate(() => {
      closePanels();
      if (TREE.open) treeClose();
      S.auto = 0;
      runNode(TRUNK_K[0]);
    });
    await p.waitForTimeout(600);
    /* 開著戰利品和營地時倒下（手動模式；自動＋直立照 0.4.4 只跳通知，上面另外測） */
    await p.evaluate(() => {
      openPanel('inv');
      PANEL.craft = true;
      hudPanels();
      P.hp = 0;
      die();
    });
    await p.waitForTimeout(300);
    ok(
      '開著戰利品與營地時倒下：死亡卡在最上層、面板收起來、「再試一次」點得到（沒有回藏身處）',
      (await p.evaluate(
        () =>
          !$('over').hidden &&
          !anyPanel() &&
          $('pidle').hidden &&
          +getComputedStyle($('over')).zIndex >= 40 &&
          /* M2-40 定案：拿掉回營地，只剩「再試一次」 */
          document.querySelectorAll('#over .pbtns .btn:not(.dup)').length === 1 &&
          !document.querySelector('#over [data-a=camp]')
      )) && (await onTop())
    );
    await p.screenshot({ path: shot('m0_dead') });
    const t0 = await p.evaluate(() => G.t);
    await p.waitForTimeout(1000);
    ok('倒下時世界停住', await p.evaluate(t0 => G.t === t0, t0));
    await tapEl('#over [data-a=again]');
    ok('死亡卡的「再試一次」點得到', await p.evaluate(() => G.state === 'play' && $('over').hidden));
    /* 確認卡：開 10 秒，怪物貼在身邊也不會受傷、不會跳新的傷害數字；關掉後戰鬥接著跑 */
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      openPanel('more');
      for (const m of G.mobs) (m.aggro = 1), (m.x = P.x + 20), (m.y = P.y);
      campAsk();
      window._m0 = { hp: P.hp, t: G.t, n: G.nums.length };
    });
    await p.waitForTimeout(300);
    ok(
      '確認卡在最上層、底下的選單收起來、兩顆鈕點得到',
      (await p.evaluate(() => !$('over').hidden && !anyPanel())) && (await onTop())
    );
    await p.screenshot({ path: shot('m0_ask') });
    await p.waitForTimeout(10000);
    ok(
      '確認卡開著 10 秒：生命不變、世界時間不動、沒有新的傷害數字',
      await p.evaluate(() => P.hp === _m0.hp && G.t === _m0.t && G.nums.length <= _m0.n),
      await p.evaluate(() => `${Math.round(_m0.hp)}→${Math.round(P.hp)}`)
    );
    await tapEl('#over [data-a=askno]');
    await p.waitForTimeout(500);
    ok('按「繼續刷圖」：卡片關掉、戰鬥接著跑', await p.evaluate(() => $('over').hidden && G.t > _m0.t));
    /* 更多選單的「地點」：正在刷時寫目前的地點名 */
    await p.evaluate(() => openPanel('more'));
    await p.waitForTimeout(200);
    ok(
      '更多的「地點」副標寫正在刷的地點',
      await p.evaluate(() => {
        const s = document.querySelector('[data-tm="nav:node"] small, [data-a="nav:node"] small');
        return !!s && s.textContent.includes('正在刷：' + G.nodeN);
      })
    );
    /* 回營地：「繼續刷」是標準主按鈕（≥44px、字 14～17px）；地點名 14px */
    /* 鍵盤（M0-04）：T 開確認卡、Esc＝取消、連按兩下 T＝回營地（M2-12） */
    await p.evaluate(() => closePanels());
    await p.keyboard.press('t');
    await p.waitForTimeout(200);
    const askT = await p.evaluate(() => !$('over').hidden && G.ask === 'camp' && /回營地/.test($('over').textContent));
    await p.keyboard.press('Escape');
    await p.waitForTimeout(200);
    ok(
      'T 開確認卡、Esc＝取消（還在地圖、沒開設定）',
      askT && (await p.evaluate(() => $('over').hidden && G.scene === 'map' && !PANEL.set))
    );
    await p.keyboard.press('t');
    await p.waitForTimeout(150);
    await p.keyboard.press('t');
    await p.waitForTimeout(500);
    ok(
      '連按兩下 T：回到營地、停在營地（刷圖暫停）',
      await p.evaluate(() => G.scene === 'camp' && $('over').hidden && S.stopWhy === 'camp')
    );
    const rb = await p.evaluate(() => {
      const b = document.querySelector('#run [data-a=resume]'),
        a = $('area');
      return (
        b && {
          h: Math.round(b.getBoundingClientRect().height),
          f: parseFloat(getComputedStyle(b).fontSize),
          a: parseFloat(getComputedStyle(a).fontSize)
        }
      );
    });
    ok(
      '「繼續刷」≥44px、字 14～17px；地點名 14px',
      !!rb && rb.h >= 44 && rb.f >= 14 && rb.f <= 17 && rb.a === 14,
      JSON.stringify(rb)
    );
    await p.screenshot({ path: shot('m0_resume') });
    ok('點過之後音效建立了', await p.evaluate(() => !!AC && AC.state !== 'closed'));
  }
  /* ---------- M1-A：新存檔自動開刷、手機尺寸不會進入橫向、暫停規則、死亡卡的升級鈕、分頁一下就切 ---------- */
  {
    const tapAt = async r => {
      await touch('touchStart', [r]);
      await p.waitForTimeout(40);
      await touch('touchEnd', []);
      await p.waitForTimeout(300);
    };
    const mid = q =>
      p.evaluate(q => {
        const e = document.querySelector(q);
        if (!e) return null;
        const b = e.getBoundingClientRect();
        return [
          b.left + b.width / 2,
          b.top + b.height / 2,
          b.width,
          b.height,
          b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth
        ];
      }, q);
    {
      /* M1-10：自動模式開戰利品、營地照打；技能挑選、天賦樹停住（怪貼身 3 秒生命不變）；手動開任何面板都停；停住時產生器照產 */
      await p.evaluate(() => {
        closePanels();
        if (TREE.open) treeClose();
        S.auto = 1;
        S.camp = { ...S.camp, ..._CAMP };
        genOf('wood').lv = Math.max(10, genOf('wood').lv);
        runNode(TRUNK_K[0]);
      });
      await p.waitForTimeout(500);
      const runs = async (open, close) => {
        await p.evaluate(open);
        await p.waitForTimeout(100);
        const a = await p.evaluate(() => {
          for (const m of G.mobs) (m.aggro = 1), (m.x = P.x + 20), (m.y = P.y);
          return { t: G.t, hp: P.hp, w: S.mat.mats.wood || 0 };
        });
        await p.waitForTimeout(3000);
        const b2 = await p.evaluate(() => ({ t: G.t, hp: P.hp, w: S.mat.mats.wood || 0, paused: worldPaused() }));
        await p.evaluate(close);
        return { run: b2.t > a.t, same: b2.hp === a.hp, gen: b2.w > a.w, paused: b2.paused };
      };
      const cl = () => {
        closePanels();
        if (TREE.open) treeClose();
        P.hp = ST.hp;
      };
      const r1 = await runs(() => navGo('bag'), cl),
        r2 = await runs(() => navGo('craft'), cl),
        r3 = await runs(() => {
          navGo('skill');
          SKUI.view = 'skills';
          hudPanels();
        }, cl),
        r4 = await runs(() => treeOpen(), cl);
      ok('M1-10 自動：開戰利品照打', r1.run && !r1.paused, JSON.stringify(r1));
      ok('M1-10 自動：開營地照打', r2.run && !r2.paused, JSON.stringify(r2));
      ok('M1-10 自動：技能挑選停住、生命不變、產生器照產', !r3.run && r3.same && r3.gen, JSON.stringify(r3));
      ok('M1-10 自動：天賦樹停住、生命不變、產生器照產', !r4.run && r4.same && r4.gen, JSON.stringify(r4));
      await p.evaluate(() => (S.auto = 0));
      const r5 = await runs(() => navGo('bag'), cl),
        r6 = await runs(() => navGo('more'), cl);
      ok('M1-10 手動：開戰利品停住、產生器照產', !r5.run && r5.same && r5.gen, JSON.stringify(r5));
      ok('M1-10 手動：開更多也停住', !r6.run && r6.same, JSON.stringify(r6));
      const t1 = await p.evaluate(() => G.t);
      await p.waitForTimeout(500);
      ok('M1-10 手動：關掉面板接著跑', await p.evaluate(t1 => G.t > t1 && !worldPaused(), t1));
      /* M1-17：死亡卡有「現在可以升」的鈕（營地的下一件事買得起時），按了就升、卡片換成下一件 */
      await p.evaluate(() => {
        S.camp = newCamp();
        S.mat.soul = 1e5;
        matAdd('wood', 0, 1e4);
        P.hp = 0;
        die();
      });
      await p.waitForTimeout(300);
      const du = await mid('#over .dup'),
        c0 = await p.evaluate(() => JSON.stringify(S.camp));
      ok('M1-17：死亡卡有「現在可以升」的鈕，在畫面內 ≥44px', !!du && du[4] && du[3] >= 44, JSON.stringify(du));
      await p.screenshot({ path: shot('m1_dead') });
      if (du) await tapAt(du);
      ok(
        'M1-17：按了就升、卡片還在',
        await p.evaluate(c0 => JSON.stringify(S.camp) !== c0 && !$('over').hidden && G.state === 'dead', c0)
      );
      await p.evaluate(() => act('again'));
      await p.waitForTimeout(300);
      /* M1-19：角色頁的說明框開著時點「營地」：一下就切過去、說明框收起來 */
      await p.evaluate(() => {
        Object.assign(S.camp, _CAMP);
        closePanels();
        navGo('char');
      });
      await p.waitForTimeout(400);
      const sl = await mid('#pinv .doll2 [data-eq=weapon]');
      if (sl) await tapAt(sl);
      const tipOn = await p.evaluate(() => !$('tip').hidden);
      const nb = await mid('#pnav [data-tm="nav:craft"]');
      const at = await p.evaluate(([x, y]) => {
        const e = document.elementFromPoint(x, y);
        return e && (e.id || e.className) + ' ' + JSON.stringify($('tip').getBoundingClientRect());
      }, nb);
      await tapAt(nb);
      ok(
        'M1-19：說明框開著時點「營地」一下就切過去',
        tipOn && (await p.evaluate(() => navOn() === 'craft' && $('tip').hidden)),
        JSON.stringify([tipOn, nb, at, await p.evaluate(() => [navOn(), $('tip').hidden, G.scene, G.state])])
      );
      /* M1-01：新存檔看完（跳過）開場，5 秒內就在刷第一個地點、自動模式，不用點任何東西 */
      /* 另一份存檔（?p=8）：重新整理前存檔會寫回去，清 localStorage 不算新存檔 */
      await p.goto(URL + '?p=8&' + Date.now());
      await p.waitForTimeout(1500);
      const sk = await mid('#intro [data-iv=skip]');
      if (sk) await tapAt(sk);
      await p.waitForTimeout(4500);
      ok(
        'M1-01：新存檔跳過開場 5 秒內自動開刷第一個地點',
        !!sk && (await p.evaluate(() => G.scene === 'map' && G.node === TRUNK_K[0] && S.auto === 1 && G.t > 0)),
        await p.evaluate(() => `${G.scene} ${G.node} auto=${S.auto}`)
      );
      await p.screenshot({ path: shot('m1_fresh') });
    }
  }
  /* ---------- M1-B：天賦樹路線名稱、解鎖判斷、下一個解鎖、裝備不寫孔、技能失效、測試入口 ---------- */
  {
    const tapAt = async r => {
      await touch('touchStart', [r]);
      await p.waitForTimeout(40);
      await touch('touchEnd', []);
      await p.waitForTimeout(300);
    };
    const at = q =>
      p.evaluate(q => {
        const e = document.querySelector(q);
        if (!e) return null;
        const b = e.getBoundingClientRect();
        return [b.left + b.width / 2, b.top + b.height / 2];
      }, q);
    /* 新存檔（另一個存檔位 ?p=12）：跳過開場 */
    await p.goto(URL + '?p=12&' + Date.now());
    await p.waitForTimeout(1500);
    await p.evaluate(() => {
      introStop();
      proSkip();
      S.auto = 1;
    });
    await p.waitForTimeout(300);
    /* M1-06：祭壇 Lv0，從更多選單、直接叫都打不開天賦樹與昇華石碑，跳「升祭壇到 Lv n 才開」 */
    const lk = await p.evaluate(() => {
      treeOpen();
      const t = [TREE.open, $('warn').textContent];
      openPanel('asc');
      return [...t, !!PANEL.asc, $('warn').textContent];
    });
    ok(
      'M1-06：祭壇不夠時天賦樹、昇華石碑打不開，跳「升祭壇到 Lv n 才開」',
      !lk[0] && lk[1] === '升祭壇到 Lv 4 才開' && !lk[2] && lk[3] === '升祭壇到 Lv 7 才開',
      JSON.stringify(lk)
    );
    /* M1-06（製作人決定 1）：其他入口也打不開——分頁列沒有天賦、更多選單沒有天賦樹與昇華石碑、點營地的昇華石碑；山海寶盒例外照開 */
    const lk2 = await p.evaluate(() => {
      enterCamp();
      closePanels();
      navGo('more');
      const rows = [...document.querySelectorAll('#pmore .mrow b')].map(b => b.textContent),
        tb = document.querySelector('#pnav [data-tm="nav:tree"]'),
        /* battle-hud（UIUX 裁定）：7 格位置固定，天賦格還在但畫鎖頭；點了不開、跳解鎖條件 */
        nav = !!tb && tb.classList.contains('lock') && !!tb.querySelector('.nlk') && (navGo('tree'), !TREE.open),
        nw = $('warn').textContent;
      closePanels();
      useProp({ k: 'asc' });
      const asc = !!PANEL.asc,
        w = $('warn').textContent;
      useProp({ k: 'box' });
      const box = !!PANEL.box;
      closePanels();
      return { rows, nav, nw, asc, w, box };
    });
    ok(
      'M1-06：分頁列的天賦格畫鎖頭、點了不開並跳「升長老屋到 Lv 4 才開天賦樹」；更多沒有天賦樹與昇華石碑、點昇華石碑打不開並跳那一句；山海寶盒照開（例外）',
      lk2.nav &&
        lk2.nw === '升長老屋到 Lv 4 才開天賦樹' &&
        !lk2.rows.includes('天賦樹') &&
        !lk2.rows.includes('昇華石碑') &&
        !lk2.asc &&
        lk2.w === '升祭壇到 Lv 7 才開' &&
        lk2.box,
      JSON.stringify(lk2)
    );
    /* M1-14：掉落紀錄空的時候寫定稿文案；營地升級出那一句（只出一次） */
    const lg = await p.evaluate(() => {
      S.log = [];
      openPanel('log');
      const t = document.querySelector('#plog .lgl') ? document.querySelector('#plog .lgl').textContent : '';
      closePanels();
      return t;
    });
    ok(
      'M1-14：掉落紀錄空的時候寫「還沒有掉落。刷地點時，稀有以上的掉落會記在這裡（最近 50 筆）。」（名詞表 v0.6.15）',
      lg === '還沒有掉落。刷地點時，稀有以上的掉落會記在這裡（最近 50 筆）。',
      lg
    );
    const sy = await p.evaluate(async () => {
      S.mat.soul = 1e6;
      S.mat.mats.wood = 1e6;
      navGo('craft');
      CRAFT.tab = 'camp';
      hudPanels();
      const b = document.querySelector('[data-fg="camp:forge"]');
      if (b) b.click();
      await new Promise(r => setTimeout(r, 200));
      const a = $('warn').textContent;
      S.camp.forge = 0;
      $('warn').textContent = '';
      campUp('forge');
      await new Promise(r => setTimeout(r, 200));
      closePanels();
      return [!!b, a, $('warn').textContent];
    });
    ok(
      'M1-14：營地升鍛造台 Lv1 跳「鍛造台 Lv1：開了「填」。…」；同一級第二次不再出現',
      sy[0] && sy[1] === '鍛造台 Lv1：開了「填」。蛻變石、增幅石開始掉，拿來替裝備加詞。' && sy[2] === '',
      JSON.stringify(sy)
    );
    await p.evaluate(() => (S.camp.forge = 0));
    /* M1-07：更多選單只多一列「下一個」；升到之後換下一項；永遠不超過一列 */
    const nx = async () => {
      await p.evaluate(() => {
        closePanels();
        navGo('more');
      });
      await p.waitForTimeout(250);
      return p.evaluate(() =>
        [...document.querySelectorAll('#pmore .mrow')]
          .filter(b => b.querySelector('b').textContent === '下一個')
          .map(b => b.querySelector('small').textContent)
      );
    };
    const n0 = await nx();
    await p.screenshot({ path: shot('m1_more') });
    await p.evaluate(() => (S.camp.altar = 4));
    const n1 = await nx();
    await p.evaluate(() => (S.camp.altar = 11));
    const n2 = await nx();
    ok(
      'M1-07：更多選單只多一列「下一個」、升級後換成下一項、全開了就沒有',
      n0.join() === '升祭壇到 Lv 4 開天賦樹' && n1.join() === '升祭壇到 Lv 7 開昇華石碑' && n2.length === 0,
      JSON.stringify([n0, n1, n2])
    );
    /* M1-03：天賦樹一打開，六條路的全名都在畫面裡、不在中央的昇華圓裡、沒被頂部列與分頁列蓋住 */
    await p.evaluate(() => {
      closePanels();
      S.camp.altar = 4;
      TREE.seen = 0;
      treeOpen();
    });
    await p.waitForTimeout(600);
    const tn = await p.evaluate(() => {
      const a = document.querySelector('#tascgo circle').getBoundingClientRect(),
        v = $('tview').getBoundingClientRect(),
        ax = a.left + a.width / 2,
        ay = a.top + a.height / 2;
      return [...document.querySelectorAll('#tg .secn')].map(t => {
        const q = t.getBoundingClientRect(),
          corners = [
            [q.left, q.top],
            [q.right, q.top],
            [q.left, q.bottom],
            [q.right, q.bottom]
          ];
        return [
          t.textContent,
          getComputedStyle(t).display !== 'none' && q.width > 20,
          corners.every(([x, y]) => Math.hypot(x - ax, y - ay) > a.width / 2),
          q.left >= v.left && q.right <= v.right && q.top >= v.top && q.bottom <= v.bottom
        ];
      });
    });
    await p.screenshot({ path: shot('m1_tree') });
    ok(
      'M1-03：天賦樹一打開六條路的全名都看得到、不碰中央圓、在樹的畫面裡',
      tn.length === 6 && tn.every(x => x[1] && x[2] && x[3]),
      JSON.stringify(tn.filter(x => !(x[1] && x[2] && x[3])))
    );
    await p.evaluate(() => treeClose());
    /* M1-09 ＋ M1-15：拿劍、斬擊＋幻影斬，倉庫一把短矛：說明框沒有「孔」；換裝卡事先寫會失效的招；換上後 HUD 立刻講、DPS 算 0 */
    await p.evaluate(() => {
      S.camp.altar = 1;
      S.skills[1] = { k: 'mirage', so: [null, null], n: 2 };
      S.lib.sk.mirage = 1;
      const sp = mkItem('w_spear_0', 1, 0);
      sp.so = 2;
      invPut(S.inv, sp);
      ST = stats();
      closePanels();
      navGo('bag');
      BAG.sel = sp.id;
      hudPanels();
    });
    await p.waitForTimeout(400);
    const cm = await p.evaluate(() => {
      const c = [...document.querySelectorAll('#pinv .dlt')].map(e => e.textContent).join(' ');
      return c;
    });
    await p.screenshot({ path: shot('m1_cmp') });
    ok('M1-15：換裝卡先寫「會讓這些招失效：斬擊、幻影斬。」', /會讓這些招失效：斬擊、幻影斬。/.test(cm), cm);
    const so = await p.evaluate(() => {
      const it = S.inv.items.find(i => i.b === 'w_spear_0');
      return [baseLayers(it), document.querySelector('.cmpc') ? document.querySelector('.cmpc').innerText : ''];
    });
    ok('M1-09：說明框與換裝卡不寫裝備的孔', !so.join().includes('孔') && !so.join().includes('○'), JSON.stringify(so));
    /* M1-09（製作人決定 5）：角色頁截圖，每一格點了都有反應（裝備欄、護符、神格），沒有寶石格。
       M2-38（M2-37.6）起護符、神格只畫開了的格：先裝 3 槽腰帶、開弒神，讓每一格都在，數完拿掉 */
    await p.evaluate(() => {
      closePanels();
      window._w0 = S.camp.watch;
      S.camp.watch = CAMP.watch.length;
      S.eq.belt = mkItem(BASES.find(b => b.k === 'belt').id, 1, 0);
      S.eq.belt.cs = 3;
      navGo('char');
    });
    await p.waitForTimeout(400);
    await p.screenshot({ path: shot('m1_doll') });
    const dc = await p.evaluate(() =>
      [...document.querySelectorAll('#pinv .doll2 .eqs, #pinv .doll2x .eqs')].map(e => e.innerText.replace(/\s+/g, ''))
    );
    ok(
      'M1-09：角色頁沒有寶石格（只有裝備欄、護符、神格）',
      dc.length >= 13 && !dc.some(t => /寶石/.test(t)),
      JSON.stringify(dc)
    );
    /* hotfix-ui：物品格的圖示不能被角標蓋住（「T6」最高階角標的 class 叫 top，吃到 HUD 頂列的 .top 被撐滿整格，只剩米色方塊）。
       角色頁、戰利品、鍛造（通貨頁＋換一件）各看一次：每格圖有載好、圖中心不在任何角標裡、角標不高過半格（桌機會撐成左邊一長條） */
    const icCover = () =>
      [...document.querySelectorAll('.it')]
        .filter(e => e.offsetParent && e.getBoundingClientRect().width)
        .map(e => {
          const im = e.querySelector('img.ic'),
            r = im && im.getBoundingClientRect(),
            x = r && r.left + r.width / 2,
            y = r && r.top + r.height / 2,
            hit = [...e.querySelectorAll(':scope > i')].find(i => {
              const q = i.getBoundingClientRect();
              return (
                (x >= q.left && x <= q.right && y >= q.top && y <= q.bottom) ||
                q.height > e.getBoundingClientRect().height / 2
              );
            });
          return !im || !im.naturalWidth || hit
            ? e.getAttribute('aria-label') + ':' + (hit ? hit.className : 'no-img')
            : '';
        })
        .filter(Boolean);
    await p.evaluate(() => {
      const it = mkItem(BASES.find(b => b.k === 'helm').id, 40, 2);
      for (const a of it.a) a.T = itemT(it);
      S.eq.helm = it;
      S.inv.items.push(mkItem(it.b, 40, 2));
      for (const a of S.inv.items[S.inv.items.length - 1].a) a.T = itemT(it);
      S.curIt = S.inv.items[S.inv.items.length - 1];
      hudPanels();
    });
    for (const [n, f] of [
      ['角色頁', () => (closePanels(), navGo('char'))],
      ['戰利品', () => (closePanels(), navGo('bag'))],
      ['鍛造（通貨）', () => (closePanels(), act('ctab:cur'))],
      ['鍛造（換一件）', () => PORT() && act('pick')]
    ]) {
      await p.evaluate(f);
      await p.waitForTimeout(500);
      const bad = await p.evaluate(icCover),
        n0 = await p.evaluate(
          () => [...document.querySelectorAll('.it .btr.btop, .it .btr.top')].filter(e => e.offsetParent).length
        );
      ok(
        `hotfix-ui：${n} 物品格有圖示、沒被「T」角標蓋住（最高階角標 ${n0} 個）`,
        (n0 > 0 || n.startsWith('鍛造')) && !bad.length,
        JSON.stringify(bad)
      );
    }
    await p.evaluate(() => {
      act('pickno');
      closePanels();
      S.eq.helm = null;
      S.inv.items = S.inv.items.filter(i => i !== S.curIt);
      S.curIt = null;
    });
    await p.evaluate(() => {
      S.camp.watch = _w0;
      S.eq.belt = null;
    });
    /* hotfix-ui → M2-12 §2：掛機條用大數字（掛機 2 時 05 分、很長的掉落名、倉庫快滿的警示）：每一段不超出條、不互相重疊、條維持 44 高；長名字省略號 */
    const rb = await p.evaluate(async () => {
      closePanels();
      if (G.scene !== 'map') runNode(TRUNK_K[0]);
      const a0 = S.auto,
        t0 = SES.t0;
      S.auto = 1;
      if (!idleOn()) return (S.auto = a0), { skip: 1 };
      SES.t0 = Date.now() - 125 * 60e3;
      (S.log = S.log || []).unshift({ t: Date.now(), n: '完美崇高石・完美崇高石・完美崇高石', c: 'perf' });
      /* battle-hud v1.3.3：收起列 T32–T35（掛機時間 108、追逐保底 108、最近一筆 104、▲ 44） */
      S.hmin = 1;
      bhLayout(1);
      IDLE.msg = '';
      HV.idle = null;
      idleBar(1);
      await new Promise(r => setTimeout(r, 300));
      const bar = $('pidle').getBoundingClientRect(),
        kids = [...document.querySelectorAll('#pidle .i32, #pidle .i33, #pidle .i34, #pidle .ix')],
        bad = [];
      for (const e of kids) {
        const r = e.getBoundingClientRect();
        if (r.right > bar.right + 0.5 || r.left < bar.left - 0.5) bad.push(e.textContent + ' 超出條');
      }
      for (let k = 0; k + 1 < kids.length; k++)
        if (kids[k].getBoundingClientRect().right > kids[k + 1].getBoundingClientRect().left + 0.5)
          bad.push(kids[k].textContent + ' 跟下一段重疊');
      const nm = document.querySelector('#pidle .i34 .nm'),
        txt = kids.map(e => e.textContent),
        ell = !!nm && nm.scrollWidth > nm.clientWidth;
      S.log.shift();
      S.hmin = 0;
      bhLayout(1);
      SES.t0 = t0;
      S.auto = a0;
      return { on: true, h: Math.round(bar.height), ell, bad, txt };
    });
    if (rb.skip) console.log('（這個尺寸觸控模式沒有掛機條，略過 hotfix-ui 掛機條大數字）');
    else {
      await p.screenshot({ path: shot('idle_big') });
      ok(
        'hotfix-ui：收起列大數字（掛機 2 時 05 分、長掉落名）不超出條、不重疊、44 高、長名字省略號',
        /* battle-hud v1.3.3 T32：「掛機 2 時 14 分」（不寫打倒王次數）；≥60 分寫「掛機 1 時 05 分」 */
        rb.on && rb.h === 44 && rb.ell && !rb.bad.length && rb.txt[0] === '掛機 2 時 05 分',
        JSON.stringify(rb)
      );
    }
    await p.evaluate(() => {
      closePanels();
      navGo('bag');
      BAG.sel = S.inv.items.find(i => i.b === 'w_spear_0').id;
      hudPanels();
    });
    await p.waitForTimeout(300);
    const mv = await at('[data-a=selmove]');
    if (mv) await tapAt(mv);
    const af = await p.evaluate(() => [S.eq.weapon.b, $('warn').textContent, dpsOf(0), dpsOf(1), mainDps()]);
    ok(
      'M1-15：換上短矛 HUD 立刻講失效、失效的招 DPS 算 0、總覽主數字 0',
      af[0] === 'w_spear_0' && /失效/.test(af[1]) && af[2] === 0 && af[3] === 0 && af[4] === 0,
      JSON.stringify(af)
    );
    /* M1-24：三個測試入口 */
    const tst = {};
    for (const n of ['dualweap', 'nearDeath', 'midgame']) {
      await p.goto(URL + '?test=' + n + '&' + Date.now());
      await p.waitForTimeout(2500);
      if (n === 'nearDeath')
        await p.waitForFunction(() => G.state === 'dead', null, { timeout: 20000 }).catch(() => {});
      tst[n] = await p.evaluate(() => ({
        slot: SLOT,
        scene: G.scene,
        node: G.node,
        auto: S.auto,
        wpn: S.eq.weapon && S.eq.weapon.b,
        spear: S.inv.items.some(i => i.b === 'w_spear_0'),
        sk1: S.skills[1].k,
        altar: S.camp.altar,
        forge: S.camp.forge,
        lv: S.lv,
        dead: G.state === 'dead',
        up: !!document.querySelector('#over .dup')
      }));
    }
    await p.screenshot({ path: shot('m1_test_mid') });
    ok(
      'M1-24 ?test=dualweap：拿劍、第 2 格幻影斬、倉庫有短矛、在刷',
      tst.dualweap.slot === 'test_dualweap' &&
        tst.dualweap.wpn === 'w_sword1_0' &&
        tst.dualweap.spear &&
        tst.dualweap.sk1 === 'mirage' &&
        tst.dualweap.scene === 'map',
      JSON.stringify(tst.dualweap)
    );
    ok(
      'M1-24 ?test=nearDeath：手動模式、很快倒下、死亡卡有升級鈕',
      tst.nearDeath.auto === 0 && tst.nearDeath.dead && tst.nearDeath.up,
      JSON.stringify(tst.nearDeath)
    );
    ok(
      'M1-24 ?test=midgame：祭壇 6、鍛造台 10、Lv 25、在刷',
      tst.midgame.altar === 6 && tst.midgame.forge === 10 && tst.midgame.lv === 25 && tst.midgame.scene === 'map',
      JSON.stringify(tst.midgame)
    );
    await p.goto(URL + '?p=7&' + Date.now());
    await p.waitForTimeout(1500);
    ok('M1-24：不帶 ?test 時是自己的存檔位', await p.evaluate(() => SLOT === '7' && TEST === ''));
  }
  /* ---------- M1 第二批介面（規格「dpoe M1 直立視覺規格」）：直立先驗 ---------- */
  {
    await p.goto(URL + '?p=21&' + Date.now());
    await p.waitForTimeout(1500);
    await p.evaluate(() => {
      introStop();
      proSkip();
      Object.assign(S.camp, { forge: 1, altar: 2 });
      ST = stats();
    });
    await p.waitForTimeout(800);
    /* BASE-01：跑圖中開技能、營地是半版（自動模式戰鬥照跑） */
    const half = await p.evaluate(() => {
      navGo('skill');
      const a = [NAV.full, $('pskill').getBoundingClientRect().top > 200, !worldPaused()];
      navGo('craft');
      return [...a, NAV.full, $('pcamp').getBoundingClientRect().top > 200 && !!PANEL.camp && !worldPaused()];
    });
    /* M2-12 §3：刷圖中「營地」開的是營地升級抽屜（半版、刷圖不停） */
    ok(
      'BASE-01：跑圖中技能、營地升級抽屜預設半版，自動模式不暫停',
      half.join() === '0,true,true,0,true',
      JSON.stringify(half)
    );
    /* BASE-01.s：半版時同時看得到玩家、目前敵人、生命條（畫布裡的螢幕座標） */
    const bs = await p.evaluate(async () => {
      navGo('skill');
      await new Promise(r => setTimeout(r, 1200));
      const H = cvH(),
        m = aiTarget(),
        sy = y => H / 2 + (y - G.cam.y) * ZOOM,
        sx = x => IW / 2 + (x - G.cam.x) * ZOOM,
        hp = $('bhp').getBoundingClientRect();
      return {
        p: [Math.round(sx(P.x)), Math.round(sy(P.y))],
        m: m ? [Math.round(sx(m.x)), Math.round(sy(m.y))] : null,
        H,
        hp: [Math.round(hp.top), Math.round(hp.bottom)]
      };
    });
    const inb = ([x, y], top = 0) => x >= 0 && x <= W && y >= top && y <= bs.H - 40;
    ok(
      'BASE-01.s：半版時玩家整身、目前敵人、生命條都在戰鬥區裡',
      inb(bs.p, 60) && (!bs.m || inb(bs.m)) && bs.hp[0] >= 0 && bs.hp[1] <= bs.H,
      JSON.stringify(bs)
    );
    await p.screenshot({ path: shot('m1ui_battle_half') });
    /* M1-10 視覺：暫停時「已暫停」在戰鬥區頂列置中、#area 下面、半版時在戰鬥區裡；自動開一般面板不出現 */
    const pz = await p.evaluate(async () => {
      const a = $('paused').hidden;
      SKUI.view = 'skills';
      hudPanels();
      await new Promise(r => setTimeout(r, 200));
      const r = $('paused').getBoundingClientRect(),
        ar = $('area').getBoundingClientRect();
      const o = [
        a,
        !$('paused').hidden,
        Math.round(r.left + r.width / 2 - innerWidth / 2),
        r.top >= ar.bottom,
        r.bottom <= cvH(),
        Math.round(r.height)
      ];
      skHome();
      hudPanels();
      return o;
    });
    ok(
      'M1-10 視覺：「已暫停」只在暫停時出現、頂列置中、在 #area 下面、在戰鬥區裡、高 22',
      pz[0] && pz[1] && Math.abs(pz[2]) <= 2 && pz[3] && pz[4] && pz[5] === 22,
      JSON.stringify(pz)
    );
    /* M1-SK.1：總覽每列有「換」44×44、頻率「Lv 1 · 每秒…下／…秒一次」、下一個解鎖只一列 */
    const sk = await p.evaluate(() => {
      const sw = document.querySelector('#pskill .skr-sw'),
        r = sw && sw.getBoundingClientRect();
      return [
        !!r && r.width >= 44 && r.height >= 44,
        (document.querySelector('#pskill .skr .fq') || {}).textContent || '',
        document.querySelectorAll('#pskill .skr.nxu').length,
        (document.querySelector('#pskill .skr.nxu') || {}).textContent || ''
      ];
    });
    ok(
      'M1-SK.1／M1-16b／M1-07b：每列「換」44×44、名稱下一行寫頻率、技能面板的下一個解鎖只一列',
      sk[0] &&
        /^Lv 1 · (每秒 [\d.]+ 下|[\d.]+ 秒一次)$/.test(sk[1]) &&
        sk[2] === 1 &&
        sk[3] === '升祭壇到 Lv3，開第 3 格技能。',
      JSON.stringify(sk)
    );
    /* M1-PK.1：從「換」進來預選現在這招、底部鈕停用；點別的列＝改選、底部「換成｛名｝」 */
    const pk = await p.evaluate(async () => {
      document.querySelector('#pskill .skr-sw').click();
      await new Promise(r => setTimeout(r, 150));
      const a = [SKUI.view, SKUI.pick, document.querySelector('#pskill .sk-bar .pri').disabled];
      SKUI.f.skills = '全部';
      hudPanels();
      const other = [...document.querySelectorAll('#pskill .sk-list .sk-row:not(.dim)')].find(
        b => b.dataset.sk !== 'pick:' + S.skills[0].k
      );
      other.click();
      await new Promise(r => setTimeout(r, 150));
      const b = document.querySelector('#pskill .sk-bar .pri');
      skHome();
      hudPanels();
      return [...a, b.disabled, b.textContent];
    });
    ok(
      'M1-PK.1：預選現在這招、底部停用；點別列後底部「換成｛名｝」可以按',
      pk[0] === 'skills' && pk[1] === 'slash' && pk[2] && !pk[3] && /^換成/.test(pk[4]),
      JSON.stringify(pk)
    );
    /* M1-17 視覺：手動模式倒下，升級鈕＝主鈕在最上面、再試一次改次要、回營地文字鏈 */
    const dc = await p.evaluate(async () => {
      closePanels();
      S.auto = 0;
      S.mat.soul = 1e5;
      matAdd('wood', 0, 1e4);
      P.hp = 0;
      die();
      await new Promise(r => setTimeout(r, 200));
      const bs = [...document.querySelectorAll('#over .pbtns .btn')];
      const o = bs.map(b => b.className.replace('btn', '').trim() + ':' + Math.round(b.getBoundingClientRect().height));
      act('again');
      S.auto = 1;
      return o;
    });
    /* M2-40 定案（M2-12 第一段）：拿掉回藏身處（回營地），死亡卡只剩升級鈕（主鈕、最上）＋再試一次（次要） */
    ok(
      'M1-17 視覺：死亡卡升級鈕是主鈕在最上、再試一次次要、沒有回藏身處，都 ≥48',
      dc.length === 2 &&
        /^pri wide dup:/.test(dc[0]) &&
        +dc[0].split(':')[1] >= 48 &&
        /^:/.test(dc[1]) &&
        +dc[1].split(':')[1] >= 48,
      JSON.stringify(dc)
    );
    /* M1-11：護符滿格，點倉庫的護符＝「要換掉哪一格」，點一格換上並關閉 */
    const ch = await p.evaluate(async () => {
      S.eq.belt = mkItem(BASES.find(b => b.k === 'belt').id, 20, 0);
      S.eq.belt.cs = 1;
      S.charms[0] = mkCharm(Object.keys(CHARMS)[0]);
      const it = mkCharm(Object.keys(CHARMS)[1]);
      invPut(S.inv, it);
      ST = stats();
      navGo('bag');
      quickMove('inv', it);
      await new Promise(r => setTimeout(r, 150));
      const rows = document.querySelectorAll('#pinv .chsr').length,
        t = (document.querySelector('#pinv .ph b') || {}).textContent;
      document.querySelector('#pinv .chsr').click();
      await new Promise(r => setTimeout(r, 150));
      return [rows, t, S.charms[0] === it, !document.querySelector('#pinv .chsr')];
    });
    ok(
      'M1-11：護符滿格跳「要換掉哪一格」、點一格就換上並關閉',
      ch[0] === 1 && ch[1] === '要換掉哪一格' && ch[2] && ch[3],
      JSON.stringify(ch)
    );
    /* M1-12：角色頁護符列：390 不必捲就看得到（底下留 16、不被分頁列裁）、375 有捲動提示 */
    const cr = await p.evaluate(async () => {
      closePanels();
      navGo('char');
      /* 面板滑進來與捲動提示要幾格才定（提示在 hudTick 裡每 100 毫秒更新，機器忙時畫格慢）：
         每次取樣先等 100 毫秒再等兩個畫格，連三次一樣（最多 3 秒）才判定 */
      const at = () => {
        const c = document.querySelector('#pinv .doll2x').getBoundingClientRect(),
          n = $('pnav').getBoundingClientRect(),
          h = document.querySelector('#pinv .schint');
        return JSON.stringify([
          Math.round(c.bottom),
          Math.round(n.top),
          !!h && !h.hidden,
          parseFloat(getComputedStyle(document.querySelector('#pinv .eqs .nm')).fontSize)
        ]);
      };
      const L = [];
      for (let i = 0; i < 20 && !(L.length >= 3 && L.slice(-3).every(x => x === L[L.length - 1])); i++) {
        await new Promise(r => setTimeout(r, 100));
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        L.push(at());
      }
      const b = JSON.parse(L[L.length - 1]);
      return b;
    });
    ok(
      H >= 800
        ? 'M1-12：390 護符列不必捲就完整露出（含 16 px 底距）、沒有捲動提示、標籤 13 px'
        : 'M1-12：短屏護符列露出（B1 D2-06 角色頁全版）就沒有捲動提示、沒露出就有提示、標籤 13 px',
      /* B1 D2-06：矮螢幕角色頁改全版，護符列可能整列露出；照實際位置判：露出（含 16 底距）＝不出提示，沒露出＝要有提示 */
      (H >= 800 ? cr[0] + 16 <= cr[1] && !cr[2] : cr[0] + 16 <= cr[1] ? !cr[2] : cr[2]) && cr[3] === 13,
      JSON.stringify(cr)
    );
    await p.screenshot({ path: shot('m1ui_char') });
    /* M1-CP：營地首屏有下一個解鎖一列、「還有 N 座」、卡頭箭頭；徽章「n」（M2-38 只寫數字） */
    const cp = await p.evaluate(() => {
      closePanels();
      Object.assign(S.camp, { forge: 1 });
      navGo('craft');
      /* M2-12 §3：刷圖中「營地」先開營地升級抽屜，營地總覽從抽屜的「回營地看」進（藏身處照舊直接開總覽） */
      if (PANEL.camp) document.querySelector('#pcamp [data-cd=look]').click();
      CRAFT.tab = 'camp';
      hudPanels();
      return [
        document.querySelectorAll('#pcraft .cmnxu').length,
        (document.querySelector('#pcraft .cmnxu') || {}).textContent,
        !!document.querySelector('#pcraft .cmmore'),
        document.querySelectorAll('#pcraft .cch > .ico:last-child').length > 0
      ];
    });
    ok(
      'M1-CP／M1-07b：營地首屏一列下一個解鎖「升鍛造台到 Lv 3 開獵場」、還有幾座、卡頭箭頭',
      cp[0] === 1 && cp[1] === '升鍛造台到 Lv 3 開獵場' && cp[2] && cp[3],
      JSON.stringify(cp)
    );
    await p.screenshot({ path: shot('m1ui_camp') });
    await p.evaluate(() => closePanels());
  }
  /* ---------- M2-08：設定的暗幕、掛機卡在死亡卡底下、天賦樹搜尋 N／總數 ---------- */
  const m8 = await p.evaluate(async () => {
    Object.assign(S.camp, { forge: 20, watch: 26, scout: 4, house: 10, altar: 11, store: 5 });
    if (TREE.open) treeClose();
    closePanels();
    if (G.scene !== 'map') runNode(TRUNK_K[0]);
    openPanel('set');
    const sc = getComputedStyle($('scrim')),
      a = [PORT() ? sc.display === 'none' : sc.display !== 'none' && +sc.zIndex < +getComputedStyle($('pset')).zIndex];
    $('scrim').click();
    a.push(!PANEL.set && $('scrim').hidden);
    S.auto = 1;
    idleBar(1);
    const z = getComputedStyle($('pidle')).zIndex;
    a.push(z === 'auto' || +z < +getComputedStyle($('over')).zIndex);
    G.ask = 'camp';
    hudState();
    idleBar(1);
    a.push($('pidle').hidden && !$('over').hidden);
    G.ask = null;
    hudState();
    treeOpen();
    const f = $('tfind');
    f.value = '力量';
    f.dispatchEvent(new Event('input', { bubbles: true }));
    const t1 = $('tfound').textContent,
      n = TREE.hits.length;
    a.push(t1 === `1／${n}` && n > 1 && document.querySelectorAll('#tsvg .nd.cur').length === 1);
    $('tfound').click();
    a.push(
      $('tfound').textContent === `2／${n}` &&
        (document.querySelector('#tsvg .nd.cur') || {}).dataset?.n === String(TREE.hits[1])
    );
    f.value = '沒有這種天賦';
    f.dispatchEvent(new Event('input', { bubbles: true }));
    a.push($('tfound').textContent === '0／0' && !document.querySelector('#tsvg .nd.cur'));
    treeClose();
    return a;
  });
  ok(
    'M2-08：設定有暗幕（直立半版不加）、點暗幕關設定；掛機卡層級低於 #over、確認卡出現時收起；天賦搜尋寫 1／N、點一下到 2／N、找不到 0／0',
    m8.every(Boolean),
    JSON.stringify(m8)
  );
  /* ---------- D2-07（B2 起每批都跑）：熱區量所有可點的東西——button、[role=button]、a、分頁、分段、裝備格、倉庫格、節點、滑桿 ----------
     觸控 ≥44×44、只用滑鼠 ≥32×32；不互相包含的兩個之間間距 ≥8、不重疊；輸出不過的元素清單（PF-D2-6） */
  const HIT_Q =
    'button, [role=button], a[href], [role=tab], .tabs > *, .fseg > *, .eqs, .it, #tsvg .nd, input[type=range]';
  /* 分段、分頁列（M2-33-1 §6、§7：格子相連）裡相鄰兩格不量間距（假設；規格寫的是格子連在一起） */
  const SEG_Q = '#pnav, #dnav, [role=tablist], .tabs, .ftabs, .fseg, .gkind, .modesw, .sk-seg, .seg2';
  /* 已知清單（B2-FIX）：不在 B2 範圍、留給後面批次的熱區，逐條寫元素與理由；其餘元素照樣嚴格量。
     a＝元素；有 b 時只放過 a 跟 b 這一對（尺寸照量），沒有 b 時 a 的尺寸與所有配對都放過。放過的會印成 ⚠ 讓人看得到 */
  const HIT_KNOWN = [
    {
      a: '#pidle .ib, #pidle .ix',
      b: '#pidle .ib, #pidle .ix, #pnav > *, .panel *',
      why: '直立掛機條（收起列與展開鈕）貼著底部分頁列、兩鈕相連，捲動的面板內容會從它下面經過：掛機條與分頁列屬 B1（M2-12 第一段 §1、§2）'
    },
    { a: '#phand', why: '直立面板把手 24 高、貼著標題列的 × 與分頁：抽屜外框屬 B1（D2-06、M2-12 第一段 §1）' },
    {
      a: 'body.port #pinv .doll2 .eqs, body.port #pinv .doll2 .eqs .it',
      b: '#pinv .doll2 *',
      why: '直立半版人形欄格距 4（M1-12：半版 380 高要不捲就看到護符列，放大格距會把護符列擠出去）：裝備格那段屬 B5（D2-06）'
    },
    {
      a: 'body.port .panel *',
      b: '#pnav > *',
      why: '合併 B1 後開面板時掛機條收起，直立面板直接貼分頁列，捲動中的面板內容被分頁列上緣裁切（這裡量的是沒裁切的外框）：分頁列與抽屜外框屬 B1（M2-12 第一段 §1）'
    },
    {
      a: '#bh *, #pidle *, #pnav > *',
      b: '#bh *, #pidle *, #pnav > *',
      why: 'battle-hud v1.3.3 元件表定的間距（通貨 4、技能格 6、藥劑熱區上下相接、▼ 熱區與藥劑熱區對邊相接、下方按鈕間距 8／貼分頁上緣 4）：表優先（battle-hud.md §4-5），每個框由 tools/bh_shots.js 逐項量 ±2'
    }
  ];
  const hitSweep = async (name, setup, arg) => {
    await p.evaluate(setup, arg);
    await p.waitForTimeout(400);
    const r = await p.evaluate(
      ([q, min, SEG_Q, KN]) => {
        const vis = e => {
          const b = e.getBoundingClientRect(),
            cs = getComputedStyle(e);
          if (!b.width || !b.height || cs.visibility === 'hidden' || +cs.opacity === 0) return null;
          if (b.right <= 0 || b.bottom <= 0 || b.left >= innerWidth || b.top >= innerHeight) return null;
          /* 被別的層蓋住（暗幕、面板）點不到的不算 */
          const x = Math.min(Math.max(b.left + b.width / 2, 0), innerWidth - 1),
            y = Math.min(Math.max(b.top + b.height / 2, 0), innerHeight - 1),
            t = document.elementFromPoint(x, y);
          return t && (e.contains(t) || t.contains(e)) ? b : null;
        };
        const nm = e =>
          (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.classList[0] ? '.' + e.classList[0] : '')) +
          '「' +
          (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 8) +
          '」';
        const L = [...document.querySelectorAll(q)].map(e => [e, vis(e)]).filter(x => x[1]);
        const bad = [],
          known = [];
        /* 已知清單：回傳第幾條（1 起），不在清單回 0 */
        const kn = (e1, e2) => {
          const i = KN.findIndex(k =>
            e2
              ? (e1.matches(k.a) && (!k.b || e2.matches(k.b))) || (e2.matches(k.a) && (!k.b || e1.matches(k.b)))
              : !k.b && e1.matches(k.a)
          );
          return i + 1;
        };
        const put = (t, i) => (i ? known.push(`K${i} ${t}`) : bad.push(t));
        for (const [e, b] of L)
          if (b.width < min - 0.5 || b.height < min - 0.5)
            put(`${nm(e)} ${Math.round(b.width)}×${Math.round(b.height)}`, kn(e));
        for (let i = 0; i < L.length; i++)
          for (let j = i + 1; j < L.length; j++) {
            const [e1, a] = L[i],
              [e2, c] = L[j];
            if (e1.contains(e2) || e2.contains(e1)) continue;
            if (e1.parentElement === e2.parentElement && e1.parentElement.matches(SEG_Q)) continue;
            const gx = Math.max(c.left - a.right, a.left - c.right),
              gy = Math.max(c.top - a.bottom, a.top - c.bottom),
              g = Math.max(gx, gy);
            if (g < 8 - 0.5) put(`${nm(e1)}↔${nm(e2)} ${g < 0 ? '重疊' : '間距 ' + Math.round(g)}`, kn(e1, e2));
          }
        return { n: L.length, bad, known };
      },
      [HIT_Q, (await p.evaluate(() => document.body.classList.contains('touch'))) ? 44 : 32, SEG_Q, HIT_KNOWN]
    );
    if (r.known.length) console.log(`⚠ D2-07 已知清單（${name}）：${r.known.length} 筆：${r.known.join('、')}`);
    ok(
      `D2-07 熱區（${name}）：${r.n} 個可點的東西 ≥44／32、間距 ≥8、不重疊`,
      !r.bad.length,
      r.bad.length + ' 筆：' + r.bad.join('、')
    );
  };
  await hitSweep('戰場', () => (closePanels(), treeClose(), holdClose()));
  for (const k of ['inv', 'skill', 'craft', 'more']) await hitSweep('面板 ' + k, k => (closePanels(), openPanel(k)), k);
  /* B2 長按確認卡：卡開著時只量卡上的東西；「長按{動作}」與「取消」≥56 高 */
  await hitSweep('長按確認卡', () => {
    closePanels();
    const b = document.createElement('button');
    b.dataset.x = 'hold-test';
    document.body.append(b);
    holdAsk(b, '分解', '分解 3 件');
  });
  ok(
    'B2 長按確認卡：「長按分解」次要＋--bad 字、「取消」主鈕在右、兩顆 ≥56 高、⚠ 不能復原、焦點在取消',
    await p.evaluate(() => {
      const c = $('hask'),
        [g, n] = [c.querySelector('.hgo'), c.querySelector('[data-h="no"]')],
        [a, b] = [g, n].map(e => e.getBoundingClientRect()),
        bad = getComputedStyle(document.documentElement).getPropertyValue('--bad').trim();
      const r = [
        g.textContent === '長按分解',
        n.classList.contains('pri') && n.textContent === '取消',
        a.height >= 56 && b.height >= 56,
        b.left >= a.right || b.top >= a.bottom,
        /⚠ 不能復原/.test(c.textContent),
        document.activeElement === n,
        getComputedStyle(g).color === getComputedStyle(c.querySelector('.hno')).color && bad === '#ff9bba'
      ];
      holdClose();
      return r.every(Boolean);
    })
  );
  /* 2026-11-21 取消手機橫向：把手機橫過來（viewport 設成 844×390，反向檢查）也還是直立操作、沒有方向提示；舊存檔的 l 讀進來是 p */
  {
    const land = () =>
      p.evaluate(() =>
        [
          TOUCH.on,
          PORT(),
          document.body.classList.contains('port'),
          !$('rot'),
          S.orient,
          !!document.querySelector('#pnav')
        ].join()
      );
    await p.setViewportSize({ width: 844, height: 390 });
    await p.waitForTimeout(400);
    ok(
      '手機橫過來（844×390）仍是直立操作、沒有方向提示、S.orient p',
      (await land()) === 'true,true,true,true,p,true',
      await land()
    );
    await p.evaluate(() => {
      S.orient = 'l';
      save();
    });
    await p.reload();
    await p.waitForTimeout(1500);
    ok(
      '舊存檔 orient l：重新整理後是 p、存回 p、仍是直立操作',
      (await land()) === 'true,true,true,true,p,true' &&
        (await p.evaluate(() => JSON.parse(localStorage.getItem(KEY + SLOT)).orient === 'p')),
      await land()
    );
    await p.setViewportSize({ width: W, height: H });
  }
  if (errs.length) fail++;
  console.log(errs.length ? '❌ 頁面錯誤 ' + errs.join(' / ') : '✅ 沒有頁面錯誤');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
