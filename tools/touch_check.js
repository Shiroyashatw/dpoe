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
  const b = await chromium.launch();
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?p=7&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1200);
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
  await p.screenshot({ path: shot('map') });
  /* 回藏身處，開背包＋倉庫 */
  await p.evaluate(() => {
    enterHideout();
    for (let i = 0; i < 6; i++) {
      const it = dropItem(3);
      gridAuto(S.inv, it);
    }
    for (let i = 0; i < 4; i++) gridAuto(S.stash, dropItem(5));
    openPanel('stash');
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
    const e = document.querySelector('#pinv .grid .it, #pstash .grid .it');
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
  const n0 = await p.evaluate(() => [S.inv.items.length, S.stash.items.length].join());
  const bt = await p.evaluate(() => {
    const r = document.querySelector('#tip [data-tq=move]').getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  await touch('touchStart', [bt]);
  await touch('touchEnd', []);
  await p.waitForTimeout(200);
  const n1 = await p.evaluate(() => [S.inv.items.length, S.stash.items.length].join());
  ok('按動作按鈕搬過去', n0 !== n1, n0 + ' → ' + n1);
  {
    const bad = await tipAll('.it[data-id]');
    ok('每件道具的說明框都不蓋住、不出畫面', !bad.length, bad.join(','));
  }
  /* 拖曳：在同一個格子裡拖到右下角的空格，放開後沒有殘影 */
  await p.evaluate(() => hideTip());
  const dg = await p.evaluate(() => {
    const vis = e => {
        const r = e.getBoundingClientRect();
        return r.width && e.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
      },
      e = [...document.querySelectorAll('.grid .it[data-id]')].find(vis),
      gr = e.closest('[data-grid]'),
      g = GRIDS()[gr.dataset.grid],
      it = findItem(e.dataset.src, e.dataset.id),
      [w, h] = itemSize(it);
    let tx = -1,
      ty = -1;
    for (let y = g.h - h; y >= 0 && tx < 0; y--)
      for (let x = g.w - w; x >= 0; x--)
        if (
          !gridHits(g, x, y, w, h, it).length &&
          (x !== it.x || y !== it.y) &&
          gr.contains(
            document.elementFromPoint(
              gr.getBoundingClientRect().left + (x + w / 2) * C,
              gr.getBoundingClientRect().top + (y + h / 2) * C
            )
          ) /* 要拖得到（畫面看得到、沒被捲動區切掉） */
        ) {
          [tx, ty] = [x, y];
          break;
        }
    const r = e.getBoundingClientRect(),
      R = gr.getBoundingClientRect();
    return {
      id: it.id,
      from: [r.left + 8, r.top + 8],
      to: [R.left + tx * C + 8, R.top + ty * C + 8],
      x: it.x,
      y: it.y,
      tx,
      ty
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
  const dr = await p.evaluate(id => {
    const it = [...S.inv.items, ...S.stash.items].find(i => i.id === id);
    return [it && it.x, it && it.y, document.querySelectorAll('.ghost, .hl, .it.lift').length, !!DR];
  }, dg.id);
  ok(
    '拖到空格放得下',
    dr[0] === dg.tx && dr[1] === dg.ty,
    `(${dg.x},${dg.y}) → (${dr[0]},${dr[1]})，目標 (${dg.tx},${dg.ty})`
  );
  ok('放開後沒有殘影', !dr[2] && !dr[3], `殘留 ${dr[2]} 個、DR ${dr[3]}`);
  /* 天賦樹 */
  await p.evaluate(() => {
    closePanels();
    S.lv = 20;
    treeOpen('pt');
  });
  await p.waitForTimeout(400);
  const nd = await p.evaluate(() => {
    /* 挑畫面上點得到的（沒被上方列擋住、沒在畫面外） */
    const id = [...document.querySelectorAll('#tg .nd.can')]
      .filter(e => {
        const r = e.getBoundingClientRect(),
          top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return top && top.closest('.nd') === e;
      })
      .map(e => e.dataset.n)
      .find(i => !i.startsWith('a_'));
    const r = document.querySelector(`#tg [data-n="${id}"]`).getBoundingClientRect();
    return [id, r.left + r.width / 2, r.top + r.height / 2];
  });
  await touch('touchStart', [[nd[1], nd[2]]]);
  await touch('touchEnd', []);
  await p.waitForTimeout(200);
  ok(
    '天賦點一下＝選取看說明（還沒點亮）',
    await p.evaluate(id => TREE.sel === id && !S.pt.includes(id) && !$('tip').hidden, nd[0])
  );
  {
    const [v, d] = await tipOK([nd[1], nd[2]]);
    ok('天賦說明框不蓋住天賦點、不出畫面', v, d);
  }
  await p.screenshot({ path: shot('tree') });
  {
    const bad = await tipAll('#tg .nd[data-n]');
    ok('每個天賦點的說明框都不蓋住、不出畫面', !bad.length, bad.length + ' 個');
  }
  const nd2 = await p.evaluate(id => {
    const r = document.querySelector(`#tg [data-n="${id}"]`).getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }, nd[0]);
  await touch('touchStart', [nd2]);
  await touch('touchEnd', []);
  await p.waitForTimeout(200);
  ok('再點一次點亮', await p.evaluate(id => S.pt.includes(id), nd[0]));
  const z0 = await p.evaluate(() => TREE.z);
  await touch('touchStart', [
    [W / 2 - 40, H / 2],
    [W / 2 + 40, H / 2]
  ]);
  for (let i = 1; i <= 5; i++)
    await touch('touchMove', [
      [W / 2 - 40 - i * 15, H / 2],
      [W / 2 + 40 + i * 15, H / 2]
    ]);
  await touch('touchEnd', []);
  const z1 = await p.evaluate(() => TREE.z);
  ok('兩指放大', z1 > z0 * 1.3, z0.toFixed(2) + ' → ' + z1.toFixed(2));
  if (errs.length) fail++;
  console.log(errs.length ? '❌ 頁面錯誤 ' + errs.join(' / ') : '✅ 沒有頁面錯誤');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
