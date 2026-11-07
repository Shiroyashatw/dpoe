/* dungeonPOE · 地圖卡（0.2.7）：星級 1～5＝詞綴數＝風險與獎勵。世界地圖每節點 3 張（world.js 的 wCards）；
   節點等級決定怪物強度與物品等級。規則在 docs/企劃書.md 第 4 節。純邏輯，check.js 也載入。 */
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
  crit2: { d: 3, g: 'crit', t: '怪物暴擊率 +25%、暴擊傷害加成 +50%', fx: { mcrit: 25, mcritX: 0.5 } },
  bleed: { d: 2, g: 'bleed', t: '怪物擊中時 25% 機率讓你流血', fx: { mbleed: 25 } },
  poison: { d: 2, g: 'poison', t: '怪物擊中時 25% 機率讓你中毒', fx: { mpoi: 25 } },
  ignite: { d: 2, g: 'ignite', t: '怪物擊中時 25% 機率點燃你', fx: { mign: 25 } },
  regen1: { d: 1, g: 'regen', t: '你的生命回復 −40%', fx: { pregen: -40 } },
  regen3: { d: 3, g: 'regen', t: '你不能回復生命（藥劑、生命偷取除外）', fx: { pregen: -100 } },
  flask: { d: 1, g: 'flask', t: '藥劑回復 −30%', fx: { pflask: -30 } },
  maxres1: { d: 2, g: 'maxres', t: '你的最大元素抗性 −10%', fx: { pmaxres: -10 } },
  maxres3: { d: 3, g: 'maxres', t: '你的最大元素抗性 −20%', fx: { pmaxres: -20 } },
  es: { d: 2, g: 'es', t: '能量護盾充能速度 −40%', fx: { pes: -40 } },
  leech: { d: 1, g: 'leech', t: '生命偷取 −50%', fx: { pleech: -50 } },
  cuEle: { d: 2, g: 'curse', t: '你被「元素要害」詛咒（元素抗性 −20%）', fx: { pcurse: 'eleweak', pcv: 20 } },
  cuTc: { d: 2, g: 'curse', t: '你被「時空鎖鏈」詛咒（緩速 15%）', fx: { pcurse: 'tchains', pcv: 15 } },
  cuEn: { d: 3, g: 'curse', t: '你被「衰弱」詛咒（造成的傷害更少 20%）', fx: { pcurse: 'enfeeble', pcv: 20 } },
  cuVu: { d: 2, g: 'curse', t: '你被「脆弱」詛咒（護甲 −30%）', fx: { pcurse: 'vuln', pcv: 30 } },
  pen: { d: 3, g: 'pen', t: '怪物穿透你 15% 的元素抗性', fx: { mpen: 15 } },
  /* 0.2.64：怪物無咒（你的詛咒技能沒用，只有「咒無可避」這類能影響）；濕透（整張圖都濕：感電機率 +50%、冰凍累積 +25%） */
  hexproof: { d: 1, g: 'hexproof', t: '怪物無咒（你的詛咒對牠們無效）', fx: { mhex: 1 } },
  blind: { d: 1, g: 'blind', t: '你被致盲（命中 −20%）', fx: { pacc: -20 } },
  wet: { d: 1, g: 'wet', t: '你一進圖就濕透（受到的閃電擊中更容易感電、冰冷擊中更容易冰凍）', fx: { pwet: 1 } },
  /* 0.2.42 堅韌：怪物受到的傷害 ÷ (1 + 30%)，約少打 23%，跟「怪物生命 +30%」差不多，危險度 2 */
  tough: { d: 2, g: 'tough', t: '怪物堅韌 +30%', fx: { mtough: 30 } },
  /* 第 11 批：怪物死亡留下怪物方的地面（mech.js 的 mobGround），同組一張卡最多一種。
     危險度：只減益或要站著才吃虧的 1；會直接掉血、放大怪物傷害的 2；地面離開就沒事，沒有 3 */
  gCons: { d: 1, g: 'ground', t: '怪物死亡有 25% 機率留下奉獻地面', fx: { gnd: 'cons' } },
  gSmoke: { d: 1, g: 'ground', t: '怪物死亡有 25% 機率留下煙霧', fx: { gnd: 'smoke' } },
  gWither: { d: 1, g: 'ground', t: '怪物死亡有 25% 機率留下凋零地面', fx: { gnd: 'wither' } },
  gOil: { d: 1, g: 'ground', t: '怪物死亡有 25% 機率留下油滑地面', fx: { gnd: 'oil' } },
  gCorrupt: { d: 2, g: 'ground', t: '怪物死亡有 25% 機率留下腐化地面', fx: { gnd: 'corrupt' } },
  gShock: { d: 2, g: 'ground', t: '怪物死亡有 25% 機率留下感電地面', fx: { gnd: 'shockg' } },
  gIgnite: { d: 2, g: 'ground', t: '怪物死亡有 25% 機率留下點燃地面', fx: { gnd: 'ignited' } },
  gThorn: { d: 2, g: 'ground', t: '怪物死亡有 25% 機率留下荊棘地面', fx: { gnd: 'thorn' } },
  gHowl: { d: 2, g: 'ground', t: '怪物死亡有 25% 機率留下怒號地面', fx: { gnd: 'howl' } },
  gEle: { d: 2, g: 'ground', t: '怪物死亡有 25% 機率留下元素地面', fx: { gnd: 'ele' } }
};
/* 每條詞的獎勵：危險度越高越多（物品數量、稀有度、材料，%） */
const MOD_REW = [null, [4, 3, 4], [8, 6, 7], [13, 10, 11]];

