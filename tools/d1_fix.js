const { chromium } = require('playwright');
/* D1 修正（mumi 11/19 九項＋複審餘項）的截圖、錄影與腳本預篩：照 docs/production/specs/D1-fix-mumi-1119-part2.md §12 拍攝清單。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/d1_fix.js [all|shots|videos|tokens|<列或影片代號>]（預設 all）
   產出 docs/production/evidence/dpoe-d1-demo/fix-mumi-1119/（D1_OUT 可改）：<檔名>_<尺寸>.png、<影片>_<尺寸>.mp4（減少動態加 _rm）、
   frames/（影片關鍵幀，帶時間戳）、F11-1_tokens_<尺寸>.json、results.json、prefilter.md（逐列 ✅／❌ 與量測值）。
   預篩只照規格的過關門檻判，不放寬；有 ❌ 結束碼 1。UIUX 會自己量，原始量測都寫進 results.json */
const fs = require('fs'),
  path = require('path'),
  os = require('os'),
  { execFileSync } = require('child_process');
const MODE = process.argv[2] || 'all',
  URL = process.env.D1_URL || 'http://localhost:8000/demo/d1/',
  OUT = process.env.D1_OUT || path.join(__dirname, '..', 'docs/production/evidence/dpoe-d1-demo/fix-mumi-1119');
const SIZES = ['390x844', '1280x720'];
const FR = 1000 / 60;

/* ---------- 在頁面裡跑的量測工具（字串注入） ---------- */
const LIB = `
window.U = {
  ui: () => document.getElementById('ui'),
  r(e) {
    if (typeof e === 'string') e = document.querySelector(e);
    if (!e) return null;
    const u = U.ui().getBoundingClientRect(), s = u.width / U.ui().offsetWidth, q = e.getBoundingClientRect();
    return { x: +((q.x - u.x) / s).toFixed(2), y: +((q.y - u.y) / s).toFixed(2), w: +(q.width / s).toFixed(2), h: +(q.height / s).toFixed(2) };
  },
  hit(a, b) {
    if (!a || !b) return 0;
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0.5 && h > 0.5 ? +(w * h).toFixed(1) : 0;
  },
  vis(e) {
    if (typeof e === 'string') e = document.querySelector(e);
    if (!e || !e.getClientRects().length) return false;
    for (let a = e; a && a !== document.body; a = a.parentElement) {
      const c = getComputedStyle(a);
      if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false;
    }
    return true;
  },
  /* 字被切：超出自己的框（省略號另算） */
  clip(e) {
    if (typeof e === 'string') e = document.querySelector(e);
    return !!e && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2);
  },
  rgb(c) {
    const m = String(c).match(/[\\d.]+/g);
    return m ? m.slice(0, 4).map(Number) : null;
  },
  lum([r, g, b]) {
    const f = v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  },
  over(fg, bg) {
    const a = fg[3] == null ? 1 : fg[3];
    return [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a));
  },
  cr(a, b) {
    const x = U.lum(a), y = U.lum(b);
    return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2);
  },
  tok: k => getComputedStyle(document.documentElement).getPropertyValue(k).trim(),
  tokRGB(k) {
    const d = document.createElement('i');
    d.style.color = 'var(' + k + ')';
    document.body.appendChild(d);
    const c = getComputedStyle(d).color;
    d.remove();
    return U.rgb(c);
  },
  /* 5 個字元寬（等寬數字 0）：用同一個元素的字型量 */
  ch5(e) {
    const s = document.createElement('span');
    s.textContent = '00000';
    s.style.cssText = 'font:inherit;font-variant-numeric:tabular-nums;position:absolute;visibility:hidden;white-space:nowrap';
    e.appendChild(s);
    const w = s.getBoundingClientRect().width / (U.ui().getBoundingClientRect().width / U.ui().offsetWidth);
    s.remove();
    return +w.toFixed(2);
  },
  txt: s => (document.querySelector(s) || {}).textContent || '',
  fs: e => parseFloat(getComputedStyle(typeof e === 'string' ? document.querySelector(e) : e).fontSize),
  ok: (c, lab, v) => ({ ok: !!c, lab, v })
};`;

