/* dungeonPOE · 遊戲：存檔結構、場景（藏身處／地圖）、玩家與技能、打擊感（停頓、震動、擊退、閃白、完美閃避）、怪物 AI、王、掉落、主迴圈 */
'use strict';
const TAU = Math.PI * 2;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const angDiff = (a, b) => Math.abs(((a - b + Math.PI * 3) % TAU) - Math.PI);

/* ---------- 存檔 ---------- */
let S;
/* 存檔版本 10 是 0.2.0（重製：0.1 的存檔不沿用） */
function newGame() {
  const s = {
    v: 22,
    name: '女忍者',
    /* 手機的操作方向：p 直立、l 橫向（桌機一律橫向）；舊存檔 migrate 從這裡補 */
    orient: 'p',
    lv: 1,
    xp: 0,
    gold: 0,
    /* 商人賭裝連續幾件沒出稀有（0.2.28） */
    gamN: 0,
    frag: 0,
    maxT: 1,
    tier: 1,
    eq: Object.fromEntries(EQS.map(e => [e.k, null])),
    inv: { w: 12, h: 5, items: [] },
    stash: { w: 12, h: 12, items: [] },
    /* 臨時倉庫頁（0.2.24）：背包滿了撿到的放這裡，只能拿出來 */
    temp: { w: 12, h: 12, items: [] },
    /* 寶石頁（0.2.35）：倉庫的清單式分頁，不限數量 */
    gems: [],
    /* 過濾器（0.2.35）：3 組、每組一串規則（由上往下第一條符合的決定處理方式）＋「其他」預設；見 fltAct */
    filter: { cur: 0, sets: [fltTemplate(), fltEmpty(), fltEmpty()] },
    sfx: 1
  };
  s.eq.weapon = mkItem('w_sword1_0', 1, 0);
  /* 技能欄：單手劍的兩招，左鍵斬擊、右鍵幻影斬；其他到生成寶石拿 */
  s.skills = Array.from({ length: NSLOT }, () => ({ a: null }));
  s.skills[0].a = mkGem('slash');
  s.skills[1].a = mkGem('mirage');
  s.pt = [...PT_START];
  /* 過路點自選的能力值（0.2.42）：點 id → 's'／'d'／'i' */
  s.ptA = {};
  /* 昇華（0.2.25）：藏身處的昇華石碑選，S.at 是點過的點（a_st 是起點） */
  s.asc = null;
  s.at = [];
  s.auras = Array(AURA_SLOTS).fill(null);
  s.charms = [null, null, null];
  s.eq.chest = mkItem('c_leather', 1, 0);
  s.mat = newMat();
  return s;
}

/* ---------- 世界 ---------- */
const G = {
  t: 0,
  hs: 0,
  slow: 0,
  trauma: 0,
  cam: { x: 0, y: 0 },
  mobs: [],
  shots: [],
  fx: [],
  nums: [],
  drops: [],
  tele: [],

  state: 'play',
  scene: 'hide'
};
let P, ST;
function resetWorld(W, H) {
  Object.assign(G, {
    W,
    H,
    mobs: [],
    shots: [],
    fx: [],
    nums: [],
    drops: [],
    tele: [],

    props: [],
    tiles: null,
    mini: null,
    bossOut: 0,
    prog: 0,
    need: 1,
    state: 'play',
    portal: null,
    hs: 0,
    slow: 0,
    trauma: 0,
    kills: 0
  });
}
function newPlayer(x, y) {
  ST = stats();
  const keep = P && P.hp > 0 ? { hp: Math.min(ST.hp, P.hp) } : {};
  P = {
    x,
    y,
    vx: 0,
    vy: 0,
    r: 16,
    hp: ST.hp,
    mp: ST.mp,
    face: -Math.PI / 2,
    act: null,
    roll: null,
    cds: {},
    flask: FLASK.n,
    heal: 0,
    mflask: FLASK.n,
    mheal: 0,
    iuntil: 0,
    critNext: 0,
    hurtT: 0,
    ...keep
  };
  G.cam.x = x;
  G.cam.y = y;
}
/* 藏身處：小房間，地圖台在中間偏上、倉庫箱在左邊 */
function enterHideout() {
  resetWorld(960, 640);
  G.scene = 'hide';
  G.biome = 'temple';
  G.deco = hideDeco();
  G.props = [
    { k: 'device', n: '地圖台', x: 480, y: 210, r: 46 },
    { k: 'gamble', n: '商人', x: 190, y: 190, r: 34 },
    { k: 'stash', n: '倉庫', x: 190, y: 330, r: 34 },
    { k: 'market', n: '市集（之後開放）', x: 770, y: 330, r: 34 },
    { k: 'forge', n: '鍛造台', x: 190, y: 520, r: 34 },
    { k: 'asc', n: '昇華石碑', x: 770, y: 520, r: 30 }
  ];
  newPlayer(480, 470);
  P.hp = ST.hp;
  P.mp = ST.mp;
  skillsEnter();
  hudState();
}
/* 開地圖：花碎片、地圖台前面出現傳送門 */
/* 選了地圖卡 i、階級 t：付碎片（階級＋星級），記住這張卡（進地圖時套用） */
function payMap(t, i) {
  const card = mapCards(S)[i];
  if (t > S.maxT) return hudWarn('先打倒前一階的王'), false;
  if (!card || i >= cardsOpen(S)) return hudWarn('這張卡還沒開放'), false;
  const c = mapCost(t, card.star);
  if (S.frag < c) return hudWarn(`碎片不夠：要 ${c} 個`), false;
  S.frag -= c;
  S.tier = t;
  S.card = card;
  return true;
}
function openMap(t, i) {
  if (!payMap(t, i)) return;
  G.portal = { x: 480, y: 330, to: t };
  save();
  sfx('portal');
  hudWarn(`階級 ${t}・${S.card.star} 星的傳送門開了`);
}
/* 地圖（參考 Chronicon）：一塊一塊 14×14 格的房間拼起來，有岔路也沒關係；
   殺怪累積首領進度，滿了王就出現在附近（怪物總量約是需要的 150～160%） */
const TS = 48,
  CHUNK = 14;
