/* dungeonPOE · 技能面板（0.2.75 目錄化；0.4.8 改成三層，企劃書 6.4、DESIGN.md 第 2、6 節）：
   總覽（現在可以變強的事＋出招順序＋光環）→ 這一招（小圓環當徽章、一個主數字、輔助的貢獻、底部動作列）→ 挑選（技能、輔助、光環同一款清單列，照差多少排）。
   回上一層一律左上「‹ 上一層」，或再點一次分頁列的「技能」回總覽。差多少都是「暫時換上去 → skillNums → 還原」量出來的實際結果。
   文字重點（DESIGN.md 第 9 節）：數字白粗體、會改玩法的名詞詞綴藍（接 termify 的名詞卡）、元素詞用元素色。 */
'use strict';
/* view：home 總覽／one 這一招／skills、sups、auras 挑選（第三層）；i：0～4 技能格、5 光環（ai＝光環欄第幾個）；hole：選中的孔（null＝這招自己）；
   pick：清單選中的那一列；f：每種清單上次選的篩選（記住）；tier：輔助選 I 還是 II；calc／aw：這一招展開算式與覺醒；mv：出招順序選中要移動的格；anim：換畫面的過場方向 */
const SKUI = { view: 'home', i: 0, ai: 0, hole: null, pick: null, f: {}, tier: 1, calc: 0, aw: 0, mv: null, anim: '' };
const PICKV = ['skills', 'sups', 'auras'];
const ELK = { 火焰: 'fire', 冰冷: 'cold', 閃電: 'light', 混沌: 'chaos' };
/* 代價：資料裡用私用字元框起來的（data.js 的 FXC），加上說明文字裡寫死的「傷害更少 N%」「魔力消耗 ×N（>1）」 */
const RICH_RE = new RegExp(
  `((?<!受到的)傷害更少 ?\\d+(?:\\.\\d+)?%|魔力消耗 ?×(?:1\\.\\d+|[2-9]\\d*(?:\\.\\d+)?))|(${Object.keys(TERMS)
    .sort((a, b) => b.length - a.length)
    .join('|')})|(火焰|冰冷|閃電|混沌)|([+−×]?\\d[\\d,]*(?:\\.\\d+)?%?)`,
  'g'
);
/* 說明文字的重點：代價、名詞（第一次可以點）、元素詞、數字 */
function rich(t, plain) {
  const seen = new Set();
  return t
    .split(/(.*?)/)
    .map(p =>
      p[0] === ''
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
/* 清單上的一行說明：拿掉代價記號 */
const plainTxt = t => esc(String(t || '').replace(/[]/g, ''));
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
/* 光環沒生效的原因：捷光環拿法系武器或空手、夥伴只能 1 隻、魔像已滿、其他是精魂不夠；short＝短字 */
function auraWhy(k, short) {
  const wt = ST.wt,
    ks = S.auras.map(x => x && x.k);
  if (AURAS[k].her && (wt === 'unarmed' || SPELLW.has(wt))) return short ? '要武器' : '未生效：需要非法系武器';
  if (AURAS[k].tags.includes('companion') && ST.auraOn.some(o => o !== k && AURAS[o].tags.includes('companion')))
    return short ? '有夥伴' : '未生效：同時只能有 1 隻夥伴';
  /* 順序跟 stats() 一樣：先看魔像上限（排在前面、生效的魔像夠多才算滿），沒滿才是精魂不夠 */
  if (
    isGolem(k) &&
    ks.slice(0, ks.indexOf(k)).filter(o => o && isGolem(o) && ST.auraOn.includes(o)).length >= ST.golemMax
  )
    return short ? '魔像已滿' : `未生效：魔像最多 ${ST.golemMax} 種`;
  return short ? '缺精魂' : '未生效：精魂不夠';
}
/* 詳細（照 PoE2 的詳細資料，docs/文字規範.md 第 3 節）：程式算得出來的自動產生，特殊規則接在技能資料的 x */
const fmtS = v => +v.toFixed(2);
const fmtM = px => +(px / METER).toFixed(1);
function skLines(c) {
  const D = c.D,
    L = [];
  if (c.aura) return [`保留 ${D.sp} 精魂`, ...(D.x || [])];
  const N = skillNums(c),
    el = ELN[N.el] || '';
  if (N.eff) L.push(N.eff);
  if (N.unit != null && N.hit != null) L.push(`每下造成 ${fmtN(N.hit)} ${el}傷害（平均）`);
  else if (N.dot != null) L.push(`每秒造成 ${fmtN(N.dot)} ${el}傷害（平均）`);
  else if (N.hit != null) L.push(`造成 ${fmtN(N.hit)} ${el}傷害（平均）`);
  if (D.tags.includes('proj') && c.projEv) L.push(`發射 ${fmtS(c.projEv)} 個投射物`);
  if (D.r) L.push(`範圍為 ${fmtM(D.r * ST.aoeM * c.aoe)} 公尺`);
  /* 詛咒的持續時間跟著等級（combat.js 的 curseMob：6 ＋ 0.07 × 等級） */
  if (D.curse) L.push(`詛咒持續時間為 ${fmtS(6 + 0.07 * c.lv)} 秒`);
  else if (D.dur) L.push(`持續時間為 ${fmtS(durOf(c))} 秒`);
  L.push(`${isSpell(D) ? '施放' : '攻擊'}時間為 ${fmtS(actDur(c))} 秒`);
  if (c.mp) L.push(`消耗 ${Math.round(c.mp)} 魔力`);
  if (c.cd) L.push(`冷卻時間為 ${fmtS(c.cd)} 秒`);
  return [...L, ...(D.x || [])];
}
/* 傷害算式：傷害怎麼算出來、每顆輔助的貢獻、下一級差多少 */
function skDetail(g, i = -1) {
  const c = gemCfg(g, i),
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
    rows.push(row('增加', `+${fmtN(N.inc)}%`), row('更多', '×' + N.more.toFixed(2)));
    rows.push(row('暴擊', `${N.ch.toFixed(1)}% · 傷害 ×${N.cm.toFixed(2)}`));
    rows.push(row('基礎攻擊時間', `${baseT(c).toFixed(2)} 秒`), row('出手', `${actDur(c).toFixed(2)} 秒`));
    if (D.tAdd) rows.push(row('增加使用時間', `+${D.tAdd} 秒，不受速度影響`));
  }
  /* 滿溢機率讓每次出手的發數會跳，面板顯示期望值（skills.js 的 projEv） */
  if (D.tags.includes('proj')) rows.push(row('投射物', +c.projEv.toFixed(2)));
  /* 三連隕石（覺醒 B）：每秒把每顆都算進去，假設全部打中 */
  if (c.volley > 1) rows.push(row('同時落下', `${c.volley} 顆，每秒以全部打中計`));
  const nx = g.lv < GEM_MAX && gemCfg({ ...g, lv: g.lv + 1 }, i),
    nN = nx && skillNums(nx);
  return `<dl class="sk-dl">${rows.join('')}</dl><p class="sk-lab">${
    nx
      ? `下一級：${skMain(N) != null ? `${N.dps != null ? '每秒' : '傷害'} ${fmtN(skMain(N))} → ${fmtN(skMain(nN))}` : '效果不變'}${nx.mp !== c.mp ? `・魔力 ${c.mp} → ${nx.mp}` : ''}`
      : '已經滿級'
  }・未計入怪物的抗性、護甲與閃避</p>`;
}

/* ---------- 目前選的那一格 ---------- */
function skCur() {
  const aura = SKUI.i === 5,
    slot = aura ? S.auras[SKUI.ai] : S.skills[SKUI.i],
    rec = slot && slot.k ? slot : null,
    D = rec && (aura ? AURAS[rec.k] : awD(rec.k, awOf(rec.k)));
  return { aura, slot, rec, D, k: rec && rec.k, g: rec && recGem(rec, S.lib), name: aura ? '光環' : slotKey(SKUI.i) };
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
  /* 沒解鎖的 II（0.4.8）：相容照 I 判斷，列出來但灰掉 */
  const lock = sup2Lock(k);
  if (!supOK(c.D, { gem: lock ? SUPPORTS[k].base : k }, null)) return null;
  if (lock) return `II 還沒解鎖（${fmtN(SUP2_COST)} 靈魂）`;
  const dup = c.rec.so.findIndex((x, j) => x && j !== hole && supCat(x) === supCat(k));
  return dup >= 0 ? `同分類的「${SUPPORTS[c.rec.so[dup]].n}」已插` : '';
}
/* I 的鍵 → II 的鍵（沒有 II 回 null） */
const sup2Of = k => (SUPPORTS[k + '2'] && SUPPORTS[k + '2'].tier === 2 ? k + '2' : null);
const supBase = k => (SUPPORTS[k] && SUPPORTS[k].tier === 2 ? SUPPORTS[k].base : k);
/* 解鎖 II 的按鈕（0.4.8）：k 不是沒解鎖的 II 就不畫 */
function iiBtn(k) {
  if (!sup2Lock(k)) return '';
  const u = sup2Check(k);
  return `<button class="sk-btn" data-sk="ii:${k}" ${u.why ? `disabled title="${esc(u.why)}"` : ''}>解鎖 II・${soulB(u.c)}</button>`;
}
/* 選單裡的清單：{ k, D, lv, why, key, aw, tabs }；輔助一顆一列（只列 I，II 在展開的說明裡切換） */
function skList(c) {
  if (SKUI.view === 'skills')
    return Object.keys(SKILLS)
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
  if (SKUI.view === 'sups')
    return (
      Object.keys(SUPPORTS)
        /* 覺醒輔助（0.2.80）：解鎖了才列出來；II 併進 I 那一列 */
        .filter(k => SUPPORTS[k].tier !== 2 && (!SUPPORTS[k].aw || awHave(k)))
        .map(k => ({
          k,
          D: SUPPORTS[k],
          lv: SUPPORTS[k].aw ? S.lib.sup[k] : null,
          why: supWhy(c, k, SKUI.hole),
          tabs: [supTab(k)]
        }))
        .filter(x => x.why !== null)
    );
  return Object.keys(AURAS).map(k => ({
    k,
    D: AURAS[k],
    lv: S.lib.aura[k],
    why: S.auras.some((x, j) => x && x.k === k && j !== SKUI.ai) ? '已經在光環欄裡' : '',
    tabs: [AURAS[k].tags.includes('minion') ? '召喚' : '光環']
  }));
}

/* ---------- 量差多少：暫時換上去 → skillNums → 還原 ---------- */
const dpsOf = i => {
  const c = slotCfg(i);
  return c ? skMain(skillNums(c)) : null;
};
/* 主力：每秒最高的那一格（光環、光環的輔助拿它比） */
const mainDps = () => S.skills.reduce((m, r, i) => (r.k ? Math.max(m, dpsOf(i) || 0) : m), 0);
const unitOf = c => {
  if (!c) return '每秒';
  const N = skillNums(c);
  return N.dps != null || N.dot != null ? '每秒' : N.unit != null ? '單體每秒' : '每下';
};
/* 格 i（5＝光環欄）暫時改掉（mut 改完回傳還原的函式），量完還原；光環會改 stats，要重算一次再放回原本的 ST */
function probe(i, mut) {
  const st = ST,
    undo = mut();
  if (i === 5) ST = stats();
  const cf = i === 5 ? null : slotCfg(i),
    v = i === 5 ? mainDps() : cf ? skMain(skillNums(cf)) : null;
  undo();
  ST = st;
  return { v, cf };
}
/* 不加傷害的效果寫它給什麼：比較設定的倍率；其他欄位有變就回 '*'（用輔助自己的說明） */
const FXR = [
  ['aoe', '範圍'],
  ['speed', '速度'],
  ['cd', '冷卻'],
  ['mp', '魔力消耗'],
  ['kb', '擊退']
];
function fxDiff(a, b) {
  if (!a || !b) return '';
  for (const [k, n] of FXR)
    if (a[k] && b[k] && Math.abs(b[k] / a[k] - 1) > 0.005) {
      const p = Math.round((b[k] / a[k] - 1) * 100);
      return `${n} ${p > 0 ? '+' : '−'}${Math.abs(p)}%`;
    }
  for (const k in b) if (typeof b[k] === 'number' && !['i', 'lv', 'q'].includes(k) && b[k] !== a[k]) return '*';
  return '';
}
/* 孔 j 放 k 時的結果（輔助）；II 沒解鎖也量（暫時當解鎖） */
function supProbe(i, j, k) {
  const rec = i === 5 ? S.auras[SKUI.ai] : S.skills[i],
    b = supBase(k),
    lib2 = S.lib.sup2 || (S.lib.sup2 = {}),
    had = lib2[b];
  return probe(i, () => {
    const old = rec.so[j];
    rec.so[j] = k;
    lib2[b] = 1;
    return () => {
      rec.so[j] = old;
      if (!had) delete lib2[b];
    };
  });
}
/* 第 i 格最好的輔助能加多少（總覽與這一招的空孔用；ST 換了才重算） */
const BEST = new Map();
function bestSup(i, j) {
  const rec = S.skills[i],
    key = `${i}|${j}|${rec.k}|${rec.so.join()}|${awOf(rec.k)}`;
  if (BEST.st !== ST) BEST.clear(), (BEST.st = ST);
  if (BEST.has(key)) return BEST.get(key);
  const c = { D: awD(rec.k, awOf(rec.k)), rec },
    base = dpsOf(i);
  let best = null;
  if (base != null)
    for (const k of Object.keys(SUPPORTS)) {
      if (SUPPORTS[k].tier === 2 || (SUPPORTS[k].aw && !awHave(k)) || supWhy(c, k, j) !== '') continue;
      const d = supProbe(i, j, k).v - base;
      if (d > 0.5 && (!best || d > best.d)) best = { k, d };
    }
  BEST.set(key, best);
  return best;
}

/* ---------- 總覽：現在可以變強（最多三列，照差多少排）；分頁列的亮點也看它 ---------- */
let TODO = null;
function skTodo() {
  const soul = MAT().soul;
  if (TODO && TODO.st === ST && TODO.soul === soul) return TODO.L;
  const L = [];
  S.skills.forEach((r, i) => {
    if (!r.k) return;
    const j = r.so.findIndex((x, n) => n < r.n && !x);
    if (j < 0) return;
    const b = bestSup(i, j),
      emp = r.so.slice(0, r.n).filter(x => !x).length;
    /* 量不出會變強（沒有傷害的招）就不算「現在可以變強」 */
    if (!b) return;
    L.push({
      t: `${SKILLS[r.k].n}有 ${emp} 個空孔`,
      s: `插上「${SUPPORTS[b.k].n}」`,
      up: `▲ ${unitOf(slotCfg(i))} +${fmtN(b.d)}`,
      ic: SKILLS[r.k].ic,
      d: b.d,
      go: `hole:${i}:${j}`
    });
  });
  /* 買得起的升級裡，加最多的那一個 */
  let best = null;
  S.skills.forEach((r, i) => {
    if (!r.k || libUpCheck(r.k).why) return;
    const lv = libLv(r.k),
      a = dpsOf(i),
      { v } = probe(i, () => ((S.lib.sk[r.k] = lv + 1), () => (S.lib.sk[r.k] = lv)));
    if (a != null && v - a > 0.5 && (!best || v - a > best.d)) best = { r, i, d: v - a, lv, c: libUpCheck(r.k).c };
  });
  if (best)
    L.push({
      t: `${SKILLS[best.r.k].n}升到 Lv ${best.lv + 1}`,
      s: `${fmtN(best.c)} 靈魂`,
      up: `▲ ${unitOf(slotCfg(best.i))} +${fmtN(best.d)}`,
      ic: SKILLS[best.r.k].ic,
      d: best.d,
      go: `one:${best.i}`
    });
  L.sort((a, b) => b.d - a.d);
  const free = S.skills.findIndex(r => !r.k);
  if (free >= 0)
    L.push({
      t: `還有 ${S.skills.filter(r => !r.k).length} 格沒放技能`,
      s: '挑一招',
      up: '',
      ic: null,
      d: 0,
      go: `skills:${free}`
    });
  const left = ST.spirit - ST.spiritUsed;
  if (Object.keys(AURAS).some(k => AURAS[k].sp <= left && !S.auras.some(x => x && x.k === k)))
    L.push({ t: '精魂還夠放光環', s: `剩 ${left} 精魂`, up: '', ic: null, d: 0, go: 'auras' });
  TODO = { st: ST, soul, L: L.slice(0, 3) };
  return TODO.L;
}
/* 出招順序（照 AI 實際出招：ai.js 的 aiOrder）＋空格 */
const skOrder = () => [...aiOrder(aiTags), ...S.skills.map((r, i) => (r.k ? -1 : i)).filter(i => i >= 0)];
const isLate = i => !!S.skills[i].k && aiTags(i).some(x => AI_LATE.includes(x));
/* 第 i 格能往上／下換到哪一格（同一組裡：普攻固定最後、條件技排在後面那一組）；不能回 -1 */
function mvTo(i, dir) {
  const O = aiOrder(aiTags).filter(x => x),
    p = O.indexOf(i),
    j = O[p + dir];
  return i && p >= 0 && j != null && isLate(i) === isLate(j) ? j : -1;
}
const pips = r =>
  `<span class="sk-pips" aria-label="${r.so.slice(0, r.n).filter(Boolean).length}／${r.n} 孔">${Array.from({ length: r.n }, (_, j) => `<i class="${r.so[j] ? '' : 'e'}"></i>`).join('')}</span>`;
const GRIP = '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5.5h10M3 10.5h10"/></svg>';
function homeHTML() {
  const todo = skTodo(),
    auto = S.auto !== 0,
    ord = skOrder(),
    late = aiOrder(aiTags).filter(i => i && isLate(i));
  const rows = ord
    .map((i, p) => {
      const r = S.skills[i],
        key = auto ? p + 1 : slotKey(i, 1);
      if (!r.k)
        return `<button class="sk-row emp" data-sk="go:skills:${i}"><span class="sk-ord">${auto ? '' : key}</span>${ICO.plus}<span class="sk-t"><b>挑一招</b></span></button>`;
      const D = SKILLS[r.k],
        v = dpsOf(i),
        bad = slotBad(i),
        note = bad
          ? `<em class="c-bad">失效：${esc(bad)}</em>`
          : i === 0
            ? '普攻，最後才放'
            : late.includes(i)
              ? '條件技，排在後面'
              : '',
        mv = SKUI.mv === i;
      return `<div class="sk-orow ${mv ? 'on' : ''}" data-i="${i}"><button class="sk-row" data-sk="go:one:${i}"><span class="sk-ord">${key}</span>${icHTML(D.ic)}<span class="sk-t"><b>${esc(D.n)}</b><small>Lv ${libLv(r.k)}${pips(r)}${note ? `　${note}` : ''}</small></span><span class="sk-v"><b>${v != null ? fmtN(v) : '—'}</b></span></button>${
        i
          ? `<button class="sk-grip" data-sk="mv:${i}" aria-label="調整${esc(D.n)}的順序">${GRIP}</button>`
          : '<span class="sk-grip0"></span>'
      }</div>`;
    })
    .join('');
  const au = S.auras.filter(Boolean),
    left = ST.spirit - ST.spiritUsed;
  const auras = au
    .map((a, j) => {
      const on = ST.auraOn.includes(a.k);
      return `<button class="sk-row" data-sk="go:aura:${j}">${icHTML(AURAS[a.k].ic)}<span class="sk-t"><b>${esc(AURAS[a.k].n)}</b><small>Lv ${libLv(a.k)}${pips(a)}${on ? '' : `　<em class="c-bad">${auraWhy(a.k, 1)}</em>`}</small></span><span class="sk-v"><b>${AURAS[a.k].sp}</b></span></button>`;
    })
    .join('');
  return `<div class="sk-scroll">
    ${
      todo.length
        ? `<section class="sk-sec"><h3 class="sk-lab">現在可以變強</h3>${todo
            .map(
              t =>
                `<button class="sk-row" data-sk="go:${t.go}"><i class="sk-dot"></i>${t.ic ? icHTML(t.ic) : ''}<span class="sk-t"><b>${esc(t.t)}</b><small>${esc(t.s)}</small></span>${t.up ? `<span class="sk-up">${t.up}</span>` : ''}</button>`
            )
            .join('')}</section>`
        : ''
    }
    <section class="sk-sec sk-ordl"><h3 class="sk-lab">${auto ? '出招順序・由上往下放' : '技能・照按鍵'}<span>每秒</span></h3>${rows}</section>
    <section class="sk-sec"><h3 class="sk-lab">光環<span>精魂 ${ST.spiritUsed}／${ST.spirit}${au.length ? '・預留' : ''}</span></h3>${auras}${
      left > 0 || !au.length
        ? `<button class="sk-row emp" data-sk="go:auras">${ICO.plus}<span class="sk-t"><b>加光環</b><small>剩 ${left} 精魂</small></span></button>`
        : ''
    }</section>
  </div>${
    SKUI.mv != null && S.skills[SKUI.mv] && S.skills[SKUI.mv].k
      ? `<div class="sk-bar"><button class="sk-btn" data-sk="mvd:-1" ${mvTo(SKUI.mv, -1) < 0 ? 'disabled' : ''}>上移</button><button class="sk-btn" data-sk="mvd:1" ${mvTo(SKUI.mv, 1) < 0 ? 'disabled' : ''}>下移</button><button class="sk-btn pri" data-sk="mvok">完成</button></div>`
      : ''
  }`;
}

/* ---------- 這一招 ---------- */
/* 小圓環：圓心這招、周圍只畫開了的孔與下一個能開的（寫代價）；點孔＝選它 */
function ringHTML(c) {
  const r = c.rec,
    n = r.n + (r.n < GEM_SO_MAX ? 1 : 0);
  const nodes = Array.from({ length: n }, (_, j) => {
    const a = ((-50 + (280 / Math.max(1, n - 1)) * j) * Math.PI) / 180,
      pos = `style="--x:${Math.cos(a).toFixed(3)};--y:${Math.sin(a).toFixed(3)}"`,
      sel = SKUI.hole === j ? 'on' : '';
    if (j >= r.n)
      return `<button class="sk-nd lock ${sel}" ${pos} data-sk="hole:${j}" aria-label="第 ${j + 1} 孔還沒開">${ICO.lock}</button><span class="sk-nl ${Math.sin(a) < -0.3 ? 'up' : ''}" ${pos}>打開・${fmtN(drillCheck(r).c)}</span>`;
    const k = r.so[j];
    if (!k)
      return `<button class="sk-nd emp ${sel}" ${pos} data-sk="hole:${j}" aria-label="第 ${j + 1} 孔：空">${ICO.plus}</button>`;
    const bad = !supOK(c.D, c.g.sup[j], c.g);
    return `<button class="sk-nd ${bad ? 'bad' : ''} ${sel}" ${pos} data-sk="hole:${j}" aria-label="第 ${j + 1} 孔：${esc(SUPPORTS[k].n)}">${icHTML(SUPPORTS[k].ic)}</button>`;
  }).join('');
  return `<div class="sk-ring"><button class="sk-ctr" data-sk="ctr" aria-label="${esc(c.D.n)}">${icHTML(c.D.ic)}</button>${nodes}</div>`;
}
/* 主數字＋最多三個次要數字 */
function heroHTML(c) {
  if (c.aura) {
    const on = ST.auraOn.includes(c.k);
    return `<div class="sk-hero"><div><small>預留精魂</small><b class="sk-n">${c.D.sp}</b></div><small>${on ? '<span class="c-good">生效中</span>' : `<span class="c-bad">${auraWhy(c.k)}</span>`}　精魂 ${ST.spiritUsed}／${ST.spirit}</small></div>`;
  }
  const cf = slotCfg(SKUI.i),
    N = skillNums(cf),
    v = skMain(N);
  const rest = [
    N.hit != null && N.dps != null ? `擊中 ${fmtN(N.hit)}` : '',
    cf.mp ? `魔力 ${Math.round(cf.mp)}` : '',
    cf.cd ? `冷卻 ${cf.cd.toFixed(1)} 秒` : ''
  ]
    .filter(Boolean)
    .join('・');
  return v != null
    ? `<div class="sk-hero"><div><small>${unitOf(cf)}</small><b class="sk-n">${fmtN(v)}</b></div><small>${rest}</small></div>`
    : `<div class="sk-hero eff"><div><small>效果</small><p>${N.eff ? rich(N.eff, 1) : '—'}</p></div><small>${rest}</small></div>`;
}
/* 這招插著的輔助：每一孔一列（名字只在這裡寫，圓環只畫圖示）；右邊是拿掉會少多少 */
function supRows(c) {
  const r = c.rec,
    i = SKUI.i,
    base = i === 5 ? null : dpsOf(i),
    u = i === 5 ? '' : unitOf(slotCfg(i));
  const rows = Array.from({ length: r.n }, (_, j) => {
    const k = r.so[j];
    if (!k) {
      const b = i === 5 ? null : bestSup(i, j);
      return `<button class="sk-row emp" data-sk="hole:${j}">${ICO.plus}<span class="sk-t"><b>空孔</b><small>挑一顆輔助</small></span>${b ? `<span class="sk-up">▲ 最多 +${fmtN(b.d)}</span>` : ''}</button>`;
    }
    const bad = !supOK(c.D, c.g.sup[j], c.g);
    let right = '';
    if (bad) right = `<span class="sk-d0 c-bad">沒有效果</span>`;
    else if (base != null) {
      const { v } = probe(i, () => {
        const o = r.so[j];
        r.so[j] = null;
        return () => (r.so[j] = o);
      });
      const d = base - v;
      right = d > 0.5 ? `<span class="sk-vv">${u} +${fmtN(d)}</span>` : `<span class="sk-d0">不加${u}</span>`;
    }
    return `<button class="sk-row" data-sk="hole:${j}">${icHTML(SUPPORTS[k].ic)}<span class="sk-t"><b>${esc(SUPPORTS[k].n)}</b><small>${plainTxt((SUPPORTS[k].x && SUPPORTS[k].x[0]) || SUPPORTS[k].d)}</small></span>${right}</button>`;
  });
  if (r.n < GEM_SO_MAX)
    rows.push(
      `<button class="sk-row emp" data-sk="hole:${r.n}">${ICO.lock}<span class="sk-t"><b>第 ${r.n + 1} 孔</b><small>還沒打開</small></span></button>`
    );
  return `<section class="sk-sec"><h3 class="sk-lab">輔助<span>${r.so.slice(0, r.n).filter(Boolean).length}／${r.n} 孔</span></h3>${rows.join('')}</section>`;
}
/* 選了一個孔：那顆輔助的說明、I｜II 切換；鎖著的孔寫怎麼開 */
function holeHTML(c, j) {
  const r = c.rec;
  if (j >= r.n) {
    const d = drillCheck(r);
    return `<section class="sk-sec"><h3 class="sk-h">第 ${j + 1} 孔</h3><p class="sk-p">還沒打開。打開之後可以多插一顆輔助，換技能時孔留在這一格。${d.why ? `<br><span class="c-bad">${esc(d.why)}</span>` : ''}</p></section>`;
  }
  const cur = r.so[j],
    b = supBase(cur),
    k2 = sup2Of(b),
    /* I｜II：解鎖了點下去直接換；沒解鎖的 II 只是看（底部按鈕變成解鎖） */
    k = SKUI.tier === 2 && k2 ? k2 : b,
    U = SUPPORTS[k],
    sp = c.g.sup[j],
    bad = !supOK(c.D, sp, c.g),
    note =
      k !== cur
        ? `還沒解鎖，要 ${fmtN(SUP2_COST)} 靈魂；解鎖後所有技能的這顆都可以切成 II`
        : bad
          ? sup2Lock(k)
            ? 'II 還沒解鎖，沒有效果'
            : supDup(c.g, sp)
              ? `這${c.aura ? '個光環' : '招'}已經有同分類的輔助，沒有效果`
              : `跟這${c.aura ? '個光環' : '招'}不相容，沒有效果`
          : '';
  const seg = k2
    ? `<div class="sk-seg" role="group" aria-label="輔助的階">${[b, k2]
        .map(
          (x, n) =>
            `<button class="${x === k ? 'on' : ''}" data-sk="tier:${x}" aria-pressed="${x === k}">${n ? 'II' : 'I'}${n && sup2Lock(x) ? ICO.lock : ''}</button>`
        )
        .join('')}</div>`
    : '';
  const lines = (U.x && U.x.length ? U.x : [U.d]).map(l => `<li>${rich(l)}</li>`).join('');
  /* 這顆的貢獻（拿掉會少多少）；看沒解鎖的 II 時寫換成 II 差多少 */
  let gain = '';
  if (SKUI.i !== 5 && !bad) {
    const base = dpsOf(SKUI.i),
      u = unitOf(slotCfg(SKUI.i));
    if (k !== cur) {
      const d = supProbe(SKUI.i, j, k).v - base;
      gain =
        Math.abs(d) > 0.5
          ? `換成 II：<span class="${d > 0 ? 'sk-up' : 'sk-dn'}">${d > 0 ? '▲' : '▼'} ${u} ${d > 0 ? '+' : '−'}${fmtN(Math.abs(d))}</span>`
          : '換成 II：每秒不變';
    } else {
      const d = base - probe(SKUI.i, () => ((r.so[j] = null), () => (r.so[j] = cur))).v;
      gain = d > 0.5 ? `這顆讓${u}多 <b class="sk-vv">${fmtN(d)}</b>` : `這顆不加${u}`;
    }
  }
  return `<section class="sk-sec sk-hole"><div class="sk-hh"><h3 class="sk-h">${esc(U.n)}${U.aw ? `<small>Lv ${libLv(k)}</small>` : ''}</h3>${seg}</div>
    ${note ? `<p class="sk-p ${k !== cur ? '' : 'c-bad'}">${note}</p>` : ''}
    ${gain ? `<p class="sk-p">${gain}</p>` : ''}
    <ul class="sk-x">${lines}</ul>
    ${U.aw ? `<p class="sk-p">${esc(awSupText(k, libLv(k)))}</p>` : ''}
    ${U.need && U.need.length ? `<p class="sk-lab">需要技能有${U.need.map(t => TAGN[t] || t).join('、')}</p>` : ''}
  </section>`;
}
/* 覺醒（點了在原地展開）：兩張卡二選一；還沒覺醒時選一張要花 1 顆覺醒石（按兩次），之後免費切換、不能拆掉 */
function awText(k, which) {
  const A = AWK[k];
  if (which === 'A') return `${SKILLS[k].m ? `${Math.round((AW_MORE - 1) * 100)}%更多傷害；` : ''}${A.A.d}`;
  const t = A.B.tags;
  return `${fxText(A.B.fx)}${t && t.add ? `；拿到${t.add.map(x => TAGN[x]).join('、')}標籤` : ''}`;
}
function awakeHTML(c) {
  const cur = awOf(c.k),
    n = MAT().awk;
  if (!cur && n < 1) return `<p class="sk-p">沒有覺醒石：打階級 10 以上的王有機會掉，裂口的生肖王一定掉。</p>`;
  const card = which => {
    const A = AWK[c.k][which];
    if (!A) return `<button class="sk-aw" disabled><b>變化版製作中</b><small>法系技能的變化版下一版做</small></button>`;
    return `<button class="sk-aw ${cur === which ? 'on' : ''}" data-sk="awpick:${which}"><b>${esc(A.n)}${cur === which ? '・使用中' : ''}</b><small>${rich(awText(c.k, which), 1)}</small></button>`;
  };
  return `${card('A')}${card('B')}<p class="sk-lab">覺醒石 ${n}${cur ? '・可以免費切換，不能拆掉' : '・選一個花 1 顆，之後免費切換'}</p>`;
}
/* 升一級的主要按鈕（按住連升）：寫升到幾級、代價、▲ 差多少；升不了把原因寫在按鈕上 */
function upBtn(c) {
  const k = c.k,
    lv = libLv(k),
    u = libUpCheck(k);
  if (lv >= GEM_MAX) return `<button class="sk-btn pri" disabled>已經滿級</button>`;
  if (u.why)
    return `<button class="sk-btn pri" disabled title="${esc(u.why)}">升到 Lv ${lv + 1}・${esc(gemShort(u.why))}</button>`;
  let up = '';
  if (!c.aura) {
    const a = dpsOf(SKUI.i),
      { v } = probe(SKUI.i, () => ((S.lib.sk[k] = lv + 1), () => (S.lib.sk[k] = lv)));
    if (a != null && v - a > 0.5) up = `<span class="sk-up">▲ +${fmtN(v - a)}</span>`;
  }
  return `<button class="sk-btn pri" data-sk="up:${k}">升到 Lv ${lv + 1}${soulB(u.c)}${up}</button>`;
}
function oneHTML(c) {
  const k = c.k,
    D = c.D,
    lv = libLv(k),
    hole = SKUI.hole,
    warn = [];
  let extra = '';
  if (c.aura) {
    if (!ST.auraOn.includes(k)) warn.push(auraWhy(k));
  } else {
    const cf = slotCfg(SKUI.i);
    if (cf.lv > lv) extra = `（+${cf.lv - lv}）`;
    if (!wtOK(D)) warn.push(`${needTxt(D)}，沒有效果`);
    const lk = gemLack(c.g);
    if (lk.length) warn.push(`已失效，數值不算：${lackTxt(lk)}`);
    else if (lv < GEM_MAX) {
      const nl = gemLack({ ...c.g, lv: lv + 1 });
      if (nl.length) warn.push(`升到 Lv ${lv + 1} 需要${lackTxt(nl)}，升了會失效`);
    }
  }
  const tags = c.aura
    ? ['光環']
    : [
        ...(D.el && ELN[D.el] ? [`<span class="res-${D.el}">${ELN[D.el]}</span>`] : []),
        ...D.tags.filter(t => TAGN[t] && !['elem', 'occ', 'pri', 'cd'].includes(t)).map(t => TAGN[t])
      ].slice(0, 4);
  const where = c.aura
    ? `光環欄第 ${SKUI.ai + 1} 個`
    : S.auto !== 0
      ? `出招第 ${skOrder().indexOf(SKUI.i) + 1} 個`
      : `按鍵 ${slotKey(SKUI.i, 1)}`;
  let lower, bar;
  if (hole != null) {
    lower = holeHTML(c, hole);
    if (hole >= c.rec.n) {
      const d = drillCheck(c.rec);
      bar = `<button class="sk-btn pri" data-sk="drill" ${d.why ? `disabled title="${esc(d.why)}"` : ''}>打開第 ${hole + 1} 孔${soulB(d.c)}</button>`;
    } else {
      const cur = c.rec.so[hole],
        k2 = sup2Of(supBase(cur)),
        sk = SKUI.tier === 2 && k2 ? k2 : cur,
        heart = SUPPORTS[sk].aw && libLv(sk) === AW_MAX && MAT().heart;
      bar = `${
        sup2Lock(sk)
          ? iiBtn(sk).replace('class="sk-btn"', 'class="sk-btn pri"')
          : heart
            ? `<button class="sk-btn pri" data-sk="heart:${sk}">用燭龍之心突破到 Lv6</button>`
            : `<button class="sk-btn pri" data-sk="swap">更換</button>`
      }${sup2Lock(sk) || heart ? '<button class="sk-btn" data-sk="swap">更換</button>' : ''}<button class="sk-btn" data-sk="unplug">卸下</button>`;
    }
  } else {
    lower = `${supRows(c)}
      <section class="sk-sec"><button class="sk-more" data-sk="calc" aria-expanded="${!!SKUI.calc}">算式與詳細 ${SKUI.calc ? '⌃' : '›'}</button>${
        SKUI.calc
          ? `<div class="sk-open" id="skcalc"><ul class="sk-x">${skLines(c.aura ? c : slotCfg(SKUI.i))
              .map(l => `<li>${rich(l)}</li>`)
              .join('')}</ul>${c.aura ? '' : skDetail(c.g, SKUI.i)}</div>`
          : ''
      }${
        !c.aura && AWK[k]
          ? `<button class="sk-more" data-sk="aw" aria-expanded="${!!SKUI.aw}">覺醒${awOf(k) ? `・${esc(AWK[k][awOf(k)].n)}` : ''} ${SKUI.aw ? '⌃' : '›'}</button>${SKUI.aw ? `<div class="sk-open" id="skaw">${awakeHTML(c)}</div>` : ''}`
          : ''
      }</section>`;
    bar = `${upBtn(c)}<button class="sk-btn" data-sk="swap">${c.aura ? '換一個' : '換一招'}</button><button class="sk-btn" data-sk="out">卸下</button>`;
  }
  return `<div class="sk-top"><button class="sk-back" data-sk="back">‹ ${hole != null ? esc(D.n) : '總覽'}</button><span>${where}</span></div>
  <div class="sk-scroll"><div class="sk-one">
    <h2 class="sk-h">${esc(D.n)}<small>Lv ${lv}${extra}・${tags.join('・')}</small></h2>${heroHTML(c)}${ringHTML(c)}
    <div class="sk-info">${warn.map(w => `<p class="sk-p c-bad">${esc(w)}</p>`).join('')}
      <p class="sk-p">${rich(D.d)}${!c.aura && awOf(k) ? ` <span class="sk-awt">${esc(AWK[k][awOf(k)].n)}</span>：${rich(awText(k, awOf(k)))}` : ''}</p>
      ${lower}</div>
  </div></div>
  <div class="sk-bar">${bar}</div>`;
}

/* ---------- 挑選：清單列，照差多少排；打開時一次算完、記住 ---------- */
let PICKC = null;
function pickRows(c) {
  const v = SKUI.view,
    i = SKUI.i,
    key = `${v}|${i}|${SKUI.ai}|${SKUI.hole}|${JSON.stringify(c.slot || null)}`;
  if (PICKC && PICKC.key === key && PICKC.st === ST && PICKC.soul === MAT().soul) return PICKC;
  const L = skList(c);
  let base = null,
    cf0 = null,
    u = '每秒';
  if (v === 'sups') {
    if (i === 5) base = mainDps();
    else (cf0 = slotCfg(i)), (base = cf0 ? skMain(skillNums(cf0)) : null), (u = unitOf(cf0));
    for (const x of L) {
      const k2 = sup2Of(x.k),
        tierKey = k2 && !sup2Lock(k2) ? k2 : x.k;
      x.put = tierKey;
      if (x.why) continue;
      const p = supProbe(i, SKUI.hole, tierKey);
      x.d = base != null && p.v != null ? p.v - base : null;
      x.fx = fxDiff(cf0, p.cf);
      if (k2) {
        const p1 = tierKey === k2 ? supProbe(i, SKUI.hole, x.k) : p,
          p2 = tierKey === k2 ? p : supProbe(i, SKUI.hole, k2);
        x.d1 = base != null ? p1.v - base : null;
        x.d2 = base != null ? p2.v - base : null;
      }
    }
  } else if (v === 'skills') {
    base = S.skills[i].k ? dpsOf(i) : null;
    for (const x of L) {
      if (x.why) continue;
      const p = probe(i, () => {
        const o = S.skills[i].k;
        S.skills[i].k = x.k;
        return () => (S.skills[i].k = o);
      });
      x.val = p.v;
      x.unit = unitOf(p.cf);
      x.d = p.v != null && base != null && x.key !== i ? p.v - base : null;
      x.fx = p.v == null ? plainTxt(skillNums(p.cf).eff || '') : '';
    }
  } else {
    base = mainDps();
    for (const x of L) {
      if (x.why) continue;
      const p = probe(5, () => {
        const o = S.auras[SKUI.ai];
        S.auras[SKUI.ai] = o ? { ...o, k: x.k } : { k: x.k, so: [null, null], n: 2 };
        return () => (S.auras[SKUI.ai] = o);
      });
      /* 放上去精魂不夠：光環不會生效 */
      const st = ST,
        o = S.auras[SKUI.ai];
      S.auras[SKUI.ai] = o ? { ...o, k: x.k } : { k: x.k, so: [null, null], n: 2 };
      ST = stats();
      const on = ST.auraOn.includes(x.k);
      S.auras[SKUI.ai] = o;
      ST = st;
      if (!on) x.why = `精魂不夠（要 ${x.D.sp}）`;
      else x.d = p.v - base;
    }
  }
  const score = x => (x.why ? -1e12 : (x.d || 0) + (x.fx ? 0.001 : 0));
  L.sort((a, b) => score(b) - score(a));
  PICKC = { key, st: ST, soul: MAT().soul, L, base, u };
  return PICKC;
}
/* 推薦＝對這一招有效果（輔助）、現在能用（技能）、放得上去（光環） */
const recOK = x => !x.why && (SKUI.view !== 'sups' || (x.d != null && Math.abs(x.d) > 0.5) || !!x.fx);
/* 右邊的差多少（DESIGN.md 第 2 節第 9 條） */
function deltaHTML(x, P) {
  if (x.why) return `<span class="sk-d0">${esc(x.why)}</span>`;
  const pct = P.base ? `（${Math.round((x.d / P.base) * 100)}%）` : '';
  if (x.d != null && x.d > 0.5) return `<span class="sk-up">▲ ${P.u} +${fmtN(x.d)}${pct}</span>`;
  if (x.d != null && x.d < -0.5) return `<span class="sk-dn">▼ ${P.u} −${fmtN(-x.d)}</span>`;
  if (SKUI.view === 'skills') {
    if (x.key === SKUI.i) return `<span class="sk-d0">現在這招</span>`;
    return x.val != null
      ? `<span class="sk-vv">${x.unit} ${fmtN(x.val)}</span>`
      : `<span class="sk-d0">沒有傷害</span>`;
  }
  if (x.fx && x.fx !== '*') return `<span class="sk-vv">${x.fx}</span>`;
  return `<span class="sk-d0">＝ ${SKUI.view === 'auras' ? '每秒不變' : x.fx ? '效果見說明' : '沒有變化'}</span>`;
}
function pickHTML(c) {
  const P = pickRows(c),
    v = SKUI.view,
    L = P.L,
    order = [...new Set(['武器', '元素', '秘術', '原始', '詛咒', '光環', '召喚', ...Object.keys(SUPTAB)])],
    have = new Set(L.flatMap(x => x.tabs)),
    tabs = ['推薦', ...order.filter(t => have.has(t)), '全部'];
  let f = tabs.includes(SKUI.f[v]) ? SKUI.f[v] : '推薦';
  if (f === '推薦' && !L.some(recOK)) f = '全部';
  const show = L.filter(x => (f === '全部' ? true : f === '推薦' ? recOK(x) : x.tabs.includes(f)));
  /* 預選差最多的那一列（不是現在這招） */
  if (!show.some(x => x.k === SKUI.pick))
    SKUI.pick = (show.find(x => !x.why && !(v === 'skills' && x.key === SKUI.i)) || {}).k || null;
  const sel = L.find(x => x.k === SKUI.pick);
  const title =
    v === 'skills'
      ? `${c.rec ? `‹ ${esc(c.D.n)}` : '‹ 總覽'}`
      : v === 'sups'
        ? `‹ ${esc(c.D.n)}`
        : c.rec
          ? `‹ ${esc(c.D.n)}`
          : '‹ 總覽';
  const right =
    v === 'skills'
      ? `${c.name}・${S.skills[SKUI.i].k && P.base != null ? `現在${P.u} ${fmtN(P.base)}` : '挑一招'}`
      : v === 'sups'
        ? `第 ${SKUI.hole + 1} 孔・現在${P.u} ${P.base != null ? fmtN(P.base) : '—'}`
        : `精魂 ${ST.spiritUsed}／${ST.spirit}・比主力的每秒`;
  const row = x => {
    const on = x === sel,
      sub =
        v === 'skills'
          ? `Lv ${libLv(x.k)}${x.key >= 0 && x.key !== SKUI.i ? `・在${slotKey(x.key)}` : ''}${x.fx ? `・${x.fx}` : ''}`
          : v === 'auras'
            ? `精魂 ${x.D.sp}・${plainTxt(x.D.d)}`
            : plainTxt((x.D.x && x.D.x[0]) || x.D.d);
    return `<button class="sk-row ${on ? 'on' : ''} ${x.why ? 'dim' : ''}" data-sk="pick:${x.k}" data-tipk="${x.k}" aria-pressed="${on}">${icHTML(x.D.ic)}<span class="sk-t"><b>${esc(x.D.n)}</b>${on ? '' : `<small>${sub}</small>`}</span>${deltaHTML(x, P)}</button>${on ? expandHTML(x, P) : ''}`;
  };
  return `<div class="sk-top"><button class="sk-back" data-sk="back">${title}</button><span>${right}</span></div>
  <div class="sk-chips" role="group" aria-label="篩選">${tabs.map(t => `<button class="${t === f ? 'on' : ''}" data-sk="f:${t}" aria-pressed="${t === f}">${t}</button>`).join('')}</div>
  <div class="sk-scroll sk-list">${show.length ? show.map(row).join('') : '<p class="sk-p">這裡沒有東西。</p>'}</div>
  ${sel ? `<div class="sk-bar">${putBtn(sel, P, c)}</div>` : ''}`;
}
/* 選中的那一列在原地展開：完整說明；輔助另外有 I｜II 切換（沒解鎖寫解鎖 II 的代價） */
function expandHTML(x, P) {
  const v = SKUI.view,
    lines = (v === 'skills' ? [x.D.d] : x.D.x && x.D.x.length ? x.D.x : [x.D.d])
      .map(l => `<li>${rich(l)}</li>`)
      .join(''),
    k2 = v === 'sups' && sup2Of(x.k);
  let seg = '';
  if (k2) {
    const t2 = SKUI.tier === 2,
      d = t => (t != null && Math.abs(t) > 0.5 ? `${t > 0 ? '▲ +' : '▼ −'}${fmtN(Math.abs(t))}` : '＝');
    seg = `<div class="sk-seg" role="group" aria-label="輔助的階"><button class="${t2 ? '' : 'on'}" data-sk="ptier:1" aria-pressed="${!t2}">I　${d(x.d1)}</button><button class="${t2 ? 'on' : ''}" data-sk="ptier:2" aria-pressed="${t2}">II${sup2Lock(k2) ? ICO.lock : ''}　${d(x.d2)}</button></div>${
      t2
        ? `<ul class="sk-x">${(SUPPORTS[k2].x && SUPPORTS[k2].x.length ? SUPPORTS[k2].x : [SUPPORTS[k2].d]).map(l => `<li>${rich(l)}</li>`).join('')}</ul>`
        : ''
    }`;
  }
  return `<div class="sk-rowx">${SKUI.tier === 2 && k2 ? '' : `<ul class="sk-x">${lines}</ul>`}${seg}${
    v === 'sups' && x.D.need && x.D.need.length
      ? `<p class="sk-lab">需要技能有${x.D.need.map(t => TAGN[t] || t).join('、')}</p>`
      : ''
  }</div>`;
}
/* 挑選的主要按鈕：插上／放到／放進，寫差多少 */
function putBtn(x, P, c) {
  const v = SKUI.view,
    up = x.d != null && x.d > 0.5 ? `<span class="sk-up">▲ +${fmtN(x.d)}</span>` : '';
  if (x.why) return `<button class="sk-btn pri" disabled>${esc(x.why)}</button>`;
  if (v === 'sups') {
    const k2 = sup2Of(x.k);
    if (SKUI.tier === 2 && k2 && sup2Lock(k2)) return iiBtn(k2).replace('class="sk-btn"', 'class="sk-btn pri"');
    const kk = SKUI.tier === 2 && k2 ? k2 : x.k,
      d = k2 ? (SKUI.tier === 2 ? x.d2 : x.d1) : x.d,
      up2 = d != null && d > 0.5 ? `<span class="sk-up">▲ +${fmtN(d)}</span>` : '';
    return `<button class="sk-btn pri" data-sk="put:${kk}">${c.rec.so[SKUI.hole] ? '換成' : '插上'}${esc(SUPPORTS[kk].n)}${up2}</button>`;
  }
  if (v === 'skills') {
    const j = x.key;
    if (j === SKUI.i) return `<button class="sk-btn pri" data-sk="back">現在就是這招</button>`;
    return `<button class="sk-btn pri" data-sk="put:${x.k}">${j >= 0 ? `與${slotKey(j)}互換` : S.skills[SKUI.i].k ? `換成${esc(x.D.n)}` : `放到${slotKey(SKUI.i)}`}${up}</button>`;
  }
  return `<button class="sk-btn pri" data-sk="put:${x.k}">放進光環欄${up}</button>`;
}

function skillHTML() {
  const c = skCur();
  /* 選的那一格被拿空了（卸下、換掉）：回總覽 */
  if (SKUI.view === 'one' && !c.rec) SKUI.view = 'home';
  if (SKUI.view === 'sups' && !c.rec) SKUI.view = 'home';
  const v = SKUI.view,
    body = PICKV.includes(v) ? pickHTML(c) : v === 'one' ? oneHTML(c) : homeHTML(),
    anim = SKUI.anim;
  SKUI.anim = '';
  return `<div class="ph"><b>技能</b><span class="soul" title="靈魂：升級、開孔、解鎖輔助 II 都花它"><i></i>${fmtN(MAT().soul)}</span>${swapB('背包')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="skp ${v === 'home' ? 'home' : v === 'one' ? 'one' : 'pick'} ${anim}">${body}</div>`;
}

/* ---------- 動作 ---------- */
/* 打開技能分頁、再點一次分頁＝回總覽 */
function skHome() {
  SKUI.view = 'home';
  SKUI.hole = SKUI.pick = SKUI.mv = null;
  SKUI.calc = SKUI.aw = 0;
}
/* 舊的入口（測試工具用）：選第 i 格，到這一招（空格到挑一招） */
function skSel(i) {
  SKUI.i = i;
  SKUI.hole = SKUI.pick = SKUI.mv = null;
  SKUI.aw = SKUI.calc = 0;
  if (i === 5) {
    if (!S.auras[SKUI.ai]) SKUI.ai = Math.max(0, S.auras.findIndex(Boolean));
    SKUI.view = S.auras.some(Boolean) ? 'one' : 'auras';
  } else SKUI.view = S.skills[i].k ? 'one' : 'skills';
}
function skOpen(view) {
  SKUI.view = view;
  SKUI.pick = null;
  /* 這一孔原本插的是 II：清單預設選 II */
  const cur = view === 'sups' && SKUI.hole != null && skCur().rec && skCur().rec.so[SKUI.hole];
  SKUI.tier = cur && SUPPORTS[cur].tier === 2 ? 2 : 1;
}
/* 出招順序：兩格整格互換（技能、孔、輔助一起走），冷卻跟著換 */
function skSwap(a, b) {
  [S.skills[a], S.skills[b]] = [S.skills[b], S.skills[a]];
  [P.cds['s' + a], P.cds['s' + b]] = [P.cds['s' + b], P.cds['s' + a]];
}
function skAct(b) {
  const [k, ...r] = b.dataset.sk.split(':'),
    v = r.join(':'),
    c = skCur(),
    lvl = { home: 0, one: 1 }[SKUI.view] ?? 2;
  hideTip();
  if (k === 'go') {
    const [w, a, j] = v.split(':');
    SKUI.mv = null;
    if (w === 'one') skSel(+a);
    else if (w === 'aura') (SKUI.i = 5), (SKUI.ai = +a), (SKUI.hole = null), (SKUI.view = 'one');
    else if (w === 'skills') (SKUI.i = +a), (SKUI.hole = null), skOpen('skills');
    else if (w === 'auras') (SKUI.i = 5), (SKUI.ai = S.auras.findIndex(x => !x)), (SKUI.hole = null), skOpen('auras');
    else if (w === 'hole') (SKUI.i = +a), (SKUI.hole = +j), skOpen('sups');
  } else if (k === 'back') {
    if (PICKV.includes(SKUI.view)) {
      SKUI.view = c.rec ? 'one' : 'home';
      if (SKUI.view === 'one' && SKUI.hole != null && !c.rec.so[SKUI.hole]) SKUI.hole = null;
    } else if (SKUI.view === 'one' && SKUI.hole != null) SKUI.hole = null;
    else skHome();
  } else if (k === 'ctr') SKUI.hole = null;
  else if (k === 'hole') {
    const j = +v;
    if (j < c.rec.n && !c.rec.so[j]) (SKUI.hole = j), skOpen('sups');
    else {
      SKUI.hole = SKUI.hole === j ? null : j;
      const cur = SKUI.hole != null && c.rec.so[j];
      SKUI.tier = cur && SUPPORTS[cur].tier === 2 ? 2 : 1;
    }
  } else if (k === 'calc' || k === 'aw') {
    SKUI[k] = SKUI[k] ? 0 : 1;
    if (SKUI[k]) SKUI.reveal = k === 'calc' ? 'skcalc' : 'skaw';
  } else if (k === 'awpick') {
    if (!awOf(c.k) && !confirm2(b, `<b>再按一次</b><small>花 1 顆覺醒石</small>`)) return;
    const err = awakeDo(c.k, v);
    if (err) return hudWarn(err);
    sfx('lvup');
    return changed();
  } else if (k === 'drill') {
    const d = drillCheck(c.rec);
    if (d.c >= MAT().soul * 0.5 && !confirm2(b, `再按一次・${soulB(d.c)}`)) return;
    const err = drillDo(c.rec);
    if (err) return hudWarn(err);
    sfx('equip');
    return changed();
  } else if (k === 'ii') {
    if (SUP2_COST >= MAT().soul * 0.5 && !confirm2(b, `再按一次・${soulB(SUP2_COST)}`)) return;
    const err = sup2Unlock(v);
    if (err) return hudWarn(err);
    sfx('lvup');
    /* 在孔上解鎖：直接換成 II */
    if (SKUI.view === 'one' && SKUI.hole != null && supBase(c.rec.so[SKUI.hole]) === SUPPORTS[v].base)
      c.rec.so[SKUI.hole] = v;
    return changed();
  } else if (k === 'heart') {
    const err = heartUse(v);
    if (err) return hudWarn(err);
    sfx('lvup');
    return changed();
  } else if (k === 'up') {
    if (performance.now() - HOLD.last < 600) return;
    return skUp(v);
  } else if (k === 'tier') {
    /* 孔上的 I｜II：解鎖了直接換；沒解鎖只是看，底部按鈕變成解鎖 */
    SKUI.tier = SUPPORTS[v].tier === 2 ? 2 : 1;
    if (!sup2Lock(v) && c.rec.so[SKUI.hole] !== v) {
      c.rec.so[SKUI.hole] = v;
      sfx('click');
      return changed();
    }
  } else if (k === 'ptier') SKUI.tier = +v;
  else if (k === 'swap') skOpen(SKUI.hole != null ? 'sups' : c.aura ? 'auras' : 'skills');
  else if (k === 'f') SKUI.f[SKUI.view] = v;
  else if (k === 'pick') {
    SKUI.pick = v;
    const k2 = sup2Of(v);
    SKUI.tier = k2 && !sup2Lock(k2) ? 2 : 1;
  } else if (k === 'mv') {
    if (DRAG.moved) return;
    SKUI.mv = SKUI.mv === +v ? null : +v;
  } else if (k === 'mvd') {
    const j = mvTo(SKUI.mv, +v);
    if (j < 0) return;
    skSwap(SKUI.mv, j);
    SKUI.mv = j;
    sfx('click');
    return changed();
  } else if (k === 'mvok') SKUI.mv = null;
  else if (k === 'unplug') {
    c.rec.so[SKUI.hole] = null;
    SKUI.hole = null;
    sfx('click');
    return changed();
  } else if (k === 'out') {
    /* 技能格：只拿掉技能，格子的孔與輔助留著（換上別招照樣用）；等級在目錄裡不會掉 */
    if (!c.aura) {
      S.skills[SKUI.i].k = null;
      skHome();
      SKUI.anim = 'back';
      sfx('click');
      return changed();
    }
    /* 光環：開過的孔與插著的輔助會一起拿掉，花了靈魂的東西要確認 */
    if ((c.rec.n > 2 || c.rec.so.some(Boolean)) && !confirm2(b, `<b>再按一次</b><small>孔與輔助一起拿掉</small>`))
      return;
    S.auras[SKUI.ai] = null;
    skHome();
    SKUI.anim = 'back';
    sfx('click');
    return changed();
  } else if (k === 'put') return skPut(v);
  const lv2 = { home: 0, one: 1 }[SKUI.view] ?? 2;
  if (lv2 !== lvl) SKUI.anim = lv2 > lvl ? 'fwd' : 'back';
  sfx('click');
  hudPanels();
  if (lv2 !== lvl) skTop();
  skReveal();
}
/* 換了畫面：清單回到最上面（選中的那一列捲進畫面） */
function skTop() {
  const s = document.querySelector('#pskill .sk-scroll');
  if (s) s.scrollTop = 0;
  const on = document.querySelector('#pskill .sk-list .sk-row.on');
  if (on && s) s.scrollTop = Math.max(0, on.offsetTop - s.offsetTop - 60);
}
/* 點了展開：展開的內容捲進畫面 */
function skReveal() {
  if (!SKUI.reveal) return;
  const e = $(SKUI.reveal);
  SKUI.reveal = '';
  if (e)
    e.scrollIntoView({
      block: 'nearest',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
}
function skUp(k) {
  const err = libUp(k);
  if (err) return hudWarn(err), false;
  sfx('lvup');
  changed();
  document.querySelectorAll('#pskill .sk-n, #pskill .sk-one > .sk-h small').forEach(n => n.classList.add('flash'));
  return true;
}
function skPut(k) {
  const c = skCur(),
    v = SKUI.view;
  if (v === 'skills') {
    const why = skWhy(SKILLS[k]);
    if (why) return hudWarn(why);
    /* 這招已經裝在別的格：兩格互換 */
    const j = S.skills.findIndex(s => s.k === k);
    if (j >= 0 && j !== SKUI.i) S.skills[j].k = S.skills[SKUI.i].k;
    S.skills[SKUI.i].k = k;
    SKUI.hole = null;
  } else if (v === 'sups') {
    const w = supWhy(c, k, SKUI.hole);
    if (w) return hudWarn(w);
    c.rec.so[SKUI.hole] = k;
  } else {
    if (S.auras.some((x, j) => x && x.k === k && j !== SKUI.ai)) return hudWarn('已經在光環欄裡');
    if (S.auras[SKUI.ai]) S.auras[SKUI.ai].k = k;
    else S.auras[SKUI.ai] = { k, so: [null, null], n: 2 };
    SKUI.hole = null;
  }
  SKUI.view = 'one';
  SKUI.pick = null;
  SKUI.anim = 'back';
  sfx('equip');
  changed();
  skTop();
}
/* 升級按住連升：按下就升一級，按住 0.4 秒後每 0.12 秒再升一級，放開或升不了就停（數字跟著動） */
const HOLD = { t: 0, last: -1e9 };
function holdStop() {
  clearTimeout(HOLD.t);
  HOLD.t = 0;
}
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('#pskill [data-sk^="up:"]');
  if (!b || b.disabled || e.button > 0) return;
  const k = b.dataset.sk.slice(3);
  HOLD.last = performance.now();
  if (!skUp(k)) return;
  const step = () => {
    HOLD.last = performance.now();
    HOLD.t = skUp(k) ? setTimeout(step, 120) : 0;
  };
  holdStop();
  HOLD.t = setTimeout(step, 400);
});
['pointerup', 'pointercancel', 'blur'].forEach(t => addEventListener(t, holdStop));
/* 出招順序拖把手換順序：列跟著手指，放開照位置換；不動就是選它（底下出上移／下移） */
const DRAG = { moved: 0 };
document.addEventListener('pointerdown', e => {
  const g = e.target.closest('#pskill .sk-grip');
  if (!g || e.button > 0) return;
  const i = +g.dataset.sk.slice(3),
    rows = [...document.querySelectorAll('#pskill .sk-orow')],
    me = rows.find(r => +r.dataset.i === i);
  if (!me) return;
  /* 同一組才能換（普攻固定最後、條件技在後面那一組） */
  const grp = rows.filter(r => +r.dataset.i && isLate(+r.dataset.i) === isLate(i)),
    y0 = e.clientY,
    top0 = grp[0].getBoundingClientRect().top - me.getBoundingClientRect().top,
    bot0 = grp[grp.length - 1].getBoundingClientRect().top - me.getBoundingClientRect().top;
  DRAG.moved = 0;
  g.setPointerCapture(e.pointerId);
  const move = ev => {
    const dy = Math.max(top0, Math.min(bot0, ev.clientY - y0));
    if (Math.abs(ev.clientY - y0) > 6) DRAG.moved = 1;
    if (DRAG.moved) me.classList.add('drag'), (me.style.transform = `translateY(${dy}px)`);
  };
  const up = () => {
    g.removeEventListener('pointermove', move);
    g.removeEventListener('pointerup', up);
    g.removeEventListener('pointercancel', up);
    if (!DRAG.moved) return;
    /* 放開的位置：中線上面有幾列，就排第幾個 */
    const mid = me.getBoundingClientRect().top + me.offsetHeight / 2,
      from = grp.indexOf(me),
      target = grp.filter(r => r !== me && r.getBoundingClientRect().top + r.offsetHeight / 2 < mid).length;
    let cur = i;
    for (let s = from; s !== target; s += target > from ? 1 : -1) {
      const j = mvTo(cur, target > from ? 1 : -1);
      if (j < 0) break;
      skSwap(cur, j);
      cur = j;
    }
    SKUI.mv = null;
    setTimeout(() => (DRAG.moved = 0), 0);
    sfx('click');
    changed();
  };
  g.addEventListener('pointermove', move);
  g.addEventListener('pointerup', up);
  g.addEventListener('pointercancel', up);
});
document.addEventListener('click', e => {
  const b = e.target.closest('#pskill [data-sk]');
  if (b && !b.disabled) skAct(b);
});
/* 桌機滑過清單列就預覽說明（手機點一下在原地展開） */
document.addEventListener('mouseover', e => {
  if (TOUCH.on) return;
  const b = e.target.closest('#pskill .sk-list [data-tipk]');
  if (!b || b.classList.contains('on')) return;
  const k = b.dataset.tipk,
    D = SKILLS[k] || SUPPORTS[k] || AURAS[k],
    L = SKILLS[k] ? [D.d] : D.x && D.x.length ? D.x : [D.d];
  showTip(`<b>${esc(D.n)}</b>${L.map(l => `<p>${rich(l, 1)}</p>`).join('')}`, b.getBoundingClientRect());
});
document.addEventListener('mouseout', e => {
  if (!TOUCH.on && e.target.closest('#pskill .sk-list [data-tipk]')) hideTip();
});
