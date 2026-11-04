# PoE 昇華（Ascendancy）設計參考

給「職業與昇華全部重做」用的研究筆記。查證日期：2026-11-02。

- 主要來源：poedb.tw（PoE1）、poe2db.tw（PoE2）、官方網站與新聞站摘要。poewiki／poe2wiki 有 Anubis 防機器人驗證，沒有使用。
- 效果大多是忠實翻譯或濃縮，數字以來源頁為準；不確定的標 ⚠️。
- 名詞：小點＝只給數值的普通節點；大點＝有名字、有機制的重要節點（Notable）。

---

## 0. 先釐清的事實

| 項目 | 結果 | 來源 |
| --- | --- | --- |
| 「全部換新昇華」的活動叫什麼 | **Legacy of Phrecia**（菲瑞西亞的遺產）。它是 PoE1 的實驗活動，不是 3.26 聯盟。19 個昇華全部換成另一套，Atlas 天賦換成「神像（Idol）」裝備。 | https://www.pathofexile.com/phrecia 、https://poedb.tw/us/Phrecia_league |
| 時間 | 第一次在 **2025-02-20** 開始（3.25 期間，用來填 3.26 延期的空檔），後來延長到約 2025-04-23；**2026-01-29～02-19** 在 3.27 期間回歸並調整平衡。poedb 另記一次 2026-06-25～07-16（以 3.28 Mirage 為底）⚠️ | https://www.poe-vault.com/news/2025/04/23/end-of-legacy-of-phrecia-event 、https://www.pcgamesn.com/path-of-exile/legacy-of-phrecia 、https://www.gamewatcher.com/path-of-exile-legacy-of-phrecia-event-returns-january-2026 |
| PoE1 現在有幾個昇華 | 原本是 7 職業 19 昇華（Scion 只有 Ascendant）。後來 Scion 多了 **Reliquarian**（聖物館長）⚠️ 3.26 加入，以及 **Luminary**（⚠️ 版本未查到，可能是 3.28 以後）；另有可疊加在任何昇華上的 **Bloodline（血脈）昇華** 13 種。 | https://poedb.tw/us/Ascendancy_class 、https://poedb.tw/us/Bloodline_Ascendancy_class |
| PoE2 現在有幾個昇華 | 0.5.0「Return of the Ancients」（2026-05-29，聯盟 Runes of Aldur）新增 **Martial Artist**（武僧）與 **Spirit Walker**（女獵人），共 8 職業 22 昇華，另有 Lich 的替代昇華 **Abyssal Lich**。 | https://poe2db.tw/us/Ascendancy_class 、https://vulkk.com/2026/05/22/path-of-exile-2-patch-0-5-0-changes-overview/ 、https://technology.inquirer.net/146562/ |

---

## 1. PoE1 現行昇華

來源：每個昇華在 poedb 的頁面 `https://poedb.tw/us/<名稱>`（例：https://poedb.tw/us/Juggernaut ）。下表大點效果有標「⚠️」的是憑既有知識濃縮、本次沒逐條打開頁面核對數字。

### 野蠻人 Marauder

| 昇華 | 主題 | 代表大點 |
| --- | --- | --- |
| Juggernaut 勇士 | 不會被打斷、靠耐力球越打越硬的坦 | **Unstoppable**：移速 +10%、不會暈眩、行動與移速不會低於基礎值。**Unbreakable**：胸甲護甲加倍、15% 護甲也擋混沌。**Unflinching**：被打 30% 得耐力球、最近被打每秒 +1 耐力球、耐力球上限 +1。**Unrelenting**：每顆耐力球 +1% 元素與物理減傷。 |
| Berserker 暴徒 | 用怒氣（Rage）與受傷換輸出 | ⚠️ **Aspect of Carnage**：傷害 40% 更多、受到傷害 10% 提高（附代價的「更多」）。⚠️ **Rite of Ruin**：怒氣上限與效果提高，但怒氣會讓你失去生命。⚠️ **Crave the Slaughter**：攻擊命中得怒氣，怒氣不會自然衰退一段時間。**War Bringer**：戰吼相關。 |
| Chieftain 酋長 | 卡魯神祇：火、圖騰、戰吼 | **Hinekora**：你或圖騰擊殺的敵人 10% 爆炸，造成其最大生命 250% 火焰傷害。**Tasalio**：火焰抗性詞也套用到冰、電（50%）、不受點燃影響。**Valako**：最大火焰抗性詞也套用到最大冰電抗。**Ngamahu**（現版）：範圍內非傳奇珠寶把其他傷害的提高轉成火焰。⚠️ 舊版 Ngamahu 是「50% 物理轉火」，就是常被拿來當「基石式轉換」例子的那個。 |

來源：https://poedb.tw/us/Juggernaut 、https://poedb.tw/us/Chieftain

### 遊俠 Ranger

| 昇華 | 主題 | 代表大點 |
| --- | --- | --- |
| Deadeye 銳眼 | 投射物、標記、順風 | ⚠️ **Endless Munitions**：多射 1 個投射物。⚠️ **Gathering Winds**：使用技能得順風（Tailwind）。⚠️ **Far Shot**：投射物飛越遠傷害越高。**Ricochet**：投射物額外連鎖。 |
| Pathfinder 追獵者 | 藥劑變成主要資源 | ⚠️ **Master Distiller**：藥劑效果提高、移除負面狀態。⚠️ **Nature's Reprisal**：藥劑生效時造成更多混沌、中毒。⚠️ **Master Toxicist**：喝藥劑時毒雲。⚠️ **Nature's Adrenaline**：藥劑生效時攻速／移速。 |
| Warden 守望者 ⚠️（取代 Raider） | 季節誓約、自然護體 | ⚠️ **Oath of Summer／Winter／Spring**：三選一的元素誓約。⚠️ **Avatar of the Wilds**：自然化身型增益。（只查到節點名稱，效果未核對） |

