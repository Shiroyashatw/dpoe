# dpoe 製作文件（docs/production/）

> 本檔由製作人從 Page 同步，來源：<https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/a647bf26-aa82-4684-8c89-311e76640026>（企劃書；各檔來源見下表）；同步日期：2026-11-16；請勿直接在 repo 修改，改動請經製作人

這個資料夾放 dpoe 的製作文件：方向決策、里程碑與任務驗收、UI 規格、審查與測試報告。原件是製作人與其他 bot 維護的 Page；雲端程式 agent 讀不到 Page，所以由製作人同步成 markdown 放在這裡。**交辦任務時會直接指向這裡的檔案路徑。**

## 檔案索引

| 檔案 | 用途 | 什麼時候讀 | 來源 Page | 同步日期 |
| --- | --- | --- | --- | --- |
| [`gdd.md`](gdd.md) | 方向與定位、商業模式、平台優先順序（分階段）規則、核心玩法、完整決策紀錄、待決事項、缺口與風險 | 開工前先讀；遇到「要不要這樣做」的問題時 | [dpoe 遊戲企劃書（GDD）](https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/a647bf26-aa82-4684-8c89-311e76640026) | 2026-11-16 |
| [`milestones.md`](milestones.md) | M0–M4（含 M4P、M4S）與全部任務：負責人、優先、狀態、完成標準、依賴；驗收判準；M2-17 追逐掉落草案（製作人草案，待數值設計師定稿）；團隊分工（含數值設計師）；M1-08、M1-13 定稿文案原文；README 0.5.4 要點 | 接到任務時；寫教學、解鎖、空狀態文案時；驗收前。**2026-11-16 21:56 重排（網頁試玩版上癮度優先、Steam 延後）在檔案開頭** | [dpoe 遊戲企劃書（GDD）](https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/a647bf26-aa82-4684-8c89-311e76640026) | 2026-11-16 |
| [`ui-spec-m1.md`](ui-spec-m1.md) | M1 直立視覺規格完整轉換（BASE-01～05、M1-SK／PK／CP、M1-02、04、07b、09b、10、11、12、14、14b、15b、16b、17、18、20b、375×667 與桌機延伸、「已決定」日誌）。**M1 介面的實作依據** | 實作或驗收任何 M1 介面任務時 | [dpoe M1 直立視覺規格](https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/91bce2cc-463c-400c-adf4-8ed14ac0ba8c)（Game Art Director；之後加桌機章節，對應 M2-16） | 2026-11-16 |
| [`ui-review.md`](ui-review.md) | Game Art Director 的 0.5.4 UI/UX 審查：P0／P1／P2 問題與修法，含桌機與 390×844 直立重審、逐頁 A–H、未拍到的畫面 | 想知道某條規格「為什麼」時；排 M2–M3 介面任務時 | [dungeonPOE 0.5.4 UI/UX 審查](https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/336b8159-f1b5-4c87-a395-5569d4890abf) | 2026-11-16 |
| [`playtest-0.5.4.md`](playtest-0.5.4.md) | 遊戲測試員 v0.5.4 測試報告重點：必須修 3 項（含重現步驟）、建議改善、嚴重度、對應任務、未測項目 | 修 bug 或重現問題時；驗收 M0-07 時（M1-22 已取消，mumi 2026-11-17） | [dpoe 測試報告 v0.5.4](https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/6c7a71e8-8701-48bb-9b53-536999d79ef9) | 2026-11-16 |
| [`platform-strategy.md`](platform-strategy.md) | 平台評估（Steam vs 手機）：結論、四個選項、Q12 C 決定、對里程碑的影響、證據與來源連結 | 動到 Steam、PWA、桌機版型、收費相關任務時 | [dpoe 平台策略評估：Steam vs 手機](https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/60da64d9-8faa-4f56-8a3b-1126a93c934b) | 2026-11-16 |
| [`loot-and-steam-eval.md`](loot-and-steam-eval.md) | 裝備取得方式（打造 vs 掉落）與 Steam 亮點評估：dpoe 現況、掉裝無感的證據、A–D 做法、桌面破壞神（Deskrawl）分析、同類比較表、主打 E／F／G 與語言 H／I／J 選項、來源。mumi 已決定 Q14 D、Q15 E＋F、Q16 I（見 `gdd.md`） | 動到追逐掉落（M2-17～20）、Steam 商店頁與主打（M3-09～11）、簡體中文（M3-12～13，Q17 B 已延到 Steam 階段）時 | [dpoe 裝備取得方式與 Steam 亮點評估](https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/167c56bb-e9cf-4954-b91f-3d39084385bd) | 2026-11-16 |
| [`spec-m2-05-combat-readability.md`](spec-m2-05-combat-readability.md) | 地面效果不寫字、傷害數字合併與排隊、升級只留一個提示；390×844 與 1280×720 前後對照；「需製作人決定」各項已於 2026-11-17 10:29 決定（見 `gdd.md` 決策紀錄） | 實作 M2-06 時 | [dpoe M2-05 戰鬥畫面可讀性規格](https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/8f6f90a5-c3cf-409d-93db-07665a38a80b)（Game Art Director） | 2026-11-17 |
| [`spec-m2-11-camp-scene.md`](spec-m2-11-camp-scene.md) | 藏身處併入營地的場景、設施位置、互動與 390×844／1280×720 版面；「需製作人決定」各項已於 2026-11-17 10:29 決定（見 `gdd.md` 決策紀錄） | 實作 M2-12、M2-13 時 | [dpoe M2-11 營地場景規格（藏身處併入營地）](https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/b7342926-f3b7-401e-bf26-104f79697b1c)（Game Art Director） | 2026-11-17 |
| [`spec-m3-04-polish.md`](spec-m3-04-polish.md) | 動作詞統一、對比、開場跳過鈕、離線摘要版型；「需製作人決定」各項已於 2026-11-17 10:29 決定（見 `gdd.md` 決策紀錄） | 實作 M3-05、M2-25 離線摘要時 | [dpoe M3-04 介面 P2 打磨規格](https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/aad077a8-5ccc-4ce7-8ca3-079d30568bd6)（Game Art Director） | 2026-11-17 |
| [`spec-m4p-03-pwa.md`](spec-m4p-03-pwa.md) | PWA 圖示與啟動畫面尺寸表、母版畫法、安裝說明頁（兩個 iPad Pro 啟動畫面尺寸待核對）；「需製作人決定」各項已於 2026-11-17 10:29 決定（見 `gdd.md` 決策紀錄） | 做 M4P 線、PWA 安裝相關時 | [dpoe M4P-03 PWA 圖示、啟動畫面、安裝說明頁規格](https://cursor.com/canvas/store-82cf5215-7bf0-49e1-b610-9b76fbf158ee/4a048eaf-301e-4490-9f07-81ced2fe7050)（Game Art Director） | 2026-11-17 |

## 以哪份為準（優先順序）

本資料夾內的檔案互相衝突時，照這個順序：

1. **決策紀錄**（`gdd.md` 的「決策紀錄」與「平台優先順序（分階段）」）
2. **里程碑任務**（`milestones.md` 的任務表、完成標準、驗收判準、定稿文案）
3. **UI 規格**（`ui-spec-m1.md`、`spec-m2-05-combat-readability.md`、`spec-m2-11-camp-scene.md`、`spec-m3-04-polish.md`、`spec-m4p-03-pwa.md`，以及之後的桌機章節與其他規格；規格與決策紀錄不同時以決策紀錄為準）
4. **審查和報告**（`ui-review.md`、`playtest-0.5.4.md`、`platform-strategy.md`、`loot-and-steam-eval.md` 的評估內容）

審查與報告描述的是「當時看到的問題與建議」，可能已被後來的決定改掉（例如審查建議開技能詳情就暫停，後來 Q11 A 決定自動模式不暫停）。照著做之前，先確認上面三層沒有不同的決定。發現衝突或看不懂時，回報製作人，不要自己挑一個。

## 和 repo 既有文件的關係

**原則：既有檔案不改。** 本資料夾只新增檔案，不修改 `CLAUDE.md`、`DESIGN.md`、`README.md` 或 `docs/` 下任何既有檔案（除非某個任務明確要求，例如 M0-05 改 README、M1-21 把 `camp_run` 結果寫回 `docs/工坊與解鎖表.md`）。

例外（mumi 2026-11-16 決定，和本資料夾同一個 PR）：`docs/索引.md` 加一行指向本檔；`CLAUDE.md` 的「手機直立為主、桌機跟著」改成分階段規則並指向 `gdd.md`。

| 既有檔案 | 是什麼 | 跟本資料夾的關係 |
| --- | --- | --- |
| `CLAUDE.md` | 給 Claude 的專案說明：任何改動先讀 `docs/設計原則.md`；規則與數值在 `docs/企劃書.md`；動 UI 先用 skill `ui-design`、各尺寸都要做都要測（`tools/touch_check.js`）；溝通、版本號與檢查流程（`node tools/check.js` 等） | 照舊遵守。本資料夾決定「做什麼、做到什麼程度算完成」；怎麼寫程式、怎麼跑檢查照 `CLAUDE.md`。平台優先順序：`CLAUDE.md` 已改成分階段規則（M0–M1 手機直立 390×844 優先；M2 起 390×844 與桌機 1280×720 同級），細節以 `gdd.md` 為準 |
| `docs/索引.md` | 既有 docs 的索引；衝突時的權威順序是「設計原則 → 開發參考 → 企劃書 → 其他」 | 只加一行指向本檔（例外），其餘不改。遊戲規則與數值的權威順序照它；製作排程、任務驗收與 M1 介面規格看本資料夾 |
| `docs/設計原則.md` | 最高設計原則（底層先行、MDA、隨機性、診斷順序） | 本資料夾的決定不推翻設計原則；若看起來衝突，回報製作人 |
| `docs/工坊與解鎖表.md` | 0.5 的權威：營地、打造、解鎖、新手第一小時節奏 | 營地與解鎖的數值、規則以它為準。M1-13 定稿文案依它第 3 節寫成；M1-21 的 `camp_run` 結果寫回它。M2-09 會把它和 `docs/企劃書.md` 收成一份權威 |
| `docs/企劃書.md` | repo 內的規則與數值文件（掛機模式、地圖、裝備、技能、天賦、底層、操作） | **跟本資料夾的 `gdd.md` 不是同一份**：`gdd.md` 是製作人的企劃書 Page（方向、決策、里程碑）的同步；`docs/企劃書.md` 是作者的規則文件。M1-08 依它 6.2 節 |

## 同步規則

- Page 是原件；Page 更新後由製作人同步到這裡，並更新每份檔案開頭的同步日期。
- 每個 Page 對應哪個檔案，記在製作人工作區的 `SYNC.md`（不進 repo）。
- 要改內容，請回報製作人，不要直接在 repo 改。
