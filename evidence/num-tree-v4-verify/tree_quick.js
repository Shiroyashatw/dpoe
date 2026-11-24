/* num-tree-v4-verify：只跑 tools/check.js 前段（到「0.2.7 底層」之前＝天賦樹相關檢查），迭代用。
   PTDATA＝改用別的 ptdata 檔、OVR＝載入 data.js 後再跑的一段覆寫（迭代時試 PT_RW／rg／PT_FIX 用）。正式結果一律看完整的 node tools/check.js */
const fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '../..'),
  src = fs.readFileSync(path.join(ROOT, 'tools/check.js'), 'utf8'),
  cut = src.indexOf('/* 0.2.7 底層（企劃書 7.2） */'),
  LOAD = "vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });";
if (!src.includes(LOAD)) throw new Error('check.js 載入那一行變了');
const body =
  `const __OVR = process.env.OVR || '', __PTD = process.env.PTDATA;\n` +
  src
    .slice(0, cut)
    .replace(
      LOAD,
      `{ vm.runInContext(f === 'ptdata.js' && __PTD ? fs.readFileSync(__PTD, 'utf8') : fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f }); if (f === 'data.js' && __OVR) vm.runInContext(__OVR, ctx); }`
    )
    .replace(/require\('\.\/tree_bake\.js'\)/g, `require(${JSON.stringify(path.join(ROOT, 'tools/tree_bake.js'))})`)
    .replace(/__dirname/g, JSON.stringify(path.join(ROOT, 'tools')));
const tmp = path.join(require('os').tmpdir(), 'tq_' + process.pid + '.js');
fs.writeFileSync(tmp, body + '\nconsole.log("❌ 數 " + bad);\n');
require(tmp);
fs.unlinkSync(tmp);
