/* dungeonPOE · 鍛造台面板（0.2.72 重做，企劃書 5.3）：藏身處的鍛造台打開（左邊），背包在右邊。
   點一下背包或身上的裝備＝放上鍛造台；分頁：填（通貨，只能加）、淬鍊（金幣）、聖化、腐化。
   每個按鈕都寫要花什麼、預覽會發生什麼；不能按的寫原因；推薦的標「推薦」。材料頁在倉庫的「材料」分頁 */
'use strict';
const CRAFT = { tab: 'camp', op: null, ess: null, conv: null, sel: null, log: '', perf: 0, pen: 0, om: [] };
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
const chipB = (fg, on, t) =>
  `<button class="chip ${on ? 'on' : ''}" data-fg="${fg}" aria-pressed="${!!on}">${t}</button>`;
function makeHTML() {
  const { sys, tiers, ns } = mkOpts(),
    b = craftBase(MK.kind, MK),
    c = craftCost(b, MK.T),
    lack = craftLack(c, MK.n),
    [w, bl, y] = craftRarP(S.camp.forge),
    costTxt =
      Object.entries(c.mats)
        .map(([m, n]) => `${matName(m, MK.T)} ×${n * MK.n}`)
        .join('、') + (c.gold ? `、${c.gold * MK.n} 金` : ''),
    kinds = MK_KINDS.filter(([k]) => mkKindOK(k))
      .map(([k, n]) => {
        const bb = craftBase(k, { sys: k === MK.kind ? MK.sys : '', wt: MK.wt, T: MK.T });
        return `<button class="shopb ${MK.kind === k ? 'on' : ''}" data-fg="mk:kind:${k}" aria-pressed="${MK.kind === k}">${icHTML(bb ? bb.ic : '')}<span>${n}</span></button>`;
      })
      .join('');
  return `${campCardHTML('forge')}${wtPickHTML()}
  <div class="ph2">打造<span>材料 → 一件裝備，翻出來立刻跟身上比</span></div>
  <div class="shopg mk">${kinds}</div>
  ${MK.kind === 'weapon' && S.camp.wts.length > 1 ? `<div class="bagf" role="group" aria-label="武器類別">${S.camp.wts.map(wt => chipB(`mk:wt:${wt}`, MK.wt === wt, WTN[wt])).join('')}</div>` : ''}
  ${sys.length > 1 ? `<div class="bagf" role="group" aria-label="系">${sys.map(s => chipB(`mk:sys:${s}`, MK.sys === s, SYSN[s])).join('')}</div>` : ''}
  <div class="bagf" role="group" aria-label="材料的階與數量">${(tiers.length ? tiers : [1])
    .map(T =>
      chipB(
        `mk:T:${T}`,
        MK.T === T,
        `T${T}<small>${Object.keys(c.mats)
          .map(m => `${matName(m, T)} ${fmtN(matN(m, T))}`)
          .join('／')}</small>`
      )
    )
    .join(
      ''
    )}${ns.length > 1 ? `<span class="sep"></span>${ns.map(n => chipB(`mk:n:${n}`, MK.n === n, `${n} 件`)).join('')}` : ''}</div>
  <div class="mkpv"><div class="it r0 fic">${icHTML(b.ic)}</div><div><b>${esc(b.n)}</b><small>物品等級 ${matIlvl(MK.T)}${MK.sys ? `・${SYSN[MK.sys]}` : ''}・普通 ${w}%・魔法 ${bl}%${y ? `・<span class="rc2">稀有 ${y}%</span>` : ''}</small>${y ? `<small>再 ${Math.max(0, prdMax(y / 100) - (S.prd.craftR || 0))} 件沒出稀有，下一件必出</small>` : ''}</div></div>
  ${
    campCan('cur:ink') && MAT().ink >= 1 && Object.keys(MEM).some(k => MEM[k].on(b))
      ? `<div class="bagf" role="group" aria-label="追憶之墨">${chipB(`mk:ink:${MK.ink ? 0 : 1}`, MK.ink, `加一瓶追憶之墨（有 ${MAT().ink}）`)}<span class="c-dim">這一批第一件保證一條追憶</span></div>`
      : ''
  }${auto2HTML()}
  <div class="mkgo"><button class="btn pri fgo" data-fg="go" ${lack ? 'disabled' : ''}>${lack ? esc(lack) : `打造 ${MK.n} 件・${esc(costTxt)}`}</button></div>`;
}
/* 自動分解規則（鍛造台 Lv8 照稀有度、Lv14 加詞階／追憶／▲）：打造出來不留的直接分解 */
function auto2HTML() {
  if (!campCan('auto2')) return '';
  const A = S.auto2;
  return `<div class="ph2">自動分解<span>打造出來不留的直接分解</span></div>
  <div class="bagf" role="group" aria-label="照稀有度">${[
    [0, '全部留'],
    [1, '分解普通'],
    [2, '只留稀有'],
    [3, '不照稀有度']
  ]
    .filter(([v]) => v < 3 || campCan('auto2t'))
    .map(([v, t]) => chipB(`a2:r:${v}`, A.r === v, t))
    .join('')}</div>
  ${
    campCan('auto2t')
      ? `<div class="bagf" role="group" aria-label="另外留"><span class="c-dim">另外留</span>${[1, 2, 3].map(t => chipB(`a2:t:${A.t === t ? 0 : t}`, A.t === t, `有 T${t} 詞`)).join('')}${chipB(`a2:mem:${A.mem ? 0 : 1}`, A.mem, '追憶')}${chipB(`a2:up:${A.up ? 0 : 1}`, A.up, '▲ 比身上好')}</div>`
      : ''
  }`;
}
/* ---------- 營地總覽（0.5.1，工坊與解鎖表第 3 節、增量遊戲精髓 5.3；0.5.4 照 docs/介面考核_0.5.3.md 重做）：
   固定順序——庫存列（資源條）與「下一件事」黏在上面、產生器四張（標題列有 ×1／×10／最大）、解鎖表六張；不照買得起重排，買得起的卡左邊一條金邊、鈕亮。
   卡片兩種同一個框：產生器卡 genCardHTML（主數字＝每分鐘產量、資源在跑的條、金色細條＝到下一個里程碑、工位人影、升級鈕 ×1／×10／最大）、
   解鎖表卡 campCardHTML（主數字＝下一級解鎖什麼、鈕的底色＝材料湊齊幾成）。點卡的標題＝展開那一座（民房的工位、倉房的商會、斥候營的星級、祭壇開了什麼…）。
   會跑的東西（資源條、數字、鈕的底色、滾數字）每格由 rbTick 只改 transform 與文字，不重畫卡；卡片每秒只補畫字變了的（campRefresh） ---------- */
const CAMPUI = { mul: 1, open: null, fx: {}, wt: {}, w: {} };
const CAMP_B = ['forge', 'watch', 'scout', 'house', 'altar', 'store'];
/* 資源條的數字：1 萬以上縮寫（671k、2.64M），兩欄才放得下 */
const fmtC = n => (n >= 1e6 ? +(n / 1e6).toPrecision(3) + 'M' : n >= 1e4 ? +(n / 1e3).toPrecision(3) + 'k' : fmtN(n));
const fmtR = v => (v >= 10 ? fmtC(Math.round(v)) : +v.toFixed(1));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/* 「還要多久」寫成一句：算得出來寫「還要 N 分・缺 X 12」、算不出來（沒在刷、沒有人做）只寫缺什麼（只寫最慢那一項） */
const etaTxt = e =>
  !e || e.m === 0
    ? ''
    : e.m === Infinity
      ? `缺${e.nm} ${fmtN(e.d)}`
      : `還要 ${Math.max(1, Math.ceil(e.m))} 分・缺${e.nm} ${fmtN(e.d)}`;
/* M1-18／BASE-05：買不起的鈕寫「缺靈魂 n」（只寫最慢那一項） */
const lackTxt1 = e => (e && e.nm ? `缺${e.nm} ${fmtN(e.d)}` : '');
const costTxt = c =>
  costRows(c)
    .map(([nm, , w]) => `${nm} ${fmtN(w)}`)
    .join('・');
