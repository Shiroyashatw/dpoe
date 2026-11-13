const { chromium } = require('playwright');
const path = require('path'),
  os = require('os'),
  fs = require('fs');
/* 介面亂不亂（0.4.8，DESIGN.md 第 7 節的預算）：量一個畫面「看得到的範圍」裡用了幾種字的樣式、字色、框，
   幾個有框的元素、幾個可以按的、12px 以下的字佔幾成、對比不到 4.5 的字；另外存一張瞇眼圖（模糊＋灰階），
   看最亮的是不是主數字、主要按鈕、選中的東西（DESIGN.md 第 1 節的一秒測試，這一項要人看）。
   只量不改；改介面前後各跑一次比數字。
   用法：先開本機伺服器，再 node tools/ui_look.js [寬 390] [高 844] [網址] [圖存哪，預設系統暫存資料夾的 ui_look]
   別的腳本可以 require 這支拿 audit／squint／BUDGET 去量自己的畫面 */
const BUDGET = { 字的樣式: 6, 字色: 5, 框的種類: 4, 小字: 0, 對比不足: 0 };

/* 在頁面裡量 root 底下、畫面內看得到的元素 */
const audit = (p, root) =>
  p.evaluate(root => {
    const R = document.querySelector(root),
      vw = innerWidth,
      vh = innerHeight;
    const vis = e => {
      const r = e.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        r.bottom > 0 &&
        r.top < vh &&
        r.right > 0 &&
        r.left < vw &&
        getComputedStyle(e).visibility !== 'hidden'
      );
    };
    const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => {
      const f = v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    /* 往上找第一個不透明的底色（漸層底找不到，當成面板底） */
    const bgOf = e => {
      for (; e; e = e.parentElement) {
        const c = rgb(getComputedStyle(e).backgroundColor);
        if (c.length >= 3 && (c[3] === undefined || c[3] > 0.6)) return c;
      }
      return [38, 40, 45];
    };
    const sty = {},
      col = {},
      bd = {},
      low = new Set();
    let chars = 0,
      small = 0,
      boxes = 0;
    for (const e of R.querySelectorAll('*')) {
      if (!vis(e)) continue;
      const cs = getComputedStyle(e);
      const own = [...e.childNodes]
        .filter(n => n.nodeType === 3 && n.textContent.trim())
        .map(n => n.textContent.trim())
        .join('');
      if (own) {
        const sz = Math.round(parseFloat(cs.fontSize) * 10) / 10,
          k = `${sz}/${cs.fontWeight}/${/Serif/i.test(cs.fontFamily.split(',')[0]) ? '襯線' : '黑體'}`;
        sty[k] = (sty[k] || 0) + own.length;
        col[cs.color] = (col[cs.color] || 0) + own.length;
        chars += own.length;
        if (sz < 12) small += own.length;
        const a = lum(rgb(cs.color)),
          b = lum(bgOf(e)),
          cr = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        if (cr < 4.5 && !e.closest('[disabled]')) low.add(`${own.slice(0, 8)} ${cr.toFixed(1)}`);
      }
      const bw = parseFloat(cs.borderTopWidth) || parseFloat(cs.borderLeftWidth) || parseFloat(cs.borderBottomWidth),
        bc = rgb(cs.borderTopColor);
      if (bw > 0 && cs.borderTopStyle !== 'none' && (bc[3] === undefined || bc[3] > 0.05)) {
        const k = `${cs.borderTopStyle} ${bw}px ${cs.borderTopColor}`;
        bd[k] = (bd[k] || 0) + 1;
        boxes++;
      }
    }
    const top = o =>
      Object.entries(o)
        .sort((a, b) => b[1] - a[1])
        .map(x => x.join('×'))
        .join('  ');
    return {
      字數: chars,
      有框的元素: boxes,
      可以按的: [...R.querySelectorAll('button,[role=button],.term')].filter(vis).length,
      字的樣式: Object.keys(sty).length,
      字色: Object.keys(col).length,
      框的種類: Object.keys(bd).length,
      小字: chars ? Math.round((small / chars) * 100) : 0,
      對比不足: low.size,
      明細: { 字的樣式: top(sty), 字色: top(col), 框: top(bd), 對比不足: [...low].slice(0, 12) }
    };
  }, root);
