/* B_search.jsonl → tables_B.md（試過的每一組長老屋 Lv9～11 靈魂費用；CRAFT=mix＋商會；P50／P90 小時，空白＝60 小時內沒到） */
'use strict';
const fs = require('fs'),
  path = require('path');
const L = fs.readFileSync(path.join(__dirname, 'B_search.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const f = v => (v == null ? '>60' : v.toFixed(2));
const g = a => `${f(a[0])}／${f(a[1])}`;
const o = ['# num-mat-v11 B：試過的長老屋 Lv9～11 靈魂費用（`node make_B.js` 由 B_search.jsonl 產生）\n',
  '每一組＝10 個種子、60 小時、CRAFT=mix＋商會（上限 `' + L[0].CAP + '`）、輔助 II a 政策、購買照 ORDER。時間是小時 P50／P90；>60＝60 小時內沒到（當 ∞）。順序＝試的順序（`search_B.js` 的 c9 掃描、pair 二分、one 單組）。降幅＝(150,000−c9)＋(250,000−c10)＋(350,000−c11)。\n',
  '| # | 一輪 | Lv9／Lv10／Lv11 | 降幅合計 | Lv8 | Lv9 | Lv10 | Lv11 | 鍛造台 Lv20 | II 13 種 | 倉房 Lv5 | Lv9 P50 在 28～32 | Lv11 P90 ≤ 60 |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
L.forEach((x, i) => {
  const a = x.alt, red = 150000 - a[0] + 250000 - a[1] + 350000 - a[2];
  const ok9 = x.altar9[0] != null && x.altar9[0] >= 28 && x.altar9[0] <= 32, ok11 = x.altar11[1] != null && x.altar11[1] <= 60;
  o.push(`| ${i + 1} | s${x.sec} | ${a.map(v => v.toLocaleString('en')).join('／')} | ${red.toLocaleString('en')} | ${g(x.altar8)} | ${g(x.altar9)} | ${g(x.altar10)} | ${g(x.altar11)} | ${g(x.forge20)} | ${g(x.sup213)} | ${g(x.store5)} | ${ok9 ? '✅' : '❌'} | ${ok11 ? '✅' : '❌'} |`);
});
fs.writeFileSync(path.join(__dirname, 'tables_B.md'), o.join('\n') + '\n');
console.log(L.length, '組');
