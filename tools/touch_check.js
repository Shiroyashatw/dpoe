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
    ok('拖到分解區：分解、拿到金幣', dr[0] && dr[1], JSON.stringify(dr));
    ok('放開後沒有殘影', !dr[2] && !dr[3], `殘留 ${dr[2]} 個、DR ${dr[3]}`);
    /* 0.5.0 打造（橫向）：鍛造台的第一頁、按鈕在畫面內、翻牌的三顆鈕在畫面內 */
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
      fmenuOpen('craft');
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
      '橫向：營地全 0 分頁只有「營地」「打造」、沒有填／淬鍊／災魘、打造鈕 ≥44px 在畫面內、面板不超出畫面、沒有橫向溢出',
      mkL[0] === '營地,打造' && !/填|淬鍊/.test(mkL[0]) && !mkL[1] && mkL[2] >= 44 && mkL[3] && mkL[4] && mkL[5],
      JSON.stringify(mkL)
    );
    await tapL('#pcraft [data-fg=go]');
    await p.waitForTimeout(500);
    const rvL = await p.evaluate(() => {
      const b = [...document.querySelectorAll('#preveal .acts .btn')];
      return [
        PANEL.ident,
        b.length,
        b.every(x => x.getBoundingClientRect().bottom <= innerHeight + 0.5 && x.getBoundingClientRect().height >= 44),
        S.inv.items.length
      ];
    });
    ok('橫向：翻牌開著、三顆鈕 ≥44px 在畫面內', rvL[0] && rvL[1] === 3 && rvL[2] && rvL[3] >= 1, JSON.stringify(rvL));
    await tapL('#preveal [data-a=rvsalv]');
    ok('橫向：分解掉那一件', await p.evaluate(() => /已分解/.test($('preveal').innerText)));
    await p.evaluate(() => {
      S.camp = JSON.parse(JSON.stringify(_CAMP));
      closePanels();
    });
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
      '右上沒有按鈕（0.4.9：自動進設定；倉庫、選單在分頁列）',
      await p.evaluate(
        () => [...document.querySelectorAll('.tmenu button')].filter(e => e.getClientRects().length).length === 0
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
    /* ---------- 0.5.0 打造：鍛造台 Lv0 的做裝只有「打造」「碎片」、材料夠按一下打一件、翻牌出換裝卡與三顆鈕、換上／分解、升級鈕 ---------- */
    await p.evaluate(() => {
      closePanels();
      S.camp = newCamp();
      S.mat.soul = 0;
      S.mat.mats = {};
      matAdd('iron', 1, 16);
      CRAFT.tab = 'make';
      PANEL.ctab = 'make';
      window._n0 = S.inv.items.length;
    });
    await tap('#pnav [data-tm="nav:craft"]');
    const seg0 = await p.evaluate(() =>
      [...document.querySelectorAll('#pcraft .ftabs button')].map(b => b.textContent)
    );
    ok(
      '營地全 0：營地只有「總覽」「打造」（通貨、鍛造台、碎片藏起來）',
      seg0.join() === '總覽,打造' && (await p.evaluate(() => CRAFT.tab === 'make' && !$('pcraft').hidden)),
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
      '打造鈕寫「打造 1 件・鐵 T1 ×8」、≥44px、在畫面內、部位鈕 ≥44px',
      /打造 1 件/.test(mk[0]) && !mk[1] && mk[2] >= 44 && mk[3] && mk[4] >= 44,
      JSON.stringify(mk)
    );
    await tap('#pcraft [data-fg=go]');
    await p.waitForTimeout(500);
    const rv = await p.evaluate(() => {
      const b = [...document.querySelectorAll('#preveal .acts .btn')];
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
    await tap('#pnav [data-tm="nav:craft"]');
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
      PANEL.ctab = 'camp';
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
    const seg1 = await p.evaluate(() =>
      [...document.querySelectorAll('#pcraft .ftabs button')].map(b => b.textContent)
    );
    ok(
      '升到 Lv1：靈魂扣 150、通貨與鍛造台分頁出現',
      (await p.evaluate(() => S.camp.forge === 1 && S.mat.soul === 0)) && seg1.join() === '總覽,打造,通貨,鍛造台',
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
      PANEL.ctab = 'forge';
      window._st = it;
    });
    await tap('#pnav [data-tm="nav:craft"]');
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
      PANEL.ctab = 'camp';
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
      '營地總覽（0.5.1）：開局 8 張卡（解鎖表六座＋林場、礦場）都在畫面寬度內、升級鈕與 ×1／×10／最大 ≥44px、上面兩行（庫存＋速率、下一件事）、分頁列寫買得起幾件',
      cm[0] === 8 && cm[1] && cm[2] && cm[3] && +cm[4] >= 2,
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
    /* 掛機卡（0.5.4，考核 C2）：刷圖中下半有資源條與「下一件事」的升級鈕（≥44px、在畫面內），按了就升 */
    if (PORTM) {
      const ic = await p.evaluate(async () => {
        closePanels();
        S.auto = 1;
        if (G.scene !== 'map') runNode(TRUNK_K[0]);
        G.loot = null;
        matAdd('wood', 0, 500);
        await new Promise(r => setTimeout(r, 900));
        idleBar(1);
        const b = document.querySelector('#pidle .cmnext .btn.pri'),
          r = b && b.getBoundingClientRect();
        return [
          idleOn(),
          document.querySelectorAll('#pidle .rbar').length,
          !!r && r.height >= 44 && r.bottom <= innerHeight && r.top >= 0,
          b ? b.dataset.fg : ''
        ];
      });
      ok(
        '掛機卡：下半有資源條（木、鐵、靈魂）與「下一件事」主要鈕 ≥44px 在畫面內',
        ic[0] && ic[1] >= 3 && ic[2],
        JSON.stringify(ic)
      );
      const lv0 = await p.evaluate(() => JSON.stringify([S.camp, MAT().soul]));
      await tap('#pidle .cmnext .btn.pri');
      const lv1 = await p.evaluate(() => JSON.stringify([S.camp, MAT().soul]));
      ok('掛機卡：按升級鈕就升（營地或靈魂變了）', lv0 !== lv1);
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
      openPanel('node');
      const m = document.querySelector('#pnode .ndst').getBoundingClientRect(),
        k = document.querySelector('#pnode .ndr').getBoundingClientRect();
      closePanels();
      return [g.top, m.top, k.bottom, innerHeight].map(Math.round);
    });
    ok(
      '橫向：背包格、地點清單的星級與第一列都在第一屏',
      fold[0] < fold[3] - 100 && fold[1] < fold[3] - 60 && fold[2] <= fold[3],
      fold.join()
    );
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
      p.evaluate(() => {
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
    await p.evaluate(port => {
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
      port ? navGo('skill') : openPanel('skill');
    }, PORTM);
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
    await p.evaluate(port => (port ? navGo('skill') : openPanel('skill')), PORTM);
    await p.waitForTimeout(260);
    let taps = 0;
    for (const q of ['#pskill [data-sk="go:one:0"]', '#pskill .sk-row.emp[data-sk^="hole"]', '#pskill .sk-bar .pri']) {
      taps += (await tap(q)) ? 1 : 0;
      await p.waitForTimeout(200);
    }
    const got = await p.evaluate(() => S.skills[0].so[1]);
    ok(
      `技能面板：找出讓第 1 格每秒最高的輔助並插上 ${taps} 下（不含打開技能分頁那一下）`,
      taps <= 3 && got === best.k,
      `插上 ${got}，暴力算的最好是 ${best.k}`
    );
    await p.evaluate(() => closePanels());
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
      ]
    ];
    ok('技能、昇華石碑：不出畫面、主要動作看得到', L.flat().every(Boolean), JSON.stringify(L));
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
      '開著戰利品與營地時倒下：死亡卡在最上層、面板收起來、兩顆鈕點得到',
      (await p.evaluate(
        () =>
          !$('over').hidden &&
          !anyPanel() &&
          $('pidle').hidden &&
          +getComputedStyle($('over')).zIndex >= 40 &&
          document.querySelectorAll('#over .btn').length === 2
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
      homeAsk();
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
    /* 回藏身處：「繼續刷」是標準主按鈕（≥44px、字 14～17px）；地點名 14px */
    /* 鍵盤（M0-04）：T 開確認卡、Esc＝取消、連按兩下 T＝回藏身處 */
    await p.evaluate(() => closePanels());
    await p.keyboard.press('t');
    await p.waitForTimeout(200);
    const askT = await p.evaluate(() => !$('over').hidden && G.ask === 'home');
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
    ok('連按兩下 T：回到藏身處', await p.evaluate(() => G.scene === 'hide' && $('over').hidden));
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
  if (errs.length) fail++;
  console.log(errs.length ? '❌ 頁面錯誤 ' + errs.join(' / ') : '✅ 沒有頁面錯誤');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
