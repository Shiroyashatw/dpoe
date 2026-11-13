/* 技能面板與昇華石碑改版的示意圖（0.4.7 還沒做的那一段，docs/待做清單.md）：在真的遊戲頁面裡用真的資料與圖示，
   把新版面畫進面板再截圖，不改遊戲程式。四張：技能總覽、這一招、挑輔助、昇華；每張另存瞇眼圖並對 DESIGN.md 第 7 節的預算。
   **改版做進遊戲之後這支就刪掉**（它是規格，不是工具）。用法：node tools/ui_mock.js [圖存哪] [網址] */
const { chromium } = require('playwright');
const { audit, squint, line } = require('./ui_look.js');
const OUT = process.argv[2] || require('path').join(require('os').tmpdir(), 'ui_mock'),
  URL = process.argv[3] || 'http://localhost:8000/';
require('fs').mkdirSync(OUT, { recursive: true });

const CSS = `
#pskill { --title: var(--tx); display: flex; flex-direction: column; overflow: hidden; }
#pskill > .ph b { color: var(--tx); }
.m { flex: 1; min-height: 0; display: flex; flex-direction: column; margin: 0 calc(-1 * var(--pp)) calc(-1 * var(--pp)); font: 500 14px/1.5 var(--font); color: var(--tx); }
.m * { box-sizing: border-box; }
.m-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 16px 18px; display: flex; flex-direction: column; gap: 16px; }
.m-sec { display: flex; flex-direction: column; gap: 2px; }
.m-lab { margin: 0 0 6px; font: 500 12px/1.4 var(--font); color: var(--dim); display: flex; justify-content: space-between; gap: 8px; }
.m .ic { image-rendering: pixelated; width: 36px; height: 36px; flex: none; }
.m-row { display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 8px 12px; background: var(--s2); border: 0; border-radius: 2px; color: var(--tx); font: inherit; text-align: left; width: 100%; }
.m-row.emp { background: transparent; outline: 1px dashed var(--fr-o); outline-offset: -1px; color: var(--dim); min-height: 52px; }
.m-row.on { background: var(--sel); color: var(--sel-ink); }
.m-row.on small, .m-row.on .m-d0 { color: var(--sel-ink); }
.m-row.dimmed { opacity: 0.55; }
.m-ord { flex: none; width: 16px; text-align: center; font: 500 12px var(--font); color: var(--dim); }
.m-t { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.m-t b { font: 500 14px/1.4 var(--font); }
.m-t small { font: 500 12px/1.4 var(--font); color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-v { flex: none; text-align: right; display: flex; flex-direction: column; }
.m-v b { font: 700 14px/1.4 var(--font); font-variant-numeric: tabular-nums; }
.m-v small { font: 500 12px/1.4 var(--font); color: var(--dim); }
.m-up { color: var(--good); font: 700 14px/1.4 var(--font); font-variant-numeric: tabular-nums; flex: none; }
.m-d0 { color: var(--dim); font: 500 12px/1.4 var(--font); flex: none; max-width: 46%; text-align: right; }
.m-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--good); }
.m-grip { flex: none; width: 20px; height: 20px; color: var(--dim); opacity: 0.7; }
.m-pips { display: inline-flex; gap: 3px; vertical-align: 1px; margin-left: 6px; }
.m-pips i { width: 6px; height: 6px; border-radius: 50%; background: var(--dim); }
.m-pips i.e { background: transparent; box-shadow: inset 0 0 0 1px var(--dim); }
.m-top { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 8px 0 4px; min-height: 44px; }
.m-back { background: none; border: 0; color: var(--tx); font: 700 14px var(--font); min-height: 44px; padding: 0 12px; }
.m-top span { font: 500 12px var(--font); color: var(--dim); padding-right: 8px; }
.m-chips { flex: none; display: flex; gap: 6px; overflow-x: auto; padding: 0 16px 10px; scrollbar-width: none; }
.m-chip { flex: none; height: 32px; padding: 0 12px; border: 0; border-radius: 2px; background: var(--s2); color: var(--tx); font: 500 12px var(--font); }
.m-chip.on { background: var(--sel); color: var(--sel-ink); }
/* 圓環：縮小、安靜；只畫開了的孔與下一個能開的 */
.m-ring { position: relative; flex: none; height: 236px; margin: 0 -16px; }
.m-ring::before { content: ''; position: absolute; left: 50%; top: 50%; width: 164px; height: 164px; margin: -82px 0 0 -82px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--fr-o); }
.m-ctr { position: absolute; left: 50%; top: 50%; width: 84px; height: 84px; margin: -42px 0 0 -42px; border-radius: 50%; background: var(--s0); border: 2px solid var(--fr-hi); display: grid; place-items: center; }
.m-ctr .ic { width: 56px; height: 56px; }
.m-nd { position: absolute; left: calc(50% + var(--x) * 1px); top: calc(50% + var(--y) * 1px); width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; background: var(--s0); border: 1px solid var(--fr-o); display: grid; place-items: center; color: var(--dim); padding: 0; }
.m-nd .ic { width: 30px; height: 30px; }
.m-nd.emp { border-style: dashed; color: var(--tx); }
.m-nd.lock { border-style: dashed; opacity: 0.8; }
.m-nd.aw { border-radius: 2px; transform: rotate(45deg); width: 34px; height: 34px; margin: -17px 0 0 -17px; }
.m-nd.aw > * { transform: rotate(-45deg); }
.m-nd .ico { width: 18px; height: 18px; }
.m-nl { position: absolute; left: calc(50% + var(--x) * 1px); top: calc(50% + var(--y) * 1px); transform: translate(-50%, 0); margin-top: 26px; font: 500 12px/1.3 var(--font); color: var(--dim); white-space: nowrap; text-align: center; }
.m-nl.up { margin-top: -42px; }
.m-nl.go { color: var(--tx); }
.m-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.m-hero div { display: flex; flex-direction: column; }
.m-hero small { font: 500 12px/1.4 var(--font); color: var(--dim); }
.m-n { font: 700 28px/1.1 var(--font); font-variant-numeric: tabular-nums; }
.m-h { margin: 0; font: 700 18px/1.3 var(--font); display: flex; align-items: baseline; gap: 8px; }
.m-h small { font: 500 12px var(--font); color: var(--dim); }
.m-p { margin: 0; }
.m-p .n, .m-x .n { font-weight: 700; }
.m-more { background: none; border: 0; padding: 0; min-height: 44px; text-align: left; color: var(--dim); font: 500 12px var(--font); }
.m-bar { flex: none; display: flex; gap: 8px; padding: 10px 16px 12px; background: var(--s1); box-shadow: 0 -1px 0 var(--fr-o); }
.m-btn { min-height: 48px; padding: 0 14px; border-radius: 2px; border: 1px solid var(--fr-o); background: var(--s2); color: var(--tx); font: 700 14px var(--font); white-space: nowrap; }
.m-btn.pri { flex: 1; border: 0; background: linear-gradient(var(--act-hi), var(--act)); display: flex; align-items: center; justify-content: center; gap: 10px; }
.m-btn .m-up { color: var(--good); }
.m-btn .soul { font: 700 14px var(--font); }
.m-x { margin: 6px 0 0; padding: 0; list-style: none; font: 500 14px/1.5 var(--font); }
.m-rowx { display: block; background: var(--sel); color: var(--sel-ink); border-radius: 2px; padding: 0 12px 10px 60px; margin-top: -2px; }
.m-rowx .kw, .m-rowx .term, .m-rowx .n, .m-row.on .m-up { color: var(--sel-ink) !important; border-color: transparent !important; }
/* 昇華 */
.m-ah { display: flex; align-items: center; gap: 14px; }
.m-ah .ic { width: 56px; height: 56px; }
.m-ah b { display: block; font: 900 24px/1.2 var(--serif); letter-spacing: 0.08em; }
.m-ah p { margin: 2px 0 0; font: 500 12px/1.5 var(--font); color: var(--dim); }
.m-as { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.m-as > * { min-height: 44px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0 6px; border-radius: 2px; border: 1px solid var(--asc); background: var(--asc-bg); font: 500 12px var(--font); color: var(--tx); }
.m-as > .e { border: 1px dashed var(--fr-o); background: transparent; color: var(--dim); }
.m-as .ic { width: 22px; height: 22px; }
.m-ac { display: grid; grid-template-columns: 40px minmax(0, 1fr) 36px; gap: 2px 12px; padding: 12px; background: var(--s2); border: 1px solid var(--fr-o); border-radius: 2px; text-align: left; color: var(--tx); font: inherit; width: 100%; }
.m-ac .ic { width: 40px; height: 40px; grid-row: 1 / 3; }
.m-ac b { font: 700 14px/1.4 var(--font); }
.m-ac p { margin: 0; grid-column: 2; }
.m-ac .tog { grid-column: 3; grid-row: 1 / 3; align-self: center; justify-self: end; width: 28px; height: 28px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--dim); display: grid; place-items: center; color: var(--sel-ink); }
.m-ac.on { border-color: var(--asc); }
.m-ac.on .tog { background: var(--asc); box-shadow: none; }
.m-ac.no .tog { visibility: hidden; }
.m-ac .imp { grid-column: 2 / 4; margin-top: 4px; font: 500 12px/1.4 var(--font); color: var(--dim); }
.m-ac .imp .m-up { font: 700 14px/1.2 var(--font); }
.m-ac.d2 { margin-left: 16px; width: calc(100% - 16px); }
.m-ac .kw, .m-ac .term { color: inherit !important; border: 0 !important; }
.m-p .term, .m-p .kw { border: 0 !important; }
`;

