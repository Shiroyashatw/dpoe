# dpoe 文件結構（mumi 2026-11-17：每個讀者只讀跟自己有關的部分，省 token）

**每個 bot／session 只讀**：`docs/production/README.md`＋自己的 `tasks/<ID>.md`＋任務檔連到的規格。除非任務需要歷史，不要讀 `CHANGELOG.md`（根目錄與 docs/production 的都一樣）或任何 `archive/`。

| 檔案 | 內容 | 上限 |
| --- | --- | --- |
| `CLAUDE.md` | 只放常駐規則：溝通、平台、檢查工具、合併與部署、文件地圖；細節搬到它連過去的 docs 檔。要寫明「除非任務需要歷史，不要讀 CHANGELOG.md 或 archive/」 | 8 KB |
| `docs/production/README.md` | 現行總覽：方向與核心循環一段、平台規則、目前里程碑與出口條件、進行中與下一批任務表（ID｜一句話｜負責｜狀態｜前置｜檔案）、之後的里程碑一行一個、等 mumi 決定、文件地圖。不寫歷史與理由 | 80 行／10 KB |
| `docs/production/tasks/<ID>.md` | 每個沒做完的任務一檔：目標、負責、優先、狀態、前置、完成標準（兩尺寸）、相關規格連結、現行有效的決定（只寫結論，一行一條） | 40 行／4 KB |
| `docs/production/specs/<ID>-<slug>.md` | 設計與數值規格；負責人只留現行版本，不放修訂歷史 | 每份 25 KB |
| `docs/production/CHANGELOG.md` | 所有決定與調整，新的在上，一行一條：`日期 時間｜決定者｜影響工項｜結論`；理由最多一個短句 | 不設限，預設不讀 |
| `docs/production/archive/` | 做完的里程碑一檔（M0、M1：任務 ID、標題、commit／PR）與舊評估報告 | 不設限，預設不讀 |
| 根目錄 `CHANGELOG.md` | 只留目前小版本系列（0.5.x）或最近約 2 週；更舊的搬到 `docs/archive/changelog-<範圍>.md` | 60 KB |
| 名詞表 | 數值設計師維護，位置不變；數值規格放 `specs/` | — |

**規則**
1. 任務檔不抄規格內容，只放連結。規格不寫歷史；被取代的文字直接刪，不用刪除線。
2. 每個新決定或調整都在 `docs/production/CHANGELOG.md` 最上面加一行，不要把歷史寫回規格或任務檔。
3. 任務做完：刪任務檔、在 `archive/<里程碑>.md` 加一行（ID、標題、commit／PR）、從 README 表拿掉。取消的任務不開檔，只記一行 CHANGELOG。
4. 新任務：開 `tasks/<ID>.md`，屬於目前里程碑的才加進 README 表；之後里程碑的任務照樣開檔。

**repo 舊檔怎麼併**（開發工程師照這張表開一個只改文件的 PR）

| 舊檔 | 章節（標題） | 去處 |
| --- | --- | --- |
| `CLAUDE.md`（56 KB） | 開頭說明（只留讀哪些檔、用哪些 skill）、溝通規則、檢查、部署、Supabase | 留在 `CLAUDE.md`，精簡 |
| | 開頭的版本沿革段落（0.3.0 改掛機、0.4.0 改連續刷…） | `docs/archive/` |
| | 專案結構（約 37 KB） | `docs/專案結構.md`，CLAUDE.md 只留一行連結 |
| | 本機執行、需要 Grok 幫忙（本機、雲端） | `docs/本機執行.md`，CLAUDE.md 只留一行連結 |
| 根 `CHANGELOG.md`（304 KB） | 「0.5.4 之後」各段～0.5.0 | 留在根目錄（約 56 KB） |
| | 0.4.10 以前、開發流程（2026-11-13）兩段 | `docs/archive/changelog-0.1.0-0.4.10.md` |
| `docs/工項.md`（71 KB） | 開頭流程與共同驗收 | 還有效的併進 `CLAUDE.md`，其餘刪 |
| | 3A～11、12-1、12-B、12-C（版本都已出） | `docs/archive/工項-0.2.63-0.5.4.md` |
| | 12-5 新手第一小時（0.5.5，就是 M1） | 已由 `docs/production/archive/M1.md` 取代，刪 |
| `docs/待做清單.md`（91 KB） | 0.5、0.4.0～0.4.10、0.3.0（做完了） | `docs/archive/待做清單-0.3-0.5.md` |
| | 0.4.11 Opus 回饋、之後（先不做）、第 1／3／4／5 層、做裝與經濟、地圖與戰鬥、待定要看數據、美術、之後 | 製作人逐條分流：還要做的開 `tasks/<ID>.md` 或在 README 待辦池加一行，其餘進 `docs/archive/待做清單-0.3-0.5.md` |
| | 兩份檔併完後 | 刪掉 `docs/工項.md`、`docs/待做清單.md`，其他文件改連 `docs/production/README.md` |
