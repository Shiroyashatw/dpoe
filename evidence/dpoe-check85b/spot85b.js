/* dpoe-check85b 行為抽驗：node spot85b.js <輸出資料夾> [網址] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const OUT = process.argv[2],
  URL = process.argv[3] || 'http://localhost:8000/';
let fail = 0,
  pass = 0;
const ok = (c, n, v = '') => {
  c ? pass++ : fail++;
  console.log(`${c ? '✅' : '❌'} ${n}`, typeof v === 'string' ? v : JSON.stringify(v));
};
async function run(b, W, H) {
  const mob = W < 900,
    tag = `${W}x${H}`;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: mob, isMobile: mob });
  let cloud = 0;
  const sbu = [];
  await ctx.route(/supabase/, r => (/supabase\.co/.test(r.request().url()) && cloud++, sbu.push(r.request().url().slice(0, 80)), r.abort()));
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const load = async () => {
    await p.goto(URL + '?p=85b&' + Date.now());
    await p.waitForFunction(() => typeof G === 'object' && !!G.scene && !!S);
    await p.waitForTimeout(1500);
  };
  const shot = n => p.screenshot({ path: path.join(OUT, `spot_${tag}_${n}.png`) });
  const st = () => p.evaluate(() => ({ scene: G.scene, stop: S.stopWhy, x: Math.round(P.x), y: Math.round(P.y), ask: G.ask }));
  await load();
  await p.evaluate(() => localStorage.clear());
  await load();
  await p.evaluate(mob => {
    proSkip();
    S.story.tips = 0;
    S.orient = mob ? 'p' : 'l';
    if (mob) setTouch(true);
    applyOrient();
    enterCamp();
  }, mob);
  await p.waitForTimeout(800);
  /* (e) 營地中主角不自己走動：自動模式開著，6 秒每 0.5 秒記座標；桌機再按 WASD */
  await p.evaluate(() => (S.auto = 1));
  const xs = [];
  for (let i = 0; i < 12; i++) {
    xs.push(await p.evaluate(() => [Math.round(P.x * 10) / 10, Math.round(P.y * 10) / 10]));
    if (!mob && i === 4) for (const k of 'wasd') await p.keyboard.down(k);
    if (!mob && i === 8) for (const k of 'wasd') await p.keyboard.up(k);
    await p.waitForTimeout(500);
  }
  console.log(`   ${tag} 營地座標（6 秒，第 2–4 秒${mob ? '無輸入' : '按住 WASD'}）：`, JSON.stringify(xs));
  ok(xs.every(q => q[0] === xs[0][0] && q[1] === xs[0][1]) && (await p.evaluate(() => G.scene)) === 'camp', `${tag} (e) 營地中主角 6 秒不動`);
  await shot('e_camp_idle');
  /* (b) 刷圖中回營地 */
  await p.evaluate(() => runNode(TRUNK_K[0]));
  await p.waitForTimeout(2500);
  ok((await st()).scene === 'map', `${tag} 已進刷圖`, await st());
  if (mob) {
    console.log('   本次掛機卡開著：', await p.evaluate(() => !$('pidle').hidden), '→ closePanels() 後點「更多」');
    await p.evaluate(() => closePanels());
    await p.waitForTimeout(300);
    await p.tap('#pnav [data-tm="nav:more"]');
    await p.waitForTimeout(400);
    await p.tap('#pmore .mrow[data-tm=camp]');
  } else await p.keyboard.press('t');
  await p.waitForTimeout(400);
  const a1 = await st();
  ok(a1.scene === 'map' && a1.ask === 'camp' && /回營地/.test(await p.textContent('#over')), `${tag} (b) ${mob ? '更多→回營地' : '第一次 T'}：出確認卡、還在地圖`, a1);
  await shot('b_ask');
  if (mob) await p.tap('#over [data-a=camp]');
  else await p.keyboard.press('t');
  await p.waitForTimeout(1000);
  const a2 = await st();
  ok(a2.scene === 'camp' && a2.stop === 'camp', `${tag} (b) 確認後回到營地`, a2);
  await shot('b_back_camp');
  /* (c) 刷圖暫停停在營地：等 6 秒不會自己出發；重新整理也在營地、有「繼續刷」 */
  await p.waitForTimeout(6000);
  const c1 = await st();
  ok(c1.scene === 'camp' && c1.stop === 'camp', `${tag} (c) 6 秒後仍在營地（沒自己繼續刷）`, c1);
  await p.evaluate(() => save());
  await load();
  const c2 = await st();
  const resume = await p.evaluate(() => !!document.querySelector('#run [data-a=resume]'));
  ok(c2.scene === 'camp' && c2.stop === 'camp' && resume, `${tag} (c) 重新整理後停在營地、有「繼續刷」`, { ...c2, resume });
  await shot('c_reload_camp');
  /* 名牌與「繼續刷」鈕矩形（CSS px） */
  await p.mouse.move(W - 5, H - 5);
  const m = await p.evaluate(() => {
    const out = [],
      orig = window.plate;
    window.plate = function (txt, x, y, col, a) {
      CX.font = '700 14px "Noto Sans TC", sans-serif';
      const t = CX.getTransform(),
        w = CX.measureText(txt).width + 18,
        c = CV.getBoundingClientRect(),
        q = CV.width / c.width,
        f = (X, Y) => [(t.a * X + t.c * Y + t.e) / q + c.left, (t.b * X + t.d * Y + t.f) / q + c.top],
        [l, tp] = f(x - w / 2, y - 15),
        [r, bt] = f(x + w / 2, y + 10);
      out.push({ txt, l: +l.toFixed(1), t: +tp.toFixed(1), r: +r.toFixed(1), b: +bt.toFixed(1) });
      return orig.apply(this, arguments);
    };
    return new Promise(res =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          window.plate = orig;
          const e = document.querySelector('#run [data-a=resume]'),
            R = e && e.getBoundingClientRect();
          res({ btn: R && { l: R.left, t: R.top, r: R.right, b: R.bottom }, plates: out });
        })
      )
    );
  });
  const B = m.btn,
    hit = m.plates.filter(q => B && q.l < B.r && q.r > B.l && q.t < B.b && q.b > B.t);
  const forge = m.plates.find(q => /鍛造/.test(q.txt));
  console.log(`   ${tag} 繼續刷鈕：`, JSON.stringify(B));
  console.log(`   ${tag} 名牌：`, JSON.stringify(m.plates));
  ok(!!forge && !hit.length, `${tag} 「繼續刷」鈕不蓋任何名牌（含鍛造台）`, { forge, hit });
  await shot('nameplate');
  /* (d) 舊存檔：scene 'hide'、stopWhy 'home'，資料不遺失 */
  const before = await p.evaluate(() => {
    S.gold = 12345;
    S.lv = Math.max(S.lv || 1, 7);
    const it0 = Object.values(S.eq).find(Boolean);
    if (it0) for (let i = 0; i < 3; i++) S.inv.items.push(JSON.parse(JSON.stringify(it0)));
    const o = JSON.parse(JSON.stringify(S));
    Object.assign(o, { stopWhy: 'home', scene: 'hide', farm: 0, auto: 1 });
    o.savedAt = o.offAt = Date.now();
    localStorage.setItem(KEY + SLOT, JSON.stringify(o));
    return { gold: o.gold, lv: o.lv, inv: (o.inv.items || []).length, cur: o.world.cur, eq: Object.values(o.eq).filter(Boolean).length, camp: JSON.stringify(o.camp), story: JSON.stringify(o.story) };
  });
  await load();
  const after = await p.evaluate(() => ({
    gold: S.gold,
    lv: S.lv,
    inv: (S.inv.items || []).length,
    cur: S.world.cur,
    eq: Object.values(S.eq).filter(Boolean).length,
    camp: JSON.stringify(S.camp),
    story: JSON.stringify(S.story),
    scene: G.scene,
    stop: S.stopWhy,
    hasScene: 'scene' in S
  }));
  ok(after.scene === 'camp' && after.stop === 'camp' && !after.hasScene, `${tag} (d) 舊存檔載入轉成營地`, { scene: after.scene, stop: after.stop, hasScene: after.hasScene });
  ok(
    after.gold >= before.gold && after.lv === before.lv && after.inv === before.inv && after.cur === before.cur && after.eq === before.eq && before.inv > 0 && after.story === before.story,
    `${tag} (d) 金幣、等級、倉庫件數、地點、劇情旗標不遺失`,
    { before: { gold: before.gold, lv: before.lv, inv: before.inv, cur: before.cur, eq: before.eq }, after: { gold: after.gold, lv: after.lv, inv: after.inv, cur: after.cur, eq: after.eq } }
  );
  await shot('d_old_save');
  ok(!errs.length, `${tag} 沒有頁面錯誤`, errs.slice(0, 3).join(' | '));
  ok(!cloud, `${tag} 沒有連雲端`, String(cloud));
  await ctx.close();
}
(async () => {
  const b = await chromium.launch();
  await run(b, 390, 844);
  await run(b, 1280, 720);
  await b.close();
  console.log(`✅ ${pass}／❌ ${fail}`);
  process.exit(fail ? 1 : 0);
})();
