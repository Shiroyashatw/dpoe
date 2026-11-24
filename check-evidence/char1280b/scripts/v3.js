const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = process.argv[2] || 'http://localhost:8200/', OUT = 'ev/shots';
const LOG = []; const rec = (id, name, pass, data) => { LOG.push({ id, name, pass: !!pass, data }); console.log((pass ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' ' + JSON.stringify(data ?? '').slice(0, 2500)); };
const setup = fs.readFileSync('v2.js', 'utf8').match(/const setup = \(\) => \{[\s\S]*?\n\};/)[0];
(async () => {
  const b = await chromium.launch();
  const mk = async (dpr = 1) => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: dpr });
    await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage(); p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
    await p.goto(URL + '?' + Date.now()); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(setup + ';setup()'); await p.evaluate(() => runNode(TRUNK_K[0])); await p.waitForTimeout(2500);
    return p;
  };
  // 固定樣本：單防禦 2 條 vs 3 條（對示意圖 04a／04b）；雙防禦 6＋6
  const fixture = () => {
    const H = BASES.filter(b => b.k === 'helm'), def = b => ['armor', 'ev', 'es'].filter(k => b.b[k]).length;
    const one = H.filter(b => def(b) === 1 && b.lv <= 20), two = H.filter(b => def(b) === 2 && b.lv <= 30);
    const roll = (base, n, lv) => { let it; for (let i = 0; i < 400; i++) { it = mkItem(base.id, lv, 2); if (it.a.length >= n) break; } it.a = it.a.slice(0, n); it.q = 0; return it; };
    S.inv.items = S.inv.items.filter(x => !slotCands('helm').includes(x));
    S.eq.helm = roll(one[0], 2, 9); const A = roll(one[one.length - 1], 3, 14); A.q = 0.05; invPut(S.inv, A);
    const B6 = roll(two[0], 6, 30); invPut(S.inv, B6);
    window.__fx = { A: A.id, B6: B6.id, cur2: S.eq.helm, two: two[0].id };
    changed(); NAV.slot = 'helm'; hudPanels(); return [S.eq.helm.a.length, A.a.length, B6.a.length, def(BASEI[S.eq.helm.b]), def(BASEI[A.b]), def(BASEI[B6.b])];
  };
  const layers = p => p.evaluate(() => { const c = $('pinv').querySelector('.c12p'), r = c.getBoundingClientRect(); const o = { pop: [r.x, r.y, r.width, r.height] }; for (const s of c.querySelectorAll('section')) { const q = s.getBoundingClientRect(); o[s.className] = [q.x, q.y, q.width, q.height - (s.className === 'l5' ? 0 : 13)]; } const l3s = c.querySelector('.l3s'); o.l3over = l3s.scrollHeight - l3s.clientHeight; o.m = c.querySelector('.l3m').hidden; return o; });
  {
    const p = await mk(); const w = ms => p.waitForTimeout(ms);
    await p.keyboard.press('v'); await w(400);
    const fx = await p.evaluate(fixture); await w(200);
    const ids = await p.evaluate(() => __fx);
    await p.hover(`#pinv [data-c="cand:${ids.A}"]`); await w(150);
    const a = await layers(p); await p.screenshot({ path: path.join(OUT, '04a-single-def.png') });
    await p.keyboard.down('Alt'); await w(150); const bb = await layers(p); await p.screenshot({ path: path.join(OUT, '04b-single-def.png') }); await p.keyboard.up('Alt');
    const SP = d => ({ pop: [796, 76, 460, d ? 486 : 448], l1: [796, 98, 460, 68], l2: [796, 191, 460, 60], l3: [796, 276, 460, d ? 106 : 94], l4: [796, d ? 407 : 395, 460, 52], l5: [796, d ? 484 : 472, 460, 44] });
    const diff = (m, sp) => Object.fromEntries(Object.keys(sp).map(k => [k, m[k].map((v, i) => +(v - sp[k][i]).toFixed(2))]));
    const da = diff(a, SP(0)), db = diff(bb, SP(1));
    rec('S1', '04a 單防禦 2／3 條：浮窗與五層對圖例（Δ）', Object.values(da).every(d => d.every(v => Math.abs(v) <= 1)), { fx, meas: a, d: da });
    rec('S2', '04b 單防禦 2／3 條（Alt）：浮窗與五層對圖例（Δ）', Object.values(db).every(d => d.every(v => Math.abs(v) <= 1)), { meas: bb, d: db });
    // 雙防禦 6＋6
    await p.evaluate(() => { const it = S.inv.items.find(x => x.id === __fx.B6); const c = JSON.parse(JSON.stringify(it)); c.id = ++IID; S.eq.helm = c; changed(); hudPanels(); });
    await p.hover(`#pinv [data-c="cand:${ids.B6}"]`); await w(150);
    const d6 = await p.evaluate(() => { const c = $('pinv').querySelector('.c12p'), r = c.getBoundingClientRect(), s = c.querySelector('.l3s'); const vis = q => { const e = c.querySelector(q), x = e.getBoundingClientRect(); return x.top >= r.top && x.bottom <= r.bottom + .5; }; return { box: [r.x, r.y, r.width, r.height, r.bottom], li: s.querySelectorAll('li').length, over: s.scrollHeight - s.clientHeight, client: s.clientHeight, m: c.querySelector('.l3m').innerText, all: ['.l1', '.l2', '.l4', '.l5'].map(vis), det: c.classList.contains('det') }; });
    await p.screenshot({ path: path.join(OUT, '04a-dualdef-6x6.png') });
    await p.mouse.wheel(0, 60); await w(120); const noAlt = await p.evaluate(() => $('pinv').querySelector('.c12p .l3s').scrollTop);
    rec('S3', '雙防禦 6＋6 簡易：高≤486、下緣≤562、①②④⑤ 完整、12 條都在 DOM、③ 可捲；沒按 Alt 滾輪不捲 ③', d6.box[3] <= 486 && d6.box[4] <= 562 && d6.all.every(Boolean) && d6.li === 12 && d6.over > 0 && noAlt === 0, { d6, noAlt });
    // 手把 Y＋右搖桿（穩定樣本）
    await p.mouse.move(300, 300); await w(100);
    await p.evaluate(() => { window.__pad = { buttons: [...Array(17)].map(() => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, mapping: 'standard', id: 'mock', index: 0 }; navigator.getGamepads = () => [window.__pad]; dispatchEvent(new Event('gamepadconnected')); });
    await p.evaluate(id => $('pinv').querySelector(`[data-c="cand:${id}"]`).focus(), ids.B6); await w(120);
    const T = () => p.evaluate(() => { const c = $('pinv').querySelector('.c12p'); if (!c) return null; const s = c.querySelector('.l3s'); return [c.classList.contains('det'), s.scrollTop, s.scrollHeight - s.clientHeight, c.querySelector('.l3m').style.visibility === 'hidden' ? '' : c.querySelector('.l3m').innerText, $('pinv').querySelector('.c12g').scrollTop]; });
    const y0 = await T(); await p.evaluate(() => (__pad.axes[3] = 1)); await w(250); const y0b = await T(); await p.evaluate(() => (__pad.axes[3] = 0));
    await p.evaluate(() => (__pad.buttons[3].pressed = true)); await w(150); const y1 = await T();
    await p.evaluate(() => (__pad.axes[3] = 1)); await w(250); await p.evaluate(() => (__pad.axes[3] = 0)); await w(60); const y2 = await T(); await p.screenshot({ path: path.join(OUT, 'pad-y-scroll.png') });
    await p.evaluate(() => (__pad.axes[3] = -1)); await w(100); await p.evaluate(() => (__pad.axes[3] = 0)); await w(60); const y3 = await T();
    await p.evaluate(() => (__pad.axes[3] = 1)); await w(2500); await p.evaluate(() => (__pad.axes[3] = 0)); await w(60); const y4 = await T();
    await p.evaluate(() => (__pad.buttons[3].pressed = false)); await w(150); const y5 = await T();
    rec('S4', '手把：沒按 Y 右搖桿不捲；按住 Y＝詳細，右搖桿下推捲 ③／上推捲回／可到底；放開 Y 回簡易＋頂端', !y0[0] && y0b[1] === 0 && y1[0] && y1[2] > 0 && y2[1] > 0 && y3[1] < y2[1] && y4[1] === y4[2] && !y5[0] && y5[1] === 0, { y0, y0b, y1, y2, y3, y4, y5 });
    // 焦點看得到嗎（手把移焦點）
    const fv = async tag => p.evaluate(tag => { const f = document.activeElement, s = getComputedStyle(f); return [tag, f.dataset.c, f.matches(':focus-visible'), s.filter, s.outlineStyle + ' ' + s.outlineWidth + ' ' + s.outlineColor]; }, tag);
    const press = async i => { await p.evaluate(i => (__pad.buttons[i].pressed = true), i); await w(70); await p.evaluate(i => (__pad.buttons[i].pressed = false), i); await w(70); };
    await press(13); const f1 = await fv('滑鼠用過後按手把下'); await p.screenshot({ path: path.join(OUT, 'pad-focus-after-mouse.png') });
    rec('S5a', '手把移焦點後焦點格看得出來（滑鼠操作過之後）', f1[2] || f1[3] !== 'none' || !/^none/.test(f1[4]), f1);
    rec('ERR1', 'pageerror', !p._errs.length, p._errs);
    await p.context().close();
  }
  { // 只用鍵盤 V 開＋手把
    const p = await mk(); const w = ms => p.waitForTimeout(ms);
    await p.keyboard.press('v'); await w(400);
    await p.evaluate(() => { window.__pad = { buttons: [...Array(17)].map(() => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, mapping: 'standard', id: 'mock', index: 0 }; navigator.getGamepads = () => [window.__pad]; dispatchEvent(new Event('gamepadconnected')); });
    const press = async i => { await p.evaluate(i => (__pad.buttons[i].pressed = true), i); await w(70); await p.evaluate(i => (__pad.buttons[i].pressed = false), i); await w(70); };
    await press(13); await press(13);
    const f = await p.evaluate(() => { const f = document.activeElement, s = getComputedStyle(f); return [f.dataset.c, f.matches(':focus-visible'), s.filter, s.outlineStyle + ' ' + s.outlineWidth]; });
    await p.screenshot({ path: path.join(OUT, 'pad-focus-kbd-only.png') });
    rec('S5b', '手把移焦點後焦點格看得出來（只按過鍵盤 V）', f[1] || f[2] !== 'none', f);
    // Ⓐ 在裝備格＝選那一格看候選
    await press(0); const sel = await p.evaluate(() => [NAV.slot, document.activeElement.dataset.c]);
    rec('S5c', '手把 Ⓐ 在裝備格＝選格看候選；焦點留在同一格', sel[0] === sel[1].slice(3), sel);
    await p.context().close();
  }
  { // DPR 2
    const p = await mk(2); const w = ms => p.waitForTimeout(ms);
    await p.keyboard.press('v'); await w(500);
    const ic = await p.evaluate(() => [...$('pinv').querySelectorAll('.cq .cx img')].map(i => { const r = i.getBoundingClientRect(), s = getComputedStyle(i), ps = getComputedStyle(i.parentNode); return [i.getAttribute('src').slice(0, 60), r.width, r.height, i.naturalWidth, i.naturalHeight, s.padding, s.backgroundColor, ps.padding, ps.backgroundColor, +(r.x - i.closest('.cq').getBoundingClientRect().x).toFixed(1), +(r.y - i.closest('.cq').getBoundingClientRect().y).toFixed(1)]; }));
    for (const k of ['chest', 'amulet', 'weapon']) { const bx = await (await p.$(`#pinv [data-c="eq:${k}"]`)).boundingBox(); await p.screenshot({ path: path.join(OUT, `dpr2-cell-${k}.png`), clip: bx }); }
    const bt = await (await p.$('#pinv [data-c="eq:boots"]')).boundingBox(); await p.screenshot({ path: path.join(OUT, 'dpr2-cell-boots.png'), clip: bt });
    await p.screenshot({ path: path.join(OUT, 'dpr2-01-stats.png') });
    rec('S6', 'DPR2：破裂／追憶用 16@2x（natural 32）、畫成 16×16、沒有底墊、x4 y44', ic.filter(x => /affix_/.test(x[0])).length === 2 && ic.filter(x => /affix_/.test(x[0])).every(x => /@2x/.test(x[0]) && x[1] === 16 && x[2] === 16 && x[3] === 32 && x[4] === 32 && x[5] === '0px' && x[7] === '0px'), ic);
    await p.context().close();
  }
  { // DPR1 圖示
    const p = await mk(1); const w = ms => p.waitForTimeout(ms);
    await p.keyboard.press('v'); await w(500);
    const ic = await p.evaluate(() => [...$('pinv').querySelectorAll('.cq .cx img')].map(i => [i.getAttribute('src').slice(0, 60), i.getBoundingClientRect().width, i.naturalWidth]));
    for (const k of ['chest', 'amulet', 'weapon', 'boots', 'helm']) { const bx = await (await p.$(`#pinv [data-c="eq:${k}"]`)).boundingBox(); await p.screenshot({ path: path.join(OUT, `dpr1-cell-${k}.png`), clip: bx }); }
    rec('S7', 'DPR1：破裂／追憶用 16（natural 16）', ic.filter(x => /affix_/.test(x[0])).every(x => !/@2x/.test(x[0]) && x[1] === 16 && x[2] === 16), ic);
    // 詞綴被「…」截掉的比例：大量隨機樣本，簡易／詳細
    const tr = await p.evaluate(() => { const H = BASES.filter(b => b.k === 'helm'); S.inv.items = S.inv.items.filter(x => !slotCands('helm').includes(x)); const ids = []; for (let i = 0; i < 40; i++) { const it = mkItem(H[i % H.length].id, 10 + i, 2); invPut(S.inv, it); ids.push(it.id); } changed(); NAV.slot = 'helm'; hudPanels(); const out = { simple: [0, 0], det: [0, 0], ex: [], name: [0, 0], l4: [0, 0] };
      for (const det of [0, 1]) { CH.alt = det; for (const id of ids) { CH.hov = null; chHov(id); const c = $('pinv').querySelector('.c12p'); for (const b of c.querySelectorAll('.l3 li b')) { out[det ? 'det' : 'simple'][1]++; if (b.scrollWidth > b.clientWidth + 0.5) { out[det ? 'det' : 'simple'][0]++; if (out.ex.length < 6) out.ex.push([det, b.textContent, b.clientWidth, b.scrollWidth, b.nextElementSibling ? b.nextElementSibling.textContent : '']); } } if (!det) { for (const b of c.querySelectorAll('.l1 b')) { out.name[1]++; if (b.scrollWidth > b.clientWidth + .5) out.name[0]++; } const q = c.querySelector('.l4 p'); out.l4[1]++; if (q.scrollWidth > q.clientWidth + .5) out.l4[0]++; } } } CH.alt = 0; chHov(null); return out; });
    rec('S8', '詞綴主文字被「…」截掉（40 件隨機稀有頭盔 vs 身上）：簡易／詳細 [截掉, 總數]', tr.simple[0] === 0 && tr.det[0] === 0, tr);
    await p.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'interact2.json'), JSON.stringify(LOG, null, 1));
  await b.close();
})().catch(e => { console.error('CRASH', e); fs.writeFileSync(path.join(OUT, 'interact2.json'), JSON.stringify(LOG, null, 1)); process.exit(2); });
