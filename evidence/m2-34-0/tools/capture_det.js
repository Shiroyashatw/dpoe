/* M2-34-0 決定性截圖：由 PR #28 visual-audit-1117/tools/capture.js 改來，畫面與步驟完全相同，只改三件事讓兩次截圖可以逐像素比對：
   1) Playwright clock 暫停時間、只用 runFor 推進（rAF、setTimeout、Date、performance 都是假時間）
   2) Math.random 固定種子
   3) 截圖前把所有 CSS 動畫／轉場停在固定時間點
   用法：node capture_det.js <portrait|desktop> <網址> <輸出資料夾>
   以下為原說明：視覺量測（只量不改）：開遊戲、走到各畫面，每個畫面
   1) 凍結（停 rAF、停 CSS 動畫）→ 截圖 shots/<size>/<畫面>.png
   2) 列出看得到的 DOM 文字（顏色含 opacity、外框、字級、對應 CSS 規則）＋這一格 canvas 的 fillText
   3) 把 DOM 文字設成透明再截一張（背景圖，放 RAW 資料夾）
   用法：先在 repo 根目錄開 python3 -m http.server 8000；node capture.js <portrait|desktop> [網址] [RAW 資料夾] */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const SIZE = process.argv[2] || 'portrait',
  URL = process.argv[3] || 'http://localhost:8000/',
  RAW = process.argv[4] || path.join(__dirname, '..', 'raw');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(RAW, SIZE);
fs.mkdirSync(OUT, { recursive: true });
const PORTRAIT = SIZE === 'portrait';
const CTX = PORTRAIT
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };

