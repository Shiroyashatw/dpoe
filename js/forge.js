/* dungeonPOE · 鍛造面板（鍛造 v1.0，docs/production/specs/forge/）：左欄鍛造（打造／鍛造台兩段），右邊是倉庫。
   鍛造台段點一下倉庫或身上的裝備＝放上鍛造台；子分頁：填、淬鍊、聖化、腐化、災魘。通貨一律「選 → 看預覽 → 使用」 */
'use strict';
const CRAFT = {
  tab: 'camp',
  op: null,
  dust: null,
  conv: null,
  sel: null,
  log: '',
  perf: 0,
  pen: 0,
  om: [],
  pot: { v: 'v3', s: [], keep: 1 },
  potLock: 0,
  a2: 0
};
const craftItem = () => (CRAFT.sel ? findItem(CRAFT.sel.src, CRAFT.sel.id, CRAFT.sel.eqk) : null);

/* ---------- 打造（0.5.0，工坊與解鎖表第 5 節；鍛造台的第一頁）：鍛造台的表 → 選部位 → 系／武器類別 → 材料的階 → 數量 → 一顆主要按鈕；
   按下去扣材料、一件一件翻（hud.js 的 revealOpen 打造模式），每一件立刻跟身上比、換上／留／分解 ---------- */
const MK = { kind: 'weapon', sys: '', wt: 'sword', T: 0, n: 1 };
const MK_KINDS = [
  ['weapon', '武器'],
  ['shield', '盾'],
  ['focus', '法器'],
  ['quiver', '箭袋'],
  ['helm', '頭部'],
  ['chest', '胸甲'],
  ['gloves', '手套'],
  ['boots', '鞋子'],
  ['belt', '腰帶'],
  ['amulet', '項鍊'],
  ['ring', '戒指']
];
/* 這個部位開了沒：法器要靈絲、箭袋要皮 */
const mkKindOK = k => (k === 'focus' ? campCan('mat:silk') : k === 'quiver' ? campCan('mat:hide') : true);
/* 這個部位有哪些系（開了材料的才列）；武器、法器、箭袋、飾品沒有系 */
function mkSyses(kind) {
  if (['weapon', 'focus', 'quiver', ...ACC_K].includes(kind)) return [];
  const all = [...new Set(BASES.filter(b => b.k === kind).map(baseSys))].filter(Boolean),
    ord = Object.keys(SYSN);
  return all
    .filter(s => s.split('+').every(x => x === 'armor' || campCan('mat:' + SYS_MAT[x])))
    .sort((a, b) => ord.indexOf(a) - ord.indexOf(b));
}
/* 把選項修到合法：部位、系、武器類別、階（預設手上有材料的最高階）、數量 */
function mkOpts() {
  if (!mkKindOK(MK.kind)) MK.kind = 'weapon';
  const sys = mkSyses(MK.kind);
  MK.sys = sys.length ? (sys.includes(MK.sys) ? MK.sys : sys[0]) : '';
  if (!campWt(MK.wt)) MK.wt = 'sword';
  const b0 = craftBase(MK.kind, { sys: MK.sys, wt: MK.wt, T: 1 }),
    ms = b0 ? baseMat(b0) : ['iron'],
    tiers = [1, 2, 3, 4, 5, 6].filter(T => ms.some(m => matN(m, T) > 0)),
    ns = [1, 3, 5, 10, 20].filter(x => x <= campN('batch'));
  if (!tiers.includes(MK.T)) MK.T = tiers.length ? tiers[tiers.length - 1] : 1;
  if (!ns.includes(MK.n)) MK.n = 1;
  return { sys, tiers, ns };
}
const chipB = (fg, on, t, cls = '') =>
  `<button class="chip ${cls} ${on ? 'on' : ''}" data-fg="${fg}" aria-pressed="${!!on}">${t}</button>`;
/* ---------- 鍛造 v1.0（docs/production/specs/forge/，1280×720 定稿）：共用小件 ----------
   座標：桌機（#pcraft.f12）的每個區塊用 --y（面板內 px）放；直立照順序排，不看 --y */
const at = (y, cls, html, h) => `<div class="fx ${cls}" style="--y:${y}px${h ? `;--h:${h}px` : ''}">${html}</div>`;
/* 名詞提示（forge-spec §7）：虛線底線，停 0.4 秒出（data-ftip＝標題｜內文） */
const FTIP = {
  物品等級: '決定詞最高到哪一階。打造時＝材料的階。',
  追憶之墨: '打造時加一瓶：這一批第一件保證一條追憶詞。',
  追憶詞: '只從追憶池出的特殊詞，打造時加追憶之墨才保證。',
  自動分解: '打造出來不留的直接分解；規則在標題列「自動分解規則」改。',
  '▲': '跟身上同部位比：▲ 比較好、▼ 比較差。',
  預兆: '作用在下一顆崇高石或精髓粉，用了就沒了；一次 1 顆。',
  預知: '花 1 顆預知石先看結果，再決定要不要用掉通貨。',
  淬鍊: '花金幣，在原階級範圍裡重骰數值；階級與條數不變，破裂詞不動。',
  聖化: '每條詞數值 ×0.8～1.2；之後不能再填或淬鍊，仍可腐化。',
  已腐化: '腐化過的裝備全部鎖定；只剩災魘可以用。',
  判官筆: '和災魘石一起用：失敗時裝備不會毀掉，改成沒有變化；勾了就用掉。'
};
const fterm = (w, t = FTIP[w]) => `<span class="fterm" data-ftip="${esc(w + '｜' + (t || ''))}">${esc(w)}</span>`;
/* 物品上的 ✦n（頂階詞條數）與破裂圖示（forge-spec §3；同 charpanel 的 CH_STAR、affix_frac） */
const fStar = it => (starN(it) ? `<i class="cs">${CH_STAR}${starN(it)}</i>` : '');
const fFrac = (it, sz = 16) =>
  it && it.frac ? `<img class="ffr" src="art/icons/affix/affix_frac_${sz}${DPR > 1 ? '@2x' : ''}.png" alt="">` : '';
/* ---------- 打造（01／02）：部位 → 系／武器類別 → 材料 → 件數 → 打造；按下去扣材料、開揭曉（03） ---------- */
function makeHTML() {
  const { sys, tiers, ns } = mkOpts(),
    b = craftBase(MK.kind, MK),
    c = craftCost(b, MK.T),
    lack = craftLack(c, MK.n),
    [w, bl, y] = craftRarP(S.camp.forge),
    mats = Object.keys(c.mats),
    costTxt =
      mats.map(m => `${matName(m, MK.T)} ×${c.mats[m] * MK.n}`).join('、') +
      (c.gold ? `、${abbr(c.gold * MK.n, 'cost')} 金` : ''),
    have = mats.map(m => `（有 ${abbrH(matN(m, MK.T), 'own')}）`).join(''),
    kinds = MK_KINDS.filter(([k]) => mkKindOK(k))
      .map(([k, n]) => {
        const bb = craftBase(k, { sys: k === MK.kind ? MK.sys : '', wt: MK.wt, T: MK.T });
        return `<button class="fk ${MK.kind === k ? 'on' : ''}" data-fg="mk:kind:${k}" aria-pressed="${MK.kind === k}">${icHTML(bb ? bb.ic : '')}<span>${n}</span></button>`;
      })
      .join(''),
    wtLeft = campN('wts') - S.camp.wts.length,
    wtNew = wtLeft > 0 ? Object.keys(WTN).filter(wt => !S.camp.wts.includes(wt) && !WT_HIDE.includes(wt)) : [],
    row2 =
      MK.kind === 'weapon'
        ? S.camp.wts.length > 1 || wtNew.length
          ? `<b class="fl1">類別</b>${S.camp.wts.length > 1 || wtNew.length ? S.camp.wts.map(wt => chipB(`mk:wt:${wt}`, MK.wt === wt, WTN[wt], 'fwt')).join('') : ''}${wtNew.length ? `<span class="fwn" title="還能選 ${wtLeft} 種；選了就固定">${wtNew.map(wt => chipB(`wt:${wt}`, 0, '+' + WTN[wt], 'fwt2')).join('')}</span>` : ''}`
          : ''
        : sys.length > 1
          ? `<b class="fl1">系</b>${sys.map(s => chipB(`mk:sys:${s}`, MK.sys === s, SYSN[s], 'fsy')).join('')}`
          : '',
    ink = campCan('cur:ink') && Object.keys(MEM).some(k => MEM[k].on(b)),
    A = S.auto2;
  return `${at(56, 'fmklv', `鍛造台 Lv ${S.camp.forge}・一次最多 ${campN('batch')} 件`)}
  <button class="btn fx fmkup" style="--y:52px" data-fg="up">去營地升級 ›</button>
  ${at(88, 'fmkk', kinds)}
  ${row2 ? at(152, MK.kind === 'weapon' ? 'fmks w' : 'fmks', row2) : ''}
  ${at(
    192,
    'fmkm',
    `<b class="fl1">材料</b>${(tiers.length ? tiers : [1])
      .map(
        T =>
          `<button class="fmt ${MK.T === T ? 'on' : ''}" data-fg="mk:T:${T}" aria-pressed="${MK.T === T}"><b>${mats.map(m => esc(matName(m, T))).join('／')}</b><small>有 ${mats.map(m => abbrH(matN(m, T), 'own')).join('／')}</small></button>`
      )
      .join('')}<span class="c-dim">只列手上有的階</span>`
  )}
  ${ns.length > 1 ? at(242, 'fmkn', `<b class="fl1">件數</b>${ns.map(n => chipB(`mk:n:${n}`, MK.n === n, `${n} 件`, 'fnb')).join('')}`) : ''}
  ${ink ? at(284, 'fmki', `<button class="fcb ${MK.ink ? 'on' : ''}" data-fg="mk:ink:${MK.ink ? 0 : 1}" aria-pressed="${!!MK.ink}"><i></i>加一瓶${fterm('追憶之墨')}（有 ${MAT().ink}）</button><span class="c-dim">這一批第一件保證一條${fterm('追憶詞')}</span>`) : ''}
  ${at(322, 'fmkp', `<div class="it r0 fic">${icHTML(b.ic)}</div><div><b>${esc(b.n)}</b><small>${fterm('物品等級')} ${matIlvl(MK.T)}${MK.sys ? `・${SYSN[MK.sys]}` : ''}</small><small>普通 ${w}%・魔法 ${bl}%${y ? `・<span class="rc2">稀有 ${y}%</span>` : ''}</small>${y ? `<small class="c-dim">再 ${Math.max(0, prdMax(y / 100) - (S.prd.craftR || 0))} 件沒出稀有，下一件一定是稀有</small>` : ''}</div>`)}
  ${campCan('auto2') ? at(418, 'fmka', `${fterm('自動分解')}：${esc(auto2Txt(A))}`) : ''}
  ${at(472, 'fmkc', `<span>花費　${esc(costTxt)}${esc(have)}</span><small class="c-dim">打造只收這一階的材料</small>`)}
  <button class="btn fx fgo fmkgo ${lack ? 'off' : 'pri'}" style="--y:472px" data-fg="go" aria-disabled="${!!lack}"><b>${lack ? esc(lack) : `打造 ${MK.n} 件`}</b><small>${lack ? '少打幾件，或換低一階材料' : esc(costTxt)}</small></button>`;
}
/* 自動分解規則寫成一句 */
function auto2Txt(A) {
  const r = ['全部留', '分解普通', '只留稀有', '不照稀有度'][A.r] || '',
    o = [A.t ? `有 T${A.t} 詞` : '', A.mem ? '追憶詞' : '', A.up ? '▲ 比身上好' : ''].filter(Boolean);
  return r + (campCan('auto2t') && o.length ? `；另外留${o.join('、')}` : '');
}
/* 自動分解規則（04，鍛造台 Lv8 照稀有度、Lv14 加詞階／追憶／▲）：標題列入口打開；改了就存、不另確認 */
function auto2HTML() {
  const A = S.auto2,
    t14 = campCan('auto2t');
  return `<div class="fa2s" data-fg="a2x"></div><div class="fa2" role="dialog" aria-label="自動分解規則">
  <b class="fa2t">自動分解規則</b><button class="x fa2c" data-fg="a2x" aria-label="關閉">${ICO.x}</button>
  <p class="c-dim fa2d">打造出來不留的直接分解；已在倉庫的不受影響。</p>
  <b class="fa2l">照稀有度留</b><div class="fa2r">${[
    [0, '全部留'],
    [1, '分解普通'],
    [2, '只留稀有'],
    [3, '不照稀有度']
  ]
    .filter(([v]) => v < 3 || t14)
    .map(([v, t]) => chipB(`a2:r:${v}`, A.r === v, t))
    .join('')}</div>
  ${t14 ? `<b class="fa2l">另外留</b><div class="fa2r f2">${[1, 2, 3].map(t => chipB(`a2:t:${A.t === t ? 0 : t}`, A.t === t, `有 T${t} 詞`)).join('')}<span class="fa2g">${chipB(`a2:mem:${A.mem ? 0 : 1}`, A.mem, '追憶詞')}${chipB(`a2:up:${A.up ? 0 : 1}`, A.up, '▲ 比身上好')}</span></div>` : ''}
  <p class="fa2v">分解回收：材料 ${Math.round(salvRate() * 100)}%（倉房等級 50／65／80%）、靈魂、金；稀有另回 1 顆加詞石。</p>
  <button class="btn pri fa2ok" data-fg="a2x">完成</button></div>`;
}
/* ---------- 營地總覽（0.5.1，工坊與解鎖表第 3 節、增量遊戲精髓 5.3；0.5.4 照 docs/介面考核_0.5.3.md 重做）：
   固定順序——庫存列（資源條）與「下一件事」黏在上面、五座設施卡；不照買得起重排，買得起的卡左邊一條金邊、鈕亮。
   設施卡 campCardHTML（主數字＝下一級解鎖什麼、鈕的底色＝材料湊齊幾成）。點卡的標題＝展開那一座（倉房的商會、斥候營的星級、長老屋開了什麼…）。
   產生器與民房已拿掉（mumi 2026-11-25）。
   會跑的東西（資源條、數字、鈕的底色、滾數字）每格由 rbTick 只改 transform 與文字，不重畫卡；卡片每秒只補畫字變了的（campRefresh） ---------- */
