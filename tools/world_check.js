const { chromium } = require('playwright');
/* 世界地圖實測（Playwright，0.4.0 固定節點＋連續刷）：選節點 → 打倒王 → 同一個場地下一輪、往下推 → 世界展開 → 選星級 → 死亡重來、連死退回 → 再推一次 → 倉庫滿 → 特殊節點 → 存檔還原；
   手勢（拖曳、滾輪、單指、雙指）、減少動態、手機降速 4 倍的效能。序章前 7 步在 pro_check.js 走。
   用法：先在 dpoe/ 開本機伺服器，再 node tools/world_check.js [網址] [flow|auto|patrol|gesture|still|perf]（預設全跑）。
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
  /* 手動的流程在 S.auto = 0 下跑；自動的流程（auto）自己再打開 */
  await p.evaluate(() => (S.auto = 0));
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
/* 等一個條件成立（每 200 毫秒看一次） */
const until = async (p, f, ms = 15000, arg) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await p.evaluate(f, arg)) return true;
    await p.waitForTimeout(200);
  }
  return false;
};
/* 0.4.0 手動流程：世界地圖選節點 → 打倒王 → 2 秒後同一個場地下一輪（自動往下推）→ 劇情區打完世界展開 → 選星級 →
   死了原地重來、連死 3 次退回 → 再推一次 → 倉庫滿了換金幣 → 特殊節點等級門檻 → 存檔還原 */
