/* M2-36 王印 16 換定稿（dpoe-m2-36-wy16-fix）的遊戲內截圖：只截、只量，不改遊戲。
   遊戲目前沒有畫 wangyin_*_16 的地方（規格 M2-33-3a §4.3 的「物品說明那一行」還沒做），
   所以開追逐物品面板（32 的圖示）後，在畫面右上疊一條測試用小框：用遊戲自己的 artImg('wangyin_<名>_16') 從 ic_wy16 拼條取圖，畫 1× 與 4×。
   用法：先開本機伺服器（python3 -m http.server），node tools/wy16_shots.js [輸出資料夾] [網址] */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const OUT = process.argv[2] || path.join(__dirname, '..', 'evidence', 'dpoe-m2-36-wy16-fix'),
  URL = process.argv[3] || 'http://localhost:8000/';
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const ok = (c, n, v = '') => {
  if (!c) fail++;
  console.log(`${c ? '✅' : '❌'} ${n}`, typeof v === 'string' ? v : JSON.stringify(v));
};
async function run(b, W, H) {
  const mob = W < 900,
    tag = `${W}x${H}`,
    errs = [];
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?test=chase&' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    const K = CHASE_POOL.trunk;
    S.auto = 0;
    S.chase.got = Object.fromEntries(K.map(k => [k, 1]));
    S.frags = Object.fromEntries(K.map(k => [k, 1]));
    changed();
    fmenuOpen('chase');
  });
  await p.waitForFunction(() =>
    ['zhenyue', 'chixiao', 'jiting', 'guixu'].every(k => {
      const a = artImg(`wangyin_${k}_16`);
      return a && a.im.complete && a.im.naturalWidth;
    })
  );
  const f = await p.evaluate(() => {
    const ks = ['zhenyue', 'chixiao', 'jiting', 'guixu'],
      box = document.createElement('div');
    box.id = 'wy16test';
    box.style.cssText =
      'position:fixed;top:8px;right:8px;z-index:99999;background:#24211e;border:1px solid #a38e6b;padding:6px;font:11px sans-serif;color:#e3d6bb;pointer-events:none';
    box.textContent = '王印 16（artImg，ic_wy16）1× ／ 4×';
    const px = {};
    for (const z of [1, 4]) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:6px;margin-top:4px;align-items:end';
      for (const k of ks) {
        const a = artImg(`wangyin_${k}_16`),
          c = document.createElement('canvas');
        c.width = c.height = 16 * z;
        c.style.cssText = `width:${16 * z}px;height:${16 * z}px;image-rendering:pixelated`;
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.drawImage(a.im, ...a.r, 0, 0, 16 * z, 16 * z);
        if (z === 1) px[k] = [...g.getImageData(7, 7, 1, 1).data.slice(0, 3)];
        row.appendChild(c);
      }
      box.appendChild(row);
    }
    document.body.appendChild(box);
    return { src: artImg('wangyin_chixiao_16').im.src.split('/').pop(), r: artImg('wangyin_chixiao_16').r, px };
  });
  const sheet = fs
    .readFileSync(path.join(__dirname, '..', 'js', 'art.js'), 'utf8')
    .match(/ic_wy16: '[^']*\/([^']*)'/)[1];
  ok(f.src === sheet && f.r.join() === '17,0,16,16', `${tag} 赤霄 16 從新拼條 ${sheet} 取 x=17`, f);
  ok(f.px.chixiao.join() === '227,214,187', `${tag} 赤霄 16 中央 (7,7) 是劍身 --border-cap #e3d6bb`, f.px);
  await p.screenshot({ path: `${OUT}/${tag}-wy16.png` });
  ok(!errs.length, `${tag} 頁面沒有錯誤`, errs);
  await ctx.close();
}
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  for (const [W, H] of [
    [390, 844],
    [1280, 720]
  ])
    await run(b, W, H);
  await b.close();
  console.log(fail ? `❌ ${fail} 項沒過` : '✅ 全部通過');
  process.exit(fail ? 1 : 0);
})();
