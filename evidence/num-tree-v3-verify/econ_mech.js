'use strict';
/* num-tree-v3-verify 第 13～15 項：機制珠寶的蒙地卡羅（固定 seed）＋期望值，套定案 4.1.1 的儲存規則。
   用法：node econ_mech.js [每格試幾次，預設 10000] > econ_mech.txt（另寫 econ_mech_14.csv、econ_mech_15.csv）
   輪長：每輪 150 秒＋輪間 2 秒（V7：估算，等測試階段再實測）；山海寶盒的王場時間不算（＝上限，時數偏短）。
   掉率照 4.2 對應表（暫定、未模擬）：凶王 8%、七情王 3%、三尸 25%、閻羅 2%、十殿閻羅 20%；蚩尤、涿鹿兵主必掉（王保底）。
   進場規則照 main：
   - 凶地：每輪輪末王是凶王（game.js:534）。
   - 心魔幻境：每輪 1 隻七情王（game.js:630-637），掉 1 片七情碎片、7 種平均抽；三尸＝任 3 種各 1 片（world.js:243-253 sinHallWhy，SIN.need）；
     有 3 種就馬上打（不算時間）。
   - 鬼門關：每輪 1 張勾魂令（craft.js:1469 一帶）、4 種平均抽；閻羅＝任 5 張，從張數最多的扣（world.js:213-237 fdHallPay）；
     十殿閻羅＝4 種各 1＋生死簿＋Lv70，生死簿是閻羅掉 10%（FENG.pen，偽隨機在這裡用平機率）。Lv70 前只打閻羅；Lv70 後有十殿的門票就先打十殿。
   - 陰兵借道：將印照刑天→風伯→雨師輪流（game.js:539、craft.js:1580-1584），3 輪湊一次蚩尤（必掉 1 大點）；Lv70 後加涿鹿兵主：
     同一地點不死 13 輪拿 1 張兵符（game.js:194-196、1190-1193），13 輪一個循環＝蚩尤 4 次＋涿鹿兵主 1 次（同 v2 econ_boss_curve）。
   儲存（4.1.1 S2、S5）：正常格數 C＝30／34／38／42／46／50（倉房 Lv0～5），王保底另留 5 格；正常格數滿了機率掉落暫停（不擲）、王保底照收、
   超過 C＋5 也照收（提示清理）。不丟棄。
   門檻：(a) 從 n0 到正常格數滿（≥ C）；(b) 到正常＋5 滿（≥ C＋5）；(c) 從 18 顆（鑲滿 18 孔）起算的 (a)、(b)。 */
const fs = require('fs'),
  path = require('path');
const TR = +process.argv[2] || 10000,
  SEC = 150,
  GAP = 2,
  HR = (SEC + GAP) / 3600 /* 每輪幾小時 */,
  CAPS = [30, 34, 38, 42, 46, 50],
  KB = 5,
  P = { fiend: 0.08, mini: 0.03, sanshi: 0.25, yama: 0.02, uber: 0.2, book: 0.1 };
