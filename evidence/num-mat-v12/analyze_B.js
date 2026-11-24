/* num-mat-v12 B：商會每小時額度的結果。
   讀 runs_C（最終組合，額度 H12＝js/craft.js 的 TRADE_QH）、runs_C_h24（額度 H24，對照）、runs_C_off（同費用、不限額度＝v11 的換法）、
   v11 的 runs_D（環境變數 V11，預設 ../num-mat-v11/runs_D；重產見 summary.md）。
   用法：node analyze_B.js → tables_B.md、B.json、B_hourly.csv（逐種子每小時）、B_hourly_p.csv（百分位）、B_inv_t1.csv（各材料 T1 當量每小時）
   百分位：最近排名法（10 個種子）。 */
'use strict';
const fs = require('fs'),
  path = require('path');
const S10 = [20261115, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const DIR = { H12: 'runs_C', H24: 'runs_C_h24', OFF: 'runs_C_off', V11: process.env.V11 || path.join(__dirname, '..', 'num-mat-v11', 'runs_D') };
const GN = { H12: 'v12（額度 H12）', H24: '額度 H24（對照）', OFF: '不限額度（同費用）', V11: 'v11' };
const load = (g, sec) => S10.map(sd => JSON.parse(fs.readFileSync(path.resolve(__dirname, DIR[g], `s${sec}_sd${sd}.json`))));
const pct = (L, p) => [...L].sort((a, b) => a - b)[Math.ceil(p * L.length) - 1];
const fn = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (+v.toFixed(d)).toLocaleString('en'));
const PP = (L, d = 0) => `${fn(pct(L, 0.5), d)}／${fn(pct(L, 0.9), d)}`;
const PC = L => `${(pct(L, 0.5) * 100).toFixed(0)}%／${(pct(L, 0.9) * 100).toFixed(0)}%`;
const CK = ['tran', 'aug', 'rich', 'exalt'],
  CN = { tran: '蛻變石', aug: '增幅石', rich: '富豪石', exalt: '崇高石' };
const MK = ['wood', 'iron', 'hide', 'silk'],
  MN = { wood: '木', iron: '鐵', hide: '皮', silk: '靈絲' },
  PRICE = { wood: 243, iron: 4860, hide: 48600, silk: 24300 };
const eq = (r, m) => (m === 'wood' ? r.wood : [1, 2, 3, 4, 5, 6].reduce((a, T) => a + r.st[m + T] * 3 ** (T - 1), 0));
const at = (j, k) => j.rows[Math.min(k, j.rows.length) - 1];
/* 第 h 小時＝分 (h−1)×60＋1 … h×60 */
const hr = (j, h, f) => f(at(j, h * 60)) - (h > 1 ? f(at(j, (h - 1) * 60)) : 0);
const out = [],
  P = s => out.push(s),
  J = {};
const hcsv = ['組,一輪,種子,小時,' + CK.flatMap(c => [CN[c] + '_商會', CN[c] + '_戰鬥', CN[c] + '_商會÷戰鬥']).join(',')],
  hp = ['組,一輪,小時,' + CK.flatMap(c => [CN[c] + '_商會P50', CN[c] + '_商會P90', CN[c] + '_比P50', CN[c] + '_比P90']).join(',')],
  icsv = ['組,一輪,小時,' + MK.flatMap(m => [MN[m] + '_P50', MN[m] + '_P90']).join(',')];
