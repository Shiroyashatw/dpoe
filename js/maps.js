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
  hp1: { d: 1, g: 'hp', t: '怪物增加 20% 生命', fx: { mhp: 20 } },
  hp2: { d: 2, g: 'hp', t: '怪物增加 40% 生命', fx: { mhp: 40 } },
  hp3: { d: 3, g: 'hp', t: '怪物增加 80% 生命', fx: { mhp: 80 } },
  dmg1: { d: 1, g: 'dmg', t: '怪物增加 15% 傷害', fx: { mdmg: 15 } },
  dmg2: { d: 2, g: 'dmg', t: '怪物增加 30% 傷害', fx: { mdmg: 30 } },
  dmg3: { d: 3, g: 'dmg', t: '怪物增加 50% 傷害', fx: { mdmg: 50 } },
  spd1: { d: 1, g: 'spd', t: '怪物增加 10% 移動速度', fx: { mspd: 10 } },
  spd2: { d: 2, g: 'spd', t: '怪物增加 20% 移動速度', fx: { mspd: 20 } },
  res1: { d: 1, g: 'res', t: '+20% 怪物元素抗性', fx: { mres: 20 } },
  res2: { d: 2, g: 'res', t: '+35% 怪物元素抗性', fx: { mres: 35 } },
  arm: { d: 1, g: 'arm', t: '怪物增加 50% 護甲', fx: { marm: 50 } },
  acc: { d: 1, g: 'acc', t: '怪物增加 30% 命中值', fx: { macc: 30 } },
  pack: { d: 1, g: 'pack', t: '每個房間有 50% 機率多 1 群怪物', fx: { pack: 25 } },
  elite: { d: 1, g: 'elite', t: '菁英怪物數量加倍', fx: { elite: 100 } },
  boss: { d: 2, g: 'boss', t: '地圖王增加 50% 生命、增加 20% 傷害', fx: { bhp: 50, bdmg: 20 } },
  fire: { d: 1, g: 'addF', t: '怪物獲得等同於 20% 傷害的額外火焰傷害', fx: { addF: 20 } },
  cold: { d: 1, g: 'addC', t: '怪物獲得等同於 20% 傷害的額外冰冷傷害', fx: { addC: 20 } },
  light: { d: 1, g: 'addL', t: '怪物獲得等同於 20% 傷害的額外閃電傷害', fx: { addL: 20 } },
  crit1: { d: 2, g: 'crit', t: '+10% 怪物暴擊率', fx: { mcrit: 10 } },
  crit2: { d: 3, g: 'crit', t: '+25% 怪物暴擊率、+50% 怪物暴擊傷害加成', fx: { mcrit: 25, mcritX: 0.5 } },
  bleed: { d: 2, g: 'bleed', t: '怪物擊中時有 25% 機率造成流血', fx: { mbleed: 25 } },
  poison: { d: 2, g: 'poison', t: '怪物擊中時有 25% 機率造成中毒', fx: { mpoi: 25 } },
  ignite: { d: 2, g: 'ignite', t: '怪物擊中時有 25% 機率點燃', fx: { mign: 25 } },
  regen1: { d: 1, g: 'regen', t: '玩家減少 40% 生命再生率', fx: { pregen: -40 } },
  regen3: { d: 3, g: 'regen', t: '玩家無法再生生命', fx: { pregen: -100 } },
  flask: { d: 1, g: 'flask', t: '玩家減少 30% 藥劑效果', fx: { pflask: -30 } },
  maxres1: { d: 2, g: 'maxres', t: '玩家 -10% 最大元素抗性', fx: { pmaxres: -10 } },
  maxres3: { d: 3, g: 'maxres', t: '玩家 -20% 最大元素抗性', fx: { pmaxres: -20 } },
  es: { d: 2, g: 'es', t: '玩家減少 40% 能量護盾充能速率', fx: { pes: -40 } },
  leech: { d: 1, g: 'leech', t: '玩家減少 50% 偷取量', fx: { pleech: -50 } },
  cuEle: { d: 2, g: 'curse', t: '玩家被元素要害詛咒，-20% 元素抗性', fx: { pcurse: 'eleweak', pcv: 20 } },
  cuTc: { d: 2, g: 'curse', t: '玩家被時空鎖鏈詛咒，15%更少移動速度', fx: { pcurse: 'tchains', pcv: 15 } },
  cuEn: { d: 3, g: 'curse', t: '玩家被衰弱詛咒，造成 20%更少傷害', fx: { pcurse: 'enfeeble', pcv: 20 } },
  cuVu: { d: 2, g: 'curse', t: '玩家被脆弱詛咒，30%更少護甲', fx: { pcurse: 'vuln', pcv: 30 } },
  pen: { d: 3, g: 'pen', t: '怪物的擊中穿透 15% 元素與混沌抗性', fx: { mpen: 15 } },
  /* 0.2.64：怪物無咒（你的詛咒技能沒用，只有「咒無可避」這類能影響）；濕透（整張圖都濕：感電機率 +50%、冰凍累積 +25%） */
  hexproof: { d: 1, g: 'hexproof', t: '怪物無法被詛咒', fx: { mhex: 1 } },
  blind: { d: 1, g: 'blind', t: '玩家減少 20% 命中值', fx: { pacc: -20 } },
  wet: { d: 1, g: 'wet', t: '玩家持續處於濕透', fx: { pwet: 1 } },
  /* 0.2.42 堅韌：怪物受到的傷害 ÷ (1 + 30%)，約少打 23%，跟「怪物生命 +30%」差不多，危險度 2 */
  tough: { d: 2, g: 'tough', t: '怪物堅韌 +30%', fx: { mtough: 30 } },
  /* 第 11 批：怪物死亡留下怪物方的地面（mech.js 的 mobGround），同組一張卡最多一種。
     危險度：只減益或要站著才吃虧的 1；會直接掉血、放大怪物傷害的 2；地面離開就沒事，沒有 3。
     0.3.0 掛機：AI 踩到怪物方的地面會往外走（ai.js），所以煙霧、凋零、油還是 1；奉獻地面是怪物站在上面回血、AI 沒辦法把怪物帶開，升成 2 */
  gCons: { d: 2, g: 'ground', t: '怪物死亡時有 25% 機率留下奉獻地面', fx: { gnd: 'cons' } },
  gSmoke: { d: 1, g: 'ground', t: '怪物死亡時有 25% 機率留下煙霧', fx: { gnd: 'smoke' } },
  gWither: { d: 1, g: 'ground', t: '怪物死亡時有 25% 機率留下凋零地面', fx: { gnd: 'wither' } },
  gOil: { d: 1, g: 'ground', t: '怪物死亡時有 25% 機率留下油滑地面', fx: { gnd: 'oil' } },
  gCorrupt: { d: 2, g: 'ground', t: '怪物死亡時有 25% 機率留下腐化地面', fx: { gnd: 'corrupt' } },
  gShock: { d: 2, g: 'ground', t: '怪物死亡時有 25% 機率留下感電地面', fx: { gnd: 'shockg' } },
  gIgnite: { d: 2, g: 'ground', t: '怪物死亡時有 25% 機率留下點燃地面', fx: { gnd: 'ignited' } },
  gThorn: { d: 2, g: 'ground', t: '怪物死亡時有 25% 機率留下荊棘地面', fx: { gnd: 'thorn' } },
  gHowl: { d: 2, g: 'ground', t: '怪物死亡時有 25% 機率留下怒號地面', fx: { gnd: 'howl' } },
  gEle: { d: 2, g: 'ground', t: '怪物死亡時有 25% 機率留下元素地面', fx: { gnd: 'ele' } }
};
/* 每條詞的獎勵：危險度越高越多（物品數量、稀有度、材料，%） */
const MOD_REW = [null, [4, 3, 4], [8, 6, 7], [13, 10, 11]];

