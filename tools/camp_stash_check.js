/* 營地 v1.0＋倉庫 v1.0 桌機 1280×720 實測（docs/production/specs/camp.md、stash.md；js/camp12.js、js/stash12.js）：
   版面位置與尺寸、卡片利益行、詳細頁（升級後／目前、前後對照、費用列、升級鈕、toast）、解鎖一覽、懸停 0.4 秒；
   倉庫分頁、第一層／右欄第二層篩選、格子、比較浮窗（Alt 詳細）、整批分解長按、珠寶、通貨、特殊物品、套到裝備、鍵盤操作；
   給截圖資料夾時每個狀態拍 1280×720（＋主畫面 390×844），各元素實際框寫進 boxes.json（tools/camp_stash_overlay.py 疊圖用）。
   用法：先開本機伺服器，node tools/camp_stash_check.js [網址 http://localhost:8003/] [截圖資料夾]；有 ❌ 結束碼 1 */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const URL = process.argv[2] || 'http://localhost:8003/',
  OUT = process.argv[3] || '';
if (OUT) fs.mkdirSync(OUT, { recursive: true });
let bad = 0,
  good = 0;
const ok = (n, c, info = '') => {
  console.log((c ? '✅ ' : '❌ ') + n + (c ? '' : ' ' + info));
  c ? good++ : bad++;
};
const near = (a, b, t = 1) => Math.abs(a - b) <= t;
const is = (b, x, y, w, h, t = 1) =>
  !!b && near(b[0], x, t) && near(b[1], y, t) && near(b[2], w, t) && near(b[3], h, t);