const CAMPUI = { open: null, fx: {} };
const CAMP_B = ['forge', 'watch', 'scout', 'altar', 'store'];
/* 資源條的數字與每分鐘產量：照 abbr（擁有／獲得，捨去） */
const fmtR = v => (v >= 10 ? abbr(v, 'own') : +v.toFixed(1));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/* 「還要多久」寫成一句：算得出來寫「還要 N 分・缺 X 12」、算不出來（沒在刷、沒有人做）只寫缺什麼（只寫最慢那一項） */
const etaTxt = e =>
  !e || e.m === 0
    ? ''
    : e.m === Infinity
      ? `缺${e.nm} ${fullN(e.d, 'cost')}`
      : `還要 ${Math.max(1, Math.ceil(e.m))} 分・缺${e.nm} ${fullN(e.d, 'cost')}`;
/* M1-18／BASE-05：買不起的鈕寫「缺靈魂 n」（只寫最慢那一項） */
const lackTxt1 = e => (e && e.nm ? `缺${e.nm} ${fullN(e.d, 'cost')}` : '');
const costTxt = c =>
  costRows(c)
    .map(([nm, , w]) => `${nm} ${fullN(w, 'cost')}`)
    .join('・');
/* 所有可以按的東西：[鍵, 費用, 這一下給什麼] */
function campThings() {
  const L = [];
  for (const b of CAMP_B) {
    const n = campNext(b);
    if (n) L.push({ k: b, c: n, n: `${CAMPN[b]} Lv ${n.lv}`, d: cdThis(b) });
  }
  for (const t of L) t.e = costEta(t.c);
  return L;
}
/* ---------- B1 D1-04／D1-08：「這級：{效果}」全遊戲只從這裡組（單座卡、營地總覽卡、下一件事同一句短式）。
   {效果}＝M1-13 那一級的解鎖句（campSay，S.camp 暫時當作那一級）去掉「{設施} Lv n：」、取第一句 ---------- */
function lvFx(k, lv) {
  const C = S.camp,
    o = C[k];
  let t;
  C[k] = lv;
  try {
    t = campSay(k, lv) || '';
  } finally {
    C[k] = o;
  }
  return t.replace(/^[^：]*Lv\s?\d+：/, '').split('。')[0];
}
/* 「這級」取目標級（Lv14→15 寫 Lv15 那句）；滿級寫目前級 */
const cdThis = k => strT('cdThis', { t: lvFx(k, cdCost(k) ? cdLv(k) + 1 : cdLv(k)) });
/* 解鎖路線（單座卡「接下來會解鎖」）：從目標級起每級一列；第一列以外，效果一樣的連續等級合成一列「Lv{a}–{b}」 */
function cdRoute(k) {
  const lv = cdLv(k),
    R = [];
  for (let x = lv + 1; x <= campMax(k); x++) {
    const t = lvFx(k, x),
      r = R[R.length - 1];
    if (r && R.length > 1 && r.t === t) r.b = x;
    else R.push({ a: x, b: x, t });
  }
  return R;
}
/* 下一件事：最快能按的那一個（{ k, n, d, e }）；都升滿了回 null */
function campNextThing() {
  const L = campThings();
  return L.length ? L.reduce((a, b) => (b.e.m < a.e.m ? b : a)) : null;
}
/* ---------- 資源條（0.5.4，考核 A1、F2）：圖示＋名字＋庫存＋「這一單位的進度」條＋「+N／分」。
   key＝材料鍵（'wood'、'iron:2'…）或 'soul'。HTML 只有骨架（卡片的字不會因為數字一直變），數字、條、速率由 rbTick 每格填；
   速率 ≥240／分（每秒 4 格以上）條改成流動的常亮條（.flow）---------- */
const RB_FLOW = 240;
const rbIc = key => (key === 'soul' ? CAMP_IC.soul : MATS[matOf(key)[0]].ic);
const rbName = key => (key === 'soul' ? '靈魂' : matName(...matOf(key)));
function genBarHTML(key) {
  return `<div class="rbar" data-rb="${key}">${icHTML(rbIc(key), '', 16)}<span class="rn">${esc(rbName(key))}</span><b></b><small></small><i class="rt"><i></i></i></div>`;
}
/* 靈魂的條：每滿「一分鐘的量」跑一圈（本次掛機拿到的 ÷ 速率的餘數）；沒在刷是空的 */
const soulAcc = r => (r > 0 && typeof SES !== 'undefined' && SES ? (SES.soul % r) / r : 0);
const RB = { t: 0, sr: 0, rm: false };
const RB_EL = document.getElementsByClassName('rbar'),
  RF_EL = document.getElementsByClassName('cfill'),
  RO_EL = document.getElementsByClassName('nroll');
