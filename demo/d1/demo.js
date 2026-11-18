/* dpoe D1 展示頁（docs/production/specs/D1-demo-checklist.md）
   只讀假存檔（saves/*.json）與遊戲的圖集資料（js/art.js）、倉庫上限（js/items.js 的 INV_CAP），不跑遊戲邏輯。
   時間全用虛擬時鐘 NOW：平常跟著畫格走；?cap=1 時停住，由擷取腳本 demo.step() 一格一格推（60 fps 逐幀錄影）。
   網址參數：size、save、row、fs、en、rm、scn（動態腳本 V1–V9）、bare（只留畫面框）、cap */
'use strict';
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const CAP = Q.has('cap');
const LOG = [];
const log = (ev, x) => LOG.push(Object.assign({ t: Math.round(NOW * 100) / 100, ev }, x || {}));
let NOW = 0;

/* ---------- 尺寸 ---------- */
const SIZES = {
  '390x844': { w: 390, h: 844, port: 1, st: 47, sb: 34 },
  '390x763': { w: 390, h: 763, port: 1, st: 47, sb: 34, note: 'PWA' },
  '390x664': { w: 390, h: 664, port: 1, st: 0, sb: 0, note: '瀏覽器分頁' },
  '1280x720': { w: 1280, h: 720, port: 0, z: 1 },
  '1280x800': { w: 1280, h: 800, port: 0, z: 1.25, note: 'Deck ×1.25' }
};
const SAVES = ['new', 'mid', 'near', 'full', 'big', 'en'];
let SV = {},
  INV_CAP = 0,
  INV_SPARE = 0;

/* ---------- 狀態 ---------- */
const P = {
  size: Q.get('size') || '390x844',
  save: Q.get('save') || 'mid',
  row: Q.get('row') || 'H01',
  fs: Q.get('fs') === '1',
  en: Q.get('en') === '1',
  rm: Q.get('rm') === '1',
  scn: Q.get('scn') || ''
};
let S;
function fresh() {
  S = {
    scr: 'hud' /* hud | camp | sys */,
    panel: null /* camp | card | log | death | tree | forge | char | skill | more | list */,
    cardFac: null,
    pick: null,
    idleOpen: 0,
    idleT: -1e9,
    idleTouch: 0,
    spect: 0,
    dlg: null /* confirm | danger */,
    boss: 'none',
    bossT: -1e9,
    ultT: -1e9,
    ult: 0,
    hp: null,
    mpHot: 0,
    downT: -1e9,
    downN: 0,
    d3T: -1e9,
    fadeT: -1e9,
    feed: [],
    filter: 'rare',
    filtered: 0,
    pickT: -1e9,
    toast: null,
    awayT: -1e9,
    gainT: -1e9,
    campIn: -1e9,
    campSkip: 0,
    offT: -1e9,
    offOn: 0,
    offDone: 0,
    status: null,
    grid: null,
    sec: null,
    press: null,
    hold: null,
    holdTipT: -1e9,
    holdDone: null,
    drawerT: -1e9,
    drawerClose: -1e9,
    fieldPanel: 0,
    shakeT: -1e9,
    shakeEl: null,
    flipT: -1e9,
    pityT: -1e9,
    pity100: 0,
    stripT: -1e9,
    strip: 0,
    goalT: -1e9,
    sugT: -1e9,
    sugCan: 0,
    navIcon: 0,
    tip: null,
    idleMs: 0,
    bossHp: null,
    loc: null,
    dev: 'auto',
    log: []
  };
}
fresh();

/* ---------- 文字：中文原字、英文 +40% 假字 ---------- */
const EN = {
  角色: 'Hero',
  鍛造: 'Forge',
  技能: 'Skills',
  天賦: 'Talent',
  營地: 'Camp',
  更多: 'More',
  營地升級: 'Camp Upgrades',
  大招: 'Big attack',
  收下: 'Collect',
  地點: 'Maps',
  建議: 'Suggested',
  觀戰: 'Watch',
  收起: 'Collapse',
  展開: 'Expand',
  升級: 'Upgrade',
  取消: 'Cancel',
  回戰場: 'Back to field',
  回營地: 'Return to camp',
  本次收穫: 'This session',
  倉庫快滿: 'Stash almost full',
  掉落紀錄: 'Drop log',
  已經滿級: 'Max level',
  未出現: 'Not yet',
  夠: 'OK',
  需要: 'Need',
  現有: 'Have',
  設定: 'Settings',
  '營地中・戰鬥暫停、回來補算': 'In camp · combat paused, settled on return',
  '回營地？': 'Return to camp?',
  地上的東西照樣收下: 'Loot on the ground is still collected',
  '戰鬥暫停、回來補算': 'Combat pauses; settled when you return',
  '分解 3 件稀有以上？': 'Salvage 3 Rare+ items?',
  分解後拿回材料: 'You get materials back',
  按住: 'Hold',
  '按住 0.6 秒': 'Hold for 0.6 s',
  '王倒下・繼續刷': 'Boss down — farming on',
  觀戰中: 'Watching',
  打造: 'Craft',
  全部: 'All',
  稀有以上: 'Rare+',
  傳奇以上: 'Legendary+',
  掉落提示門檻: 'Drop alert threshold',
  文字大小: 'Text size',
  減少動態: 'Reduce motion',
  連續倒下: 'Repeated deaths'
};
const SYL = ['ka', 'ren', 'sho', 'mi', 'tal', 'vor', 'lin', 'du', 'pel', 'gra', 'nos', 'ith', 'ba', 'qui', 'ser', 'ox'];
const PUNC = {
  '・': ' · ',
  '，': ', ',
  '：': ': ',
  '（': ' (',
  '）': ')',
  '／': '/',
  '？': '?',
  '、': ', ',
  '「': '"',
  '」': '"',
  '。': '.',
  '－': '-'
};
const pseudo = s =>
  s
    .replace(/[㐀-鿿]+/g, w => {
      let o = '';
      for (const ch of w) o += SYL[ch.codePointAt(0) % SYL.length];
      return ' ' + o[0].toUpperCase() + o.slice(1) + ' ';
    })
    .replace(/[・，：（）／？、「」。－]/g, c => PUNC[c])
    .replace(/\s+/g, ' ')
    .trim();
const FILL = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor';
const pad = s => {
  const n = Math.ceil(s.length * 1.4) - s.length;
  return n > 1 ? s + ' ' + FILL.slice(0, n - 1).trim() : s;
};
/* 英文存檔（名詞表英文對照）：物品、設施、資源、地點、王、技能、介面字 */
Object.assign(EN, {
  木: 'Wood',
  百煉鋼: 'Tempered Steel',
  鞣皮: 'Tanned Hide',
  厚革: 'Thick Leather',
  彩絲: 'Dyed Silk',
  靈魂: 'Souls',
  金: 'Gold',
  玄鐵: 'Dark Iron',
  隕鐵: 'Meteoric Iron',
  崇高石: 'Exalted Orb',
  轉化石: 'Conversion Orb',
  預知石: 'Foresight Orb',
  增幅石: 'Augmentation Orb',
  蛻變石: 'Transmutation Orb',
  磨刀石: 'Whetstone',
  聖化石: 'Sanctify Orb',
  破裂石: 'Fracturing Orb',
  高階增幅石: 'Greater Aug. Orb',
  高階崇高石: 'Greater Exalted Orb',
  完美災魘石: 'Perfect Calamity Orb',
  追憶之墨: 'Ink of Remembrance',
  判官筆: "Judge's Brush",
  赤霄印: 'Crimson Sky Seal',
  疾霆印: 'Thunder Seal',
  歸墟印: 'Abyss Seal',
  鎮嶽印: 'Mountain Seal',
  林場: 'Lumber Yard',
  礦場: 'Mine',
  獵場: 'Hunting Ground',
  絲地: 'Silk Farm',
  鍛造台: 'Anvil',
  瞭望台: 'Watchtower',
  斥候營: 'Scout Camp',
  民房: 'Houses',
  祭壇: 'Altar',
  倉房: 'Storehouse',
  雪埋古道: 'Snowburied Road',
  凍河口: 'Frozen Estuary',
  冰封神殿: 'Frozen Temple',
  血原邊境: 'Bloodplain Border',
  裂口腹地: 'Rift Heartland',
  地層出口: 'Strata Exit',
  鬼門關: 'Ghost Gate',
  虎姑婆: 'Tiger Granny',
  鍾馗: 'Zhong Kui',
  高階通貨: 'higher-tier currency',
  開: 'open ',
  毒涎蛇姬: 'Venom Serpent Queen',
  連爆線: 'Blast Line',
  買得起: 'Affordable',
  分解: 'Salvage',
  '分解 3 件': 'Salvage 3',
  長按分解: 'Hold to salvage',
  長按重置天賦: 'Hold to reset talents',
  已確認: 'Confirmed',
  稀有: 'Rare',
  十字弓: 'Crossbow',
  腰帶: 'Belt',
  戒指: 'Ring',
  頭盔: 'Helmet',
  接下來: 'Next',
  下一個里程碑: 'Next milestone',
  下一件保底: 'Chase pity',
  離線結算: 'Offline summary',
  腐化: 'Corrupt',
  赤鐵十字弓: 'Red Iron Crossbow',
  淬鍊: 'Temper',
  '這裡不累積保底：怪物 Lv 45 以上的地點才會累積': 'No pity here: only areas with Monster Lv 45+ build it',
  '鍛造台 Lv13：破裂石開始掉': 'Anvil Lv13: Fracturing Orbs now drop',
  '祭壇 Lv7 開': 'Opens at Altar Lv7',
  '鍛造台 Lv15 開': 'Opens at Anvil Lv15',
  開下一個主幹地點: 'Opens the next main area',
  產量提高: 'Higher output',
  下一級的效果照解鎖表: 'Next level per unlock table',
  '本體屬 D2／D3；這裡只驗鍵盤焦點與換分頁': 'Body is D2/D3; only keyboard focus and tab switching here',
  '分解 3 件・拿回 崇高石 ×2': 'Salvaged 3 · got Exalted Orb ×2'
});
/* T(中文, 已知英文?)：英文存檔或英文假字模式回英文表（沒有就假字）；英文 +40% 再加長 */
function T(zh, en) {
  if (!P.en && P.save !== 'en') return zh;
  const s = en || EN[zh] || enAuto(zh);
  return P.en ? pad(s) : s;
}
/* 句子裡的名詞逐個換英文表，剩下的中文才用假字 */
function enAuto(zh) {
  const keys = Object.keys(EN).sort((a, b) => b.length - a.length);
  let s = zh;
  for (const k of keys) if (/[㐀-鿿]/.test(k) && s.includes(k)) s = s.split(k).join(' ' + EN[k] + ' ');
  return pseudo(s);
}
const pad0 = s => (P.en ? pad(s) : s);
const fmt = n => n.toLocaleString('en-US');
const esc = s =>
  String(s)
    .replace(/Lv (\d)/g, 'Lv\u00a0$1') /* N4：Lv 和數字用 U+00A0，不拆開 */
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const hm = m => (m >= 60 ? `${Math.floor(m / 60)} 時 ${String(m % 60).padStart(2, '0')} 分` : `${m} 分`);
const hmEn = m => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m} min`);

/* ---------- 圖示 ---------- */
const ICO = (() => {
  const s = d => `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true">${d}</svg>`;
  return {
    x: s('<path d="M4 4l8 8M12 4l-8 8"/>'),
    gem: s('<path d="M8 2l5 4.5L8 14 3 6.5z"/><path d="M3 6.5h10"/>'),
    tree: s(
      '<circle cx="8" cy="3.5" r="1.6"/><circle cx="3.5" cy="12" r="1.6"/><circle cx="12.5" cy="12" r="1.6"/><path d="M7 5l-2.6 5.6M9 5l2.6 5.6M5.1 12h5.8"/>'
    ),
    home: s('<path d="M2.5 8L8 3l5.5 5"/><path d="M4 7v6.5h8V7"/><path d="M6.5 13.5v-3.5h3v3.5"/>'),
    menu: s('<path d="M2.5 4h11M2.5 8h11M2.5 12h11"/>'),
    hero: s('<circle cx="8" cy="5" r="2.6"/><path d="M3 14c.6-3 2.6-4.6 5-4.6s4.4 1.6 5 4.6"/>'),
    hammer: s('<path d="M8.6 2.6l4.8 4.8-1.7 1.7-1.3-1.3-6 6-1.8-1.8 6-6-1.3-1.3z"/>'),
    prev: s('<path d="M10 3L5 8l5 5"/>'),
    next: s('<path d="M6 3l5 5-5 5"/>'),
    down: s('<path d="M3 6l5 5 5-5"/>'),
    up: s('<path d="M3 10l5-5 5 5"/>'),
    tick: s('<path d="M3 8.5l3.2 3L13 4.5"/>'),
    lock: s('<rect x="3.5" y="7.5" width="9" height="6.5" rx="1"/><path d="M5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2"/>'),
    warn: s('<path d="M8 2l6.5 12h-13z"/><path d="M8 6.5v3.5M8 12v.2"/>'),
    trash: s('<path d="M3 4.5h10M6 4.5V3h4v1.5M4.5 4.5l.8 9h5.4l.8-9"/>'),
    flame: s(
      '<path d="M8 2c.7 2.7 3.3 3.3 3.3 6.7a3.3 3.3 0 0 1-6.6 0c0-2 1.3-2.7 1.3-4 .7.7 1.4 1.3 2 .7-.7-1.4-.7-2.7 0-3.4z"/>'
    ),
    plus: s('<path d="M8 3v10M3 8h10"/>'),
    drop: s('<path d="M8 2.5c2.5 3.2 4 5.3 4 7.2a4 4 0 0 1-8 0c0-1.9 1.5-4 4-7.2z"/>'),
    bolt: s('<path d="M9 1.5L4 9h4l-1 5.5L12 7H8z"/>')
  };
})();
/* 遊戲圖集（js/art.js）：只用 1 或 2 倍整數 */
function art(k, scale = 1) {
  const r = typeof ART !== 'undefined' && ART[k];
  if (!r) return '';
  const url = '../../' + ART_SHEET[r[0]];
  return `<i class="art" data-art="${k}" style="width:${r[3] * scale}px;height:${r[4] * scale}px;background-image:url('${url}');background-position:-${r[1] * scale}px -${r[2] * scale}px;background-size:auto;${scale !== 1 ? `zoom:${scale};width:${r[3]}px;height:${r[4]}px;background-position:-${r[1]}px -${r[2]}px` : ''}"></i>`;
}
const IMGS = {};
function img(k) {
  if (IMGS[k]) return IMGS[k];
  const r = ART[k],
    im = new Image();
  im.src = '../../' + ART_SHEET[r[0]];
  return (IMGS[k] = { im, r });
}
const HERO = new Image();
/* 主角幀（hero.png 0,80 的 80×80）不透明外框 x 23–55、y 18–63：可見中心 (39, 41)，畫在鏡頭中心上（V9 量的是這個點） */
const HERO_C = [39, 41];
HERO.src = '../../img/hero.png';
const FLOOR = { ice: new Image(), tomb: new Image() };
FLOOR.ice.src = '../../img/tiles/ice-floor.d57a67ce.png';
FLOOR.tomb.src = '../../img/tiles/tomb-floor.97f02568.png';
const CAMPBG = new Image();
CAMPBG.src = '../../img/hide-scene.cf31b881.png';

/* ---------- 存檔讀值（缺欄＝9b 的「—」，改用中期，控制列標出） ---------- */
let MISS = [];
function D(k) {
  const s = SV[P.save].d;
  if (s[k] !== undefined && s[k] !== null) return s[k];
  if (!MISS.includes(k)) MISS.push(k);
  return SV.mid.d[k];
}
const ENV = k => (P.save === 'en' && SV.en.d.en[k]) || null;
const isEN = () => P.save === 'en' || P.en;
const PREV = {
  雪埋古道: '凍河口',
  冰封神殿: '雪埋古道',
  血原邊境: '冰封神殿',
  裂口腹地: '血原邊境',
  地層出口: '地層出口'
};
const invN = () => {
  const i = D('inv');
  return i.n !== undefined ? i.n : INV_CAP - i.free;
};
const invNear = () => invN() >= INV_CAP * 0.9;
const loc = () => S.loc || D('area')[0];

/* ---------- 版面座標（清單第 1–5 節的位置） ---------- */
function geo() {
  const z = SIZES[P.size],
    W = z.port ? z.w : z.w / z.z,
    H = z.port ? z.h : z.h / z.z;
  const g = { W, H, port: z.port, st: z.st || 0, sb: z.sb || 0 };
  if (z.port) {
    g.navTop = H - g.sb - 56;
    g.idleTop = g.navTop - 44;
    g.drawerH = Math.min(380, H - g.st - g.sb - 100 - 280);
    g.drawerTop = g.idleTop - g.drawerH;
    g.fieldTop = g.st;
    g.fieldBot = S.fieldPanel ? g.drawerTop : g.idleTop;
  } else {
    g.dy = H - 720;
    g.fieldTop = 0;
    g.fieldBot = H;
    g.colX = W - 16 - 420;
    g.colH = H - 76 - 108;
  }
  return g;
}
/* 面板蓋住戰場（直立）：抽屜滑完那一格才改戰場高 */
const panelOpen = () => !!S.panel && S.panel !== 'tree';
const fullPanel = () => S.panel === 'tree';

/* ---------- DOM ---------- */
const UI = () => $('ui');
const px = (x, y, w, h) =>
  `left:${x}px;top:${y}px;${w != null ? `width:${w}px;` : ''}${h != null ? `height:${h}px;` : ''}`;
