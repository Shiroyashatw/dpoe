# dpoe 平台策略評估：Steam vs 手機

> 本檔由製作人從 Page 同步，來源：<https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/60da64d9-8faa-4f56-8a3b-1126a93c934b>；同步日期：2026-11-16；請勿直接在 repo 修改，改動請經製作人

結論：mumi 說的「手機付費意願低」在買斷制底下成立，在內購制底下不成立。製作人建議 C：同一份程式，Steam 買斷當主要收入，免費網頁版導流；M0、M1 照舊。資料讀取日 2026-11-16。

## 決定：Q12 C（mumi 2026-11-16）

mumi 選 **C：同一份程式做雙平台；Steam 買斷是主要收入，網頁／PWA 免費導流。** 落到里程碑（依 GDD，任務細節見 [`milestones.md`](milestones.md)）：

| 範圍 | 變動 |
| --- | --- |
| 平台規則 | 改成分階段：M0–M1 手機直立優先；M2 起直立 390×844 與桌機 1280×720 同級；M4 Steam 線加驗 Steam Deck 1280×800（見 [`gdd.md`](gdd.md#平台優先順序分階段)） |
| M0、M1 | 照舊，已交辦的任務不改 |
| M2 | M2-04 桌機縮放升 P0；新增 M2-16 桌機 1280×720 版面規格（Game Art Director） |
| M3 | 真人試玩通過後：M3-08 Steam Direct 註冊與上架費（mumi 執行）、M3-09 Steam 商店頁素材、M3-10 商店頁上線（Coming Soon）與願望單追蹤 |
| M4 | 拆成 M4P（PWA 線，原 M4-01～05 改編 M4P-01～05）與 M4S（Steam 線：包殼、Steam 雲端存檔、成就、Steam Deck 驗證、上架） |
| 待決 | Q13：免費版與付費版的內容差異，M3 前決定（見 [`gdd.md`](gdd.md#待決事項)） |

編號以企劃書的 M4P、M4S 為準。本檔評估原文裡的寫法對照：

| 其他文件的寫法 | 企劃書編號（以此為準） |
| --- | --- |
| 平台評估的 M4a（PWA） | M4P |
| 平台評估的 M4b（Steam） | M4S |
| Game Art Director 訊息裡的 M4-03 | M4P-03 |
| 平台評估的 M4-02、M4-05 | M4P-02、M4P-05 |

## 結論（評估原文）

**建議 C：同一份程式雙平台，Steam 買斷當主要收入。** 買斷制底下，同一款遊戲在 Steam 每位玩家帶來的淨收入，約是手機的 18 倍（Loop Hero 估算）。內購制底下手機可以賺很多（AFK Arena 終身 $1.5B），但要扭蛋與長期營運，跟 dpoe 的設計和人力不合。M0、M1 已交辦的工作不用重做；從 M2 起把桌機提升到和直立同級，M4 拆成 PWA 與 Steam 兩條。

- 同類深度掛機遊戲（Melvor、NGU、Idle Champions）在 Steam 都有 50 萬以上擁有者；NGU 根本沒有手機版，Idle Champions 在 Google Play 只有 10 萬+ 安裝。
- Melvor 的路徑跟 dpoe 很像：純 JavaScript，先在網頁公開，再上 Steam 買斷 $9.99、手機免費試玩＋解鎖，雲端存檔跨平台。
- 風險：Steam 的 Idler 標籤 2025 年新增 1,034 款，中位數只有 15 則評論，41% 不到 10 則。上 Steam 不代表有人買，願望單要提早經營。
- dpoe 還沒有任何真人數據（Q2 只用 AI），所以所有收入數字都只是同類參考，不是預測。

## 四個選項

### A　維持手機優先

| 項目 | 內容 |
| --- | --- |
| 收益假設 | PWA 本身收不到錢。要收費得上 App Store／Google Play：買斷或試玩＋解鎖（Loop Hero 手機每次下載約 $0.35），或內購＋廣告（要長期營運） |
| 成本 | 最低。Apple 年費 $99、Google 一次 $25，年收入 $1M 內抽成 15% |
| 里程碑影響 | 無變動 |

- 優點：不用改任何已交辦工作；掛機遊戲很適合手機短時間查看；手機下載量大（Vampire Survivors 3 個月 510 萬次）
- 缺點：手機買斷每位玩家收入很低；iOS PWA 不能背景執行，只靠開啟時結算離線進度；PoE 老玩家主要在 PC

### B　Steam 主打、桌機優先

| 項目 | 內容 |
| --- | --- |
| 收益假設 | Steam 買斷 $5–10；Idler 前 10% 約 1 萬份，淨收入約 $2.3–4.7 萬（估算，見下方情境） |
| 成本 | Steam Direct $100（毛收入滿 $1,000 退回）；抽成 30%；Electron 包殼、成就、雲端存檔、Steam Deck 測試；商店頁美術；至少數月願望單經營 |
| 里程碑影響 | 規則改成桌機先；M1 第二批直立版型要部分重排；M1-22、M2-04、M4 全改 |

- 優點：買斷制下收入最高；PoE 與深度掛機玩家都在 PC；Steam 願望單通知、特賣能帶流量
- 缺點：打斷 mumi 剛定的直立規則，M1 第二批有一部分白做；Steam 掛機遊戲非常擁擠；放棄手機短時間查看的優勢

### C　同一份程式雙平台（建議，mumi 已選）

| 項目 | 內容 |
| --- | --- |
| 收益假設 | Steam 買斷當主要收入；網頁／PWA 免費（完整或試玩）當導流；手機商店之後用試玩＋解鎖補充 |
| 成本 | B 的 Steam 成本，加上每版直立與桌機都要完整驗（測試員估桌機每輪 40–50 分鐘） |
| 里程碑影響 | M0、M1 照舊；M2 起規則改「直立 390×844 與桌機 1280×720 同級，都要過」；M2-04 升 P0；M3 開 Steam 商店頁收願望單；M4 拆成 M4a PWA、M4b Steam（GDD 編號為 M4P、M4S） |

- 優點：已交辦工作不白做（規格已附桌機延伸）；跟 Melvor 的成功路徑一致；網頁版可當 Steam 的免費試玩與導流
- 缺點：兩種版型都要維護，驗收工作量變大；Steam 包殼與存檔要多一套；要同時經營兩個管道

### D　先用免費網頁版驗證再決定

| 項目 | 內容 |
| --- | --- |
| 收益假設 | 短期 0；M3 真人試玩後用留存數據決定平台 |
| 成本 | 最低；只加匿名數據（M4-05 已排；現編號 M4P-05）與社群曝光（例如 r/incremental_games，約 19 萬成員） |
| 里程碑影響 | 到 M3 都不變 |

- 優點：不花錢、不改規則；用真人數據決定，不靠同類推測
- 缺點：Steam 願望單晚開始累積；如果最後選 Steam，M2、M3 做的直立版型可能還要回頭補桌機

## 製作人建議

建議 C，並把 D 的驗證關卡放進去：M0、M1 照現行規則做完；M2 起桌機 1280×720 與直立同級；M3 真人試玩（Q7）過了再開 Steam 商店頁收願望單；M4 先上免費 PWA，再上 Steam 買斷版。

- 買斷制下 Steam 每位玩家的淨收入遠高於手機，mumi 的直覺在這個前提下是對的。
- dpoe 是深度 build 遊戲（82 招、天賦 3,917 點），同類深度掛機遊戲的主場都在 Steam。
- 純 JS＋Canvas 包成 Steam 版技術上可行，Melvor 已經證明。
- C 不推翻已交辦的 M1 第二批規格，B 會。
- 放在 M3 之後開商店頁，是因為現在還沒真人數據；先確認留存再花錢花時間經營願望單。

## 選項比較表

| 選項 | 收益假設 | 成本 | 里程碑影響 | 主要風險 |
| --- | --- | --- | --- | --- |
| A 維持手機優先 | PWA 免費；要收費得上 App Store／Google Play，走試玩＋解鎖或內購廣告 | 最低；照現行 | 無變動 | 手機買斷每位玩家收入低；內購要長期營運 |
| B Steam 主打、桌機優先 | Steam 買斷 $5–10 | Steam $100、包殼與 Steam 功能、商店頁、願望單經營；M1 第二批版面重排 | 規則改桌機先；M1 驗收順序、M2-04、M4 全改 | Idler 標籤擁擠：中位數 15 則評論 |
| C 同一份程式雙平台 | Steam 買斷為主收入；網頁／PWA 免費導流；手機商店之後再做 | B 的 Steam 成本＋兩種版型都要驗 | M0／M1 照舊；M2 起桌機與直立同級；M4 拆成 PWA 與 Steam 兩條 | 驗收工作量變大 |
| D 先免費網頁驗證再決定 | 短期 0；用真人留存數據決定平台 | 最低；只加匿名數據與社群曝光 | 到 M3 都不變；M3 後再決定 | Steam 願望單晚開始累積 |

## 證據：同類遊戲在 Steam 與手機

### Steam

評論數依 SteamSpy 正評＋負評，2026-11-16 讀取。銷量估算＝評論數 ×30（區間 ×20–×40），只適用買斷制，誤差可達 ±40%。

| 遊戲 | 模式與價格 | 評論數（好評率） | 銷量估算 | 其他公開數據 |
| --- | --- | --- | --- | --- |
| Melvor Idle | 買斷 $9.99 | 14,799（90%） | 約 44 萬份（30–59 萬） | Raijin 估 42.6 萬份、毛收入 $3.41M；SteamStat 估 69 萬份、$5.2M |
| Idle Slayer | 免費＋內購 | 8,767（85%） | 不適用（免費） | SteamSpy 擁有者 50–100 萬 |
| NGU Idle | 免費＋內購 | 13,079（96%） | 不適用（免費） | SteamSpy 擁有者 50–100 萬；收入查無公開數據 |
| Idle Champions | 免費＋內購（扭蛋箱） | 15,107（77%） | 不適用（免費） | SteamSpy 擁有者 100–200 萬 |
| Loop Hero | 買斷 $14.99 | 33,939（93%） | 約 102 萬份（68–136 萬） | 官方：2021 年 12 月破 100 萬份 |
| Halls of Torment | 買斷 $6.66 | 31,071（95%） | 約 93 萬份（62–124 萬） | SteamSpy 擁有者 50–100 萬 |
| Vampire Survivors | 買斷 $4.99 | 252,951（98%） | 約 759 萬份（506–1,012 萬） | SteamSpy 擁有者 500–1,000 萬 |

### 手機

| 遊戲 | 模式 | 下載量 | 評分 | 收入 |
| --- | --- | --- | --- | --- |
| Melvor Idle | 免費試玩＋一次解鎖 $9.99（iOS） | App Store 50 萬+、Google Play 50 萬+ | iOS 4.72★（1.6 萬則） | iOS 每月 <$10K（AppGoblin，低可信度）；終身收入查無公開數據 |
| Idle Slayer | 免費＋內購＋廣告 | 合計 1,000 萬+（Google Play 500 萬+） | iOS 4.8★（2.8 萬）、GP 4.5★（13.5 萬） | Google Play 每月 $18.8K–$90K（AppGazers，區間很寬） |
| NGU Idle | 沒有手機版 | — | — | 只有 PC／網頁 |
| Idle Champions | 免費＋內購（扭蛋箱、訂閱） | Google Play 10 萬+ | 3.8★（4,600 則） | 查無公開數據 |
| Loop Hero | 第一章免費＋解鎖 $6.99 | 2 個月 112 萬次 | — | 終身淨收入 $390.8K（AppMagic，扣平台費） |
| Halls of Torment | 免費版＋Premium 付費版 | 查無公開數據 | — | 查無公開數據 |
| Vampire Survivors | 完全免費，跑完可看廣告；後加約 $2 的 DLC | 3 個月 510 萬次 | — | DLC 內購終身破 $1M；廣告收入未公開 |
| AFK Arena（純手機） | 免費＋扭蛋、訂閱、禮包 | 4,500 萬+ | — | 終身 $1.5B+（AppMagic）；每次下載收入 $22.1（Udonis） |

### Loop Hero：同一款遊戲，每位玩家帶來的淨收入

美元，估算。Steam：$14.99 × 0.75（折扣與區域價）× 0.82（退款與稅）× 0.70（扣抽成）。手機：AppMagic 終身淨收入 $390.8K ÷ 112 萬次下載。

| 平台 | 每位玩家淨收入 |
| --- | --- |
| Steam（每份） | $6.45 |
| 手機（每次下載） | $0.35 |

評價差異：Melvor 在 Steam 90% 好評、iOS 4.72★；Idle Slayer 在 Steam 85%、iOS 4.8★、Google Play 4.5★；Idle Champions 在 Steam 77%、手機 3.8★。手機評分普遍不低，差別主要在付費方式，不在口碑。

## 證據：付費意願

| 指標 | 數據 | 來源 |
| --- | --- | --- |
| 手機免費遊戲付費率 | 活躍玩家 2–5%，強的約 5%；安裝 30 天內首購 3–5% | Omega Point 彙整 Business of Apps、Udonis；Luca Barberis |
| 手機收入集中度 | 前 5% 付費者貢獻 48% 收入，前 10% 貢獻 64% | Moloco 2025 |
| 手機 ARPPU | 美國 App Store 付費者 90 天 ARPPU 超過 $100 的比例：2024 年 22%、2025 年 32%（各類型前 10 名） | AppMagic Monetization Report 2025 |
| 手機買斷遊戲規模 | 2023 年付費 App 遊戲收入 $1.27B，2024 預估 $1.36B；約占手機遊戲內購 $81B 的 1.7%（自行相除） | Mistplay；Moloco 引 Sensor Tower |
| 手機行銷成本 | 手機遊戲公司約把四分之一收入花在行銷 | Bain（Mobilegamer.biz 引用） |
| Steam 抽成 | 30%；單款超過 $10M 的部分 25%，超過 $50M 的部分 20% | Wccftech、Ars Technica |
| Apple／Google 抽成 | 年收入 $1M 內 15%；Apple 年費 $99、Google 一次 $25 | Apple Small Business Program；Glassly |
| Steam Idler 價格帶 | 中位數 $3.99，14% 免費 | PlayRecon |

判斷：買斷制底下「手機付費意願低」成立。Loop Hero 手機每次下載約 $0.35，Steam 每份約 $6.45；Vampire Survivors 作者也說手機收費會「直接擋掉大批玩家」，所以手機版做成免費。內購制底下不成立：AFK Arena 每次下載 $22.1，但它靠扭蛋、訂閱與大量行銷，dpoe 目前沒有這些系統，也沒有營運人力。

## 證據：目標玩家在哪

- PoE 本身在 Steam（免費）與主機上，PoE 老手主要在 PC。PoE 玩家在手機上的分布：查無公開數據。
- 增量遊戲社群：r/incremental_games 約 19.2 萬成員，一年成長 19%。
- Steam Idler 標籤：2024 年新增 634 款、2025 年 1,034 款，在 GameDiscoverCo 的 2025 年熱門類型排名上升 46 名到第 15 名。
- Melvor 在 Steam 的遊玩時間中位數 56.9 小時（PlayTracker），屬於長時間深度玩家。
- 掛機特性：手機適合短時間查看，但 iOS PWA 不能在背景執行（只能推播），離線進度只能在開啟時結算，這點 dpoe 已經有。桌機適合開在第二螢幕或角落掛著，Steam 近年「桌面陪伴型」掛機遊戲（例如 Rusty's Retirement）就是這個用法。
- 結論：深度 build 玩家偏 PC；輕度查看偏手機。dpoe 的深度偏前者，所以收費主場放 Steam，手機當查看與導流。

## 技術路徑與成本

| 項目 | 做法 | 成本或限制 |
| --- | --- | --- |
| 包成 Steam 版 | Electron＋steamworks.js（建議）；NW.js＋Greenworks；Tauri＋steamworks crate | Electron 內建 Chromium，各機器一致但檔案大；Tauri 小但 Linux／Mac 用 WebKit，Canvas 表現要另測 |
| Steam 存檔與雲端 | 存檔改寫到 app data 檔案，開 Steam Auto-Cloud | localStorage 可能被重裝清掉；要跟現有 Supabase 雲端存檔定好誰優先（接 M4-02；現編號 M4P-02） |
| 成就、Steam Deck | steamworks.js 成就；出 Linux 版或用 Proton 測 | Deck 要手把操作、字級放大 |
| Steam 上架 | Steam Direct $100；付費後等 21 天才能發佈；商店頁至少公開 2 週 | 毛收入滿 $1,000 退回 $100 |
| 願望單預熱 | 首週銷量中位數約願望單的 10.5%（售價超過 $10 約 10%） | 首月淨收入 $1 萬約需 7,600 個願望單（$14.99 情境） |
| 手機：PWA | 現有 manifest＋M4 的 service worker | 免上架費；不能在商店收費；iOS 主畫面版才不受 7 天儲存上限 |
| 手機：Google Play | Bubblewrap 把 PWA 包成 TWA | $25 一次；15% 抽成 |
| 手機：App Store | Capacitor 包殼 | $99／年；純網頁殼可能被 4.2 條（最低功能）退件，要加原生功能與 StoreKit |

同一份程式雙平台可行：dpoe 已支援手機直立、橫向與桌機，沒有建置步驟，Electron 直接載入同一份 index.html。要多做的是 Steam 專屬的存檔層、成就、桌機寬螢幕版型（M2-04）與手把操作。

## 對現行規則與 M0–M4 的影響（評估當時）

以 B（Steam 先、桌機優先）為最壞情況；C 只動 M2-04 與 M4。mumi 已選 C，實際落地見本檔開頭的「決定」一節。

| 任務 | 影響 | 說明 |
| --- | --- | --- |
| M0-01～07（緊急修正） | 不受影響 | 兩平台都要；M0-04 快捷鍵對桌機更重要 |
| M1 第一批的邏輯任務：M1-01、06、07、08、09、10、13、14、15、16、17、20、21、24 | 不受影響 | 規則、文案、計算與平台無關 |
| M1-03 天賦樹標籤 | 不受影響 | 兩種尺寸都要 |
| M1-05 手機橫向切換鈕 | B 下價值降低 | 已交辦，做完可保留 |
| M1-BASE 色票、字階、狀態 | 大多沿用 | 殼層與觸控規則要補桌機版 |
| M1-SK、M1-PK、M1-CP、M1-02、M1-04、07b、09b、14b、15b、16b、18、20b | B 下要部分重做 | 文案、狀態、規則沿用；直立版型要改成桌機先排。規格已附 1280×720、1440×900 延伸，但定位是次要 |
| M1-11 護符不用拖曳換、M1-12 直立角色面板 | B 下降為次要 | 手機專屬問題 |
| M1-22、M1-23 驗收 | B 下順序要改 | 改成桌機先、直立後 |
| M2-04 寬桌機縮放 | B、C 下升為 P0 | Steam 版主要在桌機全螢幕玩，黑邊與縮放要先解決 |
| M4 PWA 正式發佈 | B 要改寫；C 要拆兩條 | Steam 線：Electron＋steamworks.js、存檔改寫檔案＋Steam Cloud 與 Supabase 對齊、成就、Steam Deck 與手把、商店頁與願望單 |

## dpoe 在 Steam 的收入情境

估算，不是預測。評論數取 PlayRecon 的 Idler 分布（2023-08 到 2026-08 發售的 3,053 款）；銷量＝評論 ×30（×20–×40）；每份淨收入＝售價 × 0.75 × 0.82 × 0.70。

| 情境 | 銷量 | 淨收入（$4.99） | 淨收入（$9.99） |
| --- | --- | --- | --- |
| Idler 中位數（15 則評論） | 約 450 份 | $967 | $1,935 |
| Idler 前 25%（71 則） | 約 2,130 份 | $4,575 | $9,159 |
| Idler 前 10%（361 則） | 約 10,830 份 | $23,263 | $46,569 |
| Melvor 級（14,799 則） | 約 44 萬份 | $95 萬 | $191 萬 |

大多數 Idler 遊戲落在前兩列。要進前 10%，需要上架前累積數千到上萬個願望單，以及前 48 小時的好評。

## 還不確定的地方

- Melvor 的手機終身收入、Android 收入：查無公開數據（只有 AppGoblin 估 iOS 每月 <$10K，可信度低）。
- NGU Idle、Idle Champions 的收入：查無公開數據（第三方 Steam 估算方法不明，未採用）。
- Halls of Torment 手機版下載與收入：查無公開數據。
- 增量／掛機類別專屬的手機付費率與 ARPPU：查無公開數據，只有手機免費遊戲整體 2–5%。
- Steam 掛機玩家與手機掛機玩家的人數比、PoE 玩家的平台分布、繁中與台灣市場在兩個平台的差異：查無公開數據。
- Boxleiter 換算誤差中位數約 40%，情境表只能當量級參考。
- dpoe 本身沒有真人留存數據；Tauri／Electron 在 Steam Deck 上跑 dpoe 的 Canvas 效能未實測。

## 來源

全部於 2026-11-16 讀取。

- [Melvor Idle 1.0 上市（PC 與手機、100 萬玩家、定價）](https://www.jagex.com/news/melvor-idle-version-1-0-launches-on-pc-and-mobile)（Jagex）
- [Melvor Idle Steam 銷量與收入估算](https://raijin.gg/app/1267910/Melvor_Idle/sales-revenue)（Raijin）
- [Melvor Idle Steam 銷量估算與方法](https://steamstat.io/app/1267910/sales)（SteamStat）
- [Melvor Idle 手機下載量](https://appinsider.io/apps/melvor-idle-1518963622)（AppInsider）
- [Melvor Idle iOS 收入估算](https://appgoblin.info/apps/1518963622)（AppGoblin）
- [Melvor Idle 遊玩時間](https://playtracker.net/insight/game/64270)（PlayTracker）
- [Idle Slayer 手機下載、評分、商業模式](https://appinsider.io/apps/idle-slayer-addictive-clicker-1526599527)（AppInsider）
- [Idle Slayer Google Play 收入估算](https://appgazers.com/reports/apps/android-com.pabloleban.IdleSlayer)（AppGazers）
- [Idle Champions 手機下載與評分](https://appinsider.io/apps/idle-champions-1339874088)（AppInsider）
- [NGU Idle 沒有手機版](https://www.reddit.com/r/nguidle/comments/1f1m18w/web_version_doesnt_work_on_mobile/)（Reddit r/nguidle）
- [Loop Hero 手機 112 萬下載、$390.8K](https://gameworldobserver.com/2024/07/10/loop-hero-mobile-1-million-downloads-playdigious)（Game World Observer）
- [Halls of Torment 手機 Premium 版上架](https://www.gamespress.com/The-waiting-is-over-Halls-of-Torment-Premium-is-now-available-on-App-S)（Games Press）
- [Vampire Survivors 手機免費策略](https://www.pcgamer.com/vampire-survivors-studio-says-it-couldnt-find-a-non-predatory-mobile-developer-so-it-did-the-job-itself/)（PC Gamer）
- [Vampire Survivors 手機 510 萬下載](https://mobilegamer.biz/vampire-survivors-mobile-hits-5m-downloads/)（Mobilegamer.biz）
- [Vampire Survivors 手機 DLC 破 $1M、Bain 行銷占比](https://mobilegamer.biz/data-digest-best-fiends-at-10-game-streaming-stats-us-market-and-marketing-spend-data-more/)（Mobilegamer.biz）
- [AFK Arena 終身 $1.5B](https://www.pocketgamer.biz/afk-arena-celebrates-seventh-anniversary-and-over-15bn-in-lifetime-earnings/)（PocketGamer.biz）
- [AFK Arena 下載量與每次下載收入](https://www.blog.udonis.co/mobile-marketing/mobile-games/afk-arena-analysis)（Udonis）
- [SteamSpy（評論數、擁有者區間）](https://steamspy.com/app/1267910)（SteamSpy）
- [Steam 評論換算銷量（2022 後約 ×30）](https://www.steampageanalyzer.com/blog/steam-review-to-sales-multiplier)（Steam Page Analyzer）
- [Boxleiter 研究彙整](https://flockbay.com/blog/steam-review-to-sales-ratio/)（Flockbay）
- [手機付費率基準](https://omegapoint.systems/benchmarks/iap-conversion-payer)（Omega Point）
- [付費使用者占比定義與基準](https://lucabarberis.com/operator-atlas/free-to-play-gaming/paying-user-share/)（Luca Barberis）
- [2025 State of Mobile Gaming](https://www.moloco.cloud/hubfs/Gaming%20Trends/Moloco%202025%20State%20of%20Mobile%20Gaming.pdf)（Moloco）
- [Moloco 報告摘要（Sensor Tower 類型收入）](https://gamedevreports.substack.com/p/moloco-mobile-games-in-2025)（GameDev Reports）
- [Monetization Report 2025](https://appmagic.rocks/files/view/upload/Reports/EN_Monetization_Report_2025.pdf)（AppMagic）
- [手機付費 App 遊戲收入](https://business.mistplay.com/resources/mobile-game-monetization)（Mistplay）
- [Steam Direct 費用](https://partner.steamgames.com/doc/gettingstarted/appfee?language=english)（Steamworks）
- [Steam 商店頁 Coming Soon 規定](https://partner.steamgames.com/doc/store/coming_soon)（Steamworks）
- [Steam 開發者上架流程](https://partner.steamgames.com/doc/gettingstarted/onboarding)（Steamworks）
- [Steam 分成級距](https://wccftech.com/valve-updates-revenue-share-tiers/)（Wccftech）
- [Steam 分成級距（$10M 以上 25%、$50M 以上 20%）](https://arstechnica.com/gaming/2018/12/steam-now-gives-its-biggest-developers-a-bigger-cut-of-the-revenue/)（Ars Technica）
- [App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/)（Apple Developer）
- [App Store 與 Google Play 上架費用](https://glassly.dev/blog/how-much-does-it-cost-to-publish-an-app)（Glassly）
- [App Review Guidelines（4.2）](https://developer.apple.com/app-store/review/guidelines/)（Apple Developer）
- [PWA 上架 Google Play（TWA）](https://developers.google.com/codelabs/pwa-in-play)（Google for Developers）
- [iOS PWA 限制](https://progressivewebapps.com/platforms/ios-safari/)（progressivewebapps.com）
- [WebKit 儲存政策](https://webkit.org/blog/14403/updates-to-storage-policy/)（WebKit）
- [網頁遊戲上 Steam：包殼與 Steamworks](https://flockbay.com/blog/html5-game-on-steam/)（Flockbay）
- [steamworks.js](https://github.com/ceifa/steamworks.js/)（GitHub）
- [Steam 願望單轉換率](https://www.steampageanalyzer.com/blog/steam-wishlist-conversion-rates)（Steam Page Analyzer）
- [Steam Idler 標籤統計](https://app.playrecon.com/market/Idler)（PlayRecon）
- [2021 vs 2025 熱門 PC 類型（Idler 升到第 15）](https://newsletter.gamediscover.co/p/how-have-the-genres-of-hit-pc-games)（GameDiscoverCo）
- [r/incremental_games 成員數](https://kissmypost.com/subreddit/incremental_games)（KissMyPost）
- [Steam 桌面陪伴型掛機遊戲](https://www.gamepressure.com/newsroom/from-rustys-retirement-to-tiny-pasture-the-new-wave-of-desktop-bu/z679b4)（gamepressure.com）
