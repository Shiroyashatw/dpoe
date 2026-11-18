/* dpoe-idle-card 驗收（M2-33 補遺 §5.1 掛機卡展開／收起／觀戰、§5.2 掉落動態）：只量、只截，不改遊戲。
   每個尺寸：三種狀態切換與矩形（mini 直立滿寬 44、桌機 380×44）、切換鈕大小、觀戰藏／留清單、X／N／Esc、觀戰的五種自動離開、
   重新整理後 full／mini 留著而 watch 不留（存本機、不進存檔）、掉落動態的合併與 9,999+、停留秒數、列數上限、
   跟 #area／#prog／#bossbar／小地圖／狀態圖示／#chase／掛機卡交集 0、怪身上沒有材料世界字、字對底 ≥ 4.5:1、減少動態。
   截圖放 evidence/dpoe-idle-card/。用法：先開本機伺服器（python3 -m http.server），node tools/idle_card_check.js [輸出資料夾] [網址] */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const OUT = process.argv[2] || path.join(__dirname, '..', 'evidence', 'dpoe-idle-card'),
  URL = process.argv[3] || 'http://localhost:8000/';
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const ok = (c, n, v = '') => {
  if (!c) fail++;
  console.log(`${c ? '✅' : '❌'} ${n}`, typeof v === 'string' ? v : JSON.stringify(v));
};
const helpers = () => {
  window.__r = s => {
    const e = typeof s === 'string' ? document.querySelector(s) : s;
    if (!e || e.hidden || !e.getClientRects().length) return null;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) return null;
    const r = e.getBoundingClientRect();
    return r.width && r.height ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
  };
  window.__ov = (a, b) =>
    !a || !b
      ? 0
      : Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
        Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  /* 小地圖的螢幕矩形（照 render.js drawMinimap 的公式自己算一次，不用遊戲裡的 mmRect） */
  window.__mm = () => {
    const t = TOUCH.on,
      w = t ? Math.min(PORT() ? 62 : 104, (68 * G.W) / G.H) / ZOOM : 190,
      h = (w * G.H) / G.W;
    return { x: IW - w - (t ? 10 / ZOOM : 16), y: t ? 60 / ZOOM : cvH() - h - 16, w, h };
  };
  /* 掉落動態每一列 vs HUD：交集面積總和與明細 */
  window.__feedOv = () => {
    /* 列剛進場時 opacity 從 0 開始：看位置就好（不算被擠掉的 .cut、整區藏起來的） */
    const rows = $('feed').hidden
        ? []
        : [...document.querySelectorAll('#feed .fd:not(.cut)')].map(e => {
            const r = e.getBoundingClientRect();
            return { x: r.left, y: r.top, w: r.width, h: r.height };
          }),
      L = ['#area', '#prog', '#bossbar', '#mech', '#chase', '#pidle', '#prac'].map(s => [s, __r(s)]);
    if (!(typeof IDLE !== 'undefined' && IDLE.v === 'watch') && G.scene === 'map') L.push(['小地圖', __mm()]);
    const bad = [];
    for (const r of rows) for (const [n, b] of L) if (__ov(r, b) > 0) bad.push(n);
    return { rows: rows.length, bad };
  };
  window.__reset = () => {
    closePanels();
    G.loot = null;
    hideTip();
    chaseBnHide();
    $('banner').hidden = true;
  };
  window.__feedClear = () => {
    for (const f of FEED.L.slice()) feedDrop(f);
    $('feedsr').textContent = '';
  };
  /* 合成色對比（底＝--plate-world 疊在場景最亮處白色上，最保守） */
  window.__contrast = () => {
    const rgb = c => c.match(/[\d.]+/g).map(Number),
      lum = ([r, g, b]) =>
        [r, g, b]
          .map(v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
          .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0),
      out = [];
    for (const e of document.querySelectorAll('#feed .fd')) {
      const bg = rgb(getComputedStyle(e).backgroundColor),
        a = bg[3] == null ? 1 : bg[3],
        base = [0, 1, 2].map(i => bg[i] * a + 255 * (1 - a)),
        Lb = lum(base);
      for (const t of [e.querySelector('b'), e.querySelector('span:not(.ic)')].filter(Boolean)) {
        const Lt = lum(rgb(getComputedStyle(t).color));
        out.push(+((Math.max(Lt, Lb) + 0.05) / (Math.min(Lt, Lb) + 0.05)).toFixed(2));
      }
    }
    return out;
  };
};
async function boot(ctx, W, H, first = true) {
  const p = ctx.pages()[0] || (await ctx.newPage());
  if (first) p.on('pageerror', e => ok(false, `頁面錯誤 ${W}×${H}`, e.message));
  await p.goto(URL + '?test=chase&' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
  await p.evaluate(helpers);
  await p.evaluate(() => {
    try {
      introStop();
    } catch (e) {}
    window.hurtPlayer = () => 0;
  });
  await p.waitForTimeout(1800);
  await p.evaluate(() => __reset());
  await p.waitForTimeout(300);
  return p;
}
async function tap(p, sel) {
  const r = await p.evaluate(sel => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  }, sel);
  if (!r) throw new Error('找不到 ' + sel);
  return p.viewportSize().width < 900 ? p.touchscreen.tap(r.x, r.y) : p.mouse.click(r.x, r.y);
}
const shot = async (p, W, H, n, wait = 300) => {
  await p.waitForTimeout(wait);
  await p.screenshot({ path: path.join(OUT, `${n}_${W}x${H}.png`) });
};
const sec = async (name, f) => {
  try {
    await f();
  } catch (e) {
    ok(false, name + '（例外）', e.message.split('\n')[0]);
  }
};
async function size(b, W, H) {
  const port = W < 900,
    tag = `${W}×${H}`,
    bs = port ? 44 : 32;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: port, isMobile: port });
  await ctx.route(/supabase/, r => r.abort());
  let p = await boot(ctx, W, H);
  /* ---------- 三種狀態 ---------- */
  await sec(`${tag} full`, async () => {
    const r = await p.evaluate(() => ({
      v: IDLE.v,
      card: __r('#pidle'),
      row: __r('#pidle .itop'),
      bt: [...document.querySelectorAll('#pidle .itop .ibt')].map(e => [
        __r(e),
        e.getAttribute('aria-label'),
        e.getAttribute('aria-pressed')
      ])
    }));
    ok(r.v === 'full' && !!r.card, `${tag} 新玩家預設 full、卡在畫面上`, r.card);
    ok(
      r.bt.length === 2 && r.bt.every(([q]) => q && Math.round(q.w) === bs && Math.round(q.h) === bs),
      `${tag} 「本次掛機」那一行兩顆鈕 ${bs}×${bs}（收起、觀戰）`,
      r.bt.map(([q, l, a]) => `${l} ${q && Math.round(q.w)}×${q && Math.round(q.h)} pressed=${a}`).join('、')
    );
    ok(r.bt[0] && r.bt[0][1] === '收起掛機卡' && r.bt[1][1] === '觀戰', `${tag} aria-label 照規格`);
    ok(r.row && Math.round(r.row.h) >= bs, `${tag} 那一行高 ≥ ${bs}`, r.row && Math.round(r.row.h));
    await shot(p, W, H, 'full');
  });
  await sec(`${tag} 收起`, async () => {
    const h0 = await p.evaluate(() => CV.style.height);
    await tap(p, '#pidle .itop .ibt[data-a="idle:mini"]');
    const mid = await p.evaluate(() => ({
      d: document
        .getAnimations()
        .filter(a => a.effect && a.effect.target === $('pidle'))
        .map(a => a.effect.getTiming().duration),
      cv: CV.style.height
    }));
    ok(mid.d.includes(200), `${tag} 收起滑動 200 ms`, mid.d);
    ok(mid.cv === h0, `${tag} 動畫中畫布高度不變（結束才一次改高）`, `${h0} → ${mid.cv}`);
    await p.waitForTimeout(350);
    const r = await p.evaluate(() => ({
      v: IDLE.v,
      card: __r('#pidle'),
      nav: __r('#pnav'),
      cv: CV.getBoundingClientRect().height,
      bt: [...document.querySelectorAll('#pidle .ibt')].map(e => [
        __r(e),
        e.getAttribute('aria-label'),
        e.getAttribute('aria-pressed')
      ]),
      hit: ['#bhp', '#bmp', '#mech', '#bar', '.sk[data-k=use]', '.sk[data-k=roll]', '.modesw']
        .map(s => [s, __ov(__r(s), __r('#pidle'))])
        .filter(([, v]) => v > 0),
      txt: $('pidle').textContent
    }));
    ok(r.v === 'mini', `${tag} 點收起 → mini`);
    if (port)
      ok(
        r.card &&
          r.card.x === 0 &&
          Math.round(r.card.w) === W &&
          Math.round(r.card.h) === 44 &&
          Math.round(r.card.y + r.card.h) === Math.round(r.nav.y),
        `${tag} mini 滿寬 44 高、貼在 #pnav 上面`,
        { card: r.card, navTop: r.nav && r.nav.y }
      );
    else
      ok(
        r.card &&
          Math.round(r.card.x) === 16 &&
          Math.round(r.card.w) === 380 &&
          Math.round(r.card.h) === 44 &&
          Math.round(r.card.y + r.card.h) === H - 16,
        `${tag} mini 380×44、x 16、底 16`,
        r.card
      );
    if (port)
      ok(
        Math.round(r.cv) === Math.round(r.card.y),
        `${tag} 戰鬥區往下延伸到收起列上緣`,
        `畫布高 ${r.cv}、列上緣 ${r.card.y}`
      );
    ok(!r.hit.length, `${tag} 技能列、互動、翻滾、生命魔力條、狀態圖示跟 mini 交集 0`, r.hit);
    ok(
      r.bt.length === 2 &&
        r.bt.every(([q]) => q && Math.round(q.w) === bs) &&
        r.bt[0][1] === '觀戰' &&
        r.bt[1][1] === '展開掛機卡' &&
        r.bt[1][2] === 'true',
      `${tag} mini 右邊觀戰＋展開 ${bs}×${bs}、展開 aria-pressed=true`,
      r.bt.map(([q, l, a]) => `${l} ${q && Math.round(q.w)} ${a}`)
    );
    ok(/^掛機 .+・\d+ 輪\d+%/.test(r.txt), `${tag} mini 左「掛機 m 分・n 輪」、中保底 %`, r.txt);
    await shot(p, W, H, 'mini');
    /* 倉庫快滿、王倒下 */
    const w = await p.evaluate(() => {
      __S0 = S.inv.items.slice();
      while (S.inv.items.length < INV_CAP * 0.8) S.inv.items.push({ ...S.eq.weapon, id: 9e6 + S.inv.items.length });
      idleBar(1);
      return {
        t: $('pidle').querySelector('.iml').textContent,
        c: getComputedStyle($('pidle').querySelector('.iml')).color,
        warn: getComputedStyle(document.body).getPropertyValue('--warn')
      };
    });
    ok(w.t === '倉庫快滿', `${tag} mini 倉庫快滿換字（--warn）`, w);
    await shot(p, W, H, 'mini-warn', 100);
    const k = await p.evaluate(() => {
      S.inv.items = __S0;
      G.loot = {
        t: performance.now(),
        items: [],
        gold: 12,
        sold: 0,
        log: [],
        node: G.node,
        hint: false,
        boss: '測試王'
      };
      idleBar(1);
      return $('pidle').querySelector('.iml').textContent;
    });
    ok(/^打倒 測試王・30 秒$/.test(k), `${tag} mini 王倒下換字「打倒 {王名}・{s} 秒」`, k);
    await shot(p, W, H, 'mini-boss', 100);
    await p.waitForTimeout(450);
    await tap(p, '#pidle .iml');
    await p.waitForTimeout(400);
    const e = await p.evaluate(() => ({ v: IDLE.v, loot: $('pidle').textContent.includes('這一輪掉的') }));
    ok(e.v === 'full' && e.loot, `${tag} 點收起列（鈕以外）＝展開，王倒下時展開成王倒下卡`, e);
    await p.evaluate(() => ((G.loot = null), idleBar(1)));
    await p.waitForTimeout(450);
  });
  /* ---------- 觀戰 ---------- */
  const HIDE = port
    ? ['#pidle', '#pnav', '#area', '#mech', '#bar']
    : ['#pidle', '#dnav', '#area', '#mech', '#bar', '.modesw', '.dmenu'];
  await sec(`${tag} 觀戰`, async () => {
    await p.evaluate(() => {
      __mmN = 0;
      const f = drawMinimap;
      drawMinimap = W => (__mmN++, f(W));
      __Z0 = ZOOM;
      DBG.toast && 0;
      feed('磨刀石', 3, null, null);
    });
    await tap(p, '#pidle .ibt[data-a="idle:watch"]');
    await p.waitForTimeout(400);
    const r = await p.evaluate(
      H => ({
        v: IDLE.v,
        hid: H.filter(s => __r(s)),
        keep: ['#bhp', '#ohp', '#feed', '#wexit'].filter(s => __r(s)),
        prog: G.bossOut ? 'boss' : __r('#prog') ? 'on' : 'off',
        ex: __r('#wexit'),
        exOp: getComputedStyle($('wexit')).opacity,
        cv: CV.getBoundingClientRect().height,
        z: ZOOM === __Z0,
        mm: ((__mmN = 0), 0)
      }),
      HIDE
    );
    await p.waitForTimeout(300);
    const mm = await p.evaluate(() => __mmN);
    ok(r.v === 'watch', `${tag} 點觀戰 → watch`);
    ok(!r.hid.length, `${tag} 觀戰藏起來：${HIDE.join('、')}、小地圖`, r.hid);
    ok(mm === 0, `${tag} 觀戰時小地圖不畫`, `drawMinimap ${mm} 次`);
    ok(
      r.keep.includes('#feed') &&
        r.keep.includes('#wexit') &&
        (r.keep.includes('#bhp') || r.keep.includes('#ohp')) &&
        r.prog !== 'off',
      `${tag} 觀戰留著：生命魔力、首領進度、掉落動態、離開鈕`,
      r
    );
    ok(
      r.ex &&
        Math.round(r.ex.w) === bs &&
        Math.round(W - r.ex.x - r.ex.w) === 12 &&
        Math.round(r.ex.y) === 12 &&
        r.exOp === '0.6',
      `${tag} 離開鈕右上 12、${bs}×${bs}、平常 60%`,
      { ...r.ex, op: r.exOp }
    );
    if (port) ok(Math.round(r.cv) === H && r.z, `${tag} 直立觀戰畫布高＝視窗高、ZOOM 不變`, r.cv);
    /* 一般吐司藏、危險吐司留 */
    const t = await p.evaluate(() => {
      hudWarn('一般');
      const a = getComputedStyle($('warn')).visibility;
      hudWarn('倉庫滿了', 1);
      return [a, getComputedStyle($('warn')).visibility];
    });
    ok(t[0] === 'hidden' && t[1] === 'visible', `${tag} 一般吐司藏、危險吐司（倉庫滿）留`, t);
    await shot(p, W, H, 'watch');
    /* 觀戰中王倒下：不出王倒下卡 */
    const bl = await p.evaluate(() => {
      const m = G.mobs.find(o => o.boss) || G.mobs[0];
      const l0 = (S.log || []).length;
      bossDown({ D: m.D, x: P.x, y: P.y });
      return { loot: G.loot, v: IDLE.v };
    });
    ok(bl.loot === null && bl.v === 'watch', `${tag} 觀戰中王倒下不出王倒下卡`, bl);
    await p.evaluate(() => (G.nextT = 0));
    await tap(p, '#wexit');
    await p.waitForTimeout(300);
    ok((await p.evaluate(() => IDLE.v)) === 'full', `${tag} 離開鈕 → 回到開觀戰前（full）`);
  });
  await sec(`${tag} 鍵與自動離開`, async () => {
    const st = () => p.evaluate(() => IDLE.v);
    if (!port) {
      await p.keyboard.press('x');
      await p.waitForTimeout(350);
      ok((await st()) === 'mini', `${tag} X：full → mini`);
      await p.keyboard.press('x');
      await p.waitForTimeout(350);
      ok((await st()) === 'full', `${tag} X：mini → full`);
      await p.keyboard.press('n');
      await p.waitForTimeout(100);
      ok((await st()) === 'watch', `${tag} N：開觀戰`);
      await p.keyboard.press('n');
      await p.waitForTimeout(100);
      ok((await st()) === 'full', `${tag} N：關觀戰`);
      await p.keyboard.press('n');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(100);
      const e1 = await p.evaluate(() => ({ v: IDLE.v, set: !!PANEL.set }));
      ok(e1.v === 'full' && !e1.set, `${tag} Esc 在觀戰中＝離開觀戰（不開設定）`, e1);
      /* Esc 順序：對話框 → 觀戰 → 天賦樹 → 面板 → 設定 */
      const e2 = await p.evaluate(() => {
        const r = [];
        const esc = () => dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        G.ask = 1;
        esc();
        r.push(G.ask ? 'ask 還在' : 'ask 關');
        treeOpen('pt');
        esc();
        r.push(TREE.open ? 'tree 還在' : 'tree 關');
        openPanel('inv');
        esc();
        r.push(anyPanel() ? 'panel 還在' : 'panel 關');
        esc();
        r.push(PANEL.set ? '開設定' : '沒開設定');
        closePanels();
        G.ask = 0;
        return r;
      });
      ok(e2.join() === 'ask 關,tree 關,panel 關,開設定', `${tag} Esc 順序：對話框 → 天賦樹 → 面板 → 設定`, e2);
      await p.waitForTimeout(450);
      await p.evaluate(() => (__reset(), idleBar(1)));
      await p.waitForTimeout(300);
      /* X 在卡不在畫面上時不做事 */
      const x2 = await p.evaluate(() => {
        openPanel('inv');
        dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
        const v = IDLE.v;
        closePanels();
        return v;
      });
      ok(x2 === 'full', `${tag} X：掛機卡不在畫面上時不做事`, x2);
      const z = await p.evaluate(() => {
        const a = IDLE.v,
          pn = anyPanel();
        dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
        return { same: IDLE.v === a && anyPanel() === pn, inTable: KEYS_PC.some(([k]) => /(^|\s)Z(\s|$)/.test(k)) };
      });
      ok(z.same && !z.inTable, `${tag} Z 沒被用`, z);
      const tb = await p.evaluate(() => setHTML());
      ok(/<dt>X<\/dt><dd>收起／展開掛機卡/.test(tb) && /<dt>N<\/dt><dd>觀戰/.test(tb), `${tag} 設定頁快捷鍵表有 X、N`);
    } else {
      /* Android 返回鍵 */
      await p.evaluate(() => idleSet('watch'));
      await p.waitForTimeout(150);
      await p.goBack();
      await p.waitForTimeout(300);
      ok((await st()) === 'full' && (await p.evaluate(() => G.scene)) === 'map', `${tag} 返回鍵＝離開觀戰（還在地圖）`);
    }
    /* 五種自動離開 */
    const auto = await p.evaluate(async () => {
      const out = {},
        wait = ms => new Promise(r => setTimeout(r, ms)),
        tryIt = async (n, on, off) => {
          idleSet('watch');
          await wait(60);
          const a = IDLE.v;
          on();
          await wait(120);
          out[n] = a === 'watch' && IDLE.v !== 'watch';
          off();
          await wait(60);
        };
      await tryIt(
        '倒下',
        () => (G.state = 'dead'),
        () => ((G.state = 'play'), ($('over').hidden = true))
      );
      await tryIt(
        '對話框',
        () => (G.ask = 1),
        () => (G.ask = 0)
      );
      await tryIt(
        '切成手動',
        () => autoToggle(),
        () => autoToggle()
      );
      await tryIt(
        '開面板',
        () => openPanel('inv'),
        () => closePanels()
      );
      await tryIt(
        '離線摘要',
        () => offShow(null, { wood: 5 }, 60000),
        () => closePanels()
      );
      return out;
    });
    ok(Object.values(auto).length === 5 && Object.values(auto).every(Boolean), `${tag} 觀戰五種自動離開`, auto);
    await p.evaluate(() => (__reset(), idleBar(1)));
  });
  /* ---------- 重新整理 ---------- */
  await sec(`${tag} 記住`, async () => {
    await p.waitForTimeout(450);
    await p.evaluate(() => idleSet('mini'));
    await p.waitForTimeout(350);
    p = await boot(ctx, W, H, false);
    const a = await p.evaluate(() => ({
      v: IDLE.v,
      mini: $('pidle').classList.contains('mini'),
      ls: localStorage.getItem(IDLE_KEY),
      inSave: JSON.stringify(S).includes(':idle') || 'idle' in S
    }));
    ok(
      a.v === 'mini' && a.mini && a.ls === 'mini' && !a.inSave,
      `${tag} mini 重新整理後還在（存本機 ${'IDLE_KEY'}、不進存檔）`,
      a
    );
    await p.evaluate(() => idleSet('watch'));
    p = await boot(ctx, W, H, false);
    const b2 = await p.evaluate(() => IDLE.v);
    ok(b2 === 'mini', `${tag} watch 重新整理後回到開觀戰前（mini）`, b2);
    await p.evaluate(() => idleSet('full'));
    await p.waitForTimeout(350);
    p = await boot(ctx, W, H, false);
    ok((await p.evaluate(() => IDLE.v)) === 'full', `${tag} full 重新整理後還在`);
  });
  /* ---------- 掉落動態 ---------- */
  const max = port ? (W >= 380 ? 3 : 2) : 6;
  await sec(`${tag} 掉落動態`, async () => {
    const r = await p.evaluate(() => {
      __feedClear();
      feed('磨刀石', 3, null, null);
      feed('磨刀石', 2, null, null);
      const a = [...document.querySelectorAll('#feed .fd')].map(e => e.textContent);
      feed('磨刀石', 99999, null, null);
      const b = $('feed').querySelector('.fd b').textContent;
      const e = $('feed').querySelector('.fd');
      return {
        a,
        b,
        h: e.getBoundingClientRect().height,
        pe: getComputedStyle($('feed')).pointerEvents,
        live: $('feedsr').getAttribute('aria-live'),
        sr: $('feedsr').textContent
      };
    });
    ok(r.a.length === 1 && r.a[0] === '＋5磨刀石', `${tag} 同一種合併成一列（＋3、＋2 → ＋5）`, r.a);
    ok(r.b === '＋9,999+', `${tag} 超過 9,999 寫 9,999+`, r.b);
    ok(Math.round(r.h) === (port ? 22 : 24), `${tag} 一列高 ${port ? 22 : 24}`, r.h);
    ok(r.pe === 'none' && r.live === 'polite' && r.sr === '', `${tag} 不能點、aria-live polite、一般的不念`, r);
    /* 擊殺：怪身上沒有材料世界字，材料進掉落動態 */
    const k = await p.evaluate(() => {
      __feedClear();
      let n = 0;
      let got = 0;
      const f = num,
        km = killMat;
      num = (x, y, v, c, t) => (c === 'mat' && n++, f(x, y, v, c, t));
      killMat = (...a) => {
        const r = km(...a);
        got += r.filter(
          s => !(r.rare || []).some(k => s.endsWith(CUR[k].n)) && s !== (r.chase && chaseName(r.chase))
        ).length;
        return r;
      };
      const L = G.mobs.filter(m => !m.boss && !m.dummy).slice(0, 12);
      for (const m of L) (m.hp = 0), killMob(m);
      num = f;
      killMat = km;
      return { kills: L.length, mat: n, got, rows: FEED.L.length };
    });
    ok(
      k.mat === 0 && k.rows > 0 === k.got > 0,
      `${tag} 殺 ${k.kills} 隻：怪身上沒有「+n 材料」世界字、材料進掉落動態`,
      k
    );
    /* 列數上限：一次掉 8 種；稀有以上先留 */
    const c = await p.evaluate(() => {
      __feedClear();
      feed('崇高石', 1, 'cur', 'cur_exalt');
      for (let i = 0; i < 8; i++) feed('材料' + i, 1, null, null);
      return FEED.L.map(f => f.r);
    });
    ok(c.length === max && c.includes('rare'), `${tag} 一次掉 8 種：最多 ${max} 列、先擠掉一般（稀有留著）`, c);
    /* 稀有度色：一種一種掉、看最新那一列 */
    const cs = await p.evaluate(() => {
      __feedClear();
      const c = f => (f(), getComputedStyle(FEED.L[0].el.querySelector('span:not(.ic)')).color);
      return {
        norm: c(() => feed('磨刀石', 3, null, null)),
        rare: c(() => feed('崇高石', 1, 'cur', 'cur_exalt')),
        uniq: c(() => feed('完美石', 1, 'perf', null)),
        chase: c(() => feed(chaseName(CHASE_POOL.trunk[0]), 1, 'chase', CHASE_POOL.trunk[0]))
      };
    });
    await p.evaluate(() => {
      __feedClear();
      feed('磨刀石', 3, null, null);
      feed('崇高石', 1, 'cur', 'cur_exalt');
      feed(chaseName(CHASE_POOL.trunk[0]), 1, 'chase', CHASE_POOL.trunk[0]);
    });
    await p.waitForTimeout(300);
    const col = await p.evaluate(() => {
      const css = v => getComputedStyle(document.body).getPropertyValue(v).trim();
      return {
        ic: [...document.querySelectorAll('#feed .fd .ic')].map(e => Math.round(e.getBoundingClientRect().width)),
        good: getComputedStyle($('feed').querySelector('.fd b')).color,
        tok: [css('--r0'), css('--rar-rare'), css('--r3'), css('--rar-chase')],
        sr: $('feedsr').textContent,
        cr: __contrast(),
        ov: __feedOv()
      };
    });
    const hex = c =>
      '#' +
      c
        .match(/\d+/g)
        .slice(0, 3)
        .map(v => (+v).toString(16).padStart(2, '0'))
        .join('');
    ok(
      [cs.norm, cs.rare, cs.uniq, cs.chase].map(hex).join() === col.tok.join(),
      `${tag} 名的色：一般 --rar-normal(=--r0)、稀有 --rar-rare、完美 --rar-unique(=--r3)、追逐 --rar-chase`,
      { ...cs, tok: col.tok }
    );
    ok(
      col.ic.every(v => v === 16),
      `${tag} 圖示 16`,
      col.ic
    );
    ok(
      col.sr.includes(await p.evaluate(() => chaseName(CHASE_POOL.trunk[0]))),
      `${tag} 讀屏念稀有以上（最新一筆追逐）`,
      col.sr
    );
    ok(col.cr.length && col.cr.every(v => v >= 4.5), `${tag} 字對底 ≥ 4.5:1（底疊在白色上，最保守）`, col.cr);
    ok(col.ov.rows && !col.ov.bad.length, `${tag} 掉落動態跟 HUD 交集 0（full）`, col.ov);
    console.log('   色：', JSON.stringify(col));
    await shot(p, W, H, 'feed', 50);
    /* 追逐橫幅出來、王血條出來、mini、watch 都量一次交集 */
    for (const [n, f] of [
      ['追逐橫幅', () => devChase()],
      ['mini', () => (chaseBnHide(), idleSet('mini'))],
      ['watch', () => idleSet('watch')],
      ['full＋王血條', () => (idleSet('full'), DBG.boss())]
    ]) {
      await p.evaluate(f);
      await p.waitForTimeout(500);
      const o = await p.evaluate(
        () => (__feedClear(), ['A', 'B', 'C', 'D', 'E', 'F'].forEach(k => feed(k, 1, 'cur')), feedTick(1), __feedOv())
      );
      ok(o.rows >= 1 && !o.bad.length, `${tag} 掉落動態跟 HUD 交集 0（${n}）`, o);
    }
    await p.evaluate(() => (idleSet('full'), chaseBnHide()));
  });
  /* 停留：一般 3 秒、稀有 6 秒、追逐 10 秒，然後 400 ms 淡出；合併重新計時（375 上限 2 列，只在 390、1280 量） */
  if (max >= 3)
    await sec(`${tag} 停留`, async () => {
      await p.evaluate(() => {
        __feedClear();
        feed('一般', 1, null, null);
        feed('稀有', 1, 'cur', null);
        feed('追逐', 1, 'chase', null);
      });
      const at = async ms => {
        await p.waitForTimeout(ms);
        return p.evaluate(() =>
          Object.fromEntries(FEED.L.map(f => [f.k, f.el.classList.contains('out') ? 'out' : 'on']))
        );
      };
      const s0 = await at(2800);
      const s1 = await at(400);
      const s2 = await at(400);
      const s3 = await at(2500);
      const s4 = await at(4000);
      ok(s0['一般'] === 'on' && s1['一般'] === 'out', `${tag} 一般 3 秒後淡出`, [s0, s1]);
      ok(!('一般' in s2) && s2['稀有'] === 'on', `${tag} 淡出 400 ms 後拿掉；稀有還在`, s2);
      ok(s3['稀有'] === 'out' && s3['追逐'] === 'on', `${tag} 6.1 秒：稀有淡出、追逐還在`, s3);
      ok(s4['追逐'] === 'out' || !('追逐' in s4), `${tag} 10.1 秒：追逐淡出`, s4);
      /* 合併重新計時：2 秒時再掉一次，第一次掉 3.2 秒後還在 */
      await p.evaluate(() => (__feedClear(), feed('合併', 1, null, null)));
      await p.waitForTimeout(2000);
      await p.evaluate(() => feed('合併', 1, null, null));
      const m = await at(1200);
      ok(m['合併'] === 'on', `${tag} 合併時重新計時（第一次掉 3.2 秒後還在）`, m);
    });
  await ctx.close();
}
async function reduced(b) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  await ctx.route(/supabase/, r => r.abort());
  const p = await boot(ctx, 1280, 720);
  await sec('減少動態', async () => {
    const r = await p.evaluate(() => {
      idleSet('mini');
      const a = { v: IDLE.r, anim: !!IDLE.anim };
      feed('磨刀石', 1, null, null);
      a.fd = getComputedStyle($('feed').querySelector('.fd')).animationName;
      return a;
    });
    ok(r.v === 'mini' && !r.anim && r.fd === 'fdin0', '減少動態：收起直接換、掉落只淡入淡出', r);
  });
  await ctx.close();
}
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  for (const [W, H] of [
    [390, 844],
    [1280, 720],
    [375, 667]
  ])
    await size(b, W, H);
  await reduced(b);
  await b.close();
  console.log(fail ? `❌ ${fail} 項沒過` : '✅ 全部通過');
  process.exit(fail ? 1 : 0);
})();
