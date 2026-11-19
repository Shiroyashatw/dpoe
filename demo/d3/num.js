/* 數字顯示（docs/production/specs/number-abbrev.md v1.1）
   abbr(n, mode)：≥ 10,000 縮成 3 位有效 K／M／B／T，≥ 1e15 用 e 記法；mode 'own' 捨去（擁有、獲得）、'cost' 進位（費用、需求）
   full(n, mode)：完整數字＋千分位，同樣分捨去／進位 */
(function (root) {
  'use strict';
  const grp = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  /* 浮點修正：先 round 到 1e-9 再捨去／進位，免得 12.3 × 10 = 122.99999 */
  const fix = x => Math.round(x * 1e9) / 1e9;
  const rnd = (x, cost) => (cost ? Math.ceil(fix(x)) : Math.floor(fix(x)));
  const dp = x => (x < 10 ? 2 : x < 100 ? 1 : 0);
  function full(n, mode) {
    return grp(rnd(n, mode === 'cost'));
  }
  function expo(n, cost) {
    let e = Math.floor(Math.log10(n));
    for (;;) {
      const y = rnd((n / 10 ** e) * 100, cost) / 100;
      if (y >= 10) {
        e++;
        continue;
      }
      return y.toFixed(2) + 'e' + e;
    }
  }
  const U = [
    ['K', 1e3],
    ['M', 1e6],
    ['B', 1e9],
    ['T', 1e12]
  ];
  function abbr(n, mode) {
    const cost = mode === 'cost';
    if (n < 10000) return full(n, mode);
    if (n >= 1e15) return expo(n, cost);
    let i = U.length - 1;
    while (i > 0 && n < U[i][1]) i--;
    for (; i < U.length; i++) {
      const x = n / U[i][1],
        m = 10 ** dp(x),
        q = n / (U[i][1] / m) /* 整數除以 10 的次方，不經過 x × m 的浮點誤差 */,
        y = (cost ? Math.ceil(q) : Math.floor(q)) / m;
      if (y >= 1000) continue; /* 只有進位會發生：換下一個單位 */
      return y.toFixed(dp(y)) + U[i][0];
    }
    return expo(n, cost);
  }
  const API = { abbr, full, grp };
  if (typeof module !== 'undefined') module.exports = API;
  else Object.assign(root, API);
})(this);
