/* D1 展示頁的 6 份假存檔：從 docs/production/specs/D1-demo-checklist.md 9b 兩張表逐格照抄（raw），
   另補 demo 畫圖用的結構值（d）。倉庫上限不寫進存檔：demo 讀 js/items.js 的 INV_CAP；
   標 ≈ 的產生器費用照 js/data.js 的 GEN／GEN_MUL 公式算（genCost，n＝1）。
   用法：node tools/d1_saves.js（寫 demo/d1/saves/*.json）；node tools/d1_saves.js --check（只比對，不一致結束碼 1） */
const fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..'),
  MD = fs.readFileSync(path.join(ROOT, 'docs/production/specs/D1-demo-checklist.md'), 'utf8'),
  DATA = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
const KEYS = ['new', 'mid', 'near', 'full', 'big', 'en'],
  COLS = ['新手', '中期', '倉庫快滿', '倉庫滿', '7 位數資源', '最長英文'];

/* 9b 的兩張表：第一張 5 列「存檔設定」，第二張 22 列「欄位」 */
function tables() {
  const sec = MD.split('## 9b ')[1].split('\n## ')[0],
    T = [];
  let cur = null;
  for (const line of sec.split('\n')) {
    if (!line.startsWith('|')) {
      cur = null;
      continue;
    }
    const cells = line
      .slice(1, -1)
      .split(' | ')
      .map(s => s.trim());
    if (/^-+$/.test(cells[0])) continue;
    if (!cur) T.push((cur = { head: cells, rows: [] }));
    else cur.rows.push(cells);
  }
  return T;
}
const [SET, FLD] = tables();
if (SET.rows.length !== 5 || FLD.rows.length !== 22)
  throw new Error('9b 表列數不對：' + SET.rows.length + '／' + FLD.rows.length);
COLS.forEach((c, i) => {
  if (SET.head[i + 1] !== c || FLD.head[i + 1] !== c) throw new Error('9b 欄名不對：' + c);
});

/* 產生器費用（craft.js genCost，n＝1）：round(c × GEN_MUL^L) */
const GEN_MUL = +DATA.match(/const GEN_MUL = ([\d.]+);/)[1];
const genC = k => {
  const m = DATA.match(new RegExp(k + ": \\{ n: '[^']+', r: \\d+, c: \\{([^}]+)\\}"));
  return Object.fromEntries(
    m[1]
      .split(',')
      .map(s => s.split(':').map(x => x.trim()))
      .map(([a, b]) => [a, +b])
  );
};
const gen = (k, L) => {
  const c = genC(k),
    o = {};
  for (const m in c) o[m] = Math.round(c[m] * GEN_MUL ** L);
  return o;
};

