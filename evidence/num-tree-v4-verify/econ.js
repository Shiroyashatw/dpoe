'use strict';
/* num-tree-v4-verify（沿用 v3） 第 11～15 項：載入 main（base 68a48d98）的真實掉落函式，蒙地卡羅＋期望值。
   用法：node econ.js [main 的根目錄，預設 $S/main] [每地點輪數，預設 20000]
   假設（都可在下面改）：一輪 150 秒＝roundSec() 沒紀錄時的值（craft.js:1367-1370）＋輪間 2 秒（game.js:1213）→ 每小時 3600/152 輪；
   1★、沒有地圖詞；鍛造台 Lv20（全部通貨都開）；每輪擊殺數＝生成量 ÷ 1.55（王出來前的進度 G.need＝pts÷rnd(1.5,1.6)，game.js:575-597），菁英每群照同一比例。
   「之前」＝main 原樣；「之後」＝定案 4.2：全域珠寶拿掉（NEW_P.jw 歸零）、有感保底的珠寶格改給靈魂包（packSoul）。珠寶收藏不設上限（交辦：不套上限）。 */
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const root = process.argv[2] || path.join(process.env.S || '', 'main'),
  N = +process.argv[3] || 20000,
  SEC = 150,
  GAP = 2,
  RPH = 3600 / (SEC + GAP);
let seed = 20261124;
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
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f });
const R = s => vm.runInContext(s, ctx);
/* 「之後」的改法只在這個 vm 裡蓋掉，不改 repo */
const AFTER = `NEW_P.jw = [0, 0, 0];
  feelGive = function (t) {
    const P = (S.prd = S.prd || PRD0()), L = ['jewel', 'frac', 'ink'], got = [];
    got.rare = [];
    for (let i = 0; i < 3; i++) {
      const j = ((P.feelI || 0) + i) % 3, k = L[j];
      if (!campCan(k === 'jewel' ? k : 'cur:' + k)) continue;
      P.feelI = j + 1; P.feel = 0;
      if (k === 'jewel') got.pack = packSoul(t);            /* 定案：珠寶那格改給靈魂包 */
      else if (k === 'frac' && !campCan('cur:ink')) got.pack = packSoul(t);
      else MAT()[k]++, got.push('1 ' + CUR[k].n), got.rare.push(k);
      return got;
    }
    return got;
  };`;
const meanPack = R('PACKS.reduce((a, p) => a + p.length, 0) / PACKS.length'),
  el1 = R('STAR_DROP[1].el');
function run(mode) {
  return R(`(() => {
    ${mode === 'after' ? AFTER : ''}
    JEWEL.keep = 1e9;
    const out = [], LOC = [...TRUNK.map((n, i) => ({ k: TRUNK_K[i], n: n.n, lv: n.lv, t: 'trunk' })),
      ...SPECIAL.filter(s => s.t !== 'rift').map(s => ({ k: wKey(s.q, s.r), n: WTYPE[s.t].n, lv: s.lv, t: s.t }))];
    for (const L of LOC) {
      const t = lvT(L.lv), nR = Math.min(23, 8 + Math.floor(t / 3)), packs = 2.5 * nR, eG = ${(el1[0] + el1[1]) / 2},
        nS = Math.round((packs * ${meanPack} - eG) / 1.55), nE = Math.round(eG / 1.55);
      S = { lv: 100, skills: [{}, {}, {}, {}, {}], mat: newMat(), prd: PRD0(), inv: { items: [] },
        camp: { ...newCamp(), forge: 20 }, world: { ...newWorld(), cur: L.k }, gold: 0, star: 1, jewels: [],
        rounds: Array.from({ length: 10 }, () => ({ d: ${SEC}, nS, nE })) };
      let soul = 0, pack = 0, feel = 0, feelJw = 0;
      const fg = feelGive;
      feelGive = t2 => { const g = fg(t2); feel++; if (g.pack) pack += g.pack; if (!g.pack && !g.rare.length && g.length) feelJw++; return g; };
      for (let i = 0; i < ${N}; i++) soul += roundLoot(t, 1, nS, eliteCount(1));
      feelGive = fg;
      const m = S.mat;
      out.push({ n: L.n, lv: L.lv, type: L.t, t: +t.toFixed(2), nS, nE, soulPerRound: soul / ${N}, packPerRound: pack / ${N},
        feelPerRound: feel / ${N}, feelJwPerRound: feelJw / ${N}, jwPerRound: S.jewels.length / ${N},
        fracPerRound: m.frac / ${N}, inkPerRound: m.ink / ${N}, perfPerRound: m.perf / ${N},
        packSoul: packSoul(t), K: feelK() });
    }
    return out;
  })()`);
}
const before = run('before'),
  after = run('after');