async function flow(b) {
  const p = await open(b);
  await p.evaluate(() => {
    proSkip();
    S.story.tips = 0;
    openPanel('device');
  });
  await talkAll(p);
  ok('世界地圖：一開始選中第一個節點', await p.evaluate(() => WM.sel === TRUNK_K[0] && wList(S).length === 1));
  await p.click('#pdev [data-a=open]');
  ok(
    '在這裡刷：直接進場地（不用傳送門）、第 1 輪',
    await until(p, () => G.scene === 'map' && G.node === TRUNK_K[0] && G.round === 1 && !PANEL.device)
  );
  await p.evaluate(CLEAR);
  const r1 = await p.evaluate(() => ({ next: G.nextT > 0, portal: !!G.portal, done: S.world.done.slice() }));
  ok('打倒王：記走過、沒有傳送門、排好下一輪', r1.next && !r1.portal && r1.done[0] === '0,0', JSON.stringify(r1));
  ok(
    '2 秒後自動往下推到下一個節點（新的一輪）',
    await until(p, () => G.node === TRUNK_K[1] && G.round === 1 && G.scene === 'map', 6000),
    JSON.stringify(await p.evaluate(() => [G.node, G.round]))
  );
  /* 留在這個點：同一個場地下一輪，輪數 +1、場景外觀不變 */
  const bio = await p.evaluate(() => {
    S.push = 'stay';
    return G.biome;
  });
  await p.evaluate(CLEAR);
  ok(
    '推進設定「留在這個點」：同一個節點、同一個場地，第 2 輪',
    (await until(p, () => G.node === TRUNK_K[1] && G.round === 2, 6000)) && (await p.evaluate(b => G.biome === b, bio))
  );
  /* 劇情區剩下的打完：世界展開（打開地圖播演出） */
  await p.evaluate(() => (S.push = 'auto'));
  for (let i = 0; i < 8 && !(await p.evaluate(() => wOpen(S))); i++) {
    await p.evaluate(CLEAR);
    await until(p, () => !G.nextT || PANEL.device, 6000);
  }
  ok('劇情區打完：世界展開（打開地圖播演出）', await until(p, () => wOpen(S) && PANEL.device && S.world.open, 8000));
  await p.evaluate(() => {
    WM.anim = null;
    closePanels();
  });
  ok('世界展開後往下推到主幹 Lv23', await until(p, () => G.node === TRUNK_K[9], 8000));
  /* 選星級：打過的節點可以一直刷 */
  await p.evaluate(() => {
    openPanel('device');
    wmSel(TRUNK_K[9]);
  });
  await p.click('#pdev [data-wm="star:4"]');
  await p.click('#pdev [data-a=open]');
  const st = await p.evaluate(() => ({ star: G.star, n: G.card.mods.length, hold: S.world.hold, node: G.node }));
  ok(
    '選 4★：這一輪 10～12 條地圖詞；選的是最前面的節點不會被留住',
    st.star === 4 && st.n >= 10 && st.n <= 12 && st.hold === 0,
    JSON.stringify(st)
  );
  /* 死亡：原地重來；連死 3 次退回上一個節點、留著（hold）、有通知、HUD 有「再推一次」 */
  const dead = async () => {
    await p.evaluate(() => die());
    await until(p, () => !$('over').hidden && G.state === 'dead');
    const t = await p.evaluate(() => $('over').textContent);
    await p.click('#over [data-a=again]');
    return t;
  };
  const t1 = await dead();
  ok(
    '死亡卡寫出這一輪的地圖詞；再試一次＝同一個節點重來',
    /這一輪的地圖詞/.test(t1) && (await until(p, () => G.state === 'play' && G.node === TRUNK_K[9]))
  );
  await dead();
  await dead();
  const K = await p.evaluate(() => TRUNK_K);
  const rb = await p.evaluate(() => ({
    node: G.node,
    hold: S.world.hold,
    note: S.world.note,
    run: $('run').textContent
  }));
  ok(
    '連死 3 次：退回上一個節點、留在那裡、HUD 有通知與「再推一次」',
    rb.node === K[8] && rb.hold === 1 && /連死 3 次/.test(rb.note) && /再推一次/.test(rb.run),
    JSON.stringify(rb)
  );
  await p.evaluate(CLEAR);
  ok('留住的時候打倒王不往下推', await until(p, () => G.node === TRUNK_K[8] && G.round === 2, 6000));
  await p.click('#run [data-a=push]');
  ok('再推一次：回到下一個節點', await until(p, () => G.node === TRUNK_K[9] && !S.world.hold));
  /* 倉庫滿了：普通裝換金幣、★ 照樣收 */
  const full = await p.evaluate(() => {
    S.inv.items = Array.from({ length: INV_CAP }, () => mkItem('c_leather', 10, 0));
    const g0 = S.gold,
      a = { x: P.x, y: P.y, it: mkItem('c_leather', 10, 2) },
      s = { x: P.x, y: P.y, it: Object.assign(mkItem('c_leather', 10, 2), { frac: 'life' }) };
    G.drops.push(a, s);
    pickup(a);
    pickup(s);
    const r = [S.gold > g0, S.inv.items.length, S.inv.items.includes(s.it)];
    S.inv.items = [];
    return r;
  });
  ok('倉庫滿了：普通裝換成金幣、★ 照樣收（多留的格子）', full[0] && full[1] === 3001 && full[2], JSON.stringify(full));
  /* 特殊節點：要角色等級 */
  const sp = await p.evaluate(() => {
    S.world.done = TRUNK_K.slice(0, 12);
    const g = SPECIAL[0];
    S.lv = 34;
    const a = wWhy(S, g.q, g.r);
    S.lv = 35;
    runNode(wKey(g.q, g.r));
    return [a, G.node === wKey(g.q, g.r), !!(G.fdB && FENG.elites.includes(G.fdB.fd))];
  });
  ok('鬼門關：角色 Lv35 才開、王是四隻菁英王之一', sp[0] === '角色等級需達 35' && sp[1] && sp[2], JSON.stringify(sp));
  /* 回藏身處：刷圖暫停，HUD 有「繼續刷」 */
  await p.evaluate(() => act('home'));
  ok(
    '回藏身處：HUD 有「繼續刷」，按了回到原本的節點',
    await until(p, () => G.scene === 'hide' && /繼續刷/.test($('run').textContent))
  );
  await p.click('#run [data-a=resume]');
  ok('繼續刷', await until(p, () => G.scene === 'map' && G.node === S.world.cur));
  /* 存檔還原 */
  const before = await p.evaluate(() => (save(), JSON.stringify([S.world.done, S.world.cur, S.push, S.v])));
  await p.reload();
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene);
  ok(
    '存檔還原：走過的、在刷的、推進設定',
    (await p.evaluate(() => JSON.stringify([S.world.done, S.world.cur, S.push, S.v]))) === before
  );
  ok('沒有頁面錯誤', !p.errs.length, p.errs.join('|'));
  await p.context().close();
}
async function gesture(b) {
  const p = await open(b);
  await p.evaluate(() => {
    proSkip();
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
/* 掛機（0.4.0）：不碰鍵盤，AI 打倒王 → 同一個場地下一輪（自動往下推）、撿到的進倉庫；踩到怪物方的地面往外走；
   倒下 1.5 秒後原地重來，同一個節點連死 3 次退回上一個 */
async function auto(b) {
  const p = await open(b);
  await p.evaluate(() => {
    introStop();
    proSkip();
    S.story.tips = 0;
    S.lv = 50; /* 測的是循環不是平衡 */
    ST = stats();
    S.auto = 1;
    runNode(TRUNK_K[0]);
  });
  const K = await p.evaluate(() => TRUNK_K),
    t0 = Date.now();
  let r = null;
  while (Date.now() - t0 < 330000) {
    await p.waitForTimeout(2000);
    r = await p.evaluate(() => ({ done: S.world.done.length, node: G.node, scene: G.scene, inv: S.inv.items.length }));
    if (r.done >= 1 && r.scene === 'map' && r.node && r.node !== '0,0') break;
  }
  console.log('   ', JSON.stringify(r));
  ok(
    'AI：不碰鍵盤打倒王、2 秒後往下推到下一個節點（不回家）',
    r && r.done >= 1 && r.scene === 'map' && r.node === K[1],
    JSON.stringify(r)
  );
  ok('AI 打到的裝備直接進倉庫', r && r.inv >= 1, JSON.stringify(r));
  const gz = await p.evaluate(async () => {
    await new Promise(r => setTimeout(r, 300));
    addGround({ k: 'smoke', side: 'm', x: P.x, y: P.y, r: 2 * METER, dur: 6 });
    await new Promise(r => setTimeout(r, 2000));
    const g = G.ground.find(x => x.side === 'm');
    return !g || !onGround(g);
  });
  ok('AI：踩到怪物方的地面就往外走', gz);
  /* 連死：AI 自己按重來，第 3 次退回 */
  const k0 = await p.evaluate(() => G.node);
  for (let i = 0; i < 3; i++) {
    await p.evaluate(() => die());
    await until(p, () => G.state === 'play' && G.t < 1, 6000);
  }
  const rb = await p.evaluate(() => ({ node: G.node, hold: S.world.hold, scene: G.scene }));
  ok(
    'AI：倒下自己重來，連死 3 次退回上一個節點繼續刷',
    rb.node === K[0] && rb.hold === 1 && rb.scene === 'map' && k0 === K[1],
    JSON.stringify(rb)
  );
  ok('沒有頁面錯誤', !p.errs.length, p.errs.join('|'));
  await p.context().close();
}
/* 連續推進（0.4.0，取代 0.3.0 的巡邏）：AI 加速打（每 1.5 秒清場），從劇情區一路推到世界展開、再往下推主幹 */
async function patrol(b) {
  const p = await open(b);
  await p.evaluate(() => {
    introStop();
    proSkip();
    S.story.tips = 0;
    S.lv = 30;
    ST = stats();
    S.auto = 1;
    S.filter.cur = 1;
    window.__fast = setInterval(() => {
      if (G.scene !== 'map' || G.state !== 'play' || G.nextT) return;
      for (let k = 0; k < 2000; k++) {
        const bo = G.mobs.find(x => x.boss && x.hp > 0),
          m = G.mobs.find(x => x.hp > 0 && !x.boss);
        if (bo) return killMob(bo);
        if (!m) return;
        killMob(m);
        G.mobs = G.mobs.filter(x => x !== m);
      }
    }, 1500);
    S.world.stage = 7;
    S.world.done = TRUNK_K.slice(0, 7);
    runNode(TRUNK_K[7]);
  });
  ok('劇情區：AI 一路推到世界展開（打開地圖面板播演出）', await until(p, () => wOpen(S) && PANEL.device, 60000));
  await p.evaluate(() => {
    WM.anim = null;
    closePanels();
  });
  ok(
    '世界展開後接著往下推主幹（不停）',
    await until(p, () => wFront(S) >= 11 && G.scene === 'map', 90000),
    JSON.stringify(await p.evaluate(() => [wFront(S), G.node, G.scene]))
  );
  await p.evaluate(() => clearInterval(window.__fast));
  ok('沒有頁面錯誤', !p.errs.length, p.errs.join('|'));
  await p.context().close();
}
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  if (!ONLY || ONLY === 'flow') await flow(b);
  if (!ONLY || ONLY === 'auto') await auto(b);
  if (!ONLY || ONLY === 'patrol') await patrol(b);
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
