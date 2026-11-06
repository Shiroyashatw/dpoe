# Path of Exile 2 裝備基底全表（重做裝備底層用）

> 研究日期：**2026-11-06**。遊戲版本：PoE2 **0.5「Return of the Ancients」**（PoB-PoE2 資料，`dev` 分支）；poe2db 首頁已列 1.0。只研究，沒改程式。⚠️＝不確定或推論。
> 接續 `docs/PoE武器與底材.md`（2026-11-02 舊盤點：武器七大類逐個列表、飾品與防具的概況）。本檔補：**防具全部基底、固定詞（implicit）、基底分層結構、其餘武器類別的分布**。

**來源**
- PoB-PoE2 基底原檔（本檔所有數字來自這 26 個檔，由腳本解析）：<https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/tree/dev/src/Data/Bases>（`body.lua`、`helmet.lua`、`gloves.lua`、`boots.lua`、`shield.lua`、`focus.lua`、`belt.lua`、`ring.lua`、`amulet.lua`、`quiver.lua`、`flask.lua`、`jewel.lua`、各武器檔）
- poe2db 交叉比對（只抽查）：<https://poe2db.tw/us/Body_Armours>（基底名與等級跟 PoB 一致；頁面沒有 Advanced／Expert 字樣）、<https://poe2db.tw/us/Version_0.5.0>（0.5 改版：Runic Ward、防禦隨等級加成、基底改名）
- 官方網站、poewiki 抓不到（Cloudflare／Anubis），略過。

**三個先講清楚的前提**
1. **PoE2 沒有「Normal／Advanced／Expert」基底分層。**（那是任務敘述的假設；PoB 全部 1756 個基底、poe2db 防具頁都沒有這種名字。）基底升級靠的是**一長串依需求等級排列的不同名字**（Rusted Cuirass → … → Warlord Cuirass），每個等級一個新名字，見第 4 節。⚠️ 若指的是別的系統（例如 1.0 新增、PoB 還沒收的），這份資料看不到。
2. **PoB 的檔案混了三種東西**，本檔只算第一種：
   - **一般基底**（`n`）：正常掉落的。
   - **符文鍛造 Runeforged／Runemastered**（`rf`，0.5 聯盟：Verisium 鍛造後的版本，名字加 `Runeforged ` 前綴、防禦裡多一項 Runic Ward）：幾乎每個防具基底都有一份對應，數量約 1.3 倍於一般基底，是聯盟專用、**不算基底結構**。
   - **隱藏**（`hid`）：只供暗金或特殊來源。
3. 「防禦值」是 PoB 的基底值（20% 品質之前）。0.5.0 改版說明：物品的護甲、閃避在 65 級加成約 33%、80 級以上收斂到 15%（PoB 的數值是否已含此加成 ⚠️ 沒核對）。

---

## 1. 總數表（只算一般基底，不含符文鍛造與隱藏）

| 類別 | 一般 | 符文鍛造 | 隱藏 |
|---|---|---|---|
| 胸甲 | 148 | 196 | 3 |
| 頭盔 | 114 | 141 | 2 |
| 手套 | 88 | 109 | 4 |
| 鞋子 | 89 | 101 | 1 |
| 盾＋輕盾 | 88 | 103 | 2 |
| 法器 | 23 | 28 | 0 |
| 箭袋 | 11 | 0 | 0 |
| 戒指 | 27 | 0 | 0 |
| 護身符（項鍊） | 21 | 1 | 1 |
| 腰帶 | 16 | 1 | 0 |
| 藥劑（生命／魔力） | 18 | 0 | 0 |
| 護符 Charm | 13 | 0 | 0 |
| 珠寶 | 8 | 0 | 1 |
| 弓 | 27 | 6 | 1 |
| 十字弓 | 27 | 7 | 0 |
| 長矛 | 28 | 8 | 0 |
| 單手錘 | 28 | 8 | 0 |
| 雙手錘 | 26 | 13 | 1 |
| 細杖 Quarterstaff | 27 | 1 | 1 |
| 長杖 Staff | 14 | 0 | 3 |
| 法杖 | 13 | 1 | 2 |
| 權杖 | 15 | 0 | 1 |
| 魔符 Talisman | 25 | 6 | 0 |
| 單手劍 | 14 | 0 | 1 |
| 雙手劍 | 13 | 0 | 2 |
| 單手斧 | 13 | 0 | 0 |
| 雙手斧 | 13 | 0 | 0 |
| 匕首 | 14 | 0 | 0 |
| 爪 | 13 | 0 | 0 |
| 鏈錘 | 13 | 0 | 0 |
| 陷阱 Trap | 13 | 0 | 0 |

盾 88 個＝力系盾 66＋輕盾 Buckler（敏系，tag `buckler`）22。
一般基底總計：1000；全部（含符文鍛造、隱藏）：1756。

---

## 2. 防具系統（胸甲／頭盔／手套／鞋子／盾／法器）

### 2.1 每部位 × 每系的數量、等級、防禦範圍

「防禦」＝該系基底值加總（混合系 AR+EV 等）；等級＝需求等級（0＝沒有需求，Lv1 起手）。

| 部位 | 系 | 數量 | 需求等級（最小～最大） | 不同等級數 | 防禦值最低 | 防禦值最高 | 有固定詞的個數 |
|---|---|---|---|---|---|---|---|
| 胸甲 | 護甲 AR | 25 | 0～80 | 22 | 45 | 570 | 5 |
| 胸甲 | 閃避 EV | 25 | 0～80 | 21 | 30 | 519 | 5 |
| 胸甲 | 能量護盾 ES | 25 | 0～80 | 23 | 28 | 171 | 5 |
| 胸甲 | AR/EV | 23 | 0～80 | 21 | 41 | 598 | 5 |
| 胸甲 | AR/ES | 23 | 0～80 | 19 | 41 | 400 | 5 |
| 胸甲 | EV/ES | 22 | 0～80 | 20 | 32 | 372 | 5 |
| 胸甲 | 三系 AR/EV/ES | 4 | 0～65 | 2 | 0 | 597 | 2 |
| 胸甲 | 特殊（無防禦系，金色系） | 1 | 20～20 | 1 | 477 | 477 | 1 |
| 頭盔 | 護甲 AR | 20 | 0～80 | 17 | 29 | 374 | 0 |
| 頭盔 | 閃避 EV | 20 | 0～80 | 18 | 19 | 340 | 0 |
| 頭盔 | 能量護盾 ES | 20 | 0～80 | 18 | 19 | 109 | 0 |
| 頭盔 | AR/EV | 17 | 5～80 | 15 | 46 | 393 | 0 |
| 頭盔 | AR/ES | 17 | 5～80 | 15 | 39 | 263 | 0 |
| 頭盔 | EV/ES | 17 | 5～80 | 15 | 33 | 244 | 0 |
| 頭盔 | 三系 AR/EV/ES | 1 | 65～65 | 1 | 261 | 261 | 0 |
| 頭盔 | 特殊（無防禦系，金色系） | 2 | 12～12 | 1 | 0 | 0 | 2 |
| 手套 | 護甲 AR | 16 | 0～80 | 14 | 15 | 187 | 0 |
| 手套 | 閃避 EV | 16 | 0～80 | 14 | 10 | 170 | 0 |
| 手套 | 能量護盾 ES | 16 | 0～80 | 14 | 9 | 54 | 0 |
| 手套 | AR/EV | 13 | 6～80 | 11 | 25 | 197 | 0 |
| 手套 | AR/ES | 13 | 5～80 | 11 | 19 | 125 | 0 |
| 手套 | EV/ES | 13 | 0～80 | 11 | 15 | 123 | 0 |
| 手套 | 三系 AR/EV/ES | 1 | 65～65 | 1 | 131 | 131 | 0 |
| 鞋子 | 護甲 AR | 16 | 0～80 | 14 | 22 | 280 | 0 |
| 鞋子 | 閃避 EV | 16 | 0～80 | 14 | 15 | 255 | 0 |
| 鞋子 | 能量護盾 ES | 16 | 0～80 | 14 | 14 | 83 | 0 |
| 鞋子 | AR/EV | 13 | 6～80 | 11 | 39 | 294 | 0 |
| 鞋子 | AR/ES | 13 | 5～80 | 11 | 30 | 171 | 0 |
| 鞋子 | EV/ES | 13 | 5～80 | 11 | 25 | 183 | 0 |
| 鞋子 | 三系 AR/EV/ES | 1 | 65～65 | 1 | 195 | 195 | 0 |
| 鞋子 | 特殊（無防禦系，金色系） | 1 | 12～12 | 1 | 0 | 0 | 1 |
| 盾／輕盾 | 護甲 AR | 23 | 0～80 | 21 | 18 | 264 | 23 |
| 盾／輕盾 | 閃避 EV | 22 | 0～80 | 20 | 10 | 192 | 22 |
| 盾／輕盾 | AR/EV | 21 | 0～80 | 19 | 17 | 277 | 21 |
| 盾／輕盾 | AR/ES | 21 | 0～80 | 19 | 16 | 185 | 21 |
| 盾／輕盾 | 特殊（無防禦系，金色系） | 1 | 15～15 | 1 | 0 | 0 | 1 |
| 法器 | ES（法器） | 23 | 0～80 | 20 | 12 | 91 | 0 |

**結構觀察**
- 胸甲、頭盔、手套、鞋子都是**六種系**（AR、EV、ES、AR/EV、AR/ES、EV/ES）＋極少數三系。單系每部位 16～25 個，混合系 13～23 個。
- **力系盾**＝AR（23）、AR/ES（21）、AR/EV（21）；**輕盾 Buckler**＝純 EV（22）。盾沒有純 ES（ES 副手是法器 Focus，23 個）。
- 同一部位各系的**等級階梯幾乎一模一樣**（同一個等級點，每系各有一個基底），所以 6 系 × 同一條等級線。混合系的等級下限是 5～6 級（不從 1 級開始），單系從 0 級。
- 三系基底全是 65 級的特殊品（胸甲 4 個，其中 2 個帶特殊固定詞：Sacrificial Regalia「+1 腐化寶石等級」、Grasping Mail「可出戒指詞綴」；頭手鞋各 1 個，沒固定詞）。
- 所有等級階梯的**終點是 80 級**（`Warlord Cuirass` 等）；PoE2 最高掉落等級約 82。
- 移動速度懲罰（`MovementPenalty`，PoB 資料驗證過）只有**胸甲與力系盾**有：胸甲 AR 5%、AR/EV 與 AR/ES 4%、三系 3～4%、EV／ES／EV+ES 3%；盾 AR 3%、AR/EV 與 AR/ES 1.5%、輕盾 0。頭盔、手套、鞋子沒有懲罰。
- 盾的基礎格擋率：力系盾 25%（43 個）／26%（23 個），輕盾 20%（22 個）。

### 2.2 防禦值隨等級成長（代表：每系取各等級的最高值）

| 部位／系 | Lv1 | Lv10 | Lv20 | Lv30 | Lv40 | Lv50 | Lv60 | Lv65 | Lv70 | Lv80 |
|---|---|---|---|---|---|---|---|---|---|---|
| 胸甲 護甲 AR | 66 | 66 | 178 | 228 | 298 | 390 | 453 | 570 | 570 | 570 |
| 胸甲 閃避 EV | 49 | 49 | 128 | 194 | 260 | 339 | 412 | 451 | 519 | 519 |
| 胸甲 能量護盾 ES | 28 | 35 | 54 | 74 | 95 | 110 | 127 | 171 | 171 | 171 |
| 胸甲 AR/EV | 41 | 41 | 154 | 228 | 311 | 408 | 475 | 579 | 579 | 598 |
| 頭盔 護甲 AR | 29 | 29 | 99 | 149 | 191 | 246 | 297 | 325 | 341 | 374 |
| 頭盔 閃避 EV | 19 | 58 | 84 | 127 | 179 | 231 | 270 | 296 | 311 | 340 |
| 頭盔 能量護盾 ES | 19 | 29 | 35 | 47 | 62 | 73 | 84 | 90 | 97 | 109 |
| 頭盔 AR/EV | — | 46 | 100 | 150 | 184 | 258 | 312 | 342 | 359 | 393 |
| 手套 護甲 AR | 15 | 15 | 49 | 75 | 89 | 116 | 149 | 162 | 171 | 187 |
| 手套 閃避 EV | 10 | 10 | 42 | 68 | 79 | 105 | 135 | 148 | 155 | 170 |
| 手套 能量護盾 ES | 9 | 9 | 18 | 23 | 27 | 34 | 42 | 45 | 48 | 54 |
| 手套 AR/EV | — | 25 | 50 | 50 | 92 | 122 | 156 | 170 | 179 | 197 |
| 鞋子 護甲 AR | 22 | 22 | 74 | 112 | 133 | 174 | 223 | 244 | 256 | 280 |
| 鞋子 閃避 EV | 15 | 15 | 63 | 102 | 118 | 157 | 203 | 222 | 233 | 255 |
| 鞋子 能量護盾 ES | 14 | 14 | 27 | 36 | 41 | 51 | 63 | 68 | 73 | 83 |
| 鞋子 AR/EV | — | 39 | 76 | 76 | 138 | 182 | 234 | 256 | 269 | 294 |

（每格＝「需求等級 ≤ 該級」的所有基底裡最高的基底防禦值。AR/EV 是兩項相加。）

### 2.3 全部基底列名（一般基底）

格式：基底名｜需求等級｜基底防禦｜屬性需求（力/敏/智）｜固定詞。名字後 `†`＝標註特殊來源（`not_for_sale` 等）。同一等級有兩三個基底並排是正常的（第 4 節）。


#### 胸甲（Body Armour）


**胸甲・護甲 AR（25）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Rusted Cuirass | 0 | AR45 移速−5% | 0/0/0 | — |
| Fur Plate | 0 | AR66 移速−5% | 10/0/0 | — |
| Iron Cuirass | 11 | AR115 移速−5% | 21/0/0 | — |
| Raider Plate | 16 | AR150 移速−5% | 28/0/0 | — |
| Maraketh Cuirass | 20 | AR178 移速−5% | 34/0/0 | — |
| Steel Plate | 27 | AR228 移速−5% | 45/0/0 | — |
| Full Plate | 33 | AR270 移速−5% | 54/0/0 | — |
| Vaal Cuirass | 37 | AR298 移速−5% | 60/0/0 | — |
| Juggernaut Plate | 45 | AR355 移速−5% | 72/0/0 | — |
| Barbarian Plate | 45 | AR355 移速−5% | 72/0/0 | — |
| Rugged Cuirass | 48 | AR376 移速−5% | 77/0/0 | — |
| Chieftain Cuirass | 50 | AR390 移速−5% | 80/0/0 | — |
| Sandsworn Cuirass | 51 | AR397 移速−5% | 82/0/0 | — |
| Colosseum Plate | 52 | AR404 移速−5% | 83/0/0 | — |
| Elegant Plate | 54 | AR418 移速−5% | 86/0/0 | — |
| Champion Cuirass | 58 | AR446 移速−5% | 92/0/0 | — |
| Heavy Plate | 59 | AR453 移速−5% | 94/0/0 | — |
| Stone Cuirass | 62 | AR474 移速−5% | 98/0/0 | — |
| Glorious Plate | 65 | AR496 移速−5% | 121/0/0 | — |
| Soldier Cuirass | 65 | AR570 移速−5% | 121/0/0 | — |
| Conqueror Plate | 68 | AR496 移速−5% | 121/0/0 | (30-40)% increased Stun Threshold |
| Ornate Plate | 70 | AR496 移速−5% | 121/0/0 | Regenerate (1.5-2.5)% of maximum Life per second |
| Abyssal Cuirass | 73 | AR496 移速−5% | 121/0/0 | Regenerate (1.5-2.5)% of maximum Life per second |
| Utzaal Cuirass | 75 | AR496 移速−5% | 121/0/0 | (30-40)% increased Stun Threshold |
| Warlord Cuirass | 80 | AR496 移速−5% | 121/0/0 | +(15-25)% of Armour also applies to Elemental Damage |

