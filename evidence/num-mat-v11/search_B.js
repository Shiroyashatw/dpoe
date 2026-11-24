/* num-mat-v11 B：長老屋 Lv9～11 靈魂費用的搜尋（CRAFT=mix＋商會，跟 D 同一組設定）。
   用法：node search_B.js <模式> …；每個組合跑 10 個種子 × 指定的一輪秒數，結果追加到 B_search.jsonl（同一組合跑過就讀快取）。
   模式：
     c9 <sec> <a> <b> <步>        —— 只掃 Lv9（Lv10、Lv11 不影響 Lv9 的時間），記 Lv9 P50／P90
     pair <sec> <c9> <c10…>       —— 固定 c9、每個 c10，二分找最大的 c11（步 5,000，≤350,000）使 Lv11 P90 ≤ 60 小時
     one <sec> <c9> <c10> <c11>   —— 跑一組
   百分位：最近排名法；3,600 分內沒到＝∞。 */
'use strict';
const fs = require('fs'),
  path = require('path'),
  { execFile } = require('child_process');
const D = __dirname,
  TMP = process.env.TMPD || '/tmp/v11B';
fs.mkdirSync(TMP, { recursive: true });
const CAP = process.env.CAP || 'wood:18000,iron:350000,hide:70000,silk:70000';
const S10 = [20261115, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const LOG = path.join(D, 'B_search.jsonl');
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
    execFile('node', [path.join(D, 'sim_v11.js'), f], { env: { ...process.env, SEC: sec, SEED: sd, CRAFT: 'mix', TRADE: 1, CAP, ALT: alt.join(',') }, maxBuffer: 1e8 }, e => {
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
  const key = `${CAP}|${sec}|${alt.join(',')}`;
  if (cache[key]) return cache[key];
  const F = await pool(S10.map(sd => () => run1(sec, sd, alt)));
  const g = k => F.map(f => (k in f ? f[k] : Infinity));
  const o = { key, sec, alt, CAP };
  for (const k of ['altar8', 'altar9', 'altar10', 'altar11', 'forge20', 'sup213', 'store5']) {
    const v = g(k);
    o[k] = [pct(v, 0.5), pct(v, 0.9)].map(x => (isFinite(x) ? +x.toFixed(3) : null));
  }
  cache[key] = o;
  fs.appendFileSync(LOG, JSON.stringify(o) + '\n');
  return o;
}
const show = o => console.log(`s${o.sec} ${o.alt.join('/')}  L8 ${o.altar8}  L9 ${o.altar9}  L10 ${o.altar10}  L11 ${o.altar11}  F20 ${o.forge20}  II ${o.sup213}  倉5 ${o.store5}`);
const ok11 = o => o.altar11[1] != null && o.altar11[1] <= 60;
(async () => {
  const [mode, ...a] = process.argv.slice(2),
    n = a.map(Number);
  if (mode === 'c9') for (let c = n[1]; c <= n[2]; c += n[3]) show(await evalAlt(n[0], [c, 250000, 350000]));
  else if (mode === 'one') show(await evalAlt(n[0], [n[1], n[2], n[3]]));
  else if (mode === 'pair')
    for (const c10 of n.slice(2)) {
      let lo = c10,
        hi = 350000,
        best = null;
      /* 先看 c11＝c10 行不行（偏好 Lv10 ≤ Lv11）；不行就往下找 */
      let o = await evalAlt(n[0], [n[1], c10, lo]);
      if (!ok11(o)) {
        hi = lo;
        lo = 5000;
        o = await evalAlt(n[0], [n[1], c10, lo]);
        if (!ok11(o)) {
          show(o);
          console.log('  c10', c10, '：c11＝5,000 也不行');
          continue;
        }
      }
      best = o;
      while (hi - lo > 5000) {
        const m = Math.round((lo + hi) / 2 / 5000) * 5000;
        if (m === lo || m === hi) break;
        const x = await evalAlt(n[0], [n[1], c10, m]);
        if (ok11(x)) (lo = m), (best = x);
        else hi = m;
      }
      const x = await evalAlt(n[0], [n[1], c10, hi]);
      if (ok11(x)) best = x;
      show(best);
    }
})();