/* 命運輪盤（0.2.74 賭徒的大點）：6 種籌碼，每種是強正面＋小代價；進圖時從中抽 2 種（rouletteOf，照地圖卡的種子，開地圖卡時就看得到）。
   fx 進 stats()（items.js，能力鍵都是既有的或 STATN 的），m 進 G.mm（跟地圖詞一樣：掉落與怪物生命）；t 是卡片與狀態列的說明 */
const ROUL = [
  { id: 'red', n: '紅', c: '#ff5a5a', t: '造成 30%更多傷害、增加 15% 承受的傷害', fx: { more: 30, takenUp: 15 } },
  { id: 'black', n: '黑', c: '#aab4c4', t: '承受 30%更少擊中傷害、造成 10%更少傷害', fx: { hitLess: 30, more: -10 } },
  {
    id: 'gold',
    n: '金',
    c: '#ffd166',
    t: '增加 60% 找到的物品稀有度、增加 30% 物品數量、怪物增加 20% 生命',
    m: { rar: 60, qty: 30, mhp: 20 }
  },
  {
    id: 'green',
    n: '綠',
    c: '#6ee06e',
    t: '增加 25% 技能速度、增加 20% 移動速度、增加 30% 技能魔力消耗',
    fx: { ss: 25, ms: 20, mpCostUp: 30 }
  },
  {
    id: 'blue',
    n: '藍',
    c: '#5ad1ff',
    t: '增加 100% 異常機率、增加 50% 異常幅度、減少 30% 異常持續時間',
    fx: { ailCh: 100, ailMag: 50, ignDur: -30, bleedDur: -30, poiDur: -30, chillDur: -30, shockDur: -30 }
  },
  {
    id: 'purple',
    n: '紫',
    c: '#c38bff',
    t: '增加 100% 暴擊率、+50% 暴擊傷害加成、非暴擊的擊中造成 20%更少傷害',
    fx: { critInc: 100, critX: 50, nonCritLess: 20 }
  }
];
/* 這張卡的輪盤：[籌碼 id, 籌碼 id]（照 ROUL 的順序，兩種不同）。種子是卡片的 seed（rollCard 抽的、存在存檔的卡裡）；
   沒有 seed 的卡（主線固定卡、舊存檔的卡）改用節點＋星級＋地圖詞，一樣固定。純函式：同一張卡每次都一樣，存檔還原後也一樣 */
