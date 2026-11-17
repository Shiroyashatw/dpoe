/* dungeonPOE · 畫面：藏身處、地板、石頭、預警、怪物、玩家、特效、跳數字、掉落標籤、光照、小地圖 */
'use strict';
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
let HERO_W;
HERO_IMG.onload = () => {
  /* 受傷閃白用的白色版 */
  const c = (HERO_W = document.createElement('canvas'));
  c.width = HERO_IMG.width;
  c.height = HERO_IMG.height;
  const g = c.getContext('2d');
  g.drawImage(HERO_IMG, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = PAL.glint;
  g.fillRect(0, 0, c.width, c.height);
};
HERO_IMG.src = 'img/hero.png?v=' + VER;
const HSC = 1.35;
function heroCell(row, col, x, y, flip, al, o = {}) {
  const im = o.white ? HERO_W : HERO_IMG;
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
  if (G.scene === 'hide') drawHideout(W, H);
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
  /* 傳送門：藏身處的＝進地圖（紫），地圖裡的＝回家（藍） */
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
  /* 掉落（地上的光點） */
  for (const d of G.drops) {
    const f = Math.min(1, d.t / 0.35),
      x = d.sx + (d.x - d.sx) * f,
      y = d.sy + (d.y - d.sy) * f - Math.sin(f * Math.PI) * 40;
    if (d.gold) spr('mat_gold', x, y + 8, 22);
    else if (d.chase) {
      /* 追逐物品（M2-19.2b）：橘色雙線光柱 360（0.24 秒長出來）＋地上慢轉的虛線印環、落地擴散一圈；地上不寫字；減少動態不轉不呼吸 */
      const rm = reduced(),
        bh = 360 * Math.min(1, d.t / 0.24),
        a = rm ? 0.8 : 0.8 * (0.8 + 0.2 * Math.sin(G.t * 3 + d.sx)),
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
      const g = CX.createLinearGradient(x, y - bh, x, y);
      g.addColorStop(0, `rgba(${PAL.rgb.rarChase},0)`);
      g.addColorStop(1, `rgba(${PAL.rgb.rarChase},${a})`);
      CX.fillStyle = g;
      CX.fillRect(x - 14, y - bh, 28, bh);
      CX.fillStyle = `rgba(${PAL.rgb.onActV2},${a})`;
      CX.fillRect(x - 3, y - bh * 0.9, 6, bh * 0.9);
      CX.fillStyle = `rgba(${PAL.rgb.rarChase},${a * 0.6})`;
      CX.fillRect(x - 19, y - bh * 0.7, 1.5, bh * 0.7);
      CX.fillRect(x + 17.5, y - bh * 0.7, 1.5, bh * 0.7);
      spr(d.chase, x, y + 8, 32);
    } else if (d.show) {
      /* 稀有通貨（0.4.1）：金色光柱（完美更高）＋圖示 */
      const bh = /3$/.test(d.show) ? 300 : 230,
        a = 0.75 * (0.75 + 0.25 * Math.sin(G.t * 5 + d.sx)),
        g = CX.createLinearGradient(x, y - bh, x, y);
      g.addColorStop(0, `rgba(${PAL.rgb.rarRare},0)`);
      g.addColorStop(1, `rgba(${PAL.rgb.rarRare},${a})`);
      CX.fillStyle = g;
      CX.fillRect(x - 10, y - bh, 20, bh);
      CX.fillStyle = `rgba(${PAL.rgb.catFracV1},${a})`;
      CX.fillRect(x - 2, y - bh * 0.85, 4, bh * 0.85);
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
  if (G.scene === 'hide') hideFront();
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
  /* 跳數字 */
  CX.textAlign = 'center';
  for (const n of G.nums) {
    /* 手機：升級的大字會撞到上面的王名，底部的提示字已經寫了，不畫 */
    if (TOUCH.on && n.c === 'lv') continue;
    const f = n.t / 0.9,
      pop = n.t < 0.08 ? 1 + (0.08 - n.t) * 8 : 1,
      y = n.y - 30 * Math.sqrt(f) - (n.c === 'crit' || n.c === 'jackpot' ? 10 : 0);
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
      lv: [PAL.dmgGain, 26],
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
        ? '+' + n.v + ' 金'
        : n.c === 'jackpot'
          ? '大獎 ' + n.v
          : n.c === 'block'
            ? '格擋'
            : n.c === 'lv'
              ? '升級！Lv ' + n.v
              : n.c === 'perfect'
                ? '完美閃避'
                : n.c === 'ev'
                  ? '閃避'
                  : n.txt || n.v;
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
  const night = G.night > G.t,
    fog = !night && G.fog > G.t; /* 蚩尤的大霧（0.2.81）：比天黑淺、看得比較遠 */
  dg.fillStyle = `rgba(${BIO().dark},${night ? 0.96 : fog ? 0.9 : G.scene === 'hide' ? 0.45 : 0.74})`;
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
  CX.setTransform(DPR, 0, 0, DPR, 0, 0);
  {
    const W = SW,
      H = SH;
    /* 受傷：畫面邊緣紅；完美閃避：藍 */
    if (P.hurtT > 0 || P.hp < ST.hp * 0.3 || G.slow > 0) {
      const a = G.slow > 0 ? 0.35 : Math.max(P.hurtT / 0.35, P.hp < ST.hp * 0.3 ? 0.35 + 0.15 * Math.sin(G.t * 6) : 0),
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
    fly = D.fly ? 14 + Math.sin(m.ph * 0.5) * 4 : 0;
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
  /* 生命條（受傷或菁英、王才顯示） */
  drawMobStates(m, m.y - fly - m.sz - 13);
  if (m.hp < m.mhp || m.elite) {
    const w = m.boss ? 0 : Math.max(36, m.r * 2.4),
      y = m.y - fly - m.sz - 8;
    if (w) {
      CX.fillStyle = `rgba(${PAL.rgb.scrim},0.7)`;
      CX.fillRect(m.x - w / 2 - 1, y - 1, w + 2, 6);
      CX.fillStyle = m.elite ? PAL.rarMagicV2 : PAL.badV1;
      CX.fillRect(m.x - w / 2, y, (w * m.hp) / m.mhp, 4);
    }
  }
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
function drawHero() {
  chargeBar();
  shadow(P.x, P.y, 18);
  const a = G.t < P.iuntil ? 0.8 : 1,
    flipF = Math.cos(P.face) < -0.05;
  if (P.roll) {
    /* 翻滾：滑步動畫，往左就鏡像 */
    const f = Math.min(5, Math.floor((P.roll.t / ROLL.t) * 6));
    heroCell(2, f, P.x, P.y, P.roll.dx > 0, 0.9);
    if (Math.random() < 0.6) fx({ k: 'dust', x: P.x + rnd(-10, 10), y: P.y, dur: 0.35 });
    return;
  }
  const dash = P.act && (P.act.k === 'iai' || P.act.k === 'vanguard'),
    hit = P.act && !dash,
    row = hit ? (P.act.place ? 5 : ACT_ROW[P.act.k] || 3) : 0,
    run = !hit && (P.mv || dash),
    dx = P.act ? Math.cos(P.act.ang) : P.mdx,
    dy = P.act ? Math.sin(P.act.ang) : P.mdy,
    col = dirCol(P.face),
    /* 這一格看得到臉嗎：出手與跑步側面看得到，跑步往上（背面）與站著朝北（第 3～5 格）看不到 */
    face = hit || (run ? !(dy < -0.6 && Math.abs(dx) < 0.8) : col < 3 || col > 5);
  if (hit) {
    /* 出手：照技能播 9 格動畫，往左就鏡像 */
    const f = Math.min(8, Math.floor((P.act.t / P.act.dur) * 9));
    heroCell(row, f, P.x, P.y, Math.cos(P.act.ang) < -0.05, a);
  } else if (run) {
    const fr = Math.floor(G.t * 12) % 8;
    /* 往上跑用背面，其他用側面（往左鏡像） */
    if (!face) heroCell(7, fr, P.x, P.y, false, a);
    else heroCell(6, fr, P.x, P.y, dx < -0.05 || (Math.abs(dx) <= 0.05 && flipF), a);
  } else {
    if (col === 0) heroCell(1, Math.floor(G.t * 8) % 8, P.x, P.y, false, a);
    else heroCell(0, col, P.x, P.y, false, a);
  }
  if (P.hurtT > 0.25) heroCell(0, dirCol(P.face), P.x, P.y, false, 0.6, { white: 1 });
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
    } else if (o.k === 'heal' || o.k === 'lvup') {
      CX.globalAlpha = 1 - f;
      CX.strokeStyle = o.k === 'heal' ? PAL.dmgHurtV1 : PAL.goodV2;
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
  const mw = TOUCH.on ? Math.min(PORT() ? 62 : 104, (68 * G.W) / G.H) / ZOOM : 190,
    mh = (mw * G.H) / G.W,
    x0 = W - mw - (TOUCH.on ? 10 / ZOOM : 16),
    y0 = TOUCH.on ? 60 / ZOOM : cvH() - mh - 16 /* 桌機在右下（M2-38，M2-37.5）：右欄最低 562，不重疊 */,
    s = mw / G.W;
  CX.fillStyle = `rgba(${PAL.rgb.sceneVoidV2},0.78)`;
  CX.fillRect(x0, y0, mw, mh);
  frameRect(x0, y0, mw, mh);
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

/* 互動提示：走近的東西頭上「F 名字」 */
function drawPrompts() {
  const p = G.scene === 'hide' && nearProp(),
    port = G.portal && dist(P, G.portal) < 90;
  const lab =
    port && G.scene === 'hide'
      ? [(TOUCH.on ? '' : 'F ') + '進入' + (G.portal.n || '地圖'), G.portal.x, G.portal.y - 40]
      : p
        ? [(TOUCH.on ? '' : 'F ') + p.n, p.x, p.y - p.ny]
        : null;
  if (G.scene === 'hide') drawPropNames();
  if (!lab) return;
  plate(lab[0], lab[1], lab[2], PAL.glintV6, 1);
}
/* 藏身處的擺設常駐弱名牌（走近才變成互動提示） */
function drawPropNames() {
  const p = nearProp();
  for (const k of G.props) if (k !== p) plate(k.n, k.x, k.y - k.ny, PAL.dmgMinorV6, 0.75);
  if (PRAC.in) for (const m of G.mobs) if (m.dummy) plate(m.D.n, m.x, m.y + 26, PAL.dmgMinorV6, 0.75);
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