/* 數字 +1 跳一下：一分鐘會跳幾十次，所以小（1.12）而快（200 毫秒、強 ease-out）；流動條與減少動態時不跳 */
const POP = [{ transform: 'scale(1.12)', color: PAL.good }, { transform: 'scale(1)' }],
  POP_T = { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' };
const fill = (f, p) => {
  const s = `scaleX(${Math.max(0, Math.min(1, p)).toFixed(3)})`;
  if (f._s !== s) f.style.transform = f._s = s;
};
/* 每格（game.js 的 frame）：只改 transform 與文字；速率、鈕的底色每 0.5 秒算一次 */
function rbTick() {
  if (!RB_EL.length && !RF_EL.length && !RO_EL.length) return;
  const now = performance.now(),
    slow = !RB.t || now - RB.t > 500;
  if (slow) (RB.t = now), (RB.sr = soulRate()), (RB.rm = reduced());
  for (const el of RB_EL) {
    const key = el.dataset.rb;
    if (!key) continue;
    if (!el._b)
      (el._b = el.querySelector('b')), (el._sm = el.querySelector('small')), (el._f = el.querySelector('.rt i'));
    const soul = key === 'soul',
      v = Math.floor(soul ? MAT().soul : matN(...matOf(key)));
    if (el._v !== v) {
      const up = el._v != null && v > el._v;
      el._b.textContent = abbr((el._v = v), 'own');
      if (v >= 1e4) el._b.dataset.tip = fullN(v, 'own');
      else delete el._b.dataset.tip;
      if (up && !el._flow && !RB.rm) el._b.animate(POP, POP_T);
    }
    if (slow || el._r == null) {
      const r = soul ? RB.sr : 0,
        t = r > 0 ? `+${fmtR(r)}／分` : '';
      el._r = r;
      if (el._rt !== t) el._sm.textContent = el._rt = t;
      const fl = r >= RB_FLOW;
      if (el._flow !== fl) el.classList.toggle('flow', (el._flow = fl));
    }
    if (!el._flow) fill(el._f, soul ? soulAcc(el._r) : 0);
  }
  /* 升級鈕的底色＝材料湊齊幾成（最慢那一項）：data-fg 是 camp:設施 */
  for (const el of RF_EL)
    if (slow || el._p == null) {
      const c = campNext(el.dataset.fg.split(':')[1]);
      if (!c) continue;
      const p = Math.min(1, ...costRows(c).map(([, h, w]) => (w > 0 ? h / w : 1))),
        s = Math.round(p * 100) + '%';
      if (el._p !== s) el.style.setProperty('--f', (el._p = s));
    }
  /* 升級那一下主數字從舊值滾到新值（data-r＝舊:新:開始:毫秒，預設 300，ease-out；離線卡從 0 滾上去） */
  for (let i = RO_EL.length - 1; i >= 0; i--) {
    const el = RO_EL[i],
      [a, b, t0, d = 300] = el.dataset.r.split(':').map(Number),
      p = Math.min(1, (now - t0) / d),
      x = a + (b - a) * (1 - (1 - p) ** 3);
    el.textContent = '+' + (Number.isInteger(a) && Number.isInteger(b) ? fullN(Math.round(x)) : fmtR(x));
    if (p >= 1) el.classList.remove('nroll');
  }
}
/* 庫存列：木、材料階上限那一階的鐵（皮、靈絲開了才有）、靈魂；靈魂只在這裡（考核 A10） */
function campTopHTML() {
  const keys = [
    'wood',
    ...['iron', 'hide', 'silk'].filter(k => k === 'iron' || campCan('mat:' + k)).map(k => matKey(k, tierCap()))
  ];
  return `<div class="cmtop" id="cmtop">${[...keys, 'soul'].map(k => genBarHTML(k)).join('')}</div>`;
}
/* 下一件事（考核 A9）：買得起＝名字、給什麼、一顆「升級・費用」主要鈕（掛機卡裡在戰鬥下面就能按）；還買不起＝還要多久（只寫最慢那一項） */
function campNextHTML(id = 'cmnext') {
  const L = campThings(),
    ready = L.filter(t => t.e.m === 0),
    t = L.length ? L.reduce((a, b) => (b.e.m < a.e.m ? b : a)) : null;
  if (!t) return `<div class="cmnext" id="${id}"><span>營地都蓋好了</span></div>`;
  const ok = t.e.m === 0,
    more = ready.length - 1;
  return `<div class="cmnext ${ok ? 'can' : ''}" id="${id}">${icHTML(CAMP_IC[t.k])}<span><b>${esc(t.n)}</b>${t.d ? `<small class="d">${esc(t.d)}</small>` : ''}<small>${ok ? (more > 0 ? `另外 ${more} 件也買得起` : '下一件事') : esc(etaTxt(t.e))}</small></span>${ok ? `<button class="btn pri" data-fg="camp:${t.k}">升級<small>${esc(costTxt(t.c))}</small></button>` : `<button class="btn" data-fg="jump:${t.k}">看</button>`}</div>`;
}
/* 演出（3 節開頭）：升級那一下卡片亮一下、主數字滾、旁邊浮「+N／分」；里程碑金邊。1.2 秒內畫，減少動態時 CSS 不動、數字直接換 */
const ccFx = k => {
  const f = CAMPUI.fx[k];
  return f && performance.now() - f.t < 1200 ? f : null;
};
/* 解鎖表卡：主數字＝下一級解鎖什麼；鈕的底色＝材料湊齊幾成（rbTick 填） */
function campCardHTML(b) {
  const lv = S.camp[b],
    n = campNext(b),
    f = ccFx(b),
    e = n && costEta(n),
    ok = !!e && e.m === 0;
  return `<div class="paper camp cc ${ok ? 'can' : ''} ${f ? 'up' : ''}" id="cc-${b}">
  <button class="cch" data-fg="cc:${b}" aria-expanded="${CAMPUI.open === b}">${icHTML(CAMP_IC[b])}<b>${CAMPN[b]}</b><span>Lv ${lv}／${campMax(b)}</span>${ICO.down}</button>
  ${
    n
      ? `<div class="ccbig sm">${esc(cdThis(b))}</div>
  <button class="btn ${ok ? 'pri' : ''} wide cfill" data-fg="camp:${b}" ${ok ? '' : 'disabled'}>${ok ? `升級到 Lv ${n.lv}・${esc(costTxt(n))}` : esc(lackTxt1(e))}</button>`
      : '<div class="ccbig sm">都蓋好了</div>'
  }${CAMPUI.open === b ? campOpenHTML(b) : ''}</div>`;
}
/* 展開的那一座 */
function campOpenHTML(b) {
  if (b === 'forge')
    return `<div class="ccopen"><button class="btn" data-a="ctab:make">${STR_T.goForge}</button>${wtPickHTML()}</div>`;
  if (b === 'watch') {
    const nx = TRUNK[wFront(S) + 1];
    return `<div class="ccopen"><p class="sub">開到第 ${wFront(S) + 1} 個地點・材料階上限 T${tierCap()}（${matName('iron', tierCap())}）${nx ? `；下一個：${esc(nx.n)}（怪物 Lv ${nx.lv}）` : ''}</p><button class="btn" data-tm="nav:node">地點清單</button></div>`;
  }
  if (b === 'scout')
    return `<div class="ccopen"><div class="bagf" role="group" aria-label="星級">${Array.from({ length: campN('star') }, (_, i) => chipB(`star:${i + 1}`, wStar(S) === i + 1, `${i + 1}★`)).join('')}</div><p class="sub">星級越高越危險、掉得越好；每一輪重抽地圖詞</p></div>`;
  if (b === 'altar')
    return `<div class="ccopen"><p class="sub">技能格 ${campN('slots')}・輔助孔 ${campN('holes')}${campCan('tree') ? '・天賦樹' : ''}${campCan('aura') ? '・光環' : ''}${campCan('asc') ? '・昇華' : ''}${campCan('jsock') ? '・珠寶孔' : ''}</p></div>`;
  if (b === 'store')
    return `<div class="ccopen"><p class="sub">離線結算上限 ${campN('off')} 小時・分解回收 ${Math.round(salvRate() * 100)}%</p>${storeHTML()}</div>`;
  return '';
}
/* 商會（倉房 Lv4，⚠️ 固定匯率）：同一種材料 5 個低一階 → 1 個高一階（高一階超過 tierCap() 的列出但鎖住）；鐵 20（最高階）→ 1 顆加詞石；1 顆加詞石 → 木 50 */
function tradeList() {
  const L = [];
  for (const m of ['iron', 'hide', 'silk'])
    for (let T = 1; T < 6; T++)
      if (matN(m, T) >= 5)
        L.push({
          g: [m, T, 5],
          t: [m, T + 1, 1],
          why: T + 1 > tierCap() ? `瞭望台開到更深的地點才能換${matName(m, T + 1)}` : ''
        });
  return L;
}
function storeHTML() {
  if (!campCan('trade')) return '';
  return `<div class="ph2">商會<span>材料照固定匯率換打造通貨</span></div><button class="btn" data-gd="open:store">商會</button>`;
}
/* 5 換 1：i＝tradeList 的第幾列；n＝'all' 全換（不吃額度） */
function tradeDo(i, n) {
  if (i === 'wood') {
    if (!(MAT().aug >= 1)) return '沒有加詞石';
    MAT().aug--;
    matAdd('wood', 0, 50);
  } else {
    const x = tradeList()[+i];
    if (!x) return '換不了';
    if (x.why) return x.why;
    const k = n === 'all' ? Math.floor(matN(x.g[0], x.g[1]) / 5) : 1;
    matAdd(x.g[0], x.g[1], -5 * k);
    matAdd(x.t[0], x.t[1], k);
  }
  return null;
}
/* ---------- 商會 v1.0（specs/guild/guild-spec.md，1280×720 定稿）：獨立滿寬面板 #pguild ----------
   左欄：加詞石、崇高石兩區（額度＋條＋回復＋整區換到上限；每列換 1 顆／換到上限 ×n）；右欄：5 換 1、加詞石換木、至臻石說明條。
   換到上限只在會把某種材料用光時出兩步確認卡（G03）；額度 0 整區停用、原因寫在區頭（不在戰場跳字） */
const GUILD = { from: 'store', pend: null, h: '' };
const gNum = n => Math.floor(n + 1e-9).toLocaleString('en-US');
const gSec = s =>
  s >= 60 ? `${Math.floor(s / 60)} 分${s % 60 ? ` ${Math.round(s % 60)} 秒` : ''}` : `${Math.round(s)} 秒`;
const gMat = (k, T) => (T ? `${matName(k, T)}（T${T}）` : matName(k, T));
const gTerm = w => `<span class="zterm" data-zh="${esc(w)}" tabindex="0">${esc(w)}</span>`;
function guildOpen(from) {
  HP_HOLD++;
  closePanels();
  HP_HOLD--;
  GUILD.from = from || 'store';
  GUILD.pend = null;
  PANEL.guild = true;
  hudPanels();
}
function guildSecHTML(c) {
  const C = TRADE_CUR[c],
    cn = CUR[c].n,
    lk = C.un && lockTxt(C.un),
    q = Math.floor(tradeQ(c) + 1e-9),
    out = !lk && q < 1,
    rows = tradeRows(c),
    sec = tradeQSec(c),
    src = c === 'aug' ? '木、鐵、皮換這顆' : '靈絲換這顆（照舊）',
    dis = out || lk,
    pd = GUILD.pend,
    btn = (cls, a, t, off, why) =>
      `<button class="gb ${cls}${pd && pd.a === a ? ' on' : ''}" data-gd="${a}"${off ? ` aria-disabled="true" data-gw="${esc(why)}"` : ''}>${t}</button>`;
  const why = lk || `${cn}這小時換完了・約 ${gSec(sec - (((tradeQ(c) * 3600) / C.q) % sec))}後回 1 顆`;
  const L = rows.length
    ? rows.map(r => {
        const n = Math.min(q, r.max),
          ok = r.max >= 1;
        if (!ok)
          return `<li class="gno"><span>${esc(gMat(r.k, r.T))}</span><span class="r">${gNum(r.have)}</span><span>${gNum(r.rate)} 個 → 1 顆</span><span class="gnot">材料不夠換 1 顆${cn}</span></li>`;
        return `<li><span>${gTerm(matName(r.k, r.T))}${r.T ? `（T${r.T}）` : ''}</span><span class="r">${gNum(r.have)}</span><span>${gNum(r.rate)} 個 → 1 顆</span><span class="r">${dis ? '—' : `${gNum(n)} 顆`}</span>${btn('g1', `one:${c}:${r.k}:${r.T}`, '換 1 顆', dis, why)}${btn('gmx', `max:${c}:${r.k}:${r.T}`, n && !dis ? `換到上限 ×${gNum(n)}` : '換到上限', dis || !n, why)}</li>`;
      })
    : [
        `<li class="gno"><span>${esc(gMat(C.m[0][0], C.m[0][0] === 'wood' ? 0 : 1))}</span><span class="r">0</span><span>${gNum(tradeRate(C.m[0][0], 1))} 個 → 1 顆</span><span class="gnot">材料不夠換 1 顆${cn}</span></li>`
      ];
  const all = tradePlan(c, tradeOrder(rows)).n;
  return `<section class="gsec ${out ? 'out' : ''}${lk ? ' lk' : ''}" data-c="${c}">
  <div class="gsh">${icHTML(CUR[c].ic, '', 16)}<b>${gTerm(cn)}</b><small>${src}</small>
  ${
    lk
      ? `<em class="gqt off">${esc(lk)}</em>`
      : out
        ? `<em class="gqt bad">這小時換完了　0／${C.q} 顆</em>`
        : `<em class="gqt">這小時還能換 ${q}／${C.q} 顆</em>`
  }<i class="gqb"><i style="width:${lk ? 0 : ((100 * tradeQ(c)) / C.q).toFixed(1)}%"></i></i>
  <small class="grc${out ? ' bad' : ''}">${out ? esc(why) : `約 ${gSec(sec)}回 1 顆・最多存 1 小時`}</small>
  ${btn('gall', `all:${c}`, '整區換到上限', dis || !all, why)}</div>
  <div class="gth"><span>材料</span><span class="r">持有</span><span>換率</span><span class="r">最多可換</span><span>單次／換到上限</span></div>
  <ul class="gl">${L.join('')}</ul></section>`;
}
function guildRightHTML() {
  const L = tradeList().filter(x => x.g[0] !== 'wood');
  return `<section class="g51"><b>低階換高階（5 換 1）</b><small>不吃額度；換出的階不能超過材料階上限</small>
  <ul>${
    L.map((x, i) =>
      x.why
        ? `<li class="glk"><span>${esc(matName(x.g[0], x.g[1]))} ×5 → ${esc(matName(x.t[0], x.t[1]))}</span><small>${esc(x.why)}</small></li>`
        : `<li><span>${gTerm(matName(x.g[0], x.g[1]))} ×5 → ${gTerm(matName(x.t[0], x.t[1]))}</span><button class="gb g1" data-gd="t51:${i}">換 1</button><button class="gb gmx" data-gd="t51:${i}:all">全換 ×${gNum(Math.floor(matN(x.g[0], x.g[1]) / 5))}</button></li>`
    ).join('') || '<li class="gno"><span>同一階的材料有 5 個才能換高一階</span></li>'
  }</ul></section>
  <section class="gwd"><b>${gTerm(CUR.aug.n)} ×1 → 木 50</b><small>不吃額度・有 ${gNum(MAT().aug || 0)} 顆</small><button class="gb gmx" data-gd="wood"${MAT().aug >= 1 ? '' : ' aria-disabled="true" data-gw="沒有加詞石"'}>換 1 次</button></section>
  <section class="gzh"><b>${gTerm(CUR.zhi.n)}：商會不換</b><small>只靠打怪掉落（鍛造台 Lv 18 起）</small></section>`;
}
/* 確認卡（G03）：會用光某種材料時才出 */
function guildCfHTML() {
  const p = GUILD.pend;
  if (!p) return '';
  const cn = CUR[p.c].n,
    q = Math.floor(tradeQ(p.c) + 1e-9),
    one = p.use.length === 1,
    t = one
      ? `會用光${matName(p.use[0][0], p.use[0][1])}：換到上限 ${cn} ×${gNum(p.n)}`
      : `會用光材料：整區換到上限 ${cn} ×${gNum(p.n)}`;
  return `<div class="gcf" role="alertdialog" aria-label="${esc(t)}" style="--y:${p.y || 0}px"><b>${esc(t)}</b>
  <ul>${p.use.map(([k, T, n, h]) => `<li><span>用掉</span>${esc(matName(k, T))} ×${gNum(n)}（持有 ${gNum(h)} → ${gNum(h - n)}${n >= h ? '，用光' : ''}）</li>`).join('')}
  <li><span>換到</span>${esc(cn)} ×${gNum(p.n)}</li><li><span>額度</span>這小時還能換 ${q} → ${q - p.n} 顆</li></ul>
  <p class="gwarn">⚠ 通貨換不回材料</p>
  <div class="gcfb"><button class="btn pri" data-gd="ok">確認換 ${gNum(p.n)} 顆</button><button class="btn" data-gd="no">取消</button></div></div>`;
}
function guildHTML() {
  return `<div class="ph"><button class="btn gback" data-gd="back">← ${GUILD.from === 'forge' ? '鍛造' : '倉房'}</button><b>商會</b><span>倉房 Lv ${S.camp.store}・材料照固定匯率換打造通貨，每種通貨每小時有額度</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="gcols"><div class="gleft">${guildSecHTML('aug')}${guildSecHTML('exalt')}</div><div class="gright">${guildRightHTML()}</div></div>
  <p class="gft">單次＝換 1 顆；換到上限＝換到這小時額度或材料用完（先到者）。額度連續回復、離線照算、最多存 1 小時份；木、鐵、皮共用加詞石額度。通貨換不回材料（加詞石換木除外）。會把某種材料用光時先出確認卡，否則直接換。</p>
  ${GUILD.pend ? `<div class="gcfs" data-gd="no"></div>${guildCfHTML()}` : ''}`;
}
/* 每秒（hudTick）跟面板重畫：字串沒變就不動（焦點不跳） */
function guildDraw() {
  const el = $('pguild'),
    h = guildHTML();
  if (h !== GUILD.h) keepFocus(el, () => (el.innerHTML = GUILD.h = h));
}
/* 結果行：照舊用 hudWarn 的一行（不在戰場中央跳字） */
function guildDo(a, el) {
  const [k, c, mk, T] = a.split(':');
  let err = null;
  if (k === 'back') {
    const f = GUILD.from;
    PANEL.guild = false;
    GUILD.pend = null;
    if (f === 'forge') return openPanel('craft');
    return cdOne('store');
  }
  if (el && el.getAttribute('aria-disabled') === 'true') return;
  if (k === 'no') GUILD.pend = null;
  else if (k === 'ok') {
    const p = GUILD.pend;
    GUILD.pend = null;
    if (p) err = tradeCur(p.c, p.kind, p.k, p.T);
    if (!err) sfx('coin'), save();
  } else if (k === 'one') {
    err = tradeCur(c, 'one', mk, T);
    if (!err) sfx('coin'), save();
  } else if (k === 'max' || k === 'all') {
    const rows = k === 'all' ? tradeOrder(tradeRows(c)) : tradeRows(c).filter(r => r.k === mk && r.T === +T),
      P = tradePlan(c, rows);
    if (P.empty.length) {
      const r = el && el.getBoundingClientRect(),
        pr = $('pguild').getBoundingClientRect();
      GUILD.pend = { a, c, kind: k, k: mk, T, n: P.n, use: P.use, y: r ? Math.round(r.bottom - pr.top + 4) : 0 };
    } else {
      err = tradeCur(c, k, mk, T);
      if (!err) sfx('coin'), save();
    }
  } else if (k === 't51') {
    err = tradeDo(c, mk);
    if (!err) sfx('coin'), save();
  } else if (k === 'wood') {
    err = tradeDo('wood');
    if (!err) sfx('coin'), save();
  }
  if (err) hudWarn(err);
  guildDraw();
  if (GUILD.pend) {
    const b = $('pguild').querySelector('.gcf [data-gd="ok"]');
    if (b) b.focus();
  }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-gd]');
  if (!b) return;
  const [k, v] = b.dataset.gd.split(':');
  if (k === 'open') return guildOpen(v);
  guildDo(b.dataset.gd, b);
});
/* 停用鈕懸停：同一句原因（G02） */
document.addEventListener('pointerover', e => {
  const b = e.target.closest && e.target.closest('#pguild [data-gw]');
  const t = $('gtip');
  if (!t) return;
  if (!b) return void (t.hidden = true);
  const r = b.getBoundingClientRect();
  t.textContent = b.dataset.gw;
  t.hidden = false;
  t.style.left = Math.round(Math.max(8, Math.min(innerWidth - t.offsetWidth - 8, r.right - t.offsetWidth))) + 'px';
  t.style.top = Math.round(Math.min(innerHeight - t.offsetHeight - 8, r.bottom + 8)) + 'px';
});
/* 第二種以後的武器類別（鍛造台 Lv11 起，15 選 1）：開了幾種 campN('wts')，還能選就列出沒開的 */
function wtPickHTML() {
  const left = campN('wts') - S.camp.wts.length;
  if (left <= 0) return '';
  return `<div class="ph2">選一種武器類別<span>還能選 ${left} 種；選了才打得出那種武器、列得出那種武器的技能</span></div><div class="bagf">${Object.keys(
    WTN
  )
    .filter(wt => !S.camp.wts.includes(wt) && !WT_HIDE.includes(wt))
    .map(wt => chipB(`wt:${wt}`, 0, WTN[wt]))
    .join('')}</div>`;
}
/* 固定順序（考核 A6）：上面兩行黏住、設施一組 */
function campHTML() {
  /* M1-CP.1：首屏＝資源、下一件主升級、下一個解鎖、還有幾座（設施的大卡往下捲或上拉全版） */
  const n = CAMP_B.length;
  return `<div class="cmhead">${campTopHTML()}${campNextHTML()}<p class="cmmore">還有 ${n} 座・${PORT() ? '往下捲或上拉全版' : '往下捲動看全部'}</p></div>
  <div class="cmgrp"><span>設施</span></div>
  <div class="cmcards">${CAMP_B.map(campCardHTML).join('')}</div>`;
}
/* ---------- M2-12 §6 下一個目標：最近的解鎖里程碑（還差最少級的那一個；新地點、技能格、輔助孔、天賦樹、昇華…），一次一個、不能釘 ---------- */
const affP = c => (c ? Math.min(1, ...costRows(c).map(([, h, w]) => (w ? Math.max(0, h) / w : 1))) : 1);
function campGoal() {
  const C = S.camp,
    L = ['slot', 'hole', 'wt', 'tree', 'asc', 'aura'].map(nextUnlock).filter(Boolean),
    nx = TRUNK_K[wFront(S) + 1];
  if (nx && WNODE[nx].i <= campMax('watch')) L.push({ b: 'watch', lv: WNODE[nx].i, n: wName(S, ...wXY(nx)) });
  if (!L.length) return null;
  const g = L.reduce((a, b) => (b.lv - (C[b.b] || 0) < a.lv - (C[a.b] || 0) ? b : a));
  return { b: g.b, lv: g.lv, t: `${CAMPN[g.b]} Lv ${g.lv}・開${g.n}` };
}
/* 目標條（抽屜、掛機條展開、離線結算共用）：字＋4 高的買得起程度；達成（換成下一個）那一次亮 240 ms；點了開那一座的單座卡 */
const GOAL = { k: '', t: -1e9 };
function goalHTML() {
  const g = campGoal();
  if (!g) return `<div class="goal"><span>${STR_T.goalNone}</span></div>`;
  const now = performance.now();
  if (GOAL.k && GOAL.k !== g.t) GOAL.t = now;
  GOAL.k = g.t;
  return `<button class="goal ${now - GOAL.t < 240 ? 'hit' : ''}" data-cd="one:${g.b}"><span>${esc(strT('goal', { t: g.t }))}</span><i class="gp"><i data-cp="${g.b}"></i></i></button>`;
}
/* ---------- M2-12 §3 營地升級抽屜（刷圖中開，刷圖不停）：5 設施，一格一個印章鈕（一下就升、不能復原、300 ms 內重複不算）；
   點格子本體＝單座卡（‹ › 換座、× 回格子）；「回營地看」＝現有營地總覽（第二段改營地場景） ---------- */