function rouletteOf(card, node) {
  const str =
    card && card.seed != null
      ? 's' + card.seed
      : (node || '') + '|' + (card ? card.star + ':' + (card.mods || []).join() : '');
  let a = 2166136261;
  for (let i = 0; i < str.length; i++) a = Math.imul(a ^ str.charCodeAt(i), 16777619);
  const nx = () => (a = (Math.imul(a, 1664525) + 1013904223) >>> 0) / 4294967296,
    i = Math.floor(nx() * ROUL.length);
  let j = Math.floor(nx() * (ROUL.length - 1));
  if (j >= i) j++;
  return [ROUL[Math.min(i, j)].id, ROUL[Math.max(i, j)].id];
}
const rouletteTxt = ids => ids.map(id => ROUL.find(x => x.id === id)).map(r => `${r.n}籌碼：${r.t}`);

/* 費用只看星級：1★ 免費，每多一星 +2 碎片 */
/* 0.3.0：開圖免費（企劃書 2.1 第 3 項）；碎片只剩洗卡、重置區塊、門票 */
const mapCost = star => 0;
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
  /* seed：地圖種子（命運輪盤用，rouletteOf） */
  return { star, mods, seed: Math.floor(Math.random() * 2147483647) };
}
/* 一張卡的獎勵合計 */
function cardRew(card) {
  const r = [0, 0, 0];
  for (const k of (card && card.mods) || []) MOD_REW[MAPMOD[k].d].forEach((v, i) => (r[i] += v));
  return { qty: r[0], rar: r[1], mat: r[2] };
}
/* 進地圖時：把卡的詞綴合計成 G.mm（怪物、玩家、獎勵都讀它） */
function mapMods(card, cor, rou) {
  const o = { ...cardRew(card) },
    L = (card && card.mods) || [];
  /* 命運輪盤抽到的籌碼（金籌碼的掉落與怪物生命）；能力類的籌碼在 items.js 的 stats */
  for (const id of rou || [])
    for (const [f, v] of Object.entries(ROUL.find(x => x.id === id).m || {})) o[f] = (o[f] || 0) + v;
  /* cor：生肖王的墮落詞，同組的卡片詞換掉，不疊加 */
  for (const k of cor ? [...L.filter(x => MAPMOD[x].g !== MAPMOD[cor].g), cor] : L)
    for (const [f, v] of Object.entries(MAPMOD[k].fx)) o[f] = typeof v === 'string' ? v : (o[f] || 0) + v;
  return o;
}
const MM = k => (G.mm && G.mm[k]) || 0;
