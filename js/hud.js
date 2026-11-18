/* dungeonPOE · HUD（生命／魔力球、技能列、經驗條、王的血條）、面板（裝備與背包、倉庫、地圖台）、拖曳、說明框、死亡與通關、輸入 */
'use strict';
/* 視窗大小（main.js 的 resize 更新）：直接讀 innerWidth／innerHeight 會在畫面有變動時強制排版一次，面板重畫時一格會排好幾次（0.4.7） */
let IW = innerWidth,
  IH = innerHeight;
let C = 36; /* 背包一格的大小（px）；手機照螢幕寬度調（main.js 的 resize） */
/* px：要顯示的大小比原圖小時（資源條 16）先縮好原圖，顯示寬 ÷ naturalWidth 才是整數 */
const icHTML = (n, cls = '', px) => {
  const u = ICONS[n] ? iconURL(n) : artIconURL(n, px);
  return u ? `<img class="ic ${cls}" src="${u}" alt="">` : `<span class="ic ${cls}"></span>`;
};
/* 圖還沒載好時，載好後補畫面板 */
/* 一次開圖會連續載好幾十張大圖：合併成一次重畫（0.2.32，之前每張都重建整棵天賦樹，第一次打開會卡好幾秒） */
let ART_T = 0;
function artRepaint() {
  clearTimeout(ART_T);
  ART_T = setTimeout(() => {
    hudPanels();
    HV.sts = null; /* 圖載好了：狀態列強制重畫（key 不含秒數，不會自己補圖） */
    if (document.querySelector('.sk span.ic')) hudBar();
    if (CB.st !== 'idle' && document.querySelector('#chase span.ic'))
      $('chase').innerHTML = chaseBnHTML(); /* 王印圖第一次用到才載，橫幅先畫出空格 */
    treeIcons();
  }, 80);
}

/* 技能列：1 生命藥劑、2 魔力藥劑、5 個技能欄（左鍵、右鍵、Q、E、R）、空白翻滾 */
const BAR = [
  { k: 'flask', key: '1', ic: 'it_potion', n: '生命藥劑', d: '回復一半生命（1.4 秒內）。殺怪會補充。' },
  { k: 'mflask', key: '2', ic: 'it_potion', n: '魔力藥劑', d: '回復一半魔力（1.4 秒內）。殺怪會補充。' },
  ...SLOTKEY.map((key, i) => ({ k: 's' + i, key, slot: i })),
  { k: 'roll', key: '空白', n: '翻滾', d: '短暫無敵。怪物出手的瞬間翻滾＝完美閃避：時間變慢，下一擊必定暴擊。' },
  { k: 'use', key: 'F', n: '互動', d: '撿東西、使用藏身處的擺設', touch: 1 }
];
/* 介面小圖示：同一套線條（1.5px、currentColor），取代 emoji 與符號字 */
const ICO = (() => {
  const s = d => `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true">${d}</svg>`;
  return {
    x: s('<path d="M4 4l8 8M12 4l-8 8"/>'),
    /* 回到目前位置：準星 */
    aim: s('<circle cx="8" cy="8" r="4.2"/><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3"/>'),
    /* 巡邏卡：路線上的三個點 */
    pat: s(
      '<path d="M3 12c3 0 3-8 7-8M10 4h3M3 12h1"/><circle cx="3" cy="12" r="1.6"/><circle cx="13" cy="4" r="1.6"/>'
    ),
    chain: s(
      '<rect x="1.5" y="5.2" width="7" height="5.6" rx="2.8" transform="rotate(-45 5 8)"/><rect x="7.5" y="5.2" width="7" height="5.6" rx="2.8" transform="rotate(-45 11 8)"/>'
    ),
    plus: s('<path d="M8 3v10M3 8h10"/>'),
    lock: s('<rect x="3.5" y="7.5" width="9" height="6.5" rx="1"/><path d="M5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2"/>'),
    roll: s('<path d="M2 12c2.5-5.5 7.5-6.5 11-3"/><path d="M10 5.5l3.2 3.3-3.6 2.4"/>'),
    bag: s('<path d="M3.5 6h9l-.8 8h-7.4z"/><path d="M6 6V4.5a2 2 0 0 1 4 0V6"/>'),
    gem: s('<path d="M8 2l5 4.5L8 14 3 6.5z"/><path d="M3 6.5h10"/>'),
    flame: s(
      '<path d="M8 2c.7 2.7 3.3 3.3 3.3 6.7a3.3 3.3 0 0 1-6.6 0c0-2 1.3-2.7 1.3-4 .7.7 1.4 1.3 2 .7-.7-1.4-.7-2.7 0-3.4z"/>'
    ),
    fork: s(
      '<circle cx="4" cy="10.7" r="1.7"/><circle cx="8" cy="6" r="1.7"/><circle cx="12" cy="10.7" r="1.7"/><path d="M4 2.7v6.3M8 1.3v3M12 2.7v6.3"/>'
    ),
    tick: s('<path d="M3 8.5l3.2 3L13 4.5"/>'),
    tree: s(
      '<circle cx="8" cy="3.5" r="1.6"/><circle cx="3.5" cy="12" r="1.6"/><circle cx="12.5" cy="12" r="1.6"/><path d="M7 5l-2.6 5.6M9 5l2.6 5.6M5.1 12h5.8"/>'
    ),
    home: s('<path d="M2.5 8L8 3l5.5 5"/><path d="M4 7v6.5h8V7"/><path d="M6.5 13.5v-3.5h3v3.5"/>'),
    gear: s(
      '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>'
    ),
    menu: s('<path d="M2.5 4h11M2.5 8h11M2.5 12h11"/>'),
    hero: s('<circle cx="8" cy="5" r="2.6"/><path d="M3 14c.6-3 2.6-4.6 5-4.6s4.4 1.6 5 4.6"/>'),
    hammer: s('<path d="M8.6 2.6l4.8 4.8-1.7 1.7-1.3-1.3-6 6-1.8-1.8 6-6-1.3-1.3z"/>'),
    full: s('<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>'),
    prev: s('<path d="M10 3L5 8l5 5"/>'),
    next: s('<path d="M6 3l5 5-5 5"/>'),
    down: s('<path d="M3 6l5 5 5-5"/>')
  };
})();
const fsApply = () => {
  const r = document.documentElement;
  r.style.setProperty('--tscale', ((S && S.fs) || 100) / 100);
  r.classList.toggle('fsbig', !!S && S.fs > 100);
};
/* 直立操作：手機而且設定選直立（桌機一律橫向） */
const PORT = () => TOUCH.on && !!S && S.orient === 'p';
/* 桌機：魔力球旁的功能列；手機：右上的 ☰ 選單（data-tm 的處理在 touch.js） */
const DMENU = [
  ['inv', 'bag', '裝備與倉庫', 'I'],
  ['skill', 'gem', '技能', 'G'],
  ['tree', 'tree', '天賦樹', 'P'],
  ['home', 'home', '回藏身處', 'T'],
  ['set', 'gear', '設定與快捷鍵', 'Esc']
];
/* 功能選單（0.4.0）：刷圖時也能開（面板開著戰鬥照跑）；桌機「功能」鈕、手機 ☰ 都列這些 */
/* M2-38（M2-37.7）：K 鍛造、O 鍛造 › 通貨、H 營地、Y 追逐物品（開放後才有） */
const FMENU = [
  ['node', '地點', 'M'],
  ['stash', STR_T.forgeCur, 'O'],
  ['forge', STR_T.forge, 'K'],
  ['craft', '營地', 'H'],
  ['chase', STR_T.chase, 'Y'],
  ['asc', '昇華石碑', 'U'],
  ['box', '山海寶盒', 'J'],
  ['log', '掉落紀錄', 'L']
];
function fmenuOpen(k) {
  if (k === 'chase' && !chaseOn()) return;
  const on = k === 'forge' || k === 'craft' ? navOn() === k : PANEL[k];
  HP_HOLD++;
  closePanels();
  HP_HOLD--;
  if (on) return hudPanels();
  /* BASE-01：跑圖中鍛造、營地、掉落紀錄、追逐物品半版；其他（地點、昇華、寶盒）照舊蓋滿 */
  NAV.full = PORT() && !(G.scene === 'map' && ['forge', 'stash', 'craft', 'log', 'chase'].includes(k)) ? 1 : 0;
  if (k === 'forge' || k === 'stash') act('ctab:' + (k === 'stash' ? 'cur' : FSEG));
  else if (k === 'craft' && G.scene === 'map') openPanel('camp');
  else if (k === 'craft') (CRAFT.tab = 'camp'), openPanel('craft');
  else openPanel(k);
}
const fmenuHTML = () =>
  FMENU.filter(([k]) => (k !== 'asc' || campCan('asc')) && (k !== 'chase' || chaseOn()))
    .map(([k, n, key]) => `<button data-tm="f:${k}">${esc(n)}<kbd class="donly">${key}</kbd></button>`)
    .join('');
function hudInit() {
  $('hud').innerHTML = `
  <div class="top"><div id="area"></div><div id="run" hidden></div><div id="dlog"></div><div id="bossbar" hidden><b id="bossn"></b><em class="bsh">現身</em><div class="bb"><i></i></div></div><div id="prog" hidden><b id="progt">王 0%</b><div class="pb"><i></i></div></div></div>
  <div class="bottom">
    <div class="orb hp" id="ohp"><i></i><b class="ward"></b><svg class="spir blk" viewBox="0 0 100 100" aria-hidden="true"><path class="tr" d="M50 5 A45 45 0 0 1 50 95"/><path class="fg" pathLength="1" d="M50 95 A45 45 0 0 0 50 5"/></svg><span></span></div>
    <div class="mid">
      <div id="lvup" role="status" aria-live="polite"></div>
      <div class="mech" id="mech" role="status" aria-label="目前的狀態"></div>
      <div class="bars tonly"><div class="hb hp" id="bhp"><i></i><b class="ward"></b><span></span></div><div class="hb bv" id="bbv" hidden><i></i></div><div class="hb mp" id="bmp"><i></i><span></span></div></div>
      <div class="xp" id="xp" data-tip="經驗"><i></i></div>
      <div class="bar" id="bar"></div>
    </div>
    <div class="orb mp" id="omp"><i></i><svg class="spir" viewBox="0 0 100 100" aria-hidden="true"><path class="tr" d="M50 95 A45 45 0 0 1 50 5"/><path class="fg" pathLength="1" d="M50 95 A45 45 0 0 1 50 5"/></svg><span></span></div>
    <div class="dmenu"><button class="autob2" data-tm="more" data-tip="地點、通貨與碎片、營地、昇華石碑、山海寶盒、掉落紀錄" aria-expanded="false">功能</button>${DMENU.map(([k, ic, n, key]) => `<button data-tm="${k}" data-tip="${n}（${key}）" aria-label="${n}">${ICO[ic]}<kbd>${key}</kbd></button>`).join('')}</div>
  </div>
  <div class="modesw donly" role="group" aria-label="自動／手動"><button data-a="auto:1" aria-pressed="false">${STR_T.modeAuto}</button><button data-a="auto:0" aria-pressed="false">${STR_T.modeMan}</button><kbd>C</kbd></div>
  <nav id="dnav" class="donly" aria-label="功能"></nav>
  <div id="prac" hidden></div>
  <div id="warn" role="status" aria-live="polite"></div>
  <div id="paused" hidden>已暫停</div>
  <div id="banner" role="status" aria-live="polite" hidden></div>
  <div class="tonly" id="stick"><i></i></div>
  <div class="tonly tmenu"><button data-tm="inv">${ICO.bag}倉庫</button><button data-tm="more" aria-label="選單" aria-expanded="false">${ICO.menu}</button></div>
  <div class="tmore" id="tmore" hidden>${fmenuHTML()}<button class="tonly" data-tm="skill">${ICO.gem}技能</button><button class="tonly" data-tm="tree">${ICO.tree}天賦樹</button><button class="tonly" data-tm="home">${ICO.home}回藏身處</button><button class="tonly" data-tm="fs" id="tfs">${ICO.full}全螢幕</button><button class="tonly" data-tm="set">${ICO.gear}設定</button></div>
  <div class="tonly" id="rot"><p id="rott"></p><button class="btn" data-tm="flip" id="rotb"></button></div>`;
  $('chase').addEventListener('mouseenter', () => chaseBnHover(1));
  $('chase').addEventListener('mouseleave', () => chaseBnHover(0));
  pracInit();
  introInit();
  hudBar();
  hudState();
}
/* 技能列的圖示跟著技能欄換（換寶石後重畫）。桌機（M2-38，M2-37.4）：祭壇沒開的技能格不畫；開了但空著的只畫外框＋鍵帽，點了開技能面板 */
function hudBar() {
  HV.bar = barKey();
  $('bar').innerHTML = BAR.filter(b => b.slot == null || TOUCH.on || b.slot < campN('slots'))
    .map(b => {
      if (!TOUCH.on && b.slot != null && !S.skills[b.slot].k)
        return `<button class="sk emp" data-k="${b.k}" data-tm="skill" data-tip="${esc(tipOf(b))}" aria-label="${b.key}：空的"><kbd>${b.key}</kbd></button>`;
      const g = b.slot != null && S.skills[b.slot].k,
        ic =
          b.k === 'roll'
            ? `<em class="roll">${ICO.roll}</em>`
            : b.k === 'use'
              ? '<em class="use">互動</em>'
              : b.slot != null
                ? g
                  ? icHTML(SKILLS[g].ic)
                  : `<em class="empty">${ICO.plus}</em>`
                : icHTML(b.ic);
      return `<div class="sk${b.touch ? ' tonly' : ''}" data-k="${b.k}" data-tip="${esc(tipOf(b))}">${ic}<u></u><s></s><kbd>${b.key}</kbd></div>`;
    })
    .join('');
  for (const k in HV) if (/^[tnb]s\d|^cds\d|^(cd|t|n)(flask|mflask|roll)$/.test(k)) delete HV[k];
}
const barKey = () => (TOUCH.on ? 't' : campN('slots'));
function tipOf(b) {
  if (b.slot == null) return `${b.n}\n${b.d}`;
  const c = slotCfg(b.slot);
  if (!c) return `${b.key}：空的\n按 G 打開技能面板，挑一招放進來`;
  return `${c.D.n} Lv ${c.lv}${wtNeed(c.D) ? `（${wtNeed(c.D)}）` : ''}\n${c.D.d}${c.mp ? `\n魔力 ${c.mp}` : ''}${c.cd ? ` · 冷卻 ${c.cd.toFixed(1)} 秒` : ''}`;
}
let warnT;
function hudWarn(t) {
  const w = $('warn');
  w.textContent = t;
  w.classList.remove('on');
  void w.offsetWidth;
  w.classList.add('on');
  clearTimeout(warnT);
  warnT = setTimeout(() => w.classList.remove('on'), 1600);
}
/* 升級膠囊（M2-05.3）：唯一的升級提示，獨立於 #warn、各自計時；還亮著時再升級只改等級、天賦點寫總數 */
let lvpT,
  lvN = 0;
function lvPill() {
  const w = $('lvup');
  lvN = w.classList.contains('on') ? lvN + 1 : 1;
  w.innerHTML = `升級！<b>Lv ${S.lv}</b>・天賦點 +${lvN}`;
  w.classList.add('on');
  clearTimeout(lvpT);
  lvpT = setTimeout(() => w.classList.remove('on'), 2000);
}
/* 每格畫面更新：只改數值，不重畫 HTML */
const HV = {};
function setV(el, k, v) {
  if (HV[k] === v) return;
  HV[k] = v;
  el.style.setProperty('--v', v);
}
function setT(el, k, v) {
  if (HV[k] !== v) el.textContent = HV[k] = v;
}
/* M1-10 視覺：世界停住時，戰鬥區頂列置中一顆「已暫停」（#area／王血條下方 8 px；直立半版時落在上半的戰鬥區） */
function pausedTick() {
  const el = $('paused'),
    /* 自動模式倒下（M2-12 §4）用字板講，不出「已暫停」 */
    on = G.scene === 'map' && worldPaused() && !(G.state === 'dead' && S.auto && G.node);
  if (el.hidden === !on && !on) return;
  el.hidden = !on;
  if (!on) return;
  const b = [$('area'), $('bossbar'), $('prog')]
    .filter(e => e && !e.hidden && e.offsetParent)
    .map(e => e.getBoundingClientRect().bottom);
  el.style.top = Math.round(Math.max(0, ...b) + (IH < 700 ? 6 : 8)) + 'px';
}
/* M1-12：直立角色頁，護符列還沒完整露出（含 16 px 底距）時，捲動層下緣出一條漸層＋向下箭頭 */
let SCH_T = 0;
function charmHint() {
  const h = PORT() && PANEL.inv && document.querySelector('#pinv .schint');
  if (!h || performance.now() - SCH_T < 100) return;
  SCH_T = performance.now();
  const c = document.querySelector('#pinv .doll2x'),
    p = $('pinv').getBoundingClientRect();
  h.hidden = !c || c.getBoundingClientRect().bottom + 16 <= p.bottom + 1;
}
function hudTick() {
  if (!P) return;
  pausedTick();
  charmHint();
  setV($('ohp'), 'hp', (P.hp / ST.hp).toFixed(3));
  /* 地獄火（0.2.26，炎魔契約）：魔力球改成地獄火（橘紅色、往上漲；八成以上發紅光＝快自爆） */
  const hell = !!ST.hellfire,
    mpv = hell ? (P.hf || 0) / ST.hfMax : P.mp / ST.mp,
    mpt = hell ? `地獄火\n${Math.floor(P.hf || 0)} / ${ST.hfMax}` : Math.floor(P.mp) + ' / ' + ST.mp,
    hot = hell && mpv >= 0.8;
  if (HV.hell !== hell || HV.hot !== hot) {
    HV.hell = hell;
    HV.hot = hot;
    for (const el of [$('omp'), $('bmp')]) el.classList.toggle('hf', hell), el.classList.toggle('hot', hot);
  }
  setV($('omp'), 'mp', mpv.toFixed(3));
  setT($('ohp').lastChild, 'ht', Math.ceil(P.hp) + ' / ' + ST.hp + (ST.es ? `\n盾 ${Math.floor(P.es || 0)}` : ''));
  setT($('omp').lastChild, 'mt', mpt);
  setV($('xp'), 'xp', (S.xp / xpNeed(S.lv)).toFixed(3));
  for (const el of document.querySelectorAll('.sk:not(.emp)')) {
    const k = el.dataset.k,
      c = k[0] === 's' ? slotCfg(+k[1]) : null;
    let cd = 0,
      txt = '';
    if (k === 'flask' || k === 'mflask') {
      /* 0.3.1：不限次數，只畫冷卻 */
      cd = (P.cds[k] || 0) / FLASK.cd;
      if (P.cds[k] > 0) txt = Math.ceil(P.cds[k]) + '';
    } else if (k === 'roll') cd = (P.cds.roll || 0) / (ROLL.cd + ROLL.t);
    else if (c && isFlaskSk(c.D)) {
      /* 藥劑技能（0.2.74 追獵者）：還能放幾次（跟紅水同一池）；共用 0.5 秒間隔畫成冷卻圈 */
      const n = Math.floor(P.flask / flaskCost() + 1e-9);
      txt = String(n);
      cd = P.flaskT > G.t ? (P.flaskT - G.t) / 0.5 : n ? 0 : 1 - P.flask / flaskCost();
    } else if (c && c.cd) {
      cd = (P.cds[k] || 0) / c.cd;
      if (P.cds[k] > 0) txt = Math.ceil(P.cds[k]) + '';
    }
    setV(el, 'cd' + k, cd.toFixed(2));
    setT(el.querySelector('u'), 't' + k, txt);
    const no =
      (c && ((!hell && !pracFree() && mpAvail() < c.mp) || !wtOK(c.D))) ||
      !fightOn() ||
      (ST.noFlask && (k === 'flask' || k === 'mflask'));
    if (HV['n' + k] !== no) el.classList.toggle('no', (HV['n' + k] = no));
    /* 技能失效（武器不對、能力值不夠）：右上角紅「!」，說明框寫原因 */
    const bad = k[0] === 's' && c ? slotBad(+k[1], c) : '';
    if (HV['b' + k] !== bad) {
      el.classList.toggle('bad', !!(HV['b' + k] = bad));
      if (bad) el.title = '失效：' + bad;
      else el.removeAttribute('title');
    }
  }
  /* 翻滾冷卻：桌機畫在游標旁（直立是技能鍵旁的小圖示，照上面的 .sk 一起更新） */
  const rc = TOUCH.on ? 0 : (P.cds.roll || 0) / (ROLL.cd + ROLL.t),
    rcd = $('rcd');
  if (rcd.hidden !== !(rc > 0)) rcd.hidden = !(rc > 0);
  if (rc > 0) {
    rcd.style.transform = `translate(${M.x + 14}px, ${M.y + 14}px)`;
    setV(rcd, 'rcd', rc.toFixed(2));
  }
  /* 能量護盾（照 PoE）：生命球上疊一層白，高度＝護盾÷最大護盾；騎士的護盾也畫在這層 */
  const wv = ST.es ? Math.min(1, (P.es || 0) / ST.es).toFixed(3) : '0';
  if (HV.ward !== wv) $('ohp').style.setProperty('--w', (HV.ward = wv));
  /* 格擋值（0.2.25）：生命球右邊的弧（手機是生命條下面的細條）；碎掉在回滿的時候變淺色 */
  const bvOn = ST.bv > 0,
    bvv = bvOn ? Math.min(1, (P.bv || 0) / ST.bv).toFixed(3) : '0',
    bvBr = P.bvRe != null;
  if (HV.bvOn !== bvOn) {
    HV.bvOn = bvOn;
    $('ohp').classList.toggle('hasbv', bvOn);
    $('bbv').hidden = !bvOn;
    if (!bvOn) delete $('ohp').dataset.tip;
  }
  if (HV.bv !== bvv) for (const el of [$('ohp'), $('bbv')]) el.style.setProperty('--b', (HV.bv = bvv));
  if (HV.bvBr !== bvBr) {
    HV.bvBr = bvBr;
    $('ohp').classList.toggle('bvbr', bvBr);
    $('bbv').classList.toggle('bvbr', bvBr);
  }
  if (bvOn) $('ohp').dataset.tip = `格擋值 ${Math.floor(P.bv || 0)} / ${ST.bv}${bvBr ? '（碎了，回滿前不吸收）' : ''}`;
  /* 精魂：魔力球左邊的弧（已預留÷總量） */
  const sv = ST.spirit ? (ST.spiritUsed / ST.spirit).toFixed(3) : '0';
  if (HV.spir !== sv) {
    $('omp').style.setProperty('--s', (HV.spir = sv));
    $('omp').dataset.tip = `精魂 ${ST.spiritUsed} / ${ST.spirit}`;
  }
  /* 狀態列（0.2.30）：圖示＋剩餘秒數或層數；負面的紅框；點一下看名字與效果 */
  const sts = fightOn() ? playerStates() : [],
    stKey = sts.map(s => s.k + (s.c || '')).join();
  if (HV.sts !== stKey) {
    HV.sts = stKey;
    $('mech').innerHTML = sts
      .map(
        s =>
          `<button class="stc ${s.bad ? 'bad' : ''}" ${s.col ? `style="border-color:${s.col}"` : ''} data-st="${esc(s.n + '：' + s.d)}" aria-label="${esc(s.n)}">${icHTML(s.ic)}<i></i>${s.c > 1 || s.sc ? `<b>${s.c}</b>` : ''}</button>`
      )
      .join('');
  }
  /* 暗色扇形順時針掃過：剩餘越少蓋越多 */
  const sb = $('mech').children;
  sts.forEach((s, i) => sb[i] && sb[i].style.setProperty('--f', s.f.toFixed(2)));
  const b = G.mobs.find(m => m.boss && !m.mini && !m.dummy) || G.mobs.find(m => m.boss && !m.dummy),
    show = !!(b && b.aggro);
  if (HV.boss !== show) {
    const bb = $('bossbar');
    bb.hidden = !(HV.boss = show);
    /* M2-12 §4：先出 44 高橫幅「{王名}現身」800 ms，再 240 ms 縮成王血條（CSS 動畫 bossin） */
    bb.classList.remove('intro');
    if (show) ($('bossn').textContent = b.D.n), void bb.offsetWidth, bb.classList.add('intro');
    /* 播完（1040 ms）拿掉 intro：「現身」兩字不留在畫面與讀屏上 */
    clearTimeout(HV.bt);
    if (show) HV.bt = setTimeout(() => bb.classList.remove('intro'), 1100);
  }
  if (show) setV($('bossbar'), 'bhp', (b.hp / b.mhp).toFixed(3));
  const pr = G.scene === 'map' && !G.bossOut;
  if (HV.pr !== pr) $('prog').hidden = !(HV.pr = pr);
  /* M2-12 修訂：離王進度當「下一個王」短期目標，寫「王 n%」（不寫波數、輪數） */
  if (pr) {
    const v = Math.min(1, G.prog / G.need);
    setV($('prog'), 'prog', v.toFixed(3));
    setT($('progt'), 'progt', `王 ${Math.floor(v * 100)}%`);
  }
  pracHud();
  const at =
    G.scene === 'hide'
      ? `藏身處 · 角色 Lv ${S.lv} · ${S.gold} 金${S.story.crow ? ` · 血霧 ${S.hunt.v}%${S.frags.mist ? `（血霧之印 ${S.frags.mist}）` : ''}` : ''}`
      : /* M2-12 §1：不寫第幾輪、王倒下也不換字（輪是後台的事） */
        `${G.nodeN || '地圖'}・${G.star || 1}★・怪物 Lv ${mobLv(G.mapT)}`;
  setT($('area'), 'at', at);
  chaseUnlock();
  idleBar();
  runBar();
  /* 營地分頁開著：每秒補畫數字變了的卡（0.5.1）；分頁列的小點跟著買得起幾件 */
  const ct = performance.now();
  if (ct - CAMP_T > 1000) (CAMP_T = ct), campRefresh(), sheetSync(), PANEL.camp && campDrawer();
  logBar();
  if (HV.ai !== AI.on) document.body.classList.toggle('ai', !!(HV.ai = AI.on));
  const au = S.auto ? 1 : 0;
  if (HV.bar !== barKey()) hudBar();
  const bu = !$('bossbar').hidden;
  if (HV.bu !== bu) document.body.classList.toggle('bossup', (HV.bu = bu));
  if (HV.au !== au) {
    HV.au = au;
    document.body.classList.toggle('mauto', !!au);
    for (const e of document.querySelectorAll('.modesw button')) {
      const on = e.dataset.a === 'auto:' + au;
      e.classList.toggle('on', on);
      e.setAttribute('aria-pressed', on);
    }
    for (const e of document.querySelectorAll('.autob')) {
      e.textContent = au ? '自動' : '手動';
      e.classList.toggle('on', !!au);
      e.setAttribute('aria-pressed', !!au);
    }
  }
  const hm = G.scene !== 'map';
  if (HV.hm !== hm) {
    HV.hm = hm;
    for (const e of document.querySelectorAll('[data-tm=home]')) e.hidden = hm;
  }
  /* 手機：血、魔力長條；「互動」只在附近有東西時出現 */
  setV($('bhp'), 'hp2', HV.hp);
  setV($('bmp'), 'mp2', HV.mp);
  setT($('bhp').lastChild, 'ht2', Math.ceil(P.hp) + ' / ' + ST.hp + (ST.es ? ` · 盾 ${Math.floor(P.es || 0)}` : ''));
  setT($('bmp').lastChild, 'mt2', mpt.replace('\n', ' '));
  if (HV.w2 !== wv) $('bhp').style.setProperty('--w', (HV.w2 = wv));
  if (TOUCH.on) {
    const near =
      (G.scene === 'hide' && (!!nearProp() || (G.portal && dist(P, G.portal) < 90))) ||
      (G.portal && G.scene === 'map' && dist(P, G.portal) < 90) ||
      G.drops.some(d => d.t > 0.3 && dist(P, d) < 110);
    if (HV.near !== near) document.querySelector('.sk[data-k=use]').classList.toggle('far', !(HV.near = near));
  }
}
/* 死亡卡的死因 */
function deathCause() {
  const h = P.lastHit;
  if (!h) return '';
  return `<p class="ddeath">死因：<b>${esc(h.n)}</b>${h.d ? ` · ${ELN[h.el] || '物理'} ${h.d} 傷害` : ''}</p>`;
}
/* 死亡卡、確認卡出現時（M0-01）：底下的面板、天賦樹、掛機卡先收起來，卡片在最上層（#over z-index 40），兩顆鈕點得到 */
function overOn(o) {
  if (o.hidden) {
    if (anyPanel()) closePanels();
    if (TREE.open) treeClose();
    $('pidle').hidden = true;
  }
  o.hidden = false;
}
/* 死掉、通關：中間的卡片 */
function hudState() {
  const o = $('over');
  const dp = $('dplate');
  dp.hidden = !(G.state === 'dead' && S.auto && G.node);
  document.body.classList.toggle('downed', G.state === 'dead');
  if (G.state === 'dead' && G.halt) {
    /* M2-40 定案（D2）：同一處連死 3 次停下，只有「繼續刷」一顆鈕（沒有回營地） */
    dp.innerHTML = `<span>${strT('dHalt', { n: DEAD_MAX })}</span><button class="btn pri" data-a="again">${STR_T.dGo}<kbd class="donly">Enter</kbd></button>`;
    dp.classList.add('halt');
    o.hidden = true;
  } else if (G.state === 'dead' && S.auto && G.node) {
    /* M2-12 §4：自動模式倒下不出卡——中下方字板，約 1.5 秒原地附近重來（ai.js 的 deadT），面板開著也一樣 */
    dp.classList.remove('halt');
    dp.innerHTML = `<span>${strT('dDown', { s: 2 })}</span>`;
    o.hidden = true;
  } else if (G.state === 'dead') {
    /* 0.4.0：原地重來（同一個地點、這一輪重抽詞）；寫出這一輪的地圖詞，看得出死在哪一組詞 */
    const again = !!G.node,
      mods = (G.card && G.card.mods) || [],
      /* M1-17：營地的「下一件事」現在買得起就給一顆鈕，按了就升（forge.js 的 data-fg） */
      up = campNextThing(),
      upB =
        up && up.e.m === 0
          ? `<button class="btn pri wide dup" data-fg="${GEN[up.k] ? `gen:${up.k}:1` : `camp:${up.k}`}">現在可以升：${esc(up.n)}<small>${esc(costTxt(up.c))}</small></button>`
          : '';
    o.innerHTML = `<div class="card dead"><h2 class="c-bad">你倒下了</h2>${deathCause()}${mods.length ? `<p class="dmods">地圖詞：${mods.map(m => esc(MAPMOD[m].t)).join('、')}</p>` : ''}<p>不扣經驗，裝備都還在。</p>
      <div class="pbtns dcol">${upB}${again ? `<button class="btn ${upB ? '' : 'pri'}" data-a="again">再試一次<small>同一個地點重新開始</small></button>` : `<button class="btn pri" data-a="home">回藏身處<small>自動刷圖暫停</small></button>`}</div></div>`;
    overOn(o);
  } else if (G.ask === 'home' && G.scene === 'map' && G.state === 'play') {
    /* 桌機：T 再按一次＝回去、Esc＝繼續刷圖（M0-04） */
    const k = t => (TOUCH.on ? '' : `<small>${t}</small>`);
    o.innerHTML = `<div class="card ask"><h2>回藏身處？</h2><p>地上的東西照樣收進倉庫。${S.auto ? '<br>自動刷圖會暫停。' : ''}</p>
      <div class="pbtns"><button class="btn pri" data-a="home">回藏身處${k('T')}</button><button class="btn" data-a="askno">繼續刷圖${k('Esc')}</button></div></div>`;
    overOn(o);
  } else o.hidden = true;
}

