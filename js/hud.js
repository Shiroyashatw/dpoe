/* dungeonPOE · HUD（生命／魔力球、技能列、經驗條、王的血條）、面板（裝備與背包、倉庫、地圖台）、拖曳、說明框、死亡與通關、輸入 */
'use strict';
let C = 36; /* 背包一格的大小（px）；手機照螢幕寬度調（main.js 的 resize） */
const icHTML = (n, cls = '') => {
  const u = artIconURL(n);
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
    chain: s(
      '<rect x="1.5" y="5.2" width="7" height="5.6" rx="2.8" transform="rotate(-45 5 8)"/><rect x="7.5" y="5.2" width="7" height="5.6" rx="2.8" transform="rotate(-45 11 8)"/>'
    ),
    plus: s('<path d="M8 3v10M3 8h10"/>'),
    lock: s('<rect x="3.5" y="7.5" width="9" height="6.5" rx="1"/><path d="M5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2"/>'),
    roll: s('<path d="M2 12c2.5-5.5 7.5-6.5 11-3"/><path d="M10 5.5l3.2 3.3-3.6 2.4"/>'),
    bag: s('<path d="M3.5 6h9l-.8 8h-7.4z"/><path d="M6 6V4.5a2 2 0 0 1 4 0V6"/>'),
    gem: s('<path d="M8 2l5 4.5L8 14 3 6.5z"/><path d="M3 6.5h10"/>'),
    tree: s(
      '<circle cx="8" cy="3.5" r="1.6"/><circle cx="3.5" cy="12" r="1.6"/><circle cx="12.5" cy="12" r="1.6"/><path d="M7 5l-2.6 5.6M9 5l2.6 5.6M5.1 12h5.8"/>'
    ),
    home: s('<path d="M2.5 8L8 3l5.5 5"/><path d="M4 7v6.5h8V7"/><path d="M6.5 13.5v-3.5h3v3.5"/>'),
    gear: s(
      '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>'
    ),
    menu: s('<path d="M2.5 4h11M2.5 8h11M2.5 12h11"/>'),
    full: s('<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>'),
    prev: s('<path d="M10 3L5 8l5 5"/>'),
    next: s('<path d="M6 3l5 5-5 5"/>')
  };
})();
/* 直立操作：手機而且設定選直立（桌機一律橫向） */
const PORT = () => TOUCH.on && !!S && S.orient === 'p';
/* 桌機：魔力球旁的功能列；手機：右上的 ☰ 選單（data-tm 的處理在 touch.js） */
const DMENU = [
  ['inv', 'bag', '背包', 'I'],
  ['skill', 'gem', '技能寶石', 'G'],
  ['tree', 'tree', '天賦樹', 'P'],
  ['home', 'home', '回藏身處（按兩次）', 'T'],
  ['set', 'gear', '設定與快捷鍵', 'Esc']
];
function hudInit() {
  $('hud').innerHTML = `
  <div class="top"><div id="area"></div><div id="bossbar" hidden><b id="bossn"></b><div class="bb"><i></i></div></div><div id="prog" hidden><b>首領進度</b><div class="pb"><i></i></div></div></div>
  <div class="bottom">
    <div class="orb hp" id="ohp"><i></i><b class="ward"></b><svg class="spir blk" viewBox="0 0 100 100" aria-hidden="true"><path class="tr" d="M50 5 A45 45 0 0 1 50 95"/><path class="fg" pathLength="1" d="M50 95 A45 45 0 0 0 50 5"/></svg><span></span></div>
    <div class="mid">
      <div class="mech" id="mech" role="status" aria-label="目前的狀態"></div>
      <div class="bars tonly"><div class="hb hp" id="bhp"><i></i><b class="ward"></b><span></span></div><div class="hb bv" id="bbv" hidden><i></i></div><div class="hb mp" id="bmp"><i></i><span></span></div></div>
      <div class="xp" id="xp" data-tip="經驗"><i></i></div>
      <div class="bar" id="bar"></div>
    </div>
    <div class="orb mp" id="omp"><i></i><svg class="spir" viewBox="0 0 100 100" aria-hidden="true"><path class="tr" d="M50 95 A45 45 0 0 1 50 5"/><path class="fg" pathLength="1" d="M50 95 A45 45 0 0 1 50 5"/></svg><span></span></div>
    <div class="dmenu">${DMENU.map(([k, ic, n, key]) => `<button data-tm="${k}" data-tip="${n}（${key}）" aria-label="${n}">${ICO[ic]}<kbd>${key}</kbd></button>`).join('')}</div>
  </div>
  <div id="prac" hidden></div>
  <div id="talk" hidden></div>
  <div id="warn" role="status" aria-live="polite"></div>
  <div id="pro" hidden><small id="pron"></small><b id="prot" role="status"></b><button class="btn mini" data-pro="skip">跳過<span class="ponly">序章</span></button></div>
  <div class="tonly" id="stick"><i></i></div>
  <div class="tonly tmenu"><button data-tm="inv">${ICO.bag}背包</button><button data-tm="more" aria-label="選單" aria-expanded="false">${ICO.menu}</button></div>
  <div class="tonly tmore" id="tmore" hidden><button data-tm="skill">${ICO.gem}技能寶石</button><button data-tm="tree">${ICO.tree}天賦樹</button><button data-tm="home">${ICO.home}回藏身處</button><button data-tm="fs" id="tfs">${ICO.full}全螢幕</button><button data-tm="set">${ICO.gear}設定</button></div>
  <div class="tonly" id="rot"><p id="rott"></p><button class="btn" data-tm="flip" id="rotb"></button></div>`;
  pracInit();
  talkInit();
  proInit();
  introInit();
  hudBar();
  hudState();
}
/* 技能列的圖示跟著技能欄換（換寶石後重畫） */
function hudBar() {
  $('bar').innerHTML = BAR.map(b => {
    const g = b.slot != null && S.skills[b.slot].a,
      ic =
        b.k === 'roll'
          ? `<em class="roll">${ICO.roll}</em>`
          : b.k === 'use'
            ? '<em class="use">互動</em>'
            : b.slot != null
              ? g
                ? icHTML(SKILLS[g.gem].ic)
                : `<em class="empty">${ICO.plus}</em>`
              : icHTML(b.ic);
    return `<div class="sk${b.touch ? ' tonly' : ''}" data-k="${b.k}" data-tip="${esc(tipOf(b))}">${ic}<u></u><s></s><kbd>${b.key}</kbd></div>`;
  }).join('');
  for (const k in HV) if (/^[tn]s\d|^cds\d/.test(k)) delete HV[k];
}
function tipOf(b) {
  if (b.slot == null) return `${b.n}\n${b.d}`;
  const c = slotCfg(b.slot);
  if (!c) return `${b.key}：空的\n按 G 打開技能寶石，把技能寶石放進來`;
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
function hudTick() {
  if (!P) return;
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
  for (const el of document.querySelectorAll('.sk')) {
    const k = el.dataset.k,
      c = k[0] === 's' ? slotCfg(+k[1]) : null;
    let cd = 0,
      txt = '';
    if (k === 'flask' || k === 'mflask') {
      cd = P[k] >= 1 ? 0 : 1 - (P[k] % 1);
      txt = Math.floor(P[k]) + '';
    } else if (k === 'roll') cd = (P.cds.roll || 0) / (ROLL.cd + ROLL.t);
    else if (c && c.cd) {
      cd = (P.cds[k] || 0) / c.cd;
      if (P.cds[k] > 0) txt = Math.ceil(P.cds[k]) + '';
    }
    setV(el, 'cd' + k, cd.toFixed(2));
    setT(el.querySelector('u'), 't' + k, txt);
    const no = (c && ((!hell && !pracFree() && mpAvail() < c.mp) || !wtOK(c.D))) || !fightOn();
    if (HV['n' + k] !== no) el.classList.toggle('no', (HV['n' + k] = no));
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
          `<button class="stc ${s.bad ? 'bad' : ''}" data-st="${esc(s.n + '：' + s.d)}" aria-label="${esc(s.n)}">${icHTML(s.ic)}<i></i>${s.c > 1 ? `<b>${s.c}</b>` : ''}</button>`
      )
      .join('');
  }
  /* 暗色扇形順時針掃過：剩餘越少蓋越多 */
  const sb = $('mech').children;
  sts.forEach((s, i) => sb[i] && sb[i].style.setProperty('--f', s.f.toFixed(2)));
  const b = G.mobs.find(m => m.boss && !m.dummy),
    show = !!(b && b.aggro);
  if (HV.boss !== show) {
    $('bossbar').hidden = !(HV.boss = show);
    if (show) $('bossn').textContent = b.D.n;
  }
  if (show) setV($('bossbar'), 'bhp', (b.hp / b.mhp).toFixed(3));
  /* 暴露弱點：王的生命條上的區段（一隻王一組，換王才重畫） */
  const wk = show && ST.reveal ? weakSegs(b) : null;
  if (HV.weak !== wk) {
    HV.weak = wk;
    $('bossbar').querySelector('.bb').innerHTML =
      '<i></i>' + (wk || []).map(([x, y]) => `<u style="left:${x * 100}%;width:${(y - x) * 100}%"></u>`).join('');
  }
  const pr = G.scene === 'map' && !G.bossOut;
  if (HV.pr !== pr) $('prog').hidden = !(HV.pr = pr);
  if (pr) setV($('prog'), 'prog', Math.min(1, G.prog / G.need).toFixed(3));
  pracHud();
  const at =
    PRO.on && G.scene === 'map'
      ? '地層'
      : G.scene === 'hide'
        ? `藏身處 · Lv ${S.lv} · ${S.gold} 金 · 地圖碎片 ${S.frag}${S.story.crow ? ` · 血霧 ${S.hunt.v}%` : ''}`
        : `${G.nodeN || '地圖'} · 怪物 Lv ${mobLv(G.mapT)} · ${'★'.repeat(G.star || 1)} · Lv ${S.lv} · 剩 ${G.mobs.filter(m => !m.arrow).length} 隻 · 碎片 ${S.frag}`;
  setT($('area'), 'at', at);
  const hm = G.scene !== 'map';
  if (HV.hm !== hm) {
    HV.hm = hm;
    for (const e of document.querySelectorAll('[data-tm=home]')) e.hidden = hm;
  }
  /* 手機：血、魔力長條；「互動」只在附近有東西時出現 */
  if (TOUCH.on) {
    setV($('bhp'), 'hp2', HV.hp);
    setV($('bmp'), 'mp2', HV.mp);
    setT($('bhp').lastChild, 'ht2', Math.ceil(P.hp) + ' / ' + ST.hp + (ST.es ? ` · 盾 ${Math.floor(P.es || 0)}` : ''));
    setT($('bmp').lastChild, 'mt2', mpt.replace('\n', ' '));
    if (HV.w2 !== wv) $('bhp').style.setProperty('--w', (HV.w2 = wv));
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
/* 死掉、通關：中間的卡片 */
function hudState() {
  const o = $('over');
  if (G.state === 'dead') {
    o.innerHTML = `<div class="card"><h2 class="c-bad">你倒下了</h2>${deathCause()}<p>這張地圖失敗，碎片不退；失去 ${G.lostXp} 經驗（不會降級）。裝備都還在。</p><button class="btn pri" data-a="home">回到藏身處</button></div>`;
    o.hidden = false;
  } else if (G.state === 'portal') {
    /* 站在傳送門上：打開地圖台選下一張（新的一批卡），或回藏身處 */
    o.innerHTML = `<div class="card portal"><h2>傳送門</h2><p>${G.first ? `<span class="c-gold">${G.first}</span>` : '地上的東西撿完了嗎？'}</p>
      <div class="pbtns"><button class="btn pri" data-a="pickmap">選下一張地圖<small>新的一批地圖卡</small></button><button class="btn" data-a="home">回藏身處<small>整理背包、點天賦</small></button></div>
      <p class="c-dim">走開就關掉</p></div>`;
    o.hidden = false;
  } else o.hidden = true;
}

/* ---------- 面板 ---------- */
/* stab：倉庫的分頁（stash／temp）；sellM：批量賣出模式（SELLS 是選了的裝備 id） */
const PANEL = {
  inv: false,
  stash: false,
  device: false,
  skill: false,
  craft: false,
  pick: 1,
  stab: 'stash',
  sellM: false
};
const SELLS = new Set();
function openPanel(k) {
  TOUCH.front = k === 'stash' || k === 'skill' || k === 'craft' ? 'other' : 'inv';
  /* 左邊一次只開一個（倉庫／技能寶石／鍛造台），右邊是背包 */
  if (k === 'stash' || k === 'skill' || k === 'craft') {
    PANEL.stash = PANEL.skill = PANEL.craft = false;
    PANEL.inv = PANEL[k] = true;
  } else if (k === 'device') {
    PANEL.device = true;
    wmOpen();
  } else PANEL[k] = true;
  /* 手機直立：選中才佔掉背包那半邊；桌機與橫向在 hudPanels 預選第一招 */
  if (k === 'skill' && PORT()) SKUI.sel = null;
  if (k === 'asc') (ASCUI.v = S.asc || ASCUI.v || Object.keys(ASC)[0]), (ASCUI.n = null);
  hideTip();
  hudPanels();
}
function closePanels() {
  PANEL.inv =
    PANEL.stash =
    PANEL.device =
    PANEL.skill =
    PANEL.craft =
    PANEL.gem =
    PANEL.set =
    PANEL.flt =
    PANEL.sellM =
    PANEL.asc =
    PANEL.shop =
      false;
  SELLS.clear();
  hideTip();
  hudPanels();
}
const anyPanel = () =>
  PANEL.inv ||
  PANEL.stash ||
  PANEL.device ||
  PANEL.skill ||
  PANEL.craft ||
  PANEL.gem ||
  PANEL.set ||
  PANEL.flt ||
  PANEL.asc ||
  PANEL.shop;
/* 設定：操作方向（手機）、快捷鍵／手勢一覽（取代原本左下角的操作說明） */
const KEYS_PC = [
  ['WASD', '移動'],
  ['滑鼠', '瞄準'],
  ['左鍵 右鍵 Q E R', '技能'],
  ['空白', '翻滾（怪物出手的瞬間翻滾＝完美閃避）'],
  ['1 ／ 2', '生命藥劑 ／ 魔力藥劑'],
  ['F', '互動、撿東西（也可以直接點地上的名字）'],
  ['I', '背包'],
  ['G', '技能寶石'],
  ['P', '天賦樹'],
  ['T', '回藏身處（地圖裡要按兩次）'],
  ['Esc', '關閉面板；沒有面板時打開設定']
];
const KEYS_PORT = [
  ['按住拖', '移動（手指按哪裡，搖桿就在哪裡）'],
  ['點一下', '普攻最近的敵人（王優先）'],
  ['按住不動', '連續普攻'],
  ['快速一撥', '往那個方向翻滾'],
  ['技能鍵', '點＝自動瞄準 · 拖出去＝手動瞄準 · 拖回按鈕＝取消'],
  ['道具', '點一下看說明與動作 · 地上的名字點一下撿起來']
];
const KEYS_LAND = [
  ['左半邊拖', '移動'],
  ['大按鈕', '普攻（按住連打）'],
  ['技能鍵', '點＝自動瞄準 · 拖出去＝手動瞄準 · 拖回按鈕＝取消'],
  ['翻滾鍵', '翻滾（怪物出手的瞬間＝完美閃避）'],
  ['道具', '點一下看說明與動作 · 地上的名字點一下撿起來']
];
function setHTML() {
  const rows = TOUCH.on ? (PORT() ? KEYS_PORT : KEYS_LAND) : KEYS_PC,
    p = S.orient === 'p';
  return `<div class="ph"><b>設定</b><span>dungeonPOE v${VER}</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  ${
    TOUCH.on
      ? `<div class="ph2">操作方向</div><div class="gkind seg2"><button class="btn ${p ? 'on' : ''}" data-tm="port">直立</button><button class="btn ${p ? '' : 'on'}" data-tm="land">橫向</button></div><p class="sethint">直立單手就能玩；橫向要兩手，看得比較寬</p>`
      : ''
  }
  ${filterHTML()}
  ${acctHTML()}
  <div class="ph2">${TOUCH.on ? '手勢' : '快捷鍵'}</div>
  <dl class="keyl">${rows.map(([k, d]) => `<dt>${k}</dt><dd>${d}</dd>`).join('')}</dl>`;
}
/* 設定裡的入口：目前是第幾組、幾條規則，按下去開獨立的過濾器面板 */
function filterHTML() {
  const F = S.filter,
    n = fltSet().rules.length;
  return `<div class="ph2">物品過濾器<span>第 ${F.cur + 1} 組 · ${n} 條規則</span></div>
  <button class="btn" data-a="openflt">設定過濾器</button><p class="sethint">決定地上的裝備要自動撿、顯示、醒目或隱藏</p>`;
}
/* ---------- 過濾器面板（0.2.35）：3 組、每組一串由上往下比對的規則＋最底的「其他」 ---------- */
const FUI = { open: -1 };
/* 條件：預設值、數字的 [名字, 最小, 最大, 單位] */
const FLT_DEF = { kind: ['weapon'], rar: [2], aff: { ks: [], n: 1 }, so: 1, q: 10, pot: 7, L: 10 };
const FLT_NUM = {
  so: ['插槽數', 1, 6, ''],
  q: ['品質', 0, 40, '%'],
  pot: ['潛能', 1, 10, ''],
  L: ['物品等級', 1, 100, '']
};
const FNUM_STEP = { so: 1, q: 5, pot: 1, L: 1 };
const RARN3 = ['普通', '魔法', '稀有'];
function ruleSum(r) {
  const c = r.c,
    t = [];
  if (c.kind) t.push(c.kind.map(k => FLT_KIND.find(x => x[0] === k)[1]).join('／'));
  if (c.rar) t.push(c.rar.map(i => RARN3[i]).join('／'));
  if (c.aff) t.push(`詞綴${c.aff.n > 1 ? '至少 ' + c.aff.n : '任一'}（${c.aff.ks.length} 種）`);
  for (const k in FLT_NUM) if (c[k] != null) t.push(`${FLT_NUM[k][0]} ≥ ${c[k]}${FLT_NUM[k][3]}`);
  return t.join(' · ') || '全部';
}
const fltActHTML = (r, ri) =>
  `<div class="gkind fact">${Object.entries(FLT_ACT)
    .map(
      ([k, n]) =>
        `<button class="btn ${r.act === k ? 'on' : ''}" data-fl="act:${ri}:${k}" aria-pressed="${r.act === k}">${n}</button>`
    )
    .join('')}</div>${
    r.act === 'hl'
      ? `<div class="fcol" role="group" aria-label="醒目顏色">${FLT_COL.map((c, i) => `<button class="fsw ${r.col === i ? 'on' : ''}" style="--c:${c}" data-fl="col:${ri}:${i}" aria-label="顏色 ${i + 1}" aria-pressed="${r.col === i}"></button>`).join('')}</div>`
      : ''
  }`;
function fltRuleHTML(r, i) {
  const c = r.c,
    open = FUI.open === i,
    chk = (k, lab, body) =>
      `<div class="fcond ${c[k] != null ? 'on' : ''}"><button class="fchk" data-fl="cond:${i}:${k}" role="checkbox" aria-checked="${c[k] != null}" aria-label="${lab}">${c[k] != null ? '✓' : ''}</button><b>${lab}</b>${c[k] != null ? body : ''}</div>`,
    tog = (list, names, key) =>
      `<span class="ftog">${names.map(([v, n]) => `<button class="btn mini ${list.includes(v) ? 'on' : ''}" data-fl="${key}:${i}:${v}" aria-pressed="${list.includes(v)}">${n}</button>`).join('')}</span>`,
    num = k =>
      chk(
        k,
        FLT_NUM[k][0] + ' ≥',
        `<span class="fnum"><button class="btn mini" data-fl="num:${i}:${k}:-1" aria-label="減少">−</button><i>${c[k]}${FLT_NUM[k][3]}</i><button class="btn mini" data-fl="num:${i}:${k}:1" aria-label="增加">＋</button></span>`
      );
  return `<div class="frule ${r.on ? '' : 'off'} ${open ? 'open' : ''}" data-ri="${i}">
  <div class="fhd"><button class="fdrag" data-drag="${i}" aria-label="拖曳排序">≡</button>
    <button class="fsw2 ${r.on ? 'on' : ''}" data-fl="tog:${i}" role="switch" aria-checked="${!!r.on}" aria-label="啟用這條規則">${r.on ? '開' : '關'}</button>
    <button class="fsum" data-fl="open:${i}" aria-expanded="${open}"><b>${i + 1}. ${esc(ruleSum(r))}</b><small>→ ${FLT_ACT[r.act]}${r.act === 'hl' ? ` <i class="fdot" style="--c:${FLT_COL[r.col]}"></i>` : ''}</small></button>
    <button class="btn mini" data-fl="up:${i}" aria-label="上移" ${i ? '' : 'disabled'}>▲</button><button class="btn mini" data-fl="dn:${i}" aria-label="下移" ${i < fltSet().rules.length - 1 ? '' : 'disabled'}>▼</button></div>
  ${
    open
      ? `<div class="fbody">
    ${chk('kind', '類型', tog(c.kind || [], FLT_KIND, 'kind'))}
    ${chk(
      'rar',
      '稀有度',
      tog(
        c.rar || [],
        RARN3.map((n, v) => [v, n]),
        'rar'
      )
    )}
    ${chk('aff', '詞綴', c.aff ? `<span class="ftog">${[1, 2, 3, 4].map(n => `<button class="btn mini ${c.aff.n === n ? 'on' : ''}" data-fl="affn:${i}:${n}" aria-pressed="${c.aff.n === n}">${n === 1 ? '任一個' : '至少 ' + n}</button>`).join('')}</span>` : '')}
    ${c.aff ? `<div class="fcaff">${FLT_AFF.map(g => `<button class="chip ${c.aff.ks.includes(g.id) ? 'on' : ''}" data-fl="aff:${i}:${g.id}" aria-pressed="${c.aff.ks.includes(g.id)}">${esc(g.n)}</button>`).join('')}</div>` : ''}
    ${num('so')}${num('q')}${num('pot')}${num('L')}
    <div class="fact2"><b>處理方式</b>${fltActHTML(r, i)}</div>
    <button class="btn mini fdel" data-fl="del:${i}">刪除這條規則</button></div>`
      : ''
  }</div>`;
}
function fltHTML() {
  const F = S.filter,
    set = fltSet();
  return `<div class="ph"><b>物品過濾器</b><span>由上往下，第一條符合的決定</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="gkind seg3">${[0, 1, 2].map(i => `<button class="btn ${F.cur === i ? 'on' : ''}" data-fl="slot:${i}" aria-pressed="${F.cur === i}">第 ${i + 1} 組</button>`).join('')}</div>
  <div class="flist" id="flist">${set.rules.map(fltRuleHTML).join('')}
  <div class="frule def"><div class="fhd2"><b>其他（預設）</b><small>沒有符合上面任何規則的</small></div>${fltActHTML(set.def, 'd')}</div></div>
  <div class="frow"><button class="btn" data-fl="add" ${set.rules.length >= 20 ? 'disabled' : ''}>＋ 新增規則</button><button class="btn" data-fl="tpl">套用新手範本</button></div>
  <p class="sethint">寶石一律顯示、要自己撿；金幣與碎片一律自動吸收。「隱藏」的地上不畫、不撿。</p>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-fl]');
  if (!b || b.disabled) return;
  const F = S.filter,
    set = fltSet(),
    [k, i, v, x] = b.dataset.fl.split(':'),
    r = i === 'd' ? set.def : set.rules[+i],
    togl = (list, val) => (list.includes(val) ? list.filter(y => y !== val) : [...list, val]);
  if (k === 'slot') (F.cur = +i), (FUI.open = -1);
  else if (k === 'tpl') {
    if (!confirm2(b, '再按一次：這組會被取代')) return;
    F.sets[F.cur] = fltTemplate();
    FUI.open = -1;
  } else if (k === 'add') {
    set.rules.push({ on: 1, c: {}, act: 'show', col: 0 });
    FUI.open = set.rules.length - 1;
  } else if (k === 'open') FUI.open = FUI.open === +i ? -1 : +i;
  else if (k === 'del') {
    set.rules.splice(+i, 1);
    FUI.open = -1;
  } else if (k === 'up' || k === 'dn') {
    const j = +i + (k === 'up' ? -1 : 1);
    [set.rules[+i], set.rules[j]] = [set.rules[j], set.rules[+i]];
    if (FUI.open === +i) FUI.open = j;
  } else if (k === 'tog') r.on = r.on ? 0 : 1;
  else if (k === 'act') r.act = v;
  else if (k === 'col') r.col = +v;
  else if (k === 'cond') {
    if (r.c[v] != null) delete r.c[v];
    else r.c[v] = JSON.parse(JSON.stringify(FLT_DEF[v]));
  } else if (k === 'kind' || k === 'rar') {
    const list = togl(r.c[k], k === 'rar' ? +v : v);
    if (list.length) r.c[k] = list;
    else delete r.c[k];
  } else if (k === 'aff') r.c.aff.ks = togl(r.c.aff.ks, v);
  else if (k === 'affn') r.c.aff.n = +v;
  else if (k === 'num') {
    const [, lo, hi] = FLT_NUM[v];
    r.c[v] = clamp(r.c[v] + +x * FNUM_STEP[v], lo, hi);
  }
  FLTV++;
  save();
  hudPanels();
});
/* 拖曳排序：按住 ≡ 拖，經過哪條規則就跟它換位置（手機也能拖；也可以用 ▲▼） */
let FD = null;
document.addEventListener('pointerdown', e => {
  const h = e.target.closest('[data-drag]');
  if (!h) return;
  e.preventDefault();
  FD = +h.dataset.drag;
});
addEventListener('pointermove', e => {
  if (FD == null) return;
  const el = document.elementsFromPoint(e.clientX, e.clientY).find(n => n.dataset && n.dataset.ri != null),
    j = el ? +el.dataset.ri : FD;
  if (j === FD) return;
  const L = fltSet().rules;
  L.splice(j, 0, L.splice(FD, 1)[0]);
  if (FUI.open === FD) FUI.open = j;
  FD = j;
  FLTV++;
  hudPanels();
});
addEventListener('pointerup', () => FD != null && ((FD = null), save()));
addEventListener('pointercancel', () => FD != null && ((FD = null), save()));
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
      ? `<p class="sethint">訪客的存檔只在這台裝置；用信箱註冊後，換手機或清除網站資料都能登回來</p>
    <div class="acct"><input class="inp" id="aem" type="email" placeholder="信箱" autocomplete="email" value="${esc(AUTH.em)}" aria-label="信箱">${pw('密碼（至少 6 個字）', 'current-password')}
    <div class="seg2 g2"><button class="btn pri" data-ac="register"${dis}>註冊</button><button class="btn" data-ac="login"${dis}>登入</button></div>
    <button class="btn mini lnk" data-ac="reset"${dis}>忘記密碼</button></div>`
      : `<div class="acct row"><span class="acem">${esc(CLOUD.email || '')}</span><button class="btn" data-ac="logout"${dis}>登出</button></div>`;
  return `<div class="ph2">帳號<span>${CLOUD.anon ? '訪客' : '已登入'} · ${esc(CLOUD.status)}</span></div>${body}${msg}`;
}
/* 直立：背包以外的面板（倉庫、寶石、鍛造）疊在背包上面，上方分頁切換 */
function portTabs() {
  const t = [
      ['inv', '裝備'],
      ['skill', '技能寶石'],
      ...(G.scene === 'hide'
        ? [
            ['stash', '倉庫'],
            ['craft', '鍛造台']
          ]
        : [])
    ],
    on = PANEL.stash ? 'stash' : PANEL.skill ? 'skill' : PANEL.craft ? 'craft' : 'inv';
  return `${t.map(([k, n]) => `<button class="${k === on ? 'on' : ''}" data-tm="tab${k}">${n}</button>`).join('')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button>`;
}
/* 重畫時保留捲動位置（選了一列，清單不彈回最上面）；qs 是要保留的子元素，'' 是面板本身 */
function panelHTML(el, html, qs) {
  const at = q => (q ? el.querySelector(q) : el),
    keep = qs.map(q => {
      const n = at(q);
      return n ? [n.scrollLeft, n.scrollTop] : [0, 0];
    });
  el.innerHTML = html;
  qs.forEach((q, i) => {
    const n = at(q);
    if (n) [n.scrollLeft, n.scrollTop] = keep[i];
  });
}
function hudPanels() {
  if (!S) return;
  if (SKUI.sel && !slotGet('sock', SKUI.sel)) SKUI.sel = null;
  if (PANEL.skill && !SKUI.sel && !PORT()) {
    const i = S.skills.findIndex(k => k.a);
    if (i >= 0) SKUI.sel = i + ':a';
  }
  $('pset').hidden = !PANEL.set;
  $('pflt').hidden = !PANEL.flt;
  if (PANEL.flt) {
    /* 重畫時保留捲動位置（點一個選項不彈回最上面） */
    const y = $('pflt').scrollTop;
    $('pflt').innerHTML = fltHTML();
    $('pflt').scrollTop = y;
  }
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
  $('ptabs').hidden = !(PORT() && PANEL.inv && !PANEL.gem);
  if (!$('ptabs').hidden) $('ptabs').innerHTML = portTabs();
  document.body.classList.toggle('pair', !!(PANEL.inv && (PANEL.stash || PANEL.skill || PANEL.craft)));
  document.body.classList.toggle('gxs', !!(PANEL.skill && SKUI.sel));
  $('pinv').hidden = !PANEL.inv;
  $('pstash').hidden = !PANEL.stash;
  $('pdev').hidden = !PANEL.device;
  $('pasc').hidden = !PANEL.asc;
  $('pshop').hidden = !PANEL.shop;
  $('pskill').hidden = !PANEL.skill;
  $('pcraft').hidden = !PANEL.craft;
  $('pgem').hidden = !PANEL.gem;
  /* 生成寶石是單獨一個視窗：開著時後面的面板先藏起來，關掉回到原本的 */
  if (PANEL.gem) {
    panelHTML($('pgem'), gemHTML(), ['', '.gtabs', '.glist']);
    for (const id of ['pinv', 'pstash', 'pskill', 'pcraft', 'pdev']) $(id).hidden = true;
    return;
  }
  if (swapOn()) {
    if (TOUCH.front === 'inv') $('pstash').hidden = $('pskill').hidden = $('pcraft').hidden = true;
    else $('pinv').hidden = true;
  }
  /* 手機直立：檢視區佔掉背包那半邊，拇指搆得到；收起來背包就回來 */
  if (TOUCH.on && PORT() && PANEL.skill && SKUI.sel) $('pinv').hidden = true;
  if (PANEL.skill) panelHTML($('pskill'), skillHTML(), ['.gx-list', '.gx-ins']);
  if (PANEL.craft) $('pcraft').innerHTML = forgeHTML();
  if (PANEL.inv) $('pinv').innerHTML = invHTML();
  /* 寶石頁的搜尋框正在輸入時不重畫（焦點會掉） */
  if (PANEL.stash && !(document.activeElement && document.activeElement.id === 'gpq')) {
    const st = PANEL.stab === 'temp' ? 'temp' : PANEL.stab === 'gems' ? 'gems' : 'stash',
      n = S.temp.items.length;
    $('pstash').innerHTML =
      `<div class="ph"><b>倉庫</b><span class="ftabs"><button class="${st === 'stash' ? 'on' : ''}" data-a="stab:stash">倉庫</button><button class="${st === 'gems' ? 'on' : ''}" data-a="stab:gems">寶石${S.gems.length ? ` <i class="c-gold">${S.gems.length}</i>` : ''}</button><button class="${st === 'temp' ? 'on' : ''}" data-a="stab:temp">臨時${n ? ` <i class="c-gold">${n}</i>` : ''}</button></span>${swapB('背包')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>${
        st === 'temp'
          ? `<p class="fhint">背包滿了撿到的東西放這裡，只能拿出來${TOUCH.on ? '' : '（點一下＝放進背包）'}</p>`
          : ''
      }${st === 'gems' ? gemPageHTML() : gridHTML(S[st], st)}`;
  }
  if (PANEL.device) wmPanel();
  if (PANEL.asc) panelHTML($('pasc'), ascHTML(), ['', '.ax-list']);
  if (PANEL.shop) $('pshop').innerHTML = shopHTML();
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
  off: [248, 0, 72, 108],
  boots: [248, 116, 72, 72]
};
/* 空的裝備欄：那個部位的淡圖示（取第一個同部位的基底圖） */
const slotIc = e => (BASES.find(b => b.k === e.t) || {}).ic;
const LAND = () => TOUCH.on && !PORT() && innerHeight < 480;
function invHTML() {
  /* 人形裝備欄照面板寬度放大置中（最多 1.3 倍），數值放在下面一排 */
  const s = ST,
    pp = TOUCH.on ? 20 : 28,
    z = Math.min(TOUCH.on ? 1.3 : 1.15, (($('pinv').clientWidth || 476) - pp) / 320),
    eqs =
      EQS.map(e => {
        const [x, y, w, h] = EQPOS[e.k].map(v => Math.round(v * z)),
          it = S.eq[e.k];
        return `<div class="eqs ${it ? 'r' + it.r : ''} ${s.eqBad.includes(e.k) ? 'noreq' : ''}" data-eq="${e.k}" ${it ? '' : `data-tip="${e.n}"`} style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${it ? itemHTML(it, 'eq', e.k) : `<span class="eqg">${icHTML(slotIc(e))}</span>`}</div>`;
      }).join('') +
      /* 護符槽：腰帶給幾格就開幾格（照 PoE2） */
      [0, 1, 2]
        .map(i => {
          const [x, y, w, h] = [204 + i * 40, 196, 36, 36].map(v => Math.round(v * z)),
            it = S.charms[i],
            lock = i >= charmSlots(S);
          return `<div class="eqs ${it ? 'r' + it.r : ''} ${lock ? 'lock' : ''}" data-eq="ch${i}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${it ? itemHTML(it, 'eq', 'ch' + i) : `<small>${lock ? ICO.lock : '護符'}</small>`}</div>`;
        })
        .join('');
  /* 抗性：顯示扣完這一階懲罰的（照 PoE2，上限是最大抗性） */
  const pen = G.scene === 'map' ? resPen(mobLv(G.mapT || 1)) : 0,
    res =
      RESK.map(
        r =>
          `<span class="res-${r}">${ELN[r]}抗 <b>${effRes(r)}%</b>${s.maxRes[r] > RES_CAP ? `<small>／${s.maxRes[r]}</small>` : ''}${s.resRaw[r] - (r === 'chaos' ? 0 : pen) > effRes(r) ? `<small>（${s.resRaw[r] - (r === 'chaos' ? 0 : pen)}%）</small>` : ''}</span>`
      ).join('') + (pen ? `<span class="c-dim">這一階元素抗性 −${pen}%</span>` : '');
  /* 手機橫向一屏放不下裝備欄和背包：分頁，預設背包 */
  const land = LAND(),
    /* 序章第 2 步要點背包裡的劍：固定在背包分頁 */
    tb = proInv() ? 'bag' : PANEL.invT || 'bag',
    invTabs = land
      ? `<span class="ftabs">${[
          ['bag', '背包'],
          ['eq', '裝備欄']
        ]
          .map(([k, n]) => `<button class="${tb === k ? 'on' : ''}" data-invt="${k}">${n}</button>`)
          .join('')}</span>`
      : '';
  return `<div class="ph"><b>裝備</b><span>Lv ${S.lv} · ${S.gold} 金</span>${invTabs}${swapB(PANEL.stash ? '倉庫' : PANEL.craft ? '鍛造' : '技能')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  ${
    /* 直立、上面疊著倉庫或技能寶石時：只放背包格子（要互拖的是背包） */ (PORT() && (PANEL.stash || PANEL.skill)) ||
    (land && tb === 'bag')
      ? ''
      : `<div class="eqrow col"><div class="doll" style="width:${Math.round(320 * z)}px;height:${Math.round(232 * z)}px">${eqs}</div>
  <div class="st">
    <span>傷害 <b>${Math.round(s.dmg[0])}–${Math.round(s.dmg[1])}</b></span><span>攻擊速度 <b>${s.aps.toFixed(2)}</b></span><span>暴擊 <b>${s.crit.toFixed(1)}%</b>${s.lukCrit ? `（有效 ${effCh(s.crit, 1).toFixed(1)}%）` : ''}</span><span title="打同等級普通怪的命中率（法術一律命中）">命中 <b>${s.acc}</b>（${Math.round(100 * hitChance(s.acc, mobEv(S.lv)))}%）</span>
    ${ATTR.map(k => `<span title="${ATTN[k]}：${{ str: '1 點 +2 生命', dex: '1 點 +8 命中值', int: '1 點 +2 魔力' }[k]}">${ATTN[k]} <b>${s[k]}</b></span>`).join('')}
    <span>生命 <b>${s.hp}</b></span>${s.es ? `<span>能量護盾 <b>${s.es}</b></span>` : ''}<span>護甲 <b>${s.armor}</b></span>${s.ev ? `<span>閃避 <b>${s.ev}</b></span>` : ''}<span>格擋 <b>${s.block}%</b>${s.lukBlock ? `（有效 ${capLuck(s.block, 50, 1).toFixed(1)}%）` : ''}${s.blockOver ? `（超限 +${s.blockOver}%）` : ''}</span>${s.defl ? `<span title="被擊中且沒閃避、格擋時，傷害 −40%">偏斜值 <b>${Math.round(s.defl)}</b>（${Math.round(capLuck(deflCh(15 + 6 * S.lv, s.defl), 95, s.lukDefl))}%）</span>` : ''}${s.thornAdd[1] ? `<span>荊棘 <b>${s.thornAdd[0]}–${s.thornAdd[1]}</b></span>` : ''}<span>精魂 <b>${s.spiritUsed}/${s.spirit}</b></span>
    ${res}
  </div></div>`
  }
  ${
    land && tb === 'eq'
      ? ''
      : `<div class="ph2">背包 <span>${PANEL.sellM ? '點一下＝選取／取消' : TOUCH.on ? '按住拖＝搬移 · 點一下＝說明與動作' : PANEL.craft ? '拖曳擺放 · 點一下＝放上鍛造台' : `拖曳擺放 · 點一下＝裝備／收起${PANEL.stash ? '／放進倉庫' : ''}`}</span></div>
  ${proInv()}${gridHTML(S.inv, 'inv')}`
  }
  <div class="foot">${G.scene !== 'hide' ? `<span class="c-dim">回藏身處才能賣東西</span>` : PANEL.sellM ? sellBar() : `<div class="sell" data-sell="1">拖到這裡賣掉</div><button class="btn" data-a="sellm">批量賣出</button>`}</div>`;
}
/* 批量賣出：選取普通／魔法、合計、賣出 */
function sellBar() {
  const L = S.inv.items.filter(it => SELLS.has(it.id)),
    sum = L.reduce((s, it) => s + sellPrice(it), 0);
  return `<div class="sellbar"><button class="btn mini" data-a="selr:0">全部普通</button><button class="btn mini" data-a="selr:1">全部魔法</button>
    <span>${L.length} 件 · <b class="c-gold">${sum}</b> 金</span><button class="btn pri" data-a="sellgo" ${L.length ? '' : 'disabled title="先點背包裡要賣的裝備"'}>賣出</button><button class="btn" data-a="sellm">取消</button></div>`;
}
function gridHTML(g, src) {
  return `<div class="grid" data-grid="${src}" style="width:${g.w * C}px;height:${g.h * C}px">${g.items.map(it => itemHTML(it, src)).join('')}</div>`;
}
function itemHTML(it, src, eqk) {
  const [w, h] = itemSize(it),
    pos = isSlot(src) ? '' : `left:${it.x * C}px;top:${it.y * C}px;width:${w * C}px;height:${h * C}px`;
  return `<div class="it r${it.r} ${isSlot(src) ? 'full' : ''} ${PANEL.sellM && src === 'inv' && SELLS.has(it.id) ? 'mk' : ''}" tabindex="0" role="button" aria-label="${esc(itemName(it))}" data-src="${src}" data-id="${it.id}" ${eqk ? `data-eqk="${eqk}"` : ''} style="${pos}">${icHTML(itemIc(it))}</div>`;
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
function skillHTML() {
  /* 一列一招，升滿直接在列上；點一招或一顆寶石，動作都在下方的檢視區 skIns。空的格子點一下＝挑一顆裝上（data-gen） */
  const M = MAT(),
    sel = SKUI.sel,
    all = gemAllPlan(eqGems()),
    sock = (key, it, cls, lab, bad) =>
      `<div class="eqs sock ${cls} ${it ? 'r3' : 'emp'} ${bad ? 'bad-link' : ''} ${sel === key ? 'sel' : ''}" data-sock="${key}" ${it ? '' : `data-gen="${key}" role="button" tabindex="0" aria-label="挑${lab}寶石"`}>${it ? itemHTML(it, 'sock', key) : `<small>${ICO.plus}</small>`}</div>`,
    upBtn = (g, key) => {
      const c = gemMaxCheck(g);
      if (g.lv >= GEM_MAX) return `<span class="gx-why">已滿</span>`;
      return c.why
        ? `<span class="gx-why" title="${esc(c.why)}">${esc(gemShort(c.why))}</span>`
        : `<button class="btn mini gx-up" data-gx="max:${key}" aria-label="升到 Lv ${c.lv}，花 ${fmtN(c.c)} 靈魂"><span>升到 ${c.lv}</span><small>${fmtN(c.c)} 魂</small></button>`;
    };
  const rows = S.skills
    .map((sl, i) => {
      const c = slotCfg(i),
        g = sl.a,
        key = i + ':a';
      if (!g)
        return `<div class="gx-row emp"><div class="gx-k"><kbd>${SLOTKEY[i]}</kbd>${sock(key, null, 'act', '技能')}</div><div class="gx-main"><small class="c-dim">空的：點空格挑一顆技能</small></div></div>`;
      const off = !wtOK(c.D)
          ? `<em class="c-bad">${needTxt(c.D)}</em>`
          : gemLack(g).length
            ? `<em class="c-bad">失效</em>`
            : '',
        N = skillNums(c),
        val = skMain(N),
        lab = N.dps != null ? 'DPS' : N.unit != null ? '單體' : N.dot != null ? '每秒' : '每下';
      /* 五個孔：開了的插輔助；沒開的畫鎖鏈，下一個可以點（照 PoE2） */
      const holes = Array.from({ length: GEM_SO_MAX }, (_, j) => {
        if (j < g.so) return sock(i + ':' + j, g.sup[j], 'sup', '輔助', g.sup[j] && !supOK(SKILLS[g.gem], g.sup[j], g));
        if (j > g.so) return `<div class="eqs sock sup lock">${ICO.chain}</div>`;
        const d = drillCheck(g);
        return `<button class="eqs sock sup lock next" data-fg="dri:${i}" ${d.why ? `disabled title="${esc(d.why)}"` : ''} aria-label="解鎖第 ${j + 1} 孔，要${DUSTS[d.m]} ×${d.n}${d.why ? '（' + d.why + '）' : ''}">${ICO.chain}<small>${d.n}</small></button>`;
      }).join('');
      return `<div class="gx-row ${sel && sel.split(':')[0] === '' + i ? 'on' : ''}" data-gx="sel:${key}" role="button" tabindex="0"><div class="gx-k"><kbd>${SLOTKEY[i]}</kbd>${sock(key, g, 'act', '技能')}</div><div class="gx-main"><div class="gx-l1"><b>${esc(c.D.n)}</b><span class="gx-lv">Lv ${g.lv}${c.lv > g.lv ? ` <i>+${c.lv - g.lv}</i>` : ''}</span>${off}<span class="gx-dps">${val != null ? `${lab} <i class="skv el-${N.el || 'phys'}">${fmtN(val)}</i>` : N.eff ? esc(N.eff) : ''}</span></div><div class="links">${holes}</div></div><div class="gx-r">${upBtn(g, key)}</div></div>`;
    })
    .join('');
  const auras = `<div class="gx-aura"><div class="gx-ah"><b>光環</b><span>精魂 ${ST.spiritUsed}/${ST.spirit}</span></div><div class="gx-as">${S.auras
    .map((g, j) => {
      const key = 'A:' + j,
        on = g && ST.auraOn.includes(g.gem);
      const bad = g && g.sup && g.sup.some(x => x && !supOK(AURAS[g.gem], x, g));
      return `<div class="gx-ac ${sel && sel.startsWith(key) ? 'on' : ''}" ${g ? `data-gx="sel:${key}" role="button" tabindex="0"` : ''}>${sock(key, g, 'act', '光環', g && (!on || bad))}<span>${g ? `<b>${esc(AURAS[g.gem].n)}</b><small class="${on ? '' : 'c-bad'}">${on ? `Lv ${g.lv}` : auraWhy(g, 1)}</small>` : '<small class="c-dim">空的</small>'}</span></div>`;
    })
    .join('')}</div></div>`;
  return `<div class="ph"><b>技能寶石</b><span class="gx-res">靈魂 <b>${fmtN(M.soul)}</b> · 粉 <b>${M.dust}／${M.fine}／${M.rare}</b></span>${swapB('背包')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="gx-bar"><button class="btn pri" data-gx="all" ${all.L.length ? '' : `disabled title="沒有能升的寶石"`}>${all.L.length ? `全部升滿 · ${all.L.length} 顆 · ${fmtN(all.c)} 魂` : '裝著的寶石都升到頂了'}</button><button class="btn mini gx-gen" data-gm="open:act">生成</button></div>
  <div class="gx-list">${rows}${auras}</div>
  ${sel ? skIns(sel, sock) : ''}`;
}
const SKUI = { sel: null, calc: 0 };
/* 光環沒生效的原因（0.2.57）：捷光環拿法系武器或空手、其他是精魂不夠；short＝光環卡上的短字 */
function auraWhy(g, short) {
  const wt = ST.wt;
  if (AURAS[g.gem].her && (wt === 'unarmed' || SPELLW.has(wt))) return short ? '要武器' : '要拿非法系武器，沒有生效';
  return short ? '缺精魂' : '精魂不夠，沒有生效';
}
/* 光環寶石的孔（0.2.57 F3）：光環卡放不下，畫在下方的檢視區；開孔跟技能寶石一樣 */
function auraLinks(j, g, sock) {
  const key = 'A:' + j;
  return `<div class="links gx-alinks">${Array.from({ length: GEM_SO_MAX }, (_, h) => {
    if (h < g.so) return sock(key + ':' + h, g.sup[h], 'sup', '輔助', g.sup[h] && !supOK(AURAS[g.gem], g.sup[h], g));
    if (h > g.so) return `<div class="eqs sock sup lock">${ICO.chain}</div>`;
    const d = drillCheck(g);
    return `<button class="eqs sock sup lock next" data-fg="dri:A:${j}" ${d.why ? `disabled title="${esc(d.why)}"` : ''} aria-label="解鎖第 ${h + 1} 孔，要${DUSTS[d.m]} ×${d.n}${d.why ? '（' + d.why + '）' : ''}">${ICO.chain}<small>${d.n}</small></button>`;
  }).join('')}</div>`;
}
/* 裝著的寶石（全部升滿的對象） */
const eqGems = () => [
  ...S.skills.flatMap(k => (k.a ? [k.a, ...k.a.sup.filter(Boolean)] : [])),
  ...S.auras.flatMap(g => (g ? [g, ...(g.sup || []).filter(Boolean)] : []))
];
/* 花掉現有靈魂一半以上才按兩次，其他一下完成 */
const gemBig = c => c >= MAT().soul * 0.5;
const skMain = n => n.dps ?? n.unit ?? n.dot ?? n.hit;
/* 列上的原因要短，詳細的在 title 和檢視區 */
const gemShort = w =>
  /靈魂/.test(w)
    ? '靈魂不夠'
    : /要角色/.test(w)
      ? w.replace(/^Lv \d+ 要/, '')
      : /^Lv \d+ 要/.test(w)
        ? '能力值不夠'
        : w;
/* 下方的檢視區：選中的那顆寶石，先看得到什麼，再看怎麼花 */
function skIns(key, sock) {
  const g = slotGet('sock', key),
    D = gemOf(g),
    main = !isSup(g) && !isAura(g),
    up = gemUpCheck(g),
    mx = gemMaxCheck(g),
    Q = gemQCheck(g),
    tgt = mx.why ? g.lv + 1 : mx.lv,
    done = g.lv >= GEM_MAX,
    host = isSup(g) && sockHost(key),
    hD = host && gemOf(host),
    /* 選了光環或光環孔裡的輔助：都在檢視區畫那顆光環的孔 */
    aHost = key[0] === 'A' && S.auras[+key.split(':')[1]];
  let delta = '';
  if (main && !done) {
    const a = skMain(skillNums(gemCfg(g, -1))),
      b = skMain(skillNums(gemCfg({ ...g, lv: tgt }, -1)));
    delta = `<div class="gx-d"><small>升到 Lv ${tgt}</small><b>${a != null ? `${fmtN(a)} → <i class="c-good">${fmtN(b)}</i>` : '效果不變'}</b></div>`;
  } else if (host && isAura(host)) {
    delta = `<div class="gx-d"><small>插在</small><b>${esc(hD.n)}</b></div>`;
  } else if (host) {
    const m0 = skMain(skillNums(gemCfg({ ...host, sup: host.sup.map(x => (x === g ? null : x)) }, -1))),
      m1 = skMain(skillNums(gemCfg(host, -1))),
      r = m0 ? m1 / m0 : 1;
    delta = `<div class="gx-d"><small>對${esc(SKILLS[host.gem].n)}</small><b>${Math.abs(r - 1) > 0.005 ? `DPS <i class="c-good">×${r.toFixed(2)}</i>` : '不影響數字'}</b></div>`;
  } else if (isAura(g)) delta = `<div class="gx-d"><small>預留精魂</small><b>${D.sp}</b></div>`;
  const lack = main && !done && gemLack({ ...g, lv: g.lv + 1 }),
    b = (fg, lab, sub, why) =>
      `<button class="btn gx-b" data-gx="${fg}" ${why ? `disabled title="${esc(why)}"` : ''}>${lab}<small>${esc(sub)}</small></button>`;
  return `<div class="gx-ins">
    <button class="x gx-c" data-gx="unsel" aria-label="收起">${ICO.x}</button>
    <div class="gx-ih">${icHTML(itemIc(g))}<div><b class="rc3">${esc(D.n)}</b><small class="gx-lv">Lv ${g.lv}${g.q ? ` · 品質 ${g.q}%` : ''}${main || (isAura(g) && g.so) ? ` · 孔 ${g.so}／${GEM_SO_MAX}` : ''}</small></div>${delta}</div>
    <p class="gx-txt">${termify(D.d)}</p>
    ${main && !wtOK(D) ? `<p class="gx-txt c-bad">${needTxt(D)}，沒有效果</p>` : ''}
    ${host && !supOK(hD, g, host) ? `<p class="gx-txt c-bad">${supDup(host, g) ? `這顆${isAura(host) ? '光環' : '技能'}已經有同分類的輔助，沒有效果` : `跟這個${isAura(host) ? '光環' : '技能'}不相容，沒有效果`}</p>` : ''}
    ${aHost && aHost.sup ? `<div class="gx-al"><small>${esc(AURAS[aHost.gem].n)}的孔</small>${auraLinks(+key.split(':')[1], aHost, sock)}</div>` : ''}
    ${isAura(g) && S.auras.includes(g) && !ST.auraOn.includes(g.gem) ? `<p class="gx-txt c-bad">${auraWhy(g)}</p>` : ''}
    ${main && gemLack(g).length ? `<p class="gx-txt c-bad">已失效，數值不算：${lackTxt(gemLack(g))}</p>` : lack && lack.length ? `<p class="gx-txt c-warn">升到 Lv ${g.lv + 1} 需要${lackTxt(lack)}，升了會失效</p>` : ''}
    <div class="gx-acts">
      ${b('up:' + key, '升 1 級', done ? '已滿' : up.why ? gemShort(up.why) : fmtN(up.c) + ' 魂', up.why)}
      ${b('max:' + key, done ? '已滿' : `升到 Lv ${mx.why ? g.lv : mx.lv}`, mx.why ? gemShort(mx.why) : fmtN(mx.c) + ' 魂', mx.why)}
      ${b('q:' + key, Q.n ? '品質到滿' : '品質已滿', Q.n ? Q.why || Math.min(Q.n, MAT().fine) + ' 精粉' : GEM_Q_MAX + '%', Q.why)}
    </div>
    <div class="gx-sub">
      <button class="btn mini" data-gx="swap:${key}">${main ? '換一招' : '換一顆'}</button>
      <button class="btn mini" data-gx="out:${key}">卸下</button>
      ${main ? `<button class="btn mini" data-gx="calc:">${SKUI.calc ? '收起算式' : '傷害算式'}</button>` : ''}
    </div>
    ${main && SKUI.calc ? skDetail(g) : ''}
  </div>`;
}
function gemSel(key) {
  SKUI.sel = key;
  SKUI.calc = 0;
  hideTip();
  hudPanels();
}
/* 升級後等級字閃一下：變的是哪一顆要看得到 */
const gemFlash = key =>
  document
    .querySelectorAll(key ? `[data-gx="sel:${key}"] .gx-lv, .gx-ins .gx-lv` : '.gx-lv')
    .forEach(el => el.classList.add('flash'));
function gemAct(b, e) {
  const [k, ...r] = b.dataset.gx.split(':'),
    key = r.join(':'),
    g = key && slotGet('sock', key);
  if (k === 'sel') {
    /* 列裡的格子、按鈕各管各的 */
    if (!e.target.closest('.eqs,.btn')) gemSel(key);
    return;
  }
  if (k === 'unsel') return (SKUI.sel = null), hudPanels();
  if (k === 'calc') return (SKUI.calc = !SKUI.calc), hudPanels();
  if (k === 'swap') return gemOpenFor(key);
  if (k === 'out') {
    if (!gridAuto(S.inv, g)) return hudWarn('背包滿了');
    slotSet('sock', key, null);
    SKUI.sel = null;
    sfx('click');
    return changed();
  }
  if (k === 'all') {
    const c = gemAllPlan(eqGems()).c;
    if (gemBig(c) && !confirm2(b, `再按一次：花 ${fmtN(c)} 魂`)) return;
    const n = gemUpAll(eqGems());
    hudWarn(`升了 ${n} 顆，花 ${fmtN(c)} 魂`);
  } else if (k === 'max') {
    const c = gemMaxCheck(g).c;
    if (gemBig(c) && !confirm2(b, `<span>再按一次</span><small>花 ${fmtN(c)} 魂</small>`)) return;
  }
  const err = k === 'up' ? gemUp(g) : k === 'max' ? gemUpMax(g) : k === 'q' ? gemQUp(g, true) : null;
  if (err) return hudWarn(err);
  sfx(k === 'q' ? 'equip' : 'lvup');
  changed();
  if (k !== 'q') gemFlash(key);
}
/* 技能列第二行的數字（skills.js 的 skillNums）：傷害用元素色、魔力藍、冷卻金 */
const fmtN = n => Math.round(n).toLocaleString('en-US');
const skDmg = (N, big) => {
  const cl = `skv el-${N.el || 'phys'}`,
    v = (lab, x) => `${lab} <i class="${cl}">${fmtN(x)}</i>`;
  if (N.eff) return `<span class="skeff">${esc(N.eff)}</span>`;
  if (N.dot != null) return v('每秒', N.dot);
  if (N.unit != null) return v('單體 DPS', N.unit);
  if (N.hit == null) return '';
  return v('每下', N.hit) + (N.dps != null ? (big || ' · ') + v('DPS', N.dps) : '');
};
const skLine = (c, N = skillNums(c)) =>
  [
    skDmg(N),
    c.mp ? `魔力 <i class="skv skmp">${c.mp}</i>` : '',
    c.cd ? `冷卻 <i class="skv skcd">${c.cd.toFixed(1)} 秒</i>` : ''
  ]
    .filter(Boolean)
    .join(' · ');
/* 名詞變成可以點（說明框有動作時、昇華面板才用；同一段文字只標第一次） */
const TERM_RE = new RegExp(
  Object.keys(TERMS)
    .sort((a, b) => b.length - a.length)
    .join('|'),
  'g'
);
const termify = t => {
  const seen = new Set();
  return esc(t).replace(TERM_RE, w =>
    seen.has(w) ? w : (seen.add(w), `<button class="term" data-term="${w}">${w}</button>`)
  );
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
/* 傷害算式：傷害怎麼算出來、每顆輔助的貢獻、下一級差多少 */
function skDetail(g) {
  const c = gemCfg(g, -1),
    D = c.D,
    N = skillNums(c),
    main = skMain,
    row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`,
    rows = [];
  if (N.hit != null) {
    if (isSpell(D)) rows.push(row('基礎', `寶石 Lv ${c.lv}：${fmtN(spellDmg(c.lv, 1) * D.m)}`));
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
  if (D.tags.includes('proj')) rows.push(row('投射物', c.proj));
  const sups = (g.sup || [])
      .filter(sp => sp && supOK(D, sp, g))
      .map(sp => {
        const qs = sp.q || 0;
        const n = skillNums(gemCfg({ ...g, sup: g.sup.map(x => (x === sp ? null : x)) }, -1)),
          r = N.hit != null && main(n) ? main(N) / main(n) : 1,
          S0 = gemOf(sp);
        return `<li><b>${esc(S0.n)}</b>${Math.abs(r - 1) > 0.005 ? ` <i class="skv">×${r.toFixed(2)}</i>` : ''}<small>${esc(S0.d)}</small><small class="gq">品質 ${qs}%：${esc(qualText(sp.gem, qs || GEM_Q_MAX))}${qs ? '' : '（做到 20% 時）'}</small></li>`;
      })
      .join(''),
    nx = g.lv < GEM_MAX && gemCfg({ ...g, lv: g.lv + 1 }, -1),
    nN = nx && skillNums(nx);
  return `<div class="skd"><dl>${rows.join('')}</dl>${sups ? `<ul>${sups}</ul>` : ''}${
    nx
      ? `<p class="base">下一級：${main(N) != null ? `${N.dps != null ? 'DPS' : '傷害'} ${fmtN(main(N))} → <i class="skv">${fmtN(main(nN))}</i>` : '效果不變'}${nx.mp !== c.mp ? ` · 魔力 ${c.mp} → ${nx.mp}` : ''}</p>`
      : '<p class="base">已經滿級</p>'
  }<p class="hint">不算怪物的抗性、護甲和閃避，實際打怪會比較低</p></div>`;
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
  if (iv) return (PANEL.invT = iv.dataset.invt), hudPanels();
  const tm = e.target.closest('[data-term]');
  if (tm) return showTerm(tm);
  if (!e.target.closest('#ttip')) $('ttip').hidden = true;
  const gs = e.target.closest('[data-gen]');
  if (gs) return gemOpenFor(gs.dataset.gen);
  const gx = e.target.closest('[data-gx]');
  if (gx) return gemAct(gx, e);
  const gu = e.target.closest('[data-gu]');
  if (gu) {
    if (gu.disabled) return;
    const [k, id] = gu.dataset.gu.split(':'),
      g = allGems().find(x => x.id === +id);
    if (!g) return;
    /* 花掉一半以上靈魂才按兩次 */
    if (k === 'max' && gemBig(gemMaxCheck(g).c) && !confirm2(gu, `再按一次：花 ${gemMaxCheck(g).c} 魂`)) return;
    const err = k === 'max' ? gemUpMax(g) : gemUp(g);
    if (err) hudWarn(err);
    else sfx('lvup');
    changed();
    /* 說明框原地更新（有 act 的觸控說明框含搬移按鈕，重畫時沿用） */
    if (TIPRE) showTip(TIPRE.b(), TIPRE.a);
    return;
  }
  const gr = e.target.closest('[data-gr]');
  if (gr)
    return gemRowClick(
      S.gems.find(g => g.id === +gr.dataset.gr),
      gr
    );
  /* 點說明框以外：收起說明框 */
  if (!e.target.closest('#tip,#ttip') && $('tip').classList.contains('act') && !TOUCH.on) hideTip();
});
/* 生成寶石（0.2.7，照 PoE2 選技能）：上面三種、左邊頁籤（主動照武器、輔助與精魂照標籤）、右邊照使用等級分組 */
/* to：從格子打開＝挑一顆直接裝進這格（'技能欄:a' 技能、'技能欄:孔' 輔助、'A:格' 光環），只列裝得進去的；格子有東西就換掉 */
const GEMUI = { kind: 'act', tab: null, to: null };
function gemOpenFor(key) {
  GEMUI.to = key;
  GEMUI.kind = !sockMain(key) ? 'sup' : key[0] === 'A' ? 'aura' : 'act';
  GEMUI.tab = null;
  PANEL.gem = true;
  hideTip();
  sfx('click');
  hudPanels();
}
/* 這一顆能不能直接裝進 GEMUI.to（輔助還要跟那招相容） */
function gemFits(k) {
  const to = GEMUI.to;
  if (!to) return true;
  if (!slotFits('sock', to, { gem: k })) return false;
  const a = sockHost(to);
  return !a || supOK(gemOf(a), { gem: k });
}
/* 這顆輔助插進這個孔 DPS 會多多少；不會變多就不寫 */
function gemGain(to, x) {
  const [i, p] = to.split(':');
  if (i === 'A' || p === 'a' || !SUPPORTS[x.gem]) return '';
  const a = S.skills[i].a,
    m0 = skMain(skillNums(gemCfg(a, -1))),
    m1 = skMain(skillNums(gemCfg({ ...a, sup: a.sup.map((s, j) => (j === +p ? x : s)) }, -1)));
  return m0 && m1 > m0 * 1.005 ? `<i class="gx-gain">DPS +${Math.round((m1 / m0 - 1) * 100)}%</i>` : '';
}
/* 裝進格子，原本的寶石回背包（滿了進倉庫的寶石頁）。換技能時相容的輔助照新寶石的孔數帶過去，
   跟手動一顆一顆搬的結果一樣，孔不跟著走；能力值不夠就不裝 */
function gemPut(to, g) {
  const lk = slotLack('sock', to, g);
  if (lk.length) return hudWarn('能力值不足：' + lackTxt(lk)), false;
  const old = slotGet('sock', to);
  if (old && to.endsWith(':a'))
    old.sup.forEach((s, j) => {
      const hole = g.sup.indexOf(null),
        t = { ...g, sup: [...g.sup.filter(Boolean), s] };
      if (s && hole >= 0 && supOK(SKILLS[g.gem], s, t) && !gemLack(t).length) (g.sup[hole] = s), (old.sup[j] = null);
    });
  slotSet('sock', to, g);
  if (old && !gridAuto(S.inv, old)) S.gems.push(old);
  SKUI.sel = to;
  PANEL.gem = false;
  GEMUI.to = null;
  return true;
}
/* 從背包或倉庫的寶石頁拿一顆裝上 */
function gemTake(id) {
  const from = [S.inv.items, S.gems].find(L => L.some(x => x.id === id)),
    it = from.find(x => x.id === id);
  from.splice(from.indexOf(it), 1);
  if (!gemPut(GEMUI.to, it)) return from.push(it);
  sfx('equip');
  changed();
}
const GEMKIND = { act: '主動技能', sup: '輔助寶石', aura: '精魂' };
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
  召喚: ['pack', 'giant'],
  轉換: ['totemc']
};
function gemTabs(kind) {
  const by = (n, ks) => ({ n, ks: ks.sort((a, b) => gemLv(a) - gemLv(b)) });
  let tabs;
  if (kind === 'act') {
    const K = Object.keys(SKILLS),
      tg = (k, t) => SKILLS[k].tags.includes(t);
    /* 0.2.13：綁武器的放武器頁（錘與鏈錘同一頁、盾一頁），不綁的照分類（元素、秘術、原始）；空的頁不顯示 */
    tabs = [
      ...Object.entries(WTN)
        .filter(([w]) => w !== 'flail')
        .map(([w, n]) =>
          by(
            w === 'mace' ? '錘・鏈錘' : n,
            K.filter(k => (SKILLS[k].wt || []).includes(w))
          )
        ),
      by(
        '盾',
        K.filter(k => SKILLS[k].off === 'shield')
      ),
      ...[
        ['elem', '元素'],
        ['occ', '秘術'],
        ['pri', '原始']
      ].map(([t, n]) =>
        by(
          n,
          K.filter(k => !SKILLS[k].wt && tg(k, t))
        )
      )
    ].filter(t => t.ks.length);
  } else if (kind === 'sup') {
    const seen = new Set(Object.values(SUPTAB).flat());
    tabs = Object.entries(SUPTAB).map(([n, ks]) =>
      by(
        n,
        ks.filter(k => SUPPORTS[k])
      )
    );
    /* 沒列在 SUPTAB 的放通用；II（0.2.51）跟著 I 排在同一頁。放完再照使用等級排一次，不然右邊分組的順序會亂 */
    tabs[0].ks.push(...Object.keys(SUPPORTS).filter(k => !seen.has(k) && !SUPPORTS[k].tier));
    tabs = tabs.map(t =>
      by(
        t.n,
        t.ks.flatMap(k => (SUPPORTS[k + '2'] ? [k, k + '2'] : [k]))
      )
    );
  } else
    tabs = [
      by(
        '光環',
        Object.keys(AURAS).filter(k => !AURAS[k].fx.wolf)
      ),
      by(
        '召喚',
        Object.keys(AURAS).filter(k => AURAS[k].fx.wolf)
      )
    ];
  return tabs.filter(t => t.ks.length);
}
/* 能不能生成：角色等級、靈魂；回傳原因或 null */
const gemCost = k => soulCost(1);
const gemWhy = k =>
  S.lv < gemLv(k) ? `角色 Lv ${gemLv(k)} 才能生成` : MAT().soul < gemCost(k) ? `靈魂不夠（要 ${gemCost(k)}）` : null;
function gemMake(k) {
  const why = gemWhy(k);
  if (why) return hudWarn(why);
  const g = mkGem(k),
    to = GEMUI.to;
  if (to) {
    if (!gemPut(to, g)) return;
  } else if (!gridAuto(S.inv, g)) return hudWarn('背包滿了');
  MAT().soul -= gemCost(k);
  hudWarn(`生成了「${gemOf(g).n}」，${to ? '裝上了' : '放進背包'}`);
  sfx('pick');
  changed();
}
function gemHTML() {
  const to = GEMUI.to,
    tabs = gemTabs(GEMUI.kind)
      .map(t => ({ ...t, ks: t.ks.filter(gemFits) }))
      .filter(t => t.ks.length),
    tab = tabs.find(t => t.n === GEMUI.tab) || tabs[0],
    lvs = tab ? [...new Set(tab.ks.map(gemLv))] : [],
    /* 從格子打開：標題寫要裝到哪一格，不給切種類；先列你有的，再列可以生成的 */
    old = to && slotGet('sock', to),
    own = to ? [...S.inv.items, ...S.gems].filter(g => g.gem && gemFits(g.gem)) : [],
    where =
      to &&
      (to[0] === 'A'
        ? `光環欄 ${+to.split(':')[1] + 1}`
        : `${SLOTKEY[to.split(':')[0]]} 技能欄${to.endsWith(':a') ? '' : '的輔助孔'}`);
  const head = `<div class="ph"><b>${to ? `挑一顆${to[0] === 'A' ? '光環' : to.endsWith(':a') ? '技能' : '輔助'}` : '生成寶石'}</b><span>${to ? `裝到${where} · ` : ''}靈魂 <b class="c-gold">${MAT().soul}</b> · 角色 Lv ${S.lv}${to ? '' : ' · 寶石不能賣'}</span><button class="x" aria-label="關閉" data-gm="close">${ICO.x}</button></div>
  ${
    to
      ? ''
      : `<div class="gkind">${Object.entries(GEMKIND)
          .map(([k, n]) => `<button class="btn ${k === GEMUI.kind ? 'on' : ''}" data-gm="kind:${k}">${n}</button>`)
          .join('')}</div>`
  }${old && to.endsWith(':a') ? `<p class="gx-carry">舊的「${esc(gemOf(old).n)}」回背包；相容的輔助帶過去，超過新寶石孔數的留在舊寶石上</p>` : ''}${
    own.length
      ? `<div class="ph2">你有的 <span>放進去不用花靈魂</span></div><div class="gx-own">${own.map(g => `<button class="gpr gx-o" data-gm="put:${g.id}">${icHTML(itemIc(g))}<b>${esc(gemOf(g).n)}</b><span>Lv ${g.lv}</span>${gemGain(to, g)}</button>`).join('')}</div>${tab ? '<div class="ph2">生成新的</div>' : ''}`
      : ''
  }`;
  if (!tab)
    return (
      head +
      (own.length ? '' : `<p class="sethint">沒有能裝進這一格的寶石（輔助要跟這招相容、不能跟已經插的同分類）</p>`)
    );
  return `${head}
  <div class="gwrap"><div class="gtabs">${tabs
    .map(
      t =>
        `<button class="gtab ${t === tab ? 'on' : ''}" data-gm="tab:${t.n}">${t.n}<small>${t.ks.length}</small></button>`
    )
    .join('')}</div>
  <div class="glist">${lvs
    .map(
      L =>
        `<div class="glv"><h4 class="${S.lv < L ? 'c-dim' : ''}">Lv ${L}${S.lv < L ? ' ' + ICO.lock : ''}</h4>${tab.ks
          .filter(k => gemLv(k) === L)
          .map(k => {
            const G0 = gemOf({ gem: k }),
              why = gemWhy(k);
            return `<div class="gcard ${S.lv < L ? 'lock' : ''}">${icHTML(G0.ic)}<div><b>${esc(G0.n)}</b>${to ? gemGain(to, { gem: k, lv: 1, q: 0 }) : ''}<small>${esc(G0.d)}</small></div><button class="btn mini" data-gm="mk:${k}" ${why ? `disabled title="${esc(why)}"` : ''}>生成 ${gemCost(k)} 魂</button></div>`;
          })
          .join('')}</div>`
    )
    .join('')}</div></div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-gm]');
  if (!b) return;
  const [k, v] = b.dataset.gm.split(':');
  if (k === 'open') (GEMUI.kind = v), (GEMUI.tab = null), (GEMUI.to = null), (PANEL.gem = true);
  else if (k === 'kind') (GEMUI.kind = v), (GEMUI.tab = null);
  else if (k === 'tab') GEMUI.tab = v;
  else if (k === 'mk') return gemMake(v);
  else if (k === 'put') return gemTake(+v);
  else if (k === 'close') (PANEL.gem = false), (GEMUI.to = null);
  sfx('click');
  hudPanels();
});

/* 昇華石碑：上面選昇華，盤面的位置跟天賦樹中間一樣，直接在這裡點；換昇華免費、點數全部退回 */
const ASCUI = { v: null, n: null };
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
  return `<div class="ax-cap" data-n="${sel.id}"><div><b>${esc(sel.n)}</b>${gn ? `<i>${['', '', '二選一', '三選一'][gn]}</i>` : ''}<p>${txt}</p></div>${
    cur && !start
      ? `<button class="btn ${on ? '' : 'pri'}" data-ax="t:${sel.id}" ${w ? `disabled title="${esc(w)}"` : ''}>${w || (on ? '退回' : `點亮 · 剩 ${ascLeft()} 點`)}</button>`
      : ''
  }</div>`;
}
function ascHTML() {
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
  return `<div class="ph"><b>昇華石碑</b><span class="ax-sum">剩 <b class="c-gold">${S.asc ? ascLeft() : ascPoints(S)}</b> 點${S.asc ? ` · 小 ${sm}/4 · 大 ${bg}/4` : ''}</span>${S.at.length > 1 ? `<button class="btn mini ax-reset" data-ax="reset">重置</button>` : ''}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="ax-tabs" role="tablist">${Object.entries(ASC)
    .map(
      ([id, B]) =>
        `<button class="ax-tab ${id === k ? 'on' : ''}" role="tab" aria-selected="${id === k}" data-ax="v:${id}">${icHTML(B.ic)}<span>${B.n}${S.asc === id ? '<i>目前</i>' : ''}</span></button>`
    )
    .join('')}</div>
  <div class="ax-chart"><div class="ax-disc"></div><svg viewBox="${-R} ${-R} ${2 * R} ${2 * R}" aria-hidden="true">${lines}</svg>${nodes}</div>
  <div class="ax-side">${ascCap(k, T, sel)}<ul class="ax-list">${list}${nx ? `<li class="ax-note">第一次打倒 Lv ${nx} 地圖的王：昇華點 +2。換昇華免費，點數全部退回</li>` : ''}</ul>${cur ? '' : `<button class="btn pri ax-pick" data-a="asc:${k}">${S.asc ? `改成${A.n}（點數退回）` : `成為${A.n}`}</button>`}</div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ax]');
  if (!b || e.target.closest('.term')) return;
  const [k, id] = b.dataset.ax.split(':'),
    cur = S.asc === ASCUI.v;
  if (k === 'v') (ASCUI.v = id), (ASCUI.n = null), sfx('click');
  else if (k === 'n') {
    /* 盤面：桌機點一下就點亮、手機第一下選取第二下點亮（跟天賦樹一樣）；清單只選取 */
    const again = !TOUCH.on || ASCUI.n === id,
      can = cur && id !== 'a_st' && b.classList.contains('ax-n') && again;
    ASCUI.n = id;
    if (can) {
      const w = ascWhy(id, ascT());
      if (w) hudWarn(w);
      else treeToggle(id);
    }
  } else if (k === 't') treeToggle(id);
  else if (k === 'reset') {
    if (!confirm2(b, '再按一次：退回昇華點')) return;
    S.at = ['a_st'];
    treeChanged();
  }
  hudPanels();
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
const SHOPUI = { last: null, sel: null };
/* 這一種在目前物品等級會出哪些基底（機率照 pickBase 的權重，高階的多一點） */
const gamBases = o => {
  const L = BASES.filter(b => b.k === o.k && (!o.wt || b.wt === o.wt) && b.lv <= gamIlvl(S));
  return (L.length ? L : BASES.filter(b => b.k === o.k && (!o.wt || b.wt === o.wt)))
    .slice()
    .sort((a, b) => b.lv - a.lv);
};
function shopSel() {
  const o = GAMBLE.flatMap(g => g[1]).find(x => x.id === SHOPUI.sel);
  if (!o) return '<p class="fhint">先選一種，會列出可能出現的基底</p>';
  const L = gamBases(o),
    sum = L.reduce((s, b) => s + 1 + b.lv / 4, 0);
  return `<div class="shopsel"><div class="ph2">${esc(o.n)} <span>可能的基底 ${L.length} 種</span></div><ul>${L.slice(
    0,
    6
  )
    .map(
      b => `<li>${icHTML(b.ic)}<span>${esc(b.n)}</span><small>${Math.round(((1 + b.lv / 4) / sum) * 100)}%</small></li>`
    )
    .join('')}${L.length > 6 ? `<li class="c-dim">還有 ${L.length - 6} 種低階基底</li>` : ''}</ul>
    <button class="btn pri" data-a="gam:${o.id}" ${S.gold < gamPrice(S) ? 'disabled' : ''}>買一件 · ${gamPrice(S)} 金</button></div>`;
}
function shopHTML() {
  const L = SHOPUI.last,
    left = gamLeft(S);
  return `<div class="ph"><b>天星商會</b><span>金幣 <b class="c-gold">${S.gold}</b> · 每件 <b class="c-gold">${gamPrice(S)}</b> 金 · 物品等級 ${gamIlvl(S)}</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <p class="tsay">「${TRADER_SAY[(S.story.shopN || 0) % TRADER_SAY.length]}」</p>
  <p class="sethint">選一種，買一件隨機的裝備：品質 0%、沒有孔、潛能 3，詞綴最高 T2。${left > 0 ? `再 ${left} 件沒出稀有，下一件必出` : '<span class="c-gold">這一件必出稀有</span>'}</p>
  ${L ? `<div class="shopres">${icHTML(itemIc(L))}<span><b class="rc${L.r}">${esc(itemName(L))}</b><small>放進背包了</small></span></div>` : ''}
  ${shopSel()}
  ${GAMBLE.map(([n, xs]) => `<div class="ph2">${n}</div><div class="shopg">${xs.map(x => `<button class="shopb ${SHOPUI.sel === x.id ? 'on' : ''}" data-a="gsel:${x.id}">${icHTML(gamBases(x)[0].ic)}<span>${x.n}</span></button>`).join('')}</div>`).join('')}`;
}
/* ---------- 寶石頁（0.2.35）：倉庫的清單式分頁、不限數量；主動／輔助／光環三組，上面有類型篩選與搜尋 ---------- */
const GP = { k: 'all', q: '' };
const GP_KINDS = [
  ['all', '全部'],
  ['act', '主動'],
  ['sup', '輔助'],
  ['aura', '光環']
];
const gemKind = g => (isAura(g) ? 'aura' : isSup(g) ? 'sup' : 'act');
function gpList() {
  const q = GP.q.trim().toLowerCase(),
    L = S.gems.filter(g => (GP.k === 'all' || gemKind(g) === GP.k) && (!q || gemOf(g).n.toLowerCase().includes(q))),
    row = g =>
      `<button class="gpr" data-gr="${g.id}">${icHTML(itemIc(g))}<b>${esc(gemOf(g).n)}</b><span>Lv ${g.lv}</span><span class="${g.q ? 'c-good' : 'c-dim'}">品質 ${g.q || 0}%</span></button>`,
    html = GP_KINDS.slice(1)
      .map(([k, n]) => {
        const l = L.filter(g => gemKind(g) === k).sort(
          (a, b) => gemOf(a).n.localeCompare(gemOf(b).n, 'zh-Hant') || b.lv - a.lv
        );
        return l.length ? `<h4 class="gph">${n} <i>${l.length}</i></h4>${l.map(row).join('')}` : '';
      })
      .join('');
  return html || `<p class="fhint">${S.gems.length ? '沒有符合的寶石' : '空的：從背包放進倉庫的寶石會自動進來'}</p>`;
}
function gemPageHTML() {
  return `<div class="gpbar"><div class="gkind">${GP_KINDS.map(([k, n]) => `<button class="btn ${GP.k === k ? 'on' : ''}" data-gp="${k}" aria-pressed="${GP.k === k}">${n}</button>`).join('')}</div><input class="inp" id="gpq" type="search" placeholder="搜尋寶石名" value="${esc(GP.q)}" aria-label="搜尋寶石"></div>
  <p class="fhint">${TOUCH.on ? '點一下看說明、放進背包' : '點一下＝放進背包 · 滑過去看說明與升級'}</p>
  <div class="gplist" id="gplist" data-gempage>${gpList()}</div>`;
}
const gpAnchor = el => el.getBoundingClientRect();
function gemToBag(g) {
  if (!g) return;
  if (!gridAuto(S.inv, g)) return hudWarn('背包滿了');
  S.gems.splice(S.gems.indexOf(g), 1);
  sfx('equip');
  hideTip();
  changed();
}
/* 點寶石頁的一行：桌機直接放進背包；觸控先看說明（有放進背包、升級、升滿） */
function gemRowClick(g, el) {
  if (!g) return;
  if (!TOUCH.on) return gemToBag(g);
  const build = () => itemTip(g) + `<div class="tqa"><button class="btn pri" data-gb="${g.id}">放進背包</button></div>`;
  const a = gpAnchor(el);
  $('tip').classList.add('act');
  showTip(build(), a);
  TIPRE = { b: build, a };
}
document.addEventListener('input', e => {
  if (e.target.id !== 'gpq') return;
  GP.q = e.target.value;
  $('gplist').innerHTML = gpList();
});
document.addEventListener('click', e => {
  const k = e.target.closest('[data-gp]'),
    b = e.target.closest('[data-gb]');
  if (k) (GP.k = k.dataset.gp), hudPanels();
  if (b) gemToBag(S.gems.find(g => g.id === +b.dataset.gb));
});

/* ---------- 找道具、移動道具 ---------- */
const GRIDS = () => ({ inv: S.inv, stash: S.stash, temp: S.temp });
/* 欄位：裝備欄 eq（key＝欄位名）、寶石插槽 sock（key＝「技能欄:a」是技能、「技能欄:0／1」是輔助） */
const isSlot = src => src === 'eq' || src === 'sock';
/* 寶石的孔（0.2.57 F3）：「技能欄:孔」是技能寶石的孔、「A:格:孔」是光環寶石的孔；sockHost＝孔的主人（不是孔就是 null） */
const sockMain = key => key.endsWith(':a') || /^A:\d+$/.test(key);
function sockHost(key) {
  if (sockMain(key)) return null;
  const [i, p] = key.split(':');
  return i === 'A' ? S.auras[+p] : S.skills[i].a;
}
function slotGet(src, key) {
  /* 護符欄是 ch0～（胸甲 chest 也是 ch 開頭，不能只看前兩個字） */
  if (src === 'eq') return /^ch\d$/.test(key) ? S.charms[+key[2]] : S.eq[key];
  if (sockMain(key)) return key[0] === 'A' ? S.auras[+key.split(':')[1]] : S.skills[key.split(':')[0]].a;
  const a = sockHost(key);
  return a && a.sup ? a.sup[+key.split(':').pop()] : null;
}
function slotSet(src, key, it) {
  if (src === 'eq') return /^ch\d$/.test(key) ? (S.charms[+key[2]] = it) : (S.eq[key] = it);
  const [i, p] = key.split(':');
  if (!sockMain(key)) sockHost(key).sup[+key.split(':').pop()] = it;
  else if (i === 'A') S.auras[+p] = it;
  else S.skills[i].a = it;
}
/* 放進這個欄位缺什麼能力值（0.2.42）：裝備看等級與能力值（eqLack）、技能寶石看插槽裡那顆技能的需求（輔助會讓它 +5） */
function slotLack(src, key, it) {
  if (src === 'eq') return /^ch\d$/.test(key) ? [] : eqLack(S, it, key);
  if (key.endsWith(':a')) return gemLack(it);
  const a = sockHost(key),
    h = +key.split(':').pop();
  return a ? gemLack({ ...a, sup: [...a.sup.filter((x, j) => j !== h), it] }) : [];
}
const slotFits = (src, key, it) =>
  src === 'eq' && /^ch\d$/.test(key)
    ? !!it.charm && +key[2] < charmSlots(S)
    : src === 'eq'
      ? eqTakes(
          EQS.find(q => q.k === key),
          kindOf(it)
        ) &&
        (key !== 'off' || offOK(S.eq.weapon, it)) &&
        !slotLack(src, key, it).length
      : !!it.gem &&
        !slotLack(src, key, it).length &&
        (/^A:\d+$/.test(key)
          ? isAura(it)
          : key.endsWith(':a')
            ? !isSup(it) && !isAura(it)
            : isSup(it) && sockFits(sockHost(key), +key.split(':').pop(), it));
/* 輔助插得進這個孔：孔開了、同分類不能同插（換掉同一格的自己不算） */
const sockFits = (a, h, it) =>
  !!a && h < a.so && !a.sup.some((x, j) => x && x !== it && j !== h && supCat(x.gem) === supCat(it.gem));
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
/* 放回原處（原位放不下就找空位） */
function putBack(src, it, eqk, ox, oy) {
  if (isSlot(src)) return slotSet(src, eqk, it), true;
  const g = GRIDS()[src],
    [w, h] = itemSize(it);
  if (ox != null && gridFree(g, ox, oy, w, h)) {
    it.x = ox;
    it.y = oy;
    g.items.push(it);
    return true;
  }
  return gridAuto(g, it);
}
function changed() {
  /* 換上雙手武器（或換掉弓）：不合規的副手收進背包 */
  if (!offOK(S.eq.weapon, S.eq.off)) {
    const off = S.eq.off;
    const why = offWhy(S.eq.weapon, off);
    if (gridAuto(S.inv, off)) (S.eq.off = null), hudWarn(why + '：副手收進背包');
    else hudWarn('背包滿了：副手沒有作用（' + why + '）');
  }
  const hpF = P.hp / ST.hp;
  ST = stats();
  P.hp = Math.min(ST.hp, Math.max(1, hpF * ST.hp));
  P.mp = Math.min(ST.mp, P.mp);
  save();
  hudPanels();
  hudBar();
}
/* 點一下：背包→裝上、身上→收進背包、倉庫↔背包 */
function quickMove(src, it, eqk) {
  /* 鍛造台開著：點裝備＝放上鍛造台 */
  if (PANEL.craft && !it.gem) return craftPick(src, it, eqk);
  /* 技能面板的孔：點一下＝選取，卸下在檢視區；拖曳不變 */
  if (src === 'sock') return gemSel(eqk);
  if (isSlot(src)) {
    if (!gridAuto(S.inv, it)) return hudWarn('背包滿了');
    slotSet(src, eqk, null);
  } else if (it.gem && src === 'inv' && !PANEL.stash) {
    /* 寶石：技能放進第一個空的技能欄、輔助放進第一個相容的空插槽 */
    const key = gemSlotFor(it);
    if (!key)
      return hudWarn(isAura(it) ? '光環欄滿了' : isSup(it) ? '沒有空的輔助插槽' : '技能欄滿了：拖到想換的那一欄');
    const lk = slotLack('sock', key, it);
    if (lk.length) return hudWarn('能力值不足：' + lackTxt(lk));
    takeOut('inv', it);
    slotSet('sock', key, it);
    if (!PANEL.skill) openPanel('skill');
    TOUCH.front = 'other';
  } else if (src === 'stash' || src === 'temp') {
    takeOut(src, it);
    if (!gridAuto(S.inv, it)) return gridAuto(S[src], it), hudWarn('背包滿了');
  } else if (PANEL.stash && it.gem) {
    /* 寶石放進倉庫＝進寶石頁 */
    takeOut('inv', it);
    S.gems.push(it);
  } else if (PANEL.stash) {
    takeOut('inv', it);
    if (!gridAuto(S.stash, it)) return gridAuto(S.inv, it), hudWarn('倉庫滿了');
  } else if (it.charm) {
    /* 護符：放進第一個空的護符槽 */
    const i = S.charms.findIndex((c, j) => !c && j < charmSlots(S));
    if (i < 0) return hudWarn(charmSlots(S) ? '護符槽滿了：拖到想換的那一格' : '要先裝腰帶才有護符槽');
    takeOut('inv', it);
    S.charms[i] = it;
  } else {
    const k = kindOf(it),
      slots = EQS.filter(e => eqTakes(e, k)),
      /* 武器：主手空著放主手；主手有武器、而且副手能拿這把（權杖、雙持）才放副手，不然換掉主手 */
      e =
        k === 'weapon'
          ? EQS.find(q => q.k === (S.eq.weapon && !S.eq.off && offOK(S.eq.weapon, it) ? 'off' : 'weapon'))
          : slots.find(e => !S.eq[e.k]) || slots[0];
    if (!e) return;
    if (e.k === 'off' && !offOK(S.eq.weapon, it)) return hudWarn(offWhy(S.eq.weapon, it));
    const lack = eqLack(S, it, e.k);
    if (lack.length) return hudWarn('不符合需求：' + lackTxt(lack));
    const old = S.eq[e.k],
      ox = it.x,
      oy = it.y;
    takeOut('inv', it);
    S.eq[e.k] = it;
    if (old && !putBack('inv', old, null, ox, oy)) {
      S.eq[e.k] = old;
      gridAuto(S.inv, it);
      return hudWarn('背包滿了');
    }
  }
  sfx('equip');
  changed();
}
function gemSlotFor(it) {
  if (isAura(it)) {
    const j = S.auras.findIndex(g => !g);
    return j < 0 ? null : 'A:' + j;
  }
  for (let i = 0; i < NSLOT; i++) {
    const sl = S.skills[i];
    if (!isSup(it) && !sl.a) return i + ':a';
    if (
      isSup(it) &&
      sl.a &&
      supOK(SKILLS[sl.a.gem], it) &&
      !sl.a.sup.some(x => x && supCat(x.gem) === supCat(it.gem))
    ) {
      const j = sl.a.sup.findIndex(x => !x);
      if (j >= 0) return i + ':' + j;
    }
  }
  if (isSup(it))
    for (let i = 0; i < AURA_SLOTS; i++) {
      const a = S.auras[i],
        j = a && a.sup && supOK(AURAS[a.gem], it) ? a.sup.findIndex(x => !x) : -1;
      if (j >= 0 && sockFits(a, j, it)) return 'A:' + i + ':' + j;
    }
  if (isSup(it))
    for (let i = 0; i < NSLOT; i++) {
      const a = S.skills[i].a,
        j = a && !a.sup.some(x => x && supCat(x.gem) === supCat(it.gem)) ? a.sup.findIndex(x => !x) : -1;
      if (j >= 0) return i + ':' + j;
    }
  return null;
}
function sell(src, it, eqk) {
  if (it.gem) return hudWarn('寶石不能賣（要的話再生成就好）');
  takeOut(src, it, eqk);
  const p = sellPrice(it);
  S.gold += p;
  hudWarn(`賣了 ${p} 金`);
  sfx('coin');
  changed();
}
/* 丟到地上：地圖裡掉在腳邊（離開地圖就消失、過濾器不會再撿回來）；藏身處直接消失，稀有以上要丟兩次 */
let DROP_ARM = 0;
function dropFloor(src, it, eqk) {
  if (G.scene === 'hide' && it.r >= 2 && DROP_ARM !== it.id) {
    DROP_ARM = it.id;
    hudWarn('再丟一次就會消失');
    return hudPanels();
  }
  DROP_ARM = 0;
  takeOut(src, it, eqk);
  SELLS.delete(it.id);
  if (G.scene === 'hide') hudWarn('丟掉了');
  else {
    dropAt(P.x, P.y, { it, nopick: 1 });
    for (const d of G.drops) delete d.full;
  }
  sfx('pick');
  changed();
}
/* 批量賣出模式：點一下＝選取／取消（寶石不能賣） */
function sellMark(it) {
  if (it.gem) return hudWarn('寶石不能賣');
  SELLS.has(it.id) ? SELLS.delete(it.id) : SELLS.add(it.id);
  sfx('pick');
  hudPanels();
}
function sellAll() {
  const L = S.inv.items.filter(it => SELLS.has(it.id));
  let sum = 0;
  for (const it of L) takeOut('inv', it), (sum += sellPrice(it));
  S.gold += sum;
  SELLS.clear();
  PANEL.sellM = false;
  hudWarn(`賣了 ${L.length} 件，${sum} 金`);
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
  const r = el.getBoundingClientRect(),
    [w, h] = itemSize(it);
  /* 抓哪一格就跟哪一格 */
  const gx = isSlot(src) ? Math.floor(w / 2) : Math.min(w - 1, Math.floor((e.clientX - r.left) / C)),
    gy = isSlot(src) ? Math.floor(h / 2) : Math.min(h - 1, Math.floor((e.clientY - r.top) / C));
  DR = { src, eqk, it, el, w, h, gx, gy, x0: e.clientX, y0: e.clientY, moved: false, ox: it.x, oy: it.y };
  el.setPointerCapture && el.setPointerCapture(e.pointerId);
}
function dragMove(e) {
  if (!DR) return;
  if (!DR.moved && Math.hypot(e.clientX - DR.x0, e.clientY - DR.y0) < 6) return;
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
    if (el.dataset.sock)
      return { k: 'eq', src: 'sock', eqk: el.dataset.sock, el, ok: slotFits('sock', el.dataset.sock, DR.it) };
    if (el.dataset.gempage || (el.dataset.grid === 'stash' && DR.it.gem)) return { k: 'gpage', el, ok: !!DR.it.gem };
    if (el.dataset.grid) {
      const g = GRIDS()[el.dataset.grid],
        r = el.getBoundingClientRect(),
        x = Math.round((e.clientX - r.left - DR.gx * C - C / 2) / C),
        y = Math.round((e.clientY - r.top - DR.gy * C - C / 2) / C),
        hits = gridHits(g, x, y, DR.w, DR.h, DR.src === el.dataset.grid ? DR.it : null),
        inside = x >= 0 && y >= 0 && x + DR.w <= g.w && y + DR.h <= g.h;
      return {
        k: 'grid',
        src: el.dataset.grid,
        g,
        x,
        y,
        el,
        /* 臨時倉庫頁只能拿出來 */
        ok: inside && hits.length <= 1 && (el.dataset.grid !== 'temp' || DR.src === 'temp'),
        swap: inside && hits.length === 1 ? hits[0] : null
      };
    }
  }
  return null;
}
function markTarget() {
  document.querySelectorAll('.hl').forEach(n => n.remove());
  document
    .querySelectorAll('.eqs.good,.eqs.bad,.sell.on,.gplist.good,.gplist.bad')
    .forEach(n => n.classList.remove('good', 'bad', 'on'));
  const t = DR.tgt;
  DR.ghost.classList.toggle('floor', !!t && t.k === 'floor');
  if (!t || t.k === 'floor') return;
  if (t.k === 'sell') t.el.classList.add('on');
  else if (t.k === 'gpage') t.el.classList.add(t.ok ? 'good' : 'bad');
  else if (t.k === 'eq') t.el.classList.add(t.ok ? 'good' : 'bad');
  else {
    const h = document.createElement('div');
    h.className = 'hl ' + (!t.ok ? 'bad' : t.swap ? 'swap' : 'good');
    h.style.cssText = `left:${clamp(t.x, 0, t.g.w - DR.w) * C}px;top:${clamp(t.y, 0, t.g.h - DR.h) * C}px;width:${DR.w * C}px;height:${DR.h * C}px`;
    t.el.appendChild(h);
  }
}
function dragEnd(e) {
  if (!DR) return;
  const d = DR,
    cancel = e.type === 'pointercancel',
    t = d.moved && !cancel && dropTarget(e);
  DR = null;
  if (d.ghost) d.ghost.remove();
  document.querySelectorAll('.hl').forEach(n => n.remove());
  if (!d.moved)
    return cancel
      ? null
      : PANEL.sellM && d.src === 'inv'
        ? sellMark(d.it)
        : TOUCH.on
          ? tapItem(d)
          : quickMove(d.src, d.it, d.eqk);
  if (t && t.k === 'floor') return dropFloor(d.src, d.it, d.eqk);
  if (t && t.k === 'eq' && !t.ok) {
    const lk = slotLack(t.src, t.eqk, d.it);
    if (lk.length) hudWarn('不符合需求：' + lackTxt(lk));
  }
  if (!t || (t.k !== 'sell' && !t.ok)) return hudPanels();
  if (t.k === 'sell') return G.scene === 'hide' ? sell(d.src, d.it, d.eqk) : hudPanels();
  takeOut(d.src, d.it, d.eqk);
  if (t.k === 'gpage') S.gems.push(d.it);
  else if (t.k === 'eq') {
    const old = slotGet(t.src, t.eqk);
    slotSet(t.src, t.eqk, d.it);
    /* 換下來的放回拿起來的地方（從另一個欄位拖來的，放得進就互換） */
    const back =
      old &&
      (isSlot(d.src) && slotFits(d.src, d.eqk, old)
        ? (slotSet(d.src, d.eqk, old), true)
        : putBack(isSlot(d.src) ? 'inv' : d.src, old, null, d.ox, d.oy));
    if (old && !back) {
      slotSet(t.src, t.eqk, old);
      putBack(d.src, d.it, d.eqk, d.ox, d.oy);
      hudWarn('放不下換下來的東西');
    }
  } else {
    const sw = t.swap;
    if (sw) takeOut(t.src, sw);
    d.it.x = t.x;
    d.it.y = t.y;
    t.g.items.push(d.it);
    if (
      sw &&
      !(isSlot(d.src) && slotFits(d.src, d.eqk, sw)
        ? (slotSet(d.src, d.eqk, sw), true)
        : putBack(isSlot(d.src) ? 'inv' : d.src, sw, null, d.ox, d.oy))
    ) {
      /* 換不了：還原 */
      t.g.items.splice(t.g.items.indexOf(d.it), 1);
      putBack(t.src, sw, null, sw.x, sw.y);
      putBack(d.src, d.it, d.eqk, d.ox, d.oy);
      hudWarn('換不了：原位放不下');
    }
  }
  sfx('equip');
  changed();
}

/* ---------- 說明框 ---------- */
/* act：說明框有動作（點出來的），名詞才能點 */
function gemTip(it) {
  const D = gemOf(it),
    sup = isSup(it),
    host = [...S.skills.map(sl => sl.a), ...S.auras].find(g => g && g.sup && g.sup.includes(it)),
    bad = host && !supOK(gemOf(host), it, host),
    tx = esc,
    chip = t => (TAGN[t] ? `<span class="gtag t-${t === 'elem' ? D.el : t}">${TAGN[t]}</span>` : '');
  let html = `<b class="rc3">${esc(D.n)}</b><small>${isAura(it) ? '光環寶石' : sup ? '輔助寶石' : '技能寶石'} · Lv ${it.lv}</small><p>${tx(D.d)}</p>`;
  if (isAura(it)) {
    const on = S.auras.includes(it),
      act = on && ST.auraOn.includes(it.gem);
    html += `<p class="base">預留精魂 ${D.sp} · 效果 ×${((1 + 0.03 * (it.lv - 1)) * (1 + (ST.auraEff + ST.buffEff) / 100) * (1 + ST.buffMag / 100)).toFixed(2)}（等級與光環效果）</p>`;
    if (on && !act) html += `<p class="c-bad">${auraWhy(it)}</p>`;
  } else if (sup)
    html += `<p class="base">${D.need.length ? '要有標籤：' + D.need.map(t => TAGN[t]).join('、') : '所有技能都能用'}</p>`;
  else {
    const c = gemCfg(it, -1),
      N = skillNums(c);
    html += `<p class="sknums">${skLine(c, N)}</p><div class="gtags">${D.tags.map(chip).join('')}</div>${wtOK(D) ? '' : `<p class="c-bad">${needTxt(D)}</p>`}`;
    html += reqHTML(
      { ...gemAttrReq(it), lv: 0 },
      gemLack(it),
      S.skills.some(x => x.a === it)
    );
  }
  /* 品質（0.2.29）：還沒有品質時顯示做滿能得到什麼 */
  const q = it.q || 0;
  html += `<p class="gq ${q ? '' : 'off'}"><b>品質 ${q}%</b>${q ? '' : '做到 20%：'}${tx(qualText(it.gem, q || GEM_Q_MAX))}</p>`;
  if (bad)
    html += `<p class="c-bad">${supDup(host, it) ? `這顆${isAura(host) ? '光環' : '技能'}已經有同分類的輔助，沒有效果` : `跟這個${isAura(host) ? '光環' : '技能'}不相容，沒有效果`}</p>`;
  if (it.sup)
    html += `<p class="base">孔 ${it.so}／${GEM_SO_MAX}${
      it.sup.some(Boolean)
        ? '：' +
          it.sup
            .filter(Boolean)
            .map(x => gemOf(x).n)
            .join('、')
        : ''
    }</p>`;
  if (it.lv < GEM_MAX)
    html += `<p class="hint">升到 Lv ${it.lv + 1} 要 ${soulCost(it.lv)} 靈魂、角色 Lv ${gemReq(it.lv + 1)}</p>`;
  return html;
}
/* 所有放得下寶石的地方（升級按鈕用編號找寶石） */
const allGems = () =>
  [
    ...S.inv.items,
    ...S.stash.items,
    ...S.temp.items,
    ...S.gems,
    ...S.skills.flatMap(k => [k.a, ...((k.a && k.a.sup) || [])]),
    ...S.auras.flatMap(g => [g, ...((g && g.sup) || [])])
  ].filter(g => g && g.gem);
/* 需求列（0.2.42）：夠的是一般字、缺的是紅字；有缺再加一行紅字「缺什麼」；req 全空就不顯示；lack 是 [[名稱, 現有, 需求]] */
function reqHTML(req, lack, worn) {
  const bad = new Set(lack.map(l => l[0])),
    part = (n, v) => (v ? `<span class="${bad.has(n) ? 'c-bad' : ''}">${n} ${v}</span>` : ''),
    ps = [part('等級', req.lv), ...ATTR.map(k => part(ATTN[k], req[k]))].filter(Boolean);
  if (!ps.length) return '';
  return `<p class="base">需求：${ps.join(' · ')}</p>${lack.length ? `<p class="c-bad">${worn ? '已失效，數值不算' : '不能裝上'}：${lackTxt(lack)}</p>` : ''}`;
}
/* 說明框裡的升級、升滿（背包、倉庫、寶石頁、技能孔裡的寶石都有；主動、輔助、光環同價） */
function gemUpRow(it) {
  const up = gemUpCheck(it),
    mx = gemMaxCheck(it),
    b = (k, lab, why) =>
      `<button class="btn mini" data-gu="${k}:${it.id}" ${why ? `disabled title="${esc(why)}"` : ''}>${lab}</button>`;
  return `<div class="tqa gu">${b('up', `升級 ${up.c} 魂`, up.why)}${b('max', mx.why ? '升滿' : `升滿 Lv ${mx.lv} · ${mx.c} 魂`, mx.why)}</div>${up.why ? `<p class="hint">升級：${esc(up.why)}</p>` : ''}`;
}
/* 最後一個說明框怎麼重畫（升級後原地更新） */
let TIPRE = null,
  TIPH = 0;
function itemTip(it, cmp) {
  if (it.gem) return gemTip(it) + gemUpRow(it);
  if (it.charm) {
    const C = CHARMS[it.charm];
    return `<b class="rc1">${esc(C.n)}</b><small>護符 · 放在腰帶的護符槽</small><p class="aff">${esc(C.d)}</p><p class="base">充能 ${Math.floor(it.ch || 0)}／${C.max} · 每次用 ${C.use} · 殺怪充能</p><p class="hint">條件達成就自動觸發，不用按鍵${G.scene === 'hide' ? ' · 賣價 3 金' : ''}</p>`;
  }
  const B = baseOf(it);
  let html = `<b class="rc${it.r}">${esc(itemName(it))}</b><small>${RARN[it.r]} ${KINDS[B.k].n} · 物品等級 ${it.L}</small>`;
  const lay = baseLayers(it);
  if (lay) html += `<p class="lay">${lay}</p>`;
  html += `<p class="base">${baseText(it).join('<br>')}</p>`;
  const wk = EQS.find(e => S.eq[e.k] === it) || EQS.find(e => eqTakes(e, B.k));
  html += reqHTML(itemReq(it), wk ? eqLack(S, it, wk.k) : [], wk && S.eq[wk.k] === it);
  if (it.a.length) html += `<p class="aff">${it.a.map(a => `${affText(a)} <i>T${a.T}</i>`).join('<br>')}</p>`;
  if (cmp) {
    /* 只看真的放得上去的欄位：弓放不進副手，比較的是武器欄 */
    const slots = EQS.filter(e => eqTakes(e, B.k) && (e.k !== 'off' || B.k !== 'weapon' || offOK(S.eq.weapon, it))),
      e = B.k === 'weapon' ? slots[0] : slots.find(e => !S.eq[e.k]) || slots[0],
      cur = S.eq[e.k],
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
    html += `<p class="cmp">${cur ? '換上去' : '這格空著'}：${rows.length ? rows.map(([n, v]) => `<span class="${v > 0 ? 'c-good' : 'c-bad'}">${n} ${v > 0 ? '▲' : '▼'}${Math.abs(Math.round(v))}</span>`).join(' ') : '沒有變化'}</p>`;
  }
  html += `<p class="hint">${G.scene === 'hide' ? '賣價 ' + sellPrice(it) + ' 金' : ''}</p>`;
  return html;
}
/* 說明框貼在 a（被點或滑過的東西的方框）旁邊：右 → 左 → 下 → 上，第一個放得下的；
   都放不下就放上下比較寬的那邊、縮短高度（裡面可以捲），永遠不蓋住 a */
function showTip(html, a, t = $('tip')) {
  const M = 8,
    G = 8;
  t.innerHTML = html;
  t.classList.toggle('gu', !!t.querySelector('[data-gu]')); /* 有按鈕的說明框滑鼠可以移進去按 */
  t.style.maxHeight = '';
  /* 先回到左上再量寬：貼著畫面右緣時會被擠窄，量到的寬度比放好後小，就會蓋住東西 */
  t.style.left = t.style.top = '0';
  t.hidden = false;
  let { width: w, height: h } = t.getBoundingClientRect();
  const W = innerWidth,
    H = innerHeight;
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
  else if (t.classList.contains('act')) (x = cx), (y = cy); /* 點出來的說明框：放不下就蓋住被點的東西（點別處關掉） */
  else {
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
    if (TALK.on) return e.repeat || (e.preventDefault(), talkKey(k));
    if (e.repeat && !'wasd'.includes(k) && !k.startsWith('arrow')) return;
    K[k] = 1;
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
    else if (k === 'escape') TREE.open ? treeClose() : anyPanel() ? closePanels() : openPanel('set');
    else if (k === 't') homeAsk();
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
    CV.style.cursor = LABELS.some(l => inL(l, e)) || (G.scene === 'hide' && propAt(e)) ? 'pointer' : 'crosshair';
  });
  CV.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return; /* 觸控在 touch.js */
    M.x = e.clientX;
    M.y = e.clientY;
    const l = e.button === 0 && LABELS.find(l => inL(l, e));
    if (l) {
      if (dist(P, l.d) < 160) pickup(l.d);
      else hudWarn('走近一點再撿（或按 F）');
      return;
    }
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
    if (a) act(a.dataset.a);
    const cd = e.target.closest('[data-card]');
    if (cd) {
      PANEL.card = +cd.dataset.card;
      hudPanels();
    }
  });
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse' || (DR && DR.moved)) return; /* 觸控：點一下才出說明框 */
    if ($('tip').classList.contains('act')) return; /* 有動作按鈕的說明框：等玩家按或點別的地方 */
    if (e.target.closest('#tip')) return clearTimeout(TIPH); /* 滑鼠移進有升級按鈕的說明框：留著 */
    const s = e.target.closest('.it[data-id],[data-tip],[data-gr]');
    clearTimeout(TIPH);
    if (!s) return $('tip').classList.contains('gu') ? (TIPH = setTimeout(hideTip, 250)) : hideTip();
    const r = s.dataset.gr ? gpAnchor(s) : s.getBoundingClientRect();
    if (s.dataset.tip) return showTip(`<p class="sktip">${esc(s.dataset.tip).replace(/\n/g, '<br>')}</p>`, r);
    const it = s.dataset.gr
      ? S.gems.find(g => g.id === +s.dataset.gr)
      : findItem(s.dataset.src, s.dataset.id, s.dataset.eqk);
    if (it && s.dataset.src === 'sock') {
      /* 技能面板的孔：動作在檢視區，這裡只給唯讀說明，貼在面板外面才不會蓋住隔壁的孔 */
      const b = $('pskill').getBoundingClientRect();
      showTip(gemTip(it), { left: b.left, right: b.right, top: r.top, bottom: r.bottom });
    } else if (it) {
      const cmp = !s.dataset.gr && !isSlot(s.dataset.src);
      showTip(itemTip(it, cmp), r);
      TIPRE = { b: () => itemTip(it, cmp), a: r };
    }
  });
}
/* 滑鼠底下的藏身處物件 */
function propAt(e) {
  const w = {
    x: (e.clientX - CV.clientWidth / 2) / ZOOM + G.cam.x,
    y: (e.clientY - CV.clientHeight / 2) / ZOOM + G.cam.y
  };
  if (G.portal && Math.hypot(w.x - G.portal.x, w.y - G.portal.y) < 50) return 'portal';
  return (G.props || []).find(p => Math.hypot(w.x - p.x, w.y + 25 - p.y) < p.r + 20);
}
const inL = (l, e) => e.clientX >= l.x && e.clientX <= l.x + l.w && e.clientY >= l.y && e.clientY <= l.y + l.h;
function pressFx(key) {
  const b = BAR.find(b => b.key.toLowerCase() === key || (key === ' ' && b.k === 'roll'));
  if (!b) return;
  const el = document.querySelector(`.sk[data-k="${b.k}"]`);
  el.classList.remove('hit');
  void el.offsetWidth;
  el.classList.add('hit');
}
function act(a) {
  if (a === 'close') closePanels();
  else if (a === 'open') wmGo();
  else if (a === 'home') {
    enterHideout();
  } else if (a.startsWith('stab:')) {
    PANEL.stab = a.slice(5);
    hudPanels();
  } else if (a === 'sellm') {
    PANEL.sellM = !PANEL.sellM;
    SELLS.clear();
    hudPanels();
  } else if (a.startsWith('selr:')) {
    for (const it of S.inv.items) if (!it.gem && it.r === +a.slice(5)) SELLS.add(it.id);
    hudPanels();
  } else if (a === 'sellgo') sellAll();
  else if (a === 'openflt') closePanels(), openPanel('flt');
  else if (a === 'pickmap') {
    $('over').hidden = true;
    openPanel('device');
  } else if (a.startsWith('gsel:')) {
    SHOPUI.sel = a.slice(5);
    sfx('click');
    hudPanels();
  } else if (a.startsWith('gam:')) {
    const r = gambleDo(a.slice(4));
    if (r.why) return hudWarn(r.why);
    SHOPUI.last = r.it;
    sfx(r.it.r === 2 ? 'lvup' : 'equip');
    changed();
  } else if (a.startsWith('asc:')) {
    /* 選昇華／換昇華：點數全部退回 */
    S.asc = a.slice(4);
    S.at = ['a_st'];
    ASCUI.n = null;
    treeChanged();
    hudPanels();
    hudWarn(`成為${ASC[S.asc].n}！直接點盤面上的點`);
    sfx('lvup');
  }
}
