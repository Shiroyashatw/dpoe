const { chromium } = require('playwright');
/* 除錯掛鉤（js/dbg.js，visual-review-protocol.md §4）實測：
   正式載入（沒有 ?test=、?dbg=1）一定沒有 DBG、沒抓 dbg.js、時鐘是原生的；?test=／?dbg=1 每個掛鉤做得出狀態。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/dbg_check.js [網址]；有 ❌ 時結束碼 1 */
const URL = process.argv[2] || 'http://localhost:8000/';
let bad = 0;
const ok = (n, c, info = '') => {
  console.log((c ? '✅ ' : '❌ ') + n + (c ? '' : ' ' + info));
  if (!c) bad++;
};
let b;
/* Google 字型（Noto Sans TC 400／500／700 共用同一個可變字型檔）每次從網路抓，先到的字重不同時，
   Chrome 偶爾整頁字畫得粗細不一樣（約 1／30 次）；同一輪測試第一次抓到就存起來，之後的頁面都從記憶體給 */
const FONT = new Map();
async function font(r) {
  const u = r.request().url();
  let v = FONT.get(u);
  if (!v) {
    const res = await r.fetch();
    v = { status: res.status(), headers: res.headers(), body: await res.body() };
    FONT.set(u, v);
  }
  return r.fulfill(v);
}
async function open(q, o = {}) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, ...o });
  /* 測試絕對不能碰正式雲端 */
  await ctx.route(/supabase/, r => r.abort());
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, font);
  const p = await ctx.newPage();
  p.errs = [];
  p.js = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.on('request', r => /\.js(\?|$)/.test(r.url()) && p.js.push(r.url()));
  await p.goto(URL + q);
  await p.waitForFunction(() => typeof proBoot === 'function' && !!S);
  await p.waitForTimeout(600);
  return p;
}
const ev = (p, f, a) => p.evaluate(f, a);
(async () => {
  b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  /* ---------- 正式載入：掛鉤不存在 ---------- */
  for (const q of ['?p=dbgprod', '?p=dbgprod&dbg=0', '?p=dbgprod&seed=7&freeze=1']) {
    const p = await open(q),
      r = await ev(p, () => ({
        dbg: typeof DBG,
        tag: !!document.querySelector('script[src*="dbg.js"]'),
        pn: /\[native code\]/.test(performance.now.toString()),
        raf: /\[native code\]/.test(requestAnimationFrame.toString()),
        mr: /\[native code\]/.test(Math.random.toString())
      }));
    ok(`正式 ${q}：沒有 DBG`, r.dbg === 'undefined', r.dbg);
    ok(`正式 ${q}：沒有 dbg.js 的 script 標籤、沒抓 dbg.js`, !r.tag && !p.js.some(u => /dbg\.js/.test(u)));
    ok(
      `正式 ${q}：performance.now、requestAnimationFrame、Math.random 是原生的`,
      r.pn && r.raf && r.mr,
      JSON.stringify(r)
    );
    ok(`正式 ${q}：沒有 JS 錯誤`, !p.errs.length, p.errs.join(' | '));
    await p.context().close();
  }
  /* ---------- 種子：同種子兩次載入擺設一樣、換種子不一樣 ---------- */
  const deco = async s => {
    const p = await open(`?test=midgame&seed=${s}`),
      d = await ev(p, () => JSON.stringify([G.biome, G.deco]));
    await p.context().close();
    return d;
  };
  const d7 = await deco(7),
    d7b = await deco(7),
    d8 = await deco(8);
  ok('?seed=7 兩次載入的地形與擺設逐項相同', d7 === d7b);
  ok('?seed=8 跟 ?seed=7 不同', d7 !== d8);
  /* ?freeze=1：一載入就凍結，同種子兩次（等的時間不同）截圖逐像素相同 */
  const px = async w => {
    const q = await open('?test=midgame&seed=7&freeze=1');
    /* 照 visual-review-protocol §1：等圖與字型載完再做狀態 */
    await q.waitForLoadState('networkidle');
    await ev(q, () => document.fonts.ready.then(() => 0));
    await q.waitForTimeout(w);
    await ev(q, () => (closePanels(), DBG.biome('temple'), DBG.clear(), DBG.freeze()));
    await q.mouse.move(-1, -1);
    /* 字型照 unicode 範圍分段載入：新出現的字要再等一次 */
    await q.waitForLoadState('networkidle');
    await ev(q, () => document.fonts.ready.then(() => 0));
    await q.waitForTimeout(300);
    const s = await q.screenshot();
    await q.context().close();
    return s;
  };
  ok('?freeze=1＋?seed=7：兩次載入的截圖逐像素相同', Buffer.compare(await px(0), await px(1500)) === 0);
  /* 營地（?test=1 一載入就在營地）：火堆的火焰、火星不能因為載入時跑的格數不同而不一樣；兩尺寸各載入 3 次（等的時間不同） */
  for (const [w, h] of [
    [390, 844],
    [1280, 720]
  ]) {
    const s = [];
    for (const wt of [0, 700, 1500]) {
      const q = await open('?test=1&seed=7&freeze=1', {
        viewport: { width: w, height: h },
        ...(w < 900 && { isMobile: true, hasTouch: true })
      });
      await q.waitForLoadState('networkidle');
      await ev(q, () => document.fonts.ready.then(() => 0));
      await q.waitForTimeout(wt);
      await q.mouse.move(-1, -1);
      await q.waitForTimeout(300);
      s.push(await q.screenshot());
      if (process.env.DBG_SHOT)
        require('fs').writeFileSync(`${process.env.DBG_SHOT}/camp_${w}x${h}_${s.length}.png`, s.at(-1));
      ok(
        `營地 ${w}×${h} 第 ${s.length} 次：在營地、沒有 JS 錯誤`,
        (await ev(q, () => G.scene)) === 'hide' && !q.errs.length,
        q.errs.join(' | ')
      );
      await q.context().close();
    }
    ok(
      `?test=1&seed=7&freeze=1 營地 ${w}×${h}：3 次載入截圖逐像素相同`,
      s.every(x => Buffer.compare(x, s[0]) === 0)
    );
  }
  /* ---------- 測試模式：每個掛鉤 ---------- */
  const p = await open('?test=midgame&seed=7');
  ok(
    '?test=：DBG 存在、載入 dbg.js、種子 7',
    await ev(p, () => typeof DBG === 'object' && DBG.seed === 7 && DBG.ver >= 1)
  );
  const p2 = await open('?p=dbgdev&dbg=1');
  ok('?dbg=1：DBG 存在', await ev(p2, () => typeof DBG === 'object' && DBG.seed === null));
  ok('?dbg=1：沒有 JS 錯誤', !p2.errs.length, p2.errs.join(' | '));
  await p2.context().close();
  /* 凍結、逐步、恢復 */
  const t0 = await ev(p, () => (DBG.freeze(), G.t));
  await p.waitForTimeout(400);
  ok('freeze：0.4 秒後 G.t 沒動', (await ev(p, () => G.t)) === t0);
  const t1 = await ev(p, () => (DBG.step(330), G.t));
  ok('step(330)：G.t 剛好前進 0.33 秒', Math.abs(t1 - t0 - 0.33) < 1e-6, `${t1 - t0}`);
  ok('step 後仍凍結', await ev(p, () => DBG.frozen));
  ok(
    'step：凍結中開始的 CSS 動畫停住、step 才前進',
    await ev(p, () => {
      hudWarn('step 測試');
      const a = $('warn').getAnimations()[0];
      if (!a) return false;
      DBG.step(0);
      const t = a.currentTime;
      DBG.step(100);
      return a.playState === 'paused' && Math.abs(a.currentTime - t - 100) < 1;
    })
  );
  await ev(p, () => DBG.resume());
  await p.waitForTimeout(300);
  ok('resume：時間又在走', (await ev(p, () => G.t)) > t1 + 0.1);
  /* 地區、清怪、天黑、大霧 */
  for (const k of ['temple', 'lava', 'tomb', 'ice']) {
    const r = await ev(
      p,
      k => (DBG.biome(k), DBG.clear(), DBG.freeze(), { b: G.biome, s: G.scene, m: G.mobs.length, x: P.x, y: P.y }),
      k
    );
    ok(
      `biome(${k})：在地圖、地形對、怪清光、主角在左上`,
      r.b === k && r.s === 'map' && !r.m && r.x === 240 && r.y === 192,
      JSON.stringify(r)
    );
  }
  ok('biome(不存在) 回傳 false', (await ev(p, () => DBG.biome('nope'))) === false);
  ok('night(5)：G.night > G.t', await ev(p, () => (DBG.night(5), G.night > G.t)));
  ok('fog(5)：G.fog > G.t 而且不是天黑', await ev(p, () => (DBG.fog(5), G.fog > G.t && !(G.night > G.t))));
  /* 特效、數字 */
  ok(
    'fx(crit)：播一張序列圖',
    await ev(p, () => DBG.fx('crit', P.x, P.y) && G.fx.some(o => o.k === 'sh' && o.n === 'crit'))
  );
  ok('fx(不存在) 回傳 false', (await ev(p, () => DBG.fx('sig_nope'))) === false);
  /* M2-34 3a 的招牌特效接進 FXS 之後也能播：每個 sig_* 圖載好、回傳 true、G.fx 有那張 */
  await p.waitForFunction(() => Object.keys(FXS).every(k => !k.startsWith('sig_') || fxImg(k).naturalWidth));
  for (const k of ['sig_crit', 'sig_lvup', 'sig_beam', 'sig_chase', 'sig_wyapply'])
    ok(
      `fx(${k})：播招牌特效`,
      await ev(p, k => DBG.fx(k, P.x, P.y) === true && G.fx.some(o => o.k === 'sh' && o.n === k), k)
    );
  const nk = ['hit', 'crit', 'hurt', 'gain', 'minor', 'miss', 'dodge', 'block', 'dot'];
  ok(
    'num：9 種都跳得出來',
    await ev(p, nk => ((G.nums.length = 0), nk.every((k, i) => DBG.num(k, 100 + i)) && G.nums.length === 9), nk)
  );
  /* 生命、魔力 */
  ok('hp(30)：生命 30%', await ev(p, () => (DBG.hp(30), Math.abs(P.hp - ST.hp * 0.3) <= 1)));
  ok('mp(0)：魔力 0', await ev(p, () => (DBG.mp(0), P.mp === 0)));
  /* 王、升級、光柱、追逐物、吐司、地磚矩形、翻牌、存檔、火焰放滿 */
  ok(
    'boss(hugupo)：叫出虎姑婆',
    await ev(p, () => {
      const m = DBG.boss('hugupo');
      return !!(m && m.boss && m.D.sp === 'hugupo');
    })
  );
  ok(
    'lvup：等級 +1',
    await ev(p, () => {
      const l = S.lv;
      DBG.lvup();
      return S.lv === l + 1;
    })
  );
  ok(
    'beam(rare／unique)：地上有通貨光柱',
    await ev(p, () => {
      DBG.beam('rare');
      DBG.beam('unique');
      return G.drops.filter(d => d.show).length >= 2;
    })
  );
  ok('chaseDrop：地上有追逐物品', await ev(p, () => !!DBG.chaseDrop() && G.drops.some(d => d.chase)));
  ok(
    'toast：#warn 寫上文字',
    await ev(p, () => (DBG.toast('danger', '測試吐司'), $('warn').textContent === '測試吐司'))
  );
  ok(
    'tileRect：一格 48×ZOOM，位置跟著鏡頭',
    await ev(p, () => {
      const r = DBG.tileRect(5, 4);
      return r.w === TS * ZOOM && Math.abs(r.x + r.w / 2 - IW / 2) < TS * ZOOM;
    })
  );
  ok('save：蓋上存檔內容', await ev(p, () => (DBG.save({ gold: 12345 }), S.gold === 12345)));
  ok('save(函式)：照函式改', await ev(p, () => (DBG.save(s => (s.mat.soul = 777)), S.mat.soul === 777)));
  ok(
    'fireAll：技能格都是火焰法術、旁邊有怪',
    await ev(p, () => {
      const L = DBG.fireAll();
      return L.filter(Boolean).every(k => SKILLS[k].el === 'fire') && G.mobs.length > 0;
    })
  );
  ok(
    'flip：打造翻牌打開',
    await ev(p, () => (closePanels(), DBG.flip(['w_sword1_0']), PANEL.ident && REV.craft === 1))
  );
  ok(
    'wyApply(weapon)：武器套上王印',
    await ev(p, () => (closePanels(), DBG.wyApply('weapon'), !!S.eq.weapon.wy && PANEL.chase))
  );
  ok('hot(1)：魔力球是過熱的地獄火', await ev(p, () => (DBG.hot(1), hudTick(), $('omp').classList.contains('hot'))));
  ok('hot(0)：還原', await ev(p, () => (DBG.hot(0), hudTick(), !$('omp').classList.contains('hot'))));
  ok('測試模式沒有 JS 錯誤', !p.errs.length, p.errs.join(' | '));
  await p.context().close();
  /* ---------- 底部 safe-area：直立手機底部分頁列 #pnav 高 56 變成 56＋34 ---------- */
  const m = await open('?test=midgame', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const bot = () => ev(m, () => $('pnav').getBoundingClientRect().height);
  const b0 = await bot();
  await ev(m, () => DBG.safeArea(34));
  const b1 = await bot();
  await ev(m, () => DBG.safeArea(null));
  const b2 = await bot();
  ok('safeArea(34)：直立 #pnav 高 +34px、還原後回來', b1 - b0 === 34 && b2 === b0, `${b0} → ${b1} → ${b2}`);
  await m.context().close();
  await b.close();
  console.log(bad ? `❌ ${bad} 項沒過` : '✅ 除錯掛鉤全部通過');
  process.exit(bad ? 1 : 0);
})();
