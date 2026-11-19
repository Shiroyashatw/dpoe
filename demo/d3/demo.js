/* dpoe D3 展示頁（docs/production/specs/D3-checklist.md）
   只讀 fixtures.js（佔位假資料）與 num.js（數字縮寫），不跑遊戲邏輯、不載遊戲程式。
   顏色只用 tokens.css 的 CSS 變數（canvas 也從 getComputedStyle 取 token）。
   時間全用虛擬時鐘 NOW：平常跟著畫格走；?cap=1 時停住，由擷取腳本 demo.step() 一格一格推（60 fps 逐幀錄影）。
   網址參數：size、save、row、fs、en、rm、scn（動態腳本 V1–V10）、bare（只留畫面框）、cap */
'use strict';
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const CAP = Q.has('cap');
const FR = 1000 / 60;
let NOW = 0;
const LOG = [];
const log = (ev, x) => LOG.push(Object.assign({ t: Math.round(NOW * 100) / 100, ev }, x || {}));

/* ---------- 尺寸 ---------- */
const SIZES = {
  '390x844': { w: 390, h: 844, port: 1, st: 47, sb: 34 },
  '390x664': { w: 390, h: 664, port: 1, st: 0, sb: 0, note: '瀏覽器分頁' },
  '1280x720': { w: 1280, h: 720, port: 0, z: 1 },
  '1280x800': { w: 1280, h: 800, port: 0, z: 1.25, note: 'Deck ×1.25' }
};
const P = {
  size: Q.get('size') || '390x844',
  save: Q.get('save') || '',
  row: Q.get('row') || 'L01',
  fs: Q.get('fs') === '1',
  en: Q.get('en') === '1',
  rm: Q.get('rm') === '1',
  scn: Q.get('scn') || ''
};
P.rm0 = P.rm; /* 「跟系統」＝網址的 rm（展示頁把它當系統設定） */
const F = () => FIX.saves[P.save];

