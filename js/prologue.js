/* dungeonPOE · 序章（企劃書 3.1）：手工小地圖，一步一步做到才前進。
   更新後所有玩家都跑一次（S.story.prologue ≠ PRO_VER）：S 換成臨時角色，真的存檔留在 PRO.real，save()／雲端一律寫真的；
   走出地層才換回來，第 7、8 步在藏身處用自己的角色走。新玩家（S.fresh）留下序章拿到的劍。 */
'use strict';
const PRO_VER = 1;
const PRO_SWORD = 'w_sword1_0';
/* 這幾樣是玩家的設定與故事，序章裡改了也要留下來 */
const PRO_SHARE = ['orient', 'sfx', 'story'];
const PRO = { on: false, real: null, i: 0, st: {}, txt: '', hl: '' };
/* 手工地圖（格子座標）：由下往上爬出地層。rooms 是地板，gates 是擋路的石牆 [x0, y, x1]，做到才打開 */
const PRO_MAP = {
  cols: 28,
  rows: 74,
  rooms: [
    [4, 62, 13, 70],
    [7, 57, 10, 62],
    [3, 48, 16, 56],
    [12, 44, 15, 48],
    [8, 33, 23, 43],
    [16, 29, 19, 33],
    [6, 19, 21, 28],
    [9, 15, 12, 19],
    [3, 4, 22, 14],
    [11, 1, 14, 4]
  ],
  gates: [
    [7, 59, 10],
    [12, 46, 15],
    [16, 31, 19],
    [9, 17, 12],
    [11, 3, 14]
  ]
};
/* 屍堆：第一間是玩家醒來的地方，王房是遠征軍倒下的地方（格子） */
const PRO_PILES = [
  [6, 65],
  [11, 66],
  [6, 69],
  [11, 69],
  [8.5, 69.5],
  [5, 63],
  [12, 63],
  [6, 8],
  [19, 7],
  [17, 12],
  [7, 12]
];
/* 擺設固定：牆上的火把、墓碑、甕（不用 decorate，那個會隨機放毒水窪，看起來像陷阱） */
const PRO_TORCH = [
  [6, 62],
  [11, 62],
  [5, 48],
  [14, 48],
  [10, 33],
  [21, 33],
  [8, 19],
  [19, 19],
  [6, 4],
  [19, 4]
];
const PRO_DECO = [
  ['grave', 5, 50],
  ['urn', 15, 54],
  ['urn', 4, 54],
  ['grave', 21, 41],
  ['urn', 9, 35],
  ['grave', 7, 26],
  ['urn', 20, 21],
  ['grave', 4, 6],
  ['grave', 21, 6]
];
const proXY = ([x, y]) => ({ x: (x + 0.5) * TS, y: (y + 0.5) * TS });
const proNear = (p, r) => dist(P, p) < r;
const proHasSword = () => S.inv.items.some(it => it.b === PRO_SWORD);
/* 同一句提示分桌機、手機橫向、手機直立 */
const proKey = (pc, land, port) => (!TOUCH.on ? pc : PORT() ? port : land);
/* 每一步：at 重來的起點（格子）、gate 進這一步時打開的石牆、aim 地上的指引、hl 要亮的按鍵、go 進這一步、done 做到了沒 */
const PRO_STEPS = [
  {
    at: [8.5, 66],
    aim: () => proXY([8.5, 60.5]),
    t: () => proKey('按 WASD 走到光圈', '拖動左半邊的搖桿，走到光圈', '按住畫面往前拖，走到光圈'),
    done: () => proNear(proXY([8.5, 60.5]), 70)
  },
  {
    at: [8.5, 60.5],
    gate: 0,
    go() {
      const { x, y } = proXY([9, 51]);
      /* nopick：不會被自動撿走，也不吃過濾器 */
      G.drops.push({ x, y, sx: x, sy: y, t: 1, nopick: 1, it: mkItem(PRO_SWORD, 1, 0) });
    },
    aim: () => G.drops[0] || null,
    t: () =>
      !proHasSword()
        ? proKey('走到劍旁邊，按 F 撿起來', '走到劍旁邊，點地上的名字', '走到劍旁邊，點地上的名字')
        : PANEL.inv
          ? proKey('點一下劍裝上', '點一下劍，再按「裝備」', '點一下劍，再按「裝備」')
          : proKey('按 I 打開背包', '點右上的背包', '點右上的背包'),
    hl: () =>
      !proHasSword()
        ? ''
        : !PANEL.inv
          ? '[data-tm=inv]'
          : !$('tip').hidden && $('tip').classList.contains('act')
            ? '#tip [data-tq=move]'
            : '#pinv .it[data-src=inv]',
    done: () => !!S.eq.weapon
  },
  {
    at: [13.5, 46],
    gate: 1,
    go() {
      closePanels();
      for (const [x, y] of [
        [14, 39],
        [17, 37],
        [20, 40]
      ])
        proMob(MOBS.skel, x, y, 60);
    },
    aim: () => G.mobs.find(m => m.hp > 0) || null,
    t: () => proKey('按左鍵攻擊，打倒骷髏', '按右下的大鍵攻擊，打倒骷髏', '點一下畫面攻擊，打倒骷髏'),
    hl: () => (PORT() ? '' : '.sk[data-k=s0]'),
    done: () => !G.mobs.some(m => m.hp > 0)
  },
  {
    at: [17.5, 31],
    gate: 2,
    go: () => (PRO.st.n = 0),
    aim: () => (proInD() ? null : proXY([14, 24])),
    t: () =>
      proKey(
        `紅圈落下前，按空白翻滾出去（${PRO.st.n}／2）`,
        `紅圈落下前，按翻滾鍵滾出去（${PRO.st.n}／2）`,
        `紅圈落下前，快速一撥滾出去（${PRO.st.n}／2）`
      ),
    hl: () => (PORT() ? '' : '.sk[data-k=roll]'),
    tick: proCircle,
    done: () => PRO.st.n >= 2
  },
  {
    at: [14, 24],
    go() {
      shake(0.6);
      sfx('slam');
      fx({ k: 'ring', x: P.x, y: P.y, r: 150, dur: 0.4, col: '#ff8a5b' });
      /* 一定要受傷才有理由喝藥水：這一下不走 hurtPlayer，翻滾躲不掉 */
      P.hp = Math.ceil(ST.hp * 0.35);
      P.hurtT = 0.35;
      P.flask = FLASK.n;
    },
    t: () => proKey('地面炸開了！按 1 喝生命藥水', '地面炸開了！按亮著的藥水鍵', '地面炸開了！按亮著的藥水鍵'),
    hl: () => '.sk[data-k=flask]',
    done: () => P.flask < FLASK.n
  },
  {
    at: [14, 22],
    gate: 3,
    go() {
      closePanels();
      P.flask = FLASK.n;
      P.mp = ST.mp;
      /* 小王：血量抓普攻 12 秒；招式走現有的王 AI */
      const m = proMob({ ...MOBS.bknight, n: '遠征軍的殘骸', pat: ['swipe', 'slam'] }, 12.5, 8, dps(ST) * 12);
      m.boss = 1;
      m.cd = 2;
      PRO.st.sk = 0;
    },
    aim: () => G.mobs.find(m => m.boss) || null,
    t: () =>
      PRO.st.sk
        ? '打倒牠'
        : proKey('按右鍵放技能「幻影斬」', '按亮著的技能鍵放「幻影斬」', '按亮著的技能鍵放「幻影斬」'),
    hl: () => (PRO.st.sk ? '' : '.sk[data-k=s1]'),
    /* 每步做到才前進：沒放過技能就留半條血 */
    tick() {
      const b = G.mobs.find(m => m.boss);
      if (P.act && P.act.k !== 'slash') PRO.st.sk = 1;
      if (b && !PRO.st.sk && b.hp < b.mhp / 2) (b.hp = b.mhp / 2), hudWarn('只靠普攻打不倒牠：放技能');
    },
    done: () => !G.mobs.some(m => m.boss && m.hp > 0)
  },
  {
    gate: 4,
    aim: () => proXY([12.5, 1.5]),
    t: () => '往上走，走出地層',
    done: () => proNear(proXY([12.5, 2]), 80)
  },
  {
    /* 從這裡起是藏身處、自己的角色 */
    go: proHome,
    aim: () => HIDE_ART.npc.bone,
    t: () => '走到撿骨師面前',
    /* 走到面前不用按鍵，他先開口 */
    tick() {
      if (PRO.st.talk || !proNear(HIDE_ART.npc.bone, 120)) return;
      PRO.st.talk = 1;
      talkPlay('bone_first', () => (PRO.st.met = 1));
    },
    done: () => PRO.st.met
  },
  {
    aim: () => HIDE_ART.props.find(p => p.k === 'device'),
    t: () => proKey('走到地圖台，按 F 打開', '走到地圖台，按互動鍵打開', '走到地圖台，按互動鍵打開'),
    done: () => false /* openWorld 收尾 */
  }
];
const proInD = () => P.y < 29 * TS;
/* 第 2 步的引導放進背包面板：面板會蓋住目標列（手機直立蓋滿全螢幕）。invHTML 放在格子上面 */
const proInv = () => (PRO.on && PRO.i === 1 && proHasSword() ? `<p class="pro-inv">${PRO_STEPS[1].t()}</p>` : '');
/* 序章的怪：血量寫死，不吃階級倍率 */
function proMob(D, x, y, hp) {
  const p = proXY([x, y]),
    m = spawnMob(D, p.x, p.y, 1, false);
  m.hp = m.mhp = hp;
  return m;
}
function proTiles() {
  const { cols, rows, rooms, gates } = PRO_MAP,
    tiles = new Uint8Array(cols * rows).fill(1);
  for (const [x0, y0, x1, y1] of rooms)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[y * cols + x] = 0;
  for (const [x0, y, x1] of gates) for (let x = x0; x <= x1; x++) tiles[y * cols + x] = 1;
  return tiles;
}
/* 打開石牆：換一份格子，biome.js 的區塊快取看到新陣列就會重畫 */
function proOpenGate(i) {
  const [x0, y, x1] = PRO_MAP.gates[i],
    t = (G.tiles = G.tiles.slice());
  for (let x = x0; x <= x1; x++) t[y * G.cols + x] = 0;
  G.mini = null;
  sfx('slam');
  shake(0.35);
  fx({ k: 'ring', x: ((x0 + x1 + 1) / 2) * TS, y: (y + 0.5) * TS, r: 90, dur: 0.4, col: '#c9b8a8' });
}
/* 進序章：臨時角色、固定地圖 */
function proStart() {
  PRO.real = S;
  S = newGame();
  for (const k of PRO_SHARE) S[k] = PRO.real[k];
  PRO.on = true;
  PRO.st = {};
  closePanels();
  const { cols, rows } = PRO_MAP,
    p = proXY(PRO_STEPS[0].at);
  resetWorld(cols * TS, rows * TS);
  Object.assign(G, {
    scene: 'map',
    mapT: 1,
    star: 1,
    mm: mapMods(null),
    tiles: proTiles(),
    cols,
    rows,
    biome: 'tomb',
    /* 不累積首領進度、不會冒出地圖王 */
    bossOut: 1
  });
  G.deco = [
    ...PRO_TORCH.map(([x, y]) => ({ k: 'torch', x: (x + 0.5) * TS, y: (y - 0.3) * TS, l: 190 })),
    ...PRO_DECO.map(([k, x, y]) => ({ k, ...proXY([x, y]), s: 1, l: 0 }))
  ];
  newPlayer(p.x, p.y);
  skillsEnter();
  hudBar();
  hudState();
  proStep(0);
}
function proStep(i) {
  PRO.i = i;
  const s = PRO_STEPS[i];
  if (s.gate != null) proOpenGate(s.gate);
  if (s.go) s.go();
  proBar();
}
/* 倒下沒有懲罰：這一步的東西清掉，從這一步的起點重來 */
function proDied() {
  const s = PRO_STEPS[PRO.i],
    p = proXY(s.at);
  P.hp = 0;
  newPlayer(p.x, p.y);
  skillsEnter();
  Object.assign(G, { mobs: [], shots: [], tele: [] });
  PRO.st = {};
  if (s.go) s.go();
  sfx('die');
  hudWarn('你又醒了過來');
  proBar();
}
function proTick() {
  const s = PRO_STEPS[PRO.i];
  if (s.tick) s.tick();
  const hl = s.hl ? s.hl() : '';
  /* 面板重畫會洗掉高亮（class 跟著 HTML 一起換掉）：不見了就補回來 */
  if (PRO.txt !== s.t() || PRO.hl !== hl || (hl && !document.querySelector('.pro-hl'))) proBar();
  if (G.state === 'play' && s.done()) sfx('pick'), proStep(PRO.i + 1);
}
/* 第 4 步：紅圈鎖定玩家，翻滾躲掉才算；用走的躲掉要再來一次。翻滾約 140 像素，半徑 100 從中心也翻得出去 */
function proCircle() {
  const st = PRO.st,
    c = st.c;
  if (P.roll && c) st.rolled = 1;
  if (c && c.done) {
    if (P.hp < st.hp) hudWarn('被砸中了：提早翻滾出去');
    else if (st.rolled) st.n++;
    else hudWarn('這次用翻滾躲');
    st.c = null;
    st.t0 = G.t;
  }
  if (proInD() && !st.c && st.n < 2 && G.t - (st.t0 || 0) > 0.7) {
    st.rolled = 0;
    st.hp = P.hp;
    st.c = { x: P.x, y: P.y, r: 100, t: 0, dur: 1.1, dmg: 14, src: { D: { n: '落石' } }, el: 'phys' };
    G.tele.push(st.c);
  }
}
/* 走出地層：這一刻把角色換回來；重新整理也從這裡接 */
function proHome() {
  proBack();
  S.story.proS = 7;
  PRO.st = {};
  enterHideout();
  const e = HIDE_ART.exit;
  Object.assign(P, { x: e.x, y: e.y - 76 });
  G.cam.x = P.x;
  G.cam.y = P.y;
  sfx('portal');
  introLid();
  save();
}
/* 換回真的存檔。新玩家拿到劍（序章那把，跳過了就給一把一樣的）；老玩家什麼都不動 */
function proBack() {
  const t = S,
    s = PRO.real;
  if (!s && !S.fresh) return;
  if (s) {
    S = s;
    PRO.real = null;
    for (const k of PRO_SHARE) S[k] = t[k];
  }
  if (S.fresh) {
    S.eq.weapon = (s && t.eq.weapon) || mkItem(PRO_SWORD, 1, 0);
    delete S.fresh;
    S.story.tips = 1;
  }
  ST = stats();
  hudBar();
}
function proOff() {
  PRO.on = false;
  $('pro').hidden = true;
  proHl('');
}
/* 結束或跳過都記版本號，版本號變了才重跑 */
function proDone() {
  S.story.intro = S.story.prologue = PRO_VER;
  delete S.story.proS;
  proOff();
  save();
}
function proSkip() {
  const inMap = G.scene === 'map';
  introStop();
  if (TALK.on) talkEnd();
  proBack();
  proDone();
  if (inMap) closePanels(), enterHideout();
}
/* 雲端換存檔：開場與序章都停掉，臨時角色直接丟掉 */
function proAbort() {
  introStop();
  if (PRO.real) S = PRO.real;
  PRO.real = null;
  proOff();
}
/* 啟動：要不要跑開場與序章 */
function proBoot() {
  const st = S.story;
  if (st.prologue === PRO_VER) return;
  if (st.proS) (PRO.on = true), proStep(st.proS);
  else if (st.intro === PRO_VER) proStart();
  else introGate();
}
/* 第 8 步：開啟地圖。之後改接世界地圖時只動這個函式（藏身處的地圖台也走這裡） */
function openWorld() {
  openPanel('device');
  if (PRO.on && PRO.i === 8) proDone();
}
/* 新玩家第一次走到昇華石碑、鍛造台，第一次打開天賦樹：撿骨師提一句。回傳 true＝正在說話 */
function proHint(k, done) {
  if (!S.story.tips || S.story['h_' + k] || PRO.on || G.scene !== 'hide' || G.state !== 'play') return false;
  talkPlay('hint_' + k, done);
  return true;
}
function proHl(sel) {
  PRO.hl = sel;
  for (const e of document.querySelectorAll('.pro-hl')) e.classList.remove('pro-hl');
  if (sel) for (const e of document.querySelectorAll(sel)) e.classList.add('pro-hl');
}
function proBar() {
  const s = PRO_STEPS[PRO.i],
    b = $('prot');
  PRO.txt = s.t();
  $('pro').hidden = false;
  /* 規格是 8 步：走出地層與見撿骨師都算第 7 步（第 7、8 筆） */
  $('pron').textContent = (PRO.i < 7 ? PRO.i + 1 : PRO.i) + '／8';
  if (b.textContent !== PRO.txt) {
    b.textContent = PRO.txt;
    b.classList.remove('in');
    void b.offsetWidth;
    b.classList.add('in');
  }
  proHl(s.hl ? s.hl() : '');
}
function proInit() {
  $('pro').addEventListener('click', e => {
    const b = e.target.closest('[data-pro=skip]');
    if (b && confirm2(b, '再按一次跳過')) proSkip();
  });
}
function proPiles() {
  for (const [gx, gy] of PRO_PILES) {
    const c = proXY([gx, gy]);
    for (let i = 0; i < 9; i++) {
      const v = h(gx * 2, gy * 2 + i, 9),
        x = c.x + (v % 90) - 45,
        y = c.y + ((v >>> 8) % 44) - 22;
      CX.fillStyle = i % 3 ? '#2a1f1c' : '#3a2a24';
      CX.beginPath();
      CX.ellipse(x, y, 20, 9, ((v >>> 16) % 6) / 6, 0, TAU);
      CX.fill();
      CX.fillStyle = '#b9b29a';
      CX.fillRect(x - 9, y - 4, 16, 2);
      CX.fillRect(x + 5, y - 7, 6, 5);
    }
  }
}
/* 地上的東西：屍堆；指引是目標腳下一圈，離得遠時玩家腳邊一個箭頭指過去 */
function proDraw() {
  const s = PRO_STEPS[PRO.i],
    a = s.aim && s.aim();
  if (G.scene === 'map') proPiles();
  if (!a || G.state === 'talk') return;
  const f = 0.5 + 0.5 * Math.sin(G.t * 4);
  CX.strokeStyle = `rgba(233,234,237,${0.45 + 0.4 * f})`;
  CX.lineWidth = 2;
  CX.beginPath();
  CX.ellipse(a.x, a.y, 40 + f * 8, 18 + f * 4, 0, 0, TAU);
  CX.stroke();
  if (dist(P, a) < 150) return;
  const q = Math.atan2(a.y - P.y, a.x - P.x),
    r = 64 + f * 8;
  CX.save();
  CX.translate(P.x + Math.cos(q) * r, P.y - 10 + Math.sin(q) * r * 0.7);
  CX.rotate(q);
  CX.fillStyle = 'rgba(233,234,237,0.85)';
  CX.beginPath();
  CX.moveTo(12, 0);
  CX.lineTo(-7, -9);
  CX.lineTo(-2, 0);
  CX.lineTo(-7, 9);
  CX.closePath();
  CX.fill();
  CX.restore();
}