/* 費用只看星級：1★ 免費，每多一星 +2 碎片 */
const mapCost = star => 2 * (star - 1);
/* w5：5★ 的權重倍率（血霧期 ×3） */
function rollStar(w5 = 1) {
  const W = i => STARS[i].w * (i === 5 ? w5 : 1);
  let r = Math.random() * (W(1) + W(2) + W(3) + W(4) + W(5));
  for (let i = 1; i <= 5; i++) if ((r -= W(i)) <= 0) return i;
  return 1;
}
/* 抽卡是照「條」抽，組越大越常出現：地面詞 10 條同組，每張卡先隨機留 3 條，整組的權重等於 3 條詞，其他詞的相對比例不變 */
const GROUND_W = 3;
function rollCard(star = rollStar()) {
  const [lo, hi] = STARS[star].n,
    n = irnd(lo, hi),
    maxD = star <= 2 ? 2 : 3,
    gnd = Object.keys(MAPMOD).filter(k => MAPMOD[k].g === 'ground'),
    keep = new Set(Array.from({ length: GROUND_W }, () => gnd.splice(Math.floor(Math.random() * gnd.length), 1)[0])),
    pool = Object.keys(MAPMOD).filter(k => MAPMOD[k].d <= maxD && (MAPMOD[k].g !== 'ground' || keep.has(k))),
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
/* 一張卡的獎勵合計 */
function cardRew(card) {
  const r = [0, 0, 0];
  for (const k of (card && card.mods) || []) MOD_REW[MAPMOD[k].d].forEach((v, i) => (r[i] += v));
  return { qty: r[0], rar: r[1], mat: r[2] };
}
/* 進地圖時：把卡的詞綴合計成 G.mm（怪物、玩家、獎勵都讀它） */
function mapMods(card, cor) {
  const o = { ...cardRew(card) },
    L = (card && card.mods) || [];
  /* cor：生肖王的墮落詞，同組的卡片詞換掉，不疊加 */
  for (const k of cor ? [...L.filter(x => MAPMOD[x].g !== MAPMOD[cor].g), cor] : L)
    for (const [f, v] of Object.entries(MAPMOD[k].fx)) o[f] = typeof v === 'string' ? v : (o[f] || 0) + v;
  return o;
}
const MM = k => (G.mm && G.mm[k]) || 0;
