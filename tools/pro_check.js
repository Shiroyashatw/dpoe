const { chromium } = require('playwright');
/* 開場與序章實測（Playwright，實際走路、出招）：新存檔走完全程、老存檔還原、跳過、死亡重來、版本號重跑、重新整理接回、手機四個尺寸的提示與觸控。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/pro_check.js [網址]。
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
/* 玩家的東西：序章前後要一模一樣（故事旗標、存檔時間除外） */
const CORE = `JSON.stringify(['lv','xp','gold','frag','maxT','tier','eq','inv','stash','temp','gems','skills','pt','ptA','asc','at','mat','charms','auras'].map(k => (PRO.real || S)[k]))`;
const DISK = `(() => { const s = JSON.parse(localStorage.getItem(KEY + SLOT)); return JSON.stringify(['lv','xp','gold','frag','maxT','tier','eq','inv','stash','temp','gems','skills','pt','ptA','asc','at','mat','charms','auras'].map(k => s[k])); })()`;
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
/* 真的按鍵走路（K 是 game.js 的按鍵狀態）：一直走到目標 d 以內，或做到 until */
const walk = (p, x, y, d = 50) =>
  p.evaluate(
    ([x, y, d]) =>
      new Promise(done => {
        const t0 = performance.now(),
          sc = G.scene,
          tick = () => {
            const dx = x - P.x,
              dy = y - P.y;
            K.a = dx < -8;
            K.d = dx > 8;
            K.w = dy < -8;
            K.s = dy > 8;
            if (Math.hypot(dx, dy) < d || G.scene !== sc || performance.now() - t0 > 15000) {
              K.a = K.d = K.w = K.s = 0;
              return done(Math.hypot(dx, dy));
            }
            requestAnimationFrame(tick);
          };
        tick();
      }),
    [x, y, d]
  );
const stepIs = (p, i, ms = 15000) => p.waitForFunction(i => PRO.i === i, i, { timeout: ms });
/* 走向最近的怪、按住左鍵打（滑鼠瞄準牠），打到條件成立；sk：放右鍵技能 */
const fight = (p, sk) =>
  p.evaluate(
    sk =>
      new Promise(done => {
        const t0 = performance.now();
        const tick = () => {
          const i0 = done.i === undefined ? (done.i = PRO.i) : done.i,
            m = G.mobs.find(m => m.hp > 0);
          if (PRO.i !== i0 || !m || performance.now() - t0 > 30000) {
            K.a = K.d = K.w = K.s = 0;
            M.L = 0;
            return done(true);
          }
          const dx = m.x - P.x,
            dy = m.y - P.y,
            r = Math.hypot(dx, dy);
          K.a = dx < -30 && r > 60;
          K.d = dx > 30 && r > 60;
          K.w = dy < -30 && r > 60;
          K.s = dy > 30 && r > 60;
          M.x = innerWidth / 2 + (m.x - G.cam.x) * ZOOM;
          M.y = innerHeight / 2 + (m.y - G.cam.y) * ZOOM;
          M.L = r < 90 ? 1 : 0;
          if (sk && r < 300 && !P.act) useSlot(1);
          P.hp = Math.max(P.hp, ST.hp * 0.5);
          requestAnimationFrame(tick);
        };
        tick();
      }),
    sk
  );
