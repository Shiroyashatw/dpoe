# PoE 技能類型與技能體系（研究筆記，2026-11-02）

用途：在已照 PoE2 改寫的底層（傷害、防禦、異常、球體、buff、詛咒）之上，一層一層設計 **武器技能 → 天賦樹 → 職業**。本檔只做盤點與建議，不改程式。

- 以 **PoE2 為主**（資料版本約 0.5「Runes of Aldur」），PoE1 對照。
- ⚠️ ＝ 沒有在一手資料裡確認、靠記憶或推論，用之前要再查。
- 數量都是從資料檔算的，含「同名不同階」（例如 Brutality I／II／III 算 3 顆）時會註明。

## 0. 資料來源

| 代號 | 來源 | 拿來做什麼 |
| --- | --- | --- |
| **[PoB2]** | Path of Building PoE2 的遊戲資料：<https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/tree/dev/src/Data>（`Gems.lua`、`Skills/act_*.lua`、`sup_*.lua`、`minion.lua`、`other.lua`） | PoE2 每顆寶石的標籤（tags）、技能類型（skillTypes）、需要的武器（weaponTypes）、說明、輔助的分類（`gemFamily`） |
| **[PoB1]** | Path of Building PoE1：<https://github.com/PathOfBuildingCommunity/PathOfBuilding/tree/dev/src/Data> | PoE1 標籤、變異（Vaal）技能的靈魂數、儲存次數、靈魂獲取冷卻 |
| [db-skill] | <https://poe2db.tw/us/Skill_Gems>（427 顆主動） | 標籤篩選列表、交叉核對 |
| [db-sup] | <https://poe2db.tw/us/Support_Gems>（557 顆輔助） | 輔助分類規則、族裔（Lineage）規則、Meta 寶石規則 |
| [db-ammo] | <https://poe2db.tw/us/Ammunition> | 弩的彈藥技能 |
| [db-wand]／[db-staff]／[db-sceptre] | <https://poe2db.tw/us/Wands>、<https://poe2db.tw/us/Staves>、<https://poe2db.tw/us/Sceptres> | 法器武器「自帶技能（Grants Skill）」 |
| [pn0.2]／[pn0.3]／[pn0.4]／[pn0.5] | <https://poe2db.tw/us/Version_0.2.0>、<https://poe2db.tw/us/Version_0.3.0>、<https://poe2db.tw/us/Version_0.4.0>、<https://poe2db.tw/us/Version_0.5.0>（官方 patch notes 轉載） | 規則改動時間點 |
| [db1-vaal] | <https://poedb.tw/us/Vaal_Gems> | 變異寶石（頁面內容很少，主要數字取自 [PoB1]） |

官方論壇 patch notes（pathofexile.com/forum）用 curl 抓會被擋，改用 poe2db 的轉載。poewiki／poe2wiki 沒有使用。

---

## 1. 技能標籤總表

PoE 的「標籤」有兩層：
- **寶石標籤（gem tags）**：寶石上看得到的字（Attack、Projectile…），主要給玩家看、給天賦或裝備詞綴「對某標籤 +X」用。
- **技能類型（skillTypes）**：引擎內部用的旗標，**輔助能不能插** 是看這個（例如 `CrossbowAmmoSkill`、`Cascadable`、`DetonatesAfterTime`、`PerfectTiming`）。所以有些輔助的條件比寶石標籤更細。[PoB2]

PoE2 寶石標籤出現次數（[PoB2] `Gems.lua`，967 顆寶石含輔助）：area 321、attack 285、duration 212、buff 158、persistent 157、spell 155、projectile 147、melee 135、trigger 111、minion 82、repeatable 77、lineage 75、strike 51、slam 37、payoff 36、sustained 36、channelling 33、conditional 30、meta 29、ammunition 28、warcry 24、remnant 23、shapeshift 21、nova 20、totem 20、chaining 17、curse 16、aura 15、travel 14、mark 11、companion 11、grenade 11、detonator 10、hazard 10、plant 10、storm 9、stages 9、wind 9、command 8、bear 7、herald 7、wyvern 6、wolf 6、orb 5、invocation 5、merging 4、banner 4。

### 1.1 兩代都有的標籤

| 標籤 | 代表的機制 | 吃它的輔助（例） | PoE2 |
| --- | --- | --- | --- |
| **Attack 攻擊** | 用武器傷害、吃攻速與命中 | Rapid Attacks、Close Combat、Elemental Armament、Pin | 有，而且大多數攻擊 **綁武器類別**（見第 3 節） |
| **Spell 法術** | 用技能本身的基礎傷害、吃施法速度 | Spell Echo、Rapid Casting、Considered Casting、Unleash、Wildshards（法術投射物） | 有，**不限武器** |
| **Melee 近戰** | 近身打擊 | Rage、Brink、Culmination、Combo Finisher | 有；再細分 Strike／Slam |
| **Strike 打擊** | 單次揮擊命中前方 | Impact Shockwave（打擊附帶震波）、Ancestral Call、Practiced Combo、Crescendo（有「最終一擊」的技能） | 有（51） |
| **Slam 重擊** | 砸地、範圍、慢 | Aftershock、Fist of War、Tectonic Slams | 有（37）；PoE2 用來產生「碎裂地面／餘震」 |
| **Projectile 投射物** | 飛行物 | Pierce、Fork、Chain、Multishot、Projectile Acceleration／Deceleration、Ricochet | 有 |
| **AoE 範圍** | 有範圍半徑 | Magnified Area、Concentrated Area | 有 |
| **Duration 持續時間** | 效果有秒數 | Prolonged Duration、Compressed Duration | 有 |
| **Chaining 連鎖** | 打中後跳到下一個目標 | Chain | 有（17） |
| **Nova 新星** | 從自己為中心往外擴散 | 通常吃 AoE 類 | 有（20） |
| **Orb 球體（場上的）** | 放在地上、持續發射的球 | Remnant 類、Duration 類 | 有（5：Orb of Storms、Frost Bomb、Galvanic Field…）。⚠️ 注意這不是我們底層的「三種球體＝耐力／狂怒／暴擊球」，名字會撞 |
| **Minion 召喚物** | 召出單位 | Meat Shield、Infernal Legion、Hulking Minions、Last Gasp、Minion Pact | 有 |
| **Totem 圖騰** | 放下不會動的單位代替你施放 | Hardy／Reinforced／Urgent Totems、Splinter Totem | 有，但沒有 PoE1 的「Spell Totem 輔助」，改成 **Spell Totem 這顆 Meta 寶石** |
| **Warcry 戰吼** | 冷卻制的吼叫，強化之後的攻擊 | Echoing Cry、Enraged Warcry、Corrupting Cry、Battershout、Exposing Cry | 有；PoE2 戰吼冷卻可「花一顆耐力球跳過」 |
| **Aura 光環** | 持續影響你／盟友或敵人的範圍 | 光環沒有專屬輔助，走 Persistent 類 | 有；PoE2 光環都是 **Persistent＋預留精魄（Spirit）** |
| **Herald 傳令** | 殺死特定狀態的敵人時觸發爆炸等效果 | Deadly Herald | 有（5 顆：Ash、Ice、Thunder、Blood、Plague） |
| **Curse 詛咒** | 範圍套負面效果 | Heightened Curse、Focused Curse、Ritualistic Curse、Hex Bloom、Decaying Hex、Cursed Ground | 有（5 顆可掉落：Despair、Vulnerability、Temporal Chains、Elemental Weakness、Enfeeble）；PoE2 詛咒是「延遲後落下」的範圍 |
| **Mark 標記** | 單體標記，觸發條件達成時引爆 | Mark for Death、Eternal Mark、Charged Mark、Mark of Siphoning | 有；PoE1 的標記算詛咒的一種，PoE2 獨立出來 |
| **Channelling 引導** | 按住持續 | Steadfast | 有（33） |
| **Travel 位移** | 會移動角色的技能 | — | 有（14）；PoE1 另有 Movement、Blink 標籤 |
| **Trigger 觸發** | 不是自己按，由條件觸發 | Energy Retention、Boundless Energy（產生能量的） | 有，而且大幅擴充（見 Meta） |
| **Banner 旗幟** | 插旗給範圍 buff | Daresso's Passion（族裔） | 有（3），PoE2 改成累積 Glory 才能插 |
| **Fire／Cold／Lightning／Chaos／Physical** | 傷害類型 | Attunement、Penetration、Exposure、Mastery | 有 |

