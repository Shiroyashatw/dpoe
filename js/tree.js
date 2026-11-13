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
/* 看得清楚圖示的縮放（小點 25px）；小於 Z_TAP 時手機點一下只放大過去、不選點（0.4.7） */
const Z_NEAR = 1.25,
  Z_TAP = 0.7;
/* 整棵樹的總覽：起點的 6 個門大約在半徑 560 的圈上，窄螢幕縮到看得到全部的門（視窗還沒有寬度時不能算出負的） */
const treeZ0 = () => clamp((IW / 2 - 30) / 560, 0.12, 0.55);
/* 我點到哪：最後點亮的那個點（只有起點＝還沒開始） */
const treeMine = () => (S.pt.length > PT_START.length ? PTREE.I[S.pt[S.pt.length - 1]] : null);
function treeOpen() {
  if (TREE.open) return treeClose();
  if (proHint('tree', treeOpen)) return;
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
  let html = Object.entries(eC)
    .map(([k, L]) => `<g class="tc e" data-c="${k}" style="display:none">${L.map(x => x[0]).join('')}</g>`)
    .join('');
  /* 圖示：每個點直接一個 <image>（0.3.3：原本用 <use> 引用 <defs>，每個 <use> 都要複製一份，手機打開排版慢一倍）；
     網址 treeIcons 補（artIconURL 快取，同一張圖共用一個字串） */
  for (const n of PTREE.N) {
    const r = n.big === 2 ? 30 : n.gate ? 20 : n.big ? 19 : 10,
      st = have.has(n.id) ? 'on' : treeCan(n.id) ? 'can' : 'off',
      s = r * (n.big ? 1.4 : 1.3),
      img =
        n.ic && typeof ART !== 'undefined' && ART[n.ic]
          ? `<image class="ti" data-ic="${n.ic}" width="1" height="1" transform="translate(${-s / 2} ${-s / 2}) scale(${s})"/>`
          : '';
    cell(
      nC,
      n.x,
      n.y,
      `<g class="nd ${st} b${n.big}${n.lock ? ' lk' : ''}${TREE.sel === n.id ? ' sel' : ''}" data-n="${n.id}" transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})" style="--c:${PT_THEME[n.th].c}"><circle r="${r}"/>${img}</g>`
    );
  }
  html += Object.entries(nC)
    .map(([k, L]) => `<g class="tc" data-c="${k}" style="display:none">${L.join('')}</g>`)
    .join('');
  html += `<circle class="hollow" r="${PT_R0 - 40}"/>`;
  /* 六區（0.2.84）：分區線（兩區中間，從挖空的地方畫到最外圈）、每區外緣的珠寶孔（treeSocks 在 treeRefresh 更新） */
  const R1 = treeR();
  html += PTREE.SECA.map(a => {
    const b = a + Math.PI / 6;
    return `<line class="secl" x1="${(Math.cos(b) * PT_R0).toFixed(0)}" y1="${(Math.sin(b) * PT_R0).toFixed(0)}" x2="${(Math.cos(b) * R1).toFixed(0)}" y2="${(Math.sin(b) * R1).toFixed(0)}"/>`;
  }).join('');
  html += '<g id="tsocks"></g>';
  /* 六區的名字：縮小看全圖時才顯示（#tsvg.far1），點一下放大到那一區 */
  html += PT_START.map((id, i) => {
    /* 寫在起點的門上面；左右兩邊往中間收，直立看全圖時才不會被切掉 */
    const g = PTREE.I[id];
    return `<text class="secn" x="${clamp(g.x, -470, 470).toFixed(0)}" y="${(g.y - 78).toFixed(0)}">${esc(secName(i))}</text>`;
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
    <input id="tfind" type="search" placeholder="搜尋天賦" aria-label="搜尋天賦" autocomplete="off"><span id="tfound"></span>
    <button class="x" aria-label="回到我點到的地方" title="回到我點到的地方" data-ta="mine">${ICO.aim}</button>
    <button class="x" aria-label="關閉" data-ta="close">${ICO.x}</button></div>
  <div id="tview"><svg id="tsvg" viewBox="${B.x} ${B.y} ${B.w} ${B.h}" width="${B.w}" height="${B.h}"><g id="tg">${html}</g></svg></div>
  <canvas id="tmini" width="168" height="168" aria-label="整棵樹的總覽，點一下移過去" hidden></canvas>
  <button class="btn" data-ta="reset" id="treset">重置天賦</button>
  <div id="tcard" class="tcard" hidden></div>
  <p class="thelp"><b>顏色</b> ${Object.keys(PT_FAM)
    .map(k => `<span class="lg" style="--c:${PT_FAM[k]}">${PT_FAMN[k]}</span>`)
    .join(
      ''
    )}${PTREE.N.some(n => n.lock) ? '<span class="lg lk">鎖住＝還沒開放</span>　' : ''}<b>操作</b> 點亮著的點＝點下去，再點＝退回 · 拖曳移動 · 滾輪縮放　金框大圓是基石（有代價）</p>`;
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
    far1 = z < Z_TAP;
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
      cls = `nd ${st} b${n.big}${n.lock ? ' lk' : ''}${TREE.sel === id ? ' sel' : ''}${path.has(id) ? ' pth' : ''}${hits && hits.has(id) ? ' hit' : ''}`;
    if (TEL.k.get(id) !== cls) TEL.k.set(id, cls), el.setAttribute('class', cls);
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
  treeSocks();
  $('tpts').textContent = ptLeft();
  $('tpts').className = ptLeft() > 0 ? 'c-gold' : '';
  $('treset').hidden = S.pt.length <= PT_START.length;
  treeMini();
}
/* 最外圈的半徑（分區線畫到這裡，珠寶孔畫在外面一點） */
let TR1 = 0;
const treeR = () => TR1 || (TR1 = Math.max(...PTREE.N.map(n => Math.hypot(n.x, n.y))) + 60);
const secName = i => PTREE.I[PT_START[i]].n;
/* 六個珠寶孔（0.2.84）：進度 x／40；開了是亮的；有珠寶但點數不夠＝鎖住（紅字） */
function treeSocks() {
  const g = $('tsocks');
  if (!g) return;
  const c = secCount(S),
    R = treeR() + 230;
  g.innerHTML = PTREE.SECA.map((a, i) => {
    const op = c[i] >= JEWEL.need,
      j = (S.jsock || [])[i] && jwOf(S, S.jsock[i]),
      st = j && !op ? 'lock' : op ? (j ? 'on' : 'open') : '',
      txt = j && !op ? '鎖住' : op ? (j ? '已鑲' : '可鑲') : `${c[i]}／${JEWEL.need}`;
    return `<g class="tsock ${st}" data-ta="sock:${i}" transform="translate(${(Math.cos(a) * R).toFixed(0)} ${(Math.sin(a) * R).toFixed(0)})"><circle r="170"/><text class="n" y="30">${txt}</text><text class="l" y="-70">${esc(secName(i))}</text><text class="l" y="115">珠寶孔</text></g>`;
  }).join('');
}
/* 珠寶孔的選單：這一孔的狀態、裡面的珠寶（拔下）、收藏裡的珠寶（鑲上、拆） */
function treeSockOpen(i) {
  treeAttrClose();
  $('tsockp') && $('tsockp').remove();
  if (i == null) return;
  const c = secCount(S)[i],
    op = c >= JEWEL.need,
    cur = (S.jsock || [])[i],
    nt = id => {
      const n = PTREE.I[id];
      return `<li><b>${esc(n.n)}</b>${S.pt.includes(id) ? ' <span class="c-dim">已點過，不重複計算</span>' : ''}<small>${statLines(n.s).map(esc).join('、')}</small></li>`;
    },
    row = j => {
      const at = (S.jsock || []).indexOf(j.id);
      return `<div class="jw ${j.id === cur ? 'on' : ''}"><div><b>${esc(jwName(j))}</b>${at >= 0 && at !== i ? `<span class="c-dim">（在${esc(secName(at))}）</span>` : ''}<ul>${j.nt.map(nt).join('')}</ul></div><span class="jw-b">${j.id === cur ? `<button class="btn" data-ta="jout:${i}">拔下</button>` : `<button class="btn pri" data-ta="jput:${i}:${j.id}">鑲上</button>`}${at < 0 ? `<button class="btn" data-ta="jx:${j.id}">拆</button>` : ''}</span></div>`;
    },
    L = S.jewels || [],
    d = document.createElement('div');
  d.id = 'tsockp';
  d.dataset.i = i;
  d.className = 'tsockp';
  d.innerHTML = `<div class="ph"><b>${esc(secName(i))}的珠寶孔</b><span class="${op ? 'c-good' : ''}">這一區 ${c}／${JEWEL.need} 點</span><button class="x" aria-label="關閉" data-ta="sockx">${ICO.x}</button></div>
    ${cur && !op ? `<p class="c-bad">珠寶未生效：這一區再點 ${JEWEL.need - c} 點恢復</p>` : op ? '' : `<p class="fhint">這一區再點 ${JEWEL.need - c} 點才開孔；可以先鑲上，開孔後生效</p>`}
    ${L.length ? L.map(row).join('') : '<p class="fhint">亡靈珠寶由山海寶盒的蚩尤、涿鹿兵主掉落</p>'}
    <p class="fhint">珠寶的大點等同點亮天賦；已點過或重複的大點只算一次。拆掉換 200 靈魂。</p>`;
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
  /* 外緣留給珠寶孔（0.2.84） */
  const R = treeR() + 420;
  (x0 = Math.min(x0, -R)), (y0 = Math.min(y0, -R)), (x1 = Math.max(x1, R)), (y1 = Math.max(y1, R));
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
  TREE.hs = q ? new Set(TREE.hits) : null;
  $('tsvg').classList.toggle('finding', !!q);
  treeRefresh();
  $('tfound').textContent = q ? `${TREE.hits.length} 個` : '';
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
  $('tfound').textContent = `${TREE.hi + 1} / ${TREE.hits.length}`;
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
  const show = TREE.z >= 0.45;
  if (c.hidden === show) c.hidden = !show;
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
    g.fillStyle = 'rgba(170,160,130,0.45)';
    for (const n of PTREE.N) if (!have.has(n.id)) g.fillRect(ox + n.x * k - 0.5, oy + n.y * k - 0.5, 1.4, 1.4);
    g.fillStyle = '#ffd166';
    for (const n of PTREE.N) if (have.has(n.id)) g.fillRect(ox + n.x * k - 1.5, oy + n.y * k - 1.5, 3.5, 3.5);
  }
  const g = c.getContext('2d'),
    z = TREE.z,
    w = (TREE.vw || 0) / z,
    h = (TREE.vh || 0) / z;
  g.clearRect(0, 0, TMINI, TMINI);
  g.drawImage(TREE.mini, 0, 0);
  g.strokeStyle = '#fff';
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
  } else if (treeCan(id)) {
    /* 過路點：先選要加哪一項能力值（treePick 才真的點下去） */
    if (!asc && PTREE.I[id].s.attr) return treeAttrAsk(id);
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
/* 過路點的選擇框（0.2.42）：+5 力量／敏捷／智慧，點按鈕才點下去；再點別處或按取消關掉。
   0.2.45：框貼在被點的那個點旁邊（以前固定在畫面最下面，離點很遠），按鈕照系色（紅力、綠敏、藍智） */
function treeAttrAsk(id) {
  treeAttrClose();
  const d = document.createElement('div');
  d.id = 'tattr';
  d.className = 'tattr';
  d.innerHTML = `<span>+${PT_ATTR} 能力值：</span>${Object.entries(ATT_PT)
    .map(
      ([c, k]) =>
        `<button class="btn pri" style="--c:${PT_FAM[ATT_FAM[k]]}" data-ta="attr:${id}:${c}">${ATTN[k]}（${ATT_HINT[k]}）</button>`
    )
    .join('')}<button class="btn" data-ta="attrx">取消</button>`;
  const P = $('ptree');
  P.appendChild(d);
  /* 放在點的下面，放不下就放上面；左右不超出畫面 */
  const r = TEL.n.get(id).getBoundingClientRect(),
    p = P.getBoundingClientRect(),
    w = d.offsetWidth,
    h = d.offsetHeight,
    below = r.bottom + 10 + h <= p.bottom - 8;
  d.style.left = clamp(r.left + r.width / 2 - w / 2, p.left + 8, p.right - w - 8) - p.left + 'px';
  d.style.top = (below ? r.bottom + 10 : Math.max(p.top + 8, r.top - 10 - h)) - p.top + 'px';
}
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
    for (const n of PTREE.N) {
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
        const d = Math.hypot(n.x - x, n.y - y) - (n.big === 2 ? 30 : n.big ? 19 : 10);
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
  if (!ATT_PT[c] || S.pt.includes(id) || !treeCan(id)) return;
  S.pt.push(id);
  S.ptA[id] = c;
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
    : n.lock
      ? '預留（鎖住）'
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
        ? esc(n.d).split('\n')
        : n.s.attr
          ? [
              S.ptA[id]
                ? `${ATTN[ATT_PT[S.ptA[id]]]} +${n.s.attr}`
                : `能力值 +${n.s.attr}（點的時候選力量、敏捷或智慧）`
            ]
          : statLines(n.s);
  const sec = n.asc || n.gate ? '' : ` · 算在${secName(n.sec)}`;
  return `<b class="${n.big === 2 || n.asc ? 'c-gold' : ''}">${esc(n.n)}</b><small>${kind}${sec}</small>${lines.length ? `<p class="aff">${lines.join('<br>')}</p>` : ''}`;
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
    const n = treeHit(e);
    if (n) {
      const r = n.getBoundingClientRect();
      showTip(treeTip(n.dataset.n), r);
    } else hideTip();
  });
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
    /* 看全圖時（點太小、認不出圖示）：點一下只放大到那裡，不選點（0.4.7；以前 6px 也點得下去，很容易點錯） */
    if (TOUCH.on && TREE.z < Z_TAP) {
      const [x, y] = g.n ? [PTREE.I[g.n.dataset.n].x, PTREE.I[g.n.dataset.n].y] : treeAt(e);
      return treeFly(x, y, Z_NEAR);
    }
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
    if (ta === 'attrx') treeAttrClose();
    if (ta.startsWith('attr:')) treePick(...ta.split(':').slice(1));
    /* 回到我點到的地方（還沒點過＝看全圖） */
    if (ta === 'mine') {
      const m = treeMine();
      m ? treeFly(m.x, m.y, Z_NEAR) : treeFly(0, 0, treeZ0());
    }
    /* 說明卡 */
    if (ta === 'desel') treeSelect(null);
    if (ta === 'go' || ta.startsWith('go:')) treeGo(ta.slice(3));
    if (ta === 'back') treeToggle(TREE.sel), treeSelect(TREE.sel);
    /* 重置按兩次：一鍵清空幾十點太容易誤觸 */
    if (ta === 'reset' && confirm2(a, '再按一次：退回全部天賦點'))
      (S.pt = [...PT_START]), (S.ptA = {}), (TREE.sel = null), (TREE.path = []), treeChanged(), treeCard();
    /* 珠寶孔（0.2.84） */
    const [k, x, y] = ta.split(':');
    if (k === 'sock') treeSockOpen(+x);
    if (k === 'sockx') treeSockOpen(null);
    if (k === 'jput' || k === 'jout') {
      jwPut(+x, k === 'jput' ? y : null);
      treeChanged();
      treeSockOpen(+x);
    }
    if (k === 'jx' && confirm2(a, '再按一次：拆成 200 靈魂')) {
      const w = jwSalvage(x);
      if (w) return hudWarn(w);
      save();
      treeSockOpen(+$('tsockp').dataset.i);
    }
  });
  el.addEventListener('input', e => e.target.id === 'tfind' && treeFind(e.target.value));
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
