/* dungeonPOE · 鍛造台面板（0.2.72 重做，企劃書 5.3）：藏身處的鍛造台打開（左邊），背包在右邊。
   點一下背包或身上的裝備＝放上鍛造台；分頁：填（通貨，只能加）、淬鍊（金幣）、聖化、腐化。
   每個按鈕都寫要花什麼、預覽會發生什麼；不能按的寫原因；推薦的標「推薦」。材料頁在倉庫的「材料」分頁 */
'use strict';
const CRAFT = { tab: 'forge', op: null, ess: null, conv: null, sel: null, log: '' };
const craftItem = () => (CRAFT.sel ? findItem(CRAFT.sel.src, CRAFT.sel.id, CRAFT.sel.eqk) : null);

/* ---------- 材料頁（倉庫的「材料」分頁）：靈魂、10 種通貨（0 也列出來）、精髓 ---------- */
function matPageHTML() {
  const M = MAT(),
    row = (ic, n, d, v) =>
      `<li class="${v ? '' : 'z'}">${icHTML(ic)}<div><b>${esc(n)}</b><small>${esc(d)}</small></div><em>${fmtN(v)}</em></li>`,
    ess = essList();
  return `<ul class="mpg">${row('cur_soul', '靈魂', '技能與輔助升級、開孔；自動吸收', M.soul)}${Object.entries(CUR)
    .map(([k, c]) => row(c.ic, c.n, c.d, M[k] || 0))
    .join('')}</ul>
  <div class="ph2">精髓<span>9 類 × 階級，同類同階疊一格</span></div>
  ${
    ess.length
      ? `<div class="mats">${ess
          .map(([k, n]) => {
            const [c] = k.split(':');
            return `<span class="chip">${icHTML(ACLSI[c].ic)}${esc(essName(k))}<small>×${n}</small></span>`;
          })
          .join('')}</div>`
      : `<p class="fhint">還沒有精髓：3★ 以上的地圖，菁英和王會掉</p>`
  }`;
}

