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
  /* 鎖住的預留點（PT_RSV）看得到、不能點 */
  if (S.pt.includes(id) || ptLeft() <= 0 || PTREE.I[id].lock) return false;
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
/* 點在畫面上的框（只量圈，不含珠寶孔旁的字、基石外圈） */
const ndRect = id => TEL.n.get(id).querySelector('circle:not(.r2)').getBoundingClientRect();
/* 點的半徑（世界座標）：基石 30、起點 20、大點 19、小點 10；珠寶孔前期／交會 14、外圈大孔 20 */
const TR = n => (n.jw >= 0 ? (n.out ? 20 : 14) : n.big === 2 ? 30 : n.gate ? 20 : n.big ? 19 : 10);
/* 能力值點的三種標記（CSS 照 .a-s／.a-d／.a-i 只顯示選的那一種；字母只在點 ≥24px 時畫，#tsvg.lt） */
const ATT_SVG =
  '<g class="am"><rect class="as" x="-7" y="-7" width="14" height="14"/><path class="ad" d="M0 -9L9 0L0 9L-9 0Z"/><circle class="ai" r="7.5"/><text class="al">S</text><text class="al">D</text><text class="al">I</text></g>';
/* 鎖住的點連成一團一團（PT_WP_LOCK、PT_RSV）：每團的中心、半徑、字 */
function treeLocks() {
  const seen = new Set(),
    out = [];
  for (const n of PTREE.N) {
    if (!n.lock || seen.has(n.id)) continue;
    const g = [],
      q = [n];
    seen.add(n.id);
    while (q.length) {
      const a = q.pop();
      g.push(a);
      for (const o of PTREE.ADJ[a.id] || []) if (PTREE.I[o].lock && !seen.has(o)) seen.add(o), q.push(PTREE.I[o]);
    }
    const x = g.reduce((t, a) => t + a.x, 0) / g.length,
      y = g.reduce((t, a) => t + a.y, 0) / g.length;
    out.push({
      x,
      y,
      r: Math.max(...g.map(a => Math.hypot(a.x - x, a.y - y) + TR(a))) + 24,
      t: n.d || '還沒開放',
      ids: g.map(a => a.id)
    });
  }
  return out;
}
/* 看得清楚圖示的縮放（小點 25px）；小於 Z_TAP 時手機點一下只放大過去、不選點（0.4.7） */
const Z_NEAR = 1.25,
  Z_TAP = 0.7;
/* 整棵樹的總覽：起點的 6 個門大約在半徑 560 的圈上，窄螢幕縮到看得到全部的門（視窗還沒有寬度時不能算出負的） */
/* 總覽的縮放：寬照舊；M1-03 直立與桌機的高也要放得下六條路的名字（起點往外 SECN_OUT＋半個字高），頂部列與底部圖例約 160px */
const treeZ0 = () =>
  clamp(
    Math.min(
      (IW / 2 - 30) / 560,
      (IH - 160) / 2 / (Math.max(...PT_START.map(id => Math.abs(PTREE.I[id].y))) + SECN_OUT + 40)
    ),
    0.12,
    0.55
  );
