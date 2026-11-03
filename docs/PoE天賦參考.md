# PoE 天賦樹數值參考（下修天賦用）

整理日期：2026-11-02。PoE2 為主，PoE1 對照。

## 給我們的建議量級（照 PoE2）

PoE2 的走向是**小點只給一點點，傷害和防禦都靠「疊很多個 increased」，生命幾乎不從樹上拿 %**。我們的天賦如果小點就給 +5% 生命、+20% 傷害，就是膨脹了。

| 類別 | 小點建議 | 大點建議 | PoE2 實際（見下文） |
| --- | --- | --- | --- |
| 生命 | 不給 %；給 +10 固定值或 +5 力量 | 3% 最大生命（或 +20 固定生命）＋另一個效果 | 小點 3074 個只有 1 個 %生命；大點 3% |
| 生命回復 | 回復速度 +10%、每秒 0.1～0.2% | 每秒 0.5～1%、受傷回收 5～8% | 同左 |
| 護甲／閃避／能量護盾 | +10～15% | +20～30%（少數 40%） | 小點 10～15，大點 20～30 |
| 一般傷害（攻擊、法術、元素、物理、投射物、近戰、召喚物） | +8～12% | +20～30%；有條件可到 40～50%；有缺點（例：攻速 -5%）可到 40～50% | 小點 8～12，大點 15～35 |
| 單一元素傷害 | +10～12% | +20～30% | 同左 |
| 攻速／施法／技能速度 | +2～3% | +5～8%（條件式 8～16%） | 小點 2～3，大點 4～10 |
| 移速 | +2% | +3～4% | 同左 |
| 暴擊率（increased） | +10% | +15～25%（條件式 50%） | 同左 |
| 暴擊傷害加成 | +15% | +20～25%（只限某武器時 40%） | 小點 15，大點 20～25 |
| 抗性 | +5% 單抗（少量） | +10% 單抗 或 +3% 全抗；+1% 最大抗為頂 | 同左 |
| 範圍 | +4～6% | +8～15% | 同左 |
| 持續時間 | +5～10% | +10～20% | 同左 |
| 格擋（increased） | +5% | +10～15% | 同左 |
| 魔力回復 | +10% | +15～20% | 同左 |
| 精魄 | 不給 | 頂多 4% increased（全樹只有 1 個） | 同左 |
| 異常機率 | +10%；直接「命中時 x% 機率中毒／流血」5～8% | +15～20%；直接機率 25～30% | 同左 |
| 異常強度（magnitude） | +10% | +15～25%；條件式到 35～80% | 同左 |
| 「更多（more）」 | 不給 | 幾乎不給；要給就 10～20% 而且要窄條件（某武器＋某狀態） | 984 大點只有 4 個 more |
| 直接減傷 | 不給 | 不給（只給召喚物／圖騰 20%） | 玩家大點沒有 |
| 基石 | — | 30～50% more／less，一定配一個明顯缺點 | 見第 4 節 |

點數規模：PoE2 滿級 123 點（99 升級＋24 任務），Lv60～70 大約 80～90 點；樹上約 22% 是大點。

---

## 資料來源與方法

- **PoE2 天賦樹**：Path of Building PoE2 的 `src/TreeData/0_5/tree.json`（PoE2 0.5 版樹，GitHub 最後更新 2026-09-29）
  https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/blob/dev/src/TreeData/0_5/tree.json
- **PoE1 天賦樹**：GGG 官方匯出 `grindinggear/skilltree-export` 的 `data.json`（最後更新 2026-07-31）
  https://github.com/grindinggear/skilltree-export/blob/master/data.json
- 下面的「出現次數」「數值分佈」都是我把上面兩份 JSON 下載後用腳本統計的（例：`15x28 12x23` = 數值 15 出現 28 次、12 出現 23 次）。主樹節點 = 扣掉昇華、職業起點、珠寶孔、純圖示、PoE1 的精通（mastery）與塗油專用點。
- poe2wiki.net／poewiki.net 這次用 WebFetch 都被防機器人（Anubis）擋下，**只能用搜尋摘要**引用，標註「搜尋摘要」的數字沒有親眼看到原頁。

