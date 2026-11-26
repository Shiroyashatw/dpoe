const { chromium } = require('playwright');
/* 世界地圖實測（Playwright，0.4.0 固定節點＋連續刷）：選節點 → 打倒王 → 同一個場地下一輪、往下推 → 世界展開 → 選星級 → 死亡重來、連死退回 → 再推一次 → 倉庫滿 → 特殊節點 → 存檔還原；
   手勢（拖曳、滾輪、單指、雙指）、減少動態、手機降速 4 倍的效能。序章前 7 步在 pro_check.js 走。
   用法：先在 dpoe/ 開本機伺服器，再 node tools/world_check.js [網址] [flow|auto|patrol|ses|floor|gesture|still|perf]（預設全跑）。
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
    openPanel('node');
  });
  ok(
    '地點清單（M2-07）：全部地點都列出（面板捲動），第 1 個能刷、下一個「升瞭望台 Lv 1 就開」點了去營地、其餘鎖著的都寫條件，沒有「還有 N 個地點」「打過」「還沒打」「材料 T」',
    await p.evaluate(() => {
      const L = [...document.querySelectorAll('#pnode .ndr')],
        t = $('pnode').textContent;
      return (
        L.length === W_ALL.length &&
        L[0].dataset.a === 'ngo:' + TRUNK_K[0] &&
        /升瞭望台 Lv 1 就開/.test(L[1].textContent) &&
        L[1].dataset.tm === 'nav:craft' &&
        L.slice(2).every(e => e.closest('li').classList.contains('lock') && /才開|需達|需要/.test(e.textContent)) &&
        !/還有 \d+ 個地點/.test(t) &&
        !/打過|還沒打|材料 T/.test(t)
      );
    })
  );
  ok(
    '地點清單（M2-07）：清單比面板高時面板可以捲到最後一個',
    await p.evaluate(() => {
      const P = $('pnode'),
        L = P.querySelectorAll('.ndr');
      P.scrollTop = P.scrollHeight;
      const a = L[L.length - 1].getBoundingClientRect(),
        b = P.getBoundingClientRect();
      return P.scrollHeight > P.clientHeight && a.bottom <= b.bottom + 1 && a.top >= b.top;
    })
  );
  await p.evaluate(() => ($('pnode').scrollTop = 0));
  await p.click(`#pnode [data-a="ngo:${await p.evaluate(() => TRUNK_K[0])}"]`);
  ok(
    '在這裡刷：直接進場地（不用傳送門）、第 1 輪',
    await until(p, () => G.scene === 'map' && G.node === TRUNK_K[0] && G.round === 1 && !PANEL.device)
  );
  await p.evaluate(CLEAR);
  const r1 = await p.evaluate(() => ({ next: G.nextT > 0, portal: !!G.portal, done: S.world.done.slice() }));
  ok('打倒王：記走過、沒有傳送門、排好下一輪', r1.next && !r1.portal && r1.done[0] === '0,0', JSON.stringify(r1));
  /* 0.5.1：打倒王不推進，同一個節點、同一個場地下一輪；推進＝升瞭望台 */
  const bio = await p.evaluate(() => G.biome);
  ok(
    '2 秒後同一個節點、同一個場地第 2 輪（0.5.1 打倒王不推進）',
    (await until(p, () => G.node === TRUNK_K[0] && G.round === 2 && G.scene === 'map', 6000)) &&
      (await p.evaluate(b => G.biome === b, bio)),
    JSON.stringify(await p.evaluate(() => [G.node, G.round]))
  );
  const wt = await p.evaluate(() => {
    const no = wWhy(S, ...wXY(TRUNK_K[1]));
    S.mat.soul = 1e6;
    matAdd('wood', 0, 1e6);
    matAdd('iron', 1, 1e6);
    const up = campUp('watch');
    return [no, up, runNode(TRUNK_K[1]), G.node === TRUNK_K[1]];
  });
  ok(
    '瞭望台 Lv0 第 2 個地點鎖著；升到 Lv1 就去得了',
    /瞭望台 Lv 1/.test(wt[0]) && wt[1] === null && wt[2] && wt[3],
    JSON.stringify(wt)
  );
  /* 劇情區剩下的打完：世界展開（打開地圖播演出） */
  await p.evaluate(() => (S.camp.watch = 21));
  for (let i = 2; i < 9 && !(await p.evaluate(() => wOpen(S))); i++) {
    await p.evaluate(i => runNode(TRUNK_K[i]), i);
    await p.evaluate(CLEAR);
    await until(p, () => !G.nextT || PANEL.device, 6000);
  }
  ok('劇情區打完（0.5.2 沒有世界展開的演出）', await until(p, () => wOpen(S) && !PANEL.device, 8000));
  /* 選星級（0.5.1 全域一個，上限照斥候營）：地點清單上面那一排，再點一列 */
  await p.evaluate(() => {
    S.camp.scout = 4;
    closePanels();
    openPanel('node');
  });
  await p.click('#pnode [data-a="nstar:4"]');
  await p.click(`#pnode [data-a="ngo:${await p.evaluate(() => TRUNK_K[9])}"]`);
  const st = await p.evaluate(() => ({ star: G.star, n: G.card.mods.length, g: S.star, node: G.node }));
  ok(
    '選 4★：這一輪 10～12 條地圖詞、寫進全域的 S.star',
    st.star === 4 && st.n >= 10 && st.n <= 12 && st.g === 4,
    JSON.stringify(st)
  );
  /* 死亡：原地重來；連死 3 次退回上一個節點、留著（hold）、有通知、HUD 有「再推一次」 */
  /* M2-12：自動模式倒下改字板、不出死亡卡；死亡卡（地圖詞、再試一次）在手動模式測，測完切回自動 */
  const a0 = await p.evaluate(() => S.auto);
  await p.evaluate(() => (S.auto = 0));
  const dead = async () => {
    await p.evaluate(() => die());
    await until(p, () => !$('over').hidden && G.state === 'dead');
    const t = await p.evaluate(() => $('over').textContent);
    await p.click('#over [data-a=again]');
    return t;
  };
  const t1 = await dead();
  /* M2-12：畫面不寫「輪」，死亡卡寫「地圖詞：…」 */
  ok(
    '死亡卡寫出這一次的地圖詞（不寫「輪」）；再試一次＝同一個節點重來',
    /地圖詞：/.test(t1) && !/輪/.test(t1) && (await until(p, () => G.state === 'play' && G.node === TRUNK_K[9]))
  );
  await dead();
  await dead();
  const K = await p.evaluate(() => TRUNK_K);
  await until(p, () => /連續倒下 3 次/.test($('run').textContent), 3000);
  const rb = await p.evaluate(() => ({ node: G.node, note: S.world.note, run: $('run').textContent }));
  /* M2-12 D2（製作人定）：維持連死 3 次退回上一個地點繼續刷（不停機、不回營地） */
  ok(
    '連續倒下 3 次：退回上一個節點、HUD 有通知「連續倒下 3 次」（寫換裝、降星級或升營地；沒有「連倒」「連死」）',
    rb.node === K[8] && /連續倒下 3 次/.test(rb.note) && !/連倒|連死/.test(rb.note + rb.run) && /升營地/.test(rb.run),
    JSON.stringify(rb)
  );
  await p.evaluate(a0 => (S.auto = a0), a0);
  await p.evaluate(CLEAR);
  ok('退回之後打倒王照樣留在這裡', await until(p, () => G.node === TRUNK_K[8] && G.round === 2, 6000));
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
  ok(
    '倉庫滿了：普通裝換成金幣、★ 照樣收（多留的格子）',
    full[0] && full[1] === (await p.evaluate(() => INV_CAP)) + 1 && full[2],
    JSON.stringify(full)
  );
  /* 特殊節點：要角色等級 */
  const sp = await p.evaluate(() => {
    S.world.done = TRUNK_K.slice(0, 12);
    S.camp.watch = 26;
    const g = SPECIAL[0];
    S.lv = 34;
    const a = wWhy(S, g.q, g.r);
    S.lv = 35;
    runNode(wKey(g.q, g.r));
    return [a, G.node === wKey(g.q, g.r), !!(G.fdB && FENG.elites.includes(G.fdB.fd))];
  });
  ok('鬼門關：角色 Lv35 才開、王是四隻菁英王之一', sp[0] === '角色等級需達 35' && sp[1] && sp[2], JSON.stringify(sp));
  /* 0.4.2 血霧與裂口：每打完一輪 +5%＋星級%；有血霧之印才進得去裂口，打倒生肖王扣 1 張、點亮神像、回到原本的節點 */
  const hv = await p.evaluate(() => {
    S.story.crow = 1;
    S.hunt.v = 0;
    S.world.done = TRUNK_K.slice(0, 18);
    S.lv = 70;
    S.star = 3;
    runNode(TRUNK_K[12]);
    return 0;
  });
  await p.evaluate(CLEAR);
  ok('血霧：打完一輪 3★ +8%', await until(p, () => S.hunt.v === 8, 6000), String(await p.evaluate(() => S.hunt.v)));
  const rift = await p.evaluate(() => {
    const r = SPECIAL.find(n => n.t === 'rift'),
      k = wKey(r.q, r.r),
      no = wWhy(S, r.q, r.r);
    S.frags.mist = 1;
    runNode(k);
    return { k, no, zod: G.zod && G.zod.z, lv: mobLv(G.mapT) };
  });
  ok(
    '裂口：沒有血霧之印進不去、有就進去打生肖王',
    /血霧之印/.test(rift.no) && rift.zod === 'rat',
    JSON.stringify(rift)
  );
  await p.evaluate(CLEAR);
  await p.evaluate(() => (G.mobs = []));
  ok(
    '裂口：打倒生肖王扣 1 張、點亮神像、回到原本的節點',
    await until(p, () => G.node === TRUNK_K[12] && S.frags.mist === 0 && S.idols.includes('rat'), 6000),
    JSON.stringify(await p.evaluate(() => [G.node, S.frags.mist, S.idols]))
  );
  /* 0.4.2 陰兵借道：每打完一輪怨恨值 +1、王照刑天 → 風伯 → 雨師輪流；死了歸零 */
  const ar = await p.evaluate(() => {
    const a = SPECIAL.find(n => n.t === 'army'),
      k = wKey(a.q, a.r);
    runNode(k);
    return { k, b: G.fdB && G.fdB.army, res: G.army && G.army.res };
  });
  /* Lv65 的怪：清完把剩下的（王叫出來的）也拿掉，免得站著不動的角色在下一輪之前被打死 */
  await p.evaluate(CLEAR);
  await p.evaluate(() => (G.mobs = []));
  ok(
    '陰兵借道：第 1 輪刑天，打完怨恨值 1、第 2 輪換風伯',
    ar.b === 'xing' &&
      ar.res === 0 &&
      (await until(p, () => G.round === 2 && G.army.res === 1 && G.fdB.army === 'feng', 6000)),
    JSON.stringify([ar, await p.evaluate(() => [G.round, G.army && G.army.res, G.fdB && G.fdB.army])])
  );
  await p.evaluate(() => (die(), deadAgain()));
  ok('陰兵借道：死了怨恨值歸零', await p.evaluate(() => G.army.res === 0 && armyRes(S, G.node) === 0));
  /* 回營地：刷圖暫停，HUD 有「繼續刷」 */
  await p.evaluate(() => act('camp'));
  ok(
    '回營地：HUD 有「繼續刷」，按了回到原本的節點',
    await until(p, () => G.scene === 'camp' && /繼續刷/.test($('run').textContent))
  );
  await p.click('#run [data-a=resume]');
  ok('繼續刷', await until(p, () => G.scene === 'map' && G.node === S.world.cur));
  /* 存檔還原 */
  const before = await p.evaluate(
    () => (save(), JSON.stringify([S.world.done, S.world.cur, S.star, CAMP_B.map(b => S.camp[b]), S.v]))
  );
  await p.reload();
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene);
  ok(
    '存檔還原：走過的、在刷的、星級、營地',
    (await p.evaluate(() => JSON.stringify([S.world.done, S.world.cur, S.star, CAMP_B.map(b => S.camp[b]), S.v]))) ===
      before
  );
  ok('沒有頁面錯誤', !p.errs.length, p.errs.join('|'));
  await p.context().close();
}
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
    r = await p.evaluate(() => ({ done: S.world.done.length, node: G.node, scene: G.scene, round: G.round }));
    if (r.done >= 1 && r.scene === 'map' && r.round >= 2) break;
  }
  console.log('   ', JSON.stringify(r));
  ok(
    'AI：不碰鍵盤打倒王、2 秒後在同一個節點再刷一輪（0.5.1 打倒王不推進、不回家）',
    r && r.done >= 1 && r.scene === 'map' && r.node === K[0] && r.round >= 2,
    JSON.stringify(r)
  );
  /* 升瞭望台才去得了第 2 個地點（AI 不會自己去，玩家從地點清單點） */
  const w = await p.evaluate(() => {
    const no = !!wWhy(S, ...wXY(TRUNK_K[1]));
    S.mat.soul = 1e6;
    matAdd('wood', 0, 1e6);
    matAdd('iron', 1, 1e6);
    campUp('watch');
    runNode(TRUNK_K[1]);
    return [no, G.node];
  });
  ok('升瞭望台 → 地點清單去第 2 個地點', w[0] && w[1] === K[1], JSON.stringify(w));
  const gz = await p.evaluate(async () => {
    await new Promise(r => setTimeout(r, 300));
    addGround({ k: 'smoke', side: 'm', x: P.x, y: P.y, r: 2 * METER, dur: 6 });
    await new Promise(r => setTimeout(r, 2000));
    const g = G.ground.find(x => x.side === 'm');
    return !g || !onGround(g);
  });
  ok('AI：踩到怪物方的地面就往外走', gz);
  /* 連死：AI 自己按重來，第 3 次退回（M2-12 D2：照現行規則，不停機、不回營地；掛機時間與保底不歸零） */
  const k0 = await p.evaluate(() => G.node);
  const s0 = await p.evaluate(() => ({ t0: SES && SES.t0, pts: chaseOf().pts }));
  for (let i = 0; i < 3; i++) {
    await p.evaluate(() => die());
    /* 第 3 次倒下那一下字板先講退回哪裡，不出死亡卡、不寫「輪」「重來」 */
    if (i === 2) {
      const pl = await p.evaluate(() => [$('dplate').hidden, $('dplate').textContent, $('over').hidden]);
      ok(
        'AI：第 3 次倒下字板寫「退回{上一個地點}」，沒有死亡卡、沒有「輪」「重來」',
        !pl[0] && /退回/.test(pl[1]) && !/輪|重來/.test(pl[1]) && pl[2],
        pl.join('｜')
      );
    }
    await until(p, () => G.state === 'play' && G.t < 1, 6000);
  }
  const rb = await p.evaluate(() => ({ node: G.node, scene: G.scene, t0: SES && SES.t0, pts: chaseOf().pts }));
  ok(
    'AI：倒下自己重來，連死 3 次退回上一個節點繼續刷',
    rb.node === K[0] && rb.scene === 'map' && k0 === K[1],
    JSON.stringify(rb)
  );
  ok(
    'AI：連死退回不回營地，掛機時間（SES.t0）與保底點數不歸零',
    rb.scene === 'map' && rb.t0 === s0.t0 && rb.t0 > 0 && rb.pts >= s0.pts,
    JSON.stringify([s0, rb])
  );
  ok('沒有頁面錯誤', !p.errs.length, p.errs.join('|'));
  await p.context().close();
}
/* 連續推進（0.5.1）：AI 加速打（每 1.5 秒清場），每打倒一次王就給夠資源「升瞭望台 → 去下一個地點」，一路推到世界展開、再往下推主幹 */
async function patrol(b) {
  const p = await open(b);
  await p.evaluate(() => {
    introStop();
    proSkip();
    S.story.tips = 0;
    S.lv = 30;
    ST = stats();
    S.auto = 1;
    window.__fast = setInterval(() => {
      if (G.scene !== 'map' || G.state !== 'play') return;
      if (G.nextT) {
        S.mat.soul += 1e5;
        matAdd('wood', 0, 1e5);
        matAdd('iron', tierCap(), 1e5);
        if (!campUp('watch')) runNode(TRUNK_K[wFront(S)]);
        return;
      }
      for (let k = 0; k < 2000; k++) {
        const bo = G.mobs.find(x => x.boss && x.hp > 0),
          m = G.mobs.find(x => x.hp > 0 && !x.boss);
        if (bo) return killMob(bo);
        if (!m) return;
        killMob(m);
        G.mobs = G.mobs.filter(x => x !== m);
      }
    }, 1500);
    runNode(TRUNK_K[0]);
  });
  ok('劇情區：升瞭望台一路推到世界展開', await until(p, () => wOpen(S), 90000));
  ok(
    '世界展開後接著升瞭望台往下推主幹',
    await until(p, () => wFront(S) >= 11 && G.node === TRUNK_K[11] && G.scene === 'map', 90000),
    JSON.stringify(await p.evaluate(() => [wFront(S), G.node, G.scene]))
  );
  await p.evaluate(() => clearInterval(window.__fast));
  ok('沒有頁面錯誤', !p.errs.length, p.errs.join('|'));
  await p.context().close();
}
/* B3 回營地補算（名詞表 v0.6.29「掛機 N 分」）：本次掛機（SES：掛機時間 t0、打倒王次數 rounds）換地點、進出營地、試招場都不歸零，
   回戰場補算（打倒王次數只增不減）；只有重開遊戲才歸零 */
