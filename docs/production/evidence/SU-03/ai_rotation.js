/* SU-03：每把受影響的武器掛機 2 分鐘（遊戲時間，DBG.step 推進，真的 aiTick／技能／怪物），數各招實際放了幾次。
   用法：先開本機伺服器，node docs/production/evidence/SU-03/ai_rotation.js [網址，預設 http://localhost:8000/] [秒數，預設 120]
   玩家設成不會死（hurtPlayer 換成空函式），魔力照常扣；第 0 格是左鍵普攻，AI 照 aiOrder 先試 1～4 格。 */
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8000/',
  SEC = +process.argv[3] || 120;
const SETS = {
  /* 第 0 格放左鍵普攻；同武器另一招普攻（沒有冷卻）不放，放了 AI 會一直放它（設計規則：普攻只放左鍵） */
  斧: ['axe', ['axethrow', 'rend', 'warcry', 'cu_vuln', null]],
  錘: ['mace', ['quake', 'leap', 'fissure', 'chargeslam', 'seiscry']],
  細杖: ['qstaff', ['combo', 'thunder', 'warcry', 'cu_tchains', null]],
  長矛: ['spear', ['thrust', 'frostfang', 'warcry', 'cu_vuln', null]],
  匕首: ['dagger', ['flyswords', 'swordarray', 'shadowstrike', 'cu_vuln', null]],
  弓: ['bow', ['split', 'refract', 'gasarrow', 'cu_eleweak', null]],
  爪: ['claw', ['clawchain', 'bloodrage', 'blindpounce', 'warcry', null]],
  長杖通用法術: ['staff', ['fireball', 'nova', 'venom', 'thunderstorm', 'profane']],
  /* 印記改通用：爪拿獵人印記（原本只有魔符能用） */
  '爪＋獵人印記': ['claw', ['clawchain', 'bloodrage', 'blindpounce', 'mk_poacher', null]]
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const out = {};
  for (const [name, [wt, ks]] of Object.entries(SETS)) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.route('**/*.supabase.co/**', r => r.abort());
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL + '?dbg=1&seed=7&' + Date.now());
    await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof runNode === 'function');
    await p.waitForTimeout(400);
    const r = await p.evaluate(
      ([wt, ks, SEC]) => {
        introStop();
        proSkip();
        S.story.tips = 0;
        S.lv = 50;
        S.camp.wts = [...new Set([...(S.camp.wts || []), wt])];
        S.eq.weapon = mkItem(BASES.filter(x => x.wt === wt)[0].id, 1, 0);
        ks.forEach((k, i) => (k && (S.lib.sk[k] = 1), (S.skills[i] = k ? { k, so: [null, null], n: 2 } : newSlot())));
        ST = stats();
        S.auto = 1;
        runNode(TRUNK_K[0]);
        const N = {},
          pay = window.skillPay;
        window.skillPay = function (c, i) {
          N[c.k] = (N[c.k] || 0) + 1;
          return pay.apply(this, arguments);
        };
        /* 折射箭矢的衝擊波、擲斧回程的加劇：另外數 */
        const wave = window.arrowWave,
          agg = window.aggBleed;
        let W = 0,
          A = 0;
        window.arrowWave = function () {
          W++;
          return wave.apply(this, arguments);
        };
        window.aggBleed = function () {
          const d = agg.apply(this, arguments);
          if (d) A++;
          return d;
        };
        window.hurtPlayer = () => {};
        const k0 = G.kills;
        for (let i = 0; i < (SEC * 1000) / 33; i++) {
          DBG.step(33);
          P.hp = ST.hp;
          if (G.state === 'dead' || G.scene !== 'map') runNode(TRUNK_K[0]);
        }
        const wOK = ks
          .filter(Boolean)
          .map(k => (wtOK(SKILLS[k]) ? '' : k))
          .filter(Boolean);
        return { N, W, A, kills: G.kills - k0, cant: wOK };
      },
      [wt, ks, SEC]
    );
    const tot = Object.values(r.N).reduce((a, x) => a + x, 0) || 1;
    out[name] = { ...r, ks, err: errs.slice(0, 3) };
    console.log(
      `${name}（${wt}）：` +
        ks
          .filter(Boolean)
          .map(k => `${k} ${r.N[k] || 0}（${Math.round(((r.N[k] || 0) / tot) * 100)}%）`)
          .join('、') +
        `｜擊殺 ${r.kills}｜衝擊波 ${r.W}｜加劇 ${r.A}${r.cant.length ? '｜拿這把不能用：' + r.cant.join(',') : ''}${errs.length ? '｜錯誤：' + errs[0] : ''}`
    );
    await ctx.close();
  }
  console.log(JSON.stringify(out));
  await b.close();
})();
