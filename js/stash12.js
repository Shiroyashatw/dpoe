/* dungeonPOE · 桌機倉庫 1280×720（docs/production/specs/stash.md v1.0）：右欄 #pinv.st12 788,76 476×486，子元件座標＝規格座標 −(788,76)。
   內分頁 裝備｜珠寶｜通貨｜特殊物品；第一層 全部／武器／防具／飾品＋搜尋；第二層在右欄 368,40 100×438（緊湊列 24／2／12）；
   格子 64×64、5 欄、間距 8、x0 16（裝備 y0 112、有警示 136；珠寶 y0 100）；比較浮窗（懸停立即、按住 Alt 詳細）；整批分解（長按確認，卡在戰場上）；
   珠寶不顯示稀有度、只能丟棄；追逐物品、首領碎片、通貨只看數量。直立（觸控）照舊走 hud.js 的 invHTML */
'use strict';
const ST12 = {
  tab: 'eq',
  f: 'all',
  k: '',
  jk: '',
  rar: [1, 1, 1, 1],
  q: '',
  o: 'new',
  up: 0,
  bat: null,
  hov: null,
  alt: 0,
  ask: null,
  sp: '',
  wy: null,
  wyIt: null,
  col: 0
};
const st12On = () => !TOUCH.on && !PORT() && NAV.view === 'bag' && !NAV.pick && !CHSW;
const ST_O = [
  ['new', '新到舊'],
  ['T', 'T'],
  ['r', '稀有度']
];
const ST_F = [
  ['all', '全部'],
  ['weapon', '武器'],
  ['armor', '防具'],
  ['acc', '飾品']
];
/* 第二層（右欄）：大類 → [全部X, …部位／武器類別] */
const ST_SUB = {
  weapon: ['全部武器', Object.keys(WTN)],
  armor: ['全部防具', ['helm', 'chest', 'gloves', 'boots', 'shield', 'focus', 'quiver']],
  acc: ['全部飾品', ['ring', 'amulet', 'belt']]
};
const ST_JW = ['詞綴珠寶', '規則珠寶', '亡靈珠寶', '亡靈珠寶・雙魂', '亡靈珠寶・三魂'];
const ST_RAR = ['普通', '魔法', '稀有', '傳奇'];
/* 名詞提示（名詞表） */
const ST_NT = {
  倉庫: '放裝備和珠寶，也能查看通貨、追逐物品和首領碎片',
  通貨: '改裝備或技能用的消耗品。這裡只看數量，跟鍛造台同一份'
};
const stSubN = k => WTN[k] || KINDS[k].n;
/* 珠寶的種類名（亡靈珠寶照大點數；規則珠寶「・範圍型」等之後由資料給） */
const stJwKind = j => jwName(j);
/* 物品搜尋：名字或任何一條詞綴的字 */
const stHit = (it, q) =>
  !q || itemName(it).includes(q) || (it.a || []).some(a => affText(a).includes(q)) || baseOf(it).n.includes(q);