/* 我點到哪：最後點亮的那個點（只有起點＝還沒開始） */
const treeMine = () => (S.pt.length > PT_START.length ? PTREE.I[S.pt[S.pt.length - 1]] : null);
function treeOpen() {
  if (TREE.open) return treeClose();
  /* M1-06：祭壇還沒到就只講一句（P 鍵、分頁、更多選單都走這裡） */
  if (lockTxt('tree')) return hudWarn(lockTxt('tree'));
  closePanels();
  TREE.open = true;
  TREE.sel = null;
  TREE.path = [];
  $('ptree').hidden = false;
  /* 整棵樹只建一次（換昇華才重建）；再打開只更新點亮狀態 */
  const fresh = !(TREE.built === (S.asc || '') && TEL);
  if (fresh) treeRender();
  /* 畫面大小先用上次量到的（第一次用估的），等點與格子都定好再真的量：
     先量的話瀏覽器要先排版一次，裁切換了格子又要再排一次 */
  if (!TREE.vw) Object.assign(TREE, { vw: IW, vh: IH - 120, vl: 0, vt: 56 });
  /* 0.4.7：這次遊戲第一次打開停在「我點到哪」、看得清楚圖示；還沒點過＝總覽（選一區，點一下放大過去）；
     之後再打開回到上次看的地方 */
  if (!TREE.seen) {
    const m = treeMine();
    TREE.seen = 1;
    if (m) (TREE.z = Z_NEAR), (TREE.x = -m.x * Z_NEAR), (TREE.y = -m.y * Z_NEAR);
    else (TREE.z = treeZ0()), (TREE.x = TREE.y = 0);
  }
  if (!fresh) treeRefresh();
  treeView();
  treeCard();
  if (PORT()) sheetSync();
  if (!TPAD.on) (TPAD.on = 1), requestAnimationFrame(treePad);
  const w = TREE.vw,
    h = TREE.vh;
  treeSize();
  if (TREE.vw !== w || TREE.vh !== h) treeView();
}
/* 樹的畫面有多大、在哪（打開與視窗變動時量一次；拖曳、縮放每一格都要用，不能每格量） */
function treeSize() {
  const v = $('tview');
  if (!v) return;
  const r = v.getBoundingClientRect();
  Object.assign(TREE, { vw: r.width, vh: r.height, vl: r.left, vt: r.top });
}
/* 0.3.3：遊戲載入後趁閒置先把整棵樹建好（藏著，不排版），第一次打開跟重開一樣快（手機原本要等 3、4 秒） */
function treePrebuild() {
  if (TEL || TREE.open) return;
  TREE.open = true; /* treeRender／treeRefresh 只在開著時跑：建的這一下假裝開著，#ptree 還是 hidden */
  const el = $('ptree');
  try {
    treeRender();
    /* 0.4.7：第一次排版特別慢（三千多張圖示第一次用到），趁現在閒著先排一次：看不見地顯示一下再藏回去 */
    el.style.visibility = 'hidden';
    el.hidden = false;
    void el.offsetHeight;
  } finally {
    el.hidden = true;
    el.style.visibility = '';
    TREE.open = false;
  }
}
function treeClose() {
  TREE.open = false;
  TREE.sel = null;
  TREE.path = [];
  cancelAnimationFrame(TREE.fly);
  treeAttrClose();
  treeSockOpen(null);
  TREE.hov = null;
  TREE.alt = 0;
  $('ptree').hidden = true;
  hideTip();
  if (PORT()) sheetSync();
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
  /* 線與點分格裝進 <g>（treeCull 把看不到的格子關掉）；線都在點下面 */
  const eC = {},
    nC = {},
    cell = (o, x, y, v) => (o[tcell(x, y)] = o[tcell(x, y)] || []).push(v);
  for (const [a, b] of PTREE.E) {
    const A = PTREE.I[a],
      B = PTREE.I[b],
      on = have.has(a) && have.has(b),
      near = have.has(a) || have.has(b);
    const c = PTREE.ARC[a + '|' + b];
    cell(eC, (A.x + B.x) / 2, (A.y + B.y) / 2, [
      c ? arc(A, B, c, on ? 'on' : near ? 'near' : '') : line(A, B, on, near),
      a,
      b
    ]);
  }
  /* 珠寶孔的線（孔→掛點） */
  for (const n of PTREE.J) {
    const A = PTREE.I[n.an];
    cell(eC, (A.x + n.x) / 2, (A.y + n.y) / 2, [
      line(A, n, have.has(n.id) && have.has(n.an), have.has(n.an)),
      n.an,
      n.id
    ]);
  }
  let html = Object.entries(eC)
    .map(([k, L]) => `<g class="tc e" data-c="${k}" style="display:none">${L.map(x => x[0]).join('')}</g>`)
    .join('');
  /* 圖示：每個點直接一個 <image>（0.3.3：原本用 <use> 引用 <defs>，每個 <use> 都要複製一份，手機打開排版慢一倍）；
     網址 treeIcons 補（artIconURL 快取，同一張圖共用一個字串） */
  for (const n of PTREE.N) {
    const r = TR(n),
      st = have.has(n.id) ? 'on' : treeCan(n.id) ? 'can' : 'off',
      s = r * (n.big ? 1.4 : 1.3),
      art = n.ic && typeof ART !== 'undefined' && ART[n.ic],
      /* 圖：有圖貼圖；缺圖畫「佔位」虛線框（S/talent-tree.md「圖示與佔位」：缺圖狀態必須可辨） */
      img = art
        ? `<image class="ti" data-ic="${n.ic}" width="1" height="1" transform="translate(${-s / 2} ${-s / 2}) scale(${s})"/>`
        : n.lock
          ? ''
          : `<rect class="ph" x="${-s / 3}" y="${-s / 3}" width="${(s * 2) / 3}" height="${(s * 2) / 3}"/>`,
      /* 能力值點：選了才畫形狀＋字母（力量方形 S、敏捷菱形 D、智慧圓形 I）；沒選不畫（不畫成力量） */
      att = n.s.attr ? ATT_SVG : '',
      ring = n.big === 2 ? `<circle class="r2" r="${r + 7}"/>` : '';
    cell(
      nC,
      n.x,
      n.y,
      `<g class="nd ${st} b${n.big}${n.lock ? ' lk' : ''}${TREE.sel === n.id ? ' sel' : ''}" data-n="${n.id}" transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})" style="--c:${PT_THEME[n.th].c}">${ring}<circle r="${r}"/>${img}${att}</g>`
    );
  }
  /* 珠寶孔：程式畫的圈，孔上標「空」／「已鑲」（treeRefresh 換字）；還沒點亮的旁邊標「還沒點亮（開孔要 1 點）」 */
  for (const n of PTREE.J)
    cell(
      nC,
      n.x,
      n.y,
      `<g class="nd js${n.out ? ' jo' : ''} off b0" data-n="${n.id}" transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})"><circle r="${TR(n)}"/><text class="jt" y="1">空</text><text class="jl" x="${TR(n) + 8}" y="1">還沒點亮（開孔要 1 點）</text></g>`
    );
  html += Object.entries(nC)
    .map(([k, L]) => `<g class="tc" data-c="${k}" style="display:none">${L.join('')}</g>`)
    .join('');
  html += `<circle class="hollow" r="${PT_R0 - 40}"/>`;
  /* 還沒開放的（鎖住）：每一團畫一個虛線圈，標「還沒開放：「鏈錘術」」（玩家畫面不寫「叢集」） */
  html += treeLocks()
    .map(
      g =>
        `<g class="lkc"><circle cx="${g.x.toFixed(0)}" cy="${g.y.toFixed(0)}" r="${g.r.toFixed(0)}"/><text x="${g.x.toFixed(0)}" y="${(g.y - g.r - 14).toFixed(0)}">${esc(g.t)}</text></g>`
    )
    .join('');
  /* 六區的名字：縮小看全圖時才顯示（#tsvg.far1），點一下放大到那一區 */
  html += PT_START.map((id, i) => {
    /* M1-03：寫在起點往外的那一側（以前一律寫在上面，下半圈三條路的名字掉進中間的昇華圓）；左右兩邊往中間收，直立看全圖時才不會被切掉 */
    const g = PTREE.I[id],
      d = Math.hypot(g.x, g.y) || 1,
      x = g.x + (g.x / d) * SECN_OUT,
      y = g.y + (g.y / d) * SECN_OUT;
    return `<text class="secn" x="${clamp(x, -470, 470).toFixed(0)}" y="${y.toFixed(0)}">${esc(secName(i))}</text>`;
  }).join('');
  /* 中間：昇華的入口（0.4.7；以前整張昇華圖塞在這裡，字只有 3px，跟昇華石碑是同一件事的兩種長相）。
     點一下打開昇華石碑；字在 treeRefresh 更新 */
  const A = S.asc && ASC[S.asc],
    R0 = PT_R0 - 40;
  html += `<g class="ascgo" id="tascgo"><circle r="${R0 - 30}"/>${A && A.ic && typeof ART !== 'undefined' && ART[A.ic] ? `<image data-ic="${A.ic}" x="${-R0 * 0.32}" y="${-R0 * 0.62}" width="${R0 * 0.64}" height="${R0 * 0.64}"/>` : ''}<text class="n" y="${R0 * 0.24}"></text><text class="s" y="${R0 * 0.48}"></text></g>`;
  const B = treeBox();
  /* 頂部一排（0.4.7，以前三排 126px）：剩幾點、搜尋、回到我點到的地方、關閉；重置移到左下角，離關閉遠一點 */
  $('ptree').innerHTML = `<div class="tbar">
    <b>天賦樹</b>
    <span class="tleft" title="每級 1 點，逢 10 級 +3">剩 <b id="tpts"></b> 點</span>
    <input id="tfind" type="search" placeholder="搜尋天賦" aria-label="搜尋天賦" autocomplete="off"><button id="tfound" data-ta="next" aria-live="polite" hidden></button>
    <button class="x tmine" aria-label="回到我點到的地方" title="回到我點到的地方" data-ta="mine">回</button>
    <button class="x" aria-label="關閉" data-ta="close">${ICO.x}</button></div>
  <div id="tview"><svg id="tsvg" viewBox="${B.x} ${B.y} ${B.w} ${B.h}" width="${B.w}" height="${B.h}"><g id="tg">${html}</g></svg></div>
  <div id="tminiw" hidden><b>整棵樹</b><canvas id="tmini" width="168" height="168" aria-label="整棵樹的總覽，點一下移過去"></canvas></div>
  <button class="btn" data-ta="reset" id="treset">重置天賦</button>
  <div id="tcard" class="tcard" hidden></div>
  <div id="thov" class="thov" role="tooltip" hidden></div>
  <div id="tterm" class="tterm" role="tooltip" hidden></div>
  <p class="thelp"><b>操作</b>點亮著的點＝點下去，再點＝退回　·　拖曳移動　·　滾輪縮放　·　雙圈大圓是基石（有代價）　·　虛線圈＝還沒開放　·　名詞停留 0.4 秒／手把 R3</p>`;
  /* 之後選取、點亮只改 class，不重畫整棵樹（一千多個點，手機重畫會卡） */
  const tg = $('tg'),
    eEls = tg.querySelectorAll('.tc.e');
  TEL = {
    n: new Map([...tg.querySelectorAll('.nd')].map(e => [e.dataset.n, e])),
    k: new Map() /* 每個點現在的 class（treeRefresh 比這個，不用一個一個問 DOM） */,
    e: Object.values(eC).flatMap((L, c) => L.map((x, i) => [eEls[c].children[i], x[1], x[2], null])),
    c: [...tg.querySelectorAll('.tc')].map(el => {
      const [x, y] = el.dataset.c.split(',');
      return { el, x: x * TCELL, y: y * TCELL, on: false };
    })
  };
  TREE.mini = TREE.far = TREE.far1 = null; /* 新的 SVG：far／far1 的 class 要重新掛 */
  treeIcons();
  treeRefresh();
  treeView();
}
/* 圖示另外補：大圖載好幾張就補幾張，不重建整棵樹 */
function treeIcons() {
  for (const el of document.querySelectorAll('#tg image[data-ic]')) {
    const u = artIconURL(el.dataset.ic);
    if (u) el.setAttribute('href', u), el.removeAttribute('data-ic');
  }
}
let TEL = null;
/* 視窗裁切：世界座標切成方格，看不到的格子 display:none，手機拖曳才順（三千多個點都留在 DOM，點亮、搜尋不用管畫面）。
   縮到看不清楚時（far）小點不畫圖示 */
