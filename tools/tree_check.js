/* 天賦樹桌機 1280×720 實測（S/talent-tree.md v1.0.1；示意圖 W5-talent-tree 01–19；js/tree.js）：
   滿版殼（頂欄 52／樹 624／底欄 44）、重置 12,628 高 36、小地圖 168、底欄文案、懸浮窗（小點 360、大點 400、0 秒、Alt／Ｙ 詳細、點數不夠紅字）、
   名詞提示停留 0.4 秒／R3、能力值三選一（標題、1／2／3、Esc、手把）、S／D／I 標記（≥24px 才有字母、未選不畫）、
   珠寶孔 18 個（花 1 點開、空／已鑲、面板文案、拔下）、鎖住的虛線圈、重置確認卡（寬 400、鈕高 56、長按 0.6 秒、第二句）、禁用字；
   再開 390×844 確認手機照舊能點。
   用法：先開本機伺服器，node tools/tree_check.js [網址 http://localhost:8003/] [截圖資料夾]；有 ❌ 結束碼 1。
   給截圖資料夾時另寫 boxes.json（tools/tree_overlay.py 跟示意圖疊圖） */
const { chromium } = require('playwright');
const fs = require('fs');
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
    if (!e || e.hidden || !e.getClientRects().length) return null;
    const r = e.getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
  }, q);
const is = (b, x, y, w, h) => !!b && near(b[0], x) && near(b[1], y) && near(b[2], w) && near(b[3], h);
const LAUNCH = process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {};
const BANNED = ['法力', 'MP', '祭壇', '換上', 'ms', '彈夾', '輪末王', '推薦路線', '暫定', '金框', '叢集'];
const setup = () => {
  proSkip();
  S.story.tips = 0;
  S.auto = 0;
  S.lv = 20;
  S.camp.altar = 10;
};
/* 開樹、看某個點（世界座標），縮放 z */
const look = (p, id, z) =>
  p.evaluate(
    ([id, z]) => {
      const n = PTREE.I[id];
      cancelAnimationFrame(TREE.fly);
      TREE.z = z;
      TREE.x = -n.x * z;
      TREE.y = -n.y * z;
      treeView();
      treeMoving(false);
    },
    [id, z]
  );
const at = (p, id) =>
  p.evaluate(id => {
    const r = ndRect(id);
    return [r.left + r.width / 2, r.top + r.height / 2, r.width];
  }, id);
