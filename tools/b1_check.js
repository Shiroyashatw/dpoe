const { chromium } = require('playwright');
/* B1 骨架第一段驗收（docs/production/specs/fix-list-v1.2-to-batches.md「B1 骨架第一段」；規格 M2-12-shell-part1.md）：
   S3 字串與禁用字、S6／D2-13／D3-03 資源列與分頁位置、D1-01 掛機卡標題列、D1-02 追逐列吃 token、D1-04／D1-08 單座卡「這級」、
   D1-10／D2-03 掛機條收字、D1-12 6 秒自動收（量 ms）、D2-05 1280×800（CSS 1024×640）右欄、D2-06 390×664 抽屜、D3-07 新存檔、D3-13 鍵位。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/b1_check.js [寬 390] [高 844] [網址]
   390×844、390×664 模擬安全區上 47（844 另加下 34）。截圖與量測表存 docs/production/evidence/dpoe-b1/（SHOTS 可改）。有 ❌ 結束碼 1 */
const path = require('path'),
  fs = require('fs');
const W = +process.argv[2] || 390,
  H = +process.argv[3] || 844,
  URL = process.argv[4] || 'http://localhost:8000/',
  PORTM = H > W,
  /* 手機一律直式（2026-11-21 取消橫向）：直的尺寸用觸控模擬，橫的是桌機 */
  MOB = PORTM,
  tag = W + 'x' + H,
  DSF = W === 1024 && H === 640 ? 1.25 : 2,
  OUT = process.env.SHOTS || path.join(__dirname, '..', 'docs', 'production', 'evidence', 'dpoe-b1'),
  SAT = PORTM && (H === 844 || H === 664) ? 47 : 0,
  SAB = PORTM && H === 844 ? 34 : 0,
  FULL = (W === 390 && H === 844) || (W === 1280 && H === 720);
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const rows = [];
const ok = (n, v, goal = '', got = '', file = '') => {
  if (!v) fail++;
  const g = typeof got === 'string' ? got : JSON.stringify(got);
  rows.push([n, tag, goal, g, v ? '過' : '不過', file]);
  console.log((v ? '✅ ' : '❌ ') + n + (g ? ' ' + g : ''));
};
const near = (a, b, d = 2) => a && b && a.every((v, i) => Math.abs(v - b[i]) <= d);
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const mk = async (rm = 'no-preference', dsf = DSF) => {
    const ctx = await b.newContext({
      viewport: { width: W, height: H },
      hasTouch: MOB,
      isMobile: MOB,
      deviceScaleFactor: dsf,
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
    return p;
  };
  const p = await mk();
  const shot = async n => {
    const f = `${tag}_${n}.png`;
    await p.screenshot({ path: path.join(OUT, f) });
    return f;
  };
  const rect = q =>
    p.evaluate(q => {
      const e = document.querySelector(q);
      if (!e || !e.getClientRects().length) return null;
      const r = e.getBoundingClientRect();
      return [r.left, r.top, r.right, r.bottom].map(Math.round);
    }, q);
  /* 畫面上看得到的字裡有沒有禁用字（名詞表：輪、再刷一輪、必出、連死、連倒；M2-12：法力、祀壇） */
  const BAN = /輪|再刷一輪|必出|連死|連倒|法力|祀壇/g;
  const banScan = () =>
    p.evaluate(re => (document.body.innerText.match(new RegExp(re, 'g')) || []).join(''), BAN.source);
  const bans = [];
  const scan = async where => bans.push([where, await banScan()]);

  /* ---------- D3-07 新存檔：開場跳過後的第一個地點，掛機條照實際時間（<60 秒「掛機 0 分」）；怪物 Lv5 沒有追逐保底那段 ---------- */
  await p.evaluate(
    ([sat, sab, port]) => {
      proSkip();
      S.story.tips = 0;
      S.orient = 'p';
      applyOrient();
      if (sat || sab) DBG.safeArea(sab, sat);
      S.auto = 1;
      runNode(TRUNK_K[0]);
    },
    [SAT, SAB, PORTM]
  );
  await p.waitForTimeout(1500);
  const ns = await p.evaluate(() => ({
    t: $('pidle').innerText.replace(/\s+/g, ' ').trim(),
    pity: !!document.querySelector('#pidle .ipb'),
    lv: mobLv(G.mapT),
    ses: Math.round((Date.now() - SES.t0) / 1000)
  }));
  const fN = await shot('D3-07_newsave');
  ok(
    'D3-07 新存檔：掛機條照實際時間「掛機 0 分」、沒刷過怪物 Lv45 以上不畫「追逐保底」',
    /^掛機 0 分/.test(ns.t) && ns.ses < 60 && !ns.pity && ns.lv < 45,
    '「掛機 0 分」、保底段 0',
    `「${ns.t}」${ns.ses} 秒、怪物 Lv${ns.lv}、保底段 ${ns.pity ? 1 : 0}`,
    fN
  );
  await scan('新存檔戰鬥');

  /* ---------- S6／D2-13／D3-03 資源列、分頁位置 ---------- */
  await p.evaluate(() => {
    Object.assign(S.camp, { forge: 3, watch: 2, altar: 4, house: 2 });
    S.gold = 8640;
    MAT().soul = 1180;
    ST = stats();
    hudPanels();
    hudState();
  });
  await p.waitForTimeout(400);
  const cs = { btn: await rect('#curs'), vis: await rect('#curs .cv'), nav: await rect(PORTM ? '#pnav' : '#dnav') };
  const csTxt = await p.evaluate(() => $('curs').innerText.replace(/\s+/g, ' ').trim());
  const csFs = await p.evaluate(() => parseFloat(getComputedStyle($('curs')).fontSize));
  const fC = await shot('S6_cur_strip');
  if (PORTM) {
    const y0 = SAT + 63;
    ok(
      'S6／D3-03 資源列（直立）外觀 x 202–382 × 110–142、熱區 106–150',
      W === 390 ? near(cs.vis, [202, y0, 382, y0 + 32]) && near([cs.btn[1], cs.btn[3]], [y0 - 4, y0 + 40]) : !!cs.vis,
      W === 390 ? `x 202–382 × ${y0}–${y0 + 32}、熱區 ${y0 - 4}–${y0 + 40}` : '有',
      `外觀 ${JSON.stringify(cs.vis)}、熱區 ${JSON.stringify(cs.btn)}`,
      fC
    );
    ok('S6 資源列字 14／700（直立）', csFs >= 14, '≥14', String(csFs), fC);
  } else if (!PORTM && !(await p.evaluate(() => TOUCH.on))) {
    ok(
      'S6／D2-13／D3-03 資源列（桌機）x 16–316 × 66–98，不在頂列',
      near(cs.vis, [16, 66, 316, 98]) && cs.vis[1] > 62,
      'x 16–316 × 66–98',
      JSON.stringify(cs.vis),
      fC
    );
    ok('S6 資源列字 16／700（桌機）', csFs >= 16, '≥16', String(csFs), fC);
    const nb = await p.evaluate(() => [...document.querySelectorAll('#dnav button')].length);
    ok(
      'D3-03 分頁（桌機頂列右）6 格 x 848–1264 × 10–62',
      W !== 1280 || (nb === 6 && near(cs.nav, [848, 10, 1264, 62])),
      W === 1280 ? 'x 848–1264 × 10–62' : '右緣 16',
      `${nb} 格 ${JSON.stringify(cs.nav)}`,
      fC
    );
  }
  if (cs.vis)
    ok(
      'S6 資源列內容：金 8,6xx、靈魂 1,18x（<10,000 寫完整；設 8,640／1,180，刷圖中在漲）',
      /8,6\d\d/.test(csTxt) && /1,1[89]\d/.test(csTxt),
      '8,640／1,180',
      csTxt,
      fC
    );
  /* 跟其他 HUD 交集（掉落動態 #dlog 位置在 B4，不算） */
  if (cs.vis) {
    const hit = await p.evaluate(v => {
      const L = [];
      for (const q of ['#area', '#prog', '#bossbar', '#mm', '#pidle', '#pnav', '#dnav', '.modesw']) {
        const e = document.querySelector(q);
        if (!e || !e.getClientRects().length) continue;
        const r = e.getBoundingClientRect();
        if (r.right > v[0] && r.left < v[2] && r.bottom > v[1] && r.top < v[3]) L.push(q);
      }
      return L;
    }, cs.vis);
    ok('S6 資源列跟資訊列、王進度、分頁、掛機條交集 0', !hit.length, '0', hit.join(',') || '0', fC);
  }

  /* ---------- 大數字存檔：金 3.40M、靈魂 1.28M；掛機卡標題列「靈魂 +1.28M」完整（D1-01） ---------- */
  await p.evaluate(() => {
    S.gold = 3404567;
    MAT().soul = 1284567;
    SES.soul = 1284567;
    SES.rounds = 12;
    hudState();
  });
  await p.waitForTimeout(300);
  const big = await p.evaluate(() => $('curs').innerText.replace(/\s+/g, ' ').trim());
  if (await rect('#curs .cv'))
    ok(
      '大數字存檔：資源列「3.40M」「1.28M」（擁有捨去）',
      /3\.40M/.test(big) && /1\.28M/.test(big),
      '3.40M／1.28M',
      big,
      await shot('F9-2_cur_big')
    );

  /* 直立與桌機有掛機條 */
  const hasIdle = !!(await rect('#pidle'));
  if (hasIdle) {
    /* D1-01 展開標題列 */
    await p.evaluate(() => idleOpen());
    await p.waitForTimeout(400);
    const t1 = async () =>
      p.evaluate(() => {
        const b = document.querySelector('#pidle .it1 b'),
          r = b.getBoundingClientRect(),
          tn = [...b.querySelectorAll('.tn')].map(e => {
            const q = e.getBoundingClientRect();
            return q.right <= r.right + 1 && q.left >= r.left - 1 && getComputedStyle(e).display !== 'none';
          });
        return {
          t: b.innerText.replace(/\s+/g, ' ').trim(),
          fs: parseFloat(getComputedStyle(b).fontSize),
          tn: tn.every(Boolean),
          row: Math.round(b.parentNode.getBoundingClientRect().height),
          f1: $('pidle').classList.contains('f1'),
          two: b.parentNode.classList.contains('two'),
          fit: b.scrollWidth <= b.clientWidth + 1
        };
      });
    const a1 = await t1();
    const fT = await shot('D1-01_idle_title');
    ok(
      'D1-01 掛機卡標題列「掛機 {m} 分・打倒王 {n} 次・靈魂 +1.28M」數字完整、字 14',
      /^掛機 \d+ 分/.test(a1.t) && /靈魂 \+1\.28M/.test(a1.t) && a1.tn && a1.fit && a1.fs >= 14,
      '數字完整',
      a1,
      fT
    );
    /* 130%＋英文 +40% 假字：先拿掉「・打倒王 n 次」，再換 2 行（44→64），字不縮 */
    await p.evaluate(() => {
      S.fs = 130;
      fsApply();
      const b = document.querySelector('#pidle .it1 b');
      for (const e of b.querySelectorAll('span:not(.tn)'))
        e.textContent += 'Ｘ'.repeat(Math.ceil(e.textContent.length * 0.4));
      idleFit($('pidle'));
    });
    await p.waitForTimeout(200);
    const a2 = await t1();
    const fT2 = await shot('D1-01_idle_title_fs_en');
    ok(
      'D1-01 130%＋英文：數字完整、先拿掉打倒王次數、再換 2 行（列高 64）、字不縮',
      a2.tn && a2.fs >= 18 && (a2.fit || a2.two) && (!a2.two || (a2.f1 && a2.row >= 64)),
      '字 18.2、tn 完整、f1→2 行',
      a2,
      fT2
    );
    await p.evaluate(() => {
      S.fs = 100;
      fsApply();
      HV.idle = null;
      idleBar(1);
    });
    await scan('掛機卡展開');

    /* ---------- 追逐保底段＋最近一筆（王印 16、--rar-chase token、不用 ★） ---------- */
    await p.evaluate(() => {
      S.camp.watch = 30;
      const k = TRUNK_K.find(k => TRUNK[WNODE[k].i] && TRUNK[WNODE[k].i].lv >= 48);
      runNode(k);
      setInterval(() => P && ST && (P.hp = ST.hp), 50);
      chaseOf().pts = 212;
      S.log = [
        { n: '鎮嶽印', c: 'chase', k: 'wangyin_zhenyue', t: Date.now() },
        { n: '崇高石', c: 'cur', t: Date.now() }
      ];
      idleClose();
    });
    await p.waitForTimeout(1200);
    await p.evaluate(() => (IDLE.open = 0) || ((HV.idle = null), idleBar(1)));
    const cb = await p.evaluate(() => {
      const ib = document.querySelector('#pidle .ib'),
        last = ib && ib.querySelector('.ilast'),
        css = getComputedStyle(document.documentElement).getPropertyValue('--rar-chase').trim(),
        hex = c =>
          '#' +
          c
            .match(/\d+/g)
            .slice(0, 3)
            .map(x => (+x).toString(16).padStart(2, '0'))
            .join('');
      return {
        t: ib ? ib.innerText.replace(/\s+/g, ' ').trim() : '',
        ipw: !!(ib && ib.querySelector('.ipb .ipw')),
        lastIc: !!(last && last.querySelector('img.ipw')),
        lastC: last ? hex(getComputedStyle(last).color) : '',
        tok: css,
        star: /★/.test(ib ? ib.innerText : ''),
        h: Math.round($('pidle').getBoundingClientRect().height),
        ws: ib ? getComputedStyle(ib.querySelector('b')).whiteSpace : ''
      };
    });
    const fP = await shot('S3_idle_pity');
    ok(
      'S3 掛機條收起列：王印 16＋「追逐保底 42%」（怪物 Lv48）',
      cb.ipw && /追逐保底 42%/.test(cb.t),
      '王印 16＋追逐保底 42%',
      cb.t,
      fP
    );
    ok(
      'D1-02（部分）掛機條最近一筆追逐列：王印 16 圖示、色＝--rar-chase token、不用 ★',
      cb.lastIc && cb.lastC.toLowerCase() === cb.tok.toLowerCase() && !cb.star,
      `--rar-chase（${cb.tok}）`,
      `${cb.lastC}、圖示 ${cb.lastIc}`,
      fP
    );
    ok(
      'D1-10 收起列一行 nowrap、高 44／40',
      cb.ws === 'nowrap' && cb.h === (PORTM ? 44 : 40),
      `nowrap、${PORTM ? 44 : 40}`,
      `${cb.ws}、${cb.h}`,
      fP
    );
    await scan('掛機條（追逐）');

    /* ---------- D2-03 五步收字：把卡壓窄，步驟照順序，數字與 % 永遠完整 ---------- */
    const steps = [];
    for (const w of [380, 330, 290, 250, 215, 190]) {
      steps.push(
        await p.evaluate(w => {
          const el = $('pidle');
          el.style.width = w + 'px';
          el.style.right = 'auto';
          idleFit(el);
          const ib = el.querySelector('.ib'),
            r = ib.getBoundingClientRect(),
            tn = [...ib.querySelectorAll('.tn')].every(e => {
              const q = e.getBoundingClientRect();
              return q.width > 0 && q.right <= r.right + 1 && e.scrollWidth <= e.clientWidth + 1;
            });
          return {
            w,
            f: ['f0', 'f1', 'f2', 'f3', 'f4', 'f5'].filter(c => el.classList.contains(c)).join(''),
            tn,
            t: ib.innerText.replace(/\s+/g, ' ').trim()
          };
        }, w)
      );
    }
    const fD = await shot('D2-03_idle_narrow');
    await p.evaluate(() => {
      const el = $('pidle');
      el.style.width = el.style.right = '';
      idleFit(el);
    });
    const ord = steps.every((s, i) => !i || s.f.length >= steps[i - 1].f.length) && steps.every(s => s.tn);
    ok(
      'D2-03 收起列放不下時照順序收（條→①打倒王→②物品名→③「追逐保底」→④「掛機」→⑤省略），數字與 % 永遠完整',
      ord && /42%/.test(steps[steps.length - 1].t),
      '步驟遞增、tn 完整',
      steps.map(s => `${s.w}:${s.f || '-'}「${s.t}」`).join(' ｜ '),
      fD
    );
    /* 130%＋英文：收起列 */
    await p.evaluate(() => {
      S.fs = 130;
      fsApply();
      HV.idle = null;
      idleBar(1);
      for (const e of document.querySelectorAll('#pidle .ib span:not(.tn), #pidle .ib .nm'))
        if (e.children.length === 0) e.textContent += 'Ｘ'.repeat(Math.ceil(e.textContent.length * 0.4));
      idleFit($('pidle'));
    });
    const fs2 = await p.evaluate(() => {
      const el = $('pidle'),
        ib = el.querySelector('.ib'),
        r = ib.getBoundingClientRect();
      return {
        f: ['f0', 'f1', 'f2', 'f3', 'f4', 'f5'].filter(c => el.classList.contains(c)).join(''),
        tn: [...ib.querySelectorAll('.tn')].every(e => e.getBoundingClientRect().right <= r.right + 1),
        h: Math.round(el.getBoundingClientRect().height),
        fs: parseFloat(getComputedStyle(ib.querySelector('b')).fontSize)
      };
    });
    ok(
      'D2-03 掛機條 130%＋英文：一行、字不縮、數字與 % 完整',
      fs2.tn && fs2.h === (PORTM ? 44 : 40) && fs2.fs >= 18,
      '一行、18.2、tn 完整',
      fs2,
      await shot('D2-03_idle_fs_en')
    );
    await p.evaluate(() => {
      S.fs = 100;
      fsApply();
      HV.idle = null;
      idleBar(1);
    });

    /* ---------- D1-12 6 秒自動收（量 ms）：展開 → 不動 → 6,000±17 ms 才收、收 200±17 ms ---------- */
    /* 手還在卡上不收；碰一下（捲動、移上）重新計時 */
    if (!PORTM) {
      const ib = await rect('#pidle');
      await p.evaluate(() => idleOpen());
      await p.mouse.move(ib[0] + 100, ib[3] - 20);
      await p.waitForTimeout(7000);
      const still = await p.evaluate(() => IDLE.open);
      await p.mouse.move(640, 300);
      const t0 = Date.now();
      await p.waitForFunction(() => !IDLE.open, null, { timeout: 8000 }).catch(() => {});
      ok(
        'D1-12 滑鼠移上卡 7 秒不收；移開後 6 秒才收',
        still === 1 && Math.abs(Date.now() - t0 - 6000) < 400,
        '7 秒仍開、移開 ≈6,000 ms',
        `${still ? '開著' : '收了'}、移開後 ${Date.now() - t0} ms`,
        ''
      );
    } else {
      await p.evaluate(() => idleOpen());
      await p.waitForTimeout(4000);
      await p.evaluate(() =>
        document.querySelector('#pidle .iex').dispatchEvent(new Event('scroll', { bubbles: true }))
      );
      await p.waitForTimeout(4000);
      const still = await p.evaluate(() => IDLE.open);
      await p.waitForFunction(() => !IDLE.open, null, { timeout: 4000 }).catch(() => {});
      ok('D1-12 第 4 秒捲動過：第 8 秒還開著（重新計時）', still === 1, '開著', still ? '開著' : '收了', '');
    }
  }

  /* ---------- D1-04／D1-08 單座卡「這級」＋接下來會解鎖 ---------- */
  await p.evaluate(() => {
    S.camp.watch = 14;
    navGo('craft');
  });
  await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('#pcamp [data-cd="one:watch"]').click());
  await p.waitForTimeout(400);
  const cd = await p.evaluate(() => {
    const L = [...document.querySelectorAll('#pcamp .cdrt li')].map(e => ({
        t: e.innerText.replace(/\s+/g, ' ').trim(),
        on: e.classList.contains('on'),
        bar: !!e.querySelector('.cdp')
      })),
      [q, r] = wXY(TRUNK_K[15]),
      want = `這級：新地點「${wName(S, q, r)}」開了（怪物 Lv ${wLv(q, r)}）`;
    return {
      lv: document.querySelector('#pcamp .cdlv').innerText,
      d: document.querySelector('#pcamp .cdd').innerText,
      want,
      nx: (document.querySelector('#pcamp .cdnx') || {}).innerText,
      L,
      same: [campThings().find(t => t.k === 'watch').d, cdThis('watch')],
      body: document.querySelector('#pcamp').innerText
    };
  });
  const fK = await shot('F8-1_card_track');
  ok('D1-04 瞭望台 Lv14→15：「這級」寫 Lv15 那句', cd.d === cd.want && /Lv 14 → Lv 15/.test(cd.lv), cd.want, cd.d, fK);
  ok(
    'S3 單座卡「接下來會解鎖」＋每列「Lv{n}・{解鎖}」；只有 Lv15 那列亮＋進度條；畫面沒有「主幹」',
    cd.nx === '接下來會解鎖' &&
      cd.L.length >= (PORTM ? 4 : 6) &&
      cd.L.every(r => /^Lv\d+(–\d+)?・/.test(r.t)) &&
      /^Lv15・/.test(cd.L[0].t) &&
      cd.L[0].on &&
      cd.L[0].bar &&
      cd.L.slice(1).every(r => !r.on && !r.bar) &&
      !/主幹/.test(cd.body),
    `≥${PORTM ? 4 : 6} 列、第一列 Lv15 亮`,
    cd.L.slice(0, 3)
      .map(r => r.t + (r.on ? '(亮)' : ''))
      .join('｜') + `…共 ${cd.L.length} 列`,
    fK
  );
  ok(
    'D1-08「這級」同一個字串來源（單座卡＝營地總覽＝下一件事）',
    cd.same[0] === cd.d && cd.same[1] === cd.d,
    cd.d,
    cd.same,
    fK
  );
  await scan('單座卡');
  /* 滿級寫目前級；產生器 */
  const mx = await p.evaluate(() => {
    S.camp.scout = campMax('scout');
    document.querySelector('#pcamp [data-cd="nav:1"]') && 0;
    CDR.one = 'scout';
    hudPanels();
    const a = document.querySelector('#pcamp .cdd').innerText;
    CDR.one = 'wood';
    hudPanels();
    return [
      a,
      campMax('scout'),
      document.querySelector('#pcamp .cdd').innerText,
      (document.querySelector('#pcamp .cdrt li') || {}).innerText
    ];
  });
  ok(
    'D1-04 滿級寫目前級（斥候營滿級）；產生器寫里程碑或「每分鐘 +{Δ} {材料}」',
    mx[0] === `這級：可以選到 ${mx[1] + 1}★` && /^這級：(產量 ×\d|\+1 工位|階 \+1|每分鐘 \+[\d.,]+ \S+)/.test(mx[2]),
    `這級：可以選到 ${mx[1] + 1}★`,
    mx,
    await shot('D1-04_card_gen')
  );
  /* 130%＋英文：單座卡字不縮、路線列換行不疊字 */
  await p.evaluate(() => {
    CDR.one = 'watch';
    S.fs = 130;
    fsApply();
    hudPanels();
    for (const e of document.querySelectorAll('#pcamp .cdd, #pcamp .cdrt span, #pcamp .cdnx'))
      e.textContent += 'Ｘ'.repeat(Math.ceil(e.textContent.length * 0.4));
  });
  const ov = await p.evaluate(() => {
    const L = [...document.querySelectorAll('#pcamp .cdrt li')].map(e => e.getBoundingClientRect());
    return (
      L.some((r, i) => i && r.top < L[i - 1].bottom - 1) ||
      [...document.querySelectorAll('#pcamp .cdrt span, #pcamp .cdd')].some(e => e.scrollWidth > e.clientWidth + 1)
    );
  });
  ok(
    'F8-4 單座卡 130%＋英文：路線換行不疊字、不裁字',
    !ov,
    '疊字 0、裁字 0',
    ov ? '有' : '0',
    await shot('F8-4_card_fs_en')
  );
  await p.evaluate(() => {
    S.fs = 100;
    fsApply();
    CDR.one = null;
    closePanels();
  });

  /* ---------- D3-13 鍵位（桌機）：V K G P H Z、Tab 循環、1／2 藥劑、X 掛機條、Esc 返回 ---------- */
  if (!PORTM && !(await p.evaluate(() => TOUCH.on))) {
    const kr = [];
    const key = async (k, f) => {
      await p.keyboard.press(k);
      await p.waitForTimeout(250);
      kr.push([k, await p.evaluate(f)]);
    };
    await p.mouse.click(640, 400);
    await key('v', () => !!PANEL.inv);
    await key('Escape', () => !anyPanel());
    await key('k', () => navOn() === 'forge');
    await key('Escape', () => !anyPanel());
    await key('g', () => !!PANEL.skill);
    await key('Escape', () => !anyPanel());
    await key('h', () => !!PANEL.camp);
    await key('Escape', () => !anyPanel());
    await key('z', () => !!PANEL.more);
    await key('Escape', () => !anyPanel());
    await key('p', () => !!TREE.open);
    await key('Escape', () => !TREE.open);
    /* 1／2：記下 drinkFlask 被叫到的參數（喝不喝得到看冷卻與戰鬥狀態，不是鍵位的事） */
    await p.evaluate(() => {
      const o = window.drinkFlask;
      window.FLK = [];
      window.drinkFlask = m => (FLK.push(m ? 'mp' : 'hp'), o(m));
    });
    await key(
      '1',
      () =>
        FLK.join() === 'hp' ||
        JSON.stringify([
          FLK,
          document.activeElement.tagName + '#' + document.activeElement.id + '.' + document.activeElement.className,
          IV.on,
          G.state
        ])
    );
    await key(
      '2',
      () =>
        FLK.join() === 'hp,mp' ||
        JSON.stringify([FLK, document.activeElement.tagName + '#' + document.activeElement.id, G.state])
    );
    await key('x', () => IDLE.open === 1);
    await key('x', () => !IDLE.open);
    await key('v', () => !!PANEL.inv);
    await key('Tab', () => navOn() === 'forge');
    await key('Shift+Tab', () => navOn() === 'char');
    await key('Escape', () => !anyPanel());
    const tbl = await p.evaluate(() => KEYS_PC.map(r => r[0]).join(' '));
    ok(
      'D3-13 鍵位：V 角色・K 鍛造・G 技能・P 天賦・H 營地・Z 更多、Tab 循環、1／2 藥劑、X 掛機條、Esc 返回',
      kr.every(r => r[1] === true) && /1 ／ 2/.test(tbl) && /\bX\b/.test(tbl),
      '全部 true',
      kr.map(r => `${r[0]}:${r[1] === true ? '✓' : '✗' + (r[1] || '')}`).join(' '),
      await shot('D3-13_keys')
    );
  }

  /* ---------- D2-05 1280×800（CSS 1024×640）：右欄 380、戰場 ≥612 ---------- */
  if (W === 1024 && H === 640) {
    const L = [];
    for (const k of ['char', 'forge', 'skill', 'craft']) {
      await p.evaluate(k => (closePanels(), navGo(k)), k);
      await p.waitForTimeout(400);
      L.push(
        await p.evaluate(k => {
          const e = [...document.querySelectorAll('.panel')].find(
            e => !e.hidden && e.getClientRects().length && e.getBoundingClientRect().left > 300
          );
          const r = e.getBoundingClientRect();
          return [k, e.id, Math.round(r.width), Math.round(r.left) - 16];
        }, k)
      );
    }
    const f = await shot('D2-05_1024x640_camp');
    ok(
      'D2-05 1280×800（CSS 1024×640）右欄 ≤380、戰場留 ≥612',
      L.every(r => r[2] <= 380 && r[3] >= 612),
      '寬 ≤380、戰場 ≥612',
      L,
      f
    );
    await p.evaluate(() => closePanels());
  }

  /* ---------- D2-06 390×664：角色、鍛造全版 47–分頁上緣；其他抽屜 330–分頁上緣；分頁不被蓋；技能首屏 ≥4 列 ---------- */
  if (W === 390 && H === 664) {
    const L = [];
    for (const k of ['char', 'forge', 'skill', 'craft', 'more']) {
      await p.evaluate(k => (closePanels(), navGo(k)), k);
      await p.waitForTimeout(450);
      L.push(
        await p.evaluate(k => {
          const e = [...document.querySelectorAll('.panel')].find(e => !e.hidden && e.getClientRects().length),
            r = e.getBoundingClientRect(),
            hd = $('phand').hidden ? null : $('phand').getBoundingClientRect(),
            nav = $('pnav').getBoundingClientRect(),
            top = Math.round(r.top),
            hitNav = [...document.querySelectorAll('#pnav button')].every(b => {
              const q = b.getBoundingClientRect();
              return b.contains(document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2));
            }),
            sk =
              k === 'skill'
                ? [...e.querySelectorAll('.skr')].filter(x => {
                    const q = x.getBoundingClientRect();
                    return q.height && q.top >= r.top - 1 && q.bottom <= r.bottom + 1;
                  }).length
                : null;
          return { k, id: e.id, top, bot: Math.round(r.bottom), nav: Math.round(nav.top), hitNav, sk };
        }, k)
      );
      if (k === 'char' || k === 'skill' || k === 'craft') await shot('D2-06_390x664_' + k);
    }
    const good = L.every(
      r =>
        r.bot === r.nav &&
        r.hitNav &&
        (['char', 'forge'].includes(r.k)
          ? r.top >= 47 && r.top <= 47 + 24
          : Math.abs(r.top - 330) <= 24 && r.top >= 330)
    );
    ok(
      'D2-06 390×664：角色、鍛造全版（47 起）、其他抽屜 330 起（含把手 24），都到分頁上緣；分頁不被蓋（分頁 608–664：分頁高 56 不變，假設）',
      good,
      '全版 47／半版 330、底＝分頁上緣',
      L.map(r => `${r.k}:${r.top}–${r.bot}${r.hitNav ? '' : ' 蓋到分頁'}`).join('｜'),
      ''
    );
    const skr = L.find(r => r.k === 'skill').sk;
    ok(
      'D2-06 390×664 技能首屏 ≥4 列（.skr 整列看得到）',
      skr >= 4,
      '≥4',
      `${skr} 列`,
      tag + '_D2-06_390x664_skill.png'
    );
    await p.evaluate(() => closePanels());
  }

  /* ---------- 倒下字板、連續倒下（S3：「連續倒下 3 次」） ---------- */
  await p.evaluate(() => {
    runNode(TRUNK_K[1]);
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    S.world.dn = 2;
    die();
  });
  await p.waitForTimeout(400);
  await scan('倒下字板');
  await p.waitForFunction(() => G.state === 'play', null, { timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(200);
  const dw = await p.evaluate(() => $('warn').textContent);
  const fW = await shot('D3-08_fallback');
  ok(
    'D3-08 連續倒下退回：一行「連續倒下 3 次，退回…」',
    /連續倒下 3 次，退回/.test(dw) && !/連死|連倒/.test(dw),
    '連續倒下 3 次',
    dw,
    fW
  );
  await scan('連續倒下提示');
  ok(
    'S3 禁用字掃描（輪、再刷一輪、必出、連死、連倒、法力、祀壇）：B1 畫面 0 筆',
    bans.every(b => !b[1]),
    '0 筆',
    bans.map(b => `${b[0]}:${b[1] || 0}`).join('｜'),
    ''
  );
  ok('頁面錯誤 0', !p.errs.length, '0', p.errs.slice(0, 3).join('；') || '0', '');
  await p.context().close();

  /* ---------- 計時（V-F1_idle_expand）：一般 200 ms 收、減少動態 150 ms 淡出。另開一頁、deviceScaleFactor 1（2 倍時無頭瀏覽器軟體繪圖一幀 30 ms 以上，計時器會被擠晚） ---------- */
  if (hasIdle && FULL) {
    const q = await mk('no-preference', 1);
    await q.evaluate(
      ([sat, sab, port]) => {
        proSkip();
        S.story.tips = 0;
        S.orient = 'p';
        applyOrient();
        if (sat || sab) DBG.safeArea(sab, sat);
        S.auto = 1;
        runNode(TRUNK_K[0]);
      },
      [SAT, SAB, PORTM]
    );
    await q.waitForTimeout(1200);
    /* 量法：收的那一下＝idleClose 被呼叫的時間（包一層記時間）；收的時長＝height 的 transitionstart → transitionend（事件時間戳），另外用 rAF 取樣當旁證 */
    const timing = () =>
      q.evaluate(
        () =>
          new Promise(res => {
            const el = $('pidle'),
              h0 = el.getBoundingClientRect().height,
              orig = window.idleClose;
            let tc = 0,
              ts = 0,
              hMax = 0;
            window.idleClose = () => ((tc = performance.now()), (window.idleClose = orig), orig());
            el.addEventListener('transitionstart', e => e.propertyName === 'height' && tc && (ts = e.timeStamp));
            el.addEventListener('transitionend', function te(e) {
              if (e.propertyName !== 'height' || !ts) return;
              el.removeEventListener('transitionend', te);
              const end = e.timeStamp;
              requestAnimationFrame(() =>
                res({
                  wait: Math.round(tc - t0),
                  shut: Math.round(end - ts),
                  h0,
                  hMax,
                  h: Math.round(el.getBoundingClientRect().height)
                })
              );
            });
            idleOpen();
            const t0 = performance.now();
            (function f() {
              hMax = Math.max(hMax, el.getBoundingClientRect().height);
              if (performance.now() - t0 > 9000) return res({ wait: -1, shut: -1, h0, hMax });
              if (!ts) requestAnimationFrame(f);
            })();
          })
      );
    const T3 = [await timing(), await timing(), await timing()],
      med = k => T3.map(t => t[k]).sort((a, b) => a - b)[1],
      tm = { ...T3[0], wait: med('wait'), shut: med('shut') };
    ok(
      'D1-12 V-F1_idle_expand：展開後不動 6,000±17 ms 才收、收 200±17 ms',
      Math.abs(tm.wait - 6000) <= 17 && Math.abs(tm.shut - 200) <= 17 && tm.h === Math.round(tm.h0),
      '6,000±17／200±17',
      `3 次中位數：等 ${tm.wait} ms、收 ${tm.shut} ms（各次 ${T3.map(t => t.wait + '／' + t.shut).join('、')}；高 ${Math.round(tm.hMax)}→${tm.h}）`,
      ''
    );
    await q.context().close();
  }
  /* ---------- 減少動態：收起 150 ms 淡出 ---------- */
  if (hasIdle && FULL) {
    const q = await mk('reduce', 1);
    await q.evaluate(
      ([sat, sab, port]) => {
        proSkip();
        S.story.tips = 0;
        S.orient = 'p';
        applyOrient();
        if (sat || sab) DBG.safeArea(sab, sat);
        S.auto = 1;
        runNode(TRUNK_K[0]);
      },
      [SAT, SAB, PORTM]
    );
    await q.waitForTimeout(1200);
    const one = () =>
      q.evaluate(
        () =>
          new Promise(res => {
            const el = $('pidle'),
              orig = window.idleClose;
            let tc = 0;
            window.idleClose = () => ((tc = performance.now()), (window.idleClose = orig), orig());
            idleOpen();
            const t0 = performance.now(),
              h1 = el.getBoundingClientRect().height;
            (function f() {
              /* 淡出那一段的時長：照 Web Animations 自己的時間軸量（開始播 → finish 被偵測到的那一幀） */
              const an = IDLE.fade && el.getAnimations()[0];
              if (an)
                return an.finished.then(() => {
                  const fade = Math.round(document.timeline.currentTime - an.startTime),
                    cfg = an.effect.getComputedTiming().duration;
                  requestAnimationFrame(() =>
                    res({
                      wait: Math.round(tc - t0),
                      fade,
                      cfg,
                      h1,
                      h: el.getBoundingClientRect().height,
                      shut: !IDLE.open
                    })
                  );
                });
              if (performance.now() - t0 > 9000) return res({ wait: -1 });
              requestAnimationFrame(f);
            })();
          })
      );
    const R3 = [await one(), await one(), await one()],
      md3 = k => R3.map(t => t[k]).sort((a, b) => a - b)[1],
      r = { ...R3[0], wait: md3('wait'), fade: md3('fade') };
    ok(
      'D1-12 減少動態：展開不滑（高度直接到位）、6 秒後 150 ms 淡出再收',
      Math.abs(r.wait - 6000) <= 17 && Math.abs(r.fade - 150) <= 17 && r.h1 >= 150 && r.shut && r.h < 50,
      '6,000±17／淡出 150±17',
      `3 次中位數：等 ${r.wait} ms、淡出 ${r.fade} ms（設定 ${r.cfg} ms；各次 ${R3.map(t => t.wait + '／' + t.fade).join('、')}；高 ${Math.round(r.h1)}→${Math.round(r.h)}）`,
      ''
    );
    await q.context().close();
  }
  await b.close();
  const md = path.join(OUT, `measure_${tag}.md`);
  fs.writeFileSync(
    md,
    `# B1 骨架第一段量測 ${tag}\n\n${fail ? '❌ ' + fail + ' 項不過' : '✅ 全部通過'}（${rows.length} 項）\n\n| 項目 | 尺寸 | 目標 | 實測 | 過／不過 | 檔名 |\n| --- | --- | --- | --- | --- | --- |\n` +
      rows
        .map(r => '| ' + r.map(x => String(x).replace(/\|/g, '／').replace(/\n/g, ' ')).join(' | ') + ' |')
        .join('\n') +
      '\n'
  );
  console.log(fail ? `❌ ${fail} 項不過` : `✅ 全部通過（${rows.length} 項）`);
  process.exit(fail ? 1 : 0);
})();
