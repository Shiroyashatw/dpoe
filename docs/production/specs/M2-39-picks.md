# M2-39 佇列 40 挑圖定稿（PR #96 draft，HEAD c94c4fb，只挑不合併）

負責：Game Art Director。第 3 輪 35 張手修圖（`-r3`）跟上一版逐張對照過 4 倍與 1 倍、彩色與灰階，也放進整組並排看撞形。檔名清單在 `specs/M2-39-previews/picked.txt`，每行第一欄是狀態：**FINAL** 定稿；**R4** 先用這張，第 4 輪要修；**CURSE** 詛咒，先暫用。花費 83／100，剩 17，其中 16 留給優先 32；以下修改都是手修，不花次數。

## 1. 第 3 輪判定

除了下表 §2 列的，其餘都**選 r3**：

- 32：brittle、cb、chg_e、daze、fury、oiled、petr、riven、sac、sap、seal、shatter、stain、tail、taunt、unbr、vine、weak
- 16：ad、ad_cold、ad_light、brittle、daze、sap、shatter、tail、taunt、unbr、weak

說明：

- **fury 32（約 15×21）：接受。** 造型是斜的，對角約 26 px，視覺重量跟鄰格差不多；1 倍讀得出來。不另放大。
- **chg_p 32：** 只用 `--scene-void` 外框、沒有另外畫土星環，這點可以接受。但中央的四角星在 1 倍讀成「＋」，加上整顆是平塗圓盤，看起來像「新增」按鈕。見 §2。
- daze r3 方形螺旋跟 seal 的同心方框都是方框套方框，但 seal 中心是圓、整片填色，分得開，接受。
- tail r3 不再像 ≡；sac 跟 tail 都有速度線，但 sac 有 V 形，分得開。

## 2. 第 4 輪要修（先用 picked.txt 標 R4 的那張）

| id | 尺寸 | 問題 | 像素修法 |
| --- | --- | --- | --- |
| calm | 32／16 | 定稿 r4 | 不對稱雙峰波紋，1 倍讀成「~」（第 4 輪過） |
| counter | 32 | 刃身 1 px，1 倍是一根細線，加上回鉤像手杖；灰階又跟 weak 的彎鉤撞 | 刃身加粗到 2 px（`--tx-strong`，下緣 1 px `--border` 陰影），回鉤也改 2 px；護手加寬到 5 px 並跟刃身垂直；描邊照舊 |
| counter | 16 | 綠色護手在左下，加上長斜線，1 倍讀成打勾「✓」 | 護手改成跟刃身垂直、從刃身兩側各伸 2 px 的 1×5 橫桿，用 `--border-mid`；護手外再加 1 px 柄頭，`--good` 只留在柄頭 |
| chg_p | 32 | 「＋」在圓盤裡，像新增按鈕 | 星改成閃光：中心 2×2 `--tx-strong`，上下臂 3 px、左右臂 2 px（不等長），臂尖 1 px 收細；描邊內加 2 px `--rar-magic` 外環，盤心 `--awk`，跟 chg_e 的外環同一家 |
| broken | 32／16 | 兩片暗色直板左右對稱，1 倍像暫停鍵「‖」 | 左半改 `--border-mid` 平塗（亮），右半保持 `--border`；右半整片下移 2 px（16 是 1 px），破掉對稱；中縫保留 |
| stain | 16 | 刪掉散點以後變成一顆圓紅球，跟優先 rage（紅球）、chg_e 撞 | 外緣加回 4 個 1 px 噴濺尖：左上、右上、右、下各 1；右下再補 1 顆斷開的 1 px 小滴，加描邊 |

## 3. 詛咒（等 mumi 挑菱形）

cu_eleweak、cu_vuln、cu_despair（32），以及 cu_eleweak、cu_tchains、cu_vuln、cu_despair（16）不列入清單。等 mumi 挑定優先 curse 16 後，拿它的菱形把中央十字換成小符號，五枚一起手繪：衰弱＝垂下的橫棒、元素要害＝火／冰／雷三色各 1 px、時空鎖鏈＝兩節鏈、脆弱＝斜裂的板、絕望＝往下彎的小鉤。32 先用 2 倍。cu_enfeeble 32／16 和 cu_tchains 32 標 CURSE，先暫用。

## 4. 數字（每尺寸 42 個：40 個 id 加 ad_cold、ad_light）

| | FINAL | R4 | CURSE 暫用 | 詛咒待繪 |
| --- | --- | --- | --- | --- |
| 32 | 33 | 4 | 2 | 3 |
| 16 | 33 | 4 | 1 | 4 |

整組要注意的：會被看成 UI 控制項的（calm、chg_p、broken、counter 16）都排進第 4 輪，UIUX設計師要知道。第 1、2 輪的手修全部完成。
