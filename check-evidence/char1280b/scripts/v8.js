const { chromium } = require('playwright'); const fs = require('fs');
const setup = fs.readFileSync('v2.js', 'utf8').match(/const setup = \(\) => \{[\s\S]*?\n\};/)[0];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage(); await p.goto('http://localhost:8200/?' + Date.now()); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(setup + ';setup()'); await p.evaluate(() => runNode(TRUNK_K[0])); await p.waitForTimeout(2500);
  await p.keyboard.press('v'); await p.waitForTimeout(400);
  const ex = await p.evaluate(() => { const H = BASES.filter(b => b.k === 'helm'); S.inv.items = S.inv.items.filter(x => !slotCands('helm').includes(x)); const ids = []; for (let i = 0; i < 60; i++) { const it = mkItem(H[i % H.length].id, 10 + i, 2); invPut(S.inv, it); ids.push(it.id); } changed(); NAV.slot = 'helm'; hudPanels(); const out = { wear: [0, 0], nq: [0, 0], ex: [] };
    for (const id of ids) { const it = S.inv.items.find(x => x.id === id), k = cantWear(it) ? 'nq' : 'wear'; CH.hov = null; chHov(id); const q = $('pinv').querySelector('.c12p .l4 p'); out[k][1]++; if (q.scrollWidth > q.clientWidth + .5) { out[k][0]++; if (out.ex.length < 3) out.ex.push([id, k, q.clientWidth, q.scrollWidth, q.innerText]); } } chHov(null); return out; });
  console.log(JSON.stringify(ex));
  if (ex.ex.length) { await p.evaluate(id => $('pinv').querySelector(`[data-c="cand:${id}"]`).scrollIntoView({ block: 'nearest' }), ex.ex[0][0]); await p.hover(`#pinv [data-c="cand:${ex.ex[0][0]}"]`); await p.waitForTimeout(150); await p.screenshot({ path: 'ev/shots/issue-l4-overflow.png' }); }
  fs.writeFileSync('ev/shots/issue-l4.json', JSON.stringify(ex, null, 1)); await b.close();
})();
