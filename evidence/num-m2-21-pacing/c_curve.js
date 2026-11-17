/* 選項 C 的生鐵曲線：讀 long/ 的 480 分長跑（5 種子），列指定分鐘的 現行 vs C 的生鐵庫存、累計產量、C 用量、進度；
   以及 C 之下卡住的設施（480 分時買不起是因為生鐵）。用法：node c_curve.js SEC [SINK=C] > 輸出 */
const fs = require('fs'), zlib = require('zlib');
const RJ = f => JSON.parse(fs.existsSync(f) ? fs.readFileSync(f) : zlib.gunzipSync(fs.readFileSync(f + '.gz')));
const SEC = process.argv[2] || 150, SK = process.argv[3] || 'C';
const SEEDS = [20261115, 1, 2, 3, 4];
const MS = [8, 10, 15, 20, 30, 60, 120, 130, 240, 360, 480];
const load = (s, sink, out = 'none') => RJ(`long/s${SEC}_sd${s}_${sink}_${out}.json`);
const A = SEEDS.map(s => load(s, 'none')), B = SEEDS.map(s => load(s, SK));
const st = (L, f) => { const v = L.map(f); return { m: Math.round(v.reduce((a, b) => a + b, 0) / v.length), lo: Math.min(...v), hi: Math.max(...v) }; };
const fmt = o => `${o.m}（${o.lo}–${o.hi}）`;
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
console.log(['分', '現行_生鐵庫存', `${SK}_生鐵庫存`, '累計生鐵產量(現行)', `累計生鐵產量(${SK})`, `${SK}_累計鐵用量`, '現行_鍛瞭斥民祭倉', `${SK}_鍛瞭斥民祭倉`, '現行_地點/礦場產階', `${SK}_地點/礦場產階`, '現行_靈魂庫存', `${SK}_靈魂庫存`].join(','));
for (const m of MS) {
  const a = A.map(j => j.rows[m - 1]), b = B.map(j => j.rows[m - 1]);
  console.log([m, fmt(st(a, r => r.st.iron1)), fmt(st(b, r => r.st.iron1)), fmt(st(a, r => r.prodI1)), fmt(st(b, r => r.prodI1)), fmt(st(b, r => sum(r.sinkUse))),
    a[0].camp, b[0].camp, `${a[0].node}/T${a[0].ironT}`, `${b[0].node}/T${b[0].ironT}`, fmt(st(a, r => r.soul)), fmt(st(b, r => r.soul))].join(','));
}
/* 生鐵停產的時間（礦場產階 ≥2 的第一分鐘）、C 的最高庫存 */
const stop = L => L.map(j => (j.rows.find(r => r.ironT >= 2) || { min: '-' }).min);
console.log(`\n生鐵停產（礦場改產熟鐵）分：現行 ${stop(A).join('/')}；${SK} ${stop(B).join('/')}`);
console.log(`${SK} 生鐵庫存最高：${B.map(j => Math.max(...j.rows.map(r => r.st.iron1))).join('/')}；現行最高 ${A.map(j => Math.max(...j.rows.map(r => r.st.iron1))).join('/')}`);
/* 生鐵卡關：480 分時 下一級 的 C 生鐵 > 手上生鐵，且其他都夠 */
for (const [nm, L] of [[SK, B]]) {
  L.forEach((j, i) => {
    const last = j.rows[j.rows.length - 1];
    const gated = Object.entries(j.next).filter(([b, n]) => n.cx > 0 && !n.lack.length && n.cx > (SK === 'Cb' ? 1e18 : last.st.iron1)).map(([b, n]) => `${b}${n.lv}(要${n.cx}有${last.st.iron1})`);
    /* 最後一次買東西的時間 */
    const lastBuy = j.ev.length ? (j.ev[j.ev.length - 1].t / 60).toFixed(1) : '-';
    const soulsIdle = last.soul;
    console.log(`${nm} 種子${SEEDS[i]}：最後一次升設施 ${lastBuy} 分；480 分靈魂庫存 ${soulsIdle}；被生鐵卡住：${gated.join(' ') || '無'}`);
  });
}
/* 第一個被生鐵卡住的時間：任一分鐘「下一件最便宜的設施靈魂/木/原表材料都夠，只差 C 生鐵」→ 用 ev 推不出，改看靈魂堆積：連續 30 分鐘沒有升任何設施的起點 */
for (const [nm, L] of [['現行', A], [SK, B]]) {
  const s = L.map(j => { const T = j.ev.map(e => e.t / 60); let g = 0, at = '-'; for (let i = 1; i < T.length; i++) if (T[i] - T[i - 1] > g) (g = T[i] - T[i - 1]), (at = T[i - 1].toFixed(0)); const tail = 480 - T[T.length - 1]; return tail > g ? `${T[T.length - 1].toFixed(0)}起到480沒升(${tail.toFixed(0)}分)` : `最長空窗${g.toFixed(0)}分@${at}`; });
  console.log(`${nm} 設施升級最長空窗：${s.join('；')}`);
}
