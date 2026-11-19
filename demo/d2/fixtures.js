/* D2 展示頁假資料（佔位）。數值設計師的假資料還沒到：這個檔整個是佔位，之後只換這個檔。
   欄位編號照 docs/production/specs/D2-checklist.md 第 12 節（#1–#20）；存檔沿用 D1 9b 六份（new 新手、mid 中期、near 倉庫快滿、full 倉庫滿、big 7 位數、en 最長英文）。
   倉庫上限 INV_CAP／INV_SPARE 不寫在這裡：demo.js 讀 js/items.js（PF-D2-4 用 ?invcap=280 改）。 */
'use strict';
const FX = (() => {
  const PH = '佔位資料：數值設計師假資料未到';
  /* #1 身上 13 格。rar：normal 普通／magic 魔法（藍裝）／rare 稀有／leg 傳奇；chase＝追逐標記；frac＝★ 破裂裝備；mem＝記憶；seal＝帶王印；cor＝腐化；no＝不能裝備的原因 */
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
    '護符',
    '護符',
    '護符'
  ];
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
    'it_c_alchemy',
    'it_c_alchemy',
    'it_c_alchemy'
  ];
  const eqMid = [
    {
      n: '噬魂長劍',
      rar: 'rare',
      T: 'T2',
      mods: ['攻擊增加 28% 物理傷害', '附加 12–21 火焰傷害', '+18% 攻擊速度', '+31 最大生命'],
      cand: 3,
      up: 1
    },
    { n: '玄龜壁', rar: 'leg', T: 'T3', mods: ['+214 護甲', '+12% 格擋率', '+40 最大生命'], cand: 0 },
    { n: '迅捷的鐵盔', rar: 'magic', T: 'T4', mods: ['+62 護甲', '+9% 移動速度'], cand: 2, up: 1 },
    {
      n: '玄鐵胸甲',
      rar: 'rare',
      T: 'T2',
      mods: ['+380 護甲', '+72 最大生命', '+24% 火焰抗性'],
      seal: { k: '鎮嶽印', mod: '受到的物理傷害降低 6%' },
      cand: 1
    },
    { n: '粗布手套', rar: 'normal', T: 'T5', mods: ['+20 護甲', '+6 最大生命', '+4% 攻擊速度'], cand: 4, up: 2 },
    {
      n: '疾風靴',
      rar: 'rare',
      T: 'T1',
      mods: ['+30% 移動速度（T0）', '+44 最大生命', '+18% 冰冷抗性'],
      frac: 1,
      cand: 0
    },
    {
      n: '追憶腰帶',
      rar: 'rare',
      T: 'T3',
      mods: ['+52 最大生命', '+21% 閃電抗性', '藥劑回復增加 20%'],
      mem: 1,
      cand: 1
    },
    { n: '血玉項鍊', rar: 'rare', T: 'T2', mods: ['+22% 全域暴擊率', '+15 力量', '−8% 混沌抗性'], cor: 1, cand: 0 },
    {
      n: '歸墟指環',
      rar: 'rare',
      T: 'T2',
      mods: ['+12% 冰冷抗性', '+30 最大生命', '每次擊中偷取 0.4% 生命'],
      chase: 1,
      cand: 0
    },
    { n: '銅環', rar: 'magic', T: 'T4', mods: ['+14 敏捷', '+8% 閃電抗性'], no: '力量不足：要 120，現有 96', cand: 2 },
    { n: '銅鈴護符', rar: 'normal', T: 'T5', mods: ['+4% 移動速度', '+10 最大生命', '+3% 全部抗性'], cand: 1 },
    { n: '迴紋護符', rar: 'magic', T: 'T4', mods: ['+6% 攻擊速度', '+12 最大生命'], cand: 0 },
    { n: '石紋護符', rar: 'normal', T: 'T5', mods: ['+18 護甲', '+8 最大生命', '+2% 火焰抗性'], cand: 1 }
  ];
  const eqNew = eqMid.map((e, i) =>
    i >= 10
      ? null /* 新手 3 格空 */
      : {
          n: ['生鐵短劍', '木盾', '皮帽', '布衣', '粗布手套', '草鞋', '麻繩腰帶', '骨項鍊', '銅環', '銅環'][i],
          rar: i % 3 ? 'normal' : 'magic',
          T: 'T5',
          mods: ['+8 最大生命', '+2% 移動速度', '+4 護甲'],
          cand: i === 0 ? 2 : 0,
          up: i === 0 ? 1 : 0
        }
  );
  const eqEn = eqMid.map((e, i) =>
    Object.assign({}, e, {
      n:
        [
          'Soul-Devouring Longsword of the Endless Abyss',
          'Shell of the Black Tortoise, Warden of the North',
          'Swift Iron Helm of Unbroken Vigilance'
        ][i] || 'Ancestral Iron Cuirass of the Mountain Seal Bearer',
      mods: [
        'Adds 12 to 21 Fire Damage to Attacks with this Weapon',
        '+31 to maximum Life and +18% to Attack Speed',
        '28% increased Physical Damage with Attacks against Bleeding Enemies'
      ],
      seal: e.seal ? { k: '鎮嶽印', mod: '6% reduced Physical Damage taken while you have an Endurance Charge' } : null
    })
  );
  /* #3 角色數值（4 抗含 1 個負值） */
  const stMid = { dps: 589, hp: 575, es: 120, armor: 1460, eva: 380, res: [62, 48, 51, -8] };
  const stBig = { dps: 3402118, hp: 12840, es: 2210, armor: 18450, eva: 9200, res: [75, 75, 75, -17] };
  /* #4 比較差值（中期）：▲ +12%、▼ −3%、—、▲▲ ≥ +25%、空槽 1 */
  const cmp = {
    pick: {
      n: '寒鐵長劍',
      rar: 'rare',
      T: 'T2',
      slot: 0,
      ic: 'gear_weapon_7',
      mods: ['攻擊增加 34% 物理傷害', '附加 9–18 冰冷傷害', '+20% 攻擊速度', '−17 最大生命'],
      d: { dps: 12, hp: -3 },
      rows: [
        ['DPS', 589, 660],
        ['生命', 575, 558],
        ['護甲', 1460, 1460],
        ['攻擊速度', 1.62, 1.68]
      ]
    },
    big: { n: '魂鑄重劍', rar: 'rare', T: 'T1', slot: 0, ic: 'gear_weapon_11', d: { dps: 27, hp: 1 } },
    same: { d: { dps: 0, hp: 0 } },
    empty: { slot: 11 }
  };
  /* #2 倉庫：件數、每部位件數、▲ 件數、▲▲ 1、鎖 2（列表由 demo.js 依 n 產生，前 12 件照這裡） */
  const head = [
    { n: '寒鐵長劍', slot: 0, rar: 'rare', up: 1, ic: 'gear_weapon_7' },
    { n: '魂鑄重劍', slot: 0, rar: 'rare', up: 2, ic: 'gear_weapon_11' },
    { n: '青銅劍', slot: 0, rar: 'magic', ic: 'gear_weapon_5' },
    { n: '斷柄劍', slot: 0, rar: 'normal', ic: 'gear_weapon_2' },
    { n: '雷紋盔', slot: 2, rar: 'rare', up: 1, ic: 'gear_helm_6', lock: 1 },
    { n: '輕皮盔', slot: 2, rar: 'magic', ic: 'gear_helm_2' },
    { n: '守夜胸甲', slot: 3, rar: 'leg', ic: 'gear_chest_8', lock: 1 },
    { n: '練功手套', slot: 4, rar: 'magic', up: 1, ic: 'gear_gloves_5' },
    { n: '碎星指環', slot: 8, rar: 'rare', frac: 1, ic: 'gear_ring_7' },
    { n: '舊皮靴', slot: 5, rar: 'normal', ic: 'gear_boots_2' },
    { n: '粗銅環', slot: 8, rar: 'normal', ic: 'gear_ring_1', no: '敏捷不足：要 80，現有 64' },
    { n: '歸墟腰帶', slot: 6, rar: 'rare', chase: 1, ic: 'gear_belt_5' }
  ];
  /* #10 通貨（含 0 與 7 位數）、能不能用＋原因 */
  const curMid = [
    ['蛻變石', 'cur_trans', 12],
    ['增幅石', 'cur_aug', 0, '沒有了'],
    ['富豪石', 'cur_regal', 3],
    ['崇高石', 'cur_exalt', 1],
    ['聖化石', 'cur_prism', 2],
    ['腐化石', 'cur_vaal', 2],
    ['災魘石', 'cur_chaos', 1],
    ['破裂石', 'cur_whet', 1],
    ['判官筆', 'cur_eng', 0, '還沒拿到']
  ];
  const curBig = curMid.map(([n, ic, v]) => [n, ic, v ? v * 283509 + 7 : 0, v ? '' : '沒有了']);
  /* #19 貨幣條（金、靈魂、生鐵）＋藥劑（剩幾次、上限、充能 %） */
  const res = {
    mid: [
      ['金', 31500],
      ['靈魂', 1180],
      ['生鐵', 1180]
    ],
    new: [
      ['金', 420],
      ['靈魂', 35],
      ['生鐵', 18]
    ],
    big: [
      ['金', 3402118],
      ['靈魂', 12345678],
      ['生鐵', 9999999]
    ]
  };
  const flask = {
    mid: { hp: [2, 3, 0.6], mp: [3, 3, 1] },
    new: { hp: [1, 2, 0.25], mp: [2, 2, 1] },
    big: { hp: [5, 5, 1], mp: [4, 5, 0.8] }
  };
  /* #5 打造設定、#6 材料 */
  const forgeMid = {
    parts: SLOTS.slice(0, 9).concat('護符'),
    partsOpen: 10,
    tiers: ['T5', 'T4', 'T3', 'T2'],
    tierLock: ['T1', '鍛造台 Lv16 才開'],
    tier: 3,
    counts: [1, 5, 10],
    countLock: [20, '鍛造台 Lv16 才開'],
    count: 2,
    odds: [
      ['普通', 58],
      ['魔法', 34],
      ['稀有', 8]
    ],
    mat: ['生鐵', 3, 1180] /* 每件需要、現有 */,
    lack: ['生鐵', 30, 18] /* 缺料一例：需要 30、現有 18 → 還差 生鐵 12 */
  };
  const forgeNew = Object.assign({}, forgeMid, {
    partsOpen: 4,
    tiers: ['T5'],
    tierLock: ['T4', '鍛造台 Lv3 才開'],
    tier: 0,
    counts: [1],
    countLock: [5, '鍛造台 Lv4 才開'],
    count: 0,
    odds: [
      ['普通', 80],
      ['魔法', 18],
      ['稀有', 2]
    ],
    mat: ['生鐵', 3, 18]
  });
  /* #7 一批 10 件結果（中期）。up：0／1 ▲／2 ▲▲；t0＝出 T0；frac＝★ 破裂；chase＝追逐 */
  const batch = [
    { n: '寒鐵長劍', rar: 'rare', up: 1, d: 'DPS +12%', ic: 'gear_weapon_7' },
    { n: '魂鑄重劍', rar: 'rare', up: 2, d: 'DPS +27%', ic: 'gear_weapon_11', t0: 1 },
    { n: '碎星指環', rar: 'rare', frac: 1, d: '—', ic: 'gear_ring_7' },
    { n: '青銅劍', rar: 'magic', d: 'DPS −4%', ic: 'gear_weapon_5' },
    { n: '鐵劍', rar: 'magic', d: '—', ic: 'gear_weapon_4', sal: 1 },
    { n: '鐵劍', rar: 'normal', d: '—', ic: 'gear_weapon_2', sal: 1 },
    { n: '鐵劍', rar: 'normal', d: '—', ic: 'gear_weapon_2', sal: 1 },
    { n: '短劍', rar: 'normal', d: '—', ic: 'gear_weapon_1', sal: 1 },
    { n: '短劍', rar: 'normal', d: '—', ic: 'gear_weapon_1', sal: 1 },
    { n: '短劍', rar: 'magic', d: '—', ic: 'gear_weapon_0', sal: 1 }
  ];
  const batchSal = [6, '生鐵', 18];
  /* #8 空格不夠：倉庫快滿存檔 fill −3（n＝3）、件數 10（m＝10）；#9 批次分解：預選件數與回收量由倉庫清單照 H3 a 算，回收率如下 */
  const salRate = { normal: 2, magic: 3, rare: 5, leg: 8 }; /* 分解回收 生鐵／件（佔位） */
  /* #11 鍛造台（中期）：放上那件、各組能用的東西、腐化／災魘數量、判官筆有無；沒開的組只畫下一個 */
  const anvil = {
    item: 0 /* 身上武器 */,
    groups: [
      [
        '加詞',
        [
          ['蛻變石', 'cur_trans', 12, ''],
          ['增幅石', 'cur_aug', 0, '沒有了'],
          ['富豪石', 'cur_regal', 3, '']
        ]
      ],
      [
        '淬鍊',
        [
          ['崇高石', 'cur_exalt', 1, ''],
          ['破裂石', 'cur_whet', 1, '這件已經有破裂詞']
        ]
      ],
      ['聖化', [['聖化石', 'cur_prism', 2, '']]],
      ['腐化', [['腐化石', 'cur_vaal', 2, '']]],
      ['災魘', [['災魘石', 'cur_chaos', 1, '']]]
    ],
    next: ['覺醒', '鍛造台 Lv14 才開'],
    brush: 0
  };
  /* #12 技能 5 招、#13 推薦清單 */
  const skMid = {
    altar: 5,
    cap: 2,
    spirit: [35, 50],
    list: [
      { n: '裂地斬', ic: 'sk_bash', dps: 67, sup: ['sk_attack', null], up: 14, ii: 'ok' },
      { n: '旋風斬', ic: 'sk_axespin', dps: 41, sup: ['sk_barrage', 'lock'], up: 22, ii: 'lock' },
      { n: '穿甲彈', ic: 'sk_apshot', dps: 38, sup: [null, null], up: 9 },
      { n: '連珠箭', ic: 'sk_barrage', dps: 29, sup: [null, 'lock'], up: 12400 },
      { n: '戰吼', ic: 'sk_battlecry', dps: 0, sup: [null, 'lock'], up: 6, lack: 1 }
    ],
    auras: [
      { n: '憤怒', ic: 'sk_anger' },
      { n: '先祖之力', ic: 'sk_ancestral' }
    ],
    iiCost: 15000,
    picks: [
      { n: '附加冰冷傷害', tag: '附加', d: 17, pct: 25, best: 1 },
      { n: '多重打擊', tag: '機制', d: 9, pct: 13 },
      { n: '集中效應', tag: '傷害', d: 1, pct: 1.5 },
      { n: '殘暴', tag: '傷害', d: 0.4, pct: 0.6 },
      { n: '流血', tag: '異常', d: 3, pct: 4 },
      { n: '迅捷', tag: '機制', d: -4, pct: -6 }
    ]
  };
  /* #14 天賦、#16 昇華、#18 天賦期間補算 */
  const tree = {
    pts: 3,
    total: 66,
    goal: ['百煉鋼', 4],
    jewel: ['鐵壁區', 32, 40],
    zones: ['鐵壁區', '迅風區', '烈焰區', '寒霜區', '雷鳴區', '幽冥區']
  };
  const asc = {
    n: '鐵金剛',
    pts: [6, 8],
    next: '第一次打倒 Lv 31 地點的王',
    open: 3,
    notables: ['不動如山', '鋼筋鐵骨', '萬夫莫敵', '（未點）']
  };
  const treeGain = { sec: 75, soul: 342, items: 9, rare: 2 };
  /* #17 王印（4 種擁有數 0／1／2+；保底 0／42／100；不累積地點；帶印裝備；重擲用的重複印） */
  const seals = [
    { k: '鎮嶽印', ic: 'wangyin_zhenyue', own: 2, on: 1, fx: '防禦向：減傷、抗性、耐力球' },
    { k: '赤霄印', ic: 'wangyin_chixiao', own: 1, on: 0, fx: '傷害向：條件傷害、撲殺、流血' },
    { k: '疾霆印', ic: 'wangyin_jiting', own: 0, on: 0, fx: '速度向：猛攻、連鎖、投射物', never: 1 },
    { k: '歸墟印', ic: 'wangyin_guixu', own: 0, on: 0, fx: '續航向：偷取、回復、藥劑', never: 1 }
  ];
  const sealsNew = seals.map(s => Object.assign({}, s, { own: 0, on: 0, never: 1 }));
  const sealsBig = seals.map((s, i) => Object.assign({}, s, { own: [14, 3, 1, 2][i], on: 1, never: 0 }));
  const mid = {
    k: 'mid',
    name: '中期',
    lv: 49,
    area: '雪埋古道・怪物 Lv 48',
    mobLv: 48,
    eq: eqMid,
    st: stMid,
    cmp,
    inv: { n: 214, head },
    cur: curMid,
    res: res.mid,
    flask: flask.mid,
    forge: forgeMid,
    batch,
    batchSal,
    anvil,
    sk: skMid,
    tree,
    asc,
    treeGain,
    seals,
    pity: 42,
    idle: { min: 16, goal: ['祭壇 Lv7', 3720, 6000] }
  };
  const S = {
    mid,
    new: Object.assign({}, mid, {
      k: 'new',
      name: '新手',
      lv: 6,
      area: '亂葬崗・怪物 Lv 5',
      mobLv: 5,
      eq: eqNew,
      st: { dps: 31, hp: 88, es: 0, armor: 40, eva: 22, res: [0, 0, 0, -20] },
      inv: { n: 0, head: [] },
      cur: curMid.map(([n, ic]) => [n, ic, n === '蛻變石' ? 2 : 0, n === '蛻變石' ? '' : '沒有了']),
      res: res.new,
      flask: flask.new,
      forge: forgeNew,
      sk: Object.assign({}, skMid, { altar: 1, cap: 1, list: skMid.list.slice(0, 2) }),
      tree: Object.assign({}, tree, { pts: 1, total: 4, goal: ['鐵骨', 3], jewel: ['鐵壁區', 4, 40] }),
      seals: sealsNew,
      pity: 0,
      idle: { min: 4, goal: ['鍛造台 Lv3', 120, 200] }
    }),
    near: Object.assign({}, mid, { k: 'near', name: '倉庫快滿', fill: -3 /* 空 3 格（#8 n＝3） */, pity: 100 }),
    full: Object.assign({}, mid, { k: 'full', name: '倉庫滿', fill: 0 }),
    big: Object.assign({}, mid, {
      k: 'big',
      name: '7 位數',
      lv: 92,
      area: '燭龍之巢・怪物 Lv 83',
      mobLv: 83,
      st: stBig,
      cur: curBig,
      res: res.big,
      flask: flask.big,
      seals: sealsBig,
      pity: 100,
      sk: Object.assign({}, skMid, {
        list: skMid.list.map(s => Object.assign({}, s, { dps: s.dps * 50731, up: s.up * 9001 }))
      }),
      idle: { min: 720, goal: ['祭壇 Lv20', 9999999, 12345678] }
    }),
    en: Object.assign({}, mid, {
      k: 'en',
      name: '最長英文',
      eq: eqEn,
      tree: Object.assign({}, tree, { goal: ['Tempered Steel of the Unyielding Mountain', 4] }),
      asc: Object.assign({}, asc, { n: 'Juggernaut of the Iron Mountain' })
    })
  };
  /* #15 K/M 單元表（PF-D2-1）：[輸入, 模式, 期望] */
  const KM = [
    [9999, 'own', '9,999'],
    [10000, 'own', '10.0K'],
    [12345, 'own', '12.3K'],
    [12345, 'cost', '12.4K'],
    [99950, 'own', '99.9K'],
    [99950, 'cost', '100K'],
    [123456, 'own', '123K'],
    [999999, 'own', '999K'],
    [999999, 'cost', '1.00M'],
    [1234567, 'own', '1.23M'],
    [12345678901, 'own', '12.3B'],
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
  /* #20 最長英文（英文 +40% 切換用的字串表；沒有的字由 demo.js 產生假字） */
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
    重擲印詞: 'Reroll seal mod',
    王印: 'Boss Seal',
    印詞: 'Seal Mod',
    追逐保底: 'Chase pity'
  };
  return { PH, SLOTS, IC, S, KM, KM_BUY, EN, salRate };
})();
if (typeof module !== 'undefined') module.exports = FX;
