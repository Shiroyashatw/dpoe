/* num-asc3-tide：照交辦的合理區間判定 → tables.md（summary.md 的總表從這裡抄）。
   node analyze.js results.json [調整方案的 results_*.json …]
   每個（配裝, 昇華, 等級點）取「最佳路線」＝對無昇華基準三項比例幾何平均最高的那條（report.js 的 gain.sc）。
   三種比法：
   A 自己的代表配裝：風行神射＝弓（閃電箭）、鐵金剛＝錘盾（震地）、潮汐＝電弧或冰霜彈（兩個都列，判定用分數高的那個）
     A1 絕對值（穩態 DPS、清怪速度＝1／清怪秒數、EHP）；A2 昇華帶來的增益（對同配裝無昇華的倍數）
   B 同配裝換昇華（中性配裝：電弧法、閃電箭弓），比增益倍數
   判定：潮汐每項落在 [min(風, 鐵)×0.9, max(風, 鐵)×1.1] 算合理；綜合＝三項各自 ÷ 風鐵平均 的幾何平均，潮汐不得高於 max(風, 鐵 的綜合)×1.1 */
'use strict';
const fs = require('fs');
const load = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const base = load(process.argv[2] || __dirname + '/results.json');
const tunes = process.argv.slice(3).map(f => ({ f, cells: load(f) }));
const gm = a => Math.exp(a.reduce((s, x) => s + Math.log(Math.max(1e-9, x)), 0) / a.length);
const best = (cells, b, asc, pt, ov) =>
  cells
    .filter(c => c.b === b && c.asc === asc && c.pt === pt && (ov ? JSON.stringify(c.ov) === JSON.stringify(ov) : !c.ov) && c.gain)
    .sort((x, y) => y.gain.sc - x.gain.sc)[0];
