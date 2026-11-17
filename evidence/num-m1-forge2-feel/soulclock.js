/* 每場 camp_run CSV：鍛造台 Lv2（與民房 Lv2）買下那一分鐘末的「累計靈魂收入」與「累計花在營地的靈魂」，以及買之前的購買順序。
   目的：驗證鍛造台 2 的時間＝(它之前要先買的東西的總價＋自己的價) ÷ 收入。用法：node soulclock.js 檔.csv... */
const fs = require('fs');
const N = { 5: 'forge', 6: 'watch', 7: 'scout', 8: 'house', 9: 'altar', 10: 'store' };
console.log('run,forge2_min,cum_income_at_forge2,cum_camp_spend_at_forge2,house2_min,cum_income_at_house2,avg_spm_to_forge2,order_before_forge2');
for (const f of process.argv.slice(2)) {
  const C = fs.readFileSync(f, 'utf8').trim().split('\n').slice(1).map(r => r.split(','));
  let inc = 0, sp = 0, order = [], lv = {}, out = {};
  for (const r of C) {
    inc += +r[4];
    for (const i in N) if (+r[i] > 0) { const b = N[i]; lv[b] = (lv[b] || 0) + 1; sp += +r[i]; order.push(b + lv[b]); if ((b === 'forge' && lv[b] === 2) || (b === 'house' && lv[b] === 2)) out[b + '2'] = { m: +r[0], inc, sp, ord: order.join('>') }; }
  }
  const F = out.forge2 || {}, H = out.house2 || {};
  console.log([f.split('/').pop().replace('.csv', ''), F.m, F.inc, F.sp, H.m, H.inc, F.inc ? (F.inc / F.m).toFixed(1) : '', F.ord].join(','));
}