/* ---------- 一件裝備的詞：前綴 3 格、後綴 3 格（空格畫出來；說明框完整版在 8-3） ---------- */
/* mode：'view' 只看、'temper' 每條有百分位與單條淬鍊、'conv' 點一條選要換的 */
function slotsHTML(it, mode) {
  const cap = sideCap(it),
    one = (a, i) => {
      const tag = `T${a.T}${isFrac(it, a) ? ' ★' : ''}${a.m ? ` ×${a.m.toFixed(2)}` : ''}`,
        txt = `<span>${esc(affText(a))}</span><i>${tag}</i>`,
        cls = `${isFrac(it, a) ? 'frac' : ''}`;
      if (mode === 'conv') {
        const why = isFrac(it, a) ? '破裂詞不能轉化' : !affCls(a.k) ? '這條沒有類別' : '';
        return `<li><button class="fcv ${cls} ${CRAFT.conv === i ? 'on' : ''}" data-fg="cv:${i}" ${why ? 'disabled' : ''} aria-pressed="${CRAFT.conv === i}">${txt}${why ? `<small>${why}</small>` : ''}</button></li>`;
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
          : `<li class="emp ${j >= cap ? 'lk' : ''}"><span>${j >= cap ? '黃裝才有' : '（空）'}</span></li>`
      ).join('')}</ul></div>`;
    };
  return (
    `<div class="fsides">${side(true, '前綴')}${side(false, '後綴')}</div>` +
    (it.cw && it.cw.length
      ? `<h5 class="fsh">腐化詞</h5><ul class="fslot">${it.cw.map(c => `<li class="cw"><span>${esc(cwText(c))}</span></li>`).join('')}</ul>`
      : '')
  );
}
/* 上方的裝備卡（沒放東西時是一句提示） */
function cardHTML(it) {
  if (!it)
    return `<p class="fhint">${TOUCH.on ? '點背包或身上的裝備，再按「放上鍛造台」' : '點一下背包或身上的裝備，放上鍛造台'}</p>${
      TOUCH.on && NARROW ? '<button class="btn" data-tm="swap">去背包選裝備</button>' : ''
    }`;
  const per = perfection(it);
  return `<div class="fsel">
    <div class="it r${it.r} fic">${icHTML(itemIc(it))}</div>
    <div><b class="rc${it.r}">${esc(itemName(it))}</b><small>${baseLayers(it)}</small>${
      it.a.length ? `<small>完美度 <b class="${per >= 0.85 ? 'c-gold' : ''}">${Math.round(per * 100)}%</b></small>` : ''
    }</div></div>`;
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
function fillHTML(it) {
  if (!it) return NOP;
  const hint = forgeHint(it),
    op = curOp(it),
    F = FORGE[op],
    arg = op === 'ess' ? CRAFT.ess : op === 'conv' ? CRAFT.conv : null,
    M = MAT(),
    f = foreOf(it),
    { why, lack } = forgeCheck(it, op, arg),
    cnt = k => (k === 'ess' ? essList().reduce((s, [, n]) => s + n, 0) : M[k] || 0),
    seg = `<div class="fseg s6" role="tablist" aria-label="通貨">${FILL_OPS.map(
      k =>
        `<button role="tab" aria-selected="${k === op}" class="${k === op ? 'on' : ''} ${cnt(k) ? '' : 'z'}" data-fg="sel:${k}">${hint === k ? '<i>推薦</i>' : ''}${FORGE[k].n}<small>×${cnt(k)}</small></button>`
    ).join('')}</div>`,
    ess =
      op === 'ess'
        ? essList().length
          ? `<div class="mats" role="group" aria-label="精髓">${essList()
              .map(
                ([k, n]) =>
                  `<button class="chip ${CRAFT.ess === k ? 'on' : ''}" data-fg="es:${k}" aria-pressed="${CRAFT.ess === k}">${icHTML(ACLSI[k.split(':')[0]].ic)}${esc(essName(k))}<small>×${n}</small></button>`
              )
              .join('')}</div>`
          : `<p class="fhint">沒有精髓：3★ 以上的地圖，菁英和王會掉</p>`
        : op === 'conv'
          ? `<p class="fhint">${CRAFT.conv == null ? '點上面的一條詞，選要換掉的' : '已選好，按下面的按鈕'}</p>`
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
      <button class="btn fgo" data-fg="fp" ${why || lack || M.fore < 1 ? 'disabled' : ''} title="預知石：先看這一顆通貨的結果，再決定用不用；不用就只消耗預知石">${M.fore < 1 ? '預知石不夠' : `先預知 ×${M.fore}`}</button></div>${qual}`;
  }
  return { top: `${seg}<p class="fdo">${esc(F.d)}</p>${ess}`, mid, act };
}
function temperHTML(it) {
  if (!it) return NOP;
  const w = lockWhy(it, 'temper');
  return it.a.length
    ? {
        top: '',
        mid: `${w ? `<p class="fhint c-bad">${esc(w)}</p>` : ''}<p class="fhint">階級和條數不變，只重骰數字，可能變高也可能變低；破裂詞（★）在 T0 的範圍裡骰。每按一次貴 10%，最多 2 倍。</p>`,
        act: `<button class="btn pri fgo" data-fg="tmp:all" ${S.gold < temperCost(it) || w ? 'disabled' : ''}>全體淬鍊 ${temperCost(it)} 金</button>`
      }
    : { ...NOP, mid: `<p class="fhint">白裝沒有詞綴可以淬鍊</p>` };
}
function holyHTML(it) {
  if (!it) return NOP;
  const why = holyCheck(it);
  return {
    top: '',
    mid: `<p class="fdo">每條詞各骰 ×0.8～1.2，中間多兩邊少，數值可以超出階級。之後不能再填、淬鍊，還能腐化。<br>預估平均不變，最差 −20%，最好 +20%。</p>${why ? `<p class="fhint ${it.holy ? '' : 'c-bad'}">${esc(why)}</p>` : ''}`,
    act: `<button class="btn pri fgo" data-fg="hol" ${why ? 'disabled' : ''}>${CUR.holy.n} · 有 ${MAT().holy}</button>`
  };
}
function corrHTML(it) {
  if (!it) return NOP;
  const why = corruptCheck(it),
    tot = CORR_ROLL.reduce((a, b) => a + b[1], 0),
    N = {
      cw1: '腐化詞 1 條（強力＋代價，不占前後綴）',
      cw2: '腐化詞 2 條',
      sock: '孔 +1（可以超過部位上限 1 格）',
      none: '沒有變化，只是鎖定',
      burst: '爆開：變成腐化殘渣'
    };
  return {
    top: '',
    mid: `<p class="fdo c-warn">一次、純隨機，之後全部鎖定（不能填、淬鍊、聖化、提升品質）。</p>
    <ul class="fcorr">${CORR_ROLL.map(([k, p]) => `<li class="${k === 'burst' ? 'c-bad' : ''}"><b>${Math.round((p * 100) / tot)}%</b>${N[k]}</li>`).join('')}</ul>
    <p class="fhint">爆開時：黃裝換「詞綴數一半」的崇高石，藍裝換 1 顆富豪石，白裝什麼都沒有。</p>${why ? `<p class="fhint ${it.cor ? '' : 'c-bad'}">${esc(why)}</p>` : ''}`,
    act: `<button class="btn pri fgo" data-fg="cor" ${why ? 'disabled' : ''}>${CUR.corr.n} · 有 ${MAT().corr}</button>`
  };
}
function forgeHTML() {
  const it = craftItem(),
    tab = CRAFT.tab,
    tabs = [
      ['forge', '填'],
      ['temper', '淬鍊'],
      ['holy', '聖化'],
      ['corr', '腐化']
    ];
  if (!it) (CRAFT.conv = null), (CRAFT.op = CRAFT.op || null);
  else if (CRAFT.conv != null && !it.a[CRAFT.conv]) CRAFT.conv = null;
  const P = { forge: fillHTML, temper: temperHTML, holy: holyHTML, corr: corrHTML }[tab](it),
    mode = tab === 'temper' ? 'temper' : tab === 'forge' && CRAFT.op === 'conv' ? 'conv' : 'view';
  /* 上到下：裝備卡 → 選通貨（top）→ 詞 → 預覽與說明（mid）→ 按鈕（act，黏在面板底部）；手機橫向左右並排（左：卡與詞，右：選、預覽、按鈕） */
  return `<div class="ph"><b>鍛造台</b><span class="fmat">${tab === 'temper' ? `金幣 <b class="c-gold">${S.gold}</b>` : '只能加、不能減'}</span><span class="ftabs">${tabs
    .map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-fg="tab:${k}">${n}</button>`)
    .join('')}</span>${swapB('背包')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="fcols"><div class="fl">${cardHTML(it)}<div class="fslots">${it ? (it.uid ? '<p class="fhint c-warn">還沒鑑定：前後綴看不到。回藏身處找撿骨師（免費、一次全部）</p>' : slotsHTML(it, mode)) : ''}${CRAFT.log ? `<p class="flog">${esc(CRAFT.log)}</p>` : ''}</div></div>
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
  return r.res === 'cw1' || r.res === 'cw2'
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
  else if (k === 'op' && it) {
    const before = it.a.slice();
    err = forgeDo(it, op, arg);
    if (!err) (CRAFT.log = FORGE[op].n + '：' + (craftLog(before, it) || '完成')), sfx('equip');
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
  }
  if (err) hudWarn(err);
  changed();
});
