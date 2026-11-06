/* 地圖台的可操作 mock（2026-11-06 暫停）：覆寫 devHTML，規則走現有函式。不上線、不進 index.html。
   地圖系統要改成 PoE2 式大地圖，階級尺與開圖流程可能整個換掉，卡片的呈現可能留用。設計筆記在 README.md */
'use strict';
/* 致命詞的短名：正式版要放進 MAPMOD 的 s 欄 */
const MODS = {
  hp3: '怪物生命 +80%',
  dmg3: '怪物傷害 +50%',
  crit2: '怪物暴擊 +25%',
  regen3: '不能回復生命',
  maxres3: '最大抗性 −20%',
  cuEn: '衰弱詛咒',
  pen: '穿透抗性 15%'
};
/* 網址加 &hunt 看預留的位置（假資料） */
const MOCKHUNT = { on: new URLSearchParams(location.search).has('hunt') };
const MXSTAR = `<svg class="ico mxs" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6l1.9 4 4.4.6-3.2 3.1.8 4.4L8 11.6l-3.9 2.1.8-4.4L1.7 6.2l4.4-.6z"/></svg>`;
/* 清單：獎勵高的排前面（i 是在 S.cards 的位置）；預選買得起的最肥一張 */
const cardOrder = s =>
  mapCards(s)
    .slice(0, cardsOpen(s))
    .map((c, i) => ({ c, i }))
    .sort((a, b) => cardRew(b.c).qty - cardRew(a.c).qty || b.c.star - a.c.star);
