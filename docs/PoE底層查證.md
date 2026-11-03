# PoE 底層規則查證（PoE2 ／ PoE1）

> 查證日期：2026-11-02。來源以 poe2wiki.net（PoE2，wiki 上的最新版本是 0.5.x，0.5.0 在 2026-05-29 上線）與 poewiki.net（PoE1）為主；wiki 頁面裡的「Keyword infobox／Tooltip」是遊戲內關鍵字說明，最接近官方文字。
> 寫法：每段先寫 **PoE2**、再寫 **PoE1**、最後寫 **差異**。⚠️ 表示查不到、來源互相矛盾，或是我自己推論的。
> 網址縮寫：`W2/頁名` = `https://www.poe2wiki.net/wiki/頁名`，`W1/頁名` = `https://www.poewiki.net/wiki/頁名`（下面每條都附完整網址）。

---

## A. 傷害計算

### A1. increased／more、持續傷害（DoT）與暴擊、吸血、穿透

**PoE2**
- 傷害型異常（點燃、流血、中毒）的強度（magnitude）由「造成它的那一下命中」算出來；**之後不再套用任何傷害加成**。所以要讓 DoT 變強，就是提高命中傷害，或提高異常強度（magnitude）。原文："will not subsequently have Damage modifiers applied directly to them"。https://www.poe2wiki.net/wiki/Ignite 、 https://www.poe2wiki.net/wiki/Flammability
- 異常的計算基礎是「減傷前的傷害（pre-mitigation）」，也就是**套完攻擊方所有傷害加成之後**、還沒扣目標的護甲／抗性時的數字。https://www.poe2wiki.net/wiki/Impale （Pre-mitigation 的說明）
- 目標身上「影響減傷能力」的減益（例如感電）會讓 DoT 傷害變高；只對命中有效的效果（穿透、破甲）不影響 DoT。https://www.poe2wiki.net/wiki/Flammability 、 https://www.poe2wiki.net/wiki/Incision
- DoT 不算命中：護甲、穿透都不作用，只有抗性。https://www.poe2wiki.net/wiki/Damage_over_time
- 吸血：依照「命中」對敵人造成的傷害計算，DoT 不會吸血。https://www.poe2wiki.net/wiki/Leech
- 暴擊與 DoT：DoT 本身不會暴擊。⚠️（推論）因為異常是用「套完所有加成的命中傷害」算的，暴擊命中造成的異常應該也會跟著變強；wiki 沒有直接寫出這一點。
- **DoT multiplier（持續傷害乘數）**：⚠️ 在 poe2wiki 全站搜尋 "damage over time multiplier" 結果是 0 筆（https://www.poe2wiki.net/api.php?action=query&list=search&srsearch=%22damage+over+time+multiplier%22），看起來 PoE2 已經改用「異常強度（magnitude）」的加成來取代它；但我沒有找到明確寫「移除」的 patch note。

**PoE1**
- DoT 吃 `Damage`、`Damage over Time`、`[類型] Damage`、`[效果] Damage` 這類 increased；**不吃** Attack／Spell Damage 加成（除非技能特別寫）。https://www.poewiki.net/wiki/Damage_over_time
- DoT 乘數（DoT multi）：各來源互相相加，再跟其他傷害加成相乘。https://www.poewiki.net/wiki/Damage_over_time
- DoT 不會暴擊；由暴擊造成的傷害型異常天生有 **+50% DoT 乘數**（怪物與召喚物是 +30%）；有 Perfect Agony 時改用暴擊傷害倍率。https://www.poewiki.net/wiki/Critical_strike
- 穿透只對命中有效。https://www.poewiki.net/wiki/Resistance
- 吸血：命中才會吸血。https://www.poewiki.net/wiki/Leech

**差異**：PoE1 的異常傷害會「再算一次加成」（increased／more／DoT 乘數）；PoE2 是「命中傷害 × 固定比例 × 強度（magnitude）」，不會再套傷害加成。兩代的 DoT 都不吃穿透、護甲，也不會吸血。

### A2. 暴擊傷害

- **PoE2**：玩家與召喚物的基礎暴擊傷害加成是 **+100%**（等於 200% 傷害）；怪物的暴擊額外傷害少 40%（0.1.0e 起）。`+#% to Critical Damage Bonus` 先加到 +100% 上，然後才套 increased／more。PoE2 的暴擊**不會**像 PoE1 那樣保證觸發異常。https://www.poe2wiki.net/wiki/Critical_hit 、 https://www.poe2wiki.net/wiki/Shock
- **PoE1**：玩家的暴擊倍率是 **150%**（額外 +50%）；怪物是 130%。元素暴擊必定觸發點燃、冰凍、感電。https://www.poewiki.net/wiki/Critical_strike
- **差異**：PoE2 的暴擊加成比較高（+100% 對 +50%），但暴擊不再保證觸發異常。

