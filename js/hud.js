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
  ['skill', 'gem', '技能', 'G'],
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
  <div class="tonly tmore" id="tmore" hidden><button data-tm="skill">${ICO.gem}技能</button><button data-tm="tree">${ICO.tree}天賦樹</button><button data-tm="home">${ICO.home}回藏身處</button><button data-tm="fs" id="tfs">${ICO.full}全螢幕</button><button data-tm="set">${ICO.gear}設定</button></div>
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
  }).join('');
  for (const k in HV) if (/^[tn]s\d|^cds\d|^(cd|t|n)(flask|mflask|roll)$/.test(k)) delete HV[k];
}
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
      cd = P[k] >= flaskNeed() ? 0 : 1 - P[k] / flaskNeed();
      txt = Math.floor(P[k] / flaskNeed() + 1e-9) + ''; /* 還能喝幾次（跟 drinkFlask 同一個算法） */
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
  const b = G.mobs.find(m => m.boss && !m.dummy),
    show = !!(b && b.aggro);
  if (HV.boss !== show) {
    $('bossbar').hidden = !(HV.boss = show);
    if (show) $('bossn').textContent = b.D.n;
  }
  if (show) setV($('bossbar'), 'bhp', (b.hp / b.mhp).toFixed(3));
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
  if (k === 'skill')
    skSel(
      SKUI.i === 5 || S.skills[SKUI.i].k
        ? SKUI.i
        : Math.max(
            0,
            S.skills.findIndex(x => x.k)
          )
    );
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
    PANEL.set =
    PANEL.flt =
    PANEL.sellM =
    PANEL.asc =
    PANEL.shop =
    PANEL.ident =
      false;
  clearTimeout(REV.tm);
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
  PANEL.set ||
  PANEL.flt ||
  PANEL.asc ||
  PANEL.shop ||
  PANEL.ident;
