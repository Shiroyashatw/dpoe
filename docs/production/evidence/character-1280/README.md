# 角色頁 1280×720 實機截圖與疊圖

依據：`docs/production/specs/M2-character-1280.md` ＋ `M2-character.md` v1.1；示意圖 `docs/production/specs/wireframes/W3-character/color/`。

產生方式（本機伺服器 `python3 -m http.server 8003`）：

```
node tools/char_check.js http://localhost:8003/ docs/production/evidence/character-1280
python3 tools/char_overlay.py docs/production/evidence/character-1280
```

| 檔案 | 內容 |
|---|---|
| `01-stats.png` … `07-empty.png` | 無頭瀏覽器 1280×720 實機截圖，對應示意圖 01、02、03、04a、04b、07 |
| `overlay-*.png` | 示意圖裁左上遊戲區（2× 圖的 40,40–2600,1480，縮成 1280×720）與實機各 50% 疊合；紅框＝圖例座標、綠框＝實機量到的 DOM 位置 |
| `diff.md` | 逐項位置與尺寸差（px） |
| `boxes.json` | `char_check.js` 量到的位置原始資料 |
| `390x844-char.png` | 390×844 直立角色頁（確認沒壞，照舊走 `invHTML`） |
| `02-menu-closed-click-300-300.png` | 修正輪 fix1（V-1）：長按選單開著時點右欄外 (300,300) 後，選單已關 |
| `04-cands-cantwear.png` | 修正輪 fix1（V-6）：候選格「可以換的 n 件」只算穿得上的；不能裝備的排後面、右下斜線、沒有判定角標 |
| `fix3-l3-before.png`、`fix3-l3-after.png` | 修正輪 fix3：按住 Alt 時 ③ 放不下，底部「▼ 還有 n 條」＋4 px 捲動條；滾輪捲動前／後 |
| `fix3-affix-icons-dpr1.png`、`fix3-affix-icons-dpr2.png` | 修正輪 fix3：胸甲破裂、項鍊追憶定稿圖示，DPR1 用 16、DPR2 用 16@2x（畫成 16×16） |
| `04a-dualdef-6affix.png`、`04b-dualdef-6affix.png` | 修正輪 fix1（V-4）：雙防禦底材＋6＋6 條詞綴，浮窗長到上限 486 內、③ 層內捲動（4 px 軌）、①②④⑤ 完整 |

修正輪 fix1 的格狀態（V-2）看 `01-stats.png`：胸甲腐化底＋虛線＋破裂圖示、鞋子災魘底＋爪痕、項鍊追憶圖示、武器王印、各格右上 ✦{n}。
破裂／追憶圖示是定稿原檔（mumi 2026-11-21 11:37 挑定：破裂＝胖五角星、追憶＝墨瓶加一滴墨），從 `assets/affix-icons-final-1124`（cc1ea88）覆蓋 `art/icons/affix/affix_{frac,mem}_16{,@2x}.png`。

截圖裡的數字（裝備、詞綴、DPS）是測試存檔隨機產生的，不是示意圖的示例數字。