const TCELL = 900,
  tcell = (x, y) => Math.floor(x / TCELL) + ',' + Math.floor(y / TCELL);
function treeCull() {
  if (!TEL || !$('tview')) return;
  const z = TREE.z,
    m = 300,
    w = TREE.vw || 0,
    h = TREE.vh || 0,
    x0 = (-w / 2 - TREE.x) / z - m,
    x1 = (w / 2 - TREE.x) / z + m,
    y0 = (-h / 2 - TREE.y) / z - m,
    y1 = (h / 2 - TREE.y) / z + m;
  for (const c of TEL.c) {
    const on = c.x + TCELL > x0 && c.x < x1 && c.y + TCELL > y0 && c.y < y1;
    /* 拖曳、縮放中只開不關（關掉會讓整層重畫），放手後 treeMoving(false) 再收 */
    if (on !== c.on && (on || !TREE.mov)) (c.on = on), (c.el.style.display = on ? '' : 'none');
  }
  const far = z < 0.2,
    far1 = z < Z_TAP,
    lt = z * 20 >= 24; /* 能力值點 ≥24px 才畫 S／D／I */
  if (lt !== TREE.lt) (TREE.lt = lt), $('tsvg').classList.toggle('lt', lt);
  if (far !== TREE.far) (TREE.far = far), $('tsvg').classList.toggle('far', far);
  /* 小點的圖示小於 9px 就不畫（看不出是什麼，三千多張圖很吃效能）；六區的名字這時才顯示 */
  if (far1 !== TREE.far1) (TREE.far1 = far1), $('tsvg').classList.toggle('far1', far1);
}
function treeRefresh() {
  if (!TREE.open || !TEL) return;
  const have = new Set(S.pt),
    left = ptLeft() > 0,
    path = new Set(TREE.path || []),
    hits = TREE.hs;
  for (const [id, el] of TEL.n) {
    const n = PTREE.I[id],
      st = have.has(id) ? 'on' : left && !n.lock && (PTREE.ADJ[id] || []).some(o => have.has(o)) ? 'can' : 'off',
      a = n.s.attr && have.has(id) && S.ptA[id],
      j = n.jw >= 0 && (S.jsock || [])[n.jw] && jwOf(S, S.jsock[n.jw]),
      cls = `nd ${st} b${n.big}${n.lock ? ' lk' : ''}${n.jw >= 0 ? ` js${n.out ? ' jo' : ''}${j ? ' full' : ''}` : ''}${a ? ' a-' + a : ''}${TREE.sel === id ? ' sel' : ''}${path.has(id) ? ' pth' : ''}${hits && hits.has(id) ? (TREE.hits[TREE.hi] === id ? ' hit cur' : ' hit') : ''}`;
    if (TEL.k.get(id) !== cls) {
      TEL.k.set(id, cls), el.setAttribute('class', cls);
      if (n.jw >= 0) el.querySelector('.jt').textContent = j ? '已鑲' : '空';
    }
  }
  for (const x of TEL.e) {
    const cls = have.has(x[1]) && have.has(x[2]) ? 'on' : have.has(x[1]) || have.has(x[2]) ? 'near' : '';
    if (x[3] !== cls) (x[3] = cls), x[0].setAttribute('class', cls);
  }
  /* 中間的昇華入口 */
  const go = $('tascgo');
  if (go) {
    const [sm, bg] = S.asc ? ascCount() : [0, 0];
    go.querySelector('.n').textContent = S.asc ? ASC[S.asc].n : '還沒有昇華';
    go.querySelector('.s').textContent = S.asc
      ? ascLeft() > 0
        ? `昇華 剩 ${ascLeft()} 點`
        : `昇華 小 ${sm}／4 · 大 ${bg}／4`
      : '點這裡選一個';
    go.classList.toggle('todo', !S.asc || ascLeft() > 0);
  }
  $('tpts').textContent = ptLeft();
  $('tpts').className = ptLeft() > 0 ? 'c-gold' : '';
  $('treset').hidden = S.pt.length <= PT_START.length;
  treeMini();
}
const secName = i => PTREE.I[PT_START[i]].n;
/* 六條路的名字離起點多遠（往外；看全圖時字放大到 150，要讓開起點） */
const SECN_OUT = 130;
/* 珠寶孔的面板（S/talent-tree.md 06／07）：孔的狀態、裡面的珠寶（拔下）、收藏裡的珠寶（鑲上）。畫面不出現 J1a 等代碼 */
const JW_DROP = '珠寶打鬼門關、心魔幻境、凶地、陰兵借道才會掉。不保證第一顆。',
  JW_NO = '珠寶無法分解，也不能打造或重鑄。';
