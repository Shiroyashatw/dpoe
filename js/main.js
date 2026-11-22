/* dungeonPOE · 存檔與啟動（最後載入） */
'use strict';
let DPR = 1;
function load() {
  try {
    const r = localStorage.getItem(KEY + SLOT);
    return r ? JSON.parse(r) : null;
  } catch (e) {
    return null;
  }
}
function save() {
  if (!S) return;
  const s = S;
  s.savedAt = Date.now();
  /* 離線結算（0.4.1）：存的時候在刷圖，下次打開就從存檔時間算起 */
  s.farm = G.scene === 'map' && !G.arena ? 1 : 0;
  /* 分頁在背景時計時器還會存檔：離開的時間從切走那一刻算 */
  s.offAt = HIDE_AT || s.savedAt;
  try {
    localStorage.setItem(KEY + SLOT, JSON.stringify(s));
  } catch (e) {
    console.warn('存檔失敗', e);
  }
  if (typeof CLOUD !== 'undefined') CLOUD.dirty = true;
}
/* 存檔版本 S.v：10 是 0.2.0 重製；0.3.0（31）以前的直接開新角色；更早的轉換在 git 紀錄 */
function migrate(s) {
  if (!s || !(s.v >= 31)) return newGame();
  const o = { ...newGame(), ...s };
  if (!s.fresh) delete o.fresh;
  /* 存檔 32（0.4.0，企劃書 2.1、4.1、5.9）：固定節點地圖、連續刷、清單倉庫、沒有鑑定 */
  if (o.v < 32) {
    /* 背包、兩頁臨時倉庫、倉庫合成一個清單；裝不下的（超過容量）換金幣 */
    const all = [o.inv, o.stash, o.temp, o.temp2].flatMap(g => (g && g.items) || []);
    o.inv = { items: [] };
    for (const it of all) {
      delete it.uid; /* 未鑑定的全部自動鑑定 */
      if (!invPut(o.inv, it)) o.gold += sellPrice(it);
    }
    if (o.curIt) delete o.curIt.uid;
    /* 地圖碎片換金幣（每個 10 金） */
    o.gold += (o.frag || 0) * 10;
    /* 世界地圖：照走過最遠的節點等級，把主幹開到同樣等級；劇情進度照舊 */
    const W = s.world || {},
      /* 舊的六角格地圖：劇情區照表，外面每往外一圈 +3 級（0.3.x 的 wLv） */
      oldLv = k => (STORY_I[k] != null ? STORY[STORY_I[k]].lv : Math.min(W_CAP, 18 + (wRing(...wXY(k)) - 3) * 3)),
      top = Math.max(0, ...(W.done || []).map(oldLv)),
      w = newWorld();
    w.stage = W.stage || 0;
    w.open = W.open || 0;
    w.done = TRUNK_K.filter((k, i) => (STORY_I[k] != null ? STORY_I[k] < w.stage : TRUNK[i].lv <= top));
    w.at = w.done[w.done.length - 1] || w.at;
    o.world = w;
    for (const k of ['stash', 'temp', 'temp2', 'frag', 'cards', 'patrol', 'run', 'node', 'card']) delete o[k];
    o.army = {};
    o.stopWhy = null;
    o.v = 32;
  }
  /* 存檔 33（0.4.8，企劃書 6.5）：一般輔助沒有等級，升過的退靈魂；用過的 II（插著或目錄有紀錄）直接算解鎖 */
  if (o.v < 33) {
    const L = (o.lib = { sk: {}, sup: {}, aura: {}, aw: {}, ...o.lib }),
      U = L.sup,
      II = (L.sup2 = L.sup2 || {});
    for (const k of Object.keys(U)) {
      const D = SUPPORTS[k];
      if (D && D.aw) continue;
      if (D && D.tier === 2) II[D.base] = 1;
      for (let l = 1; l < U[k]; l++) o.mat.soul = (o.mat.soul || 0) + soulCost(l);
      delete U[k];
    }
    for (const r of [...o.skills, ...o.auras])
      for (const k of (r && r.so) || []) if (k && SUPPORTS[k] && SUPPORTS[k].tier === 2) II[SUPPORTS[k].base] = 1;
    o.v = 33;
  }
  /* 存檔 34（0.5.0，工坊與解鎖表第 3 節）：營地四座設施照角色等級、主幹開到第幾個點、用過的技能格與孔、星級換算（⚠️ 一條簡單的表）；
     已經有的技能、輔助、昇華、天賦、倉庫裡的裝備、通貨都留著，材料從 0 開始；商人賭裝的保底刪掉 */
  if (o.v < 34) {
    const front = wFrontDone(o),
      lv = o.lv || 1,
      C = newCamp(),
      /* 表上第一個「要先打倒第 N 個點」還沒打過的那一級之前 */
      byNode = (b, want) => {
        let n = 0;
        while (n < want && n < CAMP[b].length && !(CAMP[b][n].node > front)) n++;
        return n;
      };
    C.forge = byNode('forge', lv >= 60 ? 20 : lv >= 40 ? 14 : lv >= 20 ? 8 : Math.min(7, Math.floor(lv / 3)));
    const used = o.skills.filter(r => r && r.k).length,
      holes = Math.max(2, ...o.skills.map(r => (r && r.n) || 2)) - 2,
      au = (o.auras || []).filter(Boolean).length;
    C.altar = Math.max(
      [0, 0, 1, 3, 6, 9][Math.min(5, used)] || 0,
      [0, 2, 5, 8][Math.min(3, holes)] || 0,
      o.pt.length > PT_START.length ? 4 : 0,
      au ? 5 : 0,
      o.asc ? 7 : 0,
      (o.jsock || []).some(Boolean) ? 10 : 0
    );
    C.watch = byNode('watch', Math.max(0, ...Object.values(o.world.star || {})) - 1);
    C.store = lv >= 10 ? 1 : 0;
    /* 用過的武器類別算開了 */
    for (const it of [...Object.values(o.eq), ...o.inv.items])
      if (it && !it.charm && BASEI[it.b] && BASEI[it.b].wt && !C.wts.includes(BASEI[it.b].wt))
        C.wts.push(BASEI[it.b].wt);
    C.forge = Math.max(C.forge, C.altar, C.watch, C.store, C.wts.length > 1 ? 11 + 2 * (C.wts.length - 2) : 0);
    o.camp = C;
    o.auto2 = AUTO2();
    delete o.gamN;
    o.v = 34;
  }
  /* 存檔 35（0.5.1，工坊與解鎖表 3.7 下面那段，⚠️ 一條簡單的表）：0.5.0 的瞭望台（星級）改叫斥候營；瞭望台＝主幹開到第 n 個點 → Lv n−1；
     民房＝角色等級 ÷ 5；林場、礦場＝角色等級 × 2（最多 100），獵場、絲地照鍛造台開了沒；星級全域一個；推進設定刪掉 */
  if (o.v < 35) {
    const C = (o.camp = { ...newCamp(), ...o.camp }),
      lv = o.lv || 1,
      st = Math.max(1, ...Object.values((o.world && o.world.star) || {}));
    C.scout = Math.min(CAMP.scout.length, C.watch || 0);
    C.watch = wFrontDone(o);
    C.house = Math.min(CAMP.house.length, Math.floor(lv / 5));
    const g = Math.min(100, Math.max(1, lv * 2));
    C.gen = {
      wood: { lv: g },
      iron: { lv: g },
      hide: { lv: C.forge >= 3 ? 1 : 0 },
      silk: { lv: C.forge >= 8 ? 1 : 0 }
    };
    o.star = Math.min(st, C.scout + 1);
    delete o.push;
    if (o.world) delete o.world.star;
    o.v = 35;
  }
  /* M2-12：藏身處併入營地。玩家自己回去（刷圖暫停）的旗標 'home' 改叫 'camp'；早期存檔殘留的場景欄位拿掉（場景一律從營地開始） */
  if (o.stopWhy === 'home') o.stopWhy = 'camp';
  delete o.scene;
  o.camp = { ...newCamp(), ...o.camp };
  o.camp.gen = { ...newCamp().gen, ...o.camp.gen };
  o.auto2 = { ...AUTO2(), ...o.auto2 };
  /* 道具編號接著存檔裡最大的往下編 */
  for (const it of [...Object.values(o.eq), o.curIt, ...o.inv.items, ...o.charms]) if (it && it.id > IID) IID = it.id;
  /* 之後新增的通貨鍵補 0、精髓表一定有 */
  o.mat = { ...newMat(), ...o.mat };
  o.mat.ess = o.mat.ess || {};
  o.mat.mats = o.mat.mats || {};
  o.prd = { ...PRD0(), ...o.prd };
  o.frags = { ...newFrags(), ...o.frags };
  /* 0.4.2：血霧滿了的舊存檔換 1 張血霧之印 */
  if (o.hunt && o.hunt.full) (o.frags.mist += 1), (o.hunt = newHunt());
  o.world = { ...newWorld(), ...o.world, seed: W_SEED };
  o.ptA = o.ptA || {};
  /* 存檔裡有樹上已經沒有的點（重烘過）或鎖住的點（2026-11-22 鏈錘、魔符叢集）也全部退回，不然算數值會壞 */
  if (o.pt.some(id => !PTREE.I[id] || PTREE.I[id].lock)) (o.pt = [...PT_START]), (o.ptA = {});
  /* 2026-11-22：鏈錘併進錘（裝備換成同階的單手錘）、鏈錘橫掃與轉圖騰拿掉（升過的退靈魂）、魔符藏起來（武器類別退回、魔符技能從技能欄拿下） */
  o.inv.items = o.inv.items.filter(it => !it.gem || SKILLS[it.gem] || SUPPORTS[it.gem] || AURAS[it.gem]);
  for (const it of [...Object.values(o.eq), o.curIt, ...o.inv.items])
    if (it && /^w_flail_/.test(it.b)) it.b = it.b.replace('flail', 'mace1');
  o.camp.wts = [...new Set(o.camp.wts.map(w => (w === 'flail' ? 'mace' : w)))].filter(w => !WT_HIDE.includes(w));
  if (!o.camp.wts.length) o.camp.wts = ['sword'];
  for (let l = 1; l < (o.lib.sk.chainsweep || 0); l++) o.mat.soul = (o.mat.soul || 0) + soulCost(l);
  delete o.lib.sk.chainsweep;
  delete o.lib.sup.totemc;
  for (const r of [...o.skills, ...o.auras]) {
    if (!r) continue;
    if (
      r.k &&
      ((!SKILLS[r.k] && !AURAS[r.k]) ||
        (SKILLS[r.k] && SKILLS[r.k].wt && SKILLS[r.k].wt.every(w => WT_HIDE.includes(w))))
    )
      r.k = null;
    if (r.so) r.so = r.so.map(k => (k && !SUPPORTS[k] ? null : k));
  }
  /* 0.5.2：過濾器刪了 */
  delete o.filter;
  /* 2026-11-21：手機橫向取消，舊存檔的橫向（l）一律改直立 */
  o.orient = 'p';
  /* 0.2.63：光環欄沒有格數，寶石排前面、尾巴留一個空格 */
  o.auras = [...(o.auras || []).filter(Boolean), null];
  /* 昇華不存在或點對不上（改過昇華的形狀）就退回 */
  const AT = o.asc && ascNodes(o.asc);
  if (!AT) (o.asc = null), (o.at = []);
  else if (!o.at.length || o.at.some(id => !AT.I[id]) || !ascFeasible(AT, o.at)) o.at = ['a_st'];
  ascSync(o);
  /* 副手不合規的（例：雙手劍配盾）收回倉庫 */
  if (o.eq.off && !offOK(o.eq.weapon, o.eq.off) && invPut(o.inv, o.eq.off)) o.eq.off = null;
  return o;
}
let HIDE_AT = 0;
function resize() {
  DPR = Math.min(2, devicePixelRatio || 1);
  IW = innerWidth;
  IH = innerHeight;
  /* M2-12：量安全區（CSS 的 --sat／--sab 可蓋過 env()，dbg.js 的 safeArea 用） */
  const sp = getComputedStyle($('safep'));
  SAFE.t = parseFloat(sp.paddingTop) || 0;
  SAFE.b = parseFloat(sp.paddingBottom) || 0;
  /* 直立：左右看得到約 10 格（480 px） */
  ZOOM = PORT() ? clamp(IW / 480, 0.6, 1.35) : 1.35;
  /* 直立（0.4.4）：倉庫清單一列 7 格，每格至少 44px */
  C = PORT() ? clamp(Math.floor((IW - 36) / 7), 44, 56) : 36;
  document.documentElement.style.setProperty('--cell', C + 'px');
  if (S) hudPanels();
  CV.width = Math.round(IW * DPR);
  /* 高度：直立的半版面板開著時只佔上半（hud.js 的 cvH／sheetSync） */
  HV.cvh = null;
  CV.height = Math.round(cvH() * DPR);
  if (S) sheetSync();
}
/* ---------- 開場之後（0.5.2：序章、NPC 對話、設施提示都刪了；intro.js 播完或跳過叫 proGive） ----------
   新存檔（S.fresh）拿到劍、記版本號；看過開場的直接給；沒看過的放開場（introGate） */
