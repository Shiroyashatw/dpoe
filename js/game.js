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
    v: 29,
    name: '女忍者',
    /* 手機的操作方向：p 直立、l 橫向（桌機一律橫向）；舊存檔 migrate 從這裡補 */
    orient: 'p',
    lv: 1,
    xp: 0,
    gold: 0,
    /* 商人賭裝連續幾件沒出稀有（0.2.28） */
    gamN: 0,
    frag: 0,
    /* 世界地圖（world.js）：種子、走過的節點、每節點的地圖卡、血霧。maxT、t16 是內部欄位（昇華點、練習區、賭裝） */
    world: newWorld(),
    cards: {},
    hunt: newHunt(),
    maxT: 1,
    tier: 1,
    eq: Object.fromEntries(EQS.map(e => [e.k, null])),
    inv: { w: 12, h: 5, items: [] },
    stash: { w: 12, h: 12, items: [] },
    /* 臨時倉庫頁（0.2.24）：背包滿了撿到的放這裡，只能拿出來 */
    temp: { w: 12, h: 12, items: [] },
    /* 寶石頁（0.2.35）：倉庫的清單式分頁，不限數量 */
    gems: [],
    /* 藏身處（0.2.44）：點亮的神像（生肖鍵，狩獵之血接）、故事旗標（序章、狩獵之血共用，npc.js 的 set） */
    idols: [],
    story: {},
    /* 過濾器（0.2.35）：3 組、每組一串規則（由上往下第一條符合的決定處理方式）＋「其他」預設；見 fltAct */
    filter: { cur: 0, sets: [fltTemplate(), fltTemplate2(), fltEmpty()] },
    sfx: 1,
    /* 新存檔：序章結束才拿到劍（prologue.js）；migrate 對舊存檔拿掉這個旗標 */
    fresh: 1
  };
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
  s.auras = [null];
  s.charms = [null, null, null];
  s.eq.chest = mkItem('c_leather', 1, 0);
  s.mat = newMat();
  /* 偽隨機保底（craft.js 的 prdRoll）：★、追憶、聖化石、腐化石各自連續沒中的次數 */
  s.prd = PRD0();
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
    solid: [],
    npcs: [],
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
  /* 層數增益不帶到下一個場景（stats() 會讀） */
  if (P) P.stk = null;
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
/* 藏身處：地層出口的山腹營地。場景圖與座標在 hideart.js（tools/hide_bake.js 產生），碰撞用地圖的格子牆 */
function enterHideout() {
  const A = HIDE_ART;
  if (TALK.on) talkEnd();
  resetWorld(A.W, A.H);
  G.scene = 'hide';
  G.mm = null;
  G.tiles = hideTiles();
  G.cols = A.cols;
  G.rows = A.rows;
  G.solid = A.solids;
  G.deco = A.lights.map(l => ({ k: 'light', ...l }));
  G.props = hideProps();
  G.npcs = npcList();
  newPlayer(A.spawn.x, A.spawn.y);
  P.hp = ST.hp;
  P.mp = ST.mp;
  skillsEnter();
  PRAC.in = false;
  PRAC.t = Math.min(PRAC.t || S.maxT, S.maxT);
  dummyBuild();
  dpsReset();
  ['scene', 'sky', 'fg'].forEach(himg);
  hudState();
  /* 有未鑑定的裝備：提醒找撿骨師（企劃書 5.4.1） */
  if (unidN(S)) hudWarn(`有 ${unidN(S)} 件裝備還沒鑑定：找撿骨師（免費、一次全部）`);
  /* 打倒裂谷斷崖的王之後第一次回來：直接打開地圖播世界展開 */
  if (wOpen(S) && !S.world.open) openPanel('device');
}
/* 開地圖：花碎片、地圖台前面出現傳送門 */
/* 選了節點 k 的地圖卡 i：付碎片（只看星級），記住節點與這張卡（進地圖時套用）；回傳內部難度 */
function payMap(k, i) {
  const [q, r] = wXY(k),
    why = wWhy(S, q, r),
    st = STORY_I[k],
    card = st != null ? STORY[st].card : wCards(S, k).c[i];
  if (why) return hudWarn(why), 0;
  if (!card) return hudWarn('先選一張地圖卡'), 0;
  const c = st != null ? 0 : mapCost(card.star);
  if (S.frag < c) return hudWarn(`碎片不夠：要 ${c} 個`), 0;
  S.frag -= c;
  S.node = k;
  S.card = card;
  return lvT(wLv(q, r));
}
function openMap(k, i) {
  const t = payMap(k, i);
  if (!t) return;
  const n = wName(S, ...wXY(k));
  G.portal = { ...HIDE_ART.portal, to: t, n };
  save();
  sfx('portal');
  hudWarn(`${n}的傳送門開了`);
}
/* 地圖（參考 Chronicon）：一塊一塊 14×14 格的房間拼起來，有岔路也沒關係；
   殺怪累積首領進度，滿了王就出現在附近（怪物總量約是需要的 150～160%） */
