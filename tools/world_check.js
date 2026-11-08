const { chromium } = require('playwright');
/* 世界地圖實測（Playwright）：序章第 8 步 → 劇情區 9 個節點 → 世界展開 → 世界區 → 洗卡 → 死亡重打 → 血霧 → 裂口王 → 存檔還原；
   手勢（拖曳、滾輪、單指、雙指）、減少動態、手機降速 4 倍的效能。序章前 7 步在 pro_check.js 走。
   用法：先在 dpoe/ 開本機伺服器，再 node tools/world_check.js [網址] [flow|gesture|still|perf]（預設全跑）。
   環境變數 PW_CHROME 指定瀏覽器；截圖存在系統暫存資料夾（world_*.png）；有 ❌ 時結束碼 1 */
const os = require('os'),
  path = require('path');
const URL = process.argv[2] || 'http://localhost:8000/',
  ONLY = process.argv[3] || '',
  shot = n => path.join(process.env.SHOT_DIR || os.tmpdir(), `world_${n}.png`);
let bad = 0;
const ok = (n, c, info = '') => {
  console.log((c ? '✅ ' : '❌ ') + n + (c ? '' : ' ' + info));
  if (!c) bad++;
};
async function open(b, opt = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opt });
  /* 測試絕對不能碰正式雲端 */
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL + '?p=6&' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof treeInit === 'function');
  await p.waitForTimeout(500);
  return p;
}
/* 對話一路按到底 */
async function talkAll(p) {
  for (let k = 0; k < 20 && (await p.evaluate(() => TALK.on)); k++) await p.keyboard.press('f');
}
/* 殺到王出現再殺王：走真的 killMob，掉落與過關都照常 */
const CLEAR = () => {
  for (let k = 0; k < 2000; k++) {
    const m = G.mobs.find(x => x.hp > 0 && !x.boss),
      b = G.mobs.find(x => x.boss && x.hp > 0);
    if (b) {
      killMob(b);
      break;
    }
    if (!m) break;
    killMob(m);
    G.mobs = G.mobs.filter(x => x !== m);
  }
};
async function clearMap(p) {
  await p.evaluate(CLEAR);
  await p.evaluate(() => {
    G.drops = [];
    P.x = G.portal.x;
    P.y = G.portal.y;
  });
  await p.waitForFunction(() => G.state === 'portal');
}
/* 點地圖上的節點（真的點 canvas） */
async function tapNode(p, k) {
  await p.evaluate(k => {
    wmCenter(k);
  }, k);
  await p.waitForTimeout(80);
  const pos = await p.evaluate(k => {
    const n = WM.nodes.find(x => x.k === k),
      [x, y] = wmS(n.x, n.y),
      r = WM.cv.getBoundingClientRect();
    return [x + r.left, y + r.top];
  }, k);
  await p.mouse.click(pos[0], pos[1]);
  await p.waitForTimeout(60);
}
async function flow(b) {
  const p = await open(b);
  /* 序章第 8 步：走到地圖台按 F */
  await p.evaluate(() => {
    introStop();
    S.story.intro = PRO_VER;
    proStart();
    proHome();
    S.story.proS = 7;
    PRO.st = {};
    proStep(8);
    const d = HIDE_ART.props.find(x => x.k === 'device');
    P.x = d.x;
    P.y = d.y + 60;
  });
  await p.waitForTimeout(300);
  await p.keyboard.press('f');
  await p.waitForFunction(() => PANEL.device);
  ok(
    '序章第 8 步：打開世界地圖，序章結束',
    await p.evaluate(() => !PRO.on && !$('pdev').hidden && WM.sel === '0,0' && TALK.on)
  );
  await p.waitForTimeout(600);
  await p.screenshot({ path: shot('story') });
  await talkAll(p);
  ok('對話放完，第一次不再播', await p.evaluate(() => !TALK.on && S.story.st_0 === 1));
  /* 第一個節點：開傳送門、走進去 */
  await p.click('#pdev .btn.pri');
  ok('開傳送門：地圖關掉、傳送門在地圖台前面', await p.evaluate(() => !PANEL.device && !!G.portal && S.node === '0,0'));
  await p.evaluate(() => {
    P.x = G.portal.x;
    P.y = G.portal.y;
  });
  await p.waitForTimeout(200);
  await p.keyboard.press('f');
  await p.waitForFunction(() => G.scene === 'map');
  ok(
    '走進傳送門：節點等級換成內部難度',
    await p.evaluate(() => G.node === '0,0' && mobLv(G.mapT) === 5 && G.nodeN === '地層出口' && !S.card)
  );
  /* 劇情區走完 */
  const lvs = [];
  for (let i = 0; i < 9; i++) {
    await clearMap(p);
    lvs.push(await p.evaluate(() => S.lv));
    ok(
      `劇情第 ${i + 1} 個節點：打倒王才算走過`,
      await p.evaluate(i => S.world.stage === i + 1 && S.world.done.includes(wKey(STORY[i].q, STORY[i].r)), i)
    );
    if (i === 8) break;
    await p.click('[data-a=pickmap]');
    await p.waitForFunction(() => PANEL.device);
    await p.waitForTimeout(60);
    await talkAll(p);
    ok(
      `地圖自動選到下一個節點（${i + 2}）`,
      await p.evaluate(i => WM.sel === wKey(STORY[i + 1].q, STORY[i + 1].r) && WM.goal === WM.sel, i)
    );
    await p.click('#pdev .btn.pri');
    await p.waitForFunction(() => G.scene === 'map' && !PANEL.device && G.state === 'play');
  }
  console.log('   打完每張圖的等級', lvs.join(' '));
  ok('打完劇情區：最少路線也有 Lv19 以上', lvs[8] >= 19 && lvs[8] <= 22, lvs.join());
  ok('血霧山道解鎖赤鴉與血霧', await p.evaluate(() => S.story.crow === 1 && S.hunt.v === HUNT.gain));
  /* 世界展開 */
  await p.click('[data-a=home]');
  await p.waitForFunction(() => PANEL.device);
  ok(
    '回藏身處自動播世界展開',
    await p.evaluate(() => !!WM.anim && !$('wmcap').hidden && S.world.open === 1 && WM.wipe < 1)
  );
  await p.waitForTimeout(1200);
  await p.screenshot({ path: shot('reveal') });
  await p.waitForFunction(() => !WM.anim, { timeout: 8000 });
  ok('演出結束：迷霧散開、看得到走得到的節點', await p.evaluate(() => WM.wipe === 1 && WM.nodes.some(n => n.can)));
  await p.waitForTimeout(1600);
  await p.screenshot({ path: shot('world') });
  /* 世界區：點一個走得到的節點 */
  const k1 = await p.evaluate(() => {
    const L = WM.nodes.filter(n => n.can && n.t !== 'rift');
    return (L.find(n => n.t === 'plain') || L[0]).k;
  });
  await tapNode(p, k1);
  ok(
    '點節點：面板出現 3 張卡',
    await p.evaluate(k => WM.sel === k && document.querySelectorAll('#pdev .mc2').length === 3, k1)
  );
  /* 洗卡：只洗這個節點，每洗一次加倍 */
  await p.evaluate(() => {
    S.frag = 40;
    wmPanel();
  });
  const w = await p.evaluate(k => {
    const a = JSON.stringify(wCards(S, k).c),
      f0 = S.frag;
    document.querySelector('[data-wm=wash]').click();
    const f1 = S.frag;
    document.querySelector('[data-wm=wash]').click();
    return [a !== JSON.stringify(wCards(S, k).c), f0 - f1, f1 - S.frag, wCards(S, k).w];
  }, k1);
  ok('洗卡：換新批、費用 1 → 2、記次數', w[0] && w[1] === 1 && w[2] === 2 && w[3] === 2, w.join());
  /* 第二張卡 */
  await p.click('#pdev .mc2:nth-child(2)');
  ok('選第二張卡', await p.evaluate(() => PANEL.card === 1 && !!document.querySelector('.mc2.on:nth-child(2)')));
  await p.evaluate(() => (wCards(S, WM.sel).c[1] = rollCard(1)));
  await p.click('#pdev .btn.pri');
  await p.evaluate(() => {
    P.x = G.portal.x;
    P.y = G.portal.y;
  });
  await p.waitForTimeout(150);
  await p.keyboard.press('f');
  await p.waitForFunction(() => G.scene === 'map');
  /* 死亡：不算走過，卡換新批 */
  const fail = await p.evaluate(k => {
    hurtPlayer(1e9, null, 'phys');
    if (G.state !== 'dead') die();
    return [G.state, S.world.done.includes(k), !!S.cards[k]];
  }, k1);
  ok('死亡：不算走過、這批卡用掉了', fail[0] === 'dead' && !fail[1] && !fail[2], fail.join());
  await p.click('[data-a=home]');
  await p.evaluate(() => openPanel('device'));
  await p.waitForTimeout(100);
  await tapNode(p, k1);
  ok('失敗的節點可以重打', await p.evaluate(k => wCan(S, ...wXY(k)) && wWhy(S, ...wXY(k)) === '', k1));
  /* 血霧滿了 */
  const bl = await p.evaluate(() => {
    S.hunt.v = 80;
    const n = WM.nodes.find(x => x.can && x.t === 'blood');
    if (n) return n.k;
    /* 這個種子第 4 圈沒有血霧：往外走到有為止 */
    for (let i = 0; i < 40; i++) {
      const c = wList(S)
        .map(wXY)
        .find(([q, r]) => wCan(S, q, r) && wType(S, q, r) === 'blood');
      if (c) return wKey(...c);
      const o = wList(S)
        .map(wXY)
        .find(([q, r]) => wCan(S, q, r) && wType(S, q, r) !== 'rift');
      wClear(S, wKey(...o));
    }
  });
  await p.evaluate(() => wmNodes());
  await tapNode(p, bl);
  await p.evaluate(() => {
    S.frag = 99;
    wmPanel();
  });
  await p.click('#pdev .btn.pri');
  await p.evaluate(() => {
    P.x = G.portal.x;
    P.y = G.portal.y;
    interact();
  });
  await p.waitForFunction(() => G.scene === 'map');
  await clearMap(p);
  ok('血霧節點：累積到 100%、進入血霧期', await p.evaluate(() => S.hunt.v === 100 && S.hunt.full === 1));
  /* 裂口王：路接到裂口旁邊 */
  const rk = await p.evaluate(() => {
    const k = Object.keys(wRifts(S.world.seed)).sort((a, b) => wRing(...wXY(a)) - wRing(...wXY(b)))[0];
    let [q, r] = wNear(S.world.seed, ...wXY(k)).find(([x, y]) => wRing(x, y) < wRing(...wXY(k)));
    while (wRing(q, r) > W_ROAD) {
      if (!wDone(S).has(wKey(q, r))) S.world.done.push(wKey(q, r));
      [q, r] = wInner(S.world.seed, q, r);
    }
    if (!wDone(S).has(wKey(q, r))) S.world.done.push(wKey(q, r));
    S.world.done.push(
      ...wNear(S.world.seed, ...wXY(k))
        .filter(([x, y]) => wRing(x, y) < wRing(...wXY(k)))
        .map(a => wKey(...a))
    );
    return k;
  });
  await p.click('[data-a=pickmap]');
  await p.waitForFunction(() => PANEL.device);
  await p.evaluate(() => wmNodes());
  await tapNode(p, rk);
  await p.waitForTimeout(100);
  await p.screenshot({ path: shot('rift') });
  ok('裂口：面板寫墮落詞', await p.evaluate(() => /墮落詞/.test($('wms').textContent)));
  await p.evaluate(() => (wCards(S, WM.sel).c[0] = rollCard(1)));
  await p.click('#pdev .btn.pri');
  await p.waitForFunction(() => G.scene === 'map' && G.state === 'play');
  ok(
    '裂口：血霧扣 25%，王是生肖、帶墮落詞',
    await p.evaluate(
      () => S.hunt.v === 75 && !!G.zod && !!G.mm && Object.keys(MAPMOD[G.zod.cor].fx).every(f => G.mm[f])
    )
  );
  const n0 = await p.evaluate(() => G.zod.n);
  const drops = await p.evaluate(() => {
    for (let k = 0; k < 2000 && !G.bossOut; k++) {
      const m = G.mobs.find(x => x.hp > 0);
      killMob(m);
      G.mobs = G.mobs.filter(x => x !== m);
    }
    const b = G.mobs.find(x => x.boss);
    b.cd = 9;
    P.x = b.x - 150;
    P.y = b.y;
    return [b.D.n, b.D.sp];
  });
  await p.waitForTimeout(200);
  await p.screenshot({ path: shot('riftboss') });
  drops.push(
    await p.evaluate(() => {
      killMob(G.mobs.find(x => x.boss));
      return G.drops.filter(d => d.it && d.it.mem && d.it.r === 2).length;
    })
  );
  ok('裂口王：用生肖的名字與圖', drops[0] === n0 && /^z_/.test(drops[1]), drops.join());
  ok('裂口王：掉落有保底追憶裝（取代原本的品質 30% 稀有裝）', drops[2] >= 1, drops.join());
  ok(
    '打完裂口：點亮神像、走過、這次血霧不開第二道',
    await p.evaluate(k => {
      const o = Object.keys(wRifts(S.world.seed)).find(x => x !== k);
      return (
        S.idols.length === 1 &&
        S.world.done.includes(k) &&
        S.hunt.used === 1 &&
        wWhy(S, ...wXY(k)) === '已經走過' &&
        !!o
      );
    }, rk)
  );
  await p.screenshot({ path: shot('riftwin') });
  /* 回家：赤鴉出現、神像亮 */
  await p.evaluate(() => {
    G.drops = [];
    P.x = G.portal.x;
    P.y = G.portal.y;
  });
  await p.waitForFunction(() => G.state === 'portal');
  await p.click('[data-a=home]');
  await p.waitForFunction(() => G.scene === 'hide');
  ok('藏身處：赤鴉在、神像亮', await p.evaluate(() => G.npcs.some(n => n.id === 'crow') && S.idols.length === 1));
  /* 主線面板 */
  await p.evaluate(() => openPanel('device'));
  await p.waitForTimeout(100);
  await p.click('#wmr');
  ok(
    '主線面板：生肖 1／12、三條鎖定',
    await p.evaluate(
      () => /生肖 1／12/.test($('wms').textContent) && document.querySelectorAll('.wm-q .lock').length === 3
    )
  );
  await p.waitForTimeout(100);
  await p.screenshot({ path: shot('quest') });
  /* 存檔還原 */
  const fp = await p.evaluate(() => {
    save();
    return JSON.stringify([S.world, S.hunt, S.idols, S.cards]);
  });
  await p.reload();
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof treeInit === 'function');
  await p.waitForTimeout(500);
  ok(
    '重新整理：世界、血霧、神像都還在',
    fp === (await p.evaluate(() => JSON.stringify([S.world, S.hunt, S.idols, S.cards])))
  );
  ok('沒有頁面錯誤', !p.errs.length, p.errs[0]);
  await p.context().close();
}
async function gesture(b) {
  const p = await open(b);
  await p.evaluate(() => {
    proSkip();
    S.world.seed = 4242;
    S.world.done = STORY.map(n => wKey(n.q, n.r));
    S.world.stage = STORY.length;
    S.world.open = 1;
    S.world.at = '3,-1';
    S.story.st_0 = 1;
    openPanel('device');
  });
  await p.waitForTimeout(200);
  const v = () => p.evaluate(() => [WM.x, WM.y, WM.z]);
  const r = await p.evaluate(() => {
    const b = WM.cv.getBoundingClientRect();
    return [b.left + b.width / 2, b.top + b.height / 2];
  });
  const a0 = await v();
  await p.mouse.move(r[0], r[1]);
  await p.mouse.down();
  await p.mouse.move(r[0] - 100, r[1] - 50, { steps: 8 });
  const a1 = await v();
  ok('拖曳跟手', Math.abs(a1[0] - a0[0] - 100 / a0[2]) < 2 && Math.abs(a1[1] - a0[1] - 50 / a0[2]) < 2, a1.join());
  await p.waitForTimeout(250);
  await p.mouse.up();
  await p.waitForTimeout(50);
  const a2 = await v();
  ok('放開時沒有在動就不滑', Math.abs(a2[0] - a1[0]) < 3, a2.join());
  await p.mouse.wheel(0, -200);
  await p.waitForTimeout(80);
  ok('滾輪放大', (await v())[2] > a2[2]);
  /* 甩一下：有慣性、再按一下就停 */
  await p.mouse.move(r[0], r[1]);
  await p.mouse.down();
  await p.mouse.move(r[0] + 160, r[1], { steps: 4 });
  await p.mouse.up();
  await p.waitForTimeout(40);
  const a3 = await p.evaluate(() => WM.vx);
  await p.mouse.move(r[0], r[1]);
  await p.mouse.down();
  ok('甩動有慣性、按住就停', a3 !== 0 && (await p.evaluate(() => WM.vx === 0)), String(a3));
  await p.mouse.up();
  /* 拖到邊界外會彈回來 */
  await p.evaluate(() => {
    WM.x = 9000;
    WM.y = 0;
  });
  await p.waitForTimeout(1200);
  ok('拖出邊界會彈回來', await p.evaluate(() => Math.hypot(WM.x, WM.y) <= wmBound() + 1));
  ok('沒有頁面錯誤', !p.errs.length, p.errs[0]);
  await p.context().close();
  /* 手機：單指拖、雙指縮放（CDP 送真的觸控事件） */
  const q = await open(b, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await q.evaluate(() => {
    proSkip();
    S.story.st_0 = 1;
    S.orient = 'p';
    applyOrient();
    openPanel('device');
  });
  await q.waitForTimeout(200);
  const c = await q.context().newCDPSession(q),
    t = (type, pts) =>
      c.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  const s0 = await q.evaluate(() => [WM.x, WM.y, WM.z]);
  await t('touchStart', [[200, 200]]);
  for (let i = 1; i <= 6; i++) await t('touchMove', [[200 - i * 10, 200 - i * 5]]);
  await q.waitForTimeout(260);
  await t('touchMove', [[140, 170]]);
  await t('touchEnd', []);
  await q.waitForTimeout(60);
  const s1 = await q.evaluate(() => [WM.x, WM.y, WM.z]);
  ok('手機：單指拖', s1[0] > s0[0] + 20 && s1[2] === s0[2], s1.join());
  await t('touchStart', [
    [150, 220],
    [240, 220]
  ]);
  for (let i = 1; i <= 8; i++)
    await t('touchMove', [
      [150 - i * 8, 220],
      [240 + i * 8, 220]
    ]);
  await t('touchEnd', []);
  await q.waitForTimeout(60);
  ok('手機：雙指放大', (await q.evaluate(() => WM.z)) > s1[2] * 1.3, String(await q.evaluate(() => WM.z)));
  /* 點一下選節點 */
  const pos = await q.evaluate(() => {
    wmCenter('0,0');
    return null;
  });
  await q.waitForTimeout(80);
  const nn = await q.evaluate(() => {
    const [x, y] = wmS(WM.nodes[0].x, WM.nodes[0].y);
    return [x, y];
  });
  await q.touchscreen.tap(nn[0], nn[1]);
  await q.waitForTimeout(60);
  ok('手機：點一下選節點', await q.evaluate(() => WM.sel === WM.nodes[0].k), String(pos));
  ok('手機沒有頁面錯誤', !q.errs.length, q.errs[0]);
  await q.context().close();
}
/* 減少動態：世界展開直接切、字幕還在 */
async function still(b) {
  const p = await open(b, { reducedMotion: 'reduce' });
  const r = await p.evaluate(() => {
    proSkip();
    S.world.done = STORY.map(n => wKey(n.q, n.r));
    S.world.stage = STORY.length;
    S.world.open = 0;
    openPanel('device');
    return !$('wmcap').hidden;
  });
  await p.waitForTimeout(300);
  ok('減少動態：演出直接到終點、字幕還在', r && (await p.evaluate(() => WM.wipe === 1 && !WM.anim && WM.vx === 0)));
  ok('沒有頁面錯誤', !p.errs.length, p.errs[0]);
  await p.context().close();
}
/* 效能：手機尺寸、CPU 降速 4 倍，量拖曳時的幀時間與區塊烘圖 */
async function perf(b) {
  for (const [w, h, name] of [
    [390, 844, '手機直立'],
    [844, 390, '手機橫向'],
    [1440, 900, '桌機']
  ]) {
    const touch = w < 900;
    const p = await open(b, { viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
    const c = await p.context().newCDPSession(p);
    await p.evaluate(() => {
      proSkip();
      S.world.seed = 4242;
      S.world.done = STORY.map(n => wKey(n.q, n.r));
      S.world.stage = STORY.length;
      S.world.open = 1;
      S.world.at = '3,-1';
      S.story.st_0 = 1;
      openPanel('device');
    });
    if (touch) await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const r = await p.evaluate(
      () =>
        new Promise(done => {
          /* 8 秒：前 6 秒往外平移再拉遠（一直烘新區塊），後 2 秒閒置 */
          const T = [],
            B = [],
            bake0 = wmBake;
          wmBake = (c, u) => {
            const t = performance.now(),
              r = bake0(c, u);
            B.push(performance.now() - t);
            return r;
          };
          const fr0 = wmFrame;
          let last = performance.now(),
            t0 = last,
            idle = [];
          wmFrame = (now, dt) => {
            const a = performance.now();
            fr0(now, dt);
            const e = performance.now() - a,
              t = (a - t0) / 1000;
            if (t < 6) {
              WM.x += 7;
              WM.y -= 3;
              WM.z = t > 3 ? 0.46 : 1;
              WM.dirty = true;
              T.push(e);
            } else idle.push(e);
            if (t > 8) {
              const S2 = L => [...L].sort((x, y) => x - y),
                q = (L, f) => S2(L)[Math.floor(L.length * f)] || 0;
              done({
                frames: T.length,
                fps: +(T.length / 6).toFixed(1),
                p50: +q(T, 0.5).toFixed(1),
                p95: +q(T, 0.95).toFixed(1),
                max: +Math.max(...T).toFixed(1),
                idle50: +q(idle, 0.5).toFixed(1),
                idleFps: +(idle.length / (t - 6)).toFixed(1),
                bakeMax: +Math.max(...B).toFixed(1),
                chunks: WM.ch.size,
                cap: wmCap()
              });
            }
          };
        })
    );
    console.log(`   ${name}${touch ? '（CPU 降速 4 倍）' : ''}`, JSON.stringify(r));
    ok(`${name}：快取不超過上限`, r.chunks <= r.cap, String(r.chunks));
    ok(`${name}：拖曳的幀時間 p95 < 33 毫秒`, r.p95 < 33, String(r.p95));
    ok(`${name}：單次烘圖不卡（< 16 毫秒）`, r.bakeMax < 16 * (touch ? 2 : 1), String(r.bakeMax));
    if (touch) await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await p.context().close();
  }
}
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  if (!ONLY || ONLY === 'flow') await flow(b);
  if (!ONLY || ONLY === 'gesture') await gesture(b);
  if (!ONLY || ONLY === 'still') await still(b);
  if (!ONLY || ONLY === 'perf') await perf(b);
  await b.close();
  console.log(bad ? `❌ ${bad} 項沒過` : '世界地圖實測全部通過');
  process.exit(bad ? 1 : 0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