function bestCard(s, t) {
  const L = cardOrder(s);
  return (L.find(x => s.frag >= mapCost(t, x.c.star)) || L[0]).i;
}
/* 右欄：這張卡的獎勵與全部地圖詞，照危險度分組 */
function devDet(cd) {
  const rw = cardRew(cd),
    mods = [
      [3, '致命'],
      [2, '中等'],
      [1, '溫和']
    ]
      .map(([d, n]) => {
        const L = cd.mods.filter(k => MAPMOD[k].d === d);
        return L.length
          ? `<li class="d${d}"><h5>${n} <i>${L.length}</i></h5>${L.map(k => `<p>${termify(MAPMOD[k].t)}</p>`).join('')}</li>`
          : '';
      })
      .join('');
  return `<div class="mx-rew"><div><b>+${rw.qty}%</b><small>物品數量</small></div><div><b>+${rw.rar}%</b><small>稀有度</small></div><div><b>+${rw.mat}%</b><small>材料</small></div></div>
  <ul class="mx-mods">${mods || '<li><p>沒有地圖詞</p></li>'}</ul>`;
}
window.devHTML = () => {
  const t = PANEL.pick,
    cards = mapCards(S),
    open = cardsOpen(S),
    i = Math.min(PANEL.card || 0, open - 1),
    card = cards[i],
    c = mapCost(t, card.star),
    m = tierMob(t),
    lv = mobLv(t);
  const ruler = Array.from({ length: TMAX }, (_, k) => {
      const n = k + 1,
        lock = n > S.maxT;
      return `<button class="mx-t ${n === t ? 'on' : ''} ${lock ? 'lock' : ''}" ${lock ? `disabled title="打倒階級 ${S.maxT} 的王開放下一階"` : `data-tier="${n}"`} aria-label="階級 ${n}${lock ? '（還沒開放）' : ''}" aria-pressed="${n === t}">${n}</button>`;
    }).join(''),
    list = cardOrder(S)
      .map(({ c: cd, i: k }) => {
        const r = cardRew(cd),
          cc = mapCost(t, cd.star),
          d3 = cd.mods.filter(x => MAPMOD[x].d === 3),
          rest = cd.mods.length - d3.length;
        return `<button class="mx-c ${k === i ? 'on' : ''}" data-card="${k}" style="--sc:${STARS[cd.star].c}">
        <span class="mx-st" aria-label="${cd.star} 星">${MXSTAR.repeat(cd.star)}</span>
        <span class="mx-rw"><b>+${r.qty}%</b> 數量 · <b>+${r.rar}%</b> 稀有</span>
        <span class="mx-co ${S.frag < cc ? 'c-bad' : ''}">${cc ? `${cc} 碎片` : '免費'}</span>
        <span class="mx-dg">${d3.map(x => `<i class="mx-k">${MODS[x]}</i>`).join('')}<i class="mx-n">${d3.length ? `＋${rest} 條` : cd.mods.length ? `${cd.mods.length} 條，沒有致命詞` : '沒有詞'}</i></span></button>`;
      })
      .join(''),
    more = cards.length > open ? `<div class="mx-lock">${ICO.lock}再打到階級 ${3 * (open - 2) + 1} 多開一張卡</div>` : '',
    hunt = MOCKHUNT.on
      ? `<div class="mx-hunt"><span>狩獵之血</span><div class="pb"><i style="--v:.62"></i></div><small>62%</small></div>`
      : '',
    zod = MOCKHUNT.on
      ? `<button class="mx-c zod" style="--sc:#e5484d"><span class="mx-st">${MXSTAR.repeat(4)}</span><span class="mx-rw"><b>墮落丑牛</b> 生肖王卡</span><span class="mx-co">18 碎片</span><span class="mx-dg"><i class="mx-n">額外掉落＋1 件保底高品質裝</i></span></button>`
      : '';
  return `<div class="ph"><b>地圖台</b><span>地圖碎片 <b class="c-gold">${S.frag}</b></span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="mx-top"><div class="mx-ruler" role="group" aria-label="階級">${ruler}</div>
    <p class="mx-info">怪物 Lv ${lv} · 生命 ×${m.hp.toFixed(1)} · 傷害 ×${m.dmg.toFixed(1)}${resPen(lv) ? ` · <span class="c-warn">元素抗性 −${resPen(lv)}%</span>` : ''}</p>${hunt}</div>
  <div class="mx-list">${zod}${list}${more}</div>
  <div class="mx-det"><div class="mx-sc">${devDet(card)}</div>
  <button class="btn pri" data-a="open" ${S.frag < c ? 'disabled' : ''}>${S.frag < c ? `碎片不夠（要 ${c}，有 ${S.frag}）` : `${G.scene === 'map' ? '進入下一張' : '開啟傳送門'}${c ? ` · ${c} 碎片` : ''}`}</button></div>`;
};
/* 滑鼠滑過卡片就預覽，不用點；離開清單回到選中的卡 */
document.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse' || !PANEL.device) return;
  const b = e.target.closest('#pdev [data-card]'),
    sc = document.querySelector('#pdev .mx-sc');
  if (!sc) return;
  if (b && b.dataset.card != null) (sc.innerHTML = devDet(mapCards(S)[+b.dataset.card])), (sc.dataset.pv = 1);
  else if (sc.dataset.pv && !e.target.closest('.mx-det'))
    (sc.innerHTML = devDet(mapCards(S)[PANEL.card || 0])), delete sc.dataset.pv;
});
{
  const open0 = openPanel,
    hp0 = hudPanels;
  window.openPanel = k => {
    open0(k);
    if (k === 'device') (PANEL.card = bestCard(S, S.maxT)), hudPanels();
  };
  /* 重畫時清單不彈回最上面，階級尺捲到選中的那一格 */
  window.hudPanels = () => {
    const L = document.querySelector('#pdev .mx-list'),
      y = L ? L.scrollTop : 0;
    hp0();
    const r = document.querySelector('#pdev .mx-ruler'),
      on = r && r.querySelector('.on'),
      n = document.querySelector('#pdev .mx-list');
    if (on) r.scrollLeft = on.offsetLeft - r.offsetLeft - (r.clientWidth - on.offsetWidth) / 2;
    if (n) n.scrollTop = y;
  };
}