const CDR = { one: null, tap: {}, h: '' };
const cdKeys = () => CAMP_B;
const cdCost = k => campNext(k);
const cdLv = k => S.camp[k] || 0;
const cdName = k => CAMPN[k];
const cdFg = k => `camp:${k}`;
/* 建議那一座（只有它是實心印章）：推進下一個目標的那座；沒有就選買得起的裡面最便宜的（靈魂＋木） */
function cdSug() {
  const g = campGoal();
  if (g && cdCost(g.b)) return g.b;
  const ok = cdKeys().filter(k => cdCost(k) && affP(cdCost(k)) >= 1),
    sum = c => (c.soul || 0) + (c.wood || 0);
  return ok.length ? ok.reduce((a, b) => (sum(cdCost(b)) < sum(cdCost(a)) ? b : a)) : null;
}
function cdCellHTML(k, sug) {
  const c = cdCost(k),
    f = CAMPUI.fx[k],
    up = f && performance.now() - f.t < 400,
    cls = k === sug ? 'sug' : affP(c) >= 1 ? 'can' : 'off';
  return `<div class="cdc ${up ? 'up' : ''}"><button class="cdb" data-cd="one:${k}">${icHTML(CAMP_IC[k])}<b>${cdName(k)} <span class="lv">Lv ${cdLv(k)}</span></b></button>${
    c
      ? `<button class="stamp ${cls}" data-fg="${cdFg(k)}" aria-label="升級${cdName(k)}">▲</button>`
      : `<small class="c-dim">${STR_T.cdMax}</small>`
  }<i class="cdp"><i data-cp="${k}"></i></i></div>`;
}
function cdOneHTML(k) {
  const c = cdCost(k),
    lv = cdLv(k),
    rt = cdRoute(k);
  return `<div class="cd1"><p class="cdlv">Lv ${lv}${c ? ` → Lv ${lv + 1}` : ''}</p><p class="cdd">${esc(cdThis(k))}</p>
  ${
    c
      ? `<ul class="cdcost">${costRows(c)
          .map(
            ([nm, h, w]) =>
              `<li><span>${nm}</span><b>${abbrH(w, 'cost')}／${abbrH(h, 'own')}</b>${h >= w ? `<em class="c-good">${STR_T.cdEnough}</em>` : ''}</li>`
          )
          .join('')}</ul>`
      : `<p class="c-dim">${STR_T.cdMax}</p>`
  }
  ${
    rt.length
      ? `<p class="cdnx">${STR_T.cdNext}</p><ul class="cdrt">${rt
          .map(
            (r, i) =>
              `<li class="${i ? '' : 'on'}"><span>${esc(r.a === r.b ? strT('cdRow', { n: r.a, t: r.t }) : strT('cdRowR', { a: r.a, b: r.b, t: r.t }))}</span>${i ? '' : `<em>${Math.floor(affP(c) * 100)}%</em><i class="cdp"><i data-cp="${k}"></i></i>`}</li>`
          )
          .join('')}</ul>`
      : ''
  }
  ${c ? `<button class="btn pri wide stamp one" data-fg="${cdFg(k)}">${STR_T.cdUp}</button>` : ''}</div>`;
}
function campDrawerHTML() {
  const one = CDR.one,
    sug = cdSug();
  return `<div class="ph">${one ? `<button class="x" data-cd="nav:-1" aria-label="上一座">‹</button><b>${cdName(one)}</b><button class="x" data-cd="nav:1" aria-label="下一座">›</button>` : `<b>${STR_T.campUpT}</b><button class="btn cdlook" data-cd="look">${STR_T.campLook}</button>`}<button class="x" aria-label="${one ? '回格子' : '關閉'}" ${one ? 'data-cd="back"' : 'data-a="close"'}>${ICO.x}</button></div>
  ${
    one
      ? cdOneHTML(one)
      : `${goalHTML()}<div class="cdg">${cdKeys()
          .map(k => cdCellHTML(k, sug))
          .join('')}</div>`
  }`;
}
/* 畫抽屜：字串沒變不重畫（進度條另外填，資源一直在跑不會讓格子重建） */
function campDrawer(force) {
  const el = $('pcamp'),
    w = c12On(),
    h = w ? c12HTML() : campDrawerHTML();
  el.classList.toggle('cm12', w);
  if (force || CDR.h !== h) keepFocus(el, () => (el.innerHTML = CDR.h = h));
  for (const i of document.querySelectorAll('[data-cp]')) {
    const c = cdCost(i.dataset.cp);
    i.style.transform = `scaleX(${affP(c).toFixed(3)})`;
    i.classList.toggle('full', affP(c) >= 1);
  }
}
/* 營地抽屜開到某一座（格子點一座、營地牌匾） */
function cdOne(v) {
  if (!PANEL.camp) {
    HP_HOLD++;
    closePanels();
    HP_HOLD--;
    PANEL.camp = true;
  }
  CDR.one = v;
  hudPanels();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cd]');
  if (!b) return;
  const [k, v] = b.dataset.cd.split(':'),
    L = cdKeys();
  if (k === 'one') return cdOne(v);
  else if (k === 'nav') CDR.one = L[(L.indexOf(CDR.one) + +v + L.length) % L.length];
  else if (k === 'back') CDR.one = null;
  else if (k === 'look') {
    closePanels();
    CRAFT.tab = 'camp';
    NAV.full = PORT() ? 1 : 0;
    return openPanel('craft');
  }
  hudPanels();
});
/* 買不起時按印章（§8「資源不夠」）：鈕抖 2 px×2、悶木聲、短震；缺的那項由 hudWarn 講 */
function stampNo(b) {
  sfx('thud');
  buzz(10);
  if (b.animate && !reduced())
    b.animate(
      { transform: ['translateX(0)', 'translateX(-2px)', 'translateX(2px)', 'translateX(-2px)', 'translateX(0)'] },
      120
    );
}
/* 每秒補畫：只換字變了的卡與上面兩行（不整片重畫、不重排；會跑的東西在 rbTick） */
function campRefresh() {
  if (!PANEL.craft || CRAFT.tab !== 'camp') return;
  const L = (CAMPUI.last = CAMPUI.last || {}),
    sw = (id, h) => {
      const el = $(id);
      if (el && L[id] !== h) (el.outerHTML = h), (L[id] = h);
    };
  sw('cmtop', campTopHTML());
  sw('cmnext', campNextHTML());
  for (const k of CAMP_B) sw('cc-' + k, campCardHTML(k));
}
/* 按「打造」：扣材料、進倉庫、開揭曉（03） */
function craftGo() {
  const r = craftDo(MK.kind, MK);
  if (r.why) return hudWarn(r.why), fShake('[data-fg="go"]');
  sfx(r.items.some(it => it.r === 2) ? 'flipRare' : 'equip');
  revealOpen(
    r.items.filter(it => !it.salv),
    { title: `打造 ${r.items.length} 件・${craftBase(MK.kind, MK).n}`, craft: 1, auto: r.salv.n }
  );
}
/* 不能按的主鈕按了抖一下（forge-screens 02、11） */
function fShake(q) {
  const b = document.querySelector('#pcraft ' + q);
  if (b && b.animate && !reduced())
    b.animate({ transform: ['translateX(0)', 'translateX(-3px)', 'translateX(3px)', 'translateX(0)'] }, 140);
}

/* ---------- 鍛造台（05–17）：左欄裝備卡＋詞列，右欄通貨格→說明→預覽→主鈕；一律「選 → 看預覽 → 使用」 ---------- */
/* 一件裝備的詞：前綴 3 格、後綴 3 格（空格畫出來）。mode：'view' 只看、'temper' 百分位條＋單條淬鍊、'conv' 點一條選要換的 */
function slotsHTML(it, mode) {
  const cap = sideCap(it),
    hasF = !!it.frac,
    bt = bestTier(it.L),
    nw = CRAFT.potNew || [],
    one = (a, i) => {
      const fr = isFrac(it, a),
        txt = `<i class="fst">${a.T <= bt ? CH_STAR : ''}</i>${hasF ? `<i class="ffc">${fr ? fFrac(it, 14) : ''}</i>` : ''}<span>${esc(affText(a))}</span>${fr ? '<em class="ftag">破裂</em>' : ''}<i class="ftt">T${a.T}${a.m ? ` ×${a.m.toFixed(2)}` : ''}</i>`,
        cls = `${fr ? 'frac' : ''} ${nw.includes(a) ? 'pnew' : ''} ${CRAFT.fresh && CRAFT.fresh.includes(a) ? 'new' : ''}`;
      if (mode === 'conv') {
        const why = fr ? '破裂詞不能轉化' : !affCls(a.k) ? '這條沒有類別' : '';
        return `<li><button class="fcv ${cls} ${CRAFT.conv === i ? 'on' : ''}" data-fg="cv:${i}" ${why ? `disabled data-tip="${why}"` : ''} aria-pressed="${CRAFT.conv === i}">${txt}</button></li>`;
      }
      if (mode === 'temper') {
        const pc = affPct(a);
        return `<li class="ftm ${cls}"><span class="ftx">${esc(affText(a))}</span><i class="fpb" style="--v:${pc.toFixed(2)}" title="${Math.round(pc * 100)}%"><i></i></i><button class="btn mini" data-fg="tmp:${i}" ${fr || S.gold < temperCost(it, 1) || lockWhy(it, 'temper') ? 'disabled' : ''} data-tip="${fr ? '破裂詞鎖住了，不能淬鍊' : `單條 ${temperCost(it, 1)} 金`}">${fr ? '鎖住' : '單條'}</button></li>`;
      }
      return `<li class="${cls}">${txt}</li>`;
    },
    side = (pre, name) => {
      const L = it.a.map((a, i) => [a, i]).filter(([a]) => !!AFF[a.k].p === pre);
      return `<h5 class="fsh">${name}</h5><ul class="fslot">${Array.from({ length: 3 }, (_, j) =>
        L[j]
          ? one(...L[j])
          : `<li class="emp ${j >= cap ? 'lk' : ''}"><span>${j >= cap ? '稀有物品才有' : '（空）'}</span></li>`
      ).join('')}</ul>`;
    };
  return (
    side(true, '前綴') +
    side(false, '後綴') +
    (it.cw && it.cw.length
      ? `<h5 class="fsh">腐化詞</h5><ul class="fslot">${it.cw.map(c => `<li class="cw"><span>${esc(cwText(c))}</span></li>`).join('')}</ul>`
      : '') +
    (it.cal
      ? `<h5 class="fsh">災魘詞</h5><ul class="fslot"><li class="calg"><span>${esc(calText(it.cal.g))}</span></li>${it.cal.b ? `<li class="calb"><span>${esc(calText(it.cal.b, 1))}</span></li>` : ''}</ul>`
      : '')
  );
}
/* 沒放裝備時的虛線放置槽（直立點了開選裝格；桌機點倉庫或身上的裝備，也可以拖進來） */
const FILL_EMPTY =
  '把一件裝備放上來：點倉庫或身上的裝備。「填」只能加詞、不能拿掉；加詞石、崇高石、至臻石四步都能用：白→藍、藍加一條、藍→黃、黃加一條。';
