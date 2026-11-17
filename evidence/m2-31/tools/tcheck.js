/* M2-31：capture.js 這次走不到的三個選擇器（T2 負抗性、T5 .skr-up:disabled、T10 桌機狀態格），
   在真的面板裡把 class 加上去，讀 computed 字色與第一個不透明祖先的底色算對比；T10 另外量數字框離紅框幾 px。
   用法：node tcheck.js [網址] */
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.route(/supabase/, r => r.abort());
  await p.goto(URL + '?p=78&' + Date.now());
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene);
  await p.evaluate(() => {
    try { introStop(); } catch (e) {}
    proSkip();
    S.story.tips = 0;
  });
  await p.waitForTimeout(800);
  const R = await p.evaluate(() => {
    const L = c => {
      const v = c.match(/[\d.]+/g).slice(0, 3).map(x => x / 255).map(x => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    const bgOf = e => {
      for (; e; e = e.parentElement) {
        const c = getComputedStyle(e).backgroundColor;
        if (!/rgba\(.*, 0\)$/.test(c) && c !== 'transparent') return c;
      }
      return 'rgb(0,0,0)';
    };
    const cr = e => {
      const a = L(getComputedStyle(e).color), bb = L(bgOf(e));
      return +((Math.max(a, bb) + 0.05) / (Math.min(a, bb) + 0.05)).toFixed(2);
    };
    const out = {};
    /* T2：角色頁抗性，第一格加 neg */
    NAV.view = 'char';
    openPanel('inv');
    const sp = document.querySelector('.doll2 .res span');
    if (sp) {
      sp.classList.add('neg');
      const e = sp.querySelector('b');
      out.T2 = { color: getComputedStyle(e).color, bg: bgOf(e), ratio: cr(e) };
    } else out.T2 = 'no .doll2 .res';
    closePanels();
    /* T5：技能這一招的升級鈕 */
    openPanel('skill');
    const btn = document.createElement('button');
    btn.className = 'skr-up';
    btn.disabled = true;
    btn.textContent = '升級';
    (document.querySelector('#pskill .ph') || document.querySelector('#pskill')).appendChild(btn);
    out.T5 = { color: getComputedStyle(btn).color, bg: bgOf(btn), ratio: cr(btn) };
    closePanels();
    /* T10：狀態格 */
    const m = document.getElementById('mech');
    m.innerHTML = '<button class="stc bad"><span class="ic"></span><i></i><b>2</b></button>';
    m.hidden = false;
    m.style.display = 'flex';
    const st = m.querySelector('.stc'), bb = st.querySelector('b');
    const r1 = st.getBoundingClientRect(), r2 = bb.getBoundingClientRect();
    out.T10 = { color: getComputedStyle(bb).color, bg: bgOf(bb), ratio: cr(bb), gapRight: r1.right - 1 - r2.right, gapBottom: r1.bottom - 1 - r2.bottom };
    return out;
  });
  console.log(JSON.stringify(R, null, 1));
  await b.close();
})();
