# dpoe 文件總索引（docs/INDEX.md）

版本：2026-11-20 草案 1｜維護：製作人（各列由該列負責人更新）｜依據：mumi 2026-11-20 14:53、14:55、15:02、15:12、15:14、15:20（幕僚長轉述）｜main `08c7921`

## 防呆規則

> mumi 11/20 15:02：「下次開工就單純用戰鬥 HUD 為標準。如果給出文件，開發完回來沒有跟文件一樣，大家就準備被開除了。」

1. 交付必須跟定稿文件一致。實機截圖疊在示意圖上比對，不符就退回、不 merge。由規格負責人（UIUX設計師或數值設計師）裁定。
2. 所有畫面一律照「草稿 → mumi 沒問題 → 上色的實機示意圖 → mumi 沒問題 → 定稿進 repo → 開發」的順序走。線框圖只算草稿，不算示意圖。每一關都要 mumi 點頭才能往下（mumi 11/20 15:20，16:08 更正）。
3. 所有 bot 和給 Claude 的交辦，只能引用本索引列的現行版本，寫明路徑和版本號。
4. 每改一次定稿，當天更新本索引。
5. Page 只當閱讀版，定稿只放 repo。Page 和 repo 不同時，以 repo 為準。
6. demo 的定案當天寫進規格檔和示意圖。
7. 被取代的檔直接從 repo 刪除，歷史看 CHANGELOG 和 git。
8. 交辦前先對本索引。本索引沒列、或標「待定」「待轉入」「待寫」的，不能交辦。
9. 一個主題只有一份現行檔。發現兩份就停下，回報製作人。
10. 本機檔不算數。沒進 main 就不是現行版，不准照本機原文做。

### 定稿與交付流程

1. **定稿**：
   - 畫面類：負責的 bot 出草稿 → mumi 沒問題 → 出上色的實機示意圖 → mumi 沒問題 → 當天把規格檔和上色的實機示意圖寫進 repo、升版本號 → 更新本索引 → 舊版刪除 → 才能開發。少一關 mumi 點頭都不算定稿。
   - 非畫面類（數值、名詞、美術規範）：mumi 拍板 → 負責的 bot 當天寫進 repo、升版本號 → 更新本索引 → 舊版刪除。

   ```
   畫面草稿 → [mumi 沒問題?] → 上色的實機示意圖 → [mumi 沒問題?] → 定稿進 repo（升版本、改 INDEX、刪舊版） → 交辦（附路徑＋版本號） → [接手者對 INDEX] → 開發 → [實機截圖疊示意圖] → 規格負責人簽核 → merge
   任一關「不行」：退回上一步，不往下走。
   ```
2. **交辦檢查**：交辦給工程師、Claude、Art Director 時，寫明檔案路徑和版本號。接手的人開工前先對本索引，不符就停下回報。
3. **交付檢查**：PR 和美術交付寫明依據的版本號。驗收用實機截圖疊示意圖，規格負責人簽核後才能 merge。
4. **版本變更通知**：定稿改版時，負責的 bot 通知所有還在用舊版的工作，正在做的停下或改用新版。
5. **Page 和 demo 只算討論稿**，不能當交辦依據。

| 步驟 | 誰負責 |
|---|---|
| 草稿過關、上色的實機示意圖過關（畫面類兩關）；其他拍板 | mumi |
| 出草稿、出上色的實機示意圖 | UIUX設計師（畫面） |
| 寫規格＋示意圖、升版本 | 畫面：UIUX設計師；數值與名詞：數值設計師；美術規範：Game Art Director |
| 提交進 repo | 開發工程師（只改文件的 PR） |
| 更新本索引、刪舊版 | 規格負責人寫，製作人核對 |
| 版本變更通知 | 規格負責人通知，製作人追蹤 |
| 交辦附版本 | 製作人或交辦的人 |
| 開工前核對 | 接手的人 |
| 交付附版本 | 開發工程師、Game Art Director |
| 疊圖驗收、簽核 | UIUX設計師或數值設計師 |
| merge | 開發工程師（簽核後） |

