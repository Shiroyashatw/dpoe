# dungeonPOE — 給 Claude 的專案說明

**最高優先：任何改動都先讀 `docs/設計原則.md`**（MDA 從樂趣倒推機制、隨機性規則、從《塞令老師》學到的教訓），規則與數值在 `docs/企劃書.md`，改了要同步。

**每次新對話開始**：先用 Skill 啟動 `ponytail`（最小完整改動）和 `grilling`（先把計畫問清楚再動手）。

**只要動到 UI／UX：一定先啟動 skill `ui-design`**（長相以 skill `impeccable` 與 `DESIGN.md` 為主；動到互動、動畫、手勢才加 `apple-design`／`animate`；技術限制與測試尺寸照 `docs/介面規範.md`）。**介面流程以本檔為準，覆蓋上一層《塞令老師》CLAUDE.md 的「apple-design 為主」。**0.2.0 起是**桌機為主、手機為輔**的即時 ARPG（0.2.4 起有手機版）：兩邊的操作規則與對照表在 `docs/企劃書.md` 第 9 節「操作模式」，**改介面兩邊都要做、都要測**——桌機截 1440×900 與 1280×720（面板不能超出畫面），手機橫向 844×390 與 667×375、手機直立 390×844 與 375×667（`node tools/touch_check.js 寬 高`，要先開本機伺服器；0.2.14 起手機有直立／橫向兩種操作，設定裡選，`S.orient`、`PORT()`）。遊戲邏輯只透過 `mouseWorld()` 與移動方向拿輸入，不要在技能、戰鬥程式裡判斷是不是手機。

0.2.0 重製成桌機的即時動作 ARPG（0.2.2 技能寶石，0.2.3 PoE 式天賦樹＋昇華，0.2.4 能量護盾、精魄光環、陷阱地雷砲台圖騰、天賦樹與昇華差異化）：藏身處 → 地圖台放地圖碎片、自選階級（1～16，打倒王開放下一階）→ 刷圖打王撿寶。死亡照 PoE（扣經驗、裝備不掉）。10 欄裝備＋格子背包與倉庫，稀有度照 D2。**0.2.9 起職業與昇華全部砍掉**，照 `docs/開發參考.md` 的順序（底層 → 武器與底材 → 技能體系 → 天賦樹 → 職業）重新設計。0.2.6 做了第一批的做裝（底材三層、鍛造、淬鍊、分解、材料頁、靈魂＋孔位（書庫 0.2.8 拿掉，改成生成寶石））。**docs 的索引在 `docs/索引.md`**（哪份是權威、什麼時候讀）；**還沒做的都在 `docs/待做清單.md`**（做完一項就從那裡刪掉、寫進 CHANGELOG）。0.1 的撤離＋背包自動戰鬥規則在 `docs/封存/舊企劃書_0.1.md`（程式在 git 紀錄）。

## 溝通規則
- **一律用繁體中文回覆**（包含 commit 訊息）。
- 版本號：0.2.x。改版本時改 `js/data.js` 的 `VER`、`index.html` 所有 `?v=` 和 `version.json`（手機拿到快取的舊頁面時，`main.js` 的 `verCheck` 看它不同就換網址重新載入），再更新 `CHANGELOG.md`。
- 流程：先改、先測，確認 OK 後再 commit + push（push 前先問使用者）。
- 這個資料夾自己就能跑（不引用上一層的檔案），以後可以整個搬到別的 repo。

## 檢查（改了遊戲邏輯一定要跑）
- `node tools/check.js`：圖名、3000 件裝備的稀有度與詞綴範圍、全身裝備數值沒有 NaN、格子背包不重疊、天賦樹一千多點都連得到且沒有重疊、三條昇華分支一小一大交錯且點得成 4 小 4 大、全點滿沒有 NaN、寶石掉落。有 ❌ 不交差。
- 戰鬥、面板、拖曳用 Playwright 在本機實際操作（`python3 -m http.server`）：進地圖、打王開放下一階、死亡、拖曳裝上／交換／倉庫／賣掉、存檔還原。
- 改完 JS：`npx prettier@3.3.3 --write js/*.js tools/*.js`。

