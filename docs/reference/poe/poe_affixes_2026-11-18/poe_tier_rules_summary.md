# PoE 明示詞綴階級規則摘要（資料收集，不含設計建議）

收集時間：2026-11-19（Asia/Taipei）。CSV 每個欄位 `version` 記錄當時官方論壇最新修補字串：PoE1 **3.30.0c**（[3.30.0c Patch Notes](https://www.pathofexile.com/forum/view-thread/4017172)，Alexander_GGG）；PoE2 **0.5.5h**（[0.5.5h Patch Notes](https://www.pathofexile.com/forum/view-thread/4016665)，Kieren_GGG）。階級數值取自 poedb.tw / poe2db.tw 物品類別頁嵌入的 ModsView `normal` 明示詞綴。官方 Wiki（poewiki.net、poe2wiki.net）於 2026-11-19 再次嘗試仍被 Anubis 攔截，已跳過。

相關 CSV：`/workspace/poe_affixes_2026-11-18/poe_affix_tiers.csv`（UTF-8 BOM；747 列資料，PoE1 367、PoE2 380）。`tier` 欄為**同一部位組、同一梯子**內的編號：T1 = 該組最高 `ilvl`（通常也是最大數值）。部位梯子相同者合併為一列組；一、雙手或身體／戒指等數值或可出階數不同者分開列。

---

## 2. 階級編號規則

**T1 是不是最高？** 在官方 PoE1 進階物品描述、以及 poedb / poe2db 的 ModsView 公式中，**T1 都是最高階**（通常對應最高物品等級需求與最大數值），數字愈大愈低階。

- 官方 PoE1（3.1.2 新增 Advanced Mod Descriptions）：按 Alt 會列出前後綴、數值範圍與階級。「Please note that the tiers shown include all possible base types. For example, if Tier 5 of a mod is the highest that can appear on a ring, then it'll be listed as Tier 5 rather than Tier 1 on that ring. We are looking to improve this aspect in the future.」來源：[3.1.2 Patch Notes](https://www.pathofexile.com/forum/view-thread/2075367)（同文亦見 [另一份 3.1.2 討論串](https://www.pathofexile.com/forum/view-thread/2075735)）。
- 以本次 poedb 資料為例：PoE1「+(X) to maximum Life」身體裝甲最高階為 ilvl 86、+175–189（CSV 中身體裝甲 T1）；戒指可出的最高為 ilvl 44、+100–114。若依官方「包含所有基底」編號，該戒指最高階會顯示為 **T6**（身體裝甲另有 ilvl 54／64／73／81／86 五階更高），而不是 T1。來源：本表身體／戒指列，對照 [Body_Armours_str](https://poedb.tw/us/Body_Armours_str)、[Rings](https://poedb.tw/us/Rings)。
- poedb / poe2db 共用 ModsView 腳本：同一 `ModGenerationTypeID` + 家族（`ModFamilyList[0]`）內，將 `Level` **由高到低**排序後 `Tier = index + 1`（最高 Level 為 T1）。來源：<https://cdn.poedb.tw/js/ModsView.6d68ad906ceba146.js>（腳本內亦指向 cdn.poe2db.tw）。但**單一物品類別頁只會用該頁出現的階數計算**，因此戒指頁可能把該部位能出的最高生命標成 T1。本 CSV 採「部位組內」編號（與單頁 ModsView 較接近），官方遊戲內跨基底編號見上例。
- **階數很少的詞綴如何標？** 在 ModsView 公式下，一個家族若總共只有 3 階，就是 T1、T2、T3（T1 仍為最高 Level）。不會因為階數少就改從 T10 起標或重新從 T1 當最低。來源：同上 ModsView 公式。若某部位只能出該家族的較低階，官方 PoE1 進階描述仍使用全基底編號（可能出現「此部位最高是 T5」），不會把該部位最高改稱 T1。來源：[3.1.2 Patch Notes](https://www.pathofexile.com/forum/view-thread/2075367)。
- **PoE2 遊戲內進階描述如何編號：** 沒找到官方說明（未在已查的官方論壇修補說明中找到與 3.1.2 對等的文字）。poe2db 的 ModsView 與 poedb **使用同一套「T1 = 最高 Level」公式**（同上 JS）。社群說法與此是否一致，本次不以非官方來源採信。

---

## 3. 物品等級如何決定，以及各遊戲最高物品等級

### PoE1

來源（除非另註）：[poedb Item level](https://poedb.tw/us/Item_level)。該文未標明對應的修補版本；以下只轉述頁面文字，未自行推斷後續聯盟是否改動。

- 每件物品都有 item level（iLevel），通常與掉落地區的怪物等級相關；物品等級主要決定哪些詞綴可以出現。不可與基底 drop level、或裝備的等級需求混淆。
- 查看方式：游標停在物品上按 Alt（或主機左搖桿），或把物品提到游標後在聊天輸入 `/itemlevel`，或對聊天連結按 Ctrl+C 複製完整資訊。
- **怪物掉落：** 物品等級由掉落該物的怪物等級決定。普通怪物掉落等級等於該地區怪物等級；魔法怪物為怪物等級 +1；稀有與傳奇怪物為怪物等級 +2。地圖例外：稀有與傳奇怪物掉落的地圖只高 1 級，除非是地圖首領，可高 2 級。
- **箱子（chests）：** 「For items dropped by chests, the monster level of the area that the chest is in」。
- 任務獎勵與商店購買：物品等級依商人或任務預先決定（例如第 10 幕商店高於第 1 幕）。
- 商店配方產出：依配方而定。文中例子：五件相同基底的魔法物品換一件隨機魔法物品時，產出物的物品等級等於五件中最低者。
- 詞綴需求：魔法與稀有物品只能獲得 **詞綴等級 ≤ 物品等級** 的詞綴（幾乎所有可有詞綴的物品皆然）。**珠寶例外**，規則不同。
- **掉落物品最高物品等級為 86**，來源是等級 84 地區的傳奇怪物（文中另列：等級 83 地區的 Abyssal Depths、The Shaper's Realm、Absence of Value and Meaning、Awakening Level 8 的 Eye of the Storm）。等級 83 地圖中帶「+5 to Item Level」的保險箱可掉出 **ilvl 88**。部分命運卡獎勵與所有 Event rewards 可為 **ilvl 100**；文中並稱「currently having an item level of 100 doesn't give any benefits」。

### PoE2

- poe2db 的 [Item_Level](https://poe2db.tw/us/Item_Level) 頁面沒有規則說明（近乎空白）。
- **一般掉落／地區／箱子如何決定物品等級、以及一般掉落的最高物品等級：沒找到**（未在 poe2db 或本次查閱的官方修補說明中找到完整規則）。
- 官方論壇有一則**特定製作**紀錄，不能推論為全域上限：Return of the Ancients 上市更新寫道「Starlit Ores now create item level 84 Unique Items when forged at the Verisium Anvil。」來源：[Return of the Ancients Launch - Live Updates](https://www.pathofexile.com/forum/view-thread/3933988)。

---

## 4. 通貨與機制如何對應階級

### PoE2「Minimum Modifier Level」（最低詞綴等級）

poe2db 詞條定義：「Added random Modifiers are at least this level or higher, except if a specific Modifier type would be excluded entirely from being able to roll. Currency with a Minimum Modifier Level cannot be used on items with an item level below the Minimum Modifier Level。」來源：[Minimum Modifier Level](https://poe2db.tw/us/Minimum_Modifier_Level)。

下列數值均來自 poe2db 物品卡上的「Minimum Modifier Level」屬性（一般通貨卡片**沒有**此屬性，故不填數字）：

| 通貨 | 卡片說明（摘錄） | Minimum Modifier Level | 來源 |
| --- | --- | --- | --- |
| Orb of Transmutation | Upgrades a Normal item to a Magic item with 1 modifier | 卡片未列出 | https://poe2db.tw/us/Orb_of_Transmutation |
| Greater Orb of Transmutation | 同上 | **44** | https://poe2db.tw/us/Greater_Orb_of_Transmutation |
| Perfect Orb of Transmutation | 同上 | **70** | https://poe2db.tw/us/Perfect_Orb_of_Transmutation |
| Orb of Augmentation | Augments a Magic item with a new random modifier | 卡片未列出 | https://poe2db.tw/us/Orb_of_Augmentation |
| Greater Orb of Augmentation | 同上 | **44** | https://poe2db.tw/us/Greater_Orb_of_Augmentation |
| Perfect Orb of Augmentation | 同上 | **70** | https://poe2db.tw/us/Perfect_Orb_of_Augmentation |
| Regal Orb | Upgrades a Magic item to a Rare item, adding 1 modifier | 卡片未列出 | https://poe2db.tw/us/Regal_Orb |
| Greater Regal Orb | 同上 | **35** | https://poe2db.tw/us/Greater_Regal_Orb |
| Perfect Regal Orb | 同上 | **50** | https://poe2db.tw/us/Perfect_Regal_Orb |
| Chaos Orb | Removes a random modifier and augments a Rare item with a new random modifier | 卡片未列出 | https://poe2db.tw/us/Chaos_Orb |
| Greater Chaos Orb | 同上 | **35** | https://poe2db.tw/us/Greater_Chaos_Orb |
| Perfect Chaos Orb | 同上 | **50** | https://poe2db.tw/us/Perfect_Chaos_Orb |
| Exalted Orb | Augments a Rare item with a new random modifier | 卡片未列出 | https://poe2db.tw/us/Exalted_Orb |
| Greater Exalted Orb | 同上 | **35** | https://poe2db.tw/us/Greater_Exalted_Orb |
| Perfect Exalted Orb | 同上 | **50** | https://poe2db.tw/us/Perfect_Exalted_Orb |

一般（非 Greater／Perfect）Transmute／Augment／Regal／Chaos／Exalted 是否在內部仍有未寫在卡片上的最低詞綴等級：**沒找到**。

### PoE1 通貨的最低詞綴等級

[Orb of Transmutation](https://poedb.tw/us/Orb_of_Transmutation)（Upgrades a normal item to a magic item）、[Regal Orb](https://poedb.tw/us/Regal_Orb)（Upgrades a magic item to a rare item）、[Chaos Orb](https://poedb.tw/us/Chaos_Orb)（Reforges a rare item with new random modifiers）、[Exalted Orb](https://poedb.tw/us/Exalted_Orb)（Augments a rare item with a new random modifier）等卡片均**未列出** Minimum Modifier Level。PoE1 這些通貨的數值最低詞綴等級：**沒找到**。

### 精華（Essence）

- **PoE1**：poedb 精華卡有「Essence Tier」與（較低階卡）「Properties restricted to level N and below」。已核對的 Hatred／Woe 等系列：Whispering（Essence Tier 1）限制為 level 35 and below；Muttering（Tier 2）為 45；Weeping（Tier 3）為 60；Wailing（Tier 4）為 75。Screaming／Shrieking／Deafening 卡改為「Upgrades a normal item to rare or reforges a rare item, guaranteeing one property」，抽樣卡片上**沒有**「Properties restricted…」這一行。來源：[Essence](https://poedb.tw/us/Essence)。
- **PoE2**：精華頁說明為「Upgrades a Magic item to a Rare item, adding a guaranteed modifier」，以及「Removes a random modifier and augments a Rare item with a new guaranteed modifier」。來源：[Essence](https://poe2db.tw/us/Essence)。PoE2 精華是否另有 Minimum Modifier Level：**沒找到**（該總覽頁未列出此屬性）。

### 破裂（Fracturing）

PoE1 [Fracturing Orb](https://poedb.tw/us/Fracturing_Orb)：「Fracture a random modifier on a rare item with at least 4 modifiers, locking it in place。」頁面未說明會改變或提升階級。破裂與明示階級上下限的對應：**沒找到**進一步規則。

### 腐化（Corruption）

PoE2 [Vaal Orb](https://poe2db.tw/us/Vaal_Orb)：「Corrupts it… Corrupted items cannot be modified again。」未說明腐化如何改寫明示詞綴階級。腐化與明示階級的對應：**沒找到**。

### PoE1 禁忌（Eldritch）通貨

- [Lesser Eldritch Ember](https://poedb.tw/us/Lesser_Eldritch_Ember)：「Adds a Lesser Searing Exarch implicit modifier to a Body Armour, Boots, Gloves or Helmet This replaces any existing implicit modifiers other than Eater of Worlds implicit modifiers。」這是**暗藏（implicit）**詞綴，不是本 CSV 的明示前／後綴。
- [Orb of Conflict](https://poedb.tw/us/Orb_of_Conflict)：「Unpredictably raise the strength of one Searing Exarch or Eater of Worlds modifier on an item and lower the strength of another Lesser modifiers that have their strength lowered will be removed。」同樣作用於 Exarch／Eater 暗藏詞綴強度，而非本表明示家族。

### PoE1 園藝／Harvest

[Horticrafting](https://poedb.tw/us/Horticrafting) 頁可見「Reforge a Rare item with random modifiers, including a Fire modifier」一類重鑄敘述。將 Harvest 工藝對應到「最低明示階級／保證 T1」等規則：**沒找到**（該頁未提供完整的階級門檻表）。

### PoE1 Genesis「Modifier Tier Rating」

poedb 記載 Genesis 裝備節點：「Birthed Equipment has +10 to Modifier Tier Rating」，並註「Raising Modifier Tier Rating excludes lower tier Modifiers from rolling, distributing their roll chance among higher tier Modifiers of the same Modifier type」。來源：[Modifier Tier Rating](https://poedb.tw/us/Modifier_Tier_Rating)。

---

## 資料缺口與收錄範圍

- 官方 Wiki（poewiki.net、poe2wiki.net）2026-11-19 仍被攔截，階級與規則未以 Wiki 交叉驗證。
- PoE2 物品等級一般規則與一般掉落最高 ilvl：**沒找到**。
- PoE2 遊戲內 Advanced Mod Descriptions 的官方編號方式：**沒找到**。
- PoE1／PoE2 一般（非 Greater／Perfect）Regal、Exalted、Chaos、Transmute、Augment 的數值「最低詞綴等級」：**沒找到**（卡片未列出）。
- CSV 只收 **純明示** 詞綴（例如純「+# to maximum Life」「+# to Armour」「% increased Armour」），不含生命＋護甲複合、全抗、全屬性、Global／with Bows／for Attacks／for Spells 等變體（PoE1 護身符的 Global Critical Strike Chance 已另列；弓箭袋「with Bows」與「for Attacks」未收）。珠寶頁無 ModsView，未收珠寶階級。
- 部位欄來自有 ModsView 的物品類別頁（PoE1／PoE2 防具為 `_str`／`_dex` 等拆頁，梯子相同則合併為「Body Armours」等，不另標防禦類型）。若某基底未出現在已下載的類別頁，可能漏列。
- poedb Item level 文中的「掉落最高 86」未註修補版本；T17 等後期內容是否改動此上限，本次**未在官方修補說明中核到**，故不改寫該句，也不自行補數。
