/* dpoe-hud133-fix4 量測：F7 最近一筆（收起列 T34／C34）左條與字的稀有度色、F8 1280 最近一筆的座標與滑入路徑、F9 裝填環 token／α 與五種地磚的對比。
   用法：先開 python3 -m http.server 8000，再 node tools/bh_fix4.js [輸出資料夾]（預設 docs/production/evidence/battle-hud-v133-fix4）
   截圖 DPR 1；量測寫進 fix4.json，像素抽樣另由 tools/bh_fix4.py 算 */
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path');
const OUT = path.resolve(
    process.argv[2] || path.join(__dirname, '..', 'docs/production/evidence/battle-hud-v133-fix4')
  ),
  URL = process.argv[3] || 'http://localhost:8000/';
fs.mkdirSync(OUT, { recursive: true });
const rc = e => {
  const r = e.getBoundingClientRect();
  return [r.left, r.top, r.width, r.height].map(v => Math.round(v * 10) / 10);
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const R = {};
  for (const [W, H, touch] of [
    [390, 844, 1],
    [1280, 720, 0]
  ]) {
    const sz = `${W}x${H}`,
      o = (R[sz] = {});
    const ctx = await b.newContext({
      viewport: { width: W, height: H },
      hasTouch: !!touch,
      isMobile: !!touch,
      deviceScaleFactor: 1
    });
    await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage();
    await p.goto(URL + '?dbg=1&seed=11&' + Date.now());
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(1200);
    await p.evaluate(touch => {
      proSkip();
      S.story.tips = 0;
      S.auto = 0;
      if (touch) DBG.safeArea(34, 47);
      runNode(TRUNK_K[0]);
      DBG.clear();
      S.log = [];
      for (const id of ['warn', 'warn2', 'banner']) $(id).style.visibility = 'hidden';
    }, touch);
    await p.waitForTimeout(600);
    /* F7：收起列最近一筆，稀有、傳奇、追逐各一張（滑入跑完才拍） */
    o.f7 = [];
    for (const [n, c, r] of [
      ['厲鬼護符', 'it', 2],
      ['判官烏紗', 'it', 3],
      ['', 'chase', 4]
    ]) {
      await p.evaluate(
        ([n, c, r]) => {
          DBG.resume();
          DBG.hudMin(1);
          const k = c === 'chase' ? CHASE_POOL.trunk[0] : null;
          dropLog(k ? chaseBanner(k) : n, c, k, r);
          idleBar(1);
        },
        [n, c, r]
      );
      await p.waitForTimeout(400);
      await p.evaluate(() => DBG.settle());
      o.f7.push(
        await p.evaluate(r => {
          const e = document.querySelector('#pidle .i34'),
            t = e.querySelector('.nm'),
            mk = e.querySelector('.ilast > i'),
            cs = getComputedStyle(e);
          return {
            r,
            cls: e.className,
            name: t.textContent,
            box: (r => [r.left, r.top, r.width, r.height].map(Math.round))(e.getBoundingClientRect()),
            bar: [cs.borderLeftWidth, cs.borderLeftStyle, cs.borderLeftColor],
            text: getComputedStyle(t).color,
            mark: mk ? [mk.textContent, getComputedStyle(mk).color] : null
          };
        }, r)
      );
      await p.screenshot({ path: path.join(OUT, `f7_r${r}_${sz}.png`) });
    }
    /* 拾取列（展開）：普通、魔法沒有直條，只列字色 */
    await p.evaluate(() => {
      DBG.resume();
      DBG.hudMin(0);
      S.log = [];
      [
        ['寒鐵之戒', 'it', null, 1],
        ['粗布手套', 'it', null, 0]
      ].forEach(x => dropLog(...x));
      idleBar(1);
    });
    await p.waitForTimeout(400);
    o.pk = await p.evaluate(() =>
      [...document.querySelectorAll('#pidle .ipk .ilast')].map(e => [
        e.className,
        e.textContent,
        getComputedStyle(e).color,
        getComputedStyle(e).borderLeftStyle
      ])
    );
    /* F8：收起與展開的框、最近一筆滑入路徑（凍結時鐘、每 1000/60 ms 一格） */
    for (const min of [1, 0]) {
      const tag = min ? 'min' : 'full';
      await p.evaluate(min => {
        DBG.resume();
        DBG.hudMin(min);
        S.log = [{ t: Date.now() - 6e4, n: '判官烏紗', c: 'it', r: 3 }];
        idleBar(1);
      }, min);
      await p.waitForTimeout(400);
      const f8 = (o['f8_' + tag] = await p.evaluate(() => {
        const q = s => document.querySelector(s),
          rc = e => (e ? (r => [r.left, r.top, r.width, r.height].map(Math.round))(e.getBoundingClientRect()) : null);
        return {
          pidle: rc(q('#pidle')),
          ovf: getComputedStyle(q('#pidle')).overflow,
          i32: rc(q('#pidle .i32')),
          is1: rc(q('#pidle .is1')),
          i34: rc(q('#pidle .i34')),
          ipk: [...document.querySelectorAll('#pidle .ipk')].map(rc),
          x: rc(q('#pidle .ix')) || rc(q('#pidle .ihd')),
          hp: rc(q('#bhp')),
          z: getComputedStyle(q('#pidle')).zIndex
        };
      }));
      /* 換新：從右滑入 200 ms；每格量滑動中那一筆的框，第 0、3、6、12 格截圖 */
      await p.evaluate(() => {
        DBG.freeze();
        dropLog('厲鬼護符', 'it', null, 2);
        idleBar(1);
      });
      f8.path = [];
      for (let f = 0; f <= 13; f++) {
        f8.path.push(
          await p.evaluate(f => {
            const e = document.querySelector('#pidle .ilast'),
              r = e.getBoundingClientRect(),
              tr = getComputedStyle(e).transform;
            return [
              f,
              Math.round((f * 1000) / 60),
              e.parentElement.className,
              Math.round(r.left),
              Math.round(r.right),
              Math.round(r.top),
              Math.round(r.bottom),
              tr === 'none' ? 0 : Math.round(new DOMMatrix(tr).m41 * 10) / 10,
              +getComputedStyle(e).opacity
            ];
          }, f)
        );
        if ([0, 3, 6, 12].includes(f)) await p.screenshot({ path: path.join(OUT, `f8_${tag}_f${f}_${sz}.png`) });
        await p.evaluate(() => DBG.step(1000 / 60));
      }
      await p.evaluate(() => DBG.resume());
    }
    /* F9：裝填環（技能格 1 裝填中、進度一半）；五種地磚：廟宇、岩漿、古墓、冰洞、營地 */
    await p.evaluate(() => {
      DBG.hudMin(0);
      S.log = [];
      idleBar(1);
    });
    o.f9 = { tiles: {} };
    for (const k of ['temple', 'lava', 'tomb', 'ice', 'camp']) {
      await p.evaluate(k => {
        DBG.resume();
        if (k === 'camp') enterCamp();
        else DBG.biome(k);
        DBG.clear();
        /* 跟錄影 reload 同一招：十字弓穿甲射擊，彈匣打空 → 裝填 1.5 秒，停在一半 */
        S.eq.weapon = mkItem('w_xbow_0', 10, 0);
        S.skills[0] = { k: 'apshot', so: [null, null], n: 2 };
        S.lib.sk.apshot = 1;
        ST = stats();
        hudBar();
        P.ammo = { apshot: { n: 0, until: G.t + 0.75 } };
        hudTick();
      }, k);
      await p.waitForTimeout(500);
      await p.evaluate(() => DBG.settle());
      const m = await p.evaluate(() => {
        const b = $('bhS0'),
          l = b.querySelector('.rl'),
          cs = getComputedStyle(l),
          bs = getComputedStyle(b),
          v = n => getComputedStyle(document.body).getPropertyValue(n).trim();
        return {
          scene: G.scene,
          biome: G.biome,
          vis: !!b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden',
          slot: (r => [r.left, r.top, r.width, r.height].map(Math.round))(b.getBoundingClientRect()),
          r: b.style.getPropertyValue('--r'),
          rlText: l.textContent,
          bg: cs.backgroundImage,
          slotBg: bs.backgroundColor,
          slotBorder: bs.borderTopColor,
          tok: {
            '--prog-hi': v('--prog-hi'),
            '--panel-inset': v('--panel-inset'),
            '--d2-scrim': v('--d2-scrim'),
            '--panel-raised': v('--panel-raised'),
            '--border': v('--border')
          }
        };
      });
      o.f9.tiles[k] = m;
      await p.screenshot({ path: path.join(OUT, `f9_${k}_${sz}.png`) });
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'fix4.json'), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R).slice(0, 4000));
  await b.close();
})();