### 女巫 Witch

| 昇華 | 主題 | 代表大點 |
| --- | --- | --- |
| Occultist 秘術家 | 詛咒、能量護盾、冰 | ⚠️ **Profane Bloom**：被詛咒的敵人死亡會爆炸。⚠️ **Void Beacon**：附近敵人冰抗與混抗降低。⚠️ **Vile Bastion**：能量護盾回復。⚠️ **Withering Presence**：附近敵人被凋零。 |
| Elementalist 元素使 | 元素異常、魔像、曝露 | **Shaper of Flames**：命中必點燃、所有傷害都能點燃。**Shaper of Storms**：命中必感電、感電至少 +25% 受傷。**Shaper of Winter**：所有命中都能冰緩，冰緩上限 40%。**Mastermind of Discord**：你上的曝露再 -25% 抗性。 |
| Necromancer 死靈師 | 召喚物、屍體、祭品（Offering） | **Mindless Aggression**：召喚物 20% 更多生命、10% 更多傷害。**Mistress of Sacrifice**：祭品技能也以 50% 效果作用在你身上。**Bone Barrier**：每隻召喚物 +1% 物理減傷（上限 10%）。**Corpse Pact**：最近每吃一具屍體 +4% 攻速施速、屍體附近敵人被冰緩與感電。 |

來源：https://poedb.tw/us/Elementalist 、https://poedb.tw/us/Necromancer

### 決鬥者 Duelist

| 昇華 | 主題 | 代表大點 |
| --- | --- | --- |
| Slayer 處刑者 | 近戰、吸血、斬殺 | ⚠️ **Headsman**：對稀有／傳奇敵人造成更多傷害、擊殺後得到增益。⚠️ **Brutal Fervour**：吸血可超量。⚠️ **Impact**：範圍與擊暈。⚠️ **Bane of Legends**：斬殺（Culling）。 |
| Gladiator 衛士 | 格擋、流血 | ⚠️ **Gratuitous Violence**：流血的敵人死亡會爆炸。⚠️ **Jagged Technique**：流血與攻擊。**Weapon Master**、**Measured Retaliation**、**War of Attrition**（節點名）。 |
| Champion 冠軍 | 嘲諷、堅定（Fortify）、旗幟、穿刺 | ⚠️ **Worthy Foe**：被嘲諷的敵人受更多傷害。⚠️ **Fortitude**：永遠堅定。⚠️ **Inspirational**：旗幟效果。⚠️ **Master of Metal**：穿刺。 |

### 聖堂武僧 Templar

| 昇華 | 主題 | 代表大點 |
| --- | --- | --- |
| Inquisitor 判官 | 元素暴擊、奉獻地 | ⚠️ **Inevitable Judgement**：暴擊無視敵人元素抗性。⚠️ **Righteous Providence**：暴擊與屬性。⚠️ **Sanctuary**：奉獻地。⚠️ **Augury of Penitence**：附近敵人受到更多元素傷害。 |
| Hierophant 聖宗 | 圖騰、秘術增強、光環 | ⚠️ **Pursuit of Faith**：圖騰數量與能力。⚠️ **Conviction of Power**：最低暴擊球／耐力球。⚠️ **Arcane Blessing**：秘術增強（Arcane Surge）。⚠️ **Divine Guidance**：魔力扛傷。 |
| Guardian 守護者 | 光環給隊友、格擋 | ⚠️ **Radiant Faith**：光環保留的魔力變成能量護盾。⚠️ **Unwavering Faith**：減傷與再生。⚠️ **Time of Need**：定時清除負面狀態並回血。 |

### 暗影 Shadow

| 昇華 | 主題 | 代表大點 |
| --- | --- | --- |
| Assassin 刺客 | 暴擊、中毒、狂暴球 | ⚠️ **Deathmarked**：暴擊相關。⚠️ **Toxic Delivery**：中毒。⚠️ **Mistwalker**：難以捉摸（Elusive）。⚠️ **Unstable Infusion**：暴擊得狂暴球。 |
| Trickster 欺詐師 | 閃避＋能量護盾混合、時間減速 | **Heartstopper**：每 10 秒輪流 5 秒命中傷害減半、5 秒持續傷害減半。**One Step Ahead**：自己行動速度至少 90%、附近敵人至多 90%。**Polymath**：每種精通 2% 更多傷害。**Soul Drinker**：2% 傷害吸成能量護盾。 |
| Saboteur 破壞者 | 陷阱、地雷、致盲 | ⚠️ **Pyromaniac**：陷阱地雷觸發時回血、不受點燃。⚠️ **Born in the Shadows**：致盲。⚠️ **Chain Reaction**、**Bomb Specialist**、**Perfect Crime**（節點名）。 |

來源：https://poedb.tw/us/Trickster 、https://poedb.tw/us/Saboteur

### 貴族 Scion

| 昇華 | 主題 | 代表大點 |
| --- | --- | --- |
| Ascendant 昇華使徒 | 從其他職業的昇華各拿一個縮小版 | 每個「Path of X」節點給該職業的屬性起點與天賦樹起點；再從該職業 3 個昇華中選 1 個的濃縮版（例：Juggernaut 版：+1000 命中、不會冰緩與暈眩、每顆耐力球 +5% 傷害）。 |
| Reliquarian ⚠️ | 每季輪換：把傳奇道具效果當節點 | 4 個「展示櫃」節點（施法武器、近戰武器、護甲、首飾），裡面的效果是某件傳奇道具的詞（例：Presence of Chayula）。 |
| Luminary ⚠️ | 傭兵（Mercenary） | **Noble Blood**：永久雇用傭兵。**Loyal Bodyguard**：命中傷害部分由傭兵承受。**Legendary Arms**：傭兵能裝傳奇武器。 |

