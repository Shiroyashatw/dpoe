const { chromium } = require('playwright');
/* M2-12 第一段（刷圖外框）驗收：規格 docs/production/specs/M2-12-shell-part1.md §12 的 A／B／C／D 與 §13 的量測、截圖。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/shell_check.js [寬 390] [高 844] [網址]
   直立 390×844 模擬安全區上 47、下 34（DBG.safeArea）；其他直立尺寸不模擬（瀏覽器分頁）。
   截圖存 docs/production/evidence/dpoe-ui1a/<寬x高>_*.png；量測表存同一夾的 measure_<寬x高>.md（項目｜尺寸｜目標｜實測｜過／不過｜檔名）。有 ❌ 結束碼 1 */
const path = require('path'),
  fs = require('fs');
const W = +process.argv[2] || 390,
  H = +process.argv[3] || 844,
  URL = process.argv[4] || 'http://localhost:8000/',
  PORTM = H > W,
  tag = W + 'x' + H,
  OUT = process.env.SHOTS || path.join(__dirname, '..', 'docs', 'production', 'evidence', 'dpoe-ui1a'),
  SAT = PORTM && H === 844 ? 47 : 0,
  SAB = PORTM && H === 844 ? 34 : 0;
fs.mkdirSync(OUT, { recursive: true });
const shotF = n => `${tag}_${n}.png`;
let fail = 0;
const rows = [];
/* 一條驗收：名稱、條件、目標、實測、截圖檔名 */
const ok = (n, v, goal = '', got = '', file = '') => {
  if (!v) fail++;
  rows.push([n, tag, goal, typeof got === 'string' ? got : JSON.stringify(got), v ? '過' : '不過', file]);
  console.log(
    (v ? '✅ ' : '❌ ') + n + (got !== '' ? ' ' + (typeof got === 'string' ? got : JSON.stringify(got)) : '')
  );
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    hasTouch: PORTM,
    isMobile: PORTM,
    deviceScaleFactor: 2
  });
  await ctx.route(/supabase/, r => r.abort()); /* 假存檔不能同步到正式雲端 */
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?dbg=1&seed=7&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1200);
  /* 手機用 tap（滑鼠事件會讓遊戲切回桌機操作） */
  const press = (q, o) => (PORTM ? p.tap(q, o) : p.click(q, o));
  const shot = async n => (await p.screenshot({ path: path.join(OUT, shotF(n)) }), shotF(n));
  const frames = (n = 2) =>
    p.evaluate(
      n =>
        new Promise(r =>
          (function f(i) {
            i ? requestAnimationFrame(() => f(i - 1)) : r();
          })(n)
        ),
      n
    );
  await p.evaluate(
    ([sat, sab, port]) => {
      proSkip();
      S.story.tips = 0;
      S.orient = port ? 'p' : 'l';
      applyOrient();
      if (sat || sab) DBG.safeArea(sab, sat);
      S.auto = 1;
      Object.assign(S.camp, { forge: 3, watch: 2, altar: 4, house: 2 });
      ST = stats();
      runNode(TRUNK_K[0]);
    },
    [SAT, SAB, PORTM]
  );
  await p.waitForTimeout(1500);
  const rect = q =>
    p.evaluate(q => {
      const e = typeof q === 'string' ? document.querySelector(q) : null;
      if (!e || !e.getClientRects().length) return null;
      const r = e.getBoundingClientRect();
      return [r.left, r.top, r.right, r.bottom].map(Math.round);
    }, q);
  /* 骨架裡看得到、可以點的東西：[選擇器, 左, 上, 寬, 高] */
  const clickables = sel =>
    p.evaluate(sel => {
      const L = [];
      for (const e of document.querySelectorAll(sel)) {
        if (!e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') continue;
        const r = e.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        L.push(
          [(e.id || e.className || e.tagName).toString().slice(0, 24), r.left, r.top, r.width, r.height].map(v =>
            typeof v === 'number' ? Math.round(v) : v
          )
        );
      }
      return L;
    }, sel);
  const SK = '#pidle button, #pnav button, #dnav button, #pcamp button, #poff button, #dplate button';

  /* ---------- C／A：版面（沒開面板） ---------- */
  const cv = await rect('#cv'),
    idle = await rect('#pidle'),
    navR = await rect(PORTM ? '#pnav' : '#dnav'),
    area = await rect('#area');
  const f1 = await shot('01_battle');
  if (PORTM) {
    const avail = H - SAT - SAB - 100;
    ok(
      'C 沒開面板時戰場高（直立）',
      cv[1] === SAT && cv[3] - cv[1] === avail,
      H === 844 ? '47–710（663）' : `${SAT}–${SAT + avail}（${avail}）`,
      `${cv[1]}–${cv[3]}（${cv[3] - cv[1]}）`,
      f1
    );
    ok(
      'A 掛機條 y 範圍',
      idle[1] === H - SAB - 100 && idle[3] === H - SAB - 56 && idle[0] === 0 && idle[2] === W,
      `${H - SAB - 100}–${H - SAB - 56}、寬 ${W}`,
      `${idle[1]}–${idle[3]}、x ${idle[0]}–${idle[2]}`,
      f1
    );
    const nb = await clickables('#pnav button');
    ok(
      'A 底部分頁 6 格、y 範圍、每格 ≥44',
      nb.length >= 5 && nb.every(r => r[2] === H - SAB - 56 && r[2] + r[4] === H - SAB && r[3] >= 44),
      `${H - SAB - 56}–${H - SAB}、6 格（天賦照祭壇）`,
      nb.map(r => `${r[2]}–${r[2] + r[4]}×${r[3]}`).join(' '),
      f1
    );
    ok(
      'A 資訊列在安全區下面、寬 ≤270 附近',
      area[1] >= SAT && area[1] <= SAT + 10,
      '52–88',
      `${area[1]}–${area[3]}、x ${area[0]}–${area[2]}`,
      f1
    );
  } else {
    ok(
      'A 掛機條（桌機）380×40 左下',
      idle[0] === 16 && idle[2] === 396 && idle[1] === H - 56 && idle[3] === H - 16,
      'x 16–396、y 664–704',
      `x ${idle[0]}–${idle[2]}、y ${idle[1]}–${idle[3]}`,
      f1
    );
    const nb = await clickables('#dnav button');
    ok(
      'A 分頁（桌機頂列右）66×52、y 10–62、右緣 1264',
      navR[2] === W - 16 && nb.every(r => r[3] === 66 && r[4] === 52 && r[2] === 10),
      'x …–1264、y 10–62、66×52',
      `x ${navR[0]}–${navR[2]}、${nb.map(r => r[3] + '×' + r[4]).join(' ')}`,
      f1
    );
    ok('C 桌機戰場整個視窗（抽屜疊在右側）', cv[3] - cv[1] === H, String(H), String(cv[3] - cv[1]), f1);
  }
  /* A 安全區：上 47、下 34 內沒有可點元素 */
  if (PORTM && SAT) {
    const all = await clickables('button, [data-a], [data-tm], [data-fg], [data-cd], a');
    const bad = all.filter(r => r[2] < SAT || r[2] + r[4] > H - SAB);
    ok(
      'A 安全區內可點元素數（上 47、下 34）',
      bad.length === 0,
      '0',
      `${bad.length}${bad.length ? ' ' + JSON.stringify(bad.slice(0, 4)) : ''}`,
      f1
    );
  }
  /* A 字級：骨架的字（掛機條、分頁、資訊列） */
  const fsz = await p.evaluate(() =>
    Math.min(
      ...[...document.querySelectorAll('#pidle *, #pnav span, #dnav span, #area')]
        .filter(e => e.getClientRects().length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
        .map(e => parseFloat(getComputedStyle(e).fontSize))
    )
  );
  ok('A 字級（骨架最小字）', fsz >= 14, '≥14', String(fsz), f1);
  /* A 名詞：畫面上沒有「輪」「再刷一輪」「法力」「祀壇」 */
  const noWord = () => p.evaluate(() => (document.body.innerText.match(/輪|再刷一輪|法力|祀壇/g) || []).join(''));
  ok('A 名詞：戰鬥畫面沒有「輪」「法力」「祀壇」', !(await noWord()), '0 個', (await noWord()) || '0 個', f1);

  /* ---------- D 掛機條：收起時看得到掛機時間、保底 %、最近一筆稀有以上；展開 200、6 秒自動收 ---------- */
  const mapT0 = await p.evaluate(() => G.mapT);
  await p.evaluate(() => {
    G.mapT = lvT(TRUNK[14].lv); /* 只換畫面上用的地點等級：保底只在怪物 Lv≥45 出現（量完換回來） */
    chaseOf().pts = 210;
    (S.log = S.log || []).unshift({ t: Date.now(), n: '崇高石', c: 'cur' });
    SES.t0 = Date.now() - 16 * 60e3;
    idleBar(1);
  });
  await p.waitForTimeout(300);
  const it = await p.evaluate(() => [
    $('pidle').querySelector('.ib > b').textContent,
    ($('pidle').querySelector('.ipb') || {}).textContent || '',
    ($('pidle').querySelector('.ilast') || {}).textContent || '',
    $('pidle').querySelector('.ib').getAttribute('aria-label')
  ]);
  const f4a = await shot('04a_idle');
  ok(
    'D 掛機條收起：掛機 N 分・保底 n%・最近一筆稀有以上（不寫輪）',
    it[0] === '掛機 16 分' && it[1] === '保底 42%' && /崇高石/.test(it[2]) && !/輪/.test(it.join('')),
    '掛機 16 分／保底 42%／◆崇高石',
    it.slice(0, 3).join('｜'),
    f4a
  );
  ok('A 讀屏：掛機條 aria-label', it[3] === '掛機 16 分，下一件保底 42%', '掛機 16 分，下一件保底 42%', it[3], f4a);
  const t6 = Date.now();
  await press('#pidle .ib');
  await p.waitForTimeout(400);
  const ex = await rect('#pidle');
  const f4b = await shot('04b_idle_open');
  ok(
    'D 掛機條展開 200 高、看得到下一個目標',
    ex[3] - ex[1] === 200 && !!(await rect('#pidle .goal')),
    '200',
    String(ex[3] - ex[1]),
    f4b
  );
  ok('A 名詞：掛機條展開沒有「輪」', !(await noWord()), '0 個', (await noWord()) || '0 個', f4b);
  await p.waitForFunction(() => !$('pidle').classList.contains('open'), null, { timeout: 9000 }).catch(() => {});
  const auto = Date.now() - t6;
  ok('D 掛機條 6 秒沒操作自動收', auto >= 5400 && auto <= 6800, '6000 ms', auto + ' ms', f4b);
  await p.evaluate(() => {
    for (let i = 0; S.inv.items.length < INV_CAP * 0.95 && i < 400; i++) invPut(S.inv, dropItem(5));
    idleBar(1);
  });
  await p.waitForTimeout(200);
  const full = await p.evaluate(() => $('pidle').querySelector('.ib > b').textContent);
  ok('D 倉庫快滿取代左字', full === '倉庫快滿', '倉庫快滿', full, await shot('04c_idle_full'));
  await p.evaluate(() => {
    S.inv.items.length = 10;
    offBack(null, { wood: 12000 }, 4 * 60e3 + 5e3);
  });
  await p.waitForTimeout(200);
  const away = await p.evaluate(() => [$('pidle').querySelector('.ib > b').textContent, $('poff').hidden]);
  ok(
    'D 離開 60 秒–10 分：只在掛機條一行',
    /^離開 4 分・木 \+12,000$/.test(away[0]) && away[1],
    '離開 4 分・木 +12,000（不出結算卡）',
    away.join('｜'),
    await shot('04d_idle_away')
  );
  await p.evaluate(m => ((IDLE.msg = ''), (G.mapT = m)), mapT0);

  /* ---------- 換波：介面 0 位移、不出字 ---------- */
  /* 同一個 evaluate 裡：量一次 → 放下一波 → 等兩格 → 再量（時間窗只有兩格，不被別的事件干擾）；掉落動態（§5.2 照舊）不算 */
  const wv = await p.evaluate(async () => {
    G.waves = G.waves && G.waves.length ? G.waves : [[]];
    $('warn').textContent = '';
    await new Promise(r => setTimeout(r, 300));
    const snap = () =>
      JSON.stringify([
        [
          ...document.querySelectorAll(
            '#hud > *, #hud .top > :not(#dlog), #hud .bottom, #bar, #pidle, #pidle .ib > *, #pnav, #pnav button, #dnav, #dnav button'
          )
        ]
          .filter(e => e.getClientRects().length)
          .map(e => {
            const r = e.getBoundingClientRect();
            return [
              e.id || e.className,
              Math.round(r.left),
              Math.round(r.top),
              Math.round(r.width),
              Math.round(r.height)
            ];
          }),
        $('banner').hidden
      ]);
    const s0 = snap(),
      n0 = G.waveN;
    spawnWave();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const s1 = snap();
    return [s0 === s1, G.waveN - n0, $('warn').textContent, s0 === s1 ? '' : s0 + ' ≠ ' + s1];
  });
  ok(
    'B 換波 0 ms：介面 0 位移、不出字',
    wv[0] && wv[1] === 1 && !wv[2],
    '0 位移、0 字',
    wv[0] ? `0 位移・字「${wv[2]}」` : wv[3].slice(0, 300),
    ''
  );

  /* ---------- 王橫幅 800＋240 ms → 王血條 ---------- */
  await p.evaluate(() => {
    /* 自己放一隻新的王（場上原本的王可能已經在打、或剛倒下要換輪） */
    G.nextT = 0;
    G.mobs = G.mobs.filter(m => !m.boss);
    HV.boss = null;
    spawnBoss();
    /* 量橫幅時不要讓主角被打倒（倒下會重開這一輪、王血條就收起來） */
    for (const m of G.mobs) (m.dmg = 0), (m.hp = m.mhp = 1e9), m.boss && (m.aggro = 1);
  });
  await p.waitForFunction(() => $('bossbar').classList.contains('intro'), null, { timeout: 4000 }).catch(() => {});
  const an = await p.evaluate(() => {
    const a = $('bossbar').getAnimations()[0];
    if (!a) return null;
    const k = a.effect.getKeyframes(),
      hold = k.find(x => x.offset > 0.5 && x.offset < 1);
    return {
      name: a.animationName,
      d: a.effect.getTiming().duration,
      hold: hold ? Math.round(hold.offset * a.effect.getTiming().duration) : null,
      t: a.currentTime
    };
  });
  await p.waitForTimeout(Math.max(0, 300 - ((an && an.t) || 0)));
  const bn = await rect('#bossbar'),
    btxt = await p.evaluate(() => $('bossbar').innerText.replace(/\s+/g, ''));
  const f5a = await shot('05a_boss_banner');
  await p.waitForTimeout(1000);
  const bb = await rect('#bossbar');
  const f5b = await shot('05b_boss_bar');
  ok(
    'B 王橫幅停 800 ms、240 ms 縮成王血條（CSS 動畫）',
    !!an && an.d === 1040 && an.hold === 800,
    '800＋240',
    an ? `${an.hold}＋${an.d - an.hold}（${an.name}）` : '沒有動畫',
    f5a
  );
  /* 直立：橫幅 x 12–378 縮到血條 x 12–270；桌機：橫幅在血條下面 60 px（y 76–120 → 16–56） */
  const shrunk = PORTM ? bn && bb && bn[2] - bn[0] > bb[2] - bb[0] + 60 : bn && bb && bn[1] - bb[1] >= 55;
  ok(
    'A 王橫幅 ≥44 高「{王名}現身」、800＋240 ms 後縮成王血條',
    !!(
      bn &&
      bn[3] - bn[1] >= 44 &&
      /現身/.test(btxt) &&
      shrunk &&
      !/現身/.test(await p.evaluate(() => $('bossbar').innerText))
    ),
    PORTM ? '橫幅 x 12–378 → 血條 x 12–270' : '橫幅 y 76–120 → 血條 y 16–56',
    bn && bb
      ? `橫幅 x ${bn[0]}–${bn[2]} y ${bn[1]}–${bn[3]} → 血條 x ${bb[0]}–${bb[2]} y ${bb[1]}–${bb[3]}「${btxt}」`
      : '沒有',
    f5b
  );
  /* 最忙的戰鬥：王＋整波＋掉落動態 */
  await p.evaluate(() => {
    for (let i = 0; i < 3; i++) dropLog(['崇高石', '完美崇高石', '破裂石'][i], ['cur', 'perf', 'cur'][i]);
    for (const w of G.waves || []) spawnWave();
  });
  await p.waitForTimeout(500);
  await shot('01b_busy');

  /* ---------- 王倒下：慢動作、爆開＋光柱、沒有結算卡、沒有「輪」 ---------- */
  const bd = await p.evaluate(async () => {
    if (!G.mobs.some(x => x.boss && !x.mini)) spawnBoss();
    const m = G.mobs.find(x => x.boss && !x.mini);
    devChase();
    m.hp = 1;
    killMob(m);
    const r = [G.slow, G.slowK, $('over').hidden, !!G.nextT];
    await new Promise(r => setTimeout(r, 250));
    return r;
  });
  const f2 = await shot('02_boss_down');
  ok(
    'B 王倒下：400 ms 慢動作 0.6 倍、不出卡',
    Math.abs(bd[0] - 0.4) < 0.05 && bd[1] === 0.6 && bd[2] && bd[3],
    '0.4 秒×0.6、#over 不出',
    `${bd[0].toFixed(2)} 秒×${bd[1]}、卡 ${bd[2] ? '沒出' : '出了'}`,
    f2
  );
  ok('A 王倒下畫面沒有「輪」「再刷一輪」', !(await noWord()), '0 個', (await noWord()) || '0 個', f2);
  const fxKeep = await p.evaluate(async () => {
    await new Promise(r => setTimeout(r, 2300));
    return [G.round, G.fx.length, G.state];
  });
  ok(
    'B 後台 2 秒空檔照舊（下一輪開始）、特效接著跑',
    fxKeep[0] >= 2 && fxKeep[2] === 'play',
    'round+1、play',
    JSON.stringify(fxKeep),
    ''
  );

  /* ---------- 倒下 ≤3000 ms 回戰場；連死 3 次停下＋繼續刷 ---------- */
  const dd = await p.evaluate(async () => {
    S.auto = 1;
    S.world.dn = 0;
    const t0 = performance.now();
    die();
    await new Promise(r => setTimeout(r, 350));
    const pl = [
      $('dplate').hidden,
      $('dplate').innerText,
      document.body.classList.contains('downed'),
      $('over').hidden
    ];
    while (G.state === 'dead' && performance.now() - t0 < 6000) await new Promise(r => setTimeout(r, 16));
    return [Math.round(performance.now() - t0), ...pl];
  });
  ok('B 倒下到能再操作 ≤3000 ms（自動）', dd[0] <= 3000, '≤3000 ms', dd[0] + ' ms', '');
  ok(
    'D 倒下：中下方字板「倒下・{s} 秒後回到戰場」、去色、不出卡',
    !dd[1] && /^倒下・\d 秒後回到戰場$/.test(dd[2]) && dd[3] && dd[4],
    '字板、去色、沒有選單',
    dd.slice(1).join('｜'),
    ''
  );
  await p.evaluate(() => {
    S.world.dn = 2;
    die();
  });
  await p.waitForTimeout(400);
  const f7 = await shot('07_down_plate');
  await p.waitForFunction(() => G.halt, null, { timeout: 4000 }).catch(() => {});
  const halt = await p.evaluate(() => [
    G.state,
    $('dplate').innerText,
    document.querySelectorAll('#dplate button').length,
    $('over').hidden
  ]);
  const f7b = await shot('07b_halt');
  ok(
    'D 連死 3 次停下：字板「連續倒下 3 次・已停下」＋只有「繼續刷」（沒有回營地）',
    halt[0] === 'dead' && /連續倒下 3 次・已停下/.test(halt[1]) && /繼續刷/.test(halt[1]) && halt[2] === 1 && halt[3],
    '停下＋繼續刷',
    halt.join('｜'),
    f7b
  );
  const go = await rect('#dplate button');
  ok(
    'A 「繼續刷」184×56',
    go && go[2] - go[0] === 184 && go[3] - go[1] >= 56,
    '184×56',
    go ? `${go[2] - go[0]}×${go[3] - go[1]}` : '沒有',
    f7b
  );
  await press('#dplate button');
  await p.waitForTimeout(300);
  ok(
    'D 按「繼續刷」原地重開',
    await p.evaluate(() => G.state === 'play' && !G.halt && $('dplate').hidden),
    'play',
    await p.evaluate(() => G.state),
    f7
  );

  /* ---------- 營地升級抽屜：戰場 283、抽屜 330–710（桌機 420×536）、1 顆實心印章、升級一下就好、300 ms 內重複不算 ---------- */
  await p.evaluate(() => {
    MAT().soul = 1e6;
    matAdd('wood', 0, 1e6);
    for (const k of GEN_K) if (k !== 'wood' && genOn(k)) matAdd(k, genTier(k), 1e5);
    S.gold = 1e6;
    closePanels();
  });
  await press(PORTM ? '#pnav [data-tm="nav:craft"]' : '#dnav [data-tm="nav:craft"]');
  await p.waitForTimeout(500);
  const cv2 = await rect('#cv'),
    dr = await rect('#pcamp');
  const f3 = await shot('03a_drawer');
  if (PORTM) {
    const avail = H - SAT - SAB - 100,
      sh = Math.min(380, avail - 280);
    ok(
      'C 開營地升級抽屜時戰場高（直立）',
      cv2[3] - cv2[1] === avail - sh && cv2[1] === SAT,
      H === 844 ? '47–330（283）' : `${avail - sh}`,
      `${cv2[1]}–${cv2[3]}（${cv2[3] - cv2[1]}）`,
      f3
    );
    ok(
      'A 營地升級 y 範圍（直立）',
      dr[1] === cv2[3] && dr[3] === H - SAB - 100,
      H === 844 ? '330–710' : `${cv2[3]}–${H - SAB - 100}`,
      `${dr[1]}–${dr[3]}`,
      f3
    );
  } else
    ok('A 營地升級（桌機）x 844–1264、y 76–612', dr.join() === '844,76,1264,612', '844,76,1264,612', dr.join(), f3);
  const st = await p.evaluate(() => [
    document.querySelectorAll('#pcamp .stamp.sug').length,
    document.querySelectorAll('#pcamp .cdc').length,
    $('pcamp').scrollHeight <= $('pcamp').clientHeight + 1
  ]);
  ok('C 一屏一個主動作：營地升級只有 1 顆實心印章', st[0] === 1, '1', String(st[0]), f3);
  if (!PORTM) ok('A 桌機營地升級不用捲', st[2], '不捲', st[2] ? '不捲' : '要捲', f3);
  /* 熱區：外觀不到 44 的，往上下（左右）各探 (44−外觀)/2，點得到自己才算（§1.4 熱區外延） */
  const hz = await p.evaluate(
    ([sel, T]) => {
      const bad = [];
      for (const e of document.querySelectorAll(sel)) {
        if (!e.getClientRects().length) continue;
        /* 捲到面板外的（390×664 的抽屜要捲）不量：捲進來才點得到 */
        const sc = e.closest('#pcamp'),
          sr = sc && sc.getBoundingClientRect(),
          r = e.getBoundingClientRect();
        if (sr && (r.top < sr.top || r.bottom > sr.bottom)) continue;
        const cx = r.left + r.width / 2,
          cy = r.top + r.height / 2,
          dy = Math.max(0, (T - r.height) / 2),
          dx = Math.max(0, (T - r.width) / 2),
          miss = [],
          hit = (x, y) => {
            const t = document.elementFromPoint(x, y);
            if (!t || !(t === e || e.contains(t)))
              miss.push([
                Math.round(x),
                Math.round(y),
                t ? (t.id || t.className || t.tagName).toString().slice(0, 12) : null
              ]);
            return !miss.length;
          };
        if (
          !(
            hit(cx, r.top - dy + 1) &&
            hit(cx, r.bottom + dy - 1) &&
            hit(Math.max(1, r.left - dx + 1), cy) &&
            hit(Math.min(innerWidth - 1, r.right + dx - 1.5), cy)
          )
        )
          bad.push([
            (e.className || e.tagName).toString().slice(0, 16),
            Math.round(r.width),
            Math.round(r.height),
            ...miss
          ]);
      }
      return bad;
    },
    [SK + ', #pcamp .goal', PORTM ? 44 : 40]
  );
  ok(
    PORTM ? 'A 熱區：骨架可點 ≥44（掛機條、分頁、抽屜）' : 'A 熱區：骨架可點 ≥40（桌機滑鼠；掛機條 40 高）',
    !hz.length,
    PORTM ? '≥44（含外延）' : '≥40',
    hz.length ? JSON.stringify(hz.slice(0, 4)) : '全部 ≥44',
    f3
  );
  const dfs = await p.evaluate(() =>
    Math.min(
      ...[...document.querySelectorAll('#pcamp *')]
        .filter(
          e =>
            e.getClientRects().length &&
            [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1)
        )
        .map(e => parseFloat(getComputedStyle(e).fontSize))
    )
  );
  ok('A 字級（抽屜最小字）', dfs >= 14, '≥14', String(dfs), f3);
  ok('A 名詞：抽屜沒有「輪」', !(await noWord()), '0 個', (await noWord()) || '0 個', f3);
  /* 升級：按一下就升；300 ms 內再按不算；過了再按又升；回饋 0／100／300 ms */
  /* 林場：只吃木，連升幾級都買得起 */
  const k = 'wood';
  const lv = () => p.evaluate(k => genOf(k).lv, k);
  const l0 = await lv();
  const sel = `#pcamp .stamp[data-fg="gen:${k}:1"]`;
  await press(sel);
  const fb = await p.evaluate(() => {
    const c = document.querySelector('#pcamp .cdc.up');
    return c
      ? [
          c.getAnimations().map(a => a.effect.getTiming().duration),
          c
            .querySelector('.lv')
            .getAnimations()
            .map(a => a.effect.getTiming().duration)
        ]
      : null;
  });
  const f3b = await shot('03b_drawer_up');
  /* 連點：在頁面裡照真實時間點（Playwright 的 tap 會等動畫停才點，量不到 300 ms 內） */
  const [l1, l2, l3] = await p.evaluate(
    async ([sel, k]) => {
      const lv = () => genOf(k).lv,
        wait = ms => new Promise(r => setTimeout(r, ms));
      await wait(350);
      const a = lv();
      document.querySelector(sel).click();
      const b = lv();
      await wait(120);
      document.querySelector(sel).click();
      const c = lv();
      await wait(320);
      document.querySelector(sel).click();
      return [b, c, lv()];
    },
    [sel, k]
  );
  ok(
    'D 升級一下就好、300 ms 內重複不算、之後可以連升',
    l1 === l0 + 2 && l2 === l1 && l3 === l2 + 1,
    `點→+1；隔 120 ms 再點→不算；隔 320 ms→+1`,
    `${l0}→(+1)${l0 + 1}→${l1}→${l2}→${l3}（林場）`,
    f3b
  );
  ok(
    'B 抽屜內升級回饋：Lv 翻牌 100 ms、格子亮框 300 ms',
    !!fb && fb[0].includes(300) && fb[1].includes(100),
    '0 換底／100／300',
    JSON.stringify(fb),
    f3b
  );
  /* 買不起：仍可點、等級不變、鈕抖一下 */
  const no = await p.evaluate(async () => {
    MAT().soul = 0;
    hudPanels();
    await new Promise(r => setTimeout(r, 50));
    const b = document.querySelector('#pcamp .stamp[data-fg^="camp:"]'),
      k = b.dataset.fg.split(':')[1],
      l = S.camp[k];
    b.click();
    return [S.camp[k] === l, b.getAnimations().some(a => a.effect.getTiming().duration === 120), $('warn').textContent];
  });
  ok(
    'D 買不起的印章：可以點、不升、抖 120 ms＋說缺什麼',
    no[0] && no[1] && /還差/.test(no[2]),
    '不升＋回饋',
    no.join('｜'),
    ''
  );
  await p.evaluate(() => {
    MAT().soul = 1e6;
    hudPanels();
  });
  await p.evaluate(() => {
    const L = [...document.querySelectorAll('#pcamp .cdc')];
    L[L.length - 1].scrollIntoView({ block: 'end' });
  });
  await shot('03c_drawer_bottom');
  /* 單座卡 */
  await press('#pcamp .cdb');
  await p.waitForTimeout(200);
  ok(
    'D 點格子＝單座卡（‹ › ×、需要／現有、▲ 升級）',
    await p.evaluate(
      () => !!document.querySelector('#pcamp .cd1 .cdcost') && !!document.querySelector('#pcamp [data-cd="nav:1"]')
    ),
    '單座卡',
    '',
    await shot('03d_drawer_one')
  );
  /* D 下一個目標一直看得到 */
  await press('#pcamp [data-cd=back]');
  ok(
    'D 下一個目標條在抽屜、掛機條展開',
    await p.evaluate(() => !!document.querySelector('#pcamp .goal')),
    '看得到',
    await p.evaluate(() => document.querySelector('#pcamp .goal').innerText),
    ''
  );
  /* 開抽屜時 AI 繼續刷（自動模式） */
  const gt = await p.evaluate(async () => {
    const t = G.t;
    await new Promise(r => setTimeout(r, 600));
    return [G.t > t, worldPaused()];
  });
  ok('B 開營地升級時 AI 繼續刷（自動模式）', gt[0] && !gt[1], '不停', gt.join('｜'), '');
  /* 130% 文字 */
  await p.evaluate(() => {
    S.fs = 130;
    fsApply();
    hudPanels();
  });
  await p.waitForTimeout(200);
  const clip = await p.evaluate(
    () =>
      [...document.querySelectorAll('#pcamp .cdb b, #pidle .ib > b, #pnav span, #dnav span')].filter(
        e => e.getClientRects().length && e.scrollHeight > e.clientHeight + 2
      ).length
  );
  ok('A 文字 130%：抽屜、掛機條、分頁不裁字（換行）', clip === 0, '0', String(clip), await shot('09a_text130'));
  await p.evaluate(() => {
    S.fs = 100;
    fsApply();
  });
  /* 英文 +40% 假字（只給截圖）：骨架裡每個字節點補到 1.4 倍長 */
  await p.evaluate(() => {
    for (const root of document.querySelectorAll('#pcamp, #pidle, #pnav, #dnav')) {
      const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n; (n = tw.nextNode()); ) {
        const t = n.textContent.trim();
        if (t) n.textContent = t + 'Ｘ'.repeat(Math.ceil(t.length * 0.4));
      }
    }
  });
  await shot('09b_pseudo40');
  await p.evaluate(() => closePanels());
  await p.waitForTimeout(300);

  /* ---------- 6 格分頁（營地徽章） ---------- */
  await p.evaluate(() => {
    S.camp.altar = 6;
    ST = stats();
    hudPanels();
  });
  await p.waitForTimeout(200);
  const nv = await p.evaluate(() =>
    [...document.querySelectorAll(TOUCH.on ? '#pnav button' : '#dnav button')].map(e => e.innerText.replace(/\s+/g, ''))
  );
  ok(
    'A 6 格分頁：角色・鍛造・技能・天賦・營地（徽章）・更多',
    (nv.length === 6 && /^角色/.test(nv[0]) && /^營地\d/.test(nv[4].replace(/H/, ''))) ||
      (nv.length === 6 && /營地/.test(nv[4])),
    '6 格',
    nv.join(' '),
    await shot('08_tabs')
  );
  /* 角色頁（含戰利品） */
  await press(PORTM ? '#pnav [data-tm="nav:char"]' : '#dnav [data-tm="nav:char"]');
  await p.waitForTimeout(300);
  await shot('03e_char');
  await press('#pinv [data-invt="bag"]');
  await p.waitForTimeout(300);
  ok(
    'A 角色頁含戰利品（角色｜倉庫）',
    await p.evaluate(() => !!document.querySelector('#pinv .bag')),
    '倉庫在角色頁',
    '',
    await shot('03f_char_bag')
  );
  await p.evaluate(() => closePanels());

  /* ---------- 離線結算：≥10 分才出、半版、可一點跑完 ---------- */
  await p.evaluate(() => offBack(null, { wood: 10 }, 30e3));
  ok('D 離開 <60 秒什麼都不出', await p.evaluate(() => $('poff').hidden && !IDLE.msg), '不出', '', '');
  await p.evaluate(() => {
    const o = {
      away: 3 * 3600e3 + 12 * 60e3,
      n: 420,
      won: 412,
      soul: 12000,
      cur: [
        ['exalt', 2],
        ['exalt3', 1],
        ['tran', 30]
      ],
      gold: 0,
      lv: 0,
      chase: 1,
      chaseL: [],
      pts: 0,
      here: true
    };
    offBack(o, { wood: 5000 }, o.away);
  });
  await p.waitForTimeout(150);
  const of0 = await p.evaluate(() => $('poff').querySelector('.offc').innerText);
  await press('#poff h2');
  await p.waitForTimeout(100);
  const of = await p.evaluate(() => {
    const r = $('poff').getBoundingClientRect(),
      bs = [...$('poff').querySelectorAll('.offb .btn')].map(b => {
        const q = b.getBoundingClientRect();
        return [
          b.innerText.replace(/\s+/g, ''),
          Math.round(q.width),
          Math.round(q.height),
          b.classList.contains('pri')
        ];
      });
    return [
      Math.round(r.top),
      Math.round(r.bottom),
      $('poff').querySelector('.offc').innerText,
      $('poff').querySelectorAll('.offl li').length,
      $('poff').querySelector('.offl li:last-child').className,
      bs,
      $('poff').querySelector('h2').innerText
    ];
  });
  const f6 = await shot('06_offline');
  ok(
    'D 離線結算 ≥10 分出、點一下數字跑完',
    of[2] === '王 412 隻・靈魂 +12,000' && of0 !== of[2],
    '王 412 隻・靈魂 +12,000',
    `${of0} → ${of[2]}`,
    f6
  );
  ok(
    'A 離線結算：標題、掉落 3 列（追逐在最後）、接下來',
    of[6] === '離開 3 時 12 分' &&
      of[3] === 3 &&
      /ch/.test(of[4]) &&
      (await p.evaluate(() => /^接下來：/.test(($('poff').querySelector('.offn') || {}).innerText || ''))),
    '離開 3 時 12 分、3 列',
    `${of[6]}、${of[3]} 列`,
    f6
  );
  ok(
    'C 結算主鈕是「收下・繼續刷」（右）',
    of[5][1][3] && /^收下・繼續刷/.test(of[5][1][0]) && /^去營地升級/.test(of[5][0][0]),
    '右＝收下・繼續刷（主）',
    JSON.stringify(of[5]),
    f6
  );
  if (PORTM)
    ok(
      'A 離線結算（直立）y 範圍與鈕 56 高',
      of[1] === H - SAB - 56 && of[5].every(b => b[2] >= 56),
      `…–${H - SAB - 56}、鈕 56`,
      `${of[0]}–${of[1]}、鈕 ${of[5].map(b => b[1] + '×' + b[2]).join(' ')}`,
      f6
    );
  else
    ok(
      'A 離線結算（桌機）480×420 在中間、鈕 228×48 上下',
      (await rect('#poff')).join() === `${(W - 480) / 2},${(H - 420) / 2},${(W + 480) / 2},${(H + 420) / 2}` &&
        of[5].every(b => b[2] >= 48),
      `480×420、鈕 48`,
      `${(await rect('#poff')).join()}、鈕 ${of[5].map(b => b[1] + '×' + b[2]).join(' ')}`,
      f6
    );
  ok('A 名詞：離線結算沒有「輪」', !(await noWord()), '0 個', (await noWord()) || '0 個', f6);
  await press('#poff [data-a=offok]');
  ok(
    'D 收下・繼續刷：結算關掉、掛機條回來',
    await p.evaluate(() => $('poff').hidden && !$('pidle').hidden),
    '關掉',
    '',
    ''
  );

  /* ---------- 藏起來時聲音停（AudioContext suspend） ---------- */
  await (PORTM
    ? p.touchscreen.tap(Math.round(W / 2), Math.round(H / 3))
    : p.mouse.click(Math.round(W / 2), Math.round(H / 3)));
  const au = await p.evaluate(async () => {
    audioWake();
    await new Promise(r => setTimeout(r, 100));
    const s0 = AC.state;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(r => setTimeout(r, 200));
    const s1 = AC.state;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(r => setTimeout(r, 200));
    return [s0, s1, AC.state];
  });
  ok(
    'B 分頁藏起來時 AudioContext suspend、回來恢復',
    au[1] === 'suspended' && au[2] === 'running',
    'suspended → running',
    au.join(' → '),
    ''
  );

  ok('沒有頁面錯誤', !errs.length, '0', errs.join(' / ') || '0', '');
  const md =
    `# M2-12 第一段量測 ${tag}\n\n由 tools/shell_check.js 產生（本機 Playwright Chromium${PORTM && SAT ? '，模擬安全區上 47、下 34' : ''}）。\n\n| 項目 | 尺寸 | 目標 | 實測 | 過／不過 | 檔名 |\n| --- | --- | --- | --- | --- | --- |\n` +
    rows.map(r => '| ' + r.map(c => String(c).replace(/\|/g, '／')).join(' | ') + ' |').join('\n') +
    `\n\n合計：✅ ${rows.filter(r => r[4] === '過').length}、❌ ${rows.filter(r => r[4] !== '過').length}\n`;
  fs.writeFileSync(path.join(OUT, `measure_${tag}.md`), md);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