/* demo 用的結構值：照 raw 拆，不改數字；「—」的欄位留 null，demo 改用中期並在控制列標出 */
const big = { wood: gen('wood', 112), iron: gen('iron', 118), hide: gen('hide', 104), silk: gen('silk', 96) };
const D = {
  new: {
    lv: 4,
    area: ['地層出口', 1, 5],
    boss: { prog: 62, name: '虎姑婆', hp: [100, 47] },
    life: [128, 156, 69, 69],
    res: [
      ['木', 86],
      ['生鐵', 540],
      ['靈魂', 168]
    ],
    idle: 7,
    kills: 3,
    pity: null,
    camp: [
      ['林場', 9],
      ['礦場', 6],
      ['獵場', null, '鍛造台 Lv3 出現'],
      ['絲地', null, '鍛造台 Lv8 出現'],
      ['鍛造台', 1],
      ['瞭望台', 0],
      ['斥候營', 0],
      ['民房', 1],
      ['祭壇', 1],
      ['倉房', 0]
    ],
    cost: {
      瞭望台: {
        need: [
          ['靈魂', 200, 168],
          ['木', 50, 86],
          ['生鐵', 130, 540]
        ],
        sug: 1
      },
      鍛造台: {
        need: [
          ['靈魂', 300, 168],
          ['木', 80, 86]
        ]
      },
      民房: {
        need: [
          ['靈魂', 250, 168],
          ['木', 80, 86]
        ]
      },
      祭壇: {
        need: [
          ['靈魂', 900, 168],
          ['木', 150, 86]
        ]
      },
      斥候營: {
        need: [
          ['靈魂', 400, 168],
          ['木', 100, 86],
          ['生皮', 10, 0]
        ]
      },
      倉房: {
        need: [
          ['靈魂', 2000, 168],
          ['木', 400, 86]
        ]
      },
      林場: { need: [['木', 28, 86]] },
      礦場: {
        need: [
          ['木', 30, 86],
          ['生鐵', 10, 540]
        ]
      }
    },
    goal: { name: '瞭望台 Lv1・開枯河渡口', fac: '瞭望台', pct: 84, have: 168, need: 200, res: '靈魂' },
    inv: { n: 6 },
    drops: {
      normal: [
        ['生鐵', 12],
        ['蛻變石', 1],
        ['磨刀石', 1]
      ],
      rare: [],
      leg: [],
      chase: []
    },
    filtered: 14,
    recent: [],
    away: { kind: 'none', text: '' },
    off: null,
    campGain: null,
    deaths: null,
    status: { buff: 0, debuff: 1 },
    skills: [
      { n: '斬擊', ic: 'sk_slash2' },
      { n: '旋風斬', ic: 'sk_whirl', cd: 3, left: 1.4 },
      { off: '祭壇 Lv3 開' },
      { off: '祭壇 Lv6 開' },
      { off: '祭壇 Lv9 開' }
    ],
    field: { mobs: 10, shots: 4, nums: 6, boss: 95, elite: 2 }
  },
  mid: {
    lv: 49,
    area: ['雪埋古道', 3, 48],
    boss: { prog: 84, name: '鍾馗', hp: [38, 38] },
    life: [1104, 1320, 241, 286],
    res: [
      ['木', 9860],
      ['百煉鋼', 18600],
      ['鞣皮', 2140],
      ['彩絲', 4180],
      ['靈魂', 1180]
    ],
    idle: 16,
    kills: 6,
    pity: 42,
    camp: [
      ['林場', 62],
      ['礦場', 80],
      ['獵場', 52],
      ['絲地', 78],
      ['鍛造台', 12],
      ['瞭望台', 14],
      ['斥候營', 2],
      ['民房', 6],
      ['祭壇', 6],
      ['倉房', 2]
    ],
    cost: {
      瞭望台: {
        need: [
          ['靈魂', 1460, 1180],
          ['木', 750, 9860],
          ['百煉鋼', 150, 18600]
        ],
        sug: 1
      },
      鍛造台: {
        need: [
          ['靈魂', 9000, 1180],
          ['木', 800, 9860],
          ['百煉鋼', 50, 18600],
          ['崇高石', 5, 3]
        ]
      },
      斥候營: {
        need: [
          ['靈魂', 10000, 1180],
          ['木', 800, 9860],
          ['厚革', 30, 240]
        ]
      },
      民房: {
        need: [
          ['靈魂', 15000, 1180],
          ['木', 2500, 9860]
        ]
      },
      祭壇: {
        need: [
          ['靈魂', 50000, 1180],
          ['木', 1800, 9860],
          ['彩絲', 20, 4180]
        ]
      },
      倉房: {
        need: [
          ['靈魂', 30000, 1180],
          ['木', 2000, 9860],
          ['金', 20000, 31500]
        ]
      },
      林場: { need: [['木', 11260, 9860]] },
      礦場: {
        need: [
          ['木', 129880, 9860],
          ['百煉鋼', 43290, 18600]
        ]
      },
      獵場: {
        need: [
          ['木', 5438, 9860],
          ['鞣皮', 1813, 2140]
        ]
      },
      絲地: {
        need: [
          ['木', 138050, 9860],
          ['彩絲', 34510, 4180]
        ]
      }
    },
    goal: {
      name: '瞭望台 Lv15・開冰封神殿',
      fac: '瞭望台',
      pct: 80,
      have: 1180,
      need: 1460,
      res: '靈魂',
      short: '開冰封神殿'
    },
    inv: { n: 184 },
    drops: {
      normal: [
        ['百煉鋼', 46],
        ['增幅石', 2],
        ['聖化石', 1]
      ],
      rare: [
        ['崇高石', 1],
        ['高階增幅石', 1]
      ],
      leg: [['判官筆', 1]] /* 示意：D1 審查第 8 項「中期存檔加 1 件傳奇」，9b 沒有傳奇的數值 */,
      chase: []
    },
    filtered: 49,
    recent: [
      ['赤霄印・王印 2／4', 'chase', 'wangyin_chixiao_16'],
      ['崇高石', 'rare'],
      ['高階增幅石', 'rare']
    ],
    away: { kind: 'line', min: 4, text: '離開 4 分・靈魂 +1,167' },
    off: {
      t: '離開 1 時 40 分',
      sum: '打倒王 40 次・倒下 1 次・靈魂 +29,192',
      rows: [
        ['崇高石 +43', 'rare'],
        ['高階增幅石 +4', 'rare'],
        ['百煉鋼 +4,180', 'normal']
      ],
      chase: '追逐物品 ×0、目前保底 42%',
      next: '瞭望台 Lv15・開冰封神殿'
    },
    campGain: { min: 3, text: '營地期間 靈魂 +876・14 件・◆ 1' },
    deaths: {
      rows: ['① 鍾馗・連爆線 −126（閃電）', '② 鍾馗・砸地 −139（閃電）', '③ 鍾馗・瞬移斬 −151（閃電）'],
      most: '最多：閃電 ×3・鍾馗・瞬移斬',
      tip: '閃電抗性 12%'
    },
    status: { buff: 8, debuff: 9 },
    skills: [
      { n: '穿甲彈', ic: 'sk_apshot', ammo: [4, 6], reload: 1.5 },
      { n: '爆裂榴彈', ic: 'sk_combust', ammo: [1, 2], next: 2.6 },
      { n: '油榴彈', ic: 'sk_poisontrap', ammo: [2, 2] },
      { n: '狂暴戰吼', ic: 'sk_warcry', cd: 8, left: 5.1 },
      { off: '祭壇 Lv9 開' }
    ],
    field: { mobs: 14, shots: 24, nums: 20, boss: 110, elite: 4 }
  },
  near: {
    lv: 54,
    area: ['冰封神殿', 3, 53],
    res: [
      ['木', 12400],
      ['百煉鋼', 31200],
      ['鞣皮', 3050],
      ['彩絲', 6020],
      ['靈魂', 9240]
    ],
    idle: 65,
    kills: 27,
    pity: 76,
    camp: [
      ['林場', 66],
      ['礦場', 84],
      ['獵場', 56],
      ['絲地', 80],
      ['鍛造台', 13],
      ['瞭望台', 15],
      ['斥候營', 2],
      ['民房', 7],
      ['祭壇', 6],
      ['倉房', 2]
    ],
    goal: { name: '斥候營 Lv3・開 4★', fac: '斥候營', pct: 92, have: 9240, need: 10000, res: '靈魂' },
    inv: { free: 3 },
    drops: {
      normal: [
        ['玄鐵', 58],
        ['轉化石', 3]
      ],
      rare: [
        ['崇高石', 2],
        ['高階崇高石', 1],
        ['破裂石', 1]
      ],
      leg: [],
      chase: []
    },
    filtered: 61,
    recent: [
      ['破裂石', 'rare'],
      ['高階崇高石', 'rare'],
      ['崇高石', 'rare']
    ]
  },
  full: {
    lv: 59,
    area: ['血原邊境', 4, 58],
    res: [
      ['木', 15900],
      ['百煉鋼', 44600],
      ['鞣皮', 4300],
      ['彩絲', 8700],
      ['靈魂', 14200]
    ],
    idle: 42,
    kills: 17,
    pity: 18,
    camp: [
      ['林場', 70],
      ['礦場', 88],
      ['獵場', 60],
      ['絲地', 82],
      ['鍛造台', 14],
      ['瞭望台', 16],
      ['斥候營', 3],
      ['民房', 7],
      ['祭壇', 7],
      ['倉房', 2]
    ],
    goal: { name: '鍛造台 Lv15・開腐化', fac: '鍛造台', pct: 78, have: 14200, need: 18000, res: '靈魂' },
    inv: { free: 0, spare: [7, 50] },
    drops: {
      normal: [
        ['玄鐵', 64],
        ['預知石', 1]
      ],
      rare: [
        ['崇高石', 3],
        ['破裂石', 1]
      ],
      leg: [],
      chase: []
    },
    filtered: 65,
    recent: [
      ['疾霆印・王印 3／4', 'chase', 'wangyin_jiting_16'],
      ['破裂石', 'rare'],
      ['崇高石', 'rare']
    ],
    away: { kind: 'settle', text: '3 時 12 分' },
    off: {
      t: '離開 3 時 12 分',
      sum: '打倒王 78 次・倒下 2 次・靈魂 +64,172',
      rows: [
        ['破裂石 +3', 'rare'],
        ['崇高石 +84', 'rare'],
        ['玄鐵 +2,960', 'normal']
      ],
      chase: '追逐物品 ×1、目前保底 18%（疾霆印）',
      chaseIc: 'wangyin_jiting_16',
      next: '鍛造台 Lv15・開腐化'
    }
  },
  big: {
    lv: 86,
    area: ['裂口腹地', 5, 83],
    life: [3918, 4860, 1020, 1020],
    res: [
      ['木', 3402118],
      ['百煉鋼', 2870455],
      ['厚革', 1106930],
      ['彩絲', 1012764],
      ['靈魂', 1284560]
    ],
    idle: 138,
    kills: 57,
    pity: 0,
    filtered: 37 /* D1-fix-fakedata §1a「+37 件已收」（假定） */,
    camp: [
      ['林場', 112],
      ['礦場', 118],
      ['獵場', 104],
      ['絲地', 96],
      ['鍛造台', 20, 'max'],
      ['瞭望台', 21],
      ['斥候營', 4, 'max'],
      ['民房', 10, 'max'],
      ['祭壇', 11, 'max'],
      ['倉房', 5, 'max']
    ],
    cost: {
      瞭望台: {
        need: [
          ['靈魂', 3100, 1284560],
          ['木', 1100, 3402118],
          ['隕鐵', 220, 1840]
        ],
        sug: 1
      },
      林場: { need: [['木', big.wood.wood, 3402118]] },
      礦場: {
        need: [
          ['木', big.iron.wood, 3402118],
          ['百煉鋼', big.iron.iron, 2870455]
        ]
      },
      獵場: {
        need: [
          ['木', big.hide.wood, 3402118],
          ['厚革', big.hide.hide, 1106930]
        ]
      },
      絲地: {
        need: [
          ['木', big.silk.wood, 3402118],
          ['彩絲', big.silk.silk, 1012764]
        ]
      }
    },
    goal: { name: '瞭望台 Lv22・開鬼門關', fac: '瞭望台', pct: 100, have: 3100, need: 3100, res: '靈魂' },
    off: {
      t: '離開 12 時 0 分',
      sum: '打倒王 296 次・倒下 4 次・靈魂 +316,800',
      rows: [
        ['破裂石 +13', 'rare'],
        ['崇高石 +313', 'rare'],
        ['隕鐵 +18,400', 'normal']
      ],
      chase: '追逐物品 ×6、目前保底 0%',
      chaseIc: 'wangyin_guixu_16',
      next: '瞭望台 Lv22・開鬼門關'
    },
    campGain: { min: 8, text: '營地期間 王印 1・靈魂 +3,520・41 件・◆ 3', chase: 1 }
  },
  en: {
    lv: 72,
    area: ['雪埋古道', 5, 48],
    en: {
      area: 'Broken Stele Field · 5★ · Monster Lv 48',
      boss: 'Venom Serpent Queen 100%',
      bossName: 'Venom Serpent Queen',
      prog: 'Boss 99%',
      idle: 'Idle 23h 59m · 599 boss kills',
      pity: 'Chase pity 100%',
      fac: 'Hunting Ground',
      goal: 'Next goal: Anvil Lv18 · Higher-tier currency',
      stash: 'Stash almost full: 3 slots left',
      filtered: '+138 items collected',
      recent: ['Perfect Calamity Orb', 'Ink of Remembrance', 'Boss Seal · 4/4'],
      away: 'Away 11h 59m',
      offSum: '296 boss kills · 3 deaths',
      campGain: 'While in camp: Boss Seal 1 · Souls +2,336 · 37 items · ◆ 2',
      death: '③ Venom Serpent Queen · Tenfold Wheel −126 (Chaos)',
      skills: ['Elemental Weakness', 'Refracting Arrow', 'Temporal Chains', 'Lightning Arrow', 'Stoneskin Flask'],
      drops: ['Conversion Orb', 'Perfect Calamity Orb', 'Ink of Remembrance']
    },
    boss: { prog: 99, name: '毒涎蛇姬', hp: [100, 100] },
    idle: 1439,
    kills: 599,
    pity: 100,
    camp: [
      ['林場', 90],
      ['礦場', 100],
      ['獵場', 80],
      ['絲地', 84],
      ['鍛造台', 17],
      ['瞭望台', 18],
      ['斥候營', 4],
      ['民房', 8],
      ['祭壇', 9],
      ['倉房', 5]
    ],
    goal: { name: '鍛造台 Lv18・開高階通貨', fac: '鍛造台', pct: 82, have: 41000, need: 50000, res: '靈魂' },
    inv: { free: 3 },
    drops: {
      normal: [['轉化石', 2]],
      rare: [
        ['完美災魘石', 1],
        ['追憶之墨', 1]
      ],
      leg: [],
      chase: []
    },
    filtered: 138,
    recent: [
      ['完美災魘石', 'rare'],
      ['追憶之墨', 'rare'],
      ['王印 4／4', 'chase', 'wangyin_guixu_16']
    ],
    away: { kind: 'settle', text: '11 時 59 分' },
    off: {
      t: '離開 11 時 59 分',
      sum: '打倒王 296 次・倒下 3 次・靈魂 +209,892',
      rows: [
        ['破裂石 +13', 'rare'],
        ['崇高石 +313', 'rare'],
        ['追憶之墨 +4', 'rare']
      ],
      chase: '追逐物品 ×6、目前保底 100%',
      chaseIc: 'wangyin_guixu_16',
      next: '鍛造台 Lv18・開高階通貨'
    },
    campGain: { min: 8, chase: 1 },
    deaths: { rows: ['③ 毒涎蛇姬・十殿輪轉 −126（混沌）'] },
    skills: [
      { n: '元素要害', ic: 'sk_elemweak' },
      { n: '折射箭矢', ic: 'sk_markshot' },
      { n: '時空鎖鏈', ic: 'sk_chaoschain' },
      { n: '閃電箭', ic: 'sk_lightarrow' },
      { n: '石膚藥劑', ic: 'sk_determination' }
    ]
  }
};

