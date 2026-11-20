# B3 量測 667x375

| 項目 | 尺寸 | 目標 | 實測 | 過／不過 | 檔名 |
| --- | --- | --- | --- | --- | --- |
| 進營地：本次掛機不清掉（SES 還在、記下暫停時間） | 667x375 | SES 還在 | {"ses":true,"away":true,"scene":"camp"} | 過 | 667x375_D3-13_camp_scene.png |
| D1-04／D1-08 營地場景點鍛造台開的卡「這級」＝cdThis（B1 同一字串來源） | 667x375 | 這級：開了「淬鍊」，可以重骰詞的數值 | 這級：開了「淬鍊」，可以重骰詞的數值 | 過 | 667x375_D1-08_camp_forge_card.png |
| 手機橫向不畫掛機條（B1 現行規則），那一行跟著不畫 | 667x375 | 不畫 | 不畫 | 過 | 667x375_SES_2_after_line.png |
| D2-11 字 14／700、左 2 px --good、--plate-world 疊在 --scene-void（不透明） | 667x375 | 14px／700／2px --good | {"t":"","fs":"14px","fw":"700","bl":["2px","rgb(127, 201, 90)"],"bg":"linear-gradient(rgba(11, 8, 6, 0.8), rgba(11, 8, 6, 0.8)), none rgb(11, 8, 6)","good":"#7fc95a"} | 過 | 667x375_SES_2_after_line.png |
| 那一行 3,460 ms 後收掉、回到掛機條原內容 | 667x375 | 收掉 | {"t0":1795139944378,"r":14,"hid":true} | 過 | 667x375_SES_3_after_return.png |
| 試招場回戰場：打倒王次數不減 | 667x375 | ≥ | {"r":17} | 過 | 667x375_SES_4_practice.png／667x375_SES_5_after_practice.png |
| 那一行有追逐：王印放第一個；130% 字放大 | 667x375 | 王印 1 在前 | {"t":"營地期間 王印 1・靈魂 +3,520・41 件・◆ 3","fs":"18.2px","cut":false} | 過 | 667x375_D2-11_line_chase_fs130.png |
| 英文 +40% 假字（假設：EN 句未譯，用假字壓長度）：一行、放不下從後面省略、不縮字 | 667x375 | 截圖目視 |  | 過 | 667x375_D2-11_line_en_fs130.png |
| D1-14 營地點地圖台＝開地點清單（elementFromPoint(333,96) 是畫布） | 667x375 | PANEL.node、#cv | {"at":{"tag":"CANVAS","id":"cv","cls":"","z":"auto"},"dv":[333.5,95.74468085106383]} | 過 | 667x375_D1-14_camp_device_tap.png |
