/* ============================================================
   ⚠ 佔位資料（PLACEHOLDER）⚠
   數值設計師的 F01–F26（D3-checklist.md 第 13 節）還沒到，這整個檔都是展示頁自己編的假資料。
   之後只換這個檔：欄位名照 F 編號，demo.js 只讀 FIX，不寫死數字。
   名稱照 docs/名詞表.md；名詞表沒有的（殿 10 個裡的幾個、碎片名、地圖詞、心魔劫減益、神格、解鎖句）標「佔位」。
   ============================================================ */
(function (root) {
  'use strict';
  const PH = '佔位資料：等數值設計師 F01–F26';

  /* F01 地點清單（區名、地點、怪物 Lv、每分鐘靈魂）：Lv 是編的，每分鐘靈魂照 wSoulMin 公式取整 */
  const soulMin = lv => Math.floor(110 * (1 + 0.2 * (1 + ((lv - 5) * 15) / 78 - 1)));
  const ZONES = [
    [
      '枯河原野',
      'Dry River Wilds',
      [
        ['地層出口', 'Strata Exit', 5],
        ['枯河渡口', 'Dry River Ford', 7],
        ['破曉哨站', 'Dawn Outpost', 9],
        ['廢棄礦道', 'Abandoned Mine', 11],
        ['鴉衛的記號', "Ravenguard's Mark", 13],
        ['天星商隊', 'Starfall Caravan', 15],
        ['燒毀的村莊', 'Burnt Village', 17],
        ['血霧山道', 'Bloodmist Pass', 19]
      ]
    ],
    [
      '灰燼平原',
      'Ashen Plains',
      [
        ['裂谷斷崖', 'Rift Cliffs', 18],
        ['焦土坡', 'Scorched Slope', 23],
        ['斷碑原', 'Broken Stele Field', 28],
        ['熔谷入口', 'Magma Vale Gate', 33]
      ]
    ],
    ['熔岩裂谷', 'Lava Rift', [['赤脊', 'Red Ridge', 39]]],
    [
      '寒鴉冰原',
      'Crowfrost Tundra',
      [
        ['凍河口', 'Frozen Estuary', 44],
        ['雪埋古道', 'Snowburied Road', 48],
        ['冰封神殿', 'Frozen Temple', 52]
      ]
    ],
    [
      '血霧荒原',
      'Bloodmist Waste',
      [
        ['血原邊境', 'Bloodplain Border', 56],
        ['白骨丘', 'Bone Hill', 60]
      ]
    ],
    [
      '黑水沼澤',
      'Blackwater Marsh',
      [
        ['腐沼渡', 'Rotmarsh Ford', 64],
        ['沉城', 'Sunken City', 68],
        ['毒霧林', 'Miasma Wood', 72]
      ]
    ],
    ['裂口', 'Rift', [['裂口腹地', 'Rift Heartland', 83]]]
  ];
  const LOCS = [];
  for (const [z, ze, ls] of ZONES)
    for (const [n, e, lv] of ls) LOCS.push({ zone: z, zoneEn: ze, name: n, en: e, lv, soul: soulMin(lv) });

  /* F06 地圖詞（名稱、危險度 1–3）：佔位文字 */
  const MODS = [
    ['怪物生命 +40%', 'Monsters have 40% more Life', 1],
    ['怪物攻擊速度 +20%', 'Monsters have 20% increased Attack Speed', 2],
    ['玩家回復率 −30%', 'Players have 30% less Recovery Rate', 2],
    ['怪物附加 35% 冰冷傷害', 'Monsters gain 35% of Damage as extra Cold', 3],
    ['王招「凶風」範圍 +25%', 'Boss skill Fell Wind has 25% increased Area', 3]
  ];

  /* F10 掉落紀錄 50 筆：固定種子產生（四級分布＋★ 破裂裝備、記憶、◆ 破裂石／完美石／追憶之墨、王印） */
  function makeLog(n, loc, en) {
    const P = [
      ['熟鐵', 'Wrought Iron', 'normal', 'cur', 12],
      ['蛻變石', 'Transmutation Orb', 'normal', 'cur', 3],
      ['鎖子甲', 'Chainmail Vest', 'normal', 'gear', 1],
      ['破裂石', 'Fracturing Orb', 'rare', 'cur', 1],
      ['完美石', 'Perfection Orb', 'rare', 'cur', 1],
      ['追憶之墨', 'Ink of Remembrance', 'rare', 'cur', 1],
      ['霜咬 皮革頭盔', 'Frostbite Leather Cap', 'rare', 'gear', 1],
      ['★ 破裂裝備・裂魂 長劍', '★ Fractured gear · Soulsplit Longsword', 'rare', 'gear', 1],
      ['記憶・冰封神殿', 'Memory · Frozen Temple', 'rare', 'cur', 1, 1],
      ['燭陰 指環', 'Torchshade Ring', 'leg', 'gear', 1],
      ['崇高石', 'Exalted Orb', 'leg', 'cur', 1],
      ['赤霄印', 'Crimson Sky Seal', 'chase', 'chase', 1],
      ['鎮嶽印', 'Mountain Seal', 'chase', 'chase', 1]
    ];
    const order = [
      0, 1, 2, 0, 3, 6, 0, 1, 7, 4, 2, 0, 9, 5, 0, 8, 1, 11, 0, 6, 2, 10, 0, 3, 1, 0, 12, 4, 2, 6, 0, 1, 5, 0, 9, 2, 7,
      0, 3, 1, 0, 6, 2, 0, 8, 1, 4, 0, 2, 0
    ];
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = P[order[i % order.length]];
      out.push({
        id: i,
        min: 2 + i * 3,
        name: p[0],
        en: p[1],
        rar: p[2],
        cat: p[3],
        n: p[4],
        mem: p[5] || 0,
        src: i % 7 === 0 ? '王' : loc,
        srcEn: i % 7 === 0 ? 'Boss' : en
      });
    }
    out.splice(3, 0, {
      id: 900,
      min: 9,
      unlock: 1,
      name: '商會',
      en: 'Guild',
      rar: 'normal',
      cat: 'unlock',
      n: 1,
      src: '倉房 Lv4',
      srcEn: 'Storehouse Lv4'
    });
    out.splice(11, 0, {
      id: 901,
      min: 31,
      unlock: 1,
      name: '4★',
      en: '4★',
      rar: 'normal',
      cat: 'unlock',
      n: 1,
      src: '斥候營 Lv6',
      srcEn: 'Scout Camp Lv6'
    });
    out.splice(20, 0, {
      id: 902,
      min: 57,
      unlock: 1,
      name: '試招場',
      en: 'Practice Ground',
      rar: 'normal',
      cat: 'unlock',
      n: 1,
      src: '祭壇 Lv3',
      srcEn: 'Altar Lv3'
    });
    return out;
  }

  /* F14 商會：換法列（從 → 到、比例、持有、上限階） */
  const GUILD = (have, capTier) => ({
    tabs: ['鐵', '皮', '靈絲', '通貨'],
    rows: {
      鐵: [
        { from: '生鐵', fromEn: 'Pig Iron', to: '熟鐵', toEn: 'Wrought Iron', k: 5, have: have[0], tier: 2 },
        { from: '熟鐵', fromEn: 'Wrought Iron', to: '百煉鋼', toEn: 'Tempered Steel', k: 5, have: have[1], tier: 3 },
        { from: '百煉鋼', fromEn: 'Tempered Steel', to: '玄鐵', toEn: 'Dark Iron', k: 5, have: have[2], tier: 4 }
      ],
      皮: [
        { from: '生皮', fromEn: 'Rawhide', to: '鞣皮', toEn: 'Tanned Hide', k: 5, have: have[3], tier: 2 },
        { from: '鞣皮', fromEn: 'Tanned Hide', to: '厚革', toEn: 'Thick Leather', k: 5, have: have[4], tier: 3 }
      ],
      靈絲: [{ from: '繭絲', fromEn: 'Cocoon Silk', to: '熟絲', toEn: 'Boiled Silk', k: 5, have: have[5], tier: 2 }],
      通貨: [
        { from: '靈魂', fromEn: 'Souls', to: '蛻變石', toEn: 'Transmutation Orb', k: 500, have: have[6], tier: 1 },
        {
          from: '百煉鋼',
          fromEn: 'Tempered Steel',
          to: '增幅石',
          toEn: 'Augmentation Orb',
          k: 10,
          have: have[7],
          tier: 1
        }
      ]
    },
    capTier,
    capWhy: '瞭望台開到更深的地點才能換玄鐵',
    capWhyEn: 'Open deeper maps with the Watchtower to trade for Dark Iron'
  });

  /* F15–F17 山海寶盒：系、首領碎片、殿（名詞表有的照用；其餘佔位） */
  const BOX = (cnt, seen) => ({
    sys: [
      {
        k: '酆都',
        en: 'Fengdu',
        seen: seen[0],
        frags: [
          ['勾魂令', 'Soul Hook Token', cnt[0]],
          ['生死簿', 'Book of Life and Death', cnt[1]],
          ['判官筆', "Judge's Brush", cnt[2]],
          ['鬼門關鑰（佔位）', 'Ghost Gate Key', cnt[3]],
          ['奈何橋石（佔位）', 'Naihe Bridge Stone', cnt[4]]
        ]
      },
      { k: '四凶', en: 'Four Fiends', seen: seen[1], frags: [['四凶之鱗', 'Fiend Scale', cnt[5]]] },
      { k: '燭龍', en: 'Torch Dragon', seen: seen[2], frags: [['燭龍之目', 'Torch Dragon Eye', cnt[6]]] },
      {
        k: '兵家',
        en: 'Warlords',
        seen: seen[3],
        frags: [
          ['將印', 'General Seal', 0],
          ['兵符', 'Army Tally', 0]
        ]
      },
      { k: '心魔劫', en: 'Inner Demon', seen: seen[4], frags: [] },
      { k: '弒神', en: 'Godslayer', seen: seen[5], frags: [['神血', 'Divine Blood', cnt[7]]] }
    ],
    need: 5,
    /* F16 殿 10 個：名稱 1–9 照十殿（佔位，「第十殿」避開禁用字）；難度程式沒有現成數字，寫「—」 */
    halls: [
      ['秦廣殿', 'Qinguang Hall', '勾魂令', 5, 44],
      ['楚江殿', 'Chujiang Hall', '勾魂令', 5, 46],
      ['宋帝殿', 'Songdi Hall', '生死簿', 5, 48],
      ['五官殿', 'Wuguan Hall', '生死簿', 5, 50],
      ['閻羅殿', 'Hall of Yama', '勾魂令', 5, 52],
      ['卞城殿', 'Biancheng Hall', '判官筆', 5, 55],
      ['泰山殿', 'Taishan Hall', '判官筆', 5, 58],
      ['都市殿', 'Dushi Hall', '鬼門關鑰（佔位）', 5, 61],
      ['平等殿', 'Pingdeng Hall', '奈何橋石（佔位）', 5, 64],
      ['第十殿（佔位）', 'Tenth Hall', '奈何橋石（佔位）', 5, 68]
    ].map(([n, e, f, need, lv]) => ({ name: n, en: e, frag: f, need, lv, diff: '—' })),
    /* F17 心魔劫 7 種碎片（減益一行）；弒神神血、神格清單 */
    demon: [
      ['預兆・雙喜', 'Omen · Double Joy', '怪物生命 +30%', 'Monsters have 30% more Life', 2],
      ['預兆・盛怒（佔位）', 'Omen · Fury', '怪物傷害 +25%', 'Monsters deal 25% more Damage', 1],
      ['預兆・悲泣（佔位）', 'Omen · Sorrow', '玩家回復率 −20%', 'Players have 20% less Recovery', 0],
      ['預兆・驚懼（佔位）', 'Omen · Dread', '王招預警 −0.2 秒', 'Boss warnings 0.2 s shorter', 3],
      ['預兆・貪戀（佔位）', 'Omen · Longing', '怪物移動速度 +15%', 'Monsters move 15% faster', 1],
      ['預兆・厭棄（佔位）', 'Omen · Loathing', '玩家抗性 −10%', 'Players have −10% Resistances', 0],
      ['預兆・欲壑（佔位）', 'Omen · Craving', '菁英數量 +2', '+2 Elites', 2]
    ].map(([n, e, d, de, c]) => ({ name: n, en: e, debuff: d, debuffEn: de, n: c })),
    godhood: [
      ['太歲・歲煞（佔位）', 'Taisui · Year Bane', 3],
      ['太歲・歲破（佔位）', 'Taisui · Year Break', 1],
      ['太歲・歲刑（佔位）', 'Taisui · Year Penalty', 0]
    ].map(([n, e, c]) => ({ name: n, en: e, n: c }))
  });

  /* F24 完整貨幣清單 */
  const CUR = v => [
    ['金幣', 'Gold', v[0]],
    ['靈魂', 'Souls', v[1]],
    ['熟鐵', 'Wrought Iron', v[2]],
    ['百煉鋼', 'Tempered Steel', v[3]],
    ['蛻變石', 'Transmutation Orb', v[4]],
    ['增幅石', 'Augmentation Orb', v[5]],
    ['崇高石', 'Exalted Orb', v[6]],
    ['追憶之墨', 'Ink of Remembrance', v[7]]
  ];

  function save(o) {
    const open = o.open,
      at = LOCS.findIndex(l => l.name === o.cur);
    return {
      PH,
      /* F01、F02、F04 */
      locs: LOCS.map((l, i) =>
        Object.assign({}, l, {
          open: i < open,
          soul: o.soulMul ? Math.floor(l.soul * o.soulMul[Math.min(i, o.soulMul.length - 1)]) : l.soul
        })
      ),
      at /* 正在刷的地點序號 */,
      star: o.star,
      pityOn: LOCS[at].lv >= 45,
      best: o.best,
      near: o.near,
      /* F03 下一個地點 */
      next: o.next,
      /* F05 星級 */
      scout: o.scout,
      maxStar: o.maxStar,
      starMods: ['0–1', '1–2', '2–4', '4–6', '5–7'],
      /* F06 地圖詞（null＝還沒預擲） */
      mods: o.mods,
      /* F07 被退回 */
      bounce: {
        from: '雪埋古道',
        fromEn: 'Snowburied Road',
        to: '凍河口',
        toEn: 'Frozen Estuary',
        why: '王招「凶風」（冰冷）',
        whyEn: 'Boss skill Fell Wind (Cold)'
      },
      /* F08 更多 8 卡 */
      more: o.more,
      /* F09 設定 */
      ver: 'v0.0.0（展示頁）',
      account: o.account,
      /* F10、F11、F13 */
      log: o.log,
      pity: o.pity,
      pityOther: [
        ['王印・鎮嶽印（佔位）', 'Mountain Seal (placeholder)', 40],
        ['王印・赤霄印（佔位）', 'Crimson Sky Seal (placeholder)', 22],
        ['首領碎片（佔位）', 'Boss Fragments (placeholder)', 64]
      ],
      /* F12 一件裝備＋身上同部位 */
      item: {
        name: '霜咬 皮革頭盔',
        en: 'Frostbite Leather Cap',
        rar: 'rare',
        base: '皮革頭盔・物品等級 46',
        baseEn: 'Leather Cap · Item Level 46',
        cmp: [
          ['DPS', 'DPS', 12890, 12345],
          ['生命', 'Life', 1840, 1912],
          ['冰冷抗性', 'Cold Res.', 38, 21]
        ],
        mods: ['+62 最大生命', '+38% 冰冷抗性', '+14% 攻擊速度', '暴擊率提高 22%'],
        modsEn: [
          '+62 to maximum Life',
          '+38% to Cold Resistance',
          '14% increased Attack Speed',
          '22% increased Critical Hit Chance'
        ]
      },
      /* F14 商會 */
      guild: o.guild,
      /* F15–F17 */
      box: o.box,
      /* F18 試招場 */
      prac: o.prac,
      /* F20 試招期間 +N */
      pracGain: o.pracGain,
      /* F21、F22 開場 */
      intro: {
        loc: '地層出口',
        locEn: 'Strata Exit',
        sub: '打倒王之後，會在這裡接著刷',
        subEn: 'After the boss falls, farming continues right here',
        goal: ['鍛造台', 'Anvil', 1, 120, 400],
        firstHit: 3200,
        beats: [
          [18000, 'cur', '熟鐵 +3', 'Wrought Iron +3'],
          [32000, 'lv', '升到 Lv2', 'Level 2'],
          [45000, 'camp', '營地可以升級了', 'Camp upgrade ready']
        ]
      },
      unlocks: [
        ['營地開了・按 H', 'Camp unlocked · H', 'H'],
        [
          '鍛造台開了：用材料打造裝備，打到比身上好的就換上（按 K）',
          'Anvil unlocked: craft gear from materials and equip anything better than what you wear (K)',
          'K'
        ],
        [
          '天賦樹開了：每升一級拿 1 點，點在樹上（按 P）',
          'Talent tree unlocked: every level gives 1 point to spend on the tree (P)',
          'P'
        ]
      ],
      /* F23 重開 */
      away: { short: 40, mid: 4, soulMin: 291.92, long: 100, longLv: 48, kills: 18, items: 37, rare: 6 },
      /* F24 貨幣列 */
      gold: o.money[0],
      soul: o.money[1],
      cur: CUR(o.money),
      /* F25 藥劑 */
      flask: o.flask
    };
  }

  const MORE = (n, dots) =>
    [
      { k: 'chase', name: '追逐物品', en: 'Chase items', st: '王印 2／4・保底 37%', stEn: 'Seals 2/4 · Pity 37%' },
      { k: 'box', name: '山海寶盒', en: 'Shan Hai Box', st: '閻羅殿可以開', stEn: 'Hall of Yama ready' },
      { k: 'log', name: '掉落紀錄', en: 'Drop log', st: '稀有以上 12 件', stEn: '12 Rare+ items' },
      { k: 'guild', name: '商會', en: 'Guild', st: '可換 4 次', stEn: '4 trades ready' },
      { k: 'prac', name: '試招場', en: 'Practice Ground', st: '10 秒平均 {dps}', stEn: '10 s avg {dps}' },
      { k: 'stats', name: '統計', en: 'Stats', st: '打倒王 {kills} 次', stEn: '{kills} boss kills' },
      { k: 'set', name: '設定', en: 'Settings', st: '掉落提示 稀有以上', stEn: 'Drop alerts Rare+' },
      { k: 'help', name: '說明', en: 'Help', st: '名詞 240 則', stEn: '240 terms' }
    ]
      .filter(c => n.includes(c.k))
      .map(c => Object.assign(c, { dot: dots.includes(c.k) ? 1 : 0 }));

  const mid = save({
    open: 15,
    cur: '雪埋古道',
    star: 3,
    best: '雪埋古道',
    near: '凍河口',
    next: {
      name: '冰封神殿',
      en: 'Frozen Temple',
      lv: 52,
      fac: '瞭望台',
      facEn: 'Watchtower',
      facLv: 16,
      mat: '熟鐵',
      matEn: 'Wrought Iron',
      have: 18,
      need: 40
    },
    scout: 6,
    maxStar: 4,
    mods: MODS.map(([n, e, d]) => ({ name: n, en: e, d })),
    more: MORE(['chase', 'box', 'log', 'guild', 'prac', 'stats', 'set', 'help'], ['chase', 'box']),
    account: { guest: 1, mail: '' },
    log: makeLog(50, '雪埋古道', 'Snowburied Road'),
    pity: 37,
    guild: GUILD([3, 23, 4, 9, 6, 2, 1834, 12], 3),
    box: BOX([3, 5, 1, 0, 0, 2, 5, 0], [1, 1, 1, 0, 1, 1]),
    prac: { lvMin: 1, lvMax: 83, lv: 48, avg10: 12345, first: 11890, direct: 0.72, hurt: [12, 0, 34], kills: 412 },
    pracGain: { soul: 3402, items: 6, rare: 2, camp: 1820 },
    money: [8432, 12345, 23, 4, 37, 12, 1, 2],
    flask: [
      [2, 3, 0.6],
      [1, 2, 0.25]
    ]
  });

  const S = {
    new: save({
      open: 1,
      cur: '地層出口',
      star: 1,
      best: null,
      near: null,
      next: {
        name: '枯河渡口',
        en: 'Dry River Ford',
        lv: 7,
        fac: '瞭望台',
        facEn: 'Watchtower',
        facLv: 1,
        mat: '靈魂',
        matEn: 'Souls',
        have: 0,
        need: 120
      },
      scout: 0,
      maxStar: 1,
      mods: null,
      more: MORE(['set', 'help'], []),
      account: { guest: 1, mail: '' },
      log: [],
      pity: 0,
      guild: GUILD([0, 0, 0, 0, 0, 0, 0, 0], 1),
      box: BOX([0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]),
      prac: { lvMin: 1, lvMax: 5, lv: 1, avg10: 0, first: 0, direct: 1, hurt: [0, 0, 0], kills: 0 },
      pracGain: { soul: 0, items: 0, rare: 0, camp: 0 },
      money: [0, 0, 0, 0, 0, 0, 0, 0],
      flask: [
        [1, 1, 1],
        [0, 1, 0]
      ]
    }),
    mid,
    late: save({
      open: 22,
      cur: '沉城',
      star: 5,
      best: '沉城',
      near: '腐沼渡',
      next: null,
      scout: 9,
      maxStar: 5,
      mods: MODS.slice(0, 4).map(([n, e, d]) => ({ name: n, en: e, d })),
      more: MORE(['chase', 'box', 'log', 'guild', 'prac', 'stats', 'set', 'help'], ['box']),
      account: { guest: 0, mail: 'player@example.com（假信箱）' },
      log: makeLog(50, '沉城', 'Sunken City'),
      pity: 100,
      guild: GUILD([40, 120, 23, 60, 18, 44, 98765, 230], 6),
      box: BOX([5, 3, 5, 5, 2, 5, 3, 4], [1, 1, 1, 0, 1, 1]),
      prac: { lvMin: 1, lvMax: 83, lv: 68, avg10: 88412, first: 84120, direct: 0.55, hurt: [8, 3, 51], kills: 2318 },
      pracGain: { soul: 41200, items: 22, rare: 7, camp: 9800 },
      money: [99999, 412345, 120, 23, 380, 96, 14, 9],
      flask: [
        [3, 3, 1],
        [2, 2, 1]
      ]
    }),
    cap: save({
      open: 13,
      cur: '赤脊',
      star: 3,
      best: '赤脊',
      near: '熔谷入口',
      next: {
        name: '凍河口',
        en: 'Frozen Estuary',
        lv: 44,
        fac: '瞭望台',
        facEn: 'Watchtower',
        facLv: 13,
        mat: '熟鐵',
        matEn: 'Wrought Iron',
        have: 31,
        need: 36
      },
      scout: 5,
      maxStar: 3,
      mods: MODS.slice(0, 3).map(([n, e, d]) => ({ name: n, en: e, d })),
      more: MORE(['log', 'guild', 'prac', 'stats', 'set', 'help'], ['guild']),
      account: { guest: 1, mail: '' },
      log: makeLog(50, '赤脊', 'Red Ridge'),
      pity: 0,
      guild: GUILD([2, 23, 30, 9, 6, 2, 640, 12], 3),
      box: BOX([0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]),
      prac: { lvMin: 1, lvMax: 39, lv: 39, avg10: 5120, first: 4980, direct: 0.8, hurt: [5, 0, 12], kills: 140 },
      pracGain: { soul: 920, items: 3, rare: 0, camp: 400 },
      money: [3120, 9999, 23, 30, 12, 4, 0, 1],
      flask: [
        [1, 2, 0.5],
        [2, 2, 1]
      ]
    }),
    /* 7 位數資源：K／M 邊界 9,999／10,000／99,999／1,234,567／12,345,678,901 */
    big: save({
      open: 22,
      cur: '裂口腹地',
      star: 5,
      best: '裂口腹地',
      near: '毒霧林',
      next: null,
      scout: 9,
      maxStar: 5,
      soulMul: [1, 1, 1, 1, 1, 1, 1, 1, 30, 40, 50, 60, 80, 120, 160, 220, 400, 800, 1600, 3000, 5000, 9999],
      mods: MODS.map(([n, e, d]) => ({ name: n, en: e, d })),
      more: MORE(['chase', 'box', 'log', 'guild', 'prac', 'stats', 'set', 'help'], ['chase']),
      account: { guest: 0, mail: 'player@example.com（假信箱）' },
      log: makeLog(50, '裂口腹地', 'Rift Heartland'),
      pity: 100,
      guild: GUILD([12345, 1234567, 99999, 10000, 9999, 23, 12345678901, 3402118], 6),
      box: BOX([5, 5, 5, 5, 5, 5, 5, 5], [1, 1, 1, 0, 1, 1]),
      prac: {
        lvMin: 1,
        lvMax: 83,
        lv: 83,
        avg10: 1234567,
        first: 1198765,
        direct: 0.61,
        hurt: [3, 0, 18],
        kills: 99999
      },
      pracGain: { soul: 1234567, items: 48, rare: 12, camp: 99999 },
      money: [1234567, 12345678901, 3402118, 99999, 10000, 9999, 1234, 56],
      flask: [
        [4, 5, 0.2],
        [3, 3, 1]
      ]
    }),
    /* 最長英文：名稱用最長的（en 模式下展示） */
    en: save({
      open: 16,
      cur: '雪埋古道',
      star: 4,
      best: '雪埋古道',
      near: '凍河口',
      next: {
        name: '冰封神殿',
        en: 'Frozen Temple',
        lv: 52,
        fac: '瞭望台',
        facEn: 'Watchtower',
        facLv: 16,
        mat: '熟鐵',
        matEn: 'Wrought Iron',
        have: 18,
        need: 40
      },
      scout: 6,
      maxStar: 4,
      mods: MODS.map(([n, e, d]) => ({ name: n, en: e, d })),
      more: MORE(['chase', 'box', 'log', 'guild', 'prac', 'stats', 'set', 'help'], ['chase', 'box', 'guild']),
      account: { guest: 1, mail: '' },
      log: makeLog(50, '雪埋古道', 'Snowburied Road'),
      pity: 37,
      guild: GUILD([3, 23, 4, 9, 6, 2, 1834, 12], 3),
      box: BOX([3, 5, 1, 0, 0, 2, 5, 0], [1, 1, 1, 0, 1, 1]),
      prac: { lvMin: 1, lvMax: 83, lv: 48, avg10: 12345, first: 11890, direct: 0.72, hurt: [12, 0, 34], kills: 412 },
      pracGain: { soul: 3402, items: 6, rare: 2, camp: 1820 },
      money: [8432, 12345, 23, 4, 37, 12, 1, 2],
      flask: [
        [2, 3, 0.6],
        [1, 2, 0.25]
      ]
    })
  };
  root.FIX = {
    PH,
    saves: S,
    ORDER: ['new', 'mid', 'late', 'cap', 'big', 'en'],
    NAMES: {
      new: '新存檔（0 秒）',
      mid: '中期（第 15 地點）',
      late: '後期（主幹走完）',
      cap: '商會上限擋',
      big: '7 位數資源',
      en: '最長英文'
    }
  };
})(this);
