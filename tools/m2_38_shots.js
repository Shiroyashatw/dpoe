/* M2-38 資訊架構重整的驗收（M2-37 v1.3 §12 完成條件）：只截、只量，不改遊戲。
   1. 375×667、390×844、1280×720 每個改過的畫面一張（分頁列 6／7 格、鍛造三段、營地總覽、更多、追逐物品開放前後與王印 0／2／4 種、
      不累積地點、掛機卡有／沒有可升級、角色頁有／沒候選、沒腰帶、「去鍛造打一件」、橫幅一般與王血條時；桌機另拍自動／手動快捷列、鍛造＋戰利品、右欄營地、設定、掉落紀錄）
   2. 桌機三個重疊（getBoundingClientRect；小地圖畫在畫布上，照 render.js drawMinimap 的公式算螢幕矩形）：交集面積都要 0
   3. §4 主要路徑：腳本實點、記點擊數（M2-29 還沒做的兩條記「待 M2-29」）
   4. 保底數字：點數 0、185、499、505 → 掛機卡與追逐物品面板都是 0、37、99、100%
   5. 1440×900：非對話框面板都在 y 76–742
   用法：先開本機伺服器（python3 -m http.server），node tools/m2_38_shots.js [輸出資料夾，預設 evidence/m2-38b] [網址]；PW_CHROME 指定 Chrome */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const OUT = process.argv[2] || path.join(__dirname, '..', 'evidence', 'm2-38b'),
  URL = process.argv[3] || 'http://localhost:8000/';
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const ok = (c, n, v = '') => {
  if (!c) fail++;
  console.log(`${c ? '✅' : '❌'} ${n}`, typeof v === 'string' ? v : JSON.stringify(v));
};
/* 頁面裡的小工具：矩形、交集面積、狀態重設 */
const helpers = () => {
  window.__r = s => {
    const e = typeof s === 'string' ? document.querySelector(s) : s;
    if (!e || e.hidden || !e.getClientRects().length) return null;
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  };
  window.__ov = (a, b) =>
    !a || !b
      ? 0
      : Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
        Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  /* 小地圖的螢幕矩形（桌機，同 render.js drawMinimap） */
  window.__mm = () => {
    const mw = 190,
      mh = (mw * G.H) / G.W;
    return { x: Math.round(IW - mw - 16), y: Math.round(cvH() - mh - 16), w: mw, h: Math.round(mh) };
  };
  window.__reset = () => {
    closePanels();
    G.loot = null;
    NAV.slot = null;
    hideTip();
    chaseBnHide();
    $('banner').hidden = true;
  };
  window.__rich = on => {
    for (const k in S.mat.mats) S.mat.mats[k] = on ? 1e7 : 0;
    for (const k of GEN_K) S.mat.mats[matKey(k, 1)] = on ? 1e7 : 0;
    S.mat.soul = on ? 1e9 : 0;
    S.gold = on ? 1e9 : 0;
  };
};
async function boot(b, W, H, t) {
  const mob = W < 900;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => ok(false, `頁面錯誤 ${W}×${H}`, e.message));
  await p.goto(URL + '?test=' + t + '&' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
  await p.evaluate(helpers);
  await p.evaluate(() => {
    try {
      introStop();
    } catch (e) {}
    window.hurtPlayer = () => 0;
    /* 進場 1.5 秒的 devChase 不要搶：先清掉，要的時候自己觸發 */
    S.chase.got = {};
    S.frags = {};
    S.chase.seen = { on: 0, v: 0, k: [] };
    __reset();
  });
  await p.waitForTimeout(1800);
  await p.evaluate(() => {
    S.chase.got = {};
    S.frags = {};
    S.chase.seen = { on: 0, v: 0, k: [] };
    __reset();
  });
  return { ctx, p };
}
/* 實點：捲到看得到、照矩形中心點（面板一直重畫，locator 會一直被換掉） */
async function tap(p, sel) {
  for (let i = 0; i < 20; i++) {
    const r = await p.evaluate(sel => {
      const e = document.querySelector(sel);
      if (!e) return null;
      e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect();
      return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    }, sel);
    /* 手機用觸控點（滑鼠點會讓遊戲切成桌機操作） */
    if (r) return p.viewportSize().width < 900 ? p.touchscreen.tap(r.x, r.y) : p.mouse.click(r.x, r.y);
    await p.waitForTimeout(200);
  }
  throw new Error('找不到 ' + sel);
}
const shot = async (p, W, H, n, f, wait = 450) => {
  if (f) await p.evaluate(f);
  await p.waitForTimeout(wait);
  await p.screenshot({ path: path.join(OUT, `${n}_${W}x${H}.png`) });
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const R = {};
  for (const [W, H] of [
    [375, 667],
    [390, 844],
    [1280, 720]
  ]) {
    const desk = W >= 900,
      sz = `${W}×${H}`;
    /* ---------- 開放前：怪物 Lv<45（midgame） ---------- */
    let { ctx, p } = await boot(b, W, H, 'midgame');
    await shot(p, W, H, '01_分頁_天賦沒開', () => {
      S.camp.altar = 3;
      sheetSync();
    });
    const n6 = await p.evaluate(() => document.querySelectorAll((PORT() ? '#pnav' : '#dnav') + ' button').length);
    await shot(p, W, H, '02_分頁_天賦開了', () => {
      S.camp.altar = 6;
      sheetSync();
    });
    const n7 = await p.evaluate(() => document.querySelectorAll((PORT() ? '#pnav' : '#dnav') + ' button').length);
    ok(n6 === 6 && n7 === 7, `${sz} 分頁格數（追逐物品沒開放）：天賦沒開 ${n6}、開了 ${n7}`);
    if (!desk) {
      const hw = await p.evaluate(() =>
        [...document.querySelectorAll('#pnav button')].map(e => Math.round(e.getBoundingClientRect().width))
      );
      ok(Math.min(...hw) >= 44, `${sz} 分頁每格寬 ≥ 44`, hw.join('、'));
    }
    await shot(p, W, H, '03_更多_追逐物品開放前', () => navGo('more'));
    ok(
      !(await p.evaluate(() => $('pmore').textContent.includes(STR_T.chase))),
      `${sz} 開放前：更多不列追逐物品、桌機不畫按鈕`
    );
    await p.evaluate(() => __reset());
    await shot(p, W, H, '04_掛機卡_沒有可升級', () => __rich(0));
    ok(
      (await p.evaluate(() => $('pidle').querySelector('[data-a=gocamp]')?.textContent)) === '去營地',
      `${sz} 掛機卡沒有可升級：按鈕只寫「去營地」`
    );
    await shot(p, W, H, '05_掛機卡_有可升級', () => (__rich(1), idleBar(1)), 1300);
    const gc = await p.evaluate(() => [$('pidle').querySelector('[data-a=gocamp]')?.textContent, campReady()]);
    ok(gc[0] === `去營地・${gc[1]} 可升級` && gc[1] > 0, `${sz} 掛機卡有可升級：「${gc[0]}」`);
    /* 鍛造三段 */
    await shot(p, W, H, '06_鍛造_打造', () => (__reset(), navGo('forge')));
    const fh = await p.evaluate(() => {
      const ph = document.querySelector('#pcraft > .ph');
      return {
        t: ph.querySelector('b').textContent,
        segs: [...ph.querySelectorAll('.ftabs button')].map(e => e.textContent),
        w: Math.round(ph.scrollWidth),
        cw: Math.round(ph.clientWidth)
      };
    });
    ok(
      fh.t === '鍛造' && fh.segs.join() === '打造,通貨,鍛造台' && fh.w <= fh.cw,
      `${sz} 鍛造標題列：${fh.t}｜${fh.segs.join('｜')}（不超出：${fh.w}／${fh.cw}）`
    );
    await shot(p, W, H, '07_鍛造_通貨', () => act('ctab:cur'));
    await shot(p, W, H, '08_鍛造_鍛造台', () => act('ctab:forge'));
    ok((await p.evaluate(() => navOn())) === 'forge', `${sz} 鍛造台段亮「鍛造」分頁`);
    await shot(p, W, H, '09_營地總覽', () => (__reset(), navGo('craft')));
    const cp = await p.evaluate(() => ({
      t: document.querySelector('#pcraft > .ph').textContent.trim(),
      seg: !!document.querySelector('#pcraft > .ph .ftabs'),
      inv: !$('pinv').hidden,
      on: navOn()
    }));
    ok(
      cp.on === 'craft' && !cp.seg && !cp.inv && cp.t.startsWith('營地'),
      `${sz} 營地只剩總覽（沒有段切換、不同時開戰利品）`,
      cp.t
    );
    /* 角色頁：有候選、沒候選＋去鍛造打一件、沒腰帶 */
    await p.evaluate(() => {
      __reset();
      __rich(0);
      S.eq.helm = null;
      S.eq.belt = null;
      S.inv.items = S.inv.items.filter(it => kindOf(it) !== 'helm');
      invPut(S.inv, mkItem(BASES.find(x => x.k === 'helm').id, 1, 0));
      ST = stats();
      navGo('char');
    });
    await shot(p, W, H, '10_角色頁_有候選_沒腰帶', null);
    const ch = await p.evaluate(() => ({
      helm: document.querySelector('#pinv [data-eq=helm] .cn')?.textContent,
      dash: [...document.querySelectorAll('#pinv .eqs.emp')].some(e => getComputedStyle(e).borderStyle === 'dashed'),
      kong: [...document.querySelectorAll('#pinv .eqs.emp')].some(e => /空/.test(e.textContent.replace(/空著/g, ''))),
      belt: document.querySelector('#pinv .chbelt')?.textContent
    }));
    ok(
      ch.helm === '1' && !ch.dash && !ch.kong && ch.belt === '裝上腰帶就有護符槽 ›',
      `${sz} 角色頁空格：候選數、沒有虛線與「空」、沒腰帶一行`,
      ch
    );
    await p.evaluate(() => {
      S.inv.items = S.inv.items.filter(it => kindOf(it) !== 'helm');
      hudPanels();
    });
    await tap(p, '#pinv [data-eq=helm]');
    await shot(p, W, H, '11_角色頁_沒候選_去鍛造打一件', () =>
      document.querySelector('#pinv .slotp')?.scrollIntoView({ block: 'nearest' })
    );
    const mk = await p.evaluate(() => document.querySelector('#pinv [data-a="mkslot:helm"]')?.textContent);
    ok(mk === '去鍛造打一件', `${sz} 沒候選：「還沒有能裝在頭部的裝備」＋「去鍛造打一件」`);
    await tap(p, '#pinv [data-a="mkslot:helm"]');
    await shot(p, W, H, '12_去鍛造打一件之後', null);
    const mk2 = await p.evaluate(() => [navOn(), CRAFT.tab, MK.kind]);
    ok(mk2.join() === 'forge,make,helm', `${sz} 去鍛造打一件 → 鍛造 › 打造、選好頭部`, mk2.join());
    await ctx.close();

    /* ---------- 開放後：怪物 Lv48（chase） ---------- */
    ({ ctx, p } = await boot(b, W, H, 'chase'));
    await p.waitForTimeout(300);
    const op = await p.evaluate(() => [chaseOn(), chaseDot(), $('warn').textContent]);
    ok(op[0] && op[1], `${sz} 第一次進 Lv45 以上：開放、提示點亮`, op.join('｜'));
    await shot(p, W, H, '13_更多_追逐物品開放後', () => navGo('more'));
    const mr = await p.evaluate(() => $('pmore').querySelector('[data-tm="f:chase"]')?.textContent);
    ok(!!mr && mr.includes('新') && mr.includes('王印 0／4・下一件保底'), `${sz} 更多那一列：「新」＋副行`, mr);
    if (desk) {
      const db = await p.evaluate(() => [...document.querySelectorAll('#dnav button')].map(e => e.textContent.trim()));
      ok(db.length === 8 && db[6].startsWith('追逐物品'), `${sz} 開放後桌機 8 格`, db.join('、'));
    }
    for (const [n, ks] of [
      ['0', []],
      ['2', ['wangyin_zhenyue', 'wangyin_chixiao']],
      ['4', Object.keys(STR_T_WY())]
    ]) {
      await shot(
        p,
        W,
        H,
        `14_追逐物品_王印${n}種`,
        `(() => { __reset(); S.chase.got = {}; S.frags = {}; for (const k of ${JSON.stringify(ks)}) (S.chase.got[k] = 1), (S.frags[k] = 2); CHSEL = null; navGo('more'); fmenuOpen('chase'); })()`
      );
      const t = await p.evaluate(() => document.querySelector('#pchase > .ph span').textContent);
      ok(t === `王印 ${n}／4`, `${sz} 追逐物品標題「${t}」`);
    }
    const dotOff = await p.evaluate(() => chaseDot());
    ok(!dotOff, `${sz} 打開追逐物品之後提示點清掉`);
    const cg = await p.evaluate(() => {
      const c = __r('#pchase .chc');
      return { c, scroll: $('pchase').scrollHeight - $('pchase').clientHeight };
    });
    if (W === 375) ok(cg.scroll <= 1, `${sz} 追逐物品不捲`, cg);
    console.log(`   收集格 ${cg.c.w}×${cg.c.h}`);
    /* 保底數字：掛機卡與面板同一個數 */
    const pv = [];
    for (const pts of [0, 185, 499, 505]) {
      pv.push(
        await p.evaluate(pts => {
          __reset();
          S.chase.pts = pts;
          idleBar(1);
          const a = $('pidle').querySelector('.chs span')?.textContent;
          fmenuOpen('chase');
          return [pts, a, document.querySelector('#pchase .chs span').textContent];
        }, pts)
      );
    }
    ok(
      pv.map(x => x[1] + '/' + x[2]).join() ===
        ['0', '37', '99', '100'].map(n => `下一件保底 ${n}%/下一件保底 ${n}%`).join(),
      `${sz} 保底數字 0、185、499、505 點 → 掛機卡／面板`,
      pv.map(x => `${x[0]}→${x[1].slice(6)}／${x[2].slice(6)}`).join('、')
    );
    /* 不累積的地點 */
    await shot(
      p,
      W,
      H,
      '15_追逐物品_不累積地點',
      () => {
        __reset();
        runNode(TRUNK_K[2]);
        fmenuOpen('chase');
      },
      1200
    );
    const nc = await p.evaluate(() => $('pchase').textContent.includes('這裡不累積保底'));
    ok(nc, `${sz} 不累積地點加一行「這裡不累積保底…」`);
    await p.evaluate(() => (__reset(), runNode(TRUNK_K[14])));
    await p.waitForTimeout(1200);
    /* 橫幅：一般、王血條時 */
    await shot(p, W, H, '16_橫幅_一般', () => (__reset(), devChase()), 700);
    if (desk) {
      const bn = await p.evaluate(() => {
        const bn = __r('#chase'),
          fight = { x: 0, y: 72, w: innerWidth, h: innerHeight - 72 };
        return { bn, 戰鬥區: __ov(bn, fight), 小地圖: __ov(bn, __mm()), mm: __mm(), dnav: __r('#dnav') };
      });
      R.bn = bn;
      ok(
        bn.戰鬥區 === 0 && bn.小地圖 === 0 && bn.bn.x + bn.bn.w <= bn.dnav.x - 12,
        `${sz} 橫幅 vs 戰鬥區（y≥72）、小地圖：交集 ${bn.戰鬥區}、${bn.小地圖}`,
        bn
      );
    }
    await shot(p, W, H, '17_橫幅_王血條時', () => (__reset(), spawnBoss(), devChase()), 900);
    if (desk) {
      const bb = await p.evaluate(() => ({ bn: __r('#chase'), boss: __r('#bossbar'), right: 788 }));
      ok(
        bb.bn && bb.bn.y >= 76 && bb.bn.x + bb.bn.w <= 788 && __ovN(bb.bn, bb.boss) === 0,
        `${sz} 王血條時橫幅 y 76–140、避開右欄與王血條`,
        bb
      );
    }
    await p.evaluate(() => {
      __reset();
      for (const m of G.mobs) if (m.boss) m.hp = 0;
    });
    if (desk) {
      /* 右欄 vs 小地圖、#pset vs 生命魔力條與技能列 */
      await shot(p, W, H, '18_桌機_鍛造加戰利品', () => navGo('forge'));
      const rc = await p.evaluate(() => ({ 左欄: __r('#pcraft'), 右欄: __r('#pinv'), mm: __mm() }));
      R.rc = { ...rc, 交集: __ovN(rc.右欄, rc.mm) };
      ok(R.rc.交集 === 0, `${sz} 右欄 vs 小地圖：交集 ${R.rc.交集}`, rc);
      await shot(p, W, H, '19_桌機_右欄營地', () => (__reset(), navGo('craft')));
      const cm = await p.evaluate(() => __r('#pcraft'));
      ok(cm.x === 788 && cm.w === 476, `${sz} 營地在右欄`, cm);
      await shot(p, W, H, '20_桌機_設定', () => (__reset(), openPanel('set')));
      const ps = await p.evaluate(() => ({
        pset: __r('#pset'),
        bars: __r('.mid .bars'),
        bar: __r('#bar'),
        mm: __mm()
      }));
      R.ps = {
        ...ps,
        生命魔力條: __ovN(ps.pset, ps.bars),
        技能列: __ovN(ps.pset, ps.bar),
        小地圖: __ovN(ps.pset, ps.mm)
      };
      ok(
        R.ps.生命魔力條 === 0 && R.ps.技能列 === 0 && R.ps.小地圖 === 0,
        `${sz} #pset vs 生命魔力條、技能列、小地圖：交集 ${R.ps.生命魔力條}、${R.ps.技能列}、${R.ps.小地圖}`,
        ps
      );
      await shot(p, W, H, '21_桌機_掉落紀錄', () => (__reset(), fmenuOpen('log')));
      const pl = await p.evaluate(() => __r('#plog'));
      ok(pl.x === 788 && pl.y === 76 && pl.y + pl.h <= 562, `${sz} 掉落紀錄在右欄`, pl);
      await shot(p, W, H, '22_桌機_自動_沒有快捷列', () => (__reset(), (S.auto = 1)));
      const au = await p.evaluate(() => [getComputedStyle($('bar')).visibility, __r('.mid .bars'), __r('.modesw')]);
      await shot(p, W, H, '23_桌機_手動_快捷列', () => (S.auto = 0), 600);
      const mn = await p.evaluate(() => [
        getComputedStyle($('bar')).visibility,
        __r('.mid .bars'),
        [...document.querySelectorAll('#bar .sk')].map(e => e.dataset.k).join(','),
        campN('slots')
      ]);
      ok(
        au[0] === 'hidden' && mn[0] === 'visible' && JSON.stringify(au[1]) === JSON.stringify(mn[1]),
        `${sz} 快捷列只在手動、生命魔力條兩種模式同位置`,
        { 自動: au, 手動: mn }
      );
      await p.evaluate(() => {
        S.camp.altar = 1;
        hudBar();
      });
      const s1 = await p.evaluate(() => [
        [...document.querySelectorAll('#bar .sk')].map(e => e.dataset.k).join(','),
        campN('slots'),
        !!document.querySelector('#bar .ico')
      ]);
      ok(!s1[0].includes('s' + s1[1]) && !/plus/.test(s1[2]), `${sz} 祭壇沒開的技能格不畫（開 ${s1[1]} 格：${s1[0]}）`);
      await p.evaluate(() => {
        S.camp.altar = 10;
        S.auto = 1;
      });
    }
    await ctx.close();
  }

  /* ---------- §4 點擊數（實點） ---------- */
  const clicks = [];
  for (const [W, H] of [
    [390, 844],
    [1280, 720]
  ]) {
    const desk = W >= 900,
      sz = desk ? '桌機' : '直立';
    const { ctx, p } = await boot(b, W, H, 'chase');
    const nav = k => (desk ? `#dnav [data-tm="nav:${k}"]` : `#pnav [data-tm="nav:${k}"]`);
    const run = async (name, exp, steps, check) => {
      await p.evaluate(() => {
        __reset();
        __rich(1);
        S.auto = 1;
        CRAFT.tab = 'camp';
        FSEG = 'make';
        MK.kind = 'helm';
        MK.n = 1;
        S.auto2 = { ...S.auto2, r: 0 };
      });
      let n = 0;
      for (const s of steps) {
        const sel = typeof s === 'function' ? await p.evaluate(s) : s;
        try {
          await tap(p, sel);
        } catch (e) {
          await p.screenshot({ path: path.join(OUT, `x_失敗_${name}_${W}x${H}.png`) });
          ok(false, `§4 ${sz}：${name} 第 ${n + 1} 下找不到 ${sel}`);
          break;
        }
        n++;
        await p.waitForTimeout(250);
      }
      await p.screenshot({ path: path.join(OUT, `§4_${name.replace(/[ →（）／]/g, '')}_${W}x${H}.png`) });
      const c = await p.evaluate(check);
      clicks.push({ 路徑: name, 尺寸: sz, 規格: exp, 實測: n, 結果: c });
      ok(c === true && n === exp, `§4 ${sz}：${name} ${n} 下（規格 ${exp}）`, String(c));
    };
    /* 打造一件並裝備（同部位）：鍛造 → 打造 → 裝備 */
    await run(
      '打造一件並裝備（同部位）',
      3,
      [nav('forge'), '#pcraft [data-fg=go]', '#preveal [data-a=rvwear]'],
      () => !!S.eq.helm && S.eq.helm.id === Math.max(...[S.eq.helm.id])
    );
    await run(
      '打造一件並裝備（換部位）',
      4,
      [nav('forge'), '#pcraft [data-fg="mk:kind:gloves"]', '#pcraft [data-fg=go]', '#preveal [data-a=rvwear]'],
      () => !!S.eq.gloves
    );
    /* 倉庫一件 → 裝備 */
    await p.evaluate(() => {
      S.eq.boots = null;
      invPut(S.inv, mkItem(BASES.find(x => x.k === 'boots').id, 1, 0));
      ST = stats();
    });
    await run(
      '倉庫一件 → 裝備',
      desk ? 2 : 3,
      desk
        ? [nav('bag'), () => `#pinv .it[data-id="${S.inv.items.find(i => kindOf(i) === 'boots').id}"]`]
        : [
            nav('bag'),
            () => `#pinv .it[data-id="${S.inv.items.find(i => kindOf(i) === 'boots').id}"]`,
            '#pinv [data-a=selmove]'
          ],
      () => !!S.eq.boots
    );
    /* 角色頁某格換一件：角色 → 格 → 候選 → 裝備（直立）；桌機的角色頁點有裝備的格＝卸下，換一件走戰利品（記實測） */
    if (!desk) {
      await p.evaluate(() => {
        S.inv.items = S.inv.items.filter(i => kindOf(i) !== 'boots');
        invPut(S.inv, mkItem(BASES.find(x => x.k === 'boots').id, 1, 0));
      });
      const bid = await p.evaluate(() => S.inv.items.find(i => kindOf(i) === 'boots').id);
      await run(
        '角色頁某格換一件',
        4,
        [
          nav('char'),
          '#pinv [data-eq=boots]',
          () => `#pinv .slotp .it[data-id="${S.inv.items.find(i => kindOf(i) === 'boots').id}"]`,
          '#tip [data-tq=move]'
        ],
        `S.eq.boots && S.eq.boots.id === ${bid}`
      );
      /* 空格沒候選 → 打一件裝上 */
      await p.evaluate(() => {
        S.eq.helm = null;
        S.inv.items = S.inv.items.filter(i => kindOf(i) !== 'helm');
        ST = stats();
      });
      await run(
        '空格沒候選 → 打一件裝上',
        5,
        [
          nav('char'),
          '#pinv [data-eq=helm]',
          '#pinv [data-a="mkslot:helm"]',
          '#pcraft [data-fg=go]',
          '#preveal [data-a=rvwear]'
        ],
        () => !!S.eq.helm
      );
      /* 升一座營地設施：營地 → 升級 */
      await run('升一座營地設施', 2, [nav('craft'), () => `#pcraft [data-fg^="camp:"]:not([disabled])`], () => true);
    } else {
      await p.evaluate(() => {
        S.eq.helm = null;
        S.inv.items = S.inv.items.filter(i => kindOf(i) !== 'helm');
        ST = stats();
      });
      await run(
        '空格沒候選 → 打一件裝上（桌機加測）',
        5,
        [
          nav('char'),
          '#pinv [data-eq=helm]',
          '#pinv [data-a="mkslot:helm"]',
          '#pcraft [data-fg=go]',
          '#preveal [data-a=rvwear]'
        ],
        () => !!S.eq.helm
      );
      await run('切到手動（只用滑鼠）', 1, ['.modesw [data-a="auto:0"]'], () => S.auto === 0);
    }
    clicks.push({
      路徑: '王印套到裝備（看到橫幅／錯過橫幅）',
      尺寸: sz,
      規格: '4／4–5',
      實測: '待 M2-29',
      結果: '「套到裝備」M2-29 實作後才畫'
    });
    await ctx.close();
  }

  /* ---------- 1440×900：非對話框面板都在 y 76–742 ---------- */
  {
    const { ctx, p } = await boot(b, 1440, 900, 'chase');
    const L = await p.evaluate(() => {
      const out = [];
      for (const [n, f, id] of [
        ['戰利品', () => navGo('bag'), 'pinv'],
        ['角色', () => navGo('char'), 'pinv'],
        ['鍛造', () => navGo('forge'), 'pcraft'],
        ['鍛造 › 通貨', () => act('ctab:cur'), 'pstash'],
        ['技能', () => navGo('skill'), 'pskill'],
        ['營地', () => navGo('craft'), 'pcraft'],
        ['追逐物品', () => (chaseUnlock(), fmenuOpen('chase')), 'pchase'],
        ['更多', () => navGo('more'), 'pmore'],
        ['地點', () => fmenuOpen('node'), 'pnode'],
        ['掉落紀錄', () => fmenuOpen('log'), 'plog'],
        ['設定', () => openPanel('set'), 'pset']
      ]) {
        __reset();
        f();
        const r = __r('#' + id);
        out.push([n, r]);
      }
      return out;
    });
    for (const [n, r] of L) ok(!!r && r.y >= 76 && r.y + r.h <= 742, `1440×900 ${n}：y ${r && r.y}–${r && r.y + r.h}`);
    await p.screenshot({ path: path.join(OUT, '24_1440x900_設定.png') });
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'measure.json'), JSON.stringify({ 遮擋: R, 點擊: clicks }, null, 2));
  console.log('\n點擊數');
  for (const c of clicks) console.log(`  ${c.尺寸}｜${c.路徑}｜規格 ${c.規格}｜實測 ${c.實測}`);
  await b.close();
  console.log(fail ? `\n❌ ${fail} 項不合` : '\n✅ 全部通過');
  process.exit(fail ? 1 : 0);
})();
function STR_T_WY() {
  return { wangyin_zhenyue: 1, wangyin_chixiao: 1, wangyin_jiting: 1, wangyin_guixu: 1 };
}
function __ovN(a, b) {
  return !a || !b
    ? 0
    : Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
        Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
}