const jwState = n => {
  const j = (S.jsock || [])[n.jw] && jwOf(S, S.jsock[n.jw]);
  return [j, j ? '已鑲上' : S.pt.includes(n.id) ? '空' : '還沒點亮（開孔要 1 點）'];
};
function treeSockOpen(i) {
  treeAttrClose();
  $('tsockp') && $('tsockp').remove();
  if (i == null) return;
  const n = PTREE.J[i],
    [cur, st] = jwState(n),
    nts = j => j.nt.map(id => esc(PTREE.I[id].n) + (S.pt.includes(id) ? '（已點過，不重複計算）' : '')).join('　·　'),
    row = j => {
      const at = (S.jsock || []).indexOf(j.id);
      return `<div class="jw"><div><b>${esc(jwName(j))}</b>${at >= 0 ? `<span class="c-dim">（在${esc(secName(PTREE.J[at].sec))}的珠寶孔）</span>` : ''}<small>${nts(j)}</small></div><button class="btn pri" data-ta="jput:${i}:${j.id}">鑲上</button></div>`;
    },
    d = document.createElement('div');
  d.id = 'tsockp';
  d.dataset.i = i;
  d.className = 'tsockp';
  /* 已鑲：珠寶、拔下、不能丟；空：掉落句；收藏裡的珠寶（空孔才列，鑲上） */
  d.innerHTML = `<b class="tt">${esc(secName(n.sec))}的珠寶孔${n.out ? '（大孔）' : ''}</b><button class="x" aria-label="關閉" data-ta="sockx">${ICO.x}</button>
    <p class="sub">${cur ? '已鑲上' : st}</p>
    ${
      cur
        ? `<p class="lead">${esc(jwName(cur))}　·　${nts(cur)}</p><p class="jn">珠寶的大點等同點亮天賦；已點過或重複的大點只算一次。</p><button class="btn" data-ta="jout:${i}">拔下</button><p class="jn">鑲著的珠寶不能丟棄。${JW_NO}丟棄（在倉庫的珠寶分頁，長按確認）不給任何東西。</p>`
        : `<p class="lead">這個孔是空的。</p><p class="jn">${JW_DROP}</p><p class="jn">${JW_NO}空孔可先看，不藏起來。</p>${(S.jewels || []).map(row).join('')}`
    }`;
  $('ptree').appendChild(d);
}
let TBOX = null;
function treeBox() {
  if (TBOX) return TBOX;
  let x0 = 0,
    y0 = 0,
    x1 = 0,
    y1 = 0;
  for (const n of PTREE.N)
    (x0 = Math.min(x0, n.x)), (y0 = Math.min(y0, n.y)), (x1 = Math.max(x1, n.x)), (y1 = Math.max(y1, n.y));
  for (const n of PTREE.J)
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
    TREE.txt = PTREE.N.map(n => [
      n.id,
      [n.n || '', n.d || '', n.s.attr ? '能力值' : '', ...statLines(n.s)].join(' ').toLowerCase()
    ]);
  TREE.hits = q ? TREE.txt.filter(([, t]) => t.includes(q)).map(([id]) => id) : [];
  TREE.hi = -1;
  TREE.hs = q ? new Set(TREE.hits) : null;
  $('tsvg').classList.toggle('finding', !!q);
  treeRefresh();
  /* 搜尋 N／總數（M2-08，UI 審查 F1）：找不到寫 0／0；點這顆＝下一個（手機沒有 Enter） */
  const f = $('tfound');
  f.hidden = !q;
  f.textContent = '0／0';
  treeJump(1);
}
function treeJump(d) {
  if (!TREE.hits || !TREE.hits.length) return;
  TREE.hi = (TREE.hi + d + TREE.hits.length) % TREE.hits.length;
  const n = PTREE.I[TREE.hits[TREE.hi]];
  /* 縮得太小時跳過去也看不到是哪個：順便放大 */
  if (TREE.z < Z_TAP) TREE.z = Z_NEAR;
  TREE.x = -n.x * TREE.z;
  TREE.y = -n.y * TREE.z;
  treeView();
  treeRefresh();
  $('tfound').textContent = `${TREE.hi + 1}／${TREE.hits.length}`;
  $('tfound').setAttribute('aria-label', `第 ${TREE.hi + 1} 個，共 ${TREE.hits.length} 個，點一下到下一個`);
}
function treeView() {
  const sv = $('tsvg');
  if (!sv) return;
  const B = treeBox(),
    z = TREE.z;
  sv.style.transform = `translate(${(TREE.vw || 0) / 2 + TREE.x + B.x * z}px, ${(TREE.vh || 0) / 2 + TREE.y + B.y * z}px) scale(${z})`;
  treeCull();
  treeMini();
}
/* 拖曳、縮放：一格最多更新一次畫面（手指一格會送好幾次位置） */
function treeViewSoon() {
  if (TREE.raf) return;
  TREE.raf = requestAnimationFrame(() => {
    TREE.raf = 0;
    treeView();
  });
}
/* 拖曳、縮放時才把 SVG 升成一張圖層（放手後拿掉，瀏覽器會重新畫成清楚的） */
function treeMoving(on) {
  const s = $('tsvg');
  TREE.mov = on;
  if (s) s.classList.toggle('moving', on);
  if (!on) treeCull();
}
/* 滑過去（0.4.7）：點總覽、點小總覽、「回到我點到的地方」；減少動態時直接跳 */
function treeFly(wx, wy, z) {
  cancelAnimationFrame(TREE.fly);
  const x1 = -wx * z,
    y1 = -wy * z,
    x0 = TREE.x,
    y0 = TREE.y,
    z0 = TREE.z,
    t0 = performance.now(),
    D = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260;
  const step = now => {
    const t = D ? Math.min(1, (now - t0) / D) : 1,
      e = 1 - Math.pow(1 - t, 3);
    /* 縮放照比例內插（放大 4 倍時線性內插會先衝過頭），位置跟著縮放走 */
    TREE.z = z0 * Math.pow(z / z0, e);
    TREE.x = x0 + (x1 - x0) * e;
    TREE.y = y0 + (y1 - y0) * e;
    treeView();
    if (t < 1) TREE.fly = requestAnimationFrame(step);
    else treeMoving(false);
  };
  treeMoving(true);
  step(t0);
}
/* 小總覽（0.4.7）：放大後右上角一張整棵樹的小圖，點亮的是亮的、白框是現在看的範圍；點一下移過去。
   底圖（三千多個點）只在點數變動時重畫，白框每次移動畫 */
const TMINI = 168;
function treeMini() {
  const c = $('tmini');
  if (!c || !TREE.open) return;
  const show = !TOUCH.on || TREE.z >= 0.45,
    w0 = $('tminiw');
  if (w0.hidden === show) w0.hidden = !show;
  if (!show) return;
  const B = treeBox(),
    k = TMINI / Math.max(B.w, B.h),
    ox = (TMINI - B.w * k) / 2 - B.x * k,
    oy = (TMINI - B.h * k) / 2 - B.y * k;
  /* 底圖：點數有變才重畫 */
  const sig = S.pt.length + ':' + S.pt[S.pt.length - 1];
  if (!TREE.mini || TREE.miniK !== sig) {
    TREE.miniK = sig;
    const m = (TREE.mini = TREE.mini || document.createElement('canvas')),
      g = m.getContext('2d'),
      have = new Set(S.pt);
    m.width = m.height = TMINI; /* 設寬高也會清空 */
    g.fillStyle = `rgba(${PAL.rgb.txOffV1},0.45)`;
    for (const n of PTREE.N) if (!have.has(n.id)) g.fillRect(ox + n.x * k - 0.5, oy + n.y * k - 0.5, 1.4, 1.4);
    g.fillStyle = PAL.dmgCrit;
    for (const n of PTREE.N) if (have.has(n.id)) g.fillRect(ox + n.x * k - 1.5, oy + n.y * k - 1.5, 3.5, 3.5);
  }
  const g = c.getContext('2d'),
    z = TREE.z,
    w = (TREE.vw || 0) / z,
    h = (TREE.vh || 0) / z;
  g.clearRect(0, 0, TMINI, TMINI);
  g.drawImage(TREE.mini, 0, 0);
  g.strokeStyle = PAL.glint;
  g.lineWidth = 2;
  g.strokeRect(ox + (-TREE.x / z - w / 2) * k, oy + (-TREE.y / z - h / 2) * k, Math.max(6, w * k), Math.max(6, h * k));
}
/* 小總覽上的位置 → 樹的座標 */
function treeMiniAt(e) {
  const r = $('tmini').getBoundingClientRect(),
    B = treeBox(),
    k = TMINI / Math.max(B.w, B.h),
    px = ((e.clientX - r.left) / r.width) * TMINI,
    py = ((e.clientY - r.top) / r.height) * TMINI;
  return [(px - (TMINI - B.w * k) / 2) / k + B.x, (py - (TMINI - B.h * k) / 2) / k + B.y];
}
/* ---------- 手機的說明卡（0.4.7）：點一個點，說明固定在底部，按鈕就在拇指的位置 ----------
   以前是浮動說明框＋「再點一次點亮」：66 點要點 132 下，而且看不清楚時也點得下去。
   選的點沒有連著：算出最短的路，按一下沿路全部點亮（照 PoE）；路上有能力值點就選一種，整條路都用它 */
