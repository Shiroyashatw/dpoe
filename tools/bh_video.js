/* battle-hud v1.3.3 §13-6 必交影片：裝填、蓄力（含蓄滿外框 120 ms、自動模式蓄滿才出手）、收起／展開 200 ms、最近一筆掉寶從右滑入 200 ms。
   用法：先開 python3 -m http.server 8000，再 node tools/bh_video.js [輸出資料夾]（預設 docs/production/evidence/battle-hud-v133-fix2/video）
   兩個尺寸（390×844 直立、1280×720 桌機）各錄一支。原生 60 fps：凍結虛擬時鐘（DBG.freeze），每格 DBG.step(1000/60) 推遊戲與 CSS／Web 動畫
   剛好 1/60 秒再截一張，ffmpeg 以 -framerate 60 直接接成 mp4（不重採樣、不縮放）。畫面右側燒入幀號與時間戳；
   每格的 HUD 狀態寫進 {clip}_{W}x{H}.json（起迄幀與毫秒由它算，寫進 TIMING.md）。都是真的遊戲流程，只用 DBG 擺場景 */
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path'),
  { execFileSync } = require('child_process');
const OUT = path.resolve(
    process.argv[2] || path.join(__dirname, '..', 'docs/production/evidence/battle-hud-v133-fix2/video')
  ),
  URL = process.argv[3] || 'http://localhost:8000/';
