// main vs PR：同一份存檔，390×844／375×667 角色頁與 1280×720 倉庫（L）＃pinv 的 DOM 與版面是否一樣
const { chromium } = require('playwright'); const fs = require('fs');
const setup = 'const setup = ' + require('./lib').setup.toString();
const sig = () => { const P = $('pinv'); const out = []; const walk = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); out.push([e.tagName, e.className && e.className.baseVal == null ? e.className : '', Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), s.fontSize, s.fontWeight, s.color, s.backgroundColor, s.display].join('|')); for (const c of e.children) walk(c); }; walk(P); return { n: out.length, sig: out, cls: P.className, hidden: P.hidden, html: P.innerHTML.replace(/data:image[^"]+/g, 'IMG').length }; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' }); const res = {};
  let save = null;
  for (const [W, H, touch, how] of [[360, 640, 1, 'char'], [390, 844, 1, 'char'], [390, 844, 1, 'bag'], [375, 667, 1, 'char'], [1280, 720, 0, 'bag'], [1280, 720, 0, 'charsw']]) {
    const r = {};
    for (const [name, port] of [['pr', 8102], ['main', 8101]]) {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: !!touch, isMobile: !!touch });
      await ctx.route(/supabase/, x => x.abort());
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.goto(`http://localhost:${port}/?` + Date.now()); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
      if (!save) { await p.evaluate(setup + ';setup()'); await p.evaluate(() => { for (const c of [0, 1]) { const k = Object.keys(BASEI).find(k => BASEI[k].k === 'charm'); if (k) { const it = mkItem(k, 20, 1); invPut(S.inv, it); } } save(); }); save = await p.evaluate(() => localStorage.getItem('dungeonpoe_v1')); }
      await p.evaluate(s => localStorage.setItem('dungeonpoe_v1', s), save); await p.reload(); await p.waitForTimeout(1800);
      await p.evaluate(() => { S.story.tips = 0; G.paused = 1; });
      await p.evaluate(how => { if (how === 'bag') navGo('bag'); else navGo('char'); if (how === 'charsw') { const it = S.inv.items.find(x => x.charm); if (it) { CHSW = it.id; hudPanels(); } } }, how);
      await p.waitForTimeout(900);
      await p.evaluate(() => hudPanels()); await p.waitForTimeout(200);
      r[name] = await p.evaluate(sig); r[name].errs = errs; r[name].state = await p.evaluate(() => [NAV.view, typeof CHSW !== 'undefined' ? CHSW : null, typeof chOn === 'function' ? chOn() : 'n/a']);
      await p.screenshot({ path: `ev/main-vs-pr/${W}x${H}-${how}-${name}.png` });
      await ctx.close();
    }
    const a = r.pr.sig, m = r.main.sig; const diffs = []; for (let i = 0; i < Math.max(a.length, m.length); i++) if (a[i] !== m[i]) diffs.push([i, m[i], a[i]]);
    res[`${W}x${H}-${how}`] = { nMain: m.length, nPr: a.length, cls: [r.main.cls, r.pr.cls], state: [r.main.state, r.pr.state], diff: diffs.length, first: diffs.slice(0, 6), errs: [r.main.errs, r.pr.errs] };
    console.log(`${W}x${H}-${how}`, JSON.stringify(res[`${W}x${H}-${how}`]).slice(0, 1800));
  }
  fs.writeFileSync('ev/main-vs-pr/main-vs-pr.json', JSON.stringify(res, null, 1)); await b.close();
})();
