# dpoe-check81：PR #81（M2-26 匿名漏斗企劃）獨立驗證

受檢 HEAD：7937c2b537d32d501a715909259fe91f47322367（分支 m2-26-funnel-plan）；origin/main 575f545c37562002c1de1298059463b47786e381。**整體：通過**

## 分支狀態
- HEAD 已含最新 origin/main（`merge-base --is-ancestor` 成立）
- `git log origin/main..HEAD` 只有 1 筆：7937c2b M2-26 匿名漏斗與留存量測企劃定稿，交辦 M2-27（沒混入 DOC-18／M2-02／M2-03／M2-09／#68）
- `git diff --stat` 恰為 10 檔：specs/M2-26-funnel.md 新增、刪 tasks/M2-26.md、tasks/M2-27.md、README.md、archive/M2.md、CHANGELOG.md（+1 行 M2-26）、evidence/dpoe-m2-26/ 4 張 png
- `git diff origin/main HEAD -- js css index.html tools`：無輸出；VER 未動
- PR #81 mergeable=true（mergeable_state=clean）

## 測試
- check.js 第 1 次：870 ✅／1 ❌（M2-30 卡牆「場地裡的不動」，已知偶發）；整支重跑第 2 次：**871 ✅／0 ❌**（check-run1.txt、check-run2.txt）
- touch_check.js 依序六尺寸，0 失敗、未重跑任何項：390×844 141、375×667 141、412×915 141、844×390 60、1280×720 60、1440×900 60

## 對照被刪前 tasks/M2-26.md 完成標準
| 項目 | 結果 | 依據 |
| --- | --- | --- |
| 事件清單定稿 | 過 | 規格 §3：open／alive／craft／node，時機與額外欄位齊 |
| 欄位 | 過 | §2 本機欄位、§3 共同欄位 fid/sid/ev/v/day/pf，§5 表欄位白名單 |
| 保存期限 | 過 | §5：原始 90 天、pg_cron 每日刪；平台日誌天數標「假設」 |
| 隱私說明文字定稿 | 過 | §6 小標、開關、說明全文、「更多」副標 |
| 390×844／1280×720 位置寫明 | 過 | §7 表＋4 張截圖 |
| 交辦 M2-27 | 過 | §8 七條完成標準；tasks/M2-27.md 已連規格、前置改「已交」 |
| 不收個資／不新增帳號連結／只用匿名 ID | 過 | §1；§2 編號存 localStorage `dungeonpoe-funnel`、不放進 S；§5 Authorization 用 anon key、不帶玩家 JWT；表無 user_id／IP、不設 default auth.uid() |

## 規格引用的程式元件（現有程式都存在）
- 設定面板 `setHTML()` js/hud.js:770；順序 操作方向(觸控)→操作→音效→傷害數字(hud.js:780–787，含 `.sethint`)→手勢／快捷鍵(hud.js:788)→帳號 `acctHTML()`，插入點在 787 與 788 之間，與規格 §6、§7 一致
- 「更多」設定列副標 `操作、音效、帳號` js/hud.js:625；更多分頁 hud.js:473；Esc 開設定 hud.js:753
- `.ph2`、`.gkind.seg2`（音效同元件 hud.js:781）、`PORT()` hud.js:77、`TOUCH.on`、`KEY+SLOT` main.js:6、`proGive`/`fresh` main.js:190–192、`craftDo` craft.js:234、`runNode` game.js:184、`TRUNK_K` world.js:113、`SB_URL`/`cloudInit`（TEST／localhost 不連雲端）cloud.js:5、30–38
- 小註（非錯誤）：§3 寫「走開場或 `proGive` 的 `fresh`」，`fresh` 實際是 `S.fresh`，在 main.js 的 proGive 讀取

## 截圖
- 390x844-1-entry.png、390x844-2-settings.png：780×1688（390×844 視窗 ×2 DPR）
- 1280x720-1-entry.png、1280x720-2-settings.png：2560×1440（1280×720 ×2 DPR）
- 設定截圖的紅框位置在「傷害數字」與「手勢／快捷鍵」之間，與規格一致

## 連結
- 規格、README、tasks/M2-27.md、archive/M2.md 新行的相對連結全部指到存在的檔案；repo 內沒有殘留指向 tasks/M2-26.md 的連結
- 錯誤：無