/* 第 2 步的背包：面板裡看得到這一步要做什麼、要點的東西在畫面內而且亮著、沒被別的東西蓋住 */
const bagGuide = async (p, text, label) => {
  await p.waitForTimeout(250);
  const r = await p.evaluate(() => {
    const seen = e => {
        const q = e.getBoundingClientRect(),
          h = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
        return (
          q.width > 0 &&
          q.left >= 0 &&
          q.top >= 0 &&
          q.right <= innerWidth &&
          q.bottom <= innerHeight &&
          !!h &&
          (h === e || e.contains(h))
        );
      },
      g = document.querySelector('#pinv .pro-inv'),
      it = document.querySelector('#pinv .it[data-src=inv]');
    return {
      t: g && g.textContent,
      gs: !!g && seen(g),
      is: !!it && seen(it),
      on: !!it && it.classList.contains('pro-hl'),
      ol: it && getComputedStyle(it).outlineStyle
    };
  });
  ok(`${label}：面板裡有引導「${text}」`, r.t === text && r.gs, JSON.stringify(r));
  ok(`${label}：劍在畫面內、亮著`, r.is && r.on && r.ol === 'solid', JSON.stringify(r));
};
/* 裝上之後：面板收掉，回到下一步的目標列 */
const bagDone = async (p, label) => {
  await p.waitForTimeout(250);
  const r = await p.evaluate(() => {
    const e = $('prot').getBoundingClientRect();
    return {
      i: PRO.i,
      on: !!S.eq.weapon,
      inv: PANEL.inv,
      g: !!document.querySelector('.pro-inv'),
      bar: !$('pro').hidden && e.width > 0 && e.bottom <= innerHeight
    };
  });
  ok(`${label}：裝上後引導收掉，回到第 3 步的目標列`, r.i === 2 && r.on && !r.inv && !r.g && r.bar, JSON.stringify(r));
};
/* 跑到進序章（動畫快轉） */
const toMap = async p => {
  await p.click('#ivgo');
  await p.evaluate(() => (IV.speed = 200));
  await p.waitForFunction(() => PRO.on && G.scene === 'map');
};