/* 在頁面裡跑：資料全部從遊戲拿 */
const BUILD = () => {
  const dpsOf = i => {
    const cf = slotCfg(i);
    if (!cf) return null;
    return skMain(skillNums(cf));
  };
  const lab = i => {
    const N = skillNums(slotCfg(i));
    return N.dps != null || N.dot != null ? '每秒' : N.unit != null ? '單體每秒' : '每下';
  };
  const pct = (a, b) => (b ? Math.round((a / b - 1) * 100) : 0);
  const up = (a, b) => `<span class="m-up">▲ ${lab0} +${fmtN(a - b)}</span>`;
  let lab0 = '每秒';
  const pips = r =>
    `<span class="m-pips">${Array.from({ length: r.n }, (_, j) => `<i class="${r.so[j] ? '' : 'e'}"></i>`).join('')}</span>`;
  const head = (t, right) => {
    document.querySelector('#pskill > .ph b').textContent = t;
    const s = document.querySelector('#pskill > .ph .soul');
    if (s) s.style.display = right ? 'none' : '';
    let r = document.querySelector('#pskill > .ph .mx');
    if (!r) (r = document.createElement('span')), (r.className = 'mx'), s.after(r);
    r.style.cssText = right ? 'margin-left:auto;font:500 12px var(--font);color:var(--dim)' : 'display:none';
    r.textContent = right || '';
    document.querySelectorAll('#pskill > .ph .sw').forEach(e => (e.style.display = 'none'));
  };
  const put = html => {
    const P = document.querySelector('#pskill');
    [...P.children].forEach(c => c.classList.contains('ph') || c.remove());
    P.insertAdjacentHTML('beforeend', `<div class="m">${html}</div>`);
  };
  const nav = k => document.querySelectorAll('#pnav button').forEach((b, i) => b.classList.toggle('on', i === k));

  /* 1. 總覽 */
  function overview() {
    head('技能');
    nav(2);
    const todo = [];
    S.skills.forEach((r, i) => {
      if (!r.k) return;
      const emp = r.so.slice(0, r.n).filter(x => !x).length;
      if (!emp) return;
      const j = r.so.findIndex((x, n) => n < r.n && !x),
        base = dpsOf(i);
      SKUI.i = i;
      SKUI.hole = j;
      SKUI.view = 'sups';
      let bd = 0;
      for (const x of skList(skCur())) {
        if (x.why) continue;
        r.so[j] = x.k;
        bd = Math.max(bd, dpsOf(i) - base);
        r.so[j] = null;
      }
      SKUI.view = 'main';
      SKUI.hole = null;
      SKUI.i = 0;
      todo.push([
        `${SKILLS[r.k].n}有 ${emp} 個空孔`,
        '插一顆輔助',
        bd > 0.5 ? `▲ 最多 +${fmtN(bd)}` : '',
        SKILLS[r.k].ic,
        bd
      ]);
    });
    /* 買得起的升級裡，加最多的那一個 */
    let best = null;
    S.skills.forEach((r, i) => {
      if (!r.k || libUpCheck(r.k).why) return;
      const a = dpsOf(i),
        lv = libLv(r.k);
      S.lib.sk[r.k] = lv + 1;
      const b = dpsOf(i);
      S.lib.sk[r.k] = lv;
      if (b > a && (!best || b - a > best.d)) best = { r, i, d: b - a, lv, c: libUpCheck(r.k).c };
    });
    if (best)
      todo.push([
        `${SKILLS[best.r.k].n}升到 Lv ${best.lv + 1}`,
        `${fmtN(best.c)} 靈魂`,
        `▲ ${lab(best.i)} +${fmtN(best.d)}`,
        SKILLS[best.r.k].ic,
        best.d
      ]);
    todo.sort((a, b) => (b[4] || 0) - (a[4] || 0));
    const free = S.skills.filter(r => !r.k).length;
    if (free) todo.push([`還有 ${free} 格沒放技能`, '挑一招', '', null, 0]);
    const rows = S.skills
      .map((r, i) => {
        if (!r.k)
          return `<button class="m-row emp"><span class="m-ord">${i + 1}</span>${ICO.plus}<span class="m-t"><b>挑一招</b></span></button>`;
        const D = SKILLS[r.k],
          v = dpsOf(i);
        return `<button class="m-row"><span class="m-ord">${i + 1}</span>${icHTML(D.ic)}<span class="m-t"><b>${D.n}</b><small>Lv ${libLv(r.k)}${pips(r)}${i === 0 ? '　普攻，最後才放' : ''}</small></span><span class="m-v"><b>${v != null ? fmtN(v) : '—'}</b></span><svg class="m-grip" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 7h12M4 13h12"/></svg></button>`;
      })
      .join('');
    put(`<div class="m-scroll">
      ${
        todo.length
          ? `<section class="m-sec"><h3 class="m-lab">現在可以變強</h3>${todo
              .slice(0, 3)
              .map(
                t =>
                  `<button class="m-row"><i class="m-dot"></i>${t[3] ? icHTML(t[3]) : ''}<span class="m-t"><b>${t[0]}</b><small>${t[1]}</small></span>${t[2] ? `<span class="m-up">${t[2]}</span>` : ''}</button>`
              )
              .join('')}</section>`
          : ''
      }
      <section class="m-sec"><h3 class="m-lab">出招順序・由上往下放，可以拖曳<span>每秒</span></h3>${rows}</section>
      <section class="m-sec"><h3 class="m-lab">光環<span>精魂 ${ST.spiritUsed}／${ST.spirit}</span></h3><button class="m-row emp">${ICO.plus}<span class="m-t"><b>加光環</b></span></button></section>
    </div>`);
  }

  /* 2. 這一招 */
  function detail(i) {
    const r = S.skills[i],
      D = SKILLS[r.k],
      cf = slotCfg(i),
      N = skillNums(cf),
      v = skMain(N),
      lv = libLv(r.k),
      u = libUpCheck(r.k);
    head('技能');
    nav(2);
    S.lib.sk[r.k] = lv + 1;
    const v2 = dpsOf(i);
    S.lib.sk[r.k] = lv;
    const n = r.n + (r.n < GEM_SO_MAX ? 1 : 0),
      R = 82;
    /* 孔：從右上順時針排到左上，正上方留給覺醒 */
    const nodes = Array.from({ length: n }, (_, j) => {
      const a = ((-50 + (280 / Math.max(1, n - 1)) * j) * Math.PI) / 180,
        x = Math.round(Math.cos(a) * R),
        y = Math.round(Math.sin(a) * R),
        pos = `style="--x:${x};--y:${y}"`,
        upc = y < -20 ? 'up' : '';
      if (j >= r.n) {
        const d = drillCheck(r);
        return `<button class="m-nd lock" ${pos}>${ICO.lock}</button><span class="m-nl ${upc}" ${pos}>打開・${fmtN(d.c)} 靈魂</span>`;
      }
      const k = r.so[j];
      return k
        ? `<button class="m-nd" ${pos}>${icHTML(SUPPORTS[k].ic)}</button><span class="m-nl ${upc}" ${pos}>${SUPPORTS[k].n}</span>`
        : `<button class="m-nd emp" ${pos}>${ICO.plus}</button><span class="m-nl go ${upc}" ${pos}>插輔助</span>`;
    }).join('');
    const tags = D.tags.filter(t => TAGN[t] && !['elem', 'occ', 'pri', 'cd'].includes(t)).map(t => TAGN[t]);
    put(`<div class="m-top"><button class="m-back">‹ 總覽</button><span>第 ${i + 1} 格</span></div>
    <div class="m-scroll" style="padding-top:0;gap:12px">
      <h2 class="m-h">${D.n}<small>Lv ${lv}　${tags.slice(0, 3).join('・')}</small></h2>
      <div class="m-ring"><div class="m-ctr">${icHTML(D.ic)}</div>${nodes}</div>
      <div class="m-hero"><div><small>${lab(i)}</small><b class="m-n">${fmtN(v)}</b></div><small>${[N.hit != null && N.dps != null ? `擊中 ${fmtN(N.hit)}` : '', cf.mp ? `魔力 ${cf.mp}` : '', cf.cd ? `冷卻 ${cf.cd.toFixed(1)} 秒` : ''].filter(Boolean).join('　')}</small></div>
      <div><p class="m-p">${rich(D.d)}</p><button class="m-more">算式與詳細 ›</button></div>
    </div>
    <div class="m-bar"><button class="m-btn pri">升到 Lv ${lv + 1}${soulB(u.c)}${v2 > v ? `<span class="m-up">▲ +${fmtN(v2 - v)}</span>` : ''}</button><button class="m-btn">換一招</button><button class="m-btn">卸下</button></div>`);
  }

  /* 3. 挑輔助 */
  function pick(i, j) {
    SKUI.i = i;
    SKUI.hole = j;
    SKUI.view = 'sups';
    const c = skCur(),
      r = S.skills[i],
      base = dpsOf(i),
      L = skList(c).map(x => {
        const old = r.so[j];
        r.so[j] = x.k;
        const v = dpsOf(i);
        r.so[j] = old;
        return { ...x, d: x.why ? -1e9 : v - base };
      });
    SKUI.view = 'main';
    SKUI.hole = null;
    L.sort((a, b) => b.d - a.d);
    const sel = L[0];
    head('技能');
    nav(2);
    const row = x => {
      const line = (x.D.x && x.D.x[0]) || x.D.d,
        right = x.why
          ? `<span class="m-d0">${x.why}</span>`
          : x.d > 0.5
            ? `<span class="m-up">▲ +${fmtN(x.d)}（${pct(base + x.d, base)}%）</span>`
            : x.d < -0.5
              ? `<span class="m-d0">▼ ${fmtN(x.d)}</span>`
              : `<span class="m-d0">不改每秒</span>`;
      return `<button class="m-row ${x === sel ? 'on' : ''} ${x.why ? 'dimmed' : ''}">${icHTML(x.D.ic)}<span class="m-t"><b>${x.D.n}</b>${x === sel ? '' : `<small>${line.replace(/<[^>]+>/g, '')}</small>`}</span>${right}</button>${
        x === sel
          ? `<div class="m-rowx"><ul class="m-x">${(x.D.x || [x.D.d]).map(l => `<li>${rich(l, 1)}</li>`).join('')}</ul></div>`
          : ''
      }`;
    };
    const tabs = ['全部', ...new Set(L.flatMap(x => x.tabs))];
    put(`<div class="m-top"><button class="m-back">‹ ${SKILLS[r.k].n}</button><span>第 ${j + 1} 孔・現在${lab(i)} ${fmtN(base)}</span></div>
    <div class="m-chips">${tabs.map((t, n) => `<button class="m-chip ${n ? '' : 'on'}">${t}</button>`).join('')}</div>
    <div class="m-scroll" style="padding-top:0;gap:2px">${L.map(row).join('')}</div>
    <div class="m-bar"><button class="m-btn pri">插上${sel.D.n}<span class="m-up" style="color:var(--tx)">▲ +${fmtN(sel.d)}</span></button><button class="m-btn">升到 Lv ${libLv(sel.k) + 1}${soulB(libUpCheck(sel.k).c)}</button></div>`);
    return L.slice(0, 8).map(x => [x.D.n, Math.round(x.d)]);
  }

  /* 4. 昇華 */
  function asc(k) {
    if (S.asc !== k) act('asc:' + k);
    const T = ascNodes(k),
      M = ascMap(T),
      A = ASC[k],
      main = () => Math.max(...S.skills.map((r, i) => (r.k ? dpsOf(i) || 0 : 0)));
    /* 先選兩個能選的 */
    for (let n = 0; n < 2; n++) {
      const c = T.N.find(x => x.big === 1 && ascBig(T, M, x.id).st === 'can');
      if (c) S.at.push(...ascBig(T, M, c.id).path);
    }
    ST = stats();
    const base = main(),
      hp0 = ST.hp;
    const bigs = T.N.filter(n => n.big === 1).sort((a, b) => M.dist[a.id] - M.dist[b.id]),
      picked = S.at.filter(id => T.I[id] && T.I[id].big === 1);
    const info = [];
    const card = n => {
      const b = ascBig(T, M, n.id);
      let imp = '';
      if (b.st === 'can') {
        const at = S.at;
        S.at = [...at, ...b.path];
        ST = stats();
        const v = main(),
          hp = ST.hp;
        S.at = at;
        ST = stats();
        const p = pct(v, base),
          ph = pct(hp, hp0);
        info.push([n.n, p, ph]);
        imp =
          p > 0
            ? `對你這套：<span class="m-up">▲ 每秒 +${p}%</span>`
            : ph > 0
              ? `對你這套：<span class="m-up">▲ 生命 +${ph}%</span>`
              : /時|後|當|每/.test(n.d)
                ? '有條件，面板數字不會動'
                : '不改每秒';
      } else if (b.st === 'no') imp = b.why;
      else imp = b.why || '已選，再點一下退回';
      return `<div role="button" class="m-ac ${b.st} ${M.big[n.id].pre ? 'd2' : ''}">${icHTML(n.ic)}<b>${n.n}</b><span class="tog">${b.st === 'on' ? ICO.tick : ''}</span><p>${termify(n.d)}</p><span class="imp">${imp}</span></div>`;
    };
    head('昇華石碑', `已選 ${picked.length}／4・剩 ${ascLeft()} 點`);
    nav(3);
    const cards = bigs.map(card).join('');
    put(`<div class="m-scroll">
      <div class="m-ah">${icHTML(A.ic)}<div><b>${A.n}</b><p>${A.d}</p></div></div>
      <div class="m-as">${[0, 1, 2, 3].map(i => (T.I[picked[i]] ? `<span>${icHTML(T.I[picked[i]].ic)}${T.I[picked[i]].n}</span>` : `<span class="e">${i + 1}</span>`)).join('')}</div>
      <section class="m-sec" style="gap:8px"><h3 class="m-lab">點一張卡就選，再點一下退回<span>一個 2 點</span></h3>${cards}</section>
    </div>
    <div class="m-bar"><button class="m-btn" style="flex:1">換昇華</button><button class="m-btn">重置</button></div>`);
    return info;
  }
  return { overview, detail, pick, asc };
};