/* 從地圖裡的傳送門直接開下一張（花碎片） */
/* 傳送門：直接開下一張 */
function mapAgain(t, i) {
  if (!payMap(t, i)) return;
  save();
  enterMap(t);
}
function enterMap(t) {
  const CW = 6,
    CHn = 5,
    cols = CW * CHUNK,
    rows = CHn * CHUNK;
  resetWorld(cols * TS, rows * TS);
  G.scene = 'map';
  /* 進過地圖就不再顯示第一次的提示 */
  S.hint0 = 1;
  if ($('hint')) $('hint').hidden = true;
  G.mapT = t;
  /* 地圖卡的詞綴；這一批卡用掉了，下次打開地圖台抽新的 */
  G.mm = mapMods(S.card);
  G.star = (S.card && S.card.star) || 1;
  S.card = null;
  S.cards = null;
  const tiles = (G.tiles = new Uint8Array(cols * rows).fill(1));
  G.cols = cols;
  G.rows = rows;
  const carve = (x0, y0, x1, y1) => {
    for (let y = Math.max(1, y0); y <= Math.min(rows - 2, y1); y++)
      for (let x = Math.max(1, x0); x <= Math.min(cols - 2, x1); x++) tiles[y * cols + x] = 0;
  };
  /* 房間的排法：從左邊一塊開始往外長，偶爾從舊房間分岔 */
  const n = Math.min(CW * CHn - 6, 9 + Math.floor(t / 3)),
    rooms = [{ cx: 0, cy: irnd(1, CHn - 2) }],
    has = new Set([rooms[0].cx + ',' + rooms[0].cy]),
    links = [];
  for (let k = 0; rooms.length < n && k < 500; k++) {
    const from = Math.random() < 0.6 ? rooms[rooms.length - 1] : pick(rooms),
      [dx, dy] = pick([
        [1, 0],
        [1, 0],
        [0, 1],
        [0, -1],
        [-1, 0]
      ]),
      c = { cx: from.cx + dx, cy: from.cy + dy };
    if (c.cx < 0 || c.cy < 0 || c.cx >= CW || c.cy >= CHn || has.has(c.cx + ',' + c.cy)) continue;
    has.add(c.cx + ',' + c.cy);
    rooms.push(c);
    links.push([from, c]);
  }
  /* 挖房間（大小隨機）＋幾根柱子 */
  for (const r of rooms) {
    r.x0 = r.cx * CHUNK + irnd(1, 3);
    r.y0 = r.cy * CHUNK + irnd(1, 3);
    r.x1 = (r.cx + 1) * CHUNK - 1 - irnd(1, 3);
    r.y1 = (r.cy + 1) * CHUNK - 1 - irnd(1, 3);
    carve(r.x0, r.y0, r.x1, r.y1);
    roomShape(tiles, cols, r);
    for (let k = irnd(0, 3); k > 0; k--) {
      const px = irnd(r.x0 + 2, r.x1 - 3),
        py = irnd(r.y0 + 2, r.y1 - 3);
      if (Math.abs(px + 1 - (r.cx * CHUNK + 7)) < 3 || Math.abs(py + 1 - (r.cy * CHUNK + 7)) < 3) continue;
      for (const [ax, ay] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1]
      ])
        tiles[(py + ay) * cols + px + ax] = 1;
    }
  }
  /* 走廊：相連的房間中心對中心，3 格寬；偶爾多開一條成環 */
  const mid = r => [r.cx * CHUNK + 7, r.cy * CHUNK + 7];
  const corridor = (a, b) => {
    const [ax, ay] = mid(a),
      [bx, by] = mid(b);
    carve(Math.min(ax, bx) - 1, Math.min(ay, by) - 1, Math.max(ax, bx) + 1, Math.max(ay, by) + 1);
  };
  for (const [a, b] of links) corridor(a, b);
  for (const a of rooms)
    for (const b of rooms)
      if (a !== b && Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy) === 1 && Math.random() < 0.08) corridor(a, b);
  const st = rooms[0];
  /* 場景只是外觀（biome.js）：每張圖隨機一種 */
  G.biome = pick(Object.keys(BIOMES));
  G.deco = decorate(rooms);
  newPlayer((st.cx * CHUNK + 7) * TS, (st.cy * CHUNK + 7) * TS);
  if (G.mm.pcurse) P.ail = { curse: { k: G.mm.pcurse, v: G.mm.pcv, t: 1e9 } };
  /* 怪物：起點以外的房間各 2～3 群，每 4 群一隻菁英 */
  let pk = 0,
    pts = 0;
  for (const r of rooms.slice(1))
    for (let k = irnd(2, 3) + (roll(MM('pack') * 2) ? 1 : 0); k > 0; k--) {
      const c = floorIn(r);
      if (!c) continue;
      const elite = ++pk % 4 === 0 || Math.random() * 400 < MM('elite');
      pick(PACKS).forEach((m, j) => {
        const p = floorNear(c.x, c.y, 0, 70, 20) || c;
        spawnMob(MOBS[m], p.x, p.y, pk, elite && j === 0);
        pts += elite && j === 0 ? 6 : 1;
      });
    }
  skillsEnter();
  G.need = Math.ceil(pts / rnd(1.5, 1.6));
  G.prog = 0;
  G.rooms = rooms;
  sfx('portal');
  hudState();
}
/* 房間形狀：圓形庭院、切角、一角崩塌（都在房間的長方形裡加牆；
   走廊之後才挖、而且接到房間中心，所以不會堵死） */
function roomShape(tiles, cols, r) {
  const w = r.x1 - r.x0,
    hgt = r.y1 - r.y0,
    k = Math.random(),
    wall = (x, y) => (tiles[y * cols + x] = 1);
  if (k < 0.25 && w >= 9 && hgt >= 9) {
    const cx = (r.x0 + r.x1) / 2,
      cy = (r.y0 + r.y1) / 2,
      rx = w / 2 + 0.6,
      ry = hgt / 2 + 0.6;
    for (let y = r.y0; y <= r.y1; y++)
      for (let x = r.x0; x <= r.x1; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) wall(x, y);
  } else if (k < 0.55) {
    const c = irnd(2, 3);
    for (let i = 0; i < c; i++)
      for (let j = 0; j < c - i; j++) {
        wall(r.x0 + i, r.y0 + j);
        wall(r.x1 - i, r.y0 + j);
        wall(r.x0 + i, r.y1 - j);
        wall(r.x1 - i, r.y1 - j);
      }
  } else if (k < 0.8) {
    const [ax, ay] = pick([
      [r.x0, r.y0],
      [r.x1, r.y0],
      [r.x0, r.y1],
      [r.x1, r.y1]
    ]);
    for (let y = r.y0; y <= r.y1; y++)
      for (let x = r.x0; x <= r.x1; x++) if (Math.hypot(x - ax, y - ay) < 2.2 + Math.random() * 1.6) wall(x, y);
  }
}
const isWall = (x, y) => {
  if (!G.tiles) return false;
  const tx = Math.floor(x / TS),
    ty = Math.floor(y / TS);
  return tx < 0 || ty < 0 || tx >= G.cols || ty >= G.rows || G.tiles[ty * G.cols + tx] === 1;
};
/* 視線：兩點之間沒有牆（每 12 px 檢查一次）；技能、陷阱、爆炸都不能穿牆 */
function los(ax, ay, bx, by) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 12);
  for (let i = 1; i < n; i++) if (isWall(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n)) return false;
  return true;
}
/* 周圍 clear 像素內都不是牆 */
const open = (x, y, c) =>
  !isWall(x, y) && !isWall(x - c, y) && !isWall(x + c, y) && !isWall(x, y - c) && !isWall(x, y + c);
function floorIn(r) {
  for (let k = 0; k < 40; k++) {
    const x = rnd(r.x0 + 1.5, r.x1 - 0.5) * TS,
      y = rnd(r.y0 + 1.5, r.y1 - 0.5) * TS;
    if (open(x, y, 40)) return { x, y };
  }
  return null;
}
function floorNear(x, y, r0, r1, c) {
  for (let k = 0; k < 60; k++) {
    const a = rnd(0, TAU),
      d = rnd(r0, r1),
      p = { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d };
    if (open(p.x, p.y, c)) return p;
  }
  return null;
}
/* 首領進度滿了：王出現在玩家附近 */
function addProg(m) {
  if (m.pack === 99 || m.boss || G.bossOut) return;
  G.prog += m.elite ? 6 : 1;
  if (G.prog < G.need) return;
  G.bossOut = 1;
  const p = floorNear(P.x, P.y, 260, 420, 60) || floorNear(P.x, P.y, 120, 260, 50) || { x: P.x + 1, y: P.y };
  const b = spawnMob((G.lastBoss = bossPick(G.lastBoss)), p.x, p.y, 99, false);
  b.boss = 1;
  b.hp = b.mhp = b.hp * bossHpMul(G.mapT || 1) * (1 + MM('bhp') / 100);
  b.dmg *= BOSS_DMG * (1 + MM('bdmg') / 100);
  mobDef(b, G.mapT || 1);
  b.aggro = 1;
  b.cd = 1.2;
  fx({ k: 'ring', x: p.x, y: p.y, r: 160, dur: 0.6, col: '#ff6b3d' });
  sfx('boss');
  hudWarn(b.D.n + '出現了！');
}
/* 回藏身處（地圖就結束了） */
function goHome() {
  if (G.scene !== 'map') return;
  save();
  enterHideout();
}
function spawnMob(D, x, y, pack, elite) {
  const m = tierMob(G.mapT || 1),
    e = elite ? ELITE : { hp: 1, dmg: 1, sz: 1 };
  const o = {
    D,
    x,
    y,
    vx: 0,
    vy: 0,
    pack,
    elite,
    r: D.r * e.sz,
    sz: D.sz * e.sz,
    hp: D.hp * m.hp * e.hp * MOB_HP * (1 + MM('mhp') / 100),
    dmg: D.dmg * m.dmg * e.dmg * (1 + MM('mdmg') / 100),
    el: D.el || 'phys',
    st: 'idle',
    t: 0,
    cd: rnd(0.3, 1),
    flash: 0,
    sq: 0,
    aggro: 0,
    ph: Math.random() * TAU
  };
  o.mhp = o.hp;
  mobDef(o, G.mapT || 1);
  G.mobs.push(o);
  return o;
}

