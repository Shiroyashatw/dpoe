/* dpoe D2 展示頁（docs/production/specs/D2-checklist.md）：刷到 → 換裝 → 變強。
   只讀 fixtures.js（假資料，D2-fakedata.md）、js/art.js（圖集）、js/items.js（INV_CAP／INV_SPARE），不跑遊戲邏輯。
   顏色只用 tokens.css 的 var(--x)；canvas 用 tok() 從 :root 讀值。數字只走 num.js。
   時間全用虛擬時鐘 NOW（毫秒）：平常跟著畫格走；?cap=1 時停住，由 tools/d2_demo.js 用 demo.step() 一格一格推。
   網址參數：size、save、row、fs、en、rm、scn（錄影腳本）、bare（只留畫面框）、cap、invcap（PF-D2-4） */
'use strict';
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const CAP = Q.has('cap');
const { abbr, full, can } = NUM;
let NOW = 0,
  FT = 0; /* FT：假戰場的時間，天賦樹與營地時停住 */
const LOG = [];
const log = (ev, x) => LOG.push(Object.assign({ t: Math.round(NOW * 100) / 100, ev }, x || {}));

/* ---------- 尺寸 ---------- */
const SIZES = {
  '390x844': { w: 390, h: 844, port: 1, st: 47, sb: 34 },
  '390x664': { w: 390, h: 664, port: 1, st: 0, sb: 0, note: '瀏覽器分頁' },
  '1280x720': { w: 1280, h: 720, port: 0, z: 1 },
  '1280x800': { w: 1280, h: 800, port: 0, z: 1.25, note: 'Deck ×1.25' }
};
const SAVES = ['new', 'mid', 'near', 'full', 'big', 'en'];
let INV_CAP = 0,
  INV_SPARE = 0;
const P = {
  size: Q.get('size') || '390x844',
  save: Q.get('save') || 'mid',
  row: Q.get('row') || 'E01',
  fs: Q.get('fs') === '1',
  en: Q.get('en') === '1',
  rm: Q.get('rm') === '1'
};
const SV = () => FX.S[P.save];
const isPort = () => !!SIZES[P.size].port;

function geo() {
  const z = SIZES[P.size],
    W = z.port ? z.w : z.w / z.z,
    H = z.port ? z.h : z.h / z.z;
  const g = { W, H, port: z.port, st: z.st || 0, sb: z.sb || 0 };
  if (z.port) {
    const short = H < 700;
    g.navH = short ? 44 : 56;
    g.navTop = H - g.sb - g.navH;
    g.dTop = S.full ? 103 : 330; /* SK10 全版：戰場縮成 47–103 */
    g.dBot = short ? g.navTop : g.navTop - 44;
    g.idleTop = short ? g.dTop - 44 : g.navTop - 44; /* 664 高：掛機條移到抽屜上緣 */
    g.fieldTop = g.st;
    g.fieldBot = S.panel && S.panel !== 'tree' && S.dOpen ? (short ? g.idleTop : g.dTop) : g.idleTop;
    g.hudBot = S.panel && S.panel !== 'tree' ? (short ? g.idleTop : g.dTop) : g.idleTop;
  } else {
    g.L = [16, 76, 492, H - 68]; /* 左欄 x0 y0 x1 y1 */
    g.R = [
      W - 16 - (W >= 1200 ? 420 : 380),
      64,
      W - 16,
      H - 120
    ]; /* 右欄（1280×800 ×1.25 的 1024 寬時縮成 380，留戰場給掉落） */
    g.idle = [16, H - 56, 396, H - 16];
    g.fieldTop = 0;
    g.fieldBot = H;
  }
  return g;
}

/* ---------- 狀態 ---------- */
let S;
function fresh() {
  S = {
    panel: null /* char | forge | skill | tree | chase */,
    sub: null /* stats | detail | rules | pick | apply | stele */,
    dOpen: 1,
    dT: -1e9 /* 抽屜開始滑入 */,
    dCT: -1e9 /* 抽屜開始滑出 */,
    pushT: -1e9,
    full: 0,
    sel: null /* 身上第幾格 */,
    pick: null /* 倉庫第幾件 */,
    selT: -1e9,
    eqT: -1e9,
    upT: -1e9,
    upKind: 0,
    batch: 0 /* 批次分解勾選中 */,
    salT: -1e9,
    salN: 0,
    salOne: -1e9,
    filter: 'all',
    seg: 'craft',
    part: 0,
    tier: null,
    count: null,
    lack: 0,
    nospace: 0,
    flipT: -1e9,
    flipAll: 0,
    flipped: 0,
    anvil: 1,
    dlg: null,
    hold: null,
    shakeT: -1e9,
    shakeK: null,
    lastDeny: -1e9,
    toast: null,
    toastT: -1e9,
    banner: 0,
    bannerT: -1e9,
    feed: [],
    pity: null,
    applyT: -1e9,
    rerollT: -1e9,
    treeT: -1e9,
    treeCT: -1e9,
    gainT: -1e9,
    gain: null,
    lightT: -1e9,
    goalPin: 0,
    treeSel: null,
    treeQ: '',
    searchOn: 0,
    resetT: -1e9,
    picked: 0,
    dragT: -1e9,
    drag: null,
    camp: 0,
    goal100T: -1e9,
    camOff: 0,
    focusK: null,
    gone: new Set(),
    chk: null,
    emptyEq: null,
    dps: null,
    fT: { hp: -1e9, mp: -1e9 } /* 藥劑：上次喝的時間（冷卻 3 秒） */,
    flashK: null,
    flashT: -1e9,
    shakeD: 120,
    lowhp: 0,
    stashEmpty: 0,
    fill3: 0,
    asm: null /* 假定的狀態：'leg' 中期塞一件傳奇、'frac' 一批裡塞 ★ 破裂 */,
    showCur: 0,
    mobOv: null
  };
}
fresh();