const pxb = (x, b, w, h) =>
  `left:${x}px;bottom:${b}px;${w != null ? `width:${w}px;` : ''}${h != null ? `height:${h}px;` : ''}`;
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function build() {
  MISS = [];
  const g = geo(),
    z = SIZES[P.size],
    ui = UI(),
    vp = $('vp');
  vp.style.width = z.w + 'px';
  vp.style.height = z.h + 'px';
  ui.style.width = g.W + 'px';
  ui.style.height = g.H + 'px';
  ui.style.transform = z.port ? '' : `scale(${z.z})`;
  const b = document.body;
  b.classList.toggle('port', !!z.port);
  b.classList.toggle('touch', devTouch());
  b.classList.toggle('fs130', P.fs);
  b.classList.toggle('en', P.en);
  b.classList.toggle('lat', isEN());
  b.classList.toggle('rm', P.rm);
  document.documentElement.style.setProperty('--tscale', P.fs ? 1.3 : 1);
  const fk = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.k;
  let h = '';
  if (z.port)
    h += `<div class="safe" style="top:0;height:${g.st}px" data-l="安全區 ${g.st}"></div><div class="safe" style="top:${g.H - g.sb}px;height:${g.sb}px" data-l="安全區 ${g.sb}"></div>`;
  if (S.scr === 'sys') h += sysHTML(g);
  else if (S.scr === 'camp') h += campHTML(g);
  else h += hudHTML(g);
  if (S.scr !== 'sys' && !S.offOn && !(S.panel === 'tree' && z.port)) h += navHTML(g);
  if (S.offOn) h += offHTML(g);
  if (S.dlg) h += dlgHTML(g);
  if (S.toast) h += toastHTML(g);
  if (S.grid) h += gridHTML(g);
  ui.innerHTML = h;
  navFit();
  resFit();
  idleFit();
  mainFit();
  plqFit();
  drawerFit();
  stackTop();
  stackBottom();
  if (fk) {
    const f = ui.querySelector(`[data-k="${fk}"]`);
    if (f) f.focus({ preventScroll: true });
  }
  note();
  tick(0);
}
function note() {
  const r = ROWS.find(r => r.id === P.row);
  let s = r ? `<b>${r.id}</b> ${esc(r.t)}` : '';
  if (MISS.length) s += `　<b>缺欄</b>（9b 為「—」）沿用中期：${MISS.join('、')}`;
  if (r && r.nv) s += `　<b>demo 未驗，進遊戲量</b>：${esc(r.nv)}`;
  s += `　<b>第 21 項 王印圖示</b>：${WY_TIP}`;
  $('c-note').innerHTML = s;
}
const devTouch = () => (S.dev === 'auto' ? !!SIZES[P.size].port : S.dev === 'touch');
const kc = k => (devTouch() ? '' : `<span class="kc">${k}</span>`);

/* ---------- 戰鬥 HUD ---------- */
function hudHTML(g) {
  const sv = D('area'),
    life = D('life'),
    port = g.port;
  let h = '';
  if (S.panel === 'tree') return panelHTML(g);
  const areaTxt = ENV('area') || `${loc()}・${sv[1]}★・怪物 Lv ${sv[2]}`;
  const T2 = (ENV('area') ? pad0(areaTxt) : T(areaTxt))
    .replace(/(怪物|Monster) Lv /g, '$1\u00a0Lv\u00a0')
    .replace(/Lv /g, 'Lv\u00a0'); /* 「怪物 Lv 48」不拆行 */
  const spect = S.spect;
  /* 低血邊：放第一個（戰場畫布之上、HUD 之下） */
  h += `<div class="ab vign" id="d-vign" style="${px(0, g.fieldTop, g.W, g.fieldBot - g.fieldTop)}"></div>`;
  /* 資訊列 */
  h += port
    ? `<div class="ab plate area" data-m="H02" data-hud data-role="body" style="${px(8, g.st + 5, null, null)}max-width:242px;min-height:28px"><span class="t">${esc(T2)}</span></div>`
    : `<div class="ab plate area" data-m="H02" data-hud data-role="body" style="${px(16, 10, null, 52)}max-width:324px"><span class="t">${esc(T2)}</span></div>`;
  if (spect) {
    h += `<div class="ab plate spect" data-m="spect" style="${port ? px(8, g.fieldBot - 52, 374, 44) : px(480, 76, 320, 44)}">${esc(T('觀戰中'))}・Esc ${esc(T('回戰場'))}</div>`;
    return h + fieldOverlays(g);
  }
  /* 離王進度／王橫幅／王血條 */
  const bx = port ? 8 : 360,
    bw = port ? 282 : Math.min(480, g.W - 16 - 416 - 16 - 360),
    by = port ? g.st + 39 : 20;
  if (S.boss === 'none') {
    const pr = D('boss').prog,
      lab = ENV('prog') && isEN() ? ENV('prog') : `王 ${pr}%`;
    h += `<div class="ab prog" data-m="H03" data-hud style="${px(bx, by, bw, port ? 20 : 22)}"><b data-role="label">${esc(isEN() ? pad0(lab.replace('王', 'Boss')) : lab)}</b><div class="bar"><i style="width:${pr}%"></i></div></div>`;
  } else {
    const bn = D('boss').name,
      nm = ENV('bossName') && isEN() ? ENV('bossName') : bn,
      hp = S.bossHp != null ? S.bossHp : D('boss').hp[0];
    h += `<div class="ab boss" id="d-boss" data-m="H05" data-hud style="${px(bx, by, bw, port ? 20 : 22)}"><i class="bf" style="width:${hp}%"></i><span class="bt" data-role="label"><span class="bn ell">${esc(ENV('bossName') ? pad0(nm) : T(nm))}</span><span class="bp num">${hp}%</span></span><span class="bsh hide">${esc(T(bn + '現身', nm + ' appears'))}</span></div>`;
  }
  /* 大招警示 */
  h += `<div class="ab ult hide" id="d-ult" data-m="H06" data-hud data-role="body" style="${port ? px(8, g.st + 63, 190, 28) : px(520, 48, 240, 32)}">${ICO.warn}<span class="ell">${esc(T('大招'))}・${esc(T('連爆線'))}</span></div>`;
  /* 掉落動態 */
  const fRows = feedCap(),
    rowH = port ? (P.fs ? 34 : 26) : P.fs ? 36 : 28;
  h += `<div class="ab feed" id="d-feed" data-m="H07" data-hud data-hit="feed" role="button" tabindex="0" aria-label="${esc(T('掉落紀錄'))}" data-k="feed" style="${port ? px(202, g.st + 101, 176, null) : px(16, 76, 300, null)}min-height:${Math.max(44, rowH)}px" data-rows="${fRows}"></div>`;
  /* 狀態圖示、生命／魔力、技能 */
  const stY = port ? (S.fieldPanel ? g.fieldBot - 58 : g.fieldBot - 138) : 560 + g.dy,
    stX = port ? 8 : Math.min(400, g.colX - 16 - 380);
  h += `<div class="ab sts" data-m="H17" data-hud style="${px(stX, stY, port ? 220 : 380, 24)}">${statusHTML()}</div>`;
  const dx = port ? 400 : Math.min(400, g.colX - 16 - 380),
    lx = port ? 8 : dx,
    lw = port ? 374 : 380,
    lb = port
      ? S.fieldPanel
        ? g.H - g.fieldBot
        : S.idleOpen
          ? g.H - (g.idleTop + 44 - 200) /* 展開的掛機條 554–754：生命／魔力條移到上緣 524–554 */
          : g.H - g.fieldBot + 79
      : 100;
  const hpv = S.hp != null ? S.hp : life[0] / life[1];
  h += `<div class="ab lifebox" data-m="H13" data-hud style="${pxb(lx, lb, lw, null)}">
    <div class="lb hp" style="height:${P.fs ? 'auto' : '16px'}"><i id="d-hpf" style="width:${hpv * 100}%"></i><span data-role="num" id="d-hpt">${fmt(Math.round(life[1] * hpv))}／${fmt(life[1])}</span></div>
    <div class="lb mp${S.mpHot ? ' hot' : ''}" id="d-mp" style="height:${P.fs ? 'auto' : '13px'}"><i style="width:${(life[2] / life[3]) * 100}%"></i><span data-role="num">${fmt(life[2])}／${fmt(life[3])}</span></div></div>`;
  if (!(port && S.fieldPanel)) h += skillsHTML(g);
  /* 倒下字板、連死 3 次 */
  h += `<div class="ab dplate hide" id="d-dplate" data-m="H20" data-hud data-role="body" style="${port ? px(8, g.fieldBot - 260, 374, 44) : px(440, 430 + g.dy, 400, 44)}"></div>`;
  const dd = D('deaths');
  const d3y = port ? (S.fieldPanel ? g.fieldBot - 120 : g.fieldBot - 198) : 488 + g.dy;
  h += `<div class="ab d3 hide" id="d-d3" data-m="H21" data-hud data-hit="d3" role="button" tabindex="0" data-k="d3" style="${port ? px(8, d3y, 374, null) : px(400, d3y, 480, null)}min-height:52px"><b>${esc(T(`連續倒下 3 次・退回${PREV[loc()] || loc()}接著刷`))}</b><span class="ell"><span class="em">${ICO.bolt}</span> ${esc(T(dd.most || SV.mid.d.deaths.most))}</span></div>`;
  if (!port && !S.panel)
    h += `<canvas class="ab mini" id="d-mini" data-m="minimap" data-hud width="164" height="104" style="${px(g.W - 8 - 164, g.H - 8 - 104, 164, 104)}"></canvas>`;
  h += idleHTML(g);
  h += fieldOverlays(g);
  if (S.panel) h += panelHTML(g);
  return h;
}
function fieldOverlays(g) {
  return `<div class="ab" id="d-fade" style="${px(0, 0, g.W, g.H)}background:#000;opacity:0;pointer-events:none;z-index:30"></div>`;
}
function statusHTML() {
  const st = S.status || D('status'),
    L = [];
  for (let i = 0; i < st.buff; i++)
    L.push(
      `<span class="st" title="增益" data-role="icon">${[ICO.plus, ICO.flame, ICO.gem, ICO.tick][i % 4]}<i style="width:${20 - i * 2}px"></i></span>`
    );
  for (let i = 0; i < st.debuff; i++)
    L.push(
      `<span class="st de" title="減益" data-role="icon">${[ICO.drop, ICO.bolt, ICO.lock][i % 3]}<i style="width:${14 + i}px"></i></span>`
    );
  const show = L.slice(0, 8);
  if (L.length > 8) show.push(`<span class="st more" data-role="label">+${L.length - 8}</span>`);
  return show.join('');
}
function skillsHTML(g) {
  const sk = D('skills'),
    port = g.port,
    sz = port ? 56 : 52,
    keys = isEN() ? ['LMB', 'RMB', 'Q', 'E', 'R'] : ['左', '右', 'Q', 'E', 'R'],
    enN = ENV('skills');
  let h = `<div class="ab sks" data-m="H18" data-hud style="${port ? px(35, g.fieldBot - 66, 320, 56) : px(Math.max(412, Math.min(400, g.colX - 16 - 380) + 20), 630 + g.dy, 300, 52)}">`;
  sk.forEach((s, i) => {
    if (s.off) {
      h += `<button class="sk off" data-hit="sk" data-k="sk${i}" style="width:${sz}px;height:${sz}px" aria-label="${esc(T(s.off))}" aria-disabled="true">${kc(keys[i])}<span class="lk" data-role="label">${ICO.lock}${esc(s.off.match(/Lv\d+/)[0])}</span></button>`;
      return;
    }
    let ex = '';
    if (s.ammo)
      ex += `<span class="cnt" data-role="label">${s.ammo[0]}</span><span class="pips">${Array.from({ length: s.ammo[1] }, (_, j) => `<i class="${j < s.ammo[0] ? 'on' : ''}"></i>`).join('')}</span>`;
    if (s.cd)
      ex += `<span class="cdv" style="height:${(s.left / s.cd) * 100}%"></span><span class="cdt num">${s.left}</span>`;
    if (s.next) ex += `<span class="cdv" style="height:40%"></span>`;
    /* 蓄力段：右上「n 段」、下緣每段一格，正在蓄的那格照進度填（#8 H19_charge） */
    if (s.charge)
      ex += `<span class="chg" style="height:${s.charge[2] * 100}%"></span><span class="cnt" data-role="label">${s.charge[0]}${isEN() ? '' : '段'}</span><span class="pips">${Array.from({ length: s.charge[1] }, (_, j) => `<i class="${j < s.charge[0] ? 'on' : ''}" style="${j === s.charge[0] ? `background:linear-gradient(to right, var(--ready) ${s.charge[2] * 100}%, transparent 0)` : ''}"></i>`).join('')}</span>`;
    /* 藥劑：右上剩幾次、下緣每次一格；生效中 2 px --good 框＋剩餘時間條（#8 H19_flask） */
    if (s.flask)
      ex += `<span class="cnt" data-role="label">${s.flask[0]}</span><span class="pips">${Array.from({ length: s.flask[1] }, (_, j) => `<i class="${j < s.flask[0] ? 'on' : ''}"></i>`).join('')}</span>${s.flask[2] ? `<span class="fla" style="width:${s.flask[2] * 100}%"></span>` : ''}`;
    const nm = enN && isEN() ? enN[i] : s.n;
    h += `<button class="sk${s.flask && s.flask[2] ? ' act' : ''}" data-hit="sk" data-k="sk${i}" style="width:${sz}px;height:${sz}px" aria-label="${esc(enN && isEN() ? pad0(nm) : T(nm))}">${art(s.ic)}${kc(keys[i])}${ex}</button>`;
  });
  return h + '</div>';
}

/* 稀有度記號：◆ 稀有、◈ 傳奇、追逐＝王印 16 圖示（掉落動態、掉落紀錄、掛機條同一份） */
const CHASE_IC = {
  赤霄印: 'wangyin_chixiao_16',
  疾霆印: 'wangyin_jiting_16',
  歸墟印: 'wangyin_guixu_16',
  鎮嶽印: 'wangyin_zhenyue_16'
};
const chaseIc = name => CHASE_IC[Object.keys(CHASE_IC).find(k => String(name).startsWith(k))] || 'wangyin_guixu_16';
/* 第 21 項（製作人 23:08 裁定）：暫用現有圖示，16px 新圖等美術復工。
   原圖 1×（不縮放）取不透明外框，置中放進 16×16 框；框 1 px --rar-chase，不用 ★ */
const WY_TIP = '暫用現有圖示，16px 新圖等美術復工';
const WY_BOX = { wangyin_jiting_16: [2, 1, 11, 13] }; /* 量 img/ic_wy16 alpha 外框；其餘三張 [2, 1, 12, 14] */
function wy(k) {
  const r = typeof ART !== 'undefined' && ART[k];
  if (!r) return '';
  const [x, y, w, h] = WY_BOX[k] || [2, 1, 12, 14];
  return `<span class="wy" data-wy="${k}" title="${WY_TIP}"><i class="art" style="width:${w}px;height:${h}px;background-image:url('../../${ART_SHEET[r[0]]}');background-position:-${r[1] + x}px -${r[2] + y}px"></i></span>`;
}
const mark = (rar, ic, name) =>
  rar === 'rare'
    ? '<span class="mk">◆</span>'
    : rar === 'leg'
      ? '<span class="mk">◈</span>'
      : rar === 'chase'
        ? wy(ic || chaseIc(name))
        : '';
/* 追逐短格式：「赤霄印・王印 2／4」→「赤霄印 2/4」 */
const chaseShort = s => {
  const m = String(s).match(/^(.*?)・?王印 (\d+)／(\d+)$/);
  return m ? `${m[1] ? m[1] + ' ' : ''}${m[2]}/${m[3]}` : s;
};

/* 掛機條（I01–I06、C09） */
function idleHTML(g) {
  const port = g.port,
    open = S.idleOpen,
    w = port ? g.W : 380,
    camp = S.scr === 'camp';
  const x = port ? 0 : 16,
    bot = port ? g.H - g.idleTop - 44 : 16;
  const idleM = D('idle'),
    kills = D('kills'),
    pity = D('pity'),
    goal = D('goal');
  const near = invNear();
  let lt;
  if (camp) lt = T('營地中・戰鬥暫停、回來補算');
  else if (near) lt = isEN() ? pad0(ENV('stash') || `Stash almost full: ${INV_CAP - invN()} slots left`) : '倉庫快滿';
  else lt = isEN() ? (P.save === 'en' ? ENV('idle').split(' · ')[0] : `Idle ${hmEn(idleM)}`) : `掛機 ${hm(idleM)}`;
  if (P.en && !camp && !near) lt = pad(lt);
  const pityHTML =
    pity == null || camp
      ? ''
      : `<span class="ipb${pity >= 100 ? ' full' : ''}" data-m="I06" data-role="label">${esc(isEN() ? (pity >= 100 && ENV('pityShort') ? ENV('pityShort') : `Pity ${pity}%`) : `保底 ${pity}%`)}<span class="pb"><i style="width:${pity}%"></i></span></span>`;
  const rc = D('recent'),
    last = rc && rc[0];
  const lastHTML =
    !last || camp
      ? ''
      : `<span class="ilast r-${last[1]}">${mark(last[1], last[2])}<span class="lt">${esc(isEN() && ENV('recent') ? pad0(ENV('recent')[0]) : T(chaseShort(last[0])))}</span><span class="lq hide">×1</span></span>`;
  const gp = goal.pct;
  let h = `<div class="ab idle" id="d-idle" data-m="${open ? 'I02' : camp ? 'C09' : 'I01'}" ${open ? 'data-over' : 'data-hud'} style="${pxb(x, bot, w, null)}height:${open ? 200 : port ? 44 : 40}px;z-index:12">
    <div class="gs" data-m="goalstrip" style="${port ? '' : 'width:380px'}"><i id="d-gs" style="width:${gp}%"></i></div>`;
  if (!open) {
    h += `<div class="ir" style="top:0"><button class="ib kf" data-hit="idle" data-k="idle" aria-expanded="false" aria-label="${esc(T('展開'))}"><b class="${near && !camp ? 'warn' : ''}" data-role="body" id="d-idlet">${esc(lt)}</b>${pityHTML}${lastHTML}</button>
      <button class="x44 kf" data-hit="idlex" data-k="idlex" aria-label="${esc(T('展開'))}" style="height:${port ? 44 : 40}px">${ICO.up}</button></div>`;
  } else {
    const rcT = (rc || [])
      .map(
        (r, i) =>
          `<span class="r-${r[1]}">${mark(r[1], r[2])} ${esc(isEN() && ENV('recent') ? pad0(ENV('recent')[i]) : T(r[0]))}</span>`
      )
      .join('　');
    const killsT = isEN()
      ? ENV('idle') || `Idle ${hmEn(idleM)} · ${kills} boss kills`
      : `掛機 ${hm(idleM)}・打倒王 ${kills} 次`;
    const goalT =
      gp >= 100
        ? T(`可以解鎖：${goal.name.split('・')[1] || goal.name}`)
        : isEN() && ENV('goal')
          ? ENV('goal')
          : T(`下一個：${goal.short || goal.name.split('・')[1]}・${fmt(goal.have)}/${fmt(goal.need)} ${goal.res}`);
    const pityT =
      pity == null
        ? T('這裡不累積保底：怪物 Lv 45 以上的地點才會累積')
        : isEN()
          ? ENV('pity') || `Chase pity ${pity}%`
          : `下一件保底 ${pity}%`;
    h += `<div class="ex">
      <div class="er"><b data-role="body" class="ell">${esc(pad0(killsT))}</b><span></span><button class="x44 kf" data-hit="spect" data-k="spect" aria-label="${esc(T('觀戰'))}">${ICO.hero}</button><button class="x44 kf" data-hit="idlex" data-k="idlex" aria-expanded="true" aria-label="${esc(T('收起'))}">${ICO.down}</button></div>
      <div class="er"><span data-role="body" class="${pity >= 100 ? 'r-chase' : ''}">${esc(pityT)}</span></div>
      <div class="er"><span data-role="body">${esc(T('本次收穫'))}：${rcT || '—'}</span></div>
      <div class="er go kf" data-hit="goal" data-k="goal" role="button" tabindex="0"><span data-role="body" id="d-goalt">${esc(goalT)}</span></div></div>`;
  }
  h += `<div class="away hide" id="d-away" data-m="I05" data-role="body"></div></div>`;
  /* 回戰場「營地期間 +N」蓋在掛機條上 */
  h += `<div class="ab cgain hide" id="d-cgain" data-m="C10" data-role="body" style="${pxb(x, bot, w, port ? 44 : 40)}z-index:13"></div>`;
  return h;
}

