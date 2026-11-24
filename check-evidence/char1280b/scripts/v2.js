// 階段 2：互動實測＋樣式量測（獨立於 char_check）
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = process.argv[2] || 'http://localhost:8200/', OUT = process.argv[3] || 'ev/shots';
const LOG = [];
const rec = (id, name, pass, data) => { LOG.push({ id, name, pass: !!pass, data }); console.log((pass ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' ' + JSON.stringify(data ?? '')); };
const setup = () => {
  proSkip(); S.story.tips = 0; S.lv = 49; S.asc = 'wind';
  for (const e of EQS) { if (e.k === 'ring3' || e.k === 'off') continue;
    const B = BASES.filter(b => b.k === e.t && b.lv <= 20); S.eq[e.k] = mkItem(B[B.length - 1].id, 20, 2); }
  const H = BASES.filter(b => b.k === 'helm');
  for (let i = 0; i < 14; i++) invPut(S.inv, mkItem(H[i % H.length].id, 8 + i * 4, [2, 1, 0][i % 3]));
  S.eq.chest.cor = 1; S.eq.chest.frac = S.eq.chest.a[0].k; S.eq.boots.cor = 1;
  S.eq.boots.cal = { g: { k: 'g_hp', v: 10 }, b: { k: 'b_resF', v: 20 } };
  S.eq.amulet.mem = rollMem(Object.keys(MEM)[0]); S.eq.weapon.wy = 'wangyin_guixu'; changed();
};
(async () => {
  const b = await chromium.launch();
  const mk = async (dpr = 1) => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: dpr });
    await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage(); p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
    await p.goto(URL + '?' + Date.now()); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(setup); await p.evaluate(() => runNode(TRUNK_K[0])); await p.waitForTimeout(2500);
    return p;
  };
  const p = await mk();
  const E = (f, a) => p.evaluate(f, a);
  const w = ms => p.waitForTimeout(ms);
  const open = () => E(() => PANEL.inv && $('pinv').classList.contains('c12') && !$('pinv').hidden);
  const menuOn = () => E(() => !!$('pinv').querySelector('.cmenu'));
  const shot = n => p.screenshot({ path: path.join(OUT, n + '.png') });
  // ---------- T1 V／Esc ----------
  const t1 = [];
  await p.keyboard.press('v'); await w(400); t1.push(await open());
  await p.keyboard.press('v'); await w(400); t1.push(await E(() => !!PANEL.inv));
  await p.keyboard.press('v'); await w(400); t1.push(await open());
  await p.keyboard.press('Escape'); await w(400); t1.push(await E(() => !!PANEL.inv));
  await p.keyboard.press('v'); await w(400);
  // 滑鼠：點分頁列「角色」、點關閉鈕
  const cb = await (await p.$('#pinv .cclose')).boundingBox(); await p.mouse.click(cb.x + 18, cb.y + 18); await w(400); t1.push(await E(() => !!PANEL.inv));
  const tabs = await E(() => [...$('dnav').children].map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 6), Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }));
  const ct = tabs.find(t => /角色/.test(t[0])); await p.mouse.click(ct[1] + 20, ct[2] + 15); await w(400); t1.push(await open());
  rec('T1', 'V 開→V 關→V 開→Esc 關→(開)關閉鈕關→分頁列角色開', JSON.stringify(t1) === '[true,false,true,false,false,true]', { t1, dnav: tabs.length, tabs });
  // ---------- T2 長按／右鍵選單 ----------
  await p.mouse.move(300, 300);
  const row = async (i = 0) => (await p.$$('#pinv .cr'))[i].boundingBox();
  let rb = await row();
  await p.mouse.move(rb.x + 40, rb.y + 10); await p.mouse.down(); await w(380); const lp380 = await menuOn(); await w(250); const lp630 = await menuOn(); await p.mouse.up(); await w(150); const lpAfterUp = await menuOn();
  rec('T2a', '長按 0.38 秒還沒開、0.63 秒開、放開後留著', !lp380 && lp630 && lpAfterUp, { lp380, lp630, lpAfterUp });
  const mb = await E(() => { const r = $('pinv').querySelector('.cmenu').getBoundingClientRect(); return [r.x, r.y, r.width, r.height, $('pinv').querySelector('.cmenu').innerText, !!$('pinv').querySelector('.btn.pri')]; });
  rec('T2b', '選單位置 900,360 210×≥168、內容、沒有主鈕', Math.abs(mb[0] - 900) <= 1 && Math.abs(mb[1] - 360) <= 1 && Math.abs(mb[2] - 210) <= 1 && !mb[5], mb);
  // 短按不開
  await p.keyboard.press('Escape'); await w(100);
  await p.mouse.click(rb.x + 40, rb.y + 10); await w(150); rec('T2c', '短按（click）不開選單', !(await menuOn()));
  // 停留 1.2 秒不開（Q6）
  await p.mouse.move(rb.x + 60, rb.y + 10); await w(1200); rec('T2d', '停留 1.2 秒不開選單（Q6）', !(await menuOn()));
  // 右鍵（真的滑鼠右鍵）＋各種關法
  const closes = [];
  for (const how of [[300, 300], [400, 650], [640, 20], [20, 700], 'Escape', [1000, 120], [1240, 300]]) {
    if (!(await open())) { await p.keyboard.press('v'); await w(350); }
    rb = await row(1);
    await p.mouse.click(rb.x + 40, rb.y + 10, { button: 'right' }); await w(120);
    const o = await menuOn();
    if (how === 'Escape') await p.keyboard.press('Escape'); else await p.mouse.click(how[0], how[1]);
    await w(150);
    closes.push([how, o, !(await menuOn()), await E(() => !!PANEL.inv), await E(() => Object.keys(PANEL).filter(k => PANEL[k]).join())]);
  }
  rec('T2e', '右鍵開；點 (300,300)(400,650)(640,20)(20,700)、Esc、右欄內選單外 (1000,120)(1240,300) 都關', closes.every(c => c[1] && c[2]) && closes[4][3], closes);
  if (!(await open())) { await p.keyboard.press('v'); await w(350); }
  await E(() => { for (const k of Object.keys(PANEL)) if (k !== 'inv' && PANEL[k]) closePanels(); });
  if (!(await open())) { await p.keyboard.press('v'); await w(350); }
  // L-9 說明列：有 TERMS 才畫
  const l9 = await E(() => { const out = []; for (const e of CH_ALL) { if (e[2](ST) == null) continue; CH.menu = e[0]; hudPanels(); const m = $('pinv').querySelector('.cmenu'); out.push([e[1], !!TERMS[e[1]], !!m.querySelector('p'), m.querySelector('b').textContent]); } CH.menu = null; hudPanels(); return out; });
  rec('T2f', 'L-9：有 TERMS 才畫說明列', l9.every(x => x[1] === x[2]), { withTerm: l9.filter(x => x[1]).map(x => x[0]), noTerm: l9.filter(x => !x[1]).map(x => x[0]) });
  // 釘滿 6 個時選單
  const full = await E(() => { const P = pins(); const free = CH_ALL.filter(e => e[2](ST) != null && !P.includes(e[0])); P[P.indexOf(null)] = free[0][0]; CH.menu = free[1][0]; hudPanels(); const m = $('pinv').querySelector('.cmenu'); const r = [m.innerText, m.querySelector('[data-c^="star:"]').disabled]; P[P.indexOf(free[0][0])] = null; CH.menu = null; hudPanels(); return r; });
  rec('T2g', '釘滿 6 個：「釘到摘要」停用＋「已滿，先取消一個」', full[1] && /已滿，先取消一個/.test(full[0]), full);
  // ---------- T3 名詞提示 ----------
  await p.mouse.move(300, 300); await w(200);
  const rs = await E(() => { const r = $('pinv').querySelector('.cres span').getBoundingClientRect(); return [r.x, r.y]; });
  const tm = () => E(() => !!$('ctm') && !$('ctm').hidden);
  await p.mouse.move(rs[0] + 10, rs[1] + 8); const t0 = Date.now(); let shown = null; const samples = [];
  while (Date.now() - t0 < 900) { const s = await tm(); samples.push([Date.now() - t0, s]); if (s && shown == null) shown = Date.now() - t0; await w(20); }
  const tmi = await E(() => { const r = $('ctm').getBoundingClientRect(); return [$('ctm').innerText, r.x, r.y, r.width, r.height]; });
  await shot('t3-term');
  rec('T3a', '名詞提示約 0.4 秒出現；只有正文；位置', shown >= 380 && shown <= 520 && !/名詞提示|停留|R3|Ｒ3/.test(tmi[0]), { shownMs: shown, last300: samples.filter(s => s[0] < 380).every(s => !s[1]), tmi });
  await p.mouse.move(300, 300); await w(150); rec('T3b', '移開收起', !(await tm()));
  // 數值列名詞（有 TERMS 的）
  const tr = await E(() => [...$('pinv').querySelectorAll('[data-tm2]')].map(e => e.textContent.trim().slice(0, 10)));
  rec('T3c', '有名詞提示的元素', tr.length > 0, tr);
  // ---------- T4 候選＋比較浮窗 ----------
  await p.click('#pinv [data-c="tab:cand"]'); await w(150);
  rec('T4a', '沒選格點「候選裝備」不切', await E(() => !NAV.slot));
  await p.click('#pinv [data-c="eq:helm"]'); await w(200);
  const hdr = await E(() => [$('pinv').querySelector('.cnt').textContent, $('pinv').querySelector('.cns').textContent, slotCands('helm').length, slotCands('helm').filter(i => !cantWear(i)).length, [...$('pinv').querySelectorAll('.c12g .cq')].map(e => [(e.querySelector('.cj') || {}).textContent || '', e.classList.contains('nq') ? 'nq' : '', !!e.querySelector('.cnq'), getComputedStyle(e).opacity].join('|'))]);
  rec('T4b', 'V-6 標題與「可以換的 n 件」只算穿得上', hdr[1].startsWith(`可以換的 ${hdr[3]} 件`) && hdr[2] > hdr[3], hdr);
  const c0 = await (await p.$('#pinv .c12g .cq:not(.nq)')).boundingBox();
  await p.mouse.move(c0.x + 32, c0.y + 32);
  const imm = await E(() => !!$('pinv').querySelector('.c12p')); await w(100);
  const pop = () => E(() => { const c = $('pinv').querySelector('.c12p'); if (!c) return null; const r = c.getBoundingClientRect(); const L = [...c.querySelectorAll('section')].map(s => { const q = s.getBoundingClientRect(); return [s.className, +q.y.toFixed(1), +q.height.toFixed(1)]; }); return { box: [r.x, r.y, r.width, r.height, r.bottom], det: c.classList.contains('det'), pe: getComputedStyle(c).pointerEvents, txt: c.innerText, L }; });
  const p4 = await pop();
  rec('T4c', '懸停立即出現（同一輪 evaluate）；796,76 寬 460 高∈[448,486] 下緣≤562；不接滑鼠；沒有「懸浮時才出現」', imm && p4 && Math.abs(p4.box[0] - 796) <= 1 && Math.abs(p4.box[1] - 76) <= 1 && Math.abs(p4.box[2] - 460) <= 1 && p4.box[3] >= 448 && p4.box[3] <= 486 && p4.box[4] <= 562 && p4.pe === 'none' && !/懸浮時才出現/.test(p4.txt), p4);
  await p.keyboard.down('Alt'); await w(120); const p4b = await pop(); await shot('t4-alt');
  await p.keyboard.up('Alt'); await w(120); const p4c = await pop();
  rec('T4d', '按住 Alt → 詳細（高 486、下緣 562、T 階／區間、「放開 Alt」）；放開回簡易', p4b.det && Math.abs(p4b.box[3] - 486) <= 1 && Math.abs(p4b.box[4] - 562) <= 1 && /T\d/.test(p4b.txt) && /放開 Alt/.test(p4b.txt) && !/懸浮時才出現/.test(p4b.txt) && !p4c.det && /按住 Alt/.test(p4c.txt), { det: p4b.box, txt: p4b.txt, back: p4c.box });
  // 滑鼠移到下一格：浮窗換內容（浮窗蓋住也能換格）
  const ids0 = await E(() => CH.hov); await p.mouse.move(c0.x + 32 + 70, c0.y + 32); await w(80); const ids1 = await E(() => CH.hov);
  await p.mouse.move(300, 300); await w(80); const gone = await E(() => !$('pinv').querySelector('.c12p'));
  rec('T4e', '浮窗蓋著候選格仍可移到別格換內容；移出右欄收起', ids0 !== ids1 && ids1 != null && gone, { ids0, ids1, gone });
  // ---------- T5 ③ 捲動（滑鼠） ----------
  // 找 ③ 會溢出的候選（按住 Alt 時）
  const big = await E(() => { let best = null; for (const it of slotCands('helm').filter(i => !cantWear(i))) { const n = Math.max(it.a.length, S.eq.helm.a.length); if (!best || n > best[1]) best = [it.id, n]; } return best; });
  const cb2 = await (await p.$(`#pinv [data-c="cand:${big[0]}"]`)).boundingBox();
  const L3 = () => E(() => { const P = $('pinv'), c = P.querySelector('.c12p'); if (!c) return null; const s = c.querySelector('.l3s'), m = c.querySelector('.l3m'), t = c.querySelector('.l3 .csb'); const tr = t.getBoundingClientRect(); const y = s.getBoundingClientRect().bottom + .5; return { top: s.scrollTop, max: s.scrollHeight - s.clientHeight, list: P.querySelector('.c12g').scrollTop, m: m.hidden ? '(hidden)' : m.style.visibility === 'hidden' ? '(invisible)' : m.innerText, mBox: (r => [r.x, r.y, r.width, r.height])(m.getBoundingClientRect()), bar: !t.hidden, barBox: [tr.x, tr.y, tr.width, tr.height], thumb: t.firstChild.style.transform + ' h' + t.firstChild.style.height, below: [...s.querySelectorAll('li')].filter(li => li.getBoundingClientRect().bottom > y).length, li: s.querySelectorAll('li').length, det: c.classList.contains('det'), hov: CH.hov }; });
  await p.mouse.move(cb2.x + 32, cb2.y + 32); await w(120);
  const s0 = await L3();
  await p.mouse.wheel(0, 100); await w(150); const s1 = await L3();   // 沒按 Alt
  await E(() => ($('pinv').querySelector('.c12g').scrollTop = 0)); await w(80);
  await p.mouse.move(cb2.x + 32, cb2.y + 32); await w(100);
  await p.keyboard.down('Alt'); await w(150); const s2 = await L3(); await shot('t5-l3-alt-before');
  await p.mouse.wheel(0, 48); await w(150); const s3 = await L3(); await shot('t5-l3-alt-after');
  await p.mouse.wheel(0, 2000); await w(150); const s4 = await L3(); await shot('t5-l3-alt-bottom');
  await p.keyboard.up('Alt'); await w(150); const s5 = await L3();
  await p.keyboard.down('Alt'); await w(150); const s6 = await L3();
  await p.mouse.wheel(0, 48); await w(120); const s6b = await L3();
  // 按住 Alt 換格
  const other = await E(id => { const e = [...$('pinv').querySelectorAll('.c12g .cq:not(.nq)')].find(e => +e.dataset.c.slice(5) !== id); const r = e.getBoundingClientRect(); return [r.x + 32, r.y + 32]; }, big[0]);
  await p.mouse.move(other[0], other[1]); await w(120); const s7 = await L3();
  await p.mouse.move(cb2.x + 32, cb2.y + 32); await w(120); const s8 = await L3();
  await p.keyboard.up('Alt'); await w(100);
  rec('T5a', '沒按 Alt：滾輪捲候選清單、③ 不動', s1 && s1.list > 0 && s1.top === 0 || (s1 === null), { s0, s1 });
  rec('T5b', '按住 Alt：滾輪捲 ③、候選清單不動；「▼ 還有 n 條」與 4px 軌', s2.max > 0 && s3.top > 0 && s3.list === 0 && s2.bar && Math.abs(s2.barBox[2] - 4) < .1 && /▼ 還有 \d+ 條/.test(s2.m) && +s2.m.match(/\d+/)[0] === s2.below, { s2, s3, s4 });
  rec('T5c', '捲到底：n=0 時列位留著但淡掉', s4.top === s4.max && s4.below === 0, { m: s4.m, top: s4.top, max: s4.max });
  rec('T5d', '放開 Alt 回頂端；再按住也在頂端', s5.top === 0 && s6.top === 0, { s5top: s5.top, s5det: s5.det, s5m: s5.m, s5max: s5.max, s6top: s6.top });
  rec('T5e', '換格回頂端（按住 Alt 捲過後移到別格再移回）', s6b.top > 0 && s7.top === 0 && s8.top === 0, { s6b: s6b.top, s7: [s7.hov, s7.top], s8: [s8.hov, s8.top] });
  // 戰鬥中重畫後捲動位置保留
  await p.keyboard.down('Alt'); await w(100); await p.mouse.wheel(0, 30); await w(100); const k0 = await L3(); await E(() => hudPanels()); await w(50); const k1 = await L3(); await w(1200); const k2 = await L3(); await p.keyboard.up('Alt');
  rec('T5f', '面板重畫（hudPanels）後 ③ 捲動位置留著', k0.top > 0 && k1.top === k0.top && k2.top === k0.top, [k0.top, k1.top, k2.top]);
  // 視窗失焦放開 Alt
  await p.keyboard.down('Alt'); await w(80); await E(() => dispatchEvent(new Event('blur'))); await w(80); const bl = await L3(); await p.keyboard.up('Alt');
  rec('T5g', '視窗失焦＝放開 Alt（回簡易）', bl && !bl.det, bl && bl.det);
  // ---------- T6 排序／篩選 ----------
  await p.mouse.move(300, 300);
  const cellsNow = () => E(() => [...$('pinv').querySelectorAll('.c12g .cq')].map(e => { const it = S.inv.items.find(x => x.id === +e.dataset.c.slice(5)); return [it.id, (e.querySelector('.cj') || {}).textContent || '', cantWear(it) ? 1 : 0, it.lock ? 1 : 0]; }));
  const JO = { '▲▲': 0, '▲': 1, '±': 2, '—': 3, '▼': 4, '': 5 };
  const o1 = await cellsNow();
  await p.click('#pinv [data-c="sort"]'); await w(120); const o2 = await cellsNow(); const sortTxt = await E(() => $('pinv').querySelector('.csort').textContent);
  await p.click('#pinv [data-c="sort"]'); await w(120);
  await p.click('#pinv [data-c="f:up"]'); await w(120); const o3 = await cellsNow();
  await E(() => { const it = slotCands('helm').filter(i => !cantWear(i))[0]; it.lock = 1; hudPanels(); });
  await p.click('#pinv [data-c="f:lock"]'); await w(120); const o4 = await cellsNow();
  await p.click('#pinv [data-c="f:all"]'); await w(120); const o5 = await cellsNow();
  const okJ = o1.every((c, i) => !i || c[2] > o1[i - 1][2] || (c[2] === o1[i - 1][2] && JO[o1[i - 1][1]] <= JO[c[1]]));
  const okN = o2.every((c, i) => !i || c[2] > o2[i - 1][2] || (c[2] === o2[i - 1][2] && o2[i - 1][0] > c[0]));
  rec('T6a', '排序「判定」：▲▲▲±—▼，不能裝備排最後', okJ, o1.map(c => c[1] + (c[2] ? 'x' : '')).join(' '));
  rec('T6b', '排序「最新」：id 新到舊，不能裝備排最後', okN && /最新/.test(sortTxt), { sortTxt, ids: o2.map(c => c[0] + (c[2] ? 'x' : '')).join(' ') });
  rec('T6c', '篩選「只看 ▲」：只有 ▲／▲▲，不含不能裝備', o3.every(c => (c[1] === '▲' || c[1] === '▲▲') && !c[2]), o3.map(c => c[1]).join(' ') || '(空)');
  rec('T6d', '篩選「未鎖」：不含鎖定；含不能裝備（排後面）', o4.every(c => !c[3]) && o4.length === o5.length - 1 && o4.some(c => c[2]), { lock: o4.length, all: o5.length });
  await E(() => { for (const it of S.inv.items) it.lock = 0; hudPanels(); });
  // 沒有符合篩選
  // ---------- T7 不能裝備 ----------
  const h0 = await E(() => S.eq.helm.id);
  await p.hover('#pinv .c12g .cq.nq'); await w(100);
  const nq = await E(() => { const c = $('pinv').querySelector('.c12p'); const e = $('pinv').querySelector('.c12g .cq.nq'); const s = e.querySelector('.cnq').getBoundingClientRect(), r = e.getBoundingClientRect(); return { l4: c.querySelector('.l4').innerText, off: !!c.querySelector('.l5 .off[aria-disabled="true"]'), l5: c.querySelector('.l5').innerText, aria: e.getAttribute('aria-label'), slash: [r.right - s.right, r.bottom - s.bottom, s.width, s.height], cj: !!e.querySelector('.cj'), op: getComputedStyle(e).opacity, cand: c.querySelector('.l1').innerText }; });
  await shot('t7-cantwear');
  await p.click('#pinv .c12g .cq.nq'); await w(120);
  rec('T7', '不能裝備：④ 原因、Ⓐ 停用、斜線 12×12 距右下 3、無判定角標、不淡化、點了不換', /不能裝備：/.test(nq.l4) && nq.off && !nq.cj && nq.op === '1' && (await E(id => S.eq.helm.id === id, h0)), nq);
  // 鎖＋不能裝備同時
  const both = await E(() => { const it = slotCands('helm').find(cantWear); it.lock = 1; hudPanels(); const e = $('pinv').querySelector(`[data-c="cand:${it.id}"]`); const a = e.querySelector('.ck').getBoundingClientRect(), b2 = e.querySelector('.cnq').getBoundingClientRect(); it.lock = 0; const ov = !(a.right <= b2.left || b2.right <= a.left || a.bottom <= b2.top || b2.bottom <= a.top); hudPanels(); return { lock: [a.x, a.y, a.width, a.height], slash: [b2.x, b2.y, b2.width, b2.height], overlap: ov }; });
  rec('T7b', '鎖＋斜線不重疊', !both.overlap, both);
  // ---------- T8 點候選換上、X 鎖定 ----------
  await p.mouse.move(300, 300);
  const w0 = await E(() => { const e = $('pinv').querySelector('.c12g .cq:not(.nq)'); return +e.dataset.c.slice(5); });
  await p.hover(`#pinv [data-c="cand:${w0}"]`); await w(80);
  const lk0 = await E(() => [S.eq.helm.lock || 0, S.inv.items.find(x => x.id === CH.hov).lock || 0]);
  await p.keyboard.press('x'); await w(120);
  const lk1 = await E(() => [S.eq.helm.lock || 0, S.inv.items.find(x => x.id === CH.hov) ? S.inv.items.find(x => x.id === CH.hov).lock || 0 : 'gone', !!$('pinv').querySelector('[data-c="eq:helm"] .ck')]);
  await p.keyboard.press('x'); await w(120);
  rec('T8a', 'X 鎖的是選中格身上那件（不是懸停候選）；格右下出現鎖', lk0[0] === 0 && lk1[0] === 1 && lk1[1] === 0 && lk1[2], { lk0, lk1 });
  await p.click(`#pinv [data-c="cand:${w0}"]`); await w(200);
  rec('T8b', '點候選＝換上', await E(id => S.eq.helm.id === id, w0), await E(() => S.eq.helm.id));
  // ④ 沒有變化：候選＝身上的複製
  const same = await E(() => { const c = JSON.parse(JSON.stringify(S.eq.helm)); c.id = ++IID; invPut(S.inv, c); changed(); hudPanels(); CH.hov = null; chHov(c.id); const t = $('pinv').querySelector('.c12p .l4').innerText; chHov(null); S.inv.items = S.inv.items.filter(x => x.id !== c.id); changed(); hudPanels(); return t; });
  rec('T8c', '④ 全為 0 寫「沒有變化」', /沒有變化/.test(same), same);
  // ---------- T9 手把 ----------
  await E(() => { window.__pad = { buttons: [...Array(17)].map(() => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, mapping: 'standard', id: 'mock', index: 0 }; navigator.getGamepads = () => [window.__pad]; dispatchEvent(new Event('gamepadconnected')); });
  const press = async (i, hold = 80) => { await E(i => (__pad.buttons[i].pressed = true), i); await w(hold); await E(i => (__pad.buttons[i].pressed = false), i); await w(80); };
  const foc = () => E(() => { const f = document.activeElement; return f && f.dataset ? f.dataset.c || f.tagName : null; });
  await p.mouse.move(300, 300); await w(100);
  const g = [];
  await press(13); g.push(['下(無焦點→第一格)', await foc()]);
  await press(13); g.push(['下', await foc()]);
  await press(15); g.push(['右', await foc(), await E(() => !!$('pinv').querySelector('.c12p'))]);
  await press(15); g.push(['右', await foc(), await E(() => CH.hov)]);
  await press(13); g.push(['下', await foc(), await E(() => CH.hov)]);
  await press(14); g.push(['左', await foc(), await E(() => CH.hov)]);
  await press(12); g.push(['上', await foc(), await E(() => CH.hov)]);
  const popPad = await E(() => !!$('pinv').querySelector('.c12p'));
  await shot('t9-pad-focus');
  const focVis = await E(() => { const f = document.activeElement; const s = getComputedStyle(f); return [s.outlineStyle, s.outlineWidth, s.filter, s.boxShadow]; });
  rec('T9a', '手把方向鍵在裝備格與候選格間移焦點；焦點候選立即出浮窗', g.slice(1).every(x => x[1]) && g.some(x => /^cand:/.test(x[1])) && g.some(x => /^eq:/.test(x[1])) && popPad, { g, focVis });
  // 走遍 4×3：從候選第 1 格往右 3 次、往下 2 次
  await E(() => $('pinv').querySelector('.c12g .cq').focus()); await w(60);
  const walk = [await foc()];
  for (const i of [15, 15, 15, 13, 13, 14, 14, 14, 12, 12]) { await press(i, 60); walk.push(await foc()); }
  const order = await E(() => [...$('pinv').querySelectorAll('.c12g .cq')].map(e => e.dataset.c));
  const idx = walk.map(c => order.indexOf(c));
  rec('T9b', '候選 4×3 照行列移動（右右右下下左左左上上）', JSON.stringify(idx) === JSON.stringify([0, 1, 2, 3, 7, 11, 10, 9, 8, 4, 0]), idx);
  // 候選第 1 欄往左 → 回左柱裝備格；第 4 欄往右 → 右柱
  await press(14, 60); const toL = await foc();
  await E(() => $('pinv').querySelectorAll('.c12g .cq')[3].focus()); await press(15, 60); const toR = await foc();
  rec('T9c', '候選最左欄再往左→左柱裝備格；最右欄再往右→右柱裝備格', /^eq:/.test(toL) && /^eq:/.test(toR), { toL, toR });
  // Y 按住＝詳細＋右搖桿捲 ③
  await E(id => $('pinv').querySelector(`[data-c="cand:${id}"]`) && $('pinv').querySelector(`[data-c="cand:${id}"]`).focus(), big[0]); await w(100);
  let y0 = await L3();
  if (!y0 || y0.hov !== big[0]) { const any = await E(() => { let best = null; for (const it of slotCands('helm').filter(i => !cantWear(i))) { const n = Math.max(it.a.length, S.eq.helm.a.length); if (!best || n > best[1]) best = [it.id, n]; } $('pinv').querySelector(`[data-c="cand:${best[0]}"]`).focus(); return best; }); await w(100); y0 = await L3(); }
  await E(() => (__pad.buttons[3].pressed = true)); await w(150); const y1 = await L3();
  await E(() => (__pad.axes[3] = 1)); await w(300); await E(() => (__pad.axes[3] = 0)); await w(80); const y2 = await L3();
  await E(() => (__pad.axes[3] = -1)); await w(120); await E(() => (__pad.axes[3] = 0)); await w(80); const y2b = await L3();
  await E(() => (__pad.axes[3] = 0.15)); await w(200); const y2c = await L3(); await E(() => (__pad.axes[3] = 0));
  await shot('t9-pad-y-scroll');
  await E(() => (__pad.buttons[3].pressed = false)); await w(150); const y3 = await L3();
  await E(() => (__pad.axes[3] = 1)); await w(200); await E(() => (__pad.axes[3] = 0)); const y4 = await L3();
  rec('T9d', '手把按住 Y＝詳細；右搖桿下推捲 ③、上推捲回；死區 0.2；放開 Y 回簡易且回頂端；沒按 Y 右搖桿不捲', y1.det && y1.max > 0 && y2.top > 0 && y2b.top < y2.top && y2c.top === y2b.top && !y3.det && y3.top === 0 && y4.top === 0, { max: y1.max, y1: y1.top, y2: y2.top, y2b: y2b.top, y2c: y2c.top, y3: [y3.det, y3.top], y4: y4.top, m: [y1.m, y2.m] });
  // 手把 Y 按住時換格回頂端
  await E(() => (__pad.buttons[3].pressed = true)); await w(120); await E(() => (__pad.axes[3] = 1)); await w(200); await E(() => (__pad.axes[3] = 0)); const z1 = await L3();
  await press(15, 60); const z2 = await L3(); await E(() => (__pad.buttons[3].pressed = false)); await w(100);
  rec('T9e', '按住 Y 捲過後方向鍵換格：回頂端', z1.top > 0 && z2.hov !== z1.hov && z2.top === 0, { z1: [z1.hov, z1.top], z2: [z2.hov, z2.top] });
  // R3 名詞
  await E(() => $('pinv').querySelector('.cres span').focus()); await w(50); await press(11); const r3 = await E(() => !!$('ctm') && !$('ctm').hidden && $('ctm').innerText);
  rec('T9f', '手把 R3：焦點名詞出提示', !!r3, r3);
  await E(() => chTermHide());
  // Ⓐ 裝備焦點候選
  const a0 = await E(() => { const e = $('pinv').querySelector('.c12g .cq:not(.nq)'); e.focus(); return [+e.dataset.c.slice(5), S.eq.helm.id]; }); await w(60);
  await press(0); const a1 = await E(() => S.eq.helm.id);
  rec('T9g', '手把 Ⓐ：裝備焦點上的候選', a1 === a0[0], { a0, a1 });
  const fAfter = await foc();
  // Ⓑ 關
  await press(1); await w(300); rec('T9h', '手把 Ⓑ：關面板', !(await E(() => !!PANEL.inv)), { focusAfterEquip: fAfter });
  await p.keyboard.press('v'); await w(400);
  // ---------- T10 編輯釘選 ----------
  await E(() => { NAV.slot = null; CH.hov = null; hudPanels(); });
  await p.mouse.move(300, 300); await w(100);
  const pe = [];
  await p.click('#pinv .cc.emp'); await w(120); pe.push(await E(() => [CH.edit, $('pinv').querySelector('.cdps').innerText, $('pinv').querySelectorAll('.btn.pri').length, $('pinv').querySelector('.btn.pri').textContent]));
  await p.click('#pinv .cpin[aria-pressed="false"]'); await w(100); pe.push(await E(() => [S.pin.filter(Boolean).length, $('pinv').querySelector('.cdps').innerText, !!$('pinv').querySelector('.cc.emp')]));
  await p.click('#pinv .cpin[aria-pressed="false"]'); await w(100); pe.push(await E(() => [S.pin.filter(Boolean).length, [...document.querySelectorAll('.toast,.hwarn,#warn,.warn')].map(e => e.textContent).join('|').slice(0, 60)]));
  // 點列本身不響應
  const rowB = await (await p.$('#pinv .cr')).boundingBox(); const pn0 = await E(() => JSON.stringify(S.pin)); await p.mouse.click(rowB.x + 40, rowB.y + 12); await w(100); pe.push((await E(() => JSON.stringify(S.pin))) === pn0);
  // 長按在編輯態不開選單
  await p.mouse.move(rowB.x + 40, rowB.y + 12); await p.mouse.down(); await w(700); await p.mouse.up(); await w(100); pe.push(!(await menuOn()));
  // 點已釘卡取消
  await p.click('#pinv button.cc:not(.emp)'); await w(100); pe.push(await E(() => S.pin.filter(Boolean).length));
  await p.click('#pinv .cpin[aria-pressed="true"]'); await w(100); pe.push(await E(() => S.pin.filter(Boolean).length));
  await shot('t10-pin-edit');
  await p.click('#pinv .cdone'); await w(120); pe.push(await E(() => [CH.edit, !!$('pinv').querySelector('.cedit'), $('pinv').querySelectorAll('.btn.pri').length]));
  const saved = await E(() => JSON.parse(localStorage.getItem('dungeonpoe_v1') || '{}').pin);
  rec('T10', '空位進編輯；☆ 釘上（6／6、空位消失）；滿了再釘不加；列本身不響應；編輯態長按不開選單；點已釘卡／★ 取消；完成回 01；存檔', pe[0][0] === 1 && pe[0][2] === 1 && /完成/.test(pe[0][3]) && pe[1][0] === 6 && !pe[1][2] && pe[2][0] === 6 && pe[3] && pe[4] && pe[5] === 5 && pe[6] === 4 && pe[7][0] === 0 && pe[7][1] && pe[7][2] === 0, { pe, saved });
  await E(() => { S.pin = PIN_DEF.slice(); hudPanels(); });
  // ---------- T11 空格 ----------
  await E(() => { S.inv.items = S.inv.items.filter(x => !slotCands('helm').includes(x)); S.eq.helm = null; changed(); hudPanels(); });
  await p.click('#pinv [data-c="eq:helm"]'); await w(200);
  const em = await E(() => ({ aria: $('pinv').querySelector('[data-c="eq:helm"]').getAttribute('aria-label'), txt: [...$('pinv').querySelectorAll('.cet,.cep,.cmk')].map(e => e.textContent), pri: $('pinv').querySelectorAll('.btn.pri').length, border: getComputedStyle($('pinv').querySelector('[data-c="eq:helm"]')).borderTopStyle }));
  await p.click('#pinv .cmk'); await w(500);
  const fg = await E(() => ({ panels: Object.keys(PANEL).filter(k => PANEL[k]), nav: typeof navOn === 'function' ? navOn() : null, kind: typeof MK !== 'undefined' ? MK.kind : null, fseg: typeof FSEG !== 'undefined' ? FSEG : null }));
  await shot('t11-mkslot');
  rec('T11', '空格：讀屏文字、實心框、唯一主鈕「去鍛造打一件」→開鍛造›打造帶入頭部', em.aria === '頭部空著，倉庫有 0 件可以裝備' && em.pri === 1 && em.border === 'solid' && fg.kind === 'helm', { em, fg });
  // 空格但有候選（能裝的都算 ▲；不能裝備不給 ▲）
  await E(() => { closePanels(); }); await p.keyboard.press('v'); await w(400); if (!(await open())) { await p.keyboard.press('v'); await w(400); }
  const em2 = await E(() => { const H = BASES.filter(b => b.k === 'helm'); invPut(S.inv, mkItem(H[0].id, 10, 1)); invPut(S.inv, mkItem(H[H.length - 1].id, 80, 2)); changed(); NAV.slot = 'helm'; hudPanels(); return { cns: $('pinv').querySelector('.cns').textContent, cnt: $('pinv').querySelector('.cnt').textContent, cells: [...$('pinv').querySelectorAll('.c12g .cq')].map(e => [(e.querySelector('.cj') || {}).textContent || '', e.classList.contains('nq')]), badge: ($('pinv').querySelector('[data-c="eq:helm"] .cn') || {}).textContent, aria: $('pinv').querySelector('[data-c="eq:helm"]').getAttribute('aria-label') }; });
  await shot('t11-empty-with-cands');
  rec('T11b', '空格有候選：能裝的算 ▲、不能裝備不給 ▲、n 只算能裝的', em2.cells.every(c => c[1] ? c[0] === '' : c[0] === '▲') && /可以換的 1 件，▲ 1/.test(em2.cns), em2);
  // ---------- T12 樣式 ----------
  await E(() => { const H = BASES.filter(b => b.k === 'helm'); S.eq.helm = mkItem(H[0].id, 10, 2); changed(); NAV.slot = null; hudPanels(); });
  await p.mouse.move(300, 300); await w(200);
  const st = await E(() => { const P = $('pinv'), g = (q, pr) => { const e = P.querySelector(q); if (!e) return null; const s = getComputedStyle(e); return pr.map(k => s[k]).join(' | '); }; const F = ['fontSize', 'fontWeight', 'color'];
    return { box: getComputedStyle(P).boxShadow, edge: getComputedStyle(P).getPropertyValue('--panel-edge'), cellI: g('.cq > i:not(.cx)', ['textShadow']), fonts: Object.fromEntries(Object.entries({ '抗性標 .cres small': '.cres small', '抗性值 .cres span': '.cres span', 'Lv .chd span:last-child': '.chd span:last-child', '標題 .chd b': '.chd b', 'DPS 標': '.cdps small', 'DPS 值': '.cdps b', '卡標': '.cc small', '卡值': '.cc b', '分組': '.cg', '分組項數': '.cg small', '子組': '.cg.sub', '列名': '.cr span', '列值': '.cr b', '切換選中': '.ctg.on', '切換未選': '.ctg:not(.on)', '編輯釘選': '.cedit', '經驗%': '.cxp span', '角標✦n': '.cq .cs', '關閉 kbd': '.cclose kbd' }).map(([k, q]) => [k, g(q, F)])) }; });
  rec('T12a', '數值頁字級字重（供對照圖例）', true, st);
  // 候選＋浮窗樣式
  await E(() => { const H = BASES.filter(b => b.k === 'helm'); for (let i = 0; i < 6; i++) invPut(S.inv, mkItem(H[i % H.length].id, 10 + i, [2, 1, 0][i % 3])); changed(); NAV.slot = 'helm'; hudPanels(); });
  await p.hover('#pinv .c12g .cq:not(.nq)'); await w(100); await p.keyboard.down('Alt'); await w(100);
  const st2 = await E(() => { const P = $('pinv'), c = P.querySelector('.c12p'), s = getComputedStyle(c), g = (q, pr) => { const e = P.querySelector(q); if (!e) return null; const s = getComputedStyle(e); return pr.map(k => s[k]).join(' | '); }, F = ['fontSize', 'fontWeight', 'color'];
    return { box: s.boxShadow, outline: [s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset], sec: [...c.querySelectorAll('section')].map(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return [e.className, s.borderBottomStyle, s.borderBottomWidth, s.borderBottomColor, +r.x.toFixed(1), +r.width.toFixed(1), +r.bottom.toFixed(1)]; }), fonts: Object.fromEntries(Object.entries({ '① 小標': '.l1 small', '① 名稱': '.l1 b', '② 標籤': '.l2 .kv small', '② 值': '.l2 .kv b', '③ 小標': '.l3 .lh', '③ 詞綴': '.l3 li b', '③ T階區間': '.l3 li small', '③ 還有n條': '.l3m', '④ 小標': '.l4 .lh', '④ 換上': '.l4 p', '④ 值色': '.l4 p span', '⑤ 文': '.l5 p', '⑤ kbd': '.l5 kbd', '候選標題': '.cnt', '可以換的': '.cns', '排序': '.csort', '篩選選中': '.cflt .chip.on', '篩選未選': '.cflt .chip:not(.on)' }).map(([k, q]) => [k, g(q, F)])), l5: c.querySelector('.l5').innerText, kbd: [...c.querySelectorAll('.l5 kbd')].map(k => { const r = k.getBoundingClientRect(); return [k.textContent, r.x, r.y, r.width, r.height]; }) }; });
  await p.keyboard.up('Alt');
  rec('T12b', '浮窗樣式：陰影、outline、4 條分層線、字級', st2.box !== 'none' && st2.outline[0] === 'solid' && st2.sec.slice(0, 4).every(x => x[1] === 'solid' && x[2] === '1px' && x[3] === 'rgb(168, 146, 127)') && st2.sec[4][2] === '0px', st2);
  // 長按選單陰影
  await p.mouse.move(300, 300); await E(() => { NAV.slot = null; CH.menu = 'aps'; hudPanels(); });
  const st3 = await E(() => { const m = $('pinv').querySelector('.cmenu'), s = getComputedStyle(m); return [s.boxShadow, s.backgroundColor, s.borderTopColor, getComputedStyle(m.querySelector('b')).fontSize + ' ' + getComputedStyle(m.querySelector('b')).fontWeight, getComputedStyle(m.querySelector('.btn')).fontSize, getComputedStyle($('pinv').querySelector('.cr.on')).height]; });
  rec('T12c', '長按選單陰影與樣式', st3[0] !== 'none', st3); await E(() => { CH.menu = null; hudPanels(); });
  // L-8 暴擊率格式、Q4 第三戒指
  const misc = await E(() => { const f = chStat('crit')[2]; const r = { crit: [7, 6.94, 12.5, 100].map(v => f({ crit: v })) };
    const a = Object.keys(ASC).find(a => Object.entries(ASC[a].N || {}).some(([, n]) => n[3] && n[3].ring3)); const nk = a && Object.entries(ASC[a].N).find(([, n]) => n[3] && n[3].ring3)[0];
    const o = [S.asc, S.at]; S.asc = a; S.at = ['zz' + nk]; r.open = eqOpen(S, 'ring3'); hudPanels(); const e = $('pinv').querySelector('[data-c="eq:ring3"]'); r.ring3 = e ? (q => [q.x, q.y, q.width, q.height])(e.getBoundingClientRect()) : null; r.ringsClosedBefore = null; [S.asc, S.at] = o; hudPanels(); r.ring3Closed = !$('pinv').querySelector('[data-c="eq:ring3"]'); return r; });
  rec('T12d', 'L-8 暴擊率 n.n%；Q4 第三隻戒指 1192,496（沒開不畫）', misc.crit.join() === '7.0%,6.9%,12.5%,100.0%' && misc.ring3 && Math.abs(misc.ring3[0] - 1192) <= 1 && Math.abs(misc.ring3[1] - 496) <= 1 && misc.ring3Closed, misc);
  // 沒有護符列
  rec('T12e', '本版不畫護符列', await E(() => !/護符/.test($('pinv').innerText)), null);
  rec('ERR', 'pageerror', p._errs.length === 0, p._errs);
  fs.writeFileSync(path.join(OUT, 'interact.json'), JSON.stringify(LOG, null, 1));
  await b.close();
})().catch(e => { console.error('CRASH', e); fs.writeFileSync(path.join(OUT, 'interact.json'), JSON.stringify(LOG, null, 1)); process.exit(2); });
