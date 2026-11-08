/* dungeonPOE · 手機操作（0.2.4）：桌機為主、手機為輔，規則在 docs/企劃書.md「操作模式」。
   模式：一碰觸控就切成觸控模式（body.touch），滑鼠一按就切回桌機；鍵盤兩邊都能用。
   觸控：左半邊浮動搖桿；右下 5 個技能鍵（大的是普攻＝左鍵欄），點一下自動瞄準最近的敵人（王優先）、
   按住拖＝手動瞄準（地上畫線）放開施放、拖回按鈕上取消；普攻按住連打。翻滾、藥劑、互動在技能鍵外圈。 */
'use strict';
const TOUCH = { on: false, stick: null, mv: [0, 0], sk: null, cast: false, sel: null, front: 'inv' };
const AIM_R = 360; /* 手動瞄準最遠的距離 */

function setTouch(on) {
  if (TOUCH.on === on) return;
  TOUCH.on = on;
  document.body.classList.toggle('touch', on);
  applyOrient();
}
/* 直立／橫向（設定裡選，存在 S.orient）：換 body.port、視野、全螢幕的方向鎖 */
function applyOrient() {
  const p = PORT();
  document.body.classList.toggle('port', p);
  /* 0.2.14 以前加到主畫面的捷徑被 manifest 鎖成橫向（Android 要過一陣子才會更新），轉不過來時教玩家重新加入 */
  $('rott').innerHTML =
    (p ? '直立操作：把手機轉直' : '橫向操作：把手機橫過來') +
    (inApp() ? '<small>轉不過來的話：刪掉主畫面的捷徑、重新「加到主畫面」，或按下面改用另一種</small>' : '');
  $('rotb').textContent = p ? '改用橫向操作' : '改用直立操作';
  if (fsOn() && screen.orientation && screen.orientation.lock)
    screen.orientation.lock(p ? 'portrait' : 'landscape').catch(() => {});
  stickHide();
  fsBtn();
  resize();
  hideTip();
  hudPanels();
  if (TREE.open) treeRender();
}
function setOrient(o) {
  if (S.orient === o) return;
  S.orient = o;
  save();
  applyOrient();
}
/* 最近的敵人（王的距離打六折＝優先打王） */
function autoTarget() {
  let best = null,
    bd = 560;
  for (const m of G.mobs) {
    if (m.hp <= 0) continue;
    const d = Math.hypot(m.x - P.x, m.y - P.y) * (m.boss ? 0.6 : 1);
    if (d < bd) (bd = d), (best = m);
  }
  return best;
}
/* 觸控模式的瞄準點：拖曳中＝拖的方向；按技能時＝最近的敵人；其他＝面向的前方 */
function touchAim() {
  const s = TOUCH.sk;
  if (s && s.drag) {
    const L = 40 + s.t * (AIM_R - 40);
    return { x: P.x + s.ux * L, y: P.y + s.uy * L };
  }
  if (s || TOUCH.cast) {
    const m = autoTarget();
    if (m) return { x: m.x, y: m.y };
  }
  return { x: P.x + Math.cos(P.face) * 200, y: P.y + Math.sin(P.face) * 200 };
}
/* 地上的瞄準線（拖曳技能鍵時；拖回按鈕上＝取消，變紅） */
function drawAim() {
  const s = TOUCH.sk;
  if (!TOUCH.on || !s || !s.drag) return;
  const w = touchAim(),
    col = s.cancel ? 'rgba(229,72,77,' : 'rgba(255,209,102,';
  CX.lineWidth = 2;
  CX.strokeStyle = col + '0.18)';
  CX.beginPath();
  CX.arc(P.x, P.y, AIM_R, 0, Math.PI * 2);
  CX.stroke();
  CX.lineWidth = 6;
  CX.strokeStyle = col + '0.55)';
  CX.beginPath();
  CX.moveTo(P.x, P.y);
  CX.lineTo(w.x, w.y);
  CX.stroke();
  CX.fillStyle = col + '0.35)';
  CX.beginPath();
  CX.arc(w.x, w.y, 22, 0, Math.PI * 2);
  CX.fill();
}
/* ---------- 全螢幕：Android 用網頁全螢幕（第一次碰螢幕自動進、鎖橫向）；
   iPhone 的 Safari 不支援，教玩家「加入主畫面」（從主畫面打開沒有網址列，manifest.webmanifest） ---------- */
