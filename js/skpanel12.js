/* 技能面板桌機 1280×720（S/skills-panel.md v1.0.1；示意圖 W4-skill-panel/color 01、03–05、07–18）。
   右欄 #pskill（788,76 476×486）加 .s12，裡面照規格座標絕對定位；名冊是左側抽屜 #pros（16,76 476×486），需要時才開。
   觸控（直立、橫向）仍走 skpanel.js 的 skillHTML；數字（差多少、最好的輔助）都借 skpanel.js 的 probe／pickRows。
   SK：ros 名冊 { tab 技能｜輔助, mode list 點選後按主鈕｜grid 拖放, i 格（5＝光環）, ai, hole }、pick 名冊選中的鍵、tier 輔助選 I／II、f 篩選、
   hov 懸停的東西（row:i／hole:i:j／sw:i／aura:j）、alt 按住 Alt／Ｙ、pin 點了技能列（浮窗留著、可以按）、sel 選中要換序的格、
   as 選中的光環、ii 解鎖 II 的確認窗、undo 卸下後 3 秒內可復原、busy 拖曳或長按中（不重畫）、kb 最後一次輸入是鍵盤／手把 */
'use strict';
const SK = {
  ros: null,
  pick: null,
  tier: 1,
  f: {},
  hov: null,
  alt: 0,
  pin: 0,
  sel: null,
  as: null,
  ii: null,
  undo: null,
  busy: 0,
  kb: 0
};
const sk12On = () => !TOUCH.on;
/* 畫面寫「長老屋」不寫「祭壇」（名詞表 v0.6.19）；程式 id altar 不改 */
const skBN = b => (b === 'altar' ? '長老屋' : CAMPN[b]);
/* 第 n 格技能／第 n 個輔助孔要哪個設施幾級（skills-panel「解鎖」；跟 craft.js 的 campN 同一張表） */
/* 名詞提示的字（名詞表；TERMS 沒有收的先放這裡） */
const SK_TERM = { 精魂: '光環、魔像、夥伴等技能開著時佔住的資源；光環能不能生效只看精魂。' };
const SK_SLOT = [null, ['altar', 1], ['altar', 3], ['altar', 6], ['forge', 16]],
  SK_HOLE = [2, 5, 8, 11, 11];
/* 更換圖示：自繪 16 px 雙循環箭頭（佔位，正式素材轉美術） */
const SK_SW =
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 6.5A5.2 5.2 0 0 0 3.6 5M3 9.5A5.2 5.2 0 0 0 12.4 11"/><path d="M3.2 2.2v3h3M12.8 13.8v-3h-3"/></svg>',
  SK_GRIP =
    '<svg class="ico" viewBox="0 0 8 16" aria-hidden="true"><path d="M2 3h.01M6 3h.01M2 8h.01M6 8h.01M2 13h.01M6 13h.01"/></svg>',
  /* 鎖孔：交叉鎖鏈＋小鎖頭（孔內不寫字） */
  SK_CHAIN =
    '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M21 3L3 21"/><rect x="8" y="11" width="8" height="6" rx="1"/><path d="M10 11V9a2 2 0 0 1 4 0v2"/></svg>';
/* 借 skpanel.js 的函式（它們讀 SKUI）：暫時把 SKUI 指到這一格，做完還原（SKUI.view 不留在挑選頁，世界不會停） */
function skWith(view, i, ai, hole, fn) {
  const o = { view: SKUI.view, i: SKUI.i, ai: SKUI.ai, hole: SKUI.hole, pick: SKUI.pick };
  Object.assign(SKUI, { view, i, ai: ai || 0, hole });
  try {
    return fn(skCur());
  } finally {
    Object.assign(SKUI, o);
  }
}
const skRec = (i, ai) => (i === 5 ? S.auras[ai] : S.skills[i]);
const skDef = (i, ai) => {
  const r = skRec(i, ai);
  return r && r.k ? (i === 5 ? AURAS[r.k] : awD(r.k, awOf(r.k))) : null;
};
const skAi = i => (i === 5 ? SK.as || 0 : 0);
/* 名冊的清單（照差多少排好）：記住，ST、靈魂、這一格變了才重算 */
const SK_L = new Map();
function skRows(view, i, ai, hole) {
  const key = `${view}|${i}|${ai}|${hole}|${JSON.stringify(skRec(i, ai) || null)}|${S.skills.map(r => r.k).join()}`,
    soul = MAT().soul;
  if (SK_L.st !== ST || SK_L.soul !== soul) SK_L.clear(), (SK_L.st = ST), (SK_L.soul = soul);
  if (!SK_L.has(key))
    SK_L.set(
      key,
      skWith(view, i, ai, hole, c => ((PICKC = null), pickRows(c)))
    );
  return SK_L.get(key);
}
/* 孔 j 的狀態：f 插著（x＝沒有效果）、e 空著、lk 被長老屋上限鎖住（lv）、dr 還沒打開（花靈魂開） */
function skHole(i, ai, j) {
  const r = skRec(i, ai),
    n = soN(r);
  if (j < n) {
    const k = r.so[j];
    if (!k) return { t: 'e' };
    const g = recGem(r, S.lib);
    return { t: 'f', k, x: !supOK(skDef(i, ai), g.sup[j], g) };
  }
  if (j === r.n && r.n < campN('holes')) return { t: 'dr', c: drillCheck(r) };
  return { t: 'lk', lv: SK_HOLE[j] };
}
const skSupN = k => SUPPORTS[k].n + (SUPPORTS[k].tier === 2 && !/II$/.test(SUPPORTS[k].n) ? ' II' : '');
/* 第 2 行屬性：彈匣／儲存／冷卻（用不了的招寫原因） */
function skAttr(i) {
  const bad = slotBad(i);
  if (bad) return `<span class="c-bad">${esc(bad)}</span>`;
  /* 彈匣、儲存寫容量（照示意圖「彈匣 6/6」「儲存 2/2」；面板不是每格重畫，不寫會跳的現值） */
  const o = bhSkState(i),
    L = [];
  if (o.kind === 'ammo' || o.kind === 'rl') L.push(`彈匣 ${o.max}/${o.max}`);
  if (o.kind === 'gren') L.push(`儲存 ${o.max}/${o.max}`, `冷卻 ${+o.cdT.toFixed(1)} 秒`);
  if (o.c.cd) L.push(`冷卻 ${+o.c.cd.toFixed(1)} 秒`);
  return L.join('　');
}
const skKey = i => `${i + 1} ${SLOTKEY[i]}`;
function skHolesHTML(i, ai) {
  const R = SK.ros,
    grid = R && R.tab === 'sups' && R.mode === 'grid';
  return `<span class="s-h">${[0, 1, 2, 3, 4]
    .map(j => {
      const h = skHole(i, ai, j),
        /* 能插的加框（K10 A）：點選挑輔助＝對準的那一孔；拖放＝選中的那顆放得進去的孔（沒選＝開著的孔） */
        /* F-4（示意 18）：拖放時只有空、相容、沒鎖的孔加框；已插、鎖住、不相容變淡＋✕（點已插的孔仍可換成這顆） */
        can =
          R && R.tab === 'sups'
            ? grid
              ? h.t === 'e' && (!SK.pick || skWith('sups', i, ai, j, c => supWhy(c, SK.pick, j)) === '')
              : (h.t === 'f' || h.t === 'e') && R.i === i && R.ai === ai && R.hole === j
            : 0,
        no = grid && R.tab === 'sups' && !can,
        lab =
          h.t === 'f'
            ? skSupN(h.k) + (h.x ? '，沒有效果' : '')
            : h.t === 'e'
              ? '空著的輔助孔'
              : h.t === 'dr'
                ? '還沒打開的輔助孔'
                : '還不能用的輔助孔';
      return `<button class="s-o ${h.t}${h.x ? ' x' : ''}${can ? ' can' : ''}${no ? ' no' : ''}" data-s="hole:${i}:${j}" data-h="hole:${i}:${j}" aria-label="孔 ${j + 1}：${esc(lab)}">${
        h.t === 'f'
          ? icHTML(SUPPORTS[h.k].ic) +
            (SUPPORTS[h.k].tier === 2 ? '<i class="ii">II</i>' : '') +
            (h.x || no ? '<i class="xx">✕</i>' : '')
          : (h.t === 'e' ? '＋' : SK_CHAIN) + (no ? '<i class="xx">✕</i>' : '')
      }</button>`;
    })
    .join('')}</span>`;
}
/* 一列（技能格 i 0–4；5＝選中的光環） */
function skRowHTML(i) {
  const ai = skAi(i),
    r = skRec(i, ai),
    D = skDef(i, ai),
    v = i === 5 ? null : dpsOf(i),
    on = SK.sel === i || (SK.ros && SK.ros.i === i && SK.ros.mode === 'list') || SK.pin === 'row:' + i;
  return `<div class="s-r${on ? ' on' : ''}${i < 5 && slotBad(i) ? ' off' : ''}" data-s="row:${i}" data-h="row:${i}" tabindex="0" role="group" aria-label="${esc(D.n)}">${
    i < 5
      ? `<button class="s-g" data-s="grip:${i}" aria-label="調整${esc(D.n)}的順序" aria-pressed="${SK.sel === i}">${SK_GRIP}</button><kbd>${skKey(i)}</kbd>`
      : '<kbd>光環</kbd>'
  }${icHTML(D.ic)}<b class="s-n">${esc(D.n)}</b>${
    i < 5 ? `<button class="s-sw" data-s="sw:${i}" data-h="sw:${i}" aria-label="更換技能">${SK_SW}</button>` : ''
  }<span class="s-lv">等級 ${libLv(r.k)}</span><b class="s-d">${
    i === 5 ? `精魂 ${D.sp}` : `DPS ${v != null ? fullN(v) : '—'}`
  }</b><span class="s-a">${
    i === 5 ? (ST.auraOn.includes(r.k) ? '生效中' : `<span class="c-bad">${esc(auraWhy(r.k))}</span>`) : skAttr(i)
  }</span>${skHolesHTML(i, ai)}</div>`;
}
function sk12HTML() {
  const n = campN('slots'),
    hn = campN('holes'),
    nh = nextUnlock('hole'),
    au = S.auras.filter(Boolean);
  if (SK.as != null && !S.auras[SK.as]) SK.as = null;
  if (SK.sel != null && !(S.skills[SK.sel] && S.skills[SK.sel].k)) SK.sel = null;
  const rows = S.skills
    .map((r, i) =>
      i >= n
        ? `<div class="s-lk"><b>${i + 1}</b>升${skBN(SK_SLOT[i][0])}到 Lv${SK_SLOT[i][1]}，開第 ${i + 1} 格技能</div>`
        : r.k
          ? skRowHTML(i)
          : `<button class="s-r emp${SK.ros && SK.ros.tab === 'skills' && (SK.ros.mode === 'grid' || SK.ros.i === i) ? ' on' : ''}" data-s="slot:${i}"><kbd>${skKey(i)}</kbd><span>點這裡挑一招</span></button>`
    )
    .join('');
  return `<div class="s-hd"><b>技能</b><span>長老屋 Lv${S.camp ? S.camp.altar : 11}・每招 ${hn} 孔</span><small>${S.auto !== 0 ? '出招順序・由上往下放' : '技能・照按鍵'}</small></div>
  <button class="s-b s-ros${SK.ros ? ' on' : ''}" data-s="ros" aria-pressed="${!!SK.ros}">名冊</button>
  <button class="s-x" data-a="close" aria-label="關閉">${ICO.x}<kbd>G</kbd></button>
  <div class="s-l" data-sb>${rows}${nh ? `<p class="s-nx">升${skBN(nh.b)}到 Lv${nh.lv}，每一招多 1 個輔助孔。</p>` : ''}${
    campCan('aura')
      ? `<div class="s-au"><b>光環</b>${au
          .map((a, j) => {
            const on = ST.auraOn.includes(a.k);
            return `<button class="s-o f${on ? '' : ' x'}${SK.as === j ? ' can' : ''}" data-s="aura:${j}" data-h="aura:${j}" aria-pressed="${SK.as === j}" aria-label="${esc(AURAS[a.k].n)}${on ? '' : '，' + auraWhy(a.k)}">${icHTML(AURAS[a.k].ic)}${on ? '' : '<i class="xx">✕</i>'}</button>`;
          })
          .join(
            ''
          )}<button class="s-o e" data-s="aura:new" aria-label="加光環">＋</button><button class="s-b" data-s="auch">換一個</button><span class="s-sp" tabindex="0" data-tm2="精魂">精魂 ${ST.spiritUsed}／${ST.spirit}</span></div>${SK.as != null ? skRowHTML(5) : ''}`
      : ''
  }</div><i class="csb"><i></i></i>${skFloatHTML()}${
    SK.undo
      ? `<div class="s-u" role="status"><span>已卸下 ${esc(skSupN(SK.undo.k))}</span><button class="s-b" data-s="undo">復原</button></div>`
      : ''
  }`;
}
/* ---------- 懸停浮窗（03 簡易／04 詳細／05 輔助／15 解鎖 II）：右欄內 0,0 476×368，下緣停在第 4 列頂 ---------- */
const skSec = (lab, lead, ...sub) =>
  `<section><small>${lab}</small>${lead ? `<b>${lead}</b>` : ''}${sub
    .filter(Boolean)
    .map(t => (Array.isArray(t) ? `<p class="${t[0]}">${t[1]}</p>` : `<p>${t}</p>`))
    .join('')}</section>`;
