'use strict';
/* num-tree-v3-verify 第 12 項（V5）：有感保底的破裂石、追憶之墨每小時，main／改前／改後三欄。
   用法：node econ_v5.js <repo 根目錄> <模式 main|after> <每地點輪數> <FEEL_TG 或 ph> [地點起,迄] [skipSmall 0|1]
   - 走 <repo>/js 的真實掉落函式（roundLoot／killMat／feelGive／prdRoll），每個地點 seed 固定（20261124＋地點序號）。
   - main：base 68a48d98 原樣（全域珠寶照掉、保底珠寶格給珠寶）。
   - after：定案 4.2（10:21／10:29）＝全域珠寶拿掉（NEW_P.jw 歸零）、保底珠寶格改給靈魂包。
     <repo> 是本分支時程式已經改好，這裡不再覆寫；是 main 時在 vm 裡覆寫（同 v2 econ.js 的 AFTER）。
   - FEEL_TG：覆寫 craft.js 的 FEEL_TG（K＝max(3, ⌊FEEL_TG÷150⌋)）。
   - ph：歸零條件版（見上）。
   - skipSmall＝1：不跑小怪（只供快速試算；正式數字都是 0）。
   輪長一律 150 秒＋輪間 2 秒（V7：估算，等測試階段再實測）。 */
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const [root, mode, Ns, TGs, rangeS, skipS] = process.argv.slice(2),
  N = +Ns,
  SYNC =
    TGs ===
    'phs' /* 同 ph，另外照 main 一樣呼叫 jwRoll 把亂數吃掉（結果丟掉），所以跟 main 同 seed 時每一輪的亂數序列一模一樣 */,
  PH =
    TGs === 'ph' ||
    SYNC /* 歸零條件版：FEEL_TG 照舊 1500，保留原本的全域珠寶偽隨機判定，只拿來把保底計數歸零、不給珠寶 */,
  TG = PH ? 1500 : +TGs,
  skip = skipS === '1',
  SEC = 150;
function mkctx(seed) {
  const rand = () => {
    let t = (seed += 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const M = Object.create(Math);
  M.random = rand;
  const ctx = {
    console,
    Math: M,
    Date,
    JSON,
    Object,
    Array,
    location: { search: '' },
    URLSearchParams,
    PAL_CSS: fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8')
  };
  vm.createContext(ctx);
  for (const f of ['palette.js', 'ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'world.js'])
    vm.runInContext(
      fs.readFileSync(path.join(root, 'js', f), 'utf8').replace(/^const FEEL_TG = \d+;/m, `const FEEL_TG = ${TG};`),
      ctx,
      {
        filename: f
      }
    );
  return ctx;
}
/* main 的根目錄在 vm 裡改成「之後」（本分支已經改在程式裡，不用） */
const AFTER_ON_MAIN = `NEW_P.jw = [0, 0, 0];
  feelGive = function (t) {
    const P = (S.prd = S.prd || PRD0()), L = ['jewel', 'frac', 'ink'], got = [];
    got.rare = [];
    for (let i = 0; i < 3; i++) {
      const j = ((P.feelI || 0) + i) % 3, k = L[j];
      if (!campCan(k === 'jewel' ? 'cur:ink' : 'cur:' + k)) continue;
      P.feelI = j + 1; P.feel = 0;
      if (k === 'jewel') got.pack = packSoul(t);
      else if (k === 'frac' && !campCan('cur:ink')) got.pack = packSoul(t);
      else MAT()[k]++, got.push('1 ' + CUR[k].n), got.rare.push(k);
      return got;
    }
    return got;
  };`;
const probe = mkctx(1),
  R0 = s => vm.runInContext(s, probe),
  isBranch = R0('typeof FEEL_PACK !== "undefined"'),
  meanPack = R0('PACKS.reduce((a, p) => a + p.length, 0) / PACKS.length'),
  el1 = R0('STAR_DROP[1].el'),
  LOC = R0(`[...TRUNK.map((n, i) => ({ k: TRUNK_K[i], n: n.n, lv: n.lv, t: 'trunk' })),
      ...SPECIAL.filter(s => s.t !== 'rift').map(s => ({ k: wKey(s.q, s.r), n: WTYPE[s.t].n, lv: s.lv, t: s.t }))]`);
const [a, b] = (rangeS || '0,' + LOC.length).split(',').map(Number),
  out = [];
for (let li = a; li < Math.min(b, LOC.length); li++) {
  const L = LOC[li],
    ctx = mkctx(20261124 + li),
    R = s => vm.runInContext(s, ctx);
  if (mode === 'after' && !isBranch)
    R(
      !PH
        ? AFTER_ON_MAIN
        : AFTER_ON_MAIN.replace(
            'NEW_P.jw = [0, 0, 0];',
            SYNC ? 'jwAdd = n => (jwRoll(n), []);' : 'jwAdd = () => [];'
          ).replace(
            "if (k === 'jewel') got.pack = packSoul(t);",
            "if (k === 'jewel') " + (SYNC ? '(jwRoll(1), (got.pack = packSoul(t)));' : 'got.pack = packSoul(t);')
          )
    );
  if (mode === 'main' && isBranch) throw new Error('main 模式要給 main 的根目錄');
  out.push(
    R(`(() => {
    JEWEL.keep = 1e9;
    const L = ${JSON.stringify(L)}, t = lvT(L.lv), nR = Math.min(23, 8 + Math.floor(t / 3)), packs = 2.5 * nR, eG = ${(el1[0] + el1[1]) / 2},
      nS = Math.round((packs * ${meanPack} - eG) / 1.55);
    S = { lv: 100, skills: [{}, {}, {}, {}, {}], mat: newMat(), prd: PRD0(), inv: { items: [] },
      camp: { ...newCamp(), forge: 20 }, world: { ...newWorld(), cur: L.k }, gold: 0, star: 1, jewels: [],
      rounds: Array.from({ length: 10 }, () => ({ d: ${SEC}, nS, nE: 1 })) };
    let feel = 0, pack = 0;
    const fg = feelGive;
    feelGive = t2 => { const g = fg(t2); feel++; pack += g.pack || 0; return g; };
    const nS2 = ${skip ? 0 : 'nS'};
    for (let i = 0; i < ${N}; i++) roundLoot(t, 1, nS2, eliteCount(1));
    feelGive = fg;
    const m = S.mat;
    return { li: ${li}, n: L.n, type: L.t, lv: L.lv, K: feelK(), rounds: ${N}, frac: m.frac, ink: m.ink, feel, pack, jw: S.jewels.length };
  })()`)
  );
}
console.log(JSON.stringify(out));
