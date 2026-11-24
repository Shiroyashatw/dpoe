/* num-mat-v11 C：商會（倉房 Lv4）材料換打造通貨的結果。讀 runs_D（商會開）與 runs_D_notrade（同設定、商會關）。
   用法：node analyze_C.js → tables_C.md、C.json。百分位：最近排名法（10 個種子）。 */
'use strict';
const fs = require('fs'),
  path = require('path');
const S10 = [20261115, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const load = (d, sec) => S10.map(sd => JSON.parse(fs.readFileSync(path.join(__dirname, d, `s${sec}_sd${sd}.json`))));
const pct = (L, p) => [...L].sort((a, b) => a - b)[Math.ceil(p * L.length) - 1];
const fn = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (+v.toFixed(d)).toLocaleString('en'));
const PP = (L, d = 0) => `${fn(pct(L, 0.5), d)}／${fn(pct(L, 0.9), d)}`;
const CK = ['tran', 'aug', 'rich', 'exalt'],
  CN = { tran: '蛻變石', aug: '增幅石', rich: '富豪石', exalt: '崇高石' };
const MN = { wood: '木', iron: '鐵', hide: '皮', silk: '靈絲' };
const out = [],
  P = s => out.push(s),
  J = {};
P('# num-mat-v11 C：商會換通貨（`node analyze_C.js` 產生）\n');
P('v11 最終組合（runs_D）。商會在倉房 Lv4（`campCan(\'trade\')`）開；開的那一刻先把累積超過上限的一次換掉（下面叫「開張那一次」），之後每 5 秒換超過上限的部分。');
P('「穩定期」＝開張後 1 小時到第 60 小時。戰鬥掉落＝`roundLoot` 進來的同一種通貨（不含分解黃裝回的蛻變／增幅）。P50／P90（10 個種子）。\n');
for (const sec of [100, 150]) {
  const L = load('runs_D', sec),
    N = load('runs_D_notrade', sec);
  const on = L.map(j => Math.ceil(j.tradeOn / 60));
  P(`## s${sec}\n`);
  P(`商會開張（倉房 Lv4）：${PP(on.map(m => m / 60), 2)} 小時。\n`);
  P('| 通貨 | 開張那一次（開張那一分的累計） | 穩定期 每小時（商會） | 穩定期 每小時（戰鬥） | 商會 ÷ 戰鬥（穩定期） | 60 小時累計（商會） | 60 小時累計（戰鬥） | 商會 ÷ 戰鬥（60 小時累計） |');
  P('|---|---|---|---|---|---|---|---|');
  for (const c of CK) {
    const lump = [],
      tr = [],
      cb = [],
      q = [],
      ct = [],
      cc = [],
      q2 = [];
    L.forEach((j, i) => {
      const a = j.rows[on[i] - 1],
        b = j.rows[Math.min(on[i] + 60, 3600) - 1],
        e = j.rows.at(-1),
        h = (3600 - on[i] - 60) / 60;
      lump.push(a.ctr[c] || 0);
      tr.push(((e.ctr[c] || 0) - (b.ctr[c] || 0)) / h);
      cb.push(((e.cdr[c] || 0) - (b.cdr[c] || 0)) / h);
      q.push(((e.ctr[c] || 0) - (b.ctr[c] || 0)) / ((e.cdr[c] || 0) - (b.cdr[c] || 0)));
      ct.push(e.ctr[c] || 0);
      cc.push(e.cdr[c] || 0);
      q2.push((e.ctr[c] || 0) / (e.cdr[c] || 1));
    });
    J[`${sec}${c}`] = { lump: pct(lump, 0.5), tr: pct(tr, 0.5), cb: pct(cb, 0.5), q: pct(q, 0.5), ct: pct(ct, 0.5), cc: pct(cc, 0.5), q2: pct(q2, 0.5) };
    P(`| ${CN[c]} | ${PP(lump)} | ${PP(tr, 1)} | ${PP(cb, 1)} | ${(pct(q, 0.5) * 100).toFixed(0)}%／${(pct(q, 0.9) * 100).toFixed(0)}% | ${PP(ct)} | ${PP(cc)} | ${(pct(q2, 0.5) * 100).toFixed(0)}% |`);
  }
  P('');
  P('各材料換掉多少（60 小時累計，T1 當量，P50）與換的速度（穩定期，T1 當量／小時）：\n');
  P('| 材料 | 換掉（累計） | 穩定期 每小時換掉 | 上限 CAP |');
  P('|---|---|---|---|');
  for (const m of ['wood', 'iron', 'hide', 'silk']) {
    const tot = L.map(j => j.rows.at(-1).u[m][3]),
      rt = L.map((j, i) => (j.rows.at(-1).u[m][3] - j.rows[Math.min(on[i] + 60, 3600) - 1].u[m][3]) / ((3600 - on[i] - 60) / 60));
    P(`| ${MN[m]} | ${fn(pct(tot, 0.5))} | ${fn(pct(rt, 0.5))} | ${fn(L[0].cfg.CAP[m])} |`);
  }
  P('');
  P('庫存有沒有停在上限附近（T1 當量；開張後 1 小時到第 60 小時之間每一分的最小／最大，10 個種子取最小的最小、最大的最大；第 60 小時 P50）：\n');
  P('| 材料 | 上限 | 最小 | 最大 | 第 60 小時 P50 | 沒有商會的第 60 小時 P50 |');
  P('|---|---|---|---|---|---|');
  const eq = (r, m) => (m === 'wood' ? r.wood : [1, 2, 3, 4, 5, 6].reduce((a, T) => a + r.st[m + T] * 3 ** (T - 1), 0));
  for (const m of ['wood', 'iron', 'hide', 'silk']) {
    let lo = Infinity,
      hi = 0;
    L.forEach((j, i) => {
      for (let k = on[i] + 60; k <= 3600; k++) {
        const v = eq(j.rows[k - 1], m);
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    });
    J[`${sec}${m}band`] = [lo, hi];
    P(`| ${MN[m]} | ${fn(L[0].cfg.CAP[m])} | ${fn(lo)} | ${fn(hi)} | ${fn(pct(L.map(j => eq(j.rows.at(-1), m)), 0.5))} | ${fn(pct(N.map(j => eq(j.rows.at(-1), m)), 0.5))} |`);
  }
  P('');
  P('累計換到（P50）：\n');
  P('| 小時 | ' + CK.map(c => CN[c]).join(' | ') + ' |');
  P('|---|' + CK.map(() => '---').join('|') + '|');
  for (const h of [24, 26, 30, 40, 50, 60]) P(`| ${h} | ${CK.map(c => fn(pct(L.map(j => j.rows[h * 60 - 1].ctr[c] || 0), 0.5))).join(' | ')} |`);
  P('');
  const same = L.every((j, i) => JSON.stringify(j.ev) === JSON.stringify(N[i].ev) && j.rows.every((r, k) => r.craftN === N[i].rows[k].craftN && r.rareN === N[i].rows[k].rareN && r.soul === N[i].rows[k].soul));
  J[`${sec}same`] = same;
  P(`打造：60 小時打造 ${PP(L.map(j => j.rows.at(-1).craftN))} 件、稀有 ${PP(L.map(j => j.rows.at(-1).rareN))} 件；商會關掉時 ${PP(N.map(j => j.rows.at(-1).craftN))} 件、稀有 ${PP(N.map(j => j.rows.at(-1).rareN))} 件。商會開／關的 10 個種子逐分比對（設施事件、靈魂、打造件數、稀有件數）：${same ? '**完全相同**' : '有差異'}。\n`);
  P(`通貨庫存（第 60 小時 P50，商會開／關）：${CK.map(c => `${CN[c]} ${fn(pct(L.map(j => j.rows.at(-1).cur[c]), 0.5))}／${fn(pct(N.map(j => j.rows.at(-1).cur[c]), 0.5))}`).join('、')}\n`);
}
fs.writeFileSync(path.join(__dirname, 'tables_C.md'), out.join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'C.json'), JSON.stringify(J, null, 1));
console.log('tables_C.md 寫好了');