/* ---------- 文字：中文原字；英文 +40%：有對照用對照，沒有就產生假字（長度 ×1.4） ---------- */
const SYL = ['ka', 'ren', 'to', 'mil', 'sa', 'vor', 'en', 'dal', 'ri', 'qu', 'est', 'lo', 'nar', 'pe', 'th'];
function pseudo(s) {
  let k = 0;
  return s
    .replace(/[㐀-鿿！-～「」・、，。：；？！（）]+/g, run => {
      const n = Math.ceil(run.length * 2 * 1.4);
      let o = '';
      while (o.length < n) o += SYL[k++ % SYL.length] + (o.length % 7 === 5 ? ' ' : '');
      return ' ' + o.slice(0, n).trim() + ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
}
const T = (zh, en) => (P.en ? (en != null ? en : pseudo(zh)) : zh);
const nm = o => (P.en ? o.en || pseudo(o.name) : o.name);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* ---------- 數字：縮寫（點一下或滑鼠停留看完整）／完整 ---------- */
const NA = (n, mode = 'own') => {
  const s = abbr(n, mode);
  return n >= 10000
    ? `<span class="nb num" data-num="abbr" data-full="${full(n, mode)}" title="${full(n, mode)}">${s}</span>`
    : `<span class="num" data-num="abbr">${s}</span>`;
};
const NF = (n, mode = 'own') => `<span class="num" data-num="full">${full(n, mode)}</span>`;

/* ---------- 圖示：程式畫的暫代圖（16 px，1 倍），畫面角標「圖示暫用」 ---------- */
const sv = (b, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 16 16" aria-hidden="true" data-ico="16">${b}</svg>`;
const ICO = {
  x: sv('<path d="M4 4l8 8M12 4l-8 8"/>'),
  lock: sv('<rect x="3.5" y="7" width="9" height="7" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>'),
  chev: sv('<path d="M6 3l5 5-5 5"/>'),
  back: sv('<path d="M10 3L5 8l5 5"/>'),
  spk: sv('<path d="M3 6h3l4-3v10l-4-3H3z"/><path d="M12 5.5a3.5 3.5 0 0 1 0 5"/>'),
  seal: sv('<rect x="3" y="3" width="10" height="10" rx="1"/><path d="M6 6h4v4H6z"/>'),
  warn: sv('<path d="M8 2l6.5 12h-13z"/><path d="M8 6.5v3.5M8 12v.5"/>'),
  dia: sv('<path d="M8 2l5 6-5 6-5-6z"/>', 'fillc'),
  dia2: sv('<path d="M8 1.5l5.5 6.5-5.5 6.5-5.5-6.5z"/><path d="M8 5l2.5 3L8 11 5.5 8z"/>'),
  gear: sv('<path d="M4 13l8-8M9 4h3v3"/>'),
  orb: sv('<circle cx="8" cy="8" r="4.5"/>'),
  hold: sv('<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3l2 1.5"/>')
};
/* 稀有、傳奇的記號是字（◆ ◈），列首不再畫圖示；普通畫圈、追逐畫王印 */
const RICO = { normal: ICO.orb, rare: '', leg: '', chase: ICO.seal };
const RMARK = { normal: '', rare: '◆ ', leg: '◈ ', chase: '' };

/* ---------- 按鍵表（T06 由這張表產生；鍵盤處理也讀同一張） ---------- */
const KEYS = [
  ['M', '地點', 'Maps'],
  ['Z', '更多', 'More'],
  ['Esc', '設定／關面板', 'Settings / close'],
  ['L', '掉落紀錄', 'Drop log'],
  ['J', '山海寶盒', 'Shan Hai Box'],
  ['T', '試招場（進／出）', 'Practice Ground'],
  ['H', '營地', 'Camp'],
  ['K', '鍛造', 'Forge'],
  ['P', '天賦樹', 'Talent tree'],
  ['B', '角色', 'Hero'],
  ['G', '技能', 'Skills'],
  ['1／2', '藥劑', 'Flasks'],
  ['Q／E／R', '技能', 'Skills'],
  ['Space', '翻滾', 'Roll'],
  ['Shift+1～5', '星級', 'Map tier ★'],
  ['↑↓ Enter', '清單選擇', 'List select'],
  ['Tab', '換分頁', 'Next tab'],
  ['←→', '滑桿', 'Slider'],
  ['C', '自動／手動', 'Auto / manual']
];
const GEST = [
  ['點', '開面板、選取', 'Tap: open, select'],
  ['長按', '看完整數字、危險動作', 'Hold: full numbers, risky actions'],
  ['往下滑', '關半版面板', 'Swipe down: close sheet'],
  ['左右滑', '換分頁', 'Swipe: switch tab'],
  ['雙指', '天賦樹縮放', 'Pinch: zoom tree']
];

/* ---------- 列（56 列；每列：區、名稱、預設存檔、設定狀態、狀態條件 ok） ---------- */
const R = (id, sec, name, save, set, ok) => ({ id, sec, name, save, set, ok });
const ROWS = [
  R(
    'L01',
    '地點',
    '地點面板・總覽',
    'mid',
    S => (S.panel = 'loc'),
    () => !!q('[data-m=L01]')
  ),
  R(
    'L02',
    '地點',
    '正在刷卡',
    'mid',
    S => (S.panel = 'loc'),
    () => !!q('[data-m=L02]')
  ),
  R(
    'L03',
    '地點',
    '正在刷・被退回',
    'mid',
    S => ((S.panel = 'loc'), (S.bounced = 1)),
    () => !!q('[data-m=L02] .warnt')
  ),
  R(
    'L04',
    '地點',
    '下一個卡',
    'mid',
    S => (S.panel = 'loc'),
    () => !!q('[data-m=L04]')
  ),
  R(
    'L05',
    '地點',
    '星級列（改了・王倒下後換）',
    'mid',
    S => ((S.panel = 'loc'), (S.starPend = 2)),
    () => !!q('[data-m=L05] .pend')
  ),
  R(
    'L06',
    '地點',
    '清單・分組',
    'mid',
    S => ((S.panel = 'loc'), (S.locScroll = 1)),
    () => !!q('[data-m=L06] .lrow.on')
  ),
  R(
    'L07',
    '地點',
    '地圖詞',
    'mid',
    S => ((S.panel = 'loc'), (S.locView = 'mods')),
    () => !!q('[data-m=L07]')
  ),
  R(
    'L08',
    '地點',
    '鎖住的地點',
    'mid',
    S => ((S.panel = 'loc'), (S.locScroll = 2)),
    () => !!q('[data-m=L08]')
  ),
  R(
    'M01',
    '更多',
    '更多・2×4 狀態卡',
    'mid',
    S => (S.panel = 'more'),
    () => qa('.mcard').length === 8
  ),
  R(
    'M02',
    '更多',
    '提示點',
    'mid',
    S => (S.panel = 'more'),
    () => qa('.mcard .dot').length > 0
  ),
  R(
    'M03',
    '更多',
    '還沒開的功能（新存檔）',
    'new',
    S => (S.panel = 'more'),
    () => qa('.mcard').length < 8
  ),
  R(
    'M04',
    '更多',
    '回營地確認',
    'mid',
    S => ((S.panel = 'more'), (S.dlg = 'camp')),
    () => !!q('[data-m=M04]')
  ),
  R(
    'T01',
    '設定',
    '段落鈕 5 段',
    'mid',
    S => ((S.panel = 'set'), (S.sec = 'game')),
    () => qa('[data-m=T01] button').length === 5
  ),
  R(
    'T02',
    '設定',
    '遊戲・掉落提示門檻',
    'mid',
    S => ((S.panel = 'set'), (S.sec = 'game')),
    () => !!q('[data-m=T02]')
  ),
  R(
    'T03',
    '設定',
    '畫面・文字大小',
    'mid',
    S => ((S.panel = 'set'), (S.sec = 'view')),
    () => !!q('[data-m=T03]')
  ),
  R(
    'T04',
    '設定',
    '畫面・減少動態、畫面震動',
    'mid',
    S => ((S.panel = 'set'), (S.sec = 'view')),
    () => !!q('[data-m=T04]')
  ),
  R(
    'T05',
    '設定',
    '聲音・音效、音樂、震動',
    'mid',
    S => ((S.panel = 'set'), (S.sec = 'sound')),
    () => qa('[data-m=T05] input[type=range]').length === 2
  ),
  R(
    'T06',
    '設定',
    '按鍵表',
    'mid',
    S => ((S.panel = 'set'), (S.sec = 'keys')),
    () => !!q('[data-m=T06]')
  ),
  R(
    'T07',
    '設定',
    '帳號・訪客登出',
    'mid',
    S => ((S.panel = 'set'), (S.sec = 'acct')),
    () => !!q('[data-m=T07]')
  ),
  R(
    'G01',
    '掉落紀錄',
    '保底列',
    'mid',
    S => (S.panel = 'log'),
    () => !!q('[data-m=G01] .pbar')
  ),
  R(
    'G02',
    '掉落紀錄',
    '不累積保底',
    'mid',
    S => ((S.panel = 'log'), (S.bounced = 1)),
    () => !!q('[data-m=G02]')
  ),
  R(
    'G03',
    '掉落紀錄',
    '篩選＋清單',
    'mid',
    S => ((S.panel = 'log'), (S.logF = 'all')),
    () => qa('.grow2').length > 5
  ),
  R(
    'G04',
    '掉落紀錄',
    '從掉落動態點進',
    'mid',
    S => ((S.panel = 'log'), (S.logPick = 7), (S.pickT = 0)),
    () => !!q('.grow2.pick')
  ),
  R(
    'G05',
    '掉落紀錄',
    '裝備列說明卡',
    'mid',
    S => ((S.panel = 'log'), (S.logItem = 1)),
    () => !!q('[data-m=G05]')
  ),
  R(
    'G06',
    '掉落紀錄',
    '空狀態（新存檔）',
    'new',
    S => (S.panel = 'log'),
    () => !!q('[data-m=G06]')
  ),
  R(
    'B01',
    '商會＋寶盒',
    '商會・換法列',
    'mid',
    S => ((S.panel = 'guild'), (S.gTab = '鐵')),
    () => qa('[data-m=B01] .btn').length >= 2
  ),
  R(
    'B02',
    '商會＋寶盒',
    '商會・不夠',
    'mid',
    S => ((S.panel = 'guild'), (S.gTab = '鐵')),
    () => !!q('[data-m=B02]')
  ),
  R(
    'B03',
    '商會＋寶盒',
    '商會・被上限擋',
    'cap',
    S => ((S.panel = 'guild'), (S.gTab = '鐵')),
    () => !!q('[data-m=B03]')
  ),
  R(
    'B04',
    '商會＋寶盒',
    '鍛造缺材料指到商會',
    'mid',
    S => (S.panel = 'forge'),
    () => !!q('[data-m=B04]')
  ),
  R(
    'B05',
    '商會＋寶盒',
    '寶盒・收集格',
    'late',
    S => ((S.panel = 'box'), (S.bTab = '酆都')),
    () => qa('.cell').length === 5
  ),
  R(
    'B06',
    '商會＋寶盒',
    '寶盒・殿卡',
    'late',
    S => ((S.panel = 'box'), (S.bTab = '酆都'), (S.boxScroll = 1)),
    () => qa('.hall').length > 0
  ),
  R(
    'B07',
    '商會＋寶盒',
    '寶盒・心魔劫／弒神',
    'late',
    S => ((S.panel = 'box'), (S.bTab = '心魔劫')),
    () => qa('.frow').length === 7
  ),
  R(
    'B08',
    '商會＋寶盒',
    '進殿確認',
    'late',
    S => ((S.panel = 'box'), (S.bTab = '酆都'), (S.dlg = 'hall'), (S.hallI = 4)),
    () => !!q('[data-m=B08]')
  ),
  R(
    'B09',
    '商會＋寶盒',
    '還沒拿過碎片的系',
    'late',
    S => ((S.panel = 'box'), (S.bTab = '酆都')),
    () => !q('[data-tab="兵家"]')
  ),
  R(
    'P01',
    '試招場',
    '刷圖中進場確認',
    'mid',
    S => (S.dlg = 'prac'),
    () => !!q('[data-m=P01]')
  ),
  R(
    'P02',
    '試招場',
    'DPS 卡・打之前',
    'mid',
    S => ((S.scr = 'prac'), (S.pracHit = 0)),
    () => !!q('[data-m=P02]')
  ),
  R(
    'P03',
    '試招場',
    'DPS 卡・打中',
    'mid',
    S => ((S.scr = 'prac'), (S.pracHit = 1)),
    () => !!q('[data-m=P03]')
  ),
  R(
    'P04',
    '試招場',
    '換裝標記（延伸，畫「—」）',
    'mid',
    S => ((S.scr = 'prac'), (S.pracHit = 1)),
    () => !!q('[data-m=P04]')
  ),
  R(
    'P05',
    '試招場',
    '怪物 Lv −／＋（到頂）',
    'mid',
    S => ((S.scr = 'prac'), (S.pracHit = 1), (S.pracLv = 83)),
    () => !!q('[data-m=P05] .offb')
  ),
  R(
    'P06',
    '試招場',
    '掛機條・試招中',
    'mid',
    S => ((S.scr = 'prac'), (S.pracHit = 1)),
    () => /試招中|Practic/.test(txt('[data-m=P06]'))
  ),
  R(
    'P07',
    '試招場',
    '回戰場補算',
    'mid',
    S => (S.gain = { kind: 'prac', t0: -100 }),
    () => !!q('[data-m=P07]')
  ),
  R(
    'O01',
    '開場＋重開',
    '新存檔 ≤ 5 秒開刷',
    'new',
    S => (S.intro = { t0: -4000 }),
    () => S.hits > 0
  ),
  R(
    'O02',
    '開場＋重開',
    '字幕 2.5 秒',
    'new',
    S => (S.intro = { t0: -1200 }),
    () => !!q('[data-m=O02]:not(.hide)')
  ),
  R(
    'O03',
    '開場＋重開',
    '聲音鈕',
    'new',
    S => (S.intro = { t0: -1200 }),
    () => !!q('[data-m=O03]')
  ),
  R(
    'O04',
    '開場＋重開',
    '新手目標卡',
    'new',
    S => (S.intro = { t0: -4000 }),
    () => !!q('[data-m=O04]')
  ),
  R(
    'O05',
    '開場＋重開',
    '解鎖「開了」卡',
    'new',
    S => (S.intro = { t0: -9000 }),
    () => !!q('[data-m=O05]:not(.hide)')
  ),
  R(
    'O06',
    '開場＋重開',
    '營地可以升級了',
    'new',
    S => (S.intro = { t0: -46000 }),
    () => !!q('[data-m=O06]')
  ),
  R(
    'O07',
    '開場＋重開',
    '重開・離開 < 10 分',
    'mid',
    S => (S.away = { kind: 'mid', t0: -100 }),
    () => !!q('[data-m=O07]')
  ),
  R(
    'O08',
    '開場＋重開',
    '重開・≥ 10 分',
    'mid',
    S => (S.away = { kind: 'long', t0: -2000 }),
    () => !!q('[data-m=O08]')
  ),
  R(
    'X01',
    '共用定案',
    '貨幣列＋完整貨幣清單',
    'big',
    S => (S.panel = 'cur'),
    () => !!q('[data-m=X01]') && !!q('[data-m=X01b]')
  ),
  R(
    'X02',
    '共用定案',
    '藥劑看得到',
    'mid',
    S => 0,
    () => qa('[data-m=X02] .flask').length === 2
  ),
  R(
    'X03',
    '共用定案',
    'K／M 縮寫位置（7 位數）',
    'big',
    S => (S.panel = 'loc'),
    () => qa('[data-num=abbr].nb').length > 0
  ),
  R(
    'X04',
    '共用定案',
    '天賦樹滿版',
    'mid',
    S => (S.tree = { t0: -1000 }),
    () => !!q('[data-m=X04]')
  ),
  R(
    'X05',
    '共用定案',
    '營地單座卡返回',
    'mid',
    S => ((S.scr = 'camp'), (S.campCard = '瞭望台')),
    () => !!q('[data-m=X05]')
  ),
  R(
    'X06',
    '共用定案',
    'M2-36 色票',
    'mid',
    S => (S.panel = 'loc'),
    () => true
  ),
  R(
    'X07',
    '共用定案',
    '新主視覺（待素材）',
    'mid',
    S => 0,
    () => !!q('[data-m=X07]')
  )
];
const q = s => $('ui').querySelector(s),
  qa = s => [...$('ui').querySelectorAll(s)],
  txt = s => (q(s) ? q(s).textContent : '');

/* ---------- 狀態 ---------- */
let S,
  FIRST = 1;
function fresh() {
  S = {
    scr: 'field' /* field | prac | camp | hall */,
    panel: null /* loc | more | set | log | guild | box | forge | cur */,
    pOpenT: -1e9,
    pClose: null,
    camT: -1e9,
    camFrom: 0,
    dlg: null /* camp | prac | hall */,
    locView: 'list',
    locScroll: 0,
    bounced: 0,
    starPend: 0,
    star: 0,
    rngT: -1e9,
    rngOld: '',
    shake: null,
    sec: 'game',
    alert: 'rare',
    fsSet: 100,
    rmSet: 'sys',
    shk: 1,
    sfx: 70,
    mus: 50,
    vib: 1,
    fsx: null,
    logF: 'all',
    logPick: -1,
    pickT: -1e9,
    logItem: 0,
    gTab: '鐵',
    gSel: -1,
    gHave: null,
    roll: null,
    bTab: '酆都',
    boxScroll: 0,
    hallI: 0,
    pick: {},
    hold: null,
    fly: null,
    fade: null,
    toast: null,
    pracHit: 0,
    pracLv: 0,
    gain: null,
    intro: null,
    away: null,
    tree: null,
    campCard: null,
    hits: 0,
    bt: 0,
    hover: null,
    tip: null,
    seen: {},
    scoutUp: 0,
    unlockDone: {},
    campHint: 0,
    kbd: 0
  };
}

/* ---------- 版面 ---------- */
function geo() {
  const z = SIZES[P.size],
    W = z.port ? z.w : z.w / z.z,
    H = z.port ? z.h : z.h / z.z;
  const g = { W, H, port: z.port, st: z.st || 0, sb: z.sb || 0 };
  g.top = g.st ? g.st + 40 : 48; /* 上緣 HUD（貨幣列）下面第一格：390×844 是 87 */
  if (z.port) {
    g.navTop = H - g.sb - 56;
    g.idleTop = g.navTop - 44;
    g.sheetTop = Math.max(g.st + 140, g.idleTop - 380);
    g.goalTop = g.idleTop - 150;
    g.skY = S.intro ? g.goalTop - 60 : g.idleTop - 60;
  } else {
    g.colX = W - 16 - 420;
    g.colTop = 76;
    g.colBot = H - 108;
    g.skY = H - 60;
  }
  return g;
}
const px = (x, y, w, h) =>
  `left:${x}px;top:${y}px;${w != null ? `width:${w}px;` : ''}${h != null ? `height:${h}px;` : ''}`;
const paused = () => S.scr === 'prac' || S.scr === 'camp' || (S.tree && !S.tree.out);

/* ---------- 建畫面 ---------- */
function build() {
  const g = geo(),
    z = SIZES[P.size],
    ui = $('ui'),
    vp = $('vp');
  vp.style.width = z.w + 'px';
  vp.style.height = z.h + 'px';
  ui.style.width = g.W + 'px';
  ui.style.height = g.H + 'px';
  ui.style.transform = z.port ? '' : `scale(${z.z})`;
  const b = document.body;
  b.classList.toggle('port', !!z.port);
  b.classList.toggle('fs130', P.fs);
  b.classList.toggle('en', P.en);
  b.classList.toggle('rm', P.rm);
  document.documentElement.style.setProperty('--tscale', P.fs ? 1.3 : S.fsSet / 100);
  const fk = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.k;
  let h = tagsHTML(g);
  if (S.away && S.away.kind === 'long' && !S.away.done) h += offHTML(g);
  else {
    h += hudHTML(g);
    if (S.scr === 'prac') h += pracHTML(g);
    if (S.intro) h += introHTML(g);
    if (S.panel) h += panelHTML(g);
    if (S.scr === 'camp') h += campHTML(g);
    if (S.dlg) h += dlgHTML(g);
    if (S.tree) h += treeHTML(g);
  }
  h += `<div class="fade" id="d-fade"></div><div class="toast hide" id="d-toast" data-over></div><div class="tipn hide" id="d-tip"></div>`;
  ui.innerHTML = h;
  if (S.locScroll || S.boxScroll) scrollTo0();
  if (fk) {
    const e = q(`[data-k="${CSS.escape(fk)}"]`);
    if (e) e.focus({ preventScroll: true });
  }
  if (
    S.dlg === 'hall' &&
    !(document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-m=B08]'))
  ) {
    const c = q('[data-k=hall-no]');
    if (c) c.focus({ preventScroll: true });
  }
  if (S.kbd) qa('.kf').forEach(e => e.addEventListener('focus', () => e.classList.add('fv'), { once: true }));
  tick(0);
}
function scrollTo0() {
  const bd = q('.pnl .bd');
  if (!bd) return;
  const t = S.locScroll === 2 ? q('[data-m=L08]') : S.locScroll ? q('.lrow.on') : S.boxScroll ? q('.hall') : null;
  if (t) bd.scrollTop = Math.max(0, t.offsetTop - (S.locScroll === 2 ? 60 : 30));
}

function tagsHTML(g) {
  const t = [
    `<i data-row>${P.row}${P.fs ? '・130%' : ''}${P.en ? '・EN' : ''}${P.rm ? '・減少動態' : ''}</i>`,
    `<i>${esc(FIX.PH.slice(0, 4))}・F01–F26</i>`,
    '<i>圖示暫用（程式畫）</i>'
  ];
  if (S.scr === 'camp') t.push('<i data-m="X07">待素材：營地底圖</i>');
  else t.push('<i data-m="X07">待素材：戰場底圖</i>');
  return `<div class="ab tags" data-over style="${g.port ? px(8, 2, g.W - 16, Math.max(20, g.st - 4)) : px(332, 16, 220, 40)}">${t.join('')}</div>`;
}

/* ---------- 戰場 HUD（貨幣列、藥劑、技能、掛機條、分頁、掉落動態） ---------- */
function hudHTML(g) {
  const f = F(),
    port = g.port;
  /* 直立：半版蓋住技能列與藥劑；設定全版再蓋住上緣 HUD（不畫被蓋住的，免得從 --sheet-bg 透出來） */
  const under = port && (S.panel || S.scr === 'camp'),
    underTop = port && S.panel === 'set';
  let h = '';
  const loc =
    S.scr === 'hall'
      ? T(FIX.saves.late.box.halls[S.hallI].name, FIX.saves.late.box.halls[S.hallI].en)
      : S.scr === 'prac'
        ? T('試招場', 'Practice Ground')
        : S.scr === 'camp'
          ? T('營地', 'Camp')
          : nm(curLoc()) + ' ' + '★'.repeat(f.star);
  if (!underTop)
    h += `<div class="ab plate area" data-hud data-role="body" data-m="area" style="${port ? px(8, g.st + 6, null, 28) + 'max-width:190px' : px(16, 16, null, 44) + 'max-width:300px'}"><span class="ell">${esc(loc)}</span></div>`;
  /* X01 貨幣列：只放金幣、靈魂（縮寫）；點了開完整貨幣清單 */
  if (!underTop)
    h += `<button class="ab plate curbar kf" data-hud data-hit="cur" data-k="cur" data-m="X01" data-role="body" aria-label="${esc(T('完整貨幣清單', 'All currency'))}" style="${port ? `right:8px;top:${g.st || 4}px;height:40px` : `left:${g.W - 16 - 264}px;top:16px;width:264px;height:44px;justify-content:flex-end`}"><span class="ci cg">${esc(T('金幣', 'Gold'))} ${NA(f.gold)}</span><span class="ci cs">${esc(T('靈魂', 'Souls'))} ${NA(f.soul)}</span></button>`;
  if (!port) h += navHTML(g);
  /* 掉落動態（試招場不掉東西，不畫） */
  if (S.scr !== 'prac' && !underTop && !(S.intro && feedRows().length === 0)) {
    const fy = port ? (unlockOn() ? g.top + 80 : g.st + 48) : unlockOn() ? 164 : 76;
    h += `<div class="ab feed" data-hud data-m="feed" data-hit="feed" style="${port ? px(g.W - 8 - 180, fy, 180, null) : px(16, fy, 300, null)}">${feedRows()
      .map(
        e =>
          `<div class="fr r-${e.rar} kf" role="button" tabindex="0" data-k="feed-${e.id}" data-role="body"><span class="nm ell">${esc(RMARK[e.rar] + (P.en ? e.en : e.name))}</span><span class="num">×${e.n}</span></div>`
      )
      .join('')}</div>`;
  }
  /* X02 藥劑＋技能 */
  const fx = port ? 8 : Math.max(16 + 380 + 8, g.W / 2 - 150);
  if (!under)
    h += `<div class="ab" data-hud data-m="X02" style="${px(fx, g.skY + 4, 96, 44)}display:flex;gap:8px">${f.flask
      .map(
        ([c, m, p], i) =>
          `<button class="flask kf" data-k="flask${i}" data-hit="flask" aria-label="${esc(T('藥劑', 'Flask'))} ${i + 1}"><i class="ring" data-ring="${i ? 'mp' : 'hp'}" style="background:conic-gradient(var(${i ? '--mp-hi' : '--hp-hi'}) ${Math.round(p * 360)}deg, var(--panel-inset) 0)"></i><i class="core"></i><b class="num" data-role="num">${c}/${m}</b><kbd data-role="label">${i + 1}</kbd></button>`
      )
      .join('')}</div>`;
  const sx = port ? g.W - 8 - 4 * 52 - 3 * 6 : fx + 110;
  if (!under)
    h += `<div class="ab" data-hud data-m="skills" style="${px(sx, g.skY, 4 * 52 + 18, 52)}display:flex;gap:6px">${['Q', 'E', 'R', '␣'].map(k => `<span class="skb" data-role="label">${k}</span>`).join('')}</div>`;
  /* 掛機條 */
  const it =
    S.scr === 'prac'
      ? T('試招中・戰鬥暫停，回戰場補算', 'Practicing · combat paused, settled on return') +
        (port ? '' : '・T ' + T('離開', 'leave'))
      : S.scr === 'camp'
        ? T('營地中・戰鬥暫停、回來補算', 'In camp · combat paused, settled on return')
        : `${T('掛機', 'Idle')} 12 ${T('分', 'min')}・${T('保底', 'Pity')} ${f.pity}%`;
  h += `<div class="ab idle" data-hud data-m="${S.scr === 'prac' ? 'P06' : 'idle'}" data-role="body" style="${port ? px(0, g.idleTop, g.W, 44) : px(16, g.H - 56, 380, 44)}"><span>${esc(it)}</span></div>`;
  if (port) h += navHTML(g);
  /* 回戰場補算一行（P07、O07、X04） */
  if (S.gain) {
    const gn = gainTxt();
    h += `<div class="ab plate gainl" id="d-gain" data-hud data-m="${gn.m}" data-role="body" style="${port ? px(8, g.skY - 48, g.W - 16, 40) : px(16, g.H - 104, 380, 40)}">${gn.h}</div>`;
  }
  if (S.away && S.away.kind === 'mid' && NOW - S.away.t0 < 6300) {
    const a = F().away;
    h += `<div class="ab plate gainl" id="d-away" data-hud data-m="O07" data-role="body" style="${port ? px(8, g.skY - 48, g.W - 16, 40) : px(16, g.H - 104, 380, 40)}">${esc(T('離開', 'Away'))} ${a.mid} ${esc(T('分', 'min'))}・${esc(T('靈魂', 'Souls'))} +${NA(Math.floor(a.soulMin * a.mid))}</div>`;
  }
  return h;
}
const curLoc = () => {
  const f = F();
  return f.locs[S.bounced ? f.locs.findIndex(l => l.name === f.bounce.to) : f.at];
};
function feedRows() {
  const f = F();
  if (S.intro)
    return NOW - S.intro.t0 >= f.intro.beats[0][0]
      ? [{ id: 'i0', rar: 'normal', name: '熟鐵', en: 'Wrought Iron', n: 3 }]
      : [];
  return f.log
    .filter(
      e =>
        !e.unlock &&
        (S.alert === 'all' || e.rar !== 'normal') &&
        (S.alert !== 'leg' || e.rar === 'leg' || e.rar === 'chase')
    )
    .slice(0, 3);
}
function gainTxt() {
  const f = F(),
    k = S.gain.kind,
    pg = f.pracGain;
  if (k === 'prac')
    return {
      m: 'P07',
      h: `${esc(T('試招期間', 'While practicing'))} ${esc(T('靈魂', 'Souls'))} +${NA(pg.soul)}・${pg.items} ${esc(T('件', 'items'))}（${esc(T('稀有以上', 'Rare+'))} ${pg.rare}）`
    };
  if (k === 'both')
    return {
      m: 'P07',
      h: `${esc(T('營地＋試招期間', 'Camp + practice'))} ${esc(T('靈魂', 'Souls'))} +${NA(pg.soul + pg.camp)}・${pg.items} ${esc(T('件', 'items'))}`
    };
  return {
    m: 'X04g',
    h: `${esc(T('天賦樹期間', 'While in tree'))} ${esc(T('靈魂', 'Souls'))} +${NA(820)}・2 ${esc(T('件', 'items'))}`
  };
}
function navHTML(g) {
  const T6 = [
    ['char', '角色', 'Hero', 'B'],
    ['forge', '鍛造', 'Forge', 'K'],
    ['skill', '技能', 'Skills', 'G'],
    ['tree', '天賦', 'Talent', 'P'],
    ['camp', '營地', 'Camp', 'H'],
    ['more', '更多', 'More', 'Z']
  ];
  const dotCamp = S.campHint && !S.seen.camp;
  if (g.port)
    return `<div class="ab nav" data-hud data-m="nav" style="${px(0, g.navTop, g.W, 56)}">${T6.map(([k, z, e]) => `<button class="kf" data-k="tab-${k}" data-hit="tab" data-role="label">${esc(T(z, e))}${k === 'camp' && dotCamp ? '<i class="dot" style="right:14px;top:6px"></i>' : ''}</button>`).join('')}</div>`;
  return `<div class="ab nav" data-hud data-m="nav" style="${px(g.W - 16 - 264 - 8 - 432, 16, 432, 44)}">${T6.map(([k, z, e, key]) => `<button class="kf" data-k="tab-${k}" data-hit="tab" data-role="label">${esc(T(z, e))}<kbd>${key}</kbd>${k === 'camp' && dotCamp ? '<i class="dot" style="right:2px;top:4px"></i>' : ''}</button>`).join('')}</div>`;
}
const unlockOn = () => S.intro && unlockState().some(u => u.vis);

/* ---------- 面板外框（直立半版／全版、桌機右欄） ---------- */
function shell(g, id, title, body, opt = {}) {
  const full = g.port && opt.full;
  const y = g.port ? (full ? g.st : g.sheetTop) : g.colTop,
    h = g.port ? g.idleTop - y : g.colBot - g.colTop;
  const key = opt.key ? `<kbd>${opt.key}</kbd>` : '';
  const back = opt.back
    ? `<button class="x44 kf" data-k="${opt.back}" data-hit="back" aria-label="${esc(T('返回', 'Back'))}">${ICO.back}</button>`
    : '';
  return `<section class="ab pnl ${g.port ? 'sheet' : ''}" id="d-pnl" data-panel="${id}" data-m="${opt.m || id}" style="${px(g.port ? 0 : g.colX, y, g.port ? g.W : 420, h)}"><div class="hd">${back}<b data-role="body">${esc(title)}</b>${opt.extra || ''}${key}<button class="x44 kf" data-k="px" data-hit="x" aria-label="${esc(T('關閉', 'Close'))}">${ICO.x}</button></div>${opt.top || ''}<div class="bd" data-list>${body}</div>${opt.foot || ''}</section>`;
}
function panelHTML(g) {
  const p = S.panel;
  if (p === 'loc') return locHTML(g);
  if (p === 'more') return moreHTML(g);
  if (p === 'set') return setHTML(g);
  if (p === 'log') return logHTML(g);
  if (p === 'guild') return guildHTML(g);
  if (p === 'box') return boxHTML(g);
  if (p === 'forge') return forgeHTML(g);
  if (p === 'cur') return curHTML(g);
  return '';
}

/* ---------- 1 地點 ---------- */
function locHTML(g) {
  const f = F(),
    port = g.port,
    L = curLoc();
  if (S.locView === 'mods') {
    const body = f.mods
      ? `<div class="mods" data-m="L07">${f.mods.map(m => `<div class="mrow ${m.d === 3 ? 'd3' : ''}" data-role="body">${m.d === 3 ? ICO.warn : ''}<span style="flex:1">${esc(P.en ? m.en : m.name)}</span><span class="dg" data-role="label">${esc(T('危險', 'Risk'))} ${m.d}</span></div>`).join('')}</div>`
      : `<div class="empty" data-m="L07" data-role="body">${esc(T('王倒下後才知道', 'Known after the boss falls'))}</div>`;
    return shell(g, 'loc', T('這張圖的地圖詞', 'Map mods on this map'), body, {
      back: 'loc-list',
      key: port ? '' : 'M'
    });
  }
  /* L02／L03 正在刷卡 */
  const nMods = f.mods ? f.mods.length : 0;
  const r2 = S.bounced
    ? `<div class="r2 warnt" data-role="body">${esc(T(`連倒 3 次，退回這裡・${f.bounce.why}`, `3 deaths in a row, sent back here · ${f.bounce.whyEn}`))}</div>`
    : `<div class="r2" data-role="body">${esc(T('怪物', 'Monster'))} Lv${L.lv}・${esc(T('每分鐘', 'per min'))} ${NA(L.soul)} ${esc(T('靈魂', 'Souls'))}・${esc(f.pityOn && L.lv >= 45 ? T('保底累積中', 'pity building') : T('不累積保底', 'no pity here'))}</div>`;
  const rb = S.bounced
    ? `<button class="btn sm kf" data-k="retry" data-hit="retry" style="min-width:102px">${esc(T('再試', 'Retry '))}${esc(P.en ? f.bounce.fromEn : f.bounce.from)}</button>`
    : `<button class="btn sm kf mbtn" data-k="mods" data-hit="mods" style="${port ? 'width:102px' : ''}">${esc(T(`地圖詞 ${nMods} 條 ›`, `${nMods} map mods ›`))}</button>`;
  const cur = `<div class="lcur" data-m="L02" data-k="lcur" style="min-height:76px;${port ? '' : ''}"><div class="r1"><b class="ell" data-role="body">${esc(nm(L))} <span class="stars-t">${'★'.repeat(f.star)}</span></b>${rb}</div>${r2}</div>`;
  /* L04 下一個卡 */
  let nx = '';
  if (f.next) {
    const n = f.next,
      pct = Math.min(1, n.have / n.need);
    nx = `<button class="lnext kf" data-m="L04" data-k="next" data-hit="next" style="height:${port ? 56 : 48}px;margin-top:4px"><span class="t" data-role="body">${esc(T(`升${n.fac} Lv${n.facLv} 就開`, `${n.facEn} Lv${n.facLv} opens`))} ${esc(nm(n))} Lv${n.lv} ›</span><span class="dim" data-role="body" style="font-size:var(--f14)"><i class="mbar" style="width:110px"><i style="width:${pct * 100}%"></i></i> ${esc(P.en ? n.matEn : n.mat)} ${NA(n.have)}／${NA(n.need, 'cost')}</span></button>`;
  }
  /* L05 星級列（沒開的星不畫） */
  const star = S.starPend || f.star;
  const rng = f.starMods[star - 1];
  const stars = `<div class="starrow" data-m="L05" style="margin-top:4px">${Array.from(
    { length: f.maxStar },
    (_, i) => i + 1
  )
    .map(
      k =>
        `<button class="kf ${S.starPend === k && k !== f.star ? 'pend' : ''}" data-k="star-${k}" data-hit="star" aria-pressed="${k === star}" data-role="label">${k}★</button>`
    )
    .join(
      ''
    )}<span class="rng" data-role="body" id="d-rng"><span>${esc(T(`${rng} 條地圖詞`, `${rng} map mods`))}</span></span></div>${S.starPend && S.starPend !== f.star ? `<div class="dim" data-role="body" style="font-size:var(--f14);padding:2px 2px 0">${esc(T(`王倒下後換成 ${S.starPend}★`, `Switches to ${S.starPend}★ after the boss falls`))}</div>` : ''}`;
  /* L06／L08 清單 */
  let list = '',
    zone = '';
  const firstLock = f.locs.findIndex(l => !l.open);
  f.locs.forEach((l, i) => {
    if (!l.open && i !== firstLock) return;
    if (l.zone !== zone) {
      zone = l.zone;
      const zs = f.locs.filter(x => x.zone === zone);
      list += `<div class="zh" data-role="body">${esc(P.en ? l.zoneEn : l.zone)}<span>${esc(T('開了', 'open'))} ${zs.filter(x => x.open).length}／${zs.length}</span></div>`;
    }
    const on = l.name === L.name;
    if (!l.open) {
      const n = f.next || { fac: '瞭望台', facEn: 'Watchtower', facLv: '—' };
      list += `<div class="lrow lock kf" tabindex="0" role="button" data-m="L08" data-k="lock-${i}" data-hit="lock" id="d-lock">${ICO.lock}<span class="nm"><b class="ell" data-role="body">${esc(nm(l))} Lv${l.lv}</b><span class="cond" data-role="label">${esc(T(`升${n.fac} Lv${n.facLv} 就開`, `Opens at ${n.facEn} Lv${n.facLv}`))}</span></span></div>`;
      return;
    }
    const tags = [];
    if (on) tags.push(`<span class="tg">${esc(T('正在刷', 'Farming'))}</span>`);
    if (f.best === l.name) tags.push(`<span class="tg">${esc(T('最好', 'Best'))}</span>`);
    else if (f.near === l.name) tags.push(`<span class="tg">${esc(T('差不多', 'Similar'))}</span>`);
    if (l.lv >= 45)
      tags.push(`<span class="tg seal" title="${esc(T('累積保底', 'Builds pity'))}">${esc(T('印', 'Seal'))}</span>`);
    list += `<div class="lrow ${on ? 'on' : ''}" data-k="row-${i}"><span class="nm"><b class="ell" data-role="body">${esc(nm(l))}</b><small data-role="label">Lv${l.lv}・${NA(l.soul)}/${esc(T('分', 'min'))}</small></span>${tags.join('')}<button class="btn sm go kf" data-k="go-${i}" data-hit="go" ${on ? 'disabled aria-disabled="true"' : ''}>${esc(T('去', 'Go'))}</button></div>`;
  });
  const top = `<div style="padding:${port ? 3 : 0}px 8px 0;flex:none">${cur}${nx}${stars}</div>`;
  return shell(g, 'loc', T('地點', 'Maps'), `<div data-m="L06">${list}</div>`, { m: 'L01', key: port ? '' : 'M', top });
}

/* ---------- 2 更多 ---------- */
function moreHTML(g) {
  const f = F(),
    port = g.port,
    cw = port ? 179 : 202,
    ch = port ? 60 : 64;
  const fs1 = P.fs && port; /* 文字 130%：改 1 欄 × 8 列（每張 56）可捲 */
  const cards = f.more
    .map((c, i) => {
      const x = fs1 ? 12 : (port ? 12 : 4) + (i % 2) * (cw + 8),
        y = 8 + (fs1 ? i * 64 : Math.floor(i / 2) * (ch + 8));
      const st = c.st.replace('{dps}', abbr(f.prac.avg10)).replace('{kills}', full(f.prac.kills));
      const stE = c.stEn.replace('{dps}', abbr(f.prac.avg10)).replace('{kills}', full(f.prac.kills));
      return `<button class="mcard kf" data-k="mc-${c.k}" data-hit="mcard" style="${px(x, y, fs1 ? g.W - 24 : cw, fs1 ? 56 : ch)}"><b class="ell" data-role="body">${esc(T(c.name, c.en))}</b><span class="ell" data-role="body" data-num="abbr">${esc(T(st, stE))}</span>${c.dot && !S.seen[c.k] ? '<i class="dot" data-m="M02"></i>' : ''}</button>`;
    })
    .join('');
  const rows = fs1 ? f.more.length : Math.ceil(f.more.length / 2);
  const gh = 8 + rows * ((fs1 ? 56 : ch) + 8);
  const foot = `<div style="padding:16px 12px 4px;flex:none"><button class="btn kf" data-k="tocamp" data-hit="tocamp" style="width:${port ? 366 : 404}px">${esc(T('回營地', 'Return to camp'))}</button></div>`;
  return shell(
    g,
    'more',
    T('更多', 'More'),
    `<div data-m="M01" style="position:relative;height:${gh}px">${cards}</div>`,
    { key: port ? '' : 'Z', foot }
  );
}

/* ---------- 3 設定 ---------- */
function setHTML(g) {
  const f = F(),
    port = g.port;
  const SEC = [
    ['game', '遊戲', 'Game'],
    ['view', '畫面', 'Display'],
    ['sound', '聲音', 'Sound'],
    ['keys', '按鍵', 'Controls'],
    ['acct', '帳號', 'Account']
  ];
  const seg = (k, opts, cur, cls = '') =>
    `<div class="seg ${cls}" role="group">${opts.map(([v, z, e]) => `<button class="kf" data-k="${k}-${v}" data-hit="seg" aria-pressed="${cur === v}" data-role="label">${esc(T(z, e))}</button>`).join('')}</div>`;
  const top = `<div class="seg" data-m="T01" style="padding:4px 8px;flex:none;gap:${port ? 4 : 6}px">${SEC.map(([k, z, e]) => `<button class="kf" data-k="sec-${k}" data-hit="seg" aria-pressed="${S.sec === k}" data-role="label" style="${port ? 'flex:0 0 71px' : 'flex:0 0 72px'}">${esc(T(z, e))}</button>`).join('')}</div>`;
  let b = '';
  if (S.sec === 'game')
    b = `<div class="sec" data-m="T02"><h4 data-role="body">${esc(T('掉落提示門檻', 'Drop alerts'))}</h4>${seg(
      'alert',
      [
        ['all', '全部', 'All'],
        ['rare', '稀有以上', 'Rare+'],
        ['leg', '傳奇以上', 'Legendary+']
      ],
      S.alert,
      'h48'
    )}<div class="note" data-role="body">${esc(T('只管動態與聲音，東西照收', 'Only affects the feed and sounds; everything is still picked up'))}</div></div>`;
  if (S.sec === 'view') {
    const fx = S.fsx;
    b = `<div class="sec" data-m="T03"><h4 data-role="body">${esc(T('文字大小', 'Text size'))}</h4>${seg(
      'fs',
      [
        [100, '100%', '100%'],
        [115, '115%', '115%'],
        [130, '130%', '130%']
      ],
      fx ? fx.to : S.fsSet,
      'h48'
    )}<div class="ex" id="d-ex" data-role="body">${fx ? `<span class="old" style="font-size:${(14 * fx.from) / 100}px">${esc(T('範例：雪埋古道・怪物 Lv48', 'Sample: Snowburied Road · Lv48'))}</span>` : ''}<span class="new" style="font-size:${(14 * (fx ? fx.to : S.fsSet)) / 100}px">${esc(T('範例：雪埋古道・怪物 Lv48', 'Sample: Snowburied Road · Lv48'))}</span></div></div>
<div class="sec" data-m="T04"><h4 data-role="body">${esc(T('減少動態', 'Reduce motion'))}</h4>${seg(
      'rms',
      [
        ['sys', '跟系統', 'System'],
        ['on', '開', 'On'],
        ['off', '關', 'Off']
      ],
      S.rmSet,
      'h48'
    )}<h4 data-role="body">${esc(T('畫面震動', 'Screen shake'))}</h4>${seg(
      'shk',
      [
        [1, '開', 'On'],
        [0, '關', 'Off']
      ],
      S.shk,
      'h48'
    )}</div>`;
  }
  if (S.sec === 'sound') {
    const sl = (k, z, e, v) =>
      `<div class="sld"><span style="width:56px" data-role="body">${esc(T(z, e))}</span><input type="range" class="kf" min="0" max="100" value="${v}" data-k="${k}" data-hit="slider" aria-label="${esc(T(z, e))}"><output data-role="body">${v}%</output></div>`;
    b = `<div class="sec" data-m="T05">${sl('sfx', '音效', 'SFX', S.sfx)}${sl('mus', '音樂', 'Music', S.mus)}<h4 data-role="body">${esc(T('震動（只有 Android）', 'Vibration (Android only)'))}</h4>${seg(
      'vib',
      [
        [1, '開', 'On'],
        [0, '關', 'Off']
      ],
      S.vib,
      'h48'
    )}<div class="note" data-role="body">${esc(T('打開時示範震 20 ms', 'Turning on plays a 20 ms sample'))}</div></div>`;
  }
  if (S.sec === 'keys')
    b = port
      ? `<div class="sec" data-m="T06">${GEST.map(([a, z, e]) => `<div class="grow" data-role="body"><b>${esc(T(a, e.split(':')[0]))}</b><span>${esc(T(z, e.split(': ')[1]))}</span></div>`).join('')}</div>`
      : `<div class="sec" data-m="T06"><div class="ktab" id="d-keys">${KEYS.map(([k, z, e]) => `<div class="krow" data-role="body"><span>${esc(T(z, e))}</span><kbd data-role="label">${esc(k)}</kbd></div>`).join('')}</div><div class="note" data-role="body"><span class="ph">待對照</span> ${esc(T('全鍵位表 e5f18530 不在 repo，表由程式的 KEYS 產生', 'Reference table e5f18530 not in repo'))}</div></div>`;
  if (S.sec === 'acct') {
    const a = f.account;
    b = `<div class="sec" data-m="T07" style="min-height:100%"><div data-role="body">${esc(a.guest ? T('目前是訪客', 'Playing as guest') : T('已登入', 'Signed in') + ' ' + a.mail)}</div>${a.guest ? `<div class="note" data-role="body" style="color:var(--warn)">${ICO.warn} ${esc(T('訪客存檔只在這台裝置，登出後可能找不回來', 'Guest saves live only on this device and may be lost after signing out'))}</div>` : ''}<button class="btn danger kf" data-k="logout" data-hit="logout" data-hold="logout" style="width:100%"><i class="fill" id="d-fill-logout"></i><span>${ICO.hold} ${esc(T('長按登出', 'Hold to sign out'))}</span></button><div style="display:flex;justify-content:flex-end"><button class="btn kf" data-k="logout-no" data-hit="cancel" style="width:110px">${esc(T('取消', 'Cancel'))}</button></div><div class="note" data-role="body">${esc(T('版本', 'Version'))} ${esc(f.ver)}</div></div>`;
  }
  return shell(g, 'set', T('設定', 'Settings'), b, { full: 1, key: port ? '' : 'Esc', top, m: 'T' });
}

/* ---------- 4 掉落紀錄 ---------- */
function logHTML(g) {
  const f = F(),
    port = g.port,
    L = curLoc();
  const on = L.lv >= 45;
  let top = '';
  if (f.log.length || f.pity) {
    top = `<div class="pityr" data-m="G01" style="min-height:${port ? 28 : 56}px;margin-top:${port ? 3 : 0}px"><b data-role="body">${esc(T('下一件保底', 'Chase pity'))} ${f.pity}%</b><i class="pbar"><i style="width:${f.pity}%"></i></i></div>`;
    if (!on)
      top += `<div class="note" data-m="G02" data-role="body" style="padding:2px 12px;font-size:var(--f14);color:var(--tx-dim)">${esc(T('這裡不累積保底：怪物 Lv 45 以上的地點才會累積', 'No pity here: only maps with monster Lv 45+ build it'))}</div>`;
  }
  const FL = [
    ['all', '全部', 'All'],
    ['gear', '裝備', 'Gear'],
    ['cur', '通貨', 'Currency'],
    ['chase', '追逐', 'Chase']
  ];
  top += `<div class="seg" style="padding:4px 8px;flex:none" data-m="G03f">${FL.map(([k, z, e]) => `<button class="kf" data-k="lf-${k}" data-hit="seg" aria-pressed="${S.logF === k}" data-role="label" style="flex:0 0 ${port ? 76 : 76}px">${esc(T(z, e))}</button>`).join('')}</div>`;
  let body;
  if (!f.log.length)
    body = `<div class="empty" data-m="G06" data-role="body"><span class="ph">待定</span> ${esc(T('（佔位句）打倒怪物和王，掉的東西會記在這裡', '(placeholder) Defeat monsters and bosses — drops are listed here'))}</div>`;
  else if (S.logItem) body = itemCard(g);
  else
    body = `<div data-m="G03">${f.log
      .filter(e => S.logF === 'all' || e.cat === S.logF)
      .map(
        e =>
          `<div class="grow2 kf inset-f ${e.rar === 'chase' ? 'chase' : ''} ${S.logPick === e.id ? 'pick' : ''}" tabindex="0" role="button" data-k="lr-${e.id}" data-hit="lrow" data-id="${e.id}">${e.unlock || !RICO[e.rar] ? '' : `<span class="r-${e.rar}">${RICO[e.rar]}</span>`}<span class="nm ell r-${e.rar}" data-role="body">${esc(RMARK[e.rar] + (P.en ? e.en : e.name))}</span>${e.mem ? `<span class="memt">${esc(T('記憶', 'Memory'))}</span>` : ''}${e.unlock ? `<span class="unlockt">${esc(T('開了', 'Unlocked'))}</span>` : ''}<small data-role="label">${esc(P.en ? e.srcEn : e.src)}・${e.min} ${esc(T('分前', 'min ago'))}</small><span class="q num" data-role="body">×${e.n}</span></div>`
      )
      .join('')}</div>`;
  const more = f.log.length
    ? `<button class="lk kf" data-k="pity-more" data-hit="link" data-m="G01b">${esc(T('其他保底 3 項', '3 more pity'))} ›</button>`
    : '';
  return shell(g, 'log', T('掉落紀錄', 'Drop log'), body, {
    key: port ? '' : 'L',
    top,
    back: S.logItem ? 'item-back' : '',
    extra: more
  });
}
function itemCard(g) {
  const it = F().item;
  return `<div class="icard" data-m="G05"><div class="cmp" data-role="body">${it.cmp
    .map(([z, e, a, b]) => {
      const d = a - b,
        up = d > 0;
      return `<span>${esc(T(z, e))}</span><span>${NF(a)}</span><span class="${up ? 'up' : 'dn'}">${up ? '▲' : '▼'} ${up ? '+' : '−'}${NF(Math.abs(d))}</span>`;
    })
    .join(
      ''
    )}</div><h5 class="r-${it.rar}" data-role="body">◆ ${esc(T(it.name, it.en))}</h5><div class="dim" data-role="body">${esc(T(it.base, it.baseEn))}</div><div class="mods">${(P.en ? it.modsEn : it.mods).map(m => `<div data-role="body">${esc(m)}</div>`).join('')}</div></div>`;
}

/* ---------- 5 商會＋山海寶盒 ---------- */
function guildHTML(g) {
  const f = F(),
    port = g.port,
    G = f.guild;
  const top = `<div class="seg" style="padding:4px 8px;flex:none" data-m="Bt">${G.tabs.map(t => `<button class="kf" data-k="gt-${t}" data-hit="seg" aria-pressed="${S.gTab === t}" data-role="label" style="flex:0 0 ${port ? 90 : 96}px">${esc(T(t, { 鐵: 'Iron', 皮: 'Hide', 靈絲: 'Silk', 通貨: 'Currency' }[t]))}</button>`).join('')}</div>`;
  const rows = G.rows[S.gTab]
    .map((r, i) => {
      const have = S.gHave && S.gHave[S.gTab + i] != null ? S.gHave[S.gTab + i] : r.have;
      const n = Math.floor(have / r.k),
        capd = r.tier > G.capTier,
        sel = S.gSel === i;
      const shown = S.roll && S.roll.k === S.gTab + i ? S.roll.cur : have;
      const title = `${esc(T(r.from, r.fromEn))} ×${r.k} → ${esc(T(r.to, r.toEn))} ×1`;
      if (capd)
        return `<div class="grow3 capd" data-m="B03" data-k="gr-${i}">${ICO.lock}<span class="nm"><b data-role="body">${title}</b><span data-role="body">${esc(T(G.capWhy, G.capWhyEn))}</span></span></div>`;
      if (!n)
        return `<div class="grow3 ${sel ? 'sel' : ''}" data-m="B02" data-k="gr-${i}"><span class="nm"><b data-role="body">${title}</b><span data-role="body">${esc(T('有', 'Have'))} ${NF(have)}</span></span><span class="no" data-role="body">${esc(T('不夠', 'Not enough'))}</span></div>`;
      return `<div class="grow3 ${sel ? 'sel' : ''}" data-m="B01" data-k="gr-${i}"><span class="nm"><b data-role="body">${title}</b><span data-role="body">${esc(T('有', 'Have'))} <span class="num" data-num="full" id="d-have-${i}">${full(shown)}</span>・${esc(T('可換', 'trades'))} ${full(n)} ${esc(T('次', ''))}</span></span><button class="btn sm kf b60" data-k="g1-${i}" data-hit="g1">${esc(T('換 1', 'Trade 1'))}</button><button class="btn sm kf b86" data-k="ga-${i}" data-hit="ga">${esc(T(`全部 ${full(n)}`, `All ×${full(n)}`))}</button></div>`;
    })
    .join('');
  return shell(g, 'guild', T('商會', 'Guild'), rows, { key: port ? '' : '', top });
}
function boxHTML(g) {
  const f = F(),
    port = g.port,
    B = f.box;
  const seen = B.sys.filter(s => s.seen);
  const top = `<div class="seg" style="padding:4px 8px;gap:1px;flex:none;flex-wrap:${P.en ? 'nowrap' : 'wrap'};overflow-x:${P.en ? 'auto' : 'visible'}" data-m="Bb">${seen.map(s => `<button class="kf" data-tab="${s.k}" data-k="bt-${s.k}" data-hit="seg" aria-pressed="${S.bTab === s.k}" data-role="label" style="flex:0 0 ${port ? 74 : 76}px">${esc(T(s.k, s.en))}</button>`).join('')}</div>`;
  const sys = B.sys.find(s => s.k === S.bTab);
  let b = '';
  if (S.bTab === '心魔劫')
    b = `<div data-m="B07">${B.demon.map((d, i) => `<div class="frow"><label data-hit="chk"><input type="checkbox" class="kf" data-k="dm-${i}" ${S.pick['dm' + i] ? 'checked' : ''} ${d.n ? '' : 'disabled'} aria-label="${esc(T(d.name, d.en))}"></label><span class="nm"><b data-role="body">${esc(T(d.name, d.en))} ×${d.n}</b><span data-role="body">${esc(T(d.debuff, d.debuffEn))}</span></span></div>`).join('')}</div>`;
  else if (S.bTab === '弒神')
    b = `<div data-m="B07g"><div class="cells" style="grid-template-columns:repeat(1,${port ? 146 : 156}px)">${cellHTML(sys.frags[0], B.need)}</div><div class="zh" data-role="body">${esc(T('神格', 'Godhood'))}</div>${B.godhood.map((d, i) => `<div class="frow"><label data-hit="chk"><input type="checkbox" class="kf" data-k="gh-${i}" ${d.n ? '' : 'disabled'} aria-label="${esc(T(d.name, d.en))}"></label><span class="nm"><b data-role="body">${esc(T(d.name, d.en))} ×${d.n}</b></span></div>`).join('')}</div>`;
  else {
    b = `<div class="cells" data-m="B05">${sys.frags.map(fr => cellHTML(fr, B.need)).join('')}</div>`;
    const hallsOf = B.halls.map((h, i) => Object.assign({ i }, h)).filter(h => sys.frags.some(fr => fr[0] === h.frag));
    b += `<div data-m="B06">${hallsOf
      .map(h => {
        const have = sys.frags.find(fr => fr[0] === h.frag)[2],
          ok = have >= h.need;
        const loc = nm(curLoc());
        return `<div class="hall ${ok ? 'ok' : ''}"><span class="nm"><b data-role="body">${esc(T(h.name, h.en))}</b><span data-role="body">${esc(T('王', 'Boss'))} Lv${h.lv}・${esc(T(`打完回${loc}接著刷`, `then back to ${loc}`))}</span><span class="dim" data-role="body" style="font-size:var(--f14)">${esc(T('難度', 'Difficulty'))} ${h.diff}</span>${ok ? '' : `<span class="why" data-role="body">${esc(T(`${h.frag}還差 ${h.need - have} 張`, `${h.need - have} more ${h.frag}`))}</span>`}</span>${ok ? `<button class="btn kf b102" data-k="hall-${h.i}" data-hit="hall">${esc(T('進殿', 'Enter'))}</button>` : `<button class="btn offb b102" disabled aria-disabled="true" data-hit="hall" data-k="hall-off-${h.i}">${esc(T(`還差 ${h.need - have} 張`, `${h.need - have} short`))}</button>`}</div>`;
      })
      .join('')}</div>`;
  }
  return shell(g, 'box', T('山海寶盒', 'Shan Hai Box'), b, { key: port ? '' : 'J', top });
}
const cellHTML = (fr, need) =>
  `<div class="cell ${fr[2] ? '' : 'zero'} ${fr[2] >= need ? 'full' : ''}"><b data-role="label">${esc(T(fr[0], fr[1]))}</b><span class="num" data-role="body">${fr[2]}／${need}</span></div>`;
function forgeHTML(g) {
  const n = F().guild.rows.鐵[1];
  return shell(
    g,
    'forge',
    T('鍛造・打造', 'Forge · Craft'),
    `<div class="forge"><div data-role="body">${esc(T('打造：玄紋 長劍（需要 百煉鋼 ×5）', 'Craft: Dark Rune Longsword (needs 5 Tempered Steel)'))}</div><button class="btn kf" data-m="B04" data-k="to-guild" data-hit="to-guild" style="justify-content:flex-start">${esc(T('差 3 個百煉鋼', '3 Tempered Steel short'))} › ${esc(T('商會可換', 'trade at Guild'))}</button><div class="dim" data-role="body">${esc(T('有', 'Have'))} ${NF(2)}・${esc(T(n.from, n.fromEn))} ${NF(n.have)}</div></div>`,
    { key: g.port ? '' : 'K' }
  );
}
function curHTML(g) {
  const f = F();
  return shell(
    g,
    'cur',
    T('完整貨幣清單', 'All currency'),
    `<div data-m="X01b">${f.cur.map(([z, e, v]) => `<div class="grow" data-role="body" style="padding:0 12px"><b style="flex:1;width:auto">${esc(T(z, e))}</b>${NF(v)}</div>`).join('')}</div>`
  );
}

/* ---------- 對話框（M04、P01、B08） ---------- */
function dlgHTML(g) {
  const f = F(),
    port = g.port;
  const W = port ? g.W - 16 : 400,
    X = port ? 8 : (g.W - 400) / 2;
  let h = '<div class="scrim" data-k="dlg-scrim"></div>';
  if (S.dlg === 'camp') {
    const H = 214;
    h += `<div class="dlg" role="dialog" data-m="M04" style="${px(X, port ? g.idleTop - H - 8 : (g.H - H) / 2, W, H)}"><h3 data-role="body">${esc(T('回營地？', 'Return to camp?'))}</h3><p data-role="body">${esc(T('戰鬥暫停、回來補算', 'Combat pauses; settled when you return'))}</p><p class="dim" data-role="body">${esc(T('地上的東西照樣收下', 'Loot on the ground is still collected'))}</p><div style="display:flex;flex-direction:column;gap:8px;margin-top:auto"><button class="btn kf" data-k="dlg-no" data-hit="dlg">${esc(T('取消', 'Cancel'))}</button><button class="btn pri kf" data-k="camp-yes" data-hit="dlg">${esc(T('回營地', 'Return to camp'))}</button></div></div>`;
  }
  if (S.dlg === 'prac') {
    const Y = port ? 320 : (g.H - 260) / 2,
      H = port ? 246 : 260;
    const loc = nm(curLoc());
    h += `<div class="dlg" role="dialog" data-m="P01" style="${px(X, Y, W, H)}"><button class="btn kf" data-k="dlg-no" data-hit="dlg" style="${port ? '' : 'order:9'}">${esc(T('取消', 'Cancel'))}</button><h3 data-role="body">${esc(T('去試招場？', 'Go to Practice Ground?'))}</h3><p class="warn" data-role="body">${esc(T(`${loc}的戰鬥暫停，回戰場補算`, `Combat on ${loc} pauses; settled when you return`))}</p><p class="dim" data-role="body">${esc(T('試招場裡不掉東西、不給經驗', 'No drops and no XP in the Practice Ground'))}</p><button class="btn pri kf" data-k="prac-yes" data-hit="dlg" style="margin-top:auto">${esc(T('去試招場', 'Go to Practice Ground'))}</button></div>`;
  }
  if (S.dlg === 'hall') {
    const hl = f.box.halls[S.hallI];
    const Wd = port ? 358 : 400,
      Xd = (g.W - Wd) / 2,
      Hd = 260;
    h += `<div class="dlg" role="dialog" data-m="B08" style="${px(Xd, (g.H - Hd) / 2, Wd, Hd)}"><h3 data-role="body">${esc(T(`進${hl.name}？`, `Enter ${hl.en}?`))}</h3><p data-role="body">${esc(T('花掉', 'Spends'))}：${esc(T(hl.frag, 'Soul Hook Token'))} ×${NF(hl.need)}（${esc(T('有', 'have'))} ${NF(5)}）</p><p data-role="body">${esc(T('王', 'Boss'))} Lv${hl.lv}</p><p class="badt" data-role="body">${esc(T(`倒下的話${hl.frag}不退回`, `If you fall, the ${hl.frag} is not refunded`))} <span class="ph">${esc(T('（未驗）', '(unverified)'))}</span></p><div style="display:flex;gap:8px;margin-top:auto;align-items:flex-end"><button class="btn pri kf" data-k="hall-yes" data-hit="dlg" data-hold="hall" style="width:208px;height:56px"><i class="fill" id="d-fill-hall"></i><span>${ICO.hold} ${esc(T('長按進殿', 'Hold to enter'))}</span></button><button class="btn kf" data-k="hall-no" data-hit="dlg" style="width:110px;height:56px;margin-left:auto">${esc(T('取消', 'Cancel'))}</button></div></div>`;
    if (S.fly) for (let i = 0; i < 5; i++) h += `<span class="fly" id="d-fly${i}">${ICO.seal}</span>`;
  }
  return h;
}

/* ---------- 6 試招場 ---------- */
function pracHTML(g) {
  const f = F(),
    p = f.prac,
    port = g.port,
    hit = S.pracHit;
  const lv = S.pracLv || p.lv,
    top = lv >= p.lvMax,
    bot = lv <= p.lvMin;
  /* 文字 130%：數字列改兩行，卡 172 → 210（清單第 10 節） */
  const ch = port ? (P.fs ? 210 : 172) : P.fs ? 284 : 236;
  const rect = port ? px(8, g.top, g.W - 16, ch) : px(16, 76, 300, ch);
  const btns = `<span class="brow"><button class="btn sm h40 kf" data-k="pr-reset" data-hit="pr" style="width:72px">${esc(T('重置', 'Reset'))}</button><button class="btn sm h40 kf" data-k="pr-leave" data-hit="pr" style="width:78px">${esc(T('離開', 'Leave'))}</button></span>`;
  let inner = `<div class="t"><span data-role="body">${esc(T('試招場', 'Practice Ground'))}</span>${btns}</div>`;
  if (!hit)
    inner += `<div class="lab" data-role="label" style="flex:1;display:flex;align-items:center">${esc(T('打稻草人就開始算', 'Hit a dummy to start'))}</div>`;
  else
    inner += `<div data-m="P03"><div class="lab" data-role="label">${esc(T('10 秒平均', '10 s avg'))}</div><div class="big" data-role="num">${NF(p.avg10)}</div><div class="mid" data-role="num"><span class="lab" style="font-family:var(--font)">${esc(T('從第一下起平均', 'Since first hit'))}</span> ${NF(p.first)}</div><div class="rat" data-role="body"><i class="rbar"><i style="width:${p.direct * 100}%"></i></i><span>${esc(T('直接', 'Real'))} ${NF(p.avg10 * p.direct)}｜${esc(T('持續', 'DoT'))} ${NF(p.avg10 * (1 - p.direct))}</span></div><div class="rat" data-m="P04" data-role="body"><span>${esc(T('推薦估', 'Est.'))} —</span><span>・${esc(T('換之前', 'Before swap'))} —</span><span class="dim">▲▼ —</span></div></div>`;
  let h = `<div class="ab pnl dps" data-hud data-m="${hit ? 'P03c' : 'P02'}" style="${rect}">${inner}</div>`;
  h += `<div class="ab plate lvc" data-hud data-m="P05" style="${port ? px(8, g.top + ch + 8, g.W - 16, 48) : px(16, 76 + ch + 8, 380, 40)}"><button class="btn kf ${bot ? 'offb' : ''}" data-k="lv-dn" data-hit="lv" ${bot ? 'aria-disabled="true"' : ''}>−</button><span data-role="body">${esc(T('怪物', 'Monster'))} Lv${lv}</span><span class="lab" data-role="label" style="color:var(--tx-dim);flex:1;text-align:right">${esc(T('這次受傷', 'Damage taken'))} ${p.hurt.join('%／')}%</span><button class="btn kf ${top ? 'offb' : ''}" data-k="lv-up" data-hit="lv" ${top ? 'aria-disabled="true"' : ''}>＋</button></div>`;
  return h;
}

/* ---------- 7 開場＋重開 ---------- */
function unlockState() {
  if (!S.intro) return [];
  const t = NOW - S.intro.t0,
    U = F().unlocks;
  const out = [];
  let st = 8000;
  for (let i = 0; i < U.length; i++) {
    const dn = S.unlockDone[i];
    const end = dn != null ? dn - S.intro.t0 : st + (P.rm ? 0 : 240) + 6000;
    /* 減少動態：直接出現、直接收（不淡出），排隊間隔一樣 1,200 */
    const fo = P.rm ? 0 : 300,
      vis = t >= st && t < end + fo;
    out.push({
      i,
      st,
      end,
      vis,
      a: !vis ? 0 : P.rm ? 1 : t < st + 240 ? (t - st) / 240 : t < end ? 1 : 1 - (t - end) / 300
    });
    st = end + fo + 1200;
  }
  return out;
}
function introHTML(g) {
  const f = F(),
    port = g.port,
    it = f.intro,
    t = NOW - S.intro.t0;
  let h = '';
  h += `<div class="ab sub hide" id="d-sub" data-m="O02" data-k="sub" data-role="body" style="${port ? px(40, g.st + 133, 310, 50) : px(390, 140, 500, 56)}">${esc(T(it.sub, it.subEn))}</div>`;
  const big = t < 6000;
  h += `<button class="ab btn plate kf snd" id="d-snd" data-hud data-m="O03" data-k="snd" data-hit="snd" style="${port ? (big ? px(g.W - 8 - 132, g.skY - 48, 132, 44) : px(g.W - 8 - 44, g.skY - 48, 44, 44)) : big ? px(g.W - 16 - 164, g.H - 56, 164, 40) : px(g.W - 16 - 44, g.H - 56, 44, 40)}">${ICO.spk}${big ? `<span>${esc(T('聲音：點一下開', 'Sound: tap to turn on'))}</span>` : ''}</button>`;
  const [fac, facEn, lv, have, need] = it.goal;
  h += `<div class="ab pnl goal" data-hud data-m="O04" style="${port ? px(8, g.goalTop, g.W - 16, 140) : px(16, g.H - 160, 380, 96)}"><small data-role="label">${esc(T('下一個目標', 'Next goal'))}</small><b data-role="body">${esc(T(fac, facEn))} Lv${lv}・${esc(T('靈魂', 'Souls'))} ${NF(have)}／${NF(need, 'cost')}</b><i class="gbar"><i style="width:${(have / need) * 100}%"></i></i></div>`;
  const us = unlockState();
  for (const u of us) {
    const [z, e, key] = f.unlocks[u.i];
    h += `<button class="ab unl kf hide" id="d-unl${u.i}" data-m="O05" data-hud data-k="unl-${u.i}" data-hit="unl" style="${port ? px(8, g.top, g.W - 16, 72) : px(16, 76, 380, 80)}"><span data-role="body">${esc(T(z, e))}</span>${port ? '' : `<kbd data-role="label">${key}</kbd>`}</button>`;
  }
  if (t >= it.beats[2][0] && !S.seen.camp)
    h += `<div class="ab plate gainl" data-hud data-m="O06" data-role="body" style="${port ? px(8, g.st + 48, 186, 40) : px(g.W - 16 - 264, 68, 264, 40)}">${esc(T('營地可以升級了', 'Camp upgrade ready'))} ›</div>`;
  return h;
}
function offHTML(g) {
  const f = F(),
    a = f.away,
    soul = Math.floor(a.soulMin * a.long);
  const t = NOW - S.away.t0,
    k = P.rm || S.away.skip ? 1 : Math.min(1, t / 1200);
  const n = v => NF(Math.floor(v * k));
  const hh = Math.floor(a.long / 60),
    mm = String(a.long % 60).padStart(2, '0');
  const nx = f.next;
  return `<div class="ab off-s" data-m="O08" data-k="off-skip" style="${px(0, g.st, g.W, g.H - g.st - g.sb)}"><h2 data-role="body">${esc(T('離開', 'Away'))} ${hh}h ${mm}m</h2><div class="r" data-role="body"><span>${esc(T('打倒王', 'Boss kills'))}</span><b id="d-off-k">${n(a.kills)} ${esc(T('次', ''))}</b></div><div class="r" data-role="body"><span>${esc(T('靈魂', 'Souls'))}</span><b>+${n(soul)}</b></div><div class="r" data-role="body"><span>${esc(T('掉落', 'Drops'))}</span><b>${n(a.items)} ${esc(T('件', 'items'))}（${esc(T('稀有以上', 'Rare+'))} ${n(a.rare)}）</b></div>${nx ? `<div class="r" data-role="body"><span>${esc(T('下一個目標', 'Next goal'))}</span><b>${esc(T(`${nx.fac} Lv${nx.facLv}`, `${nx.facEn} Lv${nx.facLv}`))}・${esc(T(nx.mat, nx.matEn))} ${NF(nx.have)}／${NF(nx.need, 'cost')}</b></div>` : ''}<button class="btn pri kf" data-k="off-ok" data-hit="off" style="width:100%">${esc(T('收下', 'Collect'))}${g.port ? '' : ' <kbd>Enter</kbd>'}</button></div>`;
}

/* ---------- 共用：天賦樹滿版（D2 本體佔位）、營地單座卡 ---------- */
function treeHTML(g) {
  return `<div class="ab tree" id="d-tree" data-m="X04" style="${px(0, 0, g.W, g.H)}"><canvas id="d-tcv" width="${g.W}" height="${g.H}"></canvas><button class="btn kf back" data-k="tree-back" data-hit="back" style="min-width:${g.port ? 88 : 80}px;min-height:${g.port ? 44 : 36}px;${g.port ? `top:${g.st + 4}px` : ''}">${ICO.back}<span>${esc(T('返回', 'Back'))}</span>${g.port ? '' : '<kbd style="font:700 12px var(--font)">Esc</kbd>'}</button><div class="ab tags" style="${px(g.W - 220, g.port ? g.st + 12 : 16, 200, 24)}"><i>${esc('天賦樹本體屬 D2（佔位）')}</i></div></div>`;
}
function campHTML(g) {
  const port = g.port,
    f = F();
  const facs = [
    ['瞭望台', 'Watchtower', 14],
    ['斥候營', 'Scout Camp', f.scout],
    ['鍛造台', 'Anvil', 12],
    ['倉房', 'Storehouse', 6],
    ['祭壇', 'Altar', 5],
    ['民房', 'Houses', 7]
  ];
  let body,
    back = '';
  if (S.campCard) {
    const n = f.next || { facLv: 15, mat: '熟鐵', matEn: 'Wrought Iron', have: 0, need: 1 };
    back = 'camp-list';
    body = `<div class="forge" data-m="X05"><b data-role="body" style="font-size:var(--f20)">${esc(T(S.campCard, 'Watchtower'))} Lv14 → Lv15</b><div data-role="body">${esc(T('開更深的地點、提高材料階上限', 'Opens deeper maps; raises material tier cap'))}</div><div data-role="body">${esc(T(n.mat, n.matEn))} ${NA(n.have)}／${NA(n.need, 'cost')}</div><div class="dim" data-role="body">${esc(T(`升到 Lv${n.facLv} 開${n.name || ''}`, `Lv${n.facLv} opens ${n.en || ''}`))}</div><button class="btn offb" disabled data-hit="up">${esc(T('材料不夠', 'Not enough'))}</button></div>`;
  } else
    body = facs
      .map(
        ([z, e, lv], i) =>
          `<button class="crow kf ${i === 0 ? 'sug' : ''}" data-k="cf-${z}" data-hit="crow"><b data-role="body">${esc(T(z, e))}</b><span data-role="body">Lv${lv}</span>${ICO.chev}</button>`
      )
      .join('');
  const y = port ? g.sheetTop : g.colTop,
    h = port ? g.idleTop - y : g.colBot - g.colTop;
  return `<section class="ab pnl ${port ? 'sheet' : ''}" data-panel="camp" data-m="camp" style="${px(port ? 0 : g.colX, y, port ? g.W : 420, h)}"><div class="hd">${back ? `<button class="x44 kf" data-k="${back}" data-hit="back" data-m="X05b" aria-label="${esc(T('回清單', 'Back to list'))}">‹</button>` : ''}<b data-role="body">${esc(S.campCard ? T(S.campCard, 'Watchtower') : T('營地升級', 'Camp upgrade'))}</b><button class="btn sm kf" data-k="camp-out" data-hit="campout" style="margin-right:4px">${esc(T('繼續刷', 'Keep farming'))}</button><button class="x44 kf" data-k="camp-x" data-hit="x" aria-label="${esc(T('關閉營地', 'Close camp'))}">${ICO.x}</button></div><div class="bd" data-list>${body}</div></section>`;
}

/* ---------- 每格：動畫與 canvas ---------- */
const CV = {};
function tok() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of [
    'scene-temple-ground',
    'scene-temple-mid',
    'scene-temple-light',
    'scene-tomb-ground',
    'scene-tomb-mid',
    'scene-tomb-light',
    'border-hi',
    'bad',
    'dmg-hit',
    'tx-strong',
    'border-mid',
    'rar-rare',
    'tx-dim',
    'border',
    'scene-void',
    'act',
    'prog-hi'
  ])
    CV[k] = cs.getPropertyValue('--' + k).trim();
}
const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const easeIn = x => Math.pow(Math.min(1, Math.max(0, x)), 3);
let PR = {}; /* 擷取腳本讀的狀態（probe） */
let lastT = 0;
function tick() {
  const dt = NOW - lastT;
  lastT = NOW;
  const g = geo();
  PR = { t: NOW };
  /* 戰鬥時間（暫停時不走） */
  if (!paused() && !(S.away && S.away.kind === 'long' && !S.away.done)) {
    S.bt += dt;
    const first = S.intro ? F().intro.firstHit : 0;
    const t = S.intro ? NOW - S.intro.t0 : S.bt;
    const nh = t < first ? 0 : 1 + Math.floor((t - first) / 700);
    if (nh > S.hits) {
      if (!S.hits) log('first-hit', { at: S.intro ? NOW - S.intro.t0 : S.bt });
      S.hits = nh;
    }
  }
  PR.bt = S.bt;
  PR.hits = S.hits;
  /* 面板滑入／滑出＋鏡頭 */
  const pn = $('d-pnl') || q('[data-panel=camp]');
  let camT = 0;
  const openTarget = g.port ? -(g.idleTop - g.sheetTop) / 2 : -218;
  if (pn) {
    const off = g.port ? pn.offsetHeight : 436;
    let k = 1,
      op = 1;
    if (S.pClose) {
      const x = (NOW - S.pClose.t0) / (P.rm ? 140 : 160);
      if (P.rm) op = 1 - Math.min(1, x);
      else k = 1 - easeIn(x);
      if (x >= 1) return closeDone();
    } else {
      const x = (NOW - S.pOpenT) / (P.rm ? 140 : 240);
      if (P.rm) op = Math.min(1, x);
      else k = ease(x);
    }
    pn.style.transform = g.port ? `translateY(${(1 - k) * off}px)` : `translateX(${(1 - k) * off}px)`;
    pn.style.opacity = op;
    PR.panel = {
      k,
      op,
      y: pn.offsetTop + (g.port ? (1 - k) * off : 0),
      x: pn.offsetLeft + (g.port ? 0 : (1 - k) * off)
    };
    camT = S.pClose
      ? openTarget * (P.rm ? 0 : 1 - Math.min(1, (NOW - S.pClose.t0) / 160))
      : openTarget * (P.rm ? 1 : ease((NOW - S.pOpenT) / 240));
  }
  PR.cam = camT;
  /* 地點：星級條數滾字、鎖住抖 */
  const rng = $('d-rng');
  if (rng && S.rngOld && !P.rm) {
    const x = Math.min(1, (NOW - S.rngT) / 200);
    if (x < 1 && !rng.querySelector('.old'))
      rng.insertAdjacentHTML('afterbegin', `<span class="old">${esc(S.rngOld)}</span>`);
    const o = rng.querySelector('.old'),
      nw = rng.querySelector('span:not(.old)');
    if (o) o.style.transform = `translateY(${-x * 20}px)`;
    if (nw) nw.style.transform = `translateY(${(1 - x) * 20}px)`;
    if (x >= 1 && o) o.remove();
    PR.roll = x;
  }
  const lk = $('d-lock');
  if (lk && S.shake) {
    const x = (NOW - S.shake.t0) / 120;
    const dx = x < 1 && !P.rm ? 2 * Math.sin(x * Math.PI * 4) : 0;
    lk.style.transform = `translateX(${dx}px)`;
    lk.style.outline = P.rm && x < 1 ? '2px solid var(--border-hi)' : '';
    PR.shake = dx;
  }
  /* 設定：字級交叉淡換 200 */
  if (S.fsx) {
    const x = (NOW - S.fsx.t0) / 200,
      ex = $('d-ex');
    if (ex) {
      const o = ex.querySelector('.old'),
        n = ex.querySelector('.new');
      if (o) o.style.opacity = 1 - Math.min(1, x);
      if (n) n.style.opacity = Math.min(1, x);
    }
    PR.fsx = Math.min(1, x);
    if (x >= 1) {
      S.fsSet = S.fsx.to;
      S.fsx = null;
      log('fs-apply', { v: S.fsSet });
      return build();
    }
  }
  /* 長按（600；早放開 ≤ 150 退回） */
  if (S.hold) {
    const h = S.hold;
    let v;
    if (h.rel) v = h.relFrom * (1 - Math.min(1, (NOW - h.relT) / 150));
    else v = Math.min(1, (NOW - h.t0) / 600);
    const fe = $('d-fill-' + h.k);
    if (fe) fe.style.width = v * 100 + '%';
    PR.hold = v;
    if (!h.rel && v >= 1) holdDone(h.k);
    else if (h.rel && v <= 0) S.hold = null;
  }
  /* 掉落紀錄選中框 2,000 */
  const pk = q('.grow2.pick');
  if (pk) {
    const on = NOW - S.pickT < 2000;
    pk.style.outlineColor = on ? '' : 'rgb(var(--scrim-rgb) / 0)';
    PR.pick = on ? 1 : 0;
  }
  /* 商會數字滾 200／300 */
  if (S.roll) {
    const r = S.roll,
      x = P.rm ? 1 : Math.min(1, (NOW - r.t0) / r.dur);
    r.cur = Math.floor(r.from + (r.to - r.from) * x);
    const e = $('d-have-' + r.i);
    if (e) e.textContent = full(r.cur);
    PR.roll5 = { x, v: r.cur };
    if (x >= 1) S.roll = null;
  }
  /* 吐司 */
  const ts = $('d-toast');
  if (ts && S.toast) {
    const x = NOW - S.toast.t0;
    const vis = x < S.toast.dur + 200;
    ts.classList.toggle('hide', !vis);
    if (vis) {
      ts.innerHTML = S.toast.h;
      ts.style.cssText = g.port
        ? px(8, g.st + 48, null, null) + `max-width:${g.W - 16}px`
        : px(g.W / 2 - 160, 76, 320, null);
      ts.style.opacity = x < S.toast.dur ? 1 : 1 - (x - S.toast.dur) / 200;
      if (S.toast.k) ts.dataset.k = S.toast.k;
    }
    PR.toast = vis ? S.toast.txt : '';
  }
  /* 進殿：碎片飛 300 → 淡出 120 → 淡入 160 */
  if (S.fly) {
    const x = (NOW - S.fly.t0) / 300;
    const btn = q('[data-k=hall-yes]');
    for (let i = 0; i < 5; i++) {
      const e = $('d-fly' + i);
      if (!e || !btn) continue;
      const bx = btn.offsetLeft + btn.parentElement.offsetLeft + btn.closest('.dlg').offsetLeft + 20 + i * 30,
        by = btn.offsetTop + btn.closest('.dlg').offsetTop + btn.parentElement.offsetTop + 20;
      const k = ease(x);
      e.style.left = bx + (g.W / 2 - bx) * k + 'px';
      e.style.top = by + (g.H / 2 - by) * k + 'px';
      e.style.opacity = x < 1 ? 1 : 0;
    }
    PR.fly = Math.min(1, x);
    if (x >= 1 && !S.fade) {
      const hi = S.hallI;
      S.fly = null;
      startFade(120, 160, () => {
        S.dlg = null;
        S.panel = null;
        S.scr = 'hall';
        S.hallI = hi;
        log('hall-in');
        build();
      });
    }
  }
  /* 黑幕（--scene-void） */
  let fa = 0;
  if (S.fade) {
    const fd = S.fade,
      x = NOW - fd.t0;
    if (x < fd.out) fa = fd.out ? x / fd.out : 1;
    else {
      if (!fd.mid) {
        fd.mid = 1;
        fd.fn();
        return tick();
      }
      fa = fd.in ? Math.max(0, 1 - (x - fd.out) / fd.in) : 0;
      if (x >= fd.out + fd.in) S.fade = null;
    }
  }
  /* 開場黑片：一般 600 擦掉、減少動態改淡出 */
  let wipe = 0;
  if (S.intro) {
    const t = NOW - S.intro.t0;
    if (t < 600) fa = Math.max(fa, P.rm ? 1 - t / 600 : 1);
    if (!P.rm && t < 600) wipe = t / 600;
    PR.intro = introProbe(g, t);
  }
  const fe = $('d-fade');
  if (fe) {
    fe.style.opacity = fa;
    fe.style.clipPath = wipe ? `inset(0 0 ${wipe * 100}% 0)` : '';
  }
  PR.fade = fa;
  /* 補算一行：3,000＋300 淡出 */
  const gl = $('d-gain');
  if (S.gain) {
    const x = NOW - S.gain.t0;
    const a = x < 0 ? 0 : x < 3000 ? 1 : Math.max(0, 1 - (x - 3000) / 300);
    if (gl) gl.style.opacity = a;
    PR.gain = a;
    if (x > 3300 && gl) gl.style.display = 'none';
  }
  const aw = $('d-away');
  if (aw && S.away) {
    const x = NOW - S.away.t0;
    aw.style.opacity = x < 6000 ? 1 : Math.max(0, 1 - (x - 6000) / 300);
    PR.away = +aw.style.opacity;
  }
  if (S.away && S.away.kind === 'long' && !S.away.done) {
    const x = NOW - S.away.t0;
    PR.off = P.rm || S.away.skip ? 1 : Math.min(1, x / 1200);
    if (x < 1300 && !(P.rm || S.away.skip)) {
      const ui = $('ui');
      const o = ui.querySelector('[data-m=O08]');
      if (o && Math.floor(x / FR) !== S.away.lastF) {
        S.away.lastF = Math.floor(x / FR);
        o.outerHTML = offHTML(g);
      }
    }
  }
  /* 天賦樹 開 200、關 160 */
  const tr = $('d-tree');
  if (tr && S.tree) {
    const x = S.tree.out ? 1 - (NOW - S.tree.out) / 160 : (NOW - S.tree.t0) / 200;
    const a = P.rm ? (S.tree.out ? 0 : 1) : Math.max(0, Math.min(1, x));
    tr.style.opacity = a;
    tr.style.transform = P.rm ? '' : `scale(${0.96 + 0.04 * a})`;
    PR.tree = a;
    if (S.tree.out && (P.rm || x <= 0)) {
      S.tree = null;
      S.gain = { kind: 'tree', t0: NOW };
      log('tree-closed');
      return build();
    }
    drawTree(g);
  }
  /* 文字提示（縮寫完整數字）：滑鼠停留 300 */
  const tp = $('d-tip');
  if (tp) {
    const hv = S.hover && S.hover.nb && NOW - S.hover.t0 >= 300 ? S.hover.el : S.tip;
    if (hv && hv.isConnected) {
      const r = hv.getBoundingClientRect(),
        u = $('ui').getBoundingClientRect(),
        s = u.width / $('ui').offsetWidth;
      tp.textContent = hv.dataset.full;
      tp.classList.remove('hide');
      tp.style.left = Math.min(g.W - tp.offsetWidth - 4, (r.left - u.left) / s) + 'px';
      tp.style.top = ((r.top - u.top) / s - 32 < 0 ? (r.bottom - u.top) / s + 4 : (r.top - u.top) / s - 32) + 'px';
      PR.tip = hv.dataset.full;
    } else tp.classList.add('hide');
  }
  /* 桌機：正在刷卡懸停 300 出地圖詞 */
  if (S.hover && S.hover.k === 'lcur' && NOW - S.hover.t0 >= 300 && !q('#d-modpop') && F().mods) {
    const c = q('[data-m=L02]');
    if (c) {
      const r = c.getBoundingClientRect(),
        u = $('ui').getBoundingClientRect(),
        s = u.width / $('ui').offsetWidth;
      $('ui').insertAdjacentHTML(
        'beforeend',
        `<div class="pop mods" id="d-modpop" data-over style="${px((r.left - u.left) / s - 336, (r.top - u.top) / s, 330, null)}">${F()
          .mods.map(
            m =>
              `<div class="mrow ${m.d === 3 ? 'd3' : ''}">${m.d === 3 ? ICO.warn : ''}<span style="flex:1">${esc(P.en ? m.en : m.name)}</span><span class="dg">${esc(T('危險', 'Risk'))} ${m.d}</span></div>`
          )
          .join('')}</div>`
      );
    }
  }
  drawScene(g, camT);
  PR.unl = unlockOn();
}
function introProbe(g, t) {
  const sub = $('d-sub'),
    snd = $('d-snd');
  const a = t < 600 ? 0 : t < 900 ? (t - 600) / 300 : t < 2800 ? 1 : t < 3100 ? 1 - (t - 2800) / 300 : 0;
  const subA = S.subDone ? 0 : a;
  if (sub) {
    sub.classList.toggle('hide', subA <= 0);
    sub.style.opacity = subA;
  }
  const us = unlockState();
  for (const u of us) {
    const e = $('d-unl' + u.i);
    if (!e) continue;
    e.classList.toggle('hide', !u.vis);
    e.style.opacity = u.a;
    e.style.transform = P.rm ? '' : `translateY(${(1 - Math.min(1, u.a)) * -12}px)`;
  }
  if (snd && t >= 6000 && snd.querySelector('span')) build();
  return {
    t,
    sub: subA,
    snd: snd ? snd.offsetWidth : 0,
    unl: us.map(u => +u.a.toFixed(3))
  };
}
function drawScene(g, cam) {
  const c = $('cv'),
    z = SIZES[P.size];
  if (c.width !== z.w) (c.width = z.w), (c.height = z.h);
  const x = c.getContext('2d'),
    s = z.port ? 1 : z.z;
  const camp = S.scr === 'camp' || S.scr === 'prac';
  const B = camp ? 'scene-tomb' : 'scene-temple';
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = CV[B + '-ground'];
  x.fillRect(0, 0, c.width, c.height);
  x.save();
  x.scale(s, s);
  const cx = g.W / 2 + (g.port ? 0 : cam),
    cy = (g.port ? (g.st + g.idleTop) / 2 + cam : g.H / 2) + 0;
  PR.hero = { x: cx, y: cy };
  /* 地面石塊（中間調、亮部；只在畫面中段，四角留純地面給 PF-L 量） */
  x.fillStyle = CV[B + '-mid'];
  for (let i = 0; i < 14; i++) {
    const a = (i * 2.399) % (Math.PI * 2),
      r = 60 + ((i * 37) % 120);
    x.fillRect(cx + Math.cos(a) * r - 10, cy + Math.sin(a) * r * 0.6 - 4, 20, 8);
  }
  x.fillStyle = CV[B + '-light'];
  for (let i = 0; i < 6; i++) x.fillRect(cx - 90 + i * 34, cy + 70, 8, 4);
  /* 主角、怪物（暫代點；待素材） */
  const bt = S.bt;
  if (S.scr === 'prac') {
    x.fillStyle = CV['border-mid'];
    for (let i = 0; i < 3; i++) x.fillRect(cx - 70 + i * 60, cy - 70, 10, 26);
  } else if (!camp) {
    x.fillStyle = CV.bad;
    for (let i = 0; i < 3; i++) {
      const a = bt / 900 + (i * Math.PI * 2) / 3;
      x.beginPath();
      x.arc(cx + Math.cos(a) * 48, cy + Math.sin(a) * 30, 7, 0, Math.PI * 2);
      x.fill();
    }
  }
  x.fillStyle = CV['border-hi'];
  x.beginPath();
  x.arc(cx, cy, 9, 0, Math.PI * 2);
  x.fill();
  if (S.hits && !paused() && !camp) {
    const ph = ((S.intro ? NOW - S.intro.t0 - F().intro.firstHit : bt) % 700) / 700;
    if (ph >= 0 && ph < 0.25) {
      x.strokeStyle = CV['dmg-hit'];
      x.lineWidth = 2;
      x.beginPath();
      x.arc(cx + 30, cy - 10, 6 + ph * 40, 0, Math.PI * 2);
      x.stroke();
    }
  }
  x.restore();
}
function drawTree(g) {
  const c = $('d-tcv');
  if (!c) return;
  const x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  x.strokeStyle = CV.border;
  x.fillStyle = CV['border-mid'];
  for (let i = 0; i < 40; i++) {
    const a = i * 0.9,
      r = 40 + i * 7;
    const px1 = g.W / 2 + Math.cos(a) * r,
      py1 = g.H / 2 + Math.sin(a) * r * 0.8;
    x.beginPath();
    x.moveTo(g.W / 2, g.H / 2);
    x.lineTo(px1, py1);
    x.stroke();
    x.beginPath();
    x.arc(px1, py1, 5, 0, Math.PI * 2);
    x.fill();
  }
}

/* ---------- 動作 ---------- */
function openPanel(p, opt = {}) {
  if (S.panel && S.panel !== p) S.pClose = null;
  S.panel = p;
  S.pClose = null;
  S.pOpenT = opt.instant ? NOW - 1000 : NOW;
  S.locView = 'list';
  S.logItem = 0;
  S.locScroll = p === 'loc' ? 1 : 0;
  log('open', { p });
  build();
}
function closePanel() {
  if (!S.panel && S.scr !== 'camp') return;
  if (S.pClose) return;
  S.pClose = { t0: NOW };
  log('close', { p: S.panel });
}
function closeDone() {
  log('closed', { p: S.panel });
  S.panel = null;
  S.pClose = null;
  if (S.scr === 'camp') S.scr = 'field';
  build();
}
function startFade(out, inn, fn) {
  if (P.rm) (out = 0), (inn = 0);
  S.fade = { t0: NOW, out, in: inn, fn };
  log('fade', { out, in: inn });
}
function toast(txt, h, dur = 2000, k) {
  S.toast = { txt, h: h || esc(txt), t0: NOW, dur, k };
  log('toast', { txt });
}
function holdDone(k) {
  log('hold-done', { k });
  S.hold = null;
  if (k === 'logout') {
    toast(T('已登出（展示）', 'Signed out (demo)'));
    build();
  }
  if (k === 'hall') {
    /* 減少動態：碎片不飛、不淡出淡入，直接進殿 */
    if (P.rm) return (S.dlg = null), (S.panel = null), (S.scr = 'hall'), log('hall-in'), build();
    S.fly = { t0: NOW };
    build();
  }
}
function act(k, el) {
  log('act', { k });
  const f = F();
  if (k === 'px') return closePanel();
  if (k === 'cur') return openPanel('cur');
  if (k.startsWith('tab-')) {
    const t = k.slice(4);
    if (t === 'more') return S.panel === 'more' ? closePanel() : openPanel('more');
    if (t === 'camp') return (S.seen.camp = 1), (S.scr = 'camp'), (S.campCard = null), (S.pOpenT = NOW), build();
    if (t === 'forge') return openPanel('forge');
    if (t === 'tree') return openTree();
    return toast(T('這頁屬 D1／D2', 'Covered by D1/D2'));
  }
  if (k === 'mods') return (S.locView = 'mods'), build();
  if (k === 'loc-list') return (S.locView = 'list'), build();
  if (k === 'retry') return (S.bounced = 0), build();
  if (k === 'next')
    return (S.panel = null), (S.scr = 'camp'), (S.campCard = '瞭望台'), (S.pOpenT = NOW), log('to-camp-card'), build();
  if (k.startsWith('star-')) {
    const n = +k.slice(5),
      cur = S.starPend || f.star;
    if (n === cur) return;
    S.rngOld = T(`${f.starMods[cur - 1]} 條地圖詞`, `${f.starMods[cur - 1]} map mods`);
    S.rngT = NOW;
    S.starPend = n === f.star ? 0 : n;
    log('star', { n });
    return build();
  }
  if (k.startsWith('lock-')) return (S.shake = { t0: NOW }), log('shake');
  if (k.startsWith('go-')) {
    const i = +k.slice(3);
    log('go', { i });
    closePanel();
    startFade(150, 150, () => {
      f.at = i;
      S.bounced = 0;
      log('loc-switched', { i });
      build();
    });
    return;
  }
  if (k.startsWith('mc-')) {
    const c = k.slice(3);
    S.seen[c] = 1;
    if (c === 'set') return openPanel('set');
    if (c === 'log') return openPanel('log');
    if (c === 'guild') return openPanel('guild');
    if (c === 'box') return openPanel('box');
    if (c === 'prac') return (S.dlg = 'prac'), build();
    return build(), toast(T('這頁屬 D1／D2', 'Covered by D1/D2'));
  }
  if (k === 'tocamp') return (S.dlg = 'camp'), build();
  if (k === 'dlg-no' || k === 'dlg-scrim' || k === 'hall-no') return (S.dlg = null), (S.hold = null), build();
  if (k === 'camp-yes') return (S.dlg = null), (S.panel = null), (S.scr = 'camp'), (S.pOpenT = NOW), build();
  if (k === 'prac-yes') {
    S.dlg = null;
    log('prac-go');
    return startFade(120, 160, () => {
      S.panel = null;
      S.scr = 'prac';
      S.pracHit = 0;
      log('prac-in');
      build();
    });
  }
  if (k === 'pr-leave') return leavePrac();
  if (k === 'pr-reset') return (S.pracHit = 0), build();
  if (k === 'lv-up' || k === 'lv-dn') {
    const p = f.prac,
      lv = S.pracLv || p.lv;
    S.pracLv = Math.max(p.lvMin, Math.min(p.lvMax, lv + (k === 'lv-up' ? 1 : -1)));
    return build();
  }
  if (k.startsWith('sec-')) return (S.sec = k.slice(4)), build();
  if (k.startsWith('alert-')) return (S.alert = k.slice(6)), build();
  if (k.startsWith('fs-')) {
    const v = +k.slice(3);
    if (v === S.fsSet) return;
    if (P.rm) return (S.fsSet = v), log('fs-apply', { v }), build();
    S.fsx = { t0: NOW, from: S.fsSet, to: v };
    log('fs', { v });
    return build();
  }
  if (k.startsWith('rms-')) {
    S.rmSet = k.slice(4);
    P.rm = S.rmSet === 'on' || (S.rmSet === 'sys' && P.rm0);
    log('rm', { v: S.rmSet });
    return build();
  }
  if (k.startsWith('shk-')) return (S.shk = +k.slice(4)), build();
  if (k.startsWith('vib-'))
    return (S.vib = +k.slice(4)), S.vib && toast(T('震 20 ms（示範）', 'Buzz 20 ms (sample)')), build();
  if (k === 'logout-no') return (S.hold = null), build();
  if (k.startsWith('lf-')) return (S.logF = k.slice(3)), build();
  if (k.startsWith('lr-')) {
    const e = f.log.find(x => x.id === +k.slice(3));
    if (e && e.cat === 'gear') return (S.logItem = 1), build();
    return;
  }
  if (k === 'item-back') return (S.logItem = 0), build();
  if (k.startsWith('feed-')) return openLogPick(+k.slice(5));
  if (k.startsWith('gt-')) return (S.gTab = k.slice(3)), (S.gSel = -1), build();
  if (k.startsWith('g1-') || k.startsWith('ga-')) {
    const i = +k.slice(3),
      r = f.guild.rows[S.gTab][i],
      all = k.startsWith('ga-');
    S.gHave = S.gHave || {};
    const have = S.gHave[S.gTab + i] != null ? S.gHave[S.gTab + i] : r.have;
    const n = all ? Math.floor(have / r.k) : 1;
    S.gHave[S.gTab + i] = have - n * r.k;
    S.roll = { k: S.gTab + i, i, from: have, to: have - n * r.k, cur: have, t0: NOW, dur: all ? 300 : 200 };
    toast(`${T(r.to, r.toEn)} +${n}`);
    log('trade', { n });
    return build();
  }
  if (k === 'to-guild')
    return (S.panel = 'guild'), (S.gTab = '鐵'), (S.gSel = 1), (S.pOpenT = NOW - 1000), log('guild-pick'), build();
  if (k.startsWith('bt-')) return (S.bTab = k.slice(3)), build();
  if (k.startsWith('hall-') && !k.startsWith('hall-off')) return (S.hallI = +k.slice(5)), (S.dlg = 'hall'), build();
  if (k.startsWith('dm-')) return (S.pick[k.replace('-', '')] = !S.pick[k.replace('-', '')]), build();
  if (k === 'sub') return (S.subDone = 1), log('sub-dismiss');
  if (k === 'snd') return log('sound-on'), toast(T('聲音開了', 'Sound on'));
  if (k.startsWith('unl-')) {
    const i = +k.slice(4);
    S.unlockDone[i] = NOW;
    log('unl-click', { i });
    if (i === 2) return openTree();
    if (i === 0) return (S.scr = 'camp'), (S.pOpenT = NOW), build();
    return openPanel('forge');
  }
  if (k === 'off-skip') {
    if (S.away && !S.away.skip) (S.away.skip = 1), log('off-skip'), build();
    return;
  }
  if (k === 'off-ok') return (S.away.done = 1), log('off-ok'), build();
  if (k === 'tree-back') return closeTree();
  if (k === 'camp-list') return (S.campCard = null), build();
  if (k.startsWith('cf-')) return (S.campCard = k.slice(3)), build();
  if (k === 'camp-x') return closePanel();
  if (k === 'camp-out')
    return (S.scr = 'field'), (S.gain = { kind: 'both', t0: NOW + 160 }), startFade(0, 160, () => build()), build();
}
function openLogPick(id) {
  S.panel = 'log';
  S.pOpenT = NOW;
  S.pClose = null;
  S.logF = 'all';
  S.logItem = 0;
  S.logPick = id;
  S.pickT = NOW;
  log('log-pick', { id });
  build();
  const e = q('.grow2.pick');
  if (e) e.scrollIntoView({ block: 'center' });
}
function leavePrac() {
  log('prac-leave');
  startFade(120, 160, () => {
    S.scr = 'field';
    S.gain = { kind: 'prac', t0: NOW + (P.rm ? 0 : 160) };
    log('prac-out');
    build();
  });
}
function openTree() {
  S.tree = { t0: NOW };
  log('tree-open', { bt: S.bt });
  build();
}
function closeTree() {
  if (!S.tree || S.tree.out) return;
  S.tree.out = NOW;
  log('tree-close', { bt: S.bt });
}

/* ---------- 輸入 ---------- */
function bindUI() {
  const ui = $('ui');
  ui.addEventListener('click', e => {
    const nb = e.target.closest('.nb');
    if (nb) {
      S.tip = S.tip === nb ? null : nb;
      log('tip', { full: nb.dataset.full });
      e.stopPropagation();
      return; /* 點縮寫數字只看完整，不觸發外層按鈕 */
    }
    const el = e.target.closest('[data-k]');
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    if (el.dataset.hold) return;
    act(el.dataset.k, el);
  });
  ui.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-hold]');
    if (!el) return;
    S.hold = { k: el.dataset.hold, t0: NOW };
    log('hold-start', { k: S.hold.k });
  });
  const up = () => {
    if (S.hold && !S.hold.rel) {
      S.hold.rel = 1;
      S.hold.relT = NOW;
      S.hold.relFrom = Math.min(1, (NOW - S.hold.t0) / 600);
      log('hold-release', { at: S.hold.relFrom });
    }
  };
  ui.addEventListener('pointerup', up);
  ui.addEventListener('pointerleave', up);
  ui.addEventListener('mouseover', e => {
    const nb = e.target.closest('.nb'),
      lc = e.target.closest('[data-k=lcur]');
    if (nb) S.hover = { nb: 1, el: nb, t0: NOW };
    else if (lc && !SIZES[P.size].port) S.hover = S.hover && S.hover.k === 'lcur' ? S.hover : { k: 'lcur', t0: NOW };
    else {
      S.hover = null;
      const mp = $('d-modpop');
      if (mp) mp.remove();
    }
  });
  ui.addEventListener('input', e => {
    const k = e.target.dataset.k;
    if (k === 'sfx' || k === 'mus')
      (S[k] = +e.target.value), (e.target.nextElementSibling.textContent = e.target.value + '%');
  });
  addEventListener('keydown', key);
  addEventListener('keyup', e => {
    if (e.key === 'Enter' && S.hold) up();
  });
  addEventListener('pointerdown', () => ((S.kbd = 0), qa('.fv').forEach(e => e.classList.remove('fv'))), true);
}
function key(e) {
  if (e.target.closest && e.target.closest('#ctl')) return;
  const k = e.key;
  S.kbd = 1;
  const ae = document.activeElement;
  if (ae && ae.classList && ae.classList.contains('kf')) ae.classList.add('fv');
  /* Enter 按住：長按鈕 */
  if (k === 'Enter') {
    if (S.dlg === 'hall') {
      if (ae && ae.dataset.k === 'hall-no') return act('hall-no');
      if (!e.repeat) (S.hold = { k: 'hall', t0: NOW }), log('hold-start', { k: 'hall' });
      return e.preventDefault();
    }
    if (ae && ae.dataset.hold) {
      if (!e.repeat) (S.hold = { k: ae.dataset.hold, t0: NOW }), log('hold-start', { k: ae.dataset.hold });
      return e.preventDefault();
    }
    if (S.dlg === 'camp' && !(ae && ae.dataset.k === 'dlg-no')) return act('camp-yes');
    if (S.dlg === 'prac' && !(ae && ae.dataset.k === 'dlg-no')) return act('prac-yes');
    if (S.away && S.away.kind === 'long' && !S.away.done) return act('off-ok');
    if (S.panel === 'guild' && S.gSel >= 0) return act('ga-' + S.gSel);
    return;
  }
  if (k === 'Escape') {
    if (S.tree) return closeTree();
    if (S.dlg) return act('dlg-no');
    if (S.panel || S.scr === 'camp') return closePanel();
    return openPanel('set');
  }
  /* Tab：面板內換分頁 */
  if (k === 'Tab' && S.panel) {
    const seg = q('#d-pnl .seg');
    if (seg) {
      e.preventDefault();
      const bs = [...seg.querySelectorAll('button')],
        i = bs.findIndex(b => b.getAttribute('aria-pressed') === 'true');
      const n = bs[(i + (e.shiftKey ? -1 : 1) + bs.length) % bs.length];
      act(n.dataset.k);
      const nn = q(`[data-k="${CSS.escape(n.dataset.k)}"]`);
      if (nn) nn.focus(), nn.classList.add('fv');
      return;
    }
  }
  /* 方向鍵：面板內走 */
  if ((k === 'ArrowDown' || k === 'ArrowUp') && S.panel) {
    const pn = $('d-pnl');
    if (!pn) return;
    const L = [...pn.querySelectorAll('.bd .kf:not([disabled])')];
    if (!L.length) return;
    e.preventDefault();
    const i = L.indexOf(ae);
    const n = L[i < 0 ? 0 : Math.max(0, Math.min(L.length - 1, i + (k === 'ArrowDown' ? 1 : -1)))];
    n.focus();
    n.classList.add('fv');
    qa('.fv').forEach(x => x !== n && x.classList.remove('fv'));
    return;
  }
  if ((k === 'ArrowLeft' || k === 'ArrowRight') && ae && ae.type === 'range') return;
  if (e.shiftKey && /^Digit[1-5]$/.test(e.code) && S.panel === 'loc') return act('star-' + e.code.slice(5));
  const lk = k.toLowerCase();
  if (lk === 'm') return S.panel === 'loc' ? closePanel() : openPanel('loc');
  if (lk === 'z') return S.panel === 'more' ? closePanel() : openPanel('more');
  if (lk === 'l') return S.panel === 'log' ? closePanel() : openPanel('log');
  if (lk === 'j') return S.panel === 'box' ? closePanel() : openPanel('box');
  if (lk === 'k') return S.panel === 'forge' ? closePanel() : openPanel('forge');
  if (lk === 'p') return S.tree ? closeTree() : openTree();
  if (lk === 'h') return act('tab-camp');
  if (lk === 't') return S.scr === 'prac' ? leavePrac() : ((S.dlg = 'prac'), build());
}

