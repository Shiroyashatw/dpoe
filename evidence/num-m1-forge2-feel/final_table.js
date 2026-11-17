/* Task A 總表：每一場有效的 camp_run → 解鎖分鐘、對兩種 550 參考的差、四個目標過不過、第 8 分末鐵 T1、前 9 分靈魂/分。
   參考 fixed＝工程師 evidence/m1-21 的 before_390x844（祭壇 6.75、鍛造台 2 9.35、民房 2 11.60）／before_1280x720（6.77、10.60、13.35）；
   session＝本次同一台機器跑的 550 版（camp_run/r550_*）。用法：node final_table.js > camp_unlock_all.csv */
const { execFileSync } = require('child_process'), fs = require('fs');
const M = '../m1-21/', C = 'camp_run/';
const RUNS = [
  ['ref550(工程師)', M + 'before_390x844'], ['ref550(工程師)', M + 'before_1280x720'], ['ref550(工程師)', M + 'before_1280x720_36min_paired'],
  ['ref550(本次)', C + 'r550_390x844_a'], ['ref550(本次)', C + 'r550_1280x720_a'],
  ['main=F(工程師)', M + 'f200_390x844'], ['main=F(工程師)', M + 'f200_1280x720'], ['main=F(工程師)', M + 'merged67844a4_390x844_r2'], ['main=F(工程師)', M + 'merged_1280x720'],
  ['main=F(本次)', C + 'main_390x844_a'], ['main=F(本次)', C + 'main_390x844_b'], ['main=F(本次)', C + 'main_1280x720_b'], ['main=F(本次)', C + 'main_1280x720_c'],
  ['forge2=250', C + 'c250_390x844_a'], ['forge2=250', C + 'c250_390x844_b'], ['forge2=250', C + 'c250_390x844_c'], ['forge2=250', C + 'c250_390x844_d'],
  ['forge2=250', C + 'c250_1280x720_a'], ['forge2=250', C + 'c250_1280x720_b'], ['forge2=250', C + 'c250_1280x720_d']
];
const FIX = { 390: { a: 6.75, f: 9.35, h: 11.6 }, 1280: { a: 6.77, f: 10.6, h: 13.35 } }, SES = { 390: { a: 7.18, f: 9.18, h: 10.52 }, 1280: { a: 8.68, f: 11.7, h: 15.03 } };
const U = execFileSync('node', ['unlocks.js', ...RUNS.map(r => r[1] + '.log')]).toString().trim().split('\n').slice(1).map(l => l.split(','));
const L = [['組', 'run', '尺寸', '祭壇1', '瞭望台1', '鍛造台2', '民房2', 'Δ祭壇_fixed', 'Δ鍛造台2_fixed', 'Δ民房2_fixed', 'Δ鍛造台2_session', 'Δ民房2_session', '瞭望台8-12', '三件≤+4(fixed)', '全過(fixed)', '鐵T1_第8分末', '前9分靈魂/分', '購買順序'].join(',')];
const n2 = v => (v === '' ? NaN : +v), f = v => (isNaN(v) ? '' : v.toFixed(2));
RUNS.forEach(([g, p], i) => {
  const u = U[i], sz = /1280/.test(p) ? 1280 : 390, a = n2(u[3]), w = n2(u[4]), h = n2(u[5]), fo = n2(u[6]);
  const csv = fs.readFileSync(p + '.csv', 'utf8').trim().split('\n').slice(1).map(r => r.split(','));
  const i8 = csv[7] ? csv[7][12] : '', e9 = (csv.slice(0, 9).reduce((s, r) => s + +r[4], 0) / 9).toFixed(1);
  const NB = { 5: 'forge', 6: 'watch', 8: 'house', 9: 'altar' }, lv = {}, ord = [];
  for (const r of csv) for (const k in NB) if (+r[k] > 0) { lv[NB[k]] = (lv[NB[k]] || 0) + 1; if (ord.length < 7) ord.push(NB[k] + lv[NB[k]]); }
  const da = a - FIX[sz].a, df = fo - FIX[sz].f, dh = h - FIX[sz].h, ww = w >= 8 && w <= 12, three = da <= 4 && df <= 4 && dh <= 4;
  L.push([g, p.split('/').pop(), sz, f(a), f(w), f(fo), f(h), f(da), f(df), f(dh), f(fo - SES[sz].f), f(h - SES[sz].h), /ref550/.test(g) ? '' : ww ? 1 : 0, three ? 1 : 0, /ref550/.test(g) ? '' : ww && three ? 1 : 0, i8, e9, ord.join('>')].join(','));
});
console.log(L.join('\n'));
