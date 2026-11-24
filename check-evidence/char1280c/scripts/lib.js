// check3 共用：開瀏覽器（/usr/bin/google-chrome＝預裝 Playwright Chromium 的包裝）、固定亂數、同 check2 的存檔
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const EXE = process.env.PW_CHROME || '/usr/bin/google-chrome';
const seedInit = seed => { let a = seed >>> 0; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const setup = () => {
  proSkip(); S.story.tips = 0; S.lv = 49; S.asc = 'wind';
  for (const e of EQS) { if (e.k === 'ring3' || e.k === 'off') continue;
    const B = BASES.filter(b => b.k === e.t && b.lv <= 20); S.eq[e.k] = mkItem(B[B.length - 1].id, 20, 2); }
  const H = BASES.filter(b => b.k === 'helm');
  for (let i = 0; i < 14; i++) invPut(S.inv, mkItem(H[i % H.length].id, 8 + i * 4, [2, 1, 0][i % 3]));
  S.eq.chest.cor = 1; S.eq.chest.frac = S.eq.chest.a[0].k; S.eq.boots.cor = 1;
  S.eq.boots.cal = { g: { k: 'g_hp', v: 10 }, b: { k: 'b_resF', v: 20 } };
  S.eq.amulet.mem = rollMem(Object.keys(MEM)[0]); S.eq.weapon.wy = 'wangyin_guixu'; changed();
};
// 單防禦 2 條對 3 條（對示意圖 04a／04b，同 check2 v3.js）
const fixture = () => {
  const H = BASES.filter(b => b.k === 'helm'), def = b => ['armor', 'ev', 'es'].filter(k => b.b[k]).length;
  const one = H.filter(b => def(b) === 1 && !eqLack(S, mkItem(b.id, 9, 2), 'helm').length), two = H.filter(b => def(b) === 2 && b.lv <= 30);
  const roll = (base, n, lv) => { let it; for (let i = 0; i < 400; i++) { it = mkItem(base.id, lv, 2); if (it.a.length >= n) break; } it.a = it.a.slice(0, n); it.q = 0; return it; };
  S.inv.items = S.inv.items.filter(x => !slotCands('helm').includes(x));
  S.eq.helm = roll(one[0], 2, 9); const A = roll(one[one.length - 1], 3, 14); A.q = 0.05; invPut(S.inv, A);
  const B6 = roll(two[0], 6, 30); invPut(S.inv, B6);
  window.__fx = { A: A.id, B6: B6.id, two: two[0].id };
  changed(); NAV.slot = 'helm'; hudPanels(); return window.__fx;
};
async function open(url, { w = 1280, h = 720, dpr = 1, seed = 20261124, battle = true, camp = false } = {}) {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await ctx.route(/supabase/, r => r.abort());
  await ctx.addInitScript(`(${seedInit})(${seed})`);
  const p = await ctx.newPage(); p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.goto(url + '?' + Date.now()); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(setup);
  if (battle) { await p.evaluate(() => runNode(TRUNK_K[0])); await p.waitForTimeout(2500); }
  await p.evaluate(() => document.fonts.ready);
  p._b = b;
  return p;
}
const padInit = () => { window.__pad = { buttons: [...Array(17)].map(() => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, mapping: 'standard', id: 'mock', index: 0 }; navigator.getGamepads = () => [window.__pad]; dispatchEvent(new Event('gamepadconnected')); };
const press = async (p, i, hold = 80) => { await p.evaluate(i => (__pad.buttons[i].pressed = true), i); await p.waitForTimeout(hold); await p.evaluate(i => (__pad.buttons[i].pressed = false), i); await p.waitForTimeout(80); };
module.exports = { open, setup, fixture, padInit, press, fs, path, EXE };