/* 產生器這一次按下去買幾級：×1、×10、最大（買得起的全部；一級都買不起時照 1 級算缺多少） */
const genN = k => (CAMPUI.mul === 'max' ? Math.max(1, genAfford(k)) : CAMPUI.mul);
/* 所有可以按的東西：[鍵, 費用, 這一下給什麼]；產生器照 ×1 算 */
function campThings() {
  const L = [];
  for (const b of CAMP_B) {
    const n = campNext(b);
    if (n) L.push({ k: b, c: n, n: `${CAMPN[b]} Lv ${n.lv}`, d: n.d });
  }
  for (const k of GEN_K)
    if (genOn(k)) {
      const L1 = genOf(k).lv + 1,
        ms = genNextMs(k);
      L.push({
        k,
        c: genCost(k),
        n: `${GEN[k].n} Lv ${L1}`,
        d: ms && ms.at === L1 ? ms.t : `每分鐘 +${fmtR(genRate1(k))}`
      });
    }
  for (const t of L) t.e = costEta(t.c);
  return L;
}
/* 升一級多產多少（每分鐘） */
function genRate1(k) {
  const g = genOf(k),
    W = popAssign(),
    s = genSlots(k),
    f = s ? W[k] / s : 0;
  return GEN[k].r * f * ((g.lv + 1) * genMs(g.lv + 1).m - g.lv * genMs(g.lv).m);
}
/* 下一件事：最快能按的那一個（{ k, n, d, e }）；都升滿了回 null */
function campNextThing() {
  const L = campThings();
  return L.length ? L.reduce((a, b) => (b.e.m < a.e.m ? b : a)) : null;
}
/* ---------- 資源條（0.5.4，考核 A1、F2）：圖示＋名字＋庫存＋「這一單位的進度」條＋「+N／分」。
   key＝材料鍵（'wood'、'iron:2'…）或 'soul'。HTML 只有骨架（卡片的字不會因為數字一直變），數字、條、速率由 rbTick 每格填；
   速率 ≥240／分（每秒 4 格以上）條改成流動的常亮條（.flow）。add：離線卡用，不跑、只寫 +N ---------- */
const RB_FLOW = 240;
const rbIc = key => (key === 'soul' ? CAMP_IC.soul : MATS[matOf(key)[0]].ic);
const rbName = key => (key === 'soul' ? '靈魂' : matName(...matOf(key)));
function genBarHTML(key, add) {
  return add != null
    ? `<div class="rbar st">${icHTML(rbIc(key), '', 16)}<span class="rn">${esc(rbName(key))}</span><b>+${fmtN(add)}</b></div>`
    : `<div class="rbar" data-rb="${key}">${icHTML(rbIc(key), '', 16)}<span class="rn">${esc(rbName(key))}</span><b></b><small></small><i class="rt"><i></i></i></div>`;
}
/* 這個材料鍵是哪一座產生器正在產的（條的進度＝那一座的 acc）；靈魂、沒在產的階回 null */
const rbGen = key => {
  if (key === 'soul') return null;
  const [m, T] = matOf(key);
  return GEN[m] && genOn(m) && genTier(m) === T ? m : null;
};
/* 靈魂的條：每滿「一分鐘的量」跑一圈（本次掛機拿到的 ÷ 速率的餘數）；沒在刷是空的 */
const soulAcc = r => (r > 0 && typeof SES !== 'undefined' && SES ? (SES.soul % r) / r : 0);
const RB = { t: 0, R: null, sr: 0, rm: false };
const RB_EL = document.getElementsByClassName('rbar'),
  RG_EL = document.getElementsByClassName('rtg'),
  RF_EL = document.getElementsByClassName('cfill'),
  RO_EL = document.getElementsByClassName('nroll');