function treePath(id) {
  const have = new Set(S.pt);
  if (have.has(id) || PTREE.I[id].lock) return [];
  const prev = new Map([[id, null]]),
    q = [id];
  for (let i = 0; i < q.length; i++) {
    const a = q[i];
    for (const o of PTREE.ADJ[a] || []) {
      if (have.has(o)) {
        /* 找到連著的：從 a 走回 id */
        const out = [];
        for (let x = a; x; x = prev.get(x)) out.push(x);
        return out;
      }
      if (!prev.has(o) && !PTREE.I[o].lock) prev.set(o, a), q.push(o);
    }
  }
  return [];
}
function treeSelect(id) {
  TREE.sel = id;
  TREE.path = id ? treePath(id) : [];
  treeAttrClose();
  treeRefresh();
  treeCard();
}
function treeCard() {
  const c = $('tcard');
  if (!c) return;
  const id = TREE.sel;
  if (!id || !TOUCH.on || !PTREE.I[id]) return void (c.hidden = true);
  const n = PTREE.I[id],
    have = S.pt.includes(id),
    path = TREE.path || [],
    left = ptLeft(),
    attrs = path.filter(p => PTREE.I[p].s.attr).length,
    cost = path.length;
  let act;
  if (have)
    act = treeCanRefund(id)
      ? `<button class="btn" data-ta="back">退回這一點</button>`
      : `<p class="why">${PT_START.includes(id) ? '起點不能退' : '後面還有點連著：先退後面的'}</p>`;
  else if (n.lock) act = `<p class="why">${esc(n.d || '還沒開放')}</p>`;
  else if (!cost) act = `<p class="why">走不到：中間被還沒開放的點擋住</p>`;
  else if (left < cost)
    act = `<p class="why">${left <= 0 ? '沒有天賦點了：升級會再給' : `要 ${cost} 點才走得到，還差 ${cost - left} 點`}</p>`;
  else if (attrs)
    act = `<p class="why">${cost > 1 ? `沿路 ${cost} 點，其中 ` : ''}${attrs} 個能力值點（+${PT_ATTR}）選一種：</p><div class="tc-b">${Object.entries(
      ATT_PT
    )
      .map(
        ([code, k]) =>
          `<button class="btn pri" style="--c:${PT_FAM[ATT_FAM[k]]}" data-ta="go:${code}">${ATTN[k]}<small>${ATT_HINT[k]}</small></button>`
      )
      .join('')}</div>`;
  else
    act = `<button class="btn pri" data-ta="go">${cost > 1 ? `沿路點亮到這裡 · 花 ${cost} 點` : '點亮'}<small>剩 ${left} 點</small></button>`;
  c.innerHTML = `<div class="tc-h">${treeTip(id)}<button class="x" aria-label="收起" data-ta="desel">${ICO.x}</button></div><div class="tc-a">${act}</div>`;
  /* 0.4.10：卡片剛為了這個點彈出來時記時間——卡片可能蓋到手指下面，放開那一下的 click 會按到「點亮」 */
  if (c.hidden || TREE.cardFor !== id) (TREE.cardT = performance.now()), (TREE.cardFor = id);
  c.hidden = false;
  /* 選的點不要被卡片蓋住：太低就把樹往上推 */
  const sy = (TREE.vh || 0) / 2 + TREE.y + n.y * TREE.z,
    top = (TREE.vh || 0) - c.offsetHeight - 48;
  if (sy > top) (TREE.y -= sy - top), treeView();
}
/* 卡片的「點亮」：把路上的點全部點亮；c＝路上的能力值點選哪一種 */
function treeGo(c) {
  const path = TREE.path || [];
  if (!TREE.sel || !path.length || path.length > ptLeft()) return;
  if (path.some(p => PTREE.I[p].s.attr) && !ATT_PT[c]) return;
  for (const p of path) {
    S.pt.push(p);
    if (PTREE.I[p].s.attr) S.ptA[p] = c;
  }
  TREE.path = [];
  sfx('equip');
  treeChanged();
  treeCard();
}
function treeToggle(id) {
  const asc = id.startsWith('a_'),
    have = asc ? S.at : S.pt;
  if (have.includes(id)) {
    if (!treeCanRefund(id)) return hudWarn(id === 'a_st' || PT_START.includes(id) ? '起點不能退' : '先退後面的點');
    /* 退掉鎖欄位的點不會有裝備要脫；退掉第三隻手要把那枚戒指脫到背包（放不下就擋下來） */
    const why =
      asc &&
      eqUnloadWhy(
        S,
        have.filter(x => x !== id)
      );
    if (why) return hudWarn(why);
    have.splice(have.indexOf(id), 1);
    delete S.ptA[id];
  } else if (!asc && !PTREE.I[id].lock && treePath(id).length) {
    /* 沿路點亮（S/talent-tree.md 10、11）：不夠點不點；路上有能力值點先選一種，整條路都用它（treePick 才真的點下去） */
    const path = treePath(id),
      left = ptLeft();
    if (path.length > left) return hudWarn(`要 ${path.length} 點才走得到，還差 ${path.length - left} 點`);
    if (path.some(p => PTREE.I[p].s.attr)) return treeAttrAsk(id);
    have.push(...path);
  } else if (asc && treeCan(id)) {
    /* 點亮鎖欄位的點（甲蟲之殼、腹蛇之眼）：那欄的裝備脫到背包（滿了放臨時頁），都放不下就擋下來 */
    const why = asc && eqUnloadWhy(S, [...have, id]);
    if (why) return hudWarn(why);
    have.push(id);
  } else if (asc && ascLeft() <= 0) return hudWarn('沒有昇華點了：Lv 31、63、83 地圖的王第一次打倒各 +2');
  else if (asc && ascT().I[id].g && S.at.some(o => ascT().I[o].g === ascT().I[id].g))
    return hudWarn('同一組只能選一個：先退掉另一個');
  else if (asc) return hudWarn('要連著已點亮的點，最後剛好 4 小 4 大');
  else
    return hudWarn(
      PTREE.I[id].lock ? PTREE.I[id].d : ptLeft() <= 0 ? '沒有天賦點了：升級會再給' : '要跟點過的點連在一起'
    );
  sfx('equip');
  treeChanged();
}
/* 能力值三選一（S/talent-tree.md 15）：貼在被點的點旁邊；標題「能力值 +5」，點按鈕才點下去（沿路的話整條路的能力值點都用同一種）。
   鍵盤 1／2／3、Esc；手把方向鍵選、Ⓐ 確認、Ⓑ 取消（treePad） */
