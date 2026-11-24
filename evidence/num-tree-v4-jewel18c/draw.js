'use strict';
/* node evidence/num-tree-v4-jewel18c/draw.js：從 js/ptdata.js 的 N、E 加 J 畫 tree_J.svg（整棵）＋ closeups.html（18 孔近看，截完圖就刪），
   再用 Playwright 轉 tree_J.png、closeups.png */
const fs = require('fs'),
  path = require('path');
const s = fs.readFileSync(path.join(__dirname, '../../js/ptdata.js'), 'utf8'),
  P = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf(';'))),
  { N, E, J } = P,
  I = Object.fromEntries(N.map(n => [n[0], n]));
const COL = ['#8a7a5a', '#6c8fb0', '#d9b26a', '#e05a4a', '#ffffff', '#6c8fb0', '#555', '#777'],
  RR = [10, 10, 19, 30, 20, 10, 10, 19];
const edge = e => {
  const a = N[e[0]],
    b = N[e[1]];
  if (e.length < 3) return `M${a[1]} ${a[2]}L${b[1]} ${b[2]}`;
  const [cx, cy, r] = e.slice(2),
    a0 = Math.atan2(a[2] - cy, a[1] - cx);
  let d = Math.atan2(b[2] - cy, b[1] - cx) - a0;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return `M${a[1]} ${a[2]}A${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${b[1]} ${b[2]}`;
};
const body = (lab = 70) =>
  [
    `<path d="${E.map(edge).join('')}" fill="none" stroke="#4a4f5c" stroke-width="6"/>`,
    ...N.map(n => `<circle cx="${n[1]}" cy="${n[2]}" r="${RR[n[3]]}" fill="${COL[n[3]]}"/>`),
    ...J.map(j => {
      const a = I[j.anchor];
      return `<line x1="${a[1]}" y1="${a[2]}" x2="${j.x}" y2="${j.y}" stroke="#ff3df0" stroke-width="8"/>`;
    }),
    ...J.map(
      j =>
        `<rect x="${j.x - 22}" y="${j.y - 22}" width="44" height="44" transform="rotate(45 ${j.x} ${j.y})" fill="#ff3df0" stroke="#fff" stroke-width="6"/>` +
        `<text x="${j.x + 34}" y="${j.y - 30}" font-size="${lab}" font-family="sans-serif" font-weight="700" fill="#ff3df0" stroke="#000" stroke-width="${lab / 8}" paint-order="stroke">${j.id}</text>`
    )
  ].join('\n');
const W = 5300;
fs.writeFileSync(
  path.join(__dirname, 'tree_J.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-W} ${-W} ${2 * W} ${2 * W}" width="2400" height="2400">
<rect x="${-W}" y="${-W}" width="${2 * W}" height="${2 * W}" fill="#14161c"/>
${body(130)}
<text x="${-W + 80}" y="${-W + 200}" font-size="150" font-family="sans-serif" fill="#ddd">num-tree-v4-jewel18c：18 個珠寶孔（洋紅菱形＋掛點→孔的線）</text>
</svg>\n`
);
/* 近看：每孔以孔為中心 ±400 */
const inner = body(26);
const cells = J.map(j => {
  const a = I[j.anchor];
  return `<figure><svg viewBox="${j.x - 400} ${j.y - 400} 800 800" width="300" height="300"><rect x="${j.x - 400}" y="${j.y - 400}" width="800" height="800" fill="#14161c"/>${inner}</svg><figcaption>${j.id} ${j.kind} 掛 ${j.anchor}</figcaption></figure>`;
}).join('');
fs.writeFileSync(
  path.join(__dirname, 'closeups.html'),
  `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#000;color:#ddd;font:14px sans-serif;display:grid;grid-template-columns:repeat(6,300px);gap:6px;padding:6px;width:max-content}figure{margin:0}figcaption{text-align:center}</style>${cells}`
);
(async () => {
  const { chromium } = require('playwright'),
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }),
    pg = await b.newPage({ deviceScaleFactor: 1 });
  await pg.setViewportSize({ width: 2400, height: 2400 });
  await pg.goto('file://' + path.join(__dirname, 'tree_J.svg'));
  await pg.screenshot({ path: path.join(__dirname, 'tree_J.png') });
  await pg.setViewportSize({ width: 1500, height: 400 });
  await pg.goto('file://' + path.join(__dirname, 'closeups.html'));
  await pg.screenshot({ path: path.join(__dirname, 'closeups.png'), fullPage: true });
  fs.unlinkSync(path.join(__dirname, 'closeups.html'));
  await b.close();
  console.log('寫好 tree_J.svg、tree_J.png、closeups.png；J ' + J.length + ' 個');
})();
