/* ============================================================
   D3 展示頁假資料：照 docs/production/specs/D3-fakedata.md v1.0（數值設計師，F01–F26）。
   這是假資料（不是存檔、不跑遊戲），demo.js 只讀 FIX，不寫死數字。
   fakedata 標「假定」的值在欄位旁註「假定」；EN 名詞表沒有的（地圖詞、首領碎片、設定、DPS 標籤、9 個殿名）不給 en，
   展示頁英文切換時用假字（×1.4），畫面角標「EN 未譯＝假定」。
   ============================================================ */
(function (root) {
  'use strict';
  const PH = '假資料：D3-fakedata v1.0';

  /* 共用公式（fakedata §0）：wSoulMin(lv)＝110＋4.2308×(lv−5)，捨去 */
  const soulMin = lv => Math.floor(110 * (1 + (0.2 * ((lv - 5) * 15)) / 78));

  /* F01 地點清單（STORY＋TRUNK2） */
  const ZONES = [
    [
      '枯河原野',
      'Dry River Wilds',
      [
        ['地層出口', 'Strata Exit', 5],
        ['枯河渡口', 'Dry River Ford', 6],
        ['破曉哨站', 'Dawn Outpost', 8],
        ['廢棄礦道', 'Abandoned Mine', 9],
        ['鴉衛的記號', "Ravenguard's Mark", 11],
        ['天星商隊', 'Starfall Caravan', 13],
        ['燒毀的村莊', 'Burnt Village', 14],
        ['血霧山道', 'Bloodmist Pass', 16],
        ['裂谷斷崖', 'Rift Cliffs', 18]
      ]
    ],
    [
      '灰燼平原',
      'Ashen Plains',
      [
        ['焦土坡', 'Scorched Slope', 23],
        ['斷碑原', 'Broken Stele Field', 28]
      ]
    ],
    [
      '熔岩裂谷',
      'Lava Rift',
      [
        ['熔谷入口', 'Magma Vale Gate', 33],
        ['赤脊', 'Red Ridge', 38]
      ]
    ],
    [
      '寒鴉冰原',
      'Crowfrost Tundra',
      [
        ['凍河口', 'Frozen Estuary', 43],
        ['雪埋古道', 'Snowburied Road', 48],
        ['冰封神殿', 'Frozen Temple', 53]
      ]
    ],
    [
      '血霧荒原',
      'Bloodmist Waste',
      [
        ['血原邊境', 'Bloodplain Border', 58],
        ['白骨丘', 'Bone Hill', 63]
      ]
    ],
    [
      '黑水沼澤',
      'Blackwater Marsh',
      [
        ['腐沼渡', 'Rotmarsh Ford', 68],
        ['沉城', 'Sunken City', 73],
        ['毒霧林', 'Miasma Wood', 78]
      ]
    ],
    ['裂口腹地', 'Rift', [['裂口腹地', 'Rift Heartland', 83]]]
  ];
  const LOCS = [];
  for (const [z, ze, ls] of ZONES)
    for (const [n, e, lv] of ls) LOCS.push({ zone: z, zoneEn: ze, name: n, en: e, lv, soul: soulMin(lv) });
  const LI = n => LOCS.findIndex(l => l.name === n);

  /* F05 每★地圖詞條數（STARS，maps.js:6–13） */
  const STAR_MODS = ['1–3', '4–6', '7–9', '10–12', '13–15'];

  /* F06 地圖詞（MAPMOD；抽到哪幾條＝假定；沒有 EN） */
  const M = (name, d) => ({ name, en: null, d });
  const MODS_MID = [
    M('怪物增加 40% 生命', 2),
    M('怪物增加 15% 傷害', 1),
    M('+20% 怪物元素抗性', 1),
    M('每個房間有 50% 機率多 1 群怪物', 1),
    M('怪物擊中時有 25% 機率造成流血', 2),
    M('玩家無法再生生命', 3),
    M('怪物死亡時有 25% 機率留下油滑地面', 1)
  ];
  const MODS_LATE = [
    M('怪物增加 80% 生命', 3),
    M('怪物增加 50% 傷害', 3),
    M('怪物增加 20% 移動速度', 2),
    M('+35% 怪物元素抗性', 2),
    M('怪物增加 50% 護甲', 1),
    M('怪物增加 30% 命中值', 1),
    M('每個房間有 50% 機率多 1 群怪物', 1),
    M('菁英怪物數量加倍', 1),
    M('地圖王增加 50% 生命、增加 20% 傷害', 2),
    M('+25% 怪物暴擊率、+50% 怪物暴擊傷害加成', 3),
    M('怪物擊中時有 25% 機率造成中毒', 2),
    M('玩家 −20% 最大元素抗性', 3),
    M('玩家被衰弱詛咒，造成 20%更少傷害', 3)
  ];
  /* 最長英文存檔：中文最長兩條排前面（EN 待 mumi） */
  const MODS_EN = [
    M('+25% 怪物暴擊率、+50% 怪物暴擊傷害加成', 3),
    M('怪物獲得等同於 20% 傷害的額外冰冷傷害', 2),
    ...MODS_LATE.slice(0, 11)
  ];

  /* F10 掉落紀錄：每筆只有 時間、名、類別（LOGN），沒有來源、數量、四級分布。
     類別 → 畫面記號：cur 通貨 ◆、perf 完美 ◈、star ★ 破裂裝備、mem ◈ 記憶、chase 王印、soul 靈魂包／血霧之印 */
  const ago = m =>
    m < 1
      ? ['剛剛', 'just now']
      : m < 60
        ? [`${m} 分鐘前`, `${m} min ago`]
        : [`${Math.floor(m / 60)} 小時前`, `${Math.floor(m / 60)} h ago`];
  const E = (name, en, cat) => ({ name, en, cat });
  function makeLog(list, step) {
    return list.map((e, i) => {
      const m = Math.floor(i * step);
      const [t, tEn] = ago(m);
      return Object.assign({ id: i, t, tEn }, e);
    });
  }
  const EX = E('崇高石', 'Exalted Orb', 'cur');
  /* 中期（鍛造台 Lv12）：崇高石 48＋王印 2 */
  const LOG_MID = makeLog(
    Array.from({ length: 50 }, (_, i) =>
      i === 6
        ? E('鎮嶽印・王印 1／4', 'Mountain Seal · Boss Seal 1/4', 'chase')
        : i === 21
          ? E('赤霄印・王印 2／4', 'Crimson Sky Seal · Boss Seal 2/4', 'chase')
          : EX
    ),
    3.7
  );
  /* 後期（鍛造台 Lv20）50 筆，組成＝假定；★ 破裂裝備、◈ 記憶 0.5.0 起不掉，只為測版面（假定） */
  const LATE_MIX = [
    [EX, 18],
    [E('高階崇高石', 'Greater Exalted Orb', 'cur'), 6],
    [E('高階蛻變石', null, 'cur'), 5],
    [E('高階增幅石', 'Greater Aug. Orb', 'cur'), 5],
    [E('高階富豪石', null, 'cur'), 4],
    [E('完美崇高石', 'Perfect Exalted Orb', 'perf'), 1],
    [E('完美增幅石', 'Perfect Aug. Orb', 'perf'), 1],
    [E('破裂石', null, 'cur'), 3],
    [E('完美石', 'Perfection Orb', 'cur'), 1],
    [E('追憶之墨', 'Ink of Remembrance', 'cur'), 2],
    [E('疾霆印・王印 3／4', 'Thunder Seal · Boss Seal 3/4', 'chase'), 1],
    [E('歸墟印・王印 4／4', 'Abyss Seal · Boss Seal 4/4', 'chase'), 1],
    [E('血霧滿了：拿到血霧之印', null, 'soul'), 2]
  ];
  const lateList = [];
  for (const [e, n] of LATE_MIX) for (let i = 0; i < n; i++) lateList.push(e);
  /* 打散：固定順序（崇高石與其他交錯） */
  const lateOrd = [];
  const ex = lateList.filter(e => e === EX),
    oth = lateList.filter(e => e !== EX);
  while (ex.length || oth.length) {
    if (oth.length) lateOrd.push(oth.shift());
    if (ex.length) lateOrd.push(ex.shift());
  }
  lateOrd.splice(48);
  lateOrd.unshift(
    ...lateOrd.splice(
      lateOrd.findIndex(e => e.cat === 'chase'),
      1
    )
  ) /* 最新一筆是王印 */;
  lateOrd.splice(7, 0, E('★ 破裂裝備・裂魂 長劍（假定）', '★ Fractured gear · Soulsplit Longsword (assumed)', 'star'));
  lateOrd.splice(15, 0, E('記憶・冰封神殿（假定）', 'Memory · Frozen Temple (assumed)', 'mem'));
  const LOG_LATE = makeLog(lateOrd, 3.6);
  /* 最長英文：EN 最長的通貨名排前面 */
  const LOG_EN = makeLog(
    [
      E('高階崇高石', 'Greater Exalted Orb', 'cur'),
      E('完美崇高石', 'Perfect Exalted Orb', 'perf'),
      E('追憶之墨', 'Ink of Remembrance', 'cur'),
      E('赤霄印・王印 3／4', 'Crimson Sky Seal · Boss Seal 3/4', 'chase'),
      ...lateOrd.slice(0, 46)
    ],
    3.6
  );

  /* F11 其他保底（掉落紀錄「保底進度・滿了下一次一定掉」）：中期只有完美通貨；後期四條，進度＝假定、上限 ≈ 手算（假定） */
  const PITY_MID = [['完美通貨', null, 0, 300]];
  const PITY_LATE = [
    ['破裂石（王）', null, 412, 1613],
    ['完美石（王）', null, 2050, 6410],
    ['追憶之墨（王）', null, 88, 720],
    ['完美通貨', null, 147, 300]
  ];

  /* F14 商會：各階持有（完整數字）、tierCap；只列持有 ≥ 5 的階，一次換 1 份 */
  const MAT = {
    鐵: [
      ['生鐵', 'Pig Iron'],
      ['熟鐵', 'Wrought Iron'],
      ['百煉鋼', 'Tempered Steel'],
      ['玄鐵', 'Dark Iron'],
      ['寒鐵', 'Frost Iron'],
      ['隕鐵', 'Meteoric Iron']
    ],
    皮: [
      ['生皮', 'Rawhide'],
      ['鞣皮', 'Tanned Hide'],
      ['厚革', 'Thick Leather'],
      ['玄革', 'Dark Leather'],
      ['霜革', 'Frost Leather'],
      ['神獸革', 'Divine Beast Hide']
    ],
    靈絲: [
      ['繭絲', 'Cocoon Silk'],
      ['熟絲', 'Boiled Silk'],
      ['彩絲', 'Dyed Silk'],
      ['巫絲', 'Witch Silk'],
      ['祭絲', 'Rite Silk'],
      ['神絲', 'Divine Silk']
    ]
  };
  function GUILD(have, capTier, curRows) {
    const rows = {};
    const omit = {};
    for (const k of ['鐵', '皮', '靈絲']) {
      rows[k] = [];
      omit[k] = [];
      have[k].forEach((h, t) => {
        if (t >= 5) return;
        if (h < 5) return void (h > 0 && omit[k].push(MAT[k][t][0]));
        rows[k].push({
          from: MAT[k][t][0],
          fromEn: MAT[k][t][1],
          to: MAT[k][t + 1][0],
          toEn: MAT[k][t + 1][1],
          k: 5,
          have: h,
          lock: t + 2 > capTier
        });
      });
    }
    rows.通貨 = curRows;
    omit.通貨 = [];
    return { tabs: ['鐵', '皮', '靈絲', '通貨'], rows, omit, capTier };
  }

  /* F15–F17 山海寶盒 */
  function BOX(c) {
    return {
      sys: [
        {
          k: '酆都',
          en: 'Fengdu',
          unit: '張',
          frags: [
            ['勾魂令・牛頭', null, c.hun[0]],
            ['勾魂令・馬面', null, c.hun[1]],
            ['勾魂令・黑無常', null, c.hun[2]],
            ['勾魂令・白無常', null, c.hun[3]],
            ['生死簿', null, c.book]
          ],
          sum: { name: '勾魂令', n: c.hun.reduce((a, b) => a + b, 0), need: 5 }
        },
        {
          k: '心魔',
          en: null,
          unit: '片',
          frags: ['喜', '怒', '哀', '懼', '愛', '惡', '欲'].map((x, i) => [x + '之碎片', null, c.sin[i]])
        },
        {
          k: '四凶',
          en: null,
          unit: '片',
          frags: [
            ['饕餮之鱗', null, c.fiend[0]],
            ['窮奇之鱗', null, c.fiend[1]],
            ['檮杌之鱗', null, c.fiend[2]],
            ['混沌之鱗', null, c.fiend[3]],
            ['燭龍之目', null, c.eye]
          ]
        },
        {
          k: '陰兵',
          en: null,
          unit: '個',
          frags: [
            ['將印・刑天', null, 0],
            ['將印・風伯', null, 0],
            ['將印・雨師', null, 0],
            ['兵符', null, 0]
          ]
        },
        { k: '弒神', en: null, unit: '份', frags: [['神血', null, c.blood]] }
      ].map(s => Object.assign(s, { seen: s.frags.some(f => f[2] > 0) })),
      /* F16 殿 10 個：條件照程式 why；王 Lv＝arenaLv 83；推薦程式沒有數字 → 「—」 */
      halls: [
        {
          name: '閻羅殿',
          en: 'Hall of Yama',
          sys: '酆都',
          frag: '勾魂令',
          need: 5,
          have: c.hun.reduce((a, b) => a + b, 0)
        },
        {
          name: '十殿閻羅',
          en: null,
          sys: '酆都',
          frag: '生死簿',
          need: 1,
          have: c.book,
          why: '還缺生死簿：打倒閻羅取得'
        },
        { name: '心魔・三尸', en: null, sys: '心魔', frag: '碎片種類', need: 3, have: c.sin.filter(x => x).length },
        { name: '三彭', en: null, sys: '心魔', frag: '碎片種類', need: 7, have: c.sin.filter(x => x).length },
        { name: '燭龍', en: null, sys: '四凶', frag: '四凶之鱗', need: 4, have: c.fiend.filter(x => x).length },
        { name: '燭九陰', en: null, sys: '四凶', frag: '燭龍之目', need: 1, have: c.eye },
        { name: '蚩尤', en: null, sys: '陰兵', frag: '將印', need: 3, have: 0 },
        { name: '涿鹿兵主', en: null, sys: '陰兵', frag: '兵符', need: 1, have: 0 },
        { name: '太歲', en: null, sys: '弒神', frag: '神血', need: 4, have: c.blood },
        { name: '太歲星君', en: null, sys: '弒神', frag: '神血', need: 12, have: c.blood }
      ].map(h => Object.assign(h, { lv: 83, diff: '—' })),
      /* F17 心魔劫 7 種碎片減益（SIN_FRAG） */
      demon: [
        ['喜', '增加 10% 技能魔力消耗'],
        ['怒', '增加 5% 承受的傷害'],
        ['哀', '減少 20% 生命再生率'],
        ['懼', '減少 5% 移動速度'],
        ['愛', '減少 10% 召喚物傷害'],
        ['惡', '減少 15% 藥劑效果'],
        ['欲', '減少 50% 偷取量']
      ].map(([n, d], i) => ({ name: n + '之碎片', en: null, debuff: d, debuffEn: null, n: c.sin[i] })),
      /* 神格：等 mumi，清單「—」 */
      godhood: null
    };
  }

  /* F24 完整貨幣清單（7 位數照 K／M 邊界；其他存檔只列金、靈魂與主要通貨） */
  const CUR_BIG = [
    ['金幣', 'Gold', 3402118],
    ['靈魂', 'Souls', 1284560],
    ['蛻變石', 'Transmutation Orb', 9999],
    ['增幅石', 'Augmentation Orb', 10000],
    ['富豪石', 'Regal Orb', 99999],
    ['崇高石', 'Exalted Orb', 1234567],
    ['轉化石', 'Conversion Orb', 812],
    ['預知石', 'Foresight Orb', 64],
    ['磨刀石', 'Whetstone', 4210],
    ['護甲片', 'Armour Scrap', 3980],
    ['聖化石', 'Sanctify Orb', 37],
    ['腐化石', 'Corruption Orb', 22],
    ['覺醒石', 'Awakening Orb', 5],
    ['破裂石', null, 14],
    ['完美石', 'Perfection Orb', 3],
    ['追憶之墨', 'Ink of Remembrance', 9],
    ['高階增幅石', 'Greater Aug. Orb', 128],
    ['高階崇高石', 'Greater Exalted Orb', 41],
    ['完美增幅石', 'Perfect Aug. Orb', 2],
    ['完美崇高石', 'Perfect Exalted Orb', 1]
  ];

  /* 營地設施等級（§0：鍛造台・祭壇・斥候營・民房・倉房） */
  const CAMP = (tw, fg, al, sc, ho, st) => [
    ['瞭望台', 'Watchtower', tw],
    ['鍛造台', 'Anvil', fg],
    ['祭壇', 'Altar', al],
    ['斥候營', 'Scout Camp', sc],
    ['民房', 'Houses', ho],
    ['倉房', 'Storehouse', st]
  ];

  /* F08 更多卡（moreHTML，hud.js:726–746） */
  const MC = (k, name, en, st, stEn, dot) => ({ k, name, en, st, stEn, dot: dot ? 1 : 0 });

  function save(o) {
    const at = LI(o.cur);
    return Object.assign(
      {
        PH,
        lv: o.lv,
        /* F01、F02 */
        locs: LOCS.map((l, i) =>
          Object.assign({}, l, { open: i < o.open, soul: (o.soulTest && o.soulTest[l.name]) || l.soul })
        ),
        at,
        star: o.star,
        /* F04 最好／差不多：程式沒有分數，假定 */
        best: o.best,
        near: o.near,
        /* F05 */
        scout: o.scout,
        maxStar: Math.min(5, o.scout + 1),
        starMods: STAR_MODS,
        /* F07 被退回（中期）：雪埋古道 → 凍河口；死因王招＝假定 */
        bounce: {
          from: '雪埋古道',
          fromEn: 'Snowburied Road',
          to: '凍河口',
          toEn: 'Frozen Estuary',
          why: '彈幕環（冰冷）',
          whyEn: null
        },
        /* F09 設定 */
        ver: 'dungeonPOE v0.5.4',
        /* F12 一件裝備＋身上同部位（中期；詞綴數值、DPS 差＝假定） */
        item: {
          name: '連弩',
          en: null,
          rar: 'rare',
          base: '連弩（底材階 6）・稀有・T3・13–31 物理傷害・攻速 1.5',
          baseEn: null,
          cmp: [
            ['增加物理傷害 %', null, 85, 40],
            ['附加物理傷害（平均）', null, 10, 0],
            ['增加攻擊速度 %', null, 14, 0],
            ['暴擊率 %', null, 1, 2]
          ],
          mods: ['增加 85% 物理傷害', '附加 6–14 物理傷害', '增加 14% 攻擊速度', '+1% 暴擊率'],
          modsEn: null
        },
        /* F23 重開：每分鐘 291.92（Lv48）；王隻數、件數＝假定 */
        away: { short: 40, mid: 4, soulMin: 291.92, long: 100, kills: 9, items: 37, rare: 6 }
      },
      o.x
    );
  }

  const S = {
    new: save({
      lv: 1,
      open: 1,
      cur: '地層出口',
      star: 1,
      scout: 0,
      x: {
        camp: CAMP(0, 0, 0, 0, 0, 0),
        /* F03 下一個：枯河渡口（6），瞭望台 Lv1；材料列最缺的排第一 */
        next: {
          name: '枯河渡口',
          en: 'Dry River Ford',
          lv: 6,
          fac: '瞭望台',
          facEn: 'Watchtower',
          facLv: 1,
          mats: [
            ['靈魂', 'Souls', 0, 200],
            ['生鐵', 'Pig Iron', 0, 130],
            ['木', 'Wood', 20, 50]
          ]
        },
        mods: null,
        /* F08：天賦樹、昇華石碑、追逐物品未開不顯示 */
        more: [
          MC('loc', '地點', 'Maps', '正在刷：地層出口 · 1★', 'Farming: Strata Exit · 1★'),
          MC('box', '山海寶盒', 'Shan Hai Box', '殿與王場的門票', null),
          MC('log', '掉落紀錄', 'Drop Log', '0 筆 · 保底進度', null),
          MC('set', '設定', 'Settings', '操作、音效、帳號', null),
          MC('fs', '全螢幕', null, '藏起網址列', null)
        ],
        moreNext: ['升祭壇到 Lv 4 開天賦樹', null],
        /* F09 帳號：訪客；狀態字＝假定 */
        account: { guest: 1, mail: '', st: '已同步' },
        log: [],
        pity: 0,
        pityOther: [],
        guild: null,
        box: BOX({ hun: [0, 0, 0, 0], book: 0, sin: [0, 0, 0, 0, 0, 0, 0], fiend: [0, 0, 0, 0], eye: 0, blood: 0 }),
        prac: { lvMin: 5, lvMax: 5, lv: 5, avg10: 0, total: 0, top: 0, hurt: [0, 0, 0] },
        pracGain: { soul: 0, items: 0, rare: 0 },
        /* F21 開場：第一個目標＝祭壇 Lv1（靈魂 300、木 60）；前 30 秒不掉通貨；升 Lv2、可升營地的秒數＝假定 */
        intro: {
          loc: '地層出口',
          locEn: 'Strata Exit',
          sub: '這片大陸由十二生肖神守護。',
          subEn: null,
          goal: {
            fac: '祭壇',
            facEn: 'Altar',
            lv: 1,
            mats: [
              ['靈魂', 'Souls', 0, 300],
              ['木', 'Wood', 20, 60]
            ]
          },
          firstHit: 3200,
          lv2: 32000,
          campReady: 45000
        },
        /* F22 M1-13 解鎖句三條排隊（版面測試，假定）：最短、最長、天賦樹（X04 從這張點進） */
        unlocks: [
          ['鍛造台 Lv7：崇高石開始掉。', null, 'K', 'forge'],
          [
            '瞭望台 Lv4：新地點「鴉衛的記號」開了（怪物 Lv 11）。到地點清單點它就去刷。',
            'Watchtower Lv10: New location "Broken Stele Field" opened (Monster Lv 28). Tap it in the location list to farm.',
            'M',
            'loc'
          ],
          ['祭壇 Lv4：天賦樹開了，照等級補發的點數已經放進去。', null, 'P', 'tree']
        ],
        gold: 0,
        soul: 0,
        cur: [
          ['金幣', 'Gold', 0],
          ['靈魂', 'Souls', 0],
          ['木', 'Wood', 20]
        ]
      }
    }),
    mid: save({
      lv: 49,
      open: 15,
      cur: '雪埋古道',
      star: 3,
      scout: 2,
      best: '雪埋古道',
      near: '凍河口',
      x: {
        camp: CAMP(14, 12, 6, 2, 6, 2),
        /* F03：冰封神殿（53），瞭望台 Lv15；靈魂 1,180／1,460 最缺 */
        next: {
          name: '冰封神殿',
          en: 'Frozen Temple',
          lv: 53,
          fac: '瞭望台',
          facEn: 'Watchtower',
          facLv: 15,
          mats: [
            ['靈魂', 'Souls', 1180, 1460],
            ['木', 'Wood', 9860, 750],
            ['百煉鋼', 'Tempered Steel', 18600, 150]
          ]
        },
        /* 營地單座卡「接下來會解鎖」（M1-13 句去掉「{設施} Lv n：」） */
        nextUp: [
          [16, '新地點「血原邊境」開了（怪物 Lv 58）'],
          [17, '新地點「白骨丘」開了（怪物 Lv 63）']
        ],
        mods: MODS_MID,
        more: [
          MC('loc', '地點', 'Maps', '正在刷：雪埋古道 · 3★', 'Farming: Snowburied Road · 3★'),
          MC('tree', '天賦樹', 'Talent Tree', '剩 3 點', null) /* 用了 57／60＝假定 */,
          MC('asc', '昇華石碑', 'Ascendancy Stele', '未開（祭壇 6）', null),
          MC('chase', '追逐物品', null, '王印 2／4・下一件保底 37%', 'Seals 2/4 · Chase pity 37%', 1),
          MC('box', '山海寶盒', 'Shan Hai Box', '殿與王場的門票', null),
          MC('log', '掉落紀錄', 'Drop Log', '50 筆 · 保底進度', null),
          MC('set', '設定', 'Settings', '操作、音效、帳號', null),
          MC('fs', '全螢幕', null, '藏起網址列', null)
        ],
        moreNext: ['升祭壇到 Lv 7 開昇華石碑', null],
        account: { guest: 0, mail: 'player.demo@example.com', st: '已同步' } /* 信箱、狀態字＝假定 */,
        log: LOG_MID,
        pity: 37,
        pityOther: PITY_MID,
        /* F14：中期倉房 Lv2，商會沒開 */
        guild: null,
        box: BOX({ hun: [1, 0, 1, 0], book: 0, sin: [0, 0, 0, 0, 0, 0, 0], fiend: [0, 0, 0, 0], eye: 0, blood: 0 }),
        /* F18：Lv5–52；10 秒平均 1,842（假定）；總傷害、最高一擊＝假定（總傷害取稻草人這次受傷 18,420） */
        prac: { lvMin: 5, lvMax: 52, lv: 48, avg10: 1842, total: 18420, top: 412, hurt: [42, 18, 6] },
        /* F20 試招 3 分：靈魂 +875・14 件・◆ 1；營地＋試招合一行 +1,459・23 件・◆ 2（件數、◆、合一行字＝假定） */
        pracGain: { soul: 875, items: 14, rare: 1, both: { soul: 1459, items: 23, rare: 2 } },
        /* 天賦樹期間（X04，假定）：開了 2 分 */
        treeGain: { sec: 120, soul: 583, items: 9, rare: 0 },
        feedHidden: 12 /* 被掉落提示門檻藏掉的件數＝假定 */,
        gold: 8640,
        soul: 1180,
        cur: [
          ['金幣', 'Gold', 8640],
          ['靈魂', 'Souls', 1180],
          ['木', 'Wood', 9860],
          ['百煉鋼', 'Tempered Steel', 18600],
          ['鞣皮', 'Tanned Hide', 2140],
          ['彩絲', 'Dyed Silk', 4180],
          ['崇高石', 'Exalted Orb', 48]
        ]
      }
    }),
    late: save({
      lv: 86,
      open: 22,
      cur: '裂口腹地',
      star: 5,
      scout: 4,
      best: '裂口腹地',
      near: '毒霧林',
      x: {
        camp: CAMP(22, 20, 11, 4, 10, 5),
        next: null,
        mods: MODS_LATE,
        more: [
          MC('loc', '地點', 'Maps', '正在刷：裂口腹地 · 5★', 'Farming: Rift Heartland · 5★'),
          MC('tree', '天賦樹', 'Talent Tree', '點數用完了', null),
          MC('asc', '昇華石碑', 'Ascendancy Stele', '風行神射', null) /* 選哪個＝假定 */,
          MC('chase', '追逐物品', null, '王印 4／4・下一件保底 100%', 'Seals 4/4 · Chase pity 100%'),
          MC('box', '山海寶盒', 'Shan Hai Box', '殿與王場的門票', null),
          MC('log', '掉落紀錄', 'Drop Log', '50 筆 · 保底進度', null),
          MC('set', '設定', 'Settings', '操作、音效、帳號', null),
          MC('fs', '全螢幕', null, '藏起網址列', null)
        ],
        moreNext: null,
        account: { guest: 0, mail: 'player.demo@example.com', st: '已同步' },
        log: LOG_LATE,
        pity: 100,
        pityOther: PITY_LATE,
        guild: null,
        /* F15 後期張數＝假定：勾魂令 2＋1＋1＋1、心魔 1 種、四凶 2 種、陰兵 0（沒拿過）、弒神 0（沒拿過） */
        box: BOX({ hun: [2, 1, 1, 1], book: 0, sin: [1, 0, 0, 0, 0, 0, 0], fiend: [1, 1, 0, 0], eye: 0, blood: 0 }),
        prac: { lvMin: 5, lvMax: 83, lv: 83, avg10: 128400, total: 1284000, top: 24800, hurt: [51, 33, 9] },
        pracGain: { soul: 13200, items: 96, rare: 6 },
        feedHidden: 31,
        gold: 1120400,
        soul: 486210,
        cur: [
          ['金幣', 'Gold', 1120400],
          ['靈魂', 'Souls', 486210],
          ['木', 'Wood', 812300],
          ['隕鐵', 'Meteoric Iron', 64020],
          ['神獸革', 'Divine Beast Hide', 21530],
          ['神絲', 'Divine Silk', 18045]
        ]
      }
    }),
    /* 商會被上限擋：瞭望台 18 → tierCap T5（matTier(68)）；持有＝假定（照 D3 四種量排） */
    cap: save({
      lv: 72,
      open: 19,
      cur: '雪埋古道',
      star: 5,
      scout: 4,
      best: '雪埋古道',
      near: '凍河口',
      x: {
        camp: CAMP(18, 17, 9, 4, 8, 5),
        next: {
          name: '沉城',
          en: 'Sunken City',
          lv: 73,
          fac: '瞭望台',
          facEn: 'Watchtower',
          facLv: 19,
          mats: [
            ['寒鐵', 'Frost Iron', 26, 190],
            ['靈魂', 'Souls', 209892, 1880],
            ['木', 'Wood', 4000, 950]
          ]
        },
        mods: MODS_LATE.slice(0, 13),
        more: [
          MC('loc', '地點', 'Maps', '正在刷：雪埋古道 · 5★', 'Farming: Snowburied Road · 5★'),
          MC('tree', '天賦樹', 'Talent Tree', '剩 1 點', null),
          MC('asc', '昇華石碑', 'Ascendancy Stele', '千機', null),
          MC('chase', '追逐物品', null, '王印 3／4・下一件保底 64%', 'Seals 3/4 · Chase pity 64%'),
          MC('box', '山海寶盒', 'Shan Hai Box', '殿與王場的門票', null),
          MC('log', '掉落紀錄', 'Drop Log', '50 筆 · 保底進度', null),
          MC('set', '設定', 'Settings', '操作、音效、帳號', null),
          MC('fs', '全螢幕', null, '藏起網址列', null)
        ],
        moreNext: null,
        account: { guest: 1, mail: '', st: '已同步' },
        log: LOG_LATE,
        pity: 64,
        pityOther: PITY_LATE,
        guild: GUILD(
          {
            鐵: [3, 7, 22, 12480, 26, 0],
            皮: [0, 4, 5, 21, 10050, 0],
            靈絲: [2, 9, 24, 3, 15, 0]
          },
          5,
          [
            {
              from: '寒鐵',
              fromEn: 'Frost Iron',
              to: '蛻變石',
              toEn: 'Transmutation Orb',
              k: 20,
              have: 26,
              lock: false
            },
            { from: '蛻變石', fromEn: 'Transmutation Orb', to: '木', toEn: 'Wood', k: 1, out: 50, have: 3, lock: false }
          ]
        ),
        box: BOX({ hun: [2, 1, 1, 1], book: 0, sin: [1, 0, 0, 0, 0, 0, 0], fiend: [1, 1, 0, 0], eye: 0, blood: 0 }),
        prac: { lvMin: 5, lvMax: 68, lv: 48, avg10: 1842, total: 18420, top: 412, hurt: [42, 18, 6] },
        pracGain: { soul: 875, items: 14, rare: 1 },
        feedHidden: 12,
        gold: 64172,
        soul: 209892,
        cur: [
          ['金幣', 'Gold', 64172],
          ['靈魂', 'Souls', 209892],
          ['寒鐵', 'Frost Iron', 26],
          ['蛻變石', 'Transmutation Orb', 3]
        ]
      }
    }),
    /* 7 位數資源：K／M 邊界；每分鐘 ≥ 10,000／≥ 1,000,000 只為版面測試（假定） */
    big: save({
      lv: 86,
      open: 22,
      cur: '裂口腹地',
      star: 5,
      scout: 4,
      best: '裂口腹地',
      near: '毒霧林',
      soulTest: { 裂口腹地: 1234567, 毒霧林: 12345 },
      x: {
        soulTest: 1,
        camp: CAMP(21, 20, 11, 4, 10, 5),
        next: null,
        mods: MODS_LATE,
        more: [
          MC('loc', '地點', 'Maps', '正在刷：裂口腹地 · 5★', 'Farming: Rift Heartland · 5★'),
          MC('tree', '天賦樹', 'Talent Tree', '點數用完了', null),
          MC('asc', '昇華石碑', 'Ascendancy Stele', '風行神射', null),
          MC('chase', '追逐物品', null, '王印 4／4・下一件保底 100%', 'Seals 4/4 · Chase pity 100%', 1),
          MC('box', '山海寶盒', 'Shan Hai Box', '殿與王場的門票', null),
          MC('log', '掉落紀錄', 'Drop Log', '50 筆 · 保底進度', null),
          MC('set', '設定', 'Settings', '操作、音效、帳號', null),
          MC('fs', '全螢幕', null, '藏起網址列', null)
        ],
        moreNext: null,
        account: { guest: 0, mail: 'player.demo@example.com', st: '已同步' },
        log: LOG_LATE,
        pity: 12,
        pityOther: PITY_LATE,
        /* 7 位數：tierCap T6 全部能換；百煉鋼／厚革／彩絲照 D1，其他階＝假定 */
        guild: GUILD(
          {
            鐵: [0, 9999, 2870455, 10000, 99999, 1234567],
            皮: [0, 0, 1106930, 5, 0, 0],
            靈絲: [0, 0, 1012764, 0, 0, 0]
          },
          6,
          [
            {
              from: '隕鐵',
              fromEn: 'Meteoric Iron',
              to: '蛻變石',
              toEn: 'Transmutation Orb',
              k: 20,
              have: 1234567,
              lock: false
            }
          ]
        ),
        box: BOX({ hun: [2, 1, 1, 1], book: 1, sin: [1, 1, 1, 0, 0, 0, 0], fiend: [1, 1, 1, 1], eye: 0, blood: 0 }),
        prac: { lvMin: 5, lvMax: 83, lv: 83, avg10: 128400, total: 1284000, top: 24800, hurt: [51, 33, 9] },
        pracGain: { soul: 13200, items: 96, rare: 6 },
        feedHidden: 31,
        gold: 3402118,
        goldB: 12345678901 /* B 邊界另拍一張：金暫改這個值（F24） */,
        soul: 1284560,
        cur: CUR_BIG
      }
    }),
    /* 最長英文：營地同商會被上限擋（D1 最長英文） */
    en: save({
      lv: 72,
      open: 19,
      cur: '雪埋古道',
      star: 5,
      scout: 4,
      best: '雪埋古道',
      near: '凍河口',
      x: {
        camp: CAMP(18, 17, 9, 4, 8, 5),
        next: {
          name: '沉城',
          en: 'Sunken City',
          lv: 73,
          fac: '瞭望台',
          facEn: 'Watchtower',
          facLv: 19,
          mats: [
            ['寒鐵', 'Frost Iron', 26, 190],
            ['靈魂', 'Souls', 209892, 1880],
            ['木', 'Wood', 4000, 950]
          ]
        },
        mods: MODS_EN,
        more: [
          MC('loc', '地點', 'Maps', '正在刷：雪埋古道 · 5★', 'Farming: Snowburied Road · 5★'),
          MC('tree', '天賦樹', 'Talent Tree', '剩 1 點', null),
          MC('asc', '昇華石碑', 'Ascendancy Stele', '千機', null),
          MC('chase', '追逐物品', null, '王印 3／4・下一件保底 64%', 'Seals 3/4 · Chase pity 64%', 1),
          MC('box', '山海寶盒', 'Shan Hai Box', '殿與王場的門票', null),
          MC('log', '掉落紀錄', 'Drop Log', '50 筆 · 保底進度', null),
          MC('set', '設定', 'Settings', '操作、音效、帳號', null),
          MC('fs', '全螢幕', null, '藏起網址列', null)
        ],
        moreNext: null,
        account: { guest: 1, mail: '', st: '已同步' },
        log: LOG_EN,
        pity: 64,
        pityOther: PITY_LATE,
        guild: null,
        box: BOX({ hun: [2, 1, 1, 1], book: 0, sin: [1, 0, 0, 0, 0, 0, 0], fiend: [1, 1, 0, 0], eye: 0, blood: 0 }),
        prac: { lvMin: 5, lvMax: 68, lv: 48, avg10: 1842, total: 18420, top: 412, hurt: [42, 18, 6] },
        pracGain: { soul: 875, items: 14, rare: 1 },
        feedHidden: 12,
        gold: 64172,
        soul: 209892,
        cur: [
          ['金幣', 'Gold', 64172],
          ['靈魂', 'Souls', 209892],
          ['高階崇高石', 'Greater Exalted Orb', 41],
          ['完美崇高石', 'Perfect Exalted Orb', 1]
        ]
      }
    })
  };
  /* 中期的 en 存檔用商會被上限擋的商會（最長英文營地倉房 Lv5 ≥ 4，商會開） */
  S.en.guild = S.cap.guild;
  root.FIX = {
    PH,
    saves: S,
    ORDER: ['new', 'mid', 'late', 'cap', 'big', 'en'],
    NAMES: {
      new: '新存檔（0 秒）',
      mid: '中期（第 15 地點，瞭望台 Lv14）',
      late: '後期（主幹走完）',
      cap: '商會被上限擋（tierCap T5）',
      big: '7 位數資源',
      en: '最長英文'
    }
  };
})(this);