/* ---------- 時鐘 ---------- */
function step(n = 1) {
  for (let i = 0; i < n; i++) {
    NOW += FR;
    runScn();
    tick();
  }
  return PR;
}
let rafT = null;
function loop(ts) {
  if (rafT != null) {
    NOW += Math.min(100, ts - rafT);
    runScn();
    tick();
  }
  rafT = ts;
  requestAnimationFrame(loop);
}

/* ---------- 動態腳本 V1–V10（時間點相對腳本開始） ---------- */
let SCN = null;
const pt = sel => {
  const e = q(sel);
  if (!e) throw new Error('找不到 ' + sel);
  return e;
};
const press = sel => act(pt(sel).dataset.k);
const SC = {
  V1: () => [
    [300, () => press('[data-k=star-2]')],
    [900, () => press('[data-k=star-4]')],
    [1500, () => (pt('#d-lock').scrollIntoView({ block: 'center' }), press('#d-lock'))],
    [
      2100,
      () => (
        pt('[data-k^=go-]:not([disabled])').scrollIntoView({ block: 'center' }), press('[data-k^=go-]:not([disabled])')
      )
    ],
    [3200, () => 0]
  ],
  V2: () => [
    [500, () => act('px')],
    [900, () => openPanel('more')],
    [1500, () => act('px')],
    [1900, () => openPanel('log')],
    [2500, () => act('px')],
    [3000, () => 0]
  ],
  V3: () => [
    [300, () => press('[data-k=fs-130]')],
    [1000, () => press('[data-k=fs-100]')],
    [1600, () => press('[data-k=rms-on]')],
    [2000, () => press('[data-k=rms-sys]')],
    [2300, () => ((S.sec = 'acct'), build())],
    [2600, () => ((S.hold = { k: 'logout', t0: NOW }), log('hold-start', { k: 'logout' }))],
    [2900, () => ((S.hold.rel = 1), (S.hold.relT = NOW), (S.hold.relFrom = 300 / 600), log('hold-release'))],
    [3400, () => ((S.hold = { k: 'logout', t0: NOW }), log('hold-start', { k: 'logout' }))],
    [4400, () => 0]
  ],
  V4: () => [
    [400, () => press('#ui .feed .fr')],
    [3000, () => 0]
  ],
  V5: () => [
    [300, () => press('[data-k=g1-1]')],
    [1000, () => press('[data-k=ga-1]')],
    [2400, () => 0]
  ],
  V6: () => [
    [300, () => ((S.hold = { k: 'hall', t0: NOW }), log('hold-start', { k: 'hall' }))],
    [600, () => ((S.hold.rel = 1), (S.hold.relT = NOW), (S.hold.relFrom = 300 / 600), log('hold-release'))],
    [1000, () => ((S.hold = { k: 'hall', t0: NOW }), log('hold-start', { k: 'hall' }))],
    [2600, () => 0]
  ],
  V7: () => [
    [300, () => press('[data-k=prac-yes]')],
    [1200, () => press('[data-k=pr-leave]')],
    [5200, () => 0]
  ],
  V8: () => [[60500, () => 0]],
  V9: () => [
    [0, () => ((S.away = { kind: 'short', t0: NOW }), log('reopen', { kind: 'short' }), build())],
    [1500, () => ((S.away = { kind: 'mid', t0: NOW }), log('reopen', { kind: 'mid' }), build())],
    [8500, () => ((S.away = { kind: 'long', t0: NOW }), log('reopen', { kind: 'long' }), build())],
    [10200, () => act('off-ok')],
    [10600, () => ((S.away = { kind: 'long', t0: NOW }), log('reopen', { kind: 'long2' }), build())],
    [10900, () => act('off-skip')],
    [11500, () => 0]
  ],
  V10: () => [
    [500, () => (pt('[data-k=unl-2]'), act('unl-2'))],
    [1400, () => act('tree-back')],
    [5200, () => 0]
  ]
};
/* 每支腳本的起始列（V8 從新存檔 0 秒開始；V10 從天賦樹解鎖卡那一刻） */
const SC0 = {
  V1: 'L01',
  V2: 'L01',
  V3: 'T03',
  V4: 'X02',
  V5: 'B01',
  V6: 'B06',
  V7: 'P01',
  V8: 'O01',
  V9: 'X02',
  V10: 'O01'
};
function startScn(v) {
  P.row = SC0[v];
  applyRow();
  if (v === 'V6') (S.dlg = 'hall'), (S.hallI = 4);
  if (v === 'V8') (S.intro = { t0: NOW }), (S.hits = 0);
  if (v === 'V10')
    (S.intro = { t0: NOW - 24000 + 300 }), (S.unlockDone[0] = NOW - 15000), (S.unlockDone[1] = NOW - 3000);
  if (v === 'V1' || v === 'V2') S.pOpenT = NOW - 1000;
  build();
  SCN = { v, t0: NOW, ev: SC[v](), i: 0 };
  LOG.length = 0;
  log('scn-start', { v });
}
function runScn() {
  if (!SCN) return;
  const t = NOW - SCN.t0;
  while (SCN && SCN.i < SCN.ev.length && t >= SCN.ev[SCN.i][0]) {
    const fn = SCN.ev[SCN.i++][1];
    fn();
    if (SCN.i >= SCN.ev.length) log('scn-end'), (SCN.done = 1);
  }
}

