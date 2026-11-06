/* dungeonPOE · 藏身處：場景圖（hideart.js，tools/hide_bake.js 烘的）、練習區、稻草人、DPS 統計、十二神像 */
'use strict';
/* 場景的暗層與光暈色（biome.js 的 BIO） */
const HIDE_BIO = { dark: '5,3,3', light: '255,150,70' };
/* 格子牆：跟地圖同一套碰撞，牆擋人也擋投射物 */
let HIDE_T;
function hideTiles() {
  return HIDE_T || (HIDE_T = Uint8Array.from(HIDE_ART.tiles, c => +c));
}
const HIMG = {};
function himg(k) {
  if (!HIMG[k]) (HIMG[k] = new Image()).src = HIDE_ART.img[k];
  return HIMG[k];
}
const hideProps = () => [
  ...HIDE_ART.props,
  ...npcList().map(n => ({ k: 'npc', id: n.id, n: n.n, x: n.x, y: n.y, r: 22, ny: 86 }))
];

/* ---------- 稻草人：不會死、不反擊、不掉寶、不給經驗、不算首領進度 ---------- */
const DUMMY_N = ['稻草人', '菁英稻草人', '王稻草人'];
const meanHp = a => a.reduce((s, x) => s + x.hp, 0) / a.length;
/* 生命照一般怪物、王的平均，防禦走 mobDef：階級、菁英、王都跟真的一樣 */
function dummyBuild() {
  G.mobs = G.mobs.filter(m => !m.dummy);
  const t = (G.mapT = PRAC.t);
  for (const d of HIDE_ART.dummies) {
    const sp = 'dummy' + d.t,
      a = typeof ART !== 'undefined' && ART[sp],
      sz = a ? a[4] * HIDE_ART.TX : 80,
      D = {
        n: DUMMY_N[d.t],
        sp,
        hp: d.t === 2 ? meanHp(BOSSES) : meanHp(Object.values(MOBS)),
        dmg: 0,
        spd: 0,
        r: 20,
        sz,
        ai: 'dummy',
        reach: 0,
        wind: 1,
        cd: 1,
        xp: 0
      },
      m = spawnMob(D, d.x, d.y, 98, d.t === 1);
    if (d.t === 2) {
      m.boss = 1;
      m.hp = m.mhp = m.hp * bossHpMul(t);
      mobDef(m, t);
    }
    m.sz = sz;
    m.hx = d.x;
    m.hy = d.y;
    m.dummy = 1;
    dummyArm(m);
  }
}
/* 各種傷害都直接寫 m.hp（擊中、持續傷害、召喚物、百分比爆炸），統計攔在這裡才不會漏；
   歸零的寫入（撲殺）不算傷害、直接補滿，扣到 0 以下也補滿，所以不會走到 killMob */
function dummyArm(m) {
  let hp = m.hp;
  Object.defineProperty(m, 'hp', {
    get: () => hp,
    set(v) {
      if (v === 0) return void (hp = m.mhp);
      if (v < hp) dpsAdd(hp - v, PRAC.dot), (m.hitT = G.t);
      hp = v > 0 ? v : m.mhp;
    }
  });
}
/* updMobs 呼叫：只跑異常，釘在原地；沒人打 5 秒回滿（屠戮打擊這類「滿血」條件才測得到） */
function dummyTick(m, dt) {
  m.flash = Math.max(0, m.flash - dt);
  m.sq = Math.max(0, m.sq - dt * 6);
  PRAC.dot = 1;
  ailTick(m, dt);
  PRAC.dot = 0;
  m.x = m.hx;
  m.y = m.hy;
  m.vx = m.vy = 0;
  if (m.hp < m.mhp && G.t - (m.hitT || 0) > 5) m.hp = m.mhp;
}
function pracStep(d) {
  const t = clamp(PRAC.t + d, 1, S.maxT);
  if (t === PRAC.t) return hudWarn(d > 0 ? '這一階還沒開放：先打倒前一階的王' : '已經是最低階');
  PRAC.t = t;
  dummyBuild();
  dpsReset();
}
function pracReal() {
  PRAC.real = !PRAC.real;
  P.mp = ST.mp;
  P.cds = {};
  dpsReset();
}
/* 離開石圈：場上的單位、地面、投射物、稻草人身上的異常都清掉 */
function pracLeave() {
  skillsEnter();
  P.act = null;
  P.cds = {};
  Object.assign(G, { shots: [], tele: [] });
  Object.assign(P, { hp: ST.hp, mp: ST.mp, flask: FLASK.n, mflask: FLASK.n });
  for (const m of G.mobs) if (m.dummy) (m.ail = {}), (m.hp = m.mhp);
}
function hideTick() {
  const z = HIDE_ART.zone,
    on = ((P.x - z.x) / z.rx) ** 2 + ((P.y - z.y) / z.ry) ** 2 < 1;
  if (on === PRAC.in) return;
  PRAC.in = on;
  if (!on) pracLeave();
}

