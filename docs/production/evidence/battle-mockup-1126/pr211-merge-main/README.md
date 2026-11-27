# PR #211 merge main（75ba0306）對照截圖

`node tools/battle_mockup_shots.js <資料夾> <網址>`，預裝 Playwright Chromium，`?dbg=1&seed=7`、temple、畫面凍結。
每張 compare 由左到右：#211 合併前（b3cb5349）｜main 75ba0306（含 #210）｜合併後（本 PR）。各縮成 640×360。

- 合併後＝#211 的程序地板＋怪物腳下陰影，加上 #210 的預警虛框、敵方填色、HUD、色票（含戰場燈籠光 --scene-lamp-glow）。
- merged-measure.json：floor 與 #211 合併前相同（gen、273 格、淺磚 11.4%／中央 9.7%）；alpha 與 main 相同（外圈 0.298、內圈／地面 0.549–0.55）；暴擊字相同。
