/* dungeonPOE · 技能面板（0.2.75，企劃書 6.4）：技能、輔助、光環都是目錄（S.lib 只記等級），這張面板挑招、插輔助、花靈魂升級與開孔。
   上排技能卡 → 齒輪圓環（圓心這招、5 個孔＋覺醒槽繞一圈）→ 環底下「每秒」→ 這招的名字與一句說明；點孔／格子／覺醒用同一款詳情卡；
   挑一招、挑輔助是圖示格子選單。文字重點規則（DESIGN.md「文字重點」）：數字白粗體、會改玩法的名詞詞綴藍（接 termify 的名詞卡）、元素詞用元素色。 */
'use strict';
/* i：選中的格（0～4 技能格、5 光環）、ai：光環欄選中第幾個、view：main／skills／sups／auras（後三個是圖示格子選單）、hole：選中的孔（null＝這招自己）、
   pick：選單裡點中的那一格（底下出詳情卡）、f：選單的篩選、calc：展開傷害算式、aw：點了覺醒槽 */
const SKUI = { i: 0, ai: 0, view: 'main', hole: null, pick: null, f: '全部', calc: 0, aw: 0 };
/* 圓環上的位置（單位＝半徑）：第 0 個是正上方的覺醒槽，其他 5 個順時針是 5 個孔 */
const RING = [
  [0, -1],
  [0.866, -0.5],
  [0.866, 0.5],
  [0, 1],
  [-0.866, 0.5],
  [-0.866, -0.5]
];
const ELK = { 火焰: 'fire', 冰冷: 'cold', 閃電: 'light', 混沌: 'chaos' };
/* 代價（橘 .cost）：資料裡用私用字元框起來的（data.js 的 FXC），加上說明文字裡寫死的「傷害更少 N%」「魔力消耗 ×N（>1）」 */
const RICH_RE = new RegExp(
  `((?<!受到的)傷害更少 ?\\d+(?:\\.\\d+)?%|魔力消耗 ?×(?:1\\.\\d+|[2-9]\\d*(?:\\.\\d+)?))|(${Object.keys(TERMS)
    .sort((a, b) => b.length - a.length)
    .join('|')})|(火焰|冰冷|閃電|混沌)|([+−×]?\\d[\\d,]*(?:\\.\\d+)?%?)`,
  'g'
);
/* 說明文字的重點：代價（橘）、名詞（第一次可以點）、元素詞、數字 */
function rich(t, plain) {
  const seen = new Set();
  return t
    .split(/(\uE000.*?\uE001)/)
    .map(p =>
      p[0] === '\uE000'
        ? `<span class="cost">${esc(p.slice(1, -1))}</span>`
        : esc(p).replace(RICH_RE, (w, cost, term, el) =>
            cost
              ? `<span class="cost">${w}</span>`
              : term
                ? plain || seen.has(w)
                  ? `<span class="kw">${w}</span>`
                  : (seen.add(w), `<button class="term kw" data-term="${w}">${w}</button>`)
                : el
                  ? `<span class="res-${ELK[w]}">${w}</span>`
                  : `<span class="n">${w}</span>`
          )
    )
    .join('');
}
const skMain = n => n.dps ?? n.unit ?? n.dot ?? n.hit;
const soulB = (c, sm) => `<span class="soul${sm ? ' sm' : ''}"><i></i>${fmtN(c)}</span>`;
/* 按鈕上的原因要短，詳細的在 title */
const gemShort = w =>
  /靈魂/.test(w)
    ? '靈魂不夠'
    : /要角色/.test(w)
      ? w.replace(/^Lv \d+ 要/, '')
      : /^Lv \d+ 要/.test(w)
        ? '能力值不夠'
        : w;