**胸甲・閃避 EV（25）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Leather Vest | 0 | EV30 移速−3% | 0/0/0 | — |
| Quilted Vest | 0 | EV49 移速−3% | 0/10/0 | — |
| Pathfinder Coat | 11 | EV96 移速−3% | 0/21/0 | — |
| Shrouded Vest | 16 | EV128 移速−3% | 0/28/0 | — |
| Rhoahide Coat | 22 | EV168 移速−3% | 0/37/0 | — |
| Studded Vest | 26 | EV194 移速−3% | 0/43/0 | — |
| Scout's Vest | 33 | EV240 移速−3% | 0/54/0 | — |
| Serpentscale Coat | 36 | EV260 移速−3% | 0/59/0 | — |
| Corsair Vest | 45 | EV320 移速−3% | 0/72/0 | — |
| Patchwork Vest | 45 | EV320 移速−3% | 0/72/0 | — |
| Hunting Coat | 48 | EV339 移速−3% | 0/77/0 | — |
| Smuggler Coat | 51 | EV359 移速−3% | 0/82/0 | — |
| Riding Coat | 51 | EV359 移速−3% | 0/82/0 | — |
| Strider Vest | 52 | EV366 移速−3% | 0/83/0 | — |
| Layered Vest | 54 | EV379 移速−3% | 0/86/0 | — |
| Hardleather Coat | 56 | EV392 移速−3% | 0/89/0 | — |
| Runner Vest | 59 | EV412 移速−3% | 0/94/0 | — |
| Lizardscale Coat | 62 | EV432 移速−3% | 0/98/0 | — |
| Exquisite Vest | 65 | EV451 移速−3% | 0/121/0 | — |
| Swiftstalker Coat | 65 | EV451 移速−3% | 0/121/0 | (20-30)% reduced Slowing Potency of Debuffs on You |
| Mail Coat | 68 | EV451 移速−3% | 0/121/0 | (20-30)% reduced Slowing Potency of Debuffs on You |
| Slipstrike Vest | 70 | EV519 移速−3% | 0/121/0 | — |
| Armoured Vest | 73 | EV451 移速−3% | 0/121/0 | (30-40)% increased Elemental Ailment Threshold |
| Wyrmscale Coat | 75 | EV451 移速−3% | 0/121/0 | (30-40)% increased Elemental Ailment Threshold |
| Corsair Coat | 80 | EV451 移速−3% | 0/121/0 | 5% increased Movement Speed |

**胸甲・能量護盾 ES（25）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Tattered Robe | 0 | ES28 移速−3% | 0/0/0 | — |
| Feathered Robe | 5 | ES35 移速−3% | 0/0/11 | — |
| Hexer's Robe | 11 | ES45 移速−3% | 0/0/21 | — |
| Bone Raiment | 16 | ES54 移速−3% | 0/0/28 | — |
| Silk Robe | 22 | ES64 移速−3% | 0/0/37 | — |
| Keth Raiment | 28 | ES74 移速−3% | 0/0/47 | — |
| Votive Raiment | 33 | ES83 移速−3% | 0/0/54 | — |
| Altar Robe | 40 | ES95 移速−3% | 0/0/65 | — |
| Elementalist Robe | 45 | ES103 移速−3% | 0/0/72 | — |
| Avian Robe | 45 | ES103 移速−3% | 0/0/72 | — |
| Cursespeaker's Robe | 48 | ES109 移速−3% | 0/0/77 | — |
| Mystic Raiment | 49 | ES110 移速−3% | 0/0/78 | — |
| Luxurious Robe | 51 | ES114 移速−3% | 0/0/82 | — |
| Imperial Robe | 52 | ES115 移速−3% | 0/0/83 | — |
| River Raiment | 54 | ES119 移速−3% | 0/0/86 | — |
| Plated Raiment | 58 | ES126 移速−3% | 0/0/92 | — |
| Adherent's Raiment | 59 | ES127 移速−3% | 0/0/94 | — |
| Ceremonial Robe | 62 | ES132 移速−3% | 0/0/98 | — |
| Havoc Raiment | 65 | ES138 移速−3% | 0/0/121 | — |
| Vile Robe | 65 | ES171 移速−3% | 0/0/121 | — |
| Enlightened Robe | 68 | ES138 移速−3% | 0/0/121 | (40-50)% increased Mana Regeneration Rate |
| Flowing Raiment | 70 | ES153 移速−3% | 0/0/121 | (40-50)% increased Mana Regeneration Rate |
| Arcane Raiment | 73 | ES138 移速−3% | 0/0/121 | (20-25)% increased Energy Shield Recharge Rate |
| Sacramental Robe | 75 | ES153 移速−3% | 0/0/121 | (20-25)% increased Energy Shield Recharge Rate |
| Feathered Raiment | 80 | ES153 移速−3% | 0/0/121 | (5-10)% of Damage is taken from Mana before Life |

**胸甲・AR/EV（23）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Chain Mail | 0 | AR25 EV16 移速−4% | 0/0/0 | — |
| Rogue Armour | 11 | AR63 EV53 移速−4% | 13/13/0 | — |
| Vagabond Armour | 16 | AR83 EV71 移速−4% | 17/17/0 | — |
| Cloaked Mail | 26 | AR121 EV107 移速−4% | 25/25/0 | — |
| Explorer Armour | 33 | AR149 EV132 移速−4% | 31/31/0 | — |
| Scale Mail | 37 | AR164 EV147 移速−4% | 34/34/0 | — |
| Knight Armour | 45 | AR195 EV176 移速−4% | 41/41/0 | — |
| Ring Mail | 45 | AR195 EV176 移速−4% | 41/41/0 | — |
| Scoundrel Armour | 48 | AR207 EV187 移速−4% | 43/43/0 | — |
| Ancestral Mail | 50 | AR214 EV194 移速−4% | 44/44/0 | — |
| Wanderer Armour | 51 | AR218 EV197 移速−4% | 45/45/0 | — |
| Lamellar Mail | 52 | AR222 EV201 移速−4% | 46/46/0 | — |
| Mantled Mail | 54 | AR230 EV208 移速−4% | 48/48/0 | — |
| Gladiator Armour | 58 | AR245 EV223 移速−4% | 51/51/0 | — |
| Trailblazer Armour | 59 | AR249 EV226 移速−4% | 52/52/0 | — |
| Golden Mail | 62 | AR261 EV237 移速−4% | 54/54/0 | — |
| Heroic Armour | 65 | AR273 EV248 移速−4% | 67/67/0 | +(60-80) to maximum Life |
| Dastard Armour | 65 | AR303 EV276 移速−4% | 67/67/0 | +(60-80) to maximum Life |
| Tournament Mail | 68 | AR273 EV248 移速−4% | 67/67/0 | +(20-25)% to Lightning Resistance |
| Shrouded Mail | 70 | AR273 EV248 移速−4% | 67/67/0 | +(20-25)% to Lightning Resistance |
| Slayer Armour | 73 | AR273 EV248 移速−4% | 67/67/0 | — |
| Death Mail | 75 | AR313 EV285 移速−4% | 67/67/0 | — |
| Thane Mail | 80 | AR273 EV248 移速−4% | 67/67/0 | Hits against you have (15-25)% reduced Critical Damage Bonus |

**胸甲・AR/ES（23）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Pilgrim Vestments | 0 | AR25 ES16 移速−4% | 0/0/0 | — |
| Pelt Mantle | 10 | AR59 ES24 移速−4% | 12/0/12 | — |
| Mail Vestments | 16 | AR83 ES30 移速−4% | 17/0/17 | — |
| Shaman Mantle | 28 | AR129 ES41 移速−4% | 26/0/26 | — |
| Ironclad Vestments | 33 | AR149 ES46 移速−4% | 31/0/31 | — |
| Sacrificial Mantle | 36 | AR160 ES48 移速−4% | 33/0/33 | — |
| Cleric Vestments | 45 | AR195 ES57 移速−4% | 41/0/41 | — |
| Templar Vestments | 45 | AR195 ES57 移速−4% | 41/0/41 | — |
| Bearskin Mantle | 48 | AR207 ES60 移速−4% | 43/0/43 | — |
| Tideseer Mantle | 51 | AR218 ES63 移速−4% | 45/0/45 | — |
| Chain Vestments | 51 | AR218 ES63 移速−4% | 45/0/45 | — |
| Gilded Vestments | 52 | AR222 ES63 移速−4% | 46/0/46 | — |
| Venerated Mantle | 54 | AR230 ES65 移速−4% | 48/0/48 | — |
| Occultist Mantle | 54 | AR230 ES65 移速−4% | 48/0/48 | — |
| Plated Vestments | 59 | AR249 ES70 移速−4% | 52/0/52 | — |
| Heartcarver Mantle | 62 | AR261 ES73 移速−4% | 54/0/54 | — |
| Revered Vestments | 65 | AR273 ES76 移速−4% | 67/0/67 | +1% to all Maximum Elemental Resistances |
| Wolfskin Mantle | 65 | AR313 ES87 移速−4% | 67/0/67 | — |
| Corvus Mantle | 68 | AR273 ES76 移速−4% | 67/0/67 | +(20-30) to Spirit |
| Conjurer Mantle | 70 | AR273 ES76 移速−4% | 67/0/67 | +(20-30) to Spirit |
| Zenith Vestments | 73 | AR273 ES76 移速−4% | 67/0/67 | — |
| Death Mantle | 75 | AR273 ES76 移速−4% | 67/0/67 | +1% to all Maximum Elemental Resistances |
| Seastorm Mantle | 80 | AR273 ES76 移速−4% | 67/0/67 | (8-14)% of Damage taken Recouped as Life |

**胸甲・EV/ES（22）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Hermit Garb | 0 | EV16 ES16 移速−3% | 0/0/0 | — |
| Waxed Jacket | 11 | EV53 ES25 移速−3% | 0/13/13 | — |
| Marabout Garb | 16 | EV71 ES30 移速−3% | 0/17/17 | — |
| Wayfarer Jacket | 28 | EV114 ES41 移速−3% | 0/26/26 | — |
| Anchorite Garb | 33 | EV132 ES46 移速−3% | 0/31/31 | — |
| Scalper's Jacket | 39 | EV154 ES51 移速−3% | 0/35/35 | — |
| Scoundrel Jacket | 45 | EV176 ES57 移速−3% | 0/41/41 | — |
| Ascetic Garb | 45 | EV176 ES57 移速−3% | 0/41/41 | — |
| Oiled Jacket | 48 | EV187 ES60 移速−3% | 0/43/43 | — |
| Evangelist Garb | 51 | EV197 ES63 移速−3% | 0/45/45 | — |
| Clandestine Jacket | 52 | EV201 ES63 移速−3% | 0/46/46 | — |
| Itinerant Jacket | 54 | EV208 ES65 移速−3% | 0/48/48 | — |
| Monastic Garb | 56 | EV216 ES67 移速−3% | 0/50/50 | — |
| Hatungo Garb | 59 | EV226 ES70 移速−3% | 0/52/52 | — |
| Hawker's Jacket | 62 | EV237 ES73 移速−3% | 0/54/54 | — |
| Torment Jacket | 65 | EV248 ES76 移速−3% | 0/67/67 | — |
| Sleek Jacket | 65 | EV285 ES87 移速−3% | 0/67/67 | — |
| Devout Garb | 68 | EV248 ES76 移速−3% | 0/67/67 | +(7-13)% to Chaos Resistance |
| Rambler Jacket | 70 | EV248 ES76 移速−3% | 0/67/67 | +(7-13)% to Chaos Resistance |
| Assassin Garb | 73 | EV248 ES76 移速−3% | 0/67/67 | 5% increased Movement Speed |
| Falconer's Jacket | 75 | EV248 ES76 移速−3% | 0/67/67 | 5% increased Movement Speed |
| Austere Garb | 80 | EV248 ES76 移速−3% | 0/67/67 | (10-15)% reduced Elemental Ailment Duration on you |

**胸甲・三系 AR/EV/ES（4）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Garment | 0 | — | 0/0/0 | — |
| Grand Regalia | 65 | AR182 EV165 ES50 移速−4% | 41/41/41 | — |
| Grasping Mail | 65 | AR182 EV165 ES50 移速−4% | 41/41/41 | Can roll Ring Modifiers；Catalysts can be applied to this item |
| Sacrificial Regalia | 65 | AR273 EV248 ES76 移速−3% | 72/72/72 | +1 to Level of all Corrupted Skill Gems |

**胸甲・特殊（無防禦系，金色系）（1）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Golden Mantle† | 20 | AR216 EV187 ES74 | 7/7/7 | +(15-25)% to all Elemental Resistances |

#### 頭盔（Helmet）


**頭盔・護甲 AR（20）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Rusted Greathelm | 0 | AR29 | 0/0/0 | — |
| Soldier Greathelm | 12 | AR80 | 19/0/0 | — |
| Wrapped Greathelm | 16 | AR99 | 25/0/0 | — |
| Spired Greathelm | 27 | AR149 | 40/0/0 | — |
| Elite Greathelm | 33 | AR177 | 48/0/0 | — |
| Warrior Greathelm | 36 | AR191 | 52/0/0 | — |
| Commander Greathelm | 45 | AR233 | 64/0/0 | — |
| Corroded Greathelm | 45 | AR233 | 64/0/0 | — |
| Mercenary Greathelm | 48 | AR246 | 69/0/0 | — |
| Fierce Greathelm | 51 | AR260 | 73/0/0 | — |
| Homeguard Greathelm | 51 | AR260 | 73/0/0 | — |
| Sentinel Greathelm | 52 | AR265 | 74/0/0 | — |
| Elegant Greathelm | 54 | AR274 | 77/0/0 | — |
| Goliath Greathelm | 57 | AR288 | 81/0/0 | — |
| Noble Greathelm | 59 | AR297 | 83/0/0 | — |
| Guardian Greathelm | 65 | AR325 | 91/0/0 | — |
| Warmonger Greathelm | 65 | AR325 | 91/0/0 | — |
| Masked Greathelm | 70 | AR341 | 99/0/0 | — |
| Paragon Greathelm | 75 | AR357 | 107/0/0 | — |
| Imperial Greathelm | 80 | AR374 | 115/0/0 | — |