### A3. 命中與閃避

- **PoE2**：命中率（未封頂）= 命中值 × 1.25 × 100 ÷（命中值 + 閃避值 × 0.3）。命中率最低 5%（所以閃避率最高 95%）。命中率一般最高 100%，透過 Amazon 的天賦最高可以到 125%。用「熵值（entropy）」決定，不是每次獨立擲骰：被攻擊方累積命中率，超過 100 就算命中，然後減 100；距離上次攻擊超過 3.33 秒會重新擲一個隨機起始值。暴擊會再做一次閃避判定，成功的話就降成普通命中。0.3.0 起閃避對所有命中都有效（含法術），但有紅光的首領攻擊除外；怪物不能閃避玩家的法術。https://www.poe2wiki.net/wiki/Evasion 、 https://www.poe2wiki.net/wiki/Accuracy
  - 玩家每升一級 +6 命中值，每點敏捷 +6 命中值；距離 2～9 公尺時命中值會打折，最多少 90%。https://www.poe2wiki.net/wiki/Accuracy
  - 偏斜（Deflection，0.3.0 新增）：偏斜率 = 150% ×（1 − 命中值 ÷（命中值 + 偏斜值 × 0.12）），上限 95%；偏斜成功時減少 40% 傷害（Tailwind 的說明裡有寫），對紅光首領攻擊也有效。https://www.poe2wiki.net/wiki/Deflection 、 https://www.poe2wiki.net/wiki/Tailwind
- **PoE1**：命中率 = 1.25 × 命中值 ÷（命中值 +（閃避值 ÷ 5）^0.9），最低 5%、最高 100%；同樣使用熵值機制。**法術不能被閃避**。每升一級 +2 命中值，每點敏捷 +2。https://www.poewiki.net/wiki/Evasion 、 https://www.poewiki.net/wiki/Accuracy
- **差異**：公式不同（PoE2 是閃避值 × 0.3，而且沒有 0.9 次方）；PoE2 的閃避擋得了法術；PoE2 多了偏斜這一層。

### A4. 護甲

- **PoE2**：減傷 = A ÷（A + 10 × D），A 是護甲值、D 是這一下的物理傷害。物理減傷上限 90%（所有來源加起來）。不能把一下傷害減到低於 1。護甲不擋 DoT。破甲歸零時是「完全破甲（Fully Broken）」。https://www.poe2wiki.net/wiki/Armour
- **PoE1**：減傷 = A ÷（A + 5 × D），上限一樣是 90%。https://www.poewiki.net/wiki/Armour
- **差異**：PoE2 的係數是 10，PoE1 是 5，所以同樣的護甲值在 PoE2 大約只有一半效果（減 50% 時，PoE2 要 10 倍傷害的護甲，PoE1 只要 5 倍）。

### A5. 抗性

- **PoE2**：預設 0%，上限 75%，最大抗性的硬上限 90%；可以是負值。元素抗性的懲罰：第 2 章 −10%、第 3 章 −20%、第 4 章 −30%，插曲 54～59 級 −40%、60～64 級 −50%，終局 65 級以上 −60%。**懲罰只扣元素抗性**，混沌抗性的基礎值是 0%，不受進度懲罰。詛咒上限預設 1 個。穿透最低只能壓到 0%，對負抗性沒有作用。https://www.poe2wiki.net/wiki/Resistance 、 https://www.poe2wiki.net/wiki/Penetration
- **PoE1**：上限 75%、硬上限 90%，負抗性最低 −200%。進度懲罰**連混沌抗性也扣**：第一部 −30%、第二部再 −30%（合計 −60%）。穿透作用在封頂後的抗性上，而且可以穿到負值以下。https://www.poewiki.net/wiki/Resistance
- **差異**：PoE2 的混沌抗性不吃懲罰；PoE2 的穿透不能穿到 0% 以下，PoE1 可以。

### A6. 格擋

- **PoE2**：只有一種格擋（0.3.0 起所有沒有紅光的命中都能擋，包括法術）；**上限 50%**（0.3.0 從 75% 改成 50%）。被動格擋主要來自盾牌。主動格擋（Raise Shield／Parry）擋住正面的攻擊會累積重暈條，滿了就會重暈 3 秒。被格擋的命中仍然可能讓人輕暈或冰凍。https://www.poe2wiki.net/wiki/Block
- **PoE1**：分成攻擊格擋與法術格擋，預設上限 75%、硬上限 90%；雙持武器天生 +20% 攻擊格擋。https://www.poewiki.net/wiki/Blocking
- **Glancing Blows（擦傷）**：PoE1 是格擋率加倍、但被格擋的命中仍受到 **65%** 傷害。https://www.poewiki.net/wiki/Glancing_Blows ；PoE2 在 0.3.0 改成「閃避率 Unlucky、偏斜率 Lucky」，拿掉了格擋加倍和受 50% 傷害的效果。https://www.poe2wiki.net/wiki/Glancing_Blows
- **差異**：PoE2 的上限比較低（50%）、不分攻擊與法術、多了主動格擋；擦傷在 PoE2 已經變成另一個機制。