const ATT_IC = {
  s: '<svg class="aic" viewBox="0 0 22 22" aria-hidden="true"><rect x="3" y="3" width="16" height="16"/><text x="11" y="15.5">S</text></svg>',
  d: '<svg class="aic" viewBox="0 0 22 22" aria-hidden="true"><path d="M11 1L21 11L11 21L1 11Z"/><text x="11" y="15.5">D</text></svg>',
  i: '<svg class="aic" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="9"/><text x="11" y="15.5">I</text></svg>'
};
function treeAttrAsk(id) {
  treeAttrClose();
  const d = document.createElement('div');
  d.id = 'tattr';
  d.className = 'tattr';
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-label', `能力值 +${PT_ATTR}`);
  d.innerHTML = `<b class="th">能力值 +${PT_ATTR}</b><p class="tp">點的時候選力量、敏捷或智慧。點按鈕才點下去。</p>${Object.entries(
    ATT_PT
  )
    .map(([c, k], i) => {
      const [per, w] = ATT_PER[k];
      return `<button class="ab" data-ta="attr:${id}:${c}">${ATT_IC[c]}<b>${ATTN[k]}</b><small>${ATT_HINT[k]}</small><span>+${PT_ATTR} ${ATTN[k]}＝+${per * PT_ATTR} ${w}</span><kbd>${i + 1}</kbd></button>`;
    })
    .join(
      ''
    )}<div class="ac"><button class="btn" data-ta="attrx">取消<kbd>Esc</kbd></button></div><p class="keys"><b>鍵盤</b>滑鼠點選項或取消；鍵盤 1／2／3 對應力量／敏捷／智慧，Esc 或點別處關掉。<br><b>手把</b>方向鍵或左搖桿選，Ⓐ 確認，Ⓑ 取消。</p>`;
  const P = $('ptree');
  P.appendChild(d);
  hideTip(), treeHov(null);
  /* 放在點的右邊，放不下放左邊；上下不超出樹的畫面 */
  const r = ndRect(id),
    p = P.getBoundingClientRect(),
    v = $('tview').getBoundingClientRect(),
    w = d.offsetWidth,
    h = d.offsetHeight,
    x = r.right + 24 + w <= p.right - 12 ? r.right + 24 : r.left - 24 - w;
  d.style.left = clamp(x, p.left + 12, p.right - w - 12) - p.left + 'px';
  d.style.top = clamp(r.top + r.height / 2 - h / 2, v.top + 12, v.bottom - h - 12) - p.top + 'px';
  d.querySelector('.ab').focus();
}
/* 重置確認卡的第二句（12 與 18 必須相同） */
const TREE_RESET2 = ['起點不能退，重置後仍留在所選的路上。此操作會清掉目前的配點，但之後可再免費點回來。'];
const ATT_HINT = { str: '生命', dex: '命中', int: '魔力' },
  ATT_FAM = { str: 'r', dex: 'g', int: 'b' };
/* 點擊範圍（0.2.45）：小點在預設縮放下只有 11px，不靠圓本身，找游標附近最近的點（半徑至少 22px） */
let THIT = null;
function treeHit(e) {
  const v = $('tview'),
    el = e.target.closest('.nd');
  if (el || !v || !TEL || !e.target.closest('#tview')) return el;
  if (!THIT) {
    THIT = new Map();
    for (const n of [...PTREE.N, ...PTREE.J]) {
      const k = Math.floor(n.x / 200) + ',' + Math.floor(n.y / 200);
      (THIT.get(k) || THIT.set(k, []).get(k)).push(n);
    }
  }
  const [x, y] = treeAt(e),
    R = Math.min(60, 22 / TREE.z);
  let best = null,
    bd = R;
  for (let i = Math.floor((x - R - 30) / 200); i <= Math.floor((x + R + 30) / 200); i++)
    for (let j = Math.floor((y - R - 30) / 200); j <= Math.floor((y + R + 30) / 200); j++)
      for (const n of THIT.get(i + ',' + j) || []) {
        const d = Math.hypot(n.x - x, n.y - y) - TR(n);
        if (d < bd) (bd = d), (best = n);
      }
  return best ? TEL.n.get(best.id) : null;
}
/* 畫面上的位置 → 樹的座標 */
const treeAt = e => [
  (e.clientX - TREE.vl - TREE.vw / 2 - TREE.x) / TREE.z,
  (e.clientY - TREE.vt - TREE.vh / 2 - TREE.y) / TREE.z
];
function treeAttrClose() {
  const d = $('tattr');
  if (d) d.remove();
}
function treePick(id, c) {
  treeAttrClose();
  const path = treePath(id);
  if (!ATT_PT[c] || !path.length || path.length > ptLeft()) return;
  for (const p of path) {
    S.pt.push(p);
    if (PTREE.I[p].s.attr) S.ptA[p] = c;
  }
  sfx('equip');
  treeChanged();
}
function treeChanged() {
  const hpF = P.hp / ST.hp;
  ascSync();
  ST = stats();
  chgHoldSync();
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
    .flatMap(([k, v]) => statText(k, v).split('\n'))
];
/* 名詞（TERMS）在效果文字裡加虛線底線；停留 0.4 秒或手把 R3 才出名詞提示（另一層，不是懸浮窗本身）。同一窗同一詞只標第一次 */
const treeTerms = (L, seen = new Set()) =>
  L.map(t =>
    esc(t).replace(TERM_RE, w => (seen.has(w) ? w : (seen.add(w), `<span class="tm" data-tm="${w}">${w}</span>`)))
  );
