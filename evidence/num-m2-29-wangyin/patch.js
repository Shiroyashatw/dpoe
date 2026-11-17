/* M2-29 王印數值模擬用的補丁：把遊戲複製到 scratch 資料夾，只改複製出來的 js/items.js（stats() 裡加王印一段）。
   不動 repo 裡的遊戲程式。用法：node evidence/num-m2-29-wangyin/patch.js <輸出資料夾>
   效果表 WY_FX（鍵 → [能力, 數值]）、齊鳴倍率 WY_SET、齊鳴的取整 WY_RND 都是全域 var，模擬時可以改。
   規則（製作人決定）：同名印只算一次（Set）；四種不同的印同時裝著才 ×WY_SET；換掉的印不退（模擬裡不涉及）。 */
'use strict';
const fs = require('fs'),
  path = require('path');
const src = path.join(__dirname, '..', '..'),
  out = path.resolve(process.argv[2] || 'sim');
fs.rmSync(out, { recursive: true, force: true });
for (const f of ['index.html', 'style.css', 'version.json', 'manifest.webmanifest', 'js', 'img', 'css', 'fonts', 'audio'])
  if (fs.existsSync(path.join(src, f))) fs.cpSync(path.join(src, f), path.join(out, f), { recursive: true });
const p = path.join(out, 'js', 'items.js');
let s = fs.readFileSync(p, 'utf8');
const anchor = '  /* 昇華（0.2.25）：小點的數值跟天賦一樣加；大點是開關或數值（only＝拿那種武器才生效） */';
if (!s.includes(anchor)) throw new Error('anchor not found');
s = s.replace(
  anchor,
  `  /* M2-29 SIM：王印（同名只算一次；四種不同的印同時裝著 ×WY_SET 再取整） */
  {
    const wys = new Set();
    for (const e of EQS) {
      const it = s.eq[e.k];
      if (!it || chk.bad.has(e.k) || (e.k === 'off' && !offOK(w, it))) continue;
      if (it.wy && WY_FX[it.wy]) wys.add(it.wy);
    }
    const full = wys.size >= 4;
    for (const k of wys) {
      const [st, v0] = WY_FX[k],
        v = full ? WY_RND(v0 * WY_SET, st) : v0;
      if (st === 'resA') for (const r of ['fire', 'cold', 'light']) o.res[r] += v;
      else if (st in pt) pt[st] += v;
      else put(st, v);
    }
    o.wyN = wys.size;
  }
` + anchor
);
s =
  `var WY_FX = { wangyin_zhenyue: ['defP', 24], wangyin_chixiao: ['dmgA', 16], wangyin_jiting: ['ss', 12], wangyin_guixu: ['leech', 1] };
var WY_SET = 1.25;
/* 四捨五入：整數能力取整數；生命偷取這種小數字取到 0.1 */
var WY_RND = (v, st) => (st === 'leech' ? Math.round(v * 10) / 10 : Math.round(v));
` + s;
fs.writeFileSync(p, s);
console.log('patched', p);
