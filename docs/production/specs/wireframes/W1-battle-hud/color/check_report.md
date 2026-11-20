# 疊圖自檢（battle-hud v1.3（final，2026-11-20 mumi 16:32），上色版）

疊圖來源：W1-battle-hud/W1_battle-*_overlay.png（同一產生器 src/gen_battle_hud.py 產出）；元件清單：src/gen_battle_hud.py。門檻：每個 HUD 元件四邊誤差 ≤1 px。

- 390x844 normal：HUD 元件 45 個，≤1 px 44 個；P22 外擴 3px：蓄力弧在格外 2 px（battle-hud-4 §11）；P33 本狀態未畫（空格）；P34 本狀態未畫（空格）；P35 本狀態未畫（空格）；P36 本狀態未畫（空格）
- 1280x720 normal：HUD 元件 46 個，≤1 px 43 個；D44 外擴 3px：蓄力弧在格外 2 px（battle-hud-4 §11）；D55 本狀態未畫（空格）；D56 本狀態未畫（空格）；D57 本狀態未畫（空格）；D58 本狀態未畫（空格）；D61 外擴 7px：390：藥劑外 1 px #000；1280：右下鍵帽徽章（規格「鍵帽徽章貼右下」）；D62 外擴 7px：390：藥劑外 1 px #000；1280：右下鍵帽徽章（規格「鍵帽徽章貼右下」）
- 390x844 boss：HUD 元件 48 個，≤1 px 47 個；P22 外擴 3px：蓄力弧在格外 2 px（battle-hud-4 §11）；P34 本狀態未畫（空格）；P35 本狀態未畫（空格）；P36 本狀態未畫（空格）
- 1280x720 boss：HUD 元件 49 個，≤1 px 46 個；D44 外擴 3px：蓄力弧在格外 2 px（battle-hud-4 §11）；D56 本狀態未畫（空格）；D57 本狀態未畫（空格）；D58 本狀態未畫（空格）；D61 外擴 7px：390：藥劑外 1 px #000；1280：右下鍵帽徽章（規格「鍵帽徽章貼右下」）；D62 外擴 7px：390：藥劑外 1 px #000；1280：右下鍵帽徽章（規格「鍵帽徽章貼右下」）
- 390x844 lowhp：HUD 元件 51 個，≤1 px 50 個；P22 外擴 3px：蓄力弧在格外 2 px（battle-hud-4 §11）；P35 本狀態未畫（空格）；P36 本狀態未畫（空格）
- 1280x720 lowhp：HUD 元件 52 個，≤1 px 49 個；D44 外擴 3px：蓄力弧在格外 2 px（battle-hud-4 §11）；D57 本狀態未畫（空格）；D58 本狀態未畫（空格）；D61 外擴 7px：390：藥劑外 1 px #000；1280：右下鍵帽徽章（規格「鍵帽徽章貼右下」）；D62 外擴 7px：390：藥劑外 1 px #000；1280：右下鍵帽徽章（規格「鍵帽徽章貼右下」）
- 390x844 lootflood：HUD 元件 48 個，≤1 px 45 個；P20 外擴 3px：裝填環在格外 3 px（同上）；P22 外擴 3px：蓄力弧在格外 2 px（battle-hud-4 §11）；P25 外擴 8px：「+k」字底板（--plate-world）
- 1280x720 lootflood：HUD 元件 49 個，≤1 px 44 個；D42 外擴 3px：裝填環在格外 3 px（同上）；D44 外擴 3px：蓄力弧在格外 2 px（battle-hud-4 §11）；D47 外擴 8px：「+k」字底板（--plate-world）；D61 外擴 7px：390：藥劑外 1 px #000；1280：右下鍵帽徽章（規格「鍵帽徽章貼右下」）；D62 外擴 7px：390：藥劑外 1 px #000；1280：右下鍵帽徽章（規格「鍵帽徽章貼右下」）
- 390x844 collapsed：HUD 元件 33 個，≤1 px 32 個；T17 本狀態未畫（空格）；T18 本狀態未畫（空格）；T19 本狀態未畫（空格）；T20 本狀態未畫（空格）；T23 外擴 3px：蓄力弧在格外 2 px（battle-hud-4 §11）
- 1280x720 collapsed：HUD 元件 34 個，≤1 px 31 個；C44 外擴 3px：蓄力弧在格外 2 px（battle-hud-4 §11）；C55 本狀態未畫（空格）；C56 本狀態未畫（空格）；C57 本狀態未畫（空格）；C58 本狀態未畫（空格）；C61 外擴 7px：390：藥劑外 1 px #000；1280：右下鍵帽徽章（規格「鍵帽徽章貼右下」）；C62 外擴 7px：390：藥劑外 1 px #000；1280：右下鍵帽徽章（規格「鍵帽徽章貼右下」）

**合計**：HUD 元件 481 次（10 張），≤1 px 431、規格內外擴 24、本狀態未畫 26、超過 1 px（不合格）0。

## 超過 1 px
- 無

## overlay PNG 框線 vs 元件清單（確認疊的是同一版；圓形藥劑用方框取樣，覆蓋率低是正常的）
- 390x844 normal P39 overlay 框線覆蓋 35%
- 390x844 normal P40 overlay 框線覆蓋 35%
- 1280x720 normal D61 overlay 框線覆蓋 33%
- 1280x720 normal D62 overlay 框線覆蓋 33%
- 390x844 boss P39 overlay 框線覆蓋 35%
- 390x844 boss P40 overlay 框線覆蓋 35%
- 1280x720 boss D61 overlay 框線覆蓋 33%
- 1280x720 boss D62 overlay 框線覆蓋 33%
- 390x844 lowhp P39 overlay 框線覆蓋 35%
- 390x844 lowhp P40 overlay 框線覆蓋 35%
- 1280x720 lowhp D61 overlay 框線覆蓋 33%
- 1280x720 lowhp D62 overlay 框線覆蓋 39%
- 390x844 lootflood P39 overlay 框線覆蓋 35%
- 390x844 lootflood P40 overlay 框線覆蓋 35%
- 1280x720 lootflood D61 overlay 框線覆蓋 33%
- 1280x720 lootflood D62 overlay 框線覆蓋 33%
- 390x844 collapsed T28 overlay 框線覆蓋 35%
- 390x844 collapsed T29 overlay 框線覆蓋 35%
- 1280x720 collapsed C61 overlay 框線覆蓋 33%
- 1280x720 collapsed C62 overlay 框線覆蓋 33%

## 文字對比抽檢（WCAG 2.x；底色取字框內實際像素中位數）
抽 351 筆。最低 10 筆：
- 5.38：390x844 lootflood P49「+38 件已收」14px tx-dim 在 #383433
- 5.72：390x844 lootflood P47「拾取」14px tx-dim 在 #34302d
- 6.14：1280x720 boss D41「去營地」16px on-act 在 #7c5729
- 6.14：1280x720 lootflood D41「去營地」16px on-act 在 #7c5729
- 6.14：1280x720 lowhp D41「去營地」16px on-act 在 #7c5729
- 6.14：1280x720 normal D41「去營地」16px on-act 在 #7c5729
- 6.14：390x844 boss P57「去營地」16px on-act 在 #7c5729
- 6.14：390x844 lootflood P57「去營地」16px on-act 在 #7c5729
- 6.14：390x844 lowhp P57「去營地」16px on-act 在 #7c5729
- 6.14：390x844 normal P57「去營地」16px on-act 在 #7c5729
- <4.5 共 0 筆