async function ses(b) {
  const p = await open(b);
  const st = () => p.evaluate(() => SES && { t0: SES.t0, r: SES.rounds, away: SES.away || 0, scene: G.scene });
  await p.evaluate(() => {
    S.auto = 1;
    runNode(TRUNK_K[0]);
    /* 假裝已經掛了 4 分、打倒王 5 次；補算用的最近幾輪（每輪 20 秒）；回營地走真的 act('camp')（會設 stopWhy） */
    SES.t0 = Date.now() - 4 * 60e3;
    SES.rounds = 5;
    S.rounds = [0, 1, 2].map(() => ({ d: 20, die: 0, xp: 10, gold: 5, nS: 12, nE: 1 }));
  });
  const a = await st();
  const k2 = await p.evaluate(() => {
    S.camp.watch = Math.max(S.camp.watch || 0, 1);
    const k = TRUNK_K[1];
    return !wWhy(S, ...wXY(k)) && runNode(k) && k;
  });
  const b1 = await st();
  ok('①換地點：掛機時間與打倒王次數不歸零', !!k2 && b1.t0 === a.t0 && b1.r === a.r, JSON.stringify([k2, a, b1]));
  await p.evaluate(() => act('camp'));
  const c = await st();
  ok(
    '②進營地：本次掛機還在（不設 null）、記下暫停時間',
    !!c && c.t0 === a.t0 && c.r === a.r && c.away > 0,
    JSON.stringify(c)
  );
  /* 在營地待 60 秒（把暫停時間往前推）再按「繼續刷」 */
  await p.evaluate(() => (SES.away -= 60e3));
  await p.evaluate(() => act('resume'));
  await p.waitForTimeout(300);
  const d = await st(),
    line = await p.evaluate(() => !$('pcline').hidden && $('pcline').textContent);
  ok(
    '②回戰場：掛機時間接著算、打倒王次數補算後只增不減、暫停時間清掉',
    d.scene === 'map' && d.t0 === a.t0 && d.r > a.r && !d.away,
    JSON.stringify(d)
  );
  ok('②回戰場：補算那一行「營地期間 +N」出現', /^營地期間 /.test(line || ''), String(line));
  await p.evaluate(() => act('camp'));
  await p.waitForTimeout(200);
  ok('進營地：那一行跟掛機條一起收', await p.evaluate(() => $('pcline').hidden));
  await p.evaluate(() => (SES.away -= 5e3));
  await p.evaluate(() => act('resume'));
  await p.waitForTimeout(300);
  ok('②在營地 <10 秒就回來：不出那一行', await p.evaluate(() => $('pcline').hidden));
  /* 試招場：在營地場景裡走進石圈 */
  await p.evaluate(() => (act('camp'), pracGo()));
  await until(p, () => PRAC.in, 3000);
  const e0 = await st();
  await p.evaluate(() => (SES.away -= 30e3));
  await p.evaluate(() => act('resume'));
  await p.waitForTimeout(300);
  const e = await st();
  ok(
    '試招場直接「繼續刷」：離開練習區（PRAC.in 清掉、練習區面板收起）',
    await p.evaluate(() => !PRAC.in && $('prac').hidden)
  );
  ok(
    '②試招場進出：掛機時間不歸零、打倒王次數不減',
    e0 && e0.t0 === a.t0 && e.scene === 'map' && e.t0 === a.t0 && e.r >= d.r,
    JSON.stringify([e0, e])
  );
  /* ③重開遊戲：SES 是記憶體裡的，重新載入才歸零 */
  await p.evaluate(() => save());
  const t1 = Date.now();
  await p.reload();
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene);
  await p.waitForTimeout(800);
  const f = await p.evaluate(() => SES && { t0: SES.t0, r: SES.rounds });
  ok('③關掉重開才歸零', !f || (f.t0 >= t1 && f.r === 0), JSON.stringify(f));
  ok('沒有頁面錯誤', !p.errs.length, p.errs.join('|'));
  await p.context().close();
}
/* 戰鬥地板全地點共用一套（mumi 2026-11-26）：每個地點各進 3 次都是 BIO_ONE（temple）、地板是 tile_d2_battle_floor、
   沒有岩漿的發光點與岩漿池（擺設沒有 lava、bDecals 沒畫岩漿色點） */