### 1.2 PoE2 新增或改名的標籤

| 標籤 | 代表的機制 | 吃它的輔助（例） |
| --- | --- | --- |
| **Ammunition 彈藥** | 弩的「裝填 → 連射 → 再裝填」技能。每種彈藥是一顆技能，按下去先裝彈，之後每按一次射一發，彈夾打完要重裝 | Double Barrel、Fresh Clip、Auto Reload、Ammo Conservation、Streamlined Rounds（輔助條件是 `CrossbowAmmoSkill`） |
| **Grenade 手雷** | 弩射出會彈跳的手雷，引信時間到才爆 | Adhesive Grenades（黏住不彈）、Payload、Long Fuse／Short Fuse（`DetonatesAfterTime`） |
| **Detonator 引爆器** | 能「提早引爆」場上可爆物（手雷、毒氣雲、油、屍體） | — |
| **Remnant 殘留物** | 技能或擊殺在地上留下可撿的東西，撿了得到效果（法術的 **Infusion 元素灌注**、回血、回魔） | Remnant Potency、Harmonic Remnants、Selfless Remnants、Magnetic Remnants |
| **Payoff 收割** | 消耗某個狀態換大傷害（消耗凍結、消耗 Parried、打「完全破甲」的敵人、消耗流血） | 看機制 |
| **Conditional 條件** | 要先累積資源才能放（Glory 榮耀、Combo 連擊數） | Culmination、Combo Finisher |
| **Sustained 持續存在** | 放出去會在場上持續一段時間的東西（牆、地面、球、彈幕） | Duration 類 |
| **Repeatable 可重複**（0.3 前叫 Barrageable） | 可以被 Barrage／Ice-Tipped Arrows「重複射出」的弓、擲矛攻擊；法術也有 | Barrage 這顆技能本身 |
| **Staged／Stages 階段** | 越按越強、有層數 | — |
| **Merging 合併** | 碎片彈打中同一點會合併變大 | — |
| **Meta 元技能** | 一顆「插其他技能的技能」：Cast on X、Invocation、Spell Totem、Mortar Cannon、Mirage Archer、Blasphemy… | Energy Retention、Energy Capacitor（Invocation 專用） |
| **Invocation 祈喚** | Meta 的一種：條件達成時存能量，**手動按下**一次放出（能量夠可放多次） | Energy Capacitor |
| **Persistent 常駐** | 開了就一直在、預留精魄（光環、傳令、召喚物、Cast on X） | — |
| **Companion 夥伴** | 單一隻會復活的強力召喚（獵豹、狼群、地獄犬、馴服的野獸） | 吃 Minion 類 |
| **Command 指令** | 召喚物平常不動，你下指令才出招（PoE2 的骷髏每種都有一個 Command 技能；Djinn 系列） | Bidding |
| **Shapeshift 變身**（含 Bear 熊、Werewolf 狼人、Wyvern 飛龍） | 用技能時變成動物形態出招 | Helbrym's Hide（族裔） |
| **Hazard 機關** | 放在地上、敵人踩到才觸發（Spearfield、Ice Shards、Trail of Caltrops）——PoE2 版的陷阱 | Controlled Hazard、Rearm、Delayed Reaction |
| **Plant 植物** | 種出會打人的植物，可被毒、被雷暴「催長」 | — |
| **Storm 風暴** | 指定區域的持續天氣（Firestorm、Thunderstorm、Tornado、Mana Tempest） | — |
| **Wind 風** | 產生旋風，可被其他技能吸收（Whirling Slash 的旋風被 Twister 吃掉變多道） | — |
| **Lineage 族裔** | 終局才掉、會改變玩法的輔助，**全身只能插一顆同名** | — |

### 1.3 PoE1 有、PoE2 沒有的標籤

| 標籤 | 機制 | PoE1 代表 | PoE2 |
| --- | --- | --- | --- |
| **Vaal 變異** | 見 2.B.1 | 54 顆 | 沒有（0.4 聯盟叫「Fate of the Vaal」但不是 Vaal 技能）[PoB2 無 vaal 標籤] |
| **Trap 陷阱** | 丟出去，敵人靠近時觸發 | Bear Trap、Fire Trap、Lightning Trap、Seismic Trap…（27 含轉換） | 沒有；最接近的是 **Hazard** |
| **Mine 地雷** | 丟出去，自己引爆（3.x 改為地雷有光環、自動引爆 ⚠️） | Icicle Mine、Pyroclast Mine、Stormblast Mine、Smoke Mine | 沒有 |
| **Brand 烙印** | 貼在敵人身上定時觸發，敵人死了會在地上找下一個 | Storm Brand、Armageddon Brand、Penance Brand、Wintertide Brand、Arcanist Brand、Brand Recall | 沒有 |
| **Golem 魔像** | 一隻常駐召喚物＋給主人一個 buff | Summon Flame／Ice／Lightning／Chaos／Stone／Carrion Golem | 沒有 |
| **Hex 咒術** | 不是標記的那種詛咒 | Despair、Temporal Chains… | 併回 Curse |
| **Blink 閃現／Movement** | 位移技能分類 | Flame Dash、Frostblink、Dash、Withering Step | 用 Travel；PoE2 有閃避翻滾，位移技能少很多 |
| **Link 連結** | 綁定盟友（主要給召喚物） | Flame Link、Protective Link、Soul Link… | 沒有 |
| **Guard 守護** | 互斥的防禦 buff（同時只能一個） | Steelskin、Molten Shell、Immortal Call、Arcane Cloak | PoE2 有 Guard 這個「效果」（Fortifying Cry、Encase in Jade 給），不是標籤 |
| **Stance 架勢** | 二選一的切換 buff | Blood and Sand、Flesh and Stone | 沒有 |
| **Retaliation 反擊** | 被打／格擋後短時間能用 | Vengeful Cry、Shield of Light、Eviscerate | 沒有；PoE2 的 **Parry 招架** 取代這個角色 |
| **Arcane 秘術** | 消耗魔力相關 | Manabond、Arcane Cloak | 沒有 |
| **Awakened 覺醒** | 輔助的強化版（38 顆） | Awakened Added Fire… | 沒有；PoE2 改成 **輔助分階（I／II／III）＋族裔** |
| **Exceptional** | 只有特殊來源（Enlighten、Empower、Enhance） | — | 沒有 |
| Sigil | PoE1 只有 **Sigil of Power** 一顆（站在符文圈裡加法術傷害） | Sigil of Power | PoE2 還有 Sigil of Power，但改成 **法杖自帶技能**（[db-staff]） |
| Mirage | PoE1 不是標籤，是 Mirage Archer 輔助、General's Cry、Saboteur ⚠️ | — | PoE2 改成 Meta 寶石：Mirage Archer（翻滾時產生分身射擊） |
| Ballista | PoE1 是 Totem 的子類（Artillery、Shrapnel、Siege Ballista） | — | PoE2 保留，**只能用弩**（Artillery Ballista、Siege Ballista、Mortar Cannon） |

---

## 2. 技能體系（玩法家族）

### 2.A PoE2

每個家族：**核心機制**／代表技能／武器／常搭的輔助與底層。技能說明是從 [PoB2] 的 description 摘譯。