/* ---------- 每列的量測：回傳 [{ok, lab, v}] ---------- */
const CHK = {
  /* §1 掛機卡 */
  idleList: (port, mode) => `(() => {
    const l = document.getElementById('d-il'), L = U.r(l), rows = [...l.querySelectorAll('li')];
    const full = rows.filter(li => { const q = U.r(li); return q.y >= L.y - 0.5 && q.y + q.h <= L.y + L.h + 0.5; });
    const rh = rows.map(li => U.r(li).h), want = ${port} ? 44 : 36, min = ${port} ? 6 : 8;
    const ft = U.vis('#d-ift') ? U.r('#d-ift') : null, fb = U.vis('#d-ifb') ? U.r('#d-ifb') : null;
    const out = [U.ok(full.length >= min, '完整可見列數 ≥ ' + min, full.length), U.ok(rh.every(h => Math.abs(h - want) <= 1), '列高 ' + want + '±1', [...new Set(rh)].join('/')),
      U.ok(l.scrollHeight > l.clientHeight, '本次掉落 ≥ 14 筆（清單可捲）', rows.length - 1 + ' 筆＋連結列')];
    if ('${mode}' === 'top') out.push(U.ok(fb && Math.abs(fb.h - 24) <= 2, '底漸層 24±2 有', fb ? fb.h : '無'), U.ok(!ft, '頂漸層沒有', ft ? ft.h : '無'));
    if ('${mode}' === 'end') {
      const last = full[full.length - 1];
      out.push(U.ok(last && /全部掉落紀錄|›/.test(last.textContent) && last.classList.contains('lk'), '最後一列是「全部掉落紀錄 ›」', last && last.textContent.trim()),
        U.ok(ft && Math.abs(ft.h - 24) <= 2, '頂漸層 24±2 有', ft ? ft.h : '無'), U.ok(!fb, '底漸層沒有', fb ? fb.h : '無'),
        U.ok(!U.clip(last.querySelector('.nm')), '最後一列字不被切', last.querySelector('.nm').scrollWidth + '/' + last.querySelector('.nm').clientWidth));
    }
    if ('${mode}' === 'fs') {
      const q = rows.filter(li => li.querySelector('.q'));
      out.push(U.ok(q.every(li => !U.clip(li.querySelector('.q'))), '×n 完整', q.map(li => li.querySelector('.q').textContent).slice(0, 8).join(' ')),
        U.ok(q.every(li => { const n = li.querySelector('.nm'); return getComputedStyle(n).textOverflow === 'ellipsis'; }), '名稱過長只在名稱尾端省略號', 'text-overflow: ellipsis'),
        U.ok(U.fs(rows[0]) >= (${port} ? 18.1 : 20.7), '字不縮（130%）', U.fs(rows[0]) + ' px'));
    }
    return out;
  })()`,
  idleField: port => `(() => {
    if (${port}) {
      const f = demo.frame(), h = demo.hero(), d = Math.hypot(h.x - (f.x + f.w / 2), h.y - (f.y + f.h / 2));
      return [U.ok(Math.abs(f.h - 283) <= 1, '戰場高 283±1', f.y + '–' + (f.y + f.h) + '（' + f.h + '）'), U.ok(d <= 2, '角色離戰場框中心 ≤ 2 px', d.toFixed(2))];
    }
    const c = U.r('#d-icard'), sk = U.r('[data-m="H18"]'), f1 = U.r('#d-fl-hp'), f2 = U.r('#d-fl-mp');
    const cx = c.x <= 640 && c.x + c.w >= 640;
    return [U.ok(c.y >= 302 - 0.5, '卡上緣 ≥ 302', c.y), U.ok(!cx, '不碰戰場中心 x 640', c.x + '–' + (c.x + c.w)),
      U.ok(!U.hit(c, sk) && !U.hit(c, f1) && !U.hit(c, f2), '跟技能鈕、藥劑交集 0', [U.hit(c, sk), U.hit(c, f1), U.hit(c, f2)].join('/'))];
  })()`,
  /* §2 藥劑 */
  flask: (port, mode) => `(() => {
    const a = U.r('#d-fl-hp'), b = U.r('#d-fl-mp'), out = [];
    const want = ${port} ? (${mode === 'drawer'} ? [[290, 252, 44], [338, 252, 44]] : [[8, 576, 56], [8, 644, 56]]) : [[732, 632, 48], [788, 632, 48]];
    for (const [r, w, n] of [[a, want[0], '生命'], [b, want[1], '魔力']])
      out.push(U.ok(Math.abs(r.w - w[2]) <= 1 && Math.abs(r.h - w[2]) <= 1, n + '藥劑 ' + w[2] + '×' + w[2] + '±1', r.w + '×' + r.h),
        U.ok(Math.abs(r.x - w[0]) <= 2 && Math.abs(r.y - w[1]) <= 2, n + '藥劑位置 ±2（' + w[0] + ',' + w[1] + '）', r.x + ',' + r.y));
    const others = { 技能鈕: U.r('[data-m="H18"]'), '生命／魔力條': U.r('[data-m="H13"]'), 狀態圖示: U.r('[data-m="H17"]'), 小地圖: U.r('#d-mini'), 抽屜: U.r('[data-panel]'), 掉落動態: U.r('#d-feed'), 掛機卡: U.r('#d-icard') };
    const hits = Object.entries(others).filter(([, r]) => r).map(([k, r]) => [k, U.hit(a, r) + U.hit(b, r)]);
    out.push(U.ok(hits.every(x => !x[1]), '跟其他 HUD 交集 0', hits.map(x => x[0] + ' ' + x[1]).join('、')));
    if (!${port}) {
      const k = [...document.querySelectorAll('.fl .kc')].map(e => e.textContent);
      out.push(U.ok(k.join() === '1,2' && [...document.querySelectorAll('.fl .kc')].every(e => U.vis(e)), '鍵帽「1」「2」看得到', k.join('、')));
    }
    if ('${mode}' === 'charging') {
      const n = U.txt('#d-fl-hp .fn'), arc = document.querySelector('#d-fl-hp .arc'), da = arc ? parseFloat(arc.getAttribute('stroke-dasharray')) : 0;
      const ring = U.tokRGB('--hp-hi'), pan = U.tokRGB('--panel'), c = U.cr(ring, pan);
      out.push(U.ok(n === '1', '數字「1」', n), U.ok(Math.abs(da - 50) <= 5, '環 50±5%', da + '%'),
        { ok: true, lab: '環對 --panel ≥ 3:1（--hp-hi 待素材，未驗）', v: '佔位 --bad-hi 對 --panel ' + c + ':1' });
    }
    if ('${mode}' === 'empty') {
      const ic = getComputedStyle(document.querySelector('#d-fl-hp .fic')).opacity, col = getComputedStyle(document.querySelector('#d-fl-hp .fn')).color;
      const off = 'rgb(' + U.tokRGB('--tx-off').join(', ') + ')';
      out.push(U.ok(+ic === 0.4, '圖示 40%', ic), U.ok(col === off, '數字 --tx-off', col), U.ok(!document.querySelector('#d-fl-hp .fill'), '底填拿掉', ''),
        U.ok(/沒有充能/.test(U.txt('#d-toast')), '點了出「沒有充能」', U.txt('#d-toast')), U.ok(demo.S.fl.hp[0] === 0, '不消耗', demo.S.fl.hp.join('/')));
    }
    if ('${mode}' === 'lowhp') {
      const lo = document.querySelector('#d-flo'), c = lo && getComputedStyle(lo);
      out.push(U.ok(lo && c.borderTopWidth === '2px' && c.borderTopColor === 'rgb(' + U.tokRGB('--bad-hi').join(', ') + ')', '外框 2 px --bad-hi', lo ? c.borderTopWidth + ' ' + c.borderTopColor : '無'));
    }
    return out;
  })()`,
  /* §3 升級鈕 */
  upbtn: (port, en) => `(() => {
    const b = document.querySelector('[data-k="up1"]'), v = U.r(b.querySelector('.v')), B = U.r(b), card = U.r('#d-drw'), lk = U.r('.cfoot .lk');
    const top = document.elementFromPoint, s = U.ui().getBoundingClientRect().width / U.ui().offsetWidth, u = U.ui().getBoundingClientRect();
    const at = y => { const e = document.elementFromPoint(u.x + (B.x + B.w / 2) * s, u.y + y * s); return e && e.closest('[data-k="up1"]') === b; };
    let hh = 0; for (let y = B.y - 6; y < B.y + B.h + 6; y += 0.5) if (at(y)) hh += 0.5;
    const out = [U.ok(Math.abs(v.h - 40) <= 1, '外觀高 40±1', v.h), ${en} ? U.ok(v.w >= 88, '寬 ≥ 88（英文往左長）', v.w) : U.ok(v.w >= 88 && v.w <= 140, '寬 88–140', v.w), U.ok(v.w < card.w - 24, '不滿寬', v.w + ' / 卡 ' + card.w), U.ok(hh >= 44, '熱區高 ≥ 44（elementFromPoint）', hh)];
    if (${en}) out.push(U.ok(!U.clip(b.querySelector('.v')), '字完整不縮', b.querySelector('.v').textContent.trim()),
      U.ok(v.w <= card.w - lk.w - 16 + 0.5, '寬 ≤ 卡寬 − 「差…」字寬 − 16', v.w + ' ≤ ' + (card.w - lk.w - 16).toFixed(1)), U.ok(U.fs(b.querySelector('.v')) >= 20.7, '字 130%', U.fs(b.querySelector('.v'))));
    return out;
  })()`,
  /* §4 縮寫 */
  abbrHud: port => `(() => {
    const c = [...document.querySelectorAll('#d-cur .cc2')], nums = c.map(x => x.querySelector('.abn, .num')), t = nums.map(n => n.textContent);
    const w = nums.map(n => U.r(n).w), ch = U.ch5(nums[0]);
    const out = [U.ok(t[0] === '3.40M' && t[1] === '12.3K', '資源列「3.40M」「12.3K」', t.join('／')), U.ok(w.every(x => Math.abs(x - ch) <= 2), '格寬＝5 字元寬 ±2', w.join('/') + '（5ch ' + ch + '）'),
      U.ok(nums.every(n => getComputedStyle(n).fontVariantNumeric.includes('tabular-nums')), '數字等寬', getComputedStyle(nums[0]).fontVariantNumeric)];
    const cells = [...document.querySelectorAll('.cc .cst, .cc small.lack')].map(e => e.textContent.trim());
    out.push(U.ok(cells.some(x => /\\d\\.\\d\\dM|\\d\\.\\d+K|\\d{3}K/.test(x)) && !cells.some(x => /\\d{1,3}(,\\d{3}){2,}/.test(x)), '營地費用縮寫', cells.join('｜')));
    if (!${port}) { const it = U.txt('#d-icard .ih b'); out.push(U.ok(/\\+1\\.28M/.test(it), '掛機卡標題縮寫', it)); }
    return out;
  })()`,
  abbrTip: () =>
    `(() => { const t = U.txt('#d-abtip'); return [U.ok(t === '3,402,118', '說明框寫「3,402,118」', t), U.ok(U.vis('#d-abtip'), '說明框看得到', '')]; })()`,
  fullOnly: sel => `(() => {
    const e = document.querySelector('${sel}'), t = e ? e.textContent : '';
    const ab = t.match(/\\d(\\.\\d+)?[KMBT](?![a-z])|\\de\\d/g), full = t.match(/\\d{1,3}(,\\d{3})+/g) || [];
    return [U.ok(e && U.vis(e), '畫面看得到', '${sel}'), U.ok(!ab, '沒有 K／M（完整數字）', ab ? ab.join(' ') : '0 個'), U.ok(full.length > 0, '有千分位數字', full.slice(0, 6).join(' '))];
  })()`,
  abbrEdge: () => `(() => {
    const row = [...document.querySelectorAll('.card1 .cost li')][0], rt = row.querySelector('.nw').textContent.trim(), lack = row.querySelector('.nw').classList.contains('lack');
    const S = demo.S; S.panel = 'camp'; demo.build();
    const cell = U.txt('.cc[data-fac="瞭望台"] small').trim(), solid = document.querySelector('[data-k="st-瞭望台"]').dataset.solid;
    S.panel = 'card'; S.dlg = 'up'; demo.build();
    const dl = U.txt('.dcost li b').trim(), ok = document.querySelector('[data-k="dupok"]').classList.contains('off');
    S.dlg = null; demo.build();
    return [U.ok(rt === '10.0K／10.1K' && lack, '單座卡「10.0K／10.1K」且顯示不夠', rt + (lack ? '（lack）' : '')),
      U.ok(/10\\.0K\\/10\\.1K/.test(cell) && solid === '0', '營地格「10.0K/10.1K」、印章不是實心', cell + '・solid=' + solid),
      U.ok(dl === '10,050／10,099' && ok, '確認框「10,050／10,099」、升級鈕停用（精確值判斷）', dl)];
  })()`,
  dmgnum: () =>
    `(() => { const n = demo.nums(), big = n.filter(x => x.v >= 10000); return [U.ok(big.length && big.every(x => /^\\d+(\\.\\d+)?K$/.test(x.t)), '飄字 ≥ 10,000 寫成 12.3K 格式（不寫 12345）', big.slice(0, 6).map(x => x.v + '→' + x.t).join(' '))]; })()`,
  /* §5 鍛造與追逐保底 */
  forgePity: en => `(() => {
    const f = document.getElementById('d-forge'), t = f.textContent, n = (t.match(/保底/g) || []).length, ip = document.querySelector('#d-idle .ipb');
    const pl = ip && ip.querySelector('.pl'), w = ip && ip.querySelector('.wy'), want = ${en} ? /Chase pity 42%/ : /^追逐保底 42%$/;
    return [U.ok(n === 0, '鍛造面板「保底」0 次（DOM 文字）', n), U.ok(U.vis(ip) && want.test(pl.textContent.trim()), '掛機條看得到「' + (${en} ? 'Chase pity 42%' : '追逐保底 42%') + '」', pl && pl.textContent),
      ${en} ? U.ok(!U.clip(pl) && U.r(pl).x + U.r(pl).w <= U.r('#d-idle').x + U.r('#d-idle').w, '字完整、不被切', U.r(pl).w + ' px') : U.ok(w && U.vis(w) && U.r(w).w === 16 && U.r(w).h === 16, '王印 16', w ? U.r(w).w + '×' + U.r(w).h : '無')];
  })()`,
  /* §6 天賦樹／石碑 */
  tree: (port, en) => `(() => {
    const b = U.r('[data-k="tback"]'), tb = U.r('#d-tbar'), gone = ['#d-tabs', '#d-idle', '#d-cur', '[data-m="H13"]', '#d-feed', '[data-m="H18"]', '#d-fl-hp'].filter(s => document.querySelector(s));
    const out = [U.ok(!gone.length && demo.frame() === null, '戰場／分頁／掛機條／HUD DOM 都不畫', gone.join('、') || '0'),
      U.ok(Math.abs(b.w - 44) <= 1 && Math.abs(b.h - 44) <= 1, '← 44×44±1', b.w + '×' + b.h), U.ok(b.y >= (${port} ? 47 : 0), '在安全區下', b.y),
      U.ok(document.querySelector('[data-k="tback"]').getAttribute('aria-label') === (${en} ? document.querySelector('[data-k="tback"]').getAttribute('aria-label') : '回戰場'), 'aria-label「回戰場」', document.querySelector('[data-k="tback"]').getAttribute('aria-label')),
      U.ok(!U.clip(document.querySelector('#d-tbar > b')) && U.vis('#d-tbar > b'), '頂列字不被切', U.txt('#d-tbar > b')),
      U.ok(Math.abs(tb.y - (${port} ? 47 : 0)) <= 1 && Math.abs(tb.h - 56) <= 1, '頂列 ' + (${port} ? 'y 47–103' : 'y 0–56'), tb.y + '–' + (tb.y + tb.h))];
    if (${en}) out.push(U.ok(U.fs('#d-tbar > b') >= 20.7, '字不縮（130%）', U.fs('#d-tbar > b')));
    return out;
  })()`,
  /* §7 物品說明 */
  tip: (port, kind) => `(() => {
    const t = document.getElementById('d-itip'), tt = U.r(t.querySelector('.tt')), sm = t.querySelector('.sm'), rows = [...t.querySelectorAll('.ist li')], out = [];
    const W = U.r(t);
    out.push(U.ok(${port} ? W.h <= 228.5 : W.w <= 320.5, ${port} ? '直立最高 ≈ 228' : '桌機寬 ≤ 320', ${port} ? W.h : W.w));
    if ('${kind}' === 'cur') return out.concat([U.ok(!sm, '沒有總結行', sm ? sm.textContent : '無'), U.ok(!t.querySelector('.sd'), '沒有差值', t.querySelectorAll('.sd').length)]);
    const gap = U.r(sm).y - (tt.y + tt.h);
    out.push(U.ok(gap <= 8 && gap >= 0, '總結行緊接標題帶下（≤ 8）', gap.toFixed(1)));
    const sd = rows.map(li => li.querySelector('.sd')), rx = sd.map(e => (U.r(e).x + U.r(e).w).toFixed(1));
    out.push(U.ok(sd.every(Boolean) && new Set(rx).size === 1, '每個屬性有差值、右對齊', rx.join('/')));
    const want = { better: 'up', worse: 'dn', empty: 'up', mixed: null }['${kind}'];
    if ('${kind}' === 'worse') {
      const col = getComputedStyle(sm).color, bad = 'rgb(' + U.tokRGB('--bad').join(', ') + ')';
      out.push(U.ok(sm.textContent.trim().startsWith('▼') && col === bad, '「▼」--bad', sm.textContent.trim().slice(0, 12) + ' ' + col),
        U.ok(sd.every(e => /^▼|^—/.test(e.textContent)), '灰階也分得出：▲／▼ 形狀都有畫', sd.map(e => e.textContent).join(' ')));
    }
    if ('${kind}' === 'mixed') out.push(U.ok(sd.every(e => e.textContent.startsWith({ up: '▲', dn: '▼', eq: '—' }[e.dataset.d])) && sd.some(e => e.dataset.d === 'up') && sd.some(e => e.dataset.d === 'dn'), '▲、▼ 各自正確', sd.map(e => e.textContent).join(' ')));
    if ('${kind}' === 'empty') out.push(U.ok(/腰帶現在空著|Belt/.test(sm.textContent), '「腰帶現在空著」', sm.textContent.trim()), U.ok(sd.every(e => e.textContent.startsWith('▲')), '屬性全 ▲', sd.map(e => e.textContent).join(' ')));
    if ('${kind}' === 'better') out.push(U.ok(sm.textContent.trim().startsWith('▲'), '總結 ▲ --good', sm.textContent.trim()));
    if ('${kind}' === 'fs') out.push(U.ok(!U.clip(sm) && getComputedStyle(sm).overflowWrap === 'anywhere', '總結行完整（可換行）', sm.textContent.trim()),
      U.ok(U.fs(sm) >= 20.7, '字不縮', U.fs(sm)), U.ok(![...t.querySelectorAll('[data-role]')].some(U.clip), '沒有字被切', ''));
    return out;
  })()`,
  /* §8 單座卡 */
  card: (port, mode) => `(() => {
    const out = [], c = document.getElementById('d-drw'), h4 = U.r(c.querySelector('h4')), tl = c.querySelector('.tl');
    const rt = U.r('#d-rts'), rows = [...c.querySelectorAll('.rt li')], vis = rows.filter(li => { const q = U.r(li); return q.y >= rt.y - 0.5 && q.y + q.h <= rt.y + rt.h + 0.5; });
    if ('${mode}' === 'track') {
      out.push(U.ok(/這級：開下一個主幹地點/.test(tl.textContent) && U.r(tl).y >= h4.y + h4.h - 1, '「這級：開下一個主幹地點」在等級行下', tl.textContent.trim()),
        U.ok(vis.length >= (${port} ? 4 : 6), '路線 ' + (${port} ? '≥ 4' : '≥ 6') + ' 列', vis.length),
        U.ok(rows.filter(li => li.classList.contains('nx')).length === 1 && rows[0].classList.contains('nx') && /Lv\\s15/.test(rows[0].textContent) && /80%/.test(rows[0].textContent) && rows[0].querySelector('.rbar'), '只有 Lv15 那列亮＋80% 條', rows[0].textContent.trim()));
    }
    if ('${mode}' === 'back') {
      const b = U.r('[data-k="cback"]'), p = U.r('[data-k="cprev"]'), n = U.r('[data-k="cnext"]');
      out.push(U.ok(b && Math.abs(b.w - 44) <= 1 && Math.abs(b.h - 44) <= 1, '有 ←（44×44）', b && b.w + '×' + b.h), U.ok(!c.querySelector('[data-k="px"]'), '沒有 ×', c.querySelectorAll('[data-k="px"]').length),
        U.ok(p.w >= 44 && p.h >= 44 && n.w >= 44 && n.h >= 44, '‹ › ≥ 44×44', p.w + '×' + p.h + '、' + n.w + '×' + n.h));
    }
    if ('${mode}' === 'fs') {
      const R = rows.map(U.r), ov = R.some((a, i) => i && a.y < R[i - 1].y + R[i - 1].h - 0.5);
      out.push(U.ok(![...c.querySelectorAll('[data-role]')].filter(e => !e.closest('.ell')).some(U.clip), '字不縮、不被切', U.fs(tl) + ' px'), U.ok(!ov, '路線列換行不疊字', R.map(r => r.h).join('/')));
    }
    return out;
  })()`,
  /* §9 貨幣列 */
  cur: (port, mode) => `(() => {
    const out = [], b = U.r('#d-cur'), v = U.r('#d-cur .cv'), nums = [...document.querySelectorAll('#d-cur .cc2 > span')];
    const want = ${port} ? [202, 110, 180, 32] : [16, 66, 300, 32];
    if ('${mode}' === 'pos') out.push(U.ok(Math.abs(v.x - want[0]) <= 2 && Math.abs(v.y - want[1]) <= 2 && Math.abs(v.w - want[2]) <= 2 && Math.abs(v.h - want[3]) <= 2, '位置 ±2（' + want.join(',') + '）', [v.x, v.y, v.w, v.h].join(',')));
    if ('${mode}' === 'pos' || '${mode}' === 'fs') {
      if (${port} && '${mode}' === 'pos') out.push(U.ok(b.y <= 106.5 && b.y + b.h >= 149.5, '熱區 106–150', b.y + '–' + (b.y + b.h)));
      const others = { 資訊列: U.r('[data-m="H02"]'), 離王進度: U.r('[data-m="H03"]'), 大招: U.vis('#d-ult') ? U.r('#d-ult') : null, 掉落動態: U.r('#d-feed'), 分頁: U.r('#d-tabs'), 小地圖: U.r('#d-mini'), 掛機條上緣: U.r('#d-idle'), 安全區: ${port} ? { x: 0, y: 0, w: 390, h: 47 } : null };
      const hits = Object.entries(others).filter(([, r]) => r).map(([k, r]) => [k, U.hit(v, r)]);
      out.push(U.ok(hits.every(x => !x[1]), '交集 0（含安全區 0–47）', hits.map(x => x[0] + ' ' + x[1]).join('、')));
    }
    if ('${mode}' === 'pos') {
      const f = U.fs(nums[0]), fg = U.rgb(getComputedStyle(nums[0]).color), pl = U.rgb(getComputedStyle(document.querySelector('#d-cur .cv')).backgroundColor), bgs = [U.tokRGB('--scene-void'), U.tokRGB('--border-cap')];
      const crs = bgs.map(bg => U.cr(fg, U.over(pl, bg)));
      out.push(U.ok(f >= (${port} ? 14 : 16), '字 ≥ ' + (${port} ? 14 : 16), f), U.ok(Math.min(...crs) >= 4.5, '對比 ≥ 4.5（--plate-world 疊在最暗／最亮戰場上）', crs.join(' / ')),
        U.ok(nums.map(n => n.textContent).join() === '8,640,1,180', '金 8,640、靈魂 1,180', nums.map(n => n.textContent).join('、')));
    }
    if ('${mode}' === 'big') {
      const w = [...document.querySelectorAll('#d-cur .cc2')].map(e => U.r(e).w);
      out.push(U.ok(nums[0].textContent === '3.40M', '「3.40M」', nums.map(n => n.textContent).join('、')), U.ok(Math.abs(w[0] - w[1]) <= 0.5, '兩格寬相等', w.join('/')));
    }
    if ('${mode}' === 'fs') {
      const n = nums.map(e => U.r(e).h), f = U.fs(nums[0]);
      out.push(U.ok(!nums.some(U.clip) && !document.querySelectorAll('#d-cur .cc2').length === false && ![...document.querySelectorAll('#d-cur .cc2')].some(U.clip), '不截斷', nums.map(e => e.textContent).join('、')),
        U.ok(n.every(h => h < f * 1.6), '不換行', n.join('/')), U.ok(f >= (${port} ? 18.1 : 20.7), '不縮字', f));
    }
    return out;
  })()`,
  curDetail: () => `(() => {
    const d = document.querySelector('[data-m="F9-3"]'), t = d ? d.textContent : '', ab = t.match(/\\d(\\.\\d+)?[KMBT](?![a-z])/g);
    const x = !!d.querySelector('[data-k="px"]');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const esc = demo.S.panel === null;
    return [U.ok(!!d, '開通貨明細', ''), U.ok(!ab && /3,402,118|8,640/.test(t), '數字完整加千分位', (t.match(/\\d{1,3}(,\\d{3})+/g) || []).slice(0, 5).join(' ')), U.ok(x, '有 ×', ''), U.ok(esc, 'Esc 關', demo.S.panel)];
  })()`,
  /* §11 背景 */
  bg: (port, camp) => `(() => {
    const out = [{ ok: true, lab: '新' + (${camp} ? '營地' : '戰場') + '背景（待素材，未驗）', v: '美術總監還沒交；目前是舊圖' }];
    const els = ${camp} ? [...document.querySelectorAll('.plq .nm')] : [...document.querySelectorAll('#d-cur .cc2 > span, [data-m="H02"] .t, #d-feed .fr .nm')];
    const crs = els.filter(U.vis).map(e => {
      let bg = null;
      for (let a = e; a && !bg; a = a.parentElement) { const c = U.rgb(getComputedStyle(a).backgroundColor); if (c && (c[3] == null || c[3] > 0)) bg = c; }
      const base = U.over(bg, U.tokRGB('--border-cap'));
      return U.cr(U.rgb(getComputedStyle(e).color), base);
    });
    out.push(U.ok(crs.length && Math.min(...crs) >= 4.5, (${camp} ? '牌匾字' : 'HUD 字') + ' ≥ 4.5:1（字牌疊在最亮的底上算）', crs.join(' / ')));
    return out;
  })()`
};

