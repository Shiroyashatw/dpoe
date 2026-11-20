const { chromium } = require('playwright');
/* B4 戰鬥閃光尖峰（M2-12-shell-part2.md §12 第 8 點）：錄影逐幀量全畫面 L*>80 的像素比例。
   一般戰鬥幀（中位數）≤ 2.0%；超過 2.0% 的幀連續一段＝一次尖峰，每次持續 ≤ 100 ms、任何 1 秒內 ≤ 3 次；
   另拍 8 張靜幀（跟 B3 battle_lum 同量法：截圖、沒有安全區）。錄影用 CDP Page.startScreencast（每一幀帶時間戳，含 DOM 的 HUD）。
   敵方預警不被閃光蓋住：同一幀疊上我方最亮的特效（斬擊月牙＋光環），量預警範圍像素變多少（≤ 51／255＝我方特效 ≤ 20%，render.js FX_A）。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/b4_flash.js [寬 390] [高 844] [秒數 12] [網址]
   結果存 docs/production/evidence/dpoe-b4/（SHOTS 可改）flash_<寬x高>.json／.md；有 ❌ 結束碼 1 */
const path = require('path'),
  fs = require('fs');
const W = +process.argv[2] || 390,
  H = +process.argv[3] || 844,
  SEC = +process.argv[4] || 12,
  URL = process.argv[5] || 'http://localhost:8000/',
  PORTM = H > W,
  MOB = PORTM || H <= 430,
  tag = W + 'x' + H,
  LIM = 2.0,
  OUT = process.env.SHOTS || path.join(__dirname, '..', 'docs', 'production', 'evidence', 'dpoe-b4');
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const rows = [];
const ok = (n, v, goal, got) => {
  if (!v) fail++;
  rows.push([n, tag, goal, got, v ? '過' : '不過']);
  console.log((v ? '✅ ' : '❌ ') + n + ' ' + got);
};
/* 量測頁：base64 圖 → L*>80 比例（sRGB→Y，L*>80 ⇔ Y > (96/116)^3） */
const MEAS = async ([src, fmt]) => {
  const im = new Image();
  im.src = `data:image/${fmt};base64,` + src;
  await im.decode();
  const c = (window._c = window._c || document.createElement('canvas'));
  c.width = im.width;
  c.height = im.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  if (!window._lut) {
    window._lut = new Float32Array(256);
    for (let v = 0; v < 256; v++) {
      const x = v / 255;
      window._lut[v] = x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    }
  }
  const L = window._lut,
    T = (96 / 116) ** 3;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (0.2126 * L[d[i]] + 0.7152 * L[d[i + 1]] + 0.0722 * L[d[i + 2]] > T) n++;
  return +((100 * n) / (d.length / 4)).toFixed(2);
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    hasTouch: MOB,
    isMobile: MOB,
    deviceScaleFactor: 1
  });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  const mp = await ctx.newPage(); /* 量測用的空白頁，不佔遊戲頁的主執行緒 */
  await mp.setContent('<body></body>');
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL + '?dbg=1&seed=7&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1200);
  await p.bringToFront();
  await p.evaluate(port => {
    proSkip();
    S.story.tips = 0;
    S.orient = port ? 'p' : 'l';
    applyOrient();
    S.auto = 1;
    runNode(TRUNK_K[0]);
  }, PORTM);
  await p.waitForTimeout(2500);
  const meas = (src, fmt = 'png') => mp.evaluate(MEAS, [src, fmt]);

  /* ---- 靜幀 8 張（B3 battle_lum 同量法） ---- */
  const stills = [];
  for (let i = 0; i < 8; i++) {
    await p.waitForTimeout(700);
    stills.push(await meas((await p.screenshot()).toString('base64')));
  }
  console.log(`靜幀 L*>80：${stills.join('、')}%`);

  /* ---- 錄影：CDP screencast 逐幀 ---- */
  const rec = async (secs, name, extra) => {
    const cdp = await ctx.newCDPSession(p),
      fr = [];
    cdp.on('Page.screencastFrame', f => {
      fr.push({ t: f.metadata.timestamp, d: f.data, x: extra ? extra() : null });
      cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: W, maxHeight: H });
    await p.waitForTimeout(secs * 1000);
    await cdp.send('Page.stopScreencast');
    await cdp.detach();
    const out = [];
    let top = null;
    for (const f of fr) {
      const v = await meas(f.d);
      out.push({ t: f.t, v });
      if (!top || v > top.v) top = { v, d: f.d };
    }
    /* 最亮的那一幀存起來（證據） */
    if (top) fs.writeFileSync(path.join(OUT, `flash_${tag}_${name}_max.png`), Buffer.from(top.d, 'base64'));
    return out;
  };
  /* 尖峰：連續 >LIM 的幀算一次；持續＝第一幀到下一個 ≤LIM 幀的時間（該幀之前一直顯示著） */
  const spikes = fr => {
    const S = [];
    for (let i = 0; i < fr.length; i++) {
      if (fr[i].v <= LIM) continue;
      let j = i;
      while (j + 1 < fr.length && fr[j + 1].v > LIM) j++;
      const end = j + 1 < fr.length ? fr[j + 1].t : fr[j].t + 1 / 60;
      S.push({
        t: fr[i].t,
        ms: Math.round((end - fr[i].t) * 1000),
        max: Math.max(...fr.slice(i, j + 1).map(x => x.v))
      });
      i = j;
    }
    return S;
  };
  const perSec = S => Math.max(0, ...S.map(s => S.filter(x => x.t >= s.t && x.t < s.t + 1).length));
  const stat = (name, fr) => {
    const v = fr.map(x => x.v).sort((a, b) => a - b),
      q = k => v[Math.min(v.length - 1, Math.floor(k * v.length))],
      S = spikes(fr),
      dur = fr.length ? fr[fr.length - 1].t - fr[0].t : 0;
    return {
      name,
      frames: fr.length,
      sec: +dur.toFixed(2),
      fps: dur ? +(fr.length / dur).toFixed(1) : 0,
      median: q(0.5),
      p90: q(0.9),
      max: v[v.length - 1],
      over: fr.filter(x => x.v > LIM).length,
      spikes: S.length,
      spikeMaxMs: Math.max(0, ...S.map(s => s.ms)),
      spikeMs: S.map(s => s.ms),
      perSecMax: perSec(S)
    };
  };
  const A = stat('一般戰鬥', await rec(SEC, 'fight'));
  /* 王戰：把王進度拉滿，等王出來（預警最多的場面） */
  await p.evaluate(() => (G.prog = G.need));
  await p.waitForTimeout(3500);
  const Bf = await rec(Math.max(6, SEC / 2), 'boss');
  const B = stat('王戰', Bf);
  /* 預警被蓋（像素）：同一幀在主角腳下放一個預警圈（G.tele，畫到 90%）＋疊一個我方斬擊月牙（最亮的我方特效），
     比「有特效」與「沒特效」時預警範圍內像素的最大通道差：我方特效 ≤ 20% ⇒ 差 ≤ 0.2×255≈51（每個預警像素至少留 80%） */
  const tel = await p.evaluate(() => {
    G.trauma = 0;
    const x = P.x,
      y = P.y + 40,
      r = 70;
    const keep = { fx: G.fx, tele: G.tele };
    const shot = withFx => {
      G.tele = [{ x, y, r, t: 0.9, dur: 1 }];
      G.fx = withFx
        ? [
            { k: 'slash', x, y: y + 20, r: 90, ang: 0, arc: Math.PI * 2, t: 0.05, dur: 0.3 },
            { k: 'ring', x, y: y + 10, r: 60, t: 0.05, dur: 0.4 }
          ]
        : [];
      draw();
      const W = IW / ZOOM,
        H = cvH() / ZOOM,
        sx = (W / 2 - G.cam.x + x) * ZOOM * DPR,
        sy = (H / 2 - G.cam.y + y) * ZOOM * DPR,
        R = Math.floor(r * 0.6 * ZOOM * DPR);
      return CX.getImageData(Math.round(sx - R), Math.round(sy - R), 2 * R, 2 * R).data;
    };
    const a = shot(0),
      b = shot(1);
    G.fx = keep.fx;
    G.tele = keep.tele;
    let mx = 0,
      n = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      mx = Math.max(mx, d);
      if (d > 51) n++;
    }
    return {
      fxA: typeof FX_A === 'number' ? FX_A : null,
      teleA: typeof TELE_A === 'number' ? TELE_A : null,
      maxDiff: mx,
      px: a.length / 4,
      over: n
    };
  });
  for (const r of [A, B]) {
    console.log(
      `${r.name}：${r.frames} 幀／${r.sec} 秒（${r.fps} fps）中位 ${r.median}%、P90 ${r.p90}%、最高 ${r.max}%；>2.0% 幀 ${r.over}、尖峰 ${r.spikes} 次、最長 ${r.spikeMaxMs} ms、每秒最多 ${r.perSecMax} 次`
    );
    ok(`${r.name}：一般戰鬥幀（中位數）L*>80 ≤ 2.0%`, r.median <= LIM, '≤ 2.0%', `${r.median}%`);
    ok(
      `${r.name}：單次 >2.0% 尖峰持續 ≤ 100 ms`,
      r.spikeMaxMs <= 100,
      '≤ 100 ms',
      `最長 ${r.spikeMaxMs} ms（${r.spikes} 次）`
    );
    ok(`${r.name}：尖峰每秒 ≤ 3 次`, r.perSecMax <= 3, '≤ 3', `${r.perSecMax}`);
  }
  ok(
    '敵方預警不被閃光蓋住：同一幀疊我方最亮特效，預警範圍像素最大變化 ≤ 51（＝我方特效 ≤ 20%）',
    tel.maxDiff <= 51,
    '≤ 51／255',
    `最大變化 ${tel.maxDiff}／255、超過的像素 ${tel.over}／${tel.px}（FX_A ${tel.fxA}、TELE_A ${tel.teleA}）`
  );
  ok('沒有 JS 錯誤', !p.errs.length, '0', p.errs.join(' | ') || '0');
  const res = { tag, stills, A, B, tel, when: new Date().toISOString() };
  fs.writeFileSync(path.join(OUT, `flash_${tag}.json`), JSON.stringify(res, null, 1));
  fs.writeFileSync(
    path.join(OUT, `flash_${tag}.md`),
    `# 戰鬥閃光尖峰 ${tag}\n\n靜幀 L*>80：${stills.join('、')}%\n\n| 項目 | 尺寸 | 門檻 | 實測 | 結果 |\n| --- | --- | --- | --- | --- |\n` +
      rows.map(r => `| ${r.join(' | ')} |`).join('\n') +
      `\n\n錄影：${[A, B].map(r => `${r.name} ${r.frames} 幀／${r.sec} 秒（${r.fps} fps），中位 ${r.median}%、P90 ${r.p90}%、最高 ${r.max}%，尖峰 ${r.spikes} 次（${r.spikeMs.join('、') || '—'} ms）`).join('；')}\n`
  );
  await b.close();
  process.exit(fail ? 1 : 0);
})();