#### A1. 弩：彈藥（Ammunition）
- **核心**：每種彈藥是一顆技能，**按一下裝彈、之後連射、打完重裝**；裝不同彈藥＝換一種射擊。弩的預設攻擊 Crossbow Shot 也算彈藥。重裝會打斷輸出，所以「裝填時間」是節奏的核心。[db-ammo]
- **代表**：
  - **Armour Piercing Rounds**：一個彈夾的快速子彈，破甲。
  - **Permafrost Bolts**：冰彈在飛行中碎裂，非常容易凍結。
  - **High Velocity Rounds**：穿透，對「完全破甲」的敵人施加 Riven Armour（收割破甲）。
  - **Fragmentation Rounds**：碎片彈，打到凍結的敵人會消耗凍結炸開、打冰晶會引爆冰晶。
  - **Rapid Shot**：大彈夾，連射累積「熱量」，滿了不能射，但其他技能可以消耗熱量。
  - **Galvanic Shards**：碎片打中放出連鎖閃電；**Plasma Blast**：要長時間蓄力的穿透大砲。
  - **Siege Cascade**／**Hailstorm Rounds**：往天上射，落在目標區域每個敵人附近（Hailstorm 會被動累積冰彈，一次全部射出）。
  - **Emergency Reload**：立刻重裝全部彈夾並強化一段時間。
- **武器**：弩（Crossbow）。
- **常搭**：Double Barrel（多裝一發）、Fresh Clip、Auto Reload、Ammo Conservation；底層用 **凍結→碎片收割**、**破甲→穿甲彈收割**。

#### A2. 弩：手雷（Grenade）、迫擊砲與砲台
- **核心**：手雷會 **彈跳**、**引信時間到才爆**；**Detonator（引爆器）技能**可以提早引爆。手雷有冷卻與次數 ⚠️。毒氣雲與油可以被「燃燒或引爆器」點燃 → **場上佈置＋引爆** 的連段。
- **代表**：
  - **Explosive Grenade**：火焰大爆炸，本身也是引爆器。
  - **Gas Grenade**：毒氣雲，被燃燒或引爆器打到變成火爆。
  - **Oil Grenade**：灑油，油可被引爆器或燃燒地面點燃。
  - **Flash Grenade**：致盲＋暈眩。**Cluster Grenade**：爆開再丟出一圈小手雷。**Voltaic Grenade**（電）。
  - **Explosive Shot**（彈藥，引爆器）：射中會連帶引爆範圍內的手雷。
  - **Mortar Cannon**（Meta＋Totem）：放一座砲台，用插在裡面的手雷技能，冷卻大幅加快。
  - **Artillery Ballista**（落下釘住、致殘的弩箭雨）、**Siege Ballista**（往天上射、落地後爆）。
- **武器**：弩。
- **常搭**：Adhesive Grenades、Long／Short Fuse、Payload；圖騰的 Hardy／Urgent Totems。

#### A3. 長棍（Quarterstaff）：連擊、力量球、冰晶
- **核心**：**快速連按會進入第 3、第 4 段**（Ice Strike 3 段、Tempest Flurry 第 4 段落雷）；**Combo 連擊數**由「其他技能打中」累積，滿了才能放大招（Conditional）；**Killing Palm 撲殺 → 拿力量球 → Falling Thunder／Charged Staff 消耗力量球**；冰晶（Ice Crystal）可被收割技能引爆。
- **代表**：
  - **Ice Strike**：快速冰擊，連按三次出慢而強的最終一擊。
  - **Tempest Flurry**：連續打擊，第 4 次落下感電雷。
  - **Killing Palm**：衝到敵人面前，血量低就處決，每殺一隻給力量球。
  - **Falling Thunder**：砸地＋消耗力量球往前射閃電。
  - **Tempest Bell**／**Mantra of Destruction**：累積 Combo 後放大鐘／下一擊加混沌。
  - **Glacial Cascade**：冰裂往前，最後一根冰刺消耗凍結、引爆冰晶。**Vaulting Impact**：跳躍位移。
- **武器**：長棍（[PoB2] 的 weaponTypes 寫 `Staff`，指的是 Quarterstaff ⚠️）。
- **常搭**：Crescendo（有最終一擊的技能）、Practiced Combo、Combo Finisher；底層用 **力量球、凍結、致盲、Daze**。
- **招架**：長棍本身沒有 Parry；PoE2 的 **Parry 是小圓盾（Buckler）自帶的技能**。⚠️（使用者以為長棍有招架，查資料是矛＋小圓盾）

#### A4. 矛（Spear）：近戰／投擲雙模、招架、狂怒球
- **核心**：**同一把武器可近戰（Spear Stab）也可擲矛（Spear Throw）**；擲矛類 **消耗狂怒球** 變強；搭 **小圓盾 Parry** 讓敵人進入 **Parried（失衡）** 狀態，之後的技能 **收割 Parried**；旋風（Wind）可被 Twister 吃掉。
- **代表**：
  - **Spear Throw**（預設）：擲矛，消耗狂怒球在終點爆炸。
  - **Lightning Spear**：擲矛打中後向周圍射閃電，有狂怒球就分裂多根。
  - **Explosive Spear**：插在地上、時間到或被引爆就爆，消耗狂怒球立刻爆並留燃燒地面（引爆器）。
  - **Rake**：衝刺斬，流血。**Blood Hunt**：刺穿失血的敵人引發血爆（收割流血）。
  - **Disengage**：後跳，收割 Parried 給狂怒球；**Fangs of Frost**：打 Parried 的敵人炸出冰霜並留冰緩地面。
  - **Whirling Slash**（捲起旋風、離開就收束爆開）＋ **Twister**（龍捲往前，吃掉旋風變多道）。
  - **Spearfield**（Hazard）：前方地面竄出矛陣，敵人碰到才爆。
- **武器**：矛；Barrage、Ice-Tipped Arrows、Mirage Archer、Toxic Domain 弓矛共用。
- **常搭**：投射物類（Pierce、Fork、Multishot）＋近戰類兩邊都能吃；底層用 **狂怒球、流血、Parried**。

#### A5. 錘（Mace）：重擊、餘震、碎裂地面、破甲、重暈
- **核心**：Slam 砸地產生 **Jagged Ground（碎裂地面，緩速）**，時間到 **Aftershock（餘震）** 再爆一次；**Fissure 裂縫**；**破甲 → 完全破甲 → 收割**（Sunder、Armour Breaker）；**重暈（Heavy Stun）蓄積 → Primed → 收割**（Boneshatter）；**Glory 榮耀** 滿了放大招。
- **代表**：
  - **Earthquake**：砸地留碎裂地面，時間到餘震。
  - **Boneshatter**：打擊，對「準備重暈」的敵人造成重暈並放出震波。
  - **Sunder**：一連串往前的裂地；打完全破甲的敵人施加 Sundered Armour。
  - **Armour Breaker**：專門破甲。**Volcanic Fissure**／**Forge Hammer**：火焰裂縫。
  - **Supercharged Slam**（只能雙手錘）：引導蓄力，鬆開砸地＋餘震。**Leap Slam**：跳砸位移。
  - **Hammer of the Gods**：重暈敵人累積榮耀，滿了天降巨錘。**Ancestral Warrior Totem**：消耗 3 耐力球立圖騰，召喚祖靈用你的錘技能。
- **武器**：單手錘、雙手錘（14 顆共用＋ 1 顆雙手專用）。
- **常搭**：Aftershock、Fist of War、Upheaval／Branching Fissures、Armour Break；戰吼 Seismic Cry（讓下一次 Slam 多一次餘震）；底層用 **破甲、重暈、耐力球、燃燒**。

