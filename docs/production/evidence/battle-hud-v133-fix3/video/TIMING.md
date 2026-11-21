# battle-hud 影片時序（tools/bh_video.js＋tools/bh_vtiming.py）

每支都是原生 60 fps（ffprobe r_frame_rate＝60/1）：凍結虛擬時鐘，每格推 1000/60 ms 再截圖，ffmpeg `-framerate 60` 直接編碼，沒有 fps／scale 濾鏡。
畫面右側燒入「F 幀號  毫秒」；下表的幀號、毫秒就是那個數字。1 格＝16.7 ms，所以 40 ms、120 ms、200 ms 的量測誤差是 ±1 格（±16.7 ms）。

## 390x844

- **危急紅邊 1 級→2 級→回來**（danger_390x844.mp4，最大生命 1000、沒有能量護盾上限，每 300 ms 改一次生命）：F0（0.0 ms）生命 50% → 0 級；F48（800.0 ms）生命 34% → 1 級；F120（2000.0 ms）生命 19% → 2 級；F210（3500.0 ms）生命 21% → 1 級；F264（4400.0 ms）生命 40% → 0 級。門檻跟 §23 一樣（<35% 1 級、<20% 2 級），改生命的同一格就換級；回升時沒有滯後（立刻退級）；每格 class 都是常亮，沒有閃。
- **能量護盾充能前緣**（esrecharge_390x844.mp4，300 / 600、4 秒延遲剩 1 秒）：前緣 F59（983.3 ms，能量護盾 301）出現，F298（4966.7 ms，600）充滿消失；充 300 用 3983 ms（每秒 12.5%＝75，應 4000 ms）；前緣 x 每秒取樣：F59 x181（301）、F119 x220（376）、F179 x263（451）、F239 x306（526）。常亮不閃。
- **格擋弧碎開→回滿**（blkbreak_390x844.mp4）：碎盾閃 --block-hi F30–F39（500.0–650.0 ms，150.0 ms）（規格 150 ms，只閃一次、只在弧上）；斷續段回滿 F30–F510（8000 ms）（BV.re 8 秒），回滿那一格斷續段換回實線。
- **Tab 走一圈**（tabwalk_390x844.mp4，每 300 ms 按一次 Tab）：F18 #bhC0（3px -3px rgb(217, 211, 205)、放大）、F36 #bhC1（3px -3px rgb(217, 211, 205)、放大）、F54 #bhC2（3px -3px rgb(217, 211, 205)、放大）、F72 #bhC3（3px -3px rgb(217, 211, 205)、放大）、F90 #bhLoc（3px -3px rgb(217, 211, 205)、放大）、F108 #bhSts（3px -3px rgb(217, 211, 205)、放大）、F126 #bhS0（3px -3px rgb(217, 211, 205)、放大）、F144 #bhS1（3px -3px rgb(217, 211, 205)、放大）、F162 #bhS2（3px -3px rgb(217, 211, 205)、放大）、F180 #bhS3（3px -3px rgb(217, 211, 205)、放大）、F198 #bhS4（3px -3px rgb(217, 211, 205)、放大）、F216 #bhBlk（3px -3px rgb(217, 211, 205)、放大）、F234 #bhF0（3px -3px rgb(217, 211, 205)、放大）、F252 #bhF1（3px -3px rgb(217, 211, 205)、放大）、F270 button.ihd（3px -3px rgb(217, 211, 205)、放大）、F288 button.ipks（3px -3px rgb(217, 211, 205)、放大）、F306 button.btn.ib1「整理倉庫」（3px -3px rgb(217, 211, 205)、放大）、F324 button.btn.ib2「自動」（3px -3px rgb(217, 211, 205)、放大）、F342 button.btn.pri.ib3「去營地」（3px -3px rgb(217, 211, 205)、放大）、F360 button.on「倉庫」（3px -3px rgb(217, 211, 205)、放大）、F378 button.「角色」（3px -3px rgb(217, 211, 205)、放大）、F396 button.「鍛造」（3px -3px rgb(217, 211, 205)、放大）、F414 button.「技能」（3px -3px rgb(217, 211, 205)、放大）、F432 button.「天賦」（3px -3px rgb(217, 211, 205)、放大）。每一站都有 :focus-visible 框。
- **命中頓幀＋震動**（hitshake_390x844.mp4，地震術打中 3 隻怪 ×3 次）：震動 F34–F37（50 ms）、F88–F91（50 ms）、F142–F145（50 ms），畫面位移上限 14×trauma² 最大 0.08 px（render.js 取整後 0 px，看不出來）；頓幀 0 格（js 裡沒有任何地方呼叫 hitstop()）。B 標準「頓幀分級、震動 100–300 ms」未達，列未決。
- **收起／展開（減少動態）**（collapserm_390x844.mp4）：面板上緣改變的格 F48、F138、F228、F300；每次只有一格就換好（直接切換，沒有 200 ms 滑動）。