**頭盔・閃避 EV（20）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Shabby Hood | 0 | EV19 | 0/0/0 | — |
| Felt Cap | 10 | EV58 | 0/17/0 | — |
| Lace Hood | 16 | EV84 | 0/25/0 | — |
| Swathed Cap | 26 | EV127 | 0/38/0 | — |
| Hunter Hood | 33 | EV158 | 0/48/0 | — |
| Viper Cap | 38 | EV179 | 0/54/0 | — |
| Corsair Cap | 45 | EV210 | 0/64/0 | — |
| Rotted Hood | 45 | EV210 | 0/64/0 | — |
| Wool Cap | 48 | EV222 | 0/69/0 | — |
| Leatherbound Hood | 50 | EV231 | 0/71/0 | — |
| Narrow Hood | 51 | EV235 | 0/73/0 | — |
| Velvet Cap | 52 | EV240 | 0/74/0 | — |
| Wrapped Cap | 54 | EV248 | 0/77/0 | — |
| Covert Hood | 56 | EV257 | 0/79/0 | — |
| Deerstalker Hood | 59 | EV270 | 0/83/0 | — |
| Armoured Cap | 65 | EV296 | 0/91/0 | — |
| Woven Cap | 65 | EV296 | 0/91/0 | — |
| Desert Cap | 70 | EV311 | 0/99/0 | — |
| Trapper Hood | 75 | EV326 | 0/107/0 | — |
| Freebooter Cap | 80 | EV340 | 0/115/0 | — |

**頭盔・能量護盾 ES（20）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Twig Circlet | 0 | ES19 | 0/0/0 | — |
| Wicker Tiara | 10 | ES29 | 0/0/17 | — |
| Beaded Circlet | 16 | ES35 | 0/0/25 | — |
| Chain Tiara | 26 | ES47 | 0/0/38 | — |
| Feathered Tiara | 33 | ES54 | 0/0/48 | — |
| Gold Circlet | 40 | ES62 | 0/0/58 | — |
| Vermeil Circlet | 45 | ES68 | 0/0/64 | — |
| Druidic Circlet | 45 | ES68 | 0/0/64 | — |
| Avian Tiara | 48 | ES71 | 0/0/69 | — |
| Jade Tiara | 50 | ES73 | 0/0/71 | — |
| Desert Circlet | 51 | ES75 | 0/0/73 | — |
| Noble Circlet | 52 | ES76 | 0/0/74 | — |
| Sandsworn Tiara | 54 | ES78 | 0/0/77 | — |
| Twilight Tiara | 58 | ES82 | 0/0/82 | — |
| Jungle Tiara | 59 | ES84 | 0/0/83 | — |
| Magus Tiara | 65 | ES90 | 0/0/91 | — |
| Skycrown Tiara | 65 | ES90 | 0/0/91 | — |
| Sorcerous Tiara | 70 | ES97 | 0/0/99 | — |
| Kamasan Tiara | 75 | ES103 | 0/0/107 | — |
| Ancestral Tiara | 80 | ES109 | 0/0/115 | — |

**頭盔・AR/EV（17）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Brimmed Helm | 5 | AR26 EV20 | 7/7/0 | — |
| Guarded Helm | 11 | AR42 EV34 | 11/11/0 | — |
| Visored Helm | 16 | AR54 EV46 | 15/15/0 | — |
| Cowled Helm | 26 | AR80 EV70 | 22/22/0 | — |
| Shielded Helm | 33 | AR97 EV87 | 27/27/0 | — |
| Closed Helm | 45 | AR128 EV115 | 36/36/0 | — |
| Domed Helm | 45 | AR128 EV115 | 36/36/0 | — |
| Engraved Helm | 48 | AR136 EV122 | 38/38/0 | — |
| Soldier Helm | 51 | AR143 EV129 | 40/40/0 | — |
| Decorated Helm | 52 | AR146 EV132 | 41/41/0 | — |
| Cabalist Helm | 54 | AR151 EV137 | 42/42/0 | — |
| Cassis Helm | 59 | AR163 EV149 | 46/46/0 | — |
| Gallant Helm | 65 | AR179 EV163 | 50/50/0 | — |
| Warded Helm | 65 | AR179 EV163 | 50/50/0 | — |
| Cryptic Helm | 70 | AR188 EV171 | 54/54/0 | — |
| Champion Helm | 75 | AR197 EV179 | 59/59/0 | — |
| Gladiatorial Helm | 80 | AR206 EV187 | 63/63/0 | — |

**頭盔・AR/ES（17）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Iron Crown | 5 | AR26 ES13 | 7/0/7 | — |
| Horned Crown | 10 | AR39 ES16 | 10/0/10 | — |
| Cultist Crown | 16 | AR54 ES19 | 15/0/15 | — |
| Martyr Crown | 28 | AR85 ES27 | 23/0/23 | — |
| Heavy Crown | 33 | AR97 ES30 | 27/0/27 | — |
| Spiritbone Crown | 45 | AR128 ES37 | 36/0/36 | — |
| Mailed Crown | 45 | AR128 ES37 | 36/0/36 | — |
| Forest Crown | 48 | AR136 ES39 | 38/0/38 | — |
| Zealot Crown | 51 | AR143 ES41 | 40/0/40 | — |
| Lavish Crown | 52 | AR146 ES42 | 41/0/41 | — |
| Hallowed Crown | 54 | AR151 ES43 | 42/0/42 | — |
| Inquisitor Crown | 59 | AR163 ES46 | 46/0/46 | — |
| Archon Crown | 65 | AR179 ES50 | 50/0/50 | — |
| Druidic Crown | 65 | AR179 ES50 | 50/0/50 | — |
| Saintly Crown | 70 | AR188 ES52 | 54/0/54 | — |
| Divine Crown | 75 | AR197 ES55 | 59/0/59 | — |
| Cryptic Crown | 80 | AR206 ES57 | 63/0/63 | — |

**頭盔・EV/ES（17）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Hewn Mask | 5 | EV20 ES13 | 0/7/7 | — |
| Face Mask | 10 | EV32 ES16 | 0/10/10 | — |
| Hooded Mask | 16 | EV46 ES19 | 0/15/15 | — |
| Veiled Mask | 28 | EV75 ES27 | 0/23/23 | — |
| Tribal Mask | 33 | EV87 ES30 | 0/27/27 | — |
| Solid Mask | 45 | EV115 ES37 | 0/36/36 | — |
| Oak Mask | 45 | EV115 ES37 | 0/36/36 | — |
| Bandit Mask | 48 | EV122 ES39 | 0/38/38 | — |
| Skulking Mask | 51 | EV129 ES41 | 0/40/40 | — |
| Shaded Mask | 52 | EV132 ES42 | 0/41/41 | — |
| Pariah Mask | 54 | EV137 ES43 | 0/42/42 | — |
| Avian Mask | 59 | EV149 ES46 | 0/46/46 | — |
| Death Mask | 65 | EV163 ES50 | 0/50/50 | — |
| Brigand Mask | 65 | EV163 ES50 | 0/50/50 | — |
| Faridun Mask | 70 | EV171 ES52 | 0/54/54 | — |
| Soaring Mask | 75 | EV179 ES55 | 0/59/59 | — |
| Grinning Mask | 80 | EV187 ES57 | 0/63/63 | — |

**頭盔・三系 AR/EV/ES（1）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Grand Visage | 65 | AR119 EV109 ES33 | 36/36/36 | — |

**頭盔・特殊（無防禦系，金色系）（2）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Golden Wreath† | 12 | — | 0/0/0 | +(16-24) to all Attributes |
| Golden Visage† | 12 | — | 0/0/0 | +(8-16)% to all Elemental Resistances |

#### 手套（Gloves）


**手套・護甲 AR（16）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Stocky Mitts | 0 | AR15 | 0/0/0 | — |
| Riveted Mitts | 11 | AR38 | 16/0/0 | — |
| Tempered Mitts | 16 | AR49 | 22/0/0 | — |
| Bolstered Mitts | 27 | AR75 | 35/0/0 | — |
| Moulded Mitts | 33 | AR89 | 42/0/0 | — |
| Detailed Mitts | 45 | AR116 | 56/0/0 | — |
| Plated Mitts | 45 | AR116 | 56/0/0 | — |
| Elegant Mitts | 51 | AR130 | 64/0/0 | — |
| Titan Mitts | 52 | AR132 | 64/0/0 | — |
| Ancient Mitts | 54 | AR137 | 67/0/0 | — |
| Feathered Mitts | 59 | AR149 | 73/0/0 | — |
| Grand Mitts | 65 | AR162 | 80/0/0 | — |
| Knightly Mitts | 65 | AR162 | 80/0/0 | — |
| Ornate Mitts | 70 | AR171 | 87/0/0 | — |
| Vaal Mitts | 75 | AR179 | 94/0/0 | — |
| Massive Mitts | 80 | AR187 | 101/0/0 | — |

**手套・閃避 EV（16）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Suede Bracers | 0 | EV10 | 0/0/0 | — |
| Firm Bracers | 11 | EV31 | 0/16/0 | — |
| Bound Bracers | 16 | EV42 | 0/22/0 | — |
| Sectioned Bracers | 28 | EV68 | 0/36/0 | — |
| Spined Bracers | 33 | EV79 | 0/42/0 | — |
| Fine Bracers | 45 | EV105 | 0/56/0 | — |
| Hunting Bracers | 45 | EV105 | 0/56/0 | — |
| Swift Bracers | 51 | EV118 | 0/64/0 | — |
| Hardened Bracers | 52 | EV120 | 0/64/0 | — |
| Refined Bracers | 54 | EV124 | 0/67/0 | — |
| Spiked Bracers | 59 | EV135 | 0/73/0 | — |
| Engraved Bracers | 65 | EV148 | 0/80/0 | — |
| Stalking Bracers | 65 | EV148 | 0/80/0 | — |
| Grand Bracers | 70 | EV155 | 0/87/0 | — |
| Barbed Bracers | 75 | EV163 | 0/94/0 | — |
| Polished Bracers | 80 | EV170 | 0/101/0 | — |

**手套・能量護盾 ES（16）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Torn Gloves | 0 | ES9 | 0/0/0 | — |
| Sombre Gloves | 12 | ES15 | 0/0/17 | — |
| Stitched Gloves | 16 | ES18 | 0/0/22 | — |
| Jewelled Gloves | 26 | ES23 | 0/0/34 | — |
| Intricate Gloves | 33 | ES27 | 0/0/42 | — |
| Pauascale Gloves | 45 | ES34 | 0/0/56 | — |
| Ominous Gloves | 45 | ES34 | 0/0/56 | — |
| Embellished Gloves | 51 | ES37 | 0/0/64 | — |
| Embroidered Gloves | 52 | ES38 | 0/0/64 | — |
| Baroque Gloves | 54 | ES39 | 0/0/67 | — |
| Gold Gloves | 59 | ES42 | 0/0/73 | — |
| Adorned Gloves | 65 | ES45 | 0/0/80 | — |
| Grim Gloves | 65 | ES45 | 0/0/80 | — |
| Opulent Gloves | 70 | ES48 | 0/0/87 | — |
| Vaal Gloves | 75 | ES51 | 0/0/94 | — |
| Sirenscale Gloves | 80 | ES54 | 0/0/101 | — |

**手套・AR/EV（13）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Ringmail Gauntlets | 6 | AR14 EV11 | 6/6/0 | — |
| Layered Gauntlets | 16 | AR27 EV23 | 13/13/0 | — |
| Doubled Gauntlets | 33 | AR49 EV43 | 24/24/0 | — |
| Plate Gauntlets | 45 | AR64 EV58 | 32/32/0 | — |
| Ironmail Gauntlets | 45 | AR64 EV58 | 32/32/0 | — |
| Captain Gauntlets | 51 | AR72 EV65 | 35/35/0 | — |
| Burnished Gauntlets | 52 | AR73 EV66 | 36/36/0 | — |
| Zealot Gauntlets | 59 | AR82 EV74 | 41/41/0 | — |
| Ornate Gauntlets | 65 | AR89 EV81 | 44/44/0 | — |
| Steelmail Gauntlets | 65 | AR89 EV81 | 44/44/0 | — |
| Commander Gauntlets | 70 | AR94 EV85 | 48/48/0 | — |
| Cultist Gauntlets | 75 | AR98 EV90 | 52/52/0 | — |
| Blacksteel Gauntlets | 80 | AR103 EV94 | 55/55/0 | — |

**手套・AR/ES（13）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Rope Cuffs | 5 | AR13 ES6 | 6/0/6 | — |
| Aged Cuffs | 16 | AR27 ES10 | 13/0/13 | — |
| Goldcast Cuffs | 33 | AR49 ES15 | 24/0/24 | — |
| Kalguuran Cuffs | 45 | AR64 ES19 | 32/0/32 | — |
| Braided Cuffs | 45 | AR64 ES19 | 32/0/32 | — |
| Heirloom Cuffs | 51 | AR72 ES21 | 35/0/35 | — |
| Righteous Cuffs | 52 | AR73 ES21 | 36/0/36 | — |
| Ornate Cuffs | 59 | AR82 ES23 | 41/0/41 | — |
| Signet Cuffs | 65 | AR89 ES25 | 44/0/44 | — |
| Bound Cuffs | 65 | AR89 ES25 | 44/0/44 | — |
| Ancient Cuffs | 70 | AR89 ES25 | 48/0/48 | — |
| Gleaming Cuffs | 75 | AR94 ES26 | 52/0/52 | — |
| Adherent Cuffs | 80 | AR98 ES27 | 55/0/55 | — |

**手套・EV/ES（13）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Gauze Wraps | 0 | EV9 ES6 | 0/6/6 | — |
| Linen Wraps | 16 | EV23 ES10 | 0/13/13 | — |
| Spiral Wraps | 33 | EV43 ES15 | 0/24/24 | — |
| Buckled Wraps | 45 | EV58 ES19 | 0/32/32 | — |
| Bandage Wraps | 45 | EV58 ES19 | 0/32/32 | — |
| Cambric Wraps | 51 | EV65 ES21 | 0/35/35 | — |
| Furtive Wraps | 52 | EV66 ES21 | 0/36/36 | — |
| Adorned Wraps | 59 | EV74 ES23 | 0/41/41 | — |
| Utility Wraps | 65 | EV81 ES25 | 0/44/44 | — |
| War Wraps | 65 | EV94 ES29 | 0/44/44 | — |
| Elegant Wraps | 70 | EV85 ES26 | 0/48/48 | — |
| Vaal Wraps | 75 | EV90 ES27 | 0/52/52 | — |
| Secured Wraps | 80 | EV94 ES29 | 0/55/55 | — |

**手套・三系 AR/EV/ES（1）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Grand Manchettes | 65 | AR60 EV54 ES17 | 32/32/32 | — |

