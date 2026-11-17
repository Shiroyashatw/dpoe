/* M2-29 王印介面的驗收（specs/M2-29-wangyin-affixes.md 驗收清單的介面部分）：只截、只量，不改遊戲。
   每個尺寸：追逐物品面板（收集格、四印齊鳴、選中格的套到裝備）→ 實點「套到裝備」→ 選裝備畫面 → 實點一件（扣 1、吐司）→ 實點有印那件 → 換印確認（取消、確認）
   → 物品說明、比較框的王印那一行；量：按鈕 ≥ 44×44、王印那一行行數（直立 ≤ 2、桌機 1）、面板不超出畫面、桌機選裝備不用捲動、齊鳴 4／4 吐司。
   用法：先開本機伺服器（python3 -m http.server），node tools/m2_29_shots.js [輸出資料夾，預設 evidence/dpoe-m2-29-ui] [網址] */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const OUT = process.argv[2] || path.join(__dirname, '..', 'evidence', 'dpoe-m2-29-ui'),
  URL = process.argv[3] || 'http://localhost:8000/';
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const ok = (c, n, v = '') => {
  if (!c) fail++;
  console.log(`${c ? '✅' : '❌'} ${n}`, typeof v === 'string' ? v : JSON.stringify(v));
};
async function tap(p, sel) {
  for (let i = 0; i < 20; i++) {
    const r = await p.evaluate(sel => {
      const e = document.querySelector(sel);
      if (!e) return null;
      e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect();
      return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    }, sel);
    if (r) return p.viewportSize().width < 900 ? p.touchscreen.tap(r.x, r.y) : p.mouse.click(r.x, r.y);
    await p.waitForTimeout(200);
  }
  throw new Error('找不到 ' + sel);
}
/* 元素矩形、行數（用 line-height 算）、面板在不在畫面內 */
const meas = (p, sel) =>
  p.evaluate(sel => {
    const e = document.querySelector(sel);
    if (!e || !e.getClientRects().length) return null;
    const r = e.getBoundingClientRect(),
      lh = parseFloat(getComputedStyle(e).lineHeight);
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      x: r.left,
      y: r.top,
      b: r.bottom,
      lines: Math.round(r.height / lh)
    };
  }, sel);
const inView = (p, sel) =>
  p.evaluate(sel => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5;
  }, sel);
