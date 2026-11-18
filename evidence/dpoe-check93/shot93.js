const { chromium } = require('playwright');
const VW = +process.argv[2], VH = +process.argv[3], OUT = 'evidence/dpoe-check93', MOB = VW < 900;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME });
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, hasTouch: MOB, isMobile: MOB, deviceScaleFactor: 2 });
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8000/?' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof treeInit === 'function');
  await p.waitForTimeout(800);
  await p.evaluate(() => { localStorage.clear(); S = newGame(); try { introStop(); } catch (e) {} proSkip(); S.story.tips = 0; S.auto = 1; ST = stats(); runNode(TRUNK_K[0]); });
  await p.waitForTimeout(1500);
  const setup = () => p.evaluate(() => {
    for (let w = 0; w <= 26; w++) { S.camp.watch = w; if (tierCap() === 2) break; }
    S.mat = newMat(); for (let T = 1; T <= 6; T++) matAdd('iron', T, 5);
    return tierCap();
  });
  const cap = await setup();
  // 自測：tierCap=T2 直接呼叫 tradeDo 換 T2→T3
  const direct = await p.evaluate(() => {
    const L = tradeList(), i = L.findIndex(x => x.g[0] === 'iron' && x.g[1] === 2);
    const bf = [1,2,3,4,5,6].map(T => matN('iron', T)).join();
    const r = tradeDo(String(i));
    const af = [1,2,3,4,5,6].map(T => matN('iron', T)).join();
    return { i, why: L[i].why, ret: r, bf, af, same: bf === af };
  });
  await setup();
  await p.evaluate(() => { closePanels(); S.camp.store = 4; CAMPUI.open = 'store'; CRAFT.tab = 'camp'; PANEL.ctab = 'camp'; });
  if (MOB) await p.evaluate(() => navGo('craft')); else await p.evaluate(() => openPanel('craft'));
  await p.waitForTimeout(700);
  await p.evaluate(() => { const e = document.querySelector('#pcraft .ccopen'); if (e) e.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(400);
  const ui = await p.evaluate(() => {
    const bs = [...document.querySelectorAll('#pcraft [data-fg^="tr:"]')].map(e => ({ t: e.textContent, dis: e.disabled, op: getComputedStyle(e).opacity, title: e.title }));
    const subs = [...document.querySelectorAll('#pcraft .ccopen > p.sub')].map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent, cut: e.scrollWidth > e.clientWidth + 1, inView: r.left >= 0 && r.right <= innerWidth, ov: getComputedStyle(e).overflow, ws: getComputedStyle(e).whiteSpace }; });
    return { bs, subs };
  });
  await p.screenshot({ path: `${OUT}/locked_${VW}x${VH}.png` });
  const mats = () => p.evaluate(() => [1,2,3,4,5,6].map(T => matN('iron', T)).join());
  const before = await mats();
  const locked = '#pcraft [data-fg^="tr:"][disabled]';
  const nLocked = await p.locator(locked).count();
  for (let k = 0; k < nLocked; k++) { const l = p.locator(locked).nth(k); if (MOB) await l.tap({ force: true }); else await l.click({ force: true }); await p.waitForTimeout(150); }
  const after = await mats();
  // 可換的那顆按下去應該真的換（對照）
  const open1 = '#pcraft [data-fg^="tr:"]:not([disabled])';
  const firstOpen = await p.locator(open1).first().textContent();
  if (MOB) await p.locator(open1).first().tap(); else await p.locator(open1).first().click();
  await p.waitForTimeout(300);
  const after2 = await mats();
  await p.screenshot({ path: `${OUT}/after_click_${VW}x${VH}.png` });
  const out = { VW, VH, cap, direct, ui, before, nLocked, afterLockedClicks: after, lockedSame: before === after, firstOpen, afterOpenClick: after2, errs };
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
