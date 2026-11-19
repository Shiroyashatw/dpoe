/* abbr 單元測試（specs/number-abbrev.md 測試表 17 列 × 擁有／費用）：從 js/hud.js 取出 fullN、abbr 原始碼直接跑。
   用法：node tools/abbr_test.js；有 ❌ 結束碼 1 */
const fs = require('fs'),
  path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/hud.js'), 'utf8');
const a = src.indexOf('const fullN = '),
  b = src.indexOf('/* 縮寫的數字：滑鼠停留');
if (a < 0 || b < 0) throw new Error('hud.js 找不到 fullN／abbr');
const { abbr, fullN } = new Function(src.slice(a, b) + '\nreturn { abbr, fullN };')();
const T = [
  [9999, '9,999', '9,999'],
  [10000, '10.0K', '10.0K'],
  [10001, '10.0K', '10.1K'],
  [10099, '10.0K', '10.1K'],
  [12345, '12.3K', '12.4K'],
  [99999, '99.9K', '100K'],
  [100000, '100K', '100K'],
  [123456, '123K', '124K'],
  [999999, '999K', '1.00M'],
  [1000000, '1.00M', '1.00M'],
  [1000001, '1.00M', '1.01M'],
  [1234567, '1.23M', '1.24M'],
  [9999999, '9.99M', '10.0M'],
  [1234567890, '1.23B', '1.24B'],
  [1234567890123, '1.23T', '1.24T'],
  [999999999999999, '999T', '1.00e15'],
  [1234567890123456, '1.23e15', '1.24e15']
];
let bad = 0;
for (const [n, own, cost] of T)
  for (const [m, want] of [
    ['own', own],
    ['cost', cost]
  ]) {
    const got = abbr(n, m),
      ok = got === want;
    bad += !ok;
    console.log(`${ok ? '✅' : '❌'} abbr(${n.toLocaleString('en-US')}, '${m}') = ${got}${ok ? '' : `（要 ${want}）`}`);
  }
/* 補充：浮點（12.3×10 不能捨成 12.2K）、完整數字的取整方向 */
for (const [got, want, lab] of [
  [abbr(12300, 'own'), '12.3K', '12,300 捨去'],
  [abbr(12300, 'cost'), '12.3K', '12,300 進位'],
  [abbr(3402118, 'own'), '3.40M', 'big 存檔金'],
  [fullN(1234.9, 'own'), '1,234', '完整・捨去'],
  [fullN(1234.1, 'cost'), '1,235', '完整・進位'],
  [abbr(0, 'own'), '0', '0']
]) {
  const ok = got === want;
  bad += !ok;
  console.log(`${ok ? '✅' : '❌'} ${lab}：${got}${ok ? '' : `（要 ${want}）`}`);
}
console.log(bad ? `❌ ${bad} 項不過` : `✅ 全部 ${T.length * 2 + 6} 項通過`);
process.exit(bad ? 1 : 0);
