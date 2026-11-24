// char_check 兩個時好時壞斷言的成因：(a) V-1 迴圈在負載下  (b) 手把段 .c12p 消失
const { chromium } = require('playwright'); const fs = require('fs');
const setup = fs.readFileSync('v2.js', 'utf8').match(/const setup = \(\) => \{[\s\S]*?\n\};/)[0];
const mode = process.argv[2];
(async () => {
  const b = await chromium.launch(); const out = [];
  for (let n = 0; n < +process.argv[3]; n++) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage(); await p.goto('http://localhost:8200/?' + Date.now()); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(setup + ';setup()');
    await p.evaluate(() => { window.__ev = []; let __m = CH.menu; Object.defineProperty(CH, 'menu', { get: () => __m, set: v => { __ev.push(['menu=' + v, Math.round(performance.now()), new Error().stack.split('\n').slice(2, 6).map(s => s.trim().replace('http://localhost:8200/js/', '').slice(0, 60)).join(' < ')]); __m = v; } }); for (const t of ['pointerdown', 'click', 'contextmenu', 'keydown']) addEventListener(t, e => __ev.push(['EV ' + t, Math.round(performance.now()), e.isTrusted, (e.target.id || e.target.className || e.target.tagName) + '', e.key || '']), true); const cp = closePanels; closePanels = function () { __ev.push(['closePanels', Math.round(performance.now()), new Error().stack.split('\n').slice(2, 5).map(s => s.trim().slice(0, 70)).join(' < ')]); return cp.apply(this, arguments); }; const ch = chHov; chHov = function (id) { if (CH.hov !== id) __ev.push(['chHov', id, Math.round(performance.now()), new Error().stack.split('\n').slice(2, 4).map(s => s.trim().slice(0, 60)).join(' < ')]); return ch.apply(this, arguments); }; });
    if (mode === 'a') {
      await p.evaluate(() => runNode(TRUNK_K[0])); await p.waitForTimeout(2500);
      await p.keyboard.press('v'); await p.waitForTimeout(300);
      // 前面 char_check 做過的事略過；直接跑 V-1 迴圈 6 輪
      const rows = [];
      for (let k = 0; k < 6; k++) for (const xy of [[300, 300], [400, 650], [640, 20], 'Escape']) {
        if (!(await p.evaluate(() => PANEL.inv))) await p.keyboard.press('v');
        await p.$eval('#pinv .cr', e => e.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
        await p.waitForTimeout(80);
        const o = await p.evaluate(() => [!!$('pinv').querySelector('.cmenu'), !!PANEL.inv, CH.menu, $('pinv').classList.contains('c12'), !$('over').hidden, Math.round(P.hp), NAV.view, typeof chOn === 'function' && chOn()]);
        if (!o[0]) await p.evaluate(() => __ev.push(['FAIL-MARK', Math.round(performance.now()), JSON.stringify([CH.edit, $('pinv').querySelectorAll('.cr').length, $('pinv').querySelector('.cr') && $('pinv').querySelector('.cr').dataset.c, CH.op, G.scene])])); if (xy === 'Escape') await p.keyboard.press('Escape'); else await p.mouse.click(xy[0], xy[1]);
        await p.waitForTimeout(120);
        rows.push([String(xy), ...o, await p.evaluate(() => [!!$('pinv').querySelector('.cmenu'), !!PANEL.inv])]);
      }
      const badRows = rows.filter(r => !r[1]);
      out.push({ n, bad: badRows.length, badRows, ev: badRows.length ? await p.evaluate(() => (() => { const i = __ev.findIndex(e => e[0] === 'FAIL-MARK'); return __ev.slice(Math.max(0, i - 12), i + 1); })()) : [] });
      console.log('a', n, 'bad', badRows.length, JSON.stringify(badRows).slice(0, 600), badRows.length ? JSON.stringify(out[out.length - 1].ev).slice(0, 2600) : '');
    } else {
      // 手把段照 char_check：不等待、滑鼠停在頭盔格上
      await p.evaluate(() => { window.PADB = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })); window.PADA = [0, 0, 0, 0]; navigator.getGamepads = () => [window.PADON ? { buttons: window.PADB, axes: window.PADA } : null]; });
      if (mode === 'c') { await p.evaluate(() => runNode(TRUNK_K[0])); await p.waitForTimeout(2500); }
      await p.keyboard.press('v'); await p.click('#pinv [data-c="eq:helm"]'); await p.focus('#pinv .c12g .cq');
      await p.evaluate(() => ((window.PADON = 1), dispatchEvent(new Event('gamepadconnected'))));
      const t = []; for (let i = 0; i < 12; i++) { t.push(await p.evaluate(() => [!!$('pinv').querySelector('.c12p'), CH.hov, document.activeElement.dataset ? document.activeElement.dataset.c : null])); await p.waitForTimeout(250); }
      const ev = await p.evaluate(() => __ev.filter(e => e[0] === 'chHov'));
      const lost = t.some(x => !x[0]);
      out.push({ n, lost, t: t.map(x => (x[0] ? 1 : 0)).join(''), focus: t[t.length - 1][2], ev });
      console.log(mode, n, 'popup', t.map(x => (x[0] ? 1 : 0)).join(''), 'focus', t[t.length - 1][2], JSON.stringify(ev).slice(0, 500));
    }
    await ctx.close();
  }
  fs.writeFileSync(`ev/shots/flaky-${mode}.json`, JSON.stringify(out, null, 1)); await b.close();
})();
