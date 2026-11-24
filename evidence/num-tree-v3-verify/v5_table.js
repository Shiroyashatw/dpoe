'use strict';
/* 第 12 項（V5）彙整：讀 v5/*.json（econ_v5.js 的輸出），寫 v5_table.csv 並印表。每小時＝每輪 × 3600÷(150＋2)（V7：估算，等測試階段再實測） */
const fs = require('fs'),
  path = require('path'),
  RPH = 3600 / 152,
  D = path.join(__dirname, 'v5'),
  get = (c, i) => JSON.parse(fs.readFileSync(path.join(D, `${c}_${i}.json`), 'utf8'))[0],
  h = (r, k) => (r[k] / r.rounds) * RPH,
  pct = (a, b) => (100 * (a / b - 1)).toFixed(1);
const head = [
    '地點',
    '類型',
    'Lv',
    'main 破裂石/時',
    'main 墨/時',
    '改前 破裂石/時',
    '改前 墨/時',
    '改前 差%(石/墨)',
    'K12 差%(石/墨)',
    'K13 差%(石/墨)',
    '改後 破裂石/時',
    '改後 墨/時',
    '改後 差%(石/墨)',
    '改後＝main 逐輪相同',
    '保底次數/時 main→改前→改後',
    '保底靈魂包/時 改前→改後'
  ],
  rows = [head];
let worst = { pre: 0, k12: 0, k13: 0, post: 0 };
for (let i = 0; i < 26; i++) {
  const m = get('main', i),
    a = get('1500', i),
    k12 = get('1800', i),
    k13 = get('1950', i),
    p = get('phs', i),
    d = r => [pct(h(r, 'frac'), h(m, 'frac')), pct(h(r, 'ink'), h(m, 'ink'))];
  for (const [k, r] of [
    ['pre', a],
    ['k12', k12],
    ['k13', k13],
    ['post', p]
  ])
    worst[k] = Math.max(worst[k], ...d(r).map(x => Math.abs(+x)));
  rows.push([
    m.n,
    m.type,
    m.lv,
    h(m, 'frac').toFixed(3),
    h(m, 'ink').toFixed(3),
    h(a, 'frac').toFixed(3),
    h(a, 'ink').toFixed(3),
    d(a).join('/'),
    d(k12).join('/'),
    d(k13).join('/'),
    h(p, 'frac').toFixed(3),
    h(p, 'ink').toFixed(3),
    d(p).join('/'),
    p.frac === m.frac && p.ink === m.ink && p.feel === m.feel && p.rounds === m.rounds ? '是' : '否',
    [h(m, 'feel'), h(a, 'feel'), h(p, 'feel')].map(x => x.toFixed(2)).join('→'),
    Math.round(h(a, 'pack')) + '→' + Math.round(h(p, 'pack'))
  ]);
}
fs.writeFileSync(path.join(__dirname, 'v5_table.csv'), '﻿' + rows.map(r => r.join(',')).join('\n') + '\n');
for (const r of rows) console.log(r.join(' | '));
console.log('最大偏差 %（破裂石、墨取大）：', JSON.stringify(worst));
