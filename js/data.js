/* dungeonPOE · 資料表：版本、主角、技能、地圖階級、裝備欄與底材、詞綴（T12～T1）、怪物、王 */
'use strict';
const VER = '0.2.18';
const KEY = 'dungeonpoe_v1';
const SLOT = new URLSearchParams(location.search).get('p') || '';

/* ---------- 主角（0.2.7：等級上限 300；到 100 級前每級生命 +12、魔力 +3，不給傷害；100 級後只給天賦點） ---------- */
const HERO = { hp: 120, mp: 60, mpReg: 5, spd: 230, dmg: [6, 10] };
const LVMAX = 300;
/* 100 級後每一級比前一級多 3% */
const xpNeed = lv => Math.round(40 * Math.pow(Math.min(lv, 100), 1.7) * Math.pow(1.03, Math.max(0, lv - 100)));

/* ---------- 技能寶石（0.2.2）：技能欄固定 5 格（左鍵、右鍵、Q、E、R），每格 1 顆技能＋2 顆輔助 ----------
   t 出手時間（吃攻速）、mp 魔力、cd 冷卻、m 傷害倍率、tags 標籤（輔助看標籤）、el 傷害全部轉成這個屬性、cls 主題（0.1 的職業） */
/* 詛咒、標記的說明（效果的程式在 combat.js 的 CURSES／MARKS） */
const CURSE_D = {
  enfeeble: '造成的傷害更少 20～29%',
  eleweak: '元素抗性 −40～59%',
  tchains: '緩速 40～59%',
  vuln: '護甲 −30～50%',
  despair: '混沌抗性 −35～49%'
};
const MARK_N = {
  sniper: '狙擊手標記',
  freeze: '冰凍標記',
  volt: '電壓標記',
  hound: '獵犬標記',
  assassin: '刺客標記',
  poacher: '獵人標記',
  warlord: '軍閥標記'
};
const MARK_D = {
  sniper: '下一次被暴擊時多受 50% 傷害並給你狂怒球',
  freeze: '被冰凍時給你附加冰冷的 buff',
  volt: '被電殛時給你附加閃電的 buff',
  hound: '流血會累積重暈，被重暈或死亡時血爆',
  assassin: '死亡時給你暴擊球',
  poacher: '被擊中時你回魔，死亡時給狂怒球並回血',
  warlord: '被擊中時你回血，死亡時給耐力球'
};
const SKILLS = {
  /* 0.2.9：wt 暫時對應到新的 18 種武器（每種攻擊武器至少有一招）；照武器身分的新技能在 0.2.11 做 */
  /* 0.2.7 詛咒（照 PoE2：丟一個範圍，1.5 秒後生效；每隻怪 1 個）與標記（單一目標，觸發時消耗；效果在 combat.js） */
  cu_enfeeble: {
    n: '衰弱',
    ic: 'sk_enfeeble',
    t: 0.35,
    mp: 14,
    m: 0,
    r: 110,
    curse: 'enfeeble',
    tags: ['spell', 'curse', 'aoe', 'occ'],
    d: '詛咒滑鼠位置的範圍（1.5 秒後生效）：' + CURSE_D.enfeeble
  },
  cu_eleweak: {
    n: '元素要害',
    ic: 'sk_elemweak',
    t: 0.35,
    mp: 14,
    m: 0,
    r: 110,
    curse: 'eleweak',
    tags: ['spell', 'curse', 'aoe', 'occ'],
    d: '詛咒滑鼠位置的範圍（1.5 秒後生效）：' + CURSE_D.eleweak
  },
  cu_tchains: {
    n: '時空鎖鏈',
    ic: 'sk_chaoschain',
    t: 0.35,
    mp: 14,
    m: 0,
    r: 110,
    curse: 'tchains',
    tags: ['spell', 'curse', 'aoe', 'occ'],
    d: '詛咒滑鼠位置的範圍（1.5 秒後生效）：' + CURSE_D.tchains
  },
  cu_vuln: {
    n: '脆弱',
    ic: 'sk_weaken',
    t: 0.35,
    mp: 14,
    m: 0,
    r: 110,
    curse: 'vuln',
    tags: ['spell', 'curse', 'aoe', 'occ'],
    d: '詛咒滑鼠位置的範圍（1.5 秒後生效）：' + CURSE_D.vuln
  },
  cu_despair: {
    n: '絕望',
    ic: 'sk_despair',
    t: 0.35,
    mp: 14,
    m: 0,
    r: 110,
    curse: 'despair',
    tags: ['spell', 'curse', 'aoe', 'occ'],
    d: '詛咒滑鼠位置的範圍（1.5 秒後生效）：' + CURSE_D.despair
  },
  mk_sniper: {
    n: MARK_N.sniper,
    ic: 'sk_markshot',
    t: 0.25,
    mp: 8,
    m: 0,
    mark: 'sniper',
    wt: ['bow'],
    tags: ['spell', 'mark'],
    d: '標記滑鼠附近的一隻怪：' + MARK_D.sniper
  },
  mk_freeze: {
    n: MARK_N.freeze,
    ic: 'sk_frostchain',
    t: 0.25,
    mp: 8,
    m: 0,
    mark: 'freeze',
    wt: ['qstaff'],
    tags: ['spell', 'mark'],
    d: '標記滑鼠附近的一隻怪：' + MARK_D.freeze
  },
  mk_volt: {
    n: MARK_N.volt,
    ic: 'sk_chainlight',
    t: 0.25,
    mp: 8,
    m: 0,
    mark: 'volt',
    wt: ['spear'],
    tags: ['spell', 'mark'],
    d: '標記滑鼠附近的一隻怪：' + MARK_D.volt
  },
  mk_hound: {
    n: MARK_N.hound,
    ic: 'sk_deathmark',
    t: 0.25,
    mp: 8,
    m: 0,
    mark: 'hound',
    wt: ['axe'],
    tags: ['spell', 'mark'],
    d: '標記滑鼠附近的一隻怪：' + MARK_D.hound
  },
  mk_assassin: {
    n: MARK_N.assassin,
    ic: 'sk_assassinate',
    t: 0.25,
    mp: 8,
    m: 0,
    mark: 'assassin',
    wt: ['dagger'],
    tags: ['spell', 'mark'],
    d: '標記滑鼠附近的一隻怪：' + MARK_D.assassin
  },
  mk_poacher: {
    n: MARK_N.poacher,
    ic: 'ail_mark',
    t: 0.25,
    mp: 8,
    m: 0,
    mark: 'poacher',
    wt: ['talisman'],
    tags: ['spell', 'mark'],
    d: '標記滑鼠附近的一隻怪：' + MARK_D.poacher
  },
  mk_warlord: {
    n: MARK_N.warlord,
    ic: 'sk_doom',
    t: 0.25,
    mp: 8,
    m: 0,
    mark: 'warlord',
    wt: ['mace', 'flail'],
    tags: ['spell', 'mark'],
    d: '標記滑鼠附近的一隻怪：' + MARK_D.warlord
  },
  /* 0.2.6 新增：每種武器、每種元素都有一招普攻 */
  /* 0.2.11 起每種武器 2 招（docs/技能分配.md）；機制在 mech.js、出手在 skills.js 的 actHit */
  thrust: {
    n: '招架反擊',
    ic: 'sk_riposte',
    t: 0.45,
    mp: 0,
    m: 1.3,
    r: 120,
    hits: [0.95],
    parry: 1,
    wt: ['spear'],
    tags: ['attack', 'melee'],
    d: '舉矛招架 0.4 秒（被近戰或投射物打到就擋下，攻擊者失衡），接著往前突刺一整排；刺中失衡的怪會消耗失衡、必定暴擊、給 1 顆狂怒球'
  },
  combo: {
    n: '連打',
    ic: 'sk_staffstrike',
    t: 0.55,
    mp: 0,
    m: 0.6,
    r: 110,
    arc: 1.8,
    gain: 1,
    hits: [0.3, 0.6, 0.9],
    wt: ['qstaff'],
    tags: ['attack', 'melee'],
    d: '3 下連打，每下打中 +1 連擊數；第 3 下打中得到 1 顆暴擊球（給雷鳴擊消耗）'
  },
  split: {
    n: '散射',
    ic: 'sk_multishot',
    t: 0.45,
    mp: 0,
    m: 0.7,
    spd: 900,
    cnt: 3,
    wt: ['bow'],
    tags: ['attack', 'proj'],
    d: '一次射出 3 支箭，扇形散開'
  },
  frostbolt: {
    n: '冰霜彈',
    ic: 'sk_iceshard',
    t: 0.45,
    mp: 5,
    m: 1.1,
    spd: 640,
    el: 'cold',
    tags: ['spell', 'proj', 'elem'],
    d: '往前飛的冰彈，穿過所有敵人、越遠越弱；冰緩 2 秒（移動變慢）'
  },
  arc: {
    n: '電弧',
    ic: 'sk_arc',
    t: 0.4,
    mp: 7,
    m: 0.9,
    chain: 4,
    el: 'light',
    tags: ['spell', 'elem'],
    d: '閃電打中滑鼠附近的敵人，再跳 4 次；感電 2 秒（受到的傷害 +15%）'
  },
  slash: {
    n: '斬擊',
    ic: 'sk_slash2',
    t: 0.36,
    mp: 0,
    m: 1,
    r: 100,
    arc: 2.1,
    gain: 2,
    stage: 1,
    wt: ['sword'],
    tags: ['attack', 'melee'],
    d: '扇形斬擊，打中每隻回 2 魔力；1 秒內再按進下一段，3 段一輪：第 3 段範圍 ×1.5、必定暴擊'
  },
  whirl: {
    n: '旋風斬',
    ic: 'sk_whirl',
    cls: 'ronin',
    t: 0.4,
    mp: 18,
    cd: 3,
    m: 1.8,
    r: 150,
    wt: ['sword'],
    tags: ['attack', 'melee', 'aoe', 'cd'],
    d: '原地迴旋，打周圍所有敵人並擊退'
  },
  iai: {
    n: '居合突進',
    ic: 'sk_iai',
    cls: 'ronin',
    t: 0.22,
    mp: 12,
    cd: 4,
    m: 1.5,
    dist: 300,
    wt: ['sword'],
    tags: ['attack', 'melee', 'move', 'cd'],
    d: '衝向滑鼠位置，斬過路上的敵人；衝刺中無敵'
  },
  quake: {
    n: '震地',
    ic: 'sk_groundslam',
    t: 0.55,
    mp: 14,
    m: 1.6,
    r: 170,
    arc: 1.4,
    stun: 0.6,
    wt: ['mace', 'flail'],
    tags: ['attack', 'melee', 'aoe'],
    d: '往前重擊地面，扇形範圍的敵人暈眩 0.6 秒，留下碎裂地面 2 秒（怪物緩速 30%），結束時餘震再打一次（×1.2）'
  },
  venom: {
    n: '毒刃雨',
    ic: 'sk_poisoncloud',
    cls: 'assassin',
    t: 0.4,
    mp: 16,
    m: 0.35,
    r: 110,
    dur: 3,
    el: 'chaos',
    tags: ['spell', 'aoe', 'dot', 'occ'],
    d: '在滑鼠位置下 3 秒毒刃雨：範圍裡的敵人每秒受混沌傷害'
  },
  fireball: {
    n: '火球',
    ic: 'sk_fire',
    cls: 'pyro',
    t: 0.45,
    mp: 9,
    m: 1.1,
    spd: 560,
    r: 70,
    cnt: 1,
    pierce: 0,
    el: 'fire',
    tags: ['spell', 'proj', 'aoe', 'elem'],
    d: '射出火球，打中爆炸（範圍火焰傷害）'
  },
  nova: {
    n: '灌注新星',
    ic: 'sk_fireburst',
    t: 0.4,
    mp: 15,
    m: 1.3,
    r: 165,
    el: 'fire',
    tags: ['spell', 'aoe', 'elem'],
    d: '以自己為中心爆出一圈火焰；有火灌注就消耗 1 層，範圍 ×1.5 並留下燃燒地面；有冰灌注就消耗 1 層，留下冰緩地面（灌注：撿起元素殘留物得到，點燃、冰緩、感電中的怪死掉會留下）'
  },
  meteor: {
    n: '隕石',
    ic: 'sk_meteor',
    cls: 'pyro',
    t: 0.5,
    mp: 28,
    cd: 5,
    m: 3.2,
    r: 125,
    delay: 0.7,
    el: 'fire',
    tags: ['spell', 'aoe', 'cd', 'elem'],
    d: '0.7 秒後隕石砸在滑鼠位置，大範圍火焰傷害'
  },
  wolf: {
    n: '召喚戰狼',
    ic: 'sk_bloodhowl',
    cls: 'tamer',
    t: 0.5,
    mp: 20,
    cd: 2,
    m: 0.5,
    cnt: 2,
    tags: ['minion', 'cd', 'occ'],
    d: '叫出 2 隻戰狼（這張地圖一直跟著你）；再放一次會補滿'
  },
  /* 0.2.4 陷阱、地雷、砲台、圖騰：放在場上的東西（unit），上限一起算 */
  frosttrap: {
    n: '冰霜陷阱',
    ic: 'sk_frosttrap',
    t: 0.3,
    mp: 10,
    m: 1.6,
    r: 110,
    stun: 1,
    el: 'cold',
    unit: 'trap',
    wt: ['traptool'],
    tags: ['spell', 'trap', 'aoe'],
    d: '丟出陷阱，敵人靠近就爆開：範圍冰冷傷害、凍住 1 秒'
  },
  blastmine: {
    n: '爆裂地雷',
    ic: 'sk_blastmine',
    t: 0.25,
    mp: 8,
    m: 1.4,
    r: 100,
    el: 'fire',
    unit: 'mine',
    wt: ['traptool'],
    tags: ['spell', 'mine', 'aoe'],
    d: '埋下地雷（可以疊好幾顆）；最後一顆埋下 1.2 秒後一起引爆，每多一顆全部 +10% 傷害'
  },
  ballista: {
    n: '弩砲台',
    ic: 'sk_ballista',
    t: 0.3,
    mp: 18,
    cd: 1,
    m: 0.45,
    dur: 10,
    rate: 0.45,
    unit: 'turret',
    wt: ['xbow'],
    tags: ['attack', 'proj', 'turret', 'cd'],
    d: '架起弩砲台（10 秒），自動射擊附近的敵人'
  },
  firetotem: {
    n: '火焰圖騰',
    ic: 'sk_firetotem',
    t: 0.35,
    mp: 20,
    cd: 1,
    m: 0.7,
    dur: 8,
    rate: 0.8,
    r: 60,
    el: 'fire',
    unit: 'totem',
    tags: ['spell', 'totem', 'proj', 'cd', 'pri'],
    d: '立起圖騰（8 秒），自動對附近的敵人吐火彈（小範圍爆炸）'
  },
  mirage: {
    n: '幻影斬',
    ic: 'sk_mirage',
    t: 0.3,
    mp: 14,
    cd: 6,
    m: 1,
    wt: ['sword'],
    tags: ['attack', 'melee', 'cd'],
    d: '在滑鼠位置召出劍士分身 4 秒，每 0.8 秒用斬擊砍最近的敵人（傷害 ×0.6）'
  },
  axethrow: {
    n: '擲斧',
    ic: 'sk_axespin',
    t: 0.4,
    mp: 5,
    m: 1,
    spd: 700,
    pierce: 1,
    bleed: 40,
    wt: ['axe'],
    tags: ['attack', 'proj'],
    d: '丟出旋轉的斧頭，穿透 1 隻；擊中 40% 機率流血'
  },
  rend: {
    n: '撕裂',
    ic: 'sk_rend',
    t: 0.4,
    mp: 8,
    m: 1.1,
    r: 100,
    arc: 1.6,
    wt: ['axe'],
    tags: ['attack', 'melee'],
    d: '近戰一斬；目標在流血就消耗流血，一次結算剩下的流血傷害 ×1.5，並讓附近 120 內的敵人也流血'
  },
  cleave: {
    n: '劈砍',
    ic: 'sk_cleave',
    t: 0.7,
    mp: 10,
    m: 2.2,
    r: 150,
    arc: 1.6,
    bleed: 60,
    hsM: 1.5,
    wt: ['axe'],
    tags: ['attack', 'melee', 'aoe'],
    d: '慢而重的大範圍下劈；擊中 60% 機率流血，重暈累積 ×1.5'
  },
  warcry: {
    n: '狂暴戰吼',
    ic: 'sk_warcry',
    t: 0.35,
    mp: 12,
    cd: 8,
    m: 0,
    r: 250,
    wt: ['axe'],
    tags: ['warcry', 'aoe', 'cd'],
    d: '立刻得到 15 點狂怒（攻擊傷害更多 1%／點），周圍 250 內的敵人被威嚇 4 秒（受到的傷害 +10%、造成的傷害 −10%）'
  },
  smash: {
    n: '重擊',
    ic: 'sk_bonecrush',
    t: 0.5,
    mp: 6,
    m: 1.6,
    r: 100,
    arc: 1.2,
    armBreak: 1,
    wt: ['mace', 'flail'],
    tags: ['attack', 'melee'],
    d: '單體重擊，物理擊中削減護甲；打中瀕臨重暈的怪＝碾壓一擊：直接重暈，並震傷周圍 120 內的敵人'
  },
  leap: {
    n: '跳砸',
    ic: 'sk_titanfall',
    t: 0.45,
    mp: 14,
    m: 1.8,
    r: 120,
    dist: 300,
    wt: ['mace', 'flail'],
    tags: ['attack', 'melee', 'aoe', 'move'],
    d: '跳到滑鼠位置（最遠 300，跳躍中無敵）砸地，落點留下碎裂地面 2 秒，結束時餘震再打一次（×0.8）'
  },
  fissure: {
    n: '裂地',
    ic: 'sk_earthquake',
    t: 0.55,
    mp: 12,
    m: 1.3,
    r: 55,
    wt: ['mace', 'flail'],
    tags: ['attack', 'melee', 'aoe'],
    d: '往前一連串 5 處裂地；打到完全破甲的怪會消耗破甲，這一下 ×2'
  },
  thunder: {
    n: '雷鳴擊',
    ic: 'sk_thorhammer',
    t: 0.5,
    mp: 12,
    m: 1.2,
    r: 60,
    el: 'light',
    wt: ['qstaff'],
    tags: ['attack', 'melee', 'aoe'],
    d: '砸地往前劈下閃電（物理轉成閃電）；消耗全部暴擊球，每顆多劈一道；連擊數 5 以上時也消耗連擊數，範圍 ×1.5'
  },
  spearthrow: {
    n: '擲矛',
    ic: 'sk_javelin',
    t: 0.45,
    mp: 6,
    m: 1.3,
    spd: 900,
    pierce: 2,
    wt: ['spear'],
    tags: ['attack', 'proj'],
    d: '擲出長矛，穿透 2 隻；消耗全部狂怒球，每顆多一根，多的會在擊中時爆炸'
  },
  gasarrow: {
    n: '毒氣箭',
    ic: 'sk_poison',
    t: 0.5,
    mp: 10,
    m: 0.8,
    spd: 850,
    r: 90,
    wt: ['bow'],
    tags: ['attack', 'proj', 'aoe'],
    d: '射出一箭，落點留下可燃的毒氣雲 5 秒（中毒）；被火焰擊中或引爆器打到會爆炸'
  },
  apshot: {
    n: '穿甲彈',
    ic: 'sk_apshot',
    t: 0.18,
    mp: 0,
    m: 0.7,
    spd: 1100,
    ammo: [6, 1.5],
    armBreak: 1,
    wt: ['xbow'],
    tags: ['attack', 'proj'],
    d: '彈夾 6 發，快速連射，物理擊中削減護甲；打完裝填 1.5 秒（裝填時這招不能用）'
  },
  grenade: {
    n: '爆裂手雷',
    ic: 'sk_combust',
    t: 0.35,
    mp: 10,
    m: 1.6,
    r: 100,
    gren: [2, 4],
    detonator: 1,
    wt: ['xbow'],
    tags: ['attack', 'proj', 'aoe'],
    d: '丟出會彈跳的手雷，1.5 秒後爆炸（火焰範圍傷害），也是引爆器（引爆可燃地面、其他手雷）；可存 2 顆，各冷卻 4 秒'
  },
  flyswords: {
    n: '御劍訣',
    ic: 'sk_fanblade',
    t: 0.35,
    mp: 10,
    m: 0.8,
    wt: ['dagger'],
    tags: ['attack', 'proj'],
    d: '召出 3 把飛劍環繞身邊（15 秒，最多 10 把）；已經滿了再按，就把全部飛劍射向滑鼠方向（每把一次擊中）'
  },
  shadowstrike: {
    n: '影襲',
    ic: 'sk_shadowstep',
    t: 0.3,
    mp: 8,
    cd: 3,
    m: 1.6,
    dist: 450,
    toMob: 1,
    wt: ['dagger'],
    tags: ['attack', 'melee', 'move', 'cd'],
    d: '瞬移到滑鼠附近敵人的背後一刺，必定暴擊；翻滾後 2 秒內使用傷害 ×2'
  },
  clawchain: {
    n: '連爪',
    ic: 'sk_bloodclaw',
    t: 0.5,
    mp: 0,
    m: 0.45,
    r: 90,
    arc: 1.6,
    hits: [0.2, 0.4, 0.6, 0.8],
    wt: ['claw'],
    tags: ['attack', 'melee'],
    d: '4 段快速爪擊，每段打中回 1% 最大生命'
  },
  blindpounce: {
    n: '盲擊撲',
    ic: 'sk_smokebomb',
    t: 0.3,
    mp: 10,
    cd: 5,
    m: 1.3,
    r: 110,
    dist: 320,
    toMob: 1,
    blind: 1,
    wt: ['claw'],
    tags: ['attack', 'melee', 'aoe', 'move', 'cd'],
    d: '撲向滑鼠附近的敵人，落地範圍攻擊並致盲 4 秒（命中值少 20%）'
  },
  chainsweep: {
    n: '鏈錘橫掃',
    ic: 'sk_sweep',
    t: 0.42,
    mp: 0,
    m: 1,
    r: 130,
    arc: 2.2,
    crit: 50,
    stage: 1,
    wt: ['mace', 'flail'],
    tags: ['attack', 'melee'],
    d: '甩鏈橫掃，暴擊率提高 50%；1 秒內再按進下一段，3 段越來越寬（範圍 ×1、×1.3、×1.7）'
  },
  banner: {
    n: '戰旗',
    ic: 'sk_banner',
    t: 0.3,
    mp: 0,
    m: 0,
    wt: ['mace', 'flail'],
    tags: ['banner'],
    d: '榮耀滿 100 才能用（擊中、暴擊、擊殺累積）：插下戰旗 10 秒，站在旗子範圍裡傷害提高 30%'
  },
  chaosbolt: {
    n: '混沌箭',
    ic: 'sk_chaosbolt',
    t: 0.35,
    mp: 6,
    m: 0.9,
    spd: 800,
    el: 'chaos',
    wither: 1,
    tags: ['spell', 'proj', 'occ'],
    d: '快速的混沌投射物，擊中疊 1 層凋零（受到的混沌傷害 +5%／層，最多 10 層）'
  },
  corpseboom: {
    n: '屍爆',
    ic: 'sk_corpseburst',
    t: 0.35,
    mp: 12,
    m: 0,
    r: 110,
    el: 'fire',
    detonator: 1,
    tags: ['spell', 'aoe', 'occ'],
    d: '引爆滑鼠附近的一具屍體：屍體最大生命 10% 的火焰範圍傷害，也是引爆器；附近沒有屍體就不能用'
  },
  paperdoll: {
    n: '召喚紙人',
    ic: 'sk_talisman',
    t: 0.4,
    mp: 14,
    m: 0.6,
    tags: ['minion', 'occ'],
    d: '消耗身邊的一具屍體，叫出紙人兵 15 秒（最多 4 隻），用這顆寶石的召喚物傷害攻擊；附近沒有屍體就不能用'
  },
  bearmaul: {
    n: '熊掌',
    ic: 'sk_berserk',
    t: 0.6,
    mp: 6,
    m: 1.7,
    r: 140,
    arc: 2.4,
    form: 'bear',
    wt: ['talisman'],
    tags: ['attack', 'melee', 'aoe', 'pri'],
    d: '變成熊（護甲 ×1.5、移速 −10%），大範圍爪擊，打中 +2 狂怒'
  },
  wolfpounce: {
    n: '狼撲',
    ic: 'sk_lunge',
    t: 0.3,
    mp: 8,
    m: 1.2,
    r: 80,
    dist: 300,
    toMob: 1,
    form: 'wolf',
    wt: ['talisman'],
    tags: ['attack', 'melee', 'move', 'pri'],
    d: '變成狼人（移速 +15%、攻速 +10%），撲向滑鼠附近的敵人，給牠上獵人標記'
  },
  /* 0.2.13 盾技能：副手要拿盾（off），基礎傷害看盾的護甲與閃避（shield，照 PoE1 的盾牌粉碎；stats 的 sdmg） */
  shieldcrush: {
    n: '盾牌粉碎',
    ic: 'sk_bash',
    t: 0.5,
    mp: 6,
    m: 1.6,
    r: 90,
    arc: 1.6,
    hsM: 2,
    off: 'shield',
    shield: 1,
    tags: ['attack', 'melee', 'aoe'],
    d: '用盾往前猛撞，重暈累積 ×2；打中瀕臨重暈的怪＝碾壓，直接重暈並震開周圍。基礎傷害看盾的護甲與閃避'
  },
  shieldthrow: {
    n: '盾牌投擲',
    ic: 'sk_shieldcharge',
    t: 0.4,
    mp: 8,
    m: 0.9,
    spd: 700,
    bounce: 3,
    off: 'shield',
    shield: 1,
    tags: ['attack', 'proj'],
    d: '丟出盾牌，在敵人之間彈 3 次再飛回手上；飛出去的時候你的格擋率是 0。基礎傷害看盾的護甲與閃避'
  },
  /* 0.2.13 原始・植物：地面效果 bloom（mech.js），重放或被引爆器碰到就提早爆 */
  redbloom: {
    n: '死亡紅花',
    ic: 'sk_vampire',
    t: 0.4,
    mp: 16,
    m: 0.4,
    r: 34,
    len: 220,
    dur: 4,
    boomM: 1.2,
    tags: ['spell', 'aoe', 'dot', 'pri'],
    d: '往滑鼠方向鋪一排 5 朵紅花（4 秒）：站在花上的敵人每秒受到物理傷害，其中 20% 吸取為你的生命；時間到整排爆炸，一定造成流血。場上只有一排，再放一次或被引爆器碰到就提早爆'
  }
};
/* 光環（0.2.4，照 PoE2）：插在光環欄、開著就一直生效，預留精魄；效果跟著寶石等級與光環效果變強 */
const AURAS = {
  anger: { n: '憤怒', ic: 'sk_anger', sp: 30, fx: { fireAdd: 15 }, d: '多造成傷害 15% 的火焰傷害' },
  precise: { n: '精準', ic: 'sk_precise', sp: 30, fx: { crit: 5, critX: 20 }, d: '暴擊率 +5%、暴擊傷害 +20%' },
  swift: { n: '迅捷', ic: 'sk_hasteaura', sp: 40, fx: { as: 10, ms: 8 }, d: '攻速 +10%、移動速度 +8%' },
  iron: { n: '堅毅', ic: 'sk_determination', sp: 30, fx: { armorP: 40, regen: 4 }, d: '護甲 +40%、每秒回復 4 生命' },
  purity: { n: '純淨', ic: 'sk_purityaura', sp: 30, fx: { resA: 15 }, d: '全部抗性 +15%' },
  clarity: { n: '冥思', ic: 'sk_clarity', sp: 30, fx: { esP: 25, mpReg: 40 }, d: '能量護盾 +25%、魔力回復 +40%' },
  wolfsp: {
    n: '戰狼精魄',
    ic: 'sk_command',
    sp: 40,
    fx: { wolf: 1 },
    d: '一隻戰狼一直跟著你（不用放技能，換地圖也在）'
  },
  golem: {
    n: '召喚魔像',
    ic: 'sk_guardtotem',
    sp: 30,
    fx: { golem: 1 },
    d: '一隻石魔像跟著你打怪；你站在它旁邊時，受到的傷害少 20%（它替你擋）'
  }
};
const AURA_SLOTS = 3,
  SPIRIT0 = 30;
