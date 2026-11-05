/* dungeonPOE · 天賦樹（P，照 PoE）：一千多個點；拖曳移動、滾輪縮放；
   點亮著的點＝點下去，再點一次＝退回（不能把後面斷開）。中間挖空的地方是昇華（0.2.25，a_ 開頭的點，S.at） */
'use strict';
const TREE = { open: false, x: 0, y: 0, z: 0.55, drag: null };
const ptLeft = () => ptPoints(S.lv) - (S.pt.length - PT_START.length);
/* 昇華：選好的那個的點、剩幾點、小／大各點了幾個 */
const ascT = () => S.asc && ascNodes(S.asc);
const ascLeft = () => ascPoints(S) - Math.max(0, S.at.length - 1);
const ascCount = () => {
  const T = ascT();
  let sm = 0,
    bg = 0;
  for (const id of S.at) if (id !== 'a_st') T.I[id].big ? bg++ : sm++;
  return [sm, bg];
};
function treeCan(id) {
  if (id.startsWith('a_')) {
    const T = ascT();
    if (!T || S.at.includes(id) || ascLeft() <= 0) return false;
    return (T.ADJ[id] || []).some(o => S.at.includes(o)) && ascFeasible(T, [...S.at, id]);
  }
  if (S.pt.includes(id) || ptLeft() <= 0) return false;
  return (PTREE.ADJ[id] || []).some(o => S.pt.includes(o));
}
/* 退回後其他點還連得到起點嗎 */
function treeCanRefund(id) {
  const asc = id.startsWith('a_'),
    have = new Set(asc ? S.at : S.pt),
    start = asc ? ['a_st'] : PT_START;
  if (start.includes(id) || !have.has(id)) return false;
  have.delete(id);
  const adj = asc ? ascT().ADJ : PTREE.ADJ,
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
  /* 整棵樹只建一次（換昇華才重建）；再打開只更新點亮狀態 */
  if (TREE.built === (S.asc || '') && TEL) {
    treeRefresh();
    treeView();
  } else treeRender();
}
function treeClose() {
  TREE.open = false;
  TREE.sel = null;
  treeAttrClose();
  $('ptree').hidden = true;
  hideTip();
}
function treeRender() {
  if (!TREE.open) return;
  TREE.built = S.asc || '';
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
      .filter(ic => typeof ART !== 'undefined' && ART[ic])
      .map(ic => `<image id="ti_${ic}" data-ic="${ic}" width="1" height="1"/>`)
      .join('');
  html = `<defs>${defs}</defs>` + html;
  html += PTREE.N.map(n => {
    const r = n.big === 2 ? 30 : n.gate ? 20 : n.big ? 19 : 10,
      st = have.has(n.id) ? 'on' : treeCan(n.id) ? 'can' : 'off',
      s = r * (n.big ? 1.4 : 1.3),
      img =
        n.ic && typeof ART !== 'undefined' && ART[n.ic]
          ? `<use href="#ti_${n.ic}" transform="translate(${-s / 2} ${-s / 2}) scale(${s})"/>`
          : '';
    return `<g class="nd ${st} b${n.big}${TREE.sel === n.id ? ' sel' : ''}" data-n="${n.id}" transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})" style="--c:${PT_THEME[n.th].c}"><circle r="${r}"/>${img}</g>`;
  }).join('');
  html += `<circle class="hollow" r="${PT_R0 - 40}"/>`;
  /* 中間：昇華（點跟線也進 TEL，點亮只改 class）；最上面的大點名字寫在上面，不壓到下面的線 */
  const T = ascT();
  if (T) {
    html += T.E.map(([a, b]) => line(T.I[a], T.I[b], 0, 0, 'asc')).join('');
    html += T.N.map(n => {
      const r = n.big === 3 ? 28 : n.big ? 24 : 12,
        u = n.ic && typeof ART !== 'undefined' && ART[n.ic];
      return `<g class="nd asc b${n.big}${n.g ? ' grp' : ''}" data-n="${n.id}" transform="translate(${n.x} ${n.y})"><circle r="${r}"/>${u ? `<image data-ic="${n.ic}" x="${-r * 0.7}" y="${-r * 0.7}" width="${r * 1.4}" height="${r * 1.4}"/>` : ''}${n.big === 1 ? `<text y="${n.y < -330 ? -r - 8 : r + 17}">${esc(n.n)}</text>` : ''}</g>`;
    }).join('');
  } else
    html += `<text class="hint" y="-10">還沒有昇華</text><text class="hint sm" y="22">到藏身處的昇華石碑選一個</text>`;
  const B = treeBox();
  $('ptree').innerHTML = `<div class="tbar">
    <b>天賦樹</b>
    <span>天賦點 剩 <b id="tpts"></b>（每升一級 1 點）</span>
    <span id="tasc"></span>
    <input id="tfind" type="search" placeholder="搜尋天賦" aria-label="搜尋天賦" autocomplete="off"><span id="tfound"></span>
    <button class="btn" data-ta="reset" id="treset">重置天賦</button>
    <button class="btn" data-ta="areset" id="taset">重置昇華</button>
    <button class="x" aria-label="關閉" data-ta="close">${ICO.x}</button></div>
  <div id="tview"><svg id="tsvg" viewBox="${B.x} ${B.y} ${B.w} ${B.h}" width="${B.w}" height="${B.h}"><g id="tg">${html}</g></svg></div>
  <p class="thelp"><b>起點</b> ${PT_ROADS.map((r, i) => ['上', '右上', '右下', '下', '左下', '左上'][i] + ' ' + r.n.slice(0, 2)).join(' · ')}　<b>操作</b> 點亮著的點＝點下去，再點＝退回 · 拖曳移動 · 滾輪縮放　外圈是武器專精，最外面的大圓是基石（有代價）</p>`;
  /* 之後選取、點亮只改 class，不重畫整棵樹（一千多個點，手機重畫會卡） */
  const tg = $('tg');
  TEL = {
    n: new Map([...tg.querySelectorAll('.nd')].map(e => [e.dataset.n, e])),
    e: [...tg.querySelectorAll(':scope > line:not(.asc), :scope > path')].map((el, i) => [el, ...PTREE.E[i]]),
    ae: T ? [...tg.querySelectorAll(':scope > line.asc')].map((el, i) => [el, ...T.E[i]]) : []
  };
  treeIcons();
  treeRefresh();
  treeView();
}
/* 圖示另外補：大圖載好幾張就補幾張，不重建整棵樹 */
function treeIcons() {
  if (!TREE.open) return;
  for (const el of document.querySelectorAll('#tg image[data-ic]')) {
    const u = artIconURL(el.dataset.ic);
    if (u) el.setAttribute('href', u), el.removeAttribute('data-ic');
  }
}
let TEL = null;
function treeRefresh() {
  if (!TREE.open || !TEL) return;
  const have = new Set([...S.pt, ...S.at]),
    T = ascT();
  for (const [id, el] of TEL.n) {
    const st = have.has(id) ? 'on' : treeCan(id) ? 'can' : 'off',
      n = id.startsWith('a_') ? T.I[id] : PTREE.I[id],
      cls = `nd ${n.asc ? 'asc ' : ''}${st} b${n.big}${n.g ? ' grp' : ''}${TREE.sel === id ? ' sel' : ''}`;
    if (el.getAttribute('class') !== cls) el.setAttribute('class', cls);
  }
  for (const [el, a, b] of TEL.ae) {
    const cls = `asc ${have.has(a) && have.has(b) ? 'on' : have.has(a) || have.has(b) ? 'near' : ''}`;
    if (el.getAttribute('class') !== cls) el.setAttribute('class', cls);
  }
  if (T) {
    const [sm, bg] = ascCount();
    $('tasc').innerHTML =
      `昇華 ${esc(ASC[S.asc].n)} 剩 <b class="${ascLeft() > 0 ? 'c-gold' : ''}">${ascLeft()}</b> · 小 ${sm}/4 大 ${bg}/4`;
  } else $('tasc').textContent = '昇華 還沒選';
  $('taset').disabled = S.at.length <= 1;
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
/* 搜尋（0.2.30）：比對名字和效果文字；符合的點亮、其他變暗，Enter 跳到下一個 */
function treeFind(q) {
  q = q.trim().toLowerCase();
  if (!TREE.txt)
    TREE.txt = PTREE.N.map(n => [n.id, ((n.n || '') + ' ' + treeTip(n.id).replace(/<[^>]+>/g, ' ')).toLowerCase()]);
  TREE.hits = q ? TREE.txt.filter(([, t]) => t.includes(q)).map(([id]) => id) : [];
  TREE.hi = -1;
  const set = new Set(TREE.hits);
  $('tsvg').classList.toggle('finding', !!q);
  for (const el of document.querySelectorAll('#tsvg .nd')) el.classList.toggle('hit', set.has(el.dataset.n));
  $('tfound').textContent = q ? `${TREE.hits.length} 個` : '';
  treeJump(1);
}
function treeJump(d) {
  if (!TREE.hits || !TREE.hits.length) return;
  TREE.hi = (TREE.hi + d + TREE.hits.length) % TREE.hits.length;
  const n = PTREE.I[TREE.hits[TREE.hi]];
  TREE.x = -n.x * TREE.z;
  TREE.y = -n.y * TREE.z;
  treeView();
  $('tfound').textContent = `${TREE.hi + 1} / ${TREE.hits.length}`;
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
  const asc = id.startsWith('a_'),
    have = asc ? S.at : S.pt;
  if (have.includes(id)) {
    if (!treeCanRefund(id)) return hudWarn(id === 'a_st' || PT_START.includes(id) ? '起點不能退' : '先退後面的點');
    have.splice(have.indexOf(id), 1);
    delete S.ptA[id];
  } else if (treeCan(id)) {
    /* 過路點：先選要加哪一項能力值（treePick 才真的點下去） */
    if (!asc && PTREE.I[id].s.attr) return treeAttrAsk(id);
    have.push(id);
  } else if (asc && ascLeft() <= 0) return hudWarn('沒有昇華點了：階級 6、12、16 的王第一次打倒各 +2');
  else if (asc && ascT().I[id].g && S.at.some(o => ascT().I[o].g === ascT().I[id].g))
    return hudWarn('同一組只能選一個：先退掉另一個');
  else if (asc) return hudWarn('要跟點過的點連在一起，而且最後要剛好 4 小 4 大');
  else return hudWarn(ptLeft() <= 0 ? '沒有天賦點了：升級會再給' : '要跟點過的點連在一起');
  sfx('equip');
  treeChanged();
}
/* 過路點的選擇框（0.2.42）：+5 力量／敏捷／智慧，點按鈕才點下去；再點別處或按取消關掉 */
function treeAttrAsk(id) {
  treeAttrClose();
  const d = document.createElement('div');
  d.id = 'tattr';
  d.className = 'tattr';
  d.innerHTML = `<span>+${PT_ATTR} 能力值：</span>${Object.entries(ATT_PT)
    .map(([c, k]) => `<button class="btn pri" data-ta="attr:${id}:${c}">${ATTN[k]}（${ATT_HINT[k]}）</button>`)
    .join('')}<button class="btn" data-ta="attrx">取消</button>`;
  $('ptree').appendChild(d);
}
const ATT_HINT = { str: '生命', dex: '命中', int: '魔力' };
function treeAttrClose() {
  const d = $('tattr');
  if (d) d.remove();
}
function treePick(id, c) {
  treeAttrClose();
  if (!ATT_PT[c] || S.pt.includes(id) || !treeCan(id)) return;
  S.pt.push(id);
  S.ptA[id] = c;
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
/* only＝武器招牌點：拿那種武器才生效（items.js 的 stats） */
const statLines = s => [
  ...(s.only ? [`持${WTN[s.only]}時：`] : []),
  ...Object.entries(s)
    .filter(([k]) => k !== 'only')
    .map(([k, v]) => (STATN[k][2] ? STATN[k][0] : `${STATN[k][0]} ${v > 0 ? '+' : ''}${v}${STATN[k][1]}`))
];
function treeTip(id) {
  const n = id.startsWith('a_') ? ascT().I[id] : PTREE.I[id];
  const kind = n.asc
    ? n.big === 3
      ? '昇華起點'
      : n.big
        ? n.g
          ? '昇華大點（同一組只能選一個）'
          : '昇華大點'
        : '昇華小點'
    : n.big === 2
      ? '基石'
      : n.gate
        ? '起點'
        : n.big
          ? '大點'
          : '小點';
  const lines =
    n.big === 3
      ? [esc(ASC[S.asc].d)]
      : n.d
        ? [esc(n.d)]
        : n.s.attr
          ? [
              S.ptA[id]
                ? `${ATTN[ATT_PT[S.ptA[id]]]} +${n.s.attr}`
                : `能力值 +${n.s.attr}（點的時候選力量、敏捷或智慧）`
            ]
          : statLines(n.s);
  return `<b class="${n.big === 2 || n.asc ? 'c-gold' : ''}">${esc(n.n)}</b><small>${kind}</small>${lines.length ? `<p class="aff">${lines.join('<br>')}</p>` : ''}`;
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
      treeAttrClose();
      if (TOUCH.on && TREE.sel) (TREE.sel = null), hideTip(), treeRefresh();
      return;
    }
    const id = g.n.dataset.n;
    /* 手機：點一下＝選取看說明，再點一次才點亮／退回 */
    if (TOUCH.on && TREE.sel !== id) {
      TREE.sel = id;
      treeRefresh();
      const r = document.querySelector(`#tg [data-n="${id}"]`).getBoundingClientRect(),
        have = S.pt.includes(id) || S.at.includes(id);
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
    if (a.dataset.ta === 'attrx') treeAttrClose();
    if (a.dataset.ta.startsWith('attr:')) treePick(...a.dataset.ta.split(':').slice(1));
    /* 重置按兩次：一鍵清空幾十點太容易誤觸 */
    if (a.dataset.ta === 'reset' && confirm2(a, '再按一次：退回全部天賦點'))
      (S.pt = [...PT_START]), (S.ptA = {}), treeChanged();
    if (a.dataset.ta === 'areset' && confirm2(a, '再按一次：退回昇華點')) (S.at = ['a_st']), treeChanged();
  });
  el.addEventListener('input', e => e.target.id === 'tfind' && treeFind(e.target.value));
  el.addEventListener('keydown', e => {
    if (e.target.id !== 'tfind') return;
    if (e.key === 'Enter') e.preventDefault(), treeJump(e.shiftKey ? -1 : 1);
    if (e.key === 'Escape') (e.target.value = ''), treeFind('');
  });
  addEventListener('resize', treeView);
}
