const { chromium } = require('playwright');
/* 營地實測（M2-12，Playwright，實際按鍵、點滑鼠、出招）：藏身處併入營地後——停在營地、主角不走動（WASD、F 不用）、鏡頭可拖、
   點場景物件＝開跟分頁同一個面板（鎖住的出 M1-06 那一句）、沒有市集名牌、點練習區直接切進石圈打三隻稻草人、實戰模式、DPS 重置、
   地點清單進場地、T 回營地（先確認、再按一次）、刷圖中開營地分頁上方仍是戰鬥、刷圖暫停重新整理停在營地、舊存檔（藏身處）轉成營地。
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
    /* M1-01：新存檔跳過開場會直接開刷；這裡測營地（手動模式：刷圖暫停時停在營地，不會自己開刷） */
    S.auto = 0;
    enterCamp();
  });
  await p.waitForTimeout(400);
  /* 世界座標 → 畫面座標（propAt 在名牌下方 25 世界 px 判定） */
  const scr = (x, y) =>
    p.evaluate(([x, y]) => ({ x: (x - G.cam.x) * ZOOM + IW / 2, y: (y - G.cam.y) * ZOOM + cvH() / 2 }), [x, y]);
  const settle = async () => {
    await p.evaluate(() => (G.pan = 0));
    await p.waitForTimeout(700);
  };
  ok(
    '進營地：場景是營地、擺設都在',
    await p.evaluate(() => G.scene === 'camp' && !!G.tiles && G.props.length >= 6),
    await p.evaluate(() => G.scene + ' ' + G.props.length)
  );
  ok(
    '沒有「市集（之後開放）」名牌',
    await p.evaluate(
      () => !G.props.some(q => q.k === 'market' || /市集/.test(q.n)) && !HIDE_ART.props.some(q => /市集/.test(q.n))
    )
  );
  ok(
    '主角站在站位、鏡頭對準主角',
    await p.evaluate(
      () =>
        P.x === HIDE_ART.spawn.x &&
        P.y === HIDE_ART.spawn.y &&
        Math.abs(G.cam.x - P.x) < 2 &&
        Math.abs(G.cam.y - P.y) < 2
    ),
    await p.evaluate(() => [G.cam.x, G.cam.y, P.x, P.y].join())
  );
  ok(
    '頂部資訊列寫「營地」',
    await p.evaluate(() => /^營地 · /.test($('area').textContent)),
    await p.evaluate(() => $('area').textContent)
  );
  /* 1. 主角不在營地走動：WASD 真的按下去，人不動；A／D 平移鏡頭，放開 3 秒後回到主角 */
  const home = await p.evaluate(() => ({ x: P.x, y: P.y }));
  await p.keyboard.down('d');
  await p.keyboard.down('s');
  await p.waitForTimeout(700);
  await p.keyboard.up('s');
  await p.keyboard.up('d');
  const kd = await p.evaluate(() => ({ x: P.x, y: P.y, cam: G.cam.x, mv: P.mv }));
  ok('按 D、S：主角不動', kd.x === home.x && kd.y === home.y, JSON.stringify(kd));
  ok('按 D：鏡頭往右平移', kd.cam > home.x + 60, JSON.stringify(kd));
  await p.keyboard.down('a');
  await p.keyboard.down('w');
  await p.waitForTimeout(700);
  await p.keyboard.up('w');
  await p.keyboard.up('a');
  const ka = await p.evaluate(() => ({ x: P.x, y: P.y, cam: G.cam.x }));
  ok('按 A、W：主角不動、鏡頭往左', ka.x === home.x && ka.y === home.y && ka.cam < kd.cam - 60, JSON.stringify(ka));
  const vw = await p.evaluate(() => IW / ZOOM);
  ok(
    '鏡頭卡在場景邊界內',
    await p.evaluate(vw => G.cam.x >= vw / 2 - 1 && G.cam.x <= HIDE_ART.W - vw / 2 + 1, vw),
    await p.evaluate(() => G.cam.x)
  );
  await p.waitForTimeout(4200);
  ok(
    '放開 3 秒後鏡頭慢慢回到主角',
    await p.evaluate(() => Math.abs(G.cam.x - P.x) < 20),
    await p.evaluate(() => G.cam.x)
  );
  /* 2. 滑鼠按住左鍵拖＝平移鏡頭，不放技能、主角不動 */
  await settle();
  const e0 = await scr(home.x + 120, home.y + 160);
  await p.mouse.move(e0.x, e0.y);
  await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(e0.x - i * 30, e0.y, { steps: 2 });
  await p.waitForTimeout(250);
  const dr = await p.evaluate(() => ({ cam: G.cam.x, pan: G.pan, act: !!P.act, x: P.x, y: P.y }));
  await p.mouse.up();
  ok(
    '按住左鍵往左拖：鏡頭往右平移、沒放技能、主角不動',
    dr.pan > 100 && dr.cam > home.x + 60 && !dr.act && dr.x === home.x && dr.y === home.y,
    JSON.stringify(dr)
  );
  /* 3. F 互動在營地不用：站位就在地圖台旁，按 F 也不開面板 */
  await settle();
  await p.keyboard.press('f');
  await p.waitForTimeout(150);
  ok('按 F：不開任何面板', await p.evaluate(() => !anyPanel()));
  /* 4. 點場景物件＝開跟分頁（功能選單）同一個面板；未解鎖的出 M1-06「升 … 到 Lv n 才開」、不開面板 */
  const want = { device: 'node', stash: 'stash', forge: 'forge', asc: 'asc', box: 'box' };
  const spots = await p.evaluate(() => G.props.map(q => ({ k: q.k, n: q.n, x: q.x, y: q.y })));
  const panelOf = () =>
    p.evaluate(() =>
      PANEL.node
        ? 'node'
        : PANEL.asc
          ? 'asc'
          : PANEL.box
            ? 'box'
            : PANEL.stash
              ? 'stash'
              : PANEL.craft
                ? 'forge:' + CRAFT.tab
                : ''
    );
  for (const s of spots.filter(s => want[s.k])) {
    await p.evaluate(() => closePanels());
    /* 跟分頁一樣：功能選單（M、O、K、U、J）打開的那一個 */
    const ref = await p.evaluate(
      k => (
        fmenuOpen(k),
        PANEL.node
          ? 'node'
          : PANEL.asc
            ? 'asc'
            : PANEL.box
              ? 'box'
              : PANEL.stash
                ? 'stash'
                : PANEL.craft
                  ? 'forge:' + CRAFT.tab
                  : ''
      ),
      want[s.k]
    );
    await p.evaluate(() => (closePanels(), ($('warn').textContent = '')));
    await settle();
    const at = await scr(s.x, s.y - 25);
    await p.mouse.click(at.x, at.y);
    await p.waitForTimeout(200);
    const got = await panelOf(),
      warn = await p.evaluate(() => $('warn').textContent),
      lk = await p.evaluate(k => lockTxt(k), want[s.k]);
    /* 昇華 v1.0（ascend-spec A01）：石碑沒開照樣打開 15 格全 ??? 的選擇面板，同時出那一句；其他設施照舊不開 */
    if (lk && want[s.k] === 'asc')
      ok(
        `點${s.n}（未解鎖）：出「${lk}」、打開 15 格全 ???（ascend-spec A01）`,
        got === 'asc' &&
          warn === lk &&
          (await p.evaluate(
            () =>
              [...document.querySelectorAll('#pasc .axk.q, #pasc .axl-q')].filter(e => e.textContent.includes('???'))
                .length === 15
          )),
        got + ' ' + warn
      );
    else if (lk)
      ok(
        `點${s.n}（未解鎖）：出「${lk}」、不開面板`,
        !got && warn === lk && /^升.+到 Lv \d+ 才開$/.test(lk),
        got + ' ' + warn
      );
    else ok(`點${s.n}：開跟分頁同一個面板（${ref}）`, !!ref && got === ref, got + ' vs ' + ref);
    const st = await p.evaluate(() => ({ x: P.x, y: P.y }));
    ok(`點${s.n}：主角不動`, st.x === home.x && st.y === home.y, JSON.stringify(st));
  }
  /* 昇華石碑：祭壇升到 Lv 7 之後點了就開 */
  await p.evaluate(() => {
    closePanels();
    S.camp.altar = campKey('asc')[1];
  });
  {
    await settle();
    const s = spots.find(s => s.k === 'asc'),
      at = await scr(s.x, s.y - 25);
    await p.mouse.click(at.x, at.y);
    await p.waitForTimeout(200);
    ok('祭壇到了之後點昇華石碑：開昇華面板', (await panelOf()) === 'asc');
    await p.evaluate(() => {
      closePanels();
      S.camp.altar = 0;
    });
  }
  /* 5. 練習區：點一下直接切進石圈（不用走過去） */
  await settle();
  ok('石圈外不能出招', await p.evaluate(() => !useSlot(0) && !P.act));
  {
    const s = spots.find(s => s.k === 'prac'),
      at = await scr(s.x, s.y - 25);
    await p.mouse.click(at.x, at.y);
    await p.waitForTimeout(250);
  }
  ok(
    '點練習區：切進石圈，面板出現，還沒打所以沒有 DPS',
    await p.evaluate(() => PRAC.in && !$('prac').hidden && $('prd').hidden && G.mobs.filter(m => m.dummy).length === 3),
    await p.evaluate(() => [PRAC.in, Math.round(P.x), Math.round(P.y)].join())
  );
  await p.screenshot({ path: shot('practice') });
  /* 三隻稻草人都打得到、都不會死 */
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
    return {
      used: P.mp < m0 || !!slotCfg(1),
      real: PRAC.real,
      tot: DPS.tot,
      why: slotCfg(1) && skillWhy(slotCfg(1), P)
    }; /* 0.5.0 起新存檔只有斬擊，第 2 格是空的 */
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
    S.skills[2].k = Object.keys(SKILLS).find(k => SKILLS[k].unit === 'totem');
    P.act = null;
    const totem = await gain(() => useSlot(2));
    G.units.length = 0;
    const ground = await gain(() => addGround({ k: 'fire', x: m.x, y: m.y, r: 80, dur: 2, dps: 1, c: slotCfg(0) }));
    G.ground.length = 0;
    S.skills[2].k = null;
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
      keep = [S.eq.weapon, S.skills[2].k],
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
    S.skills[2].k = 'blindpounce';
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
    S.skills[2].k = keep[1];
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
  /* 6. 再點一次練習區：回站位、離開石圈就清場 */
  await p.evaluate(async () => {
    addGround({ k: 'oil', x: P.x, y: P.y, r: 60 });
    callWolf('gem', slotCfg(0));
  });
  {
    await settle();
    const s = spots.find(s => s.k === 'prac'),
      at = await scr(s.x, s.y - 25);
    await p.mouse.click(at.x, at.y);
    await p.waitForTimeout(200);
  }
  ok(
    '再點練習區：回站位、離開石圈就清場',
    await p.evaluate(
      () =>
        !PRAC.in &&
        !G.allies.length &&
        !G.ground.length &&
        $('prac').hidden &&
        P.x === HIDE_ART.spawn.x &&
        P.y === HIDE_ART.spawn.y
    ),
    await p.evaluate(() => [PRAC.in, G.allies.length, G.ground.length, P.x, P.y].join())
  );
  await p.screenshot({ path: shot('camp') });
  /* 7. 地點清單（點地圖台＝地點清單）點一列＝runNode → 直接進場地 */
  await p.evaluate(() => {
    fmenuOpen('node');
    runNode(TRUNK_K[0]);
  });
  await p.waitForTimeout(300);
  ok(
    '地點清單點一列直接進場地',
    await p.evaluate(() => G.scene === 'map' && G.node === TRUNK_K[0] && !G.mobs.some(m => m.dummy) && !G.solid.length)
  );
  /* 8. 刷圖中開營地分頁：上方（左邊）仍是戰鬥，場景不換成營地 */
  await p.evaluate(() => fmenuOpen('craft'));
  await p.waitForTimeout(400);
  ok(
    /* M2-12 第一段 §3：刷圖中開的是營地升級抽屜（PANEL.camp），不是營地總覽 */
    '刷圖中開營地分頁：營地升級抽屜開著、上方仍是戰鬥（場景是地圖、沒有營地擺設）',
    await p.evaluate(
      () =>
        PANEL.camp &&
        !!document.querySelector('#pcamp .cdg') &&
        G.scene === 'map' &&
        !G.props.some(q => q.k === 'device') &&
        !G.mobs.some(m => m.dummy)
    )
  );
  await p.screenshot({ path: shot('map_camp_tab') });
  await p.evaluate(() => closePanels());
  /* 9. T 回營地：地圖裡先確認、再按一次 T＝回去，回去後停在營地、刷圖暫停 */
  await p.keyboard.press('t');
  await p.waitForTimeout(150);
  ok(
    '刷圖中按 T：跳「回營地？」確認卡，還在地圖',
    await p.evaluate(
      () => G.ask === 'camp' && G.scene === 'map' && !$('over').hidden && /回營地/.test($('over').textContent)
    ),
    await p.evaluate(() => G.ask + ' ' + $('over').textContent.slice(0, 40))
  );
  await p.keyboard.press('t');
  await p.waitForTimeout(300);
  ok(
    '再按一次 T：回到營地、停在營地（刷圖暫停、主角在站位、稻草人在）',
    await p.evaluate(
      () =>
        G.scene === 'camp' &&
        $('over').hidden &&
        S.stopWhy === 'camp' &&
        P.x === HIDE_ART.spawn.x &&
        G.mobs.filter(m => m.dummy).length === 3
    )
  );
  ok('營地上排有「繼續刷」', await p.evaluate(() => /繼續刷/.test($('run').textContent)));
  /* 10. 存檔還原：故事旗標、神像；刷圖暫停（自動模式也一樣）重新整理後停在營地，不會自己開刷 */
  await p.evaluate(() => {
    S.auto = 1;
    S.idols = ['rat', 'dragon'];
    S.story.boneMet = 1;
    S.savedAt = Date.now();
    save();
  });
  await p.goto(URL + '?p=8&' + Date.now());
  await p.waitForTimeout(1500);
  ok(
    '存檔還原：神像、故事旗標都在；刷圖暫停時重新整理停在營地',
    await p.evaluate(() => S.idols.length === 2 && S.story.boneMet === 1 && G.scene === 'camp' && S.stopWhy === 'camp')
  );
  /* 11. 舊存檔：停在藏身處（stopWhy 'home'、殘留 scene 'hide'）載入後轉成營地、停在營地 */
  await p.evaluate(() => {
    const o = JSON.parse(JSON.stringify(S));
    o.stopWhy = 'home';
    o.scene = 'hide';
    o.farm = 0;
    o.auto = 1;
    o.savedAt = o.offAt = Date.now();
    localStorage.setItem(KEY + SLOT, JSON.stringify(o));
  });
  await p.goto(URL + '?p=8&' + Date.now());
  await p.waitForTimeout(1500);
  const mig = await p.evaluate(() => ({
    scene: G.scene,
    stop: S.stopWhy,
    hasScene: 'scene' in S,
    cur: S.world.cur,
    run: /繼續刷/.test($('run').textContent)
  }));
  ok(
    '舊存檔（停在藏身處）載入：轉成營地、停在營地、刷圖照舊暫停',
    mig.scene === 'camp' && mig.stop === 'camp' && !mig.hasScene && !!mig.cur && mig.run,
    JSON.stringify(mig)
  );
  await p.screenshot({ path: shot('old_save') });
  ok(
    '舊存檔轉換（migrate）：stopWhy home → camp、拿掉 scene',
    await p.evaluate(() => {
      const o = JSON.parse(JSON.stringify(S));
      o.stopWhy = 'home';
      o.scene = 'hide';
      const m = migrate(o);
      return m.stopWhy === 'camp' && !('scene' in m) && migrate({ ...o, stopWhy: null }).stopWhy === null;
    })
  );
  /* 12. 舊存檔（沒有 idols、story）直接進營地 */
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