const BOX = {};
/* 禁用字（交辦：法力、MP、ms、輪末王、輪（滾輪可）、祭壇；規格：打包、夠、暫定、ilvl、稀有珠寶等） */
const BAN =
  /法力|MP|\bms\b|輪末王|(?<!滾)輪|祭壇|祀壇|打包|夠|暫定|ilvl|三大點|稀有珠寶|特色珠寶|獨特珠寶|改寫珠寶|民房|產生器/;
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
  const E = (f, a) => p.evaluate(f, a);
  const box = q =>
    E(q => {
      const e = document.querySelector(q);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return [r.x, r.y, r.width, r.height].map(Math.round);
    }, q);
  const txt = q => E(q => (document.querySelector(q) || {}).textContent || '', q);
  const all = q => E(q => [...document.querySelectorAll(q)].map(e => e.textContent.trim()), q);
  const shot = async (n, L = []) => {
    if (!OUT) return;
    await p.mouse.move(2, 400);
    await p.screenshot({ path: path.join(OUT, n + '.png') });
    BOX[n] = await E(
      L =>
        L.map(([id, q, sp]) => [
          id,
          q,
          sp,
          (() => {
            const e = document.querySelector(q);
            if (!e) return null;
            const r = e.getBoundingClientRect();
            return [r.x, r.y, r.width, r.height].map(Math.round);
          })()
        ]),
      L
    );
  };
  const shotKeep = async (n, L = []) => {
    if (!OUT) return;
    await p.screenshot({ path: path.join(OUT, n + '.png') });
    BOX[n] = await E(
      L =>
        L.map(([id, q, sp]) => [
          id,
          q,
          sp,
          (() => {
            const e = document.querySelector(q);
            if (!e) return null;
            const r = e.getBoundingClientRect();
            return [r.x, r.y, r.width, r.height].map(Math.round);
          })()
        ]),
      L
    );
  };
  /* ======================= 營地 ======================= */
  /* 中期示範：鍛造台 15、瞭望台 12、斥候營 2、長老屋 6、倉房 2；只有鍛造台、瞭望台買得起（可升級 2） */
  const MID = () => {
    proSkip();
    S.story.tips = 0;
    S.lv = 38;
    S.auto = 0;
    Object.assign(S.camp, { forge: 15, watch: 12, scout: 2, altar: 6, store: 2 });
    const M = MAT();
    for (const k in M) if (typeof M[k] === 'number') M[k] = 0;
    for (const b of ['forge', 'watch']) {
      const n = campNext(b);
      for (const [, , w, key] of costRows(n)) {
        const have =
          key === 'soul'
            ? M.soul
            : key === 'gold'
              ? S.gold
              : key.startsWith('cur:')
                ? M[key.slice(4)] || 0
                : matN(...matOf(key));
        const add = Math.max(0, w - have) + (key === 'soul' ? 3600 : 6);
        if (key === 'soul') M.soul += add;
        else if (key === 'gold') S.gold += add;
        else if (key.startsWith('cur:')) M[key.slice(4)] = (M[key.slice(4)] || 0) + add;
        else matAdd(...matOf(key), add);
      }
    }
    changed();
  };
  await E(MID);
  await E(() => runNode(TRUNK_K[0]));
  await p.waitForTimeout(1500);
  await E(() => {
    S.auto = 0;
    G.mobs.length = 0;
  });
  const C_MAIN = [
    ['C01 營地面板', '#pcamp', [844, 76, 420, 536]],
    ['C02 標題「營地」', '.c12h > b', [856, 87, 80, 22]],
    ['C05 下一個目標', '.c12goal', [852, 120, 404, 36]],
    ['C06 功能列 地點', '.c12fn button:nth-child(1)', [852, 160, 76, 56]],
    ['C06 功能列 試招場', '.c12fn button:nth-child(5)', [1180, 160, 76, 56]],
    ['C07 卡片格', '.c12g', [852, 224, 404, 380]],
    ['C08 鍛造台卡', '#c12-forge', [852, 224, 198, 122]],
    ['C09 鍛造台印章', '#c12-forge .stamp', [996, 234, 44, 44]],
    ['C10 瞭望台卡', '#c12-watch', [1058, 224, 198, 122]],
    ['C11 斥候營卡', '#c12-scout', [852, 352, 198, 122]],
    ['C12 長老屋卡', '#c12-altar', [1058, 352, 198, 122]],
    ['C13 倉房卡', '#c12-store', [852, 480, 198, 122]],
    ['利益行（鍛造台）', '#c12-forge .c12ben', [860, 276, 182, 24]],
    ['C14 進度條（鍛造台）', '#c12-forge .cdp', [852, 342, 198, 4]]
  ];
  await p.keyboard.press('h');
  await p.waitForTimeout(500);
  ok(
    'H 開營地：右欄 #pcamp 844,76 420×536（桌機版 .cm12）',
    is(await box('#pcamp'), 844, 76, 420, 536) && (await E(() => $('pcamp').classList.contains('cm12'))),
    JSON.stringify(await box('#pcamp'))
  );
  ok(
    '標題「營地」＋「可升級 2」',
    (await txt('.c12h > b')) === '營地' && (await txt('.c12h > span')) === '可升級 2',
    await txt('.c12h')
  );
  ok(
    '下一個目標條 852,120 404×36「下一個目標：鍛造台 Lv 16」、不可點（不是按鈕）',
    is(await box('.c12goal'), 852, 120, 404, 36) &&
      (await txt('.c12goal')) === '下一個目標：鍛造台 Lv 16' &&
      (await E(() => document.querySelector('.c12goal').tagName)) === 'DIV',
    JSON.stringify([await box('.c12goal'), await txt('.c12goal')])
  );
  const fn = await E(() =>
    [...document.querySelectorAll('.c12fn button')].map(b => {
      const r = b.getBoundingClientRect();
      return [
        Math.round(r.x),
        Math.round(r.y),
        r.width,
        r.height,
        b.querySelector('span').textContent,
        (b.querySelector('kbd') || {}).textContent || ''
      ];
    })
  );
  ok(
    '功能列 5 格 76×56、間距 6、852,160 起：地點 M、倉庫 L、昇華石碑 U、山海寶盒 J、試招場無鍵帽',
    fn.length === 5 &&
      fn.every((f, i) => f[0] === 852 + 82 * i && f[1] === 160 && f[2] === 76 && f[3] === 56) &&
      JSON.stringify(fn.map(f => f[4] + f[5])) ===
        JSON.stringify(['地點M', '倉庫L', '昇華石碑U', '山海寶盒J', '試招場']),
    JSON.stringify(fn)
  );
  const cards = await E(() =>
    C12_B.map(b => {
      const e = $('c12-' + b),
        r = e.getBoundingClientRect();
      return [
        b,
        Math.round(r.x),
        Math.round(r.y),
        r.width,
        r.height,
        e.querySelector('.c12b > b').textContent,
        e.querySelector('.lv').textContent,
        e.querySelector('.c12ben').textContent,
        (e.querySelector('.c12st') || {}).textContent || '',
        e.classList.contains('sug'),
        !!e.querySelector('.c12sg')
      ];
    })
  );
  ok(
    '五座固定順序：鍛造台、瞭望台、斥候營、長老屋、倉房（沒有民房、產生器卡）',
    JSON.stringify(cards.map(c => c[5])) === JSON.stringify(['鍛造台', '瞭望台', '斥候營', '長老屋', '倉房']) &&
      (await E(() => document.querySelectorAll('#pcamp .cdc').length)) === 5,
    JSON.stringify(cards.map(c => c[5]))
  );
  ok(
    '卡片 198×122、2 欄、列步 128：852／1058 × 224／352／480',
    cards.every(
      (c, i) => c[1] === (i % 2 ? 1058 : 852) && c[2] === 224 + 128 * Math.floor(i / 2) && c[3] === 198 && c[4] === 122
    ),
    JSON.stringify(cards.map(c => c.slice(1, 5)))
  );
  ok(
    '等級「Lv 15／20」「Lv 12／26」「Lv 2／4」「Lv 6／11」「Lv 2／5」（Lv 後空格）',
    JSON.stringify(cards.map(c => c[6])) ===
      JSON.stringify(['Lv 15／20', 'Lv 12／26', 'Lv 2／4', 'Lv 6／11', 'Lv 2／5']),
    JSON.stringify(cards.map(c => c[6]))
  );
  const watchN = await E(() => wName(S, ...wXY(TRUNK_K[13])));
  ok(
    `利益行（中期）：一次打造 10→20 件／解鎖：${watchN}／可選 3→4★／解鎖：昇華石碑／離線收益最多 4→8 小時`,
    JSON.stringify(cards.map(c => c[7])) ===
      JSON.stringify(['一次打造 10→20 件', `解鎖：${watchN}`, '可選 3→4★', '解鎖：昇華石碑', '離線收益最多 4→8 小時']),
    JSON.stringify(cards.map(c => c[7]))
  );
  const ben = await E(() =>
    [...document.querySelectorAll('.c12ben')].map(e => {
      const s = getComputedStyle(e);
      return [e.scrollWidth, e.clientWidth, s.fontSize, s.fontWeight, getComputedStyle(e.querySelector('em')).color];
    })
  );
  ok(
    '利益行 ≤182 px 不截、16/700；數字／解鎖對象 --good 高亮',
    ben.every(x => x[0] <= 182 && x[1] === 182 && x[2] === '16px' && x[3] === '700' && x[4] === 'rgb(149, 232, 134)'),
    JSON.stringify(ben)
  );
  ok(
    '底列：只有買得起的兩張寫「可升級」；買不起不寫「差 n」',
    JSON.stringify(cards.map(c => c[8])) === JSON.stringify(['可升級', '可升級', '', '', '']) &&
      !(await txt('.c12g')).includes('差'),
    JSON.stringify(cards.map(c => c[8]))
  );
  ok(
    '「建議」唯一一張＝鍛造台（實心印章）',
    cards.filter(c => c[9]).length === 1 &&
      cards[0][9] &&
      cards[0][10] &&
      (await E(() => document.querySelectorAll('.c12sg').length)) === 1
  );
  const st = await E(() =>
    [...document.querySelectorAll('#pcamp .c12s')].map(s => {
      const r = s.getBoundingClientRect(),
        c = s.closest('.c12c').getBoundingClientRect();
      return [r.x - c.x, r.y - c.y, r.width, r.height, s.className];
    })
  );
  ok(
    '印章 44×44 在卡內右上（卡左 +144、上 +10）；瞭望台實心但不是建議',
    st.length === 5 &&
      st.every(s => s[0] === 144 && s[1] === 10 && s[2] === 44 && s[3] === 44) &&
      /can/.test(st[1][4]) &&
      !/sug/.test(st[1][4]),
    JSON.stringify(st)
  );
  const foc = await E(() => [
    document.activeElement.closest('.c12c') && document.activeElement.closest('.c12c').id,
    getComputedStyle(document.activeElement).outlineWidth,
    $('c12key') && !$('c12key').hidden && $('c12key').textContent
  ]);
  ok(
    'H 開營地焦點在建議卡（外框 3 px）、鍵帽提示「Ⓐ 開詳細頁 Ⓧ 升級 Esc 關閉」',
    foc[0] === 'c12-forge' && foc[1] === '3px' && foc[2] === 'Ⓐ 開詳細頁Ⓧ 升級Esc 關閉',
    JSON.stringify(foc)
  );
  const kb = await box('#c12key');
  ok(
    '鍵帽提示 320×28、在面板左側戰場',
    !!kb && kb[2] === 320 && kb[3] === 28 && kb[0] + kb[2] <= 844,
    JSON.stringify(kb)
  );
  await shotKeep('camp-02-focus-card', [...C_MAIN, ['C15 鍵帽提示', '#c12key', [500, 366, 320, 28]]]);
  await p.mouse.move(2, 400);
  await E(() => document.activeElement.blur());
  await shot('camp-01-overview', C_MAIN);
  /* 懸停 0.4 秒：卡片次要句 */
  await p.mouse.move(900, 330);
  await p.waitForTimeout(250);
  const tip0 = await E(() => !!$('c12tip') && !$('c12tip').hidden);
  await p.waitForTimeout(300);
  const tip1 = await E(() => [
    $('c12tip') && !$('c12tip').hidden,
    $('c12tip').textContent,
    ...(r => [r.x, r.y, r.width].map(Math.round))($('c12tip').getBoundingClientRect())
  ]);
  ok(
    '鍛造台卡懸停：0.25 秒還沒出、0.55 秒出「鍛造台／第 5 格技能」，220 寬、右緣 832（面板左側戰場）',
    !tip0 && tip1[0] && tip1[1] === '鍛造台第 5 格技能' && tip1[4] === 220 && tip1[2] + tip1[4] === 832,
    JSON.stringify([tip0, tip1])
  );
  await shotKeep('camp-02b-hover-tip', [['C18 卡片懸停', '#c12tip', [612, 236, 220, 60]]]);
  /* 03：昇華石碑鎖住 */
  await p.mouse.move(1054, 188);
  await p.waitForTimeout(500);
  const lt = await E(() => ($('c12tip').hidden ? '' : $('c12tip').textContent));
  await p.mouse.click(1054, 188);
  await p.waitForTimeout(100);
  /* CP-02：點了也是營地內同一句提示條（280×36、400 16px、沒有標題、功能列下），不走戰場 #warn；CP-01：鎖住的字色是 --d2-tx-off */
  const lc = await E(() => {
    const t = $('c12tip'),
      r = t.getBoundingClientRect(),
      cs = getComputedStyle(t),
      k = Object.assign(document.createElement('i'), { style: 'color:var(--d2-tx-off)' });
    document.body.append(k);
    const off = getComputedStyle(k).color;
    k.remove();
    return [
      t.hidden ? '' : t.textContent,
      t.className,
      [r.x, r.y, r.width, r.height].map(Math.round),
      cs.fontSize + '/' + cs.fontWeight,
      !!t.querySelector('b'),
      getComputedStyle(document.querySelector('.c12fn .lock')).color === off
    ];
  });
  ok(
    '功能列昇華石碑鎖住（--tx-off、鎖）：懸停／點了都寫「升長老屋到 Lv 7 才開」（營地內提示條 560 起 280×36、16px／400、沒有標題；不走 #warn）',
    lt === '升長老屋到 Lv 7 才開' &&
      lc[0] === '升長老屋到 Lv 7 才開' &&
      lc[1] === 'lk' &&
      lc[2][0] === 560 &&
      lc[2][2] === 280 &&
      lc[2][3] === 36 &&
      lc[3] === '16px/400' &&
      !lc[4] &&
      lc[5] &&
      (await txt('#warn')) !== '升長老屋到 Lv 7 才開' &&
      (await E(() => document.querySelector('.c12fn .lock span').textContent)) === '昇華石碑',
    JSON.stringify([lt, lc, await txt('#warn')])
  );
  await shotKeep('camp-03-func-locked', C_MAIN);
  /* 04 鍛造台詳細 */
  const D_COM = [
    ['D01 返回', '.c12bk', [852, 76, 44, 44]],
    ['D03 換座 ‹', '[data-c12="nav:-1"]', [1172, 76, 44, 44]],
    ['D03 換座 ›', '[data-c12="nav:1"]', [1220, 76, 44, 44]],
    ['D04 頭部', '.c12top', [852, 128, 404, 52]],
    ['D08 解鎖一覽', '.c12cat', [1146, 186, 94, 24]],
    ['D09 升級鈕', '.c12up', [1092, 558, 164, 44]]
  ];
  await p.mouse.move(2, 400);
  await p.click('#c12-forge .c12b');
  await p.waitForTimeout(200);
  const d4 = await E(() => ({
    h: document.querySelector('.c12h.one').textContent,
    lv: document.querySelector('.c12top b').textContent,
    mx: document.querySelector('.c12top > small').textContent,
    sub: [...document.querySelectorAll('.c12sub b')].map(e => e.textContent),
    full: document.querySelector('.c12full').textContent,
    cmp: [...document.querySelectorAll('.c12cmp li')].map(li => [...li.children].map(c => c.textContent).join('|')),
    cost: [...document.querySelectorAll('.c12cost li')].map(
      li => li.className.trim() + ':' + li.querySelector('b').textContent + ' ' + li.querySelector('span').textContent
    ),
    up: document.querySelector('.c12up').textContent,
    sum: document.querySelector('.c12sum').textContent,
    cat: !!document.querySelector('.c12cat')
  }));
  ok(
    '鍛造台詳細：標題「鍛造台 1／5」、「Lv 15 → Lv 16」「最高 20」',
    d4.h.includes('鍛造台') && d4.h.includes('1／5') && d4.lv === 'Lv 15 → Lv 16' && d4.mx === '最高 20',
    JSON.stringify(d4)
  );
  ok(
    '升級後「一次打造 20 件；第 5 格技能」、右側「解鎖一覽 ›」；不畫下一級列',
    d4.sub[0] === '升級後' &&
      d4.full === '一次打造 20 件；第 5 格技能' &&
      d4.cat &&
      !(await txt('.c12d')).includes('下一級'),
    JSON.stringify(d4.sub)
  );
  ok(
    '前後對照：一次打造 10 件 → 20 件 ▲ +10；技能格 4 → 5 ▲ +1',
    JSON.stringify(d4.cmp) === JSON.stringify(['一次打造|10 件|→ 20 件|▲ +10', '技能格|4|→ 5|▲ +1']),
    JSON.stringify(d4.cmp)
  );
  ok(
    '費用列只寫現有／需要（≥10,000 寫 K）、滿的實心；不寫「夠」「差」',
    d4.cost.length >= 3 &&
      d4.cost.every(c => c.startsWith('full:')) &&
      /^full:靈魂 \d+\.\dK／25\.0K$/.test(d4.cost[0]) &&
      !/夠|差/.test(d4.cost.join()),
    JSON.stringify(d4.cost)
  );
  ok(
    '底列：「可升級」＋「▲ 升級」（買得起 --act）',
    d4.sum === '可升級' &&
      d4.up === '▲ 升級' &&
      (await E(() => document.querySelector('.c12up').classList.contains('ok')))
  );
  ok(
    '詳細頁返回 852,76、‹ › 1172／1220,76 44×44、升級鈕 1092,558 164×44',
    is(await box('.c12bk'), 852, 76, 44, 44) &&
      is(await box('[data-c12="nav:-1"]'), 1172, 76, 44, 44) &&
      is(await box('[data-c12="nav:1"]'), 1220, 76, 44, 44) &&
      is(await box('.c12up'), 1092, 558, 164, 44),
    JSON.stringify([await box('.c12bk'), await box('[data-c12="nav:1"]'), await box('.c12up')])
  );
  ok('第一座時 ‹ 停用（不循環）', await E(() => document.querySelector('[data-c12="nav:-1"]').disabled));
  await shot('camp-04-detail-forge', D_COM);
  /* 05 瞭望台（→ 換座），升級鈕焦點 */
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(150);
  const d5 = await E(() => [
    document.querySelector('.c12h.one b').textContent,
    document.querySelector('.c12full').textContent,
    document.querySelector('.c12sec').textContent,
    [...document.querySelectorAll('.c12cmp li')].map(li => [...li.children].map(c => c.textContent).join('|'))
  ]);
  const wn = await E(() => [wName(S, ...wXY(TRUNK_K[13])), wLv(...wXY(TRUNK_K[13]))]);
  ok(
    `→ 換到瞭望台：升級後「解鎖新地點 ${wn[0]}（怪物 Lv ${wn[1]}）」、次要鈕「開地點清單」、已開地點 13 → 14`,
    d5[0] === '瞭望台' &&
      d5[1] === `解鎖新地點 ${wn[0]}（怪物 Lv ${wn[1]}）` &&
      d5[2] === '開地點清單' &&
      d5[3][0] === '已開地點|13|→ 14|▲ +1',
    JSON.stringify(d5)
  );
  await E(() => document.querySelector('.c12up').focus());
  await shotKeep('camp-05-detail-watch', D_COM);
  /* 06 斥候營（買不起） */
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(150);
  const d6 = await E(() => [
    document.querySelector('.c12full').textContent,
    document.querySelector('.c12up').textContent,
    [...document.querySelectorAll('.c12cost li')].map(li => li.className.trim()),
    [...document.querySelectorAll('.c12cmp li')].map(li => [...li.children].map(c => c.textContent).join('|'))
  ]);
  ok(
    '斥候營：「可選 4★」、星級上限 3★ → 4★ ▲ +1★；買不起鈕第二行「差 n 靈魂」（--bad）、短的列斜線＋空心方',
    d6[0] === '可選 4★' &&
      /^升級差 [\d,.K]+ /.test(d6[1]) &&
      d6[2].includes('short') &&
      d6[3][0] === '星級上限|3★|→ 4★|▲ +1★',
    JSON.stringify(d6)
  );
  const sq = await E(() => {
    const li = document.querySelector('.c12cost li.short');
    return [
      getComputedStyle(li.querySelector('.c12bar i')).backgroundImage.includes('repeating-linear-gradient'),
      getComputedStyle(li.querySelector('.c12sq')).backgroundColor,
      getComputedStyle(document.querySelector('.c12up small')).color
    ];
  });
  ok(
    '不足＝45° 斜線（--bad）＋空心方；差 n 用 --bad',
    sq[0] && sq[1] === 'rgba(0, 0, 0, 0)' && sq[2] === 'rgb(255, 155, 186)',
    JSON.stringify(sq)
  );
  await shot('camp-06-detail-scout', D_COM);
  /* 07 長老屋 */
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(150);
  const d7 = await E(() => [
    document.querySelector('.c12full').textContent,
    document.querySelector('.c12sec').textContent,
    document.querySelector('.c12sec').getAttribute('aria-disabled'),
    [...document.querySelectorAll('.c12cmp li')].map(li => [...li.children].map(c => c.textContent).join('|'))
  ]);
  ok(
    '長老屋：「解鎖昇華石碑，先開兩個昇華」、次要鈕「昇華石碑（Lv 7 開）」鎖住、昇華石碑 未開 → 開 ▲ 開',
    d7[0] === '解鎖昇華石碑，先開兩個昇華' &&
      d7[1] === '昇華石碑（Lv 7 開）' &&
      d7[2] === 'true' &&
      d7[3][0] === '昇華石碑|未開|→ 開|▲ 開',
    JSON.stringify(d7)
  );
  await p.click('.c12sec', { force: true });
  await p.waitForTimeout(80);
  ok(
    '點鎖住的昇華石碑：營地內提示條「升長老屋到 Lv 7 才開」（同功能列那一顆）',
    (await E(() => (!$('c12tip').hidden && $('c12tip').className === 'lk' ? $('c12tip').textContent : ''))) ===
      '升長老屋到 Lv 7 才開',
    await E(() => $('c12tip').outerHTML)
  );
  await shot('camp-07-detail-elder', D_COM);
  /* 15 解鎖一覽 */
  await p.click('.c12cat');
  await p.waitForTimeout(150);
  const cat = await E(() => [
    document.querySelector('.c12ch b').textContent,
    [...document.querySelectorAll('.c12cw li')].map(
      li => li.className + '|' + [...li.children].map(c => c.textContent).join('|')
    ),
    (r => [r.x, r.y, r.width].map(Math.round))(document.querySelector('.c12cw').getBoundingClientRect())
  ]);
  const CAT = [
    '第 2 格技能',
    '每一招第 1 個輔助孔',
    '第 3 格技能',
    '天賦樹',
    '每一招第 2 個輔助孔；光環欄',
    '第 4 格技能',
    '昇華石碑，先開兩個昇華',
    '每一招第 3 個輔助孔',
    '每一招第 4 個輔助孔',
    '潮汐',
    '每一招第 5 個輔助孔'
  ];
  const SS = [
    'done|已解鎖',
    'done|已解鎖',
    'done|已解鎖',
    'done|已解鎖',
    'done|已解鎖',
    'cur|目前',
    'nx|下一級',
    'off|未解鎖',
    'off|未解鎖',
    'off|未解鎖',
    'off|未解鎖'
  ];
  ok(
    '解鎖一覽：窗標題「長老屋・解鎖一覽」、Lv 1–11 列文照規格（Lv 10＝潮汐）、列內不寫「解鎖」、狀態 已解鎖／目前／下一級／未解鎖',
    cat[0] === '長老屋・解鎖一覽' &&
      cat[1].length === 11 &&
      cat[1].every((r, i) => {
        const [c, lv, t, s] = r.split('|');
        return lv === `Lv ${i + 1}` && t === CAT[i] && `${c}|${s}` === SS[i] && !t.includes('解鎖');
      }),
    JSON.stringify(cat[1])
  );
  ok(
    '解鎖一覽小窗 472,88、368 寬（在戰場上）',
    cat[2][0] === 472 && cat[2][1] === 88 && cat[2][2] === 368,
    JSON.stringify(cat[2])
  );
  await shot('camp-15-unlock-catalog', [
    ...D_COM,
    ['D20 解鎖一覽小窗', '.c12cw', [472, 88, 368, 402]],
    ['D22 關閉', '.c12ch .x', [800, 89, 40, 40]]
  ]);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(100);
  ok(
    'Esc 先關解鎖一覽（還在長老屋詳細頁）',
    !(await E(() => !!document.querySelector('.c12cw'))) && (await E(() => CDR.one)) === 'altar'
  );
  /* 08 倉房 */
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(150);
  const d8 = await E(() => [
    document.querySelector('.c12full').textContent,
    document.querySelector('.c12sec').textContent,
    [...document.querySelectorAll('.c12cmp li')].map(li => [...li.children].map(c => c.textContent).join('|')),
    document.querySelector('[data-c12="nav:1"]').disabled
  ]);
  ok(
    '倉房：「離線收益最多 8 小時；珠寶分頁 42 格」、次要鈕「商會（Lv 4 開）」、離線收益 4 小時 → 8 小時 ▲ +4 小時、珠寶分頁 38 格 → 42 格 ▲ +4 格；最後一座 › 停用',
    d8[0] === '離線收益最多 8 小時；珠寶分頁 42 格' &&
      d8[1] === '商會（Lv 4 開）' &&
      JSON.stringify(d8[2]) ===
        JSON.stringify(['離線收益|4 小時|→ 8 小時|▲ +4 小時', '珠寶分頁|38 格|→ 42 格|▲ +4 格']) &&
      d8[3],
    JSON.stringify(d8)
  );
  await shot('camp-08-detail-store', D_COM);
  /* 12 倉房名詞提示 */
  await p.mouse.move(915, 98);
  await p.waitForTimeout(550);
  const nt = await E(() => [
    $('c12tip').hidden,
    $('c12tip').querySelector('b').textContent,
    $('c12tip').querySelector('p').textContent,
    $('c12tip').getBoundingClientRect().width
  ]);
  ok(
    '倉房名詞提示（停留 0.4 秒）：44 字定案句、句末不加句號、320 寬、在左側戰場 500,205',
    !nt[0] &&
      nt[1] === '倉房' &&
      nt[2] === '延長離線收益時數、提高分解回收，珠寶分頁每級多 4 格；Lv 4 開商會。跟「倉庫」不同' &&
      nt[3] === 320 &&
      is(await box('#c12tip'), 500, 205, 320, (await box('#c12tip'))[3]),
    JSON.stringify([nt, await box('#c12tip')])
  );
  await shotKeep('camp-12-noun-tip', [...D_COM, ['D18 名詞提示', '#c12tip', [500, 205, 320, 110]]]);
  /* 09 買不起（瞭望台木不夠） */
  await p.mouse.move(2, 400);
  await E(() => {
    const n = campNext('watch');
    matAdd('wood', 0, -(matN('wood') - (n.wood - 530)));
    CDR.one = 'watch';
    campDrawer(1);
  });
  await p.waitForTimeout(100);
  const d9 = await txt('.c12up');
  ok('買不起（木不夠）：鈕「升級／差 530 木」', d9 === '升級差 530 木', d9);
  await shot('camp-09-cant-afford', D_COM);
  /* 11 toast：按買不起的升級＝抖、缺的那列 ⚠ 閃一次、toast 底列左側 860,560 220×40（不蓋費用列、不蓋鈕），2,000 ms 後消失 */
  await p.click('.c12up');
  await p.waitForTimeout(100);
  const t11 = await E(() => {
    const t = document.querySelector('.c12sum'),
      r = t.getBoundingClientRect(),
      u = document.querySelector('.c12up').getBoundingClientRect(),
      L = [...document.querySelectorAll('.c12cost li')].map(li => li.getBoundingClientRect());
    return [
      t.classList.contains('toast'),
      t.textContent,
      [r.x, r.y, r.width, r.height].map(Math.round),
      r.right <= u.left,
      L.every(l => l.bottom <= r.top || l.top >= r.bottom),
      !!document.querySelector('.c12cost li.flash')
    ];
  });
  ok(
    '買不起按升級：toast「約 n 分／差 n 木」在 860,560 220×40、升級鈕左側、不蓋費用列；缺的那列閃一次',
    t11[0] &&
      /^(約 \d+( 時( \d+ 分)?| 分)|差 530 木)$/.test(t11[1]) &&
      is(t11[2], 860, 560, 220, 40) &&
      t11[3] &&
      t11[4] &&
      t11[5],
    JSON.stringify(t11)
  );
  ok(
    '買不起按升級不出確認框、不升級',
    (await E(() => S.camp.watch)) === 12 && !(await E(() => !!document.querySelector('[role=alertdialog]')))
  );
  await shotKeep('camp-11-toast', [...D_COM, ['D16 toast', '.c12sum.toast', [860, 560, 220, 40]]]);
  await p.waitForTimeout(2100);
  ok('toast 2,000 ms 後消失', !(await E(() => document.querySelector('.c12sum').classList.contains('toast'))));
  /* 10 滿級（斥候營 Lv 4） */
  await E(() => {
    S.camp.scout = 4;
    CDR.one = 'scout';
    campDrawer(1);
  });
  await p.waitForTimeout(100);
  const d10 = await E(() => [
    document.querySelector('.c12top b').textContent,
    document.querySelector('.c12sub b').textContent,
    document.querySelector('.c12full').textContent,
    document.querySelector('.c12up').textContent,
    document.querySelector('.c12up').disabled,
    !!document.querySelector('.c12cat'),
    getComputedStyle(document.querySelector('.c12up')).fontWeight,
    [...document.querySelectorAll('.c12h.one .x')].map(x => getComputedStyle(x).font.match(/\d+ \d+px/)[0]).join()
  ]);
  ok(
    '滿級（斥候營 Lv 4）：「Lv 4（滿級）」、小標「目前」「可選 5★」、底列「滿級」不可按、700（CP-05）；不畫解鎖一覽（CP-04）；← ‹ › 700 16px（CP-08）',
    JSON.stringify(d10) ===
      JSON.stringify(['Lv 4（滿級）', '目前', '可選 5★', '滿級', true, false, '700', '700 16px,700 16px,700 16px']),
    JSON.stringify(d10)
  );
  await shot('camp-10-max-level', D_COM);
  /* Esc 退一層、選中原卡 */
  await E(() => {
    S.camp.scout = 2;
    CDR.one = 'scout';
    C12.last = 'scout';
    campDrawer(1);
    document.querySelector('.c12bk').focus();
  });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(100);
  ok(
    'Esc 從詳細頁退回卡片格（面板還開著），焦點回到原本那張（斥候營，CP-06）',
    await E(
      () =>
        PANEL.camp &&
        !CDR.one &&
        !!document.querySelector('.c12g') &&
        document.activeElement === document.querySelector('#c12-scout .c12b')
    )
  );
  /* 升級：X 鍵在鍛造台卡上 */
  await E(MID);
  await E(() => {
    CDR.one = null;
    campDrawer(1);
    document.querySelector('#c12-forge .c12b').focus();
  });
  await p.keyboard.press('x');
  await p.waitForTimeout(150);
  ok('焦點在鍛造台卡按 X＝升級（Lv 15 → 16）', (await E(() => S.camp.forge)) === 16);
  await p.waitForTimeout(350);
  await E(() => {
    MAT().soul += 1e6;
    for (const [, h, w, key] of costRows(campNext('watch')))
      if (h < w && key !== 'soul')
        key === 'gold' ? (S.gold += w) : key.startsWith('cur:') ? (MAT()[key.slice(4)] += w) : matAdd(...matOf(key), w);
    campDrawer(1);
  });
  await p.click('#c12-watch .stamp');
  await p.waitForTimeout(150);
  ok('點瞭望台印章直接升級（不出確認框）', (await E(() => S.camp.watch)) === 13);
  /* 13 追逐訊號（營地開著、卡片同 01） */
  await E(MID);
  await E(() => {
    chaseSeen().on = 1;
    campDrawer(1);
  });
  await shot('camp-13-signal-chase', C_MAIN);
  /* 14 開局 */
  await E(() => {
    Object.assign(S.camp, { forge: 0, watch: 0, scout: 0, altar: 0, store: 0 });
    const M = MAT();
    for (const k in M) if (typeof M[k] === 'number') M[k] = 0;
    CDR.one = null;
    changed();
    campDrawer(1);
  });
  await p.waitForTimeout(100);
  const e14 = await E(() => [
    document.querySelector('.c12h > span').textContent,
    document.querySelector('.c12goal').textContent,
    [...document.querySelectorAll('.c12ben')].map(e => e.textContent),
    document.querySelectorAll('.c12sg').length,
    document.querySelectorAll('.c12st').length
  ]);
  const w1 = await E(() => wName(S, ...wXY(TRUNK_K[1])));
  ok(
    `開局：可升級 0、無建議、利益行 解鎖：「填」／解鎖：${w1}／可選 2★／解鎖：第 2 格技能／離線收益最多 4 小時`,
    e14[0] === '可升級 0' &&
      e14[3] === 0 &&
      e14[4] === 0 &&
      JSON.stringify(e14[2]) ===
        JSON.stringify(['解鎖：「填」', `解鎖：${w1}`, '可選 2★', '解鎖：第 2 格技能', '離線收益最多 4 小時']),
    JSON.stringify(e14)
  );
  ok('開局下一個目標「下一個目標：鍛造台 Lv 1」或另一座 Lv 1', /^下一個目標：.+ Lv 1$/.test(e14[1]), e14[1]);
  await shot('camp-14-early', C_MAIN);
  /* 開局倉房懸停：珠寶分頁 34 格（不進卡片利益行） */
  await p.mouse.move(900, 560);
  await p.waitForTimeout(550);
  ok(
    '開局倉房卡懸停「珠寶分頁 34 格」',
    (await E(() => !$('c12tip').hidden && $('c12tip').textContent)) === '倉房珠寶分頁 34 格',
    await E(() => $('c12tip').textContent)
  );
  await p.mouse.move(2, 400);
  const campTxt = await E(() => $('pcamp').innerText);
  ok(
    '營地畫面沒有禁用字（法力、MP、ms、輪、祭壇、打包、夠、民房、產生器…）',
    !BAN.test(campTxt),
    (campTxt.match(BAN) || [''])[0]
  );
  ok(
    '營地沒有寫死色碼：camp12.js 沒有 #hex／rgb(',
    !/#(?:[0-9a-fA-F]{3}){1,2}(?![\w-])|rgba?\(/.test(
      fs.readFileSync(path.join(__dirname, '..', 'js', 'camp12.js'), 'utf8')
    )
  );
  await p.keyboard.press('Escape');
  await p.waitForTimeout(100);
  ok('Esc 關營地', !(await E(() => PANEL.camp)));
  /* mumi 2026-11-25：產生器經濟收掉。分頁小點（campReady）只算五座：舊存檔殘留的 gen／house、木一大堆也不算 */
  const rd0 = await E(() => {
    S.camp = { ...S.camp, house: 0, gen: { wood: { lv: 1 }, iron: { lv: 1 }, hide: { lv: 1 }, silk: { lv: 1 } } };
    const M = MAT();
    for (const k in M) if (typeof M[k] === 'number') M[k] = 0;
    S.gold = 0;
    M.mats = { wood: 1e6, 'iron:1': 1e5, 'hide:1': 1e5, 'silk:1': 1e5 };
    changed();
    hudPanels();
    const dot = document.querySelector('[data-tm="nav:craft"] .dot');
    return [campReady(), dot ? dot.textContent : null];
  });
  ok(
    '分頁小點：五座都買不起（只有木與材料，靈魂 0）＝campReady 0、營地分頁沒有小點（舊存檔殘留 gen／house 不算）',
    rd0[0] === 0 && rd0[1] === null,
    JSON.stringify(rd0)
  );
  await E(MID);
  const rd1 = await E(() => {
    S.camp = { ...S.camp, house: 0, gen: { wood: { lv: 1 }, iron: { lv: 1 } } };
    hudPanels();
    const dot = document.querySelector('[data-tm="nav:craft"] .dot');
    return [campReady(), dot ? dot.textContent : null];
  });
  await p.keyboard.press('h');
  await p.waitForTimeout(300);
  const rdH = await txt('#pcamp .c12h > span');
  ok(
    `分頁小點＝面板「可升級 {n}」＝campReady：鍛造台、瞭望台買得起＝2（${rd1[1]}／${rdH}）`,
    rd1[0] === 2 && rd1[1] === '2' && rdH === '可升級 2',
    JSON.stringify([rd1, rdH])
  );
  await p.keyboard.press('Escape');
  await p.waitForTimeout(100);
  /* 沒有背景生產：刷圖中主迴圈跑 3 秒、切走分頁 2 小時再回來（離線結算），木與材料都不會自己變多 */
  const mm0 = await E(() => {
    S.auto = 0;
    G.mobs.length = 0;
    return JSON.stringify(MAT().mats);
  });
  await p.waitForTimeout(3000);
  const mm1 = await E(() => JSON.stringify(MAT().mats));
  const mm2 = await E(() => {
    HIDE_AT = Date.now() - 2 * 3600e3;
    document.dispatchEvent(new Event('visibilitychange'));
    return JSON.stringify(MAT().mats);
  });
  ok(
    '沒有背景生產：刷圖中 3 秒、離開 2 小時回來，木與材料都沒變（舊存檔殘留 gen 也不產）',
    mm0 === mm1 && mm0 === mm2,
    JSON.stringify([mm0, mm1, mm2])
  );
  await E(() => !$('poff').hidden && act('offok'));
  /* 手把（假的標準配置手把）：Ⓐ 開詳細頁、十字鍵右換座、Ⓑ 退回卡片格 */
  await E(() => {
    window.__pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0, 0, 0] };
    navigator.getGamepads = () => [window.__pad];
    dispatchEvent(new Event('gamepadconnected'));
  });
  const pad = async i => {
    await E(i => (window.__pad.buttons[i].pressed = true), i);
    await p.waitForTimeout(80);
    await E(i => (window.__pad.buttons[i].pressed = false), i);
    await p.waitForTimeout(80);
  };
  await p.keyboard.press('h');
  await p.waitForTimeout(300);
  await E(() => document.querySelector('#c12-forge .c12b').focus());
  await pad(0);
  const pa = await E(() => CDR.one);
  await pad(15);
  const pr = await E(() => CDR.one);
  await pad(1);
  const pb = await E(() => [CDR.one, PANEL.camp]);
  ok(
    '手把：Ⓐ 開鍛造台詳細頁、十字鍵右換瞭望台、Ⓑ 退回卡片格',
    pa === 'forge' && pr === 'watch' && pb[0] === null && pb[1],
    JSON.stringify([pa, pr, pb])
  );
  await p.keyboard.press('Escape');
  await p.waitForTimeout(100);
  /* ======================= 倉庫 ======================= */
  /* 示意圖那一套：142 件（武器 18 件中有 2 件火焰詞、防具 22 件）、珠寶 12 顆（2 顆鑲著）、鎮嶽印 ×2、赤霄印拿過（0） */
  const STASH = n =>
    E(n => {
      S.inv.items.length = 0;
      const W = BASES.filter(b => b.k === 'weapon' && b.lv <= 40),
        A = BASES.filter(b => ['helm', 'chest', 'gloves', 'boots', 'shield'].includes(b.k) && b.lv <= 40),
        O = BASES.filter(b => ['ring', 'amulet', 'belt'].includes(b.k) && b.lv <= 40);
      for (let i = 0; i < n; i++) {
        const L = i % 7 === 0 ? W : i % 7 < 4 ? A : O,
          it = mkItem(
            L[(i * 5) % L.length].id,
            12 + (i % 40),
            [0, 1, 2, 2, 1, 0, 3][i % 7] === 3 ? 2 : [0, 1, 2, 2, 1, 0, 1][i % 7]
          );
        if (i % 9 === 0) it.lock = 1;
        S.inv.items.push(it);
      }
      INV_ID = Math.max(...S.inv.items.map(x => x.id), 0) + 1;
      changed();
    }, n);
  await E(() => {
    S.jewels = [];
    for (let i = 0; i < 12; i++) jwAdd(1 + (i % 3 === 0 ? 1 : 0));
    S.jsock = [S.jewels[0].id, S.jewels[3].id];
    S.frags = { ...newFrags(), ...S.frags, wangyin_zhenyue: 2, wangyin_chixiao: 0 };
    chaseOf().got = { wangyin_zhenyue: 2, wangyin_chixiao: 1 };
    chaseOf().pts = 185;
    chaseSeen().on = 1;
    S.camp.store = 0;
    const M = MAT();
    Object.assign(M, { tran: 240, aug: 88, rich: 12, exalt: 4, calam: 1, om_joy: 2, heart: 1 });
  });
  await STASH(142);
  await p.keyboard.press('l');
  await p.waitForTimeout(400);
  const S_SRCH = ['S15 搜尋＋件數', '.sts', [1008, 152, 84, 32]];
  const S_COM = [
    ['S11 面板', '#pinv', [788, 76, 476, 486]],
    ['S11 標題「倉庫」', '.stt', [796, 84, 48, 20]],
    ['S12 容量', '.stn', [846, 84, 200, 20]],
    ['S18 排序', '.stb.sort', [942, 78, 76, 32]],
    ['S19 ▲ 優先', '.stb.upf', [1022, 78, 64, 32]],
    ['S13 整批分解', '.stb.bat', [1092, 78, 108, 32]],
    ['S14 關閉', '.stx', [1228, 78, 32, 32]],
    ['S15 內分頁「裝備」', '.sttab .eq', [796, 116, 72, 32]],
    ['S16 內分頁「珠寶」', '.sttab .jw', [868, 116, 72, 32]],
    ['S17 大類「全部」', '.stf button:nth-child(1)', [796, 152, 48, 32]],
    ['S15 搜尋', '.sts', [1008, 152, 140, 32]],
    ['S20 第 1 格', '[data-sg] > :nth-child(1)', [804, 188, 64, 64]],
    ['S21 第 3 格', '[data-sg] > :nth-child(3)', [948, 188, 64, 64]],
    ['S20 第 25 格', '[data-sg] > :nth-child(25)', [1092, 476, 64, 64]],
    ['S22 往下還有', '.stmore', [804, 544, 200, 14]]
  ];
  ok(
    'L 開倉庫：#pinv.st12 右欄 788,76 476×486',
    is(await box('#pinv'), 788, 76, 476, 486) && (await E(() => $('pinv').classList.contains('st12'))),
    JSON.stringify(await box('#pinv'))
  );
  ok(
    '標題「倉庫」、容量「142／300」（未滿 90% 普通字色）',
    (await txt('.stt')) === '倉庫' &&
      (await txt('.stn')) === '142／300' &&
      !(await E(() => document.querySelector('.stn').classList.contains('bad')))
  );
  ok(
    '標題列：排序「新到舊 ▾」942,78 76×32、「▲ 優先」1022,78 64×32、「整批分解」1092,78 108×32、× 1228,78 32×32',
    (await txt('.stb.sort')) === '新到舊 ▾' &&
      (await txt('.stb.upf')) === '▲ 優先' &&
      (await txt('.stb.bat')) === '整批分解' &&
      is(await box('.stb.sort'), 942, 78, 76, 32) &&
      is(await box('.stb.upf'), 1022, 78, 64, 32) &&
      is(await box('.stb.bat'), 1092, 78, 108, 32) &&
      is(await box('.stx'), 1228, 78, 32, 32),
    JSON.stringify([await box('.stb.sort'), await box('.stb.upf'), await box('.stb.bat'), await box('.stx')])
  );
  ok(
    '內分頁 裝備｜珠寶｜通貨｜特殊物品（裝備選中）；裝備 796,116、珠寶 868,116',
    JSON.stringify(await all('.sttab button')) === JSON.stringify(['裝備', '珠寶', '通貨', '特殊物品']) &&
      (await E(() => document.querySelector('.sttab .eq').classList.contains('on'))) &&
      (await box('.sttab .eq'))[0] === 796 &&
      (await box('.sttab .eq'))[1] === 116 &&
      (await box('.sttab .jw'))[0] === 868,
    JSON.stringify([await box('.sttab .eq'), await box('.sttab .jw')])
  );
  const f1 = await E(() =>
    [...document.querySelectorAll('.stf button')].map(b => {
      const r = b.getBoundingClientRect();
      return [b.textContent, Math.round(r.x), Math.round(r.y), r.width, r.height];
    })
  );
  ok(
    '第一層 全部／武器／防具／飾品（不放護符）48×32、y 152；搜尋「名稱或詞綴」同列、右緣止於 1148',
    JSON.stringify(f1.map(f => f[0])) === JSON.stringify(['全部', '武器', '防具', '飾品']) &&
      f1.every(f => f[2] === 152 && f[3] === 48 && f[4] === 32) &&
      f1[0][1] === 796 &&
      (await E(() => document.querySelector('.sts').placeholder)) === '名稱或詞綴' &&
      (b => b[0] + b[2])(await box('.sts')) === 1148,
    JSON.stringify(f1)
  );
  const g1 = await E(() =>
    [...document.querySelectorAll('[data-sg] > .cq')].slice(0, 26).map(c => {
      const r = c.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y), r.width, r.height];
    })
  );
  ok(
    '格子 64×64、5 欄、間距 8、第 1 格 804,188；第 5 格右緣 1156；一屏 5 列 25 格',
    g1[0][0] === 804 &&
      g1[0][1] === 188 &&
      g1[4][0] + 64 === 1156 &&
      g1[5][1] === 260 &&
      g1.slice(0, 25).every(g => g[2] === 64 && g[3] === 64),
    JSON.stringify(g1.slice(0, 6))
  );
  ok(
    '「往下還有 117 件」804,544',
    (await txt('.stmore')) === '往下還有 117 件' &&
      (await box('.stmore'))[0] === 804 &&
      (await box('.stmore'))[1] === 544,
    JSON.stringify([await txt('.stmore'), await box('.stmore')])
  );
  ok('大類「全部」不出右欄（預留帶維持底板）', !(await E(() => !!document.querySelector('.stcol'))));
  await shot('stash-01-default', S_COM);
  /* 02 焦點在一格裝備上 */
  await E(() => document.querySelector('[data-sg] > :nth-child(3)').focus());
  await shotKeep('stash-02-focus', S_COM);
  await E(() => document.activeElement.blur());
  /* 06 武器＋右欄 */
  const x0 = (await box('[data-sg] > :nth-child(1)'))[0];
  await p.click('.stf button:nth-child(2)');
  await p.waitForTimeout(150);
  const col = await E(() => {
    const c = document.querySelector('.stcol'),
      r = c.getBoundingClientRect(),
      rows = [...c.querySelectorAll('.sub')].map(s => {
        const q = s.getBoundingClientRect();
        return [s.textContent, Math.round(q.y), q.width, q.height, getComputedStyle(s).fontSize];
      }),
      f = c.querySelector('.stcf').getBoundingClientRect();
    return {
      r: [r.x, r.y, r.width, r.height].map(Math.round),
      hd: c.querySelector('.stch').textContent,
      rows,
      f: [f.x, f.y, f.width, f.height].map(Math.round),
      rar: [...c.querySelectorAll('.stcf button')].map(b => [
        b.textContent,
        b.getBoundingClientRect().width,
        b.getBoundingClientRect().height
      ]),
      lv: c.querySelector('.stcf small').textContent
    };
  });
  ok(
    '大類「武器」：右欄 1156,116 100×438；欄名「武器」同行「方向右 進入」',
    is(col.r, 1156, 116, 100, 438) && col.hd === '武器方向右 進入',
    JSON.stringify([col.r, col.hd])
  );
  ok(
    '右欄 15 筆（全部武器＋14 種）一次列完、不捲：列 100×24、間距 2、字 12px',
    col.rows.length === 15 &&
      col.rows[0][0] === '全部武器' &&
      JSON.stringify(col.rows.slice(1).map(r => r[0])) ===
        JSON.stringify([
          '劍',
          '斧',
          '錘',
          '細杖',
          '長矛',
          '弓',
          '十字弓',
          '匕首',
          '爪',
          '長杖',
          '法杖',
          '權杖',
          '陷阱器',
          '魔符'
        ]) &&
      col.rows.every((r, i) => r[2] === 100 && r[3] === 24 && r[4] === '12px' && r[1] === 132 + 26 * i) &&
      col.rows[14][1] + 24 <= 520,
    JSON.stringify(col.rows)
  );
  ok(
    '稀有度腳 1156,520 100×34：普通／魔法／稀有／傳奇 23×16、「物品等級 a–b」（不寫 ilvl）',
    is(col.f, 1156, 520, 100, 34) &&
      JSON.stringify(col.rar) ===
        JSON.stringify([
          ['普通', 23, 16],
          ['魔法', 23, 16],
          ['稀有', 23, 16],
          ['傳奇', 23, 16]
        ]) &&
      /^物品等級 \d+–\d+$/.test(col.lv),
    JSON.stringify([col.f, col.rar, col.lv])
  );
  ok(
    '右欄出現時格子不移動、不縮放（第 1 格 x 不變、64×64）',
    (await box('[data-sg] > :nth-child(1)'))[0] === x0 && (await box('[data-sg] > :nth-child(1)'))[2] === 64
  );
  const wc = await E(() => S.inv.items.filter(it => !it.charm && bagGrp(it) === 'weapon').length);
  ok(
    `搜尋列右邊件數「${wc} 件」（有篩選才顯示）、搜尋縮成 84 寬`,
    (await txt('#pinv .stcnt')) === `${wc} 件` &&
      (await box('.sts'))[2] === 84 &&
      is(await box('#pinv .stcnt'), 1096, 152, 52, 32),
    JSON.stringify([await txt('#pinv .stcnt'), await box('.sts'), await box('#pinv .stcnt')])
  );
  /* 鍵盤：格子右緣按方向右進右欄、上下選、Enter 選取、Esc 回格子 */
  await E(() => document.querySelector('[data-sg] > :nth-child(5)').focus());
  await p.keyboard.press('ArrowRight');
  const inCol = await E(() => document.activeElement.textContent);
  await p.keyboard.press('ArrowDown');
  const sw = await E(() => document.activeElement.textContent);
  ok('格子右緣按 → 進右欄（全部武器），↓ 到「劍」', inCol === '全部武器' && sw === '劍', JSON.stringify([inCol, sw]));
  await shotKeep('stash-06-weapons', [
    ...S_COM.slice(0, 10),
    S_SRCH,
    ['S12 右欄「武器」', '.stcol', [1156, 116, 100, 438]],
    ['S13 全部武器', '.stcol .sub', [1156, 132, 100, 24]],
    ['S14 稀有度與物品等級', '.stcf', [1156, 520, 100, 34]]
  ]);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(100);
  const sword = await E(() => [
    ST12.k,
    [...document.querySelectorAll('[data-sg] > .cq')].length,
    S.inv.items.filter(it => !it.charm && bagSub(it) === 'sword').length
  ]);
  ok('Enter 選「劍」：只列劍', sword[0] === 'sword' && sword[1] === sword[2], JSON.stringify(sword));
  await E(() => document.querySelector('.stcol .sub.on').focus());
  await p.keyboard.press('Escape');
  ok(
    'Esc 從右欄回到格子',
    await E(() => !!document.activeElement.closest('[data-sg]') || !document.querySelector('[data-sg] > .cq'))
  );
  /* 稀有度多選 */
  await E(() => (ST12.k = ''));
  await p.click('.stcf .r0');
  await p.waitForTimeout(80);
  ok(
    '稀有度腳多選：關掉普通＝格子沒有普通',
    await E(() => ST12.rar[0] === 0 && !document.querySelector('[data-sg] .cq.r0'))
  );
  await p.click('.stcf .r0');
  /* Q／E 切大類 */
  await E(() => document.querySelector('[data-sg] > .cq').focus());
  await p.keyboard.press('e');
  await p.waitForTimeout(80);
  ok('鍵盤 E 切到下一個大類（防具）', (await E(() => ST12.f)) === 'armor');
  /* 19 防具、胸甲選中 */
  await p.click('[data-st="k:chest"]');
  await p.waitForTimeout(100);
  const ar = await E(() => [
    [...document.querySelectorAll('.stcol .sub')].map(s => s.textContent),
    document.querySelector('.stcol .sub.on').textContent,
    !!document.querySelector('.stcf')
  ]);
  ok(
    '大類「防具」：右欄 8 筆（全部防具、頭部、胸甲、手套、鞋子、盾、法器、箭袋），「胸甲」選中；沒有稀有度腳',
    JSON.stringify(ar[0]) === JSON.stringify(['全部防具', '頭部', '胸甲', '手套', '鞋子', '盾', '法器', '箭袋']) &&
      ar[1] === '胸甲' &&
      !ar[2],
    JSON.stringify(ar)
  );
  await shot('stash-19-armor', [...S_COM.slice(0, 10), S_SRCH, ['S12 右欄「防具」', '.stcol', [1156, 116, 100, 438]]]);
  /* 20 搜尋「火焰」、21 搜「細杖」沒有符合 */
  await p.click('.stf button:nth-child(1)');
  await p.fill('.sts', '火焰');
  await p.waitForTimeout(150);
  const fire = await E(() => [
    S.inv.items.filter(it => stHit(it, '火焰')).length,
    document.querySelectorAll('[data-sg] > .cq.hit').length,
    document.querySelector('#pinv .stcnt').textContent,
    document.activeElement.classList.contains('sts'),
    document.querySelectorAll('[data-sg] > .cq').length,
    stList().length,
    document.querySelectorAll('[data-sg] > .cq.dim:not(.hit)').length
  ]);
  ok(
    '搜尋「火焰」（名稱或詞綴）：件數「n 件」、命中的加框、其餘變淡留在原位（ST-11）、打字時焦點留在搜尋框',
    fire[0] === fire[1] &&
      fire[2] === `${fire[0]} 件` &&
      fire[3] &&
      fire[4] === fire[5] &&
      fire[6] === fire[4] - fire[1],
    JSON.stringify(fire)
  );
  await shot('stash-20-search', [...S_COM.slice(0, 10), S_SRCH]);
  await p.fill('.sts', '細杖');
  await E(() => {
    ST12.f = 'all';
    hudPanels();
  });
  await p.waitForTimeout(150);
  const nm = await E(() => [
    document.querySelector('.ste') && document.querySelector('.ste').textContent,
    document.querySelector('#pinv .stcnt').textContent
  ]);
  ok('搜「細杖」：「沒有符合的裝備」「0 件」', nm[0] === '沒有符合的裝備' && nm[1] === '0 件', JSON.stringify(nm));
  await shot('stash-21-nomatch', [...S_COM.slice(0, 10), S_SRCH]);
  await p.fill('.sts', '');
  await p.waitForTimeout(100);
  /* 07／08 比較浮窗：懸停立即、按住 Alt 詳細 */
  const c16 = await box(
    `[data-sg] > :nth-child(${await E(() => stList().findIndex((it, i) => i >= 15 && it.a && it.a.length) + 1)})`
  );
  await p.mouse.move(c16[0] + 30, c16[1] + 30);
  await p.waitForTimeout(60);
  const cp = await E(() => {
    const o = document.querySelector('.stp');
    if (!o) return null;
    const r = o.getBoundingClientRect();
    return [
      Math.round(r.x),
      Math.round(r.y),
      r.width,
      o.querySelector('.stpc').textContent.includes('身上'),
      o.querySelector('.stpc').textContent.includes('這件'),
      o.querySelector('.stph').textContent,
      [...o.querySelectorAll('.stpa button')].map(b => b.firstChild.textContent)
    ];
  });
  ok(
    '懸停一格：比較浮窗立即出現（≤60 ms）、796 起 460 寬、左「身上」右「這件」、分解／鎖定／裝備',
    !!cp &&
      cp[0] === 796 &&
      cp[2] === 460 &&
      cp[3] &&
      cp[4] &&
      JSON.stringify(cp[6]) === JSON.stringify(['分解', cp[6][1], '裝備']) &&
      /^(鎖定|解鎖)$/.test(cp[6][1]),
    JSON.stringify(cp)
  );
  ok(
    '浮窗提示句：「懸停立即出現。按住 Alt／手把 Ｙ 看詳細。名詞提示要停留 0.4 秒或按 R3，與本窗分開。」',
    !!cp && cp[5] === '懸停立即出現。按住 Alt／手把 Ｙ 看詳細。名詞提示要停留 0.4 秒或按 R3，與本窗分開。',
    cp && cp[5]
  );
  ok(
    '浮窗不蓋住懸停的那一格',
    await E(() => {
      const o = document.querySelector('.stp').getBoundingClientRect(),
        c = document.querySelector(`[data-st="it:${ST12.hov}"]`).getBoundingClientRect();
      return o.bottom <= c.top || o.top >= c.bottom;
    })
  );
  await shotKeep('stash-07-compare', [['S11 比較浮窗', '.stp', [796, 118, 460, 230]]]);
  await p.keyboard.down('Alt');
  await p.waitForTimeout(60);
  const det = await E(() => [
    document.querySelector('.stp').classList.contains('det'),
    document.querySelector('.stph').textContent,
    !!document.querySelector('.stp .tr'),
    [...document.querySelectorAll('.stpc > div:last-child li')].slice(-2).map(l => l.textContent)
  ]);
  ok(
    '按住 Alt：詳細（T 階、原值），提示改「放開 Alt／手把 Ｙ 回到簡易。」；最後兩列「前綴空位 n」「後綴空位 n」（ST-28）',
    det[0] &&
      det[1] === '放開 Alt／手把 Ｙ 回到簡易。' &&
      det[2] &&
      /^前綴空位\d$/.test(det[3][0]) &&
      /^後綴空位\d$/.test(det[3][1]),
    JSON.stringify(det)
  );
  await shotKeep('stash-08-compare-detail', [['S11 比較浮窗', '.stp', [796, 118, 460, 300]]]);
  await p.keyboard.up('Alt');
  await p.waitForTimeout(60);
  ok('放開 Alt 回到簡易', !(await E(() => document.querySelector('.stp').classList.contains('det'))));
  await p.mouse.move(2, 400);
  await p.waitForTimeout(80);
  ok('滑鼠離開面板：浮窗收掉', !(await E(() => !!document.querySelector('.stp'))));
  /* 18 名詞提示「倉庫」 */
  await p.mouse.move(815, 94);
  await p.waitForTimeout(250);
  const n0 = await E(() => !!$('c12tip') && !$('c12tip').hidden);
  await p.waitForTimeout(300);
  const n1 = await E(() => [
    !$('c12tip').hidden,
    $('c12tip').querySelector('b').textContent,
    $('c12tip').querySelector('p').textContent,
    (r => [r.x, r.width].map(Math.round))($('c12tip').getBoundingClientRect())
  ]);
  ok(
    '名詞提示「倉庫」停留 0.4 秒才出（0.25 秒還沒有）：「放裝備和珠寶，也能查看通貨、追逐物品和首領碎片」，在面板裡 796,118 起 460 寬',
    !n0 &&
      n1[0] &&
      n1[1] === '倉庫' &&
      n1[2] === '放裝備和珠寶，也能查看通貨、追逐物品和首領碎片' &&
      n1[3][0] === 796 &&
      n1[3][1] === 460 &&
      (await box('#c12tip'))[1] === 118,
    JSON.stringify([n0, n1, await box('#c12tip')])
  );
  await shotKeep('stash-18-noun-tip', [['S12 名詞提示', '#c12tip', [796, 118, 460, 100]]]);
  await p.mouse.move(2, 400);
  /* 09 整批分解 */
  await p.click('.stb.bat');
  await p.waitForTimeout(100);
  ok(
    '整批分解：標題「整批分解・已選 0 件」、快速選 普通／魔法／稀有／全不選、取消、分解 0 件（停用）',
    (await txt('.stt')) === '整批分解・已選 0 件' &&
      JSON.stringify(await all('.stqs button')) === JSON.stringify(['普通', '魔法', '稀有', '全不選']) &&
      (await txt('.stcan')) === '取消' &&
      (await txt('.stgo')) === '分解 0 件' &&
      (await E(() => document.querySelector('.stgo').disabled))
  );
  await p.click('[data-st="qs:0"]');
  await p.click('[data-st="qs:1"]');
  await p.waitForTimeout(80);
  const bt = await E(() => [
    ST12.bat.size,
    S.inv.items.filter(it => !it.lock && it.r < 2).length,
    document.querySelector('.stt').textContent,
    document.querySelector('.stgo').textContent,
    [...document.querySelectorAll('[data-sg] .cq.dim')].every(c => !c.querySelector('.stck')),
    document.querySelectorAll('[data-sg] .cq.dim').length
  ]);
  ok(
    '快速選普通＋魔法：選沒鎖的全部；鎖住的淡 38%、沒有勾選框；n 同步到標題與主鈕',
    bt[0] === bt[1] && bt[2] === `整批分解・已選 ${bt[0]} 件` && bt[3] === `分解 ${bt[0]} 件` && bt[4] && bt[5] > 0,
    JSON.stringify(bt)
  );
  const ck = await box('[data-sg] .cq:not(.dim) .stck');
  ok('勾選框 20×20 在格子中上', !!ck && ck[2] === 20 && ck[3] === 20, JSON.stringify(ck));
  const bg = await E(() => {
    const g = document.querySelector('[data-sg]').getBoundingClientRect(),
      c = document.querySelector('[data-sg] > .cq').getBoundingClientRect(),
      b = document.querySelector('.stcan').getBoundingClientRect();
    return [Math.round(c.x), Math.round(c.y), g.bottom <= b.top];
  });
  ok(
    '整批模式：格子從 804,156 起（快速選列取代內分頁）、不蓋取消／分解鈕（796,526／1088,526）',
    bg[0] === 804 &&
      bg[1] === 156 &&
      bg[2] &&
      is(await box('.stcan'), 796, 526, 110, 32) &&
      is(await box('.stgo'), 1088, 526, 168, 32),
    JSON.stringify([bg, await box('.stcan'), await box('.stgo')])
  );
  await shot('stash-09-batch', [
    ['S11 整批模式標題', '.stt', [796, 84, 220, 20]],
    ['S13 已勾的格子', '[data-sg] > :nth-child(1)', [804, 156, 64, 64]],
    ['S12 快速選', '.stqs button', [852, 116, 56, 32]],
    ['S15 取消', '.stcan', [796, 526, 110, 32]],
    ['S16 分解 n 件', '.stgo', [1088, 526, 168, 32]]
  ]);
  /* 加一件稀有 → 確認卡在戰場上、長按 */
  const rid = await E(() => {
    const it = S.inv.items.find(x => x.r >= 2 && !x.lock);
    ST12.bat.add(it.id);
    hudPanels();
    return it.id;
  });
  await p.click('.stgo');
  await p.waitForTimeout(100);
  const ask = await E(() => {
    const a = document.querySelector('.stask');
    if (!a) return null;
    const r = a.getBoundingClientRect();
    return [
      a.querySelector('b').textContent,
      a.querySelector('p').textContent,
      a.querySelector('small').textContent,
      [...a.querySelectorAll('button')].map(b => b.textContent),
      r.right <= 776,
      Math.round(r.x)
    ];
  });
  ok(
    '含稀有以上：確認卡在戰場上（不在面板裡）「分解 n 件？」「其中 ◆ n 件…分解了就拿不回來。」「不能復原」、長按分解／取消',
    !!ask &&
      /^分解 \d+ 件？$/.test(ask[0]) &&
      /^其中 ◆ \d+ 件。會得到 .+。分解了就拿不回來。$/.test(ask[1]) &&
      ask[2] === '不能復原' &&
      JSON.stringify(ask[3]) === JSON.stringify(['長按分解', '取消']) &&
      ask[4],
    JSON.stringify(ask)
  );
  await shotKeep('stash-10-batch-confirm', [['確認卡', '.stask', [189, 201, 398, 202]]]);
  const n0b = await E(() => S.inv.items.length);
  const hb = await box('.stask .hold');
  await p.mouse.move(hb[0] + 20, hb[1] + 20);
  await p.mouse.down();
  await p.waitForTimeout(300);
  await p.mouse.up();
  ok(
    '長按不到 0.6 秒放開＝不分解',
    (await E(() => S.inv.items.length)) === n0b && (await E(() => !!document.querySelector('.stask')))
  );
  await p.mouse.down();
  await p.waitForTimeout(750);
  await p.mouse.up();
  await p.waitForTimeout(100);
  const after = await E(
    rid => [S.inv.items.length, !!S.inv.items.find(x => x.id === rid), ST12.bat, $('warn').textContent],
    rid
  );
  ok(
    '長按 0.6 秒＝分解選的那些、離開整批模式、吐司「已分解 n 件，得到 …」',
    after[0] < n0b && !after[1] && after[2] === null && /^已分解 \d+ 件，得到 /.test(after[3]),
    JSON.stringify(after)
  );
  await p.mouse.move(2, 400);
  /* 03 空、04 快滿、05 滿了 */
  await STASH(287);
  await p.waitForTimeout(100);
  const nf = await E(() => [
    document.querySelector('.stn').classList.contains('bad'),
    document.querySelector('.stw').textContent,
    (r => [r.x, r.y, r.width].map(Math.round))(document.querySelector('.stw').getBoundingClientRect()),
    Math.round(document.querySelector('[data-sg] > .cq').getBoundingClientRect().y)
  ]);
  ok(
    '快滿（287／300）：容量轉 --bad、警示「快滿了：還能放 13 件，滿了新打造的直接分解」寬止於預留帶（≤1156）、格子下移到 212',
    nf[0] && nf[1] === '快滿了：還能放 13 件，滿了新打造的直接分解' && nf[2][0] + nf[2][2] <= 1156 && nf[3] === 212,
    JSON.stringify(nf)
  );
  await shot('stash-04-nearfull', [...S_COM.slice(0, 11), ['警示列', '.stw', [804, 188, 352, 20]]]);
  await STASH(300);
  await p.waitForTimeout(100);
  ok(
    '滿了（300／300）：「滿了：新打造的直接分解」',
    (await txt('.stw')) === '滿了：新打造的直接分解' && (await txt('.stn')) === '300／300'
  );
  await shot('stash-05-full', [...S_COM.slice(0, 11), ['警示列', '.stw', [804, 188, 352, 20]]]);
  await STASH(0);
  await p.waitForTimeout(100);
  ok(
    '空倉：「還沒有裝備」＋「去鍛造打一件」',
    (await txt('.ste p')) === '還沒有裝備' && (await txt('.ste button')) === '去鍛造打一件'
  );
  await shot('stash-03-empty', S_COM.slice(0, 11));
  await STASH(142);
  /* 11 珠寶 */
  await p.click('.sttab .jw');
  await p.waitForTimeout(100);
  const jw = await E(() => [
    document.querySelector('.stn').textContent,
    document.querySelector('.stnote').textContent,
    [...document.querySelectorAll('.stcol .sub')].map(s => s.textContent),
    document.querySelector('.stcol .sub.on').textContent,
    (r => [r.x, r.y, r.width, r.height].map(Math.round))(
      document.querySelector('[data-sg] > .cq').getBoundingClientRect()
    ),
    document.querySelector('.stjf').textContent,
    document.querySelectorAll('[data-sg] .cq.jw:not(.emp)').length,
    document.querySelectorAll('[data-sg] .cq.jw.emp').length,
    document.querySelectorAll('[data-sg] .js').length,
    !!document.querySelector('.stb.bat')
  ]);
  ok(
    '珠寶分頁：容量「12／30」、「格數另計，鑲著的也算。不能分解，只能丟棄」、沒有整批分解',
    jw[0] === '12／30' && jw[1] === '格數另計，鑲著的也算。不能分解，只能丟棄' && !jw[9],
    JSON.stringify(jw)
  );
  ok(
    '珠寶右欄 6 種類：全部珠寶（選中）、詞綴珠寶、規則珠寶、亡靈珠寶、亡靈珠寶・雙魂、亡靈珠寶・三魂',
    JSON.stringify(jw[2]) ===
      JSON.stringify(['全部珠寶', '詞綴珠寶', '規則珠寶', '亡靈珠寶', '亡靈珠寶・雙魂', '亡靈珠寶・三魂']) &&
      jw[3] === '全部珠寶',
    JSON.stringify(jw[2])
  );
  ok(
    '珠寶格 804,176 64×64、12 顆＋18 格空位、2 顆「已鑲」；底「倉房 Lv 0　上限 30　王保底另留 5」',
    is(jw[4], 804, 176, 64, 64) &&
      jw[6] === 12 &&
      jw[7] === 18 &&
      jw[8] === 2 &&
      jw[5] === '倉房 Lv 0　上限 30　王保底另留 5',
    JSON.stringify(jw)
  );
  const jt = await E(
    () =>
      document.querySelector('[data-sg]').innerText +
      [...document.querySelectorAll('[data-sg] .cq')].map(c => c.className).join(' ')
  );
  ok(
    '珠寶不顯示稀有度（格上沒有普通／魔法／稀有／傳奇字樣、沒有 r0–r3 稀有色框）',
    !/普通|魔法|稀有|傳奇|\br[0-3]\b/.test(jt),
    jt.slice(0, 120)
  );
  await shot('stash-11-jewels', [
    ['S11 珠寶容量', '.stn', [846, 84, 200, 20]],
    ['S12 內分頁「珠寶」', '.sttab .jw', [868, 116, 72, 32]],
    ['S13 已鑲珠寶', '[data-sg] > :nth-child(1)', [804, 176, 64, 64]],
    ['S14 未鑲珠寶', '[data-sg] > :nth-child(3)', [948, 176, 64, 64]],
    ['S15 升級與保底說明', '.stjf', [804, 536, 280, 14]],
    ['S16 右欄珠寶種類', '.stcol', [1156, 116, 100, 438]]
  ]);
  await p.click('[data-st="jk:亡靈珠寶・三魂"]');
  await p.waitForTimeout(80);
  ok(
    '右欄選「亡靈珠寶・三魂」：只列那一種（現有 0 顆）',
    (await E(() => [ST12.jk, document.querySelectorAll('[data-sg] .cq.jw:not(.emp)').length].join())) ===
      '亡靈珠寶・三魂,0'
  );
  await shot('stash-22-jewels-mode', [['S16 右欄珠寶種類', '.stcol', [1156, 116, 100, 438]]]);
  await p.click('[data-st="jk:"]');
  await E(() => {
    S.camp.store = 2;
    hudPanels();
  });
  ok(
    '倉房 Lv 2：珠寶上限 38（30＋4×Lv）',
    (await txt('.stn')) === '12／38' && (await txt('.stjf')) === '倉房 Lv 2　上限 38　王保底另留 5'
  );
  await E(() => {
    S.camp.store = 0;
    hudPanels();
  });
  /* 14 丟棄（長按） */
  const jid = await E(() => S.jewels[5].id);
  const jb = await box(`[data-st="jw:${jid}"]`);
  await p.mouse.move(jb[0] + 30, jb[1] + 30);
  await p.mouse.down();
  await p.waitForTimeout(600);
  await p.mouse.up();
  await p.waitForTimeout(80);
  const da = await E(() => {
    const a = document.querySelector('.stask');
    return (
      a && [
        a.querySelector('b').textContent,
        a.querySelector('p').textContent,
        a.querySelector('small').textContent,
        [...a.querySelectorAll('button')].map(b => b.textContent),
        a.getBoundingClientRect().right <= 776
      ]
    );
  });
  ok(
    '長按珠寶：戰場上確認卡「丟棄這顆珠寶？」「丟棄「…」？不會得到材料或靈魂。丟了就拿不回來。」「不能復原」、長按丟棄／取消',
    !!da &&
      da[0] === '丟棄這顆珠寶？' &&
      /^丟棄「亡靈珠寶(・雙魂)?」？不會得到材料或靈魂。丟了就拿不回來。$/.test(da[1]) &&
      da[2] === '不能復原' &&
      JSON.stringify(da[3]) === JSON.stringify(['長按丟棄', '取消']) &&
      da[4],
    JSON.stringify(da)
  );
  await shotKeep('stash-14-jewels-discard', [['確認卡', '.stask', [189, 201, 398, 150]]]);
  const hj = await box('.stask .hold');
  await p.mouse.move(hj[0] + 20, hj[1] + 20);
  await p.mouse.down();
  await p.waitForTimeout(750);
  await p.mouse.up();
  await p.waitForTimeout(80);
  ok('長按丟棄 0.6 秒：那顆珠寶不見、沒給材料或靈魂', await E(jid => !jwOf(S, jid) && S.jewels.length === 11, jid));
  await p.mouse.move(2, 400);
  /* 12 空、13 超額 */
  await E(() => {
    S.jewels = [];
    S.jsock = [];
    hudPanels();
  });
  const je = await E(() => document.querySelector('.ste.jw').innerText.replace(/\n+/g, '|'));
  ok(
    '珠寶空倉：「還沒有珠寶」＋「珠寶打鬼門關、心魔幻境、凶地、陰兵借道才會掉。不保證第一顆。」',
    je === '還沒有珠寶|珠寶打鬼門關、心魔幻境、凶地、陰兵借道才會掉。不保證第一顆。',
    je
  );
  await shot('stash-12-jewels-empty', []);
  await E(() => {
    for (let i = 0; i < 35; i++) S.jewels.push(jwRoll(1 + (i % 2)));
    hudPanels();
  });
  ok(
    '超額 35／30：容量 --bad、警示「已超過上限，請清理。機率掉落暫停；王保底照樣收。」',
    (await txt('.stn')) === '35／30' &&
      (await E(() => document.querySelector('.stn').classList.contains('bad'))) &&
      (await txt('.stw')) === '已超過上限，請清理。機率掉落暫停；王保底照樣收。'
  );
  await shot('stash-13-jewels-full', []);
  await E(() => {
    S.jewels = S.jewels.slice(0, 12);
    hudPanels();
  });
  /* 23 通貨、25 名詞提示「通貨」 */
  await p.click('.sttab button:nth-child(3)');
  await p.waitForTimeout(100);
  const cu = await E(() => [
    document.querySelector('.stnote').textContent,
    [...document.querySelectorAll('.stsec h4')].map(h => h.textContent),
    (r => [r.width, r.height])(document.querySelector('.stbx').getBoundingClientRect()),
    !!document.querySelector('.stb'),
    [...document.querySelectorAll('.stsec section')].map(x => [
      x.querySelector('h4').textContent,
      [...x.querySelectorAll('.stbx')].map(b => (b.querySelector('.ph') ? '佔位:' : '') + b.title)
    ]),
    (q => q && getComputedStyle(q).fontSize)(document.querySelector('.stbx .ph'))
  ]);
  const cs = Object.fromEntries(cu[4]),
    phOk =
      (cs['打造通貨'] || []).every(t => t.startsWith('佔位:') === /^佔位:(破裂石|完美石|追憶之墨)$/.test(t)) &&
      ['鬼門關', '心魔幻境', '凶地'].every(k => cs[k] && cs[k].every(t => t.startsWith('佔位:')));
  ok(
    '通貨分頁：說明「數量跟鍛造台同一份，到鍛造台或技能分頁使用」、分區 打造通貨／鬼門關／心魔幻境／凶地／裂口（轉化石，ST-06）、格 44×44、只看不操作；借用圖（破裂石、完美石、追憶之墨、賽制區）有「佔位」角標 ≥10px，其他沒有（ST-35）',
    cu[0] === '數量跟鍛造台同一份，到鍛造台或技能分頁使用' &&
      JSON.stringify(cu[1]) === JSON.stringify(['打造通貨', '鬼門關', '心魔幻境', '凶地', '裂口']) &&
      JSON.stringify(cs['裂口']) === JSON.stringify(['轉化石']) &&
      !cs['打造通貨'].includes('轉化石') &&
      phOk &&
      parseFloat(cu[5]) >= 10 &&
      cu[2][0] === 44 &&
      cu[2][1] === 44 &&
      !cu[3],
    JSON.stringify(cu)
  );
  await shot('stash-23-currency', [
    ['S11 內分頁「通貨」', '.sttab button:nth-child(3)', [940, 116, 72, 32]],
    ['S12 說明', '.stnote', [796, 152, 460, 16]],
    ['S13 第一格', '.stbx', [804, 200, 44, 44]]
  ]);
  await p.mouse.move(975, 130);
  await p.waitForTimeout(550);
  const cn = await E(() => [
    !$('c12tip').hidden,
    $('c12tip').querySelector('b').textContent,
    $('c12tip').querySelector('p').textContent
  ]);
  ok(
    '名詞提示「通貨」：「改裝備或技能用的消耗品。這裡只看數量，跟鍛造台同一份」',
    cn[0] && cn[1] === '通貨' && cn[2] === '改裝備或技能用的消耗品。這裡只看數量，跟鍛造台同一份',
    JSON.stringify(cn)
  );
  await shotKeep('stash-25-noun-currency', [['S12 名詞提示', '#c12tip', [804, 200, 360, 100]]]);
  await p.mouse.move(2, 400);
  /* 24 特殊物品（Y 鍵）、15 追逐物品、17 套到裝備 */
  await E(() => document.querySelector('.sttab button').focus());
  await p.keyboard.press('y');
  await p.waitForTimeout(100);
  const sp = await E(() => [
    ST12.tab,
    document.querySelector('.stnote').textContent,
    [...document.querySelectorAll('.stsec h4')].map(h => h.textContent)
  ]);
  ok(
    '鍵盤 Y＝特殊物品分頁：說明「首領碎片數量跟山海寶盒同一份，到山海寶盒開王場；血霧之印用來進裂口」、分區 追逐物品／鬼門關／心魔幻境／凶地／陰兵借道／裂口',
    sp[0] === 'sp' &&
      sp[1] === '首領碎片數量跟山海寶盒同一份，到山海寶盒開王場；血霧之印用來進裂口' &&
      JSON.stringify(sp[2]) === JSON.stringify(['追逐物品', '鬼門關', '心魔幻境', '凶地', '陰兵借道', '裂口']),
    JSON.stringify(sp)
  );
  await shot('stash-24-fragments', [['S11 內分頁「特殊物品」', '.sttab .sp', [1012, 116, 88, 32]]]);
  await p.click('.stsec [data-st="sp:wy"]');
  await p.waitForTimeout(100);
  const ch = await E(() => [
    document.querySelector('.stn').textContent,
    [...document.querySelectorAll('.stwc')].map(c => [
      c.querySelector('b').textContent,
      c.querySelector('small').textContent,
      (r => [r.x, r.y, r.width, r.height].map(Math.round))(c.getBoundingClientRect())
    ]),
    document.querySelector('.stpity small').textContent,
    document.querySelector('.stpity p').textContent
  ]);
  ok(
    '追逐物品：標題「倉庫　追逐物品 2／4」、4 格 214×96（804／1026 × 156／260）、「擁有 2・身上 0」「還沒拿到」',
    ch[0] === '追逐物品 2／4' &&
      ch[1].length === 4 &&
      ch[1][0][1] === '擁有 2・身上 0' &&
      ch[1][1][1] === '擁有 0・身上 0' &&
      ch[1][2][1] === '還沒拿到' &&
      is(ch[1][0][2], 804, 156, 214, 96) &&
      is(ch[1][1][2], 1026, 156, 214, 96) &&
      is(ch[1][2][2], 804, 260, 214, 96),
    JSON.stringify(ch[1])
  );
  ok(
    '追逐保底「追逐保底 37%」、「保底滿 100% 就會掉一件追逐物品」',
    ch[2] === '追逐保底 37%' && ch[3] === '保底滿 100% 就會掉一件追逐物品',
    JSON.stringify(ch.slice(2))
  );
  await shot('stash-15-chase', [
    ['S12 追逐物品 2／4', '.stn', [846, 84, 200, 20]],
    ['S13 已拿到的收集格', '.stwc', [804, 156, 214, 96]],
    ['S14 赤霄印', '.stwc:nth-child(2)', [1026, 156, 214, 96]],
    ['S15 還沒拿到', '.stwc:nth-child(3)', [804, 260, 214, 96]],
    ['S16 追逐保底', '.stpity', [804, 376, 444, 60]]
  ]);
  await E(() => {
    const C = chaseOf();
    C.got0 = C.got;
    C.got = {};
    C.pts = 0;
    S.frags.wangyin_zhenyue = 0;
    hudPanels();
  });
  ok(
    '追逐物品 0／4：四格都「還沒拿到」、保底 0%',
    (await txt('.stn')) === '追逐物品 0／4' &&
      (await all('.stwc small')).every(t => t === '還沒拿到') &&
      (await txt('.stpity small')) === '追逐保底 0%'
  );
  await shot('stash-16-chase-empty', [['S12 追逐物品 0／4', '.stn', [846, 84, 200, 20]]]);
  await E(() => {
    const C = chaseOf();
    C.got = C.got0;
    C.pts = 185;
    S.frags.wangyin_zhenyue = 2;
    S.eq.helm = S.eq.helm || mkItem(BASES.find(b => b.k === 'helm').id, 12, 2);
    S.eq.helm.r = 2;
    S.eq.chest = mkItem(BASES.find(b => b.k === 'chest').id, 12, 1);
    changed();
  });
  await p.click('.stwc');
  await p.waitForTimeout(100);
  const ap = await E(() => [
    document.querySelector('.stq b').textContent,
    document.querySelector('.stq small').textContent,
    [...document.querySelectorAll('.stal button')].map(b => b.querySelector('small').textContent),
    document.querySelector('.stgo').textContent,
    document.querySelector('.stgo').disabled
  ]);
  ok(
    '套到裝備：「把鎮嶽印套到哪一件？」「只列出能套的裝備。已有印的要確認，舊印不會退回。」、列出身上魔法／稀有、鈕「套到裝備」（先選才能按）',
    ap[0] === '把鎮嶽印套到哪一件？' &&
      ap[1] === '只列出能套的裝備。已有印的要確認，舊印不會退回。' &&
      ap[2].length >= 2 &&
      ap[3] === '套到裝備' &&
      ap[4],
    JSON.stringify(ap)
  );
  await p.click('.stal button');
  await shot('stash-17-chase-apply', [
    ['S13 第一列', '.stal button', [804, 205, 444, 32]],
    ['S14 套到裝備', '.stgo', [1088, 526, 168, 32]]
  ]);
  const wyt = await E(() => [...document.querySelectorAll('.stal button')][0].querySelector('b').textContent);
  await p.click('.stgo');
  await p.waitForTimeout(100);
  ok(
    '選一件按「套到裝備」：那件套上鎮嶽印、王印 −1、回追逐物品頁',
    await E(
      t =>
        EQS.some(e => S.eq[e.k] && itemName(S.eq[e.k]) === t && S.eq[e.k].wy === 'wangyin_zhenyue') &&
        S.frags.wangyin_zhenyue === 1 &&
        ST12.sp === 'wy',
      wyt
    )
  );
  await p.keyboard.press('Escape');
  await p.waitForTimeout(80);
  ok('Esc 從追逐物品回到特殊物品總覽（面板還開著）', await E(() => PANEL.inv && ST12.tab === 'sp' && ST12.sp === ''));
  const stTxt = await E(() => {
    ST12.tab = 'eq';
    hudPanels();
    return $('pinv').innerText;
  });
  ok('倉庫畫面沒有禁用字', !BAN.test(stTxt), (stTxt.match(BAN) || [''])[0]);
  ok(
    '倉庫沒有寫死色碼：stash12.js 沒有 #hex／rgb(',
    !/#(?:[0-9a-fA-F]{3}){1,2}(?![\w-])|rgba?\(/.test(
      fs.readFileSync(path.join(__dirname, '..', 'js', 'stash12.js'), 'utf8')
    )
  );
  ok('倉庫：裝備 300 格不變（INV_CAP）', (await E(() => INV_CAP)) === 300);
  await E(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press('l');
  await p.waitForTimeout(100);
  ok('L 再按一次關倉庫', !(await E(() => PANEL.inv)));
  ok('沒有頁面錯誤', !errs.length, errs.join(' | '));
  if (OUT) fs.writeFileSync(path.join(OUT, 'boxes.json'), JSON.stringify(BOX, null, 1));
  /* ======================= 390×844 主畫面（觸控直立照舊走原本的抽屜與倉庫，只拍照＋確認不壞） ======================= */
  if (OUT) {
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
    await q.evaluate(MID);
    await q.evaluate(() => runNode(TRUNK_K[0]));
    await q.waitForTimeout(1200);
    await q.evaluate(() => navGo('craft'));
    await q.waitForTimeout(400);
    await q.screenshot({ path: path.join(OUT, '390-camp.png') });
    await q.evaluate(() => (closePanels(), navGo('bag')));
    await q.waitForTimeout(400);
    await q.screenshot({ path: path.join(OUT, '390-stash.png') });
    ok(
      '390×844：營地、倉庫照觸控版開得起來、沒有頁面錯誤（桌機版 .cm12／.st12 不套用）',
      !e2.length &&
        !(await q.evaluate(() => $('pinv').classList.contains('st12') || $('pcamp').classList.contains('cm12'))),
      e2.join(' | ')
    );
  }
  console.log(`\n${good} ✅ ／ ${bad} ❌`);
  await b.close();
  process.exit(bad ? 1 : 0);
})();
