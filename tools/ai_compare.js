const fs = require('fs'),
  path = require('path'),
  { execSync } = require('child_process');
/* dungeonPOE · AI 試玩自動比對（M2-03）：讀 tools/camp_run.js 的 JSON，比 M2-03 完成標準（卡關 ≤5 分鐘、30 分鐘新東西 ≥10）
   與上一版的 A1–A10。tools/ai_report.js 跑完會自動呼叫並把結果接在 A1-A10.md 後面；也可以單獨跑（不重跑 camp_run）：
   node tools/ai_compare.js <本版資料夾> [基準資料夾]   基準省略＝evidence/ 裡其他有 A1-A10.md 的資料夾中 commit 最新的那份
   node tools/ai_compare.js --test                      自我檢查 */
const IDS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'],
  MUST = ['390×844', '1280×720'],
  sec = v => {
    const m = /^(\d+):(\d\d)/.exec(v);
    if (!m) throw new Error('A2 讀不到時間：' + v);
    return +m[1] * 60 + +m[2];
  },
  n30 = v => {
    const m = /30 分鐘 (\d+) 個/.exec(v);
    if (!m) throw new Error('A3 讀不到 30 分鐘個數：' + v);
    return +m[1];
  },
  mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
  mark = o => (o.startsWith('✅') ? '✅' : o.startsWith('❌') ? '❌' : '—'),
  sign = d => (d > 0 ? '+' : '') + d;

/* 每個尺寸取跑最久的那份 JSON */
function load(dir) {
  const R = {};
  for (const f of fs.readdirSync(dir).filter(f => /^\d+x\d+_\d+m\.json$/.test(f))) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (j.tables && (!R[j.size] || j.min > R[j.size].min)) R[j.size] = j;
  }
  return R;
}
const row = (j, w, id) => j.tables[w].find(a => a.id === id);

function compare(cur, base, curName, baseName) {
  const rank = s => (MUST.includes(s) ? MUST.indexOf(s) : 9),
    sizes = Object.keys(cur).sort((a, b) => rank(a) - rank(b)),
    miss = MUST.filter(s => !cur[s]),
    L = [`## M2-03 完成標準（卡關 ≤ 5 分鐘、30 分鐘新東西 ≥ 10）`, ''];
  L.push('| 尺寸 | 卡關（A2，最長沒有新東西） | 30 分鐘新東西（A3） | 結果 |', '| --- | --- | --- | --- |');
  let pass = !miss.length;
  for (const s of sizes) {
    const j = cur[s],
      st = sec(row(j, j.min, 'A2').v),
      n = n30(row(j, 30, 'A3').v),
      ok = st <= 300 && n >= 10;
    if (MUST.includes(s)) pass = pass && ok;
    L.push(
      `| ${s}（${j.min} 分）${MUST.includes(s) ? '' : '（參考）'} | ${st <= 300 ? '✅' : '❌'} ${mmss(st)} | ${n >= 10 ? '✅' : '❌'} ${n} 個 | ${ok ? '✅ 達標' : '❌ 未達標'} |`
    );
  }
  L.push(
    '',
    `**完成標準（${MUST.join('、')} 都要過）：${pass ? '✅ 達標' : '❌ 未達標'}**${miss.length ? `（缺 ${miss.join('、')}）` : ''}`,
    ''
  );
  if (!base)
    return { md: L.concat('沒有上一版可比（evidence/ 裡沒有其他 A1-A10.md）。', '').join('\n'), pass, worse: 0 };
  const both = sizes.filter(s => base[s] && base[s].tables[30]),
    win = s =>
      Math.max(
        ...Object.keys(cur[s].tables)
          .filter(w => base[s].tables[w])
          .map(Number)
      );
  let worse = 0,
    better = 0;
  const cell = (s, id) => {
    const w = win(s),
      a = row(base[s], w, id),
      b = row(cur[s], w, id),
      x = mark(a.ok),
      y = mark(b.ok);
    let t = x === y ? `${y} 不變` : `${x}→${y}`;
    if (x === '✅' && y === '❌') (t += ' **退步**'), worse++;
    if (x === '❌' && y === '✅') (t += ' 進步'), better++;
    if (id === 'A2') t += `<br>${mmss(sec(a.v))}→${mmss(sec(b.v))}（${sign(sec(b.v) - sec(a.v))} 秒）`;
    if (id === 'A3') t += `<br>30 分鐘 ${n30(a.v)}→${n30(b.v)} 個（${sign(n30(b.v) - n30(a.v))}）`;
    return t;
  };
  const sha = R => [...new Set(Object.values(R).map(j => j.sha))].join('／');
  L.push(
    `## 與上一版比對`,
    '',
    `本版 \`${curName}\`（${sha(cur)}）對 \`${baseName}\`（${sha(base)}）；每個尺寸用兩邊都有的最長時間窗比。`,
    '',
    `| # | ${both.map(s => `${s}（${win(s)} 分）`).join(' | ')} |`,
    `| --- | ${both.map(() => '---').join(' | ')} |`,
    ...IDS.map(id => `| ${id} | ${both.map(s => cell(s, id)).join(' | ')} |`),
    '',
    `**退步 ${worse} 格、進步 ${better} 格**${worse ? '（退步的要在 PR 說明講原因）' : ''}${sizes.length > both.length ? `；上一版沒有：${sizes.filter(s => !base[s]).join('、')}` : ''}`,
    ''
  );
  return { md: L.join('\n'), pass, worse };
}

