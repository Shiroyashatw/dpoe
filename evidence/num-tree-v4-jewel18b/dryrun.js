'use strict';
/* 乾跑：node evidence/num-tree-v4-jewel18b/dryrun.js <ptdata.js> <輸出檔>
   用 tools/tree_bake.js 的 pt2Socks 算 J（不管 bad），接在原檔 PT_BAKE 的最後，N／E／C／M 原樣保留。
   tree_bake.js 本身因為 bad 不寫檔；這份只給驗證與 check 用，不是正式 ptdata。 */
const fs = require('fs'),
  path = require('path');
const { pt2Socks } = require(path.join(__dirname, '../../tools/tree_bake.js'));
const [src, dst] = process.argv.slice(2),
  s = fs.readFileSync(src, 'utf8'),
  O = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf(';'))),
  SK = pt2Socks(O.N, O.E),
  cut = s.lastIndexOf('}');
if (SK.err) throw new Error(SK.err);
fs.writeFileSync(dst, s.slice(0, cut) + ',"J":' + JSON.stringify(SK.J) + s.slice(cut));
console.log('最小點距 ' + SK.minD);
for (const o of SK.info)
  console.log(
    o.id,
    '可行起點 +' + o.start,
    '偏移 +' + o.d,
    o.by === 'rim' ? '（沒有點擋住，以 pt2Rim 外緣為上限）' : '（被點擋住）'
  );
console.log('bad ' + SK.bad.length + '：\n' + SK.bad.join('\n'));
