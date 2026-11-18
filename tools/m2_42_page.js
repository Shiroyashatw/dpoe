/* M2-42 體檢截圖：注入頁面的量測與 AUDIT 補丁（addInitScript 載入；只在截圖工具裡用，不進遊戲碼）。
   M42.audit()：清單上半 §1 的 AUDIT 補丁；M42.measure()：DOM 區域、熱區、字級、截斷、重疊、捲動層、圖示倍率、色碼字面值、文字取樣 */
window.M42 = (() => {
  const vis = e => {
    if (!e || !e.isConnected) return false;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) {
      const s = getComputedStyle(x);
      /* 進場動畫中（凍結在第 0 毫秒）的透明度不算 */
      if (
        s.display === 'none' ||
        s.visibility === 'hidden' ||
        (+s.opacity < 0.05 && !x.getAnimations().length) ||
        x.hidden
      )
        return false;
    }
    return true;
  };
  const R = e => {
    const r = e.getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
  };
  const sel = e => {
    if (!e) return '';
    if (e.id) return '#' + e.id;
    const c = [...e.classList].slice(0, 2).join('.'),
      d = e.dataset && (e.dataset.a || e.dataset.sk || e.dataset.tm || e.dataset.fg);
    const p = e.parentElement && e.parentElement.closest('[id]');
    return (p ? '#' + p.id + ' ' : '') + e.tagName.toLowerCase() + (c ? '.' + c : '') + (d ? `[${d}]` : '');
  };
  const inter = (a, b) => {
    const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]),
      h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
    return w > 0 && h > 0 ? w * h : 0;
  };
  /* 量測用的區域（visual-review-protocol §3：場景＝畫布扣掉所有 DOM 元件） */
  const REG = {
    cv: '#cv',
    top: '#hud .top',
    bottom: '#hud .bottom',
    bar: '#bar',
    bars: '#hud .bars',
    pidle: '#pidle',
    pnav: '#pnav',
    dnav: '#dnav',
    modesw: '.modesw',
    panel: '#pstash,#pinv,#pasc,#pbox,#preveal,#plog,#pchase,#pskill,#pcraft,#pset,#pmore,#pnode',
    tree: '#ptree',
    over: '#over .card',
    tip: '#tip',
    ttip: '#ttip',
    banner: '#banner',
    chase: '#chase',
    warn: '#warn.on',
    lvup: '#lvup.on',
    dlog: '#dlog',
    prog: '#prog',
    area: '#area',
    run: '#run',
    bossbar: '#bossbar',
    phand: '#phand',
    intro: '#intro',
    prac: '#prac,#prd',
    paused: '#paused',
    rcd: '#rcd',
    rot: '#rot',
    stick: '#stick',
    tmore: '#tmore'
  };
  /* 熱區 */
  const HIT =
    'button,a[href],input,select,textarea,[role=button],[data-a],[data-tm],[data-sk],[data-fg],[data-chs],#bar .sk';
  function audit() {
    DBG.save(s => {
      s.mat.soul = 50000;
      s.mat.gold = 20000;
      s.auto = 1;
      /* 震地戰吼第 3 孔空著，對 4.jpg */
      s.skills[1] = { k: 'seiscry', so: [null, null, null], n: 3 };
      s.lib.sk = Object.assign(s.lib.sk || {}, { seiscry: 3, apshot: 1, grenade: 1, chargeslam: 1 });
      s.lib.sup = Object.assign(s.lib.sup || {}, { fireadd: 1, coldadd: 1, lightadd: 1, chaosadd: 1 });
      /* 倉庫與各裝備格都放有圖示的裝備（含稀有、至少一件 ★），用來抓米色方塊 */
      const put = (id, rar, slot) => {
        const it = mkItem(id, 40, rar);
        if (slot) s.eq[slot] = it;
        else invPut(s.inv, it);
        return it;
      };
      put('w_sword1_0', 2, 'weapon');
      /* 其餘部位從 BASES 各取一件放上（T 級照物品等級 40 的基底；項鍊做成 ★） */
      const pick = k => {
        const L = BASES.filter(b => b.k === k && b.lv <= 40);
        return L[L.length - 1].id;
      };
      const SL = {
        off: 'shield',
        helm: 'helm',
        chest: 'chest',
        gloves: 'gloves',
        boots: 'boots',
        belt: 'belt',
        amulet: 'amulet',
        ring1: 'ring',
        ring2: 'ring',
        ring3: 'ring'
      };
      for (const [slot, k] of Object.entries(SL)) {
        const it = put(pick(k), slot === 'ring2' ? 1 : 2, slot);
        if (slot === 'amulet' && it.a[0]) it.frac = it.a[0].k;
      }
      const ks = Object.keys(KINDS);
      for (let i = 0; i < 24; i++) {
        const k = ks[i % ks.length],
          L = BASES.filter(b => b.k === k && b.lv <= 40);
        const it = put(L[(i * 7) % L.length].id, i % 3);
        if (i === 5 && it.a && it.a[0]) it.frac = it.a[0].k;
      }
    });
    ST = stats();
    hudBar();
    hudPanels();
  }
  function measure(port) {
    const out = { regions: {}, vw: innerWidth, vh: innerHeight };
    for (const [k, q] of Object.entries(REG)) {
      const L = [...document.querySelectorAll(q)].filter(vis).map(R);
      if (L.length) out.regions[k] = L;
    }
    /* 熱區：可按元件最小的寬×高；門檻（F §3、§12）：直立 ≥ 44×44、主動作高 ≥ 48；桌機主動作高 ≥ 48、次要 ≥ 36、圖示鈕 ≥ 32 */
    const hits = [...document.querySelectorAll(HIT)].filter(
      e => vis(e) && !e.disabled && !e.closest('[aria-hidden=true]')
    );
    const top = hits.filter(e => !hits.some(o => o !== e && o.contains(e)));
    let min = null,
      bad = [];
    const rs = [];
    for (const e of top) {
      const r = R(e),
        pri = e.classList.contains('pri'),
        icon = !(e.textContent || '').trim(),
        need = port ? [44, pri ? 48 : 44] : [icon ? 32 : 36, pri ? 48 : icon ? 32 : 36];
      rs.push(r);
      if (!min || r[2] * r[3] < min[0] * min[1]) min = [r[2], r[3], sel(e)];
      if (r[2] < need[0] || r[3] < need[1]) bad.push(`${sel(e)} ${r[2]}x${r[3]}`);
    }
    let adj = 0;
    if (port)
      for (let i = 0; i < rs.length; i++)
        for (let j = i + 1; j < rs.length; j++) {
          const a = rs[i],
            b = rs[j];
          if (inter(a, b)) continue;
          const gx = Math.max(b[0] - (a[0] + a[2]), a[0] - (b[0] + b[2])),
            gy = Math.max(b[1] - (a[1] + a[3]), a[1] - (b[1] + b[3]));
          const g = Math.max(gx, gy);
          if (g >= 0 && g < 8 && (gx < 0 || gy < 0)) adj++;
        }
    out.hit = { n: top.length, min, bad: bad.slice(0, 40), nbad: bad.length, adj_lt8: adj };
    /* 字級、截斷、文字取樣 */
    const fonts = { min: 99, lt12: [], lt14: [], h_lt18: [] },
      trunc = [],
      text = [];
    const els = [...document.querySelectorAll('body *')].filter(
      e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && vis(e)
    );
    for (const e of els) {
      const s = getComputedStyle(e),
        fs = parseFloat(s.fontSize),
        small = !!e.closest('small,.k,.c-dim,kbd,.pill,.dot,label,.lbl,.tag'),
        head = /^H[1-3]$/.test(e.tagName) || !!e.closest('.ph > b');
      fonts.min = Math.min(fonts.min, fs);
      if (fs < 12) fonts.lt12.push(`${sel(e)} ${fs}`);
      else if (fs < 14 && !small) fonts.lt14.push(`${sel(e)} ${fs}`);
      if (head && fs < 18) fonts.h_lt18.push(`${sel(e)} ${fs}`);
      const cut =
        (e.scrollWidth > e.clientWidth + 1 && (s.overflow !== 'visible' || s.textOverflow === 'ellipsis')) ||
        (s.webkitLineClamp !== 'none' && s.webkitLineClamp && e.scrollHeight > e.clientHeight + 1);
      if (cut) trunc.push(`${sel(e)}「${e.textContent.trim().slice(0, 18)}」`);
      if (text.length < 500) {
        const rg = document.createRange();
        rg.selectNodeContents(e);
        const rr = rg.getBoundingClientRect();
        if (rr.width > 2 && rr.height > 2)
          text.push({
            r: [Math.round(rr.x), Math.round(rr.y), Math.round(rr.width), Math.round(rr.height)],
            c: s.color,
            fs,
            w: s.fontWeight,
            s: sel(e),
            /* 物品名稱、正負數值、稀有度色不算介面字色（M2-36 (e)） */
            x: !!e.closest('[class*="r-"],[class*="lg-"],.c-good,.c-bad,.up,.dn,.nm,.it-n,.rar,[class*="rar"]'),
            key: !!e.closest('.btn.pri,h1,h2,.ph > b,.big,.dps')
          });
      }
    }
    out.fonts = {
      min: fonts.min,
      lt12: fonts.lt12.slice(0, 30),
      nlt12: fonts.lt12.length,
      lt14: fonts.lt14.slice(0, 30),
      nlt14: fonts.lt14.length,
      h_lt18: fonts.h_lt18.slice(0, 10)
    };
    out.trunc = trunc.slice(0, 40);
    out.ntrunc = trunc.length;
    out.text = text;
    /* 捲動層：同時可捲的 overflow:auto|scroll 元件 */
    const sc = [...document.querySelectorAll('body *')].filter(e => {
      if (!vis(e)) return false;
      const s = getComputedStyle(e);
      return (
        /(auto|scroll)/.test(s.overflowY + s.overflowX) &&
        (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)
      );
    });
    out.scroll = sc.map(sel);
    /* 巢狀最深幾層 */
    out.scroll_depth = Math.max(0, ...sc.map(e => sc.filter(o => o.contains(e)).length));
    /* 重疊：主要元件兩兩交集 px² */
    const big = [
      'bar',
      'pidle',
      'panel',
      'pnav',
      'dnav',
      'top',
      'bottom',
      'banner',
      'chase',
      'over',
      'prog',
      'dlog',
      'modesw',
      'tree',
      'tip',
      'prac',
      'bossbar',
      'run',
      'warn',
      'lvup'
    ];
    const ov = {};
    for (let i = 0; i < big.length; i++)
      for (let j = i + 1; j < big.length; j++) {
        const A = out.regions[big[i]],
          B = out.regions[big[j]];
        if (!A || !B) continue;
        let s = 0;
        for (const a of A) for (const b of B) s += inter(a, b);
        if (s) ov[big[i] + '/' + big[j]] = s;
      }
    out.overlap = ov;
    /* 技能鍵被擋住的面積（elementFromPoint 取樣，每 4 px） */
    let skA = 0,
      skB = 0;
    for (const e of document.querySelectorAll('#bar .sk')) {
      if (!vis(e)) continue;
      const r = e.getBoundingClientRect();
      for (let y = r.top + 2; y < r.bottom; y += 4)
        for (let x = r.left + 2; x < r.right; x += 4) {
          skA += 16;
          const t = document.elementFromPoint(x, y);
          if (!t || !(e.contains(t) || t.contains(e))) skB += 16;
        }
    }
    out.sk_area = skA;
    out.sk_block = skB;
    /* 資源條兄弟列交集 */
    let rb = 0,
      rbo = 0;
    for (const p of document.querySelectorAll('.cmtop')) {
      if (!vis(p)) continue;
      const L = [...p.children].filter(vis).map(R),
        pr = R(p);
      for (let i = 0; i < L.length; i++) {
        for (let j = i + 1; j < L.length; j++) rb += inter(L[i], L[j]);
        rbo += L[i][2] * L[i][3] - inter(L[i], pr);
      }
    }
    out.rbar_overlap = rb;
    out.rbar_outside = rbo;
    /* 圖示倍率：顯示寬 ÷ naturalWidth 不是整數的 */
    const ic = [];
    for (const im of document.querySelectorAll('img')) {
      if (!vis(im) || !im.naturalWidth) continue;
      const k = im.getBoundingClientRect().width / im.naturalWidth;
      if (Math.abs(k - Math.round(k)) > 0.02) ic.push(`${sel(im)} ${k.toFixed(2)}`);
    }
    out.icon_bad = [...new Set(ic)].slice(0, 20);
    out.nicon_bad = ic.length;
    out.img_broken = [...document.querySelectorAll('img')]
      .filter(im => vis(im) && !(im.complete && im.naturalWidth))
      .map(sel)
      .slice(0, 10);
    /* 色碼字面值（只記有無與選擇器）：可見元件的 style 屬性 */
    const lit = new Set();
    for (const e of document.querySelectorAll('[style]'))
      if (vis(e) && /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(e.getAttribute('style'))) lit.add(sel(e));
    out.color_lit = [...lit].slice(0, 20);
    /* 焦點框 */
    const f = document.activeElement;
    out.focus =
      f && f !== document.body
        ? { s: sel(f), outline: getComputedStyle(f).outlineWidth + ' ' + getComputedStyle(f).outlineStyle }
        : null;
    return out;
  }
  /* 凍結中新開始的進場動畫停在第 0 毫秒（半透明）：有限長度的推到結尾（只動動畫時間，不推遊戲時間）；循環的照 DBG.freeze 停在 0 */
  function finishAnims() {
    for (const a of document.getAnimations()) {
      const t = a.effect && a.effect.getComputedTiming();
      if (t && isFinite(t.endTime) && a.playState === 'paused') a.currentTime = Math.max(0, t.endTime - 1);
    }
  }
  return { audit, measure, vis, R, sel, finishAnims };
})();
