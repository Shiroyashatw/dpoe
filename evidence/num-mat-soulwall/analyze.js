/* num-mat-soulwall 分析：讀 runs/*.json，寫 tables.md、dry_over60.md、inv_hours.csv。用法：node analyze.js（先 ./long.sh）
   百分位、乾等定義、原因歸屬照 num-mat-sources（analyze.js／sim_mat.js 的 dryTick）：最近排名法（10 個種子 P50＝第 5 小、P90＝第 9 小），
   上限內沒到的當 ∞（截尾），寫「>60h」。乾等分段：開始時間在鍛造台 Lv20 之前＝「Lv20 以前」，否則「以後」。 */
'use strict';
const fs = require('fs'),
  path = require('path');
const D = path.join(__dirname, 'runs');
const S10 = [20261115, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const cache = {};
const load = f => {
  if (!cache[f]) {
    const j = JSON.parse(fs.readFileSync(path.join(D, f + '.json')));
    j.first = {};
    for (const e of j.ev) if (!(e.b + e.lv in j.first)) j.first[e.b + e.lv] = e.t / 60;
    j.f20 = 'forge20' in j.first ? j.first.forge20 * 60 : Infinity;
    cache[f] = j;
  }
  return cache[f];
};
const has = g => fs.existsSync(path.join(D, `${g}_s100_sd1.json`));
const GRPS = ['S0', 'S1', 'S2', 'S3', 'S3b', 'S3c'].filter(has);
const runs = (g, sec) => S10.map(sd => load(`${g}_s${sec}_sd${sd}`));
const pct = (L, p) => [...L].sort((a, b) => a - b)[Math.ceil(p * L.length) - 1];
const fh = v => (v == null || !isFinite(v) ? '>60h' : (v / 60).toFixed(2));
const fm = v => (v == null || !isFinite(v) ? '—' : Math.round(v));
const fn = v => (v == null || !isFinite(v) ? '—' : Math.round(v).toLocaleString('en'));
const PP = (L, f = fh) => `${f(pct(L, 0.5))}／${f(pct(L, 0.9))}`;
const tt = (j, k) => (k in j.first ? j.first[k] : Infinity);
const out = [],
  P = s => out.push(s);
const NM = {
  forge: '鍛造台',
  watch: '瞭望台',
  scout: '斥候營',
  house: '民房',
  altar: '長老屋',
  store: '倉房',
  sup2: '輔助II'
};
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
/* 每小時靈魂收入（那一分往前 60 分）：擊殺（roundLoot）與回收分開 */
const sph = (j, m, f) => {
  if (!isFinite(m)) return Infinity;
  const i = Math.min(Math.ceil(m), j.rows.length) - 1;
  return j.rows[i][f] - (i >= 60 ? j.rows[i - 60][f] : 0);
};
const GD = {
  S0: '主組＋瞭望台 Lv1 鐵 80',
  S1: 'S0＋倉房回收',
  S2: 'S0＋費用上限 20,000',
  S3: 'S0＋回收＋上限',
  S3b: 'S3、鍛造台 Lv16 留 25,000',
  S3c: 'S3、上限 15,000'
};
const CFG = GRPS.flatMap(g => [100, 150].map(sec => [g, sec]));
const segs = (j, pre) => j.dry.filter(d => (pre ? d.t0 < j.f20 : d.t0 >= j.f20));

P('# num-mat-soulwall 數字表（node analyze.js 產生）\n');
P(
  'P50／P90，單位小時（另註明的除外）；每組 10 個種子（20261115、1～9）；`>60h`＝上限 3,600 分內沒到（截尾）。重跑：`./long.sh && node analyze.js`。\n'
);
P('組：' + GRPS.map(g => `${g}＝${GD[g]}`).join('；') + '。\n');

/* 1 */
P('## §1 第 5 格（＝鍛造台 Lv16）、鍛造台 Lv20、輔助 II 13 種（a），與那時每小時靈魂收入\n');
P(
  '每小時靈魂＝那一分往前 60 分的收入，分「擊殺」（roundLoot 進來的靈魂）與「回收」（matRecycle）。第 5 格的規則就是鍛造台 Lv16，兩個是同一個時間。\n'
);
P(
  '| 組 | 一輪 | 第 5 格＝鍛造台 Lv16 | 擊殺/時 | 回收/時 | 鍛造台 Lv20 | 擊殺/時 | 回收/時 | II 13 種 | 擊殺/時 | 回收/時 | Lv20→II 全開 |'
);
P('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [g, sec] of CFG) {
  const L = runs(g, sec),
    c = [];
  for (const k of ['forge16', 'forge20', 'sup213']) {
    const v = L.map(j => tt(j, k));
    c.push(
      PP(v),
      PP(
        L.map((j, i) => sph(j, v[i], 'soulIn')),
        fn
      ),
      PP(
        L.map((j, i) => sph(j, v[i], 'recIn')),
        fn
      )
    );
  }
  P(`| ${g} | s${sec} | ${c.join(' | ')} | ${PP(L.map(j => tt(j, 'sup213') - tt(j, 'forge20')))} |`);
}
P('');

/* 2 */
P('## §2 瞭望台 Lv1（分，目標 8–12）\n');
P(
  '「靈魂第一次夠」＝瞭望台還是 Lv0 時，每 5 秒檢查（買東西之前）靈魂 ≥ 200 的第一刻；「鐵第一次夠」＝鐵的第 1 階當量 ≥ 80 的第一刻（PAY=any）；「兩個同時夠」＝同一刻兩個都夠的第一刻（那一刻照 ORDER 先買鍛造台，鍛造台買得起就會把靈魂花掉）。「卡在」＝靈魂與鐵哪一個第一次夠得比較晚（各種子計數）。分鐘照 5 秒刻，兩位小數。\n'
);
P(
  '| 組 | 一輪 | 瞭望台 Lv1 | 靈魂第一次夠 | 鐵第一次夠 | 兩個同時夠 | 卡在 | 之前買了什麼（種子 20261115；10 個種子相同與否） |'
);
P('|---|---|---|---|---|---|---|---|');
for (const [g, sec] of CFG) {
  const L = runs(g, sec);
  const f2 = v => v.toFixed(2);
  const w = L.map(j => tt(j, 'watch1')),
    so = L.map(j => j.w1soul / 60),
    ir = L.map(j => j.w1iron / 60),
    bo = L.map(j => j.w1both / 60);
  const bef = L.map(j =>
    j.ev
      .slice(
        0,
        j.ev.findIndex(e => e.b === 'watch' && e.lv === 1)
      )
      .map(e => NM[e.b] + ' Lv' + e.lv)
      .join('、')
  );
  const lim = L.map((j, i) => (so[i] > ir[i] ? '靈魂' : ir[i] > so[i] ? '鐵' : '同時')),
    cnt = {};
  for (const x of lim) cnt[x] = (cnt[x] || 0) + 1;
  P(
    `| ${g} | s${sec} | ${PP(w, f2)} | ${PP(so, f2)} | ${PP(ir, f2)} | ${PP(bo, f2)} | ${Object.entries(cnt)
      .map(([k, v]) => k + ' ' + v)
      .join(
        '、'
      )} | ${bef[0] || '沒有'}${bef.every(b => b === bef[0]) ? '（10 個相同）' : `（不同：${[...new Set(bef)].join('｜')}）`} |`
  );
}
P('');

/* 3 */
P('## §3 乾等（分）\n');
P(
  '定義與原因照 num-mat-sources（每 5 秒、買東西之前，五座設施〔民房除外、滿級不算〕都買不起的連續一段；原因看結束時第一座買得起的設施在最後一個乾等刻缺什麼：缺任何非靈魂＝缺材料，只缺靈魂＝缺靈魂）。跑到停止還沒結束的一段＝「沒結束」，不算進缺靈魂／缺材料，另列。分段：開始在鍛造台 Lv20 之前／之後。段數是每種子的段數。\n'
);
P(
  '| 組 | 一輪 | 段 | 缺靈魂 >60 分段數 | 缺靈魂最長（P50／P90／最大） | 缺材料 >60 分段數 | 缺材料最長（P50／P90／最大） | 缺材料最長那段缺什麼（各種子） | 沒結束 |'
);
P('|---|---|---|---|---|---|---|---|---|');
const dryStat = {};
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
          .join('+') + (d.both ? '（都缺）' : '');
      lk[k] = (lk[k] || 0) + 1;
    });
    const n60 = so.map(A => A.filter(d => d.len > 3600).length);
    dryStat[g + sec + pre] = { n60, sl };
    const op = S.flat().filter(d => d.open);
    P(
      `| ${g} | s${sec} | ${pre ? 'Lv20 以前' : 'Lv20 以後'} | ${PP(n60, fm)} | ${PP(sl, fm)}／${fm(Math.max(...sl))} | ${PP(
        ma.map(A => A.filter(d => d.len > 3600).length),
        fm
      )} | ${PP(ml, fm)}／${fm(Math.max(...ml))} | ${
        Object.entries(lk)
          .map(([k, v]) => `${k}×${v}`)
          .join('、') || '—'
      } | ${op.length ? `${op.length} 段，最長 ${fm(Math.max(...op.map(d => d.len)) / 60)} 分` : '—'} |`
    );
  }
