const { chromium } = require('playwright'); const fs = require('fs');
const setup = fs.readFileSync('v2.js', 'utf8').match(/const setup = \(\) => \{[\s\S]*?\n\};/)[0];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage(); await p.goto('http://localhost:8200/?' + Date.now()); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(setup + ';setup()'); await p.evaluate(() => runNode(TRUNK_K[0])); await p.waitForTimeout(2500);
  await p.keyboard.press('v'); await p.waitForTimeout(800); await p.mouse.move(300, 300);
  await p.evaluate(() => { window.requestAnimationFrame = () => 0; }); await p.waitForTimeout(100);
  const cdp = await ctx.newCDPSession(p); let layers = []; cdp.on('LayerTree.layerTreeDidChange', e => { if (e.layers) layers = e.layers; }); await cdp.send('DOM.enable'); await cdp.send('LayerTree.enable');
  const set = async css => { await p.evaluate(css => { let s = document.getElementById('vx'); if (!s) { s = document.createElement('style'); s.id = 'vx'; document.head.appendChild(s); } s.textContent = css; }, css); await p.waitForTimeout(300); };
  const OFF = 'body:not(.touch) #pinv.c12{box-shadow:inset 0 0 0 1px var(--panel-edge)!important}';
  const lay = async () => { const out = []; for (const l of layers) { let why = []; try { why = (await cdp.send('LayerTree.compositingReasons', { layerId: l.layerId })).compositingReasons; } catch (e) {} let node = ''; if (l.backendNodeId) { try { const d = await cdp.send('DOM.describeNode', { backendNodeId: l.backendNodeId }); node = d.node.nodeName + (d.node.attributes ? ' ' + d.node.attributes.join(' ').slice(0, 50) : ''); } catch (e) {} } out.push(`${Math.round(l.offsetX)},${Math.round(l.offsetY)} ${Math.round(l.width)}x${Math.round(l.height)} draws=${l.drawsContent} [${node}] ${why.join('+')}`); } return out; };
  const R = {};
  for (const [k, css] of [['on', ''], ['off', OFF], ['on2', ''], ['off_noTrans', OFF + '*{transition:none!important}'], ['on_noTrans', '*{transition:none!important}'], ['off_animPaused', OFF + '*,*::before,*::after{animation-play-state:paused!important}'], ['on_animPaused', '*,*::before,*::after{animation-play-state:paused!important}'], ['off_animNone', OFF + '#bh *,#bh *::before,#bh *::after{animation:none!important}'], ['on_animNone', '#bh *,#bh *::before,#bh *::after{animation:none!important}']]) {
    await set(css); await p.screenshot({ path: `ev/hud2/c-${k}.png` }); R[k] = await lay();
  }
  R.f1 = await p.evaluate(() => [...document.querySelectorAll('#bhF0, #bhF0 *, #bhF1, #bhF1 *, #bmp, #bmp *, #bhp, #bhp *')].map(e => { const out = []; for (const ps of [null, '::before', '::after']) { const s = getComputedStyle(e, ps); if (ps && s.content === 'none') continue; const r = e.getBoundingClientRect(); out.push([(e.id || e.tagName + '.' + e.className) + (ps || ''), [r.x, r.y, r.width, r.height].map(Math.round).join(','), 'anim=' + s.animationName + ' ' + s.animationDuration + ' ' + s.animationIterationCount, 'tr=' + s.transitionProperty + ' ' + s.transitionDuration, 'op=' + s.opacity, 'tf=' + s.transform, 'bg=' + s.backgroundImage.slice(0, 60), 'h=' + s.height, 'filter=' + s.filter, 'ir=' + s.imageRendering].join(' ; ')); } return out; }).flat());
  R.html = await p.evaluate(() => $('bhF1').outerHTML.replace(/data:image[^"]+/g, 'IMG'));
  fs.writeFileSync('ev/hud2/layers.json', JSON.stringify(R, null, 1));
  console.log('layers on', R.on.length, 'off', R.off.length); console.log('ON:\n' + R.on.join('\n')); console.log('OFF:\n' + R.off.join('\n')); console.log(R.f1.join('\n')); console.log(R.html);
  await b.close();
})();