/* hit＝只留搜尋命中的（整批快速選用）；格子照常全列、命中加框其餘變淡（ST-11） */
function stList(hit) {
  const L = S.inv.items.filter(
    it =>
      (ST12.f === 'all' || (!it.charm && bagGrp(it) === ST12.f)) &&
      (!ST12.k || bagSub(it) === ST12.k) &&
      (ST12.f !== 'weapon' || ST12.rar[Math.min(3, it.r || 0)]) &&
      (!hit || stHit(it, ST12.q.trim()))
  );
  const o = ST12.o,
    up = it => (ST12.up && itemUp(it) ? 0 : 1);
  return L.sort(
    (a, b) => up(a) - up(b) || (o === 'T' ? bagT(a) - bagT(b) : o === 'r' ? (b.r || 0) - (a.r || 0) : 0) || b.id - a.id
  );
}
/* 這件比的是哪一格（判定 ▲） */
const stSlot = it => {
  const k = !it.charm && kindOf(it),
    e = k && EQS.find(q => eqTakes(q, k) && eqOpen(S, q.k));
  return e ? e.k : null;
};
const stCell = (it, i, extra = '') => {
  const k = stSlot(it),
    j = k ? chJudge(it, k) : '',
    lk = ST12.bat && it.lock,
    ck = ST12.bat && ST12.bat.has(it.id),
    q = !ST12.bat && ST12.q.trim(),
    h = q && stHit(it, q);
  return chCell(
    it,
    `style="left:${(i % 5) * 72}px;top:${Math.floor(i / 5) * 72}px" data-st="it:${it.id}" tabindex="0" role="button"${extra}`,
    j === '▲' || j === '▲▲' ? j : ''
  )
    .replace(
      'class="cq',
      `class="cq ${it.chase ? 'chf' : ''} ${lk || (q && !h) ? 'dim' : ''} ${h ? 'hit' : ''} ${ck ? 'ck' : ''}`
    )
    .replace(
      /<\/div>$/,
      `${ST12.bat && !lk ? `<i class="stck">${ck ? '✓' : ''}</i>` : ''}${PANEL.craft && CRAFT.tab !== 'make' && CRAFT.sel && CRAFT.sel.id === it.id ? '<i class="stfb">鍛造台</i>' : ''}</div>`
    );
};
/* ---------- 標題列與內分頁 ---------- */
function stHeadHTML() {
  if (ST12.bat)
    return `<b class="stt wide">整批分解・已選 ${ST12.bat.size} 件</b><button class="stx" data-st="bat:off" aria-label="關閉">${ICO.x}</button>`;
  const n = S.inv.items.length,
    jn = (S.jewels || []).length,
    cnt =
      ST12.tab === 'eq'
        ? `<span class="stn ${n >= INV_CAP * 0.9 ? 'bad' : ''}">${fullN(n)}／${fullN(INV_CAP)}</span>`
        : ST12.tab === 'jw'
          ? `<span class="stn ${jn > jwCap() ? 'bad' : ''}">${jn}／${jwCap()}</span>`
          : ST12.tab === 'sp' && ST12.sp
            ? `<span class="stn">追逐物品 ${wyGot()}／4</span>`
            : '';
  return `<b class="stt" data-nt="${ST_NT['倉庫']}" data-ntt="倉庫"><span>倉庫</span></b>${cnt}${
    ST12.tab === 'eq'
      ? `<button class="stb sort" data-st="sort">${ST_O.find(o => o[0] === ST12.o)[1]} ▾</button><button class="stb upf ${ST12.up ? 'on' : ''}" data-st="up" aria-pressed="${!!ST12.up}">▲ 優先</button><button class="stb bat" data-st="bat:on">整批分解</button>`
      : ''
  }<button class="stx" data-a="close" aria-label="關閉">${ICO.x}</button>
  <div class="sttab" role="tablist">${[
    ['eq', '裝備'],
    ['jw', '珠寶'],
    ['cur', '通貨'],
    ['sp', '特殊物品']
  ]
    .map(
      ([k, t]) =>
        `<button class="${ST12.tab === k ? 'on' : ''} ${k}" role="tab" aria-selected="${ST12.tab === k}" data-st="tab:${k}" ${ST_NT[t] ? `data-nt="${ST_NT[t]}" data-ntt="${t}"` : ''}>${t}</button>`
    )
    .join('')}</div>`;
}
/* ---------- 右欄第二層（緊湊列） ---------- */
function stColHTML() {
  let name, rows, cur;
  if (ST12.tab === 'jw') (name = '珠寶'), (rows = [['', '全部珠寶'], ...ST_JW.map(k => [k, k])]), (cur = ST12.jk);
  else if (ST12.tab === 'eq' && ST_SUB[ST12.f] && !ST12.bat) {
    const [all, L] = ST_SUB[ST12.f];
    name = ST_F.find(f => f[0] === ST12.f)[1];
    rows = [['', all], ...L.map(k => [k, stSubN(k)])];
    cur = ST12.k;
  } else return '';
  const its =
      ST12.f === 'weapon' && ST12.tab === 'eq' ? S.inv.items.filter(it => !it.charm && bagGrp(it) === 'weapon') : [],
    lv = its.map(it => it.L),
    foot =
      ST12.f === 'weapon' && ST12.tab === 'eq'
        ? `<div class="stcf"><div>${ST_RAR.map((t, i) => `<button class="r${i} ${ST12.rar[i] ? 'on' : ''}" data-st="rar:${i}" aria-pressed="${!!ST12.rar[i]}">${t}</button>`).join('')}</div><small>物品等級 ${lv.length ? `${Math.min(...lv)}–${Math.max(...lv)}` : '—'}</small></div>`
        : '';
  return `<div class="stcol" role="listbox" aria-label="${name}"><div class="stch"><b>${name}</b><small>方向右 進入</small></div>${rows
    .map(
      ([k, t], i) =>
        `<button class="sub ${cur === k ? 'on' : ''}" data-st="${ST12.tab === 'jw' ? 'jk' : 'k'}:${k}" data-ci="${i}" role="option" aria-selected="${cur === k}">${t}</button>`
    )
    .join('')}${foot}</div>`;
}
/* ---------- 裝備頁 ---------- */
function stEqHTML() {
  const n = S.inv.items.length,
    L = stList(),
    nh = ST12.q.trim() ? L.filter(it => stHit(it, ST12.q.trim())).length : L.length,
    filt = ST12.f !== 'all' || ST12.q.trim(),
    warn =
      n >= INV_CAP
        ? '<p class="stw">滿了：新打造的直接分解</p>'
        : n >= INV_CAP * 0.9
          ? `<p class="stw">快滿了：還能放 ${INV_CAP - n} 件，滿了新打造的直接分解</p>`
          : '';
  const top = ST12.bat
    ? `<div class="stqs"><small>快速選</small>${[0, 1, 2].map(r => `<button data-st="qs:${r}" class="${stQsOn(r) ? 'on' : ''}">${ST_RAR[r]}</button>`).join('')}<button data-st="qs:x">全不選</button></div>`
    : `<div class="stf" role="tablist">${ST_F.map(([k, t]) => `<button class="${ST12.f === k ? 'on' : ''}" role="tab" aria-selected="${ST12.f === k}" data-st="f:${k}">${t}</button>`).join('')}</div><input class="sts ${filt ? 'n' : ''}" type="search" placeholder="名稱或詞綴" value="${esc(ST12.q)}" aria-label="名稱或詞綴">${filt ? `<span class="stcnt">${nh} 件</span>` : ''}`;
  const body = !n
    ? `<div class="ste"><p>還沒有裝備</p><button class="stact" data-st="mk">去鍛造打一件</button></div>`
    : !nh
      ? `<div class="ste"><p>沒有符合的裝備</p></div>`
      : `<div class="c12 stg ${warn ? 'wn' : ''}" data-sg>${L.map((it, i) => stCell(it, i)).join('')}</div><small class="stmore"></small>`;
  return `${top}${warn}${body}${
    ST12.bat
      ? `<button class="stcan" data-st="bat:off">取消</button><button class="stgo" data-st="bat:go" ${ST12.bat.size ? '' : 'disabled'}>分解 ${ST12.bat.size} 件</button>`
      : ''
  }`;
}
const stQsOn = r => {
  const L = stList(1).filter(it => !it.lock && (it.r || 0) === r);
  return !!ST12.bat && L.length > 0 && L.every(it => ST12.bat.has(it.id));
};
/* ---------- 比較浮窗（07 簡易、08 詳細） ---------- */
function stCmpHTML() {
  const it = ST12.hov != null && !ST12.bat && ST12.tab === 'eq' && S.inv.items.find(x => x.id === ST12.hov);
  if (!it) return '';
  const k = stSlot(it),
    cur = k && S.eq[k],
    e = k && EQS.find(q => q.k === k),
    det = ST12.alt,
    j = k ? chJudge(it, k) : '',
    rows = x =>
      x
        ? [
            ...chBase(x).map(
              ([n, v, o]) => `<li><span>${n}</span><b>${v}${det && o != null ? `<small> (${o})</small>` : ''}</b></li>`
            ),
            ...(x.a || []).map(
              a => `<li><span>${esc(affText(a))}</span>${det ? `<b class="tr">T${a.T}</b>` : ''}</li>`
            ),
            /* 傳奇的特色詞（SU-01），接在詞綴後面 */
            ...(x.ux || []).map(u => `<li class="uq"><span>${esc(uxText(u))}</span></li>`),
            /* ST-28：詳細版補前綴／後綴空位（普通、傳奇沒有空位＝0） */
            ...(det
              ? [1, 0].map(p => {
                  const c = x.r === 1 || x.r === 2 ? sideCap(x) : 0,
                    n = (x.a || []).filter(a => !!AFF[a.k].p === !!p).length;
                  return `<li><span>${p ? '前綴' : '後綴'}空位</span><b>${Math.max(0, c - n)}</b></li>`;
                })
              : [])
          ].join('')
        : '<li><span class="c-dim">空著</span></li>';
  return `<div class="stp ${det ? 'det' : ''}" role="dialog" aria-label="比較"><b class="rc${it.r}">${esc(itemName(it))}</b>
  <small class="sub">${ST_RAR[Math.min(3, it.r || 0)]}　${e ? e.n : KINDS[kindOf(it)] ? KINDS[kindOf(it)].n : ''}　物品等級 ${it.L}　品質 +${Math.round((it.q || 0) * 100)}%</small>
  <div class="stpc"><div><small>身上${cur ? `・${esc(itemName(cur))}` : ''}</small><ul>${rows(cur)}</ul></div><div><small>這件${j ? `（${j}）` : ''}</small><ul>${rows(it)}</ul></div></div>
  <div class="stpa"><button class="del" data-st="salv:${it.id}">分解</button><button data-st="lock:${it.id}">${it.lock ? '解鎖' : '鎖定'}</button><button class="eq" data-st="eq:${it.id}">裝備<small>${cur ? `換下 ${esc(itemName(cur))}，放進倉庫` : ''}</small></button></div>
  <p class="stph">${det ? '放開 <kbd>Alt</kbd>／手把 Ｙ 回到簡易。' : '懸停立即出現。按住 <kbd>Alt</kbd>／手把 Ｙ 看詳細。名詞提示要停留 0.4 秒或按 R3，與本窗分開。'}</p></div>`;
}
/* ---------- 珠寶頁 ---------- */
function stJwHTML() {
  const J = S.jewels || [],
    cap = jwCap(),
    L = J.filter(j => !ST12.jk || stJwKind(j) === ST12.jk),
    over = J.length > cap,
    sock = new Set(S.jsock || []),
    cells = L.map((j, i) => {
      const nm = stJwKind(j).split('・');
      return `<div class="cq jw" style="left:${(i % 5) * 72}px;top:${Math.floor(i / 5) * 72}px" data-st="jw:${j.id}" tabindex="0" role="button" aria-label="${esc(stJwKind(j))}"><i class="jn">${nm.map((s, i) => (i ? '・' + s : s)).join('<br>')}</i><i class="jg">◆<small>佔位</small></i>${sock.has(j.id) ? '<i class="js">已鑲</i>' : ''}</div>`;
    }),
    empty = ST12.jk ? 0 : Math.max(0, cap - L.length);
  for (let i = 0; i < empty; i++) {
    const x = L.length + i;
    cells.push(`<div class="cq jw emp" style="left:${(x % 5) * 72}px;top:${Math.floor(x / 5) * 72}px"></div>`);
  }
  return `${over ? '<p class="stw jw">已超過上限，請清理。機率掉落暫停；王保底照樣收。</p>' : '<p class="stnote">格數另計，鑲著的也算。不能分解，只能丟棄</p>'}
  ${
    J.length
      ? `<div class="c12 stg jw" data-sg>${cells.join('')}</div>`
      : '<div class="ste jw"><p>還沒有珠寶</p><small>珠寶打鬼門關、心魔幻境、凶地、陰兵借道才會掉。不保證第一顆。</small></div>'
  }
  <small class="stjf">倉房 Lv ${S.camp.store || 0}　上限 ${cap}　王保底另留 5<span class="stmore jw"></span></small>`;
}
/* ---------- 通貨頁、特殊物品頁 ---------- */
/* ph＝借用圖（stash.md「圖示與佔位」）：角標「佔位」（ST-35） */
const stBox = (ic, n, nm, a = '', ph) =>
  `<div class="stbx ${n ? '' : 'z'}" ${a} title="${esc(nm)}" aria-label="${esc(nm)} ${n}">${icHTML(ic)}${ph ? '<small class="ph">佔位</small>' : ''}<em>${abbr(n, 'own')}</em></div>`;