/* ---------- 面板 ---------- */
/* stash＝鍛造 › 通貨（M2-38 起只剩通貨，碎片頁拆掉）；chase＝追逐物品 */
const PANEL = {
  inv: false,
  stash: false,
  device: false,
  skill: false,
  craft: false,
  chase: false,
  more: false,
  node: false,
  /* M2-12 §3：刷圖中的營地升級抽屜 */
  camp: false,
  pick: 1
};
/* 清單倉庫的篩選與排序（0.4.0）：f 篩選、o 排序、n 畫幾件（每次多 BAG_STEP） */
/* f 大類、k 部位（武器是武器類別，空字串＝這一大類全部）；0.5.0 起沒有膠囊與搜尋 */
const BAG = { f: 'all', k: '', o: 'new', n: 0, sel: null };
/* 一開始畫幾件（n＝0 時）：直立 8 列，其他 120；捲到快到底自動再補 BAG_STEP 件（bagGrow），不用整片重畫 */
const BAG_STEP = 56,
  bagShown = () => BAG.n || (PORT() ? 56 : 120);
/* 手機直立（0.4.4，企劃書第 9 節）：上半看戰鬥、下半是面板，底部固定一排分頁，一次只看一個面板。
   view＝裝備面板畫哪一半（bag 戰利品／char 角色）、pick＝做裝正在挑裝備、full＝面板放大到蓋滿 */
/* slot＝角色頁選中的那一格（裝備欄鍵或 ch0～ch2），底下列出倉庫裡可以換上去的 */
const NAV = { view: 'bag', pick: 0, full: 0, slot: null };
/* M2-12 第一段 §5：6 格——角色（含戰利品，角色頁上方切「角色｜倉庫」）・鍛造・技能・天賦・營地・更多；追逐物品搬進「更多」。
   第三格是桌機鍵帽（照原本的快捷鍵；數字鍵 1／2 是喝藥，暫不綁，待決 D3） */
const NAV_T = [
  ['char', 'hero', '角色', 'I'],
  ['forge', 'hammer', STR_T.forge, 'K'],
  ['skill', 'gem', '技能', 'G'],
  ['tree', 'tree', '天賦', 'P'],
  ['craft', 'home', '營地', 'H'],
  ['more', 'menu', '更多', 'Esc']
];
/* 鍛造的三段：上次離開的段（這次遊戲）；第一次與從掛機卡、空格進來一律打造 */
let FSEG = 'make';
const FTABS = ['forge', 'temper', 'holy', 'corr', 'calam'];
const fseg = () => (PANEL.stash ? 'cur' : CRAFT.tab === 'make' ? 'make' : 'forge');
/* 現在亮哪一頁：照開著的面板推（別的入口開的面板也對得上） */
const navOn = () =>
  TREE.open || PANEL.asc
    ? 'tree'
    : PANEL.skill
      ? 'skill'
      : PANEL.stash || (PANEL.craft && CRAFT.tab !== 'camp')
        ? 'forge'
        : PANEL.craft
          ? 'craft'
          : PANEL.camp
            ? 'craft'
            : PANEL.inv
              ? 'char'
              : anyPanel()
                ? 'more'
                : '';
/* 分頁上的小亮點（0.4.7）：有天賦點或昇華點還沒用；技能（0.4.8）＝技能面板「現在可以變強」有東西 */
const navDot = k =>
  k === 'tree'
    ? ptLeft() > 0 || (S.asc ? ascLeft() > 0 : ascPoints(S) > 0)
    : k === 'craft'
      ? campReady() > 0
      : k === 'more'
        ? chaseDot()
        : /* 技能（0.5.4，考核 F3）：只在有東西可以插（空孔有會變強的輔助、開了的空技能格、放得下的光環）時亮；升級不算 */
          k === 'skill' && skTodo().some(t => !t.go.startsWith('one:'));
/* 點分頁：開那一頁；點亮著的那一頁＝收起來（「更多」底下的面板開著時點「更多」＝回到更多） */
function navGo(t) {
  /* M1-19：說明框開著時，點分頁＝收起說明框並切過去（一下就好） */
  hideTip();
  /* 天賦樹（0.4.7 起有自己的分頁）：蓋滿畫面、分頁列留著；再點一次收起來 */
  if (t === 'tree') return treeOpen();
  if (TREE.open) treeClose();
  const on = navOn() === t && (t !== 'more' || PANEL.more);
  /* 技能面板在第二、三層：再點一次分頁＝回總覽（0.4.8） */
  if (on && t === 'skill' && SKUI.view !== 'home') return skHome(), (SKUI.anim = 'back'), hudPanels();
  HP_HOLD++;
  closePanels();
  HP_HOLD--;
  NOSNAP = 1;
  if (on) return hudPanels(), (NOSNAP = 0);
  /* 做裝要同時看得到裝備的詞與通貨、技能面板很長（圓環＋說明＋升級鈕）：打開就蓋滿，把手可以縮回半版 */
  /* BASE-01：跑圖中一律半版（自動模式要看得到戰鬥），把手上拉才全版；藏身處（M2 併進營地前）營地／技能照舊蓋滿 */
  NAV.full = G.scene !== 'map' && (t === 'forge' || t === 'craft' || t === 'skill') ? 1 : 0;
  if (t === 'bag' || t === 'char') (NAV.view = t), openPanel('inv');
  else if (t === 'craft' && G.scene === 'map') openPanel('camp');
  else if (t === 'forge') act('ctab:' + FSEG);
  else if (t === 'craft') (CRAFT.tab = 'camp'), openPanel('craft');
  else openPanel(t);
  NOSNAP = 0;
}
const navHTML = () => {
  const on = navOn();
  /* 天賦樹分頁要祭壇 Lv4（0.5.1）；營地的小點寫買得起幾件 */
  return NAV_T.filter(([k]) => k !== 'tree' || campCan('tree'))
    .map(
      ([k, ic, t, key]) =>
        `<button class="${on === k ? 'on' : ''}" data-tm="nav:${k}" aria-pressed="${on === k}">${ICO[ic]}<span>${t}</span>${TOUCH.on ? '' : `<kbd>${key}</kbd>`}${navDot(k) ? (k === 'craft' ? `<i class="dot n pill" aria-label="營地 ${campReady()} 件可以升級">${campReady()}</i>` : `<i class="dot" aria-label="${k === 'skill' ? '現在可以變強' : k === 'more' ? STR_T.chaseNew : '有點數沒用'}"></i>`) : ''}</button>`
    )
    .join('');
};
/* 掛機條（M2-12 §2）：刷圖中一直在（面板開著也在，自動模式倒下也在；確認卡、手動的死亡卡蓋上來時收起）；手機只在直立（橫向太矮），桌機在左下；天賦樹蓋滿時不畫 */
const idleOn = () =>
  !!S &&
  G.scene === 'map' &&
  !TREE.open &&
  !G.ask &&
  !(G.state === 'dead' && !(S.auto && G.node)) &&
  (!TOUCH.on || PORT());
/* 半版面板開著（世界地圖是全螢幕，不算）；M2-12 起掛機條是 44 高的條，不算半版 */
const sheetOn = () => !!(PORT() && anyPanel());
/* M2-12 §1.1 直立版面：上下安全區（SAFE，main.js 的 resize 量）不放東西；底下是分頁 56＋（刷圖中）掛機條 44；
   半版面板高 min(380, 可用高−280)，戰場至少 280（390×844：沒開面板 47–710＝663、開了 47–330＝283） */
const SAFE = { t: 0, b: 0 };
const portFix = () => 56 + (G.scene === 'map' ? 44 : 0);
const sheetH = () => Math.min(380, Math.max(0, IH - SAFE.t - SAFE.b - portFix() - 280));
const portFull = () => NAV.full && anyPanel();
const cvTop = () => (PORT() && !portFull() ? SAFE.t : 0);
/* 藏身處（第二段才改營地場景）照舊：半版面板上緣在畫面高 38%（SHEET_TOP） */
const SHEET_TOP = 0.38;
const sheetTop = () => (G.scene !== 'map' ? Math.round(IH * SHEET_TOP) : IH - SAFE.b - portFix() - sheetH());
const cvH = () => (!PORT() || portFull() ? IH : (sheetOn() ? sheetTop() : IH - SAFE.b - portFix()) - SAFE.t);
function sheetSync() {
  const on = sheetOn(),
    b = document.body,
    nav = $('pnav');
  b.classList.toggle('sheet', on);
  b.classList.toggle('sheetfull', on && !!NAV.full && anyPanel());
  b.style.setProperty('--sheet-top', (on && !portFull() ? cvTop() + cvH() : 0) + 'px');
  b.style.setProperty('--idle-h', (G.scene === 'map' ? 44 : 0) + 'px');
  b.classList.toggle('inmap', G.scene === 'map');
  nav.hidden = !PORT();
  $('phand').hidden = !on || !anyPanel() || PANEL.camp;
  /* 桌機（0.4.9）：右上同一排分頁 */
  const dn = $('dnav');
  dn.hidden = TOUCH.on;
  if (!nav.hidden || !dn.hidden) {
    const h = navHTML();
    if (HV.nav !== h) (nav.hidden ? dn : nav).innerHTML = HV.nav = h;
  }
  const h = cvH(),
    t = cvTop();
  if (CV && HV.cvh !== h + ':' + t) {
    HV.cvh = h + ':' + t;
    CV.style.height = h === IH ? '' : h + 'px';
    CV.style.top = t ? t + 'px' : '';
    CV.height = Math.round(h * DPR);
    CV_NEW = 1;
  }
}
/* 這一格放得下的倉庫裝備：可能升級的排前面，再照 T、新舊 */
function slotCands(k) {
  const e = EQS.find(q => q.k === k),
    L = /^ch\d$/.test(k)
      ? S.inv.items.filter(it => it.charm)
      : e
        ? S.inv.items.filter(it => !it.charm && eqTakes(e, kindOf(it)) && (k !== 'off' || offOK(S.eq.weapon, it)))
        : [];
  return L.sort((a, b) => cantWear(a) - cantWear(b) || itemUp(b) - itemUp(a) || bagT(a) - bagT(b) || b.id - a.id);
}
const SLOT_SHOW = 21; /* 角色頁先列三列，其他按「看全部」到戰利品 */
function slotPickHTML() {
  const k = NAV.slot,
    ch = /^ch\d$/.test(k),
    cur = ch ? S.charms[+k[2]] : S.eq[k],
    L = slotCands(k),
    up = L.filter(it => itemUp(it)).length;
  return `<div class="slotp"><div class="ph2">${ch ? '護符' : EQS.find(q => q.k === k).n}<span>${cur ? `現在：${esc(itemName(cur))}` : '空的'} · 可以換的 ${L.length} 件${up ? `，<b class="c-good">▲ ${up}</b>` : ''}</span><button class="x" aria-label="收起" data-a="slotx">${ICO.x}</button></div>
  ${
    L.length
      ? `<div class="bag" data-grid="inv">${L.slice(0, SLOT_SHOW)
          .map(it => itemHTML(it, 'inv'))
          .join(
            ''
          )}</div>${L.length > SLOT_SHOW ? `<button class="btn bagmore" data-a="slotall">看全部 ${L.length} 件</button>` : ''}`
      : `<div class="bagno"><p>${strT('noCand', { s: ch ? '護符' : EQS.find(q => q.k === k).n })}</p>${ch ? '' : `<button class="btn pri wide" data-a="mkslot:${k}">${STR_T.mkSlot}</button>`}</div>`
  }</div>`;
}
/* 直立的角色頁選了一格：這件放得下那一格就優先換那一格（兩枚戒指、主手與副手） */
const slotPref = slots => (PORT() && NAV.view === 'char' && NAV.slot && slots.find(e => e.k === NAV.slot)) || null;
/* 「更多」：其他功能一格一個，底下一行寫現在的狀況 */
function moreHTML() {
  /* M1-07：還沒開的選單功能只列下一個（點了到營地那一座） */
  const nxu = nextUnlock('menu'),
    pts = ptLeft(),
    row = (tm, n, d, a) =>
      `<button class="mrow" ${a ? `data-a="${tm}"` : `data-tm="${tm}"`}><b>${n}</b><small>${d}</small></button>`;
  return `<div class="ph"><b>更多</b><span>角色 Lv ${S.lv} · ${S.gold} 金</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="mgrid">
    ${row('nav:node', '地點', esc(G.scene === 'map' && G.nodeN ? `正在刷：${G.nodeN} · ${G.star || 1}★` : '選一個地點開始刷'))}
    ${campCan('tree') ? row('tree', '天賦樹', pts > 0 ? `<span class="c-good">剩 ${pts} 點</span>` : '點數用完了') : ''}
    ${campCan('asc') ? row('f:asc', '昇華石碑', S.asc ? esc(ASC[S.asc].n) : '<span class="c-good">還沒選</span>') : ''}
    ${chaseOn() ? `<button class="mrow" data-tm="f:chase"><b>${STR_T.chase}${chaseDot() ? `<em class="cnew">${STR_T.new}</em>` : ''}</b><small>${esc(chaseSub())}</small></button>` : ''}
    ${row('f:box', '山海寶盒', '殿與王場的門票')}
    ${nxu ? `<button class="mrow" data-fg="jump:${nxu.b}"><b>下一個</b><small>${esc(nxu.t)}</small></button>` : ''}
    ${row('f:log', '掉落紀錄', `${(S.log || []).length} 筆 · 保底進度`)}
    ${row('set', '設定', '操作、音效、帳號')}
    ${G.scene === 'map' ? row('home', '回藏身處', '刷圖暫停') : ''}
    ${!inApp() && !fsOn() ? row('fs', '全螢幕', '藏起網址列') : ''}
  </div>`;
}
/* 「地點」（0.5.2，工坊與解鎖表第 7 節）：取代世界地圖的唯一入口。上面是星級（全域，上限照斥候營），
   底下一列一個節點、照區域分組；M2-07：全部列出（面板自己捲動），主幹照順序、特殊節點接在它掛的主幹後面；
   鎖著的寫條件（wWhy），下一個寫「升瞭望台 Lv n 就開」、點了去營地；其他鎖著的點了也寫原因。
   每列寫怪物 Lv 與這個地點刷過的靈魂／分（S.spm，刷過才有）、正在刷的那一列。點一列＝去那裡刷 */
function nodeHTML() {
  const st0 = wStar(S),
    spm = S.spm || {},
    nx = TRUNK_K[wFront(S) + 1],
    keys = TRUNK_K.flatMap((k, i) => [k, ...SPECIAL.filter(o => o.at === i).map(o => wKey(o.q, o.r))]);
  let g = '';
  const rows = keys
    .map(k => {
      const [q, r] = wXY(k),
        why = wWhy(S, q, r),
        n = WNODE[k],
        head = n.g !== g ? `<li class="ndg">${esc((g = n.g))}</li>` : '',
        st =
          S.world.cur === k
            ? '<em class="c-gold">正在刷</em>'
            : k === nx
              ? `<em>升瞭望台 Lv ${n.i} 就開</em>`
              : why
                ? `<em>${esc(why)}</em>`
                : '';
      return `${head}<li class="${why ? 'lock' : ''}${k === nx ? ' nx' : ''} ${S.world.cur === k ? 'on' : ''}"><button class="ndr" ${k === nx ? 'data-tm="nav:craft"' : `data-a="ngo:${k}"`}><b>${esc(wName(S, q, r))}</b><small>怪物 Lv ${wLv(q, r)}${n.i == null ? ` · ${esc(WTYPE[n.t].n)}` : ''}${spm[k] ? ` · 每分鐘 ${fmtN(spm[k])} 靈魂` : ''}</small>${st}</button></li>`;
    })
    .join('');
  return `<div class="ph"><b>地點</b><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="bagf ndst" role="radiogroup" aria-label="星級">${Array.from({ length: campN('star') }, (_, i) => `<button class="chip ${st0 === i + 1 ? 'on' : ''}" role="radio" aria-checked="${st0 === i + 1}" data-a="nstar:${i + 1}">${i + 1}★</button>`).join('')}<span class="c-dim">${STARS[st0].n[0]}～${STARS[st0].n[1]} 條地圖詞・星越多越危險、掉得越好</span></div>
  <ul class="ndl">${rows}</ul>`;
}
/* 鍛造分頁的三段（M2-38，M2-37.1）：打造永遠在；通貨（點了就用）、鍛造台（填、淬鍊、災魘）要鍛造台 Lv1 */
const CSEG = () =>
  [
    ['make', '打造', true],
    ['cur', '通貨', campCan('tab:fill')],
    ['forge', '鍛造台', campCan('tab:fill')]
  ].filter(x => x[2]);
const craftSeg = on =>
  `<span class="ftabs">${CSEG()
    .map(
      ([k, n]) => `<button class="${on === k ? 'on' : ''}" data-a="ctab:${k}" aria-pressed="${on === k}">${n}</button>`
    )
    .join('')}</span>`;
/* 鍛造的標題列：「鍛造」＋三段＋關閉（直立、桌機同一份） */
const forgeHead = on =>
  `<div class="ph"><b>${STR_T.forge}</b>${craftSeg(on)}${swapB('裝備')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>`;