#### 鞋子（Boots）


**鞋子・護甲 AR（16）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Rough Greaves | 0 | AR22 | 0/0/0 | — |
| Iron Greaves | 11 | AR57 | 17/0/0 | — |
| Bronze Greaves | 16 | AR74 | 23/0/0 | — |
| Trimmed Greaves | 27 | AR112 | 38/0/0 | — |
| Stone Greaves | 33 | AR133 | 45/0/0 | — |
| Reefsteel Greaves | 45 | AR174 | 60/0/0 | — |
| Plated Greaves | 45 | AR174 | 60/0/0 | — |
| Lionheart Greaves | 51 | AR195 | 68/0/0 | — |
| Monument Greaves | 52 | AR199 | 69/0/0 | — |
| Elegant Greaves | 54 | AR206 | 72/0/0 | — |
| Carved Greaves | 59 | AR223 | 78/0/0 | — |
| Totemic Greaves | 65 | AR244 | 86/0/0 | — |
| Bulwark Greaves | 65 | AR244 | 86/0/0 | — |
| Ornate Greaves | 70 | AR256 | 93/0/0 | — |
| Vaal Greaves | 75 | AR268 | 101/0/0 | — |
| Tasalian Greaves | 80 | AR280 | 108/0/0 | — |

**鞋子・閃避 EV（16）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Rawhide Boots | 0 | EV15 | 0/0/0 | — |
| Laced Boots | 11 | EV47 | 0/17/0 | — |
| Embossed Boots | 16 | EV63 | 0/23/0 | — |
| Steeltoe Boots | 28 | EV102 | 0/39/0 | — |
| Lizardscale Boots | 33 | EV118 | 0/45/0 | — |
| Flared Boots | 45 | EV157 | 0/60/0 | — |
| Bound Boots | 45 | EV157 | 0/60/0 | — |
| Sleek Boots | 51 | EV177 | 0/68/0 | — |
| Leatherplate Boots | 52 | EV180 | 0/69/0 | — |
| Studded Boots | 54 | EV186 | 0/72/0 | — |
| Serpentscale Boots | 59 | EV203 | 0/78/0 | — |
| Embroidered Boots | 65 | EV222 | 0/86/0 | — |
| Cinched Boots | 65 | EV222 | 0/86/0 | — |
| Cavalry Boots | 70 | EV233 | 0/93/0 | — |
| Dragonscale Boots | 75 | EV244 | 0/101/0 | — |
| Drakeskin Boots | 80 | EV255 | 0/108/0 | — |

**鞋子・能量護盾 ES（16）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Straw Sandals | 0 | ES14 | 0/0/0 | — |
| Wrapped Sandals | 11 | ES22 | 0/0/17 | — |
| Lattice Sandals | 16 | ES27 | 0/0/23 | — |
| Silk Slippers | 27 | ES36 | 0/0/38 | — |
| Feathered Sandals | 33 | ES41 | 0/0/45 | — |
| Flax Sandals | 45 | ES51 | 0/0/60 | — |
| Laced Sandals | 45 | ES51 | 0/0/60 | — |
| Bangled Sandals | 51 | ES56 | 0/0/68 | — |
| Studded Sandals | 52 | ES57 | 0/0/69 | — |
| Elegant Slippers | 54 | ES58 | 0/0/72 | — |
| Dunerunner Sandals | 59 | ES63 | 0/0/78 | — |
| Elaborate Sandals | 65 | ES68 | 0/0/86 | — |
| Bound Sandals | 65 | ES68 | 0/0/86 | — |
| Luxurious Slippers | 70 | ES73 | 0/0/93 | — |
| Sandsworn Sandals | 75 | ES78 | 0/0/101 | — |
| Sekhema Sandals | 80 | ES83 | 0/0/108 | — |

**鞋子・AR/EV（13）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Mail Sabatons | 6 | AR22 EV17 | 7/7/0 | — |
| Braced Sabatons | 16 | AR41 EV35 | 14/14/0 | — |
| Stacked Sabatons | 33 | AR73 EV65 | 26/26/0 | — |
| Covered Sabatons | 45 | AR96 EV86 | 34/34/0 | — |
| Soldiering Sabatons | 45 | AR96 EV86 | 34/34/0 | — |
| Goldwork Sabatons | 51 | AR107 EV97 | 38/38/0 | — |
| Flexile Sabatons | 52 | AR109 EV99 | 38/38/0 | — |
| Bastion Sabatons | 59 | AR123 EV111 | 44/44/0 | — |
| Bold Sabatons | 65 | AR134 EV122 | 47/47/0 | — |
| Veteran Sabatons | 65 | AR134 EV122 | 47/47/0 | — |
| Noble Sabatons | 70 | AR141 EV128 | 51/51/0 | — |
| Fortress Sabatons | 75 | AR147 EV134 | 56/56/0 | — |
| Blacksteel Sabatons | 80 | AR154 EV140 | 59/59/0 | — |

**鞋子・AR/ES（13）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Padded Leggings | 5 | AR20 ES10 | 7/0/7 | — |
| Secured Leggings | 16 | AR41 ES15 | 14/0/14 | — |
| Pelt Leggings | 33 | AR73 ES22 | 26/0/26 | — |
| Weaver Leggings | 45 | AR96 ES28 | 34/0/34 | — |
| Adherent Leggings | 45 | AR96 ES28 | 34/0/34 | — |
| Bound Leggings | 51 | AR107 ES31 | 38/0/38 | — |
| Gilt Leggings | 52 | AR109 ES31 | 38/0/38 | — |
| Shamanistic Leggings | 59 | AR123 ES34 | 44/0/44 | — |
| Pious Leggings | 65 | AR134 ES37 | 47/0/47 | — |
| Faithful Leggings | 65 | AR134 ES37 | 47/0/47 | — |
| Apostle Leggings | 70 | AR134 ES37 | 51/0/51 | — |
| Warlock Leggings | 75 | AR134 ES37 | 56/0/56 | — |
| Cryptic Leggings | 80 | AR134 ES37 | 59/0/59 | — |

**鞋子・EV/ES（13）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Frayed Shoes | 5 | EV15 ES10 | 0/7/7 | — |
| Threaded Shoes | 16 | EV35 ES15 | 0/14/14 | — |
| Hunting Shoes | 33 | EV65 ES22 | 0/26/26 | — |
| Steelpoint Shoes | 45 | EV86 ES28 | 0/34/34 | — |
| Wayfarer Shoes | 45 | EV86 ES28 | 0/34/34 | — |
| Silverbuckled Shoes | 51 | EV97 ES31 | 0/38/38 | — |
| Velour Shoes | 52 | EV99 ES31 | 0/38/38 | — |
| Treerunner Shoes | 59 | EV111 ES34 | 0/44/44 | — |
| Bladed Shoes | 65 | EV122 ES37 | 0/47/47 | — |
| Wanderer Shoes | 65 | EV122 ES37 | 0/47/47 | — |
| Charmed Shoes | 70 | EV128 ES39 | 0/51/51 | — |
| Quickslip Shoes | 75 | EV134 ES41 | 0/56/56 | — |
| Daggerfoot Shoes | 80 | EV140 ES43 | 0/59/59 | — |

**鞋子・三系 AR/EV/ES（1）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Grand Cuisses | 65 | AR89 EV81 ES25 | 34/34/34 | — |

**鞋子・特殊（無防禦系，金色系）（1）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Golden Caligae† | 12 | — | 0/0/0 | +(8-16)% to all Elemental Resistances |

#### 盾／輕盾（Shield）


**盾／輕盾・護甲 AR（23）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Splintered Tower Shield | 0 | AR18 格擋26% 移速−3% | 0/0/0 | Grants Skill: Raise Shield |
| Painted Tower Shield | 6 | AR33 格擋26% 移速−3% | 11/0/0 | Grants Skill: Raise Shield |
| Braced Tower Shield | 12 | AR50 格擋26% 移速−3% | 19/0/0 | Grants Skill: Raise Shield |
| Barricade Tower Shield | 16 | AR62 格擋26% 移速−3% | 25/0/0 | Grants Skill: Raise Shield |
| Effigial Tower Shield | 21 | AR76 格擋26% 移速−3% | 32/0/0 | Grants Skill: Raise Shield |
| Rampart Tower Shield | 28 | AR96 格擋26% 移速−3% | 42/0/0 | Grants Skill: Raise Shield |
| Heraldric Tower Shield | 33 | AR111 格擋26% 移速−3% | 48/0/0 | Grants Skill: Raise Shield |
| Stone Tower Shield | 36 | AR119 格擋26% 移速−3% | 52/0/0 | Grants Skill: Raise Shield |
| Crucible Tower Shield | 45 | AR145 格擋26% 移速−3% | 64/0/0 | Grants Skill: Raise Shield |
| Aged Tower Shield | 45 | AR145 格擋26% 移速−3% | 64/0/0 | Grants Skill: Raise Shield |
| Metalworked Tower Shield | 48 | AR154 格擋26% 移速−3% | 69/0/0 | Grants Skill: Raise Shield |
| Ancestor Tower Shield | 50 | AR160 格擋26% 移速−3% | 71/0/0 | Grants Skill: Raise Shield |
| Cultist Tower Shield | 51 | AR163 格擋26% 移速−3% | 73/0/0 | Grants Skill: Raise Shield |
| Phalanx Tower Shield | 52 | AR166 格擋26% 移速−3% | 74/0/0 | Grants Skill: Raise Shield |
| Bulwark Tower Shield | 54 | AR171 格擋26% 移速−3% | 77/0/0 | Grants Skill: Raise Shield |
| Defiant Tower Shield | 58 | AR183 格擋26% 移速−3% | 82/0/0 | Grants Skill: Raise Shield |
| Noble Tower Shield | 59 | AR186 格擋26% 移速−3% | 83/0/0 | Grants Skill: Raise Shield |
| Goldworked Tower Shield | 61 | AR192 格擋26% 移速−3% | 86/0/0 | Grants Skill: Raise Shield |
| Blacksteel Tower Shield | 65 | AR203 格擋26% 移速−3% | 91/0/0 | Grants Skill: Raise Shield |
| Royal Tower Shield | 65 | AR203 格擋26% 移速−3% | 91/0/0 | Grants Skill: Raise Shield |
| Fortress Tower Shield | 70 | AR223 格擋26% 移速−3% | 99/0/0 | Grants Skill: Raise Shield |
| Vaal Tower Shield | 75 | AR244 格擋26% 移速−3% | 107/0/0 | Grants Skill: Raise Shield |
| Tawhoan Tower Shield | 80 | AR264 格擋26% 移速−3% | 115/0/0 | Grants Skill: Raise Shield |

**盾／輕盾・閃避 EV（22）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Leather Buckler | 0 | EV10 格擋20% | 0/0/0 | Grants Skill: Parry |
| Wooden Buckler | 5 | EV18 格擋20% | 0/10/0 | Grants Skill: Parry |
| Plated Buckler | 11 | EV31 格擋20% | 0/18/0 | Grants Skill: Parry |
| Iron Buckler | 16 | EV42 格擋20% | 0/25/0 | Grants Skill: Parry |
| Ridged Buckler | 22 | EV55 格擋20% | 0/33/0 | Grants Skill: Parry |
| Spiked Buckler | 26 | EV64 格擋20% | 0/38/0 | Grants Skill: Parry |
| Ringed Buckler | 33 | EV79 格擋20% | 0/48/0 | Grants Skill: Parry |
| Edged Buckler | 39 | EV92 格擋20% | 0/56/0 | Grants Skill: Parry |
| Laminate Buckler | 45 | EV105 格擋20% | 0/64/0 | Grants Skill: Parry |
| Oak Buckler | 45 | EV105 格擋20% | 0/64/0 | Grants Skill: Parry |
| Painted Buckler | 48 | EV111 格擋20% | 0/69/0 | Grants Skill: Parry |
| Pearl Buckler | 50 | EV116 格擋20% | 0/71/0 | Grants Skill: Parry |
| Coiled Buckler | 51 | EV118 格擋20% | 0/73/0 | Grants Skill: Parry |
| Spikeward Buckler | 54 | EV124 格擋20% | 0/77/0 | Grants Skill: Parry |
| Array Buckler | 55 | EV126 格擋20% | 0/78/0 | Grants Skill: Parry |
| Jingling Buckler | 59 | EV135 格擋20% | 0/83/0 | Grants Skill: Parry |
| Bladeguard Buckler | 61 | EV139 格擋20% | 0/86/0 | Grants Skill: Parry |
| Ornate Buckler | 65 | EV148 格擋20% | 0/91/0 | Grants Skill: Parry |
| Aegis Buckler | 65 | EV148 格擋20% | 0/91/0 | Grants Skill: Parry |
| Gutspike Buckler | 70 | EV163 格擋20% | 0/99/0 | Grants Skill: Parry |
| Ancient Buckler | 75 | EV178 格擋20% | 0/107/0 | Grants Skill: Parry |
| Desert Buckler | 80 | EV192 格擋20% | 0/115/0 | Grants Skill: Parry |

**盾／輕盾・AR/EV（21）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Hardwood Targe | 0 | AR10 EV7 格擋25% 移速−1.5% | 0/0/0 | Grants Skill: Raise Shield |
| Pelage Targe | 8 | AR21 EV17 格擋25% 移速−1.5% | 9/9/0 | Grants Skill: Raise Shield |
| Studded Targe | 16 | AR34 EV29 格擋25% 移速−1.5% | 15/15/0 | Grants Skill: Raise Shield |
| Crescent Targe | 26 | AR50 EV44 格擋25% 移速−1.5% | 22/22/0 | Grants Skill: Raise Shield |
| Chiseled Targe | 33 | AR61 EV54 格擋25% 移速−1.5% | 27/27/0 | Grants Skill: Raise Shield |
| Feathered Targe | 37 | AR67 EV60 格擋25% 移速−1.5% | 30/30/0 | Grants Skill: Raise Shield |
| Ironwood Targe | 45 | AR80 EV72 格擋25% 移速−1.5% | 36/36/0 | Grants Skill: Raise Shield |
| Stratified Targe | 46 | AR82 EV74 格擋25% 移速−1.5% | 37/37/0 | Grants Skill: Raise Shield |
| Fur-lined Targe | 48 | AR85 EV76 格擋25% 移速−1.5% | 38/38/0 | Grants Skill: Raise Shield |
| Carved Targe | 51 | AR89 EV81 格擋25% 移速−1.5% | 40/40/0 | Grants Skill: Raise Shield |
| Mercenary Targe | 51 | AR89 EV81 格擋25% 移速−1.5% | 40/40/0 | Grants Skill: Raise Shield |
| Mosaic Targe | 52 | AR91 EV82 格擋25% 移速−1.5% | 41/41/0 | Grants Skill: Raise Shield |
| Polished Targe | 54 | AR94 EV85 格擋25% 移速−1.5% | 42/42/0 | Grants Skill: Raise Shield |
| Aureate Targe | 57 | AR99 EV90 格擋25% 移速−1.5% | 45/45/0 | Grants Skill: Raise Shield |
| Stone Targe | 59 | AR102 EV93 格擋25% 移速−1.5% | 46/46/0 | Grants Skill: Raise Shield |
| Avian Targe | 62 | AR107 EV97 格擋25% 移速−1.5% | 48/48/0 | Grants Skill: Raise Shield |
| Grand Targe | 65 | AR112 EV102 格擋25% 移速−1.5% | 50/50/0 | Grants Skill: Raise Shield |
| Mammoth Targe | 65 | AR112 EV102 格擋25% 移速−1.5% | 50/50/0 | Grants Skill: Raise Shield |
| Baroque Targe | 70 | AR123 EV112 格擋25% 移速−1.5% | 54/54/0 | Grants Skill: Raise Shield |
| Soaring Targe | 75 | AR134 EV122 格擋25% 移速−1.5% | 59/59/0 | Grants Skill: Raise Shield |
| Golden Targe | 80 | AR145 EV132 格擋25% 移速−1.5% | 63/63/0 | Grants Skill: Raise Shield |

