/* dungeonPOE · 鍛造台面板（0.2.6，企劃書 5.3）：藏身處的鍛造台打開（左邊），背包在右邊。
   點一下背包或身上的裝備＝放上鍛造台；分頁：鍛造（花潛能＋粉＋碎片）、淬鍊（花金幣）、分解（按兩次確認）。
   每個按鈕都寫要花什麼、預覽會發生什麼；不能按的寫原因；推薦的標 ★。技能寶石面板的升級、開孔、書庫按鈕也在這裡處理 */
'use strict';
const CRAFT = { tab: 'forge', cls: null, sel: null, log: '', arm: 0 };
const craftItem = () => (CRAFT.sel ? findItem(CRAFT.sel.src, CRAFT.sel.id, CRAFT.sel.eqk) : null);

/* 材料列：粉、靈魂、8 類碎片（鍛造分頁可以點選）、鑿孔石 */
function matsHTML(pickable) {
  const m = MAT(),
    chip = (ic, n, lab, extra = '') =>
      `<span class="chip ${extra}" title="${esc(lab)}">${icHTML(ic)}<b>${n}</b></span>`;
  return `<div class="mats">
    <span class="chip" title="粉：所有鍛造都要用"><i class="dot dust"></i><b>${m.dust}</b><small>粉</small></span>
    <span class="chip" title="靈魂：寶石升級"><i class="dot soul"></i><b>${m.soul}</b><small>靈魂</small></span>
    ${SHARDS.map(x =>
      pickable
        ? `<button class="chip ${CRAFT.cls === x.k ? 'on' : ''}" data-fg="cls:${x.k}" title="${x.n}碎片：對${x.n}類詞綴下手">${icHTML(x.ic)}<b>${m.sh[x.k]}</b><small>${x.n}</small></button>`
        : chip(x.ic, m.sh[x.k], x.n + '碎片')
    ).join('')}
    ${DRILLS.map((n, i) => `<span class="chip" title="${n}"><i class="dot drill d${i}"></i><b>${m.drill[i]}</b><small>${'小中大'[i]}鑿</small></span>`).join('')}
  </div>`;
}
function selHTML(it, temper) {
  if (!it)
    return `<p class="fhint">${TOUCH.on ? '點背包或身上的裝備，再按「放上鍛造台」' : '點一下背包或身上的裝備，放上鍛造台'}</p>${
      TOUCH.on && NARROW ? '<button class="btn" data-tm="swap">去背包選裝備</button>' : ''
    }`;
  const per = perfection(it);
  return `<div class="fsel">
    <div class="it r${it.r} fic">${icHTML(itemIc(it))}</div>
    <div><b class="rc${it.r}">${esc(itemName(it))}</b><small>${baseLayers(it)}</small>${
      it.a.length ? `<small>完美度 <b class="${per >= 0.85 ? 'c-gold' : ''}">${Math.round(per * 100)}%</b></small>` : ''
    }</div></div>
  <ul class="faff">${
    it.a
      .map(
        (a, i) =>
          `<li><span>${esc(affText(a))} <i>T${a.T}</i></span>${
            temper
              ? `<em style="--v:${affPct(a).toFixed(2)}">${Math.round(affPct(a) * 100)}%</em><button class="btn mini" data-fg="tmp:${i}" ${S.gold < temperCost(it, 1) ? 'disabled' : ''}>單條 ${temperCost(it, 1)} 金</button>`
              : ''
          }</li>`
      )
      .join('') || '<li class="c-dim">沒有詞綴（白裝）</li>'
  }</ul>`;
}
function forgeHTML() {
  const it = craftItem(),
    tab = CRAFT.tab,
    tabs = [
      ['forge', '鍛造'],
      ['temper', '淬鍊'],
      ['decomp', '分解']
    ];
  let body = '';
  if (tab === 'forge') {
    const hint = it && forgeHint(it, CRAFT.cls);
    body = it
      ? `<div class="fops">${Object.keys(FORGE)
          .map(op => {
            const F = FORGE[op],
              { cost, why } = forgeCheck(it, op, CRAFT.cls),
              pv = !why || /^(粉|.*碎片)不夠/.test(why) ? F.preview(it, CRAFT.cls) : '';
            return `<div class="fop ${why ? 'off' : ''}"><button class="btn ${hint === op ? 'pri' : ''}" data-fg="op:${op}" ${why ? 'disabled' : ''}>${hint === op ? '★ ' : ''}${F.n}</button>
              <div><small>${esc(F.d)}</small><small class="cost">潛能 −${cost.pot} · 粉 ${cost.dust}${cost.shard ? ` · ${CRAFT.cls ? SHARDI[CRAFT.cls].n : ''}碎片 ${cost.shard}` : ''}</small>${
                why ? `<small class="c-bad">${esc(why)}</small>` : `<small class="pv">${esc(pv)}</small>`
              }</div></div>`;
          })
          .join('')}</div>
        <p class="fhint">先在上面選一種碎片（對那一類詞下手）。鍛造出來的詞最高 T2，T1 只能靠野生掉落。套路：定向重鑄 → 添加補滿；5 條好 1 條爛 → 同類置換。</p>`
      : '';
  } else if (tab === 'temper') {
    body = it
      ? it.a.length
        ? `<button class="btn pri" data-fg="tmp:all" ${S.gold < temperCost(it) ? 'disabled' : ''}>全體淬鍊 ${temperCost(it)} 金</button>
          <p class="fhint">階級、條數不變，只在範圍裡重骰數字（會變高也會變低）。不花潛能，每按一次貴 10%，最多 2 倍。你有 ${S.gold} 金。</p>`
        : `<p class="fhint">白裝沒有詞綴可以淬鍊</p>`
      : '';
  } else {
    const y = it && decompYield(it);
    body = it
      ? `<p class="fhint">分解會拿到：粉 ${y.dust}${y.cls ? ` ＋ ${SHARDI[y.cls].n}碎片 ×${y.n}（最高階那條詞的類別）` : ''}。裝備會消失。</p>
        <button class="btn ${CRAFT.arm ? 'pri' : ''}" data-fg="dec">${CRAFT.arm ? '再按一次確認分解' : '分解'}</button>`
      : '';
  }
  return `<div class="ph"><b>鍛造台</b><span class="ftabs">${tabs
    .map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-fg="tab:${k}">${n}</button>`)
    .join('')}</span>${swapB('背包')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  ${matsHTML(tab === 'forge')}
  ${selHTML(it, tab === 'temper')}
  ${CRAFT.log ? `<p class="flog">${esc(CRAFT.log)}</p>` : ''}
  ${body}`;
}
/* 做完一次：寫下拿掉什麼、加了什麼 */
function craftLog(before, it) {
  const out = before.filter(a => !it.a.includes(a)),
    add = it.a.filter(a => !before.includes(a));
  return [
    out.length ? '拿掉：' + out.map(affText).join('、') : '',
    add.length ? '加入：' + add.map(a => affText(a) + ' T' + a.T).join('、') : ''
  ]
    .filter(Boolean)
    .join('；');
}
/* 選裝備（鍛造台開著時，點一下背包或身上的裝備） */
function craftPick(src, it, eqk) {
  CRAFT.sel = { src, id: it.id, eqk };
  TOUCH.front = 'other'; /* 手機窄螢幕：選好就切回鍛造台 */
  CRAFT.log = '';
  CRAFT.arm = 0;
  sfx('equip');
  hudPanels();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-fg]');
  if (!b || b.disabled) return;
  const [k, v] = b.dataset.fg.split(':'),
    it = craftItem();
  let err = null;
  if (k === 'tab') (CRAFT.tab = v), (CRAFT.arm = 0);
  else if (k === 'cls') CRAFT.cls = CRAFT.cls === v ? null : v;
  else if (k === 'op' && it) {
    const before = it.a.slice();
    err = forgeDo(it, v, CRAFT.cls);
    if (!err) (CRAFT.log = FORGE[v].n + '：' + (craftLog(before, it) || '完成')), sfx('equip');
  } else if (k === 'tmp' && it) {
    err = temperDo(it, v === 'all' ? null : +v);
    if (!err) (CRAFT.log = `淬鍊完成 · 完美度 ${Math.round(perfection(it) * 100)}%`), sfx('coin');
  } else if (k === 'dec' && it) {
    if (!CRAFT.arm) CRAFT.arm = 1;
    else {
      takeOut(CRAFT.sel.src, it, CRAFT.sel.eqk);
      const y = decompDo(it);
      CRAFT.sel = null;
      CRAFT.arm = 0;
      CRAFT.log = `分解：粉 +${y.dust}${y.cls ? `、${SHARDI[y.cls].n}碎片 +${y.n}` : ''}`;
      sfx('coin');
    }
  } else if (k === 'gup' || k === 'aup') {
    /* 寶石升級（技能欄 i 的技能寶石／光環欄 j） */
    const g = k === 'gup' ? S.skills[+v].a : S.auras[+v];
    if (g) err = gemUp(g);
    if (!err) sfx('lvup');
  } else if (k === 'sup') {
    const a = S.skills[+v].a;
    for (const g of (a && a.sup) || []) if (g && !gemUpCheck(g).why) gemUp(g);
    sfx('lvup');
  } else if (k === 'dri') {
    const a = S.skills[+v].a;
    if (a) err = drillDo(a);
    if (!err) sfx('equip');
  }
  if (err) hudWarn(err);
  changed();
});