/* 面板對應的解鎖鍵（M1-06）：快捷鍵、更多選單、點藏身處的物件都走 openPanel，鎖在這裡。山海寶盒在解鎖表上沒有對應的設施，campCan 照舊放行 */
const PANEL_LOCK = { asc: 'asc', box: 'box' };
function openPanel(k) {
  const lk = PANEL_LOCK[k] && lockTxt(PANEL_LOCK[k]);
  if (lk) return hudWarn(lk);
  TOUCH.front = k === 'stash' || k === 'skill' || k === 'craft' ? 'other' : 'inv';
  /* 左邊一次只開一個（倉庫／技能寶石／鍛造台），右邊是背包 */
  if (k === 'stash' || k === 'skill' || k === 'craft') {
    PANEL.stash = PANEL.skill = PANEL.craft = false;
    /* 0.4.9：技能面板自己一個（桌機也是）；鍛造旁邊要有倉庫；營地總覽（M2-38）自己一個、桌機在右欄 */
    PANEL.inv = k !== 'skill' && !(k === 'craft' && CRAFT.tab === 'camp');
    PANEL[k] = true;
  } else PANEL[k] = true;
  if (k === 'chase') chaseSeeNow();
  /* 技能面板（0.4.8）：打開一律先到總覽 */
  if (k === 'skill') skHome();
  if (k === 'asc')
    (ASCUI.v = S.asc || ASCUI.v || Object.keys(ASC)[0]), (ASCUI.n = null), (ASCUI.pick = S.asc || !PORT() ? 0 : 1);
  hideTip();
  hudPanels();
}
function closePanels() {
  PANEL.inv =
    PANEL.stash =
    PANEL.skill =
    PANEL.craft =
    PANEL.set =
    PANEL.asc =
    PANEL.box =
    PANEL.ident =
    PANEL.log =
    PANEL.chase =
    PANEL.more =
    PANEL.node =
    PANEL.camp =
      false;
  CDR.one = null;
  NAV.pick = NAV.full = 0;
  NAV.slot = null;
  CHUI.v = 0;
  clearTimeout(REV.tm);
  hideTip();
  hudPanels();
}
const anyPanel = () =>
  PANEL.inv ||
  PANEL.stash ||
  PANEL.skill ||
  PANEL.craft ||
  PANEL.set ||
  PANEL.asc ||
  PANEL.box ||
  PANEL.ident ||
  PANEL.log ||
  PANEL.chase ||
  PANEL.more ||
  PANEL.node ||
  PANEL.camp;
/* 設定：操作方向（手機）、快捷鍵／手勢一覽（取代原本左下角的操作說明） */
const KEYS_PC = [
  ['C', '自動／手動'],
  ['WASD', '移動（手動）'],
  ['滑鼠', '瞄準（手動）'],
  ['左鍵 右鍵 Q E R', '技能（手動）'],
  ['空白', '翻滾（怪物出手的瞬間翻滾＝完美閃避）'],
  ['1 ／ 2', '生命藥劑 ／ 魔力藥劑'],
  ['F', '互動、撿東西'],
  ['I ／ B', '裝備與倉庫'],
  ['G', '技能'],
  ['P', '天賦樹'],
  ['M', '地點'],
  ['K', '鍛造'],
  ['O', '鍛造 › 通貨'],
  ['H', '營地'],
  ['Y', '追逐物品（開放後）'],
  ['U', '昇華石碑'],
  ['J', '山海寶盒'],
  ['L', '掉落紀錄'],
  ['T', '回藏身處（地圖裡先確認，再按一次 T＝回去）'],
  ['Esc', '取消確認、關閉面板；都沒有時打開設定']
];
const KEYS_PORT = [
  ['按住拖', '移動（手指按哪裡，搖桿就在哪裡）'],
  ['點一下', '普攻最近的敵人（王優先）'],
  ['按住不動', '連續普攻'],
  ['快速一撥', '往那個方向翻滾'],
  ['技能鍵', '點＝自動瞄準 · 拖出去＝手動瞄準 · 拖回按鈕＝取消'],
  ['道具', '點一下看說明與動作']
];
const KEYS_LAND = [
  ['左半邊拖', '移動'],
  ['大按鈕', '普攻（按住連打）'],
  ['技能鍵', '點＝自動瞄準 · 拖出去＝手動瞄準 · 拖回按鈕＝取消'],
  ['翻滾鍵', '翻滾（怪物出手的瞬間＝完美閃避）'],
  ['道具', '點一下看說明與動作']
];
function setHTML() {
  const rows = TOUCH.on ? (PORT() ? KEYS_PORT : KEYS_LAND) : KEYS_PC,
    p = S.orient === 'p';
  return `<div class="ph"><b>設定</b><span>dungeonPOE v${VER}</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  ${
    TOUCH.on
      ? `<div class="ph2">操作方向</div><div class="gkind seg2"><button class="btn ${p ? 'on' : ''}" data-tm="port">直立</button><button class="btn ${p ? '' : 'on'}" data-tm="land">橫向</button></div><p class="sethint">直立單手操作；橫向雙手操作，視野較寬</p>`
      : ''
  }
  <div class="ph2">操作</div><div class="gkind seg2"><button class="btn ${S.auto ? 'on' : ''}" data-a="auto:1">自動<small>AI 操作角色</small></button><button class="btn ${S.auto ? '' : 'on'}" data-a="auto:0">手動<small>自己操作${TOUCH.on ? '' : '（C）'}</small></button></div>
  <div class="ph2">音效</div><div class="gkind seg2"><button class="btn ${S.mute ? '' : 'on'}" data-a="mute:0">開</button><button class="btn ${S.mute ? 'on' : ''}" data-a="mute:1">關</button></div>
  <div class="ph2">文字大小</div><div class="gkind seg2">${[100, 115, 130].map(v => `<button class="btn ${(S.fs || 100) === v ? 'on' : ''}" data-a="fs:${v}">${v}%</button>`).join('')}</div>
  <div class="ph2">畫面震動</div><div class="gkind seg2"><button class="btn ${S.shk === 0 ? '' : 'on'}" data-a="shk:1">開</button><button class="btn ${S.shk === 0 ? 'on' : ''}" data-a="shk:0">關</button></div>
  ${TOUCH.on ? `<div class="ph2">手機震動</div><div class="gkind seg2"><button class="btn ${S.vib === 0 ? '' : 'on'}" data-a="vib:1">開</button><button class="btn ${S.vib === 0 ? 'on' : ''}" data-a="vib:0">關</button></div>` : ''}
  <div class="ph2">傷害數字</div><div class="gkind">${[
    ['all', '全部'],
    ['crit', '只暴擊與受傷'],
    ['off', '關閉']
  ]
    .map(([k, n]) => `<button class="btn ${dmgN() === k ? 'on' : ''}" data-a="dmgn:${k}">${n}</button>`)
    .join('')}</div><p class="sethint">關掉的數字不影響傷害，只是不畫</p>
  <div class="ph2">${TOUCH.on ? '手勢' : '快捷鍵'}</div>
  <dl class="keyl">${rows.map(([k, d]) => `<dt>${k}</dt><dd>${d}</dd>`).join('')}</dl>
  ${acctHTML()}`;
}
/* 帳號：訪客 → 信箱＋密碼、註冊／登入；登入後顯示信箱、登出；點重設密碼信回來 → 設定新密碼 */
function acctHTML() {
  if (typeof CLOUD === 'undefined') return '';
  const dis = AUTH.busy ? ' disabled' : '',
    msg = AUTH.msg ? `<p class="sethint${AUTH.err ? ' c-bad' : ''}" role="status">${esc(AUTH.msg)}</p>` : '',
    pw = (ph, ac) =>
      `<input class="inp" id="apw" type="password" placeholder="${ph}" autocomplete="${ac}" value="${esc(AUTH.pw)}" aria-label="密碼">`;
  const body = AUTH.recovery
    ? `<div class="acct">${pw('新密碼（至少 6 個字）', 'new-password')}<button class="btn pri" data-ac="newpw"${dis}>設定新密碼</button></div>`
    : CLOUD.anon
      ? `<p class="sethint">訪客存檔只在這台裝置；用信箱註冊後，換裝置或清除網站資料都能登入取回</p>
    <div class="acct"><input class="inp" id="aem" type="email" placeholder="信箱" autocomplete="email" value="${esc(AUTH.em)}" aria-label="信箱">${pw('密碼（至少 6 個字）', 'current-password')}
    <div class="seg2 g2"><button class="btn pri" data-ac="register"${dis}>註冊</button><button class="btn" data-ac="login"${dis}>登入</button></div>
    <button class="btn mini lnk" data-ac="reset"${dis}>忘記密碼</button></div>`
      : `<div class="acct row"><span class="acem">${esc(CLOUD.email || '')}</span><button class="btn" data-ac="logout"${dis}>登出</button></div>`;
  return `<div class="ph2">帳號<span>${CLOUD.anon ? '訪客' : '已登入'} · ${esc(CLOUD.status)}</span></div>${body}${msg}`;
}
/* 重畫時保留捲動位置（選了一列，清單不彈回最上面）；KEEP 是每個面板要保留的子元素，'' 是面板本身。
   0.4.7：捲動位置在 hudPanels 一開始、還沒動到畫面時一次讀完（panelSnap），寫完再放回去——
   邊寫邊讀會每個面板強制排版一次；本來就關著的面板不讀；位置是 0 的不寫 */
const KEEP = {
  pinv: ['', '.bagf.sub'],
  pskill: ['.sk-scroll', '.sk-chips'],
  pnode: [''],
  pchase: [''],
  pasc: ['', '.ax-list'],
  plog: ['.lgl'],
  preveal: ['.rvl']
};
let SNAP = {},
  NOSNAP = 0; /* 換分頁：不留捲動位置，回到最上面 */
function panelSnap() {
  SNAP = {};
  for (const id in KEEP) {
    const el = $(id);
    if (el.hidden) continue;
    SNAP[id] = KEEP[id].map(q => {
      const n = q ? el.querySelector(q) : el;
      return n ? [n.scrollLeft, n.scrollTop] : null;
    });
  }
}
function panelHTML(el, html) {
  const keep = SNAP[el.id];
  el.innerHTML = html;
  if (keep)
    KEEP[el.id].forEach((q, i) => {
      const n = q ? el.querySelector(q) : el,
        k = keep[i];
      if (!n || !k) return;
      if (NOSNAP) {
        /* 面板本身沒有換（只換了內容），原本捲下去的要回到最上面 */
        if (!q && k[1]) n.scrollTop = 0;
        return;
      }
      if (k[0]) n.scrollLeft = k[0];
      if (k[1]) n.scrollTop = k[1];
    });
}
/* 先關再開（換分頁、功能選單）：中間那一次不重畫，等最後一次一起畫 */
let HP_HOLD = 0,
  UI_AT = -1e9 /* 上一次手指或滑鼠放開、面板被捲動的時間 */,
  UI_SKIP = 0,
  CV_NEW = 0; /* 畫布剛換了高度（被清空）：這一格一定要畫 */
function hudPanels() {
  if (!S || HP_HOLD) return;
  panelSnap();
  /* 玩家剛按下去的那一格：先把面板畫出來，戰鬥畫面晚一格再畫（game.js 的 frame） */
  if (performance.now() - UI_AT < 80) UI_SKIP = 1;
  /* 版面的 class 與畫布高度先定下來，再寫內容：反過來的話內容會排版兩次 */
  sheetSync();
  $('pset').hidden = !PANEL.set;
  $('scrim').hidden = !PANEL.set;
  /* 正在輸入帳密時不重畫（撿東西等事件會重畫面板，焦點和輸入法會被打斷） */
  if (
    PANEL.set &&
    !(
      document.activeElement &&
      document.activeElement.tagName === 'INPUT' &&
      $('pset').contains(document.activeElement)
    )
  )
    $('pset').innerHTML = setHTML();
  document.body.classList.toggle('pair', !!(PANEL.inv && (PANEL.stash || PANEL.skill || PANEL.craft)));
  document.body.classList.toggle('gxs', !!PANEL.skill);
  /* 桌機的營地總覽（0.5.4，考核 A8）：面板放寬兩欄、右邊不開戰利品 */
  const cw = !TOUCH.on && PANEL.craft && CRAFT.tab === 'camp';
  $('pcraft').classList.toggle('cwide', cw);
  if (cw) document.body.classList.remove('pair');
  $('pinv').hidden = !PANEL.inv || cw;
  $('pstash').hidden = !PANEL.stash;
  $('pasc').hidden = !PANEL.asc;
  $('pbox').hidden = !PANEL.box;
  $('preveal').hidden = !PANEL.ident;
  $('plog').hidden = !PANEL.log;
  if (PANEL.log) panelHTML($('plog'), logHTML());
  $('pskill').hidden = !PANEL.skill;
  $('pcraft').hidden = !PANEL.craft;
  if (swapOn()) {
    if (TOUCH.front === 'inv') $('pstash').hidden = $('pskill').hidden = $('pcraft').hidden = true;
    else $('pinv').hidden = true;
  }
  if (PORT()) {
    /* 直立一次只看一個面板：技能、做裝蓋住裝備面板；做裝在挑裝備（NAV.pick）時反過來只看倉庫清單 */
    if (!(PANEL.stash || PANEL.craft)) NAV.pick = 0;
    if (NAV.pick) $('pstash').hidden = $('pcraft').hidden = true;
    else if (PANEL.skill || PANEL.stash || PANEL.craft) $('pinv').hidden = true;
  }
  $('pcamp').hidden = !PANEL.camp;
  if (PANEL.camp) campDrawer();
  $('pmore').hidden = !PANEL.more;
  if (PANEL.more) $('pmore').innerHTML = moreHTML();
  idleBar(1);
  $('pnode').hidden = !PANEL.node;
  if (PANEL.node) {
    panelHTML($('pnode'), nodeHTML());
    /* 剛打開：捲到正在刷的那一列 */
    if (!HV.nsel) {
      HV.nsel = 1;
      const on = $('pnode').querySelector('li.on');
      if (on) on.scrollIntoView({ block: 'nearest' });
    }
  } else HV.nsel = null;
  if (PANEL.skill) panelHTML($('pskill'), skillHTML());
  if (PANEL.craft) $('pcraft').innerHTML = forgeHTML();
  if (PANEL.inv && !cw) panelHTML($('pinv'), invHTML());
  if (PANEL.stash) $('pstash').innerHTML = forgeHead('cur') + curPageHTML();
  if (navOn() === 'forge') FSEG = fseg();
  $('pchase').hidden = !PANEL.chase;
  if (PANEL.chase) panelHTML($('pchase'), chasePanelHTML());
  if (PANEL.asc) panelHTML($('pasc'), ascHTML());
  if (PANEL.box) $('pbox').innerHTML = boxHTML();
  if (PANEL.ident) {
    panelHTML($('preveal'), revealHTML());
    const n = $('preveal').querySelector('.new');
    if (n) n.scrollIntoView({ block: 'nearest' });
  }
}
const hudInv = () => PANEL.inv && hudPanels();
/* 手機窄螢幕：兩個面板一次只顯示一個，標題列的按鈕切換 */
const swapOn = () =>
  TOUCH.on &&
  !PORT() &&
  PANEL.inv &&
  (PANEL.stash || PANEL.skill || PANEL.craft) &&
  (NARROW || (PANEL.skill && LAND()));
const swapB = n => (swapOn() ? `<button class="x sw" data-tm="swap">${n}</button>` : '');
/* 裝備欄的位置（照 PoE 的人形擺法），單位 px */
/* 裝備欄的位置（照 PoE 的人形擺法，緊湊版），[x, y, 寬, 高] px；右邊放角色數值 */
const EQPOS = {
  weapon: [0, 0, 72, 108],
  gloves: [0, 116, 72, 72],
  ring1: [80, 116, 36, 36],
  helm: [124, 0, 72, 72],
  chest: [124, 80, 72, 108],
  belt: [124, 196, 72, 36],
  amulet: [204, 36, 36, 36],
  ring2: [204, 116, 36, 36],
  /* 第三隻手（0.2.74 異變者）：第二枚戒指的下面，沒點亮就不畫 */
  ring3: [204, 156, 36, 36],
  off: [248, 0, 72, 108],
  boots: [248, 116, 72, 72]
};
/* 空的裝備欄：那個部位的淡圖示（取第一個同部位的基底圖） */
const slotIc = e => (BASES.find(b => b.k === e.t) || {}).ic;
const LAND = () => TOUCH.on && !PORT() && IH < 480;
/* 角色頁的穿著（0.4.9，示意頁第 9 版）：兩直欄——左邊防具（頭、胸、手、鞋、腰）、右邊武器與飾品（武器、副手、項鍊、戒指），
   中間主角（img/hero.png 第一格）與四個抗性（不夠的紅字）；護符與神格另一列。格子跟戰利品同一套角標，空的寫部位名 */
const DOLL_L = ['helm', 'chest', 'gloves', 'boots', 'belt'],
  DOLL_R = ['weapon', 'off', 'amulet', 'ring1', 'ring2', 'ring3'];
function dollCell(k) {
  const e = EQS.find(q => q.k === k);
  if (k === 'ring3' && !eqOpen(S, 'ring3')) return '';
  const it = S.eq[k],
    lock = !eqOpen(S, k);
  return `<div class="eqs ${it ? 'r' + it.r : 'emp'} ${ST.eqBad.includes(k) && !lock ? 'noreq' : ''} ${lock ? 'lock' : ''} ${NAV.slot === k ? 'sel' : ''}" data-eq="${k}" ${it ? '' : `data-tip="${e.n}${lock ? '：被昇華鎖住，退點才能用' : ''}"`}>${it ? itemHTML(it, 'eq', k) : lock ? `<span class="nm">${e.n}</span><small>${ICO.lock}</small>` : empHTML(e.n, slotCands(k), icHTML(slotIc(e)))}</div>`;
}
/* 空格（M2-38，M2-37.6）：部位的單色剪影（M2-33 換正式圖）、下緣部位名、右上候選數（有比身上強的用 --good）；不寫「空」、不用虛線 */
function empHTML(n, L, ic = '') {
  const up = L.some(it => itemUp(it));
  return `${ic ? `<span class="sil" aria-hidden="true">${ic}</span>` : ''}<span class="nm">${n}</span>${L.length ? `<em class="cn ${up ? 'c-good' : ''}">${L.length}</em>` : ''}<span class="sr">${L.length ? strT('slotAria', { s: n, n: L.length }) : ''}</span>`;
}
function dollHTML() {
  const pen = G.scene === 'map' ? resPen(mobLv(G.mapT || 1)) : 0,
    g = S.godOn != null && (S.gods || [])[S.godOn],
    /* 護符（M2-37.6）：只畫開了的格；一格都沒有（沒腰帶）整列換成一行「裝上腰帶就有護符槽 ›」，點了選腰帶格 */
    charms = charmSlots(S)
      ? [0, 1, 2]
          .filter(i => i < charmSlots(S) || S.charms[i])
          .map(i => {
            const it = S.charms[i];
            return `<div class="eqs ${it ? 'r' + it.r : 'emp'} ${NAV.slot === 'ch' + i ? 'sel' : ''}" data-eq="ch${i}">${it ? itemHTML(it, 'eq', 'ch' + i) : empHTML('護符', slotCands('ch' + i))}</div>`;
          })
          .join('')
      : `<button class="chbelt" data-a="selbelt">${STR_T.beltCharm} ›</button>`;
  return `<div class="doll2"><div class="col">${DOLL_L.map(dollCell).join('')}</div>
  <div class="mid">${[
    ['DPS', fmtN(Math.round(dps(ST)))],
    ['生命', fmtN(ST.hp)],
    ST.es ? ['能量護盾', fmtN(ST.es)] : null,
    ['護甲', fmtN(ST.armor)],
    ST.ev ? ['閃避', fmtN(ST.ev)] : null
  ]
    .filter(Boolean)
    .map(([n, v]) => `<div class="mi"><small>${n}</small><b>${v}</b></div>`)
    .join(
      ''
    )}<div class="res">${RESK.map(r => `<span class="res-${r} ${effRes(r) < 0 ? 'neg' : ''}" title="${ELN[r]}抗性${pen ? `（這一階 −${pen}%）` : ''}">${ELN[r][0]}<b>${String(effRes(r)).replace('-', '−')}%</b></span>`).join('')}</div>${
    ptLeft() > 0 ? `<button class="btn mi-b" data-tm="nav:tree">天賦 ${ptLeft()} 點未用</button>` : ''
  }</div>
  <div class="col">${DOLL_R.map(dollCell).join('')}</div></div>
  <div class="doll2x">${charms}${
    /* M2-38：弒神沒開不畫；M2-30：開了但角色不到 Lv GH_LV 畫鎖住的格子，點了講 M1-26 那一句 */
    !g && lockTxt('line:rift')
      ? ''
      : S.lv < GH_LV
        ? `<div class="eqs gh emp lock" data-lk="${lockSlotTxt('gh')}"><span class="nm">神格</span><small>${ICO.lock}</small></div>`
        : `<div class="eqs gh ${g ? 'r2' : 'emp'}" data-tip="${esc(g ? ghName(g) + '：' + ghText(g).join('、') : '神格：太歲掉的，在山海寶盒裝上')}">${g ? icHTML('z_' + g.g) : '<span class="nm">神格</span>'}</div>`
  }</div>`;
}
let CHSW = null;
function invHTML() {
  const s = ST,
    pen = G.scene === 'map' ? resPen(mobLv(G.mapT || 1)) : 0,
    land = LAND(),
    port = PORT(),
    /* 0.4.9：桌機也拆成「角色」「戰利品」兩頁（分頁列同一份）；序章第 2 步要點背包裡的劍：固定在背包分頁 */
    tb = land ? PANEL.invT || 'bag' : !NAV.pick && NAV.view === 'char' ? 'eq' : 'bag',
    /* M2-12：戰利品併進角色頁，直立、桌機也有這一組 */
    invTabs = !NAV.pick
      ? `<span class="ftabs">${[
          ['eq', '角色'],
          ['bag', '倉庫']
        ]
          .map(([k, n]) => `<button class="${tb === k ? 'on' : ''}" data-invt="${k}">${n}</button>`)
          .join('')}</span>`
      : '';
  /* M1-11：護符滿格「要換掉哪一格」：生效中的格一格一列（≥56、整列可點），底下「取消」 */
  const sw = CHSW != null && S.inv.items.find(x => x.id === CHSW);
  if (sw)
    return `<div class="ph"><b>要換掉哪一格</b><span>換上 ${esc(CHARMS[sw.charm].n)}</span></div>
  <div class="chsw">${S.charms
    .slice(0, charmSlots(S))
    .map(
      (c, i) =>
        `<button class="chsr" data-a="chsw:${i}">${c ? icHTML(itemIc(c)) : ''}<span><b>第 ${i + 1} 格</b><small>${c ? esc(CHARMS[c.charm].n) : '空'}</small></span></button>`
    )
    .join('')}</div>
  <button class="btn chsno" data-a="chswno">取消</button>`;
  CHSW = null;
  const n = S.inv.items.length,
    head = NAV.pick
      ? `<b>選一件裝備</b><span>點一下就放上去</span><button class="x" aria-label="取消" data-a="pickno">${ICO.x}</button>`
      : tb === 'eq'
        ? `<b>角色</b><span>Lv ${S.lv}・經驗 ${Math.round((100 * S.xp) / xpNeed(S.lv))}%${ptLeft() > 0 ? `・天賦 ${ptLeft()} 點未用` : ''}</span>${invTabs}${swapB(PANEL.stash ? '倉庫' : PANEL.craft ? '鍛造' : '技能')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button>`
        : `<b>戰利品</b><span>${fmtN(n)}／${fmtN(INV_CAP)}・${fmtN(S.gold)} 金</span>${invTabs}${swapB(PANEL.stash ? '倉庫' : PANEL.craft ? '鍛造' : '技能')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button>`;
  /* 0.4.9：篩選四列跟著清單捲（黏在上面會吃掉半個畫面） */
  return `<div class="ph">${head}</div>
  ${tb === 'bag' ? bagHTML() : `<div class="eqrow col">${dollHTML()}${NAV.slot ? slotPickHTML() : ''}${statsHTML(s, pen)}</div>${port ? '<div class="schint" hidden aria-hidden="true">' + ICO.down + '</div>' : ''}`}`;
}
/* 角色數值（0.4.6）：分攻擊、防禦、抗性、能力值四組，一格一項——名稱在左、數字在右對齊；沒有的項目不列。
   抗性顯示扣完這一階懲罰的（照 PoE2，上限是最大抗性） */
