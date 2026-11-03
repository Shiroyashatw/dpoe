/* dungeonPOE · 共用工具：$、固定亂數、跳脫、調色 */
'use strict';
const $ = id => document.getElementById(id),
  fl = Math.floor;
/* ================= utils ================= */
function h(x, y, s = 0) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return n >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function hex2rgb(c) {
  c = c.replace('#', '');
  if (c.length === 3)
    c = c
      .split('')
      .map(x => x + x)
      .join('');
  const n = parseInt(c, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(c, f) {
  const [r, g, b] = hex2rgb(c),
    t = f > 0 ? 255 : 0,
    a = Math.abs(f),
    hx = v =>
      Math.round(v + (t - v) * a)
        .toString(16)
        .padStart(2, '0');
  return '#' + hx(r) + hx(g) + hx(b);
}
