const { chromium } = require('playwright');
/* 開場實測（Playwright）：0.3.0 起沒有序章，開場看完直接在藏身處。
   新存檔（開場、拿到劍、撿骨師第一次對話、設施提示、掌櫃）、老存檔（角色不動、版本號重跑）、跳過與重新整理、減少動態、手機四個尺寸的字幕。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/pro_check.js [網址] [fresh／vet／skip／calm／phone]。
   環境變數 PW_CHROME 可以指定 Chrome 路徑；截圖存在系統暫存資料夾（pro_*.png）；有 ❌ 時結束碼 1 */
const os = require('os'),
  path = require('path');
const URL = process.argv[2] || 'http://localhost:8000/',
  SHOTS = process.env.PRO_SHOTS || os.tmpdir(),
  shot = n => path.join(SHOTS, `pro_${n}.png`);
let bad = 0;
const ok = (n, c, info = '') => {
  console.log((c ? '✅ ' : '❌ ') + n + (c ? '' : ' ' + info));
  if (!c) bad++;
};
/* 玩家的東西：開場前後要一模一樣（故事旗標、存檔時間除外） */
const KEYS = `['lv','xp','gold','frag','maxT','tier','eq','inv','stash','temp','lib','skills','pt','ptA','asc','at','mat','charms','auras']`;
const CORE = `JSON.stringify(${KEYS}.map(k => S[k]))`;
const DISK = `(() => { const s = JSON.parse(localStorage.getItem(KEY + SLOT)); return JSON.stringify(${KEYS}.map(k => s[k])); })()`;
let b, LAST;
async function page(w, h, touch, opt) {
  const ctx = await b.newContext({
    viewport: { width: w, height: h },
    hasTouch: !!touch,
    isMobile: !!touch,
    deviceScaleFactor: 1,
    ...opt
  });
  /* 測試絕對不能碰正式雲端 */
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.ctxx = ctx;
  LAST = p;
  return p;
}
const open = async (p, slot) => {
  await p.goto(URL + `?p=${slot}&` + Date.now());
  await p.waitForFunction(() => typeof proBoot === 'function' && !!S);
  await p.waitForTimeout(400);
};
const clean = async (p, slot) => {
  await open(p, slot);
  await p.evaluate(() => localStorage.clear());
  await open(p, slot);
};
/* 真的按鍵走路（K 是 game.js 的按鍵狀態）：一直走到目標 d 以內 */
const walk = (p, x, y, d = 50) =>
  p.evaluate(
    ([x, y, d]) =>
      new Promise(done => {
        const t0 = performance.now(),
          tick = () => {
            const dx = x - P.x,
              dy = y - P.y;
            K.a = dx < -8;
            K.d = dx > 8;
            K.w = dy < -8;
            K.s = dy > 8;
            if (Math.hypot(dx, dy) < d || performance.now() - t0 > 15000) {
              K.a = K.d = K.w = K.s = 0;
              return done(Math.hypot(dx, dy));
            }
            requestAnimationFrame(tick);
          };
        tick();
      }),
    [x, y, d]
  );
/* 開場快轉到底，人回到藏身處 */
const toHome = async p => {
  await p.evaluate(() => (IV.speed = 200));
  await p.waitForFunction(() => !IV.on && G.scene === 'hide');
};

