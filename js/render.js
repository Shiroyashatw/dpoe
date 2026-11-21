/* dungeonPOE · 畫面：營地、地板、石頭、預警、怪物、玩家、特效、跳數字、掉落標籤、光照、小地圖 */
'use strict';
/* 飄字數字照 number-abbrev 縮寫（獲得，捨去）；abbr 在 hud.js，render.js 單獨載入時（check.js 的繪製順序測試）照寫整數 */
const numT = v => (typeof v === 'number' && typeof abbr === 'function' ? abbr(v, 'own') : v);
/* '#rrggbb' → '255,0,0'（拼 rgba 用） */
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
/* 畫圖：腳底在 (x, y)，高度 hgt，flip 左右翻；圖用 sprites.js 的大圖（用到才載） */
function spr(n, x, y, hgt, o = {}) {
  const a = artImg(n);
  if (!a || !a.im.complete || !a.im.naturalWidth) return;
  const r = a.r,
    sc = hgt / r[3],
    w = r[2] * sc * (o.sx || 1),
    h = hgt * (o.sy || 1);
  CX.save();
  CX.translate(Math.round(x), Math.round(y));
  if (o.flip) CX.scale(-1, 1);
  if (o.a != null) CX.globalAlpha = o.a;
  if (o.white) {
    /* 閃白：artSprite 的白色版（留 1 格邊、貼底） */
    const c = artSprite('a_' + n, 1),
      k = hgt / (c.height - 2);
    CX.drawImage(
      c,
      (-c.width * k * (o.sx || 1)) / 2,
      -c.height * k * (o.sy || 1) + k,
      c.width * k * (o.sx || 1),
      c.height * k * (o.sy || 1)
    );
  } else CX.drawImage(a.im, r[0], r[1], r[2], r[3], -w / 2, -h, w, h);
  CX.restore();
}
/* 主角：PixelLab 的角色表（img/hero.png，720×720、每格 80×80、腳底在 y=63；art/hero/hero.json）
   0 八個方向（南、東南、東、東北、北、西北、西、西南）、1 待機、2 滑步（翻滾，原圖朝左）、3 揮砍、4 跳起砸地、5 施法、
   6 跑步（朝右，往左鏡像）、7 往上跑（背面）、8 旋轉揮擊；出手動畫都朝右下，往左就鏡像 */