/* 能力值的固有加成（items.js 的 stats：每 1 點力量 +2 最大生命、敏捷 +8 命中值、智慧 +2 最大魔力） */
const ATT_PER = { str: [2, '最大生命'], dex: [8, '命中值'], int: [2, '最大魔力'] };
/* 懸浮窗的內容（S/talent-tree.md「懸浮與畫面文案表」）；det＝按住 Alt／Ｙ 的詳細層（同一窗加高，不另開頁）。手機的說明卡也用這個 */
function treeTip(id, det) {
  const n = id.startsWith('a_') ? ascT().I[id] : PTREE.I[id];
  if (n.asc) {
    const kind = n.big === 3 ? '昇華起點' : n.big ? (n.g ? '昇華大點（同一組只能選一個）' : '昇華大點') : '昇華小點',
      L = n.big === 3 ? [esc(ASC[S.asc].d)] : n.d ? esc(n.d).split('\n') : statLines(n.s).map(esc);
    return `<b class="c-gold">${esc(n.n)}</b><small>${kind}</small>${L.length ? `<p class="aff">${L.join('<br>')}</p>` : ''}`;
  }
  const have = S.pt.includes(id),
    path = have || n.lock ? [] : treePath(id),
    left = ptLeft(),
    lack = !have && path.length > left,
    top = det ? '<p class="hdet">正在按住 Alt／Ｙ　·　放開回簡易</p>' : '',
    need = lack
      ? `<p class="need">要 ${path.length} 點才走得到，還差 <em>${path.length - left}</em> 點</p><p class="hh">沒有足夠的天賦點時不能點亮。升級會再給（每級 1 點，逢 10 級 +3）。</p>`
      : '';
  /* 能力值點：未選只用一句；已選列結果、固有加成與改選 */
  if (n.s.attr) {
    const k = have && ATT_PT[S.ptA[id]];
    if (!k) return `${top}<b>能力值 +${n.s.attr}（點的時候選力量、敏捷或智慧）</b>${need}`;
    const [per, w] = ATT_PER[k];
    return `${top}<b>${ATTN[k]} +${n.s.attr}</b><p class="ef">+${per * n.s.attr} ${w}（每 1 點${ATTN[k]} +${per} ${w}）</p><p class="hh">改選：先退回這一點（後面沒有連著的點時；免費），再點一次重選。不能就地換。</p>`;
  }
  /* 珠寶孔：狀態寫在副標；空孔寫掉落句 */
  if (n.jw >= 0) {
    const [j, st] = jwState(n);
    return `${top}<b>${esc(secName(n.sec))}的珠寶孔${n.out ? '（大孔）' : ''}</b><small>${st}</small>${
      j
        ? `<p class="ef">${esc(jwName(j))}：${j.nt.map(k => esc(PTREE.I[k].n)).join('、')}</p><p class="hh">鑲著的珠寶不能丟棄。${JW_NO}丟棄（在倉庫的珠寶分頁，長按確認）不給任何東西。</p>`
        : `<p class="ef">這個孔是空的。</p><p class="hh">${JW_DROP}</p><p class="hh">${JW_NO}空孔可先看，不藏起來。</p>`
    }${need}`;
  }
  if (n.lock) return `<b>${esc(n.n)}</b><small>${esc(n.d || '還沒開放')}</small>`;
  const T = PT_THEME[n.th],
    kind = n.big === 2 ? '基石' : n.gate ? '起點' : n.big ? `大點　·　${T.n}` : '小點',
    L = n.gate ? [n.d] : statLines(n.s),
    ef = `<p class="ef">${treeTerms(L).join('<br>')}</p>`;
  let more;
  if (need) more = need;
  else if (!n.big)
    more =
      '<p class="hh k">滑鼠懸停立即出現。按住 Alt／手把 Ｙ 看詳細（小點通常沒有更多層）。名詞提示要停留 0.4 秒或按 R3，與本窗分開。</p>';
  else if (!det) more = '<p class="hh k">按住 Alt（鍵盤）或 Ｙ（手把）看詳細，放開回簡易。</p>';
  else
    more = `<p class="hh">${have ? '已點亮。' : `沿路點亮到這裡要 ${path.length} 點。`}這一點本身 1 點。</p>${
      n.big === 1 && !n.gate ? `<p class="hh">同一條路的${esc(T.n)}大點共用一張主題圖。</p>` : ''
    }${n.big === 2 ? '' : '<p class="hh">沒有基石代價（基石才會在這一層寫代價）。</p>'}`;
  return `${top}<b>${esc(n.n)}</b><small>${kind}</small>${ef}${more}`;
}
/* 桌機懸浮窗（S/talent-tree.md 08–11、17）：0 秒出現，貼在點旁（小點寬 360、大點寬 400 在右側）；游標移進窗裡不收（名詞要停在窗裡的字上）。
   滑過還沒點的點：沿路要點亮的那幾點加粗（路線高亮，不是推薦路線） */