const hover = async (p, id) => {
  const [x, y] = await at(p, id);
  await p.mouse.move(x + 1, y + 1);
  await p.mouse.move(x, y);
  await p.waitForTimeout(60);
};
const BOX = {};
(async () => {
  const b = await chromium.launch(LAUNCH);
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
  await p.waitForTimeout(1500);
  /* 假手把：navigator.getGamepads 回一個可以改按鈕的物件 */
  await p.evaluate(() => {
    window.PAD = { buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0, 0, 0] };
    navigator.getGamepads = () => [window.PAD];
  });
  const pad = (i, on) => p.evaluate(([i, on]) => (PAD.buttons[i].pressed = on), [i, on]);
  const shot = async (n, L) => {
    if (!OUT) return;
    await p.screenshot({ path: `${OUT}/${n}.png` });
    BOX[n] = [];
    for (const [lab, q, sp] of L) BOX[n].push([lab, q, sp, await box(p, q)]);
  };
  const SHELL = [
    ['頂欄', '#ptree .tbar', [0, 0, 1280, 52]],
    ['搜尋天賦', '#tfind', [912, 8, 260, 36]],
    ['回', '.tbar .tmine', [1184, 8, 36, 36]],
    ['關閉', '.tbar [data-ta="close"]', [1232, 8, 36, 36]],
    ['樹視圖', '#tview', [0, 52, 1280, 624]],
    ['底欄操作說明', '.thelp', [0, 676, 1280, 44]],
    ['小地圖', '#tminiw', [1100, 64, 168, 168]]
  ];
  const RESET = ['重置天賦', '#treset', [12, 628, 86, 36]];

  /* ---------- 01 總覽 ---------- */
  await p.evaluate(() => treeOpen());
  await p.waitForTimeout(700);
  const sh = {};
  for (const [lab, q, [x, y, w, h]] of SHELL) sh[lab] = await box(p, q);
  ok('頂欄 0,0 1280×52', is(sh['頂欄'], 0, 0, 1280, 52), sh['頂欄']);
  ok('樹視圖 0,52 1280×624（滿版蓋掉遊戲頂欄與底列）', is(sh['樹視圖'], 0, 52, 1280, 624), sh['樹視圖']);
  ok('底欄操作說明 0,676 1280×44', is(sh['底欄操作說明'], 0, 676, 1280, 44), sh['底欄操作說明']);
  ok(
    '頂欄右邊：搜尋天賦、「回」、「×」都在頂欄裡、高 36、×在最右',
    sh['搜尋天賦'][3] === 36 &&
      sh['回'][2] === 36 &&
      sh['關閉'][2] === 36 &&
      sh['關閉'][0] + 36 <= 1280 &&
      sh['關閉'][0] > sh['回'][0] &&
      sh['回'][0] > sh['搜尋天賦'][0],
    JSON.stringify([sh['搜尋天賦'], sh['回'], sh['關閉']])
  );
  ok('小地圖在樹視圖右上、168×168（桌機總覽也顯示）', is(sh['小地圖'], 1100, 64, 168, 168), sh['小地圖']);
  const T1 = await p.evaluate(() => ({
    title: document.querySelector('#ptree .tbar > b').textContent,
    left: document.querySelector('.tleft').textContent.replace(/\s+/g, ' ').trim(),
    ph: $('tfind').placeholder,
    mine: [document.querySelector('.tmine').textContent, document.querySelector('.tmine').getAttribute('aria-label')],
    help: document.querySelector('.thelp').textContent,
    mini: $('tminiw').querySelector('b').textContent,
    fs: [
      getComputedStyle(document.querySelector('#ptree .tbar > b')).font,
      getComputedStyle($('tfind')).fontSize,
      getComputedStyle(document.querySelector('.thelp')).fontSize,
      getComputedStyle($('tminiw').querySelector('b')).font
    ],
    names: [...document.querySelectorAll('#tg .secn')].map(e => e.textContent),
    asc: [...document.querySelectorAll('#tascgo text')].map(e => e.textContent)
  }));
  ok(
    '頂欄文案：「天賦樹」「剩 n 點」「搜尋天賦」「回」（回到我點到的地方）',
    T1.title === '天賦樹' &&
      /^剩 \d+ 點$/.test(T1.left) &&
      T1.ph === '搜尋天賦' &&
      T1.mine.join() === '回,回到我點到的地方',
    JSON.stringify(T1)
  );
  ok(
    '底欄文案（精確）：不寫「金框」、不寫「推薦路線」',
    T1.help ===
      '操作點亮著的點＝點下去，再點＝退回　·　拖曳移動　·　滾輪縮放　·　雙圈大圓是基石（有代價）　·　虛線圈＝還沒開放　·　名詞停留 0.4 秒／手把 R3',
    T1.help
  );
  ok(
    '字級：標題 16/700、搜尋 16、底欄 14、小地圖標「整棵樹」11/700',
    /^700 16px/.test(T1.fs[0]) &&
      T1.fs[1] === '16px' &&
      T1.fs[2] === '14px' &&
      /^700 11px/.test(T1.fs[3]) &&
      T1.mini === '整棵樹',
    JSON.stringify(T1.fs)
  );
  ok(
    '六條路名（鬥士／遊俠／暗影／魔導／死靈／自然之路）；中心「還沒有昇華」「點這裡選一個」',
    T1.names.join() === '鬥士之路,遊俠之路,暗影之路,魔導之路,死靈之路,自然之路' &&
      T1.asc.join() === '還沒有昇華,點這裡選一個',
    JSON.stringify([T1.names, T1.asc])
  );
  const J = await p.evaluate(() => ({
    n: PTREE.J.length,
    out: PTREE.J.filter(n => n.out).length,
    dom: document.querySelectorAll('#tg .nd.js').length,
    j3c: PTREE.I.J3c.an,
    j1a: [PTREE.I.J1a.x, PTREE.I.J1a.y, PTREE.I.J1a.an],
    j1c: [PTREE.I.J1c.x, PTREE.I.J1c.y, PTREE.I.J1c.an],
    edge: PTREE.J.every(n => PTREE.ADJ[n.an].includes(n.id))
  }));
  ok(
    '珠寶孔 18 個都在樹上（外圈大孔 6）、各連到掛點；J1a (2089.8,−765.3)→t89、J1c (2530.9,−2431.6)→t153、J3c→t210',
    J.n === 18 &&
      J.out === 6 &&
      J.dom === 18 &&
      J.edge &&
      J.j3c === 't210' &&
      J.j1a.join() === '2089.8,-765.3,t89' &&
      J.j1c.join() === '2530.9,-2431.6,t153',
    JSON.stringify(J)
  );
  const LK = await p.evaluate(() => ({
    n: document.querySelectorAll('#tg .lkc').length,
    t: [...new Set([...document.querySelectorAll('#tg .lkc text')].map(e => e.textContent))],
    dash: getComputedStyle(document.querySelector('#tg .lkc circle')).strokeDasharray,
    one: treeLocks().every(g => {
      const S2 = new Set(g.ids);
      return new Set(g.ids.flatMap(id => PTREE.ADJ[id].filter(o => !S2.has(o)))).size === 1;
    })
  }));
  ok(
    '鎖住的點畫虛線圈、標「還沒開放：「鏈錘術」」等、每團單一入口；畫面不寫「叢集」',
    LK.n > 0 && LK.dash !== 'none' && LK.t.every(t => /^還沒開放：「.+」$/.test(t)) && LK.one,
    JSON.stringify(LK)
  );
  await shot('01-overview', [...SHELL]);
  if (OUT) await p.screenshot({ path: `${OUT}/19-jewel-map.png` }), (BOX['19-jewel-map'] = BOX['01-overview']);

  /* ---------- 08 小點懸浮（0 秒）＋ 16px 下限 ---------- */
  const ids = await p.evaluate(() => {
    const st = 'g1',
      nb = PTREE.ADJ[st].filter(o => !PTREE.I[o].lock);
    /* 遊俠之路附近：一個連著起點的小點（不是能力值）、一個大點（找不用能力值點的最近路）、一個能力值點 */
    const near = f => {
      const d = { [st]: 0 },
        q = [st];
      for (let i = 0; i < q.length; i++)
        for (const o of PTREE.ADJ[q[i]] || [])
          if (!(o in d) && !PTREE.I[o].lock) {
            d[o] = d[q[i]] + 1;
            if (f(PTREE.I[o], o)) return o;
            q.push(o);
          }
    };
    return {
      st,
      small: near(n => !n.big && !n.s.attr && !n.jw && n.jw !== 0 && Object.keys(n.s).length),
      big: near(n => n.big === 1 && !n.gate),
      key: PTREE.N.find(n => n.big === 2).id,
      attr: near(n => n.s.attr),
      nb
    };
  });
  await look(p, ids.small, 1.25);
  await p.waitForTimeout(150);
  const t0 = Date.now();
  await hover(p, ids.small);
  const H8 = await p.evaluate(() => ({
    hid: $('thov').hidden,
    w: $('thov').getBoundingClientRect().width,
    b: $('thov').querySelector('b').textContent,
    k: $('thov').querySelector('small').textContent,
    hh: [...$('thov').querySelectorAll('.hh')].map(e => e.textContent).join('|'),
    fs: [
      getComputedStyle($('thov').querySelector('b')).font,
      getComputedStyle($('thov').querySelector('.ef')).fontSize,
      getComputedStyle($('thov').querySelector('.hh')).fontSize
    ]
  }));
  ok(
    `小點懸浮 0 秒出現（滑過去 ${Date.now() - t0}ms 內）、寬 360；「小點」；提示文案`,
    !H8.hid &&
      near(H8.w, 360) &&
      H8.k === '小點' &&
      H8.hh ===
        '滑鼠懸停立即出現。按住 Alt／手把 Ｙ 看詳細（小點通常沒有更多層）。名詞提示要停留 0.4 秒或按 R3，與本窗分開。',
    JSON.stringify(H8)
  );
  ok(
    '懸浮字級：名 16/700、效果 16、提示 14',
    /^700 16px/.test(H8.fs[0]) && H8.fs[1] === '16px' && H8.fs[2] === '14px',
    H8.fs
  );
  const md = await p.evaluate(() =>
    Math.min(
      ...[...document.querySelectorAll('#tg .nd.can circle:not(.r2), #tg .nd.off circle:not(.r2)')]
        .map(e => e.getBoundingClientRect())
        .filter(r => r.width && r.right > 0 && r.left < innerWidth && r.bottom > 52 && r.top < 676)
        .map(r => r.width)
    )
  );
  ok('放大（回到我點到的地方的縮放）時能點的節點 ≥16px', md >= 16, md);
  await shot('08-hover-small', [...SHELL, ['小點懸浮', '#thov', [0, 0, 360, 0]]]);

  /* ---------- 09／10 大點懸浮：簡易 → 按住 Alt 詳細 → 放開回簡易；手把 Ｙ 同 ---------- */
  await look(p, ids.big, 1.25);
  await p.waitForTimeout(150);
  await hover(p, ids.big);
  const H9 = await p.evaluate(() => ({
    w: $('thov').getBoundingClientRect().width,
    k: $('thov').querySelector('small').textContent,
    hh: $('thov').querySelector('.hh').textContent,
    left: $('thov').getBoundingClientRect().left >= ndRect(TREE.hov).right,
    th: PT_THEME[PTREE.I[TREE.hov].th].n
  }));
  ok(
    '大點懸浮（簡易）：寬 400、在點的右側、「大點　·　{主題}」、「按住 Alt（鍵盤）或 Ｙ（手把）看詳細，放開回簡易。」',
    near(H9.w, 400) &&
      H9.left &&
      H9.k === `大點　·　${H9.th}` &&
      H9.hh === '按住 Alt（鍵盤）或 Ｙ（手把）看詳細，放開回簡易。',
    JSON.stringify(H9)
  );
  await shot('09-hover-notable', [...SHELL, ['大點懸浮', '#thov', [0, 0, 400, 0]]]);
  const h9 = await box(p, '#thov');
  await p.keyboard.down('Alt');
  await p.waitForTimeout(60);
  const H10 = await p.evaluate(() => ({
    det: $('thov').classList.contains('det'),
    top: $('thov').firstElementChild.textContent,
    hh: [...$('thov').querySelectorAll('.hh')].map(e => e.textContent),
    pg: document.querySelectorAll('#tview .thov, #ptree > .thov').length
  }));
  const h10 = await box(p, '#thov');
  ok(
    '按住 Alt：同一窗加高（不另開頁）、頂沿「正在按住 Alt／Ｙ　·　放開回簡易」、沿路點數、主題圖共用、沒有基石代價',
    H10.det &&
      H10.pg === 1 &&
      h10[3] > h9[3] &&
      H10.top === '正在按住 Alt／Ｙ　·　放開回簡易' &&
      /^沿路點亮到這裡要 \d+ 點。這一點本身 1 點。$/.test(H10.hh[0]) &&
      /^同一條路的.+大點共用一張主題圖。$/.test(H10.hh[1]) &&
      H10.hh[2] === '沒有基石代價（基石才會在這一層寫代價）。',
    JSON.stringify(H10)
  );
  await shot('10-hover-notable-detail', [...SHELL, ['大點懸浮（詳細）', '#thov', [0, 0, 400, 0]]]);
  await p.keyboard.up('Alt');
  await p.waitForTimeout(60);
  ok('放開 Alt 回簡易', await p.evaluate(() => !$('thov').classList.contains('det')));
  await pad(3, true);
  await p.waitForTimeout(120);
  const y1 = await p.evaluate(() => $('thov').classList.contains('det'));
  await pad(3, false);
  await p.waitForTimeout(120);
  ok('手把 Ｙ 按住看詳細、放開回簡易', y1 && (await p.evaluate(() => !$('thov').classList.contains('det'))));

  /* ---------- 11 點數不夠：紅字「要 n 點才走得到，還差 m 點」 ---------- */
  await p.evaluate(() => (S.lv = 2));
  await hover(p, ids.big);
  const H11 = await p.evaluate(() => {
    const e = $('thov').querySelector('.need');
    return (
      e && [
        e.textContent,
        getComputedStyle(e.querySelector('em')).color,
        getComputedStyle($('thov').querySelector('.ef')).color,
        $('thov').querySelector('.need + .hh').textContent,
        TREE.path.length,
        ptLeft()
      ]
    );
  });
  ok(
    '點數不夠：「要 n 點才走得到，還差 m 點」差點紅字、「沒有足夠的天賦點時不能點亮。升級會再給（每級 1 點，逢 10 級 +3）。」；沿路高亮',
    !!H11 &&
      H11[0] === `要 ${H11[4]} 點才走得到，還差 ${H11[4] - H11[5]} 點` &&
      H11[1] !== H11[2] &&
      H11[3] === '沒有足夠的天賦點時不能點亮。升級會再給（每級 1 點，逢 10 級 +3）。' &&
      (await p.evaluate(() => document.querySelectorAll('#tg .nd.pth').length)) === H11[4],
    JSON.stringify(H11)
  );
  const pt0 = await p.evaluate(() => S.pt.length);
  await p.mouse.click(...(await at(p, ids.big)).slice(0, 2));
  ok('點數不夠點了不會點亮', (await p.evaluate(() => S.pt.length)) === pt0);
  await shot('11-not-enough-points', [...SHELL, ['大點懸浮（點數不夠）', '#thov', [0, 0, 400, 0]]]);
  await p.evaluate(() => (S.lv = 20));

  /* ---------- 13 名詞提示：停留 0.4 秒（不是懸浮窗本身）、手把 R3 ---------- */
  const tmId = await p.evaluate(() => {
    const have = new Set(S.pt);
    return PTREE.N.find(n => n.big === 1 && !n.gate && !n.lock && statLines(n.s).some(t => t.includes('投射物')))?.id;
  });
  await look(p, tmId, 1.25);
  await p.waitForTimeout(150);
  await hover(p, tmId);
  const tm = await p.evaluate(() => {
    const e = $('thov').querySelector('.tm');
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return [e.dataset.tm, r.left + r.width / 2, r.top + r.height / 2, getComputedStyle(e).borderBottomStyle];
  });
  ok('效果裡的名詞（TERMS）有虛線底線', !!tm && tm[3] === 'dashed', JSON.stringify(tm));
  if (tm) {
    await p.mouse.move(tm[1], tm[2], { steps: 4 });
    await p.waitForTimeout(250);
    const early = await p.evaluate(() => $('tterm').hidden);
    await p.waitForTimeout(250);
    const T13 = await p.evaluate(() => ({
      on: !$('tterm').hidden,
      hov: !$('thov').hidden,
      b: $('tterm').querySelector('b').textContent,
      t: $('tterm').querySelector('p').textContent,
      w: $('tterm').getBoundingClientRect().width,
      fs: [
        getComputedStyle($('tterm').querySelector('b')).font,
        getComputedStyle($('tterm').querySelector('p')).fontSize
      ]
    }));
    const want = await p.evaluate(w => TERMS[w], tm[0]);
    ok(
      '名詞提示：0.25 秒時還沒出、0.5 秒出；另一層（懸浮窗還在）；字照 TERMS；寬 360；詞 16/700、釋義 16',
      early &&
        T13.on &&
        T13.hov &&
        T13.b === tm[0] &&
        T13.t === want &&
        near(T13.w, 360) &&
        /^700 16px/.test(T13.fs[0]) &&
        T13.fs[1] === '16px',
      JSON.stringify(T13)
    );
    await shot('13-noun-tip', [
      ...SHELL,
      ['名詞提示', '#tterm', [300, 80, 360, 0]],
      ['懸浮窗', '#thov', [0, 0, 400, 0]]
    ]);
    await hover(p, tmId);
    await p.waitForTimeout(50);
    await pad(11, true);
    await p.waitForTimeout(120);
    await pad(11, false);
    await p.waitForTimeout(60);
    ok('手把 R3：懸浮窗開著時直接出名詞提示', await p.evaluate(() => !$('tterm').hidden));
  }

  /* ---------- 15 能力值三選一 ---------- */
  await p.mouse.move(5, 300);
  await look(p, ids.attr, 1.25);
  await p.waitForTimeout(150);
  await hover(p, ids.attr);
  const H17a = await p.evaluate(() => $('thov').textContent);
  const unsel = await p.evaluate(id => {
    const e = TEL.n.get(id);
    return [...e.querySelectorAll('.am > *')].filter(x => getComputedStyle(x).display !== 'none').length;
  }, ids.attr);
  ok(
    '未選的能力值點：懸浮只一句「能力值 +5（點的時候選力量、敏捷或智慧）」；點上沒有形狀、沒有字母（不畫成力量）',
    /能力值 \+5（點的時候選力量、敏捷或智慧）$/.test(H17a) && unsel === 0,
    H17a + ' ' + unsel
  );
  await shot('17-attr-hover', [...SHELL, ['能力值懸浮', '#thov', [0, 0, 360, 0]]]);
  const ptA = await p.evaluate(() => S.pt.length);
  await p.mouse.click(...(await at(p, ids.attr)).slice(0, 2));
  await p.waitForTimeout(80);
  const C15 = await p.evaluate(() => {
    const d = $('tattr');
    return (
      d && {
        th: d.querySelector('.th').textContent,
        tp: d.querySelector('.tp').textContent,
        ab: [...d.querySelectorAll('.ab')].map(b => b.textContent),
        h: [...d.querySelectorAll('.ab')].map(b => Math.round(b.getBoundingClientRect().height)),
        x: d.querySelector('[data-ta="attrx"]').textContent,
        keys: d.querySelector('.keys').textContent,
        fs: [
          getComputedStyle(d.querySelector('.th')).font,
          getComputedStyle(d.querySelector('.ab b')).font,
          getComputedStyle(d.querySelector('.ab small')).fontSize
        ]
      }
    );
  });
  const c15 = await box(p, '#tattr'),
    n15 = await at(p, ids.attr);
  ok(
    '點能力值點才出三選一：標題「能力值 +5」、「點的時候選力量、敏捷或智慧。點按鈕才點下去。」；力量（生命；+5 力量＝+10 最大生命）、敏捷（命中；+40 命中值）、智慧（魔力；+10 最大魔力）；取消＋Esc；還沒點下去',
    !!C15 &&
      C15.th === '能力值 +5' &&
      C15.tp === '點的時候選力量、敏捷或智慧。點按鈕才點下去。' &&
      C15.ab.join('|') ===
        'S力量生命+5 力量＝+10 最大生命1|D敏捷命中+5 敏捷＝+40 命中值2|I智慧魔力+5 智慧＝+10 最大魔力3' &&
      C15.x === '取消Esc' &&
      C15.h.every(h => h >= 44) &&
      (await p.evaluate(() => S.pt.length)) === ptA,
    JSON.stringify(C15)
  );
  ok(
    '三選一卡貼在點旁（左緣離點 ≤40px）、不出樹的畫面',
    !!c15 && Math.abs(c15[0] - (n15[0] + n15[2] / 2)) <= 40 && c15[1] >= 52 && c15[1] + c15[3] <= 676,
    JSON.stringify([c15, n15])
  );
  ok(
    '三選一字級：標題 16/700、主 16、輔 14',
    !!C15 && /^700 16px/.test(C15.fs[0]) && /16px/.test(C15.fs[1]) && C15.fs[2] === '14px',
    C15 && C15.fs
  );
  await shot('15-attr-pick', [...SHELL, ['能力值三選一', '#tattr', [780, 68, 420, 348]]]);
  await p.keyboard.press('Escape');
  ok('Esc 關三選一（樹不關、沒點下去）', await p.evaluate(n => !$('tattr') && TREE.open && S.pt.length === n, ptA));
  await p.mouse.click(...(await at(p, ids.attr)).slice(0, 2));
  await p.keyboard.press('2');
  await p.waitForTimeout(80);
  const D16 = await p.evaluate(
    id => ({ a: S.ptA[id], on: S.pt.includes(id), cls: TEL.n.get(id).getAttribute('class') }),
    ids.attr
  );
  ok(
    '鍵盤 2＝敏捷，點下去（沿路的能力值點都記敏捷）',
    D16.a === 'd' && D16.on && /a-d/.test(D16.cls),
    JSON.stringify(D16)
  );
  const shp = z =>
    p.evaluate(
      ([id, z]) => {
        const n = PTREE.I[id];
        TREE.z = z;
        TREE.x = -n.x * z;
        TREE.y = -n.y * z;
        treeView();
        const e = TEL.n.get(id),
          vis = q => [...e.querySelectorAll(q)].filter(x => getComputedStyle(x).display !== 'none');
        return {
          shape: vis('.am > rect, .am > path, .am > circle').map(x => x.getAttribute('class')),
          al: vis('.al').map(x => x.textContent),
          px: Math.round(e.querySelector('circle').getBoundingClientRect().width)
        };
      },
      [ids.attr, z]
    );
  const big16 = await shp(1.25),
    sm16 = await shp(0.9);
  ok(
    '已選敏捷：菱形＋D（點 ≥24px 才畫字母）；<24px 只畫形狀',
    big16.shape.join() === 'ad' &&
      big16.al.join() === 'D' &&
      big16.px >= 24 &&
      sm16.shape.join() === 'ad' &&
      !sm16.al.length &&
      sm16.px < 24,
    JSON.stringify([big16, sm16])
  );
  await hover(p, ids.attr);
  const H17 = await p.evaluate(() => [
    $('thov').querySelector('b').textContent,
    $('thov').querySelector('.ef').textContent,
    $('thov').querySelector('.hh').textContent
  ]);
  ok(
    '已選懸浮：「敏捷 +5」「+40 命中值（每 1 點敏捷 +8 命中值）」＋改選說明',
    H17.join('|') ===
      '敏捷 +5|+40 命中值（每 1 點敏捷 +8 命中值）|改選：先退回這一點（後面沒有連著的點時；免費），再點一次重選。不能就地換。',
    H17.join('|')
  );
  await look(p, ids.attr, 1.25);
  await shot('16-attr-results', [...SHELL, RESET]);
  /* 手把：方向鍵選、Ⓐ 確認；Ⓑ 取消 */
  const a2 = await p.evaluate(id => {
    const d = { [id]: 0 },
      q = [id];
    for (let i = 0; i < q.length; i++)
      for (const o of PTREE.ADJ[q[i]])
        if (!(o in d)) {
          d[o] = 1;
          if (PTREE.I[o].s.attr && !S.pt.includes(o) && treeCan(o)) return o;
          q.push(o);
        }
  }, ids.attr);
  if (a2) {
    await look(p, a2, 1.25);
    await p.mouse.click(...(await at(p, a2)).slice(0, 2));
    await pad(13, true), await p.waitForTimeout(60), await pad(13, false), await p.waitForTimeout(60);
    await pad(13, true), await p.waitForTimeout(60), await pad(13, false), await p.waitForTimeout(60);
    await pad(0, true), await p.waitForTimeout(60), await pad(0, false), await p.waitForTimeout(80);
    ok('手把：三選一方向鍵下兩次＋Ⓐ＝智慧', await p.evaluate(id => S.ptA[id] === 'i' && !$('tattr'), a2));
  }

  /* ---------- 06／07 珠寶孔 ---------- */
  await p.evaluate(() => {
    /* 沿路點到 J1a 的掛點（點數給夠） */
    S.lv = 90;
    const road = [];
    for (const x of treePath('t89')) if (!S.pt.includes(x)) road.push(x);
    for (const x of road) S.pt.push(x), PTREE.I[x].s.attr && (S.ptA[x] = 'd');
    treeChanged();
  });
  await look(p, 'J1a', 1.25);
  await p.waitForTimeout(150);
  await hover(p, 'J1a');
  const J6 = await p.evaluate(() => ({
    jt: TEL.n.get('J1a').querySelector('.jt').textContent,
    jl: TEL.n.get('J1a').querySelector('.jl').textContent,
    tip: [$('thov').querySelector('b').textContent, $('thov').querySelector('small').textContent],
    px: Math.round(TEL.n.get('J1a').querySelector('circle').getBoundingClientRect().width),
    can: TEL.n.get('J1a').classList.contains('can')
  }));
  ok(
    '空孔：孔上標「空」、旁標「還沒點亮（開孔要 1 點）」；懸浮「遊俠之路的珠寶孔」；≥16px、連著掛點可以開（J1a 是前期孔，標題不加「（大孔）」）',
    J6.jt === '空' &&
      J6.jl === '還沒點亮（開孔要 1 點）' &&
      J6.tip.join('|') === '遊俠之路的珠寶孔|還沒點亮（開孔要 1 點）' &&
      J6.px >= 16 &&
      J6.can,
    JSON.stringify(J6)
  );
  const lv0 = await p.evaluate(() => ptLeft());
  await p.mouse.click(...(await at(p, 'J1a')).slice(0, 2));
  await p.waitForTimeout(80);
  const P6 = await p.evaluate(() => ({
    t: $('tsockp') && $('tsockp').innerText,
    open: sockOpen(S, 1),
    left: ptLeft()
  }));
  ok('點孔＝花 1 點開孔，同時開孔的面板', P6.open && P6.left === lv0 - 1 && !!P6.t, JSON.stringify(P6));
  await p.mouse.click(...(await at(p, 'J1a')).slice(0, 2));
  await p.waitForTimeout(80);
  const P6b = await p.evaluate(() => ({
    t: $('tsockp').innerText,
    open: sockOpen(S, 1),
    code: /J\d[abc]/.test($('tsockp').innerText)
  }));
  ok(
    '再點＝退回（還沒點亮）；面板：標題「遊俠之路的珠寶孔」、副標「還沒點亮（開孔要 1 點）」、「這個孔是空的。」、掉落句定稿、「珠寶無法分解，也不能打造或重鑄。空孔可先看，不藏起來。」；沒有 J 代碼',
    !P6b.open &&
      !P6b.code &&
      P6b.t.includes('遊俠之路的珠寶孔') &&
      P6b.t.includes('還沒點亮（開孔要 1 點）') &&
      P6b.t.includes('這個孔是空的。') &&
      P6b.t.includes('珠寶打鬼門關、心魔幻境、凶地、陰兵借道才會掉。不保證第一顆。') &&
      P6b.t.includes('珠寶無法分解，也不能打造或重鑄。空孔可先看，不藏起來。'),
    P6b.t
  );
  const sp = await box(p, '#tsockp');
  ok('珠寶孔面板 820,248 寬 440（示意圖 06／07 的位置）', !!sp && sp[0] === 820 && sp[1] === 248 && sp[2] === 440, sp);
  await p.mouse.move(640, 700);
  await p.waitForTimeout(60);
  await shot('06-jewel-empty', [...SHELL, RESET, ['珠寶孔面板', '#tsockp', [820, 248, 440, 180]]]);
  /* 07：外圈大孔 J1c 已鑲 */
  await p.evaluate(() => {
    treeSockOpen(null);
    for (const x of treePath('J1c')) if (!S.pt.includes(x)) S.pt.push(x), PTREE.I[x].s.attr && (S.ptA[x] = 'd');
    S.jewels = [
      { id: 'jA', nt: [PT_NOTABLES[0]] },
      { id: 'jB', nt: [PT_NOTABLES[1], PT_NOTABLES[2]] }
    ];
    jwPut(13, 'jA');
    treeChanged();
  });
  await look(p, 'J1c', 1.25);
  await p.waitForTimeout(150);
  await p.mouse.click(...(await at(p, 'J1c')).slice(0, 2));
  await p.mouse.click(...(await at(p, 'J1c')).slice(0, 2));
  await p.waitForTimeout(80);
  const P7 = await p.evaluate(() => ({
    jt: TEL.n.get('J1c').querySelector('.jt').textContent,
    full: TEL.n.get('J1c').classList.contains('full'),
    sw: [
      getComputedStyle(TEL.n.get('J1c').querySelector('circle')).strokeWidth,
      getComputedStyle(TEL.n.get('J1a').querySelector('circle')).strokeWidth
    ],
    t: $('tsockp').innerText,
    open: sockOpen(S, 13),
    jw: jewelNodes(S).length,
    btn: [...$('tsockp').querySelectorAll('button')].map(b => b.textContent)
  }));
  ok(
    '已鑲（外圈大孔）：孔上標「已鑲」、孔圈加粗填灰；面板「遊俠之路的珠寶孔（大孔）」「已鑲上」「珠寶的大點等同點亮天賦；已點過或重複的大點只算一次。」「拔下」、「鑲著的珠寶不能丟棄。珠寶無法分解，也不能打造或重鑄。丟棄（在倉庫的珠寶分頁，長按確認）不給任何東西。」；沒有「拆」；珠寶的大點生效',
    P7.jt === '已鑲' &&
      P7.full &&
      parseFloat(P7.sw[0]) > parseFloat(P7.sw[1]) &&
      P7.open &&
      P7.jw >= 1 &&
      P7.btn.includes('拔下') &&
      !P7.btn.some(b => /拆|分解/.test(b)) &&
      P7.t.includes('遊俠之路的珠寶孔（大孔）') &&
      P7.t.includes('已鑲上') &&
      P7.t.includes('珠寶的大點等同點亮天賦；已點過或重複的大點只算一次。') &&
      P7.t.includes(
        '鑲著的珠寶不能丟棄。珠寶無法分解，也不能打造或重鑄。丟棄（在倉庫的珠寶分頁，長按確認）不給任何東西。'
      ) &&
      !/J\d[abc]/.test(P7.t),
    JSON.stringify(P7)
  );
  await p.mouse.move(640, 700);
  await p.waitForTimeout(60);
  await shot('07-jewel-socketed', [...SHELL, RESET, ['珠寶孔面板', '#tsockp', [820, 248, 440, 230]]]);
  await p.click('#tsockp [data-ta^="jout"]');
  ok(
    '拔下：孔空了、珠寶回收藏、面板改列收藏（鑲上）',
    await p.evaluate(
      () =>
        !(S.jsock || [])[13] &&
        S.jewels.length === 2 &&
        TEL.n.get('J1c').querySelector('.jt').textContent === '空' &&
        $('tsockp').querySelectorAll('[data-ta^="jput"]').length === 2
    )
  );
  await p.keyboard.press('Escape');
  ok('Esc 先關珠寶孔面板（樹不關）', await p.evaluate(() => !$('tsockp') && TREE.open));

  /* ---------- 04 鎖住 ---------- */
  const lk = await p.evaluate(() => treeLocks()[0]);
  await p.evaluate(g => {
    TREE.z = 0.9;
    TREE.x = -g.x * 0.9;
    TREE.y = -g.y * 0.9;
    treeView();
  }, lk);
  await p.waitForTimeout(150);
  await shot('04-locked', [...SHELL, RESET]);

  /* ---------- 12／18 重置確認卡 ---------- */
  await p.click('#treset');
  await p.waitForTimeout(80);
  const R12 = await p.evaluate(() => {
    const c = document.querySelector('#hask .card');
    return {
      t: [...c.querySelectorAll('h2, p:not([hidden])')].map(e => e.textContent),
      btn: [...c.querySelectorAll('button')].map(b => [
        b.textContent,
        Math.round(b.getBoundingClientRect().height),
        b.classList.contains('pri')
      ]),
      w: Math.round(c.getBoundingClientRect().width),
      cx: Math.round(c.getBoundingClientRect().left + c.getBoundingClientRect().width / 2),
      mask: (r => [r.width, r.height])($('hask').getBoundingClientRect()),
      fs: [...c.querySelectorAll('h2, p:not([hidden])')].map(e => getComputedStyle(e).fontSize)
    };
  });
  ok(
    '重置確認卡：「重置天賦？」「退回全部已點的天賦點。洗點免費，不扣靈魂。」第二句定稿、「⚠ 不能復原」、操作說明；鈕「長按重置」「取消」（取消主鈕）高 56；寬 400 置中；遮罩 1280×720',
    R12.t.join('|') ===
      '重置天賦？|退回全部已點的天賦點。洗點免費，不扣靈魂。|起點不能退，重置後仍留在所選的路上。此操作會清掉目前的配點，但之後可再免費點回來。|⚠ 不能復原|按住 0.6 秒。條滿才執行；提早放開＝取消。鍵盤在長按鈕上按住 Enter 或空白鍵同長按，Esc 取消。' &&
      R12.btn.map(b => b[0]).join() === '長按重置,取消' &&
      R12.btn.every(b => b[1] === 56) &&
      R12.btn[1][2] &&
      R12.w === 400 &&
      near(R12.cx, 640) &&
      R12.mask.join() === '1280,720',
    JSON.stringify(R12)
  );
  ok(
    '重置卡字級：標題、正文 16；註 14',
    R12.fs[0] === '16px' && R12.fs[1] === '16px' && R12.fs[2] === '14px' && R12.fs[4] === '14px',
    R12.fs
  );
  const n12 = await p.evaluate(() => S.pt.length);
  const g = await box(p, '#hask .hgo');
  await p.mouse.move(g[0] + 20, g[1] + 20);
  await p.mouse.down();
  await p.waitForTimeout(330);
  if (OUT)
    await shot('12-reset-confirm', [
      ...SHELL,
      ['重置確認卡', '#hask .card', [440, 200, 400, 290]],
      ['長按重置', '#hask .hgo', [460, 416, 242, 56]],
      ['取消', '#hask [data-h="no"]', [710, 416, 110, 56]]
    ]);
  await p.mouse.up();
  ok('提早放開＝取消（沒有重置）', await p.evaluate(n => S.pt.length === n, n12));
  await p.mouse.move(g[0] + 20, g[1] + 20);
  await p.mouse.down();
  await p.waitForTimeout(400);
  const mid = await p.evaluate(n => S.pt.length === n, n12);
  await p.waitForTimeout(350);
  await p.mouse.up();
  await p.waitForTimeout(80);
  const R = await p.evaluate(() => ({
    pt: S.pt.join(),
    st: PT_START.join(),
    a: Object.keys(S.ptA).length,
    hask: $('hask').hidden
  }));
  ok(
    '按住 0.6 秒才重置（0.4 秒時還沒）：退回全部、起點留著、能力值選擇一併退回',
    mid && R.pt === R.st && R.a === 0 && R.hask,
    JSON.stringify(R)
  );
  /* 18：退回再選（能力值點可以退回、再點一次重選），重置卡第二句與 12 相同 */
  await p.evaluate(() => {
    S.lv = 20;
    treeChanged();
  });
  await look(p, ids.attr, 1.25);
  await p.mouse.click(...(await at(p, ids.attr)).slice(0, 2));
  await p.keyboard.press('1');
  await p.mouse.click(...(await at(p, ids.attr)).slice(0, 2));
  const back = await p.evaluate(id => !S.pt.includes(id) && !S.ptA[id], ids.attr);
  await p.mouse.click(...(await at(p, ids.attr)).slice(0, 2));
  await p.keyboard.press('3');
  ok(
    '改選：先退回這一點（後面沒有連著的點時），再點一次重選',
    back && (await p.evaluate(id => S.ptA[id] === 'i', ids.attr))
  );
  await p.click('#treset');
  await p.waitForTimeout(80);
  const s18 = await p.evaluate(() => document.querySelector('#hask .hmore').textContent);
  ok('18 重置卡第二句與 12 相同', s18 === R12.t[2], s18);
  await shot('18-attr-repick', [...SHELL, ['重置確認卡', '#hask .card', [440, 200, 400, 290]]]);
  await p.keyboard.press('Escape');

  /* ---------- 14：遊俠起點真實區域；02／03 放大起點、點亮狀態 ---------- */
  await look(p, 'g1', 1.25);
  await p.waitForTimeout(150);
  await shot('02-zoom-start', [...SHELL, RESET]);
  await shot('03-zoom-states', [...SHELL, RESET]);
  await shot('14-real-region', [...SHELL, RESET]);
  /* 05 十字弓 */
  const xb = await p.evaluate(() => PTREE.N.find(n => PT_THEME[n.th].n === '十字弓術' && n.big === 1)?.id);
  if (xb) await look(p, xb, 1.25), await p.waitForTimeout(150), await shot('05-crossbow', [...SHELL, RESET]);

  /* ---------- 禁用字、Esc、手把 Ⓑ 關樹 ---------- */
  const txt = await p.evaluate(() => {
    const out = [$('ptree').innerText];
    for (const n of [...PTREE.N.slice(0, 400), ...PTREE.J]) out.push(treeTip(n.id, 0), treeTip(n.id, 1));
    return out.join('\n').replace(/<[^>]+>/g, ' ');
  });
  const hit = BANNED.filter(w =>
    w === 'ms' ? /\d\s*ms\b/.test(txt) : w === 'MP' ? /\bMP\b/.test(txt) : txt.includes(w)
  );
  ok(
    '天賦樹畫面與懸浮不出現禁用字（法力、MP、祭壇、換上、ms、彈夾、輪末王、推薦路線、暫定、金框、叢集）',
    !hit.length,
    hit.join()
  );
  await pad(1, true), await p.waitForTimeout(80), await pad(1, false), await p.waitForTimeout(60);
  ok('手把 Ⓑ 關樹', await p.evaluate(() => !TREE.open));
  await p.evaluate(() => treeOpen());
  await p.waitForTimeout(200);
  await p.keyboard.press('Escape');
  ok('Esc 關樹', await p.evaluate(() => !TREE.open));
  ok('沒有頁面錯誤', !errs.length, errs.join(' | '));
  if (OUT) fs.writeFileSync(`${OUT}/boxes.json`, JSON.stringify(BOX, null, 1));
  await ctx.close();

  /* ---------- 390×844：手機照舊（點一下＝選、底部說明卡、能點的點 ≥16px、說明卡沒有桌機的 Alt 提示） ---------- */
  const c2 = await b.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1
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
  await q.evaluate(() => runNode(TRUNK_K[0]));
  await q.waitForTimeout(1200);
  await q.evaluate(() => (PORT() ? navGo('tree') : treeOpen()));
  await q.waitForTimeout(600);
  await q.evaluate(() => {
    const id = PTREE.ADJ.g1.find(o => !PTREE.I[o].lock);
    treeFly(PTREE.I[id].x, PTREE.I[id].y, 1.25);
  });
  await q.waitForTimeout(500);
  const m = await q.evaluate(() => {
    const id = PTREE.ADJ.g1.find(o => !PTREE.I[o].lock);
    treeSelect(id);
    const c = $('tcard');
    return {
      card: !c.hidden,
      alt: [...c.querySelectorAll('.hh.k, .hdet')].some(e => getComputedStyle(e).display !== 'none'),
      min: Math.min(
        ...[...document.querySelectorAll('#tg .nd circle:not(.r2)')]
          .map(e => e.getBoundingClientRect())
          .filter(r => r.width && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight)
          .map(r => r.width)
      ),
      over: [...document.querySelectorAll('#ptree .tbar, #tcard, #tminiw')].some(e => {
        const r = e.getBoundingClientRect();
        return r.width && (r.left < 0 || r.right > innerWidth + 0.5);
      })
    };
  });
  if (OUT) await q.screenshot({ path: `${OUT}/390x844-tree.png` });
  ok(
    '390×844：點一下＝選、底部說明卡、沒有桌機的 Alt 提示、能點的點 ≥16px、面板不出畫面',
    m.card && !m.alt && m.min >= 16 && !m.over,
    JSON.stringify(m)
  );
  ok('390×844 沒有頁面錯誤', !e2.length, e2.join(' | '));
  await b.close();
  console.log(bad ? `❌ ${bad} 項不符` : '✅ 全部通過');
  process.exit(bad ? 1 : 0);
})();
