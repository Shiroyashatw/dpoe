/* 技能面板桌機 1280×720 實測（S/skills-panel.md v1.0.1；js/skpanel12.js）：
   G 開關、右欄 476×486、列 452×92 與列內各欄位置、孔 40／間距 6、更換圖示 24×24 與「更換技能」、懸停浮窗（0 秒、高 368、按住 Alt 詳細）、
   輔助浮窗、解鎖 II（雙條件、長按 600 毫秒）、名冊抽屜 476（點選後按主鈕、拖放）、中間戰場 296、卸下 3 秒復原、孔說明卡、
   名詞提示 0.4 秒、換序（拖、鍵盤）、鍵盤／手把／只用滑鼠、文案與禁用詞、超出為 0；再開 390×844 確認直立技能頁照舊。
   用法：先開本機伺服器，node tools/skill_check.js [網址 http://localhost:8003/] [截圖資料夾]；有 ❌ 結束碼 1。
   截圖檔名＝示意圖檔名去掉 -color；boxes.json 給 tools/skill_overlay.py 疊圖 */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const URL = process.argv[2] || 'http://localhost:8003/',
  OUT = process.argv[3] || '';
if (OUT) fs.mkdirSync(OUT, { recursive: true });
let bad = 0;
const ok = (n, c, info = '') => {
  console.log((c ? '✅ ' : '❌ ') + n + (c ? '' : ' ' + info));
  if (!c) bad++;
};
const near = (a, b, t = 1) => Math.abs(a - b) <= t;
const is = (b, x, y, w, h) => !!b && near(b[0], x) && near(b[1], y) && near(b[2], w) && near(b[3], h);
const J = JSON.stringify;
/* 跟示意圖接近的一套：十字弓、四招（穿甲彈 12／爆裂榴彈 10／油榴彈 8／弩砲塔圖騰 6）、長老屋 Lv8（每招 3 孔）、鍛造台 Lv20、靈魂 3,209；
   穿甲彈孔 1 多重投射（II 鎖著）、爆裂榴彈孔 1 附加火焰 II、油榴彈孔 1 範圍擴大＋孔 2 集中效應（同分類，沒有效果） */
const setup = () => {
  proSkip();
  S.story.tips = 0;
  S.lv = 52;
  S.camp.altar = 8;
  S.camp.forge = 20;
  S.camp.wts = Object.keys(WTN);
  const xb = BASES.filter(b => b.k === 'weapon' && b.wt === 'xbow' && b.lv <= 52);
  S.eq.weapon = xb
    .map(b => mkItem(b.id, 20, 2))
    .filter(it => !eqLack(S, it, 'weapon').length)
    .pop();
  S.eq.off = null;
  /* 能力值夠用四招：項鍊一條全能力 +60 */
  S.eq.amulet = mkItem(BASES.find(b => b.k === 'amulet').id, 20, 2);
  S.eq.amulet.a = [{ k: 'attrA', v: 60, T: 1 }];
  S.lib.sk = Object.assign(S.lib.sk || {}, { apshot: 12, grenade: 10, oilgrenade: 8, ballista: 6 });
  S.lib.sup2 = { fireadd: 1 };
  S.skills = [
    { k: 'apshot', so: ['multi', null, null], n: 3 },
    { k: 'grenade', so: ['fireadd2', null, null], n: 3 },
    { k: 'oilgrenade', so: ['area', 'focus', null], n: 3 },
    { k: 'ballista', so: [null, null, null], n: 3 },
    { k: null, so: [null, null], n: 2 }
  ];
  S.auras = [null];
  MAT().soul = 3209;
  S.gold = 12480;
  changed();
};
/* 疊圖用：[圖例, 選擇器, 規格 x,y,w,h]（S/skills-panel.md「元件位置、尺寸」；座標＝1280×720 畫面 px） */
const ROWS = [0, 1, 2, 3].map(i => [`技能列 ${i + 1}`, `#pskill [data-s="row:${i}"]`, [800, 144 + 100 * i, 452, 92]]),
  HOLES = i =>
    [0, 1, 2, 3, 4].map(j => [
      `列 ${i + 1} 孔 ${j + 1}`,
      `#pskill [data-s="hole:${i}:${j}"]`,
      [1020 + 46 * j, 194 + 100 * i, 40, 40]
    ]),
  HEAD = [
    ['右欄', '#pskill', [788, 76, 476, 486]],
    ['標題＋設施句', '#pskill .s-hd', [796, 80, 340, 44]],
    ['名冊鈕', '#pskill .s-ros', [1148, 86, 64, 28]],
    ['關閉 ×', '#pskill > .s-x', [1224, 78, 36, 36]]
  ],
  ROW0 = [
    ['換序把手', '#pskill [data-s="grip:0"]', [806, 144, 20, 92]],
    ['技能圖', '#pskill [data-s="row:0"] > .ic', [888, 150, 32, 32]],
    ['技能名', '#pskill [data-s="row:0"] .s-n', [924, 150, 96, 24]],
    ['更換圖示熱區', '#pskill [data-s="sw:0"]', [1022, 148, 24, 24]],
    ['等級', '#pskill [data-s="row:0"] .s-lv', [1050, 152, 56, 20]],
    ['DPS', '#pskill [data-s="row:0"] .s-d', [1110, 150, 110, 24]]
  ],
  FLOAT = [['懸停浮窗', '#pskill .s-f', [788, 76, 476, 368]], ROWS[3], ...HOLES(3)],
  ROS = [
    ['名冊抽屜', '#pros', [16, 76, 476, 486]],
    ['名冊分頁 技能', '#pros [data-s="tab:skills"]', [100, 86, 72, 28]],
    ['名冊分頁 輔助', '#pros [data-s="tab:sups"]', [176, 86, 72, 28]],
    ['右欄', '#pskill', [788, 76, 476, 486]]
  ],
  SK_BOX = {
    '01-overview': [...HEAD, ...ROWS, ...ROW0, ...HOLES(0), ...HOLES(1)],
    '03-skill-hover': FLOAT,
    '04-skill-hover-detail': FLOAT,
    '05-support-hover': FLOAT,
    '07-insert-pick': [...ROS, ['主鈕（高約 44）', '#pros .p-m .s-b', [28, 508, 448, 44]], ...ROWS],
    '08-remove': [...HEAD, ...ROWS.slice(0, 3), ['復原列（示意 H38，3 列情境）', '#sku', [800, 460, 452, 40]]],
    '09-socket-empty': [...HEAD, ...ROWS, ...HOLES(1)],
    '10-socket-locked': [...HEAD, ...ROWS, ...HOLES(0)],
    '11-socket-incompat': [...HEAD, ...ROWS, ...HOLES(2)],
    '12-skill-empty': HEAD,
    '13-skill-pick': [
      ...ROS,
      ['主鈕（高約 44）', '#pros .p-m .s-b', [28, 508, 448, 44]],
      ['空技能格', '#pskill [data-s="slot:0"]', [800, 144, 452, 92]],
      ...ROWS.slice(1)
    ],
    '14-noun-tip': HEAD,
    '15-unlock-ii': FLOAT,
    '16-reorder': [
      ...HEAD,
      ROWS[0],
      ROWS[3],
      ['插入線（示意 P22）', '#pskill > .s-ins', [800, 242, 452, 2]],
      ['提起列 油榴彈（示意 P23）', '#pskill .s-r.lift', [812, 248, 452, 92]],
      ['讓位的第 2 列 爆裂榴彈（示意 P31）', '#pskill [data-s="row:1"]', [800, 360, 452, 92]]
    ],
    '17-roster-skills': [...ROS, ['名冊格 1', '#pros .p-c', [28, 192, 80, 80]], ...ROWS.slice(0, 3)],
    '18-roster-supports': [...ROS, ['名冊格 1', '#pros .p-c', [28, 192, 80, 80]], ...ROWS, ...HOLES(1)]
  };