/* ---------- 文字：中文原字；英文 +40% 先查 FX.EN，沒有的用假字（每個漢字換 2–3 個字母） ---------- */
const SYL = ['ka', 'ren', 'tos', 'mi', 'vel', 'du', 'shan', 'or', 'lim', 'ze'];
function T(s, vars) {
  let r = s;
  if (P.en) {
    if (FX.EN[s]) r = FX.EN[s];
    else if (/[㐀-鿿]/.test(s)) {
      let i = 0;
      r = s.replace(/[㐀-鿿]+/g, w => {
        const o = Array.from(w, c => SYL[(c.charCodeAt(0) + i++) % SYL.length]).join('');
        return o.charAt(0).toUpperCase() + o.slice(1);
      });
    }
  }
  if (vars) for (const k in vars) r = r.split('{' + k + '}').join(vars[k]);
  return r;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const t = (s, v) => {
  let r = esc(T(s));
  if (v) for (const k in v) r = r.split('{' + k + '}').join(String(v[k]));
  return r;
};

/* ---------- token（canvas 也只用這些） ---------- */
const TOK = {};
function tok(k) {
  if (!(k in TOK))
    TOK[k] = getComputedStyle(document.documentElement)
      .getPropertyValue('--' + k)
      .trim();
  return TOK[k];
}
const rgbA = (k, a) => `rgb(${tok(k)} / ${a})`; /* 給 -rgb 三元組用 */

/* ---------- 圖示：只用現有圖集，1×／2× 整數倍 ---------- */
function art(k, scale = 1, cls = '') {
  const r = typeof ART !== 'undefined' && ART[k];
  if (!r)
    return `<i class="art ph ${cls}" style="width:${32 * scale}px;height:${32 * scale}px" title="暫用：沒有圖">?</i>`;
  const url = '../../' + ART_SHEET[r[0]];
  return `<i class="art ${cls}" data-art="${k}" data-sc="${scale}" style="width:${r[3]}px;height:${r[4]}px;background-image:url('${url}');background-position:-${r[1]}px -${r[2]}px;${scale !== 1 ? `zoom:${scale}` : ''}"></i>`;
}
/* 王印 16 圖示（掛機條、印詞行、掉落記號）：沿用現有圖示，1×，標「暫用」 */
const WY = { 鎮嶽印: 'wangyin_zhenyue', 赤霄印: 'wangyin_chixiao', 疾霆印: 'wangyin_jiting', 歸墟印: 'wangyin_guixu' };
const wy16 = (k, sc = 1) =>
  `<span class="wy" title="暫用：現有王印圖示">${art((WY[k] || 'wangyin_guixu') + '_16', sc)}</span>`;
const IMGS = {};
function img(k) {
  if (IMGS[k]) return IMGS[k];
  const r = ART[k],
    im = new Image();
  im.src = '../../' + ART_SHEET[r[0]];
  return (IMGS[k] = { im, r });
}
const HERO = new Image();
HERO.src = '../../img/hero.png';

/* ---------- 稀有度記號（◆ 稀有、◈ 傳奇、追逐＝王印 16；★ 只給星級與破裂） ---------- */
const RAR = { normal: '普通', magic: '魔法', rare: '稀有', leg: '傳奇' };
const mk = it =>
  it.chase
    ? wy16(it.seal ? it.seal.k : '歸墟印')
    : it.rar === 'rare'
      ? '<span class="mk">◆</span>'
      : it.rar === 'leg'
        ? '<span class="mk">◈</span>'
        : '';
const rc = it => (it.chase ? 'r-chase' : 'r-' + it.rar);
const upMk = n => (n === 2 ? '<b class="up up2">▲▲</b>' : n === 1 ? '<b class="up">▲</b>' : '');

/* ---------- 倉庫清單（fakedata §2）：特別件在前，其餘照每部位件數輪流產生；
   稀有度：先 pre[0] 件普通、pre[1] 件魔法（＝批次分解預選），其餘稀有；▲／▲▲／鎖照存檔的件數補在稀有件上 ---------- */
const asm = (on = 1) => (on ? `<span class="badge asm" title="fakedata 推不出來">${t('假定')}</span>` : '');
let INV_MEMO = null;
function invList() {
  const sv = SV(),
    v = sv.inv,
    n = invN0();
  const key = sv.k + '|' + n;
  if (!INV_MEMO || INV_MEMO.key !== key) {
    const hd = FX.head(sv.base)
      .concat(v.spare ? FX.spareHead(sv.base) : [])
      .slice(0, n);
    const left = v.slots.slice(),
      cnt = { up: v.up, up2: v.up2, lock: v.lock };
    hd.forEach(x => {
      left[x.slot]--;
      if (x.up === 1) cnt.up--;
      if (x.up === 2) cnt.up2--;
      if (x.lock) cnt.lock--;
    });
    const out = hd.map((x, i) => Object.assign({ _i: i }, x));
    let s = 0,
      g = 0;
    while (out.length < n) {
      /* 每部位輪流；件數用完的部位跳過（件數比分布多時照輪） */
      let k = 0;
      while (left[s % 9] <= 0 && k++ < 9) s++;
      const sl = s % 9;
      left[sl]--;
      s++;
      const rar = g < v.pre[0] ? 'normal' : g < v.pre[0] + v.pre[1] ? 'magic' : 'rare';
      const it = {
        _i: out.length,
        n: sv.base[sl],
        slot: sl,
        rar,
        ic: FX.IC[sl === 8 ? 8 : sl].replace(/_\d+$/, '_' + (g % 4))
      };
      if (rar === 'rare') {
        if (cnt.up2 > 0) (it.up = 2), cnt.up2--;
        else if (cnt.up > 0) (it.up = 1), cnt.up--;
        else if (cnt.lock > 0) (it.lock = 1), cnt.lock--;
      }
      out.push(it);
      g++;
    }
    INV_MEMO = { key, out };
  }
  const out = INV_MEMO.out;
  return S.gone.size ? out.filter(x => !S.gone.has(x._i)) : out;
}
const byI = i => invList().find(x => x._i === i);
/* 件數：存檔照 fakedata；空格不夠（F03）＝INV_CAP − 3（fakedata §8 n＝3）；E07 倉庫空用假定 */
const invN0 = () => (S.stashEmpty ? 0 : S.fill3 ? INV_CAP - 3 : SV().inv.n);
const invN = () => invN0() - S.gone.size;
const invFree = () => INV_CAP - invN();
/* H3 a 預選：沒 ▲、沒鎖、普通＋魔法、沒 ★／◈／王印 */
const preSel = it =>
  !it.up && !it.lock && (it.rar === 'normal' || it.rar === 'magic') && !it.frac && !it.chase && !it.mem;
const protectedIt = it => it.frac || it.rar === 'leg' || it.seal || it.chase || it.mem;

/* ---------- 縮寫數字：點一下或滑鼠停留看完整數字 ---------- */
const nA = (v, mode = 'own') =>
  `<span class="nab num" data-full="${full(v, mode)}" title="${full(v, mode)}">${abbr(v, mode)}</span>`;
const nF = (v, mode = 'own') => `<span class="num">${full(v, mode)}</span>`;

/* ---------- 假戰場（canvas）：主視覺戰場底圖待素材，先用 tomb 地形 token 畫佔位格 ---------- */
const MOBS = [0, 1, 2, 3, 4, 5].map(i => ({ a: i * 1.05, r: 70 + (i % 3) * 26, sp: 0.00035 + i * 0.00004 }));
function drawField() {
  const cv = $('cv'),
    z = SIZES[P.size],
    g = geo(),
    x = cv.getContext('2d');
  const sc = z.port ? 1 : z.z;
  if (cv.width !== z.w || cv.height !== z.h) (cv.width = z.w), (cv.height = z.h);
  x.setTransform(sc, 0, 0, sc, 0, 0);
  const biome = S.camp ? 'temple' : 'tomb';
  x.fillStyle = tok('scene-void');
  x.fillRect(0, 0, g.W, g.H);
  const top = g.fieldTop,
    bot = g.fieldBot;
  /* 鏡頭中心：可見戰場的中心；抽屜關閉時 camOff 160 ms 回原位 */
  const cx = g.port ? g.W / 2 : (492 + Math.min(844, g.W - 436)) / 2,
    cy = (top + bot) / 2 + S.camOff;
  x.save();
  x.beginPath();
  x.rect(0, top, g.W, bot - top);
  x.clip();
  x.fillStyle = tok(`scene-${biome}-ground`);
  x.fillRect(0, top, g.W, bot - top);
  /* 地磚：固定格（跟鏡頭走），中間調石塊、亮部邊 */
  const ox = -FT * 0.01;
  for (let gy = -1; gy < (bot - top) / 48 + 2; gy++)
    for (let gx = -1; gx < g.W / 48 + 2; gx++) {
      const h = ((gx * 73856093) ^ (gy * 19349663)) & 7;
      if (h > 2) continue;
      const px = gx * 48 + (ox % 48) + (gy % 2) * 24,
        py = top + gy * 48 + ((cy - top) % 48);
      x.fillStyle = tok(`scene-${biome}-mid`);
      x.fillRect(px + 6, py + 6, 30, 22);
      x.fillStyle = tok(`scene-${biome}-light`);
      x.fillRect(px + 6, py + 6, 30, 2);
    }
  if (!S.camp) {
    /* 危險：紅色預警圈（看得出危險） */
    const ph = (FT % 2400) / 2400;
    x.strokeStyle = tok('bad');
    x.lineWidth = 2;
    x.globalAlpha = 0.5 + 0.5 * Math.sin(ph * Math.PI);
    x.beginPath();
    x.arc(cx + 70, cy - 30, 26 + ph * 14, 0, Math.PI * 2);
    x.stroke();
    x.globalAlpha = 1;
    /* 怪物：繞主角轉（用圖集現有怪物圖） */
    const ks = ['hungry_ghost', 'ghost_bailiff', 'bone_knight', 'horseface', 'hell_imp', 'bandit'];
    MOBS.forEach((m, i) => {
      const a = m.a + FT * m.sp;
      const mx = cx + Math.cos(a) * m.r,
        my = cy + Math.sin(a) * m.r * 0.6;
      const o = img(ks[i]);
      if (o.im.complete && o.im.naturalWidth)
        x.drawImage(
          o.im,
          o.r[1],
          o.r[2],
          o.r[3],
          o.r[4],
          Math.round(mx - o.r[3] / 2),
          Math.round(my - o.r[4]),
          o.r[3],
          o.r[4]
        );
    });
  }
  if (HERO.complete && HERO.naturalWidth)
    x.drawImage(HERO, 0, 80, 80, 80, Math.round(cx - 39), Math.round(cy - 41), 80, 80);
  x.restore();
}
/* 假戰場雜湊（P02／PF-D2-5）：讀 canvas 戰場像素 */
function fieldHash() {
  const cv = $('cv'),
    d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let h = 2166136261;
  for (let i = 0; i < d.length; i += 97) h = Math.imul(h ^ d[i], 16777619);
  return h >>> 0;
}

/* ---------- 掉落動態（G05）：預設「稀有以上」；最後一列「+n 件已收」 ---------- */
const DROPS = [
  { n: '鐵劍', rar: 'normal' },
  { n: '寒鐵長劍', rar: 'rare' },
  { n: '布甲', rar: 'normal' },
  { n: '銅環', rar: 'normal' },
  { n: '守夜胸甲', rar: 'leg' },
  { n: '破裂石', rar: 'rare', cur: 1 },
  { n: '皮盔', rar: 'normal' },
  { n: '追憶之墨', rar: 'rare', cur: 1 }
];
function feedState() {
  const k = Math.floor(FT / 1400) + 6;
  let last = null,
    hid = 0;
  for (let i = 0; i < k; i++) {
    const d = DROPS[i % DROPS.length];
    if (d.rar === 'normal') hid++;
    else last = d;
  }
  return { last, hid };
}
function feedHTML(g) {
  if (S.full) return '';
  const f = feedState();
  const y0 = g.port ? (S.banner ? 220 : 148) : 80;
  const x0 = g.port ? 8 : 500,
    w = g.port ? 240 : Math.min(280, g.R[0] - 504);
  const row = d => `<div class="fd plate" data-role="body"><span class="${rc(d)}">${mk(d)}${t(d.n)}</span></div>`;
  return `<div class="ab feed" id="d-feed" data-box="feed" style="${px(x0, y0, w, 56)}">${f.last ? row(f.last) : ''}<div class="fd plate dim">${t('+{n} 件已收', { n: abbr(f.hid) })}</div></div>`;
}
const px = (x, y, w, h) =>
  `left:${x}px;top:${y}px;${w != null ? `width:${w}px;` : ''}${h != null ? `height:${h}px;` : ''}`;
const box = (r, k, cls, inner, extra = '') =>
  `<div class="ab ${cls}" ${k ? `data-box="${k}"` : ''} style="${px(r[0], r[1], r[2] - r[0], r[3] - r[1])}${extra}">${inner}</div>`;

/* ---------- 貨幣列（G03；D1-fix §9）：只放金、靈魂；圖示 16＋數字（縮寫捨去、5 字元寬）；點一下開通貨明細（完整數字）。
   直立 202–382 × 110–142（熱區 106–150）；桌機 x 16–316，D2 左欄從 76 起，放進頂列 18–50（見 PR 衝突清單） ---------- */
function resHTML(g) {
  if (S.full) return '';
  const r = g.port ? [202, 110, 382, 142] : [16, 18, 316, 50];
  const ic = { 金: 'mat_gold', 靈魂: 'cur_soul' };
  return box(
    r,
    'res',
    'plate res',
    `<button class="rhit kf" data-k="res" data-hit="1" data-act="curdetail" aria-label="${t('通貨明細')}">${SV()
      .res.map(
        ([n, v]) =>
          `<span class="rv" data-role="body" title="${t(n)}" aria-label="${t(n)} ${full(v)}">${art(ic[n], 1, 'i16')}<span class="num w5">${abbr(v)}</span></span>`
      )
      .join('')}</button>`
  );
}

/* ---------- 藥劑（G02；D1-fix §2）：不限次數、各自冷卻 3 秒；鈕上只畫冷卻環＋扇形掃過（--hp-hi／--mp-hi），不寫任何次數。
   冷卻中按：不喝、抖 ≤ 80 ms；減少動態只亮外框 120 ms。低血呼吸只在生命藥劑冷卻好時。 ---------- */
const fCool = k => Math.max(0, Math.min(1, (NOW - S.fT[k]) / FX.FLASK_CD));
const fBusy = k => NOW - S.fT[k] < FX.FLASK_CD;
function flaskAt(g) {
  if (g.port)
    return S.panel && S.panel !== 'tree'
      ? {
          s: 44,
          at: [
            [290, g.hudBot - 78],
            [338, g.hudBot - 78]
          ]
        }
      : {
          s: 56,
          at: [
            [8, g.idleTop - 134],
            [8, g.idleTop - 66]
          ]
        };
  return {
    s: 48,
    at: [
      [732, g.H - 88],
      [788, g.H - 88]
    ]
  };
}
function flaskHTML(g) {
  if (S.full) return '';
  const { s, at } = flaskAt(g);
  return ['hp', 'mp']
    .map((k, i) => {
      const cool = fBusy(k),
        p = fCool(k);
      const low = k === 'hp' && S.lowhp && !cool ? ' low' : '';
      const fl = S.flashK === k && NOW - S.flashT < 120 ? ' flash' : '';
      return `<button class="ab flask kf${cool ? ' cool' : ''}${low}${fl}" data-box="flask${i}" data-k="flask-${k}" data-hit="1" data-act="flask" data-f="${k}" aria-label="${k === 'hp' ? '生命藥劑' : '魔力藥劑'}" style="${px(at[i][0], at[i][1], s, s)}--ring:var(--${k}-hi);--deg:${(p * 360).toFixed(1)}deg" data-cool="${cool ? p.toFixed(3) : ''}"><i class="fl ${k}"></i>${cool ? '<i class="sweep"></i><i class="ring"></i>' : ''}${g.port ? '' : `<span class="kc badge">${i + 1}</span>`}</button>`;
    })
    .join('');
}
function drink(k) {
  if (fBusy(k)) {
    log('flask-busy', { k, cd: Math.round(NOW - S.fT[k]) });
    if (P.rm) (S.flashK = k), (S.flashT = NOW);
    else (S.shakeK = 'flask-' + k), (S.shakeT = NOW), (S.shakeD = 80);
    animFor(140);
    return build();
  }
  S.fT[k] = NOW;
  log('flask-drink', { k });
  animFor(FX.FLASK_CD + 40);
  build();
}

/* ---------- 生命／魔力條（G02：抽屜開著時移到抽屜頂 300–330；D1-fix §2 直立 72–382） ---------- */
function barsHTML(g) {
  const st = SV().st,
    hp = [Math.round(st.hp * (S.lowhp ? 0.3 : 0.84)), st.hp],
    mp = [241, 286]; /* 魔力 假定 */
  if (S.full) return '';
  const drawer = S.panel && S.panel !== 'tree';
  const r = g.port
    ? drawer
      ? [72, g.hudBot - 30, 382, g.hudBot]
      : [72, g.idleTop - 110, 382, g.idleTop - 79]
    : [500, g.H - 132, Math.min(780, g.R[0] - 8), g.H - 100]; /* 1280×800 ×1.25（寬 1024）讓右欄 */
  const bar = (k, v, m) =>
    `<div class="hb ${k}"><i style="width:${Math.round((v / m) * 100)}%"></i><span class="badge num">${full(v)}／${full(m)}</span></div>`;
  return box(r, 'bars', 'bars', bar('hp', ...hp) + bar('mp', ...mp));
}

/* ---------- 技能鈕（抽屜關著時才畫；SK02 抽屜開著不在戰場重畫） ---------- */
function skBtnHTML(g) {
  if (g.port && S.panel && S.panel !== 'tree') return '';
  const l = SV().sk.list,
    s = g.port ? 56 : 40;
  return l
    .map((k, i) => {
      const x = g.port ? 76 + i * 62 : 500 + i * 45,
        y = g.port ? g.idleTop - 66 : g.H - 84;
      return `<button class="ab skb kf" data-box="skb${i}" data-hit="1" data-k="skb${i}" aria-label="${esc(k.n)}" style="${px(x, y, s, s)}">${art(k.ic, 1)}</button>`;
    })
    .join('');
}

/* ---------- 掛機條＋下一個目標（G04）；標籤「追逐保底 n%」前加王印圖示（暫用） ---------- */
function idleHTML(g) {
  const sv = SV(),
    [gn, have, need] = sv.idle.goal,
    pity = S.pity != null ? S.pity : sv.pity;
  const p = S.goalFull ? 1 : Math.min(1, have / need);
  const r = g.port ? [0, g.idleTop, g.W, g.idleTop + 44] : g.idle;
  const glow = NOW - S.goal100T < 160 ? ' glow' : '';
  return box(
    r,
    'idle',
    'idle' + glow,
    `<i class="goalbar" style="width:${(p * 100).toFixed(1)}%"></i><button class="ib kf" data-k="idle" data-hit="1"><span class="pity">${wy16('歸墟印')}<b>${t('追逐保底')} ${pity}%</b></span><span class="im">${t('掛機 {n} 分', { n: sv.idle.min })}</span><span class="gl">${t('目標')} <span class="gn">${t(gn)} </span>${Math.floor(p * 100)}%</span></button>`
  );
}

/* ---------- 分頁 ---------- */
const TABS = [
  ['char', '角色', 'I'],
  ['forge', '鍛造', 'K'],
  ['skill', '技能', 'G'],
  ['tree', '天賦', 'P'],
  ['camp', '營地', ''],
  ['more', '更多', '']
];
function navHTML(g) {
  const tw = P.en || P.fs ? Math.min(660, g.W - 16 - 572) : 416; /* 英文、130%：分頁往左長，不裁字 */
  const r = g.port ? [0, g.navTop, g.W, g.navTop + g.navH] : [g.W - 16 - tw, 10, g.W - 16, 58];
  const w = (r[2] - r[0]) / 6;
  return box(
    r,
    'nav',
    'tabs',
    TABS.map(
      ([k, n, key], i) =>
        `<button class="tab kf${S.panel === k ? ' on' : ''}" data-k="tab-${k}" data-hit="1" data-tab="${k}" style="width:${w}px">${t(n)}${!g.port && key ? `<span class="kc badge">${key}</span>` : ''}${k === 'camp' && S.goal100T > 0 && NOW - S.goal100T >= 160 ? '<i class="dot8"></i>' : ''}</button>`
    ).join('')
  );
}

/* ---------- 面板外殼：直立抽屜 330–710（滑入 200、滑出 160）；桌機左欄／右欄 ---------- */
const xBtn = () => `<button class="x44 kf" data-k="close" data-hit="1" data-act="close" aria-label="關">×</button>`;
const backBtn = () => `<button class="back kf" data-k="back" data-hit="1" data-act="back" aria-label="返回">‹</button>`;
function shell(g, k, r, inner, cls = '') {
  return `<section class="ab pnl ${cls}" id="p-${k}" data-box="pnl-${k}" style="${px(r[0], r[1], r[2] - r[0], r[3] - r[1])}">${inner}</section>`;
}
const drawerR = g => [0, g.dTop, g.W, g.dBot];

/* ---------- 1 角色＋倉庫 ---------- */
/* 身上第 i 格對到倉庫的部位（第二、第三戒指都是戒指；護符倉庫沒有） */
const slotOf = i => (i === 9 || i === 10 ? 8 : i >= 11 ? 11 : i);
/* 身上（E02 假定：中期沒有傳奇，塞一件只為了看格子） */
function eqList() {
  const e = SV().eq;
  return S.asm === 'leg' ? e.map((x, i) => (i === 7 ? Object.assign({}, x, { rar: 'leg', asm: 1 }) : x)) : e;
}
function eqCell(e, i, sz) {
  if (S.emptyEq && S.emptyEq.includes(i)) e = null;
  const sel = S.sel === i ? ' sel' : '';
  const sl = FX.SLOTS[i],
    xc = i >= FX.MAIN ? ' xs' : '';
  if (e && e.lock)
    return `<button class="eq empty lockd kf${xc}" data-k="eq${i}" data-hit="1" data-act="eqlock" data-why="${esc(e.lock)}" style="width:${sz}px;height:${sz}px" aria-label="${esc(sl)}：${esc(e.lock)}" title="${esc(e.lock)}"><span class="sil">${art(FX.IC[i], 1)}</span><span class="slot badge">${t(sl)}</span></button>`;
  if (!e) {
    const cand = invList().filter(x => x.slot === slotOf(i)).length;
    return `<button class="eq empty kf${sel}${xc}" data-k="eq${i}" data-hit="1" data-eq="${i}" style="width:${sz}px;height:${sz}px" aria-label="${esc(sl)} 空"><span class="sil">${art(FX.IC[i], 1)}</span><span class="slot badge">${t(sl)}</span>${cand ? `<span class="cand badge good">${cand}</span>` : ''}</button>`;
  }
  const best = Math.max(
    0,
    ...invList()
      .filter(x => x.slot === slotOf(i) && !x.no)
      .map(x => x.up || 0)
  );
  const up = best && S.eqT < 0 ? upMk(best) : '';
  return `<button class="eq ${rc(e)}${sel}${e.frac ? ' frac' : ''} kf" data-k="eq${i}" data-hit="1" data-eq="${i}" style="width:${sz}px;height:${sz}px" aria-label="${esc(e.n)}">${art(S.eqT > 0 && i === 0 ? S.newIc || FX.IC[i] : FX.IC[i], 1)}<span class="corner badge">${mk(e)}</span>${up ? `<span class="upc badge">${up}</span>` : ''}${e.no ? '<i class="nox" title="不能裝備"></i>' : ''}</button>`;
}
function stCell(it, i, sz) {
  const chk = S.batch ? (S.chk && S.chk.has(i) ? ' chk' : '') : '';
  const sel = S.pick === i ? ' sel' : '';
  let anim = '';
  if (S.salSet && S.salSet.has(i)) {
    const p = P.rm ? 1 : Math.min(1, Math.max(0, (NOW - S.salT - S.salOrd.get(i)) / 180));
    anim = `transform:scale(${(1 - 0.6 * p).toFixed(3)});opacity:${(1 - p).toFixed(3)};`;
  }
  return `<button class="st ${rc(it)}${sel}${chk} kf" data-k="st${i}" data-hit="1" data-st="${i}" style="width:${sz}px;height:${sz}px;${anim}" aria-label="${esc(it.n)}">${art(it.ic, 1)}<span class="corner badge">${mk(it)}</span>${it.up ? `<span class="upc badge">${upMk(it.up)}</span>` : ''}${it.lock ? '<span class="lk badge">鎖</span>' : ''}${it.no ? '<i class="nox"></i>' : ''}${S.batch ? `<i class="cb">${chk ? '✓' : ''}</i>` : ''}</button>`;
}
function charHead(g) {
  const st = SV().st;
  const n = invN(),
    near = n >= INV_CAP * 0.9,
    fullS = n >= INV_CAP;
  const dps = S.eqT > 0 ? rollV(st.dps, S.newDps || st.dps, S.eqT, S.upKind === 2 ? 400 : 300) : st.dps;
  const dd =
    S.eqT > 0 && NOW - S.eqT < 1500 + (S.upKind === 2 ? 280 : 0) ? `<b class="dd good num">DPS +${S.dPct}%</b>` : '';
  const sc =
    S.upKind === 2 && NOW - S.eqT < 280
      ? ` style="--s:${(1 + 0.04 * Math.sin((Math.PI * (NOW - S.eqT)) / 280)).toFixed(4)}"`
      : '';
  return `<div class="hd"><button class="sum kf" data-k="sum" data-hit="1" data-act="stats"${sc}><span>DPS <b class="num">${full(dps)}</b>・${t('生命')} <b class="num">${full(st.hp)}</b> ›</span>${dd}</button><span class="cap ${fullS ? 'bad' : near ? 'warn' : ''}" id="d-cap"><span>${t('倉庫')} <span class="num">${full(n)}／${full(INV_CAP)}</span></span>${fullS ? `<b class="badge">${t('倉庫滿了')}</b>` : near ? `<b class="badge">${t('倉庫快滿')}</b>` : ''}</span>${xBtn()}</div>`;
}
const fv = v => (v < 10 ? v.toFixed(2) : full(v));
const rollV = (a, b, t0, d) => (P.rm ? b : Math.round(a + (b - a) * Math.min(1, Math.max(0, (NOW - t0) / d))));
function filterHTML() {
  const l = invList(),
    up = l.filter(x => x.up).length;
  const f = [
    ['all', '全部'],
    ['up', `▲ ${up}`],
    ['wpn', '武器'],
    ['arm', '防具'],
    ['acc', '飾品'],
    ['charm', '護符']
  ];
  return `<div class="flt" role="tablist">${f.map(([k, n]) => `<button class="seg kf${S.filter === k ? ' on' : ''}" data-k="f-${k}" data-hit="1" data-f="${k}">${t(n)}</button>`).join('')}</div>`;
}
function stashList() {
  const l = invList();
  return l
    .map(it => [it, it._i])
    .filter(([it]) =>
      S.sel != null
        ? it.slot === slotOf(S.sel)
        : S.filter === 'up'
          ? it.up
          : S.filter === 'wpn'
            ? it.slot === 0
            : S.filter === 'arm'
              ? it.slot >= 1 && it.slot <= 5
              : S.filter === 'acc'
                ? it.slot >= 6 && it.slot <= 9
                : S.filter === 'charm'
                  ? it.slot >= 10
                  : 1
    );
}
function cmpRow(g) {
  const it = S.pick != null ? byI(S.pick) : null,
    sv = SV();
  let cur = S.sel != null ? sv.eq[S.sel] : it ? sv.eq[it.slot] : null;
  if (cur && cur.lock) cur = null;
  if (!it) return `<div class="cmp none"><p class="dim">${t('點一格或倉庫一件看比較')}</p></div>`;
  const d = it.up === 2 ? sv.cmp.big.d : it.up ? sv.cmp.pick.d : it.no ? { dps: 0, hp: 0 } : { dps: -4, hp: 0 };
  const dv = (k, v) =>
    v > 0
      ? `<b class="good">${k} +${v}% ▲</b>`
      : v < 0
        ? `<b class="bad">${k} −${-v}% ▼</b>`
        : `<b class="dim">${k} —</b>`;
  const sal = protectedIt(it) ? 1200 : 600;
  return `<div class="cmp">
    <div class="cn"><span class="nm ${rc(it)}">${mk(it)}${t(it.n)}</span>${it.rar === 'magic' || it.rar === 'rare' ? `<button class="btn sec kf" data-k="toseal" data-hit="1" data-act="seal-from-char">${t('套到裝備')}</button>` : ''}<button class="lnk kf" data-k="detail" data-hit="1" data-act="detail">${t('詳細')} ›</button></div>
    <div class="dl" id="d-delta">${dv('DPS', d.dps)} ${dv(t('生命'), d.hp)}</div>
    <div class="was dim">${it.no ? `<b class="bad">${t(it.no)}</b>` : cur ? t('換下 {o}', { o: cur.n }) : t('{s}現在空著', { s: FX.SLOTS[S.sel != null ? S.sel : it.slot] })}</div>
    <div class="acts"><button class="btn pri kf${it.no ? ' off' : ''}" data-k="equip" data-hit="1" data-act="${it.no ? 'deny' : 'equip'}" style="width:${g.port ? 210 : 200}px;height:48px">${t('裝備')}</button><button class="btn sec kf" data-k="lock" data-hit="1" data-act="lock" style="width:44px;height:48px" aria-label="鎖">${it.lock ? '解' : t('鎖')}</button><button class="btn danger hold kf" data-k="sal1" data-hit="1" data-hold="sal1" data-ms="${sal}" style="width:88px;height:48px;margin-left:8px"><i class="fill"></i><span>${t('長按分解')}</span></button></div>
    ${sal > 600 ? `<div class="warnl bad">${t('保護件：長按 1.2 秒・不能復原')}</div>` : ''}
  </div>`;
}
/* 分解回收（fakedata §9）：每件 材料 3、靈魂 物品等級 × 2、金＝賣價（假定 12） */
function salGain(set) {
  const [m, per, soul, gold] = SV().sal;
  const n = [...set].filter(i => byI(i)).length;
  return { m, mat: n * per, soul: n * soul, gold: n * gold, n };
}
function batchBar(g) {
  let prot = 0;
  if (S.chk) S.chk.forEach(i => byI(i) && protectedIt(byI(i)) && (prot = 1));
  const r = salGain(S.chk || []);
  return `<div class="bbar"><button class="btn danger hold kf" data-k="salAll" data-hit="1" data-hold="salAll" data-ms="${prot ? 1200 : 600}"><i class="fill"></i><span>${t('長按分解 {n} 件・回收 {m} +{r}、靈魂 +{s}', { n: full(r.n), m: t(r.m), r: full(r.mat), s: full(r.soul) })}</span></button><button class="btn sec kf" data-k="cancel" data-hit="1" data-act="batch-off">${t('取消')}</button></div>${prot ? `<div class="warnl bad">${t('含保護件：長按 1.2 秒・不能復原')}</div>` : ''}`;
}
function charHTML(g) {
  const sv = SV(),
    port = g.port;
  if (S.sub === 'stats') return statsHTML(g);
  if (S.sub === 'detail') return detailHTML(g);
  const short = g.H < 700;
  const eqSz = 50;
  const eq = `<div class="eqg${port && short ? ' one' : ''}" id="d-eq">${eqList()
    .map((e, i) => eqCell(e, i, eqSz))
    .join('')}</div>`;
  const l = invList(),
    sl = stashList(),
    sz = port ? 50 : 36;
  const empty = !l.length;
  const stash = empty
    ? `<div class="emp"><p>${t('還沒有裝備。')}</p><button class="btn sec kf" data-k="toforge" data-hit="1" data-act="toforge">${t('去鍛造打一件')}</button></div>`
    : `<div class="stg${S.sel != null && port ? ' row1' : ''}" id="d-stash" style="--c:${sz}px">${sl.map(([it, i]) => stCell(it, i, S.sel != null && port ? 44 : sz)).join('')}</div>`;
  const acts = S.batch
    ? batchBar(g)
    : empty
      ? ''
      : `<div class="sbar"><button class="btn sec kf" data-k="batch" data-hit="1" data-act="batch-on">${t('批次分解')}</button><span class="dim">${t('長按一件也能分解')}</span></div>`;
  if (port) {
    const pick = S.sel != null || S.pick != null;
    return shell(
      g,
      'char',
      drawerR(g),
      charHead(g) +
        `<div class="cbody">${eq}${pick && !S.batch ? '' : filterHTML()}${pick && !S.batch ? `<div class="pk1">${S.sel != null ? `<button class="seg kf" data-k="unsel" data-hit="1" data-act="unsel">${t('全部')} ‹</button>` : ''}${stash}</div>${cmpRow(g)}` : stash + acts}</div>`,
      'drawer'
    );
  }
  /* 桌機：左欄角色（數值常駐 124–196、比較區 344–604），右欄倉庫 */
  const st = sv.st;
  const left = shell(
    g,
    'char',
    g.L,
    charHead(g) +
      `<div class="stl" id="d-stl">${[
        ['DPS', st.dps],
        ['生命', st.hp],
        ['能量護盾', st.es],
        ['護甲', st.armor]
      ]
        .map(([n, v]) => `<div><span class="dim">${t(n)}</span><b class="num">${full(v)}</b></div>`)
        .join('')}</div>${eq}<div class="cmpd" id="d-cmpd">${cmpRow(g)}</div>`
  );
  const right = shell(
    g,
    'stash',
    g.R,
    `<div class="hd"><b>${t('倉庫')} <span class="num">${full(invN())}／${full(INV_CAP)}</span></b></div>${filterHTML()}${stash}${acts}`,
    'rcol'
  );
  return left + right;
}
function statsHTML(g) {
  const st = SV().st,
    port = g.port;
  const ch = S.eqT > 0 && NOW - S.eqT < 3000;
  const row = (n, v, sfx = '', mark = '') =>
    `<div class="sr"><span>${t(n)}</span><b class="num${v < 0 ? ' bad' : ''}">${v < 0 ? '−' + full(-v) : full(v)}${sfx}</b>${mark}</div>`;
  const inner = `<div class="hd">${backBtn()}<b>${t('數值')}</b>${xBtn()}</div><div class="sbody"><div class="big2"><div><span>DPS</span><b class="num">${full(S.newDps || st.dps)}</b>${ch ? '<i class="good">▲</i>' : ''}</div><div><span>${t('生命')}</span><b class="num">${full(st.hp)}</b>${ch ? '<i class="bad">▼</i>' : ''}</div></div>${row('能量護盾', st.es)}${row('護甲', st.armor)}${row('閃避', st.eva)}${['火焰抗性', '冰冷抗性', '閃電抗性', '混沌抗性'].map((n, i) => row(n, st.res[i], '%')).join('')}</div>`;
  return shell(g, 'char', port ? drawerR(g) : g.L, inner, port ? 'drawer push' : 'push');
}
/* 物品說明（T01–T05；D1-fix §7）：標題帶 → 比較總結一行 → 屬性（每列 ▲▼ 差值）→ 詞綴 → 印詞 → 需求 → 動作。
   兩欄拿掉；直立點總結行、桌機按住 Shift 看身上那件。桌機卡寬 320 */
const dvTxt = (a, b) => {
  const d = b - a,
    f = v => (Math.abs(v) < 10 && v % 1 ? Math.abs(v).toFixed(2) : full(Math.abs(v)));
  return d > 0
    ? `<b class="num dv good">▲ +${f(d)}</b>`
    : d < 0
      ? `<b class="num dv bad">▼ −${f(d)}</b>`
      : '<b class="num dv dim">—</b>';
};
function itemBody(it, slot) {
  const mods = (it.mods || []).map(m => `<li>${t(m)}</li>`).join('');
  const T = it.T || (SV().eq[slot] && SV().eq[slot].T) || '';
  return `<div class="sec2"><span class="dim">${t('基底')}：${t(FX.SLOTS[slot] || '')}・${T}</span>${it.frac ? `<div class="tag">${t('★ 破裂裝備')}</div>` : ''}${it.mem ? `<div class="tag">${t('記憶')}</div>` : ''}${it.cor ? `<div class="tag bad">${t('已腐化')}</div>` : ''}${it.asm ? asm() : ''}</div>
    ${mods ? `<ul class="sec2 mods">${mods}</ul>` : ''}
    ${it.seal && it.seal.mod ? `<div class="sec2 seal">${wy16(it.seal.k)}<span>${t(it.seal.k)}：${t(it.seal.mod)}</span></div>` : ''}
    ${it.no ? `<div class="sec2 bad">${t('不能裝備：{w}', { w: t(it.no) })}</div>` : ''}`;
}
function detailHTML(g) {
  const sv = SV();
  const isPick = S.pick != null;
  const it = isPick ? byI(S.pick) : eqList()[S.sel != null ? S.sel : 0];
  const slot = it.slot != null ? it.slot : S.sel != null ? S.sel : 0;
  let cur = S.detailEmpty ? null : sv.eq[slot];
  if (cur && cur.lock) cur = null;
  let cmp = '';
  if (isPick) {
    const d = it.up === 2 ? sv.cmp.big.d : it.up ? sv.cmp.pick.d : { dps: -4, hp: 0 };
    const rows = it.up === 1 ? sv.cmp.pick.rows : [];
    const sum = !cur
      ? `<span class="good">${t('{s}現在空著', { s: FX.SLOTS[slot] })}</span>`
      : d.dps > 2
        ? `<span class="good">▲ ${t('比現在 +{n}% 傷害', { n: d.dps })}</span>`
        : d.dps < -2
          ? `<span class="bad">▼ ${t('比現在 −{n}% 傷害', { n: -d.dps })}</span>`
          : `<span class="dim">— ${t('跟現在差不多')}</span>`;
    const rl = rows
      .map(
        r => `<div class="cr"><span>${t(r[0])}</span><b class="num">${fv(r[2])}</b>${dvTxt(cur ? r[1] : 0, r[2])}</div>`
      )
      .join('');
    cmp = `<button class="csum kf" data-k="csum" data-hit="1" data-act="showcur" id="d-csum">${sum}</button>${rl ? `<div class="sec2 attrs" id="d-attrs">${rl}</div>` : ''}`;
  }
  const curCard =
    isPick && cur && S.showCur
      ? `<div class="sec2 curit"><div class="tband ${rc(cur)}"><span class="nm2">${t('身上')}：${mk(cur)}${t(cur.n)}</span></div>${itemBody(cur, slot)}</div>`
      : '';
  const inner = `<div class="hd">${backBtn()}<b>${t('詳細')}</b>${xBtn()}</div><div class="dbody" id="d-detail">
    <div class="tband ${rc(it)}"><span class="nm2">${mk(it)}${t(it.n)}</span><span class="badge dim">${t(RAR[it.rar] || '')} ${it.T || ''}</span></div>
    ${cmp}
    ${itemBody(it, slot)}
    ${isPick ? `<div class="sec2 acts"><button class="btn pri kf" data-k="equip2" data-hit="1" data-act="equip">${t('裝備')}</button></div>` : ''}
    ${g.port ? curCard : ''}
  </div>`;
  if (g.port) return shell(g, 'char', drawerR(g), inner, 'drawer push');
  const side =
    isPick && cur && S.showCur
      ? `<section class="ab pnl tip" data-float="1" id="p-cur" style="${px(344, 76, 320, null)}"><div class="dbody">${curCard}</div></section>`
      : '';
  return (
    `<section class="ab pnl push tip" data-float="1" id="p-detail" style="${px(16, 76, 320, g.H - 144)}">${inner}</section>` +
    side +
    charSide(g)
  );
}
function charSide(g) {
  return shell(
    g,
    'stash',
    g.R,
    `<div class="hd"><b>${t('倉庫')} <span class="num">${full(invN())}／${full(INV_CAP)}</span></b></div>${filterHTML()}<div class="stg" id="d-stash" style="--c:36px">${stashList()
      .map(([it, i]) => stCell(it, i, 36))
      .join('')}</div>`,
    'rcol'
  );
}

/* ---------- 3 鍛造（打造｜通貨｜鍛造台）。鍛造畫面不出現「保底」二字（11/19 定案） ---------- */
/* 翻牌時間（V8）：普通 240／▲ 360／黃裝 450／▲▲ 600／追逐 900；整批 ≤ 3,000 */
/* 一批 10 件（fakedata §7）；F13 假定：中期做不到 ★ 破裂，塞在第 3 件（稀有）只為了看斜光＋★ */
const batchList = () =>
  S.asm === 'frac' ? SV().batch.map((r, i) => (i === 2 ? Object.assign({}, r, { frac: 1 }) : r)) : SV().batch;
const flipDur = r => (r.chase ? 900 : r.up === 2 ? 600 : r.rar === 'rare' || r.rar === 'leg' ? 450 : r.up ? 360 : 240);
function flipPlan() {
  const b = batchList(),
    d = b.map(flipDur);
  /* 每件時間照表不變；整批 ≤ 3,000：下一件在上一件翻到 k 比例時就開始（k ≤ 1） */
  const head = d.slice(0, -1).reduce((a, x) => a + x, 0);
  const k = Math.min(1, (3000 - 60 - d[d.length - 1]) / head);
  let at = 60; /* 按打造到第一張翻 ≤ 100 ms */
  return d.map(x => {
    const o = { at, d: x };
    at += x * k;
    return o;
  });
}
function flipP(i) {
  if (S.flipT < 0) return 1;
  if (P.rm || S.flipAll) return 1;
  const o = flipPlan()[i];
  return Math.min(1, Math.max(0, (NOW - S.flipT - o.at) / o.d));
}
const forgeSeg = () =>
  `<div class="segs" role="tablist">${[
    ['craft', '打造'],
    ['cur', '通貨'],
    ['anvil', '鍛造台']
  ]
    .map(
      ([k, n]) =>
        `<button class="seg kf${S.seg === k ? ' on' : ''}" data-k="seg-${k}" data-hit="1" data-seg="${k}" style="width:96px">${t(n)}</button>`
    )
    .join('')}</div>`;
function craftHTML(g) {
  const sv = SV(),
    f = sv.forge,
    port = g.port;
  const L = S.lack ? f.lack : null; /* F02 缺料例：胸甲 T2 ×5 */
  const tier = L ? f.tiers.indexOf(L[4]) : S.tier != null ? S.tier : f.tier,
    cnt = L ? L[3] : f.counts[S.count != null ? S.count : f.count];
  const [mn, per, have] = L || f.mat;
  const need = per * cnt,
    gold = f.gold ? [f.gold[0] * cnt, f.gold[1]] : null;
  const ok = can(have, need) && (!gold || can(gold[1], gold[0]));
  const space = invFree() >= cnt;
  const flipping = S.flipT > 0;
  const canN = Math.min(Math.floor(have / per), gold ? Math.floor(gold[1] / f.gold[0]) : Infinity);
  const mats = `<div class="mats" id="d-mats"><span class="chip">${art('cur_scrap', 1)}${t(mn)} ${nA(have)}</span><span class="dim">${t('每件')} ${full(per)}・${t('還能打 {n} 件', { n: full(canN) })}</span></div>`;
  const pw = port ? 71 : 86,
    ph = port ? 46 : 56;
  const part = L ? f.lack[5] : S.part != null ? S.part : f.part || 0;
  const open = f.parts.map((p, i) => [p, i]).filter(([, i]) => f.open[i]);
  const parts = `<div class="parts${open.length > 10 ? ' wide' : ''}" id="d-parts">${open
    .map(
      ([p, i]) =>
        `<button class="part kf${part === i ? ' on' : ''}" data-k="part${i}" data-hit="1" data-part="${i}" style="width:${pw}px;height:${ph}px">${t(p)}</button>`
    )
    .join(
      ''
    )}${f.nextLock ? `<div class="part lock" style="width:${pw}px;height:${ph}px"><span class="badge">${t(f.nextLock[0])}<br>${t(f.nextLock[1])}</span></div>` : ''}</div>`;
  const lockN = (l, unit) =>
    l ? `<div class="lockn badge">${l[0]}${unit ? ' ' + t(unit) : ''}：${t(l[1])} ${asm()}</div>` : '';
  const tc = `<div class="tc" id="d-tc"><div class="stp"><button class="seg kf" data-k="tier-" data-hit="1" data-act="tier-">‹</button><b class="num">${f.tiers[tier]}</b><button class="seg kf" data-k="tier+" data-hit="1" data-act="tier+">›</button></div><div class="cnts">${f.counts.map((c, i) => `<button class="seg kf${cnt === c ? ' on' : ''}" data-k="cnt${i}" data-hit="1" data-cnt="${i}">${c}</button>`).join('')}</div>${lockN(f.countLock, '件')}${port ? '' : lockN(f.tierLock)}</div>`;
  const odds = `<div class="odds" id="d-odds"><span>${t('物品等級 {n}', { n: f.ilvl })}</span><span class="sep">・</span>${f.odds.map(([n, v]) => `<span>${t(n)} <b class="num">${v}%</b></span>`).join('<span class="sep">・</span>')}</div>`;
  const auto = `<div class="auto" id="d-auto"><span>${t('自動分解：普通、魔法沒 ▲')}</span><button class="lnk kf" data-k="rules" data-hit="1" data-act="rules">${t('規則')} ›</button></div>`;
  /* 打造稀有保底（名詞表 v0.6.16）：鍛造畫面不寫「保底」 */
  const rp = f.rarePity
    ? `<span class="sub2">${t('再 {n} 件沒出稀有，下一件一定是稀有', { n: f.rarePity })}</span>`
    : '';
  const costTxt = `${t(mn)} ×${abbr(need, 'cost')}${gold ? `、${abbr(gold[0], 'cost')} ${t('金')}` : ''}`;
  let btn;
  if (flipping && S.flipped < 1)
    btn = `<button class="btn sec craft kf" data-k="craft" data-hit="1" data-act="flipall">${t('全部翻開')}</button>`;
  else if (!space && !flipping)
    btn = `<button class="btn off craft kf" data-k="craft" data-hit="1" data-act="deny" aria-disabled="true">${t('打造 {n} 件', { n: cnt })}</button>`;
  else if (!ok)
    btn = `<button class="btn sec craft kf" data-k="craft" data-hit="1" data-act="deny"><span>${t('{m}還差 {k}', { m: t(mn), k: `<b class="bad num">${full(need - have, 'cost')}</b>` })}</span></button>`;
  else
    btn = `<button class="btn pri craft kf" data-k="craft" data-hit="1" data-act="craft"><span>${flipping ? t('再打 {n} 件', { n: cnt }) : t('打造 {n} 件', { n: cnt })}・${costTxt}</span>${rp}</button>`;
  const nos =
    !space && !flipping
      ? `<div class="nos" id="d-nos"><span class="warn">${t('倉庫只剩 {n} 格，這批要 {m} 格', { n: Math.max(0, invFree()), m: cnt })}</span><button class="btn sec kf" data-k="tidy" data-hit="1" data-act="tidy" style="width:120px">${t('去整理')}</button></div>`
      : '';
  let body;
  if (flipping) body = port ? mats + resultsHTML(g) + btn : mats + parts + tc + odds + resultsHTML(g) + btn;
  else if (nos)
    body =
      mats + parts + `<div class="tcs dim" id="d-tcs">${f.tiers[tier]}・${cnt} ${t('件')}</div>` + auto + btn + nos;
  else body = mats + parts + tc + odds + auto + btn;
  return `<div class="fbody${nos ? ' nospace' : ''}${flipping ? ' flipping' : ''}">${body}</div>`;
}
function resultsHTML(g) {
  const b = batchList(),
    sn = b.filter(r => r.sal).length,
    sr = SV()
      .batchSal.map(([m, v]) => (m === '金' ? `${full(v)} ${t('金')}` : `${t(m)} +${full(v)}`))
      .join('、');
  const ups = b.filter(r => r.up).length;
  const rows = b
    .filter(r => !r.sal)
    .map((r, i) => {
      const p = flipP(b.indexOf(r));
      const sh = (r.t0 || r.frac) && p >= 1 && !P.rm ? ' shine' : '';
      return `<div class="rr ${rc(r)}${p < 1 ? ' face' : ''}${sh}" data-i="${i}" style="--p:${p.toFixed(3)}"><i class="rb"></i>${g.port ? art(r.ic, 1) : ''}<span class="rn">${mk(r)}${t(r.n)}${r.frac ? ` <span class="tag">${t('★ 破裂裝備')}</span>${asm()}` : r.t0 ? ' <span class="tag">T0</span>' : ''}</span>${upMk(r.up)}<b class="num rd ${r.up ? 'good' : /−/.test(r.d) ? 'bad' : 'dim'}">${t(r.d)}</b></div>`;
    })
    .join('');
  return `<div class="res2" id="d-res2"><div class="rh"><b>${t('這批 {n} 件', { n: b.length })}・▲ ${ups}</b><button class="btn sec kf" data-k="chpart" data-hit="1" data-act="chpart">${t('換部位')}</button></div><div class="rl" data-act="flipall">${rows}<div class="rr sal"><span>${t('自動分解 {n} 件・回收 {r}', { n: sn, r: sr })}</span><button class="lnk kf" data-k="rules2" data-hit="1" data-act="rules">${t('規則')} ›</button></div></div></div>`;
}
function rulesHTML(g) {
  const r = [
    ['普通：沒 ▲ 就分解', 1],
    ['魔法：沒 ▲ 就分解', 1],
    ['稀有：不分解', 0]
  ];
  return `<div class="hd">${backBtn()}<b>${t('自動分解規則')}</b>${xBtn()}</div><div class="sbody">${r.map(([n, on], i) => `<button class="tg kf${on ? ' on' : ''}" data-k="rule${i}" data-hit="1"><span>${t(n)}</span><i>${on ? '開' : '關'}</i></button>`).join('')}<p class="dim">${t('★ 破裂裝備、傳奇、帶王印、追逐標記不會自動分解')}</p></div>`;
}
function curHTML(g) {
  return `<div class="curl" id="d-curl">${SV()
    .cur.map(
      ([n, ic, v, why]) =>
        `<div class="cu${v ? '' : ' no'}">${art(ic, 1)}<span>${t(n)}</span><b class="num">${nF(v)}</b>${why ? `<span class="off">${t(why)}</span>` : ''}</div>`
    )
    .join('')}</div>`;
}
function anvilHTML(g) {
  const a = SV().anvil,
    it = S.anvil ? SV().eq[a.item] : null;
  const slot = it
    ? `<div class="avs" id="d-avs"><span class="av64 ${rc(it)}">${art(FX.IC[a.item], 2)}</span><span class="avn ${rc(it)}">${mk(it)}${t(it.n)}</span><button class="btn sec kf" data-k="swap" data-hit="1" data-act="anvil-swap" style="width:88px">${t('換一件')}</button></div>`
    : `<div class="avs" id="d-avs"><span class="av64 empty"></span><button class="btn pri kf" data-k="pickone" data-hit="1" data-act="anvil-pick">${t('選一件')}</button></div>`;
  const use =
    it && S.useK
      ? `<button class="btn pri use kf" data-k="use" data-hit="1" data-act="use">${t('使用 {n}（剩 {c}）', { n: t(S.useK), c: full(S.useN) })}</button>`
      : '';
  const groups = it
    ? a.groups
        .map(
          ([gn, l]) =>
            `<div class="ag"><h4>${t(gn)}</h4>${l.map(([n, ic, v, why]) => `<button class="au kf${why ? ' no' : ''}${S.useK === n ? ' on' : ''}" data-k="au-${n}" data-hit="1" data-use="${n}" data-v="${v}" ${why ? 'aria-disabled="true"' : ''}>${art(ic, 1)}<span>${t(n)}</span><b class="num">${nA(v)}</b>${why ? `<span class="off">${t(why)}</span>` : ''}</button>`).join('')}</div>`
        )
        .join('') + (a.next ? `<div class="ag next off">${t(a.next[0])}：${t(a.next[1])}</div>` : '')
    : '';
  return slot + use + `<div class="agl" id="d-agl">${groups}</div>`;
}
function forgeHTML(g) {
  const port = g.port;
  let inner;
  if (S.sub === 'rules') inner = rulesHTML(g);
  else {
    const body = S.seg === 'craft' ? craftHTML(g) : S.seg === 'cur' ? curHTML(g) : anvilHTML(g);
    inner = `<div class="hd">${forgeSeg()}${xBtn()}</div>${body}`;
  }
  const cls = (S.sub ? 'push ' : '') + (port ? 'drawer' : '');
  const main = shell(g, 'forge', port ? drawerR(g) : g.L, inner, cls);
  if (port) return main;
  const save = [S.sub, S.sel];
  S.sel = null;
  const right = shell(
    g,
    'stash',
    g.R,
    `<div class="hd"><b>${t('倉庫')} <span class="num">${full(invN())}／${full(INV_CAP)}</span></b></div>${filterHTML()}<div class="stg" id="d-stash" style="--c:36px">${stashList()
      .map(([it, i]) => stCell(it, i, 36))
      .join('')}</div>`,
    'rcol'
  );
  S.sub = save[0];
  S.sel = save[1];
  return main + right;
}

/* ---------- 4 技能面板（M2-40）：孔板、挑選頁 ---------- */
function skillHTML(g) {
  const sk = SV().sk,
    port = g.port;
  const r = port ? drawerR(g) : g.R;
  if (S.sub === 'pick') return shell(g, 'skill', r, pickHTML(g), (port ? 'drawer ' : '') + 'push');
  const hs = port ? 44 : 40;
  const lockHole = `<div class="hole lock" style="width:${hs}px;height:${hs}px"><span class="badge">${t('祭壇 Lv{n}', { n: sk.holeNext })}</span></div>`;
  const hole = (s, j, i) =>
    `<button class="hole kf${s ? ' has' : ''}${S.drag && S.drag.from === `${i}-${j}` ? ' drag' : ''}" data-k="h${i}-${j}" data-hit="1" data-hole="${i}-${j}" style="width:${hs}px;height:${hs}px" aria-label="${s ? '輔助' : '空孔'}">${s ? art(s, 1) : '＋'}</button>`;
  const souls = SV().res.find(r => r[0] === '靈魂')[1];
  const rows = sk.list
    .map((s, i) => {
      const okUp = s.up != null && can(souls, s.up);
      /* 輔助 II（M2-40 §5）：鎖住的只畫第一招那一行 */
      const ii =
        i > 0
          ? ''
          : sk.ii === 'ok'
            ? `<div class="iir"><span>${t(s.n)} II</span><button class="btn sec iib kf" data-k="ii${i}" data-hit="1" data-act="ii">${t('解鎖 II・{c}', { c: nA(sk.iiCost, 'cost') })}</button></div>`
            : `<div class="iir"><span>${t(s.n)} II</span><span class="off">${t(sk.ii)}</span></div>`;
      const upb =
        s.up == null
          ? `<button class="btn sec upb off kf" data-k="up${i}" data-hit="1" data-act="deny" aria-disabled="true">${t('上限・要{c}', { c: t(s.cap) })}</button>`
          : `<button class="btn sec upb kf${okUp ? '' : ' lackc'}" data-k="up${i}" data-hit="1" data-act="${okUp ? 'skup' : 'deny'}">${t('升級')} ${nA(s.up, 'cost')} ${t('靈魂')}</button>`;
      return `<div class="skg"><div class="skr${okUp ? ' ready' : ''}" id="d-skr${i}"><button class="ski kf" data-k="sk${i}" data-hit="1" style="width:${hs}px;height:${hs}px" aria-label="${esc(s.n)} Lv${s.lv}" title="${esc(s.n)} Lv${s.lv}">${art(s.ic, 1)}</button>${s.sup.map((h, j) => hole(h, j, i)).join('')}${sk.holeNext ? lockHole : ''}<b class="dps num">${s.dps ? nA(s.dps) : '—'}/${t('秒')}</b>${upb}</div>${ii}</div>`;
    })
    .join('');
  const next = sk.slotNext
    ? `<div class="skr nexts off" id="d-nexts">${t('祭壇 Lv{a}：開了第 {b} 格技能', { a: sk.slotNext[0], b: sk.slotNext[1] })}</div>`
    : '';
  const aura = sk.auras.length
    ? `<div class="skr aura" id="d-aura"><span class="an">${t('光環')}</span>${sk.auras.map(a => `<button class="ski kf" data-k="au-${a.n}" data-hit="1" style="width:${hs}px;height:${hs}px" aria-label="${esc(a.n)}">${art(a.ic, 1)}</button>`).join('')}<button class="hole kf" data-k="aura+" data-hit="1" style="width:${hs}px;height:${hs}px">＋</button><b class="sp num">${t('精魂')} ${sk.spirit[0]}/${sk.spirit[1]}</b></div>`
    : `<div class="skr aura off" id="d-aura">${t('光環欄：祭壇 Lv5 才開')}</div>`;
  return shell(
    g,
    'skill',
    r,
    `<div class="hd"><b class="t17">${t('技能')}</b><span class="dim sub">${t('祭壇 Lv{a}・輔助孔上限 {c}', { a: sk.altar, c: sk.cap })}</span>${xBtn()}</div><div class="skb2" id="d-skb2">${rows}${next}${aura}</div>`,
    port ? 'drawer' : 'rcol'
  );
}
function pickHTML(g) {
  const sk = SV().sk;
  const sel = S.picked;
  const rows = sk.picks
    .map((p, i) => {
      const d = Math.round((sk.list[0].dps * p.pct) / 100);
      const same = Math.abs(p.pct) <= 2 || Math.abs(d) <= 0.5;
      const dv = same
        ? `<b class="dim">${t('差不多')}</b>`
        : p.d > 0
          ? `<b class="good num">▲ ${t('每秒')} +${full(d)}（${p.pct}%）</b>`
          : `<b class="bad num">▼ ${t('每秒')} −${full(-d)}（${-p.pct}%）</b>`;
      return `<button class="pr kf${sel === i ? ' on' : ''}" data-k="pr${i}" data-hit="1" data-pr="${i}"><span class="pn">${t(p.n)}${p.best ? `<span class="tag good">${t('最好')}</span>` : ''}<span class="tag">${t(p.tag)}</span></span>${dv}${sel === i ? `<span class="pd dim">${t('插在 {s} 的空孔；跟現有的 附加 類不衝突', { s: sk.list[0].n })}</span>` : ''}</button>`;
    })
    .join('');
  return `<div class="hd">${backBtn()}<b class="ph1">${t('現在每秒 {v}・對本圖怪物（含抗性）', { v: full(sk.list[0].dps) })}</b>${xBtn()}</div><div class="pf"><button class="seg on kf" data-k="pf-all" data-hit="1">${t('全部')}</button><button class="seg kf" data-k="pf-dmg" data-hit="1">${t('傷害')}</button><button class="seg kf" data-k="pf-add" data-hit="1">${t('附加')}</button><button class="seg kf" data-k="pf-mech" data-hit="1">${t('機制')}</button></div><div class="pl" id="d-pl">${rows}</div><button class="btn pri pmain kf" data-k="pmain" data-hit="1" data-act="socket">${t('插上輔助', { name: t(sk.picks[sel || 0].n) })}</button>`;
}

/* ---------- 5 天賦樹＋昇華石碑：滿版、戰鬥暫停、回來補算 ---------- */
const NODES = (() => {
  /* 佔位樹：同心環上的點，路徑 4 點通到目標大點 */
  const out = [];
  for (let ring = 0; ring < 4; ring++)
    for (let k = 0; k < 6 + ring * 4; k++) {
      const a = (k / (6 + ring * 4)) * Math.PI * 2 + ring * 0.3;
      out.push({
        id: out.length,
        x: Math.cos(a) * (60 + ring * 70),
        y: Math.sin(a) * (60 + ring * 70),
        st: ring === 0 ? 'on' : ring === 1 && k % 2 ? 'can' : 'off',
        big: ring === 3 && k % 6 === 0,
        asc: 0
      });
    }
  out.push({ id: out.length, x: 0, y: 0, st: 'on', big: 0, asc: 1, me: 1 });
  return out;
})();
const PATH = [7, 17, 32, 30];
function treeHTML(g) {
  const tr = SV().tree,
    port = g.port;
  const W = g.W,
    H = g.H;
  const asc = S.sub === 'stele';
  const lit = i =>
    S.lightT > 0
      ? Math.min(PATH.length, Math.floor((NOW - S.lightT) / 30) + 1) > PATH.indexOf(i) && PATH.includes(i)
      : 0;
  const top = `<div class="thd" id="d-thd">${asc ? backBtn() : ''}<b class="t22 num">${t('天賦點')} ${tr.pts}</b><button class="btn sec kf" data-k="stele" data-hit="1" data-act="stele" style="width:88px;height:44px">${t('昇華')} ${SV().asc.pts[0]}／${SV().asc.pts[1]}</button><span class="sp1"></span><button class="ic44 kf" data-k="search" data-hit="1" data-act="search" aria-label="搜尋">⌕</button><button class="ic44 kf" data-k="me" data-hit="1" data-act="findme" aria-label="回到我">◎</button><button class="ic44 kf" data-k="tback" data-hit="1" data-act="tclose" aria-label="返回" style="${port ? '' : 'width:36px'}">✕</button></div>`;
  /* 目標大點名、珠寶孔進度 假定（中期祭壇 6，珠寶孔要祭壇 Lv10） */
  const goal = `<button class="tgoal kf" data-k="goal" data-hit="1" id="d-goal"><span>${S.goalPin === 0 && tr.goal ? t('目標：{n}・還差 {k} 點', { n: t(tr.goal[0]), k: tr.goal[1] }) : t('下一個珠寶孔：{z} {a}／{b} 點', { z: t(tr.jewel[0]), a: tr.jewel[1], b: tr.jewel[2] })} ›</span>${asm()}</button>`;
  if (asc && SV().asc.shut) {
    const a = SV().asc;
    return `<section class="ab tree" id="p-tree" data-box="tree" style="${px(0, 0, W, H)}">${top}<div class="stele" id="d-stele"><h3 class="asc">${t(a.n)}</h3><p class="ascn">${t('昇華石碑：{w}', { w: t(a.shut) })}</p><p class="dim">${t('昇華點 {a}／{b}・下一個昇華點 +2：{c}', { a: a.pts[0], b: a.pts[1], c: t(a.next) })}</p></div></section>`;
  }
  if (asc) {
    const a = SV().asc;
    return `<section class="ab tree" id="p-tree" data-box="tree" style="${px(0, 0, W, H)}">${top}<div class="stele" id="d-stele"><h3 class="asc">${t(a.n)} ${a.asm ? asm() : ''}</h3><div class="aslots">${a.notables.map((n, i) => `<button class="asl kf${i < 3 ? ' on' : ''}" data-k="asl${i}" data-hit="1" style="width:${port ? 90 : 96}px;height:${port ? 52 : 56}px">${t(n)}</button>`).join('')}</div><p class="ascn">${t('下一個昇華點 +2：{c}', { c: t(a.next) })}</p><div class="ascard" style="min-height:${port ? 72 : 64}px">${art('asc_crusher_e', 1)}<span>${t('已開 {n} 個昇華', { n: a.open })}</span><button class="btn sec kf" data-k="ascsw" data-hit="1" style="height:44px">${t('換昇華')}</button></div></div></section>`;
  }
  const cx = W / 2,
    cy = port ? 420 : 380,
    sc = port ? 0.62 : 1;
  const nodes = NODES.map(n => {
    const s = 44;
    const st = lit(n.id) ? 'on lit' : n.st;
    return `<button class="nd ${st}${n.big ? ' big' : ''}${n.asc ? ' ascn2' : ''}${S.treeSel === n.id ? ' sel' : ''} kf" data-k="nd${n.id}" data-hit="1" data-nd="${n.id}" style="${px(Math.round(cx + n.x * sc - s / 2), Math.round(cy + n.y * sc - s / 2), s, s)}" aria-label="${n.big ? '大點' : '小點'}"><i></i></button>`;
  }).join('');
  const mm = port ? 120 : 160;
  const card =
    S.treeSel != null
      ? `<div class="tcard" id="d-tcard" style="${port ? `left:0;right:0;bottom:0;max-height:${Math.round(H * 0.4)}px` : `left:${Math.min(W - 316, cx + 40)}px;top:${cy - 60}px;width:300px`}"><b>${t(S.treeSel === 30 ? tr.goal[0] : '鐵骨')}</b><p>${t('+30% 護甲；生命低於一半時受到的傷害降低 8%')}</p><div class="row2"><button class="btn pri kf" data-k="path" data-hit="1" data-act="path" style="width:${port ? 250 : 200}px;height:52px">${t('點這條路（{n} 點）', { n: tr.goal[1] })}</button><button class="btn sec kf" data-k="pin" data-hit="1" data-act="pin" style="width:108px;height:52px">${t('釘成目標')}</button></div></div>`
      : '';
  const reset = `<button class="btn danger hold kf" data-k="reset" data-hit="1" data-hold="reset" data-ms="600" id="d-reset"><i class="fill"></i><span>${S.hold && S.hold.k === 'reset' ? t('會退回 {n} 點', { n: tr.total }) : t('長按重置')}</span></button>`;
  const zone = `<div class="zone" id="d-zone">${t(tr.zones[0])}</div>`;
  const mini = `<div class="mini" id="d-mini" style="width:${mm}px;height:${mm}px"><i class="me"></i></div>`;
  const srch = S.searchOn
    ? `<input class="srch kf" id="d-srch" data-k="srch" value="${esc(S.treeQ)}" placeholder="${t('搜尋天賦')}">`
    : '';
  return `<section class="ab tree" id="p-tree" data-box="tree" style="${px(0, 0, W, H)}">${top}${goal}${srch}<div class="tarea">${nodes}</div>${zone}${mini}${reset}${card}</section>`;
}

/* ---------- 6 追逐物品＋王印 ---------- */
function chaseHTML(g) {
  const sv = SV(),
    port = g.port,
    r = port ? drawerR(g) : g.R;
  if (S.sub === 'apply') return shell(g, 'chase', r, applyHTML(g), (port ? 'drawer ' : 'rcol ') + 'push');
  const got = sv.seals.filter(s => !s.never).length;
  const pity = S.pity != null ? S.pity : sv.pity;
  const no = (S.mobOv || sv.mobLv) < 45;
  const cells = sv.seals
    .map(
      s =>
        `<div class="sc${s.never ? ' never' : ''}${S.selSeal === s.k ? ' sel' : ''}${NOW - S.applyT < 520 && S.selSeal === s.k ? ' apply' : ''}" data-seal="${s.k}">${art(WY[s.k] + '_16', 2)}<div><b>${t(s.k)}</b><p class="fx">${t(s.fx)}</p><p class="cnt">${s.never ? t('還沒拿到') : t('擁有 {a}・身上 {b}', { a: nA(s.own), b: nA(s.on) })}</p></div>${!s.never ? `<button class="btn sec kf${s.own ? '' : ' off'}" data-k="ap-${s.k}" data-hit="1" data-act="${s.own ? 'apply' : 'deny'}" data-seal="${s.k}">${t('套到裝備')}</button>` : ''}</div>`
    )
    .join('');
  const bar = no
    ? `<p class="nopity" id="d-nopity">${t('這裡不累積保底：怪物 Lv 45 以上的地點才會累積')}</p>`
    : `<div class="pity2${pity >= 100 ? ' full' : ''}" id="d-pity"><span>${t('下一件保底 {n}%', { n: pity })}</span><i class="pb"><i style="width:${pity}%"></i></i><button class="ic44 kf" data-k="pinfo" data-hit="1" data-act="pinfo" aria-label="說明">ⓘ</button></div>`;
  return shell(
    g,
    'chase',
    r,
    `<div class="hd"><b class="t15">${t('追逐物品')}</b><span class="dim">${t('王印')} ${got}／4</span>${xBtn()}</div><div class="cbody2">${bar}<div class="scg" id="d-scg">${cells}</div><button class="btn sec kf" data-k="reroll" data-hit="1" data-act="reroll">${t('重擲印詞')}</button></div>`,
    port ? 'drawer' : 'rcol'
  );
}
function applyHTML(g) {
  const sv = SV(),
    k = S.selSeal || '赤霄印';
  const l = sv.eq.map((e, i) => [e, i]).filter(([e]) => e && !e.lock);
  const rows = l
    .map(([e, i]) => {
      const okR = e.rar === 'magic' || e.rar === 'rare';
      const why = !okR ? '只能套在打造的藍裝或黃裝' : e.seal ? '已經有王印' : '';
      return `<button class="ar kf${why ? ' no' : ''}" data-k="ar${i}" data-hit="1" data-ar="${i}" ${why ? 'aria-disabled="true"' : ''}>${art(FX.IC[i], 1)}<span class="${rc(e)}">${mk(e)}${t(e.n)}${e.cor ? ` <span class="tag">${t('已腐化')}</span>` : ''}</span>${why ? `<span class="off">${t(why)}</span>` : `<b class="good num">DPS +${(i % 3) + 1}%・${t('生命')} +${(i % 4) + 2}%</b>`}</button>`;
    })
    .join('');
  return `<div class="hd">${backBtn()}<b>${t('把{k}套到…', { k: t(k) })}</b>${xBtn()}</div><div class="apl" id="d-apl">${rows}</div>`;
}
/* 追逐橫幅（W08）：直立 148–212（374×64）；桌機 x 16–340、y 76–140 */
function bannerHTML(g) {
  if (!S.banner) return '';
  const r = g.port ? [8, 148, 382, 212] : [16, 76, 340, 140];
  return `<button class="ab chbn kf" data-box="banner" data-k="banner" data-hit="1" data-act="banner" style="${px(r[0], r[1], r[2] - r[0], r[3] - r[1])}">${art('wangyin_guixu_16', 2)}<span><b>${t('追逐物品：歸墟印')}</b><br><span class="dim">${t('點一下看追逐物品')}</span></span></button>`;
}

/* ---------- 確認卡（完整數字）、吐司 ---------- */
function dlgHTML(g) {
  const d = S.dlg;
  if (!d) return '';
  const w = g.port ? g.W : 400;
  const x = (g.W - w) / 2;
  let body = '',
    btns = '';
  if (d.k === 'corrupt') {
    body = `<h3>${t('腐化 {n}？', { n: t(SV().eq[0].n) })}</h3><p>${t('結果：隨機加一條腐化詞，或改掉一條詞，或沒有變化')}</p><p class="bad nr">${t('不能復原')}</p>${SV().eq[0].seal || d.seal ? `<p>${t('帶王印：腐化後印詞留著')}</p>` : ''}<p class="dim">${t('花費 腐化石 {a}・擁有 {b}', { a: full(1, 'cost'), b: full(SV().cur.find(c => c[0] === '腐化石')[2]) })}</p>`;
    btns = `<button class="btn danger hold kf" data-k="dhold" data-hit="1" data-hold="corrupt" data-ms="600" style="width:${g.port ? 226 : 240}px;height:56px"><i class="fill"></i><span>${t('長按腐化')}</span></button><button class="btn sec kf" data-k="dcancel" data-hit="1" data-act="dlg-off" style="width:132px;height:56px">${t('取消')}</button>`;
  } else if (d.k === 'reroll') {
    /* W06：鈕 226 寬兩行（名詞表 v0.6.15）；擁有＝還能套用的庫存；0 時停用、副行就是原因 */
    const it = SV().eq[0],
      s = it.seal;
    const own = S.sealOwn0 ? 0 : SV().seals.find(x => x.k === s.k).own;
    body = `<h3>${t('重擲印詞？')}</h3><p>${t('{i}・{k}', { i: t(it.n), k: t(s.k) })}</p><p>${t('現在：{m}', { m: t(s.mod) })}</p><p>${t('重擲後從 24 條隨機抽一條，舊詞不留')}</p><p class="bad nr">${t('不能復原')}</p>`;
    const k = t(s.k);
    btns = own
      ? `<button class="btn danger hold two kf" data-k="dhold" data-hit="1" data-hold="reroll" data-ms="600" style="width:226px;height:56px"><i class="fill"></i><span><b>${t('長按重擲印詞')}</b><small>${t('花 1 枚{k}・擁有 {n}', { k, n: full(own) })}</small></span></button>`
      : `<button class="btn off two kf" data-k="dhold" data-hit="1" data-act="deny" aria-disabled="true" style="width:226px;height:56px"><span><b>${t('長按重擲印詞')}</b><small>${t('要 1 枚{k}・擁有 0', { k })}</small></span></button>`;
    btns += `<button class="btn sec kf" data-k="dcancel" data-hit="1" data-act="dlg-off" style="width:132px;height:56px">${t('取消')}</button>`;
  } else if (d.k === 'ii') {
    const souls = SV().res.find(r => r[0] === '靈魂')[1];
    body = `<h3>${t('解鎖 II？')}</h3><p>${t('花費 靈魂 {a}・擁有 {b}', { a: full(SV().sk.iiCost, 'cost'), b: full(souls) })}</p>`;
    btns = `<button class="btn pri hold kf" data-k="dhold" data-hit="1" data-hold="ii-go" data-ms="600" style="width:${g.port ? 226 : 240}px;height:56px"><i class="fill"></i><span>${t('解鎖 II・{c}', { c: full(SV().sk.iiCost, 'cost') })}</span></button><button class="btn sec kf" data-k="dcancel" data-hit="1" data-act="dlg-off" style="width:132px;height:56px">${t('取消')}</button>`;
  } else if (d.k === 'pinfo') {
    body = `<h3>${t('下一件保底')}</h3><p>${t('保底滿 100% 就會掉一件追逐物品')}</p><p class="dim">${t('怪物 Lv 45 以上的地點才會累積')}</p>`;
    btns = `<button class="btn sec kf" data-k="dcancel" data-hit="1" data-act="dlg-off" style="width:132px;height:48px">${t('知道了')}</button>`;
  }
  const brk = NOW - S.rerollT < 580 ? ` style="--rp:${Math.min(1, (NOW - S.rerollT) / 300).toFixed(3)}"` : '';
  return `<div class="ab scrim" data-float="1" style="${px(0, 0, g.W, g.H)}"></div><div class="ab card dlg${NOW - S.rerollT < 580 ? ' brk' : ''}" data-float="1" id="d-dlg" role="dialog" style="${px(x, g.port ? g.H - 380 : (g.H - 300) / 2, w, null)}"${brk}>${body}<div class="row2">${btns}</div></div>`;
}
function toastHTML(g) {
  if (!S.toast || NOW - S.toastT > 2400) return '';
  return `<div class="ab toast" data-float="1" id="d-toast" style="${g.port ? px(16, 100, g.W - 32, null) : px(500, 140, 336, null)}">${esc(S.toast)}</div>`;
}
/* 回來補算（P03；名詞表 v0.6.15）：「天賦樹期間 靈魂 +{n}・{k} 件・◆ {r}」；0 的項不寫；{n} 縮寫捨去；開著 < 10 秒不出 */
function gainText(gn) {
  const parts = [t('靈魂 +{n}', { n: abbr(gn.soul) })];
  if (gn.items) parts.push(t('{k} 件', { k: abbr(gn.items) }));
  if (gn.rare) parts.push(`◆ ${abbr(gn.rare)}`);
  return t(gn.stele ? '昇華石碑期間 {p}' : '天賦樹期間 {p}', { p: parts.join(P.en ? ' · ' : '・') });
}
const gainHTML = g => {
  if (!S.gain) return '';
  const e = NOW - S.gainT;
  if (e < 160 || e > 160 + 3000 + 300) return '';
  const op = P.rm ? 1 : e > 3160 ? 1 - (e - 3160) / 300 : 1;
  return `<div class="ab plate gain" data-float="1" id="d-gain" style="${g.port ? px(8, 52, 374, null) : px(500, 140, 336, null)}opacity:${op.toFixed(3)}">${gainText(S.gain)}</div>`;
};

/* ---------- 組畫面 ---------- */
const UI = () => $('ui');
let ANIM_UNTIL = 0;
const animFor = ms => (ANIM_UNTIL = Math.max(ANIM_UNTIL, NOW + ms));
function labelsHTML(g) {
  if (S.full) return '';
  /* 待素材（主視覺底圖）＋假資料；這一列用了假定狀態時多一行：畫在戰場上，不擋 HUD */
  const nar = !g.port && g.R[0] - 504 < 200;
  const r = g.port ? [8, 52, 196, 102] : [500, 150, nar ? g.R[0] - 4 : 720, 206];
  const note = { leg: '假定：中期沒有傳奇', frac: '假定：中期做不到破裂', empty: '假定：新手倉庫其實 4 件' }[
    S.asm || (S.stashEmpty ? 'empty' : '')
  ];
  return box(
    r,
    'lbl',
    'plate lbl',
    `<span class="badge warn">${nar ? '待素材' : S.camp ? '待素材：營地底圖' : '待素材：戰場底圖'}</span><span class="badge warn" title="${esc(FX.PH)}">假資料</span>${note ? `<span class="badge warn">${note}</span>` : ''}`
  );
}
function campHTML(g) {
  if (!S.camp) return '';
  const r = g.port ? [8, 104, 196, 144] : [500, 214, 836, 250];
  return box(r, 'campl', 'plate campl', `<span>${t('營地中・戰鬥暫停、回來補算')}</span>`);
}
function fadeHTML(g) {
  if (S.treeCT < 0 || P.rm) return '';
  const e = NOW - S.treeCT;
  if (e >= 160) return '';
  return `<div class="ab fade" data-float="1" style="${px(0, 0, g.W, g.H)}opacity:${(1 - e / 160).toFixed(3)}"></div>`;
}
function flyHTML(g) {
  if (S.salOne < 0) return '';
  const e = NOW - S.salOne;
  if (e > 300 || P.rm) return '';
  const p = e / 300,
    from = g.port ? [200, 600] : [1000, 400],
    to = g.port ? [120, 70] : [200, 34];
  return `<div class="ab fly badge good" data-float="1" style="${px(from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p, 80, 20)}">${t(S.salGain.m)} +${full(S.salGain.mat)}</div>`;
}
function build() {
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
  b.classList.toggle('fs130', P.fs);
  b.classList.toggle('en', P.en);
  b.classList.toggle('rm', P.rm);
  document.documentElement.style.setProperty('--tscale', P.fs ? 1.3 : 1);
  const ae = document.activeElement,
    fk = ae && ae.dataset && ae.dataset.k,
    fv = ae && ae.classList && ae.classList.contains('fv');
  const scr = {};
  ui.querySelectorAll('[id]').forEach(e => (e.scrollTop || e.scrollLeft) && (scr[e.id] = [e.scrollTop, e.scrollLeft]));
  let h = '';
  if (z.port && g.st) h += `<div class="safe" style="top:0;height:${g.st}px"></div>`;
  if (z.port && g.sb) h += `<div class="safe" style="top:${g.H - g.sb}px;height:${g.sb}px"></div>`;
  if (S.panel !== 'tree') {
    h +=
      labelsHTML(g) +
      campHTML(g) +
      resHTML(g) +
      feedHTML(g) +
      barsHTML(g) +
      flaskHTML(g) +
      skBtnHTML(g) +
      idleHTML(g) +
      navHTML(g);
    if (S.panel === 'char') h += charHTML(g);
    else if (S.panel === 'forge') h += forgeHTML(g);
    else if (S.panel === 'skill') h += skillHTML(g);
    else if (S.panel === 'chase') h += chaseHTML(g);
    h += bannerHTML(g) + gainHTML(g) + fadeHTML(g) + flyHTML(g);
  } else h += treeHTML(g);
  h += dlgHTML(g) + toastHTML(g);
  ui.innerHTML = h;
  for (const id in scr) {
    const e = $(id);
    if (e) (e.scrollTop = scr[id][0]), (e.scrollLeft = scr[id][1]);
  }
  if (fk) {
    const e = ui.querySelector(`[data-k="${CSS.escape(fk)}"]`);
    if (e) {
      e.focus({ preventScroll: true });
      if (fv) e.classList.add('fv');
    }
  }
  if (S.drag && S.dragXY) {
    const gh = document.createElement('div');
    gh.className = 'ab ghost';
    gh.dataset.float = 1;
    gh.style.cssText = px(S.dragXY[0] - 22, S.dragXY[1] - 22, 44, 44);
    gh.innerHTML = art('sk_attack', 1);
    ui.appendChild(gh);
  }
  fitIdle();
  applyAnim();
}
/* 掛機條放不下時（文字 130%、英文）：先收「掛機 n 分」，再收目標名，只留 %（不縮字、不裁字） */
function fitIdle() {
  const b = UI().querySelector('.idle .ib');
  if (!b) return;
  const over = () => b.scrollWidth > b.clientWidth + 1;
  if (over()) b.classList.add('t1');
  if (over()) b.classList.add('t2');
}
/* 每格更新：抽屜、推入子頁、比較列、按住進度（不重組 DOM 的部分） */
function ease(p) {
  return 1 - Math.pow(1 - p, 3);
}
function applyAnim() {
  const g = geo();
  const pn = S.panel && S.panel !== 'tree' ? document.querySelector('.pnl.drawer, .pnl.rcol') : null;
  document.querySelectorAll('.pnl.drawer, .pnl.rcol, .pnl:not(.tip)').forEach(e => (e.style.transform = ''));
  if (S.panel && S.panel !== 'tree') {
    const els = UI().querySelectorAll('section.pnl');
    const oe = NOW - S.dT,
      ce = S.dCT > 0 ? NOW - S.dCT : -1;
    let tr = '',
      op = '';
    if (ce >= 0) {
      const p = Math.min(1, ce / (P.rm ? 150 : 160));
      if (P.rm) op = 1 - p;
      else
        tr = g.port
          ? `translateY(${(ease(p) * (g.dBot - g.dTop)).toFixed(2)}px)`
          : `translateX(${(ease(p) * 440).toFixed(2)}px)`;
    } else if (oe < (P.rm ? 150 : 200)) {
      const p = Math.max(0, oe) / (P.rm ? 150 : 200);
      if (P.rm) op = p;
      else
        tr = g.port
          ? `translateY(${((1 - ease(p)) * (g.dBot - g.dTop)).toFixed(2)}px)`
          : `translateX(${((1 - ease(p)) * 440).toFixed(2)}px)`;
    }
    els.forEach(e => {
      if (e.classList.contains('tip')) return;
      e.style.transform = tr;
      e.style.opacity = op === '' ? '' : op.toFixed(3);
    });
    /* 推入子頁：200 ms 從右滑入 */
    const pe = NOW - S.pushT;
    if (pe < 200 && !P.rm)
      UI()
        .querySelectorAll('section.push')
        .forEach(e => (e.style.transform = `translateX(${((1 - ease(pe / 200)) * 100).toFixed(2)}%)`));
    /* 比較列 160 ms 升起 */
    const c = UI().querySelector('.cmp:not(.none)');
    const se = NOW - S.selT;
    if (c && se < 160 && !P.rm)
      (c.style.transform = `translateY(${((1 - ease(se / 160)) * 24).toFixed(2)}px)`),
        (c.style.opacity = (se / 160).toFixed(3));
  }
  if (S.hold) {
    const e = UI().querySelector(`[data-hold="${S.hold.k}"] .fill`);
    if (e) e.style.width = Math.min(100, ((NOW - S.hold.t0) / S.hold.ms) * 100).toFixed(1) + '%';
  }
  /* 停用、缺料：120 ms 抖 2 px × 2 */
  if (S.shakeK) {
    const e = UI().querySelector(`[data-k="${S.shakeK}"]`),
      se = NOW - S.shakeT;
    if (e)
      e.style.transform =
        se < S.shakeD && !P.rm ? `translateX(${(2 * Math.sin((se / S.shakeD) * Math.PI * 4)).toFixed(2)}px)` : '';
  }
}

/* ---------- 時鐘 ---------- */
function step(dt) {
  const prev = NOW;
  NOW += dt;
  const paused = S.panel === 'tree' || S.camp;
  if (!paused) FT += dt;
  /* 抽屜：開完那幀改戰場；關完那幀拿掉面板 */
  if (S.panel && S.panel !== 'tree') {
    if (!S.dOpen && S.dCT < 0 && NOW - S.dT >= (P.rm ? 150 : 200)) {
      S.dOpen = 1;
      log('field-resize', { open: 1 });
      if (isPort()) S.camOff = 0;
      build();
    }
    if (S.dCT > 0 && NOW - S.dCT >= (P.rm ? 150 : 160)) {
      log('drawer-closed', { ms: NOW - S.dCT });
      S.panel = null;
      S.sub = null;
      S.dCT = -1e9;
      build();
    }
  }
  if (S.camT != null) {
    const e = NOW - S.camT;
    S.camOff = e >= 160 || P.rm ? 0 : S.cam0 * (1 - ease(e / 160));
    if (e >= 160) S.camT = null;
  }
  /* 按住 */
  if (S.hold && NOW - S.hold.t0 >= S.hold.ms) {
    const k = S.hold.k,
      ms = S.hold.ms;
    S.hold = null;
    log('hold-done', { k, ms });
    act(k);
  }
  /* 分解動畫做完才真的拿掉 */
  if (S.salSet && NOW - S.salT >= 400) {
    S.salSet.forEach(i => S.gone.add(i));
    if (S.batch) (S.batch = 0), (S.chk = null);
    log('salvage-done', { n: S.salSet.size, ms: NOW - S.salT });
    S.salSet = null;
    if (S.fromForge) (S.fromForge = 0), (S.batch = 0), (S.chk = null), openPanel('forge', 1), (S.seg = 'craft');
    build();
  }
  /* 翻牌 */
  if (S.flipT > 0 && S.flipped < 1) {
    const plan = flipPlan();
    plan.forEach((o, i) => {
      if (!S.flipLog[i] && (P.rm || S.flipAll || NOW - S.flipT >= o.at)) {
        S.flipLog[i] = 1;
        log('flip-start', { i, at: P.rm || S.flipAll ? NOW - S.flipT : o.at, d: o.d });
      }
    });
    const end = plan[plan.length - 1];
    if (P.rm || S.flipAll || NOW - S.flipT >= end.at + end.d) {
      S.flipped = 1;
      log('flip-end', { ms: NOW - S.flipT });
      animFor(400);
    }
  }
  if (S.goalWatch && NOW - S.goal100T >= 160 && prev - S.goal100T < 160) build();
  if (NOW < ANIM_UNTIL || (S.flipT > 0 && S.flipped < 1) || S.hold || S.salSet) build();
  else if (prev < ANIM_UNTIL) build();
  else applyAnim();
  drawField();
}
let last = 0;
function raf(ts) {
  if (!last) last = ts;
  const dt = Math.min(50, ts - last);
  last = ts;
  step(dt);
  requestAnimationFrame(raf);
}

/* ---------- 動作 ---------- */
function openPanel(k, instant) {
  if (S.panel === k && !instant) return closePanel();
  const was = S.panel;
  S.panel = k;
  S.sub = null;
  S.dCT = -1e9;
  if (k === 'tree') {
    S.treeT = NOW;
    log('tree-open', { ft: FT });
    return build();
  }
  if (was && was !== 'tree' && !instant) {
    S.dOpen = 1;
    return build();
  }
  S.dT = instant ? NOW - 1000 : NOW;
  S.dOpen = instant ? 1 : 0;
  log('drawer-open', {});
  animFor(instant ? 0 : 220);
  build();
}
function closePanel() {
  if (!S.panel) return;
  if (S.panel === 'tree') {
    const sec = (NOW - S.treeT) / 1000,
      tg = SV().treeGain;
    S.gain =
      sec < 10
        ? null
        : {
            soul: Math.floor((tg.soul / tg.sec) * sec),
            items: Math.floor((tg.items / tg.sec) * sec),
            rare: Math.floor((tg.rare / tg.sec) * sec),
            stele: S.sub === 'stele' ? 1 : 0
          };
    S.panel = null;
    S.sub = null;
    S.treeCT = NOW;
    S.gainT = NOW;
    log('tree-close', { sec, gain: S.gain });
    animFor(3500);
    return build();
  }
  S.dCT = NOW;
  if (isPort()) {
    const g = geo();
    S.dOpen = 0;
    S.cam0 = (g.st + g.dTop) / 2 - (g.st + g.idleTop) / 2;
    S.camOff = S.cam0;
    S.camT = NOW;
  }
  log('drawer-close', {});
  animFor(200);
  build();
}
function push(sub) {
  S.sub = sub;
  S.pushT = NOW;
  log('push', { sub });
  animFor(220);
  build();
}
function back() {
  if (S.dlg) return (S.dlg = null), build();
  if (S.panel === 'tree' && S.sub) return (S.sub = null), build();
  if (S.sub) return (S.sub = null), log('back', {}), build();
  if (S.batch) return (S.batch = 0), (S.chk = null), build();
  if (S.sel != null || S.pick != null) return (S.sel = null), (S.pick = null), build();
  closePanel();
}
function deny(k) {
  if (NOW - S.lastDeny < 300) return log('deny-skip', { k });
  S.lastDeny = NOW;
  S.shakeK = k;
  S.shakeT = NOW;
  S.shakeD = 120;
  log('deny', { k });
  beep();
  animFor(140);
  build();
}
let AC = null;
function beep() {
  if (CAP) return;
  try {
    AC = AC || new AudioContext();
    const o = AC.createOscillator(),
      gn = AC.createGain();
    o.frequency.value = 180;
    gn.gain.value = 0.04;
    o.connect(gn).connect(AC.destination);
    o.start();
    o.stop(AC.currentTime + 0.08);
  } catch (e) {}
}
function toast(s) {
  S.toast = s;
  S.toastT = NOW;
  animFor(2500);
}
function bestPick(slot) {
  const l = invList().filter(x => x.slot === slotOf(slot) && !x.no);
  l.sort((a, b) => (b.up || 0) - (a.up || 0));
  return l.length ? l[0]._i : null;
}
function equip() {
  const it = byI(S.pick);
  if (!it || it.no) return deny('equip');
  const sv = SV();
  S.upKind = it.up || 0;
  S.dPct = it.up === 2 ? sv.cmp.big.d.dps : it.up ? sv.cmp.pick.d.dps : 0;
  S.newDps = Math.round(sv.st.dps * (1 + S.dPct / 100));
  S.newIc = it.ic;
  S.eqT = NOW;
  log('equip', { up: S.upKind });
  S.gone.add(S.pick);
  S.pick = null;
  S.sel = null;
  if (S.sub === 'detail') S.sub = null;
  animFor(1800);
  build();
}
function salvage(set) {
  const ord = new Map();
  [...set].forEach((i, j) => ord.set(i, Math.min(220, j * 20))); /* 每件隔 20、總 ≤ 400 */
  S.salSet = new Set(set);
  S.salOrd = ord;
  S.salT = NOW;
  S.salOne = NOW;
  S.salGain = salGain(set);
  log('salvage', { n: set.size });
  if (set.size === 1) S.pick = null;
  animFor(450);
  build();
}
function act(a, el) {
  const sv = SV();
  switch (a) {
    case 'close':
      return closePanel();
    case 'back':
      return back();
    case 'stats':
      return push('stats');
    case 'detail':
      return push('detail');
    case 'rules':
      return push('rules');
    case 'equip':
      return equip();
    case 'lock': {
      const it = byI(S.pick);
      if (it) it.lock = !it.lock;
      return build();
    }
    case 'flask':
      return drink(el ? el.dataset.f : 'hp');
    case 'curdetail':
      openPanel('forge', S.panel != null);
      S.seg = 'cur';
      return build();
    case 'showcur':
      S.showCur = S.showCur ? 0 : 1;
      return build();
    case 'eqlock':
      toast(el ? el.dataset.why : '');
      return build();
    case 'sal1':
      return salvage(new Set([S.pick]));
    case 'salAll':
      return salvage(new Set(S.chk));
    case 'batch-on':
      S.batch = 1;
      S.sel = null;
      S.pick = null;
      S.chk = new Set(
        invList()
          .filter(preSel)
          .map(x => x._i)
      );
      return build();
    case 'batch-off':
      S.batch = 0;
      S.chk = null;
      return build();
    case 'unsel':
      S.sel = null;
      S.pick = null;
      return build();
    case 'toforge':
      S.part = 0;
      return openPanel('forge', 1), (S.seg = 'craft'), build();
    case 'tidy':
      S.fromForge = 1;
      openPanel('char', 1);
      return act('batch-on');
    case 'deny':
      return deny(el && el.dataset.k);
    case 'craft':
      if (invFree() < sv.forge.counts[S.count != null ? S.count : sv.forge.count]) return deny('craft');
      if (S.flipT > 0 && S.flipped < 1) return act('flipall');
      S.flipT = NOW;
      S.flipAll = 0;
      S.flipped = 0;
      S.flipLog = {};
      log('craft', {});
      return build();
    case 'flipall':
      if (S.flipT > 0 && S.flipped < 1) (S.flipAll = 1), log('flip-all', { ms: NOW - S.flipT });
      return build();
    case 'chpart':
      S.flipT = -1e9;
      return build();
    case 'tier-':
    case 'tier+': {
      const f = sv.forge,
        cur = S.tier != null ? S.tier : f.tier,
        nx = cur + (a === 'tier+' ? 1 : -1);
      if (nx < 0 || nx >= f.tiers.length) {
        toast(nx >= f.tiers.length ? `${f.tierLock[0]}：${f.tierLock[1]}` : '已經是最低階');
        return deny(a);
      }
      S.tier = nx;
      return build();
    }
    case 'anvil-swap':
    case 'anvil-pick':
      S.anvil = 1;
      return build();
    case 'use':
      if (NOW - (S.useT || -1e9) < 300) return log('use-skip', {});
      S.useT = NOW;
      if (S.useK === '腐化石') return (S.dlg = { k: 'corrupt' }), build();
      S.useN = Math.max(0, S.useN - 1);
      log('use', { k: S.useK, left: S.useN });
      return build();
    case 'corrupt':
      S.dlg = null;
      toast('腐化完成：加了一條腐化詞');
      return build();
    case 'ii':
      S.dlg = { k: 'ii' };
      return build();
    case 'ii-go':
      S.dlg = null;
      toast('解鎖 II 了');
      return build();
    case 'skup':
      toast('升級完成');
      return build();
    case 'socket':
      toast('已插上輔助');
      S.sub = null;
      return build();
    case 'stele':
      return S.sub === 'stele' ? ((S.sub = null), build()) : ((S.sub = 'stele'), build());
    case 'tclose':
      return S.sub ? back() : closePanel();
    case 'search':
      S.searchOn = 1;
      build();
      return $('d-srch') && $('d-srch').focus();
    case 'findme':
      log('findme', {});
      return build();
    case 'pin':
      S.goalPin = 0;
      toast('已釘成目標');
      return build();
    case 'path':
      S.lightT = NOW;
      log('path', {});
      animFor(700);
      return build();
    case 'reset':
      toast('天賦已重置，退回 ' + sv.tree.total + ' 點');
      return build();
    case 'apply':
      S.selSeal = el ? el.dataset.seal : '赤霄印';
      return push('apply');
    case 'seal-from-char':
      S.selSeal = '赤霄印';
      openPanel('chase', 1);
      return push('apply');
    case 'reroll':
      S.dlg = { k: 'reroll' };
      return build();
    case 'pinfo':
      S.dlg = { k: 'pinfo' };
      return build();
    case 'dlg-off':
      S.dlg = null;
      return build();
    case 'banner':
      S.banner = 0;
      S.selSeal = '歸墟印';
      return openPanel('chase');
  }
  if (a === 'reroll-go' || a === 'reroll') return;
}
/* 重擲：長按 600 完成 → 碎 300 → 落 280 */
const _act = act;
act = function (a, el) {
  if (a === 'reroll' && S.dlg && S.dlg.k === 'reroll') {
    S.rerollT = NOW;
    log('reroll', {});
    animFor(600);
    setTimeoutV(580, () => {
      S.dlg = null;
      toast('印詞重擲好了');
      build();
    });
    return build();
  }
  return _act(a, el);
};
/* 虛擬時鐘上的延遲 */
const LATER = [];
function setTimeoutV(ms, fn) {
  LATER.push({ at: NOW + ms, fn });
}
const _step = step;
step = function (dt) {
  _step(dt);
  for (let i = LATER.length - 1; i >= 0; i--) if (NOW >= LATER[i].at) LATER.splice(i, 1)[0].fn();
};

/* ---------- 點擊 ---------- */
function onClick(e) {
  const b = e.target.closest('button, [data-act], .nab');
  if (!b) return;
  if (b.classList.contains('nab')) return showFull(b);
  const d = b.dataset;
  if (b.dataset.hold) return; /* 按住的鈕交給 pointerdown */
  if (d.act) return act(d.act, b);
  if (d.tab)
    return d.tab === 'camp' || d.tab === 'more'
      ? (toast(d.tab === 'camp' ? '營地（D1 範圍）' : '更多（D1 範圍）'), build())
      : openPanel(d.tab);
  if (d.eq != null) {
    const i = +d.eq;
    S.sel = S.sel === i ? null : i;
    S.pick = S.sel != null ? bestPick(i) : null;
    S.selT = NOW;
    log('select', { slot: i });
    animFor(180);
    return build();
  }
  if (d.st != null) {
    const i = +d.st;
    if (S.batch) {
      S.chk.has(i) ? S.chk.delete(i) : S.chk.add(i);
      return build();
    }
    if (S.panel === 'forge' && S.seg === 'anvil') return (S.anvil = 1), build();
    S.pick = i;
    S.selT = NOW;
    log('select', { st: i });
    animFor(180);
    return build();
  }
  if (d.f) return (S.filter = d.f), build();
  if (d.seg) return (S.seg = d.seg), (S.flipT = -1e9), build();
  if (d.part != null) return (S.part = +d.part), build();
  if (d.cnt != null) return (S.count = +d.cnt), build();
  if (d.use) {
    if (b.getAttribute('aria-disabled')) return deny(d.k);
    S.useK = d.use;
    S.useN = +d.v;
    return build();
  }
  if (d.nd != null) return (S.treeSel = +d.nd), build();
  if (d.pr != null) return (S.picked = +d.pr), build();
  if (d.hole) {
    if (S.drag) {
      log('drop', { from: S.drag.from, to: d.hole });
      S.drag = null;
      S.dragXY = null;
      return build();
    }
    S.sub = 'pick';
    S.picked = 0;
    S.pushT = NOW;
    animFor(220);
    return build();
  }
  if (d.ar != null) {
    if (b.getAttribute('aria-disabled')) return deny(d.k);
    const it = SV().eq[+d.ar];
    S.applyT = NOW;
    log('apply', { k: S.selSeal });
    toast(`${S.selSeal}套在${it.n}上了`);
    S.sub = null;
    animFor(560);
    return build();
  }
  if (d.k === 'idle') return toast('掛機條（D1 範圍）'), build();
}
function showFull(b) {
  S.toast = b.dataset.full;
  S.toastT = NOW;
  animFor(2500);
  build();
}
/* 按住：滑鼠／觸控按下開始，放開取消；鍵盤 X／Delete 走同一套 */
function holdStart(k, ms) {
  S.hold = { k, t0: NOW, ms };
  log('hold-start', { k, ms });
  build();
}
function holdEnd() {
  if (S.hold) log('hold-cancel', { k: S.hold.k, ms: NOW - S.hold.t0 }), (S.hold = null), build();
}
let pressT = null;
function onDown(e) {
  const h = e.target.closest('[data-hold]');
  if (h) return holdStart(h.dataset.hold, +h.dataset.ms);
  const ho = e.target.closest('.hole.has');
  if (ho) pressT = { at: NOW, k: ho.dataset.hole };
}
function onMove(e) {
  if (pressT && !S.drag && NOW - pressT.at >= 400) {
    S.drag = { from: pressT.k };
    log('drag-start', { ms: NOW - pressT.at });
  }
  if (S.drag) {
    const r = UI().getBoundingClientRect(),
      z = SIZES[P.size];
    S.dragXY = [(e.clientX - r.left) / (z.port ? 1 : z.z), (e.clientY - r.top) / (z.port ? 1 : z.z)];
    build();
  }
}
function onUp() {
  pressT = null;
  holdEnd();
}

/* ---------- 鍵盤（KB01–KB06） ---------- */
const KEYTAB = { i: 'char', b: 'char', v: 'char', k: 'forge', o: 'forge', g: 'skill', p: 'tree', u: 'tree' };
const DOWN = {};
function onKey(e) {
  const k = e.key,
    lk = k.toLowerCase(),
    inInput = e.target && e.target.tagName === 'INPUT';
  if (k === 'Shift' && S.sub === 'detail' && !isPort()) {
    const on = e.type === 'keydown' ? 1 : 0;
    if (S.showCur !== on) (S.showCur = on), build();
  }
  if (e.type === 'keyup') {
    DOWN[lk] = 0;
    if ((lk === 'x' || k === 'Delete') && S.hold) holdEnd();
    return;
  }
  if (DOWN[lk] && (lk === 'x' || k === 'Delete')) return e.preventDefault();
  DOWN[lk] = 1;
  if (k === 'Tab') return setTimeout(() => markFv(), 0);
  if (k === 'Escape') {
    e.preventDefault();
    if (inInput) return (S.searchOn = 0), build();
    log('esc', {});
    return back();
  }
  if (inInput) return; /* KB06：搜尋框焦點時字母鍵不觸發 */
  if (k === '1' || k === '2') return drink(k === '1' ? 'hp' : 'mp');
  if (S.panel === 'tree') {
    if (k === '/') return e.preventDefault(), act('search');
    if (lk === 'f') return act('findme');
    if (lk === 't') return act('pin');
    if (k === 'Enter' && S.treeSel != null) return e.preventDefault(), act('path');
    if (k === 'Delete') return holdStart('reset', 600);
  }
  if (KEYTAB[lk] && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    const tab = KEYTAB[lk];
    if (S.panel === tab && ((lk !== 'o' && lk !== 'u') || (lk === 'o' ? S.seg === 'anvil' : S.sub === 'stele')))
      return closePanel();
    openPanel(tab, S.panel != null);
    if (lk === 'o') S.seg = 'anvil';
    if (lk === 'k') S.seg = 'craft';
    if (lk === 'u') S.sub = 'stele';
    if (lk === 'p') S.sub = null;
    return build();
  }
  if (k === 'Enter' && !(e.target && e.target.matches && e.target.matches('button'))) {
    const pri = UI().querySelector('.btn.pri:not(.off), .btn.craft');
    if (pri) return e.preventDefault(), pri.click();
  }
  if (lk === 'l' && S.pick != null) return act('lock');
  if (lk === 'x' && (S.pick != null || S.batch))
    return holdStart(S.batch ? 'salAll' : 'sal1', S.batch ? 600 : protectedIt(byI(S.pick)) ? 1200 : 600);
  if (k === 'Delete' && S.sel != null) return toast('已卸下'), build();
  if (k === '[' || k === ']') {
    const f = SV().forge,
      c = S.count != null ? S.count : f.count;
    S.count = Math.max(0, Math.min(f.counts.length - 1, c + (k === ']' ? 1 : -1)));
    return build();
  }
}
function markFv() {
  UI()
    .querySelectorAll('.fv')
    .forEach(e => e.classList.remove('fv'));
  const a = document.activeElement;
  if (a && UI().contains(a)) a.classList.add('fv'), log('focus', { k: a.dataset.k });
}

/* ---------- 清單列：[編號, 名稱, 存檔, 設定] ---------- */
const op = (k, extra) => () => {
  S.panel = k;
  S.dT = NOW - 1000;
  S.dOpen = 1;
  if (extra) extra();
};
const selBest = () => ((S.sel = 0), (S.pick = bestPick(0)), (S.selT = NOW - 1000));
const ROWS = [
  ['G01', '面板開著＋假戰場', 'mid', op('char')],
  ['G02', '藥劑（生命、魔力；冷卻環，不畫次數）', 'mid', op('forge')],
  ['G03', '貨幣列（金、靈魂；跟鍛造材料行同一數值）', 'mid', op('forge')],
  [
    'G04',
    '掛機條＋下一個目標（100% 亮＋營地點）',
    'mid',
    op('char', () => ((S.goalFull = 1), (S.goal100T = NOW - 400)))
  ],
  ['G05', '背景掉落與記號（稀有以上）', 'mid', op('chase')],
  ['G06', 'M2-36 色票', 'mid', op('skill')],
  ['G07', '主視覺：戰場底圖（待素材）', 'mid', op('char')],
  ['G08', '主視覺：營地底圖（待素材）', 'mid', op('forge', () => (S.camp = 1))],
  ['G09', '抽屜開、關（開好；滑入 200／滑出 160 見 V15、V16）', 'mid', op('forge')],
  ['G10', '推入子頁返回', 'mid', op('char', () => (S.sub = 'stats'))],
  ['E01', '角色主頁總覽（中期；裝備 10 格＋第三戒指＋護符）', 'mid', op('char')],
  ['E02', '裝備格・五種稀有度（傳奇 假定）', 'mid', op('char', () => (S.asm = 'leg'))],
  ['E03', '裝備格・空格（護符 2 格空，格數 假定）', 'mid', op('char')],
  ['E04', '點格（自動選中 ▲ 最大）', 'mid', op('char', selBest)],
  ['E05', '比較列', 'mid', op('char', selBest)],
  [
    'E06',
    '裝備 ▲／▲▲（差值停 1,500）',
    'mid',
    op(
      'char',
      () => ((S.eqT = NOW - 600), (S.upKind = 2), (S.dPct = 31), (S.newDps = 2413), (S.newIc = 'gear_weapon_11'))
    )
  ],
  ['E07', '倉庫空（新手；倉庫件數 假定 0）', 'new', op('char', () => (S.stashEmpty = 1))],
  ['E08', '倉庫快滿 ≥ 90%', 'near', op('char')],
  ['E09', '批次分解・勾選（H3 a 預選）', 'near', op('char', () => act('batch-on'))],
  [
    'E10',
    '分解保護件（長按 1,200＋不能復原；7 位數）',
    'big',
    op('char', () => (act('batch-on'), S.chk.add(6), S.chk.add(8)))
  ],
  [
    'E11',
    '數值子頁',
    'mid',
    op(
      'char',
      () => ((S.sub = isPort() ? 'stats' : null), (S.eqT = NOW - 800), (S.newDps = 2063), (S.dPct = 12), (S.upKind = 1))
    )
  ],
  ['E12', '不能裝備', 'mid', op('char', () => ((S.pick = 5), (S.selT = NOW - 1000)))],
  ['T01', '說明順序（比較總結在前）', 'mid', op('char', () => ((S.pick = 0), (S.sub = 'detail')))],
  ['T02', '差值接在每列（兩欄拿掉）', 'mid', op('char', () => ((S.pick = 0), (S.sub = 'detail')))],
  ['T03', '空槽', 'mid', op('char', () => ((S.pick = 0), (S.sub = 'detail'), (S.detailEmpty = 1)))],
  ['T04', '記號（★ 破裂、◆、印詞行王印；7 位數）', 'big', op('char', () => ((S.sel = 0), (S.sub = 'detail')))],
  ['T05', '最長英文、130%', 'en', op('char', () => ((S.pick = 0), (S.sub = 'detail')))],
  ['F01', '打造・一般', 'mid', op('forge')],
  ['F02', '材料不夠（熟鐵還差 12）', 'mid', op('forge', () => (S.lack = 1))],
  ['F03', '空格不夠（F4 b）', 'near', op('forge', () => (S.fill3 = 1))],
  ['F04', '去整理（批次分解預選）', 'near', op('char', () => ((S.fill3 = 1), (S.fromForge = 1), act('batch-on')))],
  ['F05', '翻牌中', 'mid', op('forge', () => ((S.flipT = NOW - 700), (S.flipped = 0), (S.flipLog = {})))],
  ['F06', '翻完', 'mid', op('forge', () => ((S.flipT = NOW - 5000), (S.flipped = 1), (S.flipLog = {})))],
  ['F07', '自動分解規則', 'mid', op('forge', () => (S.sub = 'rules'))],
  ['F08', '鍛造台・物品槽', 'mid', op('forge', () => (S.seg = 'anvil'))],
  ['F09', '鍛造台・能用清單', 'mid', op('forge', () => (S.seg = 'anvil'))],
  ['F10', '一般通貨連用', 'mid', op('forge', () => ((S.seg = 'anvil'), (S.useK = '崇高石'), (S.useN = 148)))],
  ['F11', '腐化（7 位數）', 'big', op('forge', () => ((S.seg = 'anvil'), (S.dlg = { k: 'corrupt' })))],
  ['F12', '不寫「保底」（鍛造畫面 0 次；稀有保底句）', 'mid', op('forge')],
  [
    'F13',
    '出 ★ 破裂（斜光＋★；中期做不到，假定）',
    'mid',
    op('forge', () => ((S.asm = 'frac'), (S.flipT = NOW - 5000), (S.flipped = 1), (S.flipLog = {})))
  ],
  ['SK01', '孔板', 'mid', op('skill')],
  ['SK02', '抽屜開著的 HUD', 'mid', op('skill')],
  ['SK03', '鎖住的孔', 'mid', op('skill')],
  ['SK04', '光環欄', 'mid', op('skill')],
  ['SK05', '挑選頁', 'mid', op('skill', () => ((S.sub = 'pick'), (S.picked = 0)))],
  ['SK06', '差值、差不多', 'mid', op('skill', () => ((S.sub = 'pick'), (S.picked = 3)))],
  ['SK07', 'II 解鎖（確認卡完整數字；7 位數）', 'big', op('skill', () => (S.dlg = { k: 'ii' }))],
  ['SK08', '升級（費用進位）', 'big', op('skill')],
  [
    'SK09',
    '搬移（長按 400 拖曳）',
    'mid',
    op('skill', () => ((S.drag = { from: '0-0' }), (S.dragXY = isPort() ? [250, 470] : [1100, 200])))
  ],
  ['SK10', '全版', 'mid', op('skill', () => (S.full = isPort() ? 1 : 0))],
  ['P01', '天賦樹滿版打開', 'mid', op('tree', () => (S.treeT = NOW))],
  ['P02', '戰鬥暫停', 'mid', op('tree', () => (S.treeT = NOW))],
  [
    'P03',
    '回來補算（停 4 分）',
    'mid',
    () => ((S.gain = { soul: 1167, items: 14, rare: 1 }), (S.gainT = NOW - 600), (S.treeCT = NOW - 600))
  ],
  ['P04', '頂列＋目標列', 'mid', op('tree')],
  ['P05', '節點三態＋大點＋昇華點', 'mid', op('tree')],
  ['P06', '說明卡', 'mid', op('tree', () => (S.treeSel = 30))],
  ['P07', '重置（長按中）', 'mid', op('tree', () => (S.hold = { k: 'reset', t0: NOW - 300, ms: 600 }))],
  ['P08', '昇華石碑（7 位數）', 'big', op('tree', () => (S.sub = 'stele'))],
  ['P09', '區名、小地圖', 'mid', op('tree')],
  ['P10', '關法（返回／× 關樹）', 'mid', op('tree')],
  ['W01', '追逐物品總覽', 'mid', op('chase')],
  ['W02', '保底 42%', 'mid', op('chase')],
  ['W03', '不累積地點（凍河口・怪物 Lv 43）', 'mid', op('chase', () => (S.mobOv = 43))],
  ['W04', '套到裝備・選件', 'mid', op('chase', () => ((S.selSeal = '赤霄印'), (S.sub = 'apply')))],
  [
    'W05',
    '套上（收縮＋彈、吐司）',
    'mid',
    op('chase', () => ((S.selSeal = '赤霄印'), (S.applyT = NOW - 200), toast('赤霄印套在鐵盔上了')))
  ],
  ['W06', '重擲印詞', 'mid', op('chase', () => (S.dlg = { k: 'reroll' }))],
  ['W07', '角色頁入口（比較列「套到裝備」）', 'mid', op('char', () => ((S.pick = 0), (S.selT = NOW - 1000)))],
  ['W08', '追逐橫幅', 'mid', () => (S.banner = 1)],
  ['KB01', '分頁鍵（鍵帽）', 'mid', op('forge')],
  ['KB02', '面板內焦點順序', 'mid', op('char', () => (S.focusK = 'eq3'))],
  ['KB03', '動作鍵（空格不夠 Enter 只給回饋）', 'near', op('forge', () => ((S.fill3 = 1), (S.focusK = 'craft')))],
  ['KB04', 'Esc 逐層（確認卡 → 子頁 → 面板）', 'mid', op('chase', () => ((S.sub = null), (S.dlg = { k: 'reroll' })))],
  ['KB05', '焦點框', 'mid', op('forge', () => (S.focusK = 'part2'))],
  ['KB06', '天賦樹（搜尋框焦點）', 'mid', op('tree', () => ((S.searchOn = 1), (S.treeQ = 'fk'), (S.focusK = 'srch')))]
];
const ROWK = Object.fromEntries(ROWS.map(r => [r[0], r]));
/* 每列的「狀態變體」：截圖腳本另外拍（W02 三張、E08 滿、F08 沒放、P04 沒釘、G02 冷卻中＝F2-2…） */
const VAR = {
  W02: { p0: () => (S.pity = 0), p100: () => (S.pity = 100) },
  E08: { full: () => ((P.save = 'full'), toast('倉庫滿了：去分解')) },
  F08: { none: () => (S.anvil = 0) },
  P04: { nogoal: () => (S.goalPin = 1) },
  E04: { lv: () => 0 },
  G02: {
    'F2-2': () => (S.fT.hp = NOW - 1500) /* 剛喝生命藥劑 1.5 秒（冷卻一半） */,
    hud: () => ((S.panel = null), (S.fT.hp = NOW - 1500)) /* 沒開面板：56／48 */,
    lowhp: () => ((S.panel = null), (S.lowhp = 1)) /* 低血、生命藥劑冷卻好：外框呼吸 */
  },
  P03: { short: () => ((S.panel = 'tree'), (S.treeT = NOW - 4000), (S.gain = null), closePanel()) },
  P08: { mid: () => ((P.save = 'mid'), (S.sub = 'stele')) },
  W06: { own0: () => (S.sealOwn0 = 1) },
  T02: { shift: () => (S.showCur = 1) }
};
function goRow(id, v) {
  const r = ROWK[id] || ROWS[0];
  P.row = r[0];
  if (!Q.has('save') || goRow.done) P.save = r[2];
  goRow.done = 1;
  fresh();
  P.fs = Q.get('fs') === '1' || (goRow.ui && goRow.ui.fs);
  P.en = Q.get('en') === '1' || (goRow.ui && goRow.ui.en);
  if (r[0] === 'T05') P.fs = P.en = true;
  ANIM_UNTIL = 0;
  NOW = Math.max(NOW, 100000);
  r[3]();
  if (v && VAR[r[0]] && VAR[r[0]][v]) VAR[r[0]][v]();
  build();
  if (S.focusK) {
    const e = UI().querySelector(`[data-k="${S.focusK}"]`);
    if (e) e.focus({ preventScroll: true }), e.classList.add('fv');
  }
  drawField();
  syncCtl();
}

/* ---------- 錄影腳本（第 8 節 V8–V16）：[時間 ms, 動作]；?cap=1 由擷取腳本一格一格推 ---------- */
const key = (k, up) => onKey({ type: up ? 'keyup' : 'keydown', key: k, target: document.body, preventDefault() {} });
const click = k => {
  const e = UI().querySelector(`[data-k="${CSS.escape(k)}"]`);
  if (e) e.click();
  else log('miss', { k });
};
function tabNext() {
  const l = [...UI().querySelectorAll('button.kf, input.kf')].filter(e => e.offsetParent);
  const i = l.indexOf(document.activeElement);
  const n = l[(i + 1) % l.length];
  if (n) n.focus({ preventScroll: true });
  markFv();
}
const SCN = {
  V8: {
    row: 'F01',
    len: 4800,
    at: [
      [200, () => click('craft')],
      [3600, () => click('craft')],
      [4100, () => click('craft')]
    ]
  },
  V10: {
    row: 'F03',
    len: 2000,
    at: [
      [200, () => click('craft')],
      [350, () => click('craft')],
      [700, () => click('craft')],
      [1100, () => ((S.lack = 1), (S.fill3 = 0), (P.save = 'mid'), build())],
      [1300, () => click('craft')]
    ]
  },
  V11: {
    row: 'W01',
    len: 4200,
    at: [
      [200, () => ((S.pity = 100), log('pity100', {}), build())],
      [600, () => click('ap-赤霄印')],
      [1000, () => click('ar2')],
      [2000, () => act('reroll')],
      [2300, () => holdStart('reroll', 600)]
    ]
  },
  V12: {
    row: 'E01',
    len: 3200,
    at: [
      [200, () => click('eq0')],
      [800, () => click('equip')]
    ]
  },
  V13: {
    row: 'E08',
    len: 4200,
    at: [
      [200, () => act('batch-on')],
      [600, () => holdStart('salAll', 600)],
      [2000, () => (act('batch-off'), (S.pick = 6), build())],
      [2200, () => holdStart('sal1', 1200)]
    ]
  },
  V14: {
    row: 'E01',
    pre: () => ((S.panel = null), build()),
    len: 14400 /* 開著 ≥ 10 秒才出補算行 */,
    at: [
      [200, () => key('p')],
      [800, () => click('nd30')],
      [1100, () => click('path')],
      [10800, () => act('tclose')]
    ]
  },
  /* F2-3 藥劑冷卻中再按（D1-fix §2）：喝 → 1.5 秒後再按（不喝、抖 ≤ 80／減少動態只亮外框）→ 喝魔力 */
  'V-F2_flask_busy': {
    row: 'G02',
    pre: () => ((S.panel = null), build()),
    len: 3600,
    at: [
      [200, () => click('flask-hp')],
      [1700, () => click('flask-hp')],
      [2300, () => click('flask-mp')]
    ]
  },
  V15: {
    row: 'E01',
    pre: () => ((S.panel = null), build()),
    len: 3200,
    at: [
      [200, () => openPanel('skill')],
      [800, () => click('h0-1')],
      [1400, () => act('back')],
      [1800, () => (pressT = { at: NOW, k: '0-0' })],
      [2250, () => onMove({ clientX: 0, clientY: 0 })],
      [2300, () => ((S.dragXY = isPort() ? [200, 500] : [1000, 260]), build())],
      [2700, () => click('h1-0')]
    ]
  },
  V16: { row: 'E01', len: 900, at: [[300, () => act('close')]] },
  V9: {
    row: 'E01',
    pre: () => ((S.panel = null), build()),
    len: 3000,
    at: [
      [200, () => key('i')],
      [500, tabNext],
      [650, tabNext],
      [800, tabNext],
      [1000, () => (openPanel('chase', 1), act('apply'))],
      [1400, () => act('reroll')],
      [1800, () => key('Escape')],
      [2200, () => key('Escape')],
      [2600, () => key('Escape')]
    ]
  }
};
let RUN = null;
function startScn(n) {
  const s = SCN[n];
  goRow(s.row);
  if (s.pre) s.pre();
  LOG.length = 0;
  RUN = { n, t0: NOW, at: s.at.slice(), len: s.len };
  log('scn', { n });
}
const _step2 = step;
step = function (dt) {
  if (RUN) {
    while (RUN.at.length && NOW - RUN.t0 >= RUN.at[0][0]) RUN.at.shift()[1]();
  }
  _step2(dt);
};

/* ---------- 控制列 ---------- */
function setupCtl() {
  const fill = (id, l, v) =>
    ($(id).innerHTML = l
      .map(([k, n]) => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(n)}</option>`)
      .join(''));
  fill(
    'c-size',
    Object.keys(SIZES).map(k => [k, k + (SIZES[k].note ? '（' + SIZES[k].note + '）' : '')]),
    P.size
  );
  fill(
    'c-save',
    SAVES.map(k => [k, FX.S[k].name]),
    P.save
  );
  fill(
    'c-row',
    ROWS.map(r => [r[0], r[0] + ' ' + r[1]]),
    P.row
  );
  fill('c-scn', [['', '—'], ...Object.keys(SCN).map(k => [k, k])], '');
  $('c-size').onchange = e => ((P.size = e.target.value), goRow(P.row));
  $('c-save').onchange = e => ((P.save = e.target.value), build(), syncCtl());
  $('c-row').onchange = e => goRow(e.target.value);
  $('c-prev').onclick = () => goRow(ROWS[(ROWS.findIndex(r => r[0] === P.row) + ROWS.length - 1) % ROWS.length][0]);
  $('c-next').onclick = () => goRow(ROWS[(ROWS.findIndex(r => r[0] === P.row) + 1) % ROWS.length][0]);
  ['fs', 'en', 'rm'].forEach(k => {
    $('c-' + k).checked = P[k];
    $('c-' + k).onchange = e => ((P[k] = e.target.checked), (goRow.ui = { fs: P.fs, en: P.en }), build());
  });
  $('c-play').onclick = () => $('c-scn').value && startScn($('c-scn').value);
  $('c-ph').innerHTML =
    `<b>假資料：</b>${esc(FX.PH)}（demo/d2/fixtures.js）・主視覺底圖待素材・王印圖示暫用現有圖・藥劑、貨幣列位置照 D1-fix-mumi-1119 §2、§9`;
}
function syncCtl() {
  if (!$('c-row')) return;
  $('c-row').value = P.row;
  $('c-save').value = P.save;
  $('c-size').value = P.size;
  const r = ROWK[P.row];
  $('c-note').textContent = r ? `${r[0]}：${r[1]}（存檔 ${FX.S[P.save].name}，INV_CAP ${INV_CAP}）` : '';
}

/* ---------- 給擷取腳本 ---------- */
window.demo = {
  step: (ms = 1000 / 60) => step(ms),
  go: (row, v) => goRow(row, v),
  scn: n => startScn(n),
  running: () => !!(RUN && NOW - RUN.t0 < RUN.len),
  set: o => (Object.assign(P, o), build()),
  S: () => S,
  P: () => P,
  LOG: () => LOG.slice(),
  NOW: () => NOW,
  FT: () => FT,
  hash: () => fieldHash(),
  key,
  click,
  tabNext,
  INV: () => ({ INV_CAP, INV_SPARE }),
  rows: () => ROWS.map(r => [r[0], r[1], r[2]]),
  vars: () => Object.fromEntries(Object.entries(VAR).map(([k, v]) => [k, Object.keys(v)])),
  tok
};

(async function init() {
  const inv = await fetch('../../js/items.js').then(r => r.text());
  INV_CAP = +(Q.get('invcap') || inv.match(/const INV_CAP = (\d+)/)[1]);
  INV_SPARE = +(inv.match(/INV_SPARE = (\d+)/) || [0, 0])[1];
  if (Q.has('bare')) document.body.classList.add('bare');
  setupCtl();
  const ui = $('ui');
  ui.addEventListener('click', onClick);
  ui.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  ui.addEventListener('pointerleave', () => S.hold && holdEnd());
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  const ims = [
    HERO,
    ...['hungry_ghost', 'ghost_bailiff', 'bone_knight', 'horseface', 'hell_imp', 'bandit'].map(k => img(k).im)
  ];
  await Promise.all(ims.map(i => (i.complete ? 0 : new Promise(r => (i.onload = i.onerror = r)))));
  if (Q.get('scn')) startScn(Q.get('scn'));
  else goRow(P.row, Q.get('v'));
  window.__ready = 1;
  if (!CAP) requestAnimationFrame(raf);
})();

/* ---------- 量測用：每格取樣（錄影時序）、版面矩形 ---------- */
window.demo.probe = () => {
  const q = s => UI().querySelector(s);
  const sec = q('section.pnl:not(.tip)');
  const tr = sec ? sec.style.transform : '';
  const m = /translate[XY]\(([-\d.]+)/.exec(tr || '');
  const dd = q('.dd');
  const sum = q('.sum');
  const fill = q('.btn .fill');
  const cmp = q('.cmp:not(.none)');
  const sk = S.shakeK && q(`[data-k="${S.shakeK}"]`);
  return {
    t: NOW,
    ft: FT,
    pnl: sec ? sec.id : null,
    off: m ? +m[1] : 0,
    pop: sec && sec.style.opacity !== '' ? +sec.style.opacity : 1,
    push: q('section.push') && /translateX\(([-\d.]+)/.exec(q('section.push').style.transform || '') ? 1 : 0,
    cmpOp: cmp ? (cmp.style.opacity === '' ? 1 : +cmp.style.opacity) : null,
    dd: !!dd,
    sumS: sum && sum.getAttribute('style') ? 1 : 0,
    dps: sum ? sum.querySelector('b').textContent : null,
    fill: fill ? parseFloat(fill.style.width) || 0 : null,
    faces: UI().querySelectorAll('.rr.face').length,
    rr: UI().querySelectorAll('.rr:not(.sal)').length,
    gain: q('#d-gain') ? +q('#d-gain').style.opacity : 0,
    fade: q('.fade') ? +q('.fade').style.opacity : 0,
    shake: sk ? sk.style.transform || '' : '',
    tree: !!q('#p-tree'),
    lit: UI().querySelectorAll('.nd.lit').length,
    apply: !!q('.sc.apply'),
    brk: !!q('.dlg.brk'),
    dlg: !!q('#d-dlg'),
    sub: S.sub,
    full: !!q('.pity2.full'),
    sel: !!q('.eq.sel'),
    focus: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k || null : null,
    stOp: (() => {
      const l = [...UI().querySelectorAll('.st')].filter(e => e.style.opacity !== '');
      return l.length ? Math.min(...l.map(e => +e.style.opacity)) : null;
    })(),
    drag: !!q('.ghost'),
    cam: S.camOff,
    fHp: q('[data-k="flask-hp"]') ? q('[data-k="flask-hp"]').dataset.cool : null,
    fShake: q('[data-k="flask-hp"]') ? q('[data-k="flask-hp"]').style.transform || '' : '',
    fFlash: !!q('.flask.flash'),
    fRing: UI().querySelectorAll('.flask .ring').length
  };
};
window.demo.geo = () => geo();