function statsHTML(s, pen) {
  const cell = (n, v, tip, cls) =>
      `<div ${tip ? `title="${esc(tip)}"` : ''}><span class="${cls || ''}">${n}</span><b>${v}</b></div>`,
    grp = (n, cells, note) =>
      `<section><h4>${n}${note ? `<small>${note}</small>` : ''}</h4><div class="stg">${cells.filter(Boolean).join('')}</div></section>`,
    hit = Math.round(100 * hitChance(s.acc, mobEv(S.lv)));
  return `<div class="st2">${grp('攻擊', [
    cell('DPS', fmtN(Math.round(dps(s)))),
    cell('傷害', `${Math.round(s.dmg[0])}–${Math.round(s.dmg[1])}`),
    cell('攻擊速度', s.aps.toFixed(2)),
    cell('暴擊率', `${s.crit.toFixed(1)}%${s.lukCrit ? `<small>有效 ${effCh(s.crit, 1).toFixed(1)}%</small>` : ''}`),
    cell('命中率', `${hit}%`, `命中值 ${s.acc}：對同等級普通怪的命中率；法術必定命中`)
  ])}${grp('防禦', [
    cell('生命', fmtN(s.hp)),
    s.es ? cell('能量護盾', fmtN(s.es)) : '',
    cell('護甲', fmtN(s.armor)),
    s.ev ? cell('閃避', fmtN(s.ev)) : '',
    cell('格擋', `${s.block}%${s.blockOver ? `<small>超限 +${s.blockOver}%</small>` : ''}`),
    s.defl
      ? cell(
          '偏斜',
          `${Math.round(capLuck(deflCh(15 + 6 * S.lv, s.defl), 95, s.lukDefl))}%`,
          `偏斜值 ${Math.round(s.defl)}：被擊中且沒閃避、格擋時，傷害 −40%`
        )
      : '',
    s.thornAdd[1] ? cell('荊棘', `${s.thornAdd[0]}–${s.thornAdd[1]}`) : ''
  ])}${grp('能力值', [
    ...ATTR.map(k =>
      cell(ATTN[k], s[k], `${ATTN[k]}：${{ str: '1 點 +2 生命', dex: '1 點 +8 命中值', int: '1 點 +2 魔力' }[k]}`)
    ),
    cell('精魂', `${s.spiritUsed}／${s.spirit}`)
  ])}</div>`;
}
/* ---------- 清單倉庫（0.4.0，企劃書 5.9）：一件一格，篩選、排序、批量賣出篩選到的、鎖定 ---------- */
const BAG_F = [
  ['all', '全部'],
  ['weapon', '武器'],
  ['armor', '防具'],
  ['acc', '飾品'],
  ['charm', '護符']
];
const BAG_O = [
  ['new', '最新'],
  ['T', 'T'],
  ['q', '品質']
];
/* 一件裝備的大類與部位（武器的部位＝武器類別） */
/* 部位 → 倉庫的大類（0.5.2 從過濾器搬過來） */
const KIND_GRP = {
  weapon: 'weapon',
  focus: 'armor',
  shield: 'armor',
  helm: 'armor',
  chest: 'armor',
  gloves: 'armor',
  boots: 'armor',
  quiver: 'armor',
  belt: 'acc',
  ring: 'acc',
  amulet: 'acc'
};
const bagGrp = it => (it.charm ? 'charm' : KIND_GRP[baseOf(it).k]);
const bagSub = it => (it.charm ? '' : baseOf(it).k === 'weapon' ? baseOf(it).wt : baseOf(it).k);
const bagSubN = k => WTN[k] || KINDS[k].n;
const bagHit = it => (BAG.f === 'all' || bagGrp(it) === BAG.f) && (!BAG.k || bagSub(it) === BAG.k);
/* 篩選列（桌機、手機共用）：第一列大類＋可以疊加的條件，選了大類第二列是它的部位（只列倉庫裡有的，寫幾件） */
function bagFilterHTML() {
  const chip = (a, on, t) =>
      `<button class="chip ${on ? 'on' : ''}" data-a="${a}" aria-pressed="${!!on}">${t}</button>`,
    cnt = {};
  if (BAG.f !== 'all' && BAG.f !== 'charm')
    for (const it of S.inv.items) if (bagGrp(it) === BAG.f) cnt[bagSub(it)] = (cnt[bagSub(it)] || 0) + 1;
  const subs = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
  /* 0.5.0：只剩大類、部位、排序（膠囊、計數、搜尋拿掉；倉庫只放打造後留下來的） */
  return `<div class="bagfs"><div class="bagf grp" role="tablist" aria-label="大類">${BAG_F.map(([k, t]) => chip('bagf:' + k, BAG.f === k, t)).join('')}<button class="chip sort" data-a="bagoc" aria-label="換排序">${BAG_O.find(o => o[0] === BAG.o)[1]} ▾</button></div>
  ${subs.length ? `<div class="bagf sub" role="group" aria-label="部位">${subs.map(k => chip('bagk:' + k, BAG.k === k, `${bagSubN(k)}<small>${cnt[k]}</small>`)).join('')}</div>` : ''}</div>`;
}
const bagT = it => (it.charm ? 9 : itemT(it));
function bagList() {
  const k = BAG.o;
  return S.inv.items
    .filter(bagHit)
    .sort((a, b) =>
      k === 'T' ? bagT(a) - bagT(b) || b.id - a.id : k === 'q' ? (b.q || 0) - (a.q || 0) || b.id - a.id : b.id - a.id
    );
}
/* 捲到快到底（或按「再顯示」）：把下一批接在後面，不重畫整個面板（重畫會打斷正在捲的清單） */
function bagGrow() {
  const more = $('pinv').querySelector('[data-a=bagmore]'),
    bag = more && more.previousElementSibling;
  if (!bag || !bag.classList.contains('bag')) return;
  const L = bagList(),
    n0 = bagShown();
  BAG.n = n0 + BAG_STEP;
  bag.insertAdjacentHTML(
    'beforeend',
    L.slice(n0, BAG.n)
      .map(it => itemHTML(it, 'inv'))
      .join('')
  );
  if (L.length > BAG.n) more.textContent = `再顯示 ${Math.min(BAG_STEP, L.length - BAG.n)} 件（共 ${L.length}）`;
  else more.remove();
}
/* 閒的時候先把倉庫每一件要用的算好（可能升級要整套重算一次、穿不穿得上、圖示要轉成網址）：目前這一頁先算，
   再算其他的（換篩選、往下捲才不用等）。0.4.7：沒先算的話第一次打開要算 56 件，降速 4 倍時 100 毫秒以上。
   換裝、升級、撿到東西後從頭再掃一次（算過的很快） */
let WARM_T = 0,
  WARM_I = 0,
  WARM0 = 0;
const idleRun = window.requestIdleCallback
  ? f => requestIdleCallback(f, { timeout: 200 })
  : f => setTimeout(() => f({ timeRemaining: () => 0 }), 200);
function bagWarm() {
  WARM_I = 0;
  if (!WARM_T && S) WARM_T = idleRun(warmGo);
}
function warmGo(dl) {
  WARM_T = 0;
  if (!S || IV.on) return;
  const L = bagList().slice(0, bagShown()).concat(S.inv.items.slice().reverse());
  /* 一次最多做 10 毫秒（瀏覽器說還有空就做到它說沒空）；主執行緒一直很忙時每 0.2 秒也會輪到一次 */
  const t0 = performance.now();
  for (; WARM_I < L.length; WARM_I++) {
    const it = L[WARM_I];
    itemUp(it);
    cantWear(it);
    artIconURL(itemIc(it));
    if (performance.now() - t0 > 10 && dl.timeRemaining() < 3) return void (WARM_I++, (WARM_T = idleRun(warmGo)));
  }
  /* 角色數值與技能面板第一次組字串也慢（還沒被引擎最佳化）：先空跑一次 */
  if (!WARM0) (WARM0 = 1), statsHTML(ST, 0), skillHTML();
}
/* 刷圖中撿到東西：戰利品開著時最多 0.6 秒補畫一次；手指還在面板上（正在捲、正在點）就再等，不打斷操作 */
let BAG_T = 0;
function bagDirty() {
  bagWarm();
  if (!PANEL.inv || BAG_T) return;
  BAG_T = setTimeout(function go() {
    if (performance.now() - UI_AT < 500 || DR) return (BAG_T = setTimeout(go, 300));
    BAG_T = 0;
    hudInv();
  }, 600);
}
/* 批量賣出：這個篩選裡沒鎖定的 */
const bagSells = () => bagList().filter(it => !it.lock);
function bagHTML() {
  const L = bagList(),
    sl = L.filter(it => !it.lock),
    sum = sl.reduce((a, it) => a + sellPrice(it), 0),
    n = S.inv.items.length;
  const sel = BAG.sel != null && !NAV.pick && !curTab() && !PANEL.craft && S.inv.items.find(it => it.id === BAG.sel);
  return `${bagFilterHTML()}${n >= INV_CAP ? '<p class="bagh c-warn">滿了：打造出來的直接分解</p>' : ''}
  <div class="bag" data-grid="inv">${L.slice(0, bagShown())
    .map(it => itemHTML(it, 'inv'))
    .join(
      ''
    )}</div>${L.length ? '' : `<p class="c-dim bagno">${S.inv.items.length ? '沒有符合的裝備' : '打造出來留下的裝備會放在這裡。到營地的鍛造台按「打造」。'}</p>`}
  ${L.length > bagShown() ? `<button class="btn bagmore" data-a="bagmore">再顯示 ${Math.min(BAG_STEP, L.length - bagShown())} 件（共 ${L.length}）</button>` : ''}
  ${NAV.pick ? '' : `<div class="foot ${sel ? 'sel' : ''}">${sel ? cmpHTML(sel) + cmpActs(sel) : `${PORT() ? '' : '<div class="sell" data-sell="1">拖到這裡分解</div>'}<button class="btn" data-a="bagsell" ${sl.length ? '' : 'disabled'} title="分解這個篩選裡沒鎖定的裝備：回材料、靈魂與金">分解篩選到的 ${sl.length} 件 · ${sum} 金</button>`}</div>`}`;
}
/* 需求不夠、穿不上（倉庫格子變暗） */
const NQC = new Map(); /* 物品 id → [身上這一套的簽名, 結果]：倉庫一次畫上百格，換裝或升級才重算 */
function cantWear(it) {
  if (it.charm) return false;
  const sig = upSig(S),
    c = NQC.get(it.id);
  if (c && c[0] === sig) return c[1];
  const e = EQS.find(q => eqTakes(q, baseOf(it).k)),
    v = !!e && eqLack(S, it, e.k).length > 0;
  NQC.set(it.id, [sig, v]);
  return v;
}
/* 0.4.10：昇華先只開前兩個（做減法）；已經選了別的照樣看得到 */
const ASC_SHOW = ['wind', 'iron'],
  ascList = () => Object.entries(ASC).filter(([id]) => ASC_SHOW.includes(id) || id === S.asc);
/* 這件最好的詞是 T 幾（沒有詞＝0）；跟這件物品等級能出的上限一樣就亮底 */
const bestA = it => (it.a && it.a.length ? Math.min(...it.a.map(a => a.T)) : 0);
function itemHTML(it, src, eqk) {
  const b = bestA(it),
    mark = it.charm
      ? ''
      : (it.lock && src === 'inv' ? `<i class="bk" aria-label="鎖定">${ICO.lock}</i>` : '') +
        (it.frac
          ? '<i class="bs fr" aria-label="破裂">★</i>'
          : it.mem
            ? '<i class="bs mm" aria-label="追憶">◆</i>'
            : it.cor
              ? '<i class="bs co" aria-label="腐化">腐</i>'
              : '') +
        (b ? `<i class="btr ${b <= itemT(it) ? 'btop' : ''}">T${b}</i>` : '') +
        (it.chase ? '<i class="chm" aria-label="追逐物品"></i>' : '');
  return `<div class="it r${it.r} ${isSlot(src) ? 'full' : ''} ${src === 'inv' && cantWear(it) ? 'nq' : ''} ${src === 'inv' && BAG.sel === it.id ? 'on' : ''}" tabindex="0" role="button" aria-label="${esc(itemName(it))}" data-src="${src}" data-id="${it.id}" ${eqk ? `data-eqk="${eqk}"` : ''}>${icHTML(itemIc(it))}${mark}</div>`;
}
/* ---------- 換裝卡（0.4.9，示意頁第 9 版）：「這件｜身上」並排，不下判定；傷害合一欄（物理白、元素各自的顏色）、攻速、暴擊率、需求；前綴 3／後綴 3 ---------- */
const ELCLS = { fire: 'fire', cold: 'cold', light: 'light', chaos: 'chaos' };
function cmpCol(it, head) {
  const B = baseOf(it),
    b = B.b,
    m = qMul(it),
    req = itemReq(it),
    kv = [];
  if (b.dmg && !SPELLW.has(B.wt || 'sword')) {
    const segs = [`<span>${Math.round(b.dmg[0] * m)}–${Math.round(b.dmg[1] * m)}</span>`].concat(
      (it.a || [])
        .filter(a => ELCLS[a.k] && Array.isArray(a.v))
        .map(a => `<span class="${ELCLS[a.k]}"><i>／</i>${a.v[0]}–${a.v[1]}</span>`)
    );
    kv.push(
      ['傷害', `<b class="dmg">${segs.join('')}</b>`],
      ['攻速', `<b>${b.as.toFixed(2)}</b>`],
      ['暴擊率', `<b>${5 + (b.crit || 0)}%</b>`]
    );
  } else {
    const dn = { armor: '護甲', ev: '閃避', es: '能量護盾' };
    for (const k of DEFK) if (b[k]) kv.push([dn[k], `<b>${Math.round(b[k] * m)}</b>`]);
    if (b.block) kv.push(['格擋', `<b>${b.block}%</b>`]);
  }
  const rq = [
    req.lv ? `Lv ${req.lv}` : '',
    ...ATTR.map(k => (req[k] ? `${ATTN[k].slice(0, 1)} ${req[k]}` : ''))
  ].filter(Boolean);
  if (rq.length) kv.push(['需求', `<b>${rq.join('・')}</b>`]);
  const cap = sideCap(it),
    side = (pre, nm) => {
      const L = (it.a || []).filter(a => !!AFF[a.k].p === pre);
      /* 0.4.10：只列有的詞，空格寫一行「空 n／3」，卡才不會把清單整個蓋掉 */
      return `<li class="hd">${nm}<small>${L.length}／${Math.min(3, cap)}</small></li>${L.map(
        a =>
          `<li class="${isFrac(it, a) ? 'fr' : ''}"><b class="${ELCLS[a.k] || ''}">${esc(
            affText(a)
              .replace(/^附加 /, '')
              .replace(' 至 ', '–')
          )}</b><small>T${a.T}${isFrac(it, a) ? ' ★' : ''}</small></li>`
      ).join('')}${L.length ? '' : '<li class="none">（空）</li>'}`;
    };
  return `<div><div class="h">${icHTML(itemIc(it))}${head}${it.q ? `<span class="qq">+${Math.round(it.q * 100)}%</span>` : ''}</div>
  ${kv.map(([k, v]) => `<div class="kv"><span>${k}</span>${v}</div>`).join('')}${WY_FX[it.wy] ? `<p class="wyl">${esc(wyText(it.wy))}</p>` : ''}
  <ul>${side(true, '前綴')}${side(false, '後綴')}</ul>${it.mem ? `<p class="mem">◆ 追憶：${esc(memText(it.mem))}</p>` : ''}</div>`;
}
/* 比哪一格：放得進的欄位，直立角色頁選了一格就比那一格 */
function cmpSlot(it) {
  const B = baseOf(it),
    slots = EQS.filter(
      e => eqTakes(e, B.k) && eqOpen(S, e.k) && (e.k !== 'off' || B.k !== 'weapon' || offOK(S.eq.weapon, it))
    );
  return slotPref(slots) || (B.k === 'weapon' ? slots[0] : slots.find(e => !S.eq[e.k]) || slots[0]);
}
function cmpHTML(it, noX) {
  if (it.charm) {
    const C = CHARMS[it.charm];
    return `<div class="cmpc one"><div><div class="h">${icHTML(itemIc(it))}<span class="name rc1">${esc(C.n)}</span></div><p class="aff">${esc(C.d)}</p></div></div>`;
  }
  const e = cmpSlot(it),
    cur = e && S.eq[e.k];
  return `${noX ? '' : `<button class="x cmpx" aria-label="收起" data-a="selno">${ICO.x}</button>`}<div class="cmpc">${cmpCol(it, `<span class="name rc${it.r}">${esc(itemName(it))}</span>`)}${
    cur
      ? cmpCol(cur, `<span class="sub">身上・${esc(itemName(cur))}</span>`)
      : `<div class="emp">${e ? `${e.n}現在空著` : '沒有能放的欄位'}</div>`
  }</div>${it.chase ? `<p class="dlt chs-t">追逐物品・${esc(chaseProg(it.chase))}</p>` : ''}${eqDeltaHTML(it, e)}`;
}
/* M1-20b／M1-15b：換上去跟身上同部位的差（DPS、生命；有能量護盾的另列）＋會讓哪些招失效；不能裝寫原因（itemDelta 的 why）。
   定稿文案：「DPS +16」「生命 +20」、沒有變化、「DPS −16」（U+2212，--bad-hi）；「會讓這些招失效：｛名稱｝、｛名稱｝。」 */
const DLT = new Map();
function eqDeltaHTML(it, e = cmpSlot(it)) {
  if (!e || it.charm) return '';
  const sig = upSig(S) + ':' + e.k + ':' + S.skills.map(r => r.k).join() + ':' + campN('slots'),
    c = DLT.get(it.id);
  if (c && c[0] === sig) return c[1];
  const d = itemDelta(it, e.k),
    f = (n, v) => {
      const r = Math.round(v);
      return `<span class="${r > 0 ? 'c-good' : r < 0 ? 'c-bad' : 'c-dim'}">${n} ${r > 0 ? '+' + fmtN(r) : r < 0 ? '−' + fmtN(-r) : '沒有變化'}</span>`;
    },
    h = d.why
      ? `<p class="dlt c-bad">${esc(d.why)}</p>`
      : `<p class="dlt">${f('DPS', d.dps[0])}${f('生命', d.hp)}${d.es || ST.es ? f('能量護盾', d.es) : ''}</p>${d.breaks.length ? `<p class="dlt c-bad">會讓這些招失效：${d.breaks.map(x => esc(x.n)).join('、')}。</p>` : ''}`;
  if (DLT.size > 400) DLT.clear();
  DLT.set(it.id, [sig, h]);
  return h;
}
/* 換裝卡的動作列（黏在底部，取代「賣出篩選到的」） */
function cmpActs(it) {
  const e = it.charm ? null : cmpSlot(it),
    cur = e && S.eq[e.k],
    no = e ? eqLack(S, it, e.k).length : 0;
  /* BASE-04：分解（破壞性）不跟主行動並排，放下一行當文字鏈 */
  return `<div class="acts"><button class="btn pri" data-a="selmove" ${no ? 'disabled' : ''}>換上${cur ? `<small>${esc(itemName(cur))}進倉庫</small>` : ''}</button><button class="btn" data-a="seltip">詳細</button><button class="btn" data-a="sellock">${it.lock ? '解鎖' : '鎖定'}</button></div><button class="dlink2" data-a="selsell">分解<small>${esc(salvText(salvValue(it)).split('、').slice(0, 2).join('、'))}</small></button>`;
}
/* 技能寶石面板：5 個技能欄，每欄 1 顆技能＋2 顆輔助 */
const TAGN = {
  command: '命令',
  attack: '攻擊',
  melee: '近戰',
  proj: '投射物',
  aoe: '範圍',
  spell: '法術',
  cd: '冷卻',
  minion: '召喚',
  dot: '持續傷害',
  curse: '詛咒',
  mark: '印記',
  move: '位移',
  elem: '元素',
  occ: '秘術',
  pri: '原始',
  /* 0.2.42 第 7 批：技能分類（名字跟 TERMS 的鍵一樣，說明框的標籤可以點開） */
  strike: '打擊',
  slam: '重擊',
  nova: '新星技能',
  duration: '持續時間技能',
  flask: '藥劑技能',
  sustained: '經久技能',
  remote: '遠端技能',
  repeat: '重複技能',
  stack: '獲得疊層的技能',
  cond: '條件使用',
  channel: '引導',
  /* 第 13～16 批 */
  orb: '寶珠技能',
  herald: '捷光環技能',
  payoff: '遣散技能',
  grenade: '擲彈技能',
  banner: '鬥旗技能',
  wind: '疾風技能',
  storm: '風暴技能',
  cascade: '可爆發技能',
  final: '最終打擊',
  temp: '暫時召喚物'
};
/* 技能列第二行的數字（skills.js 的 skillNums）：傷害用元素色、魔力藍、冷卻金 */
const fmtN = n => Math.round(n).toLocaleString('en-US');
/* 窄格子裡的數字：1000 以上寫成 1.2k */
const shortN = n => (n >= 1000 ? +(n / 1000).toFixed(1) + 'k' : n);
/* 名詞變成可以點（說明框有動作時、昇華面板才用；同一段文字只標第一次） */
const TERM_RE = new RegExp(
  Object.keys(TERMS)
    .sort((a, b) => b.length - a.length)
    .join('|'),
  'g'
);
const termify = t => {
  const seen = new Set();
  /* 換行（昇華大點一行一條，2026-11-11）照樣換行 */
  return esc(t)
    .replace(TERM_RE, w => (seen.has(w) ? w : (seen.add(w), `<button class="term" data-term="${w}">${w}</button>`)))
    .replace(/\n/g, '<br>');
};
/* 花得多的動作按兩次（跟回家一樣）：第一次把按鈕換成確認文字，2.5 秒沒按就恢復；回傳 true＝確認了 */
function confirm2(b, lab) {
  if (b.dataset.armed) return true;
  const t = b.innerHTML;
  b.dataset.armed = 1;
  b.innerHTML = lab;
  b.classList.add('arm');
  setTimeout(() => {
    delete b.dataset.armed;
    b.innerHTML = t;
    b.classList.remove('arm');
  }, 2500);
  return false;
}
/* 名詞說明：疊在說明框上面，貼著被點的字 */
function showTerm(el) {
  const w = el.dataset.term;
  showTip(`<b>${esc(w)}</b><p>${esc(TERMS[w])}</p>`, el.getBoundingClientRect(), $('ttip'));
}
document.addEventListener('click', e => {
  const st = e.target.closest('[data-st]');
  if (st) return hudWarn(st.dataset.st);
  const iv = e.target.closest('[data-invt]');
  if (iv)
    return (
      LAND() ? (PANEL.invT = iv.dataset.invt) : (NAV.view = iv.dataset.invt === 'eq' ? 'char' : 'bag'), hudPanels()
    );
  const tm = e.target.closest('[data-term]');
  if (tm) return showTerm(tm);
  if (e.target.closest('#chase')) return chaseBnClick();
  /* 靈魂包沒有物品詳情：點橫幅開掉落紀錄（第 20 點） */
  if (e.target.closest('#banner.bn-pack')) return ($('banner').hidden = true), PANEL.log || fmenuOpen('log');
  const chs = e.target.closest('[data-chs]');
  if (chs && chs.closest('#pchase')) return (CHSEL = chs.dataset.chs), (CHUI.v = 0), hudPanels();
  if (chs) return chaseTip(chs);
  if (!e.target.closest('#ttip')) $('ttip').hidden = true;
  /* 點說明框以外：收起說明框 */
  if (!e.target.closest('#tip,#ttip') && $('tip').classList.contains('act') && !TOUCH.on) hideTip();
});
/* 昇華石碑：上面選昇華，盤面的位置跟天賦樹中間一樣，直接在這裡點；換昇華免費、點數全部退回 */
/* v 看哪個昇華、n 選中的點、pick 直立時「換昇華」的清單打開了沒（0.4.7：選好之後平常收著） */
const ASCUI = { v: null, n: null, pick: 0 };
/* 這個點為什麼不能點；空字串＝可以點或退回 */
function ascWhy(id, T) {
  if (S.at.includes(id)) return treeCanRefund(id) ? '' : '先退後面的點';
  if (treeCan(id)) return '';
  if (ascLeft() <= 0) return '昇華點用完了';
  if (T.I[id].g && S.at.some(o => T.I[o].g === T.I[id].g)) return '同一組只能選一個';
  return '要先點亮連著的點';
}
/* 說明列：選中的點的效果與點亮鈕 */
function ascCap(k, T, sel) {
  if (!sel) return `<div class="ax-cap ph0"><p>${esc(ASC[k].d)}</p></div>`;
  const cur = S.asc === k,
    start = sel.id === 'a_st',
    w = cur && !start ? ascWhy(sel.id, T) : '',
    on = cur && S.at.includes(sel.id),
    gn = sel.g && T.N.filter(n => n.g === sel.g).length,
    txt = sel.big === 1 ? termify(sel.d) : start ? '昇華的起點' : esc(statLines(sel.s).join(' · '));
  return `<div class="ax-cap" data-n="${sel.id}"><div><b>${esc(sel.n)}</b><i>${sel.big === 1 ? '昇華大點' : ''}${gn ? ` · ${['', '', '二選一', '三選一'][gn]}` : ''}</i><p>${txt}</p></div>${
    cur && !start
      ? `<button class="btn ${on ? '' : 'pri'}" data-ax="t:${sel.id}" ${w ? `disabled title="${esc(w)}"` : ''}>${w || (on ? '退回這一點' : `點亮<small>剩 ${ascLeft()} 點</small>`)}</button>`
      : ''
  }</div>`;
}
/* ---------- 直立的昇華（0.4.7 重做）----------
   昇華的規則其實是「選 4 個大點，每個大點前面固定一個小點，所以一個 2 點」。以前照天賦樹畫成一張 13～25 個圓點的盤面，
   玩家要在 22px 的點上戳 8 次、對照下面的清單才知道每個點是什麼。手機上不畫盤面：
   上面是這個昇華與 4 個位子，下面一張卡一個大點（圖示、名字、效果、附帶的小點），按卡片上的按鈕就連同小點一起點亮。
   還沒選昇華／按「換昇華」＝15 個昇華一列一個，寫著它在做什麼；點一個先看內容，底下一顆「成為 X」 */