/* ---------- 分頁（C01、K01、K03、K04、K08） ---------- */
const TABS = [
  ['char', 'hero', '角色', 'V', 'Hero'],
  ['forge', 'hammer', '鍛造', 'K', 'Forge'],
  ['skill', 'gem', '技能', 'G', 'Skills'],
  ['tree', 'tree', '天賦', 'P', 'Talent'],
  ['camp', 'home', '營地', 'H', 'Camp'],
  ['more', 'menu', '更多', 'Z', 'More']
];
const tabOn = () => (S.panel === 'card' || S.panel === 'camp' ? 'camp' : S.panel);
function navHTML(g) {
  const port = g.port,
    on = tabOn(),
    cans = campCanCount(),
    goalDone = D('goal').pct >= 100;
  let h = port
    ? `<div class="ab tabs" id="d-tabs" role="tablist" data-m="C01" data-hud style="${px(0, g.navTop, 390, 56)}z-index:14">`
    : `<div class="ab tabs" id="d-tabs" role="tablist" data-m="C01" data-hud style="${px(g.W - 16 - 416, 10, 416, 52)}z-index:14">`;
  TABS.forEach(([k, ic, n, key, en]) => {
    const lab = isEN() ? pad0(en) : n;
    h += `<button class="tab kf" role="tab" data-hit="tab" data-k="tab-${k}" data-tab="${k}" aria-selected="${on === k}" aria-label="${esc(lab)}" style="width:${port ? 65 : 66}px;height:${port ? 56 : 52}px"><span class="tico">${ICO[ic]}${k === 'camp' && goalDone ? '<span class="dot" data-m="goaldot"></span>' : ''}</span><span class="l" data-role="label">${esc(lab)}</span>${port ? '' : kc(key)}${k === 'camp' && cans ? `<span class="bdg" data-m="badge" data-role="label">${cans}</span>` : ''}</button>`;
  });
  h += '</div>';
  if (S.tip) h += `<div class="ab navtip" style="${px(S.tip.x, S.tip.y)}">${esc(S.tip.t)}</div>`;
  return h;
}
/* 掛機條放不下：先拿掉保底小條 → 拿掉最近一筆 → 左字換兩行（不縮字） */
function idleFit() {
  const ib = document.querySelector('#d-idle .ib');
  if (!ib) return;
  const over = () => ib.scrollWidth > ib.clientWidth + 1;
  const pb = ib.querySelector('.pb'),
    la = ib.querySelector('.ilast'),
    b = ib.querySelector('b');
  if (over() && pb) pb.classList.add('hide');
  /* 最近一筆：看得到的字少於 4 個就只留記號＋數量（例「◆ ×1」） */
  const lt = la && la.querySelector('.lt');
  if (lt && lt.scrollWidth > lt.clientWidth + 1) {
    const n = lt.textContent.length,
      vis = Math.floor((lt.clientWidth / lt.scrollWidth) * n) - 1; /* 省略號佔一個字 */
    if (vis < 4) lt.classList.add('hide'), la.querySelector('.lq').classList.remove('hide');
  }
  if (over() && la) la.classList.add('hide');
  if (over() && b) (b.style.whiteSpace = 'normal'), (b.style.flex = '1 1 auto'), (b.style.lineHeight = '1.15');
}
/* 文字放大時生命條往上長：狀態圖示、倒下一行跟著往上讓 */
function stackBottom() {
  const lb = document.querySelector('[data-m="H13"]'),
    st = document.querySelector('[data-m="H17"]');
  if (!lb || !st) return;
  const top = lb.offsetTop - 4 - 24;
  if (st.offsetTop > top) st.style.top = top + 'px';
  const d3 = $('d-d3'),
    hid = d3 && d3.classList.contains('hide');
  if (hid) d3.classList.remove('hide');
  if (d3 && d3.offsetTop + d3.offsetHeight > st.offsetTop - 8) d3.style.top = st.offsetTop - 8 - d3.offsetHeight + 'px';
  if (hid) d3.classList.add('hide');
}
/* 資訊列長成 2 行時，下面的離王進度／王血條、大招、掉落動態一起往下讓 */
function stackTop() {
  const a = document.querySelector('[data-m="H02"]');
  if (!a) return;
  const g = geo(),
    bottom = a.offsetTop + a.offsetHeight,
    want = (g.port ? g.st + 39 : 20) - 6;
  if (!g.port || bottom <= want) return;
  const d = bottom - want;
  for (const id of ['d-boss', 'd-ult', 'd-feed']) {
    const e = $(id);
    if (e) e.dataset.dy = d;
  }
  const pr = document.querySelector('[data-m="H03"]');
  if (pr) pr.style.top = pr.offsetTop + d + 'px';
  for (const id of ['d-ult', 'd-feed']) {
    const e = $(id);
    if (e) e.style.top = e.offsetTop + d + 'px';
  }
}
/* 營地主鈕：一行放不下（地點名被砍到看不出來）就換兩行：動詞一行、地點一行，高 56→64，下緣不動 */
function mainFit() {
  const c = document.querySelector('[data-m="C08"]'),
    b = c && c.querySelector('[data-k="cgo"]'),
    pl = b && b.querySelector('.pl');
  if (!pl || pl.scrollWidth <= pl.clientWidth + 1) return;
  b.classList.add('two');
  c.style.height = '64px';
  for (const x of c.querySelectorAll('.btn')) x.style.minHeight = '64px';
  c.style.top = c.offsetTop - 8 + 'px';
}
/* N1：牌匾（直立最寬 160、桌機 220，字換兩行）互相隔 ≥ 8 px，放不下就往下排；
   排到主鈕列上方 8 px 還放不下，就收進邊緣箭頭「› n」 */
function plqFit() {
  const L = [...UI().querySelectorAll('.plq')].sort((a, b) => a.offsetTop - b.offsetTop || a.offsetLeft - b.offsetLeft),
    cm = UI().querySelector('[data-m="C08"]'),
    edge = UI().querySelector('[data-m="edge"]');
  if (!L.length || !cm) return;
  const hit = (a, b) => a.x < b.x + b.w + 8 && b.x < a.x + a.w + 8 && a.y < b.y + b.h + 8 && b.y < a.y + a.h + 8,
    eb = (([x, y, w, h]) => ({ x, y, w, h }))(['left', 'top', 'width', 'height'].map(k => parseFloat(edge.style[k])));
  /* 先不算邊緣箭頭排一次；有排不下的（箭頭要出現）就把箭頭的位置留出來再排一次 */
  const lay = withEdge => {
    const placed = withEdge ? [eb] : [],
      out = [];
    for (const e of L) {
      const r = { x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight };
      for (let o; (o = placed.find(q => hit(r, q))); ) r.y = o.y + o.h + 8;
      if (r.y + r.h > cm.offsetTop - 8) out.push([e, null]);
      else out.push([e, r.y]), placed.push(r);
    }
    return out;
  };
  let res = lay(!edge.classList.contains('hide'));
  if (edge.classList.contains('hide') && res.some(x => x[1] == null)) res = lay(true);
  const off = res.filter(x => x[1] == null).length;
  for (const [e, y] of res) y == null ? e.remove() : (e.style.top = y + 'px');
  if (off) {
    const n = +edge.dataset.n + off;
    edge.dataset.n = n;
    edge.textContent = '› ' + n;
    edge.classList.remove('hide');
  }
}
/* 可以捲動的地方（抽屜內容、離線結算、系統元件頁）：還沒捲到底就在底部加 24 px 漸層提示（#23、N6）；
   黏底動作列（S15）已有自己的 12 px scrim，不另加 */
function drawerFit() {
  const ui = UI();
  for (const f of ui.querySelectorAll('.sfade')) f.remove();
  const U = ui.getBoundingClientRect(),
    sc = U.width / ui.offsetWidth;
  for (const e of ui.querySelectorAll('.drw .bd, .off, .sys')) {
    if (e.closest('.drw') && e.closest('.drw').querySelector('.sticky')) continue;
    if (e.scrollHeight <= e.clientHeight + 1 || e.scrollTop + e.clientHeight >= e.scrollHeight - 1) continue;
    const r = e.getBoundingClientRect(),
      z = getComputedStyle(e.closest('.ab') || e).zIndex;
    ui.insertAdjacentHTML(
      'beforeend',
      `<div class="ab sfade" style="${px((r.x - U.x) / sc, (r.bottom - U.y) / sc - 24, r.width / sc, 24)}z-index:${z === 'auto' ? 1 : +z + 1}"></div>`
    );
  }
}
/* 資源列放不下：從後面收成「…+n」，數字不截斷、不換行（C11） */
function resFit() {
  const r = $('d-res');
  if (!r) return;
  const L = [...r.querySelectorAll('span[data-role]')],
    m = $('d-resmore');
  let n = 0;
  while (r.scrollWidth > r.clientWidth + 1 && n < L.length - 1) {
    L[L.length - 1 - n].classList.add('hide');
    n++;
    m.textContent = '…+' + n;
    m.classList.remove('hide');
  }
}
/* 字一行放不下：圖示 24→20 → 短英文 → 只留圖示（K08） */
function navFit() {
  const t = $('d-tabs');
  if (!t) return;
  t.classList.remove('ic20', 'icon');
  if (S.navIcon) return t.classList.add('icon');
  const over = () =>
    [...t.querySelectorAll('.tab')].some(
      b =>
        b.scrollWidth > b.clientWidth + 1 ||
        b.querySelector('.l').getBoundingClientRect().width >
          b.getBoundingClientRect().width / ((SIZES[P.size].port ? 1 : SIZES[P.size].z) || 1)
    );
  if (over()) t.classList.add('ic20');
  if (over()) t.classList.add('icon');
}

/* ---------- 營地費用 ---------- */
function costOf(fac) {
  const c = D('cost')[fac];
  if (!c) return null;
  const need = c.need,
    can = need.every(([, n, h]) => h >= n),
    worst = need.reduce((a, x) => (x[2] / x[1] < a[2] / a[1] ? x : a), need[0]);
  return {
    need,
    can,
    sug: !!c.sug,
    worst,
    pct: Math.min(100, Math.floor((worst[2] / worst[1]) * 100)),
    lack: worst[1] - worst[2]
  };
}
const campCanCount = () => {
  const c = D('cost');
  return Object.keys(c).filter(f => costOf(f).can).length;
};
function campCells() {
  return D('camp').map(([n, lv, x]) => ({ n, lv, x, c: lv == null || x === 'max' ? null : costOf(n) }));
}
const facName = n => (isEN() && ENV('fac') && n === '獵場' ? pad0(ENV('fac')) : T(n));

/* 營地升級抽屜（C02–C05）與單座卡（C06） */
function panelHTML(g) {
  const port = g.port;
  const box = port ? px(0, g.drawerTop, 390, g.drawerH) : px(g.colX, 76, 420, g.colH);
  const z = 'z-index:11;';
  if (S.panel === 'camp') {
    const goal = D('goal'),
      cells = campCells();
    let h = `<div class="ab pnl drw" id="d-drw" data-m="C02" data-panel style="${box}${z}"><div class="hd"><b data-role="body">${esc(T('營地升級'))}</b><button class="x44 kf" data-hit="x" data-k="px" aria-label="關閉">${ICO.x}</button></div>
      <div class="goalr" data-m="goalrow" data-hit="goal2" data-k="goal2" role="button" tabindex="0"><span data-role="body">${goalLine()}</span><span class="gp"><i style="width:${goal.pct}%"></i></span></div><div class="bd"><div class="cg">`;
    for (const c of cells) {
      const cl = ['cc'];
      if (c.lv == null) cl.push('hid');
      if (c.x === 'max') cl.push('max');
      if (c.c && c.c.sug) cl.push('sug');
      if (S.pick === c.n) cl.push('pick');
      let sub = '',
        st = '',
        prog = '';
      if (c.lv == null) sub = `<small>${esc(T(c.x))}</small>`;
      else if (c.x === 'max') sub = `<small>${esc(T('已經滿級'))}</small>`;
      else if (c.c) {
        const k = c.c,
          solid = k.can || (S.sugCan && k.sug);
        const wr = k.worst;
        /* 費用一行：名稱可以省略號，數字永遠完整；按了買不起，缺的那項變 --warn（C03） */
        const lk = S.lackFac === c.n ? ' lack' : '';
        sub = k.can
          ? `<small>${esc(T('買得起'))}</small>`
          : k.sug
            ? `<small class="lack cst"><span class="ell">${esc(T('差'))} ${fmt(k.lack)} ${esc(T(wr[0]))}</span></small>`
            : `<small class="cst${lk}"><span class="ell">${esc(T(wr[0]))}</span> <span class="num">${fmt(wr[2])}/${fmt(wr[1])}</span></small>`;
        st = `<button class="stamp kf${solid ? ' can' : ' off'}" data-hit="stamp" data-k="st-${c.n}" data-fac="${c.n}" data-solid="${solid ? 1 : 0}" aria-label="${esc(T('升級'))} ${esc(c.n)}">▲</button>`;
        prog = `<span class="cp"><i class="${k.pct >= 100 ? 'full' : ''}" style="width:${k.pct}%"></i></span>`;
      }
      /* N3：名字先截斷（英文先換兩行），「Lv n」、「建議」不截斷、不換行 */
      const lvT = c.lv == null ? '' : `<span class="lv">Lv\u00a0${c.lv}</span>`;
      h += `<div class="${cl.join(' ')}" data-m="cell" data-fac="${c.n}"><button class="cb kf" data-hit="cell" data-k="cb-${c.n}" data-fac="${c.n}"><b data-role="body"><span class="fn">${esc(facName(c.n))}</span>${lvT}${c.c && c.c.sug ? `<span class="tag" data-role="label">${esc(T('建議'))}</span>` : ''}</b>${sub}</button>${st}${prog}</div>`;
    }
    return h + '</div></div></div>';
  }
  if (S.panel === 'card') {
    const n = S.cardFac,
      cell = campCells().find(c => c.n === n),
      k = cell.c;
    const lis = k.need
      .map(
        ([r, need, have]) =>
          `<li><span>${esc(r)}</span><b class="num ${have >= need ? 'ok' : 'lack'}">${fmt(have)}／${fmt(need)}</b><b class="${have >= need ? 'ok' : 'lack'}">${esc(have >= need ? T('夠') : T(`差 ${fmt(need - have)}`))}</b></li>`
      )
      .join('');
    const w = port ? 390 : 400;
    return `<div class="ab pnl drw" id="d-drw" data-m="C06" data-panel style="${port ? box : px(g.W - 16 - 400, 76, 400, 380)}${z}">
      <div class="hd"><button class="x44 kf" data-hit="x" data-k="cprev" aria-label="上一座">${ICO.prev}</button><b data-role="body">${esc(facName(n))}</b><button class="x44 kf" data-hit="x" data-k="cnext" aria-label="下一座">${ICO.next}</button><button class="x44 kf" data-hit="x" data-k="px" aria-label="關閉">${ICO.x}</button></div>
      <div class="bd"><div class="one"><h4 data-role="body">Lv\u00a0${cell.lv} → Lv\u00a0${cell.lv + 1}</h4><p data-role="body">${esc(T(n === '瞭望台' ? '開下一個主幹地點' : n === '獵場' || n === '林場' || n === '礦場' || n === '絲地' ? '產量提高' : '下一級的效果照解鎖表'))}</p>
      <ul>${lis}</ul><div class="ms" data-role="body">${esc(T('下一個里程碑'))}：${goalLine()}<div class="bar"><i style="width:${D('goal').pct}%"></i></div></div></div></div>
      <div style="padding:${port ? '0 8px 8px' : '0 16px 16px'}"><button class="btn pri kf${k.can ? '' : ' off'}" data-hit="up1" data-k="up1" style="width:${port ? 374 : 368}px;min-height:${port ? 54 : 48}px">▲ ${esc(T('升級'))}</button></div></div>`;
  }
  if (S.panel === 'log') {
    const pity = D('pity'),
      rc = D('recent') || [];
    /* 最近 50 筆：同名（同稀有度）的合成一列，寫「×n」（#19；不只連續的） */
    const raw = [...S.feed.map(f => [f.name, f.rar, f.n]), ...rc.map(r => [r[0], r[1], 1, r[2]])];
    const pool = [...D('drops').normal, ['玄鐵', 12], ['轉化石', 2], ['磨刀石', 5], ['蛻變石', 3], ['預知石', 1]];
    for (let i = 0; raw.length < 14; i++) raw.push([pool[i % pool.length][0], 'normal', pool[i % pool.length][1]]);
    const items = [];
    for (const it of raw) {
      const p = items.find(x => x[0] === it[0] && x[1] === it[1]);
      if (p) p[2] += it[2];
      else items.push(it.slice());
    }
    return `<div class="ab pnl drw" id="d-drw" data-m="H11" data-panel style="${box}${z}"><div class="hd"><b data-role="body">${esc(T('掉落紀錄'))}</b><button class="x44 kf" data-hit="x" data-k="px" aria-label="關閉">${ICO.x}</button></div>
      <div class="goalr"><span data-role="body">${esc(pity == null ? T('這裡不累積保底：怪物 Lv 45 以上的地點才會累積') : isEN() ? pad0(`Chase pity ${pity}%`) : `下一件保底 ${pity}%`)}</span><span class="gp"><i style="width:${pity || 0}%;background:var(--rar-chase)"></i></span></div>
      <div class="bd"><ul class="lst">${items
        .slice(0, 50)
        .map(
          (it, i) =>
            `<li class="r-${it[1]}" id="${i === 0 ? 'd-logsel' : ''}" style="${i === 0 ? 'outline:2px solid var(--border-cap);outline-offset:-2px' : ''}" data-role="body">${mark(it[1], it[3], it[0])}<span class="nm ell">${esc(T(it[0]))}</span>${it[2] > 1 ? `<span class="n num">×${fmt(it[2])}</span>` : ''}</li>`
        )
        .join('')}</ul></div></div>`;
  }
  if (S.panel === 'death') {
    const dd = D('deaths'),
      rows = [...(dd.rows.length < 3 ? SV.mid.d.deaths.rows.slice(0, 3 - dd.rows.length) : []), ...dd.rows];
    const enD = ENV('death');
    return `<div class="ab pnl drw" id="d-drw" data-m="H22" data-panel style="${box}${z}"><div class="hd"><b data-role="body">${esc(T('連續倒下'))}</b><button class="x44 kf" data-hit="x" data-k="px" aria-label="關閉">${ICO.x}</button></div>
      <div class="bd"><ul class="lst">${rows.map((r, i) => `<li data-role="body" style="min-height:44px"><span class="ell">${esc(i === 2 && enD && isEN() ? pad0(enD) : T(r))}</span></li>`).join('')}</ul>
      <p style="margin:8px 12px;font-size:var(--f14)" data-role="body">${esc(T('建議'))}：${esc(T(dd.tip || SV.mid.d.deaths.tip))}</p></div></div>`;
  }
  if (S.panel === 'list') {
    /* S15：黏底動作列 */
    const L = Array.from(
      { length: 14 },
      (_, i) =>
        `<li data-role="body">${esc(T('稀有') + ' ' + (i + 1))}・${esc(T(['十字弓', '腰帶', '戒指', '頭盔'][i % 4]))}</li>`
    ).join('');
    return `<div class="ab pnl drw" id="d-drw" data-m="S15" data-panel style="${box}${z}"><div class="hd"><b data-role="body">${esc(T('分解'))}</b><button class="x44 kf" data-hit="x" data-k="px" aria-label="關閉">${ICO.x}</button></div>
      <div class="bd" id="d-lst" style="padding-bottom:${(port ? 64 : 64) + 8}px"><ul class="lst">${L}</ul></div>
      <div class="sticky" id="d-sticky" data-m="S15bar"><button class="btn pri kf" data-hit="pri" data-k="lstgo" style="width:100%">${esc(T('分解 3 件'))}</button></div></div>`;
  }
  return fullHTML(g);
}
/* 目標列：名稱（可省略號）＋進度（數字永遠完整）；文字 130% 拆成兩行：名稱一行、「80%・靈魂 1,180／1,460」一行 */
const goalLine = () => {
  const goal = D('goal');
  if (goal.pct >= 100)
    return `<span class="gl"><span class="gn ell">${esc(T(`可以解鎖：${goal.name.split('・')[1]}`))}</span></span>`;
  const nm = isEN() && ENV('goal') ? pad0(ENV('goal')) : T(goal.name),
    v = P.fs
      ? `${goal.pct}%・${T(goal.res)} ${fmt(goal.have)}／${fmt(goal.need)}`
      : `｜${goal.pct}%（${T(goal.res)} ${fmt(goal.have)}／${fmt(goal.need)}）`;
  return `<span class="gl${P.fs ? ' two' : ''}"><span class="gn ell">${esc(nm)}</span><span class="gv num">${esc(v)}</span></span>`;
};

