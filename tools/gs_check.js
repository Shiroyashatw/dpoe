const { chromium } = require('playwright');
/* 商會＋剩餘小畫面 v1.0（docs/production/specs/guild/、specs/small-screens/）的實機檢查與 1280×720 截圖。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/gs_check.js [寬 1280] [高 720] [網址]
   寬 ≤ 高＝觸控直式手機（真的觸控事件，只跑自動檢查）；桌機另外拍兩份 REVIEW-CHECKLIST 的截圖（SHOTS=1 才存）到
   docs/production/evidence/guild/shots-1127/、docs/production/evidence/small-screens/shots-1127/。有 ❌ 時結束碼 1 */
const path = require('path');
const W = +process.argv[2] || 1280,
  H = +process.argv[3] || 720,
  DESK = W > H,
  URL = process.argv[4] || 'http://localhost:8000/',
  EV = path.join(__dirname, '..', 'docs', 'production', 'evidence'),
  SHOTS = DESK && process.env.SHOTS === '1';
let fail = 0,
  pass = 0;
const ok = (n, v, d = '') => {
  v ? pass++ : fail++;
  console.log((v ? '✅ ' : '❌ ') + `[${W}×${H}] ` + n + (d && !v ? ' ' + d : ''));
};
/* WCAG 2.x 對比：字色 vs 往上找到的第一個不透明底色 */
const CONTRAST = `(() => {
  const rgb = s => (s.match(/[\\d.]+/g) || []).map(Number);
  const lum = c => { const a = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
  window.__bg = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c.length < 4 || c[3] >= 0.99)) return c; } return [0, 0, 0]; };
  window.__cr = el => { const f = rgb(getComputedStyle(el).color), b = __bg(el), L1 = lum(f), L2 = lum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); };
})()`;
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    hasTouch: !DESK,
    isMobile: !DESK,
    deviceScaleFactor: DESK ? 1 : 2
  });
  await ctx.route(/supabase/, r => r.abort());
  const errs = [];
  const fresh = async (slot, skip = true) => {
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL + `?p=${slot}&` + Date.now());
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(1200);
    await p.evaluate(CONTRAST);
    if (skip) await p.evaluate(() => (proSkip(), (S.story.tips = 0)));
    await p.waitForTimeout(400);
    return p;
  };
  const snap = async (p, dir, name) => {
    if (!SHOTS) return;
    await p.waitForTimeout(350);
    await p.screenshot({ path: path.join(EV, dir, 'shots-1127', name + '.png') });
  };
  const tapOrClick = async (p, sel) => {
    const r = await p.evaluate(s => {
      const e = document.querySelector(s);
      if (!e) return null;
      e.scrollIntoView({ block: 'center' });
      const b = e.getBoundingClientRect();
      return [b.left + b.width / 2, b.top + b.height / 2];
    }, sel);
    if (!r) return false;
    if (DESK) await p.mouse.click(r[0], r[1]);
    else await p.touchscreen.tap(r[0], r[1]);
    await p.waitForTimeout(250);
    return true;
  };
  const inView = `(s => [...document.querySelectorAll(s)].filter(e => e.offsetParent || getComputedStyle(e).position === 'fixed').every(e => { const r = e.getBoundingClientRect(); return r.width === 0 || (r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1); }))`;

  /* ================= 商會（guild REVIEW-CHECKLIST A／B／C／D） ================= */
  {
    const p = await fresh(31);
    const G01 = () => {
      S.auto = 1;
      enterCamp();
      Object.assign(S.camp, { store: Math.max(S.camp.store, 4), forge: Math.max(S.camp.forge, 7) });
      /* 材料階上限 T5：寒鐵 ×5 → 隕鐵 鎖住（G01 鎖住列） */
      for (let w = 0; w <= 26; w++) if (((S.camp.watch = w), tierCap() === 5)) break;
      S.mat.mats = {};
      matAdd('wood', 0, 30000);
      matAdd('iron', 5, 9000);
      matAdd('iron', 6, 900);
      matAdd('hide', 5, 3000);
      matAdd('silk', 5, 3000);
      matAdd('silk', 6, 1200);
      matAdd('silk', 1, 8000);
      matAdd('iron', 1, 1200);
      matAdd('hide', 2, 180);
      matAdd('silk', 3, 60);
      const n = Date.now();
      S.mat.tq = { aug: [162, n], exalt: [19, n] };
      guildOpen('store');
    };
    await p.evaluate(G01);
    await p.waitForTimeout(300);
    const g1 = await p.evaluate(() => {
      const P = $('pguild'),
        t = P.textContent,
        r = P.getBoundingClientRect(),
        rows = [...P.querySelectorAll('.gsec[data-c=aug] .gl li')].map(li => li.textContent);
      return {
        open: !P.hidden,
        rect: [r.left, r.top, r.width, r.height].map(Math.round),
        noScroll: P.scrollHeight <= P.clientHeight + 1 && P.scrollWidth <= P.clientWidth + 1,
        q: P.querySelector('.gsec[data-c=aug] .gqt').textContent,
        q2: P.querySelector('.gsec[data-c=exalt] .gqt').textContent,
        rc: P.querySelector('.gsec[data-c=aug] .grc').textContent,
        wood: rows.find(x => x.startsWith('木')),
        frost: rows.find(x => x.startsWith('霜革')),
        cocoon: [...P.querySelectorAll('.gsec[data-c=exalt] .gl li')]
          .map(li => li.textContent)
          .find(x => x.startsWith('繭絲')),
        lock: [...P.querySelectorAll('.g51 li.glk')].map(li => li.textContent),
        zhi: P.querySelector('.gzh').textContent,
        bad: ['暫定', '＊', '蛻變石', '增幅石', '富豪石', '互換', '★', '✦', '好胚'].filter(w => t.includes(w)),
        btn: [...P.querySelectorAll('.gl .g1, .gl .gmx, .gall')].length
      };
    });
    ok('商會 打開＝獨立面板', g1.open, JSON.stringify(g1));
    if (DESK)
      ok(
        '商會 G01 滿寬面板 16,76 1248×536、一屏看完不捲',
        g1.rect.join() === '16,76,1248,536' && g1.noScroll,
        JSON.stringify(g1.rect)
      );
    else
      ok(
        '商會 390 面板不橫向溢出',
        g1.noScroll || (await p.evaluate(() => $('pguild').scrollWidth <= $('pguild').clientWidth + 1))
      );
    ok(
      '商會 G01 額度寫在區頭：這小時還能換 162／234 顆、19／26 顆；回復「約 15 秒回 1 顆・最多存 1 小時」',
      g1.q === '這小時還能換 162／234 顆' &&
        g1.q2 === '這小時還能換 19／26 顆' &&
        g1.rc === '約 15 秒回 1 顆・最多存 1 小時',
      JSON.stringify([g1.q, g1.q2, g1.rc])
    );
    ok(
      '商會 G01 木列：243 個 → 1 顆、最多可換 123 顆、換 1 顆＋換到上限 ×123',
      /243 個 → 1 顆123 顆換 1 顆換到上限 ×123/.test(g1.wood),
      g1.wood
    );
    ok(
      '商會 G01 霜革（皮 T5）600 個 → 1 顆、無「暫定」或＊',
      /霜革（T5）3,000600 個 → 1 顆5 顆/.test(g1.frost),
      g1.frost
    );
    ok('商會 G01 繭絲列「材料不夠換 1 顆崇高石」', /材料不夠換 1 顆崇高石/.test(g1.cocoon || ''), g1.cocoon);
    ok(
      '商會 G01 5 換 1 鎖住列原因寫在列內',
      g1.lock.some(x => x.includes('瞭望台開到更深的地點才能換')),
      JSON.stringify(g1.lock)
    );
    ok('商會 至臻石說明條「至臻石：商會不換」', g1.zhi.includes('至臻石：商會不換'), g1.zhi);
    ok('商會 C3／C5／C6：無蛻變石、增幅石、富豪石、暫定、＊、★、✦、互換、好胚', !g1.bad.length, JSON.stringify(g1.bad));
    /* 至臻石名詞提示（G01）：停 0.4 秒 */
    if (DESK) {
      const zr = await p.evaluate(() => {
        const e = $('pguild').querySelector('.gzh [data-zh]').getBoundingClientRect();
        return [e.left + 10, e.top + 6];
      });
      await p.mouse.move(zr[0], zr[1]);
      await p.waitForTimeout(650);
      const zt = await p.evaluate(
        `(() => { const t = $('ztip'), r = t.getBoundingClientRect(); return [!t.hidden, t.textContent, ${inView}('#ztip')]; })()`
      );
      ok('商會 至臻石名詞提示停 0.4 秒出、在畫面內', zt[0] && zt[1].includes('至臻石') && zt[2], JSON.stringify(zt));
      await snap(p, 'guild', 'G01-實機');
      await p.mouse.move(5, 300);
    }
    /* 按鈕 ≥ 44 熱區、在畫面內（B1） */
    const hit = await p.evaluate(() =>
      [...$('pguild').querySelectorAll('.gb, .gback, .x')]
        .filter(e => e.offsetParent)
        .map(e => {
          const r = e.getBoundingClientRect(),
            a = getComputedStyle(e, '::after'),
            ext = a.content !== 'none' && a.position === 'absolute' ? -parseFloat(a.top) * 2 || 0 : 0;
          return Math.max(r.height + ext, r.height);
        })
    );
    ok(
      '商會 B1 按鈕熱區高 ≥ 44',
      hit.every(h => h >= 43.5),
      JSON.stringify(hit)
    );
    /* D：對比 ≥ 4.5，按鈕上沒有 --tx-dim／--tx-off／--bad 字 */
    const cr = await p.evaluate(() =>
      [...$('pguild').querySelectorAll('b, small, span, em, li, button, p')]
        .filter(
          e =>
            e.offsetParent &&
            e.childNodes.length &&
            [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
        )
        .map(e => [e.textContent.slice(0, 12), +__cr(e).toFixed(2)])
        .filter(x => x[1] < 4.5)
    );
    ok('商會 D 全部字／底對比 ≥ 4.5:1', !cr.length, JSON.stringify(cr.slice(0, 6)));
    /* 不會用光就不出卡：木 30,000 換到上限 ×123 → 直接換（用掉 29,889） */
    const w0 = await p.evaluate(() => [matN('wood'), MAT().aug || 0]);
    await tapOrClick(p, '#pguild .gsec[data-c=aug] [data-gd="max:aug:wood:0"]');
    const w1 = await p.evaluate(() => [
      matN('wood'),
      MAT().aug || 0,
      !!GUILD.pend,
      !!$('pguild').querySelector('.gcf')
    ]);
    ok(
      '商會 不會用光就不出卡：木換到上限 ×123 直接換、扣 29,889',
      !w1[2] && !w1[3] && w0[0] - w1[0] === 29889 && w1[1] - w0[1] === 123,
      JSON.stringify([w0, w1])
    );
    /* 換 1 顆即使剛好用光也不出卡 */
    const o1 = await p.evaluate(() => {
      matAdd('iron', 6, -matN('iron', 6));
      matAdd('iron', 6, 20);
      S.mat.tq.aug = [50, Date.now()];
      hudPanels();
      return MAT().aug;
    });
    await tapOrClick(p, '#pguild [data-gd="one:aug:iron:6"]');
    const o2 = await p.evaluate(() => [matN('iron', 6), MAT().aug, !!GUILD.pend]);
    ok(
      '商會 換 1 顆剛好用光也不出卡（隕鐵 20 → 0、加詞石 +1）',
      o2[0] === 0 && o2[1] === o1 + 1 && !o2[2],
      JSON.stringify([o1, o2])
    );
    /* 皮換率與共用額度：霜革 600 → 1 顆、扣加詞石額度 */
    const hd = await p.evaluate(() => {
      S.mat.tq.aug = [100, Date.now()];
      const a = MAT().aug,
        q0 = tradeQ('aug'),
        h0 = matN('hide', 5),
        e = tradeCur('aug', 'one', 'hide', 5);
      return [
        e,
        MAT().aug - a,
        h0 - matN('hide', 5),
        Math.round((q0 - tradeQ('aug')) * 100) / 100,
        tradeRate('hide', 5),
        tradeRate('hide', 1),
        tradeRate('iron', 5),
        tradeRate('silk', 6)
      ];
    });
    ok(
      '商會 皮 → 加詞石：霜革 600／生皮 48,600 個 → 1 顆、與木鐵共扣 234／時額度；寒鐵 60、神絲 100',
      hd[0] === null &&
        hd[1] === 1 &&
        hd[2] === 600 &&
        hd[3] > 0.99 &&
        hd[3] < 1.01 &&
        hd[4] === 600 &&
        hd[5] === 48600 &&
        hd[6] === 60 &&
        hd[7] === 100,
      JSON.stringify(hd)
    );
    /* G03：寒鐵 9,000 換到上限 ×150 → 會用光 → 確認卡；按確認才扣 */
    await p.evaluate(() => {
      matAdd('iron', 5, 9000 - matN('iron', 5));
      S.mat.tq.aug = [162, Date.now()];
      hudPanels();
    });
    await tapOrClick(p, '#pguild [data-gd="max:aug:iron:5"]');
    const c1 = await p.evaluate(() => {
      const c = $('pguild').querySelector('.gcf');
      return [!!c, c && c.textContent, matN('iron', 5)];
    });
    const cIn = await p.evaluate(`(${inView})('#pguild .gcf .btn')`);
    ok(
      '商會 G03 寒鐵 9,000 換到上限 ×150 → 出確認卡（明細三行、⚠ 通貨換不回材料、確認換 150 顆），還沒扣',
      c1[0] &&
        c1[1].includes('會用光寒鐵：換到上限 加詞石 ×150') &&
        c1[1].includes('寒鐵 ×9,000（持有 9,000 → 0，用光）') &&
        c1[1].includes('加詞石 ×150') &&
        c1[1].includes('這小時還能換 162 → 12 顆') &&
        c1[1].includes('⚠ 通貨換不回材料') &&
        c1[1].includes('確認換 150 顆') &&
        c1[2] === 9000,
      JSON.stringify(c1)
    );
    ok('商會 G03 確認卡兩顆鈕在畫面內', cIn);
    if (DESK) {
      const cr2 = await p.evaluate(() =>
        [...$('pguild').querySelectorAll('.gcf b, .gcf li, .gcf .gwarn, .gcf .btn')].map(e => +__cr(e).toFixed(2))
      );
      ok(
        '商會 G03 確認卡字／底對比 ≥ 4.5',
        cr2.every(x => x >= 4.5),
        JSON.stringify(cr2)
      );
      await snap(p, 'guild', 'G03-實機');
    }
    await tapOrClick(p, '#pguild .gcf [data-gd=ok]');
    const c2 = await p.evaluate(() => [matN('iron', 5), !!GUILD.pend, Math.floor(tradeQ('aug'))]);
    ok('商會 G03 按「確認換 150 顆」才扣：寒鐵 0、額度 12', c2[0] === 0 && !c2[1] && c2[2] === 12, JSON.stringify(c2));
    /* 取消不扣；Esc＝取消 */
    await p.evaluate(() => {
      matAdd('iron', 5, 600);
      S.mat.tq.aug = [100, Date.now()];
      hudPanels();
    });
    await tapOrClick(p, '#pguild [data-gd="max:aug:iron:5"]');
    if (DESK) await p.keyboard.press('Escape');
    else await tapOrClick(p, '#pguild .gcf [data-gd=no]');
    const c3 = await p.evaluate(() => [matN('iron', 5), !!GUILD.pend, PANEL.guild]);
    ok('商會 確認卡取消（桌機 Esc）不扣、面板還開著', c3[0] === 600 && !c3[1] && c3[2], JSON.stringify(c3));
    /* 整區換到上限：有材料歸 0 才出卡，明細逐列、用光列加「用光」 */
    await tapOrClick(p, '#pguild [data-gd="all:aug"]');
    const a1 = await p.evaluate(() => {
      const c = $('pguild').querySelector('.gcf');
      return c ? [...c.querySelectorAll('li')].map(l => l.textContent) : null;
    });
    ok(
      '商會 整區換到上限：會用光才出卡、明細由最低階起逐列、用光列寫「用光」',
      !!a1 && a1[0].startsWith('用掉寒鐵') && a1[1].startsWith('用掉霜革') && a1.some(x => x.includes('用光')),
      JSON.stringify(a1)
    );
    await tapOrClick(p, '#pguild .gcf [data-gd=no]');
    /* G02：額度 0 → 區框紅、按鈕停用、按了不扣；崇高石照常；戰場沒有浮動字 */
    await p.evaluate(() => {
      S.mat.tq.aug = [0, Date.now()];
      $('warn').textContent = '';
      $('warn').classList.remove('on');
      hudPanels();
    });
    const g2 = await p.evaluate(() => {
      const s = $('pguild').querySelector('.gsec[data-c=aug]');
      return {
        out: s.classList.contains('out'),
        q: s.querySelector('.gqt').textContent,
        rc: s.querySelector('.grc').textContent,
        dis: [...s.querySelectorAll('.gb')].every(b => b.getAttribute('aria-disabled') === 'true'),
        ex: [...$('pguild').querySelectorAll('.gsec[data-c=exalt] .gb')].some(
          b => b.getAttribute('aria-disabled') !== 'true'
        ),
        bc: getComputedStyle(s).borderTopColor,
        m: [matN('wood'), matN('iron', 5), MAT().aug]
      };
    });
    ok(
      '商會 G02 額度 0：區框紅、「這小時換完了　0／234 顆」、回復行倒數、整區按鈕停用；崇高石照常',
      g2.out &&
        g2.q === '這小時換完了　0／234 顆' &&
        /^加詞石這小時換完了・約 \d+ 秒後回 1 顆$/.test(g2.rc) &&
        g2.dis &&
        g2.ex &&
        g2.bc === 'rgb(255, 155, 186)',
      JSON.stringify(g2)
    );
    if (DESK) {
      const hr = await p.evaluate(() => {
        const e = $('pguild').querySelector('.gsec[data-c=aug] [data-gd="max:aug:iron:5"]').getBoundingClientRect();
        return [e.left + 20, e.top + 10];
      });
      await p.mouse.move(hr[0], hr[1]);
      await p.waitForTimeout(250);
      const gt = await p.evaluate(() => [!$('gtip').hidden, $('gtip').textContent]);
      ok('商會 G02 懸停停用鈕出同一句原因', gt[0] && gt[1].startsWith('加詞石這小時換完了'), JSON.stringify(gt));
      await snap(p, 'guild', 'G02-實機');
      await p.mouse.move(5, 300);
    }
    await tapOrClick(p, '#pguild [data-gd="max:aug:iron:5"]');
    await tapOrClick(p, '#pguild [data-gd="one:aug:wood:0"]');
    const g3 = await p.evaluate(() => [
      matN('wood'),
      matN('iron', 5),
      MAT().aug,
      !!GUILD.pend,
      $('warn').classList.contains('on') ? $('warn').textContent : ''
    ]);
    ok(
      '商會 G02 按停用鈕不扣材料、不給通貨、戰場不出浮動字',
      g3[0] >= g2.m[0] && g3[1] === g2.m[1] && g3[2] === g2.m[2] && !g3[3] && !g3[4],
      JSON.stringify([g2.m, g3])
    );
    /* 額度連續回復、最多 1 小時份、離線照算 */
    const q = await p.evaluate(() => {
      const n = Date.now();
      S.mat.tq.aug = [0, n - 30 * 60000];
      const a = Math.round(tradeQ('aug'));
      S.mat.tq.aug = [0, n - 5 * 3600000];
      return [a, Math.round(tradeQ('aug')), Math.round(tradeQ('exalt', n + 3600000 * 9))];
    });
    ok(
      '商會 額度：離開 30 分回 117、離開 5 小時只存 234（1 小時份）、崇高石最多 26',
      q.join() === '117,234,26',
      JSON.stringify(q)
    );
    /* Steam Deck 1280×800：面板與卡不在 y>720 */
    if (DESK && W === 1280 && H === 800) {
      const d = await p.evaluate(() => $('pguild').getBoundingClientRect().bottom);
      ok('商會 Steam Deck 1280×800：面板下緣 ≤ 720', d <= 720, d);
    }
    await p.close();
  }

  /* ================= 剩餘小畫面（small-screens REVIEW-CHECKLIST） ================= */
  {
    const p = await fresh(32);
    /* M01 更多：9 格 3×3、無追逐物品格 */
    const m = await p.evaluate(() => {
      Object.assign(S.camp, { altar: 7, forge: 20, watch: 26, store: 5 });
      chaseSeen().on = 1; /* 追逐物品已開放：舊版更多會多一格 */
      closePanels();
      openPanel('more');
      const L = [...$('pmore').querySelectorAll('.mrow')],
        xs = [...new Set(L.map(e => Math.round(e.getBoundingClientRect().left)))],
        ws = [...new Set(L.map(e => Math.round(e.getBoundingClientRect().width)))],
        r = $('pmore').getBoundingClientRect();
      return {
        n: L.map(e => e.querySelector('b').textContent),
        xs,
        ws,
        chaseOn: chaseOn(),
        rect: [r.left, r.top, r.width, r.height].map(Math.round),
        t: $('pmore').textContent
      };
    });
    ok(
      '更多 M01 追逐物品已開放時也沒有追逐物品格',
      m.chaseOn && !m.n.some(x => x.includes('追逐')),
      JSON.stringify(m.n)
    );
    const innerW = W;
    if (DESK) {
      ok(
        '更多 M01 桌機右側停靠 788,76 476×536、三欄 140 寬',
        m.rect.join() === `${innerW - 492},76,476,536` && m.xs.length === 3 && m.ws.join() === '140',
        JSON.stringify(m)
      );
      const hv = await p.evaluate(() => {
        const e = $('pmore').querySelector('[data-tm="f:log"]'),
          b0 = getComputedStyle(e).backgroundColor;
        return [b0, e.getBoundingClientRect().left + 30, e.getBoundingClientRect().top + 30];
      });
      await p.mouse.move(hv[1], hv[2]);
      await p.waitForTimeout(200);
      const hv2 = await p.evaluate(() => {
        const e = $('pmore').querySelector('[data-tm="f:log"]');
        return [
          getComputedStyle(e).backgroundColor,
          getComputedStyle(e).borderTopColor,
          +__cr(e.querySelector('small')).toFixed(2),
          +__cr(e.querySelector('kbd')).toFixed(2)
        ];
      });
      ok(
        '更多 M01 懸停只換邊色（--sel-edge）、不換底；副標與鍵帽對比 ≥ 4.5',
        hv2[0] === hv[0] && hv2[1] === 'rgb(168, 146, 127)' && hv2[2] >= 4.5 && hv2[3] >= 4.5,
        JSON.stringify([hv, hv2])
      );
      const zr = await p.evaluate(() => {
        const e = $('pmore').querySelector('[data-zh="山海寶盒"]').getBoundingClientRect();
        return [e.left + 8, e.top + 6];
      });
      await p.mouse.move(zr[0], zr[1]);
      await p.waitForTimeout(650);
      const zt = await p.evaluate(() => [
        !$('ztip').hidden,
        $('ztip').getBoundingClientRect().right <= $('pmore').getBoundingClientRect().left
      ]);
      ok('更多 M01 山海寶盒名詞提示往左貼在戰場、不蓋格', zt[0] && zt[1], JSON.stringify(zt));
      await snap(p, 'small-screens', 'M01-實機');
      await p.mouse.move(5, 300);
    }
    if (DESK) {
      await p.evaluate(() => closePanels());
      await p.keyboard.press('y');
      await p.waitForTimeout(200);
      const y = await p.evaluate(() => [chaseOn(), PANEL.chase, FMENU.find(f => f[0] === 'chase')[2]]);
      ok('更多 M01 快捷鍵 Y 照舊：開放後開追逐物品', y[2] === 'Y' && y[1] === y[0], JSON.stringify(y));
      await p.evaluate(() => closePanels());
    }
    /* 營地場景：沒有回營地 → 往前遞補 */
    const mc = await p.evaluate(() => {
      enterCamp();
      closePanels();
      openPanel('more');
      return [...$('pmore').querySelectorAll('.mrow b')].map(b => b.textContent);
    });
    ok(
      '更多 營地場景沒有回營地、後面的格往前遞補（無空洞）',
      !mc.includes('回營地') && mc.length >= 7,
      JSON.stringify(mc)
    );
    await p.evaluate(() => (closePanels(), runNode(TRUNK_K[0])));
    await p.waitForTimeout(300);

    /* S01 設定：滿寬三欄、23 列快捷鍵免捲 */
    const s = await p.evaluate(() => {
      closePanels();
      openPanel('set');
      const P = $('pset'),
        c = ['.setc1', '.setc2', '.setc3'].map(q => P.querySelector(q).getBoundingClientRect()),
        r = P.getBoundingClientRect(),
        dt = [...P.querySelectorAll('.keyl dt')];
      return {
        rect: [r.left, r.top, r.width, r.height].map(Math.round),
        cols: c.map(x => [Math.round(x.left), Math.round(x.top)]),
        inside: c.every(x => x.bottom <= r.bottom + 1 && x.right <= r.right + 1),
        noScroll: P.scrollHeight <= P.clientHeight + 1,
        keys: dt.length,
        keysIn: dt.every(e => e.getBoundingClientRect().bottom <= r.bottom),
        small: [...P.querySelectorAll('.gkind .btn small')].map(e => [getComputedStyle(e).color, +__cr(e).toFixed(2)])
      };
    });
    if (DESK) {
      ok(
        '設定 S01 滿寬面板 16,76 1248×536、三欄（x 32／448／888，同一個 y）、免捲',
        s.rect.join() === '16,76,1248,536' &&
          s.cols.map(x => x[0]).join() === '32,448,888' &&
          new Set(s.cols.map(x => x[1])).size === 1 &&
          s.inside &&
          s.noScroll,
        JSON.stringify(s)
      );
      ok('設定 S01 快捷鍵 23 列全在面板內', s.keys === 23 && s.keysIn, s.keys);
    } else ok('設定 390：手勢 6 列、面板可捲', s.keys === 6, s.keys);
    ok(
      '設定 鈕內第二行用 --tx（不是 --tx-dim）、對比 ≥ 4.5',
      s.small.length && s.small.every(x => x[0] === 'rgb(232, 229, 225)' && x[1] >= 4.5),
      JSON.stringify(s.small)
    );
    if (DESK) {
      const zr = await p.evaluate(() => {
        const e = $('pset').querySelector('[data-zh="傷害數字"]').getBoundingClientRect();
        return [e.left + 8, e.top + 6];
      });
      await p.mouse.move(zr[0], zr[1]);
      await p.waitForTimeout(650);
      const zt = await p.evaluate(() => {
        const t = $('ztip').getBoundingClientRect(),
          b = [...$('pset').querySelectorAll('[data-a^="dmgn"]')].map(e => e.getBoundingClientRect());
        return [!$('ztip').hidden, b.every(x => x.bottom <= t.top)];
      });
      ok('設定 S01 傷害數字名詞提示在三顆選項下方、不蓋選項', zt[0] && zt[1], JSON.stringify(zt));
      await snap(p, 'small-screens', 'S01-實機');
      await p.mouse.move(5, 300);
    }
    /* S02 登入覆蓋：兩步確認卡、取消為主鈕與預設焦點、危險次鈕紅框紅字、無長按 */
    await p.evaluate(() => {
      S.lv = 38;
      S.gold = 12400;
      window.__used = 0;
      window.__useSave0 = useSave;
      useSave = () => (window.__used = 1);
      authCfAsk({ v: 12, lv: 52 }, 'login');
    });
    await p.waitForTimeout(200);
    const c = await p.evaluate(`(() => {
      const A = $('authcf'), y = A.querySelector('.acfy'), n = A.querySelector('.acfn'), w = A.querySelector('.acfw');
      return { on: !A.hidden, t: A.textContent, focus: document.activeElement === n, nPri: n.classList.contains('pri'),
        yB: getComputedStyle(y).borderTopColor, yC: getComputedStyle(y).color, yBg: getComputedStyle(y).backgroundColor, wB: getComputedStyle(w).borderTopColor,
        cr: [...A.querySelectorAll('b, p, small, .btn')].map(e => +__cr(e).toFixed(2)), inV: (${inView})('#authcf .btn'),
        yL: y.getBoundingClientRect().left < n.getBoundingClientRect().left };
    })()`);
    ok(
      '登入 S02 兩步確認卡：題、說明、另一條路、⚠ 警示與摘要',
      c.on &&
        c.t.includes('登入會覆蓋這台裝置的訪客進度') &&
        c.t.includes('角色 Lv 52') &&
        c.t.includes('訪客進度：角色 Lv 38・金 12,400') &&
        c.t.includes('⚠ 訪客進度覆蓋後不能復原') &&
        !c.t.includes('長按'),
      c.t
    );
    ok(
      '登入 S02 取消是主鈕且預設焦點；確認登入並覆蓋在左、--panel-raised＋2px --bad 紅框紅字；警示框 --bad',
      c.focus &&
        c.nPri &&
        c.yL &&
        c.yB === 'rgb(255, 155, 186)' &&
        c.yC === 'rgb(255, 155, 186)' &&
        c.yBg === 'rgb(44, 40, 37)' &&
        c.wB === 'rgb(255, 155, 186)',
      JSON.stringify(c)
    );
    ok('登入 S02 卡內字／底對比 ≥ 4.5、兩顆鈕在畫面內', c.cr.every(x => x >= 4.5) && c.inV, JSON.stringify(c.cr));
    await snap(p, 'small-screens', 'S02-實機');
    const lv0 = await p.evaluate(() => S.lv);
    await tapOrClick(p, '#authcf .acfn');
    await p.waitForTimeout(300);
    const cx = await p.evaluate(() => [$('authcf').hidden, window.__used, S.lv]);
    ok(
      '登入 S02 取消：卡關掉、不載入雲端存檔、本機進度不變',
      cx[0] && cx[1] === 0 && cx[2] === lv0,
      JSON.stringify(cx)
    );
    await p.evaluate(() => authCfAsk({ v: 12, lv: 52 }, 'login'));
    await tapOrClick(p, '#authcf .acfy');
    await p.waitForTimeout(300);
    const cy = await p.evaluate(() => [$('authcf').hidden, window.__used]);
    ok('登入 S02 按一下「確認登入並覆蓋」就執行（無長按）', cy[0] && cy[1] === 1, JSON.stringify(cy));
    const gh = await p.evaluate(() => {
      const a = [S.lv, S.xp, S.inv.items.length];
      S.lv = 1;
      S.xp = 0;
      const items = S.inv.items;
      S.inv.items = [];
      const r = guestHas();
      S.inv.items = items;
      [S.lv, S.xp] = a;
      useSave = window.__useSave0;
      return [r, guestHas()];
    });
    ok(
      '登入 本機無訪客進度（Lv 1、無經驗、倉庫空）不出卡；有進度才出',
      gh[0] === false && gh[1] === true,
      JSON.stringify(gh)
    );
    /* S03 已登入 */
    if (DESK) {
      await p.evaluate(() => {
        CLOUD.anon = false;
        CLOUD.email = 'player@example.com';
        AUTH.msg = '已登入，載入這個帳號的存檔';
        AUTH.err = false;
        hudPanels();
      });
      await snap(p, 'small-screens', 'S03-實機');
      await p.evaluate(() => ((AUTH.recovery = true), (AUTH.msg = ''), hudPanels()));
      await snap(p, 'small-screens', 'S03b-重設密碼-實機');
      await p.evaluate(() => ((AUTH.recovery = false), (CLOUD.anon = true), hudPanels()));
    }
    /* L01／L02 掉落紀錄 */
    const l = await p.evaluate(() => {
      closePanels();
      const n = Date.now();
      S.log = [
        { c: 'chase', n: '王印・燭龍', t: n - 3e4, k: Object.keys(S.chase.got || {})[0] || 'x' },
        { c: 'frac', n: '破裂石', t: n - 2 * 60000 },
        { c: 'mid', n: '寒鐵盾', t: n - 5 * 60000 },
        { c: 'cur', n: '崇高石', t: n - 9 * 60000 },
        { c: 'perf', n: '完美石', t: n - 14 * 60000 },
        { c: 'mem', n: '追憶之墨', t: n - 30 * 60000 },
        { c: 'pack', n: '靈魂包 1,200', t: n - 50 * 60000 },
        { c: 'mid', n: '隕鐵鎚', t: n - 2 * 3600000 },
        { c: 'cur', n: '至臻石', t: n - 3 * 3600000 },
        { c: 'cur', n: '轉化石', t: n - 4 * 3600000 },
        { c: 'mid', n: '霜革靴', t: n - 5 * 3600000 }
      ];
      Object.assign(S.camp, { forge: 20 });
      openPanel('log');
      const P = $('plog');
      return {
        tags: [...P.querySelectorAll('.lgl li > i')].map(e => e.textContent),
        html: P.innerHTML,
        t: P.textContent,
        cr: [...P.querySelectorAll('.lgl li > i, .lgl li small, .lgl li span')].map(e => +__cr(e).toFixed(2))
      };
    });
    ok(
      '掉落紀錄 L01 類別框標全是文字（追逐、破裂、裝備、通貨、完美、追憶、靈魂包）',
      ['追逐', '破裂', '裝備', '通貨', '完美', '追憶', '靈魂包'].every(x => l.tags.includes(x)),
      JSON.stringify(l.tags)
    );
    ok('掉落紀錄 B5／C4 DOM 內無「好胚」、無 ★／◈（含 aria-label、title）', !/好胚|★|◈/.test(l.html), '');
    ok(
      '掉落紀錄 L01 框標與列字對比 ≥ 4.5',
      l.cr.every(x => x >= 4.5),
      JSON.stringify(l.cr)
    );
    ok('掉落紀錄 L01 保底進度附名詞提示', /data-zh="保底進度"/.test(l.html));
    if (DESK) {
      const zr = await p.evaluate(() => {
        const e = $('plog').querySelector('[data-zh="保底進度"]').getBoundingClientRect();
        return [e.left + 8, e.top + 6];
      });
      await p.mouse.move(zr[0], zr[1]);
      await p.waitForTimeout(650);
      const zt = await p.evaluate(() => [
        !$('ztip').hidden,
        $('ztip').getBoundingClientRect().right <= $('plog').getBoundingClientRect().left
      ]);
      ok('掉落紀錄 L01 保底進度提示往左貼在戰場、不蓋進度條', zt[0] && zt[1], JSON.stringify(zt));
      await snap(p, 'small-screens', 'L01-實機');
      await p.mouse.move(5, 300);
    }
    /* B02 稀有掉落橫幅：文字框標、無 ★ */
    const bn = await p.evaluate(() => {
      closePanels();
      banner('破裂石', 'frac');
      return [$('banner').innerHTML, +__cr($('banner').querySelector('span')).toFixed(2)];
    });
    ok(
      '稀有橫幅 B02 類別用文字框標「破裂」、無 ★',
      bn[0].includes('>破裂<') && !/★/.test(bn[0]) && bn[1] >= 4.5,
      JSON.stringify(bn)
    );
    if (DESK) {
      await p.evaluate(() => {
        const xp = xpNeed(S.lv) - S.xp;
        gainXp(xp);
      });
      await snap(p, 'small-screens', 'B02-實機');
      /* B01 追逐橫幅：滑鼠停在橫幅上暫停倒數 */
      await p.waitForTimeout(2800);
      await p.evaluate(() => devChase());
      await p.waitForTimeout(1500);
      const ch = await p.evaluate(() => {
        const e = $('chase').getBoundingClientRect();
        return [e.left + 200, e.top + 30, CB.st];
      });
      await p.mouse.move(ch[0], ch[1]);
      await p.waitForTimeout(3500);
      const ch2 = await p.evaluate(() => [CB.st, !$('chase').hidden]);
      ok('追逐橫幅 B01 滑鼠停在上面暫停倒數（3.5 秒後仍在）', ch2[1] && ch2[0] !== 'idle', JSON.stringify([ch, ch2]));
      await snap(p, 'small-screens', 'B01-實機');
      await p.mouse.move(5, 300);
      /* C01 回營地確認 */
      await p.waitForTimeout(3500);
      await p.evaluate(() => (closePanels(), campAsk()));
      const ca = await p.evaluate(() => $('over').textContent);
      ok(
        '回營地確認 C01：回營地（T）、繼續刷圖（Esc）',
        ca.includes('回營地？') && ca.includes('回營地T') && ca.includes('繼續刷圖Esc'),
        ca
      );
      await snap(p, 'small-screens', 'C01-實機');
      const sm = await p.evaluate(() =>
        [...$('over').querySelectorAll('.btn small')].map(e => [getComputedStyle(e).color, +__cr(e).toFixed(2)])
      );
      ok(
        '回營地確認 C01 鈕內第二行對比 ≥ 4.5',
        sm.every(x => x[1] >= 4.5),
        JSON.stringify(sm)
      );
      await p.evaluate(() => act('askno'));
      /* O01 離線結算 */
      await p.evaluate(() =>
        offShow({
          away: 3 * 3600000 + 42 * 60000,
          cur: [
            ['exalt', 3],
            ['zhi', 1],
            ['aug', 120]
          ],
          won: 34,
          soul: 316800,
          here: 1,
          chase: 1
        })
      );
      await p.waitForTimeout(1600);
      const of = await p.evaluate(() => [
        $('poff').innerHTML,
        document.activeElement && document.activeElement.textContent
      ]);
      ok(
        '離線結算 O01 數字寫完整（316,800）、掉落列無 ★／◆、追逐列「印」框標',
        of[0].includes('316,800') && !/★|◆/.test(of[0]) && of[0].includes('>印<'),
        of[0].slice(0, 300)
      );
      await snap(p, 'small-screens', 'O01-實機');
      await p.evaluate(() => act('offok'));
      /* D02 自動倒下：只出字板 */
      await p.evaluate(() => ((S.auto = 1), die()));
      await p.waitForTimeout(300);
      const d2 = await p.evaluate(() => [!$('dplate').hidden, $('over').hidden, $('dplate').textContent]);
      ok('倒下 D02 自動模式只出字板、不出卡', d2[0] && d2[1], JSON.stringify(d2));
      await snap(p, 'small-screens', 'D02-實機');
      await p.waitForTimeout(3500);
      /* D01 手動倒下 */
      await p.evaluate(() => {
        S.auto = 0;
        S.mat.soul = 1e7;
        matAdd('wood', 0, 1e6);
        G.state = 'play';
        P.hp = 1;
        die();
      });
      await p.waitForTimeout(400);
      const d1 = await p.evaluate(() => {
        const h = $('over').querySelector('h2');
        return [h && h.textContent, h && getComputedStyle(h).color];
      });
      ok(
        '倒下 D01 標題「你倒下了」不用紅（--tx-strong）',
        d1[0] === '你倒下了' && d1[1] === 'rgb(251, 249, 246)',
        JSON.stringify(d1)
      );
      await snap(p, 'small-screens', 'D01-實機');
    }
    await p.close();
  }
  /* L02 空狀態、P01、T01、T02 用新存檔 */
  {
    const p = await fresh(33);
    const l2 = await p.evaluate(() => {
      S.log = [];
      openPanel('log');
      return [$('plog').querySelector('.lgl').textContent, $('plog').querySelectorAll('.lgbar').length];
    });
    ok(
      '掉落紀錄 L02 新存檔空狀態句',
      l2[0] === '還沒有掉落。刷地點時，稀有以上的掉落會記在這裡（最近 50 筆）。',
      JSON.stringify(l2)
    );
    await snap(p, 'small-screens', 'L02-實機');
    if (DESK) {
      await p.evaluate(() => (closePanels(), enterCamp(), pracGo()));
      await p.waitForTimeout(1500);
      await snap(p, 'small-screens', 'P01-實機');
    }
    await p.close();
  }
  {
    const p = await fresh(34, false);
    const t = await p.evaluate(`(() => {
      const g = $('ivg'), img = g.querySelector('.ivbg'), sc = g.querySelector('.ivsc'), h = g.querySelector('h1'), lg = h && h.querySelector('img'), dv = g.querySelector('.tdiv'), b = $('ivgo');
      const r = e => { const x = e.getBoundingClientRect(); return [x.left, x.top, x.right, x.bottom].map(Math.round); };
      const sk = document.querySelector('#intro .ivskip'), cs = getComputedStyle(sc);
      return { vis: !g.hidden && getComputedStyle(g).display !== 'none', src: img && img.currentSrc, nw: img && img.naturalWidth, nh: img && img.naturalHeight, fit: img && getComputedStyle(img).objectFit,
        pix: img && getComputedStyle(img).imageRendering, img: r(img), sc: r(sc), scBg: cs.backgroundColor, scImg: cs.backgroundImage,
        lgSrc: lg && lg.currentSrc, lgAlt: lg && lg.alt, lgN: lg && [lg.naturalWidth, lg.naturalHeight], lgPix: lg && getComputedStyle(lg).imageRendering, lg: lg && r(lg),
        dv: r(dv), dvAria: dv.getAttribute('aria-hidden'), b: r(b), bTx: b.textContent, bAria: b.getAttribute('aria-label'),
        lb: r(b.querySelector('.lb')), lbLs: getComputedStyle(b.querySelector('.lb')).letterSpacing, bFont: getComputedStyle(b).font, seals: [...b.querySelectorAll('.seal')].map(r), cn: b.querySelectorAll('.cn').length,
        skip: !!sk && sk.getBoundingClientRect().width > 0, gTx: g.textContent, title: document.title,
        focus: document.activeElement === b, W: innerWidth, H: innerHeight };
    })()`);
    ok(
      '開場 T02 背景圖 A 接上：img/title/t02_title_bg_A_1280x720.png（1280×720）、object-fit cover、pixelated、滿版',
      t.vis &&
        /\/img\/title\/t02_title_bg_A_1280x720\.png$/.test(t.src) &&
        t.nw === 1280 &&
        t.nh === 720 &&
        t.fit === 'cover' &&
        t.pix === 'pixelated' &&
        t.img.join() === `0,0,${t.W},${t.H}`,
      JSON.stringify(t)
    );
    ok(
      '開場 T02 中央局部暗暈：radial-gradient 380×260、50%→38%→0，無全畫面 0.62 遮罩',
      t.sc.join() === `0,0,${t.W},${t.H}` &&
        t.scBg === 'rgba(0, 0, 0, 0)' &&
        /^radial-gradient\(380px 260px( at |,)/.test(t.scImg) &&
        /rgba\(0, 0, 0, 0\.5\) 0(px|%)?, rgba\(0, 0, 0, 0\.38\) 55%, rgba\(0, 0, 0, 0\) 100%/.test(t.scImg) &&
        !/0\.62/.test(t.scImg),
      JSON.stringify([t.sc, t.scBg, t.scImg])
    );
    ok(
      '開場 T02 標題：<title>山海燼窟 Shanhai Crypts、<h1> 內 Logo L3、alt「山海燼窟 SHANHAI CRYPTS」（燼 U+71FC）、pixelated、整數倍原圖',
      t.title === '山海燼窟 Shanhai Crypts' &&
        t.lgAlt === '山海燼窟 SHANHAI CRYPTS' &&
        t.lgAlt.charCodeAt(2) === 0x71fc &&
        t.lgPix === 'pixelated' &&
        ((/\/img\/title\/t02_title_logo_L3_2x\.png$/.test(t.lgSrc) && t.lgN.join() === '880,268') ||
          (/\/img\/title\/t02_title_logo_L3_1x\.png$/.test(t.lgSrc) && t.lgN.join() === '440,134')),
      JSON.stringify([t.title, t.lgAlt, t.lgSrc, t.lgN, t.lgPix])
    );
    ok(
      '開場 T02 主鈕「踏入燼窟」：aria-label 同字、4 角＋2 菱印、700 22px Noto Serif TC、字距 0.24em、預設焦點',
      t.bTx === '踏入燼窟' &&
        t.bAria === '踏入燼窟' &&
        t.cn === 4 &&
        t.seals.length === 2 &&
        /^700 22px/.test(t.bFont) &&
        /Noto Serif TC/.test(t.bFont) &&
        Math.abs(parseFloat(t.lbLs) - 22 * 0.24) < 0.05 &&
        t.focus,
      JSON.stringify([t.bTx, t.bAria, t.cn, t.seals.length, t.bFont, t.lbLs, t.focus])
    );
    ok(
      '開場 T02 維持極簡：沒有跳過文字鈕、Enter 提示、版本號',
      !t.skip && !/Enter|跳過|開始|dungeonPOE|v\d|\d+\.\d+/.test(t.gTx),
      JSON.stringify([t.skip, t.gTx])
    );
    {
      const css = require('fs').readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
      const bad = [];
      css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/([^{}]+)\{([^{}]*)\}/g, (m, sel, body) => {
        if (/var\(--t02-/.test(body) && sel.split(',').some(q => !/#ivg\b/.test(q))) bad.push(sel.trim());
        if (/--t02-[\w-]+\s*:/.test(body) && sel.trim() !== ':root') bad.push(sel.trim());
        return '';
      });
      ok(
        '--t02-* 只宣告在 :root、只用在 T02（用到的選擇器都在 #ivg 內）',
        !bad.length && /--t02-bronze/.test(css),
        JSON.stringify(bad.slice(0, 3))
      );
    }
    ok(
      '開場 T02 Logo、分隔線、主鈕都在畫面內；主鈕 ≥ 44 px',
      [t.lg, t.dv, t.b].every(q => q[0] >= 0 && q[1] >= 0 && q[2] <= t.W && q[3] <= t.H) &&
        t.b[3] - t.b[1] >= 44 &&
        t.dvAria === 'true',
      JSON.stringify([t.lg, t.dv, t.b])
    );
    if (DESK && (H === 720 || H === 800) && W === 1280) {
      ok(
        '開場 T02 座標：Logo 200,146 880×268、分隔線 480,432 320×9、主鈕 504,463 272×56',
        t.lg.join() === '200,146,1080,414' && t.dv.join() === '480,432,800,441' && t.b.join() === '504,463,776,519',
        JSON.stringify([t.lg, t.dv, t.b])
      );
      /* 字墨中心：.lb 寬含最後一個字距（0.24em），扣掉才是字 */
      const ink = (t.lb[0] + t.lb[2] - 22 * 0.24) / 2,
        l = t.seals[0][0] - t.b[0],
        rr = t.b[2] - t.seals[1][2];
      ok(
        '開場 T02 主鈕字置中（±1 px）、左右菱印到鈕邊等距（±1 px）',
        Math.abs(ink - 640) <= 1 && Math.abs(l - rr) <= 1,
        JSON.stringify([ink, l, rr])
      );
    }
    if (DESK && H === 720 && W === 1280) {
      /* 兩側火把：x<230、x>1050 的像素跟原圖一樣（局部暗暈不壓）；中央有壓暗 */
      await p.mouse.move(5, 700);
      const png = (await p.screenshot()).toString('base64');
      const tor = await p.evaluate(async b64 => {
        const ld = s =>
          new Promise(res => {
            const i = new Image();
            i.onload = () => res(i);
            i.src = s;
          });
        const [a, o] = await Promise.all([
          ld('data:image/png;base64,' + b64),
          ld($('ivg').querySelector('.ivbg').currentSrc)
        ]);
        const px = im => {
          const c = document.createElement('canvas');
          c.width = 1280;
          c.height = 720;
          const x = c.getContext('2d');
          x.drawImage(im, 0, 0);
          return x.getImageData(0, 0, 1280, 720).data;
        };
        const A = px(a),
          O = px(o);
        let side = 0,
          n = 0,
          mid = 0,
          mo = 0;
        for (let y = 0; y < 720; y++)
          for (let x = 0; x < 1280; x++) {
            const i = (y * 1280 + x) * 4,
              d = Math.max(Math.abs(A[i] - O[i]), Math.abs(A[i + 1] - O[i + 1]), Math.abs(A[i + 2] - O[i + 2]));
            if (x < 230 || x > 1050) {
              n++;
              if (d > 2 && !(x >= 200 && x < 1080 && y >= 146 && y < 414)) side++; /* Logo 本身壓到兩側的部分不算 */
            }
            if (x >= 400 && x < 470 && y >= 418 && y < 430) {
              mid += A[i] + A[i + 1] + A[i + 2];
              mo += O[i] + O[i + 1] + O[i + 2];
            }
          }
        return [side, n, +(mid / Math.max(mo, 1)).toFixed(3)];
      }, png);
      ok(
        '開場 T02 兩側火把亮度與原圖相同（x<230、x>1050 像素不變）、中央有壓暗',
        tor[0] === 0 && tor[2] < 0.8,
        JSON.stringify(tor)
      );
      /* 四態：一般（無焦點、滑鼠不在上面）／懸停／按下／鍵盤焦點，色值與動效 */
      const st = () =>
        p.evaluate(() => {
          const b = $('ivgo'),
            c = getComputedStyle(b),
            se = getComputedStyle(b.querySelector('.seal')),
            cn = getComputedStyle(b.querySelector('.cn'));
          return [
            c.color,
            c.borderTopColor,
            c.borderTopStyle,
            se.backgroundColor,
            cn.borderTopColor,
            c.outlineStyle + ' ' + c.outlineColor + ' ' + c.outlineOffset,
            c.transform,
            c.backgroundImage.slice(0, 120),
            c.transitionDuration
          ];
        });
      await p.evaluate(() => $('ivgo').blur());
      await p.waitForTimeout(200);
      const s0 = await st();
      await p.mouse.move(640, 491);
      await p.waitForTimeout(200);
      const s1 = await st();
      await p.mouse.down();
      await p.waitForTimeout(150);
      const s2 = await st();
      await p.mouse.move(5, 700); /* 移出鈕外才放開：不觸發開始 */
      await p.mouse.up();
      await p.evaluate(() => $('ivgo').blur());
      await p.keyboard.press('Shift'); /* 鍵盤操作過，焦點才算 :focus-visible */
      await p.evaluate(() => $('ivgo').focus());
      await p.waitForTimeout(200);
      const s3 = await p.evaluate(() => document.activeElement.id === 'ivgo' && $('ivgo').matches(':focus-visible'));
      const s3s = await st();
      await p.evaluate(() => ($('ivgo').disabled = true));
      await p.waitForTimeout(200);
      const s4 = await st();
      await p.evaluate(() => (($('ivgo').disabled = false), $('ivgo').focus()));
      ok(
        '主鈕一般：字 --tx、外框 #8a6c4e、菱印 #8a2a1a、角 #a8927f、三段深石漸層、120ms／60ms',
        s0[0] === 'rgb(232, 229, 225)' &&
          s0[1] === 'rgb(138, 108, 78)' &&
          s0[3] === 'rgb(138, 42, 26)' &&
          s0[4] === 'rgb(168, 146, 127)' &&
          /linear-gradient\(rgb\(45, 37, 31\) 0(px|%)?, rgb\(37, 33, 30\) 40%, rgb\(29, 26, 23\) 100%\)/.test(s0[7]) &&
          s0[8] === '0.12s, 0.12s, 0.12s, 0.06s' &&
          !/solid/.test(s0[5]),
        JSON.stringify(s0)
      );
      ok(
        '主鈕懸停：字 --tx-strong、外框 #b98a5e、菱印 #b01a14、角 #e3dcd3',
        s1[0] === 'rgb(251, 249, 246)' &&
          s1[1] === 'rgb(185, 138, 94)' &&
          s1[3] === 'rgb(176, 26, 20)' &&
          s1[4] === 'rgb(227, 220, 211)',
        JSON.stringify(s1)
      );
      ok(
        '主鈕按下：字 --tx、外框 #b98a5e、translateY(1px)、底 #16130f→#1d1a17 60%→#25211e',
        s2[0] === 'rgb(232, 229, 225)' &&
          s2[1] === 'rgb(185, 138, 94)' &&
          s2[6] === 'matrix(1, 0, 0, 1, 0, 1)' &&
          /linear-gradient\(rgb\(22, 19, 15\) 0(px|%)?, rgb\(29, 26, 23\) 60%, rgb\(37, 33, 30\) 100%\)/.test(s2[7]),
        JSON.stringify(s2)
      );
      ok(
        '主鈕鍵盤焦點：:focus-visible、同懸停色、outline 1px #e3dcd3 距 6px',
        s3 &&
          s3s[0] === 'rgb(251, 249, 246)' &&
          s3s[1] === 'rgb(185, 138, 94)' &&
          s3s[5] === 'solid rgb(227, 220, 211) 6px',
        JSON.stringify([s3, s3s])
      );
      ok(
        '主鈕停用：字 --tx-off、1px dashed #5a544e、菱印 #3f3b36、平塗 --panel-inset',
        s4[0] === 'rgb(157, 153, 149)' &&
          s4[1] === 'rgb(90, 84, 78)' &&
          s4[2] === 'dashed' &&
          s4[3] === 'rgb(63, 59, 54)' &&
          s4[7] === 'none',
        JSON.stringify(s4)
      );
      await snap(p, 'small-screens', 'T02-實機');
    }
    if (DESK && H === 800) ok('開場 T02 Steam Deck 1280×800：背景填滿 800 高', t.img[3] === 800, JSON.stringify(t.img));
    if (DESK) {
      await p.evaluate(() => introGo());
      await p.waitForTimeout(5200);
      await snap(p, 'small-screens', 'T01-實機');
    }
    await p.close();
  }
  ok('沒有 pageerror', !errs.length, JSON.stringify(errs.slice(0, 3)));
  console.log(`\n${pass} ✅ / ${fail} ❌`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
