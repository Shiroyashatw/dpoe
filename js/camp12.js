/* dungeonPOE · 桌機營地 1280×720（docs/production/specs/camp.md v1.0）：右欄 844,76 420×536，戰鬥照刷。
   五座固定順序（鍛造台、瞭望台、斥候營、長老屋、倉房），卡片一行主利益；點卡＝詳細頁（升級後／目前、前後對照、費用列、升級鈕與 toast）；
   長老屋解鎖一覽小窗；卡片懸停次要句與名詞提示停留 0.4 秒。觸控（直立）照舊走 forge.js 的抽屜。
   詳細頁的那一座記在 CDR.one（Esc 退一層照 hud.js 的 knEsc） */
'use strict';
const C12_B = ['forge', 'watch', 'scout', 'altar', 'store'];
const C12 = { cat: 0, toast: '', tt: 0, flash: '', ft: 0, h: '', last: null };
const c12On = () => !TOUCH.on && !PORT();
/* 營地名詞提示（名詞表「營地名詞提示」） */
const C12_NT = {
  營地: '戰鬥照刷的時候，在這裡升五座設施，開新地點和新功能。',
  forge: '用材料打造裝備的設施。升級後一次打得更多，也會開新的做裝方式和通貨；打造在「鍛造」分頁。',
  watch: '升一級開下一個地點。越深的地點，怪越強，掉的材料階越高。',
  scout: '決定最高可以選到幾★。星級越高，怪越強、掉得越多。',
  altar: '開技能格、輔助孔、光環欄、天賦樹和昇華石碑。',
  store: '延長離線收益時數、提高分解回收，珠寶分頁每級多 4 格；Lv 4 開商會。跟「倉庫」不同'
};
/* 鍛造台每一級：[卡片「解鎖：X」的 X（0＝批量那一行）, 升級後全句, 懸停次要句] */
const C12_FORGE = [
  ['「填」', '解鎖「填」；蛻變石、增幅石開始掉', '蛻變石、增幅石開始掉'],
  [0, '一次打造 3 件', ''],
  ['獵場', '獵場出現（產皮）：閃避系防具、箭袋', '閃避系防具、箭袋'],
  ['富豪石', '富豪石開始掉；打造有機率出稀有', '打造有機率出稀有'],
  [0, '一次打造 5 件；精髓開始掉', '精髓開始掉'],
  ['「淬鍊」', '解鎖「淬鍊」', ''],
  ['崇高石', '崇高石開始掉', ''],
  ['絲地', '絲地出現（產靈絲）：能量護盾系防具、法器；自動分解', '能量護盾系防具、法器；自動分解'],
  [0, '一次打造 10 件', ''],
  ['轉化石、預知石', '轉化石、預知石開始掉', ''],
  ['第二種武器類別', '第二種武器類別（之後每 2 級再開 1 種）', '之後每 2 級再開 1 種'],
  ['「聖化」', '聖化石開始掉、聖化', '聖化石開始掉'],
  ['破裂石', '破裂石開始掉', ''],
  ['自動分解照詞階', '自動分解照詞階、追憶、▲', ''],
  ['「腐化」', '腐化石開始掉、腐化', '腐化石開始掉'],
  [0, '一次打造 20 件；第 5 格技能', '第 5 格技能'],
  ['追憶之墨', '追憶之墨、珠寶開始掉', '珠寶開始掉'],
  ['高階通貨', '高階通貨開始掉', ''],
  ['完美石', '完美石開始掉', ''],
  ['輔助 II', '輔助 II、覺醒、完美通貨', '覺醒、完美通貨']
];
/* 長老屋解鎖一覽（規格「解鎖一覽」表；列內不寫「解鎖」） */
const C12_ALTAR = [
  '第 2 格技能',
  '每一招第 1 個輔助孔',
  '第 3 格技能',
  '天賦樹',
  '每一招第 2 個輔助孔；光環欄',
  '第 4 格技能',
  '昇華石碑，先開兩個昇華',
  '每一招第 3 個輔助孔',
  '每一招第 4 個輔助孔',
  '潮汐',
  '每一招第 5 個輔助孔'
];
/* 把 S.camp[b] 暫時當成 lv 算 f */
function c12At(b, lv, f) {
  const o = S.camp[b];
  S.camp[b] = lv;
  try {
    return f();
  } finally {
    S.camp[b] = o;
  }
}
/* 前後對照要比的數值（同一座在 lv 時） */
const c12Vals = (b, lv) =>
  c12At(b, lv, () => ({
    batch: campN('batch'),
    slots: campN('slots'),
    holes: campN('holes'),
    wts: campN('wts'),
    star: campN('star'),
    off: campN('off'),
    salv: Math.round(salvRate() * 100),
    cap: jwCap(),
    tree: campCan('tree'),
    aura: campCan('aura'),
    asc: campCan('asc'),
    asc3: campCan('asc3'),
    trade: campCan('trade'),
    nodes: Math.min(S.camp.watch || 0, TRUNK.length - 1) + 1
  }));