#### A6. 弓（Bow）：元素箭、連鎖、毒氣雲、植物、可重複
- **核心**：每顆箭技能多半是一種元素＋一個場上互動：**Lightning Arrow 的連鎖可以跳到 Lightning Rod 插在地上的箭**；**Gas Arrow 的毒雲被引爆器或燃燒的敵人點燃**；**Barrage／Ice-Tipped Arrows 讓下一個 Repeatable 箭技能重複射**；Snipe 的「完美時機」。
- **代表**：
  - **Lightning Arrow**：打到敵人或牆時對周圍放連鎖閃電。
  - **Lightning Rod**：從天而降的箭留在地上，被連鎖打到就再爆一次。
  - **Gas Arrow**：可燃毒氣雲；**Detonating Arrow**（引導，引爆器）把它點燃。
  - **Poisonburst Arrow**（毒）、**Freezing Salvo**（累積冰彈一次射出）、**Snipe**（蓄力，完美時機會爆炸並消耗凍結）。
  - **Tornado Shot**：落點生成龍捲，對龍捲射的箭會被複製一圈。
  - **Vine Arrow**／**Toxic Growth**（植物）、**Rain of Arrows**（消耗狂怒球）、**Escape Shot**（後跳＋冰）。
- **武器**：弓（18 顆專用）＋與矛共用 4 顆。
- **常搭**：投射物全套、Chain；底層用 **感電、凍結、中毒、狂怒球、標記（Sniper's Mark）**。

#### A7. 元素法術（不限武器）＋ Infusion／Remnant
- **核心**：法術 **不綁武器**（法杖、魔杖只是加成與自帶技能）。0.3 起有 **Infusion 元素灌注**：某些技能或元素異常會在地上留下 **Infusion Remnant**，撿起來得到「火／冰／雷灌注」，下一個會消耗灌注的法術變形。法術之間也有直接連動（Ice Nova 可以從 Frostbolt 的位置放出）。[pn0.3]
- **代表**：
  - **Frostbolt** → **Ice Nova**（從冰彈位置爆；消耗冰灌注留冰緩地面）。
  - **Orb of Storms**（連鎖閃電球，結束時留雷灌注）→ **Arc**（消耗雷灌注連鎖更遠）。
  - **Frost Bomb**（施加曝露，結束時留冰灌注）、**Living Bomb**（傷害夠或擊殺就爆，留火灌注）。
  - **Fireball**（消耗火灌注爆出一圈小火球）、**Comet**（冰隕石；消耗火灌注變冰火大爆炸）、**Firestorm**（三種灌注都能吃，各自變形）。
  - **Snap**：消耗凍結／感電／燃燒的敵人身上的元素，擴散並留灌注。**Flame Wall**：穿過火牆的投射物附加火傷（吃雷灌注再加雷）。
  - **Lightning Warp**：瞬移進可處決的敵人體內引爆。
- **武器**：任何（法杖、魔杖、權杖是常見選擇）。
- **常搭**：Spell Echo、Spell Cascade、Controlled Destruction、Remnant Potency；常駐 **Siphon Elements**（凍結／感電／燃燒時機率生灌注）、**Mana Remnants**；底層用 **元素異常、曝露、秘術增強（Arcane Surge）、能量護盾**。

#### A8. 魔杖與法杖的自帶技能（武器決定「送你一招」）
- **核心**：PoE2 的法系武器沒有「必須拿我才能用」的技能寶石，而是 **底材自帶一個技能**（Grants Skill），不同底材送不同技能。[db-wand]／[db-staff]
- **魔杖**：Chaos Bolt（混沌彈）、Power Siphon（處決給力量球）、Mana Drain、Bone Blast、Volatile Dead（屍體變追蹤爆彈）、Decompose（屍體變可燃毒雲）、Galvanic Field、Exsanguinate、Wither、Coiling Bolts、Spellslinger（Invocation）。
- **法杖（Staff，雙手法器）**：Firebolt、Freezing Shards、Lightning Bolt、Consecrate、Enervating Nova、Feast of Flesh、Heart of Ice、Mirror of Refraction、Reap、Sigil of Power、Solar Orb、Soulrend、Unleash、Dark Pact。

#### A9. 權杖（Sceptre）：精魄、光環、骷髏
- **核心**：權杖是單手法器，**底材自帶常駐技能**：多數送 **Skeletal Warrior（會復活的骷髏戰士）**，也有光環 Purity of Fire／Ice／Lightning、Discipline（加能量護盾）、Malice（敵人暴擊弱點）、Impurity、Fulmination（打感電敵人連帶打其他感電敵人）、Heart of Ice、Spiraling Conspiracy。[db-sceptre] 權杖還提供 **精魄（Spirit）** 讓你開更多常駐技能 ⚠️（數值未查）。
- 使用者說的「權杖的精魄技能」＝這一族：精魄是 PoE2 給 **Persistent（光環、傳令、召喚、Cast on X）** 預留的資源。

#### A10. 召喚物（Minion）：骷髏、殭屍、夥伴、指令
- **核心**：**常駐召喚**（Persistent，預留精魄，死了會 **Revive 自己復活**）＋**短暫召喚**（Raise Zombie、Unearth 用屍體或力量球）。**每種骷髏有一個 Command 指令**：平常自己打，按技能才放特殊招。**Offering 祭品** 把骷髏插在骨刺上給全體 buff。
- **代表**：
  - **Skeletal Warrior**（權杖送）、**Skeletal Frost Mage**（指令：給召喚物冰盾）、**Skeletal Brute**（重擊、指令戰吼）、**Skeletal Arsonist**、**Skeletal Storm Mage**、**Skeletal Cleric**、**Skeletal Reaver**、**Skeletal Sniper**。
  - **Raise Zombie**：吃屍體或力量球召出短暫殭屍。**Unearth**：骨刺＋把屍體重組成骨構造體。
  - **Summon Infernal Hound**（夥伴，會點燃附近敵人）、**Wolf Pack**、**Tame Beast**（馴服稀有野獸當夥伴）。
  - **Bone Offering**（給召喚物擋傷害）、**Pain Offering**（召喚物變快變強）、**Soul Offering**（只加你自己的法術傷害）。
  - **Grim Feast**（召喚物死掉時存血，啟動後用存的血復活）、**Sacrifice**（骷髏可以當屍體用）。
- **武器**：任何；權杖、魔杖最常見。
- **常搭**：Meat Shield、Infernal Legion、Hulking Minions、Last Gasp、Bidding（指令）、Minion Pact；Cast on Minion Death。

#### A11. 屍體（Corpse）
- **核心**：怪物死後留屍體，**技能消耗屍體** 產生效果。
- **代表**：**Detonate Dead**（引爆屍體，引爆器）、**Volatile Dead**（屍體變追蹤爆彈）、**Decompose**（屍體變可燃毒雲）、**Profane Ritual**（屍體上刻符，造成混沌持續傷害，結束給力量球）、**Bitter Dead**、**Ritual Sacrifice**（吃稀有怪屍體拿它的詞綴）、**Devour**（飛龍吞屍體回血拿力量球）、**Kelari's Malediction**（吃屍體生甲蟲）。
- **常搭**：Corpse Conservation、Contagion（目標死時散播）。

#### A12. 詛咒與標記
- **詛咒**：範圍、**延遲落下**、同時上限（預設 1 個 ⚠️）。5 顆：Despair（降混抗）、Vulnerability（無視部分護甲）、Temporal Chains（減速、讓其他效果過得慢）、Elemental Weakness（降元素抗）、Enfeeble（敵人傷害降低）。收割：**Hexblast**（引爆詛咒造成混沌爆炸，需要詛咒過半時間）。玩法：**Blasphemy**（Meta：把詛咒變成你身上的光環）、**Curse on Block**、Contagion 散播詛咒、Cursed Ground（變成地面）。
- **標記**：單體、**觸發條件達成就消耗**，同時一個 ⚠️。**Sniper's Mark**（被暴擊時引爆給狂怒球）、**Freezing Mark**（被凍結時引爆給你冰傷 buff）、**Voltaic Mark**（被電擊時引爆給雷傷 buff）、**Bloodhound's Mark**（失血累積重暈，重暈或死亡時血爆）；狼人 Pounce 自帶 Predator's Mark。**Called Shots**（常駐：定時自動上標記）。
- **常搭**：Heightened／Focused／Ritualistic Curse、Hex Bloom；Mark for Death、Eternal Mark。

