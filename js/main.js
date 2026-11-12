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
  /* 道具編號接著存檔裡最大的往下編 */
  for (const it of [...Object.values(o.eq), o.curIt, ...o.inv.items, ...o.charms]) if (it && it.id > IID) IID = it.id;
  /* 之後新增的通貨鍵補 0、精髓表一定有 */
  o.mat = { ...newMat(), ...o.mat };
  o.mat.ess = o.mat.ess || {};
  o.prd = { ...PRD0(), ...o.prd };
  o.frags = { ...newFrags(), ...o.frags };
  o.world = { ...newWorld(), ...o.world, seed: W_SEED };
  o.ptA = o.ptA || {};
  /* 存檔裡有樹上已經沒有的點（重烘過）也全部退回，不然算數值會壞 */
  if (o.pt.some(id => !PTREE.I[id])) (o.pt = [...PT_START]), (o.ptA = {});
  if (!o.filter || !Array.isArray(o.filter.sets))
    o.filter = { cur: 0, sets: [fltTemplate(), fltTemplate2(), fltEmpty()] };
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
  (window.requestIdleCallback || (f => setTimeout(f, 1500)))(treePrebuild, { timeout: 4000 });
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
