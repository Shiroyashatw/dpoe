/* num-m2-boss-sig：王的招牌招接上 BOSS_NEAR／BOSS_FAR 前後的實打（Playwright＋遊戲自己的 AI 自動打）。
   不改 js/：所有改動都在頁面記憶體裡（WIRED 把 5 招加進 BOSS_NEAR/BOSS_FAR 物件；FIX 另外照 FIX 環境變數 eval）。
   用法：node boss_fight.js <boss> <BASE|WIRED|FIX> <場數> <寬> <高> <輸出 .jsonl> [起始編號]
     boss：taotie qiongqi taowu hundun zhulong zhu9
   每場：配裝（builds/L55.json 或 L70.json）放進存檔 → 進王場（S.arena；四凶另外換成那隻凶＋凶地的地圖詞）→ 2 秒後出王 → AI 自動打到王死／玩家倒下／出王後 CAP 秒 */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path');
const [BOSS, SCEN, N, VW, VH, OUT, START] = process.argv.slice(2);
const URL = process.env.URL || 'http://localhost:8000/',
  CAP = +process.env.CAP || 300,
  MOB = +VW < 900;
const XI4 = ['taotie', 'qiongqi', 'taowu', 'hundun'];
/* 四凶：凶地 need 55（world.js SPECIAL）；燭龍：四凶之鱗開，打完凶地時的地點等級 55；燭九陰：XI.uberLv 70 */
const LV = { taotie: 55, qiongqi: 55, taowu: 55, hundun: 55, zhulong: 55, zhu9: 70 };
const L = LV[BOSS];
const build = JSON.parse(fs.readFileSync(path.join(__dirname, 'builds', `L${L}${process.env.BUILD || ''}.json`), 'utf8'));
/* WIRED：近身表只放以王為中心的圈（同 dread、repel 的近身限定），遠近都能用的放兩邊（同 blink、laugh、wrath） */
const WIRE = { near: ['devour', 'gale', 'unstop', 'chaosjump', 'daynight'], far: ['gale', 'unstop', 'chaosjump', 'daynight'] };

function install() {
  const R = (window.__R = { fights: [], cur: null, ctx: null });
  const oBoss = bossAI,
    oHurt = hurtPlayer,
    oArea = mobArea;
  let fid = 0;
  window.bossAI = function (m, dt) {
    const F = R.cur;
    const st0 = m.st,
      n0 = m.night,
      nt = G.tele.length,
      ns = G.shots.length;
    R.ctx = m.__tag || null;
    oBoss(m, dt);
    if (F && (st0 === 'idle' || st0 === 'move') && m.st === 'wind') {
      const tag = m.pat === 'charge' && m.unstopT > G.t ? 'unstop:charge' : m.pat;
      m.__tag = tag;
      m.__fid = ++fid;
      F.fires.push({ id: fid, p: tag, t: G.t, w: +m.t.toFixed(3) });
    }
    for (let i = nt; i < G.tele.length; i++) {
      const t = G.tele[i];
      if (t.r === 58 && n0 && !m.night) (t.__tag = 'daynight:fire'), (t.__fid = m.__nightFid);
      else (t.__tag = m.__tag || m.pat), (t.__fid = m.__fid);
    }
    for (let i = ns; i < G.shots.length; i++) {
      const s = G.shots[i];
      if (s.foe) (s.__tag = m.__tag || m.pat), (s.__fid = m.__fid);
    }
    if (!n0 && m.night) m.__nightFid = m.__fid;
    R.ctx = null;
  };
  window.mobArea = function (m, x, y, r, d, noEv, el) {
    const t = G.tele.find(t => t.done && t.src === m && t.x === x && t.y === y && t.r === r);
    const p = R.ctx;
    R.ctx = t ? { tag: t.__tag, fid: t.__fid } : p;
    try {
      oArea(m, x, y, r, d, noEv, el);
    } finally {
      R.ctx = p;
    }
  };
  window.hurtPlayer = function (d, src, el, noEv) {
    const F = R.cur;
    let tag = 'other',
      id = null;
    if (src && src.foe && src.__tag) (tag = src.__tag), (id = src.__fid);
    else if (R.ctx && typeof R.ctx === 'object') (tag = R.ctx.tag), (id = R.ctx.fid);
    else if (R.ctx && src && src.boss) (tag = R.ctx), (id = src.__fid);
    else if (src && src.boss) tag = 'boss:other';
    /* FIX：某一招的傷害倍率在記憶體裡縮放（等同改 game.js 那一行的倍率） */
    if (F && R.dmgScale && R.dmgScale[tag]) d *= R.dmgScale[tag];
    const b = P.hp + (P.es || 0);
    oHurt(d, src, el, noEv);
    const loss = b - Math.max(0, P.hp) - (P.es || 0);
    if (F && loss > 0) F.hits.push({ p: tag, id, t: +G.t.toFixed(2), l: Math.round(loss) });
  };
}

