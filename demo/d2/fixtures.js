/* D2 展示頁假資料：照 docs/production/specs/D2-fakedata.md v1.0（數值設計師；對 origin/main 02100c4）。只換這個檔。
   欄位編號照 D2-fakedata.md §1–§20；存檔沿用 D1 9b 六份（new 新手、mid 中期、near 倉庫快滿、full 倉庫滿、big 7 位數、en 最長英文）。
   推不出來的照 fakedata 標「假定」（asm: 1 或註解）；畫面上需要的地方掛「假定」角標。
   倉庫上限 INV_CAP／INV_SPARE 不寫在這裡：demo.js 讀 js/items.js（PF-D2-4 用 ?invcap=280 改）。 */
'use strict';
const FX = (() => {
  const PH = '假資料：D2-fakedata.md v1.0（數值設計師）；推不出來的標「假定」';
  /* §1 裝備欄：程式 EQS 10 格＋第三戒指（異變者點亮才開）＋腰帶的護符槽（格數 假定 2） */
  const SLOTS = [
    '武器',
    '副手',
    '頭部',
    '胸甲',
    '手套',
    '鞋子',
    '腰帶',
    '項鍊',
    '戒指',
    '戒指',
    '第三戒指',
    '護符',
    '護符'
  ];
  const MAIN = 10; /* 主欄 10 格 */
  const IC = [
    'gear_weapon_3',
    'gear_offhand_2',
    'gear_helm_4',
    'gear_chest_5',
    'gear_gloves_2',
    'gear_boots_6',
    'gear_belt_3',
    'gear_amulet_4',
    'gear_ring_2',
    'gear_ring_5',
    'gear_ring_3',
    'it_c_alchemy',
    'it_c_alchemy'
  ];
  /* 每部位的底材名（倉庫產生用）：中期 T3、7 位數 T6（§1；箭袋底材 假定） */
  const BASE = {
    mid: ['連弩', '箭袋', '鐵盔', '鎖子甲', '鐵手甲', '鐵脛靴', '鐵扣帶', '月長墜', '翡翠戒'],
    big: ['神機弩', '箭袋', '金剛盔', '金剛鎧', '金剛手甲', '金剛靴', '龍鱗帶', '日輪墜', '天珠戒'],
    near: [
      '玄鐵弩',
      '箭袋',
      '玄鐵盔',
      '玄鐵甲',
      '玄鐵手甲',
      '玄鐵靴',
      '玄鐵扣帶',
      '玄鐵墜',
      '玄鐵戒'
    ] /* T4 底材名 假定 */,
    new: ['短劍', '箭袋', '皮帽', '皮甲', '皮手套', '草鞋', '麻繩帶', '骨墜', '鐵戒'] /* 皮帽等 假定 */
  };
  const X3 = { lock: '異變者點亮才開' }; /* 第三戒指：沒選異變者 */
  /* §1 中期（角色 Lv49，T3，物品等級 7）。rar：normal 普通／magic 魔法／rare 稀有／leg 傳奇；seal＝帶王印（同時帶追逐標記 chase）；
     frac＝★ 破裂；mem＝追憶詞；cor＝腐化；no＝不能裝備的原因。詞綴數值全部 假定（在 AFF 範圍內） */
  const eqMid = [
    {
      n: '連弩',
      rar: 'rare',
      T: 'T3',
      mods: ['增加 62% 物理傷害', '附加 4–9 物理傷害', '增加 12% 攻擊速度', '+2% 暴擊率'],
      seal: { k: '赤霄印', mod: '干將：對王與菁英增加 34% 傷害' },
      chase: 1
    },
    { n: '箭袋', rar: 'magic', T: 'T3', mods: ['+18% 冰冷抗性', '最大生命 +34'], asm: 1 },
    { n: '鐵盔', rar: 'rare', T: 'T3', mods: ['護甲 +88', '最大生命 +46', '+21% 火焰抗性'] },
    { n: '鎖子甲', rar: 'rare', T: 'T3', mods: ['護甲 +120', '最大生命 +58', '+16% 閃電抗性', '4 物理荊棘傷害'] },
    { n: '鐵手甲', rar: 'magic', T: 'T3', mods: ['增加 8% 攻擊速度', '+12% 冰冷抗性'] },
    { n: '鐵脛靴', rar: 'rare', T: 'T3', mods: ['增加 18% 移動速度', '最大生命 +40', '+14% 混沌抗性'] },
    { n: '鐵扣帶', rar: 'magic', T: 'T3', mods: ['最大生命 +52'] },
    { n: '月長墜', rar: 'rare', T: 'T3', mods: ['增加 16% 暴擊率', '+9% 全元素抗性', '最大魔力 +24'] },
    { n: '翡翠戒', rar: 'magic', T: 'T3', mods: ['附加 6 冰冷傷害', '+20% 火焰抗性'] },
    { n: '紫晶戒', rar: 'normal', T: 'T3', mods: [] },
    X3,
    null,
    null /* 護符 2 格空（格數 假定） */
  ];
  /* §1 新手（Lv4，T1，物品等級 1）：頭部、手套、腰帶空（D2 要 3 格空）；沒腰帶 → 護符槽沒開 */
  const NOBELT = { lock: '裝上腰帶才有' };
  const eqNew = [
    { n: '短劍', rar: 'normal', T: 'T1', mods: [] },
    null,
    null,
    { n: '皮甲', rar: 'magic', T: 'T1', mods: ['最大生命 +12', '+8% 火焰抗性'] },
    null,
    { n: '草鞋', rar: 'normal', T: 'T1', mods: [] },
    null,
    null,
    { n: '鐵戒', rar: 'magic', T: 'T1', mods: ['附加 2 物理傷害'] },
    null,
    X3,
    NOBELT,
    NOBELT
  ];
  /* §1 7 位數（Lv86，T6，物品等級 16）：條數照 fakedata，數值全部 假定 */
  const eqBig = [
    {
      n: '神機弩',
      rar: 'rare',
      T: 'T6',
      mods: [
        '增加 158% 物理傷害',
        '附加 18–26 物理傷害',
        '增加 26% 攻擊速度',
        '+5% 暴擊率',
        '+64% 暴擊傷害加成',
        '擊中敵人時獲得 18 生命'
      ],
      frac: 1,
      seal: { k: '赤霄印', mod: '干將：對王與菁英增加 34% 傷害' },
      chase: 1
    },
    {
      n: '箭袋',
      rar: 'rare',
      T: 'T6',
      mods: ['+38% 冰冷抗性', '最大生命 +96', '增加 18% 投射物速度', '+31% 閃電抗性'],
      asm: 1
    },
    {
      n: '金剛盔',
      rar: 'rare',
      T: 'T6',
      mods: ['護甲 +412', '最大生命 +118', '+36% 火焰抗性', '+28% 冰冷抗性', '+14% 混沌抗性'],
      cor: 1
    },
    {
      n: '金剛鎧',
      rar: 'rare',
      T: 'T6',
      mods: ['護甲 +960', '最大生命 +142', '+38% 閃電抗性', '+30% 火焰抗性', '增加 12% 護甲', '最大能量護盾 +88'],
      mem: 1
    },
    {
      n: '金剛手甲',
      rar: 'rare',
      T: 'T6',
      mods: ['增加 14% 攻擊速度', '最大生命 +88', '+33% 冰冷抗性', '護甲 +240'],
      seal: { k: '疾霆印', mod: '疾霆印詞（假定）' },
      chase: 1
    },
    {
      n: '金剛靴',
      rar: 'rare',
      T: 'T6',
      mods: ['增加 30% 移動速度', '最大生命 +104', '+36% 閃電抗性', '+22% 混沌抗性']
    },
    { n: '龍鱗帶', rar: 'rare', T: 'T6', mods: ['最大生命 +128', '護甲 +320', '+34% 火焰抗性', '+28% 冰冷抗性'] },
    {
      n: '日輪墜',
      rar: 'rare',
      T: 'T6',
      mods: ['增加 34% 暴擊率', '+16% 全元素抗性', '最大魔力 +62', '最大生命 +74', '+40 敏捷']
    },
    {
      n: '天珠戒',
      rar: 'rare',
      T: 'T6',
      mods: ['附加 12–21 冰冷傷害', '+38% 火焰抗性', '最大生命 +66', '+31% 閃電抗性'],
      seal: { k: '歸墟印', mod: '水幕：每 10 秒擋下一次擊中（上限 15% 生命）' },
      chase: 1
    },
    { n: '天珠戒', rar: 'rare', T: 'T6', mods: ['+42 敏捷', '+35% 冰冷抗性', '最大生命 +70'] },
    X3,
    null,
    null
  ];
  /* §20 最長英文：底材、詞綴、印詞沒有 EN（待 mumi）→ 英文長名全部 假定，只做版面壓力測試 */
  const eqEn = eqMid.map((e, i) =>
    e && e.n
      ? Object.assign({}, e, {
          asm: 1,
          n:
            [
              'Repeating Crossbow of the Crimson Sky Sovereign',
              'Quiver of the Northern Wind Warden',
              'Iron Helm of Unbroken Vigilance'
            ][i] || 'Chainmail Hauberk of the Mountain Seal Bearer',
          mods: [
            '62% increased Physical Damage with Attacks against Bleeding Enemies',
            'Adds 4 to 9 Physical Damage to Attacks with this Weapon',
            '+2% to Critical Strike Chance'
          ],
          seal: e.seal ? { k: e.seal.k, mod: 'Ganjiang: 34% increased Damage against Bosses and Elites' } : null
        })
      : e
  );
  /* §3 角色數值（全部 假定；照抗性上限 75%） */
  const stMid = { dps: 1842, hp: 2140, es: 0, armor: 3412, eva: 640, res: [41, 30, 16, -12] };
  const stBig = { dps: 128400, hp: 12480, es: 1860, armor: 21840, eva: 4120, res: [75, 75, 75, 38] };
  const stNew = {
    dps: 12,
    hp: 64,
    es: 0,
    armor: 14,
    eva: 10,
    res: [8, 0, 0, 0]
  }; /* 新手 假定（fakedata 只給中期、7 位數） */
  /* §4 比較差值（中期，全部 假定）：▲ +12%、▼ −3%、—、▲▲ +31%、空槽「頭部空著：任何能裝的都算 ▲」 */
  const cmp = {
    pick: {
      d: { dps: 12, hp: -3 },
      rows: [
        ['DPS', 1842, 2063],
        ['生命', 2140, 2076],
        ['護甲', 3412, 3412],
        ['攻擊速度', 1.68, 1.74]
      ]
    },
    big: { d: { dps: 31, hp: 0 } }
  };
  /* §2 倉庫：件數、INV_SPARE 用量、每部位（武／副／頭／胸／手／鞋／腰／項／戒）、▲、▲▲、鎖。pre＝批次分解預選組成 [普通, 魔法]
     （倉庫快滿 38＝20＋18 照 §9；其他存檔 假定）。件數分布、▲ 全部 假定 */
  const inv = {
    new: { n: 4, spare: 0, slots: [2, 0, 0, 1, 0, 0, 0, 0, 1], up: 1, up2: 0, lock: 0, pre: [2, 1] },
    mid: { n: 186, spare: 0, slots: [34, 12, 20, 26, 18, 22, 14, 16, 24], up: 9, up2: 1, lock: 2, pre: [30, 26] },
    near: { n: 276, spare: 0, slots: [48, 20, 30, 38, 28, 32, 24, 22, 34], up: 12, up2: 1, lock: 2, pre: [20, 18] },
    full: { n: 300, spare: 7, slots: [52, 22, 32, 42, 30, 36, 26, 24, 36], up: 14, up2: 1, lock: 2, pre: [28, 24] },
    big: { n: 240, spare: 23, slots: [40, 16, 26, 30, 24, 28, 22, 20, 34], up: 6, up2: 1, lock: 2, pre: [10, 8] },
    en: { n: 150, spare: 4, slots: [26, 10, 16, 20, 14, 18, 12, 14, 20], up: 5, up2: 1, lock: 2, pre: [12, 10] }
  };
  /* 倉庫前幾件（展示用的特別件；名照底材）。INV_SPARE 0 的存檔不放 ★／追憶／追逐物品 */
  const head = b => [
    {
      n: b[0],
      slot: 0,
      rar: 'rare',
      up: 1,
      ic: 'gear_weapon_7',
      mods: ['增加 74% 物理傷害', '附加 5–11 物理傷害', '增加 16% 攻擊速度', '+3% 暴擊率']
    } /* ▲ +12%（比較、說明用這件；詞綴 假定） */,
    {
      n: b[0],
      slot: 0,
      rar: 'rare',
      up: 2,
      ic: 'gear_weapon_11',
      mods: ['增加 96% 物理傷害', '附加 7–14 物理傷害', '增加 18% 攻擊速度', '+4% 暴擊率']
    } /* ▲▲ +31% */,
    { n: b[2], slot: 2, rar: 'rare', up: 1, ic: 'gear_helm_6', lock: 1 },
    { n: b[3], slot: 3, rar: 'rare', ic: 'gear_chest_8', lock: 1 },
    { n: b[4], slot: 4, rar: 'magic', up: 1, ic: 'gear_gloves_5' },
    {
      n: '鐵爪',
      slot: 1,
      rar: 'rare',
      ic: 'gear_offhand_3',
      no: '只有爪、匕首、單手的劍與斧能雙持（要同一類）',
      asm: 1
    } /* 不能裝備：程式只找到雙持規則（items.js:386），這件 假定 */
  ];
  const spareHead = b => [
    { n: b[0], slot: 0, rar: 'rare', frac: 1, ic: 'gear_weapon_9' },
    { n: b[3], slot: 3, rar: 'rare', mem: 1, ic: 'gear_chest_6' },
    { n: b[6], slot: 6, rar: 'rare', chase: 1, seal: { k: '歸墟印' }, ic: 'gear_belt_5' }
  ];
  /* §10 通貨（數量全部 假定；7 位數照 K／M 邊界）。[名, 圖, 數量, 不能用的原因] */
  const why = (n, lv) => `還沒拿到。${n}在鍛造台 Lv ${lv} 之後開始掉。`;
  const CUR = [
    ['蛻變石', 'cur_trans'],
    ['增幅石', 'cur_aug'],
    ['富豪石', 'cur_regal', 4],
    ['崇高石', 'cur_exalt', 7],
    ['轉化石', 'cur_chaos', 10],
    ['預知石', 'cur_wish', 10],
    ['磨刀石', 'cur_whet'],
    ['護甲片', 'cur_scrap'],
    ['聖化石', 'cur_prism', 12],
    ['腐化石', 'cur_vaal', 15],
    ['破裂石', 'cur_scrap', 13],
    ['追憶之墨', 'cur_soul', 17],
    ['完美石', 'cur_alch', 19],
    ['覺醒石', 'cur_eng', 20]
  ];
  const curOf = v => CUR.map(([n, ic, lv], i) => [n, ic, v[i], v[i] ? '' : lv ? why(n, lv) : '還沒拿到']);
  const curNew = curOf([3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const curMid = curOf([412, 286, 64, 148, 12, 9, 820, 760, 3, 0, 0, 0, 0, 0]);
  const curBig = curOf([9999, 10000, 99950, 1234567, 812, 64, 4210, 3980, 37, 22, 14, 9, 3, 5]);
  /* §19 貨幣條：只放金、靈魂（D1-fix §9）。倉庫快滿、倉庫滿、最長英文的值 假定 */
  const res = {
    new: [
      ['金', 0],
      ['靈魂', 0]
    ],
    mid: [
      ['金', 8640],
      ['靈魂', 1180]
    ],
    near: [
      ['金', 21480],
      ['靈魂', 3920]
    ],
    full: [
      ['金', 64172],
      ['靈魂', 5610]
    ],
    big: [
      ['金', 3402118],
      ['靈魂', 1284560]
    ],
    en: [
      ['金', 209892],
      ['靈魂', 48260]
    ]
  };
  /* §19 藥劑：生命、魔力藥劑不限次數、各自冷卻 3 秒、沒有充能（mumi 14:04；game.js:956–970）。六份存檔都一樣 */
  const FLASK_CD = 3000;
  /* §5 打造設定、§6 材料。部位照 MK_KINDS（forge.js:11）：中期全部 11 種；新手箭袋要鍛造台 Lv3、法器 Lv8。
     鎖住的階／件數程式不顯示，字 假定（asm）。mat：[材料, 每件, 現有]；lack：缺料例 [材料, 每件, 現有, 件數] */
  const KINDS = ['武器', '盾', '法器', '箭袋', '頭部', '胸甲', '手套', '鞋子', '腰帶', '項鍊', '戒指'];
  const forgeMid = {
    parts: KINDS,
    open: KINDS.map(() => 1),
    tiers: ['T1', 'T2', 'T3'],
    tierLock: ['T4', '瞭望台 Lv15 開冰封神殿後'],
    tier: 2,
    counts: [1, 3, 5, 10],
    countLock: [20, '鍛造台 Lv16'],
    count: 3,
    ilvl: 7,
    odds: [
      ['普通', 30],
      ['魔法', 50],
      ['稀有', 20]
    ],
    rarePity: 3 /* 「再 {n} 件沒出稀有，下一件一定是稀有」的 n 假定 */,
    mat: ['百煉鋼', 8, 18600],
    lack: ['熟鐵', 8, 28, 5, 'T2', 5] /* 胸甲 T2 ×5：要 40、現有 28 → 熟鐵還差 12（parts 第 5 個＝胸甲） */
  };
  const forgeNew = Object.assign({}, forgeMid, {
    open: KINDS.map(k => (k === '法器' || k === '箭袋' ? 0 : 1)),
    nextLock: ['箭袋', '鍛造台 Lv3'],
    tiers: ['T1'],
    tierLock: ['T2', '升瞭望台到能刷熟鐵的地點'],
    tier: 0,
    counts: [1],
    countLock: [3, '鍛造台 Lv2'],
    count: 0,
    ilvl: 1,
    odds: [
      ['普通', 70],
      ['魔法', 30]
    ],
    rarePity: 0,
    mat: ['生鐵', 8, 4] /* 現有 4 假定 → 生鐵還差 4 */
  });
  const forgeBig = Object.assign({}, forgeMid, {
    tiers: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    tierLock: null,
    tier: 5,
    counts: [1, 3, 5, 10, 20],
    countLock: null,
    count: 4,
    ilvl: 16,
    odds: [
      ['普通', 10],
      ['魔法', 50],
      ['稀有', 40]
    ],
    part: 10 /* 戒指 */,
    mat: ['隕鐵', 3, 64020],
    gold: [60, 3402118] /* 戒指每件 金 10 × 階 */
  });
  /* §7 一批 10 件（中期，武器 T3 → 連弩）：普通 3、魔法 5、稀有 2（照期望值）；▲ 2（含 ▲▲ 1）；T0／★ 中期做不到、追逐 0。
     自動分解 6 件（3 普通＋3 沒 ▲ 的魔法）；回收 百煉鋼 +30、靈魂 +84、72 金（賣價 假定） */
  const batch = [
    { n: '連弩', rar: 'rare', d: 'DPS −2%', ic: 'gear_weapon_7' },
    { n: '連弩', rar: 'magic', up: 2, d: 'DPS +31%', ic: 'gear_weapon_11' },
    { n: '連弩', rar: 'rare', d: 'DPS −5%', ic: 'gear_weapon_9' },
    { n: '連弩', rar: 'normal', d: '—', ic: 'gear_weapon_2', sal: 1 },
    { n: '連弩', rar: 'magic', up: 1, d: 'DPS +12%', ic: 'gear_weapon_5' },
    { n: '連弩', rar: 'normal', d: '—', ic: 'gear_weapon_2', sal: 1 },
    { n: '連弩', rar: 'magic', d: '—', ic: 'gear_weapon_4', sal: 1 },
    { n: '連弩', rar: 'normal', d: '—', ic: 'gear_weapon_1', sal: 1 },
    { n: '連弩', rar: 'magic', d: '—', ic: 'gear_weapon_0', sal: 1 },
    { n: '連弩', rar: 'magic', d: '—', ic: 'gear_weapon_4', sal: 1 }
  ];
  const batchSal = [
    ['百煉鋼', 30],
    ['靈魂', 84],
    ['金', 72]
  ];
  /* §9 批次分解回收（倉房 Lv2 → 65%）：每件 [材料, 材料數, 靈魂, 金（賣價 假定 12）]。倉庫快滿、倉庫滿 T4 玄鐵、物品等級 10 */
  const sal = {
    mid: ['百煉鋼', 3, 14, 12],
    near: ['玄鐵', 3, 20, 12],
    full: ['玄鐵', 3, 20, 12],
    big: ['隕鐵', 3, 32, 12] /* 7 位數 假定 */,
    new: ['生鐵', 3, 2, 12],
    en: ['百煉鋼', 3, 14, 12]
  };
  /* §11 鍛造台（中期 Lv12）：放上連弩；組照程式分頁（填＝加詞、淬鍊、聖化）；破裂 Lv13、腐化 Lv15 沒開（只畫下一個）；
     災魘石 0 且分頁不出、判官筆無（假定） */
  const anvilMid = {
    item: 0,
    groups: [
      [
        '加詞',
        [
          ['蛻變石', 'cur_trans', 412, '只能用在普通物品'],
          ['增幅石', 'cur_aug', 286, '只能用在魔法物品'],
          ['富豪石', 'cur_regal', 64, '只能用在魔法物品'],
          ['崇高石', 'cur_exalt', 148, '']
        ]
      ],
      [
        '淬鍊',
        [
          ['磨刀石', 'cur_whet', 820, ''],
          ['護甲片', 'cur_scrap', 760, '只能用在防具'],
          ['轉化石', 'cur_chaos', 12, ''],
          ['預知石', 'cur_wish', 9, '']
        ]
      ],
      ['聖化', [['聖化石', 'cur_prism', 3, '']]]
    ],
    next: ['破裂', '鍛造台 Lv13 才開']
  };
  /* 7 位數（鍛造台 Lv20）：腐化開了（腐化石 22）；放上神機弩 */
  const anvilBig = {
    item: 0,
    groups: [
      [
        '加詞',
        [
          ['蛻變石', 'cur_trans', 9999, '只能用在普通物品'],
          ['崇高石', 'cur_exalt', 1234567, '']
        ]
      ],
      [
        '淬鍊',
        [
          ['磨刀石', 'cur_whet', 4210, ''],
          ['轉化石', 'cur_chaos', 812, '']
        ]
      ],
      ['聖化', [['聖化石', 'cur_prism', 37, '']]],
      ['腐化', [['腐化石', 'cur_vaal', 22, '']]]
    ],
    next: null
  };
  /* §12 技能（中期祭壇 6：4 格、輔助孔 2）。soulCost(L)＝round(10 × 1.35^L)（data.js:7575）；每秒 假定 */
  const sc = L => Math.round(10 * Math.pow(1.35, L));
  const skMid = {
    altar: 6,
    cap: 2,
    holeNext: 8 /* 下一個孔：祭壇 Lv8 */,
    slotNext: [9, 5] /* 第 5 格技能：祭壇 Lv9 */,
    spirit: [35, 50] /* 假定 */,
    list: [
      { n: '閃電箭', lv: 12, ic: 'sk_apshot', dps: 1842, sup: ['sk_attack', 'sk_barrage'], cap: '角色 Lv52' },
      { n: '折射箭矢', lv: 11, ic: 'sk_barrage', dps: 1210, sup: ['sk_attack', 'sk_bash'], up: sc(11) },
      { n: '毒氣箭', lv: 9, ic: 'sk_axespin', dps: 640, sup: ['sk_attack', null], up: sc(9) },
      { n: '電弧', lv: 6, ic: 'sk_bash', dps: 380, sup: [null, null], up: sc(6) }
    ],
    ii: '鍛造台 Lv20 才開' /* 輔助 II：鍛造台 Lv20＋15,000 靈魂 */,
    auras: [
      { n: '憤怒', ic: 'sk_anger' },
      { n: '先祖之力', ic: 'sk_ancestral' }
    ],
    iiCost: 15000,
    /* §13 推薦 6 列（差值全部 假定）：最好 +18%、+9%、+5%、差不多 +2%／−1%、▼ −6%；d＝每秒（現在每秒 1,842） */
    picks: [
      { n: '附加冰冷傷害', tag: '附加', pct: 18, best: 1 },
      { n: '多重打擊', tag: '機制', pct: 9 },
      { n: '集中效應', tag: '傷害', pct: 5 },
      { n: '殘暴', tag: '傷害', pct: 2 },
      { n: '流血', tag: '異常', pct: -1 },
      { n: '迅捷', tag: '機制', pct: -6 }
    ]
  };
  /* 新手（祭壇 0：1 格、0 孔）：斬擊 Lv3，升級 25；每秒 12 假定 */
  const skNew = Object.assign({}, skMid, {
    altar: 0,
    cap: 0,
    holeNext: 2,
    slotNext: [1, 2],
    list: [{ n: '斬擊', lv: 3, ic: 'sk_bash', dps: 12, sup: [], up: sc(3) }],
    auras: []
  });
  /* 7 位數：等級、每秒 假定（fakedata 只給新手、中期）；鍛造台 Lv20 → 輔助 II 可解鎖 */
  const skBig = Object.assign({}, skMid, {
    altar: 9,
    cap: 3,
    holeNext: 11,
    slotNext: null,
    list: [
      { n: '閃電箭', lv: 25, ic: 'sk_apshot', dps: 128400, sup: ['sk_attack', 'sk_barrage', 'sk_bash'], up: sc(25) },
      { n: '折射箭矢', lv: 24, ic: 'sk_barrage', dps: 84200, sup: ['sk_attack', 'sk_bash', null], up: sc(24) },
      { n: '毒氣箭', lv: 22, ic: 'sk_axespin', dps: 41800, sup: ['sk_attack', null, null], up: sc(22) },
      { n: '電弧', lv: 20, ic: 'sk_bash', dps: 22600, sup: [null, null, null], up: sc(20) },
      { n: '穿甲彈', lv: 20, ic: 'sk_apshot', dps: 18400, sup: [null, null, null], up: sc(20) }
    ],
    ii: 'ok'
  });
  /* §14 天賦：ptPoints(lv)＝lv − 1 + 3 × floor(lv ÷ 10)；6 區 PT_ROADS。已點、目標大點名、珠寶孔進度 假定 */
  const ZONES = ['鬥士之路', '遊俠之路', '暗影之路', '魔導之路', '死靈之路', '自然之路'];
  const tree = {
    pts: 3 /* 60 − 已點 57 */,
    total: 57 /* 重置退回 */,
    goal: ['破陣', 4] /* 大點名 假定 */,
    jewel: ['遊俠之路', 32, 40] /* 中期祭壇 6 < 10，珠寶孔沒開：假定 */,
    zones: ZONES
  };
  /* §16 昇華：中期 4／8、石碑沒開（祭壇 6 < 7）；7 位數石碑開了（點數、已點、開幾個 假定） */
  const ascMid = { n: '風行神射', pts: [4, 8], next: '第一次打倒 Lv 63 地點的王', open: 0, shut: '祭壇 Lv7 才開' };
  const ascBig = {
    n: '風行神射',
    pts: [6, 8],
    next: '第一次打倒 Lv 83 地點的王',
    open: 3,
    notables: ['疾風步', '穿雲', '鷹眼', '（未點）'],
    asm: 1
  };
  /* §18 天賦期間補算：靈魂 291.92／分（Lv48）；件數、◆ 假定（4 分 14 件、◆ 1） */
  const treeGain = { sec: 240, soul: 1167.68, items: 14, rare: 1 };
  /* §17 王印：擁有＝還能套用的庫存、身上＝套在裝備上的 */
  const SEALS = [
    ['鎮嶽印', 'wangyin_zhenyue', '防禦向：減傷、抗性、耐力球'],
    ['赤霄印', 'wangyin_chixiao', '傷害向：條件傷害、撲殺、流血'],
    ['疾霆印', 'wangyin_jiting', '速度向：猛攻、連鎖、投射物'],
    ['歸墟印', 'wangyin_guixu', '續航向：偷取、回復、藥劑']
  ];
  const seals = (own, on) =>
    SEALS.map(([k, ic, fx], i) => ({ k, ic, fx, own: own[i], on: on[i], never: own[i] + on[i] ? 0 : 1 }));
  const mid = {
    k: 'mid',
    name: '中期',
    lv: 49,
    area: '雪埋古道・怪物 Lv 48',
    mobLv: 48,
    base: BASE.mid,
    eq: eqMid,
    st: stMid,
    cmp,
    inv: inv.mid,
    cur: curMid,
    res: res.mid,
    sal: sal.mid,
    forge: forgeMid,
    batch,
    batchSal,
    anvil: anvilMid,
    sk: skMid,
    tree,
    asc: ascMid,
    treeGain,
    seals: seals([1, 1, 0, 0], [0, 1, 0, 0]) /* 鎮嶽 1；赤霄 共 2 枚：1 套在連弩、1 在庫存 */,
    pity: 42,
    chaseOn: 1,
    idle: { min: 16, goal: ['祭壇 Lv7', 3720, 6000] }
  };
  const S = {
    mid,
    new: Object.assign({}, mid, {
      k: 'new',
      name: '新手',
      lv: 4,
      area: '地層出口・怪物 Lv 5',
      mobLv: 5,
      base: BASE.new,
      eq: eqNew,
      st: stNew,
      inv: inv.new,
      cur: curNew,
      res: res.new,
      sal: sal.new,
      forge: forgeNew,
      sk: skNew,
      tree: Object.assign({}, tree, { pts: 3, total: 0, shut: '祭壇 Lv4 才開' }) /* 樹還沒開（祭壇 0） */,
      seals: seals([0, 0, 0, 0], [0, 0, 0, 0]),
      pity: 0,
      chaseOn: 0,
      idle: { min: 4, goal: ['鍛造台 Lv2', 120, 200] }
    }),
    near: Object.assign({}, mid, {
      k: 'near',
      name: '倉庫快滿',
      base: BASE.near,
      inv: inv.near,
      res: res.near,
      sal: sal.near
    }),
    full: Object.assign({}, mid, {
      k: 'full',
      name: '倉庫滿',
      base: BASE.near,
      inv: inv.full,
      res: res.full,
      sal: sal.full
    }),
    big: Object.assign({}, mid, {
      k: 'big',
      name: '7 位數',
      lv: 86,
      area: '燭龍之巢・怪物 Lv 83',
      mobLv: 83,
      base: BASE.big,
      eq: eqBig,
      st: stBig,
      inv: inv.big,
      cur: curBig,
      res: res.big,
      sal: sal.big,
      forge: forgeBig,
      anvil: anvilBig,
      sk: skBig,
      tree: Object.assign({}, tree, { pts: 4, total: 103, goal: ['破陣', 2] }) /* 假定 */,
      asc: ascBig,
      seals: seals([2, 1, 3, 1], [0, 1, 1, 1]) /* 擁有 2／1／3／1 假定 */,
      pity: 100,
      idle: { min: 720, goal: ['祭壇 Lv20', 9999999, 12345678] }
    }),
    en: Object.assign({}, mid, {
      k: 'en',
      name: '最長英文',
      lv: 72,
      eq: eqEn,
      inv: inv.en,
      res: res.en,
      sal: sal.en,
      tree: Object.assign({}, tree, { pts: 1, total: 91, goal: ['Tempered Steel of the Unyielding Mountain', 4] }),
      asc: Object.assign({}, ascMid, { n: 'Windborne Marksman of the Northern Peaks' })
    })
  };
  /* §15 K/M 單元表（PF-D2-1）：[輸入, 模式, 期望] */
  const KM = [
    [9999, 'own', '9,999'],
    [9999, 'cost', '9,999'],
    [10000, 'own', '10.0K'],
    [10000, 'cost', '10.0K'],
    [12345, 'own', '12.3K'],
    [12345, 'cost', '12.4K'],
    [99950, 'own', '99.9K'],
    [99950, 'cost', '100K'],
    [123456, 'own', '123K'],
    [123456, 'cost', '124K'],
    [999999, 'own', '999K'],
    [999999, 'cost', '1.00M'],
    [1234567, 'own', '1.23M'],
    [1234567, 'cost', '1.24M'],
    [12345678901, 'own', '12.3B'],
    [12345678901, 'cost', '12.4B'],
    [10001, 'cost', '10.1K'],
    [10099, 'own', '10.0K'],
    [99999, 'cost', '100K'],
    [1000001, 'cost', '1.01M'],
    [9999999, 'cost', '10.0M'],
    [1234567890, 'own', '1.23B'],
    [1234567890123, 'cost', '1.24T'],
    [999999999999999, 'own', '999T'],
    [999999999999999, 'cost', '1.00e15'],
    [1234567890123456, 'cost', '1.24e15'],
    [12399, 'own', '12.3K'],
    [12301, 'cost', '12.4K']
  ];
  const KM_BUY = [12399, 12301]; /* 買得起邊界：持有 12,399 對花費 12,301 → 顯示 12.3K／12.4K，但用原值判斷＝買得起 */
  /* 英文 +40% 切換用的字串表（名詞表 v0.6.17 有 EN 的照寫；沒有的由 demo.js 產生假字） */
  const EN = {
    角色: 'Hero',
    鍛造: 'Forge',
    技能: 'Skills',
    天賦: 'Talent',
    營地: 'Camp',
    更多: 'More',
    倉庫: 'Stash',
    打造: 'Craft',
    通貨: 'Currency',
    鍛造台: 'Anvil',
    全部: 'All',
    裝備: 'Equip',
    鎖: 'Lock',
    取消: 'Cancel',
    去整理: 'Tidy up',
    詳細: 'Details',
    返回: 'Back',
    追逐物品: 'Chase items',
    數值: 'Stats',
    '倉庫只剩 {n} 格，這批要 {m} 格': 'Only {n} slots left; this batch needs {m}',
    長按分解: 'Salvage…',
    插上輔助: 'Socket support: {name} I',
    天賦點: 'Points',
    '★ 破裂裝備': '★ Fractured',
    昇華: 'Ascend',
    目標: 'Goal',
    搜尋: 'Search',
    回到我: 'Find me',
    點這條路: 'Path here',
    釘成目標: 'Pin goal',
    套到裝備: 'Apply to gear',
    重擲印詞: 'Reroll Seal Mod',
    王印: 'Boss Seal',
    印詞: 'Seal Mod',
    追逐保底: 'Chase pity',
    '下一件保底 {n}%': 'Chase pity {n}%',
    '+{n} 件已收': '+{n} items collected',
    長按重擲印詞: 'Hold to reroll Seal Mod',
    '花 1 枚{k}・擁有 {n}': 'Costs 1 {k} · Own {n}',
    '要 1 枚{k}・擁有 0': 'Needs 1 {k} · Own 0',
    '再 {n} 件沒出稀有，下一件一定是稀有': 'After {n} more non-Rare crafts, the next is Rare',
    '天賦樹期間 {p}': 'While in Talent Tree: {p}',
    '昇華石碑期間 {p}': 'While at Ascendancy Stele: {p}',
    '靈魂 +{n}': 'Souls +{n}',
    '{k} 件': '{k} items',
    鎮嶽印: 'Mountain Seal',
    赤霄印: 'Crimson Sky Seal',
    疾霆印: 'Thunder Seal',
    歸墟印: 'Abyss Seal',
    假定: 'Assumed'
  };
  return {
    PH,
    SLOTS,
    MAIN,
    IC,
    S,
    KM,
    KM_BUY,
    EN,
    head,
    spareHead,
    FLASK_CD
  };
})();
if (typeof module !== 'undefined') module.exports = FX;
