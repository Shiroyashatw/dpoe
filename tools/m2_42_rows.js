/* M2-42 體檢清單（specs/M2-42-ux-audit-checklist.md、-b.md）的每一列：怎麼做狀態（go，在頁面裡跑）與驗狀態。
   go(st, port) 回傳 { ok, v（驗狀態的值）, checks（清單列自己的量測）, na（這個尺寸沒有這個畫面的原因）, crops }。
   只用 main 現有的全域函式與 DBG 掛鉤做狀態；不改 DOM 假裝狀態。 */
'use strict';
/* 頁面裡共用的小工具（每次 go 前注入成 window.U） */
const U = () => {
  const $q = s => document.querySelector(s),
    vis = M42.vis;
  const base = k => {
    const L = BASES.filter(b => b.k === k && b.lv <= 40);
    return L[L.length - 1].id;
  };
  const skSet = (i, k, n = 2) => {
    S.skills[i] = { k, so: Array(n).fill(null), n };
    S.lib.sk[k] = S.lib.sk[k] || 1;
  };
  const re = () => {
    ST = stats();
    hudBar();
    hudPanels();
  };
  /* 換武器：照清單 mkItem(id, 40, 2)；需求沒過（ST.eqBad 有 weapon，等於空手、技能失效）就改物品等級 1 的普通品，記在 U.wpnNote */
  const wpn = id => {
    S.eq.weapon = mkItem(id, 40, 2);
    re();
    U.wpnNote = '';
    if ((ST.eqBad || []).includes('weapon')) {
      S.eq.weapon = mkItem(id, 1, 0);
      re();
      U.wpnNote = id + ' Lv40 稀有需求不過→改 Lv1 普通';
    }
  };
  /* 地圖中、沒開面板 */
  const idle = () => {
    closePanels();
    if (TREE.open) treeClose();
  };
  const skKey = i => document.querySelector(`#bar .sk[data-k="s${i}"]`);
  /* 技能格上的數字（冷卻秒數、藥劑次數寫在 <u>；鍵帽在 <kbd>） */
  const skNum = i => {
    const e = skKey(i);
    return e && e.querySelector('u') ? e.querySelector('u').textContent.trim() : '';
  };
  const txt = e => (e ? (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim() : '');
  const click = s => {
    const e = typeof s === 'string' ? $q(s) : s;
    if (!e) return false;
    e.click();
    return true;
  };
  const byText = (s, t) => [...document.querySelectorAll(s)].find(e => vis(e) && txt(e).includes(t));
  /* 世界座標 → 螢幕（render 的鏡頭） */
  const scr = (x, y) => {
    const r = CV.getBoundingClientRect(),
      ox = Math.round(IW / ZOOM / 2 - G.cam.x),
      oy = Math.round(cvH() / ZOOM / 2 - G.cam.y);
    return [r.left + (x + ox) * ZOOM, r.top + (y + oy) * ZOOM];
  };
  return { $q, vis, base, skSet, re, wpn, idle, skKey, skNum, txt, click, byText, scr };
};

/* 黑暗層決策（§5.1）：光柱、怪物生命條、近／遠跳數字，凍結 */
function darkGo(mode, extra) {
  const u = window.U;
  u.idle();
  G.night = G.fog = 0;
  if (mode === 'night') DBG.night(30);
  if (mode === 'fog') DBG.fog(30);
  /* 怪：midgame 場上有；沒有就在旁邊放（不要 DBG.clear） */
  if (!G.mobs.some(m => m.hp > 0)) spawnMob(Object.values(MOBS)[0], P.x + 120, P.y + 40, 1, false);
  /* 停住怪的攻擊（主角不受傷，只為了截圖狀態穩定）：不動遊戲碼，只把這些怪的血量留著 */
  G.drops = G.drops.filter(d => d.show || d.chase);
  if (extra === 'chase') DBG.chaseDrop();
  else DBG.beam(extra === 'unique' ? 'unique' : 'rare');
  /* 光柱落地停住（掉落飛出去的那一段走完：位置＝落點；照 m2_34_3a_fix_shots 的做法） */
  for (const d of G.drops) (d.hold = 1e9), (d.t = Math.max(d.t || 0, 9)), (d.sx = d.x), (d.sy = d.y);
  /* 頭上生命條只畫受傷或菁英的怪（render.js drawBars）：最近的一隻沒受傷就讓牠掉一點血 */
  const near = G.mobs
    .filter(m => m.hp > 0 && !m.boss && !m.arrow)
    .sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
  if (near && !(near.hp < near.mhp || near.elite)) near.hp = Math.round(near.mhp * 0.6);
  G.nums.length = 0;
  DBG.num('hit', 128, P.x + 20, P.y - 70);
  DBG.num('crit', 512, P.x - 30, P.y - 90);
  DBG.num('hurt', 37, P.x, P.y - 50);
  DBG.num('hit', 96, P.x + 200, P.y - 60);
  DBG.num('crit', 777, P.x - 200, P.y - 40);
  DBG.step(66);
  const far = G.nums.filter(n => Math.abs(n.x - P.x) >= 180).length;
  const v = {
    night: +(G.night > G.t),
    fog: +(G.fog > G.t),
    G_t: +G.t.toFixed(2),
    G_night: +G.night.toFixed(2),
    G_fog: +G.fog.toFixed(2),
    beams: G.drops.filter(d => d.show || d.chase).length,
    mobs: G.mobs.filter(m => m.hp > 0).length,
    nums: G.nums.length,
    far
  };
  const st =
    mode === 'night'
      ? G.night > G.t && !(G.fog > G.t)
      : mode === 'fog'
        ? G.fog > G.t && !(G.night > G.t)
        : !(G.night > G.t) && !(G.fog > G.t);
  /* 螢幕矩形（給 L* 量測與特寫） */
  const beam = G.drops.find(d => d.show || d.chase),
    barOn = m => m.hp > 0 && !m.arrow && !m.boss && (m.hp < m.mhp || m.elite),
    mob = G.mobs.filter(barOn).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
  v.bars = G.mobs.filter(barOn).length;
  const box = (x, y, w, h) => {
    const [sx, sy] = u.scr(x, y);
    return [Math.round(sx - (w * ZOOM) / 2), Math.round(sy - h * ZOOM), Math.round(w * ZOOM), Math.round(h * ZOOM)];
  };
  const crops = {};
  if (beam) crops.beam = box(beam.x, beam.y, 40, 140);
  if (mob) crops.bar = box(mob.x, mob.y - mobFly(mob) - mob.sz - 8 + 9, Math.max(36, mob.r * 2.4) + 16, 18);
  const nn = G.nums.find(n => Math.abs(n.x - P.x) < 60),
    nf = G.nums.find(n => Math.abs(n.x - P.x) >= 180);
  if (nn) crops['num-near'] = box(nn.x, nn.y + 10, 70, 34);
  if (nf) crops['num-far'] = box(nf.x, nf.y + 10, 70, 34);
  crops.ground = box(P.x, P.y + 50, 80, 30);
  return {
    ok: st && v.beams > 0 && v.mobs > 0 && v.bars > 0 && v.nums >= 3 && far > 0,
    v,
    crops,
    checks: { order: 'beams,bars,nums_after_dark(現行選項2)' }
  };
}

const ROWS = [
  /* ---------- §4 開場 ---------- */
  {
    id: 'A-I1',
    scr: 'intro',
    st: ['gate'],
    star: 1,
    s: 1,
    q: 'dbg=1&seed=42',
    ready: () => typeof IV === 'object' && IV.gate && !$('intro').hidden,
    go: () => ({
      ok: !$('intro').hidden && !$('ivg').hidden && IV.gate,
      v: { intro: !$('intro').hidden, ivg: !$('ivg').hidden, gate: IV.gate },
      checks: { skip_clickable: +!!document.querySelector('.ivskip') && M42.vis(document.querySelector('.ivskip')) }
    })
  },
  {
    id: 'A-I2',
    scr: 'intro',
    st: ['peace', 'omen', 'crack', 'fall', 'rain', 'march', 'you'],
    s: ['crack', 'you'],
    q: 'dbg=1&seed=42',
    ready: () => typeof IV === 'object' && IV.gate && !$('intro').hidden,
    go: st => {
      const i = ['peace', 'omen', 'crack', 'fall', 'rain', 'march', 'you'].indexOf(st);
      introGo();
      IV.t = SHOTS[i].t0 + 0.8;
      DBG.step(33);
      let txt = $('ivs').textContent,
        on = $('ivs').classList.contains('on'),
        okL = on && SHOTS[i].lines.includes(txt),
        t = 0.8;
      /* t0+0.8 還沒出第一句（lead 較長的鏡頭，例如天裂 2.6）：改到第一句出現後 0.3 秒，寫進 checks */
      if (!okL && SHOTS[i].ls && SHOTS[i].ls[0]) {
        t = SHOTS[i].ls[0].a + 0.3;
        IV.t = SHOTS[i].t0 + t;
        DBG.step(33);
        txt = $('ivs').textContent;
        on = $('ivs').classList.contains('on');
        okL = on && SHOTS[i].lines.includes(txt);
      }
      const shot = SHOTS.find(o => IV.t < o.t0 + o.d);
      return {
        ok: okL && shot === SHOTS[i],
        v: { shot: SHOTS[i].k, ivs: txt, t_in_shot: +t.toFixed(2) },
        checks: { sub_t: t.toFixed(2) }
      };
    }
  },
  {
    id: 'A-I3',
    scr: 'intro',
    st: ['skip', 'lid'],
    q: 'dbg=1&seed=42',
    ready: () => typeof IV === 'object' && IV.gate && !$('intro').hidden,
    go: st => {
      introGo();
      IV.t = 3;
      DBG.step(33);
      document.querySelector('.ivskip').click();
      DBG.step(st === 'skip' ? 33 : 450);
      const v = { scene: G.scene, intro: S.story.intro, lid: !$('lid').hidden, introHidden: $('intro').hidden };
      /* 清單寫「驗進入藏身處」；現行跳過後 G.scene 是 map（proGive 之後直接進第一個地點）：照實記在 checks，不擋圖 */
      return {
        ok: !!S.story.intro && v.introHidden && (st === 'skip' ? v.lid : true),
        v,
        checks: { scene_after_skip: G.scene, expect: 'hide' }
      };
    }
  },
  {
    id: 'A-I4',
    scr: 'intro',
    st: ['rm'],
    q: 'dbg=1&seed=42',
    rm: 1,
    burst: { n: 30, ms: 33 },
    ready: () => typeof IV === 'object' && IV.gate && !$('intro').hidden,
    go: () => {
      introGo();
      IV.t = SHOTS[0].t0 + 0.8;
      DBG.step(33);
      return { ok: IV.calm === true && matchMedia('(prefers-reduced-motion: reduce)').matches, v: { calm: IV.calm } };
    }
  },
  /* ---------- §5 戰鬥 HUD ---------- */
  {
    id: 'A-H1',
    scr: 'combat',
    st: ['auto'],
    star: 1,
    s: 1,
    go: (st, port) => {
      U.idle();
      DBG.step(33);
      const pi = !$('pidle').hidden && M42.vis($('pidle'));
      return { ok: S.auto === 1 && pi, v: { auto: S.auto, pidle: pi, idleOn: idleOn() } };
    }
  },
  {
    id: 'A-H2',
    scr: 'combat',
    st: ['manual'],
    star: 1,
    s: 1,
    go: (st, port) => {
      U.idle();
      act('auto:0');
      DBG.step(66);
      const pi = M42.vis($('pidle')),
        sk = [...document.querySelectorAll('#bar .sk')].filter(M42.vis).length;
      return {
        ok: S.auto === 0 && (port ? !pi : true) && sk > 0,
        v: { auto: S.auto, pidle: pi, idleOn: idleOn(), skVisible: sk }
      };
    }
  },
  {
    id: 'A-H3',
    scr: 'combat',
    st: ['ammo-mid', 'ammo-last', 'ammo-reload'],
    star: 1,
    s: 1,
    go: st => {
      U.idle();
      U.wpn('w_xbow_0');
      U.skSet(1, 'apshot');
      U.skSet(2, 'grenade');
      U.re();
      DBG.step(33);
      P.ammo = P.ammo || {};
      P.ammo.apshot =
        st === 'ammo-mid' ? { n: 3, until: 0 } : st === 'ammo-last' ? { n: 1, until: 0 } : { n: 0, until: G.t + 1.2 };
      /* 自動模式下 AI 會一直開火，凍結後只推一格讓 HUD 重畫 */
      const want = { 'ammo-mid': 3, 'ammo-last': 1, 'ammo-reload': 0 }[st];
      DBG.step(0);
      const k = U.skKey(1),
        t = U.txt(k);
      const left = ammoLeft('apshot');
      return {
        ok: S.skills[1].k === 'apshot' && left === want && (st !== 'ammo-reload' || P.ammo.apshot.until > G.t),
        v: { ammoLeft: left, until_gt_t: +(P.ammo.apshot.until > G.t), clip: clipOf(SKILLS.apshot) },
        checks: { sk_num: JSON.stringify(U.skNum(1)), sk_text: JSON.stringify(t), hidden: U.skNum(1) ? 'none' : 'ammo' }
      };
    }
  },
  {
    id: 'A-H4',
    scr: 'combat',
    st: ['gren-full', 'gren-cd'],
    go: st => {
      U.idle();
      U.wpn('w_xbow_0');
      U.skSet(1, 'apshot');
      U.skSet(2, 'grenade');
      U.re();
      DBG.step(33);
      P.gren = P.gren || {};
      P.gren.grenade = st === 'gren-full' ? [] : [G.t + 3, G.t + 3.6];
      DBG.step(0);
      const q = (P.gren.grenade || []).filter(t => t > G.t).length,
        t = U.txt(U.skKey(2));
      return {
        ok: S.skills[2].k === 'grenade' && (st === 'gren-full' ? q === 0 : q === 2),
        v: { used: q, max: SKILLS.grenade.gren[0] },
        checks: { sk_num: JSON.stringify(U.skNum(2)), sk_text: JSON.stringify(t), hidden: U.skNum(2) ? 'none' : 'gren' }
      };
    }
  },
  {
    id: 'A-H5',
    scr: 'combat',
    st: ['charge-1', 'charge-2', 'charge-3'],
    star: 1,
    s: 1,
    go: st => {
      U.idle();
      act('auto:0');
      U.wpn('w_mace1_0');
      U.skSet(2, 'chargeslam');
      U.re();
      DBG.step(33);
      P.act = null;
      P.mp = ST.mp;
      /* 按住 Q（技能第 3 格）：遊戲的按鍵狀態 K.q，等同玩家按著 */
      K.q = true;
      useSlot(2);
      const n = +st.slice(-1),
        E = SKILLS.chargeslam.charge;
      for (let i = 0; i < 200 && P.act && P.act.charge && Math.floor(P.act.ch / E.step + 1e-6) < n; i++) DBG.step(33);
      const seg = P.act && P.act.charge ? Math.floor(P.act.ch / E.step + 1e-6) : -1;
      const t = U.txt(U.skKey(2));
      return {
        ok: seg === n,
        v: { seg, charging: +!!(P.act && P.act.charge), max: E.max },
        checks: {
          hold: 'K.q',
          sk_num: JSON.stringify(U.skNum(2)),
          sk_text: JSON.stringify(t),
          hidden: U.skNum(2) ? 'none' : 'charge(技能格無段數)',
          foot_bar: 'canvas chargeBar'
        }
      };
    }
  },
  {
    id: 'A-H6',
    scr: 'combat',
    st: ['flask-cd', 'flask-skill'],
    go: st => {
      U.idle();
      if (st === 'flask-skill') {
        const k = Object.keys(SKILLS).find(k => (SKILLS[k].tags || []).includes('flask'));
        U.skSet(2, k);
        U.re();
        P.flask = 2;
        DBG.step(33);
        const t = U.txt(U.skKey(2));
        return {
          ok: S.skills[2].k === k && P.flask > 0,
          v: { k, flask: P.flask },
          checks: { sk_num: JSON.stringify(U.skNum(2)), sk_text: JSON.stringify(t) }
        };
      }
      P.cds.flask = 4;
      P.cds.mflask = 4;
      DBG.step(33);
      const fl = ['flask', 'mflask']
        .map(k => document.querySelector(`#bar .sk[data-k=${k}]`))
        .map(e => (e && M42.vis(e) ? (e.querySelector('u') || {}).textContent || '' : 'none'))
        .join('|');
      return {
        ok: P.cds.flask > 0 && P.cds.mflask > 0,
        v: { cdF: +P.cds.flask.toFixed(2), cdM: +P.cds.mflask.toFixed(2) },
        checks: { flask_cd_txt: fl, hidden: /\d/.test(fl) ? 'none' : 'flask' }
      };
    }
  },
  {
    id: 'A-H7',
    scr: 'combat',
    st: ['cooldown', 'invalid'],
    go: st => {
      U.idle();
      act('auto:0');
      if (st === 'cooldown') {
        P.cds.s1 = 3;
        DBG.step(33);
        const k = U.skKey(1);
        return {
          ok: P.cds.s1 > 0,
          v: { cd: +P.cds.s1.toFixed(2) },
          checks: {
            sk_cls: k ? k.className : '',
            sk_num: JSON.stringify(U.skNum(1)),
            skill_cd: (slotCfg(1) || {}).cd || 0
          }
        };
      }
      U.skSet(2, 'apshot');
      U.re();
      DBG.step(33);
      const bad = document.querySelectorAll('#bar .sk.bad').length;
      return {
        ok: bad > 0,
        v: { bad },
        checks: { bad_text: JSON.stringify(U.txt(document.querySelector('#bar .sk.bad'))) }
      };
    }
  },
  {
    id: 'A-H8',
    scr: 'combat',
    st: ['hp-mid', 'hp-low', 'es', 'block', 'hellfire'],
    s: ['hp-low'],
    go: st => {
      U.idle();
      if (st === 'hp-mid') DBG.hp(70);
      if (st === 'hp-low') DBG.hp(15);
      if (st === 'es') {
        /* 能量護盾：身上放一件有護盾的胸甲 */
        /* 需求要過（不然 chk.bad 把胸甲當沒裝）：從低階的護盾胸甲試起 */
        for (const b of BASES.filter(b => b.k === 'chest' && b.b && b.b.es)) {
          S.eq.chest = mkItem(b.id, 1, 0);
          U.re();
          if (ST.es > 0) break;
        }
        P.es = ST.es;
      }
      if (st === 'block') {
        /* 格擋值（ST.bv）來自盾牌護甲：放護甲最高的盾 */
        /* 需求要過（不然 chk.bad 把副手當沒裝）：用需求最低、有護甲的盾 */
        for (const b of BASES.filter(b => b.k === 'shield' && b.b && b.b.armor)) {
          S.eq.off = mkItem(b.id, 1, 0);
          U.re();
          if (ST.bv > 0) break;
        }
        P.bv = ST.bv;
      }
      if (st === 'hellfire') DBG.hot(1);
      /* 只推 0 毫秒讓 HUD 重畫（推時間的話自動模式會喝藥、吸血，血量就跑掉） */
      DBG.step(st === 'hp-mid' || st === 'hp-low' ? 0 : 33);
      const v = { hp: Math.round((P.hp / ST.hp) * 100), es: ST.es || 0, bv: ST.bv || 0, hellfire: ST.hellfire || 0 };
      const ok =
        st === 'hp-mid'
          ? v.hp >= 60 && v.hp <= 75
          : st === 'hp-low'
            ? v.hp <= 20
            : st === 'es'
              ? v.es > 0
              : st === 'block'
                ? (v.bv > 0 && M42.vis($('bbv'))) || (v.bv > 0 && !TOUCH.on)
                : !!v.hellfire;
      return { ok, v, checks: { bhp: JSON.stringify(U.txt($('bhp'))), bmp: JSON.stringify(U.txt($('bmp'))) } };
    }
  },
  {
    id: 'A-H9',
    scr: 'combat',
    st: ['status-3'],
    go: () => {
      U.idle();
      P.ail = P.ail || {};
      P.ail.shock = G.t + 30;
      P.ail.blind = G.t + 30;
      P.ail.chill = G.t + 30;
      DBG.step(33);
      const ic = [...document.querySelectorAll('#mech *, #hud .st img, #hud .buffs *, #hud [class*=ail] img')].filter(
        M42.vis
      );
      return {
        ok: Object.values(P.ail).filter(t => typeof t === 'number' && t > G.t).length >= 3,
        v: { ail: Object.keys(P.ail).filter(k => P.ail[k] > G.t) },
        checks: { status_dom: ic.length, status_where: ic.length ? 'dom' : 'canvas/none' }
      };
    }
  },
  {
    id: 'A-H10',
    scr: 'combat',
    st: ['boss', 'prog'],
    star: 1,
    go: st => {
      U.idle();
      if (st === 'boss') {
        const m = DBG.boss(BOSSES[0].sp);
        DBG.step(100);
        const bb = M42.vis($('bossbar'));
        return {
          ok: !!m && bb,
          v: { boss: m && m.D.n, bossbar: bb },
          checks: { bossn: JSON.stringify(U.txt($('bossn'))) }
        };
      }
      return { ok: M42.vis($('prog')), v: { prog: U.txt($('prog')) } };
    }
  },
  {
    id: 'A-H11',
    scr: 'combat',
    st: ['minimap'],
    go: () => {
      U.idle();
      DBG.step(33);
      return {
        ok: G.scene === 'map',
        v: { scene: G.scene },
        checks: { minimap: 'canvas（render.js，無 DOM 矩形；看截圖右上／右下）' }
      };
    }
  },
  {
    id: 'A-H12',
    scr: 'combat',
    st: ['dlog-cur', 'dlog-mix', 'dlog-chase'],
    star: 1,
    s: 1,
    go: st => {
      U.idle();
      S.log = [];
      const cur = Object.keys(CUR);
      if (st === 'dlog-cur') ['exalt', 'chaos', 'alch'].forEach(k => CUR[k] && dropLog(CUR[k].n, 'cur'));
      if (st === 'dlog-mix') {
        dropLog(CUR[cur.find(c => !/3$/.test(c))].n, 'cur');
        dropLog(CUR[cur.find(c => /3$/.test(c))].n, 'perf');
        dropLog('★ ' + BASES.find(b => b.k === 'amulet').n, 'frac');
        const k = CHASE_POOL.trunk[0];
        dropLog(chaseBanner(k), 'chase', k);
      }
      if (st === 'dlog-chase') {
        const k = CHASE_POOL.trunk[0];
        dropLog(chaseBanner(k), 'chase', k);
      }
      DBG.step(33);
      const ps = [...document.querySelectorAll('#dlog p')];
      const cls = ps.map(p => p.className);
      const want = {
        'dlog-cur': ['lg-cur'],
        'dlog-mix': ['lg-cur', 'lg-perf', 'lg-frac', 'lg-chase'],
        'dlog-chase': ['lg-chase']
      }[st];
      const col = [...new Set(ps.map(p => getComputedStyle(p).color))];
      return {
        ok: ps.length > 0 && want.every(c => cls.includes(c) || (st === 'dlog-mix' && ps.length === 3)),
        v: { cls },
        checks: {
          dlog_n: ps.length,
          dlog_colors: col.length,
          dlog_icon: +!!document.querySelector('#dlog img,#dlog .ic'),
          dlog_cap: 3
        }
      };
    }
  },
  {
    id: 'A-H13',
    scr: 'combat',
    st: ['banner-cur', 'banner-chase'],
    go: st => {
      U.idle();
      if (st === 'banner-cur') {
        const k = Object.keys(CUR).find(c => /3$/.test(c));
        rareShow(CUR[k].n, 'perf', 'orb');
        DBG.step(66);
        return { ok: M42.vis($('banner')), v: { banner: U.txt($('banner')), cls: $('banner').className } };
      }
      const k = CHASE_POOL.trunk[0];
      S.chase.got[k] = (S.chase.got[k] || 0) + 1;
      chaseShow(k);
      DBG.step(400);
      return { ok: M42.vis($('chase')), v: { chase: U.txt($('chase')).slice(0, 40) } };
    }
  },
  {
    id: 'A-H14',
    scr: 'combat',
    st: ['toast'],
    go: () => {
      U.idle();
      DBG.toast('warn', '測試警告');
      DBG.step(200);
      return {
        ok: $('warn').classList.contains('on') && U.txt($('warn')) === '測試警告',
        v: { warn: U.txt($('warn')) }
      };
    }
  },
  {
    id: 'A-H15',
    scr: 'combat',
    st: ['lvup'],
    go: () => {
      U.idle();
      DBG.lvup();
      DBG.step(300);
      return { ok: $('lvup').classList.contains('on'), v: { lvup: U.txt($('lvup')), lv: S.lv } };
    }
  },
  {
    id: 'A-H16',
    scr: 'combat',
    st: ['paused'],
    go: () => {
      U.idle();
      act('auto:0');
      openPanel('set');
      DBG.step(66);
      return {
        ok: worldPaused() && M42.vis($('paused')),
        v: { worldPaused: worldPaused(), paused: M42.vis($('paused')) }
      };
    }
  },
  {
    id: 'A-H17',
    scr: 'combat',
    st: ['area-run'],
    go: () => {
      U.idle();
      S.world.note = `在${G.nodeN || '這裡'}連死 3 次，退回上一個地點：換裝、降星級或升營地再回去`;
      DBG.step(66);
      return {
        ok: M42.vis($('run')) && M42.vis($('area')),
        v: { area: U.txt($('area')), run: U.txt($('run')).slice(0, 40) }
      };
    }
  },
  {
    id: 'A-H18',
    scr: 'mode',
    st: ['auto', 'manual'],
    na: { P: '直立沒有 .modesw（donly），自動／手動在設定裡切' },
    go: st => {
      U.idle();
      act(st === 'auto' ? 'auto:1' : 'auto:0');
      DBG.step(66);
      const on = document.querySelector('.modesw button[aria-pressed=true]');
      return {
        ok: M42.vis(document.querySelector('.modesw')) && S.auto === (st === 'auto' ? 1 : 0),
        v: { auto: S.auto, pressed: U.txt(on) },
        checks: { modesw: M42.R(document.querySelector('.modesw')).join('x') }
      };
    }
  },
  {
    id: 'A-H19',
    scr: 'nav',
    st: ['plain', 'dot', 'badge'],
    star: ['badge'],
    /* 沒提示：midgame 一定有天賦／昇華點與技能空孔提示，改用新局跳過開場（藏身處，分頁列沒有任何點） */
    q: { plain: 'dbg=1&seed=42' },
    ready: { plain: () => typeof IV === 'object' && IV.gate && !$('intro').hidden },
    go: (st, port) => {
      if (st === 'plain') {
        introEnd();
        proSkip();
        DBG.step(500);
        /* 新局的材料剛好夠升一件營地：清掉，分頁列才沒有任何提示 */
        S.mat.soul = 0;
        for (const k in S.mat.mats) S.mat.mats[k] = 0;
        U.re();
      } else U.idle();
      if (st === 'dot') {
        S.mat.soul = 0;
        for (const k in S.mat.mats) S.mat.mats[k] = 0;
        U.re();
      }
      if (st === 'badge') {
        for (const k in S.mat.mats) S.mat.mats[k] = 1e6;
        U.re();
      }
      DBG.step(66);
      const nav = port ? $('pnav') : $('dnav');
      const dots = nav.querySelectorAll('i.dot').length,
        pill = nav.querySelectorAll('i.dot.n').length;
      const ok = st === 'plain' ? dots === 0 && M42.vis(nav) : st === 'dot' ? dots > 0 && pill === 0 : pill > 0;
      const cells = [...nav.querySelectorAll('button')].filter(M42.vis).map(b => M42.R(b).slice(2).join('x'));
      return {
        ok,
        v: { dots, pill, campReady: campReady(), scene: G.scene },
        checks: {
          nav_cells: [...new Set(cells)].join('|'),
          nav_n: cells.length,
          badge: pill ? U.txt(nav.querySelector('i.dot.n')) : ''
        }
      };
    }
  },
  {
    id: 'A-H20',
    scr: 'nav',
    st: ['hover', 'press'],
    na: { P: { hover: '直立沒有滑鼠停留' }, D: { press: '桌機沒有觸控按住' } },
    node: async (p, st, port) => {
      if (st === 'hover') {
        const b = await p.$('#dnav button:nth-child(4)');
        await b.hover();
        await p.waitForTimeout(250);
        return { ok: true, v: { hover: '#dnav button:nth-child(4)' } };
      }
      const b = await p.$('#pnav button:nth-child(2)');
      const bx = await b.boundingBox();
      const cdp = await p.context().newCDPSession(p);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: bx.x + bx.width / 2, y: bx.y + bx.height / 2 }]
      });
      await p.waitForTimeout(120);
      return { ok: true, v: { press: '#pnav button:nth-child(2)', touch: 'held' } };
    }
  },
  {
    id: 'A-H21',
    scr: 'tip',
    st: ['hover', 'edge'],
    pre: () => {
      U.idle();
      navGo('bag');
      DBG.step(66);
      M42.finishAnims();
    },
    node: async (p, st, port) => {
      /* 戰利品裡的物品格：hover＝第一格，edge＝最右邊那格 */
      await p.waitForTimeout(300);
      await p.evaluate(() => (DBG.step(0), M42.finishAnims()));
      const cells = await p.evaluate(() =>
        [...document.querySelectorAll('#pinv .it')]
          .map(e => e.getBoundingClientRect())
          .filter(r => r.width > 4 && r.bottom < innerHeight - 90)
          .map(r => [r.x + r.width / 2, r.y + r.height / 2])
      );
      if (!cells.length)
        return {
          ok: false,
          v: {
            cells: 0,
            dbg: await p.evaluate(() => ({
              inv: PANEL.inv,
              n: document.querySelectorAll('#pinv .it').length,
              w: [...document.querySelectorAll('#pinv .it')]
                .slice(0, 3)
                .map(e => JSON.stringify(e.getBoundingClientRect())),
              anim: document
                .getAnimations()
                .map(a => a.playState + ':' + (a.animationName || a.transitionProperty) + ':' + a.currentTime)
                .slice(0, 8),
              st: G.state,
              scene: G.scene,
              over: !$('over').hidden
            }))
          }
        };
      const c = st === 'hover' ? cells[0] : cells.slice().sort((a, b) => b[0] - a[0] || a[1] - b[1])[0];
      if (port) await p.touchscreen.tap(c[0], c[1]);
      else await p.mouse.move(c[0], c[1]);
      await p.waitForTimeout(450);
      const r = await p.evaluate(() => {
        M42.finishAnims();
        /* 直立點物品不出 #tip，改在戰利品裡展開對比卡（.acts 那一塊）；桌機停 300 ms 出 #tip */
        const a = document.querySelector('#pinv .acts'),
          t = TOUCH.on && a ? a.parentElement : $('tip'),
          vis = M42.vis(t),
          R = vis ? M42.R(t) : null;
        return {
          kind: TOUCH.on ? 'inline-compare(.acts)' : '#tip',
          vis,
          R,
          inside: R ? R[0] >= 0 && R[1] >= 0 && R[0] + R[2] <= innerWidth && R[1] + R[3] <= innerHeight : null
        };
      });
      return { ok: r.vis, v: r, checks: { tip_w: r.R ? r.R[2] : '', tip_inside: r.inside, tip_kind: r.kind } };
    }
  },
  {
    id: 'A-H22',
    scr: 'roll',
    st: ['rcd'],
    go: (st, port) => {
      U.idle();
      act('auto:0');
      P.cds.roll = 1.2;
      DBG.step(33);
      const r = M42.vis($('rcd')),
        k = [...document.querySelectorAll('#bar .sk')].pop();
      return {
        ok: P.cds.roll > 0,
        v: { roll_cd: +P.cds.roll.toFixed(2), rcd: r },
        checks: { rcd_dom: r ? M42.R($('rcd')).join('x') : 'hidden', roll_key: JSON.stringify(U.txt(k)) }
      };
    }
  },
  {
    id: 'A-H23',
    scr: 'combat',
    st: ['safe-0', 'safe-34'],
    s: ['safe-34'],
    go: st => {
      U.idle();
      DBG.safeArea(st === 'safe-0' ? 0 : 34);
      DBG.step(66);
      const v = getComputedStyle(document.documentElement).getPropertyValue('--sab').trim();
      const nav = M42.vis($('pnav')) ? M42.R($('pnav')) : M42.R($('bar'));
      return {
        ok: v === (st === 'safe-0' ? '0px' : '34px'),
        v: { sab: v },
        checks: { nav_bottom_gap: innerHeight - (nav[1] + nav[3]) }
      };
    }
  },
  /* ---------- §5.1 黑暗層決策 ---------- */
  { id: 'A-D1', scr: 'combat', st: ['dark-normal'], star: 1, s: 1, dark: 1, go: () => darkGo('normal') },
  {
    id: 'A-D2',
    scr: 'combat',
    st: ['dark-night'],
    star: 1,
    s: 1,
    dark: 1,
    burst: { n: 7, ms: 166 },
    go: () => darkGo('night')
  },
  {
    id: 'A-D3',
    scr: 'combat',
    st: ['dark-fog'],
    star: 1,
    s: 1,
    dark: 1,
    burst: { n: 7, ms: 166 },
    go: () => darkGo('fog')
  },
  {
    id: 'A-D4',
    scr: 'combat',
    st: ['dark-night-unique', 'dark-fog-chase'],
    dark: 1,
    go: st => (st === 'dark-night-unique' ? darkGo('night', 'unique') : darkGo('fog', 'chase'))
  },
  /* ---------- §6 掛機卡、死亡、離線、設定、更多、地點 ---------- */
  {
    id: 'A-C1',
    scr: 'idle',
    st: ['expand'],
    star: 1,
    s: 1,
    go: (st, port) => {
      U.idle();
      DBG.step(33);
      const pi = M42.vis($('pidle'));
      const shrink = [...document.querySelectorAll('#pidle button')].filter(b =>
        /收|縮|觀戰|‒|−|▾|▴/.test(U.txt(b) + (b.getAttribute('aria-label') || ''))
      ).length;
      const go = document.querySelector('#pidle [data-a=gocamp]');
      const r = pi ? M42.R($('pidle')) : null;
      return {
        ok: pi,
        v: { pidle: pi, idleOn: idleOn() },
        checks: {
          idle_shrink: shrink ? shrink : 'none',
          idle_h: r ? r[3] : '',
          idle_top_pct: r ? Math.round((r[1] / innerHeight) * 100) : '',
          gocamp: go ? M42.R(go).slice(2).join('x') : 'none',
          drop_feed: 'dlog',
          camp_idle: 'hidden'
        }
      };
    }
  },
  {
    id: 'A-C2',
    scr: 'idle',
    st: ['resbar'],
    star: 1,
    s: 1,
    go: () => {
      U.idle();
      DBG.step(33);
      const top = document.querySelector('#pidle .cmtop'),
        bars = [...document.querySelectorAll('#pidle .cmtop .rbar')].map(b => ({
          n: U.txt(b.querySelector('.rn')),
          r: M42.R(b),
          cut: b.scrollWidth > b.clientWidth + 1
        }));
      return {
        ok: !!top && M42.vis(top) && bars.length > 0,
        v: { bars: bars.length },
        crops: top ? { cmtop: M42.R(top) } : {},
        checks: {
          rbars: bars.map(b => b.n + ':' + b.r.join(',')).join('|'),
          rbar_cut:
            bars
              .filter(b => b.cut)
              .map(b => b.n)
              .join('|') || 'none'
        }
      };
    }
  },
  {
    id: 'A-C3',
    scr: 'idle',
    st: ['pity', 'stash80'],
    go: st => {
      U.idle();
      if (st === 'pity') {
        /* 怪物 Lv45 以上才累積保底（chase 測試用第 15 個主幹點） */
        S.lv = 70;
        Object.assign(S.camp, { watch: CAMP.watch.length, scout: 5 });
        U.re();
        runNode(TRUNK_K[14]);
        DBG.step(500);
        U.idle();
        DBG.step(66);
        const ch = document.querySelector('#pidle .chs, #pidle [data-a^=chase], #pidle .chline, #pidle [class*=chase]');
        return {
          ok: !!chaseLine(G.mapT) && M42.vis($('pidle')),
          v: { mapT: G.mapT, chaseLine: !!chaseLine(G.mapT) },
          checks: { pity_row: ch ? M42.R(ch).slice(2).join('x') : 'none' }
        };
      }
      while (S.inv.items.length < Math.ceil(INV_CAP * 0.82)) invPut(S.inv, mkItem(U.base('ring'), 30, 0));
      U.re();
      DBG.step(66);
      const pct = Math.round((S.inv.items.length / INV_CAP) * 100);
      return {
        ok: pct >= 80 && !!document.querySelector('#pidle .note'),
        v: { pct },
        checks: { note: JSON.stringify(U.txt(document.querySelector('#pidle .note'))) }
      };
    }
  },
  {
    id: 'A-C4',
    scr: 'idle',
    st: ['loot'],
    star: 1,
    go: () => {
      U.idle();
      const c = Object.keys(CUR);
      G.loot = {
        t: performance.now(),
        items: [],
        gold: 1234,
        sold: 0,
        log: [
          { n: CUR[c[0]].n, c: 'cur' },
          { n: CUR[c[0]].n, c: 'cur' },
          { n: CUR[c[3]].n, c: 'cur' },
          { n: CUR[c.find(k => /3$/.test(k))].n, c: 'perf' }
        ],
        node: G.node,
        hint: 1
      };
      idleBar(1);
      DBG.step(66);
      return {
        ok: M42.vis($('pidle')) && /這一輪掉的/.test(U.txt($('pidle'))),
        v: { loot: U.txt($('pidle')).slice(0, 30) },
        checks: { scroll_list: document.querySelectorAll('#pidle .rows').length }
      };
    }
  },
  {
    id: 'A-C5',
    scr: 'idle',
    st: ['desk'],
    na: { P: '直立的掛機卡是半版（A-C1）；桌機左下卡只有桌機' },
    go: () => {
      U.idle();
      DBG.step(33);
      const r = M42.vis($('pidle')) ? M42.R($('pidle')) : null;
      return {
        ok: !!r,
        v: { pidle: !!r },
        checks: { idle_h: r ? r[3] : '', idle_x: r ? r[0] + '-' + (r[0] + r[2]) : '' }
      };
    }
  },
  {
    id: 'A-O1',
    scr: 'death',
    st: ['manual'],
    star: 1,
    q: 'test=nearDeath&seed=42&dbg=1',
    go: () => {
      U.idle();
      S.auto = 0;
      G.state = 'dead';
      hudState();
      DBG.step(66);
      const c = document.querySelector('#over .card.dead');
      return {
        ok: !!c && M42.vis(c),
        v: { state: G.state, card: !!c },
        checks: { cause: JSON.stringify(U.txt(document.querySelector('#over .ddeath'))) }
      };
    }
  },
  {
    id: 'A-O2',
    scr: 'death',
    st: ['auto-toast'],
    na: { D: '桌機沒有半版面板（sheetOn 只在直立），死亡一律出死亡卡' },
    go: () => {
      U.idle();
      S.auto = 1;
      navGo('bag');
      G.state = 'dead';
      hudState();
      DBG.step(100);
      return {
        ok: $('over').hidden && $('warn').classList.contains('on'),
        v: { over: !$('over').hidden, warn: U.txt($('warn')) }
      };
    }
  },
  {
    id: 'A-O3',
    scr: 'death',
    st: ['upgrade'],
    q: 'test=nearDeath&seed=42&dbg=1',
    go: () => {
      U.idle();
      S.auto = 0;
      G.state = 'dead';
      hudState();
      DBG.step(66);
      const b = document.querySelector('#over .dup');
      return { ok: !!b && M42.vis(b), v: { dup: U.txt(b) } };
    }
  },
  {
    id: 'A-O4',
    scr: 'ask',
    st: ['home'],
    go: () => {
      U.idle();
      G.ask = 'home';
      hudState();
      DBG.step(66);
      const c = document.querySelector('#over .card.ask');
      return { ok: !!c && M42.vis(c), v: { ask: G.ask } };
    }
  },
  {
    id: 'A-O5',
    scr: 'offline',
    st: ['sum', 'chase'],
    star: ['sum'],
    go: st => {
      U.idle();
      const k = CHASE_POOL.trunk[0],
        c = Object.keys(CUR);
      const o = {
        away: 3 * 3600e3 + 25 * 60e3,
        n: 140,
        won: 133,
        soul: 8200,
        cur: [
          [c[0], 3],
          [c[2], 1]
        ],
        gold: 2400,
        lv: 1,
        chase: st === 'chase' ? 1 : 0,
        chaseL: st === 'chase' ? [[k, 1, true]] : [],
        pts: chaseOf().pts,
        here: st === 'chase'
      };
      if (st === 'chase') S.chase.got[k] = (S.chase.got[k] || 0) + 1;
      const g = {};
      for (const k of GEN_K.filter(genOn).slice(0, 4)) g[matKey(k, genTier(k))] = 1200;
      g.wood = 4800;
      offShow(o, g, o.away);
      DBG.step(1200);
      return {
        ok: M42.vis($('preveal')) && /離開/.test(U.txt($('preveal'))),
        v: { title: U.txt(document.querySelector('#preveal .ph b, #preveal h2')) }
      };
    }
  },
  {
    id: 'A-O6',
    scr: 'rotate',
    st: ['prompt'],
    na: { D: '桌機沒有觸控方向提示（#rot 只在觸控）' },
    node: async (p, st, port) => {
      /* 直立設定、畫面轉成橫向：遊戲出 #rot 提示 */
      await p.setViewportSize({ width: 844, height: 390 });
      await p.waitForTimeout(400);
      await p.evaluate(() => DBG.step(66));
      const r = await p.evaluate(() => ({
        rot: M42.vis($('rot')),
        txt: (($('rott') || {}).textContent || '').trim(),
        orient: S.orient
      }));
      return { ok: r.rot, v: r, viewport: '844x390' };
    }
  },
  {
    id: 'A-M1',
    scr: 'more',
    st: ['home'],
    star: 1,
    go: () => {
      U.idle();
      navGo('more');
      DBG.step(100);
      return { ok: M42.vis($('pmore')), v: { more: PANEL.more } };
    }
  },
  {
    id: 'A-M2',
    scr: 'set',
    st: ['main'],
    go: () => {
      U.idle();
      openPanel('set');
      DBG.step(100);
      return {
        ok: M42.vis($('pset')),
        v: { set: PANEL.set },
        checks: { orient_sw: +!!U.byText('#pset button', '直立') }
      };
    }
  },
  {
    id: 'A-M3',
    scr: 'set',
    st: ['acct-guest'],
    go: () => {
      U.idle();
      openPanel('set');
      DBG.step(100);
      const a = document.querySelector('#pset input[type=email], #pset input, #pset [data-a^=acct], #pset .acct');
      if (a) a.scrollIntoView({ block: 'center' });
      DBG.step(33);
      return { ok: !!a && M42.vis(a), v: { acct: a ? M42.sel(a) : null } };
    }
  },
  {
    id: 'A-M4',
    scr: 'node',
    st: ['list', 'stars'],
    star: 1,
    s: 1,
    go: st => {
      U.idle();
      openPanel('node');
      DBG.step(100);
      if (st === 'stars') {
        const b =
          document.querySelector('#pnode [data-a="nstar:2"]') ||
          document.querySelector('#pnode [data-a^="nstar:"]:not(.on)');
        if (b) b.click();
        DBG.step(100);
        return { ok: !!b && M42.vis($('pnode')), v: { star: b ? b.dataset.a : null } };
      }
      return { ok: M42.vis($('pnode')), v: { node: PANEL.node } };
    }
  },
  {
    id: 'A-M5',
    scr: 'hide',
    st: ['resume'],
    go: () => {
      U.idle();
      const cur = S.world.cur;
      enterHideout();
      DBG.step(200);
      return {
        ok: G.scene === 'hide' && !!S.world.cur && M42.vis($('run')),
        v: { scene: G.scene, cur: S.world.cur, run: U.txt($('run')).slice(0, 30) }
      };
    }
  }
];
module.exports = { ROWS, U, darkGo };