狀態說明：**現行**＝在 repo main，可以交辦；**待轉入**＝內容已判定現行，還沒進 repo，不能交辦；**待定**＝mumi 還在定，不能交辦；**待寫**＝還沒有規格。
縮寫：S/＝`docs/production/specs/`，W/＝`docs/production/specs/wireframes/`。

## 製作

| 主題 | 現行檔 | 版本 | 狀態 |
|---|---|---|---|
| 現況總覽 | `docs/production/README.md` | 要重寫 | 現行（內容過時，重寫中） |
| 決定與變更歷史 | `docs/production/CHANGELOG.md` | — | 現行（唯一的歷史） |
| 分批表 B1–B10 | `S/fix-list-v1.2-to-batches.md` | v1.0 | 現行 |
| 排程 | `docs/production/schedule.md`（從 Page ee479f88 寫） | — | 待轉入 |
| 任務 | `docs/production/tasks/<ID>.md` | — | 現行；B、C、S 系列任務檔待寫 |
| 開發狀態 | 全面暫停（mumi 11/20 14:40） | — | — |

## 畫面（UIUX設計師；底稿 /workspace/screen-inventory/inventory.md v2）

| 畫面 | 現行檔 | 版本 | 狀態 |
|---|---|---|---|
| battle-hud | `specs/battle-hud/battle-hud.md` | v1.3.2 定稿（mumi 16:32；勘誤 17:18；mumi 11/20 17:33 拿掉觀戰鍵） | 現行；正式素材挑定見 art-picks/battle-hud-v1.3/；光環第二批 12 個待定；開發仍暫停 |
| 戰鬥線框 | W/W1-battle/ | — | **已取代**：現行是 `specs/battle-hud/battle-hud.md` v1.3；線框與上色示意圖在 `W/W1-battle-hud/` |
| 掛機條、光柱、倒下 | 併進戰鬥 HUD | — | 部分取代：掛機條版面與光柱外觀 → specs/battle-hud/；掛機條營地訊號（M2-camp-cards §7）、橫幅／王倒下（M2-33-3b、M2-23 §6）、倒下（M2-40 §8）仍現行；觀戰鈕已拿掉（mumi 11/20 17:33 拿掉觀戰鍵） |
| 掉落橫幅、王倒下卡 | `S/M2-33-3b-feedback.md` §2、§3、§5＋`S/M2-23-feedback.md` §6 | 11/18 | 現行；之後併成 S/loot-feedback.md |
| 離線結算 | `S/M2-12-shell-part2.md` §5＋`S/M2-12-shell-part1.md` §7 | v1.1／v1.2 | 現行（只限這兩節）；之後拆成 S/offline-return.md |
| 營地（卡片）＋設施詳細頁 | `S/M2-camp-cards.md` | v1.0 | 現行；e0f94cc8 的字串併進 §5.1 |
| 營地線框 | W/W2-camp/ | — | HUD 位置對齊 battle-hud v1.3；W2 仍在上色示意圖關 |
| 地點清單 | `S/M2-33-2b-panels.md` §6 | 11/18 | 現行；B7 新檔 S/location-list.md 待寫 |
| 山海寶盒 | （無） | — | 待寫（各自批次到了再定） |
| 試招場 | `S/M2-33-addendum-camp-zoom.md` §2.2–§2.4＋`S/M2-13-practice-dummies.md` | v1.0 | 現行（只限這幾節；照刷） |
| 裝備格、拾取、物品詳情 | `S/M2-item-display.md` | v1.1 | 現行（v1.0 已由本檔取代）；示意圖 W/W3-items/ 現行 |
| 鍛造 | `S/M2-item-detail-forge-reveal.md` | v1.5 | 現行 |
| 詞綴與底材挑選 | `S/M2-item-affix-base-pick.md` | v1.7 | 待轉入（UIUX 確認後） |
| 倉庫 | `S/M2-33-2a-items-crafting.md` §3＋`S/M2-37-ia-rework.md` §8 | 11/18 | 現行；B5 新檔 S/stash.md 待寫 |
| 商會 | 規則 `S/M2-trade-tiercap.md` | v1.0 | 規則現行；畫面待寫（各自批次到了再定） |
| 技能分頁＋輔助孔 | `S/M2-40-skill-panel-hud.md` 技能分頁段（§2.1／§2.2 抽屜、§4–§10） | v1.2 | 待定（版面段已作廢，技能分頁段要拆成 S/skills-panel.md）；**戰鬥 HUD 部分已取代**：現行是 `specs/battle-hud/battle-hud.md` v1.3 |
| 天賦樹 | `S/D1-fix-mumi-1119-part2.md` §6 | v1.2 | 現行（S2 改版暫停；天賦樹開著時照刷） |
| 昇華石碑 | `S/D1-fix-mumi-1119-part2.md` §6 | v1.2 | 現行（入口兩處都留） |
| 更多分頁 | `S/M2-33-2b-panels.md` §3＋`S/M2-37-ia-rework.md` §3 | 11/18 | 現行 |
| 底部分頁 7 格 | `S/M2-37-ia-rework.md` | v1.3 | **現行**：mumi 18:45 定 7 格、倉庫獨立（對齊 battle-hud）；18:14 分頁名戰利品改倉庫 |
| 追逐物品面板 | `S/M2-33-3b-feedback.md` §1＋`S/M2-37-ia-rework.md` §5 | 11/18 | 現行 |
| 掉落紀錄 | `S/M2-33-2b-panels.md` §5 | 11/18 | 現行 |
| 王印 | 王印 v0.2（Page 685f7eea） | v0.2 | 待轉入成 S/king-seal.md（各自批次到了再定） |
| 標題、暫停、讀取 | （無） | — | 待寫（W6） |
| 設定、鍵位 | `S/M2-33-2b-panels.md` §4＋`S/M2-33-1-foundations.md` §11 | 11/18 | 現行；以 battle-hud v1.3 為準 |
| 新手、解鎖提示 | `S/M1-13-unlock-copy.md` | — | 現行（文案）；畫面 B9 待寫 |
| 對話框、元件 | `S/M2-33-1-foundations.md` §5、§9＋`S/palette-D2-panel-1plus.md` | v1.1 | 現行 |
| PWA 安裝說明 | `S/M4P-03-pwa.md` | 11/17 | 現行 |

