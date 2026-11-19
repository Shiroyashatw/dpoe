/* M1 第二批介面的驗收截圖（規格「dpoe M1 直立視覺規格」）：新存檔、鍛造台 Lv1、祭壇 Lv2、開第一個地點、自動模式，
   依序截掛機卡（半版戰鬥）、技能總覽／詳情／挑選、營地總覽、角色、戰利品空、掉落紀錄空、天賦樹總覽、死亡卡（手動）。
   只截不改；用法：先開本機伺服器，node tools/m1ui_shots.js [寬 390] [高 844] [網址] [存哪，預設 docs/production/evidence/M1-UI]；PW_CHROME 指定 Chrome */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const W = +process.argv[2] || 390,
  H = +process.argv[3] || 844,
  URL = process.argv[4] || 'http://localhost:8000/',
  OUT = process.argv[5] || path.join(__dirname, '..', 'docs', 'production', 'evidence', 'M1-UI');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const mob = W < 900;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?p=31&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene);
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    try {
      introStop();
    } catch (e) {}
    proSkip();
    S.story.tips = 0;
    S.auto = 1;
    /* 手機橫向測橫向操作（預設直立會叫你把手機轉直） */
    S.orient = innerWidth > innerHeight ? 'l' : 'p';
    applyOrient();
    Object.assign(S.camp, { forge: 1, altar: 2 });
    ST = stats();
    runNode(TRUNK_K[0]);
  });
  await p.waitForTimeout(6000);
  const port = await p.evaluate(() => PORT());
  let fail = 0;
  /* 截圖前先量（規格的數字），不合就 ❌ */
  const shot = async (n, f, chk) => {
    await p.evaluate(f);
    await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(OUT, `${n}_${W}x${H}.png`) });
    if (!chk) return console.log('📷', n);
    const [ok, v] = await p.evaluate(chk);
    if (!ok) fail++;
    console.log(`${ok ? '✅' : '❌'} ${n}`, JSON.stringify(v));
  };
  /* 頁內共用：量一個元素、在不在畫面裡、「已暫停」有沒有壓到分頁或面板 */
  await p.evaluate(() => {
    window.__r = s => {
      const e = typeof s === 'string' ? document.querySelector(s) : s;
      if (!e || !e.getClientRects().length) return null;
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    };
    window.__in = r => !!r && r.x >= 0 && r.y >= 0 && r.x + r.w <= innerWidth && r.y + r.h <= innerHeight;
    window.__hit = (a, b) => !!a && !!b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  });
  const go = k => (port ? `navGo('${k}')` : `openPanel('${k === 'bag' || k === 'char' ? 'inv' : k}')`);
  await shot(
    '01_掛機卡',
    () => closePanels(),
    () => {
      const b = __r('#pidle .igo');
      /* 手機橫向本來就沒有掛機卡（idleOn：觸控只在直立自動時出） */
      if (!idleOn()) return [TOUCH.on && !PORT(), { 掛機卡: '橫向沒有' }];
      return [!!b && b.h >= 44 && !document.querySelector('#pidle [data-a^="cup"]'), { 去營地: b }];
    }
  );
  await shot('02_技能總覽', new Function(`closePanels(); ${go('skill')};`), () => {
    const P = __r('#pskill'),
      sw = __r('#pskill .skr-sw');
    return [__in(P) && sw.w >= 44 && sw.h >= 44 && !worldPaused(), { 面板: P, 換: sw }];
  });
  await shot(
    '03_技能詳情',
    () => document.querySelector('#pskill [data-sk="go:one:0"]').click(),
    () => {
      const u = __r('#pskill .sk-bar1 .pri, #pskill .sk-bar1 .sk-btn'),
        sw = __r('#pskill .sk-bar1 .sk-sw2'),
        o = __r('#pskill .sk-out');
      return [
        u.h >= 48 && sw.h >= 48 && sw.w >= 96 && o.h >= 44 && o.y - (sw.y + sw.h) >= 8 && !worldPaused(),
        { 升級: u, 換一招: sw, 卸下: o }
      ];
    }
  );
  await shot(
    '04_技能挑選',
    () => document.querySelector('#pskill [data-sk="swap"]').click(),
    () => {
      const P = __r('#pskill'),
        tabs = [...document.querySelectorAll('#pskill .sk-chips button')].map(__r),
        b = document.querySelector('#pskill .sk-bar .pri'),
        pz = __r('#paused'),
        nav = __r('#dnav') || __r('#pnav');
      return [
        tabs.length >= 7 &&
          /* 一行（放不下就橫捲，不換行把清單往下推） */
          tabs.every(t => t && t.h >= 44 && t.y === tabs[0].y) &&
          __r('#pskill .sk-chips').x + __r('#pskill .sk-chips').w <= P.x + P.w &&
          /* 375 寬七顆也放得下：一行不用橫捲 */
          (c => c.scrollWidth <= c.clientWidth + 1)(document.querySelector('#pskill .sk-chips')) &&
          __r(b).h >= 48 &&
          b.disabled &&
          !!pz &&
          (!__hit(pz, P) || (TOUCH.on && !PORT())) /* 手機橫向的面板蓋滿畫面，膠囊在面板底下 */ &&
          !__hit(pz, nav) &&
          (TOUCH.on || (!__hit(P, __r('.mid .bars')) && !__hit(P, __r('.mid .bar')))),
        { 頁籤: tabs.length, 底鈕: [__r(b), b.disabled, b.textContent], 已暫停: pz }
      ];
    }
  );
  await shot('05_營地總覽', new Function(`closePanels(); CRAFT.tab = 'camp'; ${go('craft')};`), () => {
    const P = __r('#pcraft'),
      bd = [...document.querySelectorAll('#pnav .dot.pill, #dnav .dot.pill')].map(e => e.textContent);
    return [
      __in(P) &&
        !worldPaused() &&
        document.querySelectorAll('#pcraft .cmnxu').length <= 1 &&
        bd.every(t => /^\d+$/.test(t)) &&
        /* 桌機：分頁名稱跟直立同一套、不寫手機手勢、面板不蓋生命／魔力條與技能列 */
        (TOUCH.on ||
          (/^總覽打造/.test(document.querySelector('#pcraft .ftabs').textContent) &&
            !/上拉全版/.test(document.querySelector('#pcraft .cmmore').textContent) &&
            !__hit(P, __r('.mid .bars')) &&
            !__hit(P, __r('.mid .bar')))),
      { 面板: P, 徽章: bd, 分頁: document.querySelector('#pcraft .ftabs').textContent }
    ];
  });
  await shot('11_角色', new Function(`closePanels(); NAV.view = 'char'; ${go('char')}; hudPanels();`));
  await shot('09_戰利品_空', new Function(`closePanels(); NAV.view = 'bag'; ${go('bag')}; hudPanels();`));
  await shot(
    '13_掉落紀錄_空',
    () => (closePanels(), openPanel('log')),
    () => {
      const t = (document.querySelector('#plog .none') || {}).textContent;
      /* 角標（「1」，M2-38 只寫數字）整顆看得到：中心那一點最上面的是它自己 */
      const pill = document.querySelector('#pnav .dot.pill, #dnav .dot.pill'),
        pr = __r(pill),
        top = pr && document.elementFromPoint(pr.x + pr.w / 2, pr.y + 3);
      return [
        t === '還沒有掉落。刷地點時，稀有以上的掉落會記在這裡（最近 50 筆）。' &&
          __in(__r('#plog')) &&
          /* 手機橫向的分頁列藏著（角標沒畫出來）；其他模式找不到角標算失敗 */
          (TOUCH.on && !PORT() ? !pr : !!pr && (pill.contains(top) || top === pill.parentNode)),
        { 空狀態: t, 角標: pr }
      ];
    }
  );
  await shot(
    '15_天賦樹總覽',
    () => ((S.camp.altar = 4), closePanels(), treeOpen()),
    () => [TREE.open, { 開著: TREE.open }]
  );
  await shot(
    '16_死亡卡_手動',
    () => {
      treeClose();
      closePanels();
      S.auto = 0;
      S.mat.soul = 1e5;
      matAdd('wood', 0, 1e4);
      P.hp = 0;
      die();
    },
    () => {
      const bs = [...document.querySelectorAll('#over .pbtns .btn')].map(e => [e.className, __r(e)]),
        pz = __r('#paused'),
        card = __r('#over .card');
      return [
        /pri/.test(bs[0][0]) &&
          bs[0][1].h >= 48 &&
          bs[1][1].h >= 48 &&
          bs[2][1].h >= 44 &&
          __in(card) &&
          !__hit(pz, bs[0][1]),
        { 鈕: bs.map(b => b[0] + ':' + b[1].h), 已暫停: pz, 卡: card }
      ];
    }
  );
  if (errs.length) fail++;
  console.log(errs.length ? '❌ 頁面錯誤 ' + errs.slice(0, 3).join(' / ') : '✅ 沒有頁面錯誤');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
