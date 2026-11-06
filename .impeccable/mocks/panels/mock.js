/* 三個面板的可操作 mock：覆寫 skillHTML／devHTML／ascHTML，規則全部走現有函式（gemUp、drillDo、treeToggle…）。
   不上線、不進 index.html；使用者選定後才搬進 js/hud.js。 */
'use strict';
const fmt = n => Math.round(n).toLocaleString('en-US');
const MOCKHUNT = { on: false };
const STARI = `<svg class="ico mxs" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6l1.9 4 4.4.6-3.2 3.1.8 4.4L8 11.6l-3.9 2.1.8-4.4L1.7 6.2l4.4-.6z"/></svg>`;

/* ---------- 技能寶石 ---------- */
/* 升滿的目標：角色等級、靈魂都夠，而且升完還能用（寶石等級會拉高能力值需求） */
function gemSafe(g) {
  const cap = gemCap(S.lv),
    soul = MAT().soul;
  let lv = g.lv,
    c = 0,
    stop = null;
  while (lv < cap && c + soulCost(lv) <= soul) {
    const l = gemLack({ ...g, lv: lv + 1 });
    if (l.length) {
      stop = `Lv ${lv + 1} 要${lackTxt(l)}`;
      break;
    }
    c += soulCost(lv++);
  }
  const why = lv > g.lv ? null : stop || gemUpCheck(g).why;
  return { lv, c, why };
}
const eqGems = () => [...S.skills.flatMap(k => (k.a ? [k.a, ...k.a.sup.filter(Boolean)] : [])), ...S.auras.filter(Boolean)];
/* 全部升滿：最低等的先升一級，靈魂不夠時大家平均 */
function allPlan() {
  const cap = gemCap(S.lv),
    L = eqGems().map(g => ({ g, lv: g.lv }));
  let c = 0;
  for (;;) {
    let b = null;
    for (const x of L) {
      if (x.lv >= cap || c + soulCost(x.lv) > MAT().soul || gemLack({ ...x.g, lv: x.lv + 1 }).length) continue;
      if (!b || x.lv < b.lv) b = x;
    }
    if (!b) break;
    c += soulCost(b.lv++);
  }
  return { c, L: L.filter(x => x.lv > x.g.lv) };
}
const gxSpend = c => c >= MAT().soul * 0.5; /* 花掉一半以上才按兩次 */
const gxUp = (g, c) => `<span class="gx-tgt">升到 ${c.lv}</span><small>${fmt(c.c)} 魂</small>`;

