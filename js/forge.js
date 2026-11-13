/* dungeonPOE · 鍛造台面板（0.2.72 重做，企劃書 5.3）：藏身處的鍛造台打開（左邊），背包在右邊。
   點一下背包或身上的裝備＝放上鍛造台；分頁：填（通貨，只能加）、淬鍊（金幣）、聖化、腐化。
   每個按鈕都寫要花什麼、預覽會發生什麼；不能按的寫原因；推薦的標「推薦」。材料頁在倉庫的「材料」分頁 */
'use strict';
const CRAFT = { tab: 'forge', op: null, ess: null, conv: null, sel: null, log: '', perf: 0, pen: 0, om: [] };
const craftItem = () => (CRAFT.sel ? findItem(CRAFT.sel.src, CRAFT.sel.id, CRAFT.sel.eqk) : null);

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
      return `<button class="curow ${w ? 'no' : ''} ${n ? '' : 'z'} ${on ? 'on' : ''}" data-cu="u:${k}" ${on ? 'aria-pressed="true"' : ''}>${icHTML(CUR[k].ic)}<span class="ct"><b>${esc(CUR[k].n)}</b><small class="${w ? 'c-warn' : ''}">${esc(w || desc(k))}</small></span><em>×${fmtN(n)}</em></button>`;
    },
    grp = k => {
      const w = why(k),
        ns = [M[k] || 0, M[k + '2'] || 0, M[k + '3'] || 0];
      /* 沒選裝備或不能用在這件上：收成一列，只寫三階各有幾顆 */
      if (!it || w)
        return `<button class="curow ${w ? 'no' : ''} ${ns.some(Boolean) ? '' : 'z'}" data-cu="u:${k}">${icHTML(CUR[k].ic)}<span class="ct"><b>${esc(CUR[k].n)}</b><small class="${w ? 'c-warn' : ''}">${esc(w || CUR[k].d)}</small></span><em class="t3"><i>普</i>${fmtN(ns[0])}<i>高</i>${fmtN(ns[1])}<i>完</i>${fmtN(ns[2])}</em></button>`;
      return `<div class="cugrp ${rec === k ? 'rec' : ''}"><div class="curow">${icHTML(CUR[k].ic)}<span class="ct"><b>${esc(CUR[k].n)}${rec === k ? '<i>下一步</i>' : ''}</b><small>${esc(CUR[k].d)}</small></span></div>
        <div class="cut3">${[1, 2, 3]
          .map(
            g =>
              `<button class="g${g} ${ns[g - 1] ? '' : 'z'}" data-cu="u:${k}${g > 1 ? g : ''}" aria-label="${esc(CUR[k + (g > 1 ? g : '')].n)}"><b>${['普通', '高階', '完美'][g - 1]}</b><small>${span(g)}</small><em>×${fmtN(ns[g - 1])}</em></button>`
          )
          .join('')}</div></div>`;
    },
    ess = essList(),
    rest = Object.keys(CUR).filter(k => !CUR_RING.includes(k) && !CUR_TIERS.includes(k)),
    li = (ic, n, d, v) =>
      `<li class="${v ? '' : 'z'}">${icHTML(ic)}<div><b>${esc(n)}</b><small>${esc(d)}</small></div><em>${fmtN(v)}</em></li>`,
    top = !it
      ? '<button class="btn pickb" data-a="pick">選一件裝備</button>'
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
  const qual = it ? [qualCur(it)] : ['whet', 'plate'];
  return `<div class="cutop">${top}</div>
  <div class="ph2">加詞<span>只能加、不能減</span></div>
  <div class="culist">${['tran', 'aug', 'rich', 'exalt'].map(grp).join('')}</div>
  <div class="ph2">精髓<span>保證那一類、至少那一階</span></div>
  ${
    ess.length
      ? `<div class="mats">${ess.map(([k, n]) => `<button class="chip" data-cu="es:${k}">${icHTML(ACLSI[k.split(':')[0]].ic)}${esc(essName(k))}<small>×${n}</small></button>`).join('')}</div>`
      : `<p class="fhint">精髓由 3★ 以上地圖的菁英與王掉落</p>`
  }
  <div class="ph2">其他</div>
  <div class="culist">${['conv', 'fore', ...qual, 'holy', 'corr'].map(row).join('')}</div>
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
    rest = Object.keys(CUR).filter(k => !CUR_RING.includes(k) && !CUR_TIERS.includes(k)),
    row = (ic, n, d, v) =>
      `<li class="${v ? '' : 'z'}">${icHTML(ic)}<div><b>${esc(n)}</b><small>${esc(d)}</small></div><em>${fmtN(v)}</em></li>`;
  return `<div class="cupg">${CUR_RING.map(btn).join('')}${center}</div>
  <div class="cutier" aria-label="高階與完美通貨">${CUR_TIERS.map(btn).join('')}</div>
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
  <div class="ph2">精髓<span>${it ? '點一顆直接用' : '9 類 × 階級，同類同階疊一格'}</span></div>
  ${
    ess.length
      ? `<div class="mats">${ess.map(([k, n]) => `<button class="chip" data-cu="es:${k}">${icHTML(ACLSI[k.split(':')[0]].ic)}${esc(essName(k))}<small>×${n}</small></button>`).join('')}</div>`
      : `<p class="fhint">精髓由 3★ 以上地圖的菁英與王掉落</p>`
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

/* ---------- 碎片頁（通貨面板的「碎片」分頁，0.2.78，照 PoE 的碎片倉庫）：勾魂令四種、生死簿，每種寫湊幾張能開什麼 ---------- */
function fragPageHTML() {
  const F = S.frags,
    n = fdHun(S),
    row = (ic, nm, d, v) =>
      `<li class="${v ? '' : 'z'}">${icHTML(ic)}<div><b>${esc(nm)}</b><small>${esc(d)}</small></div><em>${fmtN(v)}</em></li>`,
    uw = fdHallWhy(S, 'uber');
  return `<div class="ph2">酆都<span>鬼門關：角色 Lv ${spNeed('ghost')} 開</span></div>
  <ul class="mpg">${FENG.elites.map(k => row(FRAGS[k].ic, FRAGS[k].n, FRAGS[k].d, F[k])).join('')}${row(FRAGS.book.ic, FRAGS.book.n, FRAGS.book.d, F.book)}</ul>
  <div class="fgoal"><p><b>閻羅殿</b><span class="${n >= FENG.hun ? 'c-good' : ''}">勾魂令 ${n}／${FENG.hun}${n >= FENG.hun ? '：在山海寶盒開啟' : `：再 ${FENG.hun - n} 張`}</span></p>
  <p><b>十殿閻羅</b><span class="${uw ? '' : 'c-good'}">${esc(uw || '在山海寶盒開啟')}</span></p></div>
  <div class="ph2">心魔劫<span>七情王掉落；帶進王場每片加一個減益</span></div>
  <ul class="mpg">${SIN.emo.map(k => row(SIN_FRAG[k].ic, SIN_FRAG[k].n, '帶進去：' + SIN_FRAG[k].deb, F[k])).join('')}</ul>
  <div class="fgoal"><p><b>三尸</b><span class="${SIN.emo.filter(k => F[k]).length >= SIN.need ? 'c-good' : ''}">${SIN.emo.filter(k => F[k]).length}／${SIN.need} 種${SIN.emo.filter(k => F[k]).length >= SIN.need ? '：在山海寶盒開啟' : ''}</span></p>
  <p><b>三彭</b><span class="${sinHallWhy(S, 'sanpeng') ? '' : 'c-good'}">${esc(sinHallWhy(S, 'sanpeng') || '在山海寶盒開啟')}</span></p></div>
  <div class="ph2">四凶<span>凶地中心的四凶掉落</span></div>
  <ul class="mpg">${[...XIONG, 'eye'].map(k => row(FRAGS[k].ic, FRAGS[k].n, FRAGS[k].d, F[k])).join('')}</ul>
  <div class="ph2">狩獵之血<span>血霧滿了換血霧之印，進裂口用；生肖王掉神血</span></div>
  <ul class="mpg">${['mist', 'blood'].map(k => row(FRAGS[k].ic, FRAGS[k].n, FRAGS[k].d, F[k] || 0)).join('')}</ul>
  <div class="ph2">陰兵借道<span>陰兵借道的三位將領輪流當王，連刷累積怨恨值</span></div>
  <ul class="mpg">${[...ARMY.gen, 'fu'].map(k => row(FRAGS[k].ic, FRAGS[k].n, FRAGS[k].d, F[k])).join('')}</ul>
  <div class="fgoal"><p><b>蚩尤</b><span class="${armyHallWhy(S, 'chiyou') ? '' : 'c-good'}">${esc(armyHallWhy(S, 'chiyou') || '在山海寶盒開啟')}</span></p>
  <p><b>涿鹿兵主</b><span class="${armyHallWhy(S, 'zhuolu') ? '' : 'c-good'}">${esc(armyHallWhy(S, 'zhuolu') || '在山海寶盒開啟')}</span></p></div>`;
}

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
/* 上方的裝備卡（沒放東西時是一句提示） */
function cardHTML(it) {
  if (!it && PORT()) return '<button class="btn pickb" data-a="pick">選一件裝備</button>';
  if (!it)
    return `<p class="fhint">${TOUCH.on ? '點倉庫或身上的裝備，再按「放上鍛造台」' : '點一下倉庫或身上的裝備，放上鍛造台'}</p>${
      TOUCH.on && NARROW ? '<button class="btn" data-tm="swap">去倉庫選裝備</button>' : ''
    }`;
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
      k => !/[23]$/.test(k) || cnt(k) || k === op
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
      ['forge', '填'],
      ['temper', '淬鍊'],
      ['holy', '聖化'],
      ['corr', '腐化'],
      ['calam', '災魘']
    ];
  if (!it) (CRAFT.conv = null), (CRAFT.op = CRAFT.op || null);
  else if (CRAFT.conv != null && !it.a[CRAFT.conv]) CRAFT.conv = null;
  const P = { forge: fillHTML, temper: temperHTML, holy: holyHTML, corr: corrHTML, calam: calamHTML }[tab](it),
    mode = tab === 'temper' ? 'temper' : tab === 'forge' && CRAFT.op === 'conv' ? 'conv' : 'view';
  /* 上到下：裝備卡 → 選通貨（top）→ 詞 → 預覽與說明（mid）→ 按鈕（act，黏在面板底部）；手機橫向左右並排（左：卡與詞，右：選、預覽、按鈕） */
  const tabsH = `<span class="ftabs">${tabs
    .map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-fg="tab:${k}">${n}</button>`)
    .join('')}</span>`;
  /* 直立：標題列是「做裝」的三個分頁，鍛造台自己的五個分頁放第二列 */
  return `${
    PORT()
      ? `<div class="ph"><b>做裝</b>${craftSeg('forge')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div><div class="fsub">${tabsH}</div>`
      : `<div class="ph"><b>鍛造台</b><span class="fmat">${tab === 'temper' ? `金幣 <b class="c-gold">${S.gold}</b>` : '只能加、不能減'}</span>${tabsH}${swapB('裝備')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>`
  }
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
  const [k, v, x] = b.dataset.fg.split(':'),
    it = craftItem(),
    op = it ? curOp(it) : 'tran',
    arg = op === 'ess' ? CRAFT.ess : op === 'conv' ? CRAFT.conv : null;
  let err = null;
  if (k === 'tab') CRAFT.tab = v;
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
  changed();
});