const PRO_VER = 1;
function proGive() {
  const fresh = !!S.fresh;
  if (fresh) (S.eq.weapon = mkItem('w_sword1_0', 1, 0)), delete S.fresh;
  S.story.intro = S.story.prologue = PRO_VER;
  ST = stats();
  hudBar();
  save();
  /* M1-01：新存檔拿到劍就用自動模式開刷第一個地點，不用點任何東西；舊存檔照舊（start() 的離線結算接著刷上次的地點） */
  if (fresh) (S.auto = 1), runNode(TRUNK_K[0]);
}
function proBoot() {
  if (S.story.intro === PRO_VER || S.story.prologue === PRO_VER) proGive();
  else introGate();
}
/* 跳過開場（測試工具也用） */
function proSkip() {
  introStop();
  proGive();
}
/* 換成另一份存檔（雲端較新、登入帳號）：跟重開網頁一樣，那份存檔在刷就回到它的地點接著刷（M2-25） */
function useSave(r) {
  introStop();
  S = migrate(r);
  enterCamp();
  applyOrient();
  fsApply();
  proBoot();
  comeBack(r.farm, r.offAt || r.savedAt || Date.now());
  save();
}
/* 重開網頁（M2-25，試玩報告 A4／B2）：上次關掉時在刷圖、或沒有自己按回營地 → 先結算離線、回到原地點接著刷，再出離線摘要
   （M3-04 選項 A：摘要後面已經在打）。手動模式也回去（摘要開著時世界照 M1-10 暫停）；離線輪數只算自動模式（offSettle）。
   原地點進不去了（裂口的血霧之印用完）就退回 wBack；產生器不管在不在刷都照產（0.5.1） */
