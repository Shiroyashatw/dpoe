// RULINGS-2 一次修清單第 4～11 項的實測（1280×720）。用法：node items.js <url> <out>
const { open, fixture, padInit, press, fs, path } = require('./lib');
const URL = process.argv[2], OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const R = {}; const rec = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v).slice(0, 1800)); };
const clip = (p, n, c) => p.screenshot({ path: path.join(OUT, n + '.png'), clip: { x: c[0], y: c[1], width: c[2], height: c[3] } });
const RC = [780, 60, 500, 520];
(async () => {
  const p = await open(URL); const w = ms => p.waitForTimeout(ms); const E = (f, a) => p.evaluate(f, a);
  await p.keyboard.press('v'); await w(400);
  await p.click('#pinv [data-c="eq:helm"]'); await w(200);
  // ---- 10 焦點標示 ----
  await E(padInit);
  const fst = () => E(() => { const e = document.activeElement, s = getComputedStyle(e); return { c: e.dataset && e.dataset.c, filter: s.filter, outline: [s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset].join(' '), fv: e.matches(':focus-visible'), kb: $('pinv').classList.contains('kb'), sel: e.classList && e.classList.contains('sel') }; });
  const f = {};
  await p.click('#pinv [data-c="eq:chest"]'); await w(120); f.afterClickChest = await fst();
  await press(p, 13); f.padDown = await fst(); const fb = await E(() => { const r = document.activeElement.getBoundingClientRect(); return [r.x, r.y]; });
  await p.mouse.move(300, 300); await w(80);
  await clip(p, 'item10-focus-after-click-pad-down', [780, 130, 500, 440]);
  await p.click('#pinv [data-c="eq:helm"]'); await w(150); f.afterClickHelm = await fst(); await p.mouse.move(300, 300); await w(80);
  await press(p, 15); f.padRight = await fst(); await clip(p, 'item10-focus-pad-right-cand', RC);
  await press(p, 15); f.padRight2 = await fst();
  // 點候選格（換上）後再用方向鍵
  await p.mouse.move(500, 300); await p.mouse.move(300, 300); await w(100);
  const c1 = await E(() => { const e = $('pinv').querySelector('.c12g .cq.nq') || $('pinv').querySelector('.c12g .cq'); const r = e.getBoundingClientRect(); return [r.x + 32, r.y + 32, e.dataset.c]; });
  await p.mouse.click(c1[0], c1[1]); await w(150); f.afterClickCand = await fst();
  await p.mouse.move(300, 300); await w(80);
  await press(p, 15); f.padRightAfterCandClick = await fst();
  await press(p, 14); f.padLeftBack = await fst();
  // 焦點移到選中格（.sel）
  await E(() => $('pinv').querySelector('.cq.sel').focus()); await E(() => $('pinv').classList.add('kb')); await w(50); f.onSelWithKb = await fst();
  // 滑鼠點一下：.kb 收掉
  await p.mouse.click(300, 300); await w(80); f.afterMouseClickOutside = await E(() => $('pinv') && $('pinv').classList.contains('kb'));
  if (!(await E(() => !!PANEL.inv))) { await p.keyboard.press('v'); await w(300); }
  // 鍵盤 Tab：點過滑鼠後按 Tab
  await p.click('#pinv [data-c="eq:chest"]'); await w(100); await p.keyboard.press('Tab'); await w(80); f.tabAfterClick = await fst();
  // 只移動滑鼠（沒點）之後方向鍵
  await p.mouse.move(820, 250); await p.mouse.move(300, 300); await press(p, 13); f.padAfterMouseMoveOnly = await fst();
  rec('item10_focus', f);
  R._errs = p._errs; console.log('errs', p._errs);
  fs.writeFileSync(path.join(OUT, 'focus.json'), JSON.stringify(R, null, 1));
  await p._b.close();
})();