/* 頁內：面板的狀態（一趟拿完） */
const ST = () => {
  const P = $('pskill'),
    R = $('pros'),
    f = P.querySelector('.s-f'),
    bx = e => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return [r.x, r.y, r.width, r.height].map(Math.round);
    },
    vis = id => !!$(id) && !$(id).hidden;
  return {
    on: PANEL.skill && !P.hidden,
    s12: P.classList.contains('s12'),
    box: bx(P),
    f: f && {
      box: bx(f),
      cls: f.className,
      pe: getComputedStyle(f).pointerEvents,
      t: f.textContent,
      n: f.querySelectorAll('section').length
    },
    ros: R && !R.hidden ? { box: bx(R), t: R.textContent, tab: SK.ros.tab, mode: SK.ros.mode } : null,
    skt: vis('skt') ? { t: $('skt').textContent, box: bx($('skt')) } : null,
    skc: vis('skc') ? { t: $('skc').textContent, box: bx($('skc')) } : null,
    skn: vis('skn') ? { t: $('skn').textContent, box: bx($('skn')) } : null,
    hint: vis('skh') ? $('skh').textContent : null,
    hintOver: vis('skh') ? $('skh').scrollWidth - $('skh').clientWidth : 0,
    paused: worldPaused(),
    sk: S.skills.map(r => [r.k, ...r.so]),
    foc: (document.activeElement.dataset && document.activeElement.dataset.s) || '',
    soul: MAT().soul
  };
};
/* 頁內：q 的框；字級／粗細 */
const BX = q => {
  const e = document.querySelector(q);
  if (!e) return null;
  const r = e.getBoundingClientRect(),
    s = getComputedStyle(e);
  return {
    b: [r.x, r.y, r.width, r.height].map(Math.round),
    fs: s.fontSize,
    fw: s.fontWeight,
    t: e.textContent.trim(),
    c: s.color,
    bg: s.backgroundColor,
    bd: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`,
    op: s.opacity
  };
};
/* 頁內：token 算出來的色 */
const TOK = L => {
  const t = document.querySelector('#pskill').appendChild(document.createElement('i')),
    o = {};
  for (const k of L) (t.style.color = `var(--${k})`), (o[k] = getComputedStyle(t).color);
  t.remove();
  return o;
};
/* 頁內：超出與字級。over＝右欄／名冊裡看得到的元素超出自己那一欄的；cut＝字被切（scrollWidth > clientWidth）；small＝小於 14 px 的字（II 角標、✕ 10、關閉鍵帽 8、佔位 12 除外） */
const OVER = () => {
  const res = { over: [], cut: [], small: [], doc: document.documentElement.scrollWidth - innerWidth };
  for (const id of ['pskill', 'pros', 'skt', 'skc', 'skn', 'skh', 'sku']) {
    const P = $(id);
    if (!P || P.hidden) continue;
    const pr = P.getBoundingClientRect();
    if (pr.right > innerWidth + 0.5 || pr.bottom > innerHeight + 0.5 || pr.left < -0.5 || pr.top < -0.5)
      res.over.push(id);
    for (const e of [P, ...P.querySelectorAll('*')]) {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      /* 在捲動區裡的（列、名冊清單）看捲動區：捲出去的不算超出 */
      const sc = e.closest('[data-sb]'),
        inSc = sc && sc !== e;
      if (
        !inSc &&
        e !== P &&
        (r.left < pr.left - 0.5 || r.right > pr.right + 0.5 || r.top < pr.top - 0.5 || r.bottom > pr.bottom + 0.5)
      )
        res.over.push(`${id} ${e.className || e.tagName}`);
      if (inSc && (r.left < pr.left - 0.5 || r.right > pr.right + 0.5))
        res.over.push(`${id} ${e.className || e.tagName}（橫向）`);
      const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const s = getComputedStyle(e);
      if (e.scrollWidth > e.clientWidth + 1 && s.overflow !== 'visible' && s.textOverflow !== 'ellipsis')
        res.cut.push(`${id} ${e.className}：${e.textContent.trim().slice(0, 12)}`);
      if (parseFloat(s.fontSize) < 14 && !e.matches('.ii, .xx, .s-x kbd, .ph'))
        res.small.push(`${id} ${e.className || e.tagName} ${s.fontSize}：${e.textContent.trim().slice(0, 8)}`);
    }
  }
  return res;
};
/* 頁內（F-6）：點選清單看得到的每一列都完整（不被捲動區或主鈕切半）、清單底 ≤ 主鈕上緣；捲到底最後一列完整；捲回原位 */
const F6 = async () => {
  const L = document.querySelector('#pros .p-l'),
    m = document.querySelector('#pros .p-m .s-b').getBoundingClientRect(),
    y0 = L.scrollTop,
    look = () => {
      const a = L.getBoundingClientRect(),
        R = [...L.children].map(e => e.getBoundingClientRect()),
        vis = R.filter(r => r.bottom > a.top + 0.5 && r.top < a.bottom - 0.5);
      return {
        lb: Math.round(a.bottom),
        cut: vis.filter(r => r.bottom > a.bottom + 0.5 || r.bottom > m.top + 0.5).length,
        last:
          R.length && R[R.length - 1].bottom <= Math.min(a.bottom, m.top) + 0.5 && R[R.length - 1].top >= a.top - 0.5,
        n: vis.length
      };
    },
    rest = look();
  L.scrollTop = L.scrollHeight;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const end = look();
  L.scrollTop = y0;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { rest, end, m: [m.x, m.y, m.width, m.height].map(Math.round), after: look() };
};
/* 畫面不出現的詞（skills-panel「工程師實作範圍」＋名詞表） */
const BAN = /祭壇|法力|MP\b|寶石|彈夾|\bms\b|收藏|火II|加速|點此放一招|DPS\/秒|DPS／秒/;
const TXT = () =>
  ['pskill', 'pros', 'skt', 'skc', 'skn', 'skh', 'sku']
    .map(id => ($(id) && !$(id).hidden ? $(id).textContent : ''))
    .join('\n');

(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const open = async (ctxOpt, init) => {
    const ctx = await b.newContext(ctxOpt);
    await ctx.route(/supabase/, r => r.abort());
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage(),
      errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL + '?' + Date.now());
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(1500);
    await p.evaluate(setup);
    await p.evaluate(() => runNode(TRUNK_K[0]));
    await p.waitForTimeout(2000);
    return [p, errs];
  };
  const [p, errs] = await open({ viewport: { width: 1280, height: 720 } });
  const st = () => p.evaluate(ST),
    bx = q => p.evaluate(BX, q),
    ctr = async q => {
      const o = await bx(q);
      return [o.b[0] + o.b[2] / 2, o.b[1] + o.b[3] / 2];
    },
    hover = async (q, ms = 120) => (await p.mouse.move(...(await ctr(q))), await p.waitForTimeout(ms)),
    click = async (q, ms = 250) => (await p.mouse.click(...(await ctr(q))), await p.waitForTimeout(ms)),
    away = async () => (await p.mouse.move(300, 300), await p.waitForTimeout(120)),
    redo = async fn => (
      await p.evaluate(fn), await p.evaluate(() => (changed(), hudPanels())), await p.waitForTimeout(150)
    );
  const BOX = {},
    over = {},
    hints = {};
  /* 截圖＋量框＋超出、禁用詞、提示列（每個畫面狀態都量） */
  const shot = async n => {
    const o = await p.evaluate(OVER),
      t = await p.evaluate(TXT),
      s = await st();
    over[n] = o;
    hints[n] = s.hint;
    ok(
      `${n}：超出 0（欄內元素不超出、字不被切、文件不橫向捲、提示列放得下）、沒有小於 14 px 的字、沒有禁用詞`,
      !o.over.length && !o.cut.length && !o.small.length && o.doc <= 0 && s.hintOver <= 0 && !BAN.test(t) && !!s.hint,
      J({ ...o, hintOver: s.hintOver, ban: (t.match(BAN) || [])[0], hint: s.hint })
    );
    if (!OUT) return;
    await p.screenshot({ path: path.join(OUT, n + '.png') });
    BOX[n] = await p.evaluate(
      L =>
        L.map(([id, q, sp]) => {
          const e = document.querySelector(q);
          if (!e) return [id, q, sp, null];
          const r = e.getBoundingClientRect();
          return [id, q, sp, [r.x, r.y, r.width, r.height].map(Math.round)];
        }),
      SK_BOX[n]
    );
  };

  /* ---------- G 開關、右欄、標題 ---------- */
  await p.keyboard.press('g');
  await p.waitForTimeout(300);
  let s = await st();
  ok('G 開技能分頁：#pskill.s12 在右欄 788,76 476×486', s.on && s.s12 && is(s.box, 788, 76, 476, 486), J(s.box));
  ok('自動模式開技能分頁不暫停刷圖（worldPaused 為 false）', s.paused === false);
  const t0 = await p.evaluate(() => G.t);
  await p.waitForTimeout(400);
  ok('開著分頁世界時間照走', (await p.evaluate(() => G.t)) > t0);
  const hd = await bx('#pskill .s-hd'),
    hb = await bx('#pskill .s-hd b'),
    hs = await bx('#pskill .s-hd small');
  ok(
    '標題「技能」16/700＋「長老屋 Lv8・每招 3 孔」16/400，框 796,80 340×44',
    is(hd.b, 796, 80, 340, 44) &&
      hb.t === '技能' &&
      hb.fs === '16px' &&
      hb.fw === '700' &&
      hd.t.includes('長老屋 Lv8・每招 3 孔') &&
      hd.fs === '16px' &&
      hd.fw === '400',
    J([hd, hb])
  );
  ok(
    '自動模式副標「出招順序・由上往下放」14/400，起點 796,108',
    hs.t === '出招順序・由上往下放' &&
      hs.fs === '14px' &&
      hs.fw === '400' &&
      near(hs.b[0], 796) &&
      near(hs.b[1], 108, 2),
    J(hs)
  );
  const rb = await bx('#pskill .s-ros'),
    xb = await bx('#pskill > .s-x');
  ok(
    '「名冊」鈕 1148,86 64×28、14/700',
    is(rb.b, 1148, 86, 64, 28) && rb.t === '名冊' && rb.fs === '14px' && rb.fw === '700',
    J(rb)
  );
  ok('關閉 × 1224,78 36×36（鍵帽 G）', is(xb.b, 1224, 78, 36, 36) && xb.t === 'G', J(xb));
  ok('沒有頂部總 DPS 條', !(await p.evaluate(() => /預設 DPS|最強的那一招/.test($('pskill').textContent))));
  /* ---------- 列 ---------- */
  const rows = [];
  for (let i = 0; i < 4; i++) rows.push((await bx(`#pskill [data-s="row:${i}"]`)).b);
  ok(
    '技能列 ×4：800, 144／244／344／444，各 452×92（列距 8，末列底 536）',
    rows.every((r, i) => is(r, 800, 144 + 100 * i, 452, 92)),
    J(rows)
  );
  const tk = await p.evaluate(TOK, [
    'panel',
    'panel-inset',
    'panel-raised',
    'panel-raised-2',
    'sel-bg',
    'sel-edge',
    'tx',
    'tx-strong',
    'tx-dim',
    'tx-off',
    'bad',
    'border',
    'btn2',
    'act',
    'act-edge',
    'on-act'
  ]);
  const r0 = {
    row: await bx('#pskill [data-s="row:0"]'),
    grip: await bx('#pskill [data-s="grip:0"]'),
    kbd: await bx('#pskill [data-s="row:0"] > kbd'),
    ic: await bx('#pskill [data-s="row:0"] > .ic'),
    n: await bx('#pskill [data-s="row:0"] .s-n'),
    sw: await bx('#pskill [data-s="sw:0"]'),
    swi: await bx('#pskill [data-s="sw:0"] .ico'),
    lv: await bx('#pskill [data-s="row:0"] .s-lv'),
    d: await bx('#pskill [data-s="row:0"] .s-d'),
    a: await bx('#pskill [data-s="row:0"] .s-a')
  };
  ok('列底 --panel-inset', r0.row.bg === tk['panel-inset'], r0.row.bg);
  ok(
    '換序把手：列內 6,0、高 92，在最左',
    r0.grip.b[0] === 806 && r0.grip.b[1] === 144 && r0.grip.b[3] === 92,
    J(r0.grip.b)
  );
  ok(
    '鍵標「1 左鍵」：列內 28,8、14/700、--tx-strong',
    near(r0.kbd.b[0], 828) &&
      near(r0.kbd.b[1], 152) &&
      r0.kbd.t === '1 左鍵' &&
      r0.kbd.fs === '14px' &&
      r0.kbd.fw === '700' &&
      r0.kbd.c === tk['tx-strong'],
    J(r0.kbd)
  );
  ok('技能圖：列內 88,6、32×32', is(r0.ic.b, 888, 150, 32, 32), J(r0.ic.b));
  ok(
    '技能名：列內 124,6、欄寬 96、16/700、--tx-strong',
    near(r0.n.b[0], 924) &&
      near(r0.n.b[1], 150) &&
      r0.n.b[2] === 96 &&
      r0.n.t === '穿甲彈' &&
      r0.n.fs === '16px' &&
      r0.n.fw === '700' &&
      r0.n.c === tk['tx-strong'],
    J(r0.n)
  );
  ok(
    '更換圖示：熱區 24×24 在列內 222,4（名稱右側），圖 16',
    is(r0.sw.b, 1022, 148, 24, 24) && r0.swi.b[2] === 16 && r0.swi.b[3] === 16,
    J([r0.sw.b, r0.swi.b])
  );
  ok(
    '更換圖示熱區不跟名稱、孔重疊',
    r0.sw.b[0] >= r0.n.b[0] + r0.n.b[2] && r0.sw.b[1] + 24 <= 194,
    J([r0.n.b, r0.sw.b])
  );
  ok(
    '「等級 12」：列內 250,8、欄寬 56、14/400、--tx-dim',
    near(r0.lv.b[0], 1050) &&
      near(r0.lv.b[1], 152) &&
      r0.lv.b[2] === 56 &&
      r0.lv.t === '等級 12' &&
      r0.lv.fs === '14px' &&
      r0.lv.fw === '400' &&
      r0.lv.c === tk['tx-dim'],
    J(r0.lv)
  );
  ok(
    '「DPS n」：列內 310,6、欄寬 110、16/700、--tx-strong；不寫「DPS/秒」',
    near(r0.d.b[0], 1110) &&
      near(r0.d.b[1], 150) &&
      r0.d.b[2] === 110 &&
      /^DPS [\d,]+$/.test(r0.d.t) &&
      r0.d.fs === '16px' &&
      r0.d.fw === '700' &&
      r0.d.c === tk['tx-strong'],
    J(r0.d)
  );
  ok(
    '第 2 行屬性在名稱下：彈匣（穿甲彈）、儲存＋冷卻（爆裂榴彈）、冷卻（弩砲塔圖騰），14/400、--tx-dim',
    /^彈匣 \d+\/\d+$/.test(r0.a.t) &&
      r0.a.b[1] >= r0.n.b[1] + r0.n.b[3] &&
      r0.a.fs === '14px' &&
      r0.a.c === tk['tx-dim'] &&
      /^儲存 \d+\/\d+　冷卻 [\d.]+ 秒$/.test((await bx('#pskill [data-s="row:1"] .s-a')).t) &&
      /^冷卻 [\d.]+ 秒$/.test((await bx('#pskill [data-s="row:3"] .s-a')).t),
    J([r0.a, (await bx('#pskill [data-s="row:1"] .s-a')).t, (await bx('#pskill [data-s="row:3"] .s-a')).t])
  );
  /* ---------- 輔助孔 ---------- */
  const H = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) H.push(await bx(`#pskill [data-s="hole:${i}:${j}"]`));
  ok(
    '輔助孔：每列 5 孔、各 40×40、間距 6，列內 220,50 起（右緣留 8）',
    H.every((h, n) => is(h.b, 1020 + 46 * (n % 5), 194 + 100 * Math.floor(n / 5), 40, 40)) &&
      1020 + 46 * 4 + 40 + 8 === 800 + 452,
    J(H.map(h => h.b).slice(0, 6))
  );
  const cls = await p.evaluate(() =>
    [
      ...document.querySelectorAll(
        '#pskill [data-s="hole:0:0"], #pskill [data-s="hole:0:1"], #pskill [data-s="hole:0:3"], #pskill [data-s="hole:2:1"]'
      )
    ].map(e => [e.className, e.textContent.trim(), getComputedStyle(e).borderTopStyle])
  );
  ok(
    '空孔虛線「＋」；鎖孔畫鎖鏈、孔內不寫字',
    cls[1][0].includes(' e') &&
      cls[1][1] === '＋' &&
      cls[1][2] === 'dashed' &&
      cls[2][0].includes(' lk') &&
      cls[2][1] === '' &&
      !!(await bx('#pskill [data-s="hole:0:3"] svg')),
    J(cls)
  );
  const xi = await bx('#pskill [data-s="hole:2:1"] .ic');
  ok(
    '不相容的輔助：圖變淡（0.4）＋✕',
    cls[3][0].includes(' x') && cls[3][1] === '✕' && xi.op === '0.4',
    J([cls[3], xi.op])
  );
  const ii = await bx('#pskill [data-s="hole:1:0"] .ii'),
    h10 = await bx('#pskill [data-s="hole:1:0"]');
  ok(
    '已插的 II：孔上畫輔助圖示＋「II」角標（10/700、孔右下），不寫「火II」',
    !!ii &&
      ii.t === 'II' &&
      ii.fs === '10px' &&
      ii.fw === '700' &&
      ii.b[0] + ii.b[2] > h10.b[0] + 20 &&
      ii.b[1] + ii.b[3] > h10.b[1] + 20 &&
      h10.t === 'II',
    J([ii, h10.t])
  );
  /* ---------- 01：更換圖示懸停「更換技能」、孔懸停全名 ---------- */
  await hover('#pskill [data-s="hole:1:0"]', 30);
  s = await st();
  ok(
    '孔懸停（0 秒）：戰場側寫全名「附加火焰 II」（14 px、高 28，不蓋右欄）',
    !!s.skt &&
      s.skt.t === '附加火焰 II' &&
      s.skt.box[3] === 28 &&
      s.skt.box[0] + s.skt.box[2] <= 788 &&
      (await bx('#skt')).fs === '14px',
    J(s.skt)
  );
  await hover('#pskill [data-s="sw:0"]', 30);
  s = await st();
  const swh = await bx('#pskill [data-s="sw:0"]');
  ok(
    '更換圖示懸停（0 秒）：列左側戰場顯示「更換技能」14 px，位置 700,148、高 28',
    !!s.skt &&
      s.skt.t === '更換技能' &&
      near(s.skt.box[0], 700, 2) &&
      s.skt.box[1] === 148 &&
      s.skt.box[3] === 28 &&
      (await bx('#skt')).fs === '14px',
    J(s.skt)
  );
  ok(
    '更換圖示懸停：圖示有懸停底 --panel-raised；不出技能浮窗、不蓋名稱／等級／孔',
    swh.bg === tk['panel-raised'] && !s.f && s.skt.box[0] + s.skt.box[2] <= 788,
    J([swh.bg, s.f])
  );
  ok(
    '按鈕上不寫「更換技能」（只在懸停與提示列）',
    !(await p.evaluate(() =>
      [...document.querySelectorAll('#pskill button, #pros button')].some(e => e.textContent.includes('更換技能'))
    ))
  );
  await shot('01-overview');
  /* ---------- 03 技能懸停（簡易） ---------- */
  await hover('#pskill [data-s="row:1"] .s-n', 30);
  s = await st();
  ok(
    '技能列懸停 0 秒出簡易浮窗：788,76 476×368（下緣 444，停在第 4 列頂）',
    !!s.f && is(s.f.box, 788, 76, 476, 368) && s.f.box[1] + s.f.box[3] === 444,
    J(s.f && s.f.box)
  );
  ok(
    '簡易浮窗五層：身分、等級／DPS、資源、輔助孔（孔名全名「孔 1：附加火焰 II」）、操作',
    !!s.f &&
      s.f.n === 5 &&
      [
        '身分',
        '爆裂榴彈',
        '等級 10',
        'DPS ',
        '資源',
        '魔力 ',
        '儲存 2 顆，每顆各冷卻',
        '輔助孔',
        '孔 1：附加火焰 II',
        '輔助孔 3／5',
        '操作',
        '按住 Alt／Ｙ 看詳細'
      ].every(t => s.f.t.includes(t)) &&
      !s.f.cls.includes('det'),
    s.f && s.f.t
  );
  const fl = {
    b: await bx('#pskill .s-f section > b'),
    p: await bx('#pskill .s-f section > p'),
    f: await bx('#pskill .s-f')
  };
  ok(
    '浮窗字：主角 16/700、其餘 14/400，底 --panel',
    fl.b.fs === '16px' && fl.b.fw === '700' && fl.p.fs === '14px' && fl.p.fw === '400' && fl.f.bg === tk.panel,
    J(fl)
  );
  const und = await p.evaluate(() => {
    const at = q => {
      const r = document.querySelector(q).getBoundingClientRect(),
        e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!e && !!e.closest(q);
    };
    return [
      at('#pskill [data-s="hole:3:0"]'),
      at('#pskill [data-s="hole:3:2"]'),
      at('#pskill [data-s="sw:3"]'),
      at('#dnav')
    ];
  });
  ok('浮窗不蓋第 4 列的孔與更換圖示、不蓋 #dnav', und.every(Boolean), J(und));
  await shot('03-skill-hover');
  /* ---------- 04 按住 Alt 詳細 ---------- */
  await p.keyboard.down('Alt');
  await p.waitForTimeout(120);
  s = await st();
  ok(
    '按住 Alt：同一浮窗變詳細（加說明層），框不變、下緣仍 444',
    !!s.f &&
      s.f.cls.includes('det') &&
      is(s.f.box, 788, 76, 476, 368) &&
      s.f.t.includes('說明') &&
      s.f.t.includes('孔 2 空（點孔挑輔助）'),
    J(s.f)
  );
  const fb = await p.evaluate(() =>
    [...document.querySelectorAll('#pskill .s-f .op button')].map(e => [
      e.textContent,
      e.getBoundingClientRect().bottom,
      getComputedStyle(e).fontSize,
      getComputedStyle(e).fontWeight
    ])
  );
  ok(
    '詳細浮窗三顆鈕：卸下輔助、升級（n 靈魂／缺靈魂 n）、插上輔助，16/700，都在窗內',
    fb.length === 3 &&
      fb[0][0] === '卸下輔助' &&
      /^(升級 [\d,]+ 靈魂|缺靈魂 [\d,]+|滿級|.+)$/.test(fb[1][0]) &&
      fb[2][0] === '插上輔助' &&
      fb.every(x => x[1] <= 444 && x[2] === '16px' && x[3] === '700'),
    J(fb)
  );
  ok('按住 Alt 時浮窗接滑鼠（鈕按得到）', s.f.pe === 'auto', s.f.pe);
  const fF1 = await p.evaluate(() => {
    const f = document.querySelector('#pskill .s-f'),
      P = [...f.querySelectorAll('section > p')].find(e => e.textContent.includes('這顆讓 DPS 多')),
      fr = f.getBoundingClientRect(),
      s = P && getComputedStyle(P),
      lines = P ? [...P.getClientRects()] : [],
      r = P && P.getBoundingClientRect(),
      nav = $('dnav') && $('dnav').getBoundingClientRect(),
      h3 = [0, 1, 2, 3, 4].map(j => document.querySelector(`#pskill [data-s="hole:3:${j}"]`).getBoundingClientRect());
    return {
      t: P && P.textContent,
      sw: P && P.scrollWidth,
      cw: P && P.clientWidth,
      to: s && s.textOverflow,
      h: r && Math.round(r.height),
      lh: s && parseFloat(s.lineHeight),
      rIn: !!r && r.left >= fr.left && r.right <= fr.right && r.bottom <= fr.bottom,
      f: [fr.x, fr.y, fr.width, fr.height].map(Math.round),
      nav: !!nav && !(nav.bottom > fr.top && nav.top < fr.bottom && nav.right > fr.left && nav.left < fr.right),
      holes: h3.every(h => h.top >= fr.bottom),
      lines: lines.length
    };
  });
  ok(
    'F-1 04：輔助行「這顆讓 DPS 多 n」數字完整（沒有「…」、不用 ellipsis、scrollWidth ≤ clientWidth、放不下折行），整行在浮窗內；浮窗仍 788,76 476×368、下緣 444，不蓋第 4 列孔與 #dnav',
    !!fF1.t &&
      /這顆讓 DPS 多 [\d,]+$/.test(fF1.t) &&
      !fF1.t.includes('…') &&
      fF1.to !== 'ellipsis' &&
      fF1.sw <= fF1.cw &&
      fF1.rIn &&
      J(fF1.f) === J([788, 76, 476, 368]) &&
      fF1.holes &&
      fF1.nav,
    J(fF1)
  );
  await shot('04-skill-hover-detail');
  await p.keyboard.up('Alt');
  await p.waitForTimeout(120);
  s = await st();
  ok('放開 Alt 回簡易（不是開關）', !!s.f && !s.f.cls.includes('det') && s.f.pe === 'none', J(s.f && s.f.cls));
  /* ---------- 05 輔助懸停 ---------- */
  await hover('#pskill [data-s="hole:0:0"]', 30);
  s = await st();
  ok(
    '輔助懸停（0 秒）：身分、效果、位置、操作；多重投射 I（II 鎖）、插在：穿甲彈 孔 1、條件寫鍛造台 Lv20＋15,000 靈魂',
    !!s.f &&
      s.f.cls.includes('sup') &&
      is(s.f.box, 788, 76, 476, 368) &&
      [
        '多重投射',
        'I（現在）',
        'II（鎖）',
        '效果',
        '插在：穿甲彈 孔 1',
        '卸下輔助',
        '長按解鎖 II',
        '鍛造台 Lv20 ＋ 15,000 靈魂'
      ].every(t => s.f.t.includes(t)),
    s.f && s.f.t
  );
  ok('輔助浮窗不加「詳細」開關', !!s.f && !s.f.t.includes('看詳細'));
  await shot('05-support-hover');
  /* ---------- 15 解鎖 II：確認窗、雙條件、長按 600 毫秒 ---------- */
  await p.keyboard.down('Alt');
  await p.waitForTimeout(100);
  await click('#pskill [data-s^="f:ii:"]');
  await p.keyboard.up('Alt');
  await p.waitForTimeout(100);
  s = await st();
  const cd = await p.evaluate(() =>
    [...document.querySelectorAll('#pskill .s-f .cd')].map(e => [
      e.textContent,
      e.classList.contains('c-bad'),
      getComputedStyle(e).color
    ])
  );
  const ib = await p.evaluate(() =>
    [...document.querySelectorAll('#pskill .s-f .op button')].map(e => [
      e.textContent,
      e.disabled,
      Math.round(e.getBoundingClientRect().x)
    ])
  );
  ok(
    '解鎖 II 確認窗：「需要（兩個都要）」＝鍛造台 Lv20（已達成 ✓）＋15,000 靈魂（現有不足 ✗、--bad）',
    !!s.f &&
      s.f.cls.includes('ii') &&
      s.f.t.includes('多重投射 II') &&
      s.f.t.includes('需要（兩個都要）') &&
      cd.length === 2 &&
      cd[0][0] === '鍛造台 Lv20✓' &&
      !cd[0][1] &&
      /^15,000 靈魂（現有 [\d,]+）✗$/.test(cd[1][0]) &&
      cd[1][1] &&
      cd[1][2] === tk.bad,
    J([s.f && s.f.t, cd])
  );
  ok(
    '確認窗：長按「解鎖」（條件沒滿停用）、取消在右',
    ib.length === 2 && ib[0][0] === '長按解鎖' && ib[0][1] === true && ib[1][0] === '取消' && ib[1][2] > ib[0][2],
    J(ib)
  );
  await shot('15-unlock-ii');
  await p.evaluate(() => ((MAT().soul = 20000), hudPanels()));
  await p.waitForTimeout(100);
  const hold = async ms => {
    await p.mouse.move(...(await ctr('#pskill [data-s="f:iigo"]')));
    await p.mouse.down();
    await p.waitForTimeout(ms);
    await p.mouse.up();
    await p.waitForTimeout(150);
  };
  await hold(250);
  let u = await p.evaluate(() => [!!(S.lib.sup2 || {}).multi, MAT().soul, !!SK.ii]);
  ok('長按不到 600 毫秒就放開：不解鎖、不扣靈魂、確認窗還在', !u[0] && u[1] >= 20000 && u[2], J(u));
  /* 機器忙的時候計時器會晚：按久一點 */
  await hold(1200);
  u = await p.evaluate(() => [!!(S.lib.sup2 || {}).multi, MAT().soul, !!SK.ii, S.skills[0].so[0]]);
  ok(
    '長按滿 600 毫秒才執行：解鎖 II、扣 15,000 靈魂、插著的 I 換成 II',
    u[0] && u[1] >= 5000 && u[1] < 6000 && !u[2] && u[3] === 'multi2',
    J(u)
  );
  await redo(() => (delete S.lib.sup2.multi, (S.skills[0].so[0] = 'multi'), (MAT().soul = 3209)));
  await away();
  /* ---------- 09／10／11 孔說明卡 ---------- */
  await hover('#pskill [data-s="hole:1:1"]', 30);
  s = await st();
  const c9 = { c: await bx('#skc'), b: await bx('#skc b'), p: await bx('#skc p') };
  ok(
    '空孔懸停：說明卡在戰場側 x＝420、實底 --panel（不透明）、標題 16/700、正文 14/400；文案「點這裡插一顆輔助…同一類只能插一顆」',
    !!s.skc &&
      s.skc.box[0] === 420 &&
      s.skc.box[0] + s.skc.box[2] <= 788 &&
      c9.c.bg === tk.panel &&
      c9.b.t === '空著的輔助孔' &&
      c9.b.fs === '16px' &&
      c9.b.fw === '700' &&
      c9.p.fs === '14px' &&
      c9.p.fw === '400' &&
      c9.p.t.includes('點這裡插一顆輔助') &&
      c9.p.t.includes('同一類只能插一顆'),
    J([s.skc, c9])
  );
  await shot('09-socket-empty');
  await hover('#pskill [data-s="hole:0:3"]', 30);
  s = await st();
  ok(
    '鎖孔懸停：「還不能用的輔助孔」「這一孔要長老屋 Lv11 才生效。」',
    !!s.skc && s.skc.t === '還不能用的輔助孔這一孔要長老屋 Lv11 才生效。' && s.skc.box[0] === 420,
    J(s.skc)
  );
  await shot('10-socket-locked');
  await click('#pskill [data-s="hole:0:3"]');
  s = await st();
  ok('鎖孔不能插：點了不開名冊、孔沒變', !s.ros && s.sk[0].length === 4 && s.sk[0][3] == null, J([s.ros, s.sk[0]]));
  await hover('#pskill [data-s="hole:2:1"]', 30);
  s = await st();
  ok(
    '不相容懸停：「集中效應　沒有效果」「這招已經有同分類的輔助，沒有效果。」',
    !!s.skc && s.skc.t === '集中效應　沒有效果這招已經有同分類的輔助，沒有效果。',
    J(s.skc)
  );
  await shot('11-socket-incompat');
  /* ---------- 07 點孔挑輔助（名冊 list） ---------- */
  await click('#pskill [data-s="hole:1:1"]');
  s = await st();
  ok(
    '點空孔：左側名冊抽屜 16,76 476×486，停在輔助分頁',
    !!s.ros && is(s.ros.box, 16, 76, 476, 486) && s.ros.tab === 'sups' && s.ros.mode === 'list',
    J(s.ros && s.ros.box)
  );
  ok(
    '名冊開著：中間戰場 296（492–788），世界照刷',
    !!s.ros && s.box[0] - (s.ros.box[0] + s.ros.box[2]) === 296 && s.paused === false,
    J([s.box, s.paused])
  );
  const tb = [await bx('#pros [data-s="tab:skills"]'), await bx('#pros [data-s="tab:sups"]'), await bx('#pros .p-hd')];
  ok(
    '名冊分頁 技能／輔助：100,86 起各 72×28，14/400、選中 14/700；標題「名冊」16/700',
    is(tb[0].b, 100, 86, 72, 28) &&
      is(tb[1].b, 176, 86, 72, 28) &&
      tb[0].fs === '14px' &&
      tb[0].fw === '400' &&
      tb[1].fw === '700' &&
      tb[2].t === '名冊' &&
      tb[2].fs === '16px' &&
      tb[2].fw === '700',
    J(tb)
  );
  ok(
    '名冊副標「對準：爆裂榴彈・孔 2」＋「現在 DPS n」',
    /對準：爆裂榴彈・孔 2現在 DPS [\d,]+/.test(s.ros.t),
    s.ros.t.slice(0, 80)
  );
  const tg = await bx('#pskill [data-s="hole:1:1"]');
  ok('能插的孔加 2 px --sel-edge 框（對準的那一孔）', tg.bd === `2px solid ${tk['sel-edge']}`, tg.bd);
  await p.evaluate(() => ((SK.f.sups = '全部'), hudPanels()));
  await p.waitForTimeout(100);
  const rl = await p.evaluate(() =>
    [...document.querySelectorAll('#pros .p-r')].map(e => [e.dataset.s, e.textContent, e.classList.contains('dim')])
  );
  ok(
    '清單：差值只寫「▲ DPS +n（n%）」，最好的那顆標「最好」；同分類不可插的列標「✕ 已有同分類」',
    rl.filter(x => /最好$/.test(x[1])).length === 1 &&
      rl.some(x => /▲ DPS \+[\d,]+（\d+%）/.test(x[1])) &&
      !rl.some(x => /▼|每秒|DPS −/.test(x[1])) &&
      rl.some(x => x[2] && x[1].includes('✕ 已有同分類')),
    J(rl.slice(0, 6))
  );
  const bestK = rl.find(x => /最好$/.test(x[1]))[0];
  await click(`#pros [data-s="${bestK}"]`);
  const mb = await bx('#pros .p-m .s-b'),
    bn = await p.evaluate(k => SUPPORTS[k.slice(3)].n, bestK);
  ok(
    '選中列展開（說明＋I｜II）；主鈕「插上輔助：{名}」全寬、高 44、16/700、--act／--on-act',
    mb.t === `插上輔助：${bn}` &&
      is(mb.b, 28, 508, 448, 44) &&
      mb.fs === '16px' &&
      mb.fw === '700' &&
      mb.bg === tk.act &&
      mb.c === tk['on-act'] &&
      (await p.evaluate(() => !!document.querySelector('#pros .p-r.on small'))),
    J(mb)
  );
  const ch = await p.evaluate(() =>
    [...document.querySelectorAll('#pros .p-f .s-b')].map(e => [
      e.textContent,
      Math.round(e.getBoundingClientRect().width),
      Math.round(e.getBoundingClientRect().height)
    ])
  );
  ok(
    '篩選：推薦／元素／範圍／異常／全部，各 84×28',
    J(ch.map(c => c[0])) === J(['推薦', '元素', '範圍', '異常', '全部']) && ch.every(c => c[1] === 84 && c[2] === 28),
    J(ch)
  );
  /* 選一顆 II 還鎖著的 */
  await p.evaluate(
    () => (
      (SK.f.sups = '全部'),
      (SK.pick = [...document.querySelectorAll('#pros .p-r:not(.dim)')]
        .map(e => e.dataset.s.slice(3))
        .find(k => sup2Of(k) && sup2Lock(sup2Of(k)))),
      (SK.tier = 1),
      hudPanels()
    )
  );
  await p.waitForTimeout(120);
  ok(
    'I／II 切換：II 鎖著時寫條件「鎖・鍛造台 Lv20＋15,000 靈魂」',
    (await p.evaluate(() => (document.querySelector('#pros .p-r.on .p-t') || {}).textContent || '')).includes(
      '（鎖・鍛造台 Lv20＋15,000 靈魂）'
    ),
    await p.evaluate(() => (document.querySelector('#pros .p-r.on') || {}).textContent)
  );
  await p.evaluate(() => ((SK.f.sups = '推薦'), (SK.pick = 'crit'), hudPanels()));
  await p.waitForTimeout(120);
  const f6_07 = await p.evaluate(F6);
  ok(
    'F-6 07：名冊清單底 ≤ 主鈕上緣 508、看得到的列沒有被切半；捲到底最後一列（圖示＋名稱）完整；主鈕仍 28,508 448×44',
    f6_07.rest.n > 0 &&
      f6_07.rest.cut === 0 &&
      f6_07.rest.lb <= 508 &&
      f6_07.end.cut === 0 &&
      f6_07.end.last &&
      f6_07.after.cut === 0 &&
      J(f6_07.m) === J([28, 508, 448, 44]),
    J(f6_07)
  );
  await shot('07-insert-pick');
  await p.focus('#pros .p-r.on');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(250);
  s = await st();
  ok(
    'Enter 插上：輔助進孔、不花錢不確認、放好後名冊自動關',
    s.sk[1][2] === 'crit' && !s.ros && s.soul >= 3209,
    J([s.sk[1], s.ros, s.soul])
  );
  /* ---------- 08 卸下復原 ---------- */
  await hover('#pskill [data-s="hole:1:0"]', 60);
  await p.keyboard.press('Delete');
  await p.waitForTimeout(200);
  s = await st();
  /* F-2：4 列都在畫面時復原列搬到戰場 #sku（列下方會壓第 4 列的孔） */
  const UQ = ':is(#pskill .s-u, #sku:not([hidden]))',
    ub = { u: await bx(UQ), b: await bx(UQ + ' .s-b') };
  ok(
    'Del 卸下（不用確認）：孔空了，出「已卸下 附加火焰 II　復原」',
    s.sk[1][1] == null && !!ub.u && ub.u.t === '已卸下 附加火焰 II復原' && ub.b.t === '復原' && s.soul >= 3209,
    J([s.sk[1], ub])
  );
  await away();
  const fF2 = await p.evaluate(() => {
    const R = e => e && e.getBoundingClientRect(),
      u = R(document.querySelector(':is(#pskill .s-u, #sku:not([hidden]))')),
      ub = document.querySelector(':is(#pskill .s-u, #sku:not([hidden])) .s-b'),
      L = R(document.querySelector('#pskill .s-l')),
      H = [0, 1, 2, 3, 4].map(j => R(document.querySelector(`#pskill [data-s="hole:3:${j}"]`))),
      X = (a, b) =>
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
        Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)),
      top = (x, y) => document.elementFromPoint(x, y),
      band = { left: 788, right: 1264, top: 494, bottom: 534 },
      ubr = R(ub);
    return {
      u: u && [u.x, u.y, u.width, u.height].map(Math.round),
      inSku: !$('sku').hidden,
      holeArea: H.reduce((n, h) => n + X(u, h), 0),
      bandArea: X(u, band),
      hintArea: X(u, R($('skh'))),
      holesFull: H.every(h => h && h.top >= L.top && h.bottom <= L.bottom),
      holesTop: H.every(h => (e => e && e.closest(`[data-s^="hole:3:"]`))(top(h.x + h.width / 2, h.y + h.height / 2))),
      ubTop: !!ubr && top(ubr.x + ubr.width / 2, ubr.y + ubr.height / 2) === ub,
      uIn: u.left >= 0 && u.right <= innerWidth && u.bottom <= innerHeight
    };
  });
  ok(
    'F-2 08：4 列在畫面時復原列搬到戰場（#sku），跟第 4 列 5 個孔、孔帶 494–534、提示列相交面積都是 0；5 個孔完整、點得到；「復原」點得到',
    fF2.inSku &&
      fF2.holeArea === 0 &&
      fF2.bandArea === 0 &&
      fF2.hintArea === 0 &&
      fF2.holesFull &&
      fF2.holesTop &&
      fF2.ubTop &&
      fF2.uIn,
    J(fF2)
  );
  await shot('08-remove');
  await click(UQ + ' .s-b');
  s = await st();
  ok('3 秒內按「復原」：輔助回到原孔', s.sk[1][1] === 'fireadd2' && !(await bx(UQ)), J(s.sk[1]));
  await hover('#pskill [data-s="hole:1:1"]', 60);
  await p.keyboard.press('x');
  await p.waitForTimeout(3300);
  s = await st();
  ok('X 也能卸下；過了 3 秒復原列消失、不能復原', s.sk[1][2] == null && !(await bx(UQ)), J(s.sk[1]));
  await away();
  /* ---------- 16 換序 ---------- */
  const g2 = await ctr('#pskill [data-s="grip:2"]');
  await p.mouse.move(...g2);
  await p.mouse.down();
  await p.mouse.move(g2[0], g2[1] - 40, { steps: 4 });
  await p.mouse.move(g2[0], g2[1] - 96, { steps: 4 });
  await p.waitForTimeout(100);
  const lf = await bx('#pskill .s-r.lift');
  ok(
    '拖把手：提起的列用選中色（--sel-bg、2 px --sel-edge），隨游標',
    !!lf && lf.bg === tk['sel-bg'] && near(lf.b[1], 344 - 96, 2) && lf.t.includes('油榴彈'),
    J(lf)
  );
  ok('提起時更換圖示仍在名稱右側', is((await bx('#pskill .s-r.lift .s-sw')).b, 1022, lf ? lf.b[1] + 4 : 0, 24, 24));
  await p.waitForTimeout(250);
  const f3 = await p.evaluate(() => {
    const R = q => document.querySelector(q).getBoundingClientRect(),
      L = R('#pskill .s-l'),
      lift = R('#pskill .s-r.lift'),
      rows = [0, 1, 3].map(i => R(`#pskill [data-s="row:${i}"]`)),
      ln = document.querySelector('#pskill > .s-ins'),
      lr = ln && ln.getBoundingClientRect(),
      X = (a, b) => Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)),
      /* 第 2 列名稱、孔是不是最上面那一層（沒被提起的列蓋住） */
      top = q =>
        (r => document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))(R(q)).closest('[data-s^="row:"]'),
      r1 = document.querySelector('#pskill [data-s="row:1"]');
    return {
      r1: [rows[1].x, rows[1].y, rows[1].width, rows[1].height].map(Math.round),
      r1In: rows[1].top >= L.top && rows[1].bottom <= L.bottom,
      r1Over: X(rows[1], lift),
      r1Top: top('#pskill [data-s="row:1"] .s-n') === r1 && top('#pskill [data-s="hole:1:0"]') === r1,
      ln: lr && [lr.x, lr.y, lr.width, lr.height].map(Math.round),
      gap: lr && rows[0].bottom <= lr.top && lr.bottom <= rows[1].top,
      r3: Math.round(rows[2].top)
    };
  });
  ok(
    'F-3 16：提起第 3 列、拉過第 2 列：第 2 列「爆裂榴彈」讓到插入點下方（344），完整可見、名稱與孔沒被蓋（相交 0）；插入線 452×2 在第 1 列與讓位列之間；第 4 列不動',
    f3.r1In &&
      f3.r1Over === 0 &&
      f3.r1Top &&
      near(f3.r1[1], 344, 1) &&
      !!f3.ln &&
      f3.ln[2] === 452 &&
      f3.ln[3] === 2 &&
      f3.gap &&
      near(f3.r3, 444, 1),
    J(f3)
  );
  await shot('16-reorder');
  /* 放開的位置過了上一列的中線才換 */
  await p.mouse.move(g2[0], g2[1] - 112, { steps: 2 });
  await p.mouse.up();
  await p.waitForTimeout(250);
  s = await st();
  ok(
    '放開：油榴彈換到第 2 格（技能、孔、輔助一起走）',
    s.sk[1][0] === 'oilgrenade' && s.sk[1][1] === 'area' && s.sk[2][0] === 'grenade' && s.sk[2][1] === 'fireadd2',
    J(s.sk)
  );
  const n1 = await ctr('#pskill [data-s="row:1"] .s-n');
  await p.mouse.move(...n1);
  await p.mouse.down();
  await p.mouse.move(n1[0], n1[1] + 112, { steps: 6 });
  await p.mouse.up();
  await p.waitForTimeout(250);
  s = await st();
  ok(
    '整列可拖：拖列身也能換序（換回來）',
    s.sk[1][0] === 'grenade' && s.sk[2][0] === 'oilgrenade',
    J(s.sk.map(x => x[0]))
  );
  await away();
  await p.focus('#pskill [data-s="grip:1"]');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(120);
  ok(
    '鍵盤：把手上按 Enter 選中（列用選中色）',
    (await bx('#pskill [data-s="row:1"]')).bg === tk['sel-bg'] && (await p.evaluate(() => SK.sel)) === 1
  );
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(150);
  s = await st();
  ok(
    '選中後 ↓：整列下移一格，焦點跟著',
    s.sk[2][0] === 'grenade' && s.foc === 'grip:2',
    J([s.sk.map(x => x[0]), s.foc])
  );
  await p.keyboard.press('ArrowUp');
  await p.waitForTimeout(150);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(120);
  s = await st();
  ok(
    '選中後 ↑ 移回去、Enter 放下',
    s.sk[1][0] === 'grenade' && (await p.evaluate(() => SK.sel)) == null,
    J(s.sk.map(x => x[0]))
  );
  /* ---------- 只用滑鼠：點技能列＝浮窗留著、可以按 ---------- */
  await redo(() => (MAT().soul = 3209 + 5000));
  await click('#pskill [data-s="row:3"] .s-d');
  s = await st();
  ok(
    '只用滑鼠：點技能列，詳細浮窗留著、接滑鼠',
    !!s.f && s.f.cls.includes('det') && s.f.pe === 'auto',
    J(s.f && s.f.cls)
  );
  const lv0 = await p.evaluate(() => libLv('ballista'));
  await click('#pskill [data-s^="f:up:"]');
  ok(
    '只用滑鼠：浮窗的「升級 n 靈魂」升一級、扣靈魂',
    (await p.evaluate(() => libLv('ballista'))) === lv0 + 1 && (await p.evaluate(() => MAT().soul)) < 8209 + 200 - 201
  );
  await click('#pskill [data-s^="f:ins:"]');
  s = await st();
  ok(
    '只用滑鼠：浮窗的「插上輔助」開名冊輔助分頁（對準第一個空孔）',
    !!s.ros && s.ros.tab === 'sups' && /對準：弩砲塔圖騰・孔 1/.test(s.ros.t),
    s.ros && s.ros.t.slice(0, 40)
  );
  await click('#pros [data-s="rosx"]');
  s = await st();
  ok('名冊的 × 關名冊（技能分頁還開著）', !s.ros && s.on);
  await click('#pskill [data-s="row:3"] .s-d');
  await p.mouse.click(300, 300);
  await p.waitForTimeout(150);
  s = await st();
  ok('點別處：放開浮窗', !s.f, J(s.f));
  await redo(() => ((S.lib.sk.ballista = 6), (MAT().soul = 3209)));
  /* ---------- 17 名冊技能拖放 ---------- */
  await redo(() => (S.skills[3].k = null));
  const e4 = await bx('#pskill [data-s="slot:3"]');
  ok(
    '空技能格寫「點這裡挑一招」（452×92、16/400）',
    !!e4 &&
      e4.t === '4 E點這裡挑一招' &&
      is(e4.b, 800, 444, 452, 92) &&
      (await bx('#pskill [data-s="slot:3"] span')).fs === '16px',
    J(e4)
  );
  await click('#pskill .s-ros');
  s = await st();
  const cells = await p.evaluate(() =>
    [...document.querySelectorAll('#pros .p-c')].map(e => [
      e.dataset.s,
      ...['x', 'y', 'width', 'height'].map(k => Math.round(e.getBoundingClientRect()[k])),
      getComputedStyle(e.querySelector('span:last-child')).fontSize
    ])
  );
  const nSk = await p.evaluate(
    () => Object.keys(SKILLS).filter(k => !SKILLS[k].wt || SKILLS[k].wt.includes('xbow')).length
  );
  ok(
    '「名冊」鈕：開名冊技能分頁（拖放），格 80×80、名 14 px、第一格 28,192、間距 8',
    !!s.ros &&
      s.ros.tab === 'skills' &&
      s.ros.mode === 'grid' &&
      cells.length > 10 &&
      cells.slice(0, 5).every((c, i) => is(c.slice(1, 5), 28 + 88 * i, 192, 80, 80) && c[5] === '14px'),
    J(cells.slice(0, 6))
  );
  ok(
    `名冊副標：{武器}能用 n 招＝靜態目錄（無武器限制＋這把武器專用，全開時 ${nSk}）`,
    nSk === 46 && s.ros.t.includes(`能用 ${nSk} 招`) /* SU-03：7 個印記改不限武器，39 → 46 */,
    J([nSk, s.ros.t.slice(0, 30)])
  );
  const fc = await p.evaluate(() => [...document.querySelectorAll('#pros .p-f .s-b')].map(e => e.textContent));
  ok(
    '技能篩選：全部／已裝備／攻擊／法術（開了光環欄再加光環）；已裝備的排在前',
    J(fc.slice(0, 4)) === J(['全部', '已裝備', '攻擊', '法術']) &&
      ['pk:apshot', 'pk:grenade', 'pk:oilgrenade'].every((k, i) => cells[i][0] === k),
    J([fc, cells.slice(0, 4).map(c => c[0])])
  );
  const from = await ctr('#pros [data-s="pk:ballista"]'),
    to = await ctr('#pskill [data-s="slot:3"]');
  await p.mouse.move(...from);
  await p.mouse.down();
  await p.mouse.move(640, 430, { steps: 6 });
  await p.waitForTimeout(100);
  const gh = await bx('#skg');
  ok(
    '拖名冊的一招：80×80 的那一格跟著游標',
    !!gh && gh.b[2] === 80 && gh.b[3] === 80 && near(gh.b[0], 600, 2) && gh.t === '弩砲塔圖騰',
    J(gh)
  );
  ok('拖放中世界不暫停', (await st()).paused === false);
  await shot('17-roster-skills');
  await p.mouse.move(...to, { steps: 6 });
  await p.mouse.up();
  await p.waitForTimeout(250);
  s = await st();
  ok('拖到右邊空格：放進第 4 格，放好後名冊自動關', s.sk[3][0] === 'ballista' && !s.ros, J([s.sk[3], s.ros]));
  /* ---------- 18 名冊輔助拖放 ---------- */
  await click('#pskill [data-s="row:1"] .s-d');
  await p.mouse.click(300, 300);
  await p.evaluate(() => ((SK.sel = 1), hudPanels()));
  await click('#pskill .s-ros');
  await click('#pros [data-s="tab:sups"]');
  await p.evaluate(() => ((SK.f.sups = '全部'), hudPanels()));
  await p.waitForTimeout(120);
  s = await st();
  const sc = await p.evaluate(() =>
    [...document.querySelectorAll('#pros .p-c')].map(e => [
      e.dataset.s,
      e.className,
      getComputedStyle(e).borderTopWidth + ' ' + getComputedStyle(e).borderTopColor,
      getComputedStyle(e).opacity,
      e.textContent,
      (e.querySelector('img') || {}).src || ''
    ])
  );
  ok(
    '名冊輔助分頁副標「對準：爆裂榴彈　輔助・55 個」（靜態目錄）',
    s.ros.tab === 'sups' && s.ros.mode === 'grid' && s.ros.t.includes('對準：爆裂榴彈　輔助・55 個'),
    s.ros.t.slice(0, 40)
  );
  ok(
    '可插加框（2 px --sel-edge）；不可插透明度 0.4＋✕',
    sc.filter(c => c[1].includes(' ok')).length > 5 &&
      sc.filter(c => c[1].includes(' ok')).every(c => c[2] === `2px ${tk['sel-edge']}`) &&
      sc.filter(c => c[1].includes(' no')).length > 0 &&
      sc.filter(c => c[1].includes(' no')).every(c => c[3] === '0.4' && c[4].includes('✕')),
    J(sc.filter(c => c[1].includes(' no')).slice(0, 3))
  );
  const haste = sc.find(c => c[0] === 'pk:haste');
  ok(
    '輔助「連擊」（haste）用既有圖 sup_sp_fastatk，不叫「加速」',
    !!haste &&
      haste[4] === '連擊' &&
      !!haste[5] &&
      (await p.evaluate(() => SUPPORTS.haste.ic)) === 'sup_sp_fastatk' &&
      (await p.evaluate(() => SUPPORTS.haste.x[0])) === '被輔助的技能 25%更多技能速度',
    J(haste && haste.slice(0, 5))
  );
  const hc = await p.evaluate(() =>
    [...document.querySelectorAll('#pskill .s-o')].map(e => [e.dataset.s, e.classList.contains('can'), e.className])
  );
  /* F-4（RULINGS-2）：原本「開著的孔都加框」把已插的孔也標成可插；改成只有空孔加框，已插、鎖孔不加 */
  ok(
    '名冊輔助開著：右邊空著的孔加框；已插的孔、鎖孔不加',
    hc.filter(x => /hole:1:[12]$/.test(x[0])).every(x => x[1]) &&
      hc.filter(x => / f/.test(x[2])).every(x => !x[1]) &&
      hc.filter(x => / lk/.test(x[2])).every(x => !x[1]),
    J(hc.slice(5, 10))
  );
  const f2 = await ctr('#pros [data-s="pk:crit"]'),
    t2 = await ctr('#pskill [data-s="hole:1:2"]');
  await p.mouse.move(...f2);
  await p.mouse.down();
  await p.mouse.move(740, 300, { steps: 6 });
  await p.waitForTimeout(100);
  ok('拖輔助「致命」：跟著游標', ((await bx('#skg')) || {}).t === '致命');
  const f4 = await p.evaluate(() =>
    [...document.querySelectorAll('#pskill .s-l .s-o[data-s^="hole:"]')].map(e => {
      const [, i, j] = e.dataset.s.split(':'),
        h = skHole(+i, 0, +j),
        fit = h.t === 'e' && skWith('sups', +i, 0, +j, c => supWhy(c, 'crit', +j)) === '',
        cs = getComputedStyle(e);
      return {
        s: e.dataset.s,
        t: h.t,
        fit,
        can: e.classList.contains('can'),
        bd: cs.borderTopWidth + ' ' + cs.borderTopColor,
        op: cs.opacity,
        x: e.textContent.includes('✕')
      };
    })
  );
  ok(
    'F-4 18：拖「致命」時只有空、相容、沒鎖的孔加可插框（2 px --sel-edge）；已插、鎖住、不相容的孔沒有框、透明度 0.4＋✕',
    f4.some(h => h.fit) &&
      f4.some(h => h.t === 'f') &&
      f4.some(h => h.t === 'lk') &&
      f4.every(h =>
        h.fit
          ? h.can && h.bd === `2px ${tk['sel-edge']}` && h.op === '1' && !h.x
          : !h.can && h.bd !== `2px ${tk['sel-edge']}` && h.op === '0.4' && h.x
      ),
    J(f4.filter(h => (h.fit ? !h.can || h.op !== '1' || h.x : h.can || h.op !== '0.4' || !h.x)))
  );
  await shot('18-roster-supports');
  await p.mouse.move(...t2, { steps: 6 });
  await p.mouse.up();
  await p.waitForTimeout(250);
  s = await st();
  ok('拖到孔：插上、放好後名冊自動關', s.sk[1][3] === 'crit' && !s.ros, J([s.sk[1], s.ros]));
  await click('#pskill .s-ros');
  await click('#pros [data-s="tab:sups"]');
  await p.evaluate(() => ((SK.f.sups = '全部'), hudPanels()));
  await click('#pros [data-s="pk:leech"]');
  await click('#pskill [data-s="hole:1:1"]');
  s = await st();
  ok('點一下再點：名冊點一顆、再點右邊的孔＝插上', s.sk[1][2] === 'leech' && !s.ros, J(s.sk[1]));
  await redo(() => ((S.skills[1].so = ['fireadd2', null, null]), (SK.sel = null)));
  /* ---------- 13 挑技能 ---------- */
  await redo(() => (S.skills[0].k = null));
  await click('#pskill [data-s="slot:0"]');
  s = await st();
  ok(
    '點空格：名冊技能分頁（點選後按主鈕），副標「放到第 1 格」「快捷鍵隨格子走：第 1 格是左鍵」',
    !!s.ros &&
      s.ros.tab === 'skills' &&
      s.ros.mode === 'list' &&
      s.ros.t.includes('放到第 1 格快捷鍵隨格子走：第 1 格是左鍵'),
    s.ros && s.ros.t.slice(0, 50)
  );
  const pr = await p.evaluate(() =>
    [...document.querySelectorAll('#pros .p-r')].map(e => [e.dataset.s, e.textContent, e.classList.contains('dim')])
  );
  ok(
    '不能用的列標原因「這把武器不能用」',
    pr.some(x => x[2] && x[1].includes('✕ 這把武器不能用')),
    J(pr.filter(x => x[2]).slice(0, 3))
  );
  await click('#pros [data-s="pk:apshot"]');
  const m13 = await bx('#pros .p-m .s-b');
  ok('主鈕「放進第 1 格：穿甲彈」', m13.t === '放進第 1 格：穿甲彈' && is(m13.b, 28, 508, 448, 44), J(m13));
  const f6_13 = await p.evaluate(F6);
  ok(
    'F-6 13：名冊清單底 ≤ 主鈕上緣 508、看得到的列沒有被切半；捲到底最後一列（圖示＋名稱）完整；主鈕仍 28,508 448×44',
    f6_13.rest.n > 0 &&
      f6_13.rest.cut === 0 &&
      f6_13.rest.lb <= 508 &&
      f6_13.end.cut === 0 &&
      f6_13.end.last &&
      f6_13.after.cut === 0 &&
      J(f6_13.m) === J([28, 508, 448, 44]),
    J(f6_13)
  );
  await shot('13-skill-pick');
  await click('#pros .p-m .s-b');
  s = await st();
  ok('按主鈕：放進第 1 格，名冊自動關', s.sk[0][0] === 'apshot' && !s.ros, J(s.sk[0]));
  await click('#pskill [data-s="sw:2"]');
  s = await st();
  ok(
    '點更換圖示：開名冊技能分頁換招（對準第 3 格）',
    !!s.ros && s.ros.tab === 'skills' && s.ros.t.includes('放到第 3 格'),
    s.ros && s.ros.t.slice(0, 30)
  );
  await p.keyboard.press('Escape');
  await p.waitForTimeout(150);
  s = await st();
  ok('Esc 先關名冊，技能分頁還開著', !s.ros && s.on);
  /* ---------- 14 名詞提示＋光環列＋第 5 格 ---------- */
  await redo(() => ((S.camp.forge = 15), (S.auras = [{ k: 'precise', so: [null, null], n: 2 }, null])));
  await p.evaluate(() => (document.querySelector('#pskill .s-l').scrollTop = 9999));
  await p.waitForTimeout(120);
  const l5 = await bx('#pskill .s-lk'),
    au = { b: await bx('#pskill [data-s="auch"]'), sp: await bx('#pskill .s-sp'), row: await bx('#pskill .s-au') };
  ok(
    '第 5 格鎖住寫全句「升鍛造台到 Lv16，開第 5 格技能」（全寬列、16/400、--tx，不可點）',
    !!l5 &&
      l5.t === '5升鍛造台到 Lv16，開第 5 格技能' &&
      l5.b[2] === 452 &&
      l5.fs === '16px' &&
      l5.fw === '400' &&
      l5.c === tk.tx &&
      !(await p.evaluate(() => document.querySelector('#pskill .s-lk').matches('button, [data-s]'))),
    J(l5)
  );
  ok(
    '光環列：「換一個」72×28、14/700；「精魂 n／m」',
    !!au.b &&
      au.b.t === '換一個' &&
      au.b.b[2] === 72 &&
      au.b.b[3] === 28 &&
      au.b.fs === '14px' &&
      au.b.fw === '700' &&
      /^精魂 \d+／\d+$/.test(au.sp.t),
    J(au)
  );
  await p.mouse.move(...(await ctr('#pskill .s-sp')));
  await p.waitForTimeout(200);
  const n200 = (await st()).skn;
  await p.waitForTimeout(350);
  s = await st();
  const nb = { c: await bx('#skn'), p: await bx('#skn p'), sm: await bx('#skn small') };
  ok('名詞提示「精魂」：停留 0.2 秒還沒出、0.4 秒後才出（跟 0 秒懸停分開）', !n200 && !!s.skn, J([n200, s.skn]));
  ok(
    '名詞提示在戰場側、底 --panel、正文 14/400、帽「名詞提示　停留 0.4 秒／手把 Ｒ3」14 px',
    !!s.skn &&
      s.skn.box[0] + s.skn.box[2] <= 788 &&
      nb.c.bg === tk.panel &&
      nb.p.fs === '14px' &&
      nb.p.fw === '400' &&
      nb.p.t.includes('光環能不能生效只看精魂') &&
      nb.sm.t === '名詞提示　停留 0.4 秒／手把 Ｒ3' &&
      nb.sm.fs === '14px',
    J(nb)
  );
  await shot('14-noun-tip');
  await away();
  ok('移開：名詞提示收起', !(await st()).skn);
  await click('#pskill [data-s="aura:0"]');
  const ar = await bx('#pskill [data-s="row:5"]');
  ok('點光環：底下出這個光環的一列（等級、精魂、孔）', !!ar && ar.t.includes('精準') && /精魂 \d+/.test(ar.t), J(ar));
  await click('#pskill [data-s="auch"]');
  s = await st();
  ok(
    '光環「換一個」：開名冊（篩選停在光環），主鈕「放進光環欄：{名}」',
    !!s.ros &&
      s.ros.t.includes('放到光環欄') &&
      (await p.evaluate(() => [...document.querySelectorAll('#pros .p-r')].every(e => !!AURAS[e.dataset.s.slice(3)])))
  );
  const ak = await p.evaluate(() => document.querySelector('#pros .p-r:not(.dim):not(.on)').dataset.s.slice(3));
  await click(`#pros [data-s="pk:${ak}"]`);
  ok(
    '光環主鈕「放進光環欄：{名}」',
    ((await bx('#pros .p-m .s-b')) || {}).t === `放進光環欄：${await p.evaluate(k => AURAS[k].n, ak)}`,
    J(await bx('#pros .p-m .s-b'))
  );
  await click('#pros .p-m .s-b');
  ok('換一個：光環換掉、名冊自動關', (await p.evaluate(() => S.auras[0].k)) === ak && !(await st()).ros);
  /* ---------- 12 空技能格（長老屋 Lv1） ---------- */
  await redo(() => {
    S.camp.altar = 1;
    S.camp.forge = 1;
    S.auras = [null];
    S.skills.forEach(r => ((r.k = null), (r.so = [null, null]), (r.n = 2)));
    SK.as = null;
  });
  await p.evaluate(() => (document.querySelector('#pskill .s-l').scrollTop = 0));
  const t12 = await p.evaluate(() => [...document.querySelectorAll('#pskill .s-l > *')].map(e => e.textContent));
  ok(
    '第 1–2 格「點這裡挑一招」；第 3 格「升長老屋到 Lv3，開第 3 格技能」、第 4 格「升長老屋到 Lv6，開第 4 格技能」、第 5 格「升鍛造台到 Lv16，開第 5 格技能」',
    J(t12.slice(0, 5)) ===
      J([
        '1 左鍵點這裡挑一招',
        '2 右鍵點這裡挑一招',
        '3升長老屋到 Lv3，開第 3 格技能',
        '4升長老屋到 Lv6，開第 4 格技能',
        '5升鍛造台到 Lv16，開第 5 格技能'
      ]),
    J(t12)
  );
  ok(
    '標題「長老屋 Lv1・每招 0 孔」；下一個孔「升長老屋到 Lv2，每一招多 1 個輔助孔。」',
    (await bx('#pskill .s-hd')).t.includes('長老屋 Lv1・每招 0 孔') &&
      t12[5] === '升長老屋到 Lv2，每一招多 1 個輔助孔。',
    J(t12[5])
  );
  await shot('12-skill-empty');
  /* ---------- 解鎖規則 ---------- */
  const un = await p.evaluate(() => {
    const at = (a, f) => ((S.camp.altar = a), (S.camp.forge = f), [campN('slots'), campN('holes')]),
      r = [
        at(0, 0),
        at(1, 0),
        at(3, 0),
        at(6, 15),
        at(11, 15),
        at(6, 16),
        at(2, 0),
        at(5, 0),
        at(8, 0),
        at(11, 0),
        at(9, 15)
      ];
    S.camp.altar = 11;
    S.camp.forge = 15;
    const nx = nextUnlock('slot');
    S.camp.altar = 8;
    S.camp.forge = 20;
    return { r, nx: nx && [nx.b, nx.lv, nx.m], aura: [campKey('aura'), campKey('sup2')] };
  });
  ok(
    '解鎖：第 2／3／4 格＝長老屋 Lv1／3／6，第 5 格＝鍛造台 Lv16（長老屋 Lv9、Lv11 都不開第 5 格）',
    J(un.r.slice(0, 6).map(x => x[0])) === J([1, 2, 3, 4, 4, 5]) &&
      un.r[10][0] === 4 &&
      J(un.nx) === J(['forge', 16, 5]),
    J(un)
  );
  ok(
    '輔助孔上限照長老屋：Lv2＝1、Lv5＝2（同時開光環欄）、Lv8＝3、Lv11＝5；輔助 II＝鍛造台 Lv20＋15,000 靈魂',
    J(un.r.slice(6, 10).map(x => x[1])) === J([1, 2, 3, 5]) &&
      J(un.aura) ===
        J([
          ['altar', 5],
          ['forge', 20]
        ]) &&
      (await p.evaluate(() => SUP2_COST)) === 15000,
    J(un)
  );
  /* ---------- 手動模式副標、G 關 ---------- */
  await p.evaluate(setup);
  await p.evaluate(() => ((S.auto = 0), hudPanels()));
  await p.waitForTimeout(150);
  s = await st();
  ok(
    '手動模式副標「技能・照按鍵」；手動模式開分頁仍暫停（照現行）',
    (await bx('#pskill .s-hd small')).t === '技能・照按鍵' && s.paused === true,
    J([(await bx('#pskill .s-hd small')).t, s.paused])
  );
  await p.evaluate(() => ((S.auto = 1), hudPanels()));
  await p.keyboard.press('g');
  await p.waitForTimeout(250);
  s = await st();
  ok(
    '再按 G 關技能分頁；提示列、名冊、戰場側提示都收起',
    !s.on && !s.ros && !s.hint && !s.skt && !s.skc,
    J([s.on, s.hint])
  );
  ok('提示列各狀態都有字', Object.values(hints).every(Boolean), J(hints));
  ok('1280×720 沒有頁面錯誤', !errs.length, errs.join(' | '));
  if (OUT) fs.writeFileSync(path.join(OUT, 'boxes.json'), J(BOX, null, 1));

  /* ---------- 手把（標準配置，用假的 navigator.getGamepads） ---------- */
  const [g, e3] = await open({ viewport: { width: 1280, height: 720 } }, () => {
    window.PADB = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    window.PADA = [0, 0, 0, 0];
    navigator.getGamepads = () => [window.PADON ? { buttons: window.PADB, axes: window.PADA } : null];
  });
  await g.keyboard.press('g');
  await g.waitForTimeout(300);
  /* F-7：G 打開後只按 ↓：名冊鈕的下一步是第 1 列技能格（不是孔 3），提示列「更換技能」；再往右才進孔 */
  const f7 = [];
  for (let n = 0; n < 4; n++) {
    await g.keyboard.press('ArrowDown');
    await g.waitForTimeout(150);
    const t = await g.evaluate(ST);
    f7.push([t.foc, t.hint]);
    if (/^(row|hole|sw|grip):/.test(t.foc)) break;
  }
  const f7r = [];
  for (let n = 0; n < 2; n++) {
    await g.keyboard.press('ArrowRight');
    await g.waitForTimeout(150);
    f7r.push((await g.evaluate(ST)).foc);
  }
  ok(
    'F-7 鍵盤：G 打開後只按 ↓，名冊鈕之後停在第 1 列技能格 row:0（不是 hole:0:2），提示列有「更換技能」；再按 → 經更換圖示進孔 1',
    f7.length >= 2 &&
      f7[f7.length - 2][0] === 'ros' &&
      f7[f7.length - 1][0] === 'row:0' &&
      /更換技能/.test(f7[f7.length - 1][1]) &&
      !f7.some(x => /^hole:/.test(x[0])) &&
      J(f7r) === J(['sw:0', 'hole:0:0']),
    J([f7, f7r])
  );
  await g.evaluate(() => ((window.PADON = 1), dispatchEvent(new Event('gamepadconnected'))));
  const pad = async (i, ms = 120) => {
    await g.evaluate(i => (PADB[i].pressed = true), i);
    await g.waitForTimeout(ms);
    await g.evaluate(i => (PADB[i].pressed = false), i);
    await g.waitForTimeout(120);
    return g.evaluate(ST);
  };
  await g.focus('#pskill [data-s="row:0"]');
  s = await pad(13);
  ok(
    '手把方向鍵下：焦點移到下一列，浮窗跟焦點',
    s.foc === 'row:1' && !!s.f && s.f.t.includes('爆裂榴彈'),
    J([s.foc, s.f && s.f.t.slice(0, 20)])
  );
  ok('手把焦點在技能格：提示列寫「更換技能」（不另發明綁定）', /更換技能/.test(s.hint), s.hint);
  await g.evaluate(() => (PADB[3].pressed = true));
  await g.waitForTimeout(150);
  s = await g.evaluate(ST);
  ok('手把按住 Ｙ：詳細', !!s.f && s.f.cls.includes('det'));
  await g.evaluate(() => (PADB[3].pressed = false));
  await g.waitForTimeout(150);
  s = await g.evaluate(ST);
  ok('手把放開 Ｙ：回簡易', !!s.f && !s.f.cls.includes('det'));
  s = await pad(15);
  ok(
    '方向鍵右：同一列往右是更換圖示，再往右是孔 1',
    s.foc === 'sw:1' &&
      (await pad(15)).foc === 'hole:1:0' &&
      (await pad(13)).foc === 'hole:2:0' &&
      (await pad(12)).foc === 'hole:1:0',
    s.foc
  );
  await g.focus('#pskill [data-s="hole:1:0"]');
  s = await pad(2);
  ok('手把 Ⓧ：卸下焦點上的輔助（出復原列）', s.sk[1][1] == null && (await g.evaluate(() => !!SK.undo)), J(s.sk[1]));
  s = await pad(0);
  ok(
    '手把 Ⓐ 在孔上：開孔（名冊輔助分頁，對準這一孔）',
    !!s.ros && s.ros.tab === 'sups' && /對準：爆裂榴彈・孔 1/.test(s.ros.t),
    s.ros && s.ros.t.slice(0, 30)
  );
  const f0 = await g.evaluate(() => SK.f.sups || '推薦');
  await pad(5);
  const f1 = await g.evaluate(() => SK.f.sups);
  await pad(4);
  ok('手把 RB／LB：換篩選', f1 !== f0 && (await g.evaluate(() => SK.f.sups)) === f0, J([f0, f1]));
  s = await g.evaluate(ST);
  const fa = s.foc;
  s = await pad(13);
  ok(
    '用手把開名冊：焦點進名冊清單，方向鍵下移到下一列',
    fa.startsWith('pk:') &&
      s.foc.startsWith('pk:') &&
      s.foc !== fa &&
      (await g.evaluate(() => $('pros').contains(document.activeElement))),
    J([fa, s.foc])
  );
  const pk = await g.evaluate(() => document.activeElement.dataset.s.slice(3));
  s = await pad(0);
  ok(
    '手把 Ⓐ 在名冊的列：確認（插上、名冊自動關、焦點回到那一孔）',
    !s.ros && [pk, pk + '2'].includes(s.sk[1][1]) && s.foc === 'hole:1:0',
    J([pk, s.sk[1], s.foc])
  );
  await g.focus('#pskill [data-s="row:2"]');
  s = await pad(0);
  ok(
    '手把 Ⓐ 在技能格：打開名冊技能分頁（跟名冊鈕同一個操作）',
    !!s.ros && s.ros.tab === 'skills' && s.ros.t.includes('放到第 3 格'),
    s.ros && s.ros.t.slice(0, 30)
  );
  s = await pad(1);
  ok('手把 Ⓑ：先關名冊', !s.ros && s.on);
  await g.focus('#pskill [data-s="grip:2"]');
  await pad(0);
  s = await pad(12);
  ok(
    '手把：把手上 Ⓐ 選中後 ↑ 換序',
    s.sk[1][0] === 'oilgrenade' && s.foc === 'grip:1',
    J([s.sk.map(x => x[0]), s.foc])
  );
  await pad(0);
  await g.evaluate(() => ((S.auras = [{ k: 'precise', so: [null, null], n: 2 }, null]), changed(), hudPanels()));
  await g.evaluate(() => (document.querySelector('#pskill .s-l').scrollTop = 9999));
  await g.focus('#pskill .s-sp');
  s = await pad(11);
  ok('手把 R3：焦點上的名詞出提示', !!s.skn && s.skn.t.includes('精魂'), J(s.skn));
  await g.evaluate(() => ((MAT().soul = 20000), (SK.ii = 'multi2'), hudPanels()));
  await g.waitForTimeout(100);
  await g.focus('#pskill [data-s="f:iigo"]');
  s = await pad(0, 250);
  const u1 = await g.evaluate(() => !!(S.lib.sup2 || {}).multi);
  s = await pad(0, 1200);
  ok(
    '手把解鎖 II：Ⓐ 按不到 0.6 秒不執行、按住 0.6 秒才解鎖',
    !u1 && (await g.evaluate(() => !!S.lib.sup2.multi)) && s.soul >= 5000 && s.soul < 6000,
    J([u1, s.soul])
  );
  s = await pad(1);
  s = await pad(1);
  ok('手把 Ⓑ：沒有東西可關時關技能分頁', !s.on, J(s.on));
  ok('手把這一頁沒有頁面錯誤', !e3.length, e3.join(' | '));

  /* ---------- 桌機其他尺寸：面板不超出畫面 ---------- */
  for (const [W, H2] of [
    [1440, 900],
    [1280, 800]
  ]) {
    const [d, e4] = await open({ viewport: { width: W, height: H2 } });
    await d.keyboard.press('g');
    await d.waitForTimeout(300);
    await d.mouse.click(
      ...(await d.evaluate(() =>
        (r => [r.x + r.width / 2, r.y + r.height / 2])(document.querySelector('#pskill .s-ros').getBoundingClientRect())
      ))
    );
    await d.waitForTimeout(250);
    const o = await d.evaluate(OVER),
      sd = await d.evaluate(ST);
    ok(
      `${W}×${H2}：右欄與名冊都在畫面內（各 476 寬、右欄靠右 16、名冊靠左 16）、超出 0`,
      sd.s12 &&
        sd.box[2] === 476 &&
        sd.box[0] + 476 === W - 16 &&
        sd.box[1] + sd.box[3] <= H2 &&
        !!sd.ros &&
        sd.ros.box[0] === 16 &&
        sd.ros.box[2] === 476 &&
        !o.over.length &&
        !o.cut.length &&
        o.doc <= 0,
      J([sd.box, sd.ros && sd.ros.box, o])
    );
    ok(`${W}×${H2} 沒有頁面錯誤`, !e4.length, e4.join(' | '));
    await d.context().close();
  }

  /* ---------- 390×844：直立技能頁照舊（skpanel.js 的 skillHTML，不走 .s12） ---------- */
  const [q, e2] = await open({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2
  });
  await q.evaluate(() => (closePanels(), navGo('skill')));
  await q.waitForTimeout(600);
  const m = await q.evaluate(() => ({
    s12: $('pskill').classList.contains('s12'),
    old: !!$('pskill').querySelector('.skp.home .skr'),
    ros: !!$('pros') && !$('pros').hidden,
    hint: !!$('skh') && !$('skh').hidden,
    doc: document.documentElement.scrollWidth - innerWidth,
    r: (r => [r.left, r.right, r.bottom])($('pskill').getBoundingClientRect())
  }));
  ok('390×844 直立技能頁照舊：.skp.home 總覽，沒有 .s12、名冊、提示列', !m.s12 && m.old && !m.ros && !m.hint, J(m));
  ok('390×844：面板不超出畫面、文件不橫向捲', m.r[0] >= 0 && m.r[1] <= 390 && m.r[2] <= 844 && m.doc <= 0, J(m));
  if (OUT) await q.screenshot({ path: path.join(OUT, '390x844-skill.png') });
  ok('390×844 沒有頁面錯誤', !e2.length, e2.join(' | '));
  await b.close();
  console.log(bad ? `❌ ${bad} 項沒過` : '✅ 技能面板全部通過');
  process.exit(bad ? 1 : 0);
})();
