/* 視覺量測（只量不改）：開遊戲、走到各畫面，每個畫面
   1) 凍結（停 rAF、停 CSS 動畫）→ 截圖 shots/<size>/<畫面>.png
   2) 列出看得到的 DOM 文字（顏色含 opacity、外框、字級、對應 CSS 規則）＋這一格 canvas 的 fillText
   3) 把 DOM 文字設成透明再截一張（背景圖，放 RAW 資料夾）
   用法：先在 repo 根目錄開 python3 -m http.server 8000；node capture.js <portrait|desktop> [網址] [RAW 資料夾] */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const SIZE = process.argv[2] || 'portrait',
  URL = process.argv[3] || 'http://localhost:8000/',
  RAW = process.argv[4] || path.join(__dirname, '..', 'raw');
const ROOT = process.env.OUT_DIR || path.join(__dirname, '..');
const OUT = path.join(ROOT, 'shots', SIZE),
  RAWD = path.join(RAW, SIZE);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(RAWD, { recursive: true });
const PORTRAIT = SIZE === 'portrait';
const CTX = PORTRAIT
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };

/* 頁面一開始就裝：rAF 可凍結、記每一格的 fillText */
const INIT = () => {
  const raf = window.requestAnimationFrame.bind(window);
  window.__fid = 0;
  window.__freeze = 0;
  window.__pend = [];
  window.__ft = [];
  window.requestAnimationFrame = cb => {
    if (window.__freeze) return window.__pend.push(cb), 0;
    return raf(t => {
      window.__fid++;
      cb(t);
    });
  };
  window.__unfreeze = () => {
    window.__freeze = 0;
    const p = window.__pend.splice(0);
    p.forEach(cb => window.requestAnimationFrame(cb));
  };
  const os = CanvasRenderingContext2D.prototype.strokeText;
  CanvasRenderingContext2D.prototype.strokeText = function (t, x, y, mw) {
    window.__ls = {
      t: String(t),
      x,
      y,
      ss: typeof this.strokeStyle === 'string' ? this.strokeStyle : '',
      lw: this.lineWidth
    };
    return os.call(this, t, x, y, mw);
  };
  const of = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t, x, y, mw) {
    try {
      if (this.canvas && this.canvas.isConnected && String(t).trim()) {
        const m = this.getTransform(),
          w = this.measureText(String(t)),
          al = this.textAlign,
          ox = al === 'center' ? -w.width / 2 : al === 'right' || al === 'end' ? -w.width : 0;
        const asc = w.actualBoundingBoxAscent || 8,
          desc = w.actualBoundingBoxDescent || 2;
        const p = (px, py) => ({ x: m.a * px + m.c * py + m.e, y: m.b * px + m.d * py + m.f });
        const a = p(x + ox, y - asc),
          b = p(x + ox + w.width, y + desc);
        window.__ft.push({
          fid: window.__fid,
          cv: this.canvas,
          t: String(t),
          font: this.font,
          fill: typeof this.fillStyle === 'string' ? this.fillStyle : '(gradient)',
          ga: this.globalAlpha,
          stroke:
            window.__ls && window.__ls.t === String(t) && window.__ls.x === x && window.__ls.y === y
              ? window.__ls.ss + ' ' + window.__ls.lw + 'px'
              : '',
          x0: Math.min(a.x, b.x),
          y0: Math.min(a.y, b.y),
          x1: Math.max(a.x, b.x),
          y1: Math.max(a.y, b.y)
        });
        if (window.__ft.length > 4000) window.__ft.splice(0, 2000);
      }
    } catch (e) {}
    return of.call(this, t, x, y, mw);
  };
};