P('');
P('缺靈魂 >60 分的段落，每段在等哪一座（結束時買得起的設施；所有種子合計）：\n');
P('| 組 | 一輪 | Lv20 以前 | Lv20 以後 |');
P('|---|---|---|---|');
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
  P(`| ${g} | s${sec} | ${f(1)} | ${f(0)} |`);
}
P('');

/* 4 */
const HR = [1, 2, 4, 8, 12, 16, 24, 30, 40];
const COLS = ['wood', ...['hide', 'silk'].flatMap(m => [1, 2, 3, 4, 5, 6].map(T => m + T)), 'iron5', 'iron6'];
const CN = c => (c === 'wood' ? '木' : MN[c.replace(/\d/, '')] + 'T' + c.slice(-1));
const csv = ['組,一輪,種子,小時,' + COLS.map(CN).join(',') + ',累計回收換到靈魂,解鎖當下一次換的'];
P('## §4 庫存曲線（P50（P90））\n');
P(
  '第 h 小時＝第 h×60 分那一列（逐分鐘 CSV 的列）。跑已經停了（停止條件：30 小時以後鍛造台 Lv20 且 II 全開）的種子不算，格子裡寫「n=」有幾個種子還在跑；n=0 寫「停了」。逐種子的數字：`inv_hours.csv`。\n'
);
for (const [g, sec] of CFG) {
  const L = runs(g, sec);
  P(`**${g}・s${sec}**\n`);
  const rc = g === 'S1' || g.startsWith('S3');
  P('| 小時 | ' + COLS.map(CN).join(' | ') + (rc ? ' | 累計回收換到靈魂' : '') + ' |');
  P('|---|' + COLS.map(() => '---').join('|') + (rc ? '|---' : '') + '|');
  for (const h of HR) {
    const R = L.filter(j => j.rows.length >= h * 60).map(j => j.rows[h * 60 - 1]);
    L.forEach((j, i) => {
      const r = j.rows[h * 60 - 1];
      if (r)
        csv.push(
          [
            g,
            sec,
            S10[i],
            h,
            ...COLS.map(c => (c === 'wood' ? r.wood : r.st[c])),
            r.recIn,
            j.recUnlock ? j.recUnlock.soul : ''
          ].join(',')
        );
    });
    if (!R.length) {
      P(`| ${h} | ${COLS.map(() => '停了').join(' | ')}${rc ? ' | 停了' : ''} |`);
      continue;
    }
    const c = f => {
      const v = R.map(f);
      return `${fn(pct(v, 0.5))}（${fn(pct(v, 0.9))}）`;
    };
    P(
      `| ${h}${R.length < 10 ? `（n=${R.length}）` : ''} | ${COLS.map(k => c(r => (k === 'wood' ? r.wood : r.st[k]))).join(' | ')}${rc ? ' | ' + c(r => r.recIn) : ''} |`
    );
  }
  if (rc) {
    const u = L.map(j => (j.recUnlock ? j.recUnlock.soul : Infinity)),
      ut = L.map(j => (j.recUnlock ? j.recUnlock.t / 60 : Infinity));
    P(
      `\n倉房 Lv2 解鎖：${PP(ut)} 小時；解鎖當下一次換到的靈魂 ${PP(u, fn)}；跑完時累計回收 ${PP(
        L.map(j => j.rows.at(-1).recIn),
        fn
      )}（同時累計擊殺靈魂 ${PP(
        L.map(j => j.rows.at(-1).soulIn),
        fn
      )}）。`
    );
  }
  P('');
}
fs.writeFileSync(path.join(__dirname, 'inv_hours.csv'), csv.join('\n') + '\n');

