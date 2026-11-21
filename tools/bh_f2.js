/* dpoe-hud133-fix3 F2：生命條填滿寬度對不上數值，是程式 bug 還是擷取造成？
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/bh_f2.js [輸出 json]
   A 不凍結時鐘（真時間）：setV('bhpv') 有沒有更新 --v、transitionend 後填滿寬度是否 = round(生命÷最大 × 內寬)
   B 照 fix2 的 bh_shots 順序（hudTick 後同一段 JS 立刻 DBG.freeze）：轉場被暫停在第 0 毫秒，寬度停在舊值
   C 修正後的順序（DBG.settle：先把轉場推到終點再凍結）：寬度 = 數值 */
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.argv[3] || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {}),
    out = {};
  for (const [W, H, touch] of [
    [390, 844, 1],
    [1280, 720, 0]
  ]) {
    const run = async mode => {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: !!touch, isMobile: !!touch });
      await ctx.route(/supabase/, r => r.abort());
      const p = await ctx.newPage();
      await p.goto(URL + '?dbg=1&seed=7&' + Date.now());
      await p.evaluate(() => localStorage.clear());
      await p.reload();
      await p.waitForTimeout(1200);
      await p.evaluate(() => {
        proSkip();
        S.story.tips = 0;
        S.auto = 0;
        runNode(TRUNK_K[16]);
        ST = stats();
        hudBar();
        DBG.clear();
        ST.hp = 1000;
        P.hp = 1000;
        DBG.es(600, 600, 0);
        hudTick();
      });
      await p.waitForTimeout(500);
      const r = await p.evaluate(async mode => {
        const i = document.querySelector('#bhp > i'),
          inner = () => $('bhp').clientWidth,
          w = () => +i.getBoundingClientRect().width.toFixed(2),
          tr = () =>
            document
              .getAnimations()
              .filter(a => a.effect && a.effect.target === i)
              .map(a => ({ prop: a.transitionProperty, state: a.playState, t: Math.round(a.currentTime) }));
        const o = { before: { v: HV.bhpv, w: w() } };
        /* 生命 1000 → 300（每狀態都是這樣：先滿血再設成例值） */
        P.hp = 300;
        let ended = 0;
        i.addEventListener('transitionend', () => (ended = performance.now()), { once: true });
        hudTick();
        o.set = { HV: HV.bhpv, cssV: $('bhp').style.getPropertyValue('--v'), w: w(), trans: tr() };
        if (mode === 'B') DBG.freeze();
        if (mode === 'C') DBG.settle();
        const t0 = Date.now();
        await new Promise(r => setTimeout(r, 300));
        o.after300 = {
          w: w(),
          inner: inner(),
          want: Math.round((P.hp / ST.hp) * inner()),
          hp: P.hp,
          max: ST.hp,
          text: $('bhp').lastChild.textContent,
          trans: tr(),
          transitionend: mode === 'A' ? !!ended : null,
          realMs: Date.now() - t0
        };
        o.ok = Math.abs(o.after300.w - o.after300.want) <= 2;
        return o;
      }, mode);
      await ctx.close();
      return r;
    };
    for (const mode of ['A', 'B', 'C']) out[`${mode}_${W}x${H}`] = await run(mode);
  }
  await b.close();
  const f = process.argv[2];
  if (f) fs.writeFileSync(f, JSON.stringify(out, null, 1));
  for (const [k, v] of Object.entries(out))
    console.log(
      `${k[0] === 'B' ? (v.ok ? '❌ 沒重現' : '🔁 重現（舊擷取順序）') : v.ok ? '✅' : '❌'} ${k}：--v ${v.set.cssV}；300 ms 後寬 ${v.after300.w}／應 ${v.after300.want}（內寬 ${v.after300.inner}，${v.after300.text}）；轉場 ${JSON.stringify(v.after300.trans)}${v.after300.transitionend != null ? '；transitionend ' + v.after300.transitionend : ''}`
    );
})();