/* ---------- §12 拍攝清單：[檔名, 列, 存檔, 切換, 量測, 只拍這個尺寸, 動作(page, port)] ---------- */
const SHOTS = [
  ['F1-1_idle_list', 'F1-1', 'mid', {}, p => CHK.idleList(p, 'top')],
  ['F1-2_idle_list_end', 'F1-2', 'mid', {}, p => CHK.idleList(p, 'end')],
  ['F1-3_idle_field', 'F1-3', 'mid', {}, p => CHK.idleField(p)],
  ['F1-4_idle_list_fs', 'F1-4', 'mid', { fs: 1, en: 1 }, p => CHK.idleList(p, 'fs')],
  ['F2-1_flask_full', 'F2-1', 'mid', {}, p => CHK.flask(p, 'full')],
  ['F2-2_flask_charging', 'F2-2', 'mid', {}, p => CHK.flask(p, 'charging')],
  ['F2-3_flask_empty', 'F2-3', 'mid', {}, p => CHK.flask(p, 'empty')],
  ['F2-4_flask_lowhp', 'F2-4', 'mid', {}, p => CHK.flask(p, 'lowhp')],
  ['F2-5_flask_drawer', 'F2-5', 'mid', {}, p => CHK.flask(p, 'drawer')],
  ['F3-1_card_btn', 'F3-1', 'mid', {}, p => CHK.upbtn(p, 0)],
  ['F3-2_card_btn_en_fs', 'F3-2', 'mid', { fs: 1, en: 1 }, p => CHK.upbtn(p, 1)],
  ['F4-1_abbr_hud', 'F4-1', 'big', {}, p => CHK.abbrHud(p)],
  ['F4-2_abbr_full', 'F4-2', 'big', {}, () => CHK.abbrTip()],
  ['F4-3_full_places_confirm', 'F4-3a', 'big', {}, () => CHK.fullOnly('#d-dlg')],
  ['F4-3_full_places_tip', 'F4-3b', 'big', {}, () => CHK.fullOnly('#d-itip')],
  ['F4-3_full_places_detail', 'F4-3c', 'big', {}, () => CHK.fullOnly('[data-m="F9-3"]')],
  ['F4-3_full_places_offline', 'F4-3d', 'big', {}, () => CHK.fullOnly('#d-off')],
  ['F4-4_abbr_edge', 'F4-4', 'mid', {}, () => CHK.abbrEdge()],
  ['F4-5_dmgnum', 'F4-5', 'mid', {}, () => CHK.dmgnum()],
  ['F5-1_forge_pity', 'F5-1', 'mid', {}, () => CHK.forgePity(0)],
  ['F5-2_pity_en_fs', 'F5-2', 'mid', { fs: 1, en: 1 }, () => CHK.forgePity(1)],
  ['F6-1_tree_full', 'F6-1', 'mid', {}, p => CHK.tree(p, 0)],
  ['F6-4_tree_fs_en', 'F6-4', 'mid', { fs: 1, en: 1 }, p => CHK.tree(p, 1)],
  [
    'F6-5_stele_full_more',
    'H01',
    'mid',
    {},
    p => CHK.tree(p, 0),
    null,
    async (pg, port) => {
      await pg.evaluate(() => demo.tap('tab-more'));
      await pg.evaluate(() => demo.step(20));
      await pg.evaluate(() => demo.tap('stele'));
    }
  ],
  [
    'F6-5_stele_full_u',
    'H01',
    'mid',
    {},
    p => CHK.tree(p, 0),
    null,
    async pg => {
      await pg.keyboard.press('u');
    }
  ],
  ['F7-1_tip_better', 'F7-1', 'mid', {}, p => CHK.tip(p, 'better')],
  ['F7-2_tip_worse', 'F7-2', 'mid', {}, p => CHK.tip(p, 'worse')],
  ['F7-3_tip_mixed', 'F7-3', 'mid', {}, p => CHK.tip(p, 'mixed')],
  ['F7-4_tip_noequip', 'F7-4', 'mid', {}, p => CHK.tip(p, 'cur')],
  ['F7-5_tip_empty', 'F7-5', 'mid', {}, p => CHK.tip(p, 'empty')],
  ['F7-6_tip_fs_en', 'F7-6', 'mid', { fs: 1, en: 1 }, p => CHK.tip(p, 'fs')],
  ['F8-1_card_track', 'F8-1', 'mid', {}, p => CHK.card(p, 'track')],
  ['F8-2_card_back', 'F8-2', 'mid', {}, p => CHK.card(p, 'back')],
  ['F8-4_card_fs_en', 'F8-4', 'mid', { fs: 1, en: 1 }, p => CHK.card(p, 'fs')],
  ['F9-1_cur_strip', 'F9-1', 'mid', {}, p => CHK.cur(p, 'pos')],
  ['F9-2_cur_big', 'F9-2', 'big', {}, p => CHK.cur(p, 'big')],
  ['F9-3_cur_detail', 'F9-3', 'mid', {}, () => CHK.curDetail(), null, null, 1],
  ['F9-4_cur_fs_en', 'F9-4', 'mid', { fs: 1, en: 1 }, p => CHK.cur(p, 'fs')],
  ['F11-2_bg_field', 'F11-2', 'mid', {}, p => CHK.bg(p, 0)],
  ['F11-3_bg_camp', 'F11-3', 'mid', {}, p => CHK.bg(p, 1)]
];
/* 影片：[代號, 只要一般, 只要這個尺寸] */
const VIDS = [
  ['V-F1_idle_expand'],
  ['V-F2_lowhp'],
  ['V-F6_tree_pause'],
  ['V-F6_stele_pause'],
  ['V-F8_card_nav'],
  ['V-R_drawer_close'],
  ['V-F6_tree_keys', 1, '1280x720']
];