const TS = 48,
  CHUNK = 14;
/* 從地圖裡的傳送門直接開下一張（花碎片） */
function mapAgain(k, i) {
  const t = payMap(k, i);
  if (!t) return;
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
  G.mapT = t;
  /* 節點：血霧扣 25%、這一批卡用掉了（失敗回來也是新的一批）；裂口的王帶 1 條墮落詞 */
  G.node = S.node || null;
  G.zod = null;
  G.hunt = false;
  G.nodeN = '';
  if (G.node) {
    const [q, r] = wXY(G.node);
    if (wType(S, q, r) === 'rift') G.zod = wZod(S, q, r);
    G.nodeN = wName(S, q, r);
    G.hunt = !!S.hunt.full; /* 血霧期：進這張圖時血霧是滿的（最後一張扣光也算） */
    huntEnter(S);
    delete S.cards[G.node];
  }
  G.mm = mapMods(S.card, G.zod && G.zod.cor);
  G.star = (S.card && S.card.star) || 1;
  S.node = S.card = null;
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
  /* 地圖詞「濕透」：整張圖都是濕透（drench 的長秒數；combat.js 的 mobAilPlayer 讀 a.wet） */
  if (G.mm.pwet) (P.ail = P.ail || {}), drench(P, 1e9);
  /* 怪物：起點以外的房間各 2～3 群；菁英數照星級（企劃書 5.4.5，地圖詞「菁英怪多一倍」×2），隨機挑幾群當菁英 */
  const counts = rooms.slice(1).map(() => irnd(2, 3) + (roll(MM('pack') * 2) ? 1 : 0)),
    total = counts.reduce((a, b) => a + b, 0),
    nEl = Math.min(total, eliteCount(G.star) * (MM('elite') ? 2 : 1)),
    els = new Set();
  while (els.size < nEl) els.add(irnd(1, total));
  let pk = 0,
    pts = 0,
    small = 0;
  rooms.slice(1).forEach((r, ri) => {
    for (let k = counts[ri]; k > 0; k--) {
      const c = floorIn(r);
      if (!c) continue;
      const elite = els.has(++pk);
      pick(PACKS).forEach((m, j) => {
        const p = floorNear(c.x, c.y, 0, 70, 20) || c;
        spawnMob(MOBS[m], p.x, p.y, pk, elite && j === 0);
        pts += elite && j === 0 ? 6 : 1;
        if (!(elite && j === 0)) small++;
      });
    }
  });
  /* 一般通貨（蛻變、增幅、磨刀石／護甲片）：每張圖的量照星級表，換成每隻小怪的掉落機率 */
  G.curP = mapCurP(G.star, small, els.size);
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
  const b = spawnMob(G.zod || (G.lastBoss = bossPick(G.lastBoss)), p.x, p.y, 99, false);
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
    /* 無咒（combat.js 的 curseMob）：怪物自己帶（D.hexproof，判官、鬼道士）或地圖詞「怪物無咒」 */
    hexproof: D.hexproof || MM('mhex') ? 1 : 0,
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
/* 這一格技能的鍵還按著嗎（0.2.54，蓄力技能用）：桌機是滑鼠左右鍵與 Q／E／R，手機是那顆技能鍵。
   技能程式只問這個，不自己判斷是不是手機 */
const SLOT_HOLD = [null, null, 'q', 'e', 'r'];
const slotHeld = i =>
  !!((i === 0 && M.L) || (i === 1 && M.R) || (SLOT_HOLD[i] && K[SLOT_HOLD[i]]) || (TOUCH.sk && TOUCH.sk.i === i));
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
  P.mp = Math.min(ST.mp, P.mp + ST.mpReg * (hasBuff('arcane') ? 1 + 0.2 * (1 + ST.arcaneEff / 100) : 1) * lowM * dt);
  if (fightOn()) baseTick(dt);
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
  /* 對話中站著不動 */
  if (G.state === 'talk') mx = my = 0;
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
    if (fightOn() || P.mv)
      P.face = P.mv && (!fightOn() || (TOUCH.on && !TOUCH.sk)) ? Math.atan2(my, mx) : Math.atan2(w.y - P.y, w.x - P.x);
  }
}
/* 移動＋碰撞：牆一格一格推出去，藏身處再推開擺設；分段走，快速衝刺也不會穿牆 */
function moveBody(o, dx, dy) {
  /* 釘身（combat.js）：不能移動、不能被擊退 */
  if (o.ail && o.ail.pinT > G.t) return;
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (o.r * 0.8)));
  for (let i = 0; i < n; i++) {
    o.x += dx / n;
    o.y += dy / n;
    if (G.tiles) pushTiles(o);
  }
  /* 藏身處的擺設 */
  for (const k of G.solid) {
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
  if (ST.noRoll) return hudWarn('無法閃避翻滾');
  let dx = P.mdx || 0,
    dy = P.mdy || 0;
  if (!dx && !dy) (dx = Math.cos(P.face)), (dy = Math.sin(P.face));
  P.act = null;
  P.roll = { t: 0, dx, dy };
  P.cds.roll = ROLL.cd * (1 - Math.min(60, ST.rollCd) / 100) + ROLL.t;
  P.rolledT = G.t + ROLL.t + 2;
  /* 戰術翻滾（0.2.70 千機）：所有彈藥技能裝滿，裝填中的直接完成 */
  if (ST.tacRoll) ammoFull();
  /* 戰狼精魂的品質：翻滾時狼撲向滑鼠附近的怪 */
  if (qRoll(20 * (ST.aq.wolfsp || 0))) {
    const w = G.allies.find(x => x.src === 'aura'),
      mw = mouseWorld(),
      t = mobNear(mw.x, mw.y, 200);
    if (w && t) (w.x = t.x), (w.y = t.y + t.r), (w.cd = 0);
  }
  /* 閃避翻滾無法躲避傷害：沒有無敵與完美閃避（hurtPlayer），傷害在 hurtCalc 打折 */
  if (!ST.rollTank) P.iuntil = G.t + ROLL.iframe;
  sfx('roll');
}
/* mana：喝魔力藥劑（2）回魔力，不然喝生命藥劑（1）回生命；藥劑效果的詞綴與地圖詞兩種都算 */
function drinkFlask(mana) {
  if (!fightOn() || G.state !== 'play') return;
  /* 謹慎調配（flaskUse）：一次少用 x% 充能，剩的夠就能喝；魔力泉（mpFlask）：魔力藥劑回復更多 */
  const k = mana ? 'mflask' : 'flask',
    use = flaskNeed();
  if (P[k] < use) return hudWarn((mana ? '魔力' : '生命') + '藥劑用完了：殺怪會補');
  P[k] -= use;
  const v = 1 + (ST.flask + MM('pflask') + bufV('flaskP') + (mana ? ST.mpFlask : 0)) / 100;
  if (mana) P.mheal += ST.mp * FLASK.mp * v;
  else P.heal += ST.hp * FLASK.heal * v;
  fx({ k: 'heal', x: P.x, y: P.y, dur: 0.5 });
  sfx('drink');
}
/* 受傷：完美閃避 → 無敵 → 閃避 → 格擋 → 偏斜 → 減傷（護甲、抗性、適應）→ 吸收（格擋值 → 守護）→ 能量護盾 → 生命（公式在 combat.js 的 hurtCalc） */
/* noEv：躲不掉的（王的紅光大招、地上的陷阱）；其他擊中都可以被閃避、格擋 */
function hurtPlayer(d, src, el = 'phys', noEv) {
  if (G.state !== 'play') return;
  if (!ST.rollTank && P.roll && P.roll.t < perfWin()) {
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
  /* 信賴夥伴（compShare）：一部分擊中傷害由夥伴（戰狼精魂的狼）承擔，最多一半 */
  if (ST.compShare && d > 0) {
    const w = G.allies.find(x => x.src === 'aura' && !(x.dead > G.t));
    if (w) {
      const sh = (d * Math.min(50, ST.compShare)) / 100;
      d -= sh;
      allyHurt(w, sh);
    }
  }
  evMark('hurt');
  /* 受傷施放（0.2.50）：真的被擊中才算，閃避、格擋、招架在上面就回去了 */
  metaEvent('hurt');
  if (r.defl) num(P.x, P.y - 60, 0, 'ev', '偏斜');
  /* 荊棘反擊（0.2.42）：近戰怪擊中你時反彈荊棘傷害，同一隻怪 0.3 秒最多一次 */
  thornHit(src);
  /* 暈眩（0.2.42）：僵直看每一下的傷害；沉重暈眩只有王的紅光大招累積 */
  playerStagger(d);
  const boss = src && src.D ? src : src && src.src && src.src.D ? src.src : null;
  if (noEv && boss && boss.boss) playerHeavy(d, el);
  /* 流順之風：被擊中清空 */
  P.tail = 0;
  /* 召喚魔像的品質：站在它旁邊，有機率由魔像替你擋下這一下（0.2.52 拿掉 20% 減傷，改成真的嘲諷：skills.js 的 updAllies） */
  if (ST.aq.golem && G.allies.some(w => w.src === 'golem' && !w.dead && dist(w, P) < 200) && qRoll(20 * ST.aq.golem))
    return num(P.x, P.y - 60, 0, 'block', '魔像');
  /* 熊掌的品質：熊形態被擊中得盛怒 */
  if (P.form === 'bear' && qRoll(20 * (P.bearQ || 0)))
    (P.rage = Math.min(rageCap(), (P.rage || 0) + 1)), (P.rageT = G.t);
  /* 被擊中得到盛怒（rageHurt，0.2.68） */
  if (ST.rageHurt) (P.rage = Math.min(rageCap(), (P.rage || 0) + ST.rageHurt)), (P.rageT = G.t);
  if (d > 0) recoupAdd(d);
  d = esAbsorb(d);
  /* 心靈凌駕（基石）：40% 先扣魔力；小點（momP）跟它相加，最多 80% */
  if ((ST.mom || ST.momP) && d > 0) {
    const t = Math.min(P.mp, (d * Math.min(80, (ST.mom ? 40 : 0) + ST.momP)) / 100);
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
  /* 不動如山（基石）；昇華的不動如山：格擋值還在時不會被擊退；先登（0.2.71）衝刺中也不會 */
  if (src && !ST.stand && !(ST.unmov && bvUp()) && !vgDash()) {
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
  if (PRO.on) return proDied();
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
  if (m.summoned || PRO.on) return;
  G.kills++;
  const fk = FLASK.perKill * (m.elite ? 3 : m.boss ? 10 : 1) * (1 + ST.flaskChg / 100);
  P.flask = Math.min(FLASK.n, P.flask + fk);
  P.mflask = Math.min(FLASK.n, P.mflask + fk);
  gainXp(Math.max(1, Math.round(m.D.xp * tierMul(t).hp * (m.elite ? 4 : 1) * xpMul(S.lv, mobLv(t)))));
  /* 材料：靈魂與通貨自動進材料頁，跳字提醒（0.2.72：小怪只掉通貨，裝備是菁英與王才有，企劃書 5.4.5；
     地圖詞：數量＝裝備與通貨的件數、稀有度＝黃裝比例＋★ 與追憶的機率、材料＝崇高與精髓的機率） */
  const od = {
    star: G.star,
    p: G.curP,
    ilvl: tierIlvl(t),
    tier: t,
    qty: MM('qty'),
    rar: MM('rar'),
    mat: MM('mat'),
    hunt: G.hunt,
    zod: !!G.zod
  };
  killMat(m, t, od).forEach((n, i) => num(m.x, m.y - m.sz * 0.6 - i * 18, 0, 'mat', '+' + n));
  /* 掉落：菁英 1 件黃、王 3 件（第一件保底黃）；裂口生肖王多 1 件保底追憶裝 */
  for (const it of dropGear(m.boss ? 2 : m.elite ? 1 : 0, od)) dropAt(m.x, m.y, { it });
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
  /* 打倒王才算走過：路開通；失敗或回家都不算 */
  const ty = G.node ? wClear(S, G.node) : '';
  G.first = ty === 'rift' ? '十二尊神像，又亮了一尊' : ty ? '地圖上開了新的路' : '';
  G.portal = { ...(floorNear(m.x, m.y, 150, 230, 40) || { x: m.x, y: m.y }), home: 1 };
  hitstop(0.25);
  G.slow = 0.9;
  sfx('boss');
  hudWarn(`打倒${m.D.n}！撿完走進藍色傳送門`);
  save();
}
function dropAt(x, y, o) {
  const a = rnd(0, TAU),
    s = rnd(30, 90);
  Object.assign(o, { x: x + Math.cos(a) * s, y: y + Math.sin(a) * s, sx: x, sy: y, t: 0 });
  if (!open(o.x, o.y, 10)) (o.x = x), (o.y = y);
  G.drops.push(o);
  /* ★ 與追憶有專屬落地音（audio.js），黃裝的「rare」照舊 */
  if (o.it) sfx(o.it.frac ? 'star' : o.it.mem ? 'mem' : o.it.r === 2 ? 'rare' : 'drop0');
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
/* 內建範本一（企劃書 5.1）：★ 或追憶 → 自動撿；黃裝 → 顯示；其他 → 顯示（玩家從寬的往下改，隱藏比找回容易） */
const fltTemplate = () => ({
  rules: [
    { on: 1, c: { frac: 1 }, act: 'pick', col: 0 },
    { on: 1, c: { mem: 1 }, act: 'pick', col: 0 },
    { on: 1, c: { rar: [2] }, act: 'show', col: 0 }
  ],
  def: { act: 'show', col: 0 }
});
/* 範本二：只撿 ★、追憶、T 高（物品等級 10 以上）的黃裝，其他全部隱藏 */
const fltTemplate2 = () => ({
  rules: [
    { on: 1, c: { frac: 1 }, act: 'pick', col: 0 },
    { on: 1, c: { mem: 1 }, act: 'pick', col: 0 },
    { on: 1, c: { rar: [2], L: 10 }, act: 'pick', col: 0 }
  ],
  def: { act: 'hide', col: 0 }
});
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
  /* ★（破裂）、追憶：未鑑定也看得到 */
  if (c.frac && !it.frac) return false;
  if (c.mem && !it.mem) return false;
  /* 詞綴條件要鑑定後才看得到：地上未鑑定的永遠不符合，只對鑑定後的（背包、倉庫整理）有效 */
  if (c.aff && it.uid) return false;
  if (c.aff) {
    const ks = new Set(FLT_AFF.filter(g => c.aff.ks.includes(g.id)).flatMap(g => g.keys));
    if ((it.a || []).filter(a => ks.has(a.k)).length < c.aff.n) return false;
  }
  if (c.so != null && (it.so || 0) < c.so) return false;
  if (c.q != null && (it.q || 0) * 100 < c.q) return false;
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
  let best = null,
    bd = 1e9;
  for (const p of G.props) {
    const d = dist(P, p);
    if (d < p.r + 70 && d < bd) (bd = d), (best = p);
  }
  return best;
}
function useProp(p) {
  if (!p) return false;
  if (dist(P, p) > p.r + 90) return hudWarn('走近一點'), true;
  if (p.k === 'device') openWorld();
  else if (p.k === 'stash') openPanel('stash');
  else if (p.k === 'forge') openPanel('craft');
  else if (p.k === 'asc') openPanel('asc');
  else if (p.k === 'npc') talkOpen(p.id);
  else if (p.k === 'prac') hudWarn('走進石圈就能出招');
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
/* 從 (ox, oy) 所在的格子做 BFS，d 是裝距離的陣列（沒走到的是 −1） */
function flowFill(d, ox, oy) {
  const C = G.cols,
    R = G.rows,
    s = Math.floor(oy / TS) * C + Math.floor(ox / TS),
    q = new Int32Array(C * R);
  d.fill(-1);
  if (s < 0 || s >= C * R) return d;
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
  return d;
}
function flowUpd() {
  if (!G.tiles || G.flowT > G.t) return;
  G.flowT = G.t + 0.25;
  const n = G.cols * G.rows;
  G.flow = flowFill(G.flow && G.flow.length === n ? G.flow : new Int16Array(n), P.x, P.y);
  G.flowX = new Map();
}
/* 以目標 T 為終點的路（0.2.64）：玩家用每 0.25 秒算好的 G.flow；召喚物、圖騰這種目標第一次有怪要用時才算，同一個 0.25 秒內共用 */
function flowOf(T) {
  if (T === P) return G.flow;
  const X = G.flowX || (G.flowX = new Map());
  if (!X.has(T)) X.set(T, flowFill(new Int16Array(G.cols * G.rows), T.x, T.y));
  return X.get(T);
}
/* 往距離最小的鄰格走（斜走要兩邊都不是牆，免得卡在牆角） */
function flowAng(m, T = P) {
  const C = G.cols,
    x = Math.floor(m.x / TS),
    y = Math.floor(m.y / TS),
    f = flowOf(T),
    at = (cx, cy) => (cx < 0 || cy < 0 || cx >= C || cy >= G.rows ? -1 : f[cy * C + cx]);
  let bx = 0,
    by = 0,
    bv = 1e9;
  for (const [dx, dy] of DIR8) {
    const v = at(x + dx, y + dy);
    if (v < 0 || v >= bv || (dx && dy && (at(x + dx, y) < 0 || at(x, y + dy) < 0))) continue;
    (bv = v), (bx = x + dx), (by = y + dy);
  }
  return bv < 1e9 ? Math.atan2((by + 0.5) * TS - m.y, (bx + 0.5) * TS - m.x) : angTo(m, T);
}
/* ---------- 怪物的目標（0.2.52，企劃書 4.1）----------
   一般怪：打離自己最近、看得到的玩家或召喚物，每 0.5 秒重選一次。王：平常只打玩家。
   被魔像嘲諷（a.tauntBy／a.tauntT，skills.js 的 updAllies）只打魔像；被玩家嘲諷（a.taunt）只打玩家 */
/* 活著的友方：召喚物，加上有生命的圖騰與砲塔圖騰（0.2.53；陷阱、地雷沒有生命，怪物不理） */
const liveAllies = () => [
  ...(G.allies || []).filter(w => !w.dead && w.hp > 0),
  ...(G.units || []).filter(u => u.hp > 0)
];
function mobTarget(m, dt = 0) {
  const a = m.ail,
    ok = w => w === P || (!w.dead && w.hp > 0 && (G.allies.includes(w) || (G.units || []).includes(w)));
  if (a.taunt > G.t) return (m.tg = P);
  if (a.tauntT > G.t && a.tauntBy && ok(a.tauntBy)) return (m.tg = a.tauntBy);
  if (m.boss) return (m.tg = P);
  if ((m.tgT = (m.tgT || 0) - dt) > 0 && m.tg && ok(m.tg)) return m.tg;
  m.tgT = 0.5;
  let best = P,
    bd = dist(m, P);
  for (const w of liveAllies()) if (dist(m, w) < bd && los(m.x, m.y, w.x, w.y)) (bd = dist(m, w)), (best = w);
  return (m.tg = best);
}
/* 怪物這一下打到誰：玩家走 hurtPlayer；召喚物走 allyHurt（沒有護甲、抗性、閃避，只吃怪物自己的傷害倍率與嘲諷的 −10%） */
function mobHit(m, T, d, noEv, el) {
  if (T === P) hurtPlayer(d, m, el || (m && m.el), noEv);
  else (T.type ? unitHurt : allyHurt)(T, d * (m && m.ail ? mobDmgMul(m) * tauntMul(m, T) : 1));
}
/* 範圍招：圓裡的玩家與召喚物都吃 */
function mobArea(m, x, y, r, d, noEv, el) {
  if (Math.hypot(P.x - x, P.y - y) < r + P.r) hurtPlayer(d, m, el || (m && m.el), noEv);
  for (const w of liveAllies()) if (Math.hypot(w.x - x, w.y - y) < r + w.r) mobHit(m, w, d);
}
function updMobs(dt) {
  flowUpd();
  for (const m of G.mobs) {
    if (m.dummy) {
      dummyTick(m, dt);
      continue;
    }
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
      const f = Math.exp(-dt * KB_F);
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
      bossAI(m, dt);
      continue;
    }
    const D = m.D,
      T = mobTarget(m, dt),
      dT = dist(m, T);
    if (m.st === 'idle' || m.st === 'move') {
      m.st = 'move';
      /* 看得到目標就直走，看不到就照找路的方向繞過去（0.2.64：找路的終點是目標，牆後的召喚物也一樣） */
      const see = los(m.x, m.y, T.x, T.y),
        a = see ? angTo(m, T) : flowAng(m, T);
      let want = 1;
      if (!see) want = 1;
      else if (FAR_AI[D.ai]) want = dT > 300 ? 1 : dT < 200 ? -1 : 0;
      else if (dT < D.reach * (D.ai === 'lunge' ? 0.9 : 0.85)) want = 0;
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
      if (m.cd <= 0 && dT < D.reach + T.r + 4 && see) {
        m.st = 'wind';
        m.t = D.wind * (m.elite ? 0.85 : 1);
        m.ang = angTo(m, T);
      }
    } else if (m.st === 'wind') {
      m.t -= dt;
      if (m.t <= 0) mobStrike(m);
    } else if (m.st === 'dash') {
      m.t -= dt;
      moveBody(m, Math.cos(m.ang) * 900 * dt, Math.sin(m.ang) * 900 * dt);
      if (!m.hitP && dT < m.r + T.r + 6) {
        m.hitP = 1;
        mobHit(m, T, m.dmg);
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
  const D = m.D,
    T = m.tg || P;
  if (D.ai === 'melee') {
    fx({ k: 'claw', x: m.x, y: m.y, ang: m.ang, r: D.reach + 10, dur: 0.15 });
    if (dist(m, T) < D.reach + T.r + 6 && angDiff(angTo(m, T), m.ang) < 1.3) mobHit(m, T, m.dmg);
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
    G.tele.push({ x: T.x, y: T.y, r: 70, t: 0, dur: 0.8, dmg: m.dmg, src: m, el: m.el });
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
    mobArea(m, m.x, m.y, D.boom, m.dmg, true);
    m.hp = 0;
    fx({ k: 'die', x: m.x, y: m.y, sp: D.sp, sz: m.sz, dur: 0.45, flip: m.x > P.x });
    addProg(m);
  } else if (D.ai === 'slam') {
    const x = m.x + Math.cos(m.ang) * 55,
      y = m.y + Math.sin(m.ang) * 55;
    fx({ k: 'ring', x, y, r: 95, dur: 0.3, col: '#ff8a5b' });
    mobArea(m, x, y, 95, m.dmg, true);
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
/* 0.2.52：王平常只打玩家，被魔像嘲諷時改打魔像；已經在出的那一招不換目標（只有在走位、挑招的時候重選） */
function bossAI(m, dt) {
  const T =
      m.st === 'idle' || m.st === 'move'
        ? mobTarget(m, dt)
        : m.tg && (m.tg === P || (!m.tg.dead && m.tg.hp > 0))
          ? m.tg
          : P,
    dT = dist(m, T);
  const rage = m.hp < m.mhp / 2 ? 0.72 : 1;
  if (rage < 1 && !m.raged) {
    m.raged = 1;
    hudWarn(m.D.n + '發狂了！');
  }
  if (m.st === 'idle' || m.st === 'move') {
    m.st = 'move';
    const see = los(m.x, m.y, T.x, T.y),
      a = see ? angTo(m, T) : flowAng(m, T);
    if (dT > 90 || !see) {
      const cs = mobSpd(m);
      moveBody(m, Math.cos(a) * m.D.spd * cs * (rage < 1 ? 1.25 : 1) * dt, Math.sin(a) * m.D.spd * cs * dt);
    }
    m.mv = dT > 90;
    if (m.cd <= 0 && see) {
      const ok = dT < 140 ? BOSS_NEAR : BOSS_FAR,
        l = m.D.pat.filter(k => ok[k]);
      m.pat = pick(l.length ? l : m.D.pat);
      m.st = 'wind';
      m.ang = angTo(m, T);
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
        /* 瞬移到目標背後（背後是牆就落在目標旁邊） */
        const a = angTo(m, T);
        m.tx = T.x + Math.cos(a) * 90;
        m.ty = T.y + Math.sin(a) * 90;
        if (isWall(m.tx, m.ty)) (m.tx = T.x + 1), (m.ty = T.y);
      }
      if (m.pat === 'slam')
        for (let i = 0; i < 3; i++)
          G.tele.push({
            x: T.x + (i ? rnd(-130, 130) : 0),
            y: T.y + (i ? rnd(-130, 130) : 0),
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
    if (m.pat === 'charge' && m.t > 0.25) m.ang = angTo(m, T);
    if (m.t <= 0) {
      if (m.pat === 'swipe') {
        fx({ k: 'claw', x: m.x, y: m.y, ang: m.ang, r: 150, dur: 0.18, big: 1 });
        /* 揮爪是扇形：扇形裡的玩家與召喚物都吃 */
        for (const o of [P, ...liveAllies()])
          if (dist(m, o) < 150 + o.r && angDiff(angTo(m, o), m.ang) < 1.4) mobHit(m, o, m.dmg * 1.2);
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
        m.ang = angTo(m, T);
        m.t = 0.4 * rage;
      } else bossRec(m, 0.9, rage);
    }
  } else if (m.st === 'dash') {
    m.t -= dt;
    moveBody(m, Math.cos(m.ang) * 1150 * dt, Math.sin(m.ang) * 1150 * dt);
    if (Math.random() < 0.7) fx({ k: 'dust', x: m.x + rnd(-20, 20), y: m.y + rnd(-6, 6), dur: 0.4 });
    /* 衝撞：撞到的第一個（玩家或召喚物）吃這一下 */
    const hit = !m.hitP && [P, ...liveAllies()].find(o => dist(m, o) < m.r + o.r + 10);
    if (hit) {
      m.hitP = 1;
      mobHit(m, hit, m.dmg * 1.4);
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
      /* 迴旋：飛回發射者；場上單位射的回到單位的位置（射出的位置） */
      const h = s.a && s.a.unit ? { x: s.sx, y: s.sy } : P,
        g = Math.atan2(h.y - 20 - s.y, h.x - s.x);
      (s.vx = Math.cos(g) * 900), (s.vy = Math.sin(g) * 900), (s.life = 1);
      if (Math.hypot(h.x - s.x, h.y - 20 - s.y) < 30) s.life = 0;
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
      /* 0.2.52：也會打到召喚物（各算各的，不佔「同一波只打中玩家一次」） */
      const aw = s.life > 0 && liveAllies().find(w => Math.hypot(w.x - s.x, w.y - 20 - s.y) < w.r + s.r);
      if (aw) mobHit(s.src, aw, s.dmg), (s.life = 0);
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
          /* 分裂（第 13～16 批）：第一次擊中時一分為二，這一下不穿透、不連鎖；分出來的不會再分 */
          if (s.c.fork && !s.noFork) {
            shotFork(s, s.ang - 0.35), shotFork(s, s.ang + 0.35);
            s.life = 0;
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
      mobArea(t.src, t.x, t.y, t.r, t.dmg, true, t.el);
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
  if (IV.on) return introFrame(rdt);
  if (PANEL.device) return wmFrame(now, rdt);
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
    if (PRO.on) proTick();
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
    tx = P.x + (w.x - P.x) * 0.12,
    ty = P.y + (w.y - P.y) * 0.12,
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
