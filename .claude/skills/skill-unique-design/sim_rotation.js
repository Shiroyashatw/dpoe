/* 技能草案的出招模擬（skill skill-unique-design）：照掛機 AI 的規則粗估每把武器 60 秒內各招放幾次。只讀不改。
   node .claude/skills/skill-unique-design/sim_rotation.js [草案檔…]   沒給檔就跑 docs/production/技能草案-*.md
   規則（ai.js 的 aiOrder）：技能欄 5 格；冷卻好的招照順序放，都放不出來才用普攻。這裡每把武器取「第一招普攻＋冷卻最長的 4 招」當一套。
   shortcut: 每次出手固定 0.6 秒、不算資源與條件（條件使用的招當成隨時可放），所以是上限；要準的數字等招進了遊戲跑 tools/dmg_check.js */
'use strict';
const fs = require('fs'),
  path = require('path');
const DIR = path.join(__dirname, '..', '..', '..', 'docs', 'production');
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs
      .readdirSync(DIR)
      .filter(f => /^技能草案-.*\.md$/.test(f) && !/光環/.test(f))
      .map(f => path.join(DIR, f));
const ACT = 0.6,
  T = 60;
/* 冷卻欄 → { cd, n }：「無」＝普攻；「存 3 個，各 4 秒」「2 顆，各 4 秒」「6 發，裝填 1.5 秒」＝次數制；「現 0 → 4 秒」取箭頭後面 */
function parse(cell) {
  const c = cell.replace(/.*→/, '');
  if (/^\s*無/.test(c)) return { cd: 0, n: 1 };
  const m = c.match(/(\d+)\s*(?:個|顆|隻|根|次|發).*?(\d+(?:\.\d+)?)\s*秒/);
  if (m) return { cd: +m[2], n: +m[1], mag: /發/.test(c) };
  const s = c.match(/(\d+(?:\.\d+)?)\s*秒/);
  return s ? { cd: +s[1], n: 1 } : null;
}
function sim(skills) {
  const fill = skills.find(s => !s.cd),
    rest = skills
      .filter(s => s.cd)
      .sort((a, b) => b.cd - a.cd)
      .slice(0, 4),
    use = {};
  if (!fill) return null;
  for (const s of rest) (s.left = s.n), (s.ready = []);
  for (let t = 0; t < T; t += ACT) {
    for (const s of rest) while (s.ready.length && s.ready[0] <= t) s.ready.shift(), s.mag ? (s.left = s.n) : s.left++;
    const s = rest.find(s => s.left > 0) || fill;
    use[s.name] = (use[s.name] || 0) + 1;
    if (s !== fill) {
      s.left--;
      /* 彈匣：打空才裝填、一次補滿；其他次數制：用掉一個就開始補那一個 */
      if (!s.mag) s.ready.push(t + s.cd);
      else if (!s.left) s.ready.push(t + s.cd);
    }
  }
  return { use, fill: fill.name, set: rest.map(s => s.name) };
}
let warn = 0;
for (const f of files) {
  const L = fs.readFileSync(f, 'utf8').split('\n');
  let sec = '';
  for (let i = 0; i < L.length; i++) {
    if (/^#{2,3} /.test(L[i])) sec = L[i].replace(/^#+ /, '');
    if (!/^\|\s*招\s*\|/.test(L[i]) || /現有/.test(sec)) continue;
    const head = L[i].split('|').map(x => x.trim()),
      ci = head.findIndex(x => /冷卻|充能|彈匣/.test(x));
    if (ci < 0) continue;
    const skills = [];
    for (let j = i + 2; j < L.length && L[j].startsWith('|'); j++) {
      const c = L[j].split('|').map(x => x.trim()),
        p = parse(c[ci] || '');
      if (p) skills.push({ name: c[1], ...p });
    }
    const r = sim(skills);
    if (!r) {
      console.log(`⚠️ ${sec}：沒有普攻（沒冷卻的招），AI 冷卻都沒好時沒東西可放`);
      warn++;
      continue;
    }
    const tot = Object.values(r.use).reduce((a, b) => a + b, 0),
      pct = k => Math.round(((r.use[k] || 0) / tot) * 100),
      top = Object.keys(r.use).sort((a, b) => r.use[b] - r.use[a])[0];
    const flags = [];
    if (pct(r.fill) > 80) flags.push(`普攻佔 ${pct(r.fill)}%，冷卻招太少或冷卻太長`);
    if (pct(r.fill) < 15) flags.push(`普攻只佔 ${pct(r.fill)}%，冷卻招多到普攻放不出來`);
    if (top !== r.fill && pct(top) > 50) flags.push(`${top} 佔 ${pct(top)}%，等於一直放同一招`);
    if (flags.length) warn++;
    console.log(
      `${flags.length ? '⚠️' : '✅'} ${sec}：${r.fill}（普攻）${pct(r.fill)}%｜` +
        r.set.map(k => `${k} ${r.use[k] || 0} 次`).join('、') +
        (flags.length ? '｜' + flags.join('；') : '')
    );
  }
}
console.log(warn ? `${warn} 處要看` : '都在範圍內');