### A7. 吸血

- **PoE2**：吸取量是命中傷害的百分比，每次吸血預設在 **1 秒內**回完；**0.5.0 起同一種資源一次只會有一筆吸血在作用**（取回復速度最高的那筆）。一下命中最多只算 40,000 傷害。資源補滿就清掉所有吸血。後期怪物有隱藏的「吸血抗性」。wiki 沒有寫出整體速率上限的數字。https://www.poe2wiki.net/wiki/Leech
- **PoE1**：每一筆吸血最多回最大生命的 10%，速度是每秒 2% 最大生命；所有吸血加起來每秒最多 **20%** 最大生命（能量護盾是 10%）；可以同時有很多筆在作用。https://www.poewiki.net/wiki/Leech
- **差異**：PoE1 靠很多筆同時作用加上總上限；PoE2 一次只有一筆（等於用「單筆的速度」當上限）。

---

## B. 異常狀態

### B0. 門檻（ailment threshold）與累積條

- **PoE2**：玩家的異常門檻 = 最大生命的一半（0.2.0 前是全部最大生命）；怪物的門檻只看怪物等級，**跟怪物生命無關**（wiki 上有等級表）。冰凍、感電、定身（Pin）、暈眩用另一個值，叫「穩固值（poise）」。中毒、流血用固定機率，不看門檻。https://www.poe2wiki.net/wiki/Ailment
- **Primed（瀕臨觸發）**：重暈、冰凍、感電、定身的累積值到達一定比例就算 Primed：普通怪 40%、魔法怪 50%、稀有怪 60%、傳奇怪 70%（0.2.0 調整過）。「碾壓一擊（Crushing Blow）」打中 Primed 的怪會直接重暈。https://www.poe2wiki.net/wiki/Stun 、 https://www.poe2wiki.net/wiki/Pinned 、 https://www.poe2wiki.net/wiki/Electrocute 、 https://www.poe2wiki.net/wiki/Crushing_Blows
  - ⚠️ Primed_for_Stun 頁面內文另外列了一組舊值（普通 40／魔法 60／稀有 70／傳奇 80），跟它自己的 tooltip 和 0.2.0 patch 互相矛盾，以新值為準。https://www.poe2wiki.net/wiki/Primed_for_Stun
- **累積條會不會顯示**：怪物的重暈累積「會顯示成生命條下方的一條」（wiki 原文）。https://www.poe2wiki.net/wiki/Stun 。冰凍、感電的累積：⚠️ wiki 沒寫，只有 Mobalytics 說你造成的異常或累積會顯示在怪物生命條下方（https://mobalytics.gg/poe-2/guides/ailments）。玩家自己有重暈條（舉盾、騎乘時會累積，0.2.0 patch 寫「Your Heavy Stun bar」）。https://www.poe2wiki.net/wiki/Block
- **PoE1**：怪物門檻「大部分情況等於最大生命」，只有生命特別高的首領門檻比較低。https://www.poewiki.net/wiki/Chill 。PoE1 沒有累積條（只有暈眩是看單次傷害決定機率）。

### B1. 點燃 Ignite

- **PoE2**：每秒造成命中火焰傷害的 **20%**（4 秒共 80%），持續 4 秒；不疊加，只有最強的一筆在作用。觸發機率來自「易燃（Flammability）」減益：每造成目標門檻 5% 的火焰傷害，就得到 1% 點燃機率；易燃可以疊，最多 100%，在怪物身上持續 8 秒（在玩家身上 4 秒，0.3.0 起）。不是命中的點燃來源（例如燃燒地面）要等易燃累積到 50% 才能點燃。https://www.poe2wiki.net/wiki/Ignite 、 https://www.poe2wiki.net/wiki/Flammability
- **PoE1**：每秒造成基礎傷害的 **90%**（4 秒共 360%），持續 4 秒，不疊加；需要點燃機率，暴擊必定點燃。https://www.poewiki.net/wiki/Ignite
- **差異**：PoE2 用易燃累積機率，比例低很多，而且不再吃傷害加成。

### B2. 流血 Bleed