function skFloatHTML() {
  const act = SK.alt || SK.pin || SK.ii,
    wrap = (cls, cap, body) =>
      `<div class="s-f ${cls}${act ? ' act' : ''}" role="dialog" aria-label="說明"><small class="cap">${cap}</small><button class="s-fx" data-s="f:x" aria-label="關閉說明">${ICO.x}</button>${body}</div>`;
  if (SK.ii) return wrap('ii', '要確認才執行', skIIHTML(SK.ii));
  const h = (SK.pin || SK.hov || '').split(':'),
    i = +h[1],
    ai = h[0] === 'aura' ? i : skAi(i),
    ii = h[0] === 'aura' ? 5 : i;
  if (SK.ros || !['row', 'hole', 'aura'].includes(h[0]) || !skDef(ii, ai)) return '';
  if (h[0] === 'hole') {
    const o = skHole(ii, ai, +h[2]);
    return o.t === 'f' && !o.x ? wrap('sup', '懸浮時才出現', skSupHTML(ii, ai, +h[2], o.k)) : '';
  }
  const det = !!(SK.alt || SK.pin);
  return wrap(
    det ? 'det' : '',
    det ? (SK.pin ? '點別處或 Esc 關閉' : '按住 Alt／Ｙ 中・放開回簡易') : '懸浮時才出現・按住 Alt／Ｙ 看詳細',
    skSkillHTML(ii, ai, det)
  );
}
/* 這一格插著的第一顆輔助（浮窗「輔助孔」層寫它，「卸下輔助」拿它） */
const skLead = r => r.so.findIndex((k, j) => k && j < soN(r));
function skSkillHTML(i, ai, det) {
  const r = skRec(i, ai),
    D = skDef(i, ai),
    aura = i === 5,
    c = aura ? null : slotCfg(i),
    v = aura ? null : dpsOf(i),
    tags = aura
      ? ['光環']
      : [
          isSpell(D) ? '法術' : '攻擊',
          ...D.tags
            .filter(t => TAGN[t] && !['attack', 'spell', 'elem', 'occ', 'pri', 'cd'].includes(t))
            .map(t => TAGN[t])
        ].slice(0, 4),
    n = soN(r),
    j = skLead(r),
    hole = x => `孔 ${x + 1}${r.so[x] ? '：' + esc(skSupN(r.so[x])) : ' 空'}`;
  let gain = '';
  if (j >= 0 && v != null) {
    const k = r.so[j],
      d =
        v -
        probe(i, () => {
          r.so[j] = null;
          return () => (r.so[j] = k);
        }).v;
    gain = d > 0.5 ? `這顆讓 DPS 多 ${fullN(d)}` : '這顆不加 DPS';
  }
  const holes = n
      ? skSec(
          '輔助孔',
          j >= 0 ? hole(j) : '孔 1 空',
          /* F-1：「這顆讓 DPS 多 n」不截，放不下就折行（.w） */
          det && j >= 0
            ? [
                'w',
                [plainTxt((SUPPORTS[r.so[j]].x && SUPPORTS[r.so[j]].x[0]) || SUPPORTS[r.so[j]].d), gain]
                  .filter(Boolean)
                  .join('・')
              ]
            : [gain, `輔助孔 ${n}／5`].filter(Boolean).join('・'),
          det
            ? Array.from({ length: n }, (_, x) => x)
                .filter(x => x !== j)
                .map(
                  x => hole(x) + (r.so[x] ? '' : x === r.so.findIndex((k, y) => !k && y < n) ? '（點孔挑輔助）' : '')
                )
                .join('・')
            : ''
        )
      : skSec('輔助孔', '還沒有輔助孔', '升長老屋到 Lv2，每一招多 1 個輔助孔。'),
    o = aura ? null : bhSkState(i),
    res = aura
      ? skSec('資源', `保留精魂 ${D.sp}`, ST.auraOn.includes(r.k) ? '生效中' : esc(auraWhy(r.k)))
      : skSec(
          '資源',
          c.mp ? `魔力 ${Math.round(c.mp)}` : '不耗魔力',
          o.kind === 'gren'
            ? `儲存 ${o.max} 顆，每顆各冷卻 ${+o.cdT.toFixed(1)} 秒`
            : o.kind === 'ammo' || o.kind === 'rl'
              ? `彈匣 ${o.max} 發，打完裝填 ${+o.rlT.toFixed(1)} 秒`
              : c.cd
                ? `冷卻 ${+c.cd.toFixed(1)} 秒`
                : freqTxt(c)
        ),
    L = det ? skLines(aura ? { aura: 1, D } : c).map(plainTxt) : [],
    up = libUpCheck(r.k),
    lack = up.c - MAT().soul,
    emp = r.so.findIndex((k, x) => !k && x < n);
  return `${skSec('身分', esc(D.n), tags.join('・'))}${skSec('等級', `等級 ${libLv(r.k)}${aura ? '' : `　DPS ${v != null ? fullN(v) : '—'}`}`)}${
    det ? skSec('說明', L[0] || plainTxt(D.d), L.slice(1, 4).join('・')) : res
  }${holes}<section class="op"><small>操作</small>${
    det
      ? `<div><button class="s-b" data-s="f:unplug:${i}:${j}" ${j < 0 ? 'disabled' : ''}>卸下輔助</button><button class="s-b" data-s="f:up:${r.k}" ${up.why ? 'disabled' : ''}>${
          libLv(r.k) >= GEM_MAX
            ? '滿級'
            : up.why
              ? lack > 0
                ? `缺靈魂 ${fullN(lack)}`
                : esc(gemShort(up.why))
              : `升級 ${fullN(up.c)} 靈魂`
        }</button><button class="s-b pri" data-s="f:ins:${i}:${emp}" ${emp < 0 ? 'disabled' : ''}>插上輔助</button></div>`
      : '<p>點孔挑輔助　把輔助拖到輔助孔　按住 Alt／Ｙ 看詳細</p>'
  }</section>`;
}
/* 解鎖 II 的兩個條件（兩個都要）：鍛造台 Lv20、15,000 靈魂 */
const skIICond = () => [campCan('sup2'), MAT().soul >= SUP2_COST];
function skSupHTML(i, ai, j, k) {
  const U = SUPPORTS[k],
    b = supBase(k),
    k2 = sup2Of(b),
    lock = k2 && sup2Lock(k2),
    x = U.x && U.x.length ? U.x : [U.d];
  return `${skSec('身分', esc(SUPPORTS[b].n), k2 ? `階　I${k === b ? '（現在）' : ''}　II${k === k2 ? '（現在）' : lock ? '（鎖）' : ''}` : '')}${skSec(
    '效果',
    plainTxt(x[0]),
    U.need && U.need.length ? `需要技能有${U.need.map(t => TAGN[t] || t).join('、')}` : plainTxt(x[1] || '')
  )}${skSec('位置', `插在：${esc(skDef(i, ai).n)} 孔 ${j + 1}`)}<section class="op"><small>操作</small><p>卸下輔助${
    lock ? `　長按解鎖 II　需要：鍛造台 Lv20 ＋ ${fullN(SUP2_COST)} 靈魂` : ''
  }</p><div><button class="s-b" data-s="f:unplug:${i}:${j}">卸下輔助</button>${
    lock ? `<button class="s-b pri w" data-s="f:ii:${k2}">長按解鎖 II</button>` : ''
  }</div></section>`;
}
function skIIHTML(k2) {
  const U = SUPPORTS[k2],
    x = U.x && U.x.length ? U.x : [U.d],
    [f, s] = skIICond(),
    /* 切成 II 差多少：量得到（這顆插在某一招上）才寫 */
    at = S.skills.findIndex(r => r.k && r.so.some((k, j) => j < soN(r) && supBase(k) === U.base)),
    d =
      at >= 0
        ? supProbe(
            at,
            S.skills[at].so.findIndex(k => supBase(k) === U.base),
            k2
          ).v - dpsOf(at)
        : 0;
  return `${skSec('身分', esc(skSupN(k2)), '現在是 I，解鎖後變成 II')}${skSec(
    '效果',
    plainTxt(x[0]),
    [plainTxt(x[1] || ''), d > 0.5 ? `▲ DPS +${fullN(d)}（切成 II 後）` : ''].filter(Boolean).join('　')
  )}<section><small>條件</small><b>需要（兩個都要）</b><p class="cd${f ? '' : ' c-bad'}">鍛造台 Lv20<i>${f ? '✓' : '✗'}</i></p><p class="cd${s ? '' : ' c-bad'}">${fullN(SUP2_COST)} 靈魂（現有 ${fullN(MAT().soul)}）<i>${s ? '✓' : '✗'}</i></p></section><section class="op"><div><button class="s-b w hold" data-s="f:iigo" ${f && s ? '' : 'disabled'}>長按解鎖</button><button class="s-b pri" data-s="f:iix">取消</button></div></section>`;
}
/* ---------- 名冊（左側抽屜）：13／07 點選後按主鈕（list），17／18 拖放（grid） ---------- */
const SK_FS = ['全部', '已裝備', '攻擊', '法術', '光環'];
/* 名冊這一頁的東西：{ k, D, aura, why, d, key（裝在第幾格，-1＝沒裝）, eq, tabs } */
function skRosList() {
  const R = SK.ros;
  if (R.tab === 'sups') {
    const P = skRows('sups', R.i, R.ai, R.hole),
      r = skRec(R.i, R.ai),
      best = P.L.find(x => !x.why && x.d > 0.5);
    return {
      P,
      L: P.L.map(x => ({ ...x, eq: r.so.some(k => supBase(k) === x.k), best: x === best })).sort((a, b) => b.eq - a.eq)
    };
  }
  const i = R.i === 5 ? 0 : R.i,
    P = skRows('skills', i, 0, null),
    A = campCan('aura') ? skRows('auras', 5, R.i === 5 ? R.ai : S.auras.findIndex(x => !x), null).L : [],
    L = [
      ...P.L.map(x => ({ ...x, eq: x.key >= 0 })),
      ...A.map(x => ({ ...x, aura: 1, key: -1, eq: S.auras.some(a => a && a.k === x.k) }))
    ];
  return { P, L: L.sort((a, b) => b.eq - a.eq || (a.eq ? a.key - b.key : 0)) };
}
const skRosTabs = () =>
  /* 輔助照 07／18 的五顆：推薦、元素、範圍、異常、全部（其他分類在「全部」裡） */
  SK.ros.tab === 'sups' ? ['推薦', '元素', '範圍', '異常', '全部'] : SK_FS.filter(f => f !== '光環' || campCan('aura'));
