// 04b 詳細模式（按住 Alt）：記錄 1280×720 實際顯示。A. 指定樣本截圖 B. 全詞綴 × 6 階掃描 C. 隨機稀有裝備各部位掃描 D. 戰鬥中重畫穩定性
const { open, fs, path } = require('./lib');
const URL = process.argv[2], OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const RC = { x: 780, y: 60, width: 500, height: 520 };
(async () => {
  const p = await open(URL); const w = ms => p.waitForTimeout(ms); const E = (f, a) => p.evaluate(f, a); const R = {};
  await p.keyboard.press('v'); await w(400); await p.click('#pinv [data-c="eq:helm"]'); await w(200);
  const read = () => E(() => { const c = $('pinv').querySelector('.c12p'); if (!c) return null; const uls = [...c.querySelectorAll('.l3s ul')]; return uls.map(u => [...u.children].map(li => { const b = li.firstChild, sm = li.querySelector('small'); const br = b.getBoundingClientRect(), lr = li.getBoundingClientRect(); return { main: b.textContent, cut: b.scrollWidth > b.clientWidth, sw: b.scrollWidth, cw: b.clientWidth, liW: +lr.width.toFixed(1), num: /\d/.test(b.textContent), aux: sm ? sm.textContent : null, rg: !!li.querySelector('.rg'), tr: !!li.querySelector('.tr'), star: !!sm && /✦/.test(sm.textContent), fr: !!li.querySelector('.fr'), auxRight: sm ? +sm.getBoundingClientRect().right.toFixed(1) : null, liRight: +lr.right.toFixed(1) }; })); });
  const put = (cur, cand, frac) => E(([cur, cand, frac]) => { const mk = ([k, T, hi]) => { const r = tierRange(k, T); return { k, T, v: hi ? r[1] : r[0] }; }; S.inv.items = S.inv.items.filter(x => !x.__t); const one = BASES.filter(b => b.k === 'helm' && !eqLack(S, mkItem(b.id, 9, 2), 'helm').length); S.eq.helm = mkItem(one[0].id, 80, 2); S.eq.helm.a = cur.map(mk); const it = mkItem(one[one.length - 1].id, 80, 2); it.a = cand.map(mk); if (frac != null) it.frac = it.a[frac].k; it.__t = 1; invPut(S.inv, it); changed(); NAV.slot = 'helm'; hudPanels(); $('pinv').querySelector(`[data-c="cand:${it.id}"]`).scrollIntoView({ block: 'nearest' }); return it.id; }, [cur, cand, frac]);
  // 依主文字寬度排序所有有區間的詞綴（T1 最大值）
  const widths = await E(() => { const cv = document.createElement('canvas').getContext('2d'); cv.font = '700 16px ' + getComputedStyle($('pinv')).fontFamily; return Object.keys(AFF).filter(k => AFF[k].r).map(k => [k, affText({ k, T: 1, v: tierRange(k, 1)[1] }), Math.round(cv.measureText(affText({ k, T: 1, v: tierRange(k, 1)[1] })).width), `(${tierRange(k, 1).join('–')})`]).sort((a, b) => a[2] - b[2]); });
  R.affixWidths = { n: widths.length, shortest: widths.slice(0, 6), longest: widths.slice(-8), allAff: await E(() => Object.keys(AFF).length), noRange: await E(() => Object.keys(AFF).filter(k => !AFF[k].r)) };
  console.log('widths', JSON.stringify(R.affixWidths).slice(0, 1500));
  const N = widths.length, K = i => widths[Math.max(0, Math.min(N - 1, i))][0];
  const SAMPLES = [
    ['s1-shortest', '最短的詞綴（T1）', [[K(0), 1, 1], [K(1), 1, 1]], [[K(2), 1, 1], [K(3), 1, 1], [K(4), 1, 1]], null],
    ['s2-short-low-tier', '短詞綴、低階（T4～T6，沒有 ✦）', [[K(0), 5, 0], [K(2), 6, 0]], [[K(1), 4, 1], [K(3), 6, 0], [K(5), 5, 1]], null],
    ['s3-median', '中等長度（中位數附近，T1）', [[K(N >> 1), 1, 1], [K((N >> 1) + 1), 1, 1]], [[K((N >> 1) - 1), 1, 1], [K((N >> 1) + 2), 1, 1], [K((N >> 1) - 2), 2, 1]], null],
    ['s4-long', '長詞綴（最寬的幾條，T1）', [[K(N - 3), 1, 1], [K(N - 4), 1, 1]], [[K(N - 1), 1, 1], [K(N - 2), 1, 1], [K(N - 5), 1, 1]], null],
    ['s5-longest-frac', '最寬一條＋破裂', [[K(N - 2), 1, 1], [K(0), 1, 1]], [[K(N - 1), 1, 1], [K(N - 2), 1, 1], [K(1), 1, 1]], 0],
    ['s6-mixed-6x6', '長短混排 6 條對 6 條（要捲）', [[K(0), 1, 1], [K(N - 1), 3, 1], [K(N >> 1), 2, 0], [K(3), 6, 0], [K(N - 6), 1, 1], [K(N >> 2), 4, 1]], [[K(N - 2), 1, 1], [K(1), 2, 1], [K(N - 7), 5, 0], [K(2), 1, 1], [K((N >> 1) + 3), 1, 0], [K(N - 3), 6, 1]], 3]
  ];
  R.samples = [];
  for (const [id, note, cur, cand, frac] of SAMPLES) {
    const cid = await put(cur, cand, frac); await p.hover(`#pinv [data-c="cand:${cid}"]`); await w(150);
    await p.screenshot({ path: path.join(OUT, id + '-simple.png'), clip: RC }); const simple = await read();
    await p.keyboard.down('Alt'); await w(180); await p.screenshot({ path: path.join(OUT, id + '-alt.png'), clip: RC }); const det = await read();
    await p.keyboard.up('Alt'); await w(80); await p.mouse.move(300, 300); await w(50);
    R.samples.push({ id, note, simple, det }); console.log(id, JSON.stringify(det.flat().map(x => [x.main, x.cut ? 'CUT' : 'ok', x.aux, x.sw, x.cw])));
  }
  // B. 全詞綴 × 6 階 × 高低值：一次放 6 條（身上與候選各 6），按住 Alt 讀
  const all = []; for (const [k] of widths) for (let T = 1; T <= 6; T++) for (const hi of [0, 1]) all.push([k, T, hi]);
  const B = [];
  for (let i = 0; i < all.length; i += 12) {
    const cur = all.slice(i, i + 6), cand = all.slice(i + 6, i + 12); if (!cand.length) cand.push(all[0]);
    const cid = await put(cur, cand, null); await p.hover(`#pinv [data-c="cand:${cid}"]`); await w(60); await p.keyboard.down('Alt'); await w(90);
    const d = await read(); await p.keyboard.up('Alt'); await w(30); await p.mouse.move(300, 300); await w(20);
    if (d) B.push(...d[0].map((x, j) => ({ ...x, src: cur[j], col: 0 })), ...d[1].map((x, j) => ({ ...x, src: cand[j], col: 1 })));
  }
  const cls = x => x.cut ? '主文字被截' : x.rg ? '完整（區間＋T 階）' : x.tr ? '剩「T n（✦）」' : x.star ? '只剩「✦」' : x.aux ? '其他：' + x.aux : '輔助字全收掉';
  const tally = L => { const t = {}; for (const x of L) t[cls(x)] = (t[cls(x)] || 0) + 1; return t; };
  R.sweepAll = { rows: B.length, tally: tally(B), tallyT1: tally(B.filter(x => x.src[1] === 1)), colW: [...new Set(B.map(x => x.liW))], cut: B.filter(x => x.cut).slice(0, 10), noNum: B.filter(x => !x.num).length, overRight: B.filter(x => x.auxRight != null && x.auxRight > x.liRight + .5).length,
    perAffixT1max: widths.map(([k, t, wpx, rg]) => { const x = B.find(y => y.src[0] === k && y.src[1] === 1 && y.src[2] === 1); return [t, wpx, rg, x ? cls(x) : '?', x ? x.aux : null]; }) };
  console.log('sweepAll', JSON.stringify({ rows: B.length, tally: R.sweepAll.tally, tallyT1: R.sweepAll.tallyT1, colW: R.sweepAll.colW, noNum: R.sweepAll.noNum, overRight: R.sweepAll.overRight }));
  // C. 隨機稀有裝備（真的骰出來的，含陣列數值詞綴如「附加 a 至 b」）：每個部位 40 件
  const C = [];
  for (const k of ['helm', 'weapon', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ring1']) {
    const ids = await E(k => { S.inv.items = S.inv.items.filter(x => !x.__t); const e = EQS.find(q => q.k === k); const BB = BASES.filter(b => eqTakes(e, b.k)); const ids = []; for (let i = 0; i < 40; i++) { const it = mkItem(BB[i % BB.length].id, 20 + (i * 7) % 64, 2); if (i % 5 === 0 && it.a.length) it.frac = it.a[0].k; it.__t = 1; invPut(S.inv, it); ids.push(it.id); } changed(); NAV.slot = k; hudPanels(); return ids; }, k);
    for (const id of ids) { const ok = await E(id => { const el = $('pinv').querySelector(`[data-c="cand:${id}"]`); if (!el) return false; el.scrollIntoView({ block: 'nearest' }); return true; }, id); if (!ok) continue;
      await p.hover(`#pinv [data-c="cand:${id}"]`); await w(40); await p.keyboard.down('Alt'); await w(70); const d = await read(); await p.keyboard.up('Alt'); await w(20);
      if (d) C.push(...d[1].map(x => ({ ...x, slot: k }))); }
    await p.mouse.move(300, 300); await w(30);
  }
  R.sweepRandom = { rows: C.length, tally: tally(C), bySlot: Object.fromEntries([...new Set(C.map(x => x.slot))].map(s => [s, tally(C.filter(x => x.slot === s))])), cut: C.filter(x => x.cut).slice(0, 12), maxMainW: Math.max(...C.map(x => x.sw)), noRangeAffix: C.filter(x => x.aux && !/\(/.test(x.aux) && !x.cut).length };
  console.log('sweepRandom', JSON.stringify(R.sweepRandom).slice(0, 2500));
  // D. 戰鬥中按住 Alt 3 秒：每 100ms 看有沒有哪一刻主文字被截（重畫後還沒收輔助字）
  const cid = await put(SAMPLES[3][2], SAMPLES[3][3], null); await p.hover(`#pinv [data-c="cand:${cid}"]`); await w(100); await p.keyboard.down('Alt'); await w(100);
  const D = await E(async () => { const out = []; let renders = 0; const mo = new MutationObserver(() => renders++); mo.observe($('pinv'), { childList: true }); for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 100)); const c = $('pinv').querySelector('.c12p'); out.push(c ? [...c.querySelectorAll('.l3s li > b')].filter(b => b.scrollWidth > b.clientWidth).length : -1); } mo.disconnect(); return { out, renders, scene: G.scene }; });
  // 每一幀都看（rAF），抓重畫後、收輔助字前有沒有畫出被截的一幀
  const D2 = await E(() => new Promise(res => { let n = 0, bad = 0, gone = 0; const t0 = performance.now(); const f = () => { const c = $('pinv').querySelector('.c12p'); if (!c) gone++; else if ([...c.querySelectorAll('.l3s li > b')].some(b => b.scrollWidth > b.clientWidth)) bad++; n++; performance.now() - t0 < 3000 ? requestAnimationFrame(f) : res({ frames: n, cutFrames: bad, noPopFrames: gone }); }; requestAnimationFrame(f); }));
  await p.keyboard.up('Alt');
  R.battleStable = { D, D2 }; console.log('battle', JSON.stringify(R.battleStable));
  R._errs = p._errs; fs.writeFileSync(path.join(OUT, 'alt04b.json'), JSON.stringify(R, null, 1));
  await p._b.close();
})();