const h = x => +(x * RPH).toFixed(3),
  rows = [
    [
      '地點',
      '類型',
      '怪物Lv',
      't',
      '每輪小怪',
      '每輪菁英',
      '之前 靈魂/時',
      '之前 珠寶/時',
      '之前 保底包靈魂/時',
      '之前 破裂石/時',
      '之前 墨/時',
      '之前 完美石/時',
      '收藏滿時少的靈魂/時(r×500)',
      '全部手動拆時少的靈魂/時(r×200)',
      '佔靈魂/時(500)%',
      '佔靈魂/時(200)%',
      '之後 靈魂/時',
      '之後 珠寶/時(全域)',
      '之後 保底包靈魂/時',
      '保底包多的靈魂/時',
      '之後 破裂石/時',
      '之後 墨/時',
      '之後 完美石/時',
      '之前 保底次數/時',
      '之後 保底次數/時'
    ]
  ];
for (let i = 0; i < before.length; i++) {
  const b = before[i],
    a = after[i],
    sb = h(b.soulPerRound),
    r = h(b.jwPerRound);
  rows.push([
    b.n,
    b.type,
    b.lv,
    b.t,
    b.nS,
    b.nE,
    Math.round(sb),
    r,
    Math.round(h(b.packPerRound)),
    h(b.fracPerRound),
    h(b.inkPerRound),
    h(b.perfPerRound),
    Math.round(r * 500),
    Math.round(r * 200),
    ((100 * r * 500) / sb).toFixed(2),
    ((100 * r * 200) / sb).toFixed(2),
    Math.round(h(a.soulPerRound)),
    h(a.jwPerRound),
    Math.round(h(a.packPerRound)),
    Math.round(h(a.packPerRound - b.packPerRound)),
    h(a.fracPerRound),
    h(a.inkPerRound),
    h(a.perfPerRound),
    h(b.feelPerRound),
    h(a.feelPerRound)
  ]);
}
fs.writeFileSync(path.join(__dirname, 'econ_locations.csv'), '﻿' + rows.map(r => r.join(',')).join('\n') + '\n');

/* ---------- 第 13～15 項：機制王的期望值（每小時 RPH 輪；山海寶盒的王場時間不算＝上限） ---------- */
const P = { fiend: 0.08, mini: 0.03, sanshi: 0.25, yama: 0.02, uberYama: 0.2 },
  book = 0.1; /* 生死簿：閻羅 10%（craft.js:1470-1473，PRD 平均） */
const mech = {
  凶地_凶王: RPH * P.fiend,
  心魔_七情王: RPH * P.mini,
  /* 三尸：任 3 種七情碎片各 1；每輪 1 片、7 種平均（game.js:631）→ 長期每 3 輪 1 次 */
  心魔_三尸: (RPH / 3) * P.sanshi,
  /* 鬼門關：每輪 1 張勾魂令；閻羅 5 張；十殿閻羅 4 種各 1＋生死簿（Lv70）。全打閻羅：RPH/5 次；
     混打（每 10 隻閻羅出 1 本，換 1 次十殿）：54 張 → 10 閻羅＋1 十殿 */
  鬼門關_只打閻羅: (RPH / 5) * P.yama,
  鬼門關_閻羅加十殿: (RPH / 54) * (10 * P.yama + P.uberYama),
  /* 陰兵借道：將印照刑天→風伯→雨師輪，3 輪湊 1 次蚩尤；兵符要同一地點 ≥13 輪不死（res≥12，每輪 +1），一地點一次，換地點才重置（game.js:194-196、1190-1193；craft.js:1585-1589） */
  陰兵_蚩尤: RPH / 3,
  陰兵_涿鹿兵主上限: RPH / 13
};
const fmt = o =>
  Object.entries(o)
    .map(([k, v]) => k + ' ' + v.toFixed(3) + '/時')
    .join('\n');
