/* 低階材料出路比較（task 4）：讀 long/ 480 分長跑（5 種子平均），列 60／120／240／480 分的低階死庫存（低於該產生器現產階的 鐵／皮／絲，分階）與副作用。
   方案：none（現行）、a（5 換 1 在第一次升階就開）、c（低階 RC 個換 1 蛻變石）、Cb（C＋任何階鐵都收、低階打折）、C、C+a；(d) 只改顯示＝現行同數字。
   用法：node outlets.js SEC > 輸出.csv */
const fs = require('fs'), zlib = require('zlib');
const RJ = f => JSON.parse(fs.existsSync(f) ? fs.readFileSync(f) : zlib.gunzipSync(fs.readFileSync(f + '.gz')));
const SEC = process.argv[2] || 150;
const SEEDS = [20261115, 1, 2, 3, 4];
const P = [['none', 'none', '現行（含 (d) 只改顯示）'], ['none', 'a', '(a) 5換1 提早到第一次升階（只換到現產階）'], ['none', 'a2', '(a2) 同 a，一路換到材料階上限'], ['Cb', 'none', '(b) C＋任何階鐵、低階打折'], ['none', 'c', '(c) 低階 100→1 蛻變石'], ['C', 'none', 'C（只收生鐵）'], ['C', 'a', 'C＋(a)']];
const avg = v => Math.round(v.reduce((a, b) => a + b, 0) / v.length);
const H = ['方案', '分', '地點(種子1)', '低階鐵T1', '低階鐵T2', '低階皮T1', '低階絲T1', '低階合計', '鐵T2庫存', '鐵T3庫存', '5換1累計得到', '低階換蛻變石累計', '蛻變石庫存', '靈魂庫存', '累計靈魂花費', '鍛瞭斥民祭倉(種子1)', '林礦獵絲(種子1)'];
console.log(H.join(','));
for (const [sink, out, nm] of P) {
  const J = SEEDS.map(s => RJ(`long/s${SEC}_sd${s}_${sink}_${out}.json`));
  for (const m of [30, 60, 120, 240, 480]) {
    const R = J.map(j => j.rows[m - 1]);
    const lowT = (r, mat, T) => { const g = mat === 'iron' ? r.ironT : null; return r.st[mat + T]; };
    /* 低階＝低於現產階：鐵用 ironT；皮、絲用 lowH／lowS 合計（多半只有 T1） */
    const i1 = R.map(r => (r.ironT > 1 ? r.st.iron1 : 0)), i2 = R.map(r => (r.ironT > 2 ? r.st.iron2 : 0));
    console.log([nm, m, R[0].node, avg(i1), avg(i2), avg(R.map(r => r.lowH)), avg(R.map(r => r.lowS)), avg(R.map(r => r.lowI + r.lowH + r.lowS)), avg(R.map(r => r.st.iron2)), avg(R.map(r => r.st.iron3)),
      avg(R.map(r => Object.values(r.trade).reduce((a, b) => a + b, 0))), avg(R.map(r => r.tranTrade)), avg(R.map(r => r.tran)), avg(R.map(r => r.soul)), avg(R.map(r => r.soulSpent)), R[0].camp, R[0].gen].join(','));
  }
}