const none = (cells, b, pt) => cells.find(c => c.b === b && c.asc === 'none' && c.pt === pt && !c.ov);
const pr = (v, d = 0) => (v == null ? '—' : d ? v.toFixed(d) : Math.round(v).toLocaleString('en'));
const sp = a => (a.sp == null ? '' : ` ±${Math.round(a.sp * 100)}%`);
const judge = (w, i, t) => {
  const lo = Math.min(w, i) * 0.9,
    hi = Math.max(w, i) * 1.1;
  return t < lo ? `偏弱（${pr(t / lo, 2)}× 下限）` : t > hi ? `偏強（${pr(t / hi, 2)}× 上限）` : '合理';
};
const ROUTE = { wind: '風行神射', iron: '鐵金剛', tide: '潮汐' };
const BN = { bow: '弓（閃電箭）', mace: '錘盾（震地）', arc: '法（電弧）', frost: '法（冰霜彈）' };
const out = [];
const P = s => out.push(s);
/* m＝{dps, clear(速度), ehp}；回傳判定列 */
function band(title, W, I, T, unit) {
  const k3 = ['dps', 'clear', 'ehp'],
    avg = k => (W[k] + I[k]) / 2,
    comp = X => gm(k3.map(k => X[k] / avg(k)));
  const cw = comp(W),
    ci = comp(I),
    ct = comp(T);
  P(`| ${title} | 風行神射 | 鐵金剛 | 潮汐 | 潮汐 ÷ 風鐵平均 | 判定（[min×0.9, max×1.1]） |`);
  P('|---|---|---|---|---|---|');
  const name = { dps: '打王（穩態）', clear: '清怪（速度）', ehp: '存活（EHP）' };
  for (const k of k3) P(`| ${name[k]}${unit} | ${pr(W[k], 2)} | ${pr(I[k], 2)} | ${pr(T[k], 2)} | ${pr(T[k] / avg(k), 2)} | ${judge(W[k], I[k], T[k])} |`);
  const cj = ct > Math.max(cw, ci) * 1.1 ? `偏強（${pr(ct / (Math.max(cw, ci) * 1.1), 2)}× 上限）` : ct < Math.min(cw, ci) * 0.9 ? `偏弱（${pr(ct / (Math.min(cw, ci) * 0.9), 2)}× 下限 0.9×min，參考）` : '合理';
  P(`| 綜合（三項 ÷ 風鐵平均 的幾何平均） | ${pr(cw, 2)} | ${pr(ci, 2)} | ${pr(ct, 2)} | — | ${cj}（上限 ${pr(Math.max(cw, ci) * 1.1, 2)}） |`);
  P('');
  return { cw, ci, ct };
}
function section(cells, label) {
  P(`## ${label}`);
  P('');
  for (const pt of ['a', 'b']) {
    const ptn = pt === 'a' ? '(a) 長老屋 Lv10 剛開（角色 Lv60、第 22 個地點 怪物 Lv83、8 點）' : '(b) 滿昇華後成長（角色 Lv90、同地點、8 點）';
    P(`### ${ptn}`);
    P('');
    /* A 自己的代表配裝 */
    const W = best(cells, 'bow', 'wind', pt),
      I = best(cells, 'mace', 'iron', pt),
      Ta = best(cells, 'arc', 'tide', pt),
      Tf = best(cells, 'frost', 'tide', pt);
    const T = Ta.gain.sc >= Tf.gain.sc ? Ta : Tf;
    P(`**A. 自己的代表配裝**（最佳路線；數字是 10 個種子的 P50，± 是 (最大−最小)/P50）`);
    P('');
    P('| 昇華 | 配裝 | 路線 | 穩態 DPS | 10 秒爆發 | 原生命擊殺秒數 | 清怪秒數（到王出現） | 每秒擊殺 | EHP 物理／元素 | 時間平均受傷（%生命/秒，打王／清怪） | 倒下次數（打王／清怪） | 浪潮之心平均層數（打王／清怪） |');
    P('|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const [a, c] of [['wind', W], ['iron', I], ['tide', Ta], ['tide', Tf]]) {
      const g = c.agg;
      P(
        `| ${ROUTE[a]} | ${BN[c.b]} | ${c.at.join(' ')} | ${pr(g.dps.p50)}${sp(g.dps)} | ${pr(g.burst.p50)}${sp(g.burst)} | ${pr(g.kill.p50, 1)}（${c.agg.killed}/${c.n} 打死） | ${pr(g.clear.p50, 1)}${sp(g.clearT)}（${g.cleared}/${c.n}） | ${pr(g.kps.p50, 2)} | ${pr(g.ehpP.p50)}／${pr(g.ehpE.p50)} | ${pr(g.tkB.p50 * 100, 2)}／${pr(g.tkC.p50 * 100, 2)} | ${g.dB.p50}／${g.dC.p50} | ${pr(g.tideB.p50, 1)}／${pr(g.tideC.p50, 1)} |`
      );
    }
    for (const b of ['bow', 'mace', 'arc', 'frost']) {
      const c = none(cells, b, pt);
      if (!c) continue;
      const g = c.agg;
      P(`| 無昇華 | ${BN[b]} | — | ${pr(g.dps.p50)}${sp(g.dps)} | ${pr(g.burst.p50)} | ${pr(g.kill.p50, 1)} | ${pr(g.clear.p50, 1)} | ${pr(g.kps.p50, 2)} | ${pr(g.ehpP.p50)}／${pr(g.ehpE.p50)} | ${pr(g.tkB.p50 * 100, 2)}／${pr(g.tkC.p50 * 100, 2)} | ${g.dB.p50}／${g.dC.p50} | — |`);
    }
    P('');
    P(`潮汐判定用 ${BN[T.b]}（增益分數 ${pr(T.gain.sc, 2)}；另一個 ${BN[(T === Ta ? Tf : Ta).b]} ${pr((T === Ta ? Tf : Ta).gain.sc, 2)}）。`);
    P('');
    const abs = c => ({ dps: c.agg.dps.p50, clear: 1 / c.agg.clearT.p50, ehp: c.agg.ehp.p50 });
    band('A1 絕對值', abs(W), abs(I), abs(T), '');
    const gain = c => ({ dps: c.gain.dps, clear: c.gain.clear, ehp: c.gain.ehp });
    const rA2 = band('A2 昇華增益（÷ 同配裝無昇華）', gain(W), gain(I), gain(T), ' 倍');
    /* B 同配裝換昇華 */
    const rB = {};
    for (const b of ['arc', 'bow']) {
      const w = best(cells, b, 'wind', pt),
        i = best(cells, b, 'iron', pt),
        t = best(cells, b, 'tide', pt);
      P(`**B. 同配裝換昇華：${BN[b]}**（路線：風 ${w.at.join(' ')}／鐵 ${i.at.join(' ')}／潮 ${t.at.join(' ')}）`);
      P('');
      rB[b] = band(`B ${BN[b]} 增益`, gain(w), gain(i), gain(t), ' 倍');
    }
    (section.R = section.R || {})[label + pt] = { W, I, T, Ta, Tf, rA2, rB };
  }
}
section(base, '原數值（origin/main 039c3a56）');
for (const { f, cells } of tunes) {
  /* 調整方案：潮汐的格子換成覆寫後的，風、鐵與基準照原數值 */
  const ov = cells.find(c => c.ov).ov;
  /* results_*.json 是 report.js 把 out_final 與 out_tune 一起讀的（基準要在同一份裡才算得出增益）：潮汐只留覆寫過的格子 */
  const merged = [...base.filter(c => c.asc !== 'tide'), ...cells.filter(c => c.asc === 'tide' && c.ov).map(c => ({ ...c, ov: null }))];
  section(merged, `調整方案 ${f.replace(/^.*results_|\.json$/g, '')}：${JSON.stringify(ov)}`);
}
fs.writeFileSync(__dirname + '/' + (process.env.OUTT || 'tables.md'), out.join('\n') + '\n');
console.log(out.join('\n'));
