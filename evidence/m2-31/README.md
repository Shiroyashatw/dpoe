# M2-31 對比小修 T1–T10＋canvas C1：量測證據

本機 `python3 -m http.server 8000`（github.io 被代理擋）；修改前＝`origin/main` fc78dea，修改後＝這個分支。
390×844 @3x（isMobile＋hasTouch）與 1280×720 各跑一輪，前後各一次。遊戲自動戰鬥、亂數，每輪的怪物位置與跳數字不同。

## 工具（`tools/`）
- `capture.js`、`analyze.py`、`summary.py`：從 PR #28（`art/visual-audit-1117`）`evidence/visual-audit-1117/tools/` 拿來。
  - `capture.js` 多一個環境變數 `OUT_DIR`（截圖寫哪），前後兩輪分開放。
  - `analyze.py` 加「算描邊」：canvas 字取字形內填色（最接近 填色×透明度 的像素中位數），對比字外 1–3 px 描邊環的中位數色，寫 `canvas_stroke.csv`；紅色受傷數字 `#ff5a5a` 標「延到 M2-32」。
- `tcheck.js`：capture 走不到的 T2（負抗性）、T5（`.skr-up:disabled`）、T10（桌機狀態格）在真的面板加 class，讀 computed 色與底色算對比，T10 另量數字框離紅框幾 px。
- `c1fixed.js`：固定背景（10 種場景色）×固定淡出（fa 1／0.75／0.5／0.375）×字色（phys `#fff3e0`、crit `#ffd166`、hurt `#ff5a5a`），舊畫法與新畫法各畫一張，用同一支 `analyze.py` 量。

重現：
```
OUT_DIR=<資料夾> node evidence/m2-31/tools/capture.js portrait http://localhost:8000/ <資料夾>/raw   # desktop 同
python3 -I evidence/m2-31/tools/analyze.py <資料夾>/raw <資料夾> <repo 根目錄>
node evidence/m2-31/tools/tcheck.js http://localhost:8000/
OUT_DIR=<資料夾> node evidence/m2-31/tools/c1fixed.js <資料夾>/raw   # 再把 shots/portrait/90_*.png 複製成 raw/portrait/90_*.bg.png 跑 analyze
```

## 檔案
- `data/before|after/contrast.csv`、`canvas_stroke.csv`；`data/c1fixed_canvas_stroke.csv`
- `shots/`：直立 07、08、09、24、26，桌機 04、11、15、23、25 的前後對照；`c1fixed_old.png`／`c1fixed_new.png`
- 數字總表在 PR 說明。
