const { chromium } = require('playwright'); const fs = require('fs');
const setup = fs.readFileSync('v2.js', 'utf8').match(/const setup = \(\) => \{[\s\S]*?\n\};/)[0];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage(); await p.goto('http://localhost:8200/?' + Date.now()); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(setup + ';setup()'); await p.evaluate(() => runNode(TRUNK_K[0])); await p.waitForTimeout(2500);
  await p.keyboard.press('v'); await p.waitForTimeout(400); const R = {};
  // 找 ④ 一行放不下、詳細模式詞綴被截的樣本
  const ex = await p.evaluate(() => { const H = BASES.filter(b => b.k === 'helm'); S.inv.items = S.inv.items.filter(x => !slotCands('helm').includes(x)); const ids = []; for (let i = 0; i < 60; i++) { const it = mkItem(H[i % H.length].id, 10 + (i % 40), 2); invPut(S.inv, it); ids.push(it.id); } changed(); NAV.slot = 'helm'; hudPanels(); let l4 = null, tr = null, n4 = 0, ntr = 0, nw = 0;
    for (const id of ids) { const it = S.inv.items.find(x => x.id === id); if (cantWear(it)) continue; nw++; CH.alt = 0; CH.hov = null; chHov(id); let c = $('pinv').querySelector('.c12p'); const q = c.querySelector('.l4 p'); if (q.scrollWidth > q.clientWidth + .5) { n4++; if (!l4 || q.scrollWidth > l4[2]) l4 = [id, q.clientWidth, q.scrollWidth, q.innerText, [...q.children].map(s => { const r = s.getBoundingClientRect(), pr = q.getBoundingClientRect(); return [s.textContent, Math.round(r.left), Math.round(r.right), Math.round(pr.right)]; })]; }
      CH.alt = 1; CH.hov = null; chHov(id); c = $('pinv').querySelector('.c12p'); const bs = [...c.querySelectorAll('.l3 li b')].filter(b => b.scrollWidth > b.clientWidth + .5); if (bs.length) { ntr++; if (!tr || bs.length > tr[1]) tr = [id, bs.length, bs.map(b => [b.textContent, b.clientWidth, b.scrollWidth, b.nextElementSibling.textContent])]; } }
    CH.alt = 0; chHov(null); return { l4, tr, n4, ntr, nw }; });
  R.ex = ex; console.log(JSON.stringify(ex).slice(0, 1500));
  if (ex.l4) { await p.evaluate(id => { const e = $('pinv').querySelector(`[data-c="cand:${id}"]`); e.scrollIntoView({ block: 'nearest' }); }, ex.l4[0]); await p.hover(`#pinv [data-c="cand:${ex.l4[0]}"]`); await p.waitForTimeout(150); await p.screenshot({ path: 'ev/shots/issue-l4-overflow.png' }); }
  if (ex.tr) { await p.mouse.move(300, 300); await p.evaluate(id => { const e = $('pinv').querySelector(`[data-c="cand:${id}"]`); e.scrollIntoView({ block: 'nearest' }); }, ex.tr[0]); await p.hover(`#pinv [data-c="cand:${ex.tr[0]}"]`); await p.keyboard.down('Alt'); await p.waitForTimeout(150); await p.screenshot({ path: 'ev/shots/issue-det-affix-ellipsis.png' }); await p.keyboard.up('Alt'); }
  // 滑鼠點過之後用手把移焦點：焦點看得出來嗎
  await p.mouse.click(1000, 120); await p.mouse.move(300, 300); await p.waitForTimeout(100);
  await p.evaluate(() => { window.__pad = { buttons: [...Array(17)].map(() => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }; navigator.getGamepads = () => [window.__pad]; dispatchEvent(new Event('gamepadconnected')); });
  const press = async i => { await p.evaluate(i => (__pad.buttons[i].pressed = true), i); await p.waitForTimeout(70); await p.evaluate(i => (__pad.buttons[i].pressed = false), i); await p.waitForTimeout(90); };
  await press(13); await press(13);
  R.focusAfterClick = await p.evaluate(() => { const f = document.activeElement, s = getComputedStyle(f); return [f.dataset.c, f.matches(':focus-visible'), s.filter, s.outlineStyle, f.classList.contains('sel')]; });
  await p.screenshot({ path: 'ev/shots/issue-pad-focus-after-click.png' });
  console.log(JSON.stringify(R.focusAfterClick));
  // 像素：右欄框與分層線顏色
  await p.mouse.move(300, 300); await p.evaluate(() => { NAV.slot = 'helm'; hudPanels(); }); await p.hover('#pinv .c12g .cq:not(.nq)'); await p.waitForTimeout(150); await p.screenshot({ path: 'ev/shots/px-lines.png' });
  R.lines = await p.evaluate(() => [...$('pinv').querySelectorAll('.c12p section')].map(s => { const r = s.getBoundingClientRect(); return [s.className, r.left, r.right, r.bottom - 1]; }));
  fs.writeFileSync('ev/shots/issues.json', JSON.stringify(R, null, 1)); await b.close();
})();
