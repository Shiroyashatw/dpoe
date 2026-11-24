// 清單 2（問題 4）：戰鬥中、滑鼠沒動，鍵盤／手把焦點開的比較浮窗不因面板重畫關掉。用法：node hov.js <url> <out.json> [截圖資料夾]
const { open, padInit, press, fs, path } = require('./lib');
const URL = process.argv[2], OUT = process.argv[3], SH = process.argv[4];
(async () => {
  const R = {};
  const mk = async () => { const p = await open(URL, { seed: 7 + Object.keys(R).length }); await p.evaluate(padInit); return p; };
  const state = p => p.evaluate(() => { const c = (document.activeElement.dataset || {}).c || ''; return { foc: c, hov: CH.hov, pop: !!$('pinv').querySelector('.c12p'), scene: G.scene }; });
  // 取樣 n 次；force＝每次先多畫一次 hudPanels()
  const sample = async (p, n, gap, force) => { const out = []; for (let i = 0; i < n; i++) { if (force) await p.evaluate(() => hudPanels()); await p.waitForTimeout(gap); const s = await state(p); out.push(s.foc.startsWith('cand:') && s.hov === +s.foc.slice(5) && s.pop ? 1 : 0); } return out; };
  const renders = p => p.evaluate(() => { window.__rn = 0; if (!window.__mo) { window.__mo = new MutationObserver(() => window.__rn++); window.__mo.observe($('pinv'), { childList: true }); } });
  // (i) 點頭盔格（游標停在右欄內的頭盔格上）→ 手把右 → 候選
  for (let t = 0; t < 6; t++) {
    const p = await mk(); const w = ms => p.waitForTimeout(ms);
    await p.keyboard.press('v'); await w(400); await p.click('#pinv [data-c="eq:helm"]'); await w(200);
    await renders(p); await press(p, 15); const s0 = await state(p);
    const nat = await sample(p, 16, 250, false); const rn = await p.evaluate(() => window.__rn);
    const forced = await sample(p, 8, 250, true);
    if (SH && t === 0) await p.screenshot({ path: path.join(SH, 'item2-battle-pad-focus-popup.png') });
    // 滑鼠真的移動：移到別的候選格 → 換成那一格；移出右欄 → 收起
    const other = await p.evaluate(() => { const f = document.activeElement; const e = [...$('pinv').querySelectorAll('.c12g .cq')].find(e => e !== f); const r = e.getBoundingClientRect(); return [r.x + 32, r.y + 32, +e.dataset.c.slice(5)]; });
    await p.mouse.move(other[0], other[1]); await w(120); const s1 = await state(p);
    await p.mouse.move(300, 300); await w(120); const s2 = await state(p);
    (R.i = R.i || []).push({ s0, natural: nat.join(''), panelRendersIn4s: rn, forced: forced.join(''), mouseToOther: s1.hov === other[2] && s1.pop, mouseOut: !s2.pop });
    await p._b.close();
  }
  console.log('i', JSON.stringify(R.i));
  // (ii) 游標在面板打開前就停在右欄位置（面板沒收到過 pointermove）；全程不動滑鼠：V 開、手把選頭盔格（Ⓐ）、右到候選
  for (let t = 0; t < 4; t++) {
    const p = await mk(); const w = ms => p.waitForTimeout(ms);
    await p.mouse.move(828, 178); await w(100);
    await p.keyboard.press('v'); await w(400);
    await press(p, 13); let s = await state(p); let guard = 0; while (s.foc !== 'eq:helm' && guard++ < 8) { await press(p, 12); s = await state(p); }
    await press(p, 0); await w(200); const sel = await p.evaluate(() => NAV.slot);
    await press(p, 15); const s0 = await state(p);
    const nat = await sample(p, 8, 250, false); const forced = await sample(p, 8, 250, true);
    if (SH && t === 0) await p.screenshot({ path: path.join(SH, 'item2-cursor-parked-before-open.png') });
    (R.ii = R.ii || []).push({ sel, s0, natural: nat.join(''), forced: forced.join(''), end: await state(p) });
    await p._b.close();
  }
  console.log('ii', JSON.stringify(R.ii));
  // (iii) 鍵盤：點頭盔格後按 Tab 把焦點移到候選
  for (let t = 0; t < 3; t++) {
    const p = await mk(); const w = ms => p.waitForTimeout(ms);
    await p.keyboard.press('v'); await w(400); await p.click('#pinv [data-c="eq:helm"]'); await w(200);
    let s = await state(p), g = 0; while (!s.foc.startsWith('cand:') && g++ < 40) { await p.keyboard.press('Tab'); await w(40); s = await state(p); }
    const s0 = s; const nat = await sample(p, 8, 250, false); const forced = await sample(p, 8, 250, true);
    (R.iii = R.iii || []).push({ tabs: g, s0, natural: nat.join(''), forced: forced.join('') });
    await p._b.close();
  }
  console.log('iii', JSON.stringify(R.iii));
  // (iv) 游標停在候選 A 上（滑鼠開的浮窗），手把把焦點移到候選 B：浮窗換成 B，重畫後仍是 B
  for (let t = 0; t < 3; t++) {
    const p = await mk(); const w = ms => p.waitForTimeout(ms);
    await p.keyboard.press('v'); await w(400); await p.click('#pinv [data-c="eq:helm"]'); await w(200);
    await p.hover('#pinv .c12g .cq'); await w(150); const a = await state(p);
    await p.evaluate(() => $('pinv').querySelector('.c12g .cq').focus()); await press(p, 15); const b0 = await state(p);
    const forced = await sample(p, 8, 250, true); const b1 = await state(p);
    (R.iv = R.iv || []).push({ hoverA: a.hov, focusB: b0.foc, hovAfterPad: b0.hov, forced: forced.join(''), end: b1 });
    await p._b.close();
  }
  console.log('iv', JSON.stringify(R.iv));
  fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
})();