**盾／輕盾・AR/ES（21）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Blazon Crest Shield | 0 | AR10 ES6 格擋25% 移速−1.5% | 0/0/0 | Grants Skill: Raise Shield |
| Sigil Crest Shield | 7 | AR20 ES9 格擋25% 移速−1.5% | 8/0/8 | Grants Skill: Raise Shield |
| Emblem Crest Shield | 16 | AR34 ES12 格擋25% 移速−1.5% | 15/0/15 | Grants Skill: Raise Shield |
| Jingling Crest Shield | 28 | AR53 ES17 格擋25% 移速−1.5% | 23/0/23 | Grants Skill: Raise Shield |
| Sectarian Crest Shield | 33 | AR61 ES19 格擋25% 移速−1.5% | 27/0/27 | Grants Skill: Raise Shield |
| Omen Crest Shield | 36 | AR66 ES20 格擋25% 移速−1.5% | 30/0/30 | Grants Skill: Raise Shield |
| Wayward Crest Shield | 45 | AR80 ES23 格擋25% 移速−1.5% | 36/0/36 | Grants Skill: Raise Shield |
| Painted Crest Shield | 45 | AR80 ES23 格擋25% 移速−1.5% | 36/0/36 | Grants Skill: Raise Shield |
| Engraved Crest Shield | 48 | AR85 ES24 格擋25% 移速−1.5% | 38/0/38 | Grants Skill: Raise Shield |
| Seer Crest Shield | 50 | AR88 ES25 格擋25% 移速−1.5% | 39/0/39 | Grants Skill: Raise Shield |
| Descry Crest Shield | 51 | AR89 ES26 格擋25% 移速−1.5% | 40/0/40 | Grants Skill: Raise Shield |
| Stoic Crest Shield | 52 | AR91 ES26 格擋25% 移速−1.5% | 41/0/41 | Grants Skill: Raise Shield |
| Dekharan Crest Shield | 54 | AR94 ES27 格擋25% 移速−1.5% | 42/0/42 | Grants Skill: Raise Shield |
| Empyreal Crest Shield | 57 | AR99 ES28 格擋25% 移速−1.5% | 45/0/45 | Grants Skill: Raise Shield |
| Quartered Crest Shield | 59 | AR102 ES29 格擋25% 移速−1.5% | 46/0/46 | Grants Skill: Raise Shield |
| Glowering Crest Shield | 62 | AR107 ES30 格擋25% 移速−1.5% | 48/0/48 | Grants Skill: Raise Shield |
| Deified Crest Shield | 65 | AR112 ES31 格擋25% 移速−1.5% | 50/0/50 | Grants Skill: Raise Shield |
| Intricate Crest Shield | 65 | AR112 ES31 格擋25% 移速−1.5% | 50/0/50 | Grants Skill: Raise Shield |
| Sekheman Crest Shield | 70 | AR123 ES34 格擋25% 移速−1.5% | 54/0/54 | Grants Skill: Raise Shield |
| Vaal Crest Shield | 75 | AR134 ES37 格擋25% 移速−1.5% | 59/0/59 | Grants Skill: Raise Shield |
| Blacksteel Crest Shield | 80 | AR145 ES40 格擋25% 移速−1.5% | 63/0/63 | Grants Skill: Raise Shield |

**盾／輕盾・特殊（無防禦系，金色系）（1）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Golden Flame† | 15 | 格擋25% | 0/0/0 | +(11-19)% to Chaos Resistance |

#### 法器（Focus）


**法器・ES（法器）（23）**

| 基底 | 等級 | 基底防禦 | 屬性需求 | 固定詞 |
|---|---|---|---|---|
| Twig Focus | 0 | ES12 | 0/0/0 | — |
| Woven Focus | 6 | ES15 | 0/0/11 | — |
| Antler Focus | 10 | ES18 | 0/0/17 | — |
| Engraved Focus | 16 | ES22 | 0/0/25 | — |
| Tonal Focus | 22 | ES26 | 0/0/33 | — |
| Crystal Focus | 26 | ES29 | 0/0/38 | — |
| Voodoo Focus | 33 | ES34 | 0/0/48 | — |
| Plumed Focus | 36 | ES36 | 0/0/52 | — |
| Runed Focus | 45 | ES42 | 0/0/64 | — |
| Wreath Focus | 45 | ES42 | 0/0/64 | — |
| Staghorn Focus | 48 | ES45 | 0/0/69 | — |
| Whorl Focus | 51 | ES47 | 0/0/73 | — |
| Jingling Focus | 51 | ES47 | 0/0/73 | — |
| Elegant Focus | 52 | ES47 | 0/0/74 | — |
| Arrayed Focus | 54 | ES49 | 0/0/77 | — |
| Attuned Focus | 57 | ES51 | 0/0/81 | — |
| Cultist Focus | 59 | ES52 | 0/0/83 | — |
| Hallowed Focus | 61 | ES57 | 0/0/86 | — |
| Magus Focus | 65 | ES56 | 0/0/91 | — |
| Druidic Focus | 65 | ES62 | 0/0/91 | — |
| Leyline Focus | 70 | ES71 | 0/0/99 | — |
| Sacred Focus | 75 | ES81 | 0/0/107 | — |
| Tasalian Focus | 80 | ES91 | 0/0/115 | — |

---

## 3. 固定詞（implicit，本專案叫「固定詞」）

先給整體：**一般基底裡，各類型有固定詞的比例**

| 類別 | 一般基底數 | 有固定詞 | 比例 |
|---|---|---|---|
| 胸甲 | 148 | 33 | 22% |
| 頭盔 | 114 | 2 | 1% |
| 手套 | 88 | 0 | 0% |
| 鞋子 | 89 | 1 | 1% |
| 盾＋輕盾 | 88 | 88 | 100% |
| 法器 | 23 | 0 | 0% |
| 箭袋 | 11 | 11 | 100% |
| 戒指 | 27 | 26 | 96% |
| 護身符（項鍊） | 21 | 21 | 100% |
| 腰帶 | 16 | 16 | 100% |
| 藥劑（生命／魔力） | 18 | 0 | 0% |
| 護符 Charm | 13 | 13 | 100% |
| 珠寶 | 8 | 0 | 0% |
| 弓 | 27 | 9 | 33% |
| 十字弓 | 27 | 13 | 48% |
| 長矛 | 28 | 28 | 100% |
| 單手錘 | 28 | 9 | 32% |
| 雙手錘 | 26 | 14 | 53% |
| 長杖＋細杖（見下） | 41 | 22 | 53% |
| 法杖 | 13 | 13 | 100% |
| 權杖 | 15 | 15 | 100% |
| 魔符 Talisman | 25 | 14 | 56% |
| 單手劍 | 14 | 0 | 0% |
| 雙手劍 | 13 | 0 | 0% |
| 單手斧 | 13 | 4 | 30% |
| 雙手斧 | 13 | 4 | 30% |
| 匕首 | 14 | 3 | 21% |
| 爪 | 13 | 2 | 15% |
| 鏈錘 | 13 | 2 | 15% |
| 陷阱 Trap | 13 | 1 | 7% |

### 3.1 防具

**胸甲：固定詞只出現在 65 級以上的終局基底（每系 5 個，其餘 20 個沒有）**

| 固定詞（數值範圍原文） | 基底數 | 哪些基底（等級） |
|---|---|---|
| 5% increased Movement Speed | 3 | Assassin Garb(73)、Falconer's Jacket(75)、Corsair Coat(80) |
| (30-40)% increased Stun Threshold | 2 | Conqueror Plate(68)、Utzaal Cuirass(75) |
| Regenerate (1.5-2.5)% of maximum Life per second | 2 | Ornate Plate(70)、Abyssal Cuirass(73) |
| (20-30)% reduced Slowing Potency of Debuffs on You | 2 | Swiftstalker Coat(65)、Mail Coat(68) |
| (30-40)% increased Elemental Ailment Threshold | 2 | Armoured Vest(73)、Wyrmscale Coat(75) |
| (40-50)% increased Mana Regeneration Rate | 2 | Enlightened Robe(68)、Flowing Raiment(70) |
| (20-25)% increased Energy Shield Recharge Rate | 2 | Arcane Raiment(73)、Sacramental Robe(75) |
| +(60-80) to maximum Life | 2 | Heroic Armour(65)、Dastard Armour(65) |
| +(20-25)% to Lightning Resistance | 2 | Tournament Mail(68)、Shrouded Mail(70) |
| +1% to all Maximum Elemental Resistances | 2 | Revered Vestments(65)、Death Mantle(75) |
| +(20-30) to Spirit | 2 | Corvus Mantle(68)、Conjurer Mantle(70) |
| +(7-13)% to Chaos Resistance | 2 | Devout Garb(68)、Rambler Jacket(70) |
| +(15-25)% of Armour also applies to Elemental Damage | 1 | Warlord Cuirass(80) |
| (5-10)% of Damage is taken from Mana before Life | 1 | Feathered Raiment(80) |
| Hits against you have (15-25)% reduced Critical Damage Bonus | 1 | Thane Mail(80) |
| (8-14)% of Damage taken Recouped as Life | 1 | Seastorm Mantle(80) |
| (10-15)% reduced Elemental Ailment Duration on you | 1 | Austere Garb(80) |
| +1 to Level of all Corrupted Skill Gems | 1 | Sacrificial Regalia(65) |
| Can roll Ring Modifiers；Catalysts can be applied to this item | 1 | Grasping Mail(65) |
| +(15-25)% to all Elemental Resistances | 1 | Golden Mantle(20) |

**終局胸甲的「主題」分流表（一般基底，PoB 資料；括號＝需求等級）**：每系有 5 個帶固定詞的終局基底，排法固定是「兩個主題各 2 個＋1 個 80 級獨有」，另外 65 級有 2 個無固定詞（其中一個是高防禦變體，例：Soldier Cuirass AR570 對 496）、73 級偶有 1 個無固定詞。

| 系 | 主題 A（×2） | 主題 B（×2） | 80 級獨有（×1） |
|---|---|---|---|
| AR | 暈眩門檻 +30–40%（68、75） | 每秒回復 1.5–2.5% 最大生命（70、73） | 護甲 +15–25% 也算元素傷害 |
| EV | 減緩效果 −20–30%（65、68） | 元素異常門檻 +30–40%（73、75） | 移動速度 +5% |
| ES | 魔力回復 +40–50%（68、70） | 護盾充能速度 +20–25%（73、75） | 5–10% 傷害由魔力先扣 |
| AR/EV | 最大生命 +60–80（65、65） | 閃電抗性 +20–25%（68、70） | 被擊中時暴擊傷害 −15–25% |
| AR/ES | 全元素最大抗性 +1%（65、75） | 精魂 +20–30（68、70） | 受傷 8–14% 回復為生命 |
| EV/ES | 混沌抗性 +7–13%（68、70） | 移動速度 +5%（73、75） | 元素異常持續時間 −10–15% |
| 三系 | 只有 Sacrificial Regalia、Grasping Mail 兩個怪品 | | |


胸甲終局基底的結構（以 AR 系為例）：65 級的 `Glorious Plate`／`Soldier Cuirass` 沒有固定詞，**68 級以後同一防禦值（496）的基底分叉成 5 個「主題」**：暈眩門檻 +30–40%、每秒回復 1.5–2.5% 生命、護甲同時算進元素傷害 +15–25% 等。也就是：**等級越高，防禦數字不再成長，改成靠固定詞分流**。


**頭盔：有固定詞的基底**

| 固定詞（數值範圍原文） | 基底數 | 哪些基底（等級） |
|---|---|---|
| +(16-24) to all Attributes | 1 | Golden Wreath(12) |
| +(8-16)% to all Elemental Resistances | 1 | Golden Visage(12) |

**手套：有固定詞的基底**：無。


**鞋子：有固定詞的基底**

| 固定詞（數值範圍原文） | 基底數 | 哪些基底（等級） |
|---|---|---|
| +(8-16)% to all Elemental Resistances | 1 | Golden Caligae(12) |

頭手鞋基本**不給固定詞**：只有金色系特殊基底（Golden Visage 等，`not_for_sale`，無防禦、只給固定詞）。


**盾／輕盾：全部基底都有固定詞（盾＝舉盾 Raise Shield；輕盾＝招架 Parry；其餘為格擋率）**

| 固定詞（數值範圍原文） | 基底數 | 哪些基底（等級） |
|---|---|---|
| Grants Skill: Raise Shield | 65 | Splintered Tower Shield(0)、Hardwood Targe(0)、Blazon Crest Shield(0)、Painted Tower Shield(6)… |
| Grants Skill: Parry | 22 | Leather Buckler(0)、Wooden Buckler(5)、Plated Buckler(11)、Iron Buckler(16)… |
| +(11-19)% to Chaos Resistance | 1 | Golden Flame(15) |

**法器 Focus：沒有固定詞（只給 ES）**：無。


### 3.2 飾品（腰帶／戒指／護身符／箭袋／護符）

**腰帶：全部帶「護符欄位 Charm Slot」（數量隨基底 1–3）＋一條副詞**

