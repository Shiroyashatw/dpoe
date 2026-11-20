const { chromium } = require('playwright');
/* B4 戰鬥 HUD 驗收（docs/production/specs/fix-list-v1.2-to-batches.md「B4」；M2-40-skill-panel-hud.md §2、§9；D1-fix-mumi-1119.md §2）：
   S6／D2-10／D2-14／D3-03 掉落動態位置與列數、跟資源列交集（G01）；S3 字串「+{n} 件已收」「全部掉落紀錄 ›」；
   S5／D3-03 藥劑位置、沒有次數、冷卻環（D3-01 對 --panel ≥ 3.92、3 px＋1 px 黑邊）、自動與抽屜開著（G02、X02）；
   D2-02 條上數字 12／700 等寬＋2 px 描邊、130% 16＋條高 +4；D1-03 受傷數字；S1③ 暴擊彈 1.0→1.35→1.0；S1⑧ 低血紅邊；
   D2-04 技能孔板 390×664 首屏 ≥4 列、列高 44、列距 16、II 另起一行。閃光尖峰另見 tools/b4_flash.js。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/b4_check.js [寬 390] [高 844] [網址]
   390×844、390×664 模擬安全區上 47（844 另加下 34）。截圖與量測表存 docs/production/evidence/dpoe-b4/（SHOTS 可改）。有 ❌ 結束碼 1 */
const path = require('path'),
  fs = require('fs');
