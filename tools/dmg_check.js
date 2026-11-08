/* dungeonPOE 0.2.7 · 傷害與防禦的驗收（企劃書 7.2）：Lv30／60／90 各三套典型配裝（天賦路線＋同階級稀有裝），
   算打王幾秒、王一招打掉多少生命、各屬性減傷。用法：node tools/dmg_check.js [每格模擬次數，預設 400] [--seeds 種子數，預設 20] [--why] [--only 配裝名,配裝名…]（只跑列出的，亂數種子不變）*/
'use strict';
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
/* 固定亂數（mulberry32）：同一份程式每次結果一樣，批次前後的數字才比得出差別 */
let seed = 12345;
const sMath = Object.create(Math);
sMath.random = () => {
  let t = (seed = (seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ctx = { console, Math: sMath, Date, JSON, Object, Array, Set, location: { search: '' }, URLSearchParams };
vm.createContext(ctx);
for (const f of ['ptdata.js', 'data.js', 'items.js', 'craft.js', 'combat.js', 'maps.js', 'mech.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
/* 遊戲裡由 game.js 提供的全域：這裡給最小的替身 */
vm.runInContext(
  `var G = { t: 0, mapT: 1, scene: 'map', mobs: [] }, P = {}, S, ST;
   const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
   const num = () => {}, fx = () => {}, fxs = () => {}, sfx = () => {}, tryUndying = () => false, die = () => {};`,
  ctx
);
const N = +process.argv[2] || 400;
const R = s => vm.runInContext(s, ctx);

/* 天賦：照權重貪心走（跟 docs/天賦下修對照.md 的推算一樣） */
function route(w, pts) {
  const T = R('PTREE'),
    I = T.I,
    ADJ = T.ADJ,
    have = new Set();
  const val = n => Object.entries(I[n].s || {}).reduce((a, [k, v]) => a + (w[k] || 0) * (+v || 0), 0);
  const bfs = src => {
    const prev = {},
      d = {},
      q = [...src];
    src.forEach(s => (d[s] = 0));
    while (q.length) {
      const c = q.shift();
      if (d[c] >= 14) continue;
      /* 鎖住的預留點不能點 */
      for (const n of ADJ[c] || [])
        if (d[n] === undefined && !have.has(n) && !I[n].lock) (d[n] = d[c] + 1), (prev[n] = c), q.push(n);
    }
    return { d, prev };
  };
  const s0 = R('PT_START')
    .map(s => [s, Object.entries(bfs([s]).d).reduce((a, [n, dd]) => a + val(n) / (1 + dd), 0)])
    .sort((a, b) => b[1] - a[1])[0][0];
  have.add(s0);
  let used = 0;
  while (used < pts) {
    const { d, prev } = bfs([...have]);
    let bt = null,
      br = -1;
    for (const n of Object.keys(d)) {
      if (have.has(n) || !d[n]) continue;
      let p = n,
        g = 0,
        c = 0;
      while (!have.has(p)) (g += val(p)), c++, (p = prev[p]);
      if (c <= pts - used && g / c > br) (br = g / c), (bt = n);
    }
    if (!bt) break;
    const path = [];
    for (let p = bt; !have.has(p); p = prev[p]) path.push(p);
    path.reverse().forEach(p => have.add(p));
    used += path.length;
  }
  return [...have];
}
/* 裝備：每一欄挑同階級的稀有裝（照權重從 4 件裡挑最好的，接近一般玩家） */
function gear(t, want, wt, off, L = 999, noInt) {
  const eq = {};
  for (const e of R('EQS')) {
    /* 第三枚戒指（0.2.74 異變者的第三隻手）平常是關著的，不配裝備 */
    if (e.k === 'ring3') continue;
    let best = null,
      bv = -1;
    for (let i = 0; i < 4; i++) {
      const pool = R('BASES').filter(
        b =>
          R('eqTakes')(e, b.k) &&
          b.lv <= t &&
          /* 穿得起的才挑：基底階級換算的需求等級（items.js 的 itemReq）不超過角色等級 */
          1 + Math.round(((b.lv - 1) * 82) / 15) <= L &&
          (e.k !== 'weapon' || b.wt === wt) &&
          (e.k !== 'off' || !off || b.k === off) &&
          (e.k !== 'weapon' || !off || !b.two) &&
          /* 異變者的巨臂：智慧視為 0，不挑要智慧的基底（能量護盾系防具） */
          (!noInt || !(b.b && b.b.es))
      );
      if (!pool.length) break;
      const b = pool[Math.floor(sMath.random() * pool.length)],
        it = R('mkItem')(b.id, R('tierIlvl')(t), 2),
        v = it.a.reduce((a, x) => a + (want[x.k] || 0) * (Array.isArray(x.v) ? x.v[1] : x.v), 0);
      if (v > bv) (bv = v), (best = it);
    }
    if (best && (e.k !== 'off' || R('offOK')(eq.weapon, best))) eq[e.k] = best;
  }
  return eq;
}
const BUILDS = {
  劍近戰: {
    tree: { meleeP: 2, atkP: 2, w_sword: 2, critInc: 1, critX: 1, as: 3, life: 0.3 },
    gear: {
      dmgP: 1,
      flat: 3,
      as: 2,
      crit: 5,
      critInc: 1,
      critX: 1,
      life: 0.5,
      resA: 1,
      resF: 0.5,
      resC: 0.5,
      resL: 0.5
    },
    wt: 'sword',
    sk: 'slash'
  },
  火法: {
    tree: { spellP: 2, eleP: 2, elemP: 2, w_staff: 2, castP: 3, pen: 2, life: 0.3 },
    gear: { spellP: 1, life: 0.5, es: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'staff',
    sk: 'fireball'
  },
  坦克: {
    tree: { life: 1, hpP: 10, armorP: 3, armorF: 0.5, regen: 2, resA: 5, blockInc: 2 },
    gear: { life: 1, armor: 0.5, block: 3, resA: 2, resF: 1, resC: 1, resL: 1, dmgP: 0.3 },
    wt: 'sword',
    sk: 'slash'
  },
  /* 0.2.23 特色大點與基石 */
  轉火: {
    tree: { meleeP: 2, w_sword: 2, cvPF: 3, fireP: 2, eleP: 2, as: 3, avatar: 3000, life: 0.3 },
    gear: { dmgP: 1, flat: 3, fire: 3, as: 2, life: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'sword',
    sk: 'slash'
  },
  混沌免疫: {
    tree: { spellP: 2, eleP: 2, elemP: 2, w_staff: 2, castP: 3, pen: 2, esP: 1, ci: 3000 },
    gear: { spellP: 1, es: 2, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'staff',
    sk: 'fireball'
  },
  箭雨: {
    tree: { projP: 2, atkP: 2, w_bow: 2, critInc: 1, as: 3, proj: 3000, pierce: 5, life: 0.3 },
    gear: { dmgP: 1, flat: 3, as: 2, crit: 5, critInc: 1, life: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'bow',
    sk: 'split'
  },
  /* 0.2.25 昇華：asc 照順序點，點數照等級（ascPoints；Lv90 當作打過第 16 階的王） */
  風行神射: {
    tree: { projP: 2, atkP: 2, w_bow: 2, critInc: 1, as: 3, ms: 1, evP: 0.5, life: 0.3 },
    gear: {
      dmgP: 1,
      flat: 3,
      as: 2,
      crit: 5,
      critInc: 1,
      life: 0.5,
      ev: 0.5,
      resA: 1,
      resF: 0.5,
      resC: 0.5,
      resL: 0.5
    },
    wt: 'bow',
    sk: 'split',
    asc: ['wind', 's3', 'far', 's4', 'endless', 's5', 'falcon', 's1', 'gale'],
    /* 狙射：當作平均飛 400（更多 24%）；獵鷹印記：當作每一下都打到被印記的（更多 10%） */
    fly: 400,
    falcon: 1
  },
  鐵金剛: {
    tree: { meleeP: 2, atkP: 1, w_mace: 2, shieldP: 1, armorP: 3, armorF: 0.5, blockInc: 1, life: 0.5, hpP: 5 },
    gear: { dmgP: 1, flat: 3, as: 1, life: 0.8, armor: 1, block: 1, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'mace',
    off: 'shield',
    sk: 'quake',
    asc: ['iron', 's4', 'mass', 's1', 'wall', 's2', 'push', 's5', 'stun']
  },
  /* 0.2.26：地獄火（火法＋點燃：點燃當作一直掛著，每秒傷害＝每一下火焰 ×20%×點燃加成，扣火抗）；
     影舞者（匕首暴擊＋暴擊施放電弧：每秒觸發次數＝每秒暴擊數 × 能量÷100；暴擊球當 3 顆、暴擊弱點當上限） */
  地獄火: {
    tree: { spellP: 2, eleP: 2, elemP: 2, w_staff: 2, castP: 3, pen: 2, fireP: 2, ailMag: 2, life: 0.3 },
    gear: { spellP: 1, life: 0.5, es: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'staff',
    sk: 'fireball',
    asc: ['hell', 's2', 'shaper', 'f2', 'ember', 'f3', 'scorch', 's1', 'pact'],
    ign: 1
  },
  影舞者: {
    tree: { meleeP: 1, atkP: 2, w_dagger: 2, critInc: 3, critX: 3, as: 3, spellP: 1, life: 0.3 },
    gear: {
      dmgP: 1,
      flat: 3,
      as: 2,
      crit: 5,
      critInc: 2,
      critX: 2,
      life: 0.5,
      resA: 1,
      resF: 0.5,
      resC: 0.5,
      resL: 0.5
    },
    wt: 'dagger',
    sk: 'slash',
    asc: ['shade', 's3', 'deadly', 's4', 'hunt', 's6', 'hex', 's1', 'after'],
    coc: 'arc'
  }
};
/* 0.2.46 每種武器一套（之後每批技能的數值驗收拿這些當基準）：路線與裝備跟劍近戰同一組權重，只換武器專精與主力招。
   shortcut: 只算主力招單發 × 出手速度，段數、彈夾裝填、盛怒、連擊都沒算；要比連招時再加 */
const WG = {
    dmgP: 1,
    flat: 3,
    as: 2,
    crit: 5,
    critInc: 1,
    critX: 1,
    life: 0.5,
    resA: 1,
    resF: 0.5,
    resC: 0.5,
    resL: 0.5
  },
  WT = (w, more) => ({ atkP: 2, ['w_' + w]: 2, critInc: 1, critX: 1, as: 3, life: 0.3, ...more });
Object.assign(BUILDS, {
  斧: { tree: WT('axe', { meleeP: 2 }), gear: WG, wt: 'axe', sk: 'cleave' },
  細杖: { tree: WT('qstaff', { meleeP: 2 }), gear: WG, wt: 'qstaff', sk: 'combo' },
  長矛: { tree: WT('spear', { projP: 2 }), gear: WG, wt: 'spear', sk: 'spearthrow' },
  十字弓: { tree: WT('xbow', { projP: 2 }), gear: WG, wt: 'xbow', sk: 'apshot' },
  爪: { tree: WT('claw', { meleeP: 2 }), gear: WG, wt: 'claw', sk: 'clawchain' },
  鏈錘: { tree: WT('flail', { meleeP: 2 }), gear: WG, wt: 'flail', sk: 'chainsweep' },
  魔符: { tree: WT('talisman', { meleeP: 2, priP: 2 }), gear: WG, wt: 'talisman', sk: 'bearmaul' },
  盾: {
    tree: WT('mace', { meleeP: 2, shieldP: 2, armorP: 2 }),
    gear: { ...WG, armor: 1, block: 1 },
    wt: 'mace',
    off: 'shield',
    sk: 'shieldcrush'
  },
  /* 0.2.69：血魔（斧＋流血，企劃書 7.4）。流血與腐化之血當作一直掛著：流血每秒＝每一下物理 ×15%×流血加成×血價更多，
     腐化之血疊滿上限（10＋缺血）、每層每秒＝每一下物理 ×7.5%；赤鐮的結算只是把持續傷害提早收，沒另外算進 DPS，
     另外印出「赤鐮一下約結算多少」（流血剩 5 秒、腐化之血平均剩 2.5 秒）與血價每秒扣的生命 */
  血魔: {
    tree: WT('axe', { meleeP: 2, bleedCh: 2, bleedMag: 2, ailMag: 1 }),
    gear: WG,
    wt: 'axe',
    sk: 'cleave',
    asc: ['blood', 's1', 'price', 's3', 'rot', 's4', 'wither', 's5', 'sickle'],
    blood: 1
  },
  /* 0.2.70：角鬥士（魔符＋狂怒重砸：狂怒重砸只有魔符能用，魔符是雙手所以大開大合成立）。⚠️ 盛怒當作一直滿（上限＝基礎 30＋昇華），
     每下只算一道震波（不算花盛怒的第二道震波與碎裂地面）、怒火傾瀉照每下花 10 點更多 10%；實戰盛怒要靠擊中補，比這裡低 */
  角鬥士: {
    tree: WT('talisman', { meleeP: 2, rageEff: 3, rageHit: 2 }),
    gear: WG,
    wt: 'talisman',
    sk: 'furyslam',
    asc: ['gladiator', 's7', 'wide', 's1', 'war', 's3', 'vent', 's4', 'exec'],
    rage: 1
  },
  /* 0.2.70：千機（十字弓＋穿甲彈＋爆裂榴彈）。⚠️ 估算：跟前面只算單發的十字弓不同，這兩行把裝填算進去（彈夾 ÷（彈夾 + 裝填），沒算戰術翻滾的立刻裝填
     與爆炸補給）、王當作一直完全破甲（穿甲彈本身就破甲）、再加爆裂榴彈的持續傷害（可存幾顆 ÷ 冷卻，子母彈再 +90%）。
     「十字弓＊」是同一套模型但沒有昇華，千機要跟它比，不要跟上面沒算裝填的十字弓比 */
  '十字弓＊': {
    tree: WT('xbow', { projP: 2, grenP: 2, reloadP: 2 }),
    gear: WG,
    wt: 'xbow',
    sk: 'apshot',
    ammo: 1,
    gren: 'grenade',
    broken: 1
  },
  千機: {
    tree: WT('xbow', { projP: 2, grenP: 2, reloadP: 2 }),
    gear: WG,
    wt: 'xbow',
    sk: 'apshot',
    asc: ['engineer', 's3', 'pierce', 's4', 'heavy', 's5', 'arsenal', 's6', 'cluster'],
    gearOf: '十字弓＊',
    ammo: 1,
    gren: 'grenade',
    broken: 1
  },
  /* 0.2.70：統治君王（劍近戰＋3 種魔像）。⚠️ 估算：dmg_check 本來算不了召喚物，這裡每隻魔像一下＝主力招 ×0.8（寶石等級的左鍵）、
     每 0.8 秒一下（吃召喚物攻速）、乘極大與萬象共鳴，隻數＝auraOn 裡的魔像（精魂給一枚 +160 的戒指，沒算魔像被打死的復甦時間與命中）；
     魔像的增益（火焰魔像傷害提高…）是真的進 stats()。「魔像＊」同一套模型沒有昇華（上限 1 隻），要跟它比 */
  '魔像＊': {
    tree: WT('sword', { meleeP: 2, minionP: 2, spiritP: 2 }),
    gear: WG,
    wt: 'sword',
    sk: 'slash',
    golems: ['golem', 'g_fire', 'g_thunder'],
    spirit: 160
  },
  統治君王: {
    tree: WT('sword', { meleeP: 2, minionP: 2, spiritP: 2 }),
    gear: WG,
    wt: 'sword',
    sk: 'slash',
    asc: ['ruler', 's1', 'bond', 's3', 'lord', 's4', 'reson', 's2', 'order'],
    gearOf: '魔像＊',
    golems: ['golem', 'g_fire', 'g_thunder'],
    spirit: 160
  },
  /* 0.2.70：詭雷師（陷阱器＋冰霜陷阱）。⚠️ 估算：dmg_check 算不了場上單位，這裡一個陷阱爆一下＝主力招一下，把陷阱直接放在王腳下
     （0.4 秒上膛後觸發）：觸發頻率＝min(放置速度, 每 0.4 秒一個)，雙重機關 ×2；沒算魔力；王當作一直致盲（生於暗影的暴擊率才算得到）。
     陷阱上限（雷區、重磅炸藥的 −2）、誘爆、地毯轟炸、機巧的範圍、地雷在打單一王的模型裡看不到價值（要預先佈雷、打群怪才有）。
     「詭雷＊」同一套模型沒有昇華，要跟它比 */
  '詭雷＊': {
    tree: { spellP: 2, eleP: 2, elemP: 2, w_traptool: 2, unitP: 2, castP: 2, life: 0.3 },
    gear: { spellP: 1, life: 0.5, es: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'traptool',
    sk: 'frosttrap',
    trap: 1
  },
  詭雷師: {
    tree: { spellP: 2, eleP: 2, elemP: 2, w_traptool: 2, unitP: 2, castP: 2, life: 0.3 },
    gear: { spellP: 1, life: 0.5, es: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'traptool',
    sk: 'frosttrap',
    asc: ['trapper', 's7', 'heavy', 's4', 'gadget', 's5', 'shadow', 's1', 'zone'],
    gearOf: '詭雷＊',
    trap: 1
  },
  /* 0.2.71：破陣者（斧＋狂暴戰吼＋劈砍，企劃書 7.4）。⚠️ 假設：強化常駐（劈砍每下更多 30%＋寶石等級、強化攻擊傷害提高 empP）、15 盛怒、威嚇常掛在王身上；
     打王時周圍強度 20（王 20 點）→ 萬夫莫敵攻擊更多 20%（受傷提高 10% 是代價，不在這張表的打王秒數裡）。先聲奪人（強化次數）與吼聲不絕（冷卻回復）在
     「強化常駐」的假設下看不出價值（它們的價值是在怪堆裡讓強化接得上），先登（衝刺）、耐力球減傷與不消失、一夫當關（持矛）也不在單一王的模型裡。
     「戰吼＊」同一套模型沒有昇華，破陣者要跟它比 */
  '戰吼＊': { tree: WT('axe', { meleeP: 2 }), gear: WG, wt: 'axe', sk: 'cleave', cry: 1 },
  破陣者: {
    tree: WT('axe', { meleeP: 2 }),
    gear: WG,
    wt: 'axe',
    sk: 'cleave',
    asc: ['breaker', 's1', 'loud', 's3', 'horde', 's2', 'echo', 's4', 'van'],
    gearOf: '戰吼＊',
    cry: 1
  },
  /* 0.2.74 第四批（企劃書 7.4）。各自的假設標在輸出的 ⚠️，對照組（名字加「－」，自動產生）兩邊的模型旗標一樣。
     潮汐（長杖＋電弧，冰冷＋閃電）：⚠️ 浪潮之心當作一直 10 層（要一直造成感電或冰凍，每層冰冷與閃電傷害提高 5%）；潮落（冰冷轉閃電）、驚濤、汐引的拉怪與鹹水地面、
     寒潮反擊、海神之軀在打單一王的模型裡看不到價值（它們是群怪與生存） */
  潮汐: {
    tree: { spellP: 2, eleP: 2, elemP: 2, w_staff: 2, castP: 3, pen: 2, coldP: 2, lightP: 2, ailMag: 2, life: 0.3 },
    gear: { spellP: 1, life: 0.5, es: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'staff',
    sk: 'arc',
    asc: ['tide', 's1', 'fall', 's3', 'ebb', 's4', 'pull', 's5', 'heart'],
    tide: 1
  },
  /* 賭徒（長杖＋火球）：⚠️ 豪賭與累積賭注照真的擲（每格連續 400 下，P.bet 一路累積，所以平均＝期望值）、逆轉賠率照這張表王的火焰抗性；
     梭哈（0.2.74 驗收後補）⚠️ 假設一冷卻好就放（常開）：開著的比例＝持續時間 ÷ 實際冷卻（20 秒 ÷ (1 + 冷卻恢復)），那段時間每下都是大獎（×`jackpotX`、沒有沒開出的 −25%、不累積賭注）；
     受到的傷害 +50%、命運輪盤、天公疼憨人不算。路線：豪賭、累積賭注、梭哈、逆轉賠率（不拿手氣正旺）；Lv30／60 的點跟之前一樣（梭哈要到 Lv90 才有） */
  賭徒: {
    tree: { spellP: 2, eleP: 2, elemP: 2, w_staff: 2, castP: 3, pen: 2, fireP: 2, ailMag: 2, life: 0.3 },
    gear: { spellP: 1, life: 0.5, es: 0.5, resA: 1, resF: 0.5, resC: 0.5, resL: 0.5 },
    wt: 'staff',
    sk: 'fireball',
    asc: ['gambler', 's1', 'gamble', 's2', 'bet', 's3', 'allin', 's4', 'flip'],
    gamb: 1
  },
  /* 異變者（劍＋斬擊）：⚠️ 變異核心當作 4 件裝備是腐化的（對照組同樣的 4 件也腐化，只是沒有昇華點所以沒作用）；甲蟲之殼鎖腰帶（腰帶的數值不算，護符沒算）；
     複眼的必中、閃避歸零，蟾蜍之血、腹蛇之眼、第三隻手在這張表看不到價值（是生存與第三枚戒指，沒配多一枚戒指的裝備） */
  異變者: {
    tree: WT('sword', { meleeP: 2 }),
    gear: WG,
    wt: 'sword',
    sk: 'slash',
    asc: ['mutant', 's4', 'arm', 's5', 'eye', 's1', 'core', 's6', 'shell'],
    cor: 4,
    noInt: 1
  },
  /* 追獵者（斧＋劈砍＋毒霧藥劑）：⚠️ 中毒當作穩態（同時存在的筆數＝每秒中毒次數 × 持續時間，上限 1＋煉毒師的層數；每筆每秒＝每下可中毒傷害 ×20% × 異常強度）；
     毒霧藥劑只用起始的 3 瓶（沒算殺怪補充能；調製讓一瓶只花一半）：開著的時間 ＝ 瓶數 ÷ 每次花的瓶數 × 持續時間，佔打王時間的比例＝「藥劑開著的比例」，那段時間才有毒霧
     （每秒 2 次混沌擊中、必定中毒）與以毒攻毒（擊中必定中毒、中毒更多 25%）；催毒只是把中毒提早結算（總傷害不變，沒算）；疾風藥劑、石膚藥劑在這張表看不到價值 */
  追獵者: {
    tree: WT('axe', { meleeP: 2, poisonCh: 3, chaosP: 2, ailMag: 1 }),
    gear: WG,
    wt: 'axe',
    sk: 'cleave',
    asc: ['stalker', 's1', 'gas', 's4', 'wind', 's5', 'selfpoi', 's2', 'alch'],
    flaskB: 1
  },
  /* 神裔（劍＋斬擊）：⚠️ 挑一組固定的 4 條輻條：辰龍、亥豬、丑牛、寅虎（照這個順序點）。這張表看得到的只有：辰龍（每第 10 次擊中的隕石，單體打王時目標自己吃一發：每秒 次數 ÷ 10 × 150% × 擊中前總傷害，吃火焰抗性）、
     亥豬（⚠️ 當作一直 10 層殺戮：實際要先殺怪才有，打單一王沒有）；丑牛（沉重暈眩中才有 +30%）、寅虎（沒有流血的劍）、其餘 8 位神在單一王的模型裡看不到價值（傳染、連鎖、足跡、詛咒、點燃瞬結、召喚物承傷）。
     所以比值只看得到「最樂觀的情況」，不代表神裔強度；真正的價值（群怪）要上線後看數據 */
  神裔: {
    tree: WT('sword', { meleeP: 2 }),
    gear: WG,
    wt: 'sword',
    sk: 'slash',
    asc: ['godson', 's_dragon', 'dragon', 's_pig', 'pig', 's_ox', 'ox', 's_tiger', 'tiger'],
    god: 1
  }
});
/* 0.2.73 昇華前後比：每個昇華一個「同裝備、同路線、沒有昇華」的對照（名字加「－」；千機／統治君王／詭雷師／破陣者的對照是上面的「＊」）。
   追加在最後面，前面每一格的亂數種子不變；昇華專屬的假設（狙射的飛行距離、獵鷹印記）對照組沒有，其餘模型旗標（點燃、暴擊施放、流血、盛怒）兩邊一樣 */
for (const [bn, B] of Object.entries({ ...BUILDS }))
  if (B.asc && !B.gearOf) {
    const { asc, fly, falcon, ...rest } = B;
    BUILDS[bn + '－'] = { ...rest, gearOf: bn };
  }
const TWIN = { 千機: '十字弓＊', 統治君王: '魔像＊', 詭雷師: '詭雷＊', 破陣者: '戰吼＊' };
for (const [bn, B] of Object.entries(BUILDS)) if (B.asc && !B.gearOf) TWIN[bn] = bn + '－';
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
/* 0.2.36 穩固值：同樣扣完減傷的總傷害，全部換成一種累積，30 秒打死王時定得住幾次（用真的 poiseAdd，打不打得中、抗性不算） */
console.log(
  '階級  王生命    穩固值  累滿占王生命 冰/電/暈(近戰物理)  30 秒打死：定住次數 冰/電/暈  第一次(秒)  累滿占生命 精英/普通'
);
for (const t of [1, 4, 8, 12, 13, 16]) {
  const avgMob = R('Object.values(MOBS).map(x => x.hp)').reduce((a, b) => a + b, 0) / R('Object.keys(MOBS).length'),
    tm = R('tierMob')(t),
    bossHp = Math.max(...R('BOSSES').map(b => b.hp)) * tm.hp * R('bossHpMul')(t) * R('MOB_HP'),
    mobHp = avgMob * tm.hp * R('MOB_HP'),
    fill = { frz: 2.1, elc: 1.7, hs: 0.58 * 2.25 },
    pct = (v, hp) => ((v / hp) * 100).toFixed(0) + '%';
  /* poiseAdd 會讀 ST.immobBuild（0.2.68）：這張表沒有配裝，給一份空角色的數值 */
  R(`ST = stats({ lv: 1, eq: {}, pt: [], asc: null, at: [], auras: [], charms: [] }); G.mapT = ${t}; G.t = 0`);
  const po = R(`poise({ boss: 1, ail: {} }, 'frz')`),
    run = (k, dmg) => {
      ctx.b = { boss: 1, ail: {} };
      R(`G.t = 0`);
      let n = 0,
        first = 0;
      for (let i = 0; i < 90; i++) {
        const was = R(`immob(b.ail)`);
        R(`G.t = ${i / 3}; poiseAdd(b, '${k}', ${dmg})`);
        if (!was && R(`immob(b.ail)`)) (n += 1), (first = first || i / 3);
      }
      return [n, first];
    },
    hitD = bossHp / 90,
    rs = [run('frz', hitD), run('elc', hitD), run('hs', hitD * 2.25)],
    e = R(`poise({ elite: 1, ail: {} }, 'frz')`) / R('ELITE.hp'),
    n = R(`poise({ ail: {} }, 'frz')`);
  console.log(
    [
      String(t).padStart(3),
      Math.round(bossHp).toString().padStart(9),
      Math.round(po).toString().padStart(8),
      `${pct(po / fill.frz, bossHp)}/${pct(po / fill.elc, bossHp)}/${pct(po / fill.hs, bossHp)}`.padStart(16),
      rs
        .map(x => x[0])
        .join('/')
        .padStart(14),
      rs
        .map(x => x[1].toFixed(1))
        .join('/')
        .padStart(16),
      `${pct(e / 2.1, mobHp)}/${pct(n / 2.1, mobHp)}`.padStart(14)
    ].join('  ')
  );
}
console.log('等級 階級 配裝     每秒傷害  王生命   打王秒數  王一招(火/物)  生命  物理減傷 火抗 命中');
/* 0.2.47：裝備是隨機擲的，同一套配裝換種子打王秒數可以差三倍，所以每格跑 SEEDS 個種子；
   明細只印第一個種子，最後印平均（--seeds n，預設 20，Opus 用 30 個種子比對過：5 個種子太少，一把運氣好壞的裝備就讓平均跳一倍） */
const SEEDS = +(process.argv[process.argv.indexOf('--seeds') + 1] || 20) || 20,
  AVG = {},
  HIT = {};
let SD = 0;
const out = (...a) => SD || console.log(...a);
for (SD = 0; SD < SEEDS; SD++)
  for (const L of [30, 60, 90]) {
    const t = Math.min(16, Math.max(1, Math.round(((L - 5) * 15) / 78) + 1));
    let bi = 0;
    const bidx = {};
    for (const [bn, B] of Object.entries(BUILDS)) {
      /* 每一格自己的亂數種子：新增配裝不會讓別格的數字跟著變（0.2.46）；gearOf＝跟那一套抽同一組裝備與路線（比昇華前後用） */
      bidx[bn] = bi++;
      if (ONLY && !ONLY.includes(bn)) continue;
      seed = 12345 + L * 1000 + bidx[B.gearOf || bn] + SD * 100000;
      const ap = R('ascPoints')({ maxT: t, t16: L >= 90 ? 1 : 0 }),
        S = {
          lv: L,
          eq: gear(t, B.gear, B.wt, B.off, L, B.noInt),
          pt: [],
          ptA: {},
          asc: B.asc ? B.asc[0] : null,
          at: B.asc ? ['a_st', ...B.asc.slice(1, 1 + ap).map(k => 'a_' + k)] : [],
          auras: [],
          charms: []
        };
      /* 被昇華鎖住的欄位（異變者的甲蟲之殼鎖腰帶、腹蛇之眼鎖頭部）：遊戲裡裝備會脫到背包，這裡直接拿掉，不然永遠算「穿不起」 */
      ctx.S = S;
      for (const k of Object.keys(S.eq)) (ctx.__k = k), R('eqOpen(S, __k)') || delete S.eq[k];
      /* 過路點的能力值：一點一點補，每點選「讓全身裝備缺的能力值總和降最多」的那一項（用 eqLack，自己給的不算自己），都不缺就加力量。
       能力值點只佔全樹 7.5%：穿不起時像玩家一樣繞去拿，路線給能力值點權重（aw），由小到大試到穿得起 */
      /* 級距要細：一口氣從 8 跳到 16 會多繞幾十個能力值點（0.2.45 箭雨 Lv90 繞了 109 點） */
      for (const aw of [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16]) {
        S.pt = route({ ...B.tree, attr: aw }, R('ptPoints')(L));
        S.ptA = {};
        const I = R('PTREE').I,
          need = { str: 0, dex: 0, int: 0, lv: 0 };
        ctx.S = S;
        /* 各項能力值全身裝備缺的總和（eqLack：自己給的不算自己、失效的不給） */
        const lack = () => {
          const d = { 力量: 0, 敏捷: 0, 智慧: 0 };
          for (const k of Object.keys(S.eq)) {
            ctx.__k = k;
            for (const [n, have, req] of R('eqLack(S, S.eq.' + k + ', __k)')) if (n in d) d[n] += req - have;
          }
          return d;
        };
        for (const it of Object.values(S.eq)) {
          ctx.__it = it;
          const q = R('itemReq(__it)');
          for (const k in need) need[k] = Math.max(need[k], q[k]);
        }
        S.need = need;
        for (const id of S.pt.filter(id => I[id].s && I[id].s.attr)) {
          const d = lack(),
            c = [
              ['s', '力量'],
              ['d', '敏捷'],
              ['i', '智慧']
            ].sort((a, b) => d[b[1]] - d[a[1]])[0];
          S.ptA[id] = d[c[1]] > 0 ? c[0] : 's';
        }
        S.aw = aw;
        if (!R('eqCheck(S).bad.size')) break;
      }
      /* 魔像：光環欄放魔像、ring2 多一條精魂（⚠️ 假設的精魂來源） */
      if (B.golems) {
        ctx.__g = B.golems;
        ctx.__lv = R('gemCap')(L);
        S.auras = R('__g.map(k => mkGem(k, __lv))');
        /* ring2 原本的詞綴留著（能力值需求靠它），只多加一條精魂 */
        S.eq.ring2 = S.eq.ring2 || R("mkItem('r_iron', 1, 0)");
        S.eq.ring2.a = [...S.eq.ring2.a, { k: 'spirit', v: B.spirit, T: 1 }];
      }
      /* 腐化的裝備件數（變異核心的假設）：兩邊同樣的件數，沒有昇華點就沒有作用 */
      if (B.cor)
        Object.values(S.eq)
          .slice(0, B.cor)
          .forEach(it => it && (it.cor = 1));
      ctx.S = S;
      R('S = this.S; ST = stats(S); G.mapT = ' + t + '; G.t = 0; P = { x: 0, y: 0, hp: ST.hp, es: ST.es, mp: ST.mp };');
      const ST = R('ST'),
        D = R('SKILLS')[B.sk],
        lv = R('gemCap')(L),
        c = { D, lv, mult: R('gemMult')(D, lv), more: 1, critInc: 0, critX: 0, fireAdd: 0, pen: 0, ailMag: 0 },
        /* 王是隨機的：用生命最高、傷害最高的組合當最壞情況 */
        bossD = {
          ...R('BOSSES')[0],
          hp: Math.max(...R('BOSSES').map(b => b.hp)),
          dmg: Math.max(...R('BOSSES').map(b => b.dmg))
        },
        tm = R('tierMob')(t),
        boss = {
          D: bossD,
          boss: 1,
          x: 100,
          y: 0,
          hp: bossD.hp * tm.hp * R('bossHpMul')(t) * R('MOB_HP'),
          el: bossD.el || 'phys',
          ail: {}
        };
      boss.mhp = boss.hp;
      ctx.boss = boss;
      R('mobDef(boss, ' + t + ')');
      let sum = 0;
      ctx.c = c;
      if (B.rage) {
        ctx.__rage = R('rageCap()');
        R('P.rage = __rage');
        if (ST.vent && D.rageCost) c.more *= 1 + (ST.vent * D.rageCost) / 100;
      }
      if (B.cry) {
        c.more *= 1 + (30 + lv - 1) / 100; /* 狂暴戰吼強化：每下更多 30%，寶石每級 +1% */
        c.empP = (c.empP || 0) + ST.empP;
        R('P.rage = 15');
        boss.ail.intim = 1e9;
        R('P.surrStr = ' + (ST.surrMore ? 20 : 0)); /* 王 20 點強度 */
      }
      if (B.broken) (boss.arm = 0), (boss.ail.broken = 1e9);
      if (B.trap) {
        if (ST.unitMore) c.more *= 1 + ST.unitMore / 100; /* gemCfg 才有的重磅炸藥，這裡手動補 */
        if (ST.unitBlind) boss.ail.blind = 1e9;
      }
      if (ST.heavyAmmo && D.ammo) c.more *= 1 + ST.heavyAmmo / 100; /* gemCfg 才有的重裝彈頭，這裡手動補 */
      if (B.falcon) boss.ail.mark = { k: 'falcon' };
      /* 浪潮之心：一直 10 層（只有點了才有；對照組沒有） */
      if (B.tide && ST.tideStk) R('P.stk = { tide: Array(10).fill(1e9) }');
      /* 神裔的殺戮：一直 10 層（只有點了亥豬才有；對照組沒有） */
      if (B.god && ST.rampage) R('P.stk = { rampage: Array(10).fill(1e9) }');
      /* 點燃一直掛著（炙烤的火焰曝曬才算得到）；暴擊球滿 3 顆、暴擊弱點堆到上限 */
      if (B.ign) boss.ail.ign = { dps: 1, t: 1e9 };
      if (ST.powCritX) R('P.chg = { p: { n: 3, t: 1e9 } }');
      if (ST.cwHit) boss.ail.cw = Array(ST.cwMax || 20).fill(1e9);
      let fireSum = 0,
        preSum = 0,
        poiSum = 0,
        physSum = 0,
        crits = 0;
      for (let i = 0; i < N; i++) {
        const r = R(
          `hitCalc(c, boss, { fly: ${B.fly || 0}, unit: ${B.trap ? 1 : 0} })`
        ); /* 陷阱是場上單位：吃場上單位傷害，不吃「你自己的擊中」*/
        sum += r.d;
        if (B.god) preSum += Object.values(r.pre).reduce((a, b) => a + b, 0);
        if (B.flaskB) (ctx.__p = r.pre), (poiSum += R("ailBase(__p, 'poi')"));
        fireSum += r.pre.fire;
        physSum += r.pre.phys;
        crits += r.crit ? 1 : 0;
      }
      /* 血魔：流血與腐化之血的每秒傷害（持續傷害不吃護甲）；赤鐮一下結算約多少 */
      let bleedDps = 0;
      const cbCap = B.blood && ST.rotBlood ? R('DEBUFF.cbMax') + Math.floor(ST.anemiaHit * R('debuffM()')) : 0;
      if (B.blood) bleedDps = (physSum / N) * 0.15 * (1 + (ST.ailMag + ST.bleedMag) / 100) * (1 + ST.bloodPrice / 100);
      const ignDps = B.ign
        ? (fireSum / N) *
          0.2 *
          (1 + (ST.ailMag + ST.shaper) / 100) *
          (1 + ST.ember / 100) *
          (1 - R(`resOf(boss, 'fire', ST.pen)`) / 100)
        : 0;
      let cocDps = 0;
      if (B.coc) {
        const sd = R('SKILLS')[B.coc];
        ctx.sc = { D: sd, lv, mult: 1, more: 1, critInc: 0, critX: 0, fireAdd: 0, pen: 0, ailMag: 0 };
        let ss = 0;
        for (let i = 0; i < N; i++) ss += R('hitCalc(sc, boss, { trig: 1 }).d');
        const atkRate = (ST.asM / D.t) * R('hitChance')(ST.acc, boss.ev);
        cocDps = (ss / N) * ((atkRate * crits) / N) * ((10 * (ST.hexCoc ? 2 : 1)) / 100) * ((sd.chain || 0) + 1);
      }
      /* 千機：彈夾 ÷（彈夾 + 裝填）；榴彈的持續傷害 */
      let ammoF = 1,
        grenDps = 0;
      if (B.ammo) {
        const clip = R('clipOf')(D),
          tShot = D.t / ST.asM,
          rl = D.ammo[1] / (1 + ST.reloadP / 100);
        ammoF = (clip * tShot) / (clip * tShot + rl);
        const gd = R('SKILLS')[B.gren];
        ctx.gc = {
          D: gd,
          lv,
          mult: R('gemMult')(gd, lv),
          more: 1,
          critInc: 0,
          critX: 0,
          fireAdd: 0,
          pen: 0,
          ailMag: 0
        };
        let gs = 0;
        for (let i = 0; i < N; i++) gs += R('hitCalc(gc, boss, {}).d');
        grenDps =
          (gs / N) * ((gd.gren[0] + ST.grenUse) / (gd.gren[1] / (1 + ST.grenCd / 100))) * (1 + (ST.cluster ? 0.9 : 0));
      }
      /* 統治君王：魔像的傷害估算（見上面配裝的說明） */
      let golemDps = 0,
        nGol = 0;
      if (B.golems) {
        nGol = ST.auraOn.filter(R('isGolem')).length;
        ctx.gc2 = { ...c, mult: c.mult * 0.8 };
        let gs = 0;
        for (let i = 0; i < N; i++) gs += R('hitCalc(gc2, boss, { minion: 1 }).d');
        golemDps =
          ((nGol * (gs / N) * (1 + (ST.golemSyn * Math.max(0, nGol - 1)) / 100) * (ST.colossus ? 1.2 : 1)) / 0.8) *
          (1 + ST.minAs / 100);
      }
      const trapTrig = B.trap ? Math.min((1 + ST.castP / 100) / D.t, 1 / 0.4) * (ST.rearm ? 2 : 1) : 0,
        hit = sum / N,
        spell = R('isSpell')(D),
        rate = B.trap ? trapTrig : spell ? (1 + ST.castP / 100) / D.t : ST.asM / D.t,
        /* 0.2.22：攻擊要乘命中率（法術一律命中） */
        hc = spell || ST.noMiss ? 1 : R('hitChance')(ST.acc, boss.ev),
        /* 腐化之血的層數：每下擊中給 rotBlood 層、各 cbT 秒 → 穩態層數＝攻速 × rotBlood × cbT，上限 cbCap（0.2.73 起，原本當一直滿） */
        cbN = Math.min(cbCap, rate * (ST.rotBlood || 0) * (B.blood ? R('DEBUFF.cbT') : 0)),
        cbDps = cbN * (physSum / N) * (B.blood ? R('DEBUFF.rotDps') : 0),
        /* 追獵者：中毒的穩態 DPS ＋ 毒霧開著時的毒霧擊中（見配裝說明）；對照組只有主技能打出來的中毒 */
        /* 神裔：辰龍的隕石（單體打王時目標自己吃一發） */
        godDps =
          B.god && ST.meteorN
            ? ((rate * hc) / ST.meteorN) * 1.5 * (preSum / N) * (1 - R(`resOf(boss, 'fire')`) / 100)
            : 0,
        /* 賭徒的梭哈：開著的比例 × (每下都是大獎 − 平常的期望傷害)；平常的期望傷害 ＝ 沒豪賭的一下 × jackpotEV */
        allinAdd =
          B.gamb && ST.allin && ST.jackpotCh
            ? (() => {
                const A = R('SKILLS').allin,
                  duty = Math.min(1, A.dur / (A.cd / (1 + ST.cdr / 100)));
                return duty * ((hit / R('jackpotEV()')) * ST.jackpotX - hit);
              })()
            : 0,
        flaskDps = B.flaskB
          ? (() => {
              const per = poiSum / N /* 每下可中毒的傷害（物理＋混沌，已吃提高、更多） */,
                mag = 1 + (ST.ailMag + ST.poiMag) / 100,
                dur = 2 * (1 + ST.poiDur / 100),
                cap = 1 + ST.poiStack,
                chaosRes = 1 - R(`resOf(boss, 'chaos')`) / 100,
                taken = 1 + R(`takenInc(boss, 'chaos')`) / 100,
                lam = rate * hc,
                chance = Math.min(1, (ST.poisonCh * (1 + ST.ailCh / 100)) / 100),
                pois = (l, dpsEach) => Math.min(cap, l * dur) * dpsEach * chaosRes * taken;
              /* 毒霧開著的比例：起始 3 瓶，T0＝只靠主技能的打王時間 */
              const cost = R('flaskCost')(),
                up = ST.gasflask
                  ? Math.min(1, ((3 / cost) * 3 * (1 + ST.flask / 100)) / (boss.mhp / (hit * rate * hc + 1e-9)))
                  : 0,
                base = pois(lam * chance, per * 0.2 * mag),
                fpo = ST.flaskPoi ? 1.25 : 1;
              let act = base;
              if (ST.gasflask) {
                ctx.gcf = {
                  ...c,
                  D: R('SKILLS').gasflask,
                  mult: R('gemMult')(R('SKILLS').gasflask, lv),
                  poisonCh: 100
                };
                let gs = 0,
                  gp = 0;
                for (let i = 0; i < N; i++) {
                  const gr = R('hitCalc(gcf, boss, { mult: 0.4 })');
                  gs += gr.d;
                  ctx.__p = gr.pre;
                  gp += R("ailBase(__p, 'poi')");
                }
                const gasHit = (gs / N) * 2 * hc,
                  lamAll = lam * (ST.flaskPoi ? 1 : chance) + 2,
                  perAll = (per * lam * (ST.flaskPoi ? 1 : chance) + (gp / N) * 2) / lamAll;
                act = pois(lamAll, perAll * 0.2 * mag * fpo) + gasHit;
              }
              return (1 - up) * base + up * act - base;
            })()
          : 0,
        dps =
          flaskDps +
          godDps +
          (hit + allinAdd) * rate * ((D.cnt || 1) + (D.tags.includes('proj') ? ST.proj : 0)) * hc * ammoF +
          grenDps +
          golemDps +
          ignDps +
          cocDps +
          bleedDps +
          cbDps,
        hitDmg = bossD.dmg * tm.dmg * R('BOSS_DMG') * 1.4,
        /* 0.2.25：無盡箭矢的投射物 +1 已經在 ST.proj */
        ehp = ST.hp + ST.es,
        fire = R(`ST.res.fire`) && R(`effRes('fire')`),
        fireHit = hitDmg * (1 - R(`effRes('fire')`) / 100),
        physHit0 = hitDmg * (1 - Math.min(0.9, ST.armor / (ST.armor + 10 * hitDmg + 1))),
        /* 0.2.25 格擋值：滿的時候先吸收 40%（重盾前進 50%，讀 combat.js 的 BV.absHeavy），最多吸到格擋值 */
        bvAb = d => Math.min(ST.bv, d * R(ST.heavyShield ? 'BV.absHeavy' : 'BV.abs')),
        physHit = physHit0 - bvAb(physHit0);
      ((AVG[bn] = AVG[bn] || {})[L] = AVG[bn][L] || []).push(boss.mhp / dps);
      /* 王一招打掉多少生命（只記第一個種子）：昇華前後比與坦克檢查用 */
      if (!SD)
        (HIT[bn] = HIT[bn] || {})[L] = [
          Math.round(((fireHit - bvAb(fireHit)) / ehp) * 100),
          Math.round((physHit / ehp) * 100)
        ];
      out(
        [
          String(L).padStart(3),
          String(t).padStart(4),
          bn.padEnd(5, '　'),
          Math.round(dps).toString().padStart(8),
          Math.round(boss.mhp).toString().padStart(8),
          (boss.mhp / dps).toFixed(1).padStart(8),
          `${Math.round(((fireHit - bvAb(fireHit)) / ehp) * 100)}%/${Math.round((physHit / ehp) * 100)}%`.padStart(12),
          String(ehp).padStart(6),
          (Math.min(0.9, ST.armor / (ST.armor + 10 * hitDmg + 1)) * 100).toFixed(0).padStart(7) + '%',
          String(R(`effRes('fire')`)).padStart(4) + '%',
          Math.round(hc * 100)
            .toString()
            .padStart(4) + '%',
          ST.bv ? `格擋值 ${ST.bv}` : '',
          B.asc ? `昇華 ${S.at.length - 1} 點` : '',
          B.blood && ST.sickle
            ? `赤鐮一下約結算 ${Math.round(bleedDps * 5 + cbDps * 2.5)}（王生命 ${(((bleedDps * 5 + cbDps * 2.5) / boss.mhp) * 100).toFixed(1)}%）`
            : '',
          B.blood && ST.bloodPrice ? `血價每秒 −${(rate * R('DEBUFF.bloodSac')).toFixed(0)}% 最大生命` : '',
          B.blood && ST.rotBlood ? `腐化之血 ${cbN.toFixed(1)} 層（上限 ${cbCap}）` : '',
          /* 0.2.73 假設都標出來（前後比的時候兩邊一樣，比值只看昇華本身） */
          B.fly || B.falcon ? `⚠️ 假設：${B.fly ? `狙射飛 ${B.fly}` : ''}${B.falcon ? '、王一直有獵鷹印記' : ''}` : '',
          B.ign ? '⚠️ 假設：點燃一直掛在王身上' : '',
          B.god
            ? '⚠️ 假設：固定 4 條輻條（辰龍、亥豬、丑牛、寅虎）、殺戮一直 10 層、只算得到辰龍的隕石與亥豬；其他神單體看不到'
            : '',
          B.flaskB
            ? '⚠️ 假設：中毒穩態、毒霧只用起始 3 瓶（開著的比例看打王時間）、催毒只提早結算不算、疾風與石膚藥劑不算'
            : '',
          B.cor ? `⚠️ 假設：${B.cor} 件裝備是腐化的（變異核心）、複眼必中、甲蟲之殼鎖腰帶、其餘大點不算` : '',
          B.gamb
            ? '⚠️ 假設：豪賭與累積賭注照真的擲（賭注一路累積）、逆轉賠率照王的火焰抗性；受到的傷害 +50%、命運輪盤、天公疼憨人不算（梭哈常開）'
            : '',
          B.tide
            ? '⚠️ 假設：浪潮之心一直 10 層（每層冰冷與閃電傷害提高 5%），潮落的轉換、驚濤、汐引、反擊、海神之軀不算'
            : '',
          B.coc
            ? `⚠️ 假設：每次暴擊都觸發暴擊施放${ST.powCritX ? '、暴擊球 3 顆' : ''}${ST.cwHit ? '、暴擊弱點堆滿' : ''}`
            : '',
          B.blood ? '⚠️ 假設：流血一直掛著（腐化之血的層數照攻速估）' : '',
          B.ammo
            ? `⚠️ 估算：裝填係數 ${ammoF.toFixed(2)}、彈夾 ${R('clipOf')(D)}、榴彈 ${Math.round(grenDps)}/秒（占 ${Math.round((grenDps / dps) * 100)}%）、王一直完全破甲`
            : '',
          B.trap
            ? `⚠️ 估算：每秒觸發 ${trapTrig.toFixed(2)} 次（陷阱上限 ${Math.max(1, 4 + ST.units + ST.trapMax)} 沒算）、傷害更多 +${ST.unitMore}%`
            : '',
          B.golems
            ? `⚠️ 估算：魔像 ${nGol} 隻（上限 ${ST.golemMax}）、約 ${Math.round(golemDps)}/秒（占 ${Math.round((golemDps / dps) * 100)}%）、增益效果 +${ST.golemEff}%${ST.colossus ? '、巨像' : ''}`
            : '',
          B.cry
            ? `⚠️ 假設：強化常駐（更多 ${30 + lv - 1}%、強化攻擊傷害提高 ${ST.empP}%）、15 盛怒、威嚇常掛、打王強度 20（萬夫莫敵更多 ${(ST.surrMore * 20) / 2}%、受傷提高 ${(ST.surrTaken * 20) / 2}%）`
            : '',
          B.rage
            ? `⚠️ 盛怒當作一直滿（${R('P.rage')} 點，每點更多 ${(1 + ST.rageEff / 100).toFixed(2)}%）、每下一道震波`
            : '',
          ST.eqBad.length ? `❌穿不起 ${ST.eqBad.join('/')}` : '',
          `過路${JSON.stringify(Object.values(S.ptA).reduce((m, c) => ((m[c] = (m[c] || 0) + 1), m), {}))}${S.pt.filter(id => R('PTREE').I[id].s && R('PTREE').I[id].s.attr).length}點 失效${R('eqCheck(S).bad.size')} 能力值${ST.str}/${ST.dex}/${ST.int} 最高需求${S.need.str}/${S.need.dex}/${S.need.int} 等級${S.need.lv}`
        ].join(' ')
      );
      void fire;
      if (process.argv.includes('--why'))
        out(
          '     ',
          JSON.stringify({
            dmg: ST.dmg.map(Math.round),
            wadd: ST.wadd,
            add: ST.add,
            aps: +ST.aps.toFixed(2),
            crit: +ST.crit.toFixed(1),
            critX: ST.critX,
            inc: ST.dmgA + ST.atkP + ST.meleeP + ST.physP,
            spellInc: ST.spellP + ST.eleP + ST.fireP,
            gemMult: +c.mult.toFixed(2),
            /* 天賦樹本身：點了幾個大點／小點／過路點，各數值合計 */
            tree: (() => {
              const I = R('PTREE').I,
                n = S.pt.map(id => I[id]).filter(x => !x.gate),
                sum = {};
              for (const x of n) for (const k in x.s) sum[k] = (sum[k] || 0) + x.s[k];
              return {
                大: n.filter(x => x.big).length,
                小: n.filter(x => !x.big && x.th).length,
                過路: n.filter(x => !x.th).length,
                ...sum
              };
            })()
          })
        );
    }
  }
console.log('\n平均打王秒數（' + SEEDS + ' 個種子，括號是最快～最慢）');
console.log('配裝      Lv30                Lv60                Lv90');
for (const [bn, o] of Object.entries(AVG))
  console.log(
    bn.padEnd(5, '　') +
      [30, 60, 90]
        .map(L => {
          const v = o[L],
            m = v.reduce((a, b) => a + b, 0) / v.length;
          return (m.toFixed(1) + '（' + Math.min(...v).toFixed(0) + '～' + Math.max(...v).toFixed(0) + '）').padStart(
            18
          );
        })
        .join('  ')
  );
/* 0.2.73 昇華前後比：昇華 ÷ 同裝備沒昇華的對照（TWIN）；離譜＝< 0.40（太強）或 > 1.10（昇華反而變慢）。
   有格擋值的坦克系（鐵金剛）第 16 階（Lv90）被王打一下（火／物取大的）< 10% 生命＝太硬。⚠️ 前面各配裝的假設（盛怒常滿、強化常駐、點燃常掛…）兩邊一樣，比值只看昇華本身 */
console.log('\n昇華 vs 沒昇華（打王平均秒數；比值＝昇華 ÷ 對照，離譜：< 0.40 太強、> 1.10 變慢）');
const mean = v => v.reduce((a, b) => a + b, 0) / v.length;
for (const [bn, tw] of Object.entries(TWIN))
  if (AVG[bn] && AVG[tw]) {
    const cells = [30, 60, 90].map(L => {
      const a = mean(AVG[bn][L]),
        b = mean(AVG[tw][L]),
        r = a / b;
      return `${a.toFixed(1)}／${b.toFixed(1)} ＝ ${r.toFixed(2)}${r < 0.4 ? ' ❌太強' : r > 1.1 ? ' ❌變慢' : ''}`.padEnd(
        24
      );
    });
    console.log(bn.padEnd(5, '　') + '（對照 ' + tw + '）  ' + cells.join('  '));
  }
for (const bn of Object.keys(HIT).filter(k => BUILDS[k].off === 'shield')) {
  const h = HIT[bn][90],
    mx = Math.max(...h);
  console.log(
    `${bn.padEnd(5, '　')} 被王打一下（火／物 %生命，第一個種子）：` +
      [30, 60, 90].map(L => `Lv${L} ${HIT[bn][L].join('／')}`).join('  ') +
      (mx < 10 ? '  ❌太硬（Lv90 < 10%）' : '')
  );
}
