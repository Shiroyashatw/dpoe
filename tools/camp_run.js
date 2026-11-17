const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path');
/* dungeonPOE · 新存檔實掛＋上癮度指標表（M1-21、M2-01；門檻照 docs/production/milestones.md 的 A1–A10）。
   M2-01 起用 Playwright 的假時鐘跑「遊戲內時間」（約 5 倍速、不受機器忙不忙影響）；開兩個新存檔：
   「玩家」：AI 自動打，一個會按的玩家每 5 秒看一次營地：解鎖表夠了就升（鍛造台、民房、瞭望台、祭壇、斥候營、倉房）、產生器用剩下的木買
   （一次一級、最便宜的先，留下一件解鎖表要的木與材料）、瞭望台開了新地點就去那裡刷、一分鐘打造一件（部位輪流）並在 ▲ 時換上、其他分解；
   「無人」：只有 AI 自動打，量 A5 掛機停住。每分鐘印一列；最後照每個量測窗（30 分鐘、跑滿的分鐘數）各寫一張 A1–A10 表（Markdown＋JSON）。
   用法：先開本機伺服器，node tools/camp_run.js [網址] [分鐘，預設 120] [寬 390] [高 844] [輸出資料夾，預設 evidence/m2-01]；只量不改。
   node tools/camp_run.js --self 只跑指標算法的自我檢查。環境變數 PW_CHROME 指定瀏覽器 */
const URL = process.argv[2] || 'http://localhost:8000/',
  MIN = +process.argv[3] || 120,
  VW = +process.argv[4] || 390,
  VH = +process.argv[5] || 844,
  OUT = process.argv[6] || path.join(__dirname, '..', 'evidence', 'm2-01'),
  MOB = VW < 900,
  STALL = 30; /* 這麼多秒畫面上什麼都沒變（場景、輪數、首領進度、活著的怪、靈魂，怪的總生命也沒往下掉）＝AI 卡住，整段算掛機停住 */