async function fresh() {
  console.log('— 新存檔：全程 —');
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
  await p.waitForFunction(() => PRO.on && G.scene === 'map');
  ok(
    '播完直接進序章第 1 步',
    await p.evaluate(() => PRO.i === 0 && !IV.on && !document.body.classList.contains('cine'))
  );
  ok('存檔記了看過開場', await p.evaluate(() => JSON.parse(localStorage.getItem(KEY + SLOT)).story.intro === PRO_VER));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: shot('s1') });
  const tt = n => p.evaluate(() => $('prot').textContent).then(t => console.log(`   第 ${n} 步：${t}`));
  await tt(1);
  /* 1 走路 */
  await p.keyboard.down('w');
  await stepIs(p, 1);
  await p.keyboard.up('w');
  await tt(2);
  ok('第 2 步：石牆打開、地上有劍', await p.evaluate(() => G.drops.length === 1 && !isWall(432, 59.5 * TS)));
  /* 2 撿劍、裝上 */
  await walk(p, ...(await p.evaluate(() => [G.drops[0].x, G.drops[0].y])), 80);
  await p.keyboard.press('f');
  await p.waitForFunction(() => proHasSword());
  await p.waitForTimeout(100);
  await tt('2-2');
  await p.keyboard.press('i');
  await p.waitForSelector('#pinv:not([hidden]) .it');
  await bagGuide(p, '點一下劍裝上', '桌機 1280×720');
  await p.screenshot({ path: shot('s2') });
  await p.click('#pinv .it[data-src=inv]');
  await stepIs(p, 2);
  await bagDone(p, '桌機 1280×720');
  ok('第 3 步：劍裝上了、背包關了', await p.evaluate(() => !!S.eq.weapon && !PANEL.inv));
  await tt(3);
  /* 3 攻擊 */
  await walk(p, 672, 2232, 40);
  await walk(p, ...(await p.evaluate(() => [G.mobs[0].x, G.mobs[0].y])), 200);
  await p.screenshot({ path: shot('s3') });
  await fight(p);
  await stepIs(p, 3);
  await tt(4);
  /* 4 翻滾：先試用走的躲，不算 */
  await walk(p, 864, 1680, 40);
  await walk(p, 864, 1300, 40);
  await walk(p, ...(await p.evaluate(() => Object.values(proXY([14, 24])))), 40);
  await p.waitForFunction(() => PRO.st.c && PRO.st.c.t > 0.05);
  await p.screenshot({ path: shot('s4') });
  await p.evaluate(() => {
    K.d = K.w = 1;
  });
  await p.waitForFunction(() => !PRO.st.c);
  await p.evaluate(() => {
    K.d = K.w = 0;
  });
  ok('第 4 步：用走的躲掉不算', await p.evaluate(() => PRO.st.n === 0));
  for (let k = 0; k < 12 && (await p.evaluate(() => PRO.i === 3)); k++) {
    /* 翻滾的方向跟著滑鼠，連滾可能滾回走道：地上的指引會帶回去，這裡直接走回來 */
    await p.evaluate(() => proInD() || Object.assign(P, proXY([14, 24])));
    await p.waitForFunction(() => (PRO.st.c && PRO.st.c.t > 0.5) || PRO.i !== 3);
    await p.keyboard.press(' ');
    await p.waitForFunction(() => !PRO.st.c || PRO.i !== 3);
  }
  await stepIs(p, 4);
  await tt(5);
  ok('第 5 步：受傷了', await p.evaluate(() => P.hp < ST.hp * 0.5));
  await p.screenshot({ path: shot('s5') });
  /* 5 藥水 */
  await p.keyboard.press('1');
  await stepIs(p, 5);
  await tt(6);
  /* 6 技能打小王：只用普攻打不死 */
  const boss = await p.evaluate(() => {
    const m = G.mobs.find(m => m.boss);
    return { x: m.x, y: m.y, hp: m.mhp, n: m.D.n };
  });
  await walk(p, 528, 1000, 40);
  await walk(p, 528, 720, 40);
  await walk(p, boss.x, boss.y, 260);
  await p.waitForTimeout(300);
  await p.screenshot({ path: shot('s6') });
  ok(
    '目標列不蓋王血條',
    await p.evaluate(() => {
      const a = $('pro').getBoundingClientRect(),
        q = $('bossbar').getBoundingClientRect();
      return q.height > 0 && (a.top >= q.bottom || q.top >= a.bottom);
    })
  );
  await p.evaluate(() => (G.mobs.find(m => m.boss).hp = G.mobs.find(m => m.boss).mhp * 0.1));
  await p.waitForTimeout(100);
  ok(
    '第 6 步：沒放技能留半條血',
    await p.evaluate(() => {
      const b = G.mobs.find(m => m.boss);
      return !PRO.st.sk && b.hp >= b.mhp * 0.49;
    })
  );
  await fight(p, 1);
  await stepIs(p, 6);
  await tt(7);
  /* 7 走出地層 */
  await walk(p, ...(await p.evaluate(() => Object.values(proXY([12.5, 2])))), 40);
  await stepIs(p, 7);
  ok(
    '第 7 步：回到藏身處、換回真的存檔、拿到序章的劍',
    await p.evaluate(() => G.scene === 'hide' && !PRO.real && S.eq.weapon && !S.fresh)
  );
  await tt('7-2');
  await p.waitForTimeout(1200);
  await p.screenshot({ path: shot('s7') });
  await walk(p, 820, 650, 40);
  await walk(p, 640, 700, 40);
  await walk(p, 620, 770, 40);
  await p.waitForFunction(() => TALK.on);
  ok('撿骨師播 bone_first', await p.evaluate(() => TALK.id === 'bone_first'));
  await p.screenshot({ path: shot('s7t') });
  for (let k = 0; k < 12 && (await p.evaluate(() => TALK.on)); k++) await p.keyboard.press('f');
  await stepIs(p, 8);
  await tt(8);
  /* 8 地圖台 */
  await walk(p, 660, 530, 60);
  await p.keyboard.press('f');
  await p.waitForFunction(() => PANEL.device);
  await p.screenshot({ path: shot('s8') });
  ok(
    '第 8 步：地圖台打開，序章結束、記版本號',
    await p.evaluate(() => {
      const s = JSON.parse(localStorage.getItem(KEY + SLOT));
      return !PRO.on && s.story.prologue === PRO_VER && !s.story.proS && !!s.eq.weapon && !s.fresh && $('pro').hidden;
    })
  );
  await open(p, 41);
  ok('重新整理不再跑', await p.evaluate(() => !IV.on && !PRO.on && G.scene === 'hide'));
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
/* 桌機大尺寸：點一下就裝上，文字跟 1280×720 一樣 */
async function desk() {
  console.log('— 桌機 1440×900 第 2 步 —');
  const p = await page(1440, 900);
  await clean(p, 40);
  await toMap(p);
  await p.evaluate(() => {
    proStep(1);
    const d = G.drops[0];
    Object.assign(P, { x: d.x, y: d.y + 60 });
    pickup(d);
  });
  await p.keyboard.press('i');
  await p.waitForSelector('#pinv:not([hidden]) .it');
  await bagGuide(p, '點一下劍裝上', '桌機 1440×900');
  await p.click('#pinv .it[data-src=inv]');
  await stepIs(p, 2);
  await bagDone(p, '桌機 1440×900');
  ok('沒有頁面錯誤', !p.errs.length, p.errs[0]);
  await p.ctxx.close();
}
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
  ok('老存檔也要跑一次', await p.evaluate(() => IV.on && IV.gate));
  const before = await p.evaluate(CORE);
  await toMap(p);
  ok('序章用臨時角色', await p.evaluate(() => !S.eq.weapon && S.lv === 1 && PRO.real.lv === 42));
  ok('手機方向設定帶進序章', await p.evaluate(() => S.orient === 'l'));
  /* 在序章裡亂動臨時角色：不能寫進存檔 */
  await p.evaluate(() => {
    S.gold = 1;
    S.lv = 3;
    S.eq.chest = null;
    save();
  });
  ok('序章裡存檔寫的是真的角色', (await p.evaluate(DISK)) === before);
  await p.evaluate(() => {
    die();
  });
  ok('序章裡死掉不扣真的經驗', (await p.evaluate(DISK)) === before);
  await p.evaluate(() => {
    proSkip();
  });
  ok('跳過：角色一模一樣', (await p.evaluate(CORE)) === before);
  ok('跳過：回藏身處、記版本號', await p.evaluate(() => G.scene === 'hide' && !PRO.on && S.story.prologue === PRO_VER));
  ok('老玩家沒有多一把劍', await p.evaluate(() => S.eq.weapon.b === 'w_bow_0' && !S.inv.items.length));
  ok('老玩家不跳設施提示', await p.evaluate(() => !proHint('asc')));
  /* 再跑一次：走到第 7 步才換回來，跑完也要一模一樣 */
  await p.evaluate(() => {
    delete S.story.prologue;
    delete S.story.intro;
    save();
  });
  await open(p, 42);
  await toMap(p);
  await p.evaluate(() => {
    for (let i = 1; i <= 7; i++) proStep(i);
    Object.assign(P, { x: 660, y: 540 });
  });
  ok(
    '第 7 步換回自己的角色',
    (await p.evaluate(CORE)) === before && (await p.evaluate(() => S.lv === 42 && S.eq.weapon.b === 'w_bow_0'))
  );
  ok('走完存檔也一模一樣', (await p.evaluate(DISK)) === before);
  /* 版本號 */
  await p.evaluate(() => {
    proSkip();
  });
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
  console.log('— 跳過、死亡、重新整理 —');
  const p = await page(1280, 720);
  await clean(p, 43);
  /* 開場按 Esc 跳過 */
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  ok('Enter 也能開始', await p.evaluate(() => IV.on && !IV.gate));
  await p.click('.ivskip');
  await p.waitForFunction(() => PRO.on && G.scene === 'map');
  ok('開場跳過：進序章，記過開場', await p.evaluate(() => PRO.i === 0 && S.story.intro === PRO_VER));
  /* 重新整理：不再播開場，序章重來 */
  await open(p, 43);
  ok('序章中重新整理：不再播開場', await p.evaluate(() => !IV.on && PRO.on && PRO.i === 0));
  /* 死亡：第 3 步 */
  await p.evaluate(() => {
    S.eq.weapon = mkItem(PRO_SWORD, 1, 0);
    for (let i = 1; i <= 2; i++) proStep(i);
  });
  await p.evaluate(() => {
    P.x = 780;
    P.y = 1900;
    G.mobs[0].hp = 0;
    die();
  });
  ok(
    '死亡：同一步、血滿、怪重生、回起點',
    await p.evaluate(
      () =>
        PRO.i === 2 &&
        G.state === 'play' &&
        P.hp === ST.hp &&
        G.mobs.filter(m => m.hp > 0).length === 3 &&
        dist(P, proXY(PRO_STEPS[2].at)) < 1
    )
  );
  ok('死亡：沒有死亡卡', await p.evaluate(() => $('over').hidden));
  await p.evaluate(() => {
    for (let i = 3; i <= 5; i++) proStep(i);
    die();
  });
  ok('死亡：第 6 步小王重來', await p.evaluate(() => PRO.i === 5 && G.mobs.filter(m => m.boss).length === 1));
  /* 第 7 步重新整理：新玩家的劍要留著、從藏身處接 */
  await p.evaluate(() => {
    proStep(6);
    proStep(7);
  });
  await open(p, 43);
  ok(
    '第 7 步重新整理：從藏身處接',
    await p.evaluate(() => PRO.on && PRO.i === 7 && G.scene === 'hide' && !!S.eq.weapon && S.story.tips === 1)
  );
  /* 新玩家在第 1 步跳過：給一把一樣的劍 */
  await clean(p, 44);
  await toMap(p);
  await p.click('[data-pro=skip]');
  ok('跳過要按兩次', await p.evaluate(() => PRO.on));
  await p.click('[data-pro=skip]');
  ok(
    '新玩家跳過：有劍、回藏身處、記版本號',
    await p.evaluate(
      () =>
        S.eq.weapon &&
        S.eq.weapon.b === PRO_SWORD &&
        !S.fresh &&
        G.scene === 'hide' &&
        S.story.prologue === PRO_VER &&
        !PRO.on
    )
  );
  /* 雲端換存檔：序章停掉、臨時角色丟掉 */
  await clean(p, 45);
  await toMap(p);
  await p.evaluate(() => {
    const r = JSON.parse(JSON.stringify(PRO.real));
    delete r.fresh;
    r.lv = 9;
    r.savedAt = Date.now() + 1000;
    r.story = { intro: PRO_VER, prologue: PRO_VER };
    useSave(r);
  });
  ok('雲端換存檔：序章停掉', await p.evaluate(() => !PRO.on && !PRO.real && S.lv === 9 && G.scene === 'hide'));
  ok('沒有頁面錯誤', !p.errs.length, p.errs[0]);
  await p.ctxx.close();
}
/* 系統「減少動態」：不閃、不震、不平移，睜眼只淡出 */
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
  await p.evaluate(() => (IV.speed = 200));
  await p.waitForFunction(() => PRO.on && G.scene === 'map');
  ok(
    '睜眼只淡出',
    (await p.evaluate(() => getComputedStyle(document.querySelector('#lid i')).animationName)) === 'lidFade'
  );
  ok('沒有頁面錯誤', !p.errs.length, p.errs[0]);
  await p.ctxx.close();
}
/* 手機：四個尺寸的提示與真的觸控 */
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
  await p.evaluate(() => (IV.speed = 200));
  await p.waitForFunction(() => PRO.on && G.scene === 'map');
  await p.waitForTimeout(1200);
  const drag = async (x0, y0, dx, dy, ms) => {
    const c = await p.ctxx.newCDPSession(p);
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    for (let i = 1; i <= 6; i++) {
      await c.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x0 + (dx * i) / 6, y: y0 + (dy * i) / 6 }]
      });
      await p.waitForTimeout(16);
    }
    await p.waitForTimeout(ms);
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const hint = await p.evaluate(() => $('prot').textContent);
  ok('第 1 步的提示是' + (port ? '直立' : '橫向') + '操作', port ? /拖/.test(hint) : /搖桿/.test(hint), hint);
  const box = await p.evaluate(() => {
    const r = $('pro').getBoundingClientRect(),
      hit = [...document.querySelectorAll('.tmenu button,.sk:not(.far)')]
        .filter(e => e.offsetParent)
        .map(e => e.getBoundingClientRect())
        .filter(q => q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top && q.width);
    return { r: [r.left, r.top, r.right, r.bottom].map(Math.round), hit: hit.length, w: innerWidth, h: innerHeight };
  });
  const clearHero = () =>
    p.evaluate(() => $('pro').getBoundingClientRect().bottom <= innerHeight / 2 + (P.y - G.cam.y - 70) * ZOOM);
  ok('目標列不蓋主角', await clearHero());
  ok(
    '目標列在畫面內、不蓋按鈕',
    box.r[0] >= 0 && box.r[2] <= box.w && box.r[3] <= box.h && !box.hit,
    JSON.stringify(box)
  );
  await p.screenshot({ path: shot(`s1_${tag}`) });
  const y0 = await p.evaluate(() => P.y);
  await drag(port ? w / 2 : 120, port ? h * 0.55 : h - 90, 0, -60, 1500);
  ok('觸控拖動走得動', (await p.evaluate(() => P.y)) < y0 - 60);
  await p.evaluate(() => proStep(1));
  await p.evaluate(() => {
    const d = G.drops[0];
    Object.assign(P, { x: d.x, y: d.y + 60 });
  });
  await p.waitForTimeout(800);
  /* 點地上的名字撿劍 */
  const lab = await p.evaluate(
    () => LABELS[0] && { x: LABELS[0].x + LABELS[0].w / 2, y: LABELS[0].y + LABELS[0].h / 2 }
  );
  ok('地上的劍有名字可以點', !!lab);
  if (lab) await p.touchscreen.tap(lab.x, lab.y);
  await p.waitForTimeout(300);
  ok('點一下撿起來', await p.evaluate(() => proHasSword()));
  await p.waitForTimeout(200);
  ok('背包按鍵亮起來', await p.evaluate(() => document.querySelector('[data-tm=inv]').classList.contains('pro-hl')));
  await p.tap('.tmenu [data-tm=inv]');
  const TEXT = '點一下劍，再按「裝備」';
  await bagGuide(p, TEXT, tag);
  await p.screenshot({ path: shot(`s2_${tag}`) });
  /* 橫向的裝備欄分頁看不到劍：這一步固定在背包分頁 */
  if (h < 480) {
    await p.tap('[data-invt=eq]');
    await bagGuide(p, TEXT, tag + ' 按了裝備欄分頁');
  }
  await p.tap('#pinv .it[data-src=inv]');
  await p.waitForTimeout(250);
  await p.screenshot({ path: shot(`s2b_${tag}`) });
  const eq = await p.$('[data-tq=move]');
  ok('點劍出現裝備按鈕', !!eq);
  const eqs = await p.evaluate(() => {
    const b = document.querySelector('[data-tq=move]'),
      q = b.getBoundingClientRect();
    return {
      t: b.textContent,
      on: b.classList.contains('pro-hl'),
      in: q.top >= 0 && q.bottom <= innerHeight && q.left >= 0 && q.right <= innerWidth
    };
  });
  ok('「裝備」鍵的字跟提示一致、亮著、在畫面內', eqs.t === '裝備' && eqs.on && eqs.in, JSON.stringify(eqs));
  if (eq) await eq.tap();
  await p.waitForFunction(() => PRO.i === 2, null, { timeout: 4000 }).catch(() => {});
  await bagDone(p, tag);
  /* 其他步驟的提示與亮的按鍵 */
  for (const [i, re, hl] of [
    [2, port ? /點一下畫面/ : /大鍵/, port ? '' : 's0'],
    [3, port ? /一撥/ : /翻滾鍵/, port ? '' : 'roll'],
    [4, /藥水鍵/, 'flask'],
    [5, /技能鍵/, 's1']
  ]) {
    await p.evaluate(i => PRO.i === i || proStep(i), i);
    if (i === 3)
      await p.evaluate(() => {
        Object.assign(P, proXY([14, 24]));
      });
    await p.waitForTimeout(350);
    const r = await p.evaluate(hl => {
      const e = hl && document.querySelector(`.sk[data-k=${hl}]`),
        q = e && e.getBoundingClientRect();
      return {
        t: $('prot').textContent,
        on: !hl || e.classList.contains('pro-hl'),
        inside: !q || (q.left >= 0 && q.right <= innerWidth && q.bottom <= innerHeight && q.width > 0)
      };
    }, hl);
    ok(`第 ${i + 1} 步的提示與亮鍵`, re.test(r.t) && r.on && r.inside, JSON.stringify(r));
    if (i === 5) {
      await p.evaluate(() => {
        const b = G.mobs.find(m => m.boss);
        Object.assign(P, { x: b.x, y: b.y + 240 });
        b.aggro = 1;
      });
      await p.waitForTimeout(350);
      const o = await p.evaluate(() => {
        const a = $('pro').getBoundingClientRect(),
          q = $('bossbar').getBoundingClientRect();
        return {
          boss: q.height,
          over: a.top < q.bottom && q.top < a.bottom && a.left < q.right && q.left < a.right,
          a: a.top,
          b: q.bottom
        };
      });
      ok('目標列不蓋王血條', o.boss > 0 && !o.over, JSON.stringify(o));
      ok('有王的時候目標列也不蓋主角', await clearHero());
    }
    await p.screenshot({ path: shot(`s${i + 1}_${tag}`) });
  }
  /* 喝藥水：真的按鍵 */
  await p.evaluate(() => proStep(4));
  await p.waitForTimeout(250);
  await p.tap('.sk[data-k=flask]');
  await p.waitForTimeout(250);
  ok('點藥水鍵喝藥水，進下一步', await p.evaluate(() => PRO.i === 5));
  await p.waitForTimeout(300);
  await p.tap('[data-pro=skip]');
  await p.tap('[data-pro=skip]');
  await p.waitForTimeout(300);
  ok('手機跳過', await p.evaluate(() => !PRO.on && G.scene === 'hide' && !!S.eq.weapon));
  /* 第 7、8 步的提示 */
  await p.evaluate(() => {
    delete S.story.prologue;
    S.story.proS = 7;
    save();
  });
  await open(p, 46);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: shot(`s7_${tag}`) });
  await p.evaluate(() => {
    proStep(8);
  });
  await p.waitForTimeout(300);
  ok('第 8 步的提示是互動鍵', /互動鍵/.test(await p.evaluate(() => $('prot').textContent)));
  await p.evaluate(() => {
    Object.assign(P, { x: 660, y: 530 });
  });
  await p.waitForTimeout(400);
  await p.tap('.sk[data-k=use]');
  await p.waitForTimeout(400);
  await p.screenshot({ path: shot(`s8_${tag}`) });
  ok('按互動鍵打開地圖台，序章結束', await p.evaluate(() => PANEL.device && !PRO.on));
  ok('沒有頁面錯誤', !p.errs.length, p.errs[0]);
  await p.ctxx.close();
}
(async () => {
  b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const only = process.argv[3];
  try {
    if (!only || only === 'fresh') await fresh();
    if (!only || only === 'fresh') await desk();
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
        JSON.stringify({
          i: PRO.i,
          on: PRO.on,
          st: { ...PRO.st, c: !!PRO.st.c },
          scene: G.scene,
          state: G.state,
          x: P.x | 0,
          y: P.y | 0,
          hp: P.hp | 0,
          talk: TALK.on
        })
      )
    );
    console.log(LAST.errs);
  }
  await b.close();
  console.log(bad ? `❌ ${bad} 項沒過` : '全部通過');
  process.exit(bad ? 1 : 0);
})();
