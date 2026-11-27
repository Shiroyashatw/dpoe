/* M2-18 追逐掉落的驗收截圖（交辦 docs/交辦/M2-18-追逐掉落.md 與 addendum 25 點）：先量、再截，不合就 ❌。
   ?test=midgame（Lv<45 地點）：掛機卡沒有保底行、沒有空行；?test=chase（第 15 個主幹地點 Lv48，進場 1.5 秒開發觸發 devChase 掉一個王印）：
   王印橫幅「王印 1／4」、保底行一行不換行、王印橫幅「王印 2／4」不遮擋、點橫幅開到王印詳情（通貨與碎片頁）、王印在通貨與碎片頁、靈魂包橫幅與飄字、離線摘要。
   只截不改；用法：先開本機伺服器，node tools/m2_18_shots.js [寬 390] [高 844] [網址] [存哪，預設 docs/production/evidence/M2-18]；PW_CHROME 指定 Chrome */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const W = +process.argv[2] || 390,
  H = +process.argv[3] || 844,
  URL = process.argv[4] || 'http://localhost:8000/',
  OUT = process.argv[5] || path.join(__dirname, '..', 'docs', 'production', 'evidence', 'M2-18');
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
    /* 橫幅蓋到哪些 UI */
    window.noCover = () => {
      const bn = __r('#banner'),
        L = {
          掛機卡: __r('#pidle'),
          分頁列: __r('#pnav'),
          右上分頁: __r('#dnav'),
          生命條: __r('.mid .bars'),
          技能列: __r('.mid .bar')
        };
      return { bn, hit: Object.keys(L).filter(k => __hit(bn, L[k])) };
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
      /* 截圖要的是介面：主角不會倒（測試角色在 Lv55 的凶地打不過） */
      window.hurtPlayer = () => 0;
    });
  };
  /* 1. Lv<45 地點：掛機卡沒有保底行、沒有空行 */
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
  /* 2～8：第 15 個主幹地點（Lv48） */
  await open('chase');
  await shot(
    '2_王印橫幅_王印1of4',
    null,
    () => {
      const bn = __r('#banner'),
        t = $('banner').textContent;
      return [
        S.world.cur === TRUNK_K[14] &&
          /^(鎮嶽|赤霄|疾霆|歸墟)印・王印 1／4$/.test(t) &&
          $('banner').className === 'bn-chase' &&
          __in(bn) &&
          !S.inv.items.some(it => it.chase),
        { 怪物等級: mobLv(G.mapT), 橫幅: t, rect: bn }
      ];
    },
    1900
  );
  await shot(
    '3_Lv45以上_掛機卡保底行',
    () => (($('banner').hidden = true), (G.loot = null), (S.chase.pts = 230), idleBar(1)),
    () => {
      const e = document.querySelector('#pidle .chs'),
        r = __r(e),
        s = e && e.querySelector('span'),
        lh = s && parseFloat(getComputedStyle(s).lineHeight);
      return [
        !!r &&
          /^下一件保底 \d+%$/.test(s.textContent) &&
          s.getClientRects().length === 1 &&
          r.h < 2 * (lh || 20) &&
          e.scrollWidth <= e.clientWidth + 1 &&
          __in(r),
        { 文字: s && s.textContent, 行: s && s.getClientRects().length, 高: r && r.h, 行高: lh }
      ];
    }
  );
  await shot(
    '4_王印橫幅_王印2of4_不遮擋',
    () => (window.__k = devChase()),
    () => {
      const t = $('banner').textContent,
        { bn, hit } = noCover();
      return [
        /・王印 2／4$/.test(t) && __in(bn) && !hit.length && $('banner').getClientRects().length === 1,
        { 橫幅: t, rect: bn, 蓋到: hit }
      ];
    },
    400
  );
  await shot(
    '5_點王印橫幅_通貨與碎片頁詳情',
    () => $('banner').click(),
    () => {
      const k = __k,
        row = __r(`#pstash [data-chs="${k}"]`),
        tip = __r('#ttip');
      return [
        PANEL.stash &&
          PANEL.stab === 'frags' &&
          !!row &&
          !!tip &&
          $('ttip').textContent.includes(chaseName(k)) &&
          $('ttip').textContent.includes('王印 2／4') &&
          __in(tip),
        { 面板: PANEL.stash, 分頁: PANEL.stab, 列: row, 詳情: $('ttip').textContent }
      ];
    }
  );
  await shot(
    '6_王印在通貨與碎片頁',
    () => ($('ttip').hidden = true),
    () => {
      const rows = [...document.querySelectorAll('#pstash [data-chs]')];
      return [
        !!__r('#pstash') &&
          rows.length === 4 &&
          rows.filter(r => !r.classList.contains('z')).length === 2 &&
          !!document.querySelector('#pstash .chf img, #pstash .chf .ic'),
        { 列: rows.map(r => r.textContent.trim()) }
      ];
    }
  );
  await shot(
    '7_靈魂包橫幅與飄字',
    () => {
      closePanels();
      S.camp.forge = 14;
      S.prd.feel = feelK();
      /* 跟 killMob 同一條路：有感保底給靈魂包 → 地上一個，撿起來才加靈魂 */
      const g = killMat({ boss: 1 }, G.mapT, {});
      window.__pk = [g.pack, MAT().soul, SES.soul];
      if (g.pack) dropAt(P.x, P.y, { show: 'pack', soul: g.pack });
    },
    () => {
      const { bn, hit } = noCover(),
        n = __pk[0],
        fl = G.nums.some(x => x.txt === `+${n} 靈魂`);
      return [
        n > 0 &&
          $('banner').textContent === '靈魂包' &&
          $('banner').className === 'bn-pack' &&
          S.log.some(x => x.c === 'pack' && x.n === `靈魂包 +${n} 靈魂`) &&
          fl &&
          !G.drops.some(d => d.show === 'pack') &&
          !hit.length,
        { 橫幅: $('banner').textContent, 紀錄: S.log.find(x => x.c === 'pack'), 飄字: fl, 蓋到: hit }
      ];
    },
    1900
  );
  await shot(
    '8_離線摘要',
    () => {
      $('banner').hidden = true;
      S.chase.pts = 495;
      S.rounds = [{ d: 150, nS: 40, nE: 2, xp: 0, gold: 0 }];
      const a = 2 * 3600e3;
      const o = offSettle(a);
      window.__dbg = [!!o, o && o.chase, S.chase.pts, S.auto, S.stopWhy, (S.rounds || []).length];
      offShow(o);
    },
    () => {
      const e = [...document.querySelectorAll('#preveal .sub')].find(x => x.textContent.startsWith('追逐物品')),
        r = __r(e),
        P = __r('#preveal');
      return [
        !!e &&
          /^追逐物品 ×[1-9]\d*、目前保底 \d+%$/.test(e.textContent) &&
          e.getClientRects().length === 1 &&
          __in(r) &&
          __in(P),
        { 那一列: e && e.textContent, rect: r, 面板: P, dbg: __dbg }
      ];
    },
    1500
  );
  console.log(errs.length ? '❌ 頁面錯誤 ' + errs.join(' | ') : '✅ 沒有頁面錯誤');
  await b.close();
  process.exit(fail || errs.length ? 1 : 0);
})();
