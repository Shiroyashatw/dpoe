# dungeonPOE — 給 Claude 的專案說明

## 讀哪些檔
- **每個工作階段只讀 `docs/production/README.md`＋自己的 `docs/production/tasks/<ID>.md`＋任務檔連到的規格。** 文件結構規則在 `docs/production/DOCS-STRUCTURE.md`。
- **除非任務需要歷史，不要讀 `CHANGELOG.md`（根目錄與 `docs/production/` 的）或任何 `archive/`。**
- 改機制或數值先讀 `docs/設計原則.md`；規則與數值在 `docs/企劃書.md`、`docs/工坊與解鎖表.md`，改了要同步。docs 索引在 `docs/索引.md`。
- 每個檔案管什麼：`docs/專案結構.md`。本機伺服器、存檔版本、各檢查工具的細節、找 Grok 幫忙：`docs/本機執行.md`。

## Skill
- 每次新對話開始：`ponytail`（最小完整改動）、`grilling`（先把計畫問清楚）、`ambition`（把目標拉高，更大的版本當選項提給使用者）。
- 動到 UI／UX 一定先啟動 `ui-design`（長相照 `DESIGN.md`；互動、動畫、手勢加 `apple-design`／`animate`；技術限制與測試尺寸照 `docs/介面規範.md`）。
- 動天賦樹（效果、主題、預留叢集、形狀、配色、重烘）用 `talent-tree`，規則在 `docs/天賦樹設計.md`。

## 平台
- 掛機打寶：角色由 AI 自動戰鬥（企劃書 2.1、2.2）。
- **M2 起手機直立 390×844 與桌機 1280×720 同級，兩個都驗過才算完成**；再驗 375×667、橫向 844×390 與 667×375、1440×900（面板不能超出畫面）。桌機以滑鼠＋鍵盤為主，也要能只用滑鼠玩。Steam 線另驗 1280×800。詳見 `docs/production/README.md`。
- 手機有直立／橫向兩種操作（`S.orient`、`PORT()`），操作規則在企劃書第 9 節。
- 遊戲邏輯只透過 `mouseWorld()` 與移動方向拿輸入（`AI.on` 時讀 `AI.aim`、`AI.mv`），不要在技能、戰鬥程式裡判斷是不是手機或自動。

## 溝通規則
- **一律用繁體中文回覆**（包含 commit 訊息）。
- **遊戲內文字**（技能、輔助、名詞、能力、昇華、通貨、面板提示）照 `docs/文字規範.md`（PoE2 台服寫法，照程式寫、不寫預設規則與贅字）；能力的一行字由 `items.js` 的 `statText` 照 STATN 第四格的模板組。
- 改版本時改 `js/data.js` 的 `VER`、`index.html` 所有 `?v=` 和 `version.json`（`main.js` 的 `verCheck` 看它不同就重新載入），再更新根目錄 `CHANGELOG.md`。存檔格式改了要在 `main.js` 的 `migrate()` 補轉換。
- 決定與調整記在 `docs/production/CHANGELOG.md` 最上面一行；任務做完照 `DOCS-STRUCTURE.md` 規則 3 收尾。
- 獨立 repo（https://github.com/Shiroyashatw/dpoe ）；不要再去讀《塞令老師》（`Shiroyashatw/wayfarer`）的檔案。

## 檢查（改了遊戲邏輯一定要跑）
- `node tools/check.js`：有 ❌ 不交差。
- **版本守門：改了 `VER`、加新系統或改經濟（掉落、產生器、花費、解鎖門檻、保底）的 PR 都附 AI 試玩回歸報告**：`node tools/ai_report.js evidence/<代號>`（先開本機伺服器，約 2 小時，不用改 `VER`；產出的 `A1-A10.md` 含 M2-03 完成標準與上一版自動比對），照 `docs/production/specs/M2-02-regression-template.md` 填進 PR 說明；未達標、退步照實寫，觸發條件與細節見 `docs/本機執行.md`「版本守門」。
- 改了傷害、防禦、天賦、詞綴、怪物數值：`node tools/dmg_check.js`。
- 戰鬥、面板、拖曳用 Playwright 在本機實際操作（先開 `python3 -m http.server`）。動到藏身處 `node tools/hide_check.js`；開場、存檔流程 `node tools/pro_check.js`；地點與連續刷 `node tools/world_check.js`。新存檔一開始是開場，其他測試進遊戲後先 `proSkip()`；`S.auto` 預設 1，手動流程的測試要設 `S.auto = 0`；開節點用 `runNode(鍵)`。
- 改介面：各尺寸都要做、都要測，`node tools/touch_check.js 寬 高`（先開本機伺服器），順不順用 `tools/ui_perf.js`。
- 改完 JS：`npx prettier@3.3.3 --write js/*.js tools/*.js`。
- **測試一律在本機跑，不要對線上網址跑**（本機不連雲端；線上會自動匿名登入、在正式庫留下帳號與存檔）。

## 合併與部署
- 流程：先改、先測，確認 OK 後再 commit；push 前先問使用者。
- 開 PR 到 `main`；雲端沒有 `gh pr`，用 `gh api`。
- 部署：GitHub Pages，`main` 分支，網址 https://shiroyashatw.github.io/dpoe/ 。

## Supabase
同一個專案（ref `eugkdfhkoaxvqhztvptc`），表 `public.dungeon_saves`（跟《塞令老師》的 `saves` 分開，RLS 只允許本人）。前端只放 anon key，**絕對不要使用或要求 service_role key**。表不存在時只存本機。