const fsOK = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
  fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement),
  inApp = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone;
function fsEnter() {
  const el = document.documentElement,
    rq = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!rq) return;
  Promise.resolve(rq.call(el, { navigationUI: 'hide' }))
    .then(
      () => screen.orientation && screen.orientation.lock && screen.orientation.lock(PORT() ? 'portrait' : 'landscape')
    )
    .catch(() => {});
}
function fsClick() {
  if (fsOK()) return fsEnter();
  showTip(
    `<b>全螢幕</b><p>iPhone 的 Safari 不能讓網頁全螢幕。<br>按下方的<span class="c-gold">分享</span>按鈕 →「加入主畫面」，之後從主畫面的圖示打開，就沒有網址列了。</p>`,
    new DOMRect(innerWidth / 2, 0, 0, 0)
  );
  $('tip').classList.add('act');
}
function fsBtn() {
  const b = $('tfs');
  if (b) b.hidden = !TOUCH.on || inApp() || fsOn();
}
function moreMenu(on) {
  const el = $('tmore');
  if (!el || el.hidden === !on) return;
  el.hidden = !on;
  document.querySelector('[data-tm=more]').setAttribute('aria-expanded', on);
}
/* 在地圖裡按兩次才回家（這張地圖會結束） */
let tHome = 0;
function homeAsk() {
  if (PRO.on) return hudWarn('先走出地層');
  if (G.scene !== 'map' || G.state !== 'play') return;
  if (performance.now() - tHome < 2000) return goHome();
  tHome = performance.now();
  hudWarn(TOUCH.on ? '再按一次回藏身處（這張地圖會結束）' : '再按一次 T 回藏身處（這張地圖會結束）');
}

/* ---------- 搖桿 ---------- */
const STICK_R = 56;
function stickShow(x, y) {
  const el = $('stick');
  el.classList.add('on');
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.bottom = 'auto';
  stickKnob(0, 0);
}
function stickKnob(dx, dy) {
  $('stick').firstChild.style.transform = `translate(${dx}px, ${dy}px)`;
}
function stickHide() {
  const el = $('stick');
  el.classList.remove('on');
  el.style.left = el.style.top = el.style.bottom = '';
  stickKnob(0, 0);
  TOUCH.stick = null;
  TOUCH.mv = [0, 0];
}

/* ---------- 面板：點一下道具＝說明＋動作 ---------- */
function moveLabel(src, it) {
  if (PANEL.craft && !it.gem) return '放上鍛造台';
  if (isSlot(src)) return '卸下';
  if (it.gem && src === 'inv' && !PANEL.stash) return '鑲上';
  if (src === 'stash' || src === 'temp') return '放進背包';
  if (PANEL.stash) return '放進倉庫';
  return '裝備';
}
function tapItem(d) {
  if (d.src === 'sock') return gemSel(d.eqk);
  const r = d.el.getBoundingClientRect();
  TOUCH.sel = { src: d.src, id: d.it.id, eqk: d.eqk };
  const sellB =
    (G.scene === 'hide' && !d.it.gem
      ? `<button class="btn" data-tq="sell">賣 ${d.it.uid ? '？' : sellPrice(d.it)} 金</button>`
      : '') + `<button class="btn" data-tq="drop">丟掉</button>`;
  const build = () =>
    itemTip(d.it, !isSlot(d.src)) +
    `<div class="tqa"><button class="btn pri" data-tq="move">${moveLabel(d.src, d.it)}</button>${sellB}</div>`;
  $('tip').classList.add('act');
  showTip(build(), r);
  TIPRE = { b: build, a: r };
}