---

## 1. 總點數與樹的規模

| 項目 | PoE2 | PoE1 | 來源 |
| --- | --- | --- | --- |
| 滿級天賦點 | 123（99 升級＋24 任務） | 123（JSON `points.totalPoints`） | PoE2：https://www.poe2wiki.net/wiki/Passive_Skill_Points （搜尋摘要）；PoE1：data.json |
| 昇華點 | 8 | 8 | PoE1：data.json `ascendancyPoints`；PoE2 同為 8（**未直接查證**） |
| 武器組天賦點（PoE2） | 最多 24，來自任務的專精之書，每本 2 點 | 無 | https://poe2wiki.net/wiki/Weapon_Set （搜尋摘要）；https://maxroll.gg/poe2/resources/poe-2-passive-tree-and-dual-specialization |
| 主樹節點數 | 4465 | 2343 | 兩份 JSON 統計 |
| 小點 | 3448（77%） | 1532（65%） | 同上 |
| 大點（notable） | 984（22%） | 755（32%） | 同上 |
| 基石（keystone） | 33 | 56（含已停用／特殊來源的） | 同上；PoE2 33 個與 https://poe2db.tw/us/Keystone 一致 |
| 昇華節點 | 431 | 558 | 同上 |

Lv60～70 的點數（**推算**）：升級給 59～69 點，加上主線任務大部分已拿（約 15～24），合計約 **75～90 點**，其中約 1/4～1/3 是走路的連接小點。

PoE2 小點有 2553 個只有 1 條詞、507 個 2 條、14 個 3 條（JSON 統計）。

---

## 2. 小點常見數值

### PoE2（0.5 樹，3448 小點）

