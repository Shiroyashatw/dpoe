/* M2-21：tools/camp_run.js 的複本（同一個「會按的玩家」政策，每 5 秒看一次營地、一分鐘打造一件），只多記資料，不改政策：
   - 每分鐘：靈魂（庫存、收入、各設施花費）、木（庫存、產量、營地用量、產生器用量）、鐵／皮／絲 各階（庫存、產量）、輪數、靈魂／分
   - 每一次設施升級、產生器里程碑、換上、角色升級的秒數（JSON）
   - OVR 環境變數：一段 JS，在新存檔前在頁面裡執行（試候選常數用，只改記憶體，不動 repo）
   用法：TZ=UTC OVR='...' node camp_run_v2.js URL 分鐘 寬 高 輸出前綴   → 前綴.csv、前綴.json；log 印 stdout */
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.argv[2] || 'http://localhost:8000/',
  MIN = +process.argv[3] || 30,
  VW = +process.argv[4] || 390,
  VH = +process.argv[5] || 844,
  MOB = VW < 900,
  OUT = process.argv[6] || `camp_${VW}x${VH}`,
  OVR = process.env.OVR || '';
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, hasTouch: MOB, isMobile: MOB });
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?p=77&' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof treeInit === 'function');
  await p.waitForTimeout(800);
  const sha = await p.evaluate(() => (typeof VER !== 'undefined' ? VER : '?'));
  await p.evaluate(ovr => {
    if (ovr) (0, eval)(ovr);
    window.__ovr = ovr;
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
    window.__ev = [];
    window.__gen = 0;
    window.__craft = [0, 0];
    window.__t0 = Date.now();
    const sec = () => Math.round((Date.now() - __t0) / 100) / 10;
    window.__sec = sec;
    const Z = () => ({ sp: {}, prod: {}, wu: { camp: 0, gen: 0 }, mu: { camp: {}, gen: {}, craft: {} }, salv: 0 });
    window.__acc = Z();
    window.__Z = Z;
    window.__buys = [];
    const snap = () => ({ ...S.mat.mats });
    const diff = (a, b) => {
      const o = {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        const d = (a[k] || 0) - (b[k] || 0);
        if (d) o[k] = d;
      }
      return o;
    };
    const addTo = (o, d) => {
      for (const k in d) o[k] = (o[k] || 0) + d[k];
    };
    const c0 = campUp;
    campUp = function (b) {
      const s0 = S.mat.soul,
        m0 = snap(),
        lv0 = S.camp[b],
        r = c0.apply(this, arguments);
      if (!r) {
        const d = diff(m0, snap());
        __acc.sp[b] = (__acc.sp[b] || 0) + (s0 - S.mat.soul);
        __acc.wu.camp += d.wood || 0;
        delete d.wood;
        addTo(__acc.mu.camp, d);
        __buys.push({ t: sec(), b, lv: S.camp[b], soul: Math.round(s0 - S.mat.soul), left: Math.round(S.mat.soul) });
      }
      return r;
    };
    const g0 = genUp;
    genUp = function () {
      const m0 = snap(),
        r = g0.apply(this, arguments);
      if (!r) {
        const d = diff(m0, snap());
        __acc.wu.gen += d.wood || 0;
        delete d.wood;
        addTo(__acc.mu.gen, d);
      }
      return r;
    };
    const k0 = craftDo;
    craftDo = function () {
      const m0 = snap(),
        r = k0.apply(this, arguments);
      addTo(__acc.mu.craft, diff(m0, snap()));
      return r;
    };
    const sv0 = salvageDo;
    salvageDo = function (it) {
      const s0 = S.mat.soul,
        m0 = snap(),
        r = sv0.apply(this, arguments);
      __acc.salv += S.mat.soul - s0;
      addTo(__acc.mu.craft, diff(m0, snap()));
      return r;
    };
    const gt = genTick;
    genTick = dt => {
      const got = gt(dt);
      if (got) addTo(__acc.prod, got);
      return got;
    };
    window.__r1 = 0;
    window.__up = [];
    window.__say = [];
    const w0 = hudWarn;
    hudWarn = t => (/^\S+ Lv\d+：/.test(t) && __say.push(`${sec()} ${t}`), w0(t));
    let lv = S.lv,
      sig = '';
    setInterval(() => {
      if (!__r1 && SES && SES.rounds > 0) __r1 = Date.now() - __t0;
      const g =
        GEN_K.map(k => genOf(k).lv).join() +
        '|' +
        ['forge', 'watch', 'scout', 'house', 'altar', 'store'].map(b => S.camp[b]).join();
      if (sig && g !== sig) __up.push([sec(), '營地']);
      sig = g;
      if (S.lv > lv) __up.push([sec(), '角色 Lv' + S.lv]), (lv = S.lv);
    }, 250);
  }, OVR);
  /* 會按的玩家（每 5 秒）：tools/camp_run.js 原樣 */
  const PLAY = () => {
    const ORDER = ['forge', 'house', 'watch', 'altar', 'scout', 'store'],
      m = Math.floor((Date.now() - __t0) / 60000),
      s = __sec();
    for (const b of ORDER)
      if (!campUp(b)) {
        __ev.push(`${s} ${CAMPN[b]} Lv${S.camp[b]}：${CAMP[b][S.camp[b] - 1].d}`);
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
        if (k !== 'wood' && matN('wood') - c.wood < (rs.wood || 0)) return false;
        return Object.keys(c.mats).every(key => matN(...matOf(key)) - c.mats[key] >= ((rs.mats || {})[key] || 0));
      });
      if (!ok.length) break;
      const k = ok.reduce((a, b) => (genCost(a).wood <= genCost(b).wood ? a : b)),
        m0 = genMs(genOf(k).lv);
      genUp(k);
      __gen++;
      const m1 = genMs(genOf(k).lv);
      if (m1.m > m0.m || m1.slots > m0.slots || m1.tu > m0.tu) __ev.push(`${s} ${GEN[k].n} Lv${genOf(k).lv} 里程碑`);
    }
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
        if (itemUp(it) && slot)
          equipTo(it, slot.k),
            __craft[1]++,
            __ev.push(`${s} 換上 ${itemName(it)}`),
            __up.push([Math.round(s), '換上']);
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
    const r = await p.evaluate(() => {
      const a = __acc;
      window.__acc = __Z();
      return {
        node: G.nodeN,
        lv: S.lv,
        soul: Math.round(S.mat.soul),
        acc: a,
        mats: { ...S.mat.mats },
        gen: GEN_K.map(k => `${GEN[k].n[0]}${genOf(k).lv}(${genOf(k).w || 0})`).join(' '),
        camp: ['forge', 'watch', 'scout', 'house', 'altar', 'store'].map(b => S.camp[b]).join('/'),
        rounds: SES ? SES.rounds : 0,
        deaths: SES ? SES.deaths : 0,
        spm: Math.round(soulRate()),
        gt: Math.round(G.t),
        prog: Math.round(G.prog),
        cur: { tran: S.mat.tran || 0, aug: S.mat.aug || 0, rich: S.mat.rich || 0 },
        gens: __gen,
        craft: __craft.join('/'),
        ev: __ev.splice(0),
        dbg: `遊戲 ${Math.round(G.t)} 秒・${G.scene}／${G.state}・怪 ${G.mobs.filter(m => m.hp > 0).length}・進度 ${Math.round(G.prog)}／${G.need}`
      };
    });
    rows.push(r);
    const iron = Object.entries(r.mats)
      .filter(([k]) => k.startsWith('iron'))
      .map(([k, n]) => k.replace('iron:', 'T') + ' ' + n)
      .join(' ');
    console.log(
      `${String(min).padStart(2)} 分 | ${r.node} 角色Lv${r.lv} | 靈魂 ${r.soul}（${r.spm}/分）| 木 ${r.mats.wood || 0} | 鐵 ${iron} | ${r.gen} | 鍛瞭斥民祭倉 ${r.camp} | 輪 ${r.rounds} 死 ${r.deaths} | 產生器累計 ${r.gens} 級 | 打造/換上 ${r.craft} | ${r.dbg}${r.ev.length ? '\n      ' + r.ev.join('\n      ') : ''}`
    );
  }
  const B = ['forge', 'watch', 'scout', 'house', 'altar', 'store'],
    N = { forge: '鍛造台', watch: '瞭望台', scout: '斥候營', house: '民房', altar: '祭壇', store: '倉房' },
    MK = ['iron:1', 'iron:2', 'hide:1', 'hide:2', 'silk:1'],
    L = [
      [
        '分',
        '地點',
        '角色Lv',
        '輪數累計',
        '靈魂庫存',
        '靈魂收入',
        '靈魂花費',
        ...B.map(b => '靈魂花在' + N[b]),
        '分解靈魂',
        '木庫存',
        '木產量',
        '木用量_營地',
        '木用量_產生器',
        ...MK.flatMap(k => [k + '庫存', k + '產量', k + '用量_營地', k + '用量_產生器', k + '淨用量_打造']),
        '鍛瞭斥民祭倉',
        '產生器',
        '事件'
      ].join(',')
    ];
  let s0 = 0;
  rows.forEach((r, i) => {
    const sp = B.map(b => Math.round(r.acc.sp[b] || 0)),
      spent = sp.reduce((a, b) => a + b, 0),
      inc = r.soul - s0 + spent;
    s0 = r.soul;
    L.push(
      [
        i + 1,
        r.node,
        r.lv,
        r.rounds,
        r.soul,
        inc,
        spent,
        ...sp,
        Math.round(r.acc.salv),
        r.mats.wood || 0,
        r.acc.prod.wood || 0,
        r.acc.wu.camp,
        r.acc.wu.gen,
        ...MK.flatMap(k => [
          r.mats[k] || 0,
          r.acc.prod[k] || 0,
          r.acc.mu.camp[k] || 0,
          r.acc.mu.gen[k] || 0,
          r.acc.mu.craft[k] || 0
        ]),
        r.camp,
        r.gen,
        '"' + r.ev.join('；') + '"'
      ].join(',')
    );
  });
  fs.writeFileSync(OUT + '.csv', L.join('\n') + '\n');
  const M = await p.evaluate(() => ({ r1: __r1, up: __up, say: __say, buys: __buys }));
  const news = rows.reduce((a, r) => a + r.ev.filter(e => !/換上/.test(e)).length, 0),
    ups = rows.reduce((a, r) => a + r.ev.filter(e => /換上/.test(e)).length, 0);
  const T = [...new Set(M.up.map(u => Math.round(u[0])).filter(t => t <= 900))].sort((a, b) => a - b),
    gaps = [...T, Math.min(900, MIN * 60)].map((t, i, L) => t - (i ? L[i - 1] : 0)),
    per = Array.from({ length: Math.min(15, MIN) }, (_, i) => T.filter(t => t >= i * 60 && t < (i + 1) * 60).length);
  /* AI 卡住判定：連續 4 分鐘以上輪數、地點、進度都不動（只看輪數會把打很久的一輪誤判） */
  let stuck = 0,
    run = 0;
  for (let i = 1; i < rows.length; i++) {
    run = rows[i].rounds === rows[i - 1].rounds && rows[i].prog === rows[i - 1].prog && rows[i].node === rows[i - 1].node ? run + 1 : 0;
    if (run >= 4 && !stuck) stuck = i + 1 - run;
  }
  const newsAt = m => rows.slice(0, m).reduce((a, r) => a + r.ev.filter(e => !/換上/.test(e)).length, 0);
  const sum = {
    ver: sha,
    vw: VW,
    vh: VH,
    min: MIN,
    ovr: OVR,
    r1: M.r1,
    news,
    news30: newsAt(30),
    news60: newsAt(60),
    ups,
    up15: T.length,
    gapMax15: Math.max(0, ...gaps),
    gaps60: gaps.filter(g => g > 60).length,
    per,
    stuckFrom: stuck,
    errs: errs.slice(0, 5),
    buys: M.buys,
    up: M.up,
    say: M.say,
    rows: rows.map(r => ({ prog: r.prog, node: r.node, rounds: r.rounds, soul: r.soul, gt: r.gt, mats: r.mats, cur: r.cur, ev: r.ev, camp: r.camp, gen: r.gen }))
  };
  fs.writeFileSync(OUT + '.json', JSON.stringify(sum));
  console.log(
    `\n${MIN} 分鐘（${VW}×${VH}）：新東西 ${news} 個（30 分 ${sum.news30}、60 分 ${sum.news60}）、換上 ${ups} 次、產生器升了 ${rows[rows.length - 1].gens} 級、頁面錯誤 ${errs.length}`
  );
  console.log(`首輪完成：${M.r1 ? `${Math.floor(M.r1 / 60000)} 分 ${Math.round((M.r1 % 60000) / 1000)} 秒` : '沒有打完'}`);
  console.log(
    `前 15 分鐘小變強：${T.length} 次，最大間隔 ${Math.max(0, ...gaps)} 秒，超過 60 秒的間隔 ${gaps.filter(g => g > 60).length} 個；每分鐘 ${per.join(' ')}`
  );
  console.log(stuck ? `⚠️ AI 卡住：第 ${stuck} 分起輪數不動（本場無效）` : 'AI 沒有卡住');
  await b.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
