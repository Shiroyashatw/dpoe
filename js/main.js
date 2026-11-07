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
  /* 序章裡 S 是臨時角色，寫進存檔的永遠是真的那份 */
  const s = PRO.real || S;
  s.savedAt = Date.now();
  try {
    localStorage.setItem(KEY + SLOT, JSON.stringify(s));
  } catch (e) {
    console.warn('存檔失敗', e);
  }
  if (typeof CLOUD !== 'undefined') CLOUD.dirty = true;
}
/* 存檔版本 S.v：10 是 0.2.0 重製（0.1 的存檔是 1～3，規則完全不同，直接開新角色） */
function migrate(s) {
  if (!s || !s.v || s.v < 10) return newGame();
  const o = { ...newGame(), ...s };
  if (!s.fresh) delete o.fresh;
  /* 存檔 11（0.2.2）：技能寶石、天賦樹、核心樹；0.2.1 以前固定的 5 招換成寶石 */
  if (s.v < 11) {
    o.skills = ['slash', 'blade', 'whirl', 'iai', 'storm'].map(g => ({ a: mkGem(g), s: [null, null] }));
    o.v = 11;
  }
  /* 存檔 12（0.2.3）：天賦樹換成一千多點的大樹，點數全部退回；核心樹改成昇華（到藏身處的昇華石碑選） */
  if (o.v < 12) {
    o.pt = [...PT_START];
    delete o.ct;
    o.v = 12;
  }
  /* 存檔 13（0.2.4）：天賦樹換成 18 條各不相同的路線（點數退回）；狂魔改成魔劍士、昇華圖案換新（昇華點退回）；光環欄 */
  if (o.v < 13) {
    o.pt = [...PT_START];
    o.auras = [null];
    o.v = 13;
  }
  /* 0.2.63（沒有換存檔版本，每次都補）：光環欄沒有格數，寶石排前面、尾巴留一個空格；舊的 3 格存檔照舊讀得到 */
  o.auras = [...(o.auras || []).filter(Boolean), null];
  /* 天賦樹的形狀換過（點的編號對不上）就把點數全部退回 */
  if (o.pt.some(id => !PTREE.I[id])) o.pt = [...PT_START];
  /* 0.2.11：刪掉的寶石換成同等級的替代（燕返→斬擊、飛刃與千本櫻→御劍訣、轉陷阱與轉地雷→轉圖騰） */
  const GONE = { swallow: 'slash', blade: 'flyswords', storm: 'flyswords', trapc: 'totemc', minec: 'totemc' };
  for (const g of [
    ...o.skills.flatMap(k => [k.a, ...(k.s || []), ...((k.a && k.a.sup) || [])]),
    ...o.inv.items,
    ...o.stash.items
  ])
    if (g && GONE[g.gem]) g.gem = GONE[g.gem];
  /* 道具編號接著存檔裡最大的往下編 */
  for (const it of [
    ...Object.values(o.eq),
    ...o.inv.items,
    ...o.stash.items,
    ...o.temp.items,
    ...o.skills.flatMap(k => [k.a, ...(k.s || []), ...((k.a && k.a.sup) || [])]),
    ...o.auras,
    ...o.auras.flatMap(g => (g && g.sup) || [])
  ])
    if (it && it.id > IID) IID = it.id;
  /* 0.2.6：輔助改插在技能寶石自己的孔裡（舊的技能欄輔助搬過去；沒有技能寶石的輔助收進背包）、材料頁、書庫 */
  o.mat = o.mat || newMat();
  /* 0.2.24：8 類碎片換成精粉（1 換 1），補上精粉、稀粉 */
  if (o.mat.sh) (o.mat.fine = Object.values(o.mat.sh).reduce((x, y) => x + y, 0)), delete o.mat.sh;
  o.mat.fine = o.mat.fine || 0;
  o.mat.rare = o.mat.rare || 0;
  delete o.lib; /* 0.2.35：寶石書庫早就不用了 */
  /* 0.2.57：光環寶石也有孔 */
  for (const it of [
    ...o.inv.items,
    ...o.stash.items,
    ...((o.temp && o.temp.items) || []),
    ...(o.gems || []),
    ...o.skills.map(k => k.a),
    ...o.auras
  ])
    if (it && (SKILLS[it.gem] || AURAS[it.gem]) && !it.sup) (it.so = 2), (it.sup = [null, null]);
  for (const k of o.skills) {
    if (k.s) {
      k.s.forEach((sp, j) => {
        if (!sp) return;
        if (k.a) k.a.sup[j] = sp;
        else if (!gridAuto(o.inv, sp)) gridAuto(o.stash, sp);
      });
      delete k.s;
    }
  }
  /* 0.2.6：舊裝備補上品質 0、孔 0、潛能 3（不重骰，免得讀檔洗出好基底） */
  for (const it of [...Object.values(o.eq), ...o.inv.items, ...o.stash.items])
    if (it && !it.gem && it.q == null) Object.assign(it, { q: 0, so: 0, pot: 3 });
  /* 0.2.7（存檔 14）：暴擊詞分成武器的「暴擊率 +」（本地）和其他部位的「暴擊率提高」；項鍊的物理傷害改成「物理傷害提高」；
     數值照同一個階級換到新的範圍（不重骰） */
  if (o.v < 14) {
    for (const it of [...Object.values(o.eq), ...o.inv.items, ...o.stash.items]) {
      if (!it || it.gem || !it.a) continue;
      const wpn = baseOf(it).k === 'weapon';
      for (const a of it.a) {
        const k = a.k === 'crit' && !wpn ? 'critInc' : a.k === 'dmgP' && baseOf(it).k === 'amulet' ? 'physP' : a.k;
        if (k !== a.k || (a.k === 'crit' && wpn)) {
          const [lo, hi] = tierRange(k, Math.ceil((a.T || 12) / 2));
          Object.assign(a, { k, v: Math.round((lo + hi) / 2) });
        }
      }
    }
    o.charms = [null, null, null];
    o.v = 14;
  }
  /* 存檔 15（0.2.17）：天賦樹照技能體系重做（編號一樣、內容換了），點數全部退回 */
  if (o.v < 15) {
    o.pt = [...PT_START];
    o.v = 15;
  }
  /* 存檔 16（0.2.22）：天賦樹照 PoE2 的幹道＋口袋重做，點數全部退回 */
  if (o.v < 16) {
    o.pt = [...PT_START];
    o.v = 16;
  }
  /* 存檔 17（0.2.23）：特色大點、基石改成改機制的，點數全部退回 */
  if (o.v < 17) {
    o.pt = [...PT_START];
    o.v = 17;
  }
  /* 存檔 18（0.2.25）：昇華重做（不分職業，直接選一個）；0.2.9 前的舊昇華不沿用 */
  if (o.v < 18) {
    o.asc = null;
    o.at = [];
    o.v = 18;
  }
  /* 存檔 19（0.2.35）：鑿孔石換成粉（小×30 粗粉、中×15 精粉、大×5 稀粉）、寶石搬進寶石頁、過濾器改成 3 組規則 */
  if (o.v < 19) {
    const dr = o.mat.drill || [0, 0, 0];
    o.mat.dust = (o.mat.dust || 0) + dr[0] * 30;
    o.mat.fine += dr[1] * 15;
    o.mat.rare += dr[2] * 5;
    delete o.mat.drill;
    o.gems = [];
    for (const g of [o.stash, o.temp]) {
      o.gems.push(...g.items.filter(it => it.gem));
      g.items = g.items.filter(it => !it.gem);
    }
    o.v = 19;
  }
  /* 存檔 20（0.2.40）：寶石等級改照 PoE2 的角色等級門檻；超過的降到能用的最高級，多的等級換回靈魂 */
  if (o.v < 20) {
    const cap = gemCap(o.lv || 1),
      seen = new Set(),
      walk = x => {
        if (!x || typeof x !== 'object' || seen.has(x)) return;
        seen.add(x);
        if (x.gem && x.lv > cap && x.lv <= GEM_MAX) {
          for (let l = cap; l < x.lv; l++) o.mat.soul = (o.mat.soul || 0) + soulCost(l);
          x.lv = cap;
        }
        for (const v of Array.isArray(x) ? x : Object.values(x)) walk(v);
      };
    walk([o.inv, o.stash, o.temp, o.gems, o.skills, o.auras]);
    o.v = 20;
  }
  /* 存檔 21（0.2.41）：詞綴 12 階改成 6 階；新的 Tn 剛好是舊的 T(2n−1)＋T(2n)，數值不用動 */
  if (o.v < 21) {
    for (const it of [...Object.values(o.eq), ...o.inv.items, ...o.stash.items, ...((o.temp && o.temp.items) || [])])
      if (it && !it.gem && it.a) for (const a of it.a) if (a.T) a.T = Math.ceil(a.T / 2);
    o.v = 21;
  }
  /* 存檔 22（0.2.42）：過路點改成「+5 能力值，自選其一」（S.ptA），天賦全部退點；裝備不動（不夠需求的會失效、顯示紅框） */
  if (o.v < 22) {
    o.pt = [...PT_START];
    o.v = 22;
  }
  /* 存檔 23（0.2.44）：死亡紅花刪除 */
  if (o.v < 23) {
    gemPurge(o, 'redbloom');
    o.v = 23;
  }
  /* 存檔 24：階級 1～16 換成世界地圖，地圖進度重置到劇情區第一個節點；等級、裝備、寶石不動，S.maxT 留作內部欄位 */
  if (o.v < 24) {
    o.world = newWorld();
    o.hunt = newHunt();
    o.cards = {};
    delete o.card;
    delete o.node;
    o.v = 24;
  }
  /* 存檔 25：天賦樹擴充，天賦點全部退回 */
  if (o.v < 25) {
    o.pt = [...PT_START];
    o.ptA = {};
    o.v = 25;
  }
  /* 存檔 26：天賦樹照 PoE2 重做（0.2.45，點的編號全部換了），天賦點全部退回 */
  if (o.v < 26) {
    o.pt = [...PT_START];
    o.ptA = {};
    o.v = 26;
  }
  /* 存檔 27：天賦樹解鎖預留叢集、新增 12 個主題（0.2.67，點的編號全部換了），天賦點全部退回 */
  if (o.v < 27) {
    o.pt = [...PT_START];
    o.ptA = {};
    o.v = 27;
  }
  /* 存檔 28：天賦樹第二刀重烘（0.2.68：全域防禦、換 23 個大點、效果歸位；點的編號沒變但 3302 個點的效果換了），天賦點全部退回 */
  if (o.v < 28) {
    o.pt = [...PT_START];
    o.ptA = {};
    o.v = 28;
  }
  o.ptA = o.ptA || {};
  /* 存檔裡有樹上已經沒有的點（重烘過）也全部退回，不然算數值會壞 */
  if (o.pt.some(id => !PTREE.I[id])) (o.pt = [...PT_START]), (o.ptA = {});
  /* 舊過濾器 { on, rules: [{ rar, gem }] } → 第 1 組：開著＝符合稀有度的自動撿，關著＝全部顯示；寶石不進過濾器了 */
  if (!o.filter || !Array.isArray(o.filter.sets)) {
    const f = s.filter,
      rar = (f && f.on && f.rules && f.rules[0] && f.rules[0].rar) || [];
    o.filter = { cur: 0, sets: [fltEmpty(), fltEmpty(), fltEmpty()] };
    if (rar.length) o.filter.sets[0].rules.push({ on: 1, c: { rar: rar.slice() }, act: 'pick', col: 0 });
  }
  /* 昇華不存在或點對不上（改過昇華的形狀）就退回 */
  const AT = o.asc && ascNodes(o.asc);
  if (!AT) (o.asc = null), (o.at = []);
  else if (!o.at.length || o.at.some(id => !AT.I[id]) || !ascFeasible(AT, o.at)) o.at = ['a_st'];
  ascSync(o);
  /* 0.2.9：武器照 PoE2 的 18 種類別重做；舊基底換成同一族的新類別、最接近的階級（等級、稀有度、詞綴都保留） */
  const OLDW = {
    sword1: ['w_katana', 'w_moon', 'w_demon'],
    sword2: ['w_nodachi', 'w_zanba', 'w_omono'],
    dagger: ['w_short', 'w_kris', 'w_kunai'],
    bow: ['w_bow', 'w_yumi', 'w_shigeto'],
    staff: ['w_rod', 'w_fuzue', 'w_bonerod'],
    wand: ['w_charm', 'w_flute', 'w_thunder'],
    spear: ['w_spear', 'w_trident', 'w_glaive'],
    qstaff: ['w_staff', 'w_ironstaff', 'w_demonstaff']
  };
  for (const it of [...Object.values(o.eq), ...o.inv.items, ...o.stash.items]) {
    if (!it || it.gem || it.charm) continue;
    if (it.b === 's_orb') it.b = 'f_orb';
    if (BASEI[it.b]) continue;
    const wt = Object.keys(OLDW).find(k => OLDW[k].includes(it.b));
    if (!wt) continue;
    const i = OLDW[wt].indexOf(it.b);
    it.b = `w_${wt}_${[0, 3, 5][i]}`;
  }
  /* 0.2.13：暴擊施放從 Meta 寶石改成輔助：技能欄裡「暴擊施放＋孔裡的法術」換成「那顆法術＋暴擊施放輔助」，
     背包、倉庫裡的暴擊施放拿出孔裡的寶石 */
  for (const k of o.skills) {
    const g = k.a;
    if (!g || g.gem !== 'cast_crit') continue;
    const sp = (g.sup || []).find(x => x && SKILLS[x.gem]);
    for (const x of g.sup || []) if (x && x !== sp && !gridAuto(o.inv, x)) gridAuto(o.stash, x);
    delete g.so, delete g.sup, delete g.en;
    if (sp) {
      sp.sup = sp.sup || [null, null];
      const j = sp.sup.indexOf(null);
      if (j < 0 && !gridAuto(o.inv, sp.sup[0])) gridAuto(o.stash, sp.sup[0]);
      sp.sup[Math.max(0, j)] = g;
      k.a = sp;
    } else if (!gridAuto(o.inv, g)) gridAuto(o.stash, g);
    if (!sp) k.a = null;
  }
  for (const it of [...o.inv.items, ...o.stash.items])
    if (it.gem === 'cast_crit' && it.sup) {
      for (const x of it.sup) if (x && !gridAuto(o.inv, x)) gridAuto(o.stash, x);
      delete it.so, delete it.sup, delete it.en;
    }
  /* 副手不合規的（例：雙手劍配盾）收回背包 */
  if (o.eq.off && !offOK(o.eq.weapon, o.eq.off) && gridAuto(o.inv, o.eq.off)) o.eq.off = null;
  return o;
}
let NARROW = false;
function resize() {
  DPR = Math.min(2, devicePixelRatio || 1);
  /* 手機：畫面高度看得到差不多的範圍；背包格子照寬度（夠寬就兩個面板並排） */
  NARROW = innerWidth < 800;
  /* 直立：左右看得到約 10 格（480 px）；橫向手機：照高度 */
  ZOOM = PORT() ? clamp(innerWidth / 480, 0.6, 1.35) : TOUCH.on ? clamp(innerHeight / 470, 0.72, 1.35) : 1.35;
  C = TOUCH.on ? clamp(Math.floor(((NARROW ? innerWidth : innerWidth / 2) - 50) / 12), 26, 36) : 36;
  document.documentElement.style.setProperty('--cell', C + 'px');
  if (S) hudPanels();
  CV.width = Math.round(innerWidth * DPR);
  CV.height = Math.round(innerHeight * DPR);
}
/* 換成另一份存檔（雲端較新、登入帳號）：回藏身處重來 */
function useSave(r) {
  proAbort();
  S = migrate(r);
  enterHideout();
  applyOrient();
  save();
  proBoot();
}
function start() {
  CV = $('cv');
  CX = CV.getContext('2d');
  resize();
  addEventListener('resize', resize);
  S = migrate(load());
  ST = stats();
  hudInit();
  enterHideout();
  inputInit();
  treeInit();
  touchInit();
  proBoot();
  cloudInit().then(remote => {
    if (remote && remote.v >= 10 && (remote.savedAt || 0) > ((PRO.real || S).savedAt || 0)) {
      useSave(remote);
      hudWarn('已從雲端載入存檔');
    } else cloudPush();
  });
  setInterval(save, 10000);
  requestAnimationFrame(frame);
  verCheck();
  document.addEventListener('visibilitychange', () => !document.hidden && G.scene === 'hide' && verCheck());
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