/* 從起點走出去：每個點離起點幾步、上一個點是誰；每個大點的前一個大點、附帶的小點、第一步走哪一條 */
function ascMap(T) {
  const dist = { a_st: 0 },
    par = {},
    q = ['a_st'];
  for (let i = 0; i < q.length; i++)
    for (const o of T.ADJ[q[i]] || []) if (!(o in dist)) (dist[o] = dist[q[i]] + 1), (par[o] = q[i]), q.push(o);
  const big = {};
  for (const n of T.N) {
    if (n.big !== 1) continue;
    let pre = null,
      root = n.id,
      sm = [];
    for (let x = par[n.id]; x && x !== 'a_st'; x = par[x]) {
      root = x;
      if (T.I[x].big === 1) pre = pre || x;
      else if (!pre) sm.push(x);
    }
    big[n.id] = { pre, root, sm };
  }
  return { dist, par, big };
}
/* 要點亮這個大點得先點哪些（最短的路，含它自己）；已經點亮＝空 */
function ascPath(T, id) {
  const have = new Set(S.at);
  if (have.has(id)) return [];
  const prev = new Map([[id, null]]),
    q = [id];
  for (let i = 0; i < q.length; i++)
    for (const o of T.ADJ[q[i]] || []) {
      if (have.has(o)) {
        const out = [];
        for (let x = q[i]; x; x = prev.get(x)) out.push(x);
        return out;
      }
      if (!prev.has(o)) prev.set(o, q[i]), q.push(o);
    }
  return [];
}
/* 這個大點現在的狀態：on 已選（why＝不能退的原因）、can 可以選（cost 幾點）、no 不能選（why） */
function ascBig(T, M, id) {
  const n = T.I[id];
  if (S.at.includes(id)) return { st: 'on', why: treeCanRefund(id) ? '' : '後面還有選的：先退後面的' };
  const path = ascPath(T, id),
    cost = path.length,
    other = path.find(p => p !== id && T.I[p].big === 1),
    same = n.g && S.at.find(o => T.I[o].g === n.g),
    bg = S.at.filter(o => T.I[o] && T.I[o].big === 1).length;
  let why = '';
  if (same) why = `同一組已經選了「${T.I[same].n}」`;
  else if (bg >= 4) why = '已經選滿 4 個';
  else if (other) why = `要先選「${T.I[other].n}」${T.I[other].g ? '或同一組的另一個' : ''}`;
  else if (ascLeft() < cost) why = ascLeft() <= 0 ? '昇華點用完了' : `要 ${cost} 點，還差 ${cost - ascLeft()} 點`;
  else if (!ascFeasible(T, [...S.at, ...path])) why = '這樣選最後湊不滿 4 個';
  return { st: why ? 'no' : 'can', why, cost, path };
}
/* 選一個大點：連同路上的小點一起點亮 */
function ascTake(id) {
  const T = ascT(),
    b = ascBig(T, null, id);
  if (b.st !== 'can') return hudWarn(b.why || '已經選了');
  const why = eqUnloadWhy(S, [...S.at, ...b.path]);
  if (why) return hudWarn(why);
  S.at.push(...b.path);
  sfx('equip');
  treeChanged();
}
/* 退回一個大點：它的小點沒有別的大點在用就一起退 */
function ascDrop(id) {
  const T = ascT(),
    M = ascMap(T);
  if (!treeCanRefund(id)) return hudWarn('後面還有選的：先退後面的');
  let at = S.at.filter(x => x !== id);
  for (let again = true; again; ) {
    again = false;
    for (const s of at) {
      if (s === 'a_st' || T.I[s].big) continue;
      /* 小點後面（離起點更遠）沒有亮著的點＝沒用了 */
      if (!(T.ADJ[s] || []).some(o => at.includes(o) && M.dist[o] > M.dist[s]))
        (at = at.filter(x => x !== s)), (again = true);
    }
  }
  const why = eqUnloadWhy(S, at);
  if (why) return hudWarn(why);
  S.at = at;
  sfx('equip');
  treeChanged();
}
function ascPortHTML() {
  const [sm, bg] = S.asc ? ascCount() : [0, 0],
    head = `<div class="ph"><b>昇華石碑</b><span class="ax-sum">${S.asc ? `已選 <b class="c-gold">${bg}</b>／4 · 剩 <b class="${ascLeft() > 0 ? 'c-gold' : ''}">${ascLeft()}</b> 點` : `有 <b class="c-gold">${ascPoints(S)}</b> 點`}</span>${S.at.length > 1 ? `<button class="btn mini ax-reset" data-ax="reset">重置</button>` : ''}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>`;
  /* 15 個昇華的清單 */
  if (ASCUI.pick || !ASC[ASCUI.v])
    return `${head}<div class="axl">${S.asc ? `<button class="btn axl-back" data-ax="v:${S.asc}">‹ 回到${ASC[S.asc].n}</button>` : '<p class="axl-h">選一個昇華。之後可以免費換，點數全部退回。</p>'}${ascList()
      .map(
        ([id, B]) =>
          `<button class="axl-r ${S.asc === id ? 'cur' : ''}" data-ax="v:${id}">${icHTML(B.ic)}<span><b>${B.n}${S.asc === id ? '<i>目前</i>' : ''}</b><small>${esc(B.d)}</small></span></button>`
      )
      .join('')}</div>`;
  const k = ASCUI.v,
    A = ASC[k],
    T = ascNodes(k),
    M = ascMap(T),
    cur = S.asc === k,
    nx = S.maxT <= 6 ? 31 : S.maxT <= 12 ? 63 : !S.t16 ? 83 : 0,
    picked = cur ? S.at.filter(id => T.I[id] && T.I[id].big === 1) : [],
    canMore = cur && bg < 4 && ascLeft() >= 2;
  /* 4 個位子：選了的是圖示與名字（點一下捲到那張卡），空的寫還要幾點 */
  const slots = [0, 1, 2, 3]
    .map(i => {
      const n = T.I[picked[i]];
      return n
        ? `<button class="axs-s on" data-ax="see:${n.id}">${icHTML(n.ic)}<span>${esc(n.n)}</span></button>`
        : `<span class="axs-s ${cur && i === picked.length && canMore ? 'next' : ''}"><i>${i + 1}</i></span>`;
    })
    .join('');
  const hint = !cur
    ? ''
    : bg >= 4
      ? '四個都選好了'
      : canMore
        ? `還能選 ${Math.min(4 - bg, Math.floor(ascLeft() / 2))} 個（一個 2 點）`
        : nx
          ? `下一次：第一次打倒 Lv ${nx} 地圖的王，昇華點 +2`
          : '昇華點用完了';
  /* 卡片：照從起點出去的每一條路分段；要先選別人的往右縮；同一組的包在一起 */
  const card = n => {
    const b = cur ? ascBig(T, M, n.id) : { st: 'see' },
      m = M.big[n.id],
      extra = m.sm.flatMap(s => statLines(T.I[s].s)),
      act = !cur
        ? ''
        : b.st === 'on'
          ? b.why
            ? `<p class="axc-w">${ICO.tick}已選 · ${esc(b.why)}</p>`
            : `<button class="btn" data-ax="drop:${n.id}">${ICO.tick}已選 · 退回</button>`
          : b.st === 'can'
            ? `<button class="btn pri" data-ax="take:${n.id}">選這個<small>${b.cost} 點</small></button>`
            : `<p class="axc-w">${esc(b.why)}</p>`;
    return `<div class="axc ${b.st} ${m.pre ? 'd2' : ''}" id="axc-${n.id}"><span class="axc-ic">${icHTML(n.ic)}</span><div class="axc-t"><b>${esc(n.n)}</b><p>${termify(n.d)}</p>${extra.length ? `<small>附帶　${extra.map(esc).join('、')}</small>` : ''}</div>${act ? `<div class="axc-a">${act}</div>` : ''}</div>`;
  };
  const bigs = T.N.filter(n => n.big === 1),
    roots = [...new Set(bigs.map(n => M.big[n.id].root))],
    body = roots
      .map(r => {
        const L = bigs.filter(n => M.big[n.id].root === r).sort((a, b) => M.dist[a.id] - M.dist[b.id]);
        let out = '';
        for (let i = 0; i < L.length; ) {
          const g = L[i].g;
          let j = i + 1;
          if (g) while (j < L.length && L[j].g === g) j++;
          const cs = L.slice(i, j).map(card).join('');
          out += g
            ? `<div class="axg ${M.big[L[i].id].pre ? 'd2' : ''}"><h5>${['', '', '二選一', '三選一'][j - i] || '選一個'}</h5>${cs}</div>`
            : cs;
          i = j;
        }
        return `<section class="axb">${out}</section>`;
      })
      .join('');
  return `${head}<div class="axp"><header class="axh"><span class="axh-ic">${icHTML(A.ic)}</span><div><b>${A.n}</b><p>${esc(A.d)}</p></div></header>
  ${cur ? `<div class="axs">${slots}</div>` : ''}
  <div class="axs-r"><p class="axs-t">${cur ? hint : '選 4 個大點，一個 2 點。先看看它有什麼'}</p><button class="btn" data-ax="pick">${cur ? '換昇華' : '‹ 全部昇華'}</button></div>
  ${body}</div>${cur ? '' : `<button class="btn pri ax-pick" data-a="asc:${k}">${S.asc ? `改成${A.n}（點數退回）` : `成為${A.n}`}</button>`}`;
}
function ascHTML() {
  if (PORT()) return ascPortHTML();
  const k = ASCUI.v,
    A = ASC[k],
    T = ascNodes(k),
    cur = S.asc === k,
    /* 盤面半徑：讓最遠的點剛好在圓裡 */
    R = Math.max(...T.N.map(n => Math.hypot(n.x, n.y))) + 36,
    pos = n => [50 + (n.x / (2 * R)) * 100, 50 + (n.y / (2 * R)) * 100],
    lit = id => cur && S.at.includes(id),
    st = id => (lit(id) ? 'on' : cur && treeCan(id) ? 'can' : 'off'),
    sel = T.I[ASCUI.n] || null,
    nx = S.maxT <= 6 ? 31 : S.maxT <= 12 ? 63 : !S.t16 ? 83 : 0;
  const lines = T.E.map(
      ([a, b]) =>
        `<line x1="${T.I[a].x}" y1="${T.I[a].y}" x2="${T.I[b].x}" y2="${T.I[b].y}" class="${lit(a) && lit(b) ? 'on' : ''}"/>`
    ).join(''),
    nodes = T.N.map(n => {
      const [x, y] = pos(n);
      return `<button class="ax-n b${n.big} ${st(n.id)} ${n.g ? 'grp' : ''} ${sel === n ? 'sel' : ''}" data-ax="n:${n.id}" style="left:${x}%;top:${y}%" aria-label="${esc(n.n)}">${n.ic ? icHTML(n.ic) : ''}</button>${n.big === 1 ? `<span class="ax-l ${st(n.id)}" style="left:${x}%;top:${y}%">${esc(n.n)}</span>` : ''}`;
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
        `<li>${r.n.length > 1 ? `<h5>${['', '', '二選一', '三選一'][r.n.length]}</h5>` : ''}${r.n
          .map(
            n =>
              `<div class="ax-r ${sel === n ? 'on' : ''} ${lit(n.id) ? 'lit' : ''}" data-ax="n:${n.id}" role="button" tabindex="0"><b>${esc(n.n)}</b><span>${termify(n.d)}</span></div>`
          )
          .join('')}</li>`
    ).join(''),
    [sm, bg] = S.asc ? ascCount() : [0, 0];
  const fold = false,
    tabs =
      fold && !ASCUI.pick
        ? ''
        : `<div class="ax-tabs" role="tablist">${ascList()
            .map(
              ([id, B]) =>
                `<button class="ax-tab ${id === k ? 'on' : ''} ${S.asc === id ? 'cur' : ''}" role="tab" aria-selected="${id === k}" data-ax="v:${id}">${icHTML(B.ic)}<span>${B.n}${S.asc === id && !fold ? '<i>目前</i>' : ''}</span></button>`
            )
            .join('')}</div>`;
  return `<div class="ph"><b>昇華石碑</b><span class="ax-sum">剩 <b class="c-gold">${S.asc ? ascLeft() : ascPoints(S)}</b> 點${S.asc ? ` · 小 ${sm}/4 · 大 ${bg}/4` : ''}</span>${S.at.length > 1 ? `<button class="btn mini ax-reset" data-ax="reset">重置</button>` : ''}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  ${fold ? `<div class="ax-cur">${icHTML(ASC[S.asc].ic)}<b>${ASC[S.asc].n}</b><button class="btn" data-ax="pick" aria-expanded="${!!ASCUI.pick}">${ASCUI.pick ? '收起' : '換昇華'}</button></div>` : ''}
  ${tabs}
  <div class="ax-chart"><div class="ax-disc"></div><svg viewBox="${-R} ${-R} ${2 * R} ${2 * R}" aria-hidden="true">${lines}</svg>${nodes}</div>
  <div class="ax-side">${ascCap(k, T, sel)}<ul class="ax-list">${list}${nx ? `<li class="ax-note">第一次打倒 Lv ${nx} 地圖的王：昇華點 +2。換昇華免費，點數全部退回</li>` : ''}</ul>${cur ? '' : `<button class="btn pri ax-pick" data-a="asc:${k}">${S.asc ? `改成${A.n}（點數退回）` : `成為${A.n}`}</button>`}</div>`;
}
/* 手機點盤面（0.4.7）：點與點最近只隔 27px，做不到每個 44px；改成找手指附近最近的點（34px 以內），
   第一下只選取（說明在盤面正下方），所以點歪了也不會花掉點數 */
function ascNear(ch, e) {
  const T = ascNodes(ASCUI.v),
    R = Math.max(...T.N.map(n => Math.hypot(n.x, n.y))) + 36,
    r = ch.getBoundingClientRect(),
    k = (2 * R) / r.width,
    x = (e.clientX - r.left - r.width / 2) * k,
    y = (e.clientY - r.top - r.height / 2) * k;
  let best = null,
    bd = 34 * k;
  for (const n of T.N) {
    const d = Math.hypot(n.x - x, n.y - y);
    if (d < bd) (bd = d), (best = n);
  }
  return best && best.id;
}
document.addEventListener('click', e => {
  const ch = TOUCH.on && e.target.closest('#pasc .ax-chart'),
    b = e.target.closest('[data-ax]');
  if ((!b && !ch) || e.target.closest('.term')) return;
  let [k, id] = b ? b.dataset.ax.split(':') : [];
  const cur = S.asc === ASCUI.v;
  if (ch) {
    id = ascNear(ch, e);
    if (!id) return;
    k = 'n';
  }
  if (k === 'v') (ASCUI.v = id), (ASCUI.n = null), (ASCUI.pick = 0), (ASCUI.top = 1), sfx('click');
  else if (k === 'pick') (ASCUI.pick = 1), (ASCUI.top = 1), sfx('click');
  else if (k === 'take') ascTake(id);
  else if (k === 'drop') ascDrop(id);
  else if (k === 'see') {
    const c = $('axc-' + id);
    if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return;
  } else if (k === 'n') {
    /* 盤面：桌機點一下就點亮或退回；手機第一下選取，再點同一個＝點亮（退回要按說明列的按鈕，跟天賦樹一樣）；清單只選取 */
    const lit = cur && S.at.includes(id),
      again = !TOUCH.on || (ASCUI.n === id && !lit),
      can = cur && id !== 'a_st' && (ch || b.classList.contains('ax-n')) && again;
    ASCUI.n = id;
    if (can) {
      const w = ascWhy(id, ascT());
      if (w) hudWarn(w);
      else treeToggle(id);
    }
  } else if (k === 't') treeToggle(id);
  else if (k === 'reset') {
    const why = eqUnloadWhy(S, ['a_st']);
    if (why) return hudWarn(why);
    if (!confirm2(b, '再按一次')) return;
    S.at = ['a_st'];
    treeChanged();
  }
  hudPanels();
  /* 換了一頁（清單 ↔ 某個昇華）：回到最上面 */
  if (ASCUI.top) (ASCUI.top = 0), ($('pasc').scrollTop = 0);
});
/* 滑鼠滑過點或清單列就更新說明列，不用點 */
document.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse' || !PANEL.asc) return;
  const b = e.target.closest('#pasc [data-ax^="n:"]'),
    cap = document.querySelector('#pasc .ax-cap');
  if (!b || !cap || b.dataset.ax.slice(2) === cap.dataset.n) return;
  const T = ascNodes(ASCUI.v);
  cap.outerHTML = ascCap(ASCUI.v, T, T.I[b.dataset.ax.slice(2)]);
});
/* 商人（0.2.28）：選種類賭一件，結果顯示在上面、東西進背包 */
/* ---------- 撿骨師的鑑定（8-3，企劃書 5.4.1）：免費、一鍵、一件一件翻開，越好的越晚翻；不做鑑定卷軸 ---------- */
const REV = { list: [], i: 0, tm: 0, done: false, craft: 0, sel: null };
/* 翻牌（0.2.72 鑑定開獎；0.4.1 起是回來時的摘要 offShow；0.5.0 打造的開獎）：o＝{ title, head 上面的摘要, more 底下的一行, craft＝打造模式：翻到一件就選它，底下出「這件｜身上」與換上／留／分解 } */
function revealOpen(L = identifyAll(S), o = {}) {
  if (!L.length && !o.head) return hudWarn('沒有需要鑑定的東西');
  /* 資料早就進倉庫了（關掉視窗也不會丟），翻牌只是演出 */
  Object.assign(REV, {
    list: L,
    i: 0,
    done: false,
    craft: o.craft ? 1 : 0,
    sel: null,
    title: o.title || '撿骨師的鑑定',
    head: o.head || '',
    sum: o.sum ? 1 : 0,
    chx: 0,
    more: o.more || ''
  });
  PANEL.ident = true;
  save();
  hudPanels();
  revealStep();
}
function revealStep() {
  clearTimeout(REV.tm);
  if (!PANEL.ident) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) REV.i = REV.list.length;
  if (REV.i >= REV.list.length) {
    if (!REV.done) (REV.done = true), sfx('lvup');
    return hudPanels();
  }
  const it = REV.list[REV.i++];
  if (REV.craft && !it.salv) REV.sel = it.id;
  sfx(it.frac ? 'star' : it.mem ? 'mem' : it.r === 2 ? 'flipRare' : 'flip');
  hudPanels();
  REV.tm = setTimeout(revealStep, it.frac || it.mem ? 750 : it.r === 2 ? 450 : 260);
}
/* 打造模式選中的那一件（還在倉庫裡的才算） */
const rvSel = () => (REV.craft && REV.sel != null && S.inv.items.find(x => x.id === REV.sel)) || null;
/* 選下一件還沒處理的（跳過分解掉的、換上的） */
function rvNext() {
  const i = REV.list.findIndex(x => x.id === REV.sel),
    nx = [...REV.list.slice(i + 1), ...REV.list.slice(0, Math.max(0, i))].find(x => !x.salv && S.inv.items.includes(x));
  REV.sel = nx ? nx.id : null;
}
function revealHTML() {
  const n = REV.list.length,
    sel = rvSel(),
    row = (it, k) =>
      k < REV.i
        ? `<div class="rvr r${it.r} ${k === REV.i - 1 && !REV.done ? 'new' : ''} ${it.frac ? 'frac' : it.mem ? 'mem' : ''} ${REV.craft && sel === it ? 'on' : ''} ${it.salv || (REV.craft && !S.inv.items.includes(it)) ? 'gone' : ''}" ${REV.craft && !it.salv && S.inv.items.includes(it) ? `role="button" tabindex="0" data-a="rvsel:${it.id}"` : ''}>${icHTML(itemIc(it))}<div><b class="rc${it.r}">${esc(itemName(it))}</b><small>T${itemT(it)} · 品質 ${Math.round((it.q || 0) * 100)}%${it.frac ? ' · <span class="frac">★ 破裂</span>' : ''}${it.salv ? ' · 已分解' : REV.craft && !S.inv.items.includes(it) ? ' · 換上了' : ''}</small>${it.mem ? `<small class="mem">◈ ${esc(memText(it.mem))}</small>` : ''}${it.mem2 ? `<small class="mem">◈ ${esc(memText(it.mem2))}</small>` : ''}<span class="rva">${it.a.map(a => `${esc(affText(a))} <i>T${a.T}${isFrac(it, a) ? ' ★' : ''}</i>`).join('　') || '（沒有詞綴）'}</span>${REV.craft && !it.salv && S.inv.items.includes(it) ? eqDeltaHTML(it) : ''}</div></div>`
        : `<div class="rvr un r${it.r} ${it.frac ? 'frac' : it.mem ? 'mem' : ''}">${icHTML(itemIc(it))}<div><b class="rc${it.r}">？？？</b><small>${esc(baseOf(it).n)} · T${itemT(it)}${it.frac ? ' · ★' : ''}${it.mem ? ' · ◈' : ''}</small></div></div>`;
  /* 沒有要翻的（離線卡，0.5.4 考核 E2）：不寫「0／0 件」；head 可以是函式（按了升級要重畫） */
  return `<div class="ph"><b>${esc(REV.title)}</b>${n ? `<span>${Math.min(REV.i, n)}／${n} 件</span>` : ''}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  ${typeof REV.head === 'function' ? REV.head() : REV.head}${n ? `<div class="rvl ${sel ? 'sm' : ''}">${REV.list.map(row).join('')}</div>` : ''}${REV.more ? `<p class="summ">${esc(REV.more)}</p>` : ''}
  ${
    sel
      ? `<div class="foot sel rvsel">${cmpHTML(sel, 1)}<div class="acts"><button class="btn pri" data-a="rvwear" ${cmpSlot(sel) && !eqLack(S, sel, cmpSlot(sel).k).length ? '' : 'disabled'}>換上</button><button class="btn" data-a="rvkeep">留著</button></div><button class="dlink2" data-a="rvsalv">分解<small>${esc(salvText(salvValue(sel)).split('、').slice(0, 2).join('、'))}</small></button></div>`
      : REV.sum
        ? `<div class="rvf offf">${GEN_K.some(k => genOn(k) && genAfford(k) > 0) ? '<button class="btn wide" data-a="genall">全部升級<small>產生器照最便宜的先買</small></button>' : ''}<button class="btn pri wide" data-a="close">收下</button></div>`
        : `<div class="rvf">${REV.done ? '<button class="btn pri" data-a="close">收下</button>' : '<button class="btn" data-a="rvskip">全部翻開</button>'}</div>`
  }`;
}
/* 山海寶盒（0.2.80，企劃書 4.2）：分頁酆都／心魔劫／四凶，花碎片開王場；心魔要選帶哪幾種碎片（每片一個減益） */
const BOXUI = { tab: 'fd', sel: null };
function boxHTML() {
  const F = S.frags,
    tabs = [
      ['fd', '酆都'],
      ['sin', '心魔劫'],
      ['xi', '四凶'],
      ['army', '陰兵'],
      ['god', '弒神']
    ],
    row = (k, n) =>
      `<li class="${n ? '' : 'z'}">${icHTML(FRAGS[k].ic)}<div><b>${esc(FRAGS[k].n)}</b></div><em>${n}</em></li>`,
    btn = (kind, cost) => {
      const w = arenaWhy(S, kind, BOXUI.sel);
      return `<button class="btn wm-hall ${w ? '' : 'pri'}" data-bx="go:${kind}" ${w ? 'disabled' : ''}><b>${ARENA[kind]}</b><small>${esc(w || cost)}</small></button>`;
    };
  let body = '';
  if (BOXUI.tab === 'fd')
    body = `<ul class="mpg">${[...FENG.elites, 'book'].map(k => row(k, F[k])).join('')}</ul>
      <div class="wm-halls">${btn('yama', `花 ${FENG.hun} 張勾魂令`)}${btn('uber', '四種勾魂令各 1＋生死簿')}</div>`;
  else if (BOXUI.tab === 'sin') {
    BOXUI.sel = (BOXUI.sel || []).filter(k => F[k] > 0);
    if (!BOXUI.sel.length) BOXUI.sel = SIN.emo.filter(k => F[k] > 0).slice(0, SIN.need);
    body = `<p class="fhint">選要帶進去的碎片：每片在王場加一個減益</p>
      <div class="wm-sin">${SIN.emo
        .map(k => {
          const on = BOXUI.sel.includes(k);
          return `<button class="chip ${on ? 'on' : ''}" data-bx="sf:${k}" aria-pressed="${on}" ${F[k] ? '' : 'disabled'}>${esc(SIN_FRAG[k].n.slice(0, 1))} <small>×${F[k] || 0}</small><i>${esc(SIN_FRAG[k].deb)}</i></button>`;
        })
        .join('')}</div>
      <div class="wm-halls">${btn('sanshi', `帶 ${BOXUI.sel.length} 種碎片`)}${btn('sanpeng', `7 種各 1 片＋Lv${SIN.uberLv}`)}</div>`;
  } else if (BOXUI.tab === 'army')
    body = `<ul class="mpg">${[...ARMY.gen, 'fu'].map(k => row(k, F[k])).join('')}</ul>
      <div class="wm-halls">${btn('chiyou', '三種將印各 1 個')}${btn('zhuolu', `兵符＋Lv${ARMY.uberLv}`)}</div>`;
  else if (BOXUI.tab === 'god') {
    const L = S.gods || [];
    body = `<ul class="mpg">${row('blood', F.blood)}</ul>
      <div class="wm-halls">${btn('taisui', `十二神像全亮＋${TAISUI.blood} 份神血`)}${btn('xingjun', `${TAISUI.uber} 份神血＋Lv${TAISUI.uberLv}`)}</div>
      <div class="ph2">神格<span>${L.length}／${TAISUI.keep} · 身上只能裝 1 個</span></div>
      ${
        L.length
          ? `<ul class="mpg gh-list">${L.map((g, i) => {
              const on = S.godOn === i;
              return `<li class="${on ? 'on' : ''}">${icHTML('z_' + g.g)}<div><b>${esc(ghName(g))}${on ? ' <span class="c-good">裝著</span>' : ''}</b><small>${ghText(g).map(esc).join('<br>')}</small></div><span class="gh-b"><button class="btn ${on ? '' : 'pri'}" data-bx="gh:${i}">${on ? '卸下' : '裝上'}</button>${on ? '' : `<button class="btn" data-bx="ghx:${i}">拆</button>`}</span></li>`;
            }).join('')}</ul>`
          : '<p class="fhint">太歲、太歲星君掉的神格放在這裡</p>'
      }`;
  } else
    body = `<ul class="mpg">${[...XIONG, 'eye'].map(k => row(k, F[k])).join('')}</ul>
      <div class="wm-halls">${btn('zhulong', '四凶之鱗各 1 片')}${btn('zhu9', `再加燭龍之目＋Lv${XI.uberLv}`)}</div>`;
  return `<div class="ph"><b>山海寶盒</b><span>王場 Lv ${arenaLv(S)}（你打過最高的地方）</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
    <div class="ftabs bx-tabs">${tabs.map(([k, n]) => `<button class="${BOXUI.tab === k ? 'on' : ''}" data-bx="tab:${k}">${n}</button>`).join('')}</div>
    ${body}<p class="fhint">只花碎片，不用地圖卡；王場只有王，沒有小怪。死亡不退碎片。</p>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-bx]');
  if (!b || b.disabled) return;
  const [k, v] = b.dataset.bx.split(':');
  if (k === 'tab') BOXUI.tab = v;
  else if (k === 'sf') BOXUI.sel = BOXUI.sel.includes(v) ? BOXUI.sel.filter(x => x !== v) : [...BOXUI.sel, v];
  else if (k === 'go') return openArena(v, BOXUI.sel);
  else if (k === 'gh' && S.lv < GH_LV && S.godOn !== +v) hudWarn(lockSlotTxt('gh'));
  else if (k === 'gh') (S.godOn = S.godOn === +v ? null : +v), (ST = stats()), save();
  else if (k === 'ghx') {
    if (!confirm2(b, '再按一次：拆成 200 靈魂')) return;
    const w = ghSalvage(+v);
    if (w) return hudWarn(w);
    save();
  }
  sfx('click');
  hudPanels();
});
/* 巡邏卡（0.3.0，企劃書 2.1 第 12 項）：目前區塊與節點、卡、開通、撿到、連死、停機原因；桌機是右邊的面板、手機直立是下半的抽屜（同一份 HTML） */
/* 稀有掉落的橫幅（0.4.1）：畫面上方、2.6 秒；c＝frac／mem／cur／perf（顏色） */
let BANT;
function banner(t, c, k) {
  if (c === 'chase') return chaseBn(k);
  const el = $('banner');
  if (!el) return;
  el.textContent = t;
  el.className = 'bn-' + c;
  el.hidden = false;
  clearTimeout(BANT);
  BANT = setTimeout(() => (el.hidden = true), 2600);
}
/* ---------- 追逐物品的橫幅 #chase（M2-19.2c–g）：進場 220 → 停 2800 → 退場 320；顯示中再來一件＝合併成 ×n（重新計時，從第一件起最多 5.6 秒）；
   出現 400 ms 內點了不算；桌機滑鼠停在上面暫停倒數（最多多 8 秒）。不暫停戰鬥。直立貼在半版面板上緣、桌機 top 76 全寬條、手機橫向置中 ---------- */
const CB = { st: 'idle', items: [], t0: 0, end: 0, guard: 0, hs: 0, ext: 0, tm: 0 };
const CB_IN = 220,
  CB_HOLD = 2800,
  CB_OUT = 320,
  CB_CAP = 5600,
  CB_GUARD = 400,
  CB_HOVER = 8000;
function chaseBn(k) {
  const el = $('chase'),
    now = performance.now();
  if (!el) return;
  if (CB.st === 'idle') {
    Object.assign(CB, { items: [k], t0: now, guard: now + CB_GUARD, end: now + CB_IN + CB_HOLD, hs: 0, ext: 0 });
    el.className = 'in';
    sfx('chase');
  } else {
    CB.items.push(k);
    CB.end = Math.min(now + CB_HOLD, CB.t0 + CB_CAP);
    el.classList.remove('out');
    sfx('chaseBell');
  }
  CB.st = 'on';
  $('banner').hidden = true;
  el.innerHTML = chaseBnHTML();
  el.setAttribute('aria-label', `${STR_T.chase}：${CB.items.map(chaseName).join('、')}`);
  el.hidden = false;
  chaseBnTimer();
}
function chaseBnHTML() {
  const L = CB.items,
    k = L[L.length - 1],
    n = L.length,
    one = n === 1,
    fresh = one && chaseOf().got[k] === 1;
  return `<span class="cbi">${L.slice(-2)
    .map(x => `<span class="chf">${icHTML(x)}</span>`)
    .join(
      ''
    )}</span><span class="cbt"><small>${esc(one ? STR_T.chase : strT('chaseN', { n }))}${fresh ? `<em class="cnew">${esc(STR_T.new)}</em>` : ''}</small><b>${esc(one ? chaseName(k) : n === 2 ? strT('merge2', { a: chaseName(L[0]), b: chaseName(L[1]) }) : strT('merge', { a: chaseName(L[0]), n }))}</b></span><span class="cbr">${one ? `<small>${esc(chaseProg(k))}</small>` : ''}<i aria-hidden="true">›</i><kbd class="donly">L</kbd></span>`;
}
function chaseBnTimer() {
  clearTimeout(CB.tm);
  CHASE_UNTIL = CB.hs ? Infinity : CB.end + CB_OUT + 300;
  if (!CB.hs) CB.tm = setTimeout(chaseBnOut, Math.max(0, CB.end - performance.now()));
}
function chaseBnOut() {
  const el = $('chase');
  CB.st = 'out';
  el.classList.add('out');
  CB.tm = setTimeout(chaseBnHide, reduced() ? 0 : CB_OUT);
}
function chaseBnHide() {
  clearTimeout(CB.tm);
  CB.st = 'idle';
  CB.hs = 0;
  CHASE_UNTIL = performance.now() + 300;
  $('chase').hidden = true;
}
/* 桌機懸停：暫停倒數，最多多 8 秒 */
function chaseBnHover(on) {
  const now = performance.now();
  if (CB.st !== 'on' || TOUCH.on) return;
  if (on && !CB.hs) {
    CB.hs = now;
    chaseBnTimer();
    CB.tm = setTimeout(() => chaseBnHover(0), CB_HOVER - CB.ext);
  } else if (!on && CB.hs) {
    const d = Math.min(now - CB.hs, CB_HOVER - CB.ext);
    CB.ext += d;
    CB.end += d;
    CB.hs = 0;
    chaseBnTimer();
  }
}
/* 點橫幅：王印開那一件的詳情（碎片頁那一列，製作人第 1 點）；合併的＝最新一件 */
function chaseBnClick() {
  if (performance.now() < CB.guard) return;
  const k = CB.items[CB.items.length - 1];
  chaseBnHide();
  chaseOpen(k);
}
/* HUD 的掉落紀錄（0.4.1）：最新 3 筆，30 秒後淡掉；完整的在「掉落紀錄」面板 */
const LOG_SHOW = 30000;
function logBar() {
  const now = Date.now(),
    L = (S.log || []).filter(x => now - x.t < LOG_SHOW).slice(0, 3),
    k = LOGV + ':' + L.length;
  if (HV.log === k) return;
  HV.log = k;
  $('dlog').innerHTML = L.map(x => `<p class="lg-${x.c}">${esc(x.n)}</p>`).join('');
}
const LOGN = { frac: '★', mem: '◈', cur: '通貨', perf: '完美', mid: '好胚', chase: '追逐', pack: '靈魂包' };
/* 掉落紀錄選中的那一筆（橫幅顯示中按 L：最新的追逐物品） */
let LOGSEL = null;
/* 掉落紀錄面板：保底進度（★、追憶、完美通貨）＋最近 50 筆 */
function logHTML() {
  const P = S.prd || {},
    bar = (n, v, max, t = `${v}／${max}`) =>
      `<div class="lgbar"><span>${n}</span><div class="pb" role="progressbar" aria-label="${n}保底" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${v}"><i style="width:${Math.min(100, (v / max) * 100)}%"></i></div><small>${t}</small></div>`,
    ago = t => {
      const m = Math.floor((Date.now() - t) / 60000);
      return m < 1 ? '剛剛' : m < 60 ? `${m} 分鐘前` : `${Math.floor(m / 60)} 小時前`;
    };
  return `<div class="ph"><b>掉落紀錄</b><span>最近 50 筆重點掉落</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="ph2">保底進度<span>滿了下一次必出</span></div>
  ${campCan('cur:frac') ? bar('破裂石（王）', P.fracO2 || 0, prdMax(NEW_P.frac[2])) : ''}${campCan('cur:perf') ? bar('完美石（王）', P.perfO2 || 0, prdMax(NEW_P.perf[2])) : ''}${campCan('cur:ink') ? bar('追憶之墨（王）', P.ink2 || 0, prdMax(NEW_P.ink[2])) : ''}${bar('完美通貨', P.perfC || 0, TIER_P.pity)}${chaseOf().pts || chaseN() ? bar(STR_T.chase, chasePct(), 100, chasePct() + '%') : ''}
  <ul class="lgl">${(S.log || []).map(x => `<li class="lg-${x.c} ${x === LOGSEL ? 'on' : ''}" ${x.k ? `data-chs="${x.k}" role="button" tabindex="0"` : ''}><i>${LOGN[x.c] || ''}</i><span>${esc(x.n)}</span><small>${ago(x.t)}</small></li>`).join('') || '<li class="c-dim none">這裡只記稀有掉落與通貨。上面的條是保底進度，滿了一定掉一顆。</li>'}</ul>`;
}
/* ---------- 掛機卡（0.4.9，示意頁第 9 版）：刷圖中、沒開面板時直立佔下半、桌機在左下。
   上層：再幾隻王就出來（主數字＝進度 %）；本次掛機：掛了多久、幾輪、稀有、★、追憶、通貨、金、死亡；
   底下只寫要注意的：倉庫幾成滿、抗性不夠＋怪物等級對你、每小時靈魂與離升級多久；這一輪撿到的寶排圖；最新兩筆重點掉落。
   王倒下後 30 秒換成「這一輪掉的」清單＋看戰利品／推進（不按＝照設定） ---------- */