function touchInit() {
  /* 一碰就切模式（能力判斷，不看機型） */
  addEventListener(
    'pointerdown',
    e => {
      if (e.pointerType === 'touch') setTouch(true);
      else if (e.pointerType === 'mouse') setTouch(false);
    },
    true
  );
  document.addEventListener('click', e => e.target.closest('.sk[data-k=use]') && interact());
  CV.addEventListener('click', () => {
    if (TOUCH.prop) useProp(TOUCH.prop);
    TOUCH.prop = null;
  });
  /* 畫面：撿東西、藏身處的擺設，左半邊是搖桿 */
  CV.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    TOUCH.prop = null;
    const l = LABELS.find(l => inL(l, e));
    if (l) return dist(P, l.d) < 160 ? pickup(l.d) : hudWarn('走近一點再撿（或按互動）');
    if (G.scene === 'hide') {
      const p = propAt(e);
      if (p === 'portal') return dist(P, G.portal) < 120 ? enterMap(G.portal.to) : hudWarn('走近一點');
      /* 跟互動鍵一樣放開才開（上面的 click） */
      if (p) return void (TOUCH.prop = p);
    }
    /* 直立（龍絆式）：整個畫面都是手勢區。拖＝移動、點＝普攻、按住不動＝連打、快速一撥＝翻滾 */
    if (PORT()) {
      if (TOUCH.stick) return;
      const st = (TOUCH.stick = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        sx: e.clientX,
        sy: e.clientY,
        t: performance.now(),
        port: true,
        mv: false
      });
      st.tm = setTimeout(() => {
        if (TOUCH.stick === st && !st.mv) (st.atk = true), (TOUCH.cast = true), (M.L = 1);
      }, 220);
      return;
    }
    if (e.clientX < innerWidth * 0.55 && !TOUCH.stick) {
      TOUCH.stick = { id: e.pointerId, x0: e.clientX, y0: e.clientY };
      stickShow(e.clientX, e.clientY);
    }
  });
  addEventListener('pointermove', e => {
    const st = TOUCH.stick;
    if (st && e.pointerId === st.id) {
      if (st.port && !st.mv) {
        if (Math.hypot(e.clientX - st.sx, e.clientY - st.sy) < 12) return;
        /* 開始拖：停止連打，搖桿出現在按下去的地方 */
        st.mv = true;
        if (st.atk) (st.atk = false), (TOUCH.cast = false), (M.L = 0);
        stickShow(st.x0, st.y0);
      }
      let dx = e.clientX - st.x0,
        dy = e.clientY - st.y0;
      const L = Math.hypot(dx, dy);
      /* 拉超過範圍：底座跟著手指走（不用回頭找底座） */
      if (L > STICK_R) {
        st.x0 += (dx / L) * (L - STICK_R);
        st.y0 += (dy / L) * (L - STICK_R);
        $('stick').style.left = st.x0 + 'px';
        $('stick').style.top = st.y0 + 'px';
        dx = e.clientX - st.x0;
        dy = e.clientY - st.y0;
      }
      stickKnob(dx, dy);
      TOUCH.mv = L > 10 ? [dx / Math.max(L, 1), dy / Math.max(L, 1)] : [0, 0];
    }
    const s = TOUCH.sk;
    if (s && e.pointerId === s.id) {
      const dx = e.clientX - s.cx,
        dy = e.clientY - s.cy,
        L = Math.hypot(dx, dy);
      if (!s.drag && L > 14) s.drag = true;
      if (s.drag) {
        if (L > 0) {
          s.ux = dx / L;
          s.uy = dy / L;
          s.t = Math.min(1, Math.max(0, (L - s.rad * 0.5) / 90));
        }
        s.cancel = L < s.rad;
      }
    }
  });
  const up = e => {
    const st = TOUCH.stick;
    if (st && e.pointerId === st.id) {
      if (st.port) {
        clearTimeout(st.tm);
        const dt = performance.now() - st.t,
          dx = e.clientX - st.sx,
          dy = e.clientY - st.sy,
          L = Math.hypot(dx, dy);
        if (st.atk) (M.L = 0), (TOUCH.cast = false);
        else if (e.type === 'pointerup' && !st.mv && dt < 300) {
          TOUCH.cast = true;
          useSlot(0);
          TOUCH.cast = false;
        } else if (e.type === 'pointerup' && st.mv && dt < 260 && L > 40) {
          P.mdx = dx / L;
          P.mdy = dy / L;
          doRoll();
        }
      }
      stickHide();
    }
    const s = TOUCH.sk;
    if (s && e.pointerId === s.id) {
      s.el.classList.remove('down');
      if (s.i === 0) M.L = 0;
      else if (P.act && P.act.charge && P.act.slot === s.i) {
        /* 正在蓄力：放開由 skillTick 出手；拖回按鈕上或手勢被系統取消＝取消蓄力、退回魔力 */
        if (e.type !== 'pointerup' || (s.drag && s.cancel)) chargeCancel();
      } else if (e.type === 'pointerup' && !(s.drag && s.cancel)) {
        TOUCH.cast = !s.drag;
        useSlot(s.i);
        TOUCH.cast = false;
      }
      TOUCH.sk = null;
    }
  };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  /* 技能鍵、翻滾、藥劑、互動 */
  $('hud').addEventListener('pointerdown', e => {
    const el = e.target.closest('.sk');
    if (!el || e.pointerType !== 'touch') return;
    e.preventDefault();
    const k = el.dataset.k;
    el.classList.remove('hit');
    void el.offsetWidth;
    el.classList.add('hit');
    if (k === 'roll') return doRoll();
    if (k === 'flask' || k === 'mflask') return drinkFlask(k === 'mflask');
    /* 互動放開才執行：按下就開面板的話，手指放開的 click 會落到剛長出來的按鈕上（375×667 的「開啟傳送門」正好在這裡） */
    if (k === 'use') return;
    const i = +k[1],
      r = el.getBoundingClientRect();
    el.classList.add('down');
    el.setPointerCapture(e.pointerId);
    TOUCH.sk = {
      id: e.pointerId,
      i,
      el,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      rad: r.width / 2,
      drag: false
    };
    if (i === 0) M.L = 1;
    else {
      /* 蓄力技能（0.2.54）：按下就開始蓄，不等放開；瞄準跟平常一樣（沒拖＝最近的敵人，拖＝手動） */
      const c = slotCfg(i);
      if (c && c.D.charge) useSlot(i);
    }
  });
  /* 右上選單、說明框的動作 */
  document.addEventListener('click', e => {
    const m = e.target.closest('[data-tm]');
    /* ☰ 選單：點選單裡的項目或選單以外的地方就收起來 */
    if (!m || m.dataset.tm !== 'more') moreMenu(false);
    if (m) {
      const k = m.dataset.tm;
      if (k === 'fs') return fsClick();
      if (k === 'more') return moreMenu($('tmore').hidden);
      if (k === 'inv') PANEL.inv && !PANEL.stash && !PANEL.skill ? closePanels() : openPanel('inv');
      else if (k === 'skill') PANEL.skill ? closePanels() : openPanel('skill');
      else if (k === 'tree') treeOpen('pt');
      else if (k === 'home') homeAsk();
      else if (k === 'set') PANEL.set ? closePanels() : (closePanels(), openPanel('set'));
      else if (k === 'port' || k === 'land') setOrient(k[0]);
      else if (k === 'flip') setOrient(PORT() ? 'l' : 'p');
      else if (k === 'tabinv') (PANEL.stash = PANEL.skill = PANEL.craft = false), hudPanels();
      else if (k.startsWith('tab')) openPanel(k.slice(3));
      else if (k === 'swap') (TOUCH.front = TOUCH.front === 'inv' ? 'other' : 'inv'), hudPanels();
      return;
    }
    const q = e.target.closest('[data-tq]');
    if (q && TOUCH.sel) {
      const { src, id, eqk } = TOUCH.sel,
        it = findItem(src, id, eqk);
      hideTip();
      if (!it) return;
      if (q.dataset.tq === 'sell') sell(src, it, eqk);
      else if (q.dataset.tq === 'drop') dropFloor(src, it, eqk);
      else quickMove(src, it, eqk);
    }
  });
  /* 點說明框以外的地方：收起說明框 */
  document.addEventListener('pointerdown', e => {
    if (TOUCH.on && !$('tip').hidden && !e.target.closest('#tip,#ttip') && !e.target.closest('.it[data-id]')) hideTip();
  });
  /* 第一次用觸控點螢幕：自動進全螢幕（要在手指放開時才算玩家的操作，瀏覽器才允許） */
  let fsAuto = false;
  addEventListener('pointerup', e => {
    if (fsAuto || e.pointerType !== 'touch' || !fsOK() || inApp() || fsOn()) return;
    fsAuto = true;
    fsEnter();
  });
  document.addEventListener('fullscreenchange', fsBtn);
  document.addEventListener('webkitfullscreenchange', fsBtn);
  setTouch(matchMedia('(pointer: coarse)').matches);
  fsBtn();
}