- **PoE2**：每秒造成減傷前物理傷害的 **15%**（5 秒共 75%），持續 5 秒；怪物在移動中，或流血被「加重（Aggravated）」時，額外多 100%（0.5.0 起**玩家身上的流血不再因為移動變強**）。不疊加；需要明確的流血機率；會跳過能量護盾。切割（Incision）每層 +10% 流血機率，流血觸發後清掉。https://www.poe2wiki.net/wiki/Bleeding 、 https://www.poe2wiki.net/wiki/Incision
- **PoE1**：每秒造成基礎物理傷害的 **70%**（怪物造成的只有 10%），持續 5 秒；目標移動或被加重時變成 3 倍（每秒 210%）。不疊加（有 Crimson Dance 時可以疊 8 層，每層 35%）。https://www.poewiki.net/wiki/Bleeding
- **差異**：PoE2 移動加成是 ×2，PoE1 是 ×3；PoE2 對玩家已經沒有移動加成。

### B3. 中毒 Poison

- **PoE2**：tooltip 寫「每秒造成命中物理＋混沌傷害的 **20%**」，持續 2 秒。⚠️ 但同一頁的內文寫「20%……持續 2 秒」（像是指總量），有搜尋結果則寫 40%；照點燃、流血頁的寫法推算，應該是每秒 20%、共 40%。**疊層**：預設的疊層上限是 **1**，可以用詞綴提高；超過上限時只有最強的幾層會造成傷害；地上的毒雲也受你的疊層上限限制。會跳過能量護盾。https://www.poe2wiki.net/wiki/Poison
- **PoE1**：每秒造成基礎物理＋混沌傷害的 **30%**，持續 2 秒；**無限疊層**，每次命中最多上 1 層。https://www.poewiki.net/wiki/Poison
- **差異**：PoE2 的中毒預設不能疊（上限 1），要靠詞綴加；PoE1 可以無限疊。

### B4. 冰緩 Chill

- **PoE2**：只要有冷傷害就會冰緩，不需要機率；效果依「傷害 ÷ 門檻」決定，**低於 30% 的冰緩直接作廢**，最高 50%（Stormweaver 可到 70%）。持續時間：怪物 8 秒、玩家 2 秒。不是靠傷害造成的冰緩預設 30%。魔法、稀有、傳奇怪受到的緩速分別少 15%、30%、50%；怪物最慢只會降到原速的 25%。https://www.poe2wiki.net/wiki/Chill
- **PoE1**：公式 E = ½ ×（D ÷ T）^0.4 ×（1 + M），最低 5%、最高 30%，持續 2 秒；不是靠傷害造成的預設 10%。https://www.poewiki.net/wiki/Chill
- **差異**：PoE2 的緩速比較強（30～50%），而且在怪物身上持續比較久。

### B5. 冰凍 Freeze

- **PoE2**：冷傷害累積「冰凍值」，到 100% 時冰凍、然後歸零；預設持續 **4 秒**（tooltip）。冰凍期間行動速度歸零，算定身。首領每被冰凍一次，對冰凍的門檻就提高，之後會慢慢回落。格擋不會擋掉冰凍累積。冰凍後再累積會變慢（0.1.0e 起）；0.2.0 起整體累積慢了大約 48%。https://www.poe2wiki.net/wiki/Freeze
- **PoE1**：要有冰凍機率（暴擊必定冰凍）；持續時間 = 每造成門檻 1% 的傷害就是 0.06 秒，最多 3 秒（造成 50% 門檻時）；低於 0.3 秒作廢。https://www.poewiki.net/wiki/Freeze
- **差異**：PoE2 是累積制，PoE1 是單次命中看機率與傷害。

### B6. 感電 Shock

- **PoE2**：每造成門檻 4% 的傷害就有 1% 機率（也就是造成 100% 門檻時 25%）；效果固定是**受到的傷害提高 20%**（跟其他「受到傷害提高」相加），最高 100%；持續時間：怪物 8 秒、玩家 4 秒；不疊加。https://www.poe2wiki.net/wiki/Shock
- **PoE1**：效果依傷害用公式計算，最高 50%，低於 5% 作廢；持續 2 秒；要有機率（暴擊必定感電）。不是靠傷害造成的感電預設 15%。https://www.poewiki.net/wiki/Shock
- **差異**：PoE2 的效果固定 20%，PoE1 依傷害在 5～50% 之間變動。

### B7. 電殛 Electrocute（只有 PoE2）

- 雷傷害**預設不會累積**電殛，要特定技能或效果才行；累積滿了就電殛，打斷目標並讓它不能行動（算定身），預設持續 **5 秒**（tooltip）。0.2.0 起對非玩家的累積慢了大約 44%；0.1.0e 起難度提高 25%。https://www.poe2wiki.net/wiki/Electrocute
- ⚠️ 確切的累積公式 wiki 沒寫。

### B8. 暈眩 Stun／重暈 Heavy Stun