let seed = 20261124;
const rand = () => {
  let t = (seed += 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/* 每種機制：mk() 回一個「打一輪」的函式 step(room) → { r: 機率掉落（只有 room 時才擲）, b: 王保底顆數 } */
const MECH = {
  凶地: () => room => ({ r: room && rand() < P.fiend ? 1 : 0, b: 0 }),
  心魔幻境: () => {
    const F = [0, 0, 0, 0, 0, 0, 0];
    return room => {
      let r = room && rand() < P.mini ? 1 : 0;
      F[Math.floor(rand() * 7)]++;
      const have = F.map((n, i) => [n, i]).filter(x => x[0] > 0);
      if (have.length >= 3) {
        /* 從片數最多的 3 種扣 */
        have.sort((a, b) => b[0] - a[0]);
        for (const [, i] of have.slice(0, 3)) F[i]--;
        if (room && rand() < P.sanshi) r++;
        else if (!room) rand();
      }
      return { r, b: 0 };
    };
  },
  鬼門關: uber => () => {
    const F = [0, 0, 0, 0];
    let book = 0;
    return room => {
      let r = 0;
      F[Math.floor(rand() * 4)]++;
      if (uber && book && F.every(n => n >= 1)) {
        F.forEach((n, i) => F[i]--), book--;
        if (room && rand() < P.uber) r++;
      } else if (F.reduce((a, b) => a + b) >= 5) {
        for (let n = 5; n > 0; n--) {
          const k = F.indexOf(Math.max(...F));
          F[k]--;
        }
        if (room && rand() < P.yama) r++;
        if (rand() < P.book) book++;
      }
      return { r, b: 0 };
    };
  },
  陰兵借道: zhuolu => () => {
    let i = 0;
    return () => {
      i++;
      if (!zhuolu) return { r: 0, b: i % 3 === 0 ? 1 : 0 };
      const c = ((i - 1) % 13) + 1; /* 13 輪一個循環：第 3、6、9、12 輪蚩尤，第 13 輪涿鹿兵主 */
      return { r: 0, b: c % 3 === 0 || c === 13 ? 1 : 0 };
    };
  }
};
const LINES = [
  ['凶地', MECH.凶地],
  ['心魔幻境', MECH.心魔幻境],
  ['鬼門關（Lv70 前只打閻羅）', MECH.鬼門關(0)],
  ['鬼門關（Lv70 後混打十殿閻羅）', MECH.鬼門關(1)],
  ['陰兵借道（只打蚩尤，Lv65～69）', MECH.陰兵借道(0)],
  ['陰兵借道（蚩尤＋涿鹿兵主，Lv70+）', MECH.陰兵借道(1)]
];
const MAXR = 400000; /* 上限輪數（約 1.9 萬小時）：沒到就記「不會到」 */
/* 從 n0 顆開始跑，回 [到 C 的輪數, 到 C+5 的輪數]（到不了是 Infinity） */
function once(mk, C, n0) {
  const step = mk();
  let n = n0,
    tA = n >= C ? 0 : Infinity,
    tB = n >= C + KB ? 0 : Infinity,
    k = 0;
  while (k < MAXR && tB === Infinity) {
    k++;
    const o = step(n < C);
    n += o.r + o.b;
    if (tA === Infinity && n >= C) tA = k;
    if (tB === Infinity && n >= C + KB) tB = k;
    /* 只有機率掉落的機制：滿了以後再也不會進來 → (b) 不會到 */
    if (tA !== Infinity && o.b === 0 && k > tA + 3 * 13 * 3 && mk.noBoss) break;
  }
  return [tA, tB];
}
const q = (a, p) => {
  const s = a.filter(Number.isFinite).sort((x, y) => x - y);
  if (s.length < a.length * p) return Infinity;
  return s[Math.min(s.length - 1, Math.ceil(a.length * p) - 1)];
};
const hrs = x => (Number.isFinite(x) ? (x * HR).toFixed(1) : '不會到');
/* 每小時期望（只算機率／王保底，不套上限）：長跑 2,000,000 輪 */
function rate(mk) {
  const step = mk(),
    N = 2000000;
  let r = 0,
    b = 0;
  for (let i = 0; i < N; i++) {
    const o = step(true);
    r += o.r;
    b += o.b;
  }
  return { r: r / N / HR, b: b / N / HR };
}
let out = `每格 ${TR} 次蒙地卡羅（seed 20261124）；每輪 ${SEC}＋${GAP} 秒＝${(1 / HR).toFixed(2)} 輪／小時（V7：估算，等測試階段再實測）；王場時間不算\n\n`;
const csv14 = [['機制', '倉房', '正常格數C', '起點', '門檻', 'P50(小時)', 'P90(小時)', '期望值(小時)']],
  csv15 = [
    [
      '機制',
      '每小時 機率掉落r',
      '每小時 王保底b',
      '合計λ',
      '對照每小時 1～2 顆',
      '從 0 到 18 顆 P50',
      'P90',
      '期望 18÷λ',
      '第一顆 P50',
      '第一顆 P90'
    ]
  ];
for (const [name, mk] of LINES) {
  mk.noBoss = !/陰兵/.test(name);
  const R0 = rate(mk),
    lam = R0.r + R0.b;
  /* 第 15 項：18 顆、第一顆（不會碰到上限：C ≥ 30） */
  const t18 = [],
    t1 = [];
  for (let i = 0; i < TR; i++) {
    t18.push(once(mk, 18, 0)[0]);
    t1.push(once(mk, 1, 0)[0]);
  }
  csv15.push([
    name,
    R0.r.toFixed(3),
    R0.b.toFixed(3),
    lam.toFixed(3),
    lam < 1 ? '低於' : lam > 2 ? '高於' : '在範圍內',
    hrs(q(t18, 0.5)),
    hrs(q(t18, 0.9)),
    (18 / lam).toFixed(1),
    hrs(q(t1, 0.5)),
    hrs(q(t1, 0.9))
  ]);
  out += `== ${name}：每小時 機率 ${R0.r.toFixed(3)}＋王保底 ${R0.b.toFixed(3)}＝${lam.toFixed(3)} 顆\n`;
  CAPS.forEach((C, lv) => {
    for (const n0 of [0, 18]) {
      const A = [],
        B = [];
      for (let i = 0; i < TR; i++) {
        const [a, b] = once(mk, C, n0);
        A.push(a), B.push(b);
      }
      const eA = (C - n0) / lam,
        eB = R0.b > 0 ? eA + KB / R0.b : Infinity;
      csv14.push([name, 'Lv' + lv, C, n0, `正常滿（${C}）`, hrs(q(A, 0.5)), hrs(q(A, 0.9)), eA.toFixed(1)]);
      csv14.push([
        name,
        'Lv' + lv,
        C,
        n0,
        `正常＋5 滿（${C + KB}）`,
        hrs(q(B, 0.5)),
        hrs(q(B, 0.9)),
        Number.isFinite(eB) ? eB.toFixed(1) : '不會到'
      ]);
      out += `倉房 Lv${lv}（${C}／${C + KB}）從 ${n0} 顆：正常滿 P50 ${hrs(q(A, 0.5))}、P90 ${hrs(q(A, 0.9))}（期望 ${eA.toFixed(1)}）；＋5 滿 P50 ${hrs(q(B, 0.5))}、P90 ${hrs(q(B, 0.9))}（期望 ${Number.isFinite(eB) ? eB.toFixed(1) : '不會到'}）\n`;
    }
  });
  out += '\n';
}
fs.writeFileSync(path.join(__dirname, 'econ_mech_14.csv'), '﻿' + csv14.map(r => r.join(',')).join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'econ_mech_15.csv'), '﻿' + csv15.map(r => r.join(',')).join('\n') + '\n');
out += '== 第 15 項\n' + csv15.map(r => r.join(' | ')).join('\n') + '\n';
console.log(out);
