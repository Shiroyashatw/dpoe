// V-4 回歸：各部位 × 需求項數 × 簡易／詳細，浮窗高 ≤486、下緣 ≤562，①②④⑤ 是否完整（⑤ 有沒有被浮窗下緣切掉）
// 用法：node v4.js <url> <out.json> [截圖資料夾]
const { open, fs, path } = require('./lib');
const URL = process.argv[2], OUT = process.argv[3], SH = process.argv[4];
(async () => {
  const p = await open(URL); const w = ms => p.waitForTimeout(ms); const E = (f, a) => p.evaluate(f, a);
  await p.keyboard.press('v'); await w(400);
  const cases = await E(() => { const out = []; for (const e of EQS) { if (!eqOpen(S, e.k) || e.k === 'off') continue; const seen = {};
    for (const B of BASES.filter(b => eqTakes(e, b.k))) { const it = mkItem(B.id, 80, 2); const d = itemDelta(it, e.k); const n = d.why ? (/需求/.test(d.why) ? (d.why.match(/、/g) || []).length + 1 : -1) : 0; const rows = Object.keys(B.b || {}).length; const key = n + '/' + rows; if (seen[key]) continue; seen[key] = 1; out.push([e.k, B.id, n, rows]); } } return out; });
  const meas = () => E(() => { const c = $('pinv').querySelector('.c12p'); if (!c) return null; const cb = c.getBoundingClientRect(); const L = {}; for (const s of c.querySelectorAll('section')) { const r = s.getBoundingClientRect(); L[s.className] = [+r.top.toFixed(1), +r.bottom.toFixed(1)]; } const p5 = c.querySelector('.l5 p').getBoundingClientRect(), k5 = c.querySelector('.l5 kbd').getBoundingClientRect(), p4 = c.querySelector('.l4 p'); const l3s = c.querySelector('.l3s');
    return { h: cb.height, bottom: cb.bottom, ovf: getComputedStyle(c).overflow, L, l5TextBottom: p5.bottom, kbdBottom: k5.bottom, cut5: +Math.max(0, L.l5[1] - cb.bottom).toFixed(1), cutText5: +Math.max(0, p5.bottom - cb.bottom).toFixed(1), cutKbd: +Math.max(0, k5.bottom - cb.bottom).toFixed(1), l4rows: new Set([...p4.children].map(e => Math.round(e.getBoundingClientRect().top))).size, l4fit: p4.scrollWidth <= p4.clientWidth && p4.scrollHeight <= p4.clientHeight, l3: [l3s.clientHeight, l3s.scrollHeight], affs: [c.querySelectorAll('.l3s ul')[0].children.length, c.querySelectorAll('.l3s ul')[1].children.length] }; });
  const res = []; let shots = 0;
  for (const [k, bid, n, rows] of cases) {
    const id = await E(([k, bid]) => { S.inv.items = S.inv.items.filter(x => !x.__t); const it = mkItem(bid, 80, 2); for (let i = 0; i < 300 && it.a.length < 6; i++) { const t = mkItem(bid, 80, 2); if (t.a.length > it.a.length) it.a = t.a; } it.__t = 1; invPut(S.inv, it); changed(); NAV.slot = k; hudPanels(); const el = $('pinv').querySelector(`[data-c="cand:${it.id}"]`); el && el.scrollIntoView({ block: 'nearest' }); return el ? it.id : null; }, [k, bid]);
    if (!id) { res.push({ k, bid, n, rows, err: 'no cell' }); continue; }
    await p.hover(`#pinv [data-c="cand:${id}"]`); await w(120); const a = await meas();
    if (SH && a && a.cutText5 > 0 && shots < 4) await p.screenshot({ path: path.join(SH, `v4-${k}-${n}req-simple.png`), clip: { x: 780, y: 60, width: 500, height: 520 } });
    await p.keyboard.down('Alt'); await w(120); const d = await meas();
    if (SH && d && d.cutText5 > 0 && shots < 4) { await p.screenshot({ path: path.join(SH, `v4-${k}-${n}req-alt.png`), clip: { x: 780, y: 60, width: 500, height: 520 } }); shots++; }
    await p.keyboard.up('Alt'); await w(60); await p.mouse.move(300, 300); await w(40);
    res.push({ k, bid, n, rows, simple: a, det: d });
  }
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  console.log('slot|需求項數|基底列數|模式|浮窗高|下緣|④行數|⑤層超出|⑤字超出|鍵帽超出');
  for (const r of res) for (const m of ['simple', 'det']) { const x = r[m]; if (!x) { console.log(r.k, r.n, 'null'); continue; } console.log([r.k, r.n, r.rows, m, x.h, x.bottom, x.l4rows, x.cut5, x.cutText5, x.cutKbd].join('|')); }
  await p._b.close();
})();