/* 設定：操作方向（手機）、快捷鍵／手勢一覽（取代原本左下角的操作說明） */
const KEYS_PC = [
  ['WASD', '移動'],
  ['滑鼠', '瞄準'],
  ['左鍵 右鍵 Q E R', '技能'],
  ['空白', '翻滾（怪物出手的瞬間翻滾＝完美閃避）'],
  ['1 ／ 2', '生命藥劑 ／ 魔力藥劑'],
  ['F', '互動、撿東西（也可以直接點地上的名字）'],
  ['I', '背包'],
  ['G', '技能'],
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
const FLT_DEF = { kind: ['weapon'], rar: [2], aff: { ks: [], n: 1 }, so: 1, q: 10, L: 10, frac: 1, mem: 1 };
const FLT_NUM = {
  so: ['插槽數', 1, 6, ''],
  q: ['品質', 0, 30, '%'],
  L: ['T（物品等級）', 1, 100, '']
};
const FNUM_STEP = { so: 1, q: 5, L: 1 };
const RARN3 = ['普通', '魔法', '稀有'];
function ruleSum(r) {
  const c = r.c,
    t = [];
  if (c.kind) t.push(c.kind.map(k => FLT_KIND.find(x => x[0] === k)[1]).join('／'));
  if (c.rar) t.push(c.rar.map(i => RARN3[i]).join('／'));
  if (c.frac) t.push('★');
  if (c.mem) t.push('追憶');
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
    ${chk('frac', '★（破裂）', '')}${chk('mem', '追憶', '')}${num('so')}${num('q')}${num('L')}
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
  <div class="frow"><button class="btn" data-fl="add" ${set.rules.length >= 20 ? 'disabled' : ''}>＋ 新增規則</button><button class="btn" data-fl="tpl">套用新手範本</button><button class="btn" data-fl="tpl2" title="只撿 ★、追憶、T 高（物品等級 10 以上）的黃裝，其他全部隱藏">套用「只撿好貨」</button></div>
  <p class="sethint">金幣與碎片一律自動吸收。「隱藏」的地上不畫、不撿。地上的裝備未鑑定，只看得到 T、孔、品質、★、追憶；詞綴條件只對鑑定後的有效（地上永遠不符合）。</p>`;
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
  } else if (k === 'tpl2') {
    if (!confirm2(b, '再按一次：這組會被取代')) return;
    F.sets[F.cur] = fltTemplate2();
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
      ['skill', '技能'],
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
  $('ptabs').hidden = !(PORT() && PANEL.inv);
  if (!$('ptabs').hidden) $('ptabs').innerHTML = portTabs();
  document.body.classList.toggle('pair', !!(PANEL.inv && (PANEL.stash || PANEL.skill || PANEL.craft)));
  document.body.classList.toggle('gxs', !!PANEL.skill);
  $('pinv').hidden = !PANEL.inv;
  $('pstash').hidden = !PANEL.stash;
  $('pdev').hidden = !PANEL.device;
  $('pasc').hidden = !PANEL.asc;
  $('pshop').hidden = !PANEL.shop;
  $('preveal').hidden = !PANEL.ident;
  $('pskill').hidden = !PANEL.skill;
  $('pcraft').hidden = !PANEL.craft;
  if (swapOn()) {
    if (TOUCH.front === 'inv') $('pstash').hidden = $('pskill').hidden = $('pcraft').hidden = true;
    else $('pinv').hidden = true;
  }
  /* 手機直立：技能面板佔滿，背包收起來 */
  if (TOUCH.on && PORT() && PANEL.skill) $('pinv').hidden = true;
  if (PANEL.skill) panelHTML($('pskill'), skillHTML(), ['.sk-body']);
  if (PANEL.craft) $('pcraft').innerHTML = forgeHTML();
  if (PANEL.inv) $('pinv').innerHTML = invHTML();
  if (PANEL.stash) {
    const st = ['temp', 'mat'].includes(PANEL.stab) ? PANEL.stab : 'stash',
      n = S.temp.items.length;
    $('pstash').innerHTML =
      `<div class="ph"><b>倉庫</b><span class="ftabs"><button class="${st === 'stash' ? 'on' : ''}" data-a="stab:stash">倉庫</button><button class="${st === 'mat' ? 'on' : ''}" data-a="stab:mat">材料</button><button class="${st === 'temp' ? 'on' : ''}" data-a="stab:temp">臨時${n ? ` <i class="c-gold">${n}</i>` : ''}</button></span>${swapB('背包')}<button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>${
        st === 'temp'
          ? `<p class="fhint">背包滿了撿到的東西放這裡，只能拿出來${TOUCH.on ? '' : '（點一下＝放進背包）'}</p>`
          : ''
      }${st === 'mat' ? matPageHTML() : gridHTML(S[st], st)}`;
  }
  if (PANEL.device) wmPanel();
  if (PANEL.asc) panelHTML($('pasc'), ascHTML(), ['', '.ax-list']);
  if (PANEL.shop) $('pshop').innerHTML = shopHTML();
  if (PANEL.ident) {
    panelHTML($('preveal'), revealHTML(), ['.rvl']);
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
const LAND = () => TOUCH.on && !PORT() && innerHeight < 480;
function invHTML() {
  /* 人形裝備欄照面板寬度放大置中（最多 1.3 倍），數值放在下面一排 */
  const s = ST,
    pp = TOUCH.on ? 20 : 28,
    z = Math.min(TOUCH.on ? 1.3 : 1.15, (($('pinv').clientWidth || 476) - pp) / 320),
    eqs =
      EQS.map(e => {
        /* 鎖欄位（0.2.74 異變者）：第三枚戒指沒點亮就不畫；腰帶、頭部被昇華鎖住畫成鎖（裝備已經脫到背包） */
        if (e.k === 'ring3' && !eqOpen(S, 'ring3')) return '';
        const [x, y, w, h] = EQPOS[e.k].map(v => Math.round(v * z)),
          it = S.eq[e.k],
          lock = !eqOpen(S, e.k);
        return `<div class="eqs ${it ? 'r' + it.r : ''} ${s.eqBad.includes(e.k) && !lock ? 'noreq' : ''} ${lock ? 'lock' : ''}" data-eq="${e.k}" ${it ? '' : `data-tip="${e.n}${lock ? '：被昇華鎖住，退點才能用' : ''}"`} style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${it ? itemHTML(it, 'eq', e.k) : lock ? `<small>${ICO.lock}</small>` : `<span class="eqg">${icHTML(slotIc(e))}</span>`}</div>`;
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
    <span>生命 <b>${s.hp}</b></span>${s.es ? `<span>能量護盾 <b>${s.es}</b></span>` : ''}<span>護甲 <b>${s.armor}</b></span>${s.ev ? `<span>閃避 <b>${s.ev}</b></span>` : ''}<span>格擋 <b>${s.block}%</b>${s.blockOver ? `（超限 +${s.blockOver}%）` : ''}</span>${s.defl ? `<span title="被擊中且沒閃避、格擋時，傷害 −40%">偏斜值 <b>${Math.round(s.defl)}</b>（${Math.round(capLuck(deflCh(15 + 6 * S.lv, s.defl), 95, s.lukDefl))}%）</span>` : ''}${s.thornAdd[1] ? `<span>荊棘 <b>${s.thornAdd[0]}–${s.thornAdd[1]}</b></span>` : ''}<span>精魂 <b>${s.spiritUsed}/${s.spirit}</b></span>
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
  /* 點說明框以外：收起說明框 */
  if (!e.target.closest('#tip,#ttip') && $('tip').classList.contains('act') && !TOUCH.on) hideTip();
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
    const why = eqUnloadWhy(S, ['a_st']);
    if (why) return hudWarn(why);
    if (!confirm2(b, '再按一次')) return;
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
/* ---------- 撿骨師的鑑定（8-3，企劃書 5.4.1）：免費、一鍵、一件一件翻開，越好的越晚翻；不做鑑定卷軸 ---------- */
const REV = { list: [], i: 0, tm: 0, done: false };
function revealOpen() {
  const L = identifyAll(S);
  if (!L.length) return hudWarn('沒有需要鑑定的東西');
  /* 資料一次鑑定完（關掉視窗也不會丟），翻牌只是演出 */
  Object.assign(REV, { list: L, i: 0, done: false });
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
  sfx(it.frac ? 'star' : it.mem ? 'mem' : it.r === 2 ? 'flipRare' : 'flip');
  hudPanels();
  REV.tm = setTimeout(revealStep, it.frac || it.mem ? 750 : it.r === 2 ? 450 : 260);
}
function revealHTML() {
  const n = REV.list.length;
  return `<div class="ph"><b>撿骨師的鑑定</b><span>${Math.min(REV.i, n)}／${n} 件</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <div class="rvl">${REV.list
    .map((it, k) =>
      k < REV.i
        ? `<div class="rvr r${it.r} ${k === REV.i - 1 && !REV.done ? 'new' : ''} ${it.frac ? 'frac' : it.mem ? 'mem' : ''}">${icHTML(itemIc(it))}<div><b class="rc${it.r}">${esc(itemName(it))}</b><small>T${itemT(it)} · 品質 ${Math.round((it.q || 0) * 100)}%${it.so ? ' · 孔 ' + '○'.repeat(it.so) : ''}${it.frac ? ' · <span class="frac">★ 破裂</span>' : ''}</small>${it.mem ? `<small class="mem">◈ ${esc(memText(it.mem))}</small>` : ''}<span class="rva">${it.a.map(a => `${esc(affText(a))} <i>T${a.T}${isFrac(it, a) ? ' ★' : ''}</i>`).join('　') || '（沒有詞綴）'}</span></div></div>`
        : `<div class="rvr un r${it.r} ${it.frac ? 'frac' : it.mem ? 'mem' : ''}">${icHTML(itemIc(it))}<div><b class="rc${it.r}">？？？</b><small>${esc(baseOf(it).n)} · T${itemT(it)}${it.frac ? ' · ★' : ''}${it.mem ? ' · ◈' : ''}</small></div></div>`
    )
    .join('')}</div>
  <div class="rvf">${REV.done ? '<button class="btn pri" data-a="close">收下</button>' : '<button class="btn" data-a="rvskip">全部翻開</button>'}</div>`;
}
function shopHTML() {
  const L = SHOPUI.last,
    left = gamLeft(S);
  return `<div class="ph"><b>天星商會</b><span>金幣 <b class="c-gold">${S.gold}</b> · 每件 <b class="c-gold">${gamPrice(S)}</b> 金 · 物品等級 ${gamIlvl(S)}</span><button class="x" aria-label="關閉" data-a="close">${ICO.x}</button></div>
  <p class="tsay">「${TRADER_SAY[(S.story.shopN || 0) % TRADER_SAY.length]}」</p>
  <p class="sethint">選一種，買一件隨機的裝備：已鑑定、品質 0%、沒有孔、沒有 ★ 與追憶，詞綴最高 T2。${left > 0 ? `再 ${left} 件沒出稀有，下一件必出` : '<span class="c-gold">這一件必出稀有</span>'}</p>
  ${L ? `<div class="shopres">${icHTML(itemIc(L))}<span><b class="rc${L.r}">${esc(itemName(L))}</b><small>放進背包了</small></span></div>` : ''}
  ${shopSel()}
  ${GAMBLE.map(([n, xs]) => `<div class="ph2">${n}</div><div class="shopg">${xs.map(x => `<button class="shopb ${SHOPUI.sel === x.id ? 'on' : ''}" data-a="gsel:${x.id}">${icHTML(gamBases(x)[0].ic)}<span>${x.n}</span></button>`).join('')}</div>`).join('')}`;
}
/* ---------- 找道具、移動道具 ---------- */
const GRIDS = () => ({ inv: S.inv, stash: S.stash, temp: S.temp });
/* 欄位：裝備欄 eq（key＝欄位名；護符欄是 ch0～） */
const isSlot = src => src === 'eq';
function slotGet(src, key) {
  /* 護符欄是 ch0～（胸甲 chest 也是 ch 開頭，不能只看前兩個字） */
  return /^ch\d$/.test(key) ? S.charms[+key[2]] : S.eq[key];
}
function slotSet(src, key, it) {
  return /^ch\d$/.test(key) ? (S.charms[+key[2]] = it) : (S.eq[key] = it);
}
/* 放進這個欄位缺什麼能力值（0.2.42）：裝備看等級與能力值（eqLack） */
function slotLack(src, key, it) {
  return /^ch\d$/.test(key) ? [] : eqLack(S, it, key);
}
const slotFits = (src, key, it) =>
  it.uid
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
  /* 光環欄沒有格數：拿掉的空格收起來，尾巴永遠留一個空格給下一顆；技能面板選的光環跟著走（編號會變） */
  const selA = S.auras[SKUI.ai];
  S.auras.splice(0, S.auras.length, ...S.auras.filter(Boolean), null);
  SKUI.ai = selA ? S.auras.indexOf(selA) : Math.min(SKUI.ai, S.auras.length - 1);
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
  if (PANEL.craft) return craftPick(src, it, eqk);
  if (isSlot(src)) {
    if (!gridAuto(S.inv, it)) return hudWarn('背包滿了');
    slotSet(src, eqk, null);
  } else if (src === 'stash' || src === 'temp') {
    takeOut(src, it);
    if (!gridAuto(S.inv, it)) return gridAuto(S[src], it), hudWarn('背包滿了');
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
    if (it.uid) return hudWarn('找撿骨師鑑定：未鑑定的不能裝備');
    const k = kindOf(it),
      slots = EQS.filter(e => eqTakes(e, k) && eqOpen(S, e.k)),
      /* 武器：主手空著放主手；主手有武器、而且副手能拿這把（權杖、雙持）才放副手，不然換掉主手 */
      e =
        k === 'weapon'
          ? EQS.find(q => q.k === (S.eq.weapon && !S.eq.off && offOK(S.eq.weapon, it) ? 'off' : 'weapon'))
          : slots.find(e => !S.eq[e.k]) || slots[0];
    if (!e) return EQS.some(q => eqTakes(q, k)) && hudWarn('這個部位的欄位被昇華鎖住：退點才能用');
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
function sell(src, it, eqk) {
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
  document.querySelectorAll('.eqs.good,.eqs.bad,.sell.on').forEach(n => n.classList.remove('good', 'bad', 'on'));
  const t = DR.tgt;
  DR.ghost.classList.toggle('floor', !!t && t.k === 'floor');
  if (!t || t.k === 'floor') return;
  if (t.k === 'sell') t.el.classList.add('on');
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
    const lk = d.it.uid ? [] : slotLack(t.src, t.eqk, d.it);
    if (d.it.uid) hudWarn('找撿骨師鑑定：未鑑定的不能裝備');
    else if (lk.length) hudWarn('不符合需求：' + lackTxt(lk));
  }
  if (!t || (t.k !== 'sell' && !t.ok)) return hudPanels();
  if (t.k === 'sell') return G.scene === 'hide' ? sell(d.src, d.it, d.eqk) : hudPanels();
  takeOut(d.src, d.it, d.eqk);
  if (t.k === 'eq') {
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
/* 需求列（0.2.42）：夠的是一般字、缺的是紅字；有缺再加一行紅字「缺什麼」；req 全空就不顯示；lack 是 [[名稱, 現有, 需求]] */
function reqHTML(req, lack, worn) {
  const bad = new Set(lack.map(l => l[0])),
    part = (n, v) => (v ? `<span class="${bad.has(n) ? 'c-bad' : ''}">${n} ${v}</span>` : ''),
    ps = [part('等級', req.lv), ...ATTR.map(k => part(ATTN[k], req[k]))].filter(Boolean);
  if (!ps.length) return '';
  return `<p class="base">需求：${ps.join(' · ')}</p>${lack.length ? `<p class="c-bad">${worn ? '已失效，數值不算' : '不能裝上'}：${lackTxt(lack)}</p>` : ''}`;
}
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
    return `<b class="rc1">${esc(C.n)}</b><small>護符 · 放在腰帶的護符槽</small><p class="aff">${esc(C.d)}</p><p class="base">充能 ${Math.floor(it.ch || 0)}／${C.max} · 每次用 ${C.use} · 殺怪充能</p><p class="hint">條件達成就自動觸發，不用按鍵${G.scene === 'hide' ? ' · 賣價 3 金' : ''}</p>`;
  }
  const B = baseOf(it),
    un = !!it.uid;
  /* 企劃書 5.9：基底層一行（T、品質、孔）、固定詞、追憶、前綴 3 格、後綴 3 格（空格畫出來）、腐化詞、符文；
     未鑑定只看得到基底層、固定詞、追憶（前後綴要找撿骨師） */
  let html = `<b class="rc${it.r}">${esc(itemName(it))}</b><small>${RARN[it.r]} ${KINDS[B.k].n} · 物品等級 ${it.L}${un ? ' · <span class="c-warn">未鑑定</span>' : ''}</small>`;
  html += `<p class="lay"><span class="tt">T${itemT(it)}</span> · ${baseLayers(it)}${it.frac ? ' · <span class="frac">★ 破裂</span>' : ''}</p>`;
  html += `<p class="base">${baseText(it).join('<br>')}</p>`;
  if (it.mem) html += `<p class="mem">◈ 追憶：${esc(memText(it.mem))}</p>`;
  const wk = EQS.find(e => S.eq[e.k] === it) || EQS.find(e => eqTakes(e, B.k));
  html += reqHTML(itemReq(it), wk ? eqLack(S, it, wk.k) : [], wk && S.eq[wk.k] === it);
  html += un
    ? `<p class="hint c-warn">前後綴看不到：回藏身處找撿骨師鑑定（免費、一次全部）。未鑑定的不能裝備、不能做裝</p>`
    : tipSlots(it);
  if (!un && it.cw && it.cw.length) html += `<p class="aff cor">${it.cw.map(c => esc(cwText(c))).join('<br>')}</p>`;
  if (it.so) html += `<p class="rune">符文 ${'○'.repeat(it.so)}<small>（還沒有符文）</small></p>`;
  if (cmp && !un) {
    /* 只看真的放得上去的欄位：弓放不進副手，比較的是武器欄 */
    const slots = EQS.filter(
        e => eqTakes(e, B.k) && eqOpen(S, e.k) && (e.k !== 'off' || B.k !== 'weapon' || offOK(S.eq.weapon, it))
      ),
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
  html += `<p class="hint">${G.scene === 'hide' && !un ? '賣價 ' + sellPrice(it) + ' 金' : ''}</p>`;
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
  } else if (a === 'rvskip') {
    REV.i = REV.list.length;
    revealStep();
  } else if (a === 'sellm') {
    PANEL.sellM = !PANEL.sellM;
    SELLS.clear();
    hudPanels();
  } else if (a.startsWith('selr:')) {
    for (const it of S.inv.items) if (it.r === +a.slice(5)) SELLS.add(it.id);
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
    /* 選昇華／換昇華：點數全部退回（被關掉的欄位裡的裝備脫到背包，放不下就擋下來） */
    const why = eqUnloadWhy(S, ['a_st'], a.slice(4));
    if (why) return hudWarn(why);
    S.asc = a.slice(4);
    S.at = ['a_st'];
    ASCUI.n = null;
    treeChanged();
    hudPanels();
    hudWarn(`成為${ASC[S.asc].n}！直接點盤面上的點`);
    sfx('lvup');
  }
}