/* ---------- 輸入 ---------- */
const K = {},
  M = { x: 0, y: 0, L: 0, R: 0 };
let CV, CX;
function mouseWorld() {
  if (TOUCH.on) return touchAim();
  return { x: (M.x - CV.clientWidth / 2) / ZOOM + G.cam.x, y: (M.y - CV.clientHeight / 2) / ZOOM + G.cam.y };
}

/* ---------- 打擊感 ---------- */
/* 只有打倒王才停頓；打中、被打不停（會一頓一頓，掉到 60 fps 以下的感覺） */
function hitstop(s) {
  G.hs = Math.max(G.hs, s);
}
/* 系統開了「減少動態」就不震動 */
function shake(a) {
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  G.trauma = Math.min(1, G.trauma + a);
}
/* txt：直接顯示的文字（材料、學會寶石） */
function num(x, y, v, c, txt) {
  G.nums.push({ x: x + rnd(-8, 8), y, v: Math.round(v), c, t: 0, txt });
}
/* 圓環、電弧、死亡、補血這些舊特效，順便疊一張 pixelfx 的序列圖（圓環留著，看得出範圍） */
const RINGFX = {
  '#ff8a4c': 'boom',
  '#ff6b3d': 'boom',
  '#ff8a5b': 'boom',
  '#8fd6ff': 'frost',
  '#b28dff': 'dark',
  '#c38bff': 'dark',
  '#fff3d6': 'slam'
};
function fx(o) {
  o.t = 0;
  G.fx.push(o);
  if (o.k === 'ring') fxs(RINGFX[o.col || '#fff3d6'], o.x, o.y, o.r);
  else if (o.k === 'zap') fxs('zap', o.x2, o.y2);
  else if (o.k === 'die') fxs('poof', o.x, o.y, o.sz * 0.5);
  else if (o.k === 'heal' || o.k === 'lvup') fxs(o.k, o.x, o.y);
  else if (o.k === 'perfect') fxs('blink', o.x, o.y);
}
/* 播一張序列圖（js/fxsheets.js）；r 是想要的半徑，照原圖的半徑縮放 */
function fxs(n, x, y, r, o) {
  const S = typeof FXS !== 'undefined' && FXS[n];
  if (S) G.fx.push({ k: 'sh', n, x, y, s: r ? r / S.rad : 1, t: 0, dur: S.n / S.fps, ...o });
}
function sparks(x, y, ang, n, col) {
  for (let i = 0; i < n; i++) {
    const a = ang + rnd(-0.9, 0.9),
      s = rnd(160, 420);
    fx({ k: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, dur: rnd(0.18, 0.35), col, sz: rnd(2, 4) });
  }
}

