/* num-skill-slot5-pace 分析：讀 runs/*.json，寫 tables.md（summary.md 引用的所有數字都從這裡來）。
   用法：node analyze.js > tables.md
   百分位：最近排名法，10 個種子時 P50＝第 5 小、P90＝第 9 小；上限內沒到的當 ∞（截尾），落在 ∞ 就寫「>上限」。
   時間單位：小時（兩位小數）；差值單位：分鐘。 */
'use strict';
const fs = require('fs'),
  path = require('path');
const D = path.join(__dirname, 'runs');
const SEEDS = [20261115, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const cache = {};
const load = (pay, g, sup, sec, sd) => {
  const f = `${pay}_${g}_${sup}_s${sec}_sd${sd}`;
  if (!cache[f]) {
    const j = JSON.parse(fs.readFileSync(path.join(D, f + '.json')));
    j.first = {}; /* 第一次買到的分鐘 */
    for (const e of j.ev) if (!(e.b + e.lv in j.first)) j.first[e.b + e.lv] = e.t / 60;
    j.cap = j.rows.length;
    cache[f] = j;
  }
  return cache[f];
};
const pct = (L, p) => {
  const s = [...L].sort((a, b) => a - b);
  return s[Math.ceil(p * s.length) - 1];
};
const fh = (v, cap) => (v === undefined || v === Infinity || v == null ? `>${(cap / 60).toFixed(0)}h` : (v / 60).toFixed(2));
const fm = v => (v === undefined || !isFinite(v) ? '—' : Math.round(v));
const fn = v => (v === undefined || !isFinite(v) ? '—' : Math.round(v).toLocaleString('en'));
const PP = (L, cap, f = fh) => `${f(pct(L, 0.5), cap)}／${f(pct(L, 0.9), cap)}`;
const t = (j, k) => (k in j.first ? j.first[k] : Infinity);
const out = [];
const P = s => out.push(s);
const NM = { forge: '鍛造台', watch: '瞭望台', scout: '斥候營', house: '民房', altar: '長老屋', store: '倉房', sup2: '輔助II' };
const CAP = 3600;
const PAYS = [
  ['none', 'A 照現況（商會補料）'],
  ['any', 'B 假設：鐵任何階都收（3^(T−1)）']
];
const SECS = [100, 150];
const rowAt = (j, min) => j.rows[Math.min(min, j.rows.length) - 1];

P('# num-skill-slot5-pace 數字表（node analyze.js 產生）\n');
P('P50／P90，單位小時（另註明的除外）；10 個種子（20261115、1～9）；`>60h`＝上限 3,600 分內沒到（截尾）。基準跑法＝SUP b（第 1、2、4 項；鍛造台 Lv20 以前三種 SUP 逐分鐘相同，見 §9）。\n');

/* ---------- 0. 第 13 個地點 ---------- */
P('## §0 第 13 個地點的卡點（瞭望台 Lv12→Lv13 的等待）\n');
P('| 組 | 一輪 | 到第 13 個地點（瞭望台 Lv12） | 到第 14 個地點（Lv13） | 中間卡了（分） | 礦場到 Lv75（第一次產百煉鋼）| 第 16 個地點 | 第 17 個地點 |');
P('|---|---|---|---|---|---|---|---|');
for (const [pay, pn] of [['notrade', '舊政策原樣（不用商會）'], ...PAYS])
  for (const sec of SECS) {
    const L = SEEDS.map(sd => (pay === 'notrade' ? load('notrade', 'ctrl', 'b', sec, sd) : load(pay, 'ctrl', 'b', sec, sd)));
    const g75 = L.map(j => {
      const r = j.rows.find(r => +r.gen.split('/')[1] >= 75);
      return r ? r.min : Infinity;
    });
    P(`| ${pn}・對照 | s${sec} | ${PP(L.map(j => t(j, 'watch12')), CAP)} | ${PP(L.map(j => t(j, 'watch13')), CAP)} | ${PP(L.map(j => t(j, 'watch13') - t(j, 'watch12')), CAP, fm)} | ${PP(g75, CAP)} | ${PP(L.map(j => t(j, 'watch15')), CAP)} | ${PP(L.map(j => t(j, 'watch16')), CAP)} |`);
  }
P('');

/* ---------- 1. ---------- */
P('## §1 鍛造台 Lv16／Lv20、第 16 個地點（冰封神殿）、第 22 個地點（裂口腹地）\n');
P('| 組 | 一輪 | 政策 | 鍛造台 Lv16 | 鍛造台 Lv20 | 第 16 個地點 | 第 22 個地點 |');
P('|---|---|---|---|---|---|---|');
for (const [pay, pn] of PAYS)
  for (const sec of SECS)
    for (const g of ['ctrl', 'exp']) {
      const L = SEEDS.map(sd => load(pay, g, 'b', sec, sd));
      P(`| ${pn} | s${sec} | ${g === 'ctrl' ? '對照' : '實驗'} | ${PP(L.map(j => t(j, 'forge16')), CAP)} | ${PP(L.map(j => t(j, 'forge20')), CAP)} | ${PP(L.map(j => t(j, 'watch15')), CAP)} | ${PP(L.map(j => t(j, 'watch21')), CAP)} |`);
    }
P('');

/* ---------- 2. ---------- */
const slot5k = g => (g === 'ctrl' ? 'altar9' : 'forge16');
P('## §2 對照組 vs 實驗組\n');
for (const [pay, pn] of PAYS) {
  P(`### ${pn}\n`);
  P('#### 2a 第 5 格與長老屋各級（小時）\n');
  P('| 解鎖 | s100 對照 | s100 實驗 | s150 對照 | s150 實驗 |');
  P('|---|---|---|---|---|');
  const AL = [
    ['第 5 格技能（對照＝長老屋 Lv9；實驗＝鍛造台 Lv16）', 'slot5'],
    ['Lv1 第 2 格技能', 'altar1'],
    ['Lv2 第 1 個輔助孔', 'altar2'],
    ['Lv3 第 3 格技能', 'altar3'],
    ['Lv4 天賦樹', 'altar4'],
    ['Lv5 第 2 個輔助孔、光環欄', 'altar5'],
    ['Lv6 第 4 格技能', 'altar6'],
    ['Lv7 昇華', 'altar7'],
    ['Lv8 第 3 個輔助孔', 'altar8'],
    ['Lv9（實驗組沒有效果）', 'altar9'],
    ['Lv10 珠寶孔', 'altar10'],
    ['Lv11 輔助孔 5 個', 'altar11']
  ];
  for (const [n, k] of AL) {
    const c = [];
    for (const sec of SECS)
      for (const g of ['ctrl', 'exp']) {
        const L = SEEDS.map(sd => load(pay, g, 'b', sec, sd));
        c.push(PP(L.map(j => t(j, k === 'slot5' ? slot5k(g) : k)), CAP));
      }
    P(`| ${n} | ${c.join(' | ')} |`);
  }
  P('');
  /* 其他設施各級：P50 差最多的前 10 */
  P('#### 2b 其他設施各級，實驗−對照 的 P50 差最多的前 10（小時；差＝分鐘，正＝實驗組晚）\n');
  for (const sec of SECS) {
    const C = SEEDS.map(sd => load(pay, 'ctrl', 'b', sec, sd)),
      E = SEEDS.map(sd => load(pay, 'exp', 'b', sec, sd));
    const keys = [];
    for (const b of ['forge', 'watch', 'scout', 'house', 'store']) for (let lv = 1; lv <= 26; lv++) keys.push([b, lv]);
    const L = keys
      .map(([b, lv]) => {
        const c = C.map(j => t(j, b + lv)),
          e = E.map(j => t(j, b + lv));
        if (c.every(x => x === Infinity) && e.every(x => x === Infinity)) return null;
        const pc = pct(c, 0.5),
          pe = pct(e, 0.5),
          d = SEEDS.map((_, i) => (isFinite(e[i]) && isFinite(c[i]) ? e[i] - c[i] : NaN)).filter(x => !isNaN(x));
        return { b, lv, c, e, d50: isFinite(pc) && isFinite(pe) ? pe - pc : pe === pc ? 0 : Infinity * Math.sign(pe - pc || 1), dseed: d };
      })
      .filter(Boolean)
      .sort((a, b) => Math.abs(b.d50) - Math.abs(a.d50))
      .slice(0, 10);
    P(`s${sec}：\n`);
    P('| 設施 等級 | 對照 P50／P90 | 實驗 P50／P90 | P50 差（分） | 逐種子差 P50／P90（分） |');
    P('|---|---|---|---|---|');
    for (const x of L) P(`| ${NM[x.b]} Lv${x.lv} | ${PP(x.c, CAP)} | ${PP(x.e, CAP)} | ${fm(x.d50)} | ${x.dseed.length ? PP(x.dseed, CAP, fm) : '—'} |`);
    P('');
  }
  /* 打造、靈魂存量、累計花費 */
  const HRS = [1, 2, 4, 8, 12, 16, 24, 30];
  P('#### 2c 打造進度、靈魂存量（第 N 小時）\n');
  P('打造＝camp_run 的政策：一分鐘最多打一件（n＝1），不換裝、全分解；稀有＝`craftDo` 回的物品 r＝2（稀有度照 `CRAFT_RAR`）。模擬器沒有裝備強度指標（不換裝），不列。\n');
  for (const sec of SECS) {
    P(`s${sec}：\n`);
    P('| 小時 | 累計打造 對照 | 實驗 | 累計稀有 對照 | 實驗 | 靈魂存量 對照 | 實驗 |');
    P('|---|---|---|---|---|---|---|');
    for (const h of HRS) {
      const c = [];
      for (const f of ['craftN', 'rareN', 'soul'])
        for (const g of ['ctrl', 'exp']) {
          const L = SEEDS.map(sd => rowAt(load(pay, g, 'b', sec, sd), h * 60)[f]);
          c.push(PP(L, CAP, fn));
        }
      P(`| ${h} | ${c.join(' | ')} |`);
    }
    for (const lv of [16, 20]) {
      const c = [];
      for (const f of ['craftN', 'rareN', 'soul'])
        for (const g of ['ctrl', 'exp']) {
          const L = SEEDS.map(sd => {
            const j = load(pay, g, 'b', sec, sd),
              x = t(j, 'forge' + lv);
            return isFinite(x) ? rowAt(j, Math.ceil(x))[f] : NaN;
          }).filter(x => !isNaN(x));
          c.push(L.length ? PP(L, CAP, fn) : '—');
        }
      P(`| 鍛造台 Lv${lv} 那一分 | ${c.join(' | ')} |`);
    }
    P('');
    /* 打造延後：到第 N 次打造的時間差 */
    P(`打造延後（到第 N 次打造，實驗−對照，分；正＝實驗組晚）s${sec}：\n`);
    P('| N | 對照 P50／P90（時） | 實驗 P50／P90（時） | 逐種子差 P50／P90（分） |');
    P('|---|---|---|---|');
    for (const N of [30, 60, 120, 240, 480, 960, 1500]) {
      const tc = SEEDS.map(sd => {
          const r = load(pay, 'ctrl', 'b', sec, sd).rows.find(r => r.craftN >= N);
          return r ? r.min : Infinity;
        }),
        te = SEEDS.map(sd => {
          const r = load(pay, 'exp', 'b', sec, sd).rows.find(r => r.craftN >= N);
          return r ? r.min : Infinity;
        }),
        d = tc.map((c, i) => te[i] - c).filter(isFinite);
      P(`| ${N} | ${PP(tc, CAP)} | ${PP(te, CAP)} | ${PP(d, CAP, fm)} |`);
    }
    P('');
  }
  P('#### 2d 累計靈魂花費（分設施，P50；最後一列＝第 60 小時）與 85,900 是提早還是額外\n');
  for (const sec of SECS) {
    P(`s${sec}（P50，靈魂）：\n`);
    P('| 小時 | 組 | 鍛造台 | 瞭望台 | 斥候營 | 民房 | 長老屋 | 倉房 | 合計 |');
    P('|---|---|---|---|---|---|---|---|---|');
    for (const h of [...HRS, 60])
      for (const g of ['ctrl', 'exp']) {
        const L = SEEDS.map(sd => rowAt(load(pay, g, 'b', sec, sd), h * 60).spend);
        const c = ['forge', 'watch', 'scout', 'house', 'altar', 'store'].map(b => fn(pct(L.map(s => s[b]), 0.5)));
        const tot = fn(pct(L.map(s => ['forge', 'watch', 'scout', 'house', 'altar', 'store'].reduce((a, b) => a + s[b], 0)), 0.5));
        P(`| ${h} | ${g === 'ctrl' ? '對照' : '實驗'} | ${c.join(' | ')} | ${tot} |`);
      }
    P('');
    /* 額外：第 60 小時兩組各設施等級與花費逐種子相減 */
    const ex = SEEDS.map(sd => {
      const c = load(pay, 'ctrl', 'b', sec, sd),
        e = load(pay, 'exp', 'b', sec, sd),
        rc = c.rows[c.rows.length - 1],
        re = e.rows[e.rows.length - 1];
      const ds = ['forge', 'watch', 'scout', 'house', 'altar', 'store'].reduce((a, b) => a + re.spend[b] - rc.spend[b], 0);
      return { ds, camp: rc.camp + ' vs ' + re.camp };
    });
    P(`第 60 小時（模擬結束）實驗−對照 的設施累計花費差（逐種子）：${ex.map(x => fn(x.ds)).join('、')}；鍛瞭斥民長倉等級（對照 vs 實驗）：${ex.map(x => x.camp).join('；')}\n`);
    /* 鍛造台 Lv1～16 提早多少（逐級逐種子差，分） */
    const fd = [];
    for (let lv = 1; lv <= 16; lv++) {
      const d = SEEDS.map(sd => t(load(pay, 'exp', 'b', sec, sd), 'forge' + lv) - t(load(pay, 'ctrl', 'b', sec, sd), 'forge' + lv)).filter(isFinite);
      fd.push(`Lv${lv} ${PP(d, CAP, fm)}`);
    }
    P(`鍛造台各級 實驗−對照（分，P50／P90，負＝實驗組早）：${fd.join('；')}\n`);
    /* 其他升級延後：除了鍛造台 1～16，所有兩組都買到的級，逐種子差 */
    const oth = [];
    for (const b of ['watch', 'scout', 'house', 'altar', 'store'])
      for (let lv = 1; lv <= 26; lv++)
        for (const sd of SEEDS) {
          const a = t(load(pay, 'ctrl', 'b', sec, sd), b + lv),
            e = t(load(pay, 'exp', 'b', sec, sd), b + lv);
          if (isFinite(a) && isFinite(e)) oth.push({ b, lv, d: e - a, a, sd });
        }
    const bef = SEEDS.map(sd => {
      const e16 = t(load(pay, 'exp', 'b', sec, sd), 'forge16');
      return e16;
    });
    const o2 = oth;
    P(`其他設施（瞭斥民長倉）兩組都有買到的每一級×每個種子，實驗−對照（分）：全部 ${o2.length} 筆 P50／P90＝${PP(o2.map(x => x.d), CAP, fm)}；只算對照組在「實驗組鍛造台 Lv16」之前就買到的那些級（同一個種子）：${PP(o2.filter(x => x.a <= bef[SEEDS.indexOf(x.sd)]).map(x => x.d), CAP, fm)}\n`);
  }
}

/* ---------- 3. 輔助 II ---------- */
P('## §3 輔助 II：鍛造台 Lv20 之後 13 種全解鎖（195,000 靈魂）要多久\n');
P('a＝II 優先；b＝II 排在其他升級之後（替最便宜的下一級設施存錢，多 15,000 才買）；c（補充）＝同一輪設施先買、剩下的就買 II。時間＝從鍛造台 Lv20 到第 13 種（小時）；收入＝鍛造台 Lv20 之後 60 分鐘的靈魂收入（每小時）。\n');
P('| 組 | 一輪 | 政策 | 鍛造台 Lv20（時） | 到 13 種全開（時） | 第 1 種（Lv20 後幾小時） | 收入／時 |');
P('|---|---|---|---|---|---|---|');
for (const [pay, pn] of PAYS)
  for (const sec of SECS)
    for (const g of ['ctrl', 'exp'])
      for (const sup of ['a', 'b', 'c']) {
        const L = SEEDS.map(sd => load(pay, g, sup, sec, sd));
        const t20 = L.map(j => t(j, 'forge20')),
          d13 = L.map(j => t(j, 'sup213') - t(j, 'forge20')),
          d1 = L.map(j => t(j, 'sup21') - t(j, 'forge20')),
          inc = L.map(j => {
            const x = t(j, 'forge20');
            if (!isFinite(x)) return NaN;
            const m = Math.ceil(x),
              a = rowAt(j, m),
              b = rowAt(j, m + 60);
            return b.min > a.min ? ((b.soulIn - a.soulIn) * 60) / (b.min - a.min) : NaN;
          }).filter(x => !isNaN(x));
        P(`| ${pn} ${g === 'ctrl' ? '對照' : '實驗'} | s${sec} | ${sup} | ${PP(t20, CAP)} | ${PP(d13.map(x => (isNaN(x) ? Infinity : x)), CAP)} | ${PP(d1.map(x => (isNaN(x) ? Infinity : x)), CAP)} | ${PP(inc, CAP, fn)} |`);
      }
P('');

/* ---------- 4. 沒人走、卡住 ---------- */
P('## §4 沒人走或卡住的路線\n');
for (const [pay, pn] of PAYS)
  for (const sec of SECS)
    for (const g of ['ctrl', 'exp']) {
      const L = SEEDS.map(sd => load(pay, g, 'b', sec, sd));
      /* 上限內沒買到的級 */
      const nb = {};
      for (const j of L) {
        const last = j.rows[j.rows.length - 1].camp.split('/').map(Number),
          B = ['forge', 'watch', 'scout', 'house', 'altar', 'store'];
        B.forEach((b, i) => {
          for (let lv = last[i] + 1; lv <= { forge: 20, watch: 26, scout: 4, house: 10, altar: 11, store: 5 }[b]; lv++) nb[NM[b] + ' Lv' + lv] = (nb[NM[b] + ' Lv' + lv] || 0) + 1;
        });
      }
      /* 60 分鐘以上沒有升級（設施＋II）：區間、長度、那段靈魂從多少漲到多少 */
      const gaps = [];
      for (const j of L) {
        const T = [0, ...j.ev.map(e => e.t / 60), j.rows.length].sort((a, b) => a - b);
        for (let i = 1; i < T.length; i++)
          if (T[i] - T[i - 1] >= 60) {
            const a = rowAt(j, Math.max(1, Math.ceil(T[i - 1]))),
              b = rowAt(j, Math.floor(T[i]));
            let wm = 0;
            for (let m = Math.ceil(T[i - 1]) + 1; m <= Math.floor(T[i]); m++) if (rowAt(j, m).wall) wm++;
            gaps.push({ sd: j.cfg.SEED, a: T[i - 1], b: T[i], len: T[i] - T[i - 1], s0: a.soul, s1: b.soul, wall: b.wall, wm });
          }
      }
      const byS = SEEDS.map(sd => gaps.filter(x => x.sd === sd));
      const tot = byS.map(G => G.reduce((a, x) => a + x.len, 0)),
        mx = byS.map(G => Math.max(0, ...G.map(x => x.len)));
      P(`### ${pn}・s${sec}・${g === 'ctrl' ? '對照' : '實驗'}\n`);
      P(`- 上限內一直沒買的級（幾個種子沒買）：${Object.entries(nb).map(([k, v]) => `${k}（${v}/10）`).join('、') || '沒有'}`);
      P(`- 連續 ≥60 分鐘沒有任何設施／II 升級：每個種子的段數 ${byS.map(G => G.length).join('、')}；總長 P50／P90＝${PP(tot, CAP, fm)} 分；最長一段 P50／P90＝${PP(mx, CAP, fm)} 分`);
      const wmS = byS.map(G => G.reduce((a, x) => a + x.wm, 0));
      P(`- 其中「靈魂夠買某座設施的下一級、但缺材料／木」（＝靈魂堆著沒地方花）的分鐘數：每個種子合計 P50／P90＝${PP(wmS, CAP, fm)} 分；其餘是在替下一件（多半 10 萬以上）存靈魂`);
      const big = gaps.sort((a, b) => b.len - a.len).slice(0, 5);
      P(`- 最長的 5 段（種子：起～迄分，靈魂 起→迄，結束前一分「靈魂夠但缺材料」）：${big.map(x => `${x.sd}：${Math.round(x.a)}～${Math.round(x.b)}（${fn(x.s0)}→${fn(x.s1)}${x.wall ? '，' + x.wall : ''}）`).join('；')}`);
      /* 材料牆：「靈魂夠但缺材料」連續 ≥30 分 */
      const walls = {};
      for (const j of L) {
        let cur = {};
        for (const r of j.rows) {
          const now = new Set(r.wall ? r.wall.split(' ') : []);
          for (const w of now) if (!(w in cur)) cur[w] = r.min;
          for (const w in cur)
            if (!now.has(w) || r.min === j.rows.length) {
              const len = r.min - cur[w];
              if (len >= 30) (walls[w] = walls[w] || []).push({ sd: j.cfg.SEED, a: cur[w], len });
              delete cur[w];
            }
        }
      }
      P(`- 材料牆（設施下一級靈魂夠、缺材料，連續 ≥30 分；設施:缺的鍵 → 幾個種子、開始分 P50、長度 P50／P90 分）：${Object.entries(walls)
        .sort((a, b) => pct(a[1].map(x => x.a), 0.5) - pct(b[1].map(x => x.a), 0.5))
        .map(([k, v]) => `${k.replace(/^(\w+)/, m => NM[m])} → ${new Set(v.map(x => x.sd)).size}/10、${fm(pct(v.map(x => x.a), 0.5))}、${PP(v.map(x => x.len), CAP, fm)}`)
        .join('；') || '沒有'}`);
      if (g === 'exp') {
        const o = L.map(j => ({ tree: t(j, 'altar4'), s4: t(j, 'altar6'), s5: t(j, 'forge16'), s3: t(j, 'altar3') }));
        P(`- 實驗組：第 5 格（鍛造台 Lv16）早於第 4 格（長老屋 Lv6）的種子 ${o.filter(x => x.s5 < x.s4).length}/10；早於天賦樹（長老屋 Lv4）${o.filter(x => x.s5 < x.tree).length}/10；早於第 3 格 ${o.filter(x => x.s5 < x.s3).length}/10；第 4 格−第 5 格（分）P50／P90＝${PP(o.map(x => x.s4 - x.s5), CAP, fm)}`);
      }
      P('');
    }

/* ---------- 9. 一致性 ---------- */
P('## §9 檢查：鍛造台 Lv20 以前三種 SUP 逐分鐘一樣\n');
let same = 0,
  diff = 0;
for (const pay of ['none', 'any'])
  for (const g of ['ctrl', 'exp'])
    for (const sec of SECS)
      for (const sd of SEEDS) {
        const b = load(pay, g, 'b', sec, sd),
          t20 = isFinite(t(b, 'forge20')) ? Math.floor(t(b, 'forge20')) : b.rows.length;
        for (const sup of ['a', 'c']) {
          const x = load(pay, g, sup, sec, sd);
          const ok = b.rows.slice(0, t20).every((r, i) => x.rows[i] && x.rows[i].soul === r.soul && x.rows[i].camp === r.camp && x.rows[i].craftN === r.craftN);
          ok ? same++ : diff++;
        }
      }
P(`相同 ${same} 組、不同 ${diff} 組（比靈魂存量、設施等級、打造次數）。\n`);
console.log(out.join('\n'));