#### A13. 傳令（Herald）
- **核心**：常駐、預留精魄；**用非傳令的攻擊殺死特定狀態的敵人 → 觸發爆炸或強化**（大多吃 Attack 傷害）。
- **代表**：**Herald of Ash**（溢傷殺死→爆炸點燃）、**Herald of Ice**（碎冰殺→冰爆）、**Herald of Thunder**（殺死感電敵人→之後的攻擊放閃電）、**Herald of Blood**（殺死失血敵人→血爆）、**Herald of Plague**（殺死中毒敵人→毒散播）。
- **武器**：大部分要「任何武器但不能空手」（[PoB2] weaponTypes 列全部武器）。
- **常搭**：Deadly Herald；底層＝異常（點燃、凍結、感電、失血、中毒），**跟我們的異常全套最好接**。

#### A14. 戰吼（Warcry）與旗幟（Banner）
- **核心**：戰吼有冷卻，**可花耐力球跳過冷卻**；吼完 **強化之後的幾次攻擊（Empower）**；旗幟要先打怪累積 Glory 才能插。
- **代表**：**Infernal Cry**（強化近戰，範圍內敵人死時燃爆）、**Seismic Cry**（擊退、重暈，強化下一次 Slam 多一次餘震）、**Fortifying Cry**（給 Guard 護盾，盾牌攻擊放震波）、**Ancestral Cry**（燃燒累積榮耀，化身 Kaom）；旗幟 **War Banner**（攻擊）、**Defiance Banner**（防禦）、**Dread Banner**。
- **常搭**：Echoing Cry、Enraged Warcry、Corrupting Cry、Battershout、Exposing Cry。

#### A15. 觸發與 Meta 寶石（Cast on X、Invocation）
- **核心**：Meta 寶石插 **其他技能寶石**（和輔助混插），**條件累積能量（Energy）→ 滿了自動觸發插在裡面的法術**；Invocation 則是 **存能量、手動按下放出**（能量夠可以一次放好幾次）。**Meta 不能插 Meta**。[db-sup]
- **代表**：**Cast on Critical**（暴擊）、**Cast on Elemental Ailment**（凍結／感電／點燃）、**Cast on Dodge**（翻滾）、**Cast on Minion Death**、Cast on Block／Melee Kill／Melee Stun（多為裝備或昇華送）；Invocation：**Elemental Invocation**、**Barrier Invocation**（能量護盾被打）、**Reaper's Invocation**（近戰擊殺）、**Feral Invocation**（花魔力→分身用變身攻擊）。其他 Meta：**Mirage Archer**（翻滾生分身射擊）、**Spell Totem**（消耗 3 顆力量／耐力球立圖騰施法）、**Mortar Cannon**、**Ancestral Warrior Totem**、**Blasphemy**。
- **常搭**：Energy Retention、Boundless Energy、Energy Capacitor。

#### A16. 圖騰（Totem）
- **代表**：**Shockwave Totem**（反覆砸地，碎裂地面會被它引爆）、**Spell Totem**、**Ancestral Warrior Totem**、**Dark Effigy**（轟炸有混沌持續傷害的敵人）、弩的 Artillery／Siege Ballista、Mortar Cannon。
- **常搭**：Hardy／Reinforced／Urgent Totems、Splinter Totem（Totemic Control 分類）。

#### A17. 變身（Shapeshift，Druid，0.4 加入）
- **核心**：**Talisman（護符武器）** 是雙手武器，裝備時會變成動物形態並給一招基本攻擊；技能本身會讓你 **變身成熊／狼人／飛龍** 出招；熊與飛龍吃 **Rage 狂怒值**。[pn0.4]
- **熊**：**Maul**（爪擊生 Rage）、**Furious Slam**（雙震波，花 Rage 留碎裂地面）、**Rampage**（衝鋒連砸，花 Rage 延長）、**Fury of the Mountain**、**Walking Calamity**、**Ferocious Roar**（戰吼）。
- **狼人**：**Shred**（連爪，打凍結的敵人生冰碎片）、**Lunar Assault**（月光冰弧）、**Pounce**（跳撲＋自動上標記）、**Cross Slash**、**Arctic Howl**、**Lunar Blessing**。
- **飛龍**：**Rend**（揮翼斬，消耗力量球）、**Flame Breath**（飛起噴火，引導、引爆器）、**Devour**（吞屍體或可處決的敵人回血給力量球）、**Wing Blast**（後退擊退，可打斷自己的技能）、**Oil Barrage**、**Rolling Magma**。
- **其他**：**Demon Form**（變惡魔、法術變強，但血量越扣越快）、Spirit Vessel（夥伴用你的變身技能）、Feral Invocation。
- **武器**：Talisman（[PoB2]；⚠️ 未確認沒有 Talisman 時能不能用）。

#### A18. 植物、風暴、機關（PoE2 新的「場地」家族）
- **植物**：Vine Arrow、Toxic Growth（弓）、Entangle、Thrashing Vines、Briarpatch（法術）；可被中毒強化、被 **Thunderstorm** 催長。
- **風暴**：Firestorm、Thunderstorm（讓敵人 Drenched 更易感電／凍結）、**Tornado**（吸進敵人，吸收元素地面的效果）、Mana Tempest。
- **機關（Hazard）**：Spearfield、Ice Shards（弩）、Trail of Caltrops（翻滾撒蒺藜）、Conductive Runes——**PoE2 版的陷阱**，常搭 Controlled Hazard、Rearm、Delayed Reaction。

#### A19. 盾與招架
- **Raise Shield**（盾自帶：舉盾擋所有可格擋攻擊，鬆開盾擊）、**Parry**（小圓盾自帶：擋下一擊並讓敵人 Parried）、**Shield Charge**（舉盾衝鋒）、**Shield Wall**、**Resonating Shield**、Fortifying Cry。
- 常搭：Parried 收割（矛的 Disengage、Fangs of Frost）、Cast on Block、Curse on Block。

### 2.B PoE1 有、PoE2 沒有或不同的

#### B1. 變異技能（Vaal Skills）——使用者特別問
- **取得**：技能寶石用 **Vaal Orb 腐化** 有機率變成 Vaal 版，或直接掉落。**一顆 Vaal 寶石同時給兩個技能**：原本的技能＋ Vaal 版，**連結的輔助兩個都吃** ⚠️（細節以官方為準）。
- **靈魂（Souls）**：殺怪時每顆 Vaal 技能各自累積靈魂（1 隻怪 1 個 ⚠️）；**累積到 Soul 數字才能放**；有 **儲存次數（Stored Uses）**，可以存好幾發；**放完會進入「靈魂獲取冷卻（Soul Gain Prevention）」** 這段時間內殺怪不加靈魂，避免連放。[PoB1]
- **變異版效果**：不是單純傷害×2，而是 **換一個更誇張的形態**，常見三類：
  - **爆發清怪**：Vaal Ground Slam（15 靈魂、可存 4 次、冷卻 1 秒）、Vaal Fireball（一圈螺旋火球）、Vaal Spark（往四面八方持續噴電花）、Vaal Ice Nova（從被打中的敵人身上重複爆）、Vaal Rain of Arrows、Vaal Flicker Strike。
  - **救命／大招 buff**：**Vaal Haste**（50 靈魂，短時間光環：移速攻速施法速度）、**Vaal Clarity**（技能不花魔力）、**Vaal Grace**、**Vaal Discipline**、**Vaal Molten Shell**、**Vaal Immortal Call**（100 靈魂，消耗耐力球短時間不會死）、Vaal Arctic Armour。
  - **召喚爆發**：**Vaal Summon Skeletons**（一整支骷髏軍＋將軍）、Vaal Animate Weapon、Vaal Domination／Absolution（讓既有召喚物升格）。
