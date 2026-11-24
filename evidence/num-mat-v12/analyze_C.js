/* num-mat-v12 C：最終組合（CRAFT=mix＋長老屋 Lv9～11 新費用＋商會＋每小時額度）的全套節奏表。
   底子＝num-mat-v11 的 analyze_D.js（複製改名）。組別：V＝v12 最終組合（runs_C）、W＝v11 最終組合（v11 的 runs_D，環境變數 V11）、
   F＝num-mat-final（num-mat-final 的 runs，環境變數 FIN；在 bd96a91 的 checkout 跑那個目錄的 ./long.sh 產生）。
   用法：node analyze_C.js → tables_C.md、dry_over60.md、inv_hours.csv、inv_hours_p.csv、C.json
   百分位、乾等定義、原因歸屬照 num-mat-final：最近排名法（P50＝第 5 小、P90＝第 9 小），60 小時內沒到＝∞（>60h）。 */
'use strict';
const fs = require('fs'),
  path = require('path');
const DIR = { V: path.join(__dirname, 'runs_C'), W: process.env.V11 || path.join(__dirname, '..', 'num-mat-v11', 'runs_D'), F: process.env.FIN || path.join(__dirname, '..', 'num-mat-final', 'runs') };
const SW = 1;
const S10 = [20261115, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const cache = {};
const load = f => {
  if (!cache[f]) {
    const [g, ff] = f.split('/');
    const p = path.join(DIR[g], ff + '.json');
    const j = JSON.parse(fs.readFileSync(p));
    j.first = {};
    for (const e of j.ev) if (!(e.b + e.lv in j.first)) j.first[e.b + e.lv] = e.t / 60;
    j.f20 = 'forge20' in j.first ? j.first.forge20 * 60 : Infinity;
    cache[f] = j;
  }
  return cache[f];
};
const GRPS = ['V', 'W', 'F'];
const GN = { V: 'v12', W: 'v11', F: 'final' };
const runs = (g, sec) => S10.map(sd => load(`${g}/s${sec}_sd${sd}`));
const pct = (L, p) => [...L].sort((a, b) => a - b)[Math.ceil(p * L.length) - 1];
const fh = v => (v == null || !isFinite(v) ? '>60h' : (v / 60).toFixed(2));
const fm = v => (v == null || !isFinite(v) ? '—' : Math.round(v));
const f2 = v => (v == null || !isFinite(v) ? '—' : v.toFixed(2));
const fn = v => (v == null || !isFinite(v) ? '—' : Math.round(v).toLocaleString('en'));
const PP = (L, f = fh) => `${f(pct(L, 0.5))}／${f(pct(L, 0.9))}`;
const tt = (j, k) => (k in j.first ? j.first[k] : Infinity);
const out = [],
  P = s => out.push(s);
const NM = { forge: '鍛造台', watch: '瞭望台', scout: '斥候營', house: '民房', altar: '長老屋', store: '倉房', sup2: '輔助II' };
const MN = { iron: '鐵', hide: '皮', silk: '靈絲' };
const keyN = k =>
  k === 'wood'
    ? '木'
    : k === 'gold'
      ? '金'
      : k === 'soul'
        ? '靈魂'
        : k.startsWith('cur:')
          ? k.slice(4)
          : MN[k.split(':')[0]] + 'T' + k.split(':')[1];
/* 每小時靈魂收入＝那一分往前 60 分的 roundLoot 靈魂（累計靈魂收入欄的差）；沒到＝— */
const sph = (j, m) => {
  if (!isFinite(m)) return Infinity;
  const i = Math.min(Math.ceil(m), j.rows.length) - 1;
  return j.rows[i].soulIn - (i >= 60 ? j.rows[i - 60].soulIn : 0);
};
const CFG = GRPS.flatMap(g => [100, 150].map(sec => [g, sec]));
const segs = (j, pre) => j.dry.filter(d => (pre ? d.t0 < j.f20 : d.t0 >= j.f20));
const ITEMS = [
  ['forge16', '第 5 格＝鍛造台 Lv16'],
  ['forge20', '鍛造台 Lv20'],
  ['sup213', '輔助 II 13 種（a）'],
  ['altar9', '長老屋 Lv9（第 4 孔）'],
  ['altar10', '長老屋 Lv10（第三昇華）'],
  ['altar11', '長老屋 Lv11（第 5 孔）'],
  ['altar8', '長老屋 Lv8（參考）'],
  ['store5', '倉房 Lv5（參考）']
];
const J = {}; /* 給 summary 用的數字 */

P('# num-mat-v12 C 數字表（`node analyze_C.js` 產生）\n');
P(
  'P50／P90；每種一輪 10 個種子（20261115、1～9）；`>60h`＝3,600 分內沒到（截尾，當 ∞ 排序）。v12＝最終組合（CRAFT=mix＋長老屋新費用＋商會＋每小時額度）；v11＝v11 最終組合（長老屋 70,000／200,000／200,000＋商會不限次）；final＝num-mat-final（CRAFT=iron，同種子；三樣都到就停，60 小時內都沒停）。v12、v11 跑滿 3,600 分。\n'
);

/* 1 */
P('## §1 里程碑時間（小時）與那時的每小時靈魂收入\n');
P('每小時靈魂＝那一分往前 60 分 roundLoot 進來的靈魂（num-mat-sources 的 `soulIn`，含分解打造品的靈魂）。\n');
P('| 項目 | ' + CFG.map(([g, s]) => `${GN[g]} s${s}`).join(' | ') + ' |');
P('|---|' + CFG.map(() => '---').join('|') + '|');
for (const [k, nm] of ITEMS) {
  const c = [],
    d = [];
  for (const [g, sec] of CFG) {
    const L = runs(g, sec),
      v = L.map(j => tt(j, k));
    c.push(PP(v));
    d.push(
      PP(
        L.map((j, i) => sph(j, v[i])),
        fn
      )
    );
    J[`${g}${sec}${k}`] = [pct(v, 0.5), pct(v, 0.9)];
    J[`${g}${sec}${k}sph`] = [pct(L.map((j, i) => sph(j, v[i])), 0.5), pct(L.map((j, i) => sph(j, v[i])), 0.9)];
  }
  P(`| ${nm} | ${c.join(' | ')} |`);
  P(`| 　每小時靈魂 | ${d.join(' | ')} |`);
}
{
  const c = [],
    d = [];
  for (const [g, sec] of CFG) {
    const L = runs(g, sec),
      v = L.map(j => tt(j, 'watch1'));
    c.push(PP(v, f2));
    d.push(
      PP(
        L.map((j, i) => sph(j, v[i])),
        fn
      )
    );
    J[`${g}${sec}watch1`] = [pct(v, 0.5), pct(v, 0.9)];
    J[`${g}${sec}watch1sph`] = [pct(L.map((j, i) => sph(j, v[i])), 0.5), pct(L.map((j, i) => sph(j, v[i])), 0.9)];
    J[`${g}${sec}w1`] = ['w1soul', 'w1iron', 'w1both'].map(x => pct(L.map(j => j[x] / 60), 0.5));
  }
  P(`| 瞭望台 Lv1（分，目標 8–12） | ${c.join(' | ')} |`);
  P(`| 　每小時靈魂（不到 60 分＝從 0 起算） | ${d.join(' | ')} |`);
  P(
    `| 　靈魂第一次 ≥200／鐵 T1 當量第一次 ≥80／兩個同時夠（分，P50） | ${CFG.map(([g, s]) =>
      J[`${g}${s}w1`].map(f2).join('／')
    ).join(' | ')} |`
  );
}
P(
  `| 跑完的分鐘（P50／P90） | ${CFG.map(([g, s]) => PP(runs(g, s).map(j => j.end), fm)).join(' | ')} |`
);
P('');

/* 2 */
P('## §2 乾等（分）\n');
P(
  '定義照 num-mat-sources：每 5 秒（買東西之前）五座設施（滿級不算）都買不起的連續一段；原因看結束時第一座買得起的設施在最後一個乾等刻缺什麼（缺任何非靈魂＝缺材料，只缺靈魂＝缺靈魂）。跑到停止還沒結束的一段＝「沒結束」，不算進兩種，另列。段數是每種子的段數（P50／P90）。最長＝每種子最長的一段（P50／P90／10 個種子的最大）。\n'
);
P(
  '| 跑 | 段 | 缺靈魂 >60 分段數 | 缺靈魂最長 | 缺材料 >60 分段數 | 缺材料最長 | 缺材料最長那段缺什麼（各種子計數） | 沒結束 |'
);
P('|---|---|---|---|---|---|---|---|');
for (const [g, sec] of CFG)
  for (const pre of [1, 0]) {
    const L = runs(g, sec),
      S = L.map(j => segs(j, pre));
    const so = S.map(A => A.filter(d => d.cause === 'soul')),
      ma = S.map(A => A.filter(d => d.cause === 'mat'));
    const mx = A => Math.max(0, ...A.map(d => d.len)) / 60;
    const sl = so.map(mx),
      ml = ma.map(mx);
    const lk = {};
    ma.forEach(A => {
      if (!A.length) return;
      const d = A.reduce((a, b) => (b.len > a.len ? b : a));
      const k =
        d.lack
          .filter(x => x !== 'soul')
          .map(keyN)
          .join('+') + (d.both ? '（也缺靈魂）' : '');
      lk[k] = (lk[k] || 0) + 1;
    });
    const n60 = so.map(A => A.filter(d => d.len > 3600).length),
      m60 = ma.map(A => A.filter(d => d.len > 3600).length);
    const op = S.flat().filter(d => d.open);
    const row = {
      sN: [pct(n60, 0.5), pct(n60, 0.9)],
      sL: [pct(sl, 0.5), pct(sl, 0.9), Math.max(...sl)],
      mN: [pct(m60, 0.5), pct(m60, 0.9)],
      mL: [pct(ml, 0.5), pct(ml, 0.9), Math.max(...ml)],
      lk: Object.entries(lk)
        .map(([k, v]) => `${k}×${v}`)
        .join('、'),
      op: op.length ? `${op.length} 段，最長 ${fm(Math.max(...op.map(d => d.len)) / 60)} 分` : '—'
    };
    J[`${g}${sec}dry${pre}`] = row;
    P(
      `| ${GN[g]} s${sec} | ${pre ? 'Lv20 以前' : 'Lv20 以後'} | ${row.sN.map(fm).join('／')} | ${row.sL.map(fm).join('／')} | ${row.mN.map(fm).join('／')} | ${row.mL.map(fm).join('／')} | ${row.lk || '—'} | ${row.op} |`
    );
  }
P('');
P('缺靈魂 >60 分的段落在等哪一座（結束時買得起的設施；10 個種子合計段數）：\n');
P('| 跑 | Lv20 以前 | Lv20 以後 |');
P('|---|---|---|');
for (const [g, sec] of CFG) {
  const L = runs(g, sec),
    f = pre => {
      const c = {};
      for (const j of L)
        for (const d of segs(j, pre))
          if (d.cause === 'soul' && d.len > 3600) c[NM[d.b] + ' Lv' + d.lv] = (c[NM[d.b] + ' Lv' + d.lv] || 0) + 1;
      return (
        Object.entries(c)
          .map(([k, v]) => `${k}×${v}`)
          .join('、') || '—'
      );
    };
  P(`| ${GN[g]} s${sec} | ${f(1)} | ${f(0)} |`);
}
P('');

/* 3 */
const HR = [1, 2, 4, 8, 12, 16, 24, 30, 40, 50, 60];
const COLS = ['wood', ...['iron', 'hide', 'silk'].flatMap(m => [1, 2, 3, 4, 5, 6].map(T => m + T))];
const CN = c => (c === 'wood' ? '木' : MN[c.replace(/\d/, '')] + 'T' + c.slice(-1));
const csv = ['一輪,種子,小時,' + COLS.map(CN).join(',')],
  csvp = ['一輪,小時,n,' + COLS.flatMap(c => [CN(c) + '_P50', CN(c) + '_P90']).join(',')];
P('## §3 庫存曲線（v12，P50（P90））\n');
P(
  '第 h 小時＝逐分鐘 CSV 第 h×60 分那一列。跑已經停了的種子不算（final 沒有一個在 60 小時內停）。逐種子：`inv_hours.csv`；百分位：`inv_hours_p.csv`。\n'
);
for (const sec of [100, 150]) {
  const L = runs('V', sec);
  P(`**s${sec}**\n`);
  P('| 小時 | ' + COLS.map(CN).join(' | ') + ' |');
  P('|---|' + COLS.map(() => '---').join('|') + '|');
  for (const h of HR) {
    const R = L.filter(j => j.rows.length >= h * 60).map(j => j.rows[h * 60 - 1]);
    L.forEach((j, i) => {
      const r = j.rows[h * 60 - 1];
      if (r) csv.push([sec, S10[i], h, ...COLS.map(c => (c === 'wood' ? r.wood : r.st[c]))].join(','));
    });
    if (!R.length) {
      P(`| ${h} | ${COLS.map(() => '停了').join(' | ')} |`);
      continue;
    }
    const v = k => R.map(r => (k === 'wood' ? r.wood : r.st[k]));
    csvp.push([sec, h, R.length, ...COLS.flatMap(k => [pct(v(k), 0.5), pct(v(k), 0.9)])].join(','));
    P(
      `| ${h}${R.length < 10 ? `（n=${R.length}）` : ''} | ${COLS.map(k => `${fn(pct(v(k), 0.5))}（${fn(pct(v(k), 0.9))}）`).join(' | ')} |`
    );
  }
  P('');
}
fs.writeFileSync(path.join(__dirname, 'inv_hours.csv'), csv.join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'inv_hours_p.csv'), csvp.join('\n') + '\n');
if (SW) {
  P('同一時間的庫存跟 num-mat-final 比（P50，只列木、皮 T6、靈絲 T6、鐵 T6；v12／final）：\n');
  P('| 小時 | ' + ['s100', 's150'].flatMap(s => ['木', '皮T6', '靈絲T6', '鐵T6'].map(x => `${x} ${s} v12／final`)).join(' | ') + ' |');
  P('|---|' + Array(8).fill('---').join('|') + '|');
  for (const h of HR) {
    const c = [];
    for (const sec of [100, 150])
      for (const k of ['wood', 'hide6', 'silk6', 'iron6']) {
        const m = g => {
          const R = runs(g, sec)
            .filter(j => j.rows.length >= h * 60)
            .map(j => j.rows[h * 60 - 1]);
          return R.length ? fn(pct(R.map(r => (k === 'wood' ? r.wood : r.st[k])), 0.5)) + (R.length < 10 ? `(n=${R.length})` : '') : '停了';
        };
        c.push(`${m('V')}／${m('F')}`);
      }
    P(`| ${h} | ${c.join(' | ')} |`);
  }
  P('');
}

