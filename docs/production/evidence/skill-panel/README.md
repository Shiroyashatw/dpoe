# 技能面板 1280×720 實機截圖與疊圖

依據：`docs/production/specs/skills-panel.md` v1.0.1；示意圖 `docs/production/specs/wireframes/W4-skill-panel/color/`（01、03–05、07–18；01b 不採用）。

產生方式（本機伺服器 `python3 -m http.server 8003`；瀏覽器是 `PW_CHROME=/usr/bin/google-chrome`，在雲端它是預裝 Playwright Chromium 158 的包裝）：

```
node tools/skill_check.js http://localhost:8003/ docs/production/evidence/skill-panel
python3 tools/skill_overlay.py docs/production/evidence/skill-panel
```

| 檔案 | 內容 |
|---|---|
| `overlay-<畫面>.jpg` | 每個畫面狀態一張，2560×720：左半＝示意圖遊戲區（2× 圖的 40,40–2600,1480，縮成 1280×720）與實機各 50% 疊合，紅框＝規格座標、綠框＝實機量到的 DOM 位置；右半＝同一刻的實機截圖 |
| `diff.md` | 逐項位置與尺寸差（px） |
| `boxes.json` | `skill_check.js` 量到的位置原始資料 |
| `390x844-skill.png` | 390×844 直立技能頁（本版不含，確認照舊走 `skillHTML`） |

畫面對照：01 總覽（第 1 格更換圖示懸停「更換技能」）、03 技能簡易懸停、04 按住 Alt 詳細、05 輔助懸停、07 點孔挑輔助、08 卸下復原、09 空孔、10 鎖孔、11 不相容、12 空技能格（長老屋 Lv1）、13 挑技能、14 名詞提示「精魂」、15 解鎖 II、16 換序、17 名冊技能拖放、18 名冊輔助拖放。

疊圖要注意的地方：
- 示意圖的遊戲區不是從圖檔左上角 0,0 開始，是 40,40（外面有一圈 1× 20 px 的邊）；規格寫「左上 2560×1440」，這裡照實際位置裁。
- 戰鬥 HUD 殼（上方資訊列、掛機卡、技能列、生命／魔力條、小地圖）是現行程式的樣子，跟示意圖的 HUD 殼不同，不在這次範圍。
- 戰場畫面每次不同；示意圖上的紅色編號徽章與右側圖例實機不畫。
- 數字（DPS、靈魂）是測試存檔算出來的，跟示意圖的示意數字不同。