function skillHTML() {
  const M = MAT(),
    P0 = allPlan(),
    sel = SKUI.sel,
    sock = (key, it, cls, lab, bad) =>
      `<div class="eqs sock ${cls} ${it ? 'r3' : 'emp'} ${bad ? 'bad-link' : ''} ${sel === key ? 'sel' : ''}" data-sock="${key}" ${it ? '' : `data-gen="${key}" title="點一下挑${lab}寶石"`}>${it ? itemHTML(it, 'sock', key) : `<small>${ICO.plus}</small>`}</div>`,
    upBtn = key => {
      const g = slotGet('sock', key),
        c = gemSafe(g);
      if (g.lv >= GEM_MAX) return `<span class="gx-done">已滿</span>`;
      return c.why
        ? `<span class="gx-why" title="${esc(c.why)}">${esc(gxShort(c.why))}</span>`
        : `<button class="btn mini gx-up" data-gx="max:${key}" aria-label="升到 Lv ${c.lv}，花 ${c.c} 靈魂">${gxUp(g, c)}</button>`;
    };
  const rows = S.skills
    .map((sl, i) => {
      const c = slotCfg(i),
        g = sl.a,
        key = i + ':a';
      if (!g)
        return `<div class="gx-row emp"><div class="gx-k"><kbd>${SLOTKEY[i]}</kbd>${sock(key, null, 'act', '技能')}</div><div class="gx-main"><small class="c-dim">空的：點空格挑一顆技能</small></div></div>`;
      const need = !wtOK(c.D) && `<em class="c-bad">${needTxt(c.D)}</em>`,
        off = gemLack(g).length ? `<em class="c-bad">失效</em>` : '',
        N = skillNums(c),
        val = N.dps ?? N.unit ?? N.dot ?? N.hit,
        lab = N.dps != null ? 'DPS' : N.unit != null ? '單體' : N.dot != null ? '每秒' : '每下';
      const holes = Array.from({ length: GEM_SO_MAX }, (_, j) => {
        if (j < g.so) return sock(i + ':' + j, g.sup[j], 'sup', '輔助', g.sup[j] && !supOK(SKILLS[g.gem], g.sup[j], g));
        if (j === g.so) {
          const d = drillCheck(g);
          return `<button class="eqs sock sup lock next" data-fg="dri:${i}" ${d.why ? `disabled title="${esc(d.why)}"` : ''} aria-label="解鎖第 ${j + 1} 孔，要${DUSTS[d.m]} ×${d.n}${d.why ? '（' + d.why + '）' : ''}">${ICO.chain}<small>${d.n}</small></button>`;
        }
        return `<div class="eqs sock sup lock">${ICO.chain}</div>`;
      }).join('');
      return `<div class="gx-row ${sel && sel.split(':')[0] === '' + i ? 'on' : ''}" data-gx="sel:${key}" role="button" tabindex="0"><div class="gx-k"><kbd>${SLOTKEY[i]}</kbd>${sock(key, g, 'act', '技能')}</div><div class="gx-main"><div class="gx-l1"><b>${esc(c.D.n)}</b><span class="gx-lv">Lv ${g.lv}${c.lv > g.lv ? ` <i>+${c.lv - g.lv}</i>` : ''}</span>${need || off || ''}<span class="gx-dps">${val != null ? `${lab} <i class="skv el-${N.el || 'phys'}">${fmtN(val)}</i>` : N.eff ? esc(N.eff) : ''}</span></div><div class="links">${holes}</div></div><div class="gx-r">${upBtn(key)}</div></div>`;
    })
    .join('');
  const auras = `<div class="gx-aura"><div class="gx-ah"><b>光環</b><span>精魂 ${ST.spiritUsed}/${ST.spirit}</span></div><div class="gx-as">${S.auras
    .map((g, j) => {
      const key = 'A:' + j,
        on = g && ST.auraOn.includes(g.gem);
      return `<div class="gx-ac ${sel === key ? 'on' : ''}" ${g ? `data-gx="sel:${key}" role="button" tabindex="0"` : ''}>${sock(key, g, 'act', '光環', g && !on)}<span>${g ? `<b>${esc(AURAS[g.gem].n)}</b><small class="${on ? '' : 'c-bad'}">${on ? `Lv ${g.lv}` : '沒生效'}</small>` : '<small class="c-dim">空的</small>'}</span></div>`;
    })
    .join('')}</div></div>`;
  return `<div class="ph"><b>技能寶石</b><span class="gx-res">靈魂 <b>${fmt(M.soul)}</b> · 粉 <b>${M.dust}／${M.fine}／${M.rare}</b></span>${swapB('背包')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="gx-bar"><button class="btn pri" data-gx="all" ${P0.L.length ? '' : `disabled title="沒有能升的寶石"`}>${P0.L.length ? `全部升滿 · ${P0.L.length} 顆 · ${fmt(P0.c)} 魂` : '裝著的寶石都升到頂了'}</button><button class="btn mini gx-gen" data-gm="open:act">生成</button></div>
  <div class="gx-list">${rows}${auras}</div>
  ${sel ? gxIns(sel) : ''}`;
}
/* 列上的原因要短：詳細的留在面板下方 */
const gxShort = w =>
  /靈魂/.test(w) ? '靈魂不夠' : /^Lv \d+ 要角色/.test(w) ? '角色 ' + w.match(/Lv \d+$/)[0] : /^Lv \d+ 要/.test(w) ? '能力值不夠' : w;
