/* Task A：候選數值 × 每一場的收入（hybrid.js，LUMP=60 校準過）× 同一場收入的 550 版對照。
   目標（任務書）：瞭望台 Lv1 8–12 分；祭壇 1、鍛造台 2、民房 2 各不晚於 550 參考 4 分以上。
   兩種參考：fixed＝工程師的 550 實掛（before_390x844：祭壇 6.75、鍛造台 2 9.35、民房 2 11.60；before_1280x720：6.77、10.60、13.35）；
            paired＝同一場收入、550 版規則的重播（扣掉每場收入高低的雜訊）。
   用法：node sweep.js 輸出.csv 收入1.csv...；候選在下面的 CANDS */
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
const [OUT, ...F] = process.argv.slice(2);
const CANDS = [
  { n: 'main(F)', e: {} },
  { n: 'forge2 280/80', e: { F2S: 280 } },
  { n: 'forge2 260/80', e: { F2S: 260 } },
  { n: 'forge2 250/80', e: { F2S: 250 } },
  { n: 'forge2 240/80', e: { F2S: 240 } },
  { n: 'forge2 225/80', e: { F2S: 225 } },
  { n: 'forge2 200/80', e: { F2S: 200 } },
  { n: 'forge2 250/70', e: { F2S: 250, F2W: 70 } },
  { n: 'house2 320/80 (對照：只改民房)', e: { H2S: 320 } },
  { n: 'ref550', e: { W1S: 550, W1I: 10 } }
];
const FIX = { 390: { altar1: 6.75, forge2: 9.35, house2: 11.6 }, 1280: { altar1: 6.77, forge2: 10.6, house2: 13.35 } };
const run = (e, files) => execFileSync('node', [path.join(__dirname, 'hybrid.js'), ...files], { env: { ...process.env, LUMP: '60', ...Object.fromEntries(Object.entries(e).map(([k, v]) => [k, String(v)])) } })
  .toString().trim().split('\n').slice(1).map(l => { const c = l.split(','); return { run: c[0], altar1: +c[7] || 99, watch1: +c[8] || 99, house2: +c[9] || 99, forge2: +c[10] || 99, ord: c[12] }; });
const ref = run(CANDS.at(-1).e, F);
const L = [['候選', '收入來源', '尺寸', '祭壇1', '瞭望台1', '鍛造台2', '民房2', 'Δ祭壇_paired', 'Δ鍛造台2_paired', 'Δ民房2_paired', 'Δ祭壇_fixed', 'Δ鍛造台2_fixed', 'Δ民房2_fixed', '瞭望台8-12', 'paired全過', 'fixed全過', '順序'].join(',')];
const agg = {};
for (const c of CANDS.slice(0, -1)) {
  const R = run(c.e, F);
  R.forEach((r, i) => {
    const p = ref[i], sz = /1280/.test(r.run) ? 1280 : 390, fx = FIX[sz];
    const d = k => +(r[k] - p[k]).toFixed(2), x = k => +(r[k] - fx[k]).toFixed(2);
    const w = r.watch1 >= 8 && r.watch1 <= 12, pp = w && d('altar1') <= 4 && d('forge2') <= 4 && d('house2') <= 4, fp = w && x('altar1') <= 4 && x('forge2') <= 4 && x('house2') <= 4;
    L.push([c.n, r.run, sz, r.altar1, r.watch1, r.forge2, r.house2, d('altar1'), d('forge2'), d('house2'), x('altar1'), x('forge2'), x('house2'), w ? 1 : 0, pp ? 1 : 0, fp ? 1 : 0, r.ord].join(','));
    const A = (agg[c.n] = agg[c.n] || { n: 0, pp: 0, fp: 0, w: 0, mf: -99, mh: -99, ma: -99 });
    A.n++; A.pp += pp; A.fp += fp; A.w += w; A.mf = Math.max(A.mf, d('forge2')); A.mh = Math.max(A.mh, d('house2')); A.ma = Math.max(A.ma, d('altar1'));
  });
}
fs.writeFileSync(OUT, L.join('\n') + '\n');
console.log('候選 | 場數 | 瞭望台 8–12 | paired 全過 | fixed 全過 | 最晚 Δ祭壇／Δ鍛造台2／Δ民房2（paired，分）');
for (const [n, A] of Object.entries(agg)) console.log(`${n} | ${A.n} | ${A.w} | ${A.pp} | ${A.fp} | ${A.ma.toFixed(2)}／${A.mf.toFixed(2)}／${A.mh.toFixed(2)}`);
