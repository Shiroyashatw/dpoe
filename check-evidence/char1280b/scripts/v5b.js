// fix4 疑點：開右欄陰影後，右欄內與 HUD 生命／魔力條兩端的色差從哪來
const { chromium } = require('playwright'); const fs = require('fs'); const { PNG } = (() => { try { return require('pngjs'); } catch (e) { return {}; } })();
const setup = fs.readFileSync('v2.js', 'utf8').match(/const setup = \(\) => \{[\s\S]*?\n\};/)[0];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage(); await p.goto('http://localhost:8200/?' + Date.now()); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(setup + ';setup()'); await p.evaluate(() => runNode(TRUNK_K[0])); await p.waitForTimeout(2500);
  await p.keyboard.press('v'); await p.waitForTimeout(800); await p.mouse.move(300, 300);
  // 停住：rAF、計時器重畫、CSS 動畫與轉場
  await p.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await p.waitForTimeout(60);
  const variant = async css => { await p.evaluate(css => { let s = document.getElementById('vx'); if (!s) { s = document.createElement('style'); s.id = 'vx'; document.head.appendChild(s); } s.textContent = css; }, css); await p.waitForTimeout(250); };
  const V = {
    on: '',
    off: 'body:not(.touch) #pinv.c12{box-shadow:inset 0 0 0 1px var(--panel-edge)!important}',
    faint: 'body:not(.touch) #pinv.c12{box-shadow:inset 0 0 0 1px var(--panel-edge),0 12px 40px rgb(var(--scrim-rgb),0.004)!important}',
    tiny: 'body:not(.touch) #pinv.c12{box-shadow:inset 0 0 0 1px var(--panel-edge),0 0 1px rgb(var(--scrim-rgb),0.6)!important}',
    noanim: 'body:not(.touch) #pinv.c12{box-shadow:inset 0 0 0 1px var(--panel-edge)!important;animation:none!important}',
    onnoanim: '#pinv{animation:none!important}'
  };
  const order = ['on','off','on','off','on','off','on','off'];
  let i = 0; for (const k of order) { await variant(V[k]); await p.screenshot({ path: `ev/hud2/${String(i).padStart(2, '0')}-${k}.png` }); i++; }
  // 版面資訊：右欄、HUD 元件的框、層疊
  const info = await p.evaluate(() => { const g = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return { id: e.id || e.className, box: [r.x, r.y, r.width, r.height].map(v => +v.toFixed(2)), z: s.zIndex, pos: s.position, tf: s.transform, op: s.opacity, filt: s.filter, bf: s.backdropFilter, wc: s.willChange, anim: s.animationName, mix: s.mixBlendMode, ir: s.imageRendering }; };
    const at = (x, y) => document.elementsFromPoint(x, y).slice(0, 6).map(e => (e.id ? '#' + e.id : e.tagName + '.' + (e.className.baseVal ?? e.className)).slice(0, 40));
    return { pinv: g($('pinv')), pts: { '800,660': at(800, 660), '810,690': at(810, 690), '340,680': at(340, 680), '500,660': at(500, 660), '1240,90': at(1240, 90), '820,460': at(820, 460) }, bh: [...document.querySelectorAll('#bh, #bh *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.y > 600 && r.x < 900; }).slice(0, 60).map(g), dpr: devicePixelRatio, cv: g($('cv')) }; });
  fs.writeFileSync('ev/hud2/info.json', JSON.stringify(info, null, 1));
  await b.close();
})();
