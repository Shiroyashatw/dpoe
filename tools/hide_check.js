const { chromium } = require('playwright');
/* 藏身處實測（Playwright，實際走路、出招）：走到每個設施、打三隻稻草人、實戰模式、DPS 重置、開傳送門進地圖、回藏身處、存檔還原。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/hide_check.js [網址]。
   環境變數 PW_CHROME 可以指定 Chrome 路徑；截圖存在系統暫存資料夾（hide_*.png）；有 ❌ 時結束碼 1 */
const os = require('os'),
  path = require('path');
const URL = process.argv[2] || 'http://localhost:8000/',
  shot = n => path.join(os.tmpdir(), `hide_${n}.png`);
let bad = 0;
const ok = (n, c, info = '') => {
  console.log((c ? '✅ ' : '❌ ') + n + (c ? '' : ' ' + info));
  if (!c) bad++;
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  /* 測試絕對不能碰正式雲端：不擋的話每個乾淨環境都會匿名登入、多一筆存檔 */
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  let cloud = 0;
  p.on('response', r => /\.supabase\.co/.test(r.url()) && cloud++);
  const ready = () =>
    p.evaluate(() => typeof G === 'object' && !!G.scene && typeof treeInit === 'function').catch(() => false);
  const open = async () => {
    for (let k = 0; k < 6; k++) {
      errs.length = 0;
      await p.goto(URL + '?p=8&' + Date.now());
      await p.waitForTimeout(1500);
      if ((await ready()) && !errs.length) return;
    }
    throw new Error('遊戲載不起來：' + errs[0]);
  };
  await open();
  await p.evaluate(() => localStorage.clear());
  await open();
  await p.evaluate(() => {
    proSkip();
    S.story.tips = 0;
  });
  /* 真的按鍵走路：往目標走到距離 d 以內，回傳花了幾秒 */
  const walk = (x, y, d = 60) =>
    p.evaluate(
      ([x, y, d]) =>
        new Promise(ok => {
          const t0 = performance.now();
          let px = P.x,
            py = P.y,
            n = 0,
            side = 0;
          const tick = () => {
            const dx = x - P.x,
              dy = y - P.y,
              r = Math.hypot(dx, dy),
              late = performance.now() - t0 > 12000;
            K.a = dx < -8;
            K.d = dx > 8;
            K.w = dy < -8;
            K.s = dy > 8;
            /* 被擺設卡住：往旁邊繞一下 */
            if (++n % 15 === 0) {
              if (Math.hypot(P.x - px, P.y - py) < 12) side = 30;
              px = P.x;
              py = P.y;
            }
            if (side > 0) {
              side--;
              K.w = true;
              K.s = false;
            }
            if (r < d || late) {
              K.a = K.d = K.w = K.s = false;
              return ok({ r: Math.round(r), s: (performance.now() - t0) / 1000 });
            }
            requestAnimationFrame(tick);
          };
          tick();
        }),
      [x, y, d]
    );
  ok('進藏身處', await p.evaluate(() => G.scene === 'hide' && !!G.tiles && G.props.length >= 7));
  ok(
    '鏡頭跟著人物',
    await p.evaluate(() => Math.abs(G.cam.x - P.x) < 120 && Math.abs(G.cam.y - P.y) < 120),
    await p.evaluate(() => [G.cam.x, G.cam.y, P.x, P.y].join())
  );
  /* 1. 每個設施：走過去、按 F、面板或對話打開 */
  const spots = await p.evaluate(() => G.props.map(q => ({ k: q.k, n: q.n, x: q.x, y: q.y, r: q.r })));
  const home = await p.evaluate(() => ({ x: P.x, y: P.y }));
  for (const s of spots) {
    await p.evaluate(h => Object.assign(P, h), home);
    /* 石碑在地圖台正後面：從旁邊繞 */
    if (s.k === 'asc') await walk(s.x - 90, s.y + 30, 30);
    const w = await walk(s.x, s.y, s.r + 30);
    const opened = await p.evaluate(k => {
      const pk = { device: 'device', stash: 'stash', forge: 'craft', asc: 'asc' }[k];
      interact();
      const o = pk ? !!PANEL[pk] : k === 'npc' ? TALK.on : k === 'market' || k === 'prac';
      if (TALK.on) talkEnd();
      closePanels();
      return o || (nearProp() || {}).k + ' @' + Math.round(P.x) + ',' + Math.round(P.y);
    }, s.k);
    ok(
      `走到${s.n}：${w.s.toFixed(1)} 秒`,
      w.r <= s.r + 30 && w.s <= 3.3 && opened === true,
      JSON.stringify(w) + ' 開了 ' + opened
    );
  }
  /* 2. 出招：外面不行、石圈裡可以；三隻稻草人都打得到、都不會死 */
  await p.evaluate(h => Object.assign(P, h), home);
  ok('石圈外不能出招', await p.evaluate(() => !useSlot(0) && !P.act));
  const z = await p.evaluate(() => HIDE_ART.zone);
  await p.evaluate(() => (P.x = HIDE_ART.zone.x - 180));
  await p.evaluate(zz => {
    P.y = zz.y + 20;
  }, z);
  await walk(z.x, z.y + 30, 30);
  ok(
    '走進石圈：面板出現，還沒打所以沒有 DPS',
    await p.evaluate(() => PRAC.in && !$('prac').hidden && $('prd').hidden && G.mobs.filter(m => m.dummy).length === 3)
  );
  await p.screenshot({ path: shot('practice') });
  const hit = await p.evaluate(async () => {
    const out = [];
    for (const m of G.mobs.filter(x => x.dummy)) {
      dpsReset();
      Object.assign(P, { x: m.x, y: m.y + 56 });
      const w = { x: m.x, y: m.y - 30 };
      mouseWorld = () => w;
      const t0 = G.t,
        hp0 = G.xp;
      for (let i = 0; i < 12; i++) {
        useSlot(0);
        await new Promise(r => setTimeout(r, 150));
      }
      out.push({
        n: m.D.n,
        tot: Math.round(DPS.tot),
        max: Math.round(DPS.max),
        hp: m.hp > 0,
        boss: !!m.boss,
        elite: !!m.elite,
        res: m.res.fire,
        arm: Math.round(m.arm),
        t: G.t - t0
      });
    }
    return out;
  });
  for (const h of hit) ok(`${h.n} 打得到、不會死`, h.tot > 0 && h.hp, JSON.stringify(h));
  await p.waitForTimeout(100);
  await p.screenshot({ path: shot('dps') });
  ok('菁英、王的防禦不一樣', hit[2].res === 25 && hit[0].res === 0 && hit[1].arm > hit[0].arm, JSON.stringify(hit));
  ok('打了之後 DPS 面板出現', await p.evaluate(() => !$('prd').hidden && $('pra').textContent !== ''));
  ok(
    '不給經驗、不算首領進度、沒有掉寶',
    await p.evaluate(() => S.xp === 0 && !G.drops.length && !G.kills && G.mobs.filter(m => m.dummy).length === 3)
  );
  /* 3. 無限魔力、無冷卻 → 實戰模式 */
  const free = await p.evaluate(async () => {
    const mp = P.mp;
    await new Promise(r => setTimeout(r, 600));
    return { mp: P.mp === mp, cd: !Object.values(P.cds).some(v => v > 0 && false) };
  });
  ok('預設不扣魔力', free.mp);
  await p.click('[data-pr=real]');
  const real = await p.evaluate(async () => {
    const m0 = P.mp;
    P.act = null;
    useSlot(1);
    await new Promise(r => setTimeout(r, 100));
    return { used: P.mp < m0 || !!slotCfg(1), real: PRAC.real, tot: DPS.tot, why: skillWhy(slotCfg(1), P) };
  });
  ok('切到實戰模式：照真實魔力計算，統計歸零', real.real && real.tot === 0 && (await p.evaluate(() => !pracFree())));
  await p.click('[data-pr=real]');
  /* 4. 切換階級只能到已開放的 */
  await p.click('[data-pr=up]');
  ok('階級不能超過已開放的', await p.evaluate(() => PRAC.t === S.maxT));
  await p.evaluate(() => {
    S.maxT = 5;
  });
  await p.click('[data-pr=up]');
  const t2 = await p.evaluate(() => ({
    t: PRAC.t,
    arm: Math.round(G.mobs.find(m => m.dummy && m.elite).arm)
  }));
  ok('升一階：防禦跟著變', t2.t === 2 && t2.arm > hit[1].arm, JSON.stringify(t2));
  /* 5. DPS 重置 */
  await p.evaluate(() => {
    G.mirages.length = 0;
    dpsAdd(100, 0);
  });
  await p.waitForTimeout(120);
  ok('DPS 有數字', await p.evaluate(() => !$('prd').hidden));
  await p.click('[data-pr=reset]');
  await p.waitForTimeout(120);
  ok('DPS 重置後面板收起來', await p.evaluate(() => DPS.tot === 0 && $('prd').hidden));
  /* 6. 持續傷害算進統計、歸到持續 */
  const dot = await p.evaluate(async () => {
    const m = G.mobs.find(x => x.dummy);
    m.ail.bleed = { dps: 500, t: G.t + 3 };
    await new Promise(r => setTimeout(r, 700));
    return { dot: DPS.dot, tot: DPS.tot, hp: m.hp > 0 };
  });
  ok('持續傷害算進去', dot.dot > 0 && dot.dot >= dot.tot * 0.9 && dot.hp, JSON.stringify(dot));
  /* 召喚物、圖騰、地面打到稻草人都算進統計（放真的技能） */
  const via = await p.evaluate(async () => {
    const m = G.mobs.find(x => x.dummy),
      w = { x: m.x, y: m.y + 10 },
      gain = async fn => {
        dpsReset();
        fn();
        await new Promise(r => setTimeout(r, 2200));
        return DPS.tot;
      };
    Object.assign(P, { x: m.x + 30, y: m.y + 60 });
    mouseWorld = () => w;
    const wolf = await gain(() => callWolf('gem', slotCfg(0)));
    G.allies.length = 0;
    S.skills[2].a = mkGem(Object.keys(SKILLS).find(k => SKILLS[k].unit === 'totem'));
    P.act = null;
    const totem = await gain(() => useSlot(2));
    G.units.length = 0;
    const ground = await gain(() => addGround({ k: 'fire', x: m.x, y: m.y, r: 80, dur: 2, dps: 1, c: slotCfg(0) }));
    G.ground.length = 0;
    S.skills[2].a = null;
    return { wolf, totem, ground };
  });
  ok(
    '召喚物、圖騰、地面都打得到稻草人、都算進統計',
    via.wolf > 0 && via.totem > 0 && via.ground > 0,
    JSON.stringify(via)
  );
  /* 第 11 批：盲擊撲留下的煙霧要真的致盲稻草人，也要畫得出來 */
  const smoke = await p.evaluate(async () => {
    const m = G.mobs.find(x => x.dummy && !x.boss && !x.elite),
      w = { x: m.x, y: m.y },
      D = SKILLS.blindpounce,
      keep = [S.eq.weapon, S.skills[2].a],
      draw = drawMech;
    let drawn = 0;
    drawMech = () => {
      if (G.ground.some(g => g.k === 'smoke')) drawn++;
      draw();
    };
    for (const b of BASES.filter(x => x.k === 'weapon')) {
      S.eq.weapon = mkItem(b.id, 1, 0);
      ST = stats();
      if (wtOK(D)) break;
    }
    S.skills[2].a = mkGem('blindpounce');
    Object.assign(P, { x: m.x + 40, y: m.y + 40, act: null });
    mouseWorld = () => w;
    const fired = useSlot(2);
    await new Promise(r => setTimeout(r, 900));
    const out = {
      fired,
      ground: G.ground.some(g => g.k === 'smoke'),
      blind: m.ail.blind > G.t,
      drawn,
      why: skillWhy(slotCfg(2), w),
      tot: DPS.tot
    };
    drawMech = draw;
    G.ground.length = 0;
    S.eq.weapon = keep[0];
    S.skills[2].a = keep[1];
    ST = stats();
    return out;
  });
  ok(
    '盲擊撲的煙霧：致盲稻草人、畫得出來',
    smoke.fired && smoke.ground && smoke.blind && smoke.drawn > 0,
    JSON.stringify(smoke)
  );
  /* 裝備基底：每把武器（含固定詞）、單手再配輕盾，DPS 統計要跟實際造成的傷害一分不差 */
  const audit = await p.evaluate(() => {
    const hc = hitCalc,
      keep = [S.eq.weapon, S.eq.off],
      /* 輕盾排在盾的最後 6 個（data.js），每把武器輪流配一面，6 面都用到 */
      light = BASES.filter(b => b.k === 'shield').slice(-6),
      m = G.mobs.find(x => x.dummy && x.boss),
      bad = [];
    let sum = 0,
      n = 0,
      nl = 0;
    /* 擊中＝算出來的傷害＋滿血時的屠戮打擊（hitMob 接著會先扣這兩筆） */
    hitCalc = (c, x, o) => {
      const r = hc(c, x, o);
      sum += r.d + fullCut(x);
      return r;
    };
    for (const b of BASES.filter(x => x.k === 'weapon'))
      for (const off of [null, light[n % 6]]) {
        S.eq.weapon = mkItem(b.id, 16, 0);
        S.eq.off = off ? mkItem(off.id, 16, 0) : null;
        if (off && !offOK(S.eq.weapon, S.eq.off)) continue;
        ST = stats();
        dpsReset();
        sum = 0;
        if (off) nl++;
        const c = slotCfg(0) || BASEC;
        for (let i = 0; i < 12; i++) hitMob(m, c, 0, 0, { quiet: 1 });
        n++;
        if (!Number.isFinite(DPS.tot) || !Number.isFinite(sum) || Math.abs(DPS.tot - sum) > 1e-6 * Math.max(1, sum))
          bad.push(`${b.id}${off ? '+盾' : ''}：統計 ${DPS.tot}、實際 ${sum}`);
      }
    hitCalc = hc;
    S.eq.weapon = keep[0];
    S.eq.off = keep[1];
    ST = stats();
    dpsReset();
    return { n, nl, light: light.every(b => b.b.ev > b.b.armor), bad: bad.slice(0, 5), hp: m.hp > 0 };
  });
  ok(
    `每把武器與輕盾的 DPS 都對得上（${audit.n} 組，配輕盾 ${audit.nl} 組）`,
    audit.n > 50 && audit.nl > 20 && audit.light && !audit.bad.length && audit.hp,
    JSON.stringify(audit)
  );
  /* 7. 離開石圈：場上清掉 */
  await p.evaluate(async () => {
    addGround({ k: 'oil', x: P.x, y: P.y, r: 60 });
    callWolf('gem', slotCfg(0));
  });
  await p.evaluate(h => Object.assign(P, h), home);
  await p.waitForTimeout(150);
  ok(
    '離開石圈就清場',
    await p.evaluate(() => !PRAC.in && !G.allies.length && !G.ground.length && $('prac').hidden),
    await p.evaluate(() => [PRAC.in, G.allies.length, G.ground.length].join())
  );
  /* 8. 開傳送門、進地圖、回家、存檔 */
  await p.evaluate(() => {
    S.frag = 50;
    openPanel('device');
    PANEL.pick = 1;
    PANEL.card = 0;
    openMap('0,0', 0);
    closePanels();
  });
  ok('傳送門開在地圖台前面', await p.evaluate(() => !!G.portal && Math.abs(G.portal.x - HIDE_ART.portal.x) < 1));
  const pt = await p.evaluate(() => ({ x: G.portal.x, y: G.portal.y }));
  await walk(pt.x, pt.y, 50);
  await p.evaluate(() => interact());
  await p.waitForTimeout(300);
  ok('走進傳送門到地圖', await p.evaluate(() => G.scene === 'map' && !G.mobs.some(m => m.dummy) && !G.solid.length));
  await p.evaluate(() => goHome());
  await p.waitForTimeout(300);
  ok('回藏身處', await p.evaluate(() => G.scene === 'hide' && G.mobs.filter(m => m.dummy).length === 3));
  /* 9. 存檔還原：故事旗標、神像 */
  await p.evaluate(() => {
    S.idols = ['rat', 'dragon'];
    S.story.boneMet = 1;
    S.savedAt = Date.now();
    save();
  });
  await p.goto(URL + '?p=8&' + Date.now());
  await p.waitForTimeout(1500);
  ok(
    '存檔還原：神像、故事旗標都在',
    await p.evaluate(() => S.idols.length === 2 && S.story.boneMet === 1 && G.scene === 'hide')
  );
  /* 10. 舊存檔（沒有 idols、story）直接進新藏身處 */
  const old = await p.evaluate(() => {
    const o = JSON.parse(JSON.stringify(S));
    delete o.idols;
    delete o.story;
    const m = migrate(o);
    return m.idols.length === 0 && typeof m.story === 'object' && m.v === S.v;
  });
  ok('舊存檔補得上新欄位', old);
  ok('沒有 JS 錯誤', !errs.length, errs.slice(0, 3).join(' | '));
  ok('全程沒有連到雲端', !cloud && (await p.evaluate(() => !CLOUD.uid)), cloud + ' 個回應');
  await b.close();
  console.log(bad ? `❌ ${bad} 項沒過` : '全部通過');
  process.exit(bad ? 1 : 0);
})();