| 類別 | 詞條原文 | 個數 | 數值分佈 |
| --- | --- | --- | --- |
| 屬性（最大宗） | +# to any Attribute | 293 | 5（全部） |
| 屬性 | +# to Strength / Dexterity / Intelligence | 23／18／11 | 多為 5～10 |
| 生命 % | #% increased maximum Life | **1** | 1 |
| 生命（間接） | 力量每點 +2 最大生命、智力每點 +2 魔力 | — | https://vulkk.com/2025/02/17/path-of-exile-2-attributes-explained/ （第三方攻略）→ 一個 +5 屬性小點 ≈ +10 生命 |
| 生命回復 | #% increased Life Regeneration rate | 27 | 10x19 5x5 25x2 |
| 生命回復 | Regenerate #% of maximum Life per second | 7 | 0.2x5 0.1x2 |
| 受傷回收 | #% of Damage taken Recouped as Life | 18 | 3（全部） |
| 偷取 | #% increased amount of Life Leeched | 17 | 8x11 12x3 |
| 藥劑 | #% increased Life Recovery from Flasks | 21 | 10x19 15x2 |
| 護甲 | #% increased Armour | 59 | 10x24 12x18 15x15 |
| 閃避 | #% increased Evasion Rating | 63 | 15x28 12x23 |
| 能量護盾 | #% increased maximum Energy Shield | 55 | 12x37 15x14 10x4 |
| 能量護盾 | #% faster start of Energy Shield Recharge | 59 | 4x32 6x23 |
| 混合防禦 | #% increased Armour and Evasion Rating | 24 | 12x22 |
| 護甲擋元素 | +#% of Armour also applies to Elemental Damage | 28 | 5x19 |
| 偏斜 | Gain Deflection Rating equal to #% of Evasion Rating | 48 | 8x22 5x17 |
| 攻擊傷害 | #% increased Attack Damage | 68 | 10x24 8x22 5x11 |
| 近戰 | #% increased Melee Damage | 24 | 10x17 8x6 |
| 投射物 | #% increased Projectile Damage | 30 | 10x26 8x4 |
| 法術 | #% increased Spell Damage | 35 | 10x16 8x12 12x4 |
| 元素 | #% increased Elemental Damage | 45 | 10x24 8x19 |
| 物理 | #% increased Physical Damage | 44 | 10x16 8x10 12x9 |
| 火／冰／電 | #% increased Fire / Cold / Lightning Damage | 39／34／46 | 主要 12，其次 10、8 |
| 混沌 | #% increased Chaos Damage | 33 | 7x16 21x6 5x5 |
| 全傷害 | #% increased Damage | 15 | 10x9 15x3 |
| 穿透 | Damage Penetrates #% Fire/Cold/Lightning Resistance | 14／12／18 | 6 |
| 攻速 | #% increased Attack Speed | 44 | 3x26 2x18 |
| 施法速度 | #% increased Cast Speed | 22 | 3x19 2x3 |
| 技能速度 | #% increased Skill Speed | 11 | 3x7 2x2 4x2 |
| 移速 | #% increased Movement Speed | 11 | 2x7 1x2 3x2 |
| 暴擊率 | #% increased Critical Hit Chance | 35 | 10x28 5x5 |
| 暴擊傷害 | #% increased Critical Damage Bonus | 30 | 15x26 20x3 |
| 抗性 | +#% to Lightning / Cold / Fire / Chaos Resistance | 7／6／3／3 | 5 為主（2～5） |
| 範圍 | #% increased Area of Effect for Attacks | 36 | 6x23 4x13 |
| 範圍 | #% increased Area of Effect | 13 | 6x7 5x4 |
| 持續時間 | #% increased Skill Effect Duration | 25 | 10x10 5x7 8x4 |
| 格擋 | #% increased Block chance | 38 | 5x28 4x7 8x3 |
| 精魄 | （小點沒有任何精魄） | 0 | — |
| 魔力 | #% increased Mana Regeneration Rate | 54 | 10x39 |
| 召喚物傷害 | Minions deal #% increased Damage | 49 | 10x23 6x9 15x7 |
| 召喚物生命 | Minions have #% increased maximum Life | 25 | 10x11 |
| 異常機率 | #% increased chance to inflict Ailments | 17 | 10x9 6x7 |
| 直接上異常 | #% chance to Poison on Hit／chance to inflict Bleeding on Hit | 13／16 | 8／5 |
| 異常強度 | #% increased Magnitude of Poison / Ignite / Bleeding | 15／13／7 | 10 為主 |
| 異常強度（總） | #% increased Magnitude of Ailments you inflict | 7 | 5～12 |
| 異常速度 | Damaging Ailments deal damage #% faster | 2 | 5 |
| 異常持續 | #% increased Duration of Damaging Ailments on Enemies | 4 | 5～6 |
| 累積類 | #% increased Freeze / Stun Buildup | 35／34 | 15 為主 |
| 點燃累積 | #% increased Flammability Magnitude | 31 | 30x14 15x9 |
| 感電機率 | #% increased chance to Shock | 20 | 15x11 |

來源：PoE2 tree.json（上方網址）統計。

### PoE1（官方 data.json，1532 小點）

| 類別 | 詞條 | 數值分佈 |
| --- | --- | --- |
| 屬性 | +# to Str/Dex/Int | 10（約 210 個） |
| 生命 | #% increased maximum Life（71 個） | 5x33 4x21 6x13 |
| 魔力 | #% increased maximum Mana（47） | 8x30 |
| 能量護盾 | #% increased maximum Energy Shield（46） | 5x23 6x14 4x9 |
| 閃避／護甲 | #% increased Evasion Rating／Armour | 閃避 10～14；護甲 8～14 |
| 攻速／施法 | #% increased Attack／Cast Speed | 3～4 |
| 物理／元素／法術 | #% increased … Damage | 8～12（單元素 8～16） |
| 雙手物理 | #% increased Physical Damage with Two Handed Melee Weapons（17） | 12x10 14x4 16x2 |
| 暴擊率 | #% increased Critical Strike Chance | 12～25 |
| 全抗 | +#% to all Elemental Resistances（19） | 3～5 |
| 格擋 | +#% Chance to Block Attack Damage while…（直接加，非 increased） | 2～4 |
| 範圍 | #% increased Area of Effect | 5～12 |
| 回血 | Regenerate #% of Life per second | 0.4～0.6 |
| 移速 | #% increased Movement Speed | 3 |
| 持續傷害倍率 | +#% to Damage over Time Multiplier | 3～6 |