來源：https://poedb.tw/us/Ascendancy_class 、https://poedb.tw/us/Reliquarian 、https://poedb.tw/us/Luminary

### 血脈昇華 Bloodline（可疊在任何昇華上）

打特定終局首領解鎖，從同一池昇華點數分配。代表：**Nameless – The Unseen Hand** 多一個戒指欄；**Catarina – Death Offering** 祭品效果 +50%、到期時殺死目標；**Farrul – Huntleader** 暴擊時召喚靈虎；**Abyssal – Conjoined Spire** 有圖騰時受傷降低，但放圖騰會殺掉其他圖騰。重點：**用少數點數換一個「規則改寫」**。
來源：https://poedb.tw/us/Bloodline_Ascendancy_class

---

## 2. Legacy of Phrecia：全部換新的昇華

規則：19 個核心昇華全部換成「菲瑞西亞版」，Reliquarian 停用。每個新昇華在 poedb 頁面上與一個原昇華掛在一起（⚠️ 下表「取代」欄是依頁面連結推斷）。
來源：https://poedb.tw/us/Phrecia_league ，各昇華頁 `https://poedb.tw/us/<名稱>`。

| 職業 | 昇華（取代） | 主題 | 代表大點 |
| --- | --- | --- | --- |
| Duelist | **Aristocrat**（Slayer） | 寶石等級、屬性 | **Gem-lined Cap**：非特殊輔助寶石 +4 級。**Inherited Fortune**：+5 天賦點。**Dreadful Attitude**：屬性需求 +50%，但每 5 點最低屬性 +8% 傷害。**Private Tuition** 等三個：某屬性高於另一屬性時免疫一種異常。 |
| Duelist | **Gambler**（Gladiator） | 運氣（Lucky／Unlucky） | **Growing Accumulator**：40% 機率三倍傷害，但傷害 30% 更少。**Spectacular Parlay**：暴擊率幸運，但命中傷害不幸。**Reversed Odds**：50% 機率把敵人元素抗性正負顛倒。**Heads／Tails**：法術格擋幸運＋攻擊格擋不幸（或反過來），二選一。 |
| Duelist | **Paladin**（Champion） | 光環、連結技能、奉獻地 | **Anointed Champion**：站著不動時身邊有奉獻地。**Absolution**：連結目標的詛咒轉到你身上。直接給 **Determination／Grace／Discipline** 30～40 級光環技能。**Bring the Battle**：被嘲諷的敵人對別人傷害更少、受傷更多。 |
| Marauder | **Ancestral Commander**（⚠️ Juggernaut） | 打擊技能、圖騰、祖靈 | **Ancestral Echo**：打擊技能也會打在上一次使用的位置。**Forest of Ancestors**：圖騰 +1，部分傷害先由最近的圖騰承受。**Spirit of Kaom 等 5 個**：對傳奇敵人觸發條件（被暴擊、被重擊、格擋、圖騰死亡、標記暴擊）召喚祖靈。 |
| Marauder | **Behemoth**（Berserker） | 巨獸：堅定與怒氣，禁法術 | **Rampager**：體型 +10%、**不能用光環、戰吼、法術傷害**，近戰命中算連殺。**Mental Conditioning**：80% 魔力轉成兩倍護甲。**Steel Willed**：每 450 護甲 +2% 攻擊傷害。**Incorruptible**：護甲也擋混沌。 |
| Marauder | **Antiquarian**（Chieftain） | 博物館展品＝傳奇道具效果 | **Goliath Knuckle**：沒有智慧、+200 力量。**Lioneye's Hair**：命中不會被閃避、敏捷 -50%。**Kalguuran Armour**：胸甲一半護甲閃避改給結界（Ward）。**Turtle Shell**：被暈時 1 秒回 8% 生命。 |
| Ranger | **Wildspeaker**（Warden） | 野獸面相（Aspect）、狼、分享球體 | **Flash of Teeth／Feathered Scales**：免保留的貓／鳥面相。**Greatwolf's Call**：與隊友共享暴擊、狂暴、耐力球，大家都有順風。**Pack Mentality**：暴擊觸發召喚靈狼，每隻狼給你攻擊增益。**Boon of the First Ones**：殺稀有怪拿它一個詞綴 20 秒。 |
| Ranger | **Whisperer**（Deadeye） | 魔力就是傷害 | **we know all**：技能魔力消耗 +100%，攻擊加上最大魔力 6% 的閃電傷害。**wait a little**：每花 200 魔力得 10 怒氣。**an infinite pursuit**：智慧不給魔力，改成敏捷給魔力。**not a word**：命中致盲、免疫致盲。 |
| Ranger | **Daughter of Oshabi**（Pathfinder） | 神龕（Shrine）、藤蔓、不鑲寶石 | **Woodland Shrines**：擊殺觸發生成小神龕。**Innate Blessing**：每 8 秒得隨機神龕增益。**Oath of the Maji**：胸甲／頭盔／手套／鞋子沒插寶石就各給大獎勵。**Roots of the Grove**：命中上藤蔓，5 層以上所有傷害都會中毒。 |
| Shadow | **Servant of Arakaali**（Assassin） | 蜘蛛、中毒、凋零 | **Threadspinner**：免保留蜘蛛面相，週期上蛛網。**Silk Dancer**：蛛網裡的敵人傷害 -20%、全抗 -20%。**Broodguard**：擊殺觸發召喚蜘蛛。**Fatal Bite**：滿暴擊球時 40% 物理當額外混沌。 |
| Shadow | **Blind Prophet**（Trickster） | 自己致盲、隨機投射物、詛咒 | **Sightless**：武器攻擊基礎暴擊 9%，但**你永遠是致盲狀態**。**Directionless**：投射物 50% 會飛回，但**方向隨機**。**Careless**：多射 2 個投射物。**Faithless**：詛咒上限＝最大暴擊球數。 |
| Shadow | **Surfcaster**（Saboteur） | 海與釣竿、冰電互轉 | **Stormy Seas**：閃電全轉冰、冰傷害能感電。**Glacial Wave**：被冰緩的敵人依冰緩效果造成更少、承受更多傷害。**Brine Bound**：不會被冰凍，打你的敵人 50% 被冰凍。**Baited Breath**：拿釣竿時全部命中都是暴擊（玩笑型）。 |
| Templar | **Architect of Chaos**（Inquisitor） | 瓦爾技能、生命代替魔力、腐化裝備 | **Impure Blood**：技能消耗生命。**Hewn Flesh**：保留生命而不是魔力。**Dissolution**：移除能量護盾；會失去的生命改成「保留」，1 秒沒受傷才釋放。**Glimpse Chaos**：每件腐化裝備 +10% 生命、+15% 護盾、-2% 全抗。 |
| Templar | **Puppeteer**（Hierophant ⚠️） | 殭屍、活化武器、召喚物帶屬性 | **Graveyard Shift**：殭屍上限 +30%、不需屍體、殭屍本身算屍體。**Rotting Might**：一半力量加給召喚物。**Hexbearer**：多一個詛咒，敵人死時詛咒跳到附近。**Enervating Presence**：附近敵人至少 20% 生命被保留。 |
| Templar | **Polytheist**（Guardian） | 信仰多神：每個大點是一個神 | **Devout of Solaris**：致盲附近敵人，對致盲敵人暴擊率 100% 更多。**Devout of Lunaris**：法術多 2 投射物、新星法術改在指定位置。**Devout of Gruthkul**：+400 生命、8% 再生，但**法術沒有傷害且停用**。**Devout of Ralakesh**：三種球體最低 +3。 |
| Witch | **Harbinger**（Occultist ⚠️） | 時間、增益延長、召喚預兆者 | 召喚不死的「來訪預兆者」三種（專注、秘術、時間），各自週期性給你增益；增益到期變慢、負面到期變快；30% 非混沌傷害穿過護盾但多一層護盾。 |
| Witch | **Herald**（Elementalist） | 捷（Herald）技能專精 | **Coming Calamity**：**光環全停用**，捷的保留效率 200% 更多。**Future Anguish 等 5 個**：某個捷效果 +150% 並給對應抗性上限。**Apocalypse**：捷寶石 +3 級。 |
| Witch | **Bog Shaman**（Necromancer） | 沼澤：生命消耗、混沌、詛咒 | **Rotten Core**：施法時把花掉的魔力當物理傷害打自己，換技能加上 60% 魔力消耗的混沌傷害。**Fell Fen**：附近敵人混抗變 0。**Toad Pact**：全元素抗性 -40%，換投射物速度、範圍、持續時間 +75%。**Pandemic**：最近被打每秒失去 5% 生命，換持續傷害 40% 更多。 |
| Scion | **Scavenger**（Ascendant） | 撿傳奇：每點是一件傳奇的效果 | 25 個節點，每個是一件傳奇道具的招牌詞（例：**Doomfletch** 武器物理 25% 加成各元素、**Midnight Bargain** 各種召喚上限 +、**Foxshade** 滿血時移速與閃避）。**Tabula Rasa**：空節點，可以刺上昇華刺青。 |

