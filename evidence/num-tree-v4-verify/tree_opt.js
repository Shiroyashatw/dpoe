/* num-tree-v4-verify：PT_RW 迭代（docs/天賦樹設計.md 第 7 節「PT_RW 用迭代調過」的做法）。
   固定的覆寫（BASE：rg、PT_FIX）不動，只調 PT_RW：每輪各主題 rw ×（目標叢集數＋0.5）÷（這輪叢集數＋0.5）的 0.6 次方；
   目標＝main 的叢集數（固定擺法與鎖住的主題不調）；檢查不過的項目給對應主題目標 +1。種子不換（tree_bake.js 的 20261106）。
   node tree_opt.js <BASE 覆寫檔> <main 叢集數 json> <輪數> <輸出 json> */
const fs = require('fs'),
  { evaluate } = require('./tree_eval.js');
const [BASEF, TGF, NIT = 12, OUT = 'opt.json', START] = process.argv.slice(2),
  /* Q5 甲「不能擠掉別的大點」：每種武器上樹的大點不少於 main（main_nt_on_tree.json） */
  MAINNT = require('./main_nt_on_tree.json'),
  BASE = fs.readFileSync(BASEF, 'utf8'),
  TG0 = JSON.parse(fs.readFileSync(TGF, 'utf8'));
let rw = START ? JSON.parse(fs.readFileSync(START, 'utf8')).rw : null,
  extra = {},
  hist = [];
const mk = rw => BASE + '\n' + (rw ? `Object.assign(PT_RW, ${JSON.stringify(rw)});` : '');
for (let it = 0; it < +NIT; it++) {
  const r = evaluate(mk(rw), 'opt'),
    fix = new Set(r.env.PT_FIX.map(x => x[0]));
  if (!rw) rw = { ...r.env.PT_RW };
  const on = new Set(
      r.T.N.filter(n => n.big === 1 && !n.gate && !n.lock && n.v != null).map(
        n => (r.env.PT_THEME[n.th].nt[n.v] || [])[0]
      )
    ),
    lostW = r.env.PT_THEME.filter(T => T.wp && !['flail', 'talisman'].includes(T.wp)).flatMap(T =>
      (MAINNT[T.n] || []).filter(x => !on.has(x)).map(x => [T.n, x])
    ),
    xb = r.env.PT_THEME[r.env.PT_TH['十字弓術']].nt.filter(x => !on.has(x[0])).map(x => x[0]);
  if (lostW.length) r.bad.unshift('❌ 武器大點比 main 少 ' + lostW.map(x => x.join(':')).join(' '));
  if (xb.length) r.bad.unshift('❌ 十字弓大點沒上樹 ' + xb.join(' '));
  for (const [n] of lostW) extra[n] = Math.min(2, (extra[n] || 0) + 0.5);
  const dev = Object.entries(r.counts)
    .filter(([n]) => n !== '基礎' && !fix.has(n))
    .reduce((s, [n, c]) => s + Math.abs(c.length - (TG0[n] || 0)), 0);
  hist.push({ it, bad: r.bad, dev, rw: { ...rw } });
  /* 天賦樹檢查都過了才跑 dmg_check（只跑鐵金剛與對照，main 只有「鐵金剛太硬」一個 ❌）：複製一份 js 到 SIM 換 ptdata 跑 */
  if (process.env.SIM && r.bad.length === 1) {
    fs.copyFileSync(r.file, process.env.SIM + '/js/ptdata.js');
    const d = require('child_process').execFileSync(
        'node',
        [process.env.SIM + '/tools/dmg_check.js', '--only', '鐵金剛,鐵金剛－'],
        { encoding: 'utf8', maxBuffer: 1e8 }
      ),
      dl = d.split('\n').filter(l => l.includes('❌'));
    const extraD = dl.filter(l => !(l.startsWith('鐵金剛　　 被王打一下') && /太硬/.test(l)));
    if (extraD.length)
      r.bad.unshift('❌ dmg_check 比 main 多：' + extraD.map(l => l.replace(/\s+/g, ' ').slice(0, 60)).join(' | '));
    /* 鐵金剛－ 比 main 拿了更多護甲、更少近戰與盾（--why：armorP 689 vs 434、meleeP 276 vs 403、shieldP 0 vs 81）：近戰、格擋與盾、錘的目標 +1 */
    if (extraD.some(l => /太強|太硬/.test(l)))
      for (const n of ['近戰', '格擋與盾', '錘術']) extra[n] = Math.min(3, (extra[n] || 0) + 1);
  }
  console.log(
    `#${it} ❌${r.bad.length - 1} 偏差 ${dev} :: ${r.bad
      .slice(0, -1)
      .map(s => s.slice(0, 90))
      .join(' | ')}`
  );
  fs.writeFileSync(OUT, JSON.stringify(hist, null, 1));
  if (r.bad.length === 1) break;
  /* 不過的項目給目標 +1 */
  for (const b of r.bad) {
    const m = /大點名字全部上樹 (.*)$/.exec(b);
    if (m)
      for (const name of m[1].split(' '))
        for (const T of r.env.PT_THEME) if (T.nt.some(x => x[0] === name)) extra[T.n] = (extra[T.n] || 0) + 1;
    if (/能量護盾叢集在暗影之路/.test(b)) extra['能量護盾'] = (extra['能量護盾'] || 0) + 1;
    if (/護甲叢集/.test(b)) extra['護甲'] = (extra['護甲'] || 0) + 1;
    if (/chgUseHeal/.test(b)) extra['盛怒'] = (extra['盛怒'] || 0) + 1;
    if (/parryR/.test(b)) extra['招架'] = (extra['招架'] || 0) + 1;
    if (/定身累積 [0-5]、/.test(b)) extra['重擊'] = (extra['重擊'] || 0) + 1;
    if (/緩速降低 [0-5]、/.test(b)) extra['回復'] = (extra['回復'] || 0) + 1;
    if (/存在範圍 [0-5] 個/.test(b)) extra['精魂光環'] = (extra['精魂光環'] || 0) + 1;
    if (/castMoveP/.test(b)) (extra['身法'] = (extra['身法'] || 0) + 0.5), (extra['法術'] = (extra['法術'] || 0) + 0.5);
  }
  for (const [n, c] of Object.entries(r.counts)) {
    if (n === '基礎' || fix.has(n) || !(n in rw)) continue;
    const tg = (TG0[n] || 0) + (extra[n] || 0);
    rw[n] = +(rw[n] * Math.pow((tg + 0.5) / (c.length + 0.5), 0.6)).toFixed(3);
  }
}
