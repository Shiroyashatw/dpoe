/* #hask 遮罩：在真的 index.html 裡量 getComputedStyle（改前／改後各跑一次，比對輸出） */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium' }),
    p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('http://localhost:8000/index.html', { waitUntil: 'load' });
  const r = await p.evaluate(() => {
    let h = document.getElementById('hask');
    if (!h) {
      h = document.createElement('div');
      h.id = 'hask';
      h.innerHTML = '<div class="card"></div>';
      document.body.appendChild(h);
    }
    h.hidden = false;
    const c = h.querySelector('.card') || h.appendChild(Object.assign(document.createElement('div'), { className: 'card' }));
    return { bg: getComputedStyle(h).backgroundColor, shadow: getComputedStyle(c).boxShadow };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