### Phrecia 跟正常昇華的差別

1. **代價更露骨、規則改寫更多**：Behemoth 禁法術光環戰吼、Blind Prophet 自己永遠致盲、投射物方向隨機、Polytheist 的 Gruthkul 禁法術、Bog Shaman 的「打自己換傷害」、Gambler 的「三倍傷害但平常更少」。正常昇華多半是「純增益＋一點條件」。
2. **把舊系統拿來當主角**：神龕（Daughter of Oshabi）、捷（Herald）、瓦爾技能（Architect）、蛛網與面相（Servant of Arakaali）、殭屍（Puppeteer）、運氣（Gambler）、屬性（Aristocrat）——都是遊戲裡已有、但平常只是配角的機制。
3. **直接給技能變多**：Paladin 直接給三個高等光環、Wildspeaker 給兩個免保留面相、Harbinger 給三隻召喚物。
4. **傳奇道具當節點**：Antiquarian、Scavenger、（以及正常版的 Reliquarian）把傳奇道具的招牌詞拆出來當昇華節點，等於「從既有詞庫挑出最有個性的那句」。
5. **娛樂向**：Surfcaster 的釣竿節點、Whisperer 的小寫斷句名字——活動版允許失衡與玩笑。2026 回歸時 GGG 有做平衡調整（Ancestral Commander 被削）⚠️。來源：https://poe-vault.com/poe2/news/legacy-of-phrecia-ascendancy-balance-changes-bring-awesome-new-build-opportunities-to-the-event

---

## 3. PoE2 現行昇華（0.5）

來源：https://poe2db.tw/us/Ascendancy_class 與各昇華頁 `https://poe2db.tw/us/<名稱>`。