P('# num-mat-v12 B：商會每小時額度（`node analyze_B.js` 產生）\n');
P('額度＝每種通貨每小時最多換幾顆（`js/craft.js` 的 `TRADE_QH`／`tradeLeft`），連續回復、最多存 1 小時、開張時從 0 起算。模擬：倉房 Lv4 以後每 5 秒按一次，每次換到「超過庫存上限不到 1 顆」或「額度用完」為止。第 h 小時＝第 (h−1)×60＋1～h×60 分。P50／P90（10 個種子）。\n');
for (const g of ['H12', 'H24', 'OFF', 'V11'])
  for (const sec of [100, 150]) {
    const L = load(g, sec),
      on = L.map(j => Math.ceil(j.tradeOn / 60));
    const key = g + sec;
    J[key] = { on: [pct(on, 0.5) / 60, pct(on, 0.9) / 60], QH: L[0].cfg.QH || null };
    /* 每小時 */
    for (let h = 1; h <= 60; h++) {
      const row = [];
      L.forEach((j, i) => {
        const v = CK.flatMap(c => {
          const a = hr(j, h, r => r.ctr[c] || 0),
            b = hr(j, h, r => r.cdr[c] || 0);
          return [a, b, b ? +(a / b).toFixed(4) : ''];
        });
        hcsv.push([g, sec, S10[i], h, ...v].join(','));
      });
      hp.push(
        [
          g,
          sec,
          h,
          ...CK.flatMap(c => {
            const a = L.map(j => hr(j, h, r => r.ctr[c] || 0)),
              q = L.map(j => hr(j, h, r => r.ctr[c] || 0) / (hr(j, h, r => r.cdr[c] || 0) || 1));
            return [pct(a, 0.5), pct(a, 0.9), pct(q, 0.5).toFixed(4), pct(q, 0.9).toFixed(4)];
          })
        ].join(',')
      );
      icsv.push([g, sec, h, ...MK.flatMap(m => [pct(L.map(j => eq(at(j, h * 60), m)), 0.5), pct(L.map(j => eq(at(j, h * 60), m)), 0.9)])].join(','));
    }
    /* 換完：最後一次被額度擋住的那一分（＋1）；沒被擋過＝開張那一分 */
    const drain = {};
    for (const m of MK) {
      drain[m] = L.map((j, i) => {
        let last = on[i];
        for (let k = on[i]; k <= j.rows.length; k++) if ((j.rows[k - 1].blk || {})[m] !== ((k > 1 ? j.rows[k - 2].blk : {}) || {})[m]) last = k;
        return last / 60;
      });
    }
    const dAll = L.map((_, i) => Math.max(...MK.map(m => drain[m][i])));
    J[key].drain = Object.fromEntries(MK.map(m => [m, [pct(drain[m], 0.5), pct(drain[m], 0.9)]]));
    J[key].drainAll = [pct(dAll, 0.5), pct(dAll, 0.9)];
    /* 最高的一小時、穩定期（全部換完的下一個整點到第 60 小時） */
    J[key].cur = {};
    for (const c of CK) {
      const pk = [],
        pkN = [],
        pkH = [],
        st = [],
        stN = [],
        cb = [],
        tot = [];
      L.forEach((j, i) => {
        let best = -1,
          bh = 0,
          bn = 0;
        for (let h = 1; h <= 60; h++) {
          const a = hr(j, h, r => r.ctr[c] || 0),
            b = hr(j, h, r => r.cdr[c] || 0);
          if (a && b && a / b > best) (best = a / b), (bh = h), (bn = a);
        }
        pk.push(best < 0 ? 0 : best);
        pkN.push(bn);
        pkH.push(bh);
        const h0 = Math.ceil(dAll[i]) + 1,
          e = at(j, 3600),
          s = at(j, (h0 - 1) * 60);
        if (h0 < 60) {
          st.push(((e.ctr[c] || 0) - (s.ctr[c] || 0)) / ((e.cdr[c] || 0) - (s.cdr[c] || 0)));
          stN.push(((e.ctr[c] || 0) - (s.ctr[c] || 0)) / (60 - h0 + 1));
          cb.push(((e.cdr[c] || 0) - (s.cdr[c] || 0)) / (60 - h0 + 1));
        }
        tot.push((e.ctr[c] || 0) / (e.cdr[c] || 1));
      });
      J[key].cur[c] = { pk: [pct(pk, 0.5), pct(pk, 0.9), Math.max(...pk)], pkN: [pct(pkN, 0.5), pct(pkN, 0.9)], pkH: [pct(pkH, 0.5), pct(pkH, 0.9)], st: st.length ? [pct(st, 0.5), pct(st, 0.9)] : null, stN: stN.length ? [pct(stN, 0.5), pct(stN, 0.9)] : null, cb: cb.length ? pct(cb, 0.5) : null, tot: pct(tot, 0.5), ctr60: pct(L.map(j => at(j, 3600).ctr[c] || 0), 0.5), lump: pct(L.map((j, i) => at(j, on[i]).ctr[c] || 0), 0.5) };
    }
    /* 庫存 */
    J[key].inv = {};
    for (const m of MK) {
      let lo = Infinity,
        hi = 0;
      const v50 = L.map(j => eq(at(j, 3000), m)),
        v60 = L.map(j => eq(at(j, 3600), m));
      L.forEach((j, i) => {
        for (let k = Math.ceil(dAll[i] * 60) + 60; k <= 3600; k++) {
          const v = eq(j.rows[k - 1], m);
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      });
      J[key].inv[m] = { band: [lo, hi], h50: pct(v50, 0.5), h60: [pct(v60, 0.5), pct(v60, 0.9)], cap: L[0].cfg.CAP[m] };
    }
    J[key].craft = [pct(L.map(j => at(j, 3600).craftN), 0.5), pct(L.map(j => at(j, 3600).craftN), 0.9)];
    J[key].rare = [pct(L.map(j => at(j, 3600).rareN), 0.5), pct(L.map(j => at(j, 3600).rareN), 0.9)];
    J[key].evs = L.map(j => JSON.stringify(j.ev));
    J[key].rowsSig = L.map(j => j.rows.map(r => [r.soul, r.craftN, r.rareN].join(':')).join('|'));
  }
/* 輸出 */
for (const sec of [100, 150]) {
  P(`## s${sec}\n`);
  P('| 組 | 額度（蛻變／增幅／富豪／崇高，顆／時） | 商會開張（時） | 開張庫存換完（時，全部材料，P50／P90） | 木 | 鐵 | 皮 | 靈絲 |');
  P('|---|---|---|---|---|---|---|---|');
  for (const g of ['H12', 'H24', 'OFF', 'V11']) {
    const x = J[g + sec],
      q = x.QH;
    P(`| ${GN[g]} | ${q && q.tran < 1e9 ? CK.map(c => q[c]).join('／') : '不限'} | ${x.on.map(v => v.toFixed(2)).join('／')} | ${x.drainAll.map(v => v.toFixed(2)).join('／')} | ${MK.map(m => x.drain[m].map(v => v.toFixed(2)).join('／')).join(' | ')} |`);
  }
  P('\n「換完」＝最後一次被額度擋住（超過上限 ≥ 1 顆但沒額度）的那一分；不限額度＝開張那一分。\n');
  P('| 組 | 通貨 | 開張那一分換到 | 最高的一小時：商會÷戰鬥（P50／P90／最大） | 那一小時換到（顆） | 那一小時換到 ÷ 穩定期每小時戰鬥 | 在第幾小時 | 穩定期 商會÷戰鬥 | 穩定期 每小時換到 | 穩定期 每小時戰鬥 | 60 小時累計 商會÷戰鬥 | 60 小時累計換到 |');
  P('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const g of ['H12', 'H24', 'OFF', 'V11'])
    for (const c of CK) {
      const x = J[g + sec].cur[c];
      P(`| ${GN[g]} | ${CN[c]} | ${fn(x.lump)} | ${(x.pk[0] * 100).toFixed(0)}%／${(x.pk[1] * 100).toFixed(0)}%／${(x.pk[2] * 100).toFixed(0)}% | ${x.pkN.map(v => fn(v)).join('／')} | ${x.cb ? x.pkN.map(v => ((v / x.cb) * 100).toFixed(0) + '%').join('／') : '—'} | ${x.pkH.join('／')} | ${x.st ? x.st.map(v => (v * 100).toFixed(0) + '%').join('／') : '—'} | ${x.stN ? x.stN.map(v => fn(v, 1)).join('／') : '—'} | ${fn(x.cb, 1)} | ${(x.tot * 100).toFixed(0)}% | ${fn(x.ctr60)} |`);
    }
  P('\n穩定期＝全部材料換完的下一個整點到第 60 小時。「最高的一小時」＝商會÷同一小時戰鬥最高的那一小時（戰鬥那一小時剛好少時比例會偏高）；「÷ 穩定期每小時戰鬥」用穩定期的平均戰鬥當分母。不限額度在開張時從 0 起算，第一個 5 秒刻換不到，第二個刻才一次換掉（所以 s150 的「換完」比開張晚 1 分）。\n');
  P('庫存（T1 當量；木是個數）：換完 1 小時後到第 60 小時之間每一分的最小／最大（10 個種子合併），第 50、60 小時 P50：\n');
  P('| 組 | 材料 | 上限 | 最小 | 最大 | 第 50 小時 | 第 60 小時 P50／P90 | 50→60 小時 |');
  P('|---|---|---|---|---|---|---|---|');
  for (const g of ['H12', 'H24', 'OFF', 'V11'])
    for (const m of MK) {
      const x = J[g + sec].inv[m];
      P(`| ${GN[g]} | ${MN[m]} | ${fn(x.cap)} | ${fn(x.band[0])} | ${fn(x.band[1])} | ${fn(x.h50)} | ${x.h60.map(v => fn(v)).join('／')} | ${x.h60[0] - x.h50 >= 0 ? '+' : ''}${fn(x.h60[0] - x.h50)} |`);
    }
  P('');
  P(`打造（60 小時，P50／P90）：${['H12', 'H24', 'OFF', 'V11'].map(g => `${GN[g]} ${J[g + sec].craft.join('／')} 件、稀有 ${J[g + sec].rare.join('／')} 件`).join('；')}。\n`);
  const same = (a, b) => J[a + sec].evs.every((e, i) => e === J[b + sec].evs[i]) && J[a + sec].rowsSig.every((e, i) => e === J[b + sec].rowsSig[i]);
  J['same' + sec] = { H12_OFF: same('H12', 'OFF'), H24_OFF: same('H24', 'OFF') };
  P(`逐分比對（設施事件、每分靈魂、打造件數、稀有件數，10 個種子）：H12 vs 不限額度 ${same('H12', 'OFF') ? '**完全相同**' : '**有差異**'}；H24 vs 不限額度 ${same('H24', 'OFF') ? '**完全相同**' : '**有差異**'}。\n`);
}
for (const k in J) if (J[k].evs) delete J[k].evs, delete J[k].rowsSig;
fs.writeFileSync(path.join(__dirname, 'tables_B.md'), out.join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'B.json'), JSON.stringify(J, null, 1));
fs.writeFileSync(path.join(__dirname, 'B_hourly.csv'), hcsv.join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'B_hourly_p.csv'), hp.join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'B_inv_t1.csv'), icsv.join('\n') + '\n');
console.log('tables_B.md、B.json、B_hourly.csv、B_hourly_p.csv、B_inv_t1.csv 寫好了');
