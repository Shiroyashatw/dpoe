// L-13：用瀏覽器實際打開 PR #172 的 GitHub 網頁說明，量每張圖 naturalWidth、每個連結 HTTP 狀態
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', proxy: { server: 'http://127.0.0.1:43043' } });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const resp = await p.goto('https://github.com/Shiroyashatw/dpoe/pull/172', { waitUntil: 'domcontentloaded', timeout: 90000 });
  console.log('page status', resp.status(), 'ua', await p.evaluate(() => navigator.userAgent));
  await p.waitForTimeout(4000);
  const sel = '.js-comment-container .comment-body, .comment-body';
  // 逐張捲到視窗內，讓 lazy 圖載入
  const n = await p.evaluate(s => document.querySelector(s).querySelectorAll('img').length, sel);
  for (let i = 0; i < n; i++) {
    await p.evaluate(([s, i]) => document.querySelector(s).querySelectorAll('img')[i].scrollIntoView({ block: 'center' }), [sel, i]);
    await p.waitForTimeout(350);
  }
  await p.waitForTimeout(6000);
  const R = await p.evaluate(s => {
    const body = document.querySelector(s);
    return {
      title: document.title,
      text: body.innerText,
      html: body.innerHTML,
      imgs: [...body.querySelectorAll('img')].map(i => ({ alt: i.alt, src: i.currentSrc || i.src, canon: i.getAttribute('data-canonical-src'), nw: i.naturalWidth, nh: i.naturalHeight, complete: i.complete, parentHref: i.closest('a') ? i.closest('a').href : null })),
      links: [...body.querySelectorAll('a[href]')].map(a => ({ text: a.innerText.trim().slice(0, 80), href: a.href, hasImg: !!a.querySelector('img') })),
      codes: [...body.querySelectorAll('code')].map(c => c.innerText).filter(t => /https?:\/\/|\]\(|!\[/.test(t)),
    };
  }, sel);
  // 每個連結實際請求（瀏覽器的 context.request，同一個 proxy）
  const uniq = [...new Set(R.links.map(l => l.href.split('#')[0]))];
  const st = {};
  for (const u of uniq) {
    try { const r = await ctx.request.get(u, { timeout: 60000, maxRedirects: 10 }); st[u] = r.status(); } catch (e) { st[u] = 'ERR ' + e.message.split('\n')[0]; }
  }
  R.linkStatus = st;
  const ist = {};
  for (const i of R.imgs) { try { const r = await ctx.request.get(i.src, { timeout: 60000 }); ist[i.src] = [r.status(), r.headers()['content-type']]; } catch (e) { ist[i.src] = ['ERR ' + e.message.split('\n')[0]]; } }
  R.imgStatus = ist;
  fs.writeFileSync(OUT + '/pr172-page.json', JSON.stringify(R, null, 1));
  fs.writeFileSync(OUT + '/pr172-body-rendered.txt', R.text);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '/pr172-fullpage.png', fullPage: true });
  const el = await p.$(sel); await el.screenshot({ path: OUT + '/pr172-body.png' });
  console.log('imgs', R.imgs.length, 'bad', R.imgs.filter(i => !(i.nw > 0)).length, 'links', R.links.length, 'uniq', uniq.length, 'non200', Object.entries(st).filter(([, v]) => v !== 200).length, 'codeWithUrl', R.codes.length);
  for (const i of R.imgs.filter(i => !(i.nw > 0))) console.log('BADIMG', i.alt, i.src);
  for (const [u, v] of Object.entries(st)) if (v !== 200) console.log('BADLINK', v, u);
  for (const c of R.codes) console.log('CODE', c.slice(0, 200));
  await b.close();
})();