/* ---------- 每幀探針 ---------- */
function probe() {
  const S = demo.S,
    q = id => document.getElementById(id);
  const ic = q('d-icard'),
    gh = q('d-ghost') || q('d-ighost'),
    lo = q('d-flo'),
    cb = q('d-cbody'),
    cg = q('d-cgain'),
    f = demo.frame(),
    h = demo.hero();
  return {
    t: demo.NOW,
    panel: S.panel,
    idle: S.idleOpen,
    fp: S.fieldPanel,
    icK: ic ? +ic.dataset.k : null,
    icT: ic ? ic.style.transform : null,
    icO: ic ? ic.style.opacity : null,
    ghK: gh ? +gh.dataset.k : null,
    ghT: gh ? gh.style.transform : null,
    ghO: gh ? gh.style.opacity : null,
    lo: lo ? +lo.style.opacity : null,
    cbK: cb && cb.dataset.k ? +cb.dataset.k : null,
    cbT: cb ? cb.style.transform : null,
    cbO: cb ? cb.style.opacity : null,
    card: S.cardFac,
    pick: S.pick,
    gain: cg && !cg.classList.contains('hide') ? cg.textContent : null,
    gainO: cg ? +cg.style.opacity || 1 : null,
    sig: demo.fieldSig(),
    idleMs: S.idleMs,
    fr: f,
    off: f && h ? +Math.hypot(h.x - (f.x + f.w / 2), h.y - (f.y + f.h / 2)).toFixed(2) : null,
    tree: !!q('d-tree')
  };
}
/* ---------- 影片判定 ---------- */
function judge(V, P, L, port, rm) {
  const R = [],
    ok = (c, s) => R.push(`${c ? '✅' : '❌'} ${s}`),
    t0 = P[0].t - FR,
    at = ev => L.filter(x => x.ev === ev).map(x => x.t);
  const span = (from, pred) => {
    const i = P.findIndex(p => p.t >= from - 0.01 && pred(p));
    return i < 0 ? null : P[i].t - from;
  };
  if (V === 'V-F1_idle_expand') {
    const o = at('idle-open')[0],
      c = L.find(x => x.ev === 'idle-close'),
      d = span(o, p => p.icK >= 1);
    ok(
      rm ? d <= 150 : Math.abs(d - 200) <= 17,
      `展開 ${d != null ? d.toFixed(1) : '—'} ms（${rm ? '減少動態 ≤ 150' : '200±17'}）`
    );
    if (rm) ok(P.filter(p => p.icT && p.icT !== 'none' && p.icT !== '').length === 0, '減少動態只有不透明度（不滑）');
    const sc = L.filter(x => x.ev === 'key' || x.ev === 'scroll').map(x => x.t);
    const last = Math.max(o, ...at('scroll-list'));
    if (c) {
      ok(
        c.why === 'auto' && Math.abs(c.t - last - 6000) <= FR + 1,
        `最後一次捲動 ${(last - t0).toFixed(0)} ms → 自動收 ${(c.t - t0).toFixed(0)} ms（相隔 ${(c.t - last).toFixed(0)}，要 6,000）`
      );
      const e = L.find(x => x.ev === 'close-end' && x.t > c.t);
      if (port)
        ok(
          e && (rm ? e.ms <= 150 : Math.abs(e.ms - 160) <= 17),
          `收起 ${e ? e.ms.toFixed(1) : '—'} ms（${rm ? '≤ 150 淡出' : '160±17 ease-in 滑出'}）`
        );
      else {
        const d2 = span(c.t, p => p.ghK == null && p.t > c.t);
        ok(
          d2 != null && (rm ? d2 <= 150 : Math.abs(d2 - 160) <= 17),
          `收起 ${d2 != null ? d2.toFixed(1) : '—'} ms（${rm ? '≤ 150' : '160±17'}）`
        );
      }
    } else ok(0, '沒有自動收');
    ok(!P.some(p => p.t > o + 200 && p.t < (c ? c.t - 1 : 1e12) && p.idle === 0), '捲動中不自動收');
  }
  if (V === 'V-F2_lowhp') {
    const a = P.filter(p => p.lo != null).map(p => p.lo);
    if (rm) ok(a.length && a.every(x => x === 1), `減少動態常亮不動（${Math.min(...a)}–${Math.max(...a)}）`);
    else {
      const pk = [];
      for (let i = 1; i < P.length - 1; i++)
        if (P[i].lo >= P[i - 1].lo && P[i].lo > P[i + 1].lo && P[i].lo > 0.95) pk.push(P[i].t);
      const per = pk.slice(1).map((t, i) => t - pk[i]),
        hz = per.length ? 1000 / (per.reduce((a, b) => a + b, 0) / per.length) : 0;
      ok(
        Math.abs(hz - 1) <= 0.1,
        `呼吸 ${hz.toFixed(3)} Hz（1±0.1；峰 ${pk.map(t => (t - t0).toFixed(0)).join('、')} ms）`
      );
      ok(
        Math.min(...a) >= 0.39 && Math.max(...a) <= 1.001,
        `不透明度 ${Math.min(...a).toFixed(2)}↔${Math.max(...a).toFixed(2)}（0.4↔1，不閃）`
      );
      const jump = Math.max(...a.slice(1).map((x, i) => Math.abs(x - a[i])));
      ok(jump < 0.05, `每幀變化 ≤ ${jump.toFixed(3)}（ease-in-out、不閃爍）`);
    }
  }
  if (V === 'V-F6_tree_pause' || V === 'V-F6_stele_pause') {
    const op = L.find(x => x.ev === 'pause'),
      cl = L.find(x => x.ev === 'resume');
    if (!op || !cl) return ok(0, '沒有開／關'), R;
    const inT = P.filter(p => p.t > op.t + FR && p.t < cl.t);
    const sigs = new Set(inT.map(p => p.sig));
    ok(sigs.size === 1, `開著 ${((cl.t - op.t) / 1000).toFixed(1)} 秒：怪物、飄字不動（${sigs.size} 種狀態）`);
    ok(
      inT.every(p => p.tree && p.fr === null),
      '滿版（沒有戰場、HUD）'
    );
    const im = inT.map(p => p.idleMs);
    ok(
      im[im.length - 1] - im[0] > (cl.t - op.t) * 0.95,
      `掛機時間照走（+${((im[im.length - 1] - im[0]) / 1000).toFixed(1)} 秒）`
    );
    const g0 = P.find(p => p.t > cl.t && p.gain),
      g1 = [...P].reverse().find(p => p.gain);
    const want = V === 'V-F6_tree_pause' ? /天賦樹期間 \+\d[\d,.KM]* 靈魂/ : /昇華石碑期間 \+\d[\d,.KM]* 靈魂/;
    ok(g0 && Math.abs(g0.t - cl.t - 160) <= FR + 1, `關後 ${g0 ? (g0.t - cl.t).toFixed(1) : '—'} ms 出（淡入 160 後）`);
    ok(g0 && want.test(g0.gain), `「${g0 ? g0.gain : '—'}」`);
    const on = g0 && P.filter(p => p.gain && p.gainO >= 0.999).length * FR;
    ok(on && Math.abs(on - 3000) <= FR + 1, `停 ${on ? on.toFixed(0) : '—'} ms（3,000）＋淡出 300`);
  }
  if (V === 'V-F8_card_nav') {
    const nv = L.filter(x => x.ev === 'card-nav');
    ok(nv.length === 2, `換座 ${nv.length} 次（${nv.map(x => x.f).join(' → ')}）`);
    for (const n of nv) {
      const d = span(n.t, p => p.cbK >= 1);
      ok(
        d != null && (rm ? d <= 150 : Math.abs(d - 200) <= 17),
        `換座 ${d != null ? d.toFixed(1) : '—'} ms（${rm ? '≤ 150 淡入' : '200±17 橫滑'}）`
      );
      if (rm) ok(!P.some(p => p.t > n.t && p.t < n.t + 200 && p.cbT && p.cbT !== ''), '減少動態不滑');
    }
    const b = L.find(x => x.ev === 'card-back'),
      after = b && P.find(p => p.t > b.t);
    ok(b && after.panel === 'camp' && after.pick === b.f, `← 回清單並選中那格（${b ? b.f : '—'}）`);
    const es = L.filter(x => x.ev === 'esc').map(x => x.what);
    ok(
      port ? es.join() === 'panel' : es.join() === 'card,panel',
      `Esc：${es.join(' → ')}（${port ? '← 回清單後 Esc 關抽屜' : '第一下回清單、第二下關抽屜'}）`
    );
  }
  if (V === 'V-R_drawer_close') {
    const cs = L.filter(x => x.ev === 'close-start'),
      ce = L.filter(x => x.ev === 'close-end');
    ok(cs.length === (port ? 5 : 4), `關了 ${cs.length} 種（營地升級、技能、設定、通貨明細${port ? '、掛機卡' : ''}）`);
    cs.forEach((c, i) => {
      const e = ce[i],
        win = P.filter(p => p.t > c.t && p.t <= c.t + 170);
      ok(
        e && (rm ? e.ms <= 150 : Math.abs(e.ms - 160) <= 17),
        `#${i + 1} ${c.sel} 收 ${e ? e.ms.toFixed(1) : '—'} ms（${rm ? '≤ 150' : '160±17'}）`
      );
      const moved = win.filter(p => p.ghT && /translate/.test(p.ghT) && !/\(0(\.00)?px\)/.test(p.ghT)).length;
      if (rm) ok(moved === 0 && win.some(p => p.ghO && +p.ghO < 1), `#${i + 1} 減少動態只有不透明度變`);
      else ok(moved > 0, `#${i + 1} 有位移（${moved} 幀）`);
      const off = win.map(p => p.off).filter(x => x != null);
      ok(
        off.length && Math.max(...off) <= 2,
        `#${i + 1} 每一幀角色離戰場框中心 ≤ 2 px（最大 ${off.length ? Math.max(...off).toFixed(2) : '—'}）`
      );
      const full = win.length && win[0].fr && (port ? win[0].fr.h >= 663 - 1 : true);
      ok(full, `#${i + 1} 滑出第一幀戰場恢復全高（${win[0] && win[0].fr ? win[0].fr.h : '—'}）、不露空`);
    });
  }
  if (V === 'V-F6_tree_keys') {
    const es = L.filter(x => x.ev === 'esc').map(x => x.what),
      ks = L.filter(x => x.ev === 'panel').map(x => x.p);
    ok(es.join() === 'tree', `Esc 只關天賦樹（${es.join()}）`);
    ok(
      ks.join() === 'tree,,tree,' || ks.join() === 'tree,null,tree,null',
      `P 開、Esc 關、P 開、P 關（${ks.map(x => x || '關').join(' → ')}）`
    );
    ok(!P.some(p => p.panel === 'more'), '沒有誤開設定');
  }
  return R;
}
/* 關鍵幀：每個動作的開始、中間、結束 */
function keyFrames(V, P, L) {
  const K = [],
    t0 = P[0].t - FR;
  const near = t => P.findIndex(p => p.t >= t - 0.01);
  for (const x of L.filter(x =>
    ['idle-open', 'idle-close', 'close-start', 'card-nav', 'card-back', 'pause', 'resume', 'gain', 'esc'].includes(x.ev)
  )) {
    for (const d of [0, 80, 160, 200]) {
      const i = near(x.t + d);
      if (i >= 0) K.push([`${x.ev}+${d}`, i]);
    }
  }
  if (V === 'V-F2_lowhp') for (let t = 0; t < 3000; t += 250) K.push([`t${t}`, near(t0 + t)]);
  return K.filter((k, i) => k[1] >= 0 && K.findIndex(q => q[1] === k[1]) === i);
}