/* ---------- 指標算法（純函式，--self 檢查） ---------- */
/* 時間點 → 相鄰間隔（含 0 到第一個、最後一個到窗尾） */
const gaps = (T, a, b) => {
  const L = [a, ...[...new Set(T)].filter(t => t >= a && t <= b).sort((x, y) => x - y), b];
  return L.slice(1).map((t, i) => [L[i], t - L[i]]);
};
const maxGap = (T, a, b) => gaps(T, a, b).reduce((m, g) => (g[1] > m[1] ? g : m), [a, 0]);
const p95 = L => (L.length ? [...L].sort((x, y) => x - y)[Math.ceil(L.length * 0.95) - 1] : 0);
const mmss = s => ((s = Math.round(s)), `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
function selfCheck() {
  const a = require('assert');
  a.deepStrictEqual(gaps([10, 30], 0, 60), [
    [0, 10],
    [10, 20],
    [30, 30]
  ]);
  a.deepStrictEqual(maxGap([10, 30, 30], 0, 60), [30, 30]);
  a.deepStrictEqual(maxGap([], 0, 900), [0, 900]);
  a.deepStrictEqual(maxGap([5, 1000], 0, 900), [5, 895]);
  a.strictEqual(p95([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 100]), 19);
  a.strictEqual(mmss(125), '2:05');
  const t = table(
    { w: 30, size: '390×844', ver: 't', sha: 't', ...fake() },
    { a1: { hit: 3, map: 1 }, a10: { s: null, why: '測試' } }
  );
  a.ok(/\| A1 \|/.test(t) && /\| A10 \|/.test(t) && t.split('\n').filter(l => /^\| A\d+ \|/.test(l)).length === 10);
  console.log('camp_run 自我檢查 ✅');
}
const fake = () => ({
  need: '',
  up: [],
  ev: [],
  bad: [],
  drop: [],
  stall: [],
  pause: 0,
  flag: [],
  rows: [],
  deaths10: 0,
  un: {},
  camp: {}
});

/* ---------- 一個量測窗的 A1–A10 ---------- */
function judge(R, X) {
  const W = R.w * 60,
    ok = b => (b ? '✅ 達標' : '❌ 未達標'),
    small = R.up.filter(u => u[0] <= W && (u[1] === '產生器' || u[1] === '換上')).map(u => u[0]),
    news = R.ev.filter(e => e[0] <= W && e[2]).map(e => e[0]),
    g15 = maxGap(small, 0, Math.min(900, W)),
    gLate = W > 900 ? maxGap(small, 900, W) : null,
    stuck = maxGap(news, 0, W),
    n30 = news.filter(t => t <= 1800).length,
    n60 = R.w >= 60 ? news.filter(t => t <= 3600).length : null,
    stallS = R.stall.filter(s => s[0] < W).reduce((a, s) => a + Math.min(s[1], W) - s[0], 0) + R.pause,
    bad = R.bad.filter(b => b.t <= W),
    untold = bad.filter(b => !b.told),
    drops = R.drop.filter(d => d[0] <= W),
    open = Object.entries(R.un).filter(([, t]) => t <= W),
    dg = open.length
      ? gaps(
          drops.map(d => d[0]),
          Math.min(...open.map(o => o[1])),
          W
        ).map(g => g[1] / 60)
      : [],
    at = s => R.rows[Math.max(0, Math.min(R.rows.length - 1, Math.floor(s / 60)))] || {};
  const A = [
    [
      'A1',
      '新存檔開刷',
      '5 秒內，不用點任何東西',
      X.a1.hit == null
        ? '沒開刷'
        : `跳過開場後 ${X.a1.hit.toFixed(1)} 秒打到第一隻怪（進場地 ${X.a1.map.toFixed(1)} 秒）、點擊 0 次`,
      ok(X.a1.hit != null && X.a1.hit <= 5)
    ],
    [
      'A2',
      '卡關（最長沒有新東西）',
      '≤ 5 分鐘',
      `${mmss(stuck[1])}（${mmss(stuck[0])}～${mmss(stuck[0] + stuck[1])}，在 ${at(stuck[0]).node || '—'}，等 ${at(stuck[0]).next || '—'}）`,
      ok(stuck[1] <= 300)
    ],
    [
      'A3',
      '新東西（設施升級、產生器里程碑）',
      '30 分鐘 ≥ 10；第一小時 ≥ 18',
      `30 分鐘 ${n30} 個；第一小時 ${n60 == null ? '—（只跑 ' + R.w + ' 分）' : n60 + ' 個'}`,
      ok(n30 >= 10 && (n60 == null || n60 >= 18)) + (n60 == null ? '（只判 30 分鐘）' : '')
    ],
    [
      'A4',
      '小的變強（產生器 +1 級、打造換上）間隔',
      '前 15 分鐘每 30–60 秒；之後每 1–2 分鐘',
      `前 15 分鐘 ${small.filter(t => t <= 900).length} 次、最大間隔 ${Math.round(g15[1])} 秒（${mmss(g15[0])} 起）` +
        (gLate
          ? `；之後 ${small.filter(t => t > 900).length} 次、最大間隔 ${Math.round(gLate[1])} 秒（${mmss(gLate[0])} 起）`
          : ''),
      ok(g15[1] <= 60 && (!gLate || gLate[1] <= 120))
    ],
    [
      'A5',
      '掛機停住（無人操作）',
      '0 秒（2 小時）',
      `${Math.round(stallS)} 秒（${R.w} 分鐘；畫面 ${STALL} 秒以上沒變 ${R.stall.filter(s => s[0] < W).length} 段、世界暫停 ${Math.round(R.pause)} 秒）`,
      ok(stallS === 0) + (R.w < 120 ? '（只跑 ' + R.w + ' 分）' : '')
    ],
    [
      'A6',
      '前 10 分鐘倒下',
      '≤ 1 次',
      R.deaths10 == null ? '—' : `${R.deaths10} 次`,
      ok(R.deaths10 != null && R.deaths10 <= 1)
    ],
    [
      'A7',
      '技能失效沒先講',
      '0 次',
      `${untold.length} 次（失效 ${bad.length} 次）${untold.length ? '：' + untold.map(b => `${mmss(b.t)} ${b.n}（${b.why}）`).join('、') : ''}`,
      ok(!untold.length)
    ],
    [
      'A8',
      '有感掉落空窗（破裂石、完美石、珠寶、追憶之墨）',
      '100 小時內 P95 ≤ 30 分、最長 ≤ 45 分',
      open.length
        ? `開放 ${open.map(o => o[0] + ' ' + mmss(o[1])).join('、')}；掉 ${drops.length} 次、最長空窗 ${Math.max(...dg).toFixed(1)} 分、P95 ${p95(dg).toFixed(1)} 分（${R.w} 分鐘內，不是 100 小時）`
        : `${R.w} 分鐘內都還沒開放（鍛造台 Lv${at(W).camp ? at(W).camp.split('/')[0] : '?'}；${R.need}）`,
      open.length ? ok(Math.max(...dg) <= 45 && p95(dg) <= 30) + '（窗太短，只供參考）' : '— 未開放（量不到）'
    ],
    ['A9', '追逐物品最長空窗', '≤ 保底上限（草案約 3 小時）', 'main 上還沒有追逐物品', '— 尚未實作（M2-18）'],
    [
      'A10',
      '回訪續刷',
      '重開網頁離線摘要後 5 秒內回到原地點',
      X.a10.s == null
        ? `沒回到原地點：${X.a10.why}`
        : `離開 2 小時、重開 ${X.a10.s.toFixed(1)} 秒回到 ${X.a10.node}${X.a10.why ? '；' + X.a10.why : ''}`,
      ok(X.a10.s != null && X.a10.s <= 5)
    ]
  ];
  return A;
}
function table(R, X) {
  const A = judge(R, X),
    W = R.w * 60,
    flags = R.flag.filter(f => f.t <= W);
  return [
    `### A1–A10 指標表（${R.size}，${R.w} 分鐘，遊戲內時間）`,
    '',
    `版本 ${R.ver}・commit ${R.sha}・\`node tools/camp_run.js <網址> ${R.min || R.w} ${R.size.replace('×', ' ')}\`・異常場次：${flags.length ? '**有**（見下）' : '無'}`,
    '',
    '| # | 指標 | 門檻 | 量測值 | 是否達標 |',
    '| --- | --- | --- | --- | --- |',
    ...A.map(r => `| ${r.join(' | ')} |`),
    '',
    flags.length
      ? `**AI 異常（不當成正常結果）**：\n${flags
          .slice(0, 12)
          .map(f => `- ${mmss(f.t)}［${f.who}］${f.why}：${f.dbg}`)
          .join('\n')}${flags.length > 12 ? `\n- …另外 ${flags.length - 12} 筆在 JSON` : ''}`
      : 'AI 異常：無（沒有畫面 30 秒不動、0 靈魂／分、10 分鐘沒打完一輪）',
    '',
    `<details><summary>資源曲線（每 5 分鐘）</summary>\n\n| 分 | 地點 | 角色 | 靈魂（/分） | 木 | 鐵 | 產生器（級(人)） | 鍛瞭斥民祭倉 | 輪／倒下 |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${R.rows
      .filter(r => r.min <= R.w && (r.min % 5 === 0 || r.min === 1))
      .map(
        r =>
          `| ${r.min} | ${r.node} | Lv${r.lv} | ${r.soul}（${r.spm}） | ${r.wood} | ${r.iron} | ${r.gen} | ${r.camp} | ${r.rounds}／${r.deaths} |`
      )
      .join('\n')}\n\n</details>`,
    '',
    `<details><summary>前 30 分鐘的決策紀錄（${R.ev.filter(e => e[0] <= Math.min(W, 1800)).length} 筆）</summary>\n\n${R.ev
      .filter(e => e[0] <= Math.min(W, 1800))
      .map(e => `- ${mmss(e[0])} ${e[1]}`)
      .join('\n')}\n\n</details>`,
    ''
  ].join('\n');
}

