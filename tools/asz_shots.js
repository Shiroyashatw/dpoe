/* 昇華、山海寶盒、地點 v1.0 驗收截圖、量測與功能檢查（三份 REVIEW-CHECKLIST.md 的 A 疊圖清單＋C、D 項；定稿在 uiux/shanhai-zones-final-1126 @ c8c7e66e）：
   1280×720、DPR 1，每張照清單設好狀態後截圖，規格表的元件座標（x,y w×h）跟實機 getBoundingClientRect 逐項比（差 ≤ 2 px 算過），寫成各資料夾的 MEASURE.md；
   另跑定案與手感檢查（排序、???、潮汐、長按 600 ms、開王場直接點、未開星級虛線、名詞提示 0.4 秒、浮動預覽 ≤ 100 ms、Deck 1280×800 不超過 y 720）。
   用法：先開本機伺服器，node tools/asz_shots.js [網址 http://localhost:8003/] [輸出根目錄 docs/production/evidence]；有 ❌ 結束碼 1。
   疊圖：python3 tools/asz_overlay.py [輸出根目錄] */
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path');
const URL = process.argv[2] || 'http://localhost:8003/',
  ROOT = process.argv[3] || path.join(__dirname, '..', 'docs/production/evidence'),
  DIR = { A: 'ascend/shots-1126', B: 'shanhai/shots-1126', C: 'zones/shots-1126' };
for (const d of Object.values(DIR)) fs.mkdirSync(path.join(ROOT, d), { recursive: true });
let bad = 0;
const ok = (n, c, x = '') => (console.log(`${c ? '✅' : '❌'} ${n}${x ? '　' + x : ''}`), c || bad++);
const MEAS = { A: [], B: [], C: [] };

/* 頁面裡的共用設定：中期存檔（瞭望台 Lv 12、正在刷赤脊）；ASC_* 給昇華用 */
const SETUP = () => {
  proSkip();
  S.story.tips = 0;
  S.auto = 0;
  S.lv = 40;
  S.camp.altar = 7;
  S.camp.scout = 1;
  S.camp.watch = 12;
  S.star = 2;
  runNode(TRUNK_K[12]);
  S.spm = { [TRUNK_K[9]]: 140, [TRUNK_K[10]]: 160, [TRUNK_K[11]]: 190, [TRUNK_K[12]]: 210 };
  closePanels();
};
const FRAG_B01 = () =>
  Object.assign(S.frags, {
    ox: 3,
    horse: 2,
    black: 1,
    white: 0,
    book: 0,
    joy: 2,
    rage: 1,
    grief: 1,
    fear: 0,
    love: 1,
    hate: 3,
    greed: 1,
    taotie: 1,
    qiongqi: 1,
    taowu: 1,
    hundun: 1,
    eye: 0,
    xing: 1,
    feng: 1,
    yu: 0,
    fu: 0,
    blood: 6
  });
const GODS = () => {
  S.gods = [
    { ...ghRoll(false), g: 'rat' },
    { ...ghRoll(false), g: 'horse' }
  ];
  S.godOn = 0;
};

