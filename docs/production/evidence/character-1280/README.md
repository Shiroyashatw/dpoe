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
| `04a-dualdef-6affix.png`、`04b-dualdef-6affix.png` | 修正輪 fix1（V-4）：雙防禦底材＋6＋6 條詞綴，浮窗長到上限 486 內、③ 層內捲動（4 px 軌）、①②④⑤ 完整 |

修正輪 fix1 的格狀態（V-2）看 `01-stats.png`：胸甲腐化底＋虛線＋破裂圖示、鞋子災魘底＋爪痕、項鍊追憶圖示、武器王印、各格右上 ✦{n}。
`art/icons/affix/affix_frac_16*.png` 是從定稿示意圖 `01-stats-color.png` 胸甲格取出的暫代、`affix_mem_16*.png` 是佔位圖：RULINGS 指定的定稿原檔（`affix_frac_16-d`、`affix_mem_16-a`）在雲端工作環境裡讀不到，要換成原檔（同檔名覆蓋即可，程式不用改）。

截圖裡的數字（裝備、詞綴、DPS）是測試存檔隨機產生的，不是示意圖的示例數字。
