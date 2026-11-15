const { chromium } = require('playwright');
/* dungeonPOE 0.5.1 · 新存檔實掛（docs/工坊與解鎖表.md 第 2 節）：手機直立 390×844、AI 自動打，一個「會按的玩家」每 5 秒看一次營地：
   解鎖表夠了就升（鍛造台、民房、瞭望台、祭壇、斥候營、倉房）、產生器用剩下的木買（一次一級、最便宜的先，留下一件解鎖表要的木與材料）、
   瞭望台開了新地點就去那裡刷、一分鐘打造一件（部位輪流，留下一件升級要的鐵）並在 ▲ 時換上、其他分解。每分鐘印一列，最後寫總結。
   用法：先開本機伺服器，node tools/camp_run.js [網址] [分鐘，預設 30]；只量不改。環境變數 PW_CHROME 指定瀏覽器 */
const URL = process.argv[2] || 'http://localhost:8000/',
  MIN = +process.argv[3] || 30;
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?p=77&' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof treeInit === 'function');
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    localStorage.clear();
    S = newGame();
    try {
      introStop();
    } catch (e) {}
    proSkip();
    S.story.tips = 0;
    S.auto = 1;
    ST = stats();
    runNode(TRUNK_K[0]);
    window.__log = [];
    window.__ev = [];
    window.__gen = 0;
    window.__craft = [0, 0];
    window.__t0 = Date.now();
  });
  /* 會按的玩家（每 5 秒） */
  const PLAY = () => {
    const ORDER = ['forge', 'house', 'watch', 'altar', 'scout', 'store'],
      m = Math.floor((Date.now() - __t0) / 60000);
    for (const b of ORDER)
      if (!campUp(b)) {
        __ev.push(`${m} ${CAMPN[b]} Lv${S.camp[b]}：${CAMP[b][S.camp[b] - 1].d}`);
        if (b === 'watch') runNode(TRUNK_K[wFront(S)]);
      }
    const nx = ORDER.map(b => campNext(b))
        .filter(Boolean)
        .sort((a, b) => a.soul - b.soul)[0],
      rs = nx && S.mat.soul >= nx.soul ? nx : { wood: 0, mats: {} };
    for (let g = 0; g < 30; g++) {
      const ok = GEN_K.filter(k => {
        if (!genOn(k) || genAfford(k) < 1) return false;
        const c = genCost(k);
        /* 林場永遠買（它自己會把木賺回來）；其他產生器留下一件解鎖表要的木 */
        if (k !== 'wood' && matN('wood') - c.wood < (rs.wood || 0)) return false;
        return Object.keys(c.mats).every(key => matN(...matOf(key)) - c.mats[key] >= ((rs.mats || {})[key] || 0));
      });
      if (!ok.length) break;
      const k = ok.reduce((a, b) => (genCost(a).wood <= genCost(b).wood ? a : b)),
        m0 = genMs(genOf(k).lv);
      genUp(k);
      __gen++;
      const m1 = genMs(genOf(k).lv);
      if (m1.m > m0.m || m1.slots > m0.slots || m1.tu > m0.tu) __ev.push(`${m} ${GEN[k].n} Lv${genOf(k).lv} 里程碑`);
    }
    /* 打造：一分鐘一件、部位輪流，留下一件升級要的鐵與升礦場的鐵；▲ 就換上，不然分解 */
    const K = ['weapon', 'chest', 'helm', 'gloves', 'boots', 'belt', 'ring', 'amulet'],
      kind = K[__craft[0] % K.length],
      T = genTier('iron'),
      keep = ((rs.mats || {})['iron:' + T] || 0) + (genCost('iron').mats['iron:' + T] || 0),
      r =
        Date.now() - (window.__ct || 0) < 60000 || matN('iron', T) - 8 < keep
          ? { why: '等' }
          : ((window.__ct = Date.now()),
            craftDo(kind, {
              T,
              n: 1,
              sys: kind === 'weapon' || ['belt', 'ring', 'amulet'].includes(kind) ? '' : 'armor'
            }));
    if (!r.why) {
      __craft[0]++;
      for (const it of r.items) {
        if (it.salv) continue;
        const slot = EQS.find(e => eqTakes(e, kindOf(it)));
        if (itemUp(it) && slot) equipTo(it, slot.k), __craft[1]++, __ev.push(`${m} 換上 ${itemName(it)}`);
        else takeOut('inv', it), salvageDo(it);
      }
      ST = stats();
    }
  };
  const rows = [];
  for (let min = 1; min <= MIN; min++) {
    for (let s = 0; s < 12; s++) {
      await p.waitForTimeout(5000);
      await p.evaluate(PLAY);
    }
    const r = await p.evaluate(() => ({
      node: G.nodeN,
      lv: S.lv,
      soul: Math.round(S.mat.soul),
      wood: matN('wood'),
      iron: Object.entries(S.mat.mats)
        .filter(([k]) => k.startsWith('iron'))
        .map(([k, n]) => k.replace('iron:', 'T') + ' ' + n)
        .join(' '),
      gen: GEN_K.map(k => `${GEN[k].n[0]}${genOf(k).lv}(${genOf(k).w || 0})`).join(' '),
      camp: ['forge', 'watch', 'scout', 'house', 'altar', 'store'].map(b => S.camp[b]).join('/'),
      rounds: SES ? SES.rounds : 0,
      deaths: SES ? SES.deaths : 0,
      spm: Math.round(soulRate()),
      gens: __gen,
      craft: __craft.join('/'),
      ev: __ev.splice(0),
      dbg: `遊戲 ${Math.round(G.t)} 秒・${G.scene}／${G.state}・怪 ${G.mobs.filter(m => m.hp > 0).length}・地上 ${G.drops.length}・面板 ${anyPanel() ? 1 : 0}・王 ${G.bossOut ? 1 : 0}・進度 ${Math.round(G.prog)}／${G.need}`
    }));
    rows.push(r);
    console.log(
      `${String(min).padStart(2)} 分 | ${r.node} 角色Lv${r.lv} | 靈魂 ${r.soul}（${r.spm}/分）| 木 ${r.wood} | 鐵 ${r.iron} | ${r.gen} | 鍛瞭斥民祭倉 ${r.camp} | 輪 ${r.rounds} 死 ${r.deaths} | 產生器累計 ${r.gens} 級 | 打造/換上 ${r.craft} | ${r.dbg}${r.ev.length ? '\n      ' + r.ev.join('\n      ') : ''}`
    );
  }
  const news = rows.reduce((a, r) => a + r.ev.filter(e => !/換上/.test(e)).length, 0),
    ups = rows.reduce((a, r) => a + r.ev.filter(e => /換上/.test(e)).length, 0);
  console.log(
    `\n${MIN} 分鐘：新東西 ${news} 個、換上 ${ups} 次、產生器升了 ${rows[rows.length - 1].gens} 級、頁面錯誤 ${errs.length}`
  );
  if (errs.length) console.log(errs.slice(0, 5).join('\n'));
  await b.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