function setup(cfg) {
  const R = window.__R;
  closePanels && closePanels();
  const s = JSON.parse(cfg.S);
  Object.assign(S, s);
  S.asc = null;
  S.at = [];
  S.auras = [null];
  S.charms = [null, null, null];
  S.skills = Array.from({ length: NSLOT }, newSlot);
  S.skills[0].k = 'slash';
  S.lib = { sk: { slash: cfg.gemLv }, sup: {}, aura: {}, aw: {}, sup2: {} };
  S.auto = 1;
  S.story.tips = 0;
  S.node = S.card = null;
  S.arena = cfg.boss === 'zhu9' ? 'zhu9' : 'zhulong';
  P.hp = 0;
  enterMap(lvT(cfg.L));
  if (cfg.fiend) {
    G.fiend = cfg.fiend;
    G.fdB = xiBoss(cfg.fiend);
    for (const [f, v] of Object.entries({ ...XIONG_MOD[G.fiend].fx, ...XIONG_MOD[G.fiend].rew }))
      G.mm[f] = typeof v === 'string' ? v : (G.mm[f] || 0) + v;
  }
  ST = stats();
  P.hp = ST.hp;
  P.es = ST.es;
  P.mp = ST.mp;
  R.cur = { fires: [], hits: [], mhp: ST.hp, mes: ST.es || 0, spawn: null, end: null, res: null };
  return { hp: ST.hp, es: ST.es, fdB: G.fdB.n, mapT: G.mapT };
}
function poll(cap) {
  const F = window.__R.cur,
    b = F.spawn == null ? G.mobs.find(m => m.boss) : window.__B;
  if (b && F.spawn == null)
    (window.__B = b), (F.spawn = G.t), (F.bmhp = Math.round(b.mhp)), (F.bdmg = +b.dmg.toFixed(2)), (F.bn = b.D.n);
  if (F.res) return F.res;
  if (G.state === 'dead') (F.res = 'dead'), (F.end = G.t);
  else if (b && (b.hp <= 0 || b.dead)) (F.res = 'win'), (F.end = G.t);
  else if (F.spawn != null && G.t - F.spawn > cap) (F.res = 'timeout'), (F.end = G.t);
  if (F.res) F.bhp = b ? Math.max(0, Math.round(b.hp)) : null;
  return F.res;
}

(async () => {
  const br = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await br.newContext({ viewport: { width: +VW, height: +VH }, hasTouch: MOB, isMobile: MOB });
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  const pg = await ctx.newPage(),
    errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.clock.install();
  await pg.goto(`${URL}?p=${90 + Math.floor(Math.random() * 9)}&${Date.now()}`);
  await pg.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof treeInit === 'function');
  await pg.clock.pauseAt(await pg.evaluate(() => Date.now() + 1000));
  await pg.evaluate(() => proSkip());
  await pg.clock.runFor(500);
  const sha = require('child_process').execSync('git rev-parse HEAD', { cwd: __dirname }).toString().trim();
  await pg.evaluate(install);
  await pg.evaluate(
    ([scen, W, fix]) => {
      if (scen !== 'BASE') {
        for (const k of W.near) BOSS_NEAR[k] = 1;
        for (const k of W.far) BOSS_FAR[k] = 1;
      }
      if (scen === 'FIX' && fix) eval(fix);
    },
    [SCEN, WIRE, process.env.FIX || '']
  );
  const out = fs.createWriteStream(OUT, { flags: 'a' });
  for (let i = 0; i < +N; i++) {
    const info = await pg.evaluate(setup, {
      S: JSON.stringify(build.S),
      gemLv: build.gemLv,
      L,
      boss: BOSS,
      fiend: XI4.includes(BOSS) ? BOSS : null
    });
    let res = null,
      guard = 0;
    while (!res && guard++ < 400) {
      await pg.clock.runFor(1000);
      res = await pg.evaluate(poll, CAP);
    }
    const F = await pg.evaluate(() => window.__R.cur);
    const rec = {
      sha,
      boss: BOSS,
      scen: SCEN,
      fix: SCEN === 'FIX' ? process.env.FIX : undefined,
      build: 'L' + L + (process.env.BUILD || ''),
      res: F.res || 'stuck',
      W: +VW,
      H: +VH,
      i: (+START || 0) + i,
      L,
      bn: F.bn,
      killT: F.spawn != null && F.end != null ? +(F.end - F.spawn).toFixed(2) : null,
      dur: F.spawn != null && F.end != null ? +(F.end - F.spawn).toFixed(2) : null,
      mhp: F.mhp,
      mes: F.mes,
      bmhp: F.bmhp,
      bdmg: F.bdmg,
      bhp: F.bhp,
      info,
      fires: F.fires,
      hits: F.hits,
      errs: errs.splice(0)
    };
    out.write(JSON.stringify(rec) + '\n');
    console.log(
      `${BOSS} ${SCEN} ${VW}x${VH} #${rec.i} ${rec.res} t=${rec.killT} fires=${F.fires.length} dmg=${F.hits.reduce((a, h) => a + h.l, 0)}/${F.mhp + F.mes}`
    );
    /* 下一場：如果停在倒下畫面／王倒下的卡片，enterMap 會重設 G.state */
  }
  out.end();
  await br.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