const ACT_ROW = {
  slash: 3,
  iai: 3,
  quake: 4,
  whirl: 8,
  thrust: 3,
  combo: 8,
  split: 5,
  refract: 5,
  frostbolt: 5,
  arc: 5,
  nova: 5,
  fireball: 5,
  mirage: 5,
  axethrow: 5,
  rend: 3,
  sickle: 3,
  vanguard: 3,
  tidepull: 5,
  allin: 5,
  gasflask: 5,
  windflask: 5,
  stoneflask: 5,
  cleave: 4,
  warcry: 5,
  seiscry: 5,
  cmd_wolf: 5,
  cmd_golem: 5,
  smash: 4,
  leap: 4,
  fissure: 4,
  thunder: 4,
  spearthrow: 5,
  gasarrow: 5,
  apshot: 5,
  grenade: 5,
  flyswords: 5,
  shadowstrike: 3,
  clawchain: 3,
  blindpounce: 3,
  chainsweep: 8,
  banner: 5,
  chaosbolt: 5,
  corpseboom: 5,
  paperdoll: 5,
  bearmaul: 3,
  wolfpounce: 3,
  venom: 5,
  meteor: 5,
  wolf: 5
};
const HERO_IMG = new Image();
let HERO_W, HERO_P;
/* 單色剪影：受傷閃白用的白色版、被特效蓋到時外框用的 --sel-tx 版（M2-05.4a） */
function heroTint(col) {
  const c = document.createElement('canvas');
  c.width = HERO_IMG.width;
  c.height = HERO_IMG.height;
  const g = c.getContext('2d');
  g.drawImage(HERO_IMG, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = col;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
HERO_IMG.onload = () => {
  HERO_W = heroTint(PAL.glint);
  HERO_P = heroTint(cssv('--sel-tx'));
};
HERO_IMG.src = 'img/hero.png?v=' + VER;
const HSC = 1.35;
function heroCell(row, col, x, y, flip, al, o = {}) {
  const im = o.im || (o.white ? HERO_W : HERO_IMG);
  if (!im || !HERO_IMG.complete || !HERO_IMG.naturalWidth) return;
  CX.save();
  CX.translate(Math.round(x), Math.round(y));
  if (flip) CX.scale(-1, 1);
  if (al != null) CX.globalAlpha = al;
  CX.scale(o.sx || 1, o.sy || 1);
  CX.drawImage(im, col * 80, row * 80, 80, 80, -40 * HSC, -63 * HSC, 80 * HSC, 80 * HSC);
  CX.restore();
}
/* 角度 → 第 0 列的方向格 */
const dirCol = a => (2 - (((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8) + 8) % 8;
let DARK;
let ZOOM = 1.35; /* 手機照螢幕高度調（main.js 的 resize） */
function draw() {
  const SW = IW,
    SH = cvH(),
    W = SW / ZOOM,
    H = SH / ZOOM;
  CX.setTransform(DPR * ZOOM, 0, 0, DPR * ZOOM, 0, 0);
  CX.imageSmoothingEnabled = false;
  CX.fillStyle = PAL.sceneVoidV14;
  CX.fillRect(0, 0, W + 1, H + 1);
  const tr = G.trauma * G.trauma,
    sx = (Math.random() * 2 - 1) * 14 * tr,
    sy = (Math.random() * 2 - 1) * 14 * tr,
    ox = Math.round(W / 2 - G.cam.x + sx),
    oy = Math.round(H / 2 - G.cam.y + sy);
  CX.save();
  CX.translate(ox, oy);
  /* 地板、地上細節、牆、擺設（場景在 biome.js） */
  if (G.scene === 'camp') drawHideout(W, H);
  else {
    CX.strokeStyle = PAL.panelRaised2V2;
    CX.lineWidth = 6;
    CX.strokeRect(-3, -3, G.W + 6, G.H + 6);
    bStatic(W, H);
    bDecals(W, H);
  }
  bDeco(W, H);
  /* 地面效果、屍體、殘留物、榴彈、幻影、旗幟、飛劍（mech.js） */
  if (G.ground) drawMech();
  /* 預警：怪物出手前地上的紅色範圍 */
  CX.lineWidth = 2;
  for (const m of G.mobs) {
    if (m.st !== 'wind') continue;
    const D = m.D,
      wind = m.boss ? 0.75 : D.wind,
      f = clamp(1 - m.t / wind, 0, 1);
    if (m.boss && (m.pat === 'slam' || m.pat === 'line')) continue;
    if (D.ai === 'bomb') {
      teleCircle(m.x, m.y, D.boom, f);
      continue;
    }
    if (m.boss && m.pat === 'blink') {
      CX.strokeStyle = `rgba(${PAL.rgb.elChaos},${0.3 + 0.6 * f})`;
      CX.beginPath();
      CX.arc(m.tx, m.ty, m.r * (1.6 - f * 0.6), 0, TAU);
      CX.stroke();
      continue;
    }
    if (m.boss && m.pat === 'nova') {
      /* 彈幕環：畫出每一發的方向，缺口看得到 */
      CX.strokeStyle = `rgba(${PAL.rgb.badV1},${0.25 + 0.5 * f})`;
      CX.beginPath();
      for (let i = 0; i < NOVA_N - NOVA_GAP; i++) {
        const a = novaAng(m, i);
        CX.moveTo(m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r);
        CX.lineTo(m.x + Math.cos(a) * (m.r + 60 + 120 * f), m.y + Math.sin(a) * (m.r + 60 + 120 * f));
      }
      CX.stroke();
      continue;
    }
    if (D.ai === 'lunge' || (m.boss && m.pat === 'charge')) {
      const len = m.boss ? 520 : D.reach + 20,
        wd = m.r * 1.6;
      CX.save();
      CX.translate(m.x, m.y);
      CX.rotate(m.ang);
      CX.fillStyle = `rgba(${PAL.rgb.badV1},${0.12 + 0.18 * f})`;
      CX.fillRect(0, -wd / 2, len, wd);
      CX.fillStyle = `rgba(${PAL.rgb.badV1},0.35)`;
      CX.fillRect(0, -wd / 2, len * f, wd);
      CX.restore();
    } else if (D.ai === 'slam') {
      const x = m.x + Math.cos(m.ang) * 55,
        y = m.y + Math.sin(m.ang) * 55;
      teleCircle(x, y, 95, f);
    } else if (D.ai === 'melee' || (m.boss && m.pat === 'swipe')) {
      const R = m.boss ? 150 : D.reach + 10;
      CX.fillStyle = `rgba(${PAL.rgb.badV1},${0.1 + 0.25 * f})`;
      CX.beginPath();
      CX.moveTo(m.x, m.y);
      CX.arc(m.x, m.y, R, m.ang - 1.2, m.ang + 1.2);
      CX.closePath();
      CX.fill();
    } else if (D.ai === 'ranged' || D.ai === 'fan') {
      CX.strokeStyle = `rgba(${PAL.rgb.elColdV3},${0.2 + 0.5 * f})`;
      CX.setLineDash([6, 6]);
      CX.beginPath();
      for (const da of D.ai === 'fan' ? [-0.3, 0, 0.3] : [0]) {
        CX.moveTo(m.x, m.y - m.sz * 0.5);
        CX.lineTo(m.x + Math.cos(m.ang + da) * 260, m.y - m.sz * 0.5 + Math.sin(m.ang + da) * 260);
      }
      CX.stroke();
      CX.setLineDash([]);
    }
  }
  for (const t of G.tele) teleCircle(t.x, t.y, t.r, t.t / t.dur);
  /* 愛的紅線（0.2.79）：牽著的小怪還活著就畫一條線連到七情王 */
  for (const m of G.mobs)
    if (m.tether && m.hp > 0 && m.tether.hp > 0) {
      CX.strokeStyle = `rgba(${PAL.rgb.badV1},0.75)`;
      CX.lineWidth = 2;
      CX.beginPath();
      CX.moveTo(m.x, m.y - m.sz * 0.4);
      CX.lineTo(m.tether.x, m.tether.y - m.tether.sz * 0.4);
      CX.stroke();
    }
  /* 毒刃雨：紫色範圍＋落下的刀光；雷暴（p.wet）同一種畫法，換成藍色 */
  for (const p of G.pools || []) {
    const a = Math.min(1, (p.dur - p.t) * 2);
    CX.fillStyle = p.wet ? `rgba(${PAL.rgb.fxRender1},${0.16 * a})` : `rgba(${PAL.rgb.fxRender2},${0.16 * a})`;
    CX.beginPath();
    CX.ellipse(p.x, p.y, p.r, p.r * 0.7, 0, 0, TAU);
    CX.fill();
    CX.strokeStyle = p.wet ? `rgba(${PAL.rgb.elColdV4},${0.5 * a})` : `rgba(${PAL.rgb.elChaosV2},${0.5 * a})`;
    CX.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const k = (G.t * 3 + i * 0.37) % 1,
        x = p.x + Math.cos(i * 2.1 + p.x) * p.r * 0.6,
        y = p.y + Math.sin(i * 1.7 + p.y) * p.r * 0.4;
      CX.beginPath();
      CX.moveTo(x, y - 60 + k * 50);
      CX.lineTo(x, y - 48 + k * 50);
      CX.stroke();
    }
  }
  /* 陷阱、地雷、砲塔圖騰、圖騰 */
  for (const u of G.units || []) drawUnit(u);
  /* 隕石：落點的橘圈越來越滿，球從上面掉下來 */
  for (const o of G.meteors || []) {
    const f = Math.min(1, o.t / o.dur);
    CX.strokeStyle = `rgba(${PAL.rgb.elFire},0.7)`;
    CX.lineWidth = 2;
    CX.beginPath();
    CX.ellipse(o.x, o.y, o.r, o.r * 0.7, 0, 0, TAU);
    CX.stroke();
    CX.fillStyle = `rgba(${PAL.rgb.badHiV1},${0.1 + 0.2 * f})`;
    CX.beginPath();
    CX.ellipse(o.x, o.y, o.r * f, o.r * 0.7 * f, 0, 0, TAU);
    CX.fill();
    CX.fillStyle = PAL.rarChaseHiV1;
    CX.beginPath();
    CX.arc(o.x + (1 - f) * 120, o.y - (1 - f) * 360, 14, 0, TAU);
    CX.fill();
  }
  /* 傳送門：地圖裡的＝回家（藍） */
  if (G.portal) {
    const p = G.portal;
    CX.fillStyle = p.home ? `rgba(${PAL.rgb.rarMagicV2},0.18)` : `rgba(${PAL.rgb.elChaos},0.18)`;
    CX.beginPath();
    CX.ellipse(p.x, p.y, 46, 20, 0, 0, TAU);
    CX.fill();
    for (let i = 0; i < 3; i++) {
      CX.strokeStyle = p.home
        ? `rgba(${PAL.rgb.dodgeVignetteV1},${0.7 - i * 0.2})`
        : `rgba(${PAL.rgb.elChaos},${0.7 - i * 0.2})`;
      CX.lineWidth = 3;
      CX.beginPath();
      CX.ellipse(p.x, p.y, 34 + i * 8 + Math.sin(G.t * 3 + i) * 3, 14 + i * 3, 0, 0, TAU);
      CX.stroke();
    }
  }
  /* 掉落（地上的光點；光柱在暗層之後 drawBeams） */
  for (const d of G.drops) {
    const [x, y] = dropXY(d);
    if (d.gold) spr('mat_gold', x, y + 8, 22);
    else if (d.chase) {
      /* 追逐物品（M2-19.2b）：橘色雙線光柱 360（0.24 秒長出來）＋地上慢轉的虛線印環、落地擴散一圈；地上不寫字；減少動態不轉不呼吸 */
      const rm = reduced(),
        k = (d.t - 0.35) / 0.5;
      CX.save();
      CX.translate(x, y + 8);
      CX.fillStyle = `rgba(${PAL.rgb.rarChase},0.18)`;
      CX.beginPath();
      CX.ellipse(0, 0, 30, 12, 0, 0, TAU);
      CX.fill();
      CX.strokeStyle = `rgba(${PAL.rgb.rarChase},0.9)`;
      CX.lineWidth = 2;
      CX.setLineDash([6, 4]);
      if (!rm) CX.lineDashOffset = -G.t * 30;
      CX.stroke();
      CX.setLineDash([]);
      if (!rm && k > 0 && k < 1) {
        CX.strokeStyle = `rgba(${PAL.rgb.rarChase},${0.8 * (1 - k)})`;
        CX.beginPath();
        CX.ellipse(0, 0, 30 + 34 * k, 12 + 14 * k, 0, 0, TAU);
        CX.stroke();
      }
      CX.restore();
      spr(d.chase, x, y + 8, 32);
    } else if (d.show) {
      /* 稀有通貨（0.4.1）：金色光柱（完美更高，drawBeams）＋圖示 */
      spr(d.show === 'pack' ? 'soulpack' : CUR[d.show].ic, x, y + 8, 26);
    } else {
      const col = RCOL[d.it.r];
      spr(itemIc(d.it), x, y + 10, 26);
      CX.fillStyle = col;
      CX.globalAlpha = d.it.r === 2 ? 0.5 : 0.25;
      CX.beginPath();
      CX.ellipse(x, y + 8, 16, 6, 0, 0, TAU);
      CX.fill();
      CX.globalAlpha = 1;
    }
  }
  /* 角色們（照 y 排序） */
  const ents = G.mobs
    .filter(m => m.hp > 0)
    .concat(
      [P],
      (G.allies || []).filter(w => !w.dead),
      G.npcs
    );
  ents.sort((a, b) => a.y - b.y);
  /* 畫面外的不畫（留 150 給大隻的王與頭上的圖示） */
  const vx0 = G.cam.x - W / 2 - 150,
    vx1 = G.cam.x + W / 2 + 150,
    vy0 = G.cam.y - H / 2 - 150,
    vy1 = G.cam.y + H / 2 + 250;
  for (const e of ents)
    if (e === P) drawHero();
    else if (e.x > vx0 && e.x < vx1 && e.y > vy0 && e.y < vy1) e.npc ? drawNpc(e) : e.src ? drawWolf(e) : drawMob(e);
  if (G.scene === 'camp') hideFront();
  /* 投射物 */
  for (const s of G.shots) {
    /* 有 pixelfx 投射物圖（箭、子彈、飛斧…）就照方向畫序列圖 */
    if (s.sh && FXS[s.sh] && drawSh(s.sh, s.x, s.y, s.shs || 1, s.ang, Math.floor((G.t * FXS[s.sh].fps) % FXS[s.sh].n)))
      continue;
    /* 丟出去的裝備（擲斧、盾牌投擲）：畫那件裝備的圖示，轉著飛 */
    const sp = s.spin && artImg(s.spin);
    if (sp && sp.im.naturalWidth) {
      const z = s.spz || 34;
      CX.save();
      CX.translate(s.x, s.y);
      CX.rotate(G.t * 18);
      CX.drawImage(sp.im, sp.r[0], sp.r[1], sp.r[2], sp.r[3], -z / 2, -z / 2, z, z);
      CX.restore();
      continue;
    }
    if (s.wave || s.bolt) {
      CX.save();
      CX.translate(s.x, s.y);
      CX.rotate(s.ang);
      CX.fillStyle = s.bolt ? PAL.rarNormalV1 : ELC[s.wave];
      CX.fillRect(-16, -2, 26, 4);
      CX.globalAlpha = 0.35;
      CX.fillRect(-34, -4, 22, 8);
      CX.restore();
      CX.globalAlpha = 1;
      continue;
    }
    if (s.cold) {
      CX.fillStyle = `rgba(${PAL.rgb.elCold},0.3)`;
      CX.beginPath();
      CX.arc(s.x, s.y, 16, 0, TAU);
      CX.fill();
      CX.fillStyle = PAL.glintV3;
      CX.beginPath();
      CX.arc(s.x, s.y, 7, 0, TAU);
      CX.fill();
      continue;
    }
    if (s.fire) {
      CX.fillStyle = `rgba(${PAL.rgb.elFire},0.3)`;
      CX.beginPath();
      CX.arc(s.x, s.y, 20, 0, TAU);
      CX.fill();
      CX.fillStyle = PAL.warmGlintV1;
      CX.beginPath();
      CX.arc(s.x, s.y, 9, 0, TAU);
      CX.fill();
    } else if (s.foe) {
      CX.fillStyle = `rgba(${PAL.rgb.elColdV3},0.25)`;
      CX.beginPath();
      CX.arc(s.x, s.y, s.r * 2.2, 0, TAU);
      CX.fill();
      CX.fillStyle = PAL.hlV1;
      CX.beginPath();
      CX.arc(s.x, s.y, s.r, 0, TAU);
      CX.fill();
    } else {
      CX.save();
      CX.translate(s.x, s.y);
      CX.rotate(s.ang);
      CX.fillStyle = `rgba(${PAL.rgb.elColdV5},0.25)`;
      CX.fillRect(-40, -3, 40, 6);
      CX.fillStyle = s.pink ? PAL.fxRender3 : PAL.glintV4;
      CX.beginPath();
      CX.moveTo(14, 0);
      CX.lineTo(-6, -7);
      CX.lineTo(-2, 0);
      CX.lineTo(-6, 7);
      CX.closePath();
      CX.fill();
      CX.restore();
    }
  }
  drawFx();
  if (G.scene === 'map') drawFront();
  /* 跳數字、怪物生命條：白天畫在暗層之後看得清楚；燭龍閉眼（天黑）與蚩尤大霧期間照舊被壓暗（玩法；製作人 2026-11-17 19:46） */
  const night = G.night > G.t,
    fog = !night && G.fog > G.t; /* 蚩尤的大霧（0.2.81）：比天黑淺、看得比較遠 */
  if (night || fog) drawBars(), drawNums();
  CX.globalAlpha = 1;
  drawAim();
  drawPrompts();
  CX.restore();
  /* 光照：玩家周圍亮、遠處暗 */
  /* 暗層只有柔和的漸層：用 1/4 解析度畫再放大（全解析度每格三次全螢幕填色太貴），座標照畫布像素 */
  const DS = 4;
  if (!DARK || DARK.cw !== CV.width || DARK.ch !== CV.height) {
    DARK = document.createElement('canvas');
    DARK.width = Math.ceil(CV.width / DS);
    DARK.height = Math.ceil(CV.height / DS);
    (DARK.cw = CV.width), (DARK.ch = CV.height);
  }
  const dg = DARK.getContext('2d'),
    px = (P.x + ox) * DPR * ZOOM,
    py = (P.y - 20 + oy) * DPR * ZOOM;
  dg.setTransform(1 / DS, 0, 0, 1 / DS, 0, 0);
  dg.globalCompositeOperation = 'source-over';
  dg.clearRect(0, 0, CV.width, CV.height);
  /* 燭龍閉眼（0.2.80）：天黑，只剩你身邊看得到 */
  dg.fillStyle = `rgba(${BIO().dark},${night ? 0.96 : fog ? 0.9 : G.scene === 'camp' ? 0.45 : 0.74})`;
  dg.fillRect(0, 0, CV.width, CV.height);
  dg.globalCompositeOperation = 'destination-out';
  const R = (night ? 260 : fog ? 340 : 560) * DPR * ZOOM,
    g = dg.createRadialGradient(px, py, 40 * DPR, px, py, R);
  g.addColorStop(0, `rgba(${PAL.rgb.scrim},1)`);
  g.addColorStop(0.6, `rgba(${PAL.rgb.scrim},0.85)`);
  g.addColorStop(1, `rgba(${PAL.rgb.scrim},0)`);
  dg.fillStyle = g;
  dg.fillRect(0, 0, CV.width, CV.height);
  bLights(dg, ox, oy);
  CX.setTransform(1, 0, 0, 1, 0, 0);
  CX.imageSmoothingEnabled = true;
  CX.drawImage(DARK, 0, 0, DARK.width * DS, DARK.height * DS);
  CX.imageSmoothingEnabled = false;
  bGlow(ox, oy);
  /* 暗層之後：掉落光柱一律（夜晚、大霧也看得到）；跳數字、怪物生命條只有白天 */
  CX.setTransform(DPR * ZOOM, 0, 0, DPR * ZOOM, 0, 0);
  CX.save();
  CX.translate(ox, oy);
  drawBeams();
  if (!night && !fog) drawBars(), drawNums();
  CX.restore();
  drawPlaques(ox, oy);
  CX.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.scene === 'map') drawPlates(ox, oy);
  {
    const W = SW,
      H = SH;
    /* 受傷：畫面邊緣紅；完美閃避：藍 */
    /* 低血紅邊改由戰鬥 HUD 畫（battle-hud v1.3.3 §10 L：常亮不閃，bhud.js 的 bhLowHp） */
    if (P.hurtT > 0 || G.slow > 0) {
      const a = G.slow > 0 ? 0.35 : P.hurtT / 0.35,
        vg = CX.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      vg.addColorStop(0, `rgba(${PAL.rgb.scrim},0)`);
      vg.addColorStop(1, G.slow > 0 ? `rgba(${PAL.rgb.dodgeVignette},${a})` : `rgba(${PAL.rgb.hurtVignette},${a})`);
      CX.fillStyle = vg;
      CX.fillRect(0, 0, W, H);
    }
    if (G.scene === 'map') drawMinimap(W);
  }
}
const RCOL = [PAL.borderCapV1, PAL.rarMagicV2, PAL.dmgCrit];
const RBG = [
  `rgba(${PAL.rgb.sceneVoidV1},0.95)`,
  `rgba(${PAL.rgb.rarMagicBgV1},0.95)`,
  `rgba(${PAL.rgb.rarRareBgV1},0.95)`
];
/* canvas 上的鑄鐵銀框（小地圖、互動提示），跟面板同色：外黑、內銀 */
function frameRect(x, y, w, h) {
  CX.lineWidth = 1;
  CX.strokeStyle = PAL.sceneVoidV6;
  CX.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  CX.strokeStyle = PAL.dmgMinorV4;
  CX.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function teleCircle(x, y, r, f) {
  CX.fillStyle = `rgba(${PAL.rgb.badV1},${0.08 + 0.12 * f})`;
  CX.beginPath();
  CX.arc(x, y, r, 0, TAU);
  CX.fill();
  CX.fillStyle = `rgba(${PAL.rgb.badV1},0.3)`;
  CX.beginPath();
  CX.arc(x, y, r * clamp(f, 0, 1), 0, TAU);
  CX.fill();
  CX.strokeStyle = `rgba(${PAL.rgb.dmgHurtV1},0.7)`;
  CX.beginPath();
  CX.arc(x, y, r, 0, TAU);
  CX.stroke();
}
function shadow(x, y, r) {
  CX.fillStyle = `rgba(${PAL.rgb.scrim},0.4)`;
  CX.beginPath();
  CX.ellipse(x, y, r, r * 0.38, 0, 0, TAU);
  CX.fill();
}
/* 怪物頭上的異常圖示（0.2.30）：血條上面一排，最多 6 個 */
function drawMobStates(m, y) {
  const L = mobStates(m).slice(0, 6);
  if (!L.length) return;
  /* 螢幕上約 22px：手機畫面縮得比較小，圖示要放大 */
  const s = Math.min(24, 22 / ZOOM),
    gap = 2;
  let x = m.x - ((L.length - 1) * (s + gap)) / 2;
  for (const t of L) {
    CX.fillStyle = `rgba(${PAL.rgb.scrimV6},0.82)`;
    CX.fillRect(x - s / 2 - 1, y - s - 1, s + 2, s + 2);
    spr(t.ic, x, y, s);
    /* 暗色扇形順時針掃過（剩餘越少蓋越多）、層數在右下角 */
    if (t.f < 0.995) {
      CX.save();
      CX.beginPath();
      CX.rect(x - s / 2, y - s, s, s);
      CX.clip();
      CX.fillStyle = `rgba(${PAL.rgb.scrim},0.62)`;
      CX.beginPath();
      CX.moveTo(x, y - s / 2);
      CX.arc(x, y - s / 2, s, -Math.PI / 2, -Math.PI / 2 + (1 - t.f) * TAU);
      CX.fill();
      CX.restore();
    }
    if (t.c > 1) {
      CX.font = `700 ${Math.round(s * 0.5)}px sans-serif`;
      CX.textAlign = 'right';
      CX.lineWidth = 3;
      CX.strokeStyle = PAL.scrimV1;
      CX.strokeText(t.c, x + s / 2, y);
      CX.fillStyle = PAL.glint;
      CX.fillText(t.c, x + s / 2, y);
      CX.textAlign = 'center';
    }
    x += s + gap;
  }
}
/* 折射箭矢：pixelfx 的箭（只裁箭身、不要拖尾）斜插在地上，腳下的方塊是還能觸發幾次；快消失時閃爍 */
function drawArrow(m) {
  if (m.until - G.t < 2 && Math.floor(G.t * 8) % 2) return;
  shadow(m.x, m.y, m.r * 0.7);
  const S = FXS.arrow,
    im = fxImg('arrow'),
    sc = 1.6;
  if (im.naturalWidth) {
    CX.save();
    CX.translate(m.x, m.y + 4);
    CX.rotate(1.35);
    CX.drawImage(im, 5 * S.w + 26, 0, 45, S.h, (26 - S.ox) * sc, -S.oy * sc, 45 * sc, S.h * sc);
    CX.restore();
  }
  const n = ARROW_HITS - m.fired;
  CX.fillStyle = PAL.hlV2;
  for (let i = 0; i < n; i++) CX.fillRect(Math.round(m.x - n * 4 + 1 + i * 8), Math.round(m.y + 10), 6, 6);
}
function drawMob(m) {
  if (m.arrow) return drawArrow(m);
  const D = m.D,
    fly = mobFly(m);
  shadow(m.x, m.y, m.r * 1.1);
  /* 菁英：腳下光圈；王：大光圈 */
  if (m.elite || m.boss) {
    CX.strokeStyle = m.boss ? `rgba(${PAL.rgb.badHiV2},0.6)` : `rgba(${PAL.rgb.rarMagic},0.7)`;
    CX.lineWidth = 2;
    CX.beginPath();
    CX.ellipse(m.x, m.y, m.r * 1.4, m.r * 0.55, 0, 0, TAU);
    CX.stroke();
  }
  /* 擠壓：被打扁一下、走路上下彈、蓄力時抖 */
  const bob = m.mv && !D.fly ? Math.abs(Math.sin(m.ph)) * 0.06 : 0,
    sqv = m.sq * 0.18,
    wind = m.st === 'wind' ? Math.sin(G.t * 60) * 2 : 0;
  const o = { flip: P.x > m.x, sx: 1 + sqv, sy: 1 - sqv + bob, white: m.flash > 0 };
  spr(D.sp, m.x + wind, m.y - fly, m.sz, o);
  /* 蓄力：紅光 */
  if (m.st === 'wind') {
    CX.globalAlpha = 0.25 + 0.2 * Math.sin(G.t * 30);
    CX.fillStyle = PAL.badV5;
    CX.beginPath();
    CX.arc(m.x, m.y - fly - m.sz * 0.5, m.sz * 0.35, 0, TAU);
    CX.fill();
    CX.globalAlpha = 1;
  }
  /* 印記（頭上紅色菱形）、點燃（橘色的火）；異常的 pixelfx 圖示在待做清單 */
  const ma = m.ail || {};
  if (ma.mark) {
    const y = m.y - fly - m.sz - 18;
    CX.fillStyle = ma.mark.k === 'falcon' ? PAL.dmgCrit : PAL.dmgHurtV1;
    CX.beginPath();
    CX.moveTo(m.x, y - 6);
    CX.lineTo(m.x + 5, y);
    CX.lineTo(m.x, y + 6);
    CX.lineTo(m.x - 5, y);
    CX.fill();
  }
  if (ma.ign && ma.ign.t > G.t) {
    CX.fillStyle = `rgba(${PAL.rgb.elFireV2},0.3)`;
    CX.beginPath();
    CX.ellipse(m.x, m.y - fly - m.sz * 0.4, m.r * 0.9, m.sz * 0.45, 0, 0, TAU);
    CX.fill();
  }
  drawMobStates(m, m.y - fly - m.sz - 13);
}
const mobFly = m => (m.D.fly ? 14 + Math.sin(m.ph * 0.5) * 4 : 0);
/* 怪物頭上的生命條（受傷或菁英才顯示；王用 HUD 的王血條）：draw 決定在暗層前或後畫 */
function drawBars() {
  for (const m of G.mobs) {
    if (m.hp <= 0 || m.arrow || m.boss || !(m.hp < m.mhp || m.elite)) continue;
    const w = Math.max(36, m.r * 2.4),
      y = m.y - mobFly(m) - m.sz - 8;
    CX.fillStyle = `rgba(${PAL.rgb.scrim},0.7)`;
    CX.fillRect(m.x - w / 2 - 1, y - 1, w + 2, 6);
    CX.fillStyle = m.elite ? PAL.rarMagicV2 : PAL.badV1;
    CX.fillRect(m.x - w / 2, y, (w * m.hp) / m.mhp, 4);
  }
}
/* 跳數字；減少動態時不彈、不飄（M2-05.2i） */
function drawNums() {
  CX.textAlign = 'center';
  const rm = reduced();
  for (const n of G.nums) {
    const f = n.t / 0.9,
      pop = !rm && n.t < 0.08 ? 1 + (0.08 - n.t) * 8 : 1,
      y = n.y - (rm ? 0 : 30 * Math.sqrt(f)) - (n.c === 'crit' || n.c === 'jackpot' ? 10 : 0);
    const st = {
      phys: [PAL.dmgHit, 15],
      fire: [ELC.fire, 15],
      cold: [ELC.cold, 15],
      light: [ELC.light, 15],
      chaos: [ELC.chaos, 15],
      block: [PAL.dmgMinorV2, 16],
      hit: [PAL.dmgHit, 15],
      crit: [PAL.dmgCrit, 24],
      /* 豪賭的大獎（0.2.74 賭徒）：金色、更大 */
      jackpot: [PAL.dmgCritV1, 30],
      hurt: [PAL.dmgHurt, 17],
      gold: [PAL.dmgGain, 14],
      perfect: [PAL.dmgGainV1, 26],
      ev: [PAL.dmgGainV2, 18],
      miss: [PAL.dmgMinor, 14],
      mat: [PAL.dmgGainV3, 15],
      /* 持續傷害：小、淡，跟擊中分開 */
      dot: [PAL.dmgMinorV3, 12]
    }[n.c];
    const fa = 1 - Math.max(0, f - 0.6) / 0.4;
    CX.font = `700 ${Math.round(st[1] * pop)}px "Noto Sans TC", sans-serif`;
    const txt =
      n.c === 'gold'
        ? '+' + numT(n.v) + ' 金'
        : n.c === 'jackpot'
          ? '大獎 ' + numT(n.v)
          : n.c === 'block'
            ? '格擋'
            : n.c === 'perfect'
              ? '完美閃避'
              : n.c === 'ev'
                ? '閃避'
                : n.txt || numT(n.v);
    /* 描邊比字慢淡出（M2-31 C1） */
    CX.globalAlpha = Math.min(1, fa + 0.3);
    CX.lineWidth = 4;
    CX.strokeStyle = `rgba(${PAL.rgb.scrim},0.95)`;
    CX.strokeText(txt, n.x, y);
    CX.globalAlpha = fa;
    CX.fillStyle = st[0];
    CX.fillText(txt, n.x, y);
  }
  CX.globalAlpha = 1;
}
/* 掉落飛出去的位置（0.35 秒拋物線落地） */
function dropXY(d) {
  const f = Math.min(1, d.t / 0.35);
  return [d.sx + (d.x - d.sx) * f, d.sy + (d.y - d.sy) * f - Math.sin(f * Math.PI) * 40];
}
/* 掉落光柱（追逐物品 --rar-chase M2-19.2b、稀有通貨 --rar-rare 0.4.1）：畫在暗層之後（製作人 2026-11-17 19:46），夜晚、大霧也看得到。
   有 sig_beam（M2-33-3a §4.2，灰階圖，柱頂 30% 已烘成四階淡出）就上同一個色當柱身，不然程式畫 */
const BEAMC = {};
function beamSheet(rgb) {
  if (!sigFx('sig_beam')) return null;
  let c = BEAMC[rgb];
  if (!c) {
    const im = fxImg('sig_beam');
    c = BEAMC[rgb] = document.createElement('canvas');
    (c.width = im.naturalWidth), (c.height = im.naturalHeight);
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = `rgb(${rgb})`;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(im, 0, 0);
  }
  return c;
}
function drawBeams() {
  for (const d of G.drops) {
    if (d.gold || !(d.chase || d.show)) continue;
    const [x, y] = dropXY(d),
      rgb = cssv(d.chase ? '--rar-chase-rgb' : '--rar-rare-rgb'),
      bh0 = d.chase ? 360 * Math.min(1, d.t / 0.24) : /3$/.test(d.show) ? 300 : 230,
      /* 柱頂不出場景（直立開半版面板時場景只剩上半）：最高到畫面上緣下 8，只壓高、寬照舊 */
      bh = Math.max(0, Math.min(bh0, y - (G.cam.y - cvH() / ZOOM / 2) - 8)),
      a = d.chase
        ? reduced()
          ? 0.8
          : 0.8 * (0.8 + 0.2 * Math.sin(G.t * 3 + d.sx))
        : 0.75 * (0.75 + 0.25 * Math.sin(G.t * 5 + d.sx)),
      sh = beamSheet(rgb);
    if (sh) {
      const S = FXS.sig_beam,
        i = Math.floor(G.t * S.fps) % S.n,
        k = bh0 / S.oy,
        ky = bh / S.oy;
      CX.globalAlpha = a;
      CX.drawImage(
        sh,
        (i % S.cols) * S.w,
        Math.floor(i / S.cols) * S.h,
        S.w,
        S.h,
        x - S.ox * k,
        y - S.oy * ky,
        S.w * k,
        S.h * ky
      );
      CX.globalAlpha = 1;
      continue;
    }
    const g = CX.createLinearGradient(x, y - bh, x, y);
    g.addColorStop(0, `rgba(${rgb},0)`);
    g.addColorStop(1, `rgba(${rgb},${a})`);
    CX.fillStyle = g;
    if (d.chase) {
      CX.fillRect(x - 14, y - bh, 28, bh);
      CX.fillStyle = `rgba(${PAL.rgb.onActV2},${a})`;
      CX.fillRect(x - 3, y - bh * 0.9, 6, bh * 0.9);
      CX.fillStyle = `rgba(${rgb},${a * 0.6})`;
      CX.fillRect(x - 19, y - bh * 0.7, 1.5, bh * 0.7);
      CX.fillRect(x + 17.5, y - bh * 0.7, 1.5, bh * 0.7);
    } else {
      CX.fillRect(x - 10, y - bh, 20, bh);
      CX.fillStyle = `rgba(${PAL.rgb.catFracV1},${a})`;
      CX.fillRect(x - 2, y - bh * 0.85, 4, bh * 0.85);
    }
  }
}
/* 火焰放滿時看得到自己與怪（M2-05.4）：特效畫完後，目前敵人（aiTarget：王優先、其他取最近）腳下 --bad-hi 圈＋重畫一次、
   玩家重畫在最上面（怪物生命條由 draw 的 drawBars 畫在特效之上：天黑大霧在暗層前、白天在暗層後）；玩家腳下 60 內有 ≥2 個自己的特效或地面時加 --sel-tx 外框與腳下圈 */
const CSSV = {};
const cssv = n => CSSV[n] || (CSSV[n] = getComputedStyle(document.documentElement).getPropertyValue(n).trim());
function drawFront() {
  const T = G.mobs.length ? aiTarget() : null;
  for (const m of G.mobs)
    if (m.hp > 0 && (m === T || m.boss)) footRing(m.x, m.y, m.r * 1.4, cssv('--bad-hi')), drawMob(m);
  const n =
    G.fx.filter(o => o.k === 'sh' && Math.hypot(o.x - P.x, o.y - P.y) < 60).length +
    G.ground.filter(g => g.side !== 'm' && Math.hypot(g.x - P.x, g.y - P.y) < g.r + 60).length;
  if (n >= 2) footRing(P.x, P.y, 22, cssv('--sel-tx'));
  drawHero(1, n >= 2);
  heroMark();
}
/* battle-hud v1.3.3 §12 主角：腳圈 --hero-ring 4 px＋2 px 黑；頭上 10×8 ▼ --focus（螢幕 px，不跟 ZOOM 變粗） */
function heroMark() {
  if (G.scene !== 'map' || typeof BH === 'undefined' || !BH.R.m) return;
  const z = 1 / ZOOM;
  CX.beginPath();
  CX.ellipse(P.x, P.y, 22, 9, 0, 0, TAU);
  CX.strokeStyle = cssv('--d2-black');
  CX.lineWidth = 8 * z;
  CX.stroke();
  CX.strokeStyle = cssv('--d2-hero-ring');
  CX.lineWidth = 4 * z;
  CX.stroke();
  const y = P.y - 58;
  CX.beginPath();
  CX.moveTo(P.x - 5 * z, y - 8 * z);
  CX.lineTo(P.x + 5 * z, y - 8 * z);
  CX.lineTo(P.x, y);
  CX.closePath();
  CX.fillStyle = cssv('--d2-tx-strong');
  CX.fill();
}
function footRing(x, y, r, col) {
  CX.globalAlpha = 0.6;
  CX.strokeStyle = col;
  CX.lineWidth = 2;
  CX.beginPath();
  CX.ellipse(x, y, r, r * 0.4, 0, 0, TAU);
  CX.stroke();
  CX.globalAlpha = 1;
}
/* 能量球：玩家身邊繞圈的小圓點（耐力紅、盛怒綠、暴擊藍） */
const CHGC = { e: PAL.badHiV3, f: PAL.goodV1, p: PAL.dodgeVignetteV1 };
function drawCharges() {
  const ds = [];
  for (const k of ['e', 'f', 'p']) for (let i = chgN(k); i > 0; i--) ds.push(CHGC[k]);
  ds.forEach((c, i) => {
    const a = G.t * 2.4 + (i * TAU) / ds.length;
    CX.fillStyle = c;
    CX.beginPath();
    CX.arc(P.x + Math.cos(a) * 26, P.y - 34 + Math.sin(a) * 9, 4, 0, TAU);
    CX.fill();
  });
}
/* 蓄力條（0.2.54）：蓄力技能按住時畫在腳下，一段一格；正在蓄的那格跟著時間長，滿一格變亮，全滿整條最亮。
   顏色用介面的鐵灰階（DESIGN.md 的 locked／frame-bright／title），不用黃色（黃色只給稀有度） */
function chargeBar() {
  const a = P.act;
  if (!a || !a.charge) return;
  const E = a.c.D.charge,
    w = 14,
    gap = 2,
    W = E.max * w + (E.max - 1) * gap,
    x0 = Math.round(P.x - W / 2),
    y = Math.round(P.y + 12),
    full = a.ch >= E.max * E.step - 1e-6,
    flash = G.t - (a.chT == null ? -9 : a.chT) < 0.18;
  CX.fillStyle = `rgba(${PAL.rgb.scrim},0.7)`;
  CX.fillRect(x0 - 1, y - 1, W + 2, 6);
  for (let i = 0; i < E.max; i++) {
    const f = Math.max(0, Math.min(1, a.ch / E.step - i));
    if (!f) continue;
    CX.fillStyle = full || (f >= 1 && flash) ? PAL.glintV5 : f >= 1 ? PAL.hlV3 : PAL.dmgMinorV5;
    CX.fillRect(x0 + i * (w + gap), y, w * f, 4);
  }
}
/* top：drawFront 在特效上面再畫一次（不畫影子、蓄力條、能量球）；ol：加 --sel-tx 外框 */
function drawHero(top, ol) {
  if (!top) chargeBar(), shadow(P.x, P.y, 18);
  const a = G.t < P.iuntil ? 0.8 : 1,
    flipF = Math.cos(P.face) < -0.05;
  let c;
  if (P.roll) {
    /* 翻滾：滑步動畫，往左就鏡像 */
    c = [2, Math.min(5, Math.floor((P.roll.t / ROLL.t) * 6)), P.roll.dx > 0, 0.9];
    if (!top && Math.random() < 0.6) fx({ k: 'dust', x: P.x + rnd(-10, 10), y: P.y, dur: 0.35 });
  } else {
    const dash = P.act && (P.act.k === 'iai' || P.act.k === 'vanguard'),
      hit = P.act && !dash,
      row = hit ? (P.act.place ? 5 : ACT_ROW[P.act.k] || 3) : 0,
      run = !hit && (P.mv || dash),
      dx = P.act ? Math.cos(P.act.ang) : P.mdx,
      dy = P.act ? Math.sin(P.act.ang) : P.mdy,
      col = dirCol(P.face),
      /* 這一格看得到臉嗎：出手與跑步側面看得到，跑步往上（背面）與站著朝北（第 3～5 格）看不到 */
      face = hit || (run ? !(dy < -0.6 && Math.abs(dx) < 0.8) : col < 3 || col > 5);
    /* 出手：照技能播 9 格動畫，往左就鏡像；往上跑用背面，其他用側面（往左鏡像） */
    if (hit) c = [row, Math.min(8, Math.floor((P.act.t / P.act.dur) * 9)), Math.cos(P.act.ang) < -0.05, a];
    else if (run)
      c = face
        ? [6, Math.floor(G.t * 12) % 8, dx < -0.05 || (Math.abs(dx) <= 0.05 && flipF), a]
        : [7, Math.floor(G.t * 12) % 8, false, a];
    else c = col === 0 ? [1, Math.floor(G.t * 8) % 8, false, a] : [0, col, false, a];
  }
  /* 外框：--sel-tx 色的剪影往四個方向各推一個像素格（TX） */
  if (ol && HERO_P)
    for (const [ox, oy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ])
      heroCell(c[0], c[1], P.x + ox * HSC, P.y + oy * HSC, c[2], 1, { im: HERO_P });
  heroCell(c[0], c[1], P.x, P.y, c[2], c[3]);
  if (P.roll) return;
  if (P.hurtT > 0.25) heroCell(0, dirCol(P.face), P.x, P.y, false, 0.6, { white: 1 });
  if (top) return;
  drawCharges();
  /* 完美閃避後的下一擊：刀光 */
  if (P.critNext) {
    CX.strokeStyle = `rgba(${PAL.rgb.catMemV1},${0.5 + 0.3 * Math.sin(G.t * 12)})`;
    CX.lineWidth = 2;
    CX.beginPath();
    CX.ellipse(P.x, P.y, 24, 9, 0, 0, TAU);
    CX.stroke();
  }
}
const FXI = {};
const fxImg = n => FXI[n] || Object.assign((FXI[n] = new Image()), { src: `img/fx/${n}.png?v=${VER}` });
/* 招牌特效先載（game.js 的 sigFx 看圖載好才用） */
for (const k in FXS) if (k.startsWith('sig_')) fxImg(k);
/* 畫序列圖的第 i 格；rot：原圖朝右，照方向轉，朝左時上下翻（弧線才不會倒過來）；圖還沒載入回傳 false */
function drawSh(n, x, y, sc, rot, i) {
  const S = FXS[n],
    im = fxImg(n);
  if (!im.naturalWidth) return false;
  CX.save();
  CX.translate(x, y);
  if (rot != null) CX.rotate(rot), Math.cos(rot) < 0 && CX.scale(1, -1);
  CX.drawImage(
    im,
    (i % S.cols) * S.w,
    Math.floor(i / S.cols) * S.h,
    S.w,
    S.h,
    -S.ox * sc,
    -S.oy * sc,
    S.w * sc,
    S.h * sc
  );
  CX.restore();
  return true;
}
function drawFx() {
  for (const o of G.fx) {
    const f = o.t / o.dur;
    if (o.k === 'p') {
      CX.globalAlpha = 1 - f;
      CX.fillStyle = o.col;
      CX.fillRect(o.x + o.vx * o.t, o.y + o.vy * o.t + 200 * o.t * o.t, o.sz, o.sz);
    } else if (o.k === 'slash') {
      /* 斬擊：一彎月牙，從細到粗再消失 */
      CX.globalAlpha = 1 - f * f;
      const a0 = o.ang - o.arc / 2 + o.arc * Math.min(1, f * 2.4) * 0;
      const g = CX.createRadialGradient(o.x, o.y - 20, o.r * 0.3, o.x, o.y - 20, o.r);
      g.addColorStop(0, `rgba(${PAL.rgb.glint},0)`);
      g.addColorStop(0.7, `rgba(${PAL.rgb.catFracV2},0.35)`);
      g.addColorStop(1, `rgba(${PAL.rgb.glint},0.95)`);
      CX.fillStyle = g;
      CX.beginPath();
      CX.arc(o.x, o.y - 20, o.r, a0, a0 + o.arc * Math.min(1, 0.4 + f * 3));
      CX.arc(o.x, o.y - 20, o.r * (0.55 + 0.25 * f), a0 + o.arc * Math.min(1, 0.4 + f * 3), a0, true);
      CX.closePath();
      CX.fill();
    } else if (o.k === 'quake') {
      CX.globalAlpha = 0.6 * (1 - f);
      CX.fillStyle = PAL.txOffV1;
      CX.beginPath();
      CX.moveTo(o.x, o.y);
      CX.arc(o.x, o.y, o.r * (0.5 + 0.5 * f), o.ang - o.arc / 2, o.ang + o.arc / 2);
      CX.closePath();
      CX.fill();
    } else if (o.k === 'claw') {
      CX.globalAlpha = 1 - f;
      CX.strokeStyle = o.big ? PAL.elFireV1 : PAL.ascHiV2;
      CX.lineWidth = o.big ? 6 : 3;
      for (let i = -1; i <= 1; i++) {
        CX.beginPath();
        CX.arc(o.x, o.y - 20, o.r * (0.75 + i * 0.1), o.ang - 0.7 + i * 0.1, o.ang + 0.7 + i * 0.1);
        CX.stroke();
      }
    } else if (o.k === 'zap') {
      /* 電弧：兩點之間鋸齒狀的閃電 */
      CX.globalAlpha = 1 - f;
      CX.strokeStyle = PAL.elLight;
      CX.lineWidth = 3;
      CX.beginPath();
      CX.moveTo(o.x, o.y);
      for (let i = 1; i < 6; i++) {
        const t = i / 6;
        CX.lineTo(
          o.x + (o.x2 - o.x) * t + (Math.random() - 0.5) * 22,
          o.y + (o.y2 - o.y) * t + (Math.random() - 0.5) * 22
        );
      }
      CX.lineTo(o.x2, o.y2);
      CX.stroke();
      CX.globalAlpha = 1;
    } else if (o.k === 'ring') {
      CX.globalAlpha = (1 - f) * 0.9;
      CX.strokeStyle = o.col || PAL.catFracV4;
      CX.lineWidth = 10 * (1 - f) + 2;
      CX.beginPath();
      CX.ellipse(o.x, o.y - 10, o.r * (0.6 + 0.4 * f), o.r * (0.6 + 0.4 * f) * 0.75, 0, 0, TAU);
      CX.stroke();
    } else if (o.k === 'ghost') {
      heroCell(6, 2, o.x, o.y, o.flip, 0.35 * (1 - f));
    } else if (o.k === 'dust') {
      CX.globalAlpha = 0.35 * (1 - f);
      CX.fillStyle = PAL.txLockV3;
      CX.beginPath();
      CX.arc(o.x, o.y - f * 10, 4 + f * 10, 0, TAU);
      CX.fill();
    } else if (o.k === 'die') {
      /* 死掉：閃白、往上散、淡出 */
      spr(o.sp, o.x, o.y, o.sz, { flip: o.flip, white: f < 0.25, a: 1 - f, sx: 1 + f * 0.4, sy: 1 - f * 0.6 });
    } else if (o.k === 'heal') {
      CX.globalAlpha = 1 - f;
      CX.strokeStyle = PAL.dmgHurtV1;
      CX.lineWidth = 3;
      CX.beginPath();
      CX.ellipse(o.x, o.y - f * 40, 26 + f * 20, 10 + f * 6, 0, 0, TAU);
      CX.stroke();
    } else if (o.k === 'sh') {
      /* pixelfx 序列圖：照時間挑一格，對齊原圖的中心點 */
      const S = FXS[o.n];
      drawSh(
        o.n,
        o.x,
        o.y,
        o.s,
        o.rot,
        o.loop ? Math.floor((o.t * S.fps) % S.n) : Math.min(S.n - 1, Math.floor(f * S.n))
      );
    } else if (o.k === 'perfect') {
      CX.globalAlpha = 1 - f;
      CX.strokeStyle = PAL.catMemV2;
      CX.lineWidth = 3;
      CX.beginPath();
      CX.arc(o.x, o.y - 30, 30 + f * 160, 0, TAU);
      CX.stroke();
    }
    CX.globalAlpha = 1;
  }
}
function drawMinimap(W) {
  /* 手機：小一點，放在右上選單下面 */
  /* M2-12 §1：直立 88×88 在右上（y 52–140、x 290–378）；桌機 160×160 在右下，營地升級開著時不畫 */
  if (!TOUCH.on && PANEL.camp) return;
  /* battle-hud v1.3.3：直立不畫小地圖；桌機 D63 170×110（右下，--panel 底、1 px --border），地圖照比例放在框裡置中 */
  if (PORT()) return;
  if (!TOUCH.on && BH.R.mini) {
    const [bx0, by0, bw, bh] = BH.R.mini,
      sc = Math.min((bw - 8) / G.W, (bh - 8) / G.H),
      s = sc,
      mw = G.W * s,
      mh = G.H * s,
      x0 = bx0 + (bw - mw) / 2,
      y0 = by0 + (bh - mh) / 2;
    CX.fillStyle = cssv('--d2-panel');
    CX.fillRect(bx0, by0, bw, bh);
    CX.strokeStyle = cssv('--d2-border');
    CX.lineWidth = 1;
    CX.strokeRect(bx0 + 0.5, by0 + 0.5, bw - 1, bh - 1);
    return miniBody(x0, y0, mw, mh, s);
  }
  const land = TOUCH.on && !PORT(),
    box = PORT() ? 88 : 160,
    mw = land ? Math.min(104, (68 * G.W) / G.H) / ZOOM : Math.min(box, (box * G.W) / G.H),
    mh = (mw * G.H) / G.W,
    x0 = W - mw - (land ? 10 / ZOOM : PORT() ? 12 : 16),
    y0 = land ? 60 / ZOOM : PORT() ? 5 : cvH() - mh - 16,
    s = mw / G.W;
  CX.fillStyle = `rgba(${PAL.rgb.sceneVoidV2},0.78)`;
  CX.fillRect(x0, y0, mw, mh);
  frameRect(x0, y0, mw, mh);
  miniBody(x0, y0, mw, mh, s);
}
function miniBody(x0, y0, mw, mh, s) {
  if (!G.mini) {
    /* 地圖縮圖：一格一點，進地圖時畫一次 */
    const c = (G.mini = document.createElement('canvas'));
    c.width = G.cols;
    c.height = G.rows;
    const g = c.getContext('2d');
    g.fillStyle = `rgba(${PAL.rgb.txEmptyV1},0.9)`;
    for (let y = 0; y < G.rows; y++)
      for (let x = 0; x < G.cols; x++) if (!G.tiles[y * G.cols + x]) g.fillRect(x, y, 1, 1);
  }
  CX.imageSmoothingEnabled = false;
  CX.drawImage(G.mini, x0, y0, mw, mh);
  for (const m of G.mobs) {
    if (m.arrow) continue;
    CX.fillStyle = m.boss ? PAL.badHiV2 : m.elite ? PAL.rarMagicV2 : PAL.badV6;
    const z = m.boss ? 5 : 2;
    CX.fillRect(x0 + m.x * s - z / 2, y0 + m.y * s - z / 2, z, z);
  }
  CX.fillStyle = PAL.goodV2;
  CX.fillRect(x0 + P.x * s - 2, y0 + P.y * s - 2, 4, 4);
}

/* 營地：試招場稻草人的名牌（擺設的名牌改成牌匾，見 drawPlaques） */
function drawPrompts() {
  if (G.scene === 'camp' && PRAC.in)
    for (const m of G.mobs) if (m.dummy) plate(m.D.n, m.x, m.y + 26, PAL.dmgMinorV6, 0.75);
}
/* ---------- B3 美術（M2-12-B3-art.md）：營地牌匾、升級印章、呼吸外框、施工塵土。
   都是螢幕尺寸（不乘 ZOOM）、整數倍 u、每幀取整數；畫在暗層之後（建築、居民之上） ---------- */
const PLQI = {};
const plqImg = n => PLQI[n] || Object.assign((PLQI[n] = new Image()), { src: `img/ui/${n}.png?v=${VER}` });
const plqU = () => (IW >= 2560 && IH >= 1440 ? 2 : 1);
/* 擺設對應的設施（M2-11.1：地圖台＝瞭望台、昇華石碑＝祭壇、倉庫＝倉房）：牌匾寫設施名＋「Lv N」（§12-3）；其他擺設只有名字 */
const PLQ_B = { forge: 'forge', device: 'watch', asc: 'altar', stash: 'store' };
const plqTxt = k => (PLQ_B[k.k] ? `${CAMPN[PLQ_B[k.k]]} Lv${S.camp[PLQ_B[k.k]] || 0}` : k.n);
/* 每座的牌匾錨點（§12-2）：up／down＝建築上方／下方，dx、dy 世界 px */
const PLQ_CFG = {
  stash: { side: 'up', dx: 0, dy: 0 },
  forge: { side: 'up', dx: 0, dy: 0 },
  asc: { side: 'up', dx: 30, dy: 0 },
  device: { side: 'down', dx: 0, dy: 0 },
  box: { side: 'up', dx: 0, dy: 0 },
  prac: { side: 'down', dx: 0, dy: 0 }
};
/* 選中（§12-4）：點牌匾開單座卡那一座；3 px --border-cap 框跟著單座卡工項做 */
let PLQ_SEL = null;
/* 點牌匾＝設施（升級，開那一座的營地抽屜）；不是設施的擺設＝跟點本體一樣 */
function plqUse(k) {
  if (!PLQ_B[k.k]) return useProp(k);
  PLQ_SEL = k;
  cdOne(PLQ_B[k.k]);
  return true;
}
/* 還沒蓋（Lv0）的設施裡「下一個解鎖」那一座（最快買得起的；M2-11.1、M2-12 §7） */
function plqNext() {
  const L = campThings().filter(t => !S.camp[t.k] && Object.values(PLQ_B).includes(t.k));
  return L.length ? L.reduce((a, b) => (b.e.m < a.e.m ? b : a)).k : null;
}
/* 施工時牌匾 1→1.03→1（§12-7）：前 300 ms ease-out 放大、後 300 ms ease-in-out 回到 1；連升與減少動態不縮放 */
const plqScale = (b, now = performance.now()) => {
  const f = DUST.up[b],
    p = f && !f.q && !reduced() ? (now - f.t) / 600 : 1;
  if (p >= 1 || p < 0) return 1;
  if (p < 0.5) return 1 + 0.03 * (1 - (1 - 2 * p) ** 3);
  const x = 2 * p - 1;
  return 1.03 - 0.03 * (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
};
/* 鎖圖示 16（ICO.lock 同一條線） */
const LOCK_D = [
  'M3.5 8.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1z',
  'M5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2'
];
/* 牌匾的鍵盤焦點與讀屏（M2-12 §7、§8）：每座一顆透明按鈕放在牌匾上，不吃滑鼠與觸控（點擊照 propAt），
   Tab／方向鍵走牌匾（#plqs 在 KN_Z）、Enter 開那一座 */
function plqBtns() {
  const box = $('plqs');
  box.hidden = false;
  const L = [...G.props].sort((a, b) => a.x - b.x);
  if (box.children.length !== L.length + 1 || L.some(k => !k._b))
    box.replaceChildren(
      ...L.map(k => {
        const b = (k._b = document.createElement('button'));
        b.onclick = () => plqUse(k);
        b.onfocus = () => {
          const r = k._pr;
          if (!r || r[0] < 0 || r[0] + r[2] > IW) campPan(k.x - G.cam.x);
        };
        return b;
      }),
      Object.assign(document.createElement('span'), { className: 'sr', id: 'plqsay', role: 'status' })
    );
  for (const k of L) {
    /* 錨點在畫面外沒有牌匾：按鈕放在建築那一側畫面外，Tab 到時 onfocus 移鏡頭 */
    const r = k._pr || [Math.round((k.x - G.cam.x) * ZOOM + IW / 2), 0, 1, 1],
      fb = PLQ_B[k.k],
      lb = fb ? `${CAMPN[fb]} ${S.camp[fb] || 0} 級${k._pl && k._pl.can ? '，可以升級' : ''}` : k.n,
      st = `left:${r[0]}px;top:${r[1] + cvTop()}px;width:${r[2]}px;height:${r[3]}px`;
    if (k._b.getAttribute('aria-label') !== lb) k._b.setAttribute('aria-label', lb);
    if (k._b._st !== st) k._b.style.cssText = k._b._st = st;
  }
}
/* 寬 W＝max(124, 32＋字寬＋60)、最寬 220；放不下換兩行（高 64），不縮字（§2.2） */
function plqLay(txt, fs) {
  CX.font = `700 ${fs}px "Noto Sans TC", sans-serif`;
  const tw = t => Math.ceil(CX.measureText(t).width),
    w = tw(txt);
  if (32 + w + 60 <= 220) return { W: Math.max(124, 32 + w + 60), H: 44, L: [txt] };
  let i = 1;
  while (i < txt.length && tw(txt.slice(0, i + 1)) <= 128) i++;
  const sp = txt.lastIndexOf(' ', i);
  if (sp > 0) i = sp;
  const L = [txt.slice(0, i).trim(), txt.slice(i).trim()];
  return { W: Math.min(220, Math.max(124, 92 + Math.max(...L.map(tw)))), H: 64, L };
}
const plqA = t => (reduced() ? 0.75 : 0.3 + 0.45 * (0.5 - 0.5 * Math.cos(2 * Math.PI * 0.8 * t)));
/* 外接矩形的框：off 往外推、th 粗 */
function plqRing(X, Y, w, h, off, th, col) {
  CX.fillStyle = col;
  const x = X - off - th,
    y = Y - off - th,
    W = w + 2 * (off + th),
    H = h + 2 * (off + th);
  CX.fillRect(x, y, W, th);
  CX.fillRect(x, y + H - th, W, th);
  CX.fillRect(x, y + th, th, H - 2 * th);
  CX.fillRect(x + W - th, y + th, th, H - 2 * th);
}
/* 牌匾安全框（§12-2）：左右 8、頂列下緣 +8、底部 HUD 上緣 −8；障礙＝「繼續刷」鈕、橫向右側技能鈕群（畫布座標，250 ms 量一次） */
const PLQ_SF = { t: -1e9 };
function plqSafe() {
  const now = performance.now(),
    H = cvH();
  if (now - PLQ_SF.t < 250 && PLQ_SF.w === IW && PLQ_SF.h === H) return PLQ_SF;
  const y0 = cvTop(),
    R = [...document.querySelectorAll('#area, #dnav, .tmenu, .bottom .mid, #run [data-a=resume], .sk')]
      .filter(e => e.offsetParent || getComputedStyle(e).position === 'fixed')
      .map(e => [e, e.getBoundingClientRect()])
      .filter(([, r]) => r.width && r.height),
    of = s => R.filter(([e]) => e.matches(s)).map(([, r]) => r),
    box = L => [L[0], L[1] - y0, L[2] - L[0], L[3] - L[1]],
    ob = of('#run [data-a=resume]').map(r => box([r.left, r.top, r.right, r.bottom])),
    sk = !PORT() && document.body.classList.contains('touch') ? of('.sk') : [];
  if (sk.length)
    ob.push(
      box([
        Math.min(...sk.map(r => r.left)),
        Math.min(...sk.map(r => r.top)),
        Math.max(...sk.map(r => r.right)),
        Math.max(...sk.map(r => r.bottom))
      ])
    );
  const mid = of('.bottom .mid')[0];
  return Object.assign(PLQ_SF, {
    t: now,
    w: IW,
    h: H,
    l: 8,
    r: IW - 8,
    top: Math.max(0, ...of('#area, #dnav, .tmenu').map(r => r.bottom - y0)) + 8,
    b: (mid ? mid.top - y0 : H) - 8,
    ob
  });
}
/* 擺牌匾（§12-2）：先設施、再其他；照錨點設定（上方／下方＋偏移），夾進安全框；
   碰到別座本體點擊圈、別的牌匾（間距 4）或障礙（間距 8）就左右挪 8 px 一步，再不行換另一邊。錨點在畫面外不畫 */
/* 挪動的候選：左右 s、離建築再遠 v（各 8 px 一步）、換到另一邊 f（多算 24），挪得少的先試 */
const PLQ_STEP = [];
for (let s = -320; s <= 320; s += 8)
  for (let v = 0; v <= 160; v += 8) for (const f of [0, 1]) PLQ_STEP.push([s, v, f, Math.abs(s) + v + 24 * f]);
PLQ_STEP.sort((a, b) => a[3] - b[3]);
/* 擺放順序＝PLQ_CFG 的順序（先擺的先挑位置） */
const plqOrd = k => (k.k in PLQ_CFG ? Object.keys(PLQ_CFG).indexOf(k.k) : 99);
function plqPlace(ox, oy, u) {
  const sf = plqSafe(),
    key = [ox, oy, ZOOM, IW, cvH(), sf.top, sf.b, ...sf.ob.flat(), ...G.props.map(k => k._pl.W * u + k._pl.H)].join();
  if (key === plqPlace.key) return;
  plqPlace.key = key;
  const Z = ZOOM,
    cl = (v, a, b) => Math.round(Math.max(a, Math.min(b, v))),
    body = G.props.map(k => [k, (k.x + ox) * Z, (k.y - 25 + oy) * Z, (k.r + 20) * Z]),
    done = [],
    meet = (A, B, g) =>
      A[0] < B[0] + B[2] + g && B[0] < A[0] + A[2] + g && A[1] < B[1] + B[3] + g && B[1] < A[1] + A[3] + g,
    hit = (k, A) =>
      body.some(
        ([o, x, y, r]) =>
          o !== k && Math.hypot(x - cl(x, A[0] - 4, A[0] + A[2] + 4), y - cl(y, A[1] - 4, A[1] + A[3] + 4)) < r
      ) ||
      done.some(B => meet(A, B, 4)) ||
      sf.ob.some(B => meet(A, B, 8));
  for (const k of [...G.props].sort((a, b) => plqOrd(a) - plqOrd(b))) {
    const ax = (k.x + ox) * Z,
      ay = (k.y + oy) * Z;
    k._pr = null;
    if (ax < 0 || ax > IW || ay < 0 || ay > cvH()) continue;
    const c = PLQ_CFG[k.k] || PLQ_CFG.box,
      w = k._pl.W * u,
      h = k._pl.H * u;
    let first = null;
    for (const [s, v, f] of PLQ_STEP) {
      if (Math.abs(s) > 1.5 * w) continue;
      const sd = f ? (c.side === 'up' ? 'down' : 'up') : c.side;
      const A = [
        cl(ax + c.dx * Z - w / 2 + s, sf.l, sf.r - w),
        cl(
          sd === 'up' ? (k.y - k.ny + c.dy + oy) * Z - h / 2 - v : (k.y + k.r - 5 + c.dy + oy) * Z + 4 + v,
          sf.top,
          sf.b - h
        ),
        w,
        h
      ];
      first = first || A;
      if (!hit(k, A)) {
        first = A;
        break;
      }
    }
    done.push((k._pr = first));
  }
}
function drawPlaques(ox, oy) {
  if (G.scene !== 'camp') return;
  const u = plqU(),
    fs = Math.round((14 * ((S && S.fs) || 100)) / 100) * u,
    a = plqA(performance.now() / 1000),
    nx = G.props.some(k => PLQ_B[k.k] && !S.camp[PLQ_B[k.k]]) ? plqNext() : null,
    fk = document.activeElement;
  CX.setTransform(DPR, 0, 0, DPR, 0, 0);
  CX.imageSmoothingEnabled = false;
  dustTick(performance.now());
  drawDust(ox, oy, u);
  for (const k of G.props) {
    const fb = PLQ_B[k.k],
      { W, H, L } = plqLay(plqTxt(k), fs),
      cost = fb ? campNext(fb) : null,
      p = cost ? affP(cost) : 0,
      /* 還沒蓋：下一個解鎖那座畫地基虛線（1 世界 px、6／4、--border-hi 60%）＋鎖 16（--tx-lock）；牌匾不加印章、不呼吸（B3-art §2.5） */
      off = fb === nx && !!nx;
    k._pl = { W, H, L, fs, can: !!cost && p >= 1 && !off, off, p, cost };
  }
  plqPlace(ox, oy, u);
  for (const k of G.props) {
    const fb = PLQ_B[k.k],
      { W, H, L, p, cost, off } = k._pl,
      im = plqImg(H === 44 ? 'plq-44' : 'plq-64');
    if (off) {
      const cx = Math.round((k.x + ox) * ZOOM),
        cy = Math.round((k.y + oy) * ZOOM);
      CX.globalAlpha = 0.6;
      CX.strokeStyle = PAL.borderHi;
      CX.lineWidth = ZOOM;
      CX.setLineDash([6 * ZOOM, 4 * ZOOM]);
      CX.beginPath();
      CX.ellipse(cx, cy, k.r * ZOOM, k.r * ZOOM * 0.5, 0, 0, 2 * Math.PI);
      CX.stroke();
      CX.setLineDash([]);
      CX.globalAlpha = 1;
      CX.setTransform(DPR * u, 0, 0, DPR * u, DPR * (cx - 8 * u), DPR * (cy - 25 * ZOOM - 8 * u));
      CX.strokeStyle = PAL.txLock;
      CX.lineWidth = 1.5;
      for (const q of LOCK_D) CX.stroke(new Path2D(q));
      CX.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    if (!k._pr) continue;
    const [X, Y] = k._pr;
    if (!im.complete || !im.naturalWidth) continue;
    /* 施工縮放：中心在牌匾下緣中間 */
    const sc = fb ? plqScale(fb) : 1;
    if (sc !== 1) {
      const px = X + (W * u) / 2,
        py = Y + H * u;
      CX.setTransform(DPR * sc, 0, 0, DPR * sc, DPR * px * (1 - sc), DPR * py * (1 - sc));
    }
    /* 三段：左 26、中 72 橫向重複不縮放（最後一塊照剩下的寬切）、右 26 */
    CX.drawImage(im, 0, 0, 26, H, X, Y, 26 * u, H * u);
    for (let x = 26; x < W - 26; x += 72) {
      const w = Math.min(72, W - 26 - x);
      CX.drawImage(im, 26, 0, w, H, X + x * u, Y, w * u, H * u);
    }
    CX.drawImage(im, 98, 0, 26, H, X + (W - 26) * u, Y, 26 * u, H * u);
    /* 凹槽 x 24 到 W−25、y 10 到 H−11 */
    CX.fillStyle = PAL.plateWorld;
    CX.fillRect(X + 24 * u, Y + 10 * u, (W - 48) * u, (H - 20) * u);
    CX.font = `700 ${fs}px "Noto Sans TC", sans-serif`;
    CX.textAlign = 'left';
    CX.textBaseline = 'middle';
    CX.fillStyle = PAL.txScene;
    L.forEach((t, i) => CX.fillText(t, X + 32 * u, Y + (20 + 18 * i) * u));
    CX.textBaseline = 'alphabetic';
    if (cost) {
      /* 買得起進度條：x 26 到 W−57、凹槽下緣 4 px */
      const bw = W - 82;
      CX.fillStyle = PAL.progLo;
      CX.fillRect(X + 26 * u, Y + (H - 15) * u, bw * u, 4 * u);
      CX.fillStyle = p >= 1 ? PAL.good : PAL.progHi;
      CX.fillRect(X + 26 * u, Y + (H - 15) * u, Math.round(bw * Math.min(1, p)) * u, 4 * u);
    }
    if (k._pl.can) {
      /* 呼吸外框：凹槽往內 1 px，--ready，全部共用一個時鐘 */
      CX.globalAlpha = a;
      plqRing(X + 26 * u, Y + 12 * u, (W - 52) * u, (H - 24) * u, 0, u, PAL.ready);
      CX.globalAlpha = 1;
      const sl = plqImg('seal-28-btn2-cap');
      if (sl.complete && sl.naturalWidth)
        CX.drawImage(sl, X + (W - 52) * u, Y + (H === 44 ? 8 : 18) * u, 28 * u, 28 * u);
    }
    /* 懸停／焦點：2 px --focus 往外推 2 px，外面再 1 px --scene-void */
    if (k === G.hov || (k._b && k._b === fk && fk.matches(':focus-visible'))) {
      plqRing(X, Y, W * u, H * u, 2 * u, 2 * u, PAL.focus);
      plqRing(X, Y, W * u, H * u, 4 * u, u, PAL.sceneVoid);
    }
    if (sc !== 1) CX.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  plqBtns();
}
/* 施工塵土（§5）：一般升級 16 顆、10 秒內同一座連升 6 顆；減少動態不放；全營地同時最多 32 顆 */
const DUST = { p: [], last: {}, up: {}, ft: [], half: 0 };
/* 掉幀減半（§12-6）：最近 30 幀平均幀時間 > 20 ms 就減半；平均 < 17.5 ms 維持 2 秒才恢復 */
function dustTick(now) {
  const dt = now - (DUST.t || now);
  DUST.t = now;
  if (dt <= 0 || dt > 1000) return;
  DUST.ft.push(dt);
  if (DUST.ft.length > 30) DUST.ft.shift();
  if (DUST.ft.length < 30) return;
  const m = DUST.ft.reduce((a, b) => a + b) / 30;
  if (m > 20) (DUST.half = 1), (DUST.ok = 0);
  else if (DUST.half && m < 17.5) {
    DUST.ok = DUST.ok || now;
    if (now - DUST.ok >= 2000) DUST.half = DUST.ok = 0;
  } else DUST.ok = 0;
}
/* 換外觀的等級（M2-12-lookTiers.md，設施 id／GEN id）：升到或一次連升跨過表內等級＝1200 ms */
const LOOK_TIERS = {
  forge: [1, 5, 10, 15, 20],
  watch: [1, 8, 15, 22, 26] /* 23～25 只加光點，600 */,
  scout: [1, 2, 3, 4],
  house: [1, 4, 7, 10],
  altar: [1, 4, 7, 11] /* 畫面名：長老屋 */,
  store: [1, 3, 5],
  wood: [5, 10, 25, 50],
  iron: [5, 10, 25, 50],
  hide: [5, 10, 25, 50] /* Lv0→1 首次出現不在表內，600 */,
  silk: [5, 10, 25, 50]
};
/* 從 a 級升到 b 級：跨過表內等級＝1200 ms；10 秒內連升 250、其餘 600（§4、§12-5） */
const buildMs = (bk, a, b, q) => (q ? 250 : (LOOK_TIERS[bk] || []).some(t => t > a && t <= b) ? 1200 : 600);
const DUST_SET = {
  n: [16, 100, 250, 250, 350, [2, 3, 4], [0.2, 0.45, 0.35]],
  q: [6, 0, 40, 150, 210, [2, 3], [0.5, 0.5]]
};
const dustPick = (a, w) => {
  let r = Math.random();
  for (let i = 0; i < a.length; i++) if ((r -= w[i]) < 0) return a[i];
  return a[a.length - 1];
};
/* a＝升級前的等級（產生器可一次連升多級）；沒擺設的設施只記時機（翻牌在卡上） */
function campDust(bk, a) {
  const k = G.scene === 'camp' && G.props.find(p => PLQ_B[p.k] === bk),
    now = performance.now(),
    q = now - (DUST.last[bk] || -1e9) < 10000,
    lv = GEN[bk] ? genOf(bk).lv : S.camp[bk],
    T = buildMs(bk, a ?? lv - 1, lv, q),
    say = $('plqsay');
  DUST.last[bk] = now;
  DUST.up[bk] = { t: now, q, T };
  if (say && CAMPN[bk]) say.textContent = `${k ? k.n : CAMPN[bk]}升到 ${lv} 級`;
  if (!k || reduced()) return;
  const [n0, b0, b1, l0, l1, sz, sw] = DUST_SET[q ? 'q' : 'n'],
    /* 換外觀那一段 1200 ms：出生時間拉長，塵土跟著放到最後（新外觀交叉淡化等美術分級圖） */
    n = DUST.half ? Math.ceil(n0 / 2) : n0,
    rnd = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < n; i++) {
    const x = rnd(-0.4, 0.4);
    DUST.p.push({
      k,
      t0: now + rnd(b0, b1) + (T === 1200 ? rnd(0, 600) : 0),
      T: rnd(l0, l1),
      s: dustPick(sz, sw),
      row: dustPick([0, 1, 2], [0.45, 0.4, 0.15]),
      x,
      y: rnd(0, 6),
      vx: (x < 0 ? -1 : 1) * rnd(12, 36),
      vy: rnd(30, 60)
    });
  }
}
function drawDust(ox, oy, u) {
  if (!DUST.p.length) return;
  const now = performance.now(),
    im = plqImg('dust-sheet'),
    COL = { 2: 0, 3: 1, 4: 2, 6: 3 },
    DN = { 6: 4, 4: 3, 3: 2, 2: 2 };
  let live = DUST.p.filter(d => d.on && now < d.t0 + d.T).length;
  DUST.p = DUST.p.filter(d => {
    if (now >= d.t0 + d.T) return false;
    if (now < d.t0) return true;
    /* 出生那一刻滿 32 顆就不生（不殺舊的） */
    if (!d.on) {
      if (live >= 32) return false;
      d.on = 1;
      live++;
    }
    const f = (now - d.t0) / d.T,
      tau = (now - d.t0) / 1000,
      m = tau - (0.35 * tau * tau) / (d.T / 1000),
      s = f >= 0.6 ? DN[d.s] : d.s,
      x = Math.round((d.k.x + ox) * ZOOM + d.x * 2 * d.k.r * ZOOM + d.vx * m * u),
      y = Math.round((d.k.y + oy) * ZOOM - (d.y + d.vy * m) * u);
    if (im.complete && im.naturalWidth) {
      CX.globalAlpha = f < 0.4 ? 0.85 : 0.85 * (1 - (f - 0.4) / 0.6);
      CX.drawImage(im, COL[s] * 8, d.row * 8, 8, 8, x - 4 * u, y - 4 * u, 8 * u, 8 * u);
      CX.globalAlpha = 1;
    }
    return true;
  });
}
function plate(txt, x, y, col, a) {
  CX.font = '700 14px "Noto Sans TC", sans-serif';
  CX.textAlign = 'center';
  const w = CX.measureText(txt).width + 18;
  CX.globalAlpha = a;
  CX.fillStyle = `rgba(${PAL.rgb.panelV2},0.94)`;
  CX.fillRect(x - w / 2, y - 15, w, 25);
  frameRect(x - w / 2, y - 15, w, 25);
  CX.fillStyle = col;
  CX.fillText(txt, x, y + 2);
  CX.globalAlpha = 1;
}

/* 戰狼：跟著你的狼（腳下綠圈） */
function drawWolf(w) {
  shadow(w.x, w.y, 13);
  /* 魔像（0.2.63）：圖與腳下圈的顏色看 AURAS[src] 的 mon、col */
  const A = AURAS[w.src];
  CX.strokeStyle = A && A.col ? A.col : `rgba(${PAL.rgb.goodV1},0.6)`;
  CX.lineWidth = 1.5;
  CX.beginPath();
  CX.ellipse(w.x, w.y, 16, 6, 0, 0, TAU);
  CX.stroke();
  const bob = w.mv ? Math.abs(Math.sin(w.ph)) * 0.08 : 0;
  /* 紙人兵、魔像、戰狼 */
  const [im, sz] = w.src === 'doll' ? ['m_paperdoll', 34] : isGolem(w.src) ? [A.mon, 52] : ['m_snowwolf', 36];
  spr(im, w.x, w.y, sz * giantM(w), { flip: (w.face || 0) > 0, sy: 1 + bob });
  /* 生命條（0.2.52，召喚物會受傷了）：受傷才顯示，畫法跟怪物的小血條一樣，友方用綠色 */
  if (w.hp < w.mhp) {
    const bw = Math.max(36, w.r * 2.4),
      y = w.y - sz * giantM(w) - 8;
    CX.fillStyle = `rgba(${PAL.rgb.scrim},0.7)`;
    CX.fillRect(w.x - bw / 2 - 1, y - 1, bw + 2, 6);
    CX.fillStyle = PAL.goodV3;
    CX.fillRect(w.x - bw / 2, y, (bw * Math.max(0, w.hp)) / w.mhp, 4);
  }
}

/* 陷阱的屬性色 [圓環, 旋轉小點]：物理灰、閃電黃、火焰橙、冰霜青（0.2.66；圓環中心再畫技能圖示） */
const TRAP_COL = {
  phys: [PAL.dmgHitV1, PAL.dmgHitV2],
  light: [PAL.elLight, PAL.warmGlintV2],
  fire: [PAL.elFire, PAL.rarChaseHiV2],
  cold: [PAL.elCold, PAL.hlV4]
};
/* 場上單位：陷阱（地上的齒輪）、地雷（閃紅點）、砲塔圖騰（十字弓）、圖騰（柱子）；砲塔圖騰、圖騰下面的小條是剩下的時間 */
function drawUnit(u) {
  const D = u.c.D;
  shadow(u.x, u.y, 12);
  if (u.type === 'trap') {
    const [rc, dc] = TRAP_COL[D.el] || TRAP_COL.phys;
    CX.save();
    CX.globalAlpha = u.t > 0.4 ? 1 : 0.4;
    CX.strokeStyle = rc;
    CX.lineWidth = 3;
    CX.beginPath();
    CX.arc(u.x, u.y - 4, 11, 0, TAU);
    CX.stroke();
    CX.restore();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + G.t;
      CX.fillStyle = dc;
      CX.fillRect(u.x + Math.cos(a) * 14 - 2, u.y - 4 + Math.sin(a) * 14 - 2, 4, 4);
    }
    spr(D.ic, u.x, u.y + 2, 12);
  } else if (u.type === 'mine') {
    CX.fillStyle = PAL.borderV2;
    CX.beginPath();
    CX.arc(u.x, u.y - 4, 9, 0, TAU);
    CX.fill();
    CX.fillStyle = Math.sin(G.t * 14) > 0 ? PAL.dmgHurt : PAL.hpV3;
    CX.fillRect(u.x - 2, u.y - 7, 4, 4);
  } else if (u.type === 'turret') {
    CX.fillStyle = PAL.progLoV1;
    CX.fillRect(u.x - 10, u.y - 20, 20, 20);
    CX.fillStyle = PAL.progHiV1;
    CX.fillRect(u.x - 16, u.y - 26, 32, 6);
  } else {
    CX.fillStyle = PAL.borderMidV3;
    CX.fillRect(u.x - 9, u.y - 46, 18, 46);
    CX.fillStyle = D.el === 'fire' ? PAL.elFire : PAL.progHiV1;
    CX.fillRect(u.x - 12, u.y - 52, 24, 10);
    spr(D.ic, u.x, u.y - 22, 18);
  }
  if (u.type === 'turret' || u.type === 'totem') {
    CX.fillStyle = `rgba(${PAL.rgb.scrim},0.6)`;
    CX.fillRect(u.x - 14, u.y + 6, 28, 3);
    CX.fillStyle = PAL.hlV2;
    CX.fillRect(u.x - 14, u.y + 6, 28 * Math.max(0, 1 - u.t / u.dur), 3);
  }
  /* 生命條（0.2.53，圖騰與砲塔圖騰會被打）：受傷才顯示，畫法跟召喚物、怪物的小血條一樣 */
  if (u.hp < u.mhp) {
    /* 砲塔圖騰比圖騰矮，血條貼著它的頭頂 */
    const y = u.y - (u.type === 'turret' ? 40 : 62);
    CX.fillStyle = `rgba(${PAL.rgb.scrim},0.7)`;
    CX.fillRect(u.x - 19, y - 1, 38, 6);
    CX.fillStyle = PAL.goodV3;
    CX.fillRect(u.x - 18, y, (36 * Math.max(0, u.hp)) / u.mhp, 4);
  }
}

/* ---------- battle-hud v1.3.3 §12：掉落牌、菁英名牌（螢幕座標）----------
   底 --plate-world；字 14（直立）／16（桌機），高 20／22；名稱用稀有度色＋記號（稀有 ◆、傳奇 ◈、追逐＝王印 16）；
   寬＝記號＋字寬＋左右各 6，最寬 140（超過才「…」），以中心為準。y 下限：牌子下緣 ≤ 狀態圖示上緣 −4（BH.R.floor），
   會超過時往上推（x 不變），往上疊、間距 2。預設門檻稀有以上（M2-40 §9）：普通、魔法不出牌 */
const PLATE_MAX = 140;
function plateFit(t, w) {
  if (CX.measureText(t).width <= w) return t;
  while (t.length > 1 && CX.measureText(t + '…').width > w) t = t.slice(0, -1);
  return t + '…';
}
function plateList(ox, oy) {
  const L = [],
    sx = x => (x + ox) * ZOOM,
    sy = y => (y + oy) * ZOOM;
  for (const d of G.drops) {
    const [x, y] = dropXY(d);
    let n, c;
    if (d.chase) (n = chaseBanner(d.chase)), (c = 'chase');
    else if (d.show) (n = d.show === 'pack' ? STR_T.pack : CUR[d.show].n), (c = /3$/.test(d.show) ? 'unique' : 'rare');
    else if (d.it && d.it.r >= 2) (n = itemName(d.it)), (c = d.it.r >= 3 ? 'unique' : 'rare');
    else continue;
    L.push({ n, c, x: sx(x), y: sy(y) - 20 * ZOOM, k: d.chase });
  }
  for (const m of G.mobs)
    if (m.elite && !m.boss && m.hp > 0) L.push({ n: `菁英・${m.D.n}`, c: 'elite', x: sx(m.x), y: sy(m.y - m.sz - 10) });
  return L;
}
function drawPlates(ox, oy) {
  if (typeof BH === 'undefined' || !BH.R.m) return;
  const port = PORT(),
    fs = port ? 14 : 16,
    h = port ? 20 : 22,
    floor = BH.R.floor != null ? BH.R.floor - cvTop() : cvH(),
    L = plateList(ox, oy);
  if (!L.length) return;
  CX.textBaseline = 'middle';
  CX.textAlign = 'left';
  const col = {
    rare: cssv('--rar-rare'),
    unique: cssv('--rar-unique'),
    chase: cssv('--rar-chase'),
    elite: cssv('--d2-tx-strong')
  };
  /* 寬度、下緣；照下緣由下往上排，壓到下限或彼此重疊就往上推 */
  for (const p of L) {
    const mk = p.c === 'chase' ? 19 : p.c === 'elite' ? 20 : fs === 14 ? 16 : 18;
    CX.font = `${p.c === 'elite' ? 700 : 400} ${fs}px "Noto Sans TC", sans-serif`;
    p.t = plateFit(p.n, PLATE_MAX - 12 - mk);
    p.w = Math.min(PLATE_MAX, Math.ceil(mk + CX.measureText(p.t).width + 12));
    p.mk = mk;
    p.y1 = Math.min(p.y, floor);
    p.x0 = Math.round(p.x - p.w / 2);
  }
  L.sort((a, b) => b.y1 - a.y1);
  for (let i = 0; i < L.length; i++)
    for (let j = 0; j < i; j++) {
      const a = L[i],
        b = L[j];
      if (a.x0 < b.x0 + b.w && b.x0 < a.x0 + a.w && a.y1 > b.y1 - h - 2) a.y1 = b.y1 - h - 2;
    }
  for (const p of L) {
    const y0 = Math.round(p.y1 - h);
    p.r = [p.x0, y0, p.w, h];
    CX.fillStyle = cssv('--d2-plate-world');
    CX.fillRect(p.x0, y0, p.w, h);
    if (p.c !== 'elite') {
      CX.strokeStyle = col[p.c];
      CX.lineWidth = 1;
      CX.strokeRect(p.x0 + 0.5, y0 + 0.5, p.w - 1, h - 1);
    }
    CX.font = `${p.c === 'elite' ? 700 : 400} ${fs}px "Noto Sans TC", sans-serif`;
    CX.fillStyle = col[p.c];
    const tx = p.x0 + 6;
    if (p.c === 'chase') spr(isWy(p.k) ? p.k + '_16' : 'wangyin_guixu_16', tx + 8, y0 + h / 2 + 8, 16);
    else if (p.c === 'elite') eliteMark(tx, y0 + (h - 16) / 2);
    else CX.fillText(p.c === 'unique' ? '◈' : '◆', tx, y0 + h / 2 + 1);
    CX.fillText(p.t, tx + p.mk, y0 + h / 2 + 1);
  }
  CX.textBaseline = 'alphabetic';
  G.plates = L;
}
/* 菁英標記 16×16（程式畫的角盔剪影，assets-borrowed #5） */
function eliteMark(x, y) {
  CX.beginPath();
  CX.moveTo(x + 2, y + 1);
  CX.lineTo(x + 5, y + 6);
  CX.lineTo(x + 11, y + 6);
  CX.lineTo(x + 14, y + 1);
  CX.lineTo(x + 14, y + 10);
  CX.lineTo(x + 11, y + 15);
  CX.lineTo(x + 5, y + 15);
  CX.lineTo(x + 2, y + 10);
  CX.closePath();
  CX.fill();
}