/* ---------- 玩家（技能在 skills.js） ---------- */
function updPlayer(dt) {
  for (const k in P.cds) P.cds[k] = Math.max(0, P.cds[k] - dt);
  /* 冥思的品質：貧魔時回復更多 */
  const lowM = lowMp() ? 1 + 0.4 * (ST.aq.clarity || 0) : 1;
  P.mp = Math.min(ST.mp, P.mp + ST.mpReg * (hasBuff('arcane') ? 1.2 : 1) * lowM * dt);
  if (G.scene === 'map') baseTick(dt);
  if (ST.regen && !ST.vaal) P.hp = Math.min(ST.hp, P.hp + ST.regen * Math.max(0, 1 + MM('pregen') / 100) * dt);
  if (P.heal > 0) {
    const h = Math.min(P.heal, ((ST.hp * FLASK.heal) / FLASK.t) * dt);
    P.heal -= h;
    P.hp = Math.min(ST.hp, P.hp + h);
  }
  if (P.mheal > 0) {
    const h = Math.min(P.mheal, ((ST.mp * FLASK.mp) / FLASK.t) * dt);
    P.mheal -= h;
    P.mp = Math.min(ST.mp, P.mp + h);
  }
  P.hurtT = Math.max(0, P.hurtT - dt);
  if (P.roll) {
    const r = P.roll;
    r.t += dt;
    const sp = (ROLL.dist / ROLL.t) * 1.6 * (1 - r.t / ROLL.t);
    moveBody(P, r.dx * sp * dt, r.dy * sp * dt);
    (P.movT = G.t), (P.stillT = null);
    rollThrough();
    if (r.t >= ROLL.t) P.roll = null;
    return;
  }
  /* 面板打開時不吃移動鍵以外的東西；打字時（輸入框）不動 */
  let mx = (K.d || K.arrowright ? 1 : 0) - (K.a || K.arrowleft ? 1 : 0),
    my = (K.s || K.arrowdown ? 1 : 0) - (K.w || K.arrowup ? 1 : 0);
  if (TOUCH.mv[0] || TOUCH.mv[1]) [mx, my] = TOUCH.mv;
  const ml = Math.hypot(mx, my);
  if (ml) (mx /= ml), (my /= ml);
  P.mv = ml ? 1 : 0;
  /* 移動中／靜止（combat.js 的 moving／still） */
  if (ml) (P.movT = G.t), (P.stillT = null);
  else if (P.stillT == null) P.stillT = G.t;
  P.mdx = mx;
  P.mdy = my;
  const spd = ST.spd * moveMul();
  if (P.act) {
    skillTick(P.act, dt, mx, my);
  } else moveBody(P, mx * spd * dt, my * spd * dt);
  if (P.vx || P.vy) {
    moveBody(P, P.vx * dt, P.vy * dt);
    const f = Math.exp(-dt * 10);
    P.vx *= f;
    P.vy *= f;
    if (Math.abs(P.vx) + Math.abs(P.vy) < 5) P.vx = P.vy = 0;
  }
  if (!P.act) {
    if (M.L) useSlot(0);
    else if (M.R) useSlot(1);
    const w = mouseWorld();
    if (G.scene === 'map' || P.mv)
      P.face =
        P.mv && (G.scene === 'hide' || (TOUCH.on && !TOUCH.sk)) ? Math.atan2(my, mx) : Math.atan2(w.y - P.y, w.x - P.x);
  }
}
/* 移動＋碰撞：地圖是牆（一格一格推出去），藏身處是邊界與擺設；分段走，快速衝刺也不會穿牆 */
function moveBody(o, dx, dy) {
  /* 釘身（combat.js）：不能移動、不能被擊退 */
  if (o.ail && o.ail.pinT > G.t) return;
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (o.r * 0.8)));
  for (let i = 0; i < n; i++) {
    o.x += dx / n;
    o.y += dy / n;
    if (G.tiles) pushTiles(o);
  }
  if (G.tiles) return;
  o.x = clamp(o.x, o.r + 60, G.W - o.r - 60);
  o.y = clamp(o.y, o.r + 100, G.H - o.r - 60);
  for (const k of G.props) {
    const ddx = o.x - k.x,
      ddy = o.y - k.y,
      d = Math.hypot(ddx, ddy),
      min = k.r + o.r;
    if (d < min && d > 0) {
      o.x = k.x + (ddx / d) * min;
      o.y = k.y + (ddy / d) * min;
    }
  }
}
function pushTiles(o) {
  const r = o.r;
  for (let ty = Math.floor((o.y - r) / TS); ty <= Math.floor((o.y + r) / TS); ty++)
    for (let tx = Math.floor((o.x - r) / TS); tx <= Math.floor((o.x + r) / TS); tx++) {
      if (!isWall(tx * TS + 1, ty * TS + 1)) continue;
      const nx = clamp(o.x, tx * TS, tx * TS + TS),
        ny = clamp(o.y, ty * TS, ty * TS + TS),
        ddx = o.x - nx,
        ddy = o.y - ny,
        d = Math.hypot(ddx, ddy);
      if (d >= r) continue;
      if (d > 0) {
        o.x = nx + (ddx / d) * r;
        o.y = ny + (ddy / d) * r;
      } else {
        /* 中心卡進牆裡：往最近的邊推 */
        const l = o.x - tx * TS,
          rr = tx * TS + TS - o.x,
          u = o.y - ty * TS,
          b = ty * TS + TS - o.y,
          mn = Math.min(l, rr, u, b);
        if (mn === l) o.x = tx * TS - r;
        else if (mn === rr) o.x = tx * TS + TS + r;
        else if (mn === u) o.y = ty * TS - r;
        else o.y = ty * TS + TS + r;
      }
    }
}
function doRoll() {
  if (P.roll || G.state !== 'play' || (P.cds.roll || 0) > 0 || pHeavy()) return;
  let dx = P.mdx || 0,
    dy = P.mdy || 0;
  if (!dx && !dy) (dx = Math.cos(P.face)), (dy = Math.sin(P.face));
  P.act = null;
  P.roll = { t: 0, dx, dy };
  P.cds.roll = ROLL.cd * (1 - Math.min(60, ST.rollCd) / 100) + ROLL.t;
  P.rolledT = G.t + ROLL.t + 2;
  /* 戰狼精魂的品質：翻滾時狼撲向滑鼠附近的怪 */
  if (qRoll(20 * (ST.aq.wolfsp || 0))) {
    const w = G.allies.find(x => x.src === 'aura'),
      mw = mouseWorld(),
      t = mobNear(mw.x, mw.y, 200);
    if (w && t) (w.x = t.x), (w.y = t.y + t.r), (w.cd = 0);
  }
  P.iuntil = G.t + ROLL.iframe;
  sfx('roll');
}
/* mana：喝魔力藥劑（2）回魔力，不然喝生命藥劑（1）回生命；藥劑效果的詞綴與地圖詞兩種都算 */
function drinkFlask(mana) {
  if (G.scene !== 'map' || G.state !== 'play') return;
  const k = mana ? 'mflask' : 'flask';
  if (P[k] < 1) return hudWarn((mana ? '魔力' : '生命') + '藥劑用完了：殺怪會補');
  P[k] -= 1;
  const v = 1 + (ST.flask + MM('pflask')) / 100;
  if (mana) P.mheal += ST.mp * FLASK.mp * v;
  else P.heal += ST.hp * FLASK.heal * v;
  fx({ k: 'heal', x: P.x, y: P.y, dur: 0.5 });
  sfx('drink');
}
/* 受傷：完美閃避 → 無敵 → 閃避 → 格擋 → 偏斜 → 減傷（護甲、抗性、適應）→ 吸收（格擋值 → 守護）→ 能量護盾 → 生命（公式在 combat.js 的 hurtCalc） */
/* noEv：躲不掉的（王的紅光大招、地上的陷阱）；其他擊中都可以被閃避、格擋 */
function hurtPlayer(d, src, el = 'phys', noEv) {
  if (G.state !== 'play') return;
  if (P.roll && P.roll.t < perfWin()) {
    if (!G.slow) {
      G.slow = ROLL.slow;
      P.critNext = 1;
      onPerfect();
      metaEvent('perfect');
      fx({ k: 'perfect', x: P.x, y: P.y, dur: 0.6 });
      num(P.x, P.y - 70, 0, 'perfect');
      sfx('perfect');
    }
    return;
  }
  if (G.t < P.iuntil) return;
  const r = hurtCalc(d, src, el, noEv);
  if (r.ev) return num(P.x, P.y - 60, 0, 'ev');
  if (r.parry) return;
  if (r.block) {
    metaEvent('block');
    num(P.x, P.y - 60, 0, 'block');
    fxs('block', P.x, P.y);
    sfx('block');
    return;
  }
  d = r.d;
  evMark('hurt');
  if (r.defl) num(P.x, P.y - 60, 0, 'ev', '偏斜');
  /* 荊棘反擊（0.2.42）：近戰怪擊中你時反彈荊棘傷害，同一隻怪 0.3 秒最多一次 */
  thornHit(src);
  /* 暈眩（0.2.42）：僵直看每一下的傷害；沉重暈眩只有王的紅光大招累積 */
  playerStagger(d);
  const boss = src && src.D ? src : src && src.src && src.src.D ? src.src : null;
  if (noEv && boss && boss.boss) playerHeavy(d, el);
  /* 流順之風：被擊中清空 */
  P.tail = 0;
  /* 召喚魔像：站在它旁邊受到的傷害少 20%；品質：有機率替你擋下這一下 */
  if (G.allies.some(w => w.src === 'golem' && dist(w, P) < 200)) {
    if (qRoll(20 * (ST.aq.golem || 0))) return num(P.x, P.y - 60, 0, 'block', '魔像');
    d *= 0.8;
  }
  /* 熊掌的品質：熊形態被擊中得盛怒 */
  if (P.form === 'bear' && qRoll(20 * (P.bearQ || 0)))
    (P.rage = Math.min(rageCap(), (P.rage || 0) + 1)), (P.rageT = G.t);
  if (d > 0) recoupAdd(d);
  d = esAbsorb(d);
  /* 心靈凌駕（基石）：40% 先扣魔力 */
  if (ST.mom && d > 0) {
    const t = Math.min(P.mp, d * 0.4);
    (P.mp -= t), (d -= t);
  }
  if (d <= 0) return;
  /* 死亡卡要寫死因 */
  const who = src && src.D ? src : src && src.src && src.src.D ? src.src : null;
  P.lastHit = { n: who ? (who.elite ? '菁英 ' : '') + who.D.n : '環境傷害', el, d: Math.round(d) };
  P.hp -= d;
  lifeLost();
  savageHit(d);
  P.hurtT = 0.35;
  num(P.x, P.y - 60, d, 'hurt');
  sfx('hurt');
  /* 不動如山（基石）；昇華的不動如山：格擋值還在時不會被擊退 */
  if (src && !ST.stand && !(ST.unmov && bvUp())) {
    const a = angTo(src, P);
    P.vx += Math.cos(a) * 160;
    P.vy += Math.sin(a) * 160;
  }
  if (P.hp <= 0) die();
}
/* 死亡（PoE 式）：地圖失敗、扣這一級 10% 經驗（不降級），裝備不會掉 */
function die() {
  /* 已經倒下：持續傷害還在跑時不要再扣一次經驗、蓋掉死因 */
  if (G.state === 'dead') return;
  P.hp = 0;
  G.state = 'dead';
  P.act = P.roll = null;
  G.lostXp = Math.round(Math.min(S.xp, xpNeed(S.lv) * 0.1));
  S.xp -= G.lostXp;
  save();
  sfx('die');
  hudState();
}

