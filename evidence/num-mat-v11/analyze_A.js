/* num-mat-v11 A：皮、靈絲、鐵、木 60 小時的實際用量（CRAFT=iron 對照、CRAFT=mix），長老屋費用照 main、沒有商會。
   用法：node analyze_A.js（讀 runs_A_iron、runs_A_mix，由 ./long.sh 產生）→ tables_A.md、A_inv_hours_p.csv、A.json
   百分位：最近排名法（10 個種子 P50＝第 5 小、P90＝第 9 小）。數量＝那一階的個數；「T1 當量」＝T 階 1 個算 3^(T−1) 個第 1 階（木沒有階）。 */
'use strict';
const fs = require('fs'),
  path = require('path');
const S10 = [20261115, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const G = { iron: 'runs_A_iron', mix: 'runs_A_mix' };
const load = (g, sec) => S10.map(sd => JSON.parse(fs.readFileSync(path.join(__dirname, G[g], `s${sec}_sd${sd}.json`))));
const pct = (L, p) => [...L].sort((a, b) => a - b)[Math.ceil(p * L.length) - 1];
const fn = v => (v == null || !isFinite(v) ? '—' : Math.round(v).toLocaleString('en'));
const PP = L => `${fn(pct(L, 0.5))}／${fn(pct(L, 0.9))}`;
const MN = { wood: '木', iron: '鐵', hide: '皮', silk: '靈絲' };
const M4 = ['wood', 'iron', 'hide', 'silk'];
const keys = m => (m === 'wood' ? ['wood'] : [1, 2, 3, 4, 5, 6].map(T => m + ':' + T));
const KN = k => (k === 'wood' ? '木' : MN[k.split(':')[0]] + ' T' + k.split(':')[1]);
const out = [],
  P = s => out.push(s),
  J = {};
const CF = [];
for (const g of ['iron', 'mix']) for (const sec of [100, 150]) CF.push([g, sec, load(g, sec)]);
P('# num-mat-v11 A：材料 60 小時的實際用量（`node analyze_A.js` 產生）\n');
P('CRAFT=iron＝num-mat-final 原樣（只用鐵，對照；跟 num-mat-final 的 20 個跑逐分完全相同，已比對）；CRAFT=mix＝部位照舊輪流、防具的系輪流（鐵→皮→靈絲）、武器與飾品用鐵。長老屋費用照 main（150,000／250,000／350,000）、沒有商會、輔助 II a 政策、跑滿 3,600 分。P50／P90（10 個種子）。\n');

P('## A1 各階總量（60 小時，P50；個數）\n');
P('掉落＝`roundLoot`（戰鬥）進來的；設施＝`campUp` 付掉的（任何階付款照實際扣到的那一階記）；打造＝`craftDo` 扣掉的；退回＝分解（含 `craftDo` 裡自動分解）加回的；打造淨用量＝打造−退回；剩下＝第 3,600 分的庫存。\n');
for (const [g, sec, L] of CF) {
  P(`**CRAFT=${g} s${sec}**\n`);
  P('| 材料 | 掉落 | 設施 | 打造 | 退回 | 打造淨用量 | 剩下 |');
  P('|---|---|---|---|---|---|---|');
  for (const m of M4)
    for (const k of keys(m)) {
      const v = f => pct(L.map(f), 0.5);
      const A = j => j.acc;
      const left = j => (k === 'wood' ? j.rows.at(-1).wood : j.rows.at(-1).st[k.replace(':', '')]);
      P(
        `| ${KN(k)} | ${fn(v(j => A(j).drop[k] || 0))} | ${fn(v(j => A(j).campUse[k] || 0))} | ${fn(v(j => A(j).craftOut[k] || 0))} | ${fn(v(j => A(j).salvIn[k] || 0))} | ${fn(v(j => A(j).craftNet[k] || 0))} | ${fn(v(left))} |`
      );
    }
  P('');
  P('T1 當量合計（P50）：\n');
  P('| 材料 | 掉落 | 設施 | 打造淨用量 | 淨用量合計（設施＋打造淨） | 淨用量 ÷ 掉落 | 剩下 |');
  P('|---|---|---|---|---|---|---|');
  for (const m of M4) {
    const r = j => j.rows.at(-1).u[m];
    const left = j => (m === 'wood' ? j.rows.at(-1).wood : [1, 2, 3, 4, 5, 6].reduce((a, T) => a + j.rows.at(-1).st[m + T] * 3 ** (T - 1), 0));
    const d = L.map(j => r(j)[0]),
      c = L.map(j => r(j)[1]),
      n = L.map(j => r(j)[2]),
      t = L.map(j => r(j)[1] + r(j)[2]),
      q = L.map(j => (r(j)[1] + r(j)[2]) / r(j)[0]);
    J[`${g}${sec}${m}tot`] = { drop: pct(d, 0.5), camp: pct(c, 0.5), craft: pct(n, 0.5), use: pct(t, 0.5), left: pct(L.map(left), 0.5) };
    P(`| ${MN[m]} | ${fn(pct(d, 0.5))} | ${fn(pct(c, 0.5))} | ${fn(pct(n, 0.5))} | ${fn(pct(t, 0.5))} | ${(pct(q, 0.5) * 100).toFixed(1)}% | ${fn(pct(L.map(left), 0.5))} |`);
  }
  P('');
}

P('## A2 每小時淨用量（T1 當量／小時；設施＋打造淨用量）\n');
P('分段＝第 22 個地點（瞭望台 Lv21）第一次到的那一分。「以前」＝0→那一分，「以後」＝那一分→3,600 分。P50／P90（10 個種子）。另列每小時掉落。\n');
P('| 跑 | 第 22 個地點（時） | 材料 | 淨用量 以前 | 淨用量 以後 | 其中打造淨 以後 | 其中設施 以後 | 掉落 以後 |');
P('|---|---|---|---|---|---|---|---|');
for (const [g, sec, L] of CF)
  for (const m of M4) {
    const pre = [],
      post = [],
      pc = [],
      pf = [],
      pd = [];
    for (const j of L) {
      const i = j.node22 - 1,
        a = j.rows[i].u[m],
        b = j.rows.at(-1).u[m],
        h0 = j.node22 / 60,
        h1 = (j.rows.length - j.node22) / 60;
      pre.push((a[1] + a[2]) / h0);
      post.push((b[1] + b[2] - a[1] - a[2]) / h1);
      pc.push((b[2] - a[2]) / h1);
      pf.push((b[1] - a[1]) / h1);
      pd.push((b[0] - a[0]) / h1);
    }
    J[`${g}${sec}${m}rate`] = { pre: [pct(pre, 0.5), pct(pre, 0.9)], post: [pct(post, 0.5), pct(post, 0.9)], craft: pct(pc, 0.5), fac: pct(pf, 0.5), drop: pct(pd, 0.5) };
    P(`| ${g} s${sec} | ${(pct(L.map(j => j.node22), 0.5) / 60).toFixed(2)} | ${MN[m]} | ${PP(pre)} | ${PP(post)} | ${fn(pct(pc, 0.5))} | ${fn(pct(pf, 0.5))} | ${fn(pct(pd, 0.5))} |`);
  }
P('');
P('同一段換算成那時最高階的個數（以後＝T6，÷243；木不換算），P50：\n');
P('| 跑 | 鐵 T6／時 | 皮 T6／時 | 靈絲 T6／時 | 木／時 |');
P('|---|---|---|---|---|');
for (const [g, sec] of CF) P(`| ${g} s${sec} | ${['iron', 'hide', 'silk'].map(m => (J[`${g}${sec}${m}rate`].post[0] / 243).toFixed(1)).join(' | ')} | ${fn(J[`${g}${sec}woodrate`].post[0])} |`);
P('');

P('## A3 庫存（P50（P90））\n');
const HR = [1, 2, 4, 8, 12, 16, 24, 30, 40, 50, 60];
const COLS = ['wood', ...['iron', 'hide', 'silk'].flatMap(m => [1, 2, 3, 4, 5, 6].map(T => m + T))];
const CN = c => (c === 'wood' ? '木' : MN[c.replace(/\d/, '')] + 'T' + c.slice(-1));
const csv = ['CRAFT,一輪,小時,' + COLS.flatMap(c => [CN(c) + '_P50', CN(c) + '_P90']).join(',')];
for (const [g, sec, L] of CF) {
  P(`**CRAFT=${g} s${sec}**（全部階在 \`A_inv_hours_p.csv\`；這裡列木、各材料 T1 當量合計、T5、T6）\n`);
  P('| 小時 | 木 | 鐵 T1 當量 | 鐵 T5 | 鐵 T6 | 皮 T1 當量 | 皮 T5 | 皮 T6 | 靈絲 T1 當量 | 靈絲 T5 | 靈絲 T6 |');
  P('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const h of HR) {
    const R = L.map(j => j.rows[h * 60 - 1]);
    const v = k => R.map(r => (k === 'wood' ? r.wood : r.st[k]));
    const eq = m => R.map(r => [1, 2, 3, 4, 5, 6].reduce((a, T) => a + r.st[m + T] * 3 ** (T - 1), 0));
    const c = L2 => `${fn(pct(L2, 0.5))}（${fn(pct(L2, 0.9))}）`;
    csv.push([g, sec, h, ...COLS.flatMap(k => [pct(v(k), 0.5), pct(v(k), 0.9)])].join(','));
    P(`| ${h} | ${c(v('wood'))} | ${['iron', 'hide', 'silk'].map(m => [c(eq(m)), c(v(m + 5)), c(v(m + 6))].join(' | ')).join(' | ')} |`);
  }
  P('');
}
fs.writeFileSync(path.join(__dirname, 'A_inv_hours_p.csv'), csv.join('\n') + '\n');
P('## A4 戰鬥掉落的打造通貨（每小時，P50；全 60 小時平均與第 22 個地點以後）\n');
const CK = ['tran', 'aug', 'rich', 'exalt', 'whet', 'plate', 'conv', 'holy', 'corr', 'frac', 'perf'];
P('| 跑 | ' + CK.map(k => k).join(' | ') + ' |');
P('|---|' + CK.map(() => '---').join('|') + '|');
for (const [g, sec, L] of CF) {
  const r = k => L.map(j => (j.acc.curDrop[k] || 0) / (j.rows.length / 60));
  const r2 = k => L.map(j => ((j.acc.curDrop[k] || 0) - (j.rows[j.node22 - 1].cdr[k] || 0)) / ((j.rows.length - j.node22) / 60));
  for (const k of CK) J[`${g}${sec}cur_${k}`] = { all: pct(r(k), 0.5), post: pct(r2(k), 0.5) };
  P(`| ${g} s${sec} 全程 | ${CK.map(k => pct(r(k), 0.5).toFixed(1)).join(' | ')} |`);
  P(`| ${g} s${sec} 第 22 個以後 | ${CK.map(k => pct(r2(k), 0.5).toFixed(1)).join(' | ')} |`);
}
P('');
P('打造件數與稀有件數（60 小時，P50）：' + CF.map(([g, sec, L]) => `${g} s${sec} ${fn(pct(L.map(j => j.rows.at(-1).craftN), 0.5))} 件／稀有 ${fn(pct(L.map(j => j.rows.at(-1).rareN), 0.5))}`).join('；') + '\n');
for (const [g, sec, L] of CF) J[`${g}${sec}craft`] = [pct(L.map(j => j.rows.at(-1).craftN), 0.5), pct(L.map(j => j.rows.at(-1).rareN), 0.5)];
fs.writeFileSync(path.join(__dirname, 'tables_A.md'), out.join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'A.json'), JSON.stringify(J, null, 1));
console.log('tables_A.md 寫好了');
