/* M2-19 追逐掉落演出的驗收截圖（交辦 docs/交辦/M2-19-追逐演出.md）：先量、再截，不合就 ❌。
   ?test=midgame（Lv<45）：掛機卡沒有保底行、沒有空行；?test=chase（第 15 個主幹地點 Lv48，進場 1.5 秒開發觸發 devChase 掉一個王印）：
   橫幅（.chf、王印 1／4、不蓋戰鬥區／生命魔力條／技能列、自動不暫停）、地上的橘色光柱、合併 ×2、保底行 0／37／99／100%（一行、100% 呼吸）、
   點橫幅開到王印詳情、桌機按 L 開掉落紀錄並選中、點保底行開掉落紀錄、靈魂包橫幅點了開掉落紀錄、離線摘要 0 件與展開前後。
   只截不改；用法：先開本機伺服器，node tools/m2_19_shots.js [寬 390] [高 844] [網址] [存哪，預設 docs/production/evidence/M2-19]；PW_CHROME 指定 Chrome */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const W = +process.argv[2] || 390,
  H = +process.argv[3] || 844,
  URL = process.argv[4] || 'http://localhost:8000/',
  OUT = process.argv[5] || path.join(__dirname, '..', 'docs', 'production', 'evidence', 'M2-19');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const mob = W < 900;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  let fail = 0;
  const helpers = () => {
    window.__r = s => {
      const e = typeof s === 'string' ? document.querySelector(s) : s;
      if (!e || e.hidden || !e.getClientRects().length) return null;
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    };
    window.__in = r => !!r && r.x >= 0 && r.y >= 0 && r.x + r.w <= innerWidth && r.y + r.h <= innerHeight;
    window.__hit = (a, b) => !!a && !!b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    /* 橫幅蓋到哪些：戰鬥區（直立＝面板上緣以上；桌機＝主角）、生命魔力條、技能列 */
    window.noCover = () => {
      const bn = __r('#chase'),
        st = parseFloat(getComputedStyle(document.body).getPropertyValue('--sheet-top')),
        port = document.body.classList.contains('port'),
        L = {
          /* 直立：面板上緣以上整塊；桌機：鏡頭跟著主角，主角在畫面中間那一條 */
          戰鬥區: port ? { x: 0, y: 0, w: innerWidth, h: st } : { x: 0, y: innerHeight / 2 - 40, w: innerWidth, h: 80 },
          生命魔力條: __r('.mid .bars'),
          技能列: __r('.mid .bar')
        };
      return { bn, hit: Object.keys(L).filter(k => __hit(bn, L[k])), st };
    };
  };
  const shot = async (n, f, chk, wait = 700) => {
    if (f) await p.evaluate(f);
    await p.waitForTimeout(wait);
    await p.screenshot({ path: path.join(OUT, `${n}_${W}x${H}.png`) });
    const [ok, v] = await p.evaluate(chk);
    if (!ok) fail++;
    console.log(`${ok ? '✅' : '❌'} ${n}`, JSON.stringify(v));
  };
  const open = async t => {
    await p.goto(URL + '?test=' + t + '&' + Date.now());
    await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
    await p.evaluate(helpers);
    await p.evaluate(() => {
      try {
        introStop();
      } catch (e) {}
      closePanels();
      /* 截圖要的是介面：主角不會倒 */
      window.hurtPlayer = () => 0;
    });
  };
  /* 1. Lv<45：掛機卡沒有保底行、沒有空行 */
  await open('midgame');
  await shot(
    '1_Lv低於45_掛機卡沒有保底行',
    null,
    () => {
      const c = document.querySelector('#pidle .idl');
      if (!c) return [false, { 掛機卡: '沒有' }];
      const kids = [...c.children].filter(e => e.getClientRects().length),
        empty = kids.filter(e => !e.textContent.trim() && !e.querySelector('img,button,.rbar'));
      return [
        mobLv(G.mapT) < CHASE.lv && !c.querySelector('.chs') && !c.textContent.includes('保底') && !empty.length,
        { 怪物等級: mobLv(G.mapT), 保底行: !!c.querySelector('.chs'), 空行: empty.length }
      ];
    },
    2500
  );
  /* 2～：第 15 個主幹地點（Lv48），進場 1.5 秒掉一個王印 */
  await open('chase');
  await p.waitForFunction(() => !$('chase').hidden);
  await shot(
    '2_追逐橫幅_王印1of4_不遮擋',
    null,
    () => {
      const el = $('chase'),
        { bn, hit, st } = noCover(),
        cs = getComputedStyle(el),
        port = document.body.classList.contains('port'),
        desk = !document.body.classList.contains('touch');
      return [
        !el.hidden &&
          /王印 1／4/.test(el.textContent) &&
          !!el.querySelector('.cbi .chf') &&
          __in(bn) &&
          !hit.length &&
          (port ? Math.abs(bn.y - (st + 4)) <= 1 && bn.h === 72 : desk ? bn.y === 76 && bn.h === 88 : bn.h === 60) &&
          S.auto === 1 &&
          G.state === 'play' &&
          !worldPaused(),
        { 字: el.textContent, rect: bn, 面板上緣: st, 蓋到: hit, z: cs.zIndex, 自動: S.auto, 暫停: worldPaused() }
      ];
    },
    500
  );
  await shot(
    '3_地上橘色雙光柱與印環',
    () => {
      chaseBnHide();
      /* 停住吸取，讓光柱留在地上看清楚（只動演出，不動掉落） */
      for (const d of G.drops) if (d.chase) (d.hold = 99), (d.t = 1), (d.x = d.sx = P.x + 90), (d.y = d.sy = P.y);
      dropAt(P.x - 90, P.y, { show: 'tran' });
      for (const d of G.drops) if (d.show) d.hold = 99;
    },
    () => {
      const d = G.drops.find(x => x.chase);
      return [!!d && G.drops.some(x => x.show), { 追逐: d && d.chase, 地上: G.drops.map(x => x.chase || x.show) }];
    },
    600
  );
  await shot(
    '4_保底行37%一行',
    () => {
      G.drops = G.drops.filter(d => !d.chase && !d.show);
      G.loot = null;
      S.chase.pts = 185;
      idleBar(1);
    },
    () => {
      const e = document.querySelector('#pidle .chs'),
        r = __r(e),
        s = e && e.querySelector('span'),
        lh = s && parseFloat(getComputedStyle(s).lineHeight),
        fs = s && getComputedStyle(s).fontSize,
        fw = s && getComputedStyle(s).fontWeight,
        bar = __r('#pidle .chs .pb'),
        btn = __r('#pidle .chsb');
      return [
        !!r &&
          s.textContent === '下一件保底 37%' &&
          s.getClientRects().length === 1 &&
          r.h < 2 * lh &&
          e.scrollWidth <= e.clientWidth + 1 &&
          fs === '13px' &&
          fw === '700' &&
          bar.h === 6 &&
          btn.h >= 44 &&
          __in(r),
        { 文字: s && s.textContent, 高: r && r.h, 行高: lh, 字: [fs, fw], 條高: bar && bar.h, 熱區: btn && btn.h }
      ];
    }
  );
  {
    const v = await p.evaluate(async () => {
      const o = [];
      for (const n of [0, 499, 505]) {
        S.chase.pts = n;
        idleBar(1);
        const s = document.querySelector('#pidle .chs span');
        o.push([s.textContent, s.getClientRects().length, !!document.querySelector('#pidle .chs .pb.full')]);
      }
      return o;
    });
    const ok =
      JSON.stringify(v) === '[["下一件保底 0%",1,false],["下一件保底 99%",1,false],["下一件保底 100%",1,true]]';
    if (!ok) fail++;
    console.log(`${ok ? '✅' : '❌'} 保底行 0／499／505 點 → 0%／99%／100%（一行、100% 呼吸）`, JSON.stringify(v));
  }
  await shot(
    '5_保底行100%橘色',
    null,
    () => {
      const s = document.querySelector('#pidle .chs span');
      return [getComputedStyle(s).color === 'rgb(255, 154, 74)', { 色: getComputedStyle(s).color }];
    },
    300
  );
  await shot(
    '6_合併兩件×2',
    () => (devChase(), setTimeout(devChase, 1000)),
    () => {
      const el = $('chase');
      return [
        !el.hidden &&
          /追逐物品 ×2/.test(el.textContent) &&
          el.querySelectorAll('.cbi .chf').length === 2 &&
          CB.items.length === 2,
        { 字: el.textContent, 件: CB.items.length, 合計秒: Math.round(CB.end - CB.t0) }
      ];
    },
    1500
  );
  await shot(
    '7_點橫幅開王印詳情',
    () => $('chase').click(),
    () => {
      const k = CB.items[CB.items.length - 1],
        tip = __r('#ttip');
      return [
        $('chase').hidden &&
          PANEL.stash &&
          PANEL.stab === 'frags' &&
          !!tip &&
          $('ttip').textContent.includes(chaseName(k)) &&
          /王印 \d／4/.test($('ttip').textContent) &&
          __in(tip) &&
          S.auto === 1,
        { 面板: PANEL.stash, 分頁: PANEL.stab, 詳情: $('ttip').textContent }
      ];
    }
  );
  if (!mob) {
    await p.evaluate(() => (($('ttip').hidden = true), closePanels(), devChase()));
    await p.waitForTimeout(700);
    await p.keyboard.press('l');
    await shot('8_桌機按L開掉落紀錄並選中', null, () => {
      const li = document.querySelector('#plog li.lg-chase.on');
      return [
        PANEL.log &&
          !!li &&
          li === document.querySelector('#plog li.lg-chase') &&
          $('ttip').textContent.includes('王印'),
        { 選中: li && li.textContent, 詳情: $('ttip').textContent }
      ];
    });
  }
  if (!mob) {
    await shot(
      '8b_桌機右欄開著_橫幅只蓋左邊畫布',
      () => (($('ttip').hidden = true), closePanels(), openPanel('inv'), chaseBnHide(), devChase()),
      () => {
        const bn = __r('#chase'),
          pn = __r('#pinv'),
          nm = document.querySelector('#chase .cbt b'),
          nr = __r(nm);
        /* 名字欄寬 > 0 且名字整個放得下（沒有被 … 截掉） */
        return [
          !!bn &&
            !!pn &&
            bn.x + bn.w <= pn.x + 1 &&
            bn.y === 76 &&
            !!nr &&
            nr.w > 0 &&
            nm.scrollWidth <= nm.clientWidth,
          { 橫幅: bn, 右欄: pn, 名字: nr, 名字字寬: nm && nm.scrollWidth, 名字文字: nm && nm.textContent }
        ];
      },
      600
    );
    await p.evaluate(() => chaseBnHide());
  }
  await shot(
    '9_點保底行開掉落紀錄',
    () => (
      ($('ttip').hidden = true),
      closePanels(),
      (S.chase.pts = 185),
      idleBar(1),
      document.querySelector('#pidle .chsb').click()
    ),
    () => {
      const t = $('plog').textContent;
      return [PANEL.log && t.includes('追逐物品') && t.includes('37%'), { 開了: PANEL.log }];
    }
  );
  await shot(
    '10_靈魂包橫幅點了開掉落紀錄',
    async () => {
      closePanels();
      dropAt(P.x, P.y, { show: 'pack', soul: 120 });
      await new Promise(r => setTimeout(r, 300));
      $('banner').click();
    },
    () => [
      PANEL.log && $('banner').hidden && S.log.some(x => x.c === 'pack' && x.n === '靈魂包 +120 靈魂'),
      { 開了: PANEL.log }
    ]
  );
  await shot(
    '11_離線摘要0件不能點',
    () => {
      closePanels();
      S.chase.pts = 185;
      S.rounds = [{ d: 150, nS: 40, nE: 2, xp: 0, gold: 0 }];
      /* 1 小時、點數夠低：不會碰到必掉（平機率另外擲，固定亂數讓它沒中） */
      const r = Math.random;
      Math.random = () => 0.99;
      const o = offSettle(3600e3);
      Math.random = r;
      offShow(o, {}, 3600e3);
    },
    () => {
      const e = document.querySelector('#preveal .offch');
      return [
        !!e &&
          e.classList.contains('z') &&
          e.tagName === 'DIV' &&
          /^追逐物品 ×0、目前保底 \d+%$/.test(e.textContent) &&
          __in(__r(e)),
        { 那一列: e && e.textContent, tag: e && e.tagName }
      ];
    },
    1200
  );
  await shot(
    '12_離線摘要展開前',
    () => {
      closePanels();
      S.chase.pts = 495;
      S.rounds = [{ d: 150, nS: 40, nE: 2, xp: 0, gold: 0 }];
      window.__o = offSettle(12 * 3600e3);
      offShow(__o, {}, 12 * 3600e3);
    },
    () => {
      const e = document.querySelector('#preveal button.offch');
      /* 在離線卡的捲動區裡：捲到看得到再量（矮畫面卡片比畫面高） */
      if (e) e.scrollIntoView({ block: 'nearest' });
      const r = __r(e);
      return [
        !!e &&
          __o.chase >= 1 &&
          /^追逐物品 ×[1-9]\d*、目前保底 \d+%›$/.test(e.textContent) &&
          r.h >= 44 &&
          __in(r) &&
          !document.querySelector('#preveal .offchl'),
        { 那一列: e && e.textContent, 件: __o.chase, 清單: __o.chaseL, rect: r }
      ];
    },
    1200
  );
  await shot(
    '13_離線摘要展開後',
    () => {
      const e = document.querySelector('#preveal button.offch');
      e.scrollIntoView({ block: 'center' });
      e.click();
    },
    () => {
      const L = [...document.querySelectorAll('#preveal .offchl li')];
      return [
        L.length === __o.chaseL.length &&
          L.length >= 1 &&
          L.every(
            (li, i) => li.textContent.includes(chaseName(__o.chaseL[i][0])) && li.getBoundingClientRect().height >= 44
          ) &&
          document.querySelector('#preveal button.offch').getAttribute('aria-expanded') === 'true',
        { 列: L.map(li => li.textContent) }
      ];
    }
  );
  console.log(errs.length ? '❌ 頁面錯誤 ' + errs.join(' | ') : '✅ 沒有頁面錯誤');
  await b.close();
  process.exit(fail || errs.length ? 1 : 0);
})();
