const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' }); const out = {};
  for (const [n, port] of [['main', 8101], ['pr', 8102]]) { const p = await b.newPage(); await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(800);
    out[n] = await p.evaluate(() => { const o = {}; for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } for (const r of rules) if (r.selectorText === ':root') for (const k of r.style) if (k.startsWith('--')) o[k] = r.style.getPropertyValue(k).trim(); } return o; }); await p.close(); }
  const ks = new Set([...Object.keys(out.main), ...Object.keys(out.pr)]); const diff = [...ks].filter(k => out.main[k] !== out.pr[k]).map(k => [k, out.main[k], out.pr[k]]);
  console.log('root vars main', Object.keys(out.main).length, 'pr', Object.keys(out.pr).length, 'diff', JSON.stringify(diff));
  require('fs').writeFileSync(process.argv[2], JSON.stringify({ nMain: Object.keys(out.main).length, nPr: Object.keys(out.pr).length, diff }, null, 1)); await b.close(); })();