const emptySlotHTML = () =>
  `${
    PORT()
      ? `<button class="cuslot" data-a="pick">${ICO.plus}<span>選一件裝備</span></button>`
      : `<div class="cuslot" data-cur="1"><span>${TOUCH.on ? '點倉庫或身上的裝備，再按「放上鍛造台」' : '點一下倉庫或身上的裝備，放上鍛造台'}</span></div>`
  }<p class="cuhint">${FILL_EMPTY}</p>`;
/* 上方的裝備卡（06 #1）：圖示格右上 ✦n、左下破裂；名字、稀有度・部位・物品等級・品質、前後綴條數 */
function cardHTML(it) {
  if (!it) return emptySlotHTML();
  const np = it.a.filter(a => AFF[a.k].p).length,
    cap = sideCap(it),
    kn = (MK_KINDS.find(k => k[0] === baseOf(it).k) || [])[1] || '';
  return `<div class="fsel">
    <div class="it r${it.r} fic">${icHTML(itemIc(it))}${fStar(it)}${fFrac(it)}</div>
    <div><b class="rc${it.r}">${esc(itemName(it))}</b><small>${RARN[it.r]}・${kn}・${fterm('物品等級')} ${it.L}・品質 ${Math.round((it.q || 0) * 100)}%</small><small>前綴 ${np}／${cap}・後綴 ${it.a.length - np}／${cap}${it.tmp ? `・淬鍊 ${it.tmp} 次` : ''}</small></div>${PORT() ? '<button class="btn mini" data-a="pick">換一件</button>' : ''}</div>`;
}
/* ---------- 通貨格（05／06／11）：2 排 × 4，每格 84×54；沒開寫「Lv n」、不能用＝虛線＋灰圖、混沌石停用格 ---------- */
const FCUR = [
  ['aug', 'exalt', 'zhi', 'dust'],
  ['conv', 'frac', 'perf', 'chaos']
];
const opArg = op => (op === 'dust' ? CRAFT.dust : op === 'conv' ? CRAFT.conv : null);
function curCell(k, it, lockAll) {
  if (k === 'chaos')
    return `<button class="fcu no off" data-fg="cz" data-ftip="混沌石｜停用：保留格位，現在不能用。">${icHTML('hundun')}<b>混沌石</b><small>停用</small></button>`;
  const key = k === 'dust' ? 'cur:ess' : curKey(k),
    open = campCan(key),
    e = !open && campKey(key),
    nm = k === 'dust' ? '精髓粉' : CUR[k].n,
    ic = k === 'dust' ? 'asc_s_stars' : CUR[k].ic,
    n = k === 'dust' ? ACLS.filter(c => dustN(c.k) > 0).length : MAT()[k] || 0,
    why = !open
      ? `${CAMPN[e[0]]} Lv ${e[1]} 才開`
      : it && k !== 'dust' && k !== 'conv'
        ? lockWhy(it, 'fill') || FORGE[k].ok(it)
        : it
          ? lockWhy(it, 'fill')
          : '',
    on = CRAFT.op === k || (k === 'dust' && CRAFT.op === 'pot'),
    d = k === 'dust' ? FORGE.dust.d : CUR[k].d;
  return `<button class="fcu ${on ? 'on' : ''} ${why && !on ? 'no' : ''} ${n ? '' : 'z'}" data-fg="sel:${k}" ${!open || lockAll ? 'disabled' : ''} aria-pressed="${on}" data-ftip="${esc(nm + '｜' + (open ? d : `還沒開：${CAMPN[e[0]]} Lv ${e[1]} 開始掉。`) + (open && why ? `\n不能用在這件：${why}` : ''))}">${icHTML(ic)}<b>${esc(nm)}</b><small>${!open ? `Lv ${e[1]}` : k === 'dust' ? `${n} 種` : `×${fullN(n)}`}</small></button>`;
}
const curGridHTML = (it, lockAll) =>
  at(98, 'fcg', FCUR.map(r => r.map(k => curCell(k, it, lockAll)).join('')).join(''));
/* 預兆（06 #9）：只列有的；一次 1 顆（鼎改裝粉後，Q-M8），作用在下一顆崇高石或精髓粉 */
function omenHTML(op, y) {
  const M = MAT(),
    have = Object.keys(OMEN_OPS).filter(k => M[k] > 0 || CRAFT.om.includes(k));
  if (!have.length) return '';
  return at(
    y,
    'fom',
    `<b class="fl1">${fterm('預兆')}</b>${have
      .map(k => {
        const on = CRAFT.om.includes(k),
          fit = OMEN_OPS[k].includes(op);
        return `<button class="chip fomc ${on ? 'on' : ''}" data-fg="om:${k}" aria-pressed="${on}" data-ftip="${esc(CUR[k].n + '｜' + CUR[k].d)}" ${fit || on ? '' : 'disabled'}>${icHTML(CUR[k].ic)}${esc(CUR[k].n.split('・')[1])} ×${M[k]}</button>`;
      })
      .join('')}`
  );
}
/* 機率寫成 1/n */
const frac1 = p => (p >= 0.999 ? '全部' : `1/${Math.round(1 / p)}`);
/* 三顆加詞通貨比較（06 #8）：範圍＋頂階機率；選中那列 --sel-bg */
function addCmpHTML(it, op) {
  const b = bestTier(it.L);
  return at(
    262,
    'fpv fpv3',
    `<b>這件最高 T${b}（${fterm('物品等級')} ${it.L}）：三顆加詞通貨比較</b>${['aug', 'exalt', 'zhi']
      .map(k => {
        const o = tierOdds(it, ADD_CUR[k]),
          lo = o[0][0],
          hi = o[o.length - 1][0],
          eq = o.every(x => Math.abs(x[1] - o[0][1]) < 1e-9);
        return `<div class="fpr ${op === k ? 'on' : ''}">${icHTML(CUR[k].ic, '', 16)}<span>${CUR[k].n}</span><span>${lo === hi ? `T${lo}` : `T${lo}～T${hi}`}${eq && o.length > 1 ? ` 各 ${frac1(o[0][1])}` : ''}</span><em>頂階 ${frac1(o[0][1])}</em></div>`;
      })
      .join('')}`
  );
}
/* 可能加入／換成哪些（08、通用） */
function fpvHTML(it, op, arg) {
  const W = forgeWhat(it, op, arg);
  return `${W.out.length ? `<small>換掉：${W.out.map(a => esc(affText(a)) + ' T' + a.T).join('、')}</small>` : ''}${
    W.add.length
      ? `<details class="fpvd"><summary>${op === 'conv' ? '可能換成' : '可能加入'}：${W.add.length} 種 ${esc(W.tier)}（各 ${Math.round(100 / W.add.length)}%）</summary><ul>${W.add.map(k => `<li>${esc(affRangeTxt(k, it))}</li>`).join('')}</ul></details>`
      : `<small>${esc(W.tier)}</small>`
  }`;
}
/* 不夠的原因＋去商會（11 #5、#6） */
const lackHTML = lack =>
  at(290, 'flk', `<span class="c-red">${esc(lack)}</span>`, 16) +
  at(
    328,
    'fshop',
    `<span>商會：材料換通貨（倉房 Lv 4 開）；至臻石不能換</span><button class="btn" data-fg="shop">去商會</button>`
  );
/* 主鈕＋次鈕（每屏一顆主鈕；06 #11、#12） */
const actHTML = (main, sec = '', wide) =>
  `<div class="fx fact ${wide || !sec ? 'w' : ''}" style="--y:480px">${main}${sec}</div>`;