/* 前後對照每一列：[鍵, 項目, 單位, 差的單位]；沒有單位＝開關（未開 → 開） */
const C12_CMP = {
  forge: [
    ['batch', '一次打造', ' 件', ''],
    ['slots', '技能格', '', ''],
    ['wts', '武器類別', ' 種', '']
  ],
  watch: [['nodes', '已開地點', '', '']],
  scout: [['star', '星級上限', '★', '★']],
  altar: [
    ['slots', '技能格', '', ''],
    ['holes', '輔助孔', '', ''],
    ['tree', '天賦樹'],
    ['aura', '光環欄'],
    ['asc', '昇華石碑'],
    ['asc3', '潮汐']
  ],
  store: [
    ['off', '離線收益', ' 小時', ' 小時'],
    ['salv', '分解回收', '%', '%'],
    ['trade', '商會'],
    ['cap', '珠寶分頁', ' 格', ' 格']
  ]
};
/* 升到 L 級的利益：{ card 卡片一行（HTML）, full 升級後全句, tip 懸停次要句 } */
function c12Ben(b, L) {
  const g = x => `<em>${esc(String(x))}</em>`,
    un = x => ({ card: `解鎖：${g(x)}` });
  if (b === 'forge') {
    const [x, full, tip] = C12_FORGE[L - 1],
      a = c12Vals(b, L - 1).batch,
      c = c12Vals(b, L).batch;
    return { ...(x ? un(x) : { card: `一次打造 ${g(`${a}→${c}`)} 件` }), full, tip };
  }
  if (b === 'watch') {
    if (L <= TRUNK.length - 1) {
      const [q, r] = wXY(TRUNK_K[L]),
        n = wName(S, q, r),
        full = `解鎖新地點 ${n}（怪物 Lv ${wLv(q, r)}）`;
      return { ...un(n), full, tip: full };
    }
    const n = CAMP.watch[L - 1].d.split('：').pop();
    return { ...un(n), full: `解鎖${n}`, tip: '' };
  }
  if (b === 'scout') {
    const a = c12Vals(b, L - 1).star,
      c = c12Vals(b, L).star;
    return { card: `可選 ${g(L > 1 ? `${a}→${c}` : c)}★`, full: `可選 ${c}★`, tip: '' };
  }
  if (b === 'altar') {
    const t = C12_ALTAR[L - 1],
      [x, ...rest] = t.split(/[；，]/),
      X = x.replace('每一招', '');
    return { ...un(X), full: '解鎖' + t, tip: rest.join('；') || (X !== x ? t : '') };
  }
  const v0 = c12Vals(b, L - 1),
    v1 = c12Vals(b, L),
    cap = `珠寶分頁 ${v1.cap} 格`,
    P = [];
  if (v1.off !== v0.off) P.push(`離線收益最多 ${v1.off} 小時`);
  if (v1.salv !== v0.salv) P.push(`分解回收 ${v1.salv}%`);
  if (v1.trade && !v0.trade) P.push('解鎖商會');
  const card =
    v1.off !== v0.off
      ? `離線收益最多 ${g(L > 1 ? `${v0.off}→${v1.off}` : v1.off)} 小時`
      : v1.trade && !v0.trade
        ? `解鎖：${g('商會')}`
        : `分解回收 ${g(`${v0.salv}→${v1.salv}`)}%`;
  return { card, full: [...P, cap].join('；'), tip: cap };
}
/* 前後對照：[項目, 現在, 升級後, 差] 只列有變的 */
function c12Cmp(b, lv) {
  const a = c12Vals(b, lv),
    c = c12Vals(b, lv + 1);
  return C12_CMP[b]
    .filter(([k]) => a[k] !== c[k])
    .map(([k, n, u, du]) => (u == null ? [n, '未開', '開', '開'] : [n, a[k] + u, c[k] + u, `+${c[k] - a[k]}${du}`]));
}
/* 一列費用的圖示 */
const c12Ic = key =>
  key === 'soul'
    ? 'cur_soul'
    : key === 'gold'
      ? 'mat_gold'
      : key.startsWith('cur:')
        ? CUR[key.slice(4)].ic
        : CAMP_IC[matOf(key)[0]] || 'i_ore';