/* ---------- 頁面裡的量測：每 250 毫秒（遊戲時間）看一次 ---------- */
function MON([who, STALL]) {
  const __M = (window.__M = {
      who,
      t0: Date.now(),
      up: [],
      ev: [],
      say: [],
      warn: [],
      bad: [],
      drop: [],
      stall: [],
      pause: 0,
      flag: [],
      un: {},
      pred: [],
      /* 有感掉落要哪一座設施幾級才開（A8 的說明） */
      need: Object.entries(CAMP)
        .flatMap(([b, L]) =>
          (L || []).map((r, i) =>
            r.un && r.un.some(u => /^(cur:frac|cur:perf|cur:ink|jewel)$/.test(u))
              ? `${r.d}要${CAMPN[b]} Lv${i + 1}`
              : ''
          )
        )
        .filter(Boolean)
        .join('、')
    }),
    sec = () => (Date.now() - __M.t0) / 1000,
    w0 = hudWarn,
    sig = () => [
      GEN_K.map(k => genOf(k).lv).join(),
      ['forge', 'watch', 'scout', 'house', 'altar', 'store'].map(b => S.camp[b]).join()
    ],
    live = () =>
      `${G.scene}|${G.state}|${SES ? SES.rounds : 0}|${Math.round(G.prog)}|${G.mobs.filter(m => m.hp > 0).length}|${Math.floor(SES ? SES.soul : 0)}`,
    /* 怪的總生命只算往下掉的（回血不算進展） */
    hpSum = () => G.mobs.reduce((a, m) => a + Math.max(0, m.hp), 0),
    cnt = () => ({
      破裂石: MAT().frac || 0,
      完美石: MAT().perf || 0,
      追憶之墨: MAT().ink || 0,
      珠寶: (S.jewels || []).length
    });
  __M.dbg = () =>
    `${G.nodeN || G.scene}・${G.state}・怪 ${G.mobs.filter(m => m.hp > 0).length}・首領進度 ${Math.round(G.prog)}／${G.need}・王 ${G.bossOut ? 1 : 0}・${Math.round(soulRate())} 靈魂／分`;
  hudWarn = t => (
    /^\S+ Lv\d+：/.test(t) && __M.say.push(`${Math.round(sec())} ${t}`), /失效/.test(t) && __M.warn.push(sec()), w0(t)
  );
  let [g0, c0] = sig(),
    lv = S.lv,
    L = live(),
    Lt = 0,
    H = hpSum(),
    C = cnt(),
    bad = S.skills.map((_, i) => !!slotBad(i));
  setInterval(() => {
    const t = sec(),
      [g, c] = sig();
    if (g !== g0) __M.up.push([t, '產生器']);
    if (c !== c0) __M.up.push([t, '設施']);
    (g0 = g), (c0 = c);
    if (S.lv > lv) __M.up.push([t, '角色']), (lv = S.lv);
    if (!__M.r1 && SES && SES.rounds > 0) __M.r1 = t;
    /* A5：世界暫停（倒下等 AI 重來不算）；畫面 STALL 秒沒變＝卡住 */
    if (worldPaused() && G.state !== 'dead') __M.pause += 0.25;
    const l = live(),
      h = hpSum();
    if (l !== L || h < H - 1) {
      if (t - Lt >= STALL) __M.stall.push([Lt, t]);
      (L = l), (Lt = t), (H = h);
    } else if (t - Lt >= STALL && __M.fl !== Lt) {
      __M.fl = Lt;
      __M.flag.push({ t: Lt, who, why: `畫面 ${STALL} 秒沒變`, dbg: __M.dbg() });
    }
    /* A7：哪一招剛失效、有沒有先講（換裝前 eqBreaks 預告過，或 2 秒內 HUD 講了「失效」） */
    const b = S.skills.map((_, i) => !!slotBad(i));
    b.forEach((x, i) => {
      if (!x || bad[i]) return;
      const told = __M.pred.some(p => p.i === i && t - p.t < 5) || __M.warn.some(w => Math.abs(w - t) < 2);
      __M.bad.push({ t, n: SKILLS[S.skills[i].k].n, why: slotBad(i), told });
    });
    bad = b;
    /* A8：有感掉落與開放時間 */
    const c2 = cnt();
    for (const k in c2) if (c2[k] > C[k]) __M.drop.push([t, k]);
    C = c2;
    for (const [k, u] of [
      ['破裂石', 'cur:frac'],
      ['追憶之墨', 'cur:ink'],
      ['珠寶', 'jewel'],
      ['完美石', 'cur:perf']
    ])
      if (__M.un[k] == null && campCan(u)) __M.un[k] = t;
  }, 250);
}
/* 頁面裡的每分鐘一列 */
function ROW(min) {
  const r = {
    min,
    node: G.nodeN,
    lv: S.lv,
    soul: Math.round(S.mat.soul),
    wood: matN('wood'),
    iron: Object.entries(S.mat.mats)
      .filter(([k]) => k.startsWith('iron'))
      .map(([k, n]) => matName(...matOf(k)) + ' ' + n)
      .join(' '),
    gen: GEN_K.map(k => `${GEN[k].n[0]}${genOf(k).lv}(${genOf(k).w || 0})`).join(' '),
    camp: ['forge', 'watch', 'scout', 'house', 'altar', 'store'].map(b => S.camp[b]).join('/'),
    rounds: SES ? SES.rounds : 0,
    deaths: SES ? SES.deaths : 0,
    spm: Math.round(soulRate()),
    next: (() => {
      const n = ['forge', 'house', 'watch', 'altar', 'scout', 'store']
        .map(b => [b, campNext(b)])
        .filter(x => x[1])
        .sort((a, b) => a[1].soul - b[1].soul)[0];
      return n ? `${CAMPN[n[0]]} Lv${n[1].lv}（靈魂 ${Math.round(S.mat.soul)}／${n[1].soul}）` : '全滿';
    })(),
    dbg: __M.dbg()
  };
  const t = min * 60;
  /* AI 卡住的另外兩種（第一種是 MON 的畫面不動）：0 靈魂／分（開刷 5 分鐘後）、10 分鐘沒打完一輪 */
  if (min >= 5 && r.spm === 0) __M.flag.push({ t, who: __M.who, why: '0 靈魂／分', dbg: r.dbg });
  __M.rh = __M.rh || [];
  __M.rh.push(r.rounds);
  if (min % 10 === 0 && (__M.rh[min - 11] || 0) === r.rounds)
    __M.flag.push({ t, who: __M.who, why: '10 分鐘沒打完一輪', dbg: r.dbg });
  return r;
}
/* 會按的玩家（每 5 秒）；決策記進 __M.ev：[秒, 文字, 是不是新東西] */
function PLAY() {
  const ORDER = ['forge', 'house', 'watch', 'altar', 'scout', 'store'],
    t = (Date.now() - __M.t0) / 1000;
  for (const b of ORDER)
    if (!campUp(b)) {
      __M.ev.push([t, `${CAMPN[b]} Lv${S.camp[b]}：${CAMP[b][S.camp[b] - 1].d}`, 1]);
      if (b === 'watch') runNode(TRUNK_K[wFront(S)]), __M.ev.push([t, `去新地點 ${G.nodeN}`, 0]);
    }
  const nx = ORDER.map(b => campNext(b))
      .filter(Boolean)
      .sort((a, b) => a.soul - b.soul)[0],
    rs = nx && S.mat.soul >= nx.soul ? nx : { wood: 0, mats: {} },
    bought = {};
  for (let g = 0; g < 30; g++) {
    const ok = GEN_K.filter(k => {
      if (!genOn(k) || genAfford(k) < 1) return false;
      const c = genCost(k);
      /* 林場永遠買（它自己會把木賺回來）；其他產生器留下一件解鎖表要的木 */
      if (k !== 'wood' && matN('wood') - c.wood < (rs.wood || 0)) return false;
      return Object.keys(c.mats).every(key => matN(...matOf(key)) - c.mats[key] >= ((rs.mats || {})[key] || 0));
    });
    if (!ok.length) break;
    const k = ok.reduce((a, b) => (genCost(a).wood <= genCost(b).wood ? a : b)),
      m0 = genMs(genOf(k).lv);
    genUp(k);
    bought[GEN[k].n] = (bought[GEN[k].n] || 0) + 1;
    const m1 = genMs(genOf(k).lv);
    if (m1.m > m0.m || m1.slots > m0.slots || m1.tu > m0.tu) __M.ev.push([t, `${GEN[k].n} Lv${genOf(k).lv} 里程碑`, 1]);
  }
  const bs = Object.entries(bought);
  if (bs.length) __M.ev.push([t, '升產生器 ' + bs.map(([n, v]) => `${n} +${v}`).join('、'), 0]);
  /* 打造：一分鐘一件、部位輪流，留下一件升級要的鐵與升礦場的鐵；▲ 就換上（先用 eqBreaks 預告會失效的招），不然分解 */
  const K = ['weapon', 'chest', 'helm', 'gloves', 'boots', 'belt', 'ring', 'amulet'];
  __M.cr = __M.cr || [0, 0, -1e9];
  const kind = K[__M.cr[0] % K.length],
    T = genTier('iron'),
    keep = ((rs.mats || {})['iron:' + T] || 0) + (genCost('iron').mats['iron:' + T] || 0);
  if (t - __M.cr[2] < 60 || matN('iron', T) - 8 < keep) return;
  __M.cr[2] = t;
  const r = craftDo(kind, {
    T,
    n: 1,
    sys: kind === 'weapon' || ['belt', 'ring', 'amulet'].includes(kind) ? '' : 'armor'
  });
  if (r.why) return;
  __M.cr[0]++;
  for (const it of r.items) {
    if (it.salv) continue;
    const slot = EQS.find(e => eqTakes(e, kindOf(it)));
    if (itemUp(it) && slot) {
      for (const b of eqBreaks(it, slot.k)) __M.pred.push({ i: b.i, t });
      equipTo(it, slot.k), __M.cr[1]++, __M.ev.push([t, `打造 ${itemName(it)} → 換上`, 0]), __M.up.push([t, '換上']);
    } else __M.ev.push([t, `打造 ${itemName(it)} → 分解`, 0]), takeOut('inv', it), salvageDo(it);
  }
  ST = stats();
}