/* 天賦（V1）、鍛造（V8）、其他分頁（只放可鍵盤移動的格子；本體屬 D2／D3） */
function fullHTML(g) {
  const port = g.port;
  const box = port ? px(0, g.st, 390, g.navTop - g.st) : px(0, 0, g.W, g.H);
  if (S.panel === 'tree') {
    const sh = stripH(g);
    return `<div class="ab tree" id="d-tree" data-m="V1" style="${port ? px(0, g.st, 390, g.H - g.st - g.sb) : px(0, 0, g.W, g.H)}z-index:9">
      <div class="ab strip" id="d-strip" data-m="T1" style="${px(0, 0, port ? 390 : g.W - 448, sh)}"><div class="sv" id="d-sv"></div>
      <button class="btn pri back kf hide" id="d-back" data-hit="back" data-k="back" style="min-height:44px">${esc(T('回戰場'))}</button>
      <div class="lifebox" style="height:auto"><div class="lb hp" style="height:16px"><i id="d-shp" style="width:50%"></i><span data-role="num" id="d-shpt"></span></div></div></div>
      <canvas class="ab" id="d-treecv" style="${px(0, sh, port ? 390 : g.W - 448, (port ? g.H - g.st - g.sb : g.H) - sh)}"></canvas>
      ${port ? `<button class="x44 kf ab" data-hit="x" data-k="px" style="right:4px;bottom:${g.sb + 4}px;background:var(--panel)" aria-label="關閉">${ICO.x}</button>` : ''}</div>`;
  }
  if (S.panel === 'forge') {
    return `<div class="ab forge pnl" id="d-forge" data-m="V8" data-panel style="${port ? px(0, g.drawerTop, 390, g.drawerH) : px(g.colX, 76, 420, g.colH)}z-index:11">
      <div class="hd" style="width:100%"><b>${esc(T('鍛造'))}・${esc(T('打造'))}</b><button class="x44 kf" data-hit="x" data-k="px" aria-label="關閉">${ICO.x}</button></div>
      <div class="flip" id="d-flip"><div class="fb" id="d-fb">${esc(T('打造'))}…</div><div class="ff" id="d-ff">◆ ${esc(T('稀有'))}<span>${esc(T('赤鐵十字弓'))}</span></div></div>
      <div class="pslot"><div class="pity" id="d-pity" data-role="body"><span id="d-pityt">${esc(T('下一件保底'))} 96%</span><div class="bar"><i id="d-pityf" style="width:96%"></i></div></div>
      <div class="chban hide" id="d-chban">${wy('wangyin_guixu_16')} ${esc(T('保底 100%：歸墟印'))}</div></div>
      <div class="rw" style="display:flex;gap:8px"><button class="btn pri kf" data-k="fmake" data-hit="pri">${esc(T('打造'))}</button><button class="btn sec off kf" id="d-f4" data-k="f4" data-hit="sec" aria-disabled="true">F4 ${esc(T('腐化'))}</button></div>
      <div class="why" data-role="body">F4：${esc(T('鍛造台 Lv15 開'))}（120 ms 抖動：demo 未驗，進遊戲量）</div></div>`;
  }
  const t = TABS.find(x => x[0] === S.panel);
  if (S.panel === 'more') {
    const opt = (k, v, lab) =>
      `<button class="btn ${S[k] === v || P[k] === v ? 'sel' : 'sec'} kf" data-hit="opt" data-k="o-${k}-${v}" data-opt="${k}:${v}">${esc(T(lab))}</button>`;
    return `<div class="ab pnl drw" data-m="more" data-panel style="${port ? px(0, g.drawerTop, 390, g.drawerH) : px(g.colX, 76, 420, g.colH)}z-index:11"><div class="hd"><b>${esc(T('設定'))}</b><button class="x44 kf" data-hit="x" data-k="px" aria-label="關閉">${ICO.x}</button></div>
      <div class="bd ph2 grid"><p>${esc(T('掉落提示門檻'))}</p><div class="opt">${opt('filter', 'all', '全部')}${opt('filter', 'rare', '稀有以上')}${opt('filter', 'leg', '傳奇以上')}</div>
      <p style="margin-top:12px">${esc(T('文字大小'))}・${esc(T('減少動態'))}：控制列切換</p></div></div>`;
  }
  return `<div class="ab pnl drw" data-m="${S.panel}" data-panel style="${port ? px(0, g.drawerTop, 390, g.drawerH) : px(g.colX, 76, 420, g.colH)}z-index:11"><div class="hd"><b>${esc(T(t[2]))}</b><button class="x44 kf" data-hit="x" data-k="px" aria-label="關閉">${ICO.x}</button></div>
    <div class="bd ph2"><p>${esc(T('本體屬 D2／D3；這裡只驗鍵盤焦點與換分頁'))}</p><div class="g grid">${Array.from({ length: 6 }, (_, i) => `<button class="btn sec kf" data-hit="sec" data-k="g${i}">${i + 1}</button>`).join('')}</div></div></div>`;
}
/* 天賦樹即時戰場條：平常 120；生命 < 20% 或王大招拉高到 330（200 ms） */
const stripBig = () => (S.hp != null && S.hp < 0.2) || S.ult;
function stripH(g) {
  const lo = 120,
    hi = 330,
    k = P.rm ? 1 : Math.min(1, (NOW - S.stripT) / 200);
  const from = S.strip ? lo : hi,
    to = S.strip ? hi : lo;
  return Math.round(S.stripT < 0 ? (S.strip ? hi : lo) : from + (to - from) * easeOut(k));
}

/* ---------- 營地場景（C07–C12） ---------- */
function campHTML(g) {
  const port = g.port,
    res = D('res');
  let h = '';
  /* 資源列：放不下收成「…+3」（C11） */
  h += `<div class="ab plate res" id="d-res" data-m="C11" data-hud style="${port ? px(8, g.st + 5, 374, 36) : px(16, 10, 540, 52)}">${res.map(([n, v]) => `<span data-role="body"><b>${esc(T(n))}</b>${fmt(v)}</span>`).join('')}<span class="more hide" id="d-resmore"></span></div>`;
  h += `<button class="ab goalb kf" data-m="C12" data-hud data-hit="goal" data-k="goal" style="${port ? px(8, g.st + 49, 374, 44) : px(16, 66, 540, 44)}"><span data-role="body" id="d-goalt">${goalLine()}</span><span class="gp"><i id="d-gs" style="width:${D('goal').pct}%"></i></span></button>`;
  /* 牌匾：10 座，畫面外的用邊緣箭頭 */
  const cells = campCells().filter(c => c.lv != null);
  const spots = port
    ? [
        [16, 150],
        [200, 170],
        [24, 240],
        [212, 262],
        [40, 340],
        [208, 356],
        [20, 430],
        [196, 452],
        [60, 520],
        [220, 540]
      ]
    : [
        [300, 150],
        [560, 140],
        [820, 170],
        [260, 270],
        [520, 260],
        [800, 290],
        [340, 390],
        [620, 400],
        [880, 420],
        [460, 500]
      ];
  let offR = 0;
  cells.forEach((c, i) => {
    const sp = spots[i];
    if (!sp || (port && sp[1] + 44 > g.idleTop - 72)) return offR++;
    const can = c.c && c.c.can;
    h += `<div class="ab plq kf" data-m="C07" data-hit="plq" data-k="pq-${c.n}" data-fac="${c.n}" role="button" tabindex="0" style="${px(sp[0], (port ? g.st : 0) + sp[1])}"><span class="nm" data-role="body">${esc(facName(c.n))} Lv\u00a0${c.lv}</span>${c.c ? `<span class="stp${can ? ' can' : ''}" data-role="label">▲</span>` : ''}</div>`;
  });
  const hidden = campCells().filter(c => c.c && c.c.can).length > 3 ? 2 : 0;
  h += `<div class="ab edge${hidden || offR ? '' : ' hide'}" data-m="edge" data-n="${hidden || offR}" style="${port ? px(390 - 52, g.st + 300, 44, 44) : px(g.W - 60, 340, 52, 44)}">› ${hidden || offR}</div>`;
  /* 主鈕列 */
  /* 主鈕：動詞保留，只砍地點名；放不下就換兩行、高 56→64（mainFit） */
  const full = T(`繼續刷 ${loc()}`, `Keep farming ${EN[loc()] || enAuto(loc())}`),
    verb = isEN() ? 'Keep farming' : '繼續刷',
    mainT = `<span class="vb">${esc(verb)}</span><span class="pl ell">${esc(full.slice(verb.length).trim())}</span>`;
  h += port
    ? `<div class="ab cmain" data-m="C08" style="${px(8, g.idleTop - 64, 374, 56)}"><button class="btn sec kf" data-hit="maps" data-k="maps" style="width:64px;padding:0">${esc(T('地點'))}</button><button class="btn pri kf" data-hit="pri" data-k="cgo" style="width:302px;min-height:56px">${mainT}</button></div>`
    : `<div class="ab cmain" data-m="C08" style="${px(392, 600 + g.dy, 408, 56)}"><button class="btn sec kf" data-hit="maps" data-k="maps" style="width:80px;padding:0">${esc(T('地點'))} ${kc('M')}</button><button class="btn pri kf" data-hit="pri" data-k="cgo" style="width:320px;min-height:56px">${mainT}</button></div>`;
  h += idleHTML(g);
  if (S.panel) h += panelHTML(g);
  return h;
}

/* ---------- 離線結算（I07–I08） ---------- */
/* 追逐列名稱放前面：「追逐物品 ×1、目前保底 18%（疾霆印）」→「疾霆印 ×1・保底 18%」 */
const chaseRow = s => {
  const m = String(s).match(/^追逐物品 ×(\d+)、目前保底 (\d+)%(?:（(.+)）)?$/);
  return m ? `${m[3] || '追逐物品'} ×${m[1]}・保底 ${m[2]}%` : s;
};
function offHTML(g) {
  const port = g.port,
    o = D('off'),
    goal = D('goal');
  const box = port ? px(0, g.st, 390, g.H - g.st - g.sb) : px(320, 80 + g.dy / 2, 640, 560);
  const t = isEN() && ENV('away') ? ENV('away') : o.t;
  const sum = isEN() && ENV('offSum') ? ENV('offSum') : o.sum;
  const rows = o.rows
    .map(
      (r, i) =>
        `<li class="r-${r[1]} offr" data-i="${i}" data-role="body">${mark(r[1])}<span class="offv" data-v="${esc(r[0])}">${esc(T(r[0]))}</span></li>`
    )
    .join('');
  return `<div class="scrim" style="z-index:19"></div><div class="ab off" id="d-off" data-m="I07" style="${box}z-index:20" role="dialog" aria-label="${esc(T('離線結算'))}">
    <h2 data-role="body">${esc(isEN() && ENV('away') ? pad0(t) : T(t))}</h2><p class="sum" id="d-offsum" data-role="body" data-v="${esc(sum)}">${esc(isEN() && ENV('offSum') ? pad0(sum) : T(sum))}</p>
    <ul>${rows}<li class="r-chase offr ch" data-i="ch" data-role="body">${o.chaseIc ? wy(o.chaseIc) : ''}${esc(T(chaseRow(o.chase)))}</li></ul>
    <div class="nx" data-role="body"><span>${esc(T('接下來'))}：${esc(isEN() && ENV('goal') ? ENV('goal') : T(o.next))}</span><span class="gp"><i style="width:${goal.pct}%"></i></span></div>
    <button class="btn pri ok kf" id="d-offok" data-m="I08" data-hit="pri" data-k="offok" style="${port ? 'width:374px;min-height:56px;align-self:center' : 'width:320px;min-height:48px;align-self:center'}">${esc(T('收下'))}${devTouch() ? '' : '<kbd>Enter</kbd>'}</button></div>`;
}

/* ---------- 確認卡（S08、S09） ---------- */
function dlgHTML(g) {
  const port = g.port,
    w = port ? 390 : 480;
  const box = port
    ? `left:0;bottom:${g.sb}px;width:390px;`
    : `left:${(g.W - w) / 2}px;top:${(g.H - 260) / 2}px;width:${w}px;`;
  if (S.dlg === 'confirm')
    return `<div class="scrim" style="z-index:25"></div><div class="ab card" id="d-dlg" data-m="S08" role="dialog" style="${box}z-index:26"><h3 data-role="body">${esc(T('回營地？'))}</h3><p data-role="body">${esc(T('地上的東西照樣收下'))}</p><p data-role="body">${esc(T('戰鬥暫停、回來補算'))}</p>
      <button class="btn sec kf" data-hit="sec" data-k="dno" style="${port ? 'width:358px' : ''}">${esc(T('取消'))}</button><button class="btn pri kf" data-hit="pri" data-k="dyes" style="${port ? 'width:358px' : ''}">${esc(T('回營地'))}${devTouch() ? '' : ' <kbd style="font:600 12px var(--font);opacity:.8">Enter</kbd>'}</button></div>`;
  return `<div class="scrim" style="z-index:25"></div><div class="ab card" id="d-dlg" data-m="S09" role="dialog" style="${box}z-index:26"><h3 data-role="body">${esc(T('分解 3 件稀有以上？'))}</h3><p data-role="body">${esc(T('分解後拿回材料'))}</p>
    <div class="holdtip" id="d-holdtip" data-role="body"></div>
    <div class="row2"><button class="btn danger hold kf" data-hit="hold" data-k="dhold" data-hold="danger">${ICO.trash}<span>${esc(T('長按分解'))}</span><i class="fill"></i></button><button class="btn sec kf" data-hit="sec" data-k="dno">${esc(T('取消'))}</button></div></div>`;
}
function toastHTML(g) {
  const port = g.port,
    t = S.toast;
  /* 直立：倒下一行上方 6（470–506）；桌機：置中、下緣基線 y 548；都往上長 */
  const d3y = S.fieldPanel ? g.fieldBot - 120 : g.fieldBot - 198;
  const pos = port ? pxb(8, g.H - (d3y - 6), 374, null) : pxb((g.W - 400) / 2, g.H - (548 + g.dy), 400, null);
  return `<div class="ab toast ${t.kind}" id="d-toast" data-m="${t.kind === 'warn' ? 'S11' : 'S10'}" data-role="body" style="${pos}z-index:24">${t.kind === 'warn' ? ICO.warn : ''}<span>${esc(t.text)}</span></div>`;
}

