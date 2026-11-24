const { chromium } = require('playwright'); const fs = require('fs');
const setup = fs.readFileSync('v2.js', 'utf8').match(/const setup = \(\) => \{[\s\S]*?\n\};/)[0];
const OFF = 'body:not(.touch) #pinv.c12{box-shadow:inset 0 0 0 1px var(--panel-edge)!important}';
(async () => {
  const b = await chromium.launch();
  for (let load = 0; load < 6; load++) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage(); await p.goto('http://localhost:8200/?' + Date.now()); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(setup + ';setup()'); await p.evaluate(() => runNode(TRUNK_K[0])); await p.waitForTimeout(2500);
    await p.keyboard.press('v'); await p.waitForTimeout(800); await p.mouse.move(300, 300);
    await p.evaluate(() => { window.requestAnimationFrame = () => 0; }); await p.waitForTimeout(60);
    const set = async css => { await p.evaluate(css => { let s = document.getElementById('vx'); if (!s) { s = document.createElement('style'); s.id = 'vx'; document.head.appendChild(s); } s.textContent = css; }, css); await p.waitForTimeout(250); };
    let i = 0; const dom = [];
    for (const [tag, css] of [['on', ''], ['on-again', null], ['off', OFF], ['off-again', null], ['on', ''], ['off', OFF], ['off-ruleA', OFF + '#zzz{color:red}'], ['off-ruleB', OFF + '#zzz{color:blue}'], ['on', ''], ['on-pinvOutline', '#pinv{outline:1px solid transparent}'], ['on', '']]) {
      if (css != null) await set(css);
      await p.screenshot({ path: `ev/hud4/L${load}-${String(i++).padStart(2, '0')}-${tag}.png` });
      dom.push(await p.evaluate(() => { const f = $('bhF1'), v = f.querySelector('.v'); return [f.getAttribute('style'), getComputedStyle(v).backgroundImage, $('bhF1').outerHTML.length, $('bmp').outerHTML.replace(/data:[^"]+/g, '').length]; }));
    }
    fs.writeFileSync(`ev/hud4/L${load}-dom.json`, JSON.stringify(dom));
    await ctx.close();
  }
  await b.close();
})();