/* ---------- DPS：0.25 秒一格的環形桶，看最近 10 秒 ---------- */
const DPS_N = 40;
const DPS = { tot: 0, dot: 0, max: 0, t0: null, b: new Float64Array(DPS_N), k: new Float64Array(DPS_N).fill(-1e9) };
function dpsAdd(v, dot) {
  const k = Math.floor(G.t * 4),
    i = k % DPS_N;
  if (DPS.k[i] !== k) (DPS.k[i] = k), (DPS.b[i] = 0);
  DPS.b[i] += v;
  DPS.tot += v;
  if (dot) DPS.dot += v;
  else DPS.max = Math.max(DPS.max, v);
  if (DPS.t0 == null) DPS.t0 = G.t;
}
function dpsReset() {
  Object.assign(DPS, { tot: 0, dot: 0, max: 0, t0: null });
  DPS.k.fill(-1e9);
}
function dpsView() {
  const k = Math.floor(G.t * 4);
  let s = 0;
  for (let i = 0; i < DPS_N; i++) if (k - DPS.k[i] < DPS_N) s += DPS.b[i];
  return {
    avg: DPS.t0 == null ? 0 : s / Math.max(1, Math.min(10, G.t - DPS.t0)),
    tot: DPS.tot,
    max: DPS.max,
    dotP: DPS.tot ? DPS.dot / DPS.tot : 0
  };
}

/* ---------- 練習區的小面板（只在石圈裡；DPS 打了稻草人才出現） ---------- */
const PRAC_HTML = `<div class="prh"><b>練習區</b><span id="prm"></span></div>
  <div class="prs"><button class="btn mini" data-pr="dn" aria-label="降低階級">−</button><b id="prt"></b><button class="btn mini" data-pr="up" aria-label="提高階級">＋</button></div>
  <button class="btn mini prr" data-pr="real" aria-pressed="false">實戰模式</button>
  <div id="prd" hidden><dl><dt>10 秒平均</dt><dd id="pra"></dd><dt>總傷害</dt><dd id="prv"></dd><dt>最高一擊</dt><dd id="prx"></dd></dl>
  <div class="prb"><i></i></div><small id="prp"></small><button class="btn mini" data-pr="reset">重置</button></div>`;
function pracInit() {
  $('prac').innerHTML = PRAC_HTML;
  $('prac').addEventListener('click', e => {
    const b = e.target.closest('[data-pr]');
    if (!b) return;
    const k = b.dataset.pr;
    if (k === 'dn') pracStep(-1);
    else if (k === 'up') pracStep(1);
    else if (k === 'real') pracReal();
    else dpsReset();
  });
}
const dpsN = v => Math.round(v).toLocaleString('en-US');
function pracHud() {
  const el = $('prac');
  if (HV.prac !== PRAC.in) el.hidden = !(HV.prac = PRAC.in);
  if (!PRAC.in) return;
  setT($('prt'), 'prt', '階級 ' + PRAC.t);
  setT($('prm'), 'prm', PRAC.real ? '真實魔力與冷卻' : '無限魔力 · 無冷卻');
  if (HV.prr !== PRAC.real) {
    const b = el.querySelector('.prr');
    b.classList.toggle('on', (HV.prr = PRAC.real));
    b.setAttribute('aria-pressed', PRAC.real);
  }
  const on = DPS.tot > 0;
  if (HV.prd !== on) $('prd').hidden = !(HV.prd = on);
  if (!on) return;
  const v = dpsView();
  setT($('pra'), 'pra', dpsN(v.avg));
  setT($('prv'), 'prv', dpsN(v.tot));
  setT($('prx'), 'prx', dpsN(v.max));
  const p = Math.round(v.dotP * 100);
  setT($('prp'), 'prp', `直接 ${100 - p}% · 持續 ${p}%`);
  setV(el, 'prb', (1 - v.dotP).toFixed(3));
}

/* ---------- 畫面 ---------- */
/* 篝火：Doom 式火焰，一小張緩衝區每 1/30 秒往上燒一次，幾個火盆共用 */
const FIRE_W = 44,
  FIRE_H = 58;
let FIRE,
  fireT = 0;
