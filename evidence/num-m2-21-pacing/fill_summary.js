/* 把 camp/ 的實掛結果填進 summary.md 的 {{…}} 欄位（不手抄數字）。用法：node fill_summary.js */
const fs = require('fs');
const J = n => JSON.parse(fs.readFileSync(`camp/${n}.json`));
const CSV = n => fs.readFileSync(`camp/${n}.csv`, 'utf8').trim().split('\n').map(l => l.match(/("[^"]*"|[^,]+|(?<=,)(?=,)|^(?=,))/g));
const ev = j => {
  const o = {};
  j.rows.forEach(r => r.ev.forEach(e => {
    const m = e.match(/^([\d.]+) (.+?)(：|$)/);
    if (m && !/換上/.test(e) && !(m[2] in o)) o[m[2]] = +m[1] / 60;
  }));
  return o;
};
const f1 = x => (x == null ? '—' : x.toFixed(1));
const sgn = x => (x >= 0 ? '+' : '') + x.toFixed(1);
const mmss = ms => `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}`;
const spm = (n, m) => { const t = CSV(n), H = t[0], i = H.indexOf('靈魂收入'); return t.slice(1, m + 1).reduce((a, r) => a + +r[i], 0) / m; };
const col = (n, name, m) => { const t = CSV(n); return +t[m][t[0].indexOf(name)]; };
const TGT = { '民房 Lv1': 5, '鍛造台 Lv1': 6, '礦場 Lv10 里程碑': 8, '瞭望台 Lv1': 10, '民房 Lv2': 11, '鍛造台 Lv2': 12, '祭壇 Lv1': 14, '瞭望台 Lv2': 18, '礦場 Lv25 里程碑': 20, '斥候營 Lv1': 22, '鍛造台 Lv3': 25, '祭壇 Lv2': 30, '林場 Lv25 里程碑': 30, '鍛造台 Lv4': 34, '民房 Lv3': 34, '鍛造台 Lv5': 38, '倉房 Lv1': 42, '瞭望台 Lv4': 55, '林場 Lv5 里程碑': 3 };
const WIN = { '瞭望台 Lv1': '8–12（單場 6–14）', '祭壇 Lv1': '≤10.8', '鍛造台 Lv2': '≤14.6 桌機／≤13.4 直立', '民房 Lv2': '≤17.4 桌機／≤15.6 直立', '鍛造台 Lv3': '≤22.2 桌機／≤19.9 直立', '鍛造台 Lv4': '提案 24–36（單場 ≤39）' };
const A = ['main_390x844_r1', 'main_390x844_r2'], B = ['main_1280x720_r2', 'main_1280x720_r3'].filter(n => fs.existsSync(`camp/${n}.json`));
const EA = A.map(n => ev(J(n))), EB = B.map(n => ev(J(n)));
const keys = [...new Set([...EA, ...EB].flatMap(o => Object.keys(o)))].sort((a, b) => Math.min(...[...EA, ...EB].map(o => o[a] ?? 1e9)) - Math.min(...[...EA, ...EB].map(o => o[b] ?? 1e9)));
const avgOf = (E, k) => { const v = E.map(o => o[k]); return v.every(x => x != null) ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const rows = keys.map(k => {
  const t = TGT[k], a = avgOf(EA, k), b = avgOf(EB, k);
  return `| ${k} | ${t ?? '—'} | ${WIN[k] || ''} | ${EA.map(o => f1(o[k])).join(' | ')} | ${f1(a)} | ${a != null && t != null ? sgn(a - t) : ''} | ${EB.map(o => f1(o[k])).join(' | ')} | ${f1(b)} | ${b != null && t != null ? sgn(b - t) : ''} |`;
});
let s = fs.readFileSync('summary.md', 'utf8');
s = s.replace('{{UNLOCK_ROWS}}', rows.join('\n'));
/* 逐分鐘 1–30 */
const pm = (pre, runs) => {
  const T = runs.map(CSV), H = T[0][0], g = (t, i, c) => +t[i][H.indexOf(c)];
  const L = [`**${pre}（${runs.length} 場平均）**`, '', '| 分 | 靈魂收入 | 靈魂花費 | 靈魂庫存 | 木庫存 | 生鐵庫存 | 生鐵產量 | 生鐵用量 | 新東西 | 小變強 | 這一分鐘升的設施（第一場） |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  const JJ = runs.map(J);
  for (let i = 1; i <= 30; i++) {
    const av = c => Math.round(T.reduce((a, t) => a + g(t, i, c), 0) / T.length);
    const use = Math.round(T.reduce((a, t) => a + g(t, i, 'iron:1用量_營地') + g(t, i, 'iron:1用量_產生器') + g(t, i, 'iron:1淨用量_打造'), 0) / T.length);
    const nw = JJ.reduce((a, j) => a + j.rows[i - 1].ev.filter(e => !/換上/.test(e)).length, 0) / JJ.length;
    const up = JJ.reduce((a, j) => a + j.up.filter(u => u[0] >= (i - 1) * 60 && u[0] < i * 60).length, 0) / JJ.length;
    const bought = JJ[0].rows[i - 1].ev.filter(e => /(鍛造台|瞭望台|祭壇|民房|斥候營|倉房) Lv/.test(e)).map(e => e.replace(/^[\d.]+ /, '').replace(/：.*/, '')).join('、');
    L.push(`| ${i} | ${av('靈魂收入')} | ${av('靈魂花費')} | ${av('靈魂庫存')} | ${av('木庫存')} | ${av('iron:1庫存')} | ${av('iron:1產量')} | ${use} | ${nw.toFixed(1)} | ${up.toFixed(1)} | ${bought} |`);
  }
  return L.join('\n');
};
s = s.replace('{{PER_MIN}}', pm('390×844', A) + '\n\n' + pm('1280×720', B));
/* 1280 r3 */
if (B.includes('main_1280x720_r3')) {
  const j = J('main_1280x720_r3'), e = ev(j);
  s = s.replace('{{R3_R1}}', mmss(j.r1)).replace('{{R3_NEWS}}', `${j.news30}／${j.news60}`).replace('{{R3_UP}}', `${j.up15} 次`).replace('{{R3_GAP}}', `${j.gapMax15} 秒`).replace('{{R3_PER}}', j.per.join(' '))
    .replace('{{R3_I30}}', col('main_1280x720_r3', 'iron:1庫存', 30).toLocaleString('en')).replace('{{R3_I60}}', col('main_1280x720_r3', 'iron:1庫存', 60).toLocaleString('en'))
    .replace('| 1280 r3 | {{R3_ORDER}} |', `| 1280 r3 | ${f1(e['祭壇 Lv1'])} | ${f1(e['瞭望台 Lv1'])} | ${f1(e['民房 Lv2'])} | **${f1(e['鍛造台 Lv2'])}** | ${sgn(e['鍛造台 Lv2'] - 10.87)} |`);
}
/* P7、P8 */
const K = ['瞭望台 Lv1', '祭壇 Lv1', '鍛造台 Lv2', '民房 Lv2', '鍛造台 Lv3', '民房 Lv3', '鍛造台 Lv4', '斥候營 Lv1', '瞭望台 Lv2'];
const lim = (n, k) => { const d = /1280/.test(n); return { '瞭望台 Lv1': x => x >= 8 && x <= 12, '祭壇 Lv1': x => x <= 10.8, '鍛造台 Lv2': x => x <= (d ? 14.6 : 13.4), '民房 Lv2': x => x <= (d ? 17.4 : 15.6), '鍛造台 Lv3': x => x <= (d ? 22.2 : 19.9), '鍛造台 Lv4': x => x <= 36 }[k]; };
const table = (pre, withMain) => {
  const P = fs.readdirSync('camp').filter(f => f.startsWith(pre + '_') && f.endsWith('.json') && !/無效/.test(f)).map(f => f.slice(0, -5)).sort((a, b) => (/1280/.test(a) - /1280/.test(b)) || a.localeCompare(b));
  if (!P.length) return null;
  const PT = ['| 場次 | 前 30 分靈魂／分 | ' + K.join(' | ') + ' | 新東西 30 分 | 前 15 分小變強／最大間隔 | AI 卡住 |', '|---|---|' + K.map(() => '---|').join('') + '---|---|---|'];
  for (const n of P) {
    const j = J(n), e = ev(j), vt = j.validTo || 1e9;
    PT.push(`| ${n.replace(pre + '_', '')} | ${spm(n, 30).toFixed(0)} | ${K.map(k => (e[k] == null ? '—' : e[k] > vt ? `（${f1(e[k])} 不採用）` : f1(e[k]) + (lim(n, k) ? (lim(n, k)(e[k]) ? ' ✅' : ' ✗') : ''))).join(' | ')} | ${j.news30} | ${j.up15}／${j.gapMax15} 秒 | ${j.validTo ? '第 26–33 分停住後恢復' : j.stuckFrom ? '第 ' + j.stuckFrom + ' 分起（無效）' : '沒有'} |`);
  }
  if (withMain) for (const n of [...A, ...B]) { const e = ev(J(n)); PT.push(`| （對照）${n.replace('main_', 'main ')} | ${spm(n, 30).toFixed(0)} | ${K.map(k => f1(e[k])).join(' | ')} | ${J(n).news30} | ${J(n).up15}／${J(n).gapMax15} 秒 | 沒有 |`); }
  return PT.join('\n') + '\n\n✅／✗＝對驗收窗（瞭望台 8–12；祭壇 ≤10.8；鍛造台 2 ≤14.6 桌機／≤13.4 直立；民房 2 ≤17.4／≤15.6；鍛造台 3 ≤22.2／≤19.9；鍛造台 4 提案 ≤36）。';
};
for (const [pre, tag, wm] of [['P7', '{{P7_TABLE}}', 1], ['P8', '{{P8_TABLE}}', 0]]) { const t = table(pre, wm); if (t) s = s.replace(tag, t); }
fs.writeFileSync('summary.md', s);
console.log('filled; B', B.length);
