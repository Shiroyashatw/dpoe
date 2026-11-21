/* battle-hud v1.3.3 §13 驗收：5 狀態 × 2 尺寸的實機截圖、疊圖用量測。
   用法：先在 dpoe/ 開 python3 -m http.server 8000，再 node tools/bh_shots.js [輸出資料夾]（預設 docs/production/evidence/battle-hud-v133）
   每張：{state}_{W}x{H}.png（DPR 1）＋ measure_{state}_{W}x{H}.json（每個元件的框、熱區、字級字重、顏色）；
   疊圖與差表由 tools/bh_overlay.py 產生。有 ❌（框四邊差 > 2 px）時結束碼 1 */
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs/production/evidence/battle-hud-v133'),
  URL = process.argv[3] || 'http://localhost:8000/';
fs.mkdirSync(OUT, { recursive: true });
const SPEC = path.join(__dirname, '..', 'docs/production/specs/battle-hud');
/* 讀元件表（<!-- T {size} {kind} --> 後面的表）：id → [x, y, w, h, 熱區字串, 狀態] */
function table(file, tag) {
  const s = fs.readFileSync(path.join(SPEC, file), 'utf8'),
    i = s.indexOf(`<!-- T ${tag} -->`),
    L = s.slice(i).split('\n').slice(3),
    o = {};
  for (const l of L) {
    if (!l.startsWith('|')) break;
    const c = l.split('|').map(x => x.trim());
    o[c[1]] = { n: c[2], r: [+c[3], +c[4], +c[5], +c[6]], f: c[7], tk: c[8], st: c[9], hit: c[10] };
  }
  return o;
}
const T = {
  '390x844': { hud: table('battle-hud-2.md', '390x844 hud'), min: table('battle-hud-2.md', '390x844 collapsed-hud') },
  '1280x720': { hud: table('battle-hud-3.md', '1280x720 hud'), min: table('battle-hud-3.md', '1280x720 collapsed-hud') }
};
/* id → 量哪個元素（外觀）；hit＝熱區元素 */
const nth = (q, i) => `${q}:nth-child(${i})`;
const SEL = {
  P03: '#bhTop',
  P04: '#bhC0',
  P05: '#bhC1',
  P06: '#bhC2',
  P07: '#bhC3',
  P08: ['#bhLoc .v', '#bhLoc'],
  P12b: '#bhBossP',
  P12: '#bhBoss',
  P13: '#bhBig',
  P14: '#bhTip',
  P15: nth('#bhVig i', 1),
  P16: nth('#bhVig i', 2),
  P17: nth('#bhVig i', 3),
  P18: nth('#bhVig i', 4),
  P19: '#bhLow',
  P20: '#bhS0',
  P21: '#bhS1',
  P22: '#bhS2',
  P23: '#bhS3',
  P24: '#bhS4',
  P25: ['#bhAura .v', '#bhAura'],
  P37: '#bhp',
  P38: '#bmp',
  P39: ['#bhF0 .v', '#bhF0'],
  P40: ['#bhF1 .v', '#bhF1'],
  P41: '#pidle',
  P42: '#pidle .icard',
  P43: '#pidle .is1',
  P50: ['#pidle .icp[data-r="0"]', '#pidle .icph'],
  P54: '#pidle .ist',
  P55: '#pidle .ib1',
  P56: '#pidle .ib2',
  P57: '#pidle .ib3',
  P65: ['#pidle .ihd i', '#pidle .ihd'],
  T03: '#bhTop',
  T04: '#bhC0',
  T05: '#bhC1',
  T06: '#bhC2',
  T07: '#bhC3',
  T08: ['#bhLoc .v', '#bhLoc'],
  T12: ['#bhAura .v', '#bhAura'],
  T21: '#bhS0',
  T22: '#bhS1',
  T23: '#bhS2',
  T24: '#bhS3',
  T25: '#bhS4',
  T26: '#bhp',
  T27: '#bmp',
  T28: ['#bhF0 .v', '#bhF0'],
  T29: ['#bhF1 .v', '#bhF1'],
  T30: '#pidle',
  T31: '#pidle .igoal',
  T32: ['#pidle .i32', '#pidle .ihit'],
  T33: '#pidle .i33',
  T34: '#pidle .i34',
  T35: '#pidle .ix',
  D01: '#bhTop',
  D02: '#bhC0',
  D03: '#bhC1',
  D04: '#bhC2',
  D05: '#bhC3',
  D06: ['#bhLoc .v', '#bhLoc'],
  D17b: '#bhBossP',
  D17: '#bhBoss',
  D18: '#bhBig',
  D19: '#bhTip',
  D20: nth('#bhVig i', 1),
  D21: nth('#bhVig i', 2),
  D22: nth('#bhVig i', 3),
  D23: nth('#bhVig i', 4),
  D24: '#bhLow',
  D25: '#pidle',
  D26: '#pidle .is1',
  D27: '#pidle .is2',
  D35: ['#pidle .icp[data-r="0"]', '#pidle .icph'],
  D38: ['#pidle .ist', '#pidle .isth'],
  D39: '#pidle .ib1',
  D40: '#pidle .ib2',
  D41: '#pidle .ib3',
  D42: '#bhS0',
  D43: '#bhS1',
  D44: '#bhS2',
  D45: '#bhS3',
  D46: '#bhS4',
  D47: ['#bhAura .v', '#bhAura'],
  D59: '#bhp',
  D60: '#bmp',
  D61: ['#bhF0 .v', '#bhF0'],
  D62: ['#bhF1 .v', '#bhF1'],
  D63: 'MINI',
  D64: ['#pidle .ihd i', '#pidle .ihd'],
  C01: '#bhTop',
  C02: '#bhC0',
  C03: '#bhC1',
  C04: '#bhC2',
  C05: '#bhC3',
  C06: ['#bhLoc .v', '#bhLoc'],
  C42: '#bhS0',
  C43: '#bhS1',
  C44: '#bhS2',
  C45: '#bhS3',
  C46: '#bhS4',
  C47: ['#bhAura .v', '#bhAura'],
  C59: '#bhp',
  C60: '#bmp',
  C61: ['#bhF0 .v', '#bhF0'],
  C62: ['#bhF1 .v', '#bhF1'],
  C63: 'MINI',
  C30: '#pidle',
  C31: '#pidle .igoal',
  C32: ['#pidle .i32', '#pidle .ihit'],
  C33: '#pidle .i33',
  C34: '#pidle .i34',
  C35: '#pidle .ix'
};
/* 一列一個的：拾取、狀態、分頁、比較 */
for (let i = 0; i < 5; i++) SEL['P' + (44 + i)] = [`#pidle .ipk[data-r="${i}"]`, '#pidle .ipks'];
SEL.P49 = ['#pidle .ipk[data-r="4"]', '#pidle .ipks'];
for (let i = 0; i < 3; i++) SEL['P' + (51 + i)] = `#pidle .icp[data-r="${i + 1}"]`;
for (let i = 0; i < 6; i++) SEL['D' + (28 + i)] = [`#pidle .ipk[data-r="${i}"]`, '#pidle .ipks'];
SEL.D34 = ['#pidle .ipk[data-r="5"]', '#pidle .ipks'];
for (let i = 0; i < 2; i++) SEL['D' + (36 + i)] = `#pidle .icp[data-r="${i + 1}"]`;
for (let i = 0; i < 8; i++) {
  SEL['P' + (29 + i)] = [`#bhSts .v > :nth-child(${i + 1})`, '#bhSts'];
  SEL['T' + (13 + i)] = [`#bhSts .v > :nth-child(${i + 1})`, '#bhSts'];
  SEL['D' + (51 + i)] = [`#bhSts .v > :nth-child(${i + 1})`, '#bhSts'];
  SEL['C' + (51 + i)] = [`#bhSts .v > :nth-child(${i + 1})`, '#bhSts'];
}
for (let i = 0; i < 7; i++) {
  SEL['P' + (58 + i)] = nth('#pnav button', i + 1);
  SEL['T' + (36 + i)] = nth('#pnav button', i + 1);
  SEL['D' + (7 + i < 10 ? '0' : '') + (7 + i)] = nth('#dnav button', i + 1);
  SEL['C' + (7 + i < 10 ? '0' : '') + (7 + i)] = nth('#dnav button', i + 1);
}
/* 哪些表列在這個狀態要量（狀態欄：全／NBL／B：／L：／F：…） */
const inState = (st, s) => {
  const h = st.split('：')[0];
  if (h === '全' || h === 'C') return !(s === 'lootflood' && /^NBL/.test(st) && !/F/.test(h));
  const k = { normal: 'N', boss: 'B', lowhp: 'L', lootflood: 'F' }[s];
  return h.includes(k);
};
/* 場景表（battle-hud-2／-3 PW／TW／DW／CW）：[名, 類別, x, y, w, h]；[直立, 桌機]。
   「混沌石」遊戲裡沒有（Q-T1 未決）：換成真的有的稀有通貨（高階崇高石、追憶之墨）；金會被自動撿走，不放 */
