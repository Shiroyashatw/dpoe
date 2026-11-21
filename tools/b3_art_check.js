const { chromium } = require('playwright');
/* B3 美術接線（docs/production/specs/M2-12-B3-art.md）的斷言與截圖：牌匾寬度公式（短名 124、長名封頂 220、兩行換 plq-64）、
   整數倍縮放（畫面像素＝原圖 ×DPR 最近鄰）、印章位置（W−52, 8／18）、懸停框（2 px --focus 外推 2＋1 px --scene-void）、
   呼吸 a(t)、施工塵土（顆數、最後一顆消失時間）、減少動態（不呼吸、不出塵土）、全畫面 L*>80 亮區（§9）。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/b3_art_check.js [寬 390] [高 844] [網址]
   截圖與量測表存 docs/production/evidence/dpoe-b3-art/（SHOTS 可改）；有 ❌ 結束碼 1 */
const path = require('path'),
  fs = require('fs');
const W = +process.argv[2] || 390,
  H = +process.argv[3] || 844,
  URL = process.argv[4] || 'http://localhost:8000/',
  PORTM = H > W,
  MOB = PORTM,
  tag = W + 'x' + H,
  OUT = process.env.SHOTS || path.join(__dirname, '..', 'docs', 'production', 'evidence', 'dpoe-b3-art-fix2');
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const rows = [];
const ok = (n, v, goal = '', got = '', file = '') => {
  if (!v) fail++;
  const g = typeof got === 'string' ? got : JSON.stringify(got);
  rows.push([n, tag, goal, g, v ? '過' : '不過', file]);
  console.log((v ? '✅ ' : '❌ ') + n + (g ? ' ' + g : ''));
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const mk = async (rm = 'no-preference') => {
    const ctx = await b.newContext({
      viewport: { width: W, height: H },
      hasTouch: MOB,
      isMobile: MOB,
      deviceScaleFactor: 2,
      reducedMotion: rm
    });
    await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage();
    p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(URL + '?dbg=1&seed=7&' + Date.now());
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(1200);
    await p.evaluate(port => {
      proSkip();
      S.story.tips = 0;
      S.orient = 'p';
      applyOrient();
      S.auto = 1;
      Object.assign(S.camp, { forge: 5, watch: 26, scout: 4, house: 10, altar: 11, store: 5 });
      runNode(TRUNK_K[0]);
      act('camp');
      /* 鍛造台買得起：照下一級的花費補足 */
      window.rich = (b = 'forge') => {
        const c = campNext(b),
          M = MAT();
        M.soul += (c.soul || 0) * 3;
        if (c.wood) matAdd('wood', 0, c.wood * 3);
        for (const k in c.mats || {}) matAdd(...matOf(k), c.mats[k] * 3);
        S.gold += (c.gold || 0) * 3;
        for (const k in c.cur || {}) M[k] = (M[k] || 0) + c.cur[k] * 3;
      };
      rich();
      /* 鏡頭對準鍛造台（測試用：panT 設很大＝不自動回主角） */
      G.pan = G.props.find(k => k.k === 'forge').x - P.x;
      G.panT = 1e9;
    }, PORTM);
    await p.waitForTimeout(1500);
    return p;
  };
  const shot = async (p, n) => {
    const f = `${tag}_${n}.png`;
    await p.screenshot({ path: path.join(OUT, f) });
    return f;
  };
  /* 截圖裡 L*>80 的像素比例（sRGB → CIELAB，D65） */
  const bright = async (p, f) =>
    p.evaluate(
      async src => {
        const im = new Image();
        im.src = 'data:image/png;base64,' + src;
        await im.decode();
        const c = document.createElement('canvas');
        c.width = im.width;
        c.height = im.height;
        const g = c.getContext('2d');
        g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data,
          lin = v => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        let n = 0,
          nc = 0;
        for (let i = 0; i < d.length; i += 4) {
          const r = lin(d[i]),
            gg = lin(d[i + 1]),
            bb = lin(d[i + 2]),
            X = (0.4124 * r + 0.3576 * gg + 0.1805 * bb) / 0.95047,
            Y = 0.2126 * r + 0.7152 * gg + 0.0722 * bb,
            Z = (0.0193 * r + 0.1192 * gg + 0.9505 * bb) / 1.08883,
            f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116),
            L = 116 * f(Y) - 16,
            A = 500 * (f(X) - f(Y)),
            B = 200 * (f(Y) - f(Z));
          if (L > 80) n++;
          if (Math.hypot(A, B) > 40) nc++;
        }
        const t = d.length / 4;
        return { L80: +((100 * n) / t).toFixed(2), C40: +((100 * nc) / t).toFixed(2) };
      },
      fs.readFileSync(path.join(OUT, f)).toString('base64')
    );
  /* 畫面某一塊跟原圖 ×DPR 最近鄰逐像素比（整數倍、不平滑） */
  const same = (p, src, sx, sy, sw, sh, X, Y) =>
    p.evaluate(
      async ([src, sx, sy, sw, sh, X, Y]) => {
        const im = new Image();
        im.src = src;
        await im.decode();
        const k = DPR,
          c = document.createElement('canvas');
        c.width = sw * k;
        c.height = sh * k;
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.drawImage(im, sx, sy, sw, sh, 0, 0, sw * k, sh * k);
        const a = g.getImageData(0, 0, c.width, c.height).data,
          b = CX.getImageData(X * k, Y * k, sw * k, sh * k).data;
        let bad = 0,
          n = 0;
        for (let i = 0; i < a.length; i += 4) {
          if (a[i + 3] < 255) continue;
          n++;
          if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 3) bad++;
        }
        return { n, bad, dpr: k };
      },
      [src, sx, sy, sw, sh, X, Y]
    );
  const P = p =>
    p.evaluate(() =>
      G.props.map(k => {
        const x = (k.x - G.cam.x) * ZOOM + IW / 2,
          y = (k.y - G.cam.y) * ZOOM + cvH() / 2;
        return {
          k: k.k,
          n: plqTxt(k),
          pr: k._pr,
          out: x < 0 || x > IW || y < 0 || y > cvH(),
          W: k._pl.W,
          H: k._pl.H,
          L: k._pl.L,
          can: k._pl.can
        };
      })
    );
  const p = await mk();
  /* ---- 寬度公式 ---- */
  const lay = await p.evaluate(() => {
    const tw = (t, fs = 14) => (
      (CX.font = `700 ${fs}px "Noto Sans TC", sans-serif`), Math.ceil(CX.measureText(t).width)
    );
    return {
      short: plqLay('倉庫', 14),
      forge: { ...plqLay('鍛造台 Lv5', 14), exp: Math.max(124, 92 + tw('鍛造台 Lv5')) },
      scout: { ...plqLay('Scout Camp Lv12', 14), exp: Math.max(124, 92 + tw('Scout Camp Lv12')) },
      two: plqLay('Scout Encampment of the Far Ridge Lv12', 14),
      cap: plqLay('Ｗ'.repeat(30), 14),
      fs18: plqLay('鍛造台 Lv5', 18)
    };
  });
  ok('寬度：短名「倉庫」W＝124（下限）', lay.short.W === 124 && lay.short.H === 44, 'W 124 H 44', lay.short);
  ok(
    '寬度：「鍛造台 Lv5」W＝max(124, 32＋字寬＋60)',
    lay.forge.W === lay.forge.exp && lay.forge.H === 44,
    `W ${lay.forge.exp}（規格字型 161）`,
    lay.forge.W
  );
  ok(
    '寬度：「Scout Camp Lv12」一行 W＝32＋字寬＋60 ≤ 220',
    lay.scout.W === lay.scout.exp && lay.scout.W <= 220 && lay.scout.H === 44,
    `W ${lay.scout.exp}（規格字型 210）`,
    lay.scout.W
  );
  ok(
    '兩行：放不下換兩行 H＝64（plq-64）、W ≤ 220、每行 ≤ 128',
    lay.two.H === 64 && lay.two.W <= 220 && lay.two.L.length === 2,
    'H 64、W ≤220',
    lay.two
  );
  ok('封頂：超長名 W＝220（不縮字）', lay.cap.W === 220 && lay.cap.H === 64, 'W 220', { W: lay.cap.W, H: lay.cap.H });
  /* ---- 營地實際牌匾 ---- */
  const L0 = await P(p),
    u = await p.evaluate(() => plqU());
  ok(
    '牌匾數＝營地擺設數（錨點在畫面外的不畫，§12-2）',
    L0.length === 6 && L0.every(k => !!k.pr === !k.out),
    '6 座；畫面外 0 個矩形',
    L0.map(k => k.n + (k.out ? '（畫面外）' : '')).join('、')
  );
  ok(
    '整數：每座牌匾的螢幕位置與大小都是整數、高 44×u（u＝1）',
    u === 1 &&
      L0.filter(k => k.pr).every(k => k.pr.every(Number.isInteger) && k.pr[3] === k.H * u && k.pr[2] === k.W * u),
    'u 1、高 44',
    L0.filter(k => k.pr)
      .map(k => k.pr.join(','))
      .join(' ')
  );
  /* dpoe-b3-art-fix2（§12-3）：牌匾寫設施名（名詞表），Lv 取那座設施 */
  const LV = { forge: '鍛造台 Lv5', device: '瞭望台 Lv26', asc: '祭壇 Lv11', stash: '倉房 Lv5' };
  ok(
    '牌匾寫設施名（§12-3）：鍛造台 Lv5、瞭望台 Lv26、祭壇 Lv11、倉房 Lv5；練習區、山海寶盒只有名字',
    L0.every(k => (LV[k.k] ? k.n === LV[k.k] : !/Lv/.test(k.n))),
    Object.values(LV).join('、'),
    L0.map(k => k.n).join('、')
  );
  const fg = L0.find(k => k.k === 'forge');
  ok('買得起：鍛造台有印章', fg.can, 'can true', fg.can);
  const sL = await same(p, 'img/ui/plq-44.png', 0, 0, 26, 10, fg.pr[0], fg.pr[1]),
    sR = await same(p, 'img/ui/plq-44.png', 98, 0, 26, 8, fg.pr[0] + fg.W - 26, fg.pr[1]),
    sS = await same(p, 'img/ui/seal-28-btn2-cap.png', 0, 0, 28, 28, fg.pr[0] + fg.W - 52, fg.pr[1] + 8);
  ok('整數倍：牌匾左段、右段畫面像素＝plq-44 ×DPR 最近鄰（逐像素）', sL.n > 0 && !sL.bad && !sR.bad, '不一致 0', {
    dpr: sL.dpr,
    左: `${sL.bad}/${sL.n}`,
    右: `${sR.bad}/${sR.n}`
  });
  ok(
    '印章位置：x W−52、y 8，28×28，畫面像素＝seal-28-btn2-cap ×DPR（逐像素，不透明格）',
    sS.n > 0 && sS.bad <= 0,
    '不一致 0',
    `${sS.bad}/${sS.n}（印章 ${fg.pr[0] + fg.W - 52},${fg.pr[1] + 8}）`
  );
  /* ---- 呼吸 ---- */
  const br = await p.evaluate(() => [0, 0.3125, 0.625, 1.25, 2.5].map(t => +plqA(t).toFixed(3)));
  ok(
    '呼吸 a(t)：0.30 → 0.75（625 ms）→ 0.30（1,250 ms），0.8 Hz',
    br.join() === '0.3,0.525,0.75,0.3,0.3',
    '0.3,0.525,0.75,0.3,0.3',
    br.join()
  );
  /* ---- 懸停框 ---- */
  const hv = await p.evaluate(fg => {
    G.hov = G.props.find(k => k.k === 'forge');
    return new Promise(r =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const [X, Y, w, h] = G.hov._pr,
            px = (x, y) => [...CX.getImageData(x * DPR, y * DPR, 1, 1).data.slice(0, 3)],
            hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
          r({
            in: px(X - 3, Y + (h >> 1)),
            out: px(X - 5, Y + (h >> 1)),
            gap: px(X - 1, Y + (h >> 1)),
            focus: hex(PAL.focus),
            vd: hex(PAL.sceneVoid)
          });
        })
      )
    );
  });
  ok(
    '懸停：外推 2 px 的 2 px --focus（x−3）＋最外 1 px --scene-void（x−5）',
    hv.in.join() === hv.focus.join() && hv.out.join() === hv.vd.join(),
    `${hv.focus}／${hv.vd}`,
    `${hv.in}／${hv.out}`
  );
  /* 對照：同一畫面不畫牌匾（只換掉 drawPlaques 一幀） */
  await p.evaluate(() => {
    window._dp = drawPlaques;
    drawPlaques = () => {};
  });
  await p.waitForTimeout(150);
  const fBase = await shot(p, 'camp_home_noplaque');
  const lum0 = await bright(p, fBase);
  await p.evaluate(() => (drawPlaques = window._dp));
  await p.waitForTimeout(150);
  const fHome = await shot(p, 'camp_home_seal_hover');
  const lum = await bright(p, fHome);
  /* 有懸停框的畫面只記錄（§12-1：量亮區不能有懸停／焦點框，正式量法在下面營地首頁） */
  rows.push([
    '亮區（只記錄，有懸停框）',
    tag,
    '—',
    `${lum.L80}%（不畫牌匾 ${lum0.L80}%，牌匾層 +${(lum.L80 - lum0.L80).toFixed(2)}）`,
    '記錄',
    fHome
  ]);
  /* C*>40 只記錄：營地底圖本身就超過（不畫牌匾的對照），牌匾層灰印章 0（規格 §6） */
  rows.push([
    '彩度 C*>40（只記錄）',
    tag,
    '≤5%',
    `${lum.C40}%（不畫牌匾 ${lum0.C40}%，牌匾層 +${(lum.C40 - lum0.C40).toFixed(2)}%）`,
    lum.C40 - lum0.C40 <= 0.5 ? '牌匾層不增加' : '牌匾層增加',
    fHome
  ]);
  console.log(`ℹ️ 彩度 C*>40 ${lum.C40}%（不畫牌匾 ${lum0.C40}%）`);
  /* ---- 塵土 ---- */
  const d1 = await p.evaluate(
    () =>
      new Promise(r => {
        G.hov = null;
        DUST.p = [];
        DUST.last = {};
        /* 顆數照滿速算（headless 幀慢會觸發掉幀減半，減半另有一條） */
        DUST.ft = [];
        DUST.half = 0;
        campUp('forge');
        campDust('forge');
        const now = performance.now(),
          n = DUST.p.length,
          end = Math.max(...DUST.p.map(d => d.t0 + d.T)) - now,
          sz = [...new Set(DUST.p.map(d => d.s))].sort().join('/');
        setTimeout(() => r({ n, end: Math.round(end), sz, left: DUST.p.length }), 700);
      })
  );
  ok(
    '塵土：一般升級 16 顆、最後一顆 ≤ 600 ms 消失',
    d1.n === 16 && d1.end <= 600 && d1.left === 0,
    '16 顆、≤600 ms',
    d1
  );
  await p.evaluate(() => (rich(), campUp('forge'), campDust('forge')));
  await p.waitForTimeout(140);
  const fDust = await shot(p, 'camp_dust_quick');
  await p.waitForTimeout(400);
  await p.evaluate(() => (rich(), (DUST.last = {}), campUp('forge'), campDust('forge')));
  await p.waitForTimeout(220);
  const fDust2 = await shot(p, 'camp_dust_normal');
  const d2 = await p.evaluate(
    () =>
      new Promise(r => {
        DUST.p = [];
        DUST.ft = [];
        DUST.half = 0;
        rich();
        campUp('forge');
        campDust('forge');
        const now = performance.now(),
          n = DUST.p.length,
          end = Math.max(...DUST.p.map(d => d.t0 + d.T)) - now;
        setTimeout(() => r({ n, end: Math.round(end), left: DUST.p.length }), 300);
      })
  );
  ok(
    '塵土：10 秒內連升 6 顆、最後一顆 ≤ 250 ms 消失',
    d2.n === 6 && d2.end <= 250 && d2.left === 0,
    '6 顆、≤250 ms',
    d2,
    fDust
  );
  const cap = await p.evaluate(() => {
    DUST.p = [];
    DUST.last = {};
    for (let i = 0; i < 4; i++) (DUST.last = {}), campDust('forge');
    return new Promise(r => setTimeout(() => r(DUST.p.filter(d => d.on).length), 260));
  });
  ok('塵土：同時最多 32 顆（4 次 64 顆排隊）', cap <= 32 && cap > 0, '≤32', cap, fDust2);
  /* ---- 長名、兩行、130%、英文 ---- */
  await p.evaluate(() => {
    window.N0 = G.props.map(k => k.n);
    G.props.find(k => k.k === 'prac').n = 'Scout Camp Lv12'; /* 練習區不是設施，字就是這一串 */
    /* 牌匾寫設施名（§12-3）：長名改設施名 */
    window.CN0 = { ...CAMPN };
    CAMPN.forge = 'Scout Encampment of the Far Ridge';
  });
  await p.waitForTimeout(200);
  const L1 = await P(p);
  const fLong = await shot(p, 'camp_plaque_long_two');
  ok(
    '長名一行、兩行換 plq-64（實畫）',
    L1.find(k => k.k === 'prac').H === 44 && L1.find(k => k.k === 'forge').H === 64 && L1.every(k => k.W <= 220),
    '一行 44、兩行 64、W ≤220',
    L1.map(k => `${k.n}:${k.W}×${k.H}`).join(' '),
    fLong
  );
  const s64 = await same(p, 'img/ui/plq-64.png', 0, 0, 26, 10, ...L1.find(k => k.k === 'forge').pr.slice(0, 2));
  ok('兩行版畫面像素＝plq-64 ×DPR（左段上緣）', s64.n > 0 && !s64.bad, '不一致 0', `${s64.bad}/${s64.n}`);
  await p.evaluate(() => {
    const EN = {
      device: 'Map Device',
      asc: 'Ascendancy Stele',
      stash: 'Stash',
      forge: 'Forge',
      prac: 'Training Ground',
      box: 'Mountain-Sea Box'
    };
    for (const k of G.props) k.n = EN[k.k] + 'Ｘ'.repeat(Math.ceil(EN[k.k].length * 0.4 * 0.5));
    const EB = { forge: 'Forge', watch: 'Watchtower', altar: 'Altar', store: 'Storehouse' };
    for (const b in EB) CAMPN[b] = EB[b] + 'Ｘ'.repeat(Math.ceil(EB[b].length * 0.4 * 0.5));
  });
  await p.waitForTimeout(200);
  const fEn = await shot(p, 'camp_plaque_en');
  const L2 = await P(p);
  ok(
    '英文 +40% 假字：W ≤ 220、放不下換兩行、不縮字（14）',
    L2.every(k => k.W <= 220),
    'W ≤220',
    L2.map(k => `${k.W}×${k.H}`).join(' '),
    fEn
  );
  await p.evaluate(() => {
    G.props.forEach((k, i) => (k.n = N0[i]));
    Object.assign(CAMPN, CN0);
    S.fs = 130;
    fsApply();
  });
  await p.waitForTimeout(200);
  const f130 = await shot(p, 'camp_plaque_fs130');
  const L3 = await p.evaluate(() => G.props.map(k => ({ n: plqTxt(k), fs: k._pl.fs, W: k._pl.W, H: k._pl.H })));
  ok(
    '文字 130%：字 18、W ≤ 220、高 44／64',
    L3.every(k => k.fs === 18 && k.W <= 220 && (k.H === 44 || k.H === 64)),
    '字 18',
    L3.map(k => `${k.n}:${k.W}×${k.H}`).join(' '),
    f130
  );
  await p.evaluate(() => ((S.fs = 100), fsApply(), G.props.forEach((k, i) => (k.n = N0[i]))));
  /* ---- dpoe-b3-art-fix：營地首頁 ≥3 顆印章（四座設施都買得起）、實際首頁亮區 ---- */
  const home = await p.evaluate(() => {
    /* 瞭望台 26、祭壇 11、倉房 5 都是滿級：降下來才有下一級可買 */
    Object.assign(S.camp, { watch: 10, altar: 5, store: 2 });
    for (const b of ['forge', 'watch', 'altar', 'store']) rich(b);
    G.pan = 0;
    G.panT = 1e9;
    /* 量亮區、截圖不能有懸停／焦點框（§12-1） */
    G.hov = null;
    document.activeElement && document.activeElement.blur();
    return new Promise(r =>
      setTimeout(
        () =>
          r(
            G.props
              .filter(
                k =>
                  /* 印章本身（W−52 起 28×28，y 8／18）整顆在畫面內 */
                  k._pl.can &&
                  k._pr &&
                  k._pr[0] + k._pr[2] - 52 >= 0 &&
                  k._pr[0] + k._pr[2] - 24 <= IW &&
                  k._pr[1] + (k._pl.H === 44 ? 8 : 18) >= 0 &&
                  k._pr[1] + (k._pl.H === 44 ? 36 : 46) <= cvH()
              )
              .map(k => k.k)
          ),
        400
      )
    );
  });
  await p.mouse.move(W - 2, H - 2);
  /* 前面升級講的那一句（#warn）講完再量：不算進營地首頁的亮區 */
  await p.waitForFunction(() => !SAY.length && !$('warn').classList.contains('on') && $('warn2').hidden, null, {
    timeout: 20000
  });
  await p.waitForTimeout(400);
  const noFrame = () => p.evaluate(() => !G.hov && !document.querySelector('#plqs :focus'));
  await p.evaluate(() => ((window._dp = drawPlaques), (drawPlaques = () => {})));
  await p.waitForTimeout(150);
  const fNo = await shot(p, 'home_noplaque'),
    lum20 = await bright(p, fNo);
  await p.evaluate(() => (drawPlaques = window._dp));
  await p.waitForTimeout(150);
  const nf = await noFrame();
  const fHome2 = await shot(p, 'home_plaque');
  const lum2 = await bright(p, fHome2);
  /* §12-2：牌匾和別座點擊圈、別的牌匾（間距 4）、安全框外、障礙（繼續刷，間距 8）的重疊 */
  const ov = await p.evaluate(() => {
    const ox = IW / 2 / ZOOM - G.cam.x,
      oy = cvH() / 2 / ZOOM - G.cam.y,
      sf = plqSafe(),
      cl = (v, a, b) => Math.max(a, Math.min(b, v)),
      meet = (A, B, g) =>
        A[0] < B[0] + B[2] + g && B[0] < A[0] + A[2] + g && A[1] < B[1] + B[3] + g && B[1] < A[1] + A[3] + g,
      bad = [];
    for (const k of G.props) {
      const A = k._pr;
      if (!A) continue;
      for (const o of G.props) {
        if (o === k) continue;
        const x = (o.x + ox) * ZOOM,
          y = (o.y - 25 + oy) * ZOOM;
        if (Math.hypot(x - cl(x, A[0] - 4, A[0] + A[2] + 4), y - cl(y, A[1] - 4, A[1] + A[3] + 4)) < (o.r + 20) * ZOOM)
          bad.push(`${k.k}×${o.k} 本體`);
        if (o._pr && meet(A, o._pr, 4) && k.k < o.k) bad.push(`${k.k}×${o.k} 牌匾`);
      }
      if (A[0] < sf.l || A[0] + A[2] > sf.r || A[1] < sf.top || A[1] + A[3] > sf.b) bad.push(`${k.k} 安全框外`);
      for (const B of sf.ob) if (meet(A, B, 8)) bad.push(`${k.k}×障礙 ${B.map(Math.round)}`);
    }
    return {
      bad,
      n: G.props.filter(k => k._pr).length,
      sf: [sf.l, sf.r, sf.top, sf.b].map(Math.round).join(','),
      pr: G.props.map(k => `${k.k}:${k._pr ? k._pr.join(',') : '畫面外'}`).join(' ')
    };
  });
  ok(
    '牌匾不蓋別座點擊圈、別的牌匾（≥4）、不出安全框（左右 8、頂列＋8、HUD−8）、避開繼續刷（§12-2）',
    ov.bad.length === 0 && ov.n >= 4,
    '重疊 0',
    `重疊 ${ov.bad.length}${ov.bad.length ? '：' + ov.bad.join('、') : ''}；畫了 ${ov.n} 座；安全框 ${ov.sf}；${ov.pr}`,
    fHome2
  );
  ok('首頁截圖沒有懸停／焦點框', nf, 'G.hov null、#plqs 沒焦點', nf, fHome2);
  /* §9 只要求 390×844、1280×720；其他尺寸只記錄 */
  ok(
    '營地首頁（鏡頭在主角）畫面內看得到整顆的印章 ≥3 顆',
    home.length >= 3 || !['390x844', '1280x720'].includes(tag),
    '≥3（390、1280）',
    home.length + ' 顆：' + home.join('、'),
    fHome2
  );
  /* §12-1：營地首頁兩條（390、1280 要過；其他尺寸只記錄）；戰鬥畫面仍 ≤2.0% 不在這裡 */
  const dL = +(lum2.L80 - lum20.L80).toFixed(2),
    must = ['390x844', '1280x720'].includes(tag);
  ok(
    '亮區 (a)：營地首頁全畫面 L*>80 ≤ 3.0%（沒有懸停／焦點框）',
    lum2.L80 <= 3 || !must,
    '≤3.0%',
    `${lum2.L80}%（C*>40 ${lum2.C40}%）${must ? '' : '（只記錄）'}`,
    fHome2
  );
  ok(
    '亮區 (b)：牌匾層增量（同鏡頭有牌匾減無牌匾）≤ 1.0 個百分點',
    dL <= 1 || !must,
    '≤1.0',
    `+${dL}（有 ${lum2.L80}%－無 ${lum20.L80}%）${must ? '' : '（只記錄）'}`,
    fNo
  );
  /* ---- 還沒蓋：Lv0 設施裡下一個解鎖那座畫地基虛線＋鎖、牌匾沒有印章；其他 Lv0 不畫地基 ---- */
  const un = await p.evaluate(() => {
    G.hov = null;
    S.camp.watch = 0;
    S.camp.store = 0;
    rich('watch');
    rich('store');
    const nx = plqNext();
    return new Promise(r =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const k = G.props.find(k => PLQ_B[k.k] === nx),
            o = G.props.find(k => PLQ_B[k.k] && PLQ_B[k.k] !== nx && !S.camp[PLQ_B[k.k]]),
            cx = Math.round((k.x - G.cam.x) * ZOOM + IW / 2),
            cy = Math.round((k.y - 25 - G.cam.y) * ZOOM + cvH() / 2),
            d = CX.getImageData((cx - 8) * DPR, (cy - 8) * DPR, 16 * DPR, 16 * DPR).data,
            hex = [1, 3, 5].map(i => parseInt(PAL.txLock.slice(i, i + 2), 16));
          let n = 0;
          for (let i = 0; i < d.length; i += 4)
            if (Math.abs(d[i] - hex[0]) + Math.abs(d[i + 1] - hex[1]) + Math.abs(d[i + 2] - hex[2]) <= 6) n++;
          r({ nx, k: k.k, off: k._pl.off, can: k._pl.can, other: o && [o.k, o._pl.off], lockPx: n });
        })
      )
    );
  });
  const fUn = await shot(p, 'fix_camp_unbuilt');
  ok(
    '還沒蓋：只有下一個解鎖那座（Lv0 最快買得起）畫鎖 16（--tx-lock）＋地基虛線，買得起也不出印章',
    un.off && !un.can && un.lockPx >= 8 && un.other && un.other[1] === false,
    'off true、can false、鎖像素 ≥8、另一座 Lv0 不畫',
    un,
    fUn
  );
  await p.evaluate(() => Object.assign(S.camp, { watch: 10, store: 2 }));
  /* ---- 施工縮放 1→1.03→1（600 ms，中心在下緣中間）；連升不縮 ---- */
  const scl = await p.evaluate(() => {
    const now = performance.now(),
      at = (ms, q) => ((DUST.up.forge = { t: now - ms, q }), +plqScale('forge', now).toFixed(4));
    const r = {
      s: [0, 150, 300, 450, 600].map(ms => at(ms)),
      back: [300, 340, 380, 420, 450, 480, 520, 560, 599].map(ms => at(ms)),
      quick: at(300, true)
    };
    DUST.up = {};
    return r;
  });
  ok(
    '施工曲線（§12-7）：前段 ease-out（150 ms＝1.02625）、後段 ease-in-out（450 ms＝1.015、不低於 1、一路變小，不再 ease-out-back）',
    Math.abs(scl.s[1] - 1.0263) < 2e-4 &&
      Math.abs(scl.s[3] - 1.015) < 2e-4 &&
      scl.back.every((v, i, a) => v >= 1 && v <= 1.03 && (!i || v <= a[i - 1])),
    '1.0263、1.015、單調',
    scl.back.join(',')
  );
  ok(
    '施工：牌匾 1→1.03（300 ms）→1（600 ms）；連升（250 ms 那段）不縮放',
    scl.s[0] === 1 &&
      Math.abs(scl.s[2] - 1.03) < 1e-3 &&
      scl.s[4] === 1 &&
      Math.max(...scl.s) < 1.04 &&
      scl.quick === 1,
    '1、1.03、1；連升 1',
    scl
  );
  const sclPx = await p.evaluate(
    () =>
      new Promise(r => {
        G.pan = G.props.find(k => k.k === 'forge').x - P.x;
        rich();
        DUST.last = {};
        campUp('forge');
        campDust('forge');
        setTimeout(() => r(+plqScale('forge').toFixed(3)), 270);
      })
  );
  const fScl = await shot(p, 'fix_camp_build_scale');
  ok('施工中截圖：牌匾放大中（> 1）', sclPx > 1, '> 1', sclPx, fScl);
  /* ---- 熱區：點牌匾＝開那一座（牌匾 > 建築），但不蓋住別座的本體 ---- */
  await p.waitForTimeout(700);
  const hz = await p.evaluate(() => {
    G.pan = 0;
    return new Promise(r =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const L = [];
          for (const k of G.props) {
            if (!k._pr) continue;
            const [X, Y, w, h] = k._pr,
              x = X + (w >> 1),
              y = Y + (h >> 1);
            if (x < 0 || x >= IW || y < 0 || y >= cvH()) continue;
            const got = propAt({ clientX: x, clientY: y + cvTop() }),
              wx = (x - IW / 2) / ZOOM + G.cam.x,
              wy = (y - cvH() / 2) / ZOOM + G.cam.y,
              body = G.props.find(p => Math.hypot(wx - p.x, wy + 25 - p.y) < p.r + 20);
            L.push({ k: k.k, got: got && got.k, body: body && body.k, ok: got === (body && body !== k ? body : k) });
          }
          r(L);
        })
      )
    );
  });
  ok(
    '熱區：點牌匾中心＝那一座；落在別座本體上的讓給本體（不蓋住別的可點元素）',
    hz.length >= 2 && hz.every(h => h.ok),
    '全部對',
    hz.map(h => `${h.k}→${h.got}${h.body && h.body !== h.k ? `（本體 ${h.body}）` : ''}`).join(' ')
  );
  {
    await p.evaluate(() => (G.pan = G.props.find(k => k.k === 'stash').x - P.x));
    await p.waitForTimeout(700);
    const fp = (await P(p)).find(k => k.k === 'stash');
    await p.mouse.click(fp.pr[0] + 30, fp.pr[1] + (fp.H >> 1) + (await p.evaluate(() => cvTop())));
    await p.waitForTimeout(250);
    const pan = await p.evaluate(() =>
      PANEL.camp
        ? 'camp:' + CDR.one
        : Object.keys(PANEL)
            .filter(k => PANEL[k])
            .join()
    );
    ok('滑鼠點倉房牌匾左半（字上）＝開倉房（營地抽屜那一座，§12-3）', pan === 'camp:store', 'camp:store', pan);
    await p.evaluate(() => closePanels());
    /* 點建築本體＝擺設功能（倉庫） */
    /* 本體點擊圈裡沒被任何牌匾蓋到的一點（自己的牌匾可以蓋到自己本體，那裡牌匾優先，§3.1） */
    const bd = await p.evaluate(() => {
      const k = G.props.find(k => k.k === 'stash'),
        cx = (k.x - G.cam.x) * ZOOM + IW / 2,
        cy = (k.y - 25 - G.cam.y) * ZOOM + cvH() / 2,
        R = (k.r + 20) * ZOOM * 0.8;
      for (let r = 0; r <= R; r += 4)
        for (let a = 0; a < 6.28; a += 0.5) {
          const x = cx + r * Math.cos(a),
            y = cy + r * Math.sin(a);
          if (x < 0 || x >= IW || y < 0 || y >= cvH() || document.elementFromPoint(x, y + cvTop()) !== CV) continue;
          if (
            G.props.some(
              o => o._pr && x >= o._pr[0] && x < o._pr[0] + o._pr[2] && y >= o._pr[1] && y < o._pr[1] + o._pr[3]
            )
          )
            continue;
          return [x, y + cvTop()];
        }
      return [cx, cy + cvTop()];
    });
    await p.mouse.click(bd[0], bd[1]);
    await p.waitForTimeout(250);
    const pan2 = await p.evaluate(() => (PANEL.camp ? 'camp:' + CDR.one : PANEL.stash ? 'stash' : ''));
    ok(
      '滑鼠點倉庫本體（沒被牌匾蓋到的地方）＝開倉庫（擺設功能）',
      pan2 === 'stash',
      'stash',
      pan2 + ' @' + bd.map(Math.round)
    );
    await p.evaluate(() => closePanels());
  }
  /* ---- 鍵盤：Tab 走到牌匾、方向鍵在牌匾間移動、焦點框、aria-label、Enter 開那一座 ---- */
  await p.evaluate(() => {
    rich();
    document.activeElement && document.activeElement.blur();
  });
  let tabs = 0;
  for (; tabs < 40; tabs++) {
    if (await p.evaluate(() => !!(document.activeElement && document.activeElement.closest('#plqs')))) break;
    await p.keyboard.press('Tab');
  }
  const kb = await p.evaluate(() => {
    const k0 = G.props.find(k => k._b === document.activeElement);
    return { k0: k0 && k0.k, labels: [...$('plqs').querySelectorAll('button')].map(b => b.getAttribute('aria-label')) };
  });
  ok('Tab 走得到牌匾（#plqs 透明按鈕，照場景左右順序）', !!kb.k0 && tabs < 40, '≤40 次 Tab', `${tabs} 次 → ${kb.k0}`);
  ok(
    'aria-label：設施名（瞭望台、祭壇、倉房、鍛造台）「{名} {n} 級，可以升級」、其他擺設只有名字',
    kb.labels.some(l => /^鍛造台 \d+ 級，可以升級$/.test(l)) &&
      kb.labels.some(l => /^瞭望台 \d+ 級/.test(l)) &&
      kb.labels.some(l => /^祭壇 \d+ 級/.test(l)) &&
      kb.labels.some(l => /^倉房 \d+ 級/.test(l)) &&
      !kb.labels.some(l => /地圖台|昇華石碑|倉庫/.test(l)) &&
      kb.labels.includes('練習區') &&
      kb.labels.includes('山海寶盒') &&
      kb.labels.length === 6,
    '鍛造台 n 級，可以升級／練習區',
    kb.labels.join('／')
  );
  await p.mouse.move(W - 2, 2);
  await p.evaluate(() => ((G.pan = G.props.find(k => k.k === 'forge').x - P.x), (G.hov = null)));
  /* 方向鍵：→ 走到右邊另一座、← 再往左（第一次 Tab 停在最左邊的鍛造台） */
  const cx = () =>
    p.evaluate(() => {
      const k = G.props.find(k => k._b === document.activeElement);
      return k && { k: k.k, x: k.x };
    });
  const mv = [await cx()];
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(80);
  mv.push(await cx());
  await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(80);
  mv.push(await cx());
  ok(
    '方向鍵在牌匾間移動：→ 到右邊另一座、← 再往左',
    mv.every(Boolean) && mv[1].x > mv[0].x && mv[2].x < mv[1].x,
    '→ x 變大、← x 變小',
    mv.map(m => m && m.k).join('→')
  );
  await p.waitForTimeout(300);
  /* 焦點那座的牌匾若在畫面上下緣外（鏡頭只左右移），用 → 換到整座在畫面內的那一座再量框 */
  const vis = () =>
    p.evaluate(() => {
      const k = G.props.find(k => k._b === document.activeElement);
      if (!k._pr) return `${k.k} 畫面外`;
      const [X, Y, w, h] = k._pr;
      return X >= 5 && Y >= 5 && X + w + 5 <= IW && Y + h + 5 <= cvH() ? '' : `${k.k} ${k._pr.join(',')}`;
    });
  const outV = [];
  for (let i = 0, o; i < 6 && (o = await vis()); i++) {
    outV.push(o);
    await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(400);
  }
  if (outV.length) console.log('ℹ️ 牌匾不在畫面內：' + outV.join('、'));
  const fr = await p.evaluate(
    () =>
      new Promise(r =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const k = G.props.find(k => k._b === document.activeElement),
              [X, Y, w, h] = k._pr,
              px = (x, y) => [...CX.getImageData(x * DPR, y * DPR, 1, 1).data.slice(0, 3)],
              hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
            r({
              k: k.k,
              X,
              px: [px(X - 3, Y + (h >> 1)), px(X - 5, Y + (h >> 1))].join('／'),
              hov: !!G.hov,
              in: px(X - 3, Y + (h >> 1)).join() === hex(PAL.focus).join(),
              out: px(X - 5, Y + (h >> 1)).join() === hex(PAL.sceneVoid).join()
            });
          })
        )
      )
  );
  const fTab = await shot(p, 'fix_camp_tab_focus');
  ok(
    '鍵盤焦點框同懸停（2 px --focus 外推 2＋1 px --scene-void），沒有滑鼠懸停',
    !fr.hov && fr.in && fr.out,
    '框對',
    { ...fr, 畫面外: outV.join('、') },
    fTab
  );
  const ref = await p.evaluate(() => {
    const k = G.props.find(k => k._b === document.activeElement);
    if (k.k === 'prac') return 'prac';
    /* 牌匾＝設施：營地抽屜那一座；不是設施的擺設＝跟點本體同一個面板 */
    if (PLQ_B[k.k]) return 'camp:' + PLQ_B[k.k];
    fmenuOpen(PROP_PANEL[k.k]);
    const r = Object.keys(PANEL)
      .filter(k => PANEL[k])
      .join();
    closePanels();
    return r;
  });
  await p.keyboard.press('Enter');
  await p.waitForTimeout(250);
  const ent = await p.evaluate(() =>
    PRAC.in
      ? 'prac'
      : PANEL.camp
        ? 'camp:' + CDR.one
        : Object.keys(PANEL)
            .filter(k => PANEL[k])
            .join()
  );
  ok('Enter＝開焦點那一座（設施＝營地抽屜那一座；其他＝跟點擺設同一個面板）', !!ref && ent === ref, ref, ent);
  await p.evaluate(() => closePanels());
  /* ---- §12-6 掉幀減半：最近 30 幀平均 > 20 ms 粒子減半；< 17.5 ms 維持 2 秒才恢復（同步餵假幀時間，中間不會插真的幀） ---- */
  const fd = await p.evaluate(() => {
    const n = () => ((DUST.p = []), (DUST.last = {}), campDust('forge'), DUST.p.length),
      feed = (dt, k) => {
        for (let i = 0; i < k; i++) dustTick((t += dt));
      };
    let t = performance.now() + 1e5;
    DUST.ft = [];
    DUST.half = DUST.ok = 0;
    DUST.t = t;
    feed(16.7, 30);
    const r = { ok60: n() };
    feed(25, 30);
    r.slow = n();
    r.halfSlow = DUST.half;
    feed(16, 60); /* 約 1 秒：還不恢復 */
    r.okSince = DUST.ok ? Math.round(t - DUST.ok) : 0;
    r.after1s = n();
    feed(16, 100); /* 平均要約 25 幀（≈0.4 秒）才降到 17.5 以下，再維持 2 秒：共約 2.56 秒恢復 */
    r.after2s = n();
    feed(25, 30);
    feed(18.5, 200); /* 平均 17.5–20 之間：不恢復 */
    r.mid = n();
    DUST.ft = [];
    DUST.half = DUST.ok = 0;
    DUST.t = 0;
    DUST.p = [];
    return r;
  });
  ok(
    '掉幀減半（§12-6）：60 fps 16 顆；平均 25 ms 減半 8 顆；回到 16 ms 1 秒仍 8、滿 2 秒恢復 16；平均 18.5 ms 不恢復',
    fd.ok60 === 16 && fd.slow === 8 && fd.after1s === 8 && fd.after2s === 16 && fd.mid === 8,
    '16／8／8／16／8',
    fd
  );
  /* ---- §12-5 換外觀 1200 ms：LOOK_TIERS 照 M2-12-lookTiers.md；升到或一次連升跨過表內等級＝1200、其餘 600、10 秒內連升 250 ---- */
  const lk = await p.evaluate(() => {
    const M = MAT(),
      fund = c => {
        for (const [, , w, key] of costRows(c))
          if (key === 'soul') M.soul += w * 3;
          else if (key === 'gold') S.gold += w * 3;
          else if (key.startsWith('cur:')) M[key.slice(4)] = (M[key.slice(4)] || 0) + w * 3;
          else matAdd(...(key === 'wood' ? ['wood', 0] : matOf(key)), w * 3);
      },
      /* 走真的按鈕（forge.js 的 data-fg 點擊）：camp:設施、gen:產生器:級數 */
      click = fg => {
        const el = document.createElement('button');
        el.dataset.fg = fg;
        document.body.appendChild(el);
        el.click();
        el.remove();
      },
      T = bk => DUST.up[bk] && DUST.up[bk].T,
      camp = (bk, from) => {
        S.camp[bk] = from;
        fund(campNext(bk));
        DUST.last = {};
        delete DUST.up[bk];
        click('camp:' + bk);
        return S.camp[bk] === from + 1 ? T(bk) : 'err';
      },
      gen = (bk, from, n) => {
        genOf(bk).lv = from;
        fund(genCost(bk, n));
        DUST.last = {};
        delete DUST.up[bk];
        click(`gen:${bk}:${n}`);
        return genOf(bk).lv === from + n ? T(bk) : 'err';
      },
      want = {
        forge: [1, 5, 10, 15, 20],
        watch: [1, 8, 15, 22, 26],
        scout: [1, 2, 3, 4],
        house: [1, 4, 7, 10],
        altar: [1, 4, 7, 11],
        store: [1, 3, 5],
        wood: [5, 10, 25, 50],
        iron: [5, 10, 25, 50],
        hide: [5, 10, 25, 50],
        silk: [5, 10, 25, 50]
      },
      keep = { ...S.camp },
      r = { table: JSON.stringify(LOOK_TIERS) === JSON.stringify(want) };
    S.camp.forge = 8; /* 獵場、絲地出現 */
    /* 解鎖表六座：每一個表內等級都升一次（跨過＝1200）；表外等級各升一次（不跨過＝600） */
    for (const bk of ['forge', 'watch', 'scout', 'house', 'altar', 'store']) {
      const mx = CAMP[bk].length,
        cross = want[bk].map(t => camp(bk, t - 1)),
        not = [];
      for (let lv = 1; lv <= mx; lv++) if (!want[bk].includes(lv)) not.push(camp(bk, lv - 1));
      r[bk] = { mx, cross, not };
    }
    /* 瞭望台 23～25 只加光點：600 */
    r.watchDot = [23, 24, 25].map(lv => camp('watch', lv - 1));
    /* 產生器：單升踩到表內＝1200；單升表外＝600；×10 連升跨過＝1200、沒跨過＝600 */
    for (const bk of ['wood', 'iron', 'hide', 'silk'])
      r[bk] = {
        cross: want[bk].map(t => gen(bk, t - 1, 1)),
        not: [2, 6, 11, 26, 51, 75].map(t => gen(bk, t - 1, 1)),
        multiCross: [gen(bk, 1, 10), gen(bk, 20, 10), gen(bk, 45, 10)],
        multiNot: [gen(bk, 10, 10), gen(bk, 50, 10)]
      };
    /* 獵場、絲地 Lv0→1 首次出現：600 */
    r.first = ['hide', 'silk'].map(bk => [buildMs(bk, 0, 1, false), gen(bk, 0, 1)]);
    /* 10 秒內連升：250（不管跨不跨） */
    S.camp.forge = 3;
    fund(campNext('forge'));
    DUST.last = {};
    click('camp:forge');
    fund(campNext('forge'));
    click('camp:forge');
    r.quick = T('forge');
    Object.assign(S.camp, keep);
    DUST.up = {};
    DUST.p = [];
    return r;
  });
  const all = (a, v) => a.length > 0 && a.every(x => x === v);
  ok('LOOK_TIERS 照 M2-12-lookTiers.md 十座', lk.table, '相同', lk.table);
  for (const bk of ['forge', 'watch', 'scout', 'house', 'altar', 'store'])
    ok(
      `換外觀 ${bk}：表內 ${lk[bk].cross.length} 級＝1200；表外 ${lk[bk].not.length} 級＝600`,
      all(lk[bk].cross, 1200) && (bk === 'scout' ? lk[bk].not.length === 0 : all(lk[bk].not, 600)),
      bk === 'scout' ? '每級都換（沒有表外級）' : '1200／600',
      lk[bk]
    );
  ok('例外：瞭望台 23～25 只加光點＝600', all(lk.watchDot, 600), '600×3', lk.watchDot);
  for (const bk of ['wood', 'iron', 'hide', 'silk'])
    ok(
      `換外觀 ${bk}：單升跨過 5／10／25／50＝1200、表外＝600；×10 跨過＝1200、沒跨過＝600`,
      all(lk[bk].cross, 1200) && all(lk[bk].not, 600) && all(lk[bk].multiCross, 1200) && all(lk[bk].multiNot, 600),
      '1200／600',
      lk[bk]
    );
  ok(
    '例外：獵場、絲地 Lv0→1 首次出現＝600',
    lk.first.flat().every(x => x === 600),
    '600',
    lk.first
  );
  ok('10 秒內連升＝250', lk.quick === 250, '250', lk.quick);
  ok('沒有頁面錯誤', !p.errs.length, '0', p.errs.slice(0, 3).join(' | '));
  /* ---- 減少動態 ---- */
  const q = await mk('reduce');
  const rd = await q.evaluate(() => {
    DUST.p = [];
    campUp('forge');
    campDust('forge');
    return { n: DUST.p.length, a: [0, 0.3, 0.6].map(t => plqA(t)) };
  });
  const fRd = await shot(q, 'camp_reduced');
  ok('減少動態：不出塵土、呼吸外框固定 a 0.75', rd.n === 0 && rd.a.every(a => a === 0.75), '0 顆、0.75', rd, fRd);
  ok('減少動態：沒有頁面錯誤', !q.errs.length, '0', q.errs.slice(0, 3).join(' | '));
  await b.close();
  fs.writeFileSync(
    path.join(OUT, `results_${tag}.md`),
    `# B3 美術接線 ${tag}\n\n| 項目 | 尺寸 | 標準 | 實測 | 結果 | 截圖 |\n| --- | --- | --- | --- | --- | --- |\n` +
      rows.map(r => '| ' + r.map(c => String(c).replace(/\|/g, '／')).join(' | ') + ' |').join('\n') +
      '\n'
  );
  console.log(fail ? `❌ ${fail} 項不過` : '✅ 全過');
  process.exit(fail ? 1 : 0);
})();