/* ---------- 系統元件頁（S01–S07） ---------- */
function sysHTML(g) {
  const port = g.port,
    w = port ? 374 : 480;
  const st = (k, def) => (S.sec === k ? def : '');
  const pw = port ? 'width:374px' : 'min-width:200px';
  return `<div class="ab sys" id="d-sys" style="${port ? px(0, g.st, 390, g.H - g.st - g.sb) : px((g.W - 720) / 2, 0, 720, g.H)}">
    <section data-sec="S01" class="${st('S01', 'cur')}"><h5 data-note>S01 按鈕・一般</h5><button class="btn pri kf" data-m="S01" data-hit="pri" data-k="b1" style="${pw}">${esc(T('繼續刷 雪埋古道'))}</button><button class="btn sec kf" data-hit="sec" data-k="b2" style="${port ? 'width:374px' : 'min-height:36px'}">${esc(T('地點'))}</button></section>
    <section data-sec="S02" class="${st('S02', 'cur')}"><h5 data-note>S02 按鈕・按下（0 ms 換 --sel、80 ms 回彈）</h5><button class="btn pri kf ${S.press === 'b3' ? 'down' : ''}" data-m="S02" data-hit="pri" data-k="b3" style="${pw}">${esc(T('收下'))}</button></section>
    <section data-sec="S03" class="${st('S03', 'cur')}"><h5 data-note>S03 按鈕・停用＋原因</h5><div><button class="btn off kf" data-m="S03" data-hit="sec" data-k="b4" aria-disabled="true" style="${pw}">${ICO.lock} ${esc(T('淬鍊'))}</button><div class="why" data-role="body">${esc(T('祭壇 Lv7 開'))}</div></div></section>
    <section data-sec="S04" class="${st('S04', 'cur')}"><h5 data-note>S04 按鈕・選中</h5><div class="rw"><button class="btn sel kf" data-m="S04" data-hit="sec" data-k="b5" aria-pressed="true">${esc(T('稀有以上'))}</button><button class="btn sec kf" data-hit="sec" data-k="b6">${esc(T('全部'))}</button></div></section>
    <section data-sec="S05" class="${st('S05', 'cur')}"><h5 data-note>S05 按鈕・鍵盤焦點（2 px --border-hi 外推 2 px）</h5><div class="rw"><button class="btn sec kf ${S.sec === 'S05' ? 'fv' : ''}" data-m="S05" data-hit="sec" data-k="b7">${esc(T('角色'))}</button><button class="btn sec kf" data-hit="sec" data-k="b8">${esc(T('鍛造'))}</button><button class="btn sec kf" data-hit="sec" data-k="b9">${esc(T('技能'))}</button></div></section>
    <section data-sec="S06" class="${st('S06', 'cur')}${st('S07', 'cur')}"><h5 data-note>S06／S07 長按確認</h5><button class="btn pri hold kf" data-m="S06" data-hit="hold" data-k="bhold" data-hold="sys" style="${port ? 'width:374px' : 'min-width:240px'};min-height:48px"><span>${esc(T('長按重置天賦'))}</span><i class="fill"></i></button><div class="holdtip" id="d-holdtip" data-m="S07" data-role="body"></div></section>
    <section data-sec="S10"><h5 data-note>S08–S15：在戰鬥畫面上看（選對應列）</h5></section></div>`;
}
/* 格線（S12–S14）：8 px 格＋規格框 */
function gridHTML(g) {
  const z = (x, y, w, h, l) => `<div class="gzone" style="${px(x, y, w, h)}">${l}</div>`;
  let h = '<div class="grid8"></div>';
  if (g.port) {
    h += z(0, 0, 390, g.st, '上 ' + g.st) + z(0, g.H - g.sb, 390, g.sb, '下 ' + g.sb);
    h += z(0, g.fieldTop, 390, g.fieldBot - g.fieldTop, `戰場 ${g.fieldBot - g.fieldTop}`);
    if (S.panel) h += z(0, g.drawerTop, 390, g.drawerH, `營地升級 ${g.drawerH}`);
  } else {
    h +=
      z(g.W - 16 - 416, 10, 416, 52, '分頁 848–1264 × 10–62') +
      z(g.colX, 76, 420, g.colH, `右欄 ${g.colX}–${g.colX + 420} × 76–${76 + g.colH}`);
  }
  return h;
}

/* ---------- 假戰場 ---------- */
let RND = 1;
const rnd = () => (RND = (RND * 16807) % 2147483647) / 2147483647;
const F = { mobs: [], shots: [], nums: [], drops: [], boxes: [], t: 0, spawn: 0, fire: 0, numT: 0 };
const MOBS = ['m_snowwolf', 'm_frostwolf', 'm_slime_ice', 'm_yaksha', 'm_ghostfire', 'm_huye'];
const MOBS_NEW = ['m_slime_green', 'm_straydog', 'm_bat', 'm_mushroom'];
function fieldReset() {
  RND = 7;
  F.mobs = [];
  F.shots = [];
  F.nums = [];
  F.drops = [];
  F.t = 0;
  F.spawn = 0;
  F.fire = 0;
  F.numT = 0;
  F.wantLast = F.camLast = null;
  const p = D('field');
  for (let i = 0; i < p.mobs; i++) spawnMob(p, 1);
}
function spawnMob(p, init) {
  const a = rnd() * Math.PI * 2,
    r = init ? 80 + rnd() * 220 : 320 + rnd() * 80;
  const list = P.save === 'new' ? MOBS_NEW : MOBS;
  F.mobs.push({
    x: Math.cos(a) * r,
    y: Math.sin(a) * r * 0.7,
    k: list[Math.floor(rnd() * list.length)],
    hp: 3 + Math.floor(rnd() * 4),
    el: F.mobs.length < (p.elite || 1),
    id: Math.floor(rnd() * 1e9),
    hit: -1e9
  });
}
function sim(dt) {
  if (S.scr !== 'hud' && S.panel !== 'tree') return;
  if (NOW - S.downT < 3000) return; /* 倒下：0 ms 停輸入與戰鬥 */
  const p = D('field');
  F.t += dt;
  /* 怪往主角走 */
  for (const m of F.mobs) {
    const d = Math.hypot(m.x, m.y) || 1,
      sp = (m.el ? 18 : 26) * (dt / 1000);
    if (d > 46) (m.x -= (m.x / d) * sp), (m.y -= (m.y / d) * sp);
  }
  while (F.mobs.length < p.mobs) spawnMob(p);
  /* 投射物：同屏維持 p.shots 顆 */
  F.fire += dt;
  const every = 2600 / p.shots;
  while (F.fire > every && F.mobs.length) {
    F.fire -= every;
    const tg = F.mobs[Math.floor(rnd() * F.mobs.length)];
    F.shots.push({ x: 0, y: -14, tx: tg.x, ty: tg.y, tg: tg.id, t: 0, d: Math.hypot(tg.x, tg.y) / 0.35 });
  }
  for (const s of F.shots) s.t += dt;
  const done = F.shots.filter(s => s.t >= s.d);
  F.shots = F.shots.filter(s => s.t < s.d);
  for (const s of done) {
    const m = F.mobs.find(m => m.id === s.tg);
    if (!m) continue;
    m.hp--;
    m.hit = NOW;
    const crit = rnd() < 0.15;
    addNum(m, crit ? 'crit' : 'hit', Math.round((crit ? 2.1 : 1) * (40 + rnd() * 60) * (P.save === 'new' ? 0.4 : 6)));
    if (m.hp <= 0) {
      F.mobs = F.mobs.filter(x => x !== m);
      if (rnd() < 0.5) F.drops.push({ x: m.x, y: m.y, t: NOW, r: rnd() < 0.2 ? 'rare' : 'normal' });
      if (rnd() < 0.35 && !(SCN_ON && SCN_ON.k === 'V6')) feedRandom();
    }
  }
  /* 受傷數字（主角身上，±24 px 內只准受傷字） */
  F.numT += dt;
  if (F.numT > 2200) {
    F.numT = 0;
    addNum({ x: 0, y: -30, id: 'hero' }, 'hurt', Math.round(8 + rnd() * 30));
  }
  F.drops = F.drops.filter(d => NOW - d.t < 4000);
}
/* 跳數字：同屏直立 ≤ 12、桌機 ≤ 20；150 ms 內同目標合併；錯開 12 px；主角 ±24 px 內不跳一般傷害 */
function addNum(m, kind, v) {
  const port = SIZES[P.size].port,
    cap = port ? 12 : 20;
  if (kind !== 'hurt' && Math.abs(m.x) < 24 && Math.abs(m.y) < 24) return;
  const same = F.nums.find(n => n.tg === m.id && NOW - n.t0 < 150 && n.kind === kind);
  if (same) return void ((same.v += v), (same.t0 = NOW));
  const stack = F.nums.filter(n => n.tg === m.id).length;
  F.nums.push({ x: m.x + (stack % 2 ? 12 : 0), y: m.y - 30 - stack * 12, v, kind, tg: m.id, t0: NOW });
  while (F.nums.length > cap) F.nums.shift();
}
function drawField() {
  const cv = $('cv'),
    z = SIZES[P.size],
    g = geo();
  if (cv.width !== z.w || cv.height !== z.h) (cv.width = z.w), (cv.height = z.h);
  const c = cv.getContext('2d'),
    k = z.port ? 1 : z.z;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#000';
  c.fillRect(0, 0, z.w, z.h);
  c.imageSmoothingEnabled = false;
  if (S.scr === 'camp') {
    if (CAMPBG.complete && CAMPBG.naturalWidth) {
      const top = z.port ? g.st : 0,
        hh = z.port ? g.idleTop - 72 - g.st + 72 : z.h;
      const s = Math.max(z.w / CAMPBG.naturalWidth, hh / CAMPBG.naturalHeight);
      c.drawImage(
        CAMPBG,
        (z.w - CAMPBG.naturalWidth * s) / 2,
        top + (hh - CAMPBG.naturalHeight * s) / 2,
        CAMPBG.naturalWidth * s,
        CAMPBG.naturalHeight * s
      );
    }
    return;
  }
  /* 戰場範圍：直立 fieldTop–fieldBot；天賦樹時畫在即時戰場條裡 */
  let top = g.fieldTop * (z.port ? 1 : k),
    bot = g.fieldBot * (z.port ? 1 : k),
    left = 0,
    right = z.w;
  if (S.panel === 'tree') {
    top = z.port ? g.st : 0;
    bot = top + stripH(g) * (z.port ? 1 : k);
    right = z.port ? 390 : (g.W - 448) * k;
  } else if (S.scr === 'sys') return;
  c.save();
  c.beginPath();
  c.rect(left, top, right - left, bot - top);
  c.clip();
  const fl = P.save === 'new' ? FLOOR.tomb : FLOOR.ice;
  if (fl.complete && fl.naturalWidth) {
    c.fillStyle = c.createPattern(fl, 'repeat');
    c.fillRect(left, top, right - left, bot - top);
    c.fillStyle = 'rgba(8,6,5,0.35)';
    c.fillRect(left, top, right - left, bot - top);
  }
  const cx = (left + right) / 2,
    cy = S.panel === 'tree' ? (top + bot) / 2 : camY(g, top, bot),
    sc = z.port ? 1 : k;
  F.hero = { x: cx / k, y: cy / k };
  c.translate(cx, cy);
  c.scale(sc, sc);
  /* 地上掉落 */
  for (const d of F.drops) {
    c.fillStyle = d.r === 'rare' ? '#ffcf5c' : '#d9cdb4';
    c.beginPath();
    c.moveTo(d.x, d.y - 5);
    c.lineTo(d.x + 4, d.y);
    c.lineTo(d.x, d.y + 5);
    c.lineTo(d.x - 4, d.y);
    c.fill();
  }
  /* 怪 */
  for (const m of [...F.mobs].sort((a, b) => a.y - b.y)) {
    const o = img(m.k),
      [, sx, sy, w, h] = o.r;
    if (NOW - m.hit < 80) c.filter = 'brightness(1.8)';
    if (o.im.complete) c.drawImage(o.im, sx, sy, w, h, Math.round(m.x - w / 2), Math.round(m.y - h), w, h);
    c.filter = 'none';
    if (m.el) {
      c.strokeStyle = '#7ea7ff';
      c.strokeRect(Math.round(m.x - 16), Math.round(m.y - h - 8), 32, 4);
    }
  }
  /* 王：直立出生點在左上（避開右上的掉落動態）；菁英、王的框記下來給掉落動態判斷 */
  F.boxes = [];
  const toUI = (x, y, w, h) => ({ x: (cx + x * sc) / k, y: (cy + y * sc) / k, w: (w * sc) / k, h: (h * sc) / k });
  for (const m of F.mobs) if (m.el) F.boxes.push(toUI(m.x - 20, m.y - 44, 40, 44));
  if (S.boss !== 'none') {
    const o = img(P.save === 'mid' ? 'zhongkui' : 'hugupo'),
      [, sx, sy, w, h] = o.r,
      bx = S.bossAt ? S.bossAt[0] : z.port ? -180 : -w,
      by = S.bossAt ? S.bossAt[1] : z.port ? -70 - h * 2 : -170 - h;
    if (o.im.complete) c.drawImage(o.im, sx, sy, w, h, bx, by, w * 2, h * 2);
    F.boxes.push(toUI(bx, by, w * 2, h * 2));
  }
  /* 主角 */
  if (HERO.complete) c.drawImage(HERO, 0, 80, 80, 80, -HERO_C[0], -HERO_C[1], 80, 80);
  /* 投射物 */
  for (const s of F.shots) {
    const k2 = s.t / s.d;
    c.fillStyle = '#ffe066';
    c.beginPath();
    c.arc(s.x + (s.tx - s.x) * k2, s.y + (s.ty - s.y) * k2, 3, 0, 7);
    c.fill();
  }
  /* 跳數字 */
  c.textAlign = 'center';
  c.lineJoin = 'round';
  F.nums = F.nums.filter(n => NOW - n.t0 < 700);
  /* 一律千分位；字框離畫面邊 ≥ 8；彼此錯開 ≥ 12 px（後進來的往上讓） */
  const ff = getComputedStyle(document.body).fontFamily,
    placed = [];
  for (const n of F.nums) {
    const a = (NOW - n.t0) / 700,
      fs = n.kind === 'hurt' ? 14 : n.kind === 'crit' ? 15 : 12,
      t = fmt(n.v);
    c.font = `700 ${fs}px ${ff}`;
    c.globalAlpha = 1 - Math.max(0, a - 0.6) / 0.4;
    const hw = c.measureText(t).width / 2 + 2,
      L = (left - cx) / sc + 8 + hw,
      Rr = (right - cx) / sc - 8 - hw;
    const x = Math.max(L, Math.min(Rr, n.x));
    let y = n.y - (P.rm ? 0 : a * 18);
    for (let i = 0; i < 20 && placed.some(p => Math.abs(p.x - x) < p.hw + hw && Math.abs(p.y - y) < 12); i++) y -= 12;
    y = Math.max((top - cy) / sc + 8 + fs, Math.min((bot - cy) / sc - 8, y));
    placed.push({ x, y, hw });
    n.sx = x;
    n.sy = y;
    c.strokeStyle = 'rgba(0,0,0,0.8)';
    c.lineWidth = 3;
    c.strokeText(t, x, y);
    c.fillStyle = n.kind === 'hurt' ? '#ff5a5a' : n.kind === 'crit' ? '#ffd166' : '#fff3e0';
    c.fillText(t, x, y);
  }
  c.globalAlpha = 1;
  c.restore();
}
/* 鏡頭（V9）：主角留在「看得到的戰場」正中心。直立開抽屜：看得到的下緣跟著抽屜上緣走，
   滑完那一格戰場 663 → 283 一次改、主角不動；關抽屜 200 ms 回中心。減少動態不平移，開關那一格直接切 */
function camY(g, top, bot) {
  if (!g.port) return (top + bot) / 2;
  const sliding = S.panel && !fullPanel() && !S.fieldPanel;
  let vb = bot;
  if (sliding) {
    const k = P.rm ? 1 : Math.min(1, (NOW - S.drawerT) / 200);
    vb = Math.min(bot, g.drawerTop + (1 - easeOut(k)) * g.drawerH);
  }
  const want = (top + vb) / 2;
  if (F.wantLast != null && Math.abs(want - F.wantLast) > 2 && !sliding && !P.rm)
    (S.camFrom = F.camLast), (S.camT = NOW), log('cam-ease', { from: F.camLast, to: want });
  F.wantLast = want;
  let y = want;
  if (S.camT > 0 && !P.rm) {
    const k = Math.min(1, (NOW - S.camT) / 200);
    if (k < 1) y = S.camFrom + (want - S.camFrom) * easeOut(k);
  }
  return (F.camLast = y);
}
function drawMini() {
  const m = $('d-mini');
  if (!m) return;
  const c = m.getContext('2d');
  c.fillStyle = '#0b0806';
  c.fillRect(0, 0, 164, 104);
  c.fillStyle = '#5e4e3a';
  c.fillRect(10, 48, 144, 8);
  c.fillRect(78, 10, 8, 84);
  c.fillStyle = '#f1ebdc';
  c.fillRect(80, 50, 4, 4);
  c.fillStyle = '#e0553f';
  for (const mo of F.mobs) c.fillRect(82 + mo.x / 8, 52 + mo.y / 8, 2, 2);
}
function drawTree() {
  const cv = $('d-treecv');
  if (!cv) return;
  const r = cv.getBoundingClientRect(),
    z = SIZES[P.size],
    k = z.port ? 1 : z.z,
    w = Math.round(r.width / (window.__vs || 1)),
    h = Math.round(r.height / (window.__vs || 1));
  if (cv.width !== w || cv.height !== h) (cv.width = w), (cv.height = h);
  const c = cv.getContext('2d');
  c.fillStyle = '#10131b';
  c.fillRect(0, 0, w, h);
  c.strokeStyle = '#3a3027';
  c.fillStyle = '#5e4e3a';
  RND = 99;
  const pts = Array.from({ length: 40 }, () => [20 + rnd() * (w - 40), 20 + rnd() * (h - 40)]);
  c.beginPath();
  pts.forEach((p, i) => i && c.lineTo(p[0], p[1]));
  c.stroke();
  for (const p of pts) c.beginPath(), c.arc(p[0], p[1], 6, 0, 7), c.fill();
  RND = 7 + Math.floor(NOW);
}

