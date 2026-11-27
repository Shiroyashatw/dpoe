/* M2-34 3a 可用性三項（PR #77 美術審查 S-5、圖示整數倍／E-5、E-1）：只量、不改遊戲。
   1. 設施卡按鈕熱區：營地總覽每張卡（收起＋輪流展開）與「下一件」裡每一顆可以按的，捲進畫面後量可點的高度（被面板捲動區、畫面裁掉的不算）：直立 ≥44、桌機 ≥32。
   2. 圖示整數倍：#pidle、#cmtop、#cmnext、#cc-*、#bar、追逐橫幅（王印）裡的 img.ic，顯示寬 ÷ naturalWidth 是整數。
   3. 地磚格寬（3a §3.2）：四種地形各換成標記地磚（第 0 欄紅、第 0 列藍、其他黑白棋盤），量 bStatic 剛畫完的畫布：
      相鄰地磚寬／高差 ≤1 裝置 px、相鄰材質像素寬差 ≤1、每塊區塊貼在整數裝置 px 上。
   用法：先開本機伺服器（python3 -m http.server），node tools/m2_34_3a_usable.js [網址] [截圖資料夾] [檔名前綴]；有 ❌ 時結束碼 1 */
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8000/',
  SHOT = process.argv[3] /* 給資料夾就另外截圖（檔名前綴 process.argv[4]） */,
  PRE = process.argv[4] || '';
if (SHOT) require('fs').mkdirSync(SHOT, { recursive: true });
let fail = 0;
const ok = (c, n, v = '') => {
  if (!c) fail++;
  console.log(`${c ? '✅' : '❌'} ${n}`, typeof v === 'string' ? v : JSON.stringify(v));
};
/* 圖示：顯示寬 ÷ naturalWidth（看不到的不算） */
const icons = sel =>
  [...document.querySelectorAll(sel)]
    .filter(i => i.naturalWidth && i.getBoundingClientRect().width)
    .map(i => {
      const w = i.getBoundingClientRect().width;
      return {
        sel: (i.closest('[id]') || {}).id,
        w: +w.toFixed(2),
        nw: i.naturalWidth,
        k: +(w / i.naturalWidth).toFixed(3)
      };
    });