async function fresh() {
  console.log('— 新存檔：開場 → 藏身處 —');
  const p = await page(1280, 720);
  await clean(p, 41);
  ok('新存檔沒有武器', await p.evaluate(() => !S.eq.weapon && S.fresh === 1));
  ok('開場：等玩家按開始', await p.evaluate(() => IV.on && IV.gate && !$('ivg').hidden));
  await p.screenshot({ path: shot('gate') });
  await p.click('#ivgo');
  /* 字幕：快轉 8 倍，每一句都要出現過 */
  const seen = await p.evaluate(
    () =>
      new Promise(done => {
        IV.speed = 8;
        const got = new Set(),
          tick = () => {
            if (!IV.on) return done([...got]);
            if ($('ivs').classList.contains('on')) got.add($('ivs').textContent);
            requestAnimationFrame(tick);
          };
        tick();
      })
  );
  const want = await p.evaluate(() => SHOTS.flatMap(s => s.lines));
  ok(
    '開場：20 句字幕全部播到、順序對',
    want.length === 20 && want.every(l => seen.includes(l)) && seen.every((l, i) => want.indexOf(l) >= i - 0),
    seen.length
  );
  await p.waitForFunction(() => !IV.on && G.scene === 'hide');
  ok(
    '播完直接在藏身處，沒有序章',
    await p.evaluate(() => !PRO.on && G.state === 'play' && !document.body.classList.contains('cine'))
  );
  ok(
    '新玩家拿到劍、設施提示開著、記版本號',
    await p.evaluate(() => {
      const s = JSON.parse(localStorage.getItem(KEY + SLOT));
      return (
        S.eq.weapon &&
        S.eq.weapon.b === PRO_SWORD &&
        !S.fresh &&
        S.story.tips === 1 &&
        s.story.intro === PRO_VER &&
        s.story.prologue === PRO_VER &&
        !!s.eq.weapon
      );
    })
  );
  await p.waitForTimeout(1200);
  await p.screenshot({ path: shot('home') });
  /* 撿骨師第一次對話（NPC 資料驅動，不靠序章） */
  await walk(p, 820, 650, 40);
  await walk(p, 640, 700, 40);
  await walk(p, 620, 770, 40);
  await p.keyboard.press('f');
  await p.waitForFunction(() => TALK.on, null, { timeout: 5000 });
  ok('按互動鍵：撿骨師播 bone_first', await p.evaluate(() => TALK.id === 'bone_first'));
  for (let k = 0; k < 12 && (await p.evaluate(() => TALK.on)); k++) await p.keyboard.press('f');
  ok('講完記 boneMet', await p.evaluate(() => !TALK.on && S.story.boneMet === 1));
  /* 地圖台 */
  await walk(p, 660, 530, 60);
  await p.keyboard.press('f');
  await p.waitForFunction(() => PANEL.device);
  ok('地圖台打開世界地圖', await p.evaluate(() => PANEL.device));
  await p.keyboard.press('Escape');
  await open(p, 41);
  ok('重新整理不再播開場', await p.evaluate(() => !IV.on && !PRO.on && G.scene === 'hide'));
  /* 設施的提示只有一次 */
  await p.evaluate(() => {
    Object.assign(P, { x: 600, y: 400 });
  });
  await p.waitForTimeout(200);
  ok('第一次走到昇華石碑：撿骨師提一句', await p.evaluate(() => TALK.on && TALK.id === 'hint_asc'));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(100);
  ok('提示只有一次', await p.evaluate(() => !TALK.on && S.story.h_asc === 1));
  await p.waitForTimeout(100);
  ok('第二次不再提', await p.evaluate(() => !TALK.on));
  /* 商人 */
  await p.evaluate(() => {
    Object.assign(P, { x: 372, y: 860 });
    interact();
  });
  ok('掌櫃第一次先打招呼', await p.evaluate(() => TALK.on && TALK.id === 'trader_first'));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(100);
  ok('招呼打完開店（功能不變）', await p.evaluate(() => !!PANEL.shop && S.story.shopMet === 1));
  await p.screenshot({ path: shot('shop') });
  await p.keyboard.press('Escape');
  await p.evaluate(() => interact());
  ok('之後直接開店', await p.evaluate(() => !TALK.on && !!PANEL.shop));
  ok('沒有頁面錯誤', !p.errs.length, p.errs[0]);
  await p.ctxx.close();
}
/* 老存檔：Lv42、弓、金幣、地圖進度 */
async function veteran() {
  console.log('— 老存檔 —');
  const p = await page(1280, 720);
  await clean(p, 42);
  await p.evaluate(() => {
    proAbort();
    S = newGame();
    delete S.fresh;
    Object.assign(S, { lv: 42, xp: 1234, gold: 5678, frag: 90, maxT: 7, tier: 5, orient: 'l' });
    S.eq.weapon = mkItem('w_bow_0', 20, 2);
    S.eq.chest = mkItem('c_leather', 20, 1);
    S.story = { boneMet: 1 };
    localStorage.setItem(KEY + SLOT, JSON.stringify(S));
  });
  await open(p, 42);
  ok('老存檔也要看一次開場', await p.evaluate(() => IV.on && IV.gate));
  const before = await p.evaluate(CORE);
  await p.click('#ivgo');
  await toHome(p);
  ok('看完在藏身處、角色一模一樣', (await p.evaluate(CORE)) === before);
  ok('存檔也一模一樣', (await p.evaluate(DISK)) === before);
  ok('記版本號', await p.evaluate(() => !PRO.on && S.story.prologue === PRO_VER && S.story.intro === PRO_VER));
  ok('老玩家沒有多一把劍', await p.evaluate(() => S.eq.weapon.b === 'w_bow_0' && !S.inv.items.length));
  ok('手機方向設定留著', await p.evaluate(() => S.orient === 'l'));
  ok('老玩家不跳設施提示', await p.evaluate(() => !proHint('asc')));
  /* 版本號 */
  await open(p, 42);
  ok('版本號一樣：不跑', await p.evaluate(() => !IV.on && !PRO.on));
  await p.evaluate(() => {
    S.story.prologue = PRO_VER - 1;
    S.story.intro = PRO_VER - 1;
    save();
  });
  await open(p, 42);
  ok('版本號變了：重跑', await p.evaluate(() => IV.on && IV.gate));
  ok('沒有頁面錯誤', !p.errs.length, p.errs[0]);
  await p.ctxx.close();
}
async function skips() {
  console.log('— 跳過、重新整理 —');
  const p = await page(1280, 720);
  await clean(p, 43);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  ok('Enter 也能開始', await p.evaluate(() => IV.on && !IV.gate));
  await p.click('.ivskip');
  await p.waitForFunction(() => !IV.on && G.scene === 'hide');
  ok(
    '開場跳過：在藏身處、拿到劍、記過開場',
    await p.evaluate(() => !PRO.on && !!S.eq.weapon && S.story.intro === PRO_VER && S.story.prologue === PRO_VER)
  );
  await open(p, 43);
  ok('重新整理：不再播開場', await p.evaluate(() => !IV.on && !PRO.on && G.scene === 'hide' && !!S.eq.weapon));
  /* 開場中重新整理：開場重來（版本號還沒記）。換一個存檔位，免得離開頁面時又把看完的存檔寫回去 */
  await clean(p, 44);
  await p.click('#ivgo');
  await p.waitForTimeout(500);
  await open(p, 44);
  ok('開場中重新整理：開場重來', await p.evaluate(() => IV.on && IV.gate && !S.eq.weapon));
  ok('沒有頁面錯誤', !p.errs.length, p.errs[0]);
  await p.ctxx.close();
}
async function calm() {
  console.log('— 減少動態 —');
  const p = await page(1280, 720, 0, { reducedMotion: 'reduce' });
  await clean(p, 48);
  await p.click('#ivgo');
  ok('開場知道要減少動態', await p.evaluate(() => IV.calm && ivMv(5) === 0));
  /* 天裂那一刻：閃光要弱、不震 */
  await p.evaluate(() => {
    IV.speed = 1;
    IV.t = IV.t0 = SHOTS[2].t0 + SHOTS[2].lead - 0.05;
  });
  await p.waitForFunction(() => IV.fl > 0);
  ok('天裂：閃光弱、不震', await p.evaluate(() => IV.fl <= 0.35 && IV.sh === 0));
  await toHome(p);
  ok(
    '睜眼只淡出',
    (await p.evaluate(() => getComputedStyle(document.querySelector('#lid i')).animationName)) === 'lidFade'
  );
  ok('沒有頁面錯誤', !p.errs.length, p.errs[0]);
  await p.ctxx.close();
}
/* 手機：四個尺寸的字幕與落地 */
async function phone(w, h) {
  const tag = w + 'x' + h,
    port = h > w;
  console.log('— 手機 ' + tag + ' —');
  const p = await page(w, h, 1);
  await clean(p, 46);
  await p.evaluate(port => {
    S.orient = port ? 'p' : 'l';
    applyOrient();
  }, port);
  await p.tap('#ivgo');
  ok('開場：觸控模式', await p.evaluate(() => document.body.classList.contains('touch')));
  await p.evaluate(() => {
    IV.speed = 0;
    IV.t = IV.t0 = 62.4;
  });
  await p.waitForTimeout(500);
  const sub = await p.evaluate(() => {
    const r = $('ivs').getBoundingClientRect(),
      t = document.createRange();
    t.selectNodeContents($('ivs'));
    const q = t.getBoundingClientRect();
    return {
      l: q.left,
      r: q.right,
      b: r.bottom,
      h: innerHeight,
      w: innerWidth,
      f: parseFloat(getComputedStyle($('ivs')).fontSize)
    };
  });
  ok('字幕沒有被裁切', sub.l >= 8 && sub.r <= sub.w - 8 && sub.b <= sub.h - 8 && sub.f >= 16, JSON.stringify(sub));
  await p.screenshot({ path: shot(`iv_${tag}`) });
  await toHome(p);
  await p.waitForTimeout(600);
  ok(
    '看完在藏身處、拿到劍、自動鈕在畫面內',
    await p.evaluate(() => {
      const r = document.querySelector('.tmenu .autob').getBoundingClientRect();
      return !!S.eq.weapon && r.width >= 44 && r.right <= innerWidth && r.bottom <= innerHeight;
    })
  );
  await p.screenshot({ path: shot(`home_${tag}`) });
  ok('沒有頁面錯誤', !p.errs.length, p.errs[0]);
  await p.ctxx.close();
}
(async () => {
  b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const only = process.argv[3];
  try {
    if (!only || only === 'fresh') await fresh();
    if (!only || only === 'vet') await veteran();
    if (!only || only === 'skip') await skips();
    if (!only || only === 'calm') await calm();
    if (!only || only === 'phone')
      for (const [w, h] of [
        [390, 844],
        [375, 667],
        [844, 390],
        [667, 375]
      ])
        await phone(w, h);
  } catch (e) {
    ok('跑到一半掛了', false, e.message);
    console.log(
      await LAST.evaluate(() =>
        JSON.stringify({ on: PRO.on, scene: G.scene, state: G.state, x: P.x | 0, y: P.y | 0, talk: TALK.on, iv: IV.on })
      )
    );
    console.log(LAST.errs);
  }
  await b.close();
  console.log(bad ? `❌ ${bad} 項沒過` : '全部通過');
  process.exit(bad ? 1 : 0);
})();