const BIND = `<svg class="bind" viewBox="0 0 62 62" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5"><g transform="rotate(35 31 31)">${[7, 17, 27, 37, 47, 57].map(x => `<ellipse cx="${x}" cy="31" rx="5" ry="3"/>`).join('')}</g><g transform="rotate(-35 31 31)">${[7, 17, 27, 37, 47, 57].map(x => `<ellipse cx="${x}" cy="31" rx="5" ry="3"/>`).join('')}</g></g></svg>`;
/* 光環沒生效的原因：捷光環拿法系武器或空手、夥伴只能 1 隻、魔像已滿、其他是精魂不夠；short＝卡上的短字 */
function auraWhy(k, short) {
  const wt = ST.wt,
    ks = S.auras.map(x => x && x.k);
  if (AURAS[k].her && (wt === 'unarmed' || SPELLW.has(wt))) return short ? '要武器' : '要拿非法系武器，沒有生效';
  if (AURAS[k].tags.includes('companion') && ST.auraOn.some(o => o !== k && AURAS[o].tags.includes('companion')))
    return short ? '有夥伴' : '同時只能有 1 隻夥伴，沒有生效';
  /* 順序跟 stats() 一樣：先看魔像上限（排在前面、生效的魔像夠多才算滿），沒滿才是精魂不夠 */
  if (
    isGolem(k) &&
    ks.slice(0, ks.indexOf(k)).filter(o => o && isGolem(o) && ST.auraOn.includes(o)).length >= ST.golemMax
  )
    return short ? '魔像已滿' : `魔像已滿（同時最多 ${ST.golemMax} 種），沒有生效`;
  return short ? '缺精魂' : '精魂不夠，沒有生效';
}
/* 傷害算式：傷害怎麼算出來、每顆輔助的貢獻、下一級差多少 */
function skDetail(g) {
  const c = gemCfg(g, -1),
    D = c.D,
    N = skillNums(c),
    row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`,
    rows = [];
  if (N.hit != null) {
    if (isSpell(D)) rows.push(row('基礎', `技能 Lv ${c.lv}：${fmtN(spellDmg(c.lv, 1) * D.m)}`));
    else {
      const W = D.shield ? ST.sdmg : ST.dmg;
      rows.push(row('基礎', `${D.shield ? '盾' : '武器'} ${fmtN(W[0])}～${fmtN(W[1])}`));
      rows.push(row('技能倍率', '×' + c.mult.toFixed(2)));
    }
    rows.push(row('提高', `+${fmtN(N.inc)}%`), row('更多', '×' + N.more.toFixed(2)));
    rows.push(row('暴擊', `${N.ch.toFixed(1)}% · 傷害 ×${N.cm.toFixed(2)}`));
    rows.push(row('基礎攻擊時間', `${baseT(c).toFixed(2)} 秒`), row('出手', `${actDur(c).toFixed(2)} 秒`));
    if (D.tAdd) rows.push(row('增加使用時間', `+${D.tAdd} 秒（不吃速度）`));
  }
  /* 滿溢機率讓每次出手的發數會跳，面板顯示期望值（skills.js 的 projEv） */
  if (D.tags.includes('proj')) rows.push(row('投射物', +c.projEv.toFixed(2)));
  /* 三連隕石（覺醒 B）：每秒把每顆都算進去，假設全部打中 */
  if (c.volley > 1) rows.push(row('同時落下', `${c.volley} 顆，每秒以全部打中計`));
  const sups = (g.sup || [])
      .filter(sp => sp && supOK(D, sp, g))
      .map(sp => {
        const n = skillNums(gemCfg({ ...g, sup: g.sup.map(x => (x === sp ? null : x)) }, -1)),
          r = N.hit != null && skMain(n) ? skMain(N) / skMain(n) : 1,
          S0 = gemOf(sp);
        return `<li><b>${esc(S0.n)}</b>${Math.abs(r - 1) > 0.005 ? ` <i class="skv">×${r.toFixed(2)}</i>` : ''}<small>${esc(S0.d)}</small></li>`;
      })
      .join(''),
    nx = g.lv < GEM_MAX && gemCfg({ ...g, lv: g.lv + 1 }, -1),
    nN = nx && skillNums(nx);
  return `<div class="skd"><dl>${rows.join('')}</dl>${sups ? `<ul>${sups}</ul>` : ''}${
    nx
      ? `<p class="base">下一級：${skMain(N) != null ? `${N.dps != null ? 'DPS' : '傷害'} ${fmtN(skMain(N))} → <i class="skv">${fmtN(skMain(nN))}</i>` : '效果不變'}${nx.mp !== c.mp ? ` · 魔力 ${c.mp} → ${nx.mp}` : ''}</p>`
      : '<p class="base">已經滿級</p>'
  }<p class="hint">不算怪物的抗性、護甲和閃避，實際打怪會比較低</p></div>`;
}

/* ---------- 目前選的那一格 ---------- */
function skCur() {
  const aura = SKUI.i === 5,
    slot = aura ? S.auras[SKUI.ai] : S.skills[SKUI.i],
    rec = slot && slot.k ? slot : null,
    D = rec && (aura ? AURAS[rec.k] : awD(rec.k, awOf(rec.k)));
  return { aura, slot, rec, D, k: rec && rec.k, g: rec && recGem(rec, S.lib), name: aura ? '光環' : SLOTKEY[SKUI.i] };
}
/* 拿著現在的武器看不看得到這招（綁武器的別把拿不到的列出來）；看得到但現在用不了（要盾、沒點亮昇華）的灰掉 */
const skShown = D => !D.wt || D.wt.includes(ST.wt) || (ST.wt === 'unarmed' && D === SKILLS.slash);
const skWhy = D => (wtOK(D) ? '' : `${wtNeed(D)}才能用`);
const SUPTAB = {
  通用: [
    'fury',
    'crit',
    'leech',
    'haste',
    'cdr',
    'fireadd',
    'coldadd',
    'lightadd',
    'chaosadd',
    'mpleech',
    'elepen',
    'cull',
    'nightblade'
  ],
  投射物: ['multi', 'pierce', 'fork', 'chain', 'ret'],
  範圍與近戰: ['area', 'heavy', 'focus', 'expand', 'punch'],
  異常: ['bleed', 'poison', 'poistack', 'ailmag', 'armbreak', 'wither', 'blind', 'pin'],
  元素: ['scorch', 'brittle', 'sap', 'expose', 'elec'],
  法術: ['arcane', 'cast_crit', 'cast_kill', 'cast_dodge', 'cast_block', 'cast_hurt'],
  召喚: ['pack', 'giant', 'mindmg', 'minlife'],
  轉換: ['totemc']
};
/* 輔助 k 的分頁名（II 跟著 I；沒列的放通用） */
const supTab = k => {
  const b = SUPPORTS[k].base || k;
  return Object.keys(SUPTAB).find(n => SUPTAB[n].includes(b)) || '通用';
};
/* 挑輔助：這一格（光環或技能）的輔助孔 hole 放 k 的原因；'' ＝可以、null＝不相容（不列出來） */
function supWhy(c, k, hole) {
  if (!supOK(c.D, { gem: k }, null)) return null;
  const dup = c.rec.so.findIndex((x, j) => x && j !== hole && supCat(x) === supCat(k));
  return dup >= 0 ? `同分類的「${SUPPORTS[c.rec.so[dup]].n}」已插` : '';
}
/* 選單裡的清單：{ k, D, lv, why, key, aw } */
function skList(c) {
  if (SKUI.view === 'skills') {
    const L = Object.keys(SKILLS)
      .filter(k => skShown(SKILLS[k]))
      .map(k => ({
        k,
        D: SKILLS[k],
        lv: S.lib.sk[k],
        why: skWhy(SKILLS[k]),
        key: S.skills.findIndex(s => s.k === k),
        aw: S.lib.aw && S.lib.aw[k],
        tabs: [
          ...(SKILLS[k].wt ? ['武器'] : []),
          ...['elem:元素', 'occ:秘術', 'pri:原始', 'curse:詛咒']
            .filter(t => SKILLS[k].tags.includes(t.split(':')[0]))
            .map(t => t.split(':')[1])
        ]
      }));
    /* 裝著的排前面（照原型），其次能用的 */
    return L.sort((a, b) => (b.key >= 0) - (a.key >= 0) || !!a.why - !!b.why);
  }
  if (SKUI.view === 'sups')
    return Object.keys(SUPPORTS)
      .map(k => ({ k, D: SUPPORTS[k], lv: S.lib.sup[k], why: supWhy(c, k, SKUI.hole), tabs: [supTab(k)] }))
      .filter(x => x.why !== null)
      .sort((a, b) => !!a.why - !!b.why);
  return Object.keys(AURAS).map(k => ({
    k,
    D: AURAS[k],
    lv: S.lib.aura[k],
    why: S.auras.some((x, j) => x && x.k === k && j !== SKUI.ai) ? '已經在光環欄裡' : '',
    tabs: [AURAS[k].tags.includes('minion') ? '召喚' : '光環']
  }));
}

/* ---------- 畫面 ---------- */
function skSlots() {
  const cards = S.skills.map((r, i) => {
    const on = SKUI.i === i;
    if (!r.k)
      return `<button class="slot empty ${on ? 'pick' : ''}" data-sk="slot:${i}"><i class="k">${SLOTKEY[i]}</i>${ICO.plus}<span class="nm">挑一招</span></button>`;
    const D = SKILLS[r.k];
    return `<button class="slot ${on ? 'on' : ''}" data-sk="slot:${i}"><i class="k">${SLOTKEY[i]}</i>${icHTML(D.ic)}<span class="nm">${esc(D.n)}</span><span class="lv">Lv ${libLv(r.k)}</span>${S.lib.aw && S.lib.aw[r.k] ? '<i class="awm" title="已覺醒"></i>' : ''}</button>`;
  });
  const au = S.auras.filter(Boolean);
  cards.push(
    `<button class="slot ${SKUI.i === 5 ? 'on' : ''}" data-sk="slot:5"><i class="k">光環</i>${au.length ? icHTML(AURAS[au[0].k].ic) : ICO.plus}<span class="nm">${au.length} 個</span><span class="lv">精魂 ${ST.spiritUsed}/${ST.spirit}</span></button>`
  );
  return `<div class="slots">${cards.join('')}</div>`;
}
/* 光環欄：每個光環一個小標籤，最後一個是加光環 */
const skAuraBar = () =>
  `<div class="abar">${S.auras
    .map((a, j) =>
      a
        ? `<button class="ach ${SKUI.ai === j ? 'on' : ''} ${ST.auraOn.includes(a.k) ? '' : 'off'}" data-sk="aura:${j}">${icHTML(AURAS[a.k].ic)}<span>${esc(AURAS[a.k].n)}<small>${ST.auraOn.includes(a.k) ? 'Lv ' + libLv(a.k) : auraWhy(a.k, 1)}</small></span></button>`
        : `<button class="ach add" data-sk="aura:${j}">${ICO.plus}<span>加光環</span></button>`
    )
    .join('')}</div>`;
function holeNode(c, j) {
  const [cx, cy] = RING[j + 1],
    dir = cy < 0 ? 'up' : 'dn',
    pos = `style="--cx:${cx};--cy:${cy}"`,
    r = c.rec;
  if (j < r.n) {
    const k = r.so[j];
    if (!k)
      return `<button class="node ${dir} open ${SKUI.hole === j ? 'sel' : ''}" ${pos} data-sk="hole:${j}" aria-label="第 ${j + 1} 孔：挑輔助"><div class="o">${ICO.plus}</div><span class="nm">空孔</span></button>`;
    const bad = !supOK(c.D, c.g.sup[j], c.g);
    return `<button class="node ${dir} ${bad ? 'bad' : ''} ${SKUI.hole === j ? 'sel' : ''}" ${pos} data-sk="hole:${j}"><div class="o" style="--p:${(libLv(k) / GEM_MAX) * 100}">${icHTML(SUPPORTS[k].ic)}</div><span class="nm">${esc(SUPPORTS[k].n)}<small>${bad ? '沒效果' : 'Lv ' + libLv(k)}</small></span></button>`;
  }
  if (j === r.n) {
    const d = drillCheck(r);
    return `<button class="node ${dir} shut next" ${pos} data-sk="drill" ${d.why ? `disabled title="${esc(d.why)}"` : ''} aria-label="打開第 ${j + 1} 孔，要 ${fmtN(d.c)} 靈魂${d.why ? '（' + d.why + '）' : ''}"><div class="o">${BIND}${ICO.lock}</div><span class="nm">打開<small>${soulB(d.c, 1)}</small></span></button>`;
  }
  return `<div class="node ${dir} shut far" ${pos}><div class="o">${BIND}${ICO.lock}</div><span class="nm">鎖著</span></div>`;
}
/* 覺醒槽：正上方的菱形。還沒覺醒是虛線空槽；覺醒了是覺醒紫（9-3） */
function awNode(c) {
  const aw = awOf(c.k);
  if (!aw)
    return `<button class="node up aw empty ${SKUI.aw ? 'sel' : ''}" style="--cx:0;--cy:-1" data-sk="aw"><div class="o">${ICO.gem}</div><span class="nm">覺醒槽</span></button>`;
  const A = AWK[c.k][aw];
  return `<button class="node up aw set ${SKUI.aw ? 'sel' : ''}" style="--cx:0;--cy:-1" data-sk="aw"><div class="o">${ICO[aw === 'A' ? 'flame' : 'fork']}</div><span class="nm">${esc(A.n)}</span></button>`;
}
function skRing(c) {
  const r = c.rec;
  return `<div class="ring">
    <svg class="gear" viewBox="-150 -150 300 300" aria-hidden="true"><circle r="136" fill="none" stroke="var(--fr-o)" stroke-width="6" stroke-dasharray="9 17" opacity="0.7"/><circle r="118" fill="none" stroke="var(--fr)" stroke-width="3" stroke-dasharray="7 5"/><circle r="118" fill="none" stroke="#000" stroke-width="1" opacity="0.6"/></svg>
    <button class="ctr" data-sk="ctr" aria-label="${esc(c.D.n)}">${icHTML(c.D.ic)}<span class="lvb">${esc(c.D.n)}・Lv ${libLv(c.k)}</span></button>
    ${c.aura ? '' : awNode(c)}
    ${Array.from({ length: GEM_SO_MAX }, (_, j) => holeNode(c, j)).join('')}
  </div>`;
}
/* 環底下：每秒一個大數字，其餘小字 */
function skNums(c) {
  if (c.aura) {
    const on = ST.auraOn.includes(c.k);
    return `<div class="nums"><div class="dps"><small>預留精魂</small><b>${c.D.sp}</b></div><div class="rest"><span class="${on ? 'c-good' : 'c-bad'}">${on ? '生效中' : auraWhy(c.k)}</span><span>精魂 <b>${ST.spiritUsed}/${ST.spirit}</b></span></div></div>`;
  }
  const cf = slotCfg(SKUI.i),
    N = skillNums(cf),
    v = skMain(N),
    lab = N.dps != null || N.dot != null ? '每秒' : N.unit != null ? '單體每秒' : '每下',
    big =
      v != null
        ? `<div class="dps"><small>${lab}</small><b class="res-${N.el || 'phys'}">${fmtN(v)}</b></div>`
        : `<div class="dps eff">${N.eff ? rich(N.eff) : ''}</div>`,
    rest = [
      N.hit != null && N.dps != null ? `<span>擊中 <b>${fmtN(N.hit)}</b></span>` : '',
      cf.mp ? `<span>魔力 <b class="mp">${cf.mp}</b></span>` : '',
      cf.cd ? `<span>冷卻 <b>${cf.cd.toFixed(1)} 秒</b></span>` : ''
    ].join('');
  return `<div class="nums">${big}<div class="rest">${rest}</div></div>`;
}
/* 技能的一行標籤：元素色＋標籤＋冷卻 */
function skSub(D, cd) {
  const tags = D.tags.filter(t => TAGN[t] && !['elem', 'occ', 'pri', 'cd'].includes(t)).map(t => TAGN[t]);
  return [
    D.el && ELN[D.el] ? `<span class="el res-${D.el}">${ELN[D.el]}</span>` : '',
    ...tags,
    cd ? `<span class="nw">冷卻 <span class="n">${cd.toFixed(1)}</span> 秒</span>` : ''
  ]
    .filter(Boolean)
    .join('・');
}
/* 升一級的按鈕（技能、輔助、光環共用）：主鍵 */
function upBtn(k, pri) {
  const lv = libLv(k),
    u = libUpCheck(k);
  if (lv >= GEM_MAX) return `<button class="btn" disabled>已滿級</button>`;
  return `<button class="btn ${pri ? 'pri' : ''}" data-sk="up:${k}" ${u.why ? `disabled title="${esc(u.why)}"` : ''}>${u.why ? `升到 Lv ${lv + 1}<small class="why">${esc(gemShort(u.why))}</small>` : `升到 Lv ${lv + 1} ${soulB(u.c, !pri)}`}</button>`;
}
/* 沒點孔時：這招自己的名字、一句說明、動作 */
function skSelf(c) {
  const D = c.D,
    k = c.k,
    lv = libLv(k),
    warn = [];
  let sub,
    extra = '';
  if (c.aura) {
    sub = `光環・預留精魂 <span class="n">${D.sp}</span>`;
    if (!ST.auraOn.includes(k)) warn.push(auraWhy(k));
  } else {
    const cf = slotCfg(SKUI.i);
    sub = skSub(D, cf.cd);
    extra = cf.lv > lv ? ` <i class="up">+${cf.lv - lv}</i>` : '';
    if (!wtOK(D)) warn.push(`${needTxt(D)}，沒有效果`);
    const lk = gemLack(c.g);
    if (lk.length) warn.push(`已失效，數值不算：${lackTxt(lk)}`);
    else if (lv < GEM_MAX) {
      const nl = gemLack({ ...c.g, lv: lv + 1 });
      if (nl.length) warn.push(`升到 Lv ${lv + 1} 需要${lackTxt(nl)}，升了會失效`);
    }
  }
  return `<div class="head"><div><h2>${esc(D.n)}</h2><div class="sub">${sub}</div></div><div class="lvbox"><b>Lv ${lv}${extra}</b><div class="lvbar"><i style="width:${(lv / GEM_MAX) * 100}%"></i></div></div></div>
    <p class="desc">${rich(D.d)}${!c.aura && awOf(k) ? ` <span class="aw-t">${esc(AWK[k][awOf(k)].n)}</span>：${rich(awText(k, awOf(k)))}` : ''}</p>
    ${warn.map(w => `<p class="why">${esc(w)}</p>`).join('')}
    <div class="acts">${upBtn(k, 1)}<button class="btn" data-sk="swap">${c.aura ? '換一個' : '換一招'}</button>${c.aura ? `<button class="btn" data-sk="out">卸下</button>` : `<button class="btn" data-sk="calc">${SKUI.calc ? '收起算式' : '算式'}</button>`}</div>
    ${!c.aura && SKUI.calc ? skDetail(c.g) : ''}`;
}
/* 同一款詳情卡：圖示、名字＋Lv、標籤、等級條、一行數字、一句效果、動作鍵 */
function skCard(k, acts, note) {
  const kind = SKILLS[k] ? 'sk' : SUPPORTS[k] ? 'sup' : 'aura',
    D = (kind === 'sk' ? SKILLS : kind === 'sup' ? SUPPORTS : AURAS)[k],
    lv = libLv(k);
  let chips, kv;
  if (kind === 'sk') {
    const cf = gemCfg(mkGem(k, lv), -1);
    chips =
      (D.el && ELN[D.el] ? `<span class="gtag t-${D.el}">${ELN[D.el]}</span>` : '') +
      D.tags
        .filter(t => TAGN[t] && !['elem', 'occ', 'pri'].includes(t))
        .map(t => `<span class="gtag">${TAGN[t]}</span>`)
        .join('');
    kv = `${cf.mp ? `<span>魔力 <b class="mp">${cf.mp}</b></span>` : ''}<span>施放 <b>${actDur(cf).toFixed(2)} 秒</b></span>`;
  } else if (kind === 'sup') {
    chips = `<span class="gtag">輔助</span>${D.need.map(t => (TAGN[t] ? `<span class="gtag">${TAGN[t]}</span>` : '')).join('')}`;
    kv = `<span>${D.need.length ? '需要技能有 <b>' + D.need.map(t => TAGN[t] || t).join('、') + '</b>' : '任何技能都能插'}</span><span>等級加成 <b>傷害更多 +${lv - 1}%</b></span>`;
  } else {
    chips = `<span class="gtag">光環</span>`;
    kv = `<span>預留精魂 <b>${D.sp}</b></span><span>效果 <b>×${(1 + 0.03 * (lv - 1)).toFixed(2)}</b></span>`;
  }
  return `<div class="card">
    <div class="ic2">${icHTML(D.ic)}</div>
    <div><div class="cl"><b>${esc(D.n)}</b><em>Lv ${lv}</em></div><div class="chips">${chips}</div><div class="lvb2"><i style="width:${(lv / GEM_MAX) * 100}%"></i></div><div class="kv">${kv}</div><p>${rich(D.d)}</p>${note ? `<p class="why">${esc(note)}</p>` : ''}</div>
    <div class="cacts">${acts}</div>
  </div>`;
}
/* 覺醒的說明（資料組出來的）：A＝傷害更多 15%（有傷害的招）＋原本品質 20% 的效果；B＝補丁的中文＋改了什麼標籤 */
function awText(k, which) {
  const A = AWK[k];
  if (which === 'A') return `${SKILLS[k].m ? `傷害更多 ${Math.round((AW_MORE - 1) * 100)}%；` : ''}${A.A.d}`;
  const t = A.B.tags;
  return `${fxText(A.B.fx)}${t && t.add ? `；拿到${t.add.map(x => TAGN[x]).join('、')}標籤` : ''}`;
}
/* 覺醒區塊：點了覺醒槽、或已經覺醒才出現。兩張卡二選一；還沒覺醒時選一張要花 1 顆覺醒石（按兩次），之後免費切換、不能拆掉 */
function skAwake(c) {
  if (c.aura || !AWK[c.k] || !(SKUI.aw || awOf(c.k))) return '';
  const cur = awOf(c.k),
    n = MAT().awk;
  /* 沒有覺醒石、也還沒覺醒：不畫兩張卡（覺醒槽灰著），點槽只在這裡寫哪裡掉 */
  if (!cur && n < 1)
    return `<div class="sec awsec"><div class="ph2">覺醒<span>覺醒石 <b class="n">0</b></span></div><p class="awnote">沒有覺醒石：打階級 10 以上的王有機會掉，裂口的生肖王一定掉。</p></div>`;
  const card = which => {
    const A = AWK[c.k][which];
    if (!A)
      return `<button class="awc" disabled><b class="t">變化版製作中</b><span class="p">法系技能的變化版下一版做</span></button>`;
    return `<button class="awc ${cur === which ? 'on' : ''}" data-sk="awpick:${which}" ${!cur && n < 1 ? 'disabled' : ''}>${ICO[which === 'A' ? 'flame' : 'fork']}${cur === which ? ICO.tick.replace('class="ico"', 'class="ico tick"') : ''}<b class="t">${esc(A.n)}</b><span class="p">${rich(awText(c.k, which), 1)}</span></button>`;
  };
  return `<div class="sec awsec"><div class="ph2">覺醒<span>覺醒石 <b class="n">${n}</b></span></div><div class="aw2">${card('A')}${card('B')}</div>${cur ? '' : `<p class="awnote">選一個覺醒，花 1 顆覺醒石；之後可以免費切換，不能拆掉。</p>`}</div>`;
}
/* 選單右上的數量：挑一招寫「長杖能用的 27 招」（照原型，武器名用目前拿的）、輔助「相容 16 顆」 */
const listN = (L, show) =>
  `${SKUI.view === 'skills' ? `${WTN[ST.wt] || '空手'}能用的 ${L.length} 招` : SKUI.view === 'sups' ? `相容 ${L.length} 顆` : `${L.length} 個`}${show.length < L.length ? `・顯示 ${show.length}` : ''}`;
/* 選單：圖示格子＋標籤篩選＋底下詳情卡 */
function skPick(c) {
  const L = skList(c),
    kindN = { skills: '挑一招', sups: `第 ${SKUI.hole + 1} 孔・挑輔助`, auras: '挑光環' }[SKUI.view],
    order = [...new Set(['武器', '元素', '秘術', '原始', '詛咒', '光環', '召喚', ...Object.keys(SUPTAB)])],
    have = new Set(L.flatMap(x => x.tabs)),
    tabs = ['全部', ...order.filter(t => have.has(t)), ...(L.some(x => x.lv > 1 || x.key >= 0) ? ['升過的'] : [])],
    f = tabs.includes(SKUI.f) ? SKUI.f : '全部',
    show = L.filter(x => f === '全部' || (f === '升過的' ? x.lv > 1 || x.key >= 0 : x.tabs.includes(f))),
    sel = L.find(x => x.k === SKUI.pick);
  let card = '';
  if (sel) {
    const lvBtn = upBtn(sel.k, 0);
    if (SKUI.view === 'skills') {
      const j = S.skills.findIndex(s => s.k === sel.k),
        put = sel.why
          ? `<button class="btn pri" disabled>放到 ${c.name}</button>`
          : `<button class="btn pri" data-sk="put:${sel.k}">${j >= 0 && j !== SKUI.i ? `與 ${SLOTKEY[j]} 互換` : `放到 ${c.name}`}</button>`;
      card = skCard(sel.k, put + lvBtn, sel.why);
    } else if (SKUI.view === 'sups')
      card = skCard(
        sel.k,
        sel.why
          ? `<button class="btn pri" disabled>插到第 ${SKUI.hole + 1} 孔</button>${lvBtn}`
          : `<button class="btn pri" data-sk="put:${sel.k}">插到第 ${SKUI.hole + 1} 孔</button>${lvBtn}`,
        sel.why
      );
    else
      card = skCard(
        sel.k,
        sel.why
          ? `<button class="btn pri" disabled>放進光環欄</button>${lvBtn}`
          : `<button class="btn pri" data-sk="put:${sel.k}">放進光環欄</button>${lvBtn}`,
        sel.why
      );
  }
  const note = c.D && c.D.tags && c.D.tags.includes('flask') && SKUI.view === 'sups' ? '藥劑技能不能插輔助' : '';
  return `<section class="cat">
    <div class="bar">${c.rec || SKUI.view === 'auras' ? `<button class="btn mini" data-sk="back">← 回${c.rec ? esc(c.D.n) : '光環'}</button>` : ''}<b>${c.name}・${kindN}</b><span>${listN(L, show)}</span></div>
    <div class="ftabs">${tabs.map(t => `<button class="${t === f ? 'on' : ''}" data-sk="f:${t}">${t}</button>`).join('')}</div>
    ${note ? `<p class="why">${note}</p>` : ''}
    <div class="grid2">${show
      .map(
        x =>
          `<button class="g ${SKUI.pick === x.k ? 'sel' : ''} ${x.why ? 'dim' : ''}" data-sk="pick:${x.k}">${x.key >= 0 ? `<span class="key">${SLOTKEY[x.key]}</span>` : ''}<span class="lv ${x.lv > 1 ? '' : 'z'}">${x.lv > 1 ? x.lv : '—'}</span>${icHTML(x.D.ic)}${x.aw ? '<i class="awm"></i>' : ''}<span class="nm">${esc(x.D.n)}</span></button>`
      )
      .join('')}</div>
    ${card}
  </section>`;
}
function skillHTML() {
  const M = MAT(),
    c = skCur(),
    picking = SKUI.view !== 'main';
  let info;
  if (picking) info = skPick(c);
  else if (!c.rec) info = `<p class="empty-note">${c.aura ? '光環欄是空的：加一個光環，它會長期預留精魂' : ''}</p>`;
  else {
    let body;
    const hole = SKUI.hole;
    if (hole != null && c.rec.so[hole]) {
      const k = c.rec.so[hole],
        sp = c.g.sup[hole],
        bad = !supOK(c.D, sp, c.g),
        note = bad
          ? supDup(c.g, sp)
            ? `這${c.aura ? '個光環' : '招'}已經有同分類的輔助，沒有效果`
            : `跟這${c.aura ? '個光環' : '招'}不相容，沒有效果`
          : '';
      body = skCard(
        k,
        `${upBtn(k, 1)}<button class="btn" data-sk="unplug">卸下</button><button class="btn" data-sk="swap">更換</button>`,
        note
      );
    } else body = skSelf(c);
    info = `${skNums(c)}${body}${c.aura ? '' : skAwake(c)}`;
  }
  const ring = c.rec ? skRing(c) : '';
  return `<div class="ph"><b>技能</b><span class="soul" title="靈魂：升級、開孔都花它"><i></i>${fmtN(M.soul)}</span>${swapB('背包')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="sk-body ${picking ? 'picking' : ''}"><div class="sk-top">${skSlots()}${SKUI.i === 5 && !picking ? skAuraBar() : ''}</div><div class="sk-ring">${ring}</div><div class="sk-info">${info}</div></div>`;
}

/* ---------- 動作 ---------- */
function skSel(i) {
  SKUI.i = i;
  SKUI.hole = null;
  SKUI.pick = null;
  SKUI.aw = 0;
  SKUI.calc = 0;
  SKUI.f = '全部';
  SKUI.view = 'main';
  if (i === 5) {
    if (!S.auras[SKUI.ai]) SKUI.ai = Math.max(0, S.auras.findIndex(Boolean));
    if (!S.auras.some(Boolean)) SKUI.view = 'auras';
  } else if (!S.skills[i].k) SKUI.view = 'skills';
}
function skOpen(view) {
  SKUI.view = view;
  SKUI.pick = null;
  SKUI.f = '全部';
}
function skAct(b, e) {
  const [k, ...r] = b.dataset.sk.split(':'),
    v = r.join(':'),
    c = skCur();
  hideTip();
  if (k === 'slot') skSel(+v);
  else if (k === 'aura') {
    SKUI.ai = +v;
    SKUI.hole = null;
    SKUI.aw = 0;
    if (!S.auras[SKUI.ai]) skOpen('auras');
    else SKUI.view = 'main';
  } else if (k === 'ctr') (SKUI.hole = null), (SKUI.aw = 0);
  else if (k === 'hole') {
    SKUI.hole = +v;
    SKUI.aw = 0;
    if (!c.rec.so[SKUI.hole]) skOpen('sups');
  } else if (k === 'aw') (SKUI.aw = SKUI.aw ? 0 : 1), (SKUI.hole = null);
  else if (k === 'awpick') {
    if (!awOf(c.k) && !confirm2(b, `<span>再按一次</span><small>花 1 顆覺醒石</small>`)) return;
    const err = awakeDo(c.k, v);
    if (err) return hudWarn(err);
    sfx('lvup');
    return changed();
  } else if (k === 'drill') {
    const d = drillCheck(c.rec);
    if (d.c >= MAT().soul * 0.5 && !confirm2(b, `<span>再按一次</span><small>${fmtN(d.c)} 靈魂</small>`)) return;
    const err = drillDo(c.rec);
    if (err) return hudWarn(err);
    sfx('equip');
    return changed();
  } else if (k === 'up') {
    const err = libUp(v);
    if (err) return hudWarn(err);
    sfx('lvup');
    changed();
    document
      .querySelectorAll('#pskill .lvbox b, #pskill .card em, #pskill .lvb')
      .forEach(n => n.classList.add('flash'));
    return;
  } else if (k === 'swap') skOpen(SKUI.hole != null ? 'sups' : c.aura ? 'auras' : 'skills');
  else if (k === 'back') (SKUI.view = 'main'), (SKUI.pick = null);
  else if (k === 'f') SKUI.f = v;
  else if (k === 'pick') SKUI.pick = v;
  else if (k === 'calc') SKUI.calc = !SKUI.calc;
  else if (k === 'unplug') {
    c.rec.so[SKUI.hole] = null;
    SKUI.hole = null;
    sfx('click');
    return changed();
  } else if (k === 'out') {
    /* 開過的孔與插著的輔助會一起拿掉：花了靈魂的東西要確認 */
    if ((c.rec.n > 2 || c.rec.so.some(Boolean)) && !confirm2(b, `<span>再按一次</span><small>孔與輔助一起拿掉</small>`))
      return;
    S.auras[SKUI.ai] = null;
    SKUI.hole = null;
    sfx('click');
    return changed();
  } else if (k === 'put') return skPut(v);
  sfx('click');
  hudPanels();
}
function skPut(k) {
  const c = skCur();
  if (SKUI.view === 'skills') {
    const why = skWhy(SKILLS[k]);
    if (why) return hudWarn(why);
    /* 這招已經裝在別的格：兩格互換 */
    const j = S.skills.findIndex(s => s.k === k);
    if (j >= 0 && j !== SKUI.i) S.skills[j].k = S.skills[SKUI.i].k;
    S.skills[SKUI.i].k = k;
    SKUI.hole = null;
  } else if (SKUI.view === 'sups') {
    if (supWhy(c, k, SKUI.hole)) return hudWarn(supWhy(c, k, SKUI.hole));
    c.rec.so[SKUI.hole] = k;
  } else {
    if (S.auras.some((x, j) => x && x.k === k && j !== SKUI.ai)) return hudWarn('已經在光環欄裡');
    if (S.auras[SKUI.ai]) S.auras[SKUI.ai].k = k;
    else S.auras[SKUI.ai] = { k, so: [null, null], n: 2 };
    SKUI.hole = null;
  }
  SKUI.view = 'main';
  SKUI.pick = null;
  sfx('equip');
  changed();
}
document.addEventListener('click', e => {
  const b = e.target.closest('#pskill [data-sk]');
  if (b && !b.disabled) skAct(b, e);
});