## 1280x720

- **危急紅邊 1 級→2 級→回來**（danger_1280x720.mp4，最大生命 1000、沒有能量護盾上限，每 300 ms 改一次生命）：F0（0.0 ms）生命 50% → 0 級；F48（800.0 ms）生命 34% → 1 級；F120（2000.0 ms）生命 19% → 2 級；F210（3500.0 ms）生命 21% → 1 級；F264（4400.0 ms）生命 40% → 0 級。門檻跟 §23 一樣（<35% 1 級、<20% 2 級），改生命的同一格就換級；回升時沒有滯後（立刻退級）；每格 class 都是常亮，沒有閃。
- **能量護盾充能前緣**（esrecharge_1280x720.mp4，300 / 600、4 秒延遲剩 1 秒）：前緣 F60（1000.0 ms，能量護盾 301）出現，F299（4983.3 ms，600）充滿消失；充 300 用 3983 ms（每秒 12.5%＝75，應 4000 ms）；前緣 x 每秒取樣：F60 x564（301）、F120 x616（376）、F180 x672（451）、F240 x728（526）。常亮不閃。
- **格擋弧碎開→回滿**（blkbreak_1280x720.mp4）：碎盾閃 --block-hi F30–F39（500.0–650.0 ms，150.0 ms）（規格 150 ms，只閃一次、只在弧上）；斷續段回滿 F30–F510（8000 ms）（BV.re 8 秒），回滿那一格斷續段換回實線。
- **Tab 走一圈**（tabwalk_1280x720.mp4，每 300 ms 按一次 Tab）：F18 #bhC0（3px -3px rgb(217, 211, 205)、放大）、F36 #bhC1（3px -3px rgb(217, 211, 205)、放大）、F54 #bhC2（3px -3px rgb(217, 211, 205)、放大）、F72 #bhC3（3px -3px rgb(217, 211, 205)、放大）、F90 #bhLoc（3px -3px rgb(217, 211, 205)、放大）、F108 #bhSts（3px -3px rgb(217, 211, 205)、放大）、F126 #bhS0（3px -3px rgb(217, 211, 205)、放大）、F144 #bhS1（3px -3px rgb(217, 211, 205)、放大）、F162 #bhS2（3px -3px rgb(217, 211, 205)、放大）、F180 #bhS3（3px -3px rgb(217, 211, 205)、放大）、F198 #bhS4（3px -3px rgb(217, 211, 205)、放大）、F216 #bhBlk（3px -3px rgb(217, 211, 205)、放大）、F234 #bhF0（3px -3px rgb(217, 211, 205)、放大）、F252 #bhF1（3px -3px rgb(217, 211, 205)、放大）、F270 button.on「倉庫L」（3px -3px rgb(217, 211, 205)、放大）、F288 button.「角色V」（3px -3px rgb(217, 211, 205)、放大）、F306 button.「鍛造K」（3px -3px rgb(217, 211, 205)、放大）、F324 button.「技能G」（3px -3px rgb(217, 211, 205)、放大）、F342 button.「天賦P」（3px -3px rgb(217, 211, 205)、放大）、F360 button.「營地H1」（3px -3px rgb(217, 211, 205)、放大）、F378 button.「更多Z」（3px -3px rgb(217, 211, 205)、放大）、F396 button.ihd（3px -3px rgb(217, 211, 205)、放大）、F414 button.ipks（3px -3px rgb(217, 211, 205)、放大）、F432 button.btn.ib1「整理倉庫」（3px -3px rgb(217, 211, 205)、放大）。每一站都有 :focus-visible 框。
- **命中頓幀＋震動**（hitshake_1280x720.mp4，地震術打中 3 隻怪 ×3 次）：震動 F34–F37（50 ms）、F88–F91（50 ms）、F142–F145（50 ms），畫面位移上限 14×trauma² 最大 0.08 px（render.js 取整後 0 px，看不出來）；頓幀 0 格（js 裡沒有任何地方呼叫 hitstop()）。B 標準「頓幀分級、震動 100–300 ms」未達，列未決。
- **收起／展開（減少動態）**（collapserm_1280x720.mp4）：面板上緣改變的格 F48、F138、F228、F300；每次只有一格就換好（直接切換，沒有 200 ms 滑動）。

