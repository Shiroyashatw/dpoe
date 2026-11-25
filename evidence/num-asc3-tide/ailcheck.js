/* num-asc3-tide §6 壞組合檢查：用遊戲的 hitCalc（非 avg 模式，平均 4000 下）量
   1) 潮起／潮落：這一下對感電、冰緩／冰凍「算進去的量」（applyAil 讀的 p.light＋keep.light、p.cold＋keep.cold）÷ 沒昇華時的元素量
   2) 潮滅 noFire 的代價：同一套配裝插「附加火焰」時，有潮滅少掉的傷害
   配裝＝builds.js 的電弧、冰霜彈、閃電箭（等級點 a、種子 1），王＝BOSSES[0] 第 16 階（mobDef）。先開本機伺服器 */
const { chromium } = require('playwright'); const fs = require('fs');
const { BUILDS, POINTS } = require('./builds.js');
const CASES = [
  ['arc', null, []], ['arc', 'tide', ['s1', 'rise']], ['arc', 'tide', ['s1', 'fall']],
  ['frost', null, []], ['frost', 'tide', ['s1', 'rise']], ['frost', 'tide', ['s1', 'fall']],
  ['bow', null, []], ['bow', 'tide', ['s1', 'rise']], ['bow', 'tide', ['s1', 'fall']],
  ['arc', 'tide', ['s1', 'rise', 's3', 'ebb']], ['arcF', null, []], ['arcF', 'tide', ['s1', 'rise', 's3', 'ebb']]
];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const out = [];
  for (const [bk, asc, at] of CASES) {
    const ctx = await b.newContext(); const p = await ctx.newPage();
    await p.goto('http://localhost:8000/?dbg=1&seed=1&p=9');
    await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof proSkip === 'function');
    await p.addScriptTag({ content: fs.readFileSync(__dirname + '/simlib.js', 'utf8') });
    /* arcF＝電弧把「抗性穿透」換成「附加火焰」 */
    const B = bk === 'arcF' ? { ...BUILDS.arc, skills: [{ k: 'arc', so: ['fury', 'haste', 'crit', 'fireadd'] }] } : BUILDS[bk];
    const r = await p.evaluate(cfg => {
      __sim.setup(cfg);
      runNode(TRUNK_K[21]);
      G.mobs = []; G.waves = [];
      G.fdB = BOSSES[0]; spawnBoss(); G.fdB = null;
      const m = G.mobs.find(x => x.boss), c = slotCfg(0), N = 4000, s = { d: 0, light: 0, cold: 0, fire: 0, phys: 0, kL: 0, kC: 0 };
      for (let i = 0; i < N; i++) {
        m.ail = {};
        const h = hitCalc(c, m);
        s.d += h.d; for (const k of ['light', 'cold', 'fire', 'phys']) s[k] += h.pre[k];
        s.kL += h.keep.light; s.kC += h.keep.cold;
      }
      for (const k in s) s[k] /= N;
      return { ...s, shockIn: s.light + s.kL, chillIn: s.cold + s.kC };
    }, { B, ...POINTS.a, holes: 4, asc, at, seed: 1 });
    out.push({ b: bk, asc: asc || 'none', at: at.join('+'), ...r });
    await ctx.close();
  }
  await b.close();
  const R = x => Math.round(x);
  console.log('配裝 昇華 點 | 每下傷害(扣抗後) | 擊中前 閃電 冰冷 火焰 物理 | 感電算入 冰緩/冰凍算入 | 對無昇華：感電算入× 冰緩算入× 合計×');
  for (const o of out) {
    const z = out.find(x => x.b === o.b && x.asc === 'none');
    const el = z.light + z.cold;
    console.log([o.b, o.asc, o.at, '|', R(o.d), '|', R(o.light), R(o.cold), R(o.fire), R(o.phys), '|', R(o.shockIn), R(o.chillIn), '|',
      (o.shockIn / (z.light + z.cold || 1)).toFixed(2), (o.chillIn / (el || 1)).toFixed(2), ((o.shockIn + o.chillIn) / (el || 1)).toFixed(2)].join(' '));
  }
  fs.writeFileSync(__dirname + '/ailcheck.json', JSON.stringify(out, null, 1));
})();