來源：PoE1 data.json（上方網址）統計。**對照重點**：PoE1 小點直接給 4～6% 生命，PoE2 拿掉了，改成 +5 屬性。

---

## 3. 大點（notable）

全部來自 PoE2 tree.json 原文（PoE1 例子來自 data.json）。

### 傷害
- **Brutal**：16% increased Melee Damage；10% increased Stun Buildup；+10 to Strength
- **Reaching Strike**：25% increased Melee Damage；+0.2 metres to Melee Strike Range
- **Turn the Clock Forward**：20% increased Spell Damage；15% increased Projectile Speed for Spell Skills
- **Elemental Force**：20% increased Elemental Damage；+3% to all Elemental Resistances
- **Crushing Verdict**（有缺點）：50% increased Attack Damage；30% increased Stun Buildup；5% reduced Attack Speed
- **Comradery**：30% increased Damage；Minions deal 30% increased Damage

量級：單一類別 +15～35%（物理 20x6 25x6；攻擊傷害 16～25 為主；火 15～30；法術 15～30；投射物 15～20）。**附缺點或條件時拉到 40～50%**。

### 條件式傷害（寫法：while／if you've … Recently／against … enemies／per …）
- **Killer Instinct**：40% increased Attack Damage while on Full Life；60% increased Attack Damage while on Low Life
- **Last Stand**：四條各 25% increased Attack Damage（被重擊暈後／沒有生命藥劑次數／被包圍／低血）
- **Empowering Infusions**：35% increased Spell Damage if you have consumed an Elemental Infusion Recently
- **Arcane Intensity**：3% increased Spell Damage per 100 maximum Mana
- **Finality**：120% increased Damage with Hits against Enemies that are on Low Life；5% increased Damage taken while on Low Life

984 個大點裡有 185 個用 while／if you／Recently 寫條件。條件越窄數值越高（Finality 對低血敵人 120%）。

### 速度
- **Overzealous**：16% increased Cast Speed；15% increased Mana Cost of Skills
- **Flow State**：5% increased Skill Speed；15% increased Mana Regeneration Rate
- **Blood Rush**：6% increased Skill Speed；6% of Skill Mana Costs Converted to Life Costs
- **Lightning Quick**：14% increased Lightning Damage；8% increased Attack and Cast Speed with Lightning Skills
- **Blade Flurry**：6% increased Attack Speed while Dual Wielding；15% increased Attack Critical Hit Chance while Dual Wielding

量級：攻速 4～10（6x5 4x3）、施法 5～16、技能速度 5～6、移速 3～4。

### 暴擊
- **Heartbreaking**：25% increased Critical Damage Bonus；+10 to Strength
- **Deadly Force**：15% increased Critical Hit Chance；15% increased Damage if you've dealt a Critical Hit in the past 8 seconds
- **Leaping Ambush**：50% increased Critical Hit Chance against Enemies that are on Full Life
- **Sundering**：25% increased Critical Damage Bonus for Attack Damage；+25% to Critical Damage Bonus against Stunned Enemies

量級：暴擊率 15～25（條件式 50）；暴擊傷害 20～25（限武器 40～80）。

### 生命與防禦
- **Unbending**：3% increased maximum Life；10% increased Stun Threshold for each time you've been Hit Recently, up to 100%
- **Chakra of Life**：3% increased maximum Life；10% increased Life Recovery rate
- **Infused Flesh**：+20 to maximum Life；8% of Damage taken Recouped as Life
- **Heavy Buffer**：40% increased maximum Energy Shield；5% of Damage taken bypasses Energy Shield
- **Thickened Arteries**：Regenerate 0.5% of maximum Life per second；40% increased Life Regeneration Rate while stationary
- **Vigilance**：12% increased Block chance；10 Life gained when you Block；+2% to maximum Block chance