## 實際輸入延遲（不用虛擬時鐘，tools/bh_latency.js）

真時間、headless Chromium（雲端容器，不是實機）。量法：輸入事件 `event.timeStamp` → `useSlot` 回傳成功（出手）→ 出手後第一個 rAF（那一格畫出來）。影片 `../latency/latency_{size}.mp4`：CDP screencast 真時間收圖、依時間戳轉 60 fps（缺格重複前一張），右上燒入頁面 rAF 幀號與毫秒、最近一次延遲。不含螢幕、觸控硬體延遲。

| 尺寸 | 輸入 | 誰呼叫 useSlot | 出手 ms | 畫出來 ms | 頁面 rAF 幀 | 頁面 ms |
|---|---|---|---|---|---|---|
| 390x844 | pointerup | up (js/touch.js:260:11) | 70.3 ❌ | 70.8 | F63 | 1080 |
| 390x844 | pointerup | up (js/touch.js:260:11) | 27.8 | 38.4 | F109 | 1832.8 |
| 390x844 | pointerup | up (js/touch.js:260:11) | 27.4 | 40 | F153 | 2566 |
| 390x844 | pointerup | up (js/touch.js:260:11) | 30.1 | 42.7 | F197 | 3299.4 |
| 390x844 | pointerup | up (js/touch.js:260:11) | 28.2 | 40.6 | F241 | 4032.6 |
| 390x844 | pointerup | up (js/touch.js:260:11) | 27.4 | 40.3 | F285 | 4765.9 |
| 390x844 | screencast | | 290 張／4.83 秒（60 fps） | | | |
| 1280x720 | keydown:q | js/hud.js:3080:27 | 5.2 | 5.9 | F59 | 1017.3 |
| 1280x720 | pointerdown | HTMLCanvasElement.<anonymous> (js/hud.js:3134:7) | 2 | 5 | F103 | 1746.7 |
| 1280x720 | keydown:q | js/hud.js:3080:27 | 0.9 | 7.4 | F146 | 2463.4 |
| 1280x720 | pointerdown | HTMLCanvasElement.<anonymous> (js/hud.js:3134:7) | 1.1 | 3.3 | F188 | 3163.3 |
| 1280x720 | keydown:q | js/hud.js:3080:27 | 3.3 | 11.8 | F231 | 3879.9 |
| 1280x720 | pointerdown | HTMLCanvasElement.<anonymous> (js/hud.js:3134:7) | 0.9 | 5.3 | F273 | 4579.9 |
| 1280x720 | screencast | | 279 張／4.65 秒（60.1 fps） | | | |