/* 3b：T1 當量與停止上漲 */
{
  const eqv = (r, m) => (m === 'wood' ? r.wood : [1, 2, 3, 4, 5, 6].reduce((a, T) => a + r.st[m + T] * 3 ** (T - 1), 0));
  P('### §3b 各材料 T1 當量（木是個數；P50（P90））與有沒有停止上漲\n');
  P('「停止上漲」＝第 50～60 小時每一分（s150 的開張庫存在 46 小時才換完，所以從 50 小時起看）（10 個種子）都 ≤ 上限＋1 顆的價（木 243、鐵 4,860、皮 48,600、靈絲 24,300；換一次至少要 1 顆，所以會在上限到上限＋1 顆之間鋸齒）。50→60 小時的 P50 變化另列（鋸齒的相位不同，正負都可能）。\n');
  const CAPV = runs('V', 100)[0].cfg.CAP, PR = { wood: 243, iron: 4860, hide: 48600, silk: 24300 };
  for (const g of ['V', 'W'])
    for (const sec of [100, 150]) {
      const L = runs(g, sec);
      P(`**${GN[g]} s${sec}**\n`);
      P('| 小時 | 木 | 鐵 | 皮 | 靈絲 |');
      P('|---|---|---|---|---|');
      for (const h of HR) P(`| ${h} | ${['wood', 'iron', 'hide', 'silk'].map(m => { const v = L.map(j => eqv(j.rows[h * 60 - 1], m)); return `${fn(pct(v, 0.5))}（${fn(pct(v, 0.9))}）`; }).join(' | ')} |`);
      const st = ['wood', 'iron', 'hide', 'silk'].map(m => {
        const d = pct(L.map(j => eqv(j.rows[3599], m)), 0.5) - pct(L.map(j => eqv(j.rows[2999], m)), 0.5);
        let mx = 0;
        for (const j of L) for (let k = 3000; k <= 3600; k++) mx = Math.max(mx, eqv(j.rows[k - 1], m));
        const ok = mx <= CAPV[m] + PR[m];
        J[`${g}${sec}stop_${m}`] = { d, mx, ok };
        return `${m === 'wood' ? '木' : MN[m]}：50→60 ${d >= 0 ? '+' : ''}${fn(d)}、50～60 小時最大 ${fn(mx)}（上限 ${fn(CAPV[m])}）→ ${ok ? '**停了**' : '**沒停**'}`;
      });
      P('\n' + st.join('；') + '\n');
    }
}
/* 長老屋費用 */
P('### 長老屋 Lv9／10／11 靈魂費用\n');
P(`| 組 | Lv9／Lv10／Lv11 |\n|---|---|\n${GRPS.map(g => `| ${GN[g]} | ${runs(g, 100)[0].ev.filter(e => e.b === 'altar' && e.lv >= 9).map(e => e.soul.toLocaleString('en')).join('／') || '（60 小時內沒買到，見 cfg）'}${runs(g, 100)[0].cfg && runs(g, 100)[0].cfg.ALT ? '（cfg ' + runs(g, 100)[0].cfg.ALT.map(v => v.toLocaleString('en')).join('／') + '）' : ''} |`).join('\n')}\n`);