function fillHTML(it) {
  const M = MAT();
  /* 10 雙喜：兩條選一條，選之前其他操作都鎖住 */
  if (it.exOpt)
    return (
      curGridHTML(it, 1) +
      at(224, 'fh', '雙喜：兩條選一條', 20) +
      at(
        256,
        'fjoy',
        it.exOpt
          .map((a, i) => `<button class="fco" data-fg="xp:${i}">${esc(affText(a))} <i>T${a.T}</i></button>`)
          .join('')
      ) +
      at(392, 'fnote c-dim', '選了就加上去；選之前其他操作都鎖住', 16)
    );
  if (CRAFT.op === 'pot') return potHTML(it);
  CRAFT.om = CRAFT.om.filter(k => M[k] > 0 && OMEN_OPS[k].includes(CRAFT.op));
  const op = CRAFT.op,
    f = foreOf(it),
    qc = qualCheck(it),
    qual = qc.k
      ? at(
          428,
          'fqb',
          `<button class="btn fq" data-fg="ql" ${qc.why ? 'disabled' : ''}>${qc.why ? `${CUR[qc.k].n}・${esc(qc.why)}` : `${CUR[qc.k].n}（有 ${M[qc.k]}）・品質 ${Math.round((it.q || 0) * 100)}% → ${Math.round(Math.min(QUAL_CAP, (it.q || 0) + QUAL_STEP) * 100)}%`}</button>`
        )
      : '';
  let body = '';
  if (f) {
    /* 09 預知結果：用掉才真的加上；換裝備或做別的就作廢 */
    const nw = foreNew(f);
    body =
      at(
        224,
        'fpv ffore',
        `<b>預知結果（${esc(curName(f.op, f.arg))}）</b>${nw.map(a => `<span class="fnew">${esc(affText(a))} <i>T${a.T}</i></span>`).join('') || '<span>沒有新的詞</span>'}<small class="c-dim">預知石已經花掉；換裝備或做別的操作就作廢</small>`,
        112
      ) +
      actHTML(
        `<button class="btn pri fgo" data-fg="fu">用掉${esc(curName(f.op, f.arg))}</button>`,
        `<button class="btn fgo2" data-fg="fs">不用</button>`
      );
  } else if (!op)
    body =
      at(224, 'fdo c-dim', '先選一顆通貨，看預覽再用。') +
      actHTML(`<button class="btn fgo off" disabled>先選一顆通貨</button>`);
  else {
    const arg = opArg(op),
      { why, lack } = forgeCheck(it, op, arg, CRAFT.om),
      bad = why || lack,
      fore = op !== 'frac' && op !== 'perf',
      sec = fore
        ? `<button class="btn fgo2" data-fg="fp" ${bad || M.fore < 1 || CRAFT.om.length ? 'disabled' : ''}>${M.fore < 1 ? '預知石不夠' : `先預知　有 ${M.fore}`}</button>`
        : '';
    if (op === 'dust') body = dustHTML(it, arg, why, lack);
    else
      body =
        at(
          op === 'conv' ? 224 : 220,
          'fdo',
          esc(FORGE[op].d) + (op === 'conv' ? (CRAFT.conv == null ? '。先點左邊一條要換的詞' : '') : ''),
          32
        ) +
        (['aug', 'exalt', 'zhi'].includes(op) ? addCmpHTML(it, op) : at(268, 'fpv', fpvHTML(it, op, arg), 112)) +
        (why ? at(392, 'fwhy c-red', esc(why)) : lack ? lackHTML(lack) : '');
    body +=
      (op === 'exalt' || op === 'dust' ? omenHTML(op, op === 'dust' ? 0 : 390) : '') +
      (op === 'dust' ? '' : qual) +
      actHTML(
        `<button class="btn fgo ${bad ? 'off' : 'pri'}" data-fg="op" aria-disabled="${!!bad}">${
          op === 'conv' && CRAFT.conv == null
            ? '先選一條要換的詞'
            : op === 'dust'
              ? `${esc(curName(op, arg))} ×${arg ? dustCost(arg) : 0}　檔 ${String(arg || ':1').split(':')[1]}`
              : `${esc(CUR[op].n)}　有 ${fullN(M[op] || 0)}`
        }</button>`,
        sec
      );
  }
  return curGridHTML(it) + body;
}
/* 07 精髓粉（單用）：選粉＝類別、選檔＝用幾份；不保證頂階 */
function dustHTML(it, arg, why, lack) {
  const [cls, g] = String(arg || '').split(':'),
    b = bestTier(it.L),
    G = DUST_G[g - 1],
    o = G && tierOdds(it, G.w),
    rng = o ? (o.length > 1 ? `T${o[0][0]}～T${o[o.length - 1][0]}` : `T${o[0][0]}`) : '',
    each = o && o.length === 2 ? '各半' : o && o.length > 2 ? `各 ${frac1(o[0][1])}` : '',
    M = MAT();
  return (
    at(
      224,
      'fdg',
      `<b class="fl1">粉</b><span class="fdgg">${ACLS.map(
        c =>
          `<button class="fdc ${cls === c.k ? 'on' : ''} ${dustN(c.k) ? '' : 'z'}" data-fg="du:${c.k}" aria-pressed="${cls === c.k}" data-ftip="${esc(dustName(c.k) + '｜新增 1 條' + c.n + '類的詞。')}">${icHTML(c.ic, '', 16)}${dustName(c.k)} ×${fullN(dustN(c.k))}</button>`
      ).join('')}</span>`
    ) +
    at(
      324,
      'fdt',
      `<b class="fl1">檔</b>${DUST_G.map((x, i) => {
        const ok = !(b >= AFF_T && i);
        return `<button class="fdtb ${+g === i + 1 ? 'on' : ''} ${cls && dustN(cls) < x.k ? 'z' : ''}" data-fg="dg:${i + 1}" ${ok ? '' : 'disabled'} aria-pressed="${+g === i + 1}"><b>檔 ${i + 1}　×${x.k}</b><small>${x.n}</small></button>`;
      }).join('')}`
    ) +
    at(
      372,
      'fpv fdpv',
      `<b class="${lack ? 'c-red' : ''}">${lack ? esc(lack) : cls ? `消耗：${dustName(cls)} ×${G.k}（持有 ${fullN(dustN(cls))}）` : '先選一種粉'}</b>${cls ? `<span>新增 1 條${ACLSI[cls].n}類詞：${rng} ${each}（<em class="c-star">頂階 ${frac1(o[0][1])}</em>）</span>` : ''}<small class="c-dim">不保證頂階</small>${why ? `<small class="c-red">${esc(why)}</small>` : `<small class="c-dim">只能用在魔法／稀有（白裝先用加詞石）</small>`}`
    ) +
    (campCan('cur:v2') && (M.v2 || M.v3)
      ? `<button class="fx flink" style="--y:458px" data-fg="pot">用鼎組合多種粉 ›　三尸鼎 ×${M.v2}・三彭鼎 ×${M.v3}</button>`
      : '')
  );
}
/* 07b 鼎：裝粉＋保留配方；煉製＝重擲全部非破裂詞 */
const POT_CLS = { phys: '物理類', def: '防禦類' };
function potHTML(it) {
  const M = MAT(),
    P = CRAFT.pot,
    hole = POT_HOLE[P.v] || 0,
    { why, lack } = potCheck(it, P),
    bad = why || lack,
    lock = CRAFT.potLock > performance.now(),
    ex = P.s.filter(c => POT_EX[c]).map(c => POT_CLS[POT_EX[c]]);
  return (
    at(
      96,
      'fpot',
      `<button class="btn fpb1" data-fg="sel:dust">‹ 單用粉</button>${['v2', 'v3']
        .map(
          v =>
            `<button class="fpv2 ${P.v === v ? 'on' : ''} ${M[v] ? '' : 'z'}" data-fg="pv:${v}" aria-pressed="${P.v === v}">${icHTML(CUR[v].ic, '', 16)}${CUR[v].n} ${POT_HOLE[v]} 孔 ×${M[v]}</button>`
        )
        .join('')}`
    ) +
    at(
      136,
      'fholes',
      Array.from({ length: 3 }, (_, i) => {
        const c = P.s[i];
        if (i >= hole) return '';
        return c
          ? `<button class="fhole on" data-fg="ph:${i}">${icHTML(ACLSI[c].ic)}<b>${dustName(c)}</b><small>×${POT_N}</small><small class="c-dim">點＝拿出來</small></button>`
          : `<div class="fhole"><b>空孔</b><small class="c-dim">點下面的粉放進來</small></div>`;
      }).join('')
    ) +
    at(
      218,
      'fpal',
      `<p><b>粉</b>　點一下放進下一個空孔</p><span>${ACLS.map(
        c =>
          `<button class="fdc ${P.s.includes(c.k) ? 'on' : ''} ${dustN(c.k) ? '' : 'z'}" data-fg="pd:${c.k}" aria-pressed="${P.s.includes(c.k)}">${icHTML(c.ic, '', 16)}${dustName(c.k)} ×${fullN(dustN(c.k))}</button>`
      ).join('')}</span>`
    ) +
    at(
      328,
      'fpv fppv',
      `<b>結果：重擲全部非破裂詞（條數不變）</b>${P.s.length ? `<span><em class="c-good">↑ ${P.s.map(c => ACLSI[c].n + '類').join('、')} ×${POT_UP}</em>${ex.length ? `　<em class="c-red">✕ ${ex.join('、')}</em>` : ''}</span><span>會用掉：${CUR[P.v].n} ×1、${P.s.map(c => `${dustName(c)} ×${POT_N}`).join('、')}</span><small class="c-dim">${bad ? esc(why || lack) : `照庫存還能洗 ${potLeft(P)} 次`}</small>` : '<small class="c-dim">先放一種粉進鼎孔</small>'}`
    ) +
    at(
      452,
      'fkeep',
      `<button class="fcb ${P.keep ? 'on' : ''}" data-fg="pk" aria-pressed="${!!P.keep}"><i></i><b>保留配方</b></button><span class="c-dim">煉製後同一組留在鼎裡</span>`
    ) +
    actHTML(
      `<button class="btn fgo ${bad || lock ? 'off' : 'pri'}" data-fg="pot1" aria-disabled="${!!(bad || lock)}"><b>${lack ? esc(lack) : '煉製'}</b><small>重擲全部非破裂詞・鼎 ×1・粉 ×${P.s.length * POT_N}</small></button>`,
      `<button class="btn fgo2" data-fg="p0">清空鼎</button>`
    )
  );
}
function temperHTML(it) {
  const w = lockWhy(it, 'temper'),
    c = temperCost(it),
    cs = temperCost(it, 1);
  if (!it.a.length) return at(100, 'fdo', '普通物品沒有詞綴可以淬鍊');
  return (
    at(100, 'fh2', `<b>${fterm('淬鍊')}</b><small class="c-dim">這件已淬鍊 ${it.tmp || 0} 次</small>`, 24) +
    at(
      160,
      'fdo',
      '花金幣，在原階級範圍裡重骰數值；階級與條數不變。破裂詞不動。每淬鍊一次費用增加 10%，最多 2 倍。',
      50
    ) +
    at(
      224,
      'fcost',
      `<span>全體 ${fullN(c)} 金・單條 ${fullN(cs)} 金</span><small class="c-dim">有 ${fullN(S.gold)} 金</small>`
    ) +
    (w ? at(270, 'fwhy c-red', esc(w)) : '') +
    actHTML(
      `<button class="btn fgo ${S.gold < c || w ? 'off' : 'pri'}" data-fg="tmp:all" aria-disabled="${!!(S.gold < c || w)}">${S.gold < c ? `金不夠（要 ${fullN(c)}）` : `全體淬鍊・${fullN(c)} 金`}</button>`
    )
  );
}
function holyHTML(it) {
  const why = holyCheck(it);
  return (
    at(
      128,
      'fdo',
      '每條詞的數值乘上 0.8～1.2 倍，越接近 1 越常見，可以超出階級。之後不能再填詞或淬鍊，仍可腐化。',
      34
    ) +
    at(176, 'fwarn', '一件只能聖化一次，不能復原。', 34) +
    (why ? at(224, 'fwhy c-red', esc(why)) : '') +
    actHTML(
      `<button class="btn fgo ${why ? 'off' : 'pri'}" data-fg="hol" aria-disabled="${!!why}">${CUR.holy.n}　有 ${MAT().holy}</button>`
    )
  );
}
function corrHTML(it) {
  const why = corruptCheck(it),
    tot = CORR_ROLL.reduce((a, b) => a + b[1], 0),
    N = {
      cw1: '1 條腐化詞，不占前後綴',
      sock: '孔 +1，可比部位上限多 1 孔',
      none: '沒有變化，只是鎖定',
      burst: '爆開：這件裝備就沒了'
    };
  return (
    at(98, 'fwarn', '只能腐化一次，之後全部鎖定：不能再填詞、淬鍊、聖化或提升品質。', 44) +
    at(
      154,
      'fodds',
      CORR_ROLL.map(
        ([k, p]) => `<p class="${k === 'burst' ? 'c-red' : ''}"><b>${Math.round((p * 100) / tot)}%</b>${N[k]}</p>`
      ).join(''),
      116
    ) +
    at(280, 'fdo c-dim', '爆開時：稀有物品換回詞綴數一半的崇高石，魔法物品換回 1 顆加詞石，普通物品不留東西。', 50) +
    (why ? at(340, 'fwhy c-red', esc(why)) : '') +
    actHTML(
      `<button class="btn fgo ${why ? 'off' : 'pri'}" data-fg="cor" aria-disabled="${!!why}">${CUR.corr.n}　有 ${MAT().corr}</button>`
    )
  );
}
/* 16 災魘：災魘石／完美災魘石二選一（mumi 11/26）；判官筆可擋一次失敗；17 成功後三選一 */
function calamHTML(it) {
  const M = MAT(),
    perf = CRAFT.perf ? 1 : 0,
    pen = CRAFT.pen && M.pen > 0 ? 1 : 0;
  if (it.calOpt)
    return (
      at(100, 'fh', '成功了：選一組，選了就固定', 20) +
      at(
        132,
        'fcalo',
        it.calOpt
          .map(
            (o, i) =>
              `<button class="fco" data-fg="cp:${i}"><span class="c-good">${esc(calText(o.g))}</span>${o.b ? `<span class="c-red">${esc(calText(o.b, 1))}</span>` : '<span class="c-dim">沒有負面</span>'}</button>`
          )
          .join('')
      ) +
      at(356, 'fnote c-dim', '選了就固定；關掉再開還在', 16)
    );
  const why = it.cor ? calamCheck(it, perf) : '要先腐化',
    nG = Object.keys(CALAM_G).length,
    nB = Object.keys(CALAM_B).length,
    ex = [
      ...Object.entries(CALAM_G)
        .slice(0, 2)
        .map(([k, c]) => [calText({ k, v: c.r[1] }), 'c-good']),
      ...(perf
        ? []
        : Object.entries(CALAM_B)
            .slice(0, 1)
            .map(([k, c]) => [calText({ k, v: c.r[1] }, 1), 'c-red']))
    ];
  return (
    at(
      98,
      'fcst',
      [
        [0, 'calam'],
        [1, 'pcalam']
      ]
        .map(
          ([p, k]) =>
            `<button class="fcs ${perf === p ? 'on' : ''} ${M[k] ? '' : 'z'}" data-fg="cs:${p}" aria-pressed="${perf === p}">${icHTML(CUR[k].ic)}<b>${CUR[k].n}</b><small>×${M[k]}</small></button>`
        )
        .join('')
    ) +
    at(146, 'fdo', perf ? '成功時三選一，每組只有有利；十殿閻羅掉。' : '成功時三選一，每組一條有利＋一條有害。', 34) +
    at(186, 'fwarn', `只能用在${fterm('已腐化')}的裝備，一件只能一組。`, 26) +
    at(
      220,
      'fodds',
      `<p class="c-good"><b>${Math.round(CALAM_OK * 100)}%</b>成功：三選一一組災魘詞</p><p class="${pen ? '' : 'c-red'}"><b>${Math.round((1 - CALAM_OK) * 100)}%</b>${pen ? '失敗：判官筆擋下，沒有變化' : '失敗：裝備毀掉，什麼都不留'}</p>`,
      56
    ) +
    at(
      288,
      'fpn',
      `<button class="fcb ${pen ? 'on' : ''}" data-fg="pn" aria-pressed="${!!pen}" ${M.pen ? '' : 'disabled'}><i></i>用${fterm('判官筆')}</button><small class="c-dim">有 ${M.pen}：勾了不出長按確認</small>`
    ) +
    at(
      336,
      'fpv',
      `<b>可能的災魘詞</b>${ex.map(([t, c]) => `<span class="${c}">${esc(t)}</span>`).join('')}<small class="c-dim">有利 ${nG} 種${perf ? '' : `、有害 ${nB} 種`}</small>`,
      92
    ) +
    actHTML(
      `<button class="btn fgo ${why ? 'off' : 'pri'}" data-fg="cal" aria-disabled="${!!why}">${why === '要先腐化' ? '要先腐化' : `${CUR[perf ? 'pcalam' : 'calam'].n}　有 ${M[perf ? 'pcalam' : 'calam']}`}</button>`
    )
  );
}
/* 鍛造台段的子分頁（05 #9–#11）：只列已開＋下一個（虛線，按了提示）；災魘要瞭望台開鬼門關，沒開不出現 */
const FSUB = [
  ['forge', '填', 'tab:fill'],
  ['temper', '淬鍊', 'tab:temper'],
  ['holy', '聖化', 'tab:holy'],
  ['corr', '腐化', 'tab:corr'],
  ['calam', '災魘', 'tab:calam']
];
function forgeSubHTML(tab) {
  const L = [];
  for (const [k, n, u] of FSUB) {
    if (campCan(u))
      L.push(`<button class="${tab === k ? 'on' : ''}" data-fg="tab:${k}" aria-pressed="${tab === k}">${n}</button>`);
    else {
      if (k !== 'calam') L.push(`<button class="nx" data-fg="nx:${u}" data-tip="${esc(lockTxt(u))}">${n}</button>`);
      break;
    }
  }
  return `<div class="fx fsub" style="--y:50px">${L.join('')}</div>`;
}
function forgeHTML() {
  const it = craftItem(),
    tab = CRAFT.tab,
    a2 = CRAFT.a2 && campCan('auto2') ? auto2HTML() : '';
  /* M2-38：營地只剩總覽（標題「營地」＋靈魂＋可升級幾件）；鍛造是自己的分頁（打造／鍛造台） */
  if (tab === 'camp')
    return `<div class="ph"><b>營地</b><span>${strT('campSoul', { n: abbrH(MAT().soul, 'own') })}${campReady() ? `・${strT('campUp', { n: campReady() })}` : ''}</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div><div class="fmake fcamp">${campHTML()}</div>`;
  if (tab !== 'make' && !FSUB.some(t => t[0] === tab && campCan(t[2]))) CRAFT.tab = 'make';
  if (CRAFT.tab === 'make') return `${forgeHead('make')}<div class="fmake fbody">${makeHTML()}</div>${a2}`;
  if (it && CRAFT.conv != null && !it.a[CRAFT.conv]) CRAFT.conv = null;
  const mode = tab === 'temper' ? 'temper' : tab === 'forge' && CRAFT.op === 'conv' && !it?.exOpt ? 'conv' : 'view',
    hint =
      { forge: CRAFT.op === 'pot' ? '煉製＝重擲全部非破裂詞' : '只能加、不能減', temper: `金 ${fullN(S.gold)}` }[tab] ||
      '',
    R = !it
      ? tab === 'forge'
        ? curGridHTML(null) + actHTML('<button class="btn fgo off" disabled>先放一件裝備</button>')
        : actHTML('<button class="btn fgo off" disabled>先放一件裝備</button>')
      : it.uid
        ? at(100, 'fwhy c-red', '未鑑定：回營地找撿骨師免費鑑定')
        : { forge: fillHTML, temper: temperHTML, holy: holyHTML, corr: corrHTML, calam: calamHTML }[tab](it);
  return `${forgeHead('forge')}<div class="fbody fbench">${forgeSubHTML(tab)}${hint ? at(58, 'fhint2', esc(hint)) : ''}
  <div class="fx fl" style="--y:96px">${cardHTML(it)}${it && !it.uid ? `<div class="fslots">${slotsHTML(it, mode)}</div>` : ''}</div>
  <div class="fr">${R}</div>${CRAFT.log ? at(508, 'flog', esc(CRAFT.log)) : ''}</div>${a2}`;
}
/* 做完一次：寫下拿掉什麼、加了什麼 */
function craftLog(before, it) {
  const out = before.filter(a => !it.a.includes(a)),
    add = it.a.filter(a => !before.includes(a));
  return [
    out.length ? '換掉：' + out.map(affText).join('、') : '',
    add.length ? '加入 ' + add.map(a => affText(a) + ' T' + a.T).join('、') : ''
  ]
    .filter(Boolean)
    .join('；');
}
/* 選裝備（鍛造台開著時，點一下倉庫或身上的裝備） */
function craftPick(src, it, eqk) {
  CRAFT.sel = { src, id: it.id, eqk };
  CRAFT.conv = null;
  CRAFT.potNew = CRAFT.fresh = null;
  foreSkip();
  CRAFT.log = '';
  sfx('equip');
  hudPanels();
}
/* 腐化的結果寫成一句話 */
function corrLog(it, r) {
  return r.res === 'cw1'
    ? '腐化詞：' + r.cw.map(cwText).join('；')
    : r.res === 'sock'
      ? `孔 +1（現在 ${it.so} 孔）`
      : r.res === 'none'
        ? '沒有變化，已鎖定'
        : `裝備爆開了：換得 ${
            Object.entries(r.give)
              .map(([k, n]) => `${n} 顆${CUR[k].n}`)
              .join('、') || '什麼都沒有'
          }`;
}
/* 名詞提示：停 0.4 秒出（forge-spec §7），滑開即關 */
let FTIPT = 0;
document.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse') return;
  const s = e.target.closest('[data-ftip]');
  clearTimeout(FTIPT);
  if (!s) return;
  FTIPT = setTimeout(() => {
    if (!s.isConnected || !s.matches(':hover')) return;
    const [t, d] = s.dataset.ftip.split('｜');
    showTip(
      `<b>${esc(t)}</b>${(d || '')
        .split('\n')
        .map(x => `<p>${esc(x)}</p>`)
        .join('')}<small class="c-dim">停 0.4 秒或按 R3 顯示</small>`,
      s.getBoundingClientRect()
    );
    $('tip').classList.add('ftipb');
  }, 400);
});
document.addEventListener('pointerout', e => {
  const s = e.target.closest('[data-ftip]');
  if (s && !s.contains(e.relatedTarget)) clearTimeout(FTIPT), $('tip').classList.contains('ftipb') && hideTip();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-fg]');
  if (!b || b.disabled) return;
  /* 營地升級的印章：同一顆 300 ms 內重複點不算（§3） */
  const stamp = b.classList.contains('stamp');
  if (stamp) {
    const t = performance.now();
    if (t - (CDR.tap[b.dataset.fg] || -1e9) < 300) return;
    CDR.tap[b.dataset.fg] = t;
  }
  const [k, v, x] = b.dataset.fg.split(':'),
    it = craftItem(),
    op = CRAFT.op,
    arg = opArg(op),
    off = b.getAttribute('aria-disabled') === 'true';
  let err = null;
  const done = (o, before) => {
    CRAFT.fresh = it.a.filter(a => !before.includes(a));
    CRAFT.potNew = null;
    CRAFT.log = '上一次：' + o + '　' + (it.exOpt ? '選一條' : craftLog(before, it) || '完成');
  };
  if (k === 'tab') (CRAFT.tab = v), (CRAFT.op = CRAFT.op === 'pot' ? null : CRAFT.op), sfx('click');
  else if (k === 'nx') err = lockTxt(v);
  else if (k === 'mk') (MK[v] = v === 'T' || v === 'n' || v === 'ink' ? +x : x), sfx('click');
  else if (k === 'go') return craftGo();
  else if (k === 'up') {
    HP_HOLD++;
    closePanels();
    HP_HOLD--;
    return cdOne('forge');
  } else if (k === 'shop') {
    return guildOpen('forge');
  } else if (k === 'a2o') (CRAFT.a2 = 1), sfx('click');
  else if (k === 'a2x') (CRAFT.a2 = 0), save();
  else if (k === 'camp') {
    err = campUp(v);
    if (!err) {
      /* 那一句由 craft.js 的 campUp → sayOnce 講（M1-14） */
      CAMPUI.fx[v] = { t: performance.now() };
      campDust(v);
      sfx('lvup');
      /* 解鎖了東西：分頁列、技能、光環跟著變 */
      ST = stats();
      save();
    }
  } else if (k === 'cc') CAMPUI.open = CAMPUI.open === v ? null : v;
  else if (k === 'jump') {
    /* 從掛機卡、王倒下的卡按「看」：先打開營地 */
    CAMPUI.open = null;
    CRAFT.tab = 'camp';
    if (!PANEL.craft) PORT() ? navGo('craft') : openPanel('craft');
    else changed();
    const el = $('cc-' + v);
    if (el) el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    return;
  } else if (k === 'star') (S.star = +v), save();
  else if (k === 'wt') {
    if (S.camp.wts.length < campN('wts') && WTN[v] && !WT_HIDE.includes(v) && !S.camp.wts.includes(v))
      S.camp.wts.push(v), (MK.wt = v), save();
  } else if (k === 'tr') {
    err = tradeDo(v);
    if (!err) sfx('coin'), save();
  } else if (k === 'a2') (S.auto2[v] = +x), sfx('click');
  else if (k === 'cz') err = '混沌石停用：保留格位，現在不能用';
  else if (k === 'sel') {
    CRAFT.op = CRAFT.op === v && v !== 'dust' ? null : v;
    if (v === 'dust' && !CRAFT.dust) CRAFT.dust = (ACLS.find(c => dustN(c.k)) || ACLS[0]).k + ':1';
    if (v !== 'conv') CRAFT.conv = null;
    foreSkip();
    sfx('click');
  } else if (k === 'du') (CRAFT.dust = v + ':' + (String(CRAFT.dust || ':1').split(':')[1] || 1)), foreSkip();
  else if (k === 'dg') (CRAFT.dust = (String(CRAFT.dust || '').split(':')[0] || ACLS[0].k) + ':' + v), foreSkip();
  else if (k === 'cv') (CRAFT.conv = CRAFT.conv === +v ? null : +v), foreSkip();
  else if (k === 'om') CRAFT.om = CRAFT.om.includes(v) ? [] : [v];
  else if (k === 'pot') (CRAFT.op = 'pot'), (CRAFT.pot.v = MAT().v3 ? 'v3' : 'v2'), foreSkip();
  else if (k === 'pv') (CRAFT.pot.v = v), (CRAFT.pot.s = CRAFT.pot.s.slice(0, POT_HOLE[v]));
  else if (k === 'pd') {
    const P = CRAFT.pot;
    if (P.s.includes(v)) P.s = P.s.filter(c => c !== v);
    else if (P.s.length < POT_HOLE[P.v]) P.s.push(v);
    else err = '鼎孔滿了：先點一個鼎孔拿出來';
  } else if (k === 'ph') CRAFT.pot.s.splice(+v, 1);
  else if (k === 'pk') CRAFT.pot.keep = CRAFT.pot.keep ? 0 : 1;
  else if (k === 'p0') CRAFT.pot.s = [];
  else if (k === 'pot1' && it) {
    if (CRAFT.potLock > performance.now()) return;
    const before = it.a.slice(),
      s = CRAFT.pot.s.slice();
    err = potDo(it, CRAFT.pot);
    if (!err) {
      CRAFT.fresh = null;
      CRAFT.potNew = it.a.filter(a => !before.includes(a) && s.includes(affCls(a.k)));
      CRAFT.log =
        '上一次：煉製　' +
        it.a
          .filter(a => !before.includes(a))
          .map(a => affText(a) + ' T' + a.T)
          .join('・');
      if (!CRAFT.pot.keep) CRAFT.pot.s = [];
      /* 連點防呆：結果 ✦2 以上主鈕鎖 0.5 秒 */
      if (starN(it) >= 2) (CRAFT.potLock = performance.now() + 500), setTimeout(changed, 520);
      sfx('equip');
    }
  } else if (k === 'xp' && it) {
    const pk = it.exOpt && it.exOpt[+v];
    err = omenPick(it, +v);
    if (!err) (CRAFT.log = '雙喜：加入 ' + affText(pk)), sfx('equip');
  } else if (k === 'op' && it) {
    if (op === 'conv' && CRAFT.conv == null) err = '先選一條要換的詞';
    else {
      const before = it.a.slice(),
        om = CRAFT.om.slice();
      err = forgeDo(it, op, arg, om);
      if (!err) {
        done(
          curName(op, arg) + (om.length ? '（' + om.map(x => CUR[x].n.split('・')[1]).join('＋') + '）' : ''),
          before
        );
        CRAFT.om = [];
        sfx('equip');
      }
      if (!err && op === 'conv') CRAFT.conv = null;
    }
    if (err || off) fShake('[data-fg="op"]');
  } else if (k === 'fp' && it) {
    err = forePeek(it, op, arg);
    if (!err) (CRAFT.log = ''), sfx('equip');
  } else if (k === 'fu' && it) {
    const before = it.a.slice(),
      f = foreOf(it);
    err = foreUse(it);
    if (!err) done(curName(f.op, f.arg), before), sfx('equip');
    if (!err && f.op === 'conv') CRAFT.conv = null;
  } else if (k === 'fs') {
    foreSkip();
    CRAFT.log = '沒有用，通貨留著';
  } else if (k === 'ql' && it) {
    err = qualDo(it);
    if (!err) (CRAFT.log = `品質 ${Math.round(it.q * 100)}%`), sfx('equip');
  } else if (k === 'tmp' && it) {
    const i = v === 'all' ? null : +v,
      old = i != null && it.a[i] ? affPct(it.a[i]) : 0;
    err = temperDo(it, i);
    if (!err)
      (CRAFT.log =
        i == null
          ? `淬鍊完成：${it.a.filter(a => !isFrac(it, a)).length} 條重骰`
          : `淬鍊完成：${affText(it.a[i])} ${Math.round(old * 100)}% → ${Math.round(affPct(it.a[i]) * 100)}%`),
        sfx('coin');
  } else if (k === 'hol' && it) {
    err = holyDo(it);
    if (!err) (CRAFT.log = '聖化完成：' + it.a.map(a => '×' + a.m.toFixed(2)).join(' ')), sfx('lvup');
  } else if (k === 'cor' && it) {
    if (!off && holdAsk(b, '腐化', '全部鎖定，之後不能再改。15% 會爆開，這件裝備就沒了。', { cls: 'fhk' })) return;
    const r = corruptDo(it);
    if (r.why) err = r.why;
    else {
      CRAFT.log = corrLog(it, r);
      sfx(r.res === 'burst' ? 'die' : 'lvup');
      if (r.res === 'burst') {
        takeOut(CRAFT.sel.src, it, CRAFT.sel.eqk);
        CRAFT.sel = null;
      }
    }
  } else if (k === 'cs') CRAFT.perf = +v;
  else if (k === 'pn') CRAFT.pen = CRAFT.pen ? 0 : 1;
  else if (k === 'cp' && it) {
    err = calamPick(it, +v);
    if (!err) (CRAFT.log = '災魘詞：' + calText(it.cal.g) + (it.cal.b ? '；' + calText(it.cal.b, 1) : '')), sfx('lvup');
  } else if (k === 'cal' && it) {
    const perf = CRAFT.perf && MAT().pcalam > 0,
      pen = CRAFT.pen && MAT().pen > 0;
    if (!off && !pen && holdAsk(b, '災魘', '失敗會毀掉這件', { cls: 'fhk' })) return;
    const r = calamDo(it, perf, pen);
    if (r.why) err = r.why;
    else {
      CRAFT.pen = 0;
      CRAFT.log =
        r.res === 'ok' ? '成功：選一組災魘詞' : r.res === 'saved' ? '失敗了，判官筆擋下：沒有變化' : '失敗：裝備毀掉了';
      sfx(r.res === 'fail' ? 'die' : 'lvup');
      if (r.res === 'fail') {
        takeOut(CRAFT.sel.src, it, CRAFT.sel.eqk);
        CRAFT.sel = null;
      }
    }
  }
  if (err) hudWarn(err);
  if (stamp) err ? stampNo(b) : buzz(15);
  changed();
  /* 死亡卡上的升級鈕（M1-17）：升完重畫卡片（下一件買得起的接著出來） */
  if (G.state === 'dead' && !$('over').hidden) hudState();
});