const PE = ['判官', 'elite'];
const PLATES = {
  N: [
    [
      [...PE, 135, 135, 102, 20],
      ['判官烏紗', 'r3', 14, 386, 84, 20],
      ['王印', 'chase', 240, 396, 101, 20],
      ['厲鬼護符', 'r2', 153, 408, 84, 20],
      ['寒鐵之戒', 'r1', 83, 408, 68, 20],
      ['', 'cur:exalt', 187, 376, 54, 18],
      ['', 'cur:exalt2', 106, 362, 79, 18],
      ['鏽蝕長劍', 'r0', 13, 408, 68, 20]
    ],
    [
      [...PE, 570, 160, 112, 20],
      ['冥河斬馬刀', 'r2', 186, 230, 110, 22],
      ['判官烏紗', 'r3', 349, 440, 94, 22],
      ['王印', 'chase', 914, 415, 111, 22],
      ['厲鬼護符', 'r2', 839, 500, 94, 22],
      ['鏽蝕長劍', 'r0', 496, 505, 76, 22],
      ['寒鐵之戒', 'r1', 416, 538, 76, 22],
      ['', 'cur:exalt2', 556, 538, 89, 22],
      ['', 'cur:exalt', 705, 520, 60, 22]
    ]
  ]
};
PLATES.F = [
  [
    ...PLATES.N[0],
    ['', 'cur:ink', 14, 250, 54, 20],
    ['寒鐵之戒', 'r1', 248, 250, 68, 20],
    ['', 'cur:exalt', 48, 300, 54, 20],
    ['鏽蝕長劍', 'r0', 251, 330, 68, 20],
    ['寒鐵之戒', 'r1', 243, 374, 68, 20]
  ],
  [
    ...PLATES.N[1],
    ['', 'cur:ink', 305, 250, 60, 22],
    ['寒鐵之戒', 'r1', 902, 250, 76, 22],
    ['', 'cur:exalt', 770, 300, 60, 22],
    ['鏽蝕長劍', 'r0', 377, 320, 76, 22],
    ['寒鐵之戒', 'r1', 642, 470, 76, 22]
  ]
];
PLATES.C = [
  [
    ['判官烏紗', 'r3', 14, 386, 84, 20],
    ['王印', 'chase', 240, 396, 101, 20],
    ['厲鬼護符', 'r2', 153, 408, 84, 20],
    ['寒鐵之戒', 'r1', 83, 408, 68, 20],
    ['', 'cur:exalt', 187, 376, 54, 18],
    ['', 'cur:exalt2', 106, 362, 79, 18],
    ['鏽蝕長劍', 'r0', 13, 518, 68, 20],
    ['', 'cur:ink', 261, 540, 54, 20]
  ],
  [
    ['冥河斬馬刀', 'r2', 186, 230, 110, 22],
    ['判官烏紗', 'r3', 37, 440, 94, 22],
    ['王印', 'chase', 914, 415, 111, 22],
    ['厲鬼護符', 'r2', 839, 500, 94, 22],
    ['鏽蝕長劍', 'r0', 496, 505, 76, 22],
    ['寒鐵之戒', 'r1', 416, 538, 76, 22],
    ['', 'cur:exalt2', 556, 538, 89, 22],
    ['', 'cur:exalt', 705, 520, 60, 22],
    ['', 'cur:ink', 185, 500, 60, 22]
  ]
];
/* BH_ONLY=狀態,尺寸 只拍那幾張；BH_NOFULL=1：收起狀態倉庫沒滿（證明 T32／C32 一般字），檔名加 _nofull */
const NOFULL = !!process.env.BH_NOFULL;
const STATES = (process.env.BH_STATES || 'normal,boss,lowhp,lootflood,collapsed').split(',');
const SIZES = (process.env.BH_SIZES || '390x844,1280x720')
  .split(',')
  .map(t => t.split('x').map(Number))
  .map(([w, h]) => [w, h, w < 1000 ? 1 : 0]);
