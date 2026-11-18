const { chromium } = require('playwright');
const OUT = process.argv[2];
let bad = 0;
const ok = (n, c, info = '') => { console.log((c ? '✅ ' : '❌ ') + n + ' ' + info); if (!c) bad++; };
async function open(b, w, h, opt = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, ...opt });
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  const p = await ctx.newPage();
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto('http://localhost:8000/?p=6&' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof treeInit === 'function');
  await p.waitForTimeout(500);
  await p.evaluate(() => { proSkip(); S.world.done = TRUNK_K.slice(0, 12); S.camp.watch = 26; { const e = campKey('tree'); if (e) S.camp[e[0]] = Math.max(S.camp[e[0]] || 0, e[1]); } S.auto = 1; runNode(TRUNK_K[9]); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { G.mobs = G.mobs.filter(m => !m.boss); G.bossOut = 0; G.prog = Math.round(G.need * 0.4); HV.boss = null; hudState(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { G.mobs = G.mobs.filter(m => !m.boss); G.bossOut = 0; HV.boss = null; });
  await p.waitForTimeout(100);
  console.log('state', JSON.stringify(await p.evaluate(() => ({ scene: G.scene, node: G.node, arena: !!G.arena, bossOut: G.bossOut, prog: !$('prog').hidden, tree: campCan('tree') }))));
  return p;
}
const R = s => `(() => { const e = document.querySelector('${s}'); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom)]; })()`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
  /* ---------- 桌機 1280×720 ---------- */
  const p = await open(b, 1280, 720);
  await p.evaluate(() => { const m = G.mobs.find(x => !x.boss); });
  const prog = await p.evaluate(R('#prog')), nav = await p.evaluate(R('#dnav'));
  const tabs = await p.evaluate(() => [...document.querySelectorAll('#dnav button')].map(e => { const r = e.getBoundingClientRect(); return [e.dataset.tm, (e.querySelector('kbd') || {}).textContent, Math.round(r.left), Math.round(r.right)]; }));
  console.log('desk #prog', JSON.stringify(prog), '#dnav', JSON.stringify(nav), JSON.stringify(tabs));
  ok('(c) 桌機 #prog x 360–840、y 20–42', prog && prog[0] === 360 && prog[1] === 840 && prog[2] === 20 && prog[3] === 42, JSON.stringify(prog));
  ok('(c) 桌機分頁 x 848–1264 且不與 #prog 重疊', tabs.length && Math.min(...tabs.map(t => t[2])) >= 848 && Math.max(...tabs.map(t => t[3])) <= 1264 && prog[1] < Math.min(...tabs.map(t => t[2])), JSON.stringify([Math.min(...tabs.map(t => t[2])), Math.max(...tabs.map(t => t[3]))]));
  ok('(b) 鍵帽 V K G P H Z', tabs.map(t => t[1]).join('') === 'VKGPHZ', tabs.map(t => t[1]).join(' '));
  await p.screenshot({ path: OUT + '/desk_1280x720_combat.png' });
  await p.mouse.click(640, 400); /* 焦點回畫面 */
  await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  const on = () => p.evaluate(() => navOn());
  const keyRes = {};
  for (const [k, want] of [['v', 'char'], ['k', 'forge'], ['g', 'skill'], ['p', 'tree'], ['h', 'craft'], ['z', 'more']]) {
    await p.evaluate(() => { closePanels(); if (TREE.open) treeClose(); document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
    await p.keyboard.press(k); await p.waitForTimeout(150);
    keyRes[k] = await on();
  }
  ok('(b) V K G P H Z 各開對應分頁', JSON.stringify(keyRes) === JSON.stringify({ v: 'char', k: 'forge', g: 'skill', p: 'tree', h: 'craft', z: 'more' }), JSON.stringify(keyRes));
  await p.evaluate(() => { if (TREE.open) treeClose(); closePanels(); document.activeElement && document.activeElement.blur && document.activeElement.blur(); navGo('char'); });
  await p.waitForTimeout(100);
  const seq = [await on()];
  for (let i = 0; i < 6; i++) { await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await p.keyboard.press('Tab'); await p.waitForTimeout(120); seq.push(await on()); }
  const back = [];
  for (let i = 0; i < 2; i++) { await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await p.keyboard.press('Shift+Tab'); await p.waitForTimeout(120); back.push(await on()); }
  ok('(b) Tab 依序換分頁、繞回', seq.join(',') === 'char,forge,skill,tree,craft,more,char', seq.join(','));
  ok('(b) Shift+Tab 往回', back.join(',') === 'more,craft', back.join(','));
  await p.evaluate(() => { if (TREE.open) treeClose(); closePanels(); document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
  await p.keyboard.press('i'); await p.waitForTimeout(120);
  const iv = await p.evaluate(() => [!!PANEL.inv, NAV.view, navOn()]);
  await p.evaluate(() => closePanels());
  await p.keyboard.press('b'); await p.waitForTimeout(120);
  const bv = await p.evaluate(() => [!!PANEL.inv, NAV.view, navOn()]);
  ok('(b) I／B 開倉庫段（背包 view=bag）', iv[0] && iv[1] === 'bag' && bv[0] && bv[1] === 'bag', JSON.stringify([iv, bv]));
  await p.evaluate(() => closePanels());
  /* Esc 逐層：開更多→設定（子層）→Esc→Esc */
  await p.evaluate(() => { navGo('char'); });
  await p.waitForTimeout(100);
  const e0 = await p.evaluate(() => [anyPanel(), navOn()]);
  await p.keyboard.press('Escape'); await p.waitForTimeout(120);
  const e1 = await p.evaluate(() => [!!anyPanel(), navOn(), !!PANEL.set]);
  await p.keyboard.press('Escape'); await p.waitForTimeout(120);
  const e2 = await p.evaluate(() => [!!anyPanel(), navOn(), Object.keys(PANEL).filter(k => PANEL[k] === true)]);
  ok('(b) Esc：先關開著的分頁，沒面板時再按開設定', !e1[0] || e1[1] === '' , JSON.stringify({ e0, e1, e2 }));
  await p.evaluate(() => closePanels());
  await p.waitForFunction(() => G.state === 'play'); await p.evaluate(() => { for (const m of G.mobs) (m.dmg = 0), (m.hp = m.mhp = 1e9); P.hp = ST.hp * 0.5; P.mp = 1; P.cds.flask = P.cds.mflask = 0; S.auto = 0; });
  const f0 = await p.evaluate(() => [P.cds.flask || 0, P.cds.mflask || 0]);
  await p.keyboard.press('1'); await p.waitForTimeout(400);
  await p.keyboard.press('2'); await p.waitForTimeout(400);
  const f1 = await p.evaluate(() => [P.cds.flask, P.cds.mflask, navOn(), !!anyPanel()]);
  ok('(b) 1／2 是藥、不開分頁', f1[0] > 0 && f1[1] > 0 && f1[2] === '' && !f1[3], JSON.stringify([f0, f1]));
  const set = await p.evaluate(() => KEYS_PC.map(x => x.join('|')).join('\n'));
  require('fs').writeFileSync(OUT + '/keys_pc.txt', set);
  await p.evaluate(() => (S.auto = 1));
  /* ---------- (d) 連死 3 次 ---------- */
  await p.evaluate(() => { chaseOf(S).pts = 210; });
  const d0 = await p.evaluate(() => ({ node: G.node, t0: SES && SES.t0, pts: chaseOf(S).pts, pct: chasePct() }));
  await p.evaluate(() => { window.WL = []; const o = hudWarn; hudWarn = (t, ms) => (WL.push([Math.round(performance.now()), t, ms]), o(t, ms)); const w = $('warn'); new MutationObserver(() => WL.push([Math.round(performance.now()), 'class', w.className])).observe(w, { attributes: true, attributeFilter: ['class'] }); });
  for (let i = 0; i < 3; i++) {
    await p.evaluate(() => die());
    await p.waitForFunction(() => G.state === 'play', null, { timeout: 8000 });
    await p.waitForTimeout(200);
  }
  const t3 = Date.now();
  const d1 = await p.evaluate(() => ({ node: G.node, t0: SES && SES.t0, pts: chaseOf(S).pts, pct: chasePct(), over: !$('over').hidden, warn: $('warn').textContent, wOn: $('warn').classList.contains('on'), dur: $('warn').style.animationDuration, cards: [...document.querySelectorAll('.card,.pcard,#over:not([hidden])')].filter(e=>e.offsetParent).length, prev: TRUNK_K[8] }));
  ok('(d) 退回上一個地點', d0.node === (await p.evaluate(() => TRUNK_K[9])) && d1.node === d1.prev, JSON.stringify({ from: d0.node, to: d1.node }));
  ok('(d) 不出停機卡／死亡卡（#over 隱藏）', !d1.over && !/已停下|繼續刷/.test(await p.evaluate(() => document.body.innerText)), JSON.stringify(d1.over));
  ok('(d) 一行提示、6000ms', d1.wOn && /連死 3 次/.test(d1.warn) && !/\n/.test(d1.warn) && d1.dur === '6000ms', JSON.stringify([d1.warn, d1.dur]));
  ok('(d) SES.t0 不歸零、保底不歸零', d1.t0 === d0.t0 && d1.pts === d0.pts, JSON.stringify({ d0, t0: d1.t0, pts: d1.pts }));
  await p.waitForFunction(() => !$('warn').classList.contains('on'), null, { timeout: 9000 });
  const wdur = Date.now() - t3; console.log('WL', JSON.stringify(await p.evaluate(() => WL)));
  ok('(d) 提示實際亮 ~6000ms 後消失（從第 3 次回到戰場起算）', wdur > 4500 && wdur < 7000, wdur + ' ms');
  /* 手動開面板停、自動不停 */
  await p.waitForFunction(() => G.state === 'play');
  const pz = await p.evaluate(async () => {
    const r = {}; for (const m of G.mobs) (m.dmg = 0), (m.hp = m.mhp = 1e9); P.hp = ST.hp;
    S.auto = 0; openPanel('inv'); r.manual = worldPaused(); const gt = G.t; await new Promise(z => setTimeout(z, 500)); r.manualDt = +(G.t - gt).toFixed(3); closePanels();
    S.auto = 1; openPanel('inv'); r.auto = worldPaused(); r.why = { ask: !!G.ask, st: G.state, tree: !!TREE.open, sk: !!skPicking(), off: !!OFFC.on }; const gt2 = G.t; await new Promise(z => setTimeout(z, 500)); r.autoDt = +(G.t - gt2).toFixed(3); closePanels();
    return r;
  });
  ok('(d) 手動開面板停、自動不停', pz.manual && !pz.auto && pz.manualDt === 0 && pz.autoDt > 0.2, JSON.stringify(pz));
  console.log('desk errs', JSON.stringify(p.errs));
  /* ---------- 直立 390×844 ---------- */
  const q = await open(b, 390, 844, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const pr2 = await q.evaluate(R('#prog'));
  ok('(c) 直立 #prog 8–290 × 86–102', pr2 && pr2[0] === 8 && pr2[1] === 290 && pr2[2] === 86 && pr2[3] === 102, JSON.stringify(pr2));
  const kb = await q.evaluate(() => document.querySelectorAll('#dnav kbd').length);
  ok('觸控不顯示鍵帽', kb === 0, kb);
  await q.waitForTimeout(1500);
  await q.screenshot({ path: OUT + '/port_390x844_combat.png' });
  console.log('port errs', JSON.stringify(q.errs));
  /* 桌機離王條：等王出現 */
  await p.evaluate(() => { for (let k = 0; k < 400; k++) { const m = G.mobs.find(x => x.hp > 0 && !x.boss); if (!m || G.mobs.some(x => x.boss)) break; killMob(m); G.mobs = G.mobs.filter(x => x !== m); } });
  await p.waitForTimeout(400);
  const pg = await p.evaluate(() => [$('progt') && $('progt').textContent, !$('prog').hidden]);
  console.log('desk prog text', JSON.stringify(pg));
  await p.screenshot({ path: OUT + '/desk_1280x720_prog.png' });
  console.log(bad ? `❌ ${bad}` : 'ALL OK');
  await b.close();
  process.exit(bad ? 1 : 0);
})();