| 固定詞（數值範圍原文） | 基底數 | 哪些基底（等級） |
|---|---|---|
| (20-30)% increased Rarity of Items found；Has (1-3) Charm Slot | 1 | Golden Obi(0) |
| (20-30)% increased Life Recovery from Flasks；Has (1-3) Charm Slot | 1 | Rawhide Belt(0) |
| (20-30)% increased Mana Recovery from Flasks；Has (1-3) Charm Slot | 1 | Linen Belt(0) |
| Has (1-3) Charm Slot；(20-30)% increased Flask Charges gained | 1 | Wide Belt(14) |
| (15-20)% increased Charm Effect Duration；Has (1-3) Charm Slot | 1 | Long Belt(20) |
| +(140-180) to Armour；Has (1-3) Charm Slot | 1 | Plate Belt(24) |
| Has (1-3) Charm Slot；(10-15)% reduced Charm Charges used | 1 | Ornate Belt(31) |
| (10-15)% reduced Flask Charges used；Has (1-3) Charm Slot | 1 | Mail Belt(40) |
| Has (1-3) Charm Slot；(20-30)% increased Charm Charges gained | 1 | Double Belt(44) |
| (20-30)% increased Stun Threshold；Has (1-3) Charm Slot | 1 | Heavy Belt(50) |
| Has (1-3) Charm Slot；20% of Flask Recovery applied Instantly | 1 | Utility Belt(55) |
| Has (1-3) Charm Slot；Flasks gain 0.17 charges per Second | 1 | Fine Belt(62) |
| Has 1 Charm Slot；This item gains bonuses from Socketed Items as though it was Boots | 1 | Stalking Belt(40) |
| (8-12)% increased Cast Speed；Has 1 Charm Slot | 1 | Invoking Belt(32) |
| +(15-20) to Strength；Has 1 Charm Slot | 1 | Sinew Belt(32) |
| Adds 1 to (20-30) Lightning damage to Attacks；Has 1 Charm Slot | 1 | Forking Belt(32) |

**戒指**

| 固定詞（數值範圍原文） | 基底數 | 哪些基底（等級） |
|---|---|---|
| Adds 1 to 4 Physical Damage to Attacks | 2 | Iron Ring(0)、Kinetic Ring(40) |
| +20% to Maximum Quality | 2 | Breach Ring(40)、Refined Breach Ring(40) |
| +(8-12) to all Attributes | 1 | Golden Hoop(12) |
| +(20-30) to maximum Mana | 1 | Lazuli Ring(0) |
| +(20-30)% to Fire Resistance | 1 | Ruby Ring(8) |
| +(20-30)% to Cold Resistance | 1 | Sapphire Ring(12) |
| +(20-30)% to Lightning Resistance | 1 | Topaz Ring(16) |
| +(7-13)% to Chaos Resistance | 1 | Amethyst Ring(20) |
| +(120-160) to Accuracy Rating | 1 | Emerald Ring(26) |
| (7-10)% increased Cast Speed | 1 | Pearl Ring(32) |
| +(7-10)% to all Elemental Resistances | 1 | Prismatic Ring(35) |
| (6-15)% increased Rarity of Items found | 1 | Gold Ring(40) |
| Grants 1 additional Skill Slot | 1 | Unset Ring(44) |
| Inflict Abyssal Wasting on Hit | 1 | Abyssal Signet(0) |
| +(12-16)% to Cold and Lightning Resistances | 1 | Two-Stone Ring(0) |
| +1% to all maximum Resistances | 1 | Biostatic Ring(52) |
| (4-6)% increased maximum Life | 1 | Vitalic Ring(40) |
| (4-6)% increased maximum Mana | 1 | Mnemonic Ring(40) |
| (11-23)% increased Chaos Damage | 1 | Oneiric Ring(47) |
| This item gains bonuses from Socketed Items as though it was Gloves | 1 | Grasping Ring(40) |
| +1 Prefix Modifier allowed；-1 Suffix Modifier allowed | 1 | Dusk Ring(0) |
| -1 Prefix Modifier allowed；+1 Suffix Modifier allowed | 1 | Gloam Ring(0) |
| +2 Prefix Modifiers allowed；-2 Suffix Modifiers allowed | 1 | Penumbra Ring(0) |
| -2 Prefix Modifiers allowed；+2 Suffix Modifiers allowed | 1 | Tenebrous Ring(0) |

**護身符（項鍊）**

| 固定詞（數值範圍原文） | 基底數 | 哪些基底（等級） |
|---|---|---|
| (2-4) Life Regeneration per second | 1 | Crimson Amulet(0) |
| (20-30)% increased Mana Regeneration Rate | 1 | Azure Amulet(0) |
| +(10-15) to Strength | 1 | Amber Amulet(8) |
| +(10-15) to Dexterity | 1 | Jade Amulet(8) |
| +(10-15) to Intelligence | 1 | Lapis Amulet(8) |
| +(20-30) to maximum Energy Shield | 1 | Lunar Amulet(14) |
| +(30-40) to maximum Life | 1 | Bloodstone Amulet(18) |
| +(5-7) to all Attributes | 1 | Stellar Amulet(24) |
| +(10-15) to Spirit | 1 | Solar Amulet(30) |
| (12-20)% increased Rarity of Items found | 1 | Gold Amulet(35) |
| +(7-10)% to all Elemental Resistances | 1 | Pearlescent Amulet(30) |
| -1 Prefix Modifier allowed；{variant:1}Grants Skill: Level (1-20) Arctic Armour；{variant:2}Grants Skill: Level (1-20) Herald of Ash；{variant:3}Grants Skill: Level (1-20) Herald of Ice；{variant:4}Grants Skill: Level (1-20) Herald of Thunder；{variant:5}Grants Skill: Level (1-20) Plague Bearer；{variant:6}Grants Skill: Level (1-20) Barrier Invocation；{variant:7}Grants Skill: Level (1-20) Lingering Illusion；{variant:8}Grants Skill: Level (1-20) Ghost Dance；{variant:9}Grants Skill: Level (1-20) Mana Remnants；{variant:10}Grants Skill: Level (1-20) Magma Barrier；{variant:11}Grants Skill: Level (1-20) Raging Spirits；{variant:12}Grants Skill: Level (1-20) Wind Dancer；{variant:13}Grants Skill: Level (1-20) Cast on Minion Death；{variant:14}Grants Skill: Level (1-20) Scavenged Plating；{variant:15}Grants Skill: Level (1-20) War Banner；{variant:16}Grants Skill: Level (1-20) Defiance Banner；{variant:17}Grants Skill: Level (1-20) Dread Banner；{variant:18}Grants Skill: Level (1-20) Time of Need；{variant:19}Grants Skill: Level (1-20) Attrition；{variant:20}Grants Skill: Level (1-20) Charge Regulation；{variant:21}Grants Skill: Level (1-20) Shard Scavenger；{variant:22}Grants Skill: Level (1-20) Overwhelming Presence；{variant:23}Grants Skill: Level (1-20) Alchemist's Boon；{variant:24}Grants Skill: Level (1-20) Reaper's Invocation；{variant:25}Grants Skill: Level (1-20) Berserk；{variant:26}Grants Skill: Level (1-20) Herald of Plague；{variant:27}Grants Skill: Level (1-20) Herald of Blood；{variant:28}Grants Skill: Level (1-20) Withering Presence；{variant:29}Grants Skill: Level (1-20) Ravenous Swarm；{variant:30}Grants Skill: Level (1-20) Combat Frenzy；{variant:31}Grants Skill: Level (1-20) Trail of Caltrops；{variant:32}Grants Skill: Level (1-20) Convalescence；{variant:33}Grants Skill: Level (1-20) Iron Ward；{variant:34}Grants Skill: Level (1-20) Siphon Elements；{variant:35}Grants Skill: Level (1-20) Briarpatch；{variant:36}Grants Skill: Level (1-20) Savage Fury；{variant:37}Grants Skill: Level (1-20) Barkskin | 1 | Lament Amulet(42) |
| -1 Suffix Modifier allowed；{variant:1}Grants Skill: Level (1-20) Wolf Pack；{variant:2}Grants Skill: Level (1-20) Blink；{variant:3}Grants Skill: Level (1-20) Elemental Invocation；{variant:4}Grants Skill: Level (1-20) Elemental Conflux；{variant:5}Grants Skill: Level (1-20) Sacrifice；{variant:6}Grants Skill: Level (1-20) Mirage Archer；{variant:7}Grants Skill: Level (1-20) Feral Invocation | 1 | Portent Amulet(42) |
| -1 Prefix Modifier allowed；-1 Suffix Modifier allowed；{variant:1}Grants Skill: Level (1-20) Cast on Elemental Ailment；{variant:2}Grants Skill: Level (1-20) Cast on Critical；{variant:3}Grants Skill: Level (1-20) Cast on Dodge；{variant:4}Grants Skill: Level (1-20) Rhoa Mount；{variant:5}Grants Skill: Level (1-20) Archmage；{variant:6}Grants Skill: Level (1-20) Trinity；{variant:7}Grants Skill: Level (1-20) Eternal Rage | 1 | Absent Amulet(50) |
| This item gains bonuses from Socketed Items as though it was a Helmet | 1 | Corona Amulet(40) |
| +1 Prefix Modifier allowed；-1 Suffix Modifier allowed | 1 | Dusk Amulet(0) |
| -1 Prefix Modifier allowed；+1 Suffix Modifier allowed | 1 | Gloam Amulet(0) |
| +2 Prefix Modifiers allowed；-2 Suffix Modifiers allowed | 1 | Penumbra Amulet(0) |
| -2 Prefix Modifiers allowed；+2 Suffix Modifiers allowed | 1 | Tenebrous Amulet(0) |
| -1 Prefix Modifier allowed | 1 | Twisted Amulet(0) |
| -1 Suffix Modifier allowed | 1 | Distorted Amulet(0) |

**箭袋**

| 固定詞（數值範圍原文） | 基底數 | 哪些基底（等級） |
|---|---|---|
| Adds 1 to 3 Physical Damage to Attacks | 1 | Broadhead Quiver(0) |
| Adds 3 to 5 Fire damage to Attacks | 1 | Fire Quiver(8) |
| Gain (2-3) Life per Enemy Hit with Attacks | 1 | Sacral Quiver(16) |
| (20-30)% increased Accuracy Rating | 1 | Two-Point Quiver(24) |
| (25-40)% increased Stun Buildup | 1 | Blunt Quiver(32) |
| (20-30)% chance to Poison on Hit with Attacks | 1 | Toxic Quiver(39) |
| Attacks have (20-30)% chance to cause Bleeding | 1 | Serrated Quiver(44) |
| (7-10)% increased Attack Speed | 1 | Primed Quiver(51) |
| 100% chance to Pierce an Enemy | 1 | Penetrating Quiver(55) |
| (20-30)% increased Arrow Speed | 1 | Volant Quiver(60) |
| (20-30)% increased Critical Hit Chance for Attacks | 1 | Visceral Quiver(64) |

**護符 Charm（一個基底＝一種自動觸發條件）**

| 固定詞（數值範圍原文） | 基底數 | 哪些基底（等級） |
|---|---|---|
| Used when you become Frozen | 1 | Thawing Charm(12) |
| Used when you start Bleeding | 1 | Staunching Charm(18) |
| Used when you become Poisoned | 1 | Antidote Charm(24) |
| Used when you become Ignited | 1 | Dousing Charm(32) |
| Used when you become Shocked | 1 | Grounding Charm(32) |
| Used when you become Stunned | 1 | Stone Charm(8) |
| Used when you are affected by a Slow | 1 | Silver Charm(10) |
| Used when you take Fire damage from a Hit | 1 | Ruby Charm(5) |
| Used when you take Cold damage from a Hit | 1 | Sapphire Charm(5) |
| Used when you take Lightning damage from a Hit | 1 | Topaz Charm(5) |
| Used when you take Chaos damage from a Hit | 1 | Amethyst Charm(40) |
| Used when you kill a Rare or Unique enemy | 1 | Golden Charm(50) |
| Used when you become Cursed | 1 | Cleansing Charm(40) |

### 3.3 武器的固定詞分布（一般基底，各類歸納；數值範圍見原文）
| 武器類別 | 基底數 | 有固定詞 | 固定詞種類數 | 常見內容（括號＝基底數） |
|---|---|---|---|---|
| 單手劍 | 14 | 0 | 0 | — |
| 雙手劍 | 13 | 0 | 0 | — |
| 單手斧 | 13 | 4 | 4 | Grants 1 Rage on Hit(1)；Has no Accuracy Penalty from Range(1)；Gain (28-35) Mana per enemy killed(1) |
| 雙手斧 | 13 | 4 | 4 | Culling Strike(1)；Gain (34-43) Life per enemy killed(1)；(15-25)% chance to cause Bleeding on Hit(1) |
| 單手錘 | 28 | 9 | 4 | +(5-10)% to Critical Damage Bonus(3)；40% chance to Daze on Hit(3)；Always Hits(2) |
| 雙手錘 | 26 | 14 | 5 | Causes (20-40)% increased Stun Buildup(3)；Crushes Enemies on Hit(3)；Strikes deal Splash Damage(3) |
| 匕首 | 14 | 3 | 3 | Leeches 4% of Physical Damage as Mana(1)；25% of Spell Mana Cost Converted to Life C(1)；Breaks (400-500) Armour on Critical Hit(1) |
| 爪 | 13 | 2 | 2 | Grants 8 Life per Enemy Hit(1)；(15-25)% chance to Blind Enemies on hit(1) |
| 鏈錘 | 13 | 2 | 2 | Bifurcates Critical Hits(1)；Unblockable(1) |
| 陷阱 Trap | 13 | 1 | 1 | (20-30)% increased Cooldown Recovery Rate (1) |
| 弓 | 27 | 9 | 3 | (25-35)% chance to Chain an additional tim(4)；+50% Surpassing chance to fire an addition(3)；50% reduced Projectile Range(2) |
| 十字弓 | 27 | 13 | 6 | (20-30)% increased Bolt Speed(3)；Loads an additional bolt(3)；Grenade Skills Fire an additional Projecti(3) |
| 長矛 | 28 | 28 | 6 | Grants Skill: Spear Throw(14)；Grants Skill: Spear Throw(3)；Grants Skill: Spear Throw(3) |
| 細杖 | 27 | 8 | 3 | 16% increased Melee Strike Range with this(3)；+(12-18)% to Block chance(3)；(20-50)% chance to Daze on Hit(2) |
| 長杖 | 14 | 14 | 12 | Grants Skill: Level (1-20) Firebolt(3)；Grants Skill: Level (1-20) Freezing Shards(1)；Grants Skill: Level (1-20) Lightning Bolt(1) |
| 法杖 | 13 | 13 | 10 | Grants Skill: Level (1-20) Chaos Bolt(4)；Grants Skill: Level (1-20) Bone Blast(1)；Grants Skill: Level (1-20) Mana Drain(1) |
| 權杖 | 15 | 15 | 8 | Grants Skill: Level (1-20) Skeletal Warrio(8)；Grants Skill: Level (1-20) Discipline(1)；Grants Skill: Level (1-20) Malice(1) |
| 魔符 Talisman | 25 | 14 | 6 | +(7-10) to Maximum Rage(4)；+(14-18)% to Block chance(3)；(50-80)% increased Flammability Magnitude(2) |

---

## 4. 基底升級結構（沒有 Normal／Advanced／Expert；是「等級階梯＋並排」）

**結論先講**：PoE2 沒有同名基底的分層，而是**每個等級段給一個新名字的基底**；越到高等級，越不靠基底數字，改靠固定詞與並排的選擇。結構可分四段（以胸甲 AR 系為例，其他系與部位幾乎同形）：