## 專案結構
純靜態網頁，沒有建置步驟。JS 是一般 `<script>`，照 `index.html` 的順序載入、共用全域；`main.js` 最後。`data`、`items` 是純邏輯（`tools/check.js` 用 Node 載入）。

| 檔案 | 內容 |
| --- | --- |
| `js/core.js` | `$`（getElementById）、`fl`、固定亂數 `h`／`rng`、`esc` |
| `js/data.js` | 表格：`VER`、`KEY`、`SLOT`、主角 `HERO`、等級經驗 `xpNeed`、技能寶石 `SKILLS`／輔助 `SUPPORTS`／`GEM_MAX`／`gemNeed`、光環 `AURAS`／`AURA_SLOTS`／`SPIRIT0`、天賦樹 `PTREE`（產生器（0.2.22 照 PoE2 的幹道＋口袋，`docs/PoE天賦結構.md` 第 5 節）：38 個主題 `PT_THEME`（`rg` 六條路的權重、`wp` 武器專精、`inner` 內圈、`nt` **手寫的大點**（第三格＝轉折到哪個主題）；`PT_TH` 名字→編號）、過路點照方向給的基礎能力 `PT_BASE`、六條路的起點 `PT_ROADS`、12 個基石 `PT_KEYS`；幹道＝三角格子的頂點（`LA` 間距、`rim` 外框），每個三角形一個叢集（小點排在軌道上、大點在手臂末端；外圈兩個三角形併成大叢集），主題照區域權重抽樣＋距離排斥 `REP`；挖空半徑 `PT_R0`、起點 `PT_START`、`STATN`（`w_武器` 持武器時傷害；第三格 1＝開關）、`ptPoints`）、天賦圖示 `PT_ICONS`／`PT_STAT_IC`、武器類別 `WTN`（照 PoE2，0.2.12 起 15 種：劍、斧、錘的單手與雙手同一類，雙手看底材的 `two`）／一律雙手的類別 `WT2`／雙持 `DUAL`（只限單手底材）／法系 `SPELLW`／類別表與底材產生器 `WCLS`／`WEAPON_BASES`（法系武器的詞綴池 `SPELL_AFF`）／輔助分類 `SUP_CAT`／`supCat`／隱性詞名稱 `IMPN`、副手欄能放什麼 `eqTakes`、翻滾與完美閃避 `ROLL`、藥水 `FLASK`、地圖階級 `TMAX`／`mapCost`／`tierMul`／`tierIlvl`、抗性 `RESK`／`ELN`／`ELC`、裝備欄 `EQS`、種類 `KINDS`（大小、可出現的詞綴）、底材 `BASES`、詞綴 `AFF`（`tierRange` T12～T1、`bestTier`）、怪物 `MOBS`／`PACKS`／`ELITE`、王 `BOSSES`／隨機挑王 `bossPick` |
| `js/sprites.js`、`js/art.js`、`img/` | 像素圖大圖（`art.js` 是產生的，不要手改）；`artImg`（canvas 用）、`artSprite`（白色閃光版）、`artIconURL`（面板圖示） |
| `js/fxsheets.js`、`img/fx/` | pixelfx（MIT，授權在 `img/fx/LICENSE-pixelfx.txt`）的特效序列圖表 `FXS`（產生的，不要手改）；`fxs(名字, x, y, 半徑, { rot })` 播一張（`game.js`；`rot` 照方向轉，畫法在 render.js 的 `drawSh`，投射物用 `s.sh`），`fx()` 的圓環照顏色自動疊一張（`RINGFX`）；`tools/fx_sheets.mjs <pixelfx 資料夾>` 重新產生（清單 `LIST` 在檔案開頭，先 `git clone https://github.com/patch-gg/pixelfx` 到 repo 外面） |
| `js/items.js` | 寶石道具 `mkGem`／`dropGem`／`gemOf`／`isSup`／`isAura`、裝備產生 `mkItem`／`dropItem`／`rollRarity`、底材三層（品質 `rollQ`／`qBand`、孔數 `rollSock`／`SOCK_MAX`、潛能 `rollPot`、說明 `baseLayers`）、副手合不合規 `offOK`／原因 `offWhy`（盾、法器、箭袋、權杖、雙持）、名字與說明 `itemName`／`affText`／`baseText`、賣價 `sellPrice`、格子背包 `gridFree`／`gridHits`／`gridAuto`、角色數值 `stats`（含天賦樹、能量護盾、精魄與光環 `auraOn`）、`dps` |
| `js/craft.js` | 做裝的純邏輯（`check.js` 也載入）：材料 `newMat`／`MAT`（`S.mat`：三種粉 `dust`／`fine`／`rare`（`DUSTS`、`dustCost`）、靈魂、鑿孔石；詞綴類別 `ACLS`）、打怪拿材料 `killMat`、鍛造 `FORGE`（強化、添加、同類置換、跨類置換、定向重鑄；`forgeCheck`／`forgeDo`／推薦 `forgeHint`；鍛造出來的詞最高 T2 `forgeAff`）、淬鍊 `temperDo`／百分位 `affPct`／完美度 `perfection`、（舊的寶石書庫 `LIB`／`learnGem`／`blankGem` 0.2.8 已經不用，待清）、靈魂升級 `gemUp`、開孔 `drillDo` |
| `js/combat.js` | **底層（0.2.7，照 PoE2，規則在企劃書 7.2）**：怪物等級 `mobLv`、抗性懲罰 `resPen`、經驗打折 `xpMul`、王的倍率 `bossHpMul`／`BOSS_DMG`、怪物生命倍率 `MOB_HP`（0.2.22）、命中 `hitChance`／怪物閃避 `mobEv`／玩家攻擊打不打得中 `hitRoll`（0.2.22，熵值）、怪物防禦 `mobDef`、擊中五步 `hitCalc`（提高同池、更多相乘、暴擊、抗性與護甲）、異常 `applyAil`／`ailTick`（雙向）、怪物移速與傷害倍率 `mobSpd`／`mobDmgMul`、詛咒 `CURSES`／`curseMob`、標記 `MARKS`／`markMob`、球體 `gainChg`／`chgN`／`useChg`、buff `BUFF`／`gainBuff`、觸發 `onHitBase`／`onKillBase`、玩家每格 `baseTick`、玩家受傷 `hurtCalc`／`effRes`、護符 `CHARMS`／`mkCharm`／`charmSlots`。**新效果要先在這裡有概念才能用**（設計原則第 0 節） |
| `js/maps.js` | 地圖卡（0.2.8）：星級 `STARS`、地圖詞 `MAPMOD`（危險度、組）、獎勵 `MOD_REW`／`cardRew`、開放張數 `cardsOpen`、費用 `mapCost`、抽卡 `rollCard`／`mapCards`（`S.cards`，進地圖時清掉）、合計成 `G.mm` 的 `mapMods`、讀取 `MM(key)` |
| `js/mech.js` | **技能用的底層新機制（0.2.10，企劃書 7.3）**：收割 `hasState`／`takeState`／碾壓 `crush`、地面效果 `GROUND`／`addGround`／引爆器 `detonate`／`boomAt`／`igniteAt`、殘留物與灌注 `dropRemnant`／`infN`／`takeInf`、屍體 `addCorpse`／`takeCorpse`、連擊數 `comboHit`／`comboN`／`useCombo`、段數 `nextStage`、招架 `startParry`／`tryParry`（失衡 `m.ail.parried`）、觸發輔助（0.2.13 起暴擊施放是輔助）`metaEvent`／`castGem`（`ENERGY`）、死亡紅花 `popBlooms`、手雷 `throwGrenade`／`grenadeReady`、彈藥 `ammoUse`／`ammoLeft`、飛劍 `gainSwords`／`launchSwords`／`plantSwords`、幻影 `spawnMirage`、榮耀與旗幟 `gainGlory`／`plantBanner`／`bannerOn`、變身 `FORMS`／`formFor`、每格 `mechTick`、畫面 `drawMech`。**技能只呼叫這裡，不自己發明規則** |
| `js/audio.js` | Web Audio 合成音效 `sfx` |
| `js/game.js` | 存檔結構 `newGame`、場景（藏身處 `enterHideout`、開圖 `openMap`、方塊房間地圖 `enterMap`（`TS`、`CHUNK`、牆 `isWall`、找地板 `floorIn`／`floorNear`）、首領進度 `addProg`、回家 `goHome`）、碰撞 `moveBody`／`pushTiles`、玩家與技能 `useSkill`／`actHit`／`updPlayer`、翻滾 `doRoll`、受傷與完美閃避 `hurtPlayer`、死亡 `die`、打怪 `hitMob`／`killMob`（掉落、碎片）、打倒王 `bossDown`（開放下一階、不跳視窗）、傳送門下一把 `mapAgain`、撿東西 `pickup`、互動 `interact`／`useProp`、怪物 AI `updMobs`／`mobStrike`、王 `bossAI`、主迴圈 `frame` |
| `js/skills.js` | 技能欄 `NSLOT`／`SLOTKEY`、一格的實際數值 `slotCfg`（輔助 `supOK`）、放技能 `useSlot`（付費前檢查彈藥、手雷、榮耀、屍體、目標 `mobNear`）／`skillTick`（位移技能 `D.dist`）／`actHit`、0.2.11 的武器技能 `actHit2`（每種武器 2 招）、技能限定武器 `wtOK`／`wtNeed`、打中 `hitMob`（傷害公式與異常在 combat.js）、沒技能時的預設 `BASEC`、詛咒與標記的施放（`actHit` 的 `D.curse`／`D.mark`）、怪物每格 `mobTick`、能量護盾吸收與回充 `esAbsorb`、狼 `callWolf`／`updAllies`、毒刃雨與隕石 `updPools`、`skillsEnter`、出手與移動速度 `speedMul`／`moveMul`、擊殺 `onKill`、場上單位 `placeUnit`／`unitFire`／`updUnits`（`UNIT_MAX`） |
| `js/touch.js` | 手機操作（`TOUCH`、`setTouch` 切模式、直立／橫向 `applyOrient`／`setOrient`、直立的龍絆式手勢（點＝普攻、按住＝連打、拖＝移動、一撥＝翻滾）、右上 ☰ `moreMenu`；設定面板 `setHTML`、桌機功能列 `DMENU`、直立分頁 `portTabs` 在 hud.js）：全螢幕 `fsEnter`／`fsClick`（iPhone 教加入主畫面，`manifest.webmanifest`）、浮動搖桿、技能鍵手勢（點＝自動瞄準 `autoTarget`、拖＝手動瞄準 `touchAim`／地上的線 `drawAim`、拖回取消）、右上選單、點道具出現說明＋動作 `tapItem`、回家要按兩次 `homeAsk` |
| `js/forge.js` | 鍛造台面板 `forgeHTML`（`CRAFT`：分頁、選的詞綴類別、選的裝備 `craftPick`）、材料列 `matsHTML`；技能寶石面板的升級／開孔按鈕（生成寶石的視窗在 hud.js 的 `gemHTML`）（`data-fg`） |
| `js/tree.js` | 天賦樹盤面 `TREE`／`treeOpen`／`treeRender`／`treeToggle`（叢集的軌道照 `PTREE.ARC` 畫成弧線；能不能點 `treeCan`、能不能退 `treeCanRefund`；中間挖空的地方等新昇華）、說明 `treeTip` |
| `js/render.js` | canvas 畫面 `draw`：藏身處 `drawHideout`、互動提示 `drawPrompts`、預警、怪物、主角（`img/hero.png` 九列動作的 `heroCell`、技能對應動作 `ACT_ROW`、方向 `dirCol`）、特效、跳數字、掉落標籤 `LABELS`（手機避開技能鍵 `touchRects`）、光照、小地圖、古銅框 `bronzeRect` |
| `js/biome.js` | 地圖場景（0.2.14，只有外觀、不影響戰鬥）：`BIOMES`（冰雪洞窟、岩漿地城、毒沼古墓、廢棄廟宇；`G.biome` 在 `enterMap` 隨機，藏身處固定廟宇）、地板花紋 `bFloor`、地上細節 `bDecals`、牆 `bWalls`、藏身處後牆 `bHideWall`、擺設 `decorate`／`hideDeco`／`bDeco`（`G.deco`，不擋路）、光源 `bLights`（暗層挖亮）／`bGlow`。房間形狀（圓形庭院、切角、崩塌，會擋路）在 game.js 的 `roomShape` |
| `js/hud.js` | HUD（生命／魔力球、技能列 `BAR`／`hudBar`、王血條、首領進度條）、面板 `openPanel`／`hudPanels`（裝備 `invHTML`、倉庫、地圖台 `devHTML`、技能寶石與光環欄 `skillHTML`）、欄位 `slotGet`／`slotSet`／`slotFits`（裝備欄與寶石插槽）、拖曳 `dragStart`／`dragMove`／`dropTarget`／`dragEnd`、點一下搬移 `quickMove`、賣 `sell`／批量賣出 `sellBar`／`sellAll`、丟到地上 `dropFloor`、倉庫的臨時頁（`PANEL.stab`、`S.temp`）、過濾器 `filterHTML`（判斷在 game.js 的 `filterPick`，`S.filter`）、點空格生成並裝上 `gemOpenFor`／`gemFits`（`GEMUI.to`）、升滿 `gemMaxCheck`／`gemUpMax`（craft.js）、桌機游標旁的翻滾冷卻 `#rcd`（`hudTick`）、說明框 `itemTip`／`gemTip`、死亡與傳送門選單 `hudState`、輸入 `inputInit`、動作 `act` |
| `js/cloud.js` | Supabase 匿名登入＋雲端存檔（表 `dungeon_saves`）、0.2.19 信箱帳號 `AUTH`／`authDo`（註冊 `authRegister`、登入 `authLogin`（換成帳號的存檔，`main.js` 的 `useSave`）、登出、忘記密碼 `authReset`／`authNewPw`；面板在 hud.js 的 `acctHTML`） |
| `js/market.js` | 0.1 的市集（還沒接回 0.2，`index.html` 沒有載入） |
| `js/main.js` | `load`／`save`／`migrate`／`start` |
| `tools/check.js` | 固定檢查（含底材三層的範圍、雙手與箭袋規則、每種武器的數值不是 NaN、天賦樹照 `PoE天賦結構.md` 5.6 的結構驗收） |
| `tools/dmg_check.js` | 傷害與防禦的驗收：Lv30／60／90 × 三套配裝打王的秒數、王一招打掉多少生命（`--why` 印出每一層的數字）；改了傷害、防禦、天賦、詞綴、怪物數值後跑 |
| `tools/touch_check.js` | 手機操作測試（Playwright 模擬觸控，送真的觸控事件）：搖桿、普攻連打、技能點／拖／取消、翻滾、按鈕不重疊、面板不出畫面、點道具的動作、天賦樹點兩次與兩指縮放；`node tools/touch_check.js 寬 高 [網址]` |
| `supabase/migrations/` | `dungeon_saves` 表、`dungeon_market` 市集表與函式 |

