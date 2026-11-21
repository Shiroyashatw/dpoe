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
    process.argv[2] || path.join(__dirname, '..', 'docs/production/evidence/battle-hud-v133-fix3/video')
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
  /* dpoe-hud133-fix3 補錄（UIUX 複審 §7）—— 危急紅邊 1 級→2 級→回來（最大生命 1000、沒有能量護盾上限；每 300 ms 改一次生命） */
  danger: async p => {
    await p.evaluate(() => {
      DBG.clear();
      ST.hp = 1000;
      P.hp = 500;
      DBG.es(0, 0);
    });
    await wait(p, 500);
    for (const hp of [400, 340, 300, 250, 210, 190, 150, 100, 150, 190, 210, 300, 340, 400]) {
      await p.evaluate(hp => ((ST.hp = 1000), (P.hp = hp)), hp);
      await wait(p, 300);
    }
    await wait(p, 300);
  },
  /* 能量護盾充能前緣：300 / 600，4 秒延遲剩 1 秒 → 每秒 12.5% 充到滿，前緣 2 px 跟著走、滿了消失 */
  esrecharge: async p => {
    await p.evaluate(() => {
      DBG.clear();
      ST.hp = 1000;
      P.hp = 1000;
      DBG.es(300, 600);
      P.lastHurt = G.t - 3;
    });
    await wait(p, 5600);
  },
  /* 格擋弧：412 / 600 → 一擊打碎（碎盾閃 --block-hi 150 ms）→ 斷續段回滿（BV.re 8 秒；站著 5 秒） */
  blkbreak: async p => {
    await p.evaluate(() => {
      DBG.clear();
      DBG.block(412, 600);
    });
    await wait(p, 500);
    await p.evaluate(() => absorb(99999));
    await wait(p, 8800);
  },
  /* Tab 走一圈：每 300 ms 按一次 Tab，記下焦點在哪、框長怎樣 */
  tabwalk: async p => {
    await p.evaluate(() => {
      DBG.clear();
      DBG.block(412, 600);
      document.activeElement && document.activeElement.blur();
    });
    await wait(p, 300);
    for (let i = 0; i < 24; i++) {
      await p.keyboard.press('Tab');
      await wait(p, 300);
    }
  },
  /* 命中頓幀＋震動：地震術打中 3 隻怪（skills.js actHit quake → shake(0.1)）；hitstop() 程式裡沒有人呼叫 */
  hitshake: async p => {
    await p.evaluate(() => {
      S.eq.weapon = mkItem(BASES.find(x => x.wt === 'mace').id, 10, 0);
      S.skills[0] = { k: 'quake', so: [null, null], n: 2 };
      S.lib.sk.quake = 1;
      ST = stats();
      hudBar();
      DBG.clear();
      for (let i = 0; i < 3; i++)
        Object.assign(spawnMob(Object.values(MOBS)[0], P.x + 50 + i * 12, P.y + 6 * i, 1, false), { aggro: 0, spd: 0 });
    });
    await wait(p, 400);
    for (let i = 0; i < 3; i++) {
      await p.evaluate(
        () => ((P.act = null), (P.cds = {}), (P.mp = ST.mp), (M.x = IW / 2 + 200), (M.y = cvH() / 2), useSlot(0))
      );
      await wait(p, 900);
    }
  },
  collapserm: (p, touch) => CLIPS.collapse(p, touch),
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
        rel,
        /* fix3：危急紅邊級數、生命比例；能量護盾、前緣；格擋值、碎盾閃；焦點；震動（render.js 位移上限 14×trauma²）、頓幀 */
        vig: $('bhVig').classList.contains('on') ? ($('bhVig').classList.contains('l2') ? 2 : 1) : 0,
        hpf: Math.round((P.hp / ST.hp) * 1000) / 1000,
        es: Math.round(P.es || 0),
        esw: (() => {
          const i = document.querySelector('#bhp .es i');
          return i && i.getClientRects().length ? Math.round(i.getBoundingClientRect().width * 10) / 10 : null;
        })(),
        esem: (() => {
          const e = document.querySelector('#bhp .es em');
          return e && e.getClientRects().length ? Math.round(e.getBoundingClientRect().left) : null;
        })(),
        bv: Math.round(P.bv || 0),
        bre: P.bvRe != null ? 1 : 0,
        brk: $('bhBlk').classList.contains('brk') ? 1 : 0,
        foc: (() => {
          const e = document.activeElement;
          if (!e || e === document.body) return null;
          const c = getComputedStyle(e);
          return {
            q: e.id
              ? '#' + e.id
              : e.tagName.toLowerCase() +
                '.' +
                [...e.classList].join('.') +
                (e.textContent ? '「' + e.textContent.trim().slice(0, 8) + '」' : ''),
            fv: e.matches(':focus-visible') ? 1 : 0,
            ol: c.outlineStyle === 'none' ? 'none' : `${c.outlineWidth} ${c.outlineOffset} ${c.outlineColor}`,
            tf: c.transform
          };
        })(),
        trauma: Math.round(G.trauma * 1000) / 1000,
        amp: Math.round(14 * G.trauma * G.trauma * 100) / 100,
        hs: Math.round((G.hs || 0) * 1000)
      };
    };
    /* setTimeout 跟著虛擬時鐘（碎盾閃 BH.brk 150 ms 等）：每格推完再跑到期的 */
    const VT = [],
      st0t = window.setTimeout.bind(window),
      ct0 = window.clearTimeout.bind(window);
    let vid = 1e6;
    window.setTimeout = (fn, ms = 0, ...a) => {
      if (typeof fn !== 'function') return st0t(fn, ms);
      VT.push({ id: ++vid, at: performance.now() + (+ms || 0), fn, a });
      return vid;
    };
    window.clearTimeout = id => {
      const i = VT.findIndex(t => t.id === id);
      i >= 0 ? VT.splice(i, 1) : ct0(id);
    };
    window.VTIMERS = () => {
      const now = performance.now();
      for (const t of VT.filter(t => t.at <= now + 0.01)) VT.splice(VT.indexOf(t), 1), t.fn(...t.a);
    };
    window.VSLOT = () => (S.skills[2] && S.skills[2].k === 'chargeslam' ? 2 : 0);
    window.VSTEP = f => {
      /* getAnimations() 只列還在作用的動畫，推過尾巴就不列了：前一格看過的也一起檢查 */
      const seen = (window.VANIM = window.VANIM || new Set());
      for (const a of document.getAnimations()) seen.add(a);
      DBG.step(1000 / 60);
      VTIMERS();
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
        deviceScaleFactor: 1,
        reducedMotion: k === 'collapserm' ? 'reduce' : 'no-preference'
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
