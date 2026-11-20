'use strict';
/* scratch 專用：origin/main 的 `node tools/tree_bake.js` 直接跑會掛（data.js 用空的 PT_BAKE 組 PTREE 時
   PT_START 讀 PTREE.I[k].y 是 undefined；palette.js 也要 PAL_CSS）。這裡讓副本的烘焙工具先載入舊 ptdata.js 與 PAL_CSS。
   ptreeGen2 不讀 PT_BAKE，所以輸出不受影響（baseline 副本重烘後 ptdata.js 與原檔逐字相同可驗證）。 */
const fs = require('fs'),
  path = require('path');
const f = path.join(path.resolve(process.argv[2]), 'tools', 'tree_bake.js');
let s = fs.readFileSync(f, 'utf8');
const a = '      PT_BAKE: { N: [], E: [] }\n    };\n  vm.createContext(ctx);';
if (!s.includes(a)) throw new Error('bakefix: 找不到');
s = s.replace(
  a,
  "      PAL_CSS: fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8')\n    };\n  vm.createContext(ctx);\n  vm.runInContext(fs.readFileSync(js('ptdata.js'), 'utf8'), ctx, { filename: 'ptdata.js' });"
);
fs.writeFileSync(f, s);
console.log('bakefix', f);
