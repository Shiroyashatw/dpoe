'use strict';
/* num-tree-v3-verify 第 16 項（migrate() 存檔 35 → 36，定案 4.1.1 S3＝M1）與第 17 項（珠寶分頁儲存規則，S1、S2、S5）。
   在本機瀏覽器實際跑本分支的遊戲程式（Playwright）：
     python3 -m http.server 8765   （repo 根目錄）
     node evidence/num-tree-v3-verify/jw_store_test.js [網址，預設 http://localhost:8765/]
   每一條印 ✅／❌，有 ❌ 結束碼 1。 */
const { chromium } = require('playwright');
const URL0 = process.argv[2] || 'http://localhost:8765/';
(async () => {
  const br = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {}),
    pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(URL0 + '?local=1');
  await pg.waitForFunction(() => typeof migrate === 'function' && typeof S !== 'undefined' && S);
  await pg.evaluate(() => typeof proSkip === 'function' && proSkip());
  await pg.waitForTimeout(500);
  const R = await pg.evaluate(() => {
    const out = [],
      ok = (name, pass, info) => out.push({ name, pass: !!pass, info: info === undefined ? '' : JSON.stringify(info) }),
      clone = o => JSON.parse(JSON.stringify(o)),
      NT = [...PT_NOTABLES],
      mkJ = (id, n = 1, at = 0) => ({ id, nt: NT.slice(at, at + n) }),
      /* 存檔 35 的樣子：珠寶在 S.jewels、倉庫只有 items */
      v35 = (jewels, jsock = [null, null, null, null, null, null], extra = {}) => {
        const o = clone(newGame());
        o.v = 35;
        o.inv = { items: [] };
        o.jewels = jewels;
        o.jsock = jsock;
        return Object.assign(o, extra);
      },
      sig = L => L.map(j => j.id + ':' + j.nt.join('|')).sort(),
      /* 遷移前後比：總數、每顆 id 與 nt、孔 */
      same = (old, m) =>
        JSON.stringify(sig(old.jewels)) === JSON.stringify(sig(m.inv.jw)) &&
        JSON.stringify(old.jsock) === JSON.stringify(m.jsock) &&
        !('jewels' in m);
    /* ---------- 第 16 項：migrate() ---------- */
    const J = n => Array.from({ length: n }, (_, i) => mkJ('j' + i, 1 + (i % 2), i * 2));
    const cases = {
      空檔: v35([]),
      未滿10: v35(J(10)),
      剛好滿30: v35(J(30)),
      超額45: v35(J(45)),
      孔全鑲: v35(J(8), ['j0', 'j1', 'j2', 'j3', 'j4', 'j5'])
    };
    for (const [k, old] of Object.entries(cases)) {
      const keep = clone(old),
        m = migrate(clone(old));
      ok(
        `16 ${k}：遷移後 ${m.inv.jw.length} 顆（原 ${old.jewels.length}），id、nt、孔都一樣，存檔版本 ${m.v}`,
        same(keep, m) && m.v === 36 && m.inv.items.length === 0 && m.gold === keep.gold && m.mat.soul === keep.mat.soul,
        { n: m.inv.jw.length, gold: m.gold, soul: m.mat.soul }
      );
    }
    /* 超額：照搬、不換金不換靈魂不刪；暫時超過上限＝機率掉落暫停、王保底照收 */
    {
      const m = migrate(clone(cases.超額45));
      S = m;
      const r0 = [jwList(S).length, jwCap(S), jwRoom(S)],
        c = jwChance(1),
        b = jwGain('chiyou');
      ok(
        '16 超額：45 顆照搬（上限 30），機率掉落不掉、王保底照收並提示清理',
        r0[0] === 45 &&
          r0[1] === 30 &&
          !r0[2] &&
          jwList(S).length === 46 &&
          /滿了/.test(c[0]) &&
          /請清理/.test(b[1] || ''),
        { r0, c, b, n: jwList(S).length }
      );
    }
    /* 孔全鑲：鑲著的照樣生效（S.jsock 不變、jewelNodes／stats 跟「直接用新格式建」一樣） */
    {
      const old = cases.孔全鑲,
        m = migrate(clone(old)),
        /* 每區點滿 40 點讓孔開著：照 secCount 把每區的一般點各拿 40 個 */
        pts = [...PT_START];
      for (let sec = 0; sec < 6; sec++)
        pts.push(
          ...PTREE.N.filter(n => n.sec === sec && !n.gate && n.big === 0 && !n.lock && !PT_START.includes(n.id))
            .slice(0, 40)
            .map(n => n.id)
        );
      m.pt = pts;
      const ref = clone(m);
      ref.inv.jw = clone(old.jewels);
      const none = clone(m);
      none.jsock = [null, null, null, null, null, null];
      const a = stats(m),
        b = stats(ref),
        z = stats(none),
        jn = jewelNodes(m).map(n => n.id),
        jr = jewelNodes(ref).map(n => n.id);
      ok(
        `16 孔全鑲：6 孔都開，遷移後 jewelNodes ${jn.length} 個、跟直接用新格式建的一樣；stats 一樣、跟沒鑲的不一樣`,
        secCount(m).every(c => c >= JEWEL.need) &&
          jn.length > 0 &&
          JSON.stringify(jn) === JSON.stringify(jr) &&
          JSON.stringify(a) === JSON.stringify(b) &&
          JSON.stringify(a) !== JSON.stringify(z) &&
          JSON.stringify(m.jsock) === JSON.stringify(old.jsock),
        { jn: jn.length, sec: secCount(m) }
      );
    }
    /* id 衝突：同 id 不同內容 → 第二顆給新 id、兩顆都留、記錄；同 id 同內容（重複存）→ 只留一顆 */
    {
      const old = v35([mkJ('x', 1, 0), mkJ('x', 2, 4), mkJ('y', 1, 8)], ['x', null, null, null, null, null]),
        m = migrate(clone(old)),
        ids = m.inv.jw.map(j => j.id);
      ok(
        '16 id 衝突：x（1 大點）留原 id、另一顆 x 改成 x_1、兩顆都在；孔還是指原本的 x；有記錄',
        ids.join() === 'x,x_1,y' &&
          m.inv.jw[1].nt.join() === old.jewels[1].nt.join() &&
          m.jsock[0] === 'x' &&
          m.jwLog.some(l => /衝突/.test(l)),
        { ids, log: m.jwLog }
      );
    }
    /* 孤兒孔：孔裡的 id 找不到 → 那格清空並記錄，其他孔不動 */
    {
      const old = v35([mkJ('a'), mkJ('b', 1, 2)], ['a', 'ghost', null, 'b', null, null]),
        m = migrate(clone(old));
      ok(
        '16 孤兒孔：ghost 那格清空、記錄；a、b 不動',
        JSON.stringify(m.jsock) === JSON.stringify(['a', null, null, 'b', null, null]) &&
          m.jwLog.some(l => /ghost/.test(l)) &&
          m.inv.jw.length === 2,
        { jsock: m.jsock, log: m.jwLog }
      );
    }
    /* 重跑兩次：(1) 遷移完的存檔再 migrate；(2) 同一份存檔 35 物件（倉庫是同一個參考）連跑兩次 → 都不會多 */
    {
      const old = v35([...J(12), mkJ('j0', 2, 40)], ['j0', 'j3', null, null, null, null]),
        a = migrate(clone(old)),
        a2 = migrate(clone(a)),
        a3 = migrate(clone(a2)),
        raw = clone(old),
        r1 = migrate(raw),
        r2 = migrate(raw),
        n = old.jewels.length;
      ok(
        `16 重跑兩次：${n} 顆 → ${a.inv.jw.length}／${a2.inv.jw.length}／${a3.inv.jw.length}；同一份舊存檔連跑兩次 ${r1.inv.jw.length}／${r2.inv.jw.length}`,
        [a, a2, a3, r1, r2].every(
          m => m.inv.jw.length === n && JSON.stringify(sig(m.inv.jw)) === JSON.stringify(sig(a.inv.jw))
        ) && JSON.stringify(a3.jsock) === JSON.stringify(old.jsock),
        sig(a.inv.jw).slice(-2)
      );
    }
    /* ---------- 第 17 項：儲存規則 ---------- */
    S = migrate(v35([]));
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
