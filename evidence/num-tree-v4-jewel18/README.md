# num-tree-v4-jewel18：卡住（沒有烘孔，js/ptdata.js 沒改）

基準：numbers/num-tree-v4-verify @ 01a41a8。

## 為什麼停下
任務規則：「x／y 到底是孔自己的座標還是掛點座標說不清時停下」。查證結果：

1. `analyze.js` 重跑（`node evidence/num-tree-v4-verify/analyze.js . <前綴>`）產出的 `_sockets.csv` 跟 `v4_sockets.csv` **位元組相同**（`cmp` 無差異；副本：`analyze_rerun_sockets.csv`）。
2. `v4_sockets.csv` 的 x、y **是掛點（幹道能力值點）的座標，不是孔自己的座標**：`analyze.js` 第 147～148 行 `const n = T.I[s.anchor]; s.x = Math.round(n.x); s.y = Math.round(n.y);`。18 列全部等於掛點全精度座標四捨五入（`sock_table.md`）。
3. 同一支程式把孔定義成「新的一個點，掛在一個幹道能力值點旁邊（葉子）、點到孔要 1 點」（第 6～8、126 行），但**沒有給孔自己的座標**。
4. 所以要烘進 PT_BAKE 只有兩條路，都要有人決定：
   - (a) 孔的座標＝掛點座標（照 csv 字面）：畫出來孔會跟掛點疊在同一個位置；
   - (b) 孔放在掛點旁邊（要另訂偏移方向與距離）：x、y 就不再「照這份」。
   另外孔若是樹上要花 1 點的點，就得加進 N／E（會改到 N、E、M，違反「N、E、C、M 不變」），或另開鍵由遊戲自己接邊——也要決定。

## 檢查（01a41a8，未改動）
- `node tools/check.js`：✅ 951、❌ 0（`check_01a41a8.txt`），跟 `num-tree-v4-verify/checks-v4b/check_v4b.txt` 相同。
- `node tools/chase_check.js`（預設參數）：✅ 20、❌ 0（`chase_check_01a41a8.txt`）。

## 檔案
- `sock_table.js`／`sock_table.md`：18 孔對回 ptdata（掛點全精度座標、所在幹道段、最近叢集、六起點點數）。`node evidence/num-tree-v4-jewel18/sock_table.js .`
