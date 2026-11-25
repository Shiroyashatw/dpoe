/* num-asc3-tide：注入遊戲頁面的模擬程式（瀏覽器裡跑，用遊戲本身的 stats／hitCalc／applyAil／AI／生怪；只把畫面關掉、時間用 DBG.step 推）。
   route()、gear()、能力值補點照抄 tools/dmg_check.js（R(...) 換成直接用全域），其餘都是呼叫遊戲函式。
   window.__sim.routes(asc, pts)：列出這個昇華在 pts 點下所有合法的點法（連著點、選擇組只拿一個、大小點各半）
   window.__sim.run(cfg)：建角色 → 進地點 → 跑 boss／clear 模式 → 回傳量測 */
(() => {
  'use strict';
  const W = window;
  /* ---- tools/dmg_check.js 的 route（天賦照權重貪心走） ---- */
  function route(w, pts) {
    const T = PTREE,
      I = T.I,
      ADJ = T.ADJ,
      have = new Set();
    const val = n => Object.entries(I[n].s || {}).reduce((a, [k, v]) => a + (w[k] || 0) * (+v || 0), 0);
    const bfs = src => {
      const prev = {},
        d = {},
        q = [...src];
      src.forEach(s => (d[s] = 0));
      while (q.length) {
        const c = q.shift();
        if (d[c] >= 14) continue;
        for (const n of ADJ[c] || [])
          if (d[n] === undefined && !have.has(n) && !I[n].lock) (d[n] = d[c] + 1), (prev[n] = c), q.push(n);
      }
      return { d, prev };
    };
    const s0 = PT_START.map(s => [s, Object.entries(bfs([s]).d).reduce((a, [n, dd]) => a + val(n) / (1 + dd), 0)]).sort(
      (a, b) => b[1] - a[1]
    )[0][0];
    have.add(s0);
    let used = 0;
    while (used < pts) {
      const { d, prev } = bfs([...have]);
      let bt = null,
        br = -1;
      for (const n of Object.keys(d)) {
        if (have.has(n) || !d[n]) continue;
        let p = n,
          g = 0,
          c = 0;
        while (!have.has(p)) (g += val(p)), c++, (p = prev[p]);
        if (c <= pts - used && g / c > br) (br = g / c), (bt = n);
      }
      if (!bt) break;
      const path = [];
      for (let p = bt; !have.has(p); p = prev[p]) path.push(p);
      path.reverse().forEach(p => have.add(p));
      used += path.length;
    }
    return [...have];
  }
  /* ---- tools/dmg_check.js 的 gear（每欄挑同階級的稀有裝，4 件裡挑權重最好的） ---- */
  function gear(t, want, wt, off, L = 999) {
    const eq = {};
    for (const e of EQS) {
      if (e.k === 'ring3') continue;
      let best = null,
        bv = -1;
      for (let i = 0; i < 4; i++) {
        const pool = BASES.filter(
          b =>
            eqTakes(e, b.k) &&
            b.lv <= t &&
            1 + Math.round(((b.lv - 1) * 82) / 15) <= L &&
            (e.k !== 'weapon' || b.wt === wt) &&
            (e.k !== 'off' || !off || b.k === off) &&
            (e.k !== 'weapon' || !off || !b.two)
        );
        if (!pool.length) break;
        const b = pool[Math.floor(Math.random() * pool.length)],
          it = mkItem(b.id, tierIlvl(t), 2),
          v = it.a.reduce((a, x) => a + (want[x.k] || 0) * (Array.isArray(x.v) ? x.v[1] : x.v), 0);
        if (v > bv) (bv = v), (best = it);
      }
      if (best && (e.k !== 'off' || offOK(eq.weapon, best))) eq[e.k] = best;
    }
    return eq;
  }
  /* ---- tools/dmg_check.js 的過路點能力值補點（穿不起就給能力值點權重 aw 重走） ---- */
  function treeFix(B, L) {
    /* 這套配裝所有的技能（含汐引，不管有沒有點昇華）都算需求：同一套配裝、同一個種子，換昇華時天賦與能力值點完全一樣，比較只差昇華本身 */
    const REQ = B.skills.map(r => ({ k: r.k, so: r.so, n: Math.max(2, r.so.length) }));
    for (const aw of [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16]) {
      S.pt = route({ ...B.tree, attr: aw }, ptPoints(L));
      S.ptA = {};
      const I = PTREE.I;
      const lack = () => {
        const d = { 力量: 0, 敏捷: 0, 智慧: 0 };
        for (const k of Object.keys(S.eq)) for (const [n, have, req] of eqLack(S, S.eq[k], k)) if (n in d) d[n] += req - have;
        /* 跟 dmg_check 不同：技能寶石的能力值需求也算（gemLack；不然 AI 放不出招，skillWhy「能力值不足」） */
        const st = stats(S);
        for (const r of REQ) for (const [n, have, req] of gemLack(recGem(r, S.lib), st)) if (n in d) d[n] += req - have;
        return d;
      };
      for (const id of S.pt.filter(id => I[id].s && I[id].s.attr)) {
        const d = lack(),
          c = [
            ['s', '力量'],
            ['d', '敏捷'],
            ['i', '智慧']
          ].sort((a, b) => d[b[1]] - d[a[1]])[0];
        S.ptA[id] = d[c[1]] > 0 ? c[0] : 's';
      }
      const st = stats(S);
      if (!eqCheck(S).bad.size && REQ.every(r => !gemLack(recGem(r, S.lib), st).length)) return aw;
    }
    return -1;
  }
  /* ---- 合法點法：從 a_st 往外長，4 小 4 大（pts 點＝pts/2 小＋pts/2 大），同一個選擇組只拿一個 ---- */
  function routes(k, pts = 8) {
    const T = ascNodes(k),
      half = pts / 2,
      seen = new Set(),
      out = [];
    const go = cur => {
      let sm = 0,
        bg = 0;
      const g = [];
      for (const id of cur) if (id !== 'a_st') T.I[id].big ? bg++ : sm++, T.I[id].g && g.push(T.I[id].g);
      if (sm > half || bg > half || new Set(g).size !== g.length) return;
      const key = [...cur].sort().join();
      if (seen.has(key)) return;
      seen.add(key);
      if (sm === half && bg === half) return out.push([...cur].filter(x => x !== 'a_st').sort());
      for (const id of cur) for (const o of T.ADJ[id] || []) if (!cur.has(o)) go(new Set([...cur, o]));
    };
    go(new Set(['a_st']));
    return out;
  }
  /* ---- 覆寫昇華數字（調整方案）：ov = { 'tide.ebb.tideMore': 15, 'tide.heart.s': ..., 'SKILLS.tidepull.m': 0.5, 'BUFF.tide.st.tideEle': 4 } ---- */
  function applyOv(ov) {
    for (const [p, v] of Object.entries(ov || {})) {
      const a = p.split('.');
      if (a[0] === 'SKILLS') SKILLS[a[1]][a[2]] = v;
      else if (a[0] === 'BUFF') a.length === 4 ? (BUFF[a[1]][a[2]][a[3]] = v) : (BUFF[a[1]][a[2]] = v);
      else {
        const n = ASC[a[0]].N[a[1]];
        /* 大點的 fx 在第 4 格、小點的數值在第 3 格 */
        if (typeof n[2] === 'object') n[2][a[2]] = v;
        else n[3][a[2]] = v;
      }
    }
  }
  /* ---- 建角色 ---- */
  function setup(cfg) {
    DBG.freeze();
    /* 載入後到這裡之間，頁面照真實時間跑了幾格（耗掉的亂數不固定）：這裡用種子重設亂數，之後抽裝、生怪、AI 都只看種子 */
    Math.random = rng(cfg.seed * 7919 + 17);
    proSkip();
    /* 不畫畫面（只省時間；frame() 其他照跑） */
    W.draw = () => {};
    W.hudTick = () => {};
    W.hudState = () => {};
    W.hudWarn = () => {};
    /* 輔助孔數照交辦（長老屋 Lv10＝4 孔）；main 的 craft.js:373 是 Lv8～10 給 3 孔 */
    const oc = campN;
    W.campN = k => (k === 'holes' ? cfg.holes : oc(k));
    /* 地圖詞固定為空（每輪隨機抽的詞會讓配裝之間不可比） */
    const owc = wCard;
    W.wCard = s => ({ ...owc(s), mods: [] });
    applyOv(cfg.ov);
    const B = cfg.B,
      L = cfg.L;
    Object.assign(S, { lv: L, xp: 0, maxT: cfg.t, t16: 1, star: 1 });
    Object.assign(S.camp, { watch: 21, altar: 10, forge: 20 });
    S.asc = null;
    S.at = [];
    S.eq = Object.fromEntries(EQS.map(e => [e.k, null]));
    Object.assign(S.eq, gear(cfg.t, B.gear, B.wt, B.off, L));
    S.asc = cfg.asc || null;
    S.at = cfg.asc ? ['a_st', ...cfg.at.map(x => (x.startsWith('a_') ? x : 'a_' + x))] : [];
    S.lib = { sk: {}, sup: {}, aura: {}, aw: {}, sup2: {} };
    S.skills = Array.from({ length: NSLOT }, newSlot);
    B.skills.forEach((r, i) => {
      S.lib.sk[r.k] = gemCap(L);
      if (r.asc && !ascHas(S, r.asc)) return;
      S.skills[i] = { k: r.k, so: [...r.so, null, null, null, null, null].slice(0, Math.max(2, r.so.length)), n: Math.max(2, r.so.length) };
    });
    /* 汐引沒點到時把空格往前補（AI 照格子順序放） */
    S.skills = [...S.skills.filter(r => r.k), ...S.skills.filter(r => !r.k)];
    const aw = treeFix(B, L);
    S.auras = [null];
    S.charms = [null, null, null];
    ST = stats();
    return { aw, bad: [...eqCheck(S).bad], eqBad: ST.eqBad };
  }
  /* ---- EHP：王一招（dmg_check 的定義：BOSSES 最高 dmg × tierMob().dmg × BOSS_DMG × 1.4）用遊戲的 hurtCalc 平均 N 次 ---- */
  function ehp(N = 600) {
    const hit = Math.max(...BOSSES.map(b => b.dmg)) * tierMob(G.mapT).dmg * BOSS_DMG * 1.4,
      pool = ST.hp + ST.es,
      o = {};
    const save = { hp: P.hp, es: P.es, bv: P.bv, evE: P.evE };
    for (const el of ['phys', 'fire', 'cold', 'light']) {
      let tot = 0;
      for (let i = 0; i < N; i++) {
        P.bv = ST.bv;
        P.bvRe = null;
        const r = hurtCalc(hit, null, el);
        tot += r.d || 0;
      }
      o[el] = tot / N > 0 ? (pool * hit) / (tot / N) : 1e9;
    }
    Object.assign(P, save);
    return { hit, pool, phys: o.phys, ele: 3 / (1 / o.fire + 1 / o.cold + 1 / o.light), fire: o.fire, cold: o.cold, light: o.light };
  }
  /* ---- 量測：受到的擊中傷害（hurtPlayer 前後的生命＋護盾差）、倒下次數（不死：倒下就補滿，記一次） ---- */
  function hooks(TK) {
    const oh = hurtPlayer;
    W.die = () => {
      TK.dieCalls++;
    };
    const ok = killMob;
    W.killMob = function (m) {
      if (!m.dead && !m.summoned && !m.boss) TK.kills++;
      return ok.apply(this, arguments);
    };
    W.hurtPlayer = function (d, src, el, noEv) {
      const h0 = P.hp + (P.es || 0);
      const r = oh.apply(this, arguments);
      const lost = h0 - (Math.max(0, P.hp) + (P.es || 0));
      if (lost > 0) TK.taken += lost;
      TK.hits++;
      return r;
    };
  }
  const tideN = () => (typeof stkN === 'function' ? stkN('tide') : 0);
  function step(TK, sec, each) {
    for (let s = 0; s < sec; s += 0.25) {
      DBG.step(250);
      if (P.hp <= 0 || G.state === 'dead') {
        TK.deaths++;
        G.state = 'play';
        P.hp = ST.hp;
        P.es = ST.es;
      }
      TK.stkSum += tideN();
      TK.stkN++;
      if (each && each()) return true;
    }
    return false;
  }
  function run(cfg) {
    const info = setup(cfg),
      TK = { taken: 0, hits: 0, deaths: 0, dieCalls: 0, stkSum: 0, stkN: 0, kills: 0 };
    hooks(TK);
    runNode(TRUNK_K[cfg.node]);
    const E = ehp(),
      res = {
        info,
        mapT: G.mapT,
        ehp: E,
        hp: ST.hp,
        es: ST.es,
        res: ['fire', 'cold', 'light'].map(k => effRes(k)),
        armor: ST.armor,
        ev: ST.ev,
        block: ST.block,
        bv: ST.bv,
        at: S.at,
        skills: S.skills.filter(r => r.k).map(r => r.k + '[' + r.so.filter(Boolean).join(',') + ']')
      };
    if (cfg.mode === 'bossx') {
      /* 穩態打王：同一隻王、生命 ×hpx（穩固值、異常門檻只看階級，不看王的生命，所以冰凍、感電的難度不變），打 tmax 秒不會死；
         傷害＝每 0.25 秒王生命的減少量加總（王自己回血不抵銷），10 秒爆發＝前 10 秒 ÷ 10，穩態＝10 秒到結束 ÷ (tmax − 10) */
      G.mobs = [];
      G.waves = [];
      G.fdB = BOSSES[cfg.boss % BOSSES.length];
      spawnBoss();
      G.fdB = null;
      const b = G.mobs.find(m => m.boss),
        t0 = G.t;
      b.hp = b.mhp = b.mhp * cfg.hpx;
      let prev = b.hp,
        dealt = 0,
        d10 = null;
      step(TK, cfg.tmax, () => {
        dealt += Math.max(0, prev - b.hp);
        prev = b.hp;
        if (d10 == null && G.t - t0 >= 10) d10 = dealt;
        return b.hp <= 0;
      });
      const dur = G.t - t0;
      Object.assign(res, { boss: b.D.n, bossHp: b.mhp, dur, dealt, burst10: d10 / 10, steady: (dealt - d10) / (dur - 10), alive: b.hp > 0 });
    } else if (cfg.mode === 'boss') {
      G.mobs = [];
      G.waves = [];
      G.fdB = BOSSES[cfg.boss % BOSSES.length];
      spawnBoss();
      G.fdB = null;
      const b = G.mobs.find(m => m.boss),
        t0 = G.t,
        ser = [];
      let t10 = null;
      const done = step(TK, cfg.tmax, () => {
        const tt = G.t - t0;
        if (t10 == null && tt >= 10) t10 = b.mhp - Math.max(0, b.hp);
        if (Math.round(tt * 4) % 4 === 0) ser.push([+tt.toFixed(1), Math.max(0, b.hp), tideN()]);
        return b.hp <= 0 || b.dead;
      });
      const dur = G.t - t0;
      Object.assign(res, {
        boss: b.D.n,
        bossHp: b.mhp,
        kill: done ? dur : null,
        dur,
        dealt: b.mhp - Math.max(0, b.hp),
        dps: (b.mhp - Math.max(0, b.hp)) / dur,
        burst10: (t10 == null ? b.mhp - Math.max(0, b.hp) : t10) / 10,
        ser
      });
    } else {
      /* 清怪：進場到首領進度滿（王出現）的秒數；擊殺數只算小怪與菁英（召喚出來的不算） */
      const t0 = G.t;
      const done = step(TK, cfg.tmax, () => G.bossOut);
      const dur = G.t - t0;
      Object.assign(res, { clear: done ? dur : null, dur, kills: TK.kills, kps: TK.kills / dur, need: G.need, prog: G.prog });
    }
    Object.assign(res, {
      taken: TK.taken,
      hits: TK.hits,
      deaths: TK.deaths,
      takenPs: TK.taken / res.dur,
      takenPctPs: TK.taken / res.dur / (ST.hp + ST.es),
      tideAvg: TK.stkN ? TK.stkSum / TK.stkN : 0
    });
    return res;
  }
  W.__sim = { routes, run, setup, ehp, route, gear };
})();