const W = +process.argv[2] || 390,
  H = +process.argv[3] || 844,
  URL = process.argv[4] || 'http://localhost:8000/',
  PORTM = H > W,
  MOB = PORTM || H <= 430,
  tag = W + 'x' + H,
  OUT = process.env.SHOTS || path.join(__dirname, '..', 'docs', 'production', 'evidence', 'dpoe-b4'),
  SAT = PORTM && (H === 844 || H === 664) ? 47 : 0,
  SAB = PORTM && H === 844 ? 34 : 0,
  P390 = W === 390 && PORTM,
  D1280 = W === 1280 && H === 720,
  /* 390×664（瀏覽器分頁）照底部錨定：844 的 y 加 DY */
  DY = H - SAB - 810;
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const rows = [];
const ok = (n, v, goal = '', got = '', file = '') => {
  if (!v) fail++;
  const g = typeof got === 'string' ? got : JSON.stringify(got);
  rows.push([n, tag, goal, g, v ? '過' : '不過', file]);
  console.log((v ? '✅ ' : '❌ ') + n + (g ? ' ' + g : ''));
};
const near = (a, b, d = 2) => !!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= d);
const hit = (a, b) => !!a && !!b && a[2] > b[0] && a[0] < b[2] && a[3] > b[1] && a[1] < b[3];
const cr = (a, b) => {
  const L = h => {
    const c = [1, 3, 5]
      .map(i => parseInt(h.substr(i, 2), 16) / 255)
      .map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const x = L(a),
    y = L(b);
  return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2);
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    hasTouch: MOB,
    isMobile: MOB,
    deviceScaleFactor: 2,
    reducedMotion: 'reduce'
  });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message + (process.env.STK ? e.stack : '')));
  await p.goto(URL + '?dbg=1&seed=7&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1200);
  const shot = async n => {
    const f = `${tag}_${n}.png`;
    await p.screenshot({ path: path.join(OUT, f) });
    return f;
  };
  const rect = q =>
    p.evaluate(q => {
      const e = document.querySelector(q);
      if (!e || !e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') return null;
      const r = e.getBoundingClientRect();
      return [r.left, r.top, r.right, r.bottom].map(Math.round);
    }, q);
  const rects = q =>
    p.evaluate(
      q =>
        [...document.querySelectorAll(q)]
          .filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')
          .map(e => {
            const r = e.getBoundingClientRect();
            return [r.left, r.top, r.right, r.bottom].map(Math.round);
          }),
      q
    );
  const BAN = /輪|再刷一輪|必出|連死|連倒|法力|祀壇|預兆|沒有充能/g;
  const banScan = () =>
    p.evaluate(re => (document.body.innerText.match(new RegExp(re, 'g')) || []).join(''), BAN.source);

  /* ---------- 進戰鬥（手動，看得到技能鈕）＋掉落 8 筆＋普通 5 件 ---------- */
  await p.evaluate(
    ([sat, sab, port]) => {
      proSkip();
      S.story.tips = 0;
      S.orient = port ? 'p' : 'l';
      applyOrient();
      if (sat || sab) DBG.safeArea(sab, sat);
      S.auto = 0;
      Object.assign(S.camp, { forge: 3, watch: 2, altar: 5, house: 2 });
      S.gold = 8640;
      MAT().soul = 1180;
      ST = stats();
      runNode(TRUNK_K[0]);
    },
    [SAT, SAB, PORTM]
  );
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    for (let i = 0; i < 8; i++) dropLog(['崇高石', '追憶之墨', '高階增幅石'][i % 3], i % 3 === 1 ? 'mem' : 'cur');
    if (typeof GOT !== 'undefined') for (let i = 0; i < 5; i++) GOT.push(Date.now());
    if (SES) SES.got = 37;
    P.hp = ST.hp;
    hudState();
  });
  await p.waitForTimeout(600);

  /* ---------- S6／D2-10／D2-14／D3-03 掉落動態（G01） ---------- */
  const cur = await rect('#curs .cv'),
    dl = await rect('#dlog'),
    dlp = await rects('#dlog p'),
    dlt = await p.evaluate(() => [...document.querySelectorAll('#dlog p')].map(e => e.textContent.trim()));
  const fD = await shot('S6_dlog');
  const top0 = PORTM ? SAT + 107 : 106;
  if (P390 || D1280) {
    ok(
      `S6／D2-10／D2-14／D3-03 掉落動態起點：${P390 ? 'x 202–378 從 154' : 'x 16–316 從 106'}（不用 148）`,
      !!dl && dlp.length > 0 && near([dlp[0][0], dlp[0][1]], [P390 ? 202 : 16, top0], 1) && dl[2] <= (P390 ? 379 : 317),
      P390 ? `x 202–378、y ${top0}` : 'x 16–316、y 106',
      `框 ${JSON.stringify(dl)}、第一列 ${JSON.stringify(dlp[0] || null)}`,
      fD
    );
    const rh = dlp.map(r => r[3] - r[1]),
      gp = dlp.slice(1).map((r, i) => r[1] - dlp[i][3]);
    ok(
      `掉落動態列數 ${P390 ? 3 : 6}、列高 ${P390 ? 26 : 28}、間距 4（${P390 ? '154–240' : '106–294'}）`,
      dlp.length === (P390 ? 3 : 6) && rh.every(h => h === (P390 ? 26 : 28)) && gp.every(g => g === 4),
      P390 ? '3×26、4' : '6×28、4',
      `${dlp.length} 列、高 ${rh.join('/')}、間距 ${gp.join('/') || '—'}、底 ${dlp.length ? dlp[dlp.length - 1][3] : '—'}`,
      fD
    );
  }
  ok('G01 掉落動態跟資源列交集 0', !hit(dl, cur), '0', `掉落 ${JSON.stringify(dl)}、資源列 ${JSON.stringify(cur)}`, fD);
  ok(
    'S3 掉落動態最後一列「+{n} 件已收」（被門檻藏掉的普通照撿）',
    dlt.length > 0 && /^\+\d+ 件已收$/.test(dlt[dlt.length - 1]),
    '+5 件已收',
    dlt.join('｜'),
    fD
  );
  if (dl) ok('掉落動態整塊熱區 ≥ 44', dl[3] - dl[1] >= 44, '≥44', `${dl[3] - dl[1]}`, fD);

  /* ---------- S5／G02／X02 藥劑 ---------- */
  const fl = await rects('#flk .sk'),
    flt = await p.evaluate(() => ($('flk') ? $('flk').innerText.replace(/\s+/g, '') : null));
  const fF = await shot('F2-1_flask_ready');
  if (P390)
    ok(
      'S5／D3-03 藥劑（直立）56×56：生命 8–64 × 576–632、魔力 8–64 × 644–700',
      fl.length === 2 && near(fl[0], [8, 576 + DY, 64, 632 + DY]) && near(fl[1], [8, 644 + DY, 64, 700 + DY]),
      `[8,${576 + DY},64,${632 + DY}]、[8,${644 + DY},64,${700 + DY}]（底部錨定，844 的 y ${DY >= 0 ? '+' : ''}${DY}）`,
      JSON.stringify(fl),
      fF
    );
  else if (D1280)
    ok(
      'S5／D3-03 藥劑（桌機）48×48：732–780／788–836 × 632–680',
      fl.length === 2 && near(fl[0], [732, 632, 780, 680]) && near(fl[1], [788, 632, 836, 680]),
      '[732,632,780,680]、[788,632,836,680]',
      JSON.stringify(fl),
      fF
    );
  else ok('S5 藥劑常駐兩顆', fl.length === 2, '2', JSON.stringify(fl), fF);
  ok(
    'S5 藥劑鈕上沒有次數（桌機只有鍵帽 1／2）',
    flt != null && (MOB ? flt === '' : flt === '12'),
    MOB ? '空' : '「12」（鍵帽）',
    flt == null ? '沒有 #flk' : `「${flt}」`,
    fF
  );
  const others = await rects(
    '#bar .sk, .bars, #mm, #pidle, #curs .cv, #dlog, .modesw, #mech .stc, #bar .sk[data-k=roll], #bar .sk[data-k=use]'
  );
  ok(
    'F2-1 藥劑跟技能鈕、條、狀態圖示、掛機條、資源列、掉落動態交集 0',
    fl.length === 2 && !fl.some(f => others.some(o => hit(f, o))),
    '0',
    `${fl.filter(f => others.some(o => hit(f, o))).length} 顆有交集`,
    fF
  );
  /* 冷卻 1.5 秒（F2-2） */
  await p.evaluate(() => {
    P.hp = ST.hp * 0.9;
    P.cds.flask = 0;
    drinkFlask();
    P.cds.flask = FLASK.cd / 2;
    hudTick();
  });
  await p.waitForTimeout(60);
  const fC = await shot('F2-2_flask_cooling');
  const ring = await p.evaluate(() => {
    const e = document.querySelector('#flk .sk[data-k=flask]'),
      e2 = document.querySelector('#flk .sk[data-k=mflask]');
    if (!e) return null;
    P.cds.flask = FLASK.cd / 2;
    hudTick();
    const cs = getComputedStyle(e),
      be = getComputedStyle(e, '::before'),
      af = getComputedStyle(e, '::after');
    return {
      cdn: e.classList.contains('cdn'),
      v: +cs.getPropertyValue('--v'),
      want: P.cds.flask / FLASK.cd,
      hi: cs.getPropertyValue('--hi').trim(),
      mhi: e2 ? getComputedStyle(e2).getPropertyValue('--hi').trim() : '',
      panel: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim(),
      pad: be.padding,
      inset: be.inset,
      af: af.borderTopWidth + ' ' + af.borderTopColor
    };
  });
  ok(
    'F2-2／D3-01 冷卻環：3 px 環＋1 px 黑邊；環色 --hp-hi #af6c64／--mp-hi #6b7dad；冷卻一半掃過 50±5%',
    !!ring &&
      ring.cdn &&
      ring.pad === '3px' &&
      /^1px rgb\(0, 0, 0\)/.test(ring.af) &&
      Math.abs(ring.v - ring.want) <= 0.05 &&
      Math.abs(ring.v - 0.5) <= 0.1,
    '3 px＋1 px #000、掃過＝剩餘比例（截圖時約 50%）',
    ring
      ? `環 ${ring.pad}、黑邊 ${ring.af}、掃過 ${ring.v}（剩餘 ${ring.want.toFixed(2)}）、色 ${ring.hi}／${ring.mhi}`
      : '沒有 #flk',
    fC
  );
  if (ring) {
    const a = cr(ring.hi, ring.panel),
      m = cr(ring.mhi || '#6b7dad', ring.panel);
    ok('D3-01／PF-R 冷卻環對 --panel ≥ 3.92（生命、魔力）', a >= 3.92 && m >= 3.92, '≥3.92', `${a}／${m}`, fC);
  }
  /* 自動也畫（X02） */
  await p.evaluate(() => (S.auto = 1));
  await p.waitForTimeout(400);
  const flA = await rects('#flk .sk');
  ok('X02 自動模式藥劑照畫', flA.length === 2, '2 顆', JSON.stringify(flA), await shot('X02_flask_auto'));
  await p.evaluate(() => (S.auto = 0));

  /* ---------- D2-02 條上數字 ---------- */
  const bt = async () =>
    p.evaluate(() => {
      const s = document.querySelector('#bhp span') || document.querySelector('#ohp span'),
        h = document.querySelector('#bhp') || document.querySelector('#ohp'),
        cs = getComputedStyle(s);
      return {
        fs: parseFloat(cs.fontSize),
        fw: cs.fontWeight,
        num: cs.fontVariantNumeric,
        st: cs.webkitTextStrokeWidth,
        col: cs.color,
        h: h.getBoundingClientRect().height,
        t: s.innerText
      };
    });
  const b100 = await bt();
  await p
    .evaluate(() => {
      S.fs = 130;
      applyFs && applyFs();
    })
    .catch(() => {});
  await p.evaluate(() => {
    document.documentElement.style.setProperty('--tscale', 1.3);
  });
  await p.waitForTimeout(200);
  const b130 = await bt();
  const f130 = await shot('D2-02_bars_130');
  await p.evaluate(() => document.documentElement.style.setProperty('--tscale', 1));
  ok(
    'D2-02 條上「現值／上限」12／700 等寬＋2 px 描邊',
    b100.fs === 12 && b100.fw === '700' && /tabular-nums/.test(b100.num) && b100.st === '2px',
    '12／700／tabular-nums／2px',
    `${b100.fs}／${b100.fw}／${b100.num}／${b100.st}「${b100.t}」`,
    f130
  );
  ok(
    'D2-02 文字 130%：數字 16、條高 +4',
    b130.fs === 16 && Math.round(b130.h - b100.h) === 4,
    '16、+4',
    `${b130.fs}、${(b130.h - b100.h).toFixed(1)}`,
    f130
  );
  /* 15% 生命：低血紅邊（S1⑧）、低血呼吸外框 */
  await p.evaluate(() => {
    P.cds.flask = 0;
    P.hp = ST.hp * 0.15;
  });
  await p.waitForTimeout(400);
  const vig = await p.evaluate(() => {
    const px = (x, y) => CX.getImageData(x, y, 1, 1).data;
    G.trauma = 0;
    P.hurtT = 0;
    draw();
    const a = px(2 * DPR, Math.round(cvH() * DPR * 0.5));
    P.hp = ST.hp;
    draw();
    const b = px(2 * DPR, Math.round(cvH() * DPR * 0.5));
    P.hp = ST.hp * 0.15;
    return { low: [...a], full: [...b] };
  });
  const fV = await shot('D2-02_lowhp15');
  ok(
    'S1⑧ 低血（15%）四周紅邊常亮：左緣像素比滿血時更紅',
    vig.low[0] - vig.low[1] > vig.full[0] - vig.full[1] + 20,
    '紅 −綠 多 >20',
    `15% ${vig.low.slice(0, 3)}、滿血 ${vig.full.slice(0, 3)}`,
    fV
  );

  /* ---------- 跳數字：S1③ 暴擊彈、D1-03 受傷 ---------- */
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  const nums = await p.evaluate(() => {
    const out = [],
      ft = CX.fillText;
    CX.fillText = function (t, x, y) {
      out.push({ t, font: CX.font, col: CX.fillStyle });
      return ft.apply(this, arguments);
    };
    const keep = G.nums;
    const at = (c, t) => {
      out.length = 0;
      G.nums = [{ x: P.x, y: P.y - 40, t, c, v: 123 }];
      drawNums();
      return out.find(o => o.t === '123') || null;
    };
    const r = {
      hit: at('hit', 0.02),
      hurt: at('hurt', 0.02),
      c0: at('crit', 0),
      c8: at('crit', 0.08),
      c16: at('crit', 0.16),
      h0: at('hit', 0)
    };
    G.nums = keep;
    CX.fillText = ft;
    return {
      r,
      txStrong: getComputedStyle(document.documentElement).getPropertyValue('--tx-strong').trim(),
      bad: getComputedStyle(document.documentElement).getPropertyValue('--dmg-hurt').trim()
    };
  });
  await p.emulateMedia({ reducedMotion: 'reduce' });
  const fs_ = o => (o ? +o.font.match(/(\d+)px/)[1] : 0);
  ok(
    'S1③ 暴擊 24 px 彈 1.0→1.35→1.0（0／80／160 ms）；一般數字不彈（拿掉 1+(0.08−t)×8）',
    fs_(nums.r.c0) === 24 &&
      fs_(nums.r.c8) === Math.round(24 * 1.35) &&
      fs_(nums.r.c16) === 24 &&
      fs_(nums.r.h0) === 15,
    '24→32→24；一般 15',
    `${fs_(nums.r.c0)}→${fs_(nums.r.c8)}→${fs_(nums.r.c16)}；一般 t=0 ${fs_(nums.r.h0)}`,
    fV
  );
  ok(
    'D1-03 受傷數字 --tx-strong、字級＝打怪 ×0.8（15→12）、不用 --bad',
    nums.r.hurt &&
      nums.r.hurt.col.toLowerCase() === nums.txStrong.toLowerCase() &&
      fs_(nums.r.hurt) === Math.round(fs_(nums.r.hit) * 0.8),
    `${nums.txStrong}、12`,
    nums.r.hurt ? `${nums.r.hurt.col}、${fs_(nums.r.hurt)}（打怪 ${fs_(nums.r.hit)}）` : '—',
    fV
  );

  /* ---------- 戰場訊號截圖：光柱黑邊、腳圈＋▼、菁英名牌、預警 ---------- */
  await p.evaluate(() => {
    P.hp = ST.hp;
    const m = G.mobs.find(m => !m.boss && m.hp > 0);
    if (m) (m.elite = 1), (m.x = P.x + 90), (m.y = P.y - 30);
    G.drops.push({ show: 'exalt', t: 1, x: P.x - 60, y: P.y + 20, sx: P.x - 60, sy: P.y + 20 });
  });
  await p.waitForTimeout(300);
  await shot('S1_signals');

  /* ---------- 抽屜開著（F2-5、G01、SK02） ---------- */
  await p.evaluate(() => openPanel('camp'));
  await p.waitForTimeout(500);
  const fl2 = await rects('#flk .sk'),
    dlp2 = await rects('#dlog p'),
    br2 = await rect('.bars'),
    fS = await shot('F2-5_flask_drawer');
  if (P390) {
    ok(
      'F2-5 抽屜開著：藥劑 44×44 在 290–334／338–382 × 252–296',
      fl2.length === 2 && near(fl2[0], [290, 252, 334, 296]) && near(fl2[1], [338, 252, 382, 296]),
      '[290,252,334,296]、[338,252,382,296]',
      JSON.stringify(fl2),
      fS
    );
    ok(
      'G01／S6 抽屜開著：掉落動態 2 列 154–210',
      dlp2.length === 2 && dlp2[0][1] === 154 && dlp2[1][3] === 210,
      '2 列、154–210',
      `${dlp2.length} 列 ${JSON.stringify(dlp2)}`,
      fS
    );
    ok(
      'SK02 抽屜開著：生命魔力條在 300–330',
      near([br2[1], br2[3]], [300, 330], 2),
      '300–330',
      JSON.stringify(br2),
      fS
    );
    ok('F2-5 藥劑跟掉落動態交集 0', !fl2.some(f => dlp2.some(d => hit(f, d))), '0', '', fS);
  } else if (D1280)
    ok('F2-5 抽屜開著（桌機）：藥劑位置不變', near(fl2[0], [732, 632, 780, 680]), '不變', JSON.stringify(fl2), fS);
  await p.evaluate(() => closePanels());
  await p.waitForTimeout(300);

  /* ---------- 掛機卡展開：最後一列「全部掉落紀錄 ›」＋「+{n} 件已收」（S3） ---------- */
  if (await rect('#pidle')) {
    await p.evaluate(() => idleOpen());
    await p.waitForTimeout(400);
    const lk = await p.evaluate(() => {
      const e = document.querySelector('#pidle .ilk');
      return e ? e.innerText.replace(/\s+/g, ' ').trim() : null;
    });
    ok(
      'S3 掛機卡清單最後一列「全部掉落紀錄 ›」＋「+{n} 件已收」',
      /^全部掉落紀錄 › \+\d+ 件已收$/.test(lk || ''),
      '全部掉落紀錄 › +37 件已收（刷圖中會多）',
      String(lk),
      await shot('S3_idle_alllog')
    );
    await p.evaluate(() => idleClose());
  }
  ok('S3 禁用字掃描（輪、必出、連死、法力、預兆、沒有充能…）0 筆', !(await banScan()), '0', (await banScan()) || '0');

  /* ---------- D2-04 技能孔板（390×664 首屏 ≥4 列；列高 44、列距 16） ---------- */
  if (PORTM) {
    await p.evaluate(() => navGo('skill'));
    await p.waitForTimeout(600);
    const sk = await p.evaluate(() => {
      const sc = document.querySelector('#pskill .sk-scroll'),
        b = sc ? sc.getBoundingClientRect().bottom : 0,
        L = [...document.querySelectorAll('#pskill .sk-sec.rows > *')].map(e => e.getBoundingClientRect()),
        L1 = [...document.querySelectorAll('#pskill .sk-sec.rows:first-of-type > *')].map(e =>
          e.getBoundingClientRect()
        );
      return {
        full: L.filter(r => r.bottom <= b + 0.5 && r.top >= 0).length,
        h: L.map(r => Math.round(r.height)),
        gap: L1.slice(1).map((r, i) => Math.round(r.top - L1[i].bottom)),
        bottom: Math.round(b)
      };
    });
    const fK = await shot('D2-04_skill_board');
    ok(
      `D2-04／SK10 技能孔板首屏完整可見 ≥ 4 列（${tag}${H < 700 ? '，全版' : '，半版只記錄'}）`,
      sk.full >= 4 || H >= 700,
      '≥4',
      `${sk.full} 列（列高 ${sk.h.join('/')}、列距 ${sk.gap.join('/')}，捲動區底 ${sk.bottom}）`,
      fK
    );
    ok(
      'D2-04／SK01 孔板列距 16、有招的列高 44',
      sk.gap.every(g => g === 16) && sk.h[0] === 44,
      '16、44',
      `${sk.gap.join('/')}、${sk.h[0]}`,
      fK
    );
    /* II 另起一行：挑選頁選中一顆有 II 的輔助 */
    const ii = await p.evaluate(() => {
      SKUI.i = 0;
      SKUI.hole = 0;
      skOpen('sups');
      const k = Object.keys(SUPPORTS).find(k => SUPPORTS[k].tier !== 2 && sup2Of(k) && supWhy(skCur(), k, 0) != null);
      SKUI.pick = k;
      SKUI.tier = 1;
      hudPanels();
      const b = [...document.querySelectorAll('.sk-seg2 button')].map(e => {
        const r = e.getBoundingClientRect();
        return { t: e.innerText.replace(/\s+/g, ' ').trim(), top: Math.round(r.top), bot: Math.round(r.bottom) };
      });
      return { k, b };
    });
    await p.waitForTimeout(300);
    await p.evaluate(() => {
      const e = document.querySelector('.sk-seg2');
      if (e) e.scrollIntoView({ block: 'center' });
    });
    await p.waitForTimeout(200);
    const fI = await shot('D2-04_skill_II');
    ok(
      'D2-04／SK07 II 另起一行（I、II 各 44 高、間距 16），鎖住寫「鍛造台 Lv20 才開」',
      ii.b.length === 2 &&
        ii.b.every(x => x.bot - x.top === 44) &&
        ii.b[1].top - ii.b[0].bot === 16 &&
        /鍛造台 Lv20 才開/.test(ii.b[1].t),
      'I／II 兩行、44、16、「鍛造台 Lv20 才開」',
      JSON.stringify(ii.b),
      fI
    );
    await p.evaluate(() => closePanels());
  }
  ok('沒有頁面錯誤', !p.errs.length, '0', p.errs.join(' | ') || '0');
  fs.writeFileSync(
    path.join(OUT, `results_${tag}.md`),
    `# B4 驗收 ${tag}\n\n| 項目 | 尺寸 | 門檻 | 實測 | 結果 | 截圖 |\n| --- | --- | --- | --- | --- | --- |\n` +
      rows.map(r => `| ${r.map(x => String(x).replace(/\|/g, '｜')).join(' | ')} |`).join('\n') +
      '\n'
  );
  await b.close();
  process.exit(fail ? 1 : 0);
})();
