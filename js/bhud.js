/* dungeonPOE · 戰鬥 HUD（battle-hud v1.3.3：docs/production/specs/battle-hud/battle-hud.md、-2／-3／-4、terms-aura.md）
   兩種版面：直立 390×844（P／T 表，照安全區動態排）、桌機 1280×720（D／C 表，下排貼畫面底、分頁貼右）。
   每個元件的框（x、y、w、h）都由 bhRects() 照表算，CSS 只管長相；熱區比外觀大的元件，按鈕本身＝熱區、外觀是裡面的 <i class="v">。
   手機橫向（規格沒有）沿用舊的觸控鍵（#bar），這裡只排生命／魔力條。 */
'use strict';
/* 正式素材（docs/production/art-picks/battle-hud-v1.3 挑定，mumi 17:18）：光環第一批 6 個（10／12）、分頁圖示（16）、藥劑球（12／14），各附 @2x。
   小圖直接用檔、不進圖集（js/art.js 是 tools/art.py 產生的，不手改）。光環第二批 12 個還沒進 art/（之後補），先用技能圖縮小 */
const HUD_ART = {
  aura: k => `art/icons/aura/sk_${k}`,
  tab: k => `art/icons/tab/tab_${k}`,
  flask: k => `art/flasks/${k}/${k}`
};
const hudArtURL = (kind, k, px) => new URL(`${HUD_ART[kind](k)}_${px}${DPR > 1 ? '@2x' : ''}.png`, location.href).href;
const BH = { mode: '', key: '', R: {}, fake: {}, tipK: null, lp: 0, last: '' };
/* 收起狀態（S.hmin，1＝收到最小）；新存檔沒有就是一般 */
const bhMin = () => !!(S && S.hmin);
/* 版面：p 直立、d 桌機、l 手機橫向、''＝不在刷圖（營地、天賦樹蓋滿） */
const bhMode = () => (!S || G.scene !== 'map' || TREE.open ? '' : PORT() ? 'p' : TOUCH.on ? 'l' : 'd');
const R4 = (x, y, w, h) => [Math.round(x), Math.round(y), Math.round(w), Math.round(h)];
/* 照表算每個元件的框（整頁座標）。直立：A＝HUD 基準（一般＝面板上緣 552；收起＝收起列上緣 −20，整組下移 140） */
function bhRects() {
  const m = bhMode(),
    W = IW,
    H = IH,
    o = { m };
  if (m === 'p') {
    const t = SAFE.t,
      tabs = H - SAFE.b - 54,
      pan = tabs - 204,
      col = tabs - 44,
      min = bhMin(),
      A = min ? col - 20 : pan,
      bf0 = t + 44,
      bf1 = min ? col : pan;
    Object.assign(o, {
      top: R4(0, t, W, 44),
      c0: R4(4, t, 76, 44),
      c1: R4(84, t, 64, 44),
      c2: R4(152, t, 52, 44),
      c3: R4(208, t, 48, 44),
      loc: R4(W - 128, t, 120, 44),
      locV: R4(W - 128, t + 11, 120, 22),
      bf: R4(0, bf0, W, bf1 - bf0),
      bossP: R4(4, bf0 + 4, W - 8, 32),
      boss: R4(8, bf0 + 8, W - 16, 24),
      big: R4(8, bf0 + 38, 190, 28),
      vig: [
        R4(0, bf0, W, 24),
        R4(0, bf1 - 24, W, 24),
        R4(0, bf0 + 24, 24, bf1 - bf0 - 48),
        R4(W - 24, bf0 + 24, 24, bf1 - bf0 - 48)
      ],
      tip: R4(10, A - 160, W - 20, 34),
      sk: [0, 1, 2, 3, 4].map(i => R4(10 + 50 * i, A - 92, 44, 44)),
      aura: R4(4, A - 138, 108, 44),
      auraV: R4(10, A - 114, 96, 12),
      cell: 12,
      sts: R4(114, A - 138, 226, 44),
      stsV: R4(116, A - 120, 220, 24),
      stc: 24,
      hp: R4(10, A - 44, W - 46, 18),
      mp: R4(10, A - 22, W - 46, 18),
      low: R4(8, A - 46, W - 42, 22),
      f0: R4(W - 44, A - 69, 44, 44),
      f0V: R4(W - 30, A - 45, 20, 20),
      f1: R4(W - 44, A - 24, 44, 44),
      f1V: R4(W - 30, A - 23, 20, 20),
      floor: A - 124,
      pan: min ? R4(0, col, W, 44) : R4(0, pan, W, 204)
    });
  } else if (m === 'd') {
    const y = H - 720,
      min = bhMin();
    Object.assign(o, {
      top: R4(0, 0, W, 40),
      c0: R4(8, 2, 80, 36),
      c1: R4(96, 2, 74, 36),
      c2: R4(178, 2, 46, 36),
      c3: R4(232, 2, 40, 36),
      loc: R4(400, 2, 334, 36),
      locV: R4(400, 8, 334, 24),
      bf: R4(0, 40, W, H - 40),
      bossP: R4(W / 2 - 244, 44, 488, 30),
      boss: R4(W / 2 - 240, 48, 480, 22),
      big: R4(W / 2 - 120, 76, 240, 32),
      vig: [R4(0, 40, W, 24), R4(0, H - 24, W, 24), R4(0, 64, 24, H - 88), R4(W - 24, 64, 24, H - 88)],
      tip: R4(340, y + 524, 328, 34),
      sk: [0, 1, 2, 3, 4].map(i => R4(340 + 56 * i, y + 596, 48, 48)),
      aura: R4(334, y + 560, 124, 36),
      auraV: R4(340, y + 571, 110, 14),
      cell: 14,
      sts: R4(460, y + 560, 258, 36),
      stsV: R4(462, y + 564, 252, 28),
      stc: 28,
      hp: R4(340, y + 652, 450, 20),
      mp: R4(340, y + 676, 450, 20),
      low: R4(338, y + 650, 454, 24),
      f0: R4(789, y + 640, 36, 36),
      f0V: R4(796, y + 651, 22, 22),
      f1: R4(789, y + 677, 36, 36),
      f1V: R4(796, y + 677, 22, 22),
      mini: R4(W - 182, y + 598, 170, 110),
      floor: y + 560,
      pan: min ? R4(16, y + 640, 320, 64) : R4(12, y + 452, 310, 256)
    });
  } else if (m === 'l') {
    /* 手機橫向：規格沒有；條排在左下搖桿右邊、技能鍵左邊（跟舊的一樣） */
    const l = 186,
      w = Math.max(120, W - l - 322);
    Object.assign(o, {
      hp: R4(l, H - SAFE.b - 52, w, 18),
      mp: R4(l, H - SAFE.b - 30, w, 18),
      low: R4(l - 2, H - SAFE.b - 54, w + 4, 22),
      sts: R4(l, H - SAFE.b - 98, w, 44),
      stsV: R4(l, H - SAFE.b - 90, w, 28),
      stc: 28,
      floor: H - SAFE.b - 94
    });
  }
  return o;
}
const bhPos = (el, r) => {
  if (!el) return;
  if (!r) return void (el.hidden = true);
  el.hidden = false;
  el.style.cssText = `left:${r[0]}px;top:${r[1]}px;width:${r[2]}px;height:${r[3]}px`;
};
/* 熱區按鈕裡的外觀（相對於按鈕） */
const bhIn = (el, r, v) => {
  if (!el || !r || !v) return;
  el.style.cssText = `left:${v[0] - r[0]}px;top:${v[1] - r[1]}px;width:${v[2]}px;height:${v[3]}px`;
};
/* ---------- 建 DOM（hudInit 呼叫） ---------- */
const BH_CUR = [
  ['gold', 'mat_gold', '金'],
  ['soul', 'cur_soul', '靈魂'],
  ['conv', 'cur_chaos', CUR.conv.n],
  ['exalt', 'cur_exalt', CUR.exalt.n]
];
const BH_KEY = ['左', '右', 'Q', 'E', 'R'];
function bhInit() {
  const d = document.createElement('div');
  d.id = 'bh';
  d.innerHTML = `<div class="bh-top" id="bhTop"></div>
  ${BH_CUR.map((c, i) => `<button class="bh-cur" id="bhC${i}" data-a="bhcur"><img alt=""><b></b></button>`).join('')}
  <button class="bh-loc" id="bhLoc" data-a="bhloc"><span class="v"></span></button>
  <div class="bh-vig" id="bhVig" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <div class="bh-bossp" id="bhBossP" hidden></div>
  <div class="bh-boss" id="bhBoss" role="status" hidden><b></b><i class="bb"><i></i></i></div>
  <div class="bh-big" id="bhBig" role="alert" hidden><b>大招</b><i class="cd"><i></i></i></div>
  <button class="bh-aura" id="bhAura" data-a="bhaura" aria-label="光環" hidden><span class="v"></span></button>
  <div class="bh-aul" id="bhAuL" role="tooltip" hidden></div>
  <button class="bh-sts" id="bhSts" data-a="bhsts" aria-label="狀態" hidden><span class="v"></span></button>
  ${BH_KEY.map((k, i) => `<button class="bsk" id="bhS${i}" data-bs="${i}"><span class="ic0"></span><s class="cdv"></s><b class="nb"></b><i class="am"></i><i class="gd"></i><i class="gp"><i></i></i><em class="rl"></em><svg class="arc" aria-hidden="true"></svg><kbd>${k}</kbd></button>`).join('')}
  <div class="bh-tip" id="bhTip" role="tooltip" hidden></div>
  <div class="bh-low" id="bhLow" hidden></div>
  <div class="hb hp" id="bhp"><i></i><b class="ward"></b><span></span></div>
  <div class="hb mp" id="bmp"><i></i><span></span></div>
  <button class="bh-fl hp" id="bhF0" data-bf="0" aria-label="生命藥劑"><i class="v"><img alt=""></i><kbd>1</kbd></button>
  <button class="bh-fl mp" id="bhF1" data-bf="1" aria-label="魔力藥劑"><i class="v"><img alt=""></i><kbd>2</kbd></button>`;
  $('hud').prepend(d);
  for (const [i, k] of ['flask_hp', 'flask_mp'].entries()) {
    const im = $('bhF' + i).querySelector('img');
    im.src = hudArtURL('flask', k, 12);
  }
  /* 技能格：390 長按 400 ms＝工具提示（放開收）、點＝開技能分頁；桌機 hover＝工具提示、點＝開技能分頁 */
  for (let i = 0; i < 5; i++) {
    const b = $('bhS' + i);
    b.addEventListener('pointerenter', e => e.pointerType === 'mouse' && bhTip(i));
    b.addEventListener('pointerleave', e => e.pointerType === 'mouse' && bhTip(null));
    b.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;
      clearTimeout(BH.lp);
      BH.lpOn = 0;
      BH.lp = setTimeout(() => ((BH.lpOn = 1), bhTip(i)), 400);
    });
    const up = () => (clearTimeout(BH.lp), BH.lpOn && setTimeout(() => bhTip(null), 0));
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('click', e => {
      if (BH.lpOn) return void (BH.lpOn = 0);
      e.stopPropagation();
      bhSkillGo(i);
    });
  }
  for (const i of [0, 1]) $('bhF' + i).addEventListener('click', () => drinkFlask(i === 1));
  /* 光環：桌機 hover、手機點 */
  const au = $('bhAura');
  au.addEventListener('pointerenter', e => e.pointerType === 'mouse' && bhAuraList(1));
  au.addEventListener('pointerleave', e => e.pointerType === 'mouse' && bhAuraList(0));
}
/* 點技能格：開技能分頁（並選那一招） */
function bhSkillGo(i) {
  if (navOn() !== 'skill') navGo('skill');
  if (typeof SKUI !== 'undefined' && S.skills[i] && S.skills[i].k) (SKUI.i = i), hudPanels();
}
/* ---------- 版面（尺寸、方向、收起變了才重排） ---------- */
function bhLayout(force) {
  const m = bhMode(),
    key = [m, IW, IH, SAFE.t, SAFE.b, bhMin(), anyPanel() && PORT() ? 1 : 0].join();
  document.body.classList.toggle('bhp', m === 'p');
  document.body.classList.toggle('bhd', m === 'd');
  document.body.classList.toggle('bhl', m === 'l');
  document.body.classList.toggle('bhmin', bhMin());
  if (!force && BH.key === key) return;
  BH.key = key;
  const R = (BH.R = bhRects()),
    bh = $('bh');
  bh.hidden = !m;
  if (!m) return;
  bhPos($('bhTop'), R.top);
  for (let i = 0; i < 4; i++) bhPos($('bhC' + i), R['c' + i]);
  bhPos($('bhLoc'), R.loc);
  bhIn($('bhLoc').firstChild, R.loc, R.locV);
  bhPos($('bhBossP'), R.bossP);
  bhPos($('bhBoss'), R.boss);
  bhPos($('bhBig'), R.big);
  for (const el of [$('bhBossP'), $('bhBoss'), $('bhBig')]) el.hidden = true;
  const vg = $('bhVig').children;
  for (let i = 0; i < 4; i++) bhPos(vg[i], R.vig && R.vig[i]);
  for (let i = 0; i < 5; i++) bhPos($('bhS' + i), R.sk && R.sk[i]);
  bhPos($('bhAura'), R.aura);
  bhIn($('bhAura').firstElementChild, R.aura, R.auraV);
  bhPos($('bhSts'), R.sts);
  bhIn($('bhSts').firstElementChild, R.sts, R.stsV);
  bhPos($('bhp'), R.hp);
  bhPos($('bmp'), R.mp);
  bhPos($('bhLow'), R.low);
  for (const i of [0, 1]) {
    bhPos($('bhF' + i), R['f' + i]);
    bhIn($('bhF' + i).firstElementChild, R['f' + i], R['f' + i + 'V']);
    const im = $('bhF' + i).querySelector('img'),
      px = m === 'd' ? 14 : 12,
      k = i ? 'flask_mp' : 'flask_hp';
    im.src = hudArtURL('flask', k, px);
  }
  /* 狀態、光環的格子大小 */
  bh.style.setProperty('--stc', (R.stc || 24) + 'px');
  bh.style.setProperty('--auc', (R.cell || 12) + 'px');
  $('bhLow').hidden = true;
  $('bhTip').hidden = true;
  HV.bhsts = HV.bhau = HV.bhcur = HV.bhlow = HV.bhboss = null;
  idleBar(1);
}
/* ---------- 每格更新 ---------- */
const bhNum = n => (n >= 1e5 ? abbr(n, 'own') : fullN(n, 'own'));
function bhTick() {
  bhLayout();
  const m = BH.R.m;
  if (!m) return;
  if (m !== 'l') {
    bhCur();
    bhSkills();
    bhAura();
    bhBoss();
  }
  bhStates();
  bhFlasks();
  bhLowHp();
}
function bhCur() {
  const M = MAT(),
    v = [S.gold, M.soul || 0, M.conv || 0, M.exalt || 0],
    k = v.join();
  if (HV.bhcur === k) return;
  HV.bhcur = k;
  BH_CUR.forEach((c, i) => {
    const b = $('bhC' + i),
      im = b.firstChild;
    const u = ICONS[c[1]] ? iconURL(c[1]) : artIconURL(c[1], 16);
    if (u && im.getAttribute('src') !== u) im.src = u;
    b.lastChild.textContent = bhNum(v[i]);
    b.setAttribute('aria-label', `${c[2]} ${fullN(v[i], 'own')}`);
  });
  /* 地點＋★：390「酆都 14 層 ★3」；桌機「酆都・陰兵借道 ★3 怪物 Lv 52」 */
  const st = G.star || 1,
    n = G.nodeN || '地圖',
    h = BH.R.m === 'd' ? `${esc(n)} <b>★${st}</b> 怪物 Lv ${mobLv(G.mapT)}` : `${esc(n)} <b>★${st}</b>`;
  const lv = $('bhLoc').firstChild;
  if (lv.innerHTML !== h) lv.innerHTML = h;
  $('bhLoc').setAttribute('aria-label', `${n} ★${st}・怪物 Lv ${mobLv(G.mapT)}`);
}
/* ---------- 技能格（§11） ---------- */
/* 工具提示 {c}：無條件進位到小數 1 位，去掉尾巴 .0 */
const bhC1 = v => String(Math.ceil(v * 10 - 1e-9) / 10);
function bhSkState(i) {
  const c = slotCfg(i);
  if (!c) return { i, emp: 1 };
  const D = c.D,
    k = 's' + i,
    o = { i, c, D, ic: D.ic, n: '', kind: 'cd' },
    f = BH.fake[i] || {};
  if (D.ammo) {
    const A = P.ammo && P.ammo[c.k],
      clip = clipOf(D),
      rl = f.rl != null ? f.rl : A && A.until > G.t ? A.until - G.t : 0;
    o.max = Math.max(A ? A.n : clip, clip);
    /* 裝填時間到了但還沒再射（mech.js 的 ammoSettle 要下一發才結算）：照補滿的發數畫（彈匣＋裝填中拿到的補給，最多 2 倍） */
    const done = A && A.until && A.until <= G.t ? Math.min(clip * 2, clip + (A.extra || 0)) : null;
    o.left = f.n != null ? f.n : rl ? 0 : done != null ? done : A ? A.n : clip;
    o.rl = rl;
    o.rlT = D.ammo[1] / (1 + ST.reloadP / 100);
    o.kind = rl ? 'rl' : 'ammo';
    o.n = rl ? '' : String(o.left);
  } else if (D.gren) {
    const max = D.gren[0] + ST.grenUse,
      q = (P.gren && P.gren[c.k]) || [],
      used = f.used != null ? f.used : q.filter(t => t > G.t).length,
      cdT = D.gren[1] / (1 + ST.grenCd / 100),
      nx = q.filter(t => t > G.t).sort((a, b) => a - b)[0];
    Object.assign(o, { kind: 'gren', max, have: max - used, next: nx ? nx - G.t : 0, cdT });
    o.n = String(o.have);
  } else if (D.charge) {
    const a = P.act,
      on = a && a.charge && a.slot === i,
      s = f.s != null ? f.s : on ? Math.min(D.charge.max, Math.floor(a.ch / D.charge.step + 1e-6)) : -1;
    Object.assign(o, { kind: 'chg', max: D.charge.max, s });
    o.n = s >= 0 ? `${s}/${D.charge.max}` : '';
  } else if (isFlaskSk(D)) {
    const n = Math.floor(P.flask / flaskCost() + 1e-9);
    Object.assign(o, { kind: 'flask', n: String(n), cost: flaskCost() * FLASK.chg });
  }
  const cd = c.cd ? (P.cds[k] || 0) / c.cd : 0;
  o.cd = cd > 0 ? cd : 0;
  o.cdS = P.cds[k] > 0 ? P.cds[k] : 0;
  return o;
}
function bhTipText(o) {
  if (o.emp) return `${BH_KEY[o.i]}：空的`;
  const D = o.D;
  if (o.kind === 'ammo') return `彈匣 ${o.left}／${o.max} 發・打完裝填 ${o.rlT.toFixed(1)} 秒`;
  if (o.kind === 'rl') return `裝填中・${o.rl.toFixed(1)} 秒`;
  if (o.kind === 'gren')
    return o.have >= o.max
      ? `儲存 ${o.max}／${o.max} 顆`
      : `儲存 ${o.have}／${o.max} 顆・下一顆 ${o.next.toFixed(1)} 秒`;
  if (o.kind === 'chg') return `按住蓄力，最多 ${o.max} 段；自動模式蓄滿才出手`;
  if (o.kind === 'flask') return `藥劑技能充能 ${o.n} 次・每次 ${bhC1(o.cost)} 點`;
  return `${D.n} Lv ${o.c.lv}${o.c.cd ? `・冷卻 ${o.c.cd.toFixed(1)} 秒` : ''}`;
}
/* 工具提示：直立 P14（10–380 × 392–426）；桌機 D19（x 從該格起、寬 328，超出 1272 往左推；y 524–558） */
function bhTip(i) {
  const t = $('bhTip');
  BH.tipK = i;
  if (i == null) return void (t.hidden = true);
  const R = BH.R,
    o = bhSkState(i);
  t.textContent = bhTipText(o);
  let r = R.tip;
  if (R.m === 'd') r = R4(Math.min(R.sk[i][0], IW - 8 - 328), R.tip[1], 328, 34);
  bhPos(t, r);
}
function bhSkills() {
  for (let i = 0; i < 5; i++) {
    const b = $('bhS' + i),
      o = bhSkState(i),
      ic = o.emp ? '' : o.ic;
    if (b.dataset.ic !== ic) {
      b.dataset.ic = ic;
      b.firstChild.innerHTML = ic ? icHTML(ic) : '';
      b.classList.toggle('emp', !!o.emp);
      b.setAttribute('aria-label', `${BH_KEY[i]}：${o.emp ? '空的' : o.D.n}`);
      b.querySelector('.arc').innerHTML = '';
      /* 換了技能：彈匣格、儲存點、蓄力弧都要照新的重畫 */
      b.dataset.kd = '';
    }
    if (o.emp) continue;
    const kind = (o.kind === 'rl' ? 'ammo' : o.kind) + ':' + (o.max || 0);
    if (b.dataset.k !== o.kind) b.dataset.k = o.kind;
    if (b.dataset.kd !== kind) {
      b.dataset.kd = kind;
      const am = b.querySelector('.am');
      am.innerHTML =
        o.kind === 'ammo' || o.kind === 'rl'
          ? Array.from({ length: Math.min(12, o.max) }, (_, j) => `<i style="--i:${j}"></i>`).join('')
          : '';
      b.querySelector('.gd').innerHTML = o.kind === 'gren' ? '<i></i>'.repeat(o.max) : '';
      bhArc(b, o);
      HV['bsa' + i] = HV['bsg' + i] = HV['bsc' + i] = null;
    }
    setT(b.querySelector('.nb'), 'bsn' + i, o.n);
    if (o.kind === 'ammo' || o.kind === 'rl') {
      const pips = b.querySelector('.am').children,
        v = o.kind === 'rl' ? 0 : o.left;
      if (HV['bsa' + i] !== v) {
        HV['bsa' + i] = v;
        for (let j = 0; j < pips.length; j++) pips[j].classList.toggle('on', j < v);
      }
      setT(b.querySelector('.rl'), 'bsr' + i, o.kind === 'rl' ? '裝填' : '');
      const rv = o.kind === 'rl' ? (1 - o.rl / o.rlT).toFixed(2) : '0';
      if (HV['bsrv' + i] !== rv) b.style.setProperty('--r', (HV['bsrv' + i] = rv));
    }
    if (o.kind === 'gren') {
      const ds = b.querySelector('.gd').children;
      if (HV['bsg' + i] !== o.have) {
        HV['bsg' + i] = o.have;
        for (let j = 0; j < ds.length; j++) ds[j].classList.toggle('on', j < o.have);
      }
      b.querySelector('.gp').style.setProperty('--g', o.have >= o.max ? 0 : (1 - o.next / o.cdT).toFixed(2));
    }
    if (o.kind === 'chg') {
      const seg = b.querySelectorAll('.arc path');
      if (HV['bsc' + i] !== o.s) {
        const was = HV['bsc' + i];
        HV['bsc' + i] = o.s;
        seg.forEach((p, j) => p.classList.toggle('on', j < o.s));
        /* 蓄滿外框 120 ms */
        if (o.s >= o.max && was !== o.s) b.classList.remove('full'), void b.offsetWidth, b.classList.add('full');
      }
    }
    /* 冷卻：灰幕由上往下收；中間秒數 1 位小數 */
    setV(b, 'bscd' + i, o.cd.toFixed(3));
    const cdt = o.cdS > 0 && o.kind !== 'rl' ? o.cdS.toFixed(1) : '';
    setT(b.querySelector('.cdv'), 'bsct' + i, cdt);
    const no = !fightOn() || (!ST.hellfire && !pracFree() && mpAvail() < o.c.mp) || !wtOK(o.D);
    if (HV['bsno' + i] !== no) b.classList.toggle('no', (HV['bsno' + i] = no));
  }
  if (BH.tipK != null && !$('bhTip').hidden) $('bhTip').textContent = bhTipText(bhSkState(BH.tipK));
}
/* 蓄力弧：格外 2 px 一圈 2 px 線，平均 3 段、段間 4 px，從正上方順時針 */
function bhArc(b, o) {
  const svg = b.querySelector('.arc');
  if (o.kind !== 'chg') return void (svg.innerHTML = '');
  const s = parseInt(b.style.width) || 44,
    w = s + 6,
    L = 4 * w,
    n = o.max,
    seg = L / n;
  svg.setAttribute('viewBox', `0 0 ${w + 2} ${w + 2}`);
  /* 從正上方中點出發的矩形周長路徑，切 n 段 */
  const pt = d => {
    d = ((d % L) + L) % L;
    const h = w / 2;
    if (d < h) return [1 + h + d, 1];
    d -= h;
    if (d < w) return [1 + w, 1 + d];
    d -= w;
    if (d < w) return [1 + w - d, 1 + w];
    d -= w;
    if (d < w) return [1, 1 + w - d];
    d -= w;
    return [1 + d, 1];
  };
  let h = '';
  for (let j = 0; j < n; j++) {
    const a = j * seg + 2,
      e = (j + 1) * seg - 2,
      ps = [pt(a)];
    for (let d = Math.ceil(a / (w / 2)) * (w / 2); d < e; d += w / 2) ps.push(pt(d));
    ps.push(pt(e));
    h += `<path d="M${ps.map(p => p.join(' ')).join('L')}"/>`;
  }
  svg.innerHTML = h;
}
/* ---------- 光環列（名詞表 v0.6.36） ---------- */
const BH_AURA1 = ['anger', 'precise', 'hasteaura', 'determination', 'purityaura', 'clarity'];
/* 第一批 6 個用正式素材（art/icons/aura/）；第二批 12 個素材還沒進 art/，先用技能圖 32×32 縮小 */
const bhAuraIc = (k, px) =>
  BH_AURA1.includes(k) ? hudArtURL('aura', k, px - 2) : artIconURL(AURAS[k].ic, px - 2) || iconURL(AURAS[k].ic) || '';
