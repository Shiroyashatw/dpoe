/* num-asc3-tide §1 等級點：從 num-mat-v12 的經濟模擬（sim_v12.js，逐分鐘 CSV）找長老屋 Lv7／Lv10 到達的分鐘，
   讀那時的地點、怪物等級、輪數，再用遊戲本身的 xpNeed／xpMul／tierMul／lvT／mobLv／ascPoints 積分出角色等級與 maxT。
   用法：node levels.js <CSV 資料夾>…  （每個資料夾裡 s100_sd*.csv、s150_sd*.csv）→ 印表＋寫 levels.json
   CSV 的產生（num-mat-v12 分支 4ba446e 的 evidence/num-mat-v12/sim_v12.js，跟 runs_C 同設定、跑 90 小時）：
     for sec in 100 150; do for sd in 20261115 1 2 3 4 5 6 7 8 9; do
       env CRAFT=mix TRADE=1 CAP=wood:18000,iron:350000,hide:70000,silk:70000 SEC=$sec SEED=$sd MIN=5400 node sim_v12.js runs90/s${sec}_sd$sd.csv runs90/s${sec}_sd$sd.json; done; done
   本資料夾的 runs90.tar.xz 是那 20 個 CSV（解開：tar -xJf runs90.tar.xz）
   假設（sim_v12 沒有角色等級）：
   - 每輪 40 小怪＋1 菁英＋1 王（sim_v12 的 NS=40；材料來源.md §2.1），經驗照 game.js:1130 killMob 的公式；
   - 小怪的 D.xp 用 MOBS 裡非王非召喚怪的平均、王用 BOSSES 的平均；沒有死亡（死亡不扣經驗：game.js 沒有扣 S.xp 的地方）；
   - maxT 照 world.js:387 wClear：打倒節點王時 maxT = max(maxT, floor(lvT(節點等級)) + 1)，sim 每輪都打王；t16＝lvT ≥ 16 */
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const REPO = path.join(__dirname, '..', '..');
const ctx = { console, Math, Date, JSON, Object, Array, Set, location: { search: '' }, URLSearchParams,
  PAL_CSS: fs.readFileSync(path.join(REPO, 'css', 'style.css'), 'utf8') };
vm.createContext(ctx);
for (const f of ['palette.js', 'ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js'])
  vm.runInContext(fs.readFileSync(path.join(REPO, 'js', f), 'utf8'), ctx, { filename: f });
const R = s => vm.runInContext(s, ctx);
const mobXp = R(`(() => { const L = Object.values(MOBS).filter(m => !m.boss && !m.summon && m.xp); return L.reduce((a, m) => a + m.xp, 0) / L.length; })()`),
  bossXp = R('BOSSES.reduce((a, b) => a + b.xp, 0) / BOSSES.length'),
  xpNeed = R('xpNeed'), xpMul = R('xpMul'), tierMul = R('tierMul'), lvT = R('lvT'), mobLv = R('mobLv'), ascPoints = R('ascPoints');

function parse(f) {
  const L = fs.readFileSync(f, 'utf8').split('\n');
  const H = L[0].split(','), rows = [], ev = [];
  let i = 1;
  for (; i < L.length && L[i].trim(); i++) {
    const c = L[i].split(',');
    rows.push({ min: +c[0], node: +c[H.indexOf('第幾個地點')], mlv: +c[H.indexOf('怪物Lv')], rounds: +c[H.indexOf('輪數')], altar: +c[H.indexOf('altar等級')], forge: +c[H.indexOf('鍛造台等級')], slots: +c[H.indexOf('技能格數')] });
  }
  for (; i < L.length; i++) {
    const c = L[i].split(',');
    if (c[0] === '長老屋') ev.push({ lv: +c[1], sec: +c[2] });
  }
  return { rows, ev };
}
/* 角色等級：逐分鐘把這一分鐘多打的輪數 × 每輪經驗加上去（照當下等級算 xpMul） */
function walk(rows, uptoMin) {
  let lv = 1, xp = 0, maxT = 1, t16 = 0, last = 0;
  for (const r of rows) {
    if (r.min > uptoMin) break;
    const n = r.rounds - last;
    last = r.rounds;
    const t = lvT(r.mlv);
    for (let k = 0; k < n; k++) {
      const per = (m, el) => Math.max(1, Math.round(m * tierMul(t).hp * (el ? 4 : 1) * xpMul(lv, mobLv(t))));
      xp += 40 * per(mobXp, 0) + per(mobXp, 1) + per(bossXp, 0);
      while (xp >= xpNeed(lv) && lv < 300) (xp -= xpNeed(lv)), lv++;
      maxT = Math.max(maxT, Math.min(16, Math.floor(t) + 1));
      if (t >= 16) t16 = 1;
    }
  }
  return { lv, maxT, t16 };
}
const out = {};
for (const dir of process.argv.slice(2))
  for (const f of fs.readdirSync(dir).filter(f => /^s(100|150)_sd\d+\.csv$/.test(f))) {
    const sec = f.match(/^s(\d+)/)[1], { rows, ev } = parse(path.join(dir, f));
    for (const A of [7, 10]) {
      const e = ev.find(x => x.lv === A);
      if (!e) continue;
      const min = Math.ceil(e.sec / 60), row = rows.find(r => r.min >= min) || rows[rows.length - 1], w = walk(rows, min);
      const key = `s${sec}_Lv${A}`;
      /* 第一次到最後一個地點（22）的時間與那時的角色等級：sim_v12 假設角色打得動，這裡看角色等級跟怪物等級差多少 */
      const r22 = rows.find(r => r.node >= 22), w22 = r22 ? walk(rows, r22.min) : null;
      (out[key] = out[key] || []).push({ f, h: +(e.sec / 3600).toFixed(2), node: row.node, mlv: row.mlv, mapT: +lvT(row.mlv).toFixed(2), ...w, ascPts: ascPoints(w), forge: row.forge, slots: row.slots, h22: r22 ? +(r22.min / 60).toFixed(2) : null, lv22: w22 ? w22.lv : null });
    }
  }
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; },
  p90 = a => { const s = [...a].sort((x, y) => x - y); return s[Math.ceil(s.length * 0.9) - 1]; };
console.log(`小怪平均 D.xp ${mobXp.toFixed(2)}、王平均 ${bossXp}`);
console.log('組 | 種子數 | 小時 P50/P90 | 地點 | 怪物Lv | G.mapT | 角色Lv P50 (min–max) | maxT | t16 | 昇華點 | 鍛造台 | 技能格 | 第一次到地點 22（小時）| 那時角色Lv');
for (const [k, L] of Object.entries(out).sort()) {
  const g = f => L.map(x => x[f]);
  console.log([k, L.length, `${med(g('h'))}/${p90(g('h'))}`, med(g('node')), med(g('mlv')), med(g('mapT')), `${med(g('lv'))} (${Math.min(...g('lv'))}–${Math.max(...g('lv'))})`, med(g('maxT')), med(g('t16')), med(g('ascPts')), med(g('forge')), med(g('slots')), med(g('h22')), med(g('lv22'))].join(' | '));
}
fs.writeFileSync(path.join(__dirname, 'levels.json'), JSON.stringify(out, null, 1));
