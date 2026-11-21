/* battle-hud v1.3.3 §13-6 必交影片：裝填、蓄力（含蓄滿外框 120 ms、自動模式蓄滿才出手）、收起／展開 200 ms、最近一筆掉寶從右滑入 200 ms。
   用法：先開 python3 -m http.server 8000，再 node tools/bh_video.js [輸出資料夾]（預設 docs/production/evidence/battle-hud-v133/video）
   兩個尺寸（390×844 直立、1280×720 桌機）各錄一支，存成 mp4（要 ffmpeg；沒有就留 webm）。都是真的遊戲流程（真的彈匣、真的蓄力），只用 DBG 擺場景 */
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path'),
  { execFileSync } = require('child_process');
const OUT = path.resolve(
    process.argv[2] || path.join(__dirname, '..', 'docs/production/evidence/battle-hud-v133/video')
  ),
  URL = process.argv[3] || 'http://localhost:8000/';
fs.mkdirSync(OUT, { recursive: true });
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
    await p.waitForTimeout(800);
    for (let i = 0; i < 3; i++) {
      await p.evaluate(() => ((P.act = null), (P.cds = {}), (P.mp = ST.mp), useSlot(0)));
      await p.waitForTimeout(500);
    }
    await p.waitForTimeout(2600);
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
    await p.waitForTimeout(600);
    /* 手動：按住 Q（桌機）；直立用同一個 slotHeld（K.q） */
    await p.evaluate(() => ((S.auto = 0), (P.mp = ST.mp), (P.cds = {}), (K.q = 1), useSlot(2)));
    await p.waitForTimeout(1700);
    await p.evaluate(() => (K.q = 0));
    await p.waitForTimeout(900);
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
    await p.waitForTimeout(4000);
  },
  /* 收起／展開：▼ → 200 ms 往下滑 → 戰場一次改高；▲ → 200 ms 往上滑 */
  collapse: async (p, touch) => {
    /* 直立用觸控點（滑鼠一按遊戲會切回桌機模式） */
    const hit = q => (touch ? p.tap(q) : p.click(q));
    await p.waitForTimeout(800);
    await hit('#pidle .ihd');
    await p.waitForTimeout(1500);
    await hit('#pidle .ix');
    await p.waitForTimeout(1500);
    await hit('#pidle .ihd');
    await p.waitForTimeout(1200);
    await hit('#pidle .ihit');
    await p.waitForTimeout(1200);
  },
  /* 最近一筆掉寶（收起列 T34／C34）：換新時從右滑入 200 ms，然後停住（不做連續滾動） */
  slidein: async p => {
    await p.evaluate(() => DBG.hudMin(1));
    await p.waitForTimeout(800);
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
      await p.waitForTimeout(1300);
    }
  }
};
/* 錄影：CDP 螢幕串流（Page.startScreencast）收每一格與時間，再用 ffmpeg 照實際時間接成 mp4（Playwright 的錄影要它自己的 ffmpeg，雲端沒有） */
async function record(p, W, H, fn, base, touch) {
  const cdp = await p.context().newCDPSession(p),
    frames = [];
  cdp.on('Page.screencastFrame', f => {
    frames.push({ t: f.metadata.timestamp, d: f.data });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  const t0 = Date.now() / 1000;
  await fn(p, touch);
  await cdp.send('Page.stopScreencast');
  const t1 = Date.now() / 1000,
    dir = base + '_frames';
  fs.mkdirSync(dir, { recursive: true });
  let list = '';
  frames.forEach((f, i) => {
    const n = path.join(dir, String(i).padStart(5, '0') + '.jpg');
    fs.writeFileSync(n, Buffer.from(f.d, 'base64'));
    const nx = i + 1 < frames.length ? frames[i + 1].t : Math.max(f.t + 0.04, t1 - t0 + frames[0].t);
    list += `file '${n}'\nduration ${Math.max(0.001, nx - f.t).toFixed(4)}\n`;
  });
  if (frames.length) list += `file '${path.join(dir, String(frames.length - 1).padStart(5, '0') + '.jpg')}'\n`;
  fs.writeFileSync(dir + '.txt', list);
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    dir + '.txt',
    '-vf',
    `scale=${W}:${H}:flags=neighbor,fps=30`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    base + '.mp4'
  ]);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(dir + '.txt', { force: true });
  return frames.length;
}
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  for (const [W, H, touch] of [
    [390, 844, 1],
    [1280, 720, 0]
  ])
    for (const k of Object.keys(CLIPS)) {
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
        n = await record(p, W, H, CLIPS[k], base, touch);
      console.log(`✅ ${path.basename(base)}.mp4（${n} 格）`);
      await ctx.close();
    }
  await b.close();
})();
