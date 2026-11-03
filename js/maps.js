/* dungeonPOE · 地圖卡（0.2.7）：地圖台給 8 張卡（一開始 3 張，打越高開越多），星級 1～5＝詞綴數＝風險與獎勵；
   階級（1～16）另外在地圖台選，決定怪物強度與物品等級。每把地圖打完才換一批（打開地圖台不會換，不能洗圖）。
   規則在 docs/企劃書.md 第 4 節。純邏輯，check.js 也載入。 */
'use strict';

/* 星級：顏色（藍黃紫橘紅）、詞綴數、出現權重（越高越少） */
const STARS = [
  null,
  { c: '#8ab4ff', n: [1, 3], w: 34 },
  { c: '#ffd166', n: [4, 6], w: 30 },
  { c: '#c38bff', n: [7, 9], w: 20 },
  { c: '#ff9f43', n: [10, 12], w: 11 },
  { c: '#ff5a5a', n: [13, 15], w: 5 }
];
/* 地圖詞：d 危險度（1 溫和、2 中等、3 致命；1～2★ 只抽 1～2）、g 同一組只會出一條、fx 效果（G.mm 合計） */
const MAPMOD = {
  hp1: { d: 1, g: 'hp', t: '怪物生命 +20%', fx: { mhp: 20 } },
  hp2: { d: 2, g: 'hp', t: '怪物生命 +40%', fx: { mhp: 40 } },
  hp3: { d: 3, g: 'hp', t: '怪物生命 +80%', fx: { mhp: 80 } },
  dmg1: { d: 1, g: 'dmg', t: '怪物傷害 +15%', fx: { mdmg: 15 } },
  dmg2: { d: 2, g: 'dmg', t: '怪物傷害 +30%', fx: { mdmg: 30 } },
  dmg3: { d: 3, g: 'dmg', t: '怪物傷害 +50%', fx: { mdmg: 50 } },
  spd1: { d: 1, g: 'spd', t: '怪物移動速度 +10%', fx: { mspd: 10 } },
  spd2: { d: 2, g: 'spd', t: '怪物移動速度 +20%', fx: { mspd: 20 } },
  res1: { d: 1, g: 'res', t: '怪物元素抗性 +20%', fx: { mres: 20 } },
  res2: { d: 2, g: 'res', t: '怪物元素抗性 +35%', fx: { mres: 35 } },
  arm: { d: 1, g: 'arm', t: '怪物護甲 +50%', fx: { marm: 50 } },
  acc: { d: 1, g: 'acc', t: '怪物命中 +30%', fx: { macc: 30 } },
  pack: { d: 1, g: 'pack', t: '怪物群多 25%', fx: { pack: 25 } },
  elite: { d: 1, g: 'elite', t: '菁英怪多一倍', fx: { elite: 100 } },
  boss: { d: 2, g: 'boss', t: '王的生命 +50%、傷害 +20%', fx: { bhp: 50, bdmg: 20 } },
  fire: { d: 1, g: 'addF', t: '怪物多造成 20% 的火焰傷害', fx: { addF: 20 } },
  cold: { d: 1, g: 'addC', t: '怪物多造成 20% 的冰冷傷害', fx: { addC: 20 } },
  light: { d: 1, g: 'addL', t: '怪物多造成 20% 的閃電傷害', fx: { addL: 20 } },
  crit1: { d: 2, g: 'crit', t: '怪物暴擊率 +10%', fx: { mcrit: 10 } },
  crit2: { d: 3, g: 'crit', t: '怪物暴擊率 +25%、暴擊傷害 +50%', fx: { mcrit: 25, mcritX: 0.5 } },
  bleed: { d: 2, g: 'bleed', t: '怪物擊中時 25% 機率讓你流血', fx: { mbleed: 25 } },
  poison: { d: 2, g: 'poison', t: '怪物擊中時 25% 機率讓你中毒', fx: { mpoi: 25 } },
  ignite: { d: 2, g: 'ignite', t: '怪物擊中時 25% 機率點燃你', fx: { mign: 25 } },
  regen1: { d: 1, g: 'regen', t: '你的生命回復 −40%', fx: { pregen: -40 } },
  regen3: { d: 3, g: 'regen', t: '你不能回復生命（藥水、吸血除外）', fx: { pregen: -100 } },
  flask: { d: 1, g: 'flask', t: '藥水回復 −30%', fx: { pflask: -30 } },
  maxres1: { d: 2, g: 'maxres', t: '你的最大元素抗性 −10%', fx: { pmaxres: -10 } },
  maxres3: { d: 3, g: 'maxres', t: '你的最大元素抗性 −20%', fx: { pmaxres: -20 } },
  es: { d: 2, g: 'es', t: '能量護盾回充速度 −40%', fx: { pes: -40 } },
  leech: { d: 1, g: 'leech', t: '吸血 −50%', fx: { pleech: -50 } },
  cuEle: { d: 2, g: 'curse', t: '你被「元素要害」詛咒（元素抗性 −20%）', fx: { pcurse: 'eleweak', pcv: 20 } },
  cuTc: { d: 2, g: 'curse', t: '你被「時空鎖鏈」詛咒（緩速 15%）', fx: { pcurse: 'tchains', pcv: 15 } },
  cuEn: { d: 3, g: 'curse', t: '你被「衰弱」詛咒（造成的傷害更少 20%）', fx: { pcurse: 'enfeeble', pcv: 20 } },
  cuVu: { d: 2, g: 'curse', t: '你被「脆弱」詛咒（護甲 −30%）', fx: { pcurse: 'vuln', pcv: 30 } },
  pen: { d: 3, g: 'pen', t: '怪物穿透你 15% 的元素抗性', fx: { mpen: 15 } }
};
/* 每條詞的獎勵：危險度越高越多（物品數量、稀有度、材料，%） */
const MOD_REW = [null, [4, 3, 4], [8, 6, 7], [13, 10, 11]];

