'use strict';
/* num-tree-v4-verify 第 17 項（珠寶分頁儲存規則，S1、S2、S5）。以 v3 的 jw_store_test.js 為底：第 16 項（migrate）取消（12:57），整段拿掉。
   在本機瀏覽器實際跑本分支的遊戲程式（Playwright）：
     python3 -m http.server 8765   （repo 根目錄）
     node evidence/num-tree-v4-verify/jw_store_test.js [網址，預設 http://localhost:8765/]
   每一條印 ✅／❌，有 ❌ 結束碼 1。 */
const { chromium } = require('playwright');
const URL0 = process.argv[2] || 'http://localhost:8765/';
(async () => {
  const br = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {}),
    pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(URL0 + '?local=1');
  await pg.waitForFunction(() => typeof S !== 'undefined' && S);
  await pg.evaluate(() => typeof proSkip === 'function' && proSkip());
  await pg.waitForTimeout(500);
  const R = await pg.evaluate(() => {
    const out = [],
      ok = (name, pass, info) => out.push({ name, pass: !!pass, info: info === undefined ? '' : JSON.stringify(info) }),
      clone = o => JSON.parse(JSON.stringify(o)),
      NT = [...PT_NOTABLES],
      mkJ = (id, n = 1, at = 0) => ({ id, nt: NT.slice(at, at + n) }),
      mkJ0 = mkJ;
    /* ---------- 第 17 項：儲存規則 ---------- */
    /* 新存檔直接用新格式（12:57：舊存檔不支援，不做 migrate 珠寶遷移） */
    {
      const g = newGame();
      ok(
        '17 新存檔直接用新格式：S.inv.jw 是空的分頁、沒有 S.jewels',
        Array.isArray(g.inv.jw) && !g.inv.jw.length && !('jewels' in g),
        { inv: Object.keys(g.inv), jewels: 'jewels' in g }
      );
    }
    S = newGame();
    S.camp.store = 0;
    S.camp.forge = 20;
    const soul0 = () => [S.mat.soul, S.gold, JSON.stringify(S.prd)];
    {
      for (let i = 0; i < 30; i++) jwChance(1);
      let calls = 0;
      const rnd = Math.random;
      Math.random = () => (calls++, rnd());
      const s0 = soul0(),
        c = jwChance(1);
      Math.random = rnd;
      ok(
        '17 倉房 Lv0 正常格數 30 滿 → 機率掉落暫停（不擲骰、不給靈魂）並提示',
        jwList(S).length === 30 &&
          jwCap(S) === 30 &&
          calls === 0 &&
          /珠寶分頁滿了（30／30）/.test(c[0]) &&
          JSON.stringify(soul0()) === JSON.stringify(s0),
        { n: jwList(S).length, calls, c }
      );
    }
    {
      const got = [];
      for (let i = 0; i < 5; i++) got.push(jwGain(i % 2 ? 'zhuolu' : 'chiyou'));
      const at35 = jwList(S).length,
        warn35 = got.some(g => /請清理/.test(g.join())),
        g36 = jwGain('chiyou');
      ok(
        '17 王保底放進多留的 5 格（31～35 不提示清理）；35 滿了照樣掉（36 顆）、超過上限並提示清理；機率掉落還是暫停',
        at35 === 35 &&
          !warn35 &&
          jwList(S).length === 36 &&
          /超過上限（36／35）：請清理/.test(g36[1] || '') &&
          /滿了/.test(jwChance(1)[0]),
        { at35, g36 }
      );
    }
    {
      const caps = [0, 1, 2, 3, 4, 5].map(l => ((S.camp.store = l), [jwCap(S), jwCap(S) + JEWEL.boss])),
        n = jwList(S).length;
      S.camp.store = 1; /* 34 格，36 顆還是滿 */
      const p1 = jwChance(1);
      S.camp.store = 2; /* 38 格：恢復 */
      const p2 = jwChance(1);
      ok(
        '17 倉房 Lv0～5 珠寶格 30／34／38／42／46／50（＋5＝35～55）；倉庫 300 不變；滿的時候升倉房（Lv1 還是滿、Lv2 有空）機率掉落恢復',
        JSON.stringify(caps) === '[[30,35],[34,39],[38,43],[42,47],[46,51],[50,55]]' &&
          INV_CAP === 300 &&
          /滿了/.test(p1[0] || '') &&
          jwList(S).length === n + 1 &&
          p2.length === 1 &&
          !/滿了/.test(p2[0]),
        { caps, INV_CAP, p1, p2 }
      );
    }
    {
      const L = jwList(S),
        a = L[0].id,
        b = L[1].id;
      jwPut(0, a);
      const s0 = soul0(),
        n0 = L.length,
        r1 = jwDrop(a),
        r2 = jwDrop(b);
      ok(
        '17 長按丟棄：鑲著的不能丟；沒鑲的丟掉，什麼都不給（靈魂、金、偽隨機計數不變）',
        /鑲著的不能丟/.test(r1) &&
          r2 === null &&
          L.length === n0 - 1 &&
          jwOf(S, a) &&
          !jwOf(S, b) &&
          JSON.stringify(soul0()) === JSON.stringify(s0),
        { r1, r2 }
      );
    }
    {
      /* 換金、分解、賣出：物品種類層擋珠寶 */
      const j = jwList(S)[2],
        n0 = jwList(S).length,
        t = f => {
          try {
            f();
            return 'ok';
          } catch (e) {
            return 'throw';
          }
        };
      const r = {
        put: invPut(S.inv, j),
        sell: t(() => sellPrice(j)),
        salv: t(() => salvageDo(j)),
        inItems: S.inv.items.includes(j)
      };
      ok(
        '17 珠寶進不了裝備清單（invPut＝false）；賣價、分解直接擋（丟錯）',
        !r.put && r.sell === 'throw' && r.salv === 'throw' && !r.inItems && jwList(S).length === n0,
        r
      );
      /* 換金（game.js pickup）：倉庫滿 300 件，地上的珠寶物件被撿 → 不會變成金幣 */
      S.inv.items = Array.from({ length: INV_CAP }, () => mkItem('c_leather', 12, 0));
      const g0 = S.gold,
        d = { it: j, x: 0, y: 0 },
        pk = t(() => pickup(d));
      ok(
        '17 換金（倉庫滿、撿到珠寶物件）：不換金（擋下來）',
        pk === 'throw' && S.gold === g0 && jwList(S).length === n0,
        { pk, gold: S.gold - g0 }
      );
      /* 批量分解／批量賣出：倉庫滿、分頁有珠寶 → sellAll 只分解裝備 */
      const m0 = clone(S.mat);
      BAG.f = 'all';
      const sells = bagSells().length;
      sellAll();
      ok(
        `17 批量分解（sellAll／bagSells）：分解 ${sells} 件裝備，珠寶 ${n0} 顆一顆不少`,
        sells === INV_CAP && S.inv.items.length === 0 && jwList(S).length === n0 && S.mat.soul > m0.soul,
        { sells, left: S.inv.items.length, jw: jwList(S).length }
      );
      /* 滿了打造出來直接分解（craft.js 自動分解）：倉庫塞滿再打造 → 打出來的裝備被分解，珠寶不動 */
      S.inv.items = Array.from({ length: INV_CAP }, () => mkItem('c_leather', 12, 0));
      const lk = craftLack;
      craftLack = () => null; /* 材料夠：只測「倉庫滿了打出來直接分解」 */
      S.gold = 1e9;
      const cr = craftDo('chest', { T: 1, n: 1 });
      craftLack = lk;
      ok(
        '17 滿了打造出來直接分解（craftDo → salvageDo）：裝備被分解，珠寶一顆不少',
        cr.items &&
          cr.items.length === 1 &&
          cr.items[0].salv === 1 &&
          S.inv.items.length === INV_CAP &&
          jwList(S).length === n0,
        { why: cr.why, salv: cr.items && cr.items.map(i => i.salv), jw: jwList(S).length }
      );
    }
    return out;
  });
  let bad = 0;
  for (const r of R) {
    if (!r.pass) bad++;
    console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.info ? ' ' + r.info : ''}`);
  }
  if (errs.length) console.log('頁面錯誤：', errs.slice(0, 3).join(' | '));
  console.log(`共 ${R.length} 條：✅ ${R.length - bad}／❌ ${bad}`);
  await br.close();
  process.exit(bad ? 1 : 0);
})();
