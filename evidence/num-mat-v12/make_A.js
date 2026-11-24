/* A_search.jsonl → tables_A.md：試過的每一組長老屋 Lv9～11 靈魂費用（s100、MIN＝5,400 分＝90 小時）。
   分數＝max(0, Lv9 P50 − 30)＋max(0, Lv11 P90 − 60)（小時；90 小時內沒到＝∞）；同分挑降幅最小。降幅＝(150,000−c9)＋(250,000−c10)＋(350,000−c11)。 */
'use strict';
const fs = require('fs'),
  path = require('path');
const L = fs.readFileSync(path.join(__dirname, 'A_search.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const red = a => 150000 - a[0] + 250000 - a[1] + 350000 - a[2];
const sc = x => (x.altar9[0] == null || x.altar11[1] == null ? Infinity : Math.max(0, x.altar9[0] - 30) + Math.max(0, x.altar11[1] - 60));
const hard = a => a[0] >= 90000 && a[0] <= a[1] && a[1] <= a[2] && a[1] >= 200000 && a[2] >= 200000 && red(a) < 280000 && a[0] <= 150000 && a[1] <= 250000 && a[2] <= 350000;
const f = v => (v == null ? '>90' : v.toFixed(2));
const g = a => `${f(a[0])}／${f(a[1])}`;
const N = v => v.toLocaleString('en');
const row = (x, i) =>
  `| ${i} | ${x.alt.map(N).join('／')} | ${N(red(x.alt))} | ${hard(x.alt) ? '✅' : '❌'} | ${g(x.altar8)} | ${g(x.altar9)} | ${g(x.altar10)} | ${g(x.altar11)} | ${g(x.forge20)} | ${g(x.sup213)} | ${g(x.store5)} | ${isFinite(sc(x)) ? sc(x).toFixed(2) : '∞'} |`;
const H = ['| # | Lv9／Lv10／Lv11 | 降幅 | 硬規則 | Lv8 | Lv9 | Lv10 | Lv11 | 鍛造台 Lv20 | II 13 種 | 倉房 Lv5 | 分數 |', '|---|---|---|---|---|---|---|---|---|---|---|---|'];
const s100 = L.filter(x => x.sec === 100 && x.MIN === '5400' && !x.QH && x.alt[0] >= 90000),
  other = L.filter(x => !s100.includes(x));
const rk = [...s100].filter(x => hard(x.alt)).sort((a, b) => sc(a) - sc(b) || red(a.alt) - red(b.alt));
const o = [
  '# num-mat-v12 A：試過的長老屋 Lv9～11 靈魂費用（`node make_A.js` 由 A_search.jsonl 產生）\n',
  `s100、10 個種子、模擬 90 小時（MIN=5,400，才量得到超過 60 小時多少）、CRAFT=mix＋商會（上限 \`${s100[0].CAP}\`）＋每小時額度（js/craft.js 的 TRADE_QH）、輔助 II a、購買照 ORDER。時間是小時 P50／P90；>90＝90 小時內沒到。`,
  '分數＝max(0, Lv9 P50 − 30)＋max(0, Lv11 P90 − 60)；同分挑降幅最小。降幅＝(150,000−c9)＋(250,000−c10)＋(350,000−c11)。',
  `一共 ${s100.length} 組（c9＝90,000 時 c10 200,000～250,000 × c11 c10～350,000 全部 286 組；c10／c11 固定 200,000／200,000 與 250,000／350,000 時 c9 90,000～150,000 各 13 組，重疊 2 組）。\n`,
  '## 排名前 15（硬規則內）\n',
  ...H,
  ...rk.slice(0, 15).map((x, i) => row(x, i + 1)),
  '\n## 降幅最小的組（c9＝90,000，照交辦的例子；c9 > 90,000 時降幅更小，最小是 150,000／250,000／350,000＝main 原值、降幅 0，列在後面參考）\n',
  ...H,
  ...[...s100].filter(x => hard(x.alt) && x.alt[0] === 90000).sort((a, b) => red(a.alt) - red(b.alt) || sc(a) - sc(b)).slice(0, 3).map((x, i) => row(x, i + 1)),
  ...[...s100].filter(x => hard(x.alt)).sort((a, b) => red(a.alt) - red(b.alt) || sc(a) - sc(b)).slice(0, 1).map(x => row(x, '參考')),
  '\n## 全部（試的順序）\n',
  ...H,
  ...s100.map((x, i) => row(x, i + 1)),
  '\n## 其他（驗證與 s150；不進排名）\n',
  '| # | 一輪 | 額度 | Lv9／Lv10／Lv11 | 降幅 | 硬規則 | Lv8 | Lv9 | Lv10 | Lv11 | 鍛造台 Lv20 | II 13 種 | 倉房 Lv5 | 分數 |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...other.map((x, i) => row(x, i + 1).replace(/^\| (\S+) \|/, `| $1 | s${x.sec} | ${x.QH === 'off' ? '不限' : 'H12'} |`))
];
fs.writeFileSync(path.join(__dirname, 'tables_A.md'), o.join('\n') + '\n');
console.log(rk.slice(0, 8).map(x => x.alt.join('/') + ' ' + sc(x).toFixed(3) + ' L9 ' + x.altar9 + ' L11 ' + x.altar11 + ' store5 ' + x.store5).join('\n'));
