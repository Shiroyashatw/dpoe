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
  S.savedAt = Date.now();
  try {
    localStorage.setItem(KEY + SLOT, JSON.stringify(S));
  } catch (e) {
    console.warn('存檔失敗', e);
  }
  if (typeof CLOUD !== 'undefined') CLOUD.dirty = true;
}
/* 存檔版本 S.v：10 是 0.2.0 重製（0.1 的存檔是 1～3，規則完全不同，直接開新角色） */
function migrate(s) {
  if (!s || !s.v || s.v < 10) return newGame();
  const o = { ...newGame(), ...s };
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
    o.auras = Array(AURA_SLOTS).fill(null);
    o.v = 13;
  }
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
  if (s.lib) s.lib = s.lib.map(k => GONE[k] || k);
  /* 道具編號接著存檔裡最大的往下編 */
  for (const it of [
    ...Object.values(o.eq),
    ...o.inv.items,
    ...o.stash.items,
    ...o.temp.items,
    ...o.skills.flatMap(k => [k.a, ...(k.s || []), ...((k.a && k.a.sup) || [])]),
    ...o.auras
  ])
    if (it && it.id > IID) IID = it.id;
  /* 0.2.6：輔助改插在技能寶石自己的孔裡（舊的技能欄輔助搬過去；沒有技能寶石的輔助收進背包）、材料頁、書庫 */
  o.mat = o.mat || newMat();
  /* 0.2.24：8 類碎片換成精粉（1 換 1），補上精粉、稀粉 */
  if (o.mat.sh) (o.mat.fine = Object.values(o.mat.sh).reduce((x, y) => x + y, 0)), delete o.mat.sh;
  o.mat.fine = o.mat.fine || 0;
  o.mat.rare = o.mat.rare || 0;
  const allGems = [
    ...o.skills.flatMap(k => [k.a, ...(k.s || [])]),
    ...o.auras,
    ...o.inv.items,
    ...o.stash.items
  ].filter(g => g && g.gem);
  /* 書庫：存檔原本的（不是新角色的預設）＋身上所有寶石 */
  o.lib = [...new Set([...(s.lib || []), ...allGems.map(g => g.gem)])];
  for (const it of [...o.inv.items, ...o.stash.items, ...o.skills.map(k => k.a)])
    if (it && SKILLS[it.gem] && !it.sup) (it.so = 2), (it.sup = [null, null]);
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
  /* 0.2.6：舊裝備補上品質 0、孔 0、潛能 3（不重骰，免得讀檔洗出好底材） */
  for (const it of [...Object.values(o.eq), ...o.inv.items, ...o.stash.items])
    if (it && !it.gem && it.q == null) Object.assign(it, { q: 0, so: 0, pot: 3 });
  /* 0.2.7（存檔 14）：暴擊詞分成武器的「暴擊率 +」（本地）和其他部位的「暴擊率提高」；護身符的物理傷害改成「物理傷害提高」；
     數值照同一個階級換到新的範圍（不重骰） */
  if (o.v < 14) {
    for (const it of [...Object.values(o.eq), ...o.inv.items, ...o.stash.items]) {
      if (!it || it.gem || !it.a) continue;
      const wpn = baseOf(it).k === 'weapon';
      for (const a of it.a) {
        const k = a.k === 'crit' && !wpn ? 'critInc' : a.k === 'dmgP' && baseOf(it).k === 'amulet' ? 'physP' : a.k;
        if (k !== a.k || (a.k === 'crit' && wpn)) {
          const [lo, hi] = tierRange(k, a.T || 12);
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
  /* 昇華不存在或點對不上（改過昇華的形狀）就退回 */
  const AT = o.asc && ascNodes(o.asc);
  if (!AT) (o.asc = null), (o.at = []);
  else if (!o.at.length || o.at.some(id => !AT.I[id]) || !ascFeasible(AT, o.at)) o.at = ['a_st'];
  /* 0.2.9：武器照 PoE2 的 18 種類別重做；舊底材換成同一族的新類別、最接近的階級（等級、稀有度、詞綴都保留） */
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
  C = TOUCH.on ? clamp(Math.floor(((NARROW ? innerWidth : innerWidth / 2) - 44) / 12), 26, 36) : 36;
  document.documentElement.style.setProperty('--cell', C + 'px');
  if (S) hudPanels();
  CV.width = Math.round(innerWidth * DPR);
  CV.height = Math.round(innerHeight * DPR);
}
/* 換成另一份存檔（雲端較新、登入帳號）：回藏身處重來 */
function useSave(r) {
  S = migrate(r);
  enterHideout();
  applyOrient();
  save();
}
function start() {
  CV = $('cv');
  CX = CV.getContext('2d');
  resize();
  addEventListener('resize', resize);
  S = migrate(load());
  ST = stats();
  hudInit();
  firstHint();
  enterHideout();
  inputInit();
  treeInit();
  touchInit();
  cloudInit().then(remote => {
    if (remote && remote.v >= 10 && (remote.savedAt || 0) > (S.savedAt || 0)) {
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