量級：最大生命只有 **3%**（主樹 4 個 3%、1 個 3% 生命魔力護盾、1 個 +20 固定）；護甲／閃避／護盾 20～30%；回收 5～8%；單抗 +5～10、全抗 +3；最大抗 +1～2%。

### 抗性
- **Embracing Frost**：+1% to Maximum Cold Resistance；+10% to Cold Resistance
- **Elemental Force**：+3% to all Elemental Resistances；20% increased Elemental Damage

### 異常
- **Slow Burn**：20% increased Ignite Magnitude；20% increased Ignite Duration on Enemies
- **Fast Acting Toxins**：Damaging Ailments deal damage 12% faster
- **Lasting Toxins**：10% increased Skill Effect Duration；40% increased Poison Duration
- **First Sting**：30% chance to Poison on Hit against Enemies that are not Poisoned；80% increased Magnitude of Poison you inflict on targets that are not Poisoned
- **Wasting**：15% increased Duration of Damaging Ailments on Enemies；30% increased Damage with Hits against Enemies affected by Ailments

### 「更多（more）」與直接減傷
- 984 個大點裡只有 4 個帶 more：**Skullcrusher**「20% more Damage against Heavy Stunned Enemies with Maces」、**Pure Power**「10% more Maximum Lightning Damage」、**Overwhelming Strike**「20% more Stun Buildup with Critical Hits」（另一個是說明文字裡的 more）。都是窄條件、10～20%。
- 玩家自己的**直接減傷大點：0 個**。「additional Physical Damage Reduction」只出現在召喚物（Left Hand of Darkness 20%）和圖騰（Hardened Wood 20%）。玩家防禦走 % 護甲、回收（Recouped）、護甲擋元素、降低異常效果（例：Heatproof「30% reduced Magnitude of Ignite on you」）。
- PoE1 對照：755 大點也只有 4 個 more；PoE1 大點生命 5～10%（Constitution「+20 to maximum Life；10% increased maximum Life」、Thick Skin 10%）、Diamond Skin「+15% to all Elemental Resistances」、Throatseeker「+30% to Critical Strike Multiplier」。

來源：PoE2 tree.json、PoE1 data.json（上方網址）。

---

## 4. 基石

### PoE2 全部 33 個（tree.json 原文，忠實翻譯；與 https://poe2db.tw/us/Keystone 的 33 個一致）

