/* num-mat-v12 A：長老屋 Lv9～11 靈魂費用的搜尋（CRAFT=mix＋商會＋每小時額度，跟 C 同一組設定）。
   用法：node search_A.js <模式> …；每組合跑 10 個種子，結果追加到 A_search.jsonl（跑過就讀快取）。
   模式：
     grid <sec> <c9>            —— 固定 c9，c10＝200,000～250,000、c11＝c10～350,000（5,000 一格）全部跑
     c9 <sec> <c10> <c11>       —— 固定 c10、c11，c9＝90,000～150,000（5,000 一格）全部跑
     one <sec> <c9> <c10> <c11> —— 跑一組
   環境變數 QH（給就覆寫額度，跟 sim_v12.js 一樣）、MIN（模擬幾分；搜尋用 5,400＝90 小時，才量得到 Lv11 超過 60 小時多少）。百分位：最近排名法；MIN 分內沒到＝∞。 */
'use strict';
const fs = require('fs'),
  path = require('path'),
  { execFile } = require('child_process');
const D = __dirname,
  TMP = process.env.TMPD || '/tmp/v12A';
fs.mkdirSync(TMP, { recursive: true });
const CAP = process.env.CAP || 'wood:18000,iron:350000,hide:70000,silk:70000',
  QH = process.env.QH || '',
  MIN = process.env.MIN || '3600';
const S10 = [20261115, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const LOG = path.join(D, 'A_search.jsonl');
const cache = {};
if (fs.existsSync(LOG))
  for (const l of fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean)) {
    const o = JSON.parse(l);
    cache[o.key] = o;
  }
const pct = (L, p) => [...L].sort((a, b) => a - b)[Math.ceil(p * L.length) - 1];
const run1 = (sec, sd, alt) =>
  new Promise((res, rej) => {
    const f = path.join(TMP, `${sec}_${sd}_${alt.join('_')}.json`);
    execFile('node', [path.join(D, 'sim_v12.js'), f], { env: { ...process.env, SEC: sec, SEED: sd, CRAFT: 'mix', TRADE: 1, CAP, QH, ALT: alt.join(',') }, maxBuffer: 1e8 }, e => {
      if (e) return rej(e);
      const j = JSON.parse(fs.readFileSync(f));
      fs.unlinkSync(f);
      const first = {};
      for (const e of j.ev) if (!(e.b + e.lv in first)) first[e.b + e.lv] = e.t / 3600;
      res(first);
    });
  });
async function pool(tasks, n = 4) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < tasks.length) {
        const k = i++;
        out[k] = await tasks[k]();
      }
    })
  );
  return out;
}
async function evalAlt(sec, alt) {
  const key = `${CAP}|${QH}|${MIN}|${sec}|${alt.join(',')}`;
  if (cache[key]) return cache[key];
  const F = await pool(S10.map(sd => () => run1(sec, sd, alt)));
  const g = k => F.map(f => (k in f ? f[k] : Infinity));
  const o = { key, sec, alt, CAP, QH, MIN };
  for (const k of ['altar8', 'altar9', 'altar10', 'altar11', 'forge20', 'sup213', 'store5']) {
    const v = g(k);
    o[k] = [pct(v, 0.5), pct(v, 0.9)].map(x => (isFinite(x) ? +x.toFixed(3) : null));
  }
  cache[key] = o;
  fs.appendFileSync(LOG, JSON.stringify(o) + '\n');
  return o;
}
const show = o => console.log(`s${o.sec} ${o.alt.join('/')}  L8 ${o.altar8}  L9 ${o.altar9}  L10 ${o.altar10}  L11 ${o.altar11}  F20 ${o.forge20}  II ${o.sup213}  倉5 ${o.store5}`);
(async () => {
  const [mode, ...a] = process.argv.slice(2),
    n = a.map(Number);
  if (mode === 'grid') {
    for (let c10 = 200000; c10 <= 250000; c10 += 5000) for (let c11 = c10; c11 <= 350000; c11 += 5000) show(await evalAlt(n[0], [n[1], c10, c11]));
  } else if (mode === 'c9') for (let c9 = 90000; c9 <= 150000; c9 += 5000) show(await evalAlt(n[0], [c9, n[1], n[2]]));
  else if (mode === 'one') show(await evalAlt(n[0], [n[1], n[2], n[3]]));
})();