/* 下方的檢視區：選中的那顆寶石，先看得到什麼，再看怎麼花 */
function gxIns(key) {
  const g = slotGet('sock', key);
  if (!g) return '';
  const D = gemOf(g),
    main = !isSup(g) && !isAura(g),
    i = key.split(':')[0],
    up = gemUpCheck(g),
    mx = gemSafe(g),
    Q = gemQCheck(g),
    tgt = mx.why ? g.lv + 1 : mx.lv;
  let delta = '';
  if (main && g.lv < GEM_MAX) {
    const m = n => n.dps ?? n.unit ?? n.dot ?? n.hit,
      a = skillNums(gemCfg(g, -1)),
      b = skillNums(gemCfg({ ...g, lv: tgt }, -1));
    delta = `<div class="gx-d"><small>升到 Lv ${tgt}</small>${m(a) != null ? `<b>${fmtN(m(a))} → <i class="c-good">${fmtN(m(b))}</i></b>` : '<b>效果不變</b>'}</div>`;
  } else if (isSup(g)) {
    const a = S.skills[i].a,
      c0 = skillNums(gemCfg({ ...a, sup: a.sup.map(x => (x === g ? null : x)) }, -1)),
      c1 = skillNums(gemCfg(a, -1)),
      m = n => n.dps ?? n.unit ?? n.dot ?? n.hit,
      r = m(c0) ? m(c1) / m(c0) : 1;
    delta = `<div class="gx-d"><small>對${esc(SKILLS[a.gem].n)}</small><b>${Math.abs(r - 1) > 0.005 ? `DPS <i class="c-good">×${r.toFixed(2)}</i>` : '不影響數字'}</b></div>`;
  } else if (isAura(g)) delta = `<div class="gx-d"><small>預留精魂</small><b>${D.sp}</b></div>`;
  const lack = main && gemLack({ ...g, lv: g.lv + 1 }).length ? gemLack({ ...g, lv: g.lv + 1 }) : null,
    b = (fg, lab, sub, why) =>
      `<button class="btn gx-b" data-gx="${fg}" ${why ? `disabled title="${esc(why)}"` : ''}>${lab}<small>${esc(sub)}</small></button>`;
  const calc = main && SKUI.calc ? skDetail(g) : '';
  return `<div class="gx-ins" data-key="${key}">
    <button class="x gx-c" data-gx="unsel" aria-label="收起">${ICO.x}</button>
    <div class="gx-ih">${icHTML(itemIc(g))}<div><b class="rc3">${esc(D.n)}</b><small>Lv ${g.lv}${g.q ? ` · 品質 ${g.q}%` : ''}${main ? ` · 孔 ${g.so}／${GEM_SO_MAX}` : ''}</small></div>${delta}</div>
    <p class="gx-txt">${termify(D.d)}</p>
    ${main && !wtOK(D) ? `<p class="c-bad gx-txt">${needTxt(D)}，沒有效果</p>` : ''}
    ${lack ? `<p class="c-warn gx-txt">升到 Lv ${g.lv + 1} 需要${lackTxt(lack)}，升了會失效</p>` : ''}
    <div class="gx-acts">
      ${b('up:' + key, '升 1 級', up.why && g.lv >= GEM_MAX ? '已滿' : up.why ? gxShort(up.why) : fmt(up.c) + ' 魂', up.why)}
      ${b('max:' + key, g.lv >= GEM_MAX ? '已滿' : `升到 Lv ${mx.why ? g.lv : mx.lv}`, mx.why ? gxShort(mx.why) : fmt(mx.c) + ' 魂', mx.why)}
      ${Q.n ? b('q:' + key, '品質到滿', Q.why ? Q.why : Math.min(Q.n, MAT().fine) + ' 精粉', Q.why) : b('q:' + key, '品質已滿', '20%', '品質已滿')}
    </div>
    <div class="gx-sub">
      <button class="btn mini" data-gx="swap:${key}">${main ? '換一招' : '換一顆'}</button>
      <button class="btn mini" data-gx="out:${key}">卸下</button>
      ${main ? `<button class="btn mini" data-gx="calc">${SKUI.calc ? '收起算式' : '傷害算式'}</button>` : ''}
    </div>
    ${calc}
  </div>`;
}
/* 換技能：寶石留給舊寶石的孔，相容的輔助照新寶石的孔數帶過去（跟手動一顆一顆搬的結果一樣，不多給） */
function gxPut(to, g) {
  const old = slotGet('sock', to);
  if (old && to.endsWith(':a') && old.sup && g.sup) {
    const keep = [];
    old.sup.forEach((s, j) => {
      if (s && keep.length < g.so && supOK(SKILLS[g.gem], s, { ...g, sup: keep })) keep.push(s), (old.sup[j] = null);
    });
    g.sup = Array.from({ length: g.so }, (_, j) => keep[j] || null);
  }
  slotSet('sock', to, g);
  if (old && !gridAuto(S.inv, old)) S.gems.push(old);
}
const gxOwn = to =>
  [...S.inv.items, ...S.gems].filter(g => g.gem && gemFits(g.gem) && !(slotGet('sock', to) === g));
{
  const gemHTML0 = gemHTML,
    gemMake0 = gemMake;
  window.gemHTML = () => {
    const to = GEMUI.to,
      html = gemHTML0();
    if (!to) return html;
    const old = slotGet('sock', to),
      own = gxOwn(to),
      cv =
        old && to.endsWith(':a')
          ? `<p class="gx-carry">舊的「${esc(gemOf(old).n)}」回背包；相容的輔助帶過去，超過新寶石孔數的留在舊寶石上</p>`
          : '',
      list = own.length
        ? `<div class="ph2">你有的 <span>放進去不用花靈魂</span></div><div class="gx-own">${own.map(g => `<button class="gpr gx-o" data-gx="put:${g.id}">${icHTML(itemIc(g))}<b>${esc(gemOf(g).n)}</b><span>Lv ${g.lv}</span>${gxGain(to, g)}</button>`).join('')}</div><div class="ph2">生成新的</div>`
        : '';
    return html.replace('<b>生成並裝上</b>', `<b>挑一顆${to[0] === 'A' ? '光環' : to.endsWith(':a') ? '技能' : '輔助'}</b>`).replace('<div class="gwrap">', `${cv}${list}<div class="gwrap">`);
  };
  window.gemMake = k => {
    const to = GEMUI.to,
      old = to && slotGet('sock', to);
    if (!old) return gemMake0(k);
    const why = gemWhy(k);
    if (why) return hudWarn(why);
    gxPut(to, mkGem(k));
    PANEL.gem = false;
    GEMUI.to = null;
    MAT().soul -= gemCost(k);
    sfx('pick');
    changed();
  };
}
/* 這顆輔助插進去 DPS 會變多少 */
function gxGain(to, x) {
  if (!x || to.endsWith(':a') || to[0] === 'A' || SUPPORTS[x.gem || x] == null) return '';
  const [i, p] = to.split(':'),
    a = S.skills[i].a,
    m = n => n.dps ?? n.unit ?? n.dot ?? n.hit,
    c0 = skillNums(gemCfg(a, -1)),
    c1 = skillNums(gemCfg({ ...a, sup: a.sup.map((s, j) => (j === +p ? { gem: x.gem || x, lv: x.lv || 1, q: x.q || 0 } : s)) }, -1)),
    r = m(c0) ? m(c1) / m(c0) : 1;
  return r > 1.005 ? `<i class="gx-gain">DPS +${Math.round((r - 1) * 100)}%</i>` : '';
}
{
  const hp0 = hudPanels,
    qm0 = quickMove,
    tap0 = tapItem,
    open0 = openPanel;
  window.quickMove = (src, it, eqk) => {
    if (src === 'sock') return (SKUI.sel = eqk), (SKUI.calc = 0), hudPanels();
    return qm0(src, it, eqk);
  };
  window.tapItem = d => {
    if (d.src === 'sock') return (SKUI.sel = d.eqk), (SKUI.calc = 0), hudPanels();
    return tap0(d);
  };
  window.openPanel = k => {
    if (k === 'skill') SKUI.sel = PORT() ? null : SKUI.sel || (S.skills.findIndex(s => s.a) + ':a');
    open0(k);
    if (k === 'device') (PANEL.card = bestCard()), hudPanels();
    if (k === 'asc') (ASCUI.v = ASCUI.v || S.asc || Object.keys(ASC)[0]), (ASCUI.n = null), hudPanels();
  };
  window.hudPanels = () => {
    if (SKUI.sel && !slotGet('sock', SKUI.sel)) SKUI.sel = null;
    hp0();
    document.body.classList.toggle('gxs', !!(PANEL.skill && SKUI.sel));
    if (TOUCH.on && PORT() && PANEL.skill && SKUI.sel) $('pinv').hidden = true;
    /* 844×390 這種「不算窄但很矮」：技能面板佔滿，背包要能切換 */
    if (TOUCH.on && !PORT() && !NARROW && innerHeight <= 480 && PANEL.inv && PANEL.skill) {
      if (TOUCH.front === 'inv') $('pskill').hidden = true;
      else $('pinv').hidden = true;
    }
    if (PANEL.gem) gxPick();
    const r = document.querySelector('.mx-ruler .on');
    if (r && PANEL.device) r.scrollIntoView({ block: 'nearest', inline: 'center' });
  };
}
/* 生成清單上補「插了會怎樣」 */
function gxPick() {
  const to = GEMUI.to;
  if (!to || to.endsWith(':a') || to[0] === 'A') return;
  for (const b of document.querySelectorAll('#pgem [data-gm^="mk:"]')) {
    const h = gxGain(to, b.dataset.gm.split(':')[1]);
    if (h) b.closest('.gcard').querySelector('b').insertAdjacentHTML('afterend', h);
  }
}
const gxFlash = key => {
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-gx="sel:${key}"] .gx-lv`);
    if (el) el.classList.add('flash');
  });
};
document.addEventListener(
  'click',
  e => {
    const b = e.target.closest('[data-gx]');
    if (!b) return;
    /* 列上的格子、按鈕各管各的 */
    const [k, ...r] = b.dataset.gx.split(':'),
      key = r.join(':');
    if (k === 'sel') {
      if (e.target.closest('.eqs,.btn,.tlink')) return;
      SKUI.sel = key;
      SKUI.calc = 0;
      return hudPanels();
    }
    e.stopPropagation();
    if (b.disabled) return;
    const g = key.includes(':') && slotGet('sock', key);
    if (k === 'max') {
      const c = gemSafe(g);
      if (c.why) return hudWarn(c.why);
      if (gxSpend(c.c) && !confirm2(b, `<span class="gx-tgt">再按一次</span><small>花 ${fmt(c.c)} 魂</small>`)) return;
      MAT().soul -= c.c;
      g.lv = c.lv;
      sfx('lvup');
      changed();
      gxFlash(key);
    } else if (k === 'up') {
      const err = gemUp(g);
      if (err) return hudWarn(err);
      sfx('lvup');
      changed();
      gxFlash(key);
    } else if (k === 'q') {
      const err = gemQUp(g, true);
      if (err) return hudWarn(err);
      sfx('equip');
      changed();
    } else if (k === 'all') {
      const P0 = allPlan();
      if (gxSpend(P0.c) && !confirm2(b, `再按一次：花 ${fmt(P0.c)} 魂`)) return;
      MAT().soul -= P0.c;
      P0.L.forEach(x => (x.g.lv = x.lv));
      sfx('lvup');
      changed();
    } else if (k === 'unsel') (SKUI.sel = null), hudPanels();
    else if (k === 'calc') (SKUI.calc = !SKUI.calc), hudPanels();
    else if (k === 'out') {
      if (!gridAuto(S.inv, g)) return hudWarn('背包滿了');
      slotSet('sock', key, null);
      SKUI.sel = null;
      sfx('click');
      changed();
    } else if (k === 'swap') gemOpenFor(key);
    else if (k === 'put') {
      const it = [...S.inv.items, ...S.gems].find(x => x.id === +key),
        to = GEMUI.to,
        lk = slotLack('sock', to, it);
      if (lk.length) return hudWarn('能力值不足：' + lackTxt(lk));
      if (S.gems.includes(it)) S.gems.splice(S.gems.indexOf(it), 1);
      else takeOut('inv', it);
      gxPut(to, it);
      PANEL.gem = false;
      GEMUI.to = null;
      sfx('equip');
      changed();
    }
  },
  true
);

/* ---------- 地圖台 ---------- */
/* 致命詞的短名字：卡上要一眼掃過去（正式版放進 MAPMOD 的 s 欄） */
const MODS = { hp3: '怪物生命 +80%', dmg3: '怪物傷害 +50%', crit2: '怪物暴擊 +25%', regen3: '不能回復生命', maxres3: '最大抗性 −20%', cuEn: '衰弱詛咒', pen: '穿透抗性 15%' };
const cardOrder = () =>
  mapCards(S)
    .slice(0, cardsOpen(S))
    .map((c, i) => ({ c, i }))
    .sort((a, b) => cardRew(b.c).qty - cardRew(a.c).qty || b.c.star - a.c.star);
function bestCard() {
  const L = cardOrder(),
    t = PANEL.pick || S.maxT;
  return (L.find(x => S.frag >= mapCost(t, x.c.star)) || L[0]).i;
}
const mxDet = (cd, c, big) => {
  const rw = cardRew(cd),
    G3 = [
      [3, '致命'],
      [2, '中等'],
      [1, '溫和']
    ]
      .map(([d, n]) => {
        const L = cd.mods.filter(k => MAPMOD[k].d === d);
        return L.length ? `<li class="d${d}"><h5>${n} <i>${L.length}</i></h5>${L.map(k => `<p>${esc(MAPMOD[k].t)}</p>`).join('')}</li>` : '';
      })
      .join('');
  return `<div class="mx-rew"><div><b>+${rw.qty}%</b><small>物品數量</small></div><div><b>+${rw.rar}%</b><small>稀有度</small></div><div><b>+${rw.mat}%</b><small>材料</small></div></div>
  <ul class="mx-mods">${G3 || '<li><p>沒有地圖詞</p></li>'}</ul>`;
};
function devHTML() {
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
      return `<button class="mx-t ${n === t ? 'on' : ''} ${lock ? 'lock' : ''}" ${lock ? `disabled title="打倒階級 ${S.maxT} 的王開放下一階"` : `data-tier="${n}"`} aria-label="階級 ${n}${lock ? '（還沒開放）' : ''}">${n}</button>`;
    }).join(''),
    list = cardOrder()
      .map(({ c: cd, i: k }) => {
        const r = cardRew(cd),
          cc = mapCost(t, cd.star),
          d3 = cd.mods.filter(x => MAPMOD[x].d === 3),
          rest = cd.mods.length - d3.length;
        return `<button class="mx-c ${k === i ? 'on' : ''}" data-card="${k}" style="--sc:${STARS[cd.star].c}">
        <span class="mx-st" aria-label="${cd.star} 星">${STARI.repeat(cd.star)}</span>
        <span class="mx-rw"><b>+${r.qty}%</b> 數量 · <b>+${r.rar}%</b> 稀有</span>
        <span class="mx-co ${S.frag < cc ? 'c-bad' : ''}">${cc ? `${cc} 碎片` : '免費'}</span>
        <span class="mx-dg">${d3.map(x => `<i class="mx-k">${MODS[x]}</i>`).join('')}<i class="mx-n">${d3.length ? `＋${rest} 條` : cd.mods.length ? `${cd.mods.length} 條，沒有致命詞` : '沒有詞'}</i></span></button>`;
      })
      .join(''),
    lockN = cards.length > open ? `<div class="mx-lock">${ICO.lock}再打到階級 ${3 * (open - 2) + 1} 多開一張卡</div>` : '',
    hunt = MOCKHUNT.on
      ? `<div class="mx-hunt"><span>狩獵之血</span><div class="pb"><i style="--v:.62"></i></div><small>62%</small></div>`
      : '',
    zod = MOCKHUNT.on
      ? `<button class="mx-c zod" style="--sc:#e5484d"><span class="mx-st">${STARI.repeat(4)}</span><span class="mx-rw"><b>墮落丑牛</b> 生肖王卡</span><span class="mx-co">18 碎片</span><span class="mx-dg"><i class="mx-n">額外掉落＋1 件保底高品質裝</i></span></button>`
      : '';
  return `<div class="ph"><b>地圖台</b><span>地圖碎片 <b class="c-gold">${S.frag}</b></span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="mx-top"><div class="mx-ruler" role="group" aria-label="階級">${ruler}</div>
    <p class="mx-info"><span>怪物 Lv ${lv} · 生命 ×${m.hp.toFixed(1)} · 傷害 ×${m.dmg.toFixed(1)}${resPen(lv) ? ` · <i class="c-warn">元素抗性 −${resPen(lv)}%</i>` : ''}</span></p>${hunt}</div>
  <div class="mx-list">${zod}${list}${lockN}</div>
  <div class="mx-det"><div class="mx-sc">${mxDet(card)}</div>
  <button class="btn pri" data-a="open" ${S.frag < c ? 'disabled' : ''}>${S.frag < c ? `碎片不夠（要 ${c}，有 ${S.frag}）` : `${G.scene === 'map' ? '進入下一張' : '開啟傳送門'}${c ? ` · ${c} 碎片` : ''}`}</button></div>`;
}
/* 滑鼠滑過就預覽，不用點 */
document.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse' || !PANEL.device) return;
  const b = e.target.closest('#pdev [data-card]');
  const sc = document.querySelector('#pdev .mx-sc');
  if (!sc) return;
  if (b) sc.innerHTML = mxDet(mapCards(S)[+b.dataset.card]), (sc.dataset.pv = 1);
  else if (sc.dataset.pv && !e.target.closest('.mx-det'))
    (sc.innerHTML = mxDet(mapCards(S)[PANEL.card || 0])), delete sc.dataset.pv;
});

/* ---------- 昇華石碑 ---------- */
/* 盤面半徑：讓最遠的點剛好在圓裡（位置跟天賦樹中間一樣） */
const axR = T => Math.max(...T.N.map(n => Math.hypot(n.x, n.y))) + 36;
function axState(id, cur) {
  if (!cur) return 'off';
  if (S.at.includes(id)) return 'on';
  return treeCan(id) ? 'can' : 'off';
}
function axWhy(id, T) {
  if (S.at.includes(id)) return id === 'a_st' ? '起點' : treeCanRefund(id) ? '' : '先退後面的點';
  if (treeCan(id)) return '';
  if (ascLeft() <= 0) return '昇華點用完了';
  if (T.I[id].g && S.at.some(o => T.I[o].g === T.I[id].g)) return '同一組只能選一個';
  return '要先點亮連著的點';
}
function axCap(k, T, sel, cur, A) {
  if (!sel) return `<div class="ax-cap ph0"><p>${esc(A.d)}</p></div>`;
  const w = cur ? axWhy(sel.id, T) : '',
    on = cur && S.at.includes(sel.id),
    gn = sel.g && T.N.filter(n => n.g === sel.g).length,
    txt = sel.big === 1 ? termify(sel.d) : sel.id === 'a_st' ? '昇華的起點' : esc(statLines(sel.s).join(' · '));
  return `<div class="ax-cap"><div><b>${esc(sel.n)}</b>${gn ? `<i>${['', '', '二選一', '三選一'][gn]}</i>` : ''}<p>${txt}</p></div>${
    cur && sel.id !== 'a_st'
      ? `<button class="btn ${on ? '' : 'pri'}" data-ax="t:${sel.id}" ${w ? `disabled title="${esc(w)}"` : ''}>${w || (on ? '退回' : `點亮 · 剩 ${ascLeft()} 點`)}</button>`
      : ''
  }</div>`;
}
function ascHTML() {
  const k = ASCUI.v || S.asc || Object.keys(ASC)[0],
    A = ASC[k],
    T = ascNodes(k),
    cur = S.asc === k,
    pts = ascPoints(S),
    nx = S.maxT <= 6 ? 6 : S.maxT <= 12 ? 12 : !S.t16 ? 16 : 0,
    R = axR(T),
    pos = n => [50 + (n.x / (2 * R)) * 100, 50 + (n.y / (2 * R)) * 100],
    lit = id => cur && S.at.includes(id),
    sel = ASCUI.n && T.I[ASCUI.n] ? T.I[ASCUI.n] : null;
  const lines = T.E.map(
      ([a, b]) =>
        `<line x1="${T.I[a].x}" y1="${T.I[a].y}" x2="${T.I[b].x}" y2="${T.I[b].y}" class="${lit(a) && lit(b) ? 'on' : ''}"/>`
    ).join(''),
    nodes = T.N.map(n => {
      const [x, y] = pos(n);
      return `<button class="ax-n b${n.big} ${axState(n.id, cur)} ${n.g ? 'grp' : ''} ${sel === n ? 'sel' : ''}" data-ax="n:${n.id}" style="left:${x}%;top:${y}%" aria-label="${esc(n.n)}">${n.ic ? icHTML(n.ic) : ''}</button>${n.big === 1 ? `<span class="ax-l ${axState(n.id, cur)}" style="left:${x}%;top:${y}%">${esc(n.n)}</span>` : ''}`;
    }).join('');
  /* 大點清單：選擇組併成一列 */
  const L = [];
  for (const n of T.N) {
    if (n.big !== 1) continue;
    const row = n.g && L.find(r => r.g === n.g);
    if (row) row.n.push(n);
    else L.push({ g: n.g, n: [n] });
  }
  const list = L.map(
    r =>
      `<li class="${r.n.length > 1 ? 'grp' : ''}">${r.n.length > 1 ? `<h5>${['', '', '二選一', '三選一'][r.n.length]}</h5>` : ''}${r.n
        .map(
          n =>
            `<div class="ax-r ${sel === n ? 'on' : ''} ${lit(n.id) ? 'lit' : ''}" data-ax="n:${n.id}" role="button" tabindex="0"><b>${lit(n.id) ? ICO.check || '' : ''}${esc(n.n)}</b><span>${termify(n.d)}</span></div>`
        )
        .join('')}</li>`
  ).join('');
  const cap = axCap(k, T, sel, cur, A);
  const pick = !cur
    ? `<button class="btn pri ax-pick" data-a="asc:${k}">${S.asc ? `改成${A.n}（點數退回）` : `成為${A.n}`}</button>`
    : '';
  const [sm, bg] = S.asc ? ascCount() : [0, 0];
  return `<div class="ph"><b>昇華石碑</b><span class="ax-sum">剩 <b>${S.asc ? ascLeft() : pts}</b> 點${S.asc ? ` · 小 ${sm}/4 · 大 ${bg}/4` : ''}</span>${S.asc && S.at.length > 1 ? `<button class="btn mini ax-reset" data-ax="reset">重置</button>` : ''}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="ax-tabs" role="tablist">${Object.entries(ASC)
    .map(
      ([id, B]) =>
        `<button class="ax-tab ${id === k ? 'on' : ''}" role="tab" aria-selected="${id === k}" data-ax="v:${id}">${icHTML(B.ic)}<span>${B.n}${S.asc === id ? '<i>目前</i>' : ''}</span></button>`
    )
    .join('')}</div>
  <div class="ax-chart"><div class="ax-disc"></div><svg viewBox="${-R} ${-R} ${2 * R} ${2 * R}" aria-hidden="true">${lines}</svg>${nodes}</div>
  <div class="ax-side">${cap}<ul class="ax-list">${list}${nx ? `<li class="ax-note">第一次打倒階級 ${nx} 的王：昇華點 +2。換昇華免費，點數全部退回</li>` : ''}</ul>${pick}</div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ax]');
  if (!b || e.target.closest('.term')) return;
  const [k, id] = b.dataset.ax.split(':');
  const cur = S.asc === ASCUI.v;
  if (k === 'v') (ASCUI.v = id), (ASCUI.n = null), sfx('click');
  else if (k === 'n') {
    if (TOUCH.on || !cur || !b.classList.contains('ax-n') || id === 'a_st') {
      /* 手機：第一下選取、第二下點亮（跟天賦樹一樣） */
      if (TOUCH.on && cur && ASCUI.n === id && b.classList.contains('ax-n') && !axWhy(id, ascT())) treeToggle(id);
      ASCUI.n = id;
    } else {
      ASCUI.n = id;
      if (!axWhy(id, ascT())) treeToggle(id);
      else hudWarn(axWhy(id, ascT()));
    }
  } else if (k === 't') treeToggle(id);
  else if (k === 'reset') {
    if (!confirm2(b, '再按一次：退回全部昇華點')) return;
    S.at = ['a_st'];
    treeChanged();
  }
  hudPanels();
});
/* 成為昇華後留在石碑，直接點 */
{
  const a0 = act;
  window.act = a => {
    a0(a);
    if (a.startsWith('asc:')) (ASCUI.n = null), hudPanels();
  };
}
/* 滑鼠滑過點或清單列就更新說明列，不用點 */
document.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse' || !PANEL.asc) return;
  const b = e.target.closest('#pasc [data-ax^="n:"]'),
    cap = document.querySelector('#pasc .ax-cap');
  if (!b || !cap || b.dataset.ax.slice(2) === cap.dataset.n) return;
  const k = ASCUI.v,
    T = ascNodes(k),
    id = b.dataset.ax.slice(2);
  cap.outerHTML = axCap(k, T, T.I[id], S.asc === k, ASC[k]);
  document.querySelector('#pasc .ax-cap').dataset.n = id;
});