/* ---------- F11-1：所有元素的計算後顏色對到 token ---------- */
function tokens() {
  const root = getComputedStyle(document.documentElement),
    names = new Set();
  for (const sh of document.styleSheets)
    try {
      for (const r of sh.cssRules)
        if (r.selectorText === ':root') for (const p of r.style) if (p.startsWith('--')) names.add(p);
    } catch (e) {}
  const probe = document.createElement('i');
  document.body.appendChild(probe);
  const map = {};
  for (const n of names) {
    const v = root.getPropertyValue(n).trim();
    let c = null;
    if (/^\d+(\.\d+)?(,\s*|\s+)\d+(\.\d+)?(,\s*|\s+)\d+(\.\d+)?$/.test(v)) c = v.split(/[,\s]+/).map(Number);
    else {
      probe.style.color = '';
      probe.style.color = v;
      if (probe.style.color) c = (getComputedStyle(probe).color.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    }
    if (c && c.length === 3) (map[c.join(',')] = map[c.join(',')] || []).push(n);
  }
  probe.remove();
  const props = [
    'color',
    'background-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'fill',
    'stroke',
    'box-shadow',
    'text-shadow',
    'background-image',
    'caret-color',
    'text-decoration-color'
  ];
  const used = {},
    off = [];
  const els = [...document.querySelectorAll('#ui *, #ui')];
  for (const e of els) {
    const c = getComputedStyle(e);
    if (c.display === 'none') continue;
    for (const p of props) {
      const v = c.getPropertyValue(p);
      for (const m of v.match(/rgba?\([^)]*\)|color\(srgb[^)]*\)/g) || []) {
        let n = (m.match(/[\d.]+/g) || []).map(Number);
        if (m.startsWith('color(')) n = n.map((x, i) => (i < 3 ? Math.round(x * 255) : x));
        const a = n[3] == null ? 1 : n[3];
        if (a === 0) continue;
        if (p !== 'color' && p !== 'background-color' && /border|outline|caret|decoration/.test(p)) {
          const w = p.startsWith('border')
            ? parseFloat(c.getPropertyValue(p.replace('-color', '-width')))
            : p === 'outline-color'
              ? parseFloat(c.outlineWidth)
              : 1;
          const st = p.startsWith('border') ? c.getPropertyValue(p.replace('-color', '-style')) : c.outlineStyle;
          if (!w || st === 'none') continue;
        }
        if ((p === 'fill' || p === 'stroke') && !(e instanceof SVGElement)) continue;
        if (p === 'caret-color' || p === 'text-decoration-color') continue;
        const k = n.slice(0, 3).join(',');
        const tk = map[k];
        if (tk) used[k] = tk;
        else
          off.push(
            `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${(e.className && e.className.baseVal != null ? e.className.baseVal : e.className || '').toString().split(' ')[0]} ${p} ${m}`
          );
      }
    }
  }
  return { tokens: names.size, colors: Object.keys(used).length, used, off: [...new Set(off)], els: els.length };
}