/* 上一版：evidence/ 裡其他有 A1-A10.md 的資料夾，取 commit 時間最新的（commit 找不到就排最後） */
function prev(dir) {
  const ev = path.join(__dirname, '..', 'evidence'),
    me = load(dir),
    mine = new Set(Object.values(me).map(j => j.sha)),
    t = s => {
      try {
        return +execSync(`git show -s --format=%ct ${s}`, { cwd: __dirname, stdio: 'pipe' }).toString();
      } catch (e) {
        return 0;
      }
    };
  return fs
    .readdirSync(ev)
    .map(d => path.join(ev, d))
    .filter(d => path.resolve(d) !== path.resolve(dir) && fs.existsSync(path.join(d, 'A1-A10.md')))
    .map(d => ({ d, R: load(d) }))
    .filter(x => Object.values(x.R).length && !Object.values(x.R).some(j => mine.has(j.sha)))
    .map(x => ({ ...x, t: Math.max(...Object.values(x.R).map(j => t(j.sha))) }))
    .sort((a, b) => b.t - a.t)[0];
}

function run(dir, baseDir) {
  const p = baseDir ? { d: baseDir, R: load(baseDir) } : prev(dir),
    r = compare(load(dir), p && p.R, dir, p && path.relative(path.join(__dirname, '..'), path.resolve(p.d)));
  fs.writeFileSync(path.join(dir, '比對.md'), r.md);
  return r;
}

function test() {
  const tab = (a2, a3, a5) => [
    ...IDS.map(id => ({ id, v: '—', ok: '✅ 達標' })).map(r =>
      r.id === 'A2'
        ? { id: 'A2', v: `${a2}（…）`, ok: sec(a2) <= 300 ? '✅ 達標' : '❌ 未達標' }
        : r.id === 'A3'
          ? { id: 'A3', v: `30 分鐘 ${a3} 個；第一小時 —`, ok: a3 >= 10 ? '✅ 達標' : '❌ 未達標' }
          : r.id === 'A5'
            ? { id: 'A5', v: '—', ok: a5 }
            : r
    )
  ];
  const J = (size, sha, a2, a3, a5 = '✅ 達標') => ({ size, sha, min: 30, tables: { 30: tab(a2, a3, a5) } }),
    base = { '390×844': J('390×844', 'b', '6:20', 9), '1280×720': J('1280×720', 'b', '3:00', 12) },
    cur = { '390×844': J('390×844', 'c', '4:10', 11), '1280×720': J('1280×720', 'c', '3:30', 12, '❌ 未達標') },
    eq = (a, b, m) => {
      if (a !== b) throw new Error(`❌ ${m}：${a} ≠ ${b}`);
      console.log('✅ ' + m);
    };
  let r = compare(cur, base, 'c', 'b');
  eq(r.pass, true, '兩尺寸卡關 ≤5 分、30 分鐘 ≥10 → 達標');
  eq(r.worse, 1, 'A5 ✅→❌ 算退步 1 格');
  eq(/6:20→4:10（-130 秒）/.test(r.md), true, 'A2 列出時間差');
  eq(/30 分鐘 9→11 個（\+2）/.test(r.md), true, 'A3 列出個數差');
  eq(/❌→✅ 進步/.test(r.md), true, 'A2、A3 未達→達標標成進步');
  r = compare(base, null, 'b');
  eq(r.pass, false, '390×844 卡關 6:20、9 個 → 未達標');
  eq(/沒有上一版可比/.test(r.md), true, '沒有基準時照樣出完成標準表');
  eq(compare({ '390×844': cur['390×844'] }, null, 'c').pass, false, '缺 1280×720 → 未達標');
  let bad = 0;
  try {
    sec('沒開刷');
  } catch (e) {
    bad = 1;
  }
  eq(bad, 1, '讀不到 A2 時間會報錯，不會靜靜算成 0');
}

module.exports = { run, compare, load };
if (require.main === module) {
  if (process.argv[2] === '--test') test();
  else if (!process.argv[2]) throw new Error('用法：node tools/ai_compare.js <本版資料夾> [基準資料夾]｜--test');
  else console.log(run(process.argv[2], process.argv[3]).md);
}