/* ---------- 打怪（打中 hitMob 在 skills.js） ---------- */
function aggroPack(m) {
  if (m.aggro) return;
  for (const o of G.mobs) if (o.pack === m.pack) o.aggro = 1;
}
function killMob(m) {
  m.hp = 0;
  const t = G.mapT;
  fx({ k: 'die', x: m.x, y: m.y, sp: m.D.sp, sz: m.sz, dur: 0.45, flip: m.x > P.x });
  sparks(m.x, m.y - m.sz * 0.4, rnd(0, TAU), 14, m.boss ? '#ff6b3d' : '#c9b8a8');
  mobGround(m);
  /* 召喚出來的小怪：不給經驗、不掉落、不算擊殺 */
  if (m.summoned) return;
  G.kills++;
  const fk = FLASK.perKill * (m.elite ? 3 : m.boss ? 10 : 1);
  P.flask = Math.min(FLASK.n, P.flask + fk);
  P.mflask = Math.min(FLASK.n, P.mflask + fk);
  gainXp(Math.max(1, Math.round(m.D.xp * tierMul(t).hp * (m.elite ? 4 : 1) * xpMul(S.lv, mobLv(t)))));
  /* 材料：粉、靈魂自動吸收；碎片直接進材料頁，跳字提醒 */
  killMat(m, t).forEach((n, i) => num(m.x, m.y - m.sz * 0.6 - i * 18, 0, 'mat', '+' + n));
  /* 地圖卡的材料加成：多拿一次 */
  if (roll(MM('mat'))) killMat(m, t);
  /* 掉落：裝備、金幣、地圖碎片（越高階越多） */
  /* 地圖卡：物品數量、稀有度 */
  const q = 1 + MM('qty') / 100,
    nItems = m.boss ? Math.round(4 * q) : m.elite ? Math.round(irnd(1, 2) * q) : Math.random() < 0.13 * q ? 1 : 0;
  for (let i = 0; i < nItems; i++) {
    const it = dropItem(tierIlvl(t), (m.boss ? 0.8 : m.elite ? 0.4 : 0) + MM('rar') / 100);
    if (m.boss && i === 0 && it.r < 2) Object.assign(it, mkItem(it.b, it.L, 2), { id: it.id });
    dropAt(m.x, m.y, { it });
  }
  if (Math.random() < (m.boss || m.elite ? 1 : 0.4))
    dropAt(m.x, m.y, { gold: Math.round(rnd(2, 6) * (1 + t * 0.5) * (m.boss ? 12 : m.elite ? 3 : 1)) });
  const fr = m.boss
    ? 2 + Math.floor(t / 2)
    : m.elite
      ? Math.random() < 0.6
        ? 1
        : 0
      : Math.random() < 0.03 + t * 0.003
        ? 1
        : 0;
  if (fr) dropAt(m.x, m.y, { frag: fr });
  /* 護符：小怪 1%、菁英 15%、王 50% */
  if (Math.random() < (m.boss ? 0.5 : m.elite ? 0.15 : 0.01)) dropAt(m.x, m.y, { it: dropCharm() });
  onKillBase(m);
  onKill();
  addProg(m);
  if (m.boss) bossDown(m);
  /* 分裂：分成 2 隻小的（不再分、不算首領進度） */
  if (m.D.split && !m.small)
    for (let i = 0; i < 2; i++) {
      const o = spawnMob(m.D, m.x + rnd(-24, 24), m.y + rnd(-24, 24), 99, false);
      o.small = o.aggro = 1;
      o.r *= 0.65;
      o.sz *= 0.65;
      o.hp = o.mhp = o.hp * 0.35;
      o.dmg *= 0.6;
    }
}
function bossDown(m) {
  const first = G.mapT === S.maxT && S.maxT < TMAX;
  if (first) S.maxT++;
  if (G.mapT === TMAX && !S.t16) (S.t16 = 1), (G.first = 1);
  G.portal = { ...(floorNear(m.x, m.y, 150, 230, 40) || { x: m.x, y: m.y }), home: 1 };
  G.first = G.first || first;
  hitstop(0.25);
  G.slow = 0.9;
  sfx('boss');
  hudWarn(first ? `打倒${m.D.n}！開放階級 ${S.maxT}。撿完走進藍色傳送門` : `打倒${m.D.n}！撿完走進藍色傳送門`);
  save();
}
function dropAt(x, y, o) {
  const a = rnd(0, TAU),
    s = rnd(30, 90);
  Object.assign(o, { x: x + Math.cos(a) * s, y: y + Math.sin(a) * s, sx: x, sy: y, t: 0 });
  if (!open(o.x, o.y, 10)) (o.x = x), (o.y = y);
  G.drops.push(o);
  if (o.it && o.it.r === 2) sfx('rare');
}
function gainXp(v) {
  if (S.lv >= LVMAX) return;
  S.xp += v;
  while (S.xp >= xpNeed(S.lv) && S.lv < LVMAX) {
    S.xp -= xpNeed(S.lv);
    S.lv++;
    ST = stats();
    P.hp = ST.hp;
    P.mp = ST.mp;
    fx({ k: 'lvup', x: P.x, y: P.y, dur: 1.1 });
    fx({ k: 'ring', x: P.x, y: P.y, r: 120, col: '#ffd166', dur: 0.6 });
    num(P.x, P.y - 90, S.lv, 'lv');
    hudWarn(`升級！Lv ${S.lv}・天賦點 +1`);
    sfx('lvup');
  }
}
/* ---------- 物品過濾器（0.2.35） ----------
   一組＝{ rules: [規則…], def: { act, col } }；規則＝{ on, c: 條件（有這個欄位才算用）, act, col }
   act：pick 自動撿、show 顯示、hl 醒目（col 是 FLT_COL 的顏色）、hide 隱藏；寶石與通貨不進過濾器（寶石一律顯示、金幣碎片自動吸收） */
const FLT_COL = ['#ff5d5d', '#ffa24a', '#ffe066', '#6ee06e', '#5ad1ff', '#d07aff'];
const FLT_ACT = { pick: '自動撿', show: '顯示', hl: '醒目', hide: '隱藏' };
const FLT_KIND = [
  ['weapon', '武器'],
  ['armor', '防具'],
  ['acc', '飾品'],
  ['charm', '護符']
];
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
const fltEmpty = () => ({ rules: [], def: { act: 'show', col: 0 } });
/* 新手範本：稀有自動撿，其他顯示 */
const fltTemplate = () => ({ rules: [{ on: 1, c: { rar: [2] }, act: 'pick', col: 0 }], def: { act: 'show', col: 0 } });
/* 詞綴勾選清單：同名的詞（例如兩種「物理傷害提高」）合成一項；id 是第一個 key */
const FLT_AFF = (() => {
  const L = [],
    by = {};
  for (const k in AFF) {
    const n = AFF[k].n
      .replace(/\s*\{\}%?/g, '')
      .replace(/\s*\+$/, '')
      .replace(/^附加\s*/, '附加');
    (by[n] || (by[n] = { id: k, n, keys: [] })).keys.push(k);
    if (by[n].keys.length === 1) L.push(by[n]);
  }
  return L;
})();
const fltSet = () => S.filter.sets[S.filter.cur];
let FLTV = 0; /* 規則改了就加一，掉落物的結果要重算 */
function ruleHit(r, it) {
  const c = r.c;
  if (c.kind && !c.kind.includes(it.charm ? 'charm' : KIND_GRP[baseOf(it).k])) return false;
  if (c.rar && !c.rar.includes(it.r || 0)) return false;
  if (c.aff) {
    const ks = new Set(FLT_AFF.filter(g => c.aff.ks.includes(g.id)).flatMap(g => g.keys));
    if ((it.a || []).filter(a => ks.has(a.k)).length < c.aff.n) return false;
  }
  if (c.so != null && (it.so || 0) < c.so) return false;
  if (c.q != null && (it.q || 0) * 100 < c.q) return false;
  if (c.pot != null && (it.pot || 0) < c.pot) return false;
  if (c.L != null && (it.L || 0) < c.L) return false;
  return true;
}
/* 這件東西怎麼處理：{ act, col } */
function fltAct(it) {
  if (it.gem) return { act: 'show', col: 0 };
  const s = fltSet();
  return s.rules.find(r => r.on && ruleHit(r, it)) || s.def;
}
/* 地上的掉落物：自己丟的一律顯示；結果記在 d 上，規則改了才重算 */
function dropFlt(d) {
  if (d.nopick) return { act: 'show', col: 0 };
  if (d.fv !== FLTV) (d.fv = FLTV), (d.fa = fltAct(d.it));
  return d.fa;
}
/* 撿起來：金幣、碎片直接加；裝備放進格子背包，背包滿了放臨時倉庫頁 */
function pickup(d) {
  if (d.gold) {
    S.gold += d.gold;
    num(d.x, d.y - 20, d.gold, 'gold');
    sfx('coin');
  } else if (d.frag) {
    S.frag += d.frag;
    num(d.x, d.y - 20, d.frag, 'frag');
    sfx('pick');
  } else {
    if (!gridAuto(S.inv, d.it)) {
      if (!gridAuto(S.temp, d.it)) return (d.full = 1), hudWarn('背包和臨時倉庫都滿了：回藏身處整理');
      hudWarn('背包滿了：放進臨時倉庫（回藏身處在倉庫拿）');
    }
    sfx('pick');
    hudInv();
  }
  G.drops.splice(G.drops.indexOf(d), 1);
}
function pickNearest() {
  let best = null,
    bd = 110;
  for (const d of G.drops)
    if (d.it && dropFlt(d).act !== 'hide' && dist(P, d) < bd) {
      bd = dist(P, d);
      best = d;
    }
  if (best) pickup(best);
  return !!best;
}
/* 藏身處的東西：走到旁邊按 F 或點一下 */
function nearProp() {
  return (G.props || []).find(p => dist(P, p) < p.r + 70);
}
function useProp(p) {
  if (!p) return false;
  if (dist(P, p) > p.r + 90) return hudWarn('走近一點'), true;
  if (p.k === 'device') openPanel('device');
  else if (p.k === 'stash') openPanel('stash');
  else if (p.k === 'forge') openPanel('craft');
  else if (p.k === 'asc') openPanel('asc');
  else if (p.k === 'gamble') openPanel('shop');
  else hudWarn('市集之後開放');
  return true;
}
function interact() {
  if (G.scene === 'hide') {
    if (G.portal && dist(P, G.portal) < 80) return enterMap(G.portal.to);
    if (useProp(nearProp())) return;
  }
  pickNearest();
}