const bhAuraOn = () => BH.fake.aura || ST.auraOn || [];
function bhAura() {
  const L = bhAuraOn(),
    R = BH.R,
    k = L.join() + ':' + R.cell,
    el = $('bhAura');
  if (HV.bhau === k) return;
  HV.bhau = k;
  /* 沒有生效的光環：整組不畫、熱區也不留 */
  el.hidden = !L.length;
  if (!L.length) return void bhAuraList(0);
  const over = L.length > 7,
    show = over ? L.slice(0, 6) : L,
    kk = L.length - 6;
  el.firstElementChild.innerHTML =
    show.map(a => `<i class="ac"><img src="${bhAuraIc(a, R.cell)}" alt=""></i>`).join('') +
    (over ? `<i class="ak" aria-label="還有 ${kk} 個光環">+${kk}</i>` : '');
  el.setAttribute('aria-label', `光環 ${L.length} 個${over ? `，還有 ${kk} 個光環` : ''}`);
  if (!$('bhAuL').hidden) bhAuraList(1);
}
/* 光環清單：每行「{名}・預留精魂 {sp}」，最後一行「精魂 {used}／{max}」 */
function bhAuraList(on) {
  const t = $('bhAuL');
  if (!on || !bhAuraOn().length) return void (t.hidden = true);
  const sp = ST.auraSp || {},
    L = bhAuraOn();
  t.innerHTML =
    L.map(k => `<p>${esc(AURAS[k].n)}・預留精魂 ${Math.ceil(sp[k] || AURAS[k].sp || 0)}</p>`).join('') +
    `<p class="tot">精魂 ${Math.ceil(ST.spiritUsed || 0)}／${Math.floor(ST.spirit || 0)}</p>`;
  t.hidden = false;
  const r = $('bhAura').getBoundingClientRect(),
    h = t.offsetHeight;
  t.style.left = Math.round(r.left) + 'px';
  t.style.top = Math.round(r.top - h - 4) + 'px';
}
/* ---------- 狀態圖示：技能列正上方、光環右側；最多 8 格，第 8 格超過時改「+{k}」 ---------- */
function bhStates() {
  const L = BH.fake.sts || (fightOn() ? playerStates() : []),
    /* 手機橫向（規格沒有）：面板開著不畫（會蓋到面板） */
    off = BH.R.m === 'l' && anyPanel(),
    k = L.map(s => s.k + (s.c || '')).join() + ':' + BH.R.stc + ':' + off;
  const box = $('bhSts').firstElementChild;
  if (HV.bhsts !== k) {
    HV.bhsts = k;
    /* 整組一個熱區（P29–P36／D51–D58）；沒有狀態時不畫 */
    $('bhSts').hidden = !L.length || off;
    $('bhSts').setAttribute('aria-label', '狀態：' + L.map(s => s.n).join('、'));
    /* 最多幾格：直立、桌機 8（§11）；手機橫向照排給它的寬（不壓到右邊的觸控鍵） */
    const cap = BH.R.m === 'l' ? Math.max(2, Math.floor((BH.R.stsV[2] + 4) / (BH.R.stc + 4))) : 8,
      over = L.length > cap,
      show = over ? L.slice(0, cap - 1) : L;
    box.innerHTML =
      show
        .map(
          s =>
            `<span class="stc ${s.bad ? 'bad' : ''}">${icHTML(s.ic)}<i></i>${s.c > 1 || s.sc ? `<b>${s.c}</b>` : ''}</span>`
        )
        .join('') +
      (over ? `<span class="stk" aria-label="還有 ${L.length - cap + 1} 個狀態">+${L.length - cap + 1}</span>` : '');
  }
  const sb = box.children;
  L.slice(0, sb.length).forEach((s, i) => sb[i] && s.f != null && sb[i].style.setProperty('--f', (+s.f).toFixed(2)));
}
/* ---------- 藥劑鈕：只畫冷卻環，不寫次數、秒數 ---------- */
function bhFlasks() {
  for (const i of [0, 1]) {
    const k = i ? 'mflask' : 'flask',
      cd = (P.cds[k] || 0) / FLASK.cd;
    setV($('bhF' + i), 'bhf' + i, (cd > 0 ? 1 - cd : 1).toFixed(3));
  }
  /* 生命／魔力條 */
  const hell = !!ST.hellfire,
    mpv = hell ? (P.hf || 0) / ST.hfMax : P.mp / ST.mp;
  setV($('bhp'), 'bhpv', Math.max(0, P.hp / ST.hp).toFixed(3));
  setV($('bmp'), 'bmpv', Math.max(0, mpv).toFixed(3));
  setT(
    $('bhp').lastChild,
    'bhpt',
    `生命 ${Math.ceil(P.hp)} / ${ST.hp}${ST.es ? `・能量護盾 ${Math.floor(P.es || 0)}` : ''}`
  );
  setT(
    $('bmp').lastChild,
    'bmpt',
    hell ? `地獄火 ${Math.floor(P.hf || 0)} / ${ST.hfMax}` : `魔力 ${Math.floor(P.mp)} / ${ST.mp}`
  );
  const wv = ST.es ? Math.min(1, (P.es || 0) / ST.es).toFixed(3) : '0';
  if (HV.bhw !== wv) $('bhp').style.setProperty('--w', (HV.bhw = wv));
  if (HV.bhhf !== hell) $('bmp').classList.toggle('hf', (HV.bhhf = hell));
}
/* ---------- 低血：<35% 紅邊 24 px 60%、<20% 70%，常亮；生命條外框閃 ≤2 次／秒 ---------- */
function bhLowHp() {
  const f = P.hp / ST.hp,
    lv = G.state === 'play' ? (f < 0.2 ? 2 : f < 0.35 ? 1 : 0) : 0;
  if (HV.bhlow === lv) return;
  HV.bhlow = lv;
  const v = $('bhVig');
  v.classList.toggle('on', !!lv);
  v.classList.toggle('l2', lv === 2);
  $('bhLow').hidden = !lv;
}
/* ---------- 王血條＋大招警示（M2-40 §7.3、big-attack §4） ---------- */
function bhBoss() {
  const b =
      G.mobs.find(m => m.boss && !m.mini && !m.dummy && m.hp > 0) || G.mobs.find(m => m.boss && !m.dummy && m.hp > 0),
    show = !!(b && b.aggro);
  if (HV.bhboss !== show) {
    HV.bhboss = show;
    $('bhBoss').hidden = $('bhBossP').hidden = !show;
    document.body.classList.toggle('bossup', show);
    /* M2-12 §4／M2-40 §10：王現身先寫「{王名}現身」800 ms，再換成王血條（減少動態也照換，只是不動） */
    const bb = $('bhBoss');
    clearTimeout(BH.bt);
    bb.classList.toggle('intro', show);
    if (show) BH.bt = setTimeout(() => bb.classList.remove('intro'), 800);
  }
  if (show) {
    setT($('bhBoss').firstChild, 'bhbn', b.D.n);
    setV($('bhBoss'), 'bhbv', Math.max(0, b.hp / b.mhp).toFixed(3));
  }
  const w = G.big,
    on = !!(w && G.t < w.end && w.src.hp > 0);
  if (!on && w) G.big = null;
  const el = $('bhBig');
  if (el.hidden === on) {
    el.hidden = !on;
    if (on && !reduced() && el.animate)
      el.animate([{ transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 80, easing: 'ease-out' });
  }
  if (on) setV(el, 'bhbig', Math.max(0, (w.end - G.t) / w.dur).toFixed(3));
}
/* 大招判定（big-attack §1／§4）：王＋這 5 招；只在目標是玩家時；同時只一則，新的剩得比較久才取代 */
const BIG_PAT = { charge: 1, verdict: 1, hook: 1, devour: 1, duty: 1 };
function bigWarn(m, T, dur) {
  if (!m.boss || !BIG_PAT[m.pat] || T !== P) return;
  const w = G.big;
  if (w && w.end - G.t >= dur && w.src.hp > 0) return;
  G.big = { src: m, pat: m.pat, t0: G.t, dur, end: G.t + dur };
}
/* 點（桌機 hover／點）狀態列：一行一個「名稱：效果」 */
function bhStsTip() {
  const L = BH.fake.sts || (fightOn() ? playerStates() : []);
  if (!L.length) return;
  showTip(`<p class="sktip">${L.map(s => esc(s.n + '：' + s.d)).join('<br>')}</p>`, $('bhSts').getBoundingClientRect());
}
