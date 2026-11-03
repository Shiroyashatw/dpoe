/* dungeonPOE · 天賦樹（P，照 PoE）：一千多個點；拖曳移動、滾輪縮放；
   點亮著的點＝點下去，再點一次＝退回（不能把後面斷開）。昇華（中間挖空的地方）0.2.9 砍掉，之後重新設計 */
'use strict';
const TREE = { open: false, x: 0, y: 0, z: 0.55, drag: null };
const ptLeft = () => ptPoints(S.lv) - (S.pt.length - PT_START.length);
function treeCan(id) {
  if (S.pt.includes(id) || ptLeft() <= 0) return false;
  return (PTREE.ADJ[id] || []).some(o => S.pt.includes(o));
}
/* 退回後其他點還連得到起點嗎 */
function treeCanRefund(id) {
  const have = new Set(S.pt),
    start = PT_START;
  if (start.includes(id) || !have.has(id)) return false;
  have.delete(id);
  const adj = PTREE.ADJ,
    seen = new Set(start),
    q = [...start];
  while (q.length) for (const o of adj[q.pop()] || []) if (have.has(o) && !seen.has(o)) seen.add(o), q.push(o);
  return seen.size === have.size;
}
function treeOpen() {
  if (TREE.open) return treeClose();
  closePanels();
  /* 起點的 6 個門大約在半徑 560 的圈上；窄螢幕（直立）縮到看得到全部的門 */
  Object.assign(TREE, { open: true, x: 0, y: 0, z: Math.min(0.55, (innerWidth / 2 - 30) / 560) });
  $('ptree').hidden = false;
  treeRender();
}
function treeClose() {
  TREE.open = false;
  TREE.sel = null;
  $('ptree').hidden = true;
  hideTip();
}
function treeRender() {
  if (!TREE.open) return;
  const have = new Set(S.pt);
  const line = (A, B, on, near, cls = '') =>
    `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" class="${on ? 'on' : near ? 'near' : ''} ${cls}"/>`;
  /* 軌道拼塊的連線畫成弧（PTREE.ARC：圓心、半徑），其他是直線 */
  const arc = (A, B, [cx, cy, r], cls) => {
    const cw = (A.x - cx) * (B.y - cy) - (A.y - cy) * (B.x - cx) > 0 ? 1 : 0;
    return `<path d="M${A.x.toFixed(1)} ${A.y.toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 ${cw} ${B.x.toFixed(1)} ${B.y.toFixed(1)}" class="${cls}"/>`;
  };
  let html = PTREE.E.map(([a, b]) => {
    const A = PTREE.I[a],
      B = PTREE.I[b],
      on = have.has(a) && have.has(b),
      near = have.has(a) || have.has(b);
    const c = PTREE.ARC[a + '|' + b];
    return c ? arc(A, B, c, on ? 'on' : near ? 'near' : '') : line(A, B, on, near);
  }).join('');
  /* 圖示：每張只定義一次（<defs>），點用 <use> 引用，一千多個點也不會太重 */
  const used = new Set(PTREE.N.map(n => n.ic).filter(Boolean)),
    defs = [...used]
      .map(ic => [ic, artIconURL(ic)])
      .filter(([, u]) => u)
      .map(([ic, u]) => `<image id="ti_${ic}" href="${u}" width="1" height="1"/>`)
      .join('');
  html = `<defs>${defs}</defs>` + html;
  html += PTREE.N.map(n => {
    const r = n.big === 2 ? 30 : n.gate ? 20 : n.big ? 19 : 10,
      st = have.has(n.id) ? 'on' : treeCan(n.id) ? 'can' : 'off',
      s = r * (n.big ? 1.4 : 1.3),
      img =
        n.ic && artIconURL(n.ic)
          ? `<use href="#ti_${n.ic}" transform="translate(${-s / 2} ${-s / 2}) scale(${s})"/>`
          : '';
    return `<g class="nd ${st} b${n.big}${TREE.sel === n.id ? ' sel' : ''}" data-n="${n.id}" transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})" style="--c:${PT_THEME[n.th].c}"><circle r="${r}"/>${img}</g>`;
  }).join('');
  html += `<circle class="hollow" r="${PT_R0 - 40}"/><text class="hint" y="6">昇華重新設計中</text>`;
  const B = treeBox();
  $('ptree').innerHTML = `<div class="tbar">
    <b>天賦樹</b>
    <span>天賦點 剩 <b id="tpts"></b>（每升一級 1 點）</span>
    <button class="btn" data-ta="reset" id="treset">重置天賦</button>
    <button class="x" aria-label="關閉" data-ta="close">${ICO.x}</button></div>
  <div id="tview"><svg id="tsvg" viewBox="${B.x} ${B.y} ${B.w} ${B.h}" width="${B.w}" height="${B.h}"><g id="tg">${html}</g></svg></div>
  <p class="thelp"><b>起點</b> ${PT_ROADS.map((r, i) => ['上', '右上', '右下', '下', '左下', '左上'][i] + ' ' + r.n.slice(0, 2)).join(' · ')}　<b>操作</b> 點亮著的點＝點下去，再點＝退回 · 拖曳移動 · 滾輪縮放　外圈是武器專精，最外面的大圓是基石（有代價）</p>`;
  /* 之後選取、點亮只改 class，不重畫整棵樹（一千多個點，手機重畫會卡） */
  const tg = $('tg');
  TEL = {
    n: new Map([...tg.querySelectorAll('.nd')].map(e => [e.dataset.n, e])),
    e: [...tg.querySelectorAll(':scope > line, :scope > path')].map((el, i) => [el, ...PTREE.E[i]])
  };
  treeRefresh();
  treeView();
}
let TEL = null;
function treeRefresh() {
  if (!TREE.open || !TEL) return;
  const have = new Set(S.pt);
  for (const [id, el] of TEL.n) {
    const st = have.has(id) ? 'on' : treeCan(id) ? 'can' : 'off',
      cls = `nd ${st} b${PTREE.I[id].big}${TREE.sel === id ? ' sel' : ''}`;
    if (el.getAttribute('class') !== cls) el.setAttribute('class', cls);
  }
  for (const [el, a, b] of TEL.e) {
    const cls = have.has(a) && have.has(b) ? 'on' : have.has(a) || have.has(b) ? 'near' : '';
    if (el.getAttribute('class') !== cls) el.setAttribute('class', cls);
  }
  $('tpts').textContent = ptLeft();
  $('tpts').className = ptLeft() > 0 ? 'c-gold' : '';
  $('treset').disabled = S.pt.length <= PT_START.length;
}
/* 整棵樹的範圍（畫一次）；拖曳、縮放只改 SVG 的 CSS transform（交給 GPU，不重排 SVG） */
let TBOX = null;
function treeBox() {
  if (TBOX) return TBOX;
  let x0 = 0,
    y0 = 0,
    x1 = 0,
    y1 = 0;
  for (const n of PTREE.N)
    (x0 = Math.min(x0, n.x)), (y0 = Math.min(y0, n.y)), (x1 = Math.max(x1, n.x)), (y1 = Math.max(y1, n.y));
  return (TBOX = {
    x: Math.floor(x0 - 60),
    y: Math.floor(y0 - 60),
    w: Math.ceil(x1 - x0 + 120),
    h: Math.ceil(y1 - y0 + 120)
  });
}
function treeView() {
  const v = $('tview');
  if (!v) return;
  const B = treeBox(),
    z = TREE.z;
  $('tsvg').style.transform =
    `translate(${v.clientWidth / 2 + TREE.x + B.x * z}px, ${v.clientHeight / 2 + TREE.y + B.y * z}px) scale(${z})`;
}
/* 拖曳、縮放時才把 SVG 升成一張圖層（放手後拿掉，瀏覽器會重新畫成清楚的） */
function treeMoving(on) {
  const s = $('tsvg');
  if (s) s.classList.toggle('moving', on);
}
function treeToggle(id) {
  const have = S.pt;
  if (have.includes(id)) {
    if (!treeCanRefund(id)) return hudWarn(PT_START.includes(id) ? '起點不能退' : '先退後面的點');
    have.splice(have.indexOf(id), 1);
  } else if (treeCan(id)) have.push(id);
  else return hudWarn(ptLeft() <= 0 ? '沒有天賦點了：升級會再給' : '要跟點過的點連在一起');
  sfx('equip');
  treeChanged();
}
function treeChanged() {
  const hpF = P.hp / ST.hp;
  ST = stats();
  P.hp = Math.min(ST.hp, Math.max(1, hpF * ST.hp));
  P.mp = Math.min(ST.mp, P.mp);
  save();
  hudBar();
  treeRefresh();
}
const statLines = s =>
  Object.entries(s).map(([k, v]) =>
    STATN[k][2] ? STATN[k][0] : `${STATN[k][0]} ${v > 0 ? '+' : ''}${v}${STATN[k][1]}`
  );
