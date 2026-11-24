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

截圖裡的數字（裝備、詞綴、DPS）是測試存檔隨機產生的，不是示意圖的示例數字。
