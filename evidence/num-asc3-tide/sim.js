/* num-asc3-tide 跑模擬：Playwright 開本機遊戲（?dbg=1&seed=種子），注入 simlib.js，照 jobs 檔一個一個跑，結果一行一個 JSON 附加到輸出檔。
   用法：先在 repo 根目錄開 python3 -m http.server 8000；node sim.js <jobs.json> <out.jsonl> [平行頁數 4]
   每個 job 用新的瀏覽器環境（空的 localStorage）。已經在 out.jsonl 裡的 job（同 id）跳過，可以中斷後接著跑。瀏覽器：/opt/pw-browsers/chromium（環境變數 PW_CHROME 可改） */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path');
const [, , JOBS, OUT, NP = 4] = process.argv;
const URL = process.env.URL || 'http://localhost:8000/';
const LIB = fs.readFileSync(path.join(__dirname, 'simlib.js'), 'utf8');
const jobs = JSON.parse(fs.readFileSync(JOBS, 'utf8'));
const done = new Set(
  fs.existsSync(OUT)
    ? fs
        .readFileSync(OUT, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map(l => JSON.parse(l).id)
    : []
);
const todo = jobs.filter(j => !done.has(j.id));
console.log(`jobs ${jobs.length}，已完成 ${done.size}，要跑 ${todo.length}`);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  let k = 0,
    n = 0;
  const t0 = Date.now();
  const worker = async () => {
    while (k < todo.length) {
      const j = todo[k++];
      /* 每個 job 一個新的瀏覽器環境（localStorage 是空的＝新存檔）：同一頁換網址時，上一局離開前會把它的存檔寫回去，會污染下一局 */
      const ctx = await b.newContext({ viewport: { width: 640, height: 400 } });
      /* 測試絕對不碰雲端 */
      await ctx.route('**/*.supabase.co/**', r => r.abort());
      const p = await ctx.newPage();
      let err = null,
        r;
      p.on('pageerror', e => (err = err || e.message));
      try {
        await p.goto(URL + `?dbg=1&seed=${j.seed}&p=9`);
        await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof proSkip === 'function');
        await p.addScriptTag({ content: LIB });
        r = await p.evaluate(cfg => __sim.run(cfg), j.cfg);
      } catch (e) {
        r = { error: String(e.message || e).slice(0, 300) };
      }
      if (err) r.pageerror = err;
      await ctx.close();
      fs.appendFileSync(OUT, JSON.stringify({ id: j.id, tag: j.tag, ...r }) + '\n');
      n++;
      if (n % 20 === 0) console.log(`${n}/${todo.length}  ${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
    }
  };
  await Promise.all(Array.from({ length: +NP }, worker));
  await b.close();
  console.log(`完成 ${n}，${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
})();