正式素材已挑定（mumi 17:18），見 art-picks/battle-hud-v1.3/；光環第二批由 Game Art Director 補。

## 名詞與數值（數值設計師）

| 主題 | 現行檔 | 版本 | 狀態 |
|---|---|---|---|
| 名詞表 | `docs/名詞表.md` | v0.6.37 | 現行 |
| 數值總表 | `S/數值總表.md` | v0.4 | 現行 v0.4 |
| 追逐掉落 | `S/M2-17-chase-drops.md` | v1.3 | 現行 |
| 大招判定 | `S/M2-40-big-attack.md` | v1.0 | 現行 |
| 輔助推薦分數 | `S/M2-40-rec-score.md` | v1.0 | 現行 |
| 商會階上限 | `S/M2-trade-tiercap.md` | v1.0 | 現行 |
| 數字縮寫 | `S/number-abbrev.md` | v1.1 | 現行（第 32 行暫停補算要改成照刷） |
| 試招場稻草人 | `S/M2-13-practice-dummies.md` | v1.0 | 現行 |
| 上癮門檻 | `S/M2-03-addictiveness-criteria.md` | — | 現行 |
| 王招元素 | `S/boss-move-element-unify.md` | — | 現行（已決定，待解凍） |
| 前 30 分鐘節奏 | `S/M2-21-pacing-v2.md` | v2 草案 | 草稿，不可交辦 |
| 詞綴階級 | `S/affix-tiers-framework.md` | v0.5 | 草稿，不可交辦 |
| 腐化與災魘 | `S/corruption-calamity-analysis.md` | v0.5 | 草稿，不可交辦 |
| 耐力球詞 | `S/B5b-c-endure.md` | v0.1 | 草稿，不可交辦 |
| 數值排程 | `docs/production/數值待排.md` | — | 草稿，不可交辦 |
| 劍技能草案 | `docs/production/劍技能草案.md` | — | 草稿，不可交辦 |
| 護符 | `S/charm-cards-numbers-eval.md` | 無版號（Page 最後更新 11/20 13:51） | 現行（評估中） |
| 營地資源產量 | `S/camp-resource-sources-rates.md` | v1.0 | 現行（原定併進 `S/M2-camp-cards.md` §5.1） |