| 段 | 等級 | 性質 |
|---|---|---|
| 起手 | 0 | 2 個，防禦極低（Rusted Cuirass AR45、Fur Plate AR66），沒需求 |
| 成長 | 11～62 | 約每 4～7 級一個新名字；防禦值幾乎線性成長；同一等級常有兩個名字並排（分屬不同文化 tag：`ezomyte`／`maraketh`／`vaal`／`karui`，數值相近、外觀不同） |
| 終局開口 | 65 | 防禦值到頂（AR496；另有一個高值變體 Soldier Cuirass AR570）；開始出現三系基底 |
| 終局分流 | 68～80 | **防禦值不再成長（同為 496）**，只多了固定詞（每系 5 個帶固定詞：兩個主題各 2 個＋80 級獨有 1 個） |

### 4.1 成長曲線（胸甲 AR 系，僅一般基底）

| 基底 | 等級 | AR | 力需求 | 每級 AR 增量（相對上一個） |
|---|---|---|---|---|
| Rusted Cuirass | 0 | 45 | 0 |  |
| Fur Plate | 0 | 66 | 10 |  |
| Iron Cuirass | 11 | 115 | 21 | 4.5 |
| Raider Plate | 16 | 150 | 28 | 7.0 |
| Maraketh Cuirass | 20 | 178 | 34 | 7.0 |
| Steel Plate | 27 | 228 | 45 | 7.1 |
| Full Plate | 33 | 270 | 54 | 7.0 |
| Vaal Cuirass | 37 | 298 | 60 | 7.0 |
| Juggernaut Plate | 45 | 355 | 72 | 7.1 |
| Barbarian Plate | 45 | 355 | 72 |  |
| Rugged Cuirass | 48 | 376 | 77 | 7.0 |
| Chieftain Cuirass | 50 | 390 | 80 | 7.0 |
| Sandsworn Cuirass | 51 | 397 | 82 | 7.0 |
| Colosseum Plate | 52 | 404 | 83 | 7.0 |
| Elegant Plate | 54 | 418 | 86 | 7.0 |
| Champion Cuirass | 58 | 446 | 92 | 7.0 |
| Heavy Plate | 59 | 453 | 94 | 7.0 |
| Stone Cuirass | 62 | 474 | 98 | 7.0 |
| Glorious Plate | 65 | 496 | 121 | 7.3 |
| Soldier Cuirass | 65 | 570 | 121 |  |
| Conqueror Plate | 68 | 496 | 121 |  |
| Ornate Plate | 70 | 496 | 121 |  |
| Abyssal Cuirass | 73 | 496 | 121 |  |
| Utzaal Cuirass | 75 | 496 | 121 |  |
| Warlord Cuirass | 80 | 496 | 121 |  |

**數值差**：Lv11 AR115 → Lv65 AR496，約每級 +7；每升一個名字（約 +4～6 級）加 30～45 點，約 +10～20%。屬性需求大約是防禦的 1/5（AR115 要 21 力；AR496 要 121 力，65 級以後需求跳升較快）。

### 4.2 其他部位的等級階梯與同級並排數

| 部位・系 | 基底數 | 不同等級數 | 同級並排數（基底數−不同等級數） | 等級間隔（中位數） |
|---|---|---|---|---|
| 胸甲 護甲 AR | 25 | 22 | 3 | 3 |
| 胸甲 閃避 EV | 25 | 21 | 4 | 3 |
| 胸甲 能量護盾 ES | 25 | 23 | 2 | 3 |
| 頭盔 護甲 AR | 20 | 17 | 3 | 5 |
| 頭盔 閃避 EV | 20 | 18 | 2 | 5 |
| 頭盔 能量護盾 ES | 20 | 18 | 2 | 5 |
| 手套 護甲 AR | 16 | 14 | 2 | 5 |
| 手套 閃避 EV | 16 | 14 | 2 | 5 |
| 手套 能量護盾 ES | 16 | 14 | 2 | 5 |
| 鞋子 護甲 AR | 16 | 14 | 2 | 5 |
| 鞋子 閃避 EV | 16 | 14 | 2 | 5 |
| 鞋子 能量護盾 ES | 16 | 14 | 2 | 5 |
| 盾／輕盾 護甲 AR | 23 | 21 | 2 | 4 |
| 盾／輕盾 閃避 EV | 22 | 20 | 2 | 5 |

### 4.3 符文鍛造（0.5 聯盟）是唯一一種「同名升級」

`Runeforged X` 是 `X` 的升級版，**同樣的需求等級**，防禦裡多一項 **Runic Ward**（符文結界，新防禦，獨立於生命與 ES）；65 級以上的版本會**拿掉部分原防禦換 Ward**（例：Runeforged Colosseum Plate 只剩 Ward 356）。`Runemastered X` 是更高一層（隱藏基底，需求等級 38～55，用於把低階暗金升級，0.5.0 說明）。這是目前資料裡**唯一的「同名多層」結構**，但它是聯盟機制，不是常駐的基底分層。⚠️ 1.0 是否保留未知。

**防具三層對照（胸甲 AR 系）**

| 基底 | 等級 | 一般（AR） | Runeforged（AR＋Ward） |
|---|---|---|---|
| Iron Cuirass | 11 | AR115 | AR115 Ward43 移速−5% |
| Steel Plate | 27 | AR228 | AR228 Ward64 移速−5% |
| Juggernaut Plate | 45 | AR355 | AR355 Ward76 移速−5% |
| Glorious Plate | 65 | AR496 | Ward430 移速−5% |
| Conqueror Plate | 68 | AR496 | AR595 移速−5% |
| Warlord Cuirass | 80 | AR496 | AR466 Ward86 移速−5% |

---

## 5. 武器補充（舊盤點沒列的類別與整體分布）

等級＝需求等級；「≥65」＝終局層個數。攻速、暴擊是基底範圍。

| 類別 | 一般數 | 等級範圍 | ≥65 級個數 | 攻速 | 暴擊 | 物傷 最低階→最高階 | 有固定詞 |
|---|---|---|---|---|---|---|---|
| 單手劍 | 14 | 0～65 | 1 | 1.5–1.65 | 5–5% | 8→54 | 0 |
| 雙手劍 | 13 | 0～65 | 1 | 1.25–1.35 | 5–5% | 12→96 | 0 |
| 單手斧 | 13 | 0～65 | 1 | 1.4–1.55 | 5–6.5% | 7→56 | 4 |
| 雙手斧 | 13 | 0～65 | 1 | 1.15–1.25 | 5–6.5% | 14→107 | 4 |
| 匕首 | 14 | 0～65 | 1 | 1.5–1.65 | 6–15% | 8→42 | 3 |
| 爪 | 13 | 0～65 | 1 | 1.55–1.7 | 5–5% | 7→51 | 2 |
| 鏈錘 | 13 | 0～65 | 1 | 1.4–1.5 | 8–12.5% | 8→51 | 2 |
| 陷阱 | 13 | 0～0 | 0 | 不能攻擊 | 不能攻擊 | 不能攻擊 | 1 |
| 單手錘 | 28 | 0～79 | 9 | 1.4–1.55 | 5–7% | 8→66 | 9 |
| 雙手錘 | 26 | 0～79 | 8 | 1–1.2 | 5–8% | 16→116 | 14 |
| 細杖 | 27 | 0～79 | 9 | 1.3–1.5 | 0–12% | 10→78 | 8 |
| 長杖 | 14 | 0～65 | 2 | 不能攻擊 | 不能攻擊 | 不能攻擊 | 14 |
| 法杖 | 13 | 0～65 | 1 | 不能攻擊 | 不能攻擊 | 不能攻擊 | 13 |
| 權杖 | 15 | 0～65 | 1 | 不能攻擊 | 不能攻擊 | 不能攻擊 | 15 |
| 魔符 | 25 | 0～79 | 11 | 1.1–1.45 | 5–11% | 12→88 | 14 |
| 弓 | 27 | 0～79 | 8 | 1.1–1.25 | 5–6.5% | 8→63 | 9 |
| 十字弓 | 27 | 0～79 | 9 | 1.4–1.7 | 5–7% | 10→72 | 13 |
| 長矛 | 28 | 0～79 | 10 | 1.4–1.7 | 5–7% | 7→70 | 28 |

（物傷＝平均值，最低階與最高階各一個，用來看成長倍率；法系武器不能攻擊，傷害由技能決定。）

### 5.1 還沒在舊盤點出現的類別：基底列表


**單手劍（14）**

| 基底 | 等級 | 物傷 | 攻速 | 暴擊 | 力/敏/智 | 固定詞 |
|---|---|---|---|---|---|---|
| Golden Blade | 0 | 6–9 | 1.55 | 5.0 | 0/0/0 | — |
| Shortsword | 0 | 6–9 | 1.55 | 5.0 | 0/0/0 | — |
| Broadsword | 6 | 8–13 | 1.6 | 5.0 | 9/9/0 | — |
| Vampiric Blade | 11 | 11–20 | 1.5 | 5.0 | 14/14/0 | — |
| Scimitar | 16 | 14–23 | 1.55 | 5.0 | 19/19/0 | — |
| Charred Shortsword | 21 | 19–34 | 1.6 | 5.0 | 23/23/0 | — |
| Sickle Sword | 28 | 18–38 | 1.5 | 5.0 | 29/29/0 | — |
| Falchion | 33 | 27–37 | 1.5 | 5.0 | 34/34/0 | — |
| Treasured Blade | 40 | 27–45 | 1.55 | 5.0 | 40/40/0 | — |
| Cutlass | 45 | 33–49 | 1.5 | 5.0 | 45/45/0 | — |
| Runic Shortsword | 50 | 26–55 | 1.65 | 5.0 | 49/49/0 | — |
| Messer | 52 | 30–56 | 1.6 | 5.0 | 51/51/0 | — |
| Commander Sword | 54 | 36–60 | 1.5 | 5.0 | 53/53/0 | — |
| Dark Blade | 65 | 43–65 | 1.55 | 5.0 | 63/63/0 | — |

**雙手劍（13）**

| 基底 | 等級 | 物傷 | 攻速 | 暴擊 | 力/敏/智 | 固定詞 |
|---|---|---|---|---|---|---|
| Corroded Longsword | 0 | 9–16 | 1.3 | 5.0 | 0/0/0 | — |
| Iron Greatsword | 6 | 13–23 | 1.35 | 5.0 | 9/9/0 | — |
| Blessed Claymore | 11 | 19–32 | 1.3 | 5.0 | 14/14/0 | — |
| Broad Greatsword | 16 | 25–42 | 1.25 | 5.0 | 19/19/0 | — |
| Rippled Greatsword | 22 | 28–52 | 1.3 | 5.0 | 24/24/0 | — |
| Arced Longsword | 28 | 31–58 | 1.35 | 5.0 | 29/29/0 | — |
| Stone Greatsword | 33 | 40–67 | 1.3 | 5.0 | 34/34/0 | — |
| Obsidian Greatsword | 36 | 49–73 | 1.25 | 5.0 | 37/37/0 | — |
| Keen Greatsword | 45 | 45–94 | 1.3 | 5.0 | 45/45/0 | — |
| Ancient Greatblade | 49 | 55–103 | 1.25 | 5.0 | 49/49/0 | — |
| Flanged Greatblade | 52 | 51–106 | 1.3 | 5.0 | 51/51/0 | — |
| Regalia Longsword | 54 | 61–92 | 1.35 | 5.0 | 53/53/0 | — |
| Ultra Greatsword | 65 | 72–119 | 1.3 | 5.0 | 63/63/0 | — |

**單手斧（13）**

| 基底 | 等級 | 物傷 | 攻速 | 暴擊 | 力/敏/智 | 固定詞 |
|---|---|---|---|---|---|---|
| Dull Hatchet | 0 | 4–10 | 1.5 | 5.0 | 0/0/0 | — |
| Hook Axe | 0 | 5–14 | 1.45 | 5.0 | 9/0/0 | Grants 1 Rage on Hit |
| Bearded Axe | 10 | 8–21 | 1.45 | 5.0 | 17/9/0 | — |
| Extended Cleaver | 16 | 8–25 | 1.5 | 5.0 | 25/12/0 | Has no Accuracy Penalty from Range |
| Bandit Hatchet | 20 | 13–31 | 1.5 | 5.0 | 30/14/0 | — |
| Crescent Axe | 26 | 18–37 | 1.4 | 6.5 | 38/17/0 | — |
| Carving Hatchet | 33 | 19–44 | 1.5 | 5.0 | 47/20/0 | — |
| Sacrificial Axe | 37 | 20–42 | 1.5 | 5.0 | 52/22/0 | Gain (28-35) Mana per enemy killed |
| Boarding Hatchet | 45 | 24–55 | 1.55 | 5.0 | 63/26/0 | — |
| Fury Cleaver | 48 | 30–62 | 1.55 | 5.0 | 67/27/0 | 10% increased Damage taken |
| Battle Axe | 52 | 28–65 | 1.5 | 5.0 | 72/29/0 | — |
| Profane Cleaver | 54 | 26–69 | 1.5 | 5.0 | 75/30/0 | — |
| Dread Hatchet | 65 | 34–79 | 1.5 | 5.0 | 89/36/0 | — |

**雙手斧（13）**

| 基底 | 等級 | 物傷 | 攻速 | 暴擊 | 力/敏/智 | 固定詞 |
|---|---|---|---|---|---|---|
| Splitting Greataxe | 0 | 8–20 | 1.2 | 5.0 | 0/0/0 | — |
| Light Halberd | 0 | 10–25 | 1.25 | 5.0 | 9/0/0 | — |
| Executioner Greataxe | 10 | 10–41 | 1.2 | 5.0 | 17/9/0 | Culling Strike |
| Arched Greataxe | 16 | 17–59 | 1.15 | 5.0 | 25/12/0 | — |
| Elegant Glaive | 20 | 19–64 | 1.2 | 5.0 | 30/14/0 | — |
| Savage Greataxe | 27 | 23–70 | 1.2 | 5.0 | 39/17/0 | Gain (34-43) Life per enemy killed |
| Rending Halberd | 33 | 27–91 | 1.2 | 6.5 | 47/20/0 | — |
| Jagged Greataxe | 40 | 43–99 | 1.15 | 5.0 | 56/23/0 | (15-25)% chance to cause Bleeding on Hit |
| Reaver Glaive | 45 | 43–113 | 1.2 | 5.0 | 63/26/0 | — |
| Ember Greataxe | 50 | —＋Fire58–154 | 1.2 | 5.0 | 70/28/0 | — |
| Ceremonial Halberd | 52 | 53–123 | 1.2 | 5.0 | 72/29/0 | Cannot use Projectile Attacks |
| Monument Greataxe | 57 | 48–143 | 1.2 | 5.0 | 79/32/0 | — |
| Vile Greataxe | 65 | 59–155 | 1.2 | 5.0 | 89/36/0 | — |

**匕首（14）**