/* ---------- 跑 ---------- */
async function boot(b, p) {
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, hasTouch: MOB, isMobile: MOB });
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  const pg = await ctx.newPage(),
    errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.clock.install();
  await pg.goto(`${URL}?p=${p}&${Date.now()}`);
  await pg.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof treeInit === 'function');
  /* 假時鐘停住，之後只靠 runFor 往前（不停的話真實時間也會一直流進遊戲裡） */
  await pg.clock.pauseAt(await pg.evaluate(() => Date.now() + 1000));
  /* A1：真的新存檔、照玩家的路跳過開場（Esc），量到進場地、打到第一隻怪的遊戲秒數；不點任何東西 */
  await pg.keyboard.press('Escape');
  const a1 = { map: null, hit: null };
  for (let s = 0; s < 30 && a1.hit == null; s += 0.1) {
    await pg.clock.runFor(100);
    const st = await pg.evaluate(() => [G.scene === 'map' && G.state === 'play', G.mobs.some(m => m.hp < m.mhp)]);
    if (st[0] && a1.map == null) a1.map = s + 0.1;
    if (st[1]) a1.hit = s + 0.1;
  }
  await pg.evaluate(() => (S.story.tips = 0));
  await pg.evaluate(MON, [p === 77 ? '玩家' : '無人', STALL]);
  return { ctx, pg, errs, a1 };
}
/* A10：存檔、關掉，2 小時後（假時鐘往後撥）重開，量到回到原地點、世界沒暫停的秒數（從開始載入頁面算，含載入的真實時間） */
async function revisit(V) {
  const s = await V.pg.evaluate(() => (save(), { k: S.world.cur, n: G.nodeN, now: Date.now() }));
  await V.pg.close();
  const pg = await V.ctx.newPage();
  const T0 = s.now + 2 * 3600e3;
  await pg.clock.install({ time: T0 });
  await pg.goto(`${URL}?p=77&${Date.now()}`);
  for (let i = 0; i < 120; i++) {
    await pg.clock.runFor(250);
    const r = await pg.evaluate(k => {
      if (typeof G !== 'object' || !G.scene) return null;
      return {
        now: Date.now(),
        at: G.scene === 'map' && G.node === k && G.state === 'play',
        paused: worldPaused(),
        scene: G.scene,
        sum: !!PANEL.ident
      };
    }, s.k);
    const t = r ? (r.now - T0) / 1000 : 0;
    if (r && r.at && !r.paused) return { s: t, node: s.n, why: r.sum ? '離線摘要開著、戰鬥照跑' : '沒看到離線摘要' };
    if (t >= 10 && r)
      return { s: null, node: s.n, why: `10 秒後在 ${r.scene}${r.paused ? '、世界暫停（離線摘要或確認卡）' : ''}` };
  }
  return { s: null, node: s.n, why: '30 秒內頁面沒載好' };
}