/* 4 */
P('## §4 第 13→14 個地點、第 22 個地點\n');
P('| 跑 | 到第 13 個（瞭望台 Lv12，時） | 到第 14 個（Lv13，時） | 13→14 等了（分） | 第 22 個（Lv21）第一次到（時） |');
P('|---|---|---|---|---|');
for (const [g, sec] of CFG) {
  const L = runs(g, sec),
    a = L.map(j => tt(j, 'watch12')),
    b = L.map(j => tt(j, 'watch13')),
    w = b.map((v, i) => v - a[i]),
    z = L.map(j => tt(j, 'watch21'));
  J[`${g}${sec}w1314`] = [pct(w, 0.5), pct(w, 0.9)];
  J[`${g}${sec}w22`] = [pct(z, 0.5), pct(z, 0.9)];
  P(`| ${GN[g]} s${sec} | ${PP(a)} | ${PP(b)} | ${PP(w, fm)} | ${PP(z)} |`);
}
P('');

/* 5 */
P('## §5 各設施各級第一次到的時間（P50，小時）\n');
P('| 設施 | 等級 | ' + CFG.map(([g, s]) => `${GN[g]} s${s}`).join(' | ') + ' |');
P('|---|---|' + CFG.map(() => '---').join('|') + '|');
for (const b of ['forge', 'watch', 'altar', 'scout', 'store', 'sup2'])
  for (let lv = 1; lv <= 26; lv++) {
    const v = CFG.map(([g, s]) =>
      pct(
        runs(g, s).map(j => tt(j, b + lv)),
        0.5
      )
    );
    if (v.every(x => !isFinite(x))) continue;
    P(`| ${NM[b]} | Lv${lv} | ${v.map(fh).join(' | ')} |`);
  }