fs.mkdirSync(OUT, { recursive: true });
const FPS = 60;
/* 片段裡的「等 ms」：一格一格推、一格一張 */
let REC = null;
const wait = (p, ms) => REC(ms);
const CLIPS = {
  /* 裝填：技能格 1 從 1 發打到 0 → 裝填環＋「裝填」→ 補滿（每 40 ms 亮回 1 格） */
  reload: async p => {
    await p.evaluate(() => {
      S.eq.weapon = mkItem('w_xbow_0', 10, 0);
      S.skills[0] = { k: 'apshot', so: [null, null], n: 2 };
      S.lib.sk.apshot = 1;
      ST = stats();
      hudBar();
      P.ammo = { apshot: { n: 3, until: 0 } };
      DBG.clear();
      spawnMob(Object.values(MOBS)[0], P.x + 160, P.y, 1, false).aggro = 0;
    });
    await wait(p, 800);
    for (let i = 0; i < 3; i++) {
      await p.evaluate(() => ((P.act = null), (P.cds = {}), (P.mp = ST.mp), useSlot(0)));
      await wait(p, 500);
    }
    await wait(p, 2600);
  },
  /* 蓄力：按住 0→1→2→3 段（外圈 3 段弧＋右上「n/3」）、蓄滿外框 120 ms、放開清掉；接著切自動，AI 蓄滿才出手 */
  charge: async p => {
    await p.evaluate(() => {
      S.eq.weapon = mkItem('w_mace1_0', 10, 0);
      S.skills[2] = { k: 'chargeslam', so: [null, null], n: 2 };
      S.lib.sk.chargeslam = 1;
      ST = stats();
      hudBar();
      DBG.clear();
      spawnMob(Object.values(MOBS)[0], P.x + 90, P.y, 1, false).aggro = 0;
    });
    await wait(p, 600);
    /* 手動：按住 Q（桌機）；直立用同一個 slotHeld（K.q） */
    await p.evaluate(() => ((S.auto = 0), (P.mp = ST.mp), (P.cds = {}), (K.q = 1), useSlot(2)));
    await wait(p, 1700);
    await p.evaluate(() => (K.q = 0));
    await wait(p, 900);
    /* 自動：AI 蓄滿才出手（蓄力重砸放到左鍵格，AI 的主攻擊） */
    await p.evaluate(() => {
      S.skills[0] = { k: 'chargeslam', so: [null, null], n: 2 };
      S.skills[2] = { k: null, so: [null, null], n: 2 };
      ST = stats();
      hudBar();
      S.auto = 1;
      P.mp = ST.mp;
      P.cds = {};
      for (let i = 0; i < 3; i++) spawnMob(Object.values(MOBS)[0], P.x + 80 + i * 20, P.y + 30, 1, false).aggro = 1;
    });
    await wait(p, 4000);
  },
  /* 收起／展開：▼ → 200 ms 往下滑 → 戰場一次改高；▲ → 200 ms 往上滑 */
  collapse: async (p, touch) => {
    /* 直立用觸控點（滑鼠一按遊戲會切回桌機模式） */
    const hit = q => (touch ? p.tap(q) : p.click(q));
    await wait(p, 800);
    await hit('#pidle .ihd');
    await wait(p, 1500);
    await hit('#pidle .ix');
    await wait(p, 1500);
    await hit('#pidle .ihd');
    await wait(p, 1200);
    await hit('#pidle .ihit');
    await wait(p, 1200);
  },
  /* 最近一筆掉寶（收起列 T34／C34）：換新時從右滑入 200 ms，然後停住（不做連續滾動） */
  slidein: async p => {
    await p.evaluate(() => DBG.hudMin(1));
    await wait(p, 800);
    /* 規格範例的稀有度：判官烏紗＝傳奇、厲鬼護符＝稀有、最後一筆追逐（直條 --rar-chase） */
    const L = [
      ['判官烏紗', 'it', 3],
      ['厲鬼護符', 'it', 2],
      ['', 'chase', 4]
    ];
    for (const [n, c, r] of L) {
      await p.evaluate(
        ([n, c, r]) => {
          const k = c === 'chase' ? CHASE_POOL.trunk[0] : null;
          dropLog(k ? chaseBanner(k) : n, c, k, r);
          idleBar(1);
        },
        [n, c, r]
      );
      await wait(p, 1300);
    }
  }
};
async function record(p, W, H, fn, base, touch, kind) {
  const dir = base + '_frames';
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  await p.evaluate(kind => {
    /* 燒入幀號與時間戳（戰場右側，不蓋 HUD） */
    const d = document.createElement('div');
    d.id = 'vidstamp';
    d.style.cssText =
      'position:fixed;right:4px;top:' +
      (PORT() ? 140 : 120) +
      'px;z-index:99;padding:2px 6px;background:#000;color:#fff;font:700 14px/1.2 monospace;pointer-events:none;white-space:pre';
    document.body.append(d);
    /* 放開蓄力（手動或自動）那一格記下段數：stg／max */
    const st0 = skillTick;
    window.VREL = [];
    window.skillTick = function (a) {
      const was = a.charge,
        o = st0.apply(this, arguments);
      if (was && !a.charge) VREL.push({ stg: a.stg, max: a.c.D.charge.max, auto: !!AI.on });
      return o;
    };
    window.VSTATE = () => {
      const b = $('bhS' + (kind === 'charge' ? VSLOT() : 0)),
        cs = b && getComputedStyle(b),
        am = b ? [...b.querySelectorAll('.am i')] : [],
        /* 亮著的彈匣格：實際算出來的底色是 --prog-hi（#b6b0a8），transition-delay 每格 40 ms 期間還是舊色 */
        lit = am.filter(i => getComputedStyle(i).backgroundColor === 'rgb(182, 176, 168)').length,
        il = document.querySelector('#pidle .i34 .ilast'),
        tr = il ? getComputedStyle(il).transform : 'none',
        rel = VREL.splice(0);
      return {
        lit,
        rl: b ? (b.querySelector('.rl') || {}).textContent || '' : '',
        nb: b ? (b.querySelector('.nb') || {}).textContent || '' : '',
        full: cs ? cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px' : false,
        stg: P.act && P.act.charge ? Math.floor(P.act.ch / P.act.c.D.charge.step + 1e-6) : -1,
        auto: S.auto,
        pid: Math.round($('pidle').getBoundingClientRect().top * 10) / 10,
        hmin: S.hmin ? 1 : 0,
        slx: tr === 'none' ? 0 : Math.round(new DOMMatrix(tr).m41 * 10) / 10,
        rel
      };
    };
    window.VSLOT = () => (S.skills[2] && S.skills[2].k === 'chargeslam' ? 2 : 0);
    window.VSTEP = f => {
      /* getAnimations() 只列還在作用的動畫，推過尾巴就不列了：前一格看過的也一起檢查 */
      const seen = (window.VANIM = window.VANIM || new Set());
      for (const a of document.getAnimations()) seen.add(a);
      DBG.step(1000 / 60);
      /* 凍結中 Web 動畫推到尾巴不會自己進 finished（onfinish 不觸發）：到尾就 finish() */
      for (const a of [...seen, ...document.getAnimations()]) {
        const e = a.effect && a.effect.getComputedTiming();
        if (a.playState === 'finished' || a.playState === 'idle') {
          seen.delete(a);
          continue;
        }
        if (e && isFinite(e.endTime) && a.currentTime >= e.endTime - 0.01 && a.playState !== 'finished') {
          /* 下一格 DBG.step 的 pause() 會把還沒送出的 finish 事件取消：onfinish 這裡直接呼叫一次 */
          const h = a.onfinish;
          a.onfinish = null;
          a.finish();
          if (h) h.call(a, new Event('finish'));
        }
      }
      $('vidstamp').textContent = `F ${String(f).padStart(4, '0')}  ${((f * 1000) / 60).toFixed(1).padStart(7)} ms`;
      return VSTATE();
    };
    DBG.freeze();
  }, kind);
  const log = [],
    cdp = await p.context().newCDPSession(p);
  let f = 0;
  REC = async ms => {
    const n = Math.round((ms * FPS) / 1000);
    for (let i = 0; i < n; i++, f++) {
      log.push(Object.assign({ f, ms: +((f * 1000) / FPS).toFixed(1) }, await p.evaluate(f => VSTEP(f), f)));
      /* CDP 直接截（Playwright 的 screenshot 會等頁面的動畫格，凍結時鐘下一張要 2 秒） */
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(dir, String(f).padStart(5, '0') + '.png'), Buffer.from(data, 'base64'));
    }
  };
  await fn(p, touch);
  fs.writeFileSync(base + '.json', JSON.stringify(log));
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    String(FPS),
    '-i',
    path.join(dir, '%05d.png'),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '18',
    '-movflags',
    '+faststart',
    base + '.mp4'
  ]);
  fs.rmSync(dir, { recursive: true, force: true });
  return f;
}
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const only = (process.env.BH_CLIPS || '').split(',').filter(Boolean);
  for (const [W, H, touch] of [
    [390, 844, 1],
    [1280, 720, 0]
  ])
    for (const k of Object.keys(CLIPS)) {
      if (only.length && !only.includes(k)) continue;
      const ctx = await b.newContext({
        viewport: { width: W, height: H },
        hasTouch: !!touch,
        isMobile: !!touch,
        deviceScaleFactor: 1
      });
      await ctx.route(/supabase/, r => r.abort());
      const p = await ctx.newPage();
      await p.goto(URL + '?dbg=1&seed=11&' + Date.now());
      await p.evaluate(() => localStorage.clear());
      await p.reload();
      await p.waitForTimeout(1200);
      await p.evaluate(touch => {
        proSkip();
        S.story.tips = 0;
        S.auto = 0;
        if (touch) DBG.safeArea(34, 47);
        Object.assign(S.camp, { forge: 20, watch: 26, scout: 4, house: 10, altar: 11, store: 5 });
        runNode(TRUNK_K[0]);
        S.log = [{ t: Date.now() - 6e4, n: '寒鐵之戒', c: 'it', r: 1 }];
        idleBar(1);
        for (const id of ['warn', 'warn2', 'banner']) $(id).style.visibility = 'hidden';
      }, touch);
      await p.waitForTimeout(800);
      const base = path.join(OUT, `${k}_${W}x${H}`),
        n = await record(p, W, H, CLIPS[k], base, touch, k);
      console.log(`✅ ${path.basename(base)}.mp4（${n} 格，${FPS} fps）`);
      await ctx.close();
    }
  await b.close();
})();