const intK = L => L.every(r => r.k >= 1 && Math.abs(r.k - Math.round(r.k)) < 0.01);
async function run(b, W, H) {
  const mob = W < 900,
    tag = `${W}x${H}`,
    MIN = mob ? 44 : 32,
    errs = [];
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    hasTouch: mob,
    isMobile: mob,
    deviceScaleFactor: mob ? 2 : 1
  });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?dbg=1&seed=7&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof proSkip === 'function');
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    proSkip();
    S.story.tips = 0;
    S.auto = 0;
    /* 解鎖表全開到中間（每座都還有下一級）：卡最多 */
    for (const k of CAMP_B) S.camp[k] = Math.max(1, Math.min(campMax(k) - 1, 3));
    S.mat.soul = 1e9;
    hudBar();
  });
  /* ---------- 1. 設施卡按鈕熱區 ---------- */
  const keys = await p.evaluate(async () => {
    closePanels();
    CRAFT.tab = 'camp';
    CAMPUI.open = null;
    openPanel('craft');
    await new Promise(r => setTimeout(r, 600));
    return [...document.querySelectorAll('#pcraft [id^="cc-"]')].map(e => e.id.slice(3));
  });
  const hits = [];
  for (const open of [null, ...keys]) {
    const r = await p.evaluate(async open => {
      if (CAMPUI.open !== open) {
        CAMPUI.open = open;
        hudPanels();
      }
      await new Promise(r => setTimeout(r, 300));
      const scope = open ? `#cc-${open}` : '#pcraft [id^="cc-"], #pcraft #cmnext',
        Q = 'button, [data-fg], [data-a], [data-tm], .chip',
        /* 卡片每一跳都整張重畫（舊節點會被換掉）：每次用「哪張卡＋第幾顆」重新找 */
        ids = [...document.querySelectorAll(scope)].flatMap(c => [...c.querySelectorAll(Q)].map((_, i) => [c.id, i])),
        get = ([id, i]) => document.getElementById(id).querySelectorAll(Q)[i];
      const out = [];
      for (const k of ids) {
        if (!get(k) || !get(k).getClientRects().length) continue;
        /* 捲到黏住的標題（.cmhead）下面 8 px：玩家要按一顆鈕會把它捲到看得到的地方 */
        get(k).scrollIntoView({ block: 'end' });
        const sc = $('pcraft'),
          hd = sc.querySelector('.cmhead');
        if (hd) sc.scrollTop += get(k).getBoundingClientRect().top - hd.getBoundingClientRect().bottom - 8;
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const el = get(k);
        /* 可點的高度：按鈕矩形跟畫面、每一層會裁切的父層取交集，再扣掉蓋在上面的黏住標題 */
        let q = el.getBoundingClientRect(),
          t = Math.max(0, q.top),
          bt = Math.min(innerHeight, q.bottom);
        for (let a = el.parentElement; a; a = a.parentElement) {
          const s = getComputedStyle(a);
          if (/(auto|scroll|hidden)/.test(s.overflowY)) {
            const z = a.getBoundingClientRect();
            (t = Math.max(t, z.top)), (bt = Math.min(bt, z.bottom));
          }
        }
        const mid = (q.left + q.right) / 2;
        /* elementFromPoint 只看整數像素列：從第一個完整的列往內找，被蓋住才往內縮 */
        const hit = y => el.contains(document.elementFromPoint(mid, y + 0.5));
        let y = Math.ceil(t),
          z = Math.floor(bt) - 1;
        while (y <= z && !hit(y)) y++;
        if (y > Math.ceil(t)) t = y;
        while (z >= t && !hit(z)) z--;
        if (z < Math.floor(bt) - 1) bt = z + 1;
        out.push({
          id: k[0],
          el: el.tagName.toLowerCase() + (el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
          fg: el.dataset.fg || el.dataset.a || el.dataset.tm || '',
          w: Math.round(q.width),
          h: +q.height.toFixed(1),
          vis: +Math.max(0, bt - t).toFixed(1)
        });
      }
      return out;
    }, open);
    for (const x of r) if (!hits.some(y => y.id === x.id && y.el === x.el && y.fg === x.fg)) hits.push(x);
  }
  const low = hits.filter(x => x.vis < MIN);
  ok(
    hits.length > 20 && !low.length,
    `${tag} 設施卡按鈕：${hits.length} 顆，捲進畫面後可點高度都 ≥${MIN}（最小 ${Math.min(...hits.map(x => x.vis))}）`,
    low.length ? low : ''
  );
  /* 審查的 14／16 是捲到邊上被裁掉的那一截：卡片清單捲到一半時列出被裁到 <MIN 的鈕（只供對照，不算失敗） */
  const clip = await p.evaluate(async () => {
    CAMPUI.open = null;
    hudPanels();
    await new Promise(r => setTimeout(r, 300));
    const L = [...document.querySelectorAll('#pcraft [id^="cc-"] button')];
    L[Math.floor(L.length / 2)].scrollIntoView({ block: 'end' });
    await new Promise(r => setTimeout(r, 200));
    return L.map(el => {
      const q = el.getBoundingClientRect(),
        h = Math.min(innerHeight, q.bottom) - Math.max(0, q.top);
      return h > 0 && h < q.height ? `${el.closest('[id]').id} ${Math.round(q.width)}×${h.toFixed(1)}` : '';
    }).filter(Boolean);
  });
  console.log(`ℹ️ ${tag} 參考：捲到一半時被畫面邊緣裁到的鈕（審查表的 14／16 屬於這種）`, JSON.stringify(clip));
  const shot = async n => SHOT && (await p.screenshot({ path: `${SHOT}/${PRE}${tag}-${n}.png` }));
  await p.evaluate(async () => {
    CAMPUI.open = null;
    hudPanels();
    $('pcraft').scrollTop = 0;
    await new Promise(r => setTimeout(r, 300));
  });
  await shot('camp');
  const camp = await p.evaluate(icons, '#pcraft #cmtop img.ic, #pcraft #cmnext img.ic, #pcraft [id^="cc-"] img.ic');
  ok(
    intK(camp),
    `${tag} 營地圖示（#cmtop、#cmnext、#cc-*）整數倍`,
    camp.filter(r => !intK([r])).concat(camp.length ? [] : ['沒有圖示'])
  );
  /* 資源條 .rbar 的圖示一律 16：倍率剛好 1（併 hotfix-ui 的 flex 版面後不能回到 20／16＝1.25） */
  const rbc = await p.evaluate(icons, '#pcraft .rbar img.ic');
  ok(
    rbc.length >= 1 && rbc.every(r => r.k === 1),
    `${tag} 營地資源條 .rbar img.ic 倍率＝1（${rbc.length} 個）`,
    rbc.filter(r => r.k !== 1).concat(rbc.length ? [] : ['沒有圖示'])
  );
  /* 營地場景（面板關著）的技能列 */
  await p.evaluate(async () => {
    closePanels();
    hudBar();
    await new Promise(r => setTimeout(r, 300));
  });
  const cbar = await p.evaluate(icons, '#bar img.ic');
  ok(
    intK(cbar),
    `${tag} 面板關著 #bar img.ic 整數倍（看得到 ${cbar.length} 個）`,
    cbar.filter(r => !intK([r]))
  );
  /* ---------- 2. 戰鬥：掛機卡、技能列、王印橫幅 ---------- */
  await p.evaluate(async () => {
    closePanels();
    if (G.scene !== 'map') runNode(TRUNK_K[0]);
    DBG.clear();
    await new Promise(r => setTimeout(r, 500));
    S.auto = 1;
    idleBar(1);
    await new Promise(r => setTimeout(r, 400));
  });
  const idle = await p.evaluate(icons, '#pidle img.ic');
  await shot('idle');
  ok(
    idle.length >= 3 && intK(idle),
    `${tag} #pidle img.ic 整數倍`,
    idle.filter(r => !intK([r])).concat(idle.length >= 3 ? [] : ['圖示不到 3 個'])
  );
  const rbi = await p.evaluate(icons, '#pidle .rbar img.ic');
  ok(
    rbi.length >= 1 && rbi.every(r => r.k === 1),
    `${tag} 掛機卡資源條 .rbar img.ic 倍率＝1（${rbi.length} 個）`,
    rbi.filter(r => r.k !== 1).concat(rbi.length ? [] : ['沒有圖示'])
  );
  await p.evaluate(async () => {
    S.auto = 0;
    $('pidle').hidden = true;
    hudBar();
    await new Promise(r => setTimeout(r, 300));
  });
  const bar = await p.evaluate(icons, '#bar img.ic');
  ok(
    intK(bar),
    `${tag} #bar img.ic 整數倍（看得到 ${bar.length} 個）`,
    bar.filter(r => !intK([r]))
  );
  const wy = [];
  for (const k of await p.evaluate(() => CHASE_POOL.trunk)) {
    await p.evaluate(k => {
      chaseBnHide();
      S.chase.got[k] = 1;
      chaseBn(k);
    }, k);
    await p.waitForFunction(() => {
      const i = document.querySelector('#chase .cbi img.ic');
      return i && i.naturalWidth;
    });
    await p.waitForTimeout(300);
    wy.push(...(await p.evaluate(icons, '#chase img.ic')).map(r => ({ ...r, wy: k })));
  }
  await p.evaluate(() => chaseBnHide());
  ok(
    wy.length === 4 && intK(wy),
    `${tag} E-5 王印圖示倍率（追逐橫幅四個）`,
    wy.map(r => `${r.wy} ${r.w}/${r.nw}=${r.k}`).join('；')
  );
  /* ---------- 3. 地磚格寬 ---------- */
  for (const bk of ['temple', 'lava', 'tomb', 'ice']) {
    await p.evaluate(bk => DBG.biome(bk), bk);
    await p.waitForFunction(bk => !!tileSet(bk), bk, { timeout: 10000 });
    const t = await p.evaluate(async bk => {
      DBG.clear();
      G.night = G.fog = 0;
      /* 標記地磚：第 0 欄紅、第 0 列藍、其他黑白棋盤（每個材質像素一格） */
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const x = c.getContext('2d');
      for (let j = 0; j < 32; j++)
        for (let i = 0; i < 32; i++) {
          x.fillStyle = i === 0 ? '#f00' : j === 0 ? '#00f' : (i + j) & 1 ? '#fff' : '#000';
          x.fillRect(i, j, 1, 1);
        }
      const T = tileSet(bk);
      T.floor0 = T.floor0 || T.floor;
      T.floorL0 = T.floorL0 || T.floorL;
      (T.floor = [c]), (T.floorL = null);
      G.bc = null;
      /* 鏡頭放在不整齊的位置（小數），量 bStatic 剛畫完的畫布（暗層、特效之前） */
      let img = null,
        rects = [];
      const bs = bStatic,
        di = CX.drawImage;
      window.bStatic = (W, H) => {
        CX.drawImage = function (im, ...a) {
          if (a.length === 4 && im.width === 256) {
            const m = CX.getTransform();
            rects.push([m.a * a[0] + m.e, m.d * a[1] + m.f, m.a * a[2], m.d * a[3]].map(v => +v.toFixed(3)));
          }
          return di.call(this, im, ...a);
        };
        bs(W, H);
        delete CX.drawImage;
        img = CX.getImageData(0, 0, CV.width, CV.height);
      };
      const res = [];
      for (const [dx, dy] of [
        [0.37, 0.61],
        [13.3, 7.7],
        [101.45, 55.15]
      ]) {
        G.cam.x = P.x + dx;
        G.cam.y = P.y + dy;
        G.bc = null;
        rects = [];
        bStatic(1, 1); /* 第一次只烘區塊 */
        for (let i = 0; i < 12; i++) draw();
        rects = [];
        draw();
        res.push({ img, rects: rects.slice() });
      }
      window.bStatic = bs;
      (T.floor = T.floor0), (T.floorL = T.floorL0);
      G.bc = null;
      /* 掃描：水平看紅欄（地磚開頭）、垂直看藍列；材質像素＝黑白交錯的一段 */
      const cls = (d, o) => {
        const r = d[o],
          g = d[o + 1],
          b = d[o + 2];
        if (r > 200 && g < 60 && b < 60) return 'R';
        if (b > 200 && r < 60 && g < 60) return 'B';
        if (r > 200 && g > 200 && b > 200) return 'W';
        if (r < 40 && g < 40 && b < 40) return 'K';
        return '?';
      };
      const scan = (img, hor) => {
        const { width: w, height: h, data: d } = img,
          tiles = [],
          tex = [],
          mk = hor ? 'R' : 'B';
        const n = hor ? h : w,
          len = hor ? w : h;
        for (let s = 3; s < n; s += 7) {
          let runs = [];
          for (let i = 0; i < len; i++) {
            const c = cls(d, 4 * (hor ? s * w + i : i * w + s));
            if (runs.length && runs[runs.length - 1].c === c) runs[runs.length - 1].n++;
            else runs.push({ c, n: 1, at: i });
          }
          /* 只留乾淨的段（黑白與標記色），去掉頭尾不完整的一段 */
          let seg = [];
          const flush = () => {
            const S = seg.slice(1, -1);
            for (let i = 1; i < S.length; i++) tex.push(Math.abs(S[i].n - S[i - 1].n));
            const st = seg.filter(r => r.c === mk).map(r => r.at);
            const tw = st.slice(1).map((v, i) => v - st[i]);
            for (let i = 1; i < tw.length; i++) tiles.push([tw[i - 1], tw[i]]);
            seg = [];
          };
          for (const r of runs) {
            if (r.c === '?' || r.c === (hor ? 'B' : 'R') || r.n > 12) flush();
            else seg.push(r);
          }
          flush();
        }
        return { tiles, tex };
      };
      const out = { pairs: 0, tileDiff: 0, texDiff: 0, widths: {}, misaligned: [], rects: 0 };
      for (const { img, rects } of res) {
        for (const hor of [true, false]) {
          const s = scan(img, hor);
          out.pairs += s.tiles.length;
          for (const [a, b] of s.tiles) {
            out.tileDiff = Math.max(out.tileDiff, Math.abs(a - b));
            out.widths[a] = (out.widths[a] || 0) + 1;
          }
          for (const v of s.tex) out.texDiff = Math.max(out.texDiff, v);
        }
        out.rects += rects.length;
        for (const r of rects) if (r.some(v => Math.abs(v - Math.round(v)) > 0.01)) out.misaligned.push(r);
      }
      out.misaligned =
        out.misaligned.length + (out.misaligned.length ? ` 例 ${JSON.stringify(out.misaligned[0])}` : '');
      out.zoomDpr = +(ZOOM * DPR).toFixed(4);
      return out;
    }, bk);
    if (SHOT) {
      await p.evaluate(() => (G.bc = null));
      await p.waitForTimeout(400);
      await shot(`tiles-${bk}`);
    }
    ok(
      t.pairs > 20 && t.tileDiff <= 1 && t.texDiff <= 1 && parseInt(t.misaligned) === 0 && t.rects > 0,
      `${tag} 地磚 ${bk}：相鄰地磚寬差 ${t.tileDiff}、相鄰材質像素寬差 ${t.texDiff}（≤1 裝置 px）、區塊沒對齊裝置 px ${t.misaligned}／${t.rects}`,
      { pairs: t.pairs, widths: t.widths, 'ZOOM×DPR': t.zoomDpr }
    );
  }
  ok(!errs.length, `${tag} 沒有頁面錯誤`, errs.join('；'));
  await ctx.close();
}
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  for (const [W, H] of [
    [390, 844],
    [1280, 720]
  ])
    await run(b, W, H);
  await b.close();
  console.log(fail ? `❌ ${fail} 項沒過` : '✅ 全過');
  process.exit(fail ? 1 : 0);
})();
