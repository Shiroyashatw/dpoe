/* dungeonPOE · 鍛造台面板（0.2.6，企劃書 5.3）：藏身處的鍛造台打開（左邊），背包在右邊。
   點一下背包或身上的裝備＝放上鍛造台；分頁：鍛造（花潛能＋三種粉）、淬鍊（花金幣）。
   每個按鈕都寫要花什麼、預覽會發生什麼；不能按的寫原因；推薦的標 ★。技能寶石面板的升級、開孔、書庫按鈕也在這裡處理 */
'use strict';
const CRAFT = { tab: 'forge', cls: null, sel: null, log: '' };
const craftItem = () => (CRAFT.sel ? findItem(CRAFT.sel.src, CRAFT.sel.id, CRAFT.sel.eqk) : null);

/* 詞綴類別（第二步）：選了才知道對哪一類下手 */
const clsHTML = () =>
  `<div class="mats" role="group" aria-label="詞綴類別">${ACLS.map(
    x =>
      `<button class="chip ${CRAFT.cls === x.k ? 'on' : ''}" data-fg="cls:${x.k}" title="對${x.n}類詞綴下手">${icHTML(x.ic)}<small>${x.n}</small></button>`
  ).join('')}</div>`;
/* 預覽：拿掉哪些、可能加入哪些（數字是這件物品等級能出的範圍） */
function fpvHTML(it, op) {
  const W = forgeWhat(it, op, CRAFT.cls),
    out = W.out.length
      ? `<small class="pvout">${W.all ? '全部重骰' : `可能拿掉（各 ${Math.round(100 / W.out.length)}%）`}：${W.out.map(a => esc(affText(a))).join('、')}</small>`
      : '',
    keep = W.keep && W.keep.length ? `<small>鎖住不變：${W.keep.map(a => esc(affText(a))).join('、')}</small>` : '',
    add = W.add.length
      ? `<details class="fpv" ${W.add.length <= 6 ? 'open' : ''}><summary>可能加入 ${W.add.length} 種${W.all ? '' : `（各 ${Math.round(100 / W.add.length)}%）`}</summary><ul>${W.add.map(k => `<li>${esc(affRangeTxt(k, it))}</li>`).join('')}</ul></details>`
      : '';
  return out + keep + add;
}
/* 標題列的材料：只列鍛造用得到的三種粉（淬鍊列金幣） */
const matLine = tab =>
  tab === 'temper'
    ? `金幣 <b class="c-gold">${S.gold}</b>`
    : Object.entries(DUSTS)
        .map(([k, n]) => `${n} <b class="c-gold">${MAT()[k]}</b>`)
        .join(' · ');
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
      ['temper', '淬鍊']
    ];
  let body = '';
  if (tab === 'forge' && it) {
    /* 一次只看一個動作：五選一＋類別＋結果預覽＋一顆主按鈕 */
    const hint = forgeHint(it, CRAFT.cls),
      op = CRAFT.op || hint || 'enhance',
      F = FORGE[op],
      { cost, why } = forgeCheck(it, op, CRAFT.cls),
      noCls = why === '先選一種類別',
      ok = !why || /^.粉不夠/.test(why);
    body = `<div class="fseg" role="tablist" aria-label="鍛造動作">${Object.keys(FORGE)
      .map(
        k =>
          `<button role="tab" aria-selected="${k === op}" class="${k === op ? 'on' : ''}" data-fg="sel:${k}">${hint === k ? `<i>推薦</i>` : ''}${FORGE[k].n}</button>`
      )
      .join('')}</div>
      <p class="fdo">${esc(F.d)}</p>
      ${clsHTML()}
      <div class="fres">${ok ? fpvHTML(it, op) : ''}${why && !noCls ? `<small class="c-bad">${esc(why)}</small>` : ''}</div>
      <button class="btn pri fgo" data-fg="op:${op}" ${why ? 'disabled' : ''}>${noCls ? '先選詞綴類別' : `${F.n} · 潛能 −${cost.pot} · ${DUSTS[cost.du]} ${cost.n}`}</button>`;
  } else if (tab === 'temper') {
    body = it
      ? it.a.length
        ? `<button class="btn pri" data-fg="tmp:all" ${S.gold < temperCost(it) ? 'disabled' : ''}>全體淬鍊 ${temperCost(it)} 金</button>
          <p class="fhint">階級和條數不變，只重骰數字，可能變高也可能變低。每按一次貴 10%，最多 2 倍。</p>`
        : `<p class="fhint">白裝沒有詞綴可以淬鍊</p>`
      : '';
  }
  return `<div class="ph"><b>鍛造台</b><span class="fmat">${matLine(tab)}</span><span class="ftabs">${tabs
    .map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-fg="tab:${k}">${n}</button>`)
    .join('')}</span>${swapB('背包')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
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
  sfx('equip');
  hudPanels();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-fg]');
  if (!b || b.disabled) return;
  const [k, v, x] = b.dataset.fg.split(':'),
    it = craftItem();
  let err = null;
  if (k === 'tab') CRAFT.tab = v;
  else if (k === 'sel') CRAFT.op = v;
  else if (k === 'cls') CRAFT.cls = CRAFT.cls === v ? null : v;
  else if (k === 'op' && it) {
    const before = it.a.slice();
    err = forgeDo(it, v, CRAFT.cls);
    if (!err) (CRAFT.log = FORGE[v].n + '：' + (craftLog(before, it) || '完成')), sfx('equip');
  } else if (k === 'tmp' && it) {
    err = temperDo(it, v === 'all' ? null : +v);
    if (!err) (CRAFT.log = `淬鍊完成 · 完美度 ${Math.round(perfection(it) * 100)}%`), sfx('coin');
  } else if (k === 'dri') {
    const a = S.skills[+v].a;
    if (a) err = drillDo(a);
    if (!err) sfx('equip');
  }
  if (err) hudWarn(err);
  changed();
});