- **數字範例**（[PoB1] Lv 20）：Vaal Ground Slam 15 靈魂／4 次／冷卻 1 秒；Vaal Lightning Strike 20／2／8；Vaal Haste 50／1／6；Vaal Immortal Call 100／1／8；Vaal Arc 25／1／2。PoE1 共 54 顆 Vaal 寶石。
- **為什麼好玩**：「**殺怪累積 → 關鍵時刻放大招**」，打王前存滿；跟 PoE1 腐化系統綁在一起（賭腐化）。
- **對我們**：⚠️ 我們的寶石升級已經叫「靈魂」（企劃書 6.3），要做變異得改名（例：「怨氣」「業力」），或者直接共用「殺怪累積」那條線但分開計數。

#### B2. 烙印（Brand）
- **機制**：法術，**貼到敵人身上定時觸發**，敵人死了烙印會在範圍內 **自動找下一個**；Brand Recall 收回全部烙印並加速。**Arcanist Brand** 會觸發插在一起的法術。
- **代表**：Storm Brand（連鎖閃電）、Armageddon Brand（隕石）、Penance Brand（累積後爆）、Wintertide Brand（冰持續傷害）。
- **PoE2**：沒有。

#### B3. 地雷（Mine）
- **機制**：丟出去在地上，**自己引爆**（3.x 改為地雷帶小光環、引爆後連鎖 ⚠️），可以一次丟很多個。
- **代表**：Icicle Mine、Pyroclast Mine、Stormblast Mine、Smoke Mine（位移）、Summon Skitterbots。
- **PoE2**：沒有。

#### B4. 陷阱（Trap）與陷阱器
- **機制**：丟陷阱 → **敵人靠近時觸發**，有冷卻、可存多次；**Trap Support** 能把一般法術變成陷阱 ⚠️；Saboteur 昇華專精。
- **代表**：Bear Trap（定住）、Fire Trap、Lightning Trap、Seismic Trap、Lightning Spire Trap、Flamethrower Trap、Siphoning Trap、Blade Trap。
- **PoE2**：沒有；以 **Hazard**（Spearfield、Ice Shards、Trail of Caltrops）替代。

#### B5. 砲台（Ballista）與圖騰變化
- **PoE1**：Ballista 是圖騰的子類，Artillery／Shrapnel／Siege Ballista＋ **Ballista Totem Support**（任何弓技能變砲台 ⚠️）；**Spell Totem Support** 把任何法術變圖騰；Searing Bond、Holy Flame Totem、Rejuvenation Totem、Decoy Totem、Devouring Totem。
- **PoE2**：Ballista 只剩弩；Spell Totem 改成 Meta 寶石，**要消耗球體才能立**。

#### B6. 魔像（Golem）
- **機制**：一隻常駐、強力的召喚物＋給主人一個 **buff**（火魔像加傷、冰魔像加暴擊與命中、石魔像回血…），上限 1 隻（可用天賦增加 ⚠️）。
- **代表**：Summon Flame／Ice／Lightning／Chaos／Stone／Carrion Golem。
- **PoE2**：沒有；功能被 **Companion 夥伴** 取代（但夥伴沒有給主人 buff）。

#### B7. 傳令（Herald）
- PoE1：Herald of Ash、Ice、Thunder、Agony（召毒蠍，毒層數越多越強）、Purity（召哨兵）。**預留魔力**。
- PoE2：Ash、Ice、Thunder 保留但改條件；新增 Blood、Plague；**預留精魄**。

#### B8. 幻影（Mirage）
- PoE1：Mirage Archer 輔助（攻擊時生出分身射同一招）、General's Cry（召喚幻影戰士用你的近戰技能）、Saboteur 等 ⚠️。
- PoE2：Mirage Archer 改成 Meta，**翻滾時** 生分身。

#### B9. 幽魂（Spectre）
- PoE1：Raise Spectre 對怪物屍體施放，**把那隻怪永久召成自己的**（用牠的技能）。
- PoE2：保留（`Spectre: {0}`，綁定怪物），屬於召喚物、預留精魄。

#### B10. 其他 PoE1 才有
- **Link（連結）**：綁定召喚物分享傷害或增益。
- **Guard（守護）**：互斥防禦 buff（Steelskin、Molten Shell、Immortal Call）。
- **Stance（架勢）**：Blood and Sand 二選一切換。
- **Retaliation（反擊）**：被打或格擋後短時間能用的強招。
- **Blink／Movement**：大量位移技能（Flame Dash、Frostblink、Whirling Blades、Lightning Warp）。PoE2 因為有翻滾，位移技能少。
- **Awakened 覺醒輔助**、**轉換寶石（Transfigured）**：例如「Ice Nova of Frostbolts」，同一招換玩法。

---

## 3. PoE2：技能怎麼綁武器

[PoB2] 每個技能有 `weaponTypes`。下表只算 **可掉落的技能寶石**（Tier 1 以上；Tier 0 多半是武器、昇華、獨特裝備送的）。

| 武器 | 專用技能（數量） |
| --- | --- |
| **弩** | 26：Armour Piercing Rounds、Artillery Ballista、Cluster Grenade、Emergency Reload、Explosive Grenade、Explosive Shot、Flash Grenade、Fragmentation Rounds、Galvanic Shards、Gas Grenade、Glacial Bolt、Hailstorm Rounds、High Velocity Rounds、Ice Shards、Incendiary Shot、Mortar Cannon、Oil Grenade、Permafrost Bolts、Plasma Blast、Rapid Shot、Shard Scavenger、Shockburst Rounds、Siege Ballista、Siege Cascade、Stormblast Bolts、Voltaic Grenade；預設 Crossbow Shot |
| **長棍** | 20：Charged Staff、Falling Thunder、Flicker Strike、Frozen Locus、Gathering Storm、Glacial Cascade、Hand of Chayula、Ice Strike、Killing Palm、Mantra of Destruction、Shattering Palm、Siphoning Strike、Staggering Palm、Storm Wave、Tempest Bell、Tempest Flurry、Vaulting Impact、Wave of Frost、Whirling Assault、Wind Blast；預設 Quarterstaff Strike |
| **矛** | 19：Blood Hunt、Cull The Weak、Disengage、Elemental Sundering、Explosive Spear、Fangs of Frost、Glacial Lance、Lightning Spear、Primal Strikes、Rake、Rapid Assault、Spear of Solaris、Spearfield、Storm Lance、Thunderous Leap、Twister、Whirling Slash、Whirlwind Lance、Wind Serpent's Fury；預設 Spear Stab、Spear Throw |
| **弓** | 18：Detonating Arrow、Electrocuting Arrow、Escape Shot、Freezing Salvo、Gas Arrow、Ice Shot、Lightning Arrow、Lightning Rod、Magnetic Salvo、Poisonburst Arrow、Rain of Arrows、Shockchain Arrow、Snipe、Spiral Volley、Stormcaller Arrow、Tornado Shot、Toxic Growth、Vine Arrow；預設 Bow Shot |
| **弓／矛共用** | Barrage、Ice-Tipped Arrows；弓／弩／矛：Mirage Archer、Toxic Domain |
| **錘（單雙手）** | 14：Ancestral Warrior Totem、Armour Breaker、Boneshatter、Earthquake、Earthshatter、Forge Hammer、Hammer of the Gods、Leap Slam、Molten Blast、Perfect Strike、Rolling Slam、Stampede、Sunder、Volcanic Fissure；**只限雙手錘**：Supercharged Slam；預設 Mace Strike |
| **護符 Talisman** | 16：Arctic Howl、Cross Slash、Devour、Feral Invocation、Ferocious Roar、Flame Breath、Furious Slam、Fury of the Mountain、Lunar Assault、Lunar Blessing、Oil Barrage、Pounce、Rampage、Rolling Magma、Walking Calamity、Wing Blast |
| **盾／小圓盾** | 盾送 Raise Shield，小圓盾送 Parry；Shield Charge、Shield Wall、Resonating Shield、Fortifying Cry 要拿盾 ⚠️（[PoB2] 寫任何武器，盾的限制在別處） |
| **魔杖、法杖、權杖** | 沒有「專用技能寶石」，而是 **底材自帶技能**（見 A8、A9） |
| **不限武器** | 全部 **法術**（約 99 顆 Spell 類）、**召喚物**、**詛咒**、**標記**、**光環**、**Cast on X／Invocation**、**戰吼**、**旗幟**、Spell Totem、Shockwave Totem（任何武器但不能空手）；**傳令** 要拿武器（任何近戰或遠程武器） |
| **還沒做的武器類別** | 劍、斧、匕首、爪、連枷：[PoB2] 的 weaponTypes 裡有這些名字，但 **沒有專屬技能**（PoE2 搶先體驗還沒推出 ⚠️） |

