/* dpoe-hotfix-ui 截圖與量測（不改遊戲；有 ❌ 結束碼 1）：掛機卡資源列（百萬級總量、千級以上速率）、角色頁裝備格（最高階詞的「T」角標）；
   390×844 另截戰利品、鍛造（換一件）的物品格。桌機 1280×720 用滑鼠（不開觸控）。
   用法：先開本機伺服器，node tools/hotfix_ui_shots.js [輸出資料夾] [網址] */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const OUT = process.argv[2] || path.join(__dirname, '..', 'evidence', 'dpoe-hotfix-ui'),
  URL = process.argv[3] || 'http://localhost:8000/';
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const ok = (c, n, v) => (c || fail++, console.log(`${c ? '✅' : '❌'} ${n} ${JSON.stringify(v)}`));
/* 資源列：每列的字與條不超出自己那一欄；物品格：圖示中心不在任何角標裡、角標不高過半格（桌機撐成左邊一條） */
const rbBad = () => {
  const bad = [];
  for (const e of document.querySelectorAll('#pidle .rbar')) {
    const r = e.getBoundingClientRect();
    for (const c of e.children)
      if (c.getBoundingClientRect().right > r.right + 0.5) bad.push(e.dataset.rb + ' ' + c.textContent);
  }
  return bad;
};
const icBad = () =>
  [...document.querySelectorAll('.it')]
    .filter(e => e.offsetParent)
    .filter(e => {
      const r = e.querySelector('img.ic').getBoundingClientRect(),
        x = r.left + r.width / 2,
        y = r.top + r.height / 2;
      return [...e.querySelectorAll(':scope > i')].some(i => {
        const q = i.getBoundingClientRect();
        return (
          (x >= q.left && x <= q.right && y >= q.top && y <= q.bottom) ||
          q.height > e.getBoundingClientRect().height / 2
        );
      });
    })
    .map(e => e.getAttribute('aria-label'));
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  for (const [W, H] of [
    [390, 844],
    [1280, 720]
  ]) {
    const mob = W < 900,
      tag = `${W}x${H}`;
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
    await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage();
    await p.goto(URL + '?' + Date.now());
    await p.waitForFunction(() => typeof proSkip === 'function');
    await p.evaluate(() => proSkip());
    await p.waitForTimeout(800);
    /* 掛機卡：產生器全開、材料與速率照 mumi 回報的量級 */
    await p.evaluate(async () => {
      closePanels();
      S.auto = 1;
      G.loot = null;
      for (const k of GEN_K) S.camp[k] = Math.max(S.camp[k] || 0, 30);
      const R = { wood: 2976 };
      for (const k of GEN_K)
        if (k !== 'wood' && genOn(k)) (R[matKey(k, genTier(k))] = 2400), matAdd(k, genTier(k), 671232);
      matAdd('wood', 0, 2644835);
      MAT().soul = 1234567;
      window.genRates = () => R;
      window.soulRate = () => 12345;
      RB.R = null;
      idleBar(1);
    });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/${tag}-idle.png` });
    ok(!(await p.evaluate(rbBad)).length, `${tag} 掛機卡資源列不超出欄位`, await p.evaluate(rbBad));
    /* 裝備：每一格一件稀有，詞都是這件能出的最高階（角標亮底的那種） */
    await p.evaluate(() => {
      const top = it => (it.a.forEach(a => (a.T = itemT(it))), it);
      for (const e of EQS.slice(0, 10)) {
        const B = BASES.find(b => b.k === e.t) || BASES[0];
        S.eq[e.k] = top(mkItem(B.id, 40, 2));
      }
      for (const k of ['helm', 'chest', 'ring', 'boots', 'gloves', 'amulet'])
        S.inv.items.push(top(mkItem(BASES.find(b => b.k === k).id, 40, 2)));
      S.curIt = S.inv.items[S.inv.items.length - 1];
      closePanels();
      navGo('char');
    });
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/${tag}-char.png` });
    ok(!(await p.evaluate(icBad)).length, `${tag} 角色頁裝備格圖示沒被角標蓋住`, await p.evaluate(icBad));
    if (mob) {
      await p.evaluate(() => (closePanels(), navGo('bag')));
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${OUT}/${tag}-bag.png` });
      ok(!(await p.evaluate(icBad)).length, `${tag} 戰利品物品格圖示沒被角標蓋住`, await p.evaluate(icBad));
      await p.evaluate(() => (closePanels(), act('ctab:cur'), act('pick')));
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${OUT}/${tag}-forge.png` });
      ok(!(await p.evaluate(icBad)).length, `${tag} 鍛造（換一件）物品格圖示沒被角標蓋住`, await p.evaluate(icBad));
    }
    await ctx.close();
    console.log('截好', tag);
  }
  await b.close();
  process.exit(fail ? 1 : 0);
})();
