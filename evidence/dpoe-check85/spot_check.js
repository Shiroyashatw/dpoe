/* dpoe-check85 行為抽驗（獨立寫的，不改遊戲）：390×844 與 1280×720 各一次
   (b) 刷圖中按 T／點回營地 → 營地 (c) 刷圖暫停後停在營地（含重新整理） (d) origin/main 舊程式產生的真實舊存檔載入 → 營地、資料不遺失
   (e) 營地中主角不會自己走動（記 5 秒座標）
   用法：8000 = PR HEAD、8001 = origin/main worktree；node spot_check.js 輸出資料夾 */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const OUT = process.argv[2],
  NEW = 'http://localhost:8000/',
  OLD = 'http://localhost:8001/';
let fail = 0;
const ok = (c, n, v = '') => {
  if (!c) fail++;
  console.log(`${c ? '✅' : '❌'} ${n}`, typeof v === 'string' ? v : JSON.stringify(v));
};
const ctxOf = (b, W, H) => {
  const mob = W < 900;
  return b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: mob, isMobile: mob });
};
const boot = async (p, url) => {
  await p.goto(url + '?' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof S === 'object');
  await p.waitForTimeout(1000);
};
/* 舊程式（origin/main）產生舊存檔：有進度、在刷圖中自己回藏身處（stopWhy 'home'），再塞早期殘留的 scene 欄位 */
async function oldSave(b) {
  const ctx = await ctxOf(b, 1280, 720);
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  await boot(p, OLD);
  await p.evaluate(() => localStorage.clear());
  await boot(p, OLD);
  const o = await p.evaluate(async () => {
    proSkip();
    S.gold = 12345;
    runNode(TRUNK_K[0]);
    await new Promise(r => setTimeout(r, 1500));
    act('home');
    await new Promise(r => setTimeout(r, 500));
    const scene = G.scene;
    save();
    const raw = JSON.parse(localStorage.getItem(KEY + SLOT));
    raw.scene = 'hide';
    return { raw, scene, key: KEY + SLOT };
  });
  await ctx.close();
  return o;
}
const fp = s => ({
  gold: s.gold,
  lv: s.lv,
  xp: s.xp,
  inv: JSON.stringify(s.inv || null).length,
  stash: JSON.stringify(s.stash || null).length,
  gems: JSON.stringify(s.gems || null).length,
  eq: JSON.stringify(s.eq || null).length,
  world: JSON.stringify(s.world || null),
  camp: JSON.stringify(s.camp || null).length
});
async function run(b, W, H, old) {
  const mob = W < 900,
    tag = `${W}x${H}`;
  const ctx = await ctxOf(b, W, H);
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const shot = n => p.screenshot({ path: path.join(OUT, `spot_${tag}_${n}.png`) });
  /* (d) 舊存檔：新 context、頁面腳本跑之前就寫進 localStorage（只寫第一次，避免換頁時的自動存檔蓋掉） */
  await ctx.addInitScript(o => {
    if (!sessionStorage.getItem('inj')) {
      localStorage.clear();
      localStorage.setItem(o.key, JSON.stringify(o.raw));
      sessionStorage.setItem('inj', '1');
    }
  }, old);
  await boot(p, NEW);
  const st = await p.evaluate(() => ({ scene: G.scene, stopWhy: S.stopWhy, hasScene: 'scene' in S }));
  const after = await p.evaluate(() => S);
  const a = fp(after),
    bfp = fp(old.raw);
  ok(
    st.scene === 'camp' && st.stopWhy === 'camp' && !st.hasScene,
    `${tag} (d) 舊存檔（main 產生：stopWhy='${old.raw.stopWhy}'、scene='hide'）→ 營地、stopWhy camp、scene 欄位拿掉`,
    st
  );
  const diff = Object.keys(a).filter(k => k !== 'camp' && a[k] !== bfp[k]);
  ok(!diff.length && a.gold === 12345, `${tag} (d) 舊存檔資料不遺失（金、等級、經驗、背包、倉庫、寶石、裝備、世界）`, diff.length ? { diff, a, bfp } : `gold ${a.gold} lv ${a.lv}`);
  await shot('d_old_save');
  /* 換成手動測試：設定方向 */
  await p.evaluate(mob => {
    S.story.tips = 0;
    S.orient = mob ? 'p' : 'l';
    if (mob) setTouch(true);
    applyOrient();
  }, mob);
  /* (e) 營地主角不動：5 秒每 0.5 秒記座標 */
  await p.evaluate(() => enterCamp());
  await p.waitForTimeout(500);
  const pos = [];
  for (let i = 0; i < 10; i++) {
    pos.push(await p.evaluate(() => [Math.round(P.x * 10) / 10, Math.round(P.y * 10) / 10, G.scene]));
    await p.waitForTimeout(500);
  }
  ok(
    pos.every(q => q[0] === pos[0][0] && q[1] === pos[0][1] && q[2] === 'camp'),
    `${tag} (e) 營地 5 秒內主角座標不變`,
    pos.map(q => q.slice(0, 2).join(',')).join(' ')
  );
  await shot('e_camp_idle');
  /* (b) 刷圖中按 T（桌機實際按鍵兩次）／手機 ☰ →回營地 → 確認 */
  await p.evaluate(() => runNode(TRUNK_K[0]));
  await p.waitForTimeout(1500);
  ok((await p.evaluate(() => G.scene)) === 'map', `${tag} (b) 先進地圖刷`);
  if (mob) {
    await p.locator('[data-tm="nav:more"]:visible').first().tap(); /* 直立：底部「更多」→「回營地」 */
    await p.waitForTimeout(300);
    await p.locator('[data-tm=camp]:visible').first().tap();
  } else await p.keyboard.press('t');
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => G.ask === 'camp' && !$('over').hidden && /回營地/.test($('over').textContent)), `${tag} (b) 出現「回營地」確認卡`);
  await shot('b_ask');
  if (mob) await p.locator('#over [data-a=camp]:visible').first().tap();
  else await p.keyboard.press('t');
  await p.waitForTimeout(800);
  ok(await p.evaluate(() => G.scene === 'camp'), `${tag} (b) 回到營地場景`);
  /* (c) 刷圖暫停停在營地 */
  ok(
    await p.evaluate(() => G.scene === 'camp' && S.stopWhy === 'camp' && /繼續刷/.test($('run').textContent)),
    `${tag} (c) 刷圖暫停、停在營地、有「繼續刷」`
  );
  await p.waitForTimeout(3000);
  ok(await p.evaluate(() => G.scene === 'camp'), `${tag} (c) 3 秒後仍在營地（沒有自動開刷）`);
  await shot('c_paused_camp');
  await p.evaluate(() => {
    S.auto = 1;
    save();
  });
  await boot(p, NEW);
  await p.waitForTimeout(2000);
  ok(await p.evaluate(() => G.scene === 'camp' && S.stopWhy === 'camp'), `${tag} (c) 自動模式重新整理後仍停在營地`);
  await shot('c_reload_camp');
  ok(!errs.length, `${tag} 沒有頁面錯誤`, errs.slice(0, 3).join(' | '));
  await ctx.close();
}
(async () => {
  const b = await chromium.launch();
  const old = await oldSave(b);
  console.log('舊程式產生舊存檔：回去後 G.scene =', old.scene, '、stopWhy =', old.raw.stopWhy, '、gold =', old.raw.gold);
  await run(b, 390, 844, old);
  await run(b, 1280, 720, old);
  await b.close();
  console.log(fail ? `❌ ${fail} 項沒過` : '全部通過');
  process.exit(fail ? 1 : 0);
})();