let IDLE_T = 0;
let CAMP_T = 0;
/* 防誤觸（M2-08，UI 審查 C10）：卡剛出現、或內容換了讓按鈕移位（王倒下的清單），這之後 400 毫秒內點卡上的鈕不算 */
let IDLE_MV = 0;
function idleBar(force) {
  const el = $('pidle'),
    on = idleOn();
  if (el.hidden !== !on) {
    el.hidden = !on;
    IDLE_MV = performance.now();
    /* 直立：掛機卡出現或收起＝半版切換（畫布高度、分頁列） */
    sheetSync();
  }
  if (!on) return void (HV.idle = null);
  const now = performance.now();
  if (IDLE.open && now - IDLE.at > 6000) (IDLE.open = 0), (force = 1);
  el.classList.toggle('open', !!IDLE.open);
  if (!force && now - IDLE_T < 500) return;
  IDLE_T = now;
  const h = idleHTML();
  if (HV.idle === h) return;
  /* 只有字變＝版面沒動；標籤變了（換成王倒下的清單、多一行保底）當作按鈕可能移位 */
  const sk = x => x.replace(/>[^<]*</g, '><').replace(/\d/g, '');
  if (HV.idle && sk(HV.idle) !== sk(h)) IDLE_MV = now;
  el.innerHTML = HV.idle = h;
}
const fmtDur = ms => {
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} 小時 ${String(m % 60).padStart(2, '0')} 分` : `${m} 分`;
};
const lootScore = it =>
  (it.frac ? 40 : 0) + (it.mem ? 20 : 0) + (it.cor ? 10 : 0) + (it.r === 2 ? 8 : 0) + (t1N(it) >= 2 ? 4 : 0) + it.r;
const agoTxt = t => {
  const sec = Math.floor((Date.now() - t) / 1000);
  return sec < 5
    ? '剛剛'
    : sec < 60
      ? `${sec} 秒前`
      : sec < 3600
        ? `${Math.floor(sec / 60)} 分鐘前`
        : `${Math.floor(sec / 3600)} 小時前`;
};
const bossMob = () => G.mobs.find(m => m.boss && !m.mini && !m.dummy);
/* M2-12 §2 掛機條：收起 44 高（掛機 N 分・保底 n%・最近一筆稀有以上・展開鈕），點條展開 200 高、6 秒沒操作自動收。
   不寫輪數；掛機時間＝SES.t0（停止刷才歸零）；保底只在會累積的地點（chaseLine）；倉庫快滿、離開 60 秒–10 分那一行換掉左字 */
const IDLE = { open: 0, at: 0, msg: '', msgT: 0 };
const idleDur = ms => {
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} 時 ${String(m % 60).padStart(2, '0')} 分` : `${m} 分`;
};
/* 掉落紀錄的類別 → 形狀（稀有 ◆、傳奇 ★、追逐 印）；不只靠顏色 */
const LOG_SH = { chase: '印', frac: '★', mem: '★', perf: '★' };
const logRow = x =>
  `<span class="ilast lg-${x.c}"><i aria-hidden="true">${LOG_SH[x.c] || '◆'}</i><span>${esc(x.n)}</span></span>`;
function idleToggle() {
  IDLE.open = IDLE.open ? 0 : 1;
  IDLE.at = performance.now();
  idleBar(1);
}
function idleHTML() {
  const ses = SES || SES0(),
    dur = idleDur(Date.now() - ses.t0),
    n = chasePct(),
    ch = !!chaseLine(G.mapT),
    L = S.log || [],
    warn = IDLE.msg && Date.now() < IDLE.msgT ? IDLE.msg : S.inv.items.length >= INV_CAP * 0.9 ? STR_T.idleFull : '',
    lab = esc(strT('idleAria', { t: dur, n: ch ? n : '—' }));
  if (IDLE.open)
    return `<div class="iex" role="group" aria-label="${lab}">
    <div class="ir"><b>${strT('idleT', { t: dur })}</b><span>${strT('idleGot', { s: fmtN(ses.soul || 0), b: ses.rounds })}</span><button class="ix" data-a="idlex" aria-label="收起" aria-expanded="true">${ICO.down}</button></div>
    ${ch ? chaseHTML() : ''}
    <div class="ir il3">${L.slice(0, 3).map(logRow).join('') || `<span class="c-dim">${STR_T.idleNone}</span>`}</div>
    <div class="ir">${goalHTML()}</div></div>`;
  return `<button class="ib" data-a="idlex" aria-label="${lab}" aria-expanded="false">${warn ? `<b class="c-warn">${esc(warn)}</b>` : `<b>${strT('idleT', { t: dur })}</b>`}${ch ? `<span class="ipb ${n >= 100 ? 'full' : ''}">${strT('idlePity', { n })}<i class="pb"><i style="transform:scaleX(${n / 100})"></i></i></span>` : ''}${L[0] ? logRow(L[0]) : ''}</button><button class="ix" data-a="idlex" aria-label="展開" aria-expanded="false">${ICO.down}</button>`;
}
/* 掛機卡的追逐保底（M2-18；M2-19.4）：一行「下一件保底 n%」＋6 px 細條；只在會觸發保底的地點（怪物 Lv45 以上）有，其他地點整行不出、不留空位。
   100% 條慢慢呼吸（full）；歸零那一次條先滿格再淡掉（reset，chaseHTML.p 記上一次）；整行是一顆透明鈕（熱區 44）開掉落紀錄 */
/* 掛機卡主按鈕（D1）：「去營地・{n} 可升級」，沒有可升級只寫「去營地」 */
const goCampT = () => (campReady() ? strT('goCampN', { n: campReady() }) : STR_T.goCamp);
function chaseHTML() {
  const t = chaseLine(G.mapT),
    n = chasePct();
  if (!t) return '';
  const p = chaseHTML.p,
    cls = n >= 100 ? 'full' : p != null && n < p ? 'reset' : '';
  chaseHTML.p = n;
  return `<div class="chs"><span>${t}</span><div class="pb ${cls}" role="progressbar" aria-label="追逐保底" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n}"><i style="transform:scaleX(${cls === 'reset' ? 1 : n / 100})"></i></div><button class="chsb" data-a="chaselog" aria-label="${esc(strT('pityAria', { n }))}" data-tip="${esc(STR_T.pityTip)}"></button></div>`;
}
/* 開掉落紀錄（點保底一行；sel＝橫幅顯示中按 L：選中最新的追逐物品、展開它的詳情） */
function chaseLog(sel) {
  LOGSEL = sel ? (S.log || []).find(x => x.c === 'chase') || null : null;
  if (sel) chaseBnHide();
  if (!PANEL.log) fmenuOpen('log');
  else hudPanels();
  const li = sel && document.querySelector('#plog li.on');
  if (li) li.scrollIntoView({ block: 'nearest' }), chaseTip(li);
}
/* 王印的詳情（碎片頁點一列、點追逐橫幅）：疊在那一列旁邊 */
function chaseTip(el) {
  const k = el.dataset.chs;
  showTip(
    `<b class="chs-t rc4">${esc(chaseName(k))}</b><p>追逐物品・王印（主幹 Lv${CHASE.lv} 以上地點的輪末王掉落）</p><p>${esc(chaseProg(k))}・擁有 ×${(S.frags || {})[k] || 0}</p><p class="wyl">${esc(wyText(k))}</p>`,
    el.getBoundingClientRect(),
    $('ttip')
  );
}
/* 點追逐橫幅（製作人第 1 點）：王印＝打開碎片頁、那一列的詳情；異寶基底＝到戰利品、選那一件（換裝卡就是詳情） */
function chaseOpen(k) {
  $('banner').hidden = true;
  if (isWy(k)) return chaseGo(k);
  const it = [...S.inv.items].reverse().find(x => x.chase === k);
  if (it) act('lootsel:' + it.id);
}
/* ---------- 追逐物品面板（M2-38，M2-37.3）：王印 2×2 收集格＋保底；效果行、套到裝備、四印齊鳴等 M2-29 ----------
   開放（D8）：第一次進怪物 Lv45 以上地點或第一次拿到追逐物品。S.chase.seen＝{ on 開放了, v 開放後打開過, k 看過的王印 }，存檔版本不變；
   舊存檔沒有 seen：拿過的當作開放且看過 */
let CHSEL = null;
function chaseSeen() {
  const C = chaseOf();
  if (!C.seen) C.seen = chaseN() ? { on: 1, v: 1, k: Object.keys(C.got) } : { on: 0, v: 0, k: [] };
  return C.seen;
}
const chaseOn = () => !!S && !!chaseSeen().on;
/* 提示點：剛開放、或拿到沒看過的王印；打開面板就清（保底 100%、手上有印沒套都不另亮） */
const chaseDot = () => {
  const s = chaseSeen();
  return !!s.on && (!s.v || CHASE_POOL.trunk.some(k => chaseOf().got[k] && !s.k.includes(k)));
};
function chaseSeeNow() {
  const s = chaseSeen();
  s.v = 1;
  s.k = Object.keys(chaseOf().got);
}
/* 每格看一次：到了就開放、吐司一次 */
function chaseUnlock() {
  const s = chaseSeen();
  if (s.on || !((G.scene === 'map' && chaseLine(G.mapT)) || chaseN())) return;
  s.on = 1;
  s.v = 0;
  hudWarn(STR_T.chaseOpen);
  sheetSync();
}
/* 拿過的種類數（用語 #8 的 k；四印齊鳴的 k 是身上套著的種類數，另外算） */
const wyGot = () => CHASE_POOL.trunk.filter(k => chaseOf().got[k]).length;
const chaseSub = () => strT('chaseSub', { k: wyGot(), n: chasePct() });
/* 開追逐物品（k＝選中那一枚：橫幅點進來） */
function chaseGo(k) {
  chaseUnlock();
  if (k) CHSEL = k;
  if (!PANEL.chase) fmenuOpen('chase');
  else hudPanels();
}
/* M2-29 介面：套在有效裝備上的王印種類（同名只算一次；失效欄位不算）、那一枚現在的效果字、齊鳴那一行 */
const wyOn = () =>
  new Set(
    EQS.filter(
      e =>
        S.eq[e.k] &&
        WY_FX[S.eq[e.k].wy] &&
        !(ST.eqBad || []).includes(e.k) &&
        (e.k !== 'off' || offOK(S.eq.weapon, S.eq.off))
    ).map(e => S.eq[e.k].wy)
  );
function wyText(k) {
  const f = WY_FX[k],
    m = wyOn().size >= WY_SET.n ? WY_SET.mul : 1;
  return strT('wyLine', {
    n: chaseName(k),
    t: statText(f.k, f.k === 'leech' ? Math.round(f.v * m * 10) / 10 : Math.round(f.v * m))
  });
}
const wySetText = (k = wyOn().size) =>
  strT('wySet', { k, n: WY_SET.n }) + (k >= WY_SET.n ? strT('wySetOn', { m: WY_SET.mul }) : '');
/* 物品說明、比較框：王印那一行＋齊鳴進度（只在有王印的裝備） */
const wyHTML = it =>
  WY_FX[it.wy] ? `<p class="wyl">${esc(wyText(it.wy))}</p><p class="wys">${esc(wySetText())}</p>` : '';