/* 輔助寶石：need 要有其中一個標籤才生效 */
const SUPPORTS = {
  multi: { n: '多重投射', ic: 'sup_sp_multi', need: ['proj'], d: '投射物 +2，傷害更少 20%' },
  pierce: { n: '穿透', ic: 'sup_sp_pen', need: ['proj'], d: '投射物多穿透 3 隻' },
  area: { n: '範圍擴大', ic: 'sup_sp_aoe', need: ['aoe', 'melee'], d: '範圍 +40%' },
  fury: { n: '狂暴', ic: 'sup_sp_dmg', need: [], d: '傷害更多 35%，魔力消耗 ×1.4' },
  haste: { n: '連擊', ic: 'sup_sp_fastatk', need: ['attack', 'spell'], d: '出手速度更快 25%' },
  crit: { n: '致命', ic: 'sup_sp_crit', need: [], d: '暴擊率提高 50%、暴擊傷害加成 +40%' },
  leech: { n: '吸血', ic: 'sup_sp_leech', need: [], d: '擊中傷害的 3% 吸取為生命（1 秒內回完）' },
  cdr: { n: '冷卻縮減', ic: 'sup_sp_cd', need: ['cd'], d: '冷卻 ×0.65' },
  fireadd: { n: '附加火焰', ic: 'sup_sp_gfire', need: [], d: '多造成傷害 25% 的火焰附加傷害' },
  heavy: { n: '重擊', ic: 'sup_sp_heavy', need: ['melee'], d: '擊退 ×2、傷害更多 15%、重暈累積 +50%' },
  pack: { n: '群狼', ic: 'sup_sp_pet', need: ['minion'], d: '多 1 隻狼、狼的傷害更多 30%' },
  /* 0.2.7 異常與減益（企劃書 7.2）：機率、強度、特殊元素異常、曝露、破甲、電殛 */
  bleed: {
    n: '流血',
    ic: 'sup_sp_bleed',
    need: ['attack'],
    d: '擊中時 25% 機率造成流血（每秒物理傷害的 15%，5 秒；怪物移動時加倍）'
  },
  poison: { n: '中毒', ic: 'sup_sp_poison', need: [], d: '擊中時 25% 機率造成中毒（每秒物理＋混沌傷害的 20%，2 秒）' },
  poistack: { n: '劇毒', ic: 'sup_sp_ailx', need: [], d: '中毒可以多疊 2 層、異常強度提高 10%' },
  ailmag: {
    n: '異常強化',
    ic: 'sup_sp_dot',
    need: [],
    d: '異常強度提高 30%（點燃、流血、中毒、冰緩、焦灼、易碎、殘喘）'
  },
  scorch: { n: '焦灼', ic: 'sup_sp_ign', need: [], d: '火焰擊中改成造成焦灼（元素抗性最多 −30%，4 秒）' },
  brittle: { n: '易碎', ic: 'sup_sp_shatter', need: [], d: '冰冷擊中改成造成易碎（被擊中時暴擊率最多 +6%，4 秒）' },
  sap: { n: '殘喘', ic: 'sup_sp_ctrl', need: [], d: '閃電擊中改成造成殘喘（造成的傷害最多少 20%，4 秒）' },
  expose: { n: '曝露', ic: 'sup_sp_elefocus', need: [], d: '擊中時曝露：三種元素抗性 −20%，4 秒' },
  armbreak: {
    n: '破甲',
    ic: 'sup_sp_brutal',
    need: ['attack'],
    d: '物理擊中削減護甲；削到 0＝完全破甲，受到的物理傷害提高 20%'
  },
  elec: { n: '電殛', ic: 'sup_sp_glight', need: [], d: '閃電擊中累積電殛：累滿不能行動 5 秒（王 1.5 秒）' },
  wither: { n: '凋零', ic: 'sup_sp_wither', need: [], d: '混沌擊中造成凋零：每層受到的混沌傷害提高 5%，最多 10 層' },
  blind: { n: '致盲', ic: 'ail_n_blind', need: [], d: '擊中時致盲：命中值少 20%，4 秒' },
  arcane: {
    n: '秘術增強',
    ic: 'sup_sp_fastcast',
    need: ['spell'],
    d: '法術擊中時得到秘術增強（施法速度 +15%、魔力回復更多 20%，10 秒）'
  },
  /* 轉換：技能改成立圖騰（陷阱、地雷 0.2.11 起是陷阱器自己的技能） */
  totemc: {
    n: '轉圖騰',
    ic: 'sup_sp_totem',
    need: ['spell', 'attack'],
    conv: 'totem',
    d: '這個技能改成立圖騰（8 秒）：圖騰替你自動施放，傷害更少 30%'
  },
  /* 0.2.13：原本的 Meta 寶石改成輔助（mech.js 的 metaEvent）：插在法術上，那招就不能手動施放 */
  cast_crit: {
    n: '暴擊施放',
    ic: 'sup_sp_auto',
    need: ['spell'],
    meta: 'crit',
    d: '這招法術改成自動施放：你暴擊時累積能量（每次 +10），滿 100 自動對那個敵人施放；不能手動施放'
  }
};
/* 輔助的分類（0.2.9，照 PoE2 0.3）：同一分類不能插在同一顆技能上，可以跨技能重複；沒寫的分類就是自己（同一顆不能插兩次） */
const SUP_CAT = { scorch: 'alt', brittle: 'alt', sap: 'alt' };
const supCat = k => SUP_CAT[k] || k;
/* 寶石的使用等級（0.2.7，照 PoE2）：角色等級到了才能生成；生成面板照這個分組 */
const GEM_LV = {
  slash: 1,
  mirage: 3,
  axethrow: 1,
  rend: 3,
  cleave: 1,
  warcry: 3,
  smash: 1,
  leap: 1,
  fissure: 3,
  thunder: 3,
  spearthrow: 3,
  gasarrow: 3,
  apshot: 1,
  grenade: 3,
  flyswords: 1,
  shadowstrike: 3,
  clawchain: 1,
  blindpounce: 3,
  chainsweep: 1,
  banner: 3,
  chaosbolt: 1,
  corpseboom: 3,
  paperdoll: 1,
  bearmaul: 1,
  wolfpounce: 3,
  thrust: 1,
  combo: 1,
  split: 1,
  frostbolt: 1,
  arc: 1,
  quake: 3,
  fireball: 3,
  wolf: 3,
  frosttrap: 3,
  whirl: 5,
  venom: 5,
  nova: 5,
  blastmine: 5,
  ballista: 5,
  cu_enfeeble: 5,
  mk_sniper: 5,
  iai: 7,
  firetotem: 7,
  cu_tchains: 7,
  mk_assassin: 7,
  meteor: 9,
  cu_vuln: 9,
  mk_poacher: 9,
  cu_eleweak: 11,
  mk_warlord: 11,
  cu_despair: 13,
  mk_freeze: 13,
  mk_volt: 13,
  mk_hound: 15,
  cast_crit: 9,
  shieldcrush: 1,
  shieldthrow: 3,
  redbloom: 3,
  multi: 1,
  pierce: 1,
  area: 1,
  fury: 3,
  haste: 3,
  fireadd: 3,
  heavy: 3,
  bleed: 3,
  poison: 3,
  crit: 5,
  leech: 5,
  pack: 5,
  blind: 5,
  cdr: 7,
  totemc: 7,
  ailmag: 7,
  armbreak: 7,
  wither: 7,
  arcane: 7,
  poistack: 9,
  expose: 9,
  elec: 9,
  scorch: 11,
  brittle: 11,
  sap: 11,
  anger: 3,
  precise: 3,
  swift: 5,
  iron: 5,
  purity: 7,
  clarity: 7,
  wolfsp: 9,
  golem: 3
};
const gemLv = k => GEM_LV[k] || 1;
/* 寶石等級：上限 20、不能超過角色等級；每級傷害 +6%（輔助每級 +1%） */
const GEM_MAX = 20;
const gemNeed = lv => Math.round(30 * lv * lv);

/* ---------- 天賦樹（0.2.4，照 PoE＋漫步勇者）：中間挖空放昇華；18 條路線、每條「內段×外段」結構都不一樣；
   每個方向偏重一種體系、但小點會混搭隔壁的主題；沒有基石，大點都是全職業通用的強效果 ---------- */
const STATN = {
  life: ['最大生命', ''],
  mana: ['最大魔力', ''],
  armorF: ['護甲', ''],
  evF: ['閃避', ''],
  esF: ['能量護盾', ''],
  evP: ['閃避', '%'],
  blockInc: ['格擋率提高', '%'],
  critInc: ['暴擊率提高', '%'],
  atkP: ['攻擊傷害', '%'],
  aoeP: ['範圍傷害', '%'],
  physP: ['物理傷害', '%'],
  pen: ['元素穿透', '%'],
  ailMag: ['異常強度', '%'],
  bleedCh: ['擊中時造成流血的機率', '%'],
  poisonCh: ['擊中時造成中毒的機率', '%'],
  poiStack: ['中毒疊層上限', ''],
  impaleCh: ['持矛擊中時造成穿刺的機率', '%'],
  armBreak: ['物理擊中會破甲', ''],
  rageHit: ['近戰擊中時得到狂怒', ''],
  powOnCrit: ['暴擊時得到暴擊球的機率', '%'],
  arcaneHit: ['法術擊中時得到秘術增強的機率', '%'],
  tailwind: ['暴擊時得到順風', ''],
  onsKill: ['擊殺時得到猛攻的機率', '%'],
  unholyKill: ['擊殺時得到邪力的機率', '%'],
  castP: ['施法速度', '%'],
  hpP: ['生命', '%'],
  regen: ['每秒回復生命', ''],
  flask: ['藥水回復', '%'],
  armorP: ['護甲', '%'],
  block: ['格擋', '%'],
  meleeP: ['近戰傷害', '%'],
  shieldP: ['持盾時傷害', '%'],
  more: ['傷害更多', '%'],
  as: ['攻速', '%'],
  critX: ['暴擊傷害', '%'],
  crit: ['暴擊率', '%'],
  ms: ['移動速度', '%'],
  projP: ['投射物傷害', '%'],
  unitP: ['陷阱、地雷、圖騰、砲台傷害', '%'],
  units: ['陷阱、地雷、圖騰、砲台數量上限', ''],
  minionP: ['召喚物傷害', '%'],
  elemP: ['元素技能傷害', '%'],
  occP: ['秘術技能傷害', '%'],
  priP: ['原始技能傷害', '%'],
  eleP: ['元素傷害', '%'],
  spellP: ['法術傷害', '%'],
  aoe: ['範圍', '%'],
  es: ['能量護盾', ''],
  esP: ['能量護盾', '%'],
  esRec: ['能量護盾回充速度', '%'],
  spirit: ['精魄', ''],
  auraEff: ['光環效果', '%'],
  mpP: ['魔力', '%'],
  mpReg: ['魔力回復', '%'],
  cdr: ['冷卻縮減', '%'],
  resA: ['全部抗性', '%'],
  dmgA: ['傷害', '%'],
  rollCd: ['翻滾冷卻縮短', '%'],
  lowHp: ['生命低於一半時傷害', '%'],
  fullHp: ['生命全滿時傷害', '%'],
  esUp: ['有能量護盾時傷害', '%'],
  afterRoll: ['翻滾後 2 秒內傷害', '%'],
  bossP: ['對王與菁英傷害', '%'],
  closeP: ['對近身（160 內）的敵人傷害', '%'],
  farP: ['對遠處（350 外）的敵人傷害', '%'],
  killHeal: ['擊殺回復生命', ''],
  lowHpRed: ['生命低於一半時受到的傷害減少', '%'],
  blood: ['技能改用生命施放（不耗魔力）', '']
};
/* 天賦樹的主題（0.2.17，照技能體系重做）：sm 小點（輪流）、nt 大點（名字＋效果）；
   rg 六條路（鬥士、遊俠、暗影、魔導、死靈、自然）各自的權重，叢集照所在方向抽主題；
   inner 防禦與生命（內圈多）、wp 武器專精（只在外圈）；第 0 個「基礎」是過路點（切斷主題，不會被抽到） */
/* 基礎能力點（0.2.7）：數值很低，有點加成又不會沒用 */
const PT_BASE = [{ life: 10 }, { mana: 10 }, { armorF: 20 }, { evF: 20 }, { esF: 8 }];
const PT_WP = (wp, n, c, ic, rg, nt) => ({ n, c, ic, wp, rg, sm: [{ ['w_' + wp]: 3 }], nt });
const PT_THEME = [
  { n: '基礎', c: '#8a8f98', ic: 'asc_s_heart', base: 1, rg: [0, 0, 0, 0, 0, 0], sm: PT_BASE, nt: [] },
  {
    n: '生命',
    c: '#d9534f',
    ic: 'asc_s_heart',
    inner: 1,
    rg: [2, 1, 1, 1, 1, 2],
    sm: [{ regen: 2 }, { life: 10 }],
    nt: [
      ['不屈', { hpP: 3, regen: 6 }],
      ['血氣方剛', { flask: 20, hpP: 2 }],
      ['生生不息', { regen: 12 }]
    ]
  },
  {
    n: '護甲',
    c: '#b0835a',
    ic: 'asc_s_shield',
    inner: 1,
    rg: [3, 0, 0, 0, 0, 2],
    sm: [{ armorP: 8 }],
    nt: [
      ['鐵骨', { armorP: 25, resA: 3 }],
      ['金剛', { armorP: 20, armBreak: 1 }],
      ['磐石', { armorP: 40, ms: -3 }]
    ]
  },
  {
    n: '格擋與盾',
    c: '#9aa7b8',
    ic: 'asc_s_anvil',
    inner: 1,
    rg: [3, 0, 0, 0, 0, 1],
    sm: [{ blockInc: 4 }, { shieldP: 3 }],
    nt: [
      ['銅牆', { blockInc: 12, armorP: 10 }],
      ['以盾為劍', { shieldP: 12, blockInc: 4 }],
      ['不動如山', { blockInc: 15, hpP: 2 }]
    ]
  },
  {
    n: '近戰',
    c: '#e8a33d',
    ic: 'asc_s_sword',
    rg: [3, 2, 0, 0, 0, 1],
    sm: [{ meleeP: 3 }],
    nt: [
      ['斬鐵', { meleeP: 12, critX: 5 }],
      ['戰意', { meleeP: 10, rageHit: 1 }],
      ['破陣', { meleeP: 15, as: 2 }]
    ]
  },
  {
    n: '攻速',
    c: '#f2c14e',
    ic: 'asc_s_wind',
    rg: [2, 2, 2, 0, 0, 1],
    sm: [{ as: 1 }],
    nt: [
      ['疾風', { as: 5 }],
      ['連斬', { as: 4, ms: 3 }],
      ['流水', { as: 2, onsKill: 25 }]
    ]
  },
  {
    n: '投射物',
    c: '#8fe0a5',
    ic: 'asc_s_bolt',
    rg: [0, 3, 2, 0, 0, 0],
    sm: [{ projP: 3 }],
    nt: [
      ['鷹眼', { projP: 12, critInc: 5 }],
      ['穿雲', { projP: 10, as: 2 }],
      ['連珠', { projP: 20, closeP: -30 }]
    ]
  },
  {
    n: '身法',
    c: '#7bd36b',
    ic: 'asc_s_feather',
    inner: 1,
    rg: [0, 3, 2, 0, 0, 0],
    sm: [{ evP: 8 }, { ms: 2 }],
    nt: [
      ['輕功', { ms: 4, rollCd: 15 }],
      ['殘影', { evP: 25, tailwind: 1 }],
      ['踏雪', { rollCd: 15, evP: 15 }]
    ]
  },
  {
    n: '暴擊率',
    c: '#fff08a',
    ic: 'asc_s_eye',
    rg: [1, 1, 3, 1, 1, 1],
    sm: [{ critInc: 6 }],
    nt: [
      ['精準', { critInc: 12 }],
      ['心眼', { critInc: 10, critX: 5 }],
      ['洞察', { critInc: 8, powOnCrit: 10 }]
    ]
  },
  {
    n: '暴擊傷害',
    c: '#ffd166',
    ic: 'sup_sp_brutal',
    rg: [1, 1, 3, 1, 1, 1],
    sm: [{ critX: 4 }],
    nt: [
      ['致命', { critX: 12 }],
      ['要害', { critX: 10, critInc: 8 }],
      ['斬首', { critX: 15, meleeP: 4 }]
    ]
  },
  {
    n: '陷阱地雷',
    c: '#a3d977',
    ic: 'sup_sp_trap',
    rg: [0, 1, 3, 0, 0, 0],
    sm: [{ unitP: 3 }],
    nt: [
      ['機關師', { unitP: 10, units: 1 }],
      ['連環爆', { unitP: 10, aoe: 8 }],
      ['伏擊', { unitP: 12, critInc: 5 }]
    ]
  },
  {
    n: '異常',
    c: '#c46b8f',
    ic: 'ail_bleed',
    rg: [1, 0, 3, 0, 1, 2],
    sm: [{ ailMag: 4 }, { bleedCh: 3 }, { poisonCh: 3 }],
    nt: [
      ['放血', { bleedCh: 12, ailMag: 6 }],
      ['劇毒', { poisonCh: 12, poiStack: 1 }],
      ['共鳴', { ailMag: 15 }]
    ]
  },
  {
    n: '元素',
    c: '#ff8a4c',
    ic: 'asc_s_flame',
    rg: [1, 1, 1, 2, 1, 1],
    sm: [{ eleP: 3 }],
    nt: [
      ['燎原', { eleP: 12 }],
      ['元素親和', { eleP: 8, pen: 10 }],
      ['三相', { eleP: 8, ailMag: 10 }]
    ]
  },
  {
    n: '元素技能',
    c: '#ff6a3d',
    ic: 'asc_pyro_c',
    rg: [0, 0, 0, 3, 0, 0],
    sm: [{ elemP: 3 }],
    nt: [
      ['天雷', { elemP: 12 }],
      ['灌注', { elemP: 10, aoe: 6 }],
      ['寒霜', { elemP: 10, pen: 6 }]
    ]
  },
  {
    n: '法術',
    c: '#8fd6ff',
    ic: 'sup_sp_fastcast',
    rg: [0, 0, 0, 3, 2, 0],
    sm: [{ spellP: 3 }],
    nt: [
      ['咒法', { spellP: 8, castP: 8 }],
      ['秘法', { spellP: 8, arcaneHit: 20 }],
      ['詠唱', { spellP: 12 }]
    ]
  },
  {
    n: '能量護盾',
    c: '#7aa8ff',
    ic: 'asc_s_drop',
    inner: 1,
    rg: [0, 0, 1, 3, 2, 0],
    sm: [{ esP: 8 }],
    nt: [
      ['靈障', { esP: 25, esF: 15 }],
      ['快速充能', { esRec: 30, esP: 10 }],
      ['魂盾', { esP: 20, resA: 3 }]
    ]
  },
  {
    n: '魔力冷卻',
    c: '#b28dff',
    ic: 'asc_s_book',
    rg: [0, 0, 1, 2, 2, 1],
    sm: [{ mpReg: 8 }, { mpP: 5 }],
    nt: [
      ['冥想', { mpP: 15, mpReg: 15 }],
      ['迅捷施術', { cdr: 10 }],
      ['專注', { mpP: 10, cdr: 5 }]
    ]
  },
  {
    n: '秘術技能',
    c: '#9b6bd9',
    ic: 'ail_curse',
    rg: [0, 0, 0, 0, 3, 0],
    sm: [{ occP: 3 }],
    nt: [
      ['凋零', { occP: 12, unholyKill: 10 }],
      ['咒怨', { occP: 10, castP: 5 }],
      ['幽冥', { occP: 10, ailMag: 8 }]
    ]
  },
  {
    n: '召喚',
    c: '#9df29d',
    ic: 'asc_s_paw',
    rg: [0, 0, 0, 0, 3, 2],
    sm: [{ minionP: 3 }],
    nt: [
      ['御獸', { minionP: 12 }],
      ['群狼', { minionP: 10, spirit: 10 }],
      ['魂契', { minionP: 10, cdr: 5 }]
    ]
  },
  {
    n: '精魄光環',
    c: '#c38bff',
    ic: 'asc_s_lotus',
    rg: [0, 0, 0, 1, 3, 0],
    sm: [{ auraEff: 3 }],
    nt: [
      ['靈識', { spirit: 15 }],
      ['聖域', { auraEff: 10, spirit: 5 }],
      ['共感', { auraEff: 8, mpReg: 15 }]
    ]
  },
  {
    n: '原始技能',
    c: '#7fbf5a',
    ic: 'asc_tamer_c',
    rg: [1, 0, 0, 0, 0, 3],
    sm: [{ priP: 3 }],
    nt: [
      ['野性', { priP: 12 }],
      ['獸魂', { priP: 10, hpP: 2 }],
      ['根脈', { priP: 10, regen: 6 }]
    ]
  },
  {
    n: '圖騰砲台',
    c: '#c9a46b',
    ic: 'asc_s_rune',
    rg: [1, 1, 0, 0, 0, 3],
    sm: [{ unitP: 3 }],
    nt: [
      ['堡壘工匠', { unitP: 10, units: 1 }],
      ['砲陣', { unitP: 12, projP: 4 }],
      ['祖靈', { unitP: 10, hpP: 2 }]
    ]
  },
  {
    n: '範圍',
    c: '#b7e3ff',
    ic: 'sup_sp_aoe',
    rg: [2, 1, 1, 1, 1, 2],
    sm: [{ aoe: 3 }],
    nt: [
      ['擴散', { aoe: 12 }],
      ['震波', { aoe: 8, aoeP: 8 }],
      ['星爆', { aoe: 8, spellP: 5 }]
    ]
  },
  /* 武器專精（只在外圈）：持這種武器時傷害提高 */
  PT_WP(
    'sword',
    '劍術',
    '#e0b070',
    'gear_weapon_0',
    [3, 1, 0, 0, 0, 0],
    [
      ['連斬劍', { w_sword: 12, as: 2 }],
      ['劍氣', { w_sword: 10, critX: 5 }],
      ['幻劍', { w_sword: 10, aoe: 6 }]
    ]
  ),
  PT_WP(
    'axe',
    '斧術',
    '#c8743c',
    'gear_weapon_2',
    [3, 0, 0, 0, 0, 1],
    [
      ['裂骨', { w_axe: 12, bleedCh: 10 }],
      ['怒斧', { w_axe: 10, rageHit: 1 }],
      ['飛斧', { w_axe: 10, projP: 5 }]
    ]
  ),
  PT_WP(
    'mace',
    '錘術',
    '#b39a6b',
    'gear_weapon_8',
    [3, 0, 0, 0, 0, 1],
    [
      ['碎骨', { w_mace: 12, armBreak: 1 }],
      ['震地', { w_mace: 10, aoe: 8 }],
      ['重錘', { w_mace: 10, critX: 6 }]
    ]
  ),
  PT_WP(
    'flail',
    '連枷術',
    '#a8a070',
    'gear_weapon_22',
    [3, 1, 0, 0, 0, 0],
    [
      ['鏈舞', { w_flail: 12, critInc: 8 }],
      ['旗手', { w_flail: 10, aoe: 6 }],
      ['迴旋', { w_flail: 10, as: 2 }]
    ]
  ),
  PT_WP(
    'spear',
    '矛術',
    '#d9a066',
    'gear_weapon_9',
    [1, 3, 0, 0, 0, 0],
    [
      ['穿刺', { w_spear: 12, impaleCh: 25 }],
      ['長槍陣', { w_spear: 10, aoe: 8 }],
      ['擲矛', { w_spear: 10, projP: 5 }]
    ]
  ),
  PT_WP(
    'bow',
    '弓術',
    '#9fd27a',
    'gear_weapon_3',
    [0, 3, 1, 0, 0, 0],
    [
      ['百步穿楊', { w_bow: 12, farP: 6 }],
      ['連珠箭', { w_bow: 10, as: 2 }],
      ['毒箭', { w_bow: 10, poisonCh: 10 }]
    ]
  ),
  PT_WP(
    'xbow',
    '弩術',
    '#8fb88a',
    'gear_weapon_12',
    [0, 3, 0, 0, 0, 1],
    [
      ['重弩', { w_xbow: 12, armBreak: 1 }],
      ['速裝', { w_xbow: 10, as: 3 }],
      ['砲手', { w_xbow: 10, unitP: 6 }]
    ]
  ),
  PT_WP(
    'dagger',
    '匕首術',
    '#b6c9e0',
    'gear_weapon_13',
    [0, 1, 3, 0, 0, 0],
    [
      ['背刺', { w_dagger: 12, critX: 6 }],
      ['御劍', { w_dagger: 10, projP: 5 }],
      ['影步', { w_dagger: 10, afterRoll: 10 }]
    ]
  ),
  PT_WP(
    'claw',
    '爪術',
    '#d98a8a',
    'gear_weapon_27',
    [0, 0, 3, 0, 0, 1],
    [
      ['撕爪', { w_claw: 10, as: 3 }],
      ['嗜血', { w_claw: 10, killHeal: 3 }],
      ['獸性', { w_claw: 12, critInc: 8 }]
    ]
  ),
  PT_WP(
    'traptool',
    '機關術',
    '#a3c977',
    'sup_sp_mine',
    [0, 1, 3, 0, 0, 0],
    [
      ['巧匠', { w_traptool: 12, units: 1 }],
      ['連環', { w_traptool: 10, aoe: 6 }],
      ['精工', { w_traptool: 10, unitP: 6 }]
    ]
  ),
  PT_WP(
    'staff',
    '法杖術',
    '#ff9f6b',
    'gear_weapon_4',
    [0, 0, 0, 3, 1, 0],
    [
      ['元素之杖', { w_staff: 12, elemP: 5 }],
      ['杖心', { w_staff: 10, castP: 4 }],
      ['長吟', { w_staff: 10, mpReg: 10 }]
    ]
  ),
  PT_WP(
    'wand',
    '魔杖術',
    '#a98bdf',
    'gear_weapon_31',
    [0, 0, 0, 1, 3, 0],
    [
      ['咒杖', { w_wand: 12, occP: 5 }],
      ['速咒', { w_wand: 10, castP: 5 }],
      ['凋零之杖', { w_wand: 10, unholyKill: 10 }]
    ]
  ),
  PT_WP(
    'sceptre',
    '權杖術',
    '#d0a8ff',
    'gear_weapon_15',
    [0, 0, 0, 0, 3, 1],
    [
      ['王權', { w_sceptre: 10, spirit: 8 }],
      ['號令', { w_sceptre: 10, auraEff: 5 }],
      ['權威', { w_sceptre: 12, minionP: 5 }]
    ]
  ),
  PT_WP(
    'talisman',
    '魔符術',
    '#8fcf6a',
    'asc_tamer_e',
    [1, 0, 0, 0, 0, 3],
    [
      ['熊魂', { w_talisman: 12, hpP: 2 }],
      ['狼魂', { w_talisman: 10, as: 2 }],
      ['獸血', { w_talisman: 10, priP: 6 }]
    ]
  ),
  PT_WP(
    'qstaff',
    '棍術',
    '#b5d36b',
    'asc_moon_c',
    [1, 0, 0, 0, 0, 3],
    [
      ['武僧', { w_qstaff: 12, as: 2 }],
      ['迴棍', { w_qstaff: 10, aoe: 10 }],
      ['禪定', { w_qstaff: 8, powOnCrit: 20 }]
    ]
  )
];
const PT_TH = Object.fromEntries(PT_THEME.map((t, i) => [t.n, i]));
/* 六條路（起點，照技能體系；排成一圈，相鄰的互相混搭）：th 起點的顏色與圖示、d 往外偏重什麼 */
const PT_ROADS = [
  { n: '鬥士之路', th: '近戰', d: '劍、斧、錘、連枷、盾；近戰、護甲、格擋' },
  { n: '遊俠之路', th: '投射物', d: '弓、弩、矛；投射物、身法、攻速' },
  { n: '暗影之路', th: '暴擊率', d: '匕首、爪、陷阱器；暴擊、異常、陷阱地雷' },
  { n: '魔導之路', th: '元素技能', d: '法杖；元素技能（火、冰、電）、法術、能量護盾' },
  { n: '死靈之路', th: '秘術技能', d: '魔杖、權杖；秘術技能（混沌、詛咒、召喚）、召喚物、精魄光環' },
  { n: '自然之路', th: '原始技能', d: '魔符、長棍；原始技能（變身、圖騰、植物）、生命、圖騰砲台' }
];
/* 基石（0.2.17，每條路 2 個，放在外圈末端、只連 1 條線）：好處和代價寫在同一點；「傷害更多」是全域的（7.2 第 5 步） */
const PT_KEYS = [
  { rg: 0, n: '狂戰之血', ic: 'asc_bloodclaw_e', s: { more: 30, resA: -15 } },
  { rg: 0, n: '鐵壁', ic: 'asc_phalanx_e', s: { armorP: 80, blockInc: 15, more: -20 } },
  { rg: 1, n: '狙擊者', ic: 'asc_hunter_e', s: { more: 35, closeP: -50 } },
  { rg: 1, n: '疾風步', ic: 'asc_master_e', s: { ms: 15, as: 8, hpP: -15 } },
  { rg: 2, n: '玻璃大砲', ic: 'asc_shadow_e', s: { more: 40, hpP: -30 } },
  { rg: 2, n: '一擊必殺', ic: 'asc_judge_e', s: { critX: 60, critInc: -30 } },
  { rg: 3, n: '元素超載', ic: 'asc_storm_e', s: { pen: 25, resA: -20 } },
  { rg: 3, n: '靈體', ic: 'asc_medium_e', s: { esP: 60, hpP: -40 } },
  { rg: 4, n: '血魔法', ic: 'asc_bloodmage_e', s: { blood: 1, hpP: 10 } },
  { rg: 4, n: '亡者之主', ic: 'asc_bonelord_e', s: { minionP: 50, spirit: 20, hpP: -20 } },
  { rg: 5, n: '巨人之血', ic: 'asc_peach_e', s: { hpP: 25, regen: 20, as: -10, ms: -8 } },
  { rg: 5, n: '祖靈守護', ic: 'asc_banner_e', s: { units: 2, unitP: 30, ms: -10 } }
];
/* 天賦樹的圖示：大點照主題輪流挑（同一區的大點不會長一樣），小點照加的數值；沒列的主題用自己的 ic */
const PT_ICONS = (() => {
  const AF = f => ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'c', 'c0', 'c1', 'c2', 'e'].map(k => `asc_${f}_${k}`);
  return {
    生命: ['asc_s_heart', 'asc_s_heartx', 'asc_s_potion', ...AF('peach')],
    護甲: ['asc_s_shield', 'sup_ln_iron', ...AF('phalanx')],
    格擋與盾: ['asc_s_anvil', 'ail_guard', 'ail_shield', ...AF('paladin')],
    近戰: ['asc_s_sword', 'asc_s_fist', 'sup_sp_melee', 'sup_sp_heavy'],
    攻速: ['asc_s_wind', 'sup_sp_fastatk', 'sup_sp_combo', 'sup_sp_echo', ...AF('master').slice(0, 6)],
    投射物: ['asc_s_bolt', 'sup_sp_proj', 'sup_sp_multi', 'sup_sp_chain', 'sup_sp_pen', 'ail_n_arrow'],
    身法: ['asc_s_feather', ...AF('shadow')],
    暴擊率: ['asc_s_eye', 'sup_sp_exec', 'ail_mark', 'ail_dmark', ...AF('judge')],
    暴擊傷害: ['sup_sp_crit', 'sup_sp_brutal', ...AF('bloodclaw')],
    陷阱地雷: ['sup_sp_trap', 'sup_sp_mine', 'sup_sp_deploy', 'sup_sp_deployfast', ...AF('engineer')],
    異常: ['ail_bleed', 'ail_poison', 'ail_burn', 'ail_shock', 'ail_n_corrode', 'ail_n_weak'],
    元素: ['asc_s_flame', 'asc_s_ice', 'sup_sp_gfire', 'sup_sp_gcold', 'sup_sp_glight'],
    元素技能: [...AF('pyro'), ...AF('frost'), ...AF('storm')],
    法術: ['sup_sp_fastcast', 'sup_sp_conc', 'sup_ln_hellfire', ...AF('bloodmage')],
    能量護盾: ['asc_s_drop', 'sup_ln_soul', 'sup_ln_void', ...AF('medium')],
    魔力冷卻: ['asc_s_book', 'sup_sp_cd', 'sup_sp_mpleech', 'sup_sp_eff', ...AF('master').slice(6)],
    秘術技能: ['ail_curse', 'ail_doom', ...AF('curse')],
    召喚: ['asc_s_paw', 'sup_sp_pet', 'sup_sp_horde', 'sup_ln_pack', 'sup_ln_legion', ...AF('bonelord')],
    精魄光環: ['asc_s_lotus', 'sup_ln_candle', 'sup_ln_wrath', ...AF('alchemist')],
    原始技能: [...AF('tamer'), ...AF('talisman')],
    圖騰砲台: ['asc_s_rune', 'asc_s_flag', 'sup_sp_totem', ...AF('banner')],
    範圍: ['asc_s_stars', 'sup_sp_aoe', 'sup_sp_boom', 'sup_sp_ext', ...AF('crusher').slice(5)],
    劍術: [...AF('blade'), 'gear_weapon_0'],
    錘術: [...AF('crusher').slice(0, 5), 'gear_weapon_8'],
    矛術: [...AF('valkyrie'), 'gear_weapon_9'],
    弓術: [...AF('hunter'), 'gear_weapon_3'],
    棍術: [...AF('moon'), 'gear_weapon_4']
  };
})();
const PT_STAT_IC = {
  life: 'asc_s_heart',
  mana: 'asc_s_book',
  armorF: 'asc_s_shield',
  evF: 'asc_s_feather',
  esF: 'asc_s_drop',
  evP: 'asc_s_feather',
  blockInc: 'asc_s_anvil',
  critInc: 'asc_s_eye',
  hpP: 'asc_s_heart',
  regen: 'asc_s_potion',
  armorP: 'asc_s_shield',
  block: 'asc_s_anvil',
  meleeP: 'asc_s_sword',
  shieldP: 'asc_s_anvil',
  as: 'asc_s_wind',
  critX: 'sup_sp_brutal',
  crit: 'asc_s_eye',
  ms: 'asc_s_feather',
  rollCd: 'asc_s_feather',
  projP: 'sup_sp_proj',
  unitP: 'sup_sp_trap',
  minionP: 'asc_s_paw',
  eleP: 'asc_s_flame',
  resA: 'sup_ln_iron',
  spellP: 'sup_sp_fastcast',
  mpP: 'asc_s_book',
  mpReg: 'asc_s_book',
  aoe: 'sup_sp_aoe',
  dmgA: 'sup_sp_dmg',
  esP: 'asc_s_drop',
  es: 'asc_s_drop',
  esRec: 'asc_s_drop',
  auraEff: 'asc_s_lotus',
  spirit: 'sup_ln_candle',
  cdr: 'sup_sp_cd'
};
/* 天賦樹拼塊表（照 PoE2：一百多塊形狀都不一樣，像的就剔掉重挑）：tools/pt_shapes.js 產生。
   一塊一個字串：點「x,y[,1＝大點]」用 ; 分開｜線「a-b」用 , 分開｜弧「線編號:圓心x,圓心y,半徑」；單位是相鄰兩點距離 1 */