/* 這一列還要幾分鐘（靈魂照本次掛機速度、材料照產生器；算不出來 Infinity） */
function c12Min(key, d) {
  const r = key === 'soul' ? soulRate() : genRates()[key] || 0;
  return r > 0 ? d / r : Infinity;
}
const c12EtaT = m => {
  if (!isFinite(m)) return '';
  const t = Math.max(1, Math.ceil(m)),
    h = Math.floor(t / 60);
  return h ? `約 ${h} 時${t % 60 ? ` ${t % 60} 分` : ''}` : `約 ${t} 分`;
};
/* 最缺的那一列（同一個估計給 toast） */
function c12Worst(c) {
  let w = null;
  for (const [nm, h, wn, key] of costRows(c))
    if (h < wn) {
      const m = c12Min(key, wn - h);
      if (!w || m >= w.m) w = { nm, key, m, d: wn - h };
    }
  return w;
}
const c12Can = b => {
  const n = campNext(b);
  return !!n && costRows(n).every(([, h, w]) => h >= w);
};
const c12Ready = () => C12_B.filter(c12Can).length;
/* 建議那一座（唯一實心「建議」）：推進下一個目標的那座買得起才標；不然買得起裡面最便宜的 */
function c12Sug() {
  const g = c12Goal();
  if (g && c12Can(g.b)) return g.b;
  const ok = C12_B.filter(c12Can),
    sum = c => (c.soul || 0) + (c.wood || 0);
  return ok.length ? ok.reduce((a, b) => (sum(campNext(b)) < sum(campNext(a)) ? b : a)) : null;
}
const c12Goal = () => {
  const g = campGoal();
  return g && C12_B.includes(g.b) ? g : null;
};
/* 功能列 5 格：[鍵, 名字, 鍵帽, 佔位字] */
const C12_FN = [
  ['node', '地點', 'M', '地'],
  ['bag', '倉庫', 'L', '庫'],
  ['asc', '昇華石碑', 'U', '碑'],
  ['box', '山海寶盒', 'J', '盒'],
  ['dummy', '試招場', '', '試']
];
const c12Ph = t => `<i class="c12ph" aria-hidden="true">${t}<small>佔位</small></i>`;
function c12CardHTML(b, sug) {
  const lv = S.camp[b] || 0,
    mx = campMax(b),
    n = campNext(b),
    ok = c12Can(b),
    B = n ? c12Ben(b, n.lv) : null;
  return `<div class="cdc c12c ${ok ? 'can' : ''} ${b === sug ? 'sug' : ''} ${n ? '' : 'max'}" id="c12-${b}">
  <button class="cdb c12b" data-c12="one:${b}" ${B && B.tip ? `data-nt="${esc(B.tip)}" data-ntt="${CAMPN[b]}"` : ''} aria-label="${CAMPN[b]} Lv ${lv}／${mx}">${c12Ph(CAMPN[b][0])}<b>${CAMPN[b]}</b><span class="lv">Lv ${lv}／${mx}</span>
  <span class="c12ben">${B ? B.card : '滿級'}</span>${ok ? '<span class="c12st">可升級</span>' : ''}</button>${b === sug ? '<i class="c12sg">建議</i>' : ''}${
    n
      ? `<button class="stamp c12s ${b === sug ? 'sug' : ok ? 'can' : 'off'}" data-c12="up:${b}" aria-label="升級${CAMPN[b]}">▲</button>`
      : ''
  }<i class="cdp"><i data-cp="${b}"></i></i></div>`;
}
function c12MainHTML() {
  const g = c12Goal(),
    sug = c12Sug();
  return `<div class="c12h"><b data-nt="${C12_NT['營地']}" data-ntt="營地"><span>營地</span></b><span>可升級 ${c12Ready()}</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="c12goal">${g ? `下一個目標：${CAMPN[g.b]} Lv ${g.lv}` : STR_T.goalNone}</div>
  <div class="c12fn">${C12_FN.map(([k, n, key, t]) => {
    const lk = k === 'asc' && !campCan('asc');
    return `<button class="${lk ? 'lock' : ''}" data-c12="fn:${k}" ${lk ? `aria-disabled="true" data-nt="${esc(lockTxt('asc'))}" data-ntt="${n}"` : ''}>${lk ? c12Ph('鎖') : c12Ph(t)}${key ? `<kbd>${key}</kbd>` : ''}<span>${n}</span></button>`;
  }).join('')}</div>
  <div class="cdg c12g">${C12_B.map(b => c12CardHTML(b, sug)).join('')}</div>`;
}
function c12OneHTML(b) {
  const lv = S.camp[b] || 0,
    mx = campMax(b),
    n = campNext(b),
    i = C12_B.indexOf(b),
    B = n ? c12Ben(b, n.lv) : c12Ben(b, lv),
    p = n ? affP(n) : 1,
    rows = n ? costRows(n) : [],
    cmp = n ? c12Cmp(b, lv) : [],
    ok = c12Can(b),
    w = n && !ok && c12Worst(n),
    sec =
      b === 'watch'
        ? `<button class="c12sec" data-c12="fn:node">開地點清單</button>`
        : b === 'altar'
          ? campCan('asc')
            ? `<button class="c12sec" data-c12="fn:asc">昇華石碑</button>`
            : `<button class="c12sec lock" data-c12="fn:asc" aria-disabled="true">昇華石碑（Lv ${campKey('asc')[1]} 開）</button>`
          : b === 'store'
            ? campCan('trade')
              ? `<button class="c12sec" data-c12="trade">商會</button>`
              : `<button class="c12sec lock" data-c12="lk:trade" aria-disabled="true">商會（Lv ${campKey('trade')[1]} 開）</button>`
            : '',
    now = performance.now(),
    toast = now - C12.tt < 2000 ? C12.toast : '';
  return `<div class="c12h one"><button class="x c12bk" data-c12="back" aria-label="返回">←</button><b data-nt="${esc(C12_NT[b])}" data-ntt="${CAMPN[b]}"><span>${CAMPN[b]}</span></b><span>${i + 1}／${C12_B.length}</span><button class="x" data-c12="nav:-1" aria-label="上一座" ${i ? '' : 'disabled'}>‹</button><button class="x" data-c12="nav:1" aria-label="下一座" ${i < C12_B.length - 1 ? '' : 'disabled'}>›</button></div>
  <div class="c12d">
  <div class="c12top">${c12Ph(CAMPN[b][0])}<b>${n ? `Lv ${lv} → Lv ${n.lv}` : `Lv ${lv}（滿級）`}</b>${n ? `<small>最高 ${mx}</small><i class="c12pb"><i style="transform:scaleX(${p.toFixed(3)})"></i></i><small class="c12pp">${Math.floor(p * 100)}%</small>` : ''}</div>
  <div class="c12sub"><b>${n ? '升級後' : '目前'}</b>${b !== 'watch' ? `<button class="c12cat ${C12.cat ? 'on' : ''}" data-c12="cat">解鎖一覽 ›</button>` : ''}</div>
  <p class="c12full">${esc(B.full)}</p>${sec}
  ${cmp.length ? `<div class="c12sub"><b>前後對照</b></div><ul class="c12cmp">${cmp.map(([k, a, c, d]) => `<li><span>${k}</span><span>${a}</span><b>→ ${c}</b><em>▲ ${d}</em></li>`).join('')}</ul>` : ''}
  ${
    rows.length
      ? `<div class="c12sub"><b>費用</b></div><ul class="c12cost">${rows
          .map(([nm, h, wn, key]) => {
            const s = h < wn,
              e = s ? c12EtaT(c12Min(key, wn - h)) : '';
            return `<li class="${s ? 'short' : 'full'} ${s && C12.flash === key && now - C12.ft < 700 ? 'flash' : ''}">${icHTML(c12Ic(key))}<b>${nm}</b><span>${abbr(h, 'own')}／${abbr(wn, 'cost')}</span><i class="c12bar"><i style="width:${Math.min(100, (100 * Math.max(0, h)) / wn).toFixed(1)}%"></i></i><i class="c12sq"></i>${e ? `<small>${e}</small>` : ''}</li>`;
          })
          .join('')}</ul>`
      : ''
  }</div>
  <div class="c12foot"><span class="c12sum ${toast ? 'toast' : ok ? 'ok' : ''}" role="status">${toast || (ok ? '可升級' : '')}</span>${
    n
      ? `<button class="c12up ${ok ? 'ok' : ''}" data-c12="up:${b}">${ok ? '▲ 升級' : `升級<small>差 ${abbr(w.d, 'cost')} ${w.nm}</small>`}</button>`
      : '<button class="c12up" disabled>滿級</button>'
  }</div>${C12.cat ? c12CatHTML(b) : ''}`;
}
/* 解鎖一覽小窗（長老屋照規格表；鍛造台、斥候營、倉房照同一份升級後句） */
function c12CatHTML(b) {
  const lv = S.camp[b] || 0,
    L = Array.from({ length: campMax(b) }, (_, i) => i + 1),
    t = x => (b === 'altar' ? C12_ALTAR[x - 1] : c12Ben(b, x).full.replace(/^解鎖/, ''));
  return `<div class="c12cw" role="dialog" aria-label="${CAMPN[b]}・解鎖一覽"><div class="c12ch"><b>${CAMPN[b]}・解鎖一覽</b><button class="x" data-c12="cat" aria-label="關閉">${ICO.x}</button></div><ul>${L.map(
    x => {
      const s =
        x < lv ? ['done', '已解鎖'] : x === lv ? ['cur', '目前'] : x === lv + 1 ? ['nx', '下一級'] : ['off', '未解鎖'];
      return `<li class="${s[0]}"><span>Lv ${x}</span><b>${esc(t(x))}</b><small>${s[1]}</small></li>`;
    }
  ).join('')}</ul></div>`;
}
const c12HTML = () => (CDR.one && C12_B.includes(CDR.one) ? c12OneHTML(CDR.one) : c12MainHTML());
/* 升級：同一顆 300 ms 內重複不算；買不起＝鈕抖 2 px×2、缺的那列 ⚠ 閃一次、toast 寫同一估計（2,000 ms），不出確認框 */
const C12_TAP = {};
function c12Up(b, el) {
  const t = performance.now();
  if (t - (C12_TAP[b] || -1e9) < 300) return;
  C12_TAP[b] = t;
  const n = campNext(b);
  if (!n) return;
  if (!c12Can(b)) {
    const w = c12Worst(n);
    stampNo(el);
    if (CDR.one) {
      C12.flash = w.key;
      C12.ft = C12.tt = t;
      C12.toast = c12EtaT(w.m) || `差 ${abbr(w.d, 'cost')} ${w.nm}`;
      setTimeout(() => PANEL.camp && campDrawer(), 720);
      setTimeout(() => PANEL.camp && campDrawer(), 2020);
    } else hudWarn(`差 ${abbr(w.d, 'cost')} ${w.nm}`);
    return campDrawer();
  }
  const err = campUp(b);
  if (err) return hudWarn(err);
  CAMPUI.fx[b] = { t };
  campDust(b);
  sfx('lvup');
  buzz(15);
  ST = stats();
  save();
  changed();
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-c12]');
  if (!el) return;
  const [k, v] = el.dataset.c12.split(':');
  c12TipHide();
  if (k === 'up') return c12Up(v, el);
  if (k === 'one') (CDR.one = v), (C12.cat = 0), (C12.last = v);
  else if (k === 'back') (CDR.one = null), (C12.cat = 0);
  else if (k === 'nav') {
    const i = C12_B.indexOf(CDR.one) + +v;
    if (i < 0 || i >= C12_B.length) return;
    CDR.one = C12.last = C12_B[i];
    C12.cat = 0;
  } else if (k === 'cat') C12.cat = C12.cat ? 0 : 1;
  else if (k === 'lk') return hudWarn(lockTxt(v));
  else if (k === 'trade') {
    closePanels();
    CRAFT.tab = 'camp';
    CAMPUI.open = 'store';
    return openPanel('craft');
  } else if (k === 'fn') {
    if (v === 'asc' && !campCan('asc')) return hudWarn(lockTxt('asc'));
    if (v === 'bag') return navGo('bag');
    if (v === 'dummy') return closePanels(), campAsk();
    return fmenuOpen(v);
  }
  campDrawer(1);
  if (k === 'back' && C12.last) knFocus(`#c12-${C12.last} .c12b`);
});
/* 鍵盤：詳細頁 ←／→ 換座（到頭停）、卡片上 X 升級、解鎖一覽開著時 Esc 先關小窗 */
addEventListener(
  'keydown',
  e => {
    if (!PANEL.camp || !c12On() || e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (k === 'escape' && C12.cat) return e.stopImmediatePropagation(), (C12.cat = 0), campDrawer(1);
    if (CDR.one && (k === 'arrowleft' || k === 'arrowright') && !e.target.closest('.c12cw')) {
      e.stopImmediatePropagation();
      e.preventDefault();
      const i = C12_B.indexOf(CDR.one) + (k === 'arrowleft' ? -1 : 1);
      if (i >= 0 && i < C12_B.length) (CDR.one = C12.last = C12_B[i]), (C12.cat = 0), campDrawer(1);
      return;
    }
    const c = e.target.closest && e.target.closest('#pcamp .c12c');
    if (k === 'x' && c) e.stopImmediatePropagation(), c12Up(c.id.slice(4), c.querySelector('.stamp') || c);
  },
  true
);
/* ---------- 懸停提示（停留 0.4 秒；卡片次要句、名詞提示）：營地放在面板左側戰場（右緣 832），倉庫放在面板裡 ---------- */
const C12T = { t: 0, el: null };
function c12TipShow(el) {
  let d = $('c12tip');
  if (!d) (d = document.createElement('div')), (d.id = 'c12tip'), (d.role = 'tooltip'), document.body.appendChild(d);
  const st = el.closest('#pinv');
  d.className = st ? 'in' : el.closest('.c12c') ? 'card' : '';
  d.innerHTML = `<b>${esc(el.dataset.ntt || '')}</b><p>${esc(el.dataset.nt)}</p>${st || !el.closest('.c12c') ? '<small>名詞提示　停留 0.4 秒／手把 R3。與物品比較窗分開。</small>' : ''}`;
  d.hidden = false;
  const r = el.getBoundingClientRect(),
    w = d.offsetWidth;
  /* 倉庫：面板裡 796,118；營地卡片次要句：卡頂 +12；營地名詞提示：觸發字頂 +118（12 倉房 87 → 205） */
  if (st) (d.style.left = '796px'), (d.style.top = '118px');
  else
    (d.style.left = Math.max(8, (el.closest('.c12c') ? 832 : 820) - w) + 'px'),
      (d.style.top = Math.round(r.top + (el.closest('.c12c') ? 12 : 118)) + 'px');
}
function c12TipHide() {
  clearTimeout(C12T.t);
  C12T.el = null;
  const d = $('c12tip');
  if (d) d.hidden = true;
}
document.addEventListener('pointerover', e => {
  const el = e.target.closest && e.target.closest('#pcamp [data-nt], #pinv.st12 [data-nt]');
  const o = C12T.el;
  if (el === o) return;
  /* 補畫換了元素、提示是同一個：不重算 */
  if (el && o && el.dataset.nt === o.dataset.nt && el.dataset.ntt === o.dataset.ntt) return void (C12T.el = el);
  c12TipHide();
  if (!el || TOUCH.on) return;
  C12T.el = el;
  /* 面板每秒補畫會換掉元素：到時間找同一個提示的新元素 */
  C12T.t = setTimeout(() => {
    const c = C12T.el,
      same = x => x && x.dataset.nt === el.dataset.nt && x.dataset.ntt === el.dataset.ntt,
      n =
        c && document.contains(c)
          ? c
          : [...document.querySelectorAll('#pcamp [data-nt], #pinv.st12 [data-nt]')].find(same);
    if (same(c) && n) (C12T.el = n), c12TipShow(n);
  }, 400);
});
/* 手把 R3（鍵盤沒有對應）：焦點在有提示的元件上立刻出 */
const c12R3 = () => {
  const el = document.activeElement && document.activeElement.closest('[data-nt]');
  if (el) c12TipShow(el);
};
/* 鍵帽提示（焦點卡左 320×28）：鍵盤／手把把焦點帶到卡上才出，滑鼠點的不出 */
document.addEventListener('focusin', e => {
  const c = e.target.closest && e.target.closest('#pcamp .c12b'),
    k = $('c12key') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'c12key' }));
  k.hidden = !(c && c.matches(':focus-visible'));
  if (k.hidden) return;
  const r = c.getBoundingClientRect();
  k.innerHTML = '<span>Ⓐ 開詳細頁</span><span>Ⓧ 升級</span><span>Esc 關閉</span>';
  k.style.left = '500px';
  k.style.top = Math.round(r.bottom + 20) + 'px';
});
document.addEventListener('focusout', () => $('c12key') && ($('c12key').hidden = true));