function skRosShow() {
  const R = SK.ros,
    { P, L } = skRosList(),
    tabs = skRosTabs();
  let f = tabs.includes(SK.f[R.tab]) ? SK.f[R.tab] : R.tab === 'sups' && R.mode === 'list' ? '推薦' : '全部';
  const rec = x => !x.why && ((x.d != null && x.d > 0.5) || !!x.fx);
  if (f === '推薦' && !L.some(rec)) f = '全部';
  const show = L.filter(x =>
    f === '全部'
      ? true
      : R.tab === 'sups'
        ? f === '推薦'
          ? rec(x)
          : x.tabs.includes(f === '範圍' ? '範圍與近戰' : f)
        : f === '已裝備'
          ? x.eq
          : f === '光環'
            ? x.aura
            : !x.aura && (f === '法術') === isSpell(x.D)
  );
  return { P, L, tabs, f, show };
}
/* 選中的那顆照 I／II 是哪個鍵（II 沒解鎖只能看） */
const skTierK = k => {
  const k2 = SK.ros.tab === 'sups' && sup2Of(k);
  return k2 && (SK.tier === 2 || !SUPPORTS[k]) ? k2 : k;
};
function skRosHTML() {
  const R = SK.ros,
    { P, L, tabs, f, show } = skRosShow(),
    sups = R.tab === 'sups',
    D = skDef(R.i, R.ai),
    grid = R.mode === 'grid';
  if (!show.some(x => x.k === SK.pick)) SK.pick = null;
  const sel = L.find(x => x.k === SK.pick),
    seg = x => {
      const k2 = sup2Of(x.k);
      if (!k2) return '';
      const lock = sup2Lock(k2);
      return `<span class="p-t"><button class="${SK.tier === 2 ? '' : 'on'}" data-s="tier:1" aria-pressed="${SK.tier !== 2}">I</button>｜<button class="${SK.tier === 2 ? 'on' : ''}" data-s="tier:2" aria-pressed="${SK.tier === 2}">II</button>${lock ? `（鎖・鍛造台 Lv20＋${fullN(SUP2_COST)} 靈魂）` : ''}</span>`;
    },
    attr = x => {
      if (x.aura) return `精魂 ${x.D.sp}`;
      const L2 = [];
      if (x.D.ammo) L2.push(`彈匣 ${clipOf(x.D)}/${clipOf(x.D)}`);
      if (x.D.gren)
        L2.push(
          `儲存 ${x.D.gren[0] + ST.grenUse}/${x.D.gren[0] + ST.grenUse}`,
          `冷卻 ${+(x.D.gren[1] / (1 + ST.grenCd / 100)).toFixed(1)} 秒`
        );
      if (x.D.cd) L2.push(`冷卻 ${+x.D.cd.toFixed(1)} 秒`);
      return L2.join('　');
    },
    up = x =>
      x.d != null && x.d > 0.5 ? `▲ DPS +${fullN(x.d)}${P.base ? `（${Math.round((x.d / P.base) * 100)}%）` : ''}` : '',
    /* 不能用的原因（定稿短句） */
    why = x => (/同分類/.test(x.why) ? '已有同分類' : /才能用/.test(x.why) ? '這把武器不能用' : x.why),
    row = x => {
      const on = x === sel,
        nm = esc(x.D.n) + (sups && sup2Of(x.k) ? `　${on && SK.tier === 2 ? 'II' : 'I'}` : '');
      /* 列裡面有 I｜II 鈕，所以列本身不是 button */
      return `<div class="p-r${on ? ' on' : ''}${x.why ? ' dim' : ''}" data-s="pk:${x.k}" role="button" tabindex="0" aria-pressed="${on}">${icHTML(x.D.ic)}<b>${nm}</b><span>${
        x.why ? `✕ ${esc(why(x))}` : sups ? `${up(x)}${x.best ? '　最好' : ''}` : on ? '' : attr(x)
      }</span>${
        on
          ? `<small>${sups ? plainTxt(x.D.d) : `${x.aura ? '光環' : isSpell(x.D) ? '法術' : '攻擊'}${x.D.tags.includes('proj') ? '・投射物' : ''}　${attr(x)}`}</small>${sups ? seg(x) : ''}`
          : ''
      }</div>`;
    },
    cell = x =>
      `<button class="p-c${x === sel ? ' on' : ''}${x.why ? ' no' : sups ? ' ok' : ''}" data-s="pk:${x.k}" aria-pressed="${x === sel}" aria-label="${esc(x.D.n)}${x.why ? '，' + esc(why(x)) : ''}">${
        !sups && x.key >= 0 ? `<i class="nm">${x.key + 1}</i>` : ''
      }${sups && sup2Of(x.k) && !sup2Lock(sup2Of(x.k)) ? '<i class="nm">II</i>' : ''}${x.why ? '<i class="xx">✕</i>' : ''}${
        /* 沒有圖的先放佔位格（佔位素材清單） */
        ICONS[x.D.ic] || (typeof ART !== 'undefined' && ART[x.D.ic])
          ? icHTML(x.D.ic)
          : '<span class="ic ph">佔位</span>'
      }<span>${esc(x.D.n)}</span></button>`,
    kk = sel && skTierK(sel.k),
    main = sups
      ? sel
        ? sel.why
          ? `<button class="s-b pri" disabled>${esc(why(sel))}</button>`
          : sup2Lock(kk)
            ? `<button class="s-b pri" data-s="f:ii:${kk}">解鎖 II：${esc(sel.D.n)}</button>`
            : `<button class="s-b pri" data-s="put">插上輔助：${esc(sel.D.n)}</button>`
        : '<button class="s-b pri" disabled>先點上面一列</button>'
      : sel
        ? sel.why
          ? `<button class="s-b pri" disabled>${esc(why(sel))}</button>`
          : `<button class="s-b pri" data-s="put">${sel.aura ? '放進光環欄' : `放進第 ${R.i + 1} 格`}：${esc(sel.D.n)}</button>`
        : '<button class="s-b pri" disabled>先點上面一列</button>',
    sub = sups
      ? grid
        ? `<p>對準：${esc(D.n)}　輔助・${Object.keys(SUPPORTS).filter(k => SUPPORTS[k].tier !== 2 && (!SUPPORTS[k].aw || awHave(k))).length} 個</p>`
        : `<p>對準：${esc(D.n)}・孔 ${R.hole + 1}</p><p>現在 DPS ${P.base != null ? fullN(P.base) : '—'}</p>`
      : grid
        ? `<p>${WTN[ST.wt] || '空手'}能用 ${P.L.length} 招</p>`
        : R.i === 5
          ? '<p>放到光環欄</p><p>光環開著就一直生效，佔住精魂</p>'
          : `<p>放到第 ${R.i + 1} 格</p><p>快捷鍵隨格子走：第 ${R.i + 1} 格是${SLOTKEY[R.i]}</p>`;
  return `<div class="p-hd"><b>名冊</b></div>${['skills', 'sups']
    .map(
      (t, n) =>
        `<button class="s-b p-tab${n ? ' r' : ''}${R.tab === t ? ' on' : ''}" data-s="tab:${t}" aria-pressed="${R.tab === t}">${n ? '輔助' : '技能'}</button>`
    )
    .join('')}<button class="s-x" data-s="rosx" aria-label="關閉名冊">${ICO.x}<kbd>Esc</kbd></button>
  <div class="p-sub">${sub}</div><div class="p-b${grid ? ' grid' : sups ? '' : ' nf'}"><div class="p-f" role="group" aria-label="篩選">${
    /* 13 挑技能（對準一格）沒有篩選列；手把 LB／RB 照樣能換 */
    grid || sups
      ? tabs
          .map(
            t => `<button class="s-b${t === f ? ' on' : ''}" data-s="fl:${t}" aria-pressed="${t === f}">${t}</button>`
          )
          .join('')
      : ''
  }</div><div class="p-l" data-sb>${
    show.length ? show.map(grid ? cell : row).join('') : '<p class="p-e">這裡沒有東西。</p>'
  }</div></div><i class="csb"><i></i></i>${
    grid
      ? `<p class="p-ft">${sups ? '可插加框　不可插變淡✕　拖到右邊的孔' : '拖到右邊的格子・Esc 關閉'}</p>`
      : `<div class="p-m">${main}</div>`
  }`;
}
/* ---------- 重畫 ---------- */
const skEl = id => {
  let e = $(id);
  if (!e) {
    e = document.body.appendChild(document.createElement('div'));
    e.id = id;
    e.hidden = true;
    if (id === 'pros') (e.className = 'panel'), e.setAttribute('role', 'dialog'), e.setAttribute('aria-label', '名冊');
    else if (id === 'sku') (e.className = 's12'), e.setAttribute('role', 'status');
    else e.setAttribute('role', id === 'skh' ? 'status' : 'tooltip');
  }
  return e;
};
/* 重畫一塊：焦點留在同一顆（戰鬥中會一直重畫） */
function skPaint(p, html) {
  const f = document.activeElement,
    s = p.contains(f) && f.dataset && f.dataset.s,
    L = p.querySelector('[data-sb]'),
    y = L ? L.scrollTop : 0;
  p.innerHTML = html;
  const L2 = p.querySelector('[data-sb]');
  if (L2 && y) L2.scrollTop = y;
  const n = s && p.querySelector(`[data-s="${CSS.escape(s)}"]`);
  if (n) n.focus({ preventScroll: true });
  skSb(p);
}
/* 自繪 4 px 捲動條（同角色頁 L-10） */
function skSb(p) {
  const el = p.querySelector('[data-sb]'),
    t = p.querySelector(':scope > .csb');
  if (!el || !t) return;
  const ch = el.clientHeight,
    sh = el.scrollHeight,
    on = sh > ch + 1;
  t.hidden = !on;
  if (!on) return;
  const H = t.clientHeight,
    th = Math.max(16, Math.round((H * ch) / sh));
  t.firstChild.style.height = th + 'px';
  t.firstChild.style.transform = `translateY(${Math.round(((H - th) * el.scrollTop) / (sh - ch))}px)`;
}
function sk12Render() {
  if (SK.busy) return;
  skPaint($('pskill'), sk12HTML());
  if (SK.fb && !SK.ros) {
    const n = $('pskill').querySelector(`[data-s="${CSS.escape(SK.fb)}"]`);
    if (n && SK.kb) n.focus({ preventScroll: true });
    SK.fb = null;
  }
  skRosSync();
  skSide();
}
function skRosSync() {
  const p = skEl('pros');
  if (SK.ros && !skDef(SK.ros.i, SK.ros.ai) && SK.ros.tab === 'sups') SK.ros = null;
  p.hidden = !(SK.ros && PANEL.skill && sk12On());
  if (p.hidden) return;
  /* 剛開、換分頁、換篩選：清單回到最上面 */
  if (SK.rt && p.querySelector('[data-sb]')) p.querySelector('[data-sb]').scrollTop = 0;
  SK.rt = 0;
  skPaint(p, skRosHTML());
  skRosFit(p);
  if (SK.rf)
    (
      p.querySelector('.p-r.on, .p-c.on') ||
      p.querySelector('.p-r:not(.dim), .p-c:not(.no)') ||
      p.querySelector('[data-s]')
    ).focus();
  SK.rf = 0;
}
/* F-6：點選清單（07／13）的捲動區下緣停在最後一列完整看得到的地方（≤ 主鈕上緣 508），不留半列被切；捲到底最後一列完整 */
function skRosFit(p) {
  const L = p.querySelector('.p-b:not(.grid) > .p-l');
  if (!L) return;
  L.style.flex = '';
  const a = L.getBoundingClientRect();
  let b = a.top;
  for (const r of L.children) {
    const q = r.getBoundingClientRect();
    if (q.bottom <= a.bottom + 0.5) b = Math.max(b, q.bottom);
    else break;
  }
  if (b > a.top && b < a.bottom - 0.5) L.style.flex = `0 0 ${Math.floor(b - a.top)}px`;
  skSb(p);
}
/* 浮窗只換自己（不重畫整個面板） */
function skFloat() {
  const p = $('pskill'),
    o = p.querySelector('.s-f'),
    h = skFloatHTML();
  if (o) h ? (o.outerHTML = h) : o.remove();
  else if (h) p.insertAdjacentHTML('beforeend', h);
  skSide();
}
/* 戰場側的東西（右欄左邊，右緣 780）：更換圖示的「更換技能」、孔的全名、09–11 孔說明卡；底下的提示列 */
function skSide() {
  const t = skEl('skt'),
    c = skEl('skc'),
    hint = skEl('skh'),
    on = PANEL.skill && sk12On(),
    h = on && !SK.busy && !SK.ii ? (SK.hov || '').split(':') : [],
    el = h[0] && $('pskill').querySelector(`[data-h="${SK.hov}"]`),
    r = el && el.getBoundingClientRect(),
    x = $('pskill').getBoundingClientRect().left - 8;
  let tip = '',
    card = '';
  if (el && h[0] === 'sw') tip = '更換技能';
  else if (el && (h[0] === 'hole' || h[0] === 'aura')) {
    const i = h[0] === 'aura' ? 5 : +h[1],
      ai = h[0] === 'aura' ? +h[1] : skAi(i),
      o = h[0] === 'aura' ? { t: 'a' } : skHole(i, ai, +h[2]),
      rec = skRec(i, ai);
    if (o.t === 'a') tip = AURAS[rec.k].n;
    else if (o.t === 'f' && !o.x) tip = skSupN(o.k);
    else if (o.t === 'f') {
      const g = recGem(rec, S.lib);
      card = `<b>${esc(skSupN(o.k))}　沒有效果</b><p>${
        sup2Lock(o.k)
          ? 'II 還沒解鎖，沒有效果。'
          : supDup(g, g.sup[+h[2]])
            ? `這${i === 5 ? '個光環' : '招'}已經有同分類的輔助，沒有效果。`
            : `跟這${i === 5 ? '個光環' : '招'}不相容，沒有效果。`
      }</p>`;
    } else if (o.t === 'e')
      card = '<b>空著的輔助孔</b><p>點這裡插一顆輔助。輔助不會掉落，目錄裡的都能用；同一類只能插一顆。</p>';
    else if (o.t === 'dr')
      card = `<b>還沒打開的輔助孔</b><p>點一下花 ${fullN(o.c.c, 'cost')} 靈魂打開這一孔。${o.c.why ? `<span class="c-bad">${esc(o.c.why)}</span>` : ''}</p>`;
    else card = `<b>還不能用的輔助孔</b><p>這一孔要長老屋 Lv${o.lv} 才生效。</p>`;
  }
  /* 名冊開著時戰場只剩 296：說明卡不出（名冊自己寫原因） */
  if (SK.ros) card = '';
  t.hidden = !tip;
  if (tip) {
    t.textContent = tip;
    t.style.left = x - t.offsetWidth + 'px';
    t.style.top = Math.round(h[0] === 'sw' ? r.top : r.top - 14) + 'px';
  }
  c.hidden = !card;
  if (card) {
    c.innerHTML = card;
    c.style.left = x - 360 + 'px';
    c.style.top = Math.max(84, Math.min(IH - 158 - c.offsetHeight - 8, Math.round(r.top - 32))) + 'px';
  }
  hint.hidden = !on;
  if (on) hint.textContent = skHint();
  skUndoSide(on);
}
/* F-2：復原列在列下方會碰到列或孔（4 列以上）就搬到戰場（右欄左邊、右緣 780、不透明底），不壓孔、不壓提示列 */
function skUndoSide(on) {
  const u = skEl('sku'),
    P = $('pskill'),
    pu = P.querySelector(':scope > .s-u');
  if (!on || !SK.undo) return void ((u.hidden = true), u.replaceChildren(), pu && pu.remove());
  if (!pu) return;
  const a = pu.getBoundingClientRect(),
    Lr = P.querySelector('.s-l').getBoundingClientRect(),
    hit = [...P.querySelectorAll('.s-l .s-r, .s-l [data-s]')].some(e => {
      const r = e.getBoundingClientRect(),
        t = Math.max(r.top, Lr.top),
        b = Math.min(r.bottom, Lr.bottom);
      return b > t && r.left < a.right && r.right > a.left && t < a.bottom && b > a.top;
    });
  if (!hit) return void ((u.hidden = true), u.replaceChildren());
  /* 焦點在戰場那一顆「復原」上：留著舊的，不換掉（換掉焦點會掉） */
  if (!u.contains(document.activeElement) || u.hidden) u.replaceChildren(...pu.childNodes);
  pu.remove();
  u.hidden = false;
  u.style.left = Math.round(P.getBoundingClientRect().left - 8 - u.offsetWidth) + 'px';
  u.style.top = Math.round(a.top) + 'px';
}
/* 提示列：現在能做什麼（手把焦點在技能格上時寫「更換技能」，跟名冊鈕同一個操作） */
function skHint() {
  const f = document.activeElement,
    s = (SK.kb && f && f.dataset && f.dataset.s) || '';
  if (SK.ii) return '解鎖 II 要確認：長按「解鎖」才執行　Ⓑ／Esc 取消';
  if (SK.undo) return '卸下不必確認，立刻生效。3 秒內可按「復原」';
  if (SK.ros)
    return SK.ros.mode === 'grid'
      ? SK.ros.tab === 'sups'
        ? '把輔助拖到右邊的孔，或點一顆再點孔　Esc／Ⓑ 關閉'
        : '把一招拖到右邊的格子，或點一招再點格子　Esc／Ⓑ 關閉'
      : SK.ros.tab === 'sups'
        ? 'Enter／Ⓐ 插上輔助　[ ] 切階　LB／RB 換篩選　Esc／Ⓑ 關閉名冊'
        : 'Enter／Ⓐ 放進此格　LB／RB 換篩選　Esc／Ⓑ 關閉名冊';
  if (SK.sel != null) return '選中後 ↑↓ 換序　Enter／Ⓐ 放下';
  if (s.startsWith('row:')) return '更換技能：Enter／Ⓐ 開名冊　Ｙ／Alt 看詳細　← 把手可換序';
  if (s.startsWith('hole:')) return 'Enter／Ⓐ 開孔挑輔助　Ｘ／Del 卸下輔助　Ⓑ／G 關';
  if (SK.pin) return '點別處或 Esc 關閉說明';
  return '方向鍵移格　Ⓐ 開孔／開名冊　Ｘ 卸下輔助　Ｙ 看詳細　Ⓑ／G 關';
}
/* 名詞提示（14）：停留 0.4 秒或手把 R3；戰場側、帽「名詞提示　停留 0.4 秒／手把 Ｒ3」 */
let SKN_T = 0,
  SKN_K = null;