function fireInit() {
  const c = document.createElement('canvas');
  c.width = FIRE_W;
  c.height = FIRE_H;
  const g = c.getContext('2d'),
    im = g.createImageData(FIRE_W, FIRE_H),
    cols = [0x2a0606, 0x5a0e08, 0x99200c, 0xd94a10, 0xf47c1a, 0xfbb034, 0xffdf72, 0xfff6c8],
    pal = Array.from({ length: 38 }, (_, i) => {
      if (i < 3) return 0;
      const n = cols[Math.min(cols.length - 1, (((i - 3) / 34) * cols.length) | 0)];
      return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
    });
  FIRE = { c, g, im, px: new Uint32Array(im.data.buffer), pal, heat: new Uint8Array(FIRE_W * FIRE_H), sparks: [] };
}
function fireStep() {
  const { heat, px, pal } = FIRE;
  for (let x = 0; x < FIRE_W; x++) {
    const e = 1 - Math.abs(x - FIRE_W / 2) / (FIRE_W * 0.42);
    heat[(FIRE_H - 1) * FIRE_W + x] = e > 0 ? Math.min(37, e * 46 * (0.76 + Math.random() * 0.4)) : 0;
  }
  for (let y = 0; y < FIRE_H - 1; y++)
    for (let x = 0; x < FIRE_W; x++) {
      const v = heat[(y + 1) * FIRE_W + x],
        r = (Math.random() * 3) | 0,
        j = y * FIRE_W + x - r + 1;
      if (j >= 0) heat[j] = Math.max(0, v - (r & 1) - (Math.abs(x - FIRE_W / 2) > FIRE_W * 0.21 ? 1 : 0));
    }
  for (let i = 0; i < heat.length; i++) px[i] = pal[heat[i]];
  FIRE.g.putImageData(FIRE.im, 0, 0);
}
/* 地板、牆、擺設是烘好的一張圖；洞口是透明的，窗外的山谷畫在後面（慢慢跟著鏡頭動） */
function drawHideout(W, H) {
  const A = HIDE_ART,
    tx = A.TX,
    sky = himg('sky'),
    sc = himg('scene');
  if (sky.naturalWidth) {
    const [cx, cy, rx, ry] = A.win,
      x = cx - rx - 16,
      y = cy - ry - 16,
      w = rx * 2 + 32,
      h = ry * 2 + 32,
      px = (G.cam.x - A.W / 2) * 0.1;
    CX.drawImage(
      sky,
      Math.round((x - px) / tx) + 100,
      Math.round(y / tx),
      Math.round(w / tx),
      Math.round(h / tx),
      x,
      y,
      w,
      h
    );
  }
  if (sc.naturalWidth) {
    const x0 = Math.max(0, Math.floor((G.cam.x - W / 2) / tx) - 2),
      y0 = Math.max(0, Math.floor((G.cam.y - H / 2) / tx) - 2),
      w = Math.min(sc.naturalWidth - x0, Math.ceil(W / tx) + 4),
      h = Math.min(sc.naturalHeight - y0, Math.ceil(H / tx) + 4);
    if (w > 0 && h > 0) CX.drawImage(sc, x0, y0, w, h, x0 * tx, y0 * tx, w * tx, h * tx);
  }
  /* 點亮的神像：烘好的金色版疊上去 */
  for (const s of A.statues)
    if ((S.idols || []).includes(s.z)) {
      const a = ART['idol_' + s.z];
      spr('idol_' + s.z, s.x, s.y + A.idolDy, a[4] * tx, { a: 0.8 + 0.2 * Math.sin(G.t * 1.6 + s.x) });
    }
  if (!FIRE) fireInit();
  if (G.t - fireT > 1 / 30) (fireT = G.t), fireStep();
  for (const f of A.fires)
    CX.drawImage(
      FIRE.c,
      f.x - (FIRE_W * tx * f.s) / 2,
      f.y - FIRE_H * tx * f.s + 8 * f.s,
      FIRE_W * tx * f.s,
      FIRE_H * tx * f.s
    );
  /* 火星 */
  const f0 = A.fires[0],
    sp = FIRE.sparks;
  if (Math.random() < 0.3) sp.push({ x: f0.x + rnd(-14, 14), y: f0.y - 30, t: G.t, v: rnd(30, 80), d: rnd(1, 2.2) });
  CX.fillStyle = '#ffb04a';
  for (const s of sp) {
    const a = G.t - s.t;
    CX.fillRect(Math.round((s.x + Math.sin(a * 5 + s.x) * 8) / tx) * tx, Math.round((s.y - a * s.v) / tx) * tx, tx, tx);
  }
  if (sp.length && G.t - sp[0].t > sp[0].d) sp.shift();
  /* 地圖台的符文（紫，跟傳送門同色） */
  const d = A.props[0];
  CX.fillStyle = `rgba(178,141,255,${0.5 + 0.28 * Math.sin(G.t * 2)})`;
  for (let i = 0; i < 40; i++) {
    const q = (i / 40) * TAU + G.t * 0.25;
    CX.fillRect(
      Math.round((d.x + Math.cos(q) * 34) / tx) * tx,
      Math.round((d.y - 14 + Math.sin(q) * 16) / tx) * tx,
      tx,
      tx
    );
  }
  spr('mat_frag', d.x, d.y - 58 + Math.sin(G.t * 1.6) * 3, 26);
}
/* 人物在擺設後面時，把擺設再疊一次（烘好的圖在所有角色底下） */
function hideFront() {
  const A = HIDE_ART,
    tx = A.TX,
    im = himg('fg');
  if (!im.naturalWidth) return;
  for (const f of A.fg) {
    if (f.by <= P.y) continue;
    const x = f.x * tx,
      y = f.y * tx,
      w = f.w * tx,
      h = f.h * tx;
    if (P.x + 34 < x || P.x - 34 > x + w || P.y + 8 < y || P.y - 74 > y + h) continue;
    CX.drawImage(im, f.x, f.y, f.w, f.h, x, y, w, h);
  }
}
function drawNpc(n) {
  shadow(n.x, n.y, 16);
  spr(n.sp, n.x, n.y, 72, { flip: P.x > n.x });
}
