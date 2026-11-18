# dpoe-check72：PR #72 獨立驗證（受檢 HEAD ae47767dad2b18966bdf43caafd91aca0db79f3e）

只驗證、不改遊戲碼。各項結果見 PR #72 的「Grok 請求：dpoe-check72 結束」留言。

- `check1.log`：`node tools/check.js`（一次就過，✅ 864、❌ 0）
- `touch_<寬>x<高>.log`：`tools/touch_check.js` 六尺寸依序跑，全部 0 失敗、沒有重跑
- `wy16_fix.log`：`python3 tools/wy16_fix.py` 與 `tools/wy16_fix_test.py`；重跑後追蹤檔 0 差異
- `wy16_check.rerun.csv`：重跑產生的 §6 量測表（與 PR 提交的同名表相同）
- `independent.log`：自寫腳本：歸墟 16 對 §3 逐格相同、只用 7 色、四枚棋盤值、picked.txt 對 `img/ic_wy16.fb42c2c2.png` 逐像素相同
- `shots72.js`／`shots72.log`／`390x844-wy16.png`／`1280x720-wy16.png`：遊戲內 `artImg('wangyin_<名>_16')` 四枚逐像素比對＋截圖（右上測試框，遊戲本身目前沒有畫 16 px 王印的地方）
