/* 角色頁桌機 1280×720 實測（S/M2-character-1280.md ＋ M2-character.md v1.1；js/charpanel.js）：
   V 開關、右欄 476×486、裝備格 64／間距 6、候選 4×3 與排序／篩選、比較浮窗（懸停 0 秒、按住 Alt 詳細、放開回簡易）、
   名詞提示停留 0.4 秒、編輯釘選、長按選單、空格沒候選；再開 390×844 確認直立角色頁照舊。
   用法：先開本機伺服器，node tools/char_check.js [網址 http://localhost:8003/] [截圖資料夾]；有 ❌ 結束碼 1 */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const URL = process.argv[2] || 'http://localhost:8003/',
  OUT = process.argv[3] || '';
if (OUT) fs.mkdirSync(OUT, { recursive: true });
let bad = 0;
const ok = (n, c, info = '') => {
  console.log((c ? '✅ ' : '❌ ') + n + (c ? '' : ' ' + info));
  if (!c) bad++;
};
const near = (a, b, t = 1) => Math.abs(a - b) <= t;
const box = (p, q) =>
  p.evaluate(q => {
    const e = document.querySelector(q);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
  }, q);
const is = (b, x, y, w, h) => !!b && near(b[0], x) && near(b[1], y) && near(b[2], w) && near(b[3], h);
/* 跟示意圖接近的一套：Lv 49、身上全稀有、倉庫 14 頂頭盔（候選 4×3 再多兩件可以捲） */
const setup = () => {
  proSkip();
  S.story.tips = 0;
  S.lv = 49;
  S.asc = 'wind';
  for (const e of EQS) {
    if (e.k === 'ring3' || e.k === 'off') continue;
    const B = BASES.filter(b => b.k === e.t && b.lv <= 20);
    S.eq[e.k] = mkItem(B[B.length - 1].id, 20, 2);
  }
  const H = BASES.filter(b => b.k === 'helm');
  for (let i = 0; i < 14; i++) invPut(S.inv, mkItem(H[i % H.length].id, 8 + i * 4, [2, 1, 0][i % 3]));
  changed();
};
/* [圖例編號, 選擇器, 圖例座標 x,y,w,h, 量高度時扣掉的層間距] */
const CH_COMMON = [
  ['10 右欄', '#pinv', [788, 76, 476, 486]],
  ['11 關閉', '#pinv .cclose', [1224, 78, 36, 36]],
  ['12 標題列', '#pinv .chd', [796, 80, 200, 32]],
  ['13 經驗條', '#pinv .cxp', [994, 93, 134, 16]],
  ['14 抗性列', '#pinv .cres', [796, 122, 460, 22]],
  ['15 頭部', '#pinv [data-c="eq:helm"]', [796, 146, 64, 64]],
  ['19 鞋子', '#pinv [data-c="eq:boots"]', [796, 426, 64, 64]],
  ['20 神格', '#pinv .cq:not([data-c^="eq:"])', [796, 496, 64, 64]],
  ['21 武器', '#pinv [data-c="eq:weapon"]', [1192, 146, 64, 64]],
  ['25 戒指', '#pinv [data-c="eq:ring2"]', [1192, 426, 64, 64]],
  ['27 切換 角色數值', '#pinv .ctg', [868, 148, 150, 36]],
  ['28 切換 候選裝備', '#pinv .ctg.r', [1022, 148, 150, 36]]
];
const CH_STATS = [
  ['29 DPS', '#pinv .cdps', [874, 186, 126, 28]],
  ['30 編輯釘選', '#pinv .cedit', [1056, 186, 96, 36]],
  ['31 固定格 生命', '#pinv .cc', [868, 222, 102, 32]],
  ['39 空釘位', '#pinv .cc.emp', [1080, 294, 102, 32]],
  ['40 分組 攻擊／法術', '#pinv .cg', [868, 338, 300, 32]],
  ['41 子組 核心', '#pinv .cg.sub', [868, 374, 300, 28]],
  ['42 數值列（第一列）', '#pinv .cr', [868, 406, 300, 22]]
];
const CH_POP = d => [
  ['47 比較浮窗', '#pinv .c12p', [796, 76, 460, d ? 486 : 448]],
  ['48 ① 身分層', '#pinv .c12p .l1', [796, 98, 460, 68], 13],
  ['49 ② 基底層', '#pinv .c12p .l2', [796, 191, 460, 60], 13],
  ['50 ③ 詞綴層', '#pinv .c12p .l3', [796, 276, 460, d ? 106 : 94], 13],
  ['51 ④ 換上層', '#pinv .c12p .l4', [796, d ? 407 : 395, 460, 52], 13],
  ['52 ⑤ 操作層', '#pinv .c12p .l5', [796, d ? 484 : 472, 460, 44]]
];
const CH_CAND = [
  ['29 候選標題', '#pinv .cnt', [868, 188, 200, 18]],
  ['30 可以換的 n 件', '#pinv .cns', [868, 206, 200, 14]],
  ['31 收起 ×', '#pinv .cx2', [1148, 186, 28, 28]],
  ['32 排序', '#pinv .csort', [868, 224, 88, 24]],
  ['33 篩選', '#pinv .cflt', [962, 224, 152, 24]],
  ['34 候選第 1 格', '#pinv .c12g .cq:nth-child(1)', [868, 254, 64, 64]],
  ['45 候選第 12 格', '#pinv .c12g .cq:nth-child(12)', [1078, 394, 64, 64]]
];
const CH_BOX = {
  '01-stats': [...CH_COMMON, ...CH_STATS, ['44 名詞提示', '#ctm', [516, 110, 260, 56]]],
  '02-stats-menu': [...CH_COMMON, ...CH_STATS.slice(0, 6), ['42 長按選單', '#pinv .cmenu', [900, 360, 210, 168]]],
  '03-pin-edit': [
    ...CH_COMMON,
    ['29 已釘 n／6', '#pinv .cdps', [874, 186, 170, 36]],
    ['30 完成', '#pinv .cdone', [1088, 186, 68, 36]],
    ...CH_STATS.slice(2, 6),
    ['43 ☆／★（第一顆）', '#pinv .cpin', [1130, 406, 28, 28]]
  ],
  '04a-cands-hover': [...CH_COMMON.slice(0, 1), ...CH_CAND, ...CH_POP(0)],
  '04b-cands-hover-alt': [...CH_COMMON.slice(0, 1), ...CH_CAND, ...CH_POP(1)],
  '07-empty': [
    ...CH_COMMON,
    ['29 空狀態標題', '#pinv .cet', [868, 200, 300, 24]],
    ['30 還沒有能裝在頭部的裝備', '#pinv .cep', [868, 228, 300, 36]],
    ['31 去鍛造打一件', '#pinv .cmk', [868, 280, 300, 48]]
  ]
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1500);
  await p.evaluate(setup);
  await p.evaluate(() => runNode(TRUNK_K[0]));
  await p.waitForTimeout(2500);
  /* 疊圖用：每張畫面主要元素的實際位置（給截圖資料夾時寫進 boxes.json，tools/char_overlay.py 跟示意圖圖例的座標比） */
  const BOX = {};
  const shot = async n => {
    if (!OUT) return;
    await p.screenshot({ path: path.join(OUT, n + '.png') });
    BOX[n] = await p.evaluate(
      L =>
        L.map(([id, q, sp, inner]) => {
          const e = document.querySelector(q);
          if (!e) return [id, q, sp, null];
          const r = e.getBoundingClientRect();
          /* 浮窗的層：規格高度不含層間 12＋1＋12 的下半（padding 12＋線 1） */
          return [id, q, sp, [r.x, r.y, r.width, r.height - (inner || 0)].map(Math.round)];
        }),
      CH_BOX[n]
    );
  };
  const away = () => p.mouse.move(300, 300);
  /* V 開關 */
  await p.keyboard.press('v');
  await p.waitForTimeout(300);
  const pv = await box(p, '#pinv');
  ok(
    'V 開角色頁：#pinv.c12 在右欄 788,76 476×486（不蓋戰場 16,76 760×486）',
    (await p.evaluate(() => PANEL.inv && $('pinv').classList.contains('c12') && !$('pinv').hidden)) &&
      is(pv, 788, 76, 476, 486),
    JSON.stringify(pv)
  );
  /* 01 數值頁 */
  const cells = await p.evaluate(() =>
    ['helm', 'chest', 'gloves', 'belt', 'boots', 'weapon', 'amulet', 'ring1', 'ring2'].map(k => {
      const r = document.querySelector(`#pinv [data-c="eq:${k}"]`).getBoundingClientRect();
      return [k, r.x, r.y, r.width, r.height];
    })
  );
  const want = {
    helm: [796, 146],
    chest: [796, 216],
    gloves: [796, 286],
    belt: [796, 356],
    boots: [796, 426],
    weapon: [1192, 146],
    amulet: [1192, 286],
    ring1: [1192, 356],
    ring2: [1192, 426]
  };
  ok(
    '裝備格 64×64、間距 6：左柱 x 796（頭、胸、手、腰、鞋）、右柱 x 1192（武器、副手、項鍊、戒指、戒指）',
    cells.every(([k, x, y, w, h]) => near(x, want[k][0]) && near(y, want[k][1]) && w === 64 && h === 64),
    JSON.stringify(cells)
  );
  ok('神格格在 796,496', is(await box(p, '#pinv .cq.lock, #pinv .cq:not([data-c])'), 796, 496, 64, 64));
  ok(
    '摘要：DPS、固定 3 格（生命／能量護盾／魔力）＋釘選 6 格（預設暴擊率、攻擊速度、護甲、閃避率、格擋率、空位）',
    await p.evaluate(
      () =>
        [...document.querySelectorAll('#pinv .cc small')].map(e => e.textContent).join() ===
        '生命,能量護盾,魔力,暴擊率,攻擊速度,護甲,閃避率,格擋率,＋ 釘選數值'
    ),
    await p.evaluate(() => [...document.querySelectorAll('#pinv .cc small')].map(e => e.textContent).join())
  );
  ok('釘選格 102×32，第一格 868,222', is(await box(p, '#pinv .cc'), 868, 222, 102, 32));
  /* 名詞提示：停留 0.4 秒 */
  const rs = await box(p, '#pinv .cres span');
  await p.mouse.move(rs[0] + 10, rs[1] + 8);
  await p.waitForTimeout(250);
  const t1 = await p.evaluate(() => !!$('ctm') && !$('ctm').hidden);
  await p.waitForTimeout(300);
  const t2 = await p.evaluate(() => !!$('ctm') && !$('ctm').hidden && $('ctm').textContent);
  const tb = await box(p, '#ctm');
  ok(
    '名詞提示：停 0.25 秒還沒出、0.55 秒出現；寫「火焰抗性 n%・最大火焰抗性 n%。」；在右欄左邊戰場側（右緣 ≤ 776）',
    !t1 && /火焰抗性 -?\d+%・最大火焰抗性 \d+%。/.test(t2 || '') && tb && tb[0] + tb[2] <= 777,
    JSON.stringify([t1, t2, tb])
  );
  await shot('01-stats');
  await away();
  await p.waitForTimeout(100);
  ok('滑鼠離開名詞：提示收起', await p.evaluate(() => $('ctm').hidden));
  /* 02 長按選單 */
  const row = await p.$('#pinv .cr');
  const rb = await row.boundingBox();
  await p.mouse.move(rb.x + 40, rb.y + 10);
  await p.mouse.down();
  await p.waitForTimeout(900);
  await p.mouse.up();
  await p.waitForTimeout(150);
  const mb = await box(p, '#pinv .cmenu');
  ok(
    '長按數值列 0.5 秒：選單（說明＋釘到摘要＋編輯釘選）在右欄內 900,360 210 寬；沒有主鈕',
    is(mb, 900, 360, 210, mb ? mb[3] : 0) &&
      mb[3] >= 168 &&
      (await p.evaluate(
        () =>
          /釘到摘要|取消釘選/.test($('pinv').querySelector('.cmenu').textContent) &&
          /編輯釘選/.test($('pinv').querySelector('.cmenu').textContent)
      )) &&
      (await p.evaluate(() => !$('pinv').querySelector('.btn.pri'))),
    JSON.stringify(mb)
  );
  await shot('02-stats-menu');
  await p.mouse.click(300, 300);
  await p.mouse.click(1000, 120);
  await p.waitForTimeout(100);
  ok('點選單外面：選單收起', await p.evaluate(() => !$('pinv').querySelector('.cmenu')));
  /* 03 編輯釘選 */
  await p.click('#pinv [data-c="edit"]');
  await p.waitForTimeout(100);
  const n0 = await p.evaluate(() => S.pin.filter(Boolean).length);
  await p.click('#pinv .cpin[aria-pressed="false"]');
  await p.waitForTimeout(100);
  ok(
    '編輯釘選：「完成」是唯一主鈕；點 ☆ 釘上（已釘 n+1／6）',
    (await p.evaluate(
      () =>
        $('pinv').querySelectorAll('.btn.pri').length === 1 &&
        /完成/.test($('pinv').querySelector('.btn.pri').textContent)
    )) &&
      (await p.evaluate(() => S.pin.filter(Boolean).length)) === n0 + 1 &&
      (await p.evaluate(n => $('pinv').querySelector('.cdps').textContent.includes(`已釘 ${n}／6`), n0 + 1)),
    String(n0)
  );
  ok('「完成」在 1088,186 68×36', is(await box(p, '#pinv .cdone'), 1088, 186, 68, 36));
  await p.click('#pinv .cpin[aria-pressed="true"]');
  await away();
  await shot('03-pin-edit');
  await p.click('#pinv [data-c="edit"]');
  ok('按「完成」回數值頁', await p.evaluate(() => !CH.edit && !!$('pinv').querySelector('.cedit')));
  /* 04a 候選 */
  await p.click('#pinv [data-c="tab:cand"]');
  ok('沒選格時點「候選裝備」：不切過去', await p.evaluate(() => !NAV.slot));
  await p.click('#pinv [data-c="eq:helm"]');
  await p.waitForTimeout(150);
  const g = await p.evaluate(() =>
    [...document.querySelectorAll('#pinv .c12g .cq')].map(e => {
      const r = e.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y), r.width, r.height];
    })
  );
  const gv = await box(p, '#pinv .c12g');
  ok(
    '候選 4×3：64 格、間距 6、首格 868,254；可視 12 格，第 13 格以後要捲',
    g.length === 14 &&
      g
        .slice(0, 12)
        .every(
          (c, i) => c[0] === 868 + 70 * (i % 4) && c[1] === 254 + 70 * Math.floor(i / 4) && c[2] === 64 && c[3] === 64
        ) &&
      g[12][1] >= gv[1] + gv[3],
    JSON.stringify([g.slice(0, 5), g[12], gv])
  );
  const ord = await p.evaluate(() =>
    [...document.querySelectorAll('#pinv .c12g .cq')].map(e => (e.querySelector('.cj') || {}).textContent || '')
  );
  const JO = { '▲▲': 0, '▲': 1, '±': 2, '—': 3, '▼': 4, '': 5 };
  ok(
    '排序「判定」：▲▲、▲、±、—、▼',
    ord.every((j, i) => !i || JO[ord[i - 1]] <= JO[j]),
    ord.join(' ')
  );
  await p.click('#pinv [data-c="sort"]');
  const ids = await p.evaluate(() => [...document.querySelectorAll('#pinv .c12g .cq')].map(e => +e.dataset.c.slice(5)));
  ok(
    '排序換「最新」：新的在前',
    ids.every((v, i) => !i || ids[i - 1] > v),
    ids.join()
  );
  await p.click('#pinv [data-c="sort"]');
  await p.click('#pinv [data-c="f:up"]');
  const up = await p.evaluate(() =>
    [...document.querySelectorAll('#pinv .c12g .cq')].map(e => (e.querySelector('.cj') || {}).textContent)
  );
  ok(
    '篩選「只看 ▲」：只剩 ▲／▲▲',
    up.every(j => j === '▲' || j === '▲▲'),
    up.join(' ')
  );
  await p.evaluate(() => {
    S.inv.items.filter(it => kindOf(it) === 'helm')[0].lock = 1;
  });
  await p.click('#pinv [data-c="f:lock"]');
  ok(
    '篩選「未鎖」：鎖住的不列',
    await p.evaluate(() => {
      const L = [...document.querySelectorAll('#pinv .c12g .cq')].map(e =>
        S.inv.items.find(x => x.id === +e.dataset.c.slice(5))
      );
      return L.length === 13 && L.every(it => !it.lock);
    })
  );
  await p.click('#pinv [data-c="f:all"]');
  /* 比較浮窗：懸停 0 秒。示意圖的例子（身上 2 條詞綴、候選 3 條；基底各一種防禦＋品質）：身上照這樣換一頂，挑一件同樣的候選 */
  const few = await p.evaluate(() => {
    const one = it => chBase(it).length <= 2 && (it.a || []).length <= 3,
      B = BASES.find(b => b.k === 'helm' && chBase({ b: b.id, a: [] }).length <= 2);
    S.eq.helm = mkItem(B.id, 20, 2);
    S.eq.helm.a = S.eq.helm.a.slice(0, 2);
    hudPanels();
    return [...document.querySelectorAll('#pinv .c12g .cq')].findIndex(e =>
      one(S.inv.items.find(x => x.id === +e.dataset.c.slice(5)))
    );
  });
  ok('有一件跟示意圖一樣的候選可以比（基底一種防禦、詞綴 ≤ 3 條）', few >= 0, String(few));
  await p.hover(`#pinv .c12g .cq:nth-child(${few + 1})`);
  const pb = await box(p, '#pinv .c12p');
  ok('懸停候選立即出比較浮窗：796,76 460×448', is(pb, 796, 76, 460, 448), JSON.stringify(pb));
  ok(
    '浮窗五層：身分、基底、詞綴、換上、操作（簡易不列 T 階）；④ 換上 18/700；主角 16/700、輔助 14/400',
    await p.evaluate(() => {
      const c = $('pinv').querySelector('.c12p'),
        f = q => getComputedStyle(c.querySelector(q)),
        lh = [...c.querySelectorAll('section > .lh, section > div > small:first-child')].map(e => e.textContent);
      return (
        c.querySelectorAll('section').length === 5 &&
        /身分/.test(lh.join()) &&
        ['基底', '詞綴', '換上', '操作'].every(t => c.textContent.includes(t)) &&
        !/T\d/.test(c.querySelector('.l3').textContent) &&
        /* 詞綴兩欄：身上在左、候選在右，跟身分層同一條起始線 */
        c.querySelector('.l3 ul').getBoundingClientRect().left ===
          c.querySelector('.l1 > div').getBoundingClientRect().left &&
        c.querySelectorAll('.l3 ul')[1].getBoundingClientRect().left ===
          c.querySelectorAll('.l1 > div')[1].getBoundingClientRect().left &&
        c.querySelector('.l3 ul').getBoundingClientRect().top ===
          c.querySelectorAll('.l3 ul')[1].getBoundingClientRect().top &&
        f('.l4 p').fontSize === '18px' &&
        f('.l4 p').fontWeight === '700' &&
        f('.l1 b').fontSize === '16px' &&
        f('.lh').fontSize === '14px' &&
        f('.lh').fontWeight === '400'
      );
    })
  );
  await shot('04a-cands-hover');
  await p.keyboard.down('Alt');
  await p.waitForTimeout(50);
  const pd = await box(p, '#pinv .c12p');
  ok(
    '按住 Alt：同一浮窗變詳細（詞綴補 T 階與區間），下緣齊 562',
    is(pd, 796, 76, 460, 486) && (await p.evaluate(() => /T\d/.test($('pinv').querySelector('.c12p .l3').textContent))),
    JSON.stringify(pd)
  );
  await shot('04b-cands-hover-alt');
  await p.keyboard.up('Alt');
  await p.waitForTimeout(50);
  ok(
    '放開 Alt：回簡易',
    await p.evaluate(
      () => !$('pinv').querySelector('.c12p.det') && !/T\d/.test($('pinv').querySelector('.c12p .l3').textContent)
    )
  );
  /* 詞綴多（身上 6 條、候選 6 條）：詞綴層收縮，浮窗不超出右欄、⑤ 操作層看得到 */
  await p.evaluate(() => {
    const it = S.inv.items.find(x => x.id === CH.hov);
    S.eq.helm.a = [...S.eq.helm.a, ...it.a, ...it.a, ...it.a].slice(0, 6);
    it.a = [...it.a, ...it.a, ...it.a, ...it.a].slice(0, 6);
    chCmpSync();
  });
  const pm = await box(p, '#pinv .c12p'),
    l5 = await box(p, '#pinv .c12p .l5');
  ok(
    '6＋6 條詞綴：浮窗下緣 ≤ 562、⑤ 操作層整層在浮窗內',
    pm[1] + pm[3] <= 562 && l5[1] + l5[3] <= pm[1] + pm[3],
    JSON.stringify([pm, l5])
  );
  await away();
  await p.waitForTimeout(50);
  ok('滑鼠離開：浮窗收起', await p.evaluate(() => !$('pinv').querySelector('.c12p')));
  /* 點候選＝換上 */
  const cid = await p.evaluate(() => +$('pinv').querySelector('.c12g .cq').dataset.c.slice(5));
  await p.click('#pinv .c12g .cq');
  ok('點候選＝換上（換下的進倉庫）', await p.evaluate(id => S.eq.helm && S.eq.helm.id === id, cid));
  /* X 鎖定身上裝備 */
  const lk0 = await p.evaluate(() => !!S.eq.helm.lock);
  await p.keyboard.press('x');
  ok('X：切換選中格身上裝備的鎖定', await p.evaluate(l => !!S.eq.helm.lock === !l, lk0));
  /* 07 空格沒候選 */
  await p.evaluate(() => {
    S.inv.items = S.inv.items.filter(it => kindOf(it) !== 'helm');
    S.eq.helm = null;
    changed();
  });
  await p.waitForTimeout(100);
  ok(
    '空格沒候選：「頭部　空著」「還沒有能裝在頭部的裝備」；唯一主鈕「去鍛造打一件」868,280 300×48',
    (await p.evaluate(
      () =>
        /頭部　空著/.test($('pinv').textContent) &&
        /還沒有能裝在頭部的裝備/.test($('pinv').textContent) &&
        $('pinv').querySelectorAll('.btn.pri').length === 1
    )) && is(await box(p, '#pinv .cmk'), 868, 280, 300, 48)
  );
  await shot('07-empty');
  await p.keyboard.press('v');
  await p.waitForTimeout(250);
  ok('再按 V：關掉', await p.evaluate(() => !PANEL.inv && $('pinv').hidden));
  ok('1280×720 沒有頁面錯誤', !errs.length, errs.join(' | '));
  await ctx.close();
  /* 390×844：直立角色頁照舊（hud.js 的 invHTML，不走 .c12） */
  const c2 = await b.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2
  });
  await c2.route(/supabase/, r => r.abort());
  const q = await c2.newPage();
  const e2 = [];
  q.on('pageerror', e => e2.push(e.message));
  await q.goto(URL + '?' + Date.now());
  await q.evaluate(() => localStorage.clear());
  await q.reload();
  await q.waitForTimeout(1500);
  await q.evaluate(setup);
  await q.evaluate(() => (closePanels(), navGo('char')));
  await q.waitForTimeout(600);
  ok(
    '390×844 直立角色頁照舊：.doll2 人形＋角色數值，沒有 .c12',
    await q.evaluate(
      () =>
        !$('pinv').classList.contains('c12') && !!$('pinv').querySelector('.doll2') && !!$('pinv').querySelector('.st2')
    )
  );
  if (OUT) await q.screenshot({ path: path.join(OUT, '390x844-char.png') });
  ok('390×844 沒有頁面錯誤', !e2.length, e2.join(' | '));
  /* 手把（標準配置，用假的 navigator.getGamepads）：Y 按住詳細、放開簡易；R3＝焦點上的名詞；Ⓐ＝裝備焦點上的候選 */
  const c3 = await b.newContext({ viewport: { width: 1280, height: 720 } });
  await c3.route(/supabase/, r => r.abort());
  await c3.addInitScript(() => {
    window.PADB = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    navigator.getGamepads = () => [window.PADON ? { buttons: window.PADB } : null];
  });
  const g3 = await c3.newPage();
  await g3.goto(URL + '?' + Date.now());
  await g3.evaluate(() => localStorage.clear());
  await g3.reload();
  await g3.waitForTimeout(1500);
  await g3.evaluate(setup);
  await g3.keyboard.press('v');
  await g3.click('#pinv [data-c="eq:helm"]');
  await g3.focus('#pinv .c12g .cq');
  await g3.evaluate(() => ((window.PADON = 1), dispatchEvent(new Event('gamepadconnected')), (PADB[3].pressed = true)));
  await g3.waitForTimeout(150);
  const gy = await g3.evaluate(() => !!$('pinv').querySelector('.c12p.det'));
  await g3.evaluate(() => (PADB[3].pressed = false));
  await g3.waitForTimeout(150);
  const gy2 = await g3.evaluate(() => !!$('pinv').querySelector('.c12p') && !$('pinv').querySelector('.c12p.det'));
  ok('手把：按住 Y＝詳細、放開回簡易', gy && gy2, JSON.stringify([gy, gy2]));
  await g3.focus('#pinv .cres span');
  await g3.evaluate(() => (PADB[11].pressed = true));
  await g3.waitForTimeout(150);
  ok('手把 R3：焦點上的名詞出提示', await g3.evaluate(() => !$('ctm').hidden));
  await g3.evaluate(() => (PADB[11].pressed = false));
  await g3.focus('#pinv .c12g .cq');
  const gid = await g3.evaluate(() => +document.activeElement.dataset.c.slice(5));
  await g3.evaluate(() => (PADB[0].pressed = true));
  await g3.waitForTimeout(150);
  ok('手把 Ⓐ：裝備焦點上的候選', await g3.evaluate(id => S.eq.helm.id === id, gid));
  if (OUT) fs.writeFileSync(path.join(OUT, 'boxes.json'), JSON.stringify(BOX, null, 1));
  await b.close();
  console.log(bad ? `❌ ${bad} 項沒過` : '✅ 角色頁全部通過');
  process.exit(bad ? 1 : 0);
})();