/* 5 */
P('## §5 第 13→14 個地點、第 22 個地點\n');
P('| 組 | 一輪 | 到第 13 個（瞭望台 Lv12） | 到第 14 個（Lv13） | 13→14 等了（分） | 第 22 個（Lv21）第一次到 |');
P('|---|---|---|---|---|---|');
for (const [g, sec] of CFG) {
  const L = runs(g, sec),
    a = L.map(j => tt(j, 'watch12')),
    b = L.map(j => tt(j, 'watch13'));
  P(
    `| ${g} | s${sec} | ${PP(a)} | ${PP(b)} | ${PP(
      b.map((v, i) => v - a[i]),
      fm
    )} | ${PP(L.map(j => tt(j, 'watch21')))} |`
  );
}
P('');

/* 6 */
P('## §6 各設施各級到達時間（P50，小時），S1～S3 跟 S0 比\n');
P(
  '差＝這組−S0（分）。只比兩邊都到的；「差最多」照 |差| 排。注意：跑在 30 小時以後停止條件成立就停，跑完時沒到的寫 >60h（截尾），差寫「—」。\n'
);
const LVK = [];
for (const b of ['forge', 'watch', 'altar', 'scout', 'store', 'sup2'])
  for (let lv = 1; lv <= 26; lv++) LVK.push([b, lv]);
