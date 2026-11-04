/* dungeonPOE · 資料表：版本、主角、技能、地圖階級、裝備欄與底材、詞綴（T12～T1）、怪物、王 */
'use strict';
const VER = '0.2.36';
const KEY = 'dungeonpoe_v1';
const SLOT = new URLSearchParams(location.search).get('p') || '';

/* ---------- 主角（0.2.7：等級上限 300；到 100 級前每級生命 +12、魔力 +3，不給傷害；100 級後只給天賦點；mpReg 是每秒回最大魔力的比例） ---------- */
const HERO = { hp: 120, mp: 60, mpReg: 0.1, spd: 230, dmg: [6, 10] };
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
/* 名詞說明（0.2.27）：文字裡第一次出現的名詞可以點開（hud.js 的 termify）；鍵就是畫面上的字 */
const TERMS = {
  更多: '跟其他加成相乘。「更多 20%」就是整體 ×1.2，疊起來很強。',
  提高: '同一類的提高先全部相加，再乘一次，所以堆越多邊際越小。',
  投射物: '飛出去打人的技能，吃投射物數量、穿透、連鎖；打不穿牆。',
  連鎖: '投射物打中後彈向附近還沒打過的敵人。',
  穿透: '投射物打中後繼續往前飛，再打下一隻。元素穿透則是無視敵人的抗性，最多穿到 0。',
  持續傷害: '不是擊中：不會暴擊、不能吸血，只看抗性。',
  範圍: '打一片區域，範圍加成讓它變大。',
  近戰: '貼身打的攻擊，連擊數、重暈累積都看這個標籤。',
  法術: '基礎傷害看寶石等級，不吃武器。',
  詛咒: '丟一個範圍，1.5 秒後生效；每隻怪只能有一個詛咒，新的蓋掉舊的。',
  標記: '單一目標的減益，觸發時消耗；每隻怪只能有一個標記。',
  召喚: '替你打的同伴，吃召喚物傷害。',
  位移: '會移動你的技能，途中無敵。',
  元素: '火焰、冰冷、閃電三種傷害的總稱。',
  秘術: '詛咒、混沌、屍體類的技能體系，吃秘術傷害。',
  原始: '自然、變身類的技能體系，吃原始傷害。',
  冷卻: '放完要等多久才能再放；天賦的冷卻縮減有效。',
  暴擊: '傷害 ×2 起跳，暴擊傷害加成往上加。暴擊不保證觸發異常。',
  暴擊弱點: '每層讓對這個敵人的擊中暴擊率 +0.5%，最多 20 層，每層 4 秒。',
  暴擊施放: '插在法術上的輔助：你暴擊時累積能量，滿 100 自動施放。',
  熵值: '累積到 100 必定觸發一次，不靠運氣。',
  順風: '疊層的增益，最多 10 層，每層加移動與技能速度。',
  狂怒球: '球體資源，最多 3 顆、15 秒。持有不加數值，由技能或昇華消耗。',
  暴擊球: '球體資源，最多 3 顆、15 秒。持有不加數值，由技能或昇華消耗。',
  耐力球: '球體資源，最多 3 顆、15 秒。持有不加數值，由技能或昇華消耗。',
  幻影: '你的分身，隨機放你裝著的攻擊技能，傷害打折。',
  格擋值: '盾的隱性：等於盾的護甲。大於 0 時每一下吸收 40% 傷害；打碎後要等它跑滿才再吸收。',
  格擋率: '擊中有這個機率被完全擋下。',
  護甲: '減少物理擊中，最多 90%；對小傷害很有效，對大傷害效果變差。',
  閃避值: '讓敵人的攻擊打不中；紅光大招躲不掉。',
  能量護盾: '先吸收傷害的第二條血，一陣子沒被打會回充。',
  完美閃避: '翻滾剛開始的一瞬間躲過攻擊，時間變慢、下一擊必定暴擊。',
  重暈: '累積滿就暈住敵人。物理、近戰累積更多，冰冷不累積。',
  重度暈眩: '重暈條累積滿造成的暈眩。',
  碾壓: '打中重暈累積到「瀕臨」的敵人時，直接重暈。',
  破甲: '扣敵人的護甲；扣到 0 是完全破甲，受到的物理擊中傷害提高 20%。',
  點燃: '火焰持續傷害，只算最強的一個。',
  易燃: '火焰擊中累積，越高越容易點燃；點燃後清零。',
  冰緩: '敵人移動變慢，最多 50%。',
  冰凍: '冰冷傷害累積，滿了凍住不能行動。',
  感電: '受到的傷害提高 20%。',
  電殛: '特定技能累積，滿了不能行動。',
  流血: '物理持續傷害，敵人移動時加倍，只算最強的一個。',
  中毒: '物理＋混沌的持續傷害，預設 1 層。',
  致盲: '命中值和閃避值少 20%，4 秒。',
  凋零: '每層受到的混沌傷害提高 5%，最多 10 層。',
  曝露: '抗性變低，稀有度高的敵人效果少一點。',
  火焰曝露: '火焰抗性變低，稀有度高的敵人效果少一點。',
  灌注: '撿元素殘留物得到，有灌注的技能會消耗它變強。',
  引爆器: '能引爆可燃地面、手雷、紅花與插地飛劍的技能。',
  連擊數: '近戰打中累積，由長棍技能消耗。',
  榮耀: '擊中累積，滿 100 才能插戰旗。',
  地獄火: '炎魔契約把魔力換成它：放技能往上累積，滿了自爆。',
  自爆: '地獄火滿時受到等於最大生命＋能量護盾的火焰傷害，吃火焰抗性。'
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
    mp: 4,
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
    mp: 5,
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
    mp: 4,
    m: 0.95,
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
    d: '閃電打中滑鼠附近的敵人，再跳 4 次；可能造成感電（受到的傷害提高 20%、8 秒）'
  },
  slash: {
    n: '斬擊',
    ic: 'sk_slash2',
    t: 0.36,
    mp: 3,
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
    d: '在滑鼠位置召出分身 4 秒，每 0.8 秒從你裝著的攻擊技能隨機挑一招打最近的敵人（傷害 ×0.6）'
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
    mp: 3,
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
    mp: 5,
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
    mp: 4,
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
    mp: 5,
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
    d: '丟出盾牌，在敵人之間彈 3 次再飛回手上，可以連續丟。基礎傷害看盾的護甲與閃避'
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
  elec: { n: '電殛', ic: 'sup_sp_glight', need: [], d: '閃電擊中累積電殛：累滿不能行動 5 秒' },
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
  /* 0.2.28：自動施放（skills.js 的 autoTick）；砲台、圖騰可以，陷阱、地雷、位移、召喚不行（supOK） */
  autocast: {
    n: '自動化',
    ic: 'sup_sp_echo',
    need: [],
    meta: 'auto',
    d: '這招改成自動施放：480 內有敵人、冷卻好了、魔力夠就放，不打斷你的動作；不能手動施放。冷卻 +8 秒（沒冷卻的變 8 秒）、魔力消耗 ×1.4。不能用在位移、陷阱、地雷、召喚技能'
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
const SUP_CAT = { scorch: 'alt', brittle: 'alt', sap: 'alt', cast_crit: 'meta', autocast: 'meta' };
/* 自動化：附加的冷卻（品質照比例減，品質 20% 是 6.4 秒）、魔力倍率 */
const AUTO = { cd: 8, mp: 1.4 };
const supCat = k => SUP_CAT[k] || k;
/* 寶石品質（0.2.29，docs/品質效果表.md）：0～20%；{數字} 是品質 20% 的值，顯示時照比例換算 */
const GEM_Q_MAX = 20;
const QUAL = {
  cu_enfeeble: '被詛咒的怪打中你時，得到那一下傷害 {20}% 的守護',
  cu_eleweak: '被詛咒的怪死亡時，{20}% 機率掉元素殘留物',
  cu_tchains: '被詛咒的怪死亡時，{20}% 機率把詛咒傳給 200 內最近的怪',
  cu_vuln: '被詛咒的怪重暈累積 +{40}%',
  cu_despair: '被詛咒的怪死亡時，{20}% 機率把凋零層數傳給 150 內最近的怪',
  mk_sniper: '觸發後 {20}% 機率自動標記 300 內最近的怪',
  mk_freeze: '目標被冰凍時，{150} 內的怪冰緩 2 秒',
  mk_volt: '目標被電殛時，閃電跳向最多 {3} 隻怪（這一下 50% 的傷害）',
  mk_hound: '血爆打中的怪 {40}% 機率流血',
  mk_assassin: '目標死亡時，{20}% 機率多給 1 顆暴擊球',
  mk_poacher: '目標死亡時，{20}% 機率補 1 次魔力藥水',
  mk_warlord: '目標死亡時，{200} 內的怪被威嚇 3 秒',
  thrust: '招架成功時，攻擊者 120 內的怪 {40}% 機率失衡',
  combo: '連擊數超時時留下 {50}%，不會整組歸零',
  split: '打中怪時，{20}% 機率往隨機方向多射 1 支',
  frostbolt: '飛到盡頭留下冰緩地面 {2} 秒',
  arc: '跳到感電的怪時，{20}% 機率不算跳數',
  slash: '第 3 段放出一道穿透的斬波，倍率 ×{0.5}',
  whirl: '把敵人往內吸：品質 10% 時不再推開，品質 20% 時吸力等於原本的擊退',
  iai: '每斬中 1 隻，冷卻 −{10}%',
  quake: '碎裂地面上的怪重暈累積 +{40}%',
  venom: '每有 1 隻怪死在雨裡，持續 +{0.25} 秒',
  fireball: '爆炸處留下燃燒地面 {1.5} 秒',
  nova: '{20}% 機率不消耗灌注',
  meteor: '打中 3 隻以上時，{20}% 機率掉火焰殘留物',
  wolf: '狼咬死怪時，{20}% 機率多一隻臨時狼 8 秒',
  frosttrap: '爆開時 {20}% 機率留在原地，可以再觸發一次',
  blastmine: '爆炸時 {20}% 機率彈出 1 顆小地雷（0.5 秒後爆，傷害 ×0.5）',
  ballista: '擊中 {20}% 機率削減護甲',
  firetotem: '時間到時自爆，倍率 ×{1}',
  mirage: '分身消失時，{20}% 機率留下新分身 2 秒',
  axethrow: '{20}% 機率飛回手上，回程再打一次',
  rend: '{20}% 機率不消耗流血',
  cleave: '打中流血中的怪時，重暈累積再 +{40}%',
  warcry: '被威嚇的怪死亡時，{20}% 機率 +1 點狂怒',
  smash: '碾壓後，下一次重擊出手時間 −{50}%',
  leap: '落地時把 {180} 內的怪往落點拉',
  fissure: '最後一處留下碎裂地面 {2} 秒',
  thunder: '消耗暴擊球時，{20}% 機率保留 1 顆',
  spearthrow: '打中失衡的怪時，{100}% 機率不消耗穿透、{20}% 機率給 1 顆狂怒球',
  gasarrow: '毒氣雲每秒往最近的怪飄 {60}',
  apshot: '每個彈夾最後一發在擊中時爆炸，倍率 ×{1}',
  grenade: '爆炸時 {20}% 機率分出 1 顆小手雷（傷害 ×0.3，0.6 秒）',
  flyswords: '環繞的飛劍每 0.6 秒砍一下身邊的怪，倍率 ×{0.3}',
  shadowstrike: '擊殺時 {20}% 機率不進冷卻',
  clawchain: '第 4 段 {20}% 機率致盲',
  blindpounce: '打中致盲中的怪時，冷卻 −{1} 秒',
  chainsweep: '第 3 段打中的榮耀 +{100}%',
  banner: '旗子收起時返還 {25} 點榮耀',
  chaosbolt: '打中 10 層凋零的怪時，傳 {5} 層給 120 內的怪',
  corpseboom: '{20}% 機率不消耗屍體',
  paperdoll: '紙人消失時，{20}% 機率留下屍體',
  bearmaul: '熊形態被擊中時，{20}% 機率 +1 點狂怒',
  wolfpounce: '撲向被標記的怪時，{20}% 機率不花魔力',
  shieldcrush: '碾壓時回 {20}% 格擋值',
  shieldthrow: '品質每 10% 多彈 1 次（最多 +2）',
  redbloom: '被引爆器提早引爆時，爆炸更多 {40}%',
  multi: '散開角度 −{50}%',
  pierce: '最後一次穿透時，{20}% 機率分裂成 2 支',
  area: '目標周圍 200 內沒有其他怪時，傷害更多 {20}%',
  fury: '魔力倍率 ×1.4 降到 ×{1.2:1.4}',
  haste: '擊殺後 3 秒內，出手速度再快 {15}%',
  crit: '暴擊時 {20}% 機率得到 1 顆暴擊球',
  leech: '生命全滿時，吸到的量 {20}% 轉成魔力',
  cdr: '任何擊殺讓這招冷卻 −{0.2} 秒',
  fireadd: '附加的火焰 {20}% 機率點燃',
  heavy: '把怪擊退到牆邊時，{20}% 機率重暈',
  pack: '狼咬中時 {20}% 機率流血',
  bleed: '異常強度提高 {20}%',
  poison: '異常強度提高 {20}%',
  poistack: '疊滿時，下一次擊中立刻結算 {20}% 剩餘毒傷',
  ailmag: '異常到期時，{20}% 機率延長 1 秒',
  scorch: '焦灼的怪死亡時，{20}% 機率掉火焰殘留物',
  brittle: '易碎的怪死亡時，{120} 內的怪冰緩 2 秒',
  sap: '殘喘的怪打中你時，回 {1}% 魔力',
  expose: '曝露中的怪被擊中時，{20}% 機率刷新持續時間',
  armbreak: '這招打完全破甲的怪，重暈累積 +{20}%',
  elec: '不能行動的怪被閃電擊中時，跳 1 道電弧（{50}% 閃電傷害）',
  wither: '品質每 5% 上限 +2 層（最多 18 層）',
  blind: '致盲中的怪沒打中你時，回 {1}% 魔力',
  arcane: '法術擊殺時，秘術增強延長 {1} 秒',
  totemc: '立下圖騰時，{20}% 機率立刻施放一次',
  cast_crit: '自動施放時，{20}% 機率再放一次',
  autocast: '附加冷卻 8 秒降到 {6.4:8} 秒',
  anger: '對點燃中的怪，光環效果 ×{1.5:1}',
  precise: '每次沒暴擊，下一次暴擊率 +{1}%，暴擊後清零',
  swift: '翻滾後 2 秒，攻速再 +{5}%、移動速度再 +{4}%',
  iron: '站著不動時，護甲更多 {8}%',
  purity: '要被上元素異常時，{20}% 機率免疫',
  clarity: '魔力低於 30% 時，魔力回復更多 {40}%',
  wolfsp: '你翻滾時，戰狼 {20}% 機率撲向滑鼠附近的怪',
  golem: '你站在旁邊時，{20}% 機率由魔像替你擋下一下'
};
/* {v}：0 → v；{v:b}：b → v。品質說明的數字照目前品質換算 */
const qualText = (k, q) =>
  (QUAL[k] || '').replace(/\{([\d.]+)(?::([\d.]+))?\}/g, (_, v, b) => {
    const b0 = b ? +b : 0;
    return String(+(b0 + ((+v - b0) * q) / GEM_Q_MAX).toFixed(2));
  });
/* 一次提升幾 %：技能、光環 1%，輔助 2%；每次 1 精粉 */
const gemQStep = g => (SUPPORTS[g.gem] ? 2 : 1);
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
/* 魔力消耗：Lv1 只要一半，到 Lv10 回到原值，之後不變（0.2.27） */
const gemMpMul = lv => Math.min(1, 0.5 + ((lv - 1) * 0.5) / 9);
const gemNeed = lv => Math.round(30 * lv * lv);

/* ---------- 天賦樹（0.2.4，照 PoE＋漫步勇者）：中間挖空放昇華；18 條路線、每條「內段×外段」結構都不一樣；
   每個方向偏重一種體系、但小點會混搭隔壁的主題；沒有基石，大點都是全職業通用的強效果 ---------- */
const STATN = {
  life: ['最大生命', ''],
  mana: ['最大魔力', ''],
  armorF: ['護甲', ''],
  evF: ['閃避', ''],
  acc: ['命中值', ''],
  accP: ['命中值', '%'],
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
  blood: ['技能改用生命施放（不耗魔力）', '', 1],
  fireP: ['火焰傷害', '%'],
  coldP: ['冰冷傷害', '%'],
  lightP: ['閃電傷害', '%'],
  chaosP: ['混沌傷害', '%'],
  resF: ['火焰抗性', '%'],
  resC: ['冰冷抗性', '%'],
  resL: ['閃電抗性', '%'],
  resX: ['混沌抗性', '%'],
  /* 0.2.23 特色大點：數量、轉換、最大抗性、移動 */
  proj: ['投射物數量', ''],
  pierce: ['投射物穿透', ''],
  projMore: ['投射物傷害更多', '%'],
  leech: ['擊中吸血（傷害的）', '%'],
  dbl: ['近戰擊中時再打一次的機率', '%'],
  hsFire: ['對重度暈眩的敵人：物理轉成火焰', '%'],
  wolfN: ['召喚戰狼數量', ''],
  maxResF: ['最大火焰抗性', '%'],
  maxResC: ['最大冰冷抗性', '%'],
  maxResL: ['最大閃電抗性', '%'],
  maxResX: ['最大混沌抗性', '%'],
  cvPF: ['物理轉成火焰', '%'],
  cvPC: ['物理轉成冰冷', '%'],
  cvPL: ['物理轉成閃電', '%'],
  cvLC: ['閃電轉成冰冷', '%'],
  cvCF: ['冰冷轉成火焰', '%'],
  cvLF: ['閃電轉成火焰', '%'],
  movP: ['移動中傷害', '%'],
  stillP: ['靜止 1 秒以上時傷害', '%'],
  selfMore: ['你自己造成的傷害更多', '%'],
  /* 第三格 1＝開關（說明不寫數字） */
  noMiss: ['攻擊必定命中', '', 1],
  noCrit: ['不會暴擊', '', 1],
  fullCrit: ['對滿血的敵人必定暴擊', '', 1],
  ironRef: ['閃避全部轉成護甲', '', 1],
  wind: ['移動中傷害更多 25%，沒在移動時更少 25%', '', 1],
  ci: ['最大生命變成 1；免疫混沌傷害與流血；能量護盾更多 30%', '', 1],
  vaal: ['吸血立即回復；生命不會再生', '', 1],
  avatar: ['物理、冰冷、閃電的 50% 轉成火焰；冰冷、閃電傷害更少 30%', '', 1],
  mom: ['承受的傷害 40% 先扣魔力', '', 1],
  noSelf: ['你自己的擊中不造成傷害（召喚物、陷阱、地雷、圖騰、砲台照常）', '', 1],
  stand: ['不會被擊退、冰凍；閃避變成 0', '', 1],
  /* 0.2.25 昇華小點 */
  blockValP: ['格擋值', '%'],
  hsP: ['重暈累積', '%'],
  frzP: ['冰凍累積', '%'],
  elcP: ['電殛累積', '%'],
  ailThrP: ['異常門檻', '%']
};
/* 天賦樹的主題（0.2.17，照技能體系重做）：sm 小點（輪流）、nt 大點（名字＋效果）；
   rg 六條路（鬥士、遊俠、暗影、魔導、死靈、自然）各自的權重，叢集照所在方向抽主題；
   inner 防禦與生命（內圈多）、wp 武器專精（只在外圈）；第 0 個「基礎」是過路點（切斷主題，不會被抽到） */
/* 基礎能力點（0.2.7）：數值很低，有點加成又不會沒用 */
/* 過路點（0.2.22）：照方向給，取代 PoE2 的「+5 屬性」；六條路各自輪流 */
const PT_BASE = [
  [{ life: 10 }, { armorF: 20 }],
  [{ evF: 20 }, { acc: 30 }],
  [{ evF: 20 }, { acc: 30 }, { esF: 8 }],
  [{ esF: 8 }, { mana: 10 }],
  [{ mana: 10 }, { esF: 8 }, { life: 10 }],
  [{ life: 10 }, { mana: 10 }]
];
const PT_WP = (wp, n, c, ic, rg, nt) => ({ n, c, ic, wp, rg, sm: [{ ['w_' + wp]: 10 }], nt });
const PT_THEME = [
  { n: '基礎', c: '#8a8f98', ic: 'asc_s_heart', base: 1, rg: [0, 0, 0, 0, 0, 0], sm: PT_BASE.flat(), nt: [] },
  {
    n: '生命',
    c: '#d9534f',
    ic: 'asc_s_heart',
    inner: 1,
    rg: [2, 1, 1, 1, 1, 2],
    sm: [{ life: 10 }, { regen: 2 }],
    nt: [
      ['不屈', { hpP: 3, regen: 6 }],
      ['血氣方剛', { flask: 20, hpP: 2 }],
      ['背水一戰', { lowHp: 35 }],
      ['強韌體魄', { life: 25, regen: 4 }],
      ['鐵打筋骨', { hpP: 3, armorP: 10 }, '護甲'],
      ['飲血', { killHeal: 6, regen: 4 }],
      ['復甦', { regen: 10, flask: 10 }],
      ['不朽之軀', { maxResX: 1, resX: 12 }],
      ['血之盛宴', { leech: 2 }],
      ['生命之泉', { flask: 30 }],
      ['不死鳥', { regen: 15, ms: -3 }],
      ['血脈奔騰', { hpP: 3, as: 2 }, '攻速'],
      ['堅忍', { hpP: 2, ailThrP: 25 }],
      ['戰後療傷', { killHeal: 8 }],
      ['活力', { life: 20, ms: 2 }],
      ['心如磐石', { hpP: 3, blockInc: 5 }, '格擋與盾'],
      ['熱血', { regen: 8, meleeP: 10 }, '近戰'],
      ['野性體質', { hpP: 3, priP: 10 }, '原始技能'],
      ['補給', { flask: 25, regen: 3 }],
      ['生命湧泉', { regen: 12, life: 10 }],
      ['萬全', { hpP: 3, fullHp: 15 }],
      ['鐵血', { life: 30, mpP: -10 }]
    ]
  },
  {
    n: '護甲',
    c: '#b0835a',
    ic: 'asc_s_shield',
    inner: 1,
    rg: [3, 0, 0, 0, 0, 2],
    sm: [{ armorP: 12 }],
    nt: [
      ['鐵骨', { armorP: 25, resA: 3 }],
      ['金剛', { armorP: 20, armBreak: 1 }],
      ['熔岩鎧', { maxResF: 1, resF: 12 }],
      ['不動之甲', { stillP: 20, armorP: 15 }],
      ['戰甲狂熱', { armorP: 15, onsKill: 20 }],
      ['破甲者', { armorP: 15, meleeP: 15 }, '近戰'],
      ['磐石', { armorP: 40, ms: -3 }]
    ]
  },
  {
    n: '格擋與盾',
    c: '#9aa7b8',
    ic: 'asc_s_anvil',
    inner: 1,
    rg: [3, 0, 0, 0, 0, 1],
    sm: [{ blockInc: 5 }, { shieldP: 10 }],
    nt: [
      ['銅牆', { blockInc: 12, armorP: 10 }],
      ['以盾為劍', { shieldP: 25, blockInc: 4 }],
      ['盾反', { shieldP: 20, rageHit: 1 }],
      ['風暴之盾', { maxResL: 1, resL: 12 }],
      ['寒鐵盾', { maxResC: 1, resC: 12 }],
      ['盾牆', { blockInc: 15, ms: -3 }],
      ['盾擊', { shieldP: 30, as: -3 }],
      ['守護者', { blockInc: 8, regen: 6 }, '生命'],
      ['反擊', { shieldP: 20, critInc: 10 }],
      ['鐵衛', { blockInc: 10, resA: 4 }],
      ['壁壘', { blockInc: 12, esF: 15 }, '能量護盾']
    ]
  },
  {
    n: '近戰',
    c: '#e8a33d',
    ic: 'asc_s_sword',
    rg: [3, 2, 0, 0, 0, 1],
    sm: [{ meleeP: 10 }],
    nt: [
      ['斬鐵', { meleeP: 25, critX: 10 }],
      ['戰意', { meleeP: 20, rageHit: 1 }],
      ['破陣', { meleeP: 25, hsP: 15 }],
      ['猛擊', { meleeP: 40, as: -5 }],
      ['近身肉搏', { meleeP: 20, closeP: 15 }],
      ['血戰', { meleeP: 20, lowHp: 20 }],
      ['橫掃', { meleeP: 15, aoe: 8 }, '範圍'],
      ['熔火之拳', { cvPF: 25, meleeP: 10 }],
      ['狂暴', { meleeP: 20, onsKill: 15 }],
      ['重擊', { meleeP: 25, armBreak: 1, hsP: 15 }],
      ['飲血刃', { leech: 2, meleeP: 10 }],
      ['鬥技', { meleeP: 15, as: 4 }, '攻速'],
      ['斷筋', { meleeP: 15, bleedCh: 15 }, '異常'],
      ['衝鋒陷陣', { movP: 30 }],
      ['勇往直前', { meleeP: 35, armorP: -15 }]
    ]
  },
  {
    n: '攻速',
    c: '#f2c14e',
    ic: 'asc_s_wind',
    rg: [2, 2, 2, 0, 0, 1],
    sm: [{ as: 3 }],
    nt: [
      ['雷速', { cvPL: 25, as: 3 }],
      ['連斬', { as: 6, ms: 3 }],
      ['流水', { as: 5, onsKill: 20 }],
      ['迅雷', { as: 7, critInc: 8 }],
      ['狂舞', { as: 10, armorP: -10 }],
      ['手疾眼快', { as: 6, acc: 40 }, '命中'],
      ['急襲', { as: 5, afterRoll: 15 }],
      ['狂熱', { as: 3, rageHit: 1 }],
      ['急速', { as: 6, castP: 4 }, '法術'],
      ['疾步', { as: 4, ms: 4 }, '身法'],
      ['不停歇', { as: 6, regen: 4 }],
      ['奔襲', { movP: 20, as: 3 }],
      ['速射', { as: 7, projP: 5 }, '投射物'],
      ['連擊', { as: 8, regen: 2 }]
    ]
  },
  {
    n: '投射物',
    c: '#8fe0a5',
    ic: 'asc_s_bolt',
    rg: [0, 3, 2, 0, 0, 0],
    sm: [{ projP: 10 }],
    nt: [
      ['鷹眼', { projP: 25, critInc: 10 }],
      ['穿雲', { projP: 20, as: 3 }],
      ['連珠', { projP: 40, closeP: -30 }],
      ['遠射', { projP: 20, farP: 20 }],
      ['貫穿之箭', { pierce: 1, projP: 10 }],
      ['百發百中', { projP: 15, accP: 20 }, '命中'],
      ['跑射', { movP: 30 }],
      ['霜箭', { cvPC: 25, projP: 10 }],
      ['破甲箭', { projP: 20, armBreak: 1 }],
      ['毒矢', { projP: 15, poisonCh: 15 }, '異常']
    ]
  },
  {
    n: '身法',
    c: '#7bd36b',
    ic: 'asc_s_feather',
    inner: 1,
    rg: [0, 3, 2, 0, 0, 0],
    sm: [{ evP: 12 }, { ms: 2 }],
    nt: [
      ['輕功', { ms: 4, rollCd: 15 }],
      ['殘影', { evP: 25, tailwind: 1 }],
      ['游擊', { movP: 25, evP: 10 }],
      ['閃身反擊', { afterRoll: 40, evP: -10 }],
      ['疾行狩獵', { onsKill: 30, ms: 2 }],
      ['靈巧', { evP: 20, acc: 50 }, '命中'],
      ['鬼步', { evP: 20, afterRoll: 20 }]
    ]
  },
  {
    n: '暴擊率',
    c: '#fff08a',
    ic: 'asc_s_eye',
    rg: [1, 1, 3, 1, 1, 1],
    sm: [{ critInc: 10 }],
    nt: [
      ['一擊脫離', { afterRoll: 25, critInc: 10 }],
      ['心眼', { critInc: 20, critX: 10 }, '暴擊傷害'],
      ['要害洞察', { critInc: 20, bossP: 10 }],
      ['致命一瞥', { critInc: 40, hpP: -3 }],
      ['鷹視', { critInc: 20, farP: 10 }],
      ['刀鋒', { critInc: 20, meleeP: 10 }, '近戰'],
      ['暴擊球', { critInc: 15, powOnCrit: 10 }],
      ['貫穿', { critInc: 25, acc: 30 }],
      ['殘風', { tailwind: 1, critInc: 10 }],
      ['先發制人', { critInc: 35, closeP: -15 }],
      ['乘勝追擊', { powOnCrit: 25 }],
      ['弱點', { critInc: 20, ailMag: 10 }, '異常'],
      ['獵殺', { critInc: 20, onsKill: 10 }],
      ['精算', { critInc: 20, spellP: 10 }, '法術'],
      ['靈光', { critInc: 20, castP: 3 }],
      ['冷血', { critInc: 25, lowHp: 10 }],
      ['冷靜', { critInc: 20, regen: 4 }]
    ]
  },
  {
    n: '暴擊傷害',
    c: '#ffd166',
    ic: 'sup_sp_brutal',
    rg: [1, 1, 3, 1, 1, 1],
    sm: [{ critX: 15 }],
    nt: [
      ['弒王', { bossP: 30 }],
      ['要害', { critX: 20, critInc: 10 }, '暴擊率'],
      ['血濺', { critX: 15, killHeal: 10 }],
      ['斬首', { critX: 25, bossP: 10 }],
      ['破綻', { critX: 20, armBreak: 1 }],
      ['殘忍', { critX: 40, critInc: -10 }],
      ['痛擊', { critX: 25, meleeP: 10 }, '近戰'],
      ['狙殺', { critX: 25, farP: 10 }],
      ['處決', { critX: 20, lowHp: 15 }],
      ['雷霆一擊', { cvPL: 25, critX: 10 }],
      ['血花', { critX: 20, bleedCh: 10 }, '異常'],
      ['爆裂', { critX: 20, aoe: 6 }],
      ['魔暴', { critX: 20, spellP: 10 }, '法術'],
      ['碎魂', { critX: 25, onsKill: 10 }],
      ['暴怒', { critX: 20, rageHit: 1 }],
      ['重創', { critX: 30, as: -3 }]
    ]
  },
  {
    n: '命中',
    c: '#e6f2a0',
    ic: 'asc_s_eye',
    rg: [1, 3, 2, 0, 0, 1],
    sm: [{ accP: 8 }, { acc: 30 }],
    nt: [
      ['鷹準', { accP: 25, critInc: 10 }],
      ['破綻百出', { armBreak: 1, accP: 15 }],
      ['必中', { accP: 20, acc: 60 }],
      ['靜心瞄準', { stillP: 25 }],
      ['瞄準', { accP: 20, farP: 10 }],
      ['準星', { accP: 20, projP: 10 }, '投射物'],
      ['洞見', { accP: 20, critX: 10 }, '暴擊傷害'],
      ['遠攻', { farP: 30, closeP: -10 }],
      ['目光如炬', { accP: 25, evP: 10 }, '身法']
    ]
  },
  {
    n: '陷阱地雷',
    c: '#a3d977',
    ic: 'sup_sp_trap',
    rg: [0, 1, 3, 0, 0, 0],
    sm: [{ unitP: 10 }],
    nt: [
      ['機關師', { unitP: 25, units: 1 }],
      ['連環爆', { unitP: 20, aoe: 8 }],
      ['游擊佈雷', { movP: 25, unitP: 10 }],
      ['速佈', { unitP: 20, castP: 5 }],
      ['火藥桶', { cvPF: 25, unitP: 10 }],
      ['詭雷', { unitP: 20, critInc: 15 }, '暴擊率'],
      ['陷阱大師', { unitP: 15, units: 1 }],
      ['毒陷阱', { unitP: 15, poisonCh: 20 }, '異常'],
      ['火藥', { unitP: 20, fireP: 15 }],
      ['埋伏者', { onsKill: 30, unitP: 10 }],
      ['埋伏', { unitP: 25, bossP: 10 }]
    ]
  },
  {
    n: '異常',
    c: '#c46b8f',
    ic: 'ail_bleed',
    rg: [1, 0, 3, 0, 1, 2],
    sm: [{ ailMag: 10 }, { bleedCh: 5 }, { poisonCh: 8 }],
    nt: [
      ['放血', { bleedCh: 25, ailMag: 10 }],
      ['劇毒', { poisonCh: 25, poiStack: 1 }],
      ['疫病之源', { poiStack: 2, poisonCh: 10 }],
      ['蔓延', { ailMag: 20, aoe: 5 }],
      ['割裂', { bleedCh: 20, meleeP: 10 }, '近戰'],
      ['毒霧', { poisonCh: 20, aoeP: 10 }],
      ['疫病', { ailMag: 20, poisonCh: 10 }],
      ['血債', { bleedCh: 20, killHeal: 4 }],
      ['毒師', { poiStack: 1, ailMag: 10 }],
      ['瘟疫行者', { movP: 20, ailMag: 10 }],
      ['痛苦', { ailMag: 20, bossP: 10 }],
      ['淬毒', { poisonCh: 20, projP: 10 }, '投射物'],
      ['放血者', { bleedCh: 25, leech: 1 }],
      ['侵蝕', { ailMag: 20, chaosP: 15 }]
    ]
  },
  {
    n: '元素',
    c: '#ff8a4c',
    ic: 'asc_s_flame',
    rg: [1, 1, 1, 2, 1, 1],
    sm: [{ eleP: 10 }],
    nt: [
      ['冰火交融', { cvCF: 25 }],
      ['元素親和', { eleP: 20, pen: 5 }],
      ['元素之力', { eleP: 20, resA: 3 }],
      ['烈焰', { fireP: 30 }],
      ['寒冰', { coldP: 30 }],
      ['雷霆', { lightP: 30 }],
      ['焚燒', { fireP: 20, ailMag: 10 }, '異常'],
      ['霜凍', { coldP: 20, frzP: 15 }],
      ['電流', { lightP: 20, elcP: 15 }],
      ['元素穿透', { pen: 10 }],
      ['雷霜', { cvLC: 25 }],
      ['三元', { fireP: 12, coldP: 12, lightP: 12 }],
      ['元素爆發', { eleP: 20, aoe: 6 }, '範圍'],
      ['元素護體', { resA: 5, ailThrP: 25 }],
      ['火神之心', { maxResF: 1, resF: 12 }],
      ['冰之心', { coldP: 25, resC: 10 }],
      ['雷之心', { lightP: 25, resL: 10 }],
      ['元素崩解', { pen: 15, hpP: -3 }],
      ['元素狂潮', { eleP: 40, resA: -8 }],
      ['元素武裝', { eleP: 20, atkP: 10 }, '近戰']
    ]
  },
  {
    n: '元素技能',
    c: '#ff6a3d',
    ic: 'asc_pyro_c',
    rg: [0, 0, 0, 4, 1, 0],
    sm: [{ elemP: 10 }],
    nt: [
      ['秘法迴響', { arcaneHit: 30, elemP: 10 }],
      ['灌注', { elemP: 20, aoe: 6 }],
      ['炎爆', { elemP: 20, fireP: 10 }],
      ['冰封', { elemP: 20, frzP: 15 }],
      ['雷鳴', { elemP: 20, elcP: 15 }],
      ['冥想施法', { stillP: 30 }],
      ['元素迴響', { elemP: 20, castP: 4 }, '法術'],
      ['風暴之眼', { elemP: 20, critInc: 15 }, '暴擊率'],
      ['熔核', { pen: 10, ailMag: 10 }],
      ['暴風雪', { elemP: 20, aoe: 8 }],
      ['元素奔流', { elemP: 20, mpReg: 15 }, '魔力冷卻'],
      ['元素化身', { elemP: 40, hpP: -3 }],
      ['星火', { elemP: 20, pen: 5 }],
      ['天災', { elemP: 25, bossP: 10 }]
    ]
  },
  {
    n: '法術',
    c: '#8fd6ff',
    ic: 'sup_sp_fastcast',
    rg: [0, 0, 0, 3, 2, 0],
    sm: [{ spellP: 10 }],
    nt: [
      ['咒法', { spellP: 20, castP: 5 }],
      ['秘法', { spellP: 20, arcaneHit: 20 }],
      ['血咒', { spellP: 20, lowHp: 20 }],
      ['持久咒語', { spellP: 20, cdr: 5 }],
      ['定咒', { stillP: 30 }],
      ['魔力奔流', { spellP: 20, mpP: 10 }, '魔力冷卻'],
      ['秘法湧現', { arcaneHit: 40 }],
      ['法術暴擊', { spellP: 15, critInc: 15 }, '暴擊率'],
      ['護法', { spellP: 20, esP: 10 }, '能量護盾']
    ]
  },
  {
    n: '能量護盾',
    c: '#7aa8ff',
    ic: 'asc_s_drop',
    inner: 1,
    rg: [0, 0, 1, 3, 2, 0],
    sm: [{ esP: 12 }],
    nt: [
      ['靈障', { esP: 25, esF: 15 }],
      ['快速充能', { esRec: 30, esP: 10 }],
      ['寒霜屏障', { maxResC: 1, resC: 12 }],
      ['靈魂屏障', { esP: 20, resA: 3 }],
      ['心靈堅壁', { esP: 25, mpP: 5 }],
      ['魔力護盾', { esP: 20, mpReg: 10 }, '魔力冷卻'],
      ['盾中鋒芒', { esUp: 30 }],
      ['盾下施法', { esUp: 20, esP: 10 }],
      ['堅韌心智', { esP: 20, hpP: 2 }],
      ['雷光屏障', { maxResL: 1, resL: 12 }],
      ['護盾強化', { esP: 40, ms: -3 }],
      ['光之壁', { esP: 20, blockInc: 5 }, '格擋與盾'],
      ['靈氣', { esP: 20, spirit: 5 }, '精魄光環'],
      ['冥思', { esP: 15, esRec: 20 }],
      ['靈體護佑', { esP: 25, esRec: 10 }],
      ['虛空之殼', { esP: 35, hpP: -3 }]
    ]
  },
  {
    n: '魔力冷卻',
    c: '#b28dff',
    ic: 'asc_s_book',
    rg: [0, 0, 1, 2, 2, 1],
    sm: [{ mpReg: 10 }, { mpP: 5 }],
    nt: [
      ['冥想', { mpP: 15, mpReg: 20 }],
      ['迅捷施術', { cdr: 8 }],
      ['時光加速', { cdr: 6, onsKill: 15 }],
      ['秘法回流', { arcaneHit: 25, mpP: 5 }],
      ['時間扭曲', { cdr: 6, castP: 3 }],
      ['節能', { mpReg: 20, mpP: 5 }],
      ['冷卻大師', { cdr: 10, mpReg: -10 }],
      ['法力漩渦', { mpP: 10, spellP: 10 }, '法術'],
      ['再生', { mpReg: 20, regen: 3 }, '生命'],
      ['博學', { mpP: 15, cdr: 4 }],
      ['靜坐冥想', { stillP: 20, mpReg: 10 }],
      ['精神力', { mpP: 10, esF: 20 }, '能量護盾'],
      ['專注冥想', { cdr: 5, mpReg: 15 }],
      ['時之沙', { cdr: 12, ms: -4 }],
      ['秘泉', { mpP: 20, mpReg: 10 }]
    ]
  },
  {
    n: '秘術技能',
    c: '#9b6bd9',
    ic: 'ail_curse',
    rg: [0, 0, 1, 0, 4, 0],
    sm: [{ occP: 10 }],
    nt: [
      ['凋零', { occP: 20, unholyKill: 10 }],
      ['靜默詛咒', { stillP: 25, occP: 5 }],
      ['混沌之力', { occP: 20, chaosP: 15 }],
      ['邪能', { occP: 25, unholyKill: 15 }],
      ['血肉獻祭', { occP: 20, lowHp: 25 }],
      ['絕望', { occP: 20, ailMag: 10 }, '異常'],
      ['邪能爆發', { unholyKill: 30 }],
      ['亡魂', { occP: 20, minionP: 10 }, '召喚'],
      ['黑暗契約', { occP: 40, hpP: -3 }]
    ]
  },
  {
    n: '召喚',
    c: '#9df29d',
    ic: 'asc_s_paw',
    rg: [0, 0, 0, 0, 3, 2],
    sm: [{ minionP: 10 }],
    nt: [
      ['嗜血群獸', { minionP: 15, onsKill: 20 }],
      ['群狼', { minionP: 20, spirit: 10 }],
      ['狼王', { wolfN: 1 }],
      ['主僕同心', { minionP: 15, dmgA: 10 }],
      ['狼群', { minionP: 20, ms: 3 }],
      ['亡靈大軍', { minionP: 20, spirit: 8 }],
      ['血肉祭品', { minionP: 35, hpP: -3 }],
      ['指揮', { minionP: 20, auraEff: 5 }, '精魄光環'],
      ['骨衛', { minionP: 20, armorP: 10 }, '護甲'],
      ['召喚師', { minionP: 25, castP: 3 }],
      ['死靈學', { minionP: 20, occP: 10 }, '秘術技能'],
      ['野獸之王', { minionP: 20, priP: 10 }, '原始技能'],
      ['亡靈之握', { unholyKill: 20, minionP: 10 }],
      ['嗜殺', { minionP: 20, onsKill: 10 }],
      ['群聚', { minionP: 20, aoe: 5 }],
      ['守護靈', { minionP: 15, regen: 5 }]
    ]
  },
  {
    n: '精魄光環',
    c: '#c38bff',
    ic: 'asc_s_lotus',
    rg: [0, 0, 0, 1, 3, 0],
    sm: [{ auraEff: 4 }],
    nt: [
      ['靈識', { spirit: 15 }],
      ['聖域', { auraEff: 10, spirit: 5 }],
      ['聖光', { auraEff: 10, fullHp: 20 }],
      ['靜謐', { stillP: 20, auraEff: 5 }],
      ['祝福', { auraEff: 10, resA: 3 }],
      ['不朽之歌', { auraEff: 10, killHeal: 8 }],
      ['靈魂之火', { spirit: 10, esP: 10 }, '能量護盾'],
      ['共鳴', { auraEff: 10, mpReg: 10 }]
    ]
  },
  {
    n: '原始技能',
    c: '#7fbf5a',
    ic: 'asc_tamer_c',
    rg: [1, 0, 0, 0, 0, 5],
    sm: [{ priP: 10 }],
    nt: [
      ['獸性', { priP: 15, rageHit: 1 }],
      ['獸魂', { priP: 20, hpP: 2 }],
      ['蛻變', { priP: 20, armorP: 15 }, '護甲'],
      ['植物之怒', { priP: 20, aoe: 6 }],
      ['奔狼', { movP: 25, priP: 5 }],
      ['血祭', { priP: 20, leech: 1.5 }],
      ['大地之母', { priP: 20, regen: 6 }, '生命']
    ]
  },
  {
    n: '圖騰砲台',
    c: '#c9a46b',
    ic: 'asc_s_rune',
    rg: [1, 1, 0, 0, 0, 3],
    sm: [{ unitP: 10 }],
    nt: [
      ['堡壘工匠', { unitP: 25, units: 1 }],
      ['砲陣', { unitP: 25, projP: 8 }],
      ['紮根', { stillP: 30 }],
      ['鋼鐵砲台', { unitP: 20, armorP: 10 }],
      ['戰爭鼓', { unitP: 15, onsKill: 20 }],
      ['破甲砲', { unitP: 15, armBreak: 1 }],
      ['守陣', { unitP: 15, regen: 5 }, '生命'],
      ['雙圖騰', { units: 1, unitP: 10 }],
      ['火砲', { unitP: 20, fireP: 15 }],
      ['祖先之怒', { unitP: 40, ms: -4 }],
      ['圖騰匠', { unitP: 25, bossP: 10 }]
    ]
  },
  {
    n: '範圍',
    c: '#b7e3ff',
    ic: 'sup_sp_aoe',
    rg: [2, 1, 1, 1, 1, 2],
    sm: [{ aoe: 5 }],
    nt: [
      ['天崩地裂', { aoe: 8, armBreak: 1 }],
      ['震波', { aoe: 8, aoeP: 15 }],
      ['群體殺戮', { onsKill: 25, aoeP: 10 }],
      ['靜力衝擊', { stillP: 20, aoe: 5 }],
      ['毀滅', { aoeP: 20, aoe: 5 }],
      ['漣漪', { aoe: 10, castP: 3 }],
      ['爆破', { aoeP: 30, aoe: -5 }],
      ['大範圍', { aoe: 12, elemP: 5 }, '元素技能'],
      ['地裂', { aoe: 10, meleeP: 10 }, '近戰'],
      ['散射', { aoe: 10, projP: 10 }, '投射物'],
      ['輻射', { aoe: 8, ailMag: 10 }, '異常'],
      ['延展', { aoe: 12, cdr: 3 }],
      ['天崩', { aoeP: 40, as: -5 }],
      ['範圍專精', { aoeP: 20, aoe: 6 }],
      ['波及', { aoe: 10, bossP: 8 }]
    ]
  },
  PT_WP(
    'sword',
    '劍術',
    '#e0b070',
    'gear_weapon_0',
    [3, 1, 0, 0, 0, 0],
    [
      ['連斬劍', { w_sword: 30, as: 3 }],
      ['劍氣', { w_sword: 25, critX: 15 }],
      ['萬劍歸宗', { only: 'sword', dbl: 20 }],
      ['劍舞', { w_sword: 20, ms: 3 }],
      ['劍意', { w_sword: 25, acc: 60 }, '命中'],
      ['劍聖', { w_sword: 40, armorP: -15 }],
      ['劍盾', { w_sword: 20, blockInc: 6 }, '格擋與盾']
    ]
  ),
  PT_WP(
    'axe',
    '斧術',
    '#c8743c',
    'gear_weapon_2',
    [3, 0, 0, 0, 0, 1],
    [
      ['裂骨', { w_axe: 25, bleedCh: 20 }],
      ['怒斧', { w_axe: 25, rageHit: 1 }],
      ['斷筋斧', { only: 'axe', bleedCh: 100 }],
      ['旋斧', { w_axe: 20, aoe: 8 }],
      ['開顱', { w_axe: 40, as: -5 }]
    ]
  ),
  PT_WP(
    'mace',
    '錘術',
    '#b39a6b',
    'gear_weapon_8',
    [3, 0, 0, 0, 0, 1],
    [
      ['碎骨', { w_mace: 25, armBreak: 1 }],
      ['震地', { w_mace: 25, aoe: 8 }],
      ['熔岩錘', { only: 'mace', hsFire: 25 }],
      ['碎顱', { w_mace: 20, bossP: 15 }],
      ['錘擊', { w_mace: 40, as: -5 }],
      ['鐵錘', { w_mace: 20, armorP: 15 }, '護甲'],
      ['雷錘', { w_mace: 20, lightP: 15 }, '元素']
    ]
  ),
  PT_WP(
    'flail',
    '連枷術',
    '#a8a070',
    'gear_weapon_22',
    [3, 1, 0, 0, 0, 0],
    [
      ['鏈舞', { w_flail: 25, critInc: 15 }],
      ['旗手', { w_flail: 20, aoe: 6 }],
      ['破陣鏈', { only: 'flail', armBreak: 1, w_flail: 15 }],
      ['鐵鏈', { w_flail: 25, armorP: 10 }],
      ['流星', { w_flail: 35, as: -3 }],
      ['鏈刃', { w_flail: 20, bleedCh: 15 }, '異常'],
      ['戰旗', { w_flail: 20, auraEff: 5 }, '精魄光環'],
      ['鏈擊', { w_flail: 25, as: 3 }]
    ]
  ),
  PT_WP(
    'spear',
    '矛術',
    '#d9a066',
    'gear_weapon_9',
    [1, 3, 0, 0, 0, 0],
    [
      ['穿刺', { w_spear: 25, impaleCh: 25 }],
      ['長槍陣', { w_spear: 20, aoe: 8 }],
      ['投槍', { w_spear: 25, projP: 10 }, '投射物'],
      ['貫日', { only: 'spear', impaleCh: 40 }],
      ['突刺', { w_spear: 25, critX: 15 }],
      ['槍林', { w_spear: 40, evP: -15 }]
    ]
  ),
  PT_WP(
    'bow',
    '弓術',
    '#9fd27a',
    'gear_weapon_3',
    [0, 3, 1, 0, 0, 0],
    [
      ['百步穿楊', { w_bow: 25, farP: 15 }],
      ['連珠箭', { w_bow: 25, as: 3 }],
      ['連珠神射', { only: 'bow', proj: 1, projMore: -15 }],
      ['長弓', { w_bow: 20, projP: 10 }],
      ['獵人', { w_bow: 25, critInc: 15 }],
      ['弓弦', { w_bow: 20, acc: 60 }, '命中'],
      ['穿心', { w_bow: 25, critX: 15 }],
      ['疾風箭', { w_bow: 20, ms: 3 }, '身法'],
      ['強弓', { w_bow: 40, as: -5 }]
    ]
  ),
  PT_WP(
    'xbow',
    '弩術',
    '#8fb88a',
    'gear_weapon_12',
    [0, 3, 0, 0, 0, 1],
    [
      ['重弩', { w_xbow: 25, armBreak: 1 }],
      ['速裝', { w_xbow: 25, as: 3 }],
      ['貫穿弩', { only: 'xbow', pierce: 2 }],
      ['弩手', { w_xbow: 20, critInc: 15 }],
      ['破甲弩', { w_xbow: 20, physP: 15 }],
      ['爆裂弩', { w_xbow: 20, aoe: 8 }, '範圍'],
      ['狙擊弩', { w_xbow: 25, farP: 15 }],
      ['重裝', { w_xbow: 40, as: -6 }],
      ['弩箭', { w_xbow: 20, projP: 10 }, '投射物'],
      ['弩炮', { w_xbow: 35, ms: -3 }]
    ]
  ),
  PT_WP(
    'dagger',
    '匕首術',
    '#b6c9e0',
    'gear_weapon_13',
    [0, 1, 3, 0, 0, 0],
    [
      ['背刺', { w_dagger: 25, critX: 20 }],
      ['御劍', { w_dagger: 20, projP: 10 }, '投射物'],
      ['一擊必殺', { only: 'dagger', fullCrit: 1 }],
      ['刺殺', { w_dagger: 25, critInc: 20 }],
      ['淬毒匕首', { w_dagger: 20, poisonCh: 20 }, '異常'],
      ['刀光', { w_dagger: 25, as: 3 }],
      ['暗刃', { w_dagger: 35, hpP: -2 }],
      ['快刃', { w_dagger: 20, ms: 3 }]
    ]
  ),
  PT_WP(
    'claw',
    '爪術',
    '#d98a8a',
    'gear_weapon_27',
    [0, 0, 3, 0, 0, 1],
    [
      ['撕爪', { w_claw: 25, as: 3 }],
      ['嗜血', { w_claw: 20, killHeal: 6 }],
      ['飲血爪', { only: 'claw', leech: 2 }],
      ['利爪', { w_claw: 25, critInc: 15 }],
      ['血爪', { w_claw: 20, bleedCh: 20 }, '異常']
    ]
  ),
  PT_WP(
    'traptool',
    '機關術',
    '#a3c977',
    'sup_sp_mine',
    [0, 1, 3, 0, 0, 0],
    [
      ['巧匠', { w_traptool: 25, units: 1 }],
      ['連環', { w_traptool: 20, aoe: 6 }],
      ['機關城', { only: 'traptool', units: 1 }],
      ['速發', { w_traptool: 25, castP: 4 }],
      ['火線', { w_traptool: 20, fireP: 15 }, '元素'],
      ['機簧', { w_traptool: 25, unitP: 10 }, '陷阱地雷'],
      ['爆破機關', { w_traptool: 40, hpP: -3 }],
      ['精工', { w_traptool: 20, critInc: 15 }]
    ]
  ),
  PT_WP(
    'staff',
    '法杖術',
    '#ff9f6b',
    'gear_weapon_4',
    [0, 0, 0, 3, 1, 0],
    [
      ['元素之杖', { w_staff: 25, elemP: 10 }, '元素技能'],
      ['杖心', { w_staff: 20, castP: 5 }],
      ['元素洪流', { only: 'staff', pen: 10 }],
      ['法杖共鳴', { w_staff: 25, spellP: 10 }, '法術'],
      ['星杖', { w_staff: 20, critInc: 15 }],
      ['炎杖', { w_staff: 20, fireP: 15 }],
      ['冰杖', { w_staff: 20, coldP: 15 }],
      ['雷杖', { w_staff: 20, lightP: 15 }],
      ['巨杖', { w_staff: 40, castP: -5 }],
      ['守護之杖', { w_staff: 20, esP: 15 }, '能量護盾'],
      ['智杖', { w_staff: 20, mpP: 10 }],
      ['杖擊', { w_staff: 25, aoe: 6 }]
    ]
  ),
  PT_WP(
    'wand',
    '魔杖術',
    '#a98bdf',
    'gear_weapon_31',
    [0, 0, 0, 1, 3, 0],
    [
      ['咒杖', { w_wand: 25, occP: 10 }, '秘術技能'],
      ['速咒', { w_wand: 20, castP: 5 }],
      ['秘法迴路', { only: 'wand', arcaneHit: 100 }],
      ['邪杖', { w_wand: 20, chaosP: 15 }],
      ['骨杖', { w_wand: 20, minionP: 10 }, '召喚'],
      ['詛杖', { w_wand: 25, ailMag: 10 }],
      ['魔焰', { w_wand: 40, hpP: -3 }]
    ]
  ),
  PT_WP(
    'sceptre',
    '權杖術',
    '#d0a8ff',
    'gear_weapon_15',
    [0, 0, 0, 0, 3, 1],
    [
      ['王權', { w_sceptre: 20, spirit: 8 }],
      ['號令', { w_sceptre: 25, auraEff: 5 }],
      ['權威', { w_sceptre: 25, minionP: 10 }, '召喚'],
      ['君權神授', { only: 'sceptre', spirit: 15, auraEff: 10 }],
      ['聖杖', { w_sceptre: 20, resA: 4 }]
    ]
  ),
  PT_WP(
    'talisman',
    '魔符術',
    '#8fcf6a',
    'asc_tamer_e',
    [1, 0, 0, 0, 0, 3],
    [
      ['熊魂', { w_talisman: 25, hpP: 2 }],
      ['狼魂', { w_talisman: 25, as: 3 }],
      ['獸血', { w_talisman: 20, priP: 10 }, '原始技能'],
      ['鷹魂', { w_talisman: 25, critInc: 15 }],
      ['萬獸之主', { only: 'talisman', wolfN: 1 }],
      ['野獸怒吼', { w_talisman: 40, armorP: -15 }],
      ['符靈', { w_talisman: 20, regen: 5 }],
      ['蛇魂', { w_talisman: 20, poisonCh: 20 }, '異常']
    ]
  ),
  PT_WP(
    'qstaff',
    '棍術',
    '#b5d36b',
    'asc_moon_c',
    [1, 0, 0, 0, 0, 3],
    [
      ['武僧', { w_qstaff: 25, as: 3 }],
      ['風雷棍', { only: 'qstaff', afterRoll: 30, rollCd: 20 }],
      ['禪定', { w_qstaff: 20, powOnCrit: 15 }],
      ['迴棍', { w_qstaff: 20, aoe: 10 }]
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
/* 基石（0.2.17；0.2.23 起改機制，開關寫在 STATN；每條路 2 個，放在外圈末端、只連 1 條線）：好處和代價寫在同一點；「傷害更多」是全域的（7.2 第 5 步） */
const PT_KEYS = [
  { rg: 0, n: '堅定技巧', ic: 'asc_judge_e', s: { noMiss: 1, noCrit: 1 } },
  { rg: 0, n: '鐵壁', ic: 'asc_phalanx_e', s: { ironRef: 1 } },
  { rg: 1, n: '箭雨', ic: 'asc_hunter_e', s: { proj: 1, projMore: -25 } },
  { rg: 1, n: '疾風步', ic: 'asc_master_e', s: { wind: 1 } },
  { rg: 2, n: '混沌免疫', ic: 'asc_shadow_e', s: { ci: 1 } },
  { rg: 2, n: '瓦爾契約', ic: 'asc_bloodclaw_e', s: { vaal: 1, leech: 3 } },
  { rg: 3, n: '火焰化身', ic: 'asc_storm_e', s: { avatar: 1 } },
  { rg: 3, n: '心靈凌駕', ic: 'asc_medium_e', s: { mom: 1 } },
  { rg: 4, n: '血魔法', ic: 'asc_bloodmage_e', s: { blood: 1, hpP: 10 } },
  { rg: 4, n: '亡者之主', ic: 'asc_bonelord_e', s: { wolfN: 2, minionP: 30, selfMore: -50 } },
  { rg: 5, n: '不動如山', ic: 'asc_peach_e', s: { stand: 1, ms: -15 } },
  { rg: 5, n: '先祖羈絆', ic: 'asc_banner_e', s: { units: 2, unitP: 30, noSelf: 1 } }
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
  acc: 'asc_s_eye',
  accP: 'asc_s_eye',
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
  cdr: 'sup_sp_cd',
  /* 0.2.25 昇華小點 */
  blockValP: 'asc_s_anvil',
  hsP: 'asc_s_fist',
  w_mace: 'asc_s_fist',
  /* 0.2.26 昇華小點 */
  fireP: 'asc_s_flame',
  castP: 'sup_sp_fastcast',
  ailMag: 'sup_sp_dmg',
  pen: 'sup_sp_brutal',
  resF: 'sup_ln_iron'
};
/* 天賦樹產生器（0.2.22，照 docs/PoE天賦結構.md 第 5 節）：
   幹道＝三角格子的頂點（過路點，十字路口：2～3 條接幹道、2～3 條接叢集），每個三角形是一個叢集（口袋）；
   叢集的小點排在一圈軌道上、大點在最裡面（離入口 2～3 步），叢集之間不直接相連；
   64% 死路（一個入口）、24% 兩頭通、12% 樞紐（內圈多）；外圈有 2 個三角形併成一塊的大叢集（武器、召喚…） */
const PT_R0 = 470;
const PTREE = (() => {
  const N = [],
    E = [],
    I = {},
    ARC = {},
    add = o => ((I[o.id] = o), N.push(o), o),
    link = (a, b) => E.push([a.id, b.id]),
    hsh = i => ((Math.imul(i + 7, 2654435761) >>> 0) % 1000) / 1000,
    /* 六條路的方向：0～6 的小數，整數＝起點正中間（0 鬥士在正上方，順時針） */
    rgF = (x, y) => (((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360) / 60,
    road = (x, y) => Math.round(rgF(x, y)) % 6,
    dst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    LA = 360,
    ROT = 0.31,
    /* 外框隨角度凹凸 */
    rim = a => 2680 * (1 + 0.08 * Math.sin(a * 3 + 1.3) + 0.05 * Math.sin(a * 7 + 0.4));
  /* 起點：六條路（免費） */
  for (let g = 0; g < 6; g++) {
    const a = ((g * 60 - 90) * Math.PI) / 180,
      R = PT_ROADS[g],
      th = PT_TH[R.th];
    add({
      id: 'g' + g,
      x: Math.cos(a) * PT_R0,
      y: Math.sin(a) * PT_R0,
      n: R.n,
      d: '往外偏重：' + R.d,
      ic: PT_THEME[th].ic,
      s: {},
      big: 1,
      gate: 1,
      th
    });
  }
  /* 幹道頂點：轉過角度、稍微抖動的三角格子 */
  const V = {},
    vk = (i, j) => i + ',' + j;
  for (let i = -9; i <= 9; i++)
    for (let j = -9; j <= 9; j++) {
      const u = i * LA + j * LA * 0.5,
        w = j * LA * 0.866,
        k = (i + 20) * 64 + j + 20,
        x = u * Math.cos(ROT) - w * Math.sin(ROT) + (hsh(k * 3) - 0.5) * 70,
        y = u * Math.sin(ROT) + w * Math.cos(ROT) + (hsh(k * 5 + 1) - 0.5) * 70,
        r = Math.hypot(x, y);
      if (r > PT_R0 + 230 && r < rim(Math.atan2(y, x))) V[vk(i, j)] = { x, y, i, j, pk: 0 };
    }
  /* 三角形（上、下兩種）；三個頂點都在才算 */
  const tri = [];
  for (const v of Object.values(V)) {
    const b = V[vk(v.i + 1, v.j)],
      c = V[vk(v.i, v.j + 1)],
      d = V[vk(v.i + 1, v.j + 1)];
    if (b && c) tri.push([v, b, c]);
    if (b && c && d) tri.push([b, d, c]);
  }
  const cen = vs => ({
      x: vs.reduce((s, v) => s + v.x, 0) / vs.length,
      y: vs.reduce((s, v) => s + v.y, 0) / vs.length
    }),
    /* 點到線段的距離 */
    segD = (P, A, B) => {
      const dx = B.x - A.x,
        dy = B.y - A.y,
        f = Math.max(0, Math.min(1, ((P.x - A.x) * dx + (P.y - A.y) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(P.x - A.x - dx * f, P.y - A.y - dy * f);
    },
    ek = (a, b) => [vk(a.i, a.j), vk(b.i, b.j)].sort().join('|');
  let cl = tri.map(vs => ({ vs, ...cen(vs) }));
  const RMAX = Math.max(...cl.map(c => Math.hypot(c.x, c.y)));
  for (const c of cl) c.dd = (Math.hypot(c.x, c.y) - PT_R0) / (RMAX - PT_R0);
  /* 大叢集：外圈每隔幾個，把相鄰的兩個三角形併成一塊（共用的那條邊不當幹道） */
  const noTrunk = new Set(),
    taken = new Set();
  for (const [ci, c] of cl.entries()) {
    if (c.big || taken.has(ci) || c.dd < 0.5 || hsh(ci * 41 + 9) > 0.11) continue;
    const oi = cl.findIndex(
      (o, k) => !o.big && !taken.has(k) && k !== ci && o.vs.filter(v => c.vs.includes(v)).length === 2
    );
    if (oi < 0) continue;
    const o = cl[oi],
      sh = c.vs.filter(v => o.vs.includes(v));
    taken.add(ci).add(oi);
    noTrunk.add(ek(sh[0], sh[1]));
    const vs = [c.vs.find(v => !sh.includes(v)), sh[0], o.vs.find(v => !sh.includes(v)), sh[1]];
    cl.push({ vs, ...cen(vs), dd: (c.dd + o.dd) / 2, big: 1 });
  }
  cl = cl.filter((c, k) => !taken.has(k));
  cl.forEach((c, k) => (c.id = 'k' + k));
  /* 幹道：格子的邊先挑一棵樹（偏好往外的方向，路比較短），再加 1/4 當捷徑 */
  const ed = [];
  for (const v of Object.values(V))
    for (const [di, dj] of [
      [1, 0],
      [0, 1],
      [1, -1]
    ]) {
      const b = V[vk(v.i + di, v.j + dj)];
      if (!b || noTrunk.has(ek(v, b))) continue;
      const mx = (v.x + b.x) / 2,
        my = (v.y + b.y) / 2,
        rad = Math.abs(((b.x - v.x) * mx + (b.y - v.y) * my) / (dst(v, b) * Math.hypot(mx, my)));
      ed.push({ a: v, b, w: hsh(ed.length * 7 + 3) + (1 - rad) * 0.7 });
    }
  ed.sort((p, q) => p.w - q.w);
  const par = {},
    find = a => (par[a] === undefined || par[a] === a ? ((par[a] = a), a) : (par[a] = find(par[a])));
  const vid = new Map();
  for (const v of Object.values(V)) {
    const r = add({ id: 'v' + vid.size, x: v.x, y: v.y, th: 0, big: 0 });
    vid.set(v, r);
  }
  const base = (nd, v) => {
    /* 過路點照方向給基礎能力（鬥士：生命、護甲；遊俠：閃避、命中…） */
    const L = PT_BASE[road(v.x, v.y)],
      s = L[Math.floor(hsh(N.indexOf(nd) * 13 + 5) * L.length)];
    nd.s = { ...s };
    nd.n = '基礎';
    nd.ic = PT_STAT_IC[Object.keys(s)[0]];
  };
  for (const n of N) if (!n.gate) base(n, n);
  const trunk = (A, B, n) => {
    let prev = A;
    for (let k = 1; k <= n; k++) {
      const x = A.x + ((B.x - A.x) * k) / (n + 1),
        y = A.y + ((B.y - A.y) * k) / (n + 1),
        f = add({ id: 'x' + N.length, x, y, th: 0, big: 0 });
      base(f, f);
      link(prev, f);
      prev = f;
    }
    link(prev, B);
  };
  for (const e of ed) {
    const ra = find(vk(e.a.i, e.a.j)),
      rb = find(vk(e.b.i, e.b.j)),
      tree = ra !== rb;
    if (tree) par[ra] = rb;
    if (tree || hsh(e.a.i * 131 + e.a.j * 17 + e.b.i * 7 + e.b.j) < 0.27) {
      trunk(vid.get(e.a), vid.get(e.b), dst(e.a, e.b) > 378 ? 1 : 0);
      e.a.tk = (e.a.tk || 0) + 1;
      e.b.tk = (e.b.tk || 0) + 1;
    }
  }
  /* 起點接最近的 2 個頂點 */
  for (let g = 0; g < 6; g++) {
    const G = I['g' + g];
    for (const v of Object.values(V)
      .sort((p, q) => dst(p, G) - dst(q, G))
      .slice(0, 2))
      trunk(G, vid.get(v), Math.max(2, Math.round(dst(v, G) / 150)));
  }
  /* 叢集的主題（照 PoE2「區域權重抽樣＋距離排斥」）：照方向混合兩條路的權重，內圈多防禦、武器專精只在外圈，
     大叢集偏好武器與一整套的玩法；附近（約 3 步內）已經有的主題不抽 */
  const REP = 600,
    BIGT = new Set(['召喚', '圖騰砲台', '陷阱地雷', '格擋與盾']),
    byR = [...cl].sort((a, b) => a.dd - b.dd);
  for (const [ci, c] of byR.entries()) {
    const f = rgF(c.x, c.y),
      r0 = Math.floor(f) % 6,
      t = f - Math.floor(f),
      w = PT_THEME.map(
        (T, ti) =>
          (T.base ? 0 : T.rg[r0] * (1 - t) + T.rg[(r0 + 1) % 6] * t) *
          (T.wp ? (c.dd < 0.45 ? 0 : c.dd < 0.65 ? 0.3 : 0.8) : T.inner && c.dd < 0.35 ? 2.5 : 1) *
          (c.big ? (T.wp || BIGT.has(T.n) ? 2 : 0.6) : 1)
      );
    let ws = w;
    for (const rep of [REP, REP * 0.7, REP / 2, 0]) {
      const ban = new Set(byR.filter(b => b.th && dst(b, c) < rep).map(b => b.th)),
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
  /* 保底：每種武器至少 3 個專精叢集，從它那條路的外圈換 */
  const cnt = t => cl.filter(c => c.th === t).length;
  for (const [ti, T] of PT_THEME.entries())
    for (let need = T.wp ? 3 - cnt(ti) : 0; need > 0; need--) {
      const c = byR
        .filter(
          c =>
            road(c.x, c.y) === T.rg.indexOf(3) &&
            c.dd > 0.45 &&
            !PT_THEME[c.th].wp &&
            cnt(c.th) >= 5 &&
            !cl.some(b => b.th === ti && dst(b, c) < REP)
        )
        .pop();
      if (c) c.th = ti;
    }
  /* 叢集的點：入口朝主要的那個頂點，小點沿軌道往兩邊排，大點在兩條手臂的末端（最裡面） */
  const ntK = {},
    icK = {},
    smIc = s => PT_STAT_IC[Object.keys(s)[0]],
    note = (c, k) => {
      const T = PT_THEME[c.th],
        u = (ntK[c.th] = (ntK[c.th] || 0) + 1) - 1,
        L = PT_ICONS[T.n] || [T.ic],
        [n, s] = T.nt[u] || [T.n + '之心 ' + (u + 1), { [Object.keys(T.sm[0])[0]]: Object.values(T.sm[0])[0] * 2.5 }];
      /* 第三格：轉折大點接到哪個主題（連續塊在這裡切斷） */
      const tt = T.nt[u] && T.nt[u][2] ? { tt: PT_TH[T.nt[u][2]] } : {};
      return {
        n,
        s: { ...s },
        big: 1,
        ...tt,
        auto: T.nt[u] ? 0 : 1,
        ic: L[(icK[c.th] = (icK[c.th] || 0) + 1) % L.length]
      };
    };
  for (const [ci, c] of cl.entries()) {
    const T = PT_THEME[c.th],
      sides = c.vs.map((v, k) => [v, c.vs[(k + 1) % c.vs.length]]),
      inR = Math.min(...sides.map(([a, b]) => segD(c, a, b))),
      rp = Math.max(46, Math.min(c.big ? 112 : 76, inR - 42)),
      h = k => hsh(ci * 53 + k * 11);
    /* 入口：64% 一個、24% 兩個、12% 三個（內圈多樞紐）；主入口挑接得最少的頂點 */
    const ents = c.dd < 0.25 ? (h(1) < 0.45 ? 3 : h(1) < 0.75 ? 2 : 1) : h(1) < 0.7 ? 1 : h(1) < 0.95 ? 2 : 3,
      order = [...c.vs].sort((a, b) => a.pk - b.pk || dst(a, c) - dst(b, c)),
      main = order[0];
    let m = c.big ? 3 : h(2) < 0.8 ? 1 : 2,
      k = c.big ? 6 + Math.floor(h(3) * 3) : [2, 2, 2, 3, 3, 3, 4, 4, 5, 6][Math.floor(h(3) * 10)];
    if (m === 2 && k < 3) k = 3;
    const cap = Math.floor((2 * Math.PI * rp) / 46) - (m === 3 ? 0 : 0);
    while (k + Math.min(m, 2) > cap && k > 3) k--;
    const a1 = Math.ceil((k - 1) / 2),
      a2 = k - 1 - a1,
      slots = m === 1 ? 2 * (a1 + 1) : a1 + a2 + 3,
      dA = (2 * Math.PI) / slots,
      f0 = Math.atan2(main.y - c.y, main.x - c.x),
      at = (f, r = rp) => [c.x + Math.cos(f) * r, c.y + Math.sin(f) * r];
    /* 小點：主詞重複；4 成的叢集夾一個副詞 */
    const mainS = (ci + c.th) % T.sm.length,
      subAt = T.sm.length > 1 && h(4) < 0.4 ? 1 + Math.floor(h(5) * (k - 1)) : -1;
    let kk = 0;
    const small = f => {
      const s = T.sm[kk++ === subAt ? (mainS + 1) % T.sm.length : mainS];
      return add({
        id: `${c.id}_${N.length}`,
        ...(p => ({ x: p[0], y: p[1] }))(at(f)),
        n: T.n,
        s: { ...s },
        big: 0,
        th: c.th,
        ic: smIc(s) || T.ic
      });
    };
    const orb = (A, B) => ((ARC[A.id + '|' + B.id] = ARC[B.id + '|' + A.id] = [c.x, c.y, rp]), link(A, B));
    const ent = small(f0),
      arm = (dir, n) => {
        let p = ent;
        const out = [];
        for (let j = 1; j <= n; j++) {
          const q = small(f0 + dir * j * dA);
          orb(p, q);
          out.push(q);
          p = q;
        }
        return out;
      },
      A1 = arm(1, a1),
      A2 = arm(-1, a2),
      e1 = A1.at(-1) || ent,
      e2 = A2.at(-1) || ent,
      nts = [];
    const putN = (f, r = rp) => {
      const o = note(c),
        [x, y] = at(f, r);
      return nts.push(add({ id: `${c.id}_${N.length}`, x, y, th: c.th, ...o })), nts.at(-1);
    };
    if (m === 1) {
      const n1 = putN(f0 + Math.PI);
      orb(e1, n1);
      if (a2 === a1 && h(6) < 0.5) orb(e2, n1);
    } else {
      orb(e1, putN(f0 + (a1 + 1) * dA));
      orb(e2, putN(f0 - (a2 + 1) * dA));
      if (m === 3) link(nts[0], putN(0, 0));
    }
    link(vid.get(main), ent);
    main.pk++;
    /* 第二、三個入口：找離那個頂點最近的小點（不是主入口） */
    const smalls = [...A1, ...A2];
    for (const v of order.slice(1, ents)) {
      const q = smalls.sort((p, r) => dst(p, v) - dst(r, v))[0];
      if (!q) break;
      link(vid.get(v), q);
      v.pk++;
    }
  }
  /* 基石：每條路 2 個，接在那條路最外面的頂點，往外拉出去、只連 1 條線 */
  const ks = [];
  for (const [i, K] of PT_KEYS.entries()) {
    const vs = Object.values(V)
      .filter(v => road(v.x, v.y) === K.rg)
      .sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y));
    for (const v of vs) {
      const r = Math.hypot(v.x, v.y),
        p = { x: (v.x / r) * (r + 170), y: (v.y / r) * (r + 170) };
      if (ks.some(o => dst(o, p) < 420) || N.some(o => dst(o, p) < 90)) continue;
      const nd = add({ id: 'ks' + i, ...p, n: K.n, ic: K.ic, s: K.s, big: 2, th: PT_TH[PT_ROADS[K.rg].th] });
      link(vid.get(v), nd);
      ks.push(nd);
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

/* ---------- 昇華（0.2.25 重做）：不分職業，藏身處的昇華石碑直接選一個（免費換、點數退回），點畫在天賦樹中間挖空的地方 ----------
   8 點＝4 大 4 小：開局 2 點，第一次打倒階級 6、12、16 的王各 +2。
   每個昇華的結構不一樣（主幹、三選一、二選一），但一律照 PoE「小 → 大 → 小 → 大」（每個大點前面有自己的小點、小點後面只接大點），
   g 是選擇組（同組只能拿一個）；大點的 fx 是開關或數值（items.js 的 stats 讀），
   only＝綁武器（拿那種武器才生效）。每個大點用到的底層寫在企劃書 7.4 */
const ascPoints = s => 2 + (s.maxT > 6 ? 2 : 0) + (s.maxT > 12 ? 2 : 0) + (s.t16 ? 2 : 0);
const ASC = {
  wind: {
    n: '風行神射',
    ic: 'asc_hunter_c',
    d: '投射物與身法：用技能疊順風、標記一片敵人、幻影一起射。',
    /* [x, y, 名字或小點數值, 大點效果, 說明, 圖示, 選擇組]；結構照 PoE「小 → 大 → 小 → 大」，每個大點前面都有自己的小點 */
    N: {
      st: [0, 0],
      s1: [-85, 0, { ms: 4 }],
      gale: [
        -170,
        0,
        '聚風',
        { gale: 2 },
        '用技能時得到 1 層順風（最多 10 層），被擊中時順風全部掉光；每層順風再給移動速度 +2%、閃避值 +2%',
        'asc_hunter_b0'
      ],
      s2: [-255, 0, { evP: 15 }],
      walk: [-340, 0, '疾風化身', { windWalk: 1 }, '順風滿 10 層時：移動速度 +10%、投射物速度 +30%', 'asc_hunter_b5'],
      s3: [0, -75, { projP: 10 }],
      far: [
        -105,
        -150,
        '遠射',
        { farShot: 30 },
        '投射物飛得越遠傷害越高，飛到 500 以上時傷害更多 30%',
        'asc_hunter_b1',
        'shot'
      ],
      near: [
        0,
        -160,
        '近射',
        { nearShot: 30 },
        '投射物貼臉時傷害更多 30%，越遠越少，飛到 300（中距離）變成 0',
        'asc_hunter_b2',
        'shot'
      ],
      chain: [
        105,
        -150,
        '彈射',
        { chain: 1 },
        '投射物連鎖 +1（打中後彈向 260 內最近、還沒打過的敵人）',
        'asc_hunter_b3',
        'shot'
      ],
      s4: [0, -250, { as: 4 }],
      endless: [0, -335, '無盡箭矢', { proj: 1 }, '投射物 +1', 'asc_hunter_e'],
      s5: [75, 60, { accP: 10 }],
      falcon: [
        155,
        120,
        '獵鷹標記',
        { falcon: 1 },
        '每 3 秒標記 500 內全部沒有標記的敵人（佔標記位）；擊中被標記的敵人時傷害更多 10% 並消耗標記，每消耗一次熵值 +20，滿 100 得到一顆狂怒球',
        'asc_hunter_c0'
      ],
      s6: [255, 95, { critInc: 15 }],
      eye: [
        345,
        70,
        '靶心',
        { bullseye: 10 },
        '消耗獵鷹標記時，給那個敵人 10 層暴擊弱點（每層對它的擊中暴擊率 +0.5%，最多 20 層、每層 4 秒）',
        'asc_hunter_c1',
        'falc'
      ],
      s7: [200, 215, { as: 4 }],
      gust: [245, 295, '狂風', { frenzyMs: 4 }, '每顆狂怒球：移動速度與攻擊速度 +4%', 'asc_hunter_c2', 'falc'],
      s8: [-75, 70, { critX: 15 }],
      mirage: [
        -155,
        150,
        '幻影獵手',
        { mirageH: 1 },
        '擊中時熵值 +20，滿 100 在你身邊生成一個幻影（同時最多 2 個、存活 4 秒），隨機放你裝著的攻擊技能，傷害 ×0.6',
        'asc_hunter_b4'
      ]
    },
    E: 'st-s1 s1-gale gale-s2 s2-walk st-s3 s3-far s3-near s3-chain far-s4 near-s4 chain-s4 s4-endless st-s5 s5-falcon falcon-s6 s6-eye falcon-s7 s7-gust st-s8 s8-mirage'
  },
  iron: {
    n: '鐵金剛',
    ic: 'asc_phalanx_c',
    d: '盾與錘：靠格擋值吃傷害、用護甲打人，盾碎了反而衝上去。',
    N: {
      st: [0, 0],
      s1: [0, -75, { armorP: 15 }],
      wall: [
        0,
        -155,
        '鐵壁之盾',
        { shArmMore: 100, blockHalf: 1 },
        '副手拿盾時：盾的護甲更多 100%（格擋值跟著變大），格擋率減半',
        'asc_phalanx_b0'
      ],
      s2: [-85, -220, { blockValP: 25 }],
      push: [-145, -300, '重盾前進', { heavyShield: 1 }, '格擋值翻倍，每一下吸收 40% → 60%', 'asc_phalanx_b1', 'shd'],
      s3: [85, -220, { hpP: 5 }],
      stand: [
        145,
        -300,
        '不動如山',
        { unmov: 1 },
        '格擋值大於 0 時不會被擊退、不會重度暈眩；格擋值碎掉後 5 秒跑滿（原本 8 秒）',
        'asc_phalanx_e',
        'shd'
      ],
      s4: [75, 55, { w_mace: 15 }],
      mass: [
        155,
        115,
        '重如泰山',
        { only: 'mace', addArm: 3 },
        '持錘時：攻擊擊中附加等於護甲 3% 的物理傷害',
        'asc_crusher_b0'
      ],
      s5: [255, 85, { hsP: 15 }],
      stun: [345, 60, '震懾之錘', { hsArm: 10 }, '物理擊中的重暈累積：每 1000 護甲提高 10%', 'asc_crusher_b1', 'mace'],
      s6: [200, 210, { armorP: 15 }],
      anvil: [
        245,
        295,
        '鐵砧之重',
        { armBreakArm: 5 },
        '擊中時依你護甲的 5% 對敵人破甲（普通怪 ×3、菁英 ×2）',
        'asc_crusher_e',
        'mace'
      ],
      s7: [-80, 45, { ms: 4 }],
      dash: [
        -165,
        95,
        '捨身突襲',
        { sacrifice: 1 },
        '格擋值碎掉時：2 秒內移動速度 +30%、物理傷害更多 15%',
        'asc_paladin_b0'
      ],
      s8: [-250, 140, { hsP: 15 }],
      cycle: [
        -335,
        185,
        '鋼鐵循環',
        { steelCycle: 1 },
        '格擋值吸收的傷害累積起來（最多到最大生命），下一次擊中時加上等量的重暈累積，然後清空',
        'asc_paladin_e'
      ]
    },
    E: 'st-s1 s1-wall wall-s2 s2-push wall-s3 s3-stand st-s4 s4-mass mass-s5 s5-stun mass-s6 s6-anvil st-s7 s7-dash dash-s8 s8-cycle'
  },
  /* 0.2.26 第二批 */
  hell: {
    n: '地獄火',
    ic: 'asc_pyro_c',
    d: '火與點燃：魔力換成地獄火，放技能越放越熱，滿了會自爆。',
    N: {
      st: [0, 0],
      s1: [0, -70, { mpP: 15 }],
      pact: [
        0,
        -145,
        '炎魔契約',
        { hellfire: 1 },
        '最大魔力換成 2 倍的地獄火：放技能不扣魔力，改成累積地獄火；滿了自爆（受到等於最大生命＋能量護盾的火焰傷害，吃火焰抗性）並清空；2 秒沒累積，每秒消退 25%',
        'asc_pyro_c0'
      ],
      c1: [-150, -215, { spellP: 10 }],
      boil: [-215, -300, '沸騰之軀', { boil: 20 }, '地獄火高於一半時，法術傷害更多 20%', 'asc_pyro_b0'],
      c2: [-50, -220, { fireP: 10 }],
      reborn: [
        -72,
        -310,
        '灰燼重生',
        { reborn: 20 },
        '自爆後 4 秒內放技能不累積地獄火、火焰傷害更多 20%',
        'asc_pyro_b1'
      ],
      c3: [50, -220, { hpP: 5 }],
      devour: [72, -310, '業火吞噬', { devour: 10 }, '擊殺被點燃的敵人時，地獄火 −10%（最大值的）', 'asc_pyro_b2'],
      c4: [150, -215, { castP: 4 }],
      touch: [
        215,
        -300,
        '炎魔之觸',
        { hfFlam: 10 },
        '累積地獄火時，300 內的敵人易燃 +10%（被點燃的機率）',
        'asc_pyro_b3'
      ],
      s2: [65, 60, { fireP: 10 }],
      shaper: [
        135,
        120,
        '火焰塑造者',
        { shaper: 30 },
        '物理、冰冷、閃電的擊中也會累積易燃；點燃傷害提高 30%',
        'asc_pyro_c1'
      ],
      f1: [230, 90, { ailMag: 10 }],
      spread: [330, 60, '焚城', { igSpread: 1 }, '被點燃的敵人死掉時，點燃傳給 200 內的其他敵人', 'asc_pyro_b4'],
      f2: [225, 170, { fireP: 10 }],
      ember: [310, 190, '餘燼', { ember: 25 }, '點燃傷害更多 25%、持續時間 −25%', 'asc_pyro_b5'],
      f3: [170, 215, { pen: 5 }],
      scorch: [
        215,
        275,
        '焦土',
        { fireExp: 15 },
        '點燃中的敵人被火焰曝露：火焰抗性 −15%（魔法、稀有、王少一點）',
        'asc_pyro_e'
      ],
      f4: [110, 215, { eleP: 10 }],
      purg: [110, 300, '煉獄轉化', { cvCF: 25, cvLF: 25 }, '冰冷、閃電傷害的 25% 轉成火焰（不轉物理）', 'asc_pyro_c2'],
      s3: [-75, 60, { resF: 12 }],
      lava: [
        -155,
        125,
        '熔岩之膚',
        { maxResF: 5, resF: -30, physAsFire: 20 },
        '最大火焰抗性 +5%、火焰抗性 −30%；承受的物理傷害 20% 當作火焰傷害承受',
        'asc_storm_e'
      ]
    },
    E: 'st-s1 s1-pact pact-c1 c1-boil pact-c2 c2-reborn pact-c3 c3-devour pact-c4 c4-touch st-s2 s2-shaper shaper-f1 f1-spread shaper-f2 f2-ember shaper-f3 f3-scorch shaper-f4 f4-purg st-s3 s3-lava'
  },
  shade: {
    n: '影舞者',
    ic: 'asc_shadow_c',
    d: '閃避反擊與暗影暴擊：完美閃避、暴擊球、暴擊施放一起炸。',
    N: {
      st: [0, 0],
      s1: [-85, 0, { evP: 15 }],
      after: [
        -170,
        0,
        '殘影步',
        { perfWin: 0.24, perfMore: 20 },
        '完美閃避的判定 0.16 → 0.24 秒；完美閃避後 2 秒內傷害更多 20%，並重置翻滾冷卻',
        'asc_shadow_b0'
      ],
      s2: [-255, 0, { ms: 4 }],
      strike: [-340, 0, '影襲', { rollBlind: 5 }, '翻滾穿過敵人時，給它致盲與 5 層暴擊弱點', 'asc_shadow_b1'],
      s3: [0, -75, { critInc: 15 }],
      deadly: [
        0,
        -155,
        '致命陰影',
        { powCritE: 25, powCritX: 15 },
        '暴擊時熵值 +25，滿 100 得到一顆暴擊球；每顆暴擊球暴擊傷害 +15%',
        'asc_shadow_c0'
      ],
      s4: [-85, -220, { as: 4 }],
      hunt: [
        -145,
        -300,
        '弱點獵殺',
        { cwHit: 1, cwMax: 40 },
        '任何攻擊擊中都給 1 層暴擊弱點；暴擊弱點上限 20 → 40 層',
        'asc_shadow_b2'
      ],
      s5: [85, -220, { critX: 15 }],
      reap: [
        145,
        -300,
        '暗影收割',
        { reap: 20 },
        '暴擊擊殺時消耗 1 顆暴擊球，在原地爆炸，120 內的敵人受到它最大生命 20% 的物理傷害',
        'asc_shadow_e'
      ],
      s6: [75, 60, { castP: 4 }],
      hex: [
        155,
        120,
        '影咒',
        { hexCoc: 15 },
        '暴擊施放每次暴擊的能量 +10 → +20；觸發施放的法術傷害更多 15%',
        'asc_curse_c0'
      ],
      s7: [255, 95, { spellP: 10 }],
      burst: [
        345,
        70,
        '咒爆',
        { hexBurst: 1 },
        '任何一顆暴擊施放能量滿 100 時，所有插了暴擊施放的法術一起放',
        'asc_curse_e'
      ]
    },
    E: 'st-s1 s1-after after-s2 s2-strike st-s3 s3-deadly deadly-s4 s4-hunt deadly-s5 s5-reap st-s6 s6-hex hex-s7 s7-burst'
  }
};
/* 一個昇華的點與線（id 加 a_ 前綴，跟天賦樹分開） */
function ascNodes(k) {
  const A = ASC[k];
  if (!A) return null;
  const N = Object.entries(A.N).map(([id, [x, y, n, fx, d, ic, g]]) => ({
    id: 'a_' + id,
    x,
    y,
    asc: 1,
    big: id === 'st' ? 3 : fx ? 1 : 0,
    n: id === 'st' ? A.n : fx ? n : '昇華小點',
    ic: id === 'st' ? A.ic : ic || PT_STAT_IC[Object.keys(n)[0]] || null,
    s: fx ? {} : n || {},
    fx: fx || null,
    d: d || '',
    g: g || null
  }));
  const E = A.E.split(' ').map(e => e.split('-').map(s => 'a_' + s)),
    ADJ = {};
  for (const [a, b] of E) (ADJ[a] = ADJ[a] || []).push(b), (ADJ[b] = ADJ[b] || []).push(a);
  return { N, E, ADJ, I: Object.fromEntries(N.map(n => [n.id, n])) };
}
/* 這組點還能不能補成剛好 4 小 4 大（連著點、同一個選擇組只拿一個）；tree.js 點之前、check.js 都用 */
function ascFeasible(T, set) {
  const memo = new Set(),
    cnt = cur => {
      let sm = 0,
        bg = 0;
      for (const id of cur) if (id !== 'a_st') T.I[id].big ? bg++ : sm++;
      return [sm, bg];
    },
    grpOK = cur => {
      const g = [...cur].map(id => T.I[id].g).filter(Boolean);
      return new Set(g).size === g.length;
    },
    go = cur => {
      const [sm, bg] = cnt(cur);
      if (sm > 4 || bg > 4 || !grpOK(cur)) return false;
      if (sm === 4 && bg === 4) return true;
      const key = [...cur].sort().join();
      if (memo.has(key)) return false;
      memo.add(key);
      for (const id of cur) for (const o of T.ADJ[id] || []) if (!cur.has(o) && go(new Set([...cur, o]))) return true;
      return false;
    };
  return go(new Set(set));
}

const ROLL = { t: 0.32, dist: 175, iframe: 0.26, cd: 0.55, perfect: 0.16, slow: 0.55, slowScale: 0.3 };
/* 藥水：紅水（1）回生命、藍水（2，0.2.13）回魔力，瓶數分開算 */
const FLASK = { n: 3, heal: 0.5, mp: 0.5, t: 1.4, perKill: 0.12 };

/* ---------- 地圖：階級 1～16，打倒王開放下一階；費用與地圖卡在 maps.js ---------- */
const TMAX = 16;
/* 怪物等級：生命、傷害跟著階級長 */
const tierMul = t => ({ hp: Math.pow(1.32, t - 1), dmg: Math.pow(1.2, t - 1) });
/* 0.2.27：前幾階放寬（T1～T3 兩成，T4、T5 漸回，避免 T3→T4 斷層）；只影響怪物生命與傷害，經驗、護甲、異常門檻仍看 tierMul */
const TIER_EASE = [0.8, 0.8, 0.8, 0.87, 0.93];
const tierMob = t => {
  const m = tierMul(t),
    e = TIER_EASE[t - 1] || 1;
  return { hp: m.hp * e, dmg: m.dmg * e };
};
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
    aff: ['dmgP', 'flat', 'fire', 'cold', 'light', 'chaos', 'as', 'crit', 'critX', 'loh', 'spellP', 'acc']
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
    aff: ['life', 'armor', 'ev', 'mp', 'critInc', 'aoe', 'acc', 'resF', 'resC', 'resL', 'resX', 'es', 'spirit']
  },
  chest: {
    n: '胸甲',
    sz: [2, 3],
    aff: ['life', 'armor', 'ev', 'regen', 'resF', 'resC', 'resL', 'resX', 'es', 'spirit']
  },
  gloves: {
    n: '手套',
    sz: [2, 2],
    aff: ['life', 'armor', 'ev', 'flat', 'fire', 'cold', 'light', 'as', 'loh', 'acc', 'resF', 'resC', 'resL', 'es']
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
      'acc',
      'regen',
      'resF',
      'resC',
      'resL',
      'resX',
      'resA',
      'es'
    ]
  },
  quiver: {
    n: '箭袋',
    sz: [2, 3],
    aff: ['life', 'flat', 'fire', 'cold', 'light', 'as', 'critInc', 'critX', 'acc', 'resA']
  },
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
/* 8 類詞綴類別：鍛造時選一類（免費）決定對哪一類詞下手 */
const ACLS = [
  { k: 'life', n: '生命', ic: 'asc_s_heart', aff: ['life', 'regen', 'loh', 'flask'] },
  { k: 'def', n: '防禦', ic: 'asc_s_shield', aff: ['armor', 'ev', 'es', 'block'] },
  { k: 'ele', n: '元素', ic: 'asc_s_flame', aff: ['fire', 'cold', 'light', 'chaos'] },
  { k: 'phys', n: '物理', ic: 'asc_s_sword', aff: ['dmgP', 'flat'] },
  { k: 'crit', n: '暴擊', ic: 'asc_s_eye', aff: ['crit', 'critX', 'acc'] },
  { k: 'speed', n: '速度', ic: 'asc_s_wind', aff: ['as', 'ms'] },
  { k: 'spell', n: '法術', ic: 'sup_sp_fastcast', aff: ['spellP', 'mp', 'aoe', 'spirit'] },
  { k: 'res', n: '抗性', ic: 'sup_ln_iron', aff: ['resF', 'resC', 'resL', 'resX', 'resA'] }
];
const ACLSI = Object.fromEntries(ACLS.map(x => [x.k, x]));
const affCls = k => (ACLS.find(x => x.aff.includes(k)) || {}).k;
/* 開孔（0.2.35）花粉：2→3 孔 粗粉 ×30、3→4 孔 精粉 ×15、4→5 孔 稀粉 ×5（鑿孔石刪掉了） */
const DRILL = [
  ['dust', 30],
  ['fine', 15],
  ['rare', 5]
];
const GEM_SO_MAX = 5;
/* 靈魂升級寶石：L 級升 L+1 要 10 × 1.35^L（主動、輔助、光環同價） */
const soulCost = L => Math.round(10 * Math.pow(1.35, L));
/* 三種粉（0.2.24 取代 8 類碎片）：粗粉＝強化、精粉＝添加與同類置換、稀粉＝跨類置換與定向重鑄 */
const DUSTS = { dust: '粗粉', fine: '精粉', rare: '稀粉' };
/* 鍛造要的粉：物品等級越高越多 */
const dustCost = (it, k = 'dust') =>
  k === 'dust' ? Math.round(8 * (1 + it.L / 3)) : 1 + Math.floor(it.L / (k === 'fine' ? 20 : 30));
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
  acc: { p: 0, n: '命中值 +{}', r: [10, 400] },
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