| 職業 | 昇華 | 主題 | 代表大點 | 「獨特玩法」手法 |
| --- | --- | --- | --- | --- |
| Warrior | Titan | 巨力、重擊（Slam） | **Crushing Impacts**：命中都是粉碎打擊。**Earthbreaker**：重擊有機率多一次餘震。**Stone Skin**：胸甲護甲更多。 | 綁玩法＋質變（餘震） |
| Warrior | Warbringer | 破甲、戰吼、圖騰、格擋 | **Anvil's Weight**：依命中傷害破甲。**Jade Heritage**：累積玉層數換物理減傷。**Turtle Charm**：格擋的命中受傷更少、格擋上限更高。 | 新資源（玉層） |
| Warrior | Smith of Kitava | 鍛造：胸甲、火 | **Heat of the Forge**：給「命中觸發火法術」。**Living Weapon**：給「顯化武器」召喚。**Smith's Masterwork**：只能穿普通胸甲，但每連到的大點給更多護甲。 | 給技能、附代價 |
| Ranger | Deadeye | 投射物、標記、順風 | **Endless Munitions**：多 1 投射物。**Gathering Winds**：用技能得順風，被打失去。**Bullseye**：消耗標記時上「暴擊弱點」。 | 標記→消耗 |
| Ranger | Pathfinder | 中毒、衝刺、藥劑 | **Overwhelming Toxicity**：同目標可疊更多中毒，但中毒持續更短。**Running Assault**：衝刺時不會重暈。**Relentless Pursuit**：速度不受緩速影響。 | 底層規則改寫（毒層數上限） |
| Huntress | Amazon | 命中轉暴擊、弱點 | **Critical Strike**：超出 100% 的命中率變暴擊率。**Penetrate**：依命中值給武器攻擊物理傷害。**Predatory Instinct**：對「暴露弱點」敵人更多傷害。 | 資源轉換（命中→暴擊） |
| Huntress | Ritualist | 首飾、護符、血祭 | **Mystic Attunement**：戒指項鍊的效果更多。**Intricate Sigils**：+1 護符（Charm）欄。**Unfurled Finger**：+1 戒指欄。 | 多一個裝備欄 |
| Huntress | Spirit Walker（0.5 新） | 阿茲梅里靈獸：鹿、熊、梟 | **Vivid Stampede**：每走 10 公尺得一隻靈光（上限 3），攻擊時全部消耗觸發鹿群奔騰。**Primal Bounty**：翻滾消耗梟羽觸發技能。**Sacred Unity**：同時拿三個靈獸大點才能點，三者互相強化。 | 移動產生資源→攻擊消耗；需要多個前置的終極大點 |
| Monk | Invoker | 元素武僧：冰凍、感電、冥想 | **I am the Blizzard…**：10% 傷害當額外冰傷，冰凍時生成冰緩地面。**I am the Thunder…**：10% 傷害當額外閃電，感電 25% 生成感電地面。**Sunder my Enemies…**：暴擊無視非負元素抗。**…and I Shall Rage**：給「無束化身」，異常疊層數。 | 異常延伸成地面；台詞式成對大點 |
| Monk | Acolyte of Chayula | 黑暗（Darkness）取代精魄 | **Embrace the Darkness**：**沒有精魄**；受傷先從黑暗扣（保留 5 秒），基礎黑暗 100、每級 +10。**Chayula's Gift**：混抗上限 +10%、混抗加倍。**Deepening Shadows**：每 1% 混抗 +1% 最大黑暗。**Choice of Power／Mana／Life**：三選一，殘餘物（Remnant）效果與顏色。 | **新資源取代舊資源**；三選一大點 |
| Monk | Martial Artist（0.5 新） | 連擊（Combo）、定身、符文 | **Martial Master**：所有攻擊命中都給連擊，換武器組不會掉。**Way of the Mountain**：定身敵人得「山之教誨」。**Runic Meridians**：頭、身、手、鞋多出只能放符文的孔。**Hollow Form 系列**：給三個技能。 | 把武器專屬機制（Combo）變全域；多孔位 |
| Witch | Infernalist | 地獄火：生命換一切 | **Pyromantic Pact**：最大魔力換成 2 倍「地獄火」；技能消耗會**累積**地獄火而不是扣魔力，滿了就受到等於最大生命＋護盾的火傷並清空，2 秒沒累積就每秒衰退 25%。**Seething Body**：高地獄火時施法得元素執政官。**Demonic Possession**：給惡魔形態。**Beidat's 三點**：保留 25% 生命換魔力／護盾／精魄。 | **資源反轉**（越用越危險） |
| Witch | Blood Mage | 生命施法、法術吸血 | **Sunder the Flesh**：法術基礎暴擊更高。**Vitality Siphon**：法術 20% 傷害吸血。**Gore Spike**：暴擊傷害依當前生命成長。 | 資源替換（生命） |
| Witch | Lich（＋Abyssal Lich） | 能量護盾、詛咒、暴擊球 | **Eternal Life**：有護盾時生命不會變動。**Crystalline Phylactery**：插一顆珠寶，效果 +100%。**Incessant Cacophony**：詛咒無限時間、多一個詛咒。Abyssal 版：**Umbral Well** 骷髏改給「暗影靈魂」、**Steward of Kulemak** 消耗暴擊球觸發技能。 | 底層改寫＋同職業替代昇華 |
| Sorceress | Stormweaver | 元素風暴、秘術增強 | **Constant Gale**：給秘術增強。**Tempest Caller**：法術暴擊生成元素風暴。**Shaper of Storms**：所有命中傷害都算進感電機率。 | 給技能 |
| Sorceress | Chronomancer | 時間 | **Footprints in the Sand**：給「時空裂隙」（回到幾秒前的位置與生命）。**Ultimate Command**：給「時間凍結」。**Unbound Encore**：給「時間回溯」（重置冷卻）。**Phased Form**：受傷 30% 更少，但 4 秒後再承受那次命中的 30%。 | **給技能**、延後傷害 |
| Sorceress | Disciple of Varashta | 精靈（Djinn）、護盾當護甲 | **Barya of Navira／Kelari／Ruzhan**：各給一個精靈，各有三個指令技能。**Sacred Rituals**：當前護盾 60% 算進護甲減傷。**Varashta's Intuition**：元素傷害先扣魔力。 | 給「會聽指令的同伴」 |
| Mercenary | Tactician | 旗幟、圖騰、持續增益 | **Whoever Pays Best**：旗幟沒有數量上限，旗幟產生榮耀（Glory）。**Cannons, Ready!**：+1 圖騰、圖騰技能速度。**A Solid Plan**：持續增益保留更少。 | 綁玩法並解除上限 |
| Mercenary | Witchhunter | 斬殺、集中力 | **Pitiless Killer**：斬殺打擊（Culling Strike）。**Witchbane**：敵人有「集中力」（最大生命 30%），命中會打掉；5 秒沒被打掉就每秒回 10%。**No Mercy**：依敵人失去的集中力，最多 40% 更多傷害。**Obsessive Rituals**：給「法術結界」但護甲閃避 50% 更少。 | **替敵人加一條新資源條** |
| Mercenary | Gemling Legionnaire | 寶石與屬性 | **Integrated Efficiency**：每個連結的紅輔助 +傷害、藍 +暴擊、綠 +技能速度。**Gem Studded**：依最多的輔助寶石顏色給紅／藍／綠其中一種獎勵。**Enhanced Effectiveness**：屬性 20% 更少，但屬性的固有加成加倍。**Adaptive Capability**：寶石屬性需求用你最高的屬性滿足。 | 讓「顏色／屬性」這種原本的限制變成資源 |
| Druid | Oracle | 命運、天賦樹改寫 | **Entwined Realities**：基石附近的非基石天賦可以不連線直接點。**Forced Outcome**：必定暴擊。**The Lesser Harm**：敵人對你的暴擊率與傷害都不幸。**Fateful Vision**：給「改寫命運」技能。 | 改寫天賦樹本身 |
| Druid | Shaman | 怒氣法術、元素適應 | **Furious Wellspring**：怒氣不再自然衰退、每秒回 6%，技能多花 5 怒氣。**Reactive Growth**：元素受傷 10% 更少，並依最大元素命中得到「適應」。**Bringer of the Apocalypse**：給「天啟」技能。**Turning of the Seasons**：附近敵人曝露。 | 舊資源（怒氣）改寫成法術資源 |