const stSec = (t, h) => (h ? `<section><h4>${t}</h4><div>${h}</div></section>` : '');
const ST_CUR_LINE = {
  鬼門關: ['calam', 'pcalam', 'pen'],
  心魔幻境: [...Object.keys(CUR).filter(k => k.startsWith('om_')), 'v2', 'v3'],
  凶地: ['heart'],
  裂口: ['conv']
};
/* 借用圖的通貨（data.js 註「圖示先借現有的」＋賽制區借怪物圖）；裂口的轉化石是專用圖 */
const ST_CUR_PH = new Set([
  'frac',
  'perf',
  'ink',
  ...Object.entries(ST_CUR_LINE).flatMap(([t, L]) => (t === '裂口' ? [] : L))
]);
function stCurHTML() {
  const M = MAT(),
    line = Object.values(ST_CUR_LINE).flat(),
    box = k => stBox(CUR[k].ic, M[k] || 0, CUR[k].n, '', ST_CUR_PH.has(k));
  return `<p class="stnote">數量跟鍛造台同一份，到鍛造台或技能分頁使用</p><div class="stsec">${stSec(
    '打造通貨',
    Object.keys(CUR)
      .filter(k => !line.includes(k))
      .map(box)
      .join('')
  )}${Object.entries(ST_CUR_LINE)
    .map(([t, L]) => stSec(t, L.map(box).join('')))
    .join('')}</div>`;
}
const ST_FRAG = {
  鬼門關: ['ox', 'horse', 'black', 'white', 'book'],
  心魔幻境: SIN.emo,
  凶地: [...XIONG, 'eye'],
  陰兵借道: [...ARMY.gen, 'fu'],
  裂口: ['blood', 'mist']
};
const wyIn = k => EQS.filter(e => S.eq[e.k] && S.eq[e.k].wy === k).length;
function stSpHTML() {
  const F = S.frags || {};
  if (ST12.sp === 'apply') return stApplyHTML();
  if (ST12.sp)
    return `<div class="stwy">${CHASE_POOL.trunk
      .map(k => {
        const n = F[k] || 0,
          got = chaseOf().got[k];
        const f = WY_FX[k];
        return `<button class="stwc ${got ? '' : 'no'}" data-st="wy:${k}">${icHTML(k)}<b>${esc(chaseName(k))}</b><small>${got ? `擁有 ${n}・身上 ${wyIn(k)}` : '還沒拿到'}</small><p>${esc(statText(f.k, f.v))}</p></button>`;
      })
      .join(
        ''
      )}</div><div class="stpity"><small>追逐保底 ${chasePct()}%</small><i><i style="transform:scaleX(${chasePct() / 100})"></i></i><p>保底滿 100% 就會掉一件追逐物品</p></div>`;
  return `<p class="stnote">首領碎片數量跟山海寶盒同一份，到山海寶盒開王場；血霧之印用來進裂口</p><div class="stsec">${stSec(
    '追逐物品',
    CHASE_POOL.trunk.map(k => stBox(k, F[k] || 0, chaseName(k), `data-st="sp:wy" role="button" tabindex="0"`)).join('')
  )}${Object.entries(ST_FRAG)
    .map(([t, L]) =>
      stSec(
        t,
        L.filter(k => FRAGS[k])
          .map(k => stBox(FRAGS[k].ic, F[k] || 0, FRAGS[k].n, '', 1))
          .join('')
      )
    )
    .join('')}</div>`;
}
/* 17 套到裝備：只列出能套的（身上的魔法或稀有裝備） */
function stApplyHTML() {
  const k = ST12.wy,
    L = EQS.filter(e => S.eq[e.k] && (S.eq[e.k].r === 1 || S.eq[e.k].r === 2)).map(e => S.eq[e.k]);
  return `<p class="stq"><b>把${esc(chaseName(k))}套到哪一件？</b><small>只列出能套的裝備。已有印的要確認，舊印不會退回。</small></p><ul class="stal">${
    L.map(
      it =>
        `<li><button class="${ST12.wyIt === it.id ? 'on' : ''}" data-st="wyit:${it.id}">${icHTML(itemIc(it))}<b>${esc(itemName(it))}</b><small>${it.wy ? `已有${esc(chaseName(it.wy))}` : '可套'}</small></button></li>`
    ).join('') || `<li class="c-dim">${esc(STR_T.wyNoEq)}</li>`
  }</ul><button class="stcan" data-st="sp:wy">返回</button><button class="stgo act" data-st="wyok" ${ST12.wyIt != null ? '' : 'disabled'}>套到裝備</button>`;
}
/* ---------- 確認卡（戰場上）：整批分解、丟棄珠寶；長按 0.6 秒 ---------- */
function stAskHTML() {
  const a = ST12.ask;
  if (!a) return '';
  if (a.t === 'bat') {
    const L = S.inv.items.filter(it => ST12.bat.has(it.id)),
      v = salvZero();
    for (const it of L) salvAdd(v, salvValue(it));
    const r2 = L.filter(it => it.r >= 2).length;
    return `<div class="stscr"></div><div class="stask" role="alertdialog" aria-label="分解 ${L.length} 件？"><b>分解 ${L.length} 件？</b><p>${r2 ? `其中 ◆ ${r2} 件。` : ''}會得到 ${esc(salvText(v))}。分解了就拿不回來。</p><small>不能復原</small><div><button class="hold" data-hold="bat">長按分解<i></i></button><button class="stact" data-st="ask:x">取消</button></div></div>`;
  }
  const j = jwOf(S, a.id);
  return `<div class="stscr"></div><div class="stask" role="alertdialog" aria-label="丟棄這顆珠寶？"><b>丟棄這顆珠寶？</b><p>丟棄「${esc(j ? stJwKind(j) : '')}」？不會得到材料或靈魂。丟了就拿不回來。</p><small>不能復原</small><div><button class="hold" data-hold="jw">長按丟棄<i></i></button><button class="stact" data-st="ask:x">取消</button></div></div>`;
}
function stHTML() {
  const t = ST12.tab;
  return `${stHeadHTML()}${t === 'eq' ? stEqHTML() : t === 'jw' ? stJwHTML() : t === 'cur' ? stCurHTML() : stSpHTML()}${stColHTML()}${stCmpHTML()}${stAskHTML()}`;
}
/* 重畫：保住搜尋框的焦點與游標、格子的捲動、有焦點的那一格 */
function stRender() {
  const p = $('pinv'),
    a = document.activeElement,
    inS = a && a.classList && a.classList.contains('sts'),
    sel = inS && [a.selectionStart, a.selectionEnd],
    g = p.querySelector('[data-sg]'),
    top = g ? g.scrollTop : 0,
    f = p.contains(a) && a.dataset && a.dataset.st;
  p.classList.toggle('bat', !!ST12.bat);
  p.innerHTML = stHTML();
  const g2 = p.querySelector('[data-sg]');
  if (g2) (g2.scrollTop = top), stMore();
  stCmpPlace();
  if (inS) {
    const s = p.querySelector('.sts');
    s.focus({ preventScroll: true });
    s.setSelectionRange(...sel);
  } else if (f) {
    const n = p.querySelector(`[data-st="${CSS.escape(f)}"]`);
    if (n) n.focus({ preventScroll: true });
  }
  /* ST-09：確認卡打開時焦點在「取消」，關掉時還給打開它的那一個 */
  const ask = p.querySelector('.stask');
  if (ask && !ask.contains(document.activeElement)) {
    if (a && a.dataset && a.dataset.hold) ask.querySelector('.hold').focus();
    else (ST12.askF = ST12.askF || f), ask.querySelector('[data-st="ask:x"]').focus();
  } else if (!ask && ST12.askF) {
    const n = p.querySelector(`[data-st="${CSS.escape(ST12.askF)}"]`);
    ST12.askF = null;
    if (n) n.focus({ preventScroll: true });
  }
}
/* 「往下還有 n 件」：可視區下緣以下的格數 */
function stMore() {
  const p = $('pinv'),
    g = p.querySelector('[data-sg]'),
    m = p.querySelector('.stmore');
  if (!g || !m) return;
  const y = g.scrollTop + g.clientHeight,
    n = [...g.children].filter(c => !c.classList.contains('emp') && c.offsetTop + 32 > y).length;
  m.textContent = n ? (ST12.tab === 'jw' ? `　往下還有 ${n} 顆` : `往下還有 ${n} 件`) : '';
}
/* 只換比較浮窗（懸停、Alt） */
function stCmpSync() {
  const p = $('pinv'),
    o = p.querySelector('.stp'),
    h = stCmpHTML();
  if (o) o.remove();
  if (h) p.insertAdjacentHTML('beforeend', h), stCmpPlace();
}
/* 浮窗不蓋住懸停的那一格：格在下半＝浮窗貼上（規格 796,118）；格在上半＝浮窗放在格子下面 */
function stCmpPlace() {
  const p = $('pinv'),
    o = p.querySelector('.stp'),
    c = ST12.hov != null && p.querySelector(`[data-st="it:${ST12.hov}"]`);
  if (!o || !c) return;
  const P = p.getBoundingClientRect(),
    r = c.getBoundingClientRect();
  const h = o.offsetHeight,
    up = r.top - P.top - 45,
    dn = P.height - (r.bottom - P.top) - 4;
  if (h <= up) return;
  if (h <= dn || dn > up) o.style.top = Math.round(r.bottom - P.top + 4) + 'px';
  /* 上下都放不下：放在空間大的那一邊、內容捲動 */
  if (h > Math.max(up, dn)) (o.style.maxHeight = Math.max(up, dn) + 'px'), (o.style.overflowY = 'auto');
}
/* ---------- 操作 ---------- */
function stAct(v, el) {
  const [k, x] = v.split(':');
  if (k === 'tab') (ST12.tab = x), (ST12.hov = null), (ST12.sp = ''), (ST12.bat = null);
  else if (k === 'f') (ST12.f = x), (ST12.k = ''), (ST12.hov = null);
  else if (k === 'k') ST12.k = x;
  else if (k === 'jk') ST12.jk = x;
  else if (k === 'rar') ST12.rar[+x] = ST12.rar[+x] ? 0 : 1;
  else if (k === 'sort') ST12.o = ST_O[(ST_O.findIndex(o => o[0] === ST12.o) + 1) % ST_O.length][0];
  else if (k === 'up') ST12.up = ST12.up ? 0 : 1;
  else if (k === 'bat') {
    if (x === 'on') (ST12.bat = new Set()), (ST12.hov = null);
    else if (x === 'off') ST12.bat = null;
    else if (x === 'go') {
      const L = S.inv.items.filter(it => ST12.bat.has(it.id));
      if (!L.length) return;
      if (L.some(it => it.r >= 2)) ST12.ask = { t: 'bat' };
      else stSalv(L);
    }
  } else if (k === 'qs') {
    if (x === 'x') ST12.bat.clear();
    else {
      const L = stList(1).filter(it => !it.lock && (it.r || 0) === +x),
        on = stQsOn(+x);
      for (const it of L) on ? ST12.bat.delete(it.id) : ST12.bat.add(it.id);
    }
  } else if (k === 'it') {
    const it = S.inv.items.find(o => o.id === +x);
    if (!it) return;
    if (ST12.bat) {
      if (it.lock) return hudWarn('鎖住了，先解鎖');
      ST12.bat.has(it.id) ? ST12.bat.delete(it.id) : ST12.bat.add(it.id);
    } else return (ST12.hov = it.id), stCmpSync();
  } else if (k === 'eq') return stTake(+x, it => quickMove('inv', it));
  else if (k === 'salv') return stTake(+x, it => (it.lock ? hudWarn('鎖住了，先解鎖') : sell('inv', it)));
  else if (k === 'lock') return stTake(+x, it => lockToggle(it), 1);
  else if (k === 'mk') return closePanels(), fmenuOpen('forge');
  else if (k === 'ask') ST12.ask = null;
  else if (k === 'jw') return hudWarn('長按丟棄');
  else if (k === 'sp') (ST12.sp = x), (ST12.wyIt = null);
  else if (k === 'wy') {
    if (!((S.frags || {})[x] > 0)) return hudWarn('還沒拿到');
    (ST12.sp = 'apply'), (ST12.wy = x), (ST12.wyIt = null);
  } else if (k === 'wyit') ST12.wyIt = +x;
  else if (k === 'wyok') {
    const it = EQS.map(e => S.eq[e.k]).find(o => o && o.id === ST12.wyIt),
      err = it && wangyinSet(it, ST12.wy);
    if (!it || err) return hudWarn(err || '先選一件');
    hudWarn(strT('wyDone', { n: chaseName(ST12.wy), i: itemName(it) }));
    (ST12.sp = 'wy'), (ST12.wyIt = null);
    sfx('equip');
    return changed();
  }
  sfx('click');
  hudPanels();
}
const stTake = (id, f, keep) => {
  const it = S.inv.items.find(o => o.id === id);
  if (!it) return;
  if (!keep) ST12.hov = null;
  f(it);
};
function stSalv(L) {
  const v = salvZero();
  for (const it of L) takeOut('inv', it), salvAdd(v, salvageDo(it));
  hudWarn(`已分解 ${L.length} 件，得到 ${salvText(v)}`);
  ST12.bat = null;
  ST12.ask = null;
  sfx('coin');
  changed();
}
/* 長按確認：按住 0.6 秒（條從左填滿）才算；放開或移出取消 */
const STH = { t: 0, el: null };
function stHold(el) {
  STH.el = el;
  el.classList.add('go');
  STH.t = setTimeout(() => {
    el.classList.remove('go');
    if (el.dataset.hold === 'bat') stSalv(S.inv.items.filter(it => ST12.bat && ST12.bat.has(it.id)));
    else {
      const err = jwDrop(ST12.ask.id);
      ST12.ask = null;
      err ? hudWarn(err) : (sfx('coin'), save());
      hudPanels();
    }
  }, 600);
}
const stHoldEnd = () => {
  clearTimeout(STH.t);
  if (STH.el) STH.el.classList.remove('go');
  STH.el = null;
};
/* 珠寶長按＝丟棄確認 */
const STJ = { t: 0 };
(function stInit() {
  const p = $('pinv');
  p.addEventListener('click', e => {
    if (!p.classList.contains('st12')) return;
    const el = e.target.closest('[data-st]');
    if (el && !el.disabled) e.stopPropagation(), stAct(el.dataset.st, el);
  });
  p.addEventListener('input', e => {
    if (!p.classList.contains('st12') || !e.target.classList.contains('sts')) return;
    ST12.q = e.target.value;
    ST12.hov = null;
    hudPanels();
  });
  p.addEventListener('pointerover', e => {
    if (!p.classList.contains('st12') || ST12.bat || ST12.ask) return;
    const c = e.target.closest('[data-st^="it:"]'),
      id = c ? +c.dataset.st.slice(3) : null;
    if (c && id !== ST12.hov) (ST12.hov = id), stCmpSync();
  });
  p.addEventListener('pointerleave', () => {
    if (!p.classList.contains('st12') || ST12.hov == null) return;
    ST12.hov = null;
    stCmpSync();
  });
  p.addEventListener('scroll', e => e.target.matches && e.target.matches('[data-sg]') && stMore(), {
    capture: true,
    passive: true
  });
  p.addEventListener('pointerdown', e => {
    if (!p.classList.contains('st12')) return;
    const h = e.target.closest('[data-hold]');
    if (h) return stHold(h);
    const j = e.target.closest('[data-st^="jw:"]');
    clearTimeout(STJ.t);
    if (j) STJ.t = setTimeout(() => ((ST12.ask = { t: 'jw', id: j.dataset.st.slice(3) }), hudPanels()), 500);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave'])
    p.addEventListener(ev, () => (stHoldEnd(), clearTimeout(STJ.t)));
  p.addEventListener('contextmenu', e => {
    const j = p.classList.contains('st12') && e.target.closest('[data-st^="jw:"]');
    if (j) e.preventDefault(), (ST12.ask = { t: 'jw', id: j.dataset.st.slice(3) }), hudPanels();
  });
})();
/* 鍵盤：Q／E 第一層、Y 特殊物品分頁、按住 Alt 詳細、方向鍵在格子間走（右緣再按右＝進右欄，Ⓑ／Esc 回格子）、X 鎖定、Enter 裝備；長按鈕可用 Enter 按住 */
addEventListener(
  'keydown',
  e => {
    if (!PANEL.inv || !st12On()) return;
    const p = $('pinv'),
      k = e.key.toLowerCase(),
      a = document.activeElement,
      inP = p.contains(a),
      stop = () => (e.stopImmediatePropagation(), e.preventDefault());
    if (k === 'alt') return stop(), ST12.alt || ((ST12.alt = 1), stCmpSync());
    if (e.target.tagName === 'INPUT') return;
    if (k === 'y') return stop(), stAct('tab:sp');
    if (k === 'escape' && ST12.ask) return stop(), (ST12.ask = null), hudPanels();
    if (k === 'escape' && inP && a.closest('.stcol')) return stop(), stFocusGrid();
    if (k === 'escape' && ST12.bat) return stop(), stAct('bat:off');
    if (k === 'escape' && ST12.sp) return stop(), stAct(ST12.sp === 'apply' ? 'sp:wy' : 'sp:');
    if (!inP) return;
    if ((k === 'q' || k === 'e') && ST12.tab === 'eq' && !ST12.bat) {
      const i = ST_F.findIndex(f => f[0] === ST12.f) + (k === 'q' ? -1 : 1);
      return stop(), stAct('f:' + ST_F[(i + ST_F.length) % ST_F.length][0]);
    }
    if (k === 'enter' && a.dataset.hold) return stop(), e.repeat || stHold(a);
    const c = a.closest('[data-st^="it:"], [data-st^="jw:"]');
    if (k === 'x' && c && c.dataset.st.startsWith('it:')) return stop(), stAct('lock:' + c.dataset.st.slice(3));
    if (k === 'enter' && c && c.dataset.st.startsWith('it:') && !ST12.bat)
      return stop(), stAct('eq:' + c.dataset.st.slice(3));
    if (!k.startsWith('arrow')) return;
    if (a.closest('.stcol')) {
      const L = [...p.querySelectorAll('.stcol .sub')],
        i = L.indexOf(a) + (k === 'arrowdown' ? 1 : k === 'arrowup' ? -1 : 0);
      if (k === 'arrowleft') return stop(), stFocusGrid();
      if (L[i]) stop(), L[i].focus();
      return;
    }
    if (!c) return;
    const L = [...p.querySelectorAll('[data-sg] > [tabindex]')],
      i = L.indexOf(c),
      d = { arrowleft: -1, arrowright: 1, arrowup: -5, arrowdown: 5 }[k];
    stop();
    if (k === 'arrowright' && i % 5 === 4) {
      const s = p.querySelector('.stcol .sub.on') || p.querySelector('.stcol .sub');
      return s && s.focus();
    }
    if (k === 'arrowleft' && i % 5 === 0) return;
    const n = L[i + d];
    if (n)
      n.focus(),
        n.scrollIntoView({ block: 'nearest' }),
        n.dataset.st.startsWith('it:') && ((ST12.hov = +n.dataset.st.slice(3)), stCmpSync());
  },
  true
);
addEventListener('keyup', e => {
  if (e.key === 'Alt' && ST12.alt) (ST12.alt = 0), PANEL.inv && st12On() && stCmpSync();
  if (e.key === 'Enter') stHoldEnd();
});
function stFocusGrid() {
  const c = $('pinv').querySelector('[data-sg] > [tabindex]');
  if (c) c.focus();
}
/* ---------- 手把（標準配置）：營地與倉庫共用。十字鍵＝方向鍵、Ⓐ＝確認（格子上＝裝備）、Ⓑ＝退一層、Ⓧ＝升級／鎖定、LB／RB＝第一層、按住 Ⓨ＝比較詳細、R3＝名詞提示 ---------- */
const PAD12 = {};
function pad12() {
  const g = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
  if (!g) return void (PAD12.on = 0);
  requestAnimationFrame(pad12);
  const b = i => !!(g.buttons[i] && g.buttons[i].pressed),
    edge = i => b(i) && !PAD12[i],
    key = (k, up) =>
      (document.activeElement || document.body).dispatchEvent(
        new KeyboardEvent(up ? 'keyup' : 'keydown', { key: k, bubbles: true, cancelable: true })
      );
  if ((PANEL.camp && c12On()) || (PANEL.inv && st12On())) {
    [
      [12, 'ArrowUp'],
      [13, 'ArrowDown'],
      [14, 'ArrowLeft'],
      [15, 'ArrowRight'],
      [1, 'Escape'],
      [2, 'x'],
      [4, 'q'],
      [5, 'e']
    ].forEach(([i, k]) => edge(i) && key(k));
    const a = document.activeElement;
    if (edge(0) && a && a !== document.body) a.dataset.st && a.dataset.st.startsWith('it:') ? key('Enter') : a.click();
    if (PANEL.inv && b(3) !== !!PAD12[3]) key('Alt', !b(3));
    if (edge(11)) c12R3();
  }
  for (const i of [0, 1, 2, 3, 4, 5, 11, 12, 13, 14, 15]) PAD12[i] = b(i);
}
addEventListener('gamepadconnected', () => PAD12.on || ((PAD12.on = 1), pad12()));