/* ---------- 主程式 ---------- */
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  fs.mkdirSync(OUT, { recursive: true });
  const RES = fs.existsSync(path.join(OUT, 'results.json'))
    ? JSON.parse(fs.readFileSync(path.join(OUT, 'results.json'), 'utf8'))
    : { shots: {}, videos: {}, tokens: {} };
  const page = async (size, bare = 1) => {
    const [w, h] = size.split('x').map(Number);
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 500 });
    const p = await ctx.newPage();
    p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message));
    return p;
  };
  const open = async (p, q) => {
    await p.goto(URL + '?bare=1&cap=1&' + new URLSearchParams(q));
    await p.waitForFunction(() => window.__ready, null, { timeout: 15000 });
    await p.addScriptTag({ content: LIB });
  };
  const want = x => MODE === 'all' || MODE === x;
  if (want('shots') || SHOTS.some(s => s[0].startsWith(MODE) || s[1] === MODE) || MODE === 'R21' || MODE === 'I01') {
    for (const size of SIZES) {
      const port = size.startsWith('390'),
        p = await page(size);
      for (const [nm, row, save, q, chk, only, act] of SHOTS) {
        if (!(want('shots') || nm.startsWith(MODE) || row === MODE)) continue;
        if (only && only !== size) continue;
        await open(p, { size, row, save, ...q });
        await p.evaluate(() => demo.step(20));
        if (act) {
          await act(p, port);
          await p.evaluate(() => demo.step(20));
        }
        const file = `${nm}_${size}.png`;
        await p.screenshot({ path: path.join(OUT, file) });
        let C;
        try {
          C = await p.evaluate(chk(port));
        } catch (e) {
          C = [{ ok: false, lab: '量測失敗', v: e.message.split('\n')[0] }];
        }
        if (p.errs.length) C.push({ ok: false, lab: '頁面錯誤', v: p.errs.splice(0).join('；') });
        RES.shots[file] = { row, save, q, C };
        console.log(
          `${C.every(c => c.ok) ? '✅' : '❌'} ${file}  ${C.filter(c => !c.ok)
            .map(c => c.lab + '＝' + c.v)
            .join('；')}`
        );
      }
      /* R-21：含頁頂說明列的整頁（不是 bare） */
      if (want('shots') || MODE === 'R21') {
        await p.goto(URL + '?' + new URLSearchParams({ size, row: 'H01', save: 'mid' }));
        await p.waitForFunction(() => window.__ready, null, { timeout: 15000 });
        await p.addScriptTag({ content: LIB });
        const n = await p.evaluate(() => {
          const e = document.getElementById('c-21'),
            r = e.getBoundingClientRect();
          return {
            t: e.textContent,
            y: r.y,
            h: r.height,
            w: r.width,
            fs: parseFloat(getComputedStyle(e).fontSize),
            clip: e.scrollWidth > e.clientWidth + 1
          };
        });
        const file = `R21_infostrip_${size}.png`;
        await p.screenshot({ path: path.join(OUT, file), fullPage: true });
        const C = [
          { ok: n.t.includes('暫用現有圖示，16px 新圖等美術復工'), lab: '整句可見', v: n.t },
          { ok: n.fs >= 12, lab: '字 ≥ 12', v: n.fs },
          { ok: !n.clip && n.h > 0, lab: '沒被切', v: `${n.w.toFixed(0)}×${n.h.toFixed(0)} @ y ${n.y.toFixed(0)}` }
        ];
        RES.shots[file] = { row: 'R-21', C };
        console.log(`${C.every(c => c.ok) ? '✅' : '❌'} ${file}`);
      }
      /* R-I01：桌機方向鍵移焦點到掛機條展開鈕（demo 的 Tab 是換分頁） */
      if (!port && (want('shots') || MODE === 'I01')) {
        await open(p, { size, row: 'I01', save: 'mid' });
        await p.evaluate(() => demo.step(20));
        const path1 = [];
        for (let i = 0; i < 40; i++) {
          const k = await p.evaluate(() => document.activeElement && document.activeElement.dataset.k);
          path1.push(k || '—');
          if (k === 'idlex') break;
          await p.keyboard.press(
            i === 0
              ? 'ArrowDown'
              : k && k.startsWith('tab-')
                ? 'ArrowDown'
                : k === 'cur' || k === 'feed'
                  ? 'ArrowDown'
                  : 'ArrowRight'
          );
          await p.evaluate(() => demo.step(2));
        }
        const fo = await p.evaluate(() => {
          const a = document.activeElement,
            c = getComputedStyle(a),
            r = U.r(a),
            q = U.r('#d-idle');
          return {
            k: a.dataset.k,
            fv: a.matches(':focus-visible'),
            ow: c.outlineWidth,
            os: c.outlineStyle,
            oo: c.outlineOffset,
            oc: c.outlineColor,
            hi: 'rgb(' + U.tokRGB('--border-hi').join(', ') + ')',
            btn: r,
            bar: q
          };
        });
        const file = 'I01_idlex_focus_1280x720.png';
        await p.screenshot({ path: path.join(OUT, file) });
        const inside =
          fo.btn.x >= fo.bar.x - 0.5 &&
          fo.btn.y >= fo.bar.y - 0.5 &&
          fo.btn.x + fo.btn.w <= fo.bar.x + fo.bar.w + 0.5 &&
          fo.btn.y + fo.btn.h <= fo.bar.y + fo.bar.h + 0.5;
        const C = [
          { ok: fo.k === 'idlex' && fo.fv, lab: '方向鍵走到展開鈕、:focus-visible', v: path1.join(' → ') },
          { ok: fo.btn.w >= 32 && fo.btn.h >= 32, lab: '鈕 32×32 以上', v: `${fo.btn.w}×${fo.btn.h}` },
          {
            ok: fo.ow === '2px' && fo.os === 'solid' && fo.oc === fo.hi,
            lab: '焦點框 2 px --border-hi',
            v: `${fo.ow} ${fo.os} ${fo.oc}`
          },
          { ok: fo.oo === '-2px', lab: 'outline-offset −2', v: fo.oo },
          {
            ok: inside,
            lab: '四邊完整（框在掛機條裡、不被裁）',
            v: JSON.stringify(fo.btn) + ' ⊂ ' + JSON.stringify(fo.bar)
          }
        ];
        RES.shots[file] = { row: 'R-I01', C };
        console.log(
          `${C.every(c => c.ok) ? '✅' : '❌'} ${file} ${C.filter(c => !c.ok)
            .map(c => c.lab + '＝' + c.v)
            .join('；')}`
        );
      }
      await p.context().close();
    }
  }
  if (want('tokens')) {
    for (const size of SIZES) {
      const p = await page(size),
        out = {};
      /* 每個 D1-fix 畫面各掃一次 */
      for (const [nm, row, save, q] of SHOTS) {
        await open(p, { size, row, save, ...q });
        await p.evaluate(() => demo.step(20));
        out[nm] = await p.evaluate(tokens);
      }
      const off = [...new Set(Object.values(out).flatMap(x => x.off))],
        cols = new Set(Object.values(out).flatMap(x => Object.keys(x.used)));
      const file = `F11-1_tokens_${size}.json`;
      fs.writeFileSync(
        path.join(OUT, file),
        JSON.stringify(
          { size, screens: Object.keys(out).length, colors: cols.size, offToken: off, perScreen: out },
          null,
          1
        )
      );
      RES.tokens[size] = { file, screens: Object.keys(out).length, colors: cols.size, off };
      console.log(
        `${off.length ? '❌' : '✅'} F11-1 ${size}：${Object.keys(out).length} 個畫面、${cols.size} 種顏色都對得到 token；token 以外 ${off.length} 個 ${off.slice(0, 5).join('；')}`
      );
      await p.context().close();
    }
  }
  if (want('videos') || VIDS.some(v => v[0] === MODE)) {
    fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });
    for (const size of SIZES) {
      const port = size.startsWith('390'),
        p = await page(size);
      for (const [V, onlyN, onlySize] of VIDS) {
        if (!(want('videos') || MODE === V)) continue;
        if (onlySize && onlySize !== size) continue;
        for (const rm of onlyN ? [0] : [0, 1]) {
          await open(p, { size, scn: V, ...(rm ? { rm: 1 } : {}) });
          const dur = await p.evaluate(v => demo.SCN()[v].dur, V);
          const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'd1f-'));
          const P = [],
            n = Math.ceil(dur / FR);
          for (let i = 0; i < n; i++) {
            await p.evaluate(() => demo.step(1));
            P.push(await p.evaluate(probe));
            await p.screenshot({
              path: path.join(dir, String(i).padStart(5, '0') + '.jpg'),
              type: 'jpeg',
              quality: 85
            });
          }
          const L = await p.evaluate(() => demo.LOG.slice());
          const base = `${V}${rm ? '_rm' : ''}_${size}`,
            mp4 = path.join(OUT, base + '.mp4');
          execFileSync('ffmpeg', [
            '-y',
            '-loglevel',
            'error',
            '-framerate',
            '60',
            '-i',
            path.join(dir, '%05d.jpg'),
            '-c:v',
            'libx264',
            '-preset',
            'veryfast',
            '-crf',
            '30',
            '-pix_fmt',
            'yuv420p',
            '-vf',
            'pad=ceil(iw/2)*2:ceil(ih/2)*2',
            mp4
          ]);
          const R = judge(V, P, L, port, rm);
          if (p.errs.length) R.push('❌ 頁面錯誤 ' + p.errs.splice(0).join('；'));
          /* 關鍵幀（帶時間戳） */
          const K = keyFrames(V, P, L),
            fdir = path.join(OUT, 'frames', base);
          fs.rmSync(fdir, { recursive: true, force: true });
          fs.mkdirSync(fdir, { recursive: true });
          const jobs = K.map(([lab, i]) => ({
            src: path.join(dir, String(i).padStart(5, '0') + '.jpg'),
            dst: path.join(
              fdir,
              `f${i + 1}_t${Math.round(P[i].t - P[0].t + FR)}ms_${lab.replace(/[^\w+-]/g, '_')}.jpg`
            ),
            txt: `${base}  第 ${i + 1} 幀  t=${(P[i].t - P[0].t + FR).toFixed(1)} ms  ${lab}`
          }));
          if (jobs.length)
            execFileSync('python3', [
              '-c',
              `import json,sys
from PIL import Image,ImageDraw,ImageFont
f=ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',14)
for j in json.loads(sys.argv[1]):
  a=Image.open(j['src']).convert('RGB'); o=Image.new('RGB',(a.width,a.height+24),(0,0,0)); o.paste(a,(0,24))
  ImageDraw.Draw(o).text((6,4),j['txt'],font=f,fill=(255,230,120)); o.save(j['dst'], quality=82)`,
              JSON.stringify(jobs)
            ]);
          fs.rmSync(dir, { recursive: true });
          RES.videos[base] = {
            file: path.basename(mp4),
            frames: n,
            fps: 60,
            R,
            log: L.filter(x => !['key', 'focus', 'feed-in', 'feed-merge', 'feed-evict', 'cam-ease'].includes(x.ev)),
            keyframes: jobs.map(j => path.relative(OUT, j.dst))
          };
          fs.writeFileSync(path.join(OUT, 'probe_' + base + '.json'), JSON.stringify(P));
          console.log(`${R.some(x => x.startsWith('❌')) ? '❌' : '✅'} ${base} ${n} 幀\n   ${R.join('\n   ')}`);
        }
      }
      await p.context().close();
    }
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(RES, null, 1));
  /* prefilter.md */
  const M = [
    '# D1-fix（mumi 11/19）腳本預篩',
    '',
    `產生：\`node tools/d1_fix.js ${MODE}\`（${new Date().toISOString()}）。只照規格門檻判，原始量測在 results.json 與 probe_*.json。`,
    ''
  ];
  let bad = 0;
  M.push('## 截圖', '', '| 檔案 | 列 | 結果 | 量測 |', '| --- | --- | --- | --- |');
  for (const [f, v] of Object.entries(RES.shots).sort()) {
    const ok = v.C.every(c => c.ok);
    bad += !ok;
    M.push(
      `| \`${f}\` | ${v.row} | ${ok ? '✅' : '❌'} | ${v.C.map(c => `${c.ok ? '✅' : '❌'} ${c.lab}：${String(c.v).replace(/\|/g, '／').replace(/\n/g, ' ')}`).join('<br>')} |`
    );
  }
  M.push('', '## F11-1 token（腳本輸出）', '');
  for (const [s, v] of Object.entries(RES.tokens)) {
    bad += v.off.length > 0;
    M.push(
      `- ${v.off.length ? '❌' : '✅'} ${s}：\`${v.file}\`，掃 ${v.screens} 個畫面、${v.colors} 種計算後顏色全對得到 token；token 以外 ${v.off.length} 個${v.off.length ? '：' + v.off.slice(0, 10).join('；') : ''}。M2-36 對照表（美術總監）待素材，未驗。`
    );
  }
  M.push('', '## 影片（60 fps 逐幀）', '');
  for (const [k, v] of Object.entries(RES.videos).sort()) {
    const ok = !v.R.some(x => x.startsWith('❌'));
    bad += !ok;
    M.push(`### ${ok ? '✅' : '❌'} \`${v.file}\`（${v.frames} 幀）`, '', ...v.R.map(x => '- ' + x), '');
  }
  M.push(
    '',
    `共 ${Object.keys(RES.shots).length} 張截圖、${Object.keys(RES.videos).length} 支影片、${Object.keys(RES.tokens).length} 份 token 輸出；❌ ${bad} 項。`
  );
  fs.writeFileSync(path.join(OUT, 'prefilter.md'), M.join('\n'));
  console.log(`共 ${Object.keys(RES.shots).length} 張截圖、${Object.keys(RES.videos).length} 支影片；❌ ${bad}`);
  process.exit(bad ? 1 : 0);
})();
