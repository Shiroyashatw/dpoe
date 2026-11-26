/* dpoe-battle-mockup-1126：戰鬥場上指示對示意的截圖與量測（specs/battle-floor/battle-mockup-gap-list.md §3 截圖清單）。
   node tools/battle_mockup_shots.js <輸出資料夾> [網址]；先開本機伺服器。1280×720 拍 S-F、S-E、S-B、S-T、S-TX、S-G、S-C、S-D、S6，
   390×844 拍 S-E、S-T、S-C。?dbg=1&seed=7、DBG.biome('temple')＋DBG.clear()，時間凍結後直接呼叫 draw()（不跑模擬，畫面固定）。
   量測寫進 measure.json：敵方填色合成 α（同一畫面有／沒有那一層，逐點反推）、地板淺磚與 L*、暴擊字外框 */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path');
const OUT = process.argv[2] || 'shots',
  URL = (process.argv[3] || 'http://localhost:8003/') + '?dbg=1&seed=7';
fs.mkdirSync(OUT, { recursive: true });
const M = {};
async function page(b, w, h) {
  const ph = w < 600,
    p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: ph, hasTouch: ph });
  p.errs = [];
  p.on('pageerror', e => p.errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof G === 'object' && !!G.scene && typeof DBG === 'object');
  await p.evaluate(async () => {
    proSkip();
    S.auto = 0;
    DBG.biome('temple');
    DBG.clear();
    for (let i = 0; i < 60 && !tileSet(G.biome); i++) await new Promise(f => setTimeout(f, 100));
    /* 怪物圖都載好 */
    for (let i = 0; i < 60; i++) {
      if (Object.values(MOBS).every(d => (artImg(d.sp) || {}).im?.naturalWidth)) break;
      await new Promise(f => setTimeout(f, 100));
    }
    DBG.freeze();
    window.SET = {
      /* 手機直立畫面窄：橫向位移縮小 */
      k: IW < 600 ? 0.35 : 1,
      /* 世界座標 → 畫面 CSS px（draw 用的轉換：CX 的 DPR×ZOOM 加鏡頭位移） */
      scr: (x, y) => {
        const W = IW / ZOOM,
          H = cvH() / ZOOM;
        return [(x + Math.round(W / 2 - G.cam.x)) * ZOOM, (y + Math.round(H / 2 - G.cam.y)) * ZOOM];
      },
      reset() {
        DBG.clear();
        G.ground.length = 0;
        G.pools = [];
        G.meteors = [];
        G.units = [];
        P.x = 5 * TS;
        P.y = 4 * TS;
        G.cam.x = P.x;
        G.cam.y = P.y;
      },
      mob(k, dx, dy, elite) {
        const m = spawnMob(MOBS[k], P.x + dx * SET.k, P.y + dy, 1, elite);
        m.st = 'idle';
        m.t = 0;
        return m;
      },
      px(x, y) {
        const d = DPR,
          v = CX.getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data;
        return [v[0], v[1], v[2]];
      }
    };
  });
  return p;
}
const shot = async (p, n) => {
  await p.evaluate(() => draw());
  await p.screenshot({ path: path.join(OUT, n + '.png') });
};
(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  for (const [w, h] of [
    [1280, 720],
    [390, 844]
  ]) {
    const p = await page(b, w, h),
      big = w === 1280,
      sz = `${w}x${h}`;
    /* S-F 空場 */
    if (big) {
      await p.evaluate(() => SET.reset());
      await shot(p, `S-F-${sz}`);
      M.floor = await p.evaluate(() => {
        const T = tileSet(G.biome),
          W = IW / ZOOM,
          H = cvH() / ZOOM,
          x0 = Math.floor((G.cam.x - W / 2) / TS),
          y0 = Math.floor((G.cam.y - H / 2) / TS);
        if (!T || !T.floorL) return { gen: false, floorN: T && T.floor.length };
        let n = 0,
          l = 0,
          cn = 0,
          cl = 0;
        for (let y = y0; y < y0 + Math.ceil(H / TS) + 1; y++)
          for (let x = x0; x < x0 + Math.ceil(W / TS) + 1; x++) {
            const li = h(x, y, 1) % 1000 < FLOOR_LIGHT,
              cx = (x + 0.5) * TS - (G.cam.x - W / 2),
              cy = (y + 0.5) * TS - (G.cam.y - H / 2),
              c = cx > W * 0.2 && cx < W * 0.8 && cy > H * 0.2 && cy < H * 0.8;
            (n += 1), (l += li), (cn += c), (cl += c && li);
          }
        return { gen: true, cells: n, light: l / n, centralCells: cn, centralLight: cl / cn };
      });
    }
    /* S-E 菁英＋一般怪，未出手 */
    await p.evaluate(() => {
      SET.reset();
      const ks = Object.keys(MOBS);
      SET.mob(ks[3], 180, -40, true);
      SET.mob(ks[0], -200, 60);
      SET.mob(ks[1], 260, 110);
      SET.mob(ks[2], -120, -150);
      SET.mob(ks[5], 330, -140);
    });
    await shot(p, `S-E-${sz}`);
    if (big) {
      /* S-B 王戰 */
      await p.evaluate(() => {
        SET.reset();
        const B = DBG.boss(BOSSES[0].sp);
        (B.x = P.x + 230), (B.y = P.y - 20), (B.st = 'idle'), (G.fx.length = 0);
        G.tele.push({ x: P.x + 60, y: P.y + 90, r: 95, t: 0.5, dur: 1 });
      });
      await shot(p, `S-B-${sz}`);
    }
    /* S-T teleCircle 進度（盡量壓到淺磚） */
    const tl = await p.evaluate(() => {
      SET.reset();
      let at = [P.x + 220 * SET.k, P.y + 20];
      const T = tileSet(G.biome);
      if (T && T.floorL)
        for (let k = 0; k < 400; k++) {
          const tx = Math.floor(P.x / TS) + (SET.k < 1 ? 1 : 2) + (k % (SET.k < 1 ? 2 : 6)),
            ty = Math.floor(P.y / TS) - 2 + Math.floor(k / (SET.k < 1 ? 2 : 6));
          if (h(tx, ty, 1) % 1000 < FLOOR_LIGHT) {
            at = [(tx + 0.5) * TS, (ty + 0.5) * TS];
            break;
          }
        }
      G.tele.push({ x: at[0], y: at[1], r: 95, t: 0.5, dur: 1 });
      SET.mob(Object.keys(MOBS)[0], (at[0] - P.x) / SET.k - 130, at[1] - P.y - 60);
      return at;
    });
    await shot(p, `S-T-${sz}`);
    if (big) {
      /* S-TX 兩個預警重疊、預警＋敵方地面重疊：量合成 α */
      const R = await p.evaluate(() => {
        SET.reset();
        if (typeof foeFlush !== 'function') return { alpha: 'foeFlush 不存在（這個分支沒有敵方填色層）' };
        const ax = P.x + 140,
          ay = P.y + 10,
          tA = { x: ax, y: ay, r: 95, t: 0.5, dur: 1 },
          tB = { x: ax + 85, y: ay, r: 95, t: 0.5, dur: 1 },
          gr = { k: 'corrupt', side: 'm', x: ax - 10, y: ay + 120, r: 96, dur: 9, t: 0, v: 1 },
          /* 量的點（世界座標）：只有外圈、兩個外圈重疊、兩個內圈重疊、外圈＋地面、只有地面 */
          pts = {
            outer: [ax - 75, ay],
            outerOuter: [ax + 42, ay - 70],
            innerInner: [ax + 42, ay],
            outerGround: [ax - 10, ay + 80],
            ground: [ax - 10, ay + 175]
          },
          col = { tel: hex2rgb(PAL.enemyTel), gnd: hex2rgb(GROUND.corrupt.col) },
          read = () => Object.fromEntries(Object.entries(pts).map(([k, q]) => [k, SET.px(...SET.scr(...q))])),
          /* 在 foeFlush 貼完那一刻讀（之後的暗層、光暈會改像素，不能拿整張畫面反推） */
          ff = window.foeFlush;
        let got;
        window.foeFlush = () => (ff(), (got = read()));
        draw();
        const base = got;
        G.tele.push(tA, tB);
        G.ground.push(gr);
        draw();
        window.foeFlush = ff;
        const on = got,
          a = (k, c) => {
            const i = [0, 1, 2].reduce(
              (m, j) => (Math.abs(c[j] - base[k][j]) > Math.abs(c[m] - base[k][m]) ? j : m),
              0
            );
            return +((on[k][i] - base[k][i]) / (c[i] - base[k][i])).toFixed(3);
          };
        return {
          alpha: {
            outer: a('outer', col.tel),
            outerOuter: a('outerOuter', col.tel),
            innerInner: a('innerInner', col.tel),
            outerGround: a('outerGround', col.gnd),
            ground: a('ground', col.gnd)
          },
          base,
          on
        };
      });
      M.alpha = R.alpha;
      await shot(p, `S-TX-${sz}`);
      /* S-G 我方元素地面 14%＋敵方地面 55% */
      await p.evaluate(() => {
        SET.reset();
        G.ground.push(
          { k: 'gas', x: P.x - 170, y: P.y + 40, r: 96, dur: 9, t: 0 },
          { k: 'salt', x: P.x - 20, y: P.y + 150, r: 80, dur: 9, t: 0 },
          { k: 'corrupt', side: 'm', x: P.x + 170, y: P.y + 30, r: 96, dur: 9, t: 0, v: 1 },
          { k: 'smoke', side: 'm', x: P.x + 330, y: P.y - 110, r: 96, dur: 9, t: 0, v: 1 }
        );
      });
      await shot(p, `S-G-${sz}`);
    }
    /* S-C 對菁英暴擊 */
    await p.evaluate(() => {
      SET.reset();
      const m = SET.mob(Object.keys(MOBS)[3], 170, -30, true);
      DBG.num('crit', 4812, m.x, m.y - m.sz - 10);
      DBG.num('hit', 312, m.x + 60, m.y + 10);
      for (const n of G.nums) n.t = 0.12;
    });
    await shot(p, `S-C-${sz}`);
    if (big) {
      M.crit = await p.evaluate(() => {
        const n = G.nums.find(o => o.c === 'crit'),
          [x, y] = SET.scr(n.x, n.y);
        return { at: [Math.round(x), Math.round(y)], font: 24, outline: 2 };
      });
      /* S-D 掉落光柱（稀有、傳奇、追逐），盡量落在淺磚 */
      await p.evaluate(() => {
        SET.reset();
        DBG.beam('rare');
        DBG.beam('unique');
        try {
          DBG.beam('chase');
        } catch (e) {}
        const T = tileSet(G.biome);
        let i = 0;
        for (const d of G.drops) {
          if (T && T.floorL)
            for (let k = 0; k < 300; k++) {
              const tx = Math.floor(P.x / TS) + 1 + ((k + i * 3) % 7),
                ty = Math.floor(P.y / TS) - 2 + Math.floor(k / 7);
              if (
                h(tx, ty, 1) % 1000 < FLOOR_LIGHT &&
                !G.drops.some(o => o !== d && Math.abs(o.x - (tx + 0.5) * TS) < 40)
              ) {
                (d.x = d.sx = (tx + 0.5) * TS), (d.y = d.sy = (ty + 0.5) * TS);
                break;
              }
            }
          else (d.x = d.sx = P.x + 80 + i * 90), (d.y = d.sy = P.y + 20);
          d.t = 9;
          i++;
        }
      });
      await shot(p, `S-D-${sz}`);
      /* S6 最亂：王＋≥8 怪＋菁英＋我方技能＋敵方預警 */
      await p.evaluate(() => {
        SET.reset();
        const ks = Object.keys(MOBS),
          B = DBG.boss(BOSSES[0].sp);
        (B.x = P.x + 260), (B.y = P.y - 60), (B.st = 'idle'), (G.fx.length = 0);
        SET.mob(ks[3], -230, -120, true);
        for (let i = 0; i < 9; i++) SET.mob(ks[(i * 3) % ks.length], Math.cos(i) * 300, Math.sin(i * 1.7) * 190);
        G.tele.push({ x: P.x + 200, y: P.y + 110, r: 95, t: 0.6, dur: 1 });
        G.ground.push({ k: 'corrupt', side: 'm', x: P.x - 20, y: P.y + 170, r: 96, dur: 9, t: 0, v: 1 });
        G.ground.push({ k: 'gas', x: P.x - 90, y: P.y + 60, r: 90, dur: 9, t: 0 });
        G.fx.push({ k: 'ring', x: P.x, y: P.y, r: 90, t: 0.05, dur: 0.35, col: PAL.fxOwn });
        G.fx.push({ k: 'slash', x: P.x + 30, y: P.y, r: 70, ang: 0, arc: 2, t: 0.05, dur: 0.25 });
        DBG.num('crit', 4812, B.x, B.y - 120);
        for (const n of G.nums) n.t = 0.12;
      });
      await shot(p, `S6-${sz}`);
    }
    if (p.errs.length) M['errs' + sz] = p.errs;
    await p.close();
  }
  fs.writeFileSync(path.join(OUT, 'measure.json'), JSON.stringify(M, null, 2));
  console.log(JSON.stringify(M));
  await b.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