## 本機執行
```bash
python3 -m http.server 8000   # 在 dpoe/ 底下，開 http://localhost:8000
```
存檔在 localStorage（鍵 `dungeonpoe_v1`，網址加 `?p=2` 用另一份）。存檔版本 `S.v`：0.2.0 是 10、0.2.2 是 11（技能寶石 `S.skills`）、0.2.3 是 12（天賦 `S.pt`、昇華 `S.asc`／`S.at`、打過階級 16 `S.t16`）、0.2.4 是 13（光環欄 `S.auras`、天賦與昇華退回；0.1 的 1～3 直接開新角色）。0.2.7 是 14（暴擊詞分成本地／全域、護身符物理改成提高 %、護符欄 `S.charms`）。0.2.18 是 15（天賦樹照技能體系重做，點數退回）。0.2.22 是 16（天賦樹照 PoE2 的幹道＋口袋重做，點數退回）。0.2.6 沒有換版本號，`migrate()` 每次都補：材料 `S.mat`、書庫 `S.lib`、技能欄的輔助搬進技能寶石的孔（`gem.so`／`gem.sup`，技能欄只剩 `{ a }`）、舊裝備補品質 0／孔 0／潛能 3，改格式要在 `main.js` 的 `migrate()` 補轉換。

## Supabase
同一個專案（ref `eugkdfhkoaxvqhztvptc`），表 `public.dungeon_saves`（跟《塞令老師》的 `saves` 分開，RLS 只允許本人）。前端只放 anon key，**絕對不要使用或要求 service_role key**。表不存在時只存本機。

## 部署
GitHub Pages：`main` 分支，網址 https://shiroyashatw.github.io/wayfarer/dpoe/ 。
