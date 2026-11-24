// 獨立量測：node measure.js URL OUT
const { chromium } = require('/tmp/pw/node_modules/playwright');
const fs = require('fs');
const [URL, OUT] = [process.argv[2], process.argv[3]];
fs.mkdirSync(OUT, { recursive: true });
const R = { screens: {}, tests: [] };
const T = (n, pass, info) => (R.tests.push({ n, pass, info }), console.log((pass ? '✅ ' : '❌ ') + n + ' ' + (info === undefined ? '' : JSON.stringify(info))));
const dump = () => {
  const out = [];
  for (const root of [document.getElementById('pinv'), document.getElementById('ctm')]) {
    if (!root || root.hidden) continue;
    for (const e of [root, ...root.querySelectorAll('*')]) {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || cs.display === 'none') continue;
      const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
      out.push({ tag: e.tagName.toLowerCase(), cls: e.className && e.className.baseVal === undefined ? e.className : '', dc: e.dataset ? e.dataset.c || '' : '',
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        fs: cs.fontSize, fw: cs.fontWeight, col: cs.color, bg: cs.backgroundColor, own: own.slice(0, 30), txt: (e.innerText || '').slice(0, 40).replace(/\n/g, '⏎') });
    }
  }
  return out;
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?' + Date.now()); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const setupInfo = await p.evaluate(() => {
    proSkip(); S.story.tips = 0; S.lv = 49;
    const miss = [];
    for (const e of EQS) {
      if (e.k === 'ring3') continue;
      const B = BASES.filter(b => b.k === e.t && b.lv <= 30);
      if (!B.length) { miss.push(e.k); continue; }
      S.eq[e.k] = mkItem(B[B.length - 1].id, 30, 2);
    }
    const H = BASES.filter(b => b.k === 'helm');
    for (let i = 0; i < 14; i++) invPut(S.inv, mkItem(H[i % H.length].id, 10 + i * 3, [2, 1, 0][i % 3]));
    changed();
    return { miss, eq: Object.keys(S.eq).filter(k => S.eq[k]) };
  });
  console.log('setup', JSON.stringify(setupInfo));
  await p.evaluate(() => runNode(TRUNK_K[0])); await p.waitForTimeout(2500);
  const shot = async n => { await p.screenshot({ path: `${OUT}/${n}.png` }); R.screens[n] = await p.evaluate(dump); };
  const away = () => p.mouse.move(300, 300);
  // V 開
  await p.keyboard.press('v'); await p.waitForTimeout(300);
  T('V 開角色頁', await p.evaluate(() => PANEL.inv && !$('pinv').hidden && $('pinv').classList.contains('c12')));
  // 名詞提示門檻
  const rs = await p.evaluate(() => { const r = document.querySelector('#pinv .cres [data-tm2]').getBoundingClientRect(); return [r.x + 8, r.y + 8]; });
  await p.mouse.move(rs[0], rs[1]);
  const t0 = Date.now(); let seen = -1;
  for (let i = 0; i < 30; i++) { if (await p.evaluate(() => $('ctm') && !$('ctm').hidden)) { seen = Date.now() - t0; break; } await p.waitForTimeout(20); }
  T('名詞提示出現時間 ≈400 ms（容許 380–520）', seen >= 380 && seen <= 520, seen + ' ms');
  T('名詞提示文案（火焰）', /^.*火焰抗性 -?\d+%・最大火焰抗性 \d+%。/.test(await p.evaluate(() => $('ctm').innerText.replace(/\n/g, ' '))), await p.evaluate(() => $('ctm').innerText));
  await shot('01-stats');
  await away(); await p.waitForTimeout(100);
  // 其他名詞（數值列名詞）也有 0.4 秒提示？
  const term2 = await p.evaluate(() => [...document.querySelectorAll('#pinv [data-tm2]')].map(e => e.textContent).slice(0, 12));
  T('有名詞提示的元素（前 12）', term2.length > 1, term2);
  // 02 長按
  const row = await p.evaluate(() => { const r = document.querySelector('#pinv .cr').getBoundingClientRect(); return [r.x + 40, r.y + 10]; });
  await p.mouse.move(row[0], row[1]); await p.mouse.down(); await p.waitForTimeout(400);
  const early = await p.evaluate(() => !!$('pinv').querySelector('.cmenu'));
  await p.waitForTimeout(400); await p.mouse.up(); await p.waitForTimeout(100);
  T('長按：0.4 秒時尚未開，0.8 秒開選單', !early && (await p.evaluate(() => !!$('pinv').querySelector('.cmenu'))));
  await shot('02-stats-menu');
  await p.mouse.click(300, 300); await p.waitForTimeout(100);
  T('點右欄外：選單關', await p.evaluate(() => !$('pinv').querySelector('.cmenu')));
  // 03
  await p.click('#pinv .cedit'); await p.waitForTimeout(100); await away();
  await shot('03-pin-edit');
  T('03 唯一主鈕＝完成', await p.evaluate(() => [...$('pinv').querySelectorAll('.btn.pri')].map(e => e.innerText).join('|')) === '完成');
  // 列本身不響應
  const pin0 = await p.evaluate(() => JSON.stringify(S.pin));
  await p.click('#pinv .cr span'); await p.waitForTimeout(100);
  T('03 點列本身不改釘選', pin0 === (await p.evaluate(() => JSON.stringify(S.pin))));
  await p.click('#pinv .cdone'); await p.waitForTimeout(100);
  // 沒選格點候選
  await p.click('#pinv .ctg.r'); await p.waitForTimeout(200);
  const hint = await p.evaluate(() => document.body.innerText.includes('先點一個裝備格'));
  T('沒選格點「候選裝備」：出提示「先點一個裝備格」', hint);
  // 04a
  await p.click('#pinv [data-c="eq:helm"]'); await p.waitForTimeout(200);
  await p.hover('#pinv .c12g .cq:nth-child(1)');
  const pop0 = await p.evaluate(() => new Promise(r => requestAnimationFrame(() => r(!!$('pinv').querySelector('.c12p')))));
  T('懸停候選：下一幀浮窗就在（0 秒）', pop0);
  await shot('04a-cands-hover');
  await p.keyboard.down('Alt'); await p.waitForTimeout(80);
  T('按住 Alt：詳細', await p.evaluate(() => !!$('pinv').querySelector('.c12p.det')));
  await shot('04b-cands-hover-alt');
  // 按住 Alt 移到另一格：仍詳細
  await p.hover('#pinv .c12g .cq:nth-child(2)'); await p.waitForTimeout(80);
  T('按住 Alt 換懸停別格：仍詳細', await p.evaluate(() => !!$('pinv').querySelector('.c12p.det')));
  await p.keyboard.up('Alt'); await p.waitForTimeout(80);
  T('放開 Alt：回簡易', await p.evaluate(() => !!$('pinv').querySelector('.c12p') && !$('pinv').querySelector('.c12p.det')));
  // Alt 沒懸停時按：不出浮窗
  await away(); await p.keyboard.down('Alt'); await p.waitForTimeout(80);
  T('沒懸停時按 Alt：不出浮窗', await p.evaluate(() => !$('pinv').querySelector('.c12p')));
  await p.keyboard.up('Alt');
  // 排序／篩選
  const jd = () => p.evaluate(() => [...document.querySelectorAll('#pinv .c12g .cq')].map(e => (e.querySelector('.cj') || {}).textContent || ''));
  const o1 = await jd(); const JO = { '▲▲': 0, '▲': 1, '±': 2, '—': 3, '▼': 4, '': 5 };
  T('排序判定 ▲▲→▲→±→—→▼', o1.every((j, i) => !i || JO[o1[i - 1]] <= JO[j]), o1.join(' '));
  const sortTxt0 = await p.evaluate(() => $('pinv').querySelector('.csort').innerText);
  await p.click('#pinv .csort'); await p.waitForTimeout(80);
  const sortTxt1 = await p.evaluate(() => $('pinv').querySelector('.csort').innerText);
  T('排序鈕可切換', sortTxt0 !== sortTxt1, [sortTxt0, sortTxt1]);
  await p.click('#pinv .csort');
  const chips = await p.evaluate(() => [...$('pinv').querySelectorAll('.cflt .chip')].map(e => e.innerText));
  T('篩選三晶片 全部｜只看 ▲｜未鎖', chips.join('|') === '全部|只看 ▲|未鎖', chips);
  await p.click('#pinv [data-c="f:up"]'); await p.waitForTimeout(80);
  const up = await jd(); T('只看 ▲', up.length > 0 && up.every(j => j === '▲' || j === '▲▲'), up.join(' '));
  await p.click('#pinv [data-c="f:all"]');
  // 右欄不蓋戰場：所有可見元素在右欄內（除了 #ctm）
  const outside = await p.evaluate(() => [...document.querySelectorAll('#pinv *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).visibility !== 'hidden' && (r.left < 787.5 || r.right > 1264.5 || r.top < 75.5 || r.bottom > 562.5) && !e.closest('.c12g'); }).map(e => e.className + ' ' + Math.round(e.getBoundingClientRect().left) + ',' + Math.round(e.getBoundingClientRect().top)).slice(0, 10));
  T('右欄內元素沒超出 788–1264×76–562（捲動區內除外）', outside.length === 0, outside);
  // 07
  await away();
  await p.evaluate(() => { S.inv.items = S.inv.items.filter(it => kindOf(it) !== 'helm'); S.eq.helm = null; changed(); });
  await p.waitForTimeout(150);
  await shot('07-empty');
  const aria = await p.evaluate(() => document.querySelector('#pinv [data-c="eq:helm"]').getAttribute('aria-label'));
  T('07 讀屏「頭部空著，倉庫有 0 件可以裝備」', aria === '頭部空著，倉庫有 0 件可以裝備', aria);
  // Esc 關、V 關
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  const escClosed = await p.evaluate(() => !PANEL.inv);
  T('Esc 關面板', escClosed);
  if (!escClosed) await p.keyboard.press('v');
  await p.keyboard.press('v'); await p.waitForTimeout(200);
  T('V 再開', await p.evaluate(() => PANEL.inv));
  await p.keyboard.press('v'); await p.waitForTimeout(200);
  T('V 再關', await p.evaluate(() => !PANEL.inv && $('pinv').hidden));
  T('1280 無頁面錯誤', !errs.length, errs);
  fs.writeFileSync(`${OUT}/dump.json`, JSON.stringify(R, null, 0));
  // 其他尺寸
  for (const [w, h, touch] of [[1440, 900], [1280, 800], [390, 844, 1]]) {
    const c = await b.newContext(touch ? { viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: w, height: h } });
    await c.route(/supabase/, r => r.abort());
    const q = await c.newPage(); const e2 = []; q.on('pageerror', e => e2.push(e.message));
    await q.goto(URL + '?' + Date.now()); await q.evaluate(() => localStorage.clear()); await q.reload(); await q.waitForTimeout(1500);
    await q.evaluate(() => { proSkip(); S.story.tips = 0; S.lv = 49; changed(); });
    await q.evaluate(() => (closePanels(), navGo('char'))); await q.waitForTimeout(600);
    const bx = await q.evaluate(() => { const r = $('pinv').getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).concat([$('pinv').classList.contains('c12')]); });
    T(`${w}×${h} 角色頁在畫面內`, bx[0] >= 0 && bx[1] >= 0 && bx[0] + bx[2] <= w && bx[1] + bx[3] <= h, bx);
    T(`${w}×${h} 無頁面錯誤`, !e2.length, e2);
    await q.screenshot({ path: `${OUT}/char-${w}x${h}.png` });
    await c.close();
  }
  await b.close();
  fs.writeFileSync(`${OUT}/dump.json`, JSON.stringify(R, null, 0));
})();