/* ---------- 怪物 AI ---------- */
/* 怪物找路（0.2.7）：從玩家的格子做 BFS（每 0.25 秒一次），看不到玩家的怪沿著距離變小的格子走，不會卡在房間外 */
const DIR8 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1]
];
function flowUpd() {
  if (!G.tiles || G.flowT > G.t) return;
  G.flowT = G.t + 0.25;
  const C = G.cols,
    R = G.rows,
    d = G.flow && G.flow.length === C * R ? G.flow.fill(-1) : (G.flow = new Int16Array(C * R).fill(-1)),
    s = Math.floor(P.y / TS) * C + Math.floor(P.x / TS),
    q = new Int32Array(C * R);
  if (s < 0 || s >= C * R) return;
  let h = 0,
    n = 0;
  d[s] = 0;
  q[n++] = s;
  while (h < n) {
    const i = q[h++],
      x = i % C,
      y = (i / C) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + DIR8[k][0],
        ny = y + DIR8[k][1],
        j = ny * C + nx;
      if (nx < 0 || ny < 0 || nx >= C || ny >= R || d[j] >= 0 || G.tiles[j] === 1) continue;
      d[j] = d[i] + 1;
      q[n++] = j;
    }
  }
}
/* 往距離最小的鄰格走（斜走要兩邊都不是牆，免得卡在牆角） */
function flowAng(m) {
  const C = G.cols,
    x = Math.floor(m.x / TS),
    y = Math.floor(m.y / TS),
    f = G.flow,
    at = (cx, cy) => (cx < 0 || cy < 0 || cx >= C || cy >= G.rows ? -1 : f[cy * C + cx]);
  let bx = 0,
    by = 0,
    bv = 1e9;
  for (const [dx, dy] of DIR8) {
    const v = at(x + dx, y + dy);
    if (v < 0 || v >= bv || (dx && dy && (at(x + dx, y) < 0 || at(x, y + dy) < 0))) continue;
    (bv = v), (bx = x + dx), (by = y + dy);
  }
  return bv < 1e9 ? Math.atan2((by + 0.5) * TS - m.y, (bx + 0.5) * TS - m.x) : angTo(m, P);
}
function updMobs(dt) {
  flowUpd();
  for (const m of G.mobs) {
    if (m.hp <= 0) continue;
    m.flash = Math.max(0, m.flash - dt);
    m.sq = Math.max(0, m.sq - dt * 6);
    m.ph += dt * 8;
    if (m.arrow) {
      m.hp = G.t < m.until ? m.mhp : 0;
      continue;
    }
    if (mobTick(m, dt)) continue;
    if (m.vx || m.vy) {
      moveBody(m, m.vx * dt, m.vy * dt);
      const f = Math.exp(-dt * 9);
      m.vx *= f;
      m.vy *= f;
      if (Math.abs(m.vx) + Math.abs(m.vy) < 4) m.vx = m.vy = 0;
    }
    const dP = dist(m, P);
    if (!m.aggro) {
      if (dP < (m.boss ? 520 : 440)) aggroPack(m);
      else continue;
    }
    if (G.state !== 'play') continue;
    /* 怒號地面的猛攻：技能速度 +20%（移動速度在 mobSpd） */
    m.cd -= dt * (m.ail.howl > G.t ? 1.2 : 1);
    if (m.boss) {
      bossAI(m, dt, dP);
      continue;
    }
    const D = m.D;
    if (m.st === 'idle' || m.st === 'move') {
      m.st = 'move';
      /* 看得到玩家就直走，看不到就照找路的方向繞過去 */
      const see = los(m.x, m.y, P.x, P.y),
        a = see ? angTo(m, P) : flowAng(m);
      let want = 1;
      if (!see) want = 1;
      else if (FAR_AI[D.ai]) want = dP > 300 ? 1 : dP < 200 ? -1 : 0;
      else if (dP < D.reach * (D.ai === 'lunge' ? 0.9 : 0.85)) want = 0;
      let vx = Math.cos(a) * want,
        vy = Math.sin(a) * want;
      for (const o of G.mobs) {
        if (o === m || o.hp <= 0 || o.arrow) continue;
        const dd = dist(m, o),
          mn = m.r + o.r + 6;
        if (dd < mn && dd > 0) {
          vx += ((m.x - o.x) / dd) * 0.9;
          vy += ((m.y - o.y) / dd) * 0.9;
        }
      }
      moveBody(m, vx * D.spd * mobSpd(m) * dt, vy * D.spd * mobSpd(m) * dt);
      m.mv = want !== 0;
      if (m.cd <= 0 && dP < D.reach + P.r + 4 && see) {
        m.st = 'wind';
        m.t = D.wind * (m.elite ? 0.85 : 1);
        m.ang = angTo(m, P);
      }
    } else if (m.st === 'wind') {
      m.t -= dt;
      if (m.t <= 0) mobStrike(m);
    } else if (m.st === 'dash') {
      m.t -= dt;
      moveBody(m, Math.cos(m.ang) * 900 * dt, Math.sin(m.ang) * 900 * dt);
      if (!m.hitP && dist(m, P) < m.r + P.r + 6) {
        m.hitP = 1;
        hurtPlayer(m.dmg, m, m.el);
      }
      if (m.t <= 0) recover(m, 0.4);
    } else if (m.st === 'rec') {
      m.t -= dt;
      if (m.t <= 0) m.st = 'move';
    }
  }
  G.mobs = G.mobs.filter(m => m.hp > 0);
}
function recover(m, t) {
  m.st = 'rec';
  m.t = t;
  m.cd = m.D.cd * rnd(0.85, 1.15);
}
function mobStrike(m) {
  const D = m.D;
  if (D.ai === 'melee') {
    fx({ k: 'claw', x: m.x, y: m.y, ang: m.ang, r: D.reach + 10, dur: 0.15 });
    if (dist(m, P) < D.reach + P.r + 6 && angDiff(angTo(m, P), m.ang) < 1.3) hurtPlayer(m.dmg, m, m.el);
    recover(m, 0.3);
  } else if (D.ai === 'lunge') {
    m.st = 'dash';
    m.t = (D.reach / 900) * 1.05;
    m.hitP = 0;
  } else if (D.ai === 'ranged' || D.ai === 'fan') {
    const grp = {};
    for (const da of D.ai === 'fan' ? [-0.3, 0, 0.3] : [0]) foeShot(m, m.ang + da, 330, m.dmg, grp);
    recover(m, 0.3);
  } else if (D.ai === 'cast') {
    G.tele.push({ x: P.x, y: P.y, r: 70, t: 0, dur: 0.8, dmg: m.dmg, src: m, el: m.el });
    recover(m, 0.4);
  } else if (D.ai === 'summon') {
    if (G.mobs.filter(o => o.owner === m && o.hp > 0).length < 4)
      for (let i = 0; i < 2; i++) {
        const o = spawnMob(MOBS[D.call], m.x + rnd(-60, 60), m.y + rnd(-60, 60), 99, false);
        o.owner = m;
        o.summoned = o.aggro = 1;
      }
    fx({ k: 'ring', x: m.x, y: m.y, r: 70, dur: 0.35, col: '#b28dff' });
    recover(m, 0.5);
  } else if (D.ai === 'bomb') {
    /* 自爆：死掉但不給經驗與掉寶，只算首領進度 */
    fx({ k: 'ring', x: m.x, y: m.y, r: D.boom, dur: 0.35, col: '#ff8a5b' });
    sfx('slam');
    if (dist(m, P) < D.boom + P.r) hurtPlayer(m.dmg, m, m.el, true);
    m.hp = 0;
    fx({ k: 'die', x: m.x, y: m.y, sp: D.sp, sz: m.sz, dur: 0.45, flip: m.x > P.x });
    addProg(m);
  } else if (D.ai === 'slam') {
    const x = m.x + Math.cos(m.ang) * 55,
      y = m.y + Math.sin(m.ang) * 55;
    fx({ k: 'ring', x, y, r: 95, dur: 0.3, col: '#ff8a5b' });
    if (Math.hypot(P.x - x, P.y - y) < 95 + P.r) hurtPlayer(m.dmg, m, m.el, true);
    recover(m, 0.6);
  }
}
/* 怪物的投射物 */
function foeShot(m, ang, spd, dmg, grp) {
  G.shots.push({
    foe: 1,
    x: m.x,
    y: m.y - m.sz * 0.5,
    vx: Math.cos(ang) * spd,
    vy: Math.sin(ang) * spd,
    r: 9,
    dmg,
    el: m.el,
    life: 1.6,
    src: m,
    grp
  });
}
/* 會跟玩家保持距離的小怪 */
const FAR_AI = { ranged: 1, fan: 1, cast: 1, summon: 1 };
/* 王的招：近身能用的、遠的能用的（每隻王只會 D.pat 裡的）；彈幕環 NOVA_N 發、留 NOVA_GAP 發的缺口 */
const BOSS_NEAR = { swipe: 1, slam: 1, nova: 1, blink: 1 },
  BOSS_FAR = { charge: 1, slam: 1, summon: 1, nova: 1, line: 1, blink: 1 },
  BOSS_WIND = { swipe: 0.5, charge: 0.75, slam: 0.2, summon: 0.6, nova: 0.8, line: 0.3, blink: 0.6 },
  NOVA_N = 16,
  NOVA_GAP = 3;