/* ---------- 掉落動態（V6） ---------- */
const STAY = { normal: 3000, rare: 6000, leg: 6000, chase: 10000 };
const RANK = { normal: 0, rare: 1, leg: 2, chase: 3 };
const passes = r => RANK[r] >= { all: 0, rare: 1, leg: 2 }[S.filter];
function feedPush(name, rar, n = 1) {
  if (!passes(rar)) return void (S.filtered += n);
  const cap = Math.max(1, feedCap() - (S.filter !== 'all' ? 1 : 0));
  const same = S.feed.find(f => f.name === name && !f.out);
  if (same) {
    same.n += n;
    same.t0 = NOW;
    same.tIn = same.tIn;
    S.feed = [same, ...S.feed.filter(f => f !== same)];
    log('feed-merge', { name, n: same.n });
  } else {
    S.feed.unshift({ name, rar, n, t0: NOW, tIn: NOW });
    log('feed-in', { name, rar });
  }
  let live = S.feed.filter(f => !f.out);
  while (live.length > cap) {
    const old =
      [...live].reverse().find(f => f.rar === 'normal') || (rar === 'normal' ? live[0] : live[live.length - 1]);
    const hadNormal = live.some(f => f.rar === 'normal');
    S.feed = S.feed.filter(f => f !== old);
    log('feed-evict', { name: old.name, rar: old.rar, hadNormal });
    live = S.feed.filter(f => !f.out);
  }
}
/* 列數：直立 3（抽屜開著 2）、桌機 6；文字 130% 列高跟字長，直立 2（抽屜 1）、桌機 5 */
const feedCap = () => (SIZES[P.size].port ? (S.fieldPanel ? 2 : 3) - (P.fs ? 1 : 0) : P.fs ? 5 : 6);
function feedRandom() {
  const d = D('drops'),
    pool = [
      ...d.normal.map(x => [...x, 'normal']),
      ...d.normal.map(x => [...x, 'normal']),
      ...d.rare.map(x => [...x, 'rare'])
    ];
  if (!pool.length) return;
  const x = pool[Math.floor(rnd() * pool.length)];
  feedPush(x[0], x[2], 1);
}
function feedSeed() {
  const d = D('drops');
  S.filtered = SV[P.save].d.filtered || 0;
  const nm = S.filter === 'all' ? d.normal : [];
  /* 「全部」：最新的一列普通放最上，普通／傳奇／稀有同屏都看得到（#8 H09_all） */
  for (const [n, k] of nm.slice(0, 1)) S.feed.push({ name: n, rar: 'normal', n: k, t0: NOW, tIn: NOW - 1000 });
  for (const [n, k] of d.leg || []) S.feed.push({ name: n, rar: 'leg', n: k, t0: NOW, tIn: NOW - 1000 });
  for (const [n, k] of d.rare) S.feed.push({ name: n, rar: 'rare', n: k, t0: NOW, tIn: NOW - 1000 });
  for (const [n, k] of nm.slice(1)) S.feed.push({ name: n, rar: 'normal', n: k, t0: NOW, tIn: NOW - 1000 });
}
function drawFeed() {
  const fd = $('d-feed');
  if (!fd) return;
  const cap = feedCap(),
    fade = 400;
  S.feed = S.feed.filter(f => NOW - f.t0 < STAY[f.rar] + fade);
  const live = S.feed
    .filter(f => passes(f.rar))
    .slice(0, Math.max(1, cap - (S.filter !== 'all' ? 1 : 0))); /* 物品列至少 1 */
  const enN = ENV('drops');
  let h = '';
  for (const f of live) {
    const age = NOW - f.tIn,
      left = STAY[f.rar] - (NOW - f.t0);
    const a = Math.min(1, age / 120) * (left < 0 ? Math.max(0, 1 + left / fade) : 1);
    const dy = P.rm ? 0 : -6 * (1 - Math.min(1, age / 120));
    const mk = mark(f.rar, null, f.name);
    const nm = T(f.name);
    h += `<div class="fr r-${f.rar}${NOW - S.pickT < 2000 && f === live[0] ? ' pick' : ''}" style="opacity:${a.toFixed(3)};transform:translateY(${dy.toFixed(2)}px)" data-role="body" data-rar="${f.rar}">${mk}<span class="nm">${esc(nm)}</span>${f.n > 1 ? `<span class="n">+${fmt(f.n)}</span>` : ''}</div>`;
  }
  if (S.filter !== 'all' && S.filtered)
    h += `<div class="fr sum" data-role="body"><span class="nm">${esc(isEN() ? pad0(`+${fmt(S.filtered)} items collected`) : `+${fmt(S.filtered)} 件已收`)}</span></div>`;
  if (fd.innerHTML !== h) fd.innerHTML = h;
  /* 王或菁英進到動態框：字牌底 0.92 → 0.6，字不變 */
  const fr = fd.getBoundingClientRect(),
    u = $('ui').getBoundingClientRect(),
    sc = u.width / $('ui').offsetWidth,
    R = { x: (fr.x - u.x) / sc, y: (fr.y - u.y) / sc, w: fr.width / sc, h: fr.height / sc };
  const hit = F.boxes.some(b => b.x < R.x + R.w && b.x + b.w > R.x && b.y < R.y + R.h && b.y + b.h > R.y);
  fd.classList.toggle('thin', hit);
  fd.dataset.thin = hit ? 1 : 0;
}

/* ---------- 每格動畫（全由 NOW 算） ---------- */
/* 淡入：一般 160；減少動態 120（逐幀量要 ≤ 150，#20） */
const FIN = () => (P.rm ? 120 : 160);
/* 低血紅框（N2）：四邊各一條 24 px linear-gradient，最邊緣 α 0.35／0.55，往內漸變到 0（不用模糊陰影） */
const vign = a => {
  if (!a) return '';
  const c = `rgb(var(--hurt-vignette-rgb) / ${a})`,
    z = 'rgb(var(--hurt-vignette-rgb) / 0)';
  return [
    ['bottom', 'top', '100% 24px'],
    ['top', 'bottom', '100% 24px'],
    ['right', 'left', '24px 100%'],
    ['left', 'right', '24px 100%']
  ]
    .map(([to, at, sz]) => `linear-gradient(to ${to}, ${c}, ${z}) ${at} / ${sz} no-repeat`)
    .join(', ');
};
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeOutExpo = t => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
function tick() {
  const g = geo(),
    port = g.port;
  drawField();
  drawMini();
  drawFeed();
  /* 王橫幅：出現 → 停 800 → 240 ms ease-out 縮進王血條；大招 0 ms 讓位 */
  const bb = $('d-boss');
  if (bb && S.boss !== 'none') {
    const t = NOW - S.bossT,
      ultHit = S.ultT >= S.bossT && S.ultT <= NOW;
    const sh = bb.querySelector('.bsh'),
      bt = bb.querySelector('.bt'),
      bf = bb.querySelector('.bf');
    const dy = +(bb.dataset.dy || 0),
      y0 = (port ? g.st + 39 : 84) + dy,
      y1 = (port ? g.st + 39 : 20) + dy,
      h0 = 44,
      h1 = port ? 20 : 22;
    let k = 1;
    if (t < 800 && !ultHit) k = 0;
    else if (t < 1040 && !ultHit) k = P.rm ? 1 : easeOut((t - 800) / 240);
    if (S.boss === 'bar') k = 1;
    const ban = k < 1;
    bb.style.top = (y0 + (y1 - y0) * k).toFixed(2) + 'px';
    bb.style.height = (h0 + (h1 - h1 * 0 - h0) * k).toFixed(2) + 'px';
    if (P.fs) bb.style.height = Math.max(port ? 20 : 22, h0 + (h1 - h0) * k) * (k >= 1 ? 1 : 1) + 'px';
    bb.style.opacity = P.rm && t < 150 && !ultHit ? (t / 150).toFixed(3) : '1';
    sh.classList.toggle('hide', !(t < 800 && !ultHit && S.boss !== 'bar'));
    bt.style.visibility = k >= 1 ? 'visible' : t >= 800 ? 'visible' : 'hidden';
    bf.style.visibility = bt.style.visibility;
    bb.dataset.phase = k <= 0 ? 'banner' : k < 1 ? 'shrink' : 'bar';
    bb.dataset.m = k >= 1 ? 'H05' : 'H04';
    if (P.fs && k >= 1) bb.style.height = (port ? 20 : 22) * 1 + 'px';
  }
  const ul = $('d-ult');
  if (ul) {
    const on = S.ult && NOW >= S.ultT;
    ul.classList.toggle('hide', !on);
    const t = NOW - S.ultT;
    ul.style.transform = on && !P.rm && t < 80 ? `scale(${(1.1 - (0.1 * t) / 80).toFixed(4)})` : '';
  }
  /* 倒下（V5） */
  const dt = NOW - S.downT,
    cv = $('cv');
  let gray = 0;
  if (dt >= 0 && dt < 3000) gray = P.rm ? 0 : Math.min(1, dt / 300);
  cv.style.filter = gray ? `grayscale(${gray.toFixed(3)})` : '';
  const dp = $('d-dplate');
  if (dp) {
    const on = dt >= 0 && dt < 3000;
    dp.classList.toggle('hide', !on);
    if (on) {
      const s = Math.ceil((3000 - dt) / 1000);
      const txt = T(`倒下・${s} 秒後回到戰場`, `Down · back to the field in ${s}s`);
      if (dp.textContent !== txt) dp.textContent = txt;
      dp.style.opacity = P.rm ? 1 : Math.min(1, dt / 300).toFixed(3);
    }
    document.body.classList.toggle('downed', on);
  }
  const fd = $('d-fade');
  if (fd) {
    const t = NOW - S.fadeT;
    const fin = FIN();
    fd.style.opacity = t < 0 || t > 120 + fin ? 0 : t < 120 ? (t / 120).toFixed(3) : (1 - (t - 120) / fin).toFixed(3);
  }
  const d3 = $('d-d3');
  if (d3) {
    const t = NOW - S.d3T,
      on = t >= 0 && t < 6300;
    d3.classList.toggle('hide', !on);
    if (on) d3.style.opacity = t < 6000 ? 1 : (1 - (t - 6000) / 300).toFixed(3);
  }
  /* 低血邊（常亮不閃）、魔力過熱（呼吸 800 ms 0.6–1；減少動態關） */
  const vg = $('d-vign');
  if (vg) {
    const hp = S.hp != null ? S.hp : 1,
      a = hp < 0.2 ? 0.55 : hp < 0.35 ? 0.35 : 0;
    vg.style.background = vign(a);
    vg.dataset.a = a;
  }
  const mp = $('d-mp');
  /* 過熱：條不換底色、不發光，只有 1 px --warn 外框；框呼吸 800 ms 0.6–1（減少動態常亮），條和字不跟著變淡 */
  if (mp && S.mpHot) {
    const a = P.rm ? 1 : 0.8 + 0.2 * Math.cos((NOW / 800) * Math.PI * 2);
    mp.style.boxShadow = `0 0 0 1px color-mix(in srgb, var(--warn) ${(a * 100).toFixed(1)}%, transparent)`;
  }
  /* 吐司 */
  const ts = $('d-toast');
  if (ts && S.toast) ts.style.opacity = P.rm ? 1 : Math.min(1, (NOW - S.toast.t0) / 150).toFixed(3);
  /* 掛機條：展開／收 200 ms；6 秒沒操作自動收 */
  const id = $('d-idle');
  if (id) {
    const t = NOW - S.idleT,
      hc = port ? 44 : 40,
      ho = 200;
    const k = P.rm ? 1 : Math.min(1, t / 200),
      from = S.idleOpen ? hc : ho,
      to = S.idleOpen ? ho : hc;
    id.style.height = (from + (to - from) * easeOut(k)).toFixed(2) + 'px';
    if (P.rm) id.style.opacity = S.idleT > 0 ? Math.min(1, t / 150).toFixed(3) : 1;
    if (S.idleOpen && NOW - Math.max(S.idleT, S.idleTouch) > 6000) idleToggle(0, 'auto');
    const aw = $('d-away'),
      at = NOW - S.awayT;
    if (aw) {
      const on = at >= 0 && at < 6000;
      aw.classList.toggle('hide', !on);
      if (on) {
        const a = D('away'),
          txt = isEN() && ENV('away') ? ENV('away') : a.text;
        if (aw.textContent !== txt) aw.textContent = txt;
      }
    }
  }
  const cg = $('d-cgain');
  if (cg) {
    const t = NOW - S.gainT,
      on = t >= 0 && t < 3300;
    cg.classList.toggle('hide', !on);
    if (on) {
      const c = D('campGain');
      const txt = isEN() && ENV('campGain') ? ENV('campGain') : c.text;
      const body = esc(isEN() && ENV('campGain') ? pad0(txt) : T(txt)).replace(/◆/g, '<span class="r-rare">◆</span>');
      const html = c.chase ? `<span class="ch">${wy('wangyin_guixu_16')}</span>${body}` : body;
      if (cg.dataset.h !== html) (cg.innerHTML = html), (cg.dataset.h = html);
      cg.style.opacity = t < 3000 ? 1 : (1 - (t - 3000) / 300).toFixed(3);
    }
  }
  /* 離線結算：數字 1,200 ms ease-out-expo；掉落每列隔 120、追逐列 600 */
  const of = $('d-off');
  if (of) {
    const t = S.offDone || P.rm ? 1e9 : NOW - S.offT;
    const sum = $('d-offsum');
    const k = easeOutExpo(Math.min(1, t / 1200));
    sum.textContent = countText(sum.dataset.v, k, isEN());
    of.querySelectorAll('.offr').forEach(li => {
      const i = li.dataset.i,
        at = i === 'ch' ? 600 + 120 * 3 : 120 * +i;
      const a = Math.min(1, Math.max(0, (t - at) / 120));
      li.style.opacity = a.toFixed(3);
      li.style.transform = P.rm ? '' : `translateY(${((1 - a) * 6).toFixed(2)}px)`;
      const v = li.querySelector('.offv');
      if (v) v.textContent = countText(v.dataset.v, k, isEN());
    });
    of.dataset.done = t >= 1200 + 960 ? 1 : 0;
    of.dataset.k = k;
  }
  /* 長按：600 ms 填滿；早放開 ≤ 150 ms 退回 */
  document.querySelectorAll('.btn.hold').forEach(b => {
    const f = b.querySelector('.fill'),
      H = S.hold && S.hold.k === b.dataset.hold ? S.hold : null;
    let w = 0;
    if (H && H.up == null) w = Math.min(1, (NOW - H.t0) / 600);
    else if (H && H.up != null) w = Math.max(0, H.w * (1 - (NOW - H.up) / 120));
    else if (S.holdDoneK === b.dataset.hold && NOW - S.holdDone < 150) w = 1;
    f.style.width = (w * 100).toFixed(2) + '%';
    b.dataset.fill = w.toFixed(4);
  });
  const ht = $('d-holdtip');
  if (ht) {
    const on = NOW - S.holdTipT < 2000;
    const txt = on ? T('按住 0.6 秒') : S.holdDone && NOW - S.holdDone < 1500 ? T('已確認') : '';
    if (ht.textContent !== txt) ht.textContent = txt;
  }
  /* 抽屜滑入 200 ms；滑完那一格戰場才改高（V9） */
  const dw = $('d-drw') || document.querySelector('[data-panel]');
  if (dw && S.panel && !fullPanel()) {
    const t = NOW - S.drawerT,
      k = Math.min(1, t / 200);
    if (P.rm) dw.style.opacity = Math.min(1, t / 150).toFixed(3);
    else
      dw.style.transform = port
        ? `translateY(${((1 - easeOut(k)) * g.drawerH).toFixed(2)}px)`
        : `translateX(${((1 - easeOut(k)) * 436).toFixed(2)}px)`;
    if (port && t >= (P.rm ? 150 : 200) && !S.fieldPanel) {
      S.fieldPanel = 1;
      log('field-resize', { h: geo().fieldBot - geo().fieldTop });
      build();
    }
  }
  /* 營地抖 2 px ×2、120 ms（C03）；F4 停用 120 ms 抖（V8，demo 未驗） */
  if (S.shakeEl) {
    const e = document.querySelector(S.shakeEl),
      t = NOW - S.shakeT;
    if (e) {
      e.style.transform = t < 120 && !P.rm ? `translateX(${(Math.sin((t / 120) * Math.PI * 4) * 2).toFixed(2)}px)` : '';
      /* 減少動態：不抖，改一次 120 ms 亮度閃光 */
      e.style.filter = t < 120 && P.rm ? `brightness(${(1.8 - (0.8 * t) / 120).toFixed(3)})` : '';
    }
  }
  /* 鍛造揭曉翻牌（V8）、保底 100% */
  const fb = $('d-fb'),
    ff = $('d-ff');
  if (fb) {
    const t = NOW - S.flipT,
      k = S.flipT < 0 ? 0 : Math.min(1, t / 320);
    /* 減少動態：不翻、不抖，揭曉那一格直接換，給一次 120 ms 亮度閃光 */
    if (P.rm)
      (fb.style.opacity = S.flipT < 0 ? 1 : 0),
        (ff.style.opacity = S.flipT < 0 ? 0 : 1),
        (ff.style.filter = S.flipT >= 0 && t < 120 ? `brightness(${(1.8 - (0.8 * t) / 120).toFixed(3)})` : ''),
        (fb.style.transform = ff.style.transform = '');
    else
      (fb.style.transform = `rotateY(${(easeOut(k) * 180).toFixed(2)}deg)`),
        (ff.style.transform = `rotateY(${(180 + easeOut(k) * 180).toFixed(2)}deg)`),
        (ff.style.opacity = 1),
        (fb.style.opacity = 1);
    const pt = NOW - S.pityT,
      pk = S.pityT < 0 ? 0 : Math.min(1, pt / 400),
      pv = Math.round(96 + 4 * pk);
    $('d-pityf').style.width = pv + '%';
    $('d-pityt').textContent = T(`下一件保底 ${pv}%`);
    $('d-pity').classList.toggle('full', pv >= 100);
    const cb = $('d-chban');
    cb.classList.toggle('hide', pk < 1);
    if (pk >= 1)
      cb.style.boxShadow = P.rm
        ? ''
        : `0 0 ${(8 + 8 * Math.sin(((pt - 400) / 600) * Math.PI * 2)).toFixed(1)}px rgba(var(--rar-chase-rgb), 0.6)`;
  }
  /* 天賦樹即時戰場條（V1） */
  const sp = $('d-strip');
  if (sp) {
    const want = stripBig() ? 1 : 0;
    if (want !== S.strip) (S.strip = want), (S.stripT = NOW), log('strip', { big: want });
    const hh = stripH(g);
    sp.style.height = hh + 'px';
    const tc = $('d-treecv');
    if (tc) tc.style.top = hh + 'px';
    const hp = S.hp != null ? S.hp : 0.8,
      a = hp < 0.35 ? (hp < 0.2 ? 0.55 : 0.35) : 0;
    $('d-sv').style.background = vign(a);
    $('d-back').classList.toggle('hide', !(hp < 0.35));
    $('d-shp').style.width = hp * 100 + '%';
    const life = D('life');
    $('d-shpt').textContent = `${fmt(Math.round(life[1] * hp))}／${fmt(life[1])}`;
    drawTree();
  }
  /* 下一個目標 100%：條亮 160 ms（減少動態只換字） */
  const gs = $('d-gs');
  if (gs) gs.classList.toggle('flash', !P.rm && NOW - S.goalT >= 0 && NOW - S.goalT < 160);
  /* C04：建議那座變買得起 → 160 ms 填滿成實心 */
  if (S.sugT > 0) {
    const st = document.querySelector('.cc.sug .stamp');
    if (st) {
      const k = P.rm ? 1 : Math.min(1, (NOW - S.sugT) / 160);
      st.style.boxShadow = `inset 0 0 0 ${(k * 22).toFixed(1)}px var(--act)`;
      st.style.color = k >= 1 ? 'var(--on-act)' : '';
    }
  }
}
/* 數字跑：字串裡每個數字照 k 比例顯示 */
function countText(s, k, en) {
  const o = s.replace(/[\d,]+(\.\d+)?/g, m => {
    const v = +m.replace(/,/g, '');
    if (!isFinite(v)) return m;
    const cur = v * k;
    return m.includes('.') ? cur.toFixed(1) : m.includes(',') ? fmt(Math.round(cur)) : String(Math.round(cur));
  });
  return en ? T(o) : o;
}