let txt = `每小時輪數 RPH＝3600÷(${SEC}+${GAP})＝${RPH.toFixed(2)}；每地點 ${N} 輪蒙地卡羅（seed 20261124）；PACKS 平均 ${meanPack.toFixed(2)} 隻；1★ 菁英 ${el1}\n\n`;
txt += '== 第 15 項：各機制每小時珠寶（期望值，不含王場時間，上限）\n' + fmt(mech) + '\n';
txt += `心魔合計 ${(mech.心魔_七情王 + mech.心魔_三尸).toFixed(3)}；鬼門關（Lv70 前只打閻羅）${mech.鬼門關_只打閻羅.toFixed(3)}、（Lv70 後混打）${mech.鬼門關_閻羅加十殿.toFixed(3)}\n`;
txt += `陰兵借道一個循環 13 輪：蚩尤 4 次（將印 5/4/4）＋涿鹿兵主 1 次 → ${((5 * RPH) / 13).toFixed(3)}/時（Lv70 後、不死、不算換地點時間）\n`;
txt += '\n== 18 孔填滿要幾小時（只刷那一條線；18 ÷ 每小時）\n';
for (const [k, v] of Object.entries({
  凶地: mech.凶地_凶王,
  心魔: mech.心魔_七情王 + mech.心魔_三尸,
  鬼門關_只打閻羅: mech.鬼門關_只打閻羅,
  陰兵_只打蚩尤: mech.陰兵_蚩尤,
  陰兵_蚩尤加涿鹿: (5 * RPH) / 13
}))
  txt += `${k} ${(18 / v).toFixed(1)} 小時\n`;
txt += '\n== 第 13 項：開機制之後到第一顆珠寶（幾何分布期望；每輪的機率）\n';
const first = (name, pr) =>
  `${name}：每輪 ${pr.toFixed(4)} → 期望 ${(1 / pr).toFixed(1)} 輪＝${(1 / pr / RPH).toFixed(2)} 小時；90% 在 ${(Math.log(0.1) / Math.log(1 - pr) / RPH).toFixed(2)} 小時內\n`;
txt += first('鬼門關（角色 Lv35，瞭望台 22）：只能打閻羅 5 輪 1 次 ×2%', P.yama / 5);
txt += first('心魔幻境（Lv45，瞭望台 23）：七情王 3%＋三尸每 3 輪 ×25%', P.mini + P.sanshi / 3);
txt += first('凶地（Lv55，瞭望台 24）：凶王 8%', P.fiend);
txt += first('陰兵借道（Lv65，瞭望台 25）：蚩尤必掉，3 輪 1 次', 1 / 3);
txt +=
  '\n== 第 14 項：王必掉（蚩尤、涿鹿兵主）累積曲線，不套上限（Lv70 前只有蚩尤）\n小時,只打蚩尤(Lv65～69),蚩尤＋涿鹿兵主(Lv70+)\n';
const curve = ['小時,只打蚩尤(Lv65～69),蚩尤＋涿鹿兵主(Lv70+)'];
for (const H of [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24]) {
  const a = Math.floor((H * RPH) / 3),
    b = Math.floor((H * RPH) / 13) * 5 + Math.floor((((H * RPH) % 13) + 1e-9) / 3);
  curve.push(`${H},${a},${b}`);
  txt += `${H},${a},${b}\n`;
}
fs.writeFileSync(path.join(__dirname, 'econ_boss_curve.csv'), '﻿' + curve.join('\n') + '\n');
txt +=
  '\n== 第 11、12 項：各地點（econ_locations.csv 全表）\n地點 Lv | 之前 靈魂/時 | 之前 珠寶/時 | 少 r×500 | 少 r×200 | 保底包 之前→之後（多） | 破裂石 之前→之後 | 墨 之前→之後 | 保底次數 之前→之後\n';
for (const r of rows.slice(1))
  txt += `${r[0]} Lv${r[2]} | ${r[6]} | ${r[7]} | ${r[12]} (${r[14]}%) | ${r[13]} (${r[15]}%) | ${r[8]}→${r[18]} (+${r[19]}) | ${r[9]}→${r[20]} | ${r[10]}→${r[21]} | ${r[23]}→${r[24]}\n`;
console.log(txt);
