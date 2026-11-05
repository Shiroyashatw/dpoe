/* dungeonPOE 0.2.43 · 異常強度對照（第 9 批驗收）：同一套配裝打一隻打不死的靜止／移動王，
   用遊戲實際的 hitCalc／hitMob／applyAil／ailTick 跑（不另寫公式），比流血、點燃、中毒：
   有沒有投資異常強度、有沒有加劇、改動前（單格 keepMax）vs 改動後（備份佇列）。
   用法：node tools/ail_check.js [每種設定的場數，預設 200] [每場秒數，預設 60] [--write 寫到 docs/異常強度對照.md] */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const FIGHTS = +process.argv[2] || 200,
  SECS = +process.argv[3] || 60,
  WRITE = process.argv.includes('--write');
const JS = f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
/* 改動前的 keepMax（單格）：強度比較高才換，同強度不刷新；沒有備份佇列、沒有加劇的排序 */
const OLD_KEEP =
  'const keepMax = (cur, dps, t) => (!cur || cur.t <= G.t || dps > cur.dps ? { dps, t: G.t + t } : cur);\n';
const patchOld = src => {
  const a = src.indexOf('const keepMax ='),
    b = src.indexOf('/* 最強的到期了');
  if (a < 0 || b < a) throw new Error('combat.js 的 keepMax 找不到，ail_check 的「改動前」要跟著改');
  return src.slice(0, a) + OLD_KEEP + src.slice(b);
};
function load(old) {
  const ctx = {
    console,
    Math: Object.create(Math),
    Date,
    JSON,
    Object,
    Array,
    Set,
    location: { search: '' },
    URLSearchParams
  };
  vm.createContext(ctx);
  for (const f of ['data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'mech.js']) {
    let src = JS(f);
    if (old && f === 'combat.js') src = patchOld(src);
    vm.runInContext(src, ctx, { filename: f });
  }
  vm.runInContext(
    `var G = { t: 1, mapT: 10, scene: 'map', state: 'play', mobs: [], pools: [], shots: [], grenades: [], units: [], ground: [], W: 2000, H: 2000 }, P = { x: 0, y: 0, cds: {}, mp: 1e9, hp: 1e9, ail: {} }, S, ST, TOUCH = { on: 0 };
     const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
     const num = () => {}, fx = () => {}, fxs = () => {}, sfx = () => {}, hudWarn = () => {}, die = () => {}, los = () => true, open = () => true, floorNear = () => null;
     globalThis.aggroPack = globalThis.sparks = globalThis.hitstop = globalThis.killMob = () => {};`,
    ctx
  );
  vm.runInContext(JS('skills.js'), ctx, { filename: 'skills.js' });
  /* 固定亂數 mulberry32，每場重設種子，各設定用同一串（成對比較） */
  vm.runInContext(
    `var __s = 1; Math.random = () => { let t = (__s = (__s + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };`,
    ctx
  );
  /* 一場：打 secs 秒，回傳 [擊中傷害, 異常傷害]。cfg 是設定（投資、加劇、移動） */
  vm.runInContext(
    `function fight(seed, secs, o) {
      __s = seed;
      const sw = BASES.find(b => b.k === 'weapon' && b.wt === 'sword' && !b.two);
      S = { lv: 60, eq: Object.fromEntries(EQS.map(e => [e.k, null])), pt: [], ptA: {}, asc: null, at: [], auras: [], charms: [], skills: [0, 1, 2, 3, 4].map(() => ({ a: null })) };
      S.eq.weapon = mkItem(sw.id, 10, 0);
      ST = stats(S);
      /* 同一套配裝：劍的物理 + 每種測試各加同樣大小的元素／混沌（流血測物理就不加） */
      if (o.add) ST.add[o.add] = [o.addLo, o.addHi];
      Object.assign(ST, { bleedCh: o.bleedCh || 0, poisonCh: o.poisonCh || 0, ailMag: o.ailMag || 0, poiStack: o.poiStack || 0, aggHit: o.aggHit || 0, aggIgn: o.aggIgn || 0, noMiss: 1 });
      const cf = gemCfg(mkGem('slash', 10), 0), step = 1 / 30, gap = actDur(cf);
      G.t = 1000; G.mapT = 10; P.ail = {}; P.hp = 1e12;
      const m = { D: Object.values(MOBS)[0], x: 40, y: 0, r: 12, sz: 20, hp: 1e15, mhp: 1e15, arm: 0, arm0: 0, ev: 0, vx: 0, vy: 0, aggro: 1, boss: true, mv: !!o.mv, res: { fire: 0, cold: 0, light: 0, chaos: 0 }, ail: {} };
      G.mobs = [m];
      let hit = 0, ail = 0, next = 0;
      const t1 = G.t + secs;
      for (let t = G.t; t < t1; t = G.t) {
        if (t >= next) {
          next = t + gap;
          const h0 = m.hp;
          hitMob(m, cf, 0, 0, { a: {} });
          hit += h0 - m.hp;
          if (o.aggIgnDirect) aggravate(m, 'ign');
        }
        const h1 = m.hp;
        ailTick(m, step);
        ail += h1 - m.hp;
        G.t = t + step;
      }
      return [hit, ail, gap, ST.crit];
    }`,
    ctx
  );
  return ctx;
}
const NEW = load(false),
  OLD = load(true);
const run = (ctx, o) => {
  let hit = 0,
    ail = 0,
    gap = 0;
  for (let i = 0; i < FIGHTS; i++) {
    const r = ctx.fight(1000 + i, SECS, o);
    (hit += r[0]), (ail += r[1]), (gap = r[2]);
  }
  return { hit: hit / FIGHTS / SECS, ail: ail / FIGHTS / SECS, gap };
};
/* 同一套配裝：每種測試加的元素大小一樣（約等於劍本身的傷害，讓異常的量級看得出來） */
const ADD = [60, 100];
const KINDS = [
  {
    k: 'bleed',
    name: '流血',
    base: { bleedCh: 100 },
    inv: { ailMag: 100 },
    invTxt: '異常強度 +100%',
    vars: [
      ['無加劇', {}],
      ['加劇（每次擊中後加劇現有流血，`aggHit`）', { aggHit: 1 }]
    ]
  },
  {
    k: 'ign',
    name: '點燃',
    base: { add: 'fire', addLo: ADD[0], addHi: ADD[1] },
    inv: { ailMag: 100 },
    invTxt: '異常強度 +100%',
    vars: [
      ['無加劇', {}],
      [
        '加劇（每次擊中後直接 `aggravate(m, "ign")`；遊戲裡目前只有「加劇流血時一起加劇點燃」這條路）',
        { aggIgnDirect: 1 }
      ]
    ]
  },
  {
    k: 'poi',
    name: '中毒',
    base: { poisonCh: 100, add: 'chaos', addLo: ADD[0], addHi: ADD[1] },
    inv: { ailMag: 100 },
    invTxt: '異常強度 +100%',
    inv2: { ailMag: 100, poiStack: 3 },
    inv2Txt: '異常強度 +100% 且 中毒疊層上限 +3（劇毒 +1、疫病之源 +2）',
    vars: [['無加劇', {}]]
  }
];
const f0 = x => Math.round(x).toLocaleString('en-US'),
  pc = x => (x * 100).toFixed(1) + '%',
  xx = x => '×' + x.toFixed(2);
let md = `# 異常強度對照（第 9 批驗收，0.2.43）

由 \`node tools/ail_check.js ${FIGHTS} ${SECS} --write\` 產生。**用遊戲實際的 \`hitMob\`（→ \`hitCalc\`、\`applyAil\`）與 \`ailTick\` 跑，沒有另寫公式**；「改動前」是把 \`combat.js\` 的 \`keepMax\` 換回舊的單格版本（只留最強、同強度不刷新時間）再跑同一支程式。

## 設定與限制

- **配裝**：Lv60、空欄位 + 一把單手劍（\`mkItem\`，物理基底），天賦與昇華都沒點；技能「斬擊」10 級、間隔取 \`actDur\`（每下 **${NEW.fight(1, 1, {})[2].toFixed(3)} 秒**）。點燃、中毒的測試各額外加 ${ADD[0]}～${ADD[1]} 的火焰／混沌附加傷害，流血只吃劍的物理。所以三種異常的「擊中 DPS」不一樣大，**不能拿三種異常的絕對數字互比，只看各自的倍率**。
- **目標**：一隻打不死的王（\`boss: true\`，生命 1e15，護甲、抗性都是 0，\`G.mapT = 10\`），所以「異常佔比」是沒有被減傷時的值；實戰有護甲／抗性時，點燃與中毒會比物理流血更吃抗性。
- **靜止／移動**：靜止＝\`m.mv\` 為 false；移動＝true（流血 ×2）。加劇的流血不管靜止或移動都是 ×2，所以移動時加劇沒有額外好處。
- **機率**：流血、中毒的施加機率都給 100%（機率另有來源，這張表只量「幅度」），點燃走遊戲的易燃累積。\`noMiss\`（一律命中），暴擊走遊戲的暴擊率（劍 5%，所以有少量暴擊，讓備份佇列有事可做）。
- **投資**：「異常強度 +100%」＝約 天賦「痛苦／蔓延／疫病／侵蝕」四個大點（各 +20%）+ 兩個小點（各 +10%），是現有天賦能合理拿到的量，不含輔助；中毒疊層 +3 ＝ 劇毒 +1、疫病之源 +2。
- **次數與亂數**：每種設定 **${FIGHTS} 場 × ${SECS} 秒**，每場固定亂數種子（\`1000 + 場次\`，mulberry32），所有設定用同一串種子（成對比較），重跑結果一樣。場數少、暴擊是隨機，**±1～2% 以內的差異不要當真**。
- **沒量到**：只有單一目標、單一技能連打；沒模擬玩家身上的異常、多隻怪、護甲與抗性、王的無敵階段、手機操作；加劇點燃用「每次擊中直接加劇」代替（遊戲裡還沒有來源能這樣做）。
- 「倍率」欄：對**同一版本、同樣靜止／移動**下「無投資、無加劇」那一列的總 DPS；「對單格」欄：新版對舊版（同設定）的總 DPS。

`;
const res = {};
for (const K of KINDS) {
  md += `## ${K.name}\n\n| 版本 | 設定 | 目標 | 擊中 DPS | 異常 DPS | 總 DPS | 異常佔比 | 倍率 | 對單格 |\n| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |\n`;
  const sets = [['無投資', {}]];
  sets.push([K.invTxt, K.inv]);
  if (K.inv2) sets.push([K.inv2Txt, K.inv2]);
  const rowsFor = (ctx, ver) => {
    const out = [];
    for (const [vn, vo] of K.vars)
      for (const [sn, so] of sets)
        for (const mv of [0, 1]) {
          const o = { ...K.base, ...so, ...vo, mv };
          out.push({ ver, vn, sn, mv, ...run(ctx, o) });
        }
    return out;
  };
  /* 改動前只有「無加劇」才有意義（舊版沒有加劇） */
  const oldRows = [];
  for (const [sn, so] of sets)
    for (const mv of [0, 1])
      oldRows.push({ ver: '改動前（單格）', vn: '無加劇', sn, mv, ...run(OLD, { ...K.base, ...so, mv }) });
  const newRows = rowsFor(NEW, '改動後（佇列）');
  const baseOf = (rows, mv) => rows.find(r => r.sn === '無投資' && r.vn === '無加劇' && r.mv === mv);
  const all = [...oldRows, ...newRows];
  for (const r of all) {
    const rows = r.ver.startsWith('改動前') ? oldRows : newRows,
      b = baseOf(rows, r.mv),
      tot = r.hit + r.ail,
      ov = oldRows.find(x => x.sn === r.sn && x.mv === r.mv);
    r.tot = tot;
    r.mul = tot / (b.hit + b.ail);
    r.vsOld = r.vn === '無加劇' ? tot / (ov.hit + ov.ail) : null;
    md += `| ${r.ver} | ${r.sn}${r.vn === '無加劇' ? '' : '；' + r.vn} | ${r.mv ? '移動' : '靜止'} | ${f0(r.hit)} | ${f0(r.ail)} | ${f0(tot)} | ${pc(r.ail / tot)} | ${xx(r.mul)} | ${r.vsOld == null ? '—' : xx(r.vsOld)} |\n`;
  }
  md += '\n';
  res[K.k] = all;
}
/* 重點整理 */
const pick = (k, ver, sn, vn, mv) =>
  res[k].find(r => r.ver.startsWith(ver) && r.sn === sn && r.vn === vn && r.mv === mv);
md += `## 重點

`;
for (const K of KINDS) {
  const b0 = pick(K.k, '改動後', '無投資', '無加劇', 0),
    b1 = pick(K.k, '改動後', K.invTxt, '無加劇', 0),
    c1 = pick(K.k, '改動後', '無投資', '無加劇', 1),
    d1 = pick(K.k, '改動後', K.invTxt, '無加劇', 1);
  const ga = K.vars[1] ? [0, 1].map(mv => pick(K.k, '改動後', '無投資', K.vars[1][0], mv).mul) : null;
  const gi = K.vars[1] ? [0, 1].map(mv => pick(K.k, '改動後', K.invTxt, K.vars[1][0], mv).mul) : null;
  if (ga)
    md += `- **${K.name}加劇**：無投資時總 DPS 靜止 ${xx(ga[0])}、移動 ${xx(ga[1])}；有投資再加劇 靜止 ${xx(gi[0])}、移動 ${xx(gi[1])}（倍率都對各自版本「無投資、無加劇」）。
`;
  md += `- **${K.name}**：投資異常強度 +100%，總 DPS 靜止 ${xx(b1.mul)}、移動 ${xx(d1.mul)}；異常佔比靜止 ${pc(b0.ail / b0.tot)}→${pc(b1.ail / b1.tot)}、移動 ${pc(c1.ail / c1.tot)}→${pc(d1.ail / d1.tot)}。\n`;
}
md += '\n（逐列數字見上面各表。）\n';
console.log(md);
if (WRITE) fs.writeFileSync(path.join(__dirname, '..', 'docs', '異常強度對照.md'), md, 'utf8');