- **PoE2**：
  - 輕暈（Light Stun）：機率依「命中傷害 ÷ 目標最大生命」計算，傷害等於最大生命時是 100%；低於 15% 的機率直接當作 0；持續大約 0.53 秒（數值來自 PoB2）。玩家過去 4 秒內每被輕暈一次，輕暈門檻就多 50%。
  - 重暈（Heavy Stun）：所有非冷傷害都會累積，滿了就重暈，持續時間依怪物而定；冷傷害不會累積重暈。
  - 玩家的物理、近戰各使重暈累積多 50%，兩者相乘（合計多 125%）；怪物是物理多 100%、近戰多 33%（相乘）。
  - 玩家一般不會被重暈，只有舉盾、騎乘、衝刺時被打才會；玩家的重暈持續 3 秒，期間不能閃避或格擋。玩家的暈眩門檻 = 最大生命。
  - 暈眩（Daze）：受到的暈眩累積多 50%，持續 8 秒。
  - https://www.poe2wiki.net/wiki/Stun 、 https://www.poe2wiki.net/wiki/Daze
- **PoE1**：依「傷害 ÷ 最大生命」計算機率；機率 ≤ 20% 時無效（需要超過最大生命 10% 的傷害），造成 50% 以上一定暈；基礎持續 0.35 秒；近戰 +25%、非物理 −25%。https://www.poewiki.net/wiki/Stun
- **差異**：PoE2 分成輕暈和有累積條的重暈。

### B9. 破甲 Armour Break（只有 PoE2）

- 依數值扣目標的護甲，持續 12 秒（在玩家身上 4 秒）；護甲被扣到 0 就是「完全破甲」，持續 12 秒，期間**受到的物理命中傷害提高 20%**（只對非玩家）。對普通怪的扣除量 ×3、魔法怪 ×2。完全破甲期間不能再破甲。https://www.poe2wiki.net/wiki/Armour_Break

### B10. 穿刺 Impale

- **PoE2**：把命中減傷前物理傷害的 **30%** 存起來；下一次攻擊命中時取出，加進那一下（每次只取最強的一個）。一個目標最多 60 個；在怪物身上不會過期（在玩家身上 4 秒）。https://www.poe2wiki.net/wiki/Impale
- **PoE1**：記錄 10% 物理傷害，之後每被命中一次就反彈一次，持續 5 次命中或 8 秒；可以自由疊加（預設最多 5 層）。https://www.poewiki.net/wiki/Impale

### B11. 其他減益

| 減益 | PoE2 | PoE1 |
| --- | --- | --- |
| 致盲 Blind | 命中值與閃避值少 20%，持續 4 秒 https://www.poe2wiki.net/wiki/Blind | 命中值與閃避值少 20%，持續 4 秒，也會降低被暴擊確認的機率 https://www.poewiki.net/wiki/Blind |
| 凋零 Withered | 每層混沌受傷 +5%，最多 10 層，每層各自計時 https://www.poe2wiki.net/wiki/Withered | 每層 +6%，最多 15 層，每層 2 秒 https://www.poewiki.net/wiki/Withered |
| 阻礙 Hinder | 移動速度 −30% https://www.poe2wiki.net/wiki/Hinder | 移動速度 −30%，持續 4 秒，通常來自法術 https://www.poewiki.net/wiki/Hinder |
| 殘廢 Maim | 移動速度 −30%、閃避值 −15% https://www.poe2wiki.net/wiki/Maim | 移動速度 −30%，持續 4 秒，通常來自攻擊；不疊加 https://www.poewiki.net/wiki/Maim |
| 定身 Pinned | 累積制；觸發後 3 秒內不能移動、不能被推、不能閃避，並且輕暈 https://www.poe2wiki.net/wiki/Pinned | 沒有 |
| 威嚇 Intimidate | 受到傷害 +10%、造成傷害 −10% https://www.poe2wiki.net/wiki/Intimidate | ⚠️ 沒查 |
| 招架 Parried | 受到的攻擊傷害提高、不能閃避，持續 2 秒 https://www.poe2wiki.net/wiki/Parried | 沒有 |
| 焦灼 Scorch | 沒有 | 元素抗性最多 −30%，持續 4 秒；低於 2% 作廢；不是靠傷害造成的預設 10% https://www.poewiki.net/wiki/Scorch |
| 易碎 Brittle | 沒有 | 被命中時的暴擊率最多 +6%，持續 4 秒；低於 1% 作廢；不是靠傷害造成的預設 +2% https://www.poewiki.net/wiki/Brittle |
| 殘喘 Sapped | 沒有 | 造成的傷害最多少 20%，持續 4 秒；低於 2% 作廢；不是靠傷害造成的預設 6% https://www.poewiki.net/wiki/Sapped |

（PoE1 的焦灼、易碎、殘喘都用 E = k ×（D ÷ T）^0.4 ×（1 + M），k 分別是 ½、10、⅓。）

---

## C. 球體（Charges）