---

## 4. 設計手法歸納（最重要）

### A. 給一個新資源或新機制（不是加數值）
| 實例 | 建立在哪個底層上 |
| --- | --- |
| Infernalist 的地獄火：消耗變成累積，滿了自爆 | 魔力消耗、火焰傷害、生命 |
| Acolyte of Chayula 的黑暗：先吸收傷害、再慢慢保留回去 | 精魄（被取代）、混沌抗性、受傷順序 |
| Witchhunter 的集中力：**敵人身上**多一條條子，打掉後吃增傷 | 敵人生命、命中傷害 |
| Spirit Walker 的靈光：走路生成、攻擊消耗 | 移動、攻擊 |
| Warbringer 的玉層 | 物理減傷 |

要點：新資源一定是**既有數值的另一種讀法**（地獄火＝反過來的魔力，黑暗＝延後的生命，集中力＝第二條血），玩家不用重新學一整套。

### B. 改寫底層規則（基石式取捨）
| 實例 | 底層 |
| --- | --- |
| Lich **Eternal Life**：有護盾時生命不變 | 能量護盾／生命 |
| 舊 Chieftain **Ngamahu**：物理一半轉火 | 傷害轉換 |
| Necromancer **Mistress of Sacrifice**：祭品也作用在自己 | 祭品（召喚增益） |
| Pathfinder **Overwhelming Toxicity**：毒疊更多層但更短 | 中毒堆疊上限 |
| Amazon：溢出命中變暴擊 | 命中、暴擊 |
| Oracle：天賦可以不連線 | 天賦樹 |

### C. 綁一種玩法並讓它質變
| 實例 | 玩法 → 質變 |
| --- | --- |
| Elementalist **Shaper of Flames／Storms／Winter** | 異常 → 必定觸發、全傷害可觸發 |
| Invoker 的冰凍／感電 → 生成地面 | 異常 → 地面區域 |
| Tactician 旗幟無上限、Hierophant 圖騰 | 旗幟／圖騰 → 數量與效果 |
| Saboteur | 陷阱地雷 → 觸發時的額外效果 |
| Trickster **Heartstopper** | 閃避／護盾 → 時間輪轉的減傷 |

### D. 給技能
| 實例 | 底層 |
| --- | --- |
| Chronomancer 時空裂隙／時間凍結／時間回溯 | 冷卻、緩速、位置 |
| Smith of Kitava 顯化武器、命中觸發火法術 | 召喚、觸發 |
| Disciple of Varashta 三精靈 | 召喚＋指令 |
| Paladin（Phrecia）直接給三個高等光環 | 光環、精魄 |

要點：技能用的仍是遊戲的通用效果（緩速、觸發、召喚、光環），只是「包成按鈕」。

### E. 「更多」或特殊規則，但附代價
| 實例 | 好處 ↔ 代價 |
| --- | --- |
| Berserker **Aspect of Carnage** ⚠️ | 傷害 40% 更多 ↔ 受傷提高 |
| Chronomancer **Phased Form** | 受傷 30% 更少 ↔ 4 秒後補扣 30% |
| Gambler **Growing Accumulator** | 40% 三倍傷害 ↔ 平常 30% 更少 |
| Witchhunter **Obsessive Rituals** | 法術結界 ↔ 護甲閃避 50% 更少 |
| Smith **Smith's Masterwork** | 護甲更多 ↔ 只能穿普通胸甲 |
| Behemoth **Rampager** | 近戰連殺 ↔ 禁法術、光環、戰吼 |
| Bog Shaman **Pandemic** | 持續傷害 40% 更多 ↔ 被打後每秒掉 5% 生命 |