/* 頁內量測：列文字元素 */
const MEASURE = () => {
  const css = [...document.styleSheets].find(s => (s.href || '').includes('style.css'));
  const rules = [];
  const walk = (list, media) => {
    for (const r of list) {
      if (r.cssRules && r.media) {
        if (matchMedia(r.media.mediaText).matches) walk(r.cssRules, r.media.mediaText);
      } else if (r.cssRules && r.conditionText !== undefined) {
        walk(r.cssRules, media);
      } else if (r.selectorText && r.style) rules.push({ sel: r.selectorText, st: r.style, media });
    }
  };
  try {
    if (css) walk(css.cssRules, '');
  } catch (e) {}
  const ruleFor = (el, props) => {
    const inl = props.map(p => el.style && el.style.getPropertyValue(p)).find(Boolean);
    if (inl) return { sel: '(inline style)', val: inl, media: '' };
    let hit = null;
    for (const r of rules) {
      const v = props.map(p => r.st.getPropertyValue(p)).find(Boolean);
      if (!v) continue;
      try {
        if (el.matches(r.sel)) hit = { sel: r.sel, val: v, media: r.media };
      } catch (e) {}
    }
    return hit;
  };
  const parse = c => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return [0, 0, 0, 1];
    const p = m[1]
      .split(/[ ,/]+/)
      .filter(Boolean)
      .map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const opac = el => {
    let o = 1;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= +getComputedStyle(e).opacity;
    return o;
  };
  const selOf = el => {
    const seg = [];
    for (let e = el, i = 0; e && e.nodeType === 1 && i < 3; e = e.parentElement, i++) {
      let s = e.tagName.toLowerCase();
      if (e.id) {
        seg.unshift(s + '#' + e.id);
        break;
      }
      const cl = [...e.classList].slice(0, 2);
      if (cl.length) s += '.' + cl.join('.');
      seg.unshift(s);
    }
    return seg.join('>');
  };
  const pe = document.createElement('style');
  pe.textContent = '*{pointer-events:auto!important}';
  document.head.appendChild(pe);
  const W = innerWidth,
    H = innerHeight;
  const groups = new Map();
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (!n.data.trim()) continue;
    const el = n.parentElement;
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TITLE)$/.test(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'visible' || cs.display === 'none') continue;
    const rg = document.createRange();
    rg.selectNodeContents(n);
    const rs = [...rg.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5);
    for (const r of rs) {
      const x0 = Math.max(0, r.left),
        y0 = Math.max(0, r.top),
        x1 = Math.min(W, r.right),
        y1 = Math.min(H, r.bottom);
      if (x1 - x0 < 1 || y1 - y0 < 1) continue;
      let g = groups.get(el);
      if (!g) groups.set(el, (g = { el, boxes: [], txt: '' }));
      g.boxes.push([x0, y0, x1, y1]);
    }
    if (groups.get(el)) groups.get(el).txt += n.data.trim() + ' ';
  }
  const out = [];
  for (const g of groups.values()) {
    const el = g.el,
      cs = getComputedStyle(el);
    /* 被別的東西蓋住：每個框的中心點最上面那個元素不是它自己或裡面的 */
    const vis = g.boxes.filter(([x0, y0, x1, y1]) => {
      const t = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2);
      return t && (t === el || el.contains(t) || t.contains(el));
    });
    const fillC = cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor : cs.color;
    const c = parse(fillC),
      o = opac(el);
    /* 顏色從哪條規則來：往上找第一個有寫 color 的 */
    let cr = null;
    for (let e = el; e && e.nodeType === 1 && !cr; e = e.parentElement) {
      cr = ruleFor(e, ['-webkit-text-fill-color', 'color']);
      if (cr && e !== el) cr.from = selOf(e);
    }
    /* 背景：往上找第一個背景不透明或有背景圖的 */
    let br = null,
      bgc = null;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const s = getComputedStyle(e),
        bc = parse(s.backgroundColor);
      if (bc[3] > 0 || s.backgroundImage !== 'none') {
        bgc = s.backgroundColor + (s.backgroundImage !== 'none' ? ' +image' : '');
        br = ruleFor(e, ['background-color', 'background', 'background-image']) || { sel: '(computed only)', val: '' };
        br.from = selOf(e);
        break;
      }
    }
    const fs = parseFloat(cs.fontSize),
      fw = +cs.fontWeight || (cs.fontWeight === 'bold' ? 700 : 400);
    out.push({
      sel: selOf(el),
      txt: g.txt.trim().replace(/\s+/g, ' ').slice(0, 40),
      fs,
      fw,
      large: fs >= 24 || (fs >= 18.66 && fw >= 700),
      rgba: [c[0], c[1], c[2], c[3] * o],
      boxes: g.boxes,
      occluded: vis.length === 0,
      cr,
      br,
      bgc,
      shadow: cs.textShadow !== 'none' ? cs.textShadow : '',
      stroke: cs.webkitTextStrokeWidth && parseFloat(cs.webkitTextStrokeWidth) > 0 ? cs.webkitTextStrokeWidth : ''
    });
  }
  pe.remove();
  /* canvas：最後一個完整畫完的那一格 */
  const ft = window.__ft || [];
  const last = Math.max(0, ...ft.map(f => f.fid));
  const cv = ft
    .filter(f => f.fid === last && f.cv.isConnected)
    .map(f => {
      const r = f.cv.getBoundingClientRect(),
        sx = r.width / f.cv.width,
        sy = r.height / f.cv.height;
      const vis =
        getComputedStyle(f.cv).visibility === 'visible' && getComputedStyle(f.cv).display !== 'none' && r.width > 0;
      return {
        canvas: f.cv.id || f.cv.className || 'canvas',
        t: f.t.slice(0, 40),
        font: f.font,
        fill: f.fill,
        ga: f.ga,
        stroke: f.stroke,
        vis,
        box: [r.left + f.x0 * sx, r.top + f.y0 * sy, r.left + f.x1 * sx, r.top + f.y1 * sy]
      };
    })
    .filter(f => f.vis && f.box[2] > 0 && f.box[3] > 0 && f.box[0] < W && f.box[1] < H);
  return {
    dom: out,
    canvas: cv,
    ver: typeof VER !== 'undefined' ? VER : '',
    W,
    H,
    dpr: devicePixelRatio,
    fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight)
  };
};