const novaAng = (m, i) => m.gap + ((i + NOVA_GAP) * TAU) / NOVA_N;
/* 王：追一下，然後照自己會的招出手（揮爪、衝撞、砸地、叫小怪、彈幕環、連爆線、瞬移斬）；半血以下更快 */
function bossAI(m, dt, dP) {
  const rage = m.hp < m.mhp / 2 ? 0.72 : 1;
  if (rage < 1 && !m.raged) {
    m.raged = 1;
    hudWarn(m.D.n + '發狂了！');
  }
  if (m.st === 'idle' || m.st === 'move') {
    m.st = 'move';
    const see = los(m.x, m.y, P.x, P.y),
      a = see ? angTo(m, P) : flowAng(m);
    if (dP > 90 || !see) {
      const cs = mobSpd(m);
      moveBody(m, Math.cos(a) * m.D.spd * cs * (rage < 1 ? 1.25 : 1) * dt, Math.sin(a) * m.D.spd * cs * dt);
    }
    m.mv = dP > 90;
    if (m.cd <= 0 && see) {
      const ok = dP < 140 ? BOSS_NEAR : BOSS_FAR,
        l = m.D.pat.filter(k => ok[k]);
      m.pat = pick(l.length ? l : m.D.pat);
      m.st = 'wind';
      m.ang = angTo(m, P);
      m.t = BOSS_WIND[m.pat] * rage;
      if (m.pat === 'nova') m.gap = rnd(0, TAU);
      if (m.pat === 'line')
        for (let i = 0; i < 6; i++)
          G.tele.push({
            x: m.x + Math.cos(m.ang) * 85 * (i + 1),
            y: m.y + Math.sin(m.ang) * 85 * (i + 1),
            r: 62,
            t: 0,
            dur: (0.6 + i * 0.12) * rage,
            dmg: m.dmg,
            src: m,
            el: m.el
          });
      if (m.pat === 'blink') {
        /* 瞬移到玩家背後（背後是牆就落在玩家旁邊） */
        const a = angTo(m, P);
        m.tx = P.x + Math.cos(a) * 90;
        m.ty = P.y + Math.sin(a) * 90;
        if (isWall(m.tx, m.ty)) (m.tx = P.x + 1), (m.ty = P.y);
      }
      if (m.pat === 'slam')
        for (let i = 0; i < 3; i++)
          G.tele.push({
            x: P.x + (i ? rnd(-130, 130) : 0),
            y: P.y + (i ? rnd(-130, 130) : 0),
            r: 95,
            t: 0,
            dur: (0.75 + i * 0.28) * rage,
            dmg: m.dmg * 1.1,
            src: m,
            el: m.el
          });
    }
  } else if (m.st === 'wind') {
    m.t -= dt;
    if (m.pat === 'charge' && m.t > 0.25) m.ang = angTo(m, P);
    if (m.t <= 0) {
      if (m.pat === 'swipe') {
        fx({ k: 'claw', x: m.x, y: m.y, ang: m.ang, r: 150, dur: 0.18, big: 1 });
        if (dP < 150 + P.r && angDiff(angTo(m, P), m.ang) < 1.4) hurtPlayer(m.dmg * 1.2, m, m.el);
        bossRec(m, 0.5, rage);
      } else if (m.pat === 'charge') {
        m.st = 'dash';
        m.t = 0.42;
        m.hitP = 0;
      } else if (m.pat === 'summon') {
        for (let i = 0; i < 4; i++) {
          const o = spawnMob(MOBS[m.D.call], m.x + rnd(-90, 90), m.y + rnd(-90, 90), 99, false);
          o.summoned = o.aggro = 1;
        }
        fx({ k: 'ring', x: m.x, y: m.y, r: 120, dur: 0.35, col: '#b28dff' });
        bossRec(m, 0.6, rage);
      } else if (m.pat === 'nova') {
        const grp = {};
        for (let i = 0; i < NOVA_N - NOVA_GAP; i++) foeShot(m, novaAng(m, i), 260, m.dmg * 0.8, grp);
        bossRec(m, 0.7, rage);
      } else if (m.pat === 'blink') {
        fx({ k: 'ring', x: m.x, y: m.y, r: 70, dur: 0.3, col: '#b28dff' });
        if (!(m.ail.pinT > G.t)) (m.x = m.tx), (m.y = m.ty);
        fx({ k: 'ring', x: m.x, y: m.y, r: 70, dur: 0.3, col: '#b28dff' });
        /* 落地接一下揮爪（畫面照揮爪的預警） */
        m.pat = 'swipe';
        m.ang = angTo(m, P);
        m.t = 0.4 * rage;
      } else bossRec(m, 0.9, rage);
    }
  } else if (m.st === 'dash') {
    m.t -= dt;
    moveBody(m, Math.cos(m.ang) * 1150 * dt, Math.sin(m.ang) * 1150 * dt);
    if (Math.random() < 0.7) fx({ k: 'dust', x: m.x + rnd(-20, 20), y: m.y + rnd(-6, 6), dur: 0.4 });
    if (!m.hitP && dist(m, P) < m.r + P.r + 10) {
      m.hitP = 1;
      hurtPlayer(m.dmg * 1.4, m, m.el);
    }
    if (m.t <= 0) {
      bossRec(m, 0.55, rage);
    }
  } else if (m.st === 'rec') {
    m.t -= dt;
    if (m.t <= 0) m.st = 'move';
  }
}
function bossRec(m, t, rage) {
  m.st = 'rec';
  m.t = t * rage;
  m.cd = rnd(0.5, 1.1) * rage;
}