const INIT = () => {
  let a = 20261117;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
/* 截圖前：所有 CSS 動畫／轉場停在固定時間（有限的停在結尾，無限的停在 1234ms） */
const PIN = () =>
  document.getAnimations().forEach(an => {
    const t = an.effect && an.effect.getComputedTiming();
    an.pause();
    an.currentTime = t && isFinite(t.endTime) ? t.endTime : 1234;
  });

const FREEZE_CSS =
  '*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}';
const HIDE_CSS =
  '*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important}svg text{fill:transparent!important;stroke:none!important}';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext(CTX);
  await ctx.route(/supabase/, r => r.abort());
  await ctx.addInitScript(INIT);
  await ctx.clock.install({ time: new Date('2026-11-17T12:00:00Z') });
  await ctx.clock.pauseAt(new Date('2026-11-17T12:00:01Z'));
  const p = await ctx.newPage(),
    errs = [],
    log = [];
  p.on('pageerror', e => errs.push(e.message));
  const wait = ms => p.clock.runFor(ms);
  await p.goto(URL + '?p=77');
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene, null, { timeout: 30000, polling: 100 });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 30000, polling: 100 });
  await wait(1000);
  await wait(2500);

  const shot = async (name, how) => {
    try {
      await wait(250);
      await p.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 30000, polling: 100 });
      await p.evaluate(() => document.fonts.ready);
      await p.evaluate(PIN);
      await p.screenshot({ path: path.join(OUT, name + '.png'), animations: 'allow', caret: 'hide' });
      log.push({ screen: name, ok: true, how });
      console.log('📷', SIZE, name);
    } catch (e) {
      log.push({ screen: name, ok: false, how, err: String(e.message || e).slice(0, 300) });
      console.log('❌', name, e.message);
    }
  };
  const ev = async (f, arg) => {
    try {
      await p.evaluate(f, arg);
      return true;
    } catch (e) {
      console.log('⚠️ evaluate', e.message.slice(0, 200));
      return e.message.slice(0, 200);
    }
  };
  const port = PORTRAIT;
  const open = k => ev(([port, k]) => (closePanels(), port ? navGo(k) : openPanel(k)), [port, k]);

  /* 開場動畫（新存檔第一次進來） */
  await shot('01_開場動畫', '新存檔（localStorage 清空）重新整理後 2.5 秒，開場動畫播放中');
  await ev(() => {
    try {
      introStop();
    } catch (e) {}
    proSkip();
    S.story.tips = 0;
    S.orient = innerWidth > innerHeight ? 'l' : 'p';
    applyOrient();
  });
  await wait(1500);
  await shot('02_藏身處', 'introStop()＋proSkip() 跳過開場，落在藏身處');
  await ev(() => (closePanels(), openPanel('node')));
  await shot('03_地點清單', 'openPanel("node")（地點清單＝唯一入口）');
  /* 準備資料：裝備、材料、靈魂、營地等級（讓面板有東西可看） */
  await ev(() => {
    closePanels();
    for (let i = 0; i < 24; i++) invPut(S.inv, dropItem(i < 8 ? 5 : 3));
    S.mat.soul = 12000;
    for (const k in CUR) S.mat[k] = (S.mat[k] || 0) + 7;
    matAdd('wood', 0, 800);
    Object.assign(S.camp, { forge: 3, altar: 2 });
    S.auto = 1;
    ST = stats();
    runNode(TRUNK_K[0]);
  });
  await wait(7000);
  await shot('04_戰鬥中', 'runNode(TRUNK_K[0]) 自動戰鬥 7 秒（含 canvas 傷害數字）');
  await ev(() => banner('崇高石 ×1', 'cur'));
  await wait(300);
  await shot('05_戰鬥_橫幅', '戰鬥中呼叫 banner("崇高石 ×1","cur")（稀有掉落橫幅）');
  await ev(() => {
    for (let i = 0; i < 4; i++) dropLog(['蛻變石', '增幅石', '富豪石', '崇高石'][i], 'cur');
  });
  await wait(300);
  await shot('06_戰鬥_掉落紀錄', '呼叫 dropLog() 四次，HUD 的掉落紀錄列');
  await open(port ? 'bag' : 'inv');
  await shot('07_戰利品倉庫', port ? 'navGo("bag")' : 'openPanel("inv")');
  /* tooltip：桌機 hover、手機點一件 */
  if (port) {
    const row = await p.$('#pinv .bag > *');
    if (row) await row.tap().catch(() => row.evaluate(e => e.click()));
    await wait(500);
    await shot('08_物品說明_點擊', '戰利品清單點第一件（手機 tap），出換裝卡／說明');
  } else {
    const row = await p.$('#pinv .bag > *');
    if (row) await row.hover();
    await wait(700);
    await shot('08_物品說明_hover', '戰利品清單滑鼠移到第一件（hover）');
  }
  if (port) await open('char');
  else await ev(() => ((NAV.view = 'char'), hudPanels()));
  await shot('09_角色', port ? 'navGo("char")' : 'NAV.view="char"＋hudPanels()');
  await open('skill');
  await shot('10_技能總覽', 'skill 面板');
  await ev(() => document.querySelector('#pskill [data-sk="go:one:0"]').click());
  await shot('11_技能這一招', '技能總覽點第一招');
  await ev(() => ((CRAFT.tab = 'camp'), (CAMPUI.open = null)));
  await open('craft');
  await shot('12_營地總覽', 'CRAFT.tab="camp" 開營地面板');
  const cc = async k => {
    const b = await p.$(`#pcraft [data-fg="cc:${k}"]`);
    if (!b) return 'no button';
    try {
      await b.scrollIntoViewIfNeeded();
      await (PORTRAIT ? b.tap({ timeout: 5000 }) : b.click({ timeout: 5000 }));
    } catch (e) {
      await b.evaluate(e => e.click()); /* 被蓋住或在動：改用 DOM click */
    }
    await wait(500);
    return (await p.evaluate(() => CAMPUI.open)) || 'closed';
  };
  let r = await cc('wood');
  await shot('13_產生器_林場展開', '營地總覽點林場卡標題 [data-fg="cc:wood"]（捲到看得到）；CAMPUI.open=' + r);
  r = await cc('forge');
  await shot('14_營地設施_鍛造台展開', '點鍛造台卡標題 [data-fg="cc:forge"]；CAMPUI.open=' + r);
  await ev(() => ((CAMPUI.open = null), (CRAFT.tab = 'make'), hudPanels()));
  await shot('15_打造', 'CRAFT.tab="make"（鍛造／打造頁）');
  await ev(() => ((CRAFT.tab = 'forge'), hudPanels()));
  await shot('16_鍛造台_填', 'CRAFT.tab="forge"（S.camp.forge=3 開的鍛造台分頁）');
  await ev(() => (closePanels(), (PANEL.stab = 'cur'), openPanel('stash')));
  await shot('17_通貨', 'openPanel("stash")，PANEL.stab="cur"');
  await ev(() => (closePanels(), openPanel('log')));
  await shot('18_掉落紀錄面板', 'openPanel("log")');
  if (port) {
    await open('more');
    await shot('19_更多', 'navGo("more")');
  }
  await ev(() => (closePanels(), openPanel('set')));
  await shot('20_設定', 'openPanel("set")');
  /* 名詞 tooltip：找第一個 .term */
  await ev(() => closePanels());
  await open('skill');
  await ev(() => document.querySelector('#pskill [data-sk="go:one:0"]').click());
  const term = await p.$('#pskill .term, #pskill [data-term]');
  if (term) {
    if (port) await term.tap().catch(() => term.evaluate(e => e.click()));
    else {
      await term.hover();
      await wait(400);
      /* hover 之後面板可能重畫、原本的元素被換掉：重新找一次再點 */
      await (await p.$('#pskill .term, #pskill [data-term]')).click();
    }
    await wait(600);
    await shot(
      port ? '21_名詞說明_點擊' : '21_名詞說明_hover',
      '技能這一招裡第一個名詞（' + (port ? 'tap' : 'hover 後 click；只 hover 不會出說明') + '）'
    );
  } else log.push({ screen: '21_名詞說明', ok: false, how: '', err: '技能頁找不到 .term／[data-term] 元素' });
  await ev(() => (closePanels(), (S.camp.altar = 4), treeOpen()));
  await wait(800);
  await shot('22_天賦樹', 'S.camp.altar=4（祭壇夠了才開天賦樹）＋treeOpen()');
  await ev(() => (treeClose(), closePanels(), (S.camp.forge = 3)));
  /* 彈窗：打造翻牌 */
  const rv = await ev(() => {
    matAdd('wood', 0, 5000);
    for (let t = 1; t <= 2; t++) ['iron', 'hide', 'silk'].forEach(k => matAdd(k, t, 500));
    CRAFT.tab = 'make';
    openPanel('craft');
    craftGo();
  });
  await wait(1200);
  await shot(
    '23_彈窗_打造翻牌',
    '給材料、營地→打造頁、呼叫 craftGo()（同打造鈕），出 revealOpen 打造模式；結果：' + rv
  );
  await ev(() => {
    closePanels();
    offShow(null, { wood: 1234, iron: 56 }, 3600e3);
  });
  await wait(1200);
  await shot('24_彈窗_離線結算', 'offShow(null,{wood:1234,iron:56},1 小時)');
  await ev(() => {
    closePanels();
    S.auto = 0;
    G.ask = 'home';
    hudState && hudState();
  });
  await wait(500);
  await shot('25_彈窗_回家確認', 'S.auto=0＋G.ask="home"（回藏身處確認卡）');
  await ev(() => {
    G.ask = 0;
    closePanels();
    S.auto = 0;
    P.hp = 0;
    die();
  });
  await wait(900);
  await shot('26_死亡卡', 'S.auto=0、P.hp=0、die()（手動模式死亡卡）');
  fs.writeFileSync(
    path.join(OUT, '_log.json'),
    JSON.stringify({ size: SIZE, ctx: CTX, url: URL, errs, log }, null, 1)
  );
  console.log(errs.length ? '頁面錯誤：' + errs.slice(0, 5).join(' / ') : '沒有頁面錯誤');
  await b.close();
})();
