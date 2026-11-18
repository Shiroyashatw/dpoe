const { spawn, execSync } = require('child_process');
const fs = require('fs'),
  path = require('path');
/* dungeonPOE · 每版 AI 試玩報告（M2-10）：五個尺寸同時跑 tools/camp_run.js，把 A1–A10 收成一張總表 A1-A10.md。
   用法：先開本機伺服器（python3 -m http.server 8000），node tools/ai_report.js <輸出資料夾，例 evidence/<代號>> [網址] [--base=<上一版資料夾>]
   跑完自動用 tools/ai_compare.js 比完成標準與上一版（省略 --base 就找 evidence/ 裡 commit 最新的 A1-A10.md），接在 A1-A10.md 後面。
   390×844、1280×720 跑 120 分鐘（A5 要 2 小時），375×667、844×390、1440×900 跑 30 分鐘（遊戲內時間）。
   資料夾裡已有同一個 commit 的 JSON 就不重跑（某個尺寸失敗時只補那一個）。門檻見 docs/production/specs/M2-03-addictiveness-criteria.md */
const A = process.argv.slice(2).filter(a => !a.startsWith('--base=')),
  BASE = (process.argv.find(a => a.startsWith('--base=')) || '').slice(7) || undefined,
  OUT = A[0],
  URL = A[1] || 'http://localhost:8000/',
  SIZES = [
    [390, 844, 120],
    [1280, 720, 120],
    [375, 667, 30],
    [844, 390, 30],
    [1440, 900, 30]
  ];
if (!OUT) throw new Error('用法：node tools/ai_report.js <輸出資料夾> [網址]');
fs.mkdirSync(OUT, { recursive: true });
const sha = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim(),
  file = ([w, h, m]) => path.join(OUT, `${w}x${h}_${m}m.json`),
  fresh = s => fs.existsSync(file(s)) && JSON.parse(fs.readFileSync(file(s), 'utf8')).sha === sha;
const run = s =>
  new Promise(ok => {
    if (fresh(s)) return ok(0);
    const log = fs.createWriteStream(file(s).replace(/json$/, 'log')),
      p = spawn('node', [path.join(__dirname, 'camp_run.js'), URL, s[2], s[0], s[1], OUT]);
    p.stdout.pipe(log), p.stderr.pipe(log);
    p.on('close', c => (console.log(`${s[0]}×${s[1]} ${s[2]} 分：${c ? '❌ 失敗（看 .log）' : '完成'}`), ok(c)));
  });
(async () => {
  await Promise.all(SIZES.map(run));
  const R = SIZES.filter(fresh).map(s => JSON.parse(fs.readFileSync(file(s), 'utf8'))),
    lost = SIZES.filter(s => !fresh(s)).map(s => `${s[0]}×${s[1]}`),
    spec = fs.readFileSync(path.join(__dirname, '..', 'docs/production/specs/M2-03-addictiveness-criteria.md'), 'utf8'),
    name = id =>
      (spec.match(new RegExp(`^\\| ${id} \\| ([^|]+) \\| ([^|]+) \\|`, 'm')) || []).slice(1).map(x => x.trim()),
    cell = s => s.replace(/\|/g, '／'),
    md =
      [
        `# A1–A10 AI 試玩報告`,
        '',
        `版本 ${R[0] ? R[0].ver : '?'}・commit ${sha}・\`node tools/ai_report.js ${OUT}\`・遊戲內時間${lost.length ? `・**沒跑完：${lost.join('、')}**` : ''}`,
        '',
        `| # | 指標 | 門檻 | ${R.map(r => `${r.size}（${r.min} 分）`).join(' | ')} |`,
        `| --- | --- | --- | ${R.map(() => '---').join(' | ')} |`,
        ...['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'].map(id => {
          const [n, t] = name(id);
          return `| ${id} | ${n} | ${t} | ${R.map(r => {
            const x = r.tables[r.min].find(a => a.id === id);
            return cell(`${x.ok.split('（')[0]}<br>${x.v}`);
          }).join(' | ')} |`;
        }),
        '',
        `AI 異常（畫面 30 秒不動等）：${R.map(r => `${r.size} ${r.flag.length} 筆`).join('、')}；頁面錯誤：${R.map(r => `${r.size} ${r.errs.length}`).join('、')}。各尺寸的 30 分鐘表、資源曲線、決策紀錄在同資料夾的 \`<寬>x<高>_<分>m.md\`。`,
        ''
      ].join('\n') +
      '\n' +
      require('./ai_compare.js').run(OUT, BASE).md;
  fs.writeFileSync(path.join(OUT, 'A1-A10.md'), md);
  console.log('\n' + md);
  if (lost.length) process.exit(1);
})();