function treeHov(id) {
  const h = $('thov');
  if (!h) return;
  if (id !== TREE.hov) clearTimeout(TREE.tmT), ($('tterm').hidden = true);
  TREE.hov = id;
  if (!id || !TEL.n.get(id)) {
    h.hidden = true;
    if (!TOUCH.on && (TREE.path || []).length) (TREE.path = []), treeRefresh();
    return;
  }
  const n = PTREE.I[id],
    P = $('ptree').getBoundingClientRect(),
    v = $('tview').getBoundingClientRect(),
    r = ndRect(id);
  h.className = 'thov' + (n.big ? ' w4' : '') + (TREE.alt ? ' det' : '');
  h.innerHTML = treeTip(id, TREE.alt);
  h.hidden = false;
  const w = h.offsetWidth,
    hh = h.offsetHeight,
    x = r.right + 16 + w <= P.right - 12 ? r.right + 16 : r.left - 16 - w;
  h.style.left = clamp(x, P.left + 12, P.right - w - 12) - P.left + 'px';
  h.style.top = clamp(r.top + r.height / 2 - hh / 2, v.top + 8, v.bottom - hh - 8) - P.top + 'px';
  const path = S.pt.includes(id) || n.lock ? [] : treePath(id);
  if (!TOUCH.on && String(path) !== String(TREE.path || [])) (TREE.path = path), treeRefresh();
}
/* 按住 Alt（鍵盤）／Ｙ（手把）＝同一窗看詳細，放開回簡易 */
function treeAlt(on) {
  if (TREE.alt === on) return;
  TREE.alt = on;
  if (TREE.hov) treeHov(TREE.hov);
}
/* 名詞提示（13）：另一層、不取代懸浮窗；停留 0.4 秒或手把 R3。字以 TERMS 為準 */
function treeTerm(el) {
  const t = $('tterm');
  if (!el) return void (t.hidden = true);
  const w = el.dataset.tm,
    P = $('ptree').getBoundingClientRect(),
    v = $('tview').getBoundingClientRect(),
    h = $('thov').getBoundingClientRect();
  t.innerHTML = `<b>${esc(w)}</b><p>${esc(TERMS[w])}</p>`;
  t.hidden = false;
  const tw = t.offsetWidth,
    th = t.offsetHeight;
  t.style.left = clamp(h.left - 40 - tw + 0.5 * tw, P.left + 12, P.right - tw - 12) - P.left + 'px';
  t.style.top = clamp(h.top - th - 8, v.top + 8, v.bottom - th - 8) - P.top + 'px';
}
/* 手把（樹開著才讀）：Ｙ 按住看詳細、R3 名詞提示、Ⓑ 關三選一／珠寶孔面板／樹；三選一時方向鍵選、Ⓐ 確認 */
const TPAD = {};
function treePad() {
  if (!TREE.open) return void (TPAD.on = 0);
  requestAnimationFrame(treePad);
  const g = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
  if (!g) return;
  const b = i => !!(g.buttons[i] && g.buttons[i].pressed),
    tap = i => b(i) && !TPAD[i];
  if (b(3) !== !!TPAD[3]) treeAlt(b(3) ? 1 : 0);
  const A = $('tattr');
  if (tap(11)) {
    const m = !$('thov').hidden && $('thov').querySelector('.tm');
    $('tterm').hidden || !m ? treeTerm(null) : treeTerm(m);
  }
  if (tap(1)) A ? treeAttrClose() : $('tsockp') ? treeSockOpen(null) : treeClose();
  if (A && (tap(12) || tap(13))) {
    const L = [...A.querySelectorAll('.ab, [data-ta="attrx"]')],
      i = L.indexOf(document.activeElement);
    L[(i + (tap(12) ? -1 : 1) + L.length) % L.length].focus();
  }
  if (A && tap(0) && A.contains(document.activeElement)) document.activeElement.click();
  for (const i of [0, 1, 3, 11, 12, 13]) TPAD[i] = b(i);
}
/* 以畫面上一點為中心縮放 */
function treeZoomAt(cx, cy, z, soon) {
  const mx = cx - TREE.vl - TREE.vw / 2 - TREE.x,
    my = cy - TREE.vt - TREE.vh / 2 - TREE.y;
  /* 下限：整棵樹放得進畫面（樹變大，手機直立要到 0.05 左右） */
  const B = treeBox();
  z = clamp(z, Math.min(0.12, 0.95 * Math.min(TREE.vw / B.w, TREE.vh / B.h)), 1.6);
  TREE.x -= mx * (z / TREE.z - 1);
  TREE.y -= my * (z / TREE.z - 1);
  TREE.z = z;
  soon ? treeViewSoon() : treeView();
}
function treeInit() {
  const el = $('ptree'),
    TP = new Map(); /* 按著的手指（兩指＝縮放） */
  const pinchD = () => {
    const [a, b] = [...TP.values()];
    return [Math.hypot(a.x - b.x, a.y - b.y), (a.x + b.x) / 2, (a.y + b.y) / 2];
  };
  el.addEventListener('pointerdown', e => {
    /* 小總覽：按下、拖著都移過去 */
    if (e.target.id === 'tmini') {
      const [x, y] = treeMiniAt(e);
      TREE.mm = 1;
      e.target.setPointerCapture(e.pointerId);
      cancelAnimationFrame(TREE.fly);
      (TREE.x = -x * TREE.z), (TREE.y = -y * TREE.z);
      return treeView();
    }
    if (!e.target.closest('#tview')) return;
    cancelAnimationFrame(TREE.fly);
    TP.set(e.pointerId, { x: e.clientX, y: e.clientY });
    $('tview').setPointerCapture(e.pointerId);
    if (TP.size === 2) {
      TREE.pinch = { d: pinchD()[0], z: TREE.z };
      treeMoving(true);
      TREE.drag = null;
      return hideTip();
    }
    TREE.drag = {
      x: e.clientX,
      y: e.clientY,
      ox: TREE.x,
      oy: TREE.y,
      moved: false,
      n: treeHit(e),
      go: !!e.target.closest('.ascgo'),
      sec: e.target.closest('.secn')
    };
  });
  el.addEventListener('pointermove', e => {
    if (TREE.mm && e.target.id === 'tmini') {
      const [x, y] = treeMiniAt(e);
      (TREE.x = -x * TREE.z), (TREE.y = -y * TREE.z);
      return treeViewSoon();
    }
    if (TP.has(e.pointerId)) TP.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (TREE.pinch && TP.size >= 2) {
      const [d, cx, cy] = pinchD();
      return treeZoomAt(cx, cy, (TREE.pinch.z * d) / TREE.pinch.d, 1);
    }
    const g = TREE.drag;
    if (g) {
      if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 8) (g.moved = true), treeMoving(true);
      if (g.moved) {
        TREE.x = g.ox + e.clientX - g.x;
        TREE.y = g.oy + e.clientY - g.y;
        treeViewSoon();
        return hideTip();
      }
    }
    if (e.pointerType !== 'mouse') return;
    /* 游標在懸浮窗裡：窗不收；停在虛線底線的名詞上 0.4 秒出名詞提示 */
    if (e.target.closest('#thov')) {
      const m = e.target.closest('.tm');
      if (m !== TREE.tmEl) {
        TREE.tmEl = m;
        clearTimeout(TREE.tmT);
        if (m) TREE.tmT = setTimeout(() => treeTerm(m), 400);
        else treeTerm(null);
      }
      return;
    }
    TREE.tmEl = null;
    if (e.target.closest('#tattr, #tsockp, #tterm')) return;
    const n = e.target.closest('#tview') && treeHit(e);
    treeHov(n ? n.dataset.n : null);
  });
  el.addEventListener('pointerleave', () => treeHov(null));
  const up = e => {
    if (TREE.mm) return void (TREE.mm = 0);
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
    /* 中間的昇華入口：打開昇華石碑 */
    if (g.go) return treeClose(), fmenuOpen('asc');
    /* 0.4.10：點一個點永遠只是選它（0.4.7 看全圖時會飛過去放大，每點一下畫面就跳，使用者受不了）；treeHit 找最近的點，小也點得準 */
    if (!g.n) {
      treeAttrClose();
      if (TOUCH.on && TREE.sel) treeSelect(null);
      return;
    }
    const id = g.n.dataset.n;
    if (TOUCH.on) {
      /* 手機：點一下＝選取，說明卡在底部；再點同一個＝卡片上的主要動作（只有一步、不用選能力值時） */
      if (TREE.sel !== id) return treeSelect(id);
      const path = TREE.path || [];
      if (path.length === 1 && !PTREE.I[id].s.attr && ptLeft() > 0) treeGo();
      return;
    }
    TREE.sel = null;
    hideTip();
    treeToggle(id);
    /* 珠寶孔：點了照樣點亮／退回（開孔要 1 點），同時打開孔的面板 */
    if (PTREE.I[id].jw >= 0) treeSockOpen(PTREE.I[id].jw);
    if (TREE.hov) treeHov(TREE.hov);
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
    const ta = a.dataset.ta;
    if (ta === 'close') treeClose();
    if (ta === 'next') treeJump(1);
    if (ta === 'attrx') treeAttrClose();
    if (ta.startsWith('attr:')) treePick(...ta.split(':').slice(1));
    /* 回到我點到的地方（還沒點過＝看全圖） */
    if (ta === 'mine') {
      const m = treeMine();
      m ? treeFly(m.x, m.y, Z_NEAR) : treeFly(0, 0, treeZ0());
    }
    /* 說明卡 */
    if (ta === 'desel') treeSelect(null);
    if (performance.now() - (TREE.cardT || 0) < 350 && (ta.startsWith('go') || ta === 'back')) return;
    if (ta === 'go' || ta.startsWith('go:')) treeGo(ta.slice(3));
    if (ta === 'back') treeToggle(TREE.sel), treeSelect(TREE.sel);
    /* 重置按兩次：一鍵清空幾十點太容易誤觸 */
    if (
      ta === 'reset' &&
      !holdAsk(a, '重置', '退回全部已點的天賦點。洗點免費，不扣靈魂。', {
        t: '重置天賦？',
        more: TREE_RESET2,
        hint: '按住 0.6 秒。條滿才執行；提早放開＝取消。鍵盤在長按鈕上按住 Enter 或空白鍵同長按，Esc 取消。',
        cls: 'w400'
      })
    )
      (S.pt = [...PT_START]), (S.ptA = {}), (TREE.sel = null), (TREE.path = []), treeChanged(), treeCard();
    /* 珠寶孔 */
    const [k, x, y] = ta.split(':');
    if (k === 'sockx') treeSockOpen(null);
    if (k === 'jput' || k === 'jout') {
      jwPut(+x, k === 'jput' ? y : null);
      treeChanged();
      treeSockOpen(+x);
    }
  });
  el.addEventListener('input', e => e.target.id === 'tfind' && treeFind(e.target.value));
  /* 鍵盤：Alt 按住看詳細；三選一開著時 1／2／3 選、Esc 關（先關卡／面板，不關樹） */
  addEventListener(
    'keydown',
    e => {
      if (!TREE.open || HASK) return;
      if (e.key === 'Alt') return e.preventDefault(), treeAlt(1);
      const A = $('tattr');
      if (A && /^[123]$/.test(e.key)) return e.preventDefault(), A.querySelectorAll('.ab')[e.key - 1].click();
      if (e.key === 'Escape' && (A || $('tsockp')))
        e.stopImmediatePropagation(), e.preventDefault(), A ? treeAttrClose() : treeSockOpen(null);
    },
    true
  );
  addEventListener('keyup', e => e.key === 'Alt' && TREE.alt && (e.preventDefault(), treeAlt(0)), true);
  addEventListener('blur', () => treeAlt(0));
  el.addEventListener('keydown', e => {
    if (e.target.id !== 'tfind') return;
    if (e.key === 'Enter') e.preventDefault(), treeJump(e.shiftKey ? -1 : 1);
    if (e.key === 'Escape') (e.target.value = ''), treeFind('');
  });
  addEventListener('resize', () => {
    if (!TREE.open) return;
    treeSize();
    treeView();
  });
}