**PoE2**：耐力、狂怒、暴擊三種球**本身沒有任何加成**，只是給技能消耗的資源（原文："Charges do not inherently grant bonuses … they are used to empower skills by being consumed by them"）。預設每種**上限 3 顆**，**持續 15 秒**，再得到同類的球就刷新時間。https://www.poe2wiki.net/wiki/Charge 、 https://www.poe2wiki.net/wiki/Endurance_charge 、 https://www.poe2wiki.net/wiki/Frenzy_charge 、 https://www.poe2wiki.net/wiki/Power_charge

**PoE1**：預設每種上限 3 顆、持續 **10 秒**。https://www.poewiki.net/wiki/Charge

| 球 | PoE1 玩家每顆的效果 | PoE1 怪物每顆的效果 |
| --- | --- | --- |
| 耐力 Endurance | 物理減傷 +4%、元素減傷 +4% https://www.poewiki.net/wiki/Endurance_charge | 物理減傷 +15%、元素抗性 +15% |
| 狂怒 Frenzy | 傷害 more 4%、攻速 +4%、施法速度 +4% https://www.poewiki.net/wiki/Frenzy_charge | 傷害 more 4%、攻速與施法速度各 +15%、移動速度 +5% |
| 暴擊 Power | 暴擊率 +50% https://www.poewiki.net/wiki/Power_charge | 暴擊率 +200% |

**差異**：PoE1 的球是被動加成；PoE2 的球是「要拿來消耗的資源」，持續時間 15 秒，比 PoE1 的 10 秒長。

---

## D. Buff 盤點

| Buff | PoE2 | PoE1 | 來源類型 |
| --- | --- | --- | --- |
| 猛攻 Onslaught | 技能速度 +20%、移動速度 +10%，預設 4 秒 https://www.poe2wiki.net/wiki/Onslaught | 攻擊、施法、移動速度 +20%，4 秒，不疊加 https://www.poewiki.net/wiki/Onslaught | 擊殺或命中時的機率、詞綴、藥劑 |
| 狂怒 Rage | 每點 Rage 攻擊傷害 more 1%，上限 30；每 0.2 秒掉 1 點，獲得 Rage 或受傷後暫停 4 秒；每 0.5 秒最多一下命中能加 Rage https://www.poe2wiki.net/wiki/Rage | 每點攻擊命中傷害 more 1%（不影響異常），上限 30；2 秒沒有獲得就每秒掉 10 點；不算 buff https://www.poewiki.net/wiki/Rage | 天賦、技能 |
| 秘術增強 Arcane Surge | 施法速度 +15%、魔力回復 more 20%，10 秒 https://www.poe2wiki.net/wiki/Arcane_Surge | 施法速度 +20%、魔力回復 +30%，4 秒 https://www.poewiki.net/wiki/Arcane_Surge | 輔助寶石、詞綴 |
| 堅守 Fortify／Fortification | ⚠️ poe2wiki 沒有這一頁，應該不存在 | 每層受到的命中傷害 less 1%，最多 20 層、6 秒，依命中傷害取得層數 https://www.poewiki.net/wiki/Fortification | 近戰輔助 |
| 順風 Tailwind | 可疊 10 層；每層移動速度 +1%、技能速度 +2%、閃避值 +10%、偏斜減傷 +1% https://www.poe2wiki.net/wiki/Tailwind | 行動速度 +8%，4 秒，不疊加 https://www.poewiki.net/wiki/Tailwind | 職業或天賦 |
| 迅捷 Haste | ⚠️ poe2wiki 沒有這一頁 | 光環：攻速、施法速度、移動速度依寶石等級；另有 Vaal Haste https://www.poewiki.net/wiki/Haste | 光環 |
| 閃避 Elusive | ⚠️ poe2wiki 沒有這一頁 | 一開始：15% 機率避開命中傷害、移動速度 +30%；每秒衰減 20%，要等結束才能再獲得 https://www.poewiki.net/wiki/Elusive | 詞綴、職業 |
| 腎上腺素 Adrenaline | ⚠️ poe2wiki 沒有這一頁 | 傷害 +100%、攻擊／施法／移動速度 +25%、物理減傷 +10%；持有期間不能刷新 https://www.poewiki.net/wiki/Adrenaline | 天賦、職業 |
| 相位 Phasing | ⚠️ 沒查到 | 可以穿過敵人；不算 buff https://www.poewiki.net/wiki/Phasing | 藥劑、詞綴 |
| 邪力 Unholy Might | 獲得全部傷害 30% 的混沌傷害（DoT 吃不到）https://www.poe2wiki.net/wiki/Unholy_Might | 物理傷害 100% 轉成混沌，命中時 25% 機率造成凋零 https://www.poewiki.net/wiki/Unholy_Might | 藥劑、詞綴 |
| 化身 Archon（只有 PoE2） | 持續 10 秒，結束後要再等 20 秒；Elemental Archon：法術元素傷害 more 25%、冰凍累積 +100%、易燃強度 +100%、感電機率 +100% https://www.poe2wiki.net/wiki/Archon | 沒有 | 職業或天賦 |
| 守護 Guard（只有 PoE2） | 先吸收命中傷害（在減傷之後），最多最大生命的 200%；不疊加 https://www.poe2wiki.net/wiki/Guard | 沒有（PoE1 有 Guard 技能，但是不同機制） | 護符、藥劑詞綴 |
| 湧動 Surges（只有 PoE2） | 每種最多 6 個、15 秒，綁在武器上；遠程投射物攻擊會消耗它，在落點爆炸 https://www.poe2wiki.net/wiki/Surge | 沒有 | 職業 |
| 灌注 Infusions（只有 PoE2） | 撿起殘餘物後獲得，20 秒，每種最多 3 個，給法術消耗 https://www.poe2wiki.net/wiki/Infusion | 沒有 | 技能 |
| 榮耀 Glory（只有 PoE2） | 每個技能各自累積的資源；15 秒沒有獲得就每秒掉 2 點；依怪物強度取得（傳奇怪 20）https://www.poe2wiki.net/wiki/Glory | 沒有 | 技能 |
| 連擊 Combo（只有 PoE2） | 8 秒內近戰打擊的次數；換武器會清掉 https://www.poe2wiki.net/wiki/Combo | 沒有 | 技能 |
| 召集 Convocation | 沒有 | 是寶石，不是 buff：把召喚物拉回身邊並給它們生命回復 https://www.poewiki.net/wiki/Convocation | 寶石 |
| 不屈 Unbroken | ⚠️ 兩代 wiki 都查不到叫這個名字的 buff。PoE1 有 Juggernaut 的天賦「Unbreakable」（身體護甲的護甲加倍），不是 buff https://www.poewiki.net/wiki/Unbreakable | 同左 | — |