/* ---------- 揭曉（03／03b／03c，forge-spec §5）：打造出來的件卡背朝上，點一張翻一張或全部翻開。
   卡 216×216（同物品提示）；6 件以上改 104×104 小方卡、每排 10 張，點一張在第 2 層展開 216 卡。
   ✦2 以上（兩條以上頂階詞，同 items.js midMark）：金框、自動鎖、全部翻開時排最後；不顯示任何分數。
   REV（hud.js）多了：fl 翻了的 id、kp 留著、lk 已鎖、exp 展開的那張、rare 只看稀有以上、auto 自動分解件數 ---------- */
const RV_T = { n: 150, r: 220, pre: 250, boom: 300, stop: 100, shake: 150, gap: 60, gap20: 30 };
const rvBig = () => REV.list.length <= 5;
const rvIn = it => S.inv.items.includes(it);
const rvJack = it => starN(it) >= 2;
/* 這次打開鍛造第幾次打造（第 1 次不能勾跳過動畫） */
const rvSkipOK = () => (CRAFT.made || 0) >= 2;
const rvSkip = () => rvSkipOK() && !!S.rvSkip;
function rvInit(o) {
  Object.assign(REV, {
    fl: new Set(),
    kp: new Set(),
    lk: new Set(),
    exp: null,
    rare: 0,
    auto: o.auto || 0,
    anim: null
  });
  for (const it of REV.list) if (rvJack(it)) REV.lk.add(it.id);
  CRAFT.made = (CRAFT.made || 0) + 1;
}
/* 一張卡的 ▲／▼（跟身上同部位比） */
function rvDelta(it) {
  const e = cmpSlot(it);
  if (!e) return '';
  const d = itemDelta(it, e.k);
  if (d.why) return `<p class="rvd c-red">${esc(d.why)}</p>`;
  const f = (n, v) => {
    const r = Math.round(v);
    return r
      ? `<span class="${r > 0 ? 'c-good' : 'c-red'}">${r > 0 ? '▲' : '▼'} ${n} ${r > 0 ? '+' : '−'}${fullN(Math.abs(r))}</span>`
      : '';
  };
  return `<p class="rvd">${[f('DPS', d.dps[0]), f('生命', d.hp), d.es ? f('護盾', d.es) : ''].filter(Boolean).join('') || '<span class="c-dim">沒有變化</span>'}</p>`;
}
const rvTag = it =>
  REV.lk.has(it.id)
    ? `<button class="rvtag lk" data-rv="lk:${it.id}" data-tip="已鎖：要分解先點「已鎖」解開">已鎖</button>`
    : REV.kp.has(it.id)
      ? `<span class="rvtag">留著</span>`
      : '';