/* ---------- 動作 ---------- */
function idleToggle(open, why) {
  S.idleOpen = open;
  S.idleT = NOW;
  S.idleTouch = NOW;
  log(open ? 'idle-open' : 'idle-close', { why });
  build();
}
function openPanel(p, opt) {
  if (S.panel === p) return closePanel();
  const was = S.panel;
  S.panel = p;
  if (opt) Object.assign(S, opt);
  if (!was || fullPanel()) S.drawerT = NOW;
  if (fullPanel()) S.fieldPanel = 0;
  log('panel', { p });
  build();
}
function closePanel() {
  S.panel = null;
  S.fieldPanel = 0;
  S.pick = null;
  log('panel', { p: null });
  build();
}
function goCamp() {
  S.scr = 'camp';
  S.panel = null;
  S.fieldPanel = 0;
  S.campIn = NOW;
  S.campSkip = 0;
  log('camp-in');
  build();
}
function backToField() {
  const stay = NOW - S.campIn + S.campSkip;
  S.scr = 'hud';
  S.panel = null;
  S.fieldPanel = 0;
  S.fadeT = NOW - 120; /* 淡入 160（減少動態 120） */
  log('camp-out', { stay });
  if (stay >= 10000 && D('campGain'))
    (S.gainT = NOW + 160), log('gain', { at: NOW + 160 }); /* 淡入 160 結束後出（減少動態淡入較短，仍等 160） */
  build();
}
function down() {
  if (NOW - S.downT < 3000) return;
  S.downN++;
  S.downT = NOW;
  log('down', { n: S.downN });
  build();
  later(3000, () => {
    log('revive', { n: S.downN });
    if (S.downN >= 3) {
      S.fadeT = NOW;
      later(120, () => {
        S.loc = PREV[loc()] || loc();
        S.d3T = NOW - 0;
        S.downN = 0;
        log('d3-line');
        build();
      });
    }
    build();
  });
}
function bossAppear() {
  S.boss = 'banner';
  S.bossT = NOW;
  S.bossHp = D('boss').hp[0];
  log('boss-banner');
  build();
}
function bossUlt() {
  S.ult = 1;
  S.ultT = NOW;
  log('ult');
  build();
}
function toast(kind, text, ms = 2500) {
  S.toast = { kind, text, t0: NOW };
  build();
  later(ms, () => {
    if (S.toast && S.toast.text === text) (S.toast = null), build();
  });
}
/* 長按：0.6 秒；放開＝取消 */
function holdStart(k) {
  if (S.hold && S.hold.up == null) return;
  S.hold = { k, t0: NOW };
  log('hold-start', { k });
  later(600, () => {
    if (S.hold && S.hold.k === k && S.hold.up == null && NOW - S.hold.t0 >= 600 - 0.01) {
      log('hold-done', { k, ms: NOW - S.hold.t0 });
      S.hold = null;
      S.holdDone = NOW;
      S.holdDoneK = k;
      if (k === 'danger') (S.dlg = null), build(), toast('', T('分解 3 件・拿回 崇高石 ×2'));
    }
  });
}
function holdEnd() {
  if (!S.hold || S.hold.up != null) return;
  const w = Math.min(1, (NOW - S.hold.t0) / 600);
  if (w < 1) {
    S.hold.up = NOW;
    S.hold.w = w;
    S.holdTipT = NOW;
    log('hold-cancel', { ms: NOW - S.hold.t0 });
    const k = S.hold.k;
    later(150, () => {
      if (S.hold && S.hold.k === k && S.hold.up != null) S.hold = null;
    });
  }
}
const TIMERS = [];
const later = (ms, fn) => TIMERS.push({ at: NOW + ms, fn });
function runTimers() {
  for (let i = 0; i < TIMERS.length; i++)
    if (TIMERS[i].at <= NOW + 0.001) {
      const t = TIMERS.splice(i--, 1)[0];
      t.fn();
    }
}

/* ---------- 輸入 ---------- */
function onClick(e) {
  if (NOW - S.downT < 3000 && e.target.closest('.sk')) return; /* 倒下 0 ms 停輸入 */
  const t = e.target.closest('[data-k]');
  if (!t) return;
  const k = t.dataset.k;
  S.idleTouch = NOW;
  if (k.startsWith('tab-')) return tabGo(t.dataset.tab);
  if (k === 'idle' || k === 'idlex') return idleToggle(!S.idleOpen, 'click');
  if (k === 'spect') return (S.spect = 1), (S.idleOpen = 0), build();
  if (k === 'goal' || k === 'goal2')
    return openPanel('camp', { pick: D('goal').fac }), S.panel !== 'camp' && openPanel('camp', { pick: D('goal').fac });
  if (k === 'feed') return (S.pickT = NOW), openPanel('log');
  if (k === 'd3') return openPanel('death');
  if (k === 'px') return closePanel();
  if (k === 'back') return closePanel();
  if (k.startsWith('st-') || k.startsWith('cb-') || k.startsWith('pq-')) {
    const f = t.dataset.fac;
    if (k.startsWith('st-') && t.dataset.solid !== '1') {
      S.shakeEl = `[data-k="${k}"]`;
      S.shakeT = NOW;
      S.lackFac = f;
      log('shake', { k });
      build();
      later(1500, () => S.lackFac === f && ((S.lackFac = null), build()));
      return;
    }
    if (!costOf(f)) return;
    return (S.panel = 'card'), (S.cardFac = f), (S.drawerT = S.drawerT > 0 ? S.drawerT : NOW), build();
  }
  if (k === 'cprev' || k === 'cnext') {
    const L = campCells()
        .filter(c => c.c)
        .map(c => c.n),
      i = L.indexOf(S.cardFac);
    S.cardFac = L[(i + (k === 'cnext' ? 1 : L.length - 1)) % L.length];
    return build();
  }
  if (k === 'cgo') return backToField();
  if (k === 'dyes') return (S.dlg = null), goCamp();
  if (k === 'dno') return (S.dlg = null), build();
  if (k === 'offok')
    return S.offDone || P.rm || NOW - S.offT > 2200
      ? ((S.offOn = 0), log('off-close'), build())
      : ((S.offDone = 1), log('off-skip'));
  if (k === 'fmake') return (S.flipT = NOW), log('flip'), later(400, () => ((S.pityT = NOW), log('pity'))), 0;
  if (k === 'f4') return (S.shakeEl = '#d-f4'), (S.shakeT = NOW), log('f4-shake');
  if (t.dataset.opt) {
    const [o, v] = t.dataset.opt.split(':');
    S[o] = v;
    S.feed = [];
    feedSeed();
    return build();
  }
  if (k === 'b3') return (S.press = 'b3'), build(), later(80, () => ((S.press = null), build()));
}
function tabGo(k) {
  if (k === 'camp') return openPanel('camp');
  openPanel(k);
}
const ORDER = TABS.map(t => t[0]);
function onKey(e) {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.target && e.target.closest && e.target.closest('#ctl')) return;
  S.dev = SIZES[P.size].port ? S.dev : 'kbd';
  const k = e.key;
  if (e.type === 'keyup') {
    if ((k === 'Enter' || k === ' ') && S.hold) holdEnd();
    return;
  }
  if (e.repeat) return e.preventDefault();
  S.idleTouch = NOW;
  log('key', { k });
  if (k === 'Escape') return escLayer(), e.preventDefault();
  if (k === 'Tab') {
    e.preventDefault();
    const cur = ORDER.indexOf(tabOn()),
      n = cur < 0 ? (e.shiftKey ? ORDER.length - 1 : 0) : (cur + (e.shiftKey ? -1 : 1) + ORDER.length) % ORDER.length;
    tabGo(ORDER[n]);
    focusK('tab-' + ORDER[n]);
    return;
  }
  const a = document.activeElement;
  if ((k === 'Enter' || k === ' ') && a && a.dataset && a.dataset.hold)
    return e.preventDefault(), holdStart(a.dataset.hold);
  if (k === 'Enter' && S.offOn) return onClick({ target: $('d-offok') });
  if (k === 'Enter' && S.dlg === 'confirm') return onClick({ target: document.querySelector('[data-k="dyes"]') });
  if ((k === 'Enter' || k === ' ') && a && a.dataset && a.dataset.k) return e.preventDefault(), onClick({ target: a });
  if (k.startsWith('Arrow')) return e.preventDefault(), arrowMove(k);
  const L = { v: 'char', k: 'forge', g: 'skill', p: 'tree', h: 'camp', z: 'more' }[k.toLowerCase()];
  if (L) return tabGo(L), focusK('tab-' + L);
  const lk = k.toLowerCase();
  if (lk === 't') return (S.dlg = 'confirm'), build(), focusK('dyes');
  if (lk === 'l') return (S.pickT = NOW), openPanel('log');
  if (lk === 'x') return idleToggle(!S.idleOpen, 'key');
  if (lk === 'n') return (S.spect = !S.spect), build();
  if (k === '1' || k === '2') return potion(k);
  if (k === 'F4') return e.preventDefault(), S.panel === 'forge' && onClick({ target: $('d-f4') });
}
function potion(k) {
  log('potion', { k });
  if (k === '1') S.hp = Math.min(1, (S.hp != null ? S.hp : 0.84) + 0.3);
  else S.mpHot = 0;
  build();
}
/* Esc 逐層關：對話框 → 觀戰 → 天賦樹 → 面板 → 開設定；設定開著再按＝關 */
function escLayer() {
  let what;
  if (S.dlg) (S.dlg = null), (what = 'dialog');
  else if (S.offOn) (S.offOn = 0), (what = 'offline');
  else if (S.spect) (S.spect = 0), (what = 'spect');
  else if (S.panel === 'tree') (S.panel = null), (what = 'tree');
  else if (S.panel === 'more') (S.panel = null), (S.fieldPanel = 0), (what = 'settings');
  else if (S.panel) (S.panel = null), (S.fieldPanel = 0), (what = 'panel');
  else (S.panel = 'more'), (S.drawerT = NOW), (what = 'open-settings');
  log('esc', { what });
  build();
}
function focusK(k) {
  const e = document.querySelector(`#ui [data-k="${k}"]`);
  if (e) e.focus({ preventScroll: true });
  log('focus', { k });
}
function arrowMove(dir) {
  const L = [...document.querySelectorAll('#ui .kf:not(.hide)')].filter(
    e => e.offsetParent || e.getClientRects().length
  );
  const a = document.activeElement;
  if (!L.length) return;
  if (!L.includes(a)) return L[0].focus(), log('focus', { k: L[0].dataset.k });
  const r = a.getBoundingClientRect(),
    cx = r.x + r.width / 2,
    cy = r.y + r.height / 2;
  const dx = { ArrowLeft: -1, ArrowRight: 1 }[dir] || 0,
    dy = { ArrowUp: -1, ArrowDown: 1 }[dir] || 0;
  let best = null,
    bd = 1e9;
  for (const e of L) {
    if (e === a) continue;
    const q = e.getBoundingClientRect(),
      ex = q.x + q.width / 2 - cx,
      ey = q.y + q.height / 2 - cy;
    if (ex * dx + ey * dy <= 1) continue;
    const d = Math.abs(ex * dx + ey * dy) + 2 * Math.abs(ex * dy + ey * dx);
    if (d < bd) (bd = d), (best = e);
  }
  if (best) best.focus(), log('focus', { k: best.dataset.k });
}

/* ---------- 列：每一列把畫面設成那個狀態 ---------- */
const R = (id, t, fn, o = {}) => Object.assign({ id, t, fn }, o); /* o.steps：截圖前推幾格（預設 20） */
const ROWS = [
  R('S01', '按鈕・一般', () => sys('S01')),
  R('S02', '按鈕・按下', () => (sys('S02'), (S.press = 'b3')), { nv: '延遲' }),
  R('S03', '按鈕・停用＋原因', () => sys('S03')),
  R('S04', '按鈕・選中', () => sys('S04')),
  R('S05', '按鈕・鍵盤焦點', () => (sys('S05'), (S.dev = 'kbd'))),
  R('S06', '長按確認・按住中', () => (sys('S06'), (S.hold = { k: 'sys', t0: -300 }))),
  R('S07', '長按確認・太早放開', () => (sys('S07'), (S.holdTipT = 0))),
  R('S08', '一般確認卡', () => (S.dlg = 'confirm')),
  R('S09', '破壞性確認', () => (S.dlg = 'danger')),
  R('S10', '吐司・一般', () => (S.toast = { kind: '', text: T('鍛造台 Lv13：破裂石開始掉'), t0: -1000 })),
  R('S11', '吐司・危險', () => (S.toast = { kind: 'warn', text: T('倉庫快滿', ENV('stash')), t0: -1000 })),
  R('S12', '直立格線・PWA', () => (S.grid = 1), { size: '390x763' }),
  R('S13', '直立格線・瀏覽器分頁', () => ((S.grid = 1), (S.panel = 'camp'), (S.fieldPanel = 1), (S.drawerT = -1000)), {
    size: '390x664'
  }),
  R('S14', '桌機格線', () => ((S.grid = 1), (S.panel = 'camp'), (S.fieldPanel = 1), (S.drawerT = -1000)), {
    size: 'desk'
  }),
  R('S15', '黏底動作列', () => ((S.panel = 'list'), (S.fieldPanel = 1), (S.drawerT = -1000))),
  R('H01', '戰鬥・沒開面板總覽', () => 0),
  R('H02', '資訊列', () => 0),
  R('H03', '離王進度', () => 0),
  R('H04', '王現身橫幅', () => ((S.boss = 'banner'), (S.bossT = -200))),
  R('H05', '王血條', () => ((S.boss = 'bar'), (S.bossHp = D('boss').hp[1]))),
  R('H06', '大招警示', () => ((S.boss = 'bar'), (S.bossHp = D('boss').hp[1]), (S.ult = 1), (S.ultT = -500)), {
    nv: '預警時長'
  }),
  R('H07', '掉落動態・3／6 列滿', () => ((S.filter = 'all'), (S.feedFill = 1))),
  R('H08', '掉落動態・稀有以上（預設）', () => (S.filter = 'rare')),
  R('H09', '掉落動態・全部／稀有以上', () => (S.filter = 'all')),
  R('H10', '掉落動態・滿了又進新的', () => ((S.filter = 'all'), (S.feedFill = 2))),
  R(
    'H11',
    '掉落動態・點開掉落紀錄',
    () => ((S.panel = 'log'), (S.fieldPanel = 1), (S.drawerT = -1000), (S.pickT = -100))
  ),
  R('H12', '跳數字・最忙', () => (S.numBurst = 1), { nv: '打擊感' }),
  R('H13', '生命條、魔力條・一般', () => 0),
  R('H14', '低血 < 35%', () => (S.hp = 0.3), { nv: '震動' }),
  R('H15', '低血 < 20%', () => (S.hp = 0.15), { nv: '震動' }),
  R('H16', '魔力過熱', () => (S.mpHot = 1)),
  R('H17', '狀態圖示・0／1／8／+n', () => 0),
  R('H18', '技能鈕・一般', () => 0),
  R('H19', '技能鈕・冷卻／彈匣 0／蓄力段／藥劑', () => 0),
  R('H20', '倒下字板', () => (S.downT = -1200)),
  R('H21', '連續倒下 3 次・一行', () => ((S.d3T = -500), (S.loc = PREV[D('area')[0]]))),
  R('H22', '連續倒下 3 次・詳情', () => ((S.panel = 'death'), (S.fieldPanel = 1), (S.drawerT = -1000))),
  R(
    'H23',
    '開面板・戰場縮',
    () => ((S.panel = 'camp'), (S.fieldPanel = 1), (S.drawerT = -1000), (S.boss = 'bar'), (S.bossHp = 38))
  ),
  R('C01', '底分頁 6 格', () => 0),
  R(
    'C02',
    '營地升級抽屜・買得起',
    () => (openNow('camp'), (S.pick = campCells().find(c => c.c && c.c.can)?.n || null))
  ),
  R(
    'C03',
    '營地升級抽屜・買不起',
    () => (
      openNow('camp'), (S.shakeEl = '[data-k="st-林場"]'), (S.shakeT = 0), (S.lackFac = '林場'), (S.pick = '林場')
    ),
    { steps: 4 }
  ),
  R('C04', '營地升級抽屜・建議', () => (openNow('camp'), (S.pick = D('goal').fac))),
  R('C05', '營地升級抽屜・刷圖不停', () => openNow('camp')),
  R('C06', '單座卡', () => (openNow('card'), (S.cardFac = D('goal').fac === '瞭望台' ? '瞭望台' : '林場'))),
  R('C07', '營地場景首頁', () => (S.scr = 'camp')),
  R('C08', '營地場景・主鈕列', () => (S.scr = 'camp')),
  R('C09', '營地場景・掛機條', () => (S.scr = 'camp')),
  R('C10', '回戰場・「營地期間 +N」', () => (S.gainT = -500)),
  R('C11', '資源列・7 位數', () => (S.scr = 'camp'), { save: 'big' }),
  R('C12', '下一個目標條', () => (S.scr = 'camp')),
  R('I01', '掛機條・收起', () => 0),
  R('I02', '掛機條・展開', () => ((S.idleOpen = 1), (S.idleT = -1000))),
  R('I03', '掛機卡 mini', () => ((S.idleOpen = 1), (S.idleT = -1000))),
  R('I04', '倉庫快滿', () => 0, { save: 'near' }),
  R('I05', '離開 N 分一行', () => (S.awayT = -500)),
  R('I06', '保底 100%', () => 0, { save: 'en' }),
  R('I07', '離線結算・跑數字中', () => ((S.offOn = 1), (S.offT = -500)), { save: 'full' }),
  R('I08', '離線結算・跑完', () => ((S.offOn = 1), (S.offDone = 1)), { save: 'full' }),
  R('K01', '鍵帽跟輸入裝置換', () => (S.dev = 'kbd')),
  R('K02', 'Esc 逐層關', () => ((S.dev = 'kbd'), (S.panel = 'tree'))),
  R('K03', 'Tab／Shift+Tab', () => ((S.dev = 'kbd'), openNow('char'), (S.focus = 'tab-char'))),
  R('K04', '分頁字母鍵', () => ((S.dev = 'kbd'), openNow('camp'))),
  R('K05', '1／2 藥劑', () => ((S.dev = 'kbd'), openNow('camp'), (S.hp = 0.6))),
  R(
    'K06',
    'L／X／N',
    () => ((S.dev = 'kbd'), (S.panel = 'log'), (S.fieldPanel = 1), (S.drawerT = -1000), (S.pickT = -100))
  ),
  R('K07', '方向鍵／Enter／空白', () => ((S.dev = 'kbd'), openNow('camp'), (S.focus = 'cb-瞭望台'))),
  R('K08', '分頁只剩圖示時', () => ((S.navIcon = 1), (S.tip = { t: '營地', x: 0, y: 0 })))
];
function sys(k) {
  S.scr = 'sys';
  S.sec = k;
}
function openNow(p) {
  S.panel = p;
  S.drawerT = -1000;
  S.fieldPanel = fullPanel() ? 0 : 1;
}