### F. 其他值得記的手法
- **三選一大點**（Chayula 的 Choice of Power／Mana／Life、Gambler 的 Heads／Tails、Warden 的季節誓約）：同一個位置給互斥的版本，增加重複遊玩。
- **需要多個前置的終極大點**（Spirit Walker 的 Sacred Unity 需三個靈獸大點）：獎勵「全投資一條線」。
- **多一個裝備欄／孔位**（Ritualist、Martial Artist、Nameless 血脈）：讓裝備系統變出新的組合空間。
- **把舊系統或傳奇詞庫抬成主角**（Phrecia 的神龕、捷、蛛網；Reliquarian／Scavenger 的傳奇節點）。
- **成對、台詞式命名**（Invoker 的「I am the Thunder… / …and I Shall Rage」）：讓大點讀起來像一段故事。

---

## 5. 小點與大點結構

| 項目 | PoE1 | PoE2 |
| --- | --- | --- |
| 總點數 | 8 點：迷宮普通／殘酷／無情／永恆各 2 點 | 8 點：昇華試煉（Sekhemas／Chaos）分 4 次、各 2 點 ⚠️（0.5 是否改了取得方式未查） |
| 起點 | 中央起點節點（不花點） | 同左 |
| 大點數量 | 每個昇華約 6～8 個大點；8 點最多點 4 個大點（每個大點前通常有 1 個小點） | 每個昇華約 7～10 個大點＋ 4～6 個小點；一樣大約只能拿 4 個大點 |
| 小點給什麼 | 該昇華主題的通用數值（Trickster 每個小點都是「閃避＋護盾＋一點別的」；Necromancer 每個小點都是「召喚物傷害＋一點別的」） | 同一主題的單一數值（Infernalist：生命、法術傷害、暴擊率；Witchhunter：冷卻、範圍、護甲閃避、對低血敵人傷害） |
| 分支方式 | 起點向外放射 4～6 條，每條「小點 → 大點」，有些大點後面再接一個大點（Juggernaut 的鏈） | 起點出發幾條主幹，主幹上「小點 → 大點 → 大點」，部分大點是前一個的強化（Infernalist：Pyromantic Pact → Seething Body；Witchhunter：Witchbane → No Mercy；Obsessive Rituals → Ceremonial Ablution） |
| 路線設計 | 大點多半互相獨立，主要取捨是「4 選 x」 | 更常見「主幹＋強化點」與「三選一」；終極大點要求多個前置（Sacred Unity） |

來源：https://poe2db.tw/us/Witchhunter （13 個節點：4 小點＋ 8 大點）、https://poe2db.tw/us/Infernalist 、https://poe2db.tw/us/Acolyte_of_Chayula 。⚠️ poedb／poe2db 頁面沒有明標「小點／大點」，上表的分類是依節點內容推斷。

實用結論：**8 點＝ 4 個大點 ＋ 4 個小點**是雙方共同的骨架；一個昇華準備 6～8 個大點，讓玩家只能拿一半，取捨就自然出現。

---

## 6. 給我們的建議

> ⚠️ 這一節已由 `docs/開發參考.md` 0.1 節（2026-11-02 定案）與 `docs/技能分配.md` 取代，只留作紀錄。

原則：
1. 每個昇華至少一個「**改寫規則**」的大點（A、B 或 E 類），其餘可以是綁玩法（C）或給技能（D）。不要整棵都是「+x%」。
2. 新資源只能是**現有底層的另一種讀法**：例如三種球體的新產生方式／新消耗方式、精魄的新用法、異常變地面效果（只要不新增地面類型就用現有的異常本身）。
3. 8 點骨架：起點 → 3～4 條主幹，每條「小點 → 大點 → 強化大點」，共 7～8 個大點，玩家拿 4 個。每個昇華放一組三選一。
4. 因為只有一位主角，「職業」只是分組：建議**依武器分組**，讓武器選擇自然帶出昇華選擇。

以下每個大點後面括號寫用到的既有底層。

### 職業一：劍士（刀、野太刀）

**昇華 1：居合** — 一刀定勝負的暴擊流。
- 拔刀：一段時間沒有攻擊後，下一擊必定暴擊並造成更多傷害；附代價：連續攻擊時暴擊率降低。（暴擊、「更多」同池）
- 斬鐵：暴擊時對敵人上破甲；對破甲敵人的暴擊無視部分護甲。（暴擊、破甲、護甲）
- 殘心：擊殺後獲得順風；順風期間第一擊視為拔刀。（順風、暴擊）

**昇華 2：血刃** — 以血換傷、越打越狂。
- 血誓：技能消耗改從生命扣，換猛攻常駐；生命低於一半時狂怒。（生命、猛攻、狂怒）
- 血河：流血的敵人被暴擊時，剩餘流血傷害一次結算。（流血、暴擊）
- 殘喘之刃：自己處於殘喘時傷害「更多」，但無法回復生命。（殘喘、「更多」）

**昇華 3：不動** — 站著擋下一切。
- 鐵壁：單一格擋成功時給一顆耐力類球體（三種球體之一）；球體可消耗換重暈敵人。（格擋、球體、重暈）
- 重心：不會被暈眩，但移動速度降低。（暈眩、附代價）
- 反斬：格擋後下一擊必定造成暈眩累積加倍。（格擋、暈眩）

### 職業二：槍棍（矛、棍）

**昇華 1：穿雲** — 穿刺疊層，一次引爆。
- 穿刺上限 +2；消耗一顆球體可以一次結算目標身上所有穿刺。（穿刺、球體）
- 對被標記的敵人，穿刺也會跳到標記擁有的鄰近敵人？⚠️ 若「跳」不是現有規則就改成：對標記敵人穿刺效果提高。（穿刺、標記）
- 易碎打擊：命中易碎的敵人必定穿刺。（易碎、穿刺）