/* WCAG 對比度：字色對最近一層不透明底色（往上找） */
const CR = q => {
  const e = document.querySelector(q);
  if (!e) return 0;
  const rgb = c => c.match(/[\d.]+/g).map(Number),
    lum = c => {
      const v = rgb(c)
        .slice(0, 3)
        .map(x => ((x /= 255) <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
  let b = e;
  while (b && (rgb(getComputedStyle(b).backgroundColor)[3] ?? 1) === 0) b = b.parentElement;
  const x = lum(getComputedStyle(e).color),
    y = lum(getComputedStyle(b || document.body).backgroundColor);
  return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2);
};

(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  await p.waitForFunction(() => typeof proSkip === 'function' && typeof S !== 'undefined' && S);
  await p.addStyleTag({
    content: '*, *::before, *::after { animation: none !important; transition: none !important; }'
  });
  const R = (f, a) => p.evaluate(f, a);
  const rect = q =>
    R(q => {
      const e = document.querySelector(q);
      if (!e || e.closest('[hidden]')) return null;
      const r = e.getBoundingClientRect();
      return [r.left, r.top, r.width, r.height].map(Math.round);
    }, q);
  /* 量一張：[名稱, 選擇器, x, y, w, h]；w、h 是 null＝只比位置 */
  const measure = async (g, id, L) => {
    for (const [n, q, x, y, w, h] of L) {
      const r = await rect(q),
        d = r
          ? [x == null ? 0 : r[0] - x, y == null ? 0 : r[1] - y, w == null ? 0 : r[2] - w, h == null ? 0 : r[3] - h]
          : null,
        pass = !!d && d.every(v => Math.abs(v) <= 2);
      MEAS[g].push({ id, n, spec: [x, y, w, h], r, d, pass });
    }
  };
  /* 圖示是懶載入：截圖前等 300 ms 讓圖載好、面板補畫 */
  const shot = async (g, id) => (
    await p.waitForTimeout(300), p.screenshot({ path: path.join(ROOT, DIR[g], `${id}-實機.png`) })
  );
  const hover = async q => {
    const r = await rect(q);
    await p.mouse.move(r[0] + r[2] / 2, r[1] + r[3] / 2);
  };
  /* 滑過之後幾毫秒出現（輪詢 #ztip，每 5 ms） */
  const tipTime = async q => {
    await p.mouse.move(2, 400);
    await R(() => zTip(null));
    const r = await rect(q),
      t0 = Date.now();
    await p.mouse.move(r[0] + r[2] / 2, r[1] + r[3] / 2);
    let t = -1;
    for (let i = 0; i < 200; i++) {
      if (await R(() => !$('ztip').hidden)) {
        t = Date.now() - t0;
        break;
      }
      await p.waitForTimeout(5);
    }
    return t;
  };
  const reset = async (o = '') => {
    await R(`holdClose(); (${SETUP.toString()})()`);
    if (o) await R(o);
    await p.mouse.move(2, 400);
    await p.waitForTimeout(120);
  };
  await R(`window.FRAG_B01 = ${FRAG_B01.toString()}; window.GODS = ${GODS.toString()}; window.CR = ${CR.toString()};`);

  /* ================= 昇華 ================= */
  const AP = '#pasc ';
  const ASH = [
    ['面板', '#pasc', 16, 76, 1248, 536],
    ['關閉', AP + '.ph .x', 1214, 80, 40, 36]
  ];
  const ASEL = [
    ['標題「昇華」', AP + '.ph > b', 32, 86, 80, 22],
    ['狀態摘要', AP + '.ax-sum', 120, 90, 980, 16],
    ['15 格總覽', AP + '.axgr', 32, 136, 1214, 440],
    ['第 1 格', AP + '.axk[data-i="0"]', 32, 136, 230, 136],
    ['第 2 格', AP + '.axk[data-i="1"]', 278, 136, 230, 136],
    ['第 3 格（潮汐）', AP + '.axk[data-i="2"]', 524, 136, 230, 136],
    ['第 6 格', AP + '.axk[data-i="5"]', 32, 288, 230, 136],
    ['第 15 格', AP + '.axk[data-i="14"]', 1016, 440, 230, 136],
    ['底列說明', AP + '.axft', 32, 588, 1216, 16]
  ];
  await reset(`S.camp.altar = 6; fmenuOpen('asc');`);
  const a01 = await R(() => ({
    q: document.querySelectorAll('#pasc .axk.q').length,
    n: document.querySelectorAll('#pasc .axk').length,
    names: Object.values(ASC)
      .filter(A => $('pasc').textContent.includes(A.n))
      .map(A => A.n),
    warn: $('warn').textContent,
    open: PANEL.asc
  }));
  ok(
    'A01 長老屋 < Lv 7：按 U 照樣打開 15 格全 ???（潮汐也不露名）',
    a01.open && a01.n === 15 && a01.q === 15 && !a01.names.length,
    JSON.stringify(a01)
  );
  ok('A01 按 U 的紅字「升長老屋到 Lv 7 才開」', a01.warn.includes('升長老屋到 Lv 7 才開'), a01.warn);
  await shot('A', 'A01');
  await measure('A', 'A01', [
    ...ASH,
    ...ASEL,
    ['引導卡', AP + '.axlk', 380, 268, 520, 176],
    ['前往營地・長老屋', AP + '.axlk .btn', 510, 368, 260, 40]
  ]);
  await R(() => document.querySelector('#pasc .axlk .btn').click());
  ok('A01 「前往營地・長老屋」：關昇華、開營地', await R(() => !PANEL.asc && (PANEL.camp || PANEL.craft)));

  const A2 = `S.maxT = 7; S.asc = 'wind'; S.at = ['a_st', 'a_s1', 'a_gale']; openPanel('asc');`;
  await reset(A2);
  const a02 = await R(() => ({
    order: [...document.querySelectorAll('#pasc .axk')].map(e =>
      e.classList.contains('q') ? '???' : e.querySelector('b').textContent
    ),
    tide: document.querySelector('#pasc .axk[data-i="2"]').textContent,
    hid: Object.entries(ASC)
      .filter(([k]) => !['wind', 'iron', 'tide'].includes(k))
      .filter(([, A]) => $('pasc').textContent.includes(A.n))
      .map(([, A]) => A.n),
    star: /[★✦]/.test($('pasc').textContent),
    paused: worldPaused()
  }));
  ok(
    'A02 排序：風行神射、鐵金剛、潮汐，其後 12 格 ???',
    a02.order.slice(0, 3).join() === '風行神射,鐵金剛,潮汐' &&
      a02.order.slice(3).every(x => x === '???') &&
      a02.order.length === 15,
    a02.order.join(' ')
  );
  ok(
    'A02 潮汐具名未開放：「升長老屋到 Lv 10 才開」；隱藏 12 個名字不出現；卡上沒有 ★／✦',
    a02.tide.includes('升長老屋到 Lv 10 才開') && !a02.hid.length && !a02.star,
    a02.hid.join()
  );
  ok('C6 開昇華面板時戰鬥暫停（worldPaused）', a02.paused);
  const crA = await R(() => [CR('#pasc .axk.open p'), CR('#pasc .axk.open small')]);
  ok(
    'A02 可選卡次要字（說明、「點擊進入詳細盤面」）對比度 ≥ 4.5:1',
    crA.every(v => v >= 4.5),
    crA.join('／') + ':1'
  );
  const tA = await tipTime(AP + '.axk[data-i="1"]');
  ok('A02 卡片浮動預覽：懸停後 ≤ 100 ms 出現', tA >= 0 && tA <= 100, tA + ' ms');
  await p.waitForTimeout(80);
  await shot('A', 'A02');
  await measure('A', 'A02', [...ASH, ...ASEL, ['浮動預覽（鐵金剛）', '#ztip', 278, 284, 360, 210]]);
  ok(
    'A02 預覽不擋卡、不出舞台',
    await R(() => {
      const t = $('ztip').getBoundingClientRect(),
        c = document.querySelector('#pasc .axk[data-i="1"]').getBoundingClientRect();
      return t.top >= c.bottom && t.right <= 1264 && t.bottom <= 612;
    })
  );
  ok('A02 移開即關', (await p.mouse.move(2, 400), await p.waitForTimeout(30), await R(() => $('ztip').hidden)));
  await R(() => {
    S.camp.altar = 10;
    hudPanels();
  });
  ok(
    '長老屋 ≥ Lv 10：潮汐改為可選（可進入），不再寫「升長老屋到 Lv 10」',
    await R(() => {
      const e = document.querySelector('#pasc .axk[data-i="2"]');
      return e.tagName === 'BUTTON' && e.dataset.ax === 'v:tide' && !e.textContent.includes('Lv 10');
    })
  );

  const ADET = [
    ...ASH,
    ['← 選擇昇華', AP + '.axbk', 32, 82, 132, 32],
    ['標題「昇華」', AP + '.ph > b', 176, 86, 70, 22],
    ['狀態摘要', AP + '.ax-sum', 250, 90, 800, 16],
    ['盤面', AP + '.axbd', 32, 168, 1216, 392]
  ];
  await reset(A2 + `document.querySelector('#pasc [data-ax="v:wind"]').click();`);
  const a03 = await R(() => ({
    side: !!document.querySelector('#pasc .ax-side, #pasc .ax-list, #pasc .ax-cap'),
    bd: document.querySelector('#pasc .axbd').getBoundingClientRect().width,
    seg: [...document.querySelectorAll('#pasc .axsrc-s span')].map(e => e.className).join()
  }));
  ok('A03 單一滿寬盤面、沒有側欄', !a03.side && a03.bd === 1216, JSON.stringify(a03));
  const tN = await tipTime(AP + '[data-ax="n:a_far"]');
  ok(
    'A03 節點浮動提示：懸停 ≤ 100 ms 出現，寫「點擊點亮」',
    tN >= 0 && tN <= 100 && (await R(() => $('ztip').textContent.includes('點擊點亮'))),
    tN + ' ms'
  );
  ok(
    'A03 提示不蓋返回、關閉、進度條',
    await R(() => {
      const t = $('ztip').getBoundingClientRect(),
        hit = q => {
          const r = document.querySelector(q).getBoundingClientRect();
          return !(t.right <= r.left || r.right <= t.left || t.bottom <= r.top || r.bottom <= t.top);
        };
      return !hit('#pasc .axbk') && !hit('#pasc .ph .x') && !hit('#pasc .axsrc');
    })
  );
  await shot('A', 'A03');
  await measure('A', 'A03', [
    ...ADET,
    ['重置', AP + '.ax-reset', 1070, 82, 88, 32],
    ['點數來源進度條', AP + '.axsrc', 32, 566, 1216, 36],
    ['第 1 段「開局 +2」', AP + '.axsrc-s span:nth-child(1)', 130, 568, 86, 16]
  ]);

  await reset(A2 + `S.at.push('a_s3'); document.querySelector('#pasc [data-ax="v:wind"]').click();`);
  await hover(AP + '[data-ax="n:a_walk"]');
  await p.waitForTimeout(50);
  const a04 = await R(() => [$('ztip').textContent, !!document.querySelector('#ztip .bad')]);
  ok(
    'A04 只剩 1 點懸停疾風化身：紅字「點數不足（要 2 點，還差 1 點）」',
    a04[0].includes('點數不足（要 2 點，還差 1 點）') && a04[1],
    a04[0]
  );
  await shot('A', 'A04');
  await measure('A', 'A04', ADET);
  const at0 = await R(() => S.at.join());
  await p.click(AP + '[data-ax="n:a_walk"]');
  ok('A04 點數不足時點了不點亮', (await R(() => S.at.join())) === at0);
  await p.click(AP + '[data-ax="n:a_s2"]');
  ok('A04 點小點：點亮 1 點', await R(() => S.at.includes('a_s2') && ascLeft() === 0));
  await p.click(AP + '[data-ax="n:a_s2"]');
  ok('A04 再點一次：退回', await R(() => !S.at.includes('a_s2')));

  /* A05：從選擇面板進鐵金剛預覽，按切換 */
  await reset(A2 + `document.querySelector('#pasc [data-ax="v:iron"]').click();`);
  await p.click(AP + '.ax-pick');
  await p.waitForTimeout(50);
  const a05 = await R(() => ({
    open: !$('hask').hidden,
    t: $('hask').textContent,
    focus: document.activeElement && document.activeElement.dataset.h
  }));
  ok(
    'A05 已有啟用再換：開 0.6 秒長按卡，寫明退回風行神射點數；預設焦點在取消',
    a05.open &&
      a05.t.includes('改成鐵金剛？') &&
      a05.t.includes('退回風行神射的全部點數，再成為鐵金剛。') &&
      a05.t.includes('長按更換') &&
      a05.focus === 'no',
    a05.t
  );
  await shot('A', 'A05');
  await measure('A', 'A05', [
    ...ASH,
    ['長按確認卡', '#hask .card', 260, 200, 760, 280],
    ['長按更換', '#hask .hgo', 284, 420, 160, 40],
    ['取消', '#hask [data-h="no"]', 836, 420, 160, 40],
    ['切換昇華（點數退回）', AP + '.ax-pick', 490, 566, 300, 40]
  ]);
  /* 提早放開不執行；按滿 600 ms 才換 */
  const holdT = async (ms, q = '#hask .hgo') => {
    const r = await rect(q);
    await p.mouse.move(r[0] + 20, r[1] + 20);
    await p.mouse.down();
    await p.waitForTimeout(ms);
    await p.mouse.up();
    await p.waitForTimeout(80);
  };
  await holdT(300);
  ok('A05 提早放開（300 ms）不執行', await R(() => S.asc === 'wind' && !$('hask').hidden));
  /* 600 ms ± 50：550 ms 放開不換、按到 650 ms 會換 */
  await holdT(540);
  ok('A05 540 ms 放開仍不執行', await R(() => S.asc === 'wind'));
  await holdT(680);
  ok(
    'A05 按滿 0.6 秒才執行：成為鐵金剛、點數退回',
    await R(() => S.asc === 'iron' && S.at.join() === 'a_st' && $('hask').hidden)
  );
  /* 第一次成為：直接點、不長按 */
  await reset(`S.asc = null; S.at = []; openPanel('asc'); document.querySelector('#pasc [data-ax="v:iron"]').click();`);
  await p.click(AP + '.ax-pick');
  ok('第一次「成為鐵金剛」直接點、不開長按卡', await R(() => S.asc === 'iron' && $('hask').hidden));
  /* 背包放不下：不開長按卡、整次取消 */
  await reset(
    A2 +
      `window._eq = eqUnloadWhy; eqUnloadWhy = () => '倉庫放不下要脫下的裝備：先騰出空間'; document.querySelector('#pasc [data-ax="v:iron"]').click();`
  );
  await p.click(AP + '.ax-pick');
  const nobag = await R(() => ({ hask: $('hask').hidden, asc: S.asc, w: $('warn').textContent }));
  ok(
    'eqUnloadWhy 擋下：不開長按卡、不換、出警告',
    nobag.hask && nobag.asc === 'wind' && nobag.w.includes('放不下'),
    JSON.stringify(nobag)
  );
  await R(() => (eqUnloadWhy = window._eq));

  /* A06：重置 */
  await reset(A2 + `document.querySelector('#pasc [data-ax="v:wind"]').click();`);
  await p.click(AP + '.ax-reset');
  await p.waitForTimeout(50);
  ok(
    'A06 重置：長按卡「重置？」「退回這個昇華的全部點數。昇華種類不變。」',
    await R(() => !$('hask').hidden && $('hask').textContent.includes('退回這個昇華的全部點數。昇華種類不變。'))
  );
  await shot('A', 'A06');
  await measure('A', 'A06', [
    ...ADET,
    ['長按確認卡', '#hask .card', 260, 200, 760, 260],
    ['長按重置', '#hask .hgo', 284, 400, 160, 40],
    ['取消', '#hask [data-h="no"]', 836, 400, 160, 40]
  ]);
  await holdT(300);
  ok('A06 提早放開不重置', await R(() => S.at.length === 3));
  await holdT(680);
  ok('A06 按滿 0.6 秒：S.at 回到起點、昇華種類不變', await R(() => S.at.join() === 'a_st' && S.asc === 'wind'));
  /* 關面板回來補算：那一行寫「昇華石碑期間」 */
  const line = await R(() => {
    const o = campBack;
    let tt = null;
    campBack = t => ((tt = t), o(t));
    openPanel('asc');
    closePanels();
    campBack = o;
    return tt;
  });
  ok('C6 關昇華面板：回來補算那一行用「昇華石碑期間」（campBack）', line === '昇華石碑期間', String(line));

  /* ================= 山海寶盒 ================= */
  const BP = '#pbox ';
  const BSH = [
    ['面板', '#pbox', 16, 76, 1248, 536],
    ['標題「山海寶盒」', BP + '.ph > b', 32, 86, 200, 22],
    ['狀態摘要', BP + '.bx-sum', 216, 90, 760, 16],
    ['關閉', BP + '.ph .x', 1214, 80, 40, 36],
    ['左欄碎片總覽', BP + '.bxl', 32, 128, 780, 468],
    ['區：鬼門關', BP + '.bxz-ghost', 32, 128, 780, 86],
    ['區：心魔幻境', BP + '.bxz-dream', 32, 218, 780, 86],
    ['區：凶地', BP + '.bxz-fiend', 32, 308, 780, 86],
    ['區：陰兵借道', BP + '.bxz-army', 32, 398, 780, 86],
    ['區：裂口', BP + '.bxz-rift', 32, 488, 780, 108],
    ['右欄開啟', BP + '.bxr', 820, 128, 428, 412],
    ['右欄標題', BP + '.bxr h3', 832, 136, 404, 20],
    ['王場等級', BP + '.bxlv', 832, 158, 404, 16],
    ['「消耗」標', BP + '.bxr h5', 832, 180, 80, 16],
    ['消耗內文', BP + '.bxct', 832, 198, 404, 44],
    ['「規則」標', BP + '.bxr h5 ~ h5', 832, 246, 80, 16],
    ['規則內文', BP + '.bxrl', 832, 264, 404, 44],
    ['一般開啟鈕', BP + '.bxgo.g0', 832, 316, 404, 60],
    ['終極開啟鈕', BP + '.bxgo.g1', 832, 384, 404, 60],
    ['神格快捷欄', BP + '.bxg', 820, 548, 428, 52],
    ['管理神格', BP + '.bxg .btn', 1088, 556, 148, 36]
  ];
  await reset(`FRAG_B01(); S.idols = ZODIAC.map(z => z[0]); GODS(); BOXUI.tab = 'ghost'; openPanel('box');`);
  const b01 = await R(() => ({
    zones: [...document.querySelectorAll('#pbox .bxz h4')].map(e => e.textContent),
    old: ['酆都', '心魔劫', '四凶', '弒神'].filter(w => $('pbox').textContent.includes(w)),
    rule: document.querySelector('#pbox .bxrl').textContent,
    title: document.querySelector('#pbox .bxr h3').textContent,
    g0: document.querySelector('#pbox .bxgo.g0').disabled,
    g1: document.querySelector('#pbox .bxgo.g1').disabled,
    sym: /[★✦]/.test($('pbox').textContent),
    tabs: !!document.querySelector('#pbox .bx-tabs')
  }));
  ok(
    'B01 單頁五區，區名是鬼門關／心魔幻境／凶地／陰兵借道／裂口；沒有舊分頁名',
    b01.zones.join() === '鬼門關,心魔幻境,凶地,陰兵借道,裂口' && !b01.old.length && !b01.tabs,
    JSON.stringify(b01)
  );
  ok(
    'B01 右欄「開啟：鬼門關」；一般可點、終極不足；規則含「只花首領碎片」「倒下不退」；沒有 ★／✦',
    b01.title === '開啟：鬼門關' &&
      !b01.g0 &&
      b01.g1 &&
      b01.rule.includes('只花首領碎片') &&
      b01.rule.includes('倒下不退') &&
      !b01.sym
  );
  /* 名詞提示：停 0.4 秒 */
  await p.mouse.move(2, 400);
  const tz = await (async () => {
    const r = await rect(BP + '.bxrl .zterm'),
      t0 = Date.now();
    await p.mouse.move(r[0] + 6, r[1] + r[3] / 2);
    for (let i = 0; i < 200; i++) {
      if (await R(() => !$('ztip').hidden)) return Date.now() - t0;
      await p.waitForTimeout(5);
    }
    return -1;
  })();
  ok(
    'B01 名詞提示「首領碎片」停 0.4 秒出現（350–480 ms）、寫「倒下不退」',
    tz >= 350 && tz <= 480 && (await R(() => $('ztip').textContent.includes('倒下不退'))),
    tz + ' ms'
  );
  ok(
    'B01 名詞提示不擋兩顆開啟鈕',
    await R(() => {
      const t = $('ztip').getBoundingClientRect(),
        g = document.querySelector('#pbox .bxgo.g1').getBoundingClientRect();
      return t.top >= g.bottom;
    })
  );
  await shot('B', 'B01');
  await measure('B', 'B01', [...BSH, ['名詞提示「首領碎片」', '#ztip', 832, 456, 404, 88]]);

  await reset(
    `Object.keys(S.frags).forEach(k => (S.frags[k] = 0)); S.frags.ox = 1; S.frags.horse = 1; BOXUI.tab = 'ghost'; openPanel('box');`
  );
  const b02 = await R(() => ({
    d: [...document.querySelectorAll('#pbox .bxgo')].map(e => e.disabled),
    t: [...document.querySelectorAll('#pbox .bxgo small')].map(e => e.textContent),
    red: !!document.querySelector('#pbox .bad, #pbox .c-bad'),
    z: document.querySelectorAll('#pbox .bxz-ghost .bxc.z').length
  }));
  ok(
    'B02 不足：兩顆開啟鈕停用並寫缺項；不用紅框；×0 格虛線',
    b02.d.every(Boolean) && b02.t[0].includes('勾魂令 2／5') && b02.t[1].length > 2 && !b02.red && b02.z === 3,
    JSON.stringify(b02)
  );
  await shot('B', 'B02');
  await measure('B', 'B02', BSH);

  await reset(`FRAG_B01(); BOXUI.sel = ['joy', 'rage', 'grief']; BOXUI.tab = 'dream'; openPanel('box');`);
  const b03 = await R(() => ({
    t: document.querySelector('#pbox .bxr h3').textContent,
    on: [...document.querySelectorAll('#pbox .bxz-dream .bxc.on')].length,
    deb: document.querySelector('#pbox .bxrl').textContent,
    d: [...document.querySelectorAll('#pbox .bxgo')].map(e => e.disabled)
  }));
  ok(
    'B03 心魔幻境：選喜／怒／哀三種，右欄減益三句；三尸可開、三彭停用',
    b03.t === '開啟：心魔幻境' && b03.on === 3 && SIN_FRAG_DEB(b03.deb) && !b03.d[0] && b03.d[1],
    JSON.stringify(b03)
  );
  function SIN_FRAG_DEB(t) {
    return (t.match(/；/g) || []).length === 2;
  }
  await p.click(BP + '.bxz-dream .bxc:nth-child(5)');
  ok('B03 心魔格可多選：點第 4 種多勾一個', await R(() => BOXUI.sel.length === 4));
  /* 規則句固定第一行、減益在下面最多 2 行（超出省略、title 看全文）；整塊不碰開啟鈕（y 316） */
  const ruleBox = () =>
    R(() => {
      const p = document.querySelector('#pbox .bxrl'),
        d = p.querySelector('.bxdb'),
        g = document.querySelector('#pbox .bxgo.g0').getBoundingClientRect(),
        rg = document.createRange();
      rg.setStart(p.firstChild, 0);
      rg.setEnd(d ? d.previousSibling : p.lastChild, (d ? d.previousSibling : p.lastChild).length);
      const L = [...rg.getClientRects()],
        top = Math.min(...L.map(r => r.top)),
        bot = Math.max(...L.map(r => r.bottom)),
        tail = [...p.childNodes].find(n => n.nodeType === 3 && n.textContent.includes('倒下不退碎片')),
        tr = document.createRange();
      tr.selectNodeContents(tail);
      const T = [...tr.getClientRects()].pop(),
        hit = document.elementFromPoint(T.right - 6, T.top + T.height / 2),
        D = d && d.getBoundingClientRect(),
        P = p.getBoundingClientRect();
      return {
        lines: new Set(L.map(r => Math.round(r.top))).size,
        rule: [Math.round(L[0].left), Math.round(top), Math.round(bot)],
        hitP: !!hit && hit.closest('.bxrl') === p,
        deb: D && [Math.round(D.top), Math.round(D.bottom), Math.round(D.height / 13)],
        cut: d ? d.scrollHeight > d.clientHeight + 1 : false,
        clamp: d ? getComputedStyle(d).webkitLineClamp : '',
        title: d ? d.title : '',
        txt: d ? d.textContent : '',
        p: [Math.round(P.top), Math.round(P.bottom), p.scrollHeight <= p.clientHeight + 1],
        g0: Math.round(g.top)
      };
    });
  const r4 = await ruleBox(),
    sel4 = await R(() => BOXUI.sel.slice());
  ok(
    'B03 選 4 種：規則句「…倒下不退碎片。」一行、在減益上面；末字點得到規則本身（沒被蓋）；減益 ≤ 2 行；整塊底 ≤ 開啟鈕頂（316）',
    r4.lines === 1 &&
      r4.hitP &&
      r4.deb &&
      r4.deb[0] >= r4.rule[2] &&
      r4.deb[2] <= 2 &&
      r4.p[1] <= r4.g0 &&
      r4.deb[1] <= r4.g0 &&
      r4.p[2] &&
      (r4.txt.match(/；/g) || []).length === 3,
    JSON.stringify(r4)
  );
  await R(() => {
    BOXUI.sel = Object.keys(SIN_FRAG);
    hudPanels();
  });
  const r7 = await ruleBox();
  ok(
    'B03 全選（有碎片的 6 種）：減益仍 ≤ 2 行（最多 2 行、超出省略號）、title 是全文；規則句仍一行、不被遮、不碰開啟鈕',
    r7.lines === 1 &&
      r7.hitP &&
      r7.deb[2] <= 2 &&
      r7.clamp === '2' &&
      r7.title === r7.txt &&
      (r7.title.match(/；/g) || []).length === 5 &&
      r7.deb[1] <= r7.g0 &&
      r7.p[1] <= r7.g0,
    JSON.stringify(r7)
  );
  const cut = await R(() => {
    const d = document.querySelector('#pbox .bxdb');
    d.textContent += d.textContent;
    const r = d.getBoundingClientRect();
    return [d.scrollHeight > d.clientHeight + 1, Math.round(r.height), Math.round(r.bottom)];
  });
  ok(
    'B03 減益超過 2 行（塞兩倍字）：截在 2 行（26 px）、底 ≤ 316',
    cut[0] && cut[1] <= 26 && cut[2] <= 316,
    cut.join()
  );
  await R(s => {
    BOXUI.sel = s;
    hudPanels();
  }, sel4);
  await shot('B', 'B03');
  await measure('B', 'B03', BSH);
  for (const [z, k] of [
    ['fiend', '凶地'],
    ['army', '陰兵借道']
  ]) {
    await p.click(BP + `.bxz-${z} h4`);
    ok(
      `另測：點${k}，右欄標題「開啟：${k}」、版面同 B01`,
      (await R(() => document.querySelector('#pbox .bxr h3').textContent)) === '開啟：' + k &&
        (await rect(BP + '.bxgo.g0'))[1] === 316
    );
  }

  await reset(`FRAG_B01(); S.idols = ZODIAC.map(z => z[0]); GODS(); S.lv = 30; BOXUI.tab = 'rift'; openPanel('box');`);
  await p.click(BP + '.bxg .btn');
  const b04 = await R(() => ({
    t: document.querySelector('#pbox .bxr h3').textContent,
    d: [...document.querySelectorAll('#pbox .bxgo')].map(e => e.disabled),
    rows: document.querySelectorAll('#pbox .bxml li').length,
    x0: !!document.querySelector('#pbox .bxml li.on [data-bx^="ghx:"]'),
    x1: !!document.querySelector('#pbox .bxml li:not(.on) [data-bx^="ghx:"]'),
    sym: /[★✦]/.test(document.querySelector('#pbox .bxmc').textContent)
  }));
  ok(
    'B04 裂口：可開太歲、太歲星君不足；神格管理窗 2 列，裝著的沒有「拆」；沒有 ★／✦',
    b04.t === '開啟：裂口' && !b04.d[0] && b04.d[1] && b04.rows === 2 && !b04.x0 && b04.x1 && !b04.sym,
    JSON.stringify(b04)
  );
  const crB = await R(() => CR('#pbox .bxml li:not(.on) small'));
  ok('B04 神格管理未裝備列的詞（灰底）對比度 ≥ 4.5:1', crB >= 4.5, crB + ':1');
  await shot('B', 'B04');
  await measure('B', 'B04', [
    ['神格管理小視窗', BP + '.bxmc', 360, 170, 560, 330],
    ['第 1 列', BP + '.bxml li:nth-child(1)', 380, 242, 520, 80],
    ['卸下', BP + '.bxml li.on .btn', 790, 262, 88, 40],
    ['關閉（小視窗）', BP + '.bxmx', 800, 450, 100, 36]
  ]);
  await p.keyboard.press('Escape');
  ok('神格管理窗：Esc 只關小視窗', await R(() => PANEL.box && !BOXUI.gm));
  await p.click(BP + '.bxg .btn');

  await p.click(BP + '.bxml li:not(.on) [data-bx^="ghx:"]');
  await p.waitForTimeout(50);
  const b05 = await R(() => ({
    t: $('hask').textContent,
    f: document.activeElement && document.activeElement.dataset.h
  }));
  ok(
    'B05 拆神格：長按卡「拆解？」「拆成 200 靈魂。」；預設焦點取消',
    b05.t.includes('拆解？') && b05.t.includes('拆成 200 靈魂。') && b05.t.includes('長按拆解') && b05.f === 'no',
    b05.t
  );
  await shot('B', 'B05');
  await measure('B', 'B05', [
    ['長按確認卡', '#hask .card', 400, 220, 480, 250],
    ['長按拆解', '#hask .hgo', 424, 410, 160, 40],
    ['取消', '#hask [data-h="no"]', 696, 410, 160, 40]
  ]);
  const soul0 = await R(() => MAT().soul);
  await holdT(300);
  ok('B05 提早放開不拆', await R(() => S.gods.length === 2));
  await holdT(680);
  ok('B05 按滿 0.6 秒：拆掉、靈魂 +200', await R(s0 => S.gods.length === 1 && MAT().soul === s0 + 200, soul0));

  /* 開王場：直接點、沒有長按卡、下一幀內進場 */
  await reset(`FRAG_B01(); BOXUI.tab = 'ghost'; openPanel('box');`);
  const go = await R(
    () =>
      new Promise(res => {
        const b = document.querySelector('#pbox .bxgo.g0'),
          t0 = performance.now();
        b.click();
        const t1 = performance.now();
        requestAnimationFrame(() =>
          res({ arena: G.arena, hask: $('hask').hidden, panel: PANEL.box, ms: Math.round(t1 - t0), hun: fdHun(S) })
        );
      })
  );
  ok(
    'C2 開王場：足夠時點一下就扣碎片進場，沒有長按卡，按下到進場 < 100 ms',
    go.arena === 'yama' && go.hask && !go.panel && go.ms < 100 && go.hun === 1,
    JSON.stringify(go)
  );

  /* ================= 地點 ================= */
  const CP = '#pnode ';
  const CSH = [
    ['地點面板', '#pnode', 16, 76, 640, 536],
    ['標題「地點」', CP + '.ph > b', 32, 86, 200, 22],
    ['關閉', CP + '.ph .x', 606, 80, 40, 36],
    ['標「星級」', CP + '.ndst-t', 32, 136, 40, 16],
    ...[1, 2, 3, 4, 5].map(i => [`${i}★`, CP + `.ndst .chip:nth-of-type(${i})`, 76 + (i - 1) * 52, 128, 48, 32]),
    ['星級說明', CP + '.ndst .c-dim', 344, 136, 280, 16],
    ['清單區', CP + '.ndl', 16, 180, 640, 418]
  ];
  const openNode = `PANEL.node = true; hudPanels();`;
  await reset(openNode);
  const c01 = await R(() => ({
    w: $('pnode').getBoundingClientRect().width,
    st: [...document.querySelectorAll('#pnode .ndst .chip')].map(
      e => e.textContent + (e.classList.contains('off') ? '-' : '+') + getComputedStyle(e).borderStyle
    ),
    on: document.querySelector('#pnode li.on').textContent,
    nx: document.querySelector('#pnode li.nx').textContent,
    foot: document.querySelector('#pnode .ndft').textContent,
    sym: /✦/.test($('pnode').textContent),
    bg: document.elementFromPoint(900, 300).closest('#pnode') === null
  }));
  ok(
    'C01 面板 640 寬、右邊露出戰場；1★–2★ 實線、3★–5★ 虛線',
    c01.w === 640 && c01.bg && c01.st.join() === '1★+solid,2★+solid,3★-dashed,4★-dashed,5★-dashed',
    JSON.stringify(c01)
  );
  ok(
    'C01 正在刷、下一座「升瞭望台 Lv 13 就開」、捲動提示；清單沒有 ✦',
    c01.on.includes('正在刷') && c01.nx.includes('升瞭望台 Lv 13 就開') && /[↑↓]/.test(c01.foot) && !c01.sym,
    c01.foot
  );
  /* 未開星級：停 0.4 秒出提示 */
  await p.mouse.move(2, 400);
  const ts = await (async () => {
    const r = await rect(CP + '.ndst .chip:nth-of-type(3)'),
      t0 = Date.now();
    await p.mouse.move(r[0] + 20, r[1] + 12);
    for (let i = 0; i < 200; i++) {
      if (await R(() => !$('ztip').hidden)) return Date.now() - t0;
      await p.waitForTimeout(5);
    }
    return -1;
  })();
  ok(
    'C01 懸停未開 3★：停 0.4 秒（350–480 ms）出「升斥候營到 Lv 2 才開」',
    ts >= 350 && ts <= 480 && (await R(() => $('ztip').textContent.includes('升斥候營到 Lv 2 才開'))),
    ts + ' ms'
  );
  await p.mouse.move(2, 400);
  await p.waitForTimeout(50);
  await shot('C', 'C01');
  await measure('C', 'C01', [
    ...CSH,
    ['第 1 列', CP + '.ndl > li:not(.ndg)', 32, null, 608, 40],
    ['捲動提示', CP + '.ndft', 32, 598, 608, null]
  ]);
  const card0 = await R(() => JSON.stringify(S.card));
  await p.click(CP + '.ndst .chip:nth-of-type(3)', { force: true });
  ok('C 點未開星級：不改 S.star', await R(() => S.star === 2));
  await p.click(CP + '.ndst .chip:nth-of-type(1)');
  ok(
    'C02 點已開星級立刻寫入、不重抽當輪地圖詞（S.card 不變）',
    (await R(() => S.star === 1)) && (await R(() => JSON.stringify(S.card))) === card0
  );
  await p.click(CP + '.ndst .chip:nth-of-type(2)');
  const tw = await (async () => {
    const r = await rect(CP + '.ndst .zterm'),
      t0 = Date.now();
    await p.mouse.move(r[0] + 6, r[1] + 6);
    for (let i = 0; i < 200; i++) {
      if (await R(() => !$('ztip').hidden)) return Date.now() - t0;
      await p.waitForTimeout(5);
    }
    return -1;
  })();
  ok(
    'C02 名詞提示「地圖詞」停 0.4 秒（350–480 ms）',
    tw >= 350 && tw <= 480 && (await R(() => $('ztip').textContent.includes('同一組只會出一條'))),
    tw + ' ms'
  );
  ok(
    'C02 說明句：不立刻重抽當輪地圖詞',
    await R(() => document.querySelector('#pnode .ndft').textContent.includes('不立刻重抽'))
  );
  const c02t = await R(() => {
    const t = $('ztip').getBoundingClientRect(),
      P = $('pnode').getBoundingClientRect(),
      hit = [...document.querySelectorAll('#pnode .ndl > li')].filter(li => {
        const r = li.getBoundingClientRect();
        return r.height && r.right > t.left && r.left < t.right && r.bottom > t.top && r.top < t.bottom;
      }).length;
    return {
      tip: [t.left, t.top, t.width, t.height].map(Math.round),
      pr: Math.round(P.right),
      gap: Math.round(t.left - P.right),
      hit,
      vw: t.right <= innerWidth - 8 && t.bottom <= innerHeight - 8
    };
  });
  ok(
    'C02 「地圖詞」提示在面板右緣外側（露出的戰場）、不蓋任何地點列、不出畫面',
    c02t.gap >= 8 && c02t.hit === 0 && c02t.vw,
    JSON.stringify(c02t)
  );
  await shot('C', 'C02');
  /* 定稿 C02 的提示座標 32,320 照列；mumi 11/27 裁定改放面板右緣外，這列照實記成不符 */
  await measure('C', 'C02', [
    ...CSH,
    ['名詞提示「地圖詞」（定稿 32,320；11/27 裁定改面板右緣外）', '#ztip', 32, 320, 520, 140]
  ]);

  await reset(openNode + `document.querySelector('#pnode li.nx').scrollIntoView({ block: 'start' });`);
  await p.waitForTimeout(80);
  await shot('C', 'C03');
  await measure('C', 'C03', [...CSH, ['下一座（凍河口）', CP + 'li.nx .ndr', 32, null, 608, 40]]);
  const cur0 = await R(() => S.world.cur);
  await R(() => document.querySelector('#pnode li.lock:not(.nx) .ndr').scrollIntoView({ block: 'center' }));
  await R(() => (window._w = $('warn').textContent = ''));
  const lk = await R(() => {
    const e = document.querySelector('#pnode li.nx ~ li.lock:not(.nx):not(.ndg) .ndr');
    e.click();
    return { w: $('warn').textContent, em: e.querySelector('em').textContent, cur: S.world.cur };
  });
  ok('C03 更後面的鎖定列：點了只 hudWarn 同一句、不進入', lk.w === lk.em && lk.cur === cur0, JSON.stringify(lk));
  await R(() => document.querySelector('#pnode li.nx .ndr').click());
  ok('C03 點下一座：去營地', await R(() => !PANEL.node && (PANEL.camp || PANEL.craft)));

  await reset(
    `S.camp.scout = 2; S.camp.watch = 26; S.lv = 40; S.frags.mist = 0; S.star = 3; runNode(TRUNK_K[12]); closePanels(); ${openNode} document.querySelector('#pnode [data-a="ngo:' + wKey(SPECIAL[0].q, SPECIAL[0].r) + '"]').scrollIntoView({ block: 'center' });`
  );
  await p.waitForTimeout(80);
  const c04 = await R(() => {
    const row = t =>
      [...document.querySelectorAll('#pnode li')].find(
        e => e.dataset.t === t || (e.querySelector('small') || {}).textContent?.includes(t)
      );
    return {
      st: [...document.querySelectorAll('#pnode .ndst .chip')].map(e => e.classList.contains('off')).join(),
      ghost: row('鬼門關') && !row('鬼門關').classList.contains('lock'),
      rift: row('裂口') && row('裂口').textContent,
      dream: row('心魔幻境') && row('心魔幻境').textContent
    };
  });
  ok(
    'C04 3★：4★–5★ 虛線；鬼門關可進；裂口寫需要血霧之印；心魔幻境等級不足',
    c04.st === 'false,false,false,true,true' &&
      c04.ghost &&
      c04.rift.includes('需要血霧之印') &&
      c04.dream.includes('角色等級需達 45'),
    JSON.stringify(c04)
  );
  await shot('C', 'C04');
  await measure('C', 'C04', CSH);

  /* ================= Steam Deck 1280×800：面板不拉高、不超過 y 720 ================= */
  await p.setViewportSize({ width: 1280, height: 800 });
  for (const [k, o] of [
    ['asc', A2],
    ['box', `FRAG_B01(); openPanel('box');`],
    ['node', openNode]
  ]) {
    await reset(o);
    const r = await rect({ asc: '#pasc', box: '#pbox', node: '#pnode' }[k]);
    ok(`Deck 1280×800 ${k}：面板 ${r.join(',')} 不拉高、下緣 ≤ 720`, r[1] === 76 && r[1] + r[3] <= 720);
  }
  ok('三個畫面全程沒有頁面錯誤', !errs.length, errs.join(' | '));
  await b.close();

  /* MEASURE.md */
  for (const g of ['A', 'B', 'C']) {
    const L = MEAS[g],
      f = v => (v == null ? '—' : v),
      n = L.filter(x => x.pass).length;
    fs.writeFileSync(
      path.join(ROOT, DIR[g], 'MEASURE.md'),
      `# 1280×720 實機量測（tools/asz_shots.js 產生）\n\n規格座標 vs 實機 getBoundingClientRect（CSS px，DPR 1）。差 ≤ 2 算過；w、h 寫「—」的只比位置（規格沒寫或實機可變高）。\n\n過 ${n}／${L.length} 項。\n\n| 圖 | 元件 | 規格 x,y w×h | 實機 x,y w×h | 差 dx,dy,dw,dh | 結果 |\n|---|---|---|---|---|---|\n` +
        L.map(
          x =>
            `| ${x.id} | ${x.n} | ${x.spec.map(f).join(',')} | ${x.r ? x.r.join(',') : '找不到'} | ${x.d ? x.d.join(',') : '—'} | ${x.pass ? '✅' : '❌'} |`
        ).join('\n') +
        '\n'
    );
    console.log(`MEASURE ${g}: ${n}/${L.length}`);
  }
  console.log(bad ? `${bad} 項 ❌` : '全部通過');
  process.exit(bad ? 1 : 0);
})();