function treeTip(id) {
  const n = PTREE.I[id];
  const kind = n.big === 2 ? '基石' : n.gate ? '起點' : n.big ? '大點' : '小點';
  const lines = n.d ? [esc(n.d)] : statLines(n.s);
  return `<b class="${n.big === 2 ? 'c-gold' : ''}">${esc(n.n)}</b><small>${kind}</small>${lines.length ? `<p class="aff">${lines.join('<br>')}</p>` : ''}`;
}
/* 以畫面上一點為中心縮放 */
function treeZoomAt(cx, cy, z) {
  const svg = $('tview').getBoundingClientRect(),
    mx = cx - svg.left - svg.width / 2 - TREE.x,
    my = cy - svg.top - svg.height / 2 - TREE.y;
  z = clamp(z, 0.12, 1.6);
  TREE.x -= mx * (z / TREE.z - 1);
  TREE.y -= my * (z / TREE.z - 1);
  TREE.z = z;
  treeView();
}
function treeInit() {
  const el = $('ptree'),
    TP = new Map(); /* 按著的手指（兩指＝縮放） */
  const pinchD = () => {
    const [a, b] = [...TP.values()];
    return [Math.hypot(a.x - b.x, a.y - b.y), (a.x + b.x) / 2, (a.y + b.y) / 2];
  };
  el.addEventListener('pointerdown', e => {
    if (!e.target.closest('#tview')) return;
    TP.set(e.pointerId, { x: e.clientX, y: e.clientY });
    $('tview').setPointerCapture(e.pointerId);
    if (TP.size === 2) {
      TREE.pinch = { d: pinchD()[0], z: TREE.z };
      treeMoving(true);
      TREE.drag = null;
      return hideTip();
    }
    TREE.drag = { x: e.clientX, y: e.clientY, ox: TREE.x, oy: TREE.y, moved: false, n: e.target.closest('.nd') };
  });
  el.addEventListener('pointermove', e => {
    if (TP.has(e.pointerId)) TP.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (TREE.pinch && TP.size >= 2) {
      const [d, cx, cy] = pinchD();
      return treeZoomAt(cx, cy, (TREE.pinch.z * d) / TREE.pinch.d);
    }
    const g = TREE.drag;
    if (g) {
      if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 8) (g.moved = true), treeMoving(true);
      if (g.moved) {
        TREE.x = g.ox + e.clientX - g.x;
        TREE.y = g.oy + e.clientY - g.y;
        treeView();
        return hideTip();
      }
    }
    if (e.pointerType !== 'mouse') return;
    const n = e.target.closest('.nd');
    if (n) {
      const r = n.getBoundingClientRect();
      showTip(treeTip(n.dataset.n), r);
    } else hideTip();
  });
  const up = e => {
    TP.delete(e.pointerId);
    if (!TP.size) treeMoving(false);
    if (TREE.pinch) {
      if (TP.size < 2) TREE.pinch = null;
      TREE.drag = null;
      return;
    }
    const g = TREE.drag;
    TREE.drag = null;
    if (!g || g.moved || e.type !== 'pointerup') return;
    if (!g.n) {
      if (TOUCH.on && TREE.sel) (TREE.sel = null), hideTip(), treeRefresh();
      return;
    }
    const id = g.n.dataset.n;
    /* 手機：點一下＝選取看說明，再點一次才點亮／退回 */
    if (TOUCH.on && TREE.sel !== id) {
      TREE.sel = id;
      treeRefresh();
      const r = document.querySelector(`#tg [data-n="${id}"]`).getBoundingClientRect(),
        have = S.pt.includes(id);
      showTip(treeTip(id) + `<p class="hint">再點一次${have ? '退回' : '點亮'}</p>`, r);
      return;
    }
    TREE.sel = null;
    hideTip();
    treeToggle(id);
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener(
    'wheel',
    e => {
      e.preventDefault();
      treeZoomAt(e.clientX, e.clientY, TREE.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    },
    { passive: false }
  );
  el.addEventListener('click', e => {
    const a = e.target.closest('[data-ta]');
    if (!a) return;
    if (a.dataset.ta === 'close') treeClose();
    if (a.dataset.ta === 'reset') (S.pt = [...PT_START]), treeChanged();
  });
  addEventListener('resize', treeView);
}
