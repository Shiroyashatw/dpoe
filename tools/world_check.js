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
    '地點清單（0.5.2）：一開始只開第 1 個、第 2 個寫「瞭望台 Lv 1 才開」、賽制節點還沒列',
    await p.evaluate(() => {
      const L = [...document.querySelectorAll('#pnode .ndr')];
      return L.length === 22 && !L[0].hasAttribute('aria-disabled') && /瞭望台 Lv 1/.test(L[1].textContent);
    })
  );
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
  await until(p, () => /連死 3 次/.test($('run').textContent), 3000);
  const rb = await p.evaluate(() => ({ node: G.node, note: S.world.note, run: $('run').textContent }));
  ok(
    '連死 3 次：退回上一個節點、HUD 有通知（寫換裝、降星級或升營地）',
    rb.node === K[8] && /連死 3 次/.test(rb.note) && /升營地/.test(rb.run),
    JSON.stringify(rb)
  );
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
  /* 回藏身處：刷圖暫停，HUD 有「繼續刷」 */
  await p.evaluate(() => act('home'));
  ok(
    '回藏身處：HUD 有「繼續刷」，按了回到原本的節點',
    await until(p, () => G.scene === 'hide' && /繼續刷/.test($('run').textContent))
  );
  await p.click('#run [data-a=resume]');
  ok('繼續刷', await until(p, () => G.scene === 'map' && G.node === S.world.cur));
  /* 存檔還原 */
  const before = await p.evaluate(
    () => (
      save(),
      JSON.stringify([
        S.world.done,
        S.world.cur,
        S.star,
        CAMP_B.map(b => S.camp[b]),
        GEN_K.map(k => S.camp.gen[k].lv),
        S.v
      ])
    )
  );
  await p.reload();
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene);
  ok(
    '存檔還原：走過的、在刷的、星級、營地',
    (await p.evaluate(() =>
      JSON.stringify([
        S.world.done,
        S.world.cur,
        S.star,
        CAMP_B.map(b => S.camp[b]),
        GEN_K.map(k => S.camp.gen[k].lv),
        S.v
      ])
    )) === before
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
  /* 連死：AI 自己按重來，第 3 次退回 */
  const k0 = await p.evaluate(() => G.node);
  for (let i = 0; i < 3; i++) {
    await p.evaluate(() => die());
    await until(p, () => G.state === 'play' && G.t < 1, 6000);
  }
  const rb = await p.evaluate(() => ({ node: G.node, scene: G.scene }));
  ok(
    'AI：倒下自己重來，連死 3 次退回上一個節點繼續刷',
    rb.node === K[0] && rb.scene === 'map' && k0 === K[1],
    JSON.stringify(rb)
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
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  if (!ONLY || ONLY === 'flow') await flow(b);
  if (!ONLY || ONLY === 'auto') await auto(b);
  if (!ONLY || ONLY === 'patrol') await patrol(b);
  await b.close();
  console.log(bad ? `❌ ${bad} 項沒過` : '世界地圖實測全部通過');
  process.exit(bad ? 1 : 0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
