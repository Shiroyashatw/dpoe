/* 從 evidence/names/unlock_compare.csv 與本次 camp_*.csv 組 camp_unlock_compare.csv（在 evidence/m1-28/ 底下跑：node camp_compare.js 倉庫根目錄） */
const fs = require('fs'), REPO = process.argv[2] || '../..';
const read = f => { const L = fs.readFileSync(f, 'utf8').split(/\r?\n/); const i = L.findIndex(l => l.startsWith('解鎖句')); const m = {}; for (const l of L.slice(i + 1)) { const [k, s] = l.split(','); if (k && !(k in m)) m[k] = (+s / 60).toFixed(2); } return m; };
const NL = fs.readFileSync(REPO + '/evidence/names/unlock_compare.csv', 'utf8').split(/\r?\n/), h = NL[0].split(','), n = {};
for (const l of NL.slice(1)) { const c = l.split(','); if (c[0]) n[c[0]] = c; }
const K = ['民房 Lv1', '鍛造台 Lv1', '瞭望台 Lv1', '祭壇 Lv1', '鍛造台 Lv2', '民房 Lv2', '鍛造台 Lv3'];
const o = ['場次,' + K.join(',') + ',平均靈魂/分'];
for (const [nm, c] of [['550版 390×844（evidence/names）', 'before_390x844'], ['550版 1280×720（evidence/names）', 'before_1280x720'], ['240版 390×844（evidence/names）', 'after_390x844'], ['240版 1280×720（evidence/names）', 'after_1280x720']]) {
  const j = h.indexOf(c); o.push([nm, ...K.map(k => (n[k] && n[k][j]) || '未達'), n['靈魂／分（每分鐘平均）'][j]].join(','));
}
for (const [nm, f] of [['候選A 靈魂200／鐵T1 150 390×844', 'camp_candA_390x844.csv'], ['候選A 靈魂200／鐵T1 150 1280×720', 'camp_candA_1280x720.csv'], ['候選F（推薦）靈魂200／鐵T1 130 390×844', 'camp_candF_390x844.csv'], ['候選F（推薦）靈魂200／鐵T1 130 1280×720（重跑）', 'camp_candF_1280x720.csv'], ['候選F 1280×720 第一場（第9分起AI卡住，無效）', 'camp_candF_1280x720_stuck_AI卡住無效.csv'], ['候選F 390×844 第二場（第7分起AI卡住，無效）', 'camp_candF_390x844_rep2_AI卡住無效.csv']]) {
  const m = read(f), L = fs.readFileSync(f, 'utf8').split('\n').slice(1).filter(l => /^\d+,/.test(l)).map(l => +l.split(',')[4]);
  o.push([nm, ...K.map(k => m[k] || '未達'), Math.round(L.reduce((a, b) => a + b, 0) / L.length)].join(','));
}
fs.writeFileSync('camp_unlock_compare.csv', o.join('\n') + '\n'); console.log(o.join('\n'));