通則：PoE2 同一種 buff 不疊加，只取最強的；「buff 到期變慢」的效果彼此相加，最多慢 75%。https://www.poe2wiki.net/wiki/Buff 。PoE1 的球和藥劑效果都不算 buff。https://www.poewiki.net/wiki/Buff

---

## E. 詛咒與曝露

**PoE2 詛咒**（預設上限 **1 個**；施放後延遲 1.5 秒才生效；魔法、稀有、傳奇怪受到的效果分別少 15%、30%、50%；等級太高的怪會無效）https://www.poe2wiki.net/wiki/Curse

| 詛咒 | 效果（1～20 級） |
| --- | --- |
| Enfeeble | 目標造成的傷害 less 20～29% |
| Elemental Weakness | 元素抗性 −40～59%（Flammability、Conductivity、Hypothermia 已經合併進來）https://www.poe2wiki.net/wiki/Conductivity |
| Temporal Chains | 緩速 40～59%，目標身上其他效果的到期慢 25% |
| Vulnerability | 總護甲 −16～19210（依等級） |
| Despair | 混沌抗性 −35～49% |

持續 6～7.4 秒；範圍 1.5～3.1 公尺。另外還有標記類（例如 Sniper's Mark）和 Blasphemy（把詛咒變成光環），不在上表。

**PoE1 詛咒**：分成 Hex（範圍）與 Mark（單一目標）；預設上限 1 個，最多可以加到 10 個；Mark 同時只能有一個。https://www.poewiki.net/wiki/Curse

**曝露 Exposure**
- **PoE2**：三種元素抗性一起 **−20%**，持續 4 秒；魔法、稀有、傳奇怪的效果分別少 15%、30%、50%；可以跟詛咒疊加，也可以把抗性壓成負值。https://www.poe2wiki.net/wiki/Exposure
- **PoE1**：只降單一元素，玩家造成的是 **−10%**（怪物造成的是 −25%），有持續時間時預設 4 秒；同一元素只取最強的一個。https://www.poewiki.net/wiki/Exposure

---

## F. 護符 Charms（只有 PoE2）

- 不能手動使用；條件達成又有足夠充能時自動觸發，生效期間不能再觸發；同一種護符一次只觸發一個，不同種可以同時觸發。https://www.poe2wiki.net/wiki/Charm
- 槽數：腰帶給 1～3 格（物品等級 1～29 給 1 格、30～59 給 1～2 格、60 以上給 1～3 格），**最多 3 格**；任務 Ancient Vows 也給 1 格。https://www.poe2wiki.net/wiki/Charm
- 充能：擊殺怪物、Well、檢查點（跟藥劑一樣），也有詞綴每秒給充能；拿下來會清空充能。品質只延長持續時間。沒有稀有品質的護符。0.2.0f 起除了 Golden 以外，所有護符的充能上限與每次消耗都減半。
- 列表（https://www.poe2wiki.net/wiki/List_of_charms）：