設計重點：
- **攻擊＝武器決定技能組**，**法術／召喚／詛咒＝不綁武器**，法器只「送一招＋加成」。
- **雙武器組（Weapon Set）**：PoE2 可以切兩組武器，每組各自的天賦點（0.4 有「Weapon Set Passive Skill Points」）[pn0.4]，所以一個人可以「弩清怪＋錘打王」。

---

## 4. PoE2 輔助寶石

### 4.1 數量
- poe2db：**557 顆輔助**（含分階）、427 顆主動。[db-sup]／[db-skill]
- [PoB2]：567 個輔助條目 → 去掉 I／II／III 後 **415 個家族**，其中 **118 個有分階**、**75 顆族裔（Lineage）**。
- 粗分（依主要標籤，[PoB2] 自算）：通用 109、近戰 35、法術 32、攻擊 30、投射物 29、召喚 27、常駐 18、閃電 15、火 13、冰 13、混沌 13、戰吼 13、物理 12、觸發 11、詛咒 10、圖騰 8、彈藥 7、持續時間 6、殘留物 6、標記 4、手雷 2、傳令 1、變身 1。

### 4.2 分類方式（可給我們抄的）
| 類別 | 例子 |
| --- | --- |
| 純數值（更多傷害、更快） | Brutality（物理）、Rapid Attacks、Rapid Casting、Controlled Destruction、Fire／Cold／Lightning Mastery |
| 投射物形狀 | Pierce、Fork、Chain、Multishot、Ricochet、Projectile Acceleration／Deceleration |
| 範圍 | Magnified Area、Concentrated Area |
| 重複施放 | Spell Echo、Spell Cascade（`Cascadable`）、Salvo |
| 異常 | Ignite、Freeze、Shock、Bleed、Poison、Electrocute、Deep Freeze、Eternal Flame |
| 破防 | Armour Break、Armour Demolisher、Cold／Fire Exposure、Penetration |
| 招式專屬 | Aftershock（Slam）、Impact Shockwave（Strike）、Crescendo（最終一擊）、Perfection（完美時機）、Steadfast（引導） |
| 武器專屬 | 彈藥：Double Barrel、Fresh Clip、Auto Reload、Ammo Conservation；手雷：Adhesive Grenades、Payload、Long／Short Fuse |
| 召喚／圖騰／戰吼／詛咒／標記／殘留物 | 見第 1 節 |
| 觸發能量 | Energy Retention、Boundless Energy、Energy Capacitor |
| 資源與續航 | Life Leech、Mana Leech、Lifetap、Clarity、Efficiency、Bounty |
| 族裔（Lineage） | 用王或角色命名、會改變玩法，例：Tecrod's Revenge、Uhtred's Augury、Kaom's Madness、Zarokh's Refrain |

### 4.3 規則（**注意：0.3 改過**）
1. **0.1～0.2**：「每種輔助全角色只能用一顆」。
2. **0.3.0 拿掉這條**：原文是 *"We've removed the restriction of having one of each support gem per character."* 同時把很多輔助分成 I／II／III 階。[pn0.3]
3. **現在（0.3 以後）**：每顆輔助屬於一個 **分類（Category，資料裡叫 `gemFamily`）**，**同一分類的輔助不能插在同一個技能上**，但可以在不同技能上重複使用。例：Brutality I 和 II 不能同插；Multishot、Wildshards、Sione's Temper 都屬「Additional Projectiles」不能同插。[db-sup]（[PoB2] 共 351 個分類、44 個分類有 2 種以上不同輔助）
4. **族裔輔助全角色只能插一顆同名**。[db-sup]
5. **Meta 寶石** 可以混插主動技能與輔助，但 **Meta 不能插 Meta**。[db-sup]
6. **孔數**：每顆技能寶石自己有輔助孔，用 Jeweller's Orb 加到最多 5 孔 ⚠️（數字以官方為準；我們企劃書 6.4 已經是 2～5 孔）。
7. 0.3 起：插了屬性不夠的輔助，只停用那顆輔助，不會停用整個技能。[pn0.3]
8. 常駐技能（光環、傳令、召喚、Cast on X）**預留精魄（Spirit）**，不花魔力。

---

## 5. 給我們的建議

> ⚠️ 這一節已由 `docs/開發參考.md` 0.1 節（2026-11-02 定案）與 `docs/技能分配.md` 取代，只留作紀錄。

### 5.1 前提
- 一位主角、單人、俯視動作。已有：攻擊／法術、近戰／投射物／範圍、陷阱地雷圖騰砲台、召喚狼、詛咒 5、標記 7、光環（精魄）、異常全套、三種球體、buff（猛攻、狂怒、秘術增強、順風、邪力、化身、守護）。
- 武器（`docs/封存/技能與底材清單.md` 2.1，已過時）：刀、野太刀、短刀、矛、棍、弓、法杖、魔杖；副手盾、法器、箭袋。
- 原則：**PoE2 的「一招製造狀態、另一招收割」比 PoE1 的「一招換元素」更適合手動動作遊戲**；PoE1 的陷阱、地雷、烙印、魔像是「把傷害交給別人」的玩法，單人俯視遊戲裡可以留著，但要有「放置 → 引爆」的手感。

### 5.2 建議第一版 10 個體系

標記：**底層新**＝要先加進底層的新機制；**有**＝現有底層就能做。