/* 瞇眼圖：把 root 模糊成灰階再截圖 */
async function squint(p, root, file) {
  await p.evaluate(r => (document.querySelector(r).style.filter = 'blur(5px) grayscale(1)'), root);
  await p.screenshot({ path: file });
  await p.evaluate(r => (document.querySelector(r).style.filter = ''), root);
}
/* 一列結果：超過預算的項目加 ✗；boxMax 是這個畫面有框元素的上限 */
function line(name, a, boxMax) {
  const over = k => (a[k] > BUDGET[k] ? '✗' : '');
  const bad = Object.keys(BUDGET).filter(k => a[k] > BUDGET[k]).length + (boxMax && a.有框的元素 > boxMax ? 1 : 0);
  return `${bad ? '❌' : '✅'} ${name}｜字的樣式 ${a.字的樣式}${over('字的樣式')}｜字色 ${a.字色}${over('字色')}｜框的種類 ${a.框的種類}${over('框的種類')}｜有框 ${a.有框的元素}${boxMax && a.有框的元素 > boxMax ? '✗' : ''}${boxMax ? '／' + boxMax : ''}｜可以按 ${a.可以按的}｜12px 以下 ${a.小字}%${over('小字')}｜對比不足 ${a.對比不足}${over('對比不足')}`;
}
module.exports = { audit, squint, line, BUDGET };

if (require.main === module)
  (async () => {
    const W = +process.argv[2] || 390,
      H = +process.argv[3] || 844,
      URL = process.argv[4] || 'http://localhost:8000/',
      OUT = process.argv[5] || path.join(os.tmpdir(), 'ui_look'),
      mobile = W < 768;
    fs.mkdirSync(OUT, { recursive: true });
    const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
    const ctx = await b.newContext(
      mobile
        ? { viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
        : { viewport: { width: W, height: H } }
    );
    await ctx.route(/supabase/, r => r.abort());
    const p = await ctx.newPage();
    await p.goto(URL + '?p=8&' + Date.now());
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(1200);
    /* 中期角色：5 招有傷害的招（0.4.8 起；之前前 5 招都是詛咒，看不到每秒）、每招開 3 孔（第 1 招插一顆）、靈魂夠用、有昇華點 */
    await p.evaluate(mobile => {
      proSkip();
      S.story.tips = 0;
      S.lv = 60;
      S.maxT = 13;
      if (mobile) (S.orient = innerHeight > innerWidth ? 'p' : 'l'), applyOrient();
      MAT().soul = 500000;
      Object.keys(SKILLS)
        .filter(k => SKILLS[k].m && !skWhy(SKILLS[k]) && !gemLack(mkGem(k, 1)).length)
        .slice(0, 5)
        .forEach((k, i) => ((S.skills[i].k = k), (S.skills[i].n = 3)));
      S.skills[0].so[0] = 'fury';
      changed();
    }, mobile);
    await p.waitForTimeout(600);
    const port = await p.evaluate(() => PORT());
    const click = async q => {
      await p.evaluate(q => {
        const e = document.querySelector(q);
        if (e) e.click();
      }, q);
      await p.waitForTimeout(350);
    };
    /* 要量的畫面：[名字, 根節點, 有框元素的上限, 怎麼走到]。面板改版時改這裡 */
    const SCREENS = [
      /* 技能面板（0.4.8）：總覽 → 這一招 → 選了一個孔 → 挑輔助 → 挑技能 */
      ['技能：總覽', '#pskill', 12, async () => p.evaluate(m => (m ? navGo('skill') : openPanel('skill')), port)],
      ['技能：這一招', '#pskill', 12, () => click('#pskill [data-sk="go:one:0"]')],
      ['技能：選了一個孔', '#pskill', 12, () => click('#pskill .sk-nd[data-sk="hole:0"]')],
      [
        '技能：挑輔助',
        '#pskill',
        30,
        async () => {
          await click('#pskill [data-sk="back"]');
          await click('#pskill .sk-nd.emp');
        }
      ],
      [
        '技能：挑技能',
        '#pskill',
        30,
        async () => {
          await click('#pskill [data-sk="back"]');
          await click('#pskill [data-sk="swap"]');
        }
      ],
      ['昇華：還沒選', '#pasc', 30, async () => p.evaluate(() => (closePanels(), openPanel('asc')))],
      [
        '昇華：選了一個',
        '#pasc',
        30,
        async () => {
          await p.evaluate(() => act('asc:' + Object.keys(ASC)[3]));
          await p.waitForTimeout(300);
          await click('#pasc [data-ax^="take:"]');
        }
      ]
    ];
    let fail = 0;
    for (const [name, root, boxMax, go] of SCREENS) {
      await go();
      await p.waitForTimeout(500);
      const a = await audit(p, root),
        f = path.join(OUT, `${W}x${H}-${name.replace(/[：:]/g, '-')}`);
      await p.screenshot({ path: f + '.png' });
      await squint(p, root, f + '-瞇眼.png');
      const s = line(name, a, boxMax);
      if (s.startsWith('❌')) fail++;
      console.log(s);
      console.log(`   字的樣式：${a.明細.字的樣式}`);
      if (a.字色 > BUDGET.字色) console.log(`   字色：${a.明細.字色}`);
      if (a.對比不足) console.log(`   對比不足：${a.明細.對比不足.join('、')}`);
    }
    console.log(`\n${W}×${H}：${SCREENS.length - fail}／${SCREENS.length} 個畫面過預算。截圖與瞇眼圖在 ${OUT}`);
    await b.close();
  })();