| 護符 | 觸發條件 | 效果 | 持續 | 消耗／上限 |
| --- | --- | --- | --- | --- |
| Ruby／Sapphire／Topaz | 受到火／冷／雷命中 | 對應抗性 +25% | 4 秒 | 20／40 |
| Amethyst | 受到混沌命中 | 混沌抗性 +18% | 4 秒 | 30／40 |
| Stone | 被暈眩 | 不能被暈眩 | 3 秒 | 20／40 |
| Silver | 被緩速 | 速度不受緩速影響 | 3 秒 | 20／40 |
| Thawing | 被冰凍 | 免疫冰凍 | 3 秒 | 40／40 |
| Staunching | 開始流血 | 免疫流血 | 3 秒 | 30／40 |
| Antidote | 中毒 | 免疫中毒 | 3 秒 | 20／40 |
| Dousing | 被點燃 | 免疫點燃 | 3 秒 | 30／40 |
| Grounding | 被感電 | 免疫感電 | 3 秒 | 30／40 |
| Golden | 擊殺稀有或傳奇怪 | 物品稀有度 +15% | 1 秒 | 80／80 |

- 腰帶詞綴可以讓「使用護符時回復生命／魔力或獲得守護（Guard）」。

---

## G. 裝備詞綴會不會直接給「機制類」效果

用兩代 wiki 的 mods 資料表查詢（Special:CargoExport，條件是 domain = 物品、詞綴類型是前綴或後綴）：

**PoE2**（https://www.poe2wiki.net/index.php?title=Special:CargoExport&tables=mods&fields=mods.id,mods.stat_text&where=mods.domain=1&format=json）
- 一般的稀有詞綴大多是「放大既有機制」：例如 `增加感電機率`、`流血／中毒持續時間 +8～12%`、`詛咒強度 +2～12%`、`秘術增強效果 +12～18%`、`對自己的點燃／感電持續時間降低`、`護符充能獲得量提高`。
- 「直接給機制」的詞綴幾乎只出現在特殊來源：**精髓（Essence）**（`被命中時獲得猛攻 3 秒`、`擊殺時 16% 機率獲得任一種球`、`格擋時 25% 機率獲得暴擊球`、`不會中毒`），**Abyss／Decay 類**（`流血／中毒／點燃強度 +20～42%`），**特定職業的詞綴**（`25% 機率造成流血`），以及**傳奇物品**。⚠️ 有一批 id 開頭是 `HandWraps…` 的詞綴（例如 `命中時 8～12% 機率獲得猛攻`、`暴擊時 5～10% 機率獲得暴擊球`），我不確定是哪一種物品或來源。
- 傷害型異常的機率（流血、中毒）在 PoE2 主要來自技能和輔助寶石，不是裝備詞綴。

**PoE1**（https://www.poewiki.net/index.php?title=Special:CargoExport&tables=mods&fields=mods.id,mods.stat_text&where=mods.domain=1&format=json）
- 機制類詞綴主要集中在**勢力詞綴**（Shaper／Elder／征服者／Maven，id 有 `Uber`、`Influence`）：`暴擊時 15% 機率獲得暴擊球`、`+1 球數上限`、`擊殺時 5～10% 機率獲得猛攻`、`附近敵人被致盲`、`15% 機率造成殘廢`、`暴擊時 11～20% 機率獲得秘術增強`；另外是**精髓**、**工藝台**（Necropolis 等），以及**傳奇物品**（例如「Curse Enemies with … on Hit」）。
- 一般的稀有詞綴以數值為主（抗性、生命、傷害、速度）。

**結論（規律）**：兩代都一樣，一般隨機詞綴負責「數值、放大既有機制」；「獲得球或 buff、施加詛咒、新增異常來源」這種改變玩法的效果，主要放在特殊來源（精髓、勢力或深淵、傳奇物品），或交給技能、天賦。

---

## 我最不確定的項目

1. PoE2 中毒的比例：tooltip 寫每秒 20%（共 40%），內文寫「20%……持續 2 秒」，兩者矛盾。
2. PoE2 暴擊會不會讓異常變強：我是從「異常用套完所有加成的命中傷害計算」推論的，wiki 沒有直接寫。
3. PoE2 有沒有 DoT 乘數：只是 wiki 全站搜不到，沒有找到明確移除的 patch note。
4. PoE2 冰凍、感電的累積條會不會顯示在怪物身上：只有 Mobalytics 一個來源；冰凍、感電的累積公式也沒有公開。
5. PoE2 裝備詞綴的分類：`HandWraps…` 這批詞綴的來源我不確定，所以「一般稀有詞綴不直接給機制」這個結論有例外的可能。