## 美術（Game Art Director）

| 主題 | 現行檔 | 版本 | 狀態 |
|---|---|---|---|
| 色票與 token | `S/M2-36-palette-tokens.md` | D2 版（11/20 17:10 藥劑冷卻環 2 px＋1 px #000，對齊 battle-hud v1.3） | 現行 |
| D2 介面色 | `S/palette-D2-final-ui.md` | v1.6 | 現行 |
| 畫法 | `S/M2-36-drawing-rules.md` | 11/20 17:10（§2 光環／分頁遮罩不描暗邊、§5.2 390 戰鬥分頁 16 px 遮罩，對齊 battle-hud v1.3） | 現行 |
| PixelLab 提示詞與挑圖 | `S/M2-36-pixellab-d2.md`、`S/M2-36-d2-picks.md` | — | 待轉入（PR #119、#126） |
| 異常狀態圖示 | `S/M2-39-status-icons.md`、`S/M2-39-picks.md`、`S/M2-39-pixellab-prompts.md` | — | 現行 |
| 技能圖示 | `S/M2-40-skill-icon-picks.md`、`S/M2-40-skill-icon-prompts.md` | — | 現行（PR #101 開著） |
| 戰鬥可讀性美術 | `S/M2-40-combat-readability-art.md` | — | 現行（R4 彈藥格位置見 battle-hud v1.3） |
| 營地外觀分級 | `S/M2-12-lookTiers.md` | 11/20 12:01 | 現行（要改寫成卡片用） |
| 印章 | `S/M2-12-B3-art.md` 印章段 | 11/20 09:55 | 現行（牌匾段作廢） |
| 美術挑定檔（PR #120 八列、M2-40 九枚技能圖示、battle-hud-v1.3 正式素材 48 檔） | `docs/production/art-picks/`（README 列來源與建議 art/ 路徑；battle-hud-v1.3 見該資料夾 README） | — | 參考，不是規格（不是執行時資產；進 art/ 另開 PR） |

## 流程與工程

| 主題 | 現行檔 | 狀態 |
|---|---|---|
| Claude 入口 | `CLAUDE.md` | 現行（改成只讀本索引） |
| 程式結構 | `docs/專案結構.md` | 現行 |
| 本機執行與檢查 | `docs/本機執行.md` | 現行 |
| AI 試玩回歸報告 | `S/M2-02-regression-template.md` | 現行 |
| 視覺審查 | `S/visual-review-protocol.md` | 現行 |
| 匿名漏斗 | `S/M2-26-funnel.md` | 現行 |
| 設計原則、世界觀 | `docs/設計原則.md`、`docs/世界觀.md` | 現行 |
| 研究資料 | `docs/PoE*.md`、`docs/增量遊戲*.md`、`docs/打寶遊戲比較.md`、`docs/火炬之光無限參考.md`、`docs/音樂音效來源.md` | 參考（不跟版本；之後移到 docs/research/） |
| PoE 腐化、詞綴資料 | `docs/reference/poe/poe_corruption_2026-11-19/`、`docs/reference/poe/poe_affixes_2026-11-18/` | 參考，不是規格 |
| v0.5.4 測試證據截圖 | `docs/production/evidence/v0.5.4/`（README 列 8 張對應必須修項） | 參考，不是規格 |
