/* 鍛造 v1.0 驗收截圖與量測（docs/production/evidence/forge/REVIEW-CHECKLIST.md A01–A17）：1280×720、DPR 1，
   每張照清單設好狀態後截圖，並把規格表的元件座標（forge-screens-*.md 的 x,y w×h）跟實機 getBoundingClientRect 逐項比，寫成 MEASURE.md。
   用法：先開本機伺服器，node tools/forge_shots.js [網址 http://localhost:8003/] [輸出資料夾 docs/production/evidence/forge/shots-1126]
   疊圖：python3 tools/forge_overlay.py [輸出資料夾]（定稿圖從 uiux/forge-final-1126@29cf8106 讀） */
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path');
const URL = process.argv[2] || 'http://localhost:8003/',
  OUT = process.argv[3] || path.join(__dirname, '..', 'docs/production/evidence/forge/shots-1126');
fs.mkdirSync(OUT, { recursive: true });

/* 頁面裡的共用設定：鍛造台等級、材料、通貨；mk 做一件指定詞的胸甲 */
const SETUP = (lv, o = {}) => {
  proSkip();
  S.story.tips = 0;
  S.auto = 0;
  S.camp.forge = lv;
  S.camp.store = 4;
  if (o.watch) S.camp.watch = o.watch;
  matAdd('iron', 1, 1240);
  matAdd('iron', 2, 860);
  matAdd('iron', 3, 240);
  Object.assign(MAT(), {
    aug: 120,
    exalt: 6,
    zhi: 2,
    conv: 4,
    frac: 1,
    perf: 0,
    fore: 3,
    plate: 9,
    whet: 5,
    holy: 3,
    corr: 2,
    calam: 2,
    pcalam: 1,
    pen: 1,
    ink: 2,
    om_grief: 1,
    om_rage: 2,
    om_greed: 1,
    om_joy: 1,
    v2: 2,
    v3: 6
  });
  MAT().dust = { life: 12, def: 8, ele: 42, phys: 5, crit: 17, speed: 0, spell: 3, res: 21, attr: 6 };
  S.gold = 12400;
  window.mk = (r, L, aff, x = {}) => {
    const it = mkItem(craftBase('chest', { sys: 'armor', T: 3 }).id, L, r);
    it.a = aff.map(([k, T]) => rollAffT(k, T));
    delete it.uid;
    Object.assign(it, x);
    invPut(S.inv, it);
    return it;
  };
  window.bench = (it, tab = 'forge') => {
    CRAFT.tab = tab;
    openPanel('craft');
    craftPick('inv', it);
  };
};
/* 每張：[編號, 設定（頁面裡跑）, 量測清單 [名稱, 選擇器, x, y, w, h]] */
const P = '#pcraft ';
const HEAD = [
  ['鍛造面板', '#pcraft', 16, 76, 760, 536],
  ['段：打造', P + '.ftabs button:nth-child(1)', 96, 82, 96, 32],
  ['段：鍛造台', P + '.ftabs button:nth-child(2)', 196, 82, 96, 32],
  ['自動分解規則入口', P + '.fa2b', 560, 82, 124, 32],
  ['關閉', P + '> .ph .x', 726, 80, 40, 36],
  ['倉庫面板', '#pinv', 788, 76, 476, 486]
];
const BENCH = [
  ['子分頁：填', P + '.fsub button:nth-child(1)', 32, 126, 88, 32],
  ['右上提醒', P + '.fhint2', 500, 134, 260, 16],
  ['通貨格第 1 格', P + '.fcg .fcu:nth-child(1)', 400, 174, 84, 54],
  ['通貨格第 2 排第 1 格', P + '.fcg .fcu:nth-child(5)', 400, 234, 84, 54]
];
const CARD = [
  ['裝備卡', P + '.fsel', 32, 172, 352, 76],
  ['前綴第 1 列', P + '.fslot:nth-of-type(1) > li:nth-child(1)', 32, 274, 352, 28],
  ['後綴第 1 列', P + '.fslot:nth-of-type(2) > li:nth-child(1)', 32, 388, 352, 28]
];
const MAIN = (w = 220) => [['主要按鈕', P + '.fact .fgo', 400, 556, w, 48]];
const SEC = [['次要按鈕', P + '.fact .fgo2', 628, 556, 132, 48]];
const RVBIG = (y = 464) => [
  ['全部收下', '#preveal .rvall', 632, y, 150, 44],
  ['其餘分解', '#preveal .rvrest', 790, y, 234, 44],
  ['全部翻開', '#preveal .rvflip', 1032, y, 180, 44]
];
const SHOTS = [
  [
    'A01',
    '01-make',
    () => {
      SETUP(12);
      MK.kind = 'chest';
      MK.sys = 'armor';
      MK.T = 3;
      MK.n = 5;
      CRAFT.tab = 'make';
      openPanel('craft');
    },
    [
      ...HEAD,
      ['鍛造台等級列', P + '.fmklv', 32, 132, 560, 16],
      ['去營地升級', P + '.fmkup', 640, 128, 120, 28],
      ['部位（11 種）', P + '.fmkk', 32, 164, 720, 56],
      ['部位第 1 格', P + '.fk', 32, 164, 60, 56],
      ['系第 1 顆', P + '.fsy', 72, 228, 104, 32],
      ['材料第 1 顆', P + '.fmt', 72, 268, 116, 40],
      ['件數第 1 顆', P + '.fmkn .chip', 72, 318, 56, 32],
      ['追憶之墨', P + '.fmki .fcb', 72, 360, 252, 24],
      ['預覽', P + '.fmkp', 32, 398, 728, 84],
      ['自動分解摘要', P + '.fmka', 32, 494, 728, 16],
      ['花費', P + '.fmkc', 32, 548, 360, 20],
      ['打造（主要按鈕）', P + '.fmkgo', 400, 548, 360, 48]
    ]
  ],
  [
    'A02',
    '02-make-lack',
    () => {
      SETUP(12);
      S.camp.wts = ['sword'];
      matAdd('iron', 3, -matN('iron', 3));
      matAdd('iron', 3, 12);
      MK.kind = 'weapon';
      MK.wt = 'sword';
      MK.T = 3;
      MK.n = 10;
      CRAFT.tab = 'make';
      openPanel('craft');
    },
    [
      ['部位：武器', P + '.fk', 32, 164, 60, 56],
      ['武器類別（已開）', P + '.fwt', 104, 228, 64, 32],
      ['選新武器類別', P + '.fwn', 184, 226, 576, 32],
      ['花費（不夠）', P + '.fmkc', 32, 548, 300, 20],
      ['打造（不能按）', P + '.fmkgo', 400, 548, 360, 48]
    ]
  ],
  [
    'A03',
    '03-make-reveal',
    () => {
      SETUP(12);
      const L = [
        mk(2, 16, [
          ['life', 1],
          ['resF', 1],
          ['armor', 2]
        ]),
        mk(2, 16, [
          ['life', 1],
          ['resC', 4],
          ['armor', 4]
        ]),
        mk(1, 16, [['resL', 3]]),
        mk(2, 16, [
          ['life', 3],
          ['resF', 3]
        ]),
        mk(0, 16, [])
      ];
      CRAFT.tab = 'make';
      openPanel('craft');
      revealOpen(L, { title: '打造 5 件・鍊甲', craft: 1 });
      for (const it of L.slice(0, 3)) REV.fl.add(it.id);
      REV.kp.add(L[2].id);
      changed();
    },
    [
      ['卡 1（✦2 金框）', '#preveal .rvg > :nth-child(1)', 68, 204, 216, 216],
      ['卡 2', '#preveal .rvg > :nth-child(2)', 300, 204, 216, 216],
      ['卡 4（卡背・亮邊）', '#preveal .rvg > :nth-child(4)', 764, 204, 216, 216],
      ['卡 5（卡背）', '#preveal .rvg > :nth-child(5)', 996, 204, 216, 216],
      ['卡 2 單卡按鈕', '#preveal .rvg > :nth-child(2) .rvb', 310, 370, 194, 36],
      ['卡 1 ✦n', '#preveal .rvg > :nth-child(1) .cs', 90, 215, 32, 16],
      ['卡 1 已鎖標', '#preveal .rvg > :nth-child(1) .rvtag', 230, 216, 44, 16],
      ['跳過動畫勾選', '#preveal .rvsk > i', 68, 470, 16, 16],
      ...RVBIG()
    ],
    async p => {
      await p.dispatchEvent('#preveal .rvrest', 'pointerdown');
      await p.waitForTimeout(300);
    }
  ],
  [
    'A03b',
    '03b-make-reveal-jackpot',
    () => {
      SETUP(12);
      const it = mk(2, 16, [
        ['life', 1],
        ['resF', 1],
        ['armor', 2]
      ]);
      CRAFT.tab = 'make';
      openPanel('craft');
      revealOpen([it], { title: '打造 1 件・鍊甲', craft: 1 });
      REV.fl.add(it.id);
      changed();
    },
    [['✦2 卡（置中）', '#preveal .rvg > :nth-child(1)', 532, 176, 216, 216]]
  ],
  [
    'A03c',
    '03c-make-reveal-20',
    () => {
      SETUP(20);
      const L = [];
      for (let i = 0; i < 20; i++)
        L.push(
          i === 5
            ? mk(2, 16, [
                ['life', 1],
                ['resF', 1],
                ['armor', 2]
              ])
            : mk(i % 3 === 2 ? 2 : i % 3, 16, i % 3 ? [['resC', 3]] : [])
        );
      CRAFT.tab = 'make';
      openPanel('craft');
      revealOpen(L, { title: '打造 20 件・鍊甲', craft: 1 });
      for (const it of L.slice(0, 14)) REV.fl.add(it.id);
      REV.kp.add(L[2].id);
      REV.exp = L[5].id;
      changed();
    },
    [
      ['小方卡 1', '#preveal .rvg > :nth-child(1)', 68, 172, 104, 104],
      ['小方卡 2', '#preveal .rvg > :nth-child(2)', 180, 172, 104, 104],
      ['小方卡 11（第 2 排）', '#preveal .rvg > :nth-child(11)', 68, 284, 104, 104],
      ['展開詳細卡', '#preveal .rvex', 744, 166, 216, 216],
      ['只看稀有以上', '#preveal .rvrare', 1010, 108, 150, 32],
      ['跳過動畫勾選', '#preveal .rvsk > i', 68, 448, 16, 16],
      ...RVBIG(440)
    ],
    async p => {
      await p.dispatchEvent('#preveal .rvrest', 'pointerdown');
      await p.waitForTimeout(210);
    }
  ],
  [
    'A04',
    '04-auto-salvage',
    () => {
      SETUP(14);
      CRAFT.tab = 'make';
      CRAFT.a2 = 1;
      openPanel('craft');
    },
    [
      ['標題', P + '.fa2t', 136, 172, 300, 22],
      ['關閉', P + '.fa2c', 628, 166, 36, 32],
      ['照稀有度留第 1 顆', P + '.fa2r .chip', 136, 260, 120, 32],
      ['另外留：詞階第 1 顆', P + '.fa2r.f2 .chip', 136, 332, 96, 32],
      ['另外留：追憶詞、▲', P + '.fa2g', 456, 332, 200, 32],
      ['回收說明', P + '.fa2v', 136, 380, 520, 34],
      ['完成', P + '.fa2ok', 136, 480, 520, 44]
    ]
  ],
  [
    'A05',
    '05-bench-empty',
    () => {
      SETUP(12);
      CRAFT.tab = 'forge';
      CRAFT.sel = null;
      openPanel('craft');
    },
    [
      ...HEAD.slice(0, 5),
      ...BENCH,
      ['子分頁：沒開的下一個', P + '.fsub .nx', 308, 126, 88, 32],
      ['放置槽（空）', P + '.cuslot', 32, 172, 352, 120],
      ['起始說明', P + '.cuhint', 32, 308, 352, 50],
      ...MAIN(360)
    ],
    async p => {
      await p.hover('#pcraft .fcg .fcu:nth-child(6)');
      await p.waitForTimeout(600);
    }
  ],
  [
    'A06',
    '06-fill',
    () => {
      SETUP(20, { watch: 22 });
      const it = mk(
        2,
        16,
        [
          ['life', 1],
          ['armor', 3],
          ['ev', 3],
          ['resF', 3],
          ['resC', 2]
        ],
        { q: 0.1 }
      );
      bench(it);
      CRAFT.op = 'exalt';
      CRAFT.log = '上一次：加詞石　加入 +22% 冰冷抗性 T2';
      changed();
    },
    [
      ...BENCH,
      ...CARD,
      ['說明', P + '.fdo', 400, 296, 360, 32],
      ['預覽：三顆比較', P + '.fpv3', 400, 338, 360, 120],
      ['預兆第 1 顆', P + '.fomc', 444, 466, 75, 28],
      ['品質', P + '.fqb', 400, 504, 360, 32],
      ...MAIN(),
      ...SEC,
      ['結果紀錄', P + '.flog', 32, 584, 352, 16]
    ]
  ],
  [
    'A07',
    '07-fill-dust',
    () => {
      SETUP(20, { watch: 23 });
      const it = mk(
        2,
        16,
        [
          ['life', 1],
          ['armor', 3],
          ['ev', 3],
          ['resF', 3],
          ['resC', 2]
        ],
        { q: 0.1 }
      );
      bench(it);
      CRAFT.op = 'dust';
      CRAFT.dust = 'ele:3';
      changed();
    },
    [
      ['精髓粉第 1 顆', P + '.fdgg .fdc', 444, 300, 100, 28],
      ['檔第 1 顆', P + '.fdtb', 444, 400, 100, 40],
      ['預覽：消耗＋詞階範圍', P + '.fdpv', 400, 448, 360, 80],
      ['去鼎', P + '.flink', 400, 534, 360, 16],
      ...MAIN(),
      ...SEC
    ]
  ],
  [
    'A07b',
    '07b-fill-cauldron',
    () => {
      SETUP(20, { watch: 23 });
      const it = mk(
        2,
        16,
        [
          ['life', 1],
          ['armor', 3],
          ['resF', 3],
          ['resC', 2]
        ],
        { q: 0.1 }
      );
      bench(it);
      CRAFT.op = 'pot';
      CRAFT.pot = { v: 'v3', s: ['ele', 'crit'], keep: 1 };
      changed();
    },
    [
      ['回單用粉', P + '.fpb1', 400, 172, 80, 28],
      ['選鼎第 1 顆', P + '.fpv2', 488, 172, 132, 28],
      ['鼎孔（已放）第 1 孔', P + '.fhole', 400, 212, 112, 64],
      ['鼎孔（空）', P + '.fhole:nth-child(3)', 648, 212, 112, 64],
      ['粉選盤第 1 顆', P + '.fpal .fdc', 400, 310, 116, 28],
      ['即時預覽', P + '.fppv', 400, 404, 360, 80],
      ['保留配方', P + '.fkeep', 400, 528, 360, 16],
      ...MAIN(),
      ...SEC
    ]
  ],
  [
    'A08',
    '08-fill-conv',
    () => {
      SETUP(20);
      const it = mk(
        2,
        16,
        [
          ['life', 1],
          ['armor', 3],
          ['ev', 3],
          ['resF', 3],
          ['resC', 2]
        ],
        { q: 0.1 }
      );
      it.frac = 'armor';
      bench(it);
      CRAFT.op = 'conv';
      CRAFT.conv = it.a.findIndex(a => a.k === 'resF');
      changed();
    },
    [
      ['可選的詞（第 1 列）', P + '.fslot:nth-of-type(1) .fcv', 32, 274, 352, 28],
      ['說明', P + '.fdo', 400, 300, 360, 32],
      ['預覽：換掉與可能換成', P + '.fr .fpv', 400, 344, 360, 112],
      ...MAIN(),
      ...SEC
    ]
  ],
  [
    'A09',
    '09-fill-foresight',
    () => {
      SETUP(20);
      const it = mk(
        2,
        16,
        [
          ['life', 1],
          ['armor', 3],
          ['resF', 3],
          ['resC', 2]
        ],
        { q: 0.1 }
      );
      bench(it);
      CRAFT.op = 'exalt';
      forePeek(it, 'exalt');
      changed();
    },
    [['預知結果', P + '.ffore', 400, 300, 360, 112], ...MAIN(), ...SEC]
  ],
  [
    'A10',
    '10-fill-joy-pick',
    () => {
      SETUP(20, { watch: 23 });
      const it = mk(
        2,
        16,
        [
          ['life', 1],
          ['armor', 3],
          ['resF', 3],
          ['resC', 2]
        ],
        { q: 0.1 }
      );
      bench(it);
      forgeDo(it, 'exalt', null, ['om_joy']);
      changed();
    },
    [
      ['標題', P + '.fh', 400, 300, 360, 20],
      ['選項 1', P + '.fjoy .fco:nth-child(1)', 400, 332, 360, 56],
      ['選項 2', P + '.fjoy .fco:nth-child(2)', 400, 396, 360, 56],
      ['提醒', P + '.fnote', 400, 468, 360, 16],
      ['通貨格（鎖住）', P + '.fcg', 400, 174, 360, 114]
    ]
  ],
  [
    'A11',
    '11-fill-lack',
    () => {
      SETUP(13);
      MAT().exalt = 0;
      const it = mk(1, 10, [['life', 3]]);
      bench(it);
      CRAFT.op = 'exalt';
      changed();
    },
    [
      ['選中但數量 0（崇高石）', P + '.fcg .fcu:nth-child(2)', 492, 174, 84, 54],
      ['還沒開（至臻石）', P + '.fcg .fcu:nth-child(3)', 584, 174, 84, 54],
      ['不能用在這件（破裂石）', P + '.fcg .fcu:nth-child(6)', 492, 234, 84, 54],
      ['停用（混沌石）', P + '.fcg .fcu:nth-child(8)', 676, 234, 84, 54],
      ['不夠的原因', P + '.flk', 408, 366, 200, 16],
      ['去商會', P + '.fshop', 400, 404, 360, 60],
      ...MAIN(),
      ...SEC
    ]
  ],
  [
    'A12',
    '12-temper',
    () => {
      SETUP(20);
      const it = mk(
        2,
        16,
        [
          ['life', 1],
          ['armor', 3],
          ['resF', 3],
          ['resC', 2]
        ],
        { q: 0.1, tmp: 2 }
      );
      it.frac = 'armor';
      bench(it, 'temper');
      CRAFT.log = '淬鍊完成：火焰抗性 +18% 41% → 78%';
      changed();
    },
    [
      ['詞列（淬鍊模式）', P + '.ftm .ftx', 32, 274, 188, 28],
      ['百分位條', P + '.ftm .fpb', 220, 284, 96, 10],
      ['單條淬鍊', P + '.ftm .btn', 320, 277, 60, 22],
      ['標題＋次數', P + '.fh2', 400, 176, 160, 24],
      ['說明', P + '.fdo', 400, 236, 360, 50],
      ['費用列', P + '.fcost', 400, 300, 360, 36],
      ...MAIN(360)
    ]
  ],
  [
    'A13',
    '13-holy',
    () => {
      SETUP(20);
      const it = mk(
        2,
        16,
        [
          ['life', 1],
          ['armor', 3],
          ['resF', 3],
          ['resC', 2]
        ],
        { q: 0.1 }
      );
      bench(it, 'holy');
    },
    [['說明', P + '.fdo', 400, 204, 360, 34], ['不可逆提醒', P + '.fwarn', 400, 252, 360, 34], ...MAIN(360)]
  ],
  [
    'A14',
    '14-corrupt',
    () => {
      SETUP(20);
      const it = mk(
        2,
        16,
        [
          ['life', 1],
          ['armor', 3],
          ['resF', 3],
          ['resC', 2]
        ],
        { q: 0.1 }
      );
      bench(it, 'corr');
    },
    [
      ['不可逆提醒', P + '.fwarn', 400, 174, 360, 44],
      ['結果機率', P + '.fodds', 400, 230, 360, 116],
      ['爆開補償', P + '.fdo', 400, 356, 360, 50],
      ...MAIN(360)
    ]
  ],
  [
    'A15',
    '15-corrupt-confirm',
    () => {
      SETUP(20);
      const it = mk(
        2,
        16,
        [
          ['life', 1],
          ['armor', 3],
          ['resF', 3],
          ['resC', 2]
        ],
        { q: 0.1 }
      );
      bench(it, 'corr');
      setTimeout(() => document.querySelector('#pcraft [data-fg="cor"]').click(), 50);
    },
    [
      ['標題', '#hask h2', 410, 246, 460, 24],
      ['長按腐化', '#hask .hgo', 410, 376, 220, 52],
      ['取消（預設焦點）', '#hask [data-h="no"]', 650, 376, 220, 52]
    ]
  ],
  [
    'A16',
    '16-calamity',
    () => {
      SETUP(20, { watch: 22 });
      const it = mk(
        2,
        16,
        [
          ['life', 1],
          ['armor', 3],
          ['resF', 3],
          ['resC', 2]
        ],
        { q: 0.1, cor: 1 }
      );
      it.cw = [{ k: Object.keys(CORR)[0], v: CORR[Object.keys(CORR)[0]].r[1] }];
      bench(it, 'calam');
    },
    [
      ['災魘石／完美災魘石', P + '.fcs', 400, 174, 176, 40],
      ['說明', P + '.fdo', 400, 222, 360, 34],
      ['條件提醒', P + '.fwarn', 400, 262, 360, 26],
      ['結果機率', P + '.fodds', 400, 296, 360, 56],
      ['判官筆', P + '.fpn .fcb', 400, 364, 200, 24],
      ['預覽：可能的災魘詞', P + '.fr .fpv', 400, 412, 360, 92],
      ...MAIN(360)
    ]
  ],
  [
    'A17',
    '17-calamity-pick',
    () => {
      SETUP(20, { watch: 22 });
      const it = mk(
        2,
        16,
        [
          ['life', 1],
          ['armor', 3],
          ['resF', 3],
          ['resC', 2]
        ],
        { q: 0.1, cor: 1 }
      );
      bench(it, 'calam');
      calamDo(it, 0, 0, 'ok');
      /* 關掉再開還在 */
      closePanels();
      bench(it, 'calam');
    },
    [
      ['標題', P + '.fh', 400, 176, 360, 20],
      ['選項 1', P + '.fcalo .fco:nth-child(1)', 400, 208, 360, 64],
      ['提醒', P + '.fnote', 400, 432, 360, 16]
    ]
  ]
];