const med = (g, sec, b, lv) =>
  pct(
    runs(g, sec).map(j => tt(j, b + lv)),
    0.5
  );
for (const g of GRPS.filter(g => g !== 'S0'))
  for (const sec of [100, 150]) {
    const rows = [];
    for (const [b, lv] of LVK) {
      const n = med(g, sec, b, lv),
        o = med('S0', sec, b, lv);
      if (!isFinite(n) && !isFinite(o)) continue;
      rows.push({ b, lv, n, o, d: isFinite(n) && isFinite(o) ? n - o : null });
    }
    P(`**${g}・s${sec}：差最多的前 10 個**\n`);
    P('| 設施 | 等級 | ' + g + ' | S0 | 差（分） |');
    P('|---|---|---|---|---|');
    for (const x of rows
      .filter(x => x.d != null)
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
      .slice(0, 10))
      P(`| ${NM[x.b]} | Lv${x.lv} | ${fh(x.n)} | ${fh(x.o)} | ${fm(x.d)} |`);
    const cen = rows.filter(x => x.d == null);
    if (cen.length)
      P(`\n一邊沒到：${cen.map(x => `${NM[x.b]} Lv${x.lv}（${g} ${fh(x.n)}／S0 ${fh(x.o)}）`).join('、')}`);
    P('');
  }
P('### §6.1 完整表（P50，小時）\n');
P('| 設施 | 等級 | ' + CFG.map(([g, s]) => `${g} s${s}`).join(' | ') + ' |');
P('|---|---|' + CFG.map(() => '---').join('|') + '|');
for (const [b, lv] of LVK) {
  const v = CFG.map(([g, s]) => med(g, s, b, lv));
  if (v.every(x => !isFinite(x))) continue;
  P(`| ${NM[b]} | Lv${lv} | ${v.map(fh).join(' | ')} |`);
}
P('');
fs.writeFileSync(path.join(__dirname, 'tables.md'), out.join('\n') + '\n');

/* 條件加跑的判定 */
const trig = {};
if (has('S3')) {
  const f16 = pct(
    runs('S3', 100).map(j => tt(j, 'forge16')),
    0.5
  );
  trig.S3b = { f16: f16 / 60, run: f16 / 60 < 8 };
  const L = [100, 150].flatMap(sec => runs('S3', sec));
  const n = L.filter(j => segs(j, 1).some(d => d.cause === 'soul' && d.len > 3600)).length;
  trig.S3c = { seeds: n, run: n > 0 };
}
fs.writeFileSync(path.join(__dirname, 'trigger.json'), JSON.stringify(trig, null, 1));

/* dry_over60 */
const o2 = [
  '# num-mat-soulwall：所有超過 60 分的乾等（node analyze.js 產生）\n',
  '「段」＝開始在鍛造台 Lv20 之前／之後。\n'
];
for (const [cause, ttl] of [
  ['soul', '缺靈魂'],
  ['mat', '缺材料'],
  ['open', '跑到停止還沒結束']
]) {
  o2.push(
    `## ${ttl}\n`,
    '| 跑 | 段 | 開始（分） | 長度（分） | 地點 | 結束時買得起 | 缺什麼 | 都缺 |',
    '|---|---|---|---|---|---|---|---|'
  );
  let n = 0;
  for (const g of GRPS)
    for (const sec of [100, 150])
      for (const sd of S10) {
        const f = `${g}_s${sec}_sd${sd}`,
          j = load(f);
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
console.log('tables.md、dry_over60.md、inv_hours.csv 寫好了', JSON.stringify(trig));
