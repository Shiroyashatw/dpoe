# dpoe 裝備取得方式與 Steam 亮點評估

> 本檔由製作人從 Page 同步，來源：<https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/167c56bb-e9cf-4954-b91f-3d39084385bd>；同步日期：2026-11-16；請勿直接在 repo 修改，改動請經製作人

> 註（同步時加）：mumi 已於 2026-11-16 決定 Q14 D、Q15 E＋F（G 不當主打，M4S 可選評估）、Q16 I，見 [`gdd.md`](../CHANGELOG.md#決策紀錄)；落地任務 M2-17～20、M3-09～13、M4S-06 見 [`milestones.md`](../README.md)。以下為 Page 原文，選項與建議保留評估當時的寫法。

回答 mumi 的三個問題：要不要打造、桌面破壞神是哪款、dpoe 在 Steam 有沒有亮點。結論是保留打造當骨幹，再加一層看得到保底的追逐掉落。資料讀取日 2026-11-16，選項由 mumi 決定。

> **評估期間 M1 照舊進行**：這份只是評估，不改任何已交辦的工作。底下的選項要等 mumi 拍板才會進里程碑。

## 目錄

- [結論](#結論)
- [問題一：要不要用材料打造裝備](#問題一要不要用材料打造裝備)
- [問題二：桌面破壞神是哪款、是不是純掉落](#問題二桌面破壞神是哪款是不是純掉落)
- [同類遊戲比較表](#同類遊戲比較表)
- [問題三：dpoe 在 Steam 有沒有亮點](#問題三dpoe-在-steam-有沒有亮點)
- [需要 mumi 拍板的選項](#需要-mumi-拍板的選項)
- [來源](#來源)

## 結論

- 桌面破壞神是 2026-09-28 上 Steam 的《桌面破壞神：掛機ARPG》（Deskrawl: Idle ARPG），這是 Steam 官方繁中名，信心高。
- 它不是「純掉落、沒有增量」：裝備主要靠掉落，但另有巔峰等級、生活技能樹、僕從養成、城鎮設施、強化與開光、賭裝與合成。
- 它現在最大的負評正是「掉落乾旱」：近 30 天只有 36% 好評，評論寫「600 多小時沒掉過神聖」。掛機加純機率追裝，會讓玩家幾百小時沒有收穫。這支持 dpoe 把開獎搬到打造的方向。
- 建議 D：保留打造當骨幹（進度可預期），再加一層只能靠掉落、而且畫面上看得到保底進度的「追逐掉落」，補回戰鬥中的驚喜。
- 2026 年 Steam 上至少有 5 款掛機暗黑或 PoE 類新作，大多褒貶不一。光是「掛機 ARPG」不算亮點，要主打「PoE 深度做裝、不靠運氣乾旱、手機網頁免費試玩」。目前的缺口是只有繁中、沒有真人數據、畫面辨識度不足。

## 問題一：要不要用材料打造裝備

### 現在的 dpoe 怎麼運作（0.5.4，看程式碼與文件）

| 項目 | 說明 |
| --- | --- |
| 戰鬥不掉裝備、不掉材料 | 打怪只拿靈魂、金、10 種通貨、精髓、珠寶、追憶之墨、破裂石與完美石、護符。`js/craft.js` 的 `killMat`／`dropCur`，`js/game.js` 第 1006 行呼叫；全部程式碼已經沒有 `dropGear` 的呼叫。 |
| 材料由營地產生器生產 | 林場、礦場、獵場、絲地產木、鐵、皮、靈絲（`genTick`、`data.js` 的 `GEN`）。材料的階由瞭望台開到哪裡決定（`tierCap`）。 |
| 鍛造台打造＝開獎 | 選部位、系、材料的階、數量後按打造（`craftDo`）。基底固定取該階最高的那個（`craftBase`），物品等級＝3T−2，稀有度照鍛造台等級（`CRAFT_RAR`：Lv0 白 70／藍 30；Lv16 白 10／藍 50／黃 40），黃裝有偽隨機保底。詞綴照舊用 `mkItem` 隨機骰。花 3～8 份材料，不用計時。 |
| 翻牌、比較、換上／留／分解 | 一件一件翻開，立刻跟身上比；分解回 50～80% 材料、靈魂與金（`salvageDo`），自動分解規則在鍛造台 Lv8、Lv14 開。 |
| 頂級裝的來源 | 填 → 淬鍊 → 破裂石（一條升到 T0 並鎖住）→ 完美石（再一條 T0）→ 聖化 → 腐化；追憶詞靠追憶之墨。破裂石、完美石、墨都只從菁英與王掉，掉率是自己定的暫定值（`docs/工坊與解鎖表.md` 第 4～6 節）。 |

也就是說，dpoe 已經是一種混合：裝備本體靠打造，但頂級的「零件」（破裂石、完美石、墨、珠寶）還是靠掉落。這點跟 PoE2「掉通貨、自己做裝」很像。

### 當初為什麼掉裝無感（repo 裡的證據）

| 版本 | 現象 | 說明 |
| --- | --- | --- |
| 0.3.6 | 量多、價值低、看不到 | 掉落 0.4 秒就被吸走，光柱和標籤幾乎看不到；開獎要中斷巡邏；開完不知道哪件比身上好。每小時約 150～200 件未鑑定黃裝，只有約 2.5 件 ★、1 件追憶有感（`docs/待做清單.md`，暫定估算）。 |
| 0.4.9 | AI 試玩 40 分鐘，有感掉落 0 次 | 64 件全是 T6／T5，★ 0、追憶 0；保底計數「★ 42／2858」要好幾小時。崇高石第 2 分鐘就掉、整場 12 顆，變成背景噪音（`docs/試玩報告_0.4.9_Opus.md` 第 4 節）。 |
| 0.4.10 | 「只有戰鬥爽、掉寶無感」 | mumi 自己玩加 AI 試玩的結論；而且掛機掉 N 件跟手刷掉 N 件體感不同，掛機的掉落是背景噪音（`docs/工坊與解鎖表.md` 第 0 節）。 |

診斷：問題不在「掉落」這件事本身，而是四件事同時發生：量太多、絕大多數沒價值、沒有「只有掉落才有」而且一眼看得出的層、保底要好幾小時又看不到。再加上掛機時玩家不在場，掉落的當下沒人看。`docs/打寶遊戲比較.md` 的共同結論也一樣：黃裝是玩家耐心最低的一層，一定要有只能掉落才拿得到的東西。

> ⚠️ **還沒有真人數據**：0.5 的打造系統只被 AI 試玩過。打造的開獎感夠不夠，要等 M3 真人試玩才知道。

### 四個做法

#### A　維持純打造（現狀）

- 優點：進度可預期，跟增量遊戲的節奏一致；沒有垃圾裝塞倉庫；翻牌、比較很適合手機直立；開發成本 0
- 缺點：戰鬥中只剩通貨能讓人心跳；PoE／暗黑老玩家期待的「地上掉神裝」沒了；商店頁很難拍出掉寶的爽感畫面

開發成本：0。掛機與增量契合度：高。手機直立：高。

#### B　回歸掉裝

- 優點：最接近暗黑與 PoE 的原味；戰鬥畫面有掉寶光柱可以拍
- 缺點：重演 0.3～0.4 的「掉寶無感」；桌面破壞神的現況證明：掛機加純機率追裝會有幾百小時的乾旱；產生器材料失去主要用途，營地要重想；手機直立要撿、要比、要過濾，畫面很擠

開發成本：大。要把 0.5.0～0.5.2 刪掉的掉落演出、地上標籤、過濾器、撿起統計加回來，並重寫 `docs/工坊與解鎖表.md` 第 4～6 節與產生器的用途（估計，至少兩批）。掛機與增量契合度：低。手機直立：低。

#### C　掉落的「胚」當打造材料

- 優點：戰鬥會掉裝備外型的東西，但它的角色是打造的輸入；像 PoE「好基底決定上限」，老玩家看得懂；量可以壓很低，每件都有用
- 缺點：打造介面多一個「放胚」的選項，新手要多學一步；倉庫與自動分解要多處理一種東西；還是要決定胚有什麼只有掉落才有的特性

開發成本：中。用現有的 `mkItem` 產胚、`craftDo` 加一個可選的胚參數、倉庫多一類（估計一批）。掛機與增量契合度：中。手機直立：中。

#### D　打造當骨幹，加一層追逐掉落（建議）

- 優點：保留打造的可預期進度；補回戰鬥中的驚喜：少數只能掉落的東西（例如五條賽制王各自的特殊裝或零件）；保底進度直接寫在掛機卡上（例如「下一件保底 63%」），解決桌面破壞神式的乾旱；商店頁有「王倒下、光柱」的畫面可以拍
- 缺點：掉率與保底要用 `tools/loot_check.js` 量過再定；追逐物品太強會讓打造變配角，要守住「打造是主線」

開發成本：小到中。沿用 `dropCur`／偽隨機 `prdRoll`、稀有掉落演出 `rareShow`、賽制王的掉落函式；新增一張追逐物品表和保底顯示（估計半批到一批）。掛機與增量契合度：高。手機直立：高（只多一行保底文字）。

## 問題二：桌面破壞神是哪款、是不是純掉落

| 項目 | 內容 |
| --- | --- |
| 判定 | 《桌面破壞神：掛機ARPG》，英文名 Deskrawl: Idle ARPG，Steam app 4623570 |
| 信心 | 高。這是 Steam 商店的官方繁體中文名，巴哈姆特有同名哈啦板，TapTap、3DM、Bilibili 也用同一個名字 |
| 開發與發行 | First Day Games（自稱 2 人工作室）；發行加上 Gamersky Games |
| 上市與價格 | 2026-09-28；台灣原價 NT$159，2026-11-16 特價 NT$111 |
| 形式 | Windows，視窗可縮在桌面底部一直掛；支援繁中在內 13 種語言 |
| 另一個候選 | 《挂机破坏神 IdleWrecker》（Steam 4411600，2026-06-22 上市，107 則 56%）。名字是「掛機」不是「桌面」，可能性低 |

### 它是不是純掉落、沒有增量

不是。裝備確實以掉落為主，商店頁寫「刷取極品裝備」，玩家攻略也是「看資料、打到哪幾件傳奇就轉職業流派」。但它在掉落之外有很多層：

- 做裝類：用靈魂碎片找黑霧夫人賭裝；方塊合成（9 件遠古傳奇有機率換 1 件黑霧裝、9 顆符文合 1 顆）；+10 強化後用開光石開光兩次，每次全屬性 +5%；寶石鑲嵌；符文與符文套裝。
- 增量與長期類：巔峰等級；生活技能樹（自動過濾、自動賣、多一套天賦）；可以抓怪當僕從並升級；投資三座主城開鐵匠、鍊金、神秘商人、拍賣行；難度層級與秘境；離線收益；每月排行榜賽季。
- 經濟：裝備、材料、僕從可以上 Steam 市場交易。
- 沒有在官方公告看到重置式轉生（未查證）。

評價：全部語言約 3,596 則、51% 好評；近 30 天 785 則只剩 36%（大多負評）。近期負評幾乎都在講掉率：

> 600多个小时没掉过神圣和开光石，浪费时间
>
> —— Steam 近期負評，2026-11-15

> 當你3天過去 1件裝備沒再換過 就會發現 很牢很牢
>
> —— 巴哈姆特哈啦板，2026-10-08

開發者的對策也都是在調掉率：單機模式加倍超稀有掉落、之後再提高到 +300%、提高黑雾裝與符文套裝掉率、加合成配方。這說明純機率的追裝放在掛機遊戲裡，玩家會很快撞到乾旱期。

### 其他類似遊戲

Desktop Dungeons 名字有 Desktop，但它是每局約 10 分鐘的解謎式地城，不是掛機。裝備在地城裡撿或用商店買；長期進度是王國建築，用帶回來的金幣升級，開出新的商店道具與準備。Loop Hero、Halls of Torment 也是「局內掉裝、局外升營地或倉庫」。Melvor 是唯一以製作為主的。完整整理在下一節的比較表。

## 同類遊戲比較表

Steam 評價為 2026-11-16 讀取；Melvor、Loop Hero、Halls of Torment 的數字沿用平台評估 Page（[`platform-strategy.md`](platform-strategy.md)）。

| 遊戲 | 裝備怎麼來 | 增量／長期層 | Steam 評價 |
| --- | --- | --- | --- |
| 桌面破壞神（Deskrawl: Idle ARPG） | 掉落為主；另有賭裝、方塊合成、+10 強化、開光、寶石與符文、Steam 市場交易 | 巔峰等級、生活技能樹、僕從養成、城鎮設施、難度層級、離線收益、每月排行榜賽季；沒看到重置式轉生（未查證） | 約 3,596 則 51%；近 30 天 785 則 36% |
| 挂机破坏神（IdleWrecker） | 「主要靠打怪隨機掉落」，另可鍛造、合成傳奇；秘境幣換高階做裝材料 | 23 種難度、秘境層數 | 107 則 56% |
| TBH: Task Bar Hero | 掉落為主；方塊可煉金、9 合 1、用材料做裝 | 英雄等級、區域 | 英文 8,861 則 62% |
| Path of Idle: Old Gods Rising | 商店頁寫掉落、寶箱、做裝、符文之語 | 城鎮建設、塔、賽季（商店頁寫的） | 1,342 則 77% |
| Auto Dungeon（放置地牢） | 傳奇裝、做裝（商店頁） | 未查證 | 48 則 33% |
| Melvor Idle | 主要靠鍛造等製作技能，怪物也會掉 | 20 幾條技能平行升級；沒看到轉生（未查證） | 14,799 則 90% |
| Desktop Dungeons（不是掛機遊戲） | 地城內撿到或用商店買，任務解鎖新道具進商店 | 王國建築用金幣升級，開新商店、職業與準備 | 未列 |
| Loop Hero | 遠征中打怪掉裝 | 營地建築用遠征帶回的資源蓋，開職業、卡片 | 33,939 則 93% |
| Halls of Torment | 每局撿到；透過水井付金幣把道具永久存進倉庫 | 倉庫道具、角色解鎖 | 31,071 則 95% |
| Grim Tides | 戰利品與商店；製作只做藥水、寶石等消耗品 | 船上設施（例如煉金台）；其他未查證 | 未列 |

共通點：評價高的（Melvor、Loop Hero、Halls of Torment）都有一條玩家看得到、一定會前進的長期進度；只靠掉落追裝的掛機暗黑類新作，評價多半在 33～62%。

## 問題三：dpoe 在 Steam 有沒有亮點

坦白說：現在的亮點還在「設計文件」層，還沒變成 30 秒看得懂的畫面。同類在 2026 年很擁擠，光說「掛機 ARPG」不會被注意。

### 跟同類比，dpoe 真正不一樣的地方

- ✅ PoE 等級的深度：3,917 點天賦樹、82 招、77 顆輔助、15 個昇華、PoE 式通貨做裝。桌面破壞神只有 4 職業、天賦較淺。
- ✅ 不靠運氣乾旱：進度靠營地設施，數字算得出還要幾分鐘；開獎放在打造，有偽隨機保底。這正好打中桌面破壞神目前最大的負評。
- ✅ 手機網頁就能免費玩，存檔跨平台。同類的掛機暗黑新作都只有 Windows。
- ✅ 台灣民俗的王與賽制（酆都、陰兵借道、四凶、太歲），在 Steam 上少見。

### 不夠的地方

- ❌ 只有繁體中文（`index.html` 是 zh-Hant）。桌面破壞神支援 13 種語言，同類的主力玩家在簡中與英文。
- ❌ 沒有任何真人數據；方向在約兩週內換了四次類型。
- ❌ 2D Canvas 畫面，跟 3D 的桌面破壞神比，截圖與影片的第一眼吸引力較弱。
- ❌ 深度都藏起來了（照設計原則逐步解鎖），商店頁的前 30 秒看不到 PoE 深度。
- ❌ 沒有「桌面常駐小視窗」模式。桌面破壞神、TBH、Rusty's Retirement 都靠「縮在螢幕底部一直掛」吸引上班族。
- ❌ 戰鬥中沒有讓人心跳的裝備掉落，影片素材少了暗黑類最好拍的那一幕。

### 讓商店頁有說服力，需要什麼

- 一句話主打：「PoE 的做裝深度，掛機也不會乾旱；手機網頁先免費玩」。
- 第一張 GIF：打造翻牌 → 跟身上比 → 換上，數字跳；第二張：營地升一級、地點解鎖。
- 至少加簡體中文；英文看預算。
- Steam 版加一個小視窗或置頂模式（M4S 的 Electron 包殼可以順便做，成本未估）。
- M3 真人試玩的留存數字，再決定要不要開商店頁（照 Q12 C 的規則）。

## 需要 mumi 拍板的選項

### 決策一：裝備怎麼取得

| 選項 | 內容 | 開發成本 | 風險 |
| --- | --- | --- | --- |
| A 維持純打造 | 現狀不變 | 0 | 戰鬥缺驚喜 |
| B 回歸掉裝 | 戰鬥掉成品裝備 | 大（估計至少兩批） | 重演掉寶無感、乾旱 |
| C 掉胚當打造材料 | 王與菁英掉胚，打造時可放入 | 中（估計一批） | 打造介面變複雜 |
| D 打造骨幹＋追逐掉落 | 少數只能掉落的物品，保底進度寫在掛機卡上 | 小到中（估計半批到一批） | 追逐物品不能太強 |

> **製作人建議：D（這是建議，不是決定）**：理由：打造骨幹已經做完，又正好避開桌面破壞神的乾旱負評；D 只補回戰鬥驚喜，成本最低。建議排在 M2，M1 不動。M3 真人試玩如果顯示打造本身就夠有感，D 可以縮小。

### 決策二：Steam 主打什麼

| 選項 | 主打句 | 要補的東西 |
| --- | --- | --- |
| E PoE 深度不乾旱 | PoE 的做裝深度，掛機也不會乾旱 | 前 30 秒要讓人看到做裝深度 |
| F 台灣民俗暗黑 | 酆都、陰兵借道、四凶的掛機打寶 | 王與場景的美術要撐得起 |
| G 桌面常駐 | 縮在螢幕底部一直掛 | Steam 版小視窗或置頂模式（成本未估） |

> **製作人建議：E 為主、F 當包裝（建議）**：E 打中同類最大的負評，也只有 PoE 類能這樣講；F 讓截圖有辨識度。G 放進 M4S 評估，不當主打。

### 決策三：Steam 上架前的語言

| 選項 | 內容 |
| --- | --- |
| H 只有繁中 | 不加成本，市場最小 |
| I 加簡中 | 文字轉換成本低（估計），打到同類主力玩家 |
| J 加簡中與英文 | 市場最大，英文翻譯與介面長度要另外估 |

製作人建議：至少 I，M3 前決定即可（這是建議，不是決定）。

## 來源

- [桌面破壞神：掛機ARPG（Steam 商店，評價與介紹）](https://store.steampowered.com/app/4623570/)（store.steampowered.com）
- [桌面破壞神 價格紀錄與總評價](https://gamesalelog.com/tw/app/4623570/)（gamesalelog.com）
- [桌面破壞神 語言、開發與發行商](https://isitlocalized.com/zh-tw/games/4623570)（isitlocalized.com）
- [桌面破壞神 官方公告（繁中）](https://steamcommunity.com/app/4623570/allnews/?l=tchinese)（steamcommunity.com）
- [桌面破壞神 近期負評](https://steamcommunity.com/app/4623570/negativereviews/?browsefilter=mostrecent&l=english)（steamcommunity.com）
- [Deskrawl 1.1.0：世界王、僕從養成、合成配方](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1847920302236706)（Steam 公告）
- [Deskrawl 1.0.1：開光、開光石](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1845383656394954)（Steam 公告）
- [Deskrawl 1.0.2：符文轉化、單機掉率加倍](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1846018067931744)（Steam 公告）
- [Deskrawl 1.1.11：巔峰等級、生活技能、遠古神聖](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1849192144180924)（Steam 公告）
- [Deskrawl 0.1.10：生活技能系統](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1835871199303024)（Steam 公告）
- [Introduction of Deskrawl（2 人工作室）](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1832700592799329)（Steam 公告）
- [巴哈姆特 桌面破壞神哈啦板：個人心得](https://forum.gamer.com.tw/C.php?bsn=86516&snA=11)（forum.gamer.com.tw）
- [TapTap 桌面破坏神 評價](https://www.taptap.cn/app/943043/review)（taptap.cn）
- [3DM 桌面破坏神 旋風斬流攻略](https://www.3dmgame.com/gl/3989718.html)（3dmgame.com）
- [挂机破坏神 IdleWrecker（Steam 商店）](https://store.steampowered.com/app/4411600/)（store.steampowered.com）
- [挂机破坏神 IdleDiablo（TapTap）](https://www.taptap.cn/app/854633)（taptap.cn）
- [TBH: Task Bar Hero（Steam 商店）](https://store.steampowered.com/app/3678970/)（store.steampowered.com）
- [TBH 方塊：合成、9 合 1、強化](https://taskbarhero.org/en/cube/)（taskbarhero.org）
- [Path of Idle: Old Gods Rising（Steam 商店）](https://store.steampowered.com/app/4243990/)（store.steampowered.com）
- [Auto Dungeon: Idle Adventure（Steam 商店）](https://store.steampowered.com/app/2434370/)（store.steampowered.com）
- [Melvor Idle Wiki：Smithing](https://wiki.melvoridle.com/w/Smithing)（wiki.melvoridle.com）
- [Melvor Idle Wiki：FAQ（防具也能從怪物掉）](https://wiki.melvoridle.com/w/FAQ)（wiki.melvoridle.com）
- [Desktop Dungeons（Steam 商店）](https://store.steampowered.com/app/226620/)（store.steampowered.com）
- [Desktop Dungeons Wiki：Items](https://qcfdesign.com/wiki/DesktopDungeons/index.php?title=Items)（qcfdesign.com）
- [Desktop Dungeons Wiki：Unlockables（王國建築）](https://qcfdesign.com/wiki/DesktopDungeons/index.php?title=Unlockables)（qcfdesign.com）
- [Desktop Dungeons Wiki：New Players Guide](https://qcfdesign.com/wiki/DesktopDungeons/index.php?title=New_Players_Guide)（qcfdesign.com）
- [Loop Hero 資源與營地整理](https://teemo.dev/game-design/loop-hero/systems/resources-and-camp-reference/)（teemo.dev）
- [Halls of Torment 倉庫與水井說明](https://www.gamepressure.com/newsroom/item-stash-in-halls-of-torment-explained/z95aba)（gamepressure.com）
- [Grim Tides Wiki：Items](https://gt.miraheze.org/wiki/Items)（gt.miraheze.org）
- [Grim Tides Wiki：Grave Concoctions（製作）](https://gt.miraheze.org/wiki/Grave_Concoctions)（gt.miraheze.org）
- [桌面常駐小遊戲的流行（Rusty's Retirement 等）](https://www.gamepressure.com/newsroom/from-rustys-retirement-to-tiny-pasture-the-new-wave-of-desktop-bu/z679b4)（gamepressure.com）
- [dpoe 平台策略評估 Page（Melvor、Loop Hero、Halls of Torment 評價數字）](https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/60da64d9-8faa-4f56-8a3b-1126a93c934b)（Page）
- [repo：docs/工坊與解鎖表.md（0.5 權威）](https://github.com/Shiroyashatw/dpoe/blob/main/docs/%E5%B7%A5%E5%9D%8A%E8%88%87%E8%A7%A3%E9%8E%96%E8%A1%A8.md)（github.com）
- [repo：docs/試玩報告_0.4.9_Opus.md](https://github.com/Shiroyashatw/dpoe/blob/main/docs/%E8%A9%A6%E7%8E%A9%E5%A0%B1%E5%91%8A_0.4.9_Opus.md)（github.com）
- [repo：docs/待做清單.md](https://github.com/Shiroyashatw/dpoe/blob/main/docs/%E5%BE%85%E5%81%9A%E6%B8%85%E5%96%AE.md)（github.com）
- [repo：docs/打寶遊戲比較.md](https://github.com/Shiroyashatw/dpoe/blob/main/docs/%E6%89%93%E5%AF%B6%E9%81%8A%E6%88%B2%E6%AF%94%E8%BC%83.md)（github.com）
- [repo：docs/增量遊戲參考.md](https://github.com/Shiroyashatw/dpoe/blob/main/docs/%E5%A2%9E%E9%87%8F%E9%81%8A%E6%88%B2%E5%8F%83%E8%80%83.md)（github.com）
- [repo：js/craft.js](https://github.com/Shiroyashatw/dpoe/blob/main/js/craft.js)（github.com）