**昇華 2：碎岳** — 棍的重暈與破甲。
- 重暈的敵人受到的傷害「更多」；重暈結束時對附近敵人造成破甲。（重暈、破甲）
- 化身：達到暈眩門檻時自己進入化身一段時間。（暈眩、化身）
- 守護：周圍有被暈眩的敵人時自己得到守護。（暈眩、守護）

### 職業三：弓手（弓）

**昇華 1：鷹眼** — 標記與曝露的狙擊手。
- 消耗標記時給目標上曝露並保證暴擊。（標記、曝露、暴擊）
- 同時存在的標記 +1，但每個標記效果降低。（標記、附代價）
- 致盲的敵人對你的命中改為不幸（擲兩次取低）。（致盲、命中閃避／熵值）

**昇華 2：風行** — 順風與閃避，一直動。
- 順風常駐；被命中時失去，閃避成功時立刻取回。（順風、命中閃避）
- 移動中產生球體，攻擊時全部消耗換傷害「更多」。（球體、「更多」）（參照 Spirit Walker 的「走路生成、攻擊消耗」）
- 閃避的熵值累積滿時，下一次命中保證閃避並觸發反擊。（命中閃避／熵值）

**昇華 3：獵陣** — 陷阱與砲台。
- 陷阱觸發時給敵人上冰緩；冰緩敵人踩陷阱時冰凍。（陷阱、冰緩、冰凍）
- 砲台數量 +1，但砲台持續時間縮短。（砲台、附代價）
- 地雷引爆時對範圍內敵人上曝露。（地雷、曝露）

### 職業四：術士（法杖、魔杖）

**昇華 1：咒縛** — 詛咒專家。
- 詛咒上限 +1，被兩種以上詛咒的敵人受到的異常效果提高。（詛咒、異常）
- 被詛咒的敵人死亡時，詛咒跳到附近一個敵人。（詛咒）（參照 Puppeteer Hexbearer）
- 消耗一顆球體，把一個詛咒變成標記效果加倍。⚠️ 若「詛咒轉標記」太新就改成：消耗球體讓詛咒效果暫時「更多」。（詛咒、球體）

**昇華 2：元素** — 三種元素異常的質變。
- 感電必定施加，且感電的敵人受到觸電的機率提高。（感電、觸電）
- 點燃的敵人也會焦灼；冰凍的敵人也會易碎。（點燃、焦灼、冰凍、易碎）
- 三選一：火／冰／電誓約——選一種元素，該元素抗性懲罰對你減半，另外兩種加倍。（抗性與懲罰、三選一）

**昇華 3：秘門** — 能量護盾與秘術增強。
- 有能量護盾時生命不會降低；附代價：生命不會自然回復。（能量護盾、生命）（參照 Lich Eternal Life）
- 消耗能量護盾的一部分施法，換秘術增強。（能量護盾、秘術增強）
- 護盾全滿時給自己守護。（能量護盾、守護）

### 職業五：影忍（短刀）

**昇華 1：毒牙** — 中毒與凋零。
- 中毒層數上限提高，但每層持續時間縮短。（中毒）（參照 Pathfinder）
- 中毒達到 x 層時施加凋零。（中毒、凋零）
- 致盲的敵人身上的中毒傷害「更多」。（致盲、中毒）

**昇華 2：幻影** — 閃避與致盲的一擊脫離。
- 命中致盲；對致盲敵人的暴擊率提高。（致盲、暴擊）
- 閃避成功時得到邪力。（命中閃避、邪力）
- 殘喘狀態下閃避大幅提高，但能量護盾歸零。（殘喘、閃避、附代價）

**昇華 3：機巧** — 地雷與陷阱的刺客。
- 地雷每次引爆給一顆球體；球體上限 +1。（地雷、球體）
- 陷阱觸發時讓敵人流血。（陷阱、流血）
- 站著不動時陷阱投擲速度「更多」。（陷阱、附代價）

### 職業六：召主（任何武器，偏法杖、魔杖）

**昇華 1：狼群** — 召喚狼為核心。
- 狼的數量 +1，狼會繼承你的猛攻與狂怒。（召喚狼、猛攻、狂怒）
- 狼命中被標記的敵人時暴擊。（召喚狼、標記、暴擊）
- 狼死亡時給你一顆球體。（召喚狼、球體）

**昇華 2：圖騰** — 圖騰與砲台的陣地戰。
- 圖騰數量 +1；部分受到的傷害先由最近的圖騰承受。（圖騰、生命）（參照 Ancestral Commander）
- 砲台持續時間內，自己得到守護。（砲台、守護）
- 站著不動時，你與圖騰的精魄光環效果提高。（精魄光環、圖騰）

**昇華 3：護符** — 護符與光環的團隊增益。
- 多一個護符欄。（護符）（參照 Ritualist）
- 精魄光環也作用在召喚物，效果「更多」但精魄消耗提高。（精魄光環、召喚、附代價）
- 光環範圍內的敵人受到曝露。（精魄光環、曝露）

---

## 本文件最不確定的部分

1. Phrecia 各昇華「取代哪個原昇華」是依 poedb 頁面上的連結推斷，Ancestral Commander、Puppeteer、Harbinger 這三個特別不確定。
2. PoE1 Berserker、Slayer、Gladiator、Champion、Inquisitor、Hierophant、Guardian、Assassin、Occultist、Deadeye、Pathfinder、Warden、Saboteur 的大點效果是憑既有知識濃縮，沒逐頁核對數字。
3. Reliquarian、Luminary 加入的版本（3.26？3.28 以後？），以及 Warden 是哪一版取代 Raider。
4. PoE2 0.5 的昇華點數取得方式是否仍是 4 次試煉、各 2 點。
5. 小點／大點的分類：poedb 沒有標示，是依節點內容推斷。