if (process.argv[2] === '--self') selfCheck();
else
  (async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
    const [P, N] = await Promise.all([boot(b, 77), boot(b, 78)]);
    const rows = [],
      nrows = [];
    /* 頁面卡住（例如程式無窮迴圈）：一分鐘的遊戲時間 10 分鐘真實時間還跑不完就停，不當成正常結果 */
    const dog = (pr, min) =>
      Promise.race([
        pr,
        new Promise((_, no) =>
          setTimeout(() => no(new Error(`第 ${min} 分：頁面 10 分鐘沒回應（卡住），這一場作廢`)), 600e3).unref()
        )
      ]);
    const oneMin = async min => {
      for (let s = 0; s < 12; s++) {
        await Promise.all([P.pg.clock.runFor(5000), N.pg.clock.runFor(5000)]);
        await P.pg.evaluate(PLAY);
      }
      const [r, n] = await Promise.all([P.pg.evaluate(ROW, min), N.pg.evaluate(ROW, min)]),
        ev = await P.pg.evaluate(m => __M.ev.filter(e => e[0] > (m - 1) * 60 && e[2]).map(e => e[1]), min);
      rows.push(r), nrows.push(n);
      console.log(
        `${String(min).padStart(3)} 分 | ${r.node} Lv${r.lv} | 靈魂 ${r.soul}（${r.spm}/分）| 木 ${r.wood} | ${r.iron} | ${r.gen} | 鍛瞭斥民祭倉 ${r.camp} | 輪 ${r.rounds} 死 ${r.deaths} | ${r.dbg} ‖ 無人：${n.dbg} 輪 ${n.rounds}${ev.length ? '\n      ' + ev.join('\n      ') : ''}`
      );
      if (min === 30 || min === MIN)
        await P.pg.screenshot({ path: path.join(OUT, `${VW}x${VH}_${MIN}m_第${min}分.png`) }).catch(() => {});
    };
    for (let min = 1; min <= MIN; min++) await dog(oneMin(min), min);
    const [mp, mn] = await Promise.all([P.pg.evaluate(() => __M), N.pg.evaluate(() => __M)]);
    const a10 = await revisit(P);
    const sha = require('child_process').execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim(),
      ver = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8').match(/VER = '([^']+)'/)[1],
      size = `${VW}×${VH}`,
      endT = MIN * 60,
      /* 停住：沒收尾的那一段算到窗尾 */
      close = m => [
        ...m.stall,
        ...m.flag.filter(f => /秒沒變/.test(f.why) && !m.stall.some(s => s[0] === f.t)).map(f => [f.t, endT])
      ],
      R = {
        size,
        ver,
        sha,
        min: MIN,
        rows,
        up: mp.up,
        ev: mp.ev,
        bad: mp.bad,
        drop: mp.drop,
        un: mp.un,
        need: mp.need,
        /* A5 只看無人那一份；AI 異常兩份都列 */
        stall: close(mn),
        pause: mn.pause,
        flag: [...mp.flag, ...mn.flag].sort((a, b) => a.t - b.t),
        deaths10: (rows[9] || rows[rows.length - 1]).deaths,
        r1: mp.r1,
        say: mp.say
      },
      X = { a1: P.a1, a10 },
      wins = [...new Set([30, MIN].filter(w => w <= MIN))],
      md = wins.map(w => table({ ...R, w }, X)).join('\n'),
      base = path.join(OUT, `${VW}x${VH}_${MIN}m`);
    fs.writeFileSync(base + '.md', md);
    fs.writeFileSync(
      base + '.json',
      JSON.stringify(
        {
          ...R,
          a1: P.a1,
          a1Idle: N.a1,
          a10,
          idleRows: nrows,
          errs: [...P.errs, ...N.errs],
          tables: Object.fromEntries(
            wins.map(w => [w, judge({ ...R, w }, X).map(r => ({ id: r[0], v: r[3], ok: r[4] }))])
          )
        },
        null,
        1
      )
    );
    console.log('\n' + md);
    console.log(
      `首輪完成：${R.r1 ? mmss(R.r1) : '沒有打完'}；頁面錯誤 ${P.errs.length + N.errs.length}；寫到 ${base}.md／.json`
    );
    if (P.errs.length + N.errs.length) console.log([...P.errs, ...N.errs].slice(0, 5).join('\n'));
    await b.close();
  })().catch(e => {
    console.error(e);
    process.exit(1);
  });
