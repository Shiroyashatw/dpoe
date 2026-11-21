/* dungeonPOE · 視覺審查用的除錯掛鉤（visual-review-protocol.md §4）。
   只有網址帶 ?test= 或 ?dbg=1 時 index.html 才載入（緊接 core.js 之後）；正式玩家完全不載入、沒有 DBG。
   不改遊戲數值：只把狀態做出來給截圖用 */
'use strict';
/* 技能格的假狀態（bhud.js 的 BH.fake[i]）；k 可以是格子 0–4 或技能鍵 */
function bhFake(k, o) {
  const i = typeof k === 'number' ? k : S.skills.findIndex(r => r.k === k);
  if (i < 0) return false;
  BH.fake[i] = o ? Object.assign(BH.fake[i] || {}, o) : null;
  for (const x in HV) if (/^bs/.test(x)) delete HV[x];
  return true;
}
const DBG = (() => {
  const q = new URLSearchParams(location.search),
    seed = q.get('seed');
  /* ?seed=<n>：之後所有 Math.random 都用固定亂數（掉落、怪物位置、擺設；bDecals 本來就照格子算） */
  if (seed != null) Math.random = rng(+seed || 0);
  /* 虛擬時鐘：performance.now 與 requestAnimationFrame 的時間都從這裡拿；凍結時不前進，主迴圈的 dt 就是 0 */
  const pnow = performance.now.bind(performance),
    raf = requestAnimationFrame.bind(window);
  let off = 0,
    /* ?freeze=1：一載入就凍結（產生器、離線計時都不跑），截圖不受載入快慢影響 */
    frz = q.get('freeze') === '1' ? 0 : null,
    last = 0,
    Q = [];
  const vnow = () => (frz != null ? frz : pnow() - off);
  performance.now = vnow;
  /* Date.now 也跟著虛擬時鐘（產生器、掛機計時、離線結算都用它） */
  const d0 = Date.now() - pnow();
  Date.now = () => Math.floor(d0 + vnow());
  const pump = () => {
    const L = Q;
    Q = [];
    const t = (last = vnow());
    /* 凍結中新開始的動畫停在第 0 毫秒（結果固定；要看進場後的樣子用 step 推） */
    if (frz != null) anims(a => a.playState === 'running' && (a.pause(), (a.currentTime = 0)));
    for (const f of L) f(t);
  };
  window.requestAnimationFrame = cb => (Q.push(cb) === 1 && raf(pump), Q.length);
  const anims = f => document.getAnimations().forEach(f),
    mob = () => Object.values(MOBS)[0],
    at = (x, y) => [x == null ? P.x : x, y == null ? P.y - 60 : y],
    /* 跳數字的種類（M2-36 的 5 色分組）→ render.js 的 n.c */
    NUM = {
      hit: 'hit',
      crit: 'crit',
      hurt: 'hurt',
      gain: 'gold',
      minor: 'miss',
      miss: 'miss',
      dodge: 'ev',
      block: 'block',
      dot: 'dot'
    };
  return {
    ver: 1,
    seed: seed == null ? null : +seed || 0,
    get frozen() {
      return frz != null;
    },
    /* 停住遊戲時間與 CSS／Web 動畫 */
    freeze() {
      /* 停在上一格的時間：下一格 dt 就是 0，凍結那一刻不會多走半格 */
      if (frz == null) frz = last;
      /* 一直循環的動畫（條紋、呼吸）停在第 0 毫秒，兩次截圖才會一樣 */
      anims(a => (a.pause(), a.effect && a.effect.getTiming().iterations === Infinity && (a.currentTime = 0)));
    },
    /* 往前走 ms：每 33 ms（主迴圈一次最多 50 ms）跑一格，動畫跟著走；不在凍結中就先凍結 */
    step(ms = 33) {
      if (frz == null) this.freeze();
      for (let left = ms; left > 0; left -= 33) {
        const d = Math.min(33, left);
        frz += d;
        anims(a => (a.pause(), (a.currentTime = (a.currentTime || 0) + d)));
        pump();
      }
    },
    resume() {
      if (frz == null) return;
      off = pnow() - frz;
      frz = null;
      anims(a => a.playState === 'paused' && a.play());
      pump();
    },
    /* 進 temple／lava／tomb／ice 的一個地點（第一個主幹點），主角站左上（看得到上牆與側牆）、鏡頭對準 */
    biome(k = 'temple') {
      if (!BIOMES[k]) return false;
      if (G.scene !== 'map') runNode(TRUNK_K[0]);
      const [cols, rows] = FIELD,
        cx = i => 1 + Math.floor((i * (cols - 2)) / 3),
        cy = j => 1 + Math.floor((j * (rows - 2)) / 2),
        cells = [];
      for (let j = 0; j < 2; j++)
        for (let i = 0; i < 3; i++) cells.push({ x0: cx(i), y0: cy(j), x1: cx(i + 1) - 1, y1: cy(j + 1) - 1 });
      /* 同一個種子每次都從同一點重來：亂數、場景時間、主角狀態（截圖要逐像素相同） */
      if (seed != null) Math.random = rng(+seed || 0);
      G.t = G.trauma = G.hs = G.slow = G.night = G.fog = 0;
      G.biome = k;
      G.deco = decorate(cells);
      newPlayer(5 * TS, 4 * TS);
      P.hp = ST.hp;
      G.cam.x = P.x;
      G.cam.y = P.y;
      return true;
    },
    /* 清掉怪、投射物、特效、數字、掉落，之後也不再放波、不出王 */
    clear() {
      G.mobs.length = G.shots.length = G.fx.length = G.nums.length = G.drops.length = G.tele.length = 0;
      G.waves = [];
      G.bossOut = 1;
    },
    night(s = 5) {
      G.night = G.t + s;
    },
    fog(s = 5) {
      G.night = 0;
      G.fog = G.t + s;
    },
    /* 叫出指定的王：BOSSES 的 sp 鍵或名字 */
    boss(k) {
      const D = BOSSES.find(b => b.sp === k || b.n === k);
      if (!D || G.scene !== 'map') return null;
      const z = G.zod,
        f = G.fdB;
      G.zod = null;
      G.fdB = D;
      spawnBoss();
      (G.zod = z), (G.fdB = f);
      return G.mobs[G.mobs.length - 1];
    },
    /* 在世界座標播一次序列圖特效（FXS 的鍵，含 sig_* 招牌特效）；照指定的鍵播（不經 fxs 把 crit 換成 sig_crit）。
       沒有這個特效、或 sig_* 的圖還沒載好（render.js 一開始就載，沒載好就畫不出來）回傳 false */
    fx(id, x, y) {
      const S = typeof FXS !== 'undefined' && FXS[id];
      if (!S || (id.startsWith('sig_') && !fxImg(id).naturalWidth)) return false;
      const [px, py] = at(x, y);
      G.fx.push({ k: 'sh', n: id, x: px, y: py, s: 1, t: 0, dur: S.n / S.fps });
      return true;
    },
    num(kind = 'hit', v = 123, x, y) {
      const c = NUM[kind];
      if (!c) return false;
      const [px, py] = at(x, y);
      G.nums.push({ x: px, y: py, v: Math.round(v), c, t: 0, txt: kind === 'miss' ? '未命中' : undefined });
      return true;
    },
    /* 技能格全換成火焰法術、魔力補滿，旁邊沒怪就放 6 隻來打 */
    fireAll() {
      const L = Object.keys(SKILLS).filter(k => SKILLS[k].el === 'fire' && (SKILLS[k].tags || []).includes('spell'));
      S.skills.forEach(
        (r, i) => L[i] && ((S.skills[i] = { k: L[i], so: [null, null], n: 2 }), (S.lib.sk[L[i]] = S.lib.sk[L[i]] || 1))
      );
      ST = stats();
      hudBar();
      P.mp = ST.mp;
      if (!G.mobs.length)
        for (let i = 0; i < 6; i++)
          spawnMob(mob(), P.x + 160 * Math.cos(i), P.y + 120 * Math.sin(i), 1, false).aggro = 1;
      return S.skills.map(r => r && r.k);
    },
    hp(p) {
      P.hp = Math.max(1, Math.round((ST.hp * p) / 100));
    },
    mp(p) {
      P.mp = Math.round((ST.mp * p) / 100);
    },
    /* 魔力過熱＝地獄火（炎魔契約）八成以上：魔力球換成地獄火、累積 90%；hot(0) 照天賦重算還原 */
    hot(on = 1) {
      ST = stats();
      if (on) (ST.hellfire = 1), (ST.hfMax = ST.mp * 2), (P.hf = ST.hfMax * 0.9);
    },
    /* 地上光柱：rare＝一般通貨的金柱、unique＝完美通貨的高金柱（裝備不掉，沒有裝備光柱）、chase＝追逐物品 */
    beam(r = 'rare') {
      if (r === 'chase') return this.chaseDrop();
      const k = Object.keys(CUR).find(c => (r === 'unique') === /3$/.test(c));
      dropAt(P.x + 60, P.y, { show: k });
      return k;
    },
    chaseDrop() {
      return devChase();
    },
    /* 套王印那一下：開追逐物品面板、選那一格、套上（沒有印就先給一枚；那一格要是魔法或稀有） */
    wyApply(slot = 'weapon', k = CHASE_POOL.trunk[0]) {
      const it = S.eq[slot];
      if (!it) return false;
      if (it.r !== 1 && it.r !== 2) it.r = 2;
      S.frags[k] = (S.frags[k] || 0) + 1;
      openPanel('chase');
      CHSEL = k;
      CHUI.v = 'pick';
      CHUI.slot = slot;
      hudPanels();
      wyApply(k);
      return true;
    },
    lvup() {
      gainXp(xpNeed(S.lv) - S.xp);
    },
    /* 打造翻牌：list 是物品或基底鍵（基底鍵做成稀有），放進倉庫後用打造模式翻 */
    flip(list) {
      const L = list.map(x => (typeof x === 'string' ? mkItem(x, S.lv || 1, 2) : x));
      for (const it of L) invPut(S.inv, it);
      revealOpen(L, { craft: 1, title: '打造' });
      return L;
    },
    /* 吐司：遊戲裡只有一種（hudWarn），kind 先不分 */
    toast(kind, text) {
      hudWarn(text);
    },
    /* 某一格地磚在螢幕上的矩形（CSS px） */
    tileRect(tx, ty) {
      const r = CV.getBoundingClientRect(),
        ox = Math.round(IW / ZOOM / 2 - G.cam.x),
        oy = Math.round(cvH() / ZOOM / 2 - G.cam.y);
      return { x: r.left + (tx * TS + ox) * ZOOM, y: r.top + (ty * TS + oy) * ZOOM, w: TS * ZOOM, h: TS * ZOOM };
    },
    /* 模擬底部 safe-area：CSS 的 env(safe-area-inset-bottom) 都寫成 var(--sab, env(...))；null 還原 */
    safeArea(px, top) {
      const st = document.documentElement.style;
      px == null ? st.removeProperty('--sab') : st.setProperty('--sab', px + 'px');
      top == null ? st.removeProperty('--sat') : st.setProperty('--sat', top + 'px');
      resize();
    },
    /* battle-hud v1.3.3 §13 做狀態（R4 §3.3）：k＝技能格 0–4 或技能鍵；null＝還原成遊戲真的值 */
    ammo(k, n) {
      return bhFake(k, n == null ? null : { n, rl: n > 0 ? 0 : undefined });
    },
    reload(k, s) {
      return bhFake(k, s == null ? null : { n: 0, rl: s });
    },
    gren(k, used) {
      return bhFake(k, used == null ? null : { used });
    },
    stage(k, s) {
      return bhFake(k, s == null ? null : { s });
    },
    /* 光環數（照 AURAS 的順序拿生效的 n 個；超過 7 個畫 6＋「+k」）；null 還原 */
    auras(n) {
      BH.fake.aura = n == null ? null : Object.keys(AURAS).slice(0, n);
      HV.bhau = null;
      return BH.fake.aura;
    },
    /* 狀態圖示數（照 STATE 拿 n 個，前 bad 個是負面）；null 還原 */
    states(n, bad = 1) {
      BH.fake.sts =
        n == null
          ? null
          : Object.keys(STATE)
              .slice(0, n)
              .map((k, i) => ({ k, n: STATE[k][0], ic: STATE[k][1], d: STATE[k][2], f: 0.6, bad: i < bad }));
      HV.bhsts = null;
      return n;
    },
    /* 掉落洪水：拾取最後一列換成「+n 件已收」；null 還原 */
    flood(n) {
      BH.fake.flood = n;
      HV.idle = null;
      idleBar(1);
    },
    /* 目標（營地下一座）的進度 0–1；null 還原 */
    goal(p) {
      BH.fake.goal = p;
      HV.idle = null;
      idleBar(1);
    },
    /* 收到最小（1）／一般（0）；不播動畫 */
    hudMin(on = 1) {
      S.hmin = on ? 1 : 0;
      bhLayout(1);
      sheetSync();
      idleBar(1);
    },
    /* 大招警示：現在場上的王出一招判決（只做警示，不出招）；dur 秒 */
    big(dur = 2.1) {
      const m = G.mobs.find(x => x.boss && x.hp > 0);
      if (!m) return false;
      m.pat = 'verdict';
      bigWarn(m, P, dur);
      return true;
    },
    /* 存檔內容：物件就淺層蓋到 S 上，函式就拿 S 去改；之後重算數值、重畫面板 */
    save(preset) {
      typeof preset === 'function' ? preset(S) : Object.assign(S, preset);
      ST = stats();
      hudBar();
      hudPanels();
    }
  };
})();
