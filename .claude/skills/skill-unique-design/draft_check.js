/* 技能與傳奇草案的檢查（skill skill-unique-design）。只讀不改；有 ❌ 結束碼 1。
   node .claude/skills/skill-unique-design/draft_check.js            檢查全部傳奇草案
   node .claude/skills/skill-unique-design/draft_check.js <檔案…>    只檢查指定的檔
   node .claude/skills/skill-unique-design/draft_check.js --aff <基底名> [物品等級]   列這個基底能用的詞綴與建議範圍
   node .claude/skills/skill-unique-design/draft_check.js --taken     列昇華、基石、天賦大點已經用掉的效果文字 */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const root = path.join(__dirname, '..', '..', '..');
const ctx = {
  console,
  Math,
  Date,
  JSON,
  Object,
  Array,
  location: { search: '' },
  URLSearchParams,
  PAL_CSS: fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8')
};
vm.createContext(ctx);
for (const f of ['palette.js', 'ptdata.js', 'data.js', 'items.js'])
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f });
const g = n => vm.runInContext(n, ctx);
const BASES = g('BASES'),
  AFF = g('AFF'),
  KINDS = g('KINDS'),
  SPELLW = g('SPELLW'),
  SPELL_AFF = g('SPELL_AFF');
const BY = Object.fromEntries(BASES.map(b => [b.n, b]));
/* 詞綴表：優先讀程式的 AFF（SU-02 起草案的新單項、複合詞都在裡面；複合詞 r2＝第二個數字的範圍），
   草案 docs/production/詞綴池擴充草案.md 的兩張表只補程式裡還沒有的列（draft）。rs＝每個 {} 的整條範圍 */
const A = {},
  POOL = {};
for (const [k, a] of Object.entries(AFF)) A[k] = { n: a.n, rs: a.r2 ? [a.r, a.r2] : [a.r], ...(a.c ? { su: 1 } : {}) };
for (const [k, v] of Object.entries(KINDS)) POOL[k] = (v.aff || []).filter(x => A[x]);
POOL.spellw = SPELL_AFF.filter(x => A[x]);
const PART = {
  武器: 'weapon',
  法系武器: 'spellw',
  盾: 'shield',
  法器: 'focus',
  箭袋: 'quiver',
  頭部: 'helm',
  胸甲: 'chest',
  手套: 'gloves',
  鞋子: 'boots',
  腰帶: 'belt',
  戒指: 'ring',
  項鍊: 'amulet'
};
const EXT = path.join(root, 'docs', 'production', '詞綴池擴充草案.md');
if (fs.existsSync(EXT))
  for (const l of fs.readFileSync(EXT, 'utf8').split('\n')) {
    const c = l.split('|').map(x => x.trim());
    if (c.length < 7 || !/^[A-Za-z_0-9]+$/.test(c[1])) continue;
    const rs = c[4].split('／').map(x => x.split('～').map(Number));
    if (rs.some(r => r.length !== 2 || r.some(isNaN)) || rs.length !== c[3].split('{}').length - 1)
      throw new Error('詞綴池擴充草案這一列讀不懂：' + l);
    /* 加開（x_）的列用原本的鍵；程式已經有的鍵（含加開進池）就以程式為準，不再從表補 */
    const k = c[1].startsWith('x_') ? c[1].slice(2) : c[1];
    if (!A[k]) A[k] = { n: c[3], rs, draft: 1 };
    for (const part of c[5].split('、')) {
      if (!PART[part]) throw new Error('詞綴池擴充草案的部位寫錯：' + part);
      if (!POOL[PART[part]].includes(k)) POOL[PART[part]].push(k);
    }
  }
/* 這個基底能出的詞綴：法系武器（SPELLW：長杖、法杖、權杖、陷阱器）用法系池（data.js 的 WEAPON_BASES 也是這樣給），其他照部位 */
const poolOf = b => POOL[b.k === 'weapon' && SPELLW.has(b.wt) ? 'spellw' : b.k];
/* 物品等級 1～100 的最低等級：基底等級 ×6（等級 1 的基底＝1）。程式改成 1～100 之後這裡要跟著改 */
const minLv = b => (b.lv === 1 ? 1 : b.lv * 6);
/* 詞綴條數下限與建議範圍落在整條範圍的哪一段（照物品等級區間） */
const band = lv => (lv >= 90 ? [5, 0.8, 1.1] : lv >= 72 ? [4, 0.6, 0.9] : lv >= 36 ? [3, 0.35, 0.65] : [2, 0.1, 0.35]);
/* 整條上限 6 以下的（基礎暴擊率、偷取）留一位小數，其他取整數 */
const sug1 = ([lo, hi], lv) => {
  const [, a, b] = band(lv),
    rnd = v => (hi <= 6 ? Math.round(v * 10) / 10 : Math.round(v));
  return [Math.max(1, rnd(lo + (hi - lo) * a)), Math.max(2, rnd(lo + (hi - lo) * b))];
};
const fill = (n, vals) => {
  let i = 0;
  return n.replace(/\{\}/g, () => vals[i++]);
};
const NUM = '(\\d+(?:\\.\\d+)?)(?:～(\\d+(?:\\.\\d+)?))?';
const esc = s => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
const affRe = k => new RegExp('^' + esc(A[k].n).replace(/\\\{\\\}|\{\}/g, NUM) + '$');