function comeBack(farm, offAt) {
  const away = Date.now() - offAt,
    c = S.world.cur;
  if (c && wWhy(S, ...wXY(c)) && wBack(c)) S.world.cur = wBack(c);
  const k = S.world.cur,
    resume = (farm || !S.stopWhy) && k && !wWhy(S, ...wXY(k)),
    o = resume ? offSettle(away) : null,
    g = offGen(away);
  if (resume) runNode(k);
  offBack(o, g, away);
}
/* ---------- 測試入口（M1-24）：?test=dualweap／nearDeath／midgame／chase。每次載入照情境重建，存在 test_名字 存檔位、不連雲端 ----------
   build 在 hudInit 之前做存檔；go 在開場之後（已經看過開場）做要進場地、扣血的事 */
const TESTS = {
  /* 拿劍、斬擊＋幻影斬，倉庫有一把穿得上的短矛（M1-15） */
  dualweap: {
    build: s => {
      s.camp.altar = 1;
      s.skills[1] = { k: 'mirage', so: [null, null], n: 2 };
      s.lib.sk.mirage = 1;
      invPut(s.inv, mkItem('w_spear_0', 1, 0));
    },
    go: () => runNode(TRUNK_K[0])
  },
  /* 手動模式、在怪物 Lv 高很多的地點、生命 5%：一下就倒；營地的材料夠升好幾項（M1-17 死亡卡的升級鈕） */
  nearDeath: {
    build: s => {
      s.auto = 0;
      s.camp.watch = 6;
      s.mat.soul = 5000;
      s.mat.mats.wood = 2000;
      s.mat.mats['iron:1'] = 500;
    },
    go: () => {
      runNode(TRUNK_K[6]);
      P.hp = Math.max(1, Math.round(ST.hp * 0.05));
      for (const m of G.mobs) m.aggro = 1;
    }
  },
  /* 祭壇 6、鍛造台 10、瞭望台 8、斥候營 2、民房 5、倉房 2，產生器 20 級、角色 Lv 25（M1-07、M1-14 抽查後段的解鎖） */
  midgame: {
    build: s => {
      Object.assign(s.camp, { altar: 6, forge: 10, watch: 8, scout: 2, house: 5, store: 2 });
      for (const k of GEN_K) s.camp.gen[k] = { lv: 20, w: 0 };
      s.lv = 25;
      s.mat.soul = 3000;
    },
    go: () => runNode(TRUNK_K[8])
  },
  /* M2-18 追逐掉落：角色 Lv 70、營地滿、在第 15 個主幹地點（怪物 Lv48）；進場 1.5 秒後用開發觸發 devChase 掉一個王印 */
  chase: {
    build: s => {
      Object.assign(s.camp, { altar: 10, forge: 20, watch: CAMP.watch.length, scout: 5, house: 10, store: 5 });
      for (const k of GEN_K) s.camp.gen[k] = { lv: 20, w: 0 };
      s.lv = 70;
      s.chase.pts = 230;
    },
    go: () => {
      runNode(TRUNK_K[14]);
      setTimeout(() => devChase(), 1500);
    }
  }
};
function testSave(name) {
  const s = newGame(),
    T = TESTS[name];
  delete s.fresh;
  s.eq.weapon = mkItem('w_sword1_0', 1, 0);
  s.story.intro = s.story.prologue = PRO_VER;
  s.auto = 1;
  s.camp.gen = s.camp.gen || newCamp().gen;
  if (T) T.build(s);
  return s;
}
function start() {
  CV = $('cv');
  CX = CV.getContext('2d');
  resize();
  addEventListener('resize', resize);
  S = TEST ? testSave(TEST) : migrate(load());
  /* 離線結算要用的（enterCamp 之後存檔會蓋掉） */
  const farm = S.farm,
    offAt = S.offAt || S.savedAt || Date.now();
  ST = stats();
  hudInit();
  fsApply();
  enterCamp();
  inputInit();
  treeInit();
  touchInit();
  proBoot();
  cloudInit().then(remote => {
    if (remote && remote.v >= 10 && (remote.savedAt || 0) > (S.savedAt || 0)) {
      useSave(remote);
      hudWarn('已從雲端載入存檔');
    } else cloudPush();
  });
  setInterval(save, 10000);
  if (TEST) {
    ST = stats();
    popAssign();
    TESTS[TEST] ? TESTS[TEST].go() : hudWarn(`沒有「${TEST}」這個測試情境：dualweap、nearDeath、midgame、chase`);
    hudWarn(`測試入口：${TEST}（不存進正式存檔、不連雲端）`);
  } else comeBack(farm, offAt);
  /* 分頁切走、手機鎖螢幕：記時間，回來時結算（主迴圈停著，產生器也要補） */
  document.addEventListener('visibilitychange', () => {
    /* M2-12 §11-2：藏起來時聲音也停（AudioContext suspend），回來由 audioWake 恢復 */
    if (document.hidden) return (HIDE_AT = Date.now()), AC && AC.suspend(), save();
    if (AC && AC.state === 'suspended') AC.resume();
    if (HIDE_AT) {
      const t = Date.now() - HIDE_AT,
        o2 = G.scene === 'map' ? offSettle(t) : null,
        g2 = offGen(t);
      offBack(o2, g2, t);
    }
    HIDE_AT = 0;
  });
  requestAnimationFrame(frame);
  (window.requestIdleCallback || (f => setTimeout(f, 1500)))(treePrebuild, { timeout: 4000 });
  verCheck();
  document.addEventListener('visibilitychange', () => !document.hidden && G.scene === 'camp' && verCheck());
}
/* 新版上線後手機常拿到快取的舊 index.html（GitHub Pages 快取 10 分鐘、主畫面 App 更久）：
   問一次 version.json（不走快取），版本不同就換網址（加 v=）重新載入；已經換過就不再換，避免一直重載 */
function verCheck() {
  fetch('version.json?' + Date.now(), { cache: 'no-store' })
    .then(r => r.json())
    .then(j => {
      const u = new URL(location.href);
      if (!j.v || j.v === VER || u.searchParams.get('v') === j.v) return;
      save();
      u.searchParams.set('v', j.v);
      location.replace(u);
    })
    .catch(() => {});
}
start();