/* 產生時的 commit（寫進 measure_*.json 檔頭） */
let SHA = '';
try {
  SHA = require('child_process').execSync('git rev-parse HEAD', { cwd: __dirname }).toString().trim();
  if (
    require('child_process')
      .execSync('git status --porcelain -- js css index.html', { cwd: path.join(__dirname, '..') })
      .toString()
      .trim()
  )
    SHA += '+dirty';
} catch (e) {}
let bad = 0;
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  for (const [W, H, touch] of SIZES)
    for (const st of STATES) {
      const tag = `${W}x${H}`,
        ctx = await b.newContext({
          viewport: { width: W, height: H },
          hasTouch: !!touch,
          isMobile: !!touch,
          deviceScaleFactor: 1
        });
      await ctx.route(/supabase/, r => r.abort());
      const p = await ctx.newPage(),
        errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await p.goto(URL + '?dbg=1&seed=7&' + Date.now());
      await p.evaluate(() => localStorage.clear());
      await p.reload();
      await p.waitForTimeout(1200);
      await p.evaluate(
        ([st, touch]) => {
          proSkip();
          S.story.tips = 0;
          S.auto = 1;
          if (touch) DBG.safeArea(34, 47);
          /* 手機橫向 smoke（667×375 等）：用橫向操作（設定「改用橫向操作」） */
          if (touch && innerWidth > innerHeight) setOrient('l');
          Object.assign(S.camp, { forge: 20, watch: 26, scout: 4, house: 10, altar: 11, store: 5 });
          S.gold = 12480;
          Object.assign(MAT(), { soul: 3209, conv: 86, exalt: 4 });
          const cdk = Object.keys(SKILLS).find(k => {
            const D = SKILLS[k];
            return D.cd > 1 && !D.ammo && !D.gren && !D.charge && !(D.tags || []).includes('flask') && D.ic;
          });
          ['apshot', 'grenade', 'chargeslam', 'gasflask', cdk].forEach((k, i) => {
            S.skills[i] = { k, so: [null, null], n: 2 };
            S.lib.sk[k] = S.lib.sk[k] || 1;
          });
          runNode(TRUNK_K[16]);
          DBG.goal(0.62);
          ST = stats();
          hudBar();
          DBG.clear();
          /* 倉庫 96%（288／300）；最新一件拿來比較 */
          S.inv.items.length = 0;
          for (let i = 0; i < 287; i++) invPut(S.inv, mkItem('w_sword1_0', 1, 0));
          /* 比較欄要 3 行：挑一件換上去有 3 項以上變化的（固定種子，每次一樣） */
          for (let i = 0; i < 400; i++) {
            const b = BASES[i % BASES.length],
              it = b && !b.charm && mkItem(b.id, 40, 2);
            if (!it || !cmpSlot(it)) continue;
            invPut(S.inv, it);
            if (idleCmp() && idleCmp().L.length >= 3) break;
            S.inv.items.pop();
          }
          /* 掉落紀錄（拾取列、最近一筆） */
          S.log = [];
          const ck = CHASE_POOL.trunk[0];
          /* 規格範例（battle-hud §12）：判官烏紗＝傳奇、厲鬼護符＝稀有、寒鐵之戒＝魔法、鏽蝕長劍＝普通；通貨用遊戲裡真的有的一般通貨（不掛記號） */
          [
            ['鏽蝕長劍', 'it', null, 0],
            [`${CUR.conv.n} ×3`, 'cur', null, 0],
            ['寒鐵之戒', 'it', null, 1],
            ['厲鬼護符', 'it', null, 2],
            ['判官烏紗', 'it', null, 3],
            [chaseBanner(ck), 'chase', ck, 4]
          ].forEach(([n, c, k, r]) => dropLog(n, c, k, r));
          S.log.forEach(x => (x.t -= 60000));
          SES.t0 = Date.now() - (2 * 60 + 14) * 60000;
          P.flask = 3 * flaskCost() + 0.1;
          DBG.ammo(0, 4);
          DBG.gren(1, 1);
          DBG.stage(2, 2);
          P.cds.s4 = 2.4;
          DBG.auras(7);
          DBG.states(8, 2);
          if (st === 'boss') {
            const m = DBG.boss(BOSSES[0].sp);
            m.aggro = 1;
            m.hp = m.mhp * 0.62;
            DBG.big(2.1);
            G.big.end = G.t + 1.3;
          }
          if (st === 'lowhp') DBG.hp(31);
          if (st === 'lootflood') DBG.reload(0, 1.0), DBG.auras(9), DBG.flood(38), DBG.states(10, 2);
          if (st === 'collapsed') DBG.hudMin(1);
        },
        [st, touch]
      );
      await p.waitForTimeout(700);
      await p.evaluate(
        ([st, PLATES, NOFULL]) => {
          if (st === 'normal') bhTip(0);
          if (st === 'lowhp') DBG.hp(31), (P.cds.flask = 2.2), (P.cds.mflask = 0.9);
          idleBar(1);
          hudTick();
          /* 截圖只看 HUD：吐司、橫幅先收（遊戲照跑時它們會自己出現） */
          for (const id of ['warn', 'warn2', 'banner', 'chase']) $(id).style.visibility = 'hidden';
          /* 戰場示意：掉落牌＋菁英名牌（PW／TW／DW／CW 表；位置是例子，只驗規則）。普通、魔法照預設門檻不出牌 */
          const L =
            BH.R.m === 'l' ? [] : PLATES[st === 'collapsed' ? 'C' : st === 'lootflood' ? 'F' : 'N'][PORT() ? 0 : 1];
          DBG.scene(st === 'boss' ? L.filter(x => x[1] !== 'elite') : L);
          if (st === 'collapsed' && NOFULL) S.inv.items.length = 10;
          idleBar(1);
          DBG.freeze();
        },
        [st, PLATES, NOFULL]
      );
      await p.waitForTimeout(300);
      const fn = `${st}${NOFULL ? '_nofull' : ''}_${tag}`;
      await p.screenshot({ path: path.join(OUT, `${fn}.png`) });
      /* 667×375 等規格沒有的尺寸：只拍 smoke（不疊圖、不量） */
      if (!T[tag]) {
        console.log(`📷 ${fn}（smoke）${errs.length ? '；頁面錯誤 ' + errs.join(' / ') : ''}`);
        await ctx.close();
        continue;
      }
      /* 量測 */
      const tbl = st === 'collapsed' ? T[tag].min : T[tag].hud,
        ids = Object.keys(tbl).filter(id => inState(tbl[id].st, st) && SEL[id]),
        m = await p.evaluate(
          ([ids, SEL]) => {
            const box = el => {
              const r = el.getBoundingClientRect(),
                cs = getComputedStyle(el);
              return {
                r: [r.left, r.top, r.width, r.height].map(v => Math.round(v * 100) / 100),
                fs: cs.fontSize,
                fw: cs.fontWeight,
                col: cs.color,
                bg: cs.backgroundColor,
                vis: !!(r.width || r.height) && cs.visibility !== 'hidden'
              };
            };
            const o = {};
            for (const id of ids) {
              const s = SEL[id],
                [q, hq] = Array.isArray(s) ? s : [s, null];
              if (q === 'MINI') {
                o[id] = { r: BH.R.mini, vis: true };
                continue;
              }
              const el = document.querySelector(q),
                he = hq && document.querySelector(hq),
                /* 字級字重量有字的那一層（技能格的數字盒、條上的字、通貨數字） */
                fe =
                  el &&
                  [
                    ...el.querySelectorAll(
                      ':scope > .nb, :scope > .cdv, :scope > .rl, :scope > span:not(.v):not(.ic0), :scope > b'
                    )
                  ].find(e => e.textContent.trim());
              o[id] = el ? box(el) : { miss: 1 };
              if (fe) {
                const c = getComputedStyle(fe);
                Object.assign(o[id], { fs: c.fontSize, fw: c.fontWeight, col: c.color });
              }
              if (he) o[id].hit = box(he).r;
            }
            return o;
          },
          [ids, SEL]
        );
      const rep = [];
      for (const id of ids) {
        const e = tbl[id],
          g = m[id];
        let ok = !g.miss && g.vis,
          d = [0, 0, 0, 0];
        if (ok && e.r[2] && g.r) {
          /* 四邊差：左、上、右、下 */
          d = [
            g.r[0] - e.r[0],
            g.r[1] - e.r[1],
            g.r[0] + g.r[2] - (e.r[0] + e.r[2]),
            g.r[1] + g.r[3] - (e.r[1] + e.r[3])
          ].map(v => Math.round(v));
          ok = d.every(v => Math.abs(v) <= 2);
        }
        /* 熱區（表上寫成 x0–x1×y0–y1） */
        let hd = null;
        const hm = e.hit && e.hit.match(/(\d+)–(\d+)×(\d+)–(\d+)/);
        if (hm && g.hit) {
          const [x0, x1, y0, y1] = hm.slice(1).map(Number);
          hd = [g.hit[0] - x0, g.hit[1] - y0, g.hit[0] + g.hit[2] - x1, g.hit[1] + g.hit[3] - y1].map(v =>
            Math.round(v)
          );
          if (hd.some(v => Math.abs(v) > 2)) ok = false;
        }
        if (!ok) bad++;
        rep.push({
          id,
          n: e.n,
          spec: e.r,
          got: g.r || null,
          d,
          hit: e.hit,
          hitGot: g.hit || null,
          hd,
          f: e.f,
          fs: g.fs,
          fw: g.fw,
          col: g.col,
          bg: g.bg,
          tk: e.tk,
          ok,
          miss: !!g.miss,
          vis: g.vis
        });
      }
      const plates = await p.evaluate(() => (G.plates || []).map(q => ({ n: q.t, c: q.c, star: q.star, r: q.r })));
      fs.writeFileSync(
        path.join(OUT, `measure_${fn}.json`),
        JSON.stringify({ sha: SHA, st, tag, errs, rep, plates }, null, 1)
      );
      const nb = rep.filter(x => !x.ok);
      console.log(
        `${nb.length ? '❌' : '✅'} ${st} ${tag}：${rep.length - nb.length}／${rep.length} 框在 ±2 px 內${nb.length ? '；不符 ' + nb.map(x => `${x.id}(${x.miss ? '沒有' : !x.vis ? '沒畫' : x.d.join(',') + (x.hd ? ' 熱區 ' + x.hd.join(',') : '')})`).join(' ') : ''}${errs.length ? '；頁面錯誤 ' + errs.join(' / ') : ''}`
      );
      await ctx.close();
    }
  await b.close();
  process.exit(bad ? 1 : 0);
})();