/* ---------- 動態腳本（V1–V9）：錄影用；每個時間點是相對開始的毫秒 ---------- */
const key = (k, o = {}) => {
  const ev = new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, o));
  (document.activeElement || document.body).dispatchEvent(ev);
};
const keyUp = k =>
  (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true }));
const tap = k => onClick({ target: document.querySelector(`#ui [data-k="${k}"]`) });
const SCN = {
  V1: {
    t: 'T1 天賦樹即時戰場條（清單原寫屬 D2，照製作人提前做）',
    save: 'mid',
    dur: 6000,
    at: [
      [0, () => (openNow('tree'), (S.hp = 0.6), build())],
      [800, () => (S.hp = 0.3)],
      [2000, () => (S.hp = 0.15)],
      [3400, () => (S.hp = 0.5)],
      [4200, () => ((S.ult = 1), (S.ultT = NOW), log('ult'))],
      [5400, () => (S.ult = 0)]
    ]
  },
  V2: {
    t: '營地／試招場暫停與補算',
    save: 'mid',
    dur: 9000,
    at: [
      [300, () => openPanel('camp')],
      [1600, () => closePanel()],
      [2000, () => goCamp()],
      [2600, () => (S.campSkip = 180000), log('skip-3min')],
      [3200, () => backToField()],
      [7200, () => goCamp()],
      [8200, () => backToField()]
    ]
  },
  V3: {
    t: '0.6 秒長按',
    save: 'mid',
    dur: 5200,
    at: [
      [0, () => (sys('S06'), build(), focusK('bhold'))],
      [300, () => holdStart('sys')],
      [600, () => holdEnd()],
      [1400, () => holdStart('sys')],
      [2400, () => holdEnd()],
      [2700, () => ((S.scr = 'hud'), (S.dlg = 'danger'), build(), focusK('dhold'))],
      [3000, () => holdStart('danger')],
      [3200, () => holdEnd()],
      [3900, () => holdStart('danger')]
    ]
  },
  V4: {
    t: '王現身橫幅',
    save: 'mid',
    dur: 4200,
    at: [
      [200, () => bossAppear()],
      [1800, () => ((S.boss = 'none'), (S.ult = 0), build())],
      [2000, () => bossAppear()],
      [2500, () => bossUlt()]
    ]
  },
  V5: {
    t: '倒下',
    save: 'mid',
    dur: 16500,
    at: [
      [300, () => down()],
      [3600, () => down()],
      [6900, () => down()]
    ]
  },
  V6: {
    t: '掉落動態合併與停留',
    save: 'mid',
    dur: 22200,
    at: [
      [0, () => ((S.filter = 'all'), (S.feed = []), build())],
      [200, () => feedPush('百煉鋼', 'normal', 3)],
      [500, () => feedPush('增幅石', 'normal')],
      [800, () => feedPush('崇高石', 'rare')],
      [1200, () => feedPush('百煉鋼', 'normal', 2)],
      [1600, () => feedPush('高階增幅石', 'rare')],
      [2000, () => feedPush('聖化石', 'normal')],
      [2300, () => feedPush('赤霄印', 'chase')],
      [2600, () => feedPush('玄鐵', 'normal')],
      [2800, () => feedPush('轉化石', 'normal')],
      [3000, () => feedPush('磨刀石', 'normal')],
      [3200, () => feedPush('蛻變石', 'normal')],
      [3400, () => feedPush('預知石', 'normal')],
      [11600, () => ((S.filter = 'rare'), build())],
      [11800, () => feedPush('百煉鋼', 'normal', 5)],
      /* 列沒滿的一段：只進 1 列普通，量它停滿 3 秒（V6 審查） */
      [13000, () => ((S.filter = 'all'), (S.feed = []), log('feed-quiet'), build())],
      [13200, () => feedPush('聖化石', 'normal')],
      /* 列沒滿的合併：同一列普通 +1 兩次，停留從最後一次 +1 重新算（V6 23:16） */
      [17000, () => ((S.feed = []), log('feed-quiet2'), build())],
      [17200, () => feedPush('百煉鋼', 'normal', 3)],
      [18400, () => feedPush('百煉鋼', 'normal', 1)]
    ]
  },
  V7: {
    t: '掛機條與離線結算',
    save: 'full',
    dur: 11000,
    at: [
      [300, () => idleToggle(1, 'click')],
      [1200, () => idleToggle(0, 'click')],
      [1700, () => idleToggle(1, 'click')],
      [8200, () => ((S.offOn = 1), (S.offT = NOW), (S.offDone = 0), log('off-open'), build())],
      [9900, () => ((S.offOn = 0), build(), (S.offOn = 1), (S.offT = NOW), (S.offDone = 0), log('off-open'), build())],
      [10200, () => tap('offok')]
    ]
  },
  V7a: {
    t: '掛機條展開後 6 秒沒操作自動收（V7 審查補錄）',
    save: 'mid',
    dur: 7400,
    at: [[300, () => idleToggle(1, 'click')]]
  },
  V8: {
    t: '鍛造揭曉、保底 100%、F4 120 ms 震（清單原寫屬 D2，照製作人提前做；120 ms 震 demo 未驗，進遊戲量）',
    save: 'mid',
    dur: 4200,
    at: [
      [0, () => (openNow('forge'), build())],
      [400, () => tap('fmake')],
      [2400, () => key('F4')],
      [3000, () => tap('f4')]
    ]
  },
  V9: {
    t: '面板改高與鍵盤焦點',
    save: 'mid',
    dur: 9000,
    at: [
      [0, () => ((S.dev = SIZES[P.size].port ? 'auto' : 'kbd'), build())],
      [300, () => key('h')],
      [1300, () => key('Tab')],
      [1800, () => key('Tab')],
      [2300, () => key('Tab', { shiftKey: true })],
      [2800, () => key('h')],
      [3200, () => key('ArrowDown')],
      [3500, () => key('ArrowRight')],
      [3800, () => key('ArrowDown')],
      [4100, () => key('Enter')],
      [4700, () => key('Escape')],
      [5100, () => key('p')],
      [5500, () => key('n')],
      [5900, () => key('t')],
      [6400, () => key('Escape')],
      [6800, () => key('Escape')],
      [7200, () => key('Escape')],
      [7600, () => key('Escape')],
      [8200, () => key('Escape')]
    ]
  }
};
let SCN_ON = null;
function startScn(k) {
  const s = SCN[k];
  P.save = s.save;
  apply(null);
  SCN_ON = { k, t0: NOW, i: 0 };
  log('scn', { k });
}
function runScn() {
  if (!SCN_ON) return;
  const s = SCN[SCN_ON.k],
    t = NOW - SCN_ON.t0;
  while (SCN_ON.i < s.at.length && s.at[SCN_ON.i][0] <= t + 0.001) s.at[SCN_ON.i++][1]();
}

/* ---------- 套用列／存檔／尺寸 ---------- */
function apply(rowId) {
  TIMERS.length = 0;
  fresh();
  NOW = Math.max(NOW, 10000);
  const r = rowId && ROWS.find(x => x.id === rowId);
  fieldReset();
  if (r) {
    r.fn();
    /* 相對時間改成絕對 */
    for (const k of [
      'bossT',
      'ultT',
      'downT',
      'd3T',
      'awayT',
      'gainT',
      'offT',
      'drawerT',
      'pickT',
      'holdTipT',
      'shakeT',
      'idleT'
    ])
      if (S[k] > -1e8 && S[k] <= 0) S[k] += NOW;
    if (S.hold) S.hold.t0 += NOW;
    if (S.toast) S.toast.t0 += NOW;
  }
  feedSeed();
  if (S.feedFill) fillFeed();
  if (S.numBurst) for (let i = 0; i < 40; i++) sim(50);
  build();
  if (S.focus) focusK(S.focus);
  if (S.scr === 'sys' && S.sec) {
    const sec = document.querySelector(`[data-sec="${S.sec}"]`) || document.querySelector('[data-sec="S06"]');
    if (sec) sec.scrollIntoView({ block: 'center' });
    drawerFit();
  }
  if (r && r.id === 'S05') document.querySelector('[data-k="b7"]').focus();
  if (r && r.id === 'K08') {
    const b = document.querySelector('[data-tab="camp"]');
    if (b) {
      const q = b.getBoundingClientRect(),
        u = $('ui').getBoundingClientRect(),
        s = SIZES[P.size].port ? 1 : SIZES[P.size].z;
      S.tip = { t: T('營地'), x: (q.x - u.x) / s + 33, y: (q.y - u.y) / s - 6 };
      build();
    }
  }
  if (r && r.id === 'K06') focusK('px');
  sel();
}
function fillFeed() {
  const n = feedCap();
  const L = [
    ['百煉鋼', 'normal'],
    ['增幅石', 'normal'],
    ['聖化石', 'normal'],
    ['崇高石', 'rare'],
    ['高階增幅石', 'rare'],
    ['玄鐵', 'normal'],
    ['轉化石', 'normal']
  ];
  S.feed = [];
  for (let i = 0; i < n; i++)
    S.feed.push({ name: L[i % L.length][0], rar: L[i % L.length][1], n: 1 + i, t0: NOW - 400, tIn: NOW - 400 });
  if (S.feedFill === 2) feedPush('赤霄印', 'chase');
}

/* ---------- 控制列 ---------- */
function sel() {
  $('c-size').value = P.size;
  $('c-save').value = P.save;
  $('c-row').value = P.row;
  $('c-fs').checked = P.fs;
  $('c-en').checked = P.en;
  $('c-rm').checked = P.rm;
  fit();
}
function fit() {
  if (document.body.classList.contains('bare')) return;
  const z = SIZES[P.size],
    avW = window.innerWidth - 24,
    avH = window.innerHeight - $('ctl').offsetHeight - 24;
  const s = Math.min(1, avW / z.w, avH / z.h);
  $('vpwrap').style.transform = s < 1 ? `scale(${s})` : '';
  $('vpwrap').style.width = z.w * s + 'px';
  $('vpwrap').style.height = z.h * s + 'px';
  window.__vs = s;
}
function setupCtl() {
  $('c-size').innerHTML = Object.keys(SIZES)
    .map(k => `<option value="${k}">${k}${SIZES[k].note ? '（' + SIZES[k].note + '）' : ''}</option>`)
    .join('');
  $('c-save').innerHTML = SAVES.map(k => `<option value="${k}">${SV[k].name}</option>`).join('');
  const secs = {
    S: '1 系統元件頁',
    H: '2 戰鬥 HUD',
    C: '3 營地＋全域骨架',
    I: '4 掛機條與離線',
    K: '5 按鍵（只鍵盤）'
  };
  $('c-row').innerHTML = Object.entries(secs)
    .map(
      ([p, n]) =>
        `<optgroup label="${n}">${ROWS.filter(r => r.id[0] === p)
          .map(r => `<option value="${r.id}">${r.id} ${r.t}</option>`)
          .join('')}</optgroup>`
    )
    .join('');
  $('c-scn').innerHTML = Object.entries(SCN)
    .map(([k, s]) => `<option value="${k}">${k} ${s.t}</option>`)
    .join('');
  const re = () => (writeQ(), apply(P.row));
  $('c-size').onchange = e => ((P.size = e.target.value), re());
  $('c-save').onchange = e => ((P.save = e.target.value), re());
  $('c-row').onchange = e => goRow(e.target.value);
  $('c-prev').onclick = () => goRow(ROWS[(ROWS.findIndex(r => r.id === P.row) - 1 + ROWS.length) % ROWS.length].id);
  $('c-next').onclick = () => goRow(ROWS[(ROWS.findIndex(r => r.id === P.row) + 1) % ROWS.length].id);
  $('c-fs').onchange = e => ((P.fs = e.target.checked), re());
  $('c-en').onchange = e => ((P.en = e.target.checked), re());
  $('c-rm').onchange = e => ((P.rm = e.target.checked), re());
  $('c-play').onclick = () => ((P.row = ''), writeQ(), startScn($('c-scn').value));
  window.addEventListener('resize', fit);
}
function goRow(id) {
  const r = ROWS.find(x => x.id === id);
  P.row = id;
  if (r.size === 'desk' && SIZES[P.size].port) P.size = '1280x720';
  else if (r.size && r.size !== 'desk') P.size = r.size;
  if (r.save) P.save = r.save;
  writeQ();
  apply(id);
}
function writeQ() {
  if (CAP) return;
  const q = new URLSearchParams({ size: P.size, save: P.save, row: P.row });
  if (P.fs) q.set('fs', 1);
  if (P.en) q.set('en', 1);
  if (P.rm) q.set('rm', 1);
  history.replaceState(null, '', '?' + q);
}

/* ---------- 主迴圈 ---------- */
function frame(dt) {
  NOW += dt;
  runScn();
  runTimers();
  sim(dt);
  if (S.scr === 'hud' || S.scr === 'camp') S.idleMs += dt; /* 掛機時間照走（營地、抽屜開著都不停） */
  tick();
}
let last = 0;
function raf(t) {
  if (!CAP) {
    frame(Math.min(50, last ? t - last : 16.67));
    last = t;
    requestAnimationFrame(raf);
  }
}
window.demo = {
  step(n = 1, ms = 1000 / 60) {
    for (let i = 0; i < n; i++) frame(ms);
  },
  get S() {
    return S;
  },
  get NOW() {
    return NOW;
  },
  LOG,
  ROWS: () => ROWS.map(r => ({ id: r.id, t: r.t, size: r.size, save: r.save, nv: r.nv, steps: r.steps })),
  build: () => build(),
  SV: () => SV,
  SCN: () => Object.fromEntries(Object.entries(SCN).map(([k, s]) => [k, { t: s.t, dur: s.dur, save: s.save }])),
  go(o) {
    Object.assign(P, o);
    if (o.scn) return startScn(o.scn);
    goRow(o.row || P.row);
  },
  geo: () => geo(),
  hero: () => F.hero || null,
  /* 戰場框（UI 座標）：直立＝fieldTop–fieldBot；天賦樹＝即時戰場條；桌機＝全畫面 */
  frame() {
    const g = geo(),
      st = $('d-strip');
    if (S.panel === 'tree' && st) {
      const u = UI().getBoundingClientRect(),
        r = st.getBoundingClientRect(),
        sc = u.width / UI().offsetWidth;
      return { x: (r.x - u.x) / sc, y: (r.y - u.y) / sc, w: r.width / sc, h: r.height / sc };
    }
    return g.port ? { x: 0, y: g.fieldTop, w: g.W, h: g.fieldBot - g.fieldTop } : { x: 0, y: 0, w: g.W, h: g.H };
  },
  isEN: () => isEN(),
  key: (k, o) => key(k, o),
  tap: k => tap(k),
  focus: k => focusK(k),
  reseed: () => feedSeed(),
  feedThin: () => ($('d-feed') ? $('d-feed').dataset.thin : null),
  INV: () => ({ INV_CAP, INV_SPARE }),
  miss: () => MISS.slice()
};

(async function init() {
  const [css, inv, ...sv] = await Promise.all([
    fetch('../../css/style.css').then(r => r.text()),
    fetch('../../js/items.js').then(r => r.text()),
    ...SAVES.map(k => fetch(`saves/${k}.json`).then(r => r.json()))
  ]);
  const tok = document.createElement('style');
  tok.id = 'tokens';
  tok.textContent = css.slice(css.indexOf(':root {'), css.indexOf('\n}\n', css.indexOf(':root {')) + 3);
  document.head.prepend(tok);
  INV_CAP = +inv.match(/const INV_CAP = (\d+)/)[1];
  INV_SPARE = +(inv.match(/INV_SPARE = (\d+)/) || [0, 0])[1];
  SAVES.forEach((k, i) => (SV[k] = sv[i]));
  if (Q.has('bare')) document.body.classList.add('bare');
  setupCtl();
  $('ui').addEventListener('click', onClick);
  $('ui').addEventListener('scroll', () => drawerFit(), true);
  $('ui').addEventListener('pointerdown', e => {
    if (e.pointerType) S.dev = e.pointerType === 'touch' ? 'touch' : SIZES[P.size].port ? 'auto' : 'kbd';
    const h = e.target.closest('[data-hold]');
    if (h) holdStart(h.dataset.hold);
    const tb = e.target.closest('.tabs.icon .tab');
    if (tb)
      later(
        400,
        () => (
          (S.tip = {
            t: tb.getAttribute('aria-label'),
            x: tb.offsetLeft + tb.parentNode.offsetLeft + 33,
            y: tb.parentNode.offsetTop - 6
          }),
          build()
        )
      );
  });
  $('ui').addEventListener('pointerup', () => {
    holdEnd();
    if (S.tip) (S.tip = null), build();
  });
  $('ui').addEventListener('pointerleave', () => holdEnd());
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  await Promise.all(
    [HERO, CAMPBG, FLOOR.ice, FLOOR.tomb].map(i => (i.complete ? 0 : new Promise(r => (i.onload = i.onerror = r))))
  );
  await Promise.all(
    [...MOBS, ...MOBS_NEW, 'zhongkui', 'hugupo']
      .map(k => img(k).im)
      .map(i => (i.complete ? 0 : new Promise(r => (i.onload = i.onerror = r))))
  );
  if (P.scn) startScn(P.scn);
  else goRow(P.row);
  window.__ready = 1;
  if (!CAP) requestAnimationFrame(raf);
})();
