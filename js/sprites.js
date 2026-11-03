/* dungeonPOE · 圖片：PNG 大圖（頭像、怪物、道具圖示）、8×8 備用星星、程式像素圖（藥水） */
'use strict';
/* 8×8 備用圖示：PNG 圖示還沒載好或沒有時顯示 */
const ICONS = {
  star: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yy..yy.', 'yy....yy', '........']
};
const ICOPAL = { w: '#e8e6e0', k: '#3a3340', b: '#9a6a3a', y: '#ffd166', r: '#e5484d', c: '#8fe0ff', g: '#7bd36b' };
const SPC = new Map();
/* ---------- PNG 像素圖（art/ → js/art.js，圖名 a_檔名） ---------- */
/* 圖拼在幾張大圖裡（ART_SHEET，ART 是每張圖在大圖裡的位置），用到才載入那張大圖 */
const ARTIMG = {};
function artSheet(s) {
  if (!ARTIMG[s]) {
    const im = new Image();
    /* 0.1.59 只有畫面真的在等這張（want）才重畫：之前背景預載 146 張大圖每載好一張就整個重畫，
       開場半分鐘內重畫上百次，按鈕按下、放開之間畫面被換掉，點擊被吃掉（看起來像卡住） */
    im.onload = () => im.want && typeof artRepaint === 'function' && artRepaint();
    im.src = ART_SHEET[s];
    ARTIMG[s] = im;
  }
  return ARTIMG[s];
}
/* 回傳 { im: 大圖, r: [x, y, 寬, 高] } */
function artImg(k) {
  const a = typeof ART !== 'undefined' && ART[k];
  if (!a) return null;
  const im = artSheet(a[0]);
  if (!im.complete) im.want = 1;
  return { im, r: a.slice(1) };
}
/* 開場 5 秒後在背景陸續把其他大圖也載好，怪物的圖開打時才不會空白一下 */
setTimeout(() => {
  if (typeof ART_SHEET !== 'undefined')
    Object.keys(ART_SHEET).forEach((s, i) => setTimeout(() => artSheet(s), i * 200));
}, 5000);
const SKURL = new Map();
/* PNG 圖示（art/icons 的檔名）轉成圖片網址；沒有或還沒載好回傳 null */
function artIconURL(n) {
  if (typeof ART === 'undefined' || !ART[n]) return null;
  if (SKURL.has(n)) return SKURL.get(n);
  const c = artSprite('a_' + n);
  if (c.pending) return null;
  const u = c.toDataURL();
  SKURL.set(n, u);
  return u;
}
/* 回傳正方形畫布（圖貼底置中、留 1 格邊）；還沒載好時回傳空白（不快取） */
function artSprite(name, white) {
  const key = name + (white ? '|w' : '');
  let c = SPC.get(key);
  if (c) return c;
  const a = artImg(name.slice(2)),
    im = a && a.im;
  c = document.createElement('canvas');
  if (!im || !im.complete || !im.naturalWidth) {
    c.width = c.height = 18;
    c.pending = true;
    return c;
  }
  const [sx, sy, w, h] = a.r,
    N = Math.max(w, h) + 2;
  c.width = c.height = N;
  const x = c.getContext('2d');
  x.drawImage(im, sx, sy, w, h, fl((N - w) / 2), N - 1 - h, w, h);
  if (white) {
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#fff';
    x.fillRect(0, 0, N, N);
  }
  SPC.set(key, c);
  return c;
}
const ICC = new Map();
function iconURL(n) {
  if (ICC.has(n)) return ICC.get(n);
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 8;
  paintIcon(c, n);
  const u = c.toDataURL();
  ICC.set(n, u);
  return u;
}
function paintIcon(c, n) {
  /* 0.3.29：圖示名稱打錯或還沒定義時改畫星星，不要讓整個面板當掉 */
  const x = c.getContext('2d'),
    r = ICONS[n] || ICONS.star;
  x.clearRect(0, 0, 8, 8);
  for (let j = 0; j < 8; j++)
    for (let i = 0; i < 8; i++) {
      const ch = r[j][i];
      if (ch === '.') continue;
      x.fillStyle = ICOPAL[ch];
      x.fillRect(i, j, 1, 1);
    }
}
/* ================= 程式像素圖（道具 ic: 'p:鍵'） ================= */
const PIX = {
  ic_egg: {
    r: ['...ww...', '..wwww..', '.wwkwww.', '.wwwwkw.', 'wkwwwwww', 'wwwwkwww', '.wwwwww.', '..wwww..'],
    p: { w: '#f3ead8', k: '#6fa86a' }
  },
  ic_potion: {
    r: ['..kk....', '..ww....', '.wrrw...', 'wrrrrw..', 'wrwrrw..', 'wrrrrw..', '.wwww...', '........'],
    p: { r: '#e5484d', w: '#e8e2d4', k: '#8a5a2f' }
  }
};
const PIXC = new Map();
function pixURL(key, tint) {
  const k = key + '|' + (tint || '');
  if (PIXC.has(k)) return PIXC.get(k);
  const d = PIX[key],
    c = document.createElement('canvas');
  c.width = 10;
  c.height = 10;
  const x = c.getContext('2d');
  const pal = Object.assign(
    { k: '#2a2430', w: '#ffffff', b: '#8a5a2f', y: '#f2c14e' },
    d.p || {},
    tint ? { m: tint } : {}
  );
  for (let j = 0; j < 8; j++)
    for (let i = 0; i < 8; i++) {
      const ch = d.r[j][i];
      if (ch === '.') continue;
      x.fillStyle = pal[ch] || '#f0f';
      x.fillRect(i + 1, j + 1, 1, 1);
    }
  const out = document.createElement('canvas');
  out.width = 10;
  out.height = 10;
  const o = out.getContext('2d');
  o.fillStyle = 'rgba(10,8,14,.9)';
  const F = (i, j) => i >= 0 && j >= 0 && i < 8 && j < 8 && d.r[j][i] !== '.';
  for (let j = -1; j <= 8; j++)
    for (let i = -1; i <= 8; i++)
      if (!F(i, j) && (F(i + 1, j) || F(i - 1, j) || F(i, j + 1) || F(i, j - 1))) o.fillRect(i + 1, j + 1, 1, 1);
  o.drawImage(c, 0, 0);
  const u = out.toDataURL();
  PIXC.set(k, u);
  return u;
}