/* 追逐物品面板的套用流程：v 0 收集格／'pick' 選裝備／'swap' 換掉舊印確認（slot＝那一格） */
const CHUI = { v: 0, slot: null };
function wyPickHTML(k) {
  const F = S.frags || {},
    L = EQS.filter(e => eqOpen(S, e.k) && S.eq[e.k]),
    ok = L.filter(e => S.eq[e.k].r === 1 || S.eq[e.k].r === 2),
    row = e => {
      const it = S.eq[e.k],
        bad = (ST.eqBad || []).includes(e.k),
        why = it.r !== 1 && it.r !== 2 ? STR_T.wyOnly : '';
      return `<button class="wyr" data-a="wy:eq:${e.k}" data-wyk="${e.k}" ${why || !F[k] ? 'disabled' : ''}>${it.wy ? `<span class="chf">${icHTML(itemIc(it))}</span>` : `<span class="wyi">${icHTML(itemIc(it))}</span>`}<span><b class="rc${it.r}">${esc(itemName(it))}</b><small>${esc(it.wy ? wyText(it.wy) : e.n)}</small>${why || bad ? `<small class="${why ? 'c-off' : 'c-warn'}">${why || STR_T.wyBad}</small>` : ''}</span></button>`;
    };
  return `<div class="ph"><button class="x wyb" aria-label="返回" data-a="wy:back">‹</button><b>${esc(strT('wyPick', { n: chaseName(k) }))}</b><span>${strT('wyHave', { n: F[k] || 0, m: EQS.filter(e => S.eq[e.k] && S.eq[e.k].wy === k).length })}</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <p class="chnote ${F[k] ? '' : 'c-off'}">${F[k] ? STR_T.wyPickSub : STR_T.wyNoUse}</p>${ok.length ? '' : `<p class="chnote c-warn">${STR_T.wyNoEq}</p>`}
  <div class="wyl-list">${[...ok, ...L.filter(e => !ok.includes(e))].map(row).join('')}</div>`;
}
function wySwapHTML(k) {
  const it = S.eq[CHUI.slot];
  return `<div class="ph"><button class="x wyb" aria-label="返回" data-a="wy:back">‹</button><b>${esc(strT('wyPick', { n: chaseName(k) }))}</b><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="wysw"><p><b class="rc${it.r}">${esc(itemName(it))}</b></p><p class="c-bad">${esc(strT('wySwap', { n: chaseName(it.wy) }))}</p>
  <div class="pbtns"><button class="btn pri" data-a="wy:back">取消<kbd class="donly">Esc</kbd></button><button class="btn wyx" data-a="wy:ok">${STR_T.wySwapOk}<kbd class="donly">Enter</kbd></button></div></div>`;
}
function wyAct(a) {
  const k = CHSEL;
  if (a === 'back') CHUI.v = CHUI.v === 'swap' ? 'pick' : 0;
  else if (a === 'use') CHUI.v = 'pick';
  else if (a.startsWith('eq:')) {
    CHUI.slot = a.slice(3);
    if (S.eq[CHUI.slot] && S.eq[CHUI.slot].wy) CHUI.v = 'swap';
    else return wyApply(k);
  } else if (a === 'ok') return CHUI.v === 'swap' && wyApply(k);
  hudPanels();
}
/* 套上（M2-23 §10）：吐司、chaseBell；剛好湊齊四種多一行吐司、疊 lvup；那一格外框印角往內收 240ms 再彈一下 280ms（減少動態只換外框） */
function wyApply(k) {
  const e = CHUI.slot,
    it = S.eq[e],
    n0 = wyOn().size,
    why = it ? wangyinSet(it, k) : STR_T.wyOnly;
  if (why) return hudWarn(why);
  CHUI.v = 'pick';
  changed();
  const n1 = wyOn().size;
  hudWarn(strT('wyDone', { n: chaseName(k), i: itemName(it) }));
  sfx('chaseBell');
  if (n1 >= WY_SET.n && n0 < WY_SET.n) setTimeout(() => (hudWarn(wySetText(n1)), sfx('lvup')), 900);
  hudPanels();
  const f = document.querySelector(`#pchase [data-wyk="${e}"] .chf`);
  if (!f || !f.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  f.animate(
    { inset: ['-8px', '-1px'], opacity: [0, 1] },
    { duration: 240, easing: 'ease-out', pseudoElement: '::before' }
  );
  f.animate({ transform: ['scale(1)', 'scale(1.05)', 'scale(1)'] }, { duration: 280, delay: 240, easing: 'ease-out' });
  /* sig_wyapply（M2-33-3a §4.2）：96 CSS px 置中蓋在那一格，一格一格播（圖 4 欄 × 3 列），播完拿掉 */
  if (!sigFx('sig_wyapply')) return;
  const F = FXS.sig_wyapply,
    r = f.getBoundingClientRect(),
    d = document.createElement('div');
  d.style.cssText = `position:fixed;left:${r.left + r.width / 2 - F.w / 2}px;top:${r.top + r.height / 2 - F.h / 2}px;width:${F.w}px;height:${F.h}px;pointer-events:none;z-index:99;image-rendering:pixelated;background:url(${fxImg('sig_wyapply').src})`;
  document.body.appendChild(d);
  const fr = i => ({
    backgroundPosition: `${-(i % F.cols) * F.w}px ${-Math.floor(i / F.cols) * F.h}px`,
    easing: 'steps(1, end)'
  });
  d.animate([...Array(F.n).keys(), F.n - 1].map(fr), (F.n * 1000) / F.fps).onfinish = () => d.remove();
}
function chasePanelHTML() {
  if (CHUI.v && CHSEL && isWy(CHSEL))
    return CHUI.v === 'swap' && S.eq[CHUI.slot] ? wySwapHTML(CHSEL) : wyPickHTML(CHSEL);
  CHUI.v = 0;
  const C = chaseOf(),
    F = S.frags || {},
    n = chasePct(),
    here = G.scene === 'map' && chaseLine(G.mapT),
    worn = k => EQS.filter(e => S.eq[e.k] && S.eq[e.k].wy === k).length,
    cell = k =>
      C.got[k]
        ? `<button class="chc ${CHSEL === k ? 'on' : ''}" data-chs="${k}" aria-pressed="${CHSEL === k}"><span class="chf">${icHTML(k)}</span><b>${esc(chaseName(k))}</b><small>${strT('wyHave', { n: F[k] || 0, m: worn(k) })}</small></button>`
        : `<button class="chc no ${CHSEL === k ? 'on' : ''}" data-chs="${k}" aria-pressed="${CHSEL === k}"><span class="chsil">${icHTML(k)}</span><b>${esc(chaseName(k))}</b><small>${STR_T.wyNone}</small></button>`;
  return `<div class="ph"><b>${STR_T.chase}</b><span>${strT('pool', { p: STR_T.poolWy, k: wyGot(), N: CHASE_POOL.trunk.length })}</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="chg">${CHASE_POOL.trunk.map(cell).join('')}</div>
  <p class="wys chset ${wyOn().size >= WY_SET.n ? 'full' : ''}">${esc(wySetText())}</p>
  <div class="chs chp"><span>${strT('pity', { n })}</span><div class="pb ${n >= 100 ? 'full' : ''}" role="progressbar" aria-label="追逐保底" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n}"><i style="transform:scaleX(${n / 100})"></i></div></div>
  <p class="chnote">${STR_T.pityTip}</p>${here ? '' : `<p class="chnote">${STR_T.pityNo}</p>`}${
    CHSEL && isWy(CHSEL)
      ? `<div class="chact"><p class="wyl">${esc(wyText(CHSEL))}</p>${F[CHSEL] > 0 ? `<button class="btn pri" data-a="wy:use">${STR_T.wyUse}</button>` : `<button class="btn" disabled>${STR_T.wyNoUse}</button>`}</div>`
      : ''
  }`;
}
/* 營地現在買得起的（王倒下的卡、離線卡；考核 D2、E3）：一件一列（圖示、名字、給什麼、升級鈕），最多 n 件；pri＝第一件用主要鈕 */
function campUpsHTML(n = 3, pri = true) {
  const L = campThings().filter(t => t.e.m === 0);
  return L.length
    ? `<div class="cups">${L.slice(0, n)
        .map(
          (t, i) =>
            `<div class="cup">${icHTML(CAMP_IC[t.k])}<span><b>${esc(t.n)}</b><small>${esc(t.d)}</small></span><button class="btn ${pri && !i ? 'pri' : ''}" data-fg="${GEN[t.k] ? `gen:${t.k}:1` : `camp:${t.k}`}">升級<small>${esc(costTxt(t.c))}</small></button></div>`
        )
        .join('')}${L.length > n ? `<p class="sub">還有 ${L.length - n} 件買得起：到營地看</p>` : ''}</div>`
    : '';
}
/* 目前在刷的地方（0.4.0，HUD 上排）：通知（連死退回）、退回後的「再推一次」、藏身處的「繼續刷」 */
function runBar() {
  const W = S.world,
    cur = W.cur || (wOpen(S) ? null : wGoal(S)),
    k = (W.note ? 'n' + W.note : '') + (G.scene === 'hide' && cur ? 'r' + cur : '');
  if (HV.run === k) return;
  HV.run = k;
  const el = $('run');
  el.hidden = !k;
  el.innerHTML = `${W.note ? `<span class="c-warn">${esc(W.note)}</span><button class="x" data-a="runok" aria-label="知道了">${ICO.x}</button>` : ''}${G.scene === 'hide' && cur ? `<button class="btn pri" data-a="resume">繼續刷 ${esc(wName(S, ...wXY(cur)))}</button>` : ''}`;
}
/* ---------- 找道具、移動道具 ---------- */
/* 通貨面板開在通貨頁（點倉庫的裝備＝放進中間） */
const curTab = () => PANEL.stash;
const GRIDS = () => ({ inv: S.inv });
/* 欄位：裝備欄 eq（key＝欄位名；護符欄是 ch0～） */
/* 欄位：身上的裝備與護符（eq）、倉庫通貨頁中間那格（cur，0.3.6，S.curIt） */
const isSlot = src => src === 'eq' || src === 'cur';
function slotGet(src, key) {
  if (src === 'cur') return S.curIt;
  /* 護符欄是 ch0～（胸甲 chest 也是 ch 開頭，不能只看前兩個字） */
  return /^ch\d$/.test(key) ? S.charms[+key[2]] : S.eq[key];
}
function slotSet(src, key, it) {
  if (src === 'cur') return (S.curIt = it);
  return /^ch\d$/.test(key) ? (S.charms[+key[2]] = it) : (S.eq[key] = it);
}
/* 放進這個欄位缺什麼能力值（0.2.42）：裝備看等級與能力值（eqLack） */
function slotLack(src, key, it) {
  if (src === 'cur') return [];
  return /^ch\d$/.test(key) ? [] : eqLack(S, it, key);
}
const slotFits = (src, key, it) =>
  src === 'cur'
    ? !it.charm && !it.uid
    : it.uid
      ? false
      : /^ch\d$/.test(key)
        ? !!it.charm && +key[2] < charmSlots(S)
        : eqOpen(S, key) &&
          eqTakes(
            EQS.find(q => q.k === key),
            kindOf(it)
          ) &&
          (key !== 'off' || offOK(S.eq.weapon, it)) &&
          !slotLack(src, key, it).length;
function findItem(src, id, eqk) {
  if (isSlot(src)) return slotGet(src, eqk);
  return GRIDS()[src].items.find(o => o.id === +id);
}
function takeOut(src, it, eqk) {
  if (isSlot(src)) slotSet(src, eqk, null);
  else {
    const g = GRIDS()[src];
    g.items.splice(g.items.indexOf(it), 1);
  }
}
/* 放回去：欄位放回原欄位，清單放回倉庫 */
const putBack = (src, it, eqk) => (isSlot(src) ? (slotSet(src, eqk, it), true) : invPut(S.inv, it));
function changed() {
  /* 換上雙手武器（或換掉弓）：不合規的副手收進背包 */
  if (!offOK(S.eq.weapon, S.eq.off)) {
    const off = S.eq.off;
    const why = offWhy(S.eq.weapon, off);
    if (invPut(S.inv, off)) (S.eq.off = null), hudWarn(why + '：副手收進倉庫');
    else hudWarn('倉庫滿了，副手無效：' + why);
  }
  /* 光環欄沒有格數：拿掉的空格收起來，尾巴永遠留一個空格給下一顆；技能面板選的光環跟著走（編號會變） */
  const selA = S.auras[SKUI.ai];
  S.auras.splice(0, S.auras.length, ...S.auras.filter(Boolean), null);
  SKUI.ai = selA ? S.auras.indexOf(selA) : Math.min(SKUI.ai, S.auras.length - 1);
  const hpF = P.hp / ST.hp,
    /* M1-15：這一下讓技能失效了（換裝、退天賦…）：HUD 立刻講，不用等進圖 */
    badOf = () => S.skills.map((_, i) => !!slotBad(i)),
    bad0 = badOf();
  ST = stats();
  if (badOf().some((b, i) => b && !bad0[i])) slotBadWarn();
  P.hp = Math.min(ST.hp, Math.max(1, hpF * ST.hp));
  P.mp = Math.min(ST.mp, P.mp);
  bagWarm();
  save();
  hudPanels();
  hudBar();
}
/* 點一下：倉庫→裝上、身上→收進倉庫；Shift＋點＝鎖定（0.4.0） */
function lockToggle(it) {
  it.lock = it.lock ? 0 : 1;
  sfx('click');
  save();
  hudPanels();
}
function quickMove(src, it, eqk, shift) {
  if (shift && src === 'inv') return lockToggle(it);
  /* 鍛造台開著：點裝備＝放上鍛造台（打造的翻牌開著時是真的換上） */
  if (PANEL.craft && !PANEL.ident && CRAFT.tab !== 'make') return craftPick(src, it, eqk);
  if (isSlot(src)) {
    if (!invPut(S.inv, it)) return hudWarn('倉庫滿了');
    slotSet(src, eqk, null);
  } else if (curTab() && src === 'inv') {
    /* 倉庫的通貨頁開著：點背包的裝備＝放進中間（原本在中間的放回背包） */
    if (!slotFits('cur', 'cur', it)) return hudWarn(it.uid ? '找撿骨師鑑定：未鑑定的不能做裝' : '護符不能做裝');
    const old = S.curIt;
    takeOut('inv', it);
    S.curIt = it;
    if (old && !invPut(S.inv, old)) return (S.curIt = old), invPut(S.inv, it), hudWarn('倉庫滿了');
    TOUCH.front = 'other'; /* 手機窄螢幕：放好就切回通貨頁 */
  } else if (it.charm) {
    /* 護符：放進第一個空的護符槽 */
    const i = S.charms.findIndex((c, j) => !c && j < charmSlots(S));
    /* M1-11：有腰帶、護符格全滿＝跳「要換掉哪一格」（倉庫面板裡的半版卡）；沒腰帶照舊一句 */
    if (i < 0) {
      if (!charmSlots(S)) return hudWarn('要先裝腰帶才有護符槽');
      CHSW = it.id;
      return PANEL.inv ? hudInv() : openPanel('inv');
    }
    takeOut('inv', it);
    S.charms[i] = it;
  } else {
    if (it.uid) return hudWarn('找撿骨師鑑定：未鑑定的不能裝備');
    const k = kindOf(it),
      slots = EQS.filter(e => eqTakes(e, k) && eqOpen(S, e.k)),
      /* 武器：主手空著放主手；主手有武器、而且副手能拿這把（權杖、雙持）才放副手，不然換掉主手 */
      e =
        slotPref(slots) ||
        (k === 'weapon'
          ? EQS.find(q => q.k === (S.eq.weapon && !S.eq.off && offOK(S.eq.weapon, it) ? 'off' : 'weapon'))
          : slots.find(e => !S.eq[e.k]) || slots[0]);
    if (!e) return EQS.some(q => eqTakes(q, k)) && hudWarn('這一欄被昇華鎖住，退掉昇華點才能用');
    if (e.k === 'off' && !offOK(S.eq.weapon, it)) return hudWarn(offWhy(S.eq.weapon, it));
    const lack = eqLack(S, it, e.k);
    if (lack.length) return hudWarn('不符合需求：' + lackTxt(lack));
    const old = S.eq[e.k];
    takeOut('inv', it);
    S.eq[e.k] = it;
    if (old) invPut(S.inv, old);
  }
  sfx('equip');
  changed();
}
/* 分解（0.5.0 取代賣掉，craft.js 的 salvageDo）：回材料、靈魂、金（黃裝另回 1 顆蛻變或增幅） */
/* 直接換到指定的欄位（打造的開獎：跟卡上比的那一格）；換下來的進倉庫 */
function equipTo(it, k) {
  const lack = eqLack(S, it, k);
  if (lack.length) return hudWarn('不符合需求：' + lackTxt(lack));
  if (k === 'off' && !offOK(S.eq.weapon, it)) return hudWarn(offWhy(S.eq.weapon, it));
  const old = S.eq[k];
  takeOut('inv', it);
  S.eq[k] = it;
  if (old) invPut(S.inv, old);
  sfx('equip');
}
function sell(src, it, eqk) {
  takeOut(src, it, eqk);
  hudWarn(`分解：${salvText(salvageDo(it))}`);
  sfx('coin');
  changed();
}
/* 丟到地上：地圖裡掉在腳邊（離開地圖就消失、過濾器不會再撿回來）；藏身處直接消失，稀有以上要丟兩次 */
let DROP_ARM = 0;
function dropFloor(src, it, eqk) {
  if (G.scene === 'hide' && it.r >= 2 && DROP_ARM !== it.id) {
    DROP_ARM = it.id;
    hudWarn('再丟一次會消失');
    return hudPanels();
  }
  DROP_ARM = 0;
  takeOut(src, it, eqk);
  if (G.scene === 'hide') hudWarn('丟掉了');
  else {
    dropAt(P.x, P.y, { it, nopick: 1 });
    for (const d of G.drops) delete d.full;
  }
  sfx('pick');
  changed();
}
/* 批量分解（0.4.0 批量賣出）：目前篩選到、沒鎖定的全部分解 */
function sellAll() {
  const L = bagSells(),
    v = salvZero();
  for (const it of L) takeOut('inv', it), salvAdd(v, salvageDo(it));
  BAG.n = 0;
  hudWarn(`分解 ${L.length} 件：${salvText(v)}`);
  sfx('coin');
  changed();
}

/* ---------- 拖曳 ---------- */
let DR = null;
function dragStart(e, el) {
  const src = el.dataset.src,
    eqk = el.dataset.eqk,
    it = findItem(src, el.dataset.id, eqk);
  if (!it) return;
  /* 直立（0.4.4）：道具只用點的，不拖曳（nodrag）；手指滑過格子是捲清單，不能把裝備拖到戰鬥畫面上丟掉 */
  DR = {
    src,
    eqk,
    it,
    el,
    w: 1,
    h: 1,
    gx: 0,
    gy: 0,
    x0: e.clientX,
    y0: e.clientY,
    moved: false,
    shift: e.shiftKey,
    nodrag: PORT()
  };
  el.setPointerCapture && el.setPointerCapture(e.pointerId);
}
function dragMove(e) {
  if (!DR) return;
  if (!DR.moved && Math.hypot(e.clientX - DR.x0, e.clientY - DR.y0) < 6) return;
  if (DR.nodrag) return void (DR.swiped = 1);
  if (!DR.moved) {
    DR.moved = true;
    hideTip();
    DR.el.classList.add('lift');
    const g = (DR.ghost = document.createElement('div'));
    g.className = 'ghost it r' + DR.it.r;
    g.style.width = DR.w * C + 'px';
    g.style.height = DR.h * C + 'px';
    g.innerHTML = icHTML(itemIc(DR.it));
    document.body.appendChild(g);
  }
  DR.ghost.style.transform = `translate(${e.clientX - DR.gx * C - C / 2}px, ${e.clientY - DR.gy * C - C / 2}px)`;
  DR.tgt = dropTarget(e);
  markTarget();
}
/* 放開的位置：格子（哪一格）、裝備欄、賣出區 */
function dropTarget(e) {
  const under = document.elementsFromPoint(e.clientX, e.clientY);
  /* 放在面板外面的畫面上＝丟到地上 */
  if (under[0] && under[0].id === 'cv') return { k: 'floor' };
  for (const el of under) {
    if (el.dataset.sell) return { k: 'sell', el };
    if (el.dataset.eq) return { k: 'eq', src: 'eq', eqk: el.dataset.eq, el, ok: slotFits('eq', el.dataset.eq, DR.it) };
    if (el.dataset.cur) return { k: 'eq', src: 'cur', eqk: 'cur', el, ok: slotFits('cur', 'cur', DR.it) };
    /* 清單倉庫：從欄位拖回來＝收進倉庫（清單裡拖來拖去沒有位置可言） */
    if (el.dataset.grid) return { k: 'grid', src: el.dataset.grid, el, ok: DR.src !== el.dataset.grid };
  }
  return null;
}
function markTarget() {
  document
    .querySelectorAll('.eqs.good,.eqs.bad,.sell.on,.bag.good')
    .forEach(n => n.classList.remove('good', 'bad', 'on'));
  const t = DR.tgt;
  DR.ghost.classList.toggle('floor', !!t && t.k === 'floor');
  if (!t || t.k === 'floor') return;
  if (t.k === 'sell') t.el.classList.add('on');
  else if (t.k === 'eq') t.el.classList.add(t.ok ? 'good' : 'bad');
  else t.el.classList.toggle('good', t.ok);
}
function dragEnd(e) {
  if (!DR) return;
  const d = DR,
    cancel = e.type === 'pointercancel',
    t = d.moved && !cancel && dropTarget(e);
  DR = null;
  if (d.ghost) d.ghost.remove();
  if (!d.moved) {
    if (cancel || d.swiped) return null;
    /* 直立的做裝在挑裝備：點一件直接放上去，回到做裝 */
    if (NAV.pick && d.src === 'inv') return (NAV.pick = 0), quickMove(d.src, d.it, d.eqk), hudPanels();
    /* 0.4.9：觸控在倉庫裡點一件＝選它，底下出換裝卡（做裝、通貨頁照舊放上去）；桌機（M2-38，M2-37.2）點一下＝換上，比較看懸停的說明框，Shift＋點照舊鎖定 */
    if (TOUCH.on && d.src === 'inv' && !curTab() && !PANEL.craft && !(PORT() && NAV.view === 'char')) {
      BAG.sel = BAG.sel === d.it.id ? null : d.it.id;
      hideTip();
      hudInv();
      return;
    }
    return TOUCH.on ? tapItem(d) : quickMove(d.src, d.it, d.eqk, d.shift);
  }
  if (t && t.k === 'floor') return dropFloor(d.src, d.it, d.eqk);
  if (t && t.k === 'eq' && !t.ok) {
    const lk = d.it.uid ? [] : slotLack(t.src, t.eqk, d.it);
    if (d.it.uid) hudWarn(t.src === 'cur' ? '找撿骨師鑑定：未鑑定的不能做裝' : '找撿骨師鑑定：未鑑定的不能裝備');
    else if (t.src === 'cur' && d.it.charm) hudWarn('護符不能做裝');
    else if (lk.length) hudWarn('不符合需求：' + lackTxt(lk));
  }
  if (!t || (t.k !== 'sell' && !t.ok)) return hudPanels();
  if (t.k === 'sell') return sell(d.src, d.it, d.eqk);
  takeOut(d.src, d.it, d.eqk);
  if (t.k === 'eq') {
    const old = slotGet(t.src, t.eqk);
    slotSet(t.src, t.eqk, d.it);
    /* 換下來的放回拿起來的地方（從另一個欄位拖來的，放得進就互換） */
    const back =
      old && (isSlot(d.src) && slotFits(d.src, d.eqk, old) ? (slotSet(d.src, d.eqk, old), true) : invPut(S.inv, old));
    if (old && !back) {
      slotSet(t.src, t.eqk, old);
      putBack(d.src, d.it, d.eqk);
      hudWarn('放不下換下來的東西');
    }
  } else invPut(S.inv, d.it);
  sfx('equip');
  changed();
}

/* ---------- 說明框 ---------- */
/* 需求列（0.2.42）：夠的是一般字、缺的是紅字；有缺再加一行紅字「缺什麼」；req 全空就不顯示；lack 是 [[名稱, 現有, 需求]] */
/* 說明框的前綴 3 格、後綴 3 格（空格畫出來；白、藍裝多出來的格寫「—」）：每條後面寫 T，破裂詞加 ★ 並用特別顏色 */
function tipSlots(it) {
  const cap = sideCap(it),
    side = (pre, nm) => {
      const L = it.a.filter(a => !!AFF[a.k].p === pre);
      return `<div class="tcol"><span class="ts">${nm}</span>${Array.from({ length: 3 }, (_, j) =>
        L[j]
          ? `<span class="tl ${isFrac(it, L[j]) ? 'frac' : ''}">${esc(affText(L[j]))} <i>T${L[j].T}${isFrac(it, L[j]) ? ' ★' : ''}${L[j].m ? ` ×${L[j].m.toFixed(2)}` : ''}</i></span>`
          : `<span class="tl emp">${j >= cap ? '—' : '（空）'}</span>`
      ).join('')}</div>`;
    };
  return `<div class="tslots">${side(true, '前綴')}${side(false, '後綴')}</div>`;
}
/* 最後一個說明框怎麼重畫（升級後原地更新） */
let TIPRE = null,
  TIPH = 0;
function itemTip(it, cmp) {
  if (it.charm) {
    const C = CHARMS[it.charm];
    return `<b class="rc1">${esc(C.n)}</b><small>護符 · 放在腰帶的護符槽</small><p class="aff">${esc(C.d)}</p><p class="base">充能 ${Math.floor(it.ch || 0)}／${C.max} · 每次用 ${C.use} · 殺怪充能</p><p class="hint">條件達成時自動觸發${G.scene === 'hide' ? ' · 賣價 3 金' : ''}</p>`;
  }
  const B = baseOf(it),
    un = !!it.uid;
  /* 企劃書 5.9：基底層一行（T、品質、孔）、固定詞、追憶、前綴 3 格、後綴 3 格（空格畫出來）、腐化詞、符文；
     未鑑定只看得到基底層、固定詞、追憶（前後綴要找撿骨師） */
  /* 0.4.6 精簡（使用者：文字太雜、看不出跟身上的差別）：
     標題下一行（稀有度 種類 · T · 品質 · 孔）→ 不能裝的原因 → **換上去的差別**（一格一項，放最上面）→ 追憶 → 前後綴 → 腐化／災魘 → 基底與需求（小字）。
     拿掉：物品等級（T 就是它換算的）、還沒有內容的符文那一行、手機上的賣價（賣出鈕上有） */
  const wk = EQS.find(e => S.eq[e.k] === it) || EQS.find(e => eqTakes(e, B.k)),
    worn = !!(wk && S.eq[wk.k] === it),
    lack = wk ? eqLack(S, it, wk.k) : [],
    req = itemReq(it),
    reqP = [req.lv ? `等級 ${req.lv}` : '', ...ATTR.map(k => (req[k] ? `${ATTN[k]} ${req[k]}` : ''))].filter(Boolean);
  let html = `<b class="rc${it.r}">${esc(itemName(it))}</b><small>${RARN[it.r]} ${B.k === 'weapon' ? WTN[B.wt] || KINDS[B.k].n : KINDS[B.k].n} · <span class="tt">T${itemT(it)}</span>${baseLayers(it) ? ' · ' + baseLayers(it) : ''}${it.frac ? ' · <span class="frac">★ 破裂</span>' : ''}${un ? ' · <span class="c-warn">未鑑定</span>' : ''}</small>`;
  /* M2-18 追逐標記：打造、套王印之後都還在（it.chase） */
  if (it.chase) html += `<p class="chs-t">追逐物品・${esc(chaseProg(it.chase))}</p>`;
  html += wyHTML(it);
  if (lack.length) html += `<p class="c-bad">${worn ? '已失效，數值不算' : '不能裝上'}：${lackTxt(lack)}</p>`;
  if (cmp && !un && !lack.length) {
    /* 只看真的放得上去的欄位：弓放不進副手，比較的是武器欄；直立的角色頁選了一格就比那一格 */
    const slots = EQS.filter(
        e => eqTakes(e, B.k) && eqOpen(S, e.k) && (e.k !== 'off' || B.k !== 'weapon' || offOK(S.eq.weapon, it))
      ),
      e = slotPref(slots) || (B.k === 'weapon' ? slots[0] : slots.find(e => !S.eq[e.k]) || slots[0]);
    if (e) {
      const cur = S.eq[e.k],
        a = ST;
      S.eq[e.k] = it;
      const b = stats();
      S.eq[e.k] = cur;
      const rows = [
        ['每秒傷害', dps(b) - dps(a)],
        ['生命', b.hp - a.hp],
        ['能量護盾', b.es - a.es],
        ['護甲', b.armor - a.armor],
        ['閃避', b.ev - a.ev],
        ['暴擊率', b.crit - a.crit],
        ...RESK.map(r => [ELN[r] + '抗', b.res[r] - a.res[r]]),
        ['移動速度', b.spd - a.spd]
      ].filter(r => Math.abs(r[1]) >= 0.5);
      html += `<div class="cmp2"><span>${cur ? `換掉 <i class="rc${cur.r}">${esc(itemName(cur))}</i>` : `${e.n}現在空著，裝上去`}</span>${
        rows.length
          ? `<div class="cg">${rows.map(([n, v]) => `<div><span>${n}</span><b class="${v > 0 ? 'c-good' : 'c-bad'}">${v > 0 ? '▲' : '▼'} ${fmtN(Math.abs(v))}</b></div>`).join('')}</div>`
          : '<em>數值一樣</em>'
      }</div>`;
    }
  }
  if (it.mem) html += `<p class="mem">◈ 追憶：${esc(memText(it.mem))}</p>`;
  if (it.mem2) html += `<p class="mem">◈ 追憶：${esc(memText(it.mem2))}</p>`;
  html += un ? `<p class="hint c-warn">回藏身處找撿骨師免費鑑定，鑑定後才能裝備與做裝</p>` : tipSlots(it);
  if (!un && it.cw && it.cw.length) html += `<p class="aff cor">${it.cw.map(c => esc(cwText(c))).join('<br>')}</p>`;
  if (!un && it.cal)
    html += `<p class="aff"><span class="c-good">${esc(calText(it.cal.g))}</span>${it.cal.b ? `<br><span class="c-bad">${esc(calText(it.cal.b, 1))}</span>` : ''}</p>`;
  html += `<p class="base">${baseText(it).filter(Boolean).join(' · ')}${reqP.length && !lack.length ? `<br>需求：${reqP.join(' · ')}` : ''}</p>`;
  if (!TOUCH.on) html += `<p class="hint">${G.scene === 'hide' && !un ? '賣價 ' + sellPrice(it) + ' 金' : ''}</p>`;
  return html;
}
/* 說明框貼在 a（被點或滑過的東西的方框）旁邊：右 → 左 → 下 → 上，第一個放得下的；
   都放不下就放上下比較寬的那邊、縮短高度（裡面可以捲），永遠不蓋住 a */
function showTip(html, a, t = $('tip')) {
  const M = 8,
    G = 8;
  t.innerHTML = html;
  t.style.maxHeight = '';
  /* 先回到左上再量寬：貼著畫面右緣時會被擠窄，量到的寬度比放好後小，就會蓋住東西 */
  t.style.left = t.style.top = '0';
  t.hidden = false;
  let { width: w, height: h } = t.getBoundingClientRect();
  const W = IW,
    H = IH;
  /* 比畫面還高（手機橫向的寶石說明＋按鈕）：縮短、裡面可以捲 */
  if (h > H - 2 * M) (h = H - 2 * M), (t.style.maxHeight = h + 'px');
  const cx = clamp((a.left + a.right) / 2 - w / 2, M, W - w - M),
    cy = clamp((a.top + a.bottom) / 2 - h / 2, M, H - h - M),
    up = a.top - G - M,
    dn = H - a.bottom - G - M;
  let x, y;
  if (a.right + G + w <= W - M) (x = a.right + G), (y = cy);
  else if (a.left - G - w >= M) (x = a.left - G - w), (y = cy);
  else if (h <= dn) (x = cx), (y = a.bottom + G);
  else if (h <= up) (x = cx), (y = a.top - G - h);
  else if (t.classList.contains('act') && Math.max(up, dn) < 240) (x = cx), (y = cy);
  /* 點出來的說明框：上下都太窄（手機橫向）才蓋住被點的東西（點別處關掉）；不然照下面縮短、裡面捲 */ else {
    t.style.maxHeight = Math.max(up, dn) + 'px';
    x = cx;
    y = dn >= up ? a.bottom + G : M;
  }
  t.style.left = x + 'px';
  t.style.top = y + 'px';
}
function hideTip() {
  $('tip').hidden = true;
  $('ttip').hidden = true;
  $('tip').classList.remove('act');
  TOUCH.sel = null;
}

/* ---------- 輸入 ---------- */
function inputInit() {
  /* 0.4.7：記下玩家上一次碰面板的時間（hudPanels 的跳過一格、bagDirty 的延後重畫用）；戰利品捲到快到底自動補下一批 */
  const ui = e => {
    if (e.target === document || (e.target.closest && e.target.closest('.panel, #tip, #pnav, #ptree')))
      UI_AT = performance.now();
  };
  for (const ev of ['pointerdown', 'pointerup', 'touchmove'])
    addEventListener(ev, ui, { capture: true, passive: true });
  addEventListener(
    'scroll',
    e => {
      const el = e.target;
      if (!el || !el.closest || !el.closest('.panel')) return;
      UI_AT = performance.now();
      /* 門檻要比一批的高度（8 列）小，不然每捲一下就補一批、停不下來 */
      if (el.id === 'pinv' && el.scrollHeight - el.scrollTop - el.clientHeight < 250) bagGrow();
    },
    { capture: true, passive: true }
  );
  /* 鍵盤操作道具：Tab 到道具看說明，Enter 或空白鍵等於點一下 */
  addEventListener('focusin', e => {
    const el = e.target.closest && e.target.closest('.it');
    const it = el && findItem(el.dataset.src, +el.dataset.id, el.dataset.eqk);
    if (it && !$('tip').classList.contains('act'))
      showTip(itemTip(it, el.dataset.src !== 'eq'), el.getBoundingClientRect());
  });
  addEventListener(
    'focusout',
    e => e.target.closest && e.target.closest('.it') && !$('tip').classList.contains('act') && hideTip()
  );
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.target.matches && e.target.matches('[role=button]:not(.it)') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      return e.target.click();
    }
    if (e.target.classList && e.target.classList.contains('it') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const el = e.target,
        it = findItem(el.dataset.src, +el.dataset.id, el.dataset.eqk);
      if (it) quickMove(el.dataset.src, it, el.dataset.eqk);
      return;
    }
    const k = e.key.toLowerCase();
    if (IV.on) return e.preventDefault(), e.repeat || introKey(k);
    if (e.repeat && !'wasd'.includes(k) && !k.startsWith('arrow')) return;
    K[k] = 1;
    /* 離線結算開著（M2-12 §7）：Enter 收下、H 去營地升級 */
    if (!$('poff').hidden && (k === 'enter' || k === 'h')) return act(k === 'enter' ? 'offok' : 'offcamp');
    if (G.halt && G.state === 'dead' && k === 'enter') return act('again');
    if (k === ' ') {
      e.preventDefault();
      doRoll();
    } else if (k === 'q') useSlot(2);
    else if (k === 'e') useSlot(3);
    else if (k === 'r') useSlot(4);
    else if (k === 'g') PANEL.skill ? closePanels() : openPanel('skill');
    else if (k === 'p') treeOpen('pt');
    else if (k === '1') drinkFlask();
    else if (k === '2') drinkFlask(1);
    else if (k === 'f') interact();
    else if (k === 'i' || k === 'b') PANEL.inv ? closePanels() : openPanel('inv');
    else if (k === 'l' && CB.st !== 'idle') chaseLog(1);
    else if (FMENU.some(f => f[2].toLowerCase() === k)) fmenuOpen(FMENU.find(f => f[2].toLowerCase() === k)[0]);
    else if (PANEL.chase && CHUI.v && (k === 'escape' || (k === 'enter' && CHUI.v === 'swap')))
      e.preventDefault(), wyAct(k === 'enter' ? 'ok' : 'back');
    else if (k === 'escape')
      G.ask ? act('askno') : TREE.open ? treeClose() : anyPanel() ? closePanels() : openPanel('set');
    else if (k === 't') homeAsk();
    else if (k === 'c') autoToggle();
    pressFx(k);
  });
  addEventListener('keyup', e => (K[e.key.toLowerCase()] = 0));
  addEventListener('blur', () => {
    for (const k in K) K[k] = 0;
    M.L = M.R = 0;
  });
  CV.addEventListener('pointermove', e => {
    M.x = e.clientX;
    M.y = e.clientY;
    CV.style.cursor = G.scene === 'hide' && propAt(e) ? 'pointer' : 'crosshair';
  });
  CV.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return; /* 觸控在 touch.js */
    M.x = e.clientX;
    M.y = e.clientY;
    if (G.scene === 'hide' && e.button === 0) {
      const p = propAt(e);
      if (p === 'portal') return dist(P, G.portal) < 120 ? enterMap(G.portal.to) : hudWarn('走近一點');
      if (p) return useProp(p);
    }
    if (e.button === 0) {
      M.L = 1;
      useSlot(0);
      pressFx('左鍵');
    }
    if (e.button === 2) {
      M.R = 1;
      useSlot(1);
      pressFx('右鍵');
    }
  });
  addEventListener('pointerup', e => {
    if (e.button === 0) M.L = 0;
    if (e.button === 2) M.R = 0;
    dragEnd(e);
  });
  /* 系統把觸控拿走（來電、手勢）：放回原位，不留殘影 */
  addEventListener('pointercancel', dragEnd);
  addEventListener('pointermove', dragMove);
  addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('.it[data-id]');
    if (el && e.button === 0) {
      e.preventDefault();
      dragStart(e, el);
    }
  });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-a]');
    if (e.target.closest('#pidle')) IDLE.at = performance.now();
    if (a && e.isTrusted && a.closest('#pidle') && performance.now() - IDLE_MV < 400) return;
    /* 離線結算：點鈕以外任一處＝數字直接跑完 */
    if (!a && e.target.closest('#poff')) OFFC.t0 = -1e9;
    if (a) act(a.dataset.a, a);
  });
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse' || (DR && DR.moved)) return; /* 觸控：點一下才出說明框 */
    if ($('tip').classList.contains('act')) return; /* 有動作按鈕的說明框：等玩家按或點別的地方 */
    if (e.target.closest('#tip')) return clearTimeout(TIPH); /* 滑鼠移進有升級按鈕的說明框：留著 */
    const s = e.target.closest('.it[data-id],[data-tip]');
    clearTimeout(TIPH);
    if (!s) return hideTip();
    const r = s.getBoundingClientRect();
    if (s.dataset.tip) return showTip(`<p class="sktip">${esc(s.dataset.tip).replace(/\n/g, '<br>')}</p>`, r);
    const it = findItem(s.dataset.src, s.dataset.id, s.dataset.eqk);
    if (it) {
      const cmp = !isSlot(s.dataset.src);
      showTip(itemTip(it, cmp), r);
      TIPRE = { b: () => itemTip(it, cmp), a: r };
    }
  });
}
/* 滑鼠底下的藏身處物件 */
function propAt(e) {
  const w = {
    x: (e.clientX - IW / 2) / ZOOM + G.cam.x,
    y: (e.clientY - cvTop() - cvH() / 2) / ZOOM + G.cam.y
  };
  if (G.portal && Math.hypot(w.x - G.portal.x, w.y - G.portal.y) < 50) return 'portal';
  return (G.props || []).find(p => Math.hypot(w.x - p.x, w.y + 25 - p.y) < p.r + 20);
}
const inL = (l, e) => e.clientX >= l.x && e.clientX <= l.x + l.w && e.clientY >= l.y && e.clientY <= l.y + l.h;
function pressFx(key) {
  const b = BAR.find(b => b.key.toLowerCase() === key || (key === ' ' && b.k === 'roll'));
  if (!b) return;
  const el = document.querySelector(`.sk[data-k="${b.k}"]`);
  if (!el) return;
  el.classList.remove('hit');
  void el.offsetWidth;
  el.classList.add('hit');
}
function act(a, el) {
  if (a === 'close') closePanels();
  else if (a === 'home') {
    /* 玩家自己回藏身處（確認卡、死亡卡）：地上的照樣收、刷圖暫停（HUD 上排「繼續刷」再開始） */
    G.ask = 0;
    if (G.scene === 'map' && G.state === 'play')
      for (const d of G.drops.slice()) if (d.gold || (d.it && !d.nopick && !d.full)) pickup(d);
    S.stopWhy = 'home';
    enterHideout();
  } else if (/^(fs|shk|vib):/.test(a)) {
    /* M2-12 §10：文字大小 100／115／130%（新骨架的字走 --tscale）、畫面震動、手機震動兩個獨立開關 */
    const [k, v] = a.split(':');
    S[k] = +v;
    fsApply();
    save();
    hudPanels();
  } else if (a.startsWith('mute:')) {
    S.mute = +a.slice(5);
    if (AC) ac(); /* 正在響的（開場的風聲雨聲）也跟著關 */
    save();
    sfx('click');
    hudPanels();
  } else if (a.startsWith('dmgn:')) {
    /* 選過就存進存檔，之後不因換裝置、轉方向而改；畫面上不該留的數字直接拿掉 */
    S.dmgn = a.slice(5);
    G.nums = G.nums.filter(n => numShown(n.c));
    save();
    sfx('click');
    hudPanels();
  } else if (a === 'askno') {
    G.ask = 0;
    hudState();
  } else if (a === 'again') {
    /* 停下之後按「繼續刷」：這次倒下已經記過，直接原地重開 */
    if (G.state === 'dead') G.halt ? ((G.halt = 0), runNode(G.node, true)) : deadAgain();
  } else if (a === 'idlex') idleToggle();
  else if (a === 'offok') offClose();
  else if (a === 'offcamp') offClose(), navGo('craft');
  else if (a === 'resume') {
    const k = S.world.cur || wGoal(S);
    if (k) runNode(k);
  } else if (a === 'runok') {
    S.world.note = '';
    save();
  } else if (a === 'chaselog') chaseGo();
  else if (a.startsWith('wy:')) wyAct(a.slice(3));
  else if (a === 'offch') (REV.chx = !REV.chx), sfx('click'), hudPanels();
  else if (a === 'genall') {
    const n = genAll();
    hudWarn(n ? `產生器升了 ${n} 級` : '沒有買得起的');
    sfx(n ? 'lvup' : 'click');
    save();
    hudPanels();
  } else if (a.startsWith('ctab:')) {
    /* 鍛造的三段（M2-38）：打造／通貨／鍛造台。鍛造台沒選裝備時，接著用通貨頁中間那一件 */
    const k = a.slice(5);
    sfx('click');
    if (k === 'cur') return openPanel('stash');
    if (k === 'make') CRAFT.tab = 'make';
    else {
      if (!FTABS.includes(CRAFT.tab)) CRAFT.tab = 'forge';
      if (!craftItem() && S.curIt) CRAFT.sel = { src: 'cur', id: S.curIt.id, eqk: 'cur' };
    }
    openPanel('craft');
  } else if (a.startsWith('mkslot:')) {
    /* 角色頁空格沒候選（M2-37.6）：「去鍛造打一件」＝鍛造 › 打造、選好部位 */
    const e = EQS.find(q => q.k === a.slice(7));
    if (e) MK.kind = e.t;
    HP_HOLD++;
    closePanels();
    HP_HOLD--;
    act('ctab:make');
  } else if (a === 'pick' || a === 'pickno') {
    /* 做裝挑裝備：換成倉庫清單，點一件直接放上去（dragEnd） */
    NAV.pick = a === 'pick' ? 1 : 0;
    BAG.sel = null;
    hudPanels();
    /* 清單從頭開始（上一頁的捲動位置不沿用） */
    $('pinv').scrollTop = 0;
  } else if (a === 'bagoc') {
    BAG.o = BAG_O[(BAG_O.findIndex(o => o[0] === BAG.o) + 1) % BAG_O.length][0];
    BAG.n = 0;
    sfx('click');
    hudPanels();
  } else if (a.startsWith('ngo:')) {
    /* 地點清單點一列＝去那裡刷（鎖著的寫原因） */
    if (runNode(a.slice(4))) sfx('click'), closePanels();
  } else if (a.startsWith('nstar:')) {
    S.star = +a.slice(6);
    sfx('click');
    save();
    hudPanels();
  } else if (a === 'rvskip') {
    REV.i = REV.list.length;
    revealStep();
  } else if (a.startsWith('rvsel:')) {
    const id = +a.slice(6);
    REV.sel = REV.sel === id ? null : id;
    sfx('click');
    hudPanels();
  } else if (a === 'rvwear' || a === 'rvkeep' || a === 'rvsalv') {
    /* 打造的開獎（0.5.0）：換上（換下來的進倉庫）、留著（跳下一件）、分解 */
    const it = rvSel();
    if (!it) return;
    if (a === 'rvwear') equipTo(it, cmpSlot(it).k);
    else if (a === 'rvsalv') {
      takeOut('inv', it);
      it.salv = 1;
      hudWarn(`分解：${salvText(salvageDo(it))}`);
      sfx('coin');
    }
    rvNext();
    changed();
  } else if (a.startsWith('bagf:') || a.startsWith('bago:') || a.startsWith('bagk:')) {
    /* 部位再點一次＝取消；換大類：部位回到全部 */
    BAG[a[3]] = a[3] === 'k' && BAG.k === a.slice(5) ? '' : a.slice(5);
    if (a[3] === 'f') BAG.k = '';
    BAG.n = 0;
    sfx('click');
    hudPanels();
  } else if (a === 'selbelt') {
    NAV.slot = 'belt';
    hudPanels();
  } else if (a === 'slotx') {
    NAV.slot = null;
    hudPanels();
  } else if (a === 'slotall') {
    /* 角色頁「看全部」：到戰利品，篩選成這一格放得下的部位 */
    const e = EQS.find(q => q.k === NAV.slot);
    if (NAV.slot && /^ch\d$/.test(NAV.slot)) Object.assign(BAG, { f: 'charm', k: '' });
    else if (e) Object.assign(BAG, { f: KIND_GRP[e.t] || 'all', k: e.k === 'weapon' ? '' : e.t });
    BAG.n = 0;
    navGo('bag');
  } else if (a === 'bagmore') bagGrow();
  else if (a === 'chswno') (CHSW = null), hudInv();
  else if (a === 'gocamp') {
    /* M1-CP.4：掛機卡不放升級鈕，只帶去營地（升級只在營地） */
    CRAFT.tab = 'camp';
    PORT() ? navGo('craft') : (closePanels(), openPanel('craft'));
  } else if (a.startsWith('chsw:')) {
    /* M1-11：點一格＝換上並關閉；換下來的回倉庫 */
    const it = S.inv.items.find(x => x.id === CHSW),
      i = +a.slice(5);
    CHSW = null;
    if (!it || i >= charmSlots(S)) return hudInv();
    takeOut('inv', it);
    const old = S.charms[i];
    S.charms[i] = it;
    if (old) invPut(S.inv, old);
    BAG.sel = null;
    sfx('equip');
    changed();
  } else if (a.startsWith('sel')) {
    /* 換裝卡的按鈕（0.4.9） */
    const it = S.inv.items.find(x => x.id === BAG.sel);
    if (!it) return;
    if (a === 'selno') return (BAG.sel = null), hudInv();
    if (a === 'selmove') (BAG.sel = null), quickMove('inv', it);
    else if (a === 'selsell') {
      if (el && confirm2(el, `確定分解？`)) (BAG.sel = null), sell('inv', it);
    } else if (a === 'sellock') lockToggle(it);
    else if (a === 'seltip') tapItem({ el, src: 'inv', it }); /* 詳細：說明框＋做裝、賣、鎖定 */
  } else if (a === 'tipx') hideTip();
  else if (a.startsWith('auto:')) {
    if (!!S.auto !== !!+a.slice(5)) autoToggle();
    hudPanels();
  } else if (a.startsWith('lootsel:')) {
    /* 掛機卡點一件：到戰利品、選它 */
    const id = +a.slice(8);
    if (!S.inv.items.some(it => it.id === id)) return;
    BAG.sel = id;
    BAG.f = 'all';
    BAG.k = '';
    NAV.view = 'bag';
    if (PORT()) navGo('bag');
    else openPanel('inv');
  } else if (a === 'lootbag') {
    NAV.view = 'bag';
    if (PORT()) navGo('bag');
    else openPanel('inv');
  } else if (a === 'bagsell') {
    if (el && confirm2(el, `確定分解 ${bagSells().length} 件？`)) sellAll();
  } else if (a.startsWith('asc:')) {
    /* 選昇華／換昇華：點數全部退回（被關掉的欄位裡的裝備脫到背包，放不下就擋下來） */
    const why = eqUnloadWhy(S, ['a_st'], a.slice(4));
    if (why) return hudWarn(why);
    S.asc = a.slice(4);
    S.at = ['a_st'];
    ASCUI.n = null;
    ASCUI.pick = 0;
    treeChanged();
    hudPanels();
    hudWarn(`成為${ASC[S.asc].n}！直接點盤面上的點`);
    sfx('lvup');
  }
}