async function run(b, W, H) {
  const mob = W < 900,
    tag = `${W}×${H}`;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob });
  await ctx.route(/supabase/, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => ok(false, `頁面錯誤 ${tag}`, e.message));
  await p.goto(URL + '?test=chase&' + Date.now());
  await p.waitForFunction(() => typeof G === 'object' && G.scene === 'map');
  await p.waitForTimeout(1800);
  /* 身上：戒指 1、2 是稀有、鞋子魔法、頭盔白裝；三種王印套好（鎮嶽、赤霄、疾霆），手上歸墟 1 枚、鎮嶽 2 枚 */
  await p.evaluate(() => {
    try {
      introStop();
    } catch (e) {}
    window.hurtPlayer = () => 0;
    closePanels();
    chaseBnHide();
    $('banner').hidden = true;
    const K = CHASE_POOL.trunk,
      mk = (id, r) => {
        const it = mkItem(id, 60, r);
        it.id = ++S.inv.nid || Math.floor(Math.random() * 1e9);
        return it;
      };
    S.chase.got = { [K[0]]: 3, [K[1]]: 1, [K[2]]: 1, [K[3]]: 1 };
    S.chase.seen = { on: 1, v: 1, k: K.slice() };
    S.frags = { [K[0]]: 2, [K[1]]: 0, [K[2]]: 0, [K[3]]: 1 };
    for (const [e, id, r, w] of [
      ['ring1', 'r_iron', 2, K[0]],
      ['ring2', 'r_iron', 2, K[1]],
      ['boots', null, 1, K[2]],
      ['helm', null, 0, null]
    ]) {
      const B = BASES.find(x => (id ? x.id === id : x.k === e));
      if (!B) continue;
      const it = mk(B.id, r);
      if (w) it.wy = w;
      S.eq[e] = it;
    }
    changed();
    CHSEL = K[3];
    fmenuOpen('chase');
  });
  await p.waitForTimeout(400);
  const set3 = await p.evaluate(() => document.querySelector('#pchase .chset').textContent);
  ok(set3 === '四印齊鳴 3／4', `${tag} 齊鳴進度（3 種）`, set3);
  const use = await meas(p, '#pchase .chact .btn');
  ok(use && use.w >= 44 && use.h >= 44, `${tag} 套到裝備 ≥ 44×44`, use);
  ok(await inView(p, '#pchase'), `${tag} 追逐物品面板在畫面內`);
  await p.screenshot({ path: `${OUT}/${W}x${H}-1-chase.png` });
  /* 擁有 0：停用＋原因 */
  await tap(p, `#pchase [data-chs="${'wangyin_chixiao'}"]`);
  await p.waitForTimeout(250);
  const dis = await p.evaluate(() => {
    const b = document.querySelector('#pchase .chact .btn');
    return [b.disabled, b.textContent];
  });
  ok(dis[0] && dis[1] === '沒有可以套用的印', `${tag} 擁有 0 停用`, dis);
  await p.screenshot({ path: `${OUT}/${W}x${H}-2-chase-none.png` });
  /* 選歸墟 → 套到裝備 → 選裝備 */
  await tap(p, '#pchase [data-chs="wangyin_guixu"]');
  await p.waitForTimeout(250);
  await tap(p, '#pchase .chact .btn');
  await p.waitForTimeout(300);
  const pick = await p.evaluate(() => ({
    rows: [...document.querySelectorAll('#pchase .wyr')].map(r => [r.dataset.wyk, r.disabled]),
    scroll: $('pchase').scrollHeight - $('pchase').clientHeight
  }));
  ok(pick.rows.length >= 3 && pick.rows.some(r => r[0] === 'helm' && r[1]), `${tag} 選裝備：白裝停用`, pick.rows);
  if (!mob) ok(pick.scroll <= 0, `${tag} 選裝備不用捲動`, pick.scroll);
  const rowM = await meas(p, '#pchase .wyr');
  ok(rowM.h >= 44 && rowM.w >= 44, `${tag} 選裝備列 ≥ 44`, rowM);
  ok(await inView(p, '#pchase'), `${tag} 選裝備在畫面內`);
  await p.screenshot({ path: `${OUT}/${W}x${H}-3-pick.png` });
  /* 套在鞋子（已有疾霆）→ 換印確認 → 取消 → 再一次 → 確認 */
  await tap(p, '#pchase [data-wyk="boots"]');
  await p.waitForTimeout(300);
  const sw = await p.evaluate(() => [
    document.querySelector('#pchase .wysw .c-bad').textContent,
    [...document.querySelectorAll('#pchase .wysw .btn')].map(b => {
      const r = b.getBoundingClientRect();
      return [Math.round(r.width), Math.round(r.height)];
    })
  ]);
  ok(
    sw[0] === '會換掉疾霆印，舊印不會退回' && sw[1].every(([w, h]) => w >= 44 && h >= 44),
    `${tag} 換印確認句、按鈕 ≥ 44×44`,
    sw
  );
  /* 鍵帽 Esc／Enter 只在桌機：觸控看不到、桌機看得到 */
  const kb = await p.evaluate(() =>
    [...document.querySelectorAll('#pchase .wysw kbd')].map(k => !!k.getClientRects().length)
  );
  ok(kb.length === 2 && kb.every(v => v === !mob), `${tag} 換印確認鍵帽${mob ? '不可見' : '可見'}`, kb);
  await p.screenshot({ path: `${OUT}/${W}x${H}-4-swap.png` });
  if (mob) await tap(p, '#pchase .wysw .btn.pri');
  else await p.keyboard.press('Escape');
  await p.waitForTimeout(250);
  const back = await p.evaluate(() => [CHUI.v, S.eq.boots.wy, S.frags.wangyin_guixu]);
  ok(
    JSON.stringify(back) === '["pick","wangyin_jiting",1]',
    `${tag} 取消${mob ? '' : '（Esc）'}：回選裝備、沒換、沒扣`,
    back
  );
  /* 套在戒指 2（赤霄）也要確認；這次用確認 → 4 種湊齊 */
  await tap(p, '#pchase [data-wyk="boots"]');
  await p.waitForTimeout(250);
  if (mob) await tap(p, '#pchase .wysw .wyx');
  else await p.keyboard.press('Enter');
  await p.waitForTimeout(120);
  const done = await p.evaluate(() => [
    CHUI.v,
    S.eq.boots.wy,
    S.frags.wangyin_guixu,
    $('warn').textContent,
    S.frags.wangyin_jiting
  ]);
  ok(
    JSON.stringify(done) ===
      '["pick","wangyin_guixu",0,"歸墟印套在' + (await p.evaluate(() => itemName(S.eq.boots))) + '上了",0]',
    `${tag} 換印${mob ? '' : '（Enter）'}：鞋子換成歸墟、歸墟扣 1、疾霆不退回、吐司`,
    done
  );
  await p.waitForTimeout(150);
  await p.screenshot({ path: `${OUT}/${W}x${H}-5-applied.png` });
  /* 再套鎮嶽到鞋子 → 又變 3 種；再套回 → 這次直接套在沒印的…（沒有空的了）：改測湊齊：把戒指 1 的鎮嶽留著、補疾霆回去 */
  await p.evaluate(() => {
    S.frags.wangyin_jiting = 1;
    CHSEL = 'wangyin_jiting';
    CHUI.v = 0;
    S.eq.helm.r = 1;
    hudPanels();
  });
  await tap(p, '#pchase .chact .btn');
  await p.waitForTimeout(250);
  await tap(p, '#pchase [data-wyk="helm"]');
  await p.waitForTimeout(1100);
  const four = await p.evaluate(() => [$('warn').textContent, wyOn().size, ST.leech]);
  ok(four[0] === '四印齊鳴 4／4・效果 ×1.25' && four[1] === 4, `${tag} 湊齊四種：第二行吐司`, four);
  await p.evaluate(() => ((CHUI.v = 0), hudPanels()));
  await p.waitForTimeout(200);
  const set4 = await p.evaluate(() => document.querySelector('#pchase .chset').textContent);
  ok(set4 === '四印齊鳴 4／4・效果 ×1.25', `${tag} 齊鳴進度（4 種）`, set4);
  const wl = await p.evaluate(() => document.querySelector('#pchase .chact .wyl').textContent);
  ok(wl === '◆ 疾霆印　增加 15% 技能速度', `${tag} 齊鳴後效果字 ×1.25`, wl);
  await p.screenshot({ path: `${OUT}/${W}x${H}-6-chase-4.png` });
  /* 物品說明：歸墟那件（齊鳴 1.3） */
  await p.evaluate(() => {
    closePanels();
    $('tip').classList.add('act');
    showTip(itemTip(S.eq.boots), { left: 200, top: 200, right: 240, bottom: 240, width: 40, height: 40 });
  });
  await p.waitForTimeout(300);
  const tl = await p.evaluate(() => [
    document.querySelector('#tip .wyl').textContent,
    document.querySelector('#tip .wys').textContent
  ]);
  ok(
    tl[0] === '◆ 歸墟印　擊中傷害的 1.3% 偷取為生命' && tl[1] === '四印齊鳴 4／4・效果 ×1.25',
    `${tag} 物品說明：王印那一行＋齊鳴（1.3 不取整）`,
    tl
  );
  const tm = await meas(p, '#tip .wyl');
  ok(tm.lines <= (mob ? 2 : 1), `${tag} 物品說明王印那一行 ${mob ? '≤ 2' : '1'} 行`, tm);
  ok(await inView(p, '#tip'), `${tag} 物品說明在畫面內`);
  await p.screenshot({ path: `${OUT}/${W}x${H}-7-tip.png` });
  /* 比較框：倉庫一件帶赤霄印的稀有戒指，選中 */
  await p.evaluate(() => {
    hideTip();
    const it = mkItem('r_iron', 60, 2);
    it.wy = 'wangyin_chixiao';
    it.chase = 'wangyin_chixiao';
    invPut(S.inv, it);
    BAG.sel = it.id;
    BAG.f = 'all';
    NAV.slot = null;
    openPanel('inv');
  });
  await p.waitForTimeout(500);
  const cw = await p.evaluate(() => [...document.querySelectorAll('.cmpc .wyl')].map(e => e.textContent));
  ok(cw.includes('◆ 赤霄印　增加 16% 傷害'), `${tag} 比較框有王印那一行`, cw);
  const cm = await meas(p, '.cmpc .wyl');
  ok(cm && cm.lines <= (mob ? 2 : 1), `${tag} 比較框王印那一行 ${mob ? '≤ 2' : '1'} 行`, cm);
  await p.evaluate(
    () => document.querySelector('.cmpc') && document.querySelector('.cmpc').scrollIntoView({ block: 'center' })
  );
  await p.screenshot({ path: `${OUT}/${W}x${H}-8-compare.png` });
  await ctx.close();
}
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const sizes = process.argv[4]
    ? [process.argv[4].split('x').map(Number)]
    : [
        [390, 844],
        [1280, 720],
        [375, 667],
        [1440, 900]
      ];
  for (const [W, H] of sizes) await run(b, W, H);
  await b.close();
  console.log(fail ? `❌ ${fail} 項沒過` : '✅ 全部通過');
  process.exit(fail ? 1 : 0);
})();
