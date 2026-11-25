# dpoe-check208：PR #208 驗收證據（只驗收、不改程式）

- 被驗收 head：`0663809ee5d6551f67844f524448c49562731f92`；清單 `REVIEW-CHECKLIST-208.md` @ `f0baa657`
- `ISSUES.md`：完整問題清單（BLOCKING 31／非阻擋 9／待確認 15）
- `shots/`：本輪當場拍的 1280×720 實機圖（40 張＋02b＋390 兩張）與 `boxes.json`
- `overlay/`：示意遊戲區裁成 1280×720 後的並排（`*-pair.jpg`）、疊圖（`*-overlay.jpg`）、`REPORT.md`（275 ✅／4 ❌，4 個都是排除／取捨）
- `review/`：營地 15 張、倉庫 25 張逐張對照表（含 DOM 量測）
- `probe/`：F-floater 實機圖（`F-floater-1280-*.png`）、營地開著時照刷（`camp-open-live-1280.png`）、量測腳本
- `logs/`：本輪完整迴歸的原始輸出
這個分支只放證據，不合併、不開 PR。
