// 補測：手把焦點在候選 B 之後，滑鼠真的移到候選 A／移出右欄，之後面板重畫會不會把浮窗改回 B／重新打開
const { open, padInit, press, fs } = require('./lib');
const URL = process.argv[2], OUT = process.argv[3];
(async () => { const R = { toOther: [], out: [] };
  for (let t = 0; t < 4; t++) { const p = await open(URL, { seed: 100 + t }); await p.evaluate(padInit); const w = ms => p.waitForTimeout(ms);
    const st = () => p.evaluate(() => ({ foc: (document.activeElement.dataset || {}).c || document.activeElement.tagName, hov: CH.hov, pop: !!$('pinv').querySelector('.c12p') }));
    await p.keyboard.press('v'); await w(400); await p.click('#pinv [data-c="eq:helm"]'); await w(200); await press(p, 15); const b = await st();
    const other = await p.evaluate(() => { const f = document.activeElement; const e = [...$('pinv').querySelectorAll('.c12g .cq')].find(e => e !== f); const r = e.getBoundingClientRect(); return [r.x + 32, r.y + 32, +e.dataset.c.slice(5)]; });
    await p.mouse.move(other[0], other[1]); await w(100); const a0 = await st(); const seq = [];
    for (let i = 0; i < 6; i++) { await p.evaluate(() => hudPanels()); await w(200); const s = await st(); seq.push(s.hov === other[2] ? 'A' : s.hov === +b.foc.slice(5) ? 'B' : s.pop ? '?' : '-'); }
    R.toOther.push({ focusB: b.foc, mouseA: other[2], right_after_move: a0.hov === other[2] ? 'A' : a0.hov, afterRenders: seq.join(''), focEnd: (await st()).foc });
    await p.mouse.move(300, 300); await w(100); const o0 = await st(); const seq2 = [];
    for (let i = 0; i < 6; i++) { await p.evaluate(() => hudPanels()); await w(200); const s = await st(); seq2.push(s.pop ? 'O' : '-'); }
    const nat = []; for (let i = 0; i < 12; i++) { await w(250); nat.push((await st()).pop ? 'O' : '-'); }
    R.out.push({ right_after_out: o0.pop ? 'O' : '-', afterForcedRenders: seq2.join(''), then3sNatural: nat.join(''), focEnd: (await st()).foc });
    await p._b.close(); }
  console.log(JSON.stringify(R, null, 1)); fs.writeFileSync(OUT, JSON.stringify(R, null, 1)); })();