(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const md = [
    '# 鍛造 v1.0 實機量測（1280×720，DPR 1）',
    '',
    `網址 ${URL}；規格座標＝forge-screens-*.md 的 x,y w×h；差＝實機 − 規格（px），超過 2 標 ❌。`,
    ''
  ];
  let bad = 0,
    all = 0;
  for (const [id, ref, setup, M, after] of SHOTS) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL + '?p=fs' + id);
    await p.waitForFunction(() => typeof proSkip === 'function' && typeof S !== 'undefined' && S);
    await p.evaluate(`window.SETUP = ${SETUP}`);
    await p.evaluate(`(${setup})()`);
    await p.waitForTimeout(500);
    if (after) await after(p);
    const file = `${id}-實機.png`;
    await p.screenshot({ path: path.join(OUT, file) });
    const R = await p.evaluate(
      M =>
        M.map(([n, q, x, y, w, h]) => {
          const e = document.querySelector(q);
          if (!e || !e.getClientRects().length) return [n, x, y, w, h, null];
          const r = e.getBoundingClientRect();
          return [n, x, y, w, h, [r.x, r.y, r.width, r.height].map(Math.round)];
        }),
      M
    );
    md.push(`## ${id}（${ref}.png）`, '', `![${id}](${file})　疊圖：![${id} 疊圖](${id}-疊圖.png)`, '');
    md.push('| 元件 | 規格 x,y w×h | 實機 x,y w×h | 差 Δx,Δy Δw,Δh | |', '|---|---|---|---|---|');
    for (const [n, x, y, w, h, r] of R) {
      all++;
      if (!r) {
        bad++;
        md.push(`| ${n} | ${x},${y} ${w}×${h} | 找不到 | — | ❌ |`);
        continue;
      }
      const d = [r[0] - x, r[1] - y, r[2] - w, r[3] - h],
        ok = d.every(v => Math.abs(v) <= 2);
      if (!ok) bad++;
      md.push(
        `| ${n} | ${x},${y} ${w}×${h} | ${r[0]},${r[1]} ${r[2]}×${r[3]} | ${d[0]},${d[1]} ${d[2]},${d[3]} | ${ok ? '✅' : '❌'} |`
      );
    }
    if (errs.length) md.push('', `pageerror：${errs.join('；')}`);
    md.push('');
    console.log(
      `${id} ${R.filter(r => r[5] && [r[5][0] - r[1], r[5][1] - r[2], r[5][2] - r[3], r[5][3] - r[4]].every(v => Math.abs(v) <= 2)).length}/${R.length}${errs.length ? ' pageerror ' + errs[0] : ''}`
    );
    await p.close();
  }
  md.splice(3, 0, `合計 ${all - bad}／${all} 項在 ±2 px 內；❌ ${bad} 項（照實列出，不放寬）。`, '');
  fs.writeFileSync(path.join(OUT, 'MEASURE.md'), md.join('\n'));
  console.log(`合計 ${all - bad}/${all}`);
  await b.close();
})();
