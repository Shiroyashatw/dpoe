/* camp_run 的 log → 每分鐘 CSV（跟 evidence/names/camp_*.csv 同欄位，加事件欄）＋解鎖句秒數。node camp2csv.js 輸入.log 輸出.csv */
const fs = require('fs');
const [, , inp, out] = process.argv;
const L = fs.readFileSync(inp, 'utf8').split('\n');
const rows = ['分鐘,地點,角色Lv,靈魂庫存,靈魂每分,木,鐵(內部鍵),產生器,鍛瞭斥民祭倉,輪,死,產生器累計級,打造/換上,這一分鐘的事件'];
let cur = null;
for (const l of L) {
  const m = l.match(/^\s*(\d+) 分 \| (\S+) 角色Lv(\d+) \| 靈魂 (\d+)（(\d+)\/分）\| 木 (\d+) \| 鐵 ([^|]*?) \| (.*?) \| 鍛瞭斥民祭倉 (\S+) \| 輪 (\d+) 死 (\d+) \| 產生器累計 (\d+) 級 \| 打造\/換上 (\S+) \|/);
  if (m) { if (cur) rows.push(cur.join(',')); cur = [...m.slice(1), '']; continue; }
  const e = l.match(/^\s{6}(\d+ \S.*)$/);
  if (e && cur && !/^\d{3,} /.test(e[1])) cur[13] = (cur[13] ? cur[13] + '；' : '') + e[1].replace(/,/g, '，');
  if (/^\S.*分鐘（/.test(l) && cur) { rows.push(cur.join(',')); cur = null; }
}
if (cur) rows.push(cur.join(','));
const si = L.findIndex(l => /^解鎖句/.test(l));
const say = L.slice(si + 1).map(l => l.trim().match(/^(\d{2,}) (\S+ Lv\d+)：/)).filter(Boolean).map(m => [m[2], +m[1]]);
rows.push('', '解鎖句,秒,分');
for (const [k, s] of say) rows.push([k, s, (s / 60).toFixed(2)].join(','));
fs.writeFileSync(out, rows.join('\n') + '\n');