/* PT_SHAPES 開始（tools/pt_shapes.js 產生，不要手改） */
const PT_SHAPES = [
  '-1.33,0;0.27,0,1;-0.53,0.55;-0.53,-0.55;1.07,0.55;1.07,-0.55|0-2,0-3,2-1,3-1,1-4,1-5,4-5|',
  '-2.79,-1.09;-2.29,-0.24;-1.79,-1.09;-1.29,-0.24;-0.79,-1.09;0.15,-1.4;1.05,-0.96;1.39,-0.02;0.97,0.89;0.95,1.88;1.96,0.9;2.5,2.46,1|0-1,1-2,0-2,2-3,1-3,3-4,2-4,4-5,5-6,6-7,7-8,8-9,8-10,9-11,10-11,8-11|7:0.07,-0.08,1.32;8:0.07,-0.08,1.32;9:0.07,-0.08,1.32;10:0.07,-0.08,1.32',
  '-2.11,0.9;-1.11,0.9,1;-0.11,0.9;-1.11,1.9;-1.11,-0.1;0.52,-0.57;1.13,-0.12;1.46,0.56;1.44,1.32;0.38,-1.56;-0.55,-1.94,1;1.17,-2.18,1|0-1,1-2,1-3,1-4,2-5,2-6,5-6,2-7,6-7,2-8,7-8,5-9,9-10,9-11|6:-0.11,0.9,1.6;8:-0.11,0.9,1.6;10:-0.11,0.9,1.6',
  '-1.25,0;-0.25,0;0.75,0;1.75,0,1;-0.25,1;-0.25,2,1;-0.25,-1;-0.25,-2|0-1,1-2,2-3,1-4,4-5,1-6,6-7|',
  '-0.9,0;0,0.88;0,-0.88;0.9,0,1;0,0|0-1,0-2,1-3,2-3,4-1,4-2|',
  '-3.1,1.24;-2.1,1.24;-1.2,0.81;-1.2,1.68,1;-0.25,1.1;-0.46,0.14;0.48,0.42;0.28,-0.54;1.22,-0.25;1.89,-0.99;2.24,-1.93;2.2,-2.93,1|0-1,1-2,1-3,2-4,4-5,2-5,5-6,4-6,6-7,5-7,7-8,6-8,8-9,9-10,10-11|12:-0.32,-2.34,2.59;13:-0.32,-2.34,2.59;14:-0.32,-2.34,2.59',
  '-1.11,-0.72;-0.11,-0.72;0.67,-0.27;0.67,0.63;-0.11,1.08,1|0-1,1-2,2-3,3-4|1:-0.11,0.18,0.9;2:-0.11,0.18,0.9;3:-0.11,0.18,0.9',
  '-2.27,-0.36;-1.27,-0.36;-0.27,-0.36,1;-0.97,0.39;-0.97,-1.11;0.62,0.09;1.46,-0.45;2.3,-1,1;0.67,1.09;0.72,2.09|0-1,1-2,2-3,2-4,2-5,5-6,6-7,5-8,8-9|',
  '-2.52,1.59;-1.54,1.4;-0.71,0.85;-0.14,0.02;-0.22,-0.98;0.6,-1.54;1.51,-1.11,1;1.58,-0.12;0.76,0.45;0.68,-0.55|0-1,1-2,2-3,3-4,4-5,5-6,6-7,7-8,8-3,9-6|0:-2.52,-1,2.59;1:-2.52,-1,2.59;2:-2.52,-1,2.59;3:0.68,-0.55,1;4:0.68,-0.55,1;5:0.68,-0.55,1;6:0.68,-0.55,1;7:0.68,-0.55,1;8:0.68,-0.55,1',
  '-3.97,0.34;-2.97,0.34;-1.97,0.34;-0.97,0.34;0.03,0.34,1;1.37,-0.54;1.59,0.72;0.81,1.74;1.35,-1.54;2.35,-1.55,1;2.37,-0.55|0-1,1-2,2-3,3-4,4-5,4-6,5-6,4-7,6-7,5-8,8-9,9-10,10-5|6:0.03,0.34,1.6;8:0.03,0.34,1.6',
  '-2.7,-1.18;-1.7,-1.18;-0.7,-1.18;0.3,-1.18;1.3,-1.18,1;-1.7,-0.18;0.3,-0.18;0.04,0.77;1,0.54;0.73,1.49;1.69,1.26;1.43,2.21,1|0-1,1-2,2-3,3-4,1-5,3-6,6-7,7-8,6-8,8-9,7-9,9-10,8-10,10-11,9-11|',
  '-1.2,0;-0.2,0,1;-0.51,-0.95;-0.82,-1.9,1;0.61,-0.59;1.42,-1.18;0.61,0.59;1.42,1.18;-0.51,0.95;-0.82,1.9|0-1,1-2,2-3,1-4,4-5,1-6,6-7,1-8,8-9|',
  '-2,-0.29;-1,-0.29;0,-0.29;1,-0.29;2,-0.29;-1,0.71,1;1,0.71,1|0-1,1-2,2-3,3-4,1-5,3-6|',
  '-2.12,-1.69;-1.62,-0.84;-1.12,-1.69;-0.62,-0.84;0.34,-0.56;1.3,-0.29;2.26,-0.02;0.07,0.4;1.99,0.94,1;-0.58,1.14;0.38,1.35;-0.27,2.09,1|0-1,1-2,0-2,2-3,1-3,3-4,4-5,5-6,4-7,6-8,7-9,9-10,7-10,10-11,9-11|',
  '-1.37,0.18;-0.66,-0.52;0.04,0.18;-0.66,0.89;0.35,-0.77;1.3,-0.46,1;1,0.49|0-1,1-2,2-3,3-0,2-4,4-5,5-6,6-2|0:-0.66,0.18,0.71;1:-0.66,0.18,0.71;2:-0.66,0.18,0.71;3:-0.66,0.18,0.71;4:0.67,-0.14,0.71;5:0.67,-0.14,0.71;6:0.67,-0.14,0.71;7:0.67,-0.14,0.71',
  '-1.74,1.33;-0.87,0.83;-0.87,1.83;-0.1,0.19;0.67,-0.44,1;0.61,0.58;0.54,1.61;-0.34,-0.58;-1.36,-0.71;1.61,-1.01;0.46,-1.52;1.4,-2.09,1|0-1,1-2,2-0,1-3,3-4,4-5,5-6,4-7,7-8,4-9,4-10,9-11,10-11|',
  '-2.4,0;-1.4,0;-0.4,0;0.6,0;-1.4,1;-1.4,-1,1;0.6,1,1;0.6,-1,1;1.44,0.5;1.47,-0.48;2.32,0.02|0-1,1-2,2-3,1-4,1-5,3-6,3-7,3-8,8-9,3-9,9-10,8-10|',
  '-1.82,0.13;-0.82,0.13;0.18,0.13;-0.52,0.88;-1.22,1.63;-0.52,-0.62;-1.22,-1.37;0.98,-1.26,1;1.56,-0.68;1.78,0.11;1.58,0.91,1|0-1,1-2,2-3,3-4,2-5,5-6,2-7,2-8,7-8,2-9,8-9,2-10,9-10|8:0.18,0.13,1.6;10:0.18,0.13,1.6;12:0.18,0.13,1.6',
  '-0.21,-3;1.09,-3.94;1.39,-3;1.09,-2.06;0.76,-1.12;0.43,-0.18;0.1,0.77;-0.22,1.71;-0.11,3.31,1;-0.94,3.15;-1.57,2.58;-1.82,1.78,1|0-1,0-2,1-2,0-3,2-3,3-4,4-5,5-6,6-7,7-8,7-9,8-9,7-10,9-10,7-11,10-11|2:-0.21,-3,1.6;4:-0.21,-3,1.6;11:-0.22,1.71,1.6;13:-0.22,1.71,1.6;15:-0.22,1.71,1.6',
  '-1.06,0.74;-0.2,0.24;-0.2,1.24;-0.65,-1.29;0.71,-1.07;1.4,0.13,1|0-1,1-2,2-0,1-3,1-4,3-4,1-5,4-5|5:-0.2,0.24,1.6;7:-0.2,0.24,1.6',
  '-0.83,2.54;0.17,2.54;0.95,2.09;0.95,1.19;0.17,0.74;-0.01,-0.25;0.93,0.09;-0.29,-1.21,1;-1.27,-1.44;-2.24,-1.67,1;0.39,-1.93;1.08,-2.66,1|0-1,1-2,2-3,3-4,4-5,5-6,6-4,5-7,7-8,8-9,7-10,10-11|1:0.17,1.64,0.9;2:0.17,1.64,0.9;3:0.17,1.64,0.9',
  '-2.33,-0.24;-1.33,-0.24;-0.33,-0.24;0.67,-0.24;1.67,-0.24,1;-1.33,0.76;-1.33,-1.24;0.67,0.76;0.67,-1.24;1.66,0.61,1;1.3,1.54|0-1,1-2,2-3,3-4,1-5,1-6,3-7,3-8,7-9,9-10,10-7|',
  '-1,-0.34;-0.5,0.51;0,-0.34;0.5,0.51;1,-0.34,1|0-1,1-2,0-2,2-3,1-3,3-4,2-4|',
  '-1.73,2.5;-0.78,2.19;-0.18,1.38;-0.17,0.38;0.24,-0.53;-0.68,-0.93;-1.59,-1.34,1;0.64,-1.44;1.04,-2.36,1;1.15,-0.13;2.06,0.28,1|0-1,1-2,2-3,3-4,4-5,5-6,4-7,7-8,4-9,9-10|0:-1.73,0.86,1.63;1:-1.73,0.86,1.63;2:-1.73,0.86,1.63',
  '-2.17,1.4;-1.31,0.9;-1.31,1.9;-0.37,0.55;-0.06,-0.4;0.26,-1.35;0.56,0.19;1.5,-0.16,1;0.49,1.05;1.36,1.55;0.44,-2.33;0.62,-3.32,1|0-1,1-2,2-0,1-3,3-4,4-5,3-6,6-7,3-8,8-9,5-10,10-11|',
  '-1.27,0.85;-0.27,0.85,1;0.73,0.85;1.73,0.85,1;-0.27,1.85;-0.27,2.85;-0.27,-0.15;-0.27,-1.15;0.45,-1.83;-0.49,-2.13;0.23,-2.8,1|0-1,1-2,2-3,1-4,4-5,1-6,6-7,7-8,8-9,7-9,9-10,8-10|',
  '-0.41,-1.01;0.59,-1.01;1.59,-1.01;2.59,-1.01;0.59,-0.01;2.59,-0.01,1;-0.4,-0.01;0.08,0.85;-0.9,0.85;-1.57,0.12;-1.64,1.52;-3.1,0.74,1|0-1,1-2,2-3,1-4,3-5,4-6,6-7,4-7,7-8,6-8,8-9,8-10,9-11,10-11,8-11|',
  '-2.8,0.42;-1.8,0.42;-0.8,0.42;0.19,0.27;-0.18,1.2;0.93,-0.41;0.05,-0.9,1;1.12,-1.39;1.92,-0.53,1;1.35,0.5|0-1,1-2,2-3,3-4,4-2,3-5,5-6,5-7,5-8,5-9|',
  '-1.29,-0.45;-0.29,-0.45;0.71,-0.45;1.71,-0.45;-0.29,0.55;-0.29,-1.45,1;1.71,0.55,1;1.71,-1.45;-1.27,0.63;-0.73,1.45;-1.71,1.52|0-1,1-2,2-3,1-4,1-5,3-6,3-7,4-8,8-9,4-9,9-10,8-10|',
  '-0.78,-0.66;0.22,-0.66;1.22,-0.66;2.22,-0.66;3.22,-0.66;0.22,0.34;2.22,0.34,1;-0.64,0.86;-0.61,1.86,1;-1.52,0.38;-2.42,-0.05;-3.32,-0.48,1|0-1,1-2,2-3,3-4,1-5,3-6,5-7,7-8,7-9,9-10,10-11|',
  '-3.29,0.36;-2.29,0.36;-1.29,0.36;-0.29,0.36;0.71,0.36;-2.29,1.36,1;-0.29,1.36,1;1.57,-0.15;1.58,0.85;2.15,-0.97;2.23,-1.86;1.5,-2.39|0-1,1-2,2-3,3-4,1-5,3-6,4-7,7-8,8-4,7-9,9-10,10-11|10:1.42,-1.49,0.9;11:1.42,-1.49,0.9',
  '-2.28,0.09;-1.28,0.09;-0.28,0.09;0.72,0.09,1;-1.28,1.09;-1.28,2.09,1;-1.28,-0.91;-1.28,-1.91,1;1.7,-1.18;2.17,-0.58;2.31,0.16;2.1,0.89|0-1,1-2,2-3,1-4,4-5,1-6,6-7,3-8,3-9,8-9,3-10,9-10,3-11,10-11|9:0.72,0.09,1.6;11:0.72,0.09,1.6;13:0.72,0.09,1.6',
  '-1.56,0.08;-1.06,0.93;-0.56,0.08;-0.06,0.93;0.44,0.08;1.08,-0.68;1.73,-1.44,1|0-1,1-2,0-2,2-3,1-3,3-4,2-4,4-5,5-6|',
  '-1.99,-0.03;-1.29,-0.74;-0.58,-0.03;-1.29,0.67;-0.11,-0.92;0.87,-1.1;1.63,-0.45,1;1.59,0.55;0.78,1.15;-0.18,0.88;0.57,0.01|0-1,1-2,2-3,3-0,2-4,4-5,5-6,6-7,7-8,8-9,9-2,10-6|4:0.57,0.01,1.15;5:0.57,0.01,1.15;6:0.57,0.01,1.15;7:0.57,0.01,1.15;8:0.57,0.01,1.15;9:0.57,0.01,1.15;10:0.57,0.01,1.15',
  '-1.55,-1.73;-0.84,-2.44;-0.13,-1.73;-0.84,-1.02;0.64,-1.09;1.58,-1.44,1;0.47,-0.1;0.5,0.9;0.53,1.9;0.57,2.89;-0.5,0.93,1;-0.43,2.93,1|0-1,1-2,2-3,3-0,2-4,4-5,4-6,6-7,7-8,8-9,7-10,9-11|',
  '-0.97,-0.45;0.03,-0.45;-0.28,-1.4;0.84,-1.04,1;0.84,0.14,1;-0.28,0.5;0.4,1.24;-0.57,1.46|0-1,1-2,1-3,1-4,1-5,5-6,6-7,7-5|',
  '-2.3,-0.97;-1.3,-0.97;-0.3,-0.97,1;-1,-0.22;-1,-1.72;1.24,-1.42;1.26,-0.61;0.89,0.11;0.21,0.55;-0.04,1.6;1.61,1.61;0.73,3,1|0-1,1-2,2-3,2-4,2-5,2-6,5-6,2-7,6-7,2-8,7-8,8-9,9-10,10-11|6:-0.3,-0.97,1.6;8:-0.3,-0.97,1.6;10:-0.3,-0.97,1.6',
  '-2.04,0.67;-1.34,1.37;-1.34,-0.03;0.16,0.67,1;1.1,0.31;1.66,-0.39;1.34,-1.23;0.45,-1.37,1|0-1,0-2,1-3,2-3,0-3,3-4,4-5,5-6,6-7|6:0.77,-0.53,0.9;7:0.77,-0.53,0.9;8:0.77,-0.53,0.9',
  '-1.32,1.47;-0.32,1.47,1;0.68,1.47;-0.32,2.47;-0.32,0.47;0.45,-0.22;-0.5,-0.54;0.74,-1.07;-0.21,-1.39;1.03,-1.92,1;0.08,-2.24|0-1,1-2,1-3,1-4,4-5,4-6,5-7,7-9,6-8,8-10,7-8,9-10|',
  '-0.83,1.73;0.17,1.73,1;0.17,0.73;1.17,1.73;0.17,2.73;0.54,-0.46;-1,0.32;-0.64,-0.88;-0.23,-0.07,1;-0.56,-1.87;0.04,-2.67;0.98,-3.02|0-1,1-2,1-3,1-4,2-5,2-6,5-7,6-7,8-5,8-6,7-9,9-10,10-11|10:1.1,-1.24,1.78;11:1.1,-1.24,1.78;12:1.1,-1.24,1.78',
  '-2.26,0.12;-1.26,0.12;-0.26,0.12;0.74,0.12,1;0.04,0.87;0.04,-0.63;1.19,-0.78;1.74,0.06|0-1,1-2,2-3,3-4,3-5,3-6,6-7,7-3|',
  '-2.89,-0.02;-2.09,0.61;-1.29,-0.64;-0.49,0.61;-0.17,-0.34;0.83,-0.33;1.13,0.62;0.32,1.2;0.32,0.35,1;1.71,-0.8;2.6,-1.27,1|0-1,1-2,2-3,3-4,4-5,5-6,6-7,7-3,8-5,5-9,9-10|3:0.32,0.35,0.85;4:0.32,0.35,0.85;5:0.32,0.35,0.85;6:0.32,0.35,0.85;7:0.32,0.35,0.85',
  '-2.67,-1.19;-1.67,-1.19,1;-1.17,-2.06;-1.17,-0.32;-0.38,0.29;-1.31,0.67;0.59,0.51;1.58,0.35;2.57,0.19;1.41,1.09;2.23,1.66,1|0-1,1-2,1-3,3-4,4-5,5-3,4-6,6-7,7-8,6-9,9-10|',
  '-1.57,-2.97;-1.07,-2.12;-0.57,-2.97;-0.07,-2.12;0.41,-1.25;1.25,-0.69,1;0.44,-0.25;0.41,0.75;0.38,1.75;0.34,2.75;0.49,3.74,1;-0.44,3.37|0-1,1-2,0-2,2-3,1-3,3-4,4-5,4-6,6-7,7-8,8-9,9-10,10-11,11-9|',
  '-1.92,1.14,1;-0.83,-0.03;-0.32,1.14;-0.83,2.31;-0.25,-0.85,1;-1.21,-1.15;-0.27,-1.85;0.69,-1.18;0.35,-0.05;1.06,0.98;1.4,-0.74;2.11,0.29|0-1,0-2,1-2,0-3,2-3,1-4,4-5,4-6,4-7,4-8,8-9,8-10,9-11,10-11|2:-1.92,1.14,1.6;4:-1.92,1.14,1.6',
  '-1.01,2.1,1;0.01,0.86;0.59,2.1;0.01,3.33;-0.56,0.04;-1.12,-0.78;-1.69,-1.61;0.27,-0.53;-0.86,-2.18;0.86,-2.01;1.7,-1.23;1.81,-0.09,1|0-1,0-2,1-2,0-3,2-3,1-4,4-5,5-6,4-7,6-8,7-9,7-10,9-10,7-11,10-11|2:-1.01,2.1,1.6;4:-1.01,2.1,1.6;12:0.27,-0.53,1.6;14:0.27,-0.53,1.6',
  '-1.98,1.75;-0.98,1.75;-0.48,0.88;-0.48,2.61;0.24,0.19;-0.65,-0.28,1;0.41,-0.8;1.23,0.05,1;0.68,1.09;0.2,-1.78;0.47,-2.63;1.35,-2.82,1|0-1,1-2,1-3,2-4,4-5,4-6,4-7,4-8,6-9,9-10,10-11|9:1.08,-1.97,0.9;10:1.08,-1.97,0.9',
  '-3.04,0.18;-2.04,0.18;-1.04,0.18;-0.04,0.18;-0.74,0.93,1;-0.74,-0.57,1;1.32,-0.67;1.52,0.53;0.82,1.53;1.66,-1.61,1;2.3,-0.85|0-1,1-2,2-3,3-4,3-5,3-6,3-7,6-7,3-8,7-8,6-9,9-10,10-6|7:-0.04,0.18,1.6;9:-0.04,0.18,1.6',
  '-1.6,0;-0.8,0.79;0,-0.79;0.8,0.79;1.6,-0.79,1|0-1,1-2,2-3,3-4|',
  '-3.14,0.24;-2.14,0.24;-1.14,0.24,1;0.22,-0.61;0.38,0.74;-0.55,1.73;1.38,-1.7;1.76,-1.03;1.78,-0.27;1.45,0.42,1|0-1,1-2,2-3,2-4,3-4,2-5,4-5,3-6,3-7,6-7,3-8,7-8,3-9,8-9|4:-1.14,0.24,1.6;6:-1.14,0.24,1.6;9:0.22,-0.61,1.6;11:0.22,-0.61,1.6;13:0.22,-0.61,1.6',
  '-2.99,-0.77;-1.99,-0.77;-0.99,-0.77;-0.71,0.18;-0.05,-1.05;0.94,0.28;2.48,-0.16,1;2.25,1.19;1.06,1.87,1|0-1,1-2,2-3,2-4,3-5,4-5,2-5,5-6,5-7,6-7,5-8,7-8|9:0.94,0.28,1.6;11:0.94,0.28,1.6',
  '-1.07,0;0.06,-1.13;0.48,-0.41;0.48,0.41;0.06,1.13,1|0-1,0-2,1-2,0-3,2-3,0-4,3-4|2:-1.07,0,1.6;4:-1.07,0,1.6;6:-1.07,0,1.6',
  '-1.37,-2.08;-0.87,-1.23;-0.37,-2.08;0.13,-1.23;0.72,-0.42,1;1.71,-0.52;0.31,0.5;-0.52,1.03;0.35,1.49;-0.48,2.03;0.39,2.49,1|0-1,1-2,0-2,2-3,1-3,3-4,4-5,4-6,6-7,7-8,6-8,8-9,7-9,9-10,8-10|',
  '-3.49,0.77;-2.49,0.77;-1.49,0.77;-0.49,0.77;0.77,-0.21;1.11,0.74;0.8,1.71;1.21,-1.11;1.66,-2,1;2.11,-0.66,1;0.32,-1.55,1|0-1,1-2,2-3,3-4,3-5,4-5,3-6,5-6,4-7,7-8,7-9,7-10|5:-0.49,0.77,1.6;7:-0.49,0.77,1.6',
  '-1.42,-0.98;-0.42,-0.98;0.58,-0.98;1.58,-0.98;2.58,-0.98,1;-0.42,0.02;1.58,0.02,1;0.1,0.87;-0.54,1.64;-1.47,1.26;-1.39,0.26;-0.74,0.81,1|0-1,1-2,2-3,3-4,1-5,3-6,5-7,7-8,8-9,9-10,10-5,11-8|6:-0.74,0.81,0.85;7:-0.74,0.81,0.85;8:-0.74,0.81,0.85;9:-0.74,0.81,0.85;10:-0.74,0.81,0.85',
  '-2.47,0.76;-1.97,1.61;-1.47,0.76;-0.97,1.61;-0.47,0.76;0.46,1.09;-0.14,-0.17;1.51,-0.19,1;1.93,-1.1;1.97,-2.1;1.62,-3.03,1|0-1,1-2,0-2,2-3,1-3,3-4,2-4,4-5,4-6,5-7,6-7,4-7,7-8,8-9,9-10|12:-0.55,-1.69,2.55;13:-0.55,-1.69,2.55;14:-0.55,-1.69,2.55',
  '-2.75,-0.61;-2.25,0.24;-1.75,-0.61;-1.25,0.24;-0.75,-0.61;-0.25,0.24;0.73,0.04;1.71,-0.17;2.69,-0.38,1;0.94,1.01,1;2.9,0.6|0-1,1-2,0-2,2-3,1-3,3-4,2-4,4-5,3-5,5-6,6-7,7-8,6-9,8-10|',
  '-2.13,0.47;-1.23,0.97;-1.23,-0.03;-0.33,0.97;-0.33,-0.03;0.57,0.97,1;0.57,-0.03;1.17,-0.83,1;0.77,-1.75;2.16,-0.72|0-1,0-2,1-3,3-5,2-4,4-6,3-4,6-7,7-8,7-9|',
  '-1.8,-0.8;-1,-0.25;-0.2,-1.36;0.6,-0.25;0.26,0.68;1.24,0.52;0.9,1.45,1|0-1,1-2,2-3,3-4,4-5,3-5,5-6,4-6|',
  '-2.65,-0.16;-1.65,-0.16;-0.65,-0.16;0.35,-0.16;-1.65,0.84;-1.65,-1.16;0.35,0.84;0.35,-1.16;1.3,0.15;2.09,-0.46,1;2.25,0.45,1;1.59,1.11|0-1,1-2,2-3,1-4,1-5,3-6,3-7,3-8,8-9,8-10,8-11|',
  '-2.35,-1.11;-1.85,-0.26;-1.35,-1.11;-0.85,-0.26;-0.35,-1.11;0.65,-1.13;1.43,-0.69;1.44,0.21;0.67,0.67;1.5,1.22;0.95,2.06,1;0.12,1.51|0-1,1-2,0-2,2-3,1-3,3-4,2-4,4-5,5-6,6-7,7-8,8-9,9-10,10-11,11-8|8:0.66,-0.23,0.9;9:0.66,-0.23,0.9;10:0.66,-0.23,0.9',
  '-2.73,0.77;-1.83,1.27;-1.83,0.27;-0.93,1.27;-0.93,0.27;-0.03,1.27;-0.03,0.27;0.96,0.27;-0.03,-0.72;1.52,-1.29,1;2.46,-1.65;3.39,-2.01,1|0-1,0-2,1-3,3-5,2-4,4-6,3-4,5-6,6-7,6-8,7-9,8-9,6-9,9-10,10-11|',
  '-1.59,1.4;-0.59,1.4;-0.59,0.4;0.41,1.4;-0.59,2.4,1;-0.45,-0.59,1;-0.32,-1.58;0.54,-0.46;-1.45,-0.73;0.71,-2.05,1;1.82,-1.41;2.11,-0.16|0-1,1-2,1-3,1-4,2-5,5-6,5-7,5-8,7-9,7-10,9-10,7-11,10-11|10:0.54,-0.46,1.6;12:0.54,-0.46,1.6',
  '-1.79,-2.37;-0.79,-2.37;-0.01,-1.92;-0.01,-1.02;-0.79,-0.57,1;0.49,0.39;-0.42,0.99;-1.5,0.86;0.35,1.36;1.27,1.01;1.13,1.99;2.06,1.64,1|0-1,1-2,2-3,3-4,4-5,4-6,5-6,4-7,6-7,5-8,8-9,5-9,9-10,8-10,10-11,9-11|1:-0.79,-1.47,0.9;2:-0.79,-1.47,0.9;3:-0.79,-1.47,0.9;6:-0.79,-0.57,1.6;8:-0.79,-0.57,1.6',
  '-1.78,-1.09;-1.08,-0.39;-1.08,-1.79;0.42,-1.09,1;1.94,-1.59;1.76,-0.22;0.58,0.5;0.42,1.48;-0.16,2.18;-1.04,2.03,1|0-1,0-2,1-3,2-3,0-3,3-4,3-5,4-5,3-6,5-6,6-7,7-8,8-9|7:0.42,-1.09,1.6;9:0.42,-1.09,1.6;11:-0.47,1.33,0.9;12:-0.47,1.33,0.9',
  '-1.41,-0.7;-0.41,-0.7;0.59,-0.7;1.59,-0.7;-0.41,0.3;-0.41,-1.7,1;1.59,0.3;1.59,-1.7;-1.46,0.96;0.2,1.39;-0.85,2.05,1;-0.63,1.18,1|0-1,1-2,2-3,1-4,1-5,3-6,3-7,4-8,4-9,8-10,9-10,11-8,11-9|',
  '-1.19,1.04,1;-0.01,-0.05;0.36,0.64;0.36,1.43;-0.01,2.12;0.09,-1.05,1;0.2,-2.04;1.09,-0.94;-0.9,-1.15|0-1,0-2,1-2,0-3,2-3,0-4,3-4,1-5,5-6,5-7,5-8|2:-1.19,1.04,1.6;4:-1.19,1.04,1.6;6:-1.19,1.04,1.6',
  '-2.83,-1.12;-1.83,-1.12;-0.83,-1.12;0.17,-1.12;-1.83,-0.12,1;0.17,-0.12,1;1.72,0.3;0.9,1.31;-0.39,1.38;2.7,0.49,1;2.04,1.24|0-1,1-2,2-3,1-4,3-5,5-6,5-7,6-7,5-8,7-8,6-9,9-10,10-6|7:0.17,-0.12,1.6;9:0.17,-0.12,1.6',
  '-1.4,1.6;-0.54,1.1;-0.54,2.1;-1.3,0.45;-1.12,-0.53;-0.18,-0.86;0.58,-0.22;0.4,0.77;-0.36,0.12,1;0.53,-1.57;1.52,-1.72;2.4,-1.25,1|0-1,1-2,2-0,1-3,3-4,4-5,5-6,6-7,7-1,8-5,5-9,9-10,10-11|3:-0.36,0.12,1;4:-0.36,0.12,1;5:-0.36,0.12,1;6:-0.36,0.12,1;7:-0.36,0.12,1;8:-0.36,0.12,1;10:1.25,-0.15,1.6;11:1.25,-0.15,1.6;12:1.25,-0.15,1.6',
  '-3.56,0.24;-2.66,1.02;-2.66,-0.53;-1.76,0.24;-0.72,0.52;-0.68,-1.14;0.7,-0.22;1.36,0.51;1.68,-0.42;2.34,0.3;2.66,-0.63;3.32,0.1,1|0-1,0-2,1-3,2-3,3-4,4-5,5-6,6-7,7-8,6-8,8-9,7-9,9-10,8-10,10-11,9-11|',
  '-2.86,-1.2;-1.86,-1.2;-0.86,-1.2,1;0.42,-2.15;0.73,-1.4;0.62,-0.59;0.13,0.06;0.74,1.54;-0.08,1.01;0.94,0.59;0.53,2.49;1.55,2.07,1|0-1,1-2,2-3,2-4,3-4,2-5,4-5,2-6,5-6,6-8,6-9,8-7,9-7,7-10,7-11,10-11|4:-0.86,-1.2,1.6;6:-0.86,-1.2,1.6;8:-0.86,-1.2,1.6',
  '-2.8,0.09;-1.9,0.59;-1.9,-0.41;-1,0.59;-1,-0.41;-0.1,0.59;-0.1,-0.41;0.8,0.59;0.8,-0.41;1.79,-0.33;2.75,-0.62,1;2.69,0.12,1|0-1,0-2,1-3,3-5,5-7,2-4,4-6,6-8,3-4,5-6,8-9,9-10,9-11|',
  '-0.51,1.55;0.49,1.55;1.49,1.55;0.49,2.55,1;0.49,0.55;-0.42,0.12;0.41,-0.45;-0.46,-0.88;-1.35,-1.34;-2.23,-1.81,1;0.38,-1.42;1.23,-1.95|0-1,1-2,1-3,1-4,4-5,5-6,6-4,5-7,7-8,8-9,7-10,10-11|',
  '-1.01,-2.42,1;0.23,-3.42;0.55,-2.78;0.55,-2.06;0.23,-1.41;0.62,-0.49;0.58,0.51;0.14,1.41,1;0.51,2.96;-0.22,2.97;-0.87,2.65;-1.32,2.07|0-1,0-2,1-2,0-3,2-3,0-4,3-4,4-5,5-6,6-7,7-8,7-9,8-9,7-10,9-10,7-11,10-11|2:-1.01,-2.42,1.6;4:-1.01,-2.42,1.6;6:-1.01,-2.42,1.6;7:-1.7,-0.06,2.35;8:-1.7,-0.06,2.35;9:-1.7,-0.06,2.35;12:0.14,1.41,1.6;14:0.14,1.41,1.6;16:0.14,1.41,1.6',
  '-1.77,0.93;-0.77,0.93;0.12,0.46;0.12,1.4,1;0.79,-0.28;0.95,-1.27;0.56,-2.18,1|0-1,1-2,1-3,2-4,4-5,5-6|3:-0.81,-1.05,1.78;4:-0.81,-1.05,1.78;5:-0.81,-1.05,1.78',
  '-0.84,1.29;0.03,0.79;0.03,1.79;0.69,0.04;-0.23,-0.36;0.78,-0.96,1;1.66,-0.18,1;1.2,0.9;-0.56,-1.29;-1.21,-0.55;-1.54,-1.48|0-1,1-2,2-0,1-3,3-4,3-5,3-6,3-7,4-8,8-9,4-9,9-10,8-10|',
  '-0.32,1.34;0.54,0.84;0.54,1.84;-0.16,0.12;0.31,-0.76;1.3,-0.59;1.44,0.4;0.69,0,1;-0.53,-1.31;-1.52,-1.25;-2.29,-0.61,1|0-1,1-2,2-0,1-3,3-4,4-5,5-6,6-1,7-4,4-8,8-9,9-10|3:0.69,0,0.85;4:0.69,0,0.85;5:0.69,0,0.85;6:0.69,0,0.85;7:0.69,0,0.85;9:-0.93,0.22,1.58;10:-0.93,0.22,1.58;11:-0.93,0.22,1.58',
  '-2.38,-0.05;-1.38,-0.05;-0.38,-0.05;0.62,-0.05,1;-0.08,0.7;-0.78,1.45,1;-0.08,-0.8;-0.78,-1.55;1.37,0.58;1.56,-0.39;2.32,0.24,1|0-1,1-2,2-3,3-4,4-5,3-6,6-7,3-8,8-9,3-9,9-10,8-10|',
  '-2.37,-1.1;-1.87,-0.25;-1.37,-1.1;-0.87,-0.25;-0.37,-1.1;0.02,-0.19;0.62,-0.97;1.01,-0.06;1.66,0.69;1.89,1.67;1.65,2.64,1|0-1,1-2,0-2,2-3,1-3,3-4,2-4,4-5,5-6,4-6,6-7,5-7,7-8,8-9,9-10|12:-0.21,1.65,2.11;13:-0.21,1.65,2.11;14:-0.21,1.65,2.11',
  '-1.99,-0.3;-1.09,0.45;-1.09,-1.05;-0.19,-0.3;0.7,0.15;0.85,-0.84,1;1.68,-0.01,1;1.15,1.04;-0.01,0.86|0-1,0-2,1-3,2-3,3-4,4-5,4-6,4-7,4-8|',
  '-2.08,-1.27;-1.08,-1.27;-0.3,-0.82;-0.3,0.08;0.58,0.56;0.76,-0.42,1;1.57,0.43,1;1,1.46;-0.15,1.25|0-1,1-2,2-3,3-4,4-5,4-6,4-7,4-8|1:-1.08,-0.37,0.9;2:-1.08,-0.37,0.9',
  '-1.21,-0.11;-0.5,-0.82;0.2,-0.11;-0.5,0.6;1.19,-0.25,1;0.82,0.68|0-1,1-2,2-3,3-0,2-4,4-5,5-2|0:-0.5,-0.11,0.71;1:-0.5,-0.11,0.71;2:-0.5,-0.11,0.71;3:-0.5,-0.11,0.71',
  '-2.86,0.12;-2.16,0.82;-2.16,-0.58;-0.66,0.12,1;0.85,-0.39;0.92,0.37;0.62,1.07;0.04,1.56;1.84,-0.46;1.3,-1.28;2.28,-1.35,1|0-1,0-2,1-3,2-3,0-3,3-4,3-5,4-5,3-6,5-6,3-7,6-7,4-8,8-9,4-9,9-10,8-10|7:-0.66,0.12,1.6;9:-0.66,0.12,1.6;11:-0.66,0.12,1.6',
  '-2.4,-0.48;-1.4,-0.48;-0.9,-1.34,1;-0.9,0.39;0.69,0.15;0.41,1.31;-0.59,1.96;1.66,0.36;0.89,-0.81;2.53,-1.05,1|0-1,1-2,1-3,3-4,3-5,4-5,3-6,5-6,4-7,4-8,7-9,8-9,4-9|5:-0.9,0.39,1.6;7:-0.9,0.39,1.6',
  '-2.76,0.5;-1.16,0.5,1;-1.96,1.05;-1.96,-0.05;-0.36,1.05;-0.36,-0.05;0.42,0.56;0.26,-0.83;1.83,-0.3,1;2.62,-0.91;3.41,-1.52|0-2,0-3,2-1,3-1,1-4,1-5,4-5,5-6,5-7,6-8,7-8,5-8,8-9,9-10|',
  '-1.44,1.07;-0.12,0.16;0.16,1.07;-0.12,1.99;-0.76,-1.31,1;0.07,-1.43;0.85,-1.11;1.36,-0.44,1|0-1,0-2,1-2,0-3,2-3,1-4,1-5,4-5,1-6,5-6,1-7,6-7|2:-1.44,1.07,1.6;4:-1.44,1.07,1.6;7:-0.12,0.16,1.6;9:-0.12,0.16,1.6;11:-0.12,0.16,1.6',
  '-2.85,-0.05;-1.85,-0.05;-0.85,-0.05;-1.55,0.7,1;-1.55,-0.8;0.13,-1.32;0.72,-0.37;0.55,0.73;1.54,0.84;2.49,0.52;3.22,-0.16,1|0-1,1-2,2-3,2-4,2-5,2-6,5-6,2-7,6-7,7-8,8-9,9-10|6:-0.85,-0.05,1.6;8:-0.85,-0.05,1.6;9:1.3,-1.45,2.31;10:1.3,-1.45,2.31;11:1.3,-1.45,2.31',
  '-0.59,1.51,1;0.44,0.29;0.94,1.06;0.94,1.97;0.44,2.73;-0.49,-0.08;-0.42,-1.08;0.55,-1.32;1.08,-0.48;0.23,-0.53,1;-1.19,-1.72;-1.95,-2.36,1|0-1,0-2,1-2,0-3,2-3,0-4,3-4,1-5,5-6,6-7,7-8,8-1,9-6,6-10,10-11|2:-0.59,1.51,1.6;4:-0.59,1.51,1.6;6:-0.59,1.51,1.6;7:0.23,-0.53,0.85;8:0.23,-0.53,0.85;9:0.23,-0.53,0.85;10:0.23,-0.53,0.85;11:0.23,-0.53,0.85',
  '-0.47,-0.81;0.53,-0.81;0.22,-1.76,1;1.34,-1.4;1.34,-0.22;0.22,0.14;-0.5,0.83;0.39,1.3;-0.67,1.82;-1.49,0.97;-0.93,-0.06,1|0-1,1-2,1-3,1-4,1-5,5-6,6-7,6-8,6-9,6-10|',
  '-2.44,0.38;-0.84,0.38,1;-1.64,0.93;-1.64,-0.17;-0.04,0.93;-0.04,-0.17;0.29,-1.11;1.27,-1.3;1.93,-0.54,1;1.6,0.4;0.61,0.59;0.94,-0.35|0-2,0-3,2-1,3-1,1-4,1-5,4-5,5-6,6-7,7-8,8-9,9-10,10-5,11-8|7:0.94,-0.35,1;8:0.94,-0.35,1;9:0.94,-0.35,1;10:0.94,-0.35,1;11:0.94,-0.35,1;12:0.94,-0.35,1',
  '-1.52,1.35;-0.81,0.64;-0.1,1.35,1;-0.81,2.05;0.05,-0.25;0.85,0.07;1.38,0.75;1.47,1.61;-0.58,-1.02;-0.72,-1.91;-0.02,-2.48;0.82,-2.16,1|0-1,1-2,2-3,3-0,2-4,2-5,4-5,2-6,5-6,2-7,6-7,4-8,8-9,9-10,10-11|6:-0.1,1.35,1.6;8:-0.1,1.35,1.6;10:-0.1,1.35,1.6;12:0.12,-1.59,0.9;13:0.12,-1.59,0.9;14:0.12,-1.59,0.9',
  '-2.33,0.28;-1.33,0.28;-0.33,0.28;-1.33,1.28,1;-1.33,-0.72,1;0.67,0.39;0.07,1.19;1.53,-0.12;2.1,-0.94;2.28,-1.92|0-1,1-2,1-3,1-4,2-5,5-6,6-2,5-7,7-8,8-9|7:-0.05,-1.83,2.33;8:-0.05,-1.83,2.33;9:-0.05,-1.83,2.33',
  '-1.06,1.68;-0.19,1.18;-0.19,2.18;-0.48,0.23;0.34,-0.35;1.14,0.26;0.81,1.2;-1.12,-1.01,1;-0.57,-1.67;0.24,-1.94;1.08,-1.77,1|0-1,1-2,2-0,1-3,3-4,4-5,5-6,6-1,4-7,4-8,7-8,4-9,8-9,4-10,9-10|10:0.34,-0.35,1.6;12:0.34,-0.35,1.6;14:0.34,-0.35,1.6',
  '-2.71,-0.04;-1.71,-0.04;-0.71,-0.04;0.29,-0.04;-1.71,0.96;0.29,0.96;1.04,-1.46,1;1.64,-0.89;1.89,-0.1;1.7,0.7,1|0-1,1-2,2-3,1-4,3-5,3-6,3-7,6-7,3-8,7-8,3-9,8-9|7:0.29,-0.04,1.6;9:0.29,-0.04,1.6;11:0.29,-0.04,1.6',
  '-1.51,1.76;-0.64,1.26;-0.64,2.26;-1.13,0.39;-0.76,-0.54;0.2,-0.82;1.02,-0.25;1.08,0.75;0.34,1.42;0.56,-1.76,1;-0.07,-2.54;1.55,-1.91|0-1,1-2,2-0,1-3,3-4,4-5,5-6,6-7,7-8,8-1,5-9,9-10,9-11|3:0.02,0.31,1.15;4:0.02,0.31,1.15;5:0.02,0.31,1.15;6:0.02,0.31,1.15;7:0.02,0.31,1.15;8:0.02,0.31,1.15;9:0.02,0.31,1.15',
  '-2.31,0.16;-1.41,0.96;-1.41,-0.63;-0.51,0.16;-1.41,0.16,1;0.46,0.4;1.45,0.23;2.29,-0.31;2.85,-1.14,1|0-1,0-2,1-3,2-3,4-1,4-2,3-5,5-6,6-7,7-8|6:0.55,-2.09,2.49;7:0.55,-2.09,2.49;8:0.55,-2.09,2.49;9:0.55,-2.09,2.49',
  '-2.72,1.52;-1.72,1.52;-0.94,1.07;-0.94,0.17;-0.02,-0.22;0.9,-0.61;1.82,-1;0.37,0.7;-0.41,-1.14,1;2.21,-0.08;1.44,-1.92,1|0-1,1-2,2-3,3-4,4-5,5-6,4-7,4-8,6-9,6-10|1:-1.72,0.62,0.9;2:-1.72,0.62,0.9',
  '-1.41,-1.03;-0.41,-1.03;0.09,-1.9,1;0.09,-0.17;1.01,0.21;0.94,1.21,1;-0.03,1.45;-0.56,0.6;0.29,0.66|0-1,1-2,1-3,3-4,4-5,5-6,6-7,7-3,8-5|3:0.29,0.66,0.85;4:0.29,0.66,0.85;5:0.29,0.66,0.85;6:0.29,0.66,0.85;7:0.29,0.66,0.85',
  '-1.01,1.76;-0.01,1.76;0.49,0.9,1;0.49,2.63;0.08,-0.65;1.04,-0.6;1.8,-0.01;0.06,-1.9;-1.18,-0.67;-1.19,-1.93,1;-0.56,-1.29,1|0-1,1-2,1-3,2-4,2-5,4-5,2-6,5-6,4-7,4-8,7-9,8-9,10-7,10-8|5:0.49,0.9,1.6;7:0.49,0.9,1.6',
  '-1.08,1.18;0.07,0.07;0.52,1.18;0.07,2.28;0.1,-0.93;-0.9,-0.96,1;0.13,-1.93;1.1,-0.9,1|0-1,0-2,1-2,0-3,2-3,1-4,4-5,4-6,4-7|2:-1.08,1.18,1.6;4:-1.08,1.18,1.6',
  '-2.52,-0.61;-1.62,0.16;-1.62,-1.37;-0.72,-0.61;-1.62,-0.61;0.22,-0.26;1.15,0.08;2.09,0.42;3.03,0.76;-0.13,0.68,1;1.75,1.36,1|0-1,0-2,1-3,2-3,4-1,4-2,3-5,5-6,6-7,7-8,5-9,7-10|',
  '-1.48,-0.23;-0.77,-0.94;-0.06,-0.23,1;-0.77,0.48;1.4,-0.88;1.37,0.47;0.32,1.32|0-1,1-2,2-3,3-0,2-4,2-5,4-5,2-6,5-6|6:-0.06,-0.23,1.6;8:-0.06,-0.23,1.6',
  '-2.11,0.86;-1.11,0.86;-1.42,-0.09,1;-0.3,0.27;-0.3,1.44;-1.42,1.81,1;0.93,0.56;0,-0.96;1.23,-0.67;0.46,-0.2;1.76,-1.51;2.3,-2.36,1|0-1,1-2,1-3,1-4,1-5,3-6,3-7,6-8,7-8,9-6,9-7,8-10,10-11|',
  '-1.2,2.36;-0.2,2.36;0.58,1.91;0.58,1.01;-0.2,0.56;0.89,0.17;-0.37,-0.59;0.73,-0.98;0.26,-0.21,1;0.39,-1.92;-0.3,-2.5;-1.14,-2.2,1|0-1,1-2,2-3,3-4,4-5,4-6,5-7,6-7,8-5,8-6,7-9,9-10,10-11|1:-0.2,1.46,0.9;2:-0.2,1.46,0.9;3:-0.2,1.46,0.9;11:-0.46,-1.61,0.9;12:-0.46,-1.61,0.9',
  '-3.22,1.29;-2.35,0.79;-2.35,1.79;-1.36,0.79;-2.35,-0.2;-0.8,-0.77;0.15,-1.07;1.13,-0.86;1.88,-0.2;2.62,-1.62,1;3.43,-0.61;3.23,0.67,1|0-1,1-2,2-0,1-3,1-4,3-5,4-5,1-5,5-6,6-7,7-8,8-9,8-10,9-10,8-11,10-11|8:0.25,0.9,1.97;9:0.25,0.9,1.97;10:0.25,0.9,1.97;13:1.88,-0.2,1.6;15:1.88,-0.2,1.6',
  '-2.71,-0.85;-2.01,-0.15;-2.01,-1.55;-0.51,-0.85,1;0.85,-1.7;1.03,-0.43;0.23,0.57;1.07,1.11,1;1.92,1.64;0.54,1.95;1.61,0.26|0-1,0-2,1-3,2-3,0-3,3-4,3-5,4-5,3-6,5-6,6-7,7-8,7-9,7-10|7:-0.51,-0.85,1.6;9:-0.51,-0.85,1.6',
  '-2.23,0.06;-1.53,-0.64;-0.82,0.06,1;-1.53,0.77;-0.83,-1.54;0.06,-1.27;0.66,-0.56;0.75,0.37;1.18,1.51;1.93,0.05;2.36,1.19,1|0-1,1-2,2-3,3-0,2-4,2-5,4-5,2-6,5-6,2-7,6-7,7-8,7-9,8-10,9-10|6:-0.82,0.06,1.6;8:-0.82,0.06,1.6;10:-0.82,0.06,1.6',
  '-1.7,0;-1,-0.7;-0.29,0;-1,0.71;0.61,0.58;1.19,-0.94;2.19,0.34,1|0-1,1-2,2-3,3-0,2-4,4-5,5-6|0:-1,0,0.71;1:-1,0,0.71;2:-1,0,0.71;3:-1,0,0.71',
  '-2.59,-1.18;-1.89,-0.48;-1.89,-1.88;-0.39,-1.18,1;0.48,-0.7;1.36,-0.21;2.24,0.27;0,0.18;1.76,1.14,1;-0.41,1.22;0.88,0.88;0.47,1.92,1|0-1,0-2,1-3,2-3,0-3,3-4,4-5,5-6,4-7,6-8,7-9,7-10,9-11,10-11|',
  '-2.81,-1.33;-1.81,-1.33;-0.81,-1.33;0.19,-1.33;-1.81,-0.33,1;0.19,-0.33;-0.04,0.89;1.39,-0.02;1.15,1.2;0.67,0.44,1;2.14,1.33,1;1.53,2.12|0-1,1-2,2-3,1-4,3-5,5-6,5-7,6-8,7-8,9-6,9-7,8-10,10-11,11-8|',
  '-2.26,-0.08;-0.66,-0.08,1;-1.46,0.47;-1.46,-0.63;0.14,0.47;0.14,-0.63;1.07,0.11;0.92,1.1;1.52,-0.78,1;2.07,0.05|0-2,0-3,2-1,3-1,1-4,1-5,4-5,4-6,6-7,7-4,6-8,8-9,9-6|',
  '-2.19,-0.39;-0.59,-0.39,1;-1.39,0.16;-1.39,-0.94;0.21,0.16;0.21,-0.94;0.82,1.04;1.94,-0.13;2.37,1.43,1|0-2,0-3,2-1,3-1,1-4,1-5,4-5,4-6,6-7,7-8|',
  '-1.02,-1.01;-0.02,-1.01;0.98,-1.01;1.98,-1.01,1;-0.02,-0.01;-0.02,0.99;-0.02,-2.01;-0.02,-3.01,1;-1.08,1.52;0.34,2.11;-0.72,2.65,1;-0.37,1.82|0-1,1-2,2-3,1-4,4-5,1-6,6-7,5-8,5-9,8-10,9-10,11-8,11-9|',
  '-2.67,-0.15;-1.77,0.7;-1.77,-1;-0.87,-0.15;-1.77,-0.15,1;0.11,0.05;1.09,0.25,1;0.25,0.85;0.56,-0.62;1.89,0.84;1.68,-0.54;3.26,-0.08|0-1,0-2,1-3,2-3,4-1,4-2,3-5,5-6,6-7,6-8,6-9,6-10,9-11,10-11,6-11|',
  '-1.99,0.3;-0.99,0.3;0.01,0.3;-0.69,1.05,1;-0.69,-0.45;0.84,-0.25;0.9,0.74;0.88,-1.25,1;1.73,-0.73|0-1,1-2,2-3,2-4,2-5,5-6,6-2,5-7,7-8,8-5|',
  '-1.79,-0.18;-1.08,-0.89;-0.37,-0.18;-1.08,0.53;0.59,0.08;1.56,0.35;0.68,0.89;-0.19,1.43,1;1.08,-0.56;0.6,-1.47,1|0-1,1-2,2-3,3-0,2-4,4-5,5-6,6-7,5-8,8-9|',
  '-2.06,-0.08;-1.06,-0.08;-0.06,-0.08,1;-0.76,0.67;-1.46,1.42;-0.76,-0.83;-1.46,-1.58,1;1.53,0.11;0.67,0.56;0.8,-0.53;2.26,0.75,1;2.39,-0.34|0-1,1-2,2-3,3-4,2-5,5-6,2-8,2-9,8-7,9-7,7-10,7-11,10-11|',
  '-2.08,0.85;-1.21,0.35;-1.21,1.35;-0.34,-0.14,1;-1.07,-0.82;0.08,-1.05;0.65,-0.02;-0.15,0.84;1.56,0.38;1.06,-0.92;2.71,-0.81,1|0-1,1-2,2-0,1-3,3-4,3-5,3-6,3-7,6-8,6-9,8-10,9-10,6-10|',
  '-1.23,0.57;-0.37,0.07;-0.37,1.07;0.6,0.29;-0.14,-0.9;1.51,-1.09,1|0-1,1-2,2-0,1-3,1-4,3-5,4-5,1-5|',
  '-3.1,0.69;-2.1,0.69;-1.1,0.69;-0.1,0.69;-2.1,1.69,1;-0.1,1.69,1;0.89,0.66;-0.13,-0.3;1.41,-0.91;2.55,-1.16;1.38,-2.08;2.52,-2.33,1|0-1,1-2,2-3,1-4,3-5,3-6,3-7,6-8,7-8,3-8,8-9,8-10,9-11,10-11|',
  '-2.88,-0.49;-2.18,0.21;-2.18,-1.19;-0.68,-0.49;0.24,-0.1;1.16,0.29;2.08,0.69,1;1.14,1.1;0.2,1.52,1;1.73,-0.28;1.38,-1.24|0-1,0-2,1-3,2-3,0-3,3-4,4-5,5-6,6-7,7-8,6-9,9-10|',
  '-3.21,1.05;-2.51,1.75;-2.51,0.35;-1.01,1.05;-0.16,0.53;-0.14,1.53;0.48,-0.24;1.12,-1;1.77,-1.77;2.41,-2.54,1;1.25,0.41,1;2.53,-1.13,1|0-1,0-2,1-3,2-3,0-3,3-4,4-5,5-3,4-6,6-7,7-8,8-9,6-10,8-11|',
  '-3.47,0.16;-2.47,0.16;-1.47,0.16;-0.47,0.16;-2.47,1.16;-0.47,1.16;0.45,-0.25;1.36,-0.66;2.27,-1.07;3.18,-1.48,1;0.86,0.66;2.68,-0.16,1|0-1,1-2,2-3,1-4,3-5,3-6,6-7,7-8,8-9,6-10,8-11|',
  '-1.78,1.51;-0.91,1.01;-0.91,2.01;-0.25,0.26;0.42,-0.48;1.4,-0.62;0.28,-1.46;1.74,-2.24,1|0-1,1-2,2-0,1-3,3-4,4-5,4-6,5-7,6-7,4-7|',
  '-2.49,-0.02;-1.79,-0.73;-1.08,-0.02;-1.79,0.68;-0.2,0.86;-0.16,-0.86;0.72,0.02;-0.18,0,1;1.72,0.03;2.62,-0.41,1;2.61,0.47|0-1,1-2,2-3,3-0,2-4,2-5,4-6,5-6,7-4,7-5,6-8,8-9,8-10|',
  '-1.27,-1.03;-0.27,-1.03;0.73,-1.03;1.73,-1.03;-0.27,-0.03;1.73,-0.03,1;-1.32,0.59;0.25,1.07;-0.8,1.69;-0.53,0.83,1|0-1,1-2,2-3,1-4,3-5,4-6,4-7,6-8,7-8,9-6,9-7|',
  '-1.91,1.16;-1.05,0.66;-1.05,1.66;-0.23,0.08;0.58,-0.5;0.45,0.52;0.31,1.53,1;-0.42,-0.71;-1.43,-0.91,1;1.55,-0.31;0.78,-1.47;2.41,-1.72,1|0-1,1-2,2-0,1-3,3-4,4-5,5-6,4-7,7-8,4-9,4-10,9-11,10-11,4-11|',
  '-1.6,-0.95;-0.9,-1.65;-0.19,-0.95;-0.9,-0.24;0.66,-0.41,1;1.5,0.12;0.12,0.43;1.19,-1.26;-0.76,1.27;0.87,1.39;-0.01,2.23,1|0-1,1-2,2-3,3-0,2-4,4-5,4-6,4-7,6-8,6-9,8-10,9-10|',
  '-2.16,-0.64;-1.16,-0.64;-0.16,-0.64;0.84,-0.64;-1.16,0.36,1;0.84,0.36;1.82,0.55,1;1.16,1.3|0-1,1-2,2-3,1-4,3-5,5-6,6-7,7-5|',
  '-0.36,-0.72;0.64,-0.72,1;0.33,-1.67;1.45,-1.3;1.45,-0.13;0.33,0.23;-0.51,0.78;-0.55,1.78;-1.35,1.32;-1.44,0.42,1|0-1,1-2,1-3,1-4,1-5,5-6,6-7,6-8,6-9|',
  '-1.44,-0.75;-0.44,-0.75;0.56,-0.75;1.56,-0.75;2.56,-0.75,1;-0.44,0.25;1.56,0.25,1;-1.43,0.23;-0.46,1.24;-2.03,1.77|0-1,1-2,2-3,3-4,1-5,3-6,5-7,5-8,7-9,8-9,5-9|',
  '-2.47,0.8;-0.87,0.8,1;-1.67,1.35;-1.67,0.25;-0.07,1.35;-0.07,0.25;0.65,-0.44;0.89,0.53;1.69,-0.7;0.98,-2.16;2.6,-2.02,1|0-2,0-3,2-1,3-1,1-4,1-5,4-5,5-6,6-7,7-5,6-8,8-9,9-10|',
  '-2.15,-0.17;-1.45,0.53;-1.45,-0.87;0.05,-0.17,1;1.01,0.1;1.97,0.37,1;0.74,1.06;1.28,-0.86|0-1,0-2,1-3,2-3,0-3,3-4,4-5,4-6,4-7|',
  '-1.7,0.31;-0.8,1.07;-0.8,-0.46;0.1,0.31;-0.8,0.31,1;1.32,0.41;0.31,-0.9;1.53,-0.79;0.82,-0.24,1|0-1,0-2,1-3,2-3,4-1,4-2,3-5,3-6,5-7,6-7,8-5,8-6|',
  '-2.56,0.93;-1.56,0.93;-0.56,0.93;-1.26,1.68,1;-1.26,0.18,1;-0.09,0.05;0.44,0.9;0.9,0.04;-0.1,-0.94;1.45,-1.52,1;2.28,-2.08;2.35,-1.08|0-1,1-2,2-3,2-4,2-5,5-6,6-2,5-7,5-8,7-9,8-9,5-9,9-10,10-11,11-9|',
  '-1.32,-1.71;-0.32,-1.71;0.68,-1.71,1;-0.32,-0.71;-0.32,-2.71;0.54,-0.21;0.04,0.65;-0.82,0.15;0.34,1.61;0.64,2.56;-0.28,2.12,1;1.15,1.67|0-1,1-2,1-3,1-4,3-5,5-6,6-7,7-3,6-8,8-9,9-10,9-11|',
  '-2.5,-0.12;-1.5,-0.12;-0.5,-0.12;0.5,-0.12;-1.5,0.88,1;0.5,0.88,1;1.36,0.38;1,-0.98;2.63,-0.69|0-1,1-2,2-3,1-4,3-5,3-6,3-7,6-8,7-8,3-8|',
  '-1.03,2.32;-0.17,1.82;-0.17,2.82;0.47,1.06;-0.92,1.18;-0.35,-0.37;0.14,-1.24,1;-0.37,-2.1;-0.88,-2.96,1;1.14,-1.26;2.14,-1.27,1|0-1,1-2,2-0,1-3,1-4,3-5,4-5,1-5,5-6,6-7,7-8,6-9,9-10|',
  '-2.59,0.47;-1.79,1.12;-0.99,-0.19;-0.19,1.12;0.61,-0.19;1.56,0.07;0.87,-1.14;2.52,-1.28,1|0-1,1-2,2-3,3-4,4-5,4-6,5-7,6-7,4-7|',
  '-1.64,-1.36;-0.64,-1.36;-0.14,-2.23,1;-0.14,-0.5;0.78,-0.11;0.7,0.88;-0.28,1.11;-0.8,0.26;1.54,1.43,1;0.64,1.88|0-1,1-2,1-3,3-4,4-5,5-6,6-7,7-3,5-8,8-9,9-5|',
  '-1.29,1.41;-0.43,0.91;-0.43,1.91;0.4,0.35,1;-0.16,-0.48;1.23,-0.22;0.96,1.17;0.58,-1.14;-0.82,-1.22;-0.03,-2.68,1|0-1,1-2,2-0,1-3,3-4,3-5,3-6,4-7,4-8,7-9,8-9,4-9|',
  '-2.27,-0.53;-1.27,-0.53;-1.58,-1.48,1;-0.47,-1.11;-0.47,0.06;-1.58,0.43;0.5,0.34;1.48,0.15;2.46,-0.03;1.24,1.01;1.97,1.68,1|0-1,1-2,1-3,1-4,1-5,4-6,6-7,7-8,6-9,9-10|',
  '-1.63,0.88;-0.76,0.38;-0.76,1.38;-0.56,-0.6;0.43,-0.72;0.85,0.19;0.11,0.87;0.88,-1.61,1;1.43,-0.77|0-1,1-2,2-0,1-3,3-4,4-5,5-6,6-1,4-7,7-8,8-4|',
  '-2.78,1.27;-1.92,0.77;-1.92,1.77;-1.18,0.1;-0.43,-0.57;0.31,-1.24;1.05,-1.91,1;-0.51,0.84,1;0.98,-0.5;1.46,0.36;1.84,-0.98;3.1,0.1|0-1,1-2,2-0,1-3,3-4,4-5,5-6,3-7,5-8,8-9,8-10,9-11,10-11,8-11|',
  '-1.69,0.05;-0.79,0.95;-0.79,-0.85;0.11,0.05;0.73,-0.74;1.52,-0.12,1;0.9,0.67|0-1,0-2,1-3,2-3,3-4,4-5,5-6,6-3|',
  '-2.75,0.05;-1.75,0.05,1;-0.75,0.05;-1.75,1.05;-1.75,-0.95;0.25,0.01;1.25,-0.03;2.25,-0.07,1;0.29,1.01;0.21,-0.99;2.29,0.93;2.21,-1.07|0-1,1-2,1-3,1-4,2-5,5-6,6-7,5-8,5-9,7-10,7-11|',
  '-1.29,-0.84;-0.29,-0.84;0.71,-0.84;1.71,-0.84;2.71,-0.84,1;-0.29,0.16;1.71,0.16;-1.05,0.81;-1.8,1.47;-1.7,0.06,1;-0.39,1.57,1|0-1,1-2,2-3,3-4,1-5,3-6,5-7,7-8,7-9,7-10|',
  '-2.99,-0.51;-2.29,0.19;-2.29,-1.21;-0.79,-0.51;0.2,-0.38,1;0.81,-1.18;0.59,0.54;1.29,1.59;1.65,-0.15;2.35,0.9;1.47,0.72,1|0-1,0-2,1-3,2-3,0-3,3-4,4-5,4-6,6-7,6-8,7-9,8-9,10-7,10-8|',
  '-1.76,-1.13;-0.76,-1.13;0.24,-1.13,1;-0.76,-0.13;-0.76,-2.13;0.1,0.37;-0.76,0.87;0.92,0.95;1.73,1.54,1;0.33,1.77;1.5,0.14|0-1,1-2,1-3,1-4,3-5,5-6,6-3,5-7,7-8,7-9,7-10|',
  '-2.34,-0.58;-1.34,-0.58;-0.34,-0.58,1;-1.04,0.17;-1.04,-1.33;-0.17,0.4;0.63,-0.75;1.46,0.69;2.43,0.91,1;1.75,1.64|0-1,1-2,2-3,2-4,2-5,2-6,5-7,6-7,2-7,7-8,8-9,9-7|',
  '-2.92,0.3;-2.02,1.12;-2.02,-0.53;-1.12,0.3;-0.3,0.85;-0.56,-0.52;1.05,-0.12,1;2.04,0.24;2.3,-1.32;3.53,-0.32,1|0-1,0-2,1-3,2-3,3-4,3-5,4-6,5-6,3-6,6-7,7-8,8-9|',
  '-3.68,0.52;-2.68,0.52;-1.68,0.52;-0.68,0.52;-0.49,-0.46;0.49,-0.28;0.3,0.71;1.48,-0.39,1;1.07,-1.3;2.22,-1.06;2.35,0.1;1.28,0.59|0-1,1-2,2-3,3-4,4-5,5-6,6-3,5-7,7-8,7-9,7-10,7-11|',
  '-3.75,0.21;-2.75,0.21;-1.75,0.21;-0.75,0.21;0.25,0.21;1.23,0.02;0.9,0.96;2.2,0.19;1.4,-0.96;3.03,-1.25,1|0-1,1-2,2-3,3-4,4-5,5-6,6-4,5-7,5-8,7-9,8-9,5-9|',
  '-3.79,-0.26;-2.79,-0.26;-1.79,-0.26;-0.79,-0.26;-0.22,0.83;0.34,-0.77;0.91,0.33;0.06,0.03,1;1.91,0.97;1.68,-0.58;2.69,0.06,1;1.8,0.19,1|0-1,1-2,2-3,3-4,3-5,4-6,5-6,7-4,7-5,6-8,6-9,8-10,9-10,11-8,11-9|',
  '-1.63,0.08;-0.63,0.08;0.37,0.08;-0.33,0.83;-1.03,1.58,1;-0.33,-0.67;-1.03,-1.42,1;1.2,0.61;0.9,-0.76;2.52,-0.4|0-1,1-2,2-3,3-4,2-5,5-6,2-7,2-8,7-9,8-9,2-9|',
  '-3.45,1.72;-2.65,2.32;-1.85,1.12;-1.05,2.32;-0.25,1.12;0.74,1.12;-0.25,0.13;1.31,-0.43,1;2.26,-0.99;1.02,-2.18;2.7,-2.53;1.46,-3.72,1|0-1,1-2,2-3,3-4,4-5,4-6,5-7,6-7,4-7,7-8,8-9,9-10,10-11|',
  '-3.27,-0.6;-2.57,0.1;-2.57,-1.3;-1.07,-0.6,1;-0.07,-0.5;0.92,-0.39;1.92,-0.28;-0.18,0.5;1.81,0.71;2.81,0.76,1;2.26,1.6|0-1,0-2,1-3,2-3,0-3,3-4,4-5,5-6,4-7,6-8,8-9,9-10,10-8|',
  '-2.74,0.36;-1.74,0.36;-0.74,0.36;-0.12,-0.42;0.67,0.2;0.05,0.99;1.66,0.23;0.69,-0.79;2.26,-1.31,1|0-1,1-2,2-3,3-4,4-5,5-2,4-6,4-7,6-8,7-8,4-8|',
  '-2.64,1.23;-1.94,1.93;-1.94,0.53;-0.44,1.23,1;0.05,0.36;0.56,1.22;0.64,-0.45;0.79,-1.44;0.93,-2.43,1;1.54,-0.88;2.44,-1.31,1|0-1,0-2,1-3,2-3,0-3,3-4,4-5,5-3,4-6,6-7,7-8,6-9,9-10|',
  '-2.55,-0.14;-1.55,-0.14;-0.55,-0.14;-1.25,0.61,1;-1.25,-0.89,1;0.45,-0.2;0,0.69;1.43,0,1;1.64,-0.97;2.41,0.21;1.22,0.98|0-1,1-2,2-3,2-4,2-5,5-6,6-2,5-7,7-8,7-9,7-10|',
  '-2.24,0.73;-1.53,0.03;-0.83,0.73;-1.53,1.44;-0.69,-0.26;0.29,-0.43;0.77,0.45;0.07,1.17;1.2,-0.86;2.1,-1.28,1;1.62,0.05,1;0.77,-1.76,1|0-1,1-2,2-3,3-0,2-4,4-5,5-6,6-7,7-2,5-8,8-9,8-10,8-11|',
  '-2.22,2.15;-1.22,2.15,1;-0.72,1.29;-0.72,3.02;-0.34,0.36;0.27,1.15;0.03,-0.57;0.39,-1.5;0.76,-2.43;1.13,-3.36,1;0.96,-0.2;1.69,-2.06,1|0-1,1-2,1-3,2-4,4-5,5-2,4-6,6-7,7-8,8-9,6-10,8-11|',
  '-2.25,0.57;-1.25,0.57,1;-1.56,-0.38;-0.44,-0.02;-0.44,1.16;-1.56,1.52;0.33,0.6;0.17,-0.79;1.74,-0.27,1;2.34,-1.07;2.93,-1.88|0-1,1-2,1-3,1-4,1-5,3-6,3-7,6-8,7-8,3-8,8-9,9-10|',
  '-2.87,1.66;-1.87,1.66;-1.37,0.79;-1.37,2.52,1;-0.41,1;-1.17,-0.18;0.47,-0.41,1;1.72,-1.41,1;1.44,-0.48;0.75,-1.34;2.69,-1.48;2,-2.34|0-1,1-2,1-3,2-4,2-5,4-6,5-6,2-6,6-8,6-9,8-7,9-7,7-10,7-11,10-11|',
  '-1.62,1.14;-0.75,0.64;-0.75,1.64;0.23,0.75;-0.64,-0.34;0.97,-0.74;0.81,-1.72,1;1.75,-1.36|0-1,1-2,2-0,1-3,1-4,3-5,4-5,1-5,5-6,6-7,7-5|',
  '-2.76,-0.86;-2.06,-0.16;-2.06,-1.56;-0.56,-0.86,1;-0.4,0.12;0.42,-1.01;1.23,0.43;1.21,1.42;2.22,0.45;2.75,2.02,1|0-1,0-2,1-3,2-3,0-3,3-4,3-5,4-6,5-6,3-6,6-7,6-8,7-9,8-9,6-9|',
  '-2.76,0.42;-2.06,1.12;-2.06,-0.28;-0.56,0.42;0.38,0.1;0.19,1.08;1.21,-0.46;0.42,-1.08,1;1.55,-1.4,1;2.21,-0.43;1.49,0.5,1|0-1,0-2,1-3,2-3,0-3,3-4,4-5,5-3,4-6,6-7,6-8,6-9,6-10|',
  '-2.68,0.09;-1.97,-0.62;-1.26,0.09;-1.97,0.8;-0.26,0.03;0.73,-0.03;1.73,-0.09;2.73,-0.15;-0.2,1.03,1;-0.32,-0.97,1;1.79,0.91;1.67,-1.09|0-1,1-2,2-3,3-0,2-4,4-5,5-6,6-7,4-8,4-9,6-10,6-11|',
  '-2.62,-0.37;-1.02,-0.37,1;-1.82,0.18;-1.82,-0.92;-0.22,0.18;-0.22,-0.92;0.56,-0.44;1.39,0.11;1.13,1.07;0.13,1.12;2.29,-0.33,1;2.23,0.66|0-2,0-3,2-1,3-1,1-4,1-5,4-5,4-6,6-7,7-8,8-9,9-4,7-10,10-11,11-7|',
  '-2.07,0.21;-1.37,0.91;-1.37,-0.49;0.13,0.21;1.25,0.57;0.67,-0.83;1.79,-0.47,1;0.96,-0.13,1|0-1,0-2,1-3,2-3,0-3,3-4,3-5,4-6,5-6,7-4,7-5|',
  '-2.88,-0.25;-2.18,0.45;-2.18,-0.95;-0.68,-0.25;0.3,-0.46,1;0.61,-1.4;0.96,0.29;1.25,1.24;1.91,0.01;2.9,1.33,1|0-1,0-2,1-3,2-3,0-3,3-4,4-5,4-6,6-7,6-8,7-9,8-9,6-9|',
  '-3.19,-0.36;-1.59,-0.36,1;-2.39,0.19;-2.39,-0.91;-0.79,0.19;-0.79,-0.91;0.11,0.8;0.67,-0.79;1.69,0.55;2.4,1.24;2.39,-0.16;3.89,0.53,1|0-2,0-3,2-1,3-1,1-4,1-5,4-5,4-6,6-7,7-8,8-9,8-10,9-11,10-11,8-11|',
  '-1.97,-0.98;-1.26,-1.68;-0.56,-0.98;-1.26,-0.27;-0.3,0.17;0.61,-1.03;0.87,0.12;0.16,-0.43,1;0.51,1.12;2.11,1.35;1.09,2.61,1|0-1,1-2,2-3,3-0,2-4,2-5,4-6,5-6,7-4,7-5,6-8,8-9,9-10|',
  '-3.14,0.03;-2.14,0.03;-1.14,0.03;-0.14,0.03;-0.84,0.78,1;-0.84,-0.72,1;0.49,-0.74;1.42,-0.37;1.36,0.63;0.39,0.88;2.32,-0.81,1;2.25,0.19|0-1,1-2,2-3,3-4,3-5,3-6,6-7,7-8,8-9,9-3,7-10,10-11,11-7|',
  '-2.24,-0.36;-0.64,-0.36,1;-1.44,0.19;-1.44,-0.91;0.16,0.19;0.16,-0.91;1.12,0.47;2.08,0.74;0.84,1.43;1.4,-0.49,1|0-2,0-3,2-1,3-1,1-4,1-5,4-5,4-6,6-7,6-8,6-9|',
  '-2.34,0.47;-1.44,1.24;-1.44,-0.31;-0.54,0.47;-1.44,0.47;0.4,0.76;-0.25,-0.48;1.4,-0.56,1;2.35,-0.87;3.3,-1.18,1|0-1,0-2,1-3,2-3,4-1,4-2,3-5,3-6,5-7,6-7,3-7,7-8,8-9|',
  '-2.39,0.31;-1.49,1.05;-1.49,-0.42;-0.59,0.31;-1.49,0.31,1;0,-0.49;0.95,-0.17;0.94,0.83;-0.01,1.13;1.94,-0.1;1.02,-1.16;2.62,-1.61,1|0-1,0-2,1-3,2-3,4-1,4-2,3-5,5-6,6-7,7-8,8-3,6-9,6-10,9-11,10-11,6-11|',
  '-3.13,-0.66;-2.43,0.04;-2.43,-1.36;-0.93,-0.66,1;-0.48,0.48;0.24,-1;0.69,0.13;-0.12,-0.26,1;1.59,0.56;2.54,0.25,1;2.5,0.99;1.95,1.49|0-1,0-2,1-3,2-3,0-3,3-4,3-5,4-6,5-6,7-4,7-5,6-8,8-9,8-10,8-11|',
  '-2.17,0.5;-1.27,1.17;-1.27,-0.16;-0.37,0.5;-0.1,-0.46;0.9,-0.5;1.25,0.44;0.46,1.06;0.84,-1.5,1;1.73,-1.05|0-1,0-2,1-3,2-3,3-4,4-5,5-6,6-7,7-3,5-8,8-9,9-5|',
  '-2.76,-1.08;-2.05,-1.79;-1.35,-1.08;-2.05,-0.37;-0.55,-0.47;0.24,0.14;1.03,0.75;0.02,0.91,1;0.93,-0.28,1;1.5,1.62;1.9,0.28;3.14,1.38,1|0-1,1-2,2-3,3-0,2-4,4-5,5-6,6-7,6-8,6-9,6-10,9-11,10-11,6-11|',
  '-2.88,-0.82;-1.28,-0.82,1;-2.08,-0.27;-2.08,-1.37;-0.48,-0.27;-0.48,-1.37;-0.13,0.88;0.7,-0.48;1.05,0.67;1.67,1.54;2.77,0.37;3.22,1.92,1|0-2,0-3,2-1,3-1,1-4,1-5,4-5,4-6,4-7,6-8,7-8,8-9,9-10,10-11|',
  '-2.49,0.16;-1.49,0.16;-0.57,-0.24;-0.57,0.56,1;1.02,-0.13;0.19,0.37;0.26,-0.73;1.79,0.48;1.86,-0.62,1|0-1,1-2,1-3,2-5,2-6,5-4,6-4,4-7,4-8,7-8|',
  '-1.68,-0.07;-0.97,-0.78;-0.27,-0.07;-0.97,0.64;0.73,0.04;1.72,0.15;0.62,1.03,1;0.84,-0.95,1|0-1,1-2,2-3,3-0,2-4,4-5,4-6,4-7|',
  '-1.36,1.34;-0.5,0.84;-0.5,1.84;-0.49,-0.16;0.46,-0.46;1.05,0.36;0.45,1.16;1.06,-1.25;-0.33,-1.05;0.16,-2.64,1|0-1,1-2,2-0,1-3,3-4,4-5,5-6,6-1,4-7,4-8,7-9,8-9,4-9|',
  '-3.49,-0.25;-2.79,0.45;-2.79,-0.95;-1.29,-0.25,1;0.3,-0.37,1;-0.45,0.24;-0.54,-0.86;1.14,0.11;1.05,-0.98;2.05,0.53;2.96,0.95;3.87,1.36,1|0-1,0-2,1-3,2-3,0-3,3-5,3-6,5-4,6-4,4-7,4-8,7-8,7-9,9-10,10-11|',
  '-1.93,1.35;-0.93,1.35;-1.24,0.4;-0.12,0.76;-0.12,1.94;-1.24,2.3;0.19,-0.19;0.51,-1.14;0.82,-2.09;1.14,-3.04;1.14,0.13,1;1.77,-1.77,1|0-1,1-2,1-3,1-4,1-5,3-6,6-7,7-8,8-9,6-10,8-11|',
  '-2.9,-0.43;-2,0.22;-2,-1.08;-1.1,-0.43;-0.28,-0.99;0.29,-0.17;-0.53,0.4;0.81,0.66;1.98,-0.05;2.28,1.29;3.45,0.58,1|0-1,0-2,1-3,2-3,3-4,4-5,5-6,6-3,5-7,7-8,8-9,9-10|',
  '-2.02,-0.44;-1.12,0.36;-1.12,-1.24;-0.22,-0.44;0.64,0.07;1.5,0.58;2.36,1.09,1|0-1,0-2,1-3,2-3,3-4,4-5,5-6|',
  '-3.03,-0.79;-2.33,-0.09;-2.33,-1.49;-0.83,-0.79,1;-0.35,0.12;0.89,-0.76;1.12,0.74;1.64,1.59;1.97,0.22;3.26,1.26,1|0-1,0-2,1-3,2-3,0-3,3-4,4-5,5-6,6-7,6-8,7-9,8-9,6-9|',
  '-2.32,0.11;-1.42,0.95;-1.42,-0.74;-0.52,0.11;-1.42,0.11,1;0.25,-0.54;0.89,0.23;0.13,0.87;1.85,0.49;1.16,-0.73;2.81,-0.86,1|0-1,0-2,1-3,2-3,4-1,4-2,3-5,5-6,6-7,7-3,6-8,6-9,8-10,9-10,6-10|',
  '-2.16,0.41;-1.26,1.26;-1.26,-0.43;-0.36,0.41;-1.26,0.41,1;0.08,-0.49;0.98,-0.05;0.54,0.85;0.85,-1.04;1.85,-1.17,1;1.97,-0.17|0-1,0-2,1-3,2-3,4-1,4-2,3-5,5-6,6-7,7-3,6-8,8-9,9-10,10-6|',
  '-1.25,1.83;-0.38,1.33;-0.38,2.33;-0.22,0.34;-0.05,-0.64;0.12,-1.63;0.28,-2.61,1;0.77,0.51;1.1,-1.46,1|0-1,1-2,2-0,1-3,3-4,4-5,5-6,3-7,5-8|',
  '-3.43,0.17;-2.43,0.17;-1.43,0.17;-0.43,0.17;-2.43,1.17,1;-0.43,1.17,1;0.47,0.58;-0.02,-0.73;1.63,-0.6;2.42,0;2.24,-1.38;3.82,-0.88,1|0-1,1-2,2-3,1-4,3-5,3-6,3-7,6-8,7-8,3-8,8-9,8-10,9-11,10-11,8-11|',
  '-2.7,-1.01;-2,-0.31;-2,-1.71;-0.5,-1.01;0.35,-0.5;1.23,-0.98,1;0.33,0.5;1.13,1.11;1.93,1.71,1;0.53,1.9,1;1.73,0.31|0-1,0-2,1-3,2-3,0-3,3-4,4-5,4-6,6-7,7-8,7-9,7-10|',
  '-1.61,-0.41;-0.61,-0.41,1;-0.92,-1.36;0.2,-1;0.2,0.18;-0.92,0.54;0.41,1.14;1.17,-0.04;2.06,1.36,1|0-1,1-2,1-3,1-4,1-5,4-6,4-7,6-8,7-8,4-8|',
  '-1.52,-0.21;-0.62,0.57;-0.62,-0.99;0.28,-0.21;-0.62,-0.21,1;1.27,-0.36;1.42,0.63,1;0.43,0.78|0-1,0-2,1-3,2-3,4-1,4-2,3-5,5-6,6-7,7-3|',
  '-2.81,-0.05;-1.21,-0.05;-2.01,0.5;-2.01,-0.6;-0.41,0.5;-0.41,-0.6;0.58,-0.74,1;0.94,-1.68;1.2,0.04;1.2,1.03;2.19,0.04;2.76,1.59,1|0-2,0-3,2-1,3-1,1-4,1-5,4-5,5-6,6-7,6-8,8-9,8-10,9-11,10-11,8-11|',
  '-1.95,-0.06;-1.05,0.84;-1.05,-0.96;-0.15,-0.06;-1.05,-0.06;0.85,0.04;0.64,-0.94;1.71,-0.46,1;1.59,0.71,1;0.45,0.96|0-1,0-2,1-3,2-3,4-1,4-2,3-5,5-6,5-7,5-8,5-9|',
  '-2.51,0.02;-1.8,-0.69;-1.09,0.02;-1.8,0.73;-0.09,0.74;-0.31,-0.93;0.69,-0.21;-0.2,-0.1,1;1.35,0.76;1.77,-0.67;2.42,0.29;1.56,0.04,1|0-1,1-2,2-3,3-0,2-4,2-5,4-6,5-6,7-4,7-5,6-8,6-9,8-10,9-10,11-8,11-9|',
  '-2.23,0.38;-1.23,0.38;-0.23,0.38;-0.93,1.13;-1.63,1.88,1;-0.93,-0.37;-1.63,-1.12;0.68,0.76;0.15,-0.53;1.8,-0.46,1;2.66,-0.97;3.52,-1.48,1|0-1,1-2,2-3,3-4,2-5,5-6,2-7,2-8,7-9,8-9,2-9,9-10,10-11|',
  '-1.86,0.45;-0.26,0.45,1;-1.06,1;-1.06,-0.1;0.54,1;0.54,-0.1;0.32,-1.08;1.3,-1.3,1;1.52,-0.32|0-2,0-3,2-1,3-1,1-4,1-5,4-5,5-6,6-7,7-8,8-5|',
  '-2.17,0;-1.17,0;-0.17,0;0.83,0;-1.17,1,1;-1.17,-1;0.83,1;0.83,-1;1.7,-0.48,1;1.68,0.52|0-1,1-2,2-3,1-4,1-5,3-6,3-7,3-8,8-9,9-3|',
  '-2.72,0.44;-1.72,0.44;-0.72,0.44;-1.42,1.19,1;-1.42,-0.31,1;-0.02,-0.27;0.25,0.69;1.56,-0.53;0.86,0.14;0.68,-0.94;2.44,-0.12;2.26,-1.2,1|0-1,1-2,2-3,2-4,2-5,5-6,6-2,5-8,5-9,8-7,9-7,7-10,7-11,10-11|',
  '-2.75,1.43;-1.75,1.43;-0.82,1.05;0.1,0.67;-0.82,1.82;0.1,2.2,1;0.99,0.22;-0.34,-0.22;0.8,-1.42,1;1.77,-1.58;0.64,-2.4;2.08,-3.21|0-1,1-2,2-3,1-4,4-5,3-6,3-7,6-8,7-8,3-8,8-9,8-10,9-11,10-11,8-11|',
  '-0.79,1.33;0.08,0.83;0.08,1.83;0.04,-0.17;0.92,0.29;0.65,-0.95;-0.74,-0.78;-0.23,-2.36,1|0-1,1-2,2-0,1-3,3-4,4-1,3-5,3-6,5-7,6-7,3-7|',
  '-2.08,-0.25;-0.48,-0.25,1;-1.28,0.3;-1.28,-0.8;0.32,0.3;0.32,-0.8;0.88,1.11;1.13,-0.27;2.48,0.68,1|0-2,0-3,2-1,3-1,1-4,1-5,4-5,4-6,4-7,6-8,7-8,4-8|',
  '-3.04,-0.3;-2.04,-0.3;-1.04,-0.3;-1.74,0.45;-1.74,-1.05,1;-0.58,0.58;-0.16,-0.76;1.06,0.36,1;2.06,0.34;3.06,0.32,1;2.08,1.34;2.05,-0.66|0-1,1-2,2-3,2-4,2-5,2-6,5-7,6-7,2-7,7-8,8-9,8-10,8-11|',
  '-2.49,1.5;-1.49,1.5;-0.99,0.64;-0.99,2.37,1;0.13,0.85;-0.5,-0.39;0.62,-0.18;1.05,-1.08,1;0.06,-1.21;0.87,-2.06;1.93,-1.55;1.78,-0.39|0-1,1-2,1-3,2-4,2-5,4-6,5-6,6-7,7-8,7-9,7-10,7-11|',
  '-2.65,-0.21;-1.65,-0.21;-0.65,-0.21;-1.35,0.54;-1.35,-0.96,1;0.06,-0.91;0.76,-0.2;0.05,0.5;1.08,0.95;1.95,-0.37;2.27,0.78,1;1.51,0.29,1|0-1,1-2,2-3,2-4,2-5,5-6,6-7,7-2,6-8,6-9,8-10,9-10,11-8,11-9|',
  '-2.26,-0.83;-0.66,-0.83,1;-1.46,-0.28;-1.46,-1.38;0.14,-0.28;0.14,-1.38;1.11,1;0.19,0.69;1.07,0.03;1.15,1.97,1;2.03,1.31|0-2,0-3,2-1,3-1,1-4,1-5,4-5,4-7,4-8,7-6,8-6,6-9,6-10,9-10|',
  '-2.98,0.16;-2.28,0.86;-2.28,-0.54;-0.78,0.16,1;0.11,-0.3;-0.6,-1;0.56,-1.2;1.1,-0.16;0.28,0.68;1.99,0.3;2.83,-0.24,1;2.04,1.3,1|0-1,0-2,1-3,2-3,0-3,3-4,4-5,4-6,4-7,4-8,7-9,9-10,9-11|',
  '-0.64,-1.13;0.36,-1.13;0.05,-2.08,1;1.17,-1.71,1;1.17,-0.54;0.05,-0.17;-0.43,1.35,1;-0.71,0.42;0.33,0.76;-1.2,1.94;-0.15,2.28|0-1,1-2,1-3,1-4,1-5,5-7,5-8,7-6,8-6,6-9,6-10,9-10|',
  '-3.16,-0.52;-2.46,0.18;-2.46,-1.22;-0.96,-0.52;-0.46,0.34;-0.1,-1.01;1.17,0.06,1;1.43,1.3;2.41,-0.2;2.67,1.04;1.92,0.55,1|0-1,0-2,1-3,2-3,0-3,3-4,3-5,4-6,5-6,3-6,6-7,6-8,7-9,8-9,10-7,10-8|',
  '-2.33,0.36;-1.62,-0.35;-0.91,0.36;-1.62,1.07;-0.41,-0.5;0.46,0;-0.05,0.87;1.39,-0.36;2.32,-0.73,1;1.75,0.57;1.02,-1.29,1|0-1,1-2,2-3,3-0,2-4,4-5,5-6,6-2,5-7,7-8,7-9,7-10|',
  '-1.9,0.26;-1.2,0.96;-1.2,-0.44;0.3,0.26,1;1.53,0.57;0.63,-0.96;1.85,-0.65,1|0-1,0-2,1-3,2-3,0-3,3-4,3-5,4-6,5-6|',
  '-2.47,0.87;-1.57,1.5;-1.57,0.25;-0.67,0.87;0.3,1.08;-0.46,-0.09;1.18,-0.33;2.13,-0.61;0.89,-1.27;2.22,-2.26,1|0-1,0-2,1-3,2-3,3-4,3-5,4-6,5-6,3-6,6-7,6-8,7-9,8-9,6-9|',
  '-1.75,0.03;-0.75,0.03;0.25,0.03;-0.45,0.78;-1.15,1.53,1;-0.45,-0.72;-1.15,-1.47;1.2,0.69;1.09,-0.76;2.04,-0.1,1;1.14,-0.04|0-1,1-2,2-3,3-4,2-5,5-6,2-7,2-8,7-9,8-9,10-7,10-8|',
  '-2.38,0.43;-1.48,1.29;-1.48,-0.44;-0.58,0.43;-0.4,-0.56;0.58,-0.37;0.4,0.61;1.54,0.28;1.43,-1.17;2.38,-0.51,1|0-1,0-2,1-3,2-3,3-4,4-5,5-6,6-3,5-7,5-8,7-9,8-9|',
  '-1.58,1.42;-0.72,0.92;-0.72,1.92;0.43,0.73;-0.69,-0.25;0.46,-0.44;-0.13,0.24,1;1.39,-0.76;0.14,-1.37;1.42,-2.42,1|0-1,1-2,2-0,1-3,1-4,3-5,4-5,6-3,6-4,5-7,5-8,7-9,8-9,5-9|',
  '-2.64,-0.35;-1.93,-1.06;-1.23,-0.35;-1.93,0.36;-0.25,-0.15;0.73,0.05;1.34,1.16;1.85,-0.53;2.46,0.57,1;1.6,0.31,1|0-1,1-2,2-3,3-0,2-4,4-5,5-6,5-7,6-8,7-8,9-6,9-7|',
  '-1.34,1.65;-0.47,1.15;-0.47,2.15;-0.91,0.25;-0.19,-0.44;0.69,0.03;0.52,1.01;0.4,-1.25;0.98,-2.06,1;1.21,-0.66;-0.41,-1.84,1|0-1,1-2,2-0,1-3,3-4,4-5,5-6,6-1,4-7,7-8,7-9,7-10|',
  '-1.58,-1.63;-0.58,-1.63;0.15,-2.31,1;0.42,-1.63;0.15,-0.94;-0.63,0;1.03,-0.09;0.25,0.85;0.2,-0.04,1;0.22,1.85;0.58,2.79;-0.2,2.76|0-1,1-2,1-3,1-4,4-5,4-6,5-7,6-7,8-5,8-6,7-9,9-10,9-11|',
  '-1.13,-1.4;-0.13,-1.4,1;-0.13,-2.4;0.87,-1.4;-0.13,-0.4;-0.94,0.53;0.75,0.46;-0.06,1.39;-0.09,0.5,1;0.88,1.75,1;0.1,2.38|0-1,1-2,1-3,1-4,4-5,4-6,5-7,6-7,8-5,8-6,7-9,9-10,10-7|',
  '-1.19,1.53;-0.19,1.53;-0.19,0.53;0.81,1.53,1;-0.19,2.53,1;-0.52,-0.41;0.28,-1.02;1.1,-0.45;0.81,0.51;0.6,-1.96;-0.66,-1.34;-0.69,-2.99,1|0-1,1-2,1-3,1-4,2-5,5-6,6-7,7-8,8-2,6-9,6-10,9-11,10-11,6-11|',
  '-2.54,0.06;-1.54,0.06;-0.54,0.06;0.46,0.06;-1.54,1.06;-1.54,-0.94,1;0.46,1.06;0.46,-0.94;1.47,0.69;1.23,-0.86;2.24,-0.22,1;1.35,-0.08,1|0-1,1-2,2-3,1-4,1-5,3-6,3-7,3-8,3-9,8-10,9-10,11-8,11-9|',
  '-2.55,0.4;-1.55,0.4,1;-0.55,0.4;-1.55,1.4;-1.55,-0.6;0.32,-0.09;0.32,0.91;1.24,-0.49;0.58,-1.24,1;1.75,-1.35;2.21,-0.26;1.33,0.51|0-1,1-2,1-3,1-4,2-5,5-6,6-2,5-7,7-8,7-9,7-10,7-11|',
  '-2.45,0.78;-1.75,1.48;-1.75,0.08;-0.25,0.78,1;0.7,0.49;0.4,-0.47;1.66,0.19;1,1.44;1.3,-0.88;-0.01,-1.37;1.16,-2.53,1|0-1,0-2,1-3,2-3,0-3,3-4,4-5,4-6,4-7,5-8,5-9,8-10,9-10,5-10|',
  '-2.31,-1.27;-1.31,-1.27;-0.81,-2.13,1;-0.81,-0.4;-0.61,0.77;0.38,-0.43;0.58,0.75;-0.11,0.17;0.91,1.68;1.52,0.42;2.56,1.7,1|0-1,1-2,1-3,3-4,3-5,4-6,5-6,7-4,7-5,6-8,6-9,8-10,9-10,6-10|',
  '-1.96,-0.1;-1.26,0.6;-1.26,-0.8;0.24,-0.1,1;0.79,0.72;1.06,-0.65;2.4,0.33|0-1,0-2,1-3,2-3,0-3,3-4,3-5,4-6,5-6,3-6|',
  '-1.99,1.53;-0.99,1.53;-0.41,0.72;0.01,1.53,1;-0.41,2.35;0.04,-0.18;0.59,0.65;0.99,-0.66;-0.01,-1.93;1.59,-2.14;0.59,-3.41,1|0-1,1-2,1-3,1-4,2-5,5-6,6-2,5-7,7-8,8-9,9-10|',
  '-2.62,0.06;-1.72,0.86;-1.72,-0.73;-0.82,0.06;-1.72,0.06;0.12,-0.27;0.85,-0.95,1;1.12,-0.19;1.55,0.91;2.27,-0.46;2.71,0.64,1|0-1,0-2,1-3,2-3,4-1,4-2,3-5,5-6,5-7,7-8,7-9,8-10,9-10|',
  '-2.55,0.74;-0.95,0.74,1;-1.75,1.29;-1.75,0.19;-0.15,1.29;-0.15,0.19;0.81,0.42;0.08,-0.77;1.72,-0.97,1;2.01,-1.92;2.69,-1.2|0-2,0-3,2-1,3-1,1-4,1-5,4-5,5-6,5-7,6-8,7-8,5-8,8-9,9-10,10-8|',
  '-2.71,-0.39;-2.01,0.31;-2.01,-1.09;-0.51,-0.39,1;0.12,0.7;0.6,-1;1.23,0.09;0.36,-0.15,1;2.05,0.67;2.86,1.24|0-1,0-2,1-3,2-3,0-3,3-4,3-5,4-6,5-6,7-4,7-5,6-8,8-9|',
  '-2.87,-0.54;-1.87,-0.54;-1.87,-1.54,1;-0.87,-0.54;-1.87,0.46;-0.34,0.3;-0.03,-1.07;1.28,-0.05;1.94,0.69;2.61,1.44,1;1.2,1.36;2.69,0.03|0-1,1-2,1-3,1-4,3-5,3-6,5-7,6-7,3-7,7-8,8-9,8-10,8-11|',
  '-2.97,1.69;-1.97,1.69;-1.08,1.21;-1.08,2.16,1;-0.01,0.99;-0.93,0.13;0.14,-0.1;0.69,-0.94;1.25,-1.77;1.8,-2.61;1.53,-0.39;2.63,-2.06,1|0-1,1-2,1-3,2-4,2-5,4-6,5-6,6-7,7-8,8-9,7-10,9-11|',
  '-1.68,1.71;-0.68,1.71,1;0.32,1.71;-0.68,2.71;-0.68,0.71;0.03,-0.72,1;0.17,0.24;-0.82,-0.25;0.88,-1.19;-0.11,-1.68;1.38,-2.05;1.89,-2.92,1|0-1,1-2,1-3,1-4,4-6,4-7,6-5,7-5,5-8,5-9,8-9,8-10,10-11|',
  '-2.42,0.14;-1.72,-0.57;-1.01,0.14;-1.72,0.84;-0.01,0.03;0.98,-0.08;1.97,-0.19;0.09,1.02;-0.12,-0.96,1;2.08,0.81;1.87,-1.18,1|0-1,1-2,2-3,3-0,2-4,4-5,5-6,4-7,4-8,6-9,6-10|',
  '-2.42,-0.64;-1.52,0.14;-1.52,-1.43;-0.62,-0.64;-1.52,-0.64;0.17,-0.04;0.97,0.57;-0.04,0.74,1;0.87,-0.45,1;1.82,0.05;2.34,0.91,1;1.48,1.43|0-1,0-2,1-3,2-3,4-1,4-2,3-5,5-6,6-7,6-8,6-9,9-10,10-11,11-6|',
  '-2.98,1.03;-1.98,1.03;-1.07,0.63;-1.07,1.44,1;-0.12,0.9;-0.79,-0.32;0.86,-0.43;2.02,-0.34;1.18,-1.55;2.34,-1.45,1;1.6,-0.94,1|0-1,1-2,1-3,2-4,2-5,4-6,5-6,2-6,6-7,6-8,7-9,8-9,10-7,10-8|',
  '-3.07,-0.89;-2.37,-0.19;-2.37,-1.59;-0.87,-0.89;-0.66,0.08;0.1,-1.09;0.97,0.32,1;1.95,0.55;1.26,1.28;2.9,0.87,1;2.15,1.53|0-1,0-2,1-3,2-3,0-3,3-4,3-5,4-6,5-6,3-6,6-7,7-8,8-6,7-9,9-10,10-7|',
  '-2.68,0.65;-1.78,1.39;-1.78,-0.1;-0.88,0.65;-1.78,0.65;0.07,0.94;-0.58,-0.3;1.07,-0.38,1;2.2,-0.12;1.56,-1.43;2.69,-1.17,1;1.88,-0.77,1|0-1,0-2,1-3,2-3,4-1,4-2,3-5,3-6,5-7,6-7,3-7,7-8,7-9,8-10,9-10,11-8,11-9|',
  '-3.05,0.04;-2.35,0.74;-2.35,-0.66;-0.85,0.04,1;0.74,-0.14,1;0.01,0.5;-0.12,-0.59;1.6,0.31;1.47,-0.78;2.43,-0.23,1;2.49,0.76|0-1,0-2,1-3,2-3,0-3,3-5,3-6,5-4,6-4,4-7,4-8,7-8,7-9,9-10,10-7|',
  '-2.9,-0.34;-1.9,-0.34;-0.9,-0.34,1;-1.6,0.41;-1.6,-1.09;-0.22,0.57;0.15,-0.8;0.84,0.12;1.8,0.39,1;2.76,0.65;1.53,1.35;2.07,-0.58|0-1,1-2,2-3,2-4,2-5,2-6,5-7,6-7,7-8,8-9,8-10,8-11|',
  '-3.47,0.03;-2.47,0.03;-1.47,0.03;-0.86,-0.75;-0.07,-0.14;-0.68,0.65;0.64,0.8;0.98,-0.69;1.69,0.25;0.81,0.06,1;2.23,-0.59,1;2.69,0.3|0-1,1-2,2-3,3-4,4-5,5-2,4-6,4-7,6-8,7-8,9-6,9-7,8-10,10-11,11-8|',
  '-3.52,-0.63;-2.82,0.07;-2.82,-1.33;-1.32,-0.63;-0.37,-0.32;0.58,-0.01;1.53,0.3;-0.68,0.63,1;1.22,1.25,1;2.28,0.95;2.19,-0.44;3.73,0.16,1|0-1,0-2,1-3,2-3,0-3,3-4,4-5,5-6,4-7,6-8,6-9,6-10,9-11,10-11,6-11|',
  '-3.5,-0.63;-2.7,0;-1.9,-1.26;-1.1,0;-0.38,0.68;-0.42,-0.72;1.1,-0.06;2,0.38,1;2.89,0.83;1.55,1.28;2.44,-0.51|0-1,1-2,2-3,3-4,3-5,4-6,5-6,3-6,6-7,7-8,7-9,7-10|',
  '-2.87,0.02;-2.17,0.72;-2.17,-0.68;-0.67,0.02;-0.2,-0.86;0.68,-0.4;0.22,0.49;1.57,0.06;2.46,0.51,1;1.12,0.95,1;2.03,-0.83,1|0-1,0-2,1-3,2-3,0-3,3-4,4-5,5-6,6-3,5-7,7-8,7-9,7-10|',
  '-3.1,-0.71;-2.4,-0.01;-2.4,-1.41;-0.9,-0.71;0.08,-0.88;-0.26,0.06;1,-0.47;1.81,-1.06,1;1.1,0.52;0.84,1.48;2.05,0.78;2.2,2.43,1|0-1,0-2,1-3,2-3,0-3,3-4,4-5,5-3,4-6,6-7,6-8,8-9,8-10,9-11,10-11,8-11|',
  '-2.49,-0.16;-1.78,-0.86;-1.07,-0.16;-1.78,0.55;-0.6,0.71;-0.21,-0.63;1.04,0.46;1.98,0.14;2.17,-0.84,1;2.74,0.79,1|0-1,1-2,2-3,3-0,2-4,2-5,4-6,5-6,2-6,6-7,7-8,7-9|',
  '-3.66,0.48;-2.66,0.48;-1.66,0.48;-0.66,0.48;0.19,0.99;-0.16,-0.37;1.47,-0.06,1;2.46,0.02;1.55,-1.04;3.14,-1.48|0-1,1-2,2-3,3-4,3-5,4-6,5-6,3-6,6-7,6-8,7-9,8-9,6-9|',
  '-2.69,-0.34;-1.69,-0.34;-0.69,-0.34;-1.39,0.41;-1.39,-1.09,1;-0.35,0.59;0.24,-0.67;1.3,0.59,1;1.84,-0.25;2.68,0.29,1;2.15,1.13|0-1,1-2,2-3,2-4,2-5,2-6,5-7,6-7,2-7,7-8,8-9,9-10,10-7|',
  '-2.55,0.15;-1.55,0.15;-0.55,0.15;0.45,0.15,1;-0.25,0.9;-0.25,-0.6;1.52,0.38;1.05,-0.76;2.12,-0.53,1|0-1,1-2,2-3,3-4,3-5,3-6,3-7,6-8,7-8|',
  '-3.42,0.43;-2.42,0.43;-1.42,0.43;-0.42,0.43;-1.12,1.18,1;-1.12,-0.32,1;0.54,0.69;-0.16,-0.53;1.49,-0.67;2.2,0.02;2.17,-1.38;3.69,-0.71,1|0-1,1-2,2-3,3-4,3-5,3-6,3-7,6-8,7-8,3-8,8-9,8-10,9-11,10-11,8-11|',
  '-1.62,2.49;-0.62,2.49;-0.12,1.62;-0.12,3.36,1;0.03,0.63;0.17,-0.35;0.32,-1.34;0.96,-0.54,1;-0.52,-0.76;1.12,-1.93;-0.26,-2.14;0.66,-3.52,1|0-1,1-2,1-3,2-4,4-5,5-6,6-7,6-8,6-9,6-10,9-11,10-11,6-11|',
  '-0.43,1.19;0.57,1.19;0.26,0.24;1.38,0.61;1.38,1.78,1;0.26,2.15,1;0.46,-0.73;-0.71,0.04;-0.95,-1.59,1;-1.61,-2.34;-0.63,-2.54|0-1,1-2,1-3,1-4,1-5,2-6,2-7,6-8,7-8,2-8,8-9,9-10,10-8|',
  '-2.53,0.58;-1.63,1.4;-1.63,-0.24;-0.73,0.58;-1.63,0.58,1;-0.43,-0.37;0.57,-0.37;0.89,0.58;0.08,1.17;1.46,-0.84;2.35,-1.3;3.23,-1.77,1|0-1,0-2,1-3,2-3,4-1,4-2,3-5,5-6,6-7,7-8,8-3,6-9,9-10,10-11|',
  '-0.16,-1.35;0.84,-1.35,1;0.53,-2.3;1.65,-1.94;1.65,-0.76;0.53,-0.4;-0.42,-0.13;0.8,0.55;-0.55,1.52,1;-1.73,1.17;-0.97,2.68;-2.15,2.33,1|0-1,1-2,1-3,1-4,1-5,5-6,5-7,6-8,7-8,5-8,8-9,8-10,9-11,10-11|',
  '-1.5,1.56;-0.64,1.06;-0.64,2.06;0.34,0.89;-0.81,0.09;0.63,-0.74,1;0.13,-1.6;1,-2.1,1;1.49,-1.23|0-1,1-2,2-0,1-3,1-4,3-5,4-5,1-5,5-6,6-7,7-8,8-5|',
  '-2.66,-0.09;-1.66,-0.09;-0.66,-0.09;-1.36,0.66,1;-1.36,-0.84,1;0.1,0.81;0.35,-0.72;1.11,0.19;1.72,-0.61;2.52,-0.01,1;1.91,0.79|0-1,1-2,2-3,2-4,2-5,2-6,5-7,6-7,7-8,8-9,9-10,10-7|',
  '-2.67,-1.21;-1.87,-0.48;-1.07,-1.93;-0.27,-0.48;-0.23,0.51;0.71,-0.52;1.35,1;2.34,1.16,1;1.71,1.94|0-1,1-2,2-3,3-4,3-5,4-6,5-6,3-6,6-7,7-8,8-6|'
];
/* PT_SHAPES 結束 */
const PT_LIB = PT_SHAPES.map(str => {
  const [p, e, a] = str.split('|'),
    o = {
      pts: p.split(';').map(q => {
        const [x, y, b = 0] = q.split(',').map(Number);
        return [x, y, b];
      }),
      e: e.split(',').map(q => q.split('-').map(Number))
    };
  o.arc = o.e.map(() => null);
  if (a) for (const q of a.split(';')) o.arc[+q.split(':')[0]] = q.split(':')[1].split(',').map(Number);
  return o;
});
const PT_R0 = 470;
const PTREE = (() => {
  const N = [],
    E = [],
    I = {},
    deg = Math.PI / 180,
    add = o => ((I[o.id] = o), N.push(o), o),
    link = (a, b) => E.push([a.id, b.id]),
    pol = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
  /* 小點的數值：叢集自己的主題（照 PoE2：一個叢集的小點同一條詞）；每 10 點有 1 點是基礎能力點，
     過路點全部是基礎能力點（th 0「基礎」，切斷主題，不能沿同一主題一路點下去） */
  const smallOf = (ti, k) =>
    k % 10 === 9 || !ti
      ? { s: PT_BASE[Math.floor(k / (ti ? 10 : 1)) % PT_BASE.length], th: 0 }
      : { s: PT_THEME[ti].sm[k % PT_THEME[ti].sm.length], th: ti };
  const near = (x, y, d) => N.some(o => Math.hypot(o.x - x, o.y - y) < d);
  const SUFFIX = ['之心', '之道', '極意', '奧義', '秘訣', '真髓', '之魂', '心法', '之印', '之誓', '領悟', '妙法'],
    CONDS = [
      { lowHp: 15 },
      { fullHp: 12 },
      { esUp: 12 },
      { afterRoll: 12 },
      { bossP: 12 },
      { closeP: 12 },
      { farP: 12 },
      { killHeal: 4 },
      { critInc: 10 },
      { as: 3 },
      { hpP: 2 },
      { resA: 2 },
      { ms: 2 },
      { aoe: 5 },
      { cdr: 3 },
      { spirit: 4 },
      { esF: 10 },
      { onsKill: 8 },
      { ailMag: 8 },
      { bleedCh: 5 },
      { poisonCh: 5 }
    ],
    COST = [{ hpP: -3 }, { ms: -4 }, { resA: -6 }, { armorP: -15 }, { mpP: -10 }],
    used = new Set();
  let ntK = 0;
  /* 第一個大點用手寫的（名字有特色），之後的照「主屬性 × 深度＋條件」組出來 */
  const notableOf = (ti, depth) => {
    const T = PT_THEME[ti],
      k = ntK++;
    if (k % 5 === 0) {
      const [n, st] = T.nt[(k / 5) % T.nt.length];
      if (!used.has(n)) return used.add(n), { n, s: st };
    }
    const [mk] = Object.keys(T.sm[0]),
      base = T.sm[0][mk] * 2.5 * depth,
      power = k % 4 === 3,
      st = { [mk]: Math.round(base * (power ? 1.6 : 1)) };
    const extra = power ? COST[k % COST.length] : CONDS[(k * 7 + ti * 3) % CONDS.length];
    for (const ck in extra) st[ck] = (st[ck] || 0) + Math.round(extra[ck] * (power ? 1 : depth));
    const words = [T.n, ...T.nt.map(x => x[0])];
    let n = '';
    for (let t = 0; !n || used.has(n); t++)
      n =
        words[(k + t) % words.length] +
        SUFFIX[(k * 5 + t * 3 + ti) % SUFFIX.length] +
        (t >= 60 ? ['', ' II', ' III', ' IV', ' V', ' VI'][Math.min(5, Math.floor(t / 60))] : '');
    used.add(n);
    return { n, s: st, power };
  };
  /* 照 PoE2：沒有大格網。拼塊表裡每塊都不一樣、每塊只用一次（不分區，整棵樹混在一起），轉向、翻面隨機；
     刻意不對稱：疏密圖（擠的地方拼塊挨在一起、稀的地方空出一片只拉長線）、大小圖（有的區域拼塊大、有的小）、
     外框隨角度凹凸（有半島、有缺口）；相鄰的拼塊直接相連（過路點很少，遠一點的才補） */
  /* 六條路的方向：f 是 0～6 的小數，整數＝起點正中間（0 鬥士在正上方，順時針） */
  const hsh = i => ((Math.imul(i + 7, 2654435761) >>> 0) % 1000) / 1000,
    rgF = (x, y) => (((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360) / 60,
    /* 平滑的不規則圖：幾個不同方向、不同波長的波疊起來，0～1 */
    WAVE = {},
    field = (sd, x, y) => {
      const W = (WAVE[sd] =
        WAVE[sd] ||
        [0, 1, 2, 3].map(k => {
          const a = hsh(sd + k * 11) * Math.PI * 2,
            w = 900 + hsh(sd + k * 17) * 1900;
          return [(Math.cos(a) / w) * Math.PI * 2, (Math.sin(a) / w) * Math.PI * 2, hsh(sd + k * 23) * 9];
        }));
      let v = 0;
      for (const [cx, cy, ph] of W) v += Math.sin(x * cx + y * cy + ph);
      return Math.min(1, Math.max(0, 0.5 + v / 4.4));
    },
    edge = a => 0.7 + 0.6 * field(91, Math.cos(a) * 3000, Math.sin(a) * 3000);
  const par = {},
    find = a => (par[a] === a || par[a] === undefined ? ((par[a] = a), a) : (par[a] = find(par[a]))),
    uni = (a, b) => (par[find(a)] = find(b));
  /* 起點：六條路（免費），不連成環 */
  for (let g = 0; g < 6; g++) {
    const [x, y] = pol((g * 60 - 90) * deg, PT_R0),
      R = PT_ROADS[g],
      th = PT_TH[R.th];
    add({ id: 'g' + g, x, y, n: R.n, d: '往外偏重：' + R.d, ic: PT_THEME[th].ic, s: {}, big: 1, gate: 1, th });
  }
  /* 拼塊：固定順序打散；ext＝單位大小下的半徑 */
  const q = PT_LIB.map((p, k) => ({ p, ext: Math.max(...p.pts.map(t => Math.hypot(t[0], t[1]))), k })).sort(
    (a, b) => hsh(a.k * 13 + 1) - hsh(b.k * 13 + 1)
  );
  const cl = [],
    grid = [],
    CELL = 400,
    ROUT = 2300;
  /* 外框是圓（邊緣稍微凹凸），圓裡面全部填滿：每個位置放「放得下的最大一塊」，掃好幾輪（每輪錯開角度），
     大塊先佔位、小塊補縫；拼塊表用不完的就不放（每塊最多用一次） */
  for (let pass = 0; pass < 4 && q.length; pass++)
    for (let r = PT_R0 + 110 + pass * 9; q.length && r < ROUT; r += 22) {
      const steps = Math.ceil((Math.PI * 2 * r) / 22),
        off = hsh(r + pass * 7919) * Math.PI * 2;
      for (let k = 0; k < steps && q.length; k++) {
        const a = off + (k / steps) * Math.PI * 2,
          x = Math.cos(a) * r,
          y = Math.sin(a) * r,
          rim = ROUT * edge(a);
        if (r > rim) continue;
        const d = field(7, x, y),
          gap = 22 + (1 - d) * 48,
          sc = 44 + field(53, x, y) * 14;
        let room = Math.min(r - PT_R0 - 60, rim - r + 40, 300);
        /* 只看附近格子裡的拼塊 */
        const gi = Math.floor(x / CELL),
          gj = Math.floor(y / CELL);
        for (let di = -2; di <= 2 && room > 0; di++)
          for (let dj = -2; dj <= 2 && room > 0; dj++)
            for (const c of grid[(gi + di + 64) * 128 + gj + dj + 64] || []) {
              const dx = c.x - x,
                dy = c.y - y;
              room = Math.min(room, Math.sqrt(dx * dx + dy * dy) - c.R - Math.max(c.gap, gap));
            }
        if (room < 50) continue;
        let pick = -1;
        for (let t = 0; t < q.length; t++) if (q[t].ext * sc <= room && (pick < 0 || q[t].ext > q[pick].ext)) pick = t;
        if (pick < 0) continue;
        const U = q.splice(pick, 1)[0],
          gk = (gi + 64) * 128 + gj + 64;
        (grid[gk] = grid[gk] || []).push({ x, y, R: U.ext * sc, gap });
        cl.push({
          x,
          y,
          R: U.ext * sc,
          U: { p: U.p, sc },
          gap,
          mir: hsh(cl.length * 17 + 3) < 0.5 ? -1 : 1,
          rot: hsh(cl.length * 31 + 5) * Math.PI * 2,
          id: 'k' + cl.length
        });
      }
    }
  const RMAX = Math.max(...cl.map(c => Math.hypot(c.x, c.y) + c.R));
  /* 叢集的主題（照 PoE2「區域權重抽樣＋距離排斥」）：照方向混合兩條路的權重，內圈多防禦、武器專精只在外圈；
     附近（中間隔不到約 3 步）已經有的主題不抽，同主題的叢集不會黏在一起 */
  const REP = 450,
    byR = [...cl].sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
  for (const [ci, c] of byR.entries()) {
    const f = rgF(c.x, c.y),
      r0 = Math.floor(f) % 6,
      t = f - Math.floor(f),
      dd = (Math.hypot(c.x, c.y) - PT_R0) / (RMAX - PT_R0),
      w = PT_THEME.map((T, ti) =>
        T.base
          ? 0
          : (T.rg[r0] * (1 - t) + T.rg[(r0 + 1) % 6] * t) *
            (T.wp ? (dd < 0.45 ? 0 : dd < 0.65 ? 0.6 : 3) : T.inner && dd < 0.35 ? 2.5 : 1)
      );
    /* 這個方向的主題全部被排斥時，排斥距離減半再找 */
    let ws = w;
    for (const rep of [REP, REP / 2, REP / 4]) {
      const ban = new Set(byR.filter(b => b.th && Math.hypot(b.x - c.x, b.y - c.y) - b.R - c.R < rep).map(b => b.th)),
        v = w.map((x, ti) => (ban.has(ti) ? 0 : x));
      if (v.some(x => x > 0)) {
        ws = v;
        break;
      }
    }
    let roll = hsh(ci * 131 + 17) * ws.reduce((a, b) => a + b, 0);
    c.th = ws.findIndex(v => (roll -= v) < 0);
    if (c.th < 0) c.th = ws.findLastIndex(v => v > 0);
  }
  /* 保底：每種武器至少 2 個專精叢集，不夠的從它那條路的外圈挑一個（那個主題要還有 4 個以上）換掉 */
  const cnt = t => cl.filter(c => c.th === t).length;
  for (const [ti, T] of PT_THEME.entries())
    for (let need = T.wp ? 2 - cnt(ti) : 0; need > 0; need--) {
      const c = byR
        .filter(
          c =>
            Math.round(rgF(c.x, c.y)) % 6 === T.rg.indexOf(3) &&
            !PT_THEME[c.th].wp &&
            cnt(c.th) >= 4 &&
            !cl.some(b => b.th === ti && Math.hypot(b.x - c.x, b.y - c.y) - b.R - c.R < REP)
        )
        .pop();
      if (c) c.th = ti;
    }
  /* 拼塊的點 */
  let L;
  const ARC = {},
    icK = {},
    smIc = o => PT_STAT_IC[Object.keys(o.s)[0]] || PT_THEME[o.th].ic;
  for (const c of cl) {
    const dep = 1 + (Math.hypot(c.x, c.y) / RMAX) * 0.8,
      sc = c.U.sc,
      at = ([u, v]) => [
        c.x + (Math.cos(c.rot) * u - Math.sin(c.rot) * v * c.mir) * sc,
        c.y + (Math.sin(c.rot) * u + Math.cos(c.rot) * v * c.mir) * sc
      ];
    /* 拼塊裡的十字路口（連 3 條以上）當過路點：叢集被切成幾小段，跟 PoE2 一樣大點前面是幹道 */
    const dg = c.U.p.pts.map(() => 0);
    for (const [p, q] of c.U.p.e) dg[p]++, dg[q]++;
    c.nodes = c.U.p.pts.map(([u, v, big], k) => {
      const [x, y] = at([u, v]);
      if (big) {
        const nt = notableOf(c.th, dep);
        return add({
          id: `${c.id}_${k}`,
          x,
          y,
          n: nt.n,
          ic:
            ((L = PT_ICONS[PT_THEME[c.th].n] || [PT_THEME[c.th].ic]), L[(icK[c.th] = (icK[c.th] || 0) + 1) % L.length]),
          s: nt.s,
          big: 1,
          power: nt.power,
          th: c.th
        });
      }
      const o = smallOf(dg[k] >= 4 ? 0 : c.th, k + N.length);
      return add({ id: `${c.id}_${k}`, x, y, n: PT_THEME[o.th].n, s: o.s, big: 0, th: o.th, ic: smIc(o) });
    });
    c.U.p.e.forEach(([p, q], k) => {
      const A = c.nodes[p],
        B = c.nodes[q];
      link(A, B);
      uni(A.id, B.id);
      const a = c.U.p.arc && c.U.p.arc[k];
      if (a) ARC[A.id + '|' + B.id] = ARC[B.id + '|' + A.id] = [...at(a), a[2] * sc];
    });
  }
  /* 拼塊之間的連線：相鄰（中間沒有別塊擋著）的才連，先連成一棵樹保證走得到，其他的留一半當岔路 */
  const segD = (P, A, B) => {
    const dx = B.x - A.x,
      dy = B.y - A.y,
      f = Math.max(0, Math.min(1, ((P.x - A.x) * dx + (P.y - A.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(P.x - A.x - dx * f, P.y - A.y - dy * f);
  };
  const gates = [0, 1, 2, 3, 4, 5].map(g => ({ x: I['g' + g].x, y: I['g' + g].y, R: 0, nodes: [I['g' + g]], gate: 1 })),
    all = [...gates, ...cl],
    dc = (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    cand = [];
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i],
        b = all[j],
        d = dc(a, b);
      if ((a.gate && b.gate) || d > a.R + b.R + 460) continue;
      if (all.some((k, kk) => kk !== i && kk !== j && Math.max(dc(a, k), dc(k, b)) < d)) continue;
      let best = null;
      for (const A of a.nodes)
        for (const B of b.nodes) {
          const L = Math.hypot(A.x - B.x, A.y - B.y),
            cost = L + (A.big && !A.gate ? 60 : 0) + (B.big && !B.gate ? 60 : 0);
          if (!best || cost < best[3]) best = [A, B, L, cost];
        }
      if (cl.some(k => k !== a && k !== b && segD(k, best[0], best[1]) < k.R * 0.8)) continue;
      cand.push([...best, i, j]);
    }
  cand.sort((p, q) => p[3] - q[3]);
  const gp = {},
    gf = a => (gp[a] === undefined || gp[a] === a ? ((gp[a] = a), a) : (gp[a] = gf(gp[a]))),
    gDeg = {},
    use = [];
  for (const c of cand) {
    const [, , , , i, j] = c;
    if (gf(i) !== gf(j))
      (gp[gf(i)] = gf(j)), use.push(c), (gDeg[i] = (gDeg[i] || 0) + 1), (gDeg[j] = (gDeg[j] || 0) + 1);
    else if (hsh(i * 97 + j) < 0.5 || (i < 6 && (gDeg[i] || 0) < 2)) use.push(c), (gDeg[i] = (gDeg[i] || 0) + 1);
  }
  /* 叢集之間至少一個過路點（照 PoE2，叢集不直接相連），連線長的每 190 再補一個 */
  for (const [A, B, L] of use) {
    const n = Math.max(1, Math.floor(L / 190));
    let prev = A;
    for (let k = 1; k <= n; k++) {
      const f = k / (n + 1),
        x = A.x + (B.x - A.x) * f,
        y = A.y + (B.y - A.y) * f;
      if (near(x, y, 36)) continue;
      const o = smallOf(0, k + N.length),
        nd = add({ id: 'x' + N.length, x, y, n: PT_THEME[o.th].n, s: o.s, big: 0, th: o.th, ic: smIc(o) });
      link(prev, nd);
      uni(prev.id, nd.id);
      prev = nd;
    }
    link(prev, B);
    uni(prev.id, B.id);
  }
  /* 被擋住沒連上的拼塊：接到最近的已連通點 */
  for (const c of cl) {
    if (find(c.nodes[0].id) === find('g0')) continue;
    let best = null;
    for (const A of c.nodes)
      for (const B of N)
        if (!B.gate && find(B.id) === find('g0')) {
          const L = Math.hypot(A.x - B.x, A.y - B.y);
          if (!best || L < best[2]) best = [A, B, L];
        }
    link(best[0], best[1]);
    uni(best[0].id, best[1].id);
  }
  /* 基石：每條路 2 個，接在那條路最外面的叢集的最外一點，往外拉出去、只連 1 條線 */
  for (const [i, K] of PT_KEYS.entries()) {
    const out = c => Math.hypot(c.x, c.y) + c.R;
    for (const c of cl.filter(c => !c.ks && Math.round(rgF(c.x, c.y)) % 6 === K.rg).sort((a, b) => out(b) - out(a))) {
      const A = c.nodes.reduce((p, q) => (Math.hypot(q.x, q.y) > Math.hypot(p.x, p.y) ? q : p)),
        r = Math.hypot(A.x, A.y),
        x = (A.x / r) * (r + 120),
        y = (A.y / r) * (r + 120);
      if (near(x, y, 90)) continue;
      c.ks = 1;
      link(A, add({ id: 'ks' + i, x, y, n: K.n, ic: K.ic, s: K.s, big: 2, th: c.th }));
      break;
    }
  }
  const ADJ = {};
  for (const [a, b] of E) (ADJ[a] = ADJ[a] || []).push(b), (ADJ[b] = ADJ[b] || []).push(a);
  return { N, E, I, ADJ, ARC };
})();
const PT_START = ['g0', 'g1', 'g2', 'g3', 'g4', 'g5'];
/* 天賦點：每級 1 點、每到 10 的倍數再 +2（到 100 級共 119）；100 級後每 10 級 1 點 */
const ptPoints = lv =>
  Math.min(lv, 100) - 1 + 2 * Math.floor(Math.min(lv, 100) / 10) + Math.max(0, Math.floor((lv - 100) / 10));

const ROLL = { t: 0.32, dist: 175, iframe: 0.26, cd: 0.55, perfect: 0.16, slow: 0.55, slowScale: 0.3 };
/* 藥水：紅水（1）回生命、藍水（2，0.2.13）回魔力，瓶數分開算 */
const FLASK = { n: 3, heal: 0.5, mp: 0.5, t: 1.4, perKill: 0.12 };

/* ---------- 地圖：階級 1～16，打倒王開放下一階；費用與地圖卡在 maps.js ---------- */
const TMAX = 16;
/* 怪物等級：生命、傷害跟著階級長 */
const tierMul = t => ({ hp: Math.pow(1.32, t - 1), dmg: Math.pow(1.2, t - 1) });
const tierIlvl = t => t;

/* ---------- 抗性 ---------- */
const RESK = ['fire', 'cold', 'light', 'chaos'];
/* 武器種類（0.2.6，照 PoE2：武器決定技能組）：矛的近戰距離 +25%、棍打中回 1 魔力；雙手武器不能拿副手（箭袋只有弓能用） */
const WTN = {
  sword: '劍',
  axe: '斧',
  mace: '錘',
  qstaff: '長棍',
  spear: '矛',
  bow: '弓',
  xbow: '弩',
  dagger: '匕首',
  claw: '爪',
  flail: '連枷',
  staff: '法杖',
  wand: '魔杖',
  sceptre: '權杖',
  traptool: '陷阱器',
  talisman: '魔符'
};
/* 武器專精：持某武器時傷害（0.2.17，15 種武器都有） */
for (const k in WTN) STATN['w_' + k] = [`持${WTN[k]}時傷害`, '%'];
/* 一律雙手的類別（劍、斧、錘的雙手是看底材的 two，0.2.12：單手與雙手是同一類）、可以雙持（只限單手底材）、法系（不能攻擊，給法術加成） */
const WT2 = new Set(['qstaff', 'bow', 'xbow', 'staff', 'traptool', 'talisman']);
const DUAL = new Set(['sword', 'axe', 'dagger', 'claw']);
const SPELLW = new Set(['staff', 'wand', 'sceptre', 'traptool']);
/* 底材自帶的數值（隱性詞）裡，詞綴表沒有的名字 */
const IMPN = {
  bleedCh: '擊中時 {}% 機率造成流血',
  impaleCh: '擊中時 {}% 機率穿刺',
  unitP: '陷阱、地雷傷害 +{}%',
  minionP: '召喚物傷害 +{}%',
  elemP: '元素技能傷害 +{}%',
  occP: '秘術技能傷害 +{}%',
  priP: '原始技能傷害 +{}%',
  block: '格擋率 +{}%',
  projP: '投射物傷害 +{}%',
  spellP: '法術傷害 +{}%',
  spellLv: '法術技能等級 +{}',
  castP: '施法速度 +{}%',
  regen: '每秒回復 {} 生命',
  life: '最大生命 +{}'
};
const ELN = { phys: '物理', fire: '火焰', cold: '冰冷', light: '閃電', chaos: '混沌' };
const ELC = { phys: '#fff3e0', fire: '#ff8a4c', cold: '#8fd6ff', light: '#ffe066', chaos: '#c38bff' };
const RES_CAP = 75;

/* ---------- 裝備 ---------- */
/* 裝備欄：k 欄位、t 能放的種類、n 名稱 */
const EQS = [
  { k: 'weapon', t: 'weapon', n: '武器' },
  { k: 'off', t: 'shield', n: '副手' },
  { k: 'helm', t: 'helm', n: '頭盔' },
  { k: 'chest', t: 'chest', n: '胸甲' },
  { k: 'gloves', t: 'gloves', n: '手套' },
  { k: 'boots', t: 'boots', n: '鞋子' },
  { k: 'belt', t: 'belt', n: '腰帶' },
  { k: 'amulet', t: 'amulet', n: '護身符' },
  { k: 'ring1', t: 'ring', n: '戒指' },
  { k: 'ring2', t: 'ring', n: '戒指' }
];
/* 這一欄能不能放這種東西：副手欄放盾、法器、箭袋，或武器（權杖、雙持）；細的規則在 items.js 的 offOK */
const eqTakes = (e, k) => e.t === k || (e.k === 'off' && (k === 'quiver' || k === 'focus' || k === 'weapon'));
/* 種類：大小（格）、圖示前綴、可以出現的詞綴 */
const KINDS = {
  weapon: {
    n: '武器',
    sz: [1, 3],
    aff: ['dmgP', 'flat', 'fire', 'cold', 'light', 'chaos', 'as', 'crit', 'critX', 'loh', 'spellP']
  },
  focus: {
    n: '法器',
    sz: [2, 2],
    aff: ['life', 'es', 'mp', 'spellP', 'critInc', 'resF', 'resC', 'resL', 'resX', 'spirit']
  },
  shield: { n: '盾', sz: [2, 2], aff: ['life', 'armor', 'ev', 'block', 'resF', 'resC', 'resL', 'resX', 'resA', 'es'] },
  helm: {
    n: '頭盔',
    sz: [2, 2],
    aff: ['life', 'armor', 'ev', 'mp', 'critInc', 'aoe', 'resF', 'resC', 'resL', 'resX', 'es', 'spirit']
  },
  chest: {
    n: '胸甲',
    sz: [2, 3],
    aff: ['life', 'armor', 'ev', 'regen', 'resF', 'resC', 'resL', 'resX', 'es', 'spirit']
  },
  gloves: {
    n: '手套',
    sz: [2, 2],
    aff: ['life', 'armor', 'ev', 'flat', 'fire', 'cold', 'light', 'as', 'loh', 'resF', 'resC', 'resL', 'es']
  },
  boots: { n: '鞋子', sz: [2, 2], aff: ['life', 'armor', 'ev', 'ms', 'resF', 'resC', 'resL', 'resX', 'es'] },
  belt: { n: '腰帶', sz: [2, 1], aff: ['life', 'armor', 'mp', 'regen', 'flask', 'resF', 'resC', 'resL', 'resX'] },
  ring: {
    n: '戒指',
    sz: [1, 1],
    aff: [
      'life',
      'mp',
      'flat',
      'fire',
      'cold',
      'light',
      'as',
      'critInc',
      'regen',
      'resF',
      'resC',
      'resL',
      'resX',
      'resA',
      'es'
    ]
  },
  quiver: { n: '箭袋', sz: [2, 3], aff: ['life', 'flat', 'fire', 'cold', 'light', 'as', 'critInc', 'critX', 'resA'] },
  amulet: {
    n: '護身符',
    sz: [1, 1],
    aff: ['life', 'mp', 'physP', 'critInc', 'critX', 'aoe', 'regen', 'resA', 'es', 'spirit', 'spellP']
  }
};
/* 底材：lv 從幾階開始掉、ic 圖示、b 固定數值（武器：物理傷害、攻速；防具：護甲；飾品：固定詞綴） */
/* ---------- 武器（0.2.9，照 PoE2 的 18 種類別，docs/開發參考.md 0.1 節）----------
   每類 6 個底材（階級 1、3、6、9、12、15 開始掉）；傷害照階級成長，類別之間的差別靠攻速、暴擊、隱性詞與技能。
   fam 武器類別（0.2.12：單手劍與雙手劍都是「劍」，技能共用；id 照舊）、two 雙手底材；m 傷害倍率（單手近戰＝1）、as 攻速、crit 加在基礎 5% 上的暴擊、imp 隱性詞（每階 ×1、×1.5、×2…）、ic 借用的圖示 */
const WCLS = {
  sword1: {
    fam: 'sword',
    m: 1,
    as: 1.55,
    crit: 1,
    imp: {},
    ic: [0, 1, 17, 19, 20, 1],
    n: ['短劍', '闊劍', '彎刀', '長劍', '細劍', '符文劍']
  },
  sword2: {
    fam: 'sword',
    two: 1,
    m: 1.6,
    as: 1.35,
    crit: 1,
    imp: {},
    ic: [5, 18, 16, 5, 18, 5],
    n: ['雙手劍', '太刀', '闊刃大劍', '斬首劍', '野太刀', '王者大劍']
  },
  axe1: {
    fam: 'axe',
    m: 1.05,
    as: 1.45,
    crit: 0,
    imp: { bleedCh: 4 },
    ic: [2, 21, 2, 21, 2, 21],
    n: ['手斧', '戰斧', '鉞', '劈斧', '雙刃斧', '屠夫斧']
  },
  axe2: {
    fam: 'axe',
    two: 1,
    m: 1.7,
    as: 1.2,
    crit: 0,
    imp: { bleedCh: 6 },
    ic: [6, 21, 6, 21, 6, 21],
    n: ['伐木斧', '巨斧', '開山斧', '劊子手斧', '月牙斧', '泰坦斧']
  },
  mace1: {
    fam: 'mace',
    m: 1.05,
    as: 1.45,
    crit: 0,
    imp: { critX: 8 },
    ic: [8, 23, 8, 23, 8, 23],
    n: ['木棒', '釘頭錘', '戰鎚', '晨星', '狼牙棒', '雷神鎚']
  },
  mace2: {
    fam: 'mace',
    two: 1,
    m: 1.75,
    as: 1.15,
    crit: 0,
    imp: { aoe: 6 },
    ic: [7, 7, 7, 7, 7, 7],
    n: ['大槌', '巨鎚', '大地之鎚', '破城鎚', '隕鐵鎚', '天罰鎚']
  },
  qstaff: {
    m: 1.35,
    as: 1.4,
    crit: 5,
    imp: { block: 6 },
    ic: [4, 31, 4, 31, 4, 31],
    n: ['長棍', '鐵棍', '齊眉棍', '降魔杖', '金剛棍', '如意棍']
  },
  spear: {
    m: 1,
    as: 1.6,
    crit: 1,
    imp: { impaleCh: 8 },
    ic: [9, 10, 29, 30, 9, 29],
    n: ['短矛', '長槍', '三叉戟', '偃月矛', '龍膽槍', '方天戟']
  },
  bow: {
    m: 1.25,
    as: 1.25,
    crit: 1,
    imp: { projP: 6 },
    ic: [3, 25, 11, 24, 3, 24],
    n: ['短弓', '竹弓', '長弓', '複合弓', '和弓', '重藤弓']
  },
  xbow: {
    m: 1.4,
    as: 1.5,
    crit: 0,
    imp: { projP: 8 },
    ic: [12, 12, 26, 12, 26, 26],
    n: ['手弩', '輕弩', '連弩', '重弩', '攻城弩', '神機弩']
  },
  dagger: {
    m: 0.85,
    as: 1.6,
    crit: 5,
    imp: { critX: 10 },
    ic: [13, 28, 13, 28, 13, 28],
    n: ['短刀', '匕首', '蛇牙匕首', '苦無', '儀式匕首', '刺客短刀']
  },
  claw: {
    m: 0.8,
    as: 1.65,
    crit: 1,
    imp: { loh: 2 },
    ic: [27, 14, 27, 14, 27, 14],
    n: ['拳刃', '爪', '虎爪', '鷹爪', '鬼爪', '龍爪']
  },
  flail: {
    m: 1.1,
    as: 1.45,
    crit: 4,
    imp: {},
    ic: [22, 22, 22, 22, 22, 22],
    n: ['鏈錘', '流星錘', '鐵蒺藜', '雙節錘', '晨星連枷', '天雷連枷']
  },
  staff: {
    m: 0.35,
    as: 1.2,
    crit: 0,
    imp: { elemP: 15, spellLv: 0.5 },
    ic: [4, 31, 4, 31, 4, 31],
    n: ['木杖', '骨杖', '符杖', '龍骨杖', '水晶法杖', '雷霆杖']
  },
  wand: {
    m: 0.3,
    as: 1.3,
    crit: 0,
    imp: { occP: 8, castP: 5 },
    ic: [31, 31, 31, 31, 31, 31],
    n: ['短杖', '骨魔杖', '雷擊木', '符咒杖', '聖杖', '星辰杖']
  },
  sceptre: {
    m: 0.3,
    as: 1.3,
    crit: 0,
    imp: { spirit: 15 },
    ic: [15, 15, 15, 15, 15, 15],
    n: ['銅權杖', '儀式權杖', '祭司權杖', '黃金權杖', '魂權杖', '王權']
  },
  traptool: {
    m: 0.3,
    as: 1.2,
    crit: 0,
    imp: { unitP: 10 },
    ic: ['sup_sp_trap', 'sup_sp_mine', 'sup_sp_trap', 'sup_sp_mine', 'sup_sp_trap', 'sup_sp_mine'],
    n: ['機關匣', '捕獸器', '火藥匣', '符咒匣', '千機匣', '天工匣']
  },
  talisman: {
    m: 1.45,
    as: 1.3,
    crit: 1,
    /* 0.2.13：每一階的隱性詞不一樣（imps 不乘階級倍率） */
    imps: [{ block: 6 }, { priP: 12 }, { bleedCh: 15 }, { life: 40 }, { regen: 8 }, { priP: 20 }],
    ic: ['asc_s_paw', 'asc_s_paw', 'asc_s_paw', 'asc_s_paw', 'asc_s_paw', 'asc_s_paw'],
    n: ['木魔符', '骨魔符', '獸牙魔符', '月石魔符', '古樹魔符', '龍魂魔符']
  }
};
const WLV = [1, 3, 6, 9, 12, 15];
/* 法系武器（法杖、魔杖、權杖、陷阱器）的詞綴池：法術方向，不出攻擊詞 */
const SPELL_AFF = ['spellP', 'critInc', 'critX', 'mp', 'es', 'life', 'spirit', 'aoe'];
const WEAPON_BASES = Object.entries(WCLS).flatMap(([wt, C]) =>
  WLV.map((lv, i) => {
    /* 傷害：單手每階 ×1.12；階級 1 平均約 9 */
    const avg = 9 * Math.pow(1.12, lv - 1) * C.m,
      b = { dmg: [Math.max(1, Math.round(avg * 0.6)), Math.round(avg * 1.4)], as: C.as };
    if (C.crit) b.crit = C.crit;
    const I = C.imps ? C.imps[i] : C.imp;
    for (const k in I) {
      const v = I[k] * (C.imps ? 1 : 1 + i * 0.5);
      b[k] = k === 'spellLv' ? Math.floor(v) : Math.round(v);
      if (!b[k]) delete b[k];
    }
    const ic = C.ic[i];
    return {
      id: `w_${wt}_${i}`,
      k: 'weapon',
      n: C.n[i],
      lv,
      ic: typeof ic === 'number' ? 'gear_weapon_' + ic : ic,
      wt: C.fam || wt,
      ...(C.two || WT2.has(wt) ? { two: 1 } : {}),
      ...(SPELLW.has(C.fam || wt) ? { aff: SPELL_AFF } : {}),
      b
    };
  })
);
const BASES = [
  /* 刀（單手）：暴擊率 */
  ...WEAPON_BASES,
  /* 盾只有一種（0.2.9：不分盾與輕盾）；法器是單手法系武器的副手 */
  { id: 's_wood', k: 'shield', n: '木盾', lv: 1, ic: 'gear_offhand_2', b: { armor: 12, block: 10 } },
  { id: 's_round', k: 'shield', n: '圓盾', lv: 4, ic: 'gear_offhand_8', b: { armor: 28, ev: 20, block: 12 } },
  { id: 's_iron', k: 'shield', n: '鳶盾', lv: 7, ic: 'gear_offhand_9', b: { armor: 50, block: 14 } },
  { id: 's_bone', k: 'shield', n: '骨盾', lv: 10, ic: 'gear_offhand_10', b: { armor: 45, es: 30, block: 15 } },
  { id: 's_tower', k: 'shield', n: '塔盾', lv: 13, ic: 'gear_offhand_3', b: { armor: 110, block: 18 } },
  { id: 'f_orb', k: 'focus', n: '水晶球', lv: 1, ic: 'gear_offhand_11', b: { es: 20 } },
  { id: 'f_rune', k: 'focus', n: '符文法珠', lv: 5, ic: 'gear_offhand_4', b: { es: 45, spellP: 6 } },
  { id: 'f_moon', k: 'focus', n: '月光法器', lv: 9, ic: 'gear_offhand_5', b: { es: 75, spellP: 10 } },
  { id: 'f_mirror', k: 'focus', n: '八卦鏡', lv: 13, ic: 'gear_offhand_12', b: { es: 110, spellP: 14 } },
  { id: 'q_bamboo', k: 'quiver', n: '竹箭袋', lv: 1, ic: 'ail_n_arrow', b: { projP: 8 } },
  { id: 'q_feather', k: 'quiver', n: '羽箭袋', lv: 6, ic: 'ail_n_arrow', b: { projP: 12, crit: 2 } },
  { id: 'q_oni', k: 'quiver', n: '鬼箭袋', lv: 12, ic: 'ail_n_arrow', b: { projP: 16, critX: 15 } },
  { id: 'h_cloth', k: 'helm', n: '頭巾', lv: 1, ic: 'gear_helm_5', b: { armor: 6 } },
  { id: 'h_iron', k: 'helm', n: '鐵盔', lv: 6, ic: 'gear_helm_1', b: { armor: 22 } },
  { id: 'h_circlet', k: 'helm', n: '頭冠', lv: 2, ic: 'gear_helm_7', b: { es: 20 } },
  { id: 'h_mitre', k: 'helm', n: '法冠', lv: 10, ic: 'gear_helm_10', b: { es: 60 } },
  { id: 'h_oni', k: 'helm', n: '鬼面盔', lv: 12, ic: 'gear_helm_9', b: { armor: 55 } },
  /* 閃避系、混合（0.2.6） */
  { id: 'h_kasa', k: 'helm', n: '斗笠', lv: 1, ic: 'gear_helm_0', b: { ev: 8 } },
  { id: 'h_hood', k: 'helm', n: '忍頭巾', lv: 6, ic: 'gear_helm_2', b: { ev: 26 } },
  { id: 'h_tengu', k: 'helm', n: '天狗面', lv: 12, ic: 'gear_helm_3', b: { ev: 60 } },
  { id: 'h_hachi', k: 'helm', n: '鉢金', lv: 8, ic: 'gear_helm_6', b: { armor: 18, ev: 18 } },
  { id: 'h_eboshi', k: 'helm', n: '烏帽子', lv: 8, ic: 'gear_helm_4', b: { armor: 18, es: 22 } },
  { id: 'h_kitsune', k: 'helm', n: '狐面', lv: 8, ic: 'gear_helm_8', b: { ev: 18, es: 22 } },
  { id: 'c_leather', k: 'chest', n: '皮甲', lv: 1, ic: 'gear_chest_0', b: { armor: 14 } },
  { id: 'c_chain', k: 'chest', n: '鎖子甲', lv: 5, ic: 'gear_chest_1', b: { armor: 45 } },
  { id: 'c_robe', k: 'chest', n: '法袍', lv: 2, ic: 'gear_chest_2', b: { es: 35 } },
  { id: 'c_silk', k: 'chest', n: '天絲衣', lv: 9, ic: 'gear_chest_8', b: { es: 100 } },
  { id: 'c_plate', k: 'chest', n: '大鎧', lv: 11, ic: 'gear_chest_3', b: { armor: 110 } },
  /* 閃避系、混合（0.2.6） */
  { id: 'c_shinobi', k: 'chest', n: '忍裝束', lv: 1, ic: 'gear_chest_5', b: { ev: 16 } },
  { id: 'c_yako', k: 'chest', n: '夜行衣', lv: 6, ic: 'gear_chest_7', b: { ev: 50 } },
  { id: 'c_kage', k: 'chest', n: '影武者裝', lv: 12, ic: 'gear_chest_10', b: { ev: 120 } },
  { id: 'c_katabira', k: 'chest', n: '鎖帷子', lv: 8, ic: 'gear_chest_4', b: { armor: 40, ev: 40 } },
  { id: 'c_sohei', k: 'chest', n: '僧兵鎧', lv: 8, ic: 'gear_chest_9', b: { armor: 40, es: 50 } },
  { id: 'c_miko', k: 'chest', n: '巫女服', lv: 8, ic: 'gear_chest_6', b: { ev: 40, es: 50 } },
  { id: 'g_cloth', k: 'gloves', n: '布手套', lv: 1, ic: 'gear_gloves_0', b: { armor: 4 } },
  { id: 'g_silk', k: 'gloves', n: '絲手套', lv: 3, ic: 'gear_gloves_7', b: { es: 12 } },
  { id: 'g_iron', k: 'gloves', n: '鐵手甲', lv: 7, ic: 'gear_gloves_1', b: { armor: 18 } },
  /* 閃避系、混合（0.2.6） */
  { id: 'g_tekko', k: 'gloves', n: '皮手甲', lv: 1, ic: 'gear_gloves_3', b: { ev: 5 } },
  { id: 'g_shinobi', k: 'gloves', n: '忍手甲', lv: 6, ic: 'gear_gloves_5', b: { ev: 18 } },
  { id: 'g_kage', k: 'gloves', n: '影手甲', lv: 12, ic: 'gear_gloves_6', b: { ev: 40 } },
  { id: 'g_kote', k: 'gloves', n: '籠手', lv: 8, ic: 'gear_gloves_9', b: { armor: 12, ev: 12 } },
  { id: 'g_juzu', k: 'gloves', n: '數珠手套', lv: 8, ic: 'gear_gloves_2', b: { armor: 12, es: 14 } },
  { id: 'g_nishiki', k: 'gloves', n: '繡手套', lv: 8, ic: 'gear_gloves_4', b: { ev: 12, es: 14 } },
  { id: 'b_straw', k: 'boots', n: '草鞋', lv: 1, ic: 'gear_boots_4', b: { armor: 4 } },
  { id: 'b_cloth', k: 'boots', n: '布靴', lv: 3, ic: 'gear_boots_2', b: { es: 12 } },
  { id: 'b_iron', k: 'boots', n: '鐵脛靴', lv: 7, ic: 'gear_boots_1', b: { armor: 18 } },
  /* 閃避系、混合（0.2.6） */
  { id: 'b_tabi', k: 'boots', n: '足袋', lv: 1, ic: 'gear_boots_0', b: { ev: 5 } },
  { id: 'b_jika', k: 'boots', n: '地下足袋', lv: 6, ic: 'gear_boots_5', b: { ev: 18 } },
  { id: 'b_hayate', k: 'boots', n: '疾風足袋', lv: 12, ic: 'gear_boots_6', b: { ev: 40 } },
  { id: 'b_sune', k: 'boots', n: '臑當', lv: 8, ic: 'gear_boots_8', b: { armor: 12, ev: 12 } },
  { id: 'b_sorei', k: 'boots', n: '僧鞋', lv: 8, ic: 'gear_boots_3', b: { armor: 12, es: 14 } },
  { id: 'b_kinu', k: 'boots', n: '絹鞋', lv: 8, ic: 'gear_boots_9', b: { ev: 12, es: 14 } },
  { id: 'bt_rope', k: 'belt', n: '繩帶', lv: 1, ic: 'gear_belt_0', b: { life: 10 } },
  { id: 'bt_leather', k: 'belt', n: '皮帶', lv: 6, ic: 'gear_belt_5', b: { life: 25 } },
  { id: 'r_iron', k: 'ring', n: '鐵戒', lv: 1, ic: 'gear_ring_5', b: { life: 6 } },
  { id: 'r_ruby', k: 'ring', n: '紅玉戒', lv: 3, ic: 'gear_ring_0', b: { resF: 12 } },
  { id: 'r_sapph', k: 'ring', n: '藍玉戒', lv: 3, ic: 'gear_ring_1', b: { resC: 12 } },
  { id: 'r_topaz', k: 'ring', n: '黃玉戒', lv: 3, ic: 'gear_ring_2', b: { resL: 12 } },
  { id: 'a_jade', k: 'amulet', n: '玉珮', lv: 1, ic: 'gear_amulet_1', b: { life: 12 } },
  { id: 'a_coral', k: 'amulet', n: '珊瑚墜', lv: 5, ic: 'gear_amulet_2', b: { regen: 2 } },
  { id: 'a_gold', k: 'amulet', n: '金鎖片', lv: 9, ic: 'gear_amulet_4', b: { crit: 8 } }
];
/* ---------- 做裝的材料（0.2.6，企劃書 5.3、6.3、6.4）：放材料頁（S.mat），不佔背包，打怪自動吸收 ---------- */
/* 8 類屬性碎片：決定鍛造對哪一類詞綴下手 */
const SHARDS = [
  { k: 'life', n: '生命', ic: 'asc_s_heart', aff: ['life', 'regen', 'loh', 'flask'] },
  { k: 'def', n: '防禦', ic: 'asc_s_shield', aff: ['armor', 'ev', 'es', 'block'] },
  { k: 'ele', n: '元素', ic: 'asc_s_flame', aff: ['fire', 'cold', 'light', 'chaos'] },
  { k: 'phys', n: '物理', ic: 'asc_s_sword', aff: ['dmgP', 'flat'] },
  { k: 'crit', n: '暴擊', ic: 'asc_s_eye', aff: ['crit', 'critX'] },
  { k: 'speed', n: '速度', ic: 'asc_s_wind', aff: ['as', 'ms'] },
  { k: 'spell', n: '法術', ic: 'sup_sp_fastcast', aff: ['spellP', 'mp', 'aoe', 'spirit'] },
  { k: 'res', n: '抗性', ic: 'sup_ln_iron', aff: ['resF', 'resC', 'resL', 'resX', 'resA'] }
];
const SHARDI = Object.fromEntries(SHARDS.map(x => [x.k, x]));
const affCls = k => (SHARDS.find(x => x.aff.includes(k)) || {}).k;
/* 鑿孔石：寶石開孔 2→3 小、3→4 中、4→5 大 */
const DRILLS = ['小鑿孔石', '中鑿孔石', '大鑿孔石'];
const GEM_SO_MAX = 5;
/* 靈魂升級寶石：L 級升 L+1 要 10 × 1.35^L（輔助打三折） */
const soulCost = (L, sup) => Math.round(10 * Math.pow(1.35, L) * (sup ? 0.3 : 1));
/* 鍛造要的粉：物品等級越高越多 */
const dustCost = it => Math.round(8 * (1 + it.L / 3));
/* 淬鍊的金幣：每按一次 +10%，最多 2 倍 */
const temperCost = (it, single) => Math.round(3 * (1 + it.L) * Math.min(2, 1 + 0.1 * (it.tmp || 0)) * (single ? 3 : 1));
const BASEI = Object.fromEntries(BASES.map(b => [b.id, b]));

/* 詞綴：p 前綴（1）／後綴（0）、r：[T12 的最小, T1 的最大]、add 是「附加 a～b」兩個數 */
const AFF = {
  /* 武器上的 dmgP、flat、元素附加、as、crit 是本地詞（只改這把武器，stats 處理） */
  dmgP: { p: 1, n: '物理傷害提高 {}%', r: [10, 170] },
  physP: { p: 1, n: '物理傷害提高 {}%', r: [5, 30] },
  flat: { p: 1, n: '附加 {} 物理傷害', r: [1, 28], add: 1 },
  fire: { p: 1, n: '附加 {} 火焰傷害', r: [2, 40], add: 1 },
  cold: { p: 1, n: '附加 {} 冰冷傷害', r: [2, 36], add: 1 },
  light: { p: 1, n: '附加 {} 閃電傷害', r: [1, 48], add: 1 },
  chaos: { p: 1, n: '附加 {} 混沌傷害', r: [1, 30], add: 1 },
  life: { p: 1, n: '最大生命 +{}', r: [8, 120] },
  armor: { p: 1, n: '護甲 +{}', r: [6, 260] },
  ev: { p: 1, n: '閃避 +{}', r: [6, 260] },
  mp: { p: 1, n: '最大魔力 +{}', r: [6, 70] },
  block: { p: 1, n: '格擋率 +{}%', r: [2, 12] },
  as: { p: 0, n: '攻擊速度 +{}%', r: [4, 28] },
  crit: { p: 0, n: '暴擊率 +{}%', r: [1, 5] },
  critInc: { p: 0, n: '暴擊率提高 {}%', r: [10, 40] },
  critX: { p: 0, n: '暴擊傷害加成 +{}%', r: [8, 70] },
  regen: { p: 0, n: '每秒回復 {} 生命', r: [1, 30] },
  loh: { p: 0, n: '擊中回復 {} 生命', r: [1, 20] },
  ms: { p: 0, n: '移動速度 +{}%', r: [6, 32] },
  aoe: { p: 0, n: '範圍 +{}%', r: [5, 30] },
  flask: { p: 0, n: '藥水回復 +{}%', r: [10, 60] },
  resF: { p: 0, n: '火焰抗性 +{}%', r: [6, 48] },
  resC: { p: 0, n: '冰冷抗性 +{}%', r: [6, 48] },
  resL: { p: 0, n: '閃電抗性 +{}%', r: [6, 48] },
  resX: { p: 0, n: '混沌抗性 +{}%', r: [5, 35] },
  resA: { p: 0, n: '全部抗性 +{}%', r: [3, 18] },
  es: { p: 1, n: '能量護盾 +{}', r: [6, 140] },
  spellP: { p: 1, n: '法術傷害提高 {}%', r: [8, 90] },
  spirit: { p: 0, n: '精魄 +{}', r: [4, 30] }
};
/* T12（最低）～T1（最高）各一段；物品等級越高，能出現的最高階越高 */
function tierRange(k, T) {
  const [lo, hi] = AFF[k].r,
    step = (hi - lo) / 12,
    a = lo + step * (12 - T),
    b = a + step;
  return [Math.max(1, Math.round(a)), Math.max(1, Math.round(b))];
}
const bestTier = ilvl => Math.max(1, 12 - Math.floor(((ilvl - 1) * 11) / (TMAX - 1)));
const RARN = ['普通', '魔法', '稀有'];
const NAME_A = ['血', '鴉', '霜', '雷', '屍', '魂', '龍', '狼', '影', '骨', '焰', '夜', '鬼', '蛇', '鐵', '星'];
const NAME_B = ['之牙', '之爪', '之握', '之心', '之怒', '之歌', '之嚎', '之印', '之刃', '之殼', '之眼', '之息'];

/* ---------- 怪物：hp／dmg 是階級 1 的值，r 碰撞半徑、sz 畫的高度、ai 行為、el 屬性（抗自己的屬性 40%）、
   ail 擊中會上的異常（bleed／poison，企劃書 7.2）、arm 護甲係數（預設 0.3，重甲 1） ---------- */
const MOBS = {
  slime: {
    n: '綠史萊姆',
    sp: 'm_slime_green',
    hp: 34,
    dmg: 9,
    spd: 95,
    r: 18,
    sz: 40,
    ai: 'melee',
    wind: 0.5,
    reach: 46,
    cd: 1.3,
    xp: 6
  },
  dog: {
    n: '流浪狗',
    ail: 'bleed',
    sp: 'm_straydog',
    hp: 26,
    dmg: 8,
    spd: 200,
    r: 16,
    sz: 42,
    ai: 'lunge',
    wind: 0.38,
    reach: 230,
    cd: 1.6,
    xp: 6
  },
  bat: {
    n: '蝙蝠',
    sp: 'm_bat',
    hp: 14,
    dmg: 5,
    spd: 230,
    r: 13,
    sz: 34,
    ai: 'melee',
    wind: 0.28,
    reach: 36,
    cd: 0.9,
    xp: 3,
    fly: 1
  },
  fire: {
    n: '鬼火',
    sp: 'm_ghostfire',
    hp: 22,
    dmg: 10,
    spd: 120,
    r: 15,
    sz: 40,
    ai: 'ranged',
    wind: 0.55,
    reach: 330,
    cd: 2.0,
    xp: 7,
    fly: 1,
    el: 'fire'
  },
  wolf: {
    n: '雪原狼',
    ail: 'bleed',
    sp: 'm_snowwolf',
    hp: 30,
    dmg: 9,
    spd: 210,
    r: 17,
    sz: 44,
    ai: 'lunge',
    wind: 0.36,
    reach: 220,
    cd: 1.5,
    xp: 7,
    el: 'cold'
  },
  tbat: {
    n: '雷蝠',
    sp: 'm_thunderbat',
    hp: 16,
    dmg: 6,
    spd: 240,
    r: 13,
    sz: 34,
    ai: 'melee',
    wind: 0.28,
    reach: 36,
    cd: 0.9,
    xp: 4,
    fly: 1,
    el: 'light'
  },
  shroom: {
    n: '毒菇',
    ail: 'poison',
    sp: 'm_mushroom',
    hp: 40,
    dmg: 9,
    spd: 70,
    r: 18,
    sz: 40,
    ai: 'ranged',
    wind: 0.6,
    reach: 300,
    cd: 2.2,
    xp: 7,
    el: 'chaos'
  },
  bear: {
    n: '黑熊',
    arm: 1,
    sp: 'm_blackbear',
    hp: 95,
    dmg: 24,
    spd: 80,
    r: 26,
    sz: 64,
    ai: 'slam',
    wind: 0.85,
    reach: 100,
    cd: 2.4,
    xp: 18
  },
  /* 0.2.17：新行為 bomb（自爆：靠近後亮圈再爆，自爆不給經驗與掉寶）、cast（在玩家腳下放預警圈）、
     fan（扇形 3 發）、summon（後排叫 call，最多 4 隻）；split 死掉分成 2 隻小的 */
  islime: {
    n: '冰史萊姆',
    sp: 'm_slime_ice',
    hp: 44,
    dmg: 9,
    spd: 90,
    r: 20,
    sz: 44,
    ai: 'melee',
    wind: 0.5,
    reach: 48,
    cd: 1.3,
    xp: 7,
    el: 'cold',
    split: 1
  },
  fslime: {
    n: '火史萊姆',
    sp: 'm_slime_fire',
    hp: 44,
    dmg: 10,
    spd: 95,
    r: 20,
    sz: 44,
    ai: 'melee',
    wind: 0.5,
    reach: 48,
    cd: 1.3,
    xp: 7,
    el: 'fire',
    split: 1
  },
  tslime: {
    n: '腐臭史萊姆',
    ail: 'poison',
    sp: 'm_slime_trash',
    hp: 48,
    dmg: 8,
    spd: 85,
    r: 20,
    sz: 44,
    ai: 'melee',
    wind: 0.5,
    reach: 48,
    cd: 1.3,
    xp: 7,
    el: 'chaos',
    split: 1
  },
  lgolem: {
    n: '熔岩魔像',
    arm: 1,
    sp: 'm_lavagolem',
    hp: 100,
    dmg: 24,
    spd: 75,
    r: 26,
    sz: 64,
    ai: 'slam',
    wind: 0.9,
    reach: 100,
    cd: 2.5,
    xp: 18,
    el: 'fire'
  },
  tgolem: {
    n: '雷魔像',
    arm: 1,
    sp: 'm_thundergolem',
    hp: 95,
    dmg: 23,
    spd: 80,
    r: 26,
    sz: 64,
    ai: 'slam',
    wind: 0.85,
    reach: 100,
    cd: 2.4,
    xp: 18,
    el: 'light'
  },
  bknight: {
    n: '骷髏騎士',
    arm: 1,
    ail: 'bleed',
    sp: 'bone_knight',
    hp: 90,
    dmg: 22,
    spd: 90,
    r: 24,
    sz: 60,
    ai: 'slam',
    wind: 0.8,
    reach: 95,
    cd: 2.3,
    xp: 17
  },
  ltoad: {
    n: '熔岩蟾蜍',
    sp: 'm_lavatoad',
    hp: 36,
    dmg: 12,
    spd: 70,
    r: 18,
    sz: 42,
    ai: 'cast',
    wind: 0.6,
    reach: 360,
    cd: 2.6,
    xp: 8,
    el: 'fire'
  },
  tfrog: {
    n: '雷蛙',
    sp: 'm_thunderfrog',
    hp: 32,
    dmg: 12,
    spd: 80,
    r: 17,
    sz: 42,
    ai: 'cast',
    wind: 0.6,
    reach: 360,
    cd: 2.5,
    xp: 8,
    el: 'light'
  },
  treefrog: {
    n: '毒樹蛙',
    ail: 'poison',
    sp: 'm_treefrog',
    hp: 32,
    dmg: 10,
    spd: 80,
    r: 17,
    sz: 42,
    ai: 'cast',
    wind: 0.6,
    reach: 360,
    cd: 2.5,
    xp: 8,
    el: 'chaos'
  },
  lantern: {
    n: '燈籠鬼',
    sp: 'm_lantern',
    hp: 30,
    dmg: 12,
    spd: 100,
    r: 17,
    sz: 44,
    ai: 'cast',
    wind: 0.65,
    reach: 380,
    cd: 2.6,
    xp: 8,
    fly: 1,
    el: 'fire'
  },
  joss: {
    n: '金紙火',
    sp: 'm_jossfire',
    hp: 18,
    dmg: 26,
    spd: 190,
    r: 15,
    sz: 42,
    ai: 'bomb',
    wind: 0.9,
    reach: 60,
    boom: 90,
    cd: 1,
    xp: 5,
    fly: 1,
    el: 'fire'
  },
  hghost: {
    n: '餓鬼',
    sp: 'hungry_ghost',
    hp: 22,
    dmg: 24,
    spd: 180,
    r: 15,
    sz: 46,
    ai: 'bomb',
    wind: 0.9,
    reach: 60,
    boom: 90,
    cd: 1,
    xp: 5,
    el: 'chaos'
  },
  imp: {
    n: '地獄小鬼',
    sp: 'hell_imp',
    hp: 26,
    dmg: 8,
    spd: 120,
    r: 16,
    sz: 44,
    ai: 'fan',
    wind: 0.6,
    reach: 320,
    cd: 2.2,
    xp: 8,
    el: 'fire'
  },
  paper: {
    n: '紙人',
    sp: 'm_paperdoll',
    hp: 24,
    dmg: 8,
    spd: 125,
    r: 16,
    sz: 44,
    ai: 'fan',
    wind: 0.6,
    reach: 320,
    cd: 2.2,
    xp: 7,
    el: 'cold'
  },
  cobra: {
    n: '眼鏡蛇',
    ail: 'poison',
    sp: 'm_cobra',
    hp: 30,
    dmg: 9,
    spd: 110,
    r: 17,
    sz: 44,
    ai: 'fan',
    wind: 0.6,
    reach: 300,
    cd: 2.3,
    xp: 8,
    el: 'chaos'
  },
  viper: {
    n: '青竹絲',
    ail: 'poison',
    sp: 'm_greenviper',
    hp: 26,
    dmg: 9,
    spd: 210,
    r: 16,
    sz: 42,
    ai: 'lunge',
    wind: 0.36,
    reach: 220,
    cd: 1.6,
    xp: 7,
    el: 'chaos'
  },
  bailiff: {
    n: '鬼差',
    ail: 'bleed',
    sp: 'ghost_bailiff',
    hp: 32,
    dmg: 10,
    spd: 200,
    r: 16,
    sz: 50,
    ai: 'lunge',
    wind: 0.4,
    reach: 240,
    cd: 1.6,
    xp: 8
  },
  jiangshi: {
    n: '殭屍',
    arm: 1,
    sp: 'jiangshi',
    hp: 55,
    dmg: 12,
    spd: 70,
    r: 18,
    sz: 50,
    ai: 'melee',
    wind: 0.55,
    reach: 46,
    cd: 1.5,
    xp: 9
  },
  skel: {
    n: '骷髏兵',
    ail: 'bleed',
    sp: 'skeleton',
    hp: 30,
    dmg: 9,
    spd: 130,
    r: 17,
    sz: 48,
    ai: 'melee',
    wind: 0.45,
    reach: 44,
    cd: 1.2,
    xp: 6
  },
  yaksha: {
    n: '夜叉',
    sp: 'm_yaksha',
    hp: 38,
    dmg: 10,
    spd: 170,
    r: 17,
    sz: 48,
    ai: 'melee',
    wind: 0.35,
    reach: 44,
    cd: 0.9,
    xp: 8,
    el: 'light'
  },
  judge: {
    n: '判官',
    sp: 'm_judge',
    hp: 50,
    dmg: 8,
    spd: 90,
    r: 18,
    sz: 50,
    ai: 'summon',
    call: 'paper',
    wind: 0.8,
    reach: 340,
    cd: 4.5,
    xp: 12
  },
  priest: {
    n: '鬼道士',
    sp: 'ghost_priest',
    hp: 50,
    dmg: 8,
    spd: 90,
    r: 18,
    sz: 50,
    ai: 'summon',
    call: 'jiangshi',
    wind: 0.8,
    reach: 340,
    cd: 5,
    xp: 12,
    el: 'chaos'
  }
};
/* 一群的組成 */
const PACKS = [
  ['slime', 'slime', 'slime', 'slime'],
  ['dog', 'dog', 'dog'],
  ['bat', 'bat', 'bat', 'bat', 'bat', 'bat'],
  ['fire', 'fire', 'slime', 'slime'],
  ['bear', 'slime', 'slime'],
  ['wolf', 'wolf', 'wolf'],
  ['tbat', 'tbat', 'tbat', 'tbat', 'bat', 'bat'],
  ['shroom', 'shroom', 'slime', 'slime'],
  ['bear', 'tbat', 'tbat', 'fire'],
  ['islime', 'islime', 'paper', 'paper'],
  ['fslime', 'fslime', 'imp', 'imp'],
  ['tslime', 'tslime', 'treefrog', 'treefrog'],
  ['lgolem', 'ltoad', 'ltoad', 'joss'],
  ['tgolem', 'tfrog', 'tfrog', 'yaksha'],
  ['bknight', 'skel', 'skel', 'skel'],
  ['skel', 'skel', 'skel', 'skel', 'cobra'],
  ['joss', 'joss', 'joss', 'fire'],
  ['hghost', 'hghost', 'hghost', 'shroom'],
  ['viper', 'viper', 'viper', 'cobra'],
  ['bailiff', 'bailiff', 'paper', 'paper'],
  ['jiangshi', 'jiangshi', 'priest'],
  ['yaksha', 'yaksha', 'judge'],
  ['lantern', 'lantern', 'jiangshi', 'jiangshi'],
  ['wolf', 'wolf', 'islime', 'paper'],
  ['imp', 'imp', 'imp', 'lgolem'],
  ['tfrog', 'tbat', 'tbat', 'tbat', 'tgolem']
];
const ELITE = { hp: 3.2, dmg: 1.5, sz: 1.3 };
/* 王（0.2.17 起每張圖隨機一隻，不跟上一隻重複 bossPick）：call 叫小怪的種類、el 屬性、
   pat 會的招（揮爪 swipe、衝撞 charge、砸地 slam、叫小怪 summon、彈幕環 nova、連爆線 line、瞬移斬 blink；game.js 的 bossAI） */
const BOSSES = [
  {
    n: '虎姑婆',
    sp: 'hugupo',
    hp: 480,
    dmg: 22,
    spd: 135,
    r: 40,
    sz: 120,
    xp: 200,
    call: 'bat',
    pat: ['swipe', 'charge', 'summon', 'blink']
  },
  {
    n: '魔神仔',
    sp: 'mosina',
    hp: 450,
    dmg: 21,
    spd: 150,
    r: 38,
    sz: 116,
    xp: 200,
    call: 'shroom',
    el: 'chaos',
    pat: ['line', 'slam', 'summon']
  },
  {
    n: '林投姐',
    sp: 'lintoujie',
    hp: 470,
    dmg: 22,
    spd: 140,
    r: 38,
    sz: 118,
    xp: 200,
    call: 'wolf',
    el: 'cold',
    pat: ['nova', 'blink', 'swipe']
  },
  {
    n: '牛頭',
    sp: 'oxhead',
    hp: 500,
    dmg: 23,
    spd: 130,
    r: 40,
    sz: 120,
    xp: 200,
    call: 'skel',
    pat: ['swipe', 'charge', 'slam']
  },
  {
    n: '馬面',
    sp: 'horseface',
    hp: 460,
    dmg: 22,
    spd: 155,
    r: 38,
    sz: 118,
    xp: 200,
    call: 'bailiff',
    pat: ['charge', 'line', 'swipe']
  },
  {
    n: '閻羅',
    sp: 'yanluo',
    hp: 480,
    dmg: 21,
    spd: 130,
    r: 40,
    sz: 120,
    xp: 200,
    call: 'judge',
    el: 'fire',
    pat: ['nova', 'summon', 'line', 'swipe']
  },
  {
    n: '鍾馗',
    sp: 'zhongkui',
    hp: 480,
    dmg: 22,
    spd: 140,
    r: 40,
    sz: 120,
    xp: 200,
    call: 'paper',
    el: 'light',
    pat: ['blink', 'slam', 'swipe', 'line']
  },
  {
    n: '巫妖王',
    sp: 'lichking',
    hp: 450,
    dmg: 22,
    spd: 125,
    r: 38,
    sz: 118,
    xp: 200,
    call: 'skel',
    el: 'cold',
    pat: ['nova', 'slam', 'summon']
  },
  {
    n: '骨巨人',
    sp: 'bone_colossus',
    hp: 500,
    dmg: 23,
    spd: 120,
    r: 42,
    sz: 124,
    xp: 200,
    call: 'skel',
    pat: ['slam', 'charge', 'line']
  },
  {
    n: '死神',
    sp: 'reaper',
    hp: 450,
    dmg: 22,
    spd: 150,
    r: 38,
    sz: 116,
    xp: 200,
    call: 'hghost',
    el: 'chaos',
    pat: ['blink', 'nova', 'swipe']
  },
  {
    n: '饕餮',
    sp: 'taotie',
    hp: 500,
    dmg: 22,
    spd: 135,
    r: 42,
    sz: 120,
    xp: 200,
    call: 'tslime',
    pat: ['charge', 'swipe', 'slam', 'summon']
  },
  {
    n: '燭龍',
    sp: 'zhulong',
    hp: 470,
    dmg: 22,
    spd: 135,
    r: 40,
    sz: 120,
    xp: 200,
    call: 'imp',
    el: 'fire',
    pat: ['line', 'nova', 'charge', 'slam']
  }
];
const bossPick = no => {
  const l = BOSSES.filter(b => b !== no);
  return l[Math.floor(Math.random() * l.length)];
};