/* 216 卡（正面） */
function rvCard(it, cls = '') {
  const bt = bestTier(it.L),
    gone = !rvIn(it),
    an = REV.anim && REV.anim.id === it.id ? REV.anim.c : '';
  return `<div class="rvc r${it.r} ${rvJack(it) ? 'jk' : ''} ${gone ? 'gone' : ''} ${an} ${cls}" data-rvid="${it.id}">
  <div class="rvh"><div class="it r${it.r} fic">${icHTML(itemIc(it))}${fStar(it)}${fFrac(it)}</div><div><b class="rc${it.r}">${esc(itemName(it))}</b><small>${RARN[it.r]}・${fterm('物品等級')} ${it.L}</small></div>${rvTag(it)}</div>
  <ul class="rvaf">${
    it.a
      .slice()
      .sort((a, b) => a.T - b.T)
      .slice(0, 3)
      .map(
        a =>
          `<li><i class="fst">${a.T <= bt ? CH_STAR : ''}</i><span>${esc(affText(a))}</span><i class="ftt">T${a.T}</i></li>`
      )
      .join('') || '<li class="c-dim">沒有詞綴</li>'
  }</ul>${gone ? `<p class="rvd c-dim">${it.salv ? '已分解' : '換上了'}</p>` : rvDelta(it)}
  <div class="rvb">${
    gone
      ? ''
      : `<button class="btn pri" data-rv="wear:${it.id}" ${cmpSlot(it) && !eqLack(S, it, cmpSlot(it).k).length ? '' : 'disabled'}>換上</button><button class="btn ${REV.kp.has(it.id) ? 'on' : ''}" data-rv="kp:${it.id}" aria-pressed="${REV.kp.has(it.id)}">留著</button><button class="btn" data-rv="sv:${it.id}" ${REV.lk.has(it.id) ? 'disabled' : ''}>分解</button>`
  }</div></div>`;
}
function rvBack(it, big) {
  const an = REV.anim && REV.anim.id === it.id ? REV.anim.c : '';
  return `<button class="rvk ${big ? '' : 'sm'} ${it.r === 2 ? 'hi' : ''} ${an}" data-rv="fl:${it.id}" aria-label="翻開"><b>?</b>${big ? `<small>點一下翻開</small>${it.r === 2 ? '<small class="c-rare">亮邊：稀有以上</small>' : ''}` : ''}</button>`;
}
function rvSmall(it) {
  return `<button class="rvs r${it.r} ${rvJack(it) ? 'jk' : ''} ${REV.exp === it.id ? 'sel' : ''} ${rvIn(it) ? '' : 'gone'}" data-rv="ex:${it.id}">${icHTML(itemIc(it))}${fStar(it)}<b class="rc${it.r}">${RARN[it.r]}</b>${REV.lk.has(it.id) ? '<i class="rvtag lk">已鎖</i>' : REV.kp.has(it.id) ? '<i class="rvtag">留著</i>' : ''}</button>`;
}
/* 其餘分解：跳過留著與已鎖；沒翻的先翻開再分解（不分解沒看過的） */
const rvRest = () => REV.list.filter(it => rvIn(it) && !REV.kp.has(it.id) && !REV.lk.has(it.id));
function rvCraftHTML() {
  const L = REV.list,
    n = L.length,
    big = rvBig(),
    fl = L.filter(it => REV.fl.has(it.id)).length,
    rest = rvRest(),
    rr = rest.some(it => it.r === 2),
    sv = rest.reduce((a, it) => salvAdd(a, salvValue(it)), salvZero()),
    all = fl >= n,
    show = L.filter(it => !REV.rare || it.r === 2 || !REV.fl.has(it.id)),
    ex = !big && REV.exp != null && L.find(it => it.id === REV.exp && REV.fl.has(it.id)),
    exI = ex ? show.indexOf(ex) : -1;
  return `<div class="rvbox ${big ? 'big' : 'smc'} ${n === 1 ? 'one' : ''}">
  <div class="rvhd"><b>${esc(REV.title)}</b><small>已翻 ${fl}／${n}・已鎖 ${REV.lk.size}・留著 ${REV.kp.size}${REV.auto ? `・自動分解 ${REV.auto}` : ''}</small>${big ? '' : `<button class="btn rvrare ${REV.rare ? 'on' : ''}" data-rv="rare" aria-pressed="${!!REV.rare}">只看稀有以上</button>`}<button class="x" aria-label="關閉" data-rv="take">${ICO.x}</button></div>
  <div class="rvg">${show.map(it => (REV.fl.has(it.id) ? (big ? rvCard(it) : rvSmall(it)) : rvBack(it, big))).join('')}${
    ex ? `<div class="rvex" style="--c:${exI % 10};--r:${Math.floor(exI / 10)}">${rvCard(ex, 'sel')}</div>` : ''
  }</div>
  ${big ? '' : '<p class="rvn c-dim">右上 ✦n＝頂階詞條數　金框＝✦2 以上（自動鎖）　亮邊卡背＝稀有以上　下方標＝已鎖／留著</p>'}
  <div class="rvft"><button class="fcb rvsk ${rvSkip() ? 'on' : ''}" data-rv="skip" ${rvSkipOK() ? '' : 'disabled'} aria-pressed="${rvSkip()}"><i></i><span>跳過動畫<small>連刷第 2 次起可開；✦2 以上照樣金框、自動鎖</small></span></button>
  <button class="btn rvall" data-rv="take">全部收下</button>
  <button class="btn rvrest ${rr ? 'hold' : ''}" data-rv="rest" ${rest.length ? '' : 'disabled'}><b>${rr ? '其餘分解（含稀有，長按確認）' : '其餘分解'}</b><small>${rest.length} 件・${esc(salvText(sv).split('、').slice(0, 2).join('・'))}</small><i class="rvp"></i></button>
  <button class="btn pri rvflip" data-rv="${all ? 'take' : 'flip'}">${all ? '全部收下' : '全部翻開（Space）'}</button></div>
  <p class="rvrule c-dim">其餘分解：跳過「留著」與已鎖的卡；沒翻的先翻開再分解（不分解沒看過的）。${big ? '' : '展開卡的按鈕同上：換上／留著／分解；Esc 或點空白收回。'}</p></div>`;
}
/* 翻一張：普通／魔法 150、稀有 220；✦2 以上 ① 預熱 250 → ② 爆開 300 → ③ 頓幀 → ④ 輕震 150 → ⑤ 定格。跳過動畫或減少動態時直接定格 */
function rvFlip(it, cb) {
  if (REV.fl.has(it.id)) return cb && cb();
  const go = () => (REV.fl.add(it.id), (REV.anim = null), hudPanels(), cb && cb());
  if (rvSkip() || reduced()) {
    if (rvJack(it)) sfx('star');
    return go();
  }
  const step = (c, ms, next) => ((REV.anim = { id: it.id, c }), hudPanels(), setTimeout(next, ms));
  if (rvJack(it))
    return step('pre', RV_T.pre, () => {
      REV.fl.add(it.id);
      sfx('star');
      step('boom', RV_T.boom + RV_T.stop, () => {
        const b = $('preveal');
        if (b.animate)
          b.animate(
            { transform: ['translate(0,0)', 'translate(-3px,2px)', 'translate(3px,-2px)', 'translate(0,0)'] },
            RV_T.shake
          );
        buzz(30);
        setTimeout(go, RV_T.shake);
      });
    });
  sfx(it.r === 2 ? 'flipRare' : 'flip');
  REV.fl.add(it.id);
  step(it.r === 2 ? 'fr' : 'fn', it.r === 2 ? RV_T.r : RV_T.n, go);
}
/* 全部翻開：每張隔 60 ms（20 件 30 ms），✦2 以上排最後、前面停一下 */
function rvFlipAll(cb) {
  const L = REV.list.filter(it => !REV.fl.has(it.id)).sort((a, b) => rvJack(a) - rvJack(b)),
    gap = REV.list.length > 10 ? RV_T.gap20 : RV_T.gap;
  let i = 0;
  const nx = () => {
    if (!PANEL.ident) return;
    if (i >= L.length) return cb && cb();
    const it = L[i++],
      pause = rvJack(it) && i > 1 ? 200 : 0;
    if (rvSkip() || reduced()) return rvFlip(it), nx();
    setTimeout(() => {
      if (rvJack(it)) rvFlip(it, nx);
      else rvFlip(it), setTimeout(nx, gap);
    }, pause);
  };
  nx();
}
function rvSalv(L) {
  const sv = salvZero();
  for (const it of L) if (rvIn(it)) takeOut('inv', it), (it.salv = 1), salvAdd(sv, salvageDo(it));
  if (sv.n) hudWarn(`分解 ${sv.n} 件：${salvText(sv)}`), sfx('coin');
}
function rvRestDo() {
  const L = rvRest();
  rvFlipAll(() => (rvSalv(L), changed()));
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-rv]');
  if (!b || b.disabled || !PANEL.ident) return;
  const [k, v] = b.dataset.rv.split(':'),
    it = v && REV.list.find(x => x.id === +v);
  if (k === 'fl' && it) return rvFlip(it);
  if (k === 'flip') return rvFlipAll();
  if (k === 'take') return closePanels(), hudPanels();
  if (k === 'rest') {
    /* 含稀有：長按（pointer 事件處理），點一下不算 */
    if (b.classList.contains('hold') && !b.dataset.ok) return hudWarn('含稀有：長按 0.6 秒才分解');
    return rvRestDo();
  }
  if (k === 'ex') REV.exp = REV.exp === +v ? null : +v;
  else if (k === 'rare') REV.rare = REV.rare ? 0 : 1;
  else if (k === 'skip') S.rvSkip = S.rvSkip ? 0 : 1;
  else if (k === 'lk') REV.lk.has(+v) ? REV.lk.delete(+v) : REV.lk.add(+v);
  else if (k === 'kp') REV.kp.has(+v) ? REV.kp.delete(+v) : REV.kp.add(+v);
  else if (k === 'wear' && it) equipTo(it, cmpSlot(it).k), sfx('equip');
  else if (k === 'sv' && it) rvSalv([it]);
  sfx('click');
  changed();
});
/* 其餘分解含稀有：按住 600 ms（HOLD_MS），底部進度條跑滿才執行；放手＝取消 */
let RVH = 0;
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.rvrest.hold');
  if (!b || b.disabled) return;
  e.preventDefault();
  b.classList.add('ing');
  RVH = setTimeout(() => {
    RVH = 0;
    b.classList.remove('ing');
    rvRestDo();
  }, HOLD_MS);
});
for (const ev of ['pointerup', 'pointerleave', 'pointercancel'])
  document.addEventListener(
    ev,
    e => {
      if (!RVH || (ev === 'pointerleave' && !(e.target.classList && e.target.classList.contains('rvrest')))) return;
      clearTimeout(RVH);
      RVH = 0;
      for (const b of document.querySelectorAll('.rvrest.ing')) b.classList.remove('ing');
    },
    true
  );
/* Space＝全部翻開；Esc＝收回展開卡 */
addEventListener('keydown', e => {
  if (!PANEL.ident || !REV.craft || HASK) return;
  if (e.key === ' ' && !e.repeat) e.preventDefault(), rvFlipAll();
  else if (e.key === 'Escape' && REV.exp != null)
    e.preventDefault(), e.stopImmediatePropagation(), (REV.exp = null), changed();
});
