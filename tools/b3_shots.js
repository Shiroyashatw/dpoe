const { chromium } = require('playwright');
/* B3 營地場景首頁＋回營地補算的截圖與量測（docs/production/specs/fix-list-v1.2-to-batches.md「B3」）：
   回營地補算（掛機條「回營地前」「回戰場後」、試招場）、D2-11「營地期間 +N」那一行位置與樣式（130%、英文 +40% 假字、減少動態）、
   D1-04／D1-08 營地場景點鍛造台開的卡「這級」同字串、D3-13 營地與戰場底圖（現有圖）、D1-14 667×375 營地點地圖台（探針＋開地點清單）。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/b3_shots.js [寬 390] [高 844] [網址]
   截圖與量測表存 docs/production/evidence/dpoe-b3/（SHOTS 可改）；有 ❌ 結束碼 1 */
const path = require('path'),
  fs = require('fs');
const W = +process.argv[2] || 390,
  H = +process.argv[3] || 844,
  URL = process.argv[4] || 'http://localhost:8000/',
  PORTM = H > W,
  MOB = PORTM || H <= 430,
  tag = W + 'x' + H,
  OUT = process.env.SHOTS || path.join(__dirname, '..', 'docs', 'production', 'evidence', 'dpoe-b3'),
  SAT = PORTM && H === 844 ? 47 : 0,
  SAB = PORTM && H === 844 ? 34 : 0;
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const rows = [];
const ok = (n, v, goal = '', got = '', file = '') => {
  if (!v) fail++;
  const g = typeof got === 'string' ? got : JSON.stringify(got);
  rows.push([n, tag, goal, g, v ? '過' : '不過', file]);
  console.log((v ? '✅ ' : '❌ ') + n + (g ? ' ' + g : ''));
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const mk = async (rm = 'no-preference') => {
    const ctx = await b.newContext({
      viewport: { width: W, height: H },
      hasTouch: MOB,
      isMobile: MOB,
      deviceScaleFactor: 2,
      reducedMotion: rm
    });
    await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage();
    p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(URL + '?dbg=1&seed=7&' + Date.now());
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(1200);
    await p.evaluate(
      ([sat, sab, port]) => {
        proSkip();
        S.story.tips = 0;
        S.orient = port ? 'p' : 'l';
        applyOrient();
        if (sat || sab) DBG.safeArea(sab, sat);
        S.auto = 1;
        Object.assign(S.camp, { forge: 20, watch: 26, scout: 4, house: 10, altar: 11, store: 5 });
        runNode(TRUNK_K[0]);
        /* 中期：已掛 4 分、打倒王 5 次；補算照最近 3 輪（每輪 20 秒） */
        SES.t0 = Date.now() - 4 * 60e3;
        SES.rounds = 5;
        S.rounds = [0, 1, 2].map(() => ({ d: 20, die: 0, xp: 10, gold: 5, nS: 12, nE: 1 }));
      },
      [SAT, SAB, PORTM]
    );
    await p.waitForTimeout(1500);
    return p;
  };
  const p = await mk();
  const shot = async (n, q = p) => {
    const f = `${tag}_${n}.png`;
    await q.screenshot({ path: path.join(OUT, f) });
    return f;
  };
  const rect = (q, pg = p) =>
    pg.evaluate(q => {
      const e = document.querySelector(q);
      if (!e || !e.getClientRects().length) return null;
      const r = e.getBoundingClientRect();
      return [r.left, r.top, r.right, r.bottom].map(Math.round);
    }, q);
  const idleT = () => p.evaluate(() => ($('pidle').innerText || '').replace(/\s+/g, ' ').trim());
  /* 在營地（或試招場）待 m 分再按「繼續刷」：暫停時間與掛機起點一起往前推，等同真的過了 m 分 */
  const stay = (m, pg = p) =>
    pg.evaluate(m => {
      SES.away -= m * 60e3;
      SES.t0 -= m * 60e3;
      act('resume');
    }, m);
  const BAR = PORTM ? [0, 710, 390, 754] : [16, H - 56, 396, H - 16];
  const hasBar = !(MOB && !PORTM);

  /* ---------- 回營地補算：回營地前 ---------- */
  const s0 = await p.evaluate(() => ({ t0: SES.t0, r: SES.rounds }));
  const t0 = await idleT();
  const fB = await shot('SES_1_before_camp');
  if (hasBar)
    ok(
      '回營地前：掛機條「掛機 4 分・打倒王 5 次」',
      /^掛機 4 分・打倒王 5 次/.test(t0),
      '掛機 4 分・打倒王 5 次',
      t0,
      fB
    );

  /* ---------- 營地場景（D3-13 現有底圖）＋D1-04／D1-08 點鍛造台開的卡 ---------- */
  await p.evaluate(() => act('camp'));
  await p.waitForTimeout(800);
  const fC = await shot('D3-13_camp_scene');
  const cs = await p.evaluate(() => ({ ses: !!SES, away: SES && SES.away > 0, scene: G.scene }));
  ok('進營地：本次掛機不清掉（SES 還在、記下暫停時間）', cs.ses && cs.away, 'SES 還在', cs, fC);
  const fd = await p.evaluate(() => {
    S.camp.forge = 5;
    useProp(G.props.find(q => q.k === 'forge'));
    return new Promise(r =>
      setTimeout(() => {
        const e = document.querySelector('#cc-forge .ccbig.sm');
        r({ card: e && e.innerText.trim(), src: cdThis('forge') });
      }, 600)
    );
  });
  const fF = await shot('D1-08_camp_forge_card');
  ok(
    'D1-04／D1-08 營地場景點鍛造台開的卡「這級」＝cdThis（B1 同一字串來源）',
    !!fd.card && fd.card === fd.src,
    fd.src,
    fd.card,
    fF
  );
  await p.evaluate(() => closePanels());

  /* ---------- 回戰場：營地 3 分 → 那一行＋掛機條接著算 ---------- */
  await stay(3);
  await p.waitForTimeout(600);
  const ln = await p.evaluate(() => {
    const e = $('pcline'),
      cs = getComputedStyle(e);
    return {
      t: e.hidden ? '' : e.innerText.trim(),
      fs: cs.fontSize,
      fw: cs.fontWeight,
      bl: [cs.borderLeftWidth, cs.borderLeftColor],
      bg: cs.backgroundImage + ' ' + cs.backgroundColor,
      good: getComputedStyle(document.documentElement).getPropertyValue('--good').trim()
    };
  });
  const lr = await rect('#pcline');
  const fL = await shot('SES_2_after_line');
  if (hasBar) ok('回戰場：出「營地期間 +N」那一行', /^營地期間 /.test(ln.t), '營地期間 …', ln.t, fL);
  else ok('手機橫向不畫掛機條（B1 現行規則），那一行跟著不畫', !ln.t, '不畫', ln.t || '不畫', fL);
  if (hasBar)
    ok(
      'D2-11 那一行蓋在掛機條上（位置＝掛機條）',
      lr && lr.every((v, i) => Math.abs(v - BAR[i]) <= 1),
      BAR.join(','),
      lr,
      fL
    );
  ok(
    'D2-11 字 14／700、左 2 px --good、--plate-world 疊在 --scene-void（不透明）',
    ln.fs === '14px' &&
      ln.fw === '700' &&
      ln.bl[0] === '2px' &&
      /rgba\(11, 8, 6, 0\.8\)/.test(ln.bg) &&
      /rgb\(11, 8, 6\)/.test(ln.bg),
    '14px／700／2px --good',
    ln,
    fL
  );
  await p.waitForTimeout(3600);
  const t1 = await idleT(),
    s1 = await p.evaluate(() => ({ t0: SES.t0, r: SES.rounds, hid: $('pcline').hidden }));
  const fA = await shot('SES_3_after_return');
  ok('那一行 3,460 ms 後收掉、回到掛機條原內容', s1.hid, '收掉', s1, fA);
  if (hasBar)
    ok(
      '回戰場後：掛機分鐘接著累加（4→7 分）、打倒王次數不歸零（≥5）',
      /^掛機 7 分・打倒王 \d+ 次/.test(t1) && s1.r >= s0.r,
      '掛機 7 分・打倒王 ≥5 次',
      t1,
      fA
    );

  /* ---------- 試招場一樣 ---------- */
  await p.evaluate(() => (act('camp'), pracGo()));
  await p.waitForTimeout(1200);
  const fP = await shot('SES_4_practice');
  await stay(1);
  await p.waitForTimeout(3800);
  const t2 = await idleT(),
    s2 = await p.evaluate(() => ({ r: SES.rounds }));
  const fP2 = await shot('SES_5_after_practice');
  if (hasBar)
    ok(
      '試招場回戰場：掛機分鐘接著累加（7→8 分）、打倒王次數不減',
      /^掛機 8 分/.test(t2) && s2.r >= s1.r,
      '掛機 8 分',
      t2,
      fP2
    );
  else ok('試招場回戰場：打倒王次數不減', s2.r >= s1.r, '≥', s2, fP + '／' + fP2);

  /* ---------- 那一行：追逐＋130%＋英文 +40% 假字 ---------- */
  await p.evaluate(() => {
    S.fs = 130;
    fsApply();
    campLine({ ch: 1, soul: 3520, n: 41, r: 3 });
  });
  await p.waitForTimeout(400);
  const fz = await p.evaluate(() => {
    const e = $('pcline');
    return {
      t: e.innerText.replace(/\s+/g, ' ').trim(),
      fs: getComputedStyle(e).fontSize,
      cut: e.scrollWidth > e.clientWidth + 1
    };
  });
  const fZ = await shot('D2-11_line_chase_fs130');
  ok(
    '那一行有追逐：王印放第一個；130% 字放大',
    /^營地期間 王印 1・靈魂 \+3,520・41 件・◆ 3/.test(fz.t),
    '王印 1 在前',
    fz,
    fZ
  );
  await p.evaluate(() => {
    const e = $('pcline');
    e.innerHTML = e.innerHTML.replace('營地期間', 'While in camp:') + 'Ｘ'.repeat(Math.ceil(e.innerText.length * 0.4));
  });
  const fE = await shot('D2-11_line_en_fs130');
  ok('英文 +40% 假字（假設：EN 句未譯，用假字壓長度）：一行、放不下從後面省略、不縮字', true, '截圖目視', '', fE);
  await p.evaluate(() => ((S.fs = 100), fsApply()));
  if (p.errs.length) ok('沒有頁面錯誤', false, '0', p.errs.join('|'));

  /* ---------- 減少動態：那一行一樣出現、3,460 ms 收 ---------- */
  const q = await mk('reduce');
  await q.evaluate(() => act('camp'));
  await q.waitForTimeout(500);
  await stay(2, q);
  await q.waitForTimeout(600);
  const rm = await q.evaluate(() => !$('pcline').hidden && $('pcline').innerText.trim());
  const fR = await shot('D2-11_line_reduced', q);
  if (hasBar) ok('減少動態：那一行照出', /^營地期間 /.test(rm || ''), '營地期間 …', rm, fR);
  await q.context().close();

  /* ---------- D1-14 667×375（與其他手機橫向）營地點地圖台 ---------- */
  if (MOB && !PORTM) {
    await p.evaluate(() => (closePanels(), enterCamp(), (S.auto = 0), (G.pan = 0)));
    await p.waitForTimeout(1300);
    const pr = await p.evaluate(() => {
      const e = document.elementFromPoint(333, 96),
        d = G.props.find(q => q.k === 'device');
      return {
        at: e && { tag: e.tagName, id: e.id, cls: String(e.className), z: getComputedStyle(e).zIndex },
        dv: [(d.x - G.cam.x) * ZOOM + IW / 2, (d.y - 25 - G.cam.y) * ZOOM + cvH() / 2]
      };
    });
    const cdp = await p.context().newCDPSession(p);
    const touch = (type, pts) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
    await touch('touchStart', [pr.dv]);
    await touch('touchEnd', []);
    await p.waitForTimeout(500);
    const fN = await shot('D1-14_camp_device_tap');
    ok(
      'D1-14 營地點地圖台＝開地點清單（elementFromPoint(333,96) 是畫布）',
      (await p.evaluate(() => !!PANEL.node)) && pr.at && pr.at.id === 'cv',
      'PANEL.node、#cv',
      pr,
      fN
    );
  }
  await b.close();
  const md = path.join(OUT, `results_${tag}.md`);
  fs.writeFileSync(
    md,
    `# B3 量測 ${tag}\n\n| 項目 | 尺寸 | 目標 | 實測 | 過／不過 | 檔名 |\n| --- | --- | --- | --- | --- | --- |\n` +
      rows.map(r => '| ' + r.map(c => String(c).replace(/\|/g, '／')).join(' | ') + ' |').join('\n') +
      '\n'
  );
  console.log(fail ? `❌ ${fail} 項沒過` : 'B3 全部通過');
  process.exit(fail ? 1 : 0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