P('');
fs.writeFileSync(path.join(__dirname, 'tables_C.md'), out.join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'C.json'), JSON.stringify(J, (k, v) => (v === Infinity ? null : v), 1));

/* dry_over60 */
const o2 = [
  '# num-mat-v12：所有超過 60 分的乾等（node analyze_C.js 產生）\n',
  '只列 v12 最終組合（runs_C）。「段」＝開始在鍛造台 Lv20 之前／之後。缺什麼＝結束時買得起的那一座在最後一個乾等刻缺的；沒結束的段寫各設施缺什麼。\n'
];
for (const [cause, ttl] of [
  ['soul', '缺靈魂'],
  ['mat', '缺材料'],
  ['open', '跑到停止還沒結束']
]) {
  o2.push(
    `## ${ttl}\n`,
    '| 跑 | 段 | 開始（分） | 長度（分） | 地點 | 結束時買得起 | 缺什麼 | 也缺靈魂 |',
    '|---|---|---|---|---|---|---|---|'
  );
  let n = 0;
  for (const sec of [100, 150])
    for (const sd of S10) {
      const f = `s${sec}_sd${sd}`,
        j = load('V/' + f);
      for (const d of j.dry)
        if (d.cause === cause && d.len > 3600)
          n++,
            o2.push(
              `| ${f} | ${d.t0 < j.f20 ? 'Lv20 以前' : 'Lv20 以後'} | ${fm(d.t0 / 60)} | ${fm(d.len / 60)} | ${d.node} | ${d.b ? NM[d.b] + ' Lv' + d.lv : '—'} | ${d.lack.length ? d.lack.map(keyN).join('、') : d.lacks} | ${d.both ? '是' : ''} |`
            );
    }
  if (!n) o2.push('| 沒有 | | | | | | | |');
  o2.push('');
}
fs.writeFileSync(path.join(__dirname, 'dry_over60.md'), o2.join('\n') + '\n');
console.log('tables_C.md、dry_over60.md、inv_hours.csv、inv_hours_p.csv、C.json 寫好了');
