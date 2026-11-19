/* 數字顯示（docs/production/specs/number-abbrev.md v1.1）。展示頁與 tools/d2_demo.js 的單元表共用。
   abbr(n, mode)：縮寫；full(n, mode)：完整千分位。mode 'own' 捨去（擁有、獲得、掉落）、'cost' 進位（費用、需求）。
   買不買得起一律用原值（can），不看顯示的字。 */
(function (root) {
  'use strict';
  const U = ['', 'K', 'M', 'B', 'T'];
  /* n ÷ p 取整：先用浮點，再用乘回去修正（避免 12.3 × 10 = 122.999… 這類誤差） */
  function div(n, p, mode) {
    let q = Math.floor(n / p);
    if (q * p > n) q--;
    if ((q + 1) * p <= n) q++;
    return mode === 'cost' && q * p < n ? q + 1 : q;
  }
  function full(n, mode) {
    return div(n, 1, mode).toLocaleString('en-US');
  }
  function abbr(n, mode) {
    if (n < 10000) return full(n, mode);
    if (n >= 1e15) {
      let k = String(Math.floor(n)).length - 1;
      let q = div(n, Math.pow(10, k - 2), mode);
      if (q >= 1000) (q /= 10), k++;
      return (q / 100).toFixed(2) + 'e' + k;
    }
    const u = Math.min(4, Math.floor((String(Math.floor(n)).length - 1) / 3));
    const x = n / Math.pow(10, u * 3),
      d = x < 10 ? 2 : x < 100 ? 1 : 0;
    const q = div(n, Math.pow(10, u * 3 - d), mode);
    if (q >= 1000) return abbr(q * Math.pow(10, u * 3 - d), mode); /* 進位到 1000：換下一個單位 */
    return (q / Math.pow(10, d)).toFixed(d) + U[u];
  }
  const can = (have, cost) => have >= cost;
  const api = { abbr, full, can };
  if (typeof module !== 'undefined') module.exports = api;
  else root.NUM = api;
})(this);
