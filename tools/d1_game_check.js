const { chromium } = require('playwright');
/* D1 修正第二輪（11/19 追加交辦）遊戲端檢查：§1 紅藍水冷卻（實戰＋試招場）、§2 字串、§3 縮寫／完整數字的位置、§7 ?test 存檔實際數值。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/d1_game_check.js [stats]；有 ❌ 結束碼 1。
   stats：只印 ?test 存檔的實際傷害、DPS、屬性、保底條上限（數值設計師要的原始輸出） */
const URL = process.env.GAME_URL || 'http://localhost:8000/';
const TESTS = ['midgame', 'chase', 'dualweap', 'nearDeath'];
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  let bad = 0;
  const ok = (c, lab, v) => {
    bad += !c;
    console.log(
      `${c ? '✅' : '❌'} ${lab}${v !== undefined ? '：' + String(v).replace(/data:image[^"]+/g, 'data:…') : ''}`
    );
  };
  const open = async (name, size = [1280, 720]) => {
    const ctx = await b.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(`${URL}?test=${name}&${Date.now()}`);
    await p.waitForFunction(
      () => typeof proBoot === 'function' && typeof S !== 'undefined' && S && typeof ST !== 'undefined'
    );
    await p.evaluate(() => typeof proSkip === 'function' && proSkip());
    await p.waitForTimeout(2500);
    return p;
  };
  /* ---------- §7：?test 存檔的實際數值 ---------- */
  console.log('=== §7 ?test 存檔實際數值（js 直接算，不是手寫） ===');
  for (const name of TESTS) {
    const p = await open(name);
    const r = await p.evaluate(() => {
      const c = slotCfg(0),
        n = c ? skillNums(c) : {},
        P0 = S.prd || {};
      return {
        lv: S.lv,
        weapon: S.eq.weapon ? itemName(S.eq.weapon) : '—',
        skill0: c ? c.D.n : '—',
        hit: n.hit,
        skillDps: n.dps,
        dps: dps(ST),
        str: ST.str,
        dex: ST.dex,
        int: ST.int,
        hp: ST.hp,
        mp: ST.mp,
        armor: ST.armor,
        ev: ST.ev,
        es: ST.es,
        bars: {
          '破裂石（王）': prdMax(NEW_P.frac[2]),
          '完美石（王）': prdMax(NEW_P.perf[2]),
          '追憶之墨（王）': prdMax(NEW_P.ink[2]),
          完美通貨: TIER_P.pity,
          追逐保底: 100,
          打造稀有保底: (() => {
            const y = craftRarP(S.camp.forge)[2];
            return y ? prdMax(y / 100) : null;
          })()
        },
        now: {
          perfC: P0.perfC || 0,
          fracO2: P0.fracO2 || 0,
          craftR: P0.craftR || 0,
          chasePts: (S.chase || {}).pts || 0
        },
        shown: { 屬性頁DPS: fullN(dps(ST), 'own'), 生命: fullN(ST.hp, 'own'), 護甲: fullN(ST.armor, 'own') }
      };
    });
    console.log(`?test=${name}\n` + JSON.stringify(r, null, 1));
    await p.context().close();
  }
  if (process.argv[2] === 'stats') return b.close();

  /* ---------- §1 紅藍水：冷卻 3 秒、冷卻中按不喝＋鈕抖、低血外框只在冷卻好時；試招場一樣 ---------- */
  console.log('=== §1 紅藍水 ===');
  {
    const p = await open('chase');
    const r = await p.evaluate(async () => {
      const el = document.querySelector("#bar .sk[data-k='flask']");
      /* 手動：不讓 AI 自己喝 */
      S.auto = 0;
      if (typeof AI !== 'undefined') AI.on = 0;
      P.hp = ST.hp * 0.3;
      P.cds.flask = 0;
      await new Promise(f => setTimeout(f, 300));
      const lowReady = el.classList.contains('low');
      drinkFlask();
      const cd1 = P.cds.flask,
        heal1 = P.heal;
      await new Promise(f => setTimeout(f, 300));
      const lowCd = el.classList.contains('low'),
        ring = el.classList.contains('cdn'),
        sh = getComputedStyle(el).boxShadow,
        txt = el.querySelector('u') ? el.querySelector('u').textContent : '';
      const heal2a = P.heal;
      drinkFlask();
      const heal2 = P.heal,
        anim = el.getAnimations().length,
        cd2 = P.cds.flask;
      return { lowReady, cd1, heal1: heal1 > 0, lowCd, ring, sh, txt, healSame: heal2 === heal2a, anim, cd2 };
    });
    ok(r.cd1 === 3, '喝了冷卻 3 秒（FLASK.cd）', r.cd1);
    ok(r.heal1, '第一下有回復', r.heal1);
    ok(r.lowReady && !r.lowCd, '低血外框只在生命藥劑冷卻好時（冷卻好 ' + r.lowReady + '／冷卻中 ' + r.lowCd + '）');
    ok(r.ring && /174, 118, 108/.test(r.sh), '冷卻中有 3 px --hp-hi 環', r.sh);
    ok(r.txt === '', '鈕上不寫次數、秒數', JSON.stringify(r.txt));
    ok(r.healSame && r.cd2 < 3, '冷卻中按：不喝、不重設冷卻', `heal 不變 ${r.healSame}、cd ${r.cd2.toFixed(2)}`);
    ok(r.anim > 0, '冷卻中按：鈕有忙碌回饋（抖或外框）', r.anim);
    const d = await p.evaluate(() => BAR.filter(x => x.k === 'flask' || x.k === 'mflask').map(x => x.d));
    ok(
      d.every(x => !/補充|充能|次數/.test(x) || /不限次數/.test(x)),
      '藥劑說明不寫充能',
      d.join('｜')
    );
    /* 試招場：回營地走進石圈，紅藍水冷卻同實戰 */
    const pr = await p.evaluate(async () => {
      enterCamp();
      await new Promise(f => setTimeout(f, 500));
      pracGo();
      await new Promise(f => setTimeout(f, 800));
      const inP = PRAC.in;
      P.cds.flask = 0;
      P.heal = 0;
      drinkFlask();
      const a = P.cds.flask,
        h1 = P.heal;
      drinkFlask();
      return { inP, a, h1: h1 > 0, same: P.heal === h1, scene: G.scene };
    });
    ok(pr.inP && pr.a === 3 && pr.h1 && pr.same, '試招場紅藍水冷卻同實戰（3 秒、冷卻中按不喝）', JSON.stringify(pr));
    if (p.errs.length) ok(0, '頁面錯誤', p.errs.join('；'));
    await p.context().close();
  }

  /* ---------- §2 字串、§3 縮寫／完整數字 ---------- */
  console.log('=== §2 字串、§3 數字 ===');
  {
    const p = await open('chase');
    const r = await p.evaluate(() => {
      const o = {};
      S.gold = 3402118;
      o.more =
        moreHTML().match(/<span>角色 Lv[^<]*<span[^>]*>[^<]*<\/span>[^<]*<\/span>/)?.[0] || moreHTML().slice(0, 300);
      S.prd = S.prd || {};
      S.prd.perfC = 12345;
      const lg = logHTML();
      o.bar = (lg.match(/完美通貨<\/span>.*?<small>([^<]*)<\/small>/) || [])[1];
      o.logHead = (lg.match(/<div class="ph2">(.*?)<\/div>/) || [])[1];
      const L0 = S.log;
      S.log = [];
      o.empty = (logHTML().match(/<li class="c-dim none">([^<]*)<\/li>/) || [])[1];
      S.log = L0;
      S.camp.forge = 12;
      o.forge = (forgeHTML ? makeHTML() : '').match(/再 \d+ 件沒出稀有，[^<]*/)?.[0];
      o.forgeGold = (() => {
        const bb = craftBase(MK.kind, MK),
          c = craftCost(bb, MK.T);
        return c.gold
          ? [abbr(c.gold * MK.n, 'cost'), makeHTML().includes(`${abbr(c.gold * MK.n, 'cost')} 金`)]
          : ['（這個底材不花金）', true];
      })();
      o.dpsN = [dpsN(12345.9), dpsN(9999.99)];
      IDLE.open = 0;
      o.idle = idleHTML().match(
        /<span class="ipb[^"]*">.*?<i class="pb">/
      )?.[0]; /* B1：段裡拆成字頭＋數字兩個 span，取到小條為止 */
      IDLE.open = 1;
      o.idleX = idleHTML().match(/<div class="chs"><span>.*?<\/span>/)?.[0];
      IDLE.open = 0;
      o.die = STR_T && typeof DEAD_MAX !== 'undefined' ? DEAD_MAX : null;
      o.box = typeof boxHTML === 'function';
      return o;
    });
    ok(
      /3\.40M<\/span> 金/.test(r.more) && /data-tip="3,402,118"/.test(r.more),
      '更多頁頁首金幣縮寫（點／停看完整）',
      r.more
    );
    ok(r.bar === '12.3K／300', '保底條 v／max 套 abbr', r.bar);
    ok(
      r.logHead === '保底進度・<span>滿了下一次一定掉</span>',
      '掉落紀錄標頭「保底進度・滿了下一次一定掉」',
      r.logHead
    );
    ok(r.empty === '還沒有掉落。刷地點時，稀有以上的掉落會記在這裡（最近 50 筆）。', '掉落紀錄空狀態', r.empty);
    ok(/^再 \d+ 件沒出稀有，下一件一定是稀有$/.test(r.forge || ''), '鍛造稀有保底句', r.forge);
    ok(r.forgeGold[1], '打造按鈕金幣套 abbr（費用進位）', r.forgeGold[0]);
    ok(r.dpsN[0] === '12,345' && r.dpsN[1] === '9,999', '試招場 DPS 卡寫完整（捨去）', r.dpsN.join('／'));
    /* B1 D2-03：字頭、數字拆成 span（放不下時照步驟收），所以比去掉標籤後的字 */
    ok(
      /ipw/.test(r.idle || '') && /追逐保底 \d+%/.test((r.idle || '').replace(/<[^>]+>/g, '')),
      '掛機條收起列「追逐保底 n%」＋王印 16',
      r.idle
    );
    ok(
      /ipw/.test(r.idleX || '') && /追逐保底 \d+%/.test((r.idleX || '').replace(/<[^>]+>/g, '')),
      '掛機卡展開列「追逐保底 n%」＋王印 16',
      r.idleX
    );
    const src = await p.evaluate(async () => {
      const t = await (await fetch('js/game.js?' + Date.now())).text(),
        h = await (await fetch('js/hud.js?' + Date.now())).text();
      return {
        die: /連死 \$\{DEAD_MAX\}|連倒 \$\{DEAD_MAX\}/.test(t + h),
        dao:
          /strT\('deadN', \{ n: DEAD_MAX \}\)\}，退回/.test(t) && /strT\('deadN', \{ n: DEAD_MAX \}\)\}，退回/.test(h),
        s: strT('deadN', { n: 3 })
      };
    });
    /* B1 D3-08：「連死／連倒 3 次」改「連續倒下 {n} 次」（字串表 deadN，game.js 提示、hud.js 死亡卡同一個來源） */
    ok(
      !src.die && src.dao && src.s === '連續倒下 3 次',
      '「連死／連倒 3 次」改「連續倒下 3 次」（game.js 提示、hud.js 死亡卡）',
      JSON.stringify(src)
    );
    if (p.errs.length) ok(0, '頁面錯誤', p.errs.join('；'));
    await p.context().close();
  }
  await b.close();
  console.log(bad ? `❌ ${bad} 項不過` : '✅ 全部通過');
  process.exit(bad ? 1 : 0);
})();