| 基底 | 等級 | 物傷 | 攻速 | 暴擊 | 力/敏/智 | 固定詞 |
|---|---|---|---|---|---|---|
| Ethereal Blade | 0 | 5–10 | 1.5 | 6.0 | 0/0/0 | — |
| Glass Shank | 0 | 3–10 | 1.55 | 15.0 | 0/0/0 | — |
| Crone Knife | 6 | 4–15 | 1.55 | 15.0 | 0/9/9 | Leeches 4% of Physical Damage as Mana |
| Simple Dagger | 12 | 8–19 | 1.55 | 15.0 | 0/15/15 | — |
| Skinning Knife | 16 | 8–22 | 1.65 | 13.5 | 0/19/19 | — |
| Moon Dagger | 20 | —＋Cold11–26 | 1.55 | 15.0 | 0/22/22 | — |
| Engraved Knife | 27 | 11–34 | 1.55 | 13.5 | 0/29/29 | — |
| Obsidian Dagger | 33 | 13–39 | 1.55 | 15.0 | 0/34/34 | — |
| Bloodletting Dagger | 39 | 18–42 | 1.5 | 15.0 | 0/39/39 | 25% of Spell Mana Cost Converted to Life Cost |
| Mail Breaker | 45 | 19–44 | 1.5 | 15.0 | 0/45/45 | Breaks (400-500) Armour on Critical Hit |
| Kris Knife | 49 | 16–48 | 1.65 | 15.0 | 0/49/49 | — |
| Parrying Dagger | 52 | 16–55 | 1.55 | 15.0 | 0/51/51 | — |
| Arcane Dirk | 56 | 22–52 | 1.55 | 15.0 | 0/55/55 | — |
| Cinquedea | 65 | 21–62 | 1.55 | 15.0 | 0/63/63 | — |

**爪（13）**

| 基底 | 等級 | 物傷 | 攻速 | 暴擊 | 力/敏/智 | 固定詞 |
|---|---|---|---|---|---|---|
| Crude Claw | 0 | 4–10 | 1.65 | 5.0 | 0/0/0 | — |
| Pict Claw | 6 | 4–16 | 1.7 | 5.0 | 0/14/0 | — |
| Wolfbone Claw | 12 | 7–23 | 1.6 | 5.0 | 0/24/0 | Grants 8 Life per Enemy Hit |
| Forked Claw | 16 | 10–26 | 1.55 | 5.0 | 0/31/0 | — |
| Plated Claw | 22 | 13–31 | 1.6 | 5.0 | 0/41/0 | — |
| Edged Claw | 28 | 11–38 | 1.7 | 5.0 | 0/52/0 | (15-25)% chance to Blind Enemies on hit |
| Arced Claw | 33 | 12–46 | 1.65 | 5.0 | 0/60/0 | — |
| Hooked Claw | 36 | 16–49 | 1.55 | 5.0 | 0/65/0 | — |
| Razorglass Claw | 45 | 23–54 | 1.6 | 5.0 | 0/80/0 | — |
| Sharktooth Claw | 49 | 25–52 | 1.7 | 5.0 | 0/87/0 | — |
| Armoured Claw | 52 | 27–63 | 1.55 | 5.0 | 0/92/0 | — |
| Piercing Claw | 55 | 23–68 | 1.6 | 5.0 | 0/97/0 | — |
| Talon Claw | 65 | 23–79 | 1.65 | 5.0 | 0/114/0 | — |

**鏈錘（13）**

| 基底 | 等級 | 物傷 | 攻速 | 暴擊 | 力/敏/智 | 固定詞 |
|---|---|---|---|---|---|---|
| Splintered Flail | 0 | 6–9 | 1.45 | 10.0 | 0/0/0 | — |
| Chain Flail | 6 | 8–14 | 1.45 | 10.0 | 12/0/0 | — |
| Holy Flail | 11 | 10–17 | 1.45 | 10.0 | 18/0/9 | — |
| Iron Flail | 16 | 14–23 | 1.45 | 10.0 | 25/0/12 | — |
| Twin Flail | 20 | 8–18 | 1.4 | 10.0 | 30/0/14 | Bifurcates Critical Hits |
| Slender Flail | 26 | 19–32 | 1.5 | 8.0 | 38/0/17 | — |
| Stone Flail | 33 | 23–38 | 1.45 | 10.0 | 47/0/20 | Unblockable |
| Ring Flail | 38 | 23–44 | 1.45 | 10.0 | 54/0/23 | — |
| Guarded Flail | 45 | 31–57 | 1.4 | 10.0 | 63/0/26 | — |
| Icicle Flail | 47 | —＋Cold24–55 | 1.45 | 10.0 | 66/0/27 | — |
| Tearing Flail | 52 | 27–56 | 1.4 | 12.5 | 72/0/29 | — |
| Great Flail | 58 | 35–58 | 1.45 | 10.0 | 80/0/32 | — |
| Abyssal Flail | 65 | 36–66 | 1.45 | 10.0 | 89/0/36 | — |

**陷阱（13）**

| 基底 | 等級 | 物傷 | 攻速 | 暴擊 | 力/敏/智 | 固定詞 |
|---|---|---|---|---|---|---|
| Clay Trap | 0 | — | — | — | 0/0/0 | — |
| Clamping Trap | 0 | — | — | — | 0/0/0 | — |
| Shrapnel Trap | 0 | — | — | — | 0/0/0 | — |
| Urn Trap | 0 | — | — | — | 0/0/0 | — |
| Incense Trap | 0 | — | — | — | 0/0/0 | (20-30)% increased Cooldown Recovery Rate for throwing Traps |
| Bladed Trap | 0 | — | — | — | 0/0/0 | — |
| Dart Trap | 0 | — | — | — | 0/0/0 | — |
| Spike Trap | 0 | — | — | — | 0/0/0 | — |
| Coiled Trap | 0 | — | — | — | 0/0/0 | — |
| Lead Trap | 0 | — | — | — | 0/0/0 | — |
| Medallion Trap | 0 | — | — | — | 0/0/0 | — |
| Intricate Trap | 0 | — | — | — | 0/0/0 | — |
| Refined Trap | 0 | — | — | — | 0/0/0 | — |

### 5.2 弓／箭袋／藥劑／護符／珠寶（舊盤點只有概述）

**箭袋（11，全部有固定詞，一個基底一條）**

| 基底 | 等級 | 固定詞 |
|---|---|---|
| Broadhead Quiver | 0 | Adds 1 to 3 Physical Damage to Attacks |
| Fire Quiver | 8 | Adds 3 to 5 Fire damage to Attacks |
| Sacral Quiver | 16 | Gain (2-3) Life per Enemy Hit with Attacks |
| Two-Point Quiver | 24 | (20-30)% increased Accuracy Rating |
| Blunt Quiver | 32 | (25-40)% increased Stun Buildup |
| Toxic Quiver | 39 | (20-30)% chance to Poison on Hit with Attacks |
| Serrated Quiver | 44 | Attacks have (20-30)% chance to cause Bleeding |
| Primed Quiver | 51 | (7-10)% increased Attack Speed |
| Penetrating Quiver | 55 | 100% chance to Pierce an Enemy |
| Volant Quiver | 60 | (20-30)% increased Arrow Speed |
| Visceral Quiver | 64 | (20-30)% increased Critical Hit Chance for Attacks |

**藥劑（生命 9／魔力 9）**

| 基底 | 等級 | 回復 | 持續秒 | 每次用充能／上限 |
|---|---|---|---|---|
| Lesser Life Flask | 0 | 50 | 3.0 | 10/60 |
| Medium Life Flask | 4 | 90 | 5.0 | 10/65 |
| Greater Life Flask | 10 | 150 | 4.0 | 10/70 |
| Grand Life Flask | 16 | 260 | 5.0 | 10/75 |
| Giant Life Flask | 23 | 340 | 4.0 | 10/75 |
| Colossal Life Flask | 30 | 450 | 4.0 | 10/75 |
| Gargantuan Life Flask | 40 | 710 | 5.0 | 10/75 |
| Transcendent Life Flask | 50 | 840 | 4.0 | 10/75 |
| Ultimate Life Flask | 60 | 920 | 3.0 | 10/75 |
| Lesser Mana Flask | 0 | 50 | 2.0 | 10/60 |
| Medium Mana Flask | 4 | 70 | 3.0 | 10/65 |
| Greater Mana Flask | 10 | 90 | 2.5 | 10/70 |
| Grand Mana Flask | 16 | 110 | 2.5 | 10/75 |
| Giant Mana Flask | 23 | 165 | 3.5 | 10/75 |
| Colossal Mana Flask | 30 | 165 | 2.5 | 10/75 |
| Gargantuan Mana Flask | 40 | 185 | 2.0 | 10/75 |
| Transcendent Mana Flask | 50 | 285 | 3.5 | 10/75 |
| Ultimate Mana Flask | 60 | 310 | 3.0 | 10/75 |

**護符 Charm（13）**

| 基底 | 等級 | 觸發條件（固定詞） | 持續 | 充能/上限 |
|---|---|---|---|---|
| Ruby Charm | 5 | Used when you take Fire damage from a Hit | 4s | 20/40 |
| Sapphire Charm | 5 | Used when you take Cold damage from a Hit | 4s | 20/40 |
| Topaz Charm | 5 | Used when you take Lightning damage from a Hit | 4s | 20/40 |
| Stone Charm | 8 | Used when you become Stunned | 3s | 20/40 |
| Silver Charm | 10 | Used when you are affected by a Slow | 3s | 20/40 |
| Thawing Charm | 12 | Used when you become Frozen | 3s | 40/40 |
| Staunching Charm | 18 | Used when you start Bleeding | 3s | 30/40 |
| Antidote Charm | 24 | Used when you become Poisoned | 3s | 20/40 |
| Dousing Charm | 32 | Used when you become Ignited | 3s | 30/40 |
| Grounding Charm | 32 | Used when you become Shocked | 3s | 30/40 |
| Amethyst Charm | 40 | Used when you take Chaos damage from a Hit | 4s | 30/40 |
| Cleansing Charm | 40 | Used when you become Cursed | 3s | 20/40 |
| Golden Charm | 50 | Used when you kill a Rare or Unique enemy | 1s | 80/80 |

**珠寶（8）**：Ruby、Emerald、Sapphire、Diamond、Time-Lost Ruby、Time-Lost Emerald、Time-Lost Sapphire、Time-Lost Diamond。沒有固定詞、沒有需求。


**戒指（27）等級分布**：[(0, 9), (8, 1), (12, 2), (16, 1), (20, 1), (26, 1), (32, 1), (35, 1), (40, 7), (44, 1), (47, 1), (52, 1)]


**護身符（21）等級分布**：[(0, 8), (8, 3), (14, 1), (18, 1), (24, 1), (30, 2), (35, 1), (40, 1), (42, 2), (50, 1)]


**腰帶（16）等級分布**：[(0, 3), (14, 1), (20, 1), (24, 1), (31, 1), (32, 3), (40, 2), (44, 1), (50, 1), (55, 1), (62, 1)]

---

## 6. 總結：給「16 階地圖、怪物最高約 80 級」的小型遊戲

這份資料的大結構：**一般基底約 1000 個**（防具約 550、武器約 330、飾品與消耗品約 110）；防具 6 系 × 一條共用的等級階梯；固定詞集中在「盾（技能）、飾品（基本屬性）、法系武器（技能）、終局胸甲（分流）」；PoE2 **沒有 Normal／Advanced／Expert 分層**，基底升級＝「等級階梯上的新名字」。最值得保留的五點：

1. **防禦用「一條等級線 × 六個系」的格子，不用層級名。** 每個部位每系只要 5～6 個基底（對應 16 階分 5～6 段），防禦值幾乎線性（AR 胸甲每級約 +7，Lv11→65 約 115→496），每升一個名字加 10～20%。系與系之間靠比例區分：混合系 ≈ 單系 55%＋55%，ES 約是 AR/EV 的 1/3（Lv65 胸甲 ES171 對 AR570/EV519）。部位比例（AR，Lv80）：胸甲 100%、頭盔約 66%、鞋子約 49%、手套約 33%、盾約 46%。
2. **固定詞留給「值得換基底」的位置，防具其餘不給。** PoE2 的做法：頭手鞋、法器完全沒有固定詞（只有防禦值），胸甲只有 65 級以後才有、盾每個都有（技能：舉盾／招架），飾品每個基底一條基本屬性（戒指、護身符、箭袋、護符一個基底＝一種）。這讓「撿到什麼基底」在胸甲／盾／飾品有選擇意義，其他部位只看等級。
3. **終局不再拉高防禦，改成「同等級並排＋固定詞分流」。** 胸甲 68～80 級防禦值凍結在 65 級水平，每系 5 個帶固定詞的基底（兩個主題各 2 個＋1 個 80 級獨有）。對 16 階的小型遊戲，這是最好抄的：最後 2～3 階的基底只差「主題」，不差數字，數值膨脹由詞綴而不是基底承擔。
4. **腰帶＝護符欄位，護符＝自動觸發的條件。** 16 個腰帶全部帶 1～3 個護符欄＋一條藥劑／護符／護甲副詞；護符 13 個，一個基底＝一個觸發條件（被冰凍、流血、中毒、點燃、感電、暈眩、緩速、受元素或混沌傷害、被詛咒、擊殺稀有怪）。結構輕、不增加數值，只增加「配置選擇」，很適合小遊戲。
5. **武器「換基底＝換玩法」的設計只在法系武器與長矛／十字弓最徹底。** 法杖、長杖、權杖、長矛 100% 有固定詞（給技能），十字弓約半數（多裝填／手雷／穿透），劍、鏈錘幾乎全空；其餘近戰類只有 20～50% 有固定詞，且集中在 65 級以上。若要簡化，可保留「法系武器與長矛的基底＝給技能」，其他武器只給基礎數值。

**⚠️ 不確定或推論**
- 版本與範圍：PoB-PoE2 資料（0.5，最後提交約 2026-10-01）；1.0 若改版這份會過時。poe2db 只抽查了胸甲頁與 0.5.0 改版說明（頁面都超過一次擷取的長度，只讀到前 10 萬字）。
- 「沒有 Normal／Advanced／Expert」是根據 PoB 全部 1756 個基底名與 poe2db 胸甲頁沒有這類字樣所下的結論；若指的是 1.0 才新增的系統，這裡沒有資料。
- PoB 的基底防禦是否已含 0.5.0 的「65 級 +33%、80 級 +15%」加成沒核對；`Soldier Cuirass` 這類 65 級高防禦變體為何高出同級 15% 也只是觀察，沒有找到設計說明。
- 「符文鍛造／Runemastered」版本（約 730 個）是 0.5 聯盟機制，本檔全部排除在基底數之外；是否會成為 1.0 常駐系統未知。
- 每系「兩個主題各 2 個＋1 個獨有」是從 PoB 資料歸納的，個別系（AR/ES）的 65 級與 75 級兩個「全元素最大抗性 +1%」不是相鄰等級，歸類為同主題是推論。
- 本檔第 1 節的基底數可能與舊盤點差 1（例：弓 27 對舊檔 26），因為這裡含 1 個等級 0 的特殊基底；兩者的來源同為 PoB，差異不影響結論。
