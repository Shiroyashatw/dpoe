/* 產生 job 清單：node jobs.js <static|single|sites> <out.json> [額外參數 JSON]
   進度點：Lv48＝主幹第 14 個（雪埋古道，材料 T3）、Lv68＝第 18 個（腐沼渡，T5）、Lv83＝第 21 個（裂口腹地，T6） */
'use strict';
const [, , mode, out, extra = '{}'] = process.argv;
const X = JSON.parse(extra);
const PTS = [
  [48, 14],
  [68, 18],
  [83, 21]
];
const BUILDS = ['phys', 'spell', 'bleed'];
const ALL = ['wangyin_zhenyue', 'wangyin_chixiao', 'wangyin_jiting', 'wangyin_guixu'];
const GX = X.gx || { leech: 1, hpP: 8, resA: 14 };
const J = [];
if (mode === 'static') {
  const vars = [
    { name: 'none' },
    { name: 'zy', seals: ['wangyin_zhenyue'] },
    { name: 'zy_T2', aff: { slot: 'chest', k: 'defP', v: 24 } },
    { name: 'cx', seals: ['wangyin_chixiao'] },
    { name: 'cx_physT2', aff: { slot: 'chest', k: 'physP', v: 24 } },
    { name: 'cx_spellT2', aff: { slot: 'chest', k: 'spellP', v: 69.5 } },
    { name: 'jt', seals: ['wangyin_jiting'] },
    { name: 'jt_T2', aff: { slot: 'gloves', k: 'ss', v: 12 } },
    ...Object.entries(GX).flatMap(([k, v]) => [
      { name: 'gx_' + k, seals: ['wangyin_guixu'], fx: { wangyin_guixu: [k, v] } },
      { name: 'all4_' + k, seals: ALL, fx: { wangyin_guixu: [k, v] } },
      { name: 'all4noset_' + k, seals: ALL, fx: { wangyin_guixu: [k, v] }, set: 1 }
    ]),
    /* 歸墟的參考：resA 有官方 T2（中值 14.5，放同一件）；hpP 參考＝災魘詞 g_hp r[8,12] 中值 10；leech 參考＝爪的基底固定詞 leech 1（裝備上一條） */
    { name: 'gx_resA_T2', aff: { slot: 'helm', k: 'resA', v: 14.5 } },
    { name: 'gx_hpP_ref', seals: ['wangyin_guixu'], fx: { wangyin_guixu: ['hpP', 10] } },
    { name: 'gx_leech_ref', seals: ['wangyin_guixu'], fx: { wangyin_guixu: ['leech', 1] } },
    ...(X.vars || [])
  ];
  for (const [L, site] of PTS) for (const b of BUILDS) for (let s = 1; s <= (X.seeds || 10); s++) J.push({ id: `st_${b}_${L}_${s}`, mode: 'static', build: b, L, site, seed: s, vars });
} else if (mode === 'single') {
  const V = X.vars || [
    ['none', []],
    ['zy', ['wangyin_zhenyue']],
    ['jt', ['wangyin_jiting']],
    ...Object.entries(GX).map(([k, v]) => ['gx_' + k, ['wangyin_guixu'], { wangyin_guixu: [k, v] }])
  ];
  for (const star of X.stars || [5])
    for (const [L, site] of PTS)
      for (const b of BUILDS)
        for (let s = 1; s <= (X.seeds || 4); s++)
          for (const [n, seals, fx] of V) J.push({ id: `sg${star}_${n}_${b}_${L}_${s}`, var: n, build: b, L, site, seed: s, simT: X.simT || 900, star, seals, fx });
} else if (mode === 'sites') {
  /* 主幹 Lv45 以上（第 14～21 個）：沒有印 vs 四印＋齊鳴 */
  const fx = X.fx || {},
    set = X.set == null ? 1.25 : X.set;
  for (const star of X.stars || [1, 5])
    for (let site = 14; site <= 21; site++)
      for (const b of BUILDS)
        for (let s = 1; s <= (X.seeds || 4); s++)
          for (const [n, seals] of X.noBase ? [['all4', ALL]] : [['none', []], ['all4', ALL]])
            J.push({ id: `si${star}_${n}${X.tag || ''}_${b}_${site}_${s}`, var: n + (X.tag || ''), build: b, L: 23 + 5 * (site - 9), site, seed: s, simT: X.simT || 900, star, seals, fx, set });
}
require('fs').writeFileSync(out, JSON.stringify(J));
console.log(J.length, 'jobs');
