/* SU-03：單招每秒傷害（技能面板的 dpsOf：hitCalc 平均 ÷ max(出手時間, 冷卻)），Lv 50、武器物品等級 20（穿得上的最高基底）、寶石 Lv 10，沒有輔助。
   用法：node docs/production/evidence/SU-03/dps_table.js 改前網址 改後網址 */
const { chromium } = require('playwright');
const [A, B] = process.argv.slice(2);
const L = [
  ['axe', 'rend'],
  ['axe', 'axethrow'],
  ['mace', 'fissure'],
  ['mace', 'leap'],
  ['mace', 'chargeslam'],
  ['qstaff', 'thunder'],
  ['spear', 'frostfang'],
  ['dagger', 'swordarray'],
  ['bow', 'gasarrow'],
  ['bow', 'refract'],
  ['claw', 'bloodrage'],
  ['staff', 'nova'],
  ['staff', 'profane'],
  ['staff', 'venom'],
  ['staff', 'thunderstorm']
];
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const run = async url => {
    const p = await b.newPage();
    await p.goto(url + '?dbg=1&seed=5&' + Date.now());
    await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof dpsOf === 'function');
    await p.waitForTimeout(400);
    const r = await p.evaluate(L => {
      introStop();
      proSkip();
      S.lv = 50;
      S.camp.wts = Object.keys(WTN);
      S.eq.amulet = mkItem(BASES.find(b => b.k === 'amulet').id, 20, 2);
      S.eq.amulet.a = [{ k: 'attrA', v: 300, T: 1 }];
      return L.map(([wt, k]) => {
        S.eq.weapon = BASES.filter(b => b.k === 'weapon' && b.wt === wt)
          .map(b => mkItem(b.id, 20, 0))
          .filter(it => !eqLack(S, it, 'weapon').length)
          .pop();
        S.lib.sk[k] = 10;
        S.skills[1] = { k, so: [null, null], n: 2 };
        ST = stats();
        const c = slotCfg(1),
          bad = slotBad(1, c),
          N = skillNums(c);
        return [k, SKILLS[k].n, c.cd || 0, Math.round(dpsOf(1) || 0), Math.round(N.hit || 0), bad];
      });
    }, L);
    await p.close();
    return r;
  };
  const a = await run(A),
    c = await run(B);
  console.log('| 招 | 冷卻 改前→改後 | 每秒傷害 改前→改後 | 一下 |\n| --- | --- | --- | --- |');
  a.forEach((x, i) => console.log(`| ${x[1]} | ${x[2]} → ${c[i][2]} 秒 | ${x[3]} → ${c[i][3]} | ${c[i][4]} |`));
  await b.close();
})();