const FREEZE_CSS =
  '*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}';
const HIDE_CSS =
  '*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important}svg text{fill:transparent!important;stroke:none!important}';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext(CTX);
  await ctx.route(/supabase/, r => r.abort());
  await ctx.addInitScript(INIT);
  const p = await ctx.newPage(),
    errs = [],
    log = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?p=77&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene, null, { timeout: 30000 });
  await p.waitForTimeout(2500);

  const shot = async (name, how) => {
    try {
      await p.waitForTimeout(250);
      await p.evaluate(() => (window.__freeze = 1));
      await p.waitForTimeout(120);
      const fz = await p.addStyleTag({ content: FREEZE_CSS });
      await p.waitForTimeout(80);
      await p.screenshot({ path: path.join(OUT, name + '.png') });
      const m = await p.evaluate(MEASURE);
      const hd = await p.addStyleTag({ content: HIDE_CSS });
      await p.waitForTimeout(80);
      await p.screenshot({ path: path.join(RAWD, name + '.bg.png') });
      await hd.evaluate(e => e.remove());
      await fz.evaluate(e => e.remove());
      await p.evaluate(() => window.__unfreeze());
      fs.writeFileSync(path.join(RAWD, name + '.json'), JSON.stringify({ screen: name, how, ...m }));
      log.push({ screen: name, ok: true, how, dom: m.dom.length, canvas: m.canvas.length, ver: m.ver, fonts: m.fonts });
      console.log('📷', SIZE, name, m.dom.length, 'dom', m.canvas.length, 'canvas');
    } catch (e) {
      log.push({ screen: name, ok: false, how, err: String(e.message || e).slice(0, 300) });
      console.log('❌', name, e.message);
    }
  };
  const ev = async (f, arg) => {
    try {
      await p.evaluate(f, arg);
      return true;
    } catch (e) {
      console.log('⚠️ evaluate', e.message.slice(0, 200));
      return e.message.slice(0, 200);
    }
  };
  const port = PORTRAIT;
  const open = k => ev(([port, k]) => (closePanels(), port ? navGo(k) : openPanel(k)), [port, k]);

  /* 開場動畫（新存檔第一次進來） */
  await shot('01_開場動畫', '新存檔（localStorage 清空）重新整理後 2.5 秒，開場動畫播放中');
  await ev(() => {
    try {
      introStop();
    } catch (e) {}
    proSkip();
    S.story.tips = 0;
    S.orient = innerWidth > innerHeight ? 'l' : 'p';
    applyOrient();
  });
  await p.waitForTimeout(1500);
  await shot('02_藏身處', 'introStop()＋proSkip() 跳過開場，落在藏身處');
  await ev(() => (closePanels(), openPanel('node')));
  await shot('03_地點清單', 'openPanel("node")（地點清單＝唯一入口）');
  /* 準備資料：裝備、材料、靈魂、營地等級（讓面板有東西可看） */
  await ev(() => {
    closePanels();
    for (let i = 0; i < 24; i++) invPut(S.inv, dropItem(i < 8 ? 5 : 3));
    S.mat.soul = 12000;
    for (const k in CUR) S.mat[k] = (S.mat[k] || 0) + 7;
    matAdd('wood', 0, 800);
    Object.assign(S.camp, { forge: 3, altar: 2 });
    S.auto = 1;
    ST = stats();
    runNode(TRUNK_K[0]);
  });
  await p.waitForTimeout(7000);
  await shot('04_戰鬥中', 'runNode(TRUNK_K[0]) 自動戰鬥 7 秒（含 canvas 傷害數字）');
  await ev(() => banner('崇高石 ×1', 'cur'));
  await p.waitForTimeout(300);
  await shot('05_戰鬥_橫幅', '戰鬥中呼叫 banner("崇高石 ×1","cur")（稀有掉落橫幅）');
  await ev(() => {
    for (let i = 0; i < 4; i++) dropLog(['蛻變石', '增幅石', '富豪石', '崇高石'][i], 'cur');
  });
  await p.waitForTimeout(300);
  await shot('06_戰鬥_掉落紀錄', '呼叫 dropLog() 四次，HUD 的掉落紀錄列');
  await open(port ? 'bag' : 'inv');
  await shot('07_戰利品倉庫', port ? 'navGo("bag")' : 'openPanel("inv")');
  /* tooltip：桌機 hover、手機點一件 */
  if (port) {
    const row = await p.$('#pinv .bag > *');
    if (row) await row.tap().catch(() => row.evaluate(e => e.click()));
    await p.waitForTimeout(500);
    await shot('08_物品說明_點擊', '戰利品清單點第一件（手機 tap），出換裝卡／說明');
  } else {
    const row = await p.$('#pinv .bag > *');
    if (row) await row.hover();
    await p.waitForTimeout(700);
    await shot('08_物品說明_hover', '戰利品清單滑鼠移到第一件（hover）');
  }
  if (port) await open('char');
  else await ev(() => ((NAV.view = 'char'), hudPanels()));
  await shot('09_角色', port ? 'navGo("char")' : 'NAV.view="char"＋hudPanels()');
  await open('skill');
  await shot('10_技能總覽', 'skill 面板');
  await ev(() => document.querySelector('#pskill [data-sk="go:one:0"]').click());
  await shot('11_技能這一招', '技能總覽點第一招');
  await ev(() => ((CRAFT.tab = 'camp'), (CAMPUI.open = null)));
  await open('craft');
  await shot('12_營地總覽', 'CRAFT.tab="camp" 開營地面板');
  const cc = async k => {
    const b = await p.$(`#pcraft [data-fg="cc:${k}"]`);
    if (!b) return 'no button';
    try {
      await b.scrollIntoViewIfNeeded();
      await (PORTRAIT ? b.tap({ timeout: 5000 }) : b.click({ timeout: 5000 }));
    } catch (e) {
      await b.evaluate(e => e.click()); /* 被蓋住或在動：改用 DOM click */
    }
    await p.waitForTimeout(500);
    return (await p.evaluate(() => CAMPUI.open)) || 'closed';
  };
  let r = await cc('wood');
  await shot('13_產生器_林場展開', '營地總覽點林場卡標題 [data-fg="cc:wood"]（捲到看得到）；CAMPUI.open=' + r);
  r = await cc('forge');
  await shot('14_營地設施_鍛造台展開', '點鍛造台卡標題 [data-fg="cc:forge"]；CAMPUI.open=' + r);
  await ev(() => ((CAMPUI.open = null), (CRAFT.tab = 'make'), hudPanels()));
  await shot('15_打造', 'CRAFT.tab="make"（鍛造／打造頁）');
  await ev(() => ((CRAFT.tab = 'forge'), hudPanels()));
  await shot('16_鍛造台_填', 'CRAFT.tab="forge"（S.camp.forge=3 開的鍛造台分頁）');
  await ev(() => (closePanels(), (PANEL.stab = 'cur'), openPanel('stash')));
  await shot('17_通貨', 'openPanel("stash")，PANEL.stab="cur"');
  await ev(() => (closePanels(), openPanel('log')));
  await shot('18_掉落紀錄面板', 'openPanel("log")');
  if (port) {
    await open('more');
    await shot('19_更多', 'navGo("more")');
  }
  await ev(() => (closePanels(), openPanel('set')));
  await shot('20_設定', 'openPanel("set")');
  /* 名詞 tooltip：找第一個 .term */
  await ev(() => closePanels());
  await open('skill');
  await ev(() => document.querySelector('#pskill [data-sk="go:one:0"]').click());
  const term = await p.$('#pskill .term, #pskill [data-term]');
  if (term) {
    if (port) await term.tap().catch(() => term.evaluate(e => e.click()));
    else {
      await term.hover();
      await p.waitForTimeout(400);
      await term.click();
    }
    await p.waitForTimeout(600);
    await shot(
      port ? '21_名詞說明_點擊' : '21_名詞說明_hover',
      '技能這一招裡第一個名詞（' + (port ? 'tap' : 'hover 後 click；只 hover 不會出說明') + '）'
    );
  } else log.push({ screen: '21_名詞說明', ok: false, how: '', err: '技能頁找不到 .term／[data-term] 元素' });
  await ev(() => (closePanels(), (S.camp.altar = 4), treeOpen()));
  await p.waitForTimeout(800);
  await shot('22_天賦樹', 'S.camp.altar=4（祭壇夠了才開天賦樹）＋treeOpen()');
  await ev(() => (treeClose(), closePanels(), (S.camp.forge = 3)));
  /* 彈窗：打造翻牌 */
  const rv = await ev(() => {
    matAdd('wood', 0, 5000);
    for (let t = 1; t <= 2; t++) ['iron', 'hide', 'silk'].forEach(k => matAdd(k, t, 500));
    CRAFT.tab = 'make';
    openPanel('craft');
    craftGo();
  });
  await p.waitForTimeout(1200);
  await shot(
    '23_彈窗_打造翻牌',
    '給材料、營地→打造頁、呼叫 craftGo()（同打造鈕），出 revealOpen 打造模式；結果：' + rv
  );
  await ev(() => {
    closePanels();
    offShow(null, { wood: 1234, iron: 56 }, 3600e3);
  });
  await p.waitForTimeout(1200);
  await shot('24_彈窗_離線結算', 'offShow(null,{wood:1234,iron:56},1 小時)');
  await ev(() => {
    closePanels();
    S.auto = 0;
    G.ask = 'home';
    hudState && hudState();
  });
  await p.waitForTimeout(500);
  await shot('25_彈窗_回家確認', 'S.auto=0＋G.ask="home"（回藏身處確認卡）');
  await ev(() => {
    G.ask = 0;
    closePanels();
    S.auto = 0;
    P.hp = 0;
    die();
  });
  await p.waitForTimeout(900);
  await shot('26_死亡卡', 'S.auto=0、P.hp=0、die()（手動模式死亡卡）');
  fs.writeFileSync(
    path.join(RAWD, '_log.json'),
    JSON.stringify({ size: SIZE, ctx: CTX, url: URL, errs, log }, null, 1)
  );
  console.log(errs.length ? '頁面錯誤：' + errs.slice(0, 5).join(' / ') : '沒有頁面錯誤');
  await b.close();
})();