| 名稱 | 效果 |
| --- | --- |
| Resolute Technique | 命中值加倍；永遠不會暴擊 |
| Giant's Blood | 雙手斧／錘／劍可單手拿；武器屬性需求 ×3；力量給的生命減半 |
| Unwavering Stance | 不會被輕度暈眩；不能翻滾或衝刺 |
| Avatar of Fire | 75% 傷害轉為火焰；不造成非火焰傷害 |
| Blood Magic | 沒有魔力；技能魔力消耗改扣生命 |
| Zealot's Oath | 溢出的生命再生加到能量護盾；能量護盾不會充能 |
| Ancestral Bond | 圖騰上限加倍；放圖騰不需充能；每個圖騰保留 75 精魄 |
| Pain Attunement | 滿血時暴擊傷害加成 30% less；低血時 30% more |
| Chaos Inoculation | 最大生命為 1；免疫混沌傷害與流血 |
| Eldritch Battery | 能量護盾 100% 轉為魔力；魔力消耗加倍 |
| Mind Over Matter | 所有傷害先扣魔力；魔力回復 50% less |
| Whispers of Doom | 可多掛一個詛咒；詛咒啟動延遲加倍 |
| Necromantic Talisman | 護身符的所有加成改給召喚物 |
| Conduit | 你獲得的充能球改給身邊的隊友 |
| Resonance | 暴擊球／狂怒球／耐力球的獲得互換一輪 |
| Eternal Youth | 生命改成會充能（取代能量護盾）；藥劑回血 50% less |
| Primal Hunger | 最大怒氣 100% more；依近期消耗回復怒氣；怒氣沒有效果 |
| Dance with Death | 副手空、主手單手武器時技能速度 25% more |
| Heartstopper | 剛開始受到持續傷害的 1 秒內該傷害 50% less，否則 50% more |
| Oasis | 不能用護符；藥劑回復 30% more |
| Vaal Pact | 偷取量 50% more；偷取速度 67% less；只能靠偷取回血 |
| Iron Reflexes | 全部閃避轉成護甲 |
| Glancing Blows | 閃避判定變不幸（擲兩次取差）；偏斜判定變幸運（擲兩次取好） |
| Elemental Equilibrium | 元素灌注殘留物循環替換（火→電、電→冰、冰→火） |
| Bulwark | 翻滾不能閃避傷害；翻滾中受到的命中傷害 30% less |
| Crimson Assault | 流血變惡化；基礎流血持續 1 秒；流血強度 50% more |
| Trusted Kinship | 可帶兩個不同種的夥伴；夥伴技能保留效率 30% more、其他 20% less |
| Hollow Palm Technique | 雙手空時當作拿木杖攻擊；依護甲上的閃避加攻速、能量護盾加暴擊率 |
| Blackflame Covenant | 火焰法術 100% 轉混沌；混沌照樣累積易燃與點燃；點燃改造成混沌傷害 |
| Ritual Cadence | 祈喚技能改成每 2 秒觸發法術；觸發時不能累積能量；祈喚法術能量消耗 50% less |
| Scarred Faith | 每單位敵人強度，被護甲擋下的物理傷害 5% 回收為能量護盾；能量護盾不充能、不再生、不能超過護甲 |
| Lord of the Wilds | 拿法器時可以裝非傳奇權杖；精魄 50% less；非召喚物技能保留效率 50% less |
| Wildsurge Incantation | 風暴與植物法術：傷害 50% more、消耗 50% less、持續時間 75% less |

量級：**正面效果 25～50% more，一定配一個同量級的 less 或「不能做某事」**。

### PoE1 常見 12 個（data.json 原文）

| 名稱 | 效果 |
| --- | --- |
| Glancing Blows | 攻擊格擋率加倍、法術格擋率加倍；**被格擋的命中仍承受 65% 傷害** |
| Resolute Technique | 你的命中不會被閃避；永遠不會暴擊 |
| Chaos Inoculation | 最大生命變 1；免疫混沌傷害 |
| Iron Reflexes | 全部閃避轉為護甲；敏捷不再給閃避 |
| Mind Over Matter | 40% 傷害先扣魔力 |
| Elemental Overload | 8 秒內有暴擊過的技能，元素傷害 40% more；暴擊不造成額外傷害 |
| Precise Technique | 命中值高於最大生命時攻擊傷害 40% more；永遠不會暴擊 |
| Point Blank | 投射物剛飛出時最多 30% more 傷害，飛越遠越少 |
| Wind Dancer | 近期沒被攻擊命中時攻擊傷害承受 20% less；被命中後 20% more |
| Avatar of Fire | 物理、冰、電 50% 轉火；不造成非火焰傷害 |
| Eldritch Battery | 先用能量護盾付魔力；護盾保護魔力而非生命；護盾充能 50% less |
| Perfect Agony | 異常的持續傷害倍率等於暴擊倍率；暴擊不加傷害；非暴擊不能上異常 |
| Unwavering Stance | 不能閃避攻擊；不會被暈眩 |

來源：PoE1 data.json（上方網址）。

---

## 5. Lv60～70 典型 build 從樹上拿到的總量（**推算，找不到可直接引用的攻略實例**）

假設 85 點（見第 1 節）：約 22 個大點、約 63 個小點（其中約 15 個 +5 屬性、約 15 個走路用的低價值點）。用第 2、3 節的常見值：

