const { chromium } = require('playwright');
/* 手機操作測試（docs/企劃書.md 第 9 節「操作模式」）：Playwright 模擬觸控螢幕、送真的觸控事件。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/touch_check.js [寬 844] [高 390] [網址]
   截圖存在系統暫存資料夾（touch_*.png）；有 ❌ 時結束碼 1 */
const os = require('os'),
  path = require('path');
const W = +process.argv[2] || 844,
  H = +process.argv[3] || 390,
  URL = process.argv[4] || 'http://localhost:8000/',
  tag = W + 'x' + H,
  shot = n => path.join(os.tmpdir(), `touch_${tag}_${n}.png`);
let fail = 0;
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    hasTouch: true,
    isMobile: true,
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
  });
  const cdp = await ctx.newCDPSession(p);
  const touch = async (type, pts) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
  const ok = (n, v, d = '') => {
    if (!v) fail++;
    console.log((v ? '✅ ' : '❌ ') + n + (d ? ' ' + d : ''));
  };
  ok('進來就是觸控模式', await p.evaluate(() => document.body.classList.contains('touch')));
  /* 直的尺寸測直立操作（龍絆式手勢），橫的尺寸測橫向操作 */
  const PORTM = H > W;
  ok('新存檔預設直立', await p.evaluate(() => S.orient === 'p'));
  await p.evaluate(port => {
    S.orient = port ? 'p' : 'l';
    applyOrient();
  }, PORTM);
  await p.waitForTimeout(200);
  ok(
    '沒有出現「把手機轉過來」',
    await p.evaluate(() => getComputedStyle($('rot')).display === 'none'),
    PORTM ? '直立' : '橫向'
  );
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
    sp = PORTM ? [W / 2 - 60, H * 0.45] : [150, H - 90];
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
  /* 橫向：按住普攻鍵；直立：畫面上按住不動 */
  const r0 = PORTM
    ? [W / 2, H * 0.3]
    : await p.evaluate(() => {
        const r = document.querySelector('.sk[data-k=s0]').getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      });
  await touch('touchStart', [r0]);
  await p.waitForTimeout(900);
  ok(
    PORTM ? '畫面上按住不動＝連續普攻最近的怪' : '普攻按住會自動打最近的怪',
    await p.evaluate(() => _m.hp < _hp || !G.mobs.includes(_m))
  );
  const face = await p.evaluate(() => Math.cos(P.face - Math.atan2(_m.y - P.y, _m.x - P.x)));
  ok('朝向怪物', face > 0.7, face.toFixed(2));
  await touch('touchEnd', []);
  /* 技能鍵拖曳：畫瞄準線，拖回按鈕取消 */
  const r1 = await p.evaluate(() => {
    const r = document.querySelector('.sk[data-k=s1]').getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  const has1 = await p.evaluate(() => !!slotCfg(1));
  await p.evaluate(() => {
    P.mp = ST.mp;
    P.cds = {};
    window._mp = P.mp;
  });
  await touch('touchStart', [r1]);
  await touch('touchMove', [[r1[0] - 60, r1[1] - 40]]);
  await p.waitForTimeout(150);
  await p.screenshot({ path: shot('aim') });
  ok('拖曳時有瞄準線', await p.evaluate(() => !!(TOUCH.sk && TOUCH.sk.drag)));
  await touch('touchMove', [r1]);
  await p.waitForTimeout(50);
  await touch('touchEnd', []);
  await p.waitForTimeout(100);
  ok('拖回按鈕上＝取消（沒放）', await p.evaluate(() => !(P.cds.s1 > 0) && P.mp === _mp));
  await p.evaluate(() => {
    P.act = null;
    P.mp = ST.mp;
    window._mp = P.mp;
  });
  await touch('touchStart', [r1]);
  await touch('touchEnd', []);
  await p.waitForTimeout(30);
  ok('點一下技能＝施放', await p.evaluate(() => P.mp < _mp || P.cds.s1 > 0 || !!P.act));
  /* 翻滾：橫向按翻滾鍵；直立快速一撥 */
  if (PORTM) {
    await p.evaluate(() => {
      P.cds.roll = 0;
      P.act = null;
      P.roll = null;
    });
    await touch('touchStart', [[W / 2, H * 0.45]]);
    await touch('touchMove', [[W / 2 + 30, H * 0.45]]);
    await touch('touchMove', [[W / 2 + 80, H * 0.45]]);
    await touch('touchEnd', []);
    ok('快速一撥＝翻滾（往撥的方向）', await p.evaluate(() => (!!P.roll && P.roll.dx > 0.7) || P.cds.roll > 0));
    /* 點一下＝普攻一次 */
    await p.evaluate(() => {
      P.act = null;
      P.roll = null;
      window._hp = _m.hp;
    });
    await p.waitForTimeout(400);
    await touch('touchStart', [[W / 2, H * 0.3]]);
    await touch('touchEnd', []);
    await p.waitForTimeout(500);
    ok('點一下＝普攻', await p.evaluate(() => _m.hp < _hp || !G.mobs.includes(_m) || !!P.act));
  } else {
    const rr = await p.evaluate(() => {
      P.cds.roll = 0;
      const r = document.querySelector('.sk[data-k=roll]').getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
    await touch('touchStart', [rr]);
    await touch('touchEnd', []);
    ok('翻滾鍵', await p.evaluate(() => !!P.roll || P.cds.roll > 0));
  }
  /* 按鈕都在畫面內、不重疊、夠大 */
  const lay = await p.evaluate(() => {
    const els = [...document.querySelectorAll('#bar .sk,.tmenu button')]
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
  /* 自動／手動鈕：按得到（真的觸控）、切換、顯示文字跟著 */
  const ab = await p.evaluate(() => {
    const r = document.querySelector('.tmenu .autob').getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2, r.width, r.height];
  });
  await touch('touchStart', [[ab[0], ab[1]]]);
  await touch('touchEnd', []);
  await p.waitForTimeout(150);
  const ab1 = await p.evaluate(() => [S.auto, document.querySelector('.tmenu .autob').textContent]);
  ok(
    '自動鈕：點一下切成自動（≥44px）',
    ab1[0] === 1 && ab1[1] === '自動' && ab[2] >= 44 && ab[3] >= 44,
    JSON.stringify([ab1, ab])
  );
  await touch('touchStart', [[ab[0], ab[1]]]);
  await touch('touchEnd', []);
  await p.waitForTimeout(150);
  ok(
    '自動鈕：再點一下切回手動',
    await p.evaluate(() => S.auto === 0 && document.querySelector('.tmenu .autob').textContent === '手動')
  );
  await p.screenshot({ path: shot('map') });
  /* 回藏身處，開裝備與清單倉庫（0.4.0） */
  await p.evaluate(() => {
    enterHideout();
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
  /* 點道具：說明＋動作 */
  const it = await p.evaluate(() => {
    const e = document.querySelector('#pinv .bag .it');
    const r = e.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  await touch('touchStart', [it]);
  await touch('touchEnd', []);
  await p.waitForTimeout(200);
  ok(
    '點道具出現說明與動作按鈕',
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
          .map(n => n.closest('.it[data-id], .nd'))
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
    const [v, d] = await tipOK(it);
    ok('道具說明框不蓋住道具、不出畫面', v, d);
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
  if (!PORTM) {
    /* 拖曳（0.4.0 清單倉庫）：把倉庫裡的一件拖到「拖到這裡賣掉」，賣掉、放開後沒有殘影 */
    const dg = await p.evaluate(() => {
      const vis = e => {
          const r = e.getBoundingClientRect();
          return r.width && e.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        },
        e = [...document.querySelectorAll('.bag .it[data-id]')].find(vis),
        z = document.querySelector('#pinv .sell');
      z.scrollIntoView({ block: 'nearest' });
      const r = e.getBoundingClientRect(),
        R = z.getBoundingClientRect();
      return {
        id: +e.dataset.id,
        from: [r.left + 8, r.top + 8],
        to: [R.left + R.width / 2, R.top + R.height / 2],
        g: S.gold
      };
    });
    await touch('touchStart', [dg.from]);
    for (let i = 1; i <= 8; i++)
      await touch('touchMove', [
        [dg.from[0] + ((dg.to[0] - dg.from[0]) * i) / 8, dg.from[1] + ((dg.to[1] - dg.from[1]) * i) / 8]
      ]);
    ok('拖曳中有跟手的圖示', await p.evaluate(() => !!document.querySelector('.ghost')));
    await touch('touchEnd', []);
    await p.waitForTimeout(200);
    const dr = await p.evaluate(
      d => [
        !S.inv.items.some(i => i.id === d.id),
        S.gold > d.g,
        document.querySelectorAll('.ghost, .it.lift').length,
        !!DR
      ],
      dg
    );
    ok('拖到賣出區：賣掉、拿到金幣', dr[0] && dr[1], JSON.stringify(dr));
    ok('放開後沒有殘影', !dr[2] && !dr[3], `殘留 ${dr[2]} 個、DR ${dr[3]}`);
  } else {
    /* ---------- 直立重排（0.4.4）：上半戰鬥、下半面板、底部分頁 ---------- */
    const tap = async q => {
      const c = await p.evaluate(q => {
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
    ok(
      '底部分頁列：六格（0.4.7 加天賦）、每格 ≥44px、在畫面內',
      nav.length === 6 && nav.every(n => n[1] >= 44 && n[2] >= 44 && n[3] <= H),
      JSON.stringify(nav)
    );
    ok(
      '右上只剩自動鈕（倉庫、選單搬到分頁列）',
      await p.evaluate(
        () => [...document.querySelectorAll('.tmenu button')].filter(e => e.getClientRects().length).length === 1
      )
    );
    await tap('#pnav [data-tm="nav:bag"]');
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
    const sw = await p.evaluate(() => {
      const r = document.querySelectorAll('#pinv .bag .it')[10].getBoundingClientRect();
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
    /* 點道具 →「做裝」→ 放進通貨頁中間 */
    await tap('#pinv .bag .it:not(:has(.bk))');
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
      '按「做裝」：開做裝頁、裝備放在中間',
      await p.evaluate(() => !!S.curIt && !$('pstash').hidden && $('pinv').hidden && navOn() === 'craft')
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
    await tap('#pnav [data-tm="nav:craft"]');
    ok(
      '點亮著的分頁＝收起來、畫布回到整個畫面',
      await p.evaluate(
        () => !anyPanel() && CV.clientHeight === innerHeight && !document.body.classList.contains('sheet')
      )
    );
    /* ---------- 0.4.6：角色數值分組、角色頁點一格列出可以換的、說明框先寫換上去的差別、篩選可以選部位 ---------- */
    const tapIn = async q => {
      await p.evaluate(q => {
        const e = document.querySelector(q);
        if (e) e.scrollIntoView({ block: 'nearest', inline: 'center' });
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
      '角色數值分四組、每一項有名稱與數字',
      stt[0] === '攻擊,防禦,抗性,能力值' && stt[1] && stt[2],
      JSON.stringify(stt)
    );
    await tapIn('#pinv .doll [data-eq="boots"]');
    const sp = await p.evaluate(() => {
      const el = document.querySelector('#pinv .slotp'),
        its = el ? [...el.querySelectorAll('.bag .it')] : [];
      return [
        !!el && el.querySelector('.ph2').textContent,
        its.length,
        its.every(e => baseOf(findItem('inv', e.dataset.id)).k === 'boots'),
        document.querySelector('#pinv .doll [data-eq="boots"]').classList.contains('sel'),
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
    await tapIn('#pinv .doll [data-eq="chest"]');
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
    await tapIn('#pinv [data-a="bagfl:up"]');
    ok(
      '再加「可能升級」：條件疊加（鞋子而且可能升級）',
      await p.evaluate(
        () =>
          BAG.k === 'boots' &&
          BAG.fl.up === 1 &&
          [...document.querySelectorAll('#pinv .bag .it')].every(e => {
            const it = findItem('inv', e.dataset.id);
            return baseOf(it).k === 'boots' && itemUp(it);
          })
      )
    );
    await p.evaluate(() => {
      Object.assign(BAG, { f: 'all', k: '', fl: {} });
      closePanels();
    });
    /* 更多、地點 */
    await tap('#pnav [data-tm="nav:more"]');
    const mr = await p.evaluate(() =>
      [...document.querySelectorAll('#pmore .mrow')].map(e => Math.round(e.getBoundingClientRect().height))
    );
    ok('更多：每一格 ≥44px', mr.length >= 8 && mr.every(h => h >= 44), mr.join());
    await tap('#pmore [data-tm="nav:node"]');
    ok(
      '地點：節點清單、選到的那一列展開「在這裡刷」',
      await p.evaluate(
        () =>
          !$('pnode').hidden &&
          document.querySelectorAll('#pnode .ndr').length === wList(S).length &&
          !!document.querySelector('#pnode li.on .wm-body [data-a=open]')
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
    await tap('#area');
    ok('點左上的地點列＝開地點清單', await p.evaluate(() => !$('pnode').hidden));
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
      enterHideout();
      openPanel('inv');
    });
    await p.waitForTimeout(300);
  }
  /* 天賦樹（0.4.7 重做手機的操作：看全圖點一下只放大、說明卡在底部、沿路點亮、小總覽、中間是昇華入口） */
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
    const far = await ndAt('#tg .nd.can');
    await tapXY(far[1], far[2], 700);
    ok(
      '看全圖時點一下只放大過去，不選點、不花點數',
      await p.evaluate(() => TREE.z >= 1.2 && !TREE.sel && S.pt.length === PT_START.length),
      await p.evaluate(() => TREE.z.toFixed(2))
    );
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
    /* 沒有連著的點：卡片算出最短的路，一顆按鈕沿路點亮 */
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
  if (PORTM) {
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
      '「換昇華」：15 個昇華一列一個、寫著在做什麼、每列 ≥44px',
      await p.evaluate(() => {
        const L = [...document.querySelectorAll('#pasc .axl-r')];
        return (
          L.length === Object.keys(ASC).length &&
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
    await tapSel('#pnav [data-tm="nav:bag"]');
    ok('天賦樹開著時按別的分頁直接切過去', await p.evaluate(() => !TREE.open && PANEL.inv && $('ptree').hidden));
    await p.evaluate(() => navGo('tree'));
    await p.waitForTimeout(300);
  }
  /* 手機橫向：要決定的東西要在第一屏（背包格、地圖詞、開門鈕）；0.2.30 audit 的發現 */
  if (W > H) {
    const fold = await p.evaluate(() => {
      treeClose();
      closePanels();
      openPanel('inv');
      const g = document.querySelector('#pinv .bag').getBoundingClientRect();
      closePanels();
      openPanel('device');
      const m = document.querySelector('#pdev .mmods').getBoundingClientRect(),
        k = document.querySelector('#pdev .btn.pri').getBoundingClientRect();
      closePanels();
      return [g.top, m.top, k.bottom, innerHeight].map(Math.round);
    });
    ok(
      '橫向：背包格、地圖詞、開門鈕都在第一屏',
      fold[0] < fold[3] - 100 && fold[1] < fold[3] - 60 && fold[2] <= fold[3],
      fold.join()
    );
  }
  /* 技能寶石、昇華石碑：面板不出畫面、主要動作看得到（等面板滑入的動畫跑完才量） */
  {
    const inView = async (open, ...sel) => {
      await p.evaluate(open);
      await p.waitForTimeout(260);
      return p.evaluate(
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
        '.slots',
        '.ring .ctr',
        '.sk-info .nums'
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
        PORTM ? '.axl-r' : '.ax-tab',
        PORTM ? '.axl-h' : '.ax-pick'
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
      /* 0.2.73：按下「重置」變成「再按一次」的 2.5 秒內，× 與按鈕都在畫面內，點數那行不蓋到標題、按鈕與 × */
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
        '.ax-reset.arm',
        '#pasc .ph .x'
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
      ],
      /* 世界地圖：世界區的節點（五顆星級＋在這裡刷）最擠 */
      await inView(
        () => {
          closePanels();
          S.world.stage = STORY.length;
          S.world.open = 1;
          S.world.done = TRUNK_K.slice(0, 10);
          S.world.at = TRUNK_K[9];
          openPanel('device');
          WM.anim = null;
          wmSel(TRUNK_K[9]);
        },
        '#wms',
        '.wm-rift',
        '.wm-tools',
        '.wm-stars',
        '#pdev .btn.pri'
      )
    ];
    ok('技能、昇華石碑、世界地圖：不出畫面、主要動作看得到', L.flat().every(Boolean), JSON.stringify(L));
    ok(
      '世界地圖：按鈕至少 44px、沒有橫向溢出',
      await p.evaluate(() => {
        const h = [...document.querySelectorAll('#pdev .wm-tools .btn, #pdev .wm-acts .btn, #pdev .wm-stars .mc2')].map(
          b => b.getBoundingClientRect().height
        );
        return (
          h.every(x => x >= 44) &&
          document.getElementById('wms').scrollWidth <= document.getElementById('wms').clientWidth + 1
        );
      })
    );
    await p.evaluate(() => closePanels());
  }
  if (errs.length) fail++;
  console.log(errs.length ? '❌ 頁面錯誤 ' + errs.join(' / ') : '✅ 沒有頁面錯誤');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