| # | 體系 | 綁的武器 | 技能（3～5） | 收割／連動 | 需要的底層 |
| --- | --- | --- | --- | --- | --- |
| 1 | **斬擊連段**（刀） | 刀、野太刀 | 居合（打擊，連按第 3 段強化，參考 Ice Strike）、旋斬（捲起旋風，參考 Whirling Slash）、拔刀衝（位移打擊，參考 Rake 流血）、終太刀（收割流血或失衡，參考 Blood Hunt） | 第 3 段／最終一擊；流血 → 收割 | **底層新：連段計數（快速連按進入下一段）**；流血有 |
| 2 | **重擊震地**（野太刀或棍的重型分支） | 野太刀（或之後加「錘」） | 震地（留碎裂地面＋餘震，Earthquake）、破甲斬（Armour Breaker）、裂地（Sunder，打完全破甲加傷）、跳斬（Leap Slam）、重擊蓄力（Supercharged Slam，引導） | 破甲 → 完全破甲 → 收割；重暈蓄積 → 收割 | **底層新：地面效果（碎裂地面＋延遲餘震）**、**完全破甲／重暈蓄積**（如果底層還沒有） |
| 3 | **矛：刺擲雙模＋招架** | 矛（＋盾的招架） | 突刺（預設近戰）、擲矛（預設遠程，消耗狂怒球爆炸）、雷矛（打中射周圍閃電，Lightning Spear）、後躍（收割失衡給狂怒球，Disengage）、矛陣（踩到才爆的機關，Spearfield） | 招架 → 失衡 → 收割；狂怒球 → 擲矛強化 | **底層新：招架（Parry）與「失衡」debuff**；機關可共用現有陷阱 |
| 4 | **棍：連擊數與力量球** | 棍 | 冰擊三連（Ice Strike）、雷打（第 4 段落雷，Tempest Flurry）、撲殺（處決給力量球，Killing Palm）、雷砸（消耗力量球射閃電，Falling Thunder）、大鐘（Combo 滿了才能放，Tempest Bell） | Combo → 大招；力量球 → 收割 | **底層新：Combo（連擊數）資源**；處決有沒有要確認 |
| 5 | **弓：元素箭與場上互動** | 弓（箭袋） | 雷箭（連鎖，Lightning Arrow）、避雷針箭（插地被連鎖再爆，Lightning Rod）、毒氣箭（可燃毒雲，Gas Arrow）、引爆箭（引導、引爆器，Detonating Arrow）、齊射（下一招重複射，Barrage） | 連鎖 → 插地箭；毒雲 → 引爆 | **底層新：可燃雲＋「引爆器」標籤**、**「下一招重複」buff** |
| 6 | **短刀：投擲與手雷**（取代 PoE2 的弩） | 短刀 | 飛刀（投射物、可重複）、炸彈（彈跳、引信到才爆，Grenade）、毒煙彈（毒雲，Gas Grenade）、閃光彈（致盲暈眩，Flash Grenade）、引爆（提早引爆場上的炸彈與雲，Explosive Shot 概念） | 佈置 → 引爆 | **底層新：手雷（彈跳＋引信＋冷卻次數）**；如果要做「彈藥」再加 **彈夾／裝填** |
| 7 | **元素法術＋灌注** | 法杖、魔杖、法器（不綁） | 冰彈（Frostbolt）、冰新星（可從冰彈位置爆，Ice Nova）、雷球（場上球，結束留雷灌注，Orb of Storms）、電弧（吃雷灌注變強，Arc）、火球（吃火灌注爆一圈，Fireball） | 技能留灌注 → 下一招吃 | **底層新：殘留物（地上可撿）＋灌注 buff**；技能之間「以另一招位置為起點」 |
| 8 | **詛咒與收割（咒術師）** | 不綁（魔杖送一招） | 5 種詛咒（有）、咒爆（引爆詛咒，Hexblast）、傳染（目標死時散播詛咒與持續傷害，Contagion）、褻瀆光環（詛咒變光環，Blasphemy）、凋零（Wither） | 詛咒 → 咒爆 | **有**（詛咒已有）；要加「詛咒延遲落下」與「詛咒過半時間才能收割」 |
| 9 | **召喚：狼群＋骷髏指令** | 不綁（法器加成） | 狼（有）、骷髏戰士（常駐、會復活）、骷髏法師（指令：給召喚物冰盾）、殭屍（吃屍體，短暫）、祭品（插骨刺給召喚物 buff，Pain Offering） | 指令；屍體 → 召喚 | **底層新：屍體**（怪死後留一段時間）、**指令**（召喚物的主動招） |
| 10 | **傳令與觸發**（跨體系的光環欄玩法） | 不綁 | 火之傳令（溢傷殺死 → 爆炸點燃）、冰之傳令（碎冰 → 冰爆）、雷之傳令（殺感電 → 放閃電）、暴擊施放（Cast on Critical）、元素祈喚（凍感燃存能量，手動放出） | 異常 → 擊殺 → 爆炸；條件 → 能量 → 觸發 | **有**（異常全套、精魄）；**底層新：能量（Energy）與 Meta 寶石插法** |

**第二批（11～12，視時間）**：
- 11 **變異（Vaal）技能**：「殺怪累積 → 大招」，例：變異震地（可存 4 次清怪）、變異迅捷（短時間光環）、變異不朽（消耗耐力球短暫不死）、變異骷髏軍。需要：**新資源（每顆變異技能各自累積）＋取得後不能累積的冷卻**；和現有「靈魂」改名或分開。
- 12 **變身**：熊（Rage、重擊）、狼人（快速冰爪、撲擊上標記）、飛龍（噴火、吞屍體）。需要：**變身狀態（換模型、換技能組、換基本攻擊）＋ Rage 資源**；美術成本最高（每種形態都要新的像素圖），建議晚一點再做。

### 5.3 需要先加進底層的新機制（依「被幾個體系用到」排序）

| 新機制 | 用到的體系 | 估計工作量 | 建議 |
| --- | --- | --- | --- |
| **收割（Payoff）框架**：「消耗某個狀態換效果」的共用寫法（消耗凍結、失衡、完全破甲、流血、詛咒、灌注） | 1、2、3、4、5、7、8 | 中 | **先做**，它是 PoE2 連招感的核心 |
| **殘留物（地上可撿）＋灌注 buff** | 7（以後回血、回魔也能用） | 中 | 先做 |
| **地面效果（碎裂地面＋延遲餘震、可燃雲、油）** | 2、5、6 | 中 | 先做（毒雲、碎裂地面共用一套「場上區域」） |
| **引爆器標籤** | 5、6、9（屍爆） | 小 | 跟地面效果一起 |
| **連段／Combo 計數** | 1、4 | 小 | 先做 |
| **招架與失衡** | 3（以後盾也能用） | 中 | 第一版就要，矛才有特色 |
| **屍體** | 9、11、12 | 中（要記怪死的位置與大小） | 第一版做「召喚與屍爆」用的最小版 |
| **能量＋ Meta 寶石（插技能的技能）** | 10 | 中（寶石孔要能插主動技能） | 可以先做 Cast on Critical 一顆試水溫 |
| **手雷（彈跳＋引信＋次數）** | 6 | 小～中 | 第一版做 |
| **彈藥（彈夾、裝填）** | 只有弩用 | 中 | **先不做**：我們沒有弩，短刀用手雷就夠 |
| **指令（召喚物的主動招）** | 9 | 小 | 可選 |
| **變身（換模型與技能組）** | 12 | 大（美術） | 第二版 |
| **變異資源** | 11 | 小（程式）、大（平衡） | 第二版；先解決「靈魂」撞名 |

### 5.4 給天賦樹與職業的接法（下一層）
- 每個體系準備 **一個專屬資源或狀態**（連段、失衡、Combo、灌注、屍體、能量、手雷次數），天賦樹的大點就是「這個資源 +1 上限／更容易拿到／收割更強」，職業（昇華）則是 **改規則**（例：Stormweaver 撿灌注時再給一種不同的灌注 [pn0.4]）。
- 輔助寶石照 PoE2 0.3 以後的規則：**同分類不能同插、可以跨技能重複**；族裔輔助全身限一顆。

---

## 6. 最不確定的地方（⚠️ 摘要）

1. **[PoB2] 的 `Staff` 是不是指長棍（Quarterstaff）**：從技能名推斷是，但沒有官方對照表；法杖（Staff）技能全是「底材自帶」。
2. **盾技能（Shield Charge、Shield Wall…）與變身技能的武器限制**：[PoB2] 寫「任何武器」或「Talisman」，實際限制可能在別的欄位（需要盾、沒有護符能不能變身）。
3. **Vaal 技能細節**：每殺一隻怪給幾個靈魂、打王時怎麼拿靈魂、換區域靈魂會不會清掉、輔助是否兩個版本都吃——數字（靈魂數、儲存次數、冷卻）來自 [PoB1]，規則細節靠記憶。
4. **詛咒與標記的上限**（預設詛咒 1 個、標記 1 個）與 **輔助孔最多 5 個** 的確切數字。
5. **手雷的冷卻與儲存次數**、**權杖給的精魄數值**：沒有在一手資料確認。