/* 地圖台開放幾張：一開始 3 張，每打開 3 階多 1 張，第 16 階 8 張 */
const cardsOpen = s => Math.min(8, 3 + Math.floor((s.maxT - 1) / 3));
/* 費用：階級 t 花 t−1 個碎片，每多一星再 +2 */
const mapCost = (t, star = 1) => t - 1 + 2 * (star - 1);
function rollStar() {
  let r = Math.random() * STARS.reduce((a, s) => a + (s ? s.w : 0), 0);
  for (let i = 1; i <= 5; i++) if ((r -= STARS[i].w) <= 0) return i;
  return 1;
}
function rollCard() {
  const star = rollStar(),
    [lo, hi] = STARS[star].n,
    n = irnd(lo, hi),
    maxD = star <= 2 ? 2 : 3,
    pool = Object.keys(MAPMOD).filter(k => MAPMOD[k].d <= maxD),
    used = new Set(),
    mods = [];
  while (mods.length < n && pool.length) {
    const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    if (used.has(MAPMOD[k].g)) continue;
    used.add(MAPMOD[k].g);
    mods.push(k);
  }
  return { star, mods };
}
/* 這一批 8 張（存在存檔裡；進地圖時清掉，下次打開地圖台才抽新的） */
const mapCards = s => (s.cards = s.cards || Array.from({ length: 8 }, rollCard));
/* 一張卡的獎勵合計 */
function cardRew(card) {
  const r = [0, 0, 0];
  for (const k of (card && card.mods) || []) MOD_REW[MAPMOD[k].d].forEach((v, i) => (r[i] += v));
  return { qty: r[0], rar: r[1], mat: r[2] };
}
/* 進地圖時：把卡的詞綴合計成 G.mm（怪物、玩家、獎勵都讀它） */
function mapMods(card) {
  const o = { ...cardRew(card) };
  for (const k of (card && card.mods) || [])
    for (const [f, v] of Object.entries(MAPMOD[k].fx)) o[f] = typeof v === 'string' ? v : (o[f] || 0) + v;
  return o;
}
const MM = k => (G.mm && G.mm[k]) || 0;
