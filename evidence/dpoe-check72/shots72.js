// dpoe-check72：遊戲內取 artImg('wangyin_<名>_16')，四枚逐像素比對 picked.txt 的 png，並截圖
const { chromium } = require('playwright');
const { PNG } = (() => { try { return require('pngjs'); } catch (e) { return {}; } })();
const fs = require('fs'), path = require('path');
const ROOT = '/home/user/dpoe', OUT = path.join(ROOT, 'evidence/dpoe-check72');
const KS = ['zhenyue', 'chixiao', 'jiting', 'guixu'];
const want = {};
for (const k of KS) {
  const f = fs.readFileSync(`${ROOT}/art/icons/wangyin/wangyin_${k}/picked.txt`, 'utf8').split(/\s+/).find(n => n.includes('_16-'));
  want[k] = { f, b64: fs.readFileSync(`${ROOT}/art/icons/wangyin/wangyin_${k}/${f}`).toString('base64') };
}
let fail = 0;
const ok = (c, n, v = '') => { if (!c) fail++; console.log(`${c ? '✅' : '❌'} ${n}`, typeof v === 'string' ? v : JSON.stringify(v)); };
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  for (const [W, H] of [[390, 844], [1280, 720]]) {
    const mob = W < 900, tag = `${W}x${H}`, errs = [];
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
    await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8000/?test=chase&' + Date.now());
    await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const K = CHASE_POOL.trunk; S.auto = 0; S.chase.got = Object.fromEntries(K.map(k => [k, 1])); S.frags = Object.fromEntries(K.map(k => [k, 1])); changed(); fmenuOpen('chase'); });
    await p.waitForFunction(ks => ks.every(k => { const a = artImg(`wangyin_${k}_16`); return a && a.im.complete && a.im.naturalWidth; }), KS);
    const r = await p.evaluate(async ({ KS, want }) => {
      const out = { src: artImg('wangyin_guixu_16').im.src.split('/').pop(), diff: {} };
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;top:8px;right:8px;z-index:99999;background:#24211e;border:1px solid #a38e6b;padding:6px;font:11px sans-serif;color:#e3d6bb;pointer-events:none';
      box.textContent = 'check72：artImg 王印 16（1× ／ 4×）';
      for (const z of [1, 4]) {
        const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:6px;margin-top:4px;align-items:end';
        for (const k of KS) {
          const a = artImg(`wangyin_${k}_16`), c = document.createElement('canvas');
          c.width = c.height = 16 * z; c.style.cssText = `width:${16 * z}px;height:${16 * z}px;image-rendering:pixelated`;
          const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(a.im, ...a.r, 0, 0, 16 * z, 16 * z);
          if (z === 1) {
            const got = g.getImageData(0, 0, 16, 16).data;
            const im = new Image(); im.src = 'data:image/png;base64,' + want[k].b64; await im.decode();
            const c2 = document.createElement('canvas'); c2.width = c2.height = 16; const g2 = c2.getContext('2d'); g2.drawImage(im, 0, 0);
            const ref = g2.getImageData(0, 0, 16, 16).data;
            let d = 0; for (let i = 0; i < ref.length; i += 4) if (ref[i + 3] !== got[i + 3] || (ref[i + 3] && (ref[i] !== got[i] || ref[i + 1] !== got[i + 1] || ref[i + 2] !== got[i + 2]))) d++;
            out.diff[k] = d;
          }
          row.appendChild(c);
        }
        box.appendChild(row);
      }
      document.body.appendChild(box);
      return out;
    }, { KS, want });
    const sheet = fs.readFileSync(`${ROOT}/js/art.js`, 'utf8').match(/ic_wy16: '[^']*\/([^']*)'/)[1];
    ok(r.src === sheet, `${tag} 遊戲載入的拼條是 ${sheet}`, r.src);
    for (const k of KS) ok(r.diff[k] === 0, `${tag} ${k} 遊戲內 16 px 與 ${want[k].f} 逐像素相同（不同格數）`, String(r.diff[k]));
    await p.screenshot({ path: `${OUT}/${tag}-wy16.png` });
    ok(!errs.length, `${tag} 頁面沒有錯誤`, errs);
    await ctx.close();
  }
  await b.close();
  console.log(fail ? `❌ ${fail} 項沒過` : '✅ 全部通過');
  process.exit(fail ? 1 : 0);
})();