/* 數字 +1 跳一下：一分鐘會跳幾十次，所以小（1.12）而快（200 毫秒、強 ease-out）；流動條與減少動態時不跳 */
const POP = [{ transform: 'scale(1.12)', color: '#7fc95a' }, { transform: 'scale(1)' }],
  POP_T = { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' };
const fill = (f, p) => {
  const s = `scaleX(${Math.max(0, Math.min(1, p)).toFixed(3)})`;
  if (f._s !== s) f.style.transform = f._s = s;
};
/* 每格（game.js 的 frame）：只改 transform 與文字；速率、鈕的底色每 0.5 秒算一次 */
function rbTick() {
  if (!RB_EL.length && !RG_EL.length && !RF_EL.length && !RO_EL.length) return;
  const now = performance.now(),
    slow = !RB.R || now - RB.t > 500;
  if (slow) (RB.t = now), (RB.R = genRates()), (RB.sr = soulRate()), (RB.rm = reduced());
  for (const el of RB_EL) {
    const key = el.dataset.rb;
    if (!key) continue;
    if (!el._b)
      (el._b = el.querySelector('b')), (el._sm = el.querySelector('small')), (el._f = el.querySelector('.rt i'));
    const soul = key === 'soul',
      v = Math.floor(soul ? MAT().soul : matN(...matOf(key))),
      gk = rbGen(key);
    if (el._v !== v) {
      const up = el._v != null && v > el._v;
      el._b.textContent = fmtC((el._v = v));
      if (up && !el._flow && !RB.rm) el._b.animate(POP, POP_T);
    }
    if (slow || el._r == null) {
      const r = soul ? RB.sr : RB.R[key] || 0,
        t = r > 0 ? `+${fmtR(r)}／分` : '';
      el._r = r;
      if (el._rt !== t) el._sm.textContent = el._rt = t;
      const fl = r >= RB_FLOW;
      if (el._flow !== fl) el.classList.toggle('flow', (el._flow = fl));
    }
    if (!el._flow) fill(el._f, soul ? soulAcc(el._r) : gk ? genOf(gk).acc || 0 : 0);
  }
  /* 產生器卡裡的條（只有條） */
  for (const el of RG_EL) {
    const k = el.dataset.rg;
    if (!el._f) el._f = el.firstElementChild;
    if (slow || el._flow == null) {
      const fl = (RB.R[matKey(k, genTier(k))] || 0) >= RB_FLOW;
      if (el._flow !== fl) el.classList.toggle('flow', (el._flow = fl));
    }
    if (!el._flow) fill(el._f, genOf(k).acc || 0);
  }
  /* 升級鈕的底色＝材料湊齊幾成（最慢那一項）：data-fg 是 gen:鍵:幾級 或 camp:設施 */
  for (const el of RF_EL)
    if (slow || el._p == null) {
      const [t, k, n] = el.dataset.fg.split(':'),
        c = t === 'gen' ? genCost(k, +n || 1) : campNext(k);
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
    el.textContent = '+' + (Number.isInteger(a) && Number.isInteger(b) ? fmtN(Math.round(x)) : fmtR(x));
    if (p >= 1) el.classList.remove('nroll');
  }
}
/* 庫存列：木、這一階的鐵（皮、靈絲出現了才有）、靈魂；靈魂只在這裡（考核 A10） */
function campTopHTML() {
  const keys = ['wood', ...GEN_K.filter(k => k !== 'wood' && genOn(k)).map(k => matKey(k, genTier(k)))];
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
  return `<div class="cmnext ${ok ? 'can' : ''}" id="${id}">${icHTML(CAMP_IC[t.k])}<span><b>${esc(t.n)}</b>${t.d ? `<small class="d">${esc(t.d)}</small>` : ''}<small>${ok ? (more > 0 ? `另外 ${more} 件也買得起` : '下一件事') : esc(etaTxt(t.e))}</small></span>${ok ? `<button class="btn pri" data-fg="${GEN[t.k] ? `gen:${t.k}:1` : `camp:${t.k}`}">升級<small>${esc(costTxt(t.c))}</small></button>` : `<button class="btn" data-fg="jump:${t.k}">看</button>`}</div>`;
}
/* 演出（3 節開頭）：升級那一下卡片亮一下、主數字滾、旁邊浮「+N／分」；里程碑金邊。1.2 秒內畫，減少動態時 CSS 不動、數字直接換 */
const ccFx = k => {
  const f = CAMPUI.fx[k];
  return f && performance.now() - f.t < 1200 ? f : null;
};
/* 工位畫成人影（考核 A3）：一個工位一個小人，在職亮、空的暗；民房升級補上人那一下，新亮的那個跳一下（1.5 秒） */
function wkHTML(k, W, s) {
  const o = CAMPUI.w[k],
    now = performance.now();
  if (o != null && W > o) CAMPUI.wt[k] = { t: now, from: o };
  CAMPUI.w[k] = W;
  const nw = CAMPUI.wt[k] && now - CAMPUI.wt[k].t < 1500 ? CAMPUI.wt[k].from : W,
    man = iconURL('i_man');
  return `<span class="wk" role="img" aria-label="${W}／${s} 人">${Array.from(
    { length: s },
    (_, i) => `<img class="${i < W ? 'on' : ''} ${i >= nw && i < W ? 'new' : ''}" src="${man}" alt="">`
  ).join('')}</span>`;
}
/* 上一個里程碑在第幾級（金色細條從那裡開始算） */
function genMs0(L) {
  const a = JSON.stringify(genMs(L));
  for (let x = L; x > 0; x--) if (JSON.stringify(genMs(x - 1)) !== a) return x;
  return 0;
}
function genCardHTML(k) {
  const g = genOf(k),
    W = popAssign(),
    s = genSlots(k),
    T = genTier(k),
    ms = genNextMs(k),
    n = genN(k),
    c = genCost(k, n),
    e = costEta(c),
    ok = e.m === 0,
    msAt = ms && ms.at <= g.lv + n,
    f = ccFx(k),
    top = genTierTop(k),
    r = genRate(k, W),
    roll = f && f.to != null && !reduced() && performance.now() - f.t < 300,
    m0 = genMs0(g.lv),
    mp = ms ? Math.round((100 * (g.lv - m0)) / (ms.at - m0)) : 100;
  return `<div class="paper camp cc gen ${ok ? 'can' : ''} ${f ? 'up' : ''} ${f && f.ms ? 'ms' : ''}" id="cc-${k}">
  <button class="cch" data-fg="cc:${k}" aria-expanded="${CAMPUI.open === k}">${icHTML(CAMP_IC[k])}<b>${GEN[k].n}</b><span>Lv ${g.lv}</span>${wkHTML(k, W[k], s)}${ICO.down}</button>
  ${ms ? `<div class="ccm" role="progressbar" aria-label="到下一個里程碑" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${mp}"><i style="--m:${mp}%"></i></div><div class="ccml"><span>Lv ${ms.at}：${esc(ms.t)}</span><span>總共產了 ${fmtN(g.tot || 0)}</span></div>` : ''}
  <div class="ccbig"><small>每分鐘</small><b class="${roll ? 'nroll' : ''}" ${roll ? `data-r="${f.from}:${f.to}:${f.t}"` : ''}>+${fmtR(roll ? f.from : r)}</b><small>${matName(k, T)}</small>${f && f.add ? `<em class="ccfl">${esc(f.add)}</em>` : ''}</div>
  <i class="rt rtg" data-rg="${k}"><i></i></i>
  ${!W[k] ? '<p class="cchint">升民房就有人來做</p>' : W[k] < s ? `<p class="cchint">升民房再來 ${s - W[k]} 個人</p>` : ''}
  <button class="btn ${ok ? 'pri' : ''} wide cfill" data-fg="gen:${k}:${n}" ${ok ? '' : 'disabled'}>${ok ? `升 ${n} 級・${esc(costTxt(c))}` : esc(lackTxt1(e))}${msAt ? `<em class="ccms">${esc(ms.t)}</em>` : ''}</button>
  ${
    CAMPUI.open === k && top > 1
      ? `<div class="ccopen"><div class="bagf" role="group" aria-label="產幾階">${Array.from(
          { length: top },
          (_, i) => top - i
        )
          .map(t => chipB(`gt:${k}:${top - t}`, T === t, `T${t}`))
          .join('')}</div><p class="sub">要低階材料時往下調</p></div>`
      : ''
  }</div>`;
}
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
      ? `<div class="ccbig sm">下一級：${esc(n.d)}</div>
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
  if (b === 'house') {
    const W = popAssign();
    return `<div class="ccopen"><p class="sub">人口 ${campN('pop')}・居民自動補到空的工位（有「優先」的先）</p>${GEN_K.filter(
      genOn
    )
      .map(
        k =>
          `<div class="row2"><span>${GEN[k].n} ${W[k]}／${genSlots(k)} 人</span>${chipB(`pri:${k}`, genOf(k).pri, '優先')}</div>`
      )
      .join('')}</div>`;
  }
  if (b === 'altar')
    return `<div class="ccopen"><p class="sub">技能格 ${campN('slots')}・輔助孔 ${campN('holes')}${campCan('tree') ? '・天賦樹' : ''}${campCan('aura') ? '・光環' : ''}${campCan('asc') ? '・昇華' : ''}${campCan('jsock') ? '・珠寶孔' : ''}</p></div>`;
  if (b === 'store')
    return `<div class="ccopen"><p class="sub">離線結算上限 ${campN('off')} 小時・分解回收 ${Math.round(salvRate() * 100)}%</p>${storeHTML()}</div>`;
  return '';
}
/* 商會（倉房 Lv4，⚠️ 固定匯率）：同一種材料 5 個低一階 → 1 個高一階（高一階超過 tierCap() 的列出但鎖住）；鐵 20（最高階）→ 1 顆蛻變石；1 顆蛻變石 → 木 50 */
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
  const L = tradeList(),
    seen = {},
    why = L.filter(x => x.why && !seen[x.g[0]] && (seen[x.g[0]] = 1)).map(x => `<p class="sub">${x.why}</p>`);
  return `<div class="ph2">商會<span>固定匯率</span></div><div class="bagf">${
    L.map((x, i) => {
      const t = `${matName(x.g[0], x.g[1])} ×5 → ${matName(x.t[0], x.t[1])}`;
      return x.why
        ? `<button class="chip" data-fg="tr:${i}" aria-pressed="false" disabled title="${x.why}">${t}</button>`
        : chipB(`tr:${i}`, 0, t);
    }).join('') || '<span class="c-dim">同一階的材料有 5 個才能換高一階</span>'
  }${matN('iron', tierCap()) >= 20 ? chipB('tr:cur', 0, `${matName('iron', tierCap())} ×20 → 蛻變石`) : ''}${MAT().tran >= 1 ? chipB('tr:wood', 0, '蛻變石 → 木 50') : ''}</div>${why.join('')}`;
}
function tradeDo(i) {
  if (i === 'cur') {
    if (matN('iron', tierCap()) < 20) return '鐵不夠';
    matAdd('iron', tierCap(), -20);
    MAT().tran++;
  } else if (i === 'wood') {
    if (!(MAT().tran >= 1)) return '沒有蛻變石';
    MAT().tran--;
    matAdd('wood', 0, 50);
  } else {
    const x = tradeList()[+i];
    if (!x) return '換不了';
    if (x.why) return x.why;
    matAdd(x.g[0], x.g[1], -5);
    matAdd(x.t[0], x.t[1], 1);
  }
  return null;
}
/* 第二種以後的武器類別（鍛造台 Lv11 起，15 選 1）：開了幾種 campN('wts')，還能選就列出沒開的 */
function wtPickHTML() {
  const left = campN('wts') - S.camp.wts.length;
  if (left <= 0) return '';
  return `<div class="ph2">選一種武器類別<span>還能選 ${left} 種；選了才打得出那種武器、列得出那種武器的技能</span></div><div class="bagf">${Object.keys(
    WTN
  )
    .filter(wt => !S.camp.wts.includes(wt))
    .map(wt => chipB(`wt:${wt}`, 0, WTN[wt]))
    .join('')}</div>`;
}
const ccHTML = k => (GEN[k] ? genCardHTML(k) : campCardHTML(k));
/* 固定順序（考核 A6）：上面兩行黏住、產生器一組（×1／×10／最大在這一組的標題列，A7）、設施一組 */
/* M1-07b：營地的「下一個解鎖」——還沒出現的產生器（獵場、絲地）只列下一個，一列；都出現了不畫 */
function campNxuHTML() {
  const n = nextUnlock('camp');
  return n ? `<div class="cmnxu">${ICO.lock}<span>${esc(n.t)}</span></div>` : '';
}
function campHTML() {
  /* M1-CP.1：首屏＝資源、下一件主升級、下一個解鎖、還有幾座（產生器與設施的大卡往下捲或上拉全版） */
  const n = GEN_K.filter(genOn).length + CAMP_B.length;
  return `<div class="cmhead">${campTopHTML()}${campNextHTML()}${campNxuHTML()}<p class="cmmore">還有 ${n} 座・${PORT() ? '往下捲或上拉全版' : '往下捲動看全部'}</p></div>
  <div class="cmgrp"><span>產生器</span><div class="bagf cmmul" role="group" aria-label="產生器一次升幾級">${[
    [1, '×1'],
    [10, '×10'],
    ['max', '最大']
  ]
    .map(([v, t]) => chipB(`mul:${v}`, CAMPUI.mul === v, t))
    .join('')}</div></div>
  <div class="cmcards">${GEN_K.filter(genOn).map(genCardHTML).join('')}</div>
  <div class="cmgrp"><span>設施</span></div>
  <div class="cmcards">${CAMP_B.map(campCardHTML).join('')}</div>`;
}
/* ---------- M2-12 §6 下一個目標：最近的解鎖里程碑（還差最少級的那一個；新地點、技能格、輔助孔、天賦樹、昇華、產生器…），一次一個、不能釘 ---------- */
const affP = c => (c ? Math.min(1, ...costRows(c).map(([, h, w]) => (w ? Math.max(0, h) / w : 1))) : 1);
function campGoal() {
  const C = S.camp,
    L = ['slot', 'hole', 'wt', 'tree', 'asc', 'aura', 'camp'].map(nextUnlock).filter(Boolean),
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
/* ---------- M2-12 §3 營地升級抽屜（刷圖中開，刷圖不停）：6 設施＋已出現的產生器，一格一個印章鈕（一下就升、不能復原、300 ms 內重複不算）；
   點格子本體＝單座卡（‹ › 換座、× 回格子）；「回營地看」＝現有營地總覽（第二段改營地場景） ---------- */
const CDR = { one: null, tap: {}, h: '' };
const cdKeys = () => [...CAMP_B, ...GEN_K.filter(genOn)];
const cdCost = k => (GEN[k] ? genCost(k) : campNext(k));
const cdLv = k => (GEN[k] ? genOf(k).lv : S.camp[k] || 0);
const cdName = k => (GEN[k] ? GEN[k].n : CAMPN[k]);
const cdFg = k => (GEN[k] ? `gen:${k}:1` : `camp:${k}`);
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
    ms = GEN[k] && genNextMs(k),
    d = GEN[k] ? `每分鐘 +${fmtR(genRate1(k))}` : c ? c.d : '';
  return `<div class="cd1"><p class="cdlv">Lv ${lv}${c ? ` → Lv ${lv + 1}` : ''}</p>${d ? `<p class="cdd">${esc(d)}</p>` : ''}
  ${
    c
      ? `<ul class="cdcost">${costRows(c)
          .map(
            ([nm, h, w]) =>
              `<li><span>${nm}</span><b>${fmtN(w)}／${fmtN(Math.floor(h))}</b>${h >= w ? `<em class="c-good">${STR_T.cdEnough}</em>` : ''}</li>`
          )
          .join('')}</ul>`
      : `<p class="c-dim">${STR_T.cdMax}</p>`
  }
  ${ms ? `<p class="cdms">Lv ${ms.at}：${esc(ms.t)}</p>` : ''}
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
    h = campDrawerHTML();
  if (force || CDR.h !== h) el.innerHTML = CDR.h = h;
  for (const i of document.querySelectorAll('[data-cp]')) {
    const c = cdCost(i.dataset.cp);
    i.style.transform = `scaleX(${affP(c).toFixed(3)})`;
    i.classList.toggle('full', affP(c) >= 1);
  }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cd]');
  if (!b) return;
  const [k, v] = b.dataset.cd.split(':'),
    L = cdKeys();
  if (k === 'one') {
    if (!PANEL.camp) {
      HP_HOLD++;
      closePanels();
      HP_HOLD--;
      PANEL.camp = true;
    }
    CDR.one = v;
  } else if (k === 'nav') CDR.one = L[(L.indexOf(CDR.one) + +v + L.length) % L.length];
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
  for (const k of [...GEN_K.filter(genOn), ...CAMP_B]) sw('cc-' + k, ccHTML(k));
}
/* 按「打造」：扣材料、進倉庫、開翻牌 */
function craftGo() {
  const r = craftDo(MK.kind, MK);
  if (r.why) return hudWarn(r.why);
  const kept = r.items.filter(it => !it.salv).length;
  sfx(r.items.some(it => it.r === 2) ? 'flipRare' : 'equip');
  revealOpen(r.items, {
    title: '打造',
    craft: 1,
    head: r.salv.n
      ? `<p class="summ">${r.items.length} 件：留 ${kept} 件、分解 ${r.salv.n} 件 → ${esc(salvText(r.salv))}</p>`
      : ''
  });
}

/* ---------- 通貨頁（倉庫第一頁，0.3.6，照 PoE 的通貨倉庫）：通貨圍著中間一格，裝備放進中間（S.curIt）、點通貨直接用。
   轉化石：點了中間裝備的詞變成按鈕，點一條才用；預知石：點了再點一顆填詞的通貨（或精髓、轉化的詞）＝先看結果；
   預兆、鼎、覺醒石、判官筆等只列數量（預兆在鍛造台搭配填詞用） ---------- */
const CUI = { conv: 0, fore: 0, log: '' };
/* 圍在中間格子四周的通貨（格子區域照 CSS 的 grid-template-areas） */
const CUR_RING = ['tran', 'aug', 'rich', 'exalt', 'conv', 'fore', 'whet', 'holy', 'plate', 'corr'];
/* 高階、完美（0.4.1）：外圈下面一列 8 格 */
const CUR_TIERS = ['tran2', 'aug2', 'rich2', 'exalt2', 'tran3', 'aug3', 'rich3', 'exalt3'];
/* 直立的通貨頁（0.4.5）：手機沒有滑過的說明，圖示圍一圈認不出哪顆是哪顆、點了就用掉，詞又在下面看不到。
   改成：上面是這件裝備與它的詞（蓋滿時黏著，剛加的那條亮起來），下面每顆通貨一列——名字、對這件會做什麼（不能用就寫原因）、有幾顆；
   會加詞的四種一列三顆按鈕（普通／高階／完美，寫會出哪幾階）。點了照舊直接用（同一個 data-cu 處理） */
/* M1-14b：通貨頁三種列——有＝照舊；開了還沒拿到＝「還沒拿到。｛通貨名｝在鍛造台 Lv ｛n｝之後開始掉。」；沒開的只列下一個（虛線＋鎖、名字與「鍛造台 Lv n」） */
const notYet = k => {
  const e = campKey(curKey(k));
  return e ? `還沒拿到。${CUR[k].n}在${CAMPN[e[0]]} Lv ${e[1]}之後開始掉。` : '';
};
function curNextHTML() {
  let best = null;
  for (const k of Object.keys(CUR)) {
    if (CUR_TIERS.includes(k) || campCan(curKey(k))) continue;
    const e = campKey(curKey(k));
    if (e && (!best || e[1] < best.e[1])) best = { k, e };
  }
  return best
    ? `<div class="curow nxu">${ICO.lock}<span class="ct"><b>${esc(CUR[best.k].n)}</b><small>${CAMPN[best.e[0]]} Lv ${best.e[1]}</small></span></div>`
    : '';
}
function curPortHTML() {
  const M = MAT(),
    it = S.curIt,
    f = it && foreOf(it),
    b = it ? bestTier(it.L) : 0,
    rec = it && forgeHint(it),
    /* 這一階的通貨會出哪幾階（1 普通、2 高階、3 完美） */
    span = g => (g === 3 ? `T${b}` : g === 2 ? (b < AFF_T ? `T${b}～T${b + 1}` : `T${b}`) : tierSpan(it)),
    /* 為什麼不能用在這件上（數量不夠不算，數量另外寫） */
    why = k => {
      if (!it) return '';
      if (k === 'conv') return lockWhy(it, 'fill') || (it.a.length ? '' : '沒有詞可以換');
      if (k === 'fore') return lockWhy(it, 'fill') || '';
      if (FORGE[k]) return forgeCheck(it, k).why || '';
      if (k === 'whet' || k === 'plate') {
        if (qualCur(it) !== k) return `只能用在${k === 'whet' ? '武器' : '防具'}`;
        const w = qualCheck(it).why;
        return w && !/不夠$/.test(w) ? w : '';
      }
      const w = k === 'holy' ? holyCheck(it) : k === 'corr' ? corruptCheck(it) : '';
      return w && !/不夠$/.test(w) ? w : '';
    },
    desc = k =>
      it && (k === 'whet' || k === 'plate')
        ? `品質 ${Math.round((it.q || 0) * 100)}% → ${Math.round(Math.min(QUAL_CAP, (it.q || 0) + QUAL_STEP) * 100)}%`
        : k === 'conv' && CUI.conv
          ? '點上面一條要換掉的詞'
          : k === 'fore' && CUI.fore
            ? '再點一顆加詞的通貨或精髓，先看結果'
            : CUR[k].d,
    row = k => {
      const w = why(k),
        n = M[k] || 0,
        on = (k === 'conv' && CUI.conv) || (k === 'fore' && CUI.fore);
      return `<button class="curow ${w ? 'no' : ''} ${n ? '' : 'z'} ${on ? 'on' : ''}" data-cu="u:${k}" ${on ? 'aria-pressed="true"' : ''}>${icHTML(CUR[k].ic)}<span class="ct"><b>${esc(CUR[k].n)}</b><small class="${w && n ? 'c-warn' : ''}">${esc(n ? w || desc(k) : notYet(k) || w || desc(k))}</small></span><em>×${fmtN(n)}</em></button>`;
    },
    grp = k => {
      const w = why(k),
        ns = [M[k] || 0, M[k + '2'] || 0, M[k + '3'] || 0];
      /* 沒選裝備或不能用在這件上：收成一列，只寫三階各有幾顆 */
      if (!it || w)
        return `<button class="curow ${w ? 'no' : ''} ${ns.some(Boolean) ? '' : 'z'}" data-cu="u:${k}">${icHTML(CUR[k].ic)}<span class="ct"><b>${esc(CUR[k].n)}</b><small class="${w && ns.some(Boolean) ? 'c-warn' : ''}">${esc(ns.some(Boolean) ? w || CUR[k].d : notYet(k) || w || CUR[k].d)}</small></span><em class="t3"><i>普</i>${fmtN(ns[0])}<i>高</i>${fmtN(ns[1])}<i>完</i>${fmtN(ns[2])}</em></button>`;
      return `<div class="cugrp ${rec === k ? 'rec' : ''}"><div class="curow">${icHTML(CUR[k].ic)}<span class="ct"><b>${esc(CUR[k].n)}${rec === k ? '<i>下一步</i>' : ''}</b><small>${esc(CUR[k].d)}</small></span></div>
        <div class="cut3">${[1, 2, 3]
          .filter(g => g === 1 || campCan('tier' + g))
          .map(
            g =>
              `<button class="g${g} ${ns[g - 1] ? '' : 'z'}" data-cu="u:${k}${g > 1 ? g : ''}" aria-label="${esc(CUR[k + (g > 1 ? g : '')].n)}"><b>${['普通', '高階', '完美'][g - 1]}</b><small>${span(g)}</small><em>×${fmtN(ns[g - 1])}</em></button>`
          )
          .join('')}</div></div>`;
    },
    ess = essList(),
    rest = Object.keys(CUR).filter(k => !CUR_RING.includes(k) && !CUR_TIERS.includes(k) && campCan(curKey(k))),
    li = (ic, n, d, v) =>
      `<li class="${v ? '' : 'z'}">${icHTML(ic)}<div><b>${esc(n)}</b><small>${esc(d)}</small></div><em>${fmtN(v)}</em></li>`,
    top = !it
      ? emptySlotHTML(false)
      : `${cardHTML(it)}${
          f
            ? `<div class="fres fore"><b>預知結果（${esc(FORGE[f.op].n)}）</b>${
                foreNew(f)
                  .map(a => `<span class="fnew">${esc(affText(a))} <i>T${a.T}</i></span>`)
                  .join('') || '<span>沒有新的詞</span>'
              }</div><div class="fpair"><button class="btn pri" data-cu="fu">用掉${esc(curName(f.op, f.arg))}</button><button class="btn" data-cu="fs">不用（留著）</button></div>`
            : ''
        }${slotsHTML(it, CUI.conv ? 'conv' : 'view', 'cu')}${CUI.log ? `<p class="culog">${esc(CUI.log)}</p>` : ''}`;
  /* 品質的通貨：選了裝備只列用得上的那一種 */
  const qual = it ? [qualCur(it)] : ['whet', 'plate'],
    open = ks => ks.filter(k => campCan(curKey(k)));
  return `<div class="cutop">${top}</div>
  <div class="ph2">加詞<span>只能加、不能減</span></div>
  <div class="culist">${open(['tran', 'aug', 'rich', 'exalt']).map(grp).join('')}</div>
  ${
    campCan('cur:ess')
      ? `<div class="ph2">精髓<span>保證那一類、至少那一階</span></div>
  ${
    ess.length
      ? `<div class="mats">${ess.map(([k, n]) => `<button class="chip" data-cu="es:${k}">${icHTML(ACLSI[k.split(':')[0]].ic)}${esc(essName(k))}<small>×${n}</small></button>`).join('')}</div>`
      : `<p class="fhint">精髓由 3★ 以上地圖的菁英與王掉落</p>`
  }`
      : ''
  }
  <div class="ph2">其他</div>
  <div class="culist">${open(['conv', 'fore', ...qual, 'holy', 'corr'])
    .map(row)
    .join('')}${curNextHTML()}</div>
  <div class="ph2">材料<span>預兆在鍛造台搭配填詞用</span></div>
  <ul class="mpg">${li('cur_soul', '靈魂', '技能與光環升級、開孔、解鎖輔助 II；自動吸收', M.soul)}${rest.map(k => li(CUR[k].ic, CUR[k].n, CUR[k].d, M[k] || 0)).join('')}</ul>`;
}
function curPageHTML() {
  if (PORT()) return curPortHTML();
  const M = MAT(),
    it = S.curIt,
    f = it && foreOf(it),
    btn = k =>
      `<button class="cub ${M[k] ? '' : 'z'} ${(k === 'conv' && CUI.conv) || (k === 'fore' && CUI.fore) ? 'on' : ''} ${/[23]$/.test(k) ? 'g' + k.slice(-1) : ''}" ${CUR_RING.includes(k) ? `style="grid-area:${k}"` : ''} data-cu="u:${k}" title="${esc(CUR[k].n + '：' + CUR[k].d)}" aria-label="${esc(CUR[k].n)}">${icHTML(CUR[k].ic)}<em>${fmtN(M[k] || 0)}</em></button>`,
    center = `<div class="cuc" style="grid-area:mid" data-cur="1">${it ? itemHTML(it, 'cur', 'cur') : PORT() ? '<button class="btn pickb" data-a="pick">選一件裝備</button>' : `<span>${TOUCH.on ? '點倉庫的裝備<br>按「放進中間」' : '把裝備拖進來<br>或點倉庫的裝備'}</span>`}</div>`,
    hint = !it
      ? ''
      : CUI.fore
        ? '預知石：再點一顆填詞的通貨、精髓，或轉化石選的詞，先看結果'
        : CUI.conv
          ? '轉化石：點下面一條要換掉的詞'
          : '',
    ess = essList(),
    rest = Object.keys(CUR).filter(k => !CUR_RING.includes(k) && !CUR_TIERS.includes(k) && campCan(curKey(k))),
    row = (ic, n, d, v) =>
      `<li class="${v ? '' : 'z'}">${icHTML(ic)}<div><b>${esc(n)}</b><small>${esc(d)}</small></div><em>${fmtN(v)}</em></li>`;
  return `<div class="cupg">${CUR_RING.filter(k => campCan(curKey(k)))
    .map(btn)
    .join('')}${center}</div>
  <div class="cutier" aria-label="高階與完美通貨">${CUR_TIERS.filter(k => campCan(curKey(k)))
    .map(btn)
    .join('')}</div>
  ${
    it
      ? `${cardHTML(it)}${
          f
            ? `<div class="fres fore"><b>預知結果（${esc(FORGE[f.op].n)}）</b>${
                foreNew(f)
                  .map(a => `<span class="fnew">${esc(affText(a))} <i>T${a.T}</i></span>`)
                  .join('') || '<span>沒有新的詞</span>'
              }</div><div class="fpair"><button class="btn pri" data-cu="fu">用掉${esc(curName(f.op, f.arg))}</button><button class="btn" data-cu="fs">不用（留著）</button></div>`
            : ''
        }${hint ? `<p class="fhint">${hint}</p>` : ''}${slotsHTML(it, CUI.conv ? 'conv' : 'view', 'cu')}`
      : ''
  }
  ${CUI.log ? `<p class="culog">${esc(CUI.log)}</p>` : ''}
  ${
    campCan('cur:ess')
      ? `<div class="ph2">精髓<span>${it ? '點一顆直接用' : '9 類 × 階級，同類同階疊一格'}</span></div>
  ${
    ess.length
      ? `<div class="mats">${ess.map(([k, n]) => `<button class="chip" data-cu="es:${k}">${icHTML(ACLSI[k.split(':')[0]].ic)}${esc(essName(k))}<small>×${n}</small></button>`).join('')}</div>`
      : `<p class="fhint">精髓由 3★ 以上地圖的菁英與王掉落</p>`
  }`
      : ''
  }
  <div class="ph2">其他<span>預兆在鍛造台搭配填詞用</span></div>
  <ul class="mpg">${row('cur_soul', '靈魂', '技能與光環升級、開孔、解鎖輔助 II；自動吸收', M.soul)}${rest.map(k => row(CUR[k].ic, CUR[k].n, CUR[k].d, M[k] || 0)).join('')}</ul>`;
}
/* 點通貨頁：u＝通貨、cv＝轉化石選的詞、es＝精髓、fu／fs＝預知的用／不用 */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cu]');
  if (!b || b.disabled) return;
  const [k, v, x] = b.dataset.cu.split(':'),
    it = S.curIt,
    M = MAT();
  let err = null;
  CUI.fresh = null;
  /* 填詞：預知石開著就先看結果，不然直接用 */
  const fill = (op, arg) => {
    const before = it.a.slice();
    if (CUI.fore) {
      err = forePeek(it, op, arg);
      if (!err) (CUI.fore = 0), (CUI.log = ''), sfx('equip');
      return;
    }
    err = forgeDo(it, op, arg);
    if (!err)
      (CUI.log = curName(op, arg) + '：' + (craftLog(before, it) || '完成')),
        (CUI.fresh = it.a.filter(a => !before.includes(a))),
        sfx('equip');
  };
  if (k === 'u') {
    if (!it) err = PORT() ? '先選一件裝備' : CUR[v].n + '：' + CUR[v].d + '。先把裝備放進中間';
    else if (v === 'fore') CUI.fore = CUI.fore ? 0 : M.fore >= 1 ? 1 : ((err = '預知石不夠'), 0);
    else if (v === 'conv') CUI.conv = CUI.conv ? 0 : M.conv >= 1 ? 1 : ((err = '轉化石不夠'), 0);
    else if (FILL_OPS.includes(v)) fill(v);
    else if (v === 'whet' || v === 'plate') {
      if (qualCur(it) !== v) err = `${CUR[v].n}只能用在${v === 'whet' ? '武器' : '防具'}`;
      else {
        err = qualDo(it);
        if (!err) (CUI.log = `品質 ${Math.round(it.q * 100)}%`), sfx('equip');
      }
    } else if (v === 'holy') {
      err = holyDo(it);
      if (!err) (CUI.log = '聖化完成：' + it.a.map(a => '×' + a.m.toFixed(2)).join(' ')), sfx('lvup');
    } else if (v === 'corr') {
      if (!corruptCheck(it) && !confirm2(b, `<i>再按一次</i>`)) return;
      const r = corruptDo(it);
      if (r.why) err = r.why;
      else {
        CUI.log = '腐化：' + corrLog(it, r);
        sfx(r.res === 'burst' ? 'die' : 'lvup');
        if (r.res === 'burst') S.curIt = null;
      }
    }
  } else if (k === 'cv' && it) {
    CUI.conv = 0;
    fill('conv', +v);
  } else if (k === 'es') {
    if (!it) err = PORT() ? '先選一件裝備' : '先把裝備放進中間';
    else fill('ess', v + ':' + x);
  } else if (k === 'fu' && it) {
    const before = it.a.slice(),
      o = foreOf(it) && foreOf(it).op;
    err = foreUse(it);
    if (!err)
      (CUI.log = FORGE[o].n + '：' + (craftLog(before, it) || '完成')),
        (CUI.fresh = it.a.filter(a => !before.includes(a))),
        sfx('equip');
  } else if (k === 'fs') foreSkip(), (CUI.log = '沒有用，通貨留著');
  if (err) hudWarn(err);
  changed();
});

/* ---------- 一件裝備的詞：前綴 3 格、後綴 3 格（空格畫出來；說明框完整版在 8-3） ---------- */
/* mode：'view' 只看、'temper' 每條有百分位與單條淬鍊、'conv' 點一條選要換的 */
function slotsHTML(it, mode, at = 'fg') {
  const cap = sideCap(it),
    one = (a, i) => {
      const tag = `T${a.T}${isFrac(it, a) ? ' ★' : ''}${a.m ? ` ×${a.m.toFixed(2)}` : ''}`,
        txt = `<span>${esc(affText(a))}</span><i>${tag}</i>`,
        cls = `${isFrac(it, a) ? 'frac' : ''} ${at === 'cu' && CUI.fresh && CUI.fresh.includes(a) ? 'new' : ''}`;
      if (mode === 'conv') {
        const why = isFrac(it, a) ? '破裂詞不能轉化' : !affCls(a.k) ? '這條沒有類別' : '';
        return `<li><button class="fcv ${cls} ${at === 'fg' && CRAFT.conv === i ? 'on' : ''}" data-${at}="cv:${i}" ${why ? 'disabled' : ''} aria-pressed="${at === 'fg' && CRAFT.conv === i}">${txt}${why ? `<small>${why}</small>` : ''}</button></li>`;
      }
      if (mode === 'temper') {
        const pc = affPct(a);
        return `<li class="${cls}">${txt}<em style="--v:${pc.toFixed(2)}">${Math.round(pc * 100)}%</em><button class="btn mini" data-fg="tmp:${i}" ${S.gold < temperCost(it, 1) || lockWhy(it, 'temper') ? 'disabled' : ''}>單條 ${temperCost(it, 1)} 金</button></li>`;
      }
      return `<li class="${cls}">${txt}</li>`;
    },
    side = (pre, name) => {
      const L = it.a.map((a, i) => [a, i]).filter(([a]) => !!AFF[a.k].p === pre);
      return `<div class="fside"><h5 class="fsh">${name}</h5><ul class="fslot">${Array.from({ length: 3 }, (_, j) =>
        L[j]
          ? one(...L[j])
          : `<li class="emp ${j >= cap ? 'lk' : ''}"><span>${j >= cap ? '稀有物品才有' : '（空）'}</span></li>`
      ).join('')}</ul></div>`;
    };
  return (
    `<div class="fsides">${side(true, '前綴')}${side(false, '後綴')}</div>` +
    (it.cw && it.cw.length
      ? `<h5 class="fsh">腐化詞</h5><ul class="fslot">${it.cw.map(c => `<li class="cw"><span>${esc(cwText(c))}</span></li>`).join('')}</ul>`
      : '') +
    (it.cal
      ? `<h5 class="fsh">災魘詞</h5><ul class="fslot"><li class="calg"><span>${esc(calText(it.cal.g))}</span></li>${it.cal.b ? `<li class="calb"><span>${esc(calText(it.cal.b, 1))}</span></li>` : ''}</ul>`
      : '')
  );
}
/* M1-14b：沒放裝備時的虛線放置槽（直立點了開選裝格；桌機與橫向照舊點倉庫或身上的裝備）；「填」在槽下方寫 M1-13 定稿原文 */
const FILL_EMPTY =
  '把一件裝備放上來：點倉庫或身上的裝備。「填」只能加詞、不能拿掉；蛻變石把普通裝變魔法裝，增幅石替魔法裝補一條詞。';
const emptySlotHTML = fill =>
  `${
    PORT()
      ? `<button class="cuslot" data-a="pick">${ICO.plus}<span>選一件裝備</span></button>`
      : `<div class="cuslot"><span>${TOUCH.on ? '點倉庫或身上的裝備，再按「放上鍛造台」' : '點一下倉庫或身上的裝備，放上鍛造台'}</span></div>${TOUCH.on && NARROW ? '<button class="btn" data-tm="swap">去倉庫選裝備</button>' : ''}`
  }${fill ? `<p class="cuhint">${FILL_EMPTY}</p>` : ''}`;
/* 上方的裝備卡（沒放東西時是虛線槽） */
function cardHTML(it) {
  if (!it) return emptySlotHTML(CRAFT.tab === 'forge');
  const per = perfection(it);
  return `<div class="fsel">
    <div class="it r${it.r} fic">${icHTML(itemIc(it))}</div>
    <div><b class="rc${it.r}">${esc(itemName(it))}</b><small>${baseLayers(it)}</small>${
      it.a.length ? `<small>完美度 <b class="${per >= 0.85 ? 'c-gold' : ''}">${Math.round(per * 100)}%</b></small>` : ''
    }</div>${PORT() ? '<button class="btn mini" data-a="pick">換一件</button>' : ''}</div>`;
}

/* 預覽：可能加入哪些、數字範圍（這件物品等級能出的階級） */
function fpvHTML(it, op, arg) {
  const W = forgeWhat(it, op, arg),
    out = W.out.length ? `<small class="pvout">換掉：${W.out.map(a => esc(affText(a))).join('、')}</small>` : '',
    add = W.add.length
      ? `<details class="fpv" ${W.add.length <= 6 && !TOUCH.on ? 'open' : ''}><summary>${op === 'conv' ? '可能換成' : '可能加入'}：${W.add.length} 種 ${esc(W.tier)}（各 ${Math.round(100 / W.add.length)}%）</summary><ul>${W.add.map(k => `<li>${esc(affRangeTxt(k, it))}</li>`).join('')}</ul></details>`
      : '';
  return out + add;
}

/* ---------- 各分頁 ---------- */
/* 現在選的通貨：自己選的、沒選就用推薦的、滿了沒推薦就照稀有度（白→蛻變、藍→增幅、黃→崇高） */
const curOp = it => CRAFT.op || forgeHint(it) || ['tran', 'aug', 'exalt'][it.r];
const NOP = { top: '', mid: '', act: '' };
/* 預兆（0.2.79）：有預兆才出現這一列；選了的預兆作用在下一顆通貨，2 顆以上要有鼎 */
function omenHTML(op) {
  const M = MAT(),
    have = Object.keys(OMEN_OPS).filter(k => M[k] > 0 || CRAFT.om.includes(k));
  if (!have.length) return '';
  const w = omenWhy(op, CRAFT.om);
  return `<div class="fom"><h5 class="fsh">預兆<small>${M.v2 || M.v3 ? `三尸鼎 ${M.v2}・三彭鼎 ${M.v3}` : '一次 1 顆；同時用 2 顆以上要有鼎，三尸會掉'}</small></h5>
    <div class="mats">${have
      .map(k => {
        const on = CRAFT.om.includes(k),
          fit = OMEN_OPS[k].includes(op);
        return `<button class="chip ${on ? 'on' : ''}" data-fg="om:${k}" aria-pressed="${on}" title="${esc(CUR[k].d)}" ${fit || on ? '' : 'disabled'}>${icHTML(CUR[k].ic)}${esc(CUR[k].n.split('・')[1])}<small>×${M[k]}</small></button>`;
      })
      .join(
        ''
      )}</div>${CRAFT.om.length ? `<p class="fhint ${w ? 'c-bad' : ''}">${esc(w || CRAFT.om.map(k => CUR[k].d).join('；'))}</p>` : ''}</div>`;
}
function fillHTML(it) {
  if (!it) return NOP;
  /* 雙喜：兩條給你挑 */
  if (it.exOpt)
    return {
      top: `<p class="fdo">雙喜：兩條選一條，選了就加上去</p>`,
      mid: `<div class="fcal">${it.exOpt.map((a, i) => `<button class="fco" data-fg="xp:${i}"><span>${esc(affText(a))} <i>T${a.T}</i></span></button>`).join('')}</div>`,
      act: ''
    };
  CRAFT.om = CRAFT.om.filter(k => MAT()[k] > 0);
  const hint = forgeHint(it),
    op = curOp(it),
    F = FORGE[op],
    arg = op === 'ess' ? CRAFT.ess : op === 'conv' ? CRAFT.conv : null,
    M = MAT(),
    f = foreOf(it),
    { why, lack } = forgeCheck(it, op, arg, CRAFT.om),
    cnt = k => (k === 'ess' ? essList().reduce((s, [, n]) => s + n, 0) : M[k] || 0),
    /* 高階、完美（0.4.1）有的時候才列出來 */
    seg = `<div class="fseg s6" role="tablist" aria-label="通貨">${FILL_OPS.filter(
      k => campCan(curKey(k)) && (!/[23]$/.test(k) || cnt(k) || k === op)
    )
      .map(
        k =>
          `<button role="tab" aria-selected="${k === op}" class="${k === op ? 'on' : ''} ${cnt(k) ? '' : 'z'} ${k !== 'ess' && k !== 'conv' && FORGE[k].ok(it) ? 'no' : ''}" data-fg="sel:${k}">${hint === k ? '<i>推薦</i>' : ''}${FORGE[k].n}<small>×${cnt(k)}</small></button>`
      )
      .join('')}</div>`,
    ess =
      op === 'ess'
        ? essList().length
          ? `<div class="mats" role="group" aria-label="精髓">${essList()
              .map(
                ([k, n]) =>
                  `<button class="chip ${CRAFT.ess === k ? 'on' : ''}" data-fg="es:${k}" aria-pressed="${CRAFT.ess === k}">${icHTML(ACLSI[k.split(':')[0]].ic)}${esc(essName(k))}<small>×${n}</small></button>`
              )
              .join('')}</div>`
          : `<p class="fhint">精髓由 3★ 以上地圖的菁英與王掉落</p>`
        : op === 'conv'
          ? `<p class="fhint">${CRAFT.conv == null ? '點上面一條要換掉的詞' : '已選好，按下面的按鈕'}</p>`
          : '',
    qc = qualCheck(it),
    qual = qc.k
      ? `<button class="btn fq" data-fg="ql" ${qc.why ? 'disabled' : ''}>${qc.why ? `${CUR[qc.k].n} · ${esc(qc.why)}` : `${CUR[qc.k].n}（有 ${M[qc.k]}）· 品質 ${Math.round((it.q || 0) * 100)}% → ${Math.round(Math.min(QUAL_CAP, (it.q || 0) + QUAL_STEP) * 100)}%`}</button>`
      : '';
  let mid, act;
  if (f) {
    const nw = foreNew(f);
    mid = `<div class="fres fore"><b>預知結果（${esc(FORGE[f.op].n)}）</b>${nw.map(a => `<span class="fnew">${esc(affText(a))} <i>T${a.T}</i></span>`).join('') || '<span>沒有新的詞</span>'}</div>`;
    act = `<div class="fpair"><button class="btn pri fgo" data-fg="fu">用掉${esc(curName(f.op, f.arg))}</button><button class="btn fgo" data-fg="fs">不用（${esc(curName(f.op, f.arg))}留著）</button></div>${qual}`;
  } else {
    mid = `<div class="fres">${fpvHTML(it, op, arg)}${why ? `<small class="c-bad">${esc(why)}</small>` : lack ? `<small class="c-bad">${esc(lack)}</small>` : ''}</div>`;
    act = `<div class="fpair"><button class="btn pri fgo" data-fg="op" ${why || lack ? 'disabled' : ''}>${esc(op === 'ess' && arg ? essName(arg) : F.n)} · 有 ${curHave(op, arg)}</button>
      <button class="btn fgo" data-fg="fp" ${why || lack || M.fore < 1 || CRAFT.om.length ? 'disabled' : ''} title="先看這顆通貨的結果再決定；不用的話只消耗預知石">${M.fore < 1 ? '預知石不夠' : `先預知 ×${M.fore}`}</button></div>${qual}`;
  }
  return { top: `${seg}<p class="fdo">${esc(F.d)}</p>${ess}${omenHTML(op)}`, mid, act };
}
function temperHTML(it) {
  if (!it) return NOP;
  const w = lockWhy(it, 'temper');
  return it.a.length
    ? {
        top: '',
        mid: `${w ? `<p class="fhint c-bad">${esc(w)}</p>` : ''}<p class="fhint">重骰詞綴數值，階級與條數不變；破裂詞照 T0 範圍骰。每淬鍊一次費用增加 10%，最多 2 倍。</p>`,
        act: `<button class="btn pri fgo" data-fg="tmp:all" ${S.gold < temperCost(it) || w ? 'disabled' : ''}>全體淬鍊 ${temperCost(it)} 金</button>`
      }
    : { ...NOP, mid: `<p class="fhint">普通物品沒有詞綴可以淬鍊</p>` };
}
function holyHTML(it) {
  if (!it) return NOP;
  const why = holyCheck(it);
  return {
    top: '',
    mid: `<p class="fdo">每條詞的數值乘上 0.8～1.2 倍，越接近 1 越常見，可以超出階級。之後不能再填詞或淬鍊，仍可腐化。</p>${why ? `<p class="fhint ${it.holy ? '' : 'c-bad'}">${esc(why)}</p>` : ''}`,
    act: `<button class="btn pri fgo" data-fg="hol" ${why ? 'disabled' : ''}>${CUR.holy.n} · 有 ${MAT().holy}</button>`
  };
}
function corrHTML(it) {
  if (!it) return NOP;
  const why = corruptCheck(it),
    tot = CORR_ROLL.reduce((a, b) => a + b[1], 0),
    N = {
      cw1: '1 條腐化詞，不占前後綴',
      sock: '孔 +1，可比部位上限多 1 孔',
      none: '沒有變化，只是鎖定',
      burst: '爆開：變成腐化殘渣'
    };
  return {
    top: '',
    mid: `<p class="fdo c-warn">只能腐化一次，之後不能再填詞、淬鍊、聖化或提升品質。</p>
    <ul class="fcorr">${CORR_ROLL.map(([k, p]) => `<li class="${k === 'burst' ? 'c-bad' : ''}"><b>${Math.round((p * 100) / tot)}%</b>${N[k]}</li>`).join('')}</ul>
    <p class="fhint">爆開時：稀有物品換回詞綴數一半的崇高石，魔法物品換回 1 顆富豪石，普通物品不留東西。</p>${why ? `<p class="fhint ${it.cor ? '' : 'c-bad'}">${esc(why)}</p>` : ''}`,
    act: `<button class="btn pri fgo" data-fg="cor" ${why ? 'disabled' : ''}>${CUR.corr.n} · 有 ${MAT().corr}</button>`
  };
}
/* 災魘（0.2.78）：選石頭（一般／完美）＋勾不勾判官筆 → 一半三選一、一半毀掉；有選項時先選一個 */
function calamHTML(it) {
  if (!it) return NOP;
  const M = MAT(),
    perf = CRAFT.perf && M.pcalam > 0 ? 1 : 0,
    pen = CRAFT.pen && M.pen > 0 ? 1 : 0;
  if (it.calOpt)
    return {
      top: `<p class="fdo">成功了：選一組，選了就固定</p>`,
      mid: `<div class="fcal">${it.calOpt
        .map(
          (o, i) =>
            `<button class="fco" data-fg="cp:${i}"><span class="c-good">${esc(calText(o.g))}</span>${o.b ? `<span class="c-bad">${esc(calText(o.b, 1))}</span>` : '<span class="c-dim">沒有負面</span>'}</button>`
        )
        .join('')}</div>`,
      act: ''
    };
  const why = calamCheck(it, perf),
    seg = `<div class="fseg s2" role="tablist" aria-label="災魘石">${[
      [0, 'calam'],
      [1, 'pcalam']
    ]
      .map(
        ([p, k]) =>
          `<button role="tab" aria-selected="${perf === p}" class="${perf === p ? 'on' : ''} ${M[k] ? '' : 'z'}" data-fg="cs:${p}" ${p && !M[k] ? 'disabled' : ''}>${CUR[k].n}<small>×${M[k]}</small></button>`
      )
      .join('')}</div>`,
    penB = `<button class="btn fpen ${pen ? 'on' : ''}" data-fg="pn" aria-pressed="${!!pen}" ${M.pen ? '' : 'disabled'}>${pen ? '✓ ' : ''}用判官筆<small>有 ${M.pen}：失敗時不毀裝，勾選就消耗</small></button>`;
  return {
    top: seg,
    mid: `<p class="fdo c-warn">只能用在已腐化的裝備，一件只能一組。</p>
    <ul class="fcorr"><li><b>${Math.round(CALAM_OK * 100)}%</b>成功：三選一一組災魘詞（${perf ? '只有有利' : '有利＋有害'}）</li><li class="${pen ? '' : 'c-bad'}"><b>${Math.round((1 - CALAM_OK) * 100)}%</b>${pen ? '失敗：判官筆擋下，沒有變化' : '失敗：裝備毀掉，什麼都不留'}</li></ul>
    ${penB}${why ? `<p class="fhint ${it.cal ? '' : 'c-bad'}">${esc(why)}</p>` : ''}`,
    act: `<button class="btn pri fgo" data-fg="cal" ${why ? 'disabled' : ''}>${CUR[perf ? 'pcalam' : 'calam'].n} · 有 ${M[perf ? 'pcalam' : 'calam']}</button>`
  };
}
function forgeHTML() {
  const it = craftItem(),
    tab = CRAFT.tab,
    tabs = [
      ['make', '打造'],
      ['forge', '鍛造台', 'tab:fill'],
      ['temper', '淬鍊', 'tab:temper'],
      ['holy', '聖化', 'tab:holy'],
      ['corr', '腐化', 'tab:corr'],
      ['calam', '災魘', 'tab:calam']
    ].filter(t => !t[2] || campCan(t[2]));
  /* M2-38：營地只剩總覽（標題「營地」＋靈魂＋可升級幾件）；鍛造是自己的分頁（打造／通貨／鍛造台），沒開的段不畫 */
  if (tab === 'camp')
    return `<div class="ph"><b>營地</b><span>${strT('campSoul', { n: fmtN(MAT().soul) })}${campReady() ? `・${strT('campUp', { n: campReady() })}` : ''}</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div><div class="fmake fcamp">${campHTML()}</div>`;
  if (!tabs.some(t => t[0] === tab)) CRAFT.tab = 'make';
  if (CRAFT.tab === 'make') return `${forgeHead('make')}<div class="fmake">${makeHTML()}</div>`;
  if (!it) (CRAFT.conv = null), (CRAFT.op = CRAFT.op || null);
  else if (CRAFT.conv != null && !it.a[CRAFT.conv]) CRAFT.conv = null;
  const P = { forge: fillHTML, temper: temperHTML, holy: holyHTML, corr: corrHTML, calam: calamHTML }[tab](it),
    mode = tab === 'temper' ? 'temper' : tab === 'forge' && CRAFT.op === 'conv' ? 'conv' : 'view';
  /* 上到下：裝備卡 → 選通貨（top）→ 詞 → 預覽與說明（mid）→ 按鈕（act，黏在面板底部）；手機橫向左右並排（左：卡與詞，右：選、預覽、按鈕） */
  const tabsH = `<span class="ftabs">${tabs
    .filter(([k]) => k !== 'make')
    .map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-fg="tab:${k}">${n}</button>`)
    .join('')}</span>`;
  /* 標題列是鍛造的三段，鍛造台自己的五個分頁放第二列（直立、桌機同一份） */
  return `${forgeHead('forge')}<div class="fsub">${tabsH}${PORT() ? '' : `<span class="fmat">${tab === 'temper' ? `金 <b class="c-gold">${S.gold}</b>` : '只能加、不能減'}</span>`}</div>
  <div class="fcols"><div class="fl">${cardHTML(it)}<div class="fslots">${it ? (it.uid ? '<p class="fhint c-warn">未鑑定：回藏身處找撿骨師免費鑑定</p>' : slotsHTML(it, mode)) : ''}${CRAFT.log ? `<p class="flog">${esc(CRAFT.log)}</p>` : ''}</div></div>
  <div class="fr"><div class="ftop">${P.top}</div><div class="fmid">${P.mid}</div><div class="fact">${P.act}</div></div></div>`;
}
/* 做完一次：寫下拿掉什麼、加了什麼 */
function craftLog(before, it) {
  const out = before.filter(a => !it.a.includes(a)),
    add = it.a.filter(a => !before.includes(a));
  return [
    out.length ? '換掉：' + out.map(affText).join('、') : '',
    add.length ? '加入：' + add.map(a => affText(a) + ' T' + a.T).join('、') : ''
  ]
    .filter(Boolean)
    .join('；');
}
/* 選裝備（鍛造台開著時，點一下背包或身上的裝備） */
function craftPick(src, it, eqk) {
  CRAFT.sel = { src, id: it.id, eqk };
  CRAFT.conv = null;
  foreSkip();
  TOUCH.front = 'other'; /* 手機窄螢幕：選好就切回鍛造台 */
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
        : `裝備爆開了，變成腐化殘渣：換得 ${
            Object.entries(r.give)
              .map(([k, n]) => `${n} 顆${CUR[k].n}`)
              .join('、') || '什麼都沒有'
          }`;
}
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
    op = it ? curOp(it) : 'tran',
    arg = op === 'ess' ? CRAFT.ess : op === 'conv' ? CRAFT.conv : null;
  let err = null;
  if (k === 'tab') CRAFT.tab = v;
  else if (k === 'mk') (MK[v] = v === 'T' || v === 'n' || v === 'ink' ? +x : x), sfx('click');
  else if (k === 'go') return craftGo();
  else if (k === 'camp') {
    err = campUp(v);
    if (!err) {
      /* 那一句由 craft.js 的 campUp → sayOnce 講（M1-14） */
      CAMPUI.fx[v] = { t: performance.now() };
      sfx('lvup');
      /* 解鎖了東西：分頁列、技能、光環跟著變 */
      ST = stats();
      save();
    }
  } else if (k === 'gen') {
    const r0 = genRate(v),
      ms0 = genMs(genOf(v).lv);
    err = genUp(v, x === 'max' ? Math.max(1, genAfford(v)) : +x);
    if (!err) {
      const ms1 = genMs(genOf(v).lv),
        ms = ms1.m > ms0.m || ms1.slots > ms0.slots || ms1.tu > ms0.tu;
      const r1 = genRate(v);
      CAMPUI.fx[v] = { t: performance.now(), add: `+${fmtR(r1 - r0)}／分`, ms, from: r0, to: r1 };
      sfx(ms ? 'lvup' : 'coin');
      save();
    }
  } else if (k === 'cc') CAMPUI.open = CAMPUI.open === v ? null : v;
  else if (k === 'mul') CAMPUI.mul = v === 'max' ? 'max' : +v;
  else if (k === 'jump') {
    /* 從掛機卡、王倒下的卡按「看」：先打開營地 */
    CAMPUI.open = null;
    CRAFT.tab = 'camp';
    if (!PANEL.craft) PORT() ? navGo('craft') : openPanel('craft');
    else changed();
    const el = $('cc-' + v);
    if (el)
      el.scrollIntoView({
        block: 'center',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    return;
  } else if (k === 'star') (S.star = +v), save();
  else if (k === 'pri') (genOf(v).pri = genOf(v).pri ? 0 : 1), save();
  else if (k === 'gt') (genOf(v).tier = +x), save();
  else if (k === 'wt') {
    if (S.camp.wts.length < campN('wts') && WTN[v] && !S.camp.wts.includes(v)) S.camp.wts.push(v), (MK.wt = v), save();
  } else if (k === 'tr') {
    err = tradeDo(v);
    if (!err) sfx('coin'), save();
  } else if (k === 'a2') (S.auto2[v] = +x), sfx('click');
  else if (k === 'sel') (CRAFT.op = v), foreSkip();
  else if (k === 'es') (CRAFT.ess = v + ':' + x), foreSkip();
  else if (k === 'cv') (CRAFT.conv = CRAFT.conv === +v ? null : +v), foreSkip();
  else if (k === 'om') {
    CRAFT.om = CRAFT.om.includes(v) ? CRAFT.om.filter(x => x !== v) : [...CRAFT.om, v];
    foreSkip();
  } else if (k === 'xp' && it) {
    const pk = it.exOpt && it.exOpt[+v];
    err = omenPick(it, +v);
    if (!err) (CRAFT.log = '雙喜：加入 ' + affText(pk)), sfx('equip');
  } else if (k === 'op' && it) {
    const before = it.a.slice(),
      om = CRAFT.om.slice();
    err = forgeDo(it, op, arg, om);
    if (!err) {
      CRAFT.log =
        FORGE[op].n +
        (om.length ? '（' + om.map(x => CUR[x].n.split('・')[1]).join('＋') + '）' : '') +
        '：' +
        (it.exOpt ? '選一條' : craftLog(before, it) || '完成');
      CRAFT.om = [];
      sfx('equip');
    }
    if (!err && op === 'conv') CRAFT.conv = null;
  } else if (k === 'fp' && it) {
    err = forePeek(it, op, arg);
    if (!err) (CRAFT.log = ''), sfx('equip');
  } else if (k === 'fu' && it) {
    const before = it.a.slice(),
      o = foreOf(it).op;
    err = foreUse(it);
    if (!err) (CRAFT.log = FORGE[o].n + '：' + (craftLog(before, it) || '完成')), sfx('equip');
    if (!err && o === 'conv') CRAFT.conv = null;
  } else if (k === 'fs') {
    foreSkip();
    CRAFT.log = '沒有用，通貨留著';
  } else if (k === 'ql' && it) {
    err = qualDo(it);
    if (!err) (CRAFT.log = `品質 ${Math.round(it.q * 100)}%`), sfx('equip');
  } else if (k === 'tmp' && it) {
    err = temperDo(it, v === 'all' ? null : +v);
    if (!err) (CRAFT.log = `淬鍊完成 · 完美度 ${Math.round(perfection(it) * 100)}%`), sfx('coin');
  } else if (k === 'hol' && it) {
    err = holyDo(it);
    if (!err) (CRAFT.log = '聖化完成：' + it.a.map(a => '×' + a.m.toFixed(2)).join(' ')), sfx('lvup');
  } else if (k === 'cor' && it) {
    if (!confirm2(b, `<span>再按一次</span><small>全部鎖定、不能反悔</small>`)) return;
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
    if (!pen && !confirm2(b, `<span>再按一次</span><small>失敗會毀掉這件</small>`)) return;
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
