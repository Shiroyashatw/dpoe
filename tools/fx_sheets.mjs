#!/usr/bin/env node
/* pixelfx（github patch-gg/pixelfx，MIT）的特效 → img/fx/名字.png（一格一幀、裁掉透明邊）＋ js/fxsheets.js（FXS 表）
   用法：node tools/fx_sheets.mjs <pixelfx 的資料夾>（先 git clone，不要放進這個 repo）
   這個資料夾沒有建置步驟，所以不直接載入 pixelfx 的 ES module，只用它在本機輸出圖。 */
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

/* 名字: [pixelfx 的 id, 最多幾秒（長的爆炸只取前段）, 每秒幾幀, 原圖裡效果的半徑（遊戲照 r 縮放）, 從第幾秒開始（跳過蓄力）] */
const LIST = {
  boom: ['explosions/small-explosion', 1.1, 20, 70],
  frost: ['ice/frost-nova', 1.0, 20, 100, 0.4],
  shatter: ['ice/ice-shatter', 1.0, 20, 50],
  thunder: ['lightning/thunderclap', 0.9, 20, 100],
  zap: ['lightning/zap-hit', 0.9, 20, 30],
  slam: ['impacts/ground-slam', 0.9, 20, 110],
  dark: ['shadow/dark-explosion', 0.9, 20, 90, 0.5],
  hit: ['impacts/hit-spark', 0.5, 24, 30],
  crit: ['impacts/crit-hit', 0.8, 24, 50],
  block: ['impacts/shield-block', 0.8, 20, 40],
  poof: ['spawn/poof', 0.9, 20, 35],
  heal: ['holy/heal', 1.4, 15, 30],
  blink: ['arcane/blink-out', 1.0, 20, 40],
  lvup: ['ui/level-up', 1.6, 15, 50],
  /* 0.2.11 第二批：近戰與投射物朝右畫，遊戲照出手方向旋轉（fxs 的 rot） */
  sslash: ['melee/sword-slash', 0.45, 20, 92],
  spin: ['melee/spin-slash', 0.55, 20, 104],
  dslash: ['melee/double-slash', 0.55, 20, 120],
  cleave: ['melee/heavy-cleave', 0.5, 20, 140, 0.5],
  hammer: ['melee/hammer-smash', 0.5, 20, 128, 0.4],
  claw: ['melee/claw-swipe', 0.5, 20, 92],
  whip: ['melee/whip-crack', 0.5, 20, 162],
  flurry: ['melee/dagger-flurry', 0.6, 20, 112],
  thrust: ['melee/thrust', 0.5, 20, 162],
  parry: ['impacts/parry', 0.6, 20, 60],
  landing: ['impacts/heavy-landing', 0.8, 20, 88],
  dirt: ['explosions/dirt-explosion', 1, 20, 100],
  blunt: ['impacts/blunt-hit', 0.6, 20, 50],
  arrow: ['projectiles/arrow', 0.3, 20, 20],
  tracer: ['projectiles/bullet-tracer', 0.3, 20, 20],
  disc: ['projectiles/energy-disc', 0.3, 20, 20],
  rise: ['spawn/summon-rise', 1.2, 15, 60],
  smoke: ['explosions/smoke-bomb', 1.2, 15, 110, 1.05],
  bleed: ['status/bleeding', 1, 15, 25],
  rage: ['status/rage', 0.8, 15, 35],
  pillar: ['holy/holy-pillar', 1.2, 15, 90],
  blinkin: ['arcane/blink-in', 0.8, 20, 50],
  gas: ['nature/poison-cloud', 1.2, 15, 120],
  /* 0.2.13 第三批（還沒產生前遊戲照舊畫，fxs 找不到就不播）：混沌箭（投射物縮小畫）、御劍訣打中的爆光、中毒、灌注新星、雷鳴擊的落雷 */
  void: ['shadow/void-orb', 0.8, 15, 60],
  mmhit: ['projectiles/magic-missile', 0.45, 20, 40, 1.45],
  poisoned: ['status/poisoned', 0.8, 15, 30],
  firering: ['fire/fire-ring', 1.0, 20, 100],
  strike: ['lightning/lightning-strike', 0.9, 20, 100, 1.1]
};

const SRC = process.argv[2];
if (!SRC) {
  console.error('用法：node tools/fx_sheets.mjs <pixelfx 的資料夾>');
  process.exit(1);
}
const HERE = join(dirname(fileURLToPath(import.meta.url)), '..'),
  lib = await import(pathToFileURL(join(SRC, 'tools', 'lib', 'fxlib.mjs'))),
  { encodePNG } = await import(pathToFileURL(join(SRC, 'tools', 'lib', 'png.mjs')));
mkdirSync(join(HERE, 'img', 'fx'), { recursive: true });

const out = {};
for (const [name, [id, maxS, fps, rad, from = 0]] of Object.entries(LIST)) {
  const fx = await lib.loadEffect(id),
    r = lib.renderFrames(fx, { fps, bg: 'none', actor: false }),
    frames = r.frames.slice(Math.round(from * fps), Math.round(from * fps) + Math.max(1, Math.round(maxS * fps))),
    { w, h } = r;
  /* 所有幀的共同外框（不透明的範圍），裁掉透明邊省大小 */
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (const f of frames)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (f.clear[(y * w + x) * 4 + 3])
          (x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y));
  if (x1 < 0) throw new Error(id + ' 全部透明');
  const fw = x1 - x0 + 1,
    fh = y1 - y0 + 1,
    n = frames.length,
    cols = Math.min(n, Math.max(1, Math.floor(2048 / fw))),
    rows = Math.ceil(n / cols),
    img = new Uint8ClampedArray(cols * fw * rows * fh * 4);
  frames.forEach((f, i) => {
    const ox = (i % cols) * fw,
      oy = Math.floor(i / cols) * fh;
    for (let y = 0; y < fh; y++)
      for (let x = 0; x < fw; x++) {
        const s = ((y + y0) * w + x + x0) * 4,
          d = ((oy + y) * cols * fw + ox + x) * 4;
        for (let k = 0; k < 4; k++) img[d + k] = f.clear[s + k];
      }
  });
  writeFileSync(join(HERE, 'img', 'fx', name + '.png'), encodePNG(cols * fw, rows * fh, img));
  const [OX, OY] = fx.meta.origin;
  out[name] = { w: fw, h: fh, n, cols, fps, ox: OX - x0, oy: OY - y0, rad };
  console.log(`${name.padEnd(8)} ${id.padEnd(28)} ${n} 幀 ${fw}×${fh}`);
}
/* 轉成調色盤 PNG（2.9MB → 0.8MB），跟 art.py 的大圖一樣 */
const py = spawnSync(
  'python3',
  [
    '-c',
    "import sys,glob\nfrom PIL import Image\nfor f in glob.glob(sys.argv[1]+'/*.png'): Image.open(f).convert('RGBA').quantize(256,method=Image.Quantize.FASTOCTREE).save(f,optimize=True)",
    join(HERE, 'img', 'fx')
  ],
  { stdio: 'inherit' }
);
if (py.status) console.error('⚠️ 調色盤壓縮失敗（要有 python3 與 Pillow），圖還是能用，只是比較大');
writeFileSync(
  join(HERE, 'js', 'fxsheets.js'),
  '/* 自動產生（tools/fx_sheets.mjs，特效來自 pixelfx，MIT）；不要手改。w×h 一格、n 幀、cols 每列幾格、ox/oy 中心點、rad 原圖半徑 */\nconst FXS = ' +
    JSON.stringify(out) +
    ';\n'
);