function skTermShow(el) {
  const t = skEl('skn'),
    k = el.dataset.tm2;
  t.innerHTML = `<b>${esc(k)}</b><p>${esc(SK_TERM[k] || TERMS[k] || '')}</p><small>名詞提示　停留 0.4 秒／手把 Ｒ3</small>`;
  t.hidden = false;
  const r = el.getBoundingClientRect();
  t.style.left = $('pskill').getBoundingClientRect().left - 8 - t.offsetWidth + 'px';
  t.style.top = Math.max(84, Math.min(IH - 158 - t.offsetHeight - 8, Math.round(r.top - t.offsetHeight / 2))) + 'px';
}
function skTermHide() {
  clearTimeout(SKN_T);
  SKN_K = null;
  if ($('skn')) $('skn').hidden = true;
}
/* ---------- 動作 ---------- */
/* 開名冊：tab 技能｜輔助；mode list＝對準一格（點選後按主鈕）、grid＝拖放 */
function skRos(tab, mode, i, ai, hole) {
  /* 用鍵盤／手把開的：焦點進名冊，關了回到原本那一顆 */
  const f = document.activeElement;
  if (!SK.ros) SK.back = SK.kb && f && f.dataset ? f.dataset.s : null;
  SK.ros = { tab, mode, i, ai: ai || 0, hole: hole ?? null };
  SK.rt = 1;
  SK.rf = SK.kb;
  SK.pick = SK.pin = SK.ii = null;
  SK.hov = null;
  const cur = tab === 'sups' && hole != null && skRec(i, ai) && skRec(i, ai).so[hole];
  SK.tier = cur && SUPPORTS[cur].tier === 2 ? 2 : 1;
  if (tab === 'skills' && mode === 'list') SK.f.skills = i === 5 ? '光環' : '全部';
  if (mode === 'list' && cur) SK.pick = supBase(cur);
}
function skRosClose() {
  SK.ros = SK.pick = null;
  SK.fb = SK.back;
}
/* 打開技能分頁：回到乾淨的總覽 */
const sk12Reset = () => Object.assign(SK, { ros: null, pick: null, hov: null, pin: null, sel: null, ii: null, alt: 0 });
/* 名冊「輔助」分頁要對準一招：選中的光環、選中的格，不然第一招 */
function skRosTab(tab) {
  const R = SK.ros;
  if (tab === 'skills') return skRos('skills', R.mode === 'list' && R.hole == null ? 'list' : 'grid', R.i, R.ai);
  const i = skDef(R.i, R.ai) ? R.i : S.skills.findIndex((r, x) => r.k && x < campN('slots'));
  if (i < 0) return hudWarn('先放一招');
  if (!campN('holes')) return hudWarn('升長老屋到 Lv2 才有輔助孔');
  skRos(
    'sups',
    'grid',
    i,
    i === 5 ? R.ai : 0,
    skRec(i, R.ai).so.findIndex((k, j) => !k && j < soN(skRec(i, R.ai)))
  );
  if (SK.ros.hole < 0) SK.ros.hole = 0;
}
/* 把名冊的 k 放進去：技能進第 i 格（已經裝在別格＝互換）、光環進光環欄、輔助進孔 */
function skPutAt(k, i, ai, hole) {
  if (SUPPORTS[k]) {
    const r = skRec(i, ai);
    if (!r || !r.k || hole == null || hole >= soN(r)) return hudWarn('這一孔還不能用');
    const w = skWith('sups', i, ai, hole, c => supWhy(c, k, hole));
    if (w !== '') return hudWarn(w || '跟這招不相容，沒有效果');
    r.so[hole] = k;
  } else if (AURAS[k]) {
    if (!campCan('aura')) return hudWarn('升長老屋到 Lv5 才開光環欄');
    const j = i === 5 && S.auras[ai] ? ai : S.auras.findIndex(x => !x);
    if (S.auras.some((x, n) => x && x.k === k && n !== j)) return hudWarn('已經在光環欄裡');
    if (S.auras[j]) S.auras[j].k = k;
    else S.auras[j < 0 ? S.auras.length : j] = { k, so: [null, null], n: 2 };
  } else {
    if (i === 5 || i >= campN('slots')) return hudWarn('這一格還沒開');
    const why = skWhy(SKILLS[k]);
    if (why) return hudWarn(why);
    const j = S.skills.findIndex(s => s.k === k);
    if (j >= 0 && j !== i) S.skills[j].k = S.skills[i].k;
    S.skills[i].k = k;
  }
  /* 放好後名冊自動關 */
  skRosClose();
  sfx('equip');
  changed();
  return true;
}
function skUnplug(i, ai, j) {
  const r = skRec(i, ai),
    k = r && r.so[j];
  if (!k) return;
  r.so[j] = null;
  clearTimeout(SK.undo && SK.undo.t);
  /* 卸下不用確認；3 秒內可復原（K11 A） */
  SK.undo = { i, ai, j, k, rec: r, t: setTimeout(() => ((SK.undo = null), hudPanels()), 3000) };
  SK.pin = null;
  if ((SK.hov || '').startsWith('hole:')) SK.hov = null;
  sfx('click');
  changed();
}
function skUndo() {
  const u = SK.undo;
  if (!u) return;
  clearTimeout(u.t);
  SK.undo = null;
  if (!u.rec.so[u.j]) u.rec.so[u.j] = u.k;
  sfx('equip');
  changed();
}
/* 換序：第 a 格搬到第 b 格（一格一格換過去；技能、孔、輔助、冷卻一起走） */
function skMove(a, b) {
  b = Math.max(0, Math.min(campN('slots') - 1, b));
  if (a === b) return a;
  for (let s = a; s !== b; s += b > a ? 1 : -1) skSwap(s, s + (b > a ? 1 : -1));
  sfx('click');
  return b;
}
function sk12Act(s, el) {
  const [k, a, b, c] = s.split(':'),
    R = SK.ros,
    /* 名冊拖放頁點了一顆，再點右邊的格子／孔＝放進去（點一下再點） */
    hand = R && R.mode === 'grid' && SK.pick ? skTierK(SK.pick) : null;
  hideTip();
  if (k === 'ros')
    R
      ? skRosClose()
      : skRos(
          'skills',
          'grid',
          SK.sel ??
            Math.max(
              0,
              S.skills.findIndex(r => r.k)
            ),
          0
        );
  else if (k === 'rosx') skRosClose();
  else if (k === 'tab') {
    if (R.tab !== a) skRosTab(a);
  } else if (k === 'fl') (SK.f[R.tab] = a), (SK.rt = 1);
  else if (k === 'pk') {
    SK.pick = SK.pick === a && R.mode === 'grid' ? null : a;
    const k2 = sup2Of(a);
    SK.tier = k2 && !sup2Lock(k2) ? 2 : 1;
  } else if (k === 'tier') SK.tier = +a;
  else if (k === 'put') return void (SK.pick && skPutAt(skTierK(SK.pick), R.i, R.ai, R.hole));
  else if (k === 'row' || k === 'slot') {
    if (hand && !SUPPORTS[hand]) return void skPutAt(hand, +a, skAi(+a), null);
    if (k === 'slot') skRos('skills', 'list', +a, 0);
    else if (!R) (SK.pin = SK.pin === s ? null : s), (SK.hov = s);
  } else if (k === 'sw') skRos('skills', 'list', +a, 0);
  else if (k === 'hole') {
    const i = +a,
      ai = skAi(i),
      j = +b,
      h = skHole(i, ai, j);
    if (hand && SUPPORTS[hand] && (h.t === 'f' || h.t === 'e')) return void skPutAt(hand, i, ai, j);
    if (h.t === 'lk') return hudWarn(`這一孔要長老屋 Lv${h.lv} 才生效。`);
    if (h.t === 'dr') {
      if (h.c.c >= MAT().soul * 0.5 && holdAsk(el, '開孔', `花 ${fullN(h.c.c, 'cost')} 靈魂`)) return;
      const err = drillDo(skRec(i, ai));
      if (err) return hudWarn(err);
      sfx('equip');
      return changed();
    }
    skRos('sups', 'list', i, ai, j);
  } else if (k === 'grip') SK.sel = SK.sel === +a ? null : +a;
  else if (k === 'aura') {
    if (a === 'new')
      skRos(
        'skills',
        'list',
        5,
        S.auras.findIndex(x => !x)
      );
    else if (hand && AURAS[hand]) return void skPutAt(hand, 5, +a, null);
    else SK.as = SK.as === +a ? null : +a;
  } else if (k === 'auch') skRos('skills', 'list', 5, SK.as ?? Math.max(0, S.auras.findIndex(Boolean)));
  else if (k === 'undo') return skUndo();
  else if (k === 'f') {
    if (a === 'x') SK.pin = SK.hov = SK.ii = null;
    else if (a === 'unplug') return skUnplug(+b, skAi(+b), +c);
    else if (a === 'up') return void skUp(b);
    else if (a === 'ins') skRos('sups', 'list', +b, skAi(+b), +c);
    else if (a === 'ii') SK.ii = b;
    else if (a === 'iix') SK.ii = null;
    else if (a === 'iigo') return;
  }
  sfx('click');
  hudPanels();
}
/* 解鎖 II：長按 600 毫秒才執行（15） */
function skIIGo() {
  const k2 = SK.ii,
    err = sup2Unlock(k2);
  SK.busy = 0;
  if (err) return hudWarn(err), hudPanels();
  sfx('lvup');
  SK.ii = null;
  /* 插著的 I 直接換成 II（解鎖後每個孔自由選） */
  for (const r of [...S.skills, ...S.auras])
    if (r && r.so) r.so.forEach((k, j) => k === SUPPORTS[k2].base && (r.so[j] = k2));
  if (SK.ros) SK.tier = 2;
  changed();
}
function skHoldStart(el) {
  if (!el || el.disabled) return;
  SK.busy = 1;
  el.classList.add('go');
  SK.ht = setTimeout(skIIGo, 600);
}
function skHoldStop() {
  if (!SK.ht) return;
  clearTimeout(SK.ht);
  SK.ht = 0;
  SK.busy = 0;
  const b = document.querySelector('#pskill .hold.go');
  if (b) b.classList.remove('go');
}
/* 懸停（0 秒）：浮窗跟著游標底下的東西；按住 Alt／點了技能列／確認窗開著時不換 */
function skHov(v) {
  if (SK.alt || SK.pin || SK.ii || SK.busy || SK.hov === v) return;
  SK.hov = v;
  skFloat();
}
function skAlt(v) {
  if (SK.alt === v) return;
  SK.alt = v;
  skFloat();
}
/* 移焦點照行列走：同一個技能列（把手、列、更換圖示、孔）是一行，其他的照上下位置重疊分行。
   左右＝同一行的前後一個；上下＝上下一行同一種東西（列→列、孔 j→孔 j、把手→把手），沒有就找左右最近的。
   名冊開著、焦點在名冊裡就在名冊裡走；確認窗開著只在確認窗裡走 */
