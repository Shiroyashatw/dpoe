/* num-mat-sources 分析：讀 runs/*.json，寫 tables.md（summary.md 的數字都從這裡來）與 dry_over60.md（所有 >60 分的乾等）。
   用法：node analyze.js（先 ./long.sh）
   百分位：最近排名法（10 個種子 P50＝第 5 小、P90＝第 9 小；6 個 P50＝第 3、P90＝第 6；3 個 P50＝第 2、P90＝第 3）；
   上限內沒到的當 ∞（截尾），寫「>60h」。時間單位小時（兩位小數），乾等單位分鐘。 */
'use strict';
const fs = require('fs'),
  path = require('path');
const D = path.join(__dirname, 'runs');
const S10 = [20261115, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  S6 = S10.slice(0, 6),
  S3 = S10.slice(0, 3);
const cache = {};
const load = f => {
  if (!cache[f]) {
    const j = JSON.parse(fs.readFileSync(path.join(D, f + '.json')));
    j.first = {};
    for (const e of j.ev) if (!(e.b + e.lv in j.first)) j.first[e.b + e.lv] = e.t / 60;
    cache[f] = j;
  }
  return cache[f];
};
const has = f => fs.existsSync(path.join(D, f + '.json'));
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
const MN = { iron: '鐵', hide: '皮', silk: '靈絲', wood: '木', gold: '金' };
const keyN = k =>
  k === 'wood'
    ? '木'
    : k === 'gold'
      ? '金'
      : k.startsWith('cur:')
        ? k.slice(4)
        : MN[k.split(':')[0]] + 'T' + k.split(':')[1];
const runs = (pay, sup, sec, seeds = S10, pre = '') => seeds.map(sd => load(`${pre || pay}_${sup}_s${sec}_sd${sd}`));
/* 每小時靈魂收入：那一分往前 60 分的累計收入差 */
const sph = (j, m) => {
  if (!isFinite(m)) return Infinity;
  const i = Math.min(Math.ceil(m), j.rows.length) - 1;
  return j.rows[i].soulIn - (i >= 60 ? j.rows[i - 60].soulIn : 0);
};
const CFG = [];
for (const pay of ['any', 'strict']) for (const sec of [100, 150]) CFG.push([pay, sec]);
const PN = { any: '主組 PAY=any', strict: '對照 PAY=strict' };

P('# num-mat-sources 數字表（node analyze.js 產生）\n');
P(
  'P50／P90，單位小時（另註明的除外）；10 個種子（20261115、1～9）；`>60h`＝上限 3,600 分內沒到（截尾，排序時當 ∞）。重跑：`./long.sh && node analyze.js`。\n'
);

/* ---------- 1 ---------- */
P('## §1 第 5 格（鍛造台 Lv16）、鍛造台 Lv20、輔助 II 13 種\n');
P(
  '(a)＝Lv20 後 II 優先；(b)＝II 排在其他升級後。每小時靈魂收入＝那一分往前 60 分的收入（P50／P90，靈魂）。鍛造台 Lv20 以前 a、b 逐分鐘相同（政策只在 Lv20 後不同），第 5 格與 Lv20 用 (a) 的跑。\n'
);
P(
  '| 組 | 一輪 | 第 5 格（鍛造台 Lv16） | 那時每小時靈魂 | 鍛造台 Lv20 | 那時每小時靈魂 | II 13 種（a） | Lv20→II 全開（a，小時） | II 全開時每小時靈魂（a） | II 13 種（b） | Lv20→II 全開（b） | (b) 60h 時已解鎖幾種 |'
);
P('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [pay, sec] of CFG) {
  const A = runs(pay, 'a', sec),
    B = runs(pay, 'b', sec);
  const f16 = A.map(j => tt(j, 'forge16')),
    f20 = A.map(j => tt(j, 'forge20')),
    ia = A.map(j => tt(j, 'sup213')),
    ib = B.map(j => tt(j, 'sup213'));
  P(
    `| ${PN[pay]} | s${sec} | ${PP(f16)} | ${PP(
      A.map((j, i) => sph(j, f16[i])),
      fn
    )} | ${PP(f20)} | ${PP(
      A.map((j, i) => sph(j, f20[i])),
      fn
    )} | ${PP(ia)} | ${PP(ia.map((v, i) => v - f20[i]))} | ${PP(
      A.map((j, i) => sph(j, ia[i])),
      fn
    )} | ${PP(ib)} | ${PP(ib.map((v, i) => v - B.map(j => tt(j, 'forge20'))[i]))} | ${PP(
      B.map(j => j.rows.at(-1).sup2),
      fm
    )} |`
  );
}
P('');

/* ---------- 2 ---------- */
P('## §2 第一次到第 N 個地點（瞭望台 Lv N−1）、瞭望台 Lv1（分）\n');
P(
  '| 組 | 一輪 | 瞭望台 Lv1（分，目標 8–12） | 第 2 個 | 第 9 個 | 第 13 個 | 第 14 個 | 第 16 個 | 第 19 個 | 第 22 個 |'
);
P('|---|---|---|---|---|---|---|---|---|---|');
for (const [pay, sec] of CFG) {
  const A = runs(pay, 'a', sec);
  P(
    `| ${PN[pay]} | s${sec} | ${PP(
      A.map(j => tt(j, 'watch1')),
      fm
    )} | ${[2, 9, 13, 14, 16, 19, 22].map(n => PP(A.map(j => tt(j, 'watch' + (n - 1))))).join(' | ')} |`
  );
}
{
  const N = runs('any', 'a', 150, S3, 'nocraft');
  P(
    `| 參考：不打造（any） | s150（3 種子） | ${PP(
      N.map(j => tt(j, 'watch1')),
      fm
    )} | ${[2, 9, 13, 14, 16, 19, 22].map(n => PP(N.map(j => tt(j, 'watch' + (n - 1))))).join(' | ')} |`
  );
}
P('');

/* ---------- 3 ---------- */
P('## §3 乾等\n');
P(
  '定義：每 5 秒、買東西之前看鍛造台、瞭望台、長老屋、斥候營、倉房（民房除外、滿級不算）有沒有任何一級買得起（PAY 規則與商會都算進去）；連續都買不起的一段＝一段乾等，長度＝到第一次又買得起為止。'
);
P(
  '原因＝結束時第一座買得起的設施，在最後一個乾等刻缺什麼：缺任何材料（含木、金、通貨）＝缺材料（同時缺靈魂的標「都缺」）；只缺靈魂＝缺靈魂。「等材料」＝那座設施靈魂已經夠了之後還等了多久。跑到上限還沒結束的一段另列（沒結束）。\n'
);
P('### §3.1 每組總覽（分；所有種子、所有段）\n');
P(
  '| 組 | SUP | 一輪 | 缺材料段數 | 缺材料最長（P50／P90／最大） | 其中「等材料」最長（P50／P90／最大） | 缺材料 >60 分段數 | 缺靈魂 >60 分段數 | 缺靈魂最長（P50／P90／最大） |'
);
P('|---|---|---|---|---|---|---|---|---|');
const dryRow = (L, lbl) => {
  const mat = L.map(j => j.dry.filter(d => d.cause === 'mat')),
    sou = L.map(j => j.dry.filter(d => d.cause === 'soul'));
  const mx = A => (A.length ? Math.max(...A) : 0) / 60;
  const ml = mat.map(A => mx(A.map(d => d.len))),
    mw = mat.map(A => mx(A.map(d => d.matWait))),
    sl = sou.map(A => mx(A.map(d => d.len)));
  P(
    `| ${lbl} | ${fm(mat.flat().length)} | ${PP(ml, fm)}／${fm(Math.max(...ml))} | ${PP(mw, fm)}／${fm(Math.max(...mw))} | ${mat.flat().filter(d => d.len > 3600).length} | ${sou.flat().filter(d => d.len > 3600).length} | ${PP(sl, fm)}／${fm(Math.max(...sl))} |`
  );
};
for (const [pay, sec] of CFG)
  for (const sup of ['a', 'b']) dryRow(runs(pay, sup, sec), `${PN[pay]} | ${sup} | s${sec}`);
dryRow(runs('any', 'a', 150, S3, 'nocraft'), '不打造（any） | a | s150（3）');
for (const sec of [100, 150]) dryRow(runs('any', 'a', sec, S6, 'w02'), `W_RATIO=0.2（any） | a | s${sec}（6）`);
P('');

P('### §3.2 每個地點、每種材料各階：最長的缺材料乾等（分，P50／P90／最大；種子沒有這種乾等＝0）\n');
P('一段缺好幾種的，每一種都算。只列至少一個種子有的。SUP a（Lv20 以前 a、b 相同）。\n');
for (const [pay, sec] of CFG) {
  const L = runs(pay, 'a', sec),
    keys = new Set();
  for (const j of L)
    for (const d of j.dry) if (d.cause === 'mat') for (const k of d.lack) if (k !== 'soul') keys.add(d.node + '|' + k);
  P(`**${PN[pay]}・s${sec}**\n`);
  P('| 地點 | 缺什麼 | 最長（P50／P90／最大） | 有的種子數 |');
  P('|---|---|---|---|');
  const K = [...keys].sort((a, b) => +a.split('|')[0] - +b.split('|')[0] || a.localeCompare(b));
  for (const k of K) {
    const [n, m] = k.split('|');
    const v = L.map(
      j =>
        Math.max(0, ...j.dry.filter(d => d.cause === 'mat' && d.node == n && d.lack.includes(m)).map(d => d.len)) / 60
    );
    P(`| ${n} | ${keyN(m)} | ${PP(v, fm)}／${fm(Math.max(...v))} | ${v.filter(x => x > 0).length} |`);
  }
  if (!K.length) P('| — | 沒有 | — | 0 |');
  P('');
}

P('### §3.3 第 13→14 個地點\n');
P(
  '到第 13 個（瞭望台 Lv12）、湊齊瞭望台 Lv13 的材料（木＋鐵，靈魂不算）、到第 14 個（瞭望台 Lv13）；中間等了多久（分）。SUP a。\n'
);
P(
  '| 組 | 一輪 | 到第 13 個 | 湊齊 Lv13 材料 | 到第 14 個 | 13→14 等了（分） | 其中等材料（13→湊齊，分） | 湊齊後等靈魂（分） | Lv13 費用 |'
);
P('|---|---|---|---|---|---|---|---|---|');
for (const [pay, sec] of CFG) {
  const L = runs(pay, 'a', sec),
    a = L.map(j => tt(j, 'watch12')),
    m = L.map(j => (j.w13mat == null ? Infinity : j.w13mat / 60)),
    b = L.map(j => tt(j, 'watch13'));
  const e = L[0].ev.find(e => e.b === 'watch' && e.lv === 13);
  P(
    `| ${PN[pay]} | s${sec} | ${PP(a)} | ${PP(m)} | ${PP(b)} | ${PP(
      b.map((v, i) => v - a[i]),
      fm
    )} | ${PP(
      m.map((v, i) => Math.max(0, v - a[i])),
      fm
    )} | ${PP(
      b.map((v, i) => v - Math.max(a[i], m[i])),
      fm
    )} | ${
      e
        ? `靈魂 ${fn(e.soul)}、木 ${e.wood}、${Object.entries(e.mats)
            .map(([k, v]) => keyN(k) + ' ' + v)
            .join('、')}`
        : '—'
    } |`
  );
}
P('');

/* ---------- 4 ---------- */
P('## §4 材料與木\n');
const MK = ['iron', 'hide', 'silk'];
for (const [pay, sec] of CFG) {
  const L = runs(pay, 'a', sec);
  P(`**${PN[pay]}・s${sec}・SUP a：各階庫存 P50（P90）**\n`);
  P('| 小時 | 木 | ' + MK.flatMap(m => [1, 2, 3, 4, 5, 6].map(T => MN[m] + 'T' + T)).join(' | ') + ' |');
  P('|---|---|' + MK.flatMap(() => [1, 2, 3, 4, 5, 6].map(() => '---')).join('|') + '|');
  for (const h of [1, 2, 4, 8, 16, 24, 30]) {
    const R = L.map(j => j.rows[Math.min(h * 60, j.rows.length) - 1]);
    const c = f => {
      const v = R.map(f);
      return `${fm(pct(v, 0.5))}（${fm(pct(v, 0.9))}）`;
    };
    P(
      `| ${h} | ${c(r => r.wood)} | ${MK.flatMap(m => [1, 2, 3, 4, 5, 6].map(T => c(r => r.st[m + T]))).join(' | ')} |`
    );
  }
  P('');
}
P('### §4.1 打造\n');
P(
  '| 組 | SUP | 一輪 | 第一次打造（秒） | 第一小時件數 | 累計件數（到跑完） | 每小時件數（累計÷跑的小時） | 跑的小時 |'
);
P('|---|---|---|---|---|---|---|---|');
for (const [pay, sec] of CFG)
  for (const sup of ['a', 'b']) {
    const L = runs(pay, sup, sec);
    P(
      `| ${PN[pay]} | ${sup} | s${sec} | ${PP(
        L.map(j => j.craft1 ?? Infinity),
        fm
      )} | ${PP(
        L.map(j => j.rows[59].craftN),
        fm
      )} | ${PP(
        L.map(j => j.rows.at(-1).craftN),
        fn
      )} | ${PP(
        L.map(j => (j.rows.at(-1).craftN / j.rows.length) * 60),
        v => (isFinite(v) ? v.toFixed(1) : '—')
      )} | ${PP(
        L.map(j => j.rows.length / 60),
        v => v.toFixed(1)
      )} |`
    );
  }
P('');
P('### §4.2 掉落、用量、打造淨用量（P50，整段；材料單位＝個）\n');
P(
  '| 組 | 一輪 | 鍵 | 擊殺掉落 | 設施用掉 | 打造淨用掉（打造−分解退回） | 跑完庫存 | 其中 PAY=any 拿別階付的 | 商會 5 換 1 換到 |'
);
P('|---|---|---|---|---|---|---|---|---|');
for (const [pay, sec] of CFG) {
  const L = runs(pay, 'a', sec);
  const ks = new Set();
  for (const j of L) for (const o of [j.drop, j.campUse]) for (const k in o) ks.add(k);
  for (const k of [...ks].sort()) {
    const g = o =>
      PP(
        L.map(j => (j[o] || {})[k] || 0),
        fn
      );
    const [m, T] = k.split(':');
    P(
      `| ${PN[pay]} | s${sec} | ${keyN(k)} | ${g('drop')} | ${g('campUse')} | ${g('craftNet')} | ${PP(
        L.map(j => (k === 'wood' ? j.rows.at(-1).wood : j.rows.at(-1).st[m + T])),
        fn
      )} | ${g('payAny')} | ${g('trade')} |`
    );
  }
}
P('');

/* ---------- 5 ---------- */
P('## §5 各設施各級到達時間（P50，小時）跟 num-skill-slot5-pace A 組實驗（照 main 經濟，SUP a）比\n');
P(
  '舊數據：`oldA_exp_a_first.json`（從 `numbers/num-skill-slot5-pace` @65b05b9 的 `runs_csv.tar.xz` 裡 `none_exp_a_*` 的事件表抽出）。差＝新−舊（分）；>60h 的當截尾，差寫「—」。\n'
);
const OLD = JSON.parse(fs.readFileSync(path.join(__dirname, 'oldA_exp_a_first.json')));
for (const pay of ['any', 'strict'])
  for (const sec of [100, 150]) {
    const L = runs(pay, 'a', sec),
      O = S10.map(sd => OLD[`none_exp_a_s${sec}_sd${sd}`]);
    const rows = [];
    for (const b of ['altar', 'forge', 'watch', 'scout', 'store', 'house'])
      for (let lv = 1; lv <= 26; lv++) {
        const n = pct(
            L.map(j => tt(j, b + lv)),
            0.5
          ),
          o = pct(
            O.map(x => (b + lv in x.first ? x.first[b + lv] : Infinity)),
            0.5
          );
        if (!isFinite(n) && !isFinite(o) && !(b === 'altar' && lv <= 11)) continue;
        rows.push({ b, lv, n, o, d: isFinite(n) && isFinite(o) ? n - o : null });
      }
    P(`**${PN[pay]}・s${sec}**\n`);
    P('長老屋各級：\n');
    P('| 等級 | 新 | 舊 A | 差（分） |');
    P('|---|---|---|---|');
    for (const x of rows.filter(x => x.b === 'altar')) P(`| Lv${x.lv} | ${fh(x.n)} | ${fh(x.o)} | ${fm(x.d)} |`);
    P('\n差最多的前 10 個（照 |差|；一邊 >60h 的排在最後不列）：\n');
    P('| 設施 | 等級 | 新 | 舊 A | 差（分） |');
    P('|---|---|---|---|---|');
    for (const x of rows
      .filter(x => x.d != null)
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
      .slice(0, 10))
      P(`| ${NM[x.b]} | Lv${x.lv} | ${fh(x.n)} | ${fh(x.o)} | ${fm(x.d)} |`);
    const cen = rows.filter(x => x.d == null && !(!isFinite(x.n) && !isFinite(x.o)));
    if (cen.length)
      P(`\n一邊在 60h 內沒到：${cen.map(x => `${NM[x.b]} Lv${x.lv}（新 ${fh(x.n)}／舊 ${fh(x.o)}）`).join('、')}`);
    P('\n完整表（全部設施、全部等級）：\n');
    P('| 設施 | 等級 | 新 | 舊 A | 差（分） |');
    P('|---|---|---|---|---|');
    for (const x of rows) P(`| ${NM[x.b]} | Lv${x.lv} | ${fh(x.n)} | ${fh(x.o)} | ${fm(x.d)} |`);
    P('');
  }

P(
  '注意：SUP a 的跑在「30 小時以後鍛造台 Lv20 且 II 全開」就停（s100 約 41 小時停），所以 a 的「>60h」在 s100 其實是「跑完時還沒到」。長老屋 Lv7～11 另用 SUP b（都跑滿 60 小時）補一張：\n'
);
P('| 組 | 一輪 | Lv7 | Lv8 | Lv9 | Lv10 | Lv11 |');
P('|---|---|---|---|---|---|---|');
for (const [pay, sec] of CFG) {
  const L = runs(pay, 'b', sec);
  P(
    `| ${PN[pay]}（SUP b） | s${sec} | ${[7, 8, 9, 10, 11].map(lv => PP(L.map(j => tt(j, 'altar' + lv)))).join(' | ')} |`
  );
}
P('');

/* ---------- 校準 ---------- */
const calF = fs.readdirSync(D).filter(f => f.startsWith('cal_') && f.endsWith('.json'));
P('## §6 校準\n');
P(
  calF.length
    ? `跑了 ${calF.length} 個（見 runs/cal_*）。`
    : '主組沒有任何種子出現 >60 分的缺材料乾等，校準沒有跑（只加跑 W_RATIO＝0.2，見 §3.1 與 §6.1）。\n'
);
P('### §6.1 W_RATIO＝0.2（any、SUP a、6 種子）跟主組（同 6 種子）比\n');
P(
  '| 一輪 | 組 | 缺木的乾等段數 | 缺木最長（P50／P90／最大，分） | 鍛造台 Lv16 | 鍛造台 Lv20 | 第 22 個地點 | 第 24 小時木（P50） |'
);
P('|---|---|---|---|---|---|---|---|');
for (const sec of [100, 150])
  for (const [lbl, L] of [
    ['主組 W=0.3', runs('any', 'a', sec, S6)],
    ['W=0.2', runs('any', 'a', sec, S6, 'w02')]
  ]) {
    const w = L.map(j => j.dry.filter(d => d.cause === 'mat' && d.lack.includes('wood')));
    const mx = w.map(A => Math.max(0, ...A.map(d => d.len)) / 60);
    P(
      `| s${sec} | ${lbl} | ${w.flat().length} | ${PP(mx, fm)}／${fm(Math.max(...mx))} | ${PP(L.map(j => tt(j, 'forge16')))} | ${PP(L.map(j => tt(j, 'forge20')))} | ${PP(L.map(j => tt(j, 'watch21')))} | ${fn(
        pct(
          L.map(j => j.rows[Math.min(1440, j.rows.length) - 1].wood),
          0.5
        )
      )} |`
    );
  }
P('');

fs.writeFileSync(path.join(__dirname, 'tables.md'), out.join('\n') + '\n');

/* ---------- 所有 >60 分的乾等 ---------- */
const o2 = ['# num-mat-sources：所有超過 60 分的乾等（node analyze.js 產生）\n'];
for (const [cause, ttl] of [
  ['mat', '缺材料'],
  ['soul', '缺靈魂（只回報）'],
  ['open', '跑到上限還沒結束']
]) {
  o2.push(
    `## ${ttl}\n`,
    '| 跑 | 開始（分） | 長度（分） | 地點 | 結束時買得起 | 缺什麼 | 都缺 | 等材料（分） |',
    '|---|---|---|---|---|---|---|---|'
  );
  let n = 0;
  for (const f of fs
    .readdirSync(D)
    .filter(f => f.endsWith('.json'))
    .sort()) {
    const j = load(f.replace('.json', ''));
    for (const d of j.dry)
      if (d.cause === cause && d.len > 3600)
        n++,
          o2.push(
            `| ${f.replace('.json', '')} | ${fm(d.t0 / 60)} | ${fm(d.len / 60)} | ${d.node} | ${d.b ? NM[d.b] + ' Lv' + d.lv : '—'} | ${(d.lack.length ? d.lack : (d.lacks || '').split(' ')).map(k => (k.includes(':') && !k.startsWith('cur') && !/^[a-z]+:[a-z]/.test(k) ? keyN(k) : k)).join('、')} | ${d.both ? '是' : ''} | ${fm(d.matWait / 60)} |`
          );
  }
  if (!n) o2.push('| 沒有 | | | | | | | |');
  o2.push('');
}
fs.writeFileSync(path.join(__dirname, 'dry_over60.md'), o2.join('\n') + '\n');
console.log('tables.md、dry_over60.md 寫好了');
