'use strict';
/* num-tree-v1-verify：只改 scratch 副本（node patch_variant.js <副本根目錄> [variant]），不碰正式 repo。
   variant：
   - entry  ：T4／T10 起點入門叢集（輸出側 2、防禦側 1；遊俠、暗影的防禦菱形拿掉閃避；主題見 ENTRY）
   - entry+xb：再加十字弓：外流的十字弓叢集跟遊俠之路「榴彈」旁的叢集對調主題（大點數相同才換） */
const fs = require('fs'),
  path = require('path');
const root = path.resolve(process.argv[2]),
  variant = process.argv[3] || 'entry+xb';
const dataF = path.join(root, 'js', 'data.js'),
  bakeF = path.join(root, 'tools', 'tree_bake.js');
let data = fs.readFileSync(dataF, 'utf8'),
  bake = fs.readFileSync(bakeF, 'utf8');
const rep = (s, a, b) => {
  if (!s.includes(a)) throw new Error('patch 找不到：' + a.slice(0, 60));
  return s.replace(a, b);
};
/* 入門叢集主題（de 輸出側、fe 防禦側）＋防禦菱形（f）。依調整書 2.1 表 */
const ENTRY = [
  { de: ['近戰', '暈眩'], fe: ['護甲'] },
  {
    de: process.env.RORDER ? ['投射物', '攻擊速度'] : ['攻擊速度', '投射物'],
    fe: ['生命'],
    f: "[['身法', 1], ['生命', 0]]"
  },
  { de: ['暴擊率', '異常'], fe: ['偏斜'], f: "[['偏斜', 0], ['能量護盾', 0]]" },
  { de: ['元素技能', '法術'], fe: ['能量護盾'] },
  { de: ['召喚', '秘術技能'], fe: ['能量護盾'] },
  { de: ['原始技能', '砲塔圖騰'], fe: ['生命'] }
];
data = rep(
  data,
  'const PTREE = (() => {',
  `/* num-tree-v1-verify 試算（scratch）：入門叢集 */\n${(variant === 'xb' ? [] : ENTRY)
    .map(
      (e, g) =>
        `PT_STARTS[${g}].de = ${JSON.stringify(e.de)}; PT_STARTS[${g}].fe = ${JSON.stringify(e.fe)};` +
        (e.f ? ` PT_STARTS[${g}].f = ${e.f};` : '')
    )
    .join('\n')}\n${variant.includes('xb') ? 'PT_STARTS[1].xb = 1;\n' : ''}const PTREE = (() => {`
);
bake = rep(
  bake,
  'startHubs.push({ n: nt, g, th: [main, alt, main], out: Math.atan2(u.y, u.x) + side * 0.5 });',
  'startHubs.push({ n: nt, g, th: [main, alt, main], out: Math.atan2(u.y, u.x) + side * 0.5, d: T === S.d });'
);
bake = rep(
  bake,
  `  for (const h of startHubs)
    for (const th of [...h.th, h.th[0]])
      tryPlace(h.n, { n: 3 + Math.floor(R() * 3), g: h.g, ks: [0, 1], cone: [h.out, 1.9], th, st: 1 });`,
  `  for (const h of startHubs) {
    const EL = h.d ? PT_STARTS[h.g].de : PT_STARTS[h.g].fe;
    if (!EL)
      for (const th of [...h.th, h.th[0]])
        tryPlace(h.n, { n: 3 + Math.floor(R() * 3), g: h.g, ks: [0, 1], cone: [h.out, 1.9], th, st: 1 });
    /* 試算：每個主題試到放得下為止（最多 8 次），放不下就記下來 */
    else
      for (const nm of EL) {
        let ok = null;
        for (let t = 0; t < 8 && !ok; t++)
          ok = tryPlace(h.n, { n: 3 + Math.floor(R() * 3), g: h.g, ks: [0, 1], cone: [h.out, 1.9], th: PT_TH[nm], st: 1 });
        const ok0 = ok;
        /* 放不下的最小修法：(1) 方向錐放寬到 3.0；(2) 掛在起點大點往內環那個能力值點（{tag}x，第 6 點）；
           (3) 再不行就接在同一個起點大點的上一個入門叢集末端（叢集接叢集） */
        for (let t = 0; t < 8 && !ok; t++)
          ok = tryPlace(h.n, { n: 3 + Math.floor(R() * 3), g: h.g, ks: [0, 1], cone: [h.out, 3.0], th: PT_TH[nm], st: 1 });
        if (ok && !ok0) (globalThis.__ENTRY_FIX = globalThis.__ENTRY_FIX || []).push(h.n.id + ':' + nm + ':wide-cone');
        const ok1 = ok;
        for (let t = 0; t < 8 && !ok && process.env.XFALL; t++)
          ok = tryPlace(I[h.n.id.slice(0, -1) + 'x'], { n: 3 + Math.floor(R() * 3), g: h.g, ks: [0, 1], th: PT_TH[nm], st: 1 });
        if (ok && !ok1) (globalThis.__ENTRY_FIX = globalThis.__ENTRY_FIX || []).push(h.n.id + ':' + nm + ':x-hub');
        if (!ok) {
          const pc = CL.filter(c => c.hub === h.n.id).pop(),
            dg = {};
          for (const [a, b] of E) (dg[a] = (dg[a] || 0) + 1), (dg[b] = (dg[b] || 0) + 1);
          for (const leaf of pc ? pc.ids.filter(id => dg[id] === 1 && !id.includes('_l')) : [])
            for (let t = 0; t < 4 && !ok; t++)
              ok = tryPlace(I[leaf], { n: 3 + Math.floor(R() * 3), g: h.g, ks: [0, 1], cone: [Math.atan2(I[leaf].y - pc.y, I[leaf].x - pc.x), 1.6], par: CL.indexOf(pc), st: 1, th: PT_TH[nm], ownTh: 1 });
          if (ok) (globalThis.__ENTRY_FIX = globalThis.__ENTRY_FIX || []).push(h.n.id + ':' + nm + ':chained');
        }
        if (!ok) (globalThis.__ENTRY_FAIL = globalThis.__ENTRY_FAIL || []).push(h.n.id + ':' + nm);
      }
  }`
);
bake = rep(
  bake,
  '  for (const c of CL) if (c.par != null) c.th = rootOf(c).th;',
  `  /* 試算：十字弓叢集收回遊俠之路「榴彈」旁（跟遊俠之路上大點數相同、最靠近榴彈的叢集對調主題） */
  if (PT_STARTS[1].xb) {
    const XB = PT_TH['十字弓術'],
      GR = PT_TH['榴彈'],
      grs = CL.filter(c => c.th === GR && roadOf(c) === 1),
      gd = c => Math.min(...grs.map(g => dst(g, c)));
    for (const c of CL.filter(c => c.th === XB && c.par == null && roadOf(c) !== 1)) {
      const o = CL.filter(
        o => o.par == null && !o.st && !o.fix && !o.lock && roadOf(o) === 1 && !PT_THEME[o.th].wp && famNt[o.id] === famNt[c.id]
      ).sort((a, b) => gd(a) - gd(b))[0];
      if (o) [c.th, o.th] = [o.th, c.th];
      else {
        /* 備案：遊俠之路上同主題的兩個叢集，大點數加起來跟外流的一串一樣（兩邊的大點額度都不變） */
        const ok = CL.filter(
          o => o.par == null && !o.st && !o.fix && !o.lock && roadOf(o) === 1 && !PT_THEME[o.th].wp
        );
        let best = null;
        for (const a of ok)
          for (const b of ok)
            if (a !== b && a.th === b.th && famNt[a.id] + famNt[b.id] === famNt[c.id] && (!best || gd(a) + gd(b) < best[2]))
              best = [a, b, gd(a) + gd(b)];
        if (best) {
          const t = best[0].th;
          best[0].th = best[1].th = c.th;
          c.th = t;
          (globalThis.__XB_FIX = globalThis.__XB_FIX || []).push(c.id + '→' + best[0].id + '+' + best[1].id);
        } else (globalThis.__XB_FAIL = globalThis.__XB_FAIL || []).push(c.id);
      }
    }
  }
  for (const c of CL) if (c.par != null) c.th = rootOf(c).th;`
);
fs.writeFileSync(dataF, data);
fs.writeFileSync(bakeF, bake);
console.log('patched', root, variant);
/* FLIP1=1：遊俠起點的輸出／防禦菱形左右對調（右側起點大點旁放不下第 2 個入門叢集時的最小修法） */
if (process.env.FLIP1) {
  let b = fs.readFileSync(bakeF, 'utf8'),
    d = fs.readFileSync(dataF, 'utf8');
  b = rep(
    b,
    'const T = side === (g % 2 ? 1 : -1) ? S.d : S.f,',
    'const T = (side === (g % 2 ? 1 : -1)) !== !!S.flip ? S.d : S.f,'
  );
  d = rep(d, 'PT_STARTS[1].de', 'PT_STARTS[1].flip = 1; PT_STARTS[1].de');
  fs.writeFileSync(bakeF, b);
  fs.writeFileSync(dataF, d);
  console.log('FLIP1');
}
/* FLIPODD=1：遊俠、魔導、自然（奇數路）都把輸出菱形放左邊（六條路輸出都在左側） */
if (process.env.FLIPODD) {
  let b = fs.readFileSync(bakeF, 'utf8'),
    d = fs.readFileSync(dataF, 'utf8');
  b = rep(
    b,
    'const T = side === (g % 2 ? 1 : -1) ? S.d : S.f,',
    'const T = (side === (g % 2 ? 1 : -1)) !== !!S.flip ? S.d : S.f,'
  );
  for (const g of [1, 3, 5]) d = rep(d, `PT_STARTS[${g}].de`, `PT_STARTS[${g}].flip = 1; PT_STARTS[${g}].de`);
  fs.writeFileSync(bakeF, b);
  fs.writeFileSync(dataF, d);
  console.log('FLIPODD');
}