function skFocusMove(dx, dy) {
  const f = document.activeElement,
    ros = skEl('pros'),
    box = SK.ros && !$('pskill').contains(f) ? ros : $('pskill'),
    L = [
      ...box.querySelectorAll('[data-s]:not([disabled]), [data-tm2]'),
      ...(box === ros || skEl('sku').hidden ? [] : skEl('sku').querySelectorAll('[data-s]'))
    ].filter(e => (SK.ii ? e.closest('.s-f') : !e.closest('.s-f') || SK.pin || SK.alt));
  if (!L.length) return;
  SK.kb = 1;
  $('pskill').classList.add('kb'), ros.classList.add('kb');
  if (!L.includes(f)) return L[0].focus();
  const unit = e => e.closest('.s-r') || e,
    rc = e => e.getBoundingClientRect(),
    /* 一行裡的左右位置：列本身排在把手後面；孔在第 3 行，排在更換圖示後面 */
    x = e => rc(e).left + (e.classList.contains('s-r') && e.tagName === 'DIV' ? 21 : e.closest('.s-h') ? 30 : 0),
    sig = e => (e.dataset.s || '').replace(/^(\w+):\d+/, '$1'),
    lines = [];
  let bot = -1e9;
  for (const u of [...new Set(L.map(unit))].sort((a, b) => rc(a).top - rc(b).top)) {
    if (rc(u).top >= bot - 4) lines.push([]);
    lines[lines.length - 1].push(u);
    bot = Math.max(bot, rc(u).bottom);
  }
  const rows = lines.map(us => L.filter(e => us.includes(unit(e))).sort((a, b) => x(a) - x(b))),
    li = rows.findIndex(r => r.includes(f));
  let to;
  if (dx) to = rows[li][rows[li].indexOf(f) + dx];
  else {
    const r = rows[li + dy];
    /* F-7：從列外（名冊鈕、關閉）走進技能列，先停在技能列本體（提示列「更換技能」），再往右進孔 */
    to =
      r &&
      (r.find(e => sig(e) === sig(f)) ||
        (!f.closest('.s-r') && r.find(e => sig(e) === 'row')) ||
        r.reduce((m, e) => (Math.abs(x(e) - x(f)) < Math.abs(x(m) - x(f)) ? e : m)));
  }
  if (to) to.focus(), to.scrollIntoView({ block: 'nearest' });
}
/* 方向：選中要換序的格時 ↑↓ 搬整列，不然移焦點 */
function skDir(dx, dy) {
  if (SK.sel != null && !SK.ros) {
    if (!dy) return;
    SK.sel = skMove(SK.sel, SK.sel + dy);
    changed();
    const g = $('pskill').querySelector(`[data-s="grip:${SK.sel}"]`);
    if (g) g.focus(), g.scrollIntoView({ block: 'nearest' });
    return;
  }
  skFocusMove(dx, dy);
}
/* 確認（Enter／Ⓐ）：名冊的一列＝直接放進去；其他＝點它 */
function skOk(el) {
  const s = el && el.dataset && el.dataset.s;
  if (!s || el.disabled) return;
  if (s.startsWith('pk:') && SK.ros.mode === 'list') {
    const k = s.slice(3),
      k2 = SK.ros.tab === 'sups' && sup2Of(k);
    SK.pick = k;
    return void skPutAt(k2 && !sup2Lock(k2) && SK.tier === 2 ? k2 : k, SK.ros.i, SK.ros.ai, SK.ros.hole);
  }
  if (s.startsWith('row:')) return sk12Act('sw:' + s.slice(4), el);
  if (s === 'f:iigo') return;
  sk12Act(s, el);
}
/* 卸下（Del／Ｘ）：焦點或游標底下的那一孔 */
function skDel() {
  const f = document.activeElement,
    s = (f && f.dataset && f.dataset.s && f.dataset.s.startsWith('hole:') ? f.dataset.s : SK.hov) || '',
    [k, i, j] = s.split(':');
  if (k === 'hole') skUnplug(+i, skAi(+i), +j);
}
/* 一層一層關（Esc／Ⓑ）：確認窗 → 釘住的浮窗 → 換序 → 名冊；都沒有回 false（關面板） */
function skBack() {
  if (SK.ii) SK.ii = null;
  else if (SK.pin) SK.pin = SK.hov = null;
  else if (SK.sel != null) SK.sel = null;
  else if (SK.ros) skRosClose();
  else return false;
  sfx('click');
  hudPanels();
  return true;
}
function skFilterStep(d) {
  if (!SK.ros) return;
  const { tabs, f } = skRosShow();
  SK.f[SK.ros.tab] = tabs[(tabs.indexOf(f) + d + tabs.length) % tabs.length];
  /* 清單換了：回到最上面，焦點放到第一列 */
  SK.rt = 1;
  SK.rf = SK.kb;
  hudPanels();
}
function sk12Init() {
  const p = $('pskill'),
    ros = skEl('pros'),
    on = () => PANEL.skill && p.classList.contains('s12'),
    inUI = t => t && t.closest && (p.contains(t) || ros.contains(t) || skEl('sku').contains(t));
  for (const id of ['skt', 'skc', 'skn', 'skh', 'sku']) skEl(id);
  document.addEventListener('click', e => {
    if (!on()) return;
    if (SK.drag === 2) return void (SK.drag = 0);
    const el = e.target.closest('[data-s]');
    if (el && inUI(el) && !el.disabled) return e.stopPropagation(), sk12Act(el.dataset.s, el);
    /* 點別處：放開釘住的浮窗 */
    if (SK.pin && !e.target.closest('.s-f')) (SK.pin = null), (SK.hov = null), hudPanels();
  });
  /* 拖：名冊的一顆拖到右邊的格子／孔（17／18）；技能列拖把手或整列換序（16） */
  document.addEventListener('pointerdown', e => {
    if (!on() || e.button > 0) return;
    SK.kb = 0;
    p.classList.remove('kb'), ros.classList.remove('kb');
    skHoldStart(e.target.closest('#pskill [data-s="f:iigo"]'));
    const it = e.target.closest('#pros [data-s^="pk:"]'),
      row = !it && !e.target.closest('.s-o, .s-sw, .s-f') && e.target.closest('#pskill .s-r[data-s^="row:"]');
    if (it && !it.classList.contains('no') && !it.classList.contains('dim'))
      SK.dg = { k: it.dataset.s.slice(3), x: e.clientX, y: e.clientY, html: it.innerHTML };
    else if (row && +row.dataset.s.slice(4) < 5 && !SK.ros)
      SK.dg = { row: +row.dataset.s.slice(4), x: e.clientX, y: e.clientY, el: row };
  });
  addEventListener('pointermove', e => {
    const d = SK.dg;
    if (!d) return;
    if (!SK.drag && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
    if (!SK.drag) {
      SK.drag = 1;
      SK.busy = 1;
      SK.pin = SK.hov = null;
      skFloat();
      if (d.k) {
        SK.pick = d.k;
        const g = skEl('skg');
        g.className = 'p-c';
        g.innerHTML = d.html;
        g.hidden = false;
        SK.busy = 0;
        hudPanels();
        SK.busy = 1;
      } else {
        /* 提起的列（16）：用選中色、隨游標；範圍＝開著的格 */
        d.el = p.querySelector(`[data-s="row:${d.row}"]`);
        d.el.classList.add('lift');
        /* F-3：其他列讓位。記住提起前每一列的頂（讓位後量的會跟著動）；範圍＝技能格 0–4（不含光環列） */
        d.R = [...p.querySelectorAll('.s-l > .s-r')].filter(r => +r.dataset.s.split(':')[1] < 5);
        d.T = d.R.map(r => r.getBoundingClientRect().top);
        d.a = d.R.indexOf(d.el);
        d.pitch = d.R.length > 1 ? d.T[1] - d.T[0] : 100;
        d.min = d.T[0] - d.T[d.a];
        d.max = d.T[d.T.length - 1] - d.T[d.a];
        d.to = d.a;
        p.insertAdjacentHTML('beforeend', '<i class="s-ins" aria-hidden="true"></i>');
        d.ln = p.querySelector(':scope > .s-ins');
      }
    }
    if (d.k) (skEl('skg').style.left = e.clientX - 40 + 'px'), (skEl('skg').style.top = e.clientY - 40 + 'px');
    else {
      const dy = Math.max(d.min, Math.min(d.max, e.clientY - d.y)),
        to = Math.max(0, Math.min(d.R.length - 1, d.a + Math.round(dy / d.pitch)));
      d.el.style.transform = `translateY(${dy}px)`;
      /* 被越過的列移到空出的格；插入線畫在要插的那一格上緣（示意 16 P22：452×2） */
      d.to = to;
      d.R.forEach((r, i) => {
        const m = d.a < to && i > d.a && i <= to ? -d.pitch : to < d.a && i >= to && i < d.a ? d.pitch : 0;
        r !== d.el && (r.style.transform = m ? `translateY(${m}px)` : '');
      });
      d.ln.style.top = Math.round(d.T[to] - p.getBoundingClientRect().top - 2) + 'px';
    }
  });
  const drop = e => {
    skHoldStop();
    const d = SK.dg;
    SK.dg = null;
    if (!d || !SK.drag) return;
    SK.drag = 2;
    setTimeout(() => (SK.drag = 0), 0);
    SK.busy = 0;
    if (d.k) {
      skEl('skg').hidden = true;
      const t = e.type === 'pointerup' && document.elementFromPoint(e.clientX, e.clientY),
        el =
          t &&
          t.closest('#pskill [data-s^="hole:"], #pskill [data-s^="row:"], #pskill [data-s^="slot:"], #pskill .s-au'),
        [k, a, b] = el && el.dataset.s ? el.dataset.s.split(':') : [],
        key = skTierK(d.k);
      if (!el) return hudPanels();
      if (SUPPORTS[key]) {
        /* 拖到列上（不是孔）：放進這一招第一個空孔 */
        const i = k ? +a : 5,
          r = skRec(i, skAi(i)),
          j = k === 'hole' ? +b : r && r.k ? r.so.findIndex((x, n) => !x && n < soN(r)) : -1;
        if (k === 'slot' || !r || !r.k || j < 0) return hudWarn('拖到右邊的孔'), hudPanels();
        if (!skPutAt(key, i, skAi(i), j)) hudPanels();
      } else if (AURAS[key])
        skPutAt(key, 5, k === 'aura' && a !== 'new' ? +a : S.auras.findIndex(x => !x), null) || hudPanels();
      else if (k && k !== 'aura' && +a < 5) skPutAt(key, +a, 0, null) || hudPanels();
      else hudWarn('拖到右邊的格子'), hudPanels();
      return;
    }
    /* 放開的位置＝讓位後空出來的那一格（插入線所在） */
    if (e.type === 'pointerup') skMove(d.row, d.to);
    SK.sel = null;
    changed();
  };
  addEventListener('pointerup', drop);
  addEventListener('pointercancel', drop);
  /* 懸停跟最後一次有效輸入：座標真的變了的 pointermove 才算滑鼠 */
  let mx, my;
  addEventListener(
    'pointermove',
    e => {
      if (!on() || e.pointerType !== 'mouse' || (e.clientX === mx && e.clientY === my)) return;
      (mx = e.clientX), (my = e.clientY);
      if (SK.kb) (SK.kb = 0), p.classList.remove('kb'), ros.classList.remove('kb');
      const t = p.contains(e.target) && !e.target.closest('.s-f') ? e.target : null,
        h = t && t.closest('[data-h]');
      /* 釘住或按住 Alt 的浮窗接滑鼠：游標在浮窗上不換 */
      if (!(e.target.closest && e.target.closest('.s-f'))) skHov(h ? h.dataset.h : null);
      const tm = t && t.closest('[data-tm2]'),
        tk = tm ? tm.dataset.tm2 : null;
      if (tk !== SKN_K) {
        skTermHide();
        SKN_K = tk;
        if (tm)
          SKN_T = setTimeout(() => {
            const n = p.querySelector(`[data-tm2="${CSS.escape(tk)}"]`);
            if (n) skTermShow(n);
          }, 400);
      }
    },
    true
  );
  for (const box of [p, ros])
    box.addEventListener('focusin', e => {
      if (!SK.kb) return;
      const h = e.target.closest('[data-h]');
      if (box === p) skHov(h ? h.dataset.h : null);
      skSide();
    });
  for (const box of [p, ros])
    box.addEventListener('scroll', () => (box === ros && skRosFit(ros), skSb(box), skSide()), true);
  addEventListener(
    'keydown',
    e => {
      if (!on()) return;
      const t = e.target,
        k = e.key,
        stop = () => (e.preventDefault(), e.stopImmediatePropagation());
      if (t && t.matches && t.matches('input,textarea')) return;
      if (k === 'Alt') return e.preventDefault(), skAlt(1);
      if (k === 'Escape') return void (skBack() && stop());
      const A = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k];
      if (A) return stop(), skDir(...A);
      if ((k === 'Enter' || k === ' ') && inUI(t) && t.dataset.s) return stop(), (SK.kb = 1), skOk(t);
      if (k === 'Delete' || (k.toLowerCase() === 'x' && !e.repeat)) return stop(), skDel();
      if (SK.ros && SK.ros.tab === 'sups' && (k === '[' || k === ']'))
        return stop(), (SK.tier = k === ']' ? 2 : 1), hudPanels();
    },
    true
  );
  addEventListener('keyup', e => e.key === 'Alt' && SK.alt && (e.preventDefault(), skAlt(0)), true);
  addEventListener('blur', () => (skAlt(0), skHoldStop()));
  addEventListener('gamepadconnected', () => SKPAD.on || ((SKPAD.on = 1), requestAnimationFrame(sk12Pad)));
}
/* 手把（標準配置；跟示意圖提示列一致）：方向鍵移格、選中後 ↑↓ 換序、Ⓐ 開孔／確認／打開名冊（解鎖 II 要按住 0.6 秒）、
   Ⓧ 卸下輔助、Ⓑ 關、LB／RB 換篩選、Ｙ 按住看詳細、R3 名詞 */