/* ---------- 列切換 ---------- */
function applyRow() {
  const r = ROWS.find(x => x.id === P.row) || ROWS[0];
  P.save = FIRST && Q.get('save') ? Q.get('save') : r.save;
  FIRST = 0;
  fresh();
  r.set(S);
  if (S.panel) S.pOpenT = NOW - 1000;
  if (S.intro) S.intro.t0 = NOW + S.intro.t0;
  if (S.away) S.away.t0 = NOW + S.away.t0;
  if (S.gain) S.gain.t0 = NOW + S.gain.t0;
  if (S.tree) S.tree.t0 = NOW + S.tree.t0;
  if (S.pickT === 0) S.pickT = NOW - 300;
  /* 開場列：照時間線補到該時刻的戰鬥 */
  if (S.intro) {
    const t = NOW - S.intro.t0;
    const fh = F().intro.firstHit;
    S.hits = t >= fh ? 1 + Math.floor((t - fh) / 700) : 0;
    if (t >= F().intro.beats[2][0]) S.campHint = 1;
  }
  build();
  syncCtl();
}

/* ---------- 控制列 ---------- */
function syncCtl() {
  if (!$('c-size').options.length) {
    for (const k in SIZES) $('c-size').add(new Option(k + (SIZES[k].note ? '（' + SIZES[k].note + '）' : ''), k));
    for (const k of FIX.ORDER) $('c-save').add(new Option(FIX.NAMES[k], k));
    for (const r of ROWS) $('c-row').add(new Option(`${r.id} ${r.sec}・${r.name}`, r.id));
    for (const v of Object.keys(SC)) $('c-scn').add(new Option(v, v));
  }
  $('c-size').value = P.size;
  $('c-save').value = P.save;
  $('c-row').value = P.row;
  $('c-fs').checked = P.fs;
  $('c-en').checked = P.en;
  $('c-rm').checked = P.rm;
  const r = ROWS.find(x => x.id === P.row);
  $('c-note').innerHTML = `<b>${esc(FIX.PH)}</b>・${esc(r.id + ' ' + r.name)}・${esc(FIX.NAMES[P.save])}`;
}
function bindCtl() {
  $('c-size').onchange = e => ((P.size = e.target.value), build());
  $('c-save').onchange = e => ((P.save = e.target.value), fresh(), ROWS.find(x => x.id === P.row).set(S), build());
  $('c-row').onchange = e => ((P.row = e.target.value), applyRow());
  $('c-prev').onclick = () => (
    (P.row = ROWS[(ROWS.findIndex(x => x.id === P.row) + ROWS.length - 1) % ROWS.length].id), applyRow()
  );
  $('c-next').onclick = () => ((P.row = ROWS[(ROWS.findIndex(x => x.id === P.row) + 1) % ROWS.length].id), applyRow());
  $('c-fs').onchange = e => ((P.fs = e.target.checked), build());
  $('c-en').onchange = e => ((P.en = e.target.checked), build());
  $('c-rm').onchange = e => ((P.rm = e.target.checked), build());
  $('c-play').onclick = () => startScn($('c-scn').value);
}

/* ---------- 開始 ---------- */
if (Q.has('bare')) document.body.classList.add('bare');
tok();
fresh();
bindUI();
bindCtl();
applyRow();
if (P.scn) startScn(P.scn);
if (!CAP) requestAnimationFrame(loop);
window.demo = {
  get S() {
    return S;
  },
  get NOW() {
    return NOW;
  },
  P,
  ROWS,
  KEYS,
  LOG,
  step,
  build,
  act,
  geo,
  applyRow,
  startScn,
  probe: () => PR,
  scn: () => SCN,
  setRow: (row, o = {}) => {
    Object.assign(P, { fs: false, en: false, rm: false }, o);
    P.rm0 = P.rm;
    P.row = row;
    if (o.save) {
      applyRow();
      P.save = o.save;
      fresh();
      ROWS.find(x => x.id === row).set(S);
      if (S.panel) S.pOpenT = NOW - 1000;
      build();
    } else applyRow();
  },
  ok: () => (ROWS.find(x => x.id === P.row).ok() ? 1 : 0),
  abbr,
  full,
  tok: () => CV
};