/* ---------- 投射物、預警圈 ---------- */
function updShots(dt) {
  for (const s of G.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    /* 盾牌投擲飛回來：追著玩家，碰到就收回 */
    if (s.ret) {
      const g = Math.atan2(P.y - 20 - s.y, P.x - s.x);
      (s.vx = Math.cos(g) * 900), (s.vy = Math.sin(g) * 900), (s.life = 1);
      if (Math.hypot(P.x - s.x, P.y - 20 - s.y) < 30) s.life = 0;
      /* 擲斧的品質：回程再打一次 */
      if (s.back)
        for (const m of G.mobs) {
          if (m.hp <= 0 || (s.hitB = s.hitB || new Set()).has(m)) continue;
          if (Math.hypot(m.x - s.x, m.y - m.sz * 0.4 - s.y) < m.r + s.r + 6)
            s.hitB.add(m), hitMob(m, s.c, g, 60 * s.c.kb, { a: s.a, from: s });
        }
      continue;
    }
    if ((s.bounce != null || s.back) && s.life <= 0) (s.ret = 1), (s.life = 1);
    if (s.foe) {
      if (Math.hypot(P.x - s.x, P.y - 20 - s.y) < P.r + s.r) {
        /* 同一波（扇形、彈幕環）只打中一次 */
        if (!s.grp || !s.grp.hit) hurtPlayer(s.dmg, s, s.el);
        if (s.grp) s.grp.hit = 1;
        s.life = 0;
      }
    } else if (!s.noHit)
      for (const m of G.mobs) {
        if (m.hp <= 0 || s.hit.has(m)) continue;
        if (Math.hypot(m.x - s.x, m.y - m.sz * 0.4 - s.y) < m.r + s.r + 6) {
          s.hit.add(m);
          if (s.boom) {
            s.x = m.x;
            s.y = m.y - 18;
            s.life = 0;
            break;
          }
          /* 冰霜彈：越遠越弱（飛到底剩 40%） */
          hitMob(m, s.c, s.ang, 120 * s.c.kb, {
            a: s.a,
            mult: s.decay ? s.c.mult * (0.4 + 0.6 * (s.life / s.life0)) : 0,
            from: s
          });
          if (s.hitfx) fxs(s.hitfx, m.x, m.y - m.sz * 0.4, s.hfr || 40);
          /* 品質的擊中效果：回傳 true＝這一下不消耗穿透 */
          if (s.onHit && s.onHit(s, m) === true) continue;
          /* 盾牌投擲：跳到 320 內最近、還沒打過的怪；跳完或沒有就飛回來 */
          if (s.bounce != null) {
            const n = G.mobs
              .filter(o => o.hp > 0 && !s.hit.has(o) && dist(o, m) < 320)
              .sort((x, y) => dist(x, m) - dist(y, m))[0];
            if (s.bounce-- > 0 && n) {
              const g = Math.atan2(n.y - n.sz * 0.4 - s.y, n.x - s.x),
                v = Math.hypot(s.vx, s.vy);
              (s.vx = Math.cos(g) * v), (s.vy = Math.sin(g) * v), (s.ang = g), (s.life = 0.7);
            } else s.ret = 1;
            break;
          }
          if (s.pierce-- <= 0) {
            if (s.back) {
              (s.ret = 1), (s.life = 1);
              break;
            }
            /* 穿透輔助的品質：最後一次穿透分裂 */
            if (!s.noFork && qRoll(s.c.pSplit || 0)) shotFork(s, s.ang - 0.35), shotFork(s, s.ang + 0.35);
            /* 連鎖（0.2.25）：穿透用完後彈向 260 內最近、還沒打過、看得到的敵人 */
            const n =
              s.chain > 0 &&
              G.mobs
                .filter(o => o.hp > 0 && !s.hit.has(o) && dist(o, m) < 260 && los(m.x, m.y, o.x, o.y))
                .sort((x, y) => dist(x, m) - dist(y, m))[0];
            if (n) {
              const g = Math.atan2(n.y - n.sz * 0.4 - s.y, n.x - s.x),
                v = Math.hypot(s.vx, s.vy);
              (s.vx = Math.cos(g) * v), (s.vy = Math.sin(g) * v), (s.ang = g), (s.life = Math.max(s.life, 0.6));
              s.chain--;
              s.pierce = 0;
            } else s.life = 0;
            break;
          }
        }
      }
    if (s.boom && s.life <= 0) boom(s);
    if (isWall(s.x, s.y) && (s.bounce != null || s.back)) (s.ret = 1), (s.life = 1);
    else if (isWall(s.x, s.y)) {
      if (s.boom) boom(s);
      s.life = 0;
      sparks(s.x, s.y, Math.atan2(-s.vy, -s.vx), 4, '#aaa');
    }
    if (s.life <= 0 && s.onEnd) s.onEnd(s), (s.onEnd = null);
  }
  G.shots = G.shots.filter(s => s.life > 0 && s.x > 0 && s.y > 0 && s.x < G.W && s.y < G.H);
  for (const t of G.tele) {
    t.t += dt;
    if (t.t >= t.dur && !t.done) {
      t.done = 1;
      fx({ k: 'ring', x: t.x, y: t.y, r: t.r, dur: 0.3, col: '#ff8a5b' });
      sfx('slam');
      if (Math.hypot(P.x - t.x, P.y - t.y) < t.r + P.r) hurtPlayer(t.dmg, t.src, t.el, true);
    }
  }
  G.tele = G.tele.filter(t => !t.done);
}

/* ---------- 主迴圈 ---------- */
let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let rdt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  if (G.hs > 0) {
    G.hs -= rdt;
    rdt = 0;
  }
  let dt = rdt;
  if (G.slow > 0) {
    G.slow -= rdt;
    dt *= ROLL.slowScale;
  }
  if (dt > 0) {
    G.t += dt;
    updPlayer(dt);
    updMobs(dt);
    updShots(dt);
    updSkills(dt);
    /* 傳送門：地圖裡打倒王後的門＝回家 */
    if (G.portal && G.portal.home) {
      const on = dist(P, G.portal) < 40;
      if (on && G.state === 'play') (G.state = 'portal'), hudState();
      else if (!on && G.state === 'portal') (G.state = 'play'), hudState();
    }
    for (const d of G.drops.slice()) {
      d.t += dt;
      /* 過濾器：「自動撿」的裝備跟金幣一樣吸過來（自己丟的、放不下的不吸） */
      if (
        (d.gold || d.frag || (d.it && !d.nopick && !d.full && dropFlt(d).act === 'pick')) &&
        d.t > 0.4 &&
        dist(P, d) < 150
      ) {
        const f = Math.min(1, dt * 10);
        d.x = d.sx = d.x + (P.x - d.x) * f;
        d.y = d.sy = d.y + (P.y - d.y) * f;
        if (dist(P, d) < 24) pickup(d);
      }
    }
  }
  G.trauma = Math.max(0, G.trauma - rdt * 1.6);
  const w = mouseWorld(),
    /* 藏身處：鏡頭只跟一點，但人物一定在畫面內（手機直立的畫面比房間窄） */
    keep = (c, p, half, pad) => clamp(c, p - Math.max(0, half - pad), p + Math.max(0, half - pad)),
    tx =
      G.scene === 'hide'
        ? keep(G.W / 2 + (P.x - G.W / 2) * 0.3, P.x, CV.clientWidth / ZOOM / 2, 60)
        : P.x + (w.x - P.x) * 0.12,
    ty =
      G.scene === 'hide'
        ? keep(G.H / 2 + (P.y - G.H / 2) * 0.3, P.y, CV.clientHeight / ZOOM / 2, 90)
        : P.y + (w.y - P.y) * 0.12,
    f = 1 - Math.exp(-rdt * 9);
  G.cam.x += (tx - G.cam.x) * f;
  G.cam.y += (ty - G.cam.y) * f;
  for (const o of G.fx) o.t += dt || rdt * 0.25;
  G.fx = G.fx.filter(o => o.t < o.dur);
  for (const n of G.nums) n.t += rdt;
  G.nums = G.nums.filter(n => n.t < 0.9);
  /* 天賦樹、直立的全螢幕面板蓋住整個畫面時不畫遊戲（手機省一半的效能） */
  if (!TREE.open && !(PORT() && anyPanel())) draw();
  hudTick();
}
