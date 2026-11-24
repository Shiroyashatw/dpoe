/* num-tree-v4-verify：在記憶體裡套一段覆寫（PT_RW／rg／PT_FIX），用 tools/tree_bake.js 的 ptreeGen2 產生樹、算各主題叢集數。
   只給迭代用；最後的覆寫寫回 js/data.js，正式結果看 node tools/tree_bake.js＋node tools/check.js */
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const ROOT = path.join(__dirname, '../..'),
  J = f => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'),
  { ptreeGen2 } = require(path.join(ROOT, 'tools/tree_bake.js'));
function mkCtx(ptdataSrc, ovr = '') {
  const ctx = { console, Math, Date, JSON, Object, Array, location: { search: '' }, URLSearchParams, PAL_CSS: fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8') };
  vm.createContext(ctx);
  vm.runInContext(J('palette.js'), ctx);
  vm.runInContext(ptdataSrc || J('ptdata.js'), ctx);
  vm.runInContext(J('data.js'), ctx);
  if (ovr) vm.runInContext(ovr, ctx);
  return ctx;
}
const road = c => Math.round((((Math.atan2(c.x, -c.y) * 180) / Math.PI + 360) % 360) / 60) % 6;
function gen(ovr) {
  const ctx = mkCtx(null, ovr),
    env = vm.runInContext('({ PT_THEME, PT_TH, PT_RW, PT_KEYS, PT_ROADS, PT_RSV, PT_STARTS, PT_FIX })', ctx),
    T = ptreeGen2(env);
  return { ctx, env, T };
}
/* 跟 tree_bake.js 寫檔同一套 */
function bakeSrc(T, pt2Audit) {
  const r1 = x => Math.round(x * 10) / 10,
    idx = Object.fromEntries(T.N.map((n, i) => [n.id, i])),
    rows = T.N.map(n => {
      const t = n.gate ? 4 : n.big === 2 ? 3 : n.tk ? 0 : n.lock ? (n.big ? 7 : 6) : n.sv != null ? 5 : n.big ? 2 : 1,
        v = t === 4 ? +n.id.slice(1) : t === 3 ? +n.id.slice(2) : t === 5 ? n.g * 4 + n.sv : t > 5 ? n.lock - 1 : t ? n.v : 0;
      return [n.id, r1(n.x), r1(n.y), t, n.th || 0, v];
    }),
    edges = T.E.map(([a, b]) => {
      const c = T.ARC[a + '|' + b];
      return c ? [idx[a], idx[b], r1(c[0]), r1(c[1]), r1(c[2])] : [idx[a], idx[b]];
    }),
    cl = T.CL.map(c => [Math.round(c.x), Math.round(c.y), c.lock ? -c.lock : c.th, c.maxR]),
    A = pt2Audit(T),
    M = Object.fromEntries(Object.entries(A).filter(([k]) => k[0] !== '_'));
  return '/* tools/tree_bake.js 產生，不要手改：天賦樹的形狀（點、線、叢集）。效果在 data.js 的 PT_THEME */\nconst PT_BAKE = ' + JSON.stringify({ N: rows, E: edges, C: cl, M }) + ';\n';
}
function counts(T, env) {
  const c = env.PT_THEME.map(() => []);
  for (const x of T.CL) if (!x.lock && x.th != null) c[x.th].push(road(x));
  return c;
}
module.exports = { mkCtx, gen, bakeSrc, counts, road, ROOT };
