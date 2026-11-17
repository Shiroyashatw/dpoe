/* 跑一組 sim_pacing.js：方案 × 一輪秒數 × 種子，輸出每場的解鎖時間（分）到 CSV。
   用法：node sweep.js 輸出.csv MIN CRAFT '方案名=OVR JS' ...（OVR 空字串＝現行 main）；SECS、SEEDS 環境變數覆寫 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const [out, MIN, CRAFT, ...plans] = process.argv.slice(2);
const SECS = (process.env.SECS || '150,130,115,100,90,80').split(',').map(Number);
const SEEDS = (process.env.SEEDS || '20261115,1,2,3,4').split(',').map(Number);
const KEYS = ['house1', 'forge1', 'watch1', 'altar1', 'house2', 'forge2', 'forge3', 'house3', 'scout1', 'watch2', 'forge4', 'altar2', 'watch3', 'forge5'];
const L = [['方案', '一輪秒', '種子', '靈魂每分', ...KEYS].join(',')];
for (const pl of plans) {
  const i = pl.indexOf('='), name = pl.slice(0, i), ovr = pl.slice(i + 1);
  for (const sec of SECS)
    for (const sd of SEEDS) {
      const o = JSON.parse(execFileSync('node', [__dirname + '/sim_pacing.js'], { env: { ...process.env, SEC: sec, MIN, CRAFT, SEED: sd, OVR: ovr } }).toString());
      L.push([name, sec, sd, o.spm, ...KEYS.map(k => (o.t[k] == null ? '' : o.t[k]))].join(','));
    }
}
fs.writeFileSync(out, L.join('\n') + '\n');
