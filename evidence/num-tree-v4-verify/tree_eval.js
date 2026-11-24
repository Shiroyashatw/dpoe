/* num-tree-v4-verify：node tree_eval.js <覆寫檔.js>：套覆寫→產生樹→寫暫存 ptdata→跑 tree_quick（天賦樹相關檢查），印 ❌ 與各主題叢集（照路） */
const fs = require('fs'),
  path = require('path'),
  cp = require('child_process'),
  L = require('./tree_lib.js'),
  { pt2Audit } = require(path.join(L.ROOT, 'tools/tree_bake.js'));
function evaluate(ovr, tag = 'x') {
  const { T, env } = L.gen(ovr),
    f = path.join(require('os').tmpdir(), `ptd_${tag}_${process.pid}.js`);
  fs.writeFileSync(f, L.bakeSrc(T, pt2Audit));
  const out = cp.execFileSync('node', [path.join(__dirname, 'tree_quick.js')], {
    env: { ...process.env, PTDATA: f, OVR: ovr },
    encoding: 'utf8',
    maxBuffer: 1e8
  });
  const c = L.counts(T, env);
  return {
    bad: out.split('\n').filter(l => l.startsWith('❌')),
    out,
    counts: Object.fromEntries(env.PT_THEME.map((t, i) => [t.n, c[i].join('')])),
    file: f,
    T,
    env
  };
}
module.exports = { evaluate };
if (require.main === module) {
  const ovr = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : '';
  const r = evaluate(ovr);
  console.log(r.bad.join('\n'));
  if (process.argv[3] === 'c') console.log(JSON.stringify(r.counts));
}