async function floor(b) {
  const p = await open(b);
  const r = await p.evaluate(async () => {
    proSkip();
    S.world.done = TRUNK_K.slice();
    S.camp.watch = 99;
    S.lv = 99;
    S.frags.mist = 99;
    const seen = {},
      no = [],
      deco = new Set();
    for (const k of W_ALL)
      for (let i = 0; i < 3; i++) {
        if (!runNode(k)) {
          no.push(k);
          break;
        }
        seen[G.biome] = (seen[G.biome] || 0) + 1;
        for (const d of G.deco) deco.add(d.k);
        G.mobs = [];
      }
    /* 等地磚載好，畫一格，看 bDecals 有沒有畫岩漿那種亮橘點（rgba(255,120／190,50,…)） */
    for (let i = 0; i < 50 && !tileSet(G.biome); i++) await new Promise(f => setTimeout(f, 100));
    const fills = [],
      d0 = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle');
    Object.defineProperty(CX, 'fillStyle', {
      set: v => (fills.push(String(v)), d0.set.call(CX, v)),
      get: () => d0.get.call(CX),
      configurable: true
    });
    bDecals(innerWidth * 2, innerHeight * 2);
    delete CX.fillStyle;
    const T = tileSet(G.biome);
    return {
      n: W_ALL.length,
      no,
      seen,
      one: BIO_ONE,
      deco: [...deco],
      lavaDot: fills.filter(f => /^rgba\(255,(120|190),50,/.test(f)).length,
      fills: fills.length,
      src: TILE_SRC.temple.floor,
      img: T && T.floor.map(i => i.src.replace(/^.*\/img\//, 'img/'))
    };
  });
  ok(
    '戰鬥地板全地點共用：每個地點各進 3 次都是同一種地形（BIO_ONE＝temple），不再隨機抽',
    !r.no.length && r.one === 'temple' && JSON.stringify(r.seen) === JSON.stringify({ temple: r.n * 3 }),
    JSON.stringify(r)
  );
  ok(
    '戰鬥地板全地點共用：地板只有一張 tile_d2_battle_floor（img/tiles/temple-floor.*），戰鬥中載入的就是它',
    r.src.length === 1 &&
      /^img\/tiles\/temple-floor\.[0-9a-f]{8}\.png$/.test(r.src[0]) &&
      JSON.stringify(r.img) === JSON.stringify(r.src),
    JSON.stringify(r)
  );
  ok(
    '熔岩裝飾不出現：擺設沒有岩漿池、地上沒有岩漿發光點',
    !r.deco.includes('lava') && r.fills > 0 && r.lavaDot === 0,
    JSON.stringify(r)
  );
  /* 怪物腳下陰影（mumi 2026-11-26）：每種怪在一張鋪滿戰鬥地板的小畫布上畫一次（drawMob），
     腳下正中、精靈寬外側（外圈只蓋到陰影）都要比地板暗，陰影外的地板不變；怪物圖本身照 main 畫（同一張 artImg） */
  const sh = await p.evaluate(async () => {
    for (let i = 0; i < 50; i++) {
      const D = Object.values(MOBS);
      if (D.every(d => (artImg(d.sp) || {}).im?.naturalWidth)) break;
      await new Promise(f => setTimeout(f, 100));
    }
    const T = tileSet('temple'),
      c = document.createElement('canvas'),
      main = CX,
      out = [];
    c.width = c.height = 320;
    const g = c.getContext('2d', { willReadFrequently: true }),
      px = (x, y) => [...g.getImageData(Math.round(x), Math.round(y), 1, 1).data.slice(0, 3)].reduce((a, b) => a + b),
      base = () => {
        for (let y = 0; y < 320; y += 32) for (let x = 0; x < 320; x += 32) g.drawImage(T.floor[0], x, y);
      };
    CX = g;
    try {
      for (const k in MOBS) {
        const D = MOBS[k],
          a = artImg(D.sp);
        if (!a) continue;
        base();
        const m = { D, x: 160, y: 200, r: D.r, sz: D.sz, sq: 0, ph: 0, st: 'idle', mv: 0, flash: 0, ail: {} },
          R0 = Math.max(D.r * 1.1, (a.r[2] * D.sz) / a.r[3] / 2),
          at = [
            [160, 202],
            [160 + R0 * 1.15, 200],
            [10, 200]
          ],
          fl = at.map(q => px(...q));
        drawMob(m);
        const [foot, rim, far] = at.map(q => px(...q));
        out.push({ k, fl, foot, rim, far });
      }
    } finally {
      CX = main;
    }
    return { n: out.length, tab: MOB_SHADOW, out };
  });
  const dark = sh.out.filter(o => !(o.foot < o.fl[0] && o.rim < o.fl[1] && o.far === o.fl[2]));
  ok(
    `怪物腳下陰影：${sh.n} 種怪腳下正中與精靈寬外側都比地板暗、陰影外地板不變`,
    sh.n === Object.keys(await p.evaluate(() => MOBS)).length && sh.n > 20 && !dark.length,
    JSON.stringify(dark.slice(0, 5))
  );
  ok('沒有頁面錯誤', !p.errs.length, p.errs.join('|'));
  await p.context().close();
}
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  if (!ONLY || ONLY === 'flow') await flow(b);
  if (!ONLY || ONLY === 'auto') await auto(b);
  if (!ONLY || ONLY === 'patrol') await patrol(b);
  if (!ONLY || ONLY === 'ses') await ses(b);
  if (!ONLY || ONLY === 'floor') await floor(b);
  await b.close();
  console.log(bad ? `❌ ${bad} 項沒過` : '世界地圖實測全部通過');
  process.exit(bad ? 1 : 0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