const SKPAD = {};
function sk12Pad() {
  const g = [...navigator.getGamepads()].find(Boolean);
  if (!g) return void (SKPAD.on = 0);
  requestAnimationFrame(sk12Pad);
  if (!PANEL.skill || !$('pskill').classList.contains('s12')) return;
  const b = i => !!(g.buttons[i] && g.buttons[i].pressed),
    edge = i => b(i) && !SKPAD[i],
    f = document.activeElement;
  if (b(3) !== !!SKPAD[3]) skAlt(b(3) ? 1 : 0);
  if (edge(11) && f && f.dataset && f.dataset.tm2) skTermShow(f);
  if (f && f.dataset && f.dataset.s === 'f:iigo') {
    if (edge(0)) skHoldStart(f);
    else if (!b(0) && SKPAD[0]) skHoldStop();
  } else if (edge(0)) (SK.kb = 1), skOk(f);
  if (edge(1) && !skBack()) navGo('skill');
  if (edge(2)) skDel();
  if (edge(4)) skFilterStep(-1);
  if (edge(5)) skFilterStep(1);
  [
    [12, 0, -1],
    [13, 0, 1],
    [14, -1, 0],
    [15, 1, 0]
  ].forEach(([i, dx, dy]) => edge(i) && skDir(dx, dy));
  for (const i of [0, 1, 2, 3, 4, 5, 11, 12, 13, 14, 15]) SKPAD[i] = b(i);
}
sk12Init();