const out = {};
KEYS.forEach((k, i) => {
  out[k] = {
    key: k,
    name: COLS[i],
    setup: Object.fromEntries(SET.rows.map(r => [r[0], r[i + 1]])),
    raw: Object.fromEntries(FLD.rows.map(r => [r[0], r[i + 1]])),
    d: D[k]
  };
});
const dir = path.join(ROOT, 'demo/d1/saves');
if (process.argv.includes('--check')) {
  let bad = 0;
  for (const k of KEYS) {
    const f = path.join(dir, k + '.json'),
      have = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
    const ok =
      have &&
      JSON.stringify(have.raw) === JSON.stringify(out[k].raw) &&
      JSON.stringify(have.setup) === JSON.stringify(out[k].setup);
    const n = have ? Object.keys(have.raw).length : 0;
    console.log((ok && n === 22 ? '✅' : '❌') + ` ${k}.json ${n} 欄與 9b 逐格相同：${ok ? '是' : '否'}`);
    if (!ok || n !== 22) bad = 1;
  }
  process.exit(bad);
}
fs.mkdirSync(dir, { recursive: true });
for (const k of KEYS) fs.writeFileSync(path.join(dir, k + '.json'), JSON.stringify(out[k], null, 1) + '\n');
console.log('寫好 ' + KEYS.length + ' 份：' + dir);
