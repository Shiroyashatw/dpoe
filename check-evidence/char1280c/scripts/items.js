// RULINGS-2 一次修清單第 4～11 項的實測（1280×720）。用法：node items.js <url> <out>
const { open, fixture, padInit, press, fs, path } = require('./lib');
const URL = process.argv[2], OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const R = {}; const rec = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v).slice(0, 1800)); };
const clip = (p, n, c) => p.screenshot({ path: path.join(OUT, n + '.png'), clip: { x: c[0], y: c[1], width: c[2], height: c[3] } });
const RC = [780, 60, 500, 520];
(async () => {
  const p = await open(URL); const w = ms => p.waitForTimeout(ms); const E = (f, a) => p.evaluate(f, a);
  await p.keyboard.press('v'); await w(400);
  // ---- 4、5 色票 ----
  rec('tokens', await E(() => { const g = (e, k) => getComputedStyle(e).getPropertyValue(k).trim(); const K = ['--good', '--bad', '--bad-hi', '--btn2', '--plate-world', '--border-cap', '--tx-off', '--panel-edge', '--tx-strong', '--tx', '--tx-dim']; return Object.fromEntries(K.map(k => [k, { pinv: g($('pinv'), k), root: g(document.documentElement, k) }])); }));
  const sty = (q, ks) => E(([q, ks]) => [...document.querySelectorAll(q)].map(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return Object.assign({ t: e.textContent.trim().slice(0, 24), box: [r.x, r.y, r.width, r.height].map(v => +v.toFixed(1)) }, Object.fromEntries(ks.map(k => [k, s[k]]))); }), [q, ks]);
  rec('btn2_stats', await sty('#pinv .ctg, #pinv .cclose, #pinv .cedit', ['backgroundColor', 'color', 'borderTopColor', 'borderTopWidth', 'fontSize', 'fontWeight']));
  // 11 編輯釘選
  rec('item11_cedit', (await sty('#pinv .cedit', ['color', 'fontSize', 'fontWeight', 'backgroundColor', 'borderTopColor']))[0]);
  await clip(p, 'item11-cedit', RC);
  // 名詞提示底
  const rs = await p.$eval('#pinv .cres span', e => { const r = e.getBoundingClientRect(); return [r.x, r.y]; });
  await p.mouse.move(rs[0] + 10, rs[1] + 8); await w(700);
  rec('ctm', await sty('#ctm', ['backgroundColor', 'borderTopColor']));
  await p.mouse.move(300, 300); await w(200);
  // ---- 7 長按中列高：每一個可見列都真的長按一次 ----
  const rowsN = await E(() => $('pinv').querySelectorAll('.cr').length);
  const lp = [];
  for (const i of [0, 1, 2, 3, 4, 5]) {
    if (i >= rowsN) break;
    const before = await E(() => [...$('pinv').querySelectorAll('.cr')].map(e => { const r = e.getBoundingClientRect(); return [r.y, r.height]; }));
    const rb = before[i]; const x = 908, y = rb[0] + 10;
    const cont = await E(() => { const e = $('pinv').querySelector('.cr').closest('[data-sb]') || $('pinv').querySelector('.cr').parentNode; const r = e.getBoundingClientRect(); return [e.className, r.y, r.bottom, e.scrollTop]; });
    if (y > cont[2] - 4) break;
    await p.mouse.move(x, y); await p.mouse.down(); await w(650); await p.mouse.up(); await w(150);
    const after = await E(() => { const on = $('pinv').querySelector('.cr.on'); if (!on) return null; const r = on.getBoundingClientRect(), s = getComputedStyle(on); const all = [...$('pinv').querySelectorAll('.cr')].map(e => { const r = e.getBoundingClientRect(); return [r.y, r.height]; }); const m = $('pinv').querySelector('.cmenu').getBoundingClientRect(); return { on: [r.x, r.y, r.width, r.height], bg: s.backgroundColor, sh: s.boxShadow, all, menu: [m.x, m.y, m.width, m.height] }; });
    if (i === 3) await clip(p, 'item7-longpress-row', RC);
    lp.push({ i, before: rb, cont, after: after && after.on, bg: after && after.bg, sh: after && after.sh, othersMoved: after ? after.all.filter((a, j) => j !== i && (a[0] !== before[j][0] || a[1] !== before[j][1])).length : null, menu: after && after.menu });
    await p.keyboard.press('Escape'); await w(120);
  }
  rec('item7_longpress', lp);
  // 第一列貼在可捲區上緣／捲動後：.on 有沒有被裁
  rec('item7_scrolled', await E(async () => { const P = $('pinv'); const out = []; const SC = () => P.querySelector('.c12l'); const max = SC().scrollHeight - SC().clientHeight; for (const top of [0, 60, 107, max]) { SC().scrollTop = top; await new Promise(r => setTimeout(r, 60)); const cr = SC().getBoundingClientRect(); const vis = [...P.querySelectorAll('.cr')].filter(e => { const r = e.getBoundingClientRect(); return r.bottom > cr.top + 1 && r.top < cr.bottom - 1; }); if (!vis.length) { out.push({ top, none: 1 }); continue; } for (const e of [vis[0], vis[vis.length - 1]]) { CH.menu = e.dataset.c.slice(4); hudPanels(); SC().scrollTop = top; const on = P.querySelector('.cr.on'); if (!on) { out.push({ top, noOn: 1 }); continue; } const r = on.getBoundingClientRect(), c2 = SC().getBoundingClientRect(); out.push({ top: SC().scrollTop, max, on: [r.y, r.height], cont: [c2.y, c2.bottom], clipTop: Math.max(0, c2.y - r.y), clipBottom: Math.max(0, r.bottom - c2.bottom) }); CH.menu = null; hudPanels(); } } SC().scrollTop = 0; return out; }));
  // ---- 編輯釘選（Q4 不改回 22：列距 28、☆ 28×28 不重疊）----
  await p.click('#pinv [data-c="edit"]'); await p.mouse.move(300, 300); await w(200);
  rec('edit_rows', await E(() => { const rows = [...$('pinv').querySelectorAll('.cr')].slice(0, 6).map(e => { const r = e.getBoundingClientRect(), s = e.querySelector('.cpin').getBoundingClientRect(); return [r.y, r.height, s.x, s.y, s.width, s.height]; }); const s = getComputedStyle($('pinv').querySelector('.cpin')); return { rows, pinBg: s.backgroundColor, pinBorder: s.borderTopColor, done: (e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return [r.x, r.y, r.width, r.height, s.backgroundImage.slice(0, 60), s.borderRadius]; })($('pinv').querySelector('.cdone')) }; }));
  await clip(p, 'item5-edit-pin', RC);
  await p.click('#pinv [data-c="edit"]'); await w(100);
  // ---- 候選＋浮窗 ----
  await p.click('#pinv [data-c="eq:helm"]'); await w(200);
  rec('sel_outline', (await sty('#pinv .cq.sel', ['outlineColor', 'outlineWidth', 'outlineStyle', 'outlineOffset']))[0]);
  rec('btn2_cand', await sty('#pinv .ctg, #pinv .cx2, #pinv .csort, #pinv .cflt, #pinv .cflt button', ['backgroundColor', 'color', 'borderTopColor']));
  const fx = await E(fixture); await w(200);
  await p.hover(`#pinv [data-c="cand:${fx.A}"]`); await w(200);
  const l45 = () => E(() => { const c = $('pinv').querySelector('.c12p'); const b = e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => +v.toFixed(2)); }; const s = e => getComputedStyle(e); const p5 = c.querySelector('.l5 p'); return {
    pop: b(c), det: c.classList.contains('det'),
    l4: [...c.querySelectorAll('.l4 p span')].map(e => [e.textContent, e.className, s(e).color, s(e).fontSize, s(e).fontWeight]),
    cj: [...$('pinv').querySelectorAll('.c12g .cj')].map(e => [e.textContent, s(e).color, s(e).backgroundColor]),
    cnq: [...$('pinv').querySelectorAll('.c12g .cnq')].slice(0, 1).map(e => [s(e).color, s(e).backgroundColor, s(e).backgroundImage.slice(0, 80), s(e).borderColor]),
    kbd: [...c.querySelectorAll('.l5 kbd')].map(e => ({ t: e.textContent, box: b(e), right: e.getBoundingClientRect().right, border: s(e).borderTopColor, bg: s(e).backgroundColor, color: s(e).color, font: s(e).fontSize + '/' + s(e).fontWeight })),
    l5p: { t: p5.textContent, box: b(p5), sw: p5.scrollWidth, cw: p5.clientWidth, font: s(p5).fontSize + '/' + s(p5).fontWeight, color: s(p5).color, ls: s(p5).letterSpacing, textRight: (() => { const rg = document.createRange(); rg.selectNodeContents(p5); return rg.getBoundingClientRect().right; })() },
    lines: [...c.querySelectorAll('section')].map(e => { const r = e.getBoundingClientRect(), st = s(e); return [e.className, r.left, r.right, r.bottom, st.borderBottomWidth, st.borderBottomColor]; }) }; });
  rec('item8_simple', await l45());
  await clip(p, 'item4-8-04a-single-def', RC);
  await p.keyboard.down('Alt'); await w(200);
  rec('item8_det', await l45());
  await clip(p, 'item8-04b-single-def', RC);
  await p.keyboard.up('Alt'); await w(100);
  // ---- 9 不能裝備原因：全部位全基底掃 why 文案，量 ④ ----
  await p.mouse.move(300, 300);
  const sweep = await E(async () => {
    const out = []; const cv = document.createElement('canvas').getContext('2d'); cv.font = '700 18px ' + getComputedStyle($('pinv')).fontFamily;
    for (const e of EQS) { if (!eqOpen(S, e.k)) continue;
      for (const B of BASES.filter(b => eqTakes(e, b.k))) { const it = mkItem(B.id, 80, 2); const d = itemDelta(it, e.k); if (!d.why) continue; out.push([e.k, B.id, chWhy(d.why), Math.round(cv.measureText(chWhy(d.why)).width)]); } }
    return out; });
  const byN = {}; for (const x of sweep) { const n = (x[2].match(/、/g) || []).length + 1; (byN[n] = byN[n] || []).push(x); }
  rec('item9_sweep', { total: sweep.length, byReqCount: Object.fromEntries(Object.entries(byN).map(([n, a]) => [n, a.length])), widest: sweep.slice().sort((a, b) => b[3] - a[3]).slice(0, 8), nonReq: [...new Set(sweep.filter(x => !/等級|力量|敏捷|智慧/.test(x[2])).map(x => x[2]))], badFormat: sweep.filter(x => /等級|力量|敏捷|智慧/.test(x[2]) && !/^不能裝備：((等級|力量|敏捷|智慧) \d+／\d+)(、(力量|敏捷|智慧) \d+／\d+)*$/.test(x[2])).slice(0, 5) });
  // 實際懸停：每個部位各取最寬 2 件＋ 1、2 項需求各 1 件；簡易與詳細都量
  const pick = []; for (const k of [...new Set(sweep.map(x => x[0]))]) { const a = sweep.filter(x => x[0] === k).sort((a, b) => b[3] - a[3]); pick.push(...a.slice(0, 2), a[a.length - 1]); }
  const l4m = () => E(() => { const c = $('pinv').querySelector('.c12p'); if (!c) return null; const p4 = c.querySelector('.l4 p'), b = e => e.getBoundingClientRect(), cb = b(c), s = getComputedStyle(p4.firstChild); const rg = document.createRange(); rg.selectNodeContents(p4); const tr = rg.getBoundingClientRect(); return { t: p4.textContent, fitW: p4.scrollWidth <= p4.clientWidth, fitH: p4.scrollHeight <= p4.clientHeight, sw: p4.scrollWidth, cw: p4.clientWidth, textRight: +tr.right.toFixed(1), pRight: +b(p4).right.toFixed(1), spansIn: [...p4.children].every(e => b(e).right <= b(p4).right + .5 && b(e).bottom <= b(p4).bottom + .5), rows: new Set([...p4.children].map(e => Math.round(b(e).top))).size, font: [s.fontSize, s.fontWeight, s.color, getComputedStyle(p4).lineHeight].join('|'), pBox: [b(p4).x, b(p4).y, b(p4).width, b(p4).height], pop: [cb.height, cb.bottom], whole: ['.l1', '.l2', '.l4', '.l5'].every(q => b(c.querySelector(q)).bottom <= cb.bottom + .5 && b(c.querySelector(q)).top >= cb.top - .5), l3: (e => [e.clientHeight, e.scrollHeight])(c.querySelector('.l3s')), ell: /…/.test(p4.textContent) }; });
  const hov = []; let shotN = 0;
  for (const [k, bid, txt, tw] of pick) {
    const id = await E(([k, bid]) => { S.inv.items = S.inv.items.filter(x => !x.__t); const it = mkItem(bid, 80, 2); it.__t = 1; invPut(S.inv, it); changed(); NAV.slot = k; hudPanels(); const el = $('pinv').querySelector(`[data-c="cand:${it.id}"]`); el && el.scrollIntoView({ block: 'nearest' }); return el ? it.id : null; }, [k, bid]);
    if (!id) { hov.push({ k, bid, txt, err: 'no cell' }); continue; }
    await p.hover(`#pinv [data-c="cand:${id}"]`); await w(120); const a = await l4m();
    const n = (txt.match(/、/g) || []).length + 1;
    if (a && (n === 3 || a.rows > 1) && shotN < 3) { await clip(p, `item9-cantwear-${n}req-${k}-simple`, RC); }
    await p.keyboard.down('Alt'); await w(120); const d = await l4m();
    if (a && (n === 3 || a.rows > 1) && shotN < 3) { await clip(p, `item9-cantwear-${n}req-${k}-alt`, RC); shotN++; }
    await p.keyboard.up('Alt'); await w(60); await p.mouse.move(300, 300); await w(40);
    hov.push({ k, bid, n, tw, simple: a, det: d });
  }
  const bad9 = hov.filter(h => !h.simple || !h.det || [h.simple, h.det].some(m => !m.fitW || !m.fitH || !m.spansIn || m.ell || m.pop[0] > 486.5 || m.pop[1] > 562.5 || !m.whole || !m.font.startsWith('18px|700|rgb(255, 155, 186)')));
  rec('item9_hover', { n: hov.length, bad: bad9.length, rows: hov.map(h => [h.k, h.n, h.tw, h.simple && h.simple.rows, h.simple && h.simple.pop, h.det && h.det.pop, h.simple && h.simple.t]) });
  R.item9_detail = hov; rec('item9_bad', bad9.slice(0, 4));
  // 最壞情況：三項需求＋雙防禦 6 條 對 身上 6 條，詳細
  const worst = await E(() => { S.inv.items = S.inv.items.filter(x => !x.__t); NAV.slot = 'helm'; const def = b => ['armor', 'ev', 'es'].filter(k => b.b[k]).length; let it; for (const B of BASES.filter(b => b.k === 'helm' && def(b) === 2)) { const t = mkItem(B.id, 80, 2); if (((itemDelta(t, 'helm').why || '').match(/、/g) || []).length === 2) { it = t; break; } } if (!it) return null; for (let i = 0; i < 400 && it.a.length < 6; i++) { const t = mkItem(it.b, 80, 2); if (t.a.length > it.a.length) it.a = t.a; } it.__t = 1; invPut(S.inv, it); const two = BASES.filter(b => b.k === 'helm' && def(b) === 2 && !eqLack(S, mkItem(b.id, 9, 2), 'helm').length)[0]; let c = S.eq.helm; if (two) for (let i = 0; i < 400; i++) { const t = mkItem(two.id, 30, 2); if (t.a.length >= 6) { c = t; break; } } S.eq.helm = c; changed(); hudPanels(); const el = $('pinv').querySelector(`[data-c="cand:${it.id}"]`); el.scrollIntoView({ block: 'nearest' }); return [it.id, it.a.length, S.eq.helm.a.length]; });
  if (worst) { await p.hover(`#pinv [data-c="cand:${worst[0]}"]`); await w(150); const a = await l4m(); await clip(p, 'item9-worst-3req-dualdef-6x6-simple', RC); await p.keyboard.down('Alt'); await w(150); const d = await l4m(); await clip(p, 'item9-worst-3req-dualdef-6x6-alt', RC); await p.keyboard.up('Alt'); rec('item9_worst', { worst, simple: a, det: d, layers: await E(() => [...$('pinv').querySelectorAll('.c12p section')].map(e => { const r = e.getBoundingClientRect(); return [e.className, r.y, r.bottom]; })) }); } else rec('item9_worst', null);
  await p.mouse.move(300, 300); await w(100);
  R._errs = p._errs; console.log('errs', p._errs);
  fs.writeFileSync(path.join(OUT, 'items.json'), JSON.stringify(R, null, 1));
  await p._b.close();
})();