(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2
  });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERR', String(e).slice(0, 300)));
  await p.goto(URL + '?p=5&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1200);
  const setup = await p.evaluate(() => {
    proSkip();
    S.story.tips = 0;
    S.lv = 60;
    S.maxT = 13;
    S.orient = 'p';
    applyOrient();
    MAT().soul = 420;
    const ok = Object.keys(SKILLS).filter(
      k => SKILLS[k].m && !skWhy(SKILLS[k]) && !gemLack(mkGem(k, 1)).length && !['slash', 'mirage'].includes(k)
    );
    S.skills[2].k = ok[0];
    S.skills[3].k = ok[1];
    S.skills[0].n = 3;
    S.skills[0].so = ['fury', null, null];
    S.skills[1].so = ['crit', null];
    changed();
    navGo('skill');
    return { ok: ok.slice(0, 4), wt: ST.wt, hp: ST.hp, keys: Object.keys(ST).filter(k => /^hp|life/i.test(k)) };
  });
  console.log(JSON.stringify(setup));
  await p.waitForTimeout(500);
  await p.addStyleTag({ content: CSS });
  await p.evaluate(`window.MOCK = (${BUILD.toString()})(); hudPanels = () => {};`);
  const shots = [
    ['1-總覽', () => p.evaluate(() => MOCK.overview()), 12],
    ['2-這一招', () => p.evaluate(() => MOCK.detail(0)), 12],
    ['3-挑輔助', () => p.evaluate(() => MOCK.pick(0, 1)), 30],
    ['4-昇華', () => p.evaluate(() => MOCK.asc(Object.keys(ASC)[3])), 30]
  ];
  for (const [name, go, boxMax] of shots) {
    const info = await go();
    await p.waitForTimeout(400);
    const a = await audit(p, '#pskill');
    await p.screenshot({ path: `${OUT}/mock-${name}.png` });
    await squint(p, '#pskill', `${OUT}/mock-${name}-瞇眼.png`);
    console.log(line(name, a, boxMax));
    console.log('   ' + a.明細.字的樣式);
    console.log('   ' + a.明細.字色);
    if (info) console.log('   資料：' + JSON.stringify(info));
  }
  await b.close();
})();
