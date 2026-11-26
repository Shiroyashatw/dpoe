# dpoe-battle-mockup-1126：PR #211 程序地板截圖與量測

- 依據：`specs/battle-floor/procedural-floor-impl.md`、`battle-mockup-gap-list.md`（`uiux/procedural-floor-1126` @ `ded337df`，只讀）。
- 拍法：`node tools/battle_mockup_shots.js docs/production/evidence/battle-mockup-1126/pr211 http://localhost:8100/`（本機 `python3 -m http.server`，預裝 Playwright Chromium `/opt/pw-browsers/chromium`，deviceScaleFactor 1）。`?dbg=1&seed=7`、`DBG.biome('temple')`＋`DBG.clear()`，凍結時間後直接呼叫 `draw()`。
- 1280×720：`S-F`、`S-E`、`S-B`、`S-T`、`S-TX`、`S-G`、`S-C`、`S-D`、`S6`；390×844：`S-E`、`S-T`、`S-C`（只跑 touch_check，不做 390 設計驗收）。
- 本分支只有地板（＋#211 原有的腳下陰影）；預警、敵人外框、暴擊字樣等在 PR #210，這裡的 S-T／S-TX／S-C 是舊畫法，只用來看地板底下的樣子。

## S-F 地板對參照（§3.1、§3.2）
- `S-F-floor-compare-ref-vs-shot.png`：左＝參照 `ref/floor-384x256.png` 左 320×256（避開右 64 px 掉落牌），右＝實機 S-F 從格線對齊點 (640, 360) 裁 320×256（格 64.8 CSS px，起點 x=315.9＋64.8k、y=101.25＋64.8k）。數字在 `floor-compare.json`（`python3 tools/floor_compare.py …`）。
- `measure.json` 的 `floor`：S-F 畫面內 273 格淺磚 11.36%、中央 60%（72 格）9.72%。

| 項 | 參照裁切 | 實機 S-F 裁切 | 門檻（§3.2） | 結果 |
|---|---|---|---|---|
| L* 中位 | 28.31 | 26.79 | — | 差 −1.5 |
| C* 中位 | 3.96 | 3.73 | ≤ 6 | 過 |
| C*>40 面積 | 0 | 0.01%（1 px 級，燈籠光暈／香灰點） | ≈ 0 | 過 |
| 格平均 L* 全距 | 7.49（20 格） | 15.40（12 格） | ≥ 7 | 過 |
| 淺磚（格 L*>32.05） | 0／20 | 3／12 | 全場 9.4% ±3、中央 ≤ 10% | 畫面 11.36%、中央 9.72%：過 |
| 縮放 | 64 px／格 | 64.8 px／格 | ±1 CSS px | 差 0.8：過 |

- 縫：短、錯落（s1202 樣板），沒有 s5201 的長直角縫；整排重複網格目視沒有（48 張變體＋世界格雜湊）。
