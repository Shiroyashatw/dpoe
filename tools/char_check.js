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
/* 比較浮窗 ③ 的捲動狀態（fix3）：top ③ 捲動位置、below 可視區下面的條數、m「▼ 還有 n 條」（淡掉時空字）、
   bar／bw／ty 捲動條、same 軌與滑塊同候選捲動條 .csb.sg 的色、list 候選清單捲動、h ③ 層高、det 詳細 */
const L3S = () => {
  const P = $('pinv'),
    c = P.querySelector('.c12p'),
    s = c.querySelector('.l3s'),
    m = c.querySelector('.l3m'),
    t = c.querySelector('.l3 .csb'),
    g = P.querySelector('.csb.sg'),
    y = s.getBoundingClientRect().bottom + 0.5,
    bg = e => getComputedStyle(e).backgroundColor;
  return {
    top: s.scrollTop,
    below: [...s.querySelectorAll('li')].filter(li => li.getBoundingClientRect().bottom > y).length,
    m: !m.hidden && m.style.visibility !== 'hidden' ? m.textContent.trim() : '',
    bar: !t.hidden,
    bw: Math.round(t.getBoundingClientRect().width),
    ty: t.firstChild.style.transform,
    same: bg(t) === bg(g) && bg(t.firstChild) === bg(g.firstChild),
    list: P.querySelector('.c12g').scrollTop,
    h: Math.round(c.querySelector('.l3').getBoundingClientRect().height),
    det: c.classList.contains('det')
  };
};
/* fix4：.c12 段 4 條陰影（右欄、格角標字、長按選單、比較浮窗）算出來不是無效值也不是 none，色是 --scrim-rgb 加規格的 α */
const SHADOW = ([q, prop, a]) => {
  const e = document.querySelector(q),
    v = e ? getComputedStyle(e)[prop] : '',
    c = getComputedStyle(document.documentElement).getPropertyValue('--scrim-rgb').trim();
  return [!!v && v !== 'none' && v.includes(a === 1 ? `rgb(${c})` : `rgba(${c}, ${a})`), v];
};
const shadowOk = async (p, n, q, prop, a) => {
  const [c, v] = await p.evaluate(SHADOW, [q, prop, a]);
  ok(`陰影 ${n}：${q} 的 ${prop} 有畫出來（--scrim-rgb α ${a}）`, c, v);
};
/* 跟示意圖接近的一套：Lv 49、身上全稀有、倉庫 14 頂頭盔（候選 4×3 再多兩件可以捲；物品等級高的穿不上＝不能裝備）；
   示意圖的格狀態：胸甲腐化＋破裂、鞋子災魘、項鍊追憶、武器套王印 */
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
  S.eq.chest.cor = 1;
  S.eq.chest.frac = S.eq.chest.a[0].k;
  S.eq.boots.cor = 1;
  S.eq.boots.cal = { g: { k: 'g_hp', v: 10 }, b: { k: 'b_resF', v: 20 } };
  S.eq.amulet.mem = rollMem(Object.keys(MEM)[0]);
  S.eq.weapon.wy = 'wangyin_guixu';
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
  ['28 切換 候選裝備', '#pinv .ctg.r', [1022, 148, 150, 36]],
  ['16 胸甲 破裂圖示（左下 x 4、y 44）', '#pinv [data-c="eq:chest"] .cx > *', [800, 260, 16, 16]]
];
const CH_STATS = [
  ['29 DPS', '#pinv .cdps', [874, 186, 126, 28]],
  ['30 編輯釘選', '#pinv .cedit', [1056, 186, 96, 36]],
  ['31 固定格 生命', '#pinv .cc', [868, 222, 102, 32]],
  ['39 空釘位', '#pinv .cc.emp', [1080, 294, 102, 32]],
  ['40 分組 攻擊／法術', '#pinv .cg', [868, 338, 300, 32]],
  ['41 子組 核心', '#pinv .cg.sub', [868, 374, 300, 28]],
  ['42 數值列（第一列）', '#pinv .cr', [868, 406, 300, 22]],
  ['43 清單捲動軌', '#pinv .csb.sl', [1178, 338, 4, 200]]
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
  ['45 候選第 12 格', '#pinv .c12g .cq:nth-child(12)', [1078, 394, 64, 64]],
  ['46 候選捲動軌', '#pinv .csb.sg', [1150, 254, 4, 204]]
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
  /* 格狀態（V-2；M2-character §3–§5）：✦{n}、特殊詞 16 px 圖示、腐化底＋虛線、災魘底＋爪痕、稀有框 --rar-rare-frame */
  const cs = await p.evaluate(() => {
    const q = k => document.querySelector(`#pinv [data-c="eq:${k}"]`),
      gs = (e, x) => getComputedStyle(e, x),
      rel = (e, c) => {
        const r = e.getBoundingClientRect(),
          b = c.getBoundingClientRect();
        return [r.x - b.x, r.y - b.y, r.width, r.height, b.right - r.right];
      },
      imgs = c => [...c.querySelectorAll('.cx > *')].map(i => [i.getAttribute('src') || '', ...rel(i, c)]),
      K = ['helm', 'chest', 'gloves', 'belt', 'boots', 'weapon', 'amulet', 'ring1', 'ring2'];
    return {
      star: K.map(k => {
        const e = q(k).querySelector('.cs'),
          it = S.eq[k];
        return [k, e ? e.textContent : '', it.a.filter(a => a.T <= itemT(it)).length, !!(e && e.querySelector('svg'))];
      }),
      starPos: (() => {
        const k = K.find(k => q(k).querySelector('.cs'));
        return k ? rel(q(k).querySelector('.cs'), q(k)) : null;
      })(),
      ch: [gs(q('chest')).backgroundColor, gs(q('chest'), '::before').backgroundImage, gs(q('chest'), '::before').top],
      chImg: imgs(q('chest')),
      amImg: imgs(q('amulet')),
      wpImg: imgs(q('weapon')),
      bo: [
        gs(q('boots')).backgroundColor,
        q('boots').querySelectorAll('.ccl path').length,
        !!q('boots').querySelector('.ccl + .ic'),
        gs(q('boots').querySelector('.ccl stop')).stopColor,
        gs(q('boots').querySelector('.ccl path')).strokeWidth,
        gs(q('boots'), '::before').content
      ],
      frame: [gs(q('helm')).borderTopColor, gs(q('helm')).borderTopWidth, S.eq.helm.r],
      txt: [...document.querySelectorAll('#pinv .cq .cx')].map(e => e.textContent).join('')
    };
  });
  ok(
    '右上 ✦{n}：n＝頂階詞條數（0 不畫），✦ 是 12 px 圖示；右緣 −3、上緣 +框寬',
    cs.star.every(([, t, n, sv]) => (n ? t === String(n) && sv : t === '')) &&
      cs.star.some(x => x[2]) &&
      !!cs.starPos &&
      cs.starPos[1] === 2 &&
      cs.starPos[4] === 3,
    JSON.stringify([cs.star, cs.starPos])
  );
  const at = (L, re) =>
    L.length && re.test(L[0][0]) && L[0][1] === 4 && L[0][2] === 44 && L[0][3] === 16 && L[0][4] === 16;
  ok(
    '左下特殊詞圖示 16 px（第 1 個 x 4、y 44）：破裂＝affix_frac、追憶＝affix_mem、印＝王印 16；不是 ★／◆ 文字',
    at(cs.chImg, /affix_frac_16/) && at(cs.amImg, /affix_mem_16/) && at(cs.wpImg, /./) && !/[★◆◈]/.test(cs.txt),
    JSON.stringify([cs.chImg, cs.amImg, cs.wpImg, cs.txt])
  );
  ok(
    '腐化：格底 --cell-corrupt #4b1e1e＋框內 3 px 處 1 px 虛線 #6f3a38（3 亮 2 暗）',
    cs.ch[0] === 'rgb(75, 30, 30)' &&
      /repeating-linear-gradient.*rgb\(111, 58, 56\) 0px, rgb\(111, 58, 56\) 3px/.test(cs.ch[1]) &&
      cs.ch[2] === '1px',
    JSON.stringify(cs.ch)
  );
  ok(
    '災魘：格底 --cell-cal #352642（蓋過腐化底）＋三道爪痕（--cat-cal、1.5 px、在道具圖下面）；不畫腐化虛線、不用整格斜紋',
    cs.bo[0] === 'rgb(53, 38, 66)' &&
      cs.bo[1] === 3 &&
      cs.bo[2] &&
      cs.bo[3] === 'rgb(189, 122, 255)' &&
      cs.bo[4] === '1.5px' &&
      cs.bo[5] === 'none',
    JSON.stringify(cs.bo)
  );
  ok(
    '稀有格框 2 px --rar-rare-frame #ccb72e（不用 --rar-rare）',
    cs.frame[2] !== 2 || (cs.frame[0] === 'rgb(204, 183, 46)' && cs.frame[1] === '2px'),
    JSON.stringify(cs.frame)
  );
  ok(
    '輔助字 400：抗性標與值、Lv、DPS 標、固定 3 格標、釘選標、數值列名',
    await p.evaluate(() =>
      ['.cres small', '.cres span', '.chd span:last-child', '.cdps small', '.cc small', '.cr span'].every(
        q => getComputedStyle($('pinv').querySelector(q)).fontWeight === '400'
      )
    )
  );
  const crit = await p.evaluate(() =>
    [...document.querySelectorAll('#pinv .cc')].map(e => e.textContent).find(t => t.startsWith('暴擊率'))
  );
  ok('暴擊率 n.n%（整數也寫 .0）', /^暴擊率\d+\.\d%$/.test(crit || ''), crit);
  const sl = await p.evaluate(() => {
    const l = $('pinv').querySelector('.c12l'),
      t = $('pinv').querySelector('.csb.sl'),
      r = t.getBoundingClientRect();
    return [
      l.scrollHeight > l.clientHeight,
      !t.hidden,
      [r.x, r.y, r.width, r.height].map(Math.round),
      t.firstChild.offsetHeight,
      getComputedStyle(l).scrollbarWidth
    ];
  });
  ok(
    '數值清單自繪 4 px 捲動軌 1178,338 4×200（內容超過才出現；不靠原生捲動條）',
    sl[4] === 'none' && sl[0] === sl[1] && (!sl[0] || (is(sl[2], 1178, 338, 4, 200) && sl[3] >= 16)),
    JSON.stringify(sl)
  );
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
    '名詞提示：停 0.25 秒還沒出、0.55 秒出現；只寫正文「火焰抗性 n%・最大火焰抗性 n%。」（沒有「名詞提示　停留 0.4 秒」帽）；在右欄左邊戰場側（右緣 ≤ 776）',
    !t1 &&
      /^火焰抗性 -?\d+%・最大火焰抗性 \d+%。/.test(t2 || '') &&
      !/名詞提示|停留/.test(t2) &&
      tb &&
      tb[0] + tb[2] <= 777,
    JSON.stringify([t1, t2, tb])
  );
  await shot('01-stats');
  await away();
  await p.waitForTimeout(100);
  ok('滑鼠離開名詞：提示收起', await p.evaluate(() => $('ctm').hidden));
  /* 02 長按選單 */
  await shadowOk(p, '右欄', '#pinv.c12', 'boxShadow', 0.6);
  /* .cx（破裂／追憶／印的圖示列）自己寫 text-shadow: none，不算在這條裡 */
  await shadowOk(p, '格角標字', '#pinv.c12 .cq > i:not(.cx)', 'textShadow', 1);
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
          /編輯釘選/.test($('pinv').querySelector('.cmenu').textContent) &&
          /* 說明：有 TERMS 才畫那一行 */
          !!$('pinv').querySelector('.cmenu p') === !!TERMS[chStat(CH.menu)[1]]
      )) &&
      (await p.evaluate(() => !$('pinv').querySelector('.btn.pri'))),
    JSON.stringify(mb)
  );
  await shadowOk(p, '長按選單', '#pinv.c12 .cmenu', 'boxShadow', 0.6);
  await shot('02-stats-menu');
  /* V-1：點右欄外面（戰場、底列、上方）或按 Esc 都關選單 */
  const menuOn = () => p.evaluate(() => !!$('pinv').querySelector('.cmenu'));
  const closed = [];
  for (const xy of [[300, 300], [400, 650], [640, 20], 'Escape']) {
    if (!(await p.evaluate(() => PANEL.inv))) await p.keyboard.press('v');
    /* 右鍵開選單（直接送 contextmenu：上一輪的選單可能蓋著這一列） */
    await p.$eval('#pinv .cr', e =>
      e.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    );
    await p.waitForTimeout(80);
    const o = await menuOn();
    if (xy === 'Escape') await p.keyboard.press('Escape');
    else await p.mouse.click(xy[0], xy[1]);
    await p.waitForTimeout(120);
    closed.push([o, !(await menuOn()), await p.evaluate(() => PANEL.inv)]);
    if (OUT && xy[0] === 300) await p.screenshot({ path: path.join(OUT, '02-menu-closed-click-300-300.png') });
  }
  ok(
    '點右欄外 (300,300)、(400,650)、(640,20) 都關長按選單；Esc 也關（面板留著）',
    closed.every(([o, c, v], i) => o && c && (i < 3 || v)),
    JSON.stringify(closed)
  );
  if (!(await p.evaluate(() => PANEL.inv))) await p.keyboard.press('v');
  await p.$eval('#pinv .cr', e => e.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
  await p.mouse.click(1000, 120);
  await p.waitForTimeout(100);
  ok('點右欄裡選單外面：選單收起', !(await menuOn()));
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
  /* V-6：不能裝備的不算「可以換的 n 件」、排在後面、沒有判定角標、右下 12 px 斜線 --bad、不淡化 */
  const nq = await p.evaluate(() => {
    const E = [...document.querySelectorAll('#pinv .c12g .cq')],
      L = E.map(e => S.inv.items.find(x => x.id === +e.dataset.c.slice(5))),
      W = L.filter(it => !cantWear(it)),
      e = E.find((e, i) => cantWear(L[i])),
      r = e && e.querySelector('.cnq') && e.querySelector('.cnq').getBoundingClientRect(),
      c = e && e.getBoundingClientRect();
    return {
      n: W.length,
      bad: L.length - W.length,
      k: W.filter(it => ['▲', '▲▲'].includes(chJudge(it, 'helm'))).length,
      cns: $('pinv').querySelector('.cns').textContent,
      after: L.findIndex(cantWear) === W.length,
      marks: E.filter((e, i) => cantWear(L[i])).every(
        e =>
          !e.querySelector('.cj') &&
          !!e.querySelector('.cnq') &&
          /不能裝備：/.test(e.getAttribute('aria-label')) &&
          getComputedStyle(e).opacity === '1'
      ),
      slash: r && [Math.round(c.right - r.right), Math.round(c.bottom - r.bottom), r.width, r.height],
      col: e && getComputedStyle(e.querySelector('.cnq')).backgroundImage,
      cnsW: getComputedStyle($('pinv').querySelector('.cns')).fontWeight
    };
  });
  ok(
    '「可以換的 n 件，▲ k」只算穿得上的；不能裝備的排在後面、沒有判定角標、右下 12 px 斜線 --bad、不淡化、讀屏「不能裝備：」；字重 400',
    nq.bad > 0 &&
      nq.n > 0 &&
      nq.cns === `可以換的 ${nq.n} 件，▲ ${nq.k}` &&
      nq.after &&
      nq.marks &&
      JSON.stringify(nq.slash) === '[3,3,12,12]' &&
      /rgb\(255, 155, 186\)/.test(nq.col) &&
      nq.cnsW === '400',
    JSON.stringify(nq)
  );
  /* 懸停不能裝備的候選：④ 寫「不能裝備：{原因}」、⑤ Ⓐ 裝備停用；點了不換上 */
  const h0 = await p.evaluate(() => S.eq.helm.id);
  await p.hover('#pinv .c12g .cq.nq');
  await p.waitForTimeout(50);
  const nqp = await p.evaluate(() => [
    $('pinv').querySelector('.c12p .l4').textContent,
    !!$('pinv').querySelector('.c12p .l5 .off[aria-disabled="true"]')
  ]);
  await p.click('#pinv .c12g .cq.nq');
  await p.waitForTimeout(50);
  ok(
    '不能裝備的候選：④「不能裝備：等級 n／m…」、Ⓐ 裝備停用、點了不換上',
    /不能裝備：.*\d+／\d+/.test(nqp[0]) && nqp[1] && (await p.evaluate(id => S.eq.helm.id === id, h0)),
    JSON.stringify(nqp)
  );
  await away();
  await p.waitForTimeout(50);
  if (OUT) await p.screenshot({ path: path.join(OUT, '04-cands-cantwear.png') });
  await p.evaluate(() => ($('pinv').querySelector('.c12g').scrollTop = 0));
  const sg = await p.evaluate(() => {
    const t = $('pinv').querySelector('.csb.sg'),
      r = t.getBoundingClientRect();
    return [!t.hidden, [r.x, r.y, r.width, r.height].map(Math.round)];
  });
  ok(
    '候選區自繪 4 px 捲動軌 1150,254 4×204（14 件超過 12 格才出現）',
    sg[0] && is(sg[1], 1150, 254, 4, 204),
    JSON.stringify(sg)
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
  const ids = await p.evaluate(() =>
    [...document.querySelectorAll('#pinv .c12g .cq')].map(e => [
      e.classList.contains('nq') ? 1 : 0,
      +e.dataset.c.slice(5)
    ])
  );
  ok(
    '排序換「最新」：新的在前（不能裝備的仍排在可裝備件之後）',
    ids.every((v, i) => !i || ids[i - 1][0] < v[0] || (ids[i - 1][0] === v[0] && ids[i - 1][1] > v[1])),
    JSON.stringify(ids)
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
  ok(
    '懸停候選立即出比較浮窗：左上 796,76、寬 460、高 448–486、下緣 ≤ 562',
    !!pb && pb[0] === 796 && pb[1] === 76 && pb[2] === 460 && pb[3] >= 448 && pb[3] <= 486 && pb[1] + pb[3] <= 562,
    JSON.stringify(pb)
  );
  await shadowOk(p, '比較浮窗', '#pinv.c12 .c12p', 'boxShadow', 0.7);
  const l1 = await box(p, '#pinv .c12p .l1');
  ok(
    '拿掉窗頂標注：沒有「懸浮時才出現」；① 身分層 y 98、高 68（＋層間 13）；⑤ 寫「Ⓐ 裝備　Ｘ 鎖定身上　Ｒ3 名詞」',
    !(await p.evaluate(() => /懸浮時才出現|按住 Alt／Y 中/.test($('pinv').textContent))) &&
      is(l1, 796, 98, 460, 81) &&
      (await p.evaluate(() => $('pinv').querySelector('.c12p .l5 p').textContent === 'Ⓐ 裝備　Ｘ 鎖定身上　Ｒ3 名詞')),
    JSON.stringify(l1)
  );
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
  /* V-4：雙防禦底材＋6＋6 條詞綴：浮窗只長到 486（下緣 ≤ 562）；③ 不裁切（詞綴全在 DOM、層內可捲、出 4 px 軌），①②④⑤ 完整 */
  const dd = await p.evaluate(() => {
    const it = S.inv.items.find(x => x.id === CH.hov),
      B = BASES.find(b => b.k === 'helm' && chBase({ b: b.id, a: [] }).length >= 3);
    if (!B) return null;
    window.DD0 = [it, it.b, it.a, S.eq.helm.b, S.eq.helm.a];
    it.b = S.eq.helm.b = B.id;
    const A = S.inv.items.flatMap(x => x.a || []);
    S.eq.helm.a = A.slice(0, 6);
    it.a = A.slice(6, 12);
    chCmpSync();
    return B.n;
  });
  for (const det of [0, 1]) {
    if (det) await p.keyboard.down('Alt'), await p.waitForTimeout(50);
    const r = await p.evaluate(() => {
      const c = $('pinv').querySelector('.c12p'),
        b = e => e.getBoundingClientRect(),
        s = c.querySelector('.l3s'),
        cb = b(c);
      return {
        pop: [cb.x, cb.y, cb.width, cb.height].map(Math.round),
        lis: c.querySelectorAll('.l3s li').length,
        txt: [...c.querySelectorAll('.l3s li b')].every(e => e.textContent.trim()),
        scroll: s.scrollHeight > s.clientHeight + 1,
        bar: !c.querySelector('.l3 .csb').hidden,
        whole: ['.l1', '.l2', '.l4', '.l5'].every(q => b(c.querySelector(q)).bottom <= cb.bottom + 0.5),
        l3in: b(s).bottom <= b(c.querySelector('.l3')).bottom + 0.5
      };
    });
    ok(
      `雙防禦（${dd}）＋6＋6 條詞綴（${det ? '詳細' : '簡易'}）：浮窗 796,76 寬 460、高 ≤ 486、下緣 ≤ 562；③ 12 條都在、放不下就層內捲（4 px 軌）；①②④⑤ 完整`,
      !!dd &&
        r.pop[0] === 796 &&
        r.pop[1] === 76 &&
        r.pop[2] === 460 &&
        r.pop[3] <= 486 &&
        r.pop[1] + r.pop[3] <= 562 &&
        r.lis === 12 &&
        r.txt &&
        r.scroll === r.bar &&
        r.whole &&
        r.l3in,
      JSON.stringify(r)
    );
    /* fix3（UIUX 11/24）：沒按 Alt 滾輪照常捲候選清單、③ 不動 */
    if (!det && r.scroll) {
      const hid = await p.evaluate(() => CH.hov);
      await p.mouse.wheel(0, 120);
      await p.waitForTimeout(80);
      const nw = await p.evaluate(() => [
        $('pinv').querySelector('.c12p .l3s') ? $('pinv').querySelector('.c12p .l3s').scrollTop : -1,
        $('pinv').querySelector('.c12g').scrollTop
      ]);
      ok('沒按 Alt：滾輪捲候選清單、③ 不捲', nw[1] > 0 && nw[0] <= 0, JSON.stringify(nw));
      await p.evaluate(() => ($('pinv').querySelector('.c12g').scrollTop = 0));
      await p.waitForTimeout(50);
      await p.mouse.move(0, 0);
      await p.hover(`#pinv [data-c="cand:${hid}"]`);
      await p.waitForTimeout(50);
    }
    if (OUT) await p.screenshot({ path: path.join(OUT, `04${det ? 'b' : 'a'}-dualdef-6affix.png`) });
    if (det && r.scroll) {
      const hid = await p.evaluate(() => CH.hov),
        L3 = () => p.evaluate(L3S);
      const a0 = await L3();
      ok(
        '按住 Alt、③ 放不下：底部「▼ 還有 n 條」（n＝可視區下面的條數）＋4 px 捲動條（軌、滑塊同候選捲動條的色）',
        a0.top === 0 && a0.below > 0 && a0.m === `▼ 還有 ${a0.below} 條` && a0.bar && a0.bw === 4 && a0.same,
        JSON.stringify(a0)
      );
      if (OUT) await p.screenshot({ path: path.join(OUT, 'fix3-l3-before.png') });
      await p.mouse.wheel(0, 24);
      await p.waitForTimeout(80);
      const a1 = await L3();
      ok(
        '按住 Alt：滾輪捲 ③（候選清單不動）、「還有 n 條」跟著減、滑塊往下',
        a1.top > 0 &&
          a1.list === 0 &&
          a1.below < a0.below &&
          a1.below > 0 &&
          a1.m === `▼ 還有 ${a1.below} 條` &&
          a1.ty !== a0.ty,
        JSON.stringify([a0, a1])
      );
      if (OUT) await p.screenshot({ path: path.join(OUT, 'fix3-l3-after.png') });
      await p.mouse.wheel(0, 2400);
      await p.waitForTimeout(80);
      const a2 = await L3();
      ok('捲到底：「還有 n 條」淡掉（不跳版）', a2.below === 0 && a2.m === '' && a2.h === a0.h, JSON.stringify(a2));
      await p.keyboard.up('Alt');
      await p.waitForTimeout(50);
      const a3 = await L3();
      ok('放開 Alt：③ 回頂端', a3.top === 0 && !a3.det, JSON.stringify(a3));
      await p.keyboard.down('Alt');
      await p.waitForTimeout(50);
      await p.mouse.wheel(0, 48);
      await p.waitForTimeout(80);
      const t4 = (await L3()).top;
      await p.hover(`#pinv .c12g .cq:not([data-c="cand:${hid}"])`);
      await p.waitForTimeout(50);
      await p.hover(`#pinv [data-c="cand:${hid}"]`);
      await p.waitForTimeout(50);
      const a5 = await L3();
      ok('滑鼠移到別格再回來：③ 回頂端', t4 > 0 && a5.top === 0 && a5.det, JSON.stringify([t4, a5]));
    }
  }
  await p.keyboard.up('Alt');
  /* 換回原本的底材與詞綴（不然快取的「能不能裝備」會跟著舊底材） */
  await p.evaluate(() => {
    const [it, b, a, hb, ha] = DD0;
    Object.assign(it, { b, a });
    Object.assign(S.eq.helm, { b: hb, a: ha });
    chCmpSync();
  });
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
  /* 空格有候選：右上候選數、讀屏「倉庫有 n 件可以裝備」只算穿得上的 */
  const em = await p.evaluate(() => {
    S.eq.helm = null;
    NAV.slot = null;
    changed();
    hudPanels();
    const e = $('pinv').querySelector('[data-c="eq:helm"]'),
      n = slotCands('helm').filter(it => !cantWear(it)).length;
    const r = [n, slotCands('helm').length, (e.querySelector('.cn') || {}).textContent, e.getAttribute('aria-label')];
    NAV.slot = 'helm';
    return r;
  });
  ok(
    '空格的候選數與讀屏只算穿得上的（不含不能裝備）',
    em[0] < em[1] && em[2] === String(em[0]) && em[3] === `頭部空著，倉庫有 ${em[0]} 件可以裝備`,
    JSON.stringify(em)
  );
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
  /* Q4：第三隻戒指（開了才有）在右柱第 6 格 1192,496 */
  await p.keyboard.press('v');
  await p.waitForTimeout(300);
  const r3 = await p.evaluate(() => {
    for (const [a, v] of Object.entries(ASC))
      for (const [id, n] of Object.entries(v.N || {}))
        if (n[3] && 'ring3' in n[3]) {
          S.asc = a;
          S.at = ['xx' + id];
          hudPanels();
          const e = $('pinv').querySelector('[data-c="eq:ring3"]');
          if (!e) return null;
          const r = e.getBoundingClientRect();
          return [
            r.x,
            r.y,
            r.width,
            r.height,
            $('pinv').getBoundingClientRect().x,
            $('pinv').className,
            NAV.view,
            innerWidth
          ];
        }
    return 'no';
  });
  ok('第三隻戒指開了：右柱第 6 格 1192,496 64×64', r3 === 'no' || is(r3, 1192, 496, 64, 64), JSON.stringify(r3));
  await p.keyboard.press('v');
  ok('1280×720 沒有頁面錯誤', !errs.length, errs.join(' | '));
  await ctx.close();
  /* fix3：破裂／追憶定稿圖（affix-icons-final-1124）：DPR1 用 16、DPR2 用 16@2x，畫成 16×16（不墊 18×18） */
  for (const dpr of [1, 2]) {
    const cx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: dpr });
    await cx.route(/supabase/, r => r.abort());
    const d = await cx.newPage();
    await d.goto(URL + '?' + Date.now());
    await d.evaluate(() => localStorage.clear());
    await d.reload();
    await d.waitForTimeout(1500);
    await d.evaluate(setup);
    await d.keyboard.press('v');
    await d.waitForTimeout(300);
    const im = await d.evaluate(() =>
      ['chest', 'amulet'].map(k => {
        const e = document.querySelector(`#pinv [data-c="eq:${k}"] .cx img`),
          r = e && e.getBoundingClientRect();
        return e && [e.getAttribute('src'), e.naturalWidth, e.naturalHeight, Math.round(r.width), Math.round(r.height)];
      })
    );
    const re = dpr > 1 ? /_16@2x\.png$/ : /_16\.png$/;
    ok(
      `DPR${dpr}：胸甲破裂、項鍊追憶用 ${dpr > 1 ? '16@2x' : '16'}（原圖 ${16 * dpr}×${16 * dpr}）、畫成 16×16`,
      !!im[0] &&
        !!im[1] &&
        /affix_frac/.test(im[0][0]) &&
        /affix_mem/.test(im[1][0]) &&
        im.every(x => re.test(x[0]) && x[1] === 16 * dpr && x[2] === 16 * dpr && x[3] === 16 && x[4] === 16),
      JSON.stringify(im)
    );
    if (OUT)
      await d.screenshot({
        path: path.join(OUT, `fix3-affix-icons-dpr${dpr}.png`),
        clip: { x: 788, y: 140, width: 476, height: 220 }
      });
    await cx.close();
  }
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
    window.PADA = [0, 0, 0, 0];
    navigator.getGamepads = () => [window.PADON ? { buttons: window.PADB, axes: window.PADA } : null];
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
  /* fix3：按住 Y 時右搖桿捲 ③；放開 Y 回頂端（焦點上的候選與身上頭盔各 6 條詞綴，③ 放不下） */
  await g3.evaluate(() => {
    const it = S.inv.items.find(x => x.id === CH.hov),
      A = S.inv.items.flatMap(x => x.a || []);
    window.DD3 = [it, it.a, S.eq.helm.a];
    S.eq.helm.a = A.slice(0, 6);
    it.a = A.slice(6, 12);
    chCmpSync();
  });
  await g3.evaluate(() => (PADB[3].pressed = true));
  await g3.waitForTimeout(150);
  const y0 = await g3.evaluate(L3S);
  await g3.evaluate(() => (PADA[3] = 1));
  await g3.waitForTimeout(150);
  await g3.evaluate(() => (PADA[3] = 0));
  const y1 = await g3.evaluate(L3S);
  await g3.evaluate(() => (PADB[3].pressed = false));
  await g3.waitForTimeout(150);
  const y2 = await g3.evaluate(L3S);
  ok(
    '手把：按住 Y 右搖桿捲 ③（「▼ 還有 n 條」跟著減）、放開 Y 回頂端',
    y0.det &&
      y0.top === 0 &&
      y0.below > 0 &&
      y1.top > 0 &&
      y1.below < y0.below &&
      y1.list === 0 &&
      !y2.det &&
      y2.top === 0,
    JSON.stringify([y0, y1, y2])
  );
  await g3.evaluate(() => {
    const [it, a, ha] = DD3;
    it.a = a;
    S.eq.helm.a = ha;
    chCmpSync();
  });
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
  /* Q11：手把方向鍵在格間移焦點（候選 4×3 照行列），焦點上的候選立即出比較浮窗 */
  await g3.evaluate(() => (PADB[0].pressed = false));
  await g3.waitForTimeout(100);
  await g3.focus('#pinv .c12g .cq');
  const pad = async i => {
    await g3.evaluate(i => (PADB[i].pressed = true), i);
    await g3.waitForTimeout(120);
    await g3.evaluate(i => (PADB[i].pressed = false), i);
    await g3.waitForTimeout(120);
    return g3.evaluate(() => {
      const E = [...document.querySelectorAll('#pinv .c12g .cq')],
        f = document.activeElement;
      return [E.indexOf(f), CH.hov === +((f.dataset.c || '').slice(5) || NaN), !!$('pinv').querySelector('.c12p')];
    });
  };
  const mv = [await pad(15), await pad(13), await pad(14), await pad(12)];
  ok(
    '手把方向鍵：右 → 第 2 格、下 → 第 6 格、左 → 第 5 格、上 → 第 1 格；焦點格立即出比較浮窗',
    JSON.stringify(mv.map(x => x[0])) === '[1,5,4,0]' && mv.every(x => x[1] && x[2]),
    JSON.stringify(mv)
  );
  if (OUT) fs.writeFileSync(path.join(OUT, 'boxes.json'), JSON.stringify(BOX, null, 1));
  await b.close();
  console.log(bad ? `❌ ${bad} 項沒過` : '✅ 角色頁全部通過');
  process.exit(bad ? 1 : 0);
})();