| 項目 | 推算總量 | 算法 |
| --- | --- | --- |
| 最大生命 % | **+3～9%** | 1～3 個 3% 大點 |
| 固定生命 | 約 +150～250 | 15～25 個屬性小點的力量 ×2 生命（另加大點的 +10～25 力量） |
| 主屬性傷害（例：近戰物理） | **+200～350% increased** | 約 18 個傷害小點 ×10% ≈ 180%；約 8 個傷害大點 ×25% ≈ 200%；扣掉不同類別不疊的部分 |
| 攻速／施法 | +15～30% | 5 個小點 ×3% ＋ 2 個大點 ×6% |
| 主防禦（護甲或閃避） | +100～200% | 8 個小點 ×12% ＋ 2～3 個大點 ×25% |
| 暴擊率／暴擊傷害（有走暴擊才算） | 暴擊率 +60～100%、暴傷 +50～80% | 4～6 個小點＋1～2 個大點 |
| 抗性 | +0～15% | 樹上很少，主要靠裝備 |
| more 乘區 | 0～1 個（10～20%） | 大點幾乎沒有，主要來自基石／昇華 |

（PoE2 的傷害主要乘區在技能寶石與武器，天賦樹的 +300% increased 換算成實際傷害約 ×2～×4 之間，因為 increased 只加在同一乘區裡。）

---

## 6. 「持某武器時」的天賦（PoE2）

- PoE2 沒有獨立的「武器專精區」，而是**武器組天賦點**：最多 24 點（任務的專精之書每本 2 點），可以把某些天賦點只綁在武器組 1 或 2，切武器才生效。來源：https://poe2wiki.net/wiki/Weapon_Set （搜尋摘要）、https://maxroll.gg/poe2/resources/poe-2-passive-tree-and-dual-specialization 。
- 樹上的武器類小點（tree.json 統計）：

| 詞條 | 個數 | 數值 |
| --- | --- | --- |
| #% increased Damage with Two Handed Weapons | 13 | 10 |
| #% increased Damage with One Handed Weapons | 9 | 10 |
| #% increased Damage with Bows | 7 | 10～16 |
| #% increased Damage with Swords | 7 | 10 |
| #% increased Damage with Maces | 4 | 10～15 |
| #% increased Damage with Crossbows／Spears／Flails | 3 各 | 10～12 |
| #% increased Attack Speed with Bows／Daggers／Quarterstaves／Spears／Axes | 3～6 | 3～5 |
| Attack Skills deal #% increased Damage while holding a Shield | 5 | 10 |
| #% increased Armour, Evasion and Energy Shield from Equipped Shield | 7 | 15～25 |

- 武器類大點：
  - **Spiked Whip**：25% increased Damage with Flails
  - **Javelin**：40% increased Critical Damage Bonus with Spears
  - **Push the Advantage**：40% increased Critical Damage Bonus with One Handed Melee Weapons
  - **Power Shots**：80% increased Critical Damage Bonus with Crossbows；15% reduced Attack Speed with Crossbows
  - **Martial Artistry**：25% increased Accuracy Rating with Quarterstaves；25% increased Critical Damage Bonus with Quarterstaves；+25 to Dexterity
  - **Skullcrusher**：20% more Damage against Heavy Stunned Enemies with Maces
  - **Overwhelm**：40% increased Damage with Two Handed Weapons；20% increased Stun Buildup；5% reduced Attack Speed

  規律：**限定武器時，數值約是同類通用大點的 1.5 倍**（通用暴傷 25%→限武器 40%）。
- PoE1 對照：小點 12～18%（例：Physical Damage with Axes 12x3 14x3 18x3），大點 30%（Cleaving：30% increased Physical Damage with Axes；Heavy Draw：30% increased Physical Damage with Bows）。

---

## 不確定的地方

1. PoB 的 `0_5/tree.json` 是否等於現在正式服的樹（PoE2 0.5）；節點數可能包含少數未開放或特殊來源的點。
2. 123 點、24 武器組點、昇華 8 點：PoE2 這三個數字只看到搜尋摘要（wiki 擋機器人），武器組點是否從一般點數扣也沒查實。
3. 力量 1 點 = +2 生命來自第三方攻略，不是 wiki 原頁。
4. 第 5 節全部是推算。
5. PoE1 基石 56 個含已不能取得的舊點；PoE1 123 點是 JSON 給的規劃上限（包含強盜任務）。