const args = process.argv.slice(2);
if (args[0] === '--aff') {
  const b = BY[args[1]];
  if (!b) throw new Error('沒有這個基底：' + args[1]);
  const lv = +args[2] || minLv(b);
  console.log(`${b.n}（${KINDS[b.k].n}，最低物品等級 ${minLv(b)}）在物品等級 ${lv}：至少 ${band(lv)[0]} 條詞綴`);
  for (const k of poolOf(b))
    console.log(
      '  ' +
        fill(
          A[k].n,
          A[k].rs.map(r => sug1(r, lv).join('～'))
        ) +
        `   （整條 ${A[k].rs.map(r => r.join('～')).join('／')}${A[k].rs.length > 1 ? '，複合' : A[k].su ? '，新' : ''}${A[k].draft ? '，草案、程式還沒有' : ''}）`
    );
  process.exit(0);
}
if (args[0] === '--taken') {
  const S = g('STATN'),
    ASC = g('ASC'),
    TH = g('PT_THEME');
  for (const a of Object.values(ASC)) {
    console.log('# 昇華 ' + a.n);
    for (const n of Object.values(a.N || {}))
      if (Array.isArray(n) && typeof n[2] === 'string')
        console.log('- ' + n[2] + '：' + String(n[4]).replace(/\n/g, '；'));
  }
  console.log('# 基石');
  for (const k of Object.values(g('PT_KEYS'))) console.log('- ' + JSON.stringify(k).slice(0, 200));
  console.log('# 天賦大點');
  for (const t of TH)
    if (t.nt)
      console.log(
        '- ' +
          t.n +
          '：' +
          t.nt
            .map(
              x =>
                x[0] +
                '（' +
                Object.entries(x[1] || {})
                  .map(([k, v]) => (S[k] && S[k][3] ? S[k][3].replace('{}', v) : k + ':' + v))
                  .join('，') +
                '）'
            )
            .join('｜')
      );
  process.exit(0);
}

const DIR = path.join(root, 'docs', 'production');
const files = args.length
  ? args
  : fs
      .readdirSync(DIR)
      .filter(f => /^傳奇/.test(f) && f.endsWith('.md'))
      .map(f => path.join(DIR, f));
let bad = 0,
  total = 0;
const names = {};
const fail = (f, n, msg) => (bad++, console.log(`❌ ${path.basename(f)}【${n}】${msg}`));
for (const f of files) {
  const L = fs.readFileSync(f, 'utf8').split('\n');
  let n = 0;
  for (let i = 0; i < L.length; i++) {
    const m = L[i].match(/^【(.+?)】([^｜]+)(.*)$/);
    if (!m) continue;
    n++;
    total++;
    const name = m[1],
      b = BY[m[2].trim()],
      rest = m[3];
    names[name] = (names[name] || 0) + 1;
    if (names[name] > 1) fail(f, name, '名字重複');
    if (!b) {
      fail(f, name, '基底不存在：' + m[2]);
      continue;
    }
    const lm = rest.match(/物品等級 (\d+)\+/);
    if (!lm) fail(f, name, '沒有寫物品等級');
    const lv = lm ? +lm[1] : minLv(b);
    if (lv < minLv(b)) fail(f, name, `物品等級 ${lv} 低於基底的最低等級 ${minLv(b)}`);
    /* 這一件的內容：到下一個空行為止 */
    const body = [];
    for (let j = i + 1; j < L.length && L[j].trim(); j++) body.push(L[j].trim());
    const text = body.join('\n');
    if (/護符/.test(text)) fail(f, name, '提到護符（系統已拔掉）');
    if (!/★/.test(text)) fail(f, name, '沒有特色詞（★）');
    const al = body.find(x => x.startsWith('詞綴：'));
    if (!al) {
      fail(f, name, '沒有「詞綴：」那一行');
      continue;
    }
    const pool = poolOf(b),
      seen = new Set(),
      parts = al
        .slice(3)
        .split('；')
        .map(x => x.trim())
        .filter(Boolean);
    for (const p of parts) {
      const k = pool.find(k => affRe(k).test(p));
      if (!k) {
        fail(f, name, `「${p}」不是${KINDS[b.k].n}詞綴池裡的寫法（用 --aff ${b.n} 看）`);
        continue;
      }
      if (seen.has(k)) fail(f, name, `詞綴重複：${p}`);
      seen.add(k);
      const mm = p.match(affRe(k));
      A[k].rs.forEach((r, i) => {
        const lo = mm[1 + i * 2],
          hi = mm[2 + i * 2];
        if (hi === undefined) return; /* 固定詞 */
        if (+lo >= +hi) fail(f, name, `範圍寫反或相等：${p}`);
        if (+hi > r[1] * 1.25) fail(f, name, `超出這條詞綴的上限太多：${p}（整條到 ${r[1]}）`);
      });
    }
    if (seen.size < band(lv)[0]) fail(f, name, `詞綴只有 ${seen.size} 條，物品等級 ${lv} 至少要 ${band(lv)[0]} 條`);
    if (![...parts].some(p => /～/.test(p))) fail(f, name, '詞綴沒有任何範圍詞');
  }
  console.log(`${path.basename(f)}：${n} 件`);
}
console.log(`合計 ${total} 件，${bad ? '❌ ' + bad + ' 個問題' : '✅ 全部通過'}`);
process.exit(bad ? 1 : 0);
